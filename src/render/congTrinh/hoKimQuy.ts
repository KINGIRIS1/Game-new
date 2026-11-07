// Hồ Kim Quy 8×8: hồ lớn nơi thần Kim Quy trú ngụ. Giữa hồ có gò, trên gò là miếu thờ thần mái thuyền lợp ngói viền
// đồng, chim Lạc hai đầu nóc; cầu gỗ son cong vồng nối gò với bờ trước; lối đá từ cầu ra cổng hai cột chim Lạc, hai
// trống đồng trên giá, cờ đỏ cờ vàng. Cây đa cổ thụ góc sau bên trái xòe tán xuống mặt hồ, bụi tre góc sau bên phải,
// lau sậy dọc bờ sau, sen nở ven bờ. Rùa Vàng bơi vòng quanh gò (`userData.swim`, World cho bơi). Bản vẽ ở
// docs/bo-cuc-cong-trinh.md. Một cấp, dựng một lần như các đền.
// Bờ hồ vẽ theo đúng các ô con của mặt nước trong bản vẽ (`lakeOutline`), làm tròn cho mềm.

import * as THREE from 'three';
import { makeRuaVang } from '../beasts';
import { banner, boatRoof, drum, lacBird, TILE, TILE_DARK, type Roof } from '../buildings';
import { decorModel } from '../decor';
import { CELL, Lot } from '../lot';
import { C } from '../palette';
import { ShapeBuilder, seeded } from '../shapes';
import { ToonModel, toon } from '../toon';
import { type CongTrinh, type LotSpot, rod } from './chung';

export const HO_KIM_QUY_LOT = new Lot(8, [
  'TTTT.LLLLLLL.BBB',
  'TTTT~~~~~~~~~BBB',
  'TTTT~~~~~~~SS~..',
  'TTTT~~~~~~~SS~~.',
  '.~~~~GGGGGG~~~~.',
  '.~~~~GMMMMG~~~~.',
  '.~~~~GMMMMG~~SS.',
  '.~~~~GMMMMG~~SS.',
  '.~~~~GGGGGG~~SS.',
  '.SS~~GGGGGG~~~~.',
  '.SS~~~~CC~~~~~~.',
  '..~~~~~CC~~~~~..',
  '...~~~~CC~~~~...',
  '.F.....,,.....F.',
  '.DD..7.,,.7..DD.',
  '.DD..7.,,.7..DD.',
]);

/** Ô con thuộc mặt hồ: nước, gò, miếu, sen, cầu (cầu bắc trên mặt nước). */
const LAKE_CELLS = '~GMSC';

/** Cỏ trong khuôn viên hồ: xanh đậm hơn cỏ ngoài cho thấy ranh móng. */
const LAWN = 0x93a85a;
/** Mặt hồ ven bờ và lòng hồ sâu. */
const WATER = 0x5aa6bc;
const WATER_DEEP = 0x3f8aa2;
const RIPPLE = 0xa9d8e6;
const LOTUS_LEAF = [0x4f7f34, 0x5f9040, 0x46722e];
const LOTUS = 0xf0a0b8;
const LOTUS_LIGHT = 0xf8d0dc;
/** Mặt nước (tọa độ móng): thấp hơn mép kè đá. */
export const LAKE_WATER_Y = 0.07;
const RIM_Y = 0.1;
/** Mặt gò giữa hồ, nền đá miếu, sàn miếu. */
const MOUND_Y = 0.32;
const BASE_Y = MOUND_Y + 0.14;

/** Mái miếu thờ thần: ngói đất nung, sống và diềm bọc đồng vàng, chim Lạc hai đầu nóc. */
const SHRINE_ROOF: Roof = { main: TILE, dark: TILE_DARK, trim: C.gold, lac: true };

/**
 * Đường bờ hồ (tọa độ x, z của móng, chạy một vòng): viền ngoài của các ô con mặt hồ (ký tự trong `cells`) trong bản
 * vẽ, làm mượt bậc thang (trung bình điểm kề nhau vài lượt) rồi bo góc (Chaikin). Đường mượt lùi vào trong ô con chừng
 * nửa ô con. Đền Rồng Tiên dùng lại cho hồ của mình.
 */
