// Bản thử giản lược dáng công trình (chờ chủ dự án chọn kiểu): nhà sàn, kho thóc, bãi đất đá, ruộng lúa, mỗi loại
// ba kiểu đặt cạnh dáng hiện tại. Chỉ để chụp so (scripts/chup-gian-luoc.mjs), game không dùng.
//   Kiểu 1, gọn sân: giữ các nhà như hiện tại, bỏ đồ nhỏ rải sân; vật nhỏ còn lại viền mảnh, lúa không viền.
//   Kiểu 2, một mái chính: một nhà (hay khối) chính to, tối đa một phần phụ thấp; bỏ dải đồng hoa văn cấp 9.
//   Kiểu 3, khối đồ chơi: như kiểu 2 nhưng khối thô ít mặt, không hoa văn trên vách, cấp đọc bằng cỡ, màu mái, chóp đồng.

import * as THREE from 'three';
import { BUILDINGS, type BuildingType } from '../src/game/defs';
import {
  above5,
  arecaPalm,
  bird,
  boatRoof,
  BRICK,
  buffalo,
  coneRoof,
  domeHouse,
  granary,
  grown,
  riceClump,
  type Roof,
  roofFor,
  stiltHall,
  waterWheel,
} from '../src/render/buildings';
import { partScale, rod, yard } from '../src/render/congTrinh/chung';
import { CONG_TRINH, vienK } from '../src/render/congTrinh/index';
import { KHO_LOT } from '../src/render/congTrinh/kho';
import { NHA_SAN_LOT } from '../src/render/congTrinh/nhaSan';
import { addSunLights } from '../src/render/lights';
import { C } from '../src/render/palette';
import type { ShapeBuilder } from '../src/render/shapes';
import { inkThick, inkThin, ToonModel } from '../src/render/toon';

// ---------- Dùng chung ----------

/** Mô hình vật nhỏ viền mảnh. */
const nhoModel = () => new ToonModel(inkThin);
/** Mô hình phẳng: mọi khối vẽ bằng chất liệu thường, không hoa văn trống đồng trên vách, mái. */
function phang(ink = inkThick): ToonModel {
  const m = new ToonModel(ink);
  Object.assign(m, { band: m.plain, drum: m.plain });
  return m;
}
/** Bỏ viền mực của cả mô hình (lúa). */
function khongVien(g: THREE.Group): THREE.Group {
  for (const c of [...g.children]) {
    const mat = (c as THREE.Mesh).material;
    if (mat === inkThick || mat === inkThin) g.remove(c);
  }
  return g;
}
function gop(...gs: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const x of gs) g.add(x);
  return g;
}
/** Kiểu 2: mái theo cấp, bỏ dải đồng hoa văn cấp 9 (chim Lạc cấp 10 giữ). */
const mai2 = (level: number): Roof => ({ ...roofFor(level), pattern: false });
/** Kiểu 3: mái theo cấp, không dải đồng, không chim Lạc (cấp 10 đọc bằng chóp đồng to). */
const mai3 = (level: number): Roof => ({ ...roofFor(level), pattern: false, lac: false });
/** Phần phụ kiểu 2, 3: mái tranh, khỏi tranh màu ngói với khối chính. */
const TRANH: Roof = { main: C.thatch, dark: C.thatchDark, trim: null };

/** Mái tròn ít mặt (kiểu 3). */
function domeThap(b: ShapeBuilder, r: number, h: number, color: number, x: number, y: number, z: number): void {
  b.add(new THREE.SphereGeometry(1, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), color, x, y, z, [0, Math.PI / 8, 0], [r, h, r * 0.92]);
}
/** Vành mái và chóp đồng kiểu 3: vành theo màu viền của cấp; cấp 8 chóp đồng, cấp 10 chóp to hơn có quả cầu. */
function vanhChop(b: ShapeBuilder, roof: Roof, level: number, r: number, x: number, eaveY: number, topY: number, z: number): void {
  if (roof.trim !== null) b.add(new THREE.TorusGeometry(r, Math.max(0.035, r * 0.06), 4, 10), roof.trim, x, eaveY, z, [Math.PI / 2, 0, 0], [1, 0.92, 1]);
  if (level >= 8) {
    const big = level >= 10 ? 1.5 : 1;
    b.cone(0.1 * big, 0.26 * big, C.gold, x, topY + 0.1 * big, z, undefined, 6);
    if (level >= 10) b.sphere(0.08, C.gold, x, topY + 0.32, z, [1, 1, 1], 6);
  }
}
/** Nền đá kiểu 3 cấp 9 trở lên: cao `h`, rộng w × d. */
function nenDa(b: ShapeBuilder, w: number, d: number, h: number, x: number, z: number): void {
  b.box(w, h, d, C.rock, x, h / 2, z);
  b.box(w + 0.04, 0.04, d + 0.04, C.rockDark, x, h, z);
}

// ---------- Nhà sàn ----------

