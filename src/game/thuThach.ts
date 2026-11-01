// Chương 4 phần 4: thử thách phó bản và huân công.
// Thắng màn nào ở chế độ thường thì màn ấy mở một thử thách (Giặc dữ, Không tướng hay Hai binh chủng, `CHALLENGES`).
// Thắng thử thách lần đầu được huân công theo chương của màn. Huân công đổi lấy bậc của năm nhánh (bốn binh chủng và
// tướng), mỗi bậc thêm máu và sức đánh ở mọi trận, giữ mãi. Đánh và ghi kết quả thử thách ở `campaign.ts`.

import type { Battle, FieldSetup } from './battle';
import { CHALLENGES, GIAC_DU_DMG, HUAN_BRANCHES, HUAN_COST, HUAN_REWARD, STAGES, type ChallengeDef, type HuanBranch } from './defs';
import type { FailReason, GameState, Result, ThuThachState } from './game';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

export function initialThuThach(): ThuThachState {
  return { won: [], huan: 0, bac: { giao: 0, cung: 0, voi: 0, no: 0, tuong: 0 } };
}

/** Thử thách của màn `n`. */
export const challengeOf = (n: number): ChallengeDef | undefined => CHALLENGES[n - 1];

/** Thử thách màn `n` đã mở: đã thắng màn ấy ở chế độ thường. */
export const challengeOpen = (s: GameState, n: number) => !!challengeOf(n) && n <= s.campaign.cleared;

export const challengeWon = (s: GameState, n: number) => s.thuThach.won.includes(n);

/** Huân công cho lần đầu thắng thử thách màn `n`. */
export const huanReward = (n: number) => (STAGES[n - 1] ? HUAN_REWARD[STAGES[n - 1].chapter] : 0);

/** Phần thiết lập trận của thử thách màn `n`: hệ số máu giặc riêng, giặc dữ đánh đau hơn. */
export function challengeField(n: number): Pick<FieldSetup, 'hpScale' | 'fury' | 'challenge'> {
  const ch = challengeOf(n)!;
  return { hpScale: ch.hpScale, fury: ch.kind === 'giacDu' ? GIAC_DU_DMG : undefined, challenge: ch.kind };
}

/** Thắng một trận thử thách: lần đầu thì cộng huân công, ghi đã thắng. Trả về số huân công được. */
export function winChallenge(s: GameState, n: number): number {
  if (challengeWon(s, n)) return 0;
  const huan = huanReward(n);
  s.thuThach.huan += huan;
  s.thuThach.won = [...s.thuThach.won, n].sort((a, b) => a - b);
  return huan;
}

/** Giá bậc kế tiếp của nhánh, null khi nhánh đã đủ bậc. */
export function huanNextCost(s: GameState, branch: HuanBranch): number | null {
  return HUAN_COST[s.thuThach.bac[branch]] ?? null;
}

export function canBuyHuan(s: GameState, branch: HuanBranch): Result {
  const cost = huanNextCost(s, branch);
  if (cost === null) return fail('huanToiDa');
  if (s.thuThach.huan < cost) return fail('thieuHuanCong');
  return ok(undefined);
}

/** Mua bậc kế tiếp của nhánh huân công. Trả về bậc mới. */
export function buyHuan(s: GameState, branch: HuanBranch): Result<number> {
  const check = canBuyHuan(s, branch);
  if (!check.ok) return check;
  s.thuThach.huan -= huanNextCost(s, branch)!;
  s.thuThach.bac[branch]++;
  return ok(s.thuThach.bac[branch]);
}

/** Bậc huân công đưa vào trận (bản sao, để trận không đổi theo khi mua thêm giữa trận). */
export const huanTiers = (s: GameState): Battle['huan'] => ({ ...s.thuThach.bac });

/** Tổng huân công đã có từ trước tới giờ (đang có cộng đã tiêu). */
export function huanEarned(s: GameState): number {
  let spent = 0;
  for (const b of HUAN_BRANCHES) for (let i = 0; i < s.thuThach.bac[b]; i++) spent += HUAN_COST[i];
  return s.thuThach.huan + spent;
}
