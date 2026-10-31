// Mô hình công trình "Nét Đông Sơn". Mỗi loại một dáng riêng lấy từ nhà cửa trên trống đồng,
// mỗi cấp thêm một phần lớn nhìn thấy rõ và to dần lên.
// Gốc tọa độ là tâm chân móng, mặt trước hướng +z.

import * as THREE from 'three';
import { ironHorse, makeFighter } from './models';
import { C } from './palette';
import { ShapeBuilder, saddleRoof, seeded } from './shapes';
import { ToonModel, inkThin, outlineOf, toon } from './toon';

/** To dần theo cấp: khoảng 85% ở cấp 1, 105% ở cấp 5. */
const sizeFor = (level: number) => 0.8 + 0.05 * level;

function bird(m: ToonModel, x: number, y: number, z: number, dir: number, s = 1): void {
  m.plain.capsule(0.06 * s, 0.22 * s, C.bronze, x, y, z, [0, 0, Math.PI / 2]);
  m.plain.capsule(0.03 * s, 0.26 * s, C.bronze, x + dir * 0.2 * s, y + 0.12 * s, z, [0, 0, -dir * 0.6]);
  m.plain.cone(0.03 * s, 0.22 * s, C.bronzeLight, x + dir * 0.4 * s, y + 0.2 * s, z, [0, 0, -dir * Math.PI / 2]);
  m.plain.box(0.18 * s, 0.03, 0.14 * s, C.bronzeDark, x - dir * 0.16 * s, y + 0.06 * s, z, [0, 0, dir * 0.6]);
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
function stiltHall(m: ToonModel, o: { x: number; z: number; w: number; d: number; postH: number; roofL: number; roofW: number; lift: number; ry?: number }): void {
  const p = m.plain;
  const cols = o.w > 2 ? [-o.w / 2 + 0.15, 0, o.w / 2 - 0.15] : [-o.w / 2 + 0.12, o.w / 2 - 0.12];
  for (const cx of cols) for (const cz of [-o.d / 2 + 0.12, o.d / 2 - 0.12]) p.cyl(0.07, 0.09, o.postH, C.woodDark, o.x + cx, o.postH / 2, o.z + cz);
  p.box(o.w, 0.12, o.d, C.wood, o.x, o.postH, o.z);
  m.band.box(o.w - 0.6, 0.62, o.d - 0.5, C.woodLight, o.x, o.postH + 0.37, o.z);
  m.band.add(
    saddleRoof({ length: o.roofL, width: o.roofW, lift: o.lift, drop: o.roofW * 0.4, thickness: 0.1 }),
    C.thatch,
    o.x,
    o.postH + 0.68 + o.roofW * 0.4,
    o.z,
    [0, o.ry ?? 0, 0],
  );
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
  // Cấp 4 trở lên: nền đất đắp cao viền đá, có bậc lên.
  const base = level >= 4 ? 0.45 : 0.14;
  p.box(3.9, base, 3.9, level >= 4 ? C.earth : C.soil, 0, base / 2, 0);
  if (level >= 4) {
    p.box(3.95, 0.08, 3.95, C.rock, 0, base, 0);
    for (let i = 0; i < 3; i++) p.box(1.0, 0.14, 0.24, C.rock, 0, base - 0.08 - i * 0.14, 1.98 + i * 0.12);
  }
  const hallX = level >= 3 ? -0.35 : 0;
  const hallW = level >= 3 ? 2.9 : 3.0;
  // Nhà chính.
  const hall = { x: hallX, z: -0.1, w: hallW, d: 2.3, postH: 1.15 + base, roofL: hallW + 1.3, roofW: 2.7, lift: 1.0 };
  stiltHall(m, hall);
  p.box(0.52, 0.55, 0.06, C.woodDark, hallX, hall.postH + 0.33, 0.95);
  for (let i = 0; i < 4; i++) p.box(0.52, 0.06, 0.2, C.woodDark, hallX, hall.postH - 0.18 - i * 0.26, 1.2 + i * 0.18);
  if (level >= 2) {
    // Chim đồng hai đầu nóc, cờ đỏ hai bên.
    const roofTop = hall.postH + 0.68 + hall.roofW * 0.4 + hall.lift;
    bird(m, hallX + hall.roofL / 2 - 0.1, roofTop + 0.05, -0.1, 1, 1.1);
    bird(m, hallX - hall.roofL / 2 + 0.1, roofTop + 0.05, -0.1, -1, 1.1);
    banner(m, -1.7, 1.6, 2.6, C.red);
    drum(m, 1.45, 1.55, 1, base);
  }
  if (level >= 3) {
    // Chái nhà bên phải (phía camera nhìn tới), mái quay ngang.
    stiltHall(m, { x: 1.45, z: -0.3, w: 1.0, d: 1.5, postH: 0.95 + base, roofL: 1.9, roofW: 1.4, lift: 0.4, ry: Math.PI / 2 });
    drum(m, -1.05, 1.5, 0.7, base);
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
    banner(m, 1.75, 1.6, 2.8, C.red);
  }
  if (level >= 5) {
    // Mái tầng hai trên nóc, sống mái mạ đồng, hai trống lớn trước điện.
    const y2 = hall.postH + 0.68 + hall.roofW * 0.4 + 0.65;
    m.band.add(saddleRoof({ length: hallW * 0.8, width: 1.5, lift: 0.7, drop: 0.55, thickness: 0.08 }), C.thatch, hallX, y2, -0.1);
    p.box(hallW * 0.7, 0.07, 0.14, C.bronzeLight, hallX, y2 + 0.04, -0.1);
    drum(m, 0.6, 1.75, 1.15, base);
    drum(m, -0.5, 1.75, 1.15, base);
  }
  const g = m.group();
  g.scale.setScalar(sizeFor(level));
  return g;
}

// ---------- Ruộng lúa ----------

/** Con trâu chibi đứng nghỉ. */
function buffalo(p: ShapeBuilder, x: number, z: number): void {
  p.sphere(0.24, 0x4a4440, x, 0.32, z, [0.8, 0.7, 1.25], 8);
  for (const dx of [-0.1, 0.1]) for (const dz of [-0.15, 0.15]) p.cyl(0.045, 0.05, 0.24, 0x3a3532, x + dx, 0.12, z + dz, undefined, 5);
  p.sphere(0.13, 0x4a4440, x, 0.42, z + 0.3, [0.9, 0.85, 1.1], 7);
  for (const s of [-1, 1]) p.capsule(0.025, 0.18, 0xd8cbb0, x + s * 0.13, 0.52, z + 0.28, [0, 0, s * 1.1]);
}

export function makeRuong(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const bank = 0.12 + level * 0.02;
  for (const s of [-1, 1]) {
    p.box(2.95, bank, 0.2, C.soil, 0, bank / 2, s * 1.38);
    p.box(0.2, bank, 2.95, C.soil, s * 1.38, bank / 2, 0);
  }
  p.box(2.6, 0.04, 2.6, C.paddyWater, 0, 0.05, 0);
  const color = new THREE.Color(C.rice).lerp(new THREE.Color(C.ripe), (level - 1) / 4);
  const h = 0.16 + level * 0.07;
  // Cấp càng cao lúa càng dày và cao.
  const rows = Math.min(3 + level, 7);
  const step = 2.3 / rows;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < rows; j++) {
      const x = -1.15 + step * (i + 0.5);
      const z = -1.15 + step * (j + 0.5);
      if (level >= 3 && x > 0.55 && z > 0.55) continue;
      if (level >= 4 && x < -0.55 && z < -0.55) continue;
      p.cone(0.07 + level * 0.008, h, color, x, 0.06 + h / 2, z, undefined, 5);
    }
  }
  if (level >= 3) buffalo(p, 0.85, 0.8);
  if (level >= 4) {
    // Chòi canh ruộng.
    for (const x of [-1.1, -0.6]) for (const z of [-1.1, -0.6]) p.cyl(0.03, 0.03, 0.6, C.woodDark, x, 0.3, z, undefined, 5);
    p.box(0.6, 0.05, 0.6, C.wood, -0.85, 0.58, -0.85);
    p.cone(0.48, 0.36, C.thatch, -0.85, 0.8, -0.85, undefined, 6);
  }
  if (level >= 5) {
    // Bó lúa đã gặt dựng chụm vào nhau.
    for (const [x, z] of [[1.0, -1.0], [0.75, -1.05], [0.88, -0.78]] as const) {
      p.cyl(0.07, 0.11, 0.42, C.ripe, x, 0.25, z, [0.12, 0, 0.12], 6);
      p.cone(0.11, 0.18, C.bronzeLight, x, 0.52, z, undefined, 6);
    }
  }
  return m.group();
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
  for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.2]) p.cyl(0.06, 0.07, 0.45, C.woodDark, x, 0.22, z);
  p.box(1.95, 0.1, 1.45, C.woodLight, 0, 0.45, -0.25);
  // Cầu tàu chìa ra sông, cấp 3 trở lên dài hơn và có nhánh phụ.
  const jetty = level >= 3 ? 2.4 : 1.7;
  p.box(0.5, 0.08, jetty, C.wood, 0.55, 0.33, 0.45 + jetty / 2);
  for (let z = 0.9; z < 0.45 + jetty; z += 0.6) p.cyl(0.05, 0.05, 0.8, C.woodDark, 0.55, -0.05, z);
  if (level >= 3) p.box(0.9, 0.07, 0.4, C.wood, 0.05, 0.31, 1.9);
  stall(m, -0.45, -0.5, C.red, 3);
  if (level >= 2) stall(m, 0.45, -0.5, C.indigo, 2);
  if (level >= 4) {
    // Nhà kho ven sông.
    p.box(0.7, 0.5, 0.5, C.woodLight, -0.6, 0.75, 0.25);
    m.band.add(saddleRoof({ length: 1.0, width: 0.8, lift: 0.18, drop: 0.32, thickness: 0.05 }), C.thatch, -0.6, 1.3, 0.25);
  }
  if (level >= 5) {
    banner(m, 0.9, 0.35, 1.9, C.red);
    banner(m, 0.15, 0.35, 1.7, C.indigo);
  }
  const g = m.group();
  g.scale.setScalar(0.9 + 0.025 * level);
  return g;
}

