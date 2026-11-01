// Mô hình công trình "Nét Đông Sơn". Mỗi loại một dáng riêng lấy từ nhà cửa trên trống đồng,
// mỗi cấp thêm một phần lớn nhìn thấy rõ và to dần. Cấp 6, 7, 8 (từ chương 2, 3, 4) to thêm, cao thêm (nền và rào
// thu vào để không tràn ô), thêm một phần lớn và chi tiết, và đổi mái (xem Mái theo cấp). Lầu nỏ ghép từ hai chòi canh cấp 8.
// Bốn công trình Hội Tết (ruộng nếp, vườn đậu lá dong, chuồng lợn, bếp gói bánh) có 3 cấp, mỗi cấp cũng thêm một phần lớn.
// Gốc tọa độ là tâm chân móng, mặt trước hướng +z.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BUILDINGS, isDecor, type BuildingType } from '../game/defs';
import { bakeRuaVang } from './beasts';
import { decorModel } from './decor';
import { bakeIronHorse, bakeSonTinh } from './heroes';
import { makeBoat, makeCrossbowStand, makeFighter, makeTradeBoat } from './models';
import { C } from './palette';
import { ShapeBuilder, saddleRoof, seeded } from './shapes';
import { bakeSoldier } from './soldier';
import { ToonModel, inkThin, outlineOf, toon } from './toon';

/**
 * Kinh đô lớn: móng mỗi công trình nhiều ô to hơn mô hình một ô mỗi chiều (mô hình vẽ theo móng cũ, `w − 1` ô).
 * World phóng cả mô hình theo tỉ lệ móng rồi thu lại chừa một viền cỏ, nên hai nhà đứng sát nhau vẫn thoáng.
 * Ruộng thì kín móng hơn (ruộng liền bờ trông đẹp), bến chừa ít hơn để cầu tàu chạm nước. Chòi canh, lầu nỏ một ô
 * nhưng to hơn chút cho cân với nhà cửa.
 */
const FILL: Partial<Record<BuildingType, number>> = { ruong: 0.95, ruongNep: 0.95, ben: 0.92 };
const SINGLE: Partial<Record<BuildingType, number>> = { choiCanh: 1.15, lauNo: 1.12 };
export function footScale(type: BuildingType): number {
  const w = BUILDINGS[type].w;
  if (w <= 1) return SINGLE[type] ?? 1;
  return (w / (w - 1)) * (FILL[type] ?? 0.88);
}

/** Cấp dùng để tính độ dày (bờ ruộng, đống đá...): cấp 6, 7, 8 giữ như cấp 5. */
export const grown = (level: number) => Math.min(level, 5);
/** To dần theo cấp: khoảng 85% ở cấp 1, 105% ở cấp 5, rồi 110%, 115%, 120% ở cấp 6, 7, 8. */
export const sizeFor = (level: number) => 0.8 + 0.05 * Math.min(level, 8);
/** Số cấp đã qua cấp 5 (0 tới 3): công trình cao thêm và chi tiết thêm theo số này. */
export const above5 = (level: number) => Math.max(0, Math.min(level, 8) - 5);
/**
 * Nửa cạnh móng `tiles` ô trong tọa độ mô hình đã phóng to `scale`: nền và rào vẽ tới đây thì không tràn ô
 * dù công trình to lên. Không quá nửa cạnh lúc chưa phóng to.
 */
const edgeOf = (tiles: number, scale: number) => Math.min(tiles / 2 - 0.025, (tiles / 2 - 0.025) / scale);
/** Hệ số thu tâm (`ToonModel.setSpread`) để các phần của công trình cỡ `scale` đứng đúng chỗ như ở cỡ `at`. */
const spreadFor = (scale: number, at = 1.05) => Math.min(1, at / scale);

/**
 * Gói mô hình đã phóng to: thêm các vật rời (lửa, khói, guồng...) với tâm thu như các phần khác, phóng cả khối `scale`,
 * ghi hệ số thu tâm vào `userData.spread` để World đặt người làm và thuyền đúng chỗ.
 */
function grownGroup(m: ToonModel, scale: number, k: number, extras: THREE.Object3D[] = []): THREE.Group {
  const g = m.group();
  for (const o of extras) {
    o.position.x *= k;
    o.position.z *= k;
    g.add(o);
  }
  g.scale.setScalar(scale);
  g.userData.spread = k;
  return g;
}

// ---------- Mái theo cấp ----------
// Cấp 6, 7, 8 không to thêm nên nhìn mái để biết cấp, chung cho mọi công trình có mái:
// tới cấp 5 mái tranh; cấp 6 mái tranh có sống và diềm mái sơn đỏ; cấp 7 mái ngói đất nung như ngói thành Cổ Loa;
// cấp 8 mái ngói, sống và diềm mái bọc đồng vàng.

/** Ngói đất nung đỏ cam. */
const TILE = 0xc8643a;
const TILE_DARK = 0xa84e2e;

export interface Roof {
  main: number;
  /** Tầng mái trên, mái miếu nhỏ. */
  dark: number;
  /** Sống mái, diềm mái, chóp mái; null là không viền. */
  trim: number | null;
}

const THATCH: Roof = { main: C.thatch, dark: C.thatchDark, trim: null };

export function roofFor(level: number): Roof {
  if (level >= 8) return { main: TILE, dark: TILE_DARK, trim: C.gold };
  if (level >= 7) return { main: TILE, dark: TILE_DARK, trim: null };
  if (level >= 6) return { main: C.thatch, dark: C.thatchDark, trim: C.red };
  return THATCH;
}

type SaddleOpts = Parameters<typeof saddleRoof>[0];

/** Mái thuyền màu theo `r`, xoay `ry` quanh trục đứng; có viền thì thêm sống mái và hai diềm mái chạy theo dáng cong. */
export function boatRoof(m: ToonModel, r: Roof, o: SaddleOpts, x: number, y: number, z: number, ry = 0, dark = false): void {
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
    m.plain.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, v ? rad * 0.8 : rad, 5), r.trim, x, y, z, [0, ry, 0]);
  }
}

/** Mái nón (tâm khối nón ở `y`, như `cone`): có viền thì thêm vành diềm mái và chóp mái. */
export function coneRoof(m: ToonModel, r: Roof, radius: number, h: number, x: number, y: number, z: number, seg = 10, band = false, dark = false): void {
  (band ? m.band : m.plain).cone(radius, h, dark ? r.dark : r.main, x, y, z, undefined, seg);
  if (r.trim === null) return;
  const t = THREE.MathUtils.clamp(radius * 0.07, 0.025, 0.05);
  m.plain.add(new THREE.TorusGeometry(radius * 0.97, t, 5, seg * 2), r.trim, x, y - h / 2 + t * 0.5, z, [Math.PI / 2, 0, 0]);
  m.plain.cone(radius * 0.22, h * 0.24, r.trim, x, y + h / 2 - h * 0.1, z, undefined, seg);
}

