// Mốc tọa độ dùng chung cho test: đặt công trình theo vị trí so với Điện, so với bìa vùng đất hay so với bờ sông,
// thay vì viết cứng số ô (bản đồ và cỡ móng còn có thể đổi).

import { BUILDINGS, type BuildingType } from './defs';
import type { GameState } from './game';
import { AREA, squareKhoanh } from './khoanh';
import { DIEN_HOME, RIVER_START } from './map';
import { OLD_DIEN } from './xepLai';

/** Góc móng Điện Vua Hùng (cả x và z). */
export const DIEN = DIEN_HOME;
/** Ô ngay sau mép phải (x) hay mép dưới (z) của móng Điện. */
export const DIEN_END = DIEN_HOME + BUILDINGS.dien.w;

/** Ô thứ `n` tính từ bìa (phía rừng) của vùng đất hình vuông mà `setDien(s, level)` mở. */
export const edge = (level: number, n = 0): number => RIVER_START - AREA[level - 1] + n;

/** Góc móng để công trình `type` đứng sát bờ sông (cách thêm `n` ô vào đất liền). */
export const bank = (type: BuildingType, n = 0): number => RIVER_START - BUILDINGS[type].w - n;

/** Cạnh móng của công trình `type`. */
export const size = (type: BuildingType): number => BUILDINGS[type].w;

/**
 * Đặt cấp Điện Vua Hùng và cho đất đã mở đúng bằng vùng hình vuông neo góc sông của cấp ấy (như trước khi có khoảnh
 * tự chọn): `edge(level)` là bìa vùng đất.
 */
export function setDien(s: GameState, level: number): void {
  s.buildings.find((b) => b.type === 'dien')!.level = level;
  s.khoanh = squareKhoanh(AREA[level - 1]);
}

/**
 * Đưa Điện trong bản lưu (đã `JSON.parse`) về Điện 5×5 của bản lưu trước phiên bản 20, cùng mép đông nam với Điện
 * bây giờ: dùng khi giả bản lưu cũ từ state mới, để bước 19 → 20 nới Điện về đúng chỗ cũ.
 */
export function oldDien(raw: { buildings: { type: string; x: number; z: number }[] }): void {
  const dien = raw.buildings.find((b) => b.type === 'dien')!;
  dien.x += BUILDINGS.dien.w - OLD_DIEN;
  dien.z += BUILDINGS.dien.d - OLD_DIEN;
}
