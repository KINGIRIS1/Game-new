// Xưởng mộc 3×3: lán thợ mộc góc sau bên trái, khung nhà dựng dở và đống gỗ tròn phía sau, giá cưa xẻ và thuyền độc
// mộc đang đẽo ở giữa, lối vào giữa mặt trước, lán thứ hai, giá phơi ván và trâu kéo gỗ ra phía trước.
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { above5, boatRoof, buffalo, roofFor, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import type { ShapeBuilder } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, type V3, rod, yard } from './chung';

export const XUONG_MOC_LOT = new Lot(3, [
  'LLLKKG',
  'LLLKKG',
  'XX,TTT',
  'XX,TTT',
  'SS,,PP',
  'SS,,BB',
]);

/** Sân xưởng: đất nện lẫn mùn cưa, vàng hơn sân thường. */
const SAWDUST_YARD = 0xd2b27c;
/** Mùn cưa, phoi gỗ mới: vàng nhạt. */
const SAWDUST = 0xe8cf98;
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
/** Thuyền độc mộc trên hai mễ, dọc theo x. */
const BOAT = { x: 0.78, y: 0.36, z: 0.02 };

/**
 * Bốn chỗ đứng theo thứ tự có người: thợ xẻ dưới giá cưa, thợ xẻ đứng trên cây gỗ, thợ mộc đẽo thuyền (đứng sau
 * thuyền, quay mặt ra trước), thợ mộc đẽo cột trước khung nhà. Người dưới giá đứng nghiêng cho thấy mặt.
 */
