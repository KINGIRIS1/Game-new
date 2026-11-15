// Bố cục năm map dã ngoại (docs/thiet-ke.md mục Kế hoạch: dã ngoại): trại (điểm hồi sinh), năm khu quái yếu tới mạnh,
// khu boss, cổng sang map trước, map sau; vật cản rải theo hạt giống của map, chừa lối đi giữa các khu. Thuần logic,
// không vẽ gì; phần vẽ (`render/daNgoai.ts`) đọc cùng dữ liệu này nên hình và luật luôn khớp.
//
// Tọa độ theo ô: x, z từ 0 tới `DA_KHUNG.w`, `DA_KHUNG.d`. Vật cản là hình tròn, đặt cách nhau đủ rộng để người đi
// trượt dọc mép mà qua; đi xa thì tìm đường trên lưới ô 1 (`timDuong`).

import { DA_KHUNG, DA_MAP, type DaCan, type DaMapId } from './defs';

export interface Diem {
  x: number;
  z: number;
}

export interface DaKhuBoCuc extends Diem {
  r: number;
}

export interface DaVatCan extends Diem {
  r: number;
  ve: DaCan;
}

export interface DaBoCuc {
  id: DaMapId;
  trai: Diem;
  /** Năm khu quái, theo thứ tự yếu tới mạnh. */
  khu: DaKhuBoCuc[];
  boss: DaKhuBoCuc;
  /** Cổng về map trước (map 1: về kinh đô) và cổng sang map sau (map 5 không có). */
  congTruoc: Diem;
  congSau: Diem | null;
  /** Lối đi nối trại, các khu, khu boss, cổng (để vẽ đường mòn). */
  loi: Diem[];
  can: DaVatCan[];
}

/** Bố cục mẫu (map lẻ), map chẵn lật theo chiều ngang. */
const MAU = {
  congTruoc: { x: 5, z: 75 },
  trai: { x: 11, z: 68 },
  khu: [
    { x: 25, z: 62, r: 8 },
    { x: 43, z: 69, r: 8 },
    { x: 62, z: 58, r: 8.5 },
    { x: 52, z: 38, r: 9 },
    { x: 29, z: 30, r: 9 },
  ],
  boss: { x: 50, z: 15, r: 6 },
  congSau: { x: 71, z: 8 },
};

/** Số ngẫu nhiên lặp lại được (cùng kiểu với `rng` của trận). */
function hat(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const len = (dx: number, dz: number) => Math.sqrt(dx * dx + dz * dz);

/** Khoảng cách từ (x, z) tới đoạn a–b. */
function segDist(x: number, z: number, a: Diem, b: Diem): number {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const l2 = vx * vx + vz * vz;
  const k = l2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / l2)) : 0;
  return len(x - a.x - vx * k, z - a.z - vz * k);
}

/** Bán kính vật cản theo dáng (tối thiểu, thêm tối đa). */
const CO: Record<DaCan, [number, number]> = {
  cay: [0.55, 0.35],
  tre: [0.6, 0.4],
  da: [0.45, 0.45],
  daNhon: [0.5, 0.4],
  sim: [0.45, 0.3],
  cayChet: [0.4, 0.25],
  go: [0.45, 0.2],
  lau: [0.6, 0.5],
  ao: [1.4, 1.2],
};

/** Lối đi chừa trống mỗi bên đường mòn chừng này ô; vật cản cách nhau ít nhất `KHE` ô. */
const LOI = 2.6;
const KHE = 1.7;
/** Số chỗ thử đặt vật cản. */
const THU = 900;

const cache = new Map<DaMapId, DaBoCuc>();

/** Bố cục map `id` (dựng một lần, dùng lại). */
export function boCuc(id: DaMapId): DaBoCuc {
  let b = cache.get(id);
  if (!b) cache.set(id, (b = dung(id)));
  return b;
}

