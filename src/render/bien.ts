// Biển Đông phía đông nam kinh đô (game/bien.ts): bờ chéo như bờ biển Bắc Bộ, mặt biển nông dần ra sâu, bãi cát dọc bờ,
// sóng vỗ bờ, cửa sông Đà ngay sau ngã ba, hai quần đảo Hoàng Sa,
// Trường Sa (đảo cát, cỏ, dừa, đá, rạn san hô, tên quần đảo), và cá voi, cá heo lâu lâu nổi lên: cá voi phun nước rồi
// lặn, vẫy đuôi; đàn cá heo nhảy vòng cung. Cá voi, cá heo có khung xương (rig.ts) như mọi con vật.
// Tọa độ thế giới: ô (x, z) ở (x − half, z − half) như world.ts (`half` là HALF ở đó).

import * as THREE from 'three';
import { BAI_CAT, DAO_CHINH, QUAN_DAO, bienDiem, bienDo, daoChinh, daoGoc, onIsland, type QuanDao, type QuanDaoId } from '../game/bien';
import { RIVER_END, RIVER_START } from '../game/map';
import { vi } from '../text/vi';
import { C } from './palette';
import { RigBuilder, resetBones, skinRig, type Act, type BoneDef, type Bones, type Poser } from './rig';
import { ShapeBuilder, seeded } from './shapes';
import { ToonModel } from './toon';

/** Mặt nước sông, biển (như world.ts). */
const WATER_Y = -0.28;
/** Bờ biển dựng dọc bờ từ t = −`REACH` tới `REACH` (t = x − z), mỗi đoạn `T_STEP` ô: trọn chỗ đất ngoài lưới chạm biển. */
const REACH = 200;
const T_STEP = 1;
/** Biển trải ra xa bờ chừng này ô (tới chân trời trong sương). */
const OPEN_SEA = 200;
/** Bãi cát bắt đầu từ chừng này ô sau mép bãi (âm, phía đất liền): phủ kín mép nền đất bậc thang dọc bờ chéo. */
const BEACH_IN = -1.7;

/** `shoreCap` trả số này cho đất liền xa bờ: không thấp xuống. */
export const SHORE_LAND = 99;
/** Ô có tâm cách mép bãi cát từ chừng này trở ra (`bienDo`) là bãi cát, biển: nền đất không vẽ ô ấy, bãi cát phủ lên. */
const SHORE_WET = -0.3;

/**
 * Bậc đất cao nhất được vẽ ở chỗ cách mép bãi cát `c` ô (`bienDo`, âm là đất liền): sát bãi là bậc 0 (bãi bồi), vào
 * trong lên dần; xa bờ thì `SHORE_LAND` (không đổi). −1 là bãi cát, biển: nền đất không vẽ.
 */
export function shoreCap(c: number): number {
  if (c >= SHORE_WET) return -1;
  if (c > -5) return 0;
  if (c > -10) return 1;
  if (c > -16) return 2;
  return SHORE_LAND;
}

const groundMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

/**
 * Dải dọc bờ biển: các hàng điểm cách mép bãi cát `cs[k]` ô (`bienDo`), mỗi hàng chạy dọc bờ từ t = −`REACH` tới `REACH`;
 * mỗi điểm cao `y`, màu `color` theo hàng. Trả hình không chỉ mục, có pháp tuyến và màu từng đỉnh.
 */
function coastBand(
  cs: number[],
  y: (x: number, z: number, k: number) => number,
  color: (k: number) => THREE.Color,
  half: number,
  alpha?: (k: number) => number,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const pt = (t: number, k: number) => {
    const p = bienDiem(t, cs[k]);
    return [p.x - half, y(p.x, p.z, k), p.z - half];
  };
  const push = (v: number[], k: number) => {
    pos.push(...v);
    const c = color(k);
    col.push(c.r, c.g, c.b);
    if (alpha) col.push(alpha(k));
  };
  for (let t = -REACH; t < REACH; ) {
    // Quanh cửa sông Đà chia mịn hơn để bãi cát thoải xuống lòng sông không gãy khúc.
    const z = bienDiem(t, 0).z;
    const step = z > RIVER_START - 6 && z < RIVER_END + 6 ? T_STEP / 4 : T_STEP;
    for (let k = 0; k + 1 < cs.length; k++) {
      // Bốn góc ô dải: (t, hàng k), (t, hàng k + 1), (t + bước, ...). Mặt hướng lên trên.
      const a = pt(t, k);
      const b = pt(t, k + 1);
      const c = pt(t + step, k);
      const d = pt(t + step, k + 1);
      push(a, k);
      push(b, k + 1);
      push(c, k);
      push(c, k);
      push(b, k + 1);
      push(d, k + 1);
    }
    t += step;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, alpha ? 4 : 3));
  g.computeVertexNormals();
  return g;
}

/** Mây mù trên biển cao chừng này (trên mặt nước, dưới tên quần đảo). */
const MIST_Y = 1.5;

/**
 * Mây mù phủ biển trước khi biển mở (dưới Điện 8): một màn sương kem mờ dần từ mép bãi ra khơi thì đặc lại, cùng các
 * cụm mây dày dọc bờ và trùm kín hai quần đảo. `material` dùng chung cho cả cụm, để World cho tan dần khi biển mở.
 */
