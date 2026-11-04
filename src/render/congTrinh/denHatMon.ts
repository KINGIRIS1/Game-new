// Đền Hát Môn 4×4: thờ Hai Bà Trưng, nơi Hai Bà tế cờ khởi nghĩa. Đền nền đá hai bậc, mái cong hai tầng lợp ngói viền
// đồng vàng, chim Lạc đồng hai đầu nóc; sân lát đá trước đền có đàn tế đắp đất với cột cờ đỏ, lư hương đồng trước
// thềm; hai voi đá quỳ hai bên sân; cây đa cổ thụ góc sau bên trái, bụi tre góc sau bên phải. Bản vẽ ở
// docs/bo-cuc-cong-trinh.md. Một cấp, dựng một lần như các đền.

import * as THREE from 'three';
import { boatRoof, TILE, TILE_DARK, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { seeded } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, rod } from './chung';

export const DEN_HAT_MON_LOT = new Lot(4, [
  'TTHHHH.B',
  'TTHHHH.B',
  'TTHHHH..',
  '..NNNN..',
  '...LL...',
  'VV.DD.VV',
  'VV.DD.VV',
  '...,,...',
]);

/** Cỏ trong khuôn viên đền; đá lát sân, đá nền đền; đá tạc voi (sáng, sẫm). */
const LAWN = 0x93a85a;
const PAVE = [0xc2b8a4, 0xb3a895] as const;
const STONE = 0xa39a8c;
const STONE_DARK = 0x7f766a;
const STONE_LIGHT = 0xc4bcae;
/** Mặt sân lát đá. */
const YARD_Y = 0.06;
/** Mặt nền đền: hai bậc đá. */
const FLOOR_Y = 0.3;
const COL_H = 0.6;
/** Mái dưới ngói viền đồng vàng; mái trên thêm chim Lạc đồng hai đầu nóc. */
const LOWER: Roof = { main: TILE, dark: TILE_DARK, trim: C.gold };
const UPPER: Roof = { main: TILE, dark: TILE_DARK, trim: C.gold, lac: true };

/** Vẽ trong khung riêng: gốc ở (x, y, z), xoay `ry` quanh trục đứng, phóng `s` lần (như `lacBird`). */
function framed(m: ToonModel, x: number, y: number, z: number, ry: number, s: number, draw: () => void): void {
  const f = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s));
  m.plain.frame = m.band.frame = f;
  draw();
  m.plain.frame = m.band.frame = null;
}

/** Khối chóp cụt đáy `w`×`d`, cao `h`, mặt trên thu còn `k` lần đáy, đáy ở `y` (nền đắp). */
function mound(m: ToonModel, w: number, d: number, h: number, k: number, color: number, x: number, y: number, z: number): void {
  const geo = new THREE.BoxGeometry(w, h, d);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) <= 0) continue;
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
  }
  geo.computeVertexNormals();
  m.plain.add(geo, color, x, y + h / 2, z);
}

/** Sân lát đá từ thềm đền ra cổng, phiến đá hai màu so le; lối vào ở mặt trước. */
function yard(m: ToonModel): void {
  const p = m.plain;
  p.box(4 - 0.06, 0.04, 4 - 0.06, LAWN, 0, 0.02, 0);
  const N = DEN_HAT_MON_LOT.zone('N');
  const P = DEN_HAT_MON_LOT.zone(',');
  const x0 = N.x - N.w / 2;
  const z0 = N.z - N.d / 2;
  const z1 = P.z + P.d / 2;
  const cols = 4;
  const rows = 9;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const w = N.w / cols;
      const d = (z1 - z0) / rows;
      p.box(w - 0.04, 0.03, d - 0.04, PAVE[(i + j) % 2], x0 + (i + 0.5) * w, 0.045, z0 + (j + 0.5) * d);
    }
  }
  // Viền đá hai bên sân.
  for (const s of [-1, 1]) p.box(0.06, 0.06, z1 - z0, STONE_DARK, s * (N.w / 2 + 0.03), 0.03, (z0 + z1) / 2);
}

