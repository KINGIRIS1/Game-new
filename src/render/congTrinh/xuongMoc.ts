// Xưởng mộc 3×3: lán thợ mộc dài suốt phía sau, gỗ tròn chất dưới lán, giá cưa xẻ bên trái, sân trước để trống
// (giản lược kiểu 2: một mái chính, xem docs/thiet-ke.md mục Giản lược công trình). Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5 } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import type { ShapeBuilder } from '../shapes';
import { ToonModel, inkThin } from '../toon';
import { type CongTrinh, type LotSpot, type V3, lanMo, maiGon, rod, yard } from './chung';

export const XUONG_MOC_LOT = new Lot(3, [
  'LLLLLL',
  'LLLLLL',
  'XX,...',
  'XX,...',
  '..,,..',
  '..,,..',
]);

/** Sân xưởng: đất nện lẫn mùn cưa, vàng hơn sân thường. */
const SAWDUST_YARD = 0xd2b27c;
/** Lối đất nện vào sân. */
const PATH = 0xb8955f;
/** Mặt cắt gỗ mới xẻ. */
const CUT = 0xdcb478;
/** Gỗ lim sẫm của thân cây tròn. */
const LOG = 0x7a4a2a;

/** Giá cưa xẻ: cây gỗ gác dọc trên giá cao, lưỡi cưa đứng xuyên thân gỗ. */
const SAW = { x: -1.0, logY: 0.78, logR: 0.13, z0: -0.47, z1: 0.47, bladeZ: 0.16, handleLo: 0.6, handleHi: 1.36 };
/** Lưỡi cưa sắt mài sáng, cho nổi trên nền gỗ. */
const BLADE = 0x9aa3ab;
/** Lán thợ mộc: tâm, rộng, sâu. */
const LAN = { x: 0, z: -1.05, w: 2.6, d: 0.8 };

/**
 * Bốn chỗ đứng theo thứ tự có người: thợ xẻ dưới giá cưa, thợ xẻ đứng trên cây gỗ, thợ mộc trước lán, thợ mộc dưới lán.
 * Người dưới giá đứng nghiêng cho thấy mặt.
 */
export function xuongMocSpots(): LotSpot[] {
  return [
    { job: 'thoXe', x: SAW.x - 0.3, y: 0.06, z: 0.44, ry: Math.PI - 0.9 },
    { job: 'thoXe', x: SAW.x, y: SAW.logY + SAW.logR + 0.05, z: -0.16, ry: 0 },
    { job: 'thoMoc', x: 0.68, y: 0.06, z: -0.3, ry: 0.15 },
    { job: 'thoMoc', x: -0.2, y: 0.06, z: -0.85, ry: 0.35 },
  ];
}

/** Một cây gỗ tròn dọc trục `axis` (x hay z), hai đầu mặt cắt sáng màu. */
function log(p: ShapeBuilder, x: number, y: number, z: number, r: number, len: number, axis: 'x' | 'z', color = LOG): void {
  const rot: V3 = axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
  p.cyl(r, r, len, color, x, y, z, rot, 8);
  for (const s of [-1, 1]) {
    const ex = axis === 'x' ? x + s * (len / 2 + 0.004) : x;
    const ez = axis === 'z' ? z + s * (len / 2 + 0.004) : z;
    p.cyl(r * 0.86, r * 0.86, 0.012, CUT, ex, y, ez, rot, 8);
  }
}

/**
 * Giá cưa xẻ: hai giá chữ A cao, cây gỗ gác dọc, tấm ván cho thợ đứng trên, lưỡi cưa đứng xuyên thân gỗ có tay cưa
 * trên và dưới.
 */
function sawPit(p: ShapeBuilder): void {
  const { x, logY, logR, z0, z1, bladeZ, handleLo, handleHi } = SAW;
  for (const z of [z0 + 0.1, z1 - 0.1]) {
    for (const s of [-1, 1]) rod(p, [x + s * 0.3, 0, z], [x, logY - logR, z], 0.03, C.woodDark, 5);
    p.box(0.42, 0.05, 0.05, C.wood, x, 0.34, z);
  }
  log(p, x, logY, 0, logR, z1 - z0, 'z');
  // Vết cưa dọc thân gỗ từ đầu trước tới lưỡi cưa.
  p.box(0.012, 0.012, z1 - bladeZ, C.ink, x, logY + logR + 0.002, (bladeZ + z1) / 2);
  // Tấm ván trên cây gỗ cho thợ xẻ đứng.
  p.box(0.24, 0.03, 0.4, C.woodLight, x, logY + logR + 0.015, -0.18);
  // Lưỡi cưa đứng (răng cưa sẫm một bên), hai tay cưa ngang.
  p.box(0.016, handleHi - handleLo, 0.1, BLADE, x, (handleLo + handleHi) / 2, bladeZ);
  p.box(0.02, handleHi - handleLo - 0.06, 0.02, C.iron, x, (handleLo + handleHi) / 2, bladeZ + 0.055);
  for (const y of [handleLo, handleHi]) p.box(0.34, 0.04, 0.04, C.woodDark, x, y, bladeZ);
}

export function makeXuongMoc(level: number): THREE.Group {
  const m = new ToonModel();
  // Giá cưa: viền mảnh.
  const n = new ToonModel(inkThin);
  const p = m.plain;
  const up = above5(level);

  yard(m, 3, SAWDUST_YARD);
  const path = XUONG_MOC_LOT.zone(',');
  p.box(0.5, 0.02, path.d, PATH, path.x, 0.055, path.z);

  // Lán thợ mộc mái theo cấp suốt phía sau, cao dần ở cấp 6–8; gỗ tròn chất dưới nửa phải lán, nhiều dần tới cấp 5.
  const h = 0.92 + 0.1 * up;
  lanMo(m, LAN.x, LAN.z, LAN.w, LAN.d, h, maiGon(level), 0.22, 0.05);
  const r = 0.11;
  const rows = level >= 5 ? [3, 2] : level >= 3 ? [2, 1] : [2];
  for (const [row, count] of rows.entries()) {
    for (let i = 0; i < count; i++) log(p, 0.75 + (i - (count - 1) / 2) * 2 * r, 0.06 + r + row * r * 1.7, LAN.z - 0.05, r, 0.7, 'z', i % 2 ? C.woodDark : LOG);
  }

  // Giá cưa xẻ bên trái.
  sawPit(n.plain);
  const g = m.group();
  for (const c of n.group().children.slice()) g.add(c);
  return g;
}

export const XUONG_MOC: CongTrinh = { tiles: 3, make: makeXuongMoc, spots: xuongMocSpots, view: { half: 2.9, lookY: 0.9, px: 64 } };
