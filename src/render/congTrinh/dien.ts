// Điện Vua Hùng 10×10: khối cung điện Hoàng Gia Lạc Việt (nhà chính, nền, thềm rồng đá, đỉnh đồng, hai chái, cột chim
// Lạc) lùi về sau; sân chầu rộng phía trước có Vua Hùng ngồi ngai vàng trên bệ, các tướng đứng chầu hai bên lối giữa
// (world.ts dựng tướng ở `courtSlot`), cờ, trống, voi đá, lầu trống, cổng tứ trụ. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import type { TuongId } from '../../game/defs';
import { above5, banner, bird, birdSpread, boatRoof, drum, drumTower, type Roof, roofFor, stiltHall } from '../buildings';
import { bakeVuaHung, VUA_SEAT } from '../heroes';
import { Lot, type Zone } from '../lot';
import { C } from '../palette';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, partScale, postFence, rod, yard } from './chung';

export const DIEN_LOT = new Lot(10, [
  '...7............7...',
  '.....HHHHHHHHHH.....',
  '...ccHHHHHHHHHHCC...',
  '...ccHHHHHHHHHHCC...',
  '...ccHHHHHHHHHHCC...',
  '...ccHHHHHHHHHHCC...',
  '...ccNNNNNNNNNNCC...',
  '.....NNNNTTNNNN.....',
  '.2.....dTTTTd.....2.',
  '.vv..............vv.',
  '.vv.....VVVV.....vv.',
  '...t.t..VVVV..t.t...',
  '........VVVV........',
  '...t.t..m,,...t.t...',
  '.........,,.........',
  '.D.t.t...,,...t.t.D.',
  '.........,,.........',
  '.LL..t...,,...t..LL.',
  '.LL.e...l,,l.....LL.',
  '.......GGGGGG.......',
]);

/**
 * Khối nhà chính (chữ `7`, `H`, `c`, `C`, `N`, `T`, `d` trong bản vẽ) vẽ theo dáng cung điện của Điện 5×5 cũ rồi phóng
 * `KHOI_K` lần, tâm cũ dời tới z = `KHOI_Z`: nhà, mái, cột, chái giữ đúng tỉ lệ đã duyệt mà bề thế hơn. Người, ngai,
 * cờ, trống trong sân giữ cỡ thật.
 */
const KHOI_K = 1.5;
const KHOI_Z = -1.1;
/** Chái nhà (tâm khối `C`, `c` của bản vẽ cũ) và cột chim Lạc, tọa độ trước khi phóng. */
const CHAI = { x: 2.0, z: -1.25 };
const COT_LAC = { x: 2.25, z: -2.25 };
/** Cổng phóng chừng này lần cho cân với sân rộng. */
const CONG_K = 1.3;

/** Mặt nền đá dưới nhà chính (cấp 4 trở lên). */
const dienBase = (level: number) => (level >= 4 ? 0.45 : 0);

/** Cột cờ hai bên sân (khối `2`) cao chừng này; dây cờ ngày Tết buộc gần đỉnh (world.ts). */
export const bannerHeight = (level: number) => (level >= 6 ? 3.2 : 2.9);

/**
 * Chỗ đứng chầu (ô `t` của bản vẽ, đọc từ trên xuống, trái sang): mỗi bên lối giữa hai cột, cột trong cách lối giữa
 * 2,25 ô, cột ngoài 3,25 ô; các hàng cách nhau 1 ô từ ngang ngai ra phía cổng; cột trong bốn hàng, cột ngoài ba hàng
 * (hàng thứ tư vướng lầu trống). Tất cả 14 chỗ:
 *
 *   hàng ngang ngai:  0 ngoài trái   1 trong trái   2 trong phải   3 ngoài phải
 *   hàng hai:         4              5              6              7
 *   hàng ba:          8              9             10             11
 *   hàng gần cổng:                  12             13
 *
 * Gần ngai là chỗ trên. Lạc tướng (trái) và Gióng (phải) đứng hai bên ngai; hàng sau Sơn Tinh (trái), An Dương Vương
 * (phải); Cao Lỗ sau An Dương Vương. Còn 9 chỗ cho tướng các chương sau (Hai Bà Trưng nên đứng ở 0 và 3, ngang ngai).
 * Tướng đứng trong sân không cưỡi thú.
 */
const COURT_SLOT: Record<TuongId, number> = { lacTuong: 1, giong: 2, sonTinh: 5, anDuong: 6, caoLo: 10 };

/** Chỗ tướng `t` đứng chầu (tọa độ móng Điện) và hướng mặt: quay vào lối giữa, chếch ra phía cổng cho dễ thấy mặt. */
export function courtSlot(t: TuongId): { x: number; z: number; ry: number } {
  const c = DIEN_LOT.cells('t')[COURT_SLOT[t]];
  return { x: c.x, z: c.z, ry: c.x < 0 ? 0.85 : -0.85 };
}

/** Lạc hầu (trái) và lính gác (phải, từ cấp 2) đứng hai bên lối giữa, trong cổng. */
export function dienSpots(level: number): LotSpot[] {
  const [l, g] = DIEN_LOT.cells('l');
  return [
    { job: 'lacHau', x: l.x, z: l.z, y: 0.06, ry: 0.3 },
    ...(level >= 2 ? [{ job: 'linhGac' as const, x: g.x, z: g.z, y: 0.06, ry: -0.3 }] : []),
  ];
}

/**
 * Vẽ `draw` trong khung riêng: mọi hình phóng `k` lần quanh gốc rồi dời tới (x, z). Hàm vẽ bên trong tự đặt khung
 * (chim Lạc trên mái cấp 10, `lacBird`) phải nhân vào khung đang có và trả lại khi xong, không thì phần vẽ sau mất
 * phóng (`footprint.test.ts` canh khối nhà chính cấp 10 không bị thu nhỏ).
 */