/**
 * Đền thờ Hai Bà: nền đá hai bậc có bậc lên giữa thềm, tám cột son trên chân đá, vách gỗ dải hoa văn, cửa giữa có mặt
 * trống đồng trên trán, mái cong hai tầng lợp ngói viền đồng vàng (tầng trên trên gác lửng), chim Lạc đồng hai đầu nóc.
 */
function temple(m: ToonModel): void {
  const p = m.plain;
  const H = DEN_HAT_MON_LOT.zone('H');
  const N = DEN_HAT_MON_LOT.zone('N');
  const x = H.x;
  const z = H.z + 0.05;
  // Nền đá hai bậc phủ cả đền và thềm; bậc lên ở giữa thềm.
  const baseD = H.d + N.d;
  const baseZ = (H.z - H.d / 2 + N.z + N.d / 2) / 2;
  p.box(H.w + 0.16, 0.16, baseD, STONE_DARK, x, 0.08, baseZ);
  p.box(H.w - 0.06, 0.14, H.d + 0.1, STONE, x, 0.23, z);
  p.box(H.w - 0.02, 0.03, H.d + 0.14, STONE_LIGHT, x, FLOOR_Y - 0.01, z);
  for (let i = 0; i < 3; i++) p.box(0.74 - i * 0.06, 0.08, 0.16, i % 2 ? STONE : STONE_LIGHT, x, 0.2 - i * 0.07, z + H.d / 2 + 0.1 + i * 0.13);
  // Cột son trên chân đá, vách gỗ có dải hoa văn, xà son.
  const w = 1.72;
  const d = 1.0;
  for (const cx of [-w / 2, -w / 6, w / 6, w / 2]) {
    for (const cz of [-d / 2, d / 2]) {
      p.cyl(0.07, 0.085, 0.06, STONE_DARK, x + cx, FLOOR_Y + 0.03, z + cz, undefined, 8);
      p.cyl(0.05, 0.058, COL_H, C.red, x + cx, FLOOR_Y + COL_H / 2, z + cz, undefined, 8);
    }
  }
  m.band.box(w - 0.22, COL_H - 0.12, d - 0.2, C.woodLight, x, FLOOR_Y + COL_H / 2 + 0.02, z);
  p.box(0.36, 0.4, 0.03, 0x22140c, x, FLOOR_Y + 0.2, z + d / 2 - 0.09);
  m.drum.cyl(0.11, 0.11, 0.03, 0xffffff, x, FLOOR_Y + COL_H - 0.08, z + d / 2 - 0.09, [Math.PI / 2, 0, 0], 14);
  p.box(w + 0.1, 0.07, d + 0.1, C.red, x, FLOOR_Y + COL_H, z);
  // Mái dưới.
  const lowY = FLOOR_Y + COL_H + 0.4;
  boatRoof(m, LOWER, { length: w + 0.72, width: d + 0.62, lift: 0.26, drop: 0.38, thickness: 0.07 }, x, lowY, z);
  // Gác lửng: vách gỗ son thấp có hàng ô cửa, đỡ mái trên.
  const loftY = lowY - 0.06;
  p.box(1.02, 0.3, 0.5, C.red, x, loftY + 0.15, z);
  for (let i = 0; i < 4; i++) p.box(0.14, 0.12, 0.02, 0x22140c, x - 0.36 + i * 0.24, loftY + 0.16, z + 0.26);
  boatRoof(m, UPPER, { length: 1.56, width: 0.9, lift: 0.28, drop: 0.26, thickness: 0.06 }, x, loftY + 0.3 + 0.27, z);
}

/**
 * Đàn tế đắp đất giữa sân, nơi Hai Bà tế cờ: nền đất hai tầng có bậc đất mặt trước, cột cờ son cao giữa đàn, cờ đỏ
 * thắm lớn viền vàng, trống đồng và mâm lễ trên đàn, phướn đỏ, phướn vàng hai góc sau.
 */
