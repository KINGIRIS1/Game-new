// Mô hình "Nét Đông Sơn": nhà sàn mái thuyền có chim đồng, trống đồng, người đội mũ lông chim.
// Gốc tọa độ của mỗi mô hình là tâm chân móng, mặt trước hướng +z.

import * as THREE from 'three';
import type { FighterKind } from '../game/battle';
import { C } from './palette';
import { ShapeBuilder, instanceTemplates, saddleRoof, seeded, type Placement } from './shapes';
import { ToonModel, inkThick, inkThin, outlineOf, toon } from './toon';

export type PersonKind = 'nong' | 'linh' | 'buon' | 'laiDo';

/** Một chỗ mọc cây, tọa độ thế giới. `seed` giữ cho mỗi cây khác nhau nhưng không đổi giữa các lần vẽ. */
export interface TreeSpot {
  x: number;
  z: number;
  kind: 'tree' | 'bamboo';
  seed: number;
}

/** Một đoạn lũy, tọa độ thế giới của tâm ô. Cấp 1 là lũy tre, cấp 2 là thành đất. */
export interface WallSpot {
  x: number;
  z: number;
  seed: number;
  level: number;
  /** Bị giặc phá, chỉ còn đống đổ nát. */
  damaged: boolean;
}

function bird(m: ToonModel, x: number, y: number, dir: number, s = 1): void {
  m.plain.capsule(0.06 * s, 0.22 * s, C.bronze, x, y, 0, [0, 0, Math.PI / 2]);
  m.plain.capsule(0.03 * s, 0.26 * s, C.bronze, x + dir * 0.2 * s, y + 0.12 * s, 0, [0, 0, -dir * 0.6]);
  m.plain.cone(0.03 * s, 0.22 * s, C.bronzeLight, x + dir * 0.4 * s, y + 0.2 * s, 0, [0, 0, -dir * Math.PI / 2]);
  m.plain.box(0.18 * s, 0.03, 0.14 * s, C.bronzeDark, x - dir * 0.16 * s, y + 0.06 * s, 0, [0, 0, dir * 0.6]);
}

function drum(m: ToonModel, x: number, z: number, s = 1): void {
  m.band.cyl(0.36 * s, 0.32 * s, 0.32 * s, C.bronze, x, 0.16 * s + 0.08, z, undefined, 16);
  m.drum.cyl(0.38 * s, 0.38 * s, 0.04 * s, 0xffffff, x, 0.34 * s + 0.08, z, undefined, 20);
}

export function makeDien(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(3.9, 0.16, 3.9, C.soil, 0, 0.08, 0);
  for (const x of [-1.3, 0, 1.3]) for (const z of [-0.9, 0, 0.9]) p.cyl(0.08, 0.1, 1.2, C.woodDark, x, 0.76, z);
  p.box(3.2, 0.14, 2.4, C.wood, 0, 1.4, 0);
  m.band.box(2.5, 0.7, 1.7, C.woodLight, 0, 1.82, -0.05);
  p.box(0.56, 0.56, 0.06, C.woodDark, 0, 1.76, 0.82);
  for (let i = 0; i < 5; i++) p.box(0.5, 0.06, 0.2, C.woodDark, 0, 1.3 - i * 0.26, 1.3 + i * 0.18);
  m.band.add(saddleRoof({ length: 4.7, width: 2.9, lift: 1.1, drop: 1.15, thickness: 0.12 }), C.thatch, 0, 3.15, -0.05);
  bird(m, 2.35, 4.35, 1, 1.2);
  bird(m, -2.35, 4.35, -1, 1.2);
  drum(m, 1.4, 1.6);
  p.cyl(0.035, 0.04, 2.6, C.woodDark, -1.65, 1.4, 1.5);
  for (let i = 0; i < 3; i++) p.box(0.05, 0.42, 0.04, i === 1 ? C.red : C.cream, -1.65 + (i - 1) * 0.1, 2.85, 1.5, [0, 0, (i - 1) * 0.4]);
  if (level >= 3) {
    p.box(0.9, 0.1, 1.8, C.wood, -1.95, 1.0, 0);
    drum(m, -1.0, 1.65, 0.75);
  }
  if (level >= 4) {
    for (const x of [-0.65, 0.65]) {
      p.cyl(0.03, 0.04, 1.5, C.woodDark, x, 0.85, 1.95);
      for (let i = 0; i < 3; i++) p.box(0.05, 0.3, 0.03, i === 1 ? C.red : C.cream, x + (i - 1) * 0.08, 1.7, 1.95, [0, 0, (i - 1) * 0.45]);
    }
  }
  if (level >= 5) p.box(1.4, 0.05, 0.16, C.bronzeLight, 0, 3.2, -0.05);
  const g = m.group();
  g.scale.setScalar(0.9 + 0.04 * level);
  return g;
}

