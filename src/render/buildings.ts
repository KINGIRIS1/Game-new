// Mô hình công trình "Nét Đông Sơn". Mỗi loại một dáng riêng lấy từ nhà cửa trên trống đồng,
// mỗi cấp thêm một phần lớn nhìn thấy rõ và to dần lên tới cấp 5. Cấp 6, 7, 8 (từ chương 2, 3, 4) không to thêm
// mà thêm một phần lớn nữa và đổi mái (xem Mái theo cấp). Lầu nỏ ghép từ hai chòi canh cấp 8. Bốn công trình Hội Tết (ruộng nếp, vườn đậu lá dong, chuồng lợn, bếp gói bánh)
// có 3 cấp, mỗi cấp cũng thêm một phần lớn.
// Gốc tọa độ là tâm chân móng, mặt trước hướng +z.

import * as THREE from 'three';
import { ironHorse, makeCrossbowStand, makeFighter, makeRuaVang, makeSonTinh } from './models';
import { C } from './palette';
import { ShapeBuilder, saddleRoof, seeded } from './shapes';
import { ToonModel, inkThin, outlineOf, toon } from './toon';

/** Cấp dùng để tính cỡ và độ dày: cấp 6, 7, 8 giữ như cấp 5, để móng không tràn ô. */
const grown = (level: number) => Math.min(level, 5);
/** To dần theo cấp: khoảng 85% ở cấp 1, 105% ở cấp 5 trở lên. */
const sizeFor = (level: number) => 0.8 + 0.05 * grown(level);

// ---------- Mái theo cấp ----------
// Cấp 6, 7, 8 không to thêm nên nhìn mái để biết cấp, chung cho mọi công trình có mái:
// tới cấp 5 mái tranh; cấp 6 mái tranh có sống và diềm mái sơn đỏ; cấp 7 mái ngói đất nung như ngói thành Cổ Loa;
// cấp 8 mái ngói, sống và diềm mái bọc đồng vàng.

/** Ngói đất nung đỏ cam. */
const TILE = 0xc8643a;
const TILE_DARK = 0xa84e2e;

interface Roof {
  main: number;
  /** Tầng mái trên, mái miếu nhỏ. */
  dark: number;
  /** Sống mái, diềm mái, chóp mái; null là không viền. */
  trim: number | null;
}

const THATCH: Roof = { main: C.thatch, dark: C.thatchDark, trim: null };

function roofFor(level: number): Roof {
  if (level >= 8) return { main: TILE, dark: TILE_DARK, trim: C.gold };
  if (level >= 7) return { main: TILE, dark: TILE_DARK, trim: null };
  if (level >= 6) return { main: C.thatch, dark: C.thatchDark, trim: C.red };
  return THATCH;
}

type SaddleOpts = Parameters<typeof saddleRoof>[0];

/** Mái thuyền màu theo `r`, xoay `ry` quanh trục đứng; có viền thì thêm sống mái và hai diềm mái chạy theo dáng cong. */
function boatRoof(m: ToonModel, r: Roof, o: SaddleOpts, x: number, y: number, z: number, ry = 0, dark = false): void {
  m.band.add(saddleRoof(o), dark ? r.dark : r.main, x, y, z, [0, ry, 0]);
  if (r.trim === null) return;
  const rad = THREE.MathUtils.clamp(o.width * 0.045, 0.03, 0.07);
  for (const v of [-1, 0, 1]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const u = -1 + i / 8;
      const top = o.lift * Math.pow(Math.abs(u), 2.2) - o.drop * Math.abs(v) * (1 - 0.25 * Math.abs(u));
      pts.push(new THREE.Vector3((u * o.length) / 2, top + rad * 0.5, (v * o.width) / 2));
    }
    m.plain.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, v ? rad * 0.8 : rad, 6), r.trim, x, y, z, [0, ry, 0]);
  }
}

/** Mái nón (tâm khối nón ở `y`, như `cone`): có viền thì thêm vành diềm mái và chóp mái. */
function coneRoof(m: ToonModel, r: Roof, radius: number, h: number, x: number, y: number, z: number, seg = 10, band = false, dark = false): void {
  (band ? m.band : m.plain).cone(radius, h, dark ? r.dark : r.main, x, y, z, undefined, seg);
  if (r.trim === null) return;
  const t = THREE.MathUtils.clamp(radius * 0.07, 0.025, 0.05);
  m.plain.add(new THREE.TorusGeometry(radius * 0.97, t, 5, seg * 2), r.trim, x, y - h / 2 + t * 0.5, z, [Math.PI / 2, 0, 0]);
  m.plain.cone(radius * 0.22, h * 0.24, r.trim, x, y + h / 2 - h * 0.1, z, undefined, seg);
}

/** Lầu trống: bốn cột, sàn, trống đồng trên sàn, mái nhọn theo `roof`. Gốc ở chân lầu. `lac`: chim Lạc dang cánh trên đỉnh. */
function drumTower(m: ToonModel, x: number, z: number, y0: number, roof: Roof, lac = false): void {
  const p = m.plain;
  for (const dx of [-0.24, 0.24]) for (const dz of [-0.24, 0.24]) p.cyl(0.04, 0.05, 1.0, C.woodDark, x + dx, y0 + 0.5, z + dz, undefined, 6);
  p.box(0.66, 0.07, 0.66, C.wood, x, y0 + 1.0, z);
  for (const s of [-1, 1]) {
    p.box(0.66, 0.12, 0.04, C.red, x, y0 + 1.1, z + s * 0.31);
    p.box(0.04, 0.12, 0.66, C.red, x + s * 0.31, y0 + 1.1, z);
  }
  drum(m, x, z, 0.6, y0 + 1.04);
  for (const dx of [-0.26, 0.26]) for (const dz of [-0.26, 0.26]) p.cyl(0.025, 0.025, 0.55, C.woodDark, x + dx, y0 + 1.32, z + dz, undefined, 5);
  coneRoof(m, roof, 0.56, 0.5, x, y0 + 1.82, z, 8, true);
  if (roof.trim === null) p.sphere(0.06, C.bronzeLight, x, y0 + 2.1, z, [1, 1, 1], 6);
  if (lac) birdSpread(m, x, y0 + 2.1, z, 0.9);
}

function bird(m: ToonModel, x: number, y: number, z: number, dir: number, s = 1): void {
  m.plain.capsule(0.06 * s, 0.22 * s, C.bronze, x, y, z, [0, 0, Math.PI / 2]);
  m.plain.capsule(0.03 * s, 0.26 * s, C.bronze, x + dir * 0.2 * s, y + 0.12 * s, z, [0, 0, -dir * 0.6]);
  m.plain.cone(0.03 * s, 0.22 * s, C.bronzeLight, x + dir * 0.4 * s, y + 0.2 * s, z, [0, 0, -dir * Math.PI / 2]);
  m.plain.box(0.18 * s, 0.03, 0.14 * s, C.bronzeDark, x - dir * 0.16 * s, y + 0.06 * s, z, [0, 0, dir * 0.6]);
}

/** Tượng chim Lạc dang cánh, mỏ dài, đuôi xòe, đứng trên đỉnh: kiểu chim bay trên mặt trống đồng. */
function birdSpread(m: ToonModel, x: number, y: number, z: number, s = 1): void {
  const p = m.plain;
  p.capsule(0.07 * s, 0.2 * s, C.bronze, x, y + 0.1 * s, z, [Math.PI / 2, 0, 0]);
  p.capsule(0.035 * s, 0.2 * s, C.bronze, x, y + 0.22 * s, z + 0.16 * s, [0.5, 0, 0]);
  p.cone(0.03 * s, 0.26 * s, C.bronzeLight, x, y + 0.26 * s, z + 0.38 * s, [Math.PI / 2, 0, 0]);
  for (const side of [-1, 1]) m.band.box(0.42 * s, 0.03, 0.18 * s, C.bronzeLight, x + side * 0.24 * s, y + 0.2 * s, z - 0.02 * s, [0, 0, side * 0.45]);
  p.box(0.16 * s, 0.03, 0.2 * s, C.bronzeDark, x, y + 0.08 * s, z - 0.22 * s, [0.5, 0, 0]);
}

function drum(m: ToonModel, x: number, z: number, s = 1, y = 0.08): void {
  m.band.cyl(0.36 * s, 0.32 * s, 0.32 * s, C.bronze, x, 0.16 * s + y, z, undefined, 16);
  m.drum.cyl(0.38 * s, 0.38 * s, 0.04 * s, 0xffffff, x, 0.34 * s + y, z, undefined, 20);
}

function banner(m: ToonModel, x: number, z: number, h: number, color: number): void {
  m.plain.cyl(0.03, 0.035, h, C.woodDark, x, h / 2, z, undefined, 5);
  m.band.box(0.42, 0.6, 0.03, color, x + 0.22, h - 0.32, z);
}

/** Nhà sàn mái thuyền: cột, sàn, vách có hoa văn, mái cong vút. */
function stiltHall(m: ToonModel, o: { x: number; z: number; w: number; d: number; postH: number; roofL: number; roofW: number; lift: number; ry?: number; roof?: Roof }): void {
  const p = m.plain;
  const cols = o.w > 2 ? [-o.w / 2 + 0.15, 0, o.w / 2 - 0.15] : [-o.w / 2 + 0.12, o.w / 2 - 0.12];
  for (const cx of cols) for (const cz of [-o.d / 2 + 0.12, o.d / 2 - 0.12]) p.cyl(0.07, 0.09, o.postH, C.woodDark, o.x + cx, o.postH / 2, o.z + cz);
  p.box(o.w, 0.12, o.d, C.wood, o.x, o.postH, o.z);
  m.band.box(o.w - 0.6, 0.62, o.d - 0.5, C.woodLight, o.x, o.postH + 0.37, o.z);
  boatRoof(m, o.roof ?? THATCH, { length: o.roofL, width: o.roofW, lift: o.lift, drop: o.roofW * 0.4, thickness: 0.1 }, o.x, o.postH + 0.68 + o.roofW * 0.4, o.z, o.ry);
}

/** Mái tròn hình mai rùa (kiểu nhà thứ hai khắc trên trống đồng). */
function domeRoof(b: ShapeBuilder, r: number, h: number, color: number, x: number, y: number, z: number): void {
  const geo = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  b.add(geo, color, x, y, z, [0, 0, 0], [r, h, r * 0.9]);
}

// ---------- Điện Vua Hùng ----------

