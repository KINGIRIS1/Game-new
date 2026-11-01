// Kho thóc 3×3: vựa chính góc sau bên trái, vựa phụ và cót quây ba phía quanh sân phơi thóc ở trước bên phải.
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5, BRICK, bird, boatRoof, granary, roofFor } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, partScale, yard } from './chung';

export const KHO_LOT = new Lot(3, [
  'VVV444',
  'VVV444',
  'VVV...',
  '.T.sss',
  '66.sss',
  '66,sss',
]);

/** Sân phơi đất nện vôi, sáng hơn sân. */
const DRY_YARD = 0xe2cb98;

/** Người giữ kho đi qua lại trên dải sân giữa vựa phụ và sân phơi. */
export function khoSpots(): LotSpot[] {
  return [{ job: 'giuKho', x: 0.6, y: 0.06, z: -0.25, ry: 0, walk: 0.45 }];
}

/** Thúng thóc vun đầy. */
function basket(m: ToonModel, x: number, z: number): void {
  m.plain.cyl(0.13, 0.1, 0.18, C.thatch, x, 0.14, z, undefined, 8);
  m.plain.sphere(0.11, C.ripe, x, 0.23, z, [1, 0.5, 1], 6);
}

export function makeKho(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = KHO_LOT;
  const roof = roofFor(level);
  const up = above5(level);
  // Cấp 6–8: vựa trên cột cao thêm.
  const tall = 0.12 * up;

  yard(m, 3);
  // Lối vào: ba phiến đá kê từ mép trước vào sân.
  const path = L.zone(',');
  for (let i = 0; i < 3; i++) p.box(0.34, 0.04, 0.24, i % 2 ? C.rockDark : C.rock, path.x, 0.06, path.z + 0.12 - i * 0.34, [0, 0.15 * (i - 1), 0]);

  // Vựa chính góc sau bên trái trên nền đất đắp kè đá: to hơn vựa cũ chừng 15–30%; cấp 5 to nhất, có chóp đồng.
  const V = L.zone('V');
  const vx = V.x + 0.05;
  const vz = V.z + 0.05;
  const vs = 1.35 * partScale(level);
  const mound = 0.46 * vs;
  p.cyl(mound + 0.05, mound + 0.07, 0.06, C.rock, vx, 0.06, vz, undefined, 12);
  p.cyl(mound, mound + 0.02, 0.1, C.earthDark, vx, 0.09, vz, undefined, 12);
  granary(m, vx, vz, vs, level >= 5, roof, tall);
  const floorY = 0.8 * vs + tall;
  const rimZ = vz + 0.42 * vs;

  if (level >= 2) {
    // Thang tre dựa vào sàn vựa, thúng thóc dưới chân thang.
    const T = L.zone('T');
    const z0 = T.z + 0.05;
    const run = z0 - rimZ;
    const len = Math.hypot(run, floorY);
    const tilt = -Math.atan2(run, floorY);
    for (const sx of [-0.1, 0.1]) p.cyl(0.02, 0.02, len, C.bamboo, T.x + sx, floorY / 2, (z0 + rimZ) / 2, [tilt, 0, 0], 4);
    const rungs = 4 + up;
    for (let i = 1; i <= rungs; i++) {
      const t = i / (rungs + 1);
      p.box(0.22, 0.025, 0.035, C.bamboo, T.x, t * floorY, z0 - t * run);
    }
    basket(m, T.x - 0.42, T.z + 0.08);
    basket(m, T.x + 0.38, T.z + 0.05);
    if (level >= 3) basket(m, T.x - 0.4, T.z + 0.42);
  }
  if (level >= 3) {
    // Sân phơi thóc phía trước bên phải: thóc vàng trải đều, luống cào, cào gỗ, đống thóc, nia.
    // Cấp 7 lát gạch.
    const s = L.zone('s');
    const sx = s.x + 0.02;
    const sz = s.z + 0.02;
    if (level >= 7) {
      const n = 4;
      const t = 1.38 / n;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          p.box(t - 0.03, 0.05, t - 0.03, (i + j) % 2 ? BRICK : 0xc0704c, sx - 0.69 + t * (i + 0.5), 0.06, sz - 0.69 + t * (j + 0.5));
        }
      }
    } else p.box(1.38, 0.04, 1.38, DRY_YARD, sx, 0.06, sz);
    const top = level >= 7 ? 0.085 : 0.08;
    p.box(1.1, 0.03, 1.1, C.ripe, sx, top, sz);
    for (let i = 0; i < 4; i++) p.box(1.0, 0.02, 0.03, C.thatchDark, sx, top + 0.015, sz - 0.39 + i * 0.26);
    p.cone(0.24, 0.2, C.ripe, sx + 0.38, top + 0.1, sz - 0.38, undefined, 9);
    // Cào gỗ nằm trên thóc.
    p.cyl(0.014, 0.014, 0.75, C.woodDark, sx - 0.12, top + 0.04, sz + 0.12, [Math.PI / 2, 0, 0.7], 4);
    p.box(0.3, 0.04, 0.05, C.woodDark, sx - 0.36, top + 0.04, sz + 0.41, [0, -0.7, 0]);
    // Nia tre phơi thóc ở góc trước.
    p.cyl(0.22, 0.2, 0.03, C.bamboo, sx + 0.42, top + 0.02, sz + 0.42, undefined, 12);
    p.cyl(0.18, 0.18, 0.02, C.ripe, sx + 0.42, top + 0.04, sz + 0.42, undefined, 12);
  }
  if (level >= 4) {
    // Vựa phụ sau bên phải; cấp 8 thành kho sàn dài mái cong, chim đồng hai đầu nóc.
    const A = L.zone('4');
    if (level >= 8) {
      // Kho sàn: sáu cột, sàn ván, vách hoa văn kín, cửa và thang trước, mái thuyền cong vút.
      const hx = A.x + 0.1;
      const hz = A.z;
      const ph = 0.72;
      for (const dx of [-0.5, 0, 0.5]) for (const dz of [-0.28, 0.28]) p.cyl(0.045, 0.055, ph, C.woodDark, hx + dx, ph / 2, hz + dz, undefined, 6);
      p.box(1.2, 0.07, 0.72, C.wood, hx, ph, hz);
      m.band.box(1.0, 0.5, 0.56, C.woodLight, hx, ph + 0.28, hz);
      p.box(0.22, 0.34, 0.03, C.woodDark, hx - 0.2, ph + 0.2, hz + 0.29);
      for (let i = 0; i < 3; i++) p.box(0.2, 0.035, 0.08, C.woodDark, hx - 0.2, ph * (1 - (i + 1) / 4), hz + 0.4 + i * 0.09);
      const ry = ph + 0.78;
      boatRoof(m, roof, { length: 1.3, width: 0.92, lift: 0.45, drop: 0.32, thickness: 0.06 }, hx, ry, hz);
      bird(m, hx + 0.47, ry + 0.4, hz, 1, 0.42);
      bird(m, hx - 0.47, ry + 0.4, hz, -1, 0.42);
    } else granary(m, A.x + 0.07, A.z, 0.9, false, roof, tall * 0.6);
  }
  if (level >= 6) {
    // Cót thóc lớn trên vòng đá góc trước bên trái, thóc vun lên miệng cót; cấp 7, 8 cót cao thêm, thêm đai tre.
    const c = L.zone('6');
    const ch = 0.6 + 0.12 * (up - 1);
    const bands = 2 + up;
    p.cyl(0.42, 0.44, 0.08, C.rock, c.x, 0.08, c.z, undefined, 12);
    m.band.cyl(0.37, 0.39, ch, C.thatch, c.x, 0.12 + ch / 2, c.z, undefined, 12);
    for (let i = 0; i < bands; i++) p.cyl(0.395, 0.395, 0.035, C.bamboo, c.x, 0.22 + (i * (ch - 0.15)) / (bands - 1), c.z, undefined, 12);
    p.sphere(0.35, C.ripe, c.x, 0.12 + ch, c.z, [1, 0.4, 1], 10);
  }
  return m.group();
}

export const KHO: CongTrinh = { tiles: 3, make: makeKho, spots: khoSpots, view: { half: 3.2, lookY: 1.0, px: 56 } };
