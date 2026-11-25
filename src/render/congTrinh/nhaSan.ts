// Nhà sàn 3×3: một nhà sàn to lùi về sau bên trái, cây cau góc sau bên phải, sân trước để trống (giản lược kiểu 2:
// một mái chính, xem docs/thiet-ke.md mục Giản lược công trình). Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5, arecaPalm, bird, domeHouse, stiltHall } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel, inkThin } from '../toon';
import { type CongTrinh, type LotSpot, maiGon, partScale, yard } from './chung';

export const NHA_SAN_LOT = new Lot(3, [
  'HHHHHQ',
  'HHHHH.',
  'HHHHH.',
  'HHHHH.',
  '..E...',
  '..,...',
]);

/** Tâm nhà chính. */
const HX = -0.25;
const HZ = -0.3;

/** Hai người ở sân trước: một bên phải thang, một góc trước bên trái. */
export function nhaSanSpots(): LotSpot[] {
  return [
    { job: 'phuNu', x: 0.75, z: 0.75, y: 0.05, ry: 0.5 },
    { job: 'phuNu', x: -1.05, z: 1.05, y: 0.05, ry: -0.7 },
  ];
}

export function makeNhaSan(level: number): THREE.Group {
  const m = new ToonModel();
  // Vật nhỏ (bậc thang, cây cau) viền mảnh.
  const n = new ToonModel(inkThin);
  const p = m.plain;
  // Mái theo cấp, bỏ dải đồng hoa văn cấp 9; chim Lạc cấp 10 giữ.
  const roof = maiGon(level);
  const up = above5(level);
  const s = partScale(level);
  // Cấp 6–8: cột nhà sàn cao thêm.
  const tall = 0.1 * up;

  yard(m, 3);
  const path = NHA_SAN_LOT.zone(',');
  p.box(0.6, 0.03, path.d + 0.5, C.earth, HX, 0.055, path.z - 0.25);

  // Cấp 1–6 nhà mái tròn hình mai rùa, to dần tới cấp 5; cấp 7 thành nhà sàn dài mái thuyền, cấp 8 mái vút cao hai đầu.
  let frontZ: number;
  let floorY: number;
  if (level <= 6) {
    const S = 1.75 * s;
    domeHouse(m, HX, HZ, S, roof, tall);
    frontZ = HZ + 0.425 * S;
    floorY = 0.55 * S + tall;
    if (level === 5) bird(m, HX + 0.1, floorY + 0.9 * S, HZ + 0.05, 1, 0.7);
  } else {
    const lift = level >= 8 ? 0.8 : 0.5;
    stiltHall(m, { x: HX, z: HZ, w: 1.95, d: 1.25, postH: 0.74 + tall, roofL: 2.45, roofW: 1.55, lift, roof });
    if (level >= 8 && !roof.lac) {
      const top = 0.74 + tall + 0.68 + 1.55 * 0.4 + lift;
      bird(m, HX + 1.18, top, HZ, 1, 0.7);
      bird(m, HX - 1.18, top, HZ, -1, 0.7);
    }
    frontZ = HZ + 0.625;
    floorY = 0.74 + tall;
  }
  if (level >= 2) {
    // Hiên trước, thang gỗ xuống sân.
    p.box(1.0, 0.06, 0.34, C.wood, HX, floorY, frontZ + 0.15);
    const steps = 3 + up;
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / (steps + 1);
      n.plain.box(0.36, 0.05, 0.12, C.woodDark, HX, floorY - t * (floorY - 0.06), frontZ + 0.34 + t * 0.34);
    }
  }
  // Cây cau góc sau bên phải, cao dần theo cấp.
  if (level >= 4) arecaPalm(n.plain, 1.1, -1.08, 1.7 + 0.12 * (Math.min(level, 5) - 4) + 0.25 * up);
  const g = m.group();
  for (const c of n.group().children.slice()) g.add(c);
  return g;
}

export const NHA_SAN: CongTrinh = { tiles: 3, make: makeNhaSan, spots: nhaSanSpots, view: { half: 3.2, lookY: 1.0, px: 64 } };
