// Đền Rồng Tiên 8×8: thờ Lạc Long Quân và Âu Cơ, tổ tiên các vua Hùng. Một đền, hai nửa: đền chính lùi về sau giữa
// móng, mái cong hai tầng lợp ngói viền đồng vàng, chim Lạc hai đầu nóc; trước thềm là tượng Lạc Long Quân (bên hồ) và
// tượng Âu Cơ (bên núi) trên bệ đá; giữa sân là bọc trăm trứng bằng đá trong chậu hoa sen; lư hương đồng trước thềm.
// Nửa trái là hồ có rồng xanh uốn mình nhô khỏi mặt nước, đầu ngẩng giỡn ngọc (cha xuống biển); nửa phải là ba ngọn núi,
// chim tiên trắng dang cánh trên đỉnh cao nhất, mây vờn quanh (mẹ lên núi). Lối đá ra cổng hai cột chim Lạc, cờ xanh
// nước bên trái, cờ vàng núi bên phải, hai trống đồng trên giá. Bản vẽ ở docs/bo-cuc-cong-trinh.md. Một cấp, dựng một
// lần như các đền.

import * as THREE from 'three';
import { banner, boatRoof, drum, TILE, TILE_DARK, type Roof } from '../buildings';
import { bakeAuCo, bakeLacLongQuan } from '../heroes';
import { Lot } from '../lot';
import { C } from '../palette';
import { ShapeBuilder, seeded } from '../shapes';
import { ToonModel, toon } from '../toon';
import { type CongTrinh, type LotSpot, rod } from './chung';
import { LAKE_WATER_Y, along, gate, lakeOutline, lotus, offset, slab } from './hoKimQuy';

export const DEN_RONG_TIEN_LOT = new Lot(8, [
  'BB~~.HHHHHH.MMMM',
  'BB~~.HHHHHH.MMMM',
  '~RR~.HHHHHH.MPPM',
  '~RR~.HHHHHH.MPPM',
  '~RR~.NNNNNN.MMMM',
  '~RR~.NNNNNN..MMM',
  '~RR~QQ....AA..MM',
  'SS~~QQ....AA..hh',
  'SS~....LL....hhh',
  '~~~..........hh.',
  '~~.....OO.......',
  '.......OO.......',
  '.F.....,,.....F.',
  'DD...7.,,.7...DD',
  'DD...7.,,.7...DD',
  '.......,,.......',
]);

/** Ô con thuộc mặt hồ: nước, rồng, sen. */
const LAKE_CELLS = '~RS';

/** Cỏ trong khuôn viên đền; đá lát sân hai màu, đá nền đền (sáng, sẫm). */
const LAWN = 0x93a85a;
const PAVE = [0xc2b8a4, 0xb3a895] as const;
const STONE = 0xa39a8c;
const STONE_DARK = 0x7f766a;
const STONE_LIGHT = 0xc4bcae;
const WATER = 0x5aa6bc;
const WATER_DEEP = 0x3f8aa2;
const RIPPLE = 0xa9d8e6;
const RIM_Y = 0.1;
/** Mặt sân lát đá. */
const YARD_Y = 0.06;
/** Mặt nền đền: hai bậc đá. */
const FLOOR_Y = 0.42;
const COL_H = 0.84;
/** Rồng: mình xanh lục, sống lưng sẫm, bụng vàng nhạt, vây đỏ, sừng vàng. */
const DRAGON = 0x3f9a5a;
const DRAGON_DARK = 0x2c7444;
const DRAGON_BELLY = 0xd8c878;
const PEARL = 0xffe9a0;
/** Chim tiên trắng, viền vàng; mây trắng. */
const FAIRY = 0xf8f4ea;
const CLOUD = 0xf4f1e6;
/** Bọc trăm trứng: trứng trắng ngà, chậu đá hoa sen hồng nhạt. */
const EGG = [0xf8f2e4, 0xf1e6c8] as const;
const LOTUS_STONE = 0xd8b8b0;
const LOTUS_STONE_DARK = 0xb89890;
/** Mái dưới ngói viền đồng vàng; mái trên thêm chim Lạc đồng hai đầu nóc. */
const LOWER: Roof = { main: TILE, dark: TILE_DARK, trim: C.gold };
const UPPER: Roof = { main: TILE, dark: TILE_DARK, trim: C.gold, lac: true };