export function makeRuong(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  for (const s of [-1, 1]) {
    p.box(2.95, 0.14, 0.18, C.soil, 0, 0.07, s * 1.38);
    p.box(0.18, 0.14, 2.95, C.soil, s * 1.38, 0.07, 0);
  }
  p.box(2.6, 0.12, 0.14, C.soil, 0, 0.06, 0);
  p.box(2.6, 0.04, 2.6, C.paddyWater, 0, 0.05, 0);
  const color = new THREE.Color(C.rice).lerp(new THREE.Color(C.ripe), (level - 1) / 4);
  const h = 0.24 + level * 0.05;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (j === 2) continue;
      p.cone(0.09, h, color, -1.0 + i * 0.5, 0.06 + h / 2, -1.0 + j * 0.5, undefined, 5);
    }
  }
  return m.group();
}

export function makeBen(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.2]) p.cyl(0.06, 0.07, 0.45, C.woodDark, x, 0.22, z);
  p.box(1.95, 0.1, 1.45, C.woodLight, 0, 0.45, -0.25);
  p.box(0.5, 0.08, 1.7, C.wood, 0.55, 0.33, 1.3);
  for (const z of [0.9, 1.6, 2.1]) p.cyl(0.05, 0.05, 0.8, C.woodDark, 0.55, -0.05, z);
  m.band.box(0.95, 0.5, 0.72, C.woodLight, -0.4, 0.75, -0.45);
  m.band.add(saddleRoof({ length: 1.6, width: 1.0, lift: 0.35, drop: 0.4, thickness: 0.06 }), C.thatch, -0.4, 1.42, -0.45);
  p.cyl(0.15, 0.11, 0.16, C.thatch, 0.45, 0.58, -0.6);
  p.cyl(0.13, 0.1, 0.24, C.soil, 0.75, 0.62, -0.25);
  if (level >= 2) p.cyl(0.15, 0.11, 0.16, C.thatch, 0.15, 0.58, 0.15);
  if (level >= 3) {
    p.cyl(0.03, 0.035, 1.2, C.woodDark, 0.9, 1.05, 0.35);
    p.box(0.4, 0.24, 0.03, C.red, 0.68, 1.48, 0.35);
  }
  if (level >= 4) p.cyl(0.13, 0.1, 0.24, C.soil, -0.85, 0.62, 0.25);
  if (level >= 5) drum(m, 0.1, -0.1, 0.5);
  return m.group();
}

export function makePerson(kind: PersonKind): THREE.Object3D {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  for (const x of [-0.06, 0.06]) p.cyl(0.04, 0.045, 0.18, C.skin, x, 0.09, 0, undefined, 6);
  m.band.cyl(0.13, 0.17, 0.24, kind === 'buon' ? C.indigo : C.red, 0, 0.28, 0, undefined, 8);
  p.cyl(0.1, 0.12, 0.14, C.skin, 0, 0.45, 0, undefined, 8);
  for (const s of [-1, 1]) p.cyl(0.035, 0.035, 0.22, C.skin, s * 0.15, 0.38, 0, [0, 0, s * 0.35], 6);
  p.sphere(0.23, C.skin, 0, 0.7, 0, [1, 0.95, 0.95], 14);
  p.sphere(0.24, C.hair, 0, 0.78, -0.04, [1, 0.62, 0.98], 14);
  for (const s of [-1, 1]) p.sphere(0.03, C.ink, s * 0.08, 0.69, 0.2, [1, 1.4, 0.5], 8);
  // Mũ lông chim như hình người trên mặt trống đồng.
  for (let i = -2; i <= 2; i++) {
    p.box(0.06, 0.38, 0.03, i % 2 ? C.cream : C.red, i * 0.06, 1.06, -0.06, [0, 0, -i * 0.28]);
  }
  if (kind === 'linh') {
    p.cyl(0.018, 0.018, 1.15, C.woodDark, 0.24, 0.6, 0.06, undefined, 6);
    p.cone(0.05, 0.2, C.bronze, 0.24, 1.25, 0.06, undefined, 4);
  }
  if (kind === 'buon') p.cyl(0.17, 0.12, 0.1, C.thatch, 0, 0.98, 0.05, undefined, 10);
  if (kind === 'nong') p.cyl(0.016, 0.016, 0.65, C.woodDark, -0.22, 0.34, 0.08, [0.35, 0, 0], 6);
  if (kind === 'laiDo') p.cyl(0.016, 0.016, 0.75, C.woodDark, 0.2, 0.38, 0.12, [0.9, 0, 0], 6);
  return m.group();
}