// ---------- Nhà sàn ----------

/** Một nóc nhà sàn mái tròn. */
function domeHouse(m: ToonModel, x: number, z: number, s: number): void {
  const p = m.plain;
  const postH = 0.55 * s;
  for (const dx of [-0.32, 0.32]) for (const dz of [-0.28, 0.28]) p.cyl(0.045, 0.055, postH, C.woodDark, x + dx * s, postH / 2, z + dz * s, undefined, 6);
  p.box(0.95 * s, 0.08, 0.85 * s, C.wood, x, postH, z);
  m.band.cyl(0.4 * s, 0.42 * s, 0.32 * s, C.woodLight, x, postH + 0.17 * s, z, undefined, 12);
  domeRoof(m.band, 0.62 * s, 0.55 * s, C.thatch, x, postH + 0.3 * s, z);
  p.box(0.2 * s, 0.24 * s, 0.04, C.woodDark, x, postH + 0.14 * s, z + 0.4 * s);
}

export function makeNhaSan(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.95, 0.06, 1.95, C.soil, 0, 0.03, 0);
  if (level <= 2) {
    domeHouse(m, 0, 0, 1.15);
    if (level >= 2) {
      // Hiên trước, thang tre, chum nước.
      p.box(0.9, 0.06, 0.4, C.wood, 0, 0.6, 0.62);
      for (let i = 0; i < 3; i++) p.box(0.3, 0.04, 0.1, C.woodDark, 0, 0.45 - i * 0.16, 0.9 + i * 0.1);
      p.cyl(0.12, 0.09, 0.2, C.soil, -0.65, 0.12, 0.7, undefined, 8);
    }
  } else {
    domeHouse(m, 0.3, 0.3, 1.0);
    domeHouse(m, -0.5, -0.45, 0.75);
    if (level >= 5) domeHouse(m, 0.55, -0.55, 0.62);
  }
  if (level >= 4) {
    // Rào tre quanh vườn, luống rau.
    for (let i = 0; i < 9; i++) {
      const t = -0.9 + i * 0.225;
      p.cyl(0.02, 0.02, 0.3, C.bamboo, t, 0.15, 0.95, undefined, 4);
      p.cyl(0.02, 0.02, 0.3, C.bamboo, -0.95, 0.15, t, undefined, 4);
    }
    p.box(0.5, 0.06, 0.3, 0x5f7f3a, -0.55, 0.06, 0.65);
  }
  if (level >= 5) bird(m, 0.3, 1.3, 0.3, 1, 0.6);
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
  for (let i = 0; i < 2 + level; i++) {
    const x = -0.6 + rand() * 1.2;
    const z = -0.2 + rand() * 0.8;
    p.sphere(0.2 + rand() * 0.12, i % 2 ? C.rock : C.rockDark, x, 0.15, z, [1.2, 0.7, 1], 6);
  }
  if (level >= 2) for (let i = 0; i < 3; i++) p.box(0.32, 0.18, 0.24, C.rock, 0.55, 0.19 + i * 0.18, 0.55, [0, i * 0.3, 0]);
  if (level >= 3) {
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
  return m.group();
}

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
  const extra = new THREE.Group();
  p.box(1.95, 0.08, 1.95, C.earthDark, 0, 0.04, 0);
  kiln(m, extra, -0.4, 0.3, 1.2);
  // Lán mái một dốc phía sau che chỗ đe; cấp 4 lán dài hơn.
  const shedL = level >= 4 ? 1.6 : 1.0;
  for (const x of [0.85 - shedL, 0.85]) for (const z of [-0.85, -0.2]) p.cyl(0.04, 0.05, 1.0, C.woodDark, x, 0.5, z, undefined, 5);
  m.band.box(shedL + 0.25, 0.05, 0.85, C.thatch, 0.85 - shedL / 2, 1.02, -0.52, [-0.25, 0, 0]);
  p.box(0.3, 0.16, 0.16, C.iron, 0.45, 0.36, -0.45);
  p.box(0.12, 0.22, 0.12, C.woodDark, 0.45, 0.18, -0.45);
  if (level >= 2) {
    // Bễ thổi lửa cạnh lò và giá treo đồ.
    p.box(0.34, 0.14, 0.24, C.wood, 0.15, 0.15, 0.45);
    p.box(0.5, 0.04, 0.06, C.woodDark, 0.6, 0.85, -0.85);
    for (let i = 0; i < 3; i++) p.box(0.04, 0.3, 0.04, C.iron, 0.45 + i * 0.12, 0.68, -0.84);
  }
  if (level >= 3) kiln(m, extra, 0.55, 0.55, 0.75);
  if (level >= 5) {
    // Giá trưng giáo và rìu đồng.
    for (let i = 0; i < 4; i++) {
      p.cyl(0.015, 0.015, 0.9, C.woodDark, -0.85 + i * 0.13, 0.45, -0.8, undefined, 4);
      p.cone(0.035, 0.14, C.bronze, -0.85 + i * 0.13, 0.95, -0.8, undefined, 4);
    }
    p.box(0.16, 0.12, 0.03, C.bronze, -0.92, 0.7, -0.73, [0, 0, 0.5]);
  }
  const g = m.group();
  g.add(extra);
  g.scale.setScalar(sizeFor(level));
  return g;
}