/** Vẽ trong khung riêng: gốc ở (x, y, z), xoay `ry` quanh trục đứng, phóng `s` lần. */
function framed(m: ToonModel, x: number, y: number, z: number, ry: number, s: number, draw: () => void): void {
  const f = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s));
  m.plain.frame = m.band.frame = m.glow.frame = f;
  draw();
  m.plain.frame = m.band.frame = m.glow.frame = null;
}

/** Sân lát đá trước đền (quanh hai tượng, bọc trứng) và lối đá ra cổng. */
function yard(m: ToonModel): void {
  const p = m.plain;
  p.box(8 - 0.06, 0.04, 8 - 0.06, LAWN, 0, 0.02, 0);
  const N = DEN_RONG_TIEN_LOT.zone('N');
  const Q = DEN_RONG_TIEN_LOT.zone('Q');
  const A = DEN_RONG_TIEN_LOT.zone('A');
  const O = DEN_RONG_TIEN_LOT.zone('O');
  const P = DEN_RONG_TIEN_LOT.zone(',');
  // Sân rộng từ thềm tới hết bọc trứng, ngang từ bệ tượng này sang bệ tượng kia.
  const x0 = Q.x - Q.w / 2;
  const x1 = A.x + A.w / 2;
  const z0 = N.z + N.d / 2;
  const z1 = O.z + O.d / 2 + 0.25;
  const cols = 8;
  const rows = 7;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const w = (x1 - x0) / cols;
      const d = (z1 - z0) / rows;
      p.box(w - 0.04, 0.03, d - 0.04, PAVE[(i + j) % 2], x0 + (i + 0.5) * w, 0.045, z0 + (j + 0.5) * d);
    }
  }
  for (const x of [x0, x1]) p.box(0.06, 0.06, z1 - z0, STONE_DARK, x, 0.03, (z0 + z1) / 2);
  p.box(x1 - x0 + 0.06, 0.06, 0.06, STONE_DARK, (x0 + x1) / 2, 0.03, z1);
  // Lối đá từ sân ra cổng.
  const n = 6;
  const pz0 = z1;
  const pz1 = P.z + P.d / 2;
  for (let i = 0; i < n; i++) {
    const d = (pz1 - pz0) / n;
    p.box(P.w - 0.1, 0.03, d - 0.06, i % 2 ? C.rock : PAVE[1], P.x, 0.045, pz0 + (i + 0.5) * d);
  }
}

/**
 * Đền chính: nền đá hai bậc phủ cả đền và thềm, ba bậc đá lên giữa thềm có lan can rồng; mười cột son trên chân đá,
 * vách gỗ dải hoa văn, cửa giữa có mặt trống đồng trên trán, xà son; mái cong hai tầng lợp ngói viền đồng vàng, tầng
 * trên đặt trên gác lửng có hàng ô cửa, chim Lạc đồng hai đầu nóc.
 */
