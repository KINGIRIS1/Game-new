// Nhà thợ hồ 3×3: lán thợ góc sau bên trái, chồng gạch mộc và đống đất sét phía sau; sân đóng gạch ở giữa bên phải,
// hố nhào đất bên trái; phía trước là đoạn tường đất nện dựng dở trong khuôn ván, cọc dây căng mốc và lò nung ngói.
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5, birdSpread, boatRoof, roofFor, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import type { ShapeBuilder } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, rod, yard } from './chung';

export const THO_HO_LOT = new Lot(3, [
  'LLLGGD',
  'LLLGGD',
  'SS,NNN',
  'SS,NNN',
  'KK,,CC',
  'KK,,TT',
]);

/** Sân thợ hồ: đất sét nện, đỏ nâu hơn sân thường. */
const CLAY_YARD = 0xc9a271;
/** Lối đất nện vào sân. */
const PATH = 0xb8955f;
/** Gạch mộc phơi khô: vàng đất. */
const BRICK = 0xc8955a;
/** Gạch mộc mới đóng, còn ướt: sẫm hơn. */
const BRICK_WET = 0xa4703f;
/** Gạch, ngói đã nung: đỏ sẫm. */
const FIRED = 0xa4472c;
/** Đất sét nhào: nâu đỏ. */
const CLAY = 0x9c6a43;
/** Nước trong hố nhào đất. */
const MUD_WATER = 0x8a7a5a;

/**
 * Chỗ đứng theo thứ tự có người: thợ đóng gạch ở sân, thợ cả đứng dưới lán, người giẫm đất trong hố nhào (cấp 2),
 * thợ nện tường bên khuôn ván (cấp 3).
 */
export function thoHoSpots(level: number): LotSpot[] {
  const N = THO_HO_LOT.zone('N');
  const K = THO_HO_LOT.zone('K');
  const S = THO_HO_LOT.zone('S');
  const L = THO_HO_LOT.zone('L');
  const out: LotSpot[] = [
    { job: 'thoDa', x: N.x - 0.5, y: 0.06, z: N.z + 0.32, ry: 2.6 },
    { job: 'thoMoc', x: L.x + 0.3, y: 0.06, z: L.z + 0.28, ry: 0.3 },
  ];
  if (level >= 2) out.push({ job: 'nong', x: S.x, y: 0.06, z: S.z, ry: 0.4 });
  if (level >= 3) out.push({ job: 'thoDa', x: K.x + 0.12, y: 0.06, z: K.z + 0.24, ry: Math.PI - 0.6 });
  return out;
}

/**
 * Lán thợ: bốn cột, mái thuyền theo cấp, vách phên sau treo vồ, bay, thước; bàn kê bản vẽ. Cấp 6 cột hiên quấn đai
 * đồng; cấp 6–8 cột cao dần; cấp 10 chim Lạc trên đầu hai cột trước.
 */