function scaled(m: ToonModel, x: number, z: number, k: number, draw: () => void): void {
  const frame = new THREE.Matrix4().makeTranslation(x, 0, z).multiply(new THREE.Matrix4().makeScale(k, k, k));
  const builders = [m.plain, m.band, m.drum, m.glow];
  const before = builders.map((b) => b.frame);
  for (const b of builders) b.frame = frame;
  draw();
  builders.forEach((b, i) => (b.frame = before[i]));
}

/** Đỉnh đồng / Lư hương hoàng cung 3 chân đặt hai bên thềm chầu. */
function royalCenser(m: ToonModel, x: number, y0: number, z: number, s = 1): void {
  const p = m.plain;
  p.cyl(0.14 * s, 0.16 * s, 0.05 * s, C.rockDark, x, y0 + 0.025 * s, z, undefined, 8);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    p.cyl(0.022 * s, 0.018 * s, 0.14 * s, C.bronzeDark, x + Math.cos(a) * 0.08 * s, y0 + 0.09 * s, z + Math.sin(a) * 0.08 * s, undefined, 5);
  }
  m.band.sphere(0.115 * s, C.bronze, x, y0 + 0.19 * s, z, [1.05, 0.82, 1.05], 10);
  p.cyl(0.11 * s, 0.095 * s, 0.05 * s, C.gold, x, y0 + 0.27 * s, z, undefined, 10);
  for (const sx of [-1, 1]) {
    p.box(0.03 * s, 0.11 * s, 0.05 * s, C.gold, x + sx * 0.125 * s, y0 + 0.23 * s, z, [0, 0, -sx * 0.2]);
  }
  m.glow.sphere(0.055 * s, 0xff9a2e, x, y0 + 0.3 * s, z, [1.2, 0.55, 1.2], 7);
}

/**
 * Chính Điện Hoàng Cung Lạc Việt:
 * - Hàng cột cái sơn son / gỗ lim có chân tảng đá chạm và đai đồng vàng, đầu cột có kẻ bẩy.
 * - Sàn gỗ lim dày viền hoa văn Đông Sơn.
 * - Vách điện 3 gian: gian giữa mở cửa triều đình sơn đỏ thếp vàng treo Hoành Phi & Mặt Trống Đồng Ngọc Lũ;
 *   hai gian bên có cửa sổ chấn song, khiên đồng hộ môn và đèn lồng đồng phát sáng.
 */
