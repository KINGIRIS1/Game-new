// Kho thóc 3×3: một vựa to góc sau bên trái, sân phơi thóc trước bên phải, cót thóc thấp mái tranh góc sau bên phải
// từ cấp 5 (giản lược kiểu 2: một mái chính, xem docs/thiet-ke.md mục Giản lược công trình).
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5, BRICK, coneRoof, granary } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, MAI_TRANH, maiGon, partScale, yard } from './chung';

export const KHO_LOT = new Lot(3, [
  'VVVV66',
  'VVVV66',
  'VVVV..',
  'VVV.ss',
  '..,sss',
  '..,sss',
]);

/** Sân phơi đất nện vôi, sáng hơn sân. */
const DRY_YARD = 0xe2cb98;
/** Tâm vựa chính. */
const VX = -0.4;
const VZ = -0.4;

/** Người giữ kho đi qua lại trên dải sân giữa vựa và cót. */
export function khoSpots(): LotSpot[] {
  return [{ job: 'giuKho', x: 0.6, y: 0.06, z: -0.2, ry: 0, walk: 0.45 }];
}

export function makeKho(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  // Mái theo cấp, bỏ dải đồng hoa văn cấp 9; chim Lạc cấp 10 giữ.
  const roof = maiGon(level);
  const up = above5(level);
  // Cấp 6–8: vựa trên cột cao thêm.
  const tall = 0.12 * up;

  yard(m, 3);
  const path = KHO_LOT.zone(',');
  p.box(0.4, 0.03, path.d - 0.05, C.earth, path.x, 0.055, path.z - 0.025);

  // Vựa chính trên nền đá, to dần tới cấp 5 (chóp đồng); cấp 9 trở lên mái hai tầng, chim Lạc (cấp 10) trên tầng trên.
  const vs = 1.65 * partScale(level);
  p.cyl(0.5 * vs, 0.53 * vs, 0.1, C.rock, VX, 0.06, VZ, undefined, 12);
  granary(m, VX, VZ, vs, level >= 5, level >= 9 ? { ...roof, lac: false } : roof, tall);
  if (level >= 9) {
    const neck = 0.8 * vs + tall + 1.0 * vs;
    m.band.cyl(0.17 * vs, 0.2 * vs, 0.2 * vs, C.woodLight, VX, neck + 0.1 * vs, VZ, undefined, 10);
    coneRoof(m, roof, 0.36 * vs, 0.42 * vs, VX, neck + 0.2 * vs + 0.19 * vs, VZ, 12);
  }
  // Sân phơi thóc trước bên phải: thóc vàng trải đều; cấp 7 lát gạch.
  if (level >= 2) {
    const w = 1.3;
    p.box(w, 0.04, w, level >= 7 ? BRICK : DRY_YARD, 0.7, 0.06, 0.7);
    p.box(w - 0.24, 0.03, w - 0.24, C.ripe, 0.7, 0.085, 0.7);
  }
  // Cót thóc thấp mái tranh góc sau bên phải, cao dần ở cấp 6–8.
  if (level >= 5) {
    const cx = 0.95;
    const cz = -0.95;
    const ch = 0.5 + 0.08 * up;
    p.cyl(0.4, 0.42, 0.08, C.rock, cx, 0.08, cz, undefined, 12);
    m.band.cyl(0.35, 0.37, ch, C.thatch, cx, 0.12 + ch / 2, cz, undefined, 12);
    coneRoof(m, MAI_TRANH, 0.46, 0.32, cx, 0.12 + ch + 0.14, cz, 10);
  }
  return m.group();
}

export const KHO: CongTrinh = { tiles: 3, make: makeKho, spots: khoSpots, view: { half: 3.2, lookY: 1.0, px: 56 } };