export function lakeOutline(lot: Lot = HO_KIM_QUY_LOT, cells = LAKE_CELLS): THREE.Vector2[] {
  const n = lot.n;
  const inLake = (i: number, j: number) => i >= 0 && j >= 0 && i < n && j < n && cells.includes(lot.rows[j][i]);
  // Cạnh ô con giáp ngoài hồ, đi theo chiều kim đồng hồ (nhìn từ trên, x sang phải, z xuống dưới): mặt hồ bên phải.
  const next = new Map<string, [number, number]>();
  const key = (i: number, j: number) => `${i},${j}`;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (!inLake(i, j)) continue;
      if (!inLake(i, j - 1)) next.set(key(i, j), [i + 1, j]);
      if (!inLake(i + 1, j)) next.set(key(i + 1, j), [i + 1, j + 1]);
      if (!inLake(i, j + 1)) next.set(key(i + 1, j + 1), [i, j + 1]);
      if (!inLake(i - 1, j)) next.set(key(i, j + 1), [i, j]);
    }
  }
  const [start] = next.keys();
  const loop: THREE.Vector2[] = [];
  let at = start;
  do {
    const [i, j] = at.split(',').map(Number);
    loop.push(new THREE.Vector2(-lot.tiles / 2 + i * CELL, -lot.tiles / 2 + j * CELL));
    const to = next.get(at)!;
    at = key(to[0], to[1]);
  } while (at !== start && loop.length <= 4 * n * n);
  // Làm mượt bậc thang: mỗi điểm về trung bình với hai điểm kề.
  let pts = loop;
  for (let k = 0; k < 3; k++) pts = pts.map((p, i) => p.clone().multiplyScalar(0.5).addScaledVector(pts[(i + pts.length - 1) % pts.length], 0.25).addScaledVector(pts[(i + 1) % pts.length], 0.25));
  // Bo góc.
  for (let k = 0; k < 2; k++) {
    const out: THREE.Vector2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out.push(a.clone().lerp(b, 0.25), a.clone().lerp(b, 0.75));
    }
    pts = out;
  }
  return pts;
}

/** Đường `pts` nới ra (`d` > 0) hay thu vào (`d` < 0) theo pháp tuyến từng điểm. */
export function offset(pts: THREE.Vector2[], d: number): THREE.Vector2[] {
  // Đường chạy theo chiều kim đồng hồ trên mặt x, z (diện tích có dấu âm theo công thức thường): pháp tuyến ra ngoài
  // của đoạn (dx, dz) là (dz, −dx) khi diện tích dương, (−dz, dx) khi âm.
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  const s = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const t = pts[(i + 1) % pts.length].clone().sub(pts[(i + pts.length - 1) % pts.length]).normalize();
    return new THREE.Vector2(p.x + s * t.y * d, p.y - s * t.x * d);
  });
}

/** Khối dẹt theo đường `pts` (x, z), dày `h`, đáy ở `y`; có `hole` thì khoét lỗ theo đường ấy (thành một vành). */
export function slab(b: ShapeBuilder, pts: THREE.Vector2[], h: number, y: number, color: number, hole?: THREE.Vector2[]): void {
  // Hình phẳng dựng trên mặt (x, −z) rồi xoay nằm xuống: chiều dày lên +y.
  const flip = (list: THREE.Vector2[]) => list.map((p) => new THREE.Vector2(p.x, -p.y));
  const shape = new THREE.Shape(flip(pts));
  if (hole) shape.holes.push(new THREE.Path(flip(hole)));
  b.add(new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 }), color, 0, y, 0, [-Math.PI / 2, 0, 0]);
}

/** Điểm trên đường `pts` cách đều nhau chừng `step` (dùng rải đá kè, lau sậy theo bờ). */
export function along(pts: THREE.Vector2[], step: number): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  let carry = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = a.distanceTo(b);
    let t = carry;
    while (t < len) {
      out.push(a.clone().lerp(b, t / len));
      t += step;
    }
    carry = t - len;
  }
  return out;
}