function royalPalaceHall(
  m: ToonModel,
  o: { x: number; z: number; w: number; d: number; floor: number; postH: number; roofL: number; roofW: number; lift: number; roof: Roof; level: number; loft: number },
): void {
  const p = m.plain;
  const colH = o.postH - o.floor;
  const colY = o.floor + colH / 2;
  const colColor = o.level >= 4 ? C.red : C.woodDark;
  const ringColor = o.level >= 6 ? C.gold : C.bronze;

  // 1. Hệ 8 cột cái (4 cột tiền đường, 4 cột hậu đường) có chân tảng đá & đai đồng
  const xs = [-o.w / 2 + 0.16, -o.w * 0.17, o.w * 0.17, o.w / 2 - 0.16];
  const zs = [-o.d / 2 + 0.14, o.d / 2 - 0.14];
  for (const cx of xs) {
    for (const cz of zs) {
      const px = o.x + cx;
      const pz = o.z + cz;
      p.cyl(0.1, 0.125, 0.1, C.rockDark, px, o.floor + 0.05, pz, undefined, 8);
      // Cấp 9 trở lên: cột sơn đỏ chạm hoa văn trống đồng.
      (o.level >= 9 ? m.band : p).cyl(0.078, 0.095, colH, colColor, px, colY, pz, undefined, 8);
      p.cyl(0.092, 0.092, 0.055, ringColor, px, o.floor + colH * 0.35, pz, undefined, 8);
      p.cyl(0.088, 0.088, 0.055, ringColor, px, o.floor + colH * 0.78, pz, undefined, 8);
    }
  }

  // 2. Sàn Chính Điện dày có diềm hoa văn Đông Sơn và nẹp đồng 4 góc
  p.box(o.w, 0.14, o.d, C.wood, o.x, o.postH, o.z);
  m.band.box(o.w + 0.04, 0.08, o.d + 0.04, C.woodLight, o.x, o.postH - 0.02, o.z);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      p.box(0.14, 0.15, 0.14, ringColor, o.x + sx * (o.w / 2 - 0.05), o.postH, o.z + sz * (o.d / 2 - 0.05));
    }
  }

  // 3. Thân vách Chính Điện 3 gian & Cửa Triều Đình
  const wallW = o.w - 0.48;
  const wallD = o.d - 0.44;
  const wallH = 0.68;
  const wallY = o.postH + 0.07 + wallH / 2;
  m.band.box(wallW, wallH, wallD, C.woodLight, o.x, wallY, o.z);

  // Các cột trụ vách sơn đỏ chia 3 gian mặt trước & mặt sau
  const frontZ = o.z + wallD / 2 + 0.02;
  for (const k of [-0.48, -0.18, 0.18, 0.48]) {
    p.box(0.07, wallH + 0.04, 0.06, C.red, o.x + k * wallW, wallY, frontZ);
  }

  // Cửa Chính Điện ở gian giữa + khung bao đỏ viền vàng + Hoành phi & Mặt Trống Đồng trên trán cửa
  const doorW = wallW * 0.28;
  const doorH = wallH * 0.82;
  p.box(doorW, doorH, 0.06, 0x24160e, o.x, o.postH + 0.07 + doorH / 2, frontZ + 0.01);
  for (const sx of [-1, 1]) {
    p.box(0.05, doorH + 0.04, 0.07, C.gold, o.x + sx * (doorW / 2 + 0.02), o.postH + 0.07 + doorH / 2, frontZ + 0.02);
  }
  // Bức Hoành Phi đỏ viền vàng & Mặt Trống Đồng Ngọc Lũ treo giữa mặt tiền điện
  p.box(doorW + 0.24, 0.14, 0.08, C.gold, o.x, o.postH + wallH + 0.02, frontZ + 0.03);
  m.band.box(doorW + 0.18, 0.1, 0.09, C.red, o.x, o.postH + wallH + 0.02, frontZ + 0.035);
  m.drum.cyl(0.19, 0.19, 0.05, 0xffffff, o.x, o.postH + wallH + 0.16, frontZ + 0.04, [Math.PI / 2, 0, 0], 16);

  // Hai gian bên: cửa sổ chấn song, khiên đồng hộ môn & đèn lồng đồng phát sáng
  for (const sx of [-1, 1]) {
    const bx = o.x + sx * wallW * 0.33;
    p.box(0.32, 0.26, 0.05, C.woodDark, bx, wallY + 0.02, frontZ + 0.01);
    p.cyl(0.11, 0.11, 0.04, ringColor, bx, wallY + 0.02, frontZ + 0.03, [Math.PI / 2, 0, 0], 10);
    if (o.level >= 3) {
      const lx = o.x + sx * (doorW / 2 + 0.16);
      const ly = o.postH + wallH * 0.72;
      p.cyl(0.045, 0.035, 0.09, C.red, lx, ly, frontZ + 0.1, undefined, 6);
      m.glow.sphere(0.038, 0xffb84a, lx, ly, frontZ + 0.11, [1, 1.2, 1], 6);
    }
  }

  // Cấp 9 trở lên: tầng gác trên vách, lan can son thếp vàng, ô cửa gác; mái đẩy lên theo.
  if (o.loft > 0) {
    const gy = o.postH + 0.07 + wallH;
    p.box(wallW + 0.16, 0.06, wallD + 0.16, C.wood, o.x, gy + 0.03, o.z);
    m.band.box(wallW * 0.92, o.loft, wallD * 0.86, C.woodLight, o.x, gy + 0.06 + o.loft / 2, o.z);
    const gz = o.z + (wallD + 0.16) / 2;
    m.band.box(wallW + 0.12, 0.15, 0.05, C.red, o.x, gy + 0.14, gz);
    p.box(wallW + 0.14, 0.035, 0.07, C.gold, o.x, gy + 0.22, gz);
    for (const k of [-0.36, -0.12, 0.12, 0.36]) p.box(0.2, 0.16, 0.04, C.woodDark, o.x + k * wallW, gy + 0.06 + o.loft * 0.55, o.z + (wallD * 0.86) / 2 + 0.01);
  }
  // 4. Đòn tay gỗ nhô ra dưới diềm mái & Mái thuyền Hoàng Cung
  const roofY = o.postH + 0.72 + o.roofW * 0.4 + o.loft;
  for (const sx of [-1, 1]) {
    p.cyl(0.035, 0.035, o.roofL * 0.92, C.woodDark, o.x, o.postH + wallH + 0.08 + o.loft, o.z + sx * (wallD / 2 + 0.08), [0, 0, Math.PI / 2], 6);
  }
  boatRoof(m, o.roof, { length: o.roofL, width: o.roofW, lift: o.lift, drop: o.roofW * 0.4, thickness: 0.11 }, o.x, roofY, o.z);
}

/** Tượng cóc đồng ngồi trên mặt trống, ngoảnh theo góc `ry` (ra mép trống). */
function frog(m: ToonModel, x: number, y: number, z: number, ry: number, s: number): void {
  const p = m.plain;
  const fx = Math.sin(ry) * 0.05 * s;
  const fz = Math.cos(ry) * 0.05 * s;
  p.sphere(0.08 * s, C.bronzeDark, x, y + 0.05 * s, z, [1, 0.7, 1.15], 8);
  p.sphere(0.05 * s, C.bronze, x + fx, y + 0.09 * s, z + fz, [1, 0.8, 1], 7);
  for (const side of [-1, 1]) {
    const ex = Math.cos(ry) * 0.03 * s * side;
    const ez = -Math.sin(ry) * 0.03 * s * side;
    p.sphere(0.02 * s, C.bronzeLight, x + fx + ex, y + 0.13 * s, z + fz + ez, [1, 1, 1], 5);
  }
}

/**
 * Cấp 10: cổng thành hai tầng thay Cổng Nghi Môn gỗ: hai trụ đất nện ốp đá, cửa vòm giữa, lầu cổng sơn son có lan can
 * và hai tầng mái theo cấp. Lối giữa vẫn rộng như lối đá.
 */