function danTe(m: ToonModel): void {
  const p = m.plain;
  const D = DEN_HAT_MON_LOT.zone('D');
  const { x, z } = D;
  mound(m, 0.94, 0.9, 0.16, 0.88, C.earth, x, 0.04, z);
  p.box(0.82, 0.02, 0.78, C.earthDark, x, 0.205, z);
  mound(m, 0.58, 0.54, 0.14, 0.84, 0xb88f5c, x, 0.2, z - 0.04);
  p.box(0.48, 0.02, 0.44, C.soil, x, 0.345, z - 0.04);
  for (let k = 0; k < 2; k++) p.box(0.3, 0.07, 0.1, k ? C.earthDark : C.earth, x, 0.075 + k * 0.08, z + 0.5 - k * 0.09);
  // Cột cờ son, ngọn đồng, cờ đỏ lớn viền vàng bay về bên phải.
  const poleH = 2.0;
  m.band.cyl(0.026, 0.034, poleH, C.red, x, 0.35 + poleH / 2, z - 0.14, undefined, 6);
  p.cone(0.045, 0.14, C.bronze, x, 0.35 + poleH + 0.07, z - 0.14, undefined, 5);
  const fy = 0.35 + poleH - 0.26;
  m.band.box(0.6, 0.4, 0.025, C.trungRed, x + 0.32, fy, z - 0.14);
  for (const dy of [-0.2, 0.2]) p.box(0.62, 0.045, 0.03, C.trungYellow, x + 0.32, fy + dy, z - 0.14);
  p.box(0.045, 0.44, 0.03, C.trungYellow, x + 0.63, fy, z - 0.14);
  // Trống đồng nhỏ và mâm lễ trên đàn.
  m.drum.cyl(0.09, 0.09, 0.02, 0xffffff, x - 0.13, 0.43, z + 0.06, undefined, 12);
  p.cyl(0.09, 0.075, 0.08, C.bronzeDark, x - 0.13, 0.39, z + 0.06, undefined, 12);
  p.cyl(0.08, 0.08, 0.02, C.woodDark, x + 0.13, 0.365, z + 0.08, undefined, 10);
  p.sphere(0.03, C.red, x + 0.1, 0.39, z + 0.08, [1, 0.8, 1], 6);
  p.sphere(0.028, C.gold, x + 0.16, 0.39, z + 0.06, [1, 0.8, 1], 6);
  // Phướn đỏ, phướn vàng ở hai góc sau đàn.
  for (const s of [-1, 1]) {
    p.cyl(0.012, 0.014, 0.6, C.woodDark, x + s * 0.4, 0.2 + 0.3, z - 0.36, undefined, 4);
    p.box(0.07, 0.26, 0.012, s < 0 ? C.red : C.trungYellow, x + s * 0.4 + 0.045, 0.66, z - 0.36);
  }
}

/**
 * Voi đá quỳ trên bệ đá: thân tròn, hai chân sau xếp dưới hông, hai chân trước duỗi ra trước, đầu cúi, tai lớn áp hai
 * bên, vòi cuộn chạm bệ, ngà ngắn, tấm vải bành chạm nổi trên lưng. Nhìn về +z trong khung riêng.
 */