// ---------- Kho thóc ----------

/** Một kho tròn trên cột cao (có đĩa chặn chuột), mái nón tranh. */
function granary(m: ToonModel, x: number, z: number, s: number, finial: boolean): void {
  const p = m.plain;
  const postH = 0.8 * s;
  for (const dx of [-0.25, 0.25]) for (const dz of [-0.25, 0.25]) {
    p.cyl(0.05, 0.06, postH, C.woodDark, x + dx * s, postH / 2, z + dz * s, undefined, 6);
    p.cyl(0.1 * s, 0.1 * s, 0.04, C.rock, x + dx * s, postH * 0.75, z + dz * s, undefined, 8);
  }
  p.cyl(0.42 * s, 0.42 * s, 0.06, C.wood, x, postH, z, undefined, 12);
  m.band.cyl(0.36 * s, 0.38 * s, 0.6 * s, C.woodLight, x, postH + 0.3 * s, z, undefined, 12);
  p.cone(0.58 * s, 0.62 * s, C.thatch, x, postH + 0.6 * s + 0.31 * s, z, undefined, 12);
  if (finial) {
    p.cyl(0.03, 0.03, 0.3 * s, C.bronze, x, postH + 1.3 * s, z, undefined, 5);
    p.sphere(0.08 * s, C.bronzeLight, x, postH + 1.45 * s, z, [1, 1, 1], 8);
  }
}