export function makeDien(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = roofFor(level);
  // Cấp 4 trở lên: nền đất đắp cao viền đá, có bậc lên.
  const base = level >= 4 ? 0.45 : 0.14;
  p.box(3.9, base, 3.9, level >= 4 ? C.earth : C.soil, 0, base / 2, 0);
  if (level >= 4) {
    p.box(3.95, 0.08, 3.95, C.rock, 0, base, 0);
    // Cấp 8: thềm đá ba bậc rộng hơn, viền đá sẫm.
    const stepW = level >= 8 ? 1.7 : 1.0;
    for (let i = 0; i < 3; i++) p.box(stepW, 0.14, 0.24, i % 2 && level >= 8 ? C.rockDark : C.rock, 0, base - 0.08 - i * 0.14, 1.98 + i * 0.12);
  }
  const hallX = level >= 3 ? -0.35 : 0;
  const hallW = level >= 3 ? 2.9 : 3.0;
  // Nhà chính.
  const hall = { x: hallX, z: -0.1, w: hallW, d: 2.3, postH: 1.15 + base, roofL: hallW + 1.3, roofW: 2.7, lift: 1.0, roof };
  stiltHall(m, hall);
  p.box(0.52, 0.55, 0.06, C.woodDark, hallX, hall.postH + 0.33, 0.95);
  for (let i = 0; i < 4; i++) p.box(0.52, 0.06, 0.2, C.woodDark, hallX, hall.postH - 0.18 - i * 0.26, 1.2 + i * 0.18);
  if (level >= 2) {
    // Chim đồng hai đầu nóc, cờ đỏ hai bên.
    const roofTop = hall.postH + 0.68 + hall.roofW * 0.4 + hall.lift;
    bird(m, hallX + hall.roofL / 2 - 0.1, roofTop + 0.05, -0.1, 1, 1.1);
    bird(m, hallX - hall.roofL / 2 + 0.1, roofTop + 0.05, -0.1, -1, 1.1);
    banner(m, -1.7, level >= 6 ? 1.85 : 1.6, 2.6, C.red);
    // Từ cấp 6 trống đặt trên lầu trống, không đặt dưới đất nữa.
    if (level < 6) drum(m, 1.45, 1.55, 1, base);
  }
  if (level >= 3) {
    // Chái nhà bên phải (phía camera nhìn tới), mái quay ngang.
    stiltHall(m, { x: 1.45, z: -0.3, w: 1.0, d: 1.5, postH: 0.95 + base, roofL: 1.9, roofW: 1.4, lift: 0.4, ry: Math.PI / 2, roof });
    if (level < 6) drum(m, -1.05, 1.5, 0.7, base);
  }
  if (level >= 4) {
    // Hàng rào cột chạm, đầu cột bọc đồng.
    for (let i = 0; i <= 6; i++) {
      const t = -1.85 + i * 0.62;
      for (const [x, z] of [[t, -1.85], [-1.85, t], [1.85, t]] as const) {
        p.cyl(0.05, 0.05, 0.55, C.woodDark, x, base + 0.27, z, undefined, 6);
        p.sphere(0.07, C.bronze, x, base + 0.58, z, [1, 1, 1], 6);
      }
    }
    banner(m, 1.75, level >= 6 ? 1.85 : 1.6, 2.8, C.red);
  }
  if (level >= 5) {
    // Mái tầng hai trên nóc, sống mái mạ đồng, hai trống lớn trước điện.
    const y2 = hall.postH + 0.68 + hall.roofW * 0.4 + 0.65;
    boatRoof(m, roof, { length: hallW * 0.8, width: 1.5, lift: 0.7, drop: 0.55, thickness: 0.08 }, hallX, y2, -0.1);
    if (roof.trim === null) p.box(hallW * 0.7, 0.07, 0.14, C.bronzeLight, hallX, y2 + 0.04, -0.1);
    drum(m, 0.6, 1.75, 1.15, base);
    drum(m, -0.5, 1.75, 1.15, base);
  }
  if (level >= 6) {
    // Hai lầu trống đồng hai bên thềm.
    for (const x of [-1.3, 1.3]) drumTower(m, x, 1.45, base, roof, level >= 8);
  }
  if (level >= 7) {
    // Mái tầng ba trên cùng, đôi chim đồng lớn đậu hai đầu nóc.
    const y3 = hall.postH + 0.68 + hall.roofW * 0.4 + 1.25;
    boatRoof(m, roof, { length: hallW * 0.6, width: 1.0, lift: 0.55, drop: 0.4, thickness: 0.07 }, hallX, y3, -0.1, 0, true);
    if (roof.trim === null) p.box(hallW * 0.5, 0.06, 0.12, C.bronzeLight, hallX, y3 + 0.03, -0.1);
    const top = y3 + 0.55;
    bird(m, hallX + hallW * 0.3, top, -0.1, 1, 1.6);
    bird(m, hallX - hallW * 0.3, top, -0.1, -1, 1.6);
    if (level >= 8) {
      // Trống đồng lớn trên nóc, giữa đôi chim đồng.
      drum(m, hallX, -0.1, 0.62, top - 0.18);
      p.cyl(0.05, 0.07, 0.25, C.bronzeDark, hallX, top - 0.12, -0.1, undefined, 8);
    }
  }
  const g = m.group();
  g.scale.setScalar(sizeFor(level));
  return g;
}

// ---------- Ruộng lúa ----------

/** Nước ao trong, sáng hơn nước ruộng cho dễ nhận ra ao giữ nước. */
const POND = 0x6fb8cf;

/** Con trâu chibi đứng nghỉ. */
function buffalo(p: ShapeBuilder, x: number, z: number): void {
  p.sphere(0.24, 0x4a4440, x, 0.32, z, [0.8, 0.7, 1.25], 8);
  for (const dx of [-0.1, 0.1]) for (const dz of [-0.15, 0.15]) p.cyl(0.045, 0.05, 0.24, 0x3a3532, x + dx, 0.12, z + dz, undefined, 5);
  p.sphere(0.13, 0x4a4440, x, 0.42, z + 0.3, [0.9, 0.85, 1.1], 7);
  for (const s of [-1, 1]) p.capsule(0.025, 0.18, 0xd8cbb0, x + s * 0.13, 0.52, z + 0.28, [0, 0, s * 1.1]);
}

/** Guồng nước tre quay quanh trục dọc theo x, có gàu múc nước. Tách riêng để World cho quay (`userData.spin`). */
function waterWheel(): THREE.Group {
  const w = new ToonModel(inkThin);
  const p = w.plain;
  p.add(new THREE.TorusGeometry(0.42, 0.03, 6, 20), C.woodDark, 0, 0, 0, [0, Math.PI / 2, 0]);
  p.add(new THREE.TorusGeometry(0.2, 0.025, 6, 14), C.bamboo, 0, 0, 0, [0, Math.PI / 2, 0]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.box(0.03, 0.84, 0.03, C.bamboo, 0, 0, 0, [a, 0, 0]);
    p.box(0.16, 0.08, 0.1, C.bamboo, 0, Math.cos(a) * 0.44, Math.sin(a) * 0.44, [a, 0, 0]);
  }
  p.cyl(0.05, 0.05, 0.5, C.woodDark, 0, 0, 0, [0, 0, Math.PI / 2], 6);
  const g = w.group();
  g.userData.spin = 1.1;
  return g;
}

export function makeRuong(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = roofFor(level);
  const lv = grown(level);
  const bank = 0.12 + lv * 0.02;
  // Từ cấp 6 bờ ruộng kè đá: khung xám quanh ruộng, nhìn xa cũng thấy.
  const bankColor = level >= 6 ? C.rock : C.soil;
  for (const s of [-1, 1]) {
    p.box(2.95, bank, 0.2, bankColor, 0, bank / 2, s * 1.38);
    p.box(0.2, bank, 2.95, bankColor, s * 1.38, bank / 2, 0);
  }
  p.box(2.6, 0.04, 2.6, C.paddyWater, 0, 0.05, 0);
  const color = new THREE.Color(C.rice).lerp(new THREE.Color(C.ripe), (lv - 1) / 4);
  const h = 0.16 + lv * 0.07;
  // Cấp càng cao lúa càng dày và cao.
  const rows = Math.min(3 + lv, 7);
  const step = 2.3 / rows;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < rows; j++) {
      const x = -1.15 + step * (i + 0.5);
      const z = -1.15 + step * (j + 0.5);
      if (level >= 3 && x > 0.55 && z > 0.55) continue;
      if (level >= 4 && x < -0.55 && z < -0.55) continue;
      if (level >= 6 && x < -0.55 && z > 0.55) continue;
      if (level >= 7 && x > 0.55 && z < -0.55) continue;
      if (level >= 8 && x < -0.55 && Math.abs(z) < 0.45) continue;
      p.cone(0.07 + lv * 0.008, h, color, x, 0.06 + h / 2, z, undefined, 5);
    }
  }
  if (level >= 3) buffalo(p, 0.85, 0.8);
  if (level >= 4) {
    // Chòi canh ruộng.
    for (const x of [-1.1, -0.6]) for (const z of [-1.1, -0.6]) p.cyl(0.03, 0.03, 0.6, C.woodDark, x, 0.3, z, undefined, 5);
    p.box(0.6, 0.05, 0.6, C.wood, -0.85, 0.58, -0.85);
    coneRoof(m, roof, 0.48, 0.36, -0.85, 0.8, -0.85, 6);
  }
  if (level >= 5) {
    // Bó lúa đã gặt dựng chụm vào nhau; cấp 7 dời ra giữa bờ để nhường góc cho miếu.
    const sheaves: [number, number][] = level >= 7 ? [[0.1, -1.05], [-0.12, -1.08], [0.0, -0.86]] : [[1.0, -1.0], [0.75, -1.05], [0.88, -0.78]];
    for (const [x, z] of sheaves) {
      p.cyl(0.07, 0.11, 0.42, C.ripe, x, 0.25, z, [0.12, 0, 0.12], 6);
      p.cone(0.11, 0.18, C.bronzeLight, x, 0.52, z, undefined, 6);
    }
  }
  if (level >= 6) {
    // Máng nước tre dẫn từ guồng vào ruộng, hai cột đỡ trục guồng.
    for (const x of [-1.36, -0.8]) p.cyl(0.045, 0.055, 0.66, C.woodDark, x, 0.33, 0.85, undefined, 5);
    p.box(0.72, 0.08, 0.14, C.bamboo, -0.5, 0.66, 0.85);
    p.box(0.5, 0.03, 0.5, C.paddyWater, -1.08, 0.07, 0.85);
  }
  if (level >= 7) {
    // Miếu thần lúa ở góc ruộng: nền đá, vách son, mái cong, lư hương đồng.
    p.box(0.74, 0.16, 0.74, C.rock, 0.93, 0.12, -0.93);
    m.band.box(0.48, 0.42, 0.4, C.red, 0.93, 0.41, -0.97);
    boatRoof(m, roof, { length: 0.86, width: 0.7, lift: 0.26, drop: 0.26, thickness: 0.05 }, 0.93, 0.9, -0.97);
    p.cyl(0.07, 0.06, 0.1, C.bronze, 0.93, 0.25, -0.62, undefined, 8);
    bird(m, 0.93, 0.96, -0.97, 1, 0.45);
  }
  if (level >= 8) {
    // Đập đá xếp cao chắn ngang bờ trái, cống tre lớn đổ nước xuống ao nước trong giữa ruộng.
    const rand = seeded(29);
    for (let i = 0; i < 7; i++) {
      const z = -0.48 + i * 0.16;
      p.box(0.3, 0.42 + rand() * 0.08, 0.17, i % 2 ? C.rock : C.rockDark, -1.36, 0.22, z, [0, rand() * 0.3, 0]);
    }
    p.box(0.34, 0.12, 1.2, C.rockDark, -1.36, 0.47, 0.0);
    p.cyl(0.07, 0.07, 0.7, C.bamboo, -1.08, 0.48, 0.0, [0, 0, Math.PI / 2 - 0.2], 7);
    p.box(0.7, 0.03, 0.82, POND, -0.82, 0.08, 0.0);
    p.cyl(0.04, 0.07, 0.36, POND, -0.74, 0.26, 0.0, undefined, 6);
  }
  const g = m.group();
  if (level >= 6) {
    const wheel = waterWheel();
    wheel.position.set(-1.08, 0.62, 0.85);
    wheel.scale.setScalar(1.3);
    g.add(wheel);
  }
  return g;
}

// ---------- Bến chợ thuyền ----------

/** Sạp chợ: bốn cọc, bạt căng có hoa văn, hàng hóa bày bên dưới. */
function stall(m: ToonModel, x: number, z: number, color: number, goods: number): void {
  const p = m.plain;
  for (const dx of [-0.32, 0.32]) for (const dz of [-0.25, 0.25]) p.cyl(0.025, 0.025, 0.72, C.woodDark, x + dx, 0.36 + 0.4, z + dz, undefined, 5);
  m.band.box(0.8, 0.04, 0.66, color, x, 1.15, z, [0.12, 0, 0]);
  p.box(0.6, 0.12, 0.42, C.woodLight, x, 0.52, z);
  for (let i = 0; i < goods; i++) {
    const gx = x - 0.2 + i * 0.2;
    if (i % 2) p.sphere(0.08, i === 1 ? 0xd9862e : C.ripe, gx, 0.64, z, [1, 0.8, 1], 6);
    else p.cyl(0.08, 0.06, 0.1, C.thatch, gx, 0.63, z, undefined, 7);
  }
}