/** Lầu trống: bốn cột, sàn, trống đồng trên sàn, mái nhọn theo `roof`. Gốc ở chân lầu. `lac`: chim Lạc dang cánh trên đỉnh. */
export function drumTower(m: ToonModel, x: number, z: number, y0: number, roof: Roof, lac = false): void {
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

export function bird(m: ToonModel, x: number, y: number, z: number, dir: number, s = 1): void {
  m.plain.capsule(0.06 * s, 0.22 * s, C.bronze, x, y, z, [0, 0, Math.PI / 2]);
  m.plain.capsule(0.03 * s, 0.26 * s, C.bronze, x + dir * 0.2 * s, y + 0.12 * s, z, [0, 0, -dir * 0.6]);
  m.plain.cone(0.03 * s, 0.22 * s, C.bronzeLight, x + dir * 0.4 * s, y + 0.2 * s, z, [0, 0, -dir * Math.PI / 2]);
  m.plain.box(0.18 * s, 0.03, 0.14 * s, C.bronzeDark, x - dir * 0.16 * s, y + 0.06 * s, z, [0, 0, dir * 0.6]);
}

/** Tượng chim Lạc dang cánh, mỏ dài, đuôi xòe, đứng trên đỉnh: kiểu chim bay trên mặt trống đồng. */
export function birdSpread(m: ToonModel, x: number, y: number, z: number, s = 1): void {
  const p = m.plain;
  p.capsule(0.07 * s, 0.2 * s, C.bronze, x, y + 0.1 * s, z, [Math.PI / 2, 0, 0]);
  p.capsule(0.035 * s, 0.2 * s, C.bronze, x, y + 0.22 * s, z + 0.16 * s, [0.5, 0, 0]);
  p.cone(0.03 * s, 0.26 * s, C.bronzeLight, x, y + 0.26 * s, z + 0.38 * s, [Math.PI / 2, 0, 0]);
  for (const side of [-1, 1]) m.band.box(0.42 * s, 0.03, 0.18 * s, C.bronzeLight, x + side * 0.24 * s, y + 0.2 * s, z - 0.02 * s, [0, 0, side * 0.45]);
  p.box(0.16 * s, 0.03, 0.2 * s, C.bronzeDark, x, y + 0.08 * s, z - 0.22 * s, [0.5, 0, 0]);
}

export function drum(m: ToonModel, x: number, z: number, s = 1, y = 0.08): void {
  m.band.cyl(0.36 * s, 0.32 * s, 0.32 * s, C.bronze, x, 0.16 * s + y, z, undefined, 16);
  m.drum.cyl(0.38 * s, 0.38 * s, 0.04 * s, 0xffffff, x, 0.34 * s + y, z, undefined, 20);
}

export function banner(m: ToonModel, x: number, z: number, h: number, color: number): void {
  m.plain.cyl(0.03, 0.035, h, C.woodDark, x, h / 2, z, undefined, 5);
  m.band.box(0.42, 0.6, 0.03, color, x + 0.22, h - 0.32, z);
}

/** Nhà sàn mái thuyền: cột, sàn, vách có hoa văn, mái cong vút. */
export function stiltHall(m: ToonModel, o: { x: number; z: number; w: number; d: number; postH: number; roofL: number; roofW: number; lift: number; ry?: number; roof?: Roof }): void {
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

/** Cỡ Điện: như mọi công trình tới cấp 5, rồi giữ 105% vì nền đã kín bốn ô; cấp 6–8 to lên bằng nền cao và nhà cao. */
export const dienScale = (level: number) => Math.min(sizeFor(level), 1.05);
/** Mặt nền trước thềm Điện, chỗ Lạc hầu và lính gác đứng. */
export const dienFloor = (level: number) => (level >= 4 ? 0.45 : 0.14);

export function makeDien(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = roofFor(level);
  const up = above5(level);
  // Cấp 4 trở lên: nền đất đắp cao viền đá, có bậc lên.
  const base = dienFloor(level);
  // Cấp 6–8: nền đá thứ hai dưới nhà chính, cao dần; nhà chính cao và mái rộng dần theo.
  const terrace = 0.16 * up;
  p.box(3.9, base, 3.9, level >= 4 ? C.earth : C.soil, 0, base / 2, 0);
  if (level >= 4) {
    p.box(3.95, 0.08, 3.95, C.rock, 0, base, 0);
    // Cấp 8: thềm đá ba bậc rộng hơn, viền đá sẫm.
    const stepW = level >= 8 ? 1.7 : 1.0;
    for (let i = 0; i < 3; i++) p.box(stepW, 0.14, 0.24, i % 2 && level >= 8 ? C.rockDark : C.rock, 0, base - 0.08 - i * 0.14, 1.98 + i * 0.12);
  }
  const hallX = level >= 3 ? -0.35 : 0;
  const hallW = level >= 3 ? 2.9 : 3.0;
  if (up) {
    p.box(2.93, terrace, 2.44, C.rock, -0.315, base + terrace / 2, -0.1);
    p.box(2.97, 0.06, 2.48, C.rockDark, -0.315, base + terrace, -0.1);
    if (level >= 8) {
      // Viền đồng quanh mép nền.
      for (const sz of [-1, 1]) p.box(3.01, 0.07, 0.07, C.bronze, -0.315, base + terrace + 0.01, -0.1 + sz * 1.24);
      for (const sx of [-1, 1]) p.box(0.07, 0.07, 2.52, C.bronze, -0.315 + sx * 1.485, base + terrace + 0.01, -0.1);
    }
  }
  // Nhà chính.
  const hall = {
    x: hallX,
    z: -0.1,
    w: hallW,
    d: 2.3,
    postH: 1.15 + base + terrace + 0.12 * up,
    roofL: hallW + 1.3,
    roofW: 2.7 + 0.15 * up,
    lift: 1.0 + 0.15 * up,
    roof,
  };
  stiltHall(m, hall);
  p.box(0.52, 0.55, 0.06, C.woodDark, hallX, hall.postH + 0.33, 0.95);
  // Thang gỗ từ sàn xuống nền trước thềm: nhà càng cao thang càng nhiều bậc, dốc hơn.
  const rungs = 4 + up;
  for (let i = 0; i < rungs; i++) {
    p.box(0.52, 0.06, 0.2, C.woodDark, hallX, hall.postH - 0.18 - (i * (hall.postH - base - 0.3)) / rungs, 1.2 + (i * 0.55) / (rungs - 1));
  }
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
    stiltHall(m, { x: 1.45, z: -0.3, w: 1.0, d: 1.5, postH: 0.95 + base + 0.2 * up, roofL: 1.9, roofW: 1.4 + 0.08 * up, lift: 0.4 + 0.08 * up, ry: Math.PI / 2, roof });
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
    const y2 = hall.postH + 0.68 + hall.roofW * 0.4 + 0.65 + 0.1 * up;
    boatRoof(m, roof, { length: hallW * 0.8, width: 1.5 + 0.1 * up, lift: 0.7 + 0.1 * up, drop: 0.55, thickness: 0.08 }, hallX, y2, -0.1);
    if (roof.trim === null) p.box(hallW * 0.7, 0.07, 0.14, C.bronzeLight, hallX, y2 + 0.04, -0.1);
    drum(m, 0.6, 1.75, 1.15, base);
    drum(m, -0.5, 1.75, 1.15, base);
  }
  if (level >= 6) {
    // Hai lầu trống đồng hai bên thềm.
    for (const x of [-1.3, 1.3]) drumTower(m, x, 1.45, base, roof, level >= 8);
    // Lan can sơn đỏ hoa văn quanh hiên nhà chính, chừa lối cửa giữa.
    const fy = hall.postH + 0.16;
    const fz = hall.z + hall.d / 2 - 0.03;
    for (const sx of [-1, 1]) {
      m.band.box(hallW / 2 - 0.35, 0.2, 0.05, C.red, hallX + sx * (hallW / 4 + 0.17), fy, fz);
      m.band.box(0.05, 0.2, hall.d - 0.1, C.red, hallX + sx * (hallW / 2 - 0.03), fy, hall.z);
    }
  }
  if (level >= 7) {
    // Hai cột chim Lạc ở hai góc sau nền: cột gỗ chạm, đai đồng, chim Lạc dang cánh trên đỉnh.
    for (const x of [-1.85, 1.85]) {
      p.cyl(0.07, 0.09, 3.0, C.woodDark, x, base + 1.5, -1.85, undefined, 8);
      for (const y of [0.9, 1.8, 2.7]) p.cyl(0.1, 0.1, 0.08, C.bronze, x, base + y, -1.85, undefined, 8);
      birdSpread(m, x, base + 3.0, -1.85, 0.75);
    }
    // Mái tầng ba trên cùng, đôi chim đồng lớn đậu hai đầu nóc.
    const y3 = hall.postH + 0.68 + hall.roofW * 0.4 + 1.25 + 0.2 * up;
    boatRoof(m, roof, { length: hallW * 0.6, width: 1.0 + 0.08 * up, lift: 0.55 + 0.08 * up, drop: 0.4, thickness: 0.07 }, hallX, y3, -0.1, 0, true);
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
  g.scale.setScalar(dienScale(level));
  return g;
}

// ---------- Ruộng lúa ----------

/** Nước ao trong, sáng hơn nước ruộng cho dễ nhận ra ao giữ nước. */
export const POND = 0x6fb8cf;

/** Con trâu nước Việt cổ đứng nghỉ: thân vạm vỡ có vai u, bốn chân móng guốc, đầu rõ mõm mắt tai, cặp sừng cong cánh cung & đuôi phe phẩy. */
export function buffalo(p: ShapeBuilder, x: number, z: number): void {
  const HIDE = 0x423d39;
  const HIDE_DARK = 0x2e2a27;
  const SNOUT = 0x58504b;
  const HORN = 0xd8cbb0;

  // Thân trâu no tròn, vai u nhô cao & mông trâu
  p.sphere(0.23, HIDE, x, 0.31, z - 0.02, [0.82, 0.72, 1.28], 9);
  p.sphere(0.16, HIDE, x, 0.36, z + 0.14, [0.85, 0.78, 0.92], 8);
  // Bốn chân cột đình có khớp gối và móng guốc sẫm
  for (const dx of [-0.105, 0.105]) {
    for (const [dz, h] of [
      [-0.16, 0.24],
      [0.15, 0.24],
    ] as const) {
      p.cyl(0.042, 0.036, h, HIDE_DARK, x + dx, h / 2 + 0.02, z + dz, undefined, 6);
      p.cyl(0.044, 0.048, 0.04, 0x1f1c1a, x + dx, 0.02, z + dz + 0.01, undefined, 6);
    }
  }
  // Cổ trâu & Đầu trâu vươn về phía trước (+z)
  p.cyl(0.11, 0.14, 0.18, HIDE, x, 0.37, z + 0.24, [0.95, 0, 0], 7);
  p.sphere(0.125, HIDE, x, 0.42, z + 0.33, [0.92, 0.84, 1.08], 8);
  p.box(0.14, 0.095, 0.12, SNOUT, x, 0.39, z + 0.43, [0.18, 0, 0]);
  // Mắt, lỗ mũi & tai trâu vểnh hai bên
  for (const s of [-1, 1]) {
    p.sphere(0.022, C.ink, x + s * 0.095, 0.44, z + 0.37, [0.8, 1, 1], 5);
    p.sphere(0.016, HIDE_DARK, x + s * 0.042, 0.395, z + 0.485, [1, 0.8, 0.6], 5);
    p.cone(0.035, 0.1, HIDE_DARK, x + s * 0.13, 0.42, z + 0.29, [0, 0, -s * 1.25], 5);
    // Cặp sừng trâu cong cánh cung 3 nhịp đặc trưng
    p.cyl(0.032, 0.042, 0.13, HORN, x + s * 0.12, 0.48, z + 0.3, [-0.15, 0, -s * 1.18], 6);
    p.cyl(0.024, 0.032, 0.13, HORN, x + s * 0.21, 0.51, z + 0.26, [-0.35, -s * 0.3, -s * 0.68], 6);
    p.cone(0.024, 0.11, HIDE_DARK, x + s * 0.23, 0.58, z + 0.21, [-0.45, -s * 0.4, s * 0.18], 5);
  }
  // Đuôi trâu buông phía sau (-z) có chùm lông đuôi
  p.cyl(0.014, 0.022, 0.22, HIDE_DARK, x, 0.24, z - 0.31, [-0.28, 0, 0], 4);
  p.cone(0.028, 0.08, 0x1f1c1a, x, 0.12, z - 0.34, [Math.PI - 0.28, 0, 0], 5);
}

/** Con cò trắng đứng: thân thon có cánh xếp, cổ chữ S mềm mại, mỏ vàng dài, chân cao lội nước. Mặt hướng `ry`, đứng ở độ cao `y`. */
export function egret(p: ShapeBuilder, x: number, z: number, ry: number, y = 0.07): void {
  const fx = Math.sin(ry);
  const fz = Math.cos(ry);
  const rx = fz;
  const rz = -fx;
  for (const s of [-1, 1]) {
    p.cyl(0.008, 0.009, 0.22, C.ink, x + s * 0.032 * rx, y + 0.11, z + s * 0.032 * rz, undefined, 4);
    // Cánh xếp hai bên sườn
    p.sphere(0.052, 0xede6d3, x + s * 0.042 * rx - fx * 0.015, y + 0.25, z + s * 0.042 * rz - fz * 0.015, [0.45, 0.65, 1.35], 6);
  }
  p.sphere(0.075, C.cream, x, y + 0.24, z, [0.72, 0.68, 1.38], 8);
  p.cone(0.042, 0.09, C.cream, x - fx * 0.09, y + 0.22, z - fz * 0.09, [-fz * 1.15, 0, fx * 1.15], 5);
  // Cổ chữ S thanh thoát & Đầu cò có chùm lông mào trắng
  p.capsule(0.021, 0.11, C.cream, x + fx * 0.06, y + 0.33, z + fz * 0.06, [fz * 0.42, 0, -fx * 0.42]);
  p.capsule(0.018, 0.09, C.cream, x + fx * 0.085, y + 0.41, z + fz * 0.085, [fz * 0.12, 0, -fx * 0.12]);
  p.sphere(0.036, C.cream, x + fx * 0.095, y + 0.47, z + fz * 0.095, [0.95, 0.95, 1.1], 6);
  p.cone(0.014, 0.06, C.cream, x + fx * 0.055, y + 0.49, z + fz * 0.055, [-fz * 1.2, 0, fx * 1.2], 4);
  p.cone(0.013, 0.11, C.ember, x + fx * 0.17, y + 0.465, z + fz * 0.17, [fz * Math.PI / 2, 0, -fx * Math.PI / 2], 4);
}

/** Guồng nước tre quay quanh trục dọc theo x, có 2 vành bánh xe tre kép, nan chéo và 10 ống bương múc nước. Tách riêng để World cho quay (`userData.spin`). */
export function waterWheel(): THREE.Group {
  const w = new ToonModel(inkThin);
  const p = w.plain;
  for (const dx of [-0.055, 0.055]) {
    p.add(new THREE.TorusGeometry(0.43, 0.024, 6, 20), C.woodDark, dx, 0, 0, [0, Math.PI / 2, 0]);
    p.add(new THREE.TorusGeometry(0.22, 0.02, 6, 16), C.bamboo, dx, 0, 0, [0, Math.PI / 2, 0]);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (const dx of [-0.055, 0.055]) {
      p.box(0.022, 0.86, 0.022, C.bamboo, dx, 0, 0, [a, 0, 0]);
    }
    // Thanh ngang đỡ ống bương & Ống bương tre múc nước đặt chéo
    p.cyl(0.014, 0.014, 0.14, C.woodDark, 0, ca * 0.42, sa * 0.42, [0, 0, Math.PI / 2], 4);
    p.cyl(0.032, 0.028, 0.18, C.bamboo, 0.01, ca * 0.45, sa * 0.45, [a + 0.35, 0, Math.PI / 2 - 0.28], 6);
  }
  p.cyl(0.055, 0.055, 0.52, C.woodDark, 0, 0, 0, [0, 0, Math.PI / 2], 7);
  for (const dx of [-0.14, 0.14]) p.cyl(0.068, 0.068, 0.04, C.bronze, dx, 0, 0, [0, 0, Math.PI / 2], 7);
  const g = w.group();
  g.userData.spin = 1.1;
  return g;
}

const LEAF_BLADE_CACHE = new Map<string, THREE.BufferGeometry>();

/**
 * Phiến lá lúa có sống gân giữa mọc trực tiếp từ gốc nước (`t = 0`) vươn lên và uốn cong tự nhiên ở ngọn (`t = 1`).
 */
function curvedLeafBladeGeo(wBase: number, h: number, bendOut: number, bendDrop: number): THREE.BufferGeometry {
  const key = `${wBase.toFixed(3)}_${h.toFixed(3)}_${bendOut.toFixed(3)}_${bendDrop.toFixed(3)}`;
  let cached = LEAF_BLADE_CACHE.get(key);
  if (!cached) {
    const geo = new THREE.CylinderGeometry(wBase * 0.1, wBase, 1, 3, 4);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const t = vy + 0.5; // 0 ở gốc mạ, 1 ở chóp nhọn lá lúa
      const widthProfile = Math.sin(t * Math.PI * 0.82) * 0.55 + (1 - t * 0.85) * 0.65;
      const cz = 0.01 + bendOut * Math.pow(t, 1.5);
      const cy = h * Math.sin(t * Math.PI * 0.52) - bendDrop * Math.pow(t, 2.3);
      const dz = bendOut * 1.5 * Math.pow(Math.max(0.02, t), 0.5);
      const dy = h * 0.52 * Math.PI * Math.cos(t * Math.PI * 0.52) - bendDrop * 2.3 * Math.pow(Math.max(0.02, t), 1.3);
      const len = Math.hypot(dz, dy) || 1;
      const ny = -dz / len;
      const nz = dy / len;
      const bx = vx * widthProfile * 1.3;
      const bz = vz * widthProfile * 0.85;
      pos.setXYZ(i, bx, cy + bz * ny, cz + bz * nz);
    }
    geo.computeVertexNormals();
    cached = geo.toNonIndexed();
    geo.dispose();
    LEAF_BLADE_CACHE.set(key, cached);
  }
  return cached.clone();
}

/**
 * Đường cong của một dảnh lúa (cuống mạ + bông lúa) tính từ gốc nước (`t = 0`) vươn lên rồi uốn vồng rủ xuống (`t = 1`).
 */
function stemCurvePoint(
  t: number,
  stemH: number,
  span: number,
  drop: number,
): { cz: number; cy: number; dz: number; dy: number; ny: number; nz: number } {
  const u = Math.max(0, t - 0.4) / 0.6;
  const cz = 0.012 + span * Math.pow(t, 1.32);
  const cy = stemH * Math.sin(t * Math.PI * 0.55) - drop * Math.pow(u, 1.85);
  const dz = span * 1.32 * Math.pow(Math.max(0.02, t), 0.32);
  const dy = stemH * 0.55 * Math.PI * Math.cos(t * Math.PI * 0.55) - (t > 0.4 ? (drop * 1.85 * Math.pow(u, 0.85)) / 0.6 : 0);
  const len = Math.hypot(dz, dy) || 1;
  return { cz, cy, dz, dy, ny: -dz / len, nz: dy / len };
}

const UNIT_GRAIN_GEO = new THREE.SphereGeometry(1, 5, 3).toNonIndexed();
const PANICLE_CACHE = new Map<string, { stem: THREE.BufferGeometry; g1: THREE.BufferGeometry; g2: THREE.BufferGeometry }>();

function getPanicleGeos(stemH: number, span: number, drop: number, grainR: number) {
  const key = `${stemH.toFixed(3)}_${span.toFixed(3)}_${drop.toFixed(3)}_${grainR.toFixed(3)}`;
  let cached = PANICLE_CACHE.get(key);
  if (!cached) {
    const stemGeo = new THREE.CylinderGeometry(0.013, 0.019, 1, 4, 5);
    const sPos = stemGeo.attributes.position;
    for (let i = 0; i < sPos.count; i++) {
      const vx = sPos.getX(i);
      const vy = sPos.getY(i);
      const vz = sPos.getZ(i);
      const t = (vy + 0.5) * 0.94;
      const { cz, cy, ny, nz } = stemCurvePoint(t, stemH, span, drop);
      sPos.setXYZ(i, vx, cy + vz * ny, cz + vz * nz);
    }
    stemGeo.computeVertexNormals();
    const stem = stemGeo.toNonIndexed();
    stemGeo.dispose();

    const g1List: THREE.BufferGeometry[] = [];
    const g2List: THREE.BufferGeometry[] = [];
    const pairs = 5;
    for (let j = 0; j < pairs; j++) {
      const u = j / (pairs - 1);
      const sizeMul = 0.9 + 0.22 * Math.sin(u * Math.PI);
      const rx = grainR * 0.98 * sizeMul;
      const ry = grainR * 1.62 * sizeMul;
      const rz = grainR * 0.92 * sizeMul;
      for (const side of [-1, 1]) {
        const t = 0.45 + u * 0.48 + (side > 0 ? 0.022 : 0);
        const { cz, cy, dz, dy, ny, nz } = stemCurvePoint(t, stemH, span, drop);
        const pitch = Math.atan2(dz, dy);
        const lx = side * grainR * 0.78 * sizeMul;
        const ly = cy + ny * grainR * 0.28;
        const lz = cz + nz * grainR * 0.28;
        const gGeo = UNIT_GRAIN_GEO.clone();
        gGeo.scale(rx, ry, rz);
        gGeo.rotateZ(-side * 0.42);
        gGeo.rotateX(pitch + 0.1);
        gGeo.translate(lx, ly, lz);
        if ((j + (side > 0 ? 1 : 0)) % 2 === 0) g1List.push(gGeo);
        else g2List.push(gGeo);
      }
    }
    const tip = stemCurvePoint(1.0, stemH, span, drop);
    const tipPitch = Math.atan2(tip.dz, tip.dy);
    const tipGeo = UNIT_GRAIN_GEO.clone();
    tipGeo.scale(grainR * 0.94, grainR * 1.56, grainR * 0.9);
    tipGeo.rotateX(tipPitch);
    tipGeo.translate(0, tip.cy, tip.cz);
    g1List.push(tipGeo);

    const g1 = mergeGeometries(g1List, false)!;
    const g2 = mergeGeometries(g2List, false)!;
    for (const g of g1List) g.dispose();
    for (const g of g2List) g.dispose();
    cached = { stem, g1, g2 };
    PANICLE_CACHE.set(key, cached);
  }
  return cached;
}

/**
 * Vẽ một cuống mạ xanh mọc thẳng từ gốc nước (`y0`) vươn cao uốn cong ra ngoài,
 * phần nửa ngọn cuống mạ cắm các cặp hạt lúa bầu dục vàng mẩy xếp dọc theo cuống rủ xuống gốc (đúng như ảnh mẫu).
 */
function addStemWithPanicle(
  p: ShapeBuilder,
  x: number,
  y0: number,
  z: number,
  a: number,
  stemH: number,
  span: number,
  drop: number,
  stemCol: number,
  grainCol: number,
  grainColAlt: number,
  grainR: number,
): void {
  const { stem, g1, g2 } = getPanicleGeos(stemH, span, drop, grainR);
  p.add(stem.clone(), stemCol, x, y0, z, [0, a, 0]);
  p.add(g1.clone(), grainCol, x, y0, z, [0, a, 0]);
  p.add(g2.clone(), grainColAlt, x, y0, z, [0, a, 0]);
}

/**
 * Khóm lúa nước Văn Lang (dựng đúng cấu trúc cây lúa thật — không có thân gỗ chính):
 * - Gốc mạ có mô đất bùn nhỏ sát mặt nước.
 * - Các lá mạ dài mọc trực tiếp từ gốc: lá tầng dưới uốn vòm sang hai bên, lá đòng tầng giữa vươn cao vút.
 * - Mỗi bông lúa gồm các hạt thóc bầu dục vàng mẩy bám dọc theo cuống mạ xanh mọc từ gốc vươn lên rồi uốn cong rủ xuống gốc.
 */
export function riceClump(p: ShapeBuilder, x: number, z: number, h: number, lv: number, level: number, seedAngle = 0): void {
  const maturity = Math.min(1, Math.max(0, (lv - 1) / 4));
  const darkLeafCol = new THREE.Color(0x58a42c).lerp(new THREE.Color(0x6eb030), maturity * 0.5).getHex();
  const brightLeafCol = new THREE.Color(0x7cc838).lerp(new THREE.Color(0xa8d83c), maturity * 0.85).getHex();
  const stemCol = new THREE.Color(0x64b030).lerp(new THREE.Color(0x86c036), maturity * 0.6).getHex();
  const grainCol = new THREE.Color(0xc8da4c).lerp(new THREE.Color(C.ripe), Math.min(1, maturity * 1.35)).getHex();
  const grainColAlt = new THREE.Color(0xb6ca40).lerp(new THREE.Color(C.gold), Math.min(1, maturity * 1.35)).getHex();
  const y0 = 0.055;

  // Mô đất bùn nhỏ dưới chân khóm mạ
  p.sphere(0.056, C.soil, x, y0, z, [1.35, 0.36, 1.35], 5);

  // 1. Tầng lá mạ dưới (3 lá): mọc từ gốc, uốn cong hình vòm rủ mũi lá xuống xung quanh gốc
  for (let i = 0; i < 3; i++) {
    const a = seedAngle + (i / 3) * Math.PI * 2 + 0.35;
    const blade = curvedLeafBladeGeo(0.026, h * 0.56, 0.145 + (i % 2) * 0.025, h * 0.26);
    blade.rotateY(a);
    p.add(blade, darkLeafCol, x, y0, z);
  }

  // 2. Tầng lá đòng giữa (3 lá): bản lá xanh vàng vươn cao vút ở tâm khóm lên quá tầm bông lúa (như ảnh mẫu)
  for (let i = 0; i < 3; i++) {
    const a = seedAngle + 0.15 + (i / 3) * Math.PI * 2;
    const lh = h * (1.12 + (i % 2) * 0.14);
    const blade = curvedLeafBladeGeo(0.027, lh, 0.065 + (i % 2) * 0.03, lh * 0.06);
    blade.rotateY(a);
    p.add(blade, i % 2 === 0 ? brightLeafCol : darkLeafCol, x, y0, z);
  }

  // 3. Từ cấp 2 trở lên: mỗi bông lúa cắm trên một cuống mạ xanh mọc thẳng từ gốc nước, vươn ra ngoài rồi uốn cong rủ bông hạt xuống gốc
  if (level >= 2) {
    const ears = 3;
    const span = 0.185 + maturity * 0.045;
    const earR = 0.021 + maturity * 0.005;
    for (let k = 0; k < ears; k++) {
      const a = seedAngle + 0.68 + (k / ears) * Math.PI * 2 + (k % 2) * 0.18;
      const hScale = 0.88 + (k % 3) * 0.09;
      const stemH = h * 0.98 * hScale;
      const drop = h * (0.46 + maturity * 0.18) * hScale;
      const c1 = k === 0 && level >= 6 ? C.gold : grainCol;
      const c2 = k === 0 && level >= 6 ? C.ripe : grainColAlt;
      addStemWithPanicle(p, x, y0, z, a, stemH, span * (0.94 + (k % 2) * 0.14), drop, stemCol, c1, c2, earR);
    }
  }
}

/** Bó lúa gặt buộc lạt dựng trên bờ ruộng: chân rạ xòe, eo buộc lạt tre, đầu bông lúa vàng uốn cong rủ xuống quanh bó. */
export function riceSheaf(p: ShapeBuilder, x: number, y0: number, z: number, rx = 0.08, rz = 0.08): void {
  p.cyl(0.065, 0.115, 0.24, 0x7ca834, x, y0 + 0.12, z, [rx, 0, rz], 7);
  p.cyl(0.072, 0.072, 0.04, C.red, x, y0 + 0.23, z, [rx, 0, rz], 7);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    addStemWithPanicle(p, x, y0 + 0.2, z, a, 0.28, 0.13, 0.16, 0x7ca834, C.ripe, C.gold, 0.019);
  }
}