/** Bờ kè đá quanh hồ, mặt nước, lòng hồ sâu sẫm màu, gợn sóng. */
function lake(m: ToonModel, flat: ShapeBuilder): THREE.Vector2[] {
  const p = m.plain;
  const shore = lakeOutline();
  // Kè đá: viền đá nới ra ngoài mặt nước, cao hơn mặt nước một chút.
  slab(p, offset(shore, 0.16), RIM_Y - 0.02, 0.02, C.rock, shore);
  slab(p, shore, LAKE_WATER_Y - 0.03, 0.03, WATER);
  // Lòng hồ sâu và gợn sóng: không viền mực.
  slab(flat, offset(shore, -0.55), 0.004, LAKE_WATER_Y, WATER_DEEP);
  const rand = seeded(1257);
  for (const s of along(offset(shore, 0.12), 0.34)) {
    const big = rand() < 0.3;
    p.sphere(big ? 0.11 : 0.075, rand() < 0.5 ? C.rock : C.rockDark, s.x, RIM_Y, s.y, [1.3, big ? 0.6 : 0.5, 1.1], 6);
  }
  for (const [x, z, r] of [
    [-2.6, -1.2, 0.22],
    [2.3, 0.6, 0.18],
    [-1.9, 1.7, 0.16],
    [1.6, -2.6, 0.2],
  ] as const) {
    flat.add(new THREE.TorusGeometry(r, 0.012, 3, 18), RIPPLE, x, LAKE_WATER_Y + 0.006, z, [Math.PI / 2, 0, 0], [1, 0.75, 1]);
    flat.add(new THREE.TorusGeometry(r * 0.55, 0.01, 3, 14), RIPPLE, x, LAKE_WATER_Y + 0.006, z, [Math.PI / 2, 0, 0], [1, 0.75, 1]);
  }
  return shore;
}

/** Gò giữa hồ: đất đắp viền đá, mặt cỏ, nền đá cho miếu, bậc đá xuống chân cầu. */
function islet(m: ToonModel): void {
  const p = m.plain;
  const G = HO_KIM_QUY_LOT.zone('G');
  const rx = G.w / 2 - 0.12;
  const rz = G.d / 2 - 0.12;
  // Chân gò đất bầu dục nhô khỏi mặt nước.
  p.add(new THREE.CylinderGeometry(1, 1.06, 0.2, 24), C.earthDark, G.x, LAKE_WATER_Y + 0.02, G.z, [0, 0, 0], [rx, 1, rz]);
  p.add(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), C.grass[0], G.x, LAKE_WATER_Y + 0.08, G.z, [0, 0, 0], [rx - 0.06, MOUND_Y - LAKE_WATER_Y - 0.06, rz - 0.06]);
  // Đá viền chân gò.
  const rand = seeded(73);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    p.sphere(0.09 + rand() * 0.05, i % 3 ? C.rock : C.rockDark, G.x + Math.cos(a) * rx, LAKE_WATER_Y + 0.07, G.z + Math.sin(a) * rz, [1.3, 0.6, 1.1], 6);
  }
  // Nền đá cho miếu, viền đồng; bậc đá xuống phía cầu.
  const M = HO_KIM_QUY_LOT.zone('M');
  p.box(M.w + 0.1, BASE_Y - MOUND_Y + 0.12, M.d + 0.1, C.rockDark, M.x, MOUND_Y + (BASE_Y - MOUND_Y - 0.12) / 2 + 0.06, M.z);
  p.box(M.w + 0.16, 0.04, M.d + 0.16, C.gold, M.x, BASE_Y + 0.01, M.z);
  for (let i = 0; i < 3; i++) p.box(0.62 - i * 0.06, 0.06, 0.16, C.rock, M.x, BASE_Y - 0.05 - i * 0.07, M.z + M.d / 2 + 0.13 + i * 0.15);
}

/**
 * Miếu thờ thần Kim Quy trên gò: bốn cột son trên nền đá, vách gỗ có dải hoa văn, cửa giữa có mặt trống đồng trên
 * trán, mái thuyền lợp ngói viền đồng vàng, chim Lạc hai đầu nóc. Trước miếu: đỉnh đồng ba chân, hai cờ nhỏ.
 */
