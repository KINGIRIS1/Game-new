// Phó bản, đánh ngoài bãi chiến. Chương 1: tám màn từ Phong Châu tới chân núi Trâu.
// Chương 2: tám màn lên núi Tản Viên, ba màn đầu giành lễ vật thách cưới.
// Chương 3: ba màn diệt yêu tinh núi Thất Diệu, năm màn cùng An Dương Vương đánh quân Triệu Đà.
// Chọn lính mang theo, xếp hàng theo binh chủng, xuất quân; lính chết thì mất, thắng thì có thưởng.

import { retreatField, startFieldBattle, stepField } from './battle';
import { CH3_LAST, KIM_QUY_AT, advJoined, advResting, inChapter3 } from './coLoa';
import { armySpace, fieldCap } from './doanhTrai';
import { REPLAY_SHARE, RESOURCE_IDS, STAGES, UNIT_TYPES, type Chapter, type Cost, type Row, type StageDef, type UnitType } from './defs';
import { BATTLE_STEP, countOf, dienLevel, gain, troopBonus, type FailReason, type GameState, type Result, type StageResult } from './game';
import { giongReady, giongResting } from './giong';
import { heroFor, inChapter2, restAfter, sonJoined, sonResting, winGift } from './son';

/** Thắng màn này lần đầu thì roi sắt gãy. */
export const WHIP_BREAKS_AT = 6;
/** Màn cuối chương 1: thắng lần đầu thì Gióng bay về trời. */
export const CH1_LAST = 8;
/** Thắng màn này lần đầu thì Sơn Tinh dời được non. */
export const NON_AT = 14;
/** Màn cuối chương 2: thắng lần đầu thì Thủy Tinh rút quân. */
export const CH2_LAST = 16;

/** Các màn của một chương, theo số màn. */
export function chapterStages(chapter: Chapter): number[] {
  return STAGES.map((d, i) => (d.chapter === chapter ? i + 1 : 0)).filter(Boolean);
}

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

export function stageDef(n: number): StageDef | undefined {
  return STAGES[n - 1];
}

/** Thưởng khi thắng màn `n`: đủ ở lần đầu, một phần khi đánh lại. */
export function stageReward(state: GameState, n: number): Cost {
  const def = stageDef(n);
  if (!def) return {};
  if (n > state.campaign.cleared) return { ...def.reward };
  const out: Cost = {};
  for (const r of RESOURCE_IDS) if (def.reward[r]) out[r] = Math.max(5, Math.round((def.reward[r]! * REPLAY_SHARE) / 5) * 5);
  return out;
}

/** Màn đã mở trên bản đồ (đã qua màn trước). Chưa đủ điều kiện khác vẫn có thể đang mở. */
export function stageOpen(state: GameState, n: number): boolean {
  return !!stageDef(n) && n <= state.campaign.cleared + 1;
}

/** Kiểm tra màn `n` có đánh được không, chưa tính quân mang theo. */
export function canStartStage(state: GameState, n: number): Result {
  const def = stageDef(n);
  if (!def) return fail('khongTimThay');
  if (countOf(state, 'doanhTrai') === 0) return fail('canDoanhTrai');
  if (def.chapter === 2 && !inChapter2(state)) return fail('canChuong2');
  if (def.chapter === 3 && !inChapter3(state)) return fail('canChuong3');
  if (!stageOpen(state, n)) return fail('manKhoa');
  if (def.needsGiong && !giongReady(state)) return fail('canThanhGiong');
  if (def.needsGiong && giongResting(state)) return fail('giongKietSuc');
  if (def.needsSon && !sonJoined(state)) return fail('canSonTinh');
  if (def.needsSon && sonResting(state)) return fail('sonKietSuc');
  if (def.needsAdv && !advJoined(state)) return fail('canAnDuong');
  if (def.needsAdv && advResting(state)) return fail('advKietSuc');
  if (dienLevel(state) < def.minDien) return fail('chuaDuCapDien');
  if (state.raid.phase !== 'idle') return fail('dangCoGiac');
  if (state.campaign.battle) return fail('dangDanhPhoBan');
  return ok(undefined);
}

