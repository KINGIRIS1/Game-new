// Rèn binh khí ở lò rèn cấp 6, 7: mỗi binh chủng rèn riêng hai bậc, lính mạnh lên mà không đông thêm,
// để bãi chiến vẫn giữ được khoảng 60 người.

import { ARMS, type UnitType } from './defs';
import { canAfford, pay, type FailReason, type GameState, type Result } from './game';
import { forgeLevel } from './giong';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

/** Bậc rèn kế tiếp của binh chủng này, hay null khi đã rèn đủ. */
export function nextArms(s: GameState, unit: UnitType): (typeof ARMS)[number] | null {
  return ARMS[s.arms[unit]] ?? null;
}

export function canForgeArms(s: GameState, unit: UnitType): Result {
  const next = nextArms(s, unit);
  if (!next) return fail('capToiDa');
  if (forgeLevel(s) < next.forgeLevel) return fail('canLoRen');
  if (!canAfford(s, next.cost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/** Thợ rèn rèn thêm một bậc binh khí cho cả binh chủng. Trả về bậc mới. */
export function forgeArms(s: GameState, unit: UnitType): Result<number> {
  const check = canForgeArms(s, unit);
  if (!check.ok) return check;
  pay(s, nextArms(s, unit)!.cost);
  s.arms[unit] += 1;
  return ok(s.arms[unit]);
}