/** Nhà sàn của dân: bốn cột, sàn gỗ, mái thuyền nhỏ, thang tre. */
export function makeNhaSan(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.9, 0.08, 1.9, C.soil, 0, 0.04, 0);
  for (const x of [-0.6, 0.6]) for (const z of [-0.5, 0.5]) p.cyl(0.06, 0.07, 0.8, C.woodDark, x, 0.44, z);
  p.box(1.5, 0.1, 1.2, C.wood, 0, 0.88, 0);
  m.band.box(1.2, 0.5, 0.9, C.woodLight, 0, 1.18, -0.02);
  p.box(0.32, 0.38, 0.05, C.woodDark, 0.2, 1.12, 0.44);
  for (let i = 0; i < 3; i++) p.box(0.32, 0.05, 0.12, C.woodDark, 0.2, 0.7 - i * 0.24, 0.72 + i * 0.12);
  m.band.add(saddleRoof({ length: 2.2, width: 1.6, lift: 0.45, drop: 0.62, thickness: 0.07 }), C.thatch, 0, 2.0, -0.02);
  p.cyl(0.13, 0.1, 0.22, C.soil, -0.65, 0.19, 0.7, undefined, 8);
  if (level >= 3) p.box(0.5, 0.06, 1.2, C.wood, -0.95, 0.7, 0);
  if (level >= 4) bird(m, 1.05, 2.5, 1, 0.7);
  const g = m.group();
  g.scale.setScalar(0.88 + 0.05 * level);
  return g;
}

/** Bãi đất đá: đống đá, khối đá đã đẽo, thúng đất, khung tời gỗ ở cấp cao. */
export function makeBaiDa(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.95, 0.1, 1.95, C.earth, 0, 0.05, 0);
  const rand = seeded(17);
  const piles = 2 + Math.min(level, 4);
  for (let i = 0; i < piles; i++) {
    const x = -0.55 + rand() * 1.1;
    const z = -0.55 + rand() * 0.8;
    p.sphere(0.22 + rand() * 0.12, i % 2 ? C.rock : C.rockDark, x, 0.16, z, [1.2, 0.7, 1], 6);
  }
  for (let i = 0; i < 3; i++) p.box(0.32, 0.18, 0.24, C.rock, 0.5, 0.19 + i * 0.18, 0.55, [0, i * 0.3, 0]);
  p.cyl(0.16, 0.12, 0.16, C.thatch, -0.6, 0.18, 0.62, undefined, 8);
  p.sphere(0.13, C.earthDark, -0.6, 0.27, 0.62, [1, 0.5, 1], 6);
  p.cyl(0.02, 0.02, 0.6, C.woodDark, -0.2, 0.3, 0.75, [0.5, 0, 0.3], 5);
  p.box(0.16, 0.05, 0.05, C.iron, -0.2, 0.58, 0.88, [0.5, 0, 0.3]);
  if (level >= 3) {
    // Khung tời gỗ hình chữ A để kéo đá.
    for (const s of [-1, 1]) p.cyl(0.035, 0.04, 1.5, C.woodDark, s * 0.35, 0.72, -0.6, [0, 0, s * 0.3], 5);
    p.cyl(0.03, 0.03, 0.9, C.wood, 0, 1.35, -0.6, [0, 0, Math.PI / 2], 5);
    p.box(0.22, 0.2, 0.2, C.rock, 0, 0.85, -0.6);
  }
  return m.group();
}

