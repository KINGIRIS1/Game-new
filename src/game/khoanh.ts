// Khoảnh đất: đất giữa dải rừng ngoài cùng và sông chia thành 10×10 khoảnh 5×5. Lúc đầu mở sẵn 16 khoảnh ở góc
// sông; mỗi cấp Điện được phát thêm một số khoảnh rừng, người chơi tự chọn khoảnh nào (miễn sát đất đã mở), trả
// gạo và vỏ ốc. Không phụ thuộc DOM hay Three.js.

import { BUILDINGS, KHOANH_COST_FRAC, KHOANH_COST_MIN, KHOANH_QUOTA, type Cost } from './defs';
import { canAfford, dienLevel, pay, type GameState, type Result } from './game';
import { FOREST_BAND, GRID, KHOANH, RIVER_START } from './map';

/** Số khoảnh mỗi chiều. */
export const KHOANH_N = (RIVER_START - FOREST_BAND) / KHOANH;

export const khoanhId = (cx: number, cz: number): number => cz * KHOANH_N + cx;

/** Góc (ô nhỏ nhất) của khoảnh. */
export function khoanhOrigin(id: number): { x: number; z: number } {
  return { x: FOREST_BAND + (id % KHOANH_N) * KHOANH, z: FOREST_BAND + Math.floor(id / KHOANH_N) * KHOANH };
}

/** Khoảnh chứa ô (x, z), hoặc −1 nếu ô ở dải rừng ngoài cùng, dưới sông hay ngoài lưới. */
export function khoanhOf(x: number, z: number): number {
  if (x < FOREST_BAND || z < FOREST_BAND || x >= RIVER_START || z >= RIVER_START) return -1;
  return khoanhId(Math.floor((x - FOREST_BAND) / KHOANH), Math.floor((z - FOREST_BAND) / KHOANH));
}

/** Bốn khoảnh kề cạnh. */
export function neighbors(id: number): number[] {
  const cx = id % KHOANH_N;
  const cz = Math.floor(id / KHOANH_N);
  const out: number[] = [];
  if (cx > 0) out.push(id - 1);
  if (cx < KHOANH_N - 1) out.push(id + 1);
  if (cz > 0) out.push(id - KHOANH_N);
  if (cz < KHOANH_N - 1) out.push(id + KHOANH_N);
  return out;
}

/** Các khoảnh của hình vuông cạnh `size` ô (bội số của 5) neo ở góc sông. */
export function squareKhoanh(size: number): number[] {
  const n = Math.min(KHOANH_N, Math.max(1, Math.round(size / KHOANH)));
  const out: number[] = [];
  for (let cz = KHOANH_N - n; cz < KHOANH_N; cz++) for (let cx = KHOANH_N - n; cx < KHOANH_N; cx++) out.push(khoanhId(cx, cz));
  return out;
}

/** Lúc đầu mở sẵn 16 khoảnh ở góc sông: vùng 20×20, Điện ở giữa. */
export const START_KHOANH: readonly number[] = squareKhoanh(20);

/**
 * Cạnh vùng đất hình vuông theo cấp Điện trước khi có khoảnh tự chọn (bản lưu phiên bản 11). Chỉ dùng để nâng bản
 * lưu và để test dựng nhanh kinh đô theo cấp.
 */
export const V11_AREA = [20, 25, 25, 30, 35, 40, 40, 45];

/** Mặt nạ ô đã mở và ô nhỏ nhất đã mở, nhớ theo mảng `state.khoanh` (phát rừng thay mảng mới). */
interface OpenCache {
  len: number;
  mask: Uint8Array;
  start: number;
}
const cache = new WeakMap<number[], OpenCache>();

function openCache(state: GameState): OpenCache {
  const list = state.khoanh;
  const hit = cache.get(list);
  if (hit && hit.len === list.length) return hit;
  const mask = new Uint8Array(GRID * GRID);
  let start = RIVER_START;
  for (const id of list) {
    const o = khoanhOrigin(id);
    start = Math.min(start, o.x, o.z);
    for (let dz = 0; dz < KHOANH; dz++) mask.fill(1, (o.z + dz) * GRID + o.x, (o.z + dz) * GRID + o.x + KHOANH);
  }
  const fresh = { len: list.length, mask, start };
  cache.set(list, fresh);
  return fresh;
}

/** Mặt nạ ô đất đã mở (GRID×GRID, chỉ số z * GRID + x): 1 là đã mở. */
export function openMask(state: GameState): Uint8Array {
  return openCache(state).mask;
}

/** Ô (x, z) đã mở (xây được). */
export function isOpen(state: GameState, x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < GRID && z < GRID && openCache(state).mask[z * GRID + x] === 1;
}