export function makeRuong(level: number): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  const roof = roofFor(level);
  const lv = grown(level);
  const up = above5(level);
  const bank = 0.12 + lv * 0.02;
  // Từ cấp 6 bờ ruộng kè đá: khung xám quanh ruộng, nhìn xa cũng thấy.
  const bankColor = level >= 6 ? C.rock : C.soil;
  for (const s of [-1, 1]) {
    p.box(2.95, bank, 0.2, bankColor, 0, bank / 2, s * 1.38);
    p.box(0.2, bank, 2.95, bankColor, s * 1.38, bank / 2, 0);
    if (level >= 6) {
      p.box(2.97, 0.035, 0.22, C.rockDark, 0, bank, s * 1.38);
      p.box(0.22, 0.035, 2.95, C.rockDark, s * 1.38, bank, 0);
    }
  }
  p.box(2.6, 0.04, 2.6, C.paddyWater, 0, 0.05, 0);
  const h = 0.16 + lv * 0.07 + 0.06 * up;
  // Cấp càng cao lúa càng dày và cao (cấp 6–8 cao thêm, trĩu bông).
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
      riceClump(p, x, z, h, lv, level, (i * 7 + j * 13) * 0.4);
    }
  }
  if (level >= 3) buffalo(p, 0.85, 0.8);
  if (level >= 4) {
    // Chòi canh ruộng; cấp 6–8 chòi cao và mái to dần, có thang tre.
    const ph = 0.6 + 0.22 * up;
    for (const x of [-1.1, -0.6]) for (const z of [-1.1, -0.6]) p.cyl(0.03, 0.035, ph, C.woodDark, x, ph / 2, z, undefined, 5);
    p.box(0.6, 0.05, 0.6, C.wood, -0.85, ph - 0.02, -0.85);
    const rr = 0.48 + 0.07 * up;
    const rh = 0.36 + 0.08 * up;
    coneRoof(m, roof, rr, rh, -0.85, ph + 0.02 + rh / 2, -0.85, 6);
    if (up) {
      for (const sx of [-1, 1]) p.cyl(0.015, 0.015, ph + 0.1, C.bamboo, -0.85 + sx * 0.1, ph / 2, -0.45, [-0.3, 0, 0], 4);
      for (let i = 1; i < 4 + up; i++) {
        const y = (i * ph) / (4 + up);
        p.cyl(0.012, 0.012, 0.22, C.bamboo, -0.85, y, -0.45 - (y - ph / 2) * Math.tan(0.3), [0, 0, Math.PI / 2], 4);
      }
    }
  }
  if (level >= 5) {
    // Bó lúa đã gặt dựng chụm vào nhau; cấp 7 dời ra giữa bờ để nhường góc cho miếu.
    const sheaves: [number, number][] = level >= 7 ? [[0.1, -1.05], [-0.12, -1.08], [0.0, -0.86]] : [[1.0, -1.0], [0.75, -1.05], [0.88, -0.78]];
    for (const [x, z] of sheaves) {
      riceSheaf(p, x, 0.06, z, 0.1, 0.1);
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
    // Đàn cò trắng lội ao, một con đậu bờ ruộng trước.
    egret(p, -0.95, 0.25, 0.4);
    egret(p, -0.66, -0.22, -0.9);
    egret(p, 0.15, 1.38, 2.6, bank);
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
  const up = above5(level);
  // To dần tới 102,5% ở cấp 5 rồi thêm 4% mỗi cấp; sàn bến thu lại cho khỏi tràn ô.
  const sc = level <= 5 ? 0.9 + 0.025 * level : 1.025 + 0.04 * up;
  const k = spreadFor(sc, 1.025);
  m.setSpread(k);
  const e = edgeOf(2, sc);
  for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.2]) p.cyl(0.06, 0.07, 0.45, C.woodDark, x, 0.22, z);
  p.box(2 * e, 0.1, 1.49 * e, C.woodLight, 0, 0.45, -0.25);
  // Cầu tàu chìa ra sông, cấp 3 trở lên dài hơn và có nhánh phụ.
  const jetty = level >= 3 ? 2.4 : 1.7;
  p.box(0.5, 0.08, jetty, C.wood, 0.55, 0.33, 0.45 + jetty / 2);
  for (let z = 0.9; z < 0.45 + jetty; z += 0.6) p.cyl(0.05, 0.05, 0.8, C.woodDark, 0.55, -0.05, z);
  if (level >= 3) p.box(0.9, 0.07, 0.4, C.wood, 0.05, 0.31, 1.9);
  if (level >= 6) {
    // Cổng bến dựng đầu cầu tàu: hai cột quấn đai đồng, xà ngang, mái nhỏ theo cấp, cờ đuôi nheo hai bên.
    const y0 = 0.37;
    for (const x of [0.3, 0.8]) {
      p.cyl(0.05, 0.06, 1.35, C.woodDark, x, y0 + 0.67, 0.95, undefined, 6);
      p.cyl(0.07, 0.07, 0.06, C.bronze, x, y0 + 0.9, 0.95, undefined, 8);
      m.band.box(0.03, 0.42, 0.2, x < 0.5 ? C.red : C.indigo, x + (x < 0.5 ? -0.07 : 0.07), y0 + 1.05, 1.05);
    }
    p.box(0.72, 0.08, 0.1, C.wood, 0.55, y0 + 1.3, 0.95);
    boatRoof(m, roof, { length: 0.9, width: 0.42, lift: 0.18, drop: 0.12, thickness: 0.04 }, 0.55, y0 + 1.5, 0.95);
    if (level >= 8) {
      bird(m, 1.0, y0 + 1.7, 0.95, 1, 0.35);
      bird(m, 0.1, y0 + 1.7, 0.95, -1, 0.35);
    }
  }
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
  return grownGroup(m, sc, k);
}