export function buildSeaMist(half: number, puff: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.name = 'mayMu';
  const cream = new THREE.Color(C.cream);
  const veil = new THREE.Mesh(
    coastBand([BAI_CAT - 0.5, BAI_CAT + 3, BAI_CAT + 9, OPEN_SEA], () => MIST_Y, () => cream, half, (k) => [0, 0.35, 0.6, 0.7][k]),
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }),
  );
  veil.renderOrder = 2;
  g.add(veil);
  const b = new ShapeBuilder();
  const rand = seeded(19);
  const lump = (x: number, z: number, n: number, spread: number) => {
    for (let k = 0; k < n; k++) {
      const r = 0.9 + rand() * 0.7;
      b.sphere(r, k % 3 ? C.cream : 0xe8d9b0, x + (rand() - 0.5) * spread - half, MIST_Y + 0.3 + rand() * 0.5, z + (rand() - 0.5) * spread - half, [1.5, 0.5, 1.5], 9);
    }
  };
  // Dải mây dày ngoài mép bãi, dọc bờ chéo.
  for (let t = -120; t < 120; t += 5) {
    const p = bienDiem(t, BAI_CAT + 3 + rand() * 2);
    lump(p.x, p.z, 4, 5);
  }
  // Mây trùm kín mỗi quần đảo (đảo chính và các đảo nhỏ quanh đó).
  for (const q of QUAN_DAO) {
    const r = q.nguTruong - 2;
    for (let dz = -r; dz <= r; dz += 4) for (let dx = -r; dx <= r; dx += 4) if (dx * dx + dz * dz <= r * r) lump(q.x + dx, q.z + dz, 3, 4);
  }
  const puffs = b.mesh(puff);
  puffs.castShadow = false;
  puffs.receiveShadow = false;
  g.add(puffs);
  return g;
}

/** Điểm (x, z) cách lòng sông Đà bao nhiêu ô (0 trong lòng sông): bãi cát hai bên cửa sông thoải xuống nước. */
function fromChannel(z: number): number {
  return z < RIVER_START ? RIVER_START - z : z > RIVER_END ? z - RIVER_END : 0;
}

/**
 * Mặt biển, bãi cát, đảo, tên quần đảo. Dựng một lần; không đổ bóng cho nhẹ máy (đảo nhận bóng như đất). `foam` là
 * các dải sóng vỗ bờ (World cho trôi ra vào theo nhịp, `animateSea`).
 */
export function buildSea(half: number): THREE.Group {
  const wx = (x: number) => x - half;
  const wz = (z: number) => z - half;
  const group = new THREE.Group();
  group.name = 'bien';

  // Nước: nông màu ngọc sát bãi, sẫm dần ra khơi, tới chân trời. Thấp hơn mặt sông một chút: ở cửa sông nước sông nằm trên.
  const shallow = new THREE.Color(C.seaShallow);
  const mid = new THREE.Color(C.seaMid);
  const deep = new THREE.Color(C.sea);
  const seaRows = [BAI_CAT - 0.6, BAI_CAT + 0.5, BAI_CAT + 1.8, BAI_CAT + 4.5, OPEN_SEA];
  const seaColors = [shallow, shallow, mid, deep, deep];
  const open = new THREE.Mesh(coastBand(seaRows, () => WATER_Y - 0.004, (k) => seaColors[k], half), groundMaterial);
  open.castShadow = false;
  open.receiveShadow = true;
  group.add(open);

  // Quanh mỗi đảo: vũng nông màu ngọc (rạn san hô) trong vành nước vừa; đảo chính vuông bo góc thì vũng cũng vậy.
  const water = new ShapeBuilder();
  for (const q of QUAN_DAO) {
    water.add(flatSquircle(DAO_CHINH / 2 + 3.4), C.seaMid, wx(q.x), WATER_Y + 0.004, wz(q.z));
    water.add(flatSquircle(DAO_CHINH / 2 + 1.7), C.reef, wx(q.x), WATER_Y + 0.008, wz(q.z));
    for (const d of q.dao) {
      water.add(new THREE.CylinderGeometry(d.r + 2, d.r + 2, 0.02, 28), C.seaMid, wx(q.x + d.dx), WATER_Y + 0.004, wz(q.z + d.dz));
      water.add(new THREE.CylinderGeometry(d.r + 1.05, d.r + 1.05, 0.02, 24), C.reef, wx(q.x + d.dx), WATER_Y + 0.008, wz(q.z + d.dz));
    }
  }
  const waterMesh = water.mesh(groundMaterial);
  waterMesh.castShadow = false;
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // Bãi cát dọc bờ chéo: cát khô sát đất liền (phủ mép nền đất), cát ướt thoải dần xuống chìm dưới nước. Hai bên cửa
  // sông Đà bãi thoải xuống lòng sông thành hai doi cát; trong lòng sông bãi chìm dưới nước sông.
  const sandRows = [BEACH_IN, -1.0, -0.3, 0.4, 0.9, 1.3, 1.8, 2.3, 2.8, BAI_CAT + 0.4];
  const sandY = [0.02, 0.018, 0.015, 0.0, -0.02, -0.04, -0.11, -0.2, -0.3, WATER_Y - 0.14];
  const dry = new THREE.Color(C.beach);
  const wet = new THREE.Color(C.beachWet);
  const sandColors = [dry, dry, dry, dry, dry, dry.clone().lerp(wet, 0.5), wet, wet, wet, wet];
  const sandMesh = new THREE.Mesh(
    coastBand(
      sandRows,
      (x, z, k) => {
        const w = THREE.MathUtils.smoothstep(fromChannel(z), 0, 3);
        return x < RIVER_START ? sandY[k] : WATER_Y - 0.2 + (sandY[k] - (WATER_Y - 0.2)) * w;
      },
      (k) => sandColors[k],
      half,
    ),
    groundMaterial,
  );
  sandMesh.castShadow = false;
  sandMesh.receiveShadow = true;
  group.add(sandMesh);

  group.add(islands(half));
  group.add(foamLines(half));
  for (const q of QUAN_DAO) {
    const label = nameLabel(vi.bien.quanDao[q.id].name);
    label.position.set(wx(q.x), 3.6, wz(q.z - DAO_CHINH / 2 - 3));
    label.userData.label = true;
    group.add(label);
  }
  return group;
}

