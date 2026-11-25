// Nhà thuốc nam 4×4: nhà sàn lang y mái thuyền suốt phía sau; giữa là lán chõng tre mái tranh cho thương binh nằm
// (số chõng có người theo số thương binh) và cối giã thuốc; phía trước luống thuốc nam phẳng, lối giữa (giản lược kiểu
// 2: một mái chính, xem docs/thiet-ke.md mục Giản lược công trình). Hai người hái thuốc làm ở luống, thay phiên lên
// rừng hái lá (World, `tuyenHai`).
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5, stiltHall } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import type { ShapeBuilder } from '../shapes';
import { ToonModel, inkThin } from '../toon';
import { type CongTrinh, type LotOpts, type LotSpot, MAI_TRANH, maiGon, rod, yard } from './chung';

export const NHA_THUOC_LOT = new Lot(4, [
  'LLLLLLLL',
  'LLLLLLLL',
  'LLLLLLLL',
  'CCCC,,GG',
  'CCCC,,GG',
  'VVV.,,..',
  'VVV.,,..',
  'VVV.,,..',
]);

/** Sân đất nện sáng, lẫn chút lá úa. */
const YARD_THUOC = 0xcdb27c;
const PATH = 0xb8955f;
/** Lá thuốc tươi và lá đang phơi héo. */
const LA = 0x5f8f3a;
const LA_HEO = 0x8f9a4a;
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

/** Nhà sàn lang y mái thuyền theo cấp suốt phía sau, thang gỗ xuống sân; cấp 6–8 cột cao dần. */
function nhaLangY(m: ToonModel, level: number): void {
  const L = NHA_THUOC_LOT.zone('L');
  const tall = 0.08 * above5(level);
  const x = L.x - 0.1;
  const z = L.z - 0.05;
  const d = 1.05;
  const postH = 0.62 + tall;
  stiltHall(m, { x, z, w: 2.9, d, postH, roofL: 3.4, roofW: 1.45, lift: 0.4 + 0.08 * above5(level), roof: maiGon(level) });
  const fz = z + d / 2;
  for (let i = 0; i < 4; i++) {
    const t = (i + 1) / 5;
    m.plain.box(0.34, 0.04, 0.1, C.woodDark, x + 0.35, postH - t * (postH - 0.06), fz + 0.06 + t * 0.32);
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
  const roof = MAI_TRANH;
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

/** Luống thuốc nam phẳng góc trước bên trái: ba luống lá xanh trên bờ đất, không viền mực. */
function vuonThuoc(p: ShapeBuilder): void {
  const V = NHA_THUOC_LOT.zone('V');
  p.box(V.w - 0.1, 0.05, V.d - 0.1, C.soil, V.x, 0.07, V.z);
  for (let r = 0; r < 3; r++) p.box(V.w - 0.3, 0.07, 0.26, r % 2 ? LA : 0x4f7f30, V.x, 0.12, V.z - 0.45 + r * 0.45);
}

/** Nhà thuốc nam cấp `level`; `opts.thuong` là số thương binh đang nằm (bỏ trống thì vẽ một người cho ảnh). */
export function makeNhaThuoc(level: number, opts: LotOpts = {}): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  yard(m, 4, YARD_THUOC);
  const path = NHA_THUOC_LOT.zone(',');
  p.box(path.w - 0.04, 0.02, path.d - 0.04, PATH, path.x, 0.055, path.z);
  // Cối giã, luống thuốc: viền mảnh, luống không viền.
  const n = new ToonModel(inkThin);
  const la = new ToonModel(inkThin);
  nhaLangY(m, level);
  lanChong(m, level, Math.min(soChong(level), opts.thuong ?? 1));
  coiGia(n.plain);
  vuonThuoc(la.plain);
  const g = m.group();
  for (const c of n.group().children.slice()) g.add(c);
  const lg = la.group();
  for (const c of lg.children.slice()) if ((c as THREE.Mesh).material !== inkThin) g.add(c);
  return g;
}

export const NHA_THUOC: CongTrinh = { tiles: 4, make: makeNhaThuoc, spots: nhaThuocSpots, view: { half: 3.6, lookY: 0.9, px: 64 } };