/**
 * Thuyền neo ở bến cấp `level`, theo khung mô hình bến (+z chìa ra sông), tâm thu theo `spread` như các phần khác.
 * World đặt chúng lên mặt nước. Cấp 6 có thuyền buôn lớn cạnh cầu tàu, cấp 8 thêm thuyền buôn thứ hai bên kia cầu tàu.
 */
export function benBoats(level: number, spread: number): THREE.Object3D[] {
  const boat = makeBoat();
  boat.position.set(-0.15 * spread, 0, 1.75 * spread);
  const out: THREE.Object3D[] = [boat];
  if (level >= 6) {
    const trader = makeTradeBoat();
    trader.position.set(1.35 * spread, 0, 2.5 * spread);
    trader.rotation.y = Math.PI / 2;
    out.push(trader);
  }
  if (level >= 8) {
    const trader = makeTradeBoat();
    trader.position.set(-1.0 * spread, 0, 3.3 * spread);
    trader.rotation.y = -Math.PI / 2;
    trader.scale.setScalar(0.85);
    out.push(trader);
  }
  return out;
}

// ---------- Nhà sàn ----------

/** Một nóc nhà sàn mái tròn, màu mái theo `roof`; có viền thì thêm vành diềm mái và chóp mái. */
export function domeHouse(m: ToonModel, x: number, z: number, s: number, roof: Roof = THATCH, tall = 0): void {
  const p = m.plain;
  const postH = 0.55 * s + tall;
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
  const sc = sizeFor(level);
  const k = spreadFor(sc);
  m.setSpread(k);
  const e = edgeOf(2, sc);
  // Cấp 6–8: cột nhà sàn cao thêm.
  const tall = 0.1 * above5(level);
  p.box(2 * e, 0.06, 2 * e, C.soil, 0, 0.03, 0);
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
    domeHouse(m, 0.42, 0.38, 0.9, roof, tall);
    if (level >= 8) {
      // Nhà sàn dài mái thuyền như nhà khắc trên trống đồng: mái vút cao hai đầu, chim đậu hai đầu nóc.
      stiltHall(m, { x: -0.25, z: -0.5, w: 1.3, d: 0.75, postH: 0.55 + tall, roofL: 1.8, roofW: 0.85, lift: 0.6, roof });
      const top = 0.55 + tall + 0.68 + 0.85 * 0.4 + 0.6;
      bird(m, -0.25 + 0.88, top, -0.5, 1, 0.55);
      bird(m, -0.25 - 0.88, top, -0.5, -1, 0.55);
    } else {
      stiltHall(m, { x: -0.5, z: -0.45, w: 0.95, d: 0.75, postH: 0.5 + tall, roofL: 1.3, roofW: 0.8, lift: 0.32, roof });
      domeHouse(m, 0.6, -0.62, 0.5, roof, tall);
    }
    // Cầu tre: hai cây tre làm sàn cầu, tay vịn hai bên.
    const len = 0.62;
    const a = Math.atan2(0.62, 0.7);
    p.box(0.16, 0.04, len, C.bamboo, 0.0, 0.5 + tall, -0.08, [0, a, 0]);
    for (const off of [-0.08, 0.08]) {
      const ox = Math.cos(a) * off;
      const oz = -Math.sin(a) * off;
      p.box(0.025, 0.025, len, C.bamboo, ox, 0.68 + tall, -0.08 + oz, [0, a, 0]);
      for (const t of [-0.25, 0, 0.25]) p.cyl(0.015, 0.015, 0.18, C.woodDark, ox + Math.sin(a) * t, 0.6 + tall, -0.08 + oz + Math.cos(a) * t, undefined, 4);
    }
  } else {
    domeHouse(m, 0.3, 0.3, 1.0, roof, tall);
    domeHouse(m, -0.5, -0.45, 0.75, roof, tall);
    if (level >= 5) domeHouse(m, 0.55, -0.55, 0.62, roof, tall);
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
  if (level >= 5) bird(m, level >= 7 ? 0.42 : 0.3, (level >= 7 ? 1.2 : 1.3) + tall, level >= 7 ? 0.38 : 0.3, 1, 0.6);
  if (level >= 6) {
    // Cây cau cao vút góc vườn, cao dần theo cấp: buồng cau dưới tàu lá.
    arecaPalm(m.plain, -0.8, 0.14, 2.0 + 0.25 * above5(level));
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
  return grownGroup(m, sc, k);
}

/** Cây cau: thân mảnh có đốt, chùm tàu lá xòe rủ trên ngọn, buồng cau xanh dưới tàu lá. Gốc ở chân cây. */
export function arecaPalm(p: ShapeBuilder, x: number, z: number, h: number): void {
  p.cyl(0.035, 0.055, h, C.palm, x, h / 2, z, undefined, 6);
  for (let i = 1; i < 6; i++) p.cyl(0.05, 0.05, 0.025, 0x6f5d46, x, (i * h) / 6, z, undefined, 6);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = new THREE.BoxGeometry(0.12, 0.02, 0.62);
    leaf.translate(0, 0, 0.3);
    leaf.rotateX(0.55 + (i % 2) * 0.25);
    leaf.rotateY(a);
    p.add(leaf, i % 2 ? C.leaf[1] : C.leaf[3], x, h, z);
  }
  p.cyl(0.06, 0.04, 0.06, C.leaf[0], x, h + 0.02, z, undefined, 6);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    p.sphere(0.035, i % 2 ? 0x9a9a3a : 0xc9862e, x + Math.sin(a) * 0.06, h - 0.12 - (i % 2) * 0.04, z + Math.cos(a) * 0.06, [1, 1.2, 1], 6);
  }
}