function gateTower(m: ToonModel, gz: number, roof: Roof): void {
  const p = m.plain;
  for (const sx of [-1, 1]) {
    p.box(0.42, 1.16, 0.52, C.earth, sx * 0.72, 0.58, gz);
    m.band.box(0.44, 0.34, 0.54, C.rockDark, sx * 0.72, 0.17, gz);
    p.box(0.46, 0.06, 0.56, C.rock, sx * 0.72, 1.17, gz);
  }
  // Xà cửa vòm và mặt tường trên vòm.
  p.box(1.06, 0.24, 0.5, C.earth, 0, 1.06, gz);
  // Vòm cửa: nửa vòng đá ốp hai mặt trước, sau.
  for (const sz of [-1, 1]) p.add(new THREE.TorusGeometry(0.47, 0.05, 5, 12, Math.PI), C.rockDark, 0, 0.46, gz + sz * 0.26);
  p.box(1.9, 0.08, 0.6, C.wood, 0, 1.22, gz);
  // Lầu cổng: vách son có hoa văn, lan can thếp vàng, hoành phi.
  m.band.box(1.3, 0.42, 0.36, C.red, 0, 1.47, gz);
  for (const sz of [-1, 1]) {
    p.box(1.78, 0.12, 0.04, C.red, 0, 1.33, gz + sz * 0.28);
    p.box(1.8, 0.03, 0.06, C.gold, 0, 1.4, gz + sz * 0.28);
  }
  p.box(0.62, 0.2, 0.05, C.gold, 0, 1.5, gz + 0.2);
  m.band.box(0.56, 0.15, 0.06, C.red, 0, 1.5, gz + 0.205);
  boatRoof(m, roof, { length: 2.1, width: 0.78, lift: 0.28, drop: 0.24, thickness: 0.055 }, 0, 1.92, gz);
  boatRoof(m, roof, { length: 1.3, width: 0.52, lift: 0.22, drop: 0.16, thickness: 0.045 }, 0, 2.24, gz, 0, true);
}

/**
 * Khối nhà chính theo dáng cung điện cũ (tọa độ trước khi phóng, gốc ở tâm Điện 5×5 cũ): nền đất đắp, thềm đá có thành
 * bậc rồng, đôi đỉnh đồng, nền đá thứ hai, nhà chính và cầu thang, chim đồng trên nóc, hai chái, mái tầng hai, ba,
 * lan can, cột chim Lạc, trống đồng trên nóc.
 */
