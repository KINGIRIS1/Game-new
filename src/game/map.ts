// Bản đồ kinh đô Phong Châu: lưới vuông, hai nhánh sông dọc cạnh nam (z lớn)
// và cạnh đông (x lớn) hợp lưu ở góc, rừng ở cạnh bắc và tây.

export const GRID = 30;
/** Ô có x hoặc z từ mốc này trở lên là sông. */
export const RIVER_START = 27;
/** Cạnh vùng xây được theo cấp Điện Vua Hùng, chỉ số 0 là cấp 1. Vùng luôn sát hai bờ sông. */
export const AREA_SIZE = [16, 18, 20, 22, 24];

export function inGrid(x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < GRID && z < GRID;
}

export function isRiver(x: number, z: number): boolean {
  return inGrid(x, z) && (x >= RIVER_START || z >= RIVER_START);
}

/** Ô nhỏ nhất (theo cả x và z) thuộc vùng xây được ở cấp Điện này. */
export function areaStart(dienLevel: number): number {
  const size = AREA_SIZE[Math.min(Math.max(dienLevel, 1), AREA_SIZE.length) - 1];
  return RIVER_START - size;
}

export function isUnlocked(x: number, z: number, dienLevel: number): boolean {
  const lo = areaStart(dienLevel);
  return x >= lo && z >= lo && x < RIVER_START && z < RIVER_START;
}

export function touchesRiver(x: number, z: number, w: number, d: number): boolean {
  return x + w === RIVER_START || z + d === RIVER_START;
}