function nhaSan1(level: number): THREE.Group {
  const m = new ToonModel();
  const n = nhoModel();
  const p = m.plain;
  const q = n.plain;
  const L = NHA_SAN_LOT;
  const roof = roofFor(level);
  const up = above5(level);
  const s = partScale(level);
  const tall = 0.1 * up;
  yard(m, 3);
  const path = L.zone(',');
  p.box(path.w * 0.8, 0.03, path.d + 0.5, C.earth, path.x, 0.055, path.z - 0.25);
  const H = L.zone('H');
  const hx = H.x;
  const hz = H.z + 0.13;
  const mainS = 1.5 * s;
  let frontZ = hz + 0.425 * mainS;
  let floorY = 0.55 * mainS + tall;
  if (level <= 6) domeHouse(m, hx, hz, mainS, roof, tall);
  else if (level === 7) {
    stiltHall(m, { x: hx, z: hz, w: 1.65, d: 1.1, postH: 0.68 + tall, roofL: 2.05, roofW: 1.35, lift: 0.45, roof });
    frontZ = hz + 0.55;
    floorY = 0.68 + tall;
  } else {
    stiltHall(m, { x: hx, z: hz, w: 1.75, d: 1.15, postH: 0.72 + tall, roofL: 2.1, roofW: 1.4, lift: 0.8, roof });
    const top = 0.72 + tall + 0.68 + 1.4 * 0.4 + 0.8;
    if (!roof.lac) {
      bird(m, hx + 1.0, top, hz, 1, 0.65);
      bird(m, hx - 1.0, top, hz, -1, 0.65);
    }
    frontZ = hz + 0.575;
    floorY = 0.72 + tall;
  }
  if (level >= 2) {
    const E = L.zone('E');
    p.box(0.9, 0.06, 0.32, C.wood, E.x, floorY, frontZ + 0.14);
    const steps = 3 + up;
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / (steps + 1);
      q.box(0.32, 0.04, 0.1, C.woodDark, E.x, floorY - t * (floorY - 0.06), frontZ + 0.32 + t * 0.32);
    }
  }
  if (level >= 3) {
    const h = L.zone('h');
    if (level >= 10) stiltHall(m, { x: h.x + 0.05, z: h.z - 0.05, w: 0.72, d: 0.78, postH: 0.72 + tall, roofL: 0.95, roofW: 0.92, lift: 0.34, roof });
    else domeHouse(m, h.x + 0.05, h.z - 0.05, 0.75 + 0.05 * (Math.min(level, 5) - 3), roof, tall);
  }
  if (level >= 5) {
    const k = L.zone('k');
    domeHouse(m, k.x + 0.1, k.z + 0.12, 0.55, roof, tall * 0.5);
    if (level <= 6) bird(m, hx + 0.1, 0.55 * mainS + tall + 0.9 * mainS, hz + 0.05, 1, 0.6);
  }
  if (level >= 6) {
    const Q = L.zone('Q');
    arecaPalm(q, Q.x + 0.2, Q.z, 2.0 + 0.25 * up);
  }
  if (level >= 10) {
    const h = L.zone('h');
    const x0 = hx + 0.8;
    const x1 = h.x - 0.28;
    const cx = (x0 + x1) / 2;
    const cz = (hz + h.z - 0.05) / 2;
    p.box(x1 - x0 + 0.1, 0.05, 0.62, C.wood, cx, floorY - 0.01, cz);
    boatRoof(m, roof, { length: 0.82, width: 0.5, lift: 0.14, drop: 0.14, thickness: 0.04 }, cx, floorY + 0.68, cz, Math.PI / 2);
  }
  return gop(m.group(), n.group());
}

function nhaSan2(level: number): THREE.Group {
  const m = new ToonModel();
  const n = nhoModel();
  const p = m.plain;
  const roof = mai2(level);
  const up = above5(level);
  const s = partScale(level);
  const tall = 0.1 * up;
  yard(m, 3);
  p.box(0.6, 0.03, 1.0, C.earth, -0.25, 0.055, 1.0);
  const hx = -0.25;
  const hz = -0.3;
  let frontZ: number;
  let floorY: number;
  if (level <= 6) {
    const S = 1.75 * s;
    domeHouse(m, hx, hz, S, roof, tall);
    frontZ = hz + 0.425 * S;
    floorY = 0.55 * S + tall;
  } else {
    const lift = level >= 8 ? 0.8 : 0.5;
    stiltHall(m, { x: hx, z: hz, w: 1.95, d: 1.25, postH: 0.74 + tall, roofL: 2.45, roofW: 1.55, lift, roof });
    if (level >= 8 && !roof.lac) {
      const top = 0.74 + tall + 0.68 + 1.55 * 0.4 + lift;
      bird(m, hx + 1.18, top, hz, 1, 0.7);
      bird(m, hx - 1.18, top, hz, -1, 0.7);
    }
    frontZ = hz + 0.625;
    floorY = 0.74 + tall;
  }
  if (level >= 2) {
    p.box(1.0, 0.06, 0.34, C.wood, hx, floorY, frontZ + 0.15);
    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 4;
      n.plain.box(0.36, 0.05, 0.12, C.woodDark, hx, floorY - t * (floorY - 0.06), frontZ + 0.34 + t * 0.34);
    }
  }
  if (level >= 4) arecaPalm(n.plain, 1.1, -1.08, 1.7 + 0.12 * (Math.min(level, 5) - 4) + 0.25 * up);
  return gop(m.group(), n.group());
}