/** Lò rèn: lán mái tranh, lò đất nung có lửa, đe sắt, bễ thổi lửa, thanh sắt. */
export function makeLoRen(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.95, 0.1, 1.95, C.earthDark, 0, 0.05, 0);
  for (const x of [-0.75, 0.75]) for (const z of [-0.7, 0.7]) p.cyl(0.05, 0.06, 1.2, C.woodDark, x, 0.65, z);
  m.band.add(saddleRoof({ length: 2.2, width: 1.9, lift: 0.35, drop: 0.5, thickness: 0.06 }), C.thatch, 0, 1.68, 0);
  p.cyl(0.3, 0.38, 0.6, C.soil, -0.35, 0.4, -0.25, undefined, 10);
  p.cyl(0.18, 0.22, 0.12, C.earthDark, -0.35, 0.74, -0.25, undefined, 10);
  p.box(0.3, 0.16, 0.16, C.iron, 0.4, 0.38, 0.2);
  p.box(0.12, 0.22, 0.12, C.woodDark, 0.4, 0.2, 0.2);
  p.box(0.36, 0.16, 0.26, C.wood, -0.35, 0.18, 0.45);
  for (let i = 0; i < level + 1; i++) p.box(0.5, 0.05, 0.06, C.iron, 0.45, 0.13 + i * 0.06, -0.55);
  const g = m.group();
  // Lửa lò: không chịu ánh sáng để trông như phát sáng, World làm nó bập bùng.
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 6), new THREE.MeshBasicMaterial({ color: C.fire }));
  flame.position.set(-0.35, 0.95, -0.25);
  flame.userData.flame = true;
  const ember = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), new THREE.MeshBasicMaterial({ color: C.ember }));
  ember.position.set(-0.35, 0.92, -0.25);
  ember.userData.flame = true;
  g.add(flame, ember);
  g.scale.setScalar(0.92 + 0.04 * level);
  return g;
}

/** Kho thóc: sàn cao trên cột cho khỏi chuột và ẩm, mái thuyền phủ thấp, thúng thóc. */
export function makeKho(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(1.9, 0.08, 1.9, C.soil, 0, 0.04, 0);
  for (const x of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) {
    p.cyl(0.07, 0.08, 1.0, C.woodDark, x, 0.54, z);
    p.cyl(0.12, 0.12, 0.05, C.rock, x, 0.9, z);
  }
  p.box(1.3, 0.1, 1.3, C.wood, 0, 1.05, 0);
  m.band.box(1.1, 0.55, 1.1, C.woodLight, 0, 1.38, 0);
  m.band.add(saddleRoof({ length: 1.9, width: 1.7, lift: 0.5, drop: 0.75, thickness: 0.07 }), C.thatch, 0, 2.28, 0);
  for (let i = 0; i < Math.min(level + 1, 4); i++) {
    const a = i * 1.7;
    p.cyl(0.14, 0.11, 0.2, C.thatch, Math.cos(a) * 0.75, 0.18, 0.75 + Math.sin(a) * 0.1, undefined, 8);
    p.sphere(0.12, C.ripe, Math.cos(a) * 0.75, 0.28, 0.75 + Math.sin(a) * 0.1, [1, 0.5, 1], 6);
  }
  const g = m.group();
  g.scale.setScalar(0.88 + 0.05 * level);
  return g;
}

