// Bản đồ kinh đô Phong Châu: lưới vuông, hai nhánh sông dọc cạnh nam (z lớn)
// và cạnh đông (x lớn) hợp lưu ở góc, rừng ở cạnh bắc và tây.

export const GRID = 30;
/** Ô có x hoặc z từ mốc này trở lên là sông. */
export const RIVER_START = 27;
/** Cạnh vùng xây được theo cấp Điện Vua Hùng, chỉ số 0 là cấp 1. Vùng luôn sát hai bờ sông; cấp 7 vẫn chừa một hàng rừng. */
export const AREA_SIZE = [16, 18, 20, 22, 24, 25, 26];

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

/** Value noise trên lưới thô `cell` ô, nội suy mượt, kết quả 0..1. */
function valueNoise(seed: number, cell: number): (x: number, z: number) => number {
  const n = Math.ceil(GRID / cell) + 2;
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

/**
 * Độ cao tự nhiên của mọi ô, lặp lại y hệt ở mọi máy: hai ô sát sông là bãi bồi (bậc 0),
 * vào trong là đồng bằng (bậc 1) có gò (bậc 2), càng xa sông về phía rừng càng nhiều đồi (bậc 2–3).
 */
export function baseHeights(): number[] {
  const coarse = valueNoise(20260, 5);
  const fine = valueNoise(731, 2.5);
  const out: number[] = [];
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const d = riverDistance(x, z);
      if (d < 0) {
        out.push(RIVER_HEIGHT);
        continue;
      }
      if (d <= 1) {
        out.push(0);
        continue;
      }
      const inland = Math.min(Math.max((d - 3) / 13, 0), 1);
      const n = coarse(x, z) * 0.75 + fine(x, z) * 0.25;
      const h = 1 + Math.floor(inland * 1.4 + Math.max(0, n - 0.42) * 2.6);
      out.push(Math.min(Math.max(h, 1), 3));
    }
  }
  return out;
}