/** Cây dừa trên đảo: thân cong vươn ra, tàu lá xòe, chùm quả. */
function palm(m: ToonModel, x: number, y: number, z: number, h: number, lean: number, seed: number, toward?: number): void {
  const p = m.plain;
  const rand = seeded(seed);
  const spin = rand() * Math.PI * 2;
  // Dừa ven bờ ngả ra phía biển (`toward`), lệch chút cho tự nhiên.
  const dir = toward === undefined ? spin : toward + (rand() - 0.5) * 0.9;
  const n = 4;
  let px = x;
  let py = y;
  let pz = z;
  for (let i = 0; i < n; i++) {
    const k = (i + 1) / n;
    const nx = x + Math.cos(dir) * lean * k * k;
    const nz = z + Math.sin(dir) * lean * k * k;
    const ny = y + h * k;
    const len = Math.hypot(nx - px, ny - py, nz - pz);
    // Dựng trụ dọc theo hướng đoạn thân.
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx - px, ny - py, nz - pz).normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    p.cyl(0.045 - 0.006 * i, 0.055 - 0.006 * i, len, C.palm, (px + nx) / 2, (py + ny) / 2, (pz + nz) / 2, [e.x, e.y, e.z], 6);
    px = nx;
    py = ny;
    pz = nz;
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rand() * 0.4;
    const droop = 0.35 + rand() * 0.25;
    p.add(new THREE.ConeGeometry(0.09, 0.62, 4), i % 2 ? C.leaf[1] : C.leaf[3], px + Math.cos(a) * 0.28, py - 0.06, pz + Math.sin(a) * 0.28, [Math.PI / 2 + droop, -a + Math.PI / 2, 0], [1, 1, 0.35]);
  }
  for (let i = 0; i < 3; i++) p.sphere(0.045, C.trunk, px + Math.cos(i * 2.1) * 0.06, py - 0.08, pz + Math.sin(i * 2.1) * 0.06, [1, 1, 1], 6);
}

/** Điểm trên bờ hình vuông bo góc nửa cạnh `half` (như bờ đảo chính, `game/bien.ts`), theo góc `a`. */
function squirclePoint(a: number, half: number, outward = 0): THREE.Vector2 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const k = 2 / 4;
  return new THREE.Vector2(Math.sign(c) * Math.abs(c) ** k * (half + outward), Math.sign(s) * Math.abs(s) ** k * (half + outward));
}

function squircleOutline(half: number): THREE.Vector2[] {
  return Array.from({ length: 72 }, (_, i) => squirclePoint((i / 72) * Math.PI * 2, half));
}

/** Mặt phẳng nằm ngang hình vuông bo góc (vũng nông quanh đảo chính). */
function flatSquircle(half: number): THREE.BufferGeometry {
  return new THREE.ShapeGeometry(new THREE.Shape(squircleOutline(half))).rotateX(-Math.PI / 2);
}

/** Vành sóng hình vuông bo góc quanh đảo chính, nằm ngang, dày `w` ô. */
function squircleRing(half: number, w: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(squircleOutline(half + w));
  shape.holes.push(new THREE.Path(squircleOutline(half).reverse()));
  return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
}

/** Cây phong ba trên đảo: thân thấp ngả theo gió, tán lá dày xanh thẫm. */
function phongBa(m: ToonModel, x: number, y: number, z: number, s: number, seed: number): void {
  const p = m.plain;
  const rand = seeded(seed);
  const lean = (rand() - 0.5) * 0.5;
  p.cyl(0.05 * s, 0.08 * s, 0.45 * s, C.trunk, x, y + 0.22 * s, z, [lean, 0, lean * 0.6], 6);
  for (let i = 0; i < 3; i++) {
    const a = rand() * Math.PI * 2;
    p.sphere((0.22 + rand() * 0.1) * s, i % 2 ? C.leaf[2] : C.leaf[0], x + Math.cos(a) * 0.14 * s + lean * 0.2, y + (0.5 + rand() * 0.15) * s, z + Math.sin(a) * 0.14 * s, [1.25, 0.75, 1.15], 8);
  }
}

/** Màu cỏ gò (bậc 2) và đỉnh đồi (bậc 3) giữa đảo chính: thẫm dần lên cao. */
const HILL = [0x9aa65e, 0x86934f];

/** Độ cao mặt ô đảo chính (thế giới) theo bậc: bãi cát sát nước thấp nhất, rồi cát, đất cỏ bậc 1, gò bậc 2, đỉnh bậc 3. */
const DAO_TOP = [-0.14, -0.04, 0.3, 0.6, 0.9];

/** Gò đồi giữa đảo chính: nhiễu thô theo ô, ổn định theo hạt giống. */
function hillNoise(seed: number): (i: number, j: number) => number {
  const rand = seeded(seed * 7 + 3);
  const cells = Array.from({ length: 36 }, () => rand());
  const at = (a: number, b: number) => cells[Math.min(5, Math.max(0, b)) * 6 + Math.min(5, Math.max(0, a))];
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (i, j) => {
    const fx = i / 4;
    const fz = j / 4;
    const a = Math.floor(fx);
    const b = Math.floor(fz);
    const u = fade(fx - a);
    const v = fade(fz - b);
    const top = at(a, b) + (at(a + 1, b) - at(a, b)) * u;
    const bot = at(a, b + 1) + (at(a + 1, b + 1) - at(a, b + 1)) * u;
    return top + (bot - top) * v;
  };
}

/**
 * Đảo chính 20 × 20 ô, đất theo ô như kinh đô: viền bãi cát sát nước, cát lẫn cỏ, đất cỏ bậc 1, gò bậc 2, đỉnh đá bậc 3
 * giữa đảo. Dừa mọc ven bờ nghiêng ra biển, cây phong ba và dừa trong đảo, đá rải bãi cát.
 */