export function makeBen(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = roofFor(level);
  for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.2]) p.cyl(0.06, 0.07, 0.45, C.woodDark, x, 0.22, z);
  p.box(1.95, 0.1, 1.45, C.woodLight, 0, 0.45, -0.25);
  // Cầu tàu chìa ra sông, cấp 3 trở lên dài hơn và có nhánh phụ.
  const jetty = level >= 3 ? 2.4 : 1.7;
  p.box(0.5, 0.08, jetty, C.wood, 0.55, 0.33, 0.45 + jetty / 2);
  for (let z = 0.9; z < 0.45 + jetty; z += 0.6) p.cyl(0.05, 0.05, 0.8, C.woodDark, 0.55, -0.05, z);
  if (level >= 3) p.box(0.9, 0.07, 0.4, C.wood, 0.05, 0.31, 1.9);
  if (level < 7) {
    stall(m, -0.45, -0.5, C.red, 3);
    if (level >= 2) stall(m, 0.45, -0.5, C.indigo, 2);
  }
  if (level >= 4) {
    // Nhà kho ven sông.
    p.box(0.7, 0.5, 0.5, C.woodLight, -0.6, 0.75, 0.25);
    boatRoof(m, roof, { length: 1.0, width: 0.8, lift: 0.18, drop: 0.32, thickness: 0.05 }, -0.6, 1.3, 0.25);
  }
  if (level >= 5) {
    banner(m, 0.9, 0.35, 1.9, C.red);
    banner(m, 0.15, 0.35, 1.7, C.indigo);
  }
  if (level >= 7) {
    // Lầu chợ hai tầng mái hình thuyền: tầng dưới bày hàng, tầng trên có vách hoa văn.
    for (const x of [-0.75, 0, 0.75]) for (const z of [-0.85, -0.25]) p.cyl(0.045, 0.055, 0.8, C.woodDark, x, 0.9, z, undefined, 6);
    p.box(1.65, 0.08, 0.75, C.wood, 0, 1.3, -0.55);
    m.band.box(1.35, 0.42, 0.5, C.woodLight, 0, 1.55, -0.55);
    boatRoof(m, roof, { length: 2.1, width: 1.05, lift: 0.5, drop: 0.38, thickness: 0.07 }, 0, 1.95, -0.55);
    bird(m, 1.0, 2.45, -0.55, 1, 0.6);
    bird(m, -1.0, 2.45, -0.55, -1, 0.6);
    // Hàng bày dưới lầu.
    p.box(1.3, 0.1, 0.4, C.woodLight, 0, 0.62, -0.55);
    for (let i = 0; i < 5; i++) {
      const gx = -0.5 + i * 0.25;
      if (i % 2) p.sphere(0.08, i === 1 ? 0xd9862e : C.ripe, gx, 0.74, -0.55, [1, 0.8, 1], 6);
      else p.cyl(0.08, 0.06, 0.1, C.thatch, gx, 0.73, -0.55, undefined, 7);
    }
  }
  if (level >= 8) {
    // Kho hàng mái cong dựng ở đầu cầu tàu, chim đồng hai đầu nóc; thuyền buôn thứ hai neo bên kia (world.ts).
    for (const x of [0.3, 0.8]) for (const z of [2.05, 2.55]) p.cyl(0.035, 0.04, 0.5, C.woodDark, x, 0.6, z, undefined, 5);
    m.band.box(0.42, 0.34, 0.42, C.woodLight, 0.55, 0.55, 2.3);
    boatRoof(m, roof, { length: 0.85, width: 0.7, lift: 0.3, drop: 0.25, thickness: 0.05 }, 0.55, 1.0, 2.3, Math.PI / 2);
    bird(m, 0.55, 1.36, 2.72, 1, 0.35);
    for (let i = 0; i < 3; i++) p.cyl(0.08, 0.07, 0.14, C.thatch, 0.4 + i * 0.15, 0.44, 1.8, undefined, 7);
  }
  const g = m.group();
  g.scale.setScalar(0.9 + 0.025 * grown(level));
  return g;
}

// ---------- Nhà sàn ----------

/** Một nóc nhà sàn mái tròn, màu mái theo `roof`; có viền thì thêm vành diềm mái và chóp mái. */
function domeHouse(m: ToonModel, x: number, z: number, s: number, roof: Roof = THATCH): void {
  const p = m.plain;
  const postH = 0.55 * s;
  for (const dx of [-0.32, 0.32]) for (const dz of [-0.28, 0.28]) p.cyl(0.045, 0.055, postH, C.woodDark, x + dx * s, postH / 2, z + dz * s, undefined, 6);
  p.box(0.95 * s, 0.08, 0.85 * s, C.wood, x, postH, z);
  m.band.cyl(0.4 * s, 0.42 * s, 0.32 * s, C.woodLight, x, postH + 0.17 * s, z, undefined, 12);
  domeRoof(m.band, 0.62 * s, 0.55 * s, roof.main, x, postH + 0.3 * s, z);
  p.box(0.2 * s, 0.24 * s, 0.04, C.woodDark, x, postH + 0.14 * s, z + 0.4 * s);
  if (roof.trim !== null) {
    p.add(new THREE.TorusGeometry(0.6 * s, 0.04 * s, 5, 24), roof.trim, x, postH + 0.31 * s, z, [Math.PI / 2, 0, 0], [1, 0.9, 1]);
    p.cone(0.1 * s, 0.16 * s, roof.trim, x, postH + 0.88 * s, z, undefined, 8);
  }
}

export function makeNhaSan(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = roofFor(level);
  p.box(1.95, 0.06, 1.95, C.soil, 0, 0.03, 0);
  if (level <= 2) {
    domeHouse(m, 0, 0, 1.15);
    if (level >= 2) {
      // Hiên trước, thang tre, chum nước.
      p.box(0.9, 0.06, 0.4, C.wood, 0, 0.6, 0.62);
      for (let i = 0; i < 3; i++) p.box(0.3, 0.04, 0.1, C.woodDark, 0, 0.45 - i * 0.16, 0.9 + i * 0.1);
      p.cyl(0.12, 0.09, 0.2, C.soil, -0.65, 0.12, 0.7, undefined, 8);
    }
  } else if (level >= 7) {
    // Hai nhà sàn nối nhau bằng cầu tre: nhà mái tròn và nhà mái thuyền, sàn cùng cao.
    domeHouse(m, 0.42, 0.38, 0.9, roof);
    if (level >= 8) {
      // Nhà sàn dài mái thuyền như nhà khắc trên trống đồng: mái vút cao hai đầu, chim đậu hai đầu nóc.
      stiltHall(m, { x: -0.25, z: -0.5, w: 1.3, d: 0.75, postH: 0.55, roofL: 1.8, roofW: 0.85, lift: 0.6, roof });
      const top = 0.55 + 0.68 + 0.85 * 0.4 + 0.6;
      bird(m, -0.25 + 0.88, top, -0.5, 1, 0.55);
      bird(m, -0.25 - 0.88, top, -0.5, -1, 0.55);
    } else {
      stiltHall(m, { x: -0.5, z: -0.45, w: 0.95, d: 0.75, postH: 0.5, roofL: 1.3, roofW: 0.8, lift: 0.32, roof });
      domeHouse(m, 0.6, -0.62, 0.5, roof);
    }
    // Cầu tre: hai cây tre làm sàn cầu, tay vịn hai bên.
    const len = 0.62;
    const a = Math.atan2(0.62, 0.7);
    p.box(0.16, 0.04, len, C.bamboo, 0.0, 0.5, -0.08, [0, a, 0]);
    for (const off of [-0.08, 0.08]) {
      const ox = Math.cos(a) * off;
      const oz = -Math.sin(a) * off;
      p.box(0.025, 0.025, len, C.bamboo, ox, 0.68, -0.08 + oz, [0, a, 0]);
      for (const t of [-0.25, 0, 0.25]) p.cyl(0.015, 0.015, 0.18, C.woodDark, ox + Math.sin(a) * t, 0.6, -0.08 + oz + Math.cos(a) * t, undefined, 4);
    }
  } else {
    domeHouse(m, 0.3, 0.3, 1.0, roof);
    domeHouse(m, -0.5, -0.45, 0.75, roof);
    if (level >= 5) domeHouse(m, 0.55, -0.55, 0.62, roof);
  }
  if (level >= 4) {
    // Rào tre quanh vườn, luống rau.
    for (let i = 0; i < 9; i++) {
      const t = -0.9 + i * 0.225;
      p.cyl(0.02, 0.02, 0.3, C.bamboo, t, 0.15, 0.95, undefined, 4);
      p.cyl(0.02, 0.02, 0.3, C.bamboo, -0.95, 0.15, t, undefined, 4);
    }
    if (level < 6) p.box(0.5, 0.06, 0.3, 0x5f7f3a, -0.55, 0.06, 0.65);
  }
  if (level >= 5) bird(m, level >= 7 ? 0.42 : 0.3, level >= 7 ? 1.2 : 1.3, level >= 7 ? 0.38 : 0.3, 1, 0.6);
  if (level >= 6) {
    // Sàn phơi lúa trên cọc thấp: thóc vàng trải đều, cây cào gỗ.
    for (const x of [-0.82, -0.28]) for (const z of [0.38, 0.78]) p.cyl(0.03, 0.03, 0.3, C.woodDark, x, 0.15, z, undefined, 5);
    p.box(0.66, 0.05, 0.52, C.bamboo, -0.55, 0.31, 0.58);
    p.box(0.58, 0.04, 0.44, C.ripe, -0.55, 0.35, 0.58);
    p.cyl(0.012, 0.012, 0.55, C.woodDark, -0.4, 0.45, 0.58, [0, 0, 1.0], 4);
    // Chuồng gà tre dưới sàn nhà, hai con gà ra sân.
    const hx = level >= 7 ? 0.42 : 0.3;
    const hz = level >= 7 ? 0.38 : 0.3;
    p.box(0.42, 0.24, 0.3, C.bamboo, hx, 0.13, hz);
    for (let i = 0; i < 3; i++) p.box(0.02, 0.24, 0.31, C.woodDark, hx - 0.14 + i * 0.14, 0.13, hz);
    for (const [cx, cz, c] of [[0.62, 0.82, C.cream], [0.82, 0.62, 0xb8743a]] as const) {
      p.sphere(0.08, c, cx, 0.1, cz, [1, 0.9, 1.2], 7);
      p.sphere(0.05, c, cx, 0.19, cz + 0.06, [1, 1, 1], 6);
      p.cone(0.025, 0.06, C.red, cx, 0.25, cz + 0.06, undefined, 4);
      p.cone(0.015, 0.04, C.bronzeLight, cx, 0.18, cz + 0.12, [Math.PI / 2, 0, 0], 4);
    }
  }
  const g = m.group();
  g.scale.setScalar(sizeFor(level));
  return g;
}

// ---------- Bãi đất đá ----------