function temple(m: ToonModel): void {
  const p = m.plain;
  const H = DEN_RONG_TIEN_LOT.zone('H');
  const N = DEN_RONG_TIEN_LOT.zone('N');
  const x = H.x;
  const z = H.z + 0.08;
  const baseD = H.d + N.d;
  const baseZ = (H.z - H.d / 2 + N.z + N.d / 2) / 2;
  p.box(H.w + 0.1, 0.22, baseD - 0.1, STONE_DARK, x, 0.11, baseZ);
  p.box(H.w - 0.16, 0.2, H.d + 0.1, STONE, x, 0.32, z);
  p.box(H.w - 0.1, 0.03, H.d + 0.14, STONE_LIGHT, x, FLOOR_Y - 0.01, z);
  // Bậc lên giữa thềm, hai lan can rồng chạy dọc bậc, đầu rồng đá ở chân.
  const stepZ = z + H.d / 2 + 0.12;
  for (let i = 0; i < 3; i++) p.box(1.0 - i * 0.08, 0.11, 0.2, i % 2 ? STONE : STONE_LIGHT, x, 0.3 - i * 0.1, stepZ + i * 0.18);
  for (const s of [-1, 1]) {
    const rx = x + s * 0.56;
    p.box(0.12, 0.12, 0.7, STONE_LIGHT, rx, (FLOOR_Y + 0.14) / 2 + 0.06, stepZ + 0.2, [Math.atan2(FLOOR_Y - 0.14, 0.7), 0, 0]);
    p.sphere(0.09, DRAGON, rx, 0.2, stepZ + 0.58, [0.9, 0.9, 1.3], 8);
    p.sphere(0.02, C.gold, rx + s * 0.05, 0.24, stepZ + 0.64, [1, 1, 1], 5);
    p.cone(0.02, 0.12, C.gold, rx, 0.3, stepZ + 0.5, [-0.8, 0, 0], 4);
  }
  // Cột son trên chân đá, vách gỗ dải hoa văn, cửa tối có mặt trống đồng trên trán, xà son.
  const w = 2.5;
  const d = 1.4;
  for (const cx of [-w / 2, -w / 4, 0, w / 4, w / 2]) {
    for (const cz of [-d / 2, d / 2]) {
      p.cyl(0.09, 0.11, 0.08, STONE_DARK, x + cx, FLOOR_Y + 0.04, z + cz, undefined, 8);
      p.cyl(0.065, 0.075, COL_H, C.red, x + cx, FLOOR_Y + COL_H / 2, z + cz, undefined, 8);
    }
  }
  m.band.box(w - 0.3, COL_H - 0.16, d - 0.28, C.woodLight, x, FLOOR_Y + COL_H / 2 + 0.02, z);
  p.box(0.5, 0.56, 0.03, 0x22140c, x, FLOOR_Y + 0.28, z + d / 2 - 0.13);
  m.drum.cyl(0.15, 0.15, 0.03, 0xffffff, x, FLOOR_Y + COL_H - 0.1, z + d / 2 - 0.13, [Math.PI / 2, 0, 0], 16);
  // Hai ô cửa sổ song gỗ hai bên cửa giữa.
  for (const s of [-1, 1]) {
    p.box(0.34, 0.26, 0.03, 0x22140c, x + s * 0.72, FLOOR_Y + 0.42, z + d / 2 - 0.13);
    for (let k = -1; k <= 1; k++) p.box(0.025, 0.26, 0.04, C.wood, x + s * 0.72 + k * 0.09, FLOOR_Y + 0.42, z + d / 2 - 0.12);
  }
  p.box(w + 0.14, 0.09, d + 0.14, C.red, x, FLOOR_Y + COL_H, z);
  // Mái dưới.
  const lowY = FLOOR_Y + COL_H + 0.52;
  boatRoof(m, LOWER, { length: w + 0.95, width: d + 0.82, lift: 0.34, drop: 0.5, thickness: 0.08 }, x, lowY, z);
  // Gác lửng: vách gỗ son thấp có hàng ô cửa, đỡ mái trên.
  const loftY = lowY - 0.08;
  p.box(1.5, 0.4, 0.72, C.red, x, loftY + 0.2, z);
  for (let i = 0; i < 5; i++) p.box(0.16, 0.16, 0.02, 0x22140c, x - 0.56 + i * 0.28, loftY + 0.22, z + 0.37);
  boatRoof(m, UPPER, { length: 2.2, width: 1.26, lift: 0.36, drop: 0.34, thickness: 0.07 }, x, loftY + 0.4 + 0.35, z);
}

/** Bệ đá hai bậc cho tượng ở ô `ch`; trả về mặt bệ. */
function plinth(m: ToonModel, ch: string): number {
  const p = m.plain;
  const Z = DEN_RONG_TIEN_LOT.zone(ch);
  p.box(0.72, 0.14, 0.72, STONE_DARK, Z.x, 0.07, Z.z);
  p.box(0.58, 0.16, 0.58, STONE, Z.x, 0.22, Z.z);
  p.box(0.62, 0.03, 0.62, STONE_LIGHT, Z.x, 0.31, Z.z);
  m.band.box(0.6, 0.06, 0.02, STONE_LIGHT, Z.x, 0.22, Z.z + 0.3);
  return 0.325;
}

/**
 * Bọc trăm trứng: bệ đá tròn, chậu đá hình hoa sen hai vòng cánh, trong chất đầy trứng trắng ngà thành ụ tròn (đủ
 * nhìn ra cả trăm quả từ xa: bốn tầng trứng).
 */