export function xuongMocSpots(): LotSpot[] {
  return [
    { job: 'thoXe', x: SAW.x - 0.3, y: 0.06, z: 0.44, ry: Math.PI - 0.9 },
    { job: 'thoXe', x: SAW.x, y: SAW.logY + SAW.logR + 0.05, z: -0.16, ry: 0 },
    { job: 'thoMoc', x: BOAT.x - 0.1, y: 0.06, z: -0.36, ry: 0.15 },
    { job: 'thoMoc', x: 0.2, y: 0.06, z: -0.62, ry: 0.35 },
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

/** Mễ gỗ chữ A đỡ đồ đẽo: hai chân choãi, xà ngang trên, cao `h`, ngang theo z. */
function trestle(p: ShapeBuilder, x: number, z: number, h: number, half: number): void {
  for (const s of [-1, 1]) {
    rod(p, [x - 0.12, 0, z + s * half], [x, h, z + s * half], 0.022, C.woodDark, 4);
    rod(p, [x + 0.12, 0, z + s * half], [x, h, z + s * half], 0.022, C.woodDark, 4);
  }
  p.box(0.06, 0.05, 2 * half + 0.1, C.wood, x, h, z);
}

/**
 * Lán thợ mộc: bốn cột, mái thuyền theo cấp, bàn gỗ có bào, giá treo cưa rìu đục ở vách sau. Cấp 6 cột hiên chạm hoa
 * văn trống đồng; cấp 6–8 cột cao dần.
 */
function workshop(m: ToonModel, level: number, roof: Roof): void {
  const p = m.plain;
  const L = XUONG_MOC_LOT.zone('L');
  const up = above5(level);
  const h = 0.92 + 0.1 * up;
  const x0 = L.x - L.w / 2 + 0.16;
  const x1 = L.x + L.w / 2 - 0.16;
  const zb = L.z - L.d / 2 + 0.14;
  const zf = L.z + L.d / 2 - 0.12;
  for (const x of [x0, x1]) {
    p.cyl(0.04, 0.05, h, C.woodDark, x, h / 2, zb, undefined, 6);
    if (level >= 6) {
      // Cột hiên chạm hoa văn: thân to hơn, quấn đai hoa văn trống đồng, chân đá kê.
      m.band.cyl(0.065, 0.075, h, C.wood, x, h / 2, zf, undefined, 8);
      p.cyl(0.1, 0.11, 0.08, C.rock, x, 0.04, zf, undefined, 8);
      for (const y of [0.3, h - 0.18]) p.cyl(0.078, 0.078, 0.05, C.bronze, x, y, zf, undefined, 8);
    } else {
      p.cyl(0.04, 0.05, h, C.woodDark, x, h / 2, zf, undefined, 6);
    }
  }
  for (const z of [zb, zf]) p.box(x1 - x0 + 0.1, 0.06, 0.06, C.wood, (x0 + x1) / 2, h, z);
  boatRoof(m, roof, { length: L.w + 0.12, width: L.d + 0.2, lift: 0.2, drop: 0.3, thickness: 0.05 }, L.x, h + 0.32, L.z);
  // Vách phên sau, giá treo cưa, rìu, đục.
  p.box(x1 - x0, h * 0.7, 0.03, C.thatchDark, (x0 + x1) / 2, h * 0.35 + 0.05, zb - 0.02);
  p.box(0.9, 0.035, 0.035, C.woodDark, L.x, h * 0.62, zb + 0.03);
  p.box(0.42, 0.1, 0.012, C.iron, L.x - 0.22, h * 0.53, zb + 0.05);
  p.box(0.08, 0.05, 0.03, C.wood, L.x - 0.46, h * 0.53, zb + 0.05);
  p.box(0.025, 0.24, 0.025, C.woodDark, L.x + 0.15, h * 0.5, zb + 0.05);
  p.box(0.06, 0.08, 0.07, C.bronze, L.x + 0.15, h * 0.42, zb + 0.07);
  p.box(0.02, 0.2, 0.02, C.woodDark, L.x + 0.32, h * 0.5, zb + 0.05);
  // Bàn gỗ dài, cái bào và tấm ván đang bào, phoi gỗ.
  const bz = L.z + 0.05;
  for (const dx of [-0.38, 0.38]) for (const dz of [-0.12, 0.12]) p.box(0.04, 0.36, 0.04, C.woodDark, L.x + dx, 0.18, bz + dz);
  p.box(0.9, 0.05, 0.32, C.wood, L.x, 0.38, bz);
  p.box(0.62, 0.025, 0.18, CUT, L.x - 0.08, 0.42, bz);
  p.box(0.12, 0.05, 0.06, C.woodDark, L.x + 0.14, 0.455, bz);
  for (const [dx, dz] of [[-0.3, 0.32], [0.05, 0.36], [0.3, 0.28]] as const) p.sphere(0.05, SAWDUST, L.x + dx, 0.06, bz + dz, [1.3, 0.35, 1], 5);
}

/** Đống gỗ tròn xếp dọc góc sau bên phải: cấp 1 năm cây, mỗi cấp thêm một cây tới mười. */
function logPile(p: ShapeBuilder, level: number): void {
  const G = XUONG_MOC_LOT.zone('G');
  const n = Math.min(4 + level, 10);
  const r = 0.085;
  const rows = [3, 3, 2, 2];
  let k = 0;
  for (let row = 0; row < rows.length && k < n; row++) {
    const count = rows[row];
    for (let i = 0; i < count && k < n; i++, k++) {
      const x = G.x + (i - (count - 1) / 2) * (2 * r) * (row % 2 ? 1 : 0.95);
      log(p, x, 0.08 + r + row * r * 1.7, G.z + (row % 2 ? 0.04 : 0), r, G.d - 0.12 - row * 0.06, 'z', k % 3 ? LOG : C.woodDark);
    }
  }
  // Hai cọc chặn chân đống gỗ.
  for (const s of [-1, 1]) p.box(0.04, 0.4, 0.04, C.woodDark, G.x + s * 0.26, 0.2, G.z + 0.35);
}

/**
 * Giá cưa xẻ: hai giá chữ A cao, cây gỗ gác dọc, tấm ván cho thợ đứng trên, lưỡi cưa đứng xuyên thân gỗ có tay cưa
 * trên và dưới. Mùn cưa rơi dưới chân.
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
  // Mùn cưa dưới giá.
  for (const [dx, dz, r] of [[0, 0.12, 0.14], [0.12, -0.1, 0.1], [-0.14, 0.3, 0.09]] as const) p.sphere(r, SAWDUST, x + dx, 0.05, dz, [1.3, 0.3, 1], 6);
}

/** Thuyền độc mộc đang đẽo trên hai mễ: thân gỗ khoét lòng, mũi lái vểnh; phoi gỗ dưới chân. */
function dugout(p: ShapeBuilder): void {
  const { x, y, z } = BOAT;
  for (const dx of [-0.36, 0.36]) trestle(p, x + dx, z, y - 0.1, 0.12);
  p.sphere(0.5, LOG, x, y, z, [1.18, 0.2, 0.3], 10);
  p.sphere(0.5, C.woodDark, x + 0.02, y + 0.05, z, [0.98, 0.12, 0.22], 10);
  for (const s of [-1, 1]) p.cone(0.07, 0.16, LOG, x + s * 0.6, y + 0.05, z, [0, 0, -s * 1.2], 6);
  for (const [dx, dz] of [[-0.3, 0.3], [0.1, 0.36], [0.4, 0.26], [-0.05, -0.32]] as const) p.box(0.07, 0.015, 0.03, SAWDUST, x + dx, 0.06, z + dz, [0, dx * 4, 0]);
}

/** Thuyền lớn mũi cong trên giàn đà (cấp 8): thân ván ghép, mũi lái cong vút, đà gỗ kê dốc ra lối. */
function bigBoat(p: ShapeBuilder, m: ToonModel): void {
  const { x, z } = BOAT;
  const y = 0.44;
  for (const s of [-1, 1]) rod(p, [x - 0.75, 0.06, z + s * 0.16], [x + 0.75, 0.2, z + s * 0.16], 0.03, C.woodDark, 4);
  for (const dx of [-0.4, 0.05, 0.45]) p.box(0.06, y - 0.12, 0.3, C.wood, x + dx, (y - 0.12) / 2 + 0.06, z);
  p.sphere(0.5, C.wood, x, y, z, [1.4, 0.28, 0.36], 12);
  p.sphere(0.5, C.woodDark, x, y + 0.08, z, [1.22, 0.16, 0.28], 12);
  m.band.box(1.1, 0.06, 0.02, C.red, x, y + 0.1, z + 0.17);
  // Mũi, lái cong vút như thuyền trên trống đồng.
  for (const s of [-1, 1]) {
    rod(p, [x + s * 0.62, y + 0.05, z], [x + s * 0.76, y + 0.38, z], 0.045, C.wood, 6);
    rod(p, [x + s * 0.76, y + 0.38, z], [x + s * 0.68, y + 0.52, z], 0.035, C.wood, 6);
  }
  p.sphere(0.04, C.bronze, x + 0.68, y + 0.54, z, [1, 1, 1], 6);
}

/** Khung nhà sàn dựng dở: bốn cột, xà sàn, xà đầu cột, hai vì kèo chữ A và đòn nóc, chưa lợp mái. */
function houseFrame(p: ShapeBuilder): void {
  const K = XUONG_MOC_LOT.zone('K');
  const hx = K.w / 2 - 0.14;
  const hz = K.d / 2 - 0.14;
  const post = 1.15;
  const floor = 0.42;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box(0.07, post, 0.07, LOG, K.x + sx * hx, post / 2, K.z + sz * hz);
  for (const y of [floor, post]) {
    for (const sz of [-1, 1]) p.box(2 * hx + 0.1, 0.05, 0.05, C.wood, K.x, y, K.z + sz * hz);
    for (const sx of [-1, 1]) p.box(0.05, 0.05, 2 * hz + 0.1, C.wood, K.x + sx * hx, y, K.z);
  }
  // Mấy tấm ván sàn đã lát.
  for (let i = 0; i < 3; i++) p.box(2 * hx - 0.04, 0.025, 0.09, CUT, K.x, floor + 0.035, K.z - hz + 0.12 + i * 0.11);
  const ridge = post + 0.42;
  for (const sx of [-1, 1]) {
    rod(p, [K.x + sx * hx, post, K.z - hz], [K.x + sx * hx, ridge, K.z], 0.025, C.wood, 4);
    rod(p, [K.x + sx * hx, post, K.z + hz], [K.x + sx * hx, ridge, K.z], 0.025, C.wood, 4);
  }
  p.box(2 * hx + 0.16, 0.05, 0.05, C.woodDark, K.x, ridge, K.z);
  // Cây cột đang đẽo nằm trước khung, phoi gỗ quanh.
  log(p, K.x - 0.22, 0.07, K.z + K.d / 2 + 0.12, 0.06, 0.5, 'x', C.woodLight);
  for (const dx of [-0.4, -0.05]) p.box(0.06, 0.015, 0.03, SAWDUST, K.x + dx, 0.06, K.z + K.d / 2 + 0.24, [0, dx * 5, 0]);
  // Thang tre dựa cột trước bên phải.
  rod(p, [K.x + hx - 0.05, 0, K.z + hz + 0.22], [K.x + hx - 0.05, post - 0.1, K.z + hz + 0.02], 0.015, C.bamboo, 4);
  rod(p, [K.x + hx - 0.21, 0, K.z + hz + 0.22], [K.x + hx - 0.21, post - 0.1, K.z + hz + 0.02], 0.015, C.bamboo, 4);
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    p.box(0.17, 0.015, 0.015, C.bamboo, K.x + hx - 0.13, t * (post - 0.1), K.z + hz + 0.22 - t * 0.2);
  }
}

/** Giá phơi ván: hai cột, xà ngang, ván dựng nghiêng hai mặt. */
function plankRack(p: ShapeBuilder): void {
  const P = XUONG_MOC_LOT.zone('P');
  for (const s of [-1, 1]) p.box(0.05, 0.56, 0.05, C.woodDark, P.x + s * 0.4, 0.28, P.z);
  p.box(0.86, 0.05, 0.05, C.wood, P.x, 0.55, P.z);
  for (let i = 0; i < 6; i++) {
    const x = P.x - 0.32 + i * 0.13;
    const side = i % 2 ? 1 : -1;
    p.box(0.11, 0.6, 0.018, i % 3 ? CUT : C.woodLight, x, 0.3, P.z + side * 0.1, [side * 0.32, 0, 0]);
  }
}

/** Trâu kéo một cây gỗ vào sân, đi về phía lối giữa; ách trên cổ, dây kéo buộc đầu gỗ. */
function buffaloHaul(p: ShapeBuilder): void {
  const B = XUONG_MOC_LOT.zone('B');
  const bx = B.x - 0.3;
  const bz = B.z;
  p.frame = new THREE.Matrix4().compose(new THREE.Vector3(bx, 0, bz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1));
  buffalo(p, 0, 0);
  p.box(0.34, 0.04, 0.04, C.woodDark, 0, 0.5, 0.2);
  p.frame = null;
  log(p, bx + 0.6, 0.08, bz, 0.07, 0.36, 'x');
  for (const s of [-1, 1]) rod(p, [bx - 0.2, 0.46, bz + s * 0.12], [bx + 0.42, 0.1, bz + s * 0.04], 0.008, C.cream, 3);
}

/** Lán thứ hai (cấp 7): mái theo cấp, bày sập gỗ chạm và hòm gỗ bịt đồng. */
function showroom(m: ToonModel, level: number, roof: Roof): void {
  const p = m.plain;
  const S = XUONG_MOC_LOT.zone('S');
  const h = 0.78 + 0.08 * Math.max(0, level - 7);
  const hx = S.w / 2 - 0.1;
  const hz = S.d / 2 - 0.12;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.cyl(0.035, 0.045, h, C.woodDark, S.x + sx * hx, h / 2, S.z + sz * hz, undefined, 6);
  boatRoof(m, roof, { length: S.w + 0.08, width: S.d + 0.12, lift: 0.16, drop: 0.24, thickness: 0.045 }, S.x, h + 0.25, S.z);
  // Sập gỗ chạm: mặt ván, diềm chạm hoa văn, bốn chân quỳ.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box(0.05, 0.18, 0.05, C.woodDark, S.x + sx * 0.24, 0.09, S.z - 0.08 + sz * 0.14);
  p.box(0.6, 0.05, 0.36, C.wood, S.x, 0.2, S.z - 0.08);
  m.band.box(0.62, 0.06, 0.02, C.woodLight, S.x, 0.15, S.z + 0.11);
  // Hòm gỗ bịt đồng góc trước.
  p.box(0.26, 0.18, 0.18, C.woodDark, S.x + 0.18, 0.14, S.z + 0.28);
  p.box(0.28, 0.03, 0.2, C.bronze, S.x + 0.18, 0.24, S.z + 0.28);
}

export function makeXuongMoc(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = XUONG_MOC_LOT;
  const roof = roofFor(level);

  yard(m, 3, SAWDUST_YARD);
  // Lối đất nện: dải giữa từ cổng vào tới chỗ cưa, rộng gấp đôi ở mặt trước; hai khối liền cho khỏi kẻ ô.
  const path = L.zone(',');
  const front = path.z + path.d / 2 - 0.5;
  p.box(path.w - 0.04, 0.02, 1 - 0.03, PATH, path.x, 0.055, front);
  p.box(0.5 - 0.04, 0.02, path.d - 1, PATH, path.x - 0.25, 0.055, path.z - 0.5);

  workshop(m, level, roof);
  logPile(p, level);
  sawPit(p);
  if (level >= 8) bigBoat(p, m);
  else if (level >= 2) dugout(p);
  if (level >= 3) houseFrame(p);
  if (level >= 4) plankRack(p);
  if (level >= 5) buffaloHaul(p);
  if (level >= 7) showroom(m, level, roof);
  return m.group();
}

export const XUONG_MOC: CongTrinh = { tiles: 3, make: makeXuongMoc, spots: xuongMocSpots, view: { half: 2.9, lookY: 0.9, px: 64 } };
