// Cây, đá mọc trên ô trống (kinh đô lớn PR 4). Thỉnh thoảng trên đất đã mở mọc một bụi cây dại hay lăn tới một tảng
// đá; chạm vào thì dân dọn, được chút gạo (cây) hay đất đá (đá) theo cấp Điện. Khoảnh vừa phát có sẵn 1–2 cái.
// Cây, đá không chặn gì: dựng công trình, trải đường, đặt đồ trang trí đè lên thì dân dọn luôn (không được của),
// giặc đi qua được. Chỉ mọc theo đồng hồ chơi (`clock`), không mọc lúc vắng mặt, không mọc khi đang có giặc.

import {
  CAY_DA_CAP,
  CAY_DA_EVERY_MS,
  CAY_DA_FIRST_MS,
  CAY_DA_KHOANH,
  CAY_DA_KINDS,
  CAY_DA_REWARD,
  CAY_DA_TREE_SHARE,
  CAY_DA_VARIANTS,
  type CayDaKind,
  type Cost,
} from './defs';
import { dienLevel, gain, occupancy, type GameState, type Result } from './game';
import { khoanhOrigin, openMask } from './khoanh';
import { GRID, KHOANH, RIVER_START } from './map';

/** Một cây hay tảng đá trên ô (x, z); `v` là dáng (hình vẽ). */
export interface CayDa {
  x: number;
  z: number;
  kind: CayDaKind;
  v: number;
}

export interface CayDaState {
  list: CayDa[];
  /** Đồng hồ chơi (ms) lúc mọc cái tiếp theo. */
  nextAt: number;
  /** Số lần đã gieo: hạt giống cho chỗ, loại, dáng của lần gieo tiếp theo. */
  seq: number;
}

export function initialCayDa(clock = 0): CayDaState {
  return { list: [], nextAt: clock + CAY_DA_FIRST_MS, seq: 0 };
}