/** Doanh trại: nhà dài mái thuyền, giá giáo, trống trận, cờ, bãi tập có cọc rơm. */
export function makeDoanhTrai(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.box(2.9, 0.1, 2.9, C.earth, 0, 0.05, 0);
  for (const x of [-1.0, 0, 1.0]) for (const z of [-0.9, -0.1]) p.cyl(0.06, 0.07, 0.6, C.woodDark, x, 0.34, z);
  p.box(2.5, 0.1, 1.2, C.wood, 0, 0.66, -0.5);
  m.band.box(2.2, 0.5, 0.9, C.woodLight, 0, 0.96, -0.55);
  m.band.add(saddleRoof({ length: 3.2, width: 1.8, lift: 0.6, drop: 0.7, thickness: 0.08 }), C.thatch, 0, 1.92, -0.55);
  // Giá giáo đồng.
  p.box(0.9, 0.05, 0.06, C.woodDark, -0.6, 0.85, 0.75);
  p.box(0.9, 0.05, 0.06, C.woodDark, -0.6, 0.35, 0.75);
  for (let i = 0; i < 5; i++) {
    p.cyl(0.015, 0.015, 1.2, C.woodDark, -0.95 + i * 0.18, 0.62, 0.75, undefined, 5);
    p.cone(0.04, 0.16, C.bronze, -0.95 + i * 0.18, 1.3, 0.75, undefined, 4);
  }
  // Cọc rơm tập đâm.
  for (const x of [0.6, 1.05]) {
    p.cyl(0.03, 0.03, 0.8, C.woodDark, x, 0.4, 0.75, undefined, 5);
    p.cyl(0.13, 0.13, 0.36, C.thatch, x, 0.62, 0.75, undefined, 7);
  }
  drum(m, 1.1, -1.05, 0.7);
  p.cyl(0.03, 0.035, 2.4, C.woodDark, -1.3, 1.2, 1.25);
  p.box(0.6, 0.36, 0.03, C.red, -1.0, 2.15, 1.25);
  if (level >= 3) bird(m, 1.6, 2.55, 1, 0.8);
  if (level >= 4) for (const x of [-0.2, 0.2]) p.cyl(0.03, 0.03, 1.6, C.woodDark, x, 0.8, 1.35);
  const g = m.group();
  g.scale.setScalar(0.92 + 0.03 * level);
  return g;
}

/** Chòi canh: bốn cột cao chụm lại, sàn có lan can, mái nhỏ, cung thủ đứng gác. */
export function makeChoiCanh(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const h = 1.9 + level * 0.12;
  for (const x of [-0.32, 0.32]) {
    for (const z of [-0.32, 0.32]) p.cyl(0.04, 0.05, h + 0.1, C.woodDark, x * 0.85, h / 2, z * 0.85, [z * 0.08, 0, -x * 0.08], 5);
  }
  for (const y of [h * 0.35, h * 0.7]) {
    p.box(0.62, 0.04, 0.04, C.wood, 0, y, 0.28);
    p.box(0.62, 0.04, 0.04, C.wood, 0, y, -0.28);
  }
  p.box(0.8, 0.07, 0.8, C.wood, 0, h, 0);
  for (const s of [-1, 1]) {
    p.box(0.8, 0.18, 0.04, C.woodLight, 0, h + 0.12, s * 0.38);
    p.box(0.04, 0.18, 0.8, C.woodLight, s * 0.38, h + 0.12, 0);
  }
  for (const x of [-0.36, 0.36]) for (const z of [-0.36, 0.36]) p.cyl(0.025, 0.025, 0.7, C.woodDark, x, h + 0.35, z, undefined, 5);
  m.band.add(saddleRoof({ length: 1.1, width: 1.0, lift: 0.18, drop: 0.3, thickness: 0.05 }), C.thatch, 0, h + 0.85, 0);
  const g = m.group();
  const archer = makeFighter('cung');
  archer.scale.setScalar(0.62);
  archer.position.set(0, h + 0.05, 0.05);
  g.add(archer);
  return g;
}

/** Bẫy chông: hố đất cắm chông tre vót nhọn. */
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

/** Con voi chiến có Lạc tướng cưỡi. */
function elephant(m: ToonModel): void {
  const p = m.plain;
  p.sphere(0.42, C.elephant, 0, 0.72, 0, [0.85, 0.8, 1.2], 12);
  for (const x of [-0.2, 0.2]) for (const z of [-0.28, 0.28]) p.cyl(0.11, 0.12, 0.5, C.elephant, x, 0.25, z, undefined, 7);
  p.sphere(0.27, C.elephant, 0, 0.92, 0.48, [1, 1, 0.95], 10);
  for (const s of [-1, 1]) p.sphere(0.2, C.elephant, s * 0.26, 0.95, 0.4, [0.35, 1, 0.9], 8);
  for (let i = 0; i < 4; i++) p.cyl(0.07 - i * 0.01, 0.08 - i * 0.01, 0.2, C.elephant, 0, 0.78 - i * 0.16, 0.7 + i * 0.03, [0.15 * i, 0, 0], 6);
  for (const s of [-1, 1]) p.cone(0.03, 0.26, C.cream, s * 0.1, 0.72, 0.68, [1.2, 0, 0], 5);
  m.band.box(0.62, 0.08, 0.7, C.red, 0, 1.05, -0.05);
  for (const s of [-1, 1]) p.sphere(0.035, C.ink, s * 0.15, 1.02, 0.66, [1, 1, 0.5], 6);
}

