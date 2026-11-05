// Độ cao ô đất và nước lũ: công trình đứng trên nền nào, đê chắn nước tới đâu,
// nước lũ từ sông tràn vào những ô nào. Không phụ thuộc DOM hay Three.js.

import { BRIDGE_FLOOD, BUILDINGS, CONG_DE_RAISE, DIKE_RAISE, FLOOD_TOLERANCE, PHU_SA_TYPES, isBridge, isDecor, type BuildingType } from './defs';
import type { Building, GameState } from './game';
import { openMask } from './khoanh';
import { GRID, RIVER_HEIGHT, inGrid, isRiver } from './map';

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
  // Đường đi, đồ trang trí không sợ nước.
  if (isDecor(type)) return 99;
  return FLOOD_TOLERANCE[type] ?? 0;
}

/**
 * Đê còn nguyên đứng trên ô (x, z) thì cao thêm mấy bậc. Cống đê còn nguyên mà đang đóng cao như kè đá; đang mở thì
 * không chắn nước. `shut`: tính như mọi cống còn nguyên đều đóng (để biết nước nào vào qua cống).
 */
function dikeGrid(state: GameState, shut = false): Int8Array {
  const raise = new Int8Array(GRID * GRID);
  for (const b of state.buildings) {
    if (b.damaged) continue;
    if (b.type === 'de') raise[tileIndex(b.x, b.z)] = DIKE_RAISE[b.level - 1] ?? DIKE_RAISE[0];
    else if (b.type === 'congDe' && (shut || !b.mo)) raise[tileIndex(b.x, b.z)] = CONG_DE_RAISE;
  }
  return raise;
}

/** Có cống đê còn nguyên đang mở không. */
export function hasOpenCong(state: GameState): boolean {
  return state.buildings.some((b) => b.type === 'congDe' && b.mo && !b.damaged);
}

/**
 * Những ô bị ngập khi nước sông dâng tới mực `level` (bậc, có thể lẻ): nước loang từ sông sang bốn phía,
 * vào ô đã khai phá thấp hơn mực nước. Đê còn nguyên làm ô cao thêm, chắn nước. Rừng chưa phát giữ đất, không ngập.
 * Trả về lưới GRID×GRID, 1 là ngập. Ô sông luôn là 1. `shut`: tính như mọi cống còn nguyên đều đóng.
 */
export function floodMap(state: GameState, level: number, shut = false): Uint8Array {
  const wet = new Uint8Array(GRID * GRID);
  const open = openMask(state);
  const raise = dikeGrid(state, shut);
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
      if (wet[ni] || !open[ni]) continue;
      if (state.heights[ni] + raise[ni] >= level) continue;
      wet[ni] = 1;
      queue.push(ni);
    }
  }
  return wet;
}

/** Móng công trình có ô nào ngập theo lưới `wet` không. */
function touches(b: Building, wet: Uint8Array): boolean {
  const def = BUILDINGS[b.type];
  for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (wet[tileIndex(b.x + dx, b.z + dz)]) return true;
  return false;
}

/** Công trình bị nước làm hư nếu dâng tới mực `level`: móng nằm trong vùng ngập và nước cao hơn sức chịu của nền. */
export function drowns(state: GameState, b: Building, wet: Uint8Array, level: number): boolean {
  if (b.damaged) return false;
  // Cầu bắc trên sông: lũ dâng tới bậc nào thì cuốn trôi tùy cấp cầu.
  if (isBridge(b.type)) return level >= (BRIDGE_FLOOD[b.level - 1] ?? Infinity);
  if (level <= groundOf(state, b) + floodToleranceOf(b.type)) return false;
  return touches(b, wet);
}

/** Nước lũ ở mực `level`: ô nào ngập, công trình nào hư, ruộng nào được bồi phù sa. */
export interface FloodHits {
  /** Lưới ô ngập (như `floodMap`). */
  wet: Uint8Array;
  /** Ô chỉ ngập vì có cống đang mở (nước êm); `null` khi không có cống nào mở. */
  calm: Uint8Array | null;
  /** Công trình bị nước làm hư. */
  drown: Building[];
  /** Ruộng chỉ dính nước vào qua cống đang mở: không hư mà được bồi phù sa. */
  boi: Building[];
}

/**
 * Nước lũ dâng tới mực `level`. Nước dữ là nước vẫn ngập khi mọi cống còn nguyên đều đóng (tràn bờ, qua đê vỡ, cống
 * vỡ); nước êm là phần chỉ ngập vì có cống mở. Ruộng lúa, ruộng nếp dính nước dữ thì hư như cũ; chỉ dính nước êm thì
 * không hư mà được bồi phù sa. Công trình khác hư theo sức chịu như lũ thường, dù nước êm hay dữ.
 * Dùng chung cho trận đánh, bảng cống và tô xem trước, để ba chỗ luôn khớp nhau.
 */
export function floodHits(state: GameState, level: number): FloodHits {
  const wet = floodMap(state, level);
  let calm: Uint8Array | null = null;
  let harsh = wet;
  if (level > 0 && hasOpenCong(state)) {
    harsh = floodMap(state, level, true);
    calm = new Uint8Array(wet.length);
    for (let i = 0; i < wet.length; i++) if (wet[i] && !harsh[i]) calm[i] = 1;
  }
  const drown: Building[] = [];
  const boi: Building[] = [];
  for (const b of state.buildings) {
    if (calm && PHU_SA_TYPES.includes(b.type) && !b.damaged && !touches(b, harsh)) {
      if (level > groundOf(state, b) && touches(b, calm)) boi.push(b);
      continue;
    }
    if (drowns(state, b, wet, level)) drown.push(b);
  }
  return { wet, calm, drown, boi };
}