/** Số ngẫu nhiên 0..1 lặp lại được theo lần gieo `seq` và lượt bốc `i` (trộn kiểu murmur3 cho đều). */
function roll(seq: number, i: number): number {
  let h = (Math.imul(seq + 1, 0x9e3779b1) ^ Math.imul(i + 1, 0x632be5ab)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function cayDaAt(state: GameState, x: number, z: number): CayDa | undefined {
  return state.cayDa.list.find((c) => c.x === x && c.z === z);
}

/** Ô (x, z) còn mọc được: đã mở, không có công trình (kể cả đường, đồ trang trí), chưa có cây đá. */
function free(state: GameState, x: number, z: number, mask: Uint8Array, occ: Int32Array): boolean {
  if (x < 0 || z < 0 || x >= RIVER_START || z >= RIVER_START) return false;
  const i = z * GRID + x;
  return mask[i] === 1 && occ[i] === 0 && !cayDaAt(state, x, z);
}

/** Gieo một cây hay đá vào một trong các ô `tiles` còn trống (chọn theo lần gieo). Hết chỗ thì thôi. */
function sow(state: GameState, tiles: number[]): CayDa | null {
  const mask = openMask(state);
  const occ = occupancy(state);
  const spots = tiles.filter((i) => free(state, i % GRID, Math.floor(i / GRID), mask, occ));
  if (!spots.length) return null;
  const seq = state.cayDa.seq++;
  const i = spots[Math.floor(roll(seq, 0) * spots.length)];
  const kind: CayDaKind = roll(seq, 1) < CAY_DA_TREE_SHARE ? 'cay' : 'da';
  const c: CayDa = { x: i % GRID, z: Math.floor(i / GRID), kind, v: Math.floor(roll(seq, 2) * CAY_DA_VARIANTS) };
  state.cayDa.list.push(c);
  return c;
}

/** Mọi ô đất trong lưới phía bên này sông. */
function landTiles(): number[] {
  const out: number[] = [];
  for (let z = 0; z < RIVER_START; z++) for (let x = 0; x < RIVER_START; x++) out.push(z * GRID + x);
  return out;
}
let allLand: number[] | null = null;

/** Cây đá trên ô đã có công trình đè lên (hay đất không còn mở) thì dân đã dọn: bỏ đi, không được của. */
export function pruneCayDa(state: GameState): void {
  const list = state.cayDa.list;
  if (!list.length) return;
  const mask = openMask(state);
  const occ = occupancy(state);
  const kept = list.filter((c) => mask[c.z * GRID + c.x] === 1 && occ[c.z * GRID + c.x] === 0);
  if (kept.length !== list.length) state.cayDa.list = kept;
}

/**
 * Gọi mỗi nhịp: dọn cây đá bị công trình đè; tới giờ thì mọc thêm một cái nếu chưa đủ `CAY_DA_CAP`. Đang có giặc
 * (cả lúc trinh sát báo) thì chờ giặc đi rồi mới mọc.
 */
export function updateCayDa(state: GameState): void {
  pruneCayDa(state);
  const cd = state.cayDa;
  if (state.clock < cd.nextAt || state.raid.phase !== 'idle') return;
  cd.nextAt = state.clock + CAY_DA_EVERY_MS;
  if (cd.list.length < CAY_DA_CAP) sow(state, (allLand ??= landTiles()));
}

/** Khoảnh `id` vừa phát: có sẵn 1–2 cây đá trên các ô trống trong khoảnh. */
export function sowKhoanh(state: GameState, id: number): CayDa[] {
  const o = khoanhOrigin(id);
  const tiles: number[] = [];
  for (let dz = 0; dz < KHOANH; dz++) for (let dx = 0; dx < KHOANH; dx++) tiles.push((o.z + dz) * GRID + o.x + dx);
  const [lo, hi] = CAY_DA_KHOANH;
  const n = lo + Math.floor(roll(state.cayDa.seq, 9) * (hi - lo + 1));
  const out: CayDa[] = [];
  for (let k = 0; k < n; k++) {
    const c = sow(state, tiles);
    if (c) out.push(c);
  }
  return out;
}

/** Của được khi dọn cây đá loại `kind` ở cấp Điện hiện tại. */
export function cayDaReward(state: GameState, kind: CayDaKind): Cost {
  const table = CAY_DA_REWARD[kind];
  return { ...table[Math.min(dienLevel(state), table.length) - 1] };
}

/** Chạm vào cây đá ở (x, z): dân dọn đi, được của (không vượt sức chứa kho). Trả về của được. */
export function clearCayDa(state: GameState, x: number, z: number): Result<{ kind: CayDaKind; gained: Cost }> {
  pruneCayDa(state);
  const c = cayDaAt(state, x, z);
  if (!c) return { ok: false, reason: 'khongTimThay' };
  const reward = cayDaReward(state, c.kind);
  const before = { ...state.resources };
  gain(state, reward);
  state.cayDa.list = state.cayDa.list.filter((o) => o !== c);
  const gained: Cost = {};
  for (const r of Object.keys(reward) as (keyof Cost)[]) gained[r] = Math.round(state.resources[r] - before[r]);
  return { ok: true, value: { kind: c.kind, gained } };
}

/** Bản lưu hợp lệ: mỗi cái trên một ô đất trong lưới, loại và dáng đúng, không hai cái chung một ô. */
export function isCayDaState(v: unknown): v is CayDaState {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  if (typeof s.nextAt !== 'number' || !Number.isFinite(s.nextAt) || typeof s.seq !== 'number' || !Number.isInteger(s.seq) || s.seq < 0) return false;
  if (!Array.isArray(s.list)) return false;
  const seen = new Set<number>();
  return s.list.every((c: unknown) => {
    if (!c || typeof c !== 'object') return false;
    const o = c as Record<string, unknown>;
    if (!Number.isInteger(o.x) || !Number.isInteger(o.z) || !Number.isInteger(o.v)) return false;
    const x = o.x as number;
    const z = o.z as number;
    if (x < 0 || z < 0 || x >= RIVER_START || z >= RIVER_START || (o.v as number) < 0 || (o.v as number) >= CAY_DA_VARIANTS) return false;
    if (!CAY_DA_KINDS.includes(o.kind as CayDaKind) || seen.has(z * GRID + x)) return false;
    seen.add(z * GRID + x);
    return true;
  });
}