function mainIsland(q: QuanDao, half: number, land: ShapeBuilder, m: ToonModel): void {
  const g = daoGoc(q);
  const rand = seeded(q.seed);
  const hill = hillNoise(q.seed);
  const cx = q.x - half;
  const cz = q.z - half;
  const bottom = WATER_Y - 0.6;
  for (const o of daoChinh(q)) {
    const x = g.x + o.i + 0.5 - half;
    const z = g.z + o.j + 0.5 - half;
    let level = o.bo === 0 ? 0 : o.bo === 1 ? 1 : 2;
    if (o.bo >= 4 && hill(o.i, o.j) > 0.52) level = 3;
    if (o.bo >= 7 && hill(o.i, o.j) > 0.62) level = 4;
    const top = DAO_TOP[level];
    const shade = (o.i * 7 + o.j * 13) % 3;
    const color = level === 0 ? C.beachWet : level === 1 ? C.beach : level >= 3 ? HILL[level - 3] : o.bo === 2 ? 0xbcb36e : C.grass[shade];
    land.box(1, top - bottom, 1, color, x, (top + bottom) / 2, z);
    const r = rand();
    const y = top;
    if (level === 0) {
      if (r < 0.07) m.plain.sphere(0.14 + rand() * 0.12, rand() < 0.5 ? C.rock : C.rockDark, x + (rand() - 0.5) * 0.5, y + 0.03, z + (rand() - 0.5) * 0.5, [1.2, 0.7, 1], 7);
    } else if (level === 1 || o.bo === 2) {
      // Dừa ven bờ nghiêng ra phía biển.
      if (r < 0.17) palm(m, x + (rand() - 0.5) * 0.4, y, z + (rand() - 0.5) * 0.4, 1.0 + rand() * 0.5, 0.25 + rand() * 0.2, Math.floor(rand() * 1e6), Math.atan2(z - cz, x - cx));
    } else if (level === 4) {
      // Đỉnh đồi: đá tảng lộ giữa cỏ, bụi cây thấp.
      if (r < 0.3) m.plain.sphere(0.2 + rand() * 0.14, rand() < 0.5 ? C.rock : C.rockDark, x + (rand() - 0.5) * 0.4, y + 0.06, z + (rand() - 0.5) * 0.4, [1.1, 0.8, 1], 7);
      else if (r < 0.45) phongBa(m, x + (rand() - 0.5) * 0.4, y, z + (rand() - 0.5) * 0.4, 0.7 + rand() * 0.3, Math.floor(rand() * 1e6));
    } else if (r < 0.22) {
      if (rand() < 0.55) phongBa(m, x + (rand() - 0.5) * 0.4, y, z + (rand() - 0.5) * 0.4, 0.9 + rand() * 0.4, Math.floor(rand() * 1e6));
      else palm(m, x + (rand() - 0.5) * 0.4, y, z + (rand() - 0.5) * 0.4, 1.0 + rand() * 0.5, 0.15 + rand() * 0.2, Math.floor(rand() * 1e6));
    } else if (r < 0.27) {
      // Bụi cỏ lau thấp.
      for (let k = 0; k < 3; k++) m.plain.cone(0.05, 0.28, C.leaf[3], x + (rand() - 0.5) * 0.5, y + 0.13, z + (rand() - 0.5) * 0.5, [(rand() - 0.5) * 0.4, 0, (rand() - 0.5) * 0.4], 4);
    }
  }
}

/**
 * Hai quần đảo: đảo chính 20 × 20 ô (`mainIsland`) và các đảo nhỏ quanh đó: bãi cát thoải, đảo khá lớn có thảm cỏ,
 * dừa, bụi cây; đá xám rải mép nước.
 */
function islands(half: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const land = new ShapeBuilder();
  for (const q of QUAN_DAO) {
    mainIsland(q, half, land, m);
    const rand = seeded(q.seed + 1);
    q.dao.forEach((d, i) => {
      const x = q.x + d.dx - half;
      const z = q.z + d.dz - half;
      p.add(new THREE.CylinderGeometry(d.r * 0.82, d.r * 1.05, 0.42, 22), C.beach, x, WATER_Y + 0.14, z);
      p.add(new THREE.CylinderGeometry(d.r * 1.08, d.r * 1.12, 0.06, 22), C.beachWet, x, WATER_Y + 0.0, z);
      if (d.r >= 0.85) {
        p.add(new THREE.CylinderGeometry(d.r * 0.55, d.r * 0.68, 0.14, 16), C.grass[i % 3], x + 0.1, WATER_Y + 0.4, z - 0.05);
        const trees = Math.round(d.r * 2.2);
        for (let k = 0; k < trees; k++) {
          const a = rand() * Math.PI * 2;
          const rr = rand() * d.r * 0.45;
          palm(m, x + Math.cos(a) * rr, WATER_Y + 0.45, z + Math.sin(a) * rr, 0.9 + rand() * 0.5, 0.2 + rand() * 0.25, Math.floor(rand() * 1e6));
        }
        // Bụi cây phong ba thấp.
        for (let k = 0; k < 3; k++) {
          const a = rand() * Math.PI * 2;
          p.sphere(0.2 + rand() * 0.1, C.leaf[2], x + Math.cos(a) * d.r * 0.5, WATER_Y + 0.5, z + Math.sin(a) * d.r * 0.5, [1.2, 0.7, 1.1], 8);
        }
      }
      for (let k = 0; k < 2 + Math.round(d.r); k++) {
        const a = rand() * Math.PI * 2;
        p.sphere(0.12 + rand() * 0.14, k % 2 ? C.rock : C.rockDark, x + Math.cos(a) * d.r * 0.95, WATER_Y + 0.08, z + Math.sin(a) * d.r * 0.95, [1.2, 0.7, 1], 7);
      }
    });
  }
  const g = m.group();
  for (const o of g.children) o.castShadow = false;
  const ground = land.mesh(groundMaterial);
  ground.castShadow = false;
  g.add(ground);
  g.name = 'dao';
  return g;
}

/** Một dải sóng hay một vòng sóng: chỗ đứng gốc và lệch pha. */
interface Foam {
  x: number;
  z: number;
  /** Vòng sóng quanh đảo thì có bán kính; dải sóng vỗ bờ thì không. */
  r?: number;
  /** Vòng sóng phập phồng chừng này phần bán kính (mặc định 0,08; vành sóng đảo chính to nên ít hơn). */
  amp?: number;
  /** Dải sóng vỗ bờ: hướng dọc bờ (góc quay quanh trục đứng) và hướng vào bờ (nx, nz). */
  yaw?: number;
  nx?: number;
  nz?: number;
  phase: number;
}