function eggs(m: ToonModel): void {
  const p = m.plain;
  const O = DEN_RONG_TIEN_LOT.zone('O');
  const { x, z } = O;
  p.cyl(0.46, 0.5, 0.12, STONE_DARK, x, 0.06, z, undefined, 16);
  p.cyl(0.4, 0.44, 0.08, STONE, x, 0.16, z, undefined, 16);
  // Chậu sen: lòng chậu và hai vòng cánh sen đá ngả ra ngoài.
  p.cyl(0.34, 0.24, 0.16, LOTUS_STONE_DARK, x, 0.28, z, undefined, 14);
  for (let ring = 0; ring < 2; ring++) {
    const n = ring ? 10 : 12;
    for (let i = 0; i < n; i++) {
      const a = ((i + ring * 0.5) / n) * Math.PI * 2;
      const r = ring ? 0.3 : 0.36;
      p.add(new THREE.SphereGeometry(0.11, 7, 5), ring ? LOTUS_STONE : LOTUS_STONE_DARK, x + Math.cos(a) * r, 0.3 + ring * 0.06, z + Math.sin(a) * r, [0, Math.PI / 2 - a, 0], [0.55, 0.32, 1]);
    }
  }
  // Trứng chất thành ụ: mỗi tầng vài vòng, tầng trên nhỏ dần.
  const rand = seeded(100);
  const layers: [number, number[]][] = [
    [0.4, [0.26, 0.17, 0.08]],
    [0.49, [0.21, 0.12, 0]],
    [0.58, [0.15, 0.06]],
    [0.66, [0.07, 0]],
  ];
  for (const [y, rings] of layers) {
    for (const r of rings) {
      const n = r === 0 ? 1 : Math.max(3, Math.round((r * Math.PI * 2) / 0.1));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand() * 0.4;
        p.sphere(0.052, EGG[i % 2], x + Math.cos(a) * r, y, z + Math.sin(a) * r, [1, 1.3, 1], 7);
      }
    }
  }
}

/** Lư hương đồng ba chân trên trụ đá trước thềm: nắp chóp có núm, hai quai, nén hương đỏ lửa. */
function censer(m: ToonModel): void {
  const p = m.plain;
  const { x, z } = DEN_RONG_TIEN_LOT.zone('L');
  p.box(0.34, 0.2, 0.34, STONE, x, YARD_Y + 0.1, z);
  p.box(0.4, 0.03, 0.4, STONE_DARK, x, YARD_Y + 0.21, z);
  const y = YARD_Y + 0.225;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    p.cyl(0.016, 0.02, 0.09, C.bronzeDark, x + Math.cos(a) * 0.09, y + 0.045, z + Math.sin(a) * 0.09, undefined, 5);
  }
  m.band.cyl(0.15, 0.11, 0.15, C.bronze, x, y + 0.16, z, undefined, 12);
  p.cyl(0.165, 0.165, 0.03, C.bronzeLight, x, y + 0.24, z, undefined, 12);
  for (const s of [-1, 1]) p.box(0.045, 0.08, 0.03, C.bronzeLight, x + s * 0.17, y + 0.27, z);
  p.cone(0.11, 0.11, C.bronze, x, y + 0.31, z, undefined, 10);
  p.sphere(0.028, C.bronzeLight, x, y + 0.38, z, [1, 1, 1], 6);
  for (const dx of [-0.05, 0, 0.05]) {
    p.cyl(0.008, 0.008, 0.22, C.woodDark, x + dx, y + 0.34, z + 0.09, [0.15, 0, dx * 2], 4);
    m.glow.sphere(0.015, C.ember, x + dx * 1.3, y + 0.45, z + 0.105, [1, 1, 1], 5);
  }
}

/** Mặt hồ nửa trái: kè đá, nước, lòng hồ sâu, gợn sóng; trả về đường bờ. */
function lake(m: ToonModel, flat: ShapeBuilder): void {
  const p = m.plain;
  const shore = lakeOutline(DEN_RONG_TIEN_LOT, LAKE_CELLS);
  slab(p, offset(shore, 0.14), RIM_Y - 0.02, 0.02, C.rock, shore);
  slab(p, shore, LAKE_WATER_Y - 0.03, 0.03, WATER);
  slab(flat, offset(shore, -0.4), 0.004, LAKE_WATER_Y, WATER_DEEP);
  const rand = seeded(1259);
  for (const s of along(offset(shore, 0.1), 0.3)) {
    const big = rand() < 0.3;
    p.sphere(big ? 0.1 : 0.07, rand() < 0.5 ? C.rock : C.rockDark, s.x, RIM_Y, s.y, [1.3, big ? 0.6 : 0.5, 1.1], 6);
  }
}