function palaceBlock(m: ToonModel, level: number): void {
  const p = m.plain;
  const roof = roofFor(level);
  const up = above5(level);
  const s = partScale(level);
  const base = dienBase(level);
  const terrace = 0.16 * up;

  // Nhà chính lùi về sau, bề thế uy nghiêm.
  const hallW = 3.25 * s;
  const hallD = 1.85 * s;
  const hallZ = -1.3;
  const platW = hallW + 0.14;
  const platFront = hallZ + hallD / 2 + 0.14;
  if (level >= 4) {
    // Nền đất đắp viền đá chạm hoa văn dưới nhà chính; bốn góc có trụ đá đầu đồng; thềm đá ba bậc có thành bậc chạm Giao Long.
    const platD = platFront + 2.45;
    const platCenterZ = platFront - platD / 2;
    p.box(platW, base, platD, C.earth, 0, base / 2, platCenterZ);
    m.band.box(platW + 0.02, base * 0.55, platD + 0.02, C.rockDark, 0, base * 0.52, platCenterZ);
    p.box(platW + 0.08, 0.08, platD + 0.06, C.rock, 0, base, platCenterZ);
    for (const sx of [-1, 1]) {
      for (const sz of [platFront, platFront - platD]) {
        p.box(0.16, base + 0.18, 0.16, C.rockDark, sx * (platW / 2), (base + 0.18) / 2, sz);
        p.sphere(0.075, level >= 8 ? C.gold : C.bronze, sx * (platW / 2), base + 0.22, sz, [1, 1.15, 1], 7);
      }
    }
    const stepW = level >= 8 ? 2.0 : 1.12;
    for (const sx of [-1, 1]) {
      const w = (platW - stepW) / 2;
      p.box(w, base * 0.52, 0.42, C.rock, sx * (stepW / 2 + w / 2), base * 0.26, platFront + 0.2);
      p.box(w + 0.02, 0.05, 0.44, C.rockDark, sx * (stepW / 2 + w / 2), base * 0.52, platFront + 0.2);
    }
    for (let i = 0; i < 3; i++) {
      const h = base - i * 0.14;
      p.box(stepW, h, 0.22, i % 2 && level >= 8 ? C.rockDark : C.rock, 0, h / 2, platFront + 0.1 + i * 0.2);
      p.box(stepW * 0.55, h + 0.01, 0.22, C.red, 0, h / 2, platFront + 0.1 + i * 0.2);
    }
    // Đôi thành bậc đá chạm Rồng / Giao Long uốn bậc hai bên thềm chầu
    for (const sx of [-1, 1]) {
      const bx = sx * (stepW / 2 + 0.06);
      rod(p, [bx, base + 0.12, platFront + 0.02], [bx, 0.16, platFront + 0.58], 0.055, C.rockDark, 6);
      p.box(0.12, 0.22, 0.16, C.rockDark, bx, 0.14, platFront + 0.62);
      p.sphere(0.065, level >= 6 ? C.gold : C.bronze, bx, 0.28, platFront + 0.64, [0.9, 1.1, 1.25], 7);
    }
    // Đôi Đỉnh Đồng 3 chân (Lư hương hoàng cung) đặt đối xứng hai bên trước thềm
    for (const sx of [-1, 1]) {
      royalCenser(m, sx * (stepW / 2 + 0.42), 0.05, platFront + 0.52, level >= 7 ? 1.12 : 0.95);
    }
  }
  if (up) {
    // Cấp 6–8: nền đá thứ hai dưới nhà chính, cao dần; cấp 8 viền đồng vàng.
    p.box(hallW + 0.22, terrace, hallD + 0.32, C.rock, 0, base + terrace / 2, hallZ);
    p.box(hallW + 0.26, 0.06, hallD + 0.36, C.rockDark, 0, base + terrace, hallZ);
    if (level >= 8) {
      for (const sz of [-1, 1]) p.box(hallW + 0.3, 0.075, 0.075, C.gold, 0, base + terrace + 0.015, hallZ + (sz * (hallD + 0.36)) / 2);
      for (const sx of [-1, 1]) p.box(0.075, 0.075, hallD + 0.4, C.gold, (sx * (hallW + 0.26)) / 2, base + terrace + 0.015, hallZ);
    }
  }
  const floor = base + terrace;
  const hall = {
    x: 0,
    z: hallZ,
    w: hallW,
    d: hallD,
    floor,
    postH: 1.2 * s + floor + 0.12 * up,
    roofL: Math.min(hallW + 1.3 * s, 4.9),
    roofW: Math.min(hallD + 0.4 + 0.06 * up, 2 * (hallZ + 2.48)),
    lift: 1.05 * s + 0.15 * up,
    roof,
    level,
    loft: level >= 9 ? 0.42 : 0,
  };
  royalPalaceHall(m, hall);

  // Cầu thang gỗ lim dẫn lên sàn Chính Điện có dầm cốn thang sơn đỏ & tay vịn bịt đồng
  const rungs = 4 + up;
  const ladderTop = hallZ + hallD / 2;
  const ladderRun = 0.46;
  for (let i = 0; i < rungs; i++) {
    const t = i / (rungs - 1);
    p.box(0.56, 0.06, 0.18, C.woodDark, 0, hall.postH - 0.14 - t * (hall.postH - floor - 0.24), ladderTop + 0.05 + t * ladderRun);
  }
  for (const sx of [-1, 1]) {
    const lx = sx * 0.3;
    rod(p, [lx, hall.postH + 0.18, ladderTop], [lx, floor + 0.16, ladderTop + ladderRun + 0.08], 0.032, C.red, 5);
    p.cyl(0.04, 0.045, 0.28, C.woodDark, lx, floor + 0.14, ladderTop + ladderRun + 0.08, undefined, 6);
    p.sphere(0.052, C.gold, lx, floor + 0.3, ladderTop + ladderRun + 0.08, [1, 1.15, 1], 6);
  }
  const roofTop = hall.postH + 0.72 + hall.roofW * 0.4 + hall.lift * (roof.lac ? 1.25 : 1) + hall.loft;

  if (level >= 2 && !roof.lac) {
    // Chim đồng hai đầu nóc.
    bird(m, hall.roofL / 2 - 0.1, roofTop + 0.05, hallZ, 1, 1.15);
    bird(m, -hall.roofL / 2 + 0.1, roofTop + 0.05, hallZ, -1, 1.15);
  }
  if (level >= 3) {
    // Đông Phối Điện (chái nhà bên phải), mái thuyền quay ngang có chim Lạc trên nóc.
    const rPost = 0.85 * s + 0.2 * up;
    stiltHall(m, { x: CHAI.x + 0.07, z: CHAI.z, w: 0.78, d: 1.32, postH: rPost, roofL: 1.64, roofW: 1.16, lift: 0.38 + 0.08 * up, ry: Math.PI / 2, roof });
    bird(m, CHAI.x + 0.07, rPost + 0.68 + 1.16 * 0.4 + 0.38 + 0.08 * up, CHAI.z + 0.72, 1, 0.55);
  }
  if (level >= 5) {
    // Mái tầng hai trên nóc Chính Điện, cổ diêm sơn đỏ chạm hoa văn, sống mái mạ đồng.
    const y2 = hall.postH + 0.72 + hall.roofW * 0.4 + 0.66 + 0.1 * up + hall.loft;
    m.band.box(hallW * 0.62, 0.28, hallD * 0.52, C.red, 0, y2 - 0.32, hallZ);
    boatRoof(m, roof, { length: hallW * 0.82, width: 1.38 + 0.08 * up, lift: 0.72 + 0.1 * up, drop: 0.5, thickness: 0.085 }, 0, y2, hallZ);
    if (roof.trim === null) p.box(hallW * 0.7, 0.07, 0.14, C.bronzeLight, 0, y2 + 0.04, hallZ);
  }
  if (level >= 6) {
    // Lan can con tiện sơn đỏ thếp vàng quanh hiên nhà chính, chừa lối cửa giữa.
    const fy = hall.postH + 0.17;
    const fz = hallZ + hallD / 2 - 0.03;
    for (const sx of [-1, 1]) {
      m.band.box(hallW / 2 - 0.35, 0.22, 0.055, C.red, sx * (hallW / 4 + 0.17), fy, fz);
      p.box(hallW / 2 - 0.33, 0.04, 0.07, C.gold, sx * (hallW / 4 + 0.17), fy + 0.11, fz);
      m.band.box(0.055, 0.22, hallD - 0.1, C.red, sx * (hallW / 2 - 0.03), fy, hallZ);
      p.box(0.07, 0.04, hallD - 0.08, C.gold, sx * (hallW / 2 - 0.03), fy + 0.11, hallZ);
    }
  }
  if (level >= 7) {
    // Tây Phối Điện (chái nhà bên trái) cân xứng hai bên.
    const lPost = 0.85 * s + 0.2 * up;
    stiltHall(m, { x: -CHAI.x - 0.07, z: CHAI.z, w: 0.78, d: 1.32, postH: lPost, roofL: 1.64, roofW: 1.16, lift: 0.38 + 0.08 * up, ry: Math.PI / 2, roof });
    bird(m, -CHAI.x - 0.07, lPost + 0.68 + 1.16 * 0.4 + 0.38 + 0.08 * up, CHAI.z + 0.72, -1, 0.55);
    // Hai cột biểu Chim Lạc ở hai góc sau: bệ đá chạm, cột gỗ lim đai đồng vàng, Chim Lạc dang cánh trên đỉnh.
    for (const sx of [-1, 1]) {
      const x = sx * COT_LAC.x;
      const z = COT_LAC.z;
      p.cyl(0.14, 0.17, 0.18, C.rockDark, x, 0.09, z, undefined, 8);
      p.cyl(0.075, 0.095, 3.2, C.woodDark, x, 1.6, z, undefined, 8);
      for (const y of [1.0, 2.0, 2.9]) p.cyl(0.105, 0.105, 0.085, C.gold, x, y, z, undefined, 8);
      birdSpread(m, x, 3.2, z, 0.82);
    }
    // Mái tầng ba trên cùng, đôi chim đồng lớn đậu hai đầu nóc.
    const y3 = hall.postH + 0.72 + hall.roofW * 0.4 + 1.28 + 0.2 * up + hall.loft;
    m.band.box(hallW * 0.44, 0.24, hallD * 0.38, C.red, 0, y3 - 0.26, hallZ);
    boatRoof(m, roof, { length: hallW * 0.62, width: 0.98 + 0.06 * up, lift: 0.58 + 0.08 * up, drop: 0.38, thickness: 0.075 }, 0, y3, hallZ, 0, true);
    if (roof.trim === null) p.box(hallW * 0.5, 0.06, 0.12, C.bronzeLight, 0, y3 + 0.03, hallZ);
    const top = y3 + 0.56;
    if (!roof.lac) bird(m, hallW * 0.3, top, hallZ, 1, 1.55);
    if (!roof.lac) bird(m, -hallW * 0.3, top, hallZ, -1, 1.55);
    if (level >= 8) {
      // Bệ Mặt Trời & Trống Đồng Ngọc Lũ tỏa hào quang vàng trên đỉnh nóc Chính Điện. Cấp 10 trống to gấp rưỡi, bốn
      // tượng cóc đồng ngồi trên mặt trống như trống đồng thật.
      const ds = level >= 10 ? 0.96 : 0.64;
      drum(m, 0, hallZ, ds, top - 0.18);
      if (level >= 10) {
        for (let i = 0; i < 4; i++) {
          const a = Math.PI / 4 + (i * Math.PI) / 2;
          frog(m, Math.sin(a) * 0.27 * ds, top - 0.18 + 0.36 * ds, hallZ + Math.cos(a) * 0.27 * ds, a, 0.7);
        }
      } else {
        p.cyl(0.055, 0.08, 0.26, C.gold, 0, top - 0.12, hallZ, undefined, 8);
        m.glow.sphere(0.085, 0xffe066, 0, top + 0.08, hallZ, [1.2, 1.2, 0.5], 8);
      }
    }
  }
}