export function makeBaiDa(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.95, 0.1, 1.95, C.earth, 0, 0.05, 0);
  const rand = seeded(17);
  for (let i = 0; i < 2 + grown(level); i++) {
    const x = -0.6 + rand() * 1.2;
    const z = -0.2 + rand() * 0.8;
    p.sphere(0.2 + rand() * 0.12, i % 2 ? C.rock : C.rockDark, x, 0.15, z, [1.2, 0.7, 1], 6);
  }
  if (level >= 2) for (let i = 0; i < 3; i++) p.box(0.32, 0.18, 0.24, C.rock, 0.55, 0.19 + i * 0.18, 0.55, [0, i * 0.3, 0]);
  if (level >= 3 && level < 6) {
    // Khung tời gỗ hình chữ A để kéo đá.
    for (const s of [-1, 1]) p.cyl(0.035, 0.04, 1.5, C.woodDark, s * 0.35, 0.72, -0.55, [0, 0, s * 0.3], 5);
    p.cyl(0.03, 0.03, 0.9, C.wood, 0, 1.35, -0.55, [0, 0, Math.PI / 2], 5);
    p.cyl(0.008, 0.008, 0.5, C.cream, 0, 1.1, -0.55, undefined, 4);
    p.box(0.22, 0.2, 0.2, C.rock, 0, 0.82, -0.55);
  }
  if (level >= 4) {
    // Hố đá đào sâu, bậc gỗ xuống hố.
    p.box(0.9, 0.04, 0.7, 0x3d3530, -0.4, 0.105, -0.5);
    for (let i = 0; i < 3; i++) p.box(0.3, 0.04, 0.12, C.woodDark, -0.4, 0.13, -0.15 + i * 0.12);
  }
  if (level >= 5) {
    // Xe gỗ chở đá.
    for (const s of [-1, 1]) p.cyl(0.14, 0.14, 0.04, C.woodDark, -0.65 + s * 0.22, 0.14, 0.7, [0, 0, Math.PI / 2], 8);
    p.box(0.42, 0.14, 0.32, C.wood, -0.65, 0.3, 0.7);
    p.sphere(0.14, C.rock, -0.65, 0.42, 0.7, [1.3, 0.6, 1], 6);
  }
  if (level >= 8) {
    // Trâu kéo xe đá, đứng cạnh xe; giàn cần vọt: cột chống, đòn dài, đầu này đá đối trọng, đầu kia thúng đá.
    buffalo(p, -0.2, 0.62);
    p.cyl(0.012, 0.012, 0.42, C.cream, -0.43, 0.35, 0.7, [0, 0, Math.PI / 2], 4);
    p.cyl(0.05, 0.06, 1.1, C.woodDark, 0.72, 0.55, 0.05, undefined, 6);
    p.cyl(0.03, 0.035, 1.5, C.wood, 0.72, 1.12, 0.05, [0.45, 0, 0], 5);
    p.sphere(0.13, C.rockDark, 0.72, 0.85, -0.6, [1.1, 0.9, 1], 6);
    p.cyl(0.008, 0.008, 0.6, C.cream, 0.72, 1.12, 0.72, undefined, 4);
    p.cyl(0.11, 0.08, 0.14, C.thatch, 0.72, 0.78, 0.72, undefined, 8);
    p.sphere(0.08, C.rock, 0.72, 0.86, 0.72, [1, 0.6, 1], 6);
  }
  if (level >= 6) {
    // Tời gỗ lớn: cột cái, cần với ra trên hố, dây thả khối đá; bánh xe tời quay tay dưới chân cột.
    p.cyl(0.06, 0.08, 1.9, C.woodDark, -0.85, 0.95, -0.85, undefined, 6);
    for (const s of [-1, 1]) p.cyl(0.035, 0.04, 1.1, C.wood, -0.85 + s * 0.22, 0.5, -0.62, [0.45, 0, -s * 0.3], 5);
    p.cyl(0.04, 0.045, 1.0, C.wood, -0.62, 1.72, -0.68, [0.7, 0, -0.9], 5);
    p.cyl(0.008, 0.008, 0.95, C.cream, -0.32, 1.12, -0.48, undefined, 4);
    p.box(0.34, 0.26, 0.3, C.rock, -0.32, 0.6, -0.48);
    p.add(new THREE.TorusGeometry(0.28, 0.03, 6, 16), C.woodDark, -0.55, 0.4, -0.95, [0, 0, 0]);
    for (let i = 0; i < 4; i++) p.box(0.03, 0.56, 0.03, C.wood, -0.55, 0.4, -0.95, [0, 0, (i * Math.PI) / 4]);
    // Lán che bánh xe tời, mái theo cấp như mọi công trình có mái.
    for (const x of [-0.92, -0.16]) for (const z of [-0.95, -0.66]) p.cyl(0.03, 0.035, 0.86, C.woodDark, x, 0.43, z, undefined, 5);
    boatRoof(m, roofFor(level), { length: 1.0, width: 0.62, lift: 0.14, drop: 0.18, thickness: 0.05 }, -0.54, 1.0, -0.84);
  }
  const g = m.group();
  if (level >= 7) {
    // Lò nung gạch đất: lò vòm đất nung có ống khói bốc khói, chồng gạch đỏ bên cạnh.
    const k = new ToonModel(inkThin);
    k.plain.cyl(0.4, 0.44, 0.18, C.earthDark, 0.55, 0.09, -0.5, undefined, 12);
    k.band.add(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), BRICK, 0.55, 0.16, -0.5, [0, 0, 0], [0.4, 0.42, 0.4]);
    k.plain.box(0.2, 0.18, 0.08, 0x2a1d12, 0.55, 0.26, -0.12);
    k.plain.cyl(0.07, 0.09, 0.42, C.earthDark, 0.68, 0.72, -0.62, undefined, 8);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) k.plain.box(0.16, 0.07, 0.09, BRICK, 0.05 + j * 0.18, 0.16 + i * 0.08, -0.85);
    g.add(k.group());
    const glow = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 6), new THREE.MeshBasicMaterial({ color: C.ember }));
    glow.position.set(0.55, 0.24, -0.06);
    glow.userData.flame = true;
    g.add(glow);
    const smoke = new THREE.Group();
    smoke.userData.smoke = true;
    const mat = new THREE.MeshBasicMaterial({ color: 0x9a948c, transparent: true, opacity: 0.5, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), mat);
      puff.userData.phase = i / 4;
      smoke.add(puff);
    }
    smoke.position.set(0.68, 0.95, -0.62);
    g.add(smoke);
  }
  return g;
}

/** Gạch đất nung đỏ. */
const BRICK = 0xa8502e;
/** Sắt rèn binh khí: thép xám xanh như ngựa sắt của Gióng. */
const IRON_BLADE = 0x7b8a9c;

// ---------- Lò rèn ----------

/** Lò nung hình nón bằng đất sét, miệng lò có lửa. */
function kiln(m: ToonModel, g: THREE.Group, x: number, z: number, s: number): void {
  const p = m.plain;
  p.cyl(0.42 * s, 0.5 * s, 0.25 * s, C.soil, x, 0.13 * s, z, undefined, 10);
  p.cone(0.45 * s, 0.95 * s, C.earth, x, 0.25 * s + 0.47 * s, z, undefined, 10);
  p.cyl(0.08 * s, 0.1 * s, 0.25 * s, C.earthDark, x, 0.25 * s + 0.95 * s, z, undefined, 8);
  p.box(0.22 * s, 0.2 * s, 0.1 * s, 0x2a1d12, x, 0.2 * s, z + 0.45 * s);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1 * s, 0.24 * s, 6), new THREE.MeshBasicMaterial({ color: C.fire }));
  flame.position.set(x, 0.24 * s, z + 0.5 * s);
  flame.userData.flame = true;
  const ember = new THREE.Mesh(new THREE.ConeGeometry(0.06 * s, 0.16 * s, 6), new THREE.MeshBasicMaterial({ color: C.ember }));
  ember.position.set(x, 0.22 * s, z + 0.52 * s);
  ember.userData.flame = true;
  g.add(flame, ember);
}

export function makeLoRen(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = roofFor(level);
  const extra = new THREE.Group();
  p.box(1.95, 0.08, 1.95, C.earthDark, 0, 0.04, 0);
  kiln(m, extra, -0.4, 0.3, 1.2);
  // Lán mái một dốc phía sau che chỗ đe; cấp 4 lán dài hơn, cấp 6 lán cao hơn để che giá binh khí.
  const shedL = level >= 4 ? 1.6 : 1.0;
  const shedH = level >= 6 ? 1.35 : 1.0;
  for (const x of [0.85 - shedL, 0.85]) for (const z of [-0.85, -0.2]) p.cyl(0.04, 0.05, shedH, C.woodDark, x, shedH / 2, z, undefined, 5);
  m.band.box(shedL + 0.25, 0.05, 0.85, roof.main, 0.85 - shedL / 2, shedH + 0.02, -0.52, [-0.25, 0, 0]);
  if (roof.trim !== null) {
    // Diềm mái trước và sau.
    for (const s of [-1, 1]) p.box(shedL + 0.29, 0.07, 0.07, roof.trim, 0.85 - shedL / 2, shedH + 0.04 + s * 0.105, -0.52 + s * 0.412, [-0.25, 0, 0]);
  }
  p.box(0.3, 0.16, 0.16, C.iron, 0.45, 0.36, -0.45);
  p.box(0.12, 0.22, 0.12, C.woodDark, 0.45, 0.18, -0.45);
  if (level >= 2 && level < 6) {
    // Bễ thổi lửa cạnh lò và giá treo đồ.
    p.box(0.34, 0.14, 0.24, C.wood, 0.15, 0.15, 0.45);
    p.box(0.5, 0.04, 0.06, C.woodDark, 0.6, 0.85, -0.85);
    for (let i = 0; i < 3; i++) p.box(0.04, 0.3, 0.04, C.iron, 0.45 + i * 0.12, 0.68, -0.84);
  }
  if (level >= 3 && level < 7) kiln(m, extra, 0.55, 0.55, 0.75);
  if (level >= 5) {
    // Giá trưng giáo và rìu đồng, thấp hơn mái lán.
    for (let i = 0; i < 4; i++) {
      p.cyl(0.015, 0.015, 0.75, C.woodDark, -0.85 + i * 0.13, 0.38, -0.8, undefined, 4);
      p.cone(0.035, 0.14, C.bronze, -0.85 + i * 0.13, 0.82, -0.8, undefined, 4);
    }
    p.box(0.16, 0.12, 0.03, C.bronze, -0.92, 0.7, -0.73, [0, 0, 0.5]);
  }
  if (level >= 8) {
    // Sân đúc đồng: khuôn đất đúc trống đồng, nồi nấu đồng nghiêng rót nước đồng đỏ rực vào khuôn.
    p.cyl(0.21, 0.23, 0.34, C.earthDark, 0.1, 0.21, 0.8, undefined, 12);
    p.cyl(0.22, 0.22, 0.04, C.earth, 0.1, 0.39, 0.8, undefined, 12);
    p.cyl(0.03, 0.03, 0.55, C.woodDark, -0.12, 0.32, 0.92, [0, 0, 0.35], 5);
    p.cyl(0.03, 0.03, 0.55, C.woodDark, 0.32, 0.32, 0.92, [0, 0, -0.35], 5);
    p.box(0.5, 0.03, 0.03, C.woodDark, 0.1, 0.58, 0.92);
    p.cyl(0.1, 0.07, 0.13, C.bronzeDark, 0.1, 0.6, 0.88, [0.6, 0, 0], 8);
    const pour = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.18, 6), new THREE.MeshBasicMaterial({ color: C.ember }));
    pour.position.set(0.1, 0.48, 0.83);
    pour.userData.flame = true;
    extra.add(pour);
    const melt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 12), new THREE.MeshBasicMaterial({ color: C.ember }));
    melt.position.set(0.1, 0.415, 0.8);
    extra.add(melt);
    // Trống đồng vừa đúc xong đặt trên giá gỗ thấp ở góc trước.
    for (const dx of [-0.16, 0.16]) for (const dz of [-0.14, 0.14]) p.cyl(0.025, 0.025, 0.2, C.woodDark, -0.78 + dx, 0.12, 0.8 + dz, undefined, 5);
    p.box(0.42, 0.04, 0.36, C.wood, -0.78, 0.23, 0.8);
    drum(m, -0.78, 0.8, 0.62, 0.21);
  } else if (level >= 6) {
    // Ống bễ đôi bằng gỗ bọc da: hai ống đứng, cán pít-tông, vòi thổi vào miệng lò.
    for (const x of [0.02, 0.26]) {
      p.cyl(0.11, 0.12, 0.6, C.wood, x, 0.34, 0.8, undefined, 10);
      p.cyl(0.115, 0.115, 0.08, 0x7a4a2a, x, 0.66, 0.8, undefined, 10);
      p.cyl(0.02, 0.02, 0.3, C.woodDark, x, 0.84, 0.8, undefined, 5);
      p.box(0.14, 0.03, 0.03, C.woodDark, x, 0.99, 0.8);
    }
    p.cyl(0.03, 0.03, 0.42, C.woodDark, -0.2, 0.16, 0.78, [0, 0, Math.PI / 2], 5);
  }
  if (level >= 6) {
    // Giá treo binh khí sắt dựng sau lán: kiếm, giáo, rìu sắt treo ngay ngắn.
    p.box(1.25, 0.05, 0.06, C.woodDark, 0.2, 1.05, -0.9);
    p.box(1.25, 0.05, 0.06, C.woodDark, 0.2, 0.45, -0.9);
    for (const x of [-0.42, 0.82]) p.cyl(0.035, 0.04, 1.1, C.woodDark, x, 0.55, -0.9, undefined, 5);
    for (let i = 0; i < 5; i++) {
      const x = -0.25 + i * 0.22;
      if (i % 2) {
        p.box(0.05, 0.5, 0.02, IRON_BLADE, x, 0.72, -0.86);
        p.box(0.14, 0.03, 0.03, C.bronze, x, 0.47, -0.86);
      } else {
        p.cyl(0.012, 0.012, 0.6, C.woodDark, x, 0.72, -0.86, undefined, 4);
        p.cone(0.04, 0.16, IRON_BLADE, x, 1.08, -0.86, undefined, 4);
      }
    }
  }
  if (level >= 7) {
    // Lò luyện cao thứ hai: thân tròn đắp đất có đai sắt, lửa đỏ rực trên miệng, máng sắt nóng chảy.
    p.cyl(0.36, 0.44, 1.25, C.earth, 0.55, 0.62, 0.45, undefined, 12);
    for (const y of [0.35, 0.75, 1.1]) p.cyl(0.43 - y * 0.05, 0.43 - y * 0.05, 0.05, C.iron, 0.55, y, 0.45, undefined, 12);
    p.box(0.12, 0.05, 0.5, C.earthDark, 0.55, 0.1, 0.85);
    for (const [r, h, color, y] of [[0.24, 0.55, C.fire, 1.48], [0.15, 0.38, C.ember, 1.44]] as const) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), new THREE.MeshBasicMaterial({ color }));
      flame.position.set(0.55, y, 0.45);
      flame.userData.flame = true;
      extra.add(flame);
    }
    const melt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.42), new THREE.MeshBasicMaterial({ color: C.ember }));
    melt.position.set(0.55, 0.14, 0.86);
    extra.add(melt);
  }
  const g = m.group();
  g.add(extra);
  g.scale.setScalar(sizeFor(level));
  return g;
}