/**
 * Đường giữa mình rồng (tọa độ móng), từ cổ ra đuôi: uốn ba khúc nhô khỏi mặt nước rồi lặn xuống, đuôi vút lên ở
 * sau. Lượn nhẹ sang hai bên như đang bơi.
 */
function dragonPath(R: { x: number; z: number; w: number; d: number }): THREE.CatmullRomCurve3 {
  const x = R.x;
  const z0 = R.z + R.d / 2 - 0.2;
  const len = R.d - 0.15;
  const at = (t: number, y: number, dx = 0) => new THREE.Vector3(x + dx + 0.07 * Math.sin(t * 9), y, z0 - t * len);
  const w = LAKE_WATER_Y;
  return new THREE.CatmullRomCurve3([
    at(0, 0.86, 0.06),
    at(0.06, 0.6, 0.03),
    at(0.13, 0.22),
    at(0.2, w - 0.12),
    at(0.3, w + 0.38),
    at(0.4, w - 0.14),
    at(0.52, w + 0.33),
    at(0.63, w - 0.14),
    at(0.75, w + 0.26),
    at(0.86, w - 0.06),
    at(0.95, w + 0.22, -0.04),
    at(1, w + 0.38, -0.08),
  ]);
}

/**
 * Rồng xanh trong hồ: mình là chuỗi khúc tròn thuôn dần ra đuôi, nhô ba khúc khỏi mặt nước, sống lưng có vây đỏ, hai
 * chân trước có vuốt vàng bám mặt nước; đầu ngẩng cao nhìn ra trước, sừng vàng, bờm đỏ, râu dài, viên ngọc sáng trước
 * miệng. Vòng gợn sóng chỗ mình rồng chạm mặt nước.
 */
