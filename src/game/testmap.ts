// Mốc tọa độ dùng chung cho test: đặt công trình theo vị trí so với Điện, so với bìa vùng đã khai phá
// hay so với bờ sông, thay vì viết cứng số ô (bản đồ và cỡ móng còn có thể đổi).

import { BUILDINGS, type BuildingType } from './defs';
import type { GameState } from './game';
import { DIEN_HOME, RIVER_START, areaStart } from './map';

/** Góc móng Điện Vua Hùng (cả x và z). */
export const DIEN = DIEN_HOME;
/** Ô ngay sau mép phải (x) hay mép dưới (z) của móng Điện. */
export const DIEN_END = DIEN_HOME + BUILDINGS.dien.w;

/** Ô thứ `n` tính từ bìa vùng đã khai phá (phía rừng) ở cấp Điện `level`. */
export const edge = (level: number, n = 0): number => areaStart(level) + n;

/** Góc móng để công trình `type` đứng sát bờ sông (cách thêm `n` ô vào đất liền). */
export const bank = (type: BuildingType, n = 0): number => RIVER_START - BUILDINGS[type].w - n;

/** Cạnh móng của công trình `type`. */
export const size = (type: BuildingType): number => BUILDINGS[type].w;

/** Đặt cấp Điện Vua Hùng (đất khai phá theo cấp). */
export function setDien(s: GameState, level: number): void {
  s.buildings.find((b) => b.type === 'dien')!.level = level;
}