function stoneElephant(m: ToonModel, x: number, z: number, ry: number): void {
  const p = m.plain;
  framed(m, x, 0, z, ry, 1.2, () => {
    p.box(0.5, 0.1, 0.84, STONE_DARK, 0, 0.05, 0);
    p.box(0.54, 0.03, 0.88, STONE, 0, 0.1, 0);
    const y = 0.11;
    p.sphere(0.2, STONE, 0, y + 0.19, -0.05, [0.95, 0.86, 1.4], 10);
    for (const s of [-1, 1]) {
      p.sphere(0.1, STONE, s * 0.13, y + 0.1, -0.2, [0.8, 0.75, 1.3], 8);
      p.box(0.085, 0.07, 0.26, STONE_DARK, s * 0.08, y + 0.035, 0.2);
      p.sphere(0.045, STONE_DARK, s * 0.08, y + 0.04, 0.33, [1, 0.8, 1], 6);
      // Tai lớn áp hai bên đầu.
      p.sphere(0.11, STONE_DARK, s * 0.13, y + 0.3, 0.2, [0.32, 1, 0.85], 8);
      // Ngà ngắn chĩa ra trước.
      p.cone(0.02, 0.12, STONE_LIGHT, s * 0.05, y + 0.18, 0.37, [1.9, 0, -s * 0.2], 5);
      p.sphere(0.018, 0x3a342c, s * 0.08, y + 0.34, 0.33, [1, 1, 0.6], 5);
    }
    p.sphere(0.13, STONE, 0, y + 0.3, 0.26, [1, 1, 0.9], 9);
    for (const s of [-1, 1]) p.sphere(0.055, STONE_LIGHT, s * 0.05, y + 0.4, 0.27, [1, 0.9, 0.9], 6);
    // Vòi cuộn xuống chạm bệ.
    rod(p, [0, y + 0.26, 0.36], [0, y + 0.15, 0.43], 0.045, STONE, 6);
    rod(p, [0, y + 0.15, 0.43], [0, y + 0.05, 0.42], 0.038, STONE, 6);
    rod(p, [0, y + 0.05, 0.42], [0, y + 0.03, 0.34], 0.03, STONE, 5);
    // Vải bành chạm nổi trên lưng, đường viền hoa văn.
    p.box(0.38, 0.02, 0.32, STONE_DARK, 0, y + 0.36, -0.05);
    m.band.box(0.4, 0.03, 0.04, STONE_LIGHT, 0, y + 0.37, 0.11);
    m.band.box(0.4, 0.03, 0.04, STONE_LIGHT, 0, y + 0.37, -0.21);
    rod(p, [0, y + 0.22, -0.3], [0, y + 0.06, -0.37], 0.016, STONE_DARK, 4);
  });
}

/** Lư hương đồng ba chân trên trụ đá trước thềm: nắp chóp có núm, hai quai, nén hương đỏ lửa. */
function censer(m: ToonModel): void {
  const p = m.plain;
  const L = DEN_HAT_MON_LOT.zone('L');
  const { x, z } = L;
  p.box(0.3, 0.16, 0.3, STONE, x, YARD_Y + 0.08, z);
  p.box(0.34, 0.03, 0.34, STONE_DARK, x, YARD_Y + 0.17, z);
  const y = YARD_Y + 0.185;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    p.cyl(0.014, 0.018, 0.08, C.bronzeDark, x + Math.cos(a) * 0.08, y + 0.04, z + Math.sin(a) * 0.08, undefined, 5);
  }
  m.band.cyl(0.13, 0.095, 0.13, C.bronze, x, y + 0.14, z, undefined, 12);
  p.cyl(0.145, 0.145, 0.025, C.bronzeLight, x, y + 0.21, z, undefined, 12);
  for (const s of [-1, 1]) p.box(0.04, 0.07, 0.025, C.bronzeLight, x + s * 0.15, y + 0.23, z);
  p.cone(0.1, 0.1, C.bronze, x, y + 0.27, z, undefined, 10);
  p.sphere(0.025, C.bronzeLight, x, y + 0.33, z, [1, 1, 1], 6);
  for (const dx of [-0.05, 0, 0.05]) {
    p.cyl(0.007, 0.007, 0.2, C.woodDark, x + dx, y + 0.3, z + 0.08, [0.15, 0, dx * 2], 4);
    m.glow.sphere(0.014, C.ember, x + dx * 1.3, y + 0.4, z + 0.095, [1, 1, 1], 5);
  }
}

/**
 * Cây đa cổ thụ góc sau bên trái: gốc to bành rễ, thân xoắn hai nhánh, rễ phụ buông từ cành xuống đất, tán lá xòe
 * thành nhiều vòm; vòng đá kè quanh gốc, dải vải đỏ buộc thân.
 */