/**
 * Cổng Nghi Môn tứ trụ (gốc ở giữa cổng, trước khi phóng `CONG_K`): hai trụ son đai vàng, hai trụ biểu, xà, hoành phi,
 * mái thuyền (cấp 6 hai tầng mái, cấp 8 chim đồng); cấp 10 thay bằng cổng thành hai tầng.
 */
function nghiMon(m: ToonModel, level: number, roof: Roof): void {
  const p = m.plain;
  if (level >= 10) {
    gateTower(m, 0, roof);
    return;
  }
  for (const sx of [-1, 1]) {
    p.cyl(0.095, 0.115, 0.12, C.rockDark, sx * 0.56, 0.06, 0, undefined, 8);
    p.cyl(0.072, 0.085, 1.52, C.red, sx * 0.56, 0.78, 0, undefined, 8);
    p.cyl(0.092, 0.092, 0.07, C.gold, sx * 0.56, 1.12, 0, undefined, 8);
    // Trụ biểu phụ hai bên cổng
    p.cyl(0.055, 0.065, 1.18, C.woodDark, sx * 0.92, 0.59, 0, undefined, 6);
    p.sphere(0.075, C.bronze, sx * 0.92, 1.22, 0, [1, 1.2, 1], 6);
  }
  p.box(1.96, 0.09, 0.14, C.woodDark, 0, 1.08, 0);
  p.box(1.48, 0.11, 0.16, C.red, 0, 1.48, 0);
  // Bảng Hoành Phi Cổng Điện viền vàng
  p.box(0.82, 0.26, 0.07, C.gold, 0, 1.3, 0.06);
  m.band.box(0.74, 0.2, 0.08, C.red, 0, 1.3, 0.065);
  boatRoof(m, roof, { length: 1.92, width: 0.66, lift: 0.26, drop: 0.22, thickness: 0.055 }, 0, 1.72, 0);
  if (level >= 6) boatRoof(m, roof, { length: 1.22, width: 0.48, lift: 0.2, drop: 0.16, thickness: 0.045 }, 0, 2.02, 0, 0, true);
  if (level >= 8) {
    bird(m, 0.86, 1.98, 0, 1, 0.5);
    bird(m, -0.86, 1.98, 0, -1, 0.5);
  }
}

/**
 * Bệ ngai ở đầu sân chầu (khối `V`): cấp 1–3 ụ đất nện trải chiếu cói; cấp 4 bệ đá ba bậc lùi dần về sau, thảm đỏ trên
 * mỗi bậc; cấp 6 mép bậc viền vàng; cấp 9 mặt bậc chạm dải hoa văn. Trả độ cao mặt bệ và tâm z của bậc trên cùng.
 */
function throneDais(m: ToonModel, v: Zone, level: number): { y: number; z: number } {
  const p = m.plain;
  const y0 = 0.05;
  if (level < 4) {
    p.box(v.w - 0.06, 0.04, v.d - 0.06, C.earthDark, v.x, y0 + 0.02, v.z);
    p.box(v.w - 0.16, 0.14, v.d - 0.16, C.earth, v.x, y0 + 0.07, v.z);
    p.box(v.w - 0.5, 0.02, v.d - 0.46, C.thatch, v.x, y0 + 0.15, v.z - 0.05);
    return { y: y0 + 0.16, z: v.z - 0.05 };
  }
  const th = 0.13;
  let z = v.z;
  for (let i = 0; i < 3; i++) {
    const w = v.w - i * 0.32;
    const d = v.d - i * 0.3;
    z = v.z - i * 0.1;
    (level >= 9 ? m.band : p).box(w, th, d, i % 2 ? C.rockDark : C.rock, v.x, y0 + th * (i + 0.5), z);
    p.box(0.52, 0.014, 0.16, C.red, v.x, y0 + th * (i + 1) + 0.007, z + d / 2 - 0.09);
    if (level >= 6) p.box(w + 0.02, 0.03, 0.03, C.gold, v.x, y0 + th * (i + 1), z + d / 2);
  }
  return { y: y0 + th * 3, z };
}