function nhaSan3(level: number): THREE.Group {
  const m = phang();
  const p = m.plain;
  const roof = mai3(level);
  const up = above5(level);
  yard(m, 3);
  p.box(0.6, 0.03, 0.8, C.earth, -0.2, 0.055, 1.1);
  const S = 1.75 * partScale(level) + 0.05 * up;
  const hx = -0.2;
  const hz = -0.3;
  const y0 = level >= 9 ? 0.16 : 0;
  if (y0) nenDa(p, 1.25 * S, 1.1 * S, y0, hx, hz);
  const postH = 0.5 * S + 0.08 * up;
  for (const dx of [-0.34, 0.34]) for (const dz of [-0.3, 0.3]) p.cyl(0.09, 0.1, postH, C.woodDark, hx + dx * S, y0 + postH / 2, hz + dz * S, undefined, 6);
  const fy = y0 + postH;
  p.box(1.0 * S, 0.1, 0.88 * S, C.wood, hx, fy, hz);
  p.cyl(0.42 * S, 0.45 * S, 0.34 * S, C.woodLight, hx, fy + 0.17 * S + 0.05, hz, undefined, 8);
  p.box(0.22 * S, 0.26 * S, 0.06, C.woodDark, hx, fy + 0.18 * S, hz + 0.43 * S);
  const eave = fy + 0.32 * S;
  domeThap(p, 0.66 * S, 0.62 * S, roof.main, hx, eave, hz);
  vanhChop(p, roof, level, 0.64 * S, hx, eave + 0.02, eave + 0.62 * S, hz);
  if (level >= 2) {
    // Thang gỗ đặc một khối từ sàn xuống sân.
    const z0 = hz + 0.44 * S;
    const z1 = z0 + 0.75;
    const len = Math.hypot(fy, z1 - z0);
    p.box(0.62, 0.08, len, C.woodLight, hx, fy / 2, (z0 + z1) / 2, [Math.atan2(fy, z1 - z0), 0, 0]);
  }
  return m.group();
}

// ---------- Kho thóc ----------

const DRY_YARD = 0xe2cb98;

/** Sân phơi phẳng: nền, lớp thóc vàng; `gach` lát gạch một tấm. */
function sanPhoi(b: ShapeBuilder, x: number, z: number, w: number, gach: boolean): void {
  b.box(w, 0.04, w, gach ? BRICK : DRY_YARD, x, 0.06, z);
  b.box(w - 0.26, 0.03, w - 0.26, C.ripe, x, 0.085, z);
}

function kho1(level: number): THREE.Group {
  const m = new ToonModel();
  const n = nhoModel();
  const p = m.plain;
  const q = n.plain;
  const L = KHO_LOT;
  const roof = roofFor(level);
  const up = above5(level);
  const tall = 0.12 * up;
  yard(m, 3);
  const path = L.zone(',');
  p.box(0.4, 0.03, 0.9, C.earth, path.x, 0.055, path.z - 0.2);
  const V = L.zone('V');
  const vx = V.x + 0.05;
  const vz = V.z + 0.05;
  const vs = 1.35 * partScale(level);
  const mound = 0.46 * vs;
  p.cyl(mound + 0.05, mound + 0.07, 0.08, C.rock, vx, 0.06, vz, undefined, 12);
  granary(m, vx, vz, vs, level >= 5, level >= 9 ? { ...roof, lac: false } : roof, tall);
  const floorY = 0.8 * vs + tall;
  if (level >= 9) {
    const neck = floorY + 1.0 * vs;
    m.band.cyl(0.17 * vs, 0.2 * vs, 0.2 * vs, C.woodLight, vx, neck + 0.1 * vs, vz, undefined, 10);
    coneRoof(m, roof, 0.36 * vs, 0.42 * vs, vx, neck + 0.2 * vs + 0.19 * vs, vz, 12);
  }
  if (level >= 2) {
    // Thang tre dựa sàn vựa (viền mảnh).
    const T = L.zone('T');
    const rimZ = vz + 0.42 * vs;
    const z0 = T.z + 0.05;
    const run = z0 - rimZ;
    const len = Math.hypot(run, floorY);
    const tilt = -Math.atan2(run, floorY);
    for (const sx of [-0.1, 0.1]) q.cyl(0.02, 0.02, len, C.bamboo, T.x + sx, floorY / 2, (z0 + rimZ) / 2, [tilt, 0, 0], 4);
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      q.box(0.22, 0.025, 0.035, C.bamboo, T.x, t * floorY, z0 - t * run);
    }
  }
  if (level >= 3) {
    const s = L.zone('s');
    sanPhoi(p, s.x + 0.02, s.z + 0.02, 1.38, level >= 7);
  }
  if (level >= 4) {
    const A = L.zone('4');
    if (level >= 8) {
      const hx = A.x + 0.1;
      const hz = A.z;
      const ph = 0.72;
      for (const dx of [-0.5, 0, 0.5]) for (const dz of [-0.28, 0.28]) p.cyl(0.045, 0.055, ph, C.woodDark, hx + dx, ph / 2, hz + dz, undefined, 6);
      p.box(1.2, 0.07, 0.72, C.wood, hx, ph, hz);
      m.band.box(1.0, 0.5, 0.56, C.woodLight, hx, ph + 0.28, hz);
      p.box(0.22, 0.34, 0.03, C.woodDark, hx - 0.2, ph + 0.2, hz + 0.29);
      const ry = ph + 0.78;
      boatRoof(m, roof, { length: 1.3, width: 0.92, lift: 0.45, drop: 0.32, thickness: 0.06 }, hx, ry, hz);
      if (!roof.lac) {
        bird(m, hx + 0.47, ry + 0.4, hz, 1, 0.42);
        bird(m, hx - 0.47, ry + 0.4, hz, -1, 0.42);
      }
    } else granary(m, A.x + 0.07, A.z, 0.9, false, roof, tall * 0.6);
  }
  if (level >= 6) {
    const c = L.zone('6');
    const ch = 0.6 + 0.12 * (up - 1);
    p.cyl(0.42, 0.44, 0.08, C.rock, c.x, 0.08, c.z, undefined, 12);
    if (level >= 10) {
      const fy = 0.3;
      for (const dx of [-0.26, 0.26]) for (const dz of [-0.26, 0.26]) p.cyl(0.04, 0.05, fy, C.woodDark, c.x + dx, fy / 2 + 0.08, c.z + dz, undefined, 6);
      p.box(0.7, 0.05, 0.7, C.wood, c.x, fy + 0.1, c.z);
      m.band.box(0.62, 0.56, 0.62, C.woodLight, c.x, fy + 0.4, c.z);
      boatRoof(m, roof, { length: 0.92, width: 0.86, lift: 0.22, drop: 0.28, thickness: 0.05 }, c.x, fy + 0.98, c.z);
    } else {
      m.band.cyl(0.37, 0.39, ch, C.thatch, c.x, 0.12 + ch / 2, c.z, undefined, 12);
      p.sphere(0.35, C.ripe, c.x, 0.12 + ch, c.z, [1, 0.4, 1], 10);
    }
  }
  return gop(m.group(), n.group());
}

