// Bãi đất đá 3×3: hố đá bậc thang góc sau bên trái, lán chứa đá mái theo cấp góc sau bên phải, một chồng đá xẻ to
// trước bên phải, đường xe đá ra mặt trước (giản lược kiểu 2: một mái chính, xem docs/thiet-ke.md mục Giản lược
// công trình). Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5, boatRoof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, maiGon, yard } from './chung';

export const BAI_DA_LOT = new Lot(3, [
  'PPPPTT',
  'PPPPTT',
  'PPPPTT',
  '....XX',
  '....XX',
  '..,,..',
]);

/** Sân đất nện lẫn bụi đá: sẫm hơn sân thường để đá xẻ sáng màu nổi lên. */
const DUST = 0xb89a6c;
/** Đường xe đá: đất nện sẫm hơn sân. */
const ROAD = 0xa4855a;
/** Mặt đá mới xẻ: sáng hơn đá tảng. */
const CUT = 0xcdc2ad;

/** Hố đá: mép trái, mép sau (gò), mép phải và mép trước của khối P; đáy hố nằm trong. */
const PIT = { x0: -1.47, x1: 0.47, z0: -1.47, z1: -0.02, floorX0: -1.0, floorX1: 0.3, floorZ0: -1.0, floorZ1: -0.2 };
/** Bậc đá thứ k (từ dưới lên) hình chữ L ôm góc sau bên trái: dải sau tới `xR`, sâu tới `zB`; dải trái rộng tới `xL`, dài tới `zF`. */
const TIERS = [
  { xR: 0.47, zB: -1.0, xL: -1.0, zF: -0.02 },
  { xR: 0.05, zB: -1.2, xL: -1.2, zF: -0.42 },
  { xR: -0.35, zB: -1.32, xL: -1.32, zF: -0.8 },
];

/** Năm thợ đá: hai người dưới đáy hố, một bên trái bãi, một cạnh chồng đá, một giữa bãi. Mỗi người một cột x − z khác nhau. */
export function baiDaSpots(): LotSpot[] {
  return [
    { job: 'thoDa', x: -0.55, y: 0.06, z: -0.45, ry: 0.7 },
    { job: 'thoDa', x: -1.1, y: 0.06, z: 0.38, ry: 0.9 },
    { job: 'thoDa', x: 0.55, y: 0.06, z: 0.3, ry: 1.57 },
    { job: 'thoDa', x: -0.25, y: 0.06, z: 0.75, ry: 0.4 },
    { job: 'thoDa', x: 0.12, y: 0.06, z: -0.62, ry: 0.3 },
  ];
}

export function makeBaiDa(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  // Mái theo cấp, bỏ dải đồng hoa văn cấp 9; chim Lạc cấp 10 giữ.
  const roof = maiGon(level);
  const up = above5(level);

  yard(m, 3, DUST);

  // Hố đá lộ thiên khoét vào gò: ba bậc đá chữ L ôm góc sau bên trái, đáy hố sẫm, mép hố; cấp 6–8 bậc cao dần.
  const th = 0.22 + 0.06 * up;
  const rim = 0.26;
  const { x0, z0, floorX0, floorX1, floorZ0, floorZ1 } = PIT;
  for (let k = 0; k < TIERS.length; k++) {
    const t = TIERS[k];
    const top = th * (k + 1);
    const color = k % 2 ? CUT : C.rock;
    p.box(t.xR - x0, top, t.zB - z0, color, (x0 + t.xR) / 2, top / 2, (z0 + t.zB) / 2);
    p.box(t.xL - x0, top, t.zF - t.zB, color, (x0 + t.xL) / 2, top / 2, (t.zB + t.zF) / 2);
  }
  p.box(floorX1 - floorX0, 0.03, floorZ1 - floorZ0, 0x5e544a, (floorX0 + floorX1) / 2, 0.04, (floorZ0 + floorZ1) / 2);
  p.box(PIT.x1 - floorX0, rim, PIT.z1 - floorZ1, C.rock, (floorX0 + PIT.x1) / 2, rim / 2, (floorZ1 + PIT.z1) / 2);
  p.box(PIT.x1 - floorX1, rim, floorZ1 - floorZ0, C.rock, (floorX1 + PIT.x1) / 2, rim / 2, (floorZ0 + floorZ1) / 2);

  // Đường xe đá từ bãi ra mặt trước.
  const road = BAI_DA_LOT.zone(',');
  p.box(0.8, 0.02, 1.0, ROAD, road.x, 0.055, 0.95);

  // Một chồng đá xẻ to trước bên phải, cao dần theo cấp.
  const X = BAI_DA_LOT.zone('X');
  const n = Math.floor(1 + Math.min(level, 5) / 2.5 + up);
  const w = 0.42;
  for (let i = 0; i < n; i++) p.box(w, w * 0.6, w * 0.85, i % 2 ? C.rock : CUT, X.x + 0.05, 0.05 + w * 0.3 + i * w * 0.6, X.z);

  // Lán chứa đá bốn cột mái thuyền góc sau bên phải từ cấp 3, to dần, cao dần ở cấp 6–8.
  if (level >= 3) {
    const T = BAI_DA_LOT.zone('T');
    const k = 0.85 + 0.05 * Math.min(level, 5);
    const lw = 0.55 * k;
    const ld = 0.62 * k;
    const h = 0.75 + 0.08 * up;
    for (const dx of [-lw / 2, lw / 2]) for (const dz of [-ld / 2, ld / 2]) p.cyl(0.045, 0.052, h, C.woodDark, T.x + dx, h / 2, T.z + dz, undefined, 5);
    boatRoof(m, roof, { length: lw + 0.3, width: ld + 0.24, lift: 0.14, drop: 0.18, thickness: 0.05 }, T.x, h + 0.2, T.z);
    // Khối đá xẻ chất dưới lán.
    p.box(0.3, 0.2, 0.26, CUT, T.x, 0.15, T.z);
  }
  return m.group();
}

export const BAI_DA: CongTrinh = { tiles: 3, make: makeBaiDa, spots: baiDaSpots, view: { half: 2.9, lookY: 0.9, px: 64 } };