function dung(id: DaMapId): DaBoCuc {
  const def = DA_MAP[id];
  const W = DA_KHUNG.w;
  const lat = <T extends Diem>(p: T): T => (def.lat ? { ...p, x: W - p.x } : { ...p });
  const trai = lat(MAU.trai);
  const khu = MAU.khu.map(lat);
  const boss = lat(MAU.boss);
  const congTruoc = lat(MAU.congTruoc);
  const congSau = id < 5 ? lat(MAU.congSau) : null;
  const loi: Diem[] = [congTruoc, trai, ...khu, boss, ...(congSau ? [congSau] : [])];
  const rand = hat(id * 104729 + 17);
  const kinds = Object.entries(def.can) as [DaCan, number][];
  const tong = kinds.reduce((a, [, w]) => a + w, 0);
  const pick = (r: number): DaCan => {
    let x = r * tong;
    for (const [k, w] of kinds) {
      x -= w;
      if (x < 0) return k;
    }
    return kinds[kinds.length - 1][0];
  };
  const can: DaVatCan[] = [];
  const vung = [...khu, boss];
  for (let i = 0; i < THU; i++) {
    const ve = pick(rand());
    const [r0, dr] = CO[ve];
    const r = r0 + rand() * dr;
    const x = 1.5 + rand() * (W - 3);
    const z = 1.5 + rand() * (DA_KHUNG.d - 3);
    let ok = len(x - trai.x, z - trai.z) > 7 + r && len(x - congTruoc.x, z - congTruoc.z) > 3.5 + r;
    if (ok && congSau) ok = len(x - congSau.x, z - congSau.z) > 3.5 + r;
    for (let k = 0; ok && k + 1 < loi.length; k++) if (segDist(x, z, loi[k], loi[k + 1]) < LOI + r) ok = false;
    // Trong khu chỉ có vài hòn đá nhỏ ở rìa; giữa khu để trống cho quái đứng, người đánh.
    for (const v of vung) if (ok && len(x - v.x, z - v.z) < v.r + r + 0.6) ok = false;
    for (const c of can) if (ok && len(x - c.x, z - c.z) < r + c.r + KHE) ok = false;
    if (ok) can.push({ x, z, r, ve });
  }
  return { id, trai, khu, boss, congTruoc, congSau, loi, can };
}

/** Khoảng cách có dấu tới vật cản gần nhất (âm là ở trong). */
export function sdCan(b: DaBoCuc, x: number, z: number): number {
  let d = Infinity;
  for (const c of b.can) {
    const v = len(x - c.x, z - c.z) - c.r;
    if (v < d) d = v;
  }
  return d;
}