function kho2(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = mai2(level);
  const up = above5(level);
  const tall = 0.12 * up;
  yard(m, 3);
  const vx = -0.4;
  const vz = -0.4;
  const vs = 1.65 * partScale(level);
  p.cyl(0.5 * vs, 0.53 * vs, 0.1, C.rock, vx, 0.06, vz, undefined, 12);
  granary(m, vx, vz, vs, level >= 5, level >= 9 ? { ...roof, lac: false } : roof, tall);
  if (level >= 9) {
    const neck = 0.8 * vs + tall + 1.0 * vs;
    m.band.cyl(0.17 * vs, 0.2 * vs, 0.2 * vs, C.woodLight, vx, neck + 0.1 * vs, vz, undefined, 10);
    coneRoof(m, roof, 0.36 * vs, 0.42 * vs, vx, neck + 0.2 * vs + 0.19 * vs, vz, 12);
  }
  // Sân phơi thóc trước bên phải (thấp, không mái).
  if (level >= 2) sanPhoi(p, 0.62, 0.62, 1.45, level >= 7);
  // Cót thóc thấp mái tranh góc sau bên phải từ cấp 5.
  if (level >= 5) {
    const cx = 0.95;
    const cz = -0.95;
    const ch = 0.5 + 0.08 * up;
    p.cyl(0.4, 0.42, 0.08, C.rock, cx, 0.08, cz, undefined, 12);
    m.band.cyl(0.35, 0.37, ch, C.thatch, cx, 0.12 + ch / 2, cz, undefined, 12);
    coneRoof(m, TRANH, 0.46, 0.32, cx, 0.12 + ch + 0.14, cz, 10);
  }
  return m.group();
}

function kho3(level: number): THREE.Group {
  const m = phang();
  const p = m.plain;
  const roof = mai3(level);
  const up = above5(level);
  yard(m, 3);
  const vx = -0.35;
  const vz = -0.35;
  const vs = 1.65 * partScale(level) + 0.05 * up;
  const y0 = level >= 9 ? 0.16 : 0;
  if (y0) nenDa(p, 1.2 * vs, 1.2 * vs, y0, vx, vz);
  const postH = 0.62 * vs + 0.08 * up;
  for (const dx of [-0.26, 0.26]) for (const dz of [-0.26, 0.26]) p.cyl(0.09, 0.1, postH, C.woodDark, vx + dx * vs, y0 + postH / 2, vz + dz * vs, undefined, 6);
  const fy = y0 + postH;
  p.cyl(0.44 * vs, 0.44 * vs, 0.08, C.wood, vx, fy, vz, undefined, 8);
  p.cyl(0.36 * vs, 0.38 * vs, 0.62 * vs, C.woodLight, vx, fy + 0.31 * vs + 0.04, vz, undefined, 8);
  const eave = fy + 0.62 * vs + 0.04;
  const rh = 0.66 * vs;
  p.cone(0.6 * vs, rh, roof.main, vx, eave + rh / 2, vz, undefined, 8);
  vanhChop(p, roof, level, 0.58 * vs, vx, eave + 0.02, eave + rh * 0.92, vz);
  if (level >= 2) sanPhoi(p, 0.62, 0.62, 1.45, level >= 7);
  return m.group();
}