/**
 * Ô nhỏ nhất (theo cả x và z) của đất đã mở: mọi ô đã mở đều có x và z từ mốc này trở lên. Dải giặc xuất phát,
 * khung camera và chỗ neo công trình một ô tính từ đây.
 */
export function openStart(state: GameState): number {
  return openCache(state).start;
}

/** Tổng số khoảnh được mở ở cấp Điện này. */
export function khoanhQuota(level: number): number {
  return KHOANH_QUOTA[Math.min(Math.max(level, 1), KHOANH_QUOTA.length) - 1];
}

/** Số khoảnh còn được phát ở cấp Điện hiện tại. */
export function khoanhLeft(state: GameState): number {
  return Math.max(0, khoanhQuota(dienLevel(state)) - state.khoanh.length);
}

const round5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Giá phát khoảnh tiếp theo: một phần giá lần nâng Điện kế tiếp (ở Điện 8 lấy giá lên cấp 8), nhích dần từ khoảnh đầu
 * tới khoảnh cuối trong lượt của cấp Điện hiện tại; chỉ gạo và vỏ ốc.
 */
export function khoanhCost(state: GameState): Cost {
  const level = Math.min(Math.max(dienLevel(state), 1), KHOANH_QUOTA.length);
  const prev = level > 1 ? KHOANH_QUOTA[level - 2] : START_KHOANH.length;
  const size = Math.max(1, KHOANH_QUOTA[level - 1] - prev);
  const i = Math.min(Math.max(0, state.khoanh.length - prev), size - 1);
  const [lo, hi] = KHOANH_COST_FRAC;
  const frac = lo + (hi - lo) * (size > 1 ? i / (size - 1) : 0);
  const up = BUILDINGS.dien.upgradeCost[Math.min(level + 1, BUILDINGS.dien.maxLevel)] ?? {};
  return {
    gao: Math.max(KHOANH_COST_MIN.gao, round5(frac * (up.gao ?? 0))),
    voOc: Math.max(KHOANH_COST_MIN.voOc, round5(frac * (up.voOc ?? 0))),
  };
}

/** Khoảnh `id` chạm đất đã mở (4 hướng). */
function touchesOpen(state: GameState, id: number): boolean {
  return neighbors(id).some((n) => state.khoanh.includes(n));
}

const validId = (id: number) => Number.isInteger(id) && id >= 0 && id < KHOANH_N * KHOANH_N;

/** Phát được khoảnh rừng `id` không; được thì trả giá. */
export function canOpenKhoanh(state: GameState, id: number): Result<Cost> {
  if (!validId(id)) return { ok: false, reason: 'khongTimThay' };
  if (state.khoanh.includes(id)) return { ok: false, reason: 'khoanhDaMo' };
  if (!touchesOpen(state, id)) return { ok: false, reason: 'khoanhChuaSat' };
  if (khoanhLeft(state) <= 0) return { ok: false, reason: 'hetLuotKhoanh' };
  // Đang có giặc, lũ, hay trinh sát vừa báo: lo giữ kinh đô trước.
  if (state.raid.phase !== 'idle') return { ok: false, reason: 'dangCoGiac' };
  const cost = khoanhCost(state);
  if (!canAfford(state, cost)) return { ok: false, reason: 'thieuTaiNguyen' };
  return { ok: true, value: cost };
}

/** Phát khoảnh rừng `id`: trả giá, đất mở ngay. */
export function openKhoanh(state: GameState, id: number): Result<Cost> {
  const check = canOpenKhoanh(state, id);
  if (!check.ok) return check;
  pay(state, check.value);
  state.khoanh = [...state.khoanh, id].sort((a, b) => a - b);
  return check;
}

/** Các khoảnh phát được ngay nếu đủ của: chưa mở, sát đất đã mở, còn lượt (không xét giặc). */
export function openable(state: GameState): number[] {
  if (khoanhLeft(state) <= 0) return [];
  const out: number[] = [];
  for (let id = 0; id < KHOANH_N * KHOANH_N; id++) if (!state.khoanh.includes(id) && touchesOpen(state, id)) out.push(id);
  return out;
}

/** Cấp Điện thấp nhất (sau cấp hiện tại) cho thêm lượt phát, hoặc null nếu đã hết. */
export function nextQuotaLevel(state: GameState): number | null {
  const level = dienLevel(state);
  for (let l = level + 1; l <= KHOANH_QUOTA.length; l++) if (khoanhQuota(l) > Math.max(state.khoanh.length, khoanhQuota(level))) return l;
  return null;
}