// ---------- Bãi đất đá ----------

export function makeBaiDa(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const up = above5(level);
  // Tới cấp 5 cỡ 100%; cấp 6–8 to thêm như các công trình khác (105%, 110%, 114% so với cấp 5), tâm thu về chỗ cũ.
  const sc = level >= 6 ? sizeFor(level) / 1.05 : 1;
  const k = spreadFor(sc, 1);
  m.setSpread(k);
  const e = edgeOf(2, sc);
  p.box(2 * e, 0.1, 2 * e, C.earth, 0, 0.05, 0);
  const rand = seeded(17);
  // Cấp càng cao càng nhiều tảng đá.
  for (let i = 0; i < 2 + Math.min(level, 8); i++) {
    const x = -0.6 + rand() * 1.2;
    const z = -0.2 + rand() * 0.8;
    p.sphere(0.2 + rand() * 0.12, i % 2 ? C.rock : C.rockDark, x, 0.15, z, [1.2, 0.7, 1], 6);
  }
  // Chồng đá xẻ vuông, cao thêm một khối mỗi cấp từ cấp 6.
  if (level >= 2) for (let i = 0; i < 3 + up; i++) p.box(0.32, 0.18, 0.24, i % 2 && up ? C.rockDark : C.rock, 0.55, 0.19 + i * 0.18, 0.55, [0, i * 0.3, 0]);
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
  const extras: THREE.Object3D[] = [];
  if (level >= 7) {
    // Lò nung gạch đất: lò vòm đất nung có ống khói bốc khói, chồng gạch đỏ bên cạnh; cấp 8 chồng gạch cao gấp đôi.
    const kl = new ToonModel(inkThin);
    kl.setSpread(k);
    kl.plain.cyl(0.4, 0.44, 0.18, C.earthDark, 0.55, 0.09, -0.5, undefined, 12);
    kl.band.add(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), BRICK, 0.55, 0.16, -0.5, [0, 0, 0], [0.4, 0.42, 0.4]);
    kl.plain.box(0.2, 0.18, 0.08, 0x2a1d12, 0.55, 0.26, -0.12);
    kl.plain.cyl(0.07, 0.09, 0.42, C.earthDark, 0.68, 0.72, -0.62, undefined, 8);
    for (let i = 0; i < (level >= 8 ? 6 : 3); i++) for (let j = 0; j < 2; j++) kl.plain.box(0.16, 0.07, 0.09, BRICK, 0.05 + j * 0.18, 0.16 + i * 0.08, -0.85);
    extras.push(kl.group());
    const glow = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 6), new THREE.MeshBasicMaterial({ color: C.ember }));
    glow.position.set(0.55, 0.24, -0.06);
    glow.userData.flame = true;
    extras.push(glow);
    const smoke = new THREE.Group();
    smoke.userData.smoke = true;
    const mat = new THREE.MeshBasicMaterial({ color: 0x9a948c, transparent: true, opacity: 0.5, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), mat);
      puff.userData.phase = i / 4;
      smoke.add(puff);
    }
    smoke.position.set(0.68, 0.95, -0.62);
    extras.push(smoke);
  }
  return grownGroup(m, sc, k, extras);
}