function shrine(m: ToonModel): void {
  const p = m.plain;
  const M = HO_KIM_QUY_LOT.zone('M');
  const x = M.x;
  const z = M.z - 0.08;
  const w = 1.3;
  const d = 0.86;
  const colH = 0.62;
  for (const cx of [-w / 2 + 0.08, w / 2 - 0.08]) {
    for (const cz of [-d / 2 + 0.08, d / 2 - 0.08]) {
      p.cyl(0.07, 0.08, 0.06, C.rockDark, x + cx, BASE_Y + 0.03, z + cz, undefined, 8);
      p.cyl(0.05, 0.058, colH, C.red, x + cx, BASE_Y + colH / 2, z + cz, undefined, 8);
    }
  }
  p.box(w + 0.06, 0.06, d + 0.06, C.wood, x, BASE_Y + 0.05, z);
  m.band.box(w - 0.24, colH - 0.1, d - 0.22, C.woodLight, x, BASE_Y + colH / 2 + 0.03, z);
  // Cửa giữa tối, mặt trống đồng trên trán cửa.
  p.box(0.32, 0.36, 0.03, 0x22140c, x, BASE_Y + 0.26, z + d / 2 - 0.1);
  m.drum.cyl(0.11, 0.11, 0.03, 0xffffff, x, BASE_Y + colH - 0.06, z + d / 2 - 0.1, [Math.PI / 2, 0, 0], 14);
  p.box(w + 0.08, 0.06, d + 0.08, C.red, x, BASE_Y + colH, z);
  boatRoof(m, SHRINE_ROOF, { length: w + 0.55, width: d + 0.5, lift: 0.3, drop: 0.32, thickness: 0.06 }, x, BASE_Y + colH + 0.34, z);
  // Đỉnh đồng ba chân trước miếu, khói hương là chấm sáng nhỏ.
  const fz = M.z + M.d / 2 - 0.12;
  p.cyl(0.11, 0.08, 0.12, C.bronze, x, BASE_Y + 0.14, fz, undefined, 10);
  p.cyl(0.125, 0.125, 0.02, C.bronzeLight, x, BASE_Y + 0.2, fz, undefined, 10);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    p.cyl(0.014, 0.014, 0.1, C.bronzeDark, x + Math.cos(a) * 0.07, BASE_Y + 0.06, fz + Math.sin(a) * 0.07, undefined, 4);
  }
  m.glow.sphere(0.025, 0xffd04d, x, BASE_Y + 0.25, fz, [1, 1, 1], 6);
  for (const sx of [-1, 1]) {
    p.cyl(0.018, 0.02, 0.9, C.woodDark, x + sx * (w / 2 + 0.12), BASE_Y + 0.45, z + d / 2 + 0.06, undefined, 5);
    m.band.box(0.03, 0.42, 0.18, sx < 0 ? C.red : C.gold, x + sx * (w / 2 + 0.12), BASE_Y + 0.66, z + d / 2 + 0.16);
  }
}

/** Cầu gỗ son cong vồng từ chân gò ra bờ trước: ván lát theo vòm, cột chống xuống nước, lan can son. */
function bridge(p: ShapeBuilder): void {
  const Cz = HO_KIM_QUY_LOT.zone('C');
  const G = HO_KIM_QUY_LOT.zone('G');
  const z0 = G.z + G.d / 2 - 0.32;
  const z1 = Cz.z + Cz.d / 2 + 0.3;
  const x = Cz.x;
  const half = 0.26;
  const rise = 0.32;
  const deckAt = (t: number) => ({ z: z0 + (z1 - z0) * t, y: (t < 0.08 ? MOUND_Y - 0.02 : RIM_Y + 0.02) + rise * Math.sin(Math.PI * t) });
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = deckAt(i / n);
    const b = deckAt((i + 1) / n);
    const tilt = Math.atan2(b.y - a.y, b.z - a.z);
    p.box(half * 2, 0.04, Math.hypot(b.z - a.z, b.y - a.y) + 0.01, i % 2 ? C.woodLight : C.wood, x, (a.y + b.y) / 2, (a.z + b.z) / 2, [-tilt, 0, 0]);
  }
  // Cột chống và lan can hai bên.
  for (const sx of [-1, 1]) {
    const rail: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const a = deckAt(t);
      rail.push(new THREE.Vector3(x + sx * half, a.y + 0.2, a.z));
      p.cyl(0.018, 0.02, 0.22, C.red, x + sx * half, a.y + 0.1, a.z, undefined, 5);
      if (i > 0 && i < 6) rod(p, [x + sx * (half - 0.04), a.y - 0.02, a.z], [x + sx * (half - 0.04), LAKE_WATER_Y - 0.05, a.z], 0.025, C.woodDark, 5);
    }
    p.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 16, 0.018, 5), C.red, 0, 0, 0);
  }
}