/** Cỗ chiến xa của giặc Ân: hai bánh lớn, thùng xe, một con ngựa kéo. */
function chariot(m: ToonModel): void {
  const p = m.plain;
  for (const s of [-1, 1]) {
    p.cyl(0.36, 0.36, 0.05, C.woodDark, s * 0.38, 0.36, -0.15, [0, 0, Math.PI / 2], 12);
    p.cyl(0.07, 0.07, 0.12, C.bronze, s * 0.4, 0.36, -0.15, [0, 0, Math.PI / 2], 6);
  }
  p.cyl(0.03, 0.03, 0.86, C.woodDark, 0, 0.36, -0.15, [0, 0, Math.PI / 2], 5);
  m.band.box(0.62, 0.26, 0.46, C.enemyRed, 0, 0.55, -0.15);
  p.cyl(0.025, 0.025, 1.0, C.woodDark, 0, 0.45, 0.4, [Math.PI / 2, 0, 0], 5);
  // Ngựa.
  p.sphere(0.24, C.horse, 0, 0.62, 0.95, [0.75, 0.8, 1.35], 10);
  for (const x of [-0.1, 0.1]) for (const z of [0.78, 1.12]) p.cyl(0.04, 0.045, 0.45, C.horse, x, 0.22, z, undefined, 6);
  p.cyl(0.08, 0.1, 0.36, C.horse, 0, 0.86, 1.22, [-0.6, 0, 0], 7);
  p.box(0.14, 0.14, 0.3, C.horse, 0, 1.0, 1.38);
  p.box(0.06, 0.18, 0.2, C.ink, 0, 1.0, 1.18);
}

/**
 * Lính trong trận. Quân ta đội mũ lông chim như trên trống đồng,
 * giặc Ân mặc áo sẫm, đội mũ trụ đồng, cầm qua (giáo móc).
 */
export function makeFighter(kind: FighterKind): THREE.Group {
  const enemy = kind === 'giaoAn' || kind === 'cungAn' || kind === 'chienXa';
  const m = new ToonModel(inkThin);
  const p = m.plain;
  if (kind === 'voi') elephant(m);
  if (kind === 'chienXa') chariot(m);
  // Người: đứng đất, hoặc ngồi trên voi / đứng trên xe.
  const y0 = kind === 'voi' ? 1.0 : kind === 'chienXa' ? 0.5 : 0;
  const z0 = kind === 'chienXa' ? -0.15 : kind === 'voi' ? -0.1 : 0;
  const cloth = enemy ? C.enemyCloth : C.red;
  for (const x of [-0.06, 0.06]) p.cyl(0.04, 0.045, 0.18, C.skin, x, y0 + 0.09, z0, undefined, 6);
  m.band.cyl(0.13, 0.17, 0.24, cloth, 0, y0 + 0.28, z0, undefined, 8);
  p.cyl(0.1, 0.12, 0.14, enemy ? C.enemyRed : C.skin, 0, y0 + 0.45, z0, undefined, 8);
  for (const s of [-1, 1]) p.cyl(0.035, 0.035, 0.22, C.skin, s * 0.15, y0 + 0.38, z0, [0, 0, s * 0.35], 6);
  p.sphere(0.21, C.skin, 0, y0 + 0.68, z0, [1, 0.95, 0.95], 12);
  for (const s of [-1, 1]) p.sphere(0.028, C.ink, s * 0.075, y0 + 0.67, z0 + 0.18, [1, 1.4, 0.5], 6);
  if (enemy) {
    // Mũ trụ đồng có chóp.
    p.sphere(0.23, C.bronze, 0, y0 + 0.76, z0 - 0.02, [1, 0.6, 1], 10);
    p.cone(0.05, 0.16, C.bronzeDark, 0, y0 + 0.95, z0, undefined, 5);
  } else {
    p.sphere(0.22, C.hair, 0, y0 + 0.76, z0 - 0.04, [1, 0.62, 0.98], 12);
    for (let i = -2; i <= 2; i++) p.box(0.055, 0.34, 0.03, i % 2 ? C.cream : C.red, i * 0.055, y0 + 1.02, z0 - 0.06, [0, 0, -i * 0.28]);
  }
  const archer = kind === 'cung' || kind === 'cungAn';
  if (archer) {
    // Cung cong ghép từ ba đoạn.
    for (const [dy, rz] of [[0.2, 0.5], [0, 0], [-0.2, -0.5]] as const) {
      p.box(0.03, 0.22, 0.03, C.woodDark, 0.24 + Math.abs(dy) * -0.25, y0 + 0.42 + dy, z0 + 0.12, [0, 0, rz]);
    }
    p.box(0.01, 0.56, 0.01, C.cream, 0.27, y0 + 0.42, z0 + 0.12);
    p.cyl(0.05, 0.05, 0.36, enemy ? C.enemyRed : C.woodLight, -0.1, y0 + 0.5, z0 - 0.16, [0.3, 0, 0], 6);
  } else if (kind === 'giao' || kind === 'voi') {
    p.cyl(0.018, 0.018, 1.15, C.woodDark, 0.24, y0 + 0.55, z0 + 0.06, undefined, 5);
    p.cone(0.05, 0.2, C.bronze, 0.24, y0 + 1.2, z0 + 0.06, undefined, 4);
    if (kind === 'giao') m.drum.cyl(0.17, 0.17, 0.04, 0xffffff, -0.2, y0 + 0.4, z0 + 0.1, [Math.PI / 2, 0, 0.2], 12);
  } else {
    // Qua: giáo có lưỡi ngang.
    p.cyl(0.018, 0.018, 1.1, C.woodDark, 0.24, y0 + 0.55, z0 + 0.06, undefined, 5);
    p.box(0.22, 0.06, 0.03, C.bronze, 0.33, y0 + 1.02, z0 + 0.06);
  }
  return m.group();
}