// ---------- Bãi đất đá ----------

const DUST = 0xb89a6c;
const ROAD = 0xa4855a;
const CUT = 0xcdc2ad;
const PIT = { x0: -1.47, x1: 0.47, z0: -1.47, z1: -0.02, floorX0: -1.0, floorX1: 0.3, floorZ0: -1.0, floorZ1: -0.2 };
const TIERS = [
  { xR: 0.47, zB: -1.0, xL: -1.0, zF: -0.02 },
  { xR: 0.05, zB: -1.2, xL: -1.2, zF: -0.42 },
  { xR: -0.35, zB: -1.32, xL: -1.32, zF: -0.8 },
];

/** Hố đá bậc thang chữ L như hiện tại, không cỏ, không đá rơi, không bậc gỗ. */
function hoDa(p: ShapeBuilder, level: number): void {
  const up = above5(level);
  const deep = level >= 4;
  const tiers = deep ? 3 : 2;
  const th = (deep ? 0.22 : 0.18) + 0.06 * up;
  const rim = deep ? 0.26 : 0.12;
  const { x0, z0, floorX0, floorX1, floorZ0, floorZ1 } = PIT;
  for (let k = 0; k < tiers; k++) {
    const t = TIERS[k];
    const top = th * (k + 1);
    const color = k % 2 ? CUT : C.rock;
    p.box(t.xR - x0, top, t.zB - z0, color, (x0 + t.xR) / 2, top / 2, (z0 + t.zB) / 2);
    p.box(t.xL - x0, top, t.zF - t.zB, color, (x0 + t.xL) / 2, top / 2, (t.zB + t.zF) / 2);
  }
  p.box(floorX1 - floorX0, 0.03, floorZ1 - floorZ0, deep ? 0x5e544a : 0x8f6e4a, (floorX0 + floorX1) / 2, 0.04, (floorZ0 + floorZ1) / 2);
  p.box(PIT.x1 - floorX0, rim, PIT.z1 - floorZ1, C.rock, (floorX0 + PIT.x1) / 2, rim / 2, (floorZ1 + PIT.z1) / 2);
  p.box(PIT.x1 - floorX1, rim, floorZ1 - floorZ0, C.rock, (floorX1 + PIT.x1) / 2, rim / 2, (floorZ0 + floorZ1) / 2);
}

/** Chồng đá xẻ `n` khối ở (x, z), khối `w`. */
function chongDa(p: ShapeBuilder, x: number, z: number, n: number, w = 0.3): void {
  for (let i = 0; i < n; i++) p.box(w, w * 0.6, w * 0.85, i % 2 ? C.rock : CUT, x, 0.05 + w * 0.3 + i * w * 0.6, z);
}

/** Lán bốn cột mái thuyền theo `roof`. */
function lan(m: ToonModel, x: number, z: number, w: number, d: number, h: number, roof: Roof, postR = 0.03): void {
  for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) m.plain.cyl(postR, postR * 1.15, h, C.woodDark, x + dx, h / 2, z + dz, undefined, 5);
  boatRoof(m, roof, { length: w + 0.3, width: d + 0.24, lift: 0.14, drop: 0.18, thickness: 0.05 }, x, h + 0.2, z);
}

function baiDa1(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = roofFor(level);
  const up = above5(level);
  yard(m, 3, DUST);
  hoDa(p, level);
  p.box(0.8, 0.02, 1.0, ROAD, 0.25, 0.055, 0.95);
  p.sphere(0.22, C.rock, -0.85, 0.12, 0.3, [1.2, 0.7, 1], 6);
  if (level >= 2) {
    chongDa(p, 0.97, 0.25, 3 + up);
    chongDa(p, 1.31, 0.25, 2 + up);
  }
  if (level >= 6) lan(m, 1.07, -0.78, 0.6, 0.44, 0.9, roof);
  if (level >= 7) {
    const kx = -0.9;
    const kz = 0.95;
    p.cyl(0.38, 0.4, 0.16, C.earthDark, kx, 0.08, kz, undefined, 12);
    m.band.add(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), BRICK, kx, 0.15, kz, [0, 0, 0], [0.36, 0.44, 0.36]);
    p.box(0.22, 0.2, 0.1, 0x2a1d12, kx, 0.25, kz + 0.32);
    m.glow.box(0.15, 0.08, 0.03, C.fire, kx, 0.2, kz + 0.37);
    p.cyl(0.07, 0.09, 0.66, C.earthDark, kx + 0.12, 0.72, kz - 0.2, undefined, 8);
  }
  return m.group();
}

function baiDa2(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const roof = mai2(level);
  const up = above5(level);
  yard(m, 3, DUST);
  hoDa(p, Math.max(level, 4));
  p.box(0.8, 0.02, 1.0, ROAD, 0.25, 0.055, 0.95);
  // Một chồng đá xẻ to trước bên phải, cao dần theo cấp.
  chongDa(p, 1.05, 0.75, 1 + Math.min(level, 5) / 2.5 + up, 0.42);
  // Lán chứa đá mái theo cấp sau bên phải, từ cấp 3; to dần.
  if (level >= 3) {
    const k = 0.85 + 0.05 * Math.min(level, 5);
    lan(m, 1.0, -0.75, 0.55 * k, 0.62 * k, 0.75 + 0.08 * up, roof, 0.045);
  }
  return m.group();
}

