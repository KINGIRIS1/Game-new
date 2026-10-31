// Thánh Gióng: cậu bé làng Phù Đổng lớn lên nhờ gạo cả nước góp nuôi, ra trận khi đã có
// ngựa sắt, roi sắt, giáp sắt rèn ở lò rèn.

import type { HeroSetup } from './battle';
import { GEAR, GEAR_IDS, GIONG_FEED, type GearId } from './defs';
import { canAfford, dienLevel, pay, type FailReason, type GameState, type Result } from './game';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

/** Sứ giả tìm được Gióng khi Điện Vua Hùng lên cấp 2. */
export const giongAppeared = (s: GameState) => dienLevel(s) >= 2;
export const gearCount = (s: GameState) => GEAR_IDS.filter((g) => s.giong.gear[g]).length;
/** Đủ 5 mốc gạo và đủ ba món đồ sắt: Gióng vươn vai thành tráng sĩ. */
export const giongReady = (s: GameState) => s.giong.fed >= GIONG_FEED.length && gearCount(s) === GEAR_IDS.length;
export const giongResting = (s: GameState) => s.clock < s.giong.restUntil;

/** Gióng có ra trận lần này không, và đánh bằng gì. */
export function heroSetup(s: GameState): HeroSetup | null {
  if (!giongReady(s) || giongResting(s)) return null;
  return { kind: 'giong', bamboo: s.giong.whipBroken, glow: s.giong.ascended, non: false };
}

export type GiongLook = 'be' | 'thieuNien' | 'trangSi';

/** Dáng Gióng đứng trước Điện. Đã bay về trời thì không còn ở kinh đô. */
export function giongLook(s: GameState): GiongLook | null {
  if (!giongAppeared(s) || s.giong.ascended) return null;
  if (giongReady(s)) return 'trangSi';
  return s.giong.fed >= 2 ? 'thieuNien' : 'be';
}

export function nextFeedCost(s: GameState): number | null {
  return GIONG_FEED[s.giong.fed] ?? null;
}

export function canFeed(s: GameState): Result {
  if (!giongAppeared(s)) return fail('chuaCoGiong');
  const cost = nextFeedCost(s);
  if (cost === null) return fail('daGopDu');
  if (s.resources.gao < cost) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/** Góp gạo nuôi Gióng thêm một mốc. Trả về số mốc đã góp. */
export function feedGiong(s: GameState): Result<number> {
  const check = canFeed(s);
  if (!check.ok) return check;
  pay(s, { gao: nextFeedCost(s)! });
  s.giong.fed += 1;
  return ok(s.giong.fed);
}

/** Cấp lò rèn cao nhất còn nguyên. */
export function forgeLevel(s: GameState): number {
  return s.buildings.filter((b) => b.type === 'loRen' && !b.damaged).reduce((m, b) => Math.max(m, b.level), 0);
}

export function canForge(s: GameState, id: GearId): Result {
  if (!giongAppeared(s)) return fail('chuaCoGiong');
  if (s.giong.gear[id]) return fail('daRen');
  if (forgeLevel(s) < GEAR[id].forgeLevel) return fail('canLoRen');
  if (!canAfford(s, GEAR[id].cost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/** Thợ rèn ngày đêm rèn một món đồ sắt cho Gióng. */
export function forgeGear(s: GameState, id: GearId): Result<GearId> {
  const check = canForge(s, id);
  if (!check.ok) return check;
  pay(s, GEAR[id].cost);
  s.giong.gear[id] = true;
  return ok(id);
}