function dragon(m: ToonModel, flat: ShapeBuilder): void {
  const p = m.plain;
  const R = DEN_RONG_TIEN_LOT.zone('R');
  const curve = dragonPath(R);
  const n = 70;
  let above = curve.getPointAt(0).y > LAKE_WATER_Y;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const c = curve.getPointAt(t);
    const r = 0.15 * (1 - 0.72 * t) + 0.014;
    const up = c.y > LAKE_WATER_Y;
    if (up !== above && i > 0) {
      // Mình rồng chạm mặt nước: vòng gợn sóng.
      flat.add(new THREE.TorusGeometry(r + 0.06, 0.012, 3, 16), RIPPLE, c.x, LAKE_WATER_Y + 0.006, c.z, [Math.PI / 2, 0, 0], [1, 1.4, 1]);
      above = up;
    }
    if (c.y + r < LAKE_WATER_Y - 0.01) continue;
    p.sphere(r, i % 3 === 0 ? DRAGON_DARK : DRAGON, c.x, c.y, c.z, [1, 1, 1.15], 8);
    // Bụng vàng nhạt dưới mình, vây đỏ trên sống lưng.
    if (i % 2 === 0 && c.y - r * 0.5 > LAKE_WATER_Y) p.sphere(r * 0.7, DRAGON_BELLY, c.x, c.y - r * 0.45, c.z, [1, 0.6, 1.1], 6);
    if (i % 4 === 0 && t > 0.05) p.cone(r * 0.4, r * 1.3, C.red, c.x, c.y + r * 1.1, c.z, [-0.35, 0, 0], 4);
  }
  // Chúm vây đuôi xòe.
  const tail = curve.getPointAt(1);
  for (const s of [-1, 0, 1]) p.cone(0.03, 0.18, C.red, tail.x + s * 0.04, tail.y + 0.1, tail.z - 0.05, [-0.6, 0, s * 0.5], 4);
  // Hai chân trước có vuốt, bám ở khúc đầu.
  const hip = curve.getPointAt(0.12);
  for (const s of [-1, 1]) {
    const foot: [number, number, number] = [hip.x + s * 0.2, LAKE_WATER_Y + 0.02, hip.z + 0.05];
    rod(p, [hip.x + s * 0.06, hip.y, hip.z], foot, 0.032, DRAGON_DARK, 6);
    for (const k of [-1, 0, 1]) p.cone(0.012, 0.07, C.gold, foot[0] + k * 0.03, foot[1], foot[2] + 0.04, [Math.PI / 2, 0, k * 0.3], 4);
  }
  // Đầu rồng ở đầu cổ, nhìn ra trước, hơi ngoảnh về phía đền.
  const head = curve.getPointAt(0);
  framed(m, head.x, head.y + 0.05, head.z + 0.02, 0.35, 1.55, () => {
    p.sphere(0.12, DRAGON, 0, 0, 0, [1, 0.85, 1.25], 9);
    // Mõm dài, hàm dưới hé mở, mũi hai lỗ.
    p.sphere(0.085, DRAGON, 0, -0.01, 0.15, [0.95, 0.62, 1.45], 8);
    p.sphere(0.06, DRAGON_BELLY, 0, -0.07, 0.12, [0.95, 0.4, 1.5], 7);
    p.box(0.1, 0.012, 0.12, C.red, 0, -0.045, 0.15);
    for (const s of [-1, 1]) {
      p.sphere(0.018, DRAGON_DARK, s * 0.035, 0.035, 0.27, [1, 1, 1], 5);
      // Mắt vàng con ngươi đen, mày gồ.
      p.sphere(0.028, C.gold, s * 0.075, 0.06, 0.07, [1, 1, 1], 6);
      p.sphere(0.014, C.ink, s * 0.088, 0.062, 0.088, [1, 1, 1], 5);
      p.sphere(0.03, DRAGON_DARK, s * 0.07, 0.09, 0.06, [1.3, 0.5, 1], 5);
      // Sừng vàng cong ra sau.
      rod(p, [s * 0.05, 0.08, -0.02], [s * 0.1, 0.22, -0.14], 0.022, C.gold, 5);
      rod(p, [s * 0.1, 0.22, -0.14], [s * 0.11, 0.25, -0.24], 0.014, C.gold, 4);
      // Râu dài hai bên mõm, cong ra sau.
      rod(p, [s * 0.06, -0.01, 0.24], [s * 0.2, 0.0, 0.18], 0.008, C.gold, 4);
      rod(p, [s * 0.2, 0.0, 0.18], [s * 0.28, -0.06, 0.04], 0.007, C.gold, 4);
      // Bờm đỏ sau má.
      for (const k of [0, 1]) p.cone(0.04, 0.16, C.red, s * (0.09 + k * 0.02), 0.02 - k * 0.05, -0.1, [-1.1, 0, -s * (0.6 + k * 0.3)], 4);
    }
    p.cone(0.035, 0.18, C.red, 0, 0.1, -0.12, [-1.2, 0, 0], 4);
    // Chòm râu cằm.
    p.cone(0.03, 0.1, DRAGON_BELLY, 0, -0.12, 0.08, [Math.PI + 0.4, 0, 0], 4);
    // Ngọc sáng trước miệng.
    m.glow.sphere(0.055, PEARL, 0, 0.0, 0.42, [1, 1, 1], 8);
  });
}

/**
 * Ba ngọn núi nửa phải, ngọn giữa (ô `P`) cao nhất: vách đá đa diện, sườn rừng xanh, chóp đá; vài cây trên sườn, mây
 * trắng vờn quanh. Trả về đỉnh ngọn cao nhất (cho chim tiên đậu).
 */
function mountains(m: ToonModel): THREE.Vector3 {
  const p = m.plain;
  const P = DEN_RONG_TIEN_LOT.zone('P');
  const M = DEN_RONG_TIEN_LOT.zone('M');
  const peaks = [
    { x: P.x + 0.08, z: P.z - 0.05, r: 0.86, h: 2.6 },
    { x: P.x - 0.55, z: M.z - M.d / 2 + 0.62, r: 0.62, h: 1.85 },
    { x: P.x + 0.35, z: P.z + 1.35, r: 0.66, h: 1.55 },
  ];
  // Chân núi: gò đá rêu.
  p.cyl(1.05, 1.25, 0.16, C.rockDark, P.x, 0.08, P.z + 0.35, undefined, 9);
  for (const pk of peaks) {
    p.cone(pk.r, pk.h, C.rockDark, pk.x, 0.1 + pk.h / 2, pk.z, undefined, 6);
    p.cone(pk.r * 0.86, pk.h * 0.8, C.mountainCloak, pk.x, 0.1 + pk.h * 0.52, pk.z + 0.03, [0, 0.4, 0], 6);
    p.cone(pk.r * 0.4, pk.h * 0.3, C.rock, pk.x, 0.1 + pk.h * 0.86, pk.z, undefined, 6);
  }
  // Cây thông nhỏ trên sườn trước.
  const rand = seeded(4242);
  for (const [dx, dz, y] of [
    [-0.55, 0.62, 0.32],
    [0.1, 0.8, 0.28],
    [0.62, 0.35, 0.5],
    [-0.2, 1.75, 0.25],
    [0.75, 1.85, 0.22],
  ] as const) {
    const tx = P.x + dx;
    const tz = P.z + dz;
    const h = 0.32 + rand() * 0.12;
    p.cyl(0.02, 0.025, 0.12, C.trunk, tx, y + 0.06, tz, undefined, 4);
    p.cone(0.12, h, C.leaf[Math.floor(rand() * 4)], tx, y + 0.1 + h / 2, tz, undefined, 6);
  }
  // Mây trắng vờn quanh sườn.
  for (const [dx, y, dz] of [
    [-0.62, 1.5, 0.4],
    [0.6, 1.9, 0.3],
  ] as const) {
    for (const [ox, oy, r] of [
      [-0.14, 0, 0.11],
      [0, 0.05, 0.14],
      [0.15, 0, 0.1],
    ] as const) {
      p.sphere(r, CLOUD, P.x + dx + ox, y + oy, P.z + dz, [1.2, 0.8, 0.9], 8);
    }
  }
  return new THREE.Vector3(peaks[0].x, 0.1 + peaks[0].h, peaks[0].z);
}