function banyan(m: ToonModel): void {
  const p = m.plain;
  const T = DEN_HAT_MON_LOT.zone('T');
  const x = T.x - 0.05;
  const z = T.z - 0.05;
  const rand = seeded(731);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.sphere(0.06, i % 2 ? C.rock : C.rockDark, x + Math.cos(a) * 0.34, 0.07, z + Math.sin(a) * 0.34, [1.3, 0.7, 1.1], 6);
  }
  p.cyl(0.3, 0.32, 0.05, C.soil, x, 0.05, z, undefined, 12);
  p.cyl(0.13, 0.22, 1.0, C.trunk, x, 0.55, z, undefined, 9);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    rod(p, [x + Math.cos(a) * 0.1, 0.42, z + Math.sin(a) * 0.1], [x + Math.cos(a) * 0.3, 0.04, z + Math.sin(a) * 0.3], 0.05, 0x5c3b22, 6);
  }
  m.band.cyl(0.155, 0.16, 0.06, C.red, x, 0.62, z, undefined, 9);
  // Hai nhánh lớn chĩa ra, rễ phụ buông xuống.
  const arms: [number, number, number][] = [
    [-0.5, 1.45, -0.25],
    [0.25, 1.5, 0.35],
    [-0.1, 1.55, -0.45],
  ];
  for (const [dx, y, dz] of arms) {
    rod(p, [x, 0.95, z], [x + dx, y, z + dz], 0.065, C.trunk, 6);
    rod(p, [x + dx * 0.8, y - 0.05, z + dz * 0.8], [x + dx * 0.85, 0.03, z + dz * 0.85], 0.014, 0x7a5232, 4);
  }
  // Tán lá: nhiều vòm xòe rộng, thấp dần ra mép.
  const crowns: [number, number, number, number][] = [
    [0, 1.75, 0, 0.5],
    [-0.42, 1.55, -0.2, 0.4],
    [0.32, 1.6, 0.28, 0.4],
    [-0.15, 1.62, -0.45, 0.38],
    [0.2, 1.5, -0.3, 0.34],
    [-0.4, 1.5, 0.3, 0.34],
    [0.05, 1.98, 0.05, 0.34],
  ];
  crowns.forEach(([dx, y, dz, r], i) => p.sphere(r, C.leaf[(i + Math.floor(rand() * 4)) % 4], x + dx, y, z + dz, [1.3, 0.62, 1.2], 9));
}

/** Bụi tre góc sau bên phải: thân tre chụm hơi xòe, ngọn rủ lá. */
function bamboo(m: ToonModel): void {
  const p = m.plain;
  const B = DEN_HAT_MON_LOT.zone('B');
  const rand = seeded(907);
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.16;
    const bx = B.x + Math.cos(a) * r;
    const bz = B.z + Math.sin(a) * r * 1.6;
    const h = 1.1 + rand() * 0.5;
    const top: [number, number, number] = [bx + (bx - B.x) * 0.8 - 0.06, h, bz + (bz - B.z) * 0.4];
    rod(p, [bx, 0, bz], top, 0.024, i % 3 ? C.bamboo : 0x9fb85a, 5);
    for (let k = 0; k < 3; k++) p.sphere(0.11 + rand() * 0.04, C.leaf[(i + k) % 4], top[0] + (rand() - 0.5) * 0.18, h - 0.08 - k * 0.2, top[2] + (rand() - 0.5) * 0.16, [1.3, 0.5, 1.1], 6);
  }
}

export function makeDenHatMon(): THREE.Group {
  const m = new ToonModel();
  yard(m);
  temple(m);
  danTe(m);
  censer(m);
  const [left, right] = DEN_HAT_MON_LOT.groups('V');
  // Hai voi đá quỳ hai bên sân, quay chếch vào lối giữa.
  stoneElephant(m, left.x + 0.1, left.z - 0.05, 0.55);
  stoneElephant(m, right.x - 0.1, right.z - 0.05, -0.55);
  banyan(m);
  bamboo(m);
  return m.group();
}

/** Thầy cúng (Lạc hầu) đứng khấn bên trái lư hương, quay vào đền; một người dâng lễ bên đàn tế. */
export function denHatMonSpots(): LotSpot[] {
  const L = DEN_HAT_MON_LOT.zone('L');
  const D = DEN_HAT_MON_LOT.zone('D');
  return [
    { job: 'lacHau', x: L.x - 0.38, y: YARD_Y, z: L.z + 0.14, ry: Math.PI - 0.4 },
    { job: 'phuNu', x: D.x - 0.72, y: YARD_Y, z: D.z + 0.2, ry: Math.PI / 2 + 0.2 },
  ];
}

export const DEN_HAT_MON: CongTrinh = { tiles: 4, make: makeDenHatMon, spots: denHatMonSpots, view: { half: 3.4, lookY: 0.9, px: 60 } };