function shed(m: ToonModel, level: number, roof: Roof): void {
  const p = m.plain;
  const L = THO_HO_LOT.zone('L');
  const h = 0.9 + 0.1 * above5(level);
  const x0 = L.x - L.w / 2 + 0.16;
  const x1 = L.x + L.w / 2 - 0.16;
  const zb = L.z - L.d / 2 + 0.14;
  const zf = L.z + L.d / 2 - 0.12;
  for (const x of [x0, x1]) {
    p.cyl(0.04, 0.05, h, C.woodDark, x, h / 2, zb, undefined, 6);
    if (level >= 6) {
      m.band.cyl(0.065, 0.075, h, C.wood, x, h / 2, zf, undefined, 8);
      p.cyl(0.1, 0.11, 0.08, C.rock, x, 0.04, zf, undefined, 8);
      for (const y of [0.3, h - 0.18]) p.cyl(0.078, 0.078, 0.05, C.bronze, x, y, zf, undefined, 8);
    } else {
      p.cyl(0.04, 0.05, h, C.woodDark, x, h / 2, zf, undefined, 6);
    }
    if (level >= 10) birdSpread(m, x, h + 0.02, zf, 0.26);
  }
  for (const z of [zb, zf]) p.box(x1 - x0 + 0.1, 0.06, 0.06, C.wood, (x0 + x1) / 2, h, z);
  boatRoof(m, roof, { length: L.w + 0.12, width: L.d + 0.2, lift: 0.2, drop: 0.3, thickness: 0.05 }, L.x, h + 0.32, L.z);
  // Vách phên sau, giá treo vồ nện, bay, thước tre.
  p.box(x1 - x0, h * 0.7, 0.03, C.thatchDark, (x0 + x1) / 2, h * 0.35 + 0.05, zb - 0.02);
  p.box(0.9, 0.035, 0.035, C.woodDark, L.x, h * 0.62, zb + 0.03);
  p.box(0.05, 0.3, 0.05, C.wood, L.x - 0.32, h * 0.47, zb + 0.06);
  p.box(0.16, 0.12, 0.12, C.woodDark, L.x - 0.32, h * 0.34, zb + 0.06);
  p.box(0.14, 0.02, 0.1, C.iron, L.x - 0.05, h * 0.5, zb + 0.05);
  p.box(0.025, 0.14, 0.025, C.woodDark, L.x - 0.05, h * 0.58, zb + 0.05);
  p.box(0.02, 0.36, 0.02, C.bamboo, L.x + 0.22, h * 0.45, zb + 0.05);
  // Bàn kê tấm ván vẽ mốc nhà, mấy viên gạch mẫu.
  const bz = L.z + 0.02;
  for (const dx of [-0.34, 0.34]) for (const dz of [-0.11, 0.11]) p.box(0.04, 0.34, 0.04, C.woodDark, L.x + dx, 0.17, bz + dz);
  p.box(0.8, 0.05, 0.3, C.wood, L.x, 0.36, bz);
  p.box(0.4, 0.015, 0.2, C.cream, L.x - 0.12, 0.395, bz);
  for (let i = 0; i < 3; i++) p.box(0.04, 0.012, 0.012, C.ink, L.x - 0.2 + i * 0.07, 0.405, bz - 0.04 + i * 0.03);
  for (let i = 0; i < 2; i++) p.box(0.14, 0.06, 0.08, i ? FIRED : BRICK, L.x + 0.24, 0.415 + i * 0.06, bz);
}

/** Một viên gạch nằm (dài theo x hay z). */
function brick(p: ShapeBuilder, x: number, y: number, z: number, alongZ: boolean, color: number): void {
  if (alongZ) p.box(0.09, 0.06, 0.17, color, x, y, z);
  else p.box(0.17, 0.06, 0.09, color, x, y, z);
}

/** Chồng gạch mộc xếp so le phơi khô sau sân: cấp 1 hai lớp, mỗi cấp thêm một lớp tới sáu. Cấp 9 thêm chồng gạch nung. */
function brickStack(p: ShapeBuilder, level: number): void {
  const G = THO_HO_LOT.zone('G');
  const layers = Math.min(1 + level, 6);
  for (let k = 0; k < layers; k++) {
    const alongZ = k % 2 === 1;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        const x = G.x - 0.3 + i * 0.2 + (alongZ ? 0.02 : 0);
        const z = G.z - 0.12 + j * 0.24;
        brick(p, x, 0.08 + k * 0.065, z, alongZ, level >= 9 && k >= layers - 2 ? FIRED : BRICK);
      }
    }
  }
  // Tấm ván che mưa gác trên chồng gạch.
  p.box(0.86, 0.025, 0.56, C.woodLight, G.x, 0.11 + layers * 0.065, G.z, [0, 0, 0.05]);
}

/** Đống đất sét góc sau bên phải, thuổng cắm, sọt đất. */
function clayHeap(p: ShapeBuilder): void {
  const D = THO_HO_LOT.zone('D');
  p.cone(0.24, 0.32, CLAY, D.x, 0.16, D.z - 0.08, undefined, 8);
  p.cone(0.16, 0.2, C.earthDark, D.x + 0.04, 0.1, D.z + 0.22, undefined, 7);
  rod(p, [D.x - 0.04, 0.12, D.z - 0.04], [D.x + 0.06, 0.62, D.z - 0.14], 0.016, C.woodDark, 4);
  p.box(0.09, 0.12, 0.015, C.iron, D.x - 0.05, 0.12, D.z - 0.03, [0.2, 0, 0.2]);
  p.cyl(0.1, 0.08, 0.12, C.thatchDark, D.x - 0.04, 0.06, D.z + 0.38, undefined, 7);
}

/**
 * Sân đóng gạch: hàng gạch mộc mới đóng phơi trên sân (cấp 1 hai hàng, thêm một hàng mỗi cấp tới năm), khuôn gỗ đóng
 * gạch và đống đất nhào bên cạnh.
 */
