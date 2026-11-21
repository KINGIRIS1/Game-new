// Nhà thuốc nam 4×4: nhà sàn lang y mái thuyền ở sau bên trái, giàn phơi lá thuốc góc sau bên phải; giữa là lán chõng
// tre cho thương binh nằm (số chõng có người theo số thương binh) và cối giã thuốc; phía trước vườn thuốc nam, lò sắc
// thuốc, lối giữa. Hai người hái thuốc làm ở vườn, thay phiên lên rừng hái lá (World, `tuyenHai`).
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5, birdSpread, roofFor, stiltHall } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import type { ShapeBuilder } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotOpts, type LotSpot, rod, yard } from './chung';

export const NHA_THUOC_LOT = new Lot(4, [
  'LLLLLLPP',
  'LLLLLLPP',
  'LLLLLLPP',
  'CCCC,,GG',
  'CCCC,,GG',
  'VVV.,,OO',
  'VVV.,,..',
  'VVV.,,..',
]);

/** Sân đất nện sáng, lẫn chút lá úa. */
const YARD_THUOC = 0xcdb27c;
const PATH = 0xb8955f;
/** Lá thuốc tươi và lá đang phơi héo. */
const LA = 0x5f8f3a;
const LA_HEO = 0x8f9a4a;
const LA_KHO = 0xa58a4a;
/** Vải băng trắng ngà, áo thương binh nâu. */
const BANG = 0xefe6cf;
const AO = 0x7a5a3a;
const DA = 0xc98f62;

/** Số chõng trong lán theo cấp: cấp 1 hai chõng, thêm dần tới sáu. */
export function soChong(level: number): number {
  return Math.min(6, 2 + Math.floor((level - 1) / 2));
}

/**
 * Chỗ đứng theo thứ tự: lang y giã thuốc bên cối, hai người hái thuốc ở vườn (World cho hai người này thay phiên lên
 * rừng hái lá).
 */
export function nhaThuocSpots(): LotSpot[] {
  const G = NHA_THUOC_LOT.zone('G');
  const V = NHA_THUOC_LOT.zone('V');
  return [
    { job: 'langY', x: G.x - 0.05, y: 0.06, z: G.z + 0.3, ry: Math.PI + 0.3 },
    { job: 'haiThuoc', x: V.x - 0.3, y: 0.06, z: V.z - 0.15, ry: 0.6 },
    { job: 'haiThuoc', x: V.x + 0.35, y: 0.06, z: V.z + 0.35, ry: -0.8 },
  ];
}

/** Nhà sàn lang y: mái thuyền theo cấp, chum thuốc, kệ ống tre đựng thuốc dưới gầm sàn; cấp 10 chim Lạc hai cột trước. */
function nhaLangY(m: ToonModel, level: number): void {
  const p = m.plain;
  const L = NHA_THUOC_LOT.zone('L');
  const roof = roofFor(level);
  const tall = 0.08 * above5(level);
  const x = L.x;
  const z = L.z - 0.05;
  const w = 2.3;
  const d = 1.05;
  const postH = 0.62 + tall;
  stiltHall(m, { x, z, w, d, postH, roofL: 2.75, roofW: 1.4, lift: 0.4 + 0.08 * above5(level), roof });
  // Thang tre lên sàn giữa mặt trước.
  const fz = z + d / 2;
  for (let i = 0; i < 4; i++) {
    const t = (i + 1) / 5;
    p.box(0.3, 0.035, 0.09, C.woodDark, x + 0.35, postH - t * (postH - 0.06), fz + 0.06 + t * 0.32);
  }
  // Gầm sàn: kệ tre xếp ống thuốc, chum sành, bó lá khô treo.
  p.box(0.7, 0.03, 0.22, C.bamboo, x - 0.55, 0.3, z - 0.2);
  for (let i = 0; i < 5; i++) p.cyl(0.035, 0.035, 0.16, i % 2 ? C.bamboo : C.woodLight, x - 0.8 + i * 0.12, 0.4, z - 0.2, undefined, 6);
  for (const dx of [-0.85, -0.25]) p.cyl(0.11, 0.09, 0.22, C.earthDark, x + dx, 0.13, z + 0.22, undefined, 8);
  for (let i = 0; i < 3; i++) p.cone(0.05, 0.16, LA_KHO, x + 0.7 + i * 0.14, postH - 0.14, z + 0.3, [Math.PI, 0, 0], 5);
  if (level >= 6) {
    // Biển gỗ treo trước hiên: hình chiếc lá trên nền đỏ.
    p.box(0.34, 0.18, 0.025, C.red, x - 0.35, postH + 0.42, fz + 0.03);
    p.sphere(0.06, LA, x - 0.35, postH + 0.42, fz + 0.05, [1.4, 0.7, 0.3], 6);
  }
  if (level >= 10) for (const dx of [-w / 2 + 0.12, w / 2 - 0.12]) birdSpread(m, x + dx, postH + 0.05, fz, 0.22);
}