/** Thuyền như trên trống đồng: mũi và đuôi cong vút, đầu chim. */
export function makeBoat(): THREE.Object3D {
  const m = new ToonModel();
  const p = m.plain;
  m.band.box(1.3, 0.16, 0.38, C.woodDark, 0, 0.08, 0);
  for (const dir of [1, -1]) {
    p.box(0.42, 0.1, 0.3, C.woodDark, dir * 0.78, 0.2, 0, [0, 0, dir * 0.6]);
    p.box(0.12, 0.26, 0.12, C.woodDark, dir * 0.98, 0.42, 0);
    p.cone(0.04, 0.16, C.bronze, dir * 1.08, 0.5, 0, [0, 0, -dir * Math.PI / 2], 4);
  }
  p.box(0.5, 0.24, 0.42, C.thatch, -0.1, 0.28, 0);
  const g = m.group();
  const rower = makePerson('laiDo');
  rower.scale.setScalar(0.75);
  rower.position.set(-0.55, 0.12, 0);
  rower.rotation.y = Math.PI / 2;
  g.add(rower);
  return g;
}

// ---------- Cây cối ----------

function treeTemplates(): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  // 0: cây tán tầng cách điệu.
  let b = new ShapeBuilder();
  b.cyl(0.06, 0.1, 0.7, C.trunk, 0, 0.35, 0, undefined, 6);
  b.cone(0.55, 0.45, C.leaf[2], 0, 0.85, 0, undefined, 7);
  b.cone(0.42, 0.4, C.leaf[1], 0, 1.15, 0, undefined, 7);
  b.cone(0.28, 0.36, C.leaf[3], 0, 1.43, 0, undefined, 7);
  out.push(b.mesh(toon));
  // 1: cây tán dẹt.
  b = new ShapeBuilder();
  b.cyl(0.06, 0.1, 0.9, C.trunk, 0, 0.45, 0, undefined, 6);
  b.sphere(0.5, C.leaf[0], 0, 1.05, 0, [1.2, 0.55, 1.2], 9);
  b.sphere(0.34, C.leaf[3], 0.05, 1.32, 0, [1.1, 0.5, 1.1], 9);
  out.push(b.mesh(toon));
  // 2: cây cau.
  b = new ShapeBuilder();
  b.cyl(0.035, 0.055, 1.9, C.palm, 0, 0.95, 0, undefined, 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.box(0.6, 0.03, 0.12, C.leaf[i % 3], Math.cos(a) * 0.28, 1.84, Math.sin(a) * 0.28, [0, -a, -0.45]);
  }
  out.push(b.mesh(toon));
  // 3: bụi tre.
  out.push(bambooClump(5, 2.1, 4, false));
  return out;
}