function moldingYard(p: ShapeBuilder, level: number): void {
  const N = THO_HO_LOT.zone('N');
  const rows = Math.min(1 + level, 5);
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < 5; i++) brick(p, N.x - 0.15 + i * 0.2, 0.08, N.z - 0.36 + r * 0.17, false, r < 2 ? BRICK : BRICK_WET);
  }
  // Khuôn gỗ hai ngăn trên tấm ván, cục đất nhào cạnh khuôn.
  const mx = N.x - 0.42;
  const mz = N.z - 0.16;
  p.box(0.3, 0.02, 0.26, C.woodLight, mx, 0.065, mz);
  for (const dz of [-0.1, 0, 0.1]) p.box(0.24, 0.05, 0.02, C.woodDark, mx, 0.1, mz + dz);
  for (const dx of [-0.11, 0.11]) p.box(0.02, 0.05, 0.22, C.woodDark, mx + dx, 0.1, mz);
  p.box(0.2, 0.04, 0.07, BRICK_WET, mx, 0.09, mz - 0.05);
  p.sphere(0.1, CLAY, mx - 0.02, 0.08, mz + 0.26, [1.2, 0.6, 1], 7);
}

/** Hố nhào đất (cấp 2): bờ đất vuông, lòng đất sét lẫn nước và rơm, chum nước cạnh bờ. */
function mixingPit(p: ShapeBuilder): void {
  const S = THO_HO_LOT.zone('S');
  const hw = S.w / 2 - 0.12;
  const hd = S.d / 2 - 0.12;
  for (const s of [-1, 1]) {
    p.box(2 * hw + 0.1, 0.1, 0.08, C.earth, S.x, 0.08, S.z + s * hd);
    p.box(0.08, 0.1, 2 * hd, C.earth, S.x + s * hw, 0.08, S.z);
  }
  p.box(2 * hw - 0.04, 0.03, 2 * hd - 0.04, CLAY, S.x, 0.06, S.z);
  p.box(0.4, 0.012, 0.3, MUD_WATER, S.x - 0.12, 0.08, S.z + 0.1);
  for (const [dx, dz, ry] of [[-0.2, -0.2, 0.4], [0.15, -0.05, -0.6], [0.1, 0.25, 1.1]] as const) p.box(0.18, 0.01, 0.02, C.thatch, S.x + dx, 0.085, S.z + dz, [0, ry, 0]);
  p.cyl(0.11, 0.09, 0.22, C.earthDark, S.x + hw + 0.04, 0.11, S.z - hd - 0.02, undefined, 8);
  p.cyl(0.08, 0.08, 0.01, MUD_WATER, S.x + hw + 0.04, 0.225, S.z - hd - 0.02, undefined, 8);
}

/**
 * Đầm nện (cấp 3): đoạn tường đất nện dựng dở giữa hai tấm ván khuôn kẹp cọc, chày nện dựng bên; đất nện cao thêm
 * theo cấp tới cấp 8.
 */
function rammedWall(p: ShapeBuilder, level: number): void {
  const K = THO_HO_LOT.zone('K');
  const len = K.w - 0.24;
  const h = 0.22 + 0.05 * (Math.min(level, 8) - 3);
  // Phần tường đã nện xong, thấp hơn khuôn một chút, vạch lớp đất.
  p.box(len - 0.1, h, 0.26, C.earth, K.x, h / 2 + 0.05, K.z - 0.15);
  for (let i = 1; i * 0.09 < h; i++) p.box(len - 0.09, 0.012, 0.262, C.earthDark, K.x, 0.05 + i * 0.09, K.z - 0.15);
  // Hai tấm ván khuôn dọc hai mặt tường, cọc kẹp hai đầu.
  for (const s of [-1, 1]) p.box(len, 0.18, 0.025, C.woodLight, K.x, h + 0.09, K.z - 0.15 + s * 0.15);
  for (const dx of [-len / 2 + 0.04, len / 2 - 0.04]) {
    for (const s of [-1, 1]) p.box(0.04, h + 0.34, 0.04, C.woodDark, K.x + dx, (h + 0.34) / 2, K.z - 0.15 + s * 0.18);
  }
  // Chày nện dựng dựa cọc, sọt đất dưới chân.
  rod(p, [K.x + 0.5, 0.05, K.z + 0.2], [K.x + 0.42, 0.85, K.z + 0.08], 0.022, C.wood, 5);
  p.cyl(0.06, 0.07, 0.14, C.woodDark, K.x + 0.5, 0.1, K.z + 0.2, undefined, 6);
  p.cyl(0.1, 0.08, 0.12, C.thatchDark, K.x - 0.4, 0.06, K.z + 0.26, undefined, 7);
  p.cone(0.1, 0.06, C.earth, K.x - 0.4, 0.15, K.z + 0.26, undefined, 6);
}