/** Gạch đất nung đỏ. */
export const BRICK = 0xa8502e;
/** Sắt rèn binh khí: thép xám xanh như ngựa sắt của Gióng. */
export const IRON_BLADE = 0x7b8a9c;

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
  const up = above5(level);
  const sc = sizeFor(level);
  const k = spreadFor(sc);
  m.setSpread(k);
  const e = edgeOf(2, sc);
  const extra = new THREE.Group();
  p.box(2 * e, 0.08, 2 * e, C.earthDark, 0, 0.04, 0);
  // Lò nung chính to dần ở cấp 6–8.
  const ks = 1.2 + 0.08 * up;
  kiln(m, extra, -0.4, 0.3, ks);
  if (up) {
    // Khói đen bốc lên từ ống lò nung chính.
    const smoke = new THREE.Group();
    smoke.userData.smoke = true;
    const mat = new THREE.MeshBasicMaterial({ color: 0x6f6a64, transparent: true, opacity: 0.55, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), mat);
      puff.userData.phase = i / 4;
      smoke.add(puff);
    }
    smoke.position.set(-0.4, 1.4 * ks, 0.3);
    extra.add(smoke);
  }
  // Lán mái một dốc phía sau che chỗ đe; cấp 4 lán dài hơn, cấp 6 lán cao hơn để che giá binh khí, cao dần tới cấp 8.
  const shedL = level >= 4 ? 1.6 : 1.0;
  const shedH = level >= 6 ? 1.35 + 0.15 * (up - 1) : 1.0;
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
  return grownGroup(m, sc, k, [...extra.children]);
}

// ---------- Kho thóc ----------

/** Một kho tròn trên cột cao (có đĩa chặn chuột), mái nón màu theo `roof`. */
export function granary(m: ToonModel, x: number, z: number, s: number, finial: boolean, roof: Roof = THATCH, tall = 0): void {
  const p = m.plain;
  const postH = 0.8 * s + tall;
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
  const up = above5(level);
  const sc = sizeFor(level);
  const k = spreadFor(sc);
  m.setSpread(k);
  const e = edgeOf(2, sc);
  // Cấp 6–8: vựa trên cột cao thêm.
  const tall = 0.1 * up;
  p.box(2 * e, 0.06, 2 * e, C.soil, 0, 0.03, 0);
  if (level <= 2) granary(m, 0, 0, 1.15, false);
  else if (level >= 7) {
    // Ba vựa trên cột và cót thóc lớn quây quanh sân phơi lát gạch ở giữa.
    // Cấp 8: kho sàn dài mái cong thay hai vựa phía sau, chim đồng hai đầu nóc.
    if (level >= 8) {
      stiltHall(m, { x: 0, z: -0.6, w: 1.6, d: 0.66, postH: 0.6 + tall, roofL: 1.95, roofW: 0.8, lift: 0.45, roof });
      const top = 0.6 + tall + 0.68 + 0.8 * 0.4 + 0.45;
      bird(m, 0.95, top, -0.6, 1, 0.5);
      bird(m, -0.95, top, -0.6, -1, 0.5);
    } else {
      granary(m, 0.62, -0.62, 0.72, true, roof, tall);
      granary(m, -0.62, -0.62, 0.66, false, roof, tall);
    }
    granary(m, 0.66, 0.62, 0.6, level >= 8, roof, tall);
    // Sân phơi lát gạch ở giữa, chéo về phía trước cho dễ thấy giữa ba mái vựa.
    p.box(1.05, 0.05, 1.05, 0xc9b08a, -0.1, 0.07, 0.15, [0, Math.PI / 4, 0]);
    p.box(0.85, 0.03, 0.85, C.ripe, -0.1, 0.11, 0.15, [0, Math.PI / 4, 0]);
    for (let i = 0; i < 3; i++) p.box(0.85, 0.02, 0.035, C.thatchDark, -0.1 - 0.2 + i * 0.2, 0.13, 0.15 + 0.2 - i * 0.2, [0, Math.PI / 4, 0]);
    p.cyl(0.014, 0.014, 0.7, C.woodDark, 0.05, 0.3, 0.35, [0, 0, 1.1], 4);
    p.box(0.26, 0.05, 0.04, C.woodDark, -0.23, 0.15, 0.35);
  } else {
    granary(m, 0.32, 0.3, level >= 5 ? 1.05 : 0.95, level >= 5, roof, tall);
    granary(m, -0.5, -0.45, 0.72, false, roof, tall);
    if (level >= 4) granary(m, 0.55, -0.55, 0.6, false, roof, tall);
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
    // Cót cao dần ở cấp 7, 8, thêm đai tre.
    const [cx, cz] = level >= 7 ? [-0.6, 0.6] : [-0.55, 0.42];
    const ch = 0.6 + 0.12 * (up - 1);
    p.cyl(0.4, 0.42, 0.08, C.rock, cx, 0.08, cz, undefined, 12);
    m.band.cyl(0.36, 0.38, ch, C.thatch, cx, 0.12 + ch / 2, cz, undefined, 12);
    for (let i = 0; i < 3 + up - 1; i++) p.cyl(0.385, 0.385, 0.035, C.bamboo, cx, 0.25 + (i * (ch - 0.15)) / (2 + up - 1), cz, undefined, 12);
    p.sphere(0.34, C.ripe, cx, 0.12 + ch, cz, [1, 0.4, 1], 10);
  }
  return grownGroup(m, sc, k);
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

/** Cỡ doanh trại theo cấp. */
export const doanhTraiScale = (level: number) => 0.9 + 0.025 * level;
/** Chỗ tướng đứng trong sân doanh trại (tọa độ mô hình, chưa nhân cỡ): giữa sân, trước nhà dài. */
export const DOANH_TRAI_HERO = { x: 0.35, z: 0.8 };

/** Cọc rơm tập đâm: cọc gỗ, bó rơm, thanh ngang làm tay. */
function strawDummy(p: ShapeBuilder, x: number, z: number, s = 1): void {
  p.cyl(0.03 * s, 0.03 * s, 0.8 * s, C.woodDark, x, 0.4 * s, z, undefined, 5);
  p.cyl(0.13 * s, 0.13 * s, 0.36 * s, C.thatch, x, 0.62 * s, z, undefined, 7);
  p.box(0.4 * s, 0.05 * s, 0.05 * s, C.woodDark, x, 0.7 * s, z);
}

/** Lọng che tướng: cán cao, tán đỏ hình nón thấp, diềm đồng. */
export function parasol(m: ToonModel, x: number, z: number, h: number): void {
  m.plain.cyl(0.025, 0.03, h, C.woodDark, x, h / 2, z, undefined, 5);
  m.band.cone(0.36, 0.16, C.red, x, h + 0.04, z, undefined, 12);
  m.plain.add(new THREE.TorusGeometry(0.35, 0.025, 4, 18), C.bronze, x, h - 0.03, z, [Math.PI / 2, 0, 0]);
  m.plain.sphere(0.04, C.bronzeLight, x, h + 0.14, z, [1, 1, 1], 6);
}

/**
 * Doanh trại: nơi các tướng ở và điều binh. Nhà dài để trống không vách, mái thẳng; giá giáo đồng; cờ đỏ.
 * Giữa sân để trống cho tướng đứng (`DOANH_TRAI_HERO`). Lính luyện ở nơi ở riêng (trại giáo, trại cung, chuồng voi).
 */
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
    // Đài tướng: nền đất đắp vuông có bậc, chiếu cói, lọng đỏ che.
    p.box(0.56, 0.16, 0.5, C.earthDark, -0.92, 0.12, 0.92);
    p.box(0.24, 0.08, 0.16, C.earthDark, -0.92, 0.08, 1.24);
    p.box(0.42, 0.02, 0.36, C.thatch, -0.92, 0.21, 0.92);
    parasol(m, -1.08, 0.78, 1.0);
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

// ---------- Nơi ở riêng của từng binh chủng ----------
// Mỗi binh chủng có nơi ở riêng, luyện ở đó. Móng 2×2, dựng một lần, không lên cấp (mái tranh).

/** Lều lính mái chữ A: mái tranh chạm đất hai bên, nóc chạy dọc trục z, đầu hồi trước để ngỏ; gốc ở tâm sàn lều. */
function aFrameHut(m: ToonModel, x: number, z: number, length: number, width: number, h: number): void {
  const p = m.plain;
  p.box(width * 0.9, 0.06, length, C.thatchDark, x, 0.06, z);
  const half = width / 2;
  const slope = Math.hypot(half, h);
  const tilt = Math.atan2(h, half);
  for (const s of [-1, 1]) m.band.box(slope + 0.08, 0.07, length + 0.14, C.thatch, x + s * half * 0.5, h / 2 + 0.04, z, [0, 0, -s * tilt]);
  // Nóc tre và cột chữ A ở đầu hồi trước.
  p.cyl(0.03, 0.03, length + 0.24, C.woodDark, x, h + 0.08, z, [Math.PI / 2, 0, 0], 5);
  for (const s of [-1, 1]) p.cyl(0.025, 0.025, slope + 0.14, C.woodDark, x + s * half * 0.5, h / 2 + 0.06, z + length / 2 + 0.07, [0, 0, -s * tilt + s * Math.PI / 2], 5);
  // Vách hồi sau đan phên (tam giác); đầu hồi trước để ngỏ, thấy chiếu ngủ bên trong.
  const tri = new THREE.Shape();
  tri.moveTo(-half * 0.92, 0);
  tri.lineTo(half * 0.92, 0);
  tri.lineTo(0, h * 0.95);
  tri.closePath();
  p.add(new THREE.ExtrudeGeometry(tri, { depth: 0.04, bevelEnabled: false }), C.woodLight, x, 0.06, z - length / 2);
  p.box(width * 0.5, 0.02, length * 0.7, C.cream, x, 0.1, z - 0.05);
}

/** Trại giáo: lều lính mái chữ A, giá giáo đồng dựng nghiêng, hai cọc rơm tập đâm, một giáo binh đang đâm thử. */
export function makeTraiGiao(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.95, 0.08, 1.95, C.earth, 0, 0.04, 0);
  aFrameHut(m, -0.42, -0.25, 1.3, 0.95, 1.0);
  // Giá giáo: hai cột, xà ngang, giáo dựng nghiêng tựa xà, mũi đồng lớn.
  for (const z of [-0.8, 0.0]) p.cyl(0.035, 0.04, 0.95, C.woodDark, 0.72, 0.47, z, undefined, 6);
  p.box(0.06, 0.06, 0.92, C.woodDark, 0.72, 0.9, -0.4);
  for (let i = 0; i < 5; i++) {
    const z = -0.74 + i * 0.17;
    p.cyl(0.016, 0.016, 1.25, C.woodDark, 0.8, 0.62, z, [0, 0, 0.18], 5);
    p.cone(0.05, 0.2, C.bronze, 0.69, 1.31, z, [0, 0, 0.18], 4);
  }
  // Sân tập phía trước: hai cọc rơm, giáo binh đâm thử vào cọc gần.
  strawDummy(p, 0.55, 0.62, 0.9);
  strawDummy(p, -0.1, 0.78, 0.9);
  banner(m, -0.88, 0.75, 1.5, C.red);
  const g = m.group();
  const giao = makeFighter('giao');
  giao.scale.setScalar(0.72);
  giao.position.set(0.3, 0.08, 0.25);
  giao.rotation.y = 0.6;
  g.add(giao);
  g.scale.setScalar(0.95);
  return g;
}