// ---------- Kho thóc ----------

/** Một kho tròn trên cột cao (có đĩa chặn chuột), mái nón màu theo `roof`. */
function granary(m: ToonModel, x: number, z: number, s: number, finial: boolean, roof: Roof = THATCH): void {
  const p = m.plain;
  const postH = 0.8 * s;
  for (const dx of [-0.25, 0.25]) for (const dz of [-0.25, 0.25]) {
    p.cyl(0.05, 0.06, postH, C.woodDark, x + dx * s, postH / 2, z + dz * s, undefined, 6);
    p.cyl(0.1 * s, 0.1 * s, 0.04, C.rock, x + dx * s, postH * 0.75, z + dz * s, undefined, 8);
  }
  p.cyl(0.42 * s, 0.42 * s, 0.06, C.wood, x, postH, z, undefined, 12);
  m.band.cyl(0.36 * s, 0.38 * s, 0.6 * s, C.woodLight, x, postH + 0.3 * s, z, undefined, 12);
  coneRoof(m, roof, 0.58 * s, 0.62 * s, x, postH + 0.6 * s + 0.31 * s, z, 12);
  if (finial && roof.trim === null) {
    p.cyl(0.03, 0.03, 0.3 * s, C.bronze, x, postH + 1.3 * s, z, undefined, 5);
    p.sphere(0.08 * s, C.bronzeLight, x, postH + 1.45 * s, z, [1, 1, 1], 8);
  }
}

export function makeKho(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = roofFor(level);
  p.box(1.95, 0.06, 1.95, C.soil, 0, 0.03, 0);
  if (level <= 2) granary(m, 0, 0, 1.15, false);
  else if (level >= 7) {
    // Ba vựa trên cột và cót thóc lớn quây quanh sân phơi lát gạch ở giữa.
    // Cấp 8: kho sàn dài mái cong thay hai vựa phía sau, chim đồng hai đầu nóc.
    if (level >= 8) {
      stiltHall(m, { x: 0, z: -0.6, w: 1.6, d: 0.66, postH: 0.6, roofL: 1.95, roofW: 0.8, lift: 0.45, roof });
      const top = 0.6 + 0.68 + 0.8 * 0.4 + 0.45;
      bird(m, 0.95, top, -0.6, 1, 0.5);
      bird(m, -0.95, top, -0.6, -1, 0.5);
    } else {
      granary(m, 0.62, -0.62, 0.72, true, roof);
      granary(m, -0.62, -0.62, 0.66, false, roof);
    }
    granary(m, 0.66, 0.62, 0.6, level >= 8, roof);
    // Sân phơi lát gạch ở giữa, chéo về phía trước cho dễ thấy giữa ba mái vựa.
    p.box(1.05, 0.05, 1.05, 0xc9b08a, -0.1, 0.07, 0.15, [0, Math.PI / 4, 0]);
    p.box(0.85, 0.03, 0.85, C.ripe, -0.1, 0.11, 0.15, [0, Math.PI / 4, 0]);
    for (let i = 0; i < 3; i++) p.box(0.85, 0.02, 0.035, C.thatchDark, -0.1 - 0.2 + i * 0.2, 0.13, 0.15 + 0.2 - i * 0.2, [0, Math.PI / 4, 0]);
    p.cyl(0.014, 0.014, 0.7, C.woodDark, 0.05, 0.3, 0.35, [0, 0, 1.1], 4);
    p.box(0.26, 0.05, 0.04, C.woodDark, -0.23, 0.15, 0.35);
  } else {
    granary(m, 0.32, 0.3, level >= 5 ? 1.05 : 0.95, level >= 5, roof);
    granary(m, -0.5, -0.45, 0.72, false, roof);
    if (level >= 4) granary(m, 0.55, -0.55, 0.6, false, roof);
  }
  if (level >= 2 && level < 7) {
    // Thang tre và thúng thóc. Từ cấp 6 cót thóc lớn đứng chỗ thang, thúng dời sang phải.
    if (level < 6) for (const s of [-1, 1]) p.cyl(0.02, 0.02, 1.0, C.bamboo, -0.6 + s * 0.1, 0.5, 0.6, [0.35, 0, 0], 4);
    const x0 = level >= 6 ? 0.0 : -0.75;
    for (let i = 0; i < Math.min(level, 4); i++) {
      p.cyl(0.13, 0.1, 0.18, C.thatch, x0 + i * 0.25, 0.12, 0.85, undefined, 8);
      p.sphere(0.11, C.ripe, x0 + i * 0.25, 0.22, 0.85, [1, 0.5, 1], 6);
    }
  }
  if (level >= 6) {
    // Vựa thóc tròn thứ hai: cót tre đan lớn trên vòng đá, thóc đầy vun lên miệng cót.
    const [cx, cz] = level >= 7 ? [-0.6, 0.6] : [-0.55, 0.42];
    p.cyl(0.4, 0.42, 0.08, C.rock, cx, 0.08, cz, undefined, 12);
    m.band.cyl(0.36, 0.38, 0.6, C.thatch, cx, 0.42, cz, undefined, 12);
    for (const y of [0.25, 0.45, 0.65]) p.cyl(0.385, 0.385, 0.035, C.bamboo, cx, y, cz, undefined, 12);
    p.sphere(0.34, C.ripe, cx, 0.72, cz, [1, 0.4, 1], 10);
  }
  const g = m.group();
  g.scale.setScalar(sizeFor(level));
  return g;
}

// ---------- Doanh trại ----------

/** Nhà dài để trống không vách, mái tranh thấp: chỗ lính nghỉ. */
function openHall(m: ToonModel, x: number, z: number, length: number, ry = 0): void {
  const p = m.plain;
  const cos = Math.cos(ry);
  const sin = Math.sin(ry);
  for (let i = 0; i <= 3; i++) {
    const t = -length / 2 + (i * length) / 3;
    for (const s of [-0.5, 0.5]) p.cyl(0.05, 0.06, 0.95, C.woodDark, x + t * cos + s * sin, 0.48, z - t * sin + s * cos, undefined, 6);
  }
  // Mái thẳng kiểu nhà dài: khác hẳn mái cong vút của Điện.
  m.plain.add(saddleRoof({ length: length + 0.4, width: 1.5, lift: 0.0, drop: 0.6, thickness: 0.08 }), C.thatchDark, x, 1.5, z, [0, ry, 0]);
  p.box(0.12, 0.08, 0.9, C.woodLight, x, 0.25, z);
}

export function makeDoanhTrai(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(2.9, 0.08, 2.9, C.earth, 0, 0.04, 0);
  openHall(m, 0.2, -0.85, 2.2);
  // Giá giáo đồng.
  p.box(0.9, 0.05, 0.06, C.woodDark, -0.65, 0.85, 0.2);
  p.box(0.9, 0.05, 0.06, C.woodDark, -0.65, 0.35, 0.2);
  for (let i = 0; i < 5; i++) {
    p.cyl(0.015, 0.015, 1.2, C.woodDark, -1.0 + i * 0.18, 0.62, 0.2, undefined, 5);
    p.cone(0.04, 0.16, C.bronze, -1.0 + i * 0.18, 1.3, 0.2, undefined, 4);
  }
  banner(m, 1.25, 1.25, 2.2, C.red);
  if (level >= 2) {
    // Cọc rơm tập đâm.
    for (const x of [0.2, 0.65]) {
      p.cyl(0.03, 0.03, 0.8, C.woodDark, x, 0.4, 0.75, undefined, 5);
      p.cyl(0.13, 0.13, 0.36, C.thatch, x, 0.62, 0.75, undefined, 7);
      p.box(0.4, 0.05, 0.05, C.woodDark, x, 0.7, 0.75);
    }
  }
  if (level >= 3) {
    // Hàng rào cọc vót nhọn quanh sân tập, chừa cổng trước.
    for (let i = 0; i < 12; i++) {
      const t = -1.4 + i * 0.255;
      p.cone(0.05, 0.55, C.wood, -1.4, 0.3, t, undefined, 5);
      if (Math.abs(t) > 0.45) p.cone(0.05, 0.55, C.wood, t, 0.3, 1.4, undefined, 5);
    }
  }
  if (level >= 4) openHall(m, -0.95, -0.2, 1.3, Math.PI / 2);
  if (level >= 5) {
    // Chòi trống trận.
    for (const x of [0.95, 1.35]) for (const z of [0.25, 0.65]) p.cyl(0.04, 0.05, 1.6, C.woodDark, x, 0.8, z, undefined, 5);
    p.box(0.6, 0.06, 0.6, C.wood, 1.15, 1.6, 0.45);
    drum(m, 1.15, 0.45, 0.8, 1.6);
    banner(m, -1.25, 1.25, 2.6, C.red);
  }
  const g = m.group();
  g.scale.setScalar(0.9 + 0.025 * level);
  return g;
}

// ---------- Chòi canh ----------

/**
 * Nỏ lớn gác qua lan can: chân xoay, báng gỗ dài, cánh nỏ đồng uốn chữ V, dây kéo về lẫy, mũi tên sắt lớn.
 * Chân nỏ ở (x, z) trên sàn cao `floor`, chĩa theo hướng `ry` (0 là ra trước, +z).
 */
function bigCrossbow(x: number, floor: number, z: number, ry: number): THREE.Group {
  const g = new ToonModel();
  const p = g.plain;
  const ny = 0.36;
  p.cyl(0.05, 0.06, 0.3, C.woodDark, 0, 0.2, 0, undefined, 6);
  p.box(0.11, 0.09, 0.8, C.wood, 0, ny, 0.25);
  for (const sx of [-1, 1]) {
    p.box(0.46, 0.07, 0.07, C.bronze, sx * 0.21, ny + 0.02, 0.58, [0, sx * 0.4, 0]);
    p.box(0.012, 0.012, 0.51, C.cream, sx * 0.21, ny + 0.05, 0.345, [0, sx * 0.966, 0]);
  }
  p.cyl(0.02, 0.02, 0.7, IRON_BLADE, 0, ny + 0.07, 0.4, [Math.PI / 2, 0, 0], 4);
  p.cone(0.05, 0.14, IRON_BLADE, 0, ny + 0.07, 0.8, [Math.PI / 2, 0, 0], 4);
  const c = g.group();
  c.position.set(x, floor, z);
  c.rotation.y = ry;
  return c;
}

