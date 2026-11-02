// Vườn đậu xanh, lá dong 3×3 (Hội Tết): khóm lá dong lớn góc sau bên trái, hai luống đậu dài chạy ngang móng, lối
// giữa hai luống cho người làm vườn; cấp 2 có giàn tre cho đậu leo và chum nước tưới, cấp 3 có lều nhỏ phơi nong đậu ở
// góc sau bên phải và rào tre quanh vườn. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { DAU, DAU_POD, bambooFence, dongClump } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { saddleRoof } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, rod, yard } from './chung';

export const VUON_LOT = new Lot(3, [
  'DD.LLL',
  'DD.LLL',
  'dddddd',
  '......',
  'eeeeee',
  'J.,,..',
]);

/** Nửa cạnh rào tre quanh vườn (cấp 3): sát mép móng mà không chìa ra ngoài. */
const RAO = 1.42;

/** Người làm vườn: một người giữa hai luống đậu, một người cắt lá dong. */
export function vuonSpots(): LotSpot[] {
  const D = VUON_LOT.zone('D');
  return [
    { job: 'phuNu', x: -0.45, y: 0.06, z: 0.25, ry: 0.35 },
    { job: 'phuNu', x: D.x + D.w / 2 + 0.2, y: 0.06, z: D.z + 0.1, ry: -Math.PI / 2 },
  ];
}

/**
 * Luống đậu xanh chạy ngang móng (trục x) ở `z`, dài `len`: đất vun, bụi đậu thấp có quả dài (cỡ như dáng cũ). Cấp 2:
 * giàn tre chữ A cho đậu leo, nóc tre chạy dọc luống, dây đậu quấn cột.
 */
function luongDau(m: ToonModel, z: number, len: number, level: number): void {
  const p = m.plain;
  p.box(len, 0.1, 0.36, C.earthDark, 0, 0.1, z);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + 0.16 + (i * (len - 0.32)) / (n - 1);
    p.sphere(0.12, DAU, x, 0.24, z, [1, 0.7, 1], 8);
    p.capsule(0.016, 0.09, DAU_POD, x + 0.08, 0.22, z + 0.07, [0, 0, 1.2]);
    p.capsule(0.016, 0.09, DAU_POD, x - 0.07, 0.21, z - 0.05, [0, 0, -1.1]);
  }
  if (level < 2) return;
  // Giàn chữ A: mỗi cặp cột tre cắm hai bên luống, chụm đầu trên nóc; dây đậu xanh leo theo cột.
  const top = 0.95;
  const pairs = 5;
  for (let i = 0; i < pairs; i++) {
    const x = -len / 2 + 0.2 + (i * (len - 0.4)) / (pairs - 1);
    for (const s of [-1, 1]) {
      rod(p, [x, 0.12, z + s * 0.2], [x, top + 0.08, z - s * 0.03], 0.018, C.bamboo);
      for (let k = 0; k < 3; k++) p.sphere(0.055, k % 2 ? DAU_POD : DAU, x, 0.34 + k * 0.2, z + s * (0.15 - k * 0.05), [1, 1, 1], 6);
    }
  }
  p.cyl(0.018, 0.018, len - 0.3, C.bamboo, 0, top, z, [0, 0, Math.PI / 2], 4);
  // Đậu leo tới nóc giàn, xòe lá dọc nóc.
  for (let k = 0; k < 9; k++) p.sphere(0.07, k % 2 ? DAU : DAU_POD, -len / 2 + 0.3 + k * ((len - 0.6) / 8), top + 0.02, z + ((k % 3) - 1) * 0.06, [1.4, 0.5, 1], 6);
}