/** Bia rơm tròn vẽ vòng đỏ trắng trên giá gỗ, mấy mũi tên đã găm; mặt bia hướng `ry` (0 là ra trước, +z). */
export function archeryTarget(m: ToonModel, x: number, z: number, ry: number): void {
  const p = m.plain;
  const fx = Math.sin(ry);
  const fz = Math.cos(ry);
  // Trục khối trụ (trục y) quay về hướng mặt bia: Rz(−90°) đưa trục y về +x, rồi quay quanh trục đứng.
  const face: [number, number, number] = [0, ry - Math.PI / 2, -Math.PI / 2];
  for (const s of [-1, 1]) p.cyl(0.025, 0.03, 0.62, C.woodDark, x + fz * s * 0.2, 0.31, z - fx * s * 0.2, undefined, 5);
  p.box(0.06, 0.05, 0.46, C.woodDark, x, 0.4, z, [0, ry + Math.PI / 2, 0]);
  p.cyl(0.3, 0.3, 0.09, C.thatch, x, 0.66, z, face, 16);
  m.band.cyl(0.22, 0.22, 0.02, C.cream, x + fx * 0.05, 0.66, z + fz * 0.05, face, 16);
  m.band.cyl(0.14, 0.14, 0.02, C.red, x + fx * 0.06, 0.66, z + fz * 0.06, face, 14);
  m.band.cyl(0.06, 0.06, 0.02, C.cream, x + fx * 0.07, 0.66, z + fz * 0.07, face, 10);
  for (const [dx, dy] of [[0.06, 0.05], [-0.1, -0.04], [0.03, -0.13]]) {
    p.cyl(0.009, 0.009, 0.28, C.woodLight, x + fx * 0.18 + fz * dx, 0.66 + dy, z + fz * 0.18 - fx * dx, face, 4);
  }
}

/** Trại cung: lán một mái tựa vách sau, giá cung và bao tên, bia rơm tròn bên trái, một cung thủ giương cung nhắm bia. */
export function makeTraiCung(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.95, 0.08, 1.95, C.earth, 0, 0.04, 0);
  // Lán một mái: cột sau cao tựa vách phên, cột trước thấp, mái tranh dốc ra trước.
  const back = 1.25;
  const front = 0.72;
  for (const x of [-0.8, 0, 0.8]) {
    p.cyl(0.04, 0.05, back, C.woodDark, x, back / 2, -0.84, undefined, 6);
    p.cyl(0.04, 0.05, front, C.woodDark, x, front / 2, -0.18, undefined, 6);
  }
  const run = 0.66;
  const tilt = Math.atan2(back - front, run);
  m.band.box(1.95, 0.08, Math.hypot(back - front, run) + 0.26, C.thatch, 0, (back + front) / 2 + 0.05, -0.51, [tilt, 0, 0]);
  p.box(1.7, 0.7, 0.04, C.woodLight, 0, 0.4, -0.86);
  // Giá cung trên vách sau: cung cong treo hàng; hai bao tên dựng dưới lán.
  p.box(1.1, 0.04, 0.05, C.woodDark, -0.1, 0.62, -0.8);
  for (let i = 0; i < 4; i++) p.add(new THREE.TorusGeometry(0.17, 0.014, 4, 10, Math.PI), C.woodDark, -0.5 + i * 0.26, 0.46, -0.78, [0, 0, -Math.PI / 2]);
  for (const x of [0.5, 0.66]) {
    p.cyl(0.055, 0.05, 0.34, C.earthDark, x, 0.25, -0.5, undefined, 8);
    for (const d of [-0.025, 0.025]) p.cyl(0.007, 0.007, 0.2, C.woodLight, x + d, 0.48, -0.5, undefined, 3);
  }
  // Bia rơm bên trái, mặt bia quay sang phải về phía cung thủ.
  archeryTarget(m, -0.6, 0.45, Math.PI / 2);
  banner(m, 0.86, -0.92, 1.7, C.red);
  const g = m.group();
  const cung = bakeSoldier('cung', 0, { act: 'fight' });
  cung.scale.setScalar(0.72);
  cung.position.set(0.5, 0.08, 0.45);
  cung.rotation.y = -Math.PI / 2;
  g.add(cung);
  g.scale.setScalar(0.95);
  return g;
}

/** Chuồng voi: cột gỗ lớn đỡ mái tranh vuông chóp nhọn cao cho voi đứng lọt, rào gỗ, máng nước, đống cỏ, cọc buộc voi. */
export function makeChuongVoi(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.95, 0.08, 1.95, C.earth, 0, 0.04, 0);
  // Bốn cột lớn và mái chóp bốn mặt.
  for (const x of [-0.62, 0.42]) for (const z of [-0.72, 0.22]) p.cyl(0.07, 0.09, 1.3, C.woodDark, x, 0.65, z, undefined, 7);
  p.box(1.2, 0.08, 1.1, C.wood, -0.1, 1.3, -0.25);
  // Mái chóp bốn mặt, mỗi mặt quay thẳng ra một phía; chóp đồng trên đỉnh.
  m.band.cone(0.98, 0.62, C.thatch, -0.1, 1.64, -0.25, [0, Math.PI / 4, 0], 4);
  p.sphere(0.07, C.bronzeLight, -0.1, 1.98, -0.25, [1, 1, 1], 6);
  // Rào gỗ ngang hai bên và sau, chừa cổng trước.
  for (const [x, z, w, d] of [[-0.93, -0.25, 0.05, 1.3], [0.93, -0.25, 0.05, 1.3], [0, -0.93, 1.86, 0.05]] as const) {
    for (const y of [0.25, 0.5]) p.box(w, 0.06, d, C.wood, x, y, z);
  }
  for (const [x, z] of [[-0.93, -0.9], [-0.93, 0.4], [0.93, -0.9], [0.93, 0.4]]) p.cyl(0.04, 0.05, 0.62, C.woodDark, x, 0.31, z, undefined, 5);
  // Máng nước gỗ và đống cỏ.
  p.box(0.5, 0.14, 0.18, C.wood, 0.55, 0.12, 0.72);
  p.box(0.42, 0.02, 0.1, C.paddyWater, 0.55, 0.19, 0.72);
  p.sphere(0.26, 0x8fa64a, -0.6, 0.12, 0.7, [1.2, 0.6, 0.9], 9);
  p.sphere(0.18, 0x7a9440, -0.42, 0.1, 0.82, [1.1, 0.6, 1], 8);
  // Cọc buộc voi có đai đồng.
  p.cyl(0.06, 0.07, 0.5, C.woodDark, 0.15, 0.25, 0.75, undefined, 6);
  p.cyl(0.075, 0.075, 0.05, C.bronze, 0.15, 0.4, 0.75, undefined, 8);
  const g = m.group();
  const voi = makeFighter('voi');
  // Voi bước ra trước mái, quay sang đống cỏ.
  voi.scale.setScalar(0.62);
  voi.position.set(-0.2, 0.08, 0.2);
  voi.rotation.y = -0.6;
  g.add(voi);
  g.scale.setScalar(0.95);
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
  // Cao thêm mỗi cấp, kể cả cấp 6–8 (móng một ô, chỉ cao lên).
  const h = 1.5 + Math.min(level, 8) * 0.25;
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
  if (level >= 8) {
    // Chim đồng hai đầu nóc.
    bird(m, 0.5, h + 1.05, 0, 1, 0.4);
    bird(m, -0.5, h + 1.05, 0, -1, 0.4);
  }
  const g = m.group();
  for (const b of bows) g.add(b);
  const archer = bakeSoldier('cung', 0, { act: 'fight' });
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
    const archer = bakeSoldier('cung', 0, { act: 'fight' });
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
  const statue = bakeIronHorse();
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
  const statue = bakeSonTinh();
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
  const turtle = bakeRuaVang();
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

/**
 * Khóm lúa nếp cái hoa vàng (dựng đúng cấu trúc cây lúa — không có thân gỗ chính):
 * - Gốc mạ có mô đất bùn nhỏ sát mặt nước.
 * - Tầng lá mạ dưới uốn vòm sang hai bên, tầng lá đòng giữa vươn cao vút.
 * - Mỗi bông nếp tròn mẩy màu ngà vàng được cắm trực tiếp vào một cuống mạ xanh mọc từ gốc vươn lên rồi uốn cong rủ bông xuống gốc.
 */
export function nepClump(p: ShapeBuilder, x: number, z: number, h: number, seedAngle = 0): void {
  const y0 = 0.055;
  p.sphere(0.056, C.soil, x, y0, z, [1.35, 0.36, 1.35], 6);

  // 1. Tầng lá mạ dưới (4 lá): mọc từ gốc, uốn vòm rủ xuống xung quanh gốc
  for (let i = 0; i < 4; i++) {
    const a = seedAngle + (i / 4) * Math.PI * 2 + 0.35;
    const blade = curvedLeafBladeGeo(0.026, h * 0.58, 0.15 + (i % 2) * 0.025, h * 0.27);
    blade.rotateY(a);
    p.add(blade, 0x5c8c2c, x, y0, z);
  }

  // 2. Tầng lá đòng giữa (4 lá): bản lá dài vươn cao vút từ gốc lên quá tầm bông nếp
  for (let i = 0; i < 4; i++) {
    const a = seedAngle + 0.15 + (i / 4) * Math.PI * 2;
    const lh = h * (1.12 + (i % 2) * 0.14);
    const blade = curvedLeafBladeGeo(0.028, lh, 0.068 + (i % 2) * 0.03, lh * 0.06);
    blade.rotateY(a);
    p.add(blade, i % 2 === 0 ? NEP_STALK : 0x72a238, x, y0, z);
  }

  // 3. 4 cuống mạ xanh mọc thẳng từ gốc nước, mỗi cuống mang các cặp hạt nếp tròn mẩy màu ngà vàng uốn cong rủ sâu xuống gốc
  for (let k = 0; k < 4; k++) {
    const a = seedAngle + 0.68 + (k / 4) * Math.PI * 2 + (k % 2) * 0.18;
    const hScale = 0.88 + (k % 3) * 0.09;
    const stemH = h * 0.98 * hScale;
    const drop = h * (0.5 + (k % 2) * 0.08) * hScale;
    addStemWithPanicle(p, x, y0, z, a, stemH, 0.2 + (k % 2) * 0.025, drop, NEP_STALK, NEP, 0xd8be72, 0.024);
  }
}