export function makeChoiCanh(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = roofFor(level);
  const bows: THREE.Group[] = [];
  const h = 1.5 + grown(level) * 0.25;
  if (level >= 7) {
    // Lầu canh đá: chân lầu xây đá hộc thu nhỏ dần, ô cửa bắn.
    for (let i = 0; i < 3; i++) {
      const w = 0.98 - i * 0.08;
      p.box(w, h * 0.18, w, i % 2 ? C.rockDark : C.rock, 0, h * 0.09 + i * h * 0.18, 0);
    }
    p.box(0.16, 0.22, 0.04, 0x2a1d12, 0, h * 0.42, 0.42);
  }
  for (const x of [-0.32, 0.32]) {
    for (const z of [-0.32, 0.32]) p.cyl(0.04, 0.05, h + 0.1, C.woodDark, x * 0.85, h / 2, z * 0.85, [z * 0.08, 0, -x * 0.08], 5);
  }
  for (const y of [h * 0.35, h * 0.7]) {
    p.box(0.62, 0.04, 0.04, C.wood, 0, y, 0.28);
    p.box(0.62, 0.04, 0.04, C.wood, 0, y, -0.28);
  }
  p.box(0.8, 0.07, 0.8, C.wood, 0, h, 0);
  if (level >= 2) {
    for (const s of [-1, 1]) {
      p.box(0.8, 0.18, 0.04, C.woodLight, 0, h + 0.12, s * 0.38);
      p.box(0.04, 0.18, 0.8, C.woodLight, s * 0.38, h + 0.12, 0);
    }
  }
  if (level >= 3) {
    for (const x of [-0.36, 0.36]) for (const z of [-0.36, 0.36]) p.cyl(0.025, 0.025, 0.7, C.woodDark, x, h + 0.35, z, undefined, 5);
    boatRoof(m, roof, { length: 1.1, width: 1.0, lift: 0.18, drop: 0.3, thickness: 0.05 }, 0, h + 0.85, 0);
    p.box(0.25, 0.16, 0.02, C.red, 0.5, h + 0.95, 0.0);
  }
  if (level >= 5) {
    if (roof.trim === null) p.box(0.7, 0.05, 0.14, C.bronzeLight, 0, h + 0.88, 0);
    drum(m, -0.2, -0.2, 0.35, h + 0.03);
  }
  if (level >= 6) {
    // Tầng giữa có lan can: chòi thành hai tầng.
    const y = h * 0.58;
    p.box(0.86, 0.06, 0.86, C.wood, 0, y, 0);
    for (const s of [-1, 1]) {
      p.box(0.86, 0.16, 0.04, C.woodLight, 0, y + 0.1, s * 0.41);
      p.box(0.04, 0.16, 0.86, C.woodLight, s * 0.41, y + 0.1, 0);
    }
    bows.push(bigCrossbow(-0.17, h, 0.2, 0));
    // Cấp 8: thêm một nỏ lớn nữa chĩa sang phải.
    if (level >= 8) bows.push(bigCrossbow(0.2, h, -0.1, Math.PI / 2));
  }
  if (level >= 7) {
    // Cờ đỏ cắm trên nóc lầu canh.
    p.cyl(0.025, 0.025, 0.8, C.woodDark, 0, h + 1.35, 0, undefined, 5);
    m.band.box(0.42, 0.28, 0.03, C.red, 0.22, h + 1.6, 0);
  }
  const g = m.group();
  for (const b of bows) g.add(b);
  const archer = makeFighter('cung');
  archer.scale.setScalar(0.62);
  archer.position.set(0, h + 0.05, 0.05);
  g.add(archer);
  return g;
}

// ---------- Lầu nỏ ----------

/**
 * Lầu nỏ ghép từ hai chòi canh cấp 8: chân đất nện cao như thành Cổ Loa, có đai đồng và ô cửa bắn; lầu gỗ hai tầng,
 * sàn trên cùng có ba cây nỏ lớn chĩa ba hướng và ba lính nỏ; mái tranh ba tầng chồng nhau, chim đồng trên đỉnh.
 * Móng một ô như chòi canh, nhưng cao hơn hẳn để nhìn là biết.
 */
export function makeLauNo(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  // Ghép từ hai chòi canh cấp 8 nên mái như cấp 8.
  const roof = roofFor(8);
  const base = 1.85;
  // Chân đất nện thu nhỏ dần, đai đồng giữa các lớp, ô cửa bắn hai mặt trông ra.
  for (let i = 0; i < 3; i++) {
    const w = 1.0 - i * 0.09;
    p.box(w, base / 3, w, i % 2 ? C.earthDark : C.earth, 0, base / 6 + (i * base) / 3, 0);
    if (i) p.box(w + 0.03, 0.05, w + 0.03, C.bronze, 0, (i * base) / 3, 0);
  }
  for (const y of [0.55, 1.2]) {
    p.box(0.12, 0.2, 0.04, 0x2a1d12, 0, y, 0.47);
    p.box(0.04, 0.2, 0.12, 0x2a1d12, 0.47, y, 0);
  }
  // Hai tầng lầu gỗ, mỗi tầng một vòng lan can đỏ.
  const f1 = base + 0.05;
  const f2 = f1 + 0.95;
  for (const x of [-0.36, 0.36]) for (const z of [-0.36, 0.36]) p.cyl(0.045, 0.05, f2 - base + 0.75, C.woodDark, x, base + (f2 - base + 0.75) / 2, z, undefined, 6);
  for (const [y, w] of [[f1, 0.9], [f2, 0.98]] as const) {
    p.box(w, 0.07, w, C.wood, 0, y, 0);
    for (const sd of [-1, 1]) {
      m.band.box(w, 0.16, 0.04, C.red, 0, y + 0.11, sd * (w / 2 - 0.02));
      m.band.box(0.04, 0.16, w, C.red, sd * (w / 2 - 0.02), y + 0.11, 0);
    }
  }
  // Mái tầng dưới che tầng giữa.
  boatRoof(m, roof, { length: 1.15, width: 1.05, lift: 0.2, drop: 0.28, thickness: 0.05 }, 0, f1 + 0.72, 0);
  // Mái ba tầng chồng nhau trên cùng, xoay đổi hướng, sống mái bọc đồng, chim đồng dang cánh trên đỉnh.
  boatRoof(m, roof, { length: 1.25, width: 1.15, lift: 0.25, drop: 0.34, thickness: 0.05 }, 0, f2 + 0.95, 0);
  boatRoof(m, roof, { length: 0.9, width: 0.8, lift: 0.2, drop: 0.24, thickness: 0.05 }, 0, f2 + 1.32, 0, Math.PI / 2, true);
  boatRoof(m, roof, { length: 0.55, width: 0.5, lift: 0.14, drop: 0.16, thickness: 0.04 }, 0, f2 + 1.6, 0);
  birdSpread(m, 0, f2 + 1.68, 0, 0.75);
  // Hai cờ đỏ cắm hai góc sau.
  for (const x of [-0.42, 0.42]) {
    p.cyl(0.02, 0.02, 0.9, C.woodDark, x, f2 + 0.6, -0.42, undefined, 5);
    m.band.box(0.3, 0.2, 0.03, C.red, x + 0.16, f2 + 0.92, -0.42);
  }
  const g = m.group();
  // Ba nỏ lớn chĩa ra trước, sang phải và sang trái, mỗi nỏ một lính nỏ đứng sau.
  g.add(bigCrossbow(0, f2, 0.12, 0), bigCrossbow(0.12, f2, -0.05, Math.PI / 2), bigCrossbow(-0.12, f2, -0.05, -Math.PI / 2));
  for (const [x, z, ry] of [[0.18, -0.2, 0], [-0.25, 0.2, -Math.PI / 2], [0.25, 0.25, Math.PI / 2]] as const) {
    const archer = makeFighter('cung');
    archer.scale.setScalar(0.5);
    archer.position.set(x, f2 + 0.05, z);
    archer.rotation.y = ry;
    g.add(archer);
  }
  return g;
}

// ---------- Bẫy chông ----------

export function makeBayChong(): THREE.Group {
  const b = new ShapeBuilder(false, true);
  b.box(0.8, 0.03, 0.8, C.earthDark, 0, 0.015, 0);
  const rand = seeded(23);
  for (let i = 0; i < 9; i++) {
    const x = -0.24 + (i % 3) * 0.24 + (rand() - 0.5) * 0.06;
    const z = -0.24 + Math.floor(i / 3) * 0.24 + (rand() - 0.5) * 0.06;
    b.cone(0.035, 0.32, C.bamboo, x, 0.16, z, [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3], 4);
  }
  const g = new THREE.Group();
  const mesh = b.mesh(toon);
  g.add(mesh, outlineOf(mesh.geometry, inkThin));
  return g;
}

// ---------- Đền Phù Đổng ----------

/** Đền thờ Phù Đổng Thiên Vương: nền đá hai bậc, đền mái thuyền, tượng ngựa sắt trước sân. */
export function makeDenPhuDong(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(2.9, 0.22, 2.9, C.rock, 0, 0.11, 0);
  p.box(2.4, 0.16, 2.0, C.rockDark, 0, 0.3, -0.35);
  stiltHall(m, { x: 0, z: -0.45, w: 1.9, d: 1.3, postH: 0.85, roofL: 2.7, roofW: 1.7, lift: 0.65 });
  const roofTop = 0.85 + 0.68 + 1.7 * 0.4 + 0.65;
  bird(m, 1.25, roofTop, -0.45, 1, 0.8);
  bird(m, -1.25, roofTop, -0.45, -1, 0.8);
  // Bệ tượng và hai lư hương đồng.
  p.box(0.8, 0.32, 1.1, C.rock, 0, 0.38, 0.85);
  drum(m, -1.05, 1.0, 0.4, 0.22);
  drum(m, 1.05, 1.0, 0.4, 0.22);
  banner(m, -1.3, -1.25, 2.4, C.red);
  banner(m, 1.1, -1.25, 2.4, C.red);
  const g = m.group();
  const horse = new ToonModel(inkThin);
  ironHorse(horse);
  const statue = horse.group();
  statue.scale.setScalar(0.72);
  statue.position.set(0, 0.54, 0.75);
  g.add(statue);
  return g;
}

// ---------- Đền Tản Viên ----------

/** Đền thờ Sơn Tinh: nền đá ba bậc như sườn núi, đền mái thuyền, ba ngọn núi Ba Vì sau lưng, tượng Sơn Tinh trước sân. */
export function makeDenTanVien(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(2.9, 0.2, 2.9, C.rockDark, 0, 0.1, 0);
  p.box(2.5, 0.18, 2.4, C.rock, 0, 0.29, -0.2);
  p.box(2.0, 0.16, 1.8, C.rockDark, 0, 0.46, -0.45);
  // Ba ngọn núi Ba Vì, ngọn giữa cao nhất.
  for (const [x, r, h] of [[-0.95, 0.55, 1.5], [0, 0.7, 2.1], [0.95, 0.55, 1.5]] as const) {
    p.cone(r, h, C.mountainCloak, x, 0.54 + h / 2, -1.05, undefined, 8);
    p.cone(r * 0.35, h * 0.28, C.rock, x, 0.54 + h * 0.86, -1.05, undefined, 6);
  }
  stiltHall(m, { x: 0, z: -0.35, w: 1.7, d: 1.1, postH: 1.0, roofL: 2.4, roofW: 1.5, lift: 0.6 });
  const roofTop = 1.0 + 0.68 + 1.5 * 0.4 + 0.6;
  bird(m, 1.1, roofTop, -0.35, 1, 0.75);
  bird(m, -1.1, roofTop, -0.35, -1, 0.75);
  p.box(0.6, 0.3, 0.6, C.rock, 0, 0.35, 0.95);
  drum(m, -1.05, 1.0, 0.4, 0.2);
  drum(m, 1.05, 1.0, 0.4, 0.2);
  banner(m, -1.25, 0.4, 2.2, C.mountainCloak);
  banner(m, 1.05, 0.4, 2.2, C.red);
  const g = m.group();
  const statue = makeSonTinh();
  statue.scale.setScalar(0.5);
  statue.position.set(0, 0.5, 0.95);
  g.add(statue);
  return g;
}

// ---------- Đền Cổ Loa ----------

/**
 * Đền thờ An Dương Vương: nền đá hai bậc có lan can, đền mái thuyền hai tầng, trước sân là tượng Rùa Vàng
 * ngóc đầu và cây nỏ đồng lớn trên giá; hai bên cờ đỏ.
 */
export function makeDenCoLoa(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(2.9, 0.22, 2.9, C.rock, 0, 0.11, 0);
  p.box(2.5, 0.18, 1.9, C.rockDark, 0, 0.31, -0.45);
  // Lan can đá quanh sân.
  for (let i = 0; i < 7; i++) {
    const t = -1.35 + i * 0.45;
    p.box(0.1, 0.24, 0.1, C.rockDark, t, 0.34, 1.35);
    if (Math.abs(t) > 0.4) p.box(0.1, 0.24, 0.1, C.rockDark, 1.35, 0.34, t);
    if (Math.abs(t) > 0.4) p.box(0.1, 0.24, 0.1, C.rockDark, -1.35, 0.34, t);
  }
  stiltHall(m, { x: 0, z: -0.5, w: 2.0, d: 1.2, postH: 0.9, roofL: 2.8, roofW: 1.7, lift: 0.7 });
  const roofTop = 0.9 + 0.68 + 1.7 * 0.4 + 0.7;
  // Tầng mái trên nhỏ hơn, chim đồng hai đầu nóc.
  m.band.add(saddleRoof({ length: 1.8, width: 1.1, lift: 0.45, drop: 0.44, thickness: 0.08 }), C.thatchDark, 0, roofTop - 0.25, -0.5);
  bird(m, 0.95, roofTop + 0.15, -0.5, 1, 0.7);
  bird(m, -0.95, roofTop + 0.15, -0.5, -1, 0.7);
  drum(m, -1.05, 0.9, 0.38, 0.22);
  banner(m, -1.3, -1.3, 2.5, C.red);
  banner(m, 1.1, -1.3, 2.5, C.red);
  p.box(0.7, 0.14, 0.9, C.rock, -0.15, 0.29, 0.85);
  const g = m.group();
  const turtle = makeRuaVang();
  turtle.scale.setScalar(0.42);
  turtle.position.set(-0.15, 0.36, 0.8);
  g.add(turtle);
  const bow = makeCrossbowStand();
  bow.scale.setScalar(0.85);
  bow.position.set(0.85, 0.22, 0.75);
  bow.rotation.y = -0.4;
  g.add(bow);
  return g;
}