/**
 * Ngai vàng (gốc ở giữa mặt bệ dưới ngai): chân đế son thếp vàng, đệm đỏ, tựa lưng cao gắn mặt trời trống đồng như
 * hào quang sau đầu vua, tay ngai đầu chim, bệ để chân; cấp 7 chim Lạc dang cánh trên đỉnh tựa. Trả độ cao mặt đệm.
 */
function throne(m: ToonModel, y0: number, z: number, level: number): number {
  const p = m.plain;
  const seat = y0 + 0.37;
  p.box(0.82, 0.05, 0.6, C.gold, 0, y0 + 0.025, z);
  m.band.box(0.74, 0.26, 0.52, C.red, 0, y0 + 0.18, z);
  p.box(0.82, 0.06, 0.6, C.gold, 0, seat - 0.07, z);
  p.box(0.66, 0.04, 0.5, C.red, 0, seat - 0.02, z + 0.02);
  // Tựa lưng: khung vàng, lòng son hoa văn, mặt trời trống đồng viền vàng.
  p.box(0.86, 1.2, 0.09, C.gold, 0, seat + 0.56, z - 0.32);
  m.band.box(0.64, 0.92, 0.1, C.red, 0, seat + 0.5, z - 0.315);
  m.drum.cyl(0.27, 0.27, 0.04, 0xffffff, 0, seat + 0.92, z - 0.26, [Math.PI / 2, 0, 0], 20);
  p.add(new THREE.TorusGeometry(0.28, 0.028, 6, 22), C.gold, 0, seat + 0.92, z - 0.255);
  for (const sx of [-1, 1]) {
    // Trụ tựa đầu tròn vàng, tay ngai, đầu chim nhìn ra trước.
    p.cyl(0.05, 0.055, 1.28, C.gold, sx * 0.43, seat + 0.58, z - 0.32, undefined, 8);
    p.sphere(0.075, C.gold, sx * 0.43, seat + 1.25, z - 0.32, [1, 1.15, 1], 8);
    p.box(0.08, 0.06, 0.56, C.gold, sx * 0.4, seat + 0.2, z);
    p.box(0.07, 0.22, 0.07, C.goldDark, sx * 0.4, seat + 0.08, z + 0.25);
    p.sphere(0.055, C.gold, sx * 0.4, seat + 0.26, z + 0.29, [0.85, 1, 1.3], 7);
    p.cone(0.022, 0.07, C.goldDark, sx * 0.4, seat + 0.25, z + 0.36, [Math.PI / 2, 0, 0], 5);
  }
  p.box(0.54, 0.1, 0.24, C.red, 0, y0 + 0.05, z + 0.44);
  p.box(0.56, 0.025, 0.26, C.gold, 0, y0 + 0.1, z + 0.44);
  if (level >= 7) birdSpread(m, 0, seat + 1.17, z - 0.32, 0.42);
  return seat;
}

/** Lọng che sau ngai (từ cấp 3): cán gỗ, tán son (cấp 6 tán vàng), diềm hoa văn, núm vàng. Tán cao quá mũ lông chim của vua. */
function parasol(m: ToonModel, y0: number, z: number, level: number): void {
  const p = m.plain;
  const gold = level >= 6;
  const h = 2.62;
  p.cyl(0.03, 0.036, h, C.woodDark, 0, y0 + h / 2, z, undefined, 6);
  p.cone(0.8, 0.34, gold ? C.gold : C.red, 0, y0 + h + 0.13, z, undefined, 16);
  m.band.cyl(0.8, 0.8, 0.14, gold ? C.red : C.gold, 0, y0 + h - 0.1, z, undefined, 16);
  p.sphere(0.06, C.gold, 0, y0 + h + 0.32, z, [1, 1.3, 1], 8);
}

/** Đôi quạt lông chim cán dài đứng hai bên sau ngai (từ cấp 5). */
function featherFans(m: ToonModel, y0: number, z: number): void {
  const p = m.plain;
  for (const sx of [-1, 1]) {
    const x = sx * 0.66;
    p.cyl(0.022, 0.026, 1.95, C.woodDark, x, y0 + 0.98, z, undefined, 6);
    p.cyl(0.32, 0.32, 0.03, C.cream, x, y0 + 2.0, z, [Math.PI / 2, 0, 0], 14);
    m.band.cyl(0.21, 0.21, 0.036, C.red, x, y0 + 2.0, z + 0.005, [Math.PI / 2, 0, 0], 12);
    p.sphere(0.05, C.gold, x, y0 + 2.0, z + 0.03, [1, 1, 0.7], 7);
  }
}