/** Lều nhỏ phơi đậu (cấp 3): bốn cột, mái tranh hai mái, giá tre với hai nong đậu xanh phơi, thúng đậu dưới đất. */
function leuPhoi(m: ToonModel, x: number, z: number): void {
  const p = m.plain;
  const w = 1.0;
  const d = 0.66;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.cyl(0.028, 0.034, 0.82, C.woodDark, x + (sx * w) / 2, 0.41, z + (sz * d) / 2, undefined, 5);
  m.band.add(saddleRoof({ length: w + 0.3, width: d + 0.3, lift: 0.12, drop: 0.22, thickness: 0.04 }), C.thatch, x, 1.02, z);
  // Giá tre ngang tầm hông, hai nong đậu tròn.
  p.box(w - 0.1, 0.03, d - 0.16, C.bamboo, x, 0.3, z);
  for (const dx of [-0.24, 0.24]) {
    p.cyl(0.2, 0.2, 0.03, C.thatch, x + dx, 0.33, z, undefined, 14);
    p.cyl(0.17, 0.17, 0.02, DAU_POD, x + dx, 0.35, z, undefined, 14);
  }
  // Thúng đậu dưới đất trước lều.
  p.cyl(0.1, 0.07, 0.14, C.thatchDark, x - w / 2 + 0.05, 0.12, z + d / 2 + 0.16, undefined, 10);
  p.cyl(0.09, 0.09, 0.02, DAU, x - w / 2 + 0.05, 0.19, z + d / 2 + 0.16, undefined, 10);
}

export function makeVuon(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = VUON_LOT;
  yard(m, 3, C.soil);
  // Lối vào ở mặt trước nối tới lối giữa hai luống.
  const path = L.zone(',');
  p.box(path.w * 0.8, 0.03, path.d + 0.5, C.earth, path.x, 0.055, path.z - 0.25);
  p.box(2.7, 0.025, 0.42, C.earth, 0, 0.055, 0.25);

  // Khóm lá dong góc sau bên trái, cấp 2 to hơn và thêm một khóm.
  const D = L.zone('D');
  // Khóm lá dong lớn: lá to hơn khóm ở dáng cũ, lấp đầy khối `D`.
  const big = level >= 2 ? 1.5 : 1.3;
  dongClump(p, D.x - 0.2, D.z - 0.2, big);
  dongClump(p, D.x + 0.24, D.z - 0.08, 0.85 * big);
  dongClump(p, D.x - 0.18, D.z + 0.26, 0.8 * big);
  if (level >= 2) dongClump(p, D.x + 0.26, D.z + 0.3, 1.0);

  // Hai luống đậu xanh chạy ngang móng.
  const d = L.zone('d');
  const e = L.zone('e');
  luongDau(m, d.z, 2.7, level);
  luongDau(m, e.z, 2.7, level);

  if (level >= 2) {
    // Chum nước tưới góc trước bên trái, gáo dừa gác miệng chum.
    const J = L.zone('J');
    p.sphere(0.17, 0x8a5a3a, J.x, 0.24, J.z, [1, 1.1, 1], 10);
    p.cyl(0.11, 0.13, 0.06, 0x7a4a2e, J.x, 0.43, J.z, undefined, 10);
    p.cyl(0.1, 0.1, 0.01, C.paddyWater, J.x, 0.46, J.z, undefined, 10);
    rod(p, [J.x - 0.04, 0.47, J.z], [J.x + 0.22, 0.52, J.z + 0.06], 0.012, C.woodDark);
    p.sphere(0.05, C.woodDark, J.x - 0.06, 0.48, J.z, [1, 0.6, 1], 6);
  }
  if (level >= 3) {
    const Lz = L.zone('L');
    leuPhoi(m, Lz.x + 0.05, Lz.z - 0.05);
    // Rào tre quanh vườn, cổng ở lối vào.
    bambooFence(p, RAO, 0.42, path.x - path.w / 2 - 0.02, path.x + path.w / 2 + 0.02);
  }
  return m.group();
}

export const VUON: CongTrinh = { tiles: 3, make: makeVuon, spots: () => vuonSpots(), view: { half: 2.4, lookY: 0.6, px: 72 } };
