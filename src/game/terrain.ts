// Độ cao ô đất và nước lũ: công trình đứng trên nền nào, đê chắn nước tới đâu,
// nước lũ từ sông tràn vào những ô nào. Không phụ thuộc DOM hay Three.js.

import { BUILDINGS, DIKE_RAISE, FLOOD_TOLERANCE, type BuildingType } from './defs';
import type { Building, GameState } from './game';
import { GRID, RIVER_HEIGHT, inGrid, isRiver, isUnlocked } from './map';

const tileIndex = (x: number, z: number) => z * GRID + x;

/** Độ cao của ô (x, z); ngoài lưới coi như sông. */
export function tileHeight(state: GameState, x: number, z: number): number {
  return inGrid(x, z) ? state.heights[tileIndex(x, z)] : RIVER_HEIGHT;
}

/** Ô cao nhất dưới móng nếu đặt công trình loại `type` ở (x, z): công trình đắp nền bằng chỗ cao nhất. */
export function footprintTop(state: GameState, type: BuildingType, x: number, z: number): number {
  const def = BUILDINGS[type];
  let top = RIVER_HEIGHT;
  for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) top = Math.max(top, tileHeight(state, x + dx, z + dz));
  return top;
}

/** Đắp mọi ô dưới móng lên bằng `h`. */
export function levelFootprint(state: GameState, b: Pick<Building, 'type' | 'x' | 'z'>, h: number): void {
  const def = BUILDINGS[b.type];
  for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (inGrid(b.x + dx, b.z + dz)) state.heights[tileIndex(b.x + dx, b.z + dz)] = h;
}

/** Nền của công trình: móng đã đắp phẳng, nên lấy ô góc là đủ. */
export function groundOf(state: GameState, b: Building): number {
  return tileHeight(state, b.x, b.z);
}

export function floodToleranceOf(type: BuildingType): number {
  return FLOOD_TOLERANCE[type] ?? 0;
}

/** Đê còn nguyên đứng trên ô (x, z) thì cao thêm mấy bậc. */
function dikeGrid(state: GameState): Int8Array {
  const raise = new Int8Array(GRID * GRID);
  for (const b of state.buildings) if (b.type === 'de' && !b.damaged) raise[tileIndex(b.x, b.z)] = DIKE_RAISE[b.level - 1] ?? DIKE_RAISE[0];
  return raise;
}

/**
 * Những ô bị ngập khi nước sông dâng tới mực `level` (bậc, có thể lẻ): nước loang từ sông sang bốn phía,
 * vào ô đã khai phá thấp hơn mực nước. Đê còn nguyên làm ô cao thêm, chắn nước. Rừng chưa phát giữ đất, không ngập.
 * Trả về lưới GRID×GRID, 1 là ngập. Ô sông luôn là 1.
 */
export function floodMap(state: GameState, level: number, dien: number): Uint8Array {
  const wet = new Uint8Array(GRID * GRID);
  const raise = dikeGrid(state);
  const queue: number[] = [];
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      if (!isRiver(x, z)) continue;
      wet[tileIndex(x, z)] = 1;
      queue.push(tileIndex(x, z));
    }
  }
  if (level <= 0) return wet;
  const steps = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (queue.length) {
    const i = queue.pop()!;
    const x = i % GRID;
    const z = Math.floor(i / GRID);
    for (const [dx, dz] of steps) {
      const nx = x + dx;
      const nz = z + dz;
      if (!inGrid(nx, nz)) continue;
      const ni = tileIndex(nx, nz);
      if (wet[ni] || !isUnlocked(nx, nz, dien)) continue;
      if (state.heights[ni] + raise[ni] >= level) continue;
      wet[ni] = 1;
      queue.push(ni);
    }
  }
  return wet;
}

/** Công trình bị nước làm hư nếu dâng tới mực `level`: móng nằm trong vùng ngập và nước cao hơn sức chịu của nền. */
export function drowns(state: GameState, b: Building, wet: Uint8Array, level: number): boolean {
  if (b.damaged) return false;
  if (level <= groundOf(state, b) + floodToleranceOf(b.type)) return false;
  const def = BUILDINGS[b.type];
  for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (wet[tileIndex(b.x + dx, b.z + dz)]) return true;
  return false;
}