/** Lối đá từ chân cầu ra cổng: từng phiến đá lát. */
function path(p: ShapeBuilder): void {
  const P = HO_KIM_QUY_LOT.zone(',');
  const rows = 6;
  for (let i = 0; i < rows; i++) {
    const z = P.z - P.d / 2 + (i + 0.5) * (P.d / rows);
    p.box(P.w - 0.12, 0.03, P.d / rows - 0.06, i % 2 ? C.rock : 0xb3a895, P.x, 0.055, z);
  }
}

/** Cổng hai cột chim Lạc ở hai ô `7` của bản vẽ: cột gỗ đai đồng, xà son, chim Lạc dang cánh trên đầu cột. */
export function gate(m: ToonModel, lot: Lot = HO_KIM_QUY_LOT): void {
  const p = m.plain;
  const posts = lot.groups('7');
  const h = 1.15;
  for (const g of posts) {
    p.cyl(0.08, 0.1, 0.08, C.rockDark, g.x, 0.08, g.z, undefined, 8);
    p.cyl(0.06, 0.07, h, C.woodDark, g.x, h / 2 + 0.08, g.z, undefined, 8);
    for (const y of [0.4, 0.8]) p.cyl(0.072, 0.072, 0.05, C.bronze, g.x, y, g.z, undefined, 8);
    lacBird(m, g.x, h + 0.1, g.z, 0, 0.36);
  }
  const [a, b] = posts;
  const span = Math.abs(b.x - a.x);
  p.box(span + 0.2, 0.07, 0.09, C.red, (a.x + b.x) / 2, h - 0.08, a.z);
  // Biển gỗ giữa xà, mặt trống đồng nhỏ.
  p.box(0.4, 0.22, 0.04, C.wood, (a.x + b.x) / 2, h - 0.25, a.z + 0.02);
  m.drum.cyl(0.07, 0.07, 0.02, 0xffffff, (a.x + b.x) / 2, h - 0.25, a.z + 0.05, [Math.PI / 2, 0, 0], 12);
}

/** Bụi tre góc sau: thân tre mọc chụm hơi xòe, ngọn rủ lá. */
function bamboo(p: ShapeBuilder): void {
  const B = HO_KIM_QUY_LOT.zone('B');
  const rand = seeded(311);
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.45;
    const x = B.x + Math.cos(a) * r;
    const z = B.z + Math.sin(a) * r * 0.6;
    const h = 1.1 + rand() * 0.6;
    const lean = (x - B.x) * 0.25;
    const top: [number, number, number] = [x + lean * h, h, z + (z - B.z) * 0.25];
    rod(p, [x, 0, z], top, 0.028, i % 3 ? C.bamboo : 0x9fb85a, 5);
    for (let k = 0; k < 3; k++) p.sphere(0.13 + rand() * 0.05, C.leaf[(i + k) % 4], top[0] + (rand() - 0.5) * 0.25, h - 0.1 - k * 0.22, top[2] + (rand() - 0.5) * 0.2, [1.4, 0.5, 1.1], 6);
  }
}

/** Lau sậy dọc bờ sau hồ. */
function reeds(p: ShapeBuilder): void {
  const L = HO_KIM_QUY_LOT.zone('L');
  const rand = seeded(17);
  for (let i = 0; i < 22; i++) {
    const x = L.x - L.w / 2 + (i + rand() * 0.6) * (L.w / 22);
    const z = L.z + (rand() - 0.3) * 0.3;
    const h = 0.28 + rand() * 0.22;
    p.cone(0.02, h, i % 3 ? C.bamboo : 0x6f9a3e, x, h / 2 + 0.03, z, [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3], 4);
    if (i % 3 === 0) p.capsule(0.022, 0.08, 0xc8a870, x, h + 0.04, z);
  }
}