// ---------- Hội Tết: ruộng nếp, vườn đậu lá dong, chuồng lợn, bếp gói bánh ----------

/** Bông lúa nếp chín màu ngà, thân lúa xanh. */
const NEP = 0xecd9a0;
const NEP_STALK = 0x7f9a44;
/** Bờ ruộng nếp lát đá ong, cho khác bờ đất của ruộng lúa. */
const LATERITE = 0xa8643c;
/** Lá dong xanh thẫm, đậu xanh. */
const DONG = 0x3f7a3a;
const DAU = 0x6f9a3a;
const DAU_POD = 0x9fbf5a;
/** Lợn ỉ đen, mõm xám hồng; bùn chuồng. */
const PIG = 0x45403c;
const PIG_SNOUT = 0xb08070;
const MUD = 0x5a4026;
/** Bánh chưng gói lá dong buộc lạt, bánh giầy trắng. */
export const BANH_CHUNG = 0x4f7f35;
export const BANH_GIAY = 0xf4efe0;
export const LAT = 0xd8c48a;

/** Khóm lúa nếp: năm lá lúa xanh xòe, ba bông nếp trĩu hạt màu ngà cong rủ ra ngoài. */
function nepClump(p: ShapeBuilder, x: number, z: number, h: number): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    p.box(0.022, h, 0.022, NEP_STALK, x + Math.sin(a) * 0.03, 0.06 + h / 2, z + Math.cos(a) * 0.03, [Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25]);
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    for (let j = 0; j < 4; j++) {
      const r = 0.05 + j * 0.035;
      p.sphere(0.03 - j * 0.004, NEP, x + Math.sin(a) * r, 0.08 + h - j * j * 0.022, z + Math.cos(a) * r, [1, 1.25, 1], 6);
    }
  }
}

/** Bù nhìn rơm đội nón lá, dang hai tay. Gốc ở chân cọc. */
function scarecrow(m: ToonModel, x: number, z: number): void {
  const p = m.plain;
  p.cyl(0.025, 0.03, 1.05, C.woodDark, x, 0.52, z, undefined, 5);
  p.cyl(0.02, 0.02, 0.7, C.woodDark, x, 0.72, z, [0, 0, Math.PI / 2], 5);
  m.band.cyl(0.11, 0.15, 0.36, C.thatch, x, 0.62, z, undefined, 8);
  for (const s of [-1, 1]) p.cone(0.05, 0.14, C.thatchDark, x + s * 0.36, 0.7, z, [0, 0, s * 1.4], 5);
  p.sphere(0.09, C.cream, x, 0.9, z, [1, 1, 1], 8);
  p.cone(0.17, 0.15, C.cream, x, 1.03, z, undefined, 12);
}

/** Bó lúa nếp treo trên giàn phơi. */
function nepBundle(p: ShapeBuilder, x: number, y: number, z: number): void {
  p.capsule(0.05, 0.22, NEP, x, y - 0.18, z, undefined, [1, 1, 0.8]);
  p.cyl(0.03, 0.05, 0.12, NEP_STALK, x, y - 0.02, z, undefined, 6);
}

export function makeRuongNep(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const bank = 0.16;
  for (const s of [-1, 1]) {
    p.box(2.95, bank, 0.2, LATERITE, 0, bank / 2, s * 1.38);
    p.box(0.2, bank, 2.95, LATERITE, s * 1.38, bank / 2, 0);
  }
  p.box(2.6, 0.04, 2.6, C.paddyWater, 0, 0.05, 0);
  // Bờ con chia ruộng làm hai thửa.
  p.box(0.12, 0.09, 2.6, LATERITE, 0.0, 0.07, 0);
  // Cấp càng cao lúa càng dày, cao.
  const rows = level >= 2 ? 6 : 5;
  const step = 2.4 / rows;
  const h = 0.3 + level * 0.06;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < rows; j++) {
      const x = -1.2 + step * (i + 0.5);
      const z = -1.2 + step * (j + 0.5);
      if (Math.abs(x) < 0.12) continue;
      // Chừa chỗ bù nhìn giữa thửa trái.
      if (level >= 2 && Math.hypot(x + 0.55, z + 0.15) < 0.3) continue;
      nepClump(p, x, z, h);
    }
  }
  if (level >= 2) scarecrow(m, -0.55, -0.15);
  if (level >= 3) {
    // Giàn tre phơi bó nếp dọc bờ sau.
    for (const x of [-1.2, 1.2]) for (const dz of [-0.06, 0.06]) p.cyl(0.035, 0.04, 1.15, C.bamboo, x, 0.6, -1.32 + dz, [dz * 2, 0, 0], 5);
    for (const y of [1.08, 0.78]) p.cyl(0.03, 0.03, 2.5, C.bamboo, 0, y, -1.32, [0, 0, Math.PI / 2], 5);
    for (let i = 0; i < 9; i++) {
      const x = -1.0 + i * 0.25;
      nepBundle(p, x, i % 2 ? 0.78 : 1.08, -1.32);
    }
  }
  return m.group();
}

/** Khóm lá dong: lá to bản mọc xòe trên cuống dài. */
function dongClump(p: ShapeBuilder, x: number, z: number, s: number): void {
  // Lá dong: cuống dài mọc thẳng, mỗi cuống một lá thuôn dài xòe chếch ra ngoài, cao thấp so le
  // (không chụm thành búp tròn như bắp cải).
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const tilt = 0.95 + (i % 2) * 0.3;
    const stem = (0.3 + (i % 3) * 0.1) * s;
    const bx = x + Math.sin(a) * 0.06 * s;
    const bz = z + Math.cos(a) * 0.06 * s;
    p.cyl(0.013, 0.016, stem, 0x5a8a3a, bx, 0.06 + stem / 2, bz, undefined, 4);
    const dir = [Math.sin(tilt) * Math.sin(a), Math.cos(tilt), Math.sin(tilt) * Math.cos(a)];
    const leaf = new THREE.SphereGeometry(1, 8, 6);
    leaf.scale(0.085 * s, 0.27 * s, 0.018);
    leaf.rotateX(tilt);
    leaf.rotateY(a);
    const len = 0.25 * s;
    p.add(leaf, i % 3 ? DONG : 0x4f8a42, bx + dir[0] * len, 0.06 + stem + dir[1] * len, bz + dir[2] * len);
    // Gân giữa lá, nổi trên mặt lá (mặt trên lá hướng theo `up`).
    const rib = new THREE.CylinderGeometry(0.007, 0.007, 0.48 * s, 3);
    rib.rotateX(tilt);
    rib.rotateY(a);
    const up = [-Math.cos(tilt) * Math.sin(a), Math.sin(tilt), -Math.cos(tilt) * Math.cos(a)];
    p.add(rib, 0x9ccc74, bx + dir[0] * len + up[0] * 0.02, 0.06 + stem + dir[1] * len + up[1] * 0.02, bz + dir[2] * len + up[2] * 0.02);
  }
}

/** Rào tre thấp quanh mép móng, chừa cổng ở mặt trước từ `gateA` tới `gateB` (theo x). */
function bambooFence(p: ShapeBuilder, half: number, h: number, gateA = 0, gateB = 0): void {
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = -half + (i * 2 * half) / n;
    for (const [x, z] of [[t, -half], [-half, t], [half, t], [t, half]] as const) {
      if (z === half && x > gateA && x < gateB) continue;
      p.cyl(0.025, 0.03, h, C.bamboo, x, h / 2, z, undefined, 5);
    }
  }
  for (const y of [h * 0.45, h * 0.85]) {
    p.cyl(0.018, 0.018, 2 * half, C.bamboo, 0, y, -half, [0, 0, Math.PI / 2], 4);
    p.cyl(0.018, 0.018, 2 * half, C.bamboo, -half, y, 0, [Math.PI / 2, 0, 0], 4);
    p.cyl(0.018, 0.018, 2 * half, C.bamboo, half, y, 0, [Math.PI / 2, 0, 0], 4);
    if (gateB > gateA) {
      const l = gateA + half;
      const r = half - gateB;
      if (l > 0) p.cyl(0.018, 0.018, l, C.bamboo, -half + l / 2, y, half, [0, 0, Math.PI / 2], 4);
      if (r > 0) p.cyl(0.018, 0.018, r, C.bamboo, half - r / 2, y, half, [0, 0, Math.PI / 2], 4);
    } else {
      p.cyl(0.018, 0.018, 2 * half, C.bamboo, 0, y, half, [0, 0, Math.PI / 2], 4);
    }
  }
}

export function makeVuon(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.95, 0.08, 1.95, C.soil, 0, 0.04, 0);
  // Hai luống đậu xanh: bụi thấp, quả dài.
  for (const x of [-0.62, -0.12]) {
    p.box(0.34, 0.1, 1.15, C.earthDark, x, 0.12, -0.2);
    for (let i = 0; i < 4; i++) {
      const z = -0.62 + i * 0.28;
      p.sphere(0.12, DAU, x, 0.25, z, [1, 0.7, 1], 8);
      p.capsule(0.016, 0.09, DAU_POD, x + 0.08, 0.22, z + 0.07, [0, 0, 1.2]);
      p.capsule(0.016, 0.09, DAU_POD, x - 0.07, 0.21, z - 0.05, [0, 0, -1.1]);
    }
  }
  // Khóm lá dong lá to bản ở góc trước bên phải.
  dongClump(p, 0.5, 0.45, level >= 2 ? 1.15 : 1);
  if (level >= 2) {
    // Giàn tre cho đậu leo, dây đậu xanh quấn cột; chum nước tưới ở góc trước.
    for (const x of [-0.82, -0.37, 0.08]) for (const z of [-0.75, 0.35]) {
      p.cyl(0.02, 0.025, 0.9, C.bamboo, x, 0.5, z, undefined, 5);
      for (let k = 0; k < 3; k++) p.sphere(0.06, DAU, x + 0.03, 0.3 + k * 0.22, z + 0.02, [1, 1, 1], 6);
    }
    for (const x of [-0.82, -0.37, 0.08]) p.cyl(0.018, 0.018, 1.1, C.bamboo, x, 0.92, -0.2, [Math.PI / 2, 0, 0], 4);
    for (const z of [-0.75, -0.2, 0.35]) p.cyl(0.018, 0.018, 0.95, C.bamboo, -0.37, 0.94, z, [0, 0, Math.PI / 2], 4);
    for (let k = 0; k < 6; k++) p.sphere(0.07, k % 2 ? DAU : DAU_POD, -0.75 + k * 0.16, 0.96, -0.5 + (k % 3) * 0.3, [1.4, 0.5, 1], 6);
    p.sphere(0.16, 0x8a5a3a, -0.72, 0.24, 0.72, [1, 1.1, 1], 10);
    p.cyl(0.1, 0.12, 0.06, 0x7a4a2e, -0.72, 0.42, 0.72, undefined, 10);
    p.cyl(0.09, 0.09, 0.01, C.paddyWater, -0.72, 0.45, 0.72, undefined, 10);
  }
  if (level >= 3) {
    // Rào tre quanh vườn, cổng ở giữa mặt trước.
    bambooFence(p, 0.93, 0.42, -0.15, 0.35);
    // Lều nhỏ góc sau bên phải: nong đậu phơi trên giá, thúng đậu dưới đất.
    for (const x of [0.32, 0.8]) for (const z of [-0.8, -0.34]) p.cyl(0.025, 0.03, 0.66, C.woodDark, x, 0.33, z, undefined, 5);
    m.band.add(saddleRoof({ length: 0.72, width: 0.66, lift: 0.12, drop: 0.2, thickness: 0.04 }), C.thatch, 0.56, 0.82, -0.57, [0, Math.PI / 2, 0]);
    p.box(0.5, 0.03, 0.4, C.bamboo, 0.56, 0.26, -0.57);
    p.cyl(0.21, 0.21, 0.03, C.thatch, 0.56, 0.29, -0.57, undefined, 14);
    p.cyl(0.18, 0.18, 0.02, DAU_POD, 0.56, 0.31, -0.57, undefined, 14);
    p.cyl(0.1, 0.07, 0.14, C.thatchDark, 0.18, 0.15, -0.62, undefined, 10);
    p.cyl(0.09, 0.09, 0.02, DAU, 0.18, 0.22, -0.62, undefined, 10);
  }
  return m.group();
}