function baiDa3(level: number): THREE.Group {
  const m = phang();
  const p = m.plain;
  const roof = mai3(level);
  const up = above5(level);
  yard(m, 3, DUST);
  // Gò đá ba bậc khối to góc sau bên trái.
  const th = 0.24 + 0.05 * up;
  const bac = [
    [2.0, 1.6, -0.5, -0.67],
    [1.45, 1.15, -0.77, -0.9],
    [0.9, 0.7, -1.02, -1.1],
  ] as const;
  for (const [i, [w, d, x, z]] of bac.slice(0, level >= 4 ? 3 : 2).entries()) p.box(w, th, d, i % 2 ? CUT : C.rock, x, th * (i + 0.5), z);
  p.box(0.8, 0.02, 1.0, ROAD, 0.25, 0.055, 0.95);
  chongDa(p, 1.05, 0.75, 1 + Math.min(level, 5) / 2.5 + up, 0.46);
  if (level >= 3) {
    const k = 0.85 + 0.05 * Math.min(level, 5);
    const x = 1.0;
    const z = -0.75;
    const h = 0.75 + 0.08 * up;
    for (const dx of [-0.3 * k, 0.3 * k]) for (const dz of [-0.32 * k, 0.32 * k]) p.cyl(0.07, 0.08, h, C.woodDark, x + dx, h / 2, z + dz, undefined, 5);
    p.cone(0.62 * k, 0.5, roof.main, x, h + 0.25, z, [0, Math.PI / 4, 0], 4);
    vanhChop(p, roof, level, 0.45 * k, x, h + 0.02, h + 0.48, z);
  }
  return m.group();
}

// ---------- Ruộng lúa ----------

const EDGE = 1.98;
const RIM = 1.8;
const DYKE = 0.08;

/** Màu lúa theo cấp: non xanh tới chín vàng. */
const luaMau = (level: number) => (level <= 2 ? 0x8fae4a : level <= 4 ? 0xb3b84a : C.ripe);

/** Nước, bờ ngoài (cấp 6 kè đá), bờ chữ thập. */
function nenRuong(p: ShapeBuilder, level: number, bank: number, bw = EDGE - RIM): void {
  p.box(2 * RIM, 0.04, 2 * RIM, C.paddyWater, 0, 0.05, 0);
  const outer = level >= 6 ? C.rock : C.soil;
  const bc = EDGE - bw / 2;
  for (const s of [-1, 1]) {
    p.box(2 * EDGE, bank, bw, outer, 0, bank / 2, s * bc);
    p.box(bw, bank, 2 * EDGE - 2 * bw, outer, s * bc, bank / 2, 0);
  }
  for (const s of [-1, 1]) {
    p.box(2 * DYKE, bank * 0.85, RIM, C.soil, 0, (bank * 0.85) / 2, (s * RIM) / 2);
    p.box(RIM, bank * 0.85, 2 * DYKE, C.soil, (s * RIM) / 2, (bank * 0.85) / 2, 0);
  }
}

/** Chòi canh ruộng đơn giản trên gò: bốn cột, sàn, mái nón. */
function choi(m: ToonModel, x: number, z: number, y0: number, level: number, roof: Roof, tho = false): void {
  const p = m.plain;
  const up = above5(level);
  const ph = 0.55 + 0.18 * up;
  const r = tho ? 0.05 : 0.035;
  for (const dx of [-0.26, 0.26]) for (const dz of [-0.26, 0.26]) p.cyl(r, r * 1.2, ph + 0.4, C.woodDark, x + dx, y0 + (ph + 0.4) / 2, z + dz, undefined, 5);
  p.box(0.7, 0.07, 0.7, C.wood, x, y0 + ph, z);
  const rh = 0.4 + 0.06 * up;
  if (tho) {
    p.cone(0.6, rh, roof.main, x, y0 + ph + 0.4 + rh / 2 - 0.02, z, undefined, 6);
    vanhChop(p, roof, level, 0.56, x, y0 + ph + 0.4, y0 + ph + 0.4 + rh, z);
  } else coneRoof(m, roof, 0.56, rh, x, y0 + ph + 0.4 + rh / 2 - 0.02, z, 6);
}

function goDat(p: ShapeBuilder, x0: number, z0: number, x1: number, z1: number, h: number): void {
  p.box(x1 - x0, h, z1 - z0, C.soil, (x0 + x1) / 2, h / 2, (z0 + z1) / 2);
}