/**
 * Chim tiên trắng dang rộng cánh đậu trên đỉnh núi, mỏ dài hướng ra trước, mào và đuôi dài lông vàng: dáng chim Lạc
 * trên mặt trống đồng, khoác màu trắng của Âu Cơ.
 */
function fairyBird(m: ToonModel, top: THREE.Vector3): void {
  const p = m.plain;
  const feather = (color: number, x: number, y: number, z: number, rot: [number, number, number], scale: [number, number, number]) =>
    p.add(new THREE.SphereGeometry(1, 10, 6), color, x, y, z, rot, scale);
  framed(m, top.x, top.y - 0.14, top.z, -0.5, 1.5, () => {
    // Thân, cổ vươn cao, đầu có mào đỏ, mỏ dài vàng.
    p.sphere(0.09, FAIRY, 0, 0.14, 0, [0.85, 0.8, 1.5], 9);
    p.cyl(0.03, 0.04, 0.24, FAIRY, 0, 0.29, 0.13, [0.35, 0, 0], 6);
    p.sphere(0.05, FAIRY, 0, 0.42, 0.18, [1, 1, 1.15], 8);
    p.cone(0.022, 0.24, C.gold, 0, 0.41, 0.37, [Math.PI / 2, 0, 0], 5);
    p.cone(0.02, 0.1, C.red, 0, 0.48, 0.15, [-0.7, 0, 0], 4);
    for (const s of [-1, 1]) {
      p.sphere(0.011, C.ink, s * 0.034, 0.44, 0.23, [1, 1, 1], 4);
      // Cánh dang rộng, hơi chếch lên: ba lớp lông, đầu cánh vàng.
      feather(FAIRY, s * 0.22, 0.2, 0, [0, 0, s * 0.25], [0.22, 0.03, 0.11]);
      feather(FAIRY, s * 0.42, 0.26, -0.03, [0, s * 0.15, s * 0.3], [0.2, 0.025, 0.09]);
      feather(C.gold, s * 0.58, 0.31, -0.07, [0, s * 0.3, s * 0.32], [0.12, 0.02, 0.06]);
    }
    // Đuôi dài ba lông rủ ra sau.
    for (const s of [-1, 0, 1]) feather(s ? FAIRY : C.gold, s * 0.05, 0.09, -0.3, [0.3, s * 0.3, 0], [0.035, 0.02, 0.2]);
  });
}

/** Chân núi phía trước: khóm hoa dại hồng, trắng, vàng trên bụi lá thấp, đá núi lăn xuống. */
function footHills(p: ShapeBuilder): void {
  const H = DEN_RONG_TIEN_LOT.zone('h');
  const rand = seeded(2718);
  const blossom = [0xf0a0b8, 0xf8f0e8, C.ripe, 0xe86a7a] as const;
  for (let i = 0; i < 11; i++) {
    const x = H.x + (rand() - 0.5) * H.w;
    const z = H.z + (rand() - 0.5) * H.d;
    if (i % 4 === 3) {
      p.sphere(0.1 + rand() * 0.06, rand() < 0.5 ? C.rock : C.rockDark, x, 0.06, z, [1.3, 0.7, 1.1], 6);
      continue;
    }
    p.sphere(0.14, C.leaf[i % 4], x, 0.1, z, [1.2, 0.7, 1.1], 7);
    for (let k = 0; k < 4; k++) p.sphere(0.035, blossom[(i + k) % 4], x + (rand() - 0.5) * 0.22, 0.18 + rand() * 0.04, z + (rand() - 0.5) * 0.2, [1, 0.8, 1], 5);
  }
}

