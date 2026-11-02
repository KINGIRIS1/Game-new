// Phó bản, đánh ngoài bãi chiến. Chương 1: tám màn từ Phong Châu tới chân núi Trâu.
// Chương 2: tám màn lên núi Tản Viên, ba màn đầu giành lễ vật thách cưới.
// Chương 3: ba màn diệt yêu tinh núi Thất Diệu, năm màn cùng An Dương Vương đánh quân Triệu Đà.
// Chương 4: bốn màn dẹp thủy binh Triệu đội lốt cướp sông, ba màn chặn quân Triệu Đà trước thành Cổ Loa, màn cuối
// cầm chân giặc cho vua ra biển Mộ Dạ.
// Chọn lính mang theo, xếp hàng theo binh chủng, xuất quân; lính chết thì mất, thắng thì có thưởng.

import { retreatField, startFieldBattle, stepField } from './battle';
import { CH4_LAST, LAY_TRAO_AT, LENH_BAN_AT, caoLoJoined, caoLoResting } from './caoLo';
import { inChapter4 } from './chuong4';
import { CH3_LAST, KIM_QUY_AT, advJoined, advResting, inChapter3 } from './coLoa';
import { armySpace, fieldCap } from './doanhTrai';
import { REPLAY_SHARE, RESOURCE_IDS, STAGES, UNIT_TYPES, type Chapter, type Cost, type Row, type StageDef, type UnitType } from './defs';
import { BATTLE_STEP, countOf, dienLevel, gain, troopBonus, type FailReason, type GameState, type Result, type StageResult } from './game';
import { giongReady, giongResting } from './giong';
import { heroFor, inChapter2, restAfter, sonJoined, sonResting, winGift } from './son';
import { challengeField, challengeOf, challengeOpen, huanTiers, winChallenge } from './thuThach';

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

/** Trận thử thách Không tướng: không tướng nào ra trận, nên không cần tướng của màn. */
const heroless = (n: number, challenge: boolean) => challenge && challengeOf(n)?.kind === 'khongTuong';

/** Kiểm tra màn `n` (hay thử thách của màn, `challenge`) có đánh được không, chưa tính quân mang theo. */
export function canStartStage(state: GameState, n: number, challenge = false): Result {
  const def = stageDef(n);
  if (!def) return fail('khongTimThay');
  if (countOf(state, 'doanhTrai') === 0) return fail('canDoanhTrai');
  if (def.chapter === 2 && !inChapter2(state)) return fail('canChuong2');
  if (def.chapter === 3 && !inChapter3(state)) return fail('canChuong3');
  if (def.chapter === 4 && !inChapter4(state)) return fail('canChuong4');
  if (!stageOpen(state, n)) return fail('manKhoa');
  if (challenge && !challengeOpen(state, n)) return fail('thuThachKhoa');
  const needs: Partial<StageDef> = heroless(n, challenge) ? {} : def;
  if (needs.needsGiong && !giongReady(state)) return fail('canThanhGiong');
  if (needs.needsGiong && giongResting(state)) return fail('giongKietSuc');
  if (needs.needsSon && !sonJoined(state)) return fail('canSonTinh');
  if (needs.needsSon && sonResting(state)) return fail('sonKietSuc');
  if (needs.needsAdv && !advJoined(state)) return fail('canAnDuong');
  if (needs.needsAdv && advResting(state)) return fail('advKietSuc');
  if (needs.needsCaoLo && !caoLoJoined(state)) return fail('canCaoLo');
  if (needs.needsCaoLo && caoLoResting(state)) return fail('caoLoKietSuc');
  if (dienLevel(state) < def.minDien) return fail('chuaDuCapDien');
  if (state.raid.phase !== 'idle') return fail('dangCoGiac');
  if (state.campaign.battle) return fail('dangDanhPhoBan');
  return ok(undefined);
}

/** Tướng ra trận màn `n`: như màn thường, trừ thử thách Không tướng. */
export function stageHero(state: GameState, n: number, challenge = false) {
  const def = stageDef(n);
  return !def || heroless(n, challenge) ? null : heroFor(state, def.chapter, n);
}

/** Thử thách Hai binh chủng: binh chủng `k` có được mang không. Màn thường và các kiểu thử thách khác mang được hết. */
export function unitAllowed(n: number, challenge: boolean, k: UnitType): boolean {
  const ch = challenge ? challengeOf(n) : undefined;
  return ch?.kind !== 'haiBinh' || ch.units!.includes(k);
}

/**
 * Xuất quân đánh màn `n` với số lính `army`, đứng theo hàng `rows`. `challenge`: đánh thử thách của màn (đã thắng
 * màn ấy ở chế độ thường).
 */
export function startStage(state: GameState, n: number, army: Record<UnitType, number>, rows: Record<UnitType, Row>, challenge = false): Result {
  const check = canStartStage(state, n, challenge);
  if (!check.ok) return check;
  if (UNIT_TYPES.some((k) => (army[k] ?? 0) < 0 || (army[k] ?? 0) > state.troops[k])) return fail('khongDuQuan');
  if (UNIT_TYPES.some((k) => (army[k] ?? 0) > 0 && !unitAllowed(n, challenge, k))) return fail('thuThachBinhChung');
  // Nhiều doanh trại cho nhiều quân dự trữ, nhưng mỗi trận phó bản chỉ mang tối đa chừng này chỗ (38 từ Điện 5).
  if (armySpace(army) > fieldCap(state)) return fail('quaChoPhoBan');
  const def = stageDef(n)!;
  const hero = stageHero(state, n, challenge);
  // Có tướng thì ra trận một mình cũng được.
  if (!hero && UNIT_TYPES.every((k) => !army[k])) return fail('chuaChonQuan');
  state.campaign.rows = { ...rows };
  state.campaign.lastResult = null;
  state.campaign.battle = startFieldBattle({
    id: state.nextBattleId++,
    stage: n,
    enemies: def.enemies,
    waves: def.waves,
    holdS: def.holdS,
    hpScale: def.hpScale,
    army: { ...army },
    rows: { ...rows },
    hero,
    bonus: troopBonus(state),
    arms: state.arms,
    huan: huanTiers(state),
    ...(challenge ? challengeField(n) : {}),
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
  // Thử thách không cho của cải, không mở màn mới, không kể truyện: chỉ cho huân công lần đầu thắng.
  const challenge = battle.challenge;
  const first = won && !challenge && battle.wave > state.campaign.cleared;
  const reward = won && !challenge ? stageReward(state, battle.wave) : {};
  if (won && !challenge) {
    gain(state, reward);
    state.campaign.cleared = Math.max(state.campaign.cleared, battle.wave);
  }
  const huan = won && challenge ? winChallenge(state, battle.wave) : 0;
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
  // Chương 4: thắng màn 25 thì Cao Lỗ cầm quân (`caoLoJoined`); màn 28 Trọng Thủy đã tráo lẫy nỏ thần; màn 30 có
  // Lệnh bắn; hộ giá ra tới biển thì vua theo Rùa Vàng xuống biển.
  if (first && battle.wave === LAY_TRAO_AT) state.adv.layTrao = true;
  if (first && battle.wave === LENH_BAN_AT) state.caoLo.lenhBan = true;
  if (first && battle.wave === CH4_LAST) {
    state.adv.bien = true;
    battle.seaWin = true;
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
    ...(challenge ? { challenge: { kind: challenge, huan } } : {}),
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