function bambooClump(stalks: number, height: number, seed: number, mound: boolean): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  if (mound) b.box(0.96, 0.12, 0.96, C.soil, 0, 0.06, 0);
  for (let i = 0; i < stalks; i++) {
    const x = (rand() - 0.5) * 0.55;
    const z = (rand() - 0.5) * 0.55;
    const h = height * (0.8 + rand() * 0.3);
    b.cyl(0.035, 0.04, h, C.bamboo, x, h / 2, z, undefined, 5);
    for (let k = 1; k < 4; k++) b.cyl(0.045, 0.045, 0.03, C.bronzeDark, x, (h * k) / 4, z, undefined, 5);
    for (let l = 0; l < 4; l++) {
      const a = rand() * Math.PI * 2;
      b.box(0.36, 0.02, 0.08, C.leaf[(i + l) % 4], x + Math.cos(a) * 0.15, h - l * 0.2, z + Math.sin(a) * 0.15, [0, -a, -0.5]);
    }
  }
  return b.mesh(toon);
}

/** Thành đất đắp: các lớp đất nện thu nhỏ dần lên trên, cắm cọc tre vót nhọn. */
function earthWall(seed: number): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  b.box(1.0, 0.36, 1.0, C.earthDark, 0, 0.18, 0);
  b.box(0.9, 0.34, 0.9, C.earth, 0, 0.53, 0);
  b.box(0.78, 0.26, 0.78, C.earthDark, 0, 0.83, 0);
  for (let i = 0; i < 4; i++) {
    const x = (rand() - 0.5) * 0.5;
    const z = (rand() - 0.5) * 0.5;
    b.cone(0.04, 0.4, C.bamboo, x, 1.15, z, [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3], 4);
  }
  return b.mesh(toon);
}

/** Đoạn lũy bị phá: mô đất thấp, vài cây tre gãy nằm ngổn ngang. */
function wallRubble(): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  b.box(0.9, 0.12, 0.9, C.earthDark, 0, 0.06, 0);
  b.cyl(0.035, 0.04, 0.8, C.bamboo, -0.1, 0.18, 0, [0, 0.4, Math.PI / 2 - 0.15], 5);
  b.cyl(0.035, 0.04, 0.6, C.bamboo, 0.15, 0.16, 0.2, [0, -0.6, Math.PI / 2 + 0.1], 5);
  b.cone(0.04, 0.3, C.bamboo, -0.25, 0.25, -0.2, [0.4, 0, 0.3], 4);
  return b.mesh(toon);
}

let cachedTrees: THREE.Mesh[] | null = null;
let cachedWalls: THREE.Mesh[] | null = null;
const treeOutline = (geo: THREE.BufferGeometry) => outlineOf(geo, inkThick);

/** Dựng cả một khu rừng. Mỗi mẫu cây là một InstancedMesh có viền mực. */
export function buildForest(spots: TreeSpot[]): THREE.Object3D {
  cachedTrees ??= treeTemplates();
  const placements: Placement[] = spots.map((s) => {
    const r = seeded(s.seed);
    const pick = r();
    const t = s.kind === 'bamboo' ? 3 : pick < 0.45 ? 0 : pick < 0.75 ? 1 : 2;
    return { t, x: s.x, z: s.z, s: 0.85 + r() * 0.3, ry: r() * Math.PI * 2 };
  });
  return instanceTemplates(cachedTrees, placements, treeOutline);
}

/** Dựng toàn bộ lũy: lũy tre là bụi tre trên mô đất, thành đất là khối đất nện, xoay ngẫu nhiên. */
export function buildWalls(spots: WallSpot[]): THREE.Object3D {
  cachedWalls ??= [bambooClump(5, 1.7, 3, true), bambooClump(5, 1.8, 9, true), earthWall(5), earthWall(11), wallRubble()];
  return instanceTemplates(
    cachedWalls,
    spots.map((s) => ({
      t: s.damaged ? 4 : (s.level >= 2 ? 2 : 0) + (s.seed % 2),
      x: s.x,
      z: s.z,
      s: 1,
      ry: (s.seed % 4) * (Math.PI / 2),
    })),
    treeOutline,
  );
}