/** Bụi tre góc sau bên trái: thân tre chụm hơi xòe, ngọn rủ lá. */
function bamboo(p: ShapeBuilder): void {
  const B = DEN_RONG_TIEN_LOT.zone('B');
  const rand = seeded(313);
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.32;
    const x = B.x + Math.cos(a) * r;
    const z = B.z + Math.sin(a) * r * 0.8;
    const h = 1.1 + rand() * 0.6;
    const top: [number, number, number] = [x + (x - B.x) * 0.5 - 0.05, h, z + (z - B.z) * 0.3];
    rod(p, [x, 0, z], top, 0.028, i % 3 ? C.bamboo : 0x9fb85a, 5);
    for (let k = 0; k < 3; k++) p.sphere(0.13 + rand() * 0.05, C.leaf[(i + k) % 4], top[0] + (rand() - 0.5) * 0.25, h - 0.1 - k * 0.22, top[2] + (rand() - 0.5) * 0.2, [1.4, 0.5, 1.1], 6);
  }
}

export function makeDenRongTien(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const flat = new ShapeBuilder();
  yard(m);
  lake(m, flat);
  dragon(m, flat);
  lotus(p, DEN_RONG_TIEN_LOT);
  temple(m);
  const seatQ = plinth(m, 'Q');
  const seatA = plinth(m, 'A');
  eggs(m);
  censer(m);
  fairyBird(m, mountains(m));
  footHills(p);
  bamboo(p);
  gate(m, DEN_RONG_TIEN_LOT);
  for (const D of DEN_RONG_TIEN_LOT.groups('D')) {
    // Trống đồng trên giá gỗ thấp.
    for (const dx of [-0.26, 0.26]) p.box(0.06, 0.24, 0.06, C.woodDark, D.x + dx, 0.12, D.z);
    p.box(0.66, 0.05, 0.14, C.wood, D.x, 0.22, D.z);
    drum(m, D.x, D.z, 0.85, 0.24);
  }
  // Cờ xanh nước bên hồ, cờ vàng núi bên núi.
  const flags = DEN_RONG_TIEN_LOT.groups('F');
  flags.forEach((F, i) => banner(m, F.x - 0.1, F.z, 1.5, i ? C.trungYellow : C.sea));

  const g = m.group();
  g.add(flat.mesh(toon));
  // Hai tượng tổ trên bệ, quay ra trước, hơi chếch vào lối giữa.
  const Q = DEN_RONG_TIEN_LOT.zone('Q');
  const A = DEN_RONG_TIEN_LOT.zone('A');
  const statues: [THREE.Group, number, number, number, number][] = [
    [bakeLacLongQuan(), Q.x, seatQ, Q.z, 0.3],
    [bakeAuCo(), A.x, seatA, A.z, -0.3],
  ];
  for (const [s, x, y, z, ry] of statues) {
    s.scale.setScalar(0.9);
    s.position.set(x, y, z);
    s.rotation.y = ry;
    g.add(s);
  }
  return g;
}

/** Thầy cúng (Lạc hầu) đứng khấn bên trái lư hương, quay vào đền; một người dâng lễ bên bọc trứng. */
export function denRongTienSpots(): LotSpot[] {
  const L = DEN_RONG_TIEN_LOT.zone('L');
  const O = DEN_RONG_TIEN_LOT.zone('O');
  return [
    { job: 'lacHau', x: L.x - 0.42, y: YARD_Y, z: L.z + 0.18, ry: Math.PI - 0.4 },
    { job: 'phuNu', x: O.x + 0.72, y: YARD_Y, z: O.z + 0.1, ry: -Math.PI / 2 - 0.2 },
  ];
}

export const DEN_RONG_TIEN: CongTrinh = { tiles: 8, make: makeDenRongTien, spots: denRongTienSpots, view: { half: 5.4, lookY: 0.8, px: 64 } };