/** Cọc dây căng mốc: bốn cọc tre buộc dây đỏ căng thành góc vuông trên nền đất vừa xới, quả dọi treo. */
function stringLine(p: ShapeBuilder): void {
  const Cz = THO_HO_LOT.zone('C');
  const x0 = Cz.x - 0.36;
  const x1 = Cz.x + 0.36;
  const z0 = Cz.z - 0.14;
  const z1 = Cz.z + 0.14;
  p.box(0.8, 0.02, 0.36, C.soil, Cz.x, 0.055, Cz.z);
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1]] as const) {
    p.cyl(0.02, 0.025, 0.36, C.bamboo, x, 0.18, z, undefined, 5);
    p.box(0.07, 0.05, 0.015, C.red, x + 0.04, 0.31, z, [0, 0, -0.3]);
  }
  rod(p, [x0, 0.28, z0], [x1, 0.28, z0], 0.006, C.red, 3);
  rod(p, [x0, 0.28, z0], [x0, 0.28, z1], 0.006, C.red, 3);
  // Giá ba chân treo quả dọi.
  for (const [dx, dz] of [[-0.08, -0.06], [0.08, -0.06], [0, 0.08]] as const) rod(p, [x1 + dx, 0.05, z1 + dz], [x1, 0.42, z1], 0.01, C.bamboo, 4);
  rod(p, [x1, 0.42, z1], [x1, 0.2, z1], 0.004, C.cream, 3);
  p.cone(0.025, 0.05, C.bronze, x1, 0.18, z1, [Math.PI, 0, 0], 6);
}

/** Lò nung ngói (cấp 5): lò đất vòm, miệng lò đỏ lửa, ống khói, chồng ngói nung xếp bên. */
function kiln(m: ToonModel): void {
  const p = m.plain;
  const T = THO_HO_LOT.zone('T');
  const kx = T.x - 0.12;
  p.sphere(0.26, C.earth, kx, 0.12, T.z - 0.02, [1, 0.9, 0.85], 10);
  p.cyl(0.25, 0.27, 0.1, C.earthDark, kx, 0.05, T.z - 0.02, undefined, 10);
  p.cyl(0.05, 0.06, 0.26, C.earthDark, kx - 0.08, 0.44, T.z - 0.08, undefined, 6);
  m.glow.box(0.12, 0.09, 0.02, C.ember, kx, 0.1, T.z + 0.2);
  p.box(0.16, 0.03, 0.04, C.earthDark, kx, 0.16, T.z + 0.2);
  // Chồng ngói nung cong xếp nghiêng bên phải lò.
  for (let i = 0; i < 4; i++) p.box(0.16, 0.025, 0.12, FIRED, T.x + 0.34, 0.07 + i * 0.03, T.z + 0.02 - i * 0.015, [0.15, 0, 0]);
  // Củi chất cạnh miệng lò.
  for (let i = 0; i < 3; i++) p.cyl(0.025, 0.025, 0.22, C.woodDark, kx + 0.26, 0.04 + (i % 2) * 0.04, T.z + 0.14 - i * 0.05, [Math.PI / 2, 0, 0], 5);
}

export function makeThoHo(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = roofFor(level);
  yard(m, 3, CLAY_YARD);
  // Lối đất nện vào sân: dải giữa từ cổng tới sân đóng gạch, mặt trước rộng gấp đôi.
  const path = THO_HO_LOT.zone(',');
  const front = path.z + path.d / 2 - 0.5;
  p.box(path.w - 0.04, 0.02, 1 - 0.03, PATH, path.x, 0.055, front);
  p.box(0.5 - 0.04, 0.02, path.d - 1, PATH, path.x - 0.25, 0.055, path.z - 0.5);

  shed(m, level, roof);
  brickStack(p, level);
  moldingYard(p, level);
  clayHeap(p);
  stringLine(p);
  if (level >= 2) mixingPit(p);
  if (level >= 3) rammedWall(p, level);
  if (level >= 5) kiln(m);
  return m.group();
}

export const THO_HO: CongTrinh = { tiles: 3, make: makeThoHo, spots: thoHoSpots, view: { half: 2.9, lookY: 0.9, px: 64 } };