function ruong1(level: number): THREE.Group {
  const m = new ToonModel(inkThin);
  const lua = new ToonModel();
  const p = m.plain;
  const roof = roofFor(level);
  const lv = grown(level);
  const up = above5(level);
  const bank = 0.12 + lv * 0.02;
  nenRuong(p, level, bank);
  // Lúa: 3 × 3 khóm mỗi thửa (hiện tại 4 × 4), không viền mực.
  const h = 0.16 + lv * 0.075 + 0.04 * up;
  const step = (RIM - DYKE) / 3;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const x = sx * (DYKE + step * (i + 0.5));
          const z = sz * (DYKE + step * (j + 0.5));
          // Góc có phần dựng thì không cấy.
          const goc = (sx < 0 && sz < 0 && level >= 4) || (sx > 0 && sz < 0 && level >= 7) || (sx < 0 && sz > 0 && level >= 6) || (sx > 0 && sz > 0 && level >= 3);
          if (goc && i === 2 && j === 2) continue;
          if (level >= 8 && i === 0 && j === 0) continue;
          riceClump(lua.plain, x, z, h, lv, level, i * 1.7 + j);
        }
      }
    }
  }
  if (level >= 3) {
    goDat(p, 1.1, 1.1, EDGE, EDGE, bank);
    p.frame = new THREE.Matrix4().compose(new THREE.Vector3(1.5, bank, 1.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2 - 0.25, 0)), new THREE.Vector3(1, 1, 1));
    buffalo(p, 0, 0);
    p.frame = null;
  }
  if (level >= 4) {
    goDat(p, -EDGE, -EDGE, -1.1, -1.1, bank);
    choi(m, -1.5, -1.5, bank, level, roof);
  }
  const extra: THREE.Object3D[] = [];
  if (level >= 6) {
    goDat(p, -EDGE, 1.1, -1.1, EDGE, bank);
    const wheel = waterWheel();
    wheel.position.set(-1.5, 0.62, 1.5);
    wheel.scale.setScalar(1.1);
    extra.push(wheel);
  }
  if (level >= 7) {
    goDat(p, 1.1, -EDGE, EDGE, -1.1, bank);
    m.band.box(0.5, 0.4, 0.4, C.red, 1.5, bank + 0.2, -1.55);
    boatRoof(m, roof, { length: 0.9, width: 0.74, lift: 0.26, drop: 0.26, thickness: 0.05 }, 1.5, bank + 0.66, -1.55);
  }
  if (level >= 8) {
    p.cyl(0.5, 0.54, bank, C.rock, 0, bank / 2, 0, undefined, 16);
    p.cyl(0.43, 0.43, 0.03, 0x4f8f96, 0, bank - 0.005, 0, undefined, 16);
  }
  return gop(m.group(), khongVien(lua.group()), ...extra);
}

/** Luống lúa: mỗi thửa ba dải dài nổi khỏi nước, không viền mực. */
function luong(b: ShapeBuilder, level: number, h: number, bo: (sx: number, sz: number) => boolean): void {
  const w = RIM - DYKE;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      if (bo(sx, sz)) continue;
      const cx = (sx * (RIM + DYKE)) / 2;
      for (let k = 0; k < 3; k++) {
        const z = sz * (DYKE + (w / 3) * (k + 0.5));
        b.box(w - 0.2, h, w / 3 - 0.14, luaMau(level), cx, 0.05 + h / 2, z);
      }
    }
  }
}

function ruong2(level: number): THREE.Group {
  const m = new ToonModel(inkThin);
  const lua = new ToonModel();
  const p = m.plain;
  const roof = mai2(level);
  const lv = grown(level);
  const bank = 0.12 + lv * 0.02;
  nenRuong(p, level, bank);
  const h = 0.06 + lv * 0.035;
  luong(lua.plain, level, h, (sx, sz) => level < 2 && sz > 0);
  if (level >= 3) {
    goDat(p, -EDGE, -EDGE, -1.0, -1.0, bank + 0.04);
    choi(m, -1.45, -1.45, bank + 0.04, level, roof);
  }
  return gop(m.group(), khongVien(lua.group()));
}

function ruong3(level: number): THREE.Group {
  const m = phang(inkThin);
  const p = m.plain;
  const roof = mai3(level);
  const lv = grown(level);
  const bank = 0.16 + lv * 0.02;
  // Bờ to hơn: mỗi thửa một tấm lúa liền, khe nước mỏng quanh tấm.
  const bw = 0.26;
  nenRuong(p, level, bank, bw);
  const inner = EDGE - bw;
  const w = inner - DYKE - 0.12;
  const lua = phang();
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      if (level < 2 && sz > 0) continue;
      if (level >= 3 && sx < 0 && sz < 0) continue;
      const c = (inner + DYKE) / 2;
      lua.plain.box(w, 0.05 + lv * 0.03, w, luaMau(level), sx * c, 0.07 + (lv * 0.03) / 2, sz * c);
    }
  }
  if (level >= 3) {
    goDat(p, -inner, -inner, -DYKE, -DYKE, bank);
    choi(m, -0.95, -0.95, bank, level, roof, true);
  }
  return gop(m.group(), khongVien(lua.group()));
}

// ---------- Chụp ----------

export const MAU: Record<string, { ten: string; type: BuildingType; kieu: ((level: number) => THREE.Group)[] }> = {
  nhaSan: { ten: 'Nhà sàn', type: 'nhaSan', kieu: [nhaSan1, nhaSan2, nhaSan3] },
  kho: { ten: 'Kho thóc', type: 'kho', kieu: [kho1, kho2, kho3] },
  baiDa: { ten: 'Bãi đất đá', type: 'baiDa', kieu: [baiDa1, baiDa2, baiDa3] },
  ruong: { ten: 'Ruộng lúa', type: 'ruong', kieu: [ruong1, ruong2, ruong3] },
};