/** Giàn phơi: hai cột tre, ba tầng nong tre phơi lá (cấp 1 một tầng, cấp 3 hai, cấp 5 ba). */
function gianPhoi(p: ShapeBuilder, level: number): void {
  const P = NHA_THUOC_LOT.zone('P');
  const tang = level >= 5 ? 3 : level >= 3 ? 2 : 1;
  for (const dz of [-0.55, 0.55]) for (const dx of [-0.32, 0.32]) p.cyl(0.02, 0.025, 0.95, C.bamboo, P.x + dx, 0.47, P.z + dz, undefined, 5);
  for (let k = 0; k < tang; k++) {
    const y = 0.3 + k * 0.26;
    for (const dz of [-0.3, 0.3]) {
      p.cyl(0.25, 0.25, 0.025, C.thatch, P.x, y, P.z + dz, undefined, 12);
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + k;
        p.sphere(0.06, k === 0 ? LA_KHO : i % 2 ? LA_HEO : LA, P.x + Math.cos(a) * 0.13, y + 0.025, P.z + dz + Math.sin(a) * 0.13, [1.4, 0.3, 0.8], 5);
      }
    }
    rod(p, [P.x - 0.32, y - 0.02, P.z - 0.55], [P.x - 0.32, y - 0.02, P.z + 0.55], 0.012, C.bamboo, 4);
    rod(p, [P.x + 0.32, y - 0.02, P.z - 0.55], [P.x + 0.32, y - 0.02, P.z + 0.55], 0.012, C.bamboo, 4);
  }
}

/** Một thương binh nằm trên chõng: thân áo nâu, băng trắng quấn tay hay đầu, đắp chăn lá cọ. */
function thuongBinh(p: ShapeBuilder, x: number, y: number, z: number, i: number): void {
  p.box(0.44, 0.09, 0.15, AO, x - 0.04, y + 0.05, z);
  p.sphere(0.075, DA, x + 0.25, y + 0.08, z, [1, 0.9, 1], 7);
  if (i % 2) p.cyl(0.08, 0.08, 0.04, BANG, x + 0.25, y + 0.12, z, [0, 0, Math.PI / 2], 8);
  else p.box(0.12, 0.05, 0.17, BANG, x + 0.06, y + 0.11, z);
  p.box(0.3, 0.04, 0.18, C.thatchDark, x - 0.15, y + 0.11, z);
}

/**
 * Lán chõng: bốn cột tre, mái tranh một mái, chõng tre kê thành hai hàng (`soChong`); `nam` chõng đầu có thương binh
 * nằm, bát thuốc đặt cạnh.
 */
function lanChong(m: ToonModel, level: number, nam: number): void {
  const p = m.plain;
  const Cz = NHA_THUOC_LOT.zone('C');
  const x0 = Cz.x - Cz.w / 2 + 0.1;
  const x1 = Cz.x + Cz.w / 2 - 0.1;
  const zb = Cz.z - Cz.d / 2 + 0.08;
  // Mái một mái che nửa sau lán, cao, dốc ra trước: nhìn từ trên vẫn thấy hàng chõng trước.
  const h = 0.95 + 0.06 * above5(level);
  const zm = Cz.z + 0.05;
  for (const x of [x0, x1, (x0 + x1) / 2]) {
    p.cyl(0.03, 0.035, h, C.bamboo, x, h / 2, zb, undefined, 5);
    p.cyl(0.03, 0.035, h - 0.22, C.bamboo, x, (h - 0.22) / 2, zm, undefined, 5);
  }
  const roof = roofFor(level);
  const deep = zm - zb + 0.2;
  const slope = Math.hypot(deep, 0.22);
  m.band.box(x1 - x0 + 0.3, 0.05, slope, roof.main, Cz.x, h - 0.1, (zb + zm) / 2, [Math.atan2(0.22, deep), 0, 0]);
  if (roof.trim !== null) p.box(x1 - x0 + 0.32, 0.04, 0.04, roof.trim, Cz.x, h - 0.22, zm + 0.1);
  // Vách phên sau lán.
  p.box(x1 - x0, h * 0.55, 0.025, C.thatchDark, Cz.x, h * 0.3, zb - 0.02);
  const n = soChong(level);
  const cols = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const c = Math.floor(i / 2);
    const row = i % 2;
    const cx = x0 + 0.32 + c * ((x1 - x0 - 0.64) / Math.max(1, cols - 1 || 1));
    const x = cols === 1 ? Cz.x : cx;
    const z = row ? Cz.z + 0.22 : Cz.z - 0.22;
    for (const dx of [-0.24, 0.24]) for (const dz of [-0.08, 0.08]) p.cyl(0.015, 0.015, 0.16, C.woodDark, x + dx, 0.13, z + dz, undefined, 4);
    p.box(0.58, 0.03, 0.22, C.bamboo, x, 0.22, z);
    if (i < nam) {
      thuongBinh(p, x, 0.24, z, i);
      p.cyl(0.035, 0.025, 0.03, C.earthDark, x + 0.24, 0.07, z + (row ? 0.17 : -0.17), undefined, 6);
    }
  }
}