/** Đám sen ở các ô `S` của bản vẽ: lá nổi trên mặt hồ, hoa nở hồng và nụ trên cuống. */
export function lotus(p: ShapeBuilder, lot: Lot = HO_KIM_QUY_LOT): void {
  const rand = seeded(1945);
  for (const S of lot.groups('S')) {
    const n = Math.round(S.w * S.d * 8);
    for (let i = 0; i < n; i++) {
      const x = S.x + (rand() - 0.5) * (S.w + 0.2);
      const z = S.z + (rand() - 0.5) * (S.d + 0.2);
      const r = 0.09 + rand() * 0.06;
      p.cyl(r, r, 0.012, LOTUS_LEAF[i % 3], x, LAKE_WATER_Y + 0.008, z, undefined, 10);
      if (i % 4 === 0) {
        p.cyl(0.006, 0.006, 0.12, LOTUS_LEAF[0], x + 0.04, LAKE_WATER_Y + 0.06, z, undefined, 4);
        p.cone(0.06, 0.08, LOTUS, x + 0.04, LAKE_WATER_Y + 0.14, z, undefined, 7);
        p.cone(0.032, 0.07, LOTUS_LIGHT, x + 0.04, LAKE_WATER_Y + 0.16, z, undefined, 6);
      } else if (i % 4 === 2) {
        p.cyl(0.006, 0.006, 0.16, LOTUS_LEAF[2], x - 0.03, LAKE_WATER_Y + 0.08, z, undefined, 4);
        p.sphere(0.032, LOTUS, x - 0.03, LAKE_WATER_Y + 0.17, z, [1, 1.5, 1], 6);
      }
    }
  }
}

/** Người chơi thấy một thầy cúng đứng khấn trước miếu. */
export function hoKimQuySpots(): LotSpot[] {
  const M = HO_KIM_QUY_LOT.zone('M');
  return [{ job: 'lacHau', x: M.x + 0.32, y: BASE_Y + 0.03, z: M.z + M.d / 2 + 0.05, ry: Math.PI + 0.2 }];
}

/**
 * Đường Rùa Vàng bơi (tọa độ móng): vòng bầu dục quanh gò, tâm (x, z), bán kính `rx`, `rz`, nổi ở mặt nước `y`.
 * World cho rùa bơi theo đường này (`swimTurtle`).
 */
export interface Swim {
  x: number;
  z: number;
  rx: number;
  rz: number;
  y: number;
}

export function makeHoKimQuy(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const flat = new ShapeBuilder();
  p.box(8 - 0.06, 0.04, 8 - 0.06, LAWN, 0, 0.02, 0);
  lake(m, flat);
  islet(m);
  shrine(m);
  bridge(p);
  path(p);
  gate(m);
  bamboo(p);
  reeds(p);
  lotus(p);
  for (const D of HO_KIM_QUY_LOT.groups('D')) {
    // Trống đồng trên giá gỗ thấp.
    for (const dx of [-0.26, 0.26]) p.box(0.06, 0.24, 0.06, C.woodDark, D.x + dx, 0.12, D.z);
    p.box(0.66, 0.05, 0.14, C.wood, D.x, 0.22, D.z);
    drum(m, D.x, D.z, 0.85, 0.24);
  }
  const flags = HO_KIM_QUY_LOT.groups('F');
  flags.forEach((F, i) => banner(m, F.x - 0.1, F.z, 1.5, i ? C.gold : C.red));

  const g = m.group();
  g.add(flat.mesh(toon));
  // Cây đa cổ thụ góc sau trái: mô hình cây đa trang trí, tán xòe xuống mặt hồ.
  const T = HO_KIM_QUY_LOT.zone('T');
  const tree = decorModel('cayDa');
  tree.scale.setScalar(1.25);
  tree.position.set(T.x + 0.45, 0, T.z + 0.45);
  tree.rotation.y = Math.PI * 0.75;
  g.add(tree);
  // Rùa Vàng bơi vòng quanh gò.
  const G = HO_KIM_QUY_LOT.zone('G');
  const turtle = makeRuaVang();
  turtle.scale.setScalar(0.62);
  const swim: Swim = { x: G.x, z: G.z, rx: G.w / 2 + 0.85, rz: G.d / 2 + 0.55, y: LAKE_WATER_Y - 0.05 };
  turtle.userData.swim = swim;
  turtle.position.set(swim.x + swim.rx, swim.y, swim.z);
  g.add(turtle);
  return g;
}

export const HO_KIM_QUY: CongTrinh = { tiles: 8, make: makeHoKimQuy, spots: hoKimQuySpots, view: { half: 5.2, lookY: 0.6, px: 64 } };