/** Xuất quân đánh màn `n` với số lính `army`, đứng theo hàng `rows`. */
export function startStage(state: GameState, n: number, army: Record<UnitType, number>, rows: Record<UnitType, Row>): Result {
  const check = canStartStage(state, n);
  if (!check.ok) return check;
  if (UNIT_TYPES.some((k) => (army[k] ?? 0) < 0 || (army[k] ?? 0) > state.troops[k])) return fail('khongDuQuan');
  // Nhiều doanh trại cho nhiều quân dự trữ, nhưng mỗi trận phó bản chỉ mang tối đa chừng này chỗ (38 từ Điện 5).
  if (armySpace(army) > fieldCap(state)) return fail('quaChoPhoBan');
  const def = stageDef(n)!;
  const hero = heroFor(state, def.chapter);
  // Có tướng thì ra trận một mình cũng được.
  if (!hero && UNIT_TYPES.every((k) => !army[k])) return fail('chuaChonQuan');
  state.campaign.rows = { ...rows };
  state.campaign.lastResult = null;
  state.campaign.battle = startFieldBattle({
    id: state.nextBattleId++,
    stage: n,
    enemies: def.enemies,
    hpScale: def.hpScale,
    army: { ...army },
    rows: { ...rows },
    hero,
    bonus: troopBonus(state),
    arms: state.arms,
  });
  return ok(undefined);
}

/** Rút quân: trận kết thúc ngay, lính còn sống trở về. */
export function retreat(state: GameState): Result {
  const battle = state.campaign.battle;
  if (!battle || battle.outcome) return fail('khongTimThay');
  retreatField(battle);
  finishStage(state);
  return ok(undefined);
}

/** Ghi kết quả trận vừa xong: trừ lính tử trận, cộng thưởng nếu thắng. Trận vẫn giữ để vẽ cảnh cuối. */
function finishStage(state: GameState): void {
  const battle = state.campaign.battle!;
  const outcome = battle.outcome ?? 'lose';
  for (const k of UNIT_TYPES) state.troops[k] = Math.max(0, state.troops[k] - battle.lost[k]);
  const won = outcome === 'win';
  const first = won && battle.wave > state.campaign.cleared;
  const reward = won ? stageReward(state, battle.wave) : {};
  if (won) {
    gain(state, reward);
    state.campaign.cleared = Math.max(state.campaign.cleared, battle.wave);
  }
  restAfter(state, battle);
  // Giữa chương roi sắt gãy, Gióng nhổ tre quật giặc. Phá xong giặc ở núi Trâu thì Gióng bay về trời.
  if (first && battle.wave === WHIP_BREAKS_AT) state.giong.whipBroken = true;
  if (first && battle.wave === CH1_LAST) {
    state.giong.ascended = true;
    battle.ascend = true;
  }
  // Chương 2: ba màn đầu giành lễ vật, giữa chương Sơn Tinh dời non, đánh lui Thủy Tinh thì kết chương.
  const gift = first ? winGift(state, battle.wave) : undefined;
  if (first && battle.wave === NON_AT) state.son.non = true;
  if (first && battle.wave === CH2_LAST) {
    state.son.won = true;
    battle.sonWin = true;
  }
  // Chương 3: giữa chương Rùa Vàng hứa che chở quân ta, đánh tan Triệu Đà thì kết chương.
  if (first && battle.wave === KIM_QUY_AT) state.adv.kimQuy = true;
  if (first && battle.wave === CH3_LAST) {
    state.adv.won = true;
    battle.advWin = true;
  }
  const result: StageResult = {
    stage: battle.wave,
    outcome,
    first,
    killed: battle.killed,
    total: battle.total,
    lost: { ...battle.lost },
    reward,
    ...(gift ? { gift } : {}),
  };
  state.campaign.lastResult = result;
}

/** Trận phó bản chạy theo đồng hồ chơi, từng bước nhỏ như trận giữ kinh đô. */
export function updateCampaign(state: GameState, ms: number): void {
  const battle = state.campaign.battle;
  if (!battle || battle.outcome) return;
  let left = ms / 1000;
  while (left > 1e-9) {
    const dt = Math.min(BATTLE_STEP, left);
    left -= dt;
    if (stepField(battle, dt)) {
      finishStage(state);
      return;
    }
  }
}

/** Xem xong kết quả: rời bãi chiến, về kinh đô. */
export function leaveBattlefield(state: GameState): void {
  const battle = state.campaign.battle;
  if (battle && !battle.outcome) return;
  state.campaign.battle = null;
  state.campaign.lastResult = null;
}
