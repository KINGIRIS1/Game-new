// Vườn đậu xanh, lá dong 3×3 (Hội Tết): khóm lá dong lớn góc sau bên trái, hai luống đậu dài chạy ngang móng, lối
// giữa hai luống cho người làm vườn; cấp 3 lều nhỏ mái tranh phơi nong đậu ở góc sau bên phải (giản lược kiểu 2,
// xem docs/thiet-ke.md mục Giản lược công trình). Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { DAU, DAU_POD, dongClump } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { type ShapeBuilder, saddleRoof } from '../shapes';
import { ToonModel, inkThin } from '../toon';
import { type CongTrinh, type LotSpot, yard } from './chung';

export const VUON_LOT = new Lot(3, [
  'DD.LLL',
  'DD.LLL',
  'dddddd',
  '......',
  'eeeeee',
  '..,,..',
]);

/** Người làm vườn: một người giữa hai luống đậu, một người cắt lá dong. */
export function vuonSpots(): LotSpot[] {
  const D = VUON_LOT.zone('D');
  return [
    { job: 'phuNu', x: -0.45, y: 0.06, z: 0.25, ry: 0.35 },
    { job: 'phuNu', x: D.x + D.w / 2 + 0.2, y: 0.06, z: D.z + 0.1, ry: -Math.PI / 2 },
  ];
}

/** Luống đậu xanh chạy ngang móng (trục x) ở `z`, dài `len`: đất vun, dải đậu xanh liền phía trên, cao dần theo cấp. */
function luongDau(p: ShapeBuilder, z: number, len: number, level: number): void {
  p.box(len, 0.1, 0.36, C.earthDark, 0, 0.1, z);
  const h = 0.1 + 0.05 * level;
  p.box(len - 0.12, h, 0.26, level % 2 ? DAU : 0x5f8a3a, 0, 0.15 + h / 2, z);
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

  // Khóm lá dong góc sau bên trái, to dần theo cấp.
  const D = L.zone('D');
  const big = 1.3 + 0.15 * (level - 1);
  dongClump(p, D.x - 0.15, D.z - 0.15, big);
  dongClump(p, D.x + 0.22, D.z + 0.22, 0.8 * big);

  // Hai luống đậu xanh chạy ngang móng, không viền mực.
  const d = L.zone('d');
  const e = L.zone('e');
  const n = new ToonModel(inkThin);
  luongDau(n.plain, d.z, 2.7, level);
  luongDau(n.plain, e.z, 2.7, level);

  // Lều phơi đậu mái tranh góc sau bên phải (cấp 3).
  if (level >= 3) {
    const Lz = L.zone('L');
    leuPhoi(m, Lz.x + 0.05, Lz.z - 0.05);
  }
  const g = m.group();
  for (const c of n.group().children.slice()) if ((c as THREE.Mesh).material !== inkThin) g.add(c);
  return g;
}

export const VUON: CongTrinh = { tiles: 3, make: makeVuon, spots: () => vuonSpots(), view: { half: 2.4, lookY: 0.6, px: 72 } };