export function makeKho(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.95, 0.06, 1.95, C.soil, 0, 0.03, 0);
  if (level <= 2) granary(m, 0, 0, 1.15, false);
  else {
    granary(m, 0.32, 0.3, level >= 5 ? 1.05 : 0.95, level >= 5);
    granary(m, -0.5, -0.45, 0.72, false);
    if (level >= 4) granary(m, 0.55, -0.55, 0.6, false);
  }
  if (level >= 2) {
    // Thang tre và thúng thóc.
    for (const s of [-1, 1]) p.cyl(0.02, 0.02, 1.0, C.bamboo, -0.6 + s * 0.1, 0.5, 0.6, [0.35, 0, 0], 4);
    for (let i = 0; i < Math.min(level, 4); i++) {
      p.cyl(0.13, 0.1, 0.18, C.thatch, -0.75 + i * 0.25, 0.12, 0.85, undefined, 8);
      p.sphere(0.11, C.ripe, -0.75 + i * 0.25, 0.22, 0.85, [1, 0.5, 1], 6);
    }
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

export function makeChoiCanh(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const h = 1.5 + level * 0.25;
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
    m.band.add(saddleRoof({ length: 1.1, width: 1.0, lift: 0.18, drop: 0.3, thickness: 0.05 }), C.thatch, 0, h + 0.85, 0);
    p.box(0.25, 0.16, 0.02, C.red, 0.5, h + 0.95, 0.0);
  }
  if (level >= 5) {
    p.box(0.7, 0.05, 0.14, C.bronzeLight, 0, h + 0.88, 0);
    drum(m, -0.2, -0.2, 0.35, h + 0.03);
  }
  const g = m.group();
  const archer = makeFighter('cung');
  archer.scale.setScalar(0.62);
  archer.position.set(0, h + 0.05, 0.05);
  g.add(archer);
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