/**
 * Dải sóng trắng vỗ bờ cát và vòng sóng quanh đảo, mỗi loại gộp một InstancedMesh (một lệnh vẽ); World cho trôi ra
 * vào, phập phồng (`animateSea`).
 */
function foamLines(half: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'song';
  const mat = new THREE.MeshBasicMaterial({ color: C.foam, transparent: true, opacity: 0.75, depthWrite: false });
  const lines: Foam[] = [];
  // Dọc bờ chéo, mỗi đoạn dài chừng `FOAM_SEG` ô (đi một bước t thì dọc bờ được chừng t / √2 ô).
  const step = FOAM_SEG * Math.SQRT2;
  for (let t = -REACH + step / 2; t < REACH; t += step) {
    const p = bienDiem(t, BAI_CAT + 0.1);
    // Cửa sông không có sóng vỗ bờ.
    if (p.x > RIVER_START && p.z > RIVER_START - FOAM_SEG / 2 - 1 && p.z < RIVER_END + FOAM_SEG / 2 + 1) continue;
    const a = bienDiem(t - 0.5, BAI_CAT + 0.1);
    const b = bienDiem(t + 0.5, BAI_CAT + 0.1);
    const land = bienDiem(t, BAI_CAT - 0.9);
    const n = Math.hypot(land.x - p.x, land.z - p.z);
    lines.push({ x: p.x - half, z: p.z - half, yaw: Math.atan2(b.x - a.x, b.z - a.z), nx: (land.x - p.x) / n, nz: (land.z - p.z) / n, phase: t * 0.26 });
  }
  const rings: Foam[] = [];
  for (const q of QUAN_DAO) q.dao.forEach((d, i) => rings.push({ x: q.x + d.dx - half, z: q.z + d.dz - half, r: d.r * 1.12, phase: i * 1.3 }));
  const line = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.02, FOAM_SEG - 0.6), mat, lines.length);
  line.userData.foam = lines;
  // Vòng sóng bán kính 1, dày chừng 0,1 ô; phóng theo cỡ đảo.
  const ring = new THREE.InstancedMesh(new THREE.RingGeometry(1, 1.09, 28).rotateX(-Math.PI / 2), mat, rings.length);
  ring.userData.foam = rings;
  // Vành sóng vuông bo góc quanh đảo chính.
  const mains: Foam[] = QUAN_DAO.map((q, i) => ({ x: q.x - half, z: q.z - half, r: 1, amp: 0.012, phase: i * 2.1 }));
  const main = new THREE.InstancedMesh(squircleRing(DAO_CHINH / 2 + 0.55, 0.16), mat, mains.length);
  main.userData.foam = mains;
  for (const m of [line, ring, main]) {
    m.renderOrder = 1;
    m.frustumCulled = false;
    g.add(m);
  }
  return g;
}

/** Dải sóng vỗ bờ dài chừng này ô. */
const FOAM_SEG = 7;
const foamMatrix = new THREE.Matrix4();
const foamPos = new THREE.Vector3();
const foamScale = new THREE.Vector3();
const foamRot = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

/** Tên quần đảo rộng chừng này phần bề ngang màn hình dọc, phóng to hay thu nhỏ cũng vậy (camera trực giao). */
const LABEL_W = 6.4;

/**
 * Sóng trôi ra vào bờ, vòng sóng quanh đảo phập phồng. Tên quần đảo giữ cỡ trên màn hình dù phóng to hay thu nhỏ
 * (`zoom` của camera).
 */