/** Voi đá trên bệ, đầu quay ra cổng (từ cấp 5; cấp 8 phủ yên gấm vàng). */
function stoneElephant(m: ToonModel, x: number, z: number, level: number): void {
  const p = m.plain;
  p.box(0.66, 0.14, 0.98, C.rockDark, x, 0.12, z);
  p.box(0.7, 0.03, 1.02, C.rock, x, 0.2, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.cyl(0.075, 0.085, 0.36, C.rock, x + sx * 0.15, 0.38, z + sz * 0.24, undefined, 7);
  p.sphere(0.3, C.rock, x, 0.68, z, [0.9, 0.85, 1.35], 10);
  p.sphere(0.2, C.rock, x, 0.82, z + 0.4, [1, 1, 0.95], 9);
  for (const sx of [-1, 1]) {
    p.sphere(0.15, C.rockDark, x + sx * 0.18, 0.82, z + 0.33, [0.25, 1, 0.8], 7);
    p.cone(0.028, 0.2, C.cream, x + sx * 0.08, 0.66, z + 0.56, [1.2, 0, 0], 5);
  }
  rod(p, [x, 0.76, z + 0.55], [x, 0.36, z + 0.66], 0.048, C.rock, 6);
  if (level >= 8) {
    m.band.box(0.5, 0.06, 0.5, C.gold, x, 0.95, z - 0.04);
    p.box(0.52, 0.22, 0.03, C.red, x, 0.84, z - 0.3);
  } else m.band.box(0.46, 0.05, 0.46, C.red, x, 0.94, z - 0.04);
}

export function makeDien(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = DIEN_LOT;
  const roof = roofFor(level);

  yard(m, 10);
  // Viền đá bao sân chầu từ cấp 2
  if (level >= 2) {
    for (const sd of [-1, 1]) {
      p.box(9.86, 0.04, 0.08, C.rockDark, 0, 0.045, sd * 4.9);
      p.box(0.08, 0.04, 9.86, C.rockDark, sd * 4.9, 0.045, 0);
    }
  }
  if (level < 4) {
    // Chưa có rào: bốn cọc mốc tre buộc vải đỏ ở bốn góc đánh dấu đất của Điện.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        p.cyl(0.045, 0.055, 0.8, C.bamboo, sx * 4.6, 0.4, sz * 4.6, undefined, 6);
        p.cyl(0.058, 0.058, 0.04, C.bronze, sx * 4.6, 0.76, sz * 4.6, undefined, 6);
        m.band.box(0.05, 0.24, 0.16, C.red, sx * 4.6, 0.64, sz * 4.6 + 0.08);
      }
    }
  }

  scaled(m, 0, KHOI_Z, KHOI_K, () => palaceBlock(m, level));

  // Lối Thần Đạo giữa sân từ chân bệ ngai ra cổng: đất nện viền gỗ tới cấp 3, lát đá xanh viền đồng/đỏ từ cấp 4.
  const v = L.zone('V');
  const gate = L.zone('G');
  const pathZ0 = v.z + v.d / 2;
  const pathZ1 = gate.z + gate.d / 2 - 0.03;
  const mid = (pathZ0 + pathZ1) / 2;
  if (level < 4) {
    p.box(0.92, 0.035, pathZ1 - pathZ0, C.earth, 0, 0.055, mid);
    for (const sx of [-1, 1]) p.box(0.05, 0.045, pathZ1 - pathZ0, C.woodDark, sx * 0.48, 0.06, mid);
  } else {
    const slabs = 8;
    const len = (pathZ1 - pathZ0) / slabs;
    for (let i = 0; i < slabs; i++) {
      const sz = pathZ0 + len * (i + 0.5);
      p.box(1.0, 0.055, len - 0.03, i % 2 ? C.rock : C.rockDark, 0, 0.065, sz);
      p.box(0.46, 0.06, len - 0.06, C.bronze, 0, 0.066, sz);
    }
    for (const sx of [-1, 1]) p.box(0.07, 0.07, pathZ1 - pathZ0, level >= 6 ? C.gold : C.red, sx * 0.53, 0.07, mid);
  }

  // Bệ ngai, ngai vàng, lọng, quạt lông chim. Vua Hùng ngồi trên ngai (thêm vào sau, xem cuối hàm).
  const dais = throneDais(m, v, level);
  const tz = dais.z - 0.05;
  const seat = throne(m, dais.y, tz, level);
  if (level >= 3) parasol(m, dais.y, tz - 0.42, level);
  if (level >= 5) featherFans(m, dais.y, tz - 0.3);

  if (level >= 2) {
    // Cờ đại hồng kỳ hai bên sân; trống đồng đặt trên giá chạm khắc.
    for (const f of L.groups('2')) banner(m, f.x - 0.2, f.z, bannerHeight(level), C.red);
    const drums = L.groups('D');
    const big = level >= 5;
    for (const d of big ? drums : drums.slice(1)) {
      for (const sx of [-1, 1]) {
        p.box(0.07, 0.3, 0.08, C.red, d.x + sx * 0.32, 0.15, d.z);
        p.box(0.09, 0.05, 0.12, C.bronze, d.x + sx * 0.32, 0.3, d.z);
      }
      p.box(0.72, 0.065, 0.14, C.woodDark, d.x, 0.28, d.z);
      drum(m, d.x, d.z, big ? 1.08 : 0.88, 0.31);
    }
  }
  if (level >= 4) {
    // Hàng rào cột chạm quanh móng, Cổng Nghi Môn giữa mặt trước.
    postFence(m, 4.95, 1.3 * CONG_K);
    scaled(m, 0, gate.z + 0.1, CONG_K, () => nghiMon(m, level, roof));
  }
  if (level >= 5) for (const e of L.groups('v')) stoneElephant(m, e.x, e.z, level);
  if (level >= 6) {
    // Hai lầu trống đồng ở hai góc trước sân.
    for (const t of L.groups('L')) scaled(m, t.x, t.z, 1.25, () => drumTower(m, 0, 0, 0, roof, level >= 8));
  }

  const g = m.group();
  const king = bakeVuaHung();
  king.position.set(0, seat - VUA_SEAT, tz + 0.08);
  g.add(king);
  return g;
}

export const DIEN: CongTrinh = { tiles: 10, make: makeDien, spots: dienSpots, view: { half: 10, lookY: 3.4, px: 26 } };