/** Mô hình kiểu `k` (0 là hiện tại) đặt vừa móng như `lotModel`. */
function dung(loai: string, k: number, level: number): THREE.Group {
  const mau = MAU[loai];
  const v = CONG_TRINH[mau.type]!;
  const g = k === 0 ? v.make(level) : mau.kieu[k - 1](level);
  g.scale.multiplyScalar((BUILDINGS[mau.type].w / v.tiles) * vienK(mau.type));
  return g;
}

const AZ = Math.PI / 4;
const EL = THREE.MathUtils.degToRad(38);

function nen(size: number, lots: { x: number; z: number; tiles: number }[]): THREE.Group {
  const g = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), new THREE.MeshLambertMaterial({ color: C.grass[0] }));
  grass.position.y = -0.1;
  grass.receiveShadow = true;
  g.add(grass);
  for (const l of lots) {
    const a = l.tiles / 2;
    const c: [number, number][] = [[-a, -a], [a, -a], [a, a], [-a, a], [-a, -a]];
    const pts: number[] = [];
    for (let i = 0; i < 4; i++) pts.push(l.x + c[i][0], 0.01, l.z + c[i][1], l.x + c[i + 1][0], 0.01, l.z + c[i + 1][1]);
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x6a5a3a, transparent: true, opacity: 0.35 })));
  }
  return g;
}

let renderer: THREE.WebGLRenderer | null = null;
function ve(scene: THREE.Scene, w: number, h: number, half: number, target: THREE.Vector3, ratio = 1): string {
  if (!renderer) {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }
  renderer.setPixelRatio(ratio);
  renderer.setSize(w, h);
  const aspect = w / h;
  const cam = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 200);
  cam.position.set(Math.cos(EL) * Math.sin(AZ), Math.sin(EL), Math.cos(EL) * Math.cos(AZ)).multiplyScalar(60).add(target);
  cam.lookAt(target);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

function canh(extent: number): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.sky);
  addSunLights(scene, extent, 2048);
  return scene;
}

/** Ảnh từng kiểu (0 hiện tại, 1–3) ở từng cấp của một loại, nhìn gần (`px` điểm ảnh mỗi ô). */
export function chupLoai(loai: string, caps: number[], px = 46): string[][] {
  const t = BUILDINGS[MAU[loai].type].w;
  const half = t * 0.62 + 0.9;
  const h = Math.round(2 * half * px);
  const w = Math.round(h * 1.1);
  const out: string[][] = [];
  for (let k = 0; k <= 3; k++) {
    const row: string[] = [];
    for (const level of caps) {
      const scene = canh(t + 2);
      scene.add(nen(t + 4, [{ x: 0, z: 0, tiles: t }]));
      scene.add(dung(loai, k, level));
      row.push(ve(scene, w, h, half, new THREE.Vector3(0, t * 0.25, 0)));
    }
    out.push(row);
  }
  return out;
}

/**
 * Một góc kinh đô ở độ phóng mặc định trên điện thoại (chừng 15 điểm CSS mỗi ô, ảnh mật độ 2): ba nhà sàn, kho, bãi đá,
 * hai ruộng, cách nhau một ô đường đất. Trả ảnh hiện tại và ba kiểu ở cấp `level`.
 */
export function chupCum(level: number): string[] {
  const cho: { loai: string; x: number; z: number }[] = [
    { loai: 'ruong', x: -6, z: -6 },
    { loai: 'nhaSan', x: -1.5, z: -5.5 },
    { loai: 'nhaSan', x: 2.5, z: -5.5 },
    { loai: 'kho', x: -5.5, z: -1.5 },
    { loai: 'nhaSan', x: -1.5, z: -1.5 },
    { loai: 'baiDa', x: 2.5, z: -1.5 },
    { loai: 'ruong', x: -6, z: 3 },
    { loai: 'nhaSan', x: -1.5, z: 2.5 },
    { loai: 'kho', x: 2.5, z: 2.5 },
  ];
  const out: string[] = [];
  const half = 7.4;
  const px = 15;
  for (let k = 0; k <= 3; k++) {
    const scene = canh(18);
    scene.add(nen(30, cho.map((c) => ({ x: c.x, z: c.z, tiles: BUILDINGS[MAU[c.loai].type].w }))));
    // Đường đất một ô giữa các móng.
    const duong = new THREE.MeshLambertMaterial({ color: 0xb89466 });
    for (const v of [-3.5, 0.5]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 13), duong);
      a.position.set(v, 0.01, -1.5);
      const b = new THREE.Mesh(new THREE.BoxGeometry(12, 0.02, 0.9), duong);
      b.position.set(-2, 0.01, v);
      scene.add(a, b);
    }
    for (const c of cho) {
      const g = dung(c.loai, k, level);
      g.position.set(c.x, 0, c.z);
      scene.add(g);
    }
    out.push(ve(scene, Math.round(2 * half * px * 1.25), Math.round(2 * half * px), half, new THREE.Vector3(-2, 0.6, -1.5), 2));
  }
  return out;
}
