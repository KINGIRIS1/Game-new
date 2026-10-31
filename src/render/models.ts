// Mô hình "Nét Đông Sơn": người, lính, thuyền, cây cối và lũy. Công trình nằm ở buildings.ts.
// Gốc tọa độ của mỗi mô hình là tâm chân móng, mặt trước hướng +z.

import * as THREE from 'three';
import type { FighterKind } from '../game/battle';
import type { GiongLook } from '../game/giong';
import { C } from './palette';
import { ShapeBuilder, instanceTemplates, seeded, type Placement } from './shapes';
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
 * Phó tướng Ân mặc giáp đỏ, mũ trụ có chùm lông đỏ cao, khoác áo choàng, cầm rìu lớn.
 */
export function makeFighter(kind: FighterKind): THREE.Group {
  if (kind === 'giong') return makeGiong('trangSi');
  const boss = kind === 'phoTuong' || kind === 'daiTuong';
  const enemy = kind === 'giaoAn' || kind === 'cungAn' || kind === 'chienXa' || boss;
  const onCart = kind === 'chienXa' || kind === 'daiTuong';
  const m = new ToonModel(inkThin);
  const p = m.plain;
  if (kind === 'voi') elephant(m);
  if (onCart) chariot(m);
  // Người: đứng đất, hoặc ngồi trên voi / đứng trên xe. Đại tướng Ân đứng trên chiến xa.
  const y0 = kind === 'voi' ? 1.0 : onCart ? 0.5 : 0;
  const z0 = onCart ? -0.15 : kind === 'voi' ? -0.1 : 0;
  const cloth = enemy ? C.enemyCloth : C.red;
  for (const x of [-0.06, 0.06]) p.cyl(0.04, 0.045, 0.18, C.skin, x, y0 + 0.09, z0, undefined, 6);
  m.band.cyl(0.13, 0.17, 0.24, cloth, 0, y0 + 0.28, z0, undefined, 8);
  p.cyl(0.1, 0.12, 0.14, enemy ? C.enemyRed : C.skin, 0, y0 + 0.45, z0, undefined, 8);
  for (const s of [-1, 1]) p.cyl(0.035, 0.035, 0.22, C.skin, s * 0.15, y0 + 0.38, z0, [0, 0, s * 0.35], 6);
  p.sphere(0.21, C.skin, 0, y0 + 0.68, z0, [1, 0.95, 0.95], 12);
  for (const s of [-1, 1]) p.sphere(0.028, C.ink, s * 0.075, y0 + 0.67, z0 + 0.18, [1, 1.4, 0.5], 6);
  if (boss) {
    // Đại tướng mặc giáp đồng, chùm lông vàng; phó tướng giáp đỏ, chùm lông đỏ.
    const big = kind === 'daiTuong';
    m.band.cyl(0.19, 0.21, 0.2, big ? C.bronzeDark : C.enemyRed, 0, y0 + 0.44, z0, undefined, 10);
    p.box(0.5, 0.5, 0.04, C.enemyRed, 0, y0 + 0.42, z0 - 0.2, [0.15, 0, 0]);
    p.sphere(0.24, big ? C.bronzeLight : C.bronze, 0, y0 + 0.76, z0 - 0.02, [1, 0.65, 1], 10);
    p.cone(0.09, big ? 0.55 : 0.42, big ? C.ember : C.red, 0, y0 + 1.1, z0 - 0.04, [-0.25, 0, 0], 6);
    for (const s of [-1, 1]) p.cone(0.04, 0.2, C.bronzeLight, s * 0.2, y0 + 0.9, z0, [0, 0, -s * 0.6], 5);
  } else if (enemy) {
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
  } else if (boss) {
    // Rìu đồng lưỡi lớn.
    p.cyl(0.025, 0.025, 1.2, C.woodDark, 0.26, y0 + 0.6, z0 + 0.06, undefined, 5);
    p.box(0.06, 0.34, 0.3, C.bronze, 0.3, y0 + 1.05, z0 + 0.2);
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

/** Lều trại giặc Ân: mái vải sẫm căng trên cột, viền đỏ. */
export function makeTent(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.cone(0.9, 1.1, C.enemyCloth, 0, 0.55, 0, undefined, 6);
  m.band.cyl(0.92, 0.92, 0.12, C.enemyRed, 0, 0.08, 0, undefined, 6);
  p.cyl(0.03, 0.03, 0.4, C.woodDark, 0, 1.25, 0, undefined, 5);
  p.box(0.36, 0.22, 0.02, C.enemyRed, 0.18, 1.35, 0);
  return m.group();
}

/** Cờ lớn của giặc Ân cắm trên cột. */
export function makeEnemyFlag(h = 2.4): THREE.Group {
  const m = new ToonModel(inkThin);
  m.plain.cyl(0.04, 0.05, h, C.woodDark, 0, h / 2, 0, undefined, 6);
  m.band.box(0.7, 0.5, 0.03, C.enemyRed, 0.36, h - 0.3, 0);
  m.plain.cone(0.06, 0.16, C.bronze, 0, h + 0.08, 0, undefined, 5);
  return m.group();
}

/** Ngọn núi xa, đỉnh có mỏm đá. */
export function makeMountain(r: number, h: number, color: number): THREE.Group {
  const m = new ToonModel();
  m.plain.cone(r, h, color, 0, h / 2, 0, undefined, 9);
  m.plain.cone(r * 0.35, h * 0.3, C.rock, 0, h * 0.87, 0, undefined, 7);
  return m.group();
}

const IRON = 0x6c6d71;
const IRON_DARK = 0x45464a;

/** Ngựa sắt của Gióng: thân sắt xám, bờm và đuôi là lửa. Gốc ở chân, đầu hướng +z. */
export function ironHorse(m: ToonModel): void {
  const p = m.plain;
  p.sphere(0.34, IRON, 0, 0.78, 0, [0.8, 0.8, 1.45], 12);
  for (const x of [-0.16, 0.16]) for (const z of [-0.32, 0.32]) p.cyl(0.06, 0.075, 0.62, IRON_DARK, x, 0.31, z, undefined, 7);
  p.cyl(0.11, 0.16, 0.52, IRON, 0, 1.08, 0.42, [-0.6, 0, 0], 8);
  p.box(0.19, 0.2, 0.44, IRON, 0, 1.3, 0.66, [0.35, 0, 0]);
  for (const s of [-1, 1]) p.sphere(0.03, C.ember, s * 0.08, 1.36, 0.74, [1, 1, 0.6], 6);
  for (let i = 0; i < 4; i++) p.cone(0.06, 0.24, i % 2 ? C.ember : C.fire, 0, 1.24 + i * 0.03, 0.42 - i * 0.12, [-0.5, 0, 0], 5);
  p.cone(0.08, 0.46, C.fire, 0, 0.86, -0.62, [-2.2, 0, 0], 6);
  m.band.box(0.5, 0.08, 0.46, C.red, 0, 1.08, -0.05);
}

/**
 * Thánh Gióng theo từng dáng: cậu bé lên ba ngồi một chỗ, thiếu niên ôm bát cơm,
 * tráng sĩ mặc giáp sắt cưỡi ngựa sắt cầm roi sắt (hay cây tre khi roi đã gãy).
 * `glow`: Phù Đổng Thiên Vương hiển linh, có hào quang vàng.
 */
export function makeGiong(look: GiongLook, opts: { bamboo?: boolean; glow?: boolean } = {}): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  if (look === 'trangSi') {
    ironHorse(m);
    const y = 1.06;
    for (const s of [-1, 1]) p.cyl(0.06, 0.07, 0.4, IRON_DARK, s * 0.22, y + 0.02, 0.04, [0, 0, s * 0.9], 6);
    m.band.cyl(0.2, 0.24, 0.42, IRON, 0, y + 0.32, 0, undefined, 10);
    for (const s of [-1, 1]) p.sphere(0.1, IRON_DARK, s * 0.24, y + 0.5, 0, [1, 0.8, 1], 8);
    p.box(0.5, 0.62, 0.04, C.red, 0, y + 0.34, -0.25, [0.25, 0, 0]);
    p.sphere(0.24, C.skin, 0, y + 0.8, 0.02, [1, 0.95, 0.95], 12);
    for (const s of [-1, 1]) p.sphere(0.028, C.ink, s * 0.08, y + 0.79, 0.21, [1, 1.4, 0.5], 6);
    p.sphere(0.25, IRON, 0, y + 0.9, -0.01, [1, 0.6, 1], 10);
    p.cone(0.05, 0.26, C.red, 0, y + 1.14, -0.02, undefined, 5);
    if (opts.bamboo) {
      // Cây tre đằng ngà nhổ bên đường.
      p.cyl(0.04, 0.05, 1.9, C.bamboo, 0.34, y + 0.75, 0.2, [0.45, 0, -0.2], 6);
      for (let i = 0; i < 4; i++) p.cone(0.07, 0.3, C.leaf[i % 4], 0.5 + i * 0.05, y + 1.5 + i * 0.12, 0.62 + i * 0.05, [0.9, 0, -0.4], 4);
    } else {
      p.cyl(0.025, 0.025, 1.15, IRON_DARK, 0.32, y + 0.62, 0.26, [0.7, 0, -0.2], 5);
    }
  } else {
    const baby = look === 'be';
    // Đầu cạo trọc, để chỏm tóc trước trán; mặc yếm đỏ.
    const y = baby ? 0 : 0.2;
    if (baby) {
      for (const s of [-1, 1]) p.cyl(0.05, 0.05, 0.24, C.skin, s * 0.08, 0.06, 0.12, [Math.PI / 2, 0, 0], 6);
    } else {
      for (const s of [-1, 1]) p.cyl(0.045, 0.05, 0.22, C.skin, s * 0.07, 0.11, 0, undefined, 6);
    }
    p.cyl(0.12, 0.15, 0.3, C.skin, 0, y + 0.22, 0, undefined, 8);
    m.band.box(0.22, 0.24, 0.04, C.red, 0, y + 0.24, 0.13);
    p.sphere(0.21, C.skin, 0, y + 0.55, 0, [1, 0.95, 0.95], 12);
    for (const s of [-1, 1]) p.sphere(0.026, C.ink, s * 0.075, y + 0.54, 0.18, [1, 1.4, 0.5], 6);
    p.sphere(0.07, C.hair, 0, y + 0.74, 0.08, [1, 0.7, 1], 8);
    if (!baby) {
      // Ôm bát cơm: ăn bao nhiêu cũng không no.
      for (const s of [-1, 1]) p.cyl(0.035, 0.035, 0.2, C.skin, s * 0.12, y + 0.3, 0.1, [1.2, 0, 0], 6);
      p.cyl(0.13, 0.08, 0.1, C.bronze, 0, y + 0.32, 0.24, undefined, 10);
      p.sphere(0.11, C.cream, 0, y + 0.38, 0.24, [1, 0.6, 1], 8);
    }
  }
  const g = m.group();
  if (look === 'trangSi') {
    // Lửa phun ra từ mõm ngựa, phần vẽ làm lập lòe.
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 6), new THREE.MeshBasicMaterial({ color: C.fire, transparent: true, opacity: 0.85 }));
    flame.position.set(0, 1.22, 1.08);
    flame.rotation.x = Math.PI / 2;
    flame.userData.flame = true;
    g.add(flame);
  }
  if (opts.glow) {
    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: C.ember, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    aura.scale.set(0.9, 1.3, 1.1);
    aura.position.y = 1.2;
    aura.userData.aura = true;
    g.add(aura);
  }
  return g;
}