/** Cối giã thuốc: cối đá, chày gỗ dựng, mẹt lá chờ giã, ấm thuốc. */
function coiGia(p: ShapeBuilder): void {
  const G = NHA_THUOC_LOT.zone('G');
  p.cyl(0.14, 0.11, 0.2, C.rock, G.x, 0.15, G.z - 0.12, undefined, 9);
  p.cyl(0.1, 0.1, 0.02, C.rockDark, G.x, 0.25, G.z - 0.12, undefined, 9);
  p.sphere(0.06, LA, G.x, 0.25, G.z - 0.12, [1.2, 0.3, 1.2], 6);
  rod(p, [G.x + 0.12, 0.06, G.z - 0.3], [G.x + 0.02, 0.62, G.z - 0.16], 0.02, C.wood, 5);
  p.cyl(0.18, 0.18, 0.02, C.thatch, G.x + 0.3, 0.09, G.z + 0.15, undefined, 10);
  for (let i = 0; i < 4; i++) p.sphere(0.05, i % 2 ? LA_HEO : LA, G.x + 0.27 + (i - 1.5) * 0.06, 0.11, G.z + 0.15 + (i % 2 ? 0.05 : -0.04), [1.3, 0.3, 0.8], 5);
}

/** Vườn thuốc nam: luống đất có khóm lá (ngải, sả, lá lốt), bờ luống; cấp 4 thêm luống, cấp 7 rào tre thấp. */
function vuonThuoc(p: ShapeBuilder, level: number): void {
  const V = NHA_THUOC_LOT.zone('V');
  const luong = level >= 4 ? 3 : 2;
  for (let r = 0; r < luong; r++) {
    const z = V.z - 0.45 + r * (0.9 / Math.max(1, luong - 1));
    p.box(V.w - 0.2, 0.06, 0.22, C.soil, V.x, 0.08, z);
    for (let i = 0; i < 4; i++) {
      const x = V.x - 0.48 + i * 0.32;
      const tall = (i + r) % 3 === 0;
      if (tall) for (const a of [-0.3, 0, 0.3]) p.cone(0.025, 0.28, LA_HEO, x + a * 0.1, 0.24, z, [a, 0, a], 4);
      else p.sphere(0.09, (i + r) % 2 ? LA : 0x4f7f30, x, 0.15, z, [1, 0.7, 1], 6);
    }
  }
  if (level >= 7) {
    const x0 = V.x - V.w / 2 + 0.06;
    const z1 = V.z + V.d / 2 - 0.06;
    for (let i = 0; i < 6; i++) p.cyl(0.012, 0.012, 0.22, C.bamboo, x0 + i * 0.27, 0.13, z1, undefined, 4);
    rod(p, [x0, 0.2, z1], [x0 + 1.35, 0.2, z1], 0.01, C.bamboo, 4);
  }
}

/** Lò sắc thuốc: bếp ba ông đầu rau, ấm đất trên lửa, khói nhẹ; củi chất bên. */
function loSac(m: ToonModel): void {
  const p = m.plain;
  const O = NHA_THUOC_LOT.zone('O');
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    p.box(0.08, 0.1, 0.08, C.earthDark, O.x - 0.15 + Math.cos(a) * 0.12, 0.1, O.z + Math.sin(a) * 0.12, [0, a, 0]);
  }
  m.glow.box(0.1, 0.04, 0.1, C.ember, O.x - 0.15, 0.08, O.z);
  p.sphere(0.11, C.earth, O.x - 0.15, 0.22, O.z, [1, 0.85, 1], 9);
  p.cyl(0.04, 0.05, 0.05, C.earthDark, O.x - 0.15, 0.32, O.z, undefined, 7);
  p.cone(0.02, 0.08, C.earth, O.x - 0.04, 0.24, O.z, [0, 0, -1.1], 5);
  for (let i = 0; i < 3; i++) p.cyl(0.022, 0.022, 0.24, C.woodDark, O.x + 0.25, 0.04 + (i % 2) * 0.04, O.z - 0.05 + i * 0.05, [Math.PI / 2, 0, 0.1], 5);
}

/** Nhà thuốc nam cấp `level`; `opts.thuong` là số thương binh đang nằm (bỏ trống thì vẽ một người cho ảnh). */
export function makeNhaThuoc(level: number, opts: LotOpts = {}): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  yard(m, 4, YARD_THUOC);
  const path = NHA_THUOC_LOT.zone(',');
  p.box(path.w - 0.04, 0.02, path.d - 0.04, PATH, path.x, 0.055, path.z);
  nhaLangY(m, level);
  gianPhoi(p, level);
  lanChong(m, level, Math.min(soChong(level), opts.thuong ?? 1));
  coiGia(p);
  vuonThuoc(p, level);
  loSac(m);
  return m.group();
}

export const NHA_THUOC: CongTrinh = { tiles: 4, make: makeNhaThuoc, spots: nhaThuocSpots, view: { half: 3.6, lookY: 0.9, px: 64 } };