export function animateSea(sea: THREE.Group, t: number, zoom: number): void {
  for (const o of sea.children) {
    if (!o.userData.label) continue;
    const w = THREE.MathUtils.clamp(LABEL_W / zoom, 4.5, 18);
    o.scale.set(w, w * 0.175, 1);
  }
  const song = sea.getObjectByName('song');
  if (!song) return;
  for (const o of song.children) {
    const mesh = o as THREE.InstancedMesh;
    (mesh.userData.foam as Foam[]).forEach((f, i) => {
      if (f.r === undefined) {
        // Dải sóng trôi lên bờ rồi rút, giãn ra khi lên.
        const k = (Math.sin(t * 0.9 + f.phase) + 1) / 2;
        foamPos.set(f.x + (f.nx ?? 0) * k * 0.45, WATER_Y + 0.02, f.z + (f.nz ?? 0) * k * 0.45);
        foamScale.set(1 + k * 1.5, 1, 1);
        foamRot.setFromAxisAngle(UP, f.yaw ?? 0);
      } else {
        const r = f.r * (1 + (f.amp ?? 0.08) * (Math.sin(t * 1.1 + f.phase) + 1));
        foamPos.set(f.x, WATER_Y + 0.02, f.z);
        foamScale.set(r, 1, r);
        foamRot.identity();
      }
      mesh.setMatrixAt(i, foamMatrix.compose(foamPos, foamRot, foamScale));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Tên quần đảo: chữ mực trên nền kem viền đồng, luôn quay về phía camera. */
function nameLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(243, 230, 196, 0.92)';
  ctx.strokeStyle = '#b88a3a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1d140c';
  ctx.font = 'bold 52px "Be Vietnam Pro", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 3);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false }));
  sprite.scale.set(9.6, 1.68, 1);
  sprite.renderOrder = 3;
  return sprite;
}

/** Quần đảo ở chỗ (x, z) tọa độ ô (kể cả vũng nông quanh đảo), cho việc chạm vào đảo. */
export function islandAt(x: number, z: number): QuanDaoId | null {
  return onIsland(x, z, 1.2);
}

// ---------- Cá voi, cá heo ----------

type B = Bones<string>;
type Defs = Record<string, BoneDef<string>>;

const WHALE: Defs = {
  base: { parent: null, at: [0, 0, 0] },
  tail1: { parent: 'base', at: [0, 0.05, -0.95] },
  tail2: { parent: 'tail1', at: [0, 0.05, -1.55] },
  fluke: { parent: 'tail2', at: [0, 0.05, -2.0] },
  finL: { parent: 'base', at: [-0.48, -0.12, 0.4] },
  finR: { parent: 'base', at: [0.48, -0.12, 0.4] },
};

/** Cá voi: mình to thuôn xanh xám, bụng trắng có rãnh, đầu dẹt, lỗ phun nước trên lưng, vây ngực dài, đuôi xòe hai thùy. */
function drawWhale(r: RigBuilder<string>): void {
  const p = r.on('base').plain;
  p.sphere(0.7, C.whale, 0, 0, 0.15, [0.85, 0.66, 1.85], 14);
  p.sphere(0.62, C.whaleBelly, 0, -0.12, 0.3, [0.78, 0.5, 1.6], 12);
  // Rãnh họng dưới cằm.
  for (const dx of [-0.2, -0.07, 0.07, 0.2]) p.box(0.025, 0.02, 0.9, C.whale, dx, -0.42, 0.75);
  for (const s of [-1, 1]) {
    p.sphere(0.06, C.ink, s * 0.47, 0.02, 0.95, [0.6, 1, 1], 6);
    p.sphere(0.035, C.cream, s * 0.495, 0.04, 0.97, [0.5, 1, 1], 5);
  }
  p.sphere(0.06, C.ink, 0, 0.44, 0.62, [1.2, 0.4, 0.8], 6);
  p.cone(0.12, 0.26, C.whale, 0, 0.42, -0.6, [-0.5, 0, 0], 6);
  const t1 = r.on('tail1').plain;
  t1.sphere(0.42, C.whale, 0, 0.04, -1.2, [0.7, 0.62, 1.2], 10);
  const t2 = r.on('tail2').plain;
  t2.sphere(0.24, C.whale, 0, 0.05, -1.78, [0.65, 0.6, 1.3], 8);
  const f = r.on('fluke').plain;
  for (const s of [-1, 1]) f.sphere(0.4, C.whale, s * 0.38, 0.05, -2.1, [1.15, 0.12, 0.5], 10);
  for (const [b, s] of [
    ['finL', -1],
    ['finR', 1],
  ] as const) {
    r.on(b).plain.sphere(0.32, C.whale, s * 0.78, -0.2, 0.3, [1.3, 0.12, 0.42], 8);
  }
}

/**
 * Cá voi bơi: đuôi đập lên xuống thành sóng chạy về sau, vây ngực chèo chậm. Lặn (`act: 'fight'`, `strike` 0..1):
 * khúc đuôi cong vồng lên dần, vây đuôi dựng đứng khỏi mặt nước như khi cá voi chúi xuống sâu.
 */
function poseWhale(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  const w = 1.6;
  const curl = a.act === 'fight' ? (a.strike ?? 0) : 0;
  const swim = 1 - curl;
  b.tail1.rotation.x = 0.12 * swim * Math.sin(t * w) + 0.22 * curl;
  b.tail2.rotation.x = 0.22 * swim * Math.sin(t * w - 0.7) + 0.32 * curl;
  b.fluke.rotation.x = 0.3 * swim * Math.sin(t * w - 1.4) + 0.38 * curl;
  b.finL.rotation.z = 0.15 * Math.sin(t * w * 0.5);
  b.finR.rotation.z = -0.15 * Math.sin(t * w * 0.5);
}

const DOLPHIN: Defs = {
  base: { parent: null, at: [0, 0, 0] },
  tail: { parent: 'base', at: [0, 0.02, -0.32] },
  fluke: { parent: 'tail', at: [0, 0.02, -0.62] },
  finL: { parent: 'base', at: [-0.14, -0.06, 0.18] },
  finR: { parent: 'base', at: [0.14, -0.06, 0.18] },
};

/** Cá heo: mình thon xám xanh, bụng trắng, mõm dài, vây lưng cong, mắt hiền. */
function drawDolphin(r: RigBuilder<string>): void {
  const p = r.on('base').plain;
  p.sphere(0.22, C.dolphin, 0, 0, 0.05, [0.72, 0.78, 2.1], 12);
  p.sphere(0.19, C.dolphinBelly, 0, -0.06, 0.1, [0.62, 0.55, 1.85], 10);
  p.capsule(0.055, 0.16, C.dolphin, 0, -0.05, 0.55, [Math.PI / 2, 0, 0]);
  p.cone(0.09, 0.22, C.dolphin, 0, 0.22, -0.05, [-0.55, 0, 0], 5);
  for (const s of [-1, 1]) {
    p.sphere(0.028, C.ink, s * 0.135, 0.04, 0.36, [0.5, 1, 1], 5);
    p.sphere(0.012, C.cream, s * 0.145, 0.05, 0.37, [0.5, 1, 1], 4);
  }
  r.on('tail').plain.sphere(0.12, C.dolphin, 0, 0.02, -0.45, [0.6, 0.6, 1.6], 8);
  const f = r.on('fluke').plain;
  for (const s of [-1, 1]) f.sphere(0.12, C.dolphin, s * 0.12, 0.02, -0.68, [1.2, 0.15, 0.55], 7);
  for (const [b, s] of [
    ['finL', -1],
    ['finR', 1],
  ] as const) {
    r.on(b).plain.sphere(0.1, C.dolphin, s * 0.22, -0.1, 0.12, [1.3, 0.15, 0.5], 6);
  }
}

/** Cá heo bơi: đuôi quẫy nhanh; khi nhảy (`act: 'walk'`) đuôi quẫy mạnh hơn. */
function poseDolphin(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  const k = a.act === 'walk' ? 0.45 : 0.25;
  b.tail.rotation.x = k * Math.sin(t * 8);
  b.fluke.rotation.x = (k + 0.15) * Math.sin(t * 8 - 0.8);
  b.finL.rotation.z = 0.2;
  b.finR.rotation.z = -0.2;
}

function makeCreature(defs: Defs, draw: (r: RigBuilder<string>) => void, pose: (b: B, a: Act) => void): THREE.Group {
  const r = new RigBuilder(defs, 0.8);
  draw(r);
  const { group, bones } = skinRig(r.build());
  const poser: Poser = (a) => pose(bones, a);
  poser({ act: 'stand' });
  group.userData.pose = poser;
  return group;
}

/** Cá voi có xương, mặt trước hướng +z, dài chừng 3,2 ô (chưa phóng). */
export function makeWhale(): THREE.Group {
  return makeCreature(WHALE, drawWhale, poseWhale);
}

/** Cá heo có xương, mặt trước hướng +z, dài chừng 1,1 ô. */
export function makeDolphin(): THREE.Group {
  return makeCreature(DOLPHIN, drawDolphin, poseDolphin);
}

/** Một lần cá voi nổi lên, hay một đàn cá heo nhảy: chỗ bắt đầu (thế giới), hướng bơi, giờ bắt đầu. */
interface SeaEvent {
  kind: 'whale' | 'dolphins';
  x: number;
  z: number;
  dir: number;
  start: number;
  dur: number;
}

/** Bụi nước: phun từ lỗ thở cá voi, tóe lên khi cá heo nhảy, khi cá voi lặn. */
interface Spray {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  age: number;
}

/** Cá voi nổi lên trong chừng này giây: trồi lên, phun nước, bơi, rồi chúi xuống, đuôi dựng lên mặt nước, lặn mất. */
const WHALE_S = 12;
/** Cá heo: mỗi con nhảy ba lần, mỗi lần chừng này giây (lặn dưới nước một nửa, bay vòng cung nửa kia). */
const JUMP_S = 1.5;
const JUMPS = 3;
const POD = 4;

/**
 * Cá voi, cá heo ngoài biển. Lâu lâu (8–18 giây) một lần: ở chỗ biển gần chỗ camera đang nhìn (camera ở xa biển thì
 * ở quanh một quần đảo), cá voi nổi lên phun nước rồi lặn, hay đàn bốn cá heo nhảy nối đuôi nhau.
 */
export class SeaLife {
  private readonly whale: THREE.Group;
  private readonly dolphins: THREE.Group[] = [];
  private readonly sprays: Spray[] = [];
  private readonly sprayMat = new THREE.MeshBasicMaterial({ color: C.foam, transparent: true, opacity: 0.85, depthWrite: false });
  private readonly sprayGeo = new THREE.SphereGeometry(0.09, 6, 4);
  private event: SeaEvent | null = null;
  private next = 4;
  private readonly rand = seeded(20261103);
  private spouted = false;
  private splashed = new Set<string>();

  constructor(
    private readonly root: THREE.Object3D,
    private readonly half: number,
  ) {
    // Xoay hướng bơi trước, rồi mới chúi, ngẩng theo trục ngang của chính con cá.
    this.whale = makeWhale();
    this.whale.scale.setScalar(1.35);
    this.whale.rotation.order = 'YXZ';
    this.whale.visible = false;
    root.add(this.whale);
    for (let i = 0; i < POD; i++) {
      const d = makeDolphin();
      d.rotation.order = 'YXZ';
      d.visible = false;
      root.add(d);
      this.dolphins.push(d);
    }
  }

  /** Chỗ biển trống cho một lần cá nổi: gần (fx, fz) tọa độ ô, chừa xa đảo và bờ, cả chỗ bắt đầu lẫn chỗ kết thúc. */
  private pickSpot(fx: number, fz: number, travel: number): { x: number; z: number; dir: number } | null {
    for (let tries = 0; tries < 12; tries++) {
      const x = fx + (this.rand() - 0.5) * 16;
      const z = fz + (this.rand() - 0.5) * 16;
      const dir = this.rand() * Math.PI * 2;
      const ex = x + Math.sin(dir) * travel;
      const ez = z + Math.cos(dir) * travel;
      if (bienDo(x, z) < BAI_CAT + 4 || bienDo(ex, ez) < BAI_CAT + 4) continue;
      if (onIsland(x, z, 3) || onIsland(ex, ez, 3) || onIsland((x + ex) / 2, (z + ez) / 2, 3)) continue;
      return { x, z, dir };
    }
    return null;
  }

  /** Cho cá voi hay đàn cá heo nổi lên ngay gần chỗ camera nhìn (ảnh chụp thử). */
  show(kind: SeaEvent['kind'], t: number, focus: THREE.Vector3): void {
    this.whale.visible = false;
    for (const d of this.dolphins) d.visible = false;
    this.event = null;
    this.spawn(t, focus, kind);
    this.next = t + 30;
  }

  /** Bắt đầu một lần cá nổi gần chỗ camera nhìn (`focus`, tọa độ thế giới). */
  private spawn(t: number, focus: THREE.Vector3, pick?: SeaEvent['kind']): void {
    const kind = pick ?? (this.rand() < 0.55 ? 'dolphins' : 'whale');
    const dur = kind === 'whale' ? WHALE_S : JUMP_S * JUMPS + 0.6 * (POD - 1);
    const travel = kind === 'whale' ? 0.7 * dur : 3.2 * dur;
    let fx = focus.x + this.half;
    let fz = focus.z + this.half;
    // Camera ở xa biển: cá nổi quanh một quần đảo.
    if (bienDo(fx, fz) < -8) {
      const q = QUAN_DAO[Math.floor(this.rand() * QUAN_DAO.length)];
      fx = q.x;
      fz = q.z + (this.rand() < 0.5 ? -1 : 1) * (q.nguTruong + 4);
    }
    const spot = this.pickSpot(fx, fz, travel);
    if (!spot) return;
    this.event = { kind, x: spot.x - this.half, z: spot.z - this.half, dir: spot.dir, start: t, dur };
    this.spouted = false;
    this.splashed.clear();
  }

  private spray(x: number, y: number, z: number, n: number, up: number, spread: number): void {
    for (let i = 0; i < n; i++) {
      let s = this.sprays.find((p) => p.age >= p.life);
      if (!s) {
        if (this.sprays.length >= 60) return;
        const mesh = new THREE.Mesh(this.sprayGeo, this.sprayMat);
        mesh.renderOrder = 2;
        this.root.add(mesh);
        s = { mesh, vx: 0, vy: 0, vz: 0, life: 0, age: 0 };
        this.sprays.push(s);
      }
      const a = this.rand() * Math.PI * 2;
      const r = this.rand() * spread;
      s.mesh.position.set(x, y, z);
      s.vx = Math.cos(a) * r;
      s.vz = Math.sin(a) * r;
      s.vy = up * (0.7 + this.rand() * 0.5);
      s.life = 0.8 + this.rand() * 0.6;
      s.age = 0;
      s.mesh.visible = true;
    }
  }

  update(t: number, dt: number, focus: THREE.Vector3): void {
    for (const s of this.sprays) {
      if (s.age >= s.life) continue;
      s.age += dt;
      s.vy -= 6 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y = Math.max(WATER_Y, s.mesh.position.y + s.vy * dt);
      s.mesh.position.z += s.vz * dt;
      s.mesh.scale.setScalar(1 + s.age * 1.5);
      if (s.age >= s.life) s.mesh.visible = false;
    }
    if (!this.event) {
      if (t >= this.next) {
        this.spawn(t, focus);
        this.next = t + 8 + this.rand() * 10 + (this.event ? (this.event as SeaEvent).dur : 0);
      }
      return;
    }
    const e = this.event;
    const k = t - e.start;
    if (k >= e.dur) {
      this.whale.visible = false;
      for (const d of this.dolphins) d.visible = false;
      this.event = null;
      return;
    }
    if (e.kind === 'whale') this.stepWhale(e, k, t);
    else this.stepDolphins(e, k, t);
  }

  /**
   * Cá voi: 0–1,5 giây trồi lên; 1,6 giây phun nước; bơi chậm; từ giây 7 chúi đầu xuống, lưng cong, đuôi dựng lên
   * khỏi mặt nước rồi lặn hẳn, tóe nước khi đuôi chìm.
   */
  private stepWhale(e: SeaEvent, k: number, t: number): void {
    const w = this.whale;
    w.visible = true;
    const along = 0.7 * k;
    w.position.x = e.x + Math.sin(e.dir) * along;
    w.position.z = e.z + Math.cos(e.dir) * along;
    w.rotation.set(0, e.dir, 0);
    // Lưng cá voi nhô khỏi mặt nước chừng một phần ba thân.
    const surface = WATER_Y - 0.38;
    let y = surface;
    let pitch = 0;
    if (k < 1.5) {
      const u = k / 1.5;
      y = surface - 1.6 * (1 - u) * (1 - u);
      pitch = -0.25 * (1 - u);
    } else if (k > 7) {
      const u = Math.min(1, (k - 7) / (WHALE_S - 7));
      pitch = 0.95 * Math.sin(u * Math.PI * 0.55);
      y = surface - 2.6 * u * u + 0.35 * Math.sin(u * Math.PI);
    } else {
      y = surface + 0.06 * Math.sin(k * 1.4);
    }
    w.position.y = y;
    w.rotation.x = pitch;
    const dive = k > 7 ? Math.min(1, (k - 7) / 2.5) : 0;
    (w.userData.pose as Poser)(dive > 0 ? { act: 'fight', strike: dive, time: t } : { act: 'walk', time: t });
    if (!this.spouted && k > 1.6) {
      this.spouted = true;
      // Phun nước từ lỗ thở trên lưng (cách mõm chừng 0,8 ô).
      const hx = w.position.x + Math.sin(e.dir) * 0.85;
      const hz = w.position.z + Math.cos(e.dir) * 0.85;
      this.spray(hx, WATER_Y + 0.25, hz, 22, 5.5, 0.5);
    }
    if (!this.splashed.has('lan') && k > WHALE_S - 1.6) {
      this.splashed.add('lan');
      const tx = w.position.x - Math.sin(e.dir) * 2.2;
      const tz = w.position.z - Math.cos(e.dir) * 2.2;
      this.spray(tx, WATER_Y + 0.1, tz, 16, 2.5, 1.2);
    }
  }

  /** Đàn cá heo: mỗi con chậm hơn con trước 0,6 giây, lệch sang bên một chút; nhảy vòng cung, tóe nước khi lên, khi xuống. */
  private stepDolphins(e: SeaEvent, k: number, t: number): void {
    this.dolphins.forEach((d, i) => {
      const own = k - i * 0.6;
      if (own < 0 || own >= JUMP_S * JUMPS) {
        d.visible = false;
        return;
      }
      const side = (i % 2 ? 1 : -1) * (0.45 + 0.3 * Math.floor(i / 2));
      const along = 3.2 * own;
      const sx = Math.cos(e.dir) * side;
      const sz = -Math.sin(e.dir) * side;
      d.position.x = e.x + Math.sin(e.dir) * along + sx;
      d.position.z = e.z + Math.cos(e.dir) * along + sz;
      const jump = Math.floor(own / JUMP_S);
      const ph = (own % JUMP_S) / JUMP_S;
      // Nửa đầu bơi dưới nước, nửa sau bay vòng cung.
      if (ph < 0.45) {
        d.visible = true;
        d.position.y = WATER_Y - 0.55;
        d.rotation.set(0, e.dir, 0);
      } else {
        const u = (ph - 0.45) / 0.55;
        d.visible = true;
        d.position.y = WATER_Y - 0.3 + 1.25 * Math.sin(Math.PI * u);
        d.rotation.set(-1.1 * Math.cos(Math.PI * u), e.dir, 0);
        const key = `${i}:${jump}`;
        if (u < 0.15 && !this.splashed.has(`${key}a`)) {
          this.splashed.add(`${key}a`);
          this.spray(d.position.x, WATER_Y + 0.05, d.position.z, 6, 2.2, 0.5);
        }
        if (u > 0.88 && !this.splashed.has(`${key}b`)) {
          this.splashed.add(`${key}b`);
          this.spray(d.position.x, WATER_Y + 0.05, d.position.z, 8, 2.6, 0.6);
        }
      }
      (d.userData.pose as Poser)({ act: 'walk', time: t + i });
    });
  }
}
