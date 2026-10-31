// Phó bản chương 1: tám màn từ Phong Châu tới chân núi Trâu, đánh ngoài bãi chiến.
// Chọn lính mang theo, xếp hàng theo binh chủng, xuất quân; lính chết thì mất, thắng thì có thưởng.

import { retreatField, startFieldBattle, stepField } from './battle';
import { REPLAY_SHARE, RESOURCE_IDS, STAGES, UNIT_TYPES, type Cost, type Row, type StageDef, type UnitType } from './defs';
import { BATTLE_STEP, countOf, dienLevel, gain, templeBonus, type FailReason, type GameState, type Result, type StageResult } from './game';
import { giongReady, giongResting, heroSetup, restAfter } from './giong';

/** Thắng màn này lần đầu thì roi sắt gãy. */
export const WHIP_BREAKS_AT = 6;

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
  if (!stageOpen(state, n)) return fail('manKhoa');
  if (def.needsGiong && !giongReady(state)) return fail('canThanhGiong');
  if (def.needsGiong && giongResting(state)) return fail('giongKietSuc');
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
  const hero = heroSetup(state);
  // Có Gióng thì ra trận một mình cũng được.
  if (!hero && UNIT_TYPES.every((k) => !army[k])) return fail('chuaChonQuan');
  const def = stageDef(n)!;
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
    bonus: templeBonus(state),
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
  if (first && battle.wave === STAGES.length) {
    state.giong.ascended = true;
    battle.ascend = true;
  }
  const result: StageResult = {
    stage: battle.wave,
    outcome,
    first,
    killed: battle.killed,
    total: battle.total,
    lost: { ...battle.lost },
    reward,
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
