// Bản đồ kinh đô Phong Châu: lưới vuông, hai nhánh sông dọc cạnh nam (z lớn)
// và cạnh đông (x lớn) hợp lưu ở góc, rừng ở cạnh bắc và tây.
// Lưới 38×38 từ bản lưu 11 (công trình to hơn); trước đó là 30×30, sông từ ô 27.

export const GRID = 38;
/** Ô có x hoặc z từ mốc này trở lên là sông. */
export const RIVER_START = 35;
/** Cạnh vùng xây được theo cấp Điện Vua Hùng, chỉ số 0 là cấp 1. Vùng luôn sát hai bờ sông; cấp 7 vẫn chừa một hàng rừng, cấp 8 không thêm đất. */
export const AREA_SIZE = [20, 23, 26, 28, 30, 32, 34, 34];
/** Góc móng Điện Vua Hùng lúc dựng kinh đô: Điện 5×5 cách hai bờ sông 7 ô. Mẫu kinh đô vẽ quanh chỗ này. */
export const DIEN_START = { x: 23, z: 23 };

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

// ---------- Độ cao ô đất ----------

/** Ô sông có độ cao này; ô đất từ 0 (bãi bồi ven sông) tới 3 (đồi phía rừng), đắp thêm được tới MAX_HEIGHT. */
export const RIVER_HEIGHT = -1;

/** Số ô từ ô (x, z) tới bờ sông gần nhất: 0 là ô sát sông. Âm khi ô nằm dưới sông. */
export function riverDistance(x: number, z: number): number {
  return Math.min(RIVER_START - 1 - x, RIVER_START - 1 - z);
}

/** Số ngẫu nhiên lặp lại được theo hạt giống. */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Value noise trên lưới thô `cell` ô (bản đồ `grid` ô), nội suy mượt, kết quả 0..1. */
function valueNoise(seed: number, cell: number, grid: number): (x: number, z: number) => number {
  const n = Math.ceil(grid / cell) + 2;
  const rand = rng(seed);
  const knots = Array.from({ length: n * n }, () => rand());
  const at = (i: number, j: number) => knots[Math.min(j, n - 1) * n + Math.min(i, n - 1)];
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x, z) => {
    const fx = x / cell;
    const fz = z / cell;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fade(fx - i);
    const v = fade(fz - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * v;
  };
}

/** Hình dạng địa hình: cạnh lưới, ô sông đầu tiên, số ô bãi bồi ven sông, số ô từ đồng bằng lên tới đồi. */
interface TerrainShape {
  grid: number;
  river: number;
  lowBand: number;
  inlandSpan: number;
}

function terrainHeights({ grid, river, lowBand, inlandSpan }: TerrainShape): number[] {
  const coarse = valueNoise(20260, 5, grid);
  const fine = valueNoise(731, 2.5, grid);
  const out: number[] = [];
  for (let z = 0; z < grid; z++) {
    for (let x = 0; x < grid; x++) {
      const d = Math.min(river - 1 - x, river - 1 - z);
      if (d < 0) {
        out.push(RIVER_HEIGHT);
        continue;
      }
      if (d < lowBand) {
        out.push(0);
        continue;
      }
      const inland = Math.min(Math.max((d - 3) / inlandSpan, 0), 1);
      const n = coarse(x, z) * 0.75 + fine(x, z) * 0.25;
      const h = 1 + Math.floor(inland * 1.4 + Math.max(0, n - 0.42) * 2.6);
      out.push(Math.min(Math.max(h, 1), 3));
    }
  }
  return out;
}

/**
 * Độ cao tự nhiên của mọi ô, lặp lại y hệt ở mọi máy: ba ô sát sông là bãi bồi (bậc 0, đủ cho móng 3×3),
 * vào trong là đồng bằng (bậc 1) có gò (bậc 2), càng xa sông về phía rừng càng nhiều đồi (bậc 2–3).
 */
export function baseHeights(): number[] {
  return terrainHeights({ grid: GRID, river: RIVER_START, lowBand: 3, inlandSpan: 17 });
}

/** Lưới của bản lưu trước phiên bản 11 (trước khi công trình to hơn): 30×30, sông từ ô 27. */
export const LEGACY_GRID = 30;
export const LEGACY_RIVER = 27;

/** Độ cao tự nhiên của bản đồ cũ 30×30, y như trước phiên bản 11; dùng khi nâng bản lưu rất cũ chưa có độ cao. */
export function legacyBaseHeights(): number[] {
  return terrainHeights({ grid: LEGACY_GRID, river: LEGACY_RIVER, lowBand: 2, inlandSpan: 13 });
}