/** Lợn ỉ: mình đen, bụng phệ sệ xuống, lưng võng, mõm ngắn, đuôi xoăn. Gốc ở chân, mặt hướng +z. */
export function makePig(s = 1): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  p.sphere(0.2 * s, PIG, 0, 0.24 * s, 0, [0.85, 0.75, 1.25], 10);
  p.sphere(0.17 * s, PIG, 0, 0.15 * s, 0.02 * s, [0.95, 0.75, 1.05], 10);
  for (const x of [-0.09, 0.09]) for (const z of [-0.15, 0.15]) p.cyl(0.035 * s, 0.04 * s, 0.12 * s, PIG, x * s, 0.06 * s, z * s, undefined, 6);
  p.sphere(0.13 * s, PIG, 0, 0.27 * s, 0.25 * s, [1, 0.9, 1], 10);
  p.cyl(0.055 * s, 0.065 * s, 0.08 * s, PIG_SNOUT, 0, 0.24 * s, 0.37 * s, [Math.PI / 2, 0, 0], 8);
  for (const sx of [-1, 1]) {
    p.cone(0.045 * s, 0.09 * s, PIG, sx * 0.08 * s, 0.38 * s, 0.22 * s, [0.5, 0, sx * 0.5], 5);
    p.sphere(0.018 * s, C.cream, sx * 0.06 * s, 0.3 * s, 0.35 * s, [1, 1, 0.6], 5);
  }
  p.add(new THREE.TorusGeometry(0.035 * s, 0.012 * s, 4, 8, Math.PI * 1.5), PIG, 0, 0.3 * s, -0.27 * s, [0, Math.PI / 2, 0]);
  return m.group();
}

export function makeChuongLon(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.95, 0.06, 1.95, C.earth, 0, 0.03, 0);
  bambooFence(p, 0.9, 0.38);
  // Máng gỗ đựng cám ở mặt trước, một con đang chúi mõm ăn.
  p.box(0.55, 0.12, 0.16, C.wood, 0.25, 0.1, 0.62);
  p.box(0.47, 0.03, 0.09, 0x8a7a50, 0.25, 0.16, 0.62);
  const pigs: [number, number, number, number][] = [
    [0.25, 0.3, 0, 1.3],
    [-0.38, 0.08, 1.2, 1.3],
  ];
  if (level >= 2) {
    // Chuồng có mái tranh che nửa sau, rơm lót ổ; thêm đàn lợn con.
    const floorY = level >= 3 ? 0.36 : 0.06;
    const roofY = level >= 3 ? 1.15 : 0.85;
    for (const x of [-0.82, 0.22]) for (const z of [-0.82, -0.22]) p.cyl(0.035, 0.04, roofY, C.woodDark, x, roofY / 2, z, undefined, 5);
    m.band.add(saddleRoof({ length: 1.35, width: 0.95, lift: 0.15, drop: 0.28, thickness: 0.05 }), C.thatch, -0.3, roofY + 0.22, -0.52);
    if (level >= 3) {
      // Chuồng sàn gỗ: sàn kê cao trên cột, có cầu dốc cho lợn lên xuống; vũng bùn trước chuồng.
      p.box(1.1, 0.06, 0.66, C.wood, -0.3, floorY, -0.52);
      for (let i = 0; i < 5; i++) p.box(0.02, 0.01, 0.66, C.woodDark, -0.8 + i * 0.25, floorY + 0.035, -0.52);
      p.box(0.32, 0.04, 0.5, C.woodLight, 0.4, 0.2, -0.32, [0.62, -Math.PI / 2, 0]);
      p.add(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 16), MUD, -0.42, 0.065, 0.42, [0, 0, 0], [1.2, 1, 0.8]);
      // Vách ván sau và bên trái chuồng sàn.
      p.box(1.1, 0.42, 0.04, C.woodLight, -0.3, floorY + 0.24, -0.84);
      p.box(0.04, 0.42, 0.66, C.woodLight, -0.84, floorY + 0.24, -0.52);
    }
    p.box(0.95, 0.03, 0.5, C.thatchDark, -0.3, floorY + 0.04, -0.52);
    // Đàn lợn con chạy ngoài sân theo mẹ, không nằm khuất dưới mái. Cấp 3 thêm hai lợn lớn: một con đằm bùn, một con cạnh cầu dốc.
    if (level >= 3) pigs.push([-0.6, 0.42, -0.4, 1.3], [0.55, -0.08, -2.2, 1.3], [-0.25, 0.64, 0.3, 0.6], [-0.05, 0.38, -0.5, 0.55], [0.66, 0.34, -2.6, 0.55]);
    else pigs.push([-0.64, 0.45, 0.8, 0.6], [-0.4, 0.6, 0.3, 0.55], [-0.13, 0.38, -0.5, 0.55]);
  }
  const g = m.group();
  for (const [x, z, ry, s] of pigs) {
    const pig = makePig(s);
    pig.position.set(x, 0.06, z);
    pig.rotation.y = ry;
    g.add(pig);
  }
  return g;
}

/** Kiềng ba hòn đá, nồi đồng to luộc bánh chưng, củi cháy dưới nồi. Lửa thêm thẳng vào `g` để World cho bập bùng. */
function hearth(m: ToonModel, g: THREE.Group, x: number, z: number): void {
  const p = m.plain;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    p.sphere(0.12, C.rockDark, x + Math.sin(a) * 0.26, 0.12, z + Math.cos(a) * 0.26, [1, 1.3, 1], 7);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.95;
    p.cyl(0.03, 0.035, 0.5, C.woodDark, x + Math.sin(a) * 0.25, 0.07, z + Math.cos(a) * 0.25, [Math.PI / 2, a, 0], 5);
  }
  m.band.cyl(0.3, 0.26, 0.42, C.bronze, x, 0.44, z, undefined, 16);
  p.add(new THREE.TorusGeometry(0.3, 0.025, 6, 18), C.bronzeDark, x, 0.65, z, [Math.PI / 2, 0, 0]);
  p.cyl(0.28, 0.28, 0.03, C.bronzeDark, x, 0.66, z, undefined, 16);
  p.sphere(0.04, C.bronzeLight, x, 0.7, z, [1, 1, 1], 6);
  for (const [r, h, color, dx, dz] of [[0.1, 0.24, C.fire, 0.1, 0.12], [0.08, 0.2, C.fire, -0.12, 0.05], [0.06, 0.16, C.ember, 0, 0.16]] as const) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), new THREE.MeshBasicMaterial({ color }));
    flame.position.set(x + dx, 0.12 + h / 2 - 0.05, z + dz);
    flame.userData.flame = true;
    g.add(flame);
  }
}

/** Bánh chưng vuông xanh lá, buộc lạt chữ thập. */
export function banhChung(p: ShapeBuilder, x: number, y: number, z: number, s = 1, ry = 0): void {
  p.box(0.15 * s, 0.08 * s, 0.15 * s, BANH_CHUNG, x, y + 0.04 * s, z, [0, ry, 0]);
  p.box(0.155 * s, 0.085 * s, 0.02 * s, LAT, x, y + 0.04 * s, z, [0, ry, 0]);
  p.box(0.02 * s, 0.085 * s, 0.155 * s, LAT, x, y + 0.04 * s, z, [0, ry, 0]);
}

/** Bánh giầy tròn trắng, dẹt. */
export function banhGiay(p: ShapeBuilder, x: number, y: number, z: number, s = 1): void {
  p.sphere(0.075 * s, BANH_GIAY, x, y + 0.03 * s, z, [1, 0.42, 1], 10);
}

export function makeBep(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const g = new THREE.Group();
  p.box(1.95, 0.06, 1.95, C.earthDark, 0, 0.03, 0);
  hearth(m, g, -0.5, -0.36);
  // Chiếu gói bánh ở mặt trước: lá dong trải sẵn, vài cái bánh đã gói.
  m.band.box(0.75, 0.02, 0.48, C.thatch, -0.3, 0.07, 0.55);
  for (const [x, z, a] of [[-0.5, 0.48, 0.3], [-0.42, 0.62, -0.4]] as const) p.box(0.22, 0.012, 0.12, DONG, x, 0.085, z, [0, a, 0]);
  banhChung(p, -0.15, 0.08, 0.5, 1, 0.2);
  banhChung(p, -0.05, 0.08, 0.66, 1, -0.3);
  // Chồng lá dong: dưới đất ở cấp 1, trên chõng tre từ cấp 2.
  const leafY = level >= 2 ? 0.42 : 0.07;
  for (let i = 0; i < 4; i++) p.box(0.34, 0.025, 0.2, i % 2 ? DONG : 0x4f8a42, 0.7, leafY + i * 0.028, -0.68, [0, 0.15 * (i % 3), 0]);
  if (level >= 2) {
    // Mái tranh che bếp, dựng cao cho thấy nồi bánh dưới mái; chõng tre có khuôn gói bánh.
    for (const x of [-0.95, 0.45]) for (const z of [-0.92, -0.05]) p.cyl(0.035, 0.04, 1.45, C.woodDark, x, 0.725, z, undefined, 5);
    m.band.add(saddleRoof({ length: 1.7, width: 1.15, lift: 0.2, drop: 0.3, thickness: 0.05 }), C.thatch, -0.25, 1.67, -0.48);
    for (const dx of [-0.16, 0.16]) for (const dz of [-0.22, 0.22]) p.cyl(0.025, 0.025, 0.36, C.bamboo, 0.7 + dx, 0.2, -0.5 + dz, undefined, 5);
    p.box(0.42, 0.04, 0.6, C.bamboo, 0.7, 0.39, -0.5);
    // Khuôn gói bánh: khung gỗ vuông.
    for (const s of [-1, 1]) {
      p.box(0.2, 0.05, 0.025, C.wood, 0.7, 0.44, -0.3 + s * 0.09);
      p.box(0.025, 0.05, 0.2, C.wood, 0.7 + s * 0.09, 0.44, -0.3);
    }
    banhChung(p, 0.7, 0.41, -0.3, 0.9);
  }
  if (level >= 3) {
    // Nồi thứ hai cạnh nồi cũ; cối đá chày gỗ giã bánh giầy ở góc trước bên phải; khói bếp bốc qua mái.
    hearth(m, g, 0.1, -0.4);
    p.cyl(0.2, 0.24, 0.3, C.rock, 0.72, 0.21, 0.7, undefined, 12);
    p.cyl(0.14, 0.14, 0.02, 0x3d3530, 0.72, 0.365, 0.7, undefined, 12);
    p.sphere(0.1, BANH_GIAY, 0.72, 0.36, 0.7, [1, 0.35, 1], 8);
    p.cyl(0.035, 0.04, 1.0, C.wood, 0.6, 0.78, 0.58, [0.35, 0, 0.3], 6);
    p.cyl(0.22, 0.22, 0.03, C.thatch, 0.16, 0.08, 0.84, undefined, 12);
    for (const [x, z] of [[0.09, 0.8], [0.23, 0.82], [0.16, 0.92]] as const) banhGiay(p, x, 0.095, z);
    for (const x of [-0.5, 0.1]) {
      const smoke = new THREE.Group();
      smoke.userData.smoke = true;
      const mat = new THREE.MeshBasicMaterial({ color: 0xb8b2a8, transparent: true, opacity: 0.5, depthWrite: false });
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), mat);
        puff.userData.phase = (i + (x > 0 ? 0.5 : 0)) / 4;
        smoke.add(puff);
      }
      smoke.position.set(x, 1.8, -0.38);
      g.add(smoke);
    }
  }
  const model = m.group();
  model.add(...g.children);
  return model;
}