/** Vật cản gần (x, z) nhất mà thân bán kính `r` đang chạm, không có thì null. */
function chamCan(b: DaBoCuc, x: number, z: number, r: number): DaVatCan | null {
  let best: DaVatCan | null = null;
  let bestD = 0;
  for (const c of b.can) {
    const d = len(x - c.x, z - c.z) - c.r - r;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** Giữ trong map, chừa mép. */
export const kepMap = (v: number, max: number) => Math.min(max - 0.8, Math.max(0.8, v));

/**
 * Bước từ (ox, oz) tới chỗ mới của `p` (thân bán kính `r`): chạm vật cản thì đẩy ra theo pháp tuyến (người trượt dọc
 * mép vật cản tròn), rồi giữ trong map.
 */
export function truotCan(b: DaBoCuc, r: number, p: Diem): void {
  for (let k = 0; k < 3; k++) {
    const c = chamCan(b, p.x, p.z, r);
    if (!c) break;
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d = len(dx, dz) || 1e-6;
    const need = c.r + r + 1e-3;
    p.x = c.x + (dx / d) * need;
    p.z = c.z + (dz / d) * need;
  }
  p.x = kepMap(p.x, DA_KHUNG.w);
  p.z = kepMap(p.z, DA_KHUNG.d);
}

// ---------- Tìm đường trên lưới ô 1 ----------

/** Ô có tâm cách vật cản chừng này thì coi như chặn (chừa chỗ cho thân to nhất). */
const CHAN = 0.5;
const luoiCache = new Map<DaMapId, Uint8Array>();

/** Lưới chặn của map: 1 là ô bị chặn. */
export function luoi(b: DaBoCuc): Uint8Array {
  let g = luoiCache.get(b.id);
  if (g) return g;
  const W = DA_KHUNG.w;
  const D = DA_KHUNG.d;
  g = new Uint8Array(W * D);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (sdCan(b, x + 0.5, z + 0.5) < CHAN) g[z * W + x] = 1;
  luoiCache.set(b.id, g);
  return g;
}

/** Đường thẳng từ a tới b không chạm vật cản (thân bán kính `r`). */
export function thongDuong(b: DaBoCuc, a: Diem, c: Diem, r: number): boolean {
  for (const v of b.can) if (segDist(v.x, v.z, a, c) < v.r + r) return false;
  return true;
}

/**
 * Đường từ `a` tới `c` qua lưới ô 1 (A* tám hướng), rút gọn thành các điểm rẽ (bỏ điểm giữa khi đường thẳng thông).
 * Không có đường thì null. Đường thẳng đã thông thì chỉ có điểm đích.
 */
export function timDuong(b: DaBoCuc, a: Diem, c: Diem, r = 0.45): Diem[] | null {
  if (thongDuong(b, a, c, r)) return [{ x: c.x, z: c.z }];
  const W = DA_KHUNG.w;
  const D = DA_KHUNG.d;
  const g = luoi(b);
  const cell = (p: Diem) => Math.min(D - 1, Math.max(0, Math.floor(p.z))) * W + Math.min(W - 1, Math.max(0, Math.floor(p.x)));
  let start = cell(a);
  let goal = cell(c);
  // Đích hay chỗ đứng rơi vào ô chặn: lấy ô trống gần nhất.
  const thoat = (i: number): number => {
    if (!g[i]) return i;
    const x0 = i % W;
    const z0 = Math.floor(i / W);
    for (let rr = 1; rr < 6; rr++)
      for (let dz = -rr; dz <= rr; dz++)
        for (let dx = -rr; dx <= rr; dx++) {
          const x = x0 + dx;
          const z = z0 + dz;
          if (x >= 0 && z >= 0 && x < W && z < D && !g[z * W + x]) return z * W + x;
        }
    return i;
  };
  start = thoat(start);
  goal = thoat(goal);
  const N = W * D;
  const gs = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const shut = new Uint8Array(N);
  const open: number[] = [start];
  const fs = new Float32Array(N).fill(Infinity);
  const h = (i: number) => len((i % W) - (goal % W), Math.floor(i / W) - Math.floor(goal / W));
  gs[start] = 0;
  fs[start] = h(start);
  let found = false;
  for (let guard = 0; open.length && guard < N; guard++) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (fs[open[k]] < fs[open[bi]]) bi = k;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (cur === goal) {
      found = true;
      break;
    }
    if (shut[cur]) continue;
    shut[cur] = 1;
    const cx = cur % W;
    const cz = Math.floor(cur / W);
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || z < 0 || x >= W || z >= D) continue;
        const n = z * W + x;
        if (g[n] || shut[n]) continue;
        // Đi chéo không lách qua góc hai ô chặn.
        if (dx && dz && (g[cz * W + x] || g[z * W + cx])) continue;
        const ng = gs[cur] + (dx && dz ? 1.4142 : 1);
        if (ng >= gs[n]) continue;
        gs[n] = ng;
        fs[n] = ng + h(n);
        came[n] = cur;
        open.push(n);
      }
  }
  if (!found) return null;
  const cells: Diem[] = [];
  for (let i = goal; i !== -1 && i !== start; i = came[i]) cells.push({ x: (i % W) + 0.5, z: Math.floor(i / W) + 0.5 });
  cells.reverse();
  cells[cells.length - 1] = { x: c.x, z: c.z };
  // Rút gọn: từ mỗi điểm nhảy tới điểm xa nhất còn thấy thẳng.
  const out: Diem[] = [];
  let from: Diem = a;
  let k = 0;
  while (k < cells.length) {
    let far = k;
    for (let j = cells.length - 1; j > k; j--) {
      if (thongDuong(b, from, cells[j], r)) {
        far = j;
        break;
      }
    }
    out.push(cells[far]);
    from = cells[far];
    k = far + 1;
  }
  return out;
}

/** Khu (0–4) mà (x, z) đang đứng trong (nới thêm `them` ô), không có thì −1. */
export function khuTai(b: DaBoCuc, x: number, z: number, them = 0): number {
  for (let i = 0; i < b.khu.length; i++) if (len(x - b.khu[i].x, z - b.khu[i].z) <= b.khu[i].r + them) return i;
  return -1;
}