/** Bù nhìn rơm đội nón lá, mặc áo tơi rơm 3 tầng thắt đai đỏ, tay cầm dải lụa đỏ & mõ tre đuổi chim. Gốc ở chân cọc. */
function scarecrow(m: ToonModel, x: number, z: number): void {
  const p = m.plain;
  // Cọc tre đứng & sào tre ngang
  p.cyl(0.026, 0.032, 1.08, C.woodDark, x, 0.54, z, undefined, 5);
  p.cyl(0.02, 0.02, 0.78, C.bamboo, x, 0.74, z, [0, 0, Math.PI / 2], 5);
  // Áo tơi rơm bện 3 lớp xòe tua tủa + đai lưng vải đỏ
  p.cone(0.22, 0.28, C.thatchDark, x, 0.46, z, undefined, 8);
  m.band.cyl(0.115, 0.165, 0.28, C.thatch, x, 0.64, z, undefined, 8);
  p.cone(0.18, 0.18, C.thatch, x, 0.76, z, undefined, 8);
  p.cyl(0.132, 0.138, 0.04, C.red, x, 0.56, z, undefined, 8);
  // Hai ống tay rơm + dải lụa đỏ bay bên trái & ống mõ tre bên phải
  for (const s of [-1, 1]) {
    p.cone(0.055, 0.18, C.thatchDark, x + s * 0.34, 0.72, z, [0, 0, s * 1.38], 6);
  }
  p.box(0.035, 0.24, 0.016, C.red, x - 0.41, 0.58, z + 0.02, [0.15, 0, 0.28]);
  p.cyl(0.028, 0.028, 0.12, C.bamboo, x + 0.4, 0.6, z, [0, 0, -0.15], 5);
  // Đầu rơm tròn & Nón lá truyền thống có vành tre + chóp nón
  p.sphere(0.092, C.cream, x, 0.91, z, [1, 1.05, 1], 8);
  p.cone(0.21, 0.16, C.cream, x, 1.05, z, undefined, 12);
  p.add(new THREE.TorusGeometry(0.2, 0.012, 5, 14), C.bamboo, x, 0.975, z, [Math.PI / 2, 0, 0]);
}

/** Bó lúa nếp treo trên giàn phơi: cuống lúa xanh buộc lạt đỏ, chùm bông nếp vàng ngà trĩu hạt. */
function nepBundle(p: ShapeBuilder, x: number, y: number, z: number): void {
  p.cyl(0.028, 0.046, 0.12, NEP_STALK, x, y - 0.03, z, undefined, 6);
  p.cyl(0.038, 0.038, 0.025, C.red, x, y - 0.08, z, undefined, 6);
  p.capsule(0.056, 0.22, NEP, x, y - 0.2, z, undefined, [1.05, 1, 0.85]);
  p.sphere(0.048, 0xd8c27a, x, y - 0.3, z, [1.15, 0.85, 0.95], 6);
}

export function makeRuongNep(level: number): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  const bank = 0.16 + level * 0.015;
  const LAT_DARK = 0x8a4c28;
  const LAT_LIGHT = 0xc27a4e;

  // Bờ đá ong bao quanh ruộng: thân bờ đá ong + các viên đá ong xếp nổi khối trên mặt bờ
  for (const s of [-1, 1]) {
    p.box(2.95, bank, 0.22, LATERITE, 0, bank / 2, s * 1.37);
    p.box(0.22, bank, 2.95, LATERITE, s * 1.37, bank / 2, 0);
    for (let k = 0; k < 7; k++) {
      const pos = -1.2 + k * 0.4;
      const c1 = k % 2 === 0 ? LAT_DARK : LAT_LIGHT;
      const c2 = k % 2 === 0 ? LAT_LIGHT : LAT_DARK;
      p.box(0.34, 0.035, 0.18, c1, pos, bank + 0.015, s * 1.37);
      p.box(0.18, 0.035, 0.34, c2, s * 1.37, bank + 0.015, pos);
    }
  }
  p.box(2.58, 0.04, 2.58, C.paddyWater, 0, 0.05, 0);

  // Bờ con lát đá ong chia ruộng làm hai thửa + ống bương tre thông nước giữa hai thửa + bụi cỏ bờ
  p.box(0.15, 0.11, 2.56, LATERITE, 0.0, 0.065, 0);
  for (let k = 0; k < 5; k++) {
    p.box(0.13, 0.025, 0.38, k % 2 === 0 ? LAT_LIGHT : LAT_DARK, 0, 0.125, -0.96 + k * 0.48);
  }
  p.cyl(0.028, 0.028, 0.28, C.bamboo, 0, 0.065, 0.24, [0, 0, Math.PI / 2], 6);
  for (const [gx, gz] of [
    [-1.24, 1.24],
    [1.24, -1.22],
    [0.04, -1.18],
    [-0.04, 1.15],
  ] as const) {
    p.cone(0.055, 0.15, C.leaf[1], gx, bank + 0.05, gz, undefined, 4);
  }

  // Bậc đá ong lối bước xuống ruộng ở bờ trước (+z)
  p.box(0.42, bank + 0.03, 0.26, LAT_DARK, 0, (bank + 0.03) / 2, 1.36);
  p.box(0.36, bank * 0.65, 0.16, LATERITE, 0, bank * 0.32, 1.19);

  // Cấp càng cao lúa nếp càng dày, cao và trĩu bông.
  const rows = level >= 2 ? 6 : 5;
  const step = 2.4 / rows;
  const h = 0.28 + level * 0.065;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < rows; j++) {
      const x = -1.2 + step * (i + 0.5);
      const z = -1.2 + step * (j + 0.5);
      if (Math.abs(x) < 0.14) continue;
      // Chừa chỗ bù nhìn giữa thửa trái.
      if (level >= 2 && Math.hypot(x + 0.55, z + 0.15) < 0.3) continue;
      // Cấp 3 chừa góc phải trước cho nong phơi thóc nếp & thúng nếp.
      if (level >= 3 && x > 0.72 && z > 0.72) continue;
      nepClump(p, x, z, h, (i * 5 + j * 11) * 0.45);
    }
  }
  if (level >= 2) scarecrow(m, -0.55, -0.15);
  if (level >= 3) {
    // Giàn tre 2 tầng phơi bó nếp dọc bờ sau (-z).
    for (const x of [-1.2, 1.2]) {
      for (const dz of [-0.06, 0.06]) {
        p.cyl(0.035, 0.042, 1.18, C.bamboo, x, 0.62, -1.32 + dz, [dz * 2, 0, 0], 5);
      }
      p.box(0.12, 0.04, 0.22, C.woodDark, x, 1.18, -1.32);
    }
    for (const y of [1.1, 0.78]) p.cyl(0.03, 0.03, 2.54, C.bamboo, 0, y, -1.32, [0, 0, Math.PI / 2], 5);
    for (let i = 0; i < 9; i++) {
      const x = -1.0 + i * 0.25;
      nepBundle(p, x, i % 2 ? 0.78 : 1.1, -1.32);
    }
    // Góc sân đá ong góc trước phải (+x, +z): nong tre phơi thóc nếp vàng ngà & 2 thúng nếp đầy ắp
    p.box(0.56, bank, 0.56, LATERITE, 0.98, bank / 2, 0.98);
    p.cyl(0.21, 0.2, 0.025, C.bamboo, 0.92, bank + 0.015, 0.95, undefined, 10);
    p.sphere(0.17, NEP, 0.92, bank + 0.025, 0.95, [1, 0.22, 1], 8);
    for (const [bx, bz, r] of [
      [1.18, 0.82, 0.095],
      [1.14, 1.08, 0.082],
    ] as const) {
      p.cyl(r, r * 0.78, 0.13, C.thatchDark, bx, bank + 0.065, bz, undefined, 8);
      p.sphere(r * 0.92, NEP, bx, bank + 0.13, bz, [1, 0.45, 1], 7);
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

/**
 * Mô hình công trình loại `type` ở cấp `level`, theo móng cũ (chưa phóng theo móng, xem `footScale`), cho các loại
 * chưa vẽ lại trên móng mới. Mười một loại đã vẽ lại ở `congTrinh/` (Điện, ruộng, bến, nhà sàn, bãi đá, lò rèn, kho,
 * doanh trại, trại giáo, trại cung, chuồng voi) không có ở đây: game dựng chúng qua `lotModel` (`congTrinh/index.ts`).
 * Dáng cũ của chúng (`makeDien`...) còn lại chỉ để `scripts/congTrinh.ts` chụp so cũ và mới; bỏ khi vẽ lại nốt.
 */
export function buildingModel(type: BuildingType, level: number): THREE.Group {
  if (type === 'choiCanh') return makeChoiCanh(level);
  if (type === 'bayChong') return makeBayChong();
  if (type === 'denPhuDong') return makeDenPhuDong();
  if (type === 'denTanVien') return makeDenTanVien();
  if (type === 'denCoLoa') return makeDenCoLoa();
  if (type === 'ruongNep') return makeRuongNep(level);
  if (type === 'vuon') return makeVuon(level);
  if (type === 'chuongLon') return makeChuongLon(level);
  if (type === 'bep') return makeBep(level);
  if (type === 'lauNo') return makeLauNo();
  if (isDecor(type)) return decorModel(type);
  return new THREE.Group();
}
