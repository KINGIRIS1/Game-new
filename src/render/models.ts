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
  /** Độ cao mặt đất chỗ cây mọc, bỏ trống là mặt phẳng. */
  y?: number;
  kind: 'tree' | 'bamboo';
  seed: number;
}

/** Một đoạn lũy, tọa độ thế giới của tâm ô. Cấp 1 là lũy tre, cấp 2 là thành đất. */
export interface WallSpot {
  x: number;
  /** Mặt đất dưới chân. */
  y?: number;
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
  if (kind === 'sonTinh') return makeSonTinh();
  const water = makeWaterFoe(kind);
  if (water) return water;
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
    return { t, x: s.x, y: s.y, z: s.z, s: 0.85 + r() * 0.3, ry: r() * Math.PI * 2 };
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
      y: s.y,
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

/** Sắt ánh thép xanh cho sáng hơn bóng đổ; viền và đồ trang sức bằng đồng như đồ Đông Sơn. */
const IRON = 0x7b8a9c;
const IRON_DARK = 0x4d5868;

/** Ngựa sắt của Gióng: thân sắt có đồ đồng, mắt đỏ rực, bờm và đuôi là lửa tự sáng. Gốc ở chân, đầu hướng +z. */
export function ironHorse(m: ToonModel): void {
  const p = m.plain;
  const f = m.glow;
  p.sphere(0.34, IRON, 0, 0.78, 0, [0.8, 0.8, 1.45], 12);
  for (const x of [-0.16, 0.16]) {
    for (const z of [-0.32, 0.32]) {
      p.cyl(0.06, 0.075, 0.62, IRON_DARK, x, 0.31, z, undefined, 7);
      p.cyl(0.085, 0.085, 0.07, C.bronze, x, 0.05, z, undefined, 8);
    }
  }
  p.cyl(0.11, 0.16, 0.52, IRON, 0, 1.08, 0.42, [-0.6, 0, 0], 8);
  p.box(0.19, 0.2, 0.44, IRON, 0, 1.3, 0.66, [0.35, 0, 0]);
  // Tấm đồng che trán và hai tai.
  p.box(0.2, 0.12, 0.03, C.bronze, 0, 1.43, 0.6, [0.35 - Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) p.cone(0.04, 0.13, IRON_DARK, s * 0.07, 1.5, 0.5, [-0.3, 0, s * 0.25], 5);
  // Vòng cổ đồng.
  p.cyl(0.16, 0.17, 0.06, C.bronze, 0, 0.95, 0.3, [-0.6, 0, 0], 10);
  for (const s of [-1, 1]) f.sphere(0.04, C.fire, s * 0.09, 1.37, 0.75, [1, 1, 0.6], 6);
  // Bờm lửa chạy dọc cổ, cao dần về phía gáy.
  for (let i = 0; i < 6; i++) f.cone(0.075, 0.3 + i * 0.03, i % 2 ? C.ember : C.fire, 0, 1.36 - i * 0.05, 0.56 - i * 0.12, [-0.75, 0, 0], 5);
  // Đuôi lửa xòe ba nhánh.
  for (const [dx, rz] of [[0, 0], [-0.07, 0.35], [0.07, -0.35]] as const) f.cone(0.09, 0.55, dx ? C.ember : C.fire, dx, 0.9, -0.66, [-2.2, 0, rz], 6);
  m.band.box(0.54, 0.08, 0.5, C.red, 0, 1.08, -0.05);
  for (const s of [-1, 1]) p.box(0.03, 0.22, 0.46, C.bronze, s * 0.28, 1.0, -0.05);
}

/** Hào quang Phù Đổng Thiên Vương: vòng vàng có tia như ngôi sao giữa mặt trống đồng. Tâm ở gốc, mặt hướng +z. */
function halo(): THREE.Group {
  const m = new ToonModel(inkThin);
  m.glow.add(new THREE.TorusGeometry(0.42, 0.035, 6, 32), C.ember, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    m.glow.cone(0.035, i % 2 ? 0.12 : 0.2, i % 2 ? C.fire : C.ember, Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0, [0, 0, a - Math.PI / 2], 4);
  }
  const g = m.group();
  g.userData.halo = true;
  return g;
}

/** Lúc đứng yên, tay phải giơ cao roi (hay tre), hơi ngả ra sau và chếch ra ngoài. */
export const WEAPON_REST = { x: -0.35, z: -0.4 };

/**
 * Tay phải cầm roi sắt (hay cây tre) của tráng sĩ, tách riêng để phần vẽ trận làm động tác quật.
 * Gốc nhóm là khớp vai; tay và vũ khí dựng dọc trục +y của gốc. Xoay theo thứ tự YXZ:
 * nghiêng ra ngoài (z), cúi về trước (x), rồi quay quanh mình (y).
 */
function giongWeapon(bamboo: boolean): THREE.Group {
  const w = new ToonModel(inkThin);
  const p = w.plain;
  p.cyl(0.045, 0.045, 0.4, C.skin, 0, 0.2, 0, undefined, 6);
  if (bamboo) {
    // Cây tre đằng ngà nhổ bên đường, ngọn xòe lá.
    p.cyl(0.045, 0.055, 2, C.bamboo, 0, 1.4, 0, undefined, 6);
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.5;
      p.cone(0.08, 0.32, C.leaf[i % 4], Math.sin(a) * 0.12, 2.3 + Math.cos(a) * 0.12, (i % 2) * 0.12 - 0.06, [0, 0, -a], 4);
    }
  } else {
    p.cyl(0.03, 0.03, 1.2, IRON_DARK, 0, 1.0, 0, undefined, 6);
    p.cyl(0.045, 0.045, 0.16, C.bronze, 0, 0.45, 0, undefined, 8);
    p.sphere(0.05, C.bronze, 0, 1.62, 0, [1, 1, 1], 8);
  }
  const g = w.group();
  g.position.set(0.25, 1.56, 0.05);
  g.rotation.order = 'YXZ';
  g.rotation.set(WEAPON_REST.x, 0, WEAPON_REST.z);
  g.userData.weapon = true;
  return g;
}

/**
 * Thánh Gióng theo từng dáng: cậu bé lên ba ngồi trên chiếu, thiếu niên ôm bát cơm đầy cạnh chồng bát đã ăn,
 * tráng sĩ mặc giáp sắt viền đồng, đội mũ lông chim, cưỡi ngựa sắt, giơ cao roi sắt (hay cây tre khi roi đã gãy).
 * `glow`: Phù Đổng Thiên Vương hiển linh, có vòng hào quang vàng sau lưng.
 */
export function makeGiong(look: GiongLook, opts: { bamboo?: boolean; glow?: boolean } = {}): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  if (look === 'trangSi') {
    ironHorse(m);
    const y = 1.06;
    for (const s of [-1, 1]) p.cyl(0.06, 0.07, 0.4, IRON_DARK, s * 0.22, y + 0.02, 0.04, [0, 0, s * 0.9], 6);
    m.band.cyl(0.2, 0.24, 0.42, IRON, 0, y + 0.32, 0, undefined, 10);
    p.cyl(0.245, 0.245, 0.06, C.bronze, 0, y + 0.14, 0, undefined, 12);
    for (const s of [-1, 1]) p.sphere(0.11, C.bronze, s * 0.24, y + 0.5, 0, [1, 0.8, 1], 8);
    // Áo choàng đỏ vắt bay ra sau, ngắn vừa đủ để nhìn từ sau lưng vẫn thấy ngựa và đuôi lửa.
    p.box(0.4, 0.56, 0.04, C.red, 0, y + 0.3, -0.36, [0.75, 0, 0]);
    p.sphere(0.24, C.skin, 0, y + 0.8, 0.02, [1, 0.95, 0.95], 12);
    for (const s of [-1, 1]) {
      p.sphere(0.028, C.ink, s * 0.08, y + 0.79, 0.21, [1, 1.4, 0.5], 6);
      // Mày xếch: vẻ quyết chiến.
      p.box(0.08, 0.018, 0.02, C.ink, s * 0.085, y + 0.86, 0.215, [0, 0, -s * 0.3]);
    }
    p.sphere(0.25, IRON, 0, y + 0.9, -0.01, [1, 0.6, 1], 10);
    p.cyl(0.255, 0.255, 0.05, C.bronze, 0, y + 0.86, -0.01, undefined, 12);
    // Chùm lông chim xòe trên mũ, như người trên mặt trống đồng.
    const plume = [C.red, C.cream, C.bronzeLight];
    for (let i = -3; i <= 3; i++) p.box(0.07, 0.52, 0.03, plume[Math.abs(i) % 3], i * 0.06, y + 1.3, -0.04, [0, 0, -i * 0.22]);
    // Tay trái cầm cương. Tay phải và vũ khí dựng riêng ở `giongWeapon`.
    p.cyl(0.04, 0.04, 0.3, C.skin, -0.2, y + 0.38, 0.14, [1, 0, 0.2], 6);
  } else if (look === 'be') {
    // Cậu bé lên ba ngồi bệt trên chiếu, đầu cạo trọc chừa chỏm tóc trước trán, mặc yếm đỏ.
    m.band.box(0.66, 0.03, 0.52, C.thatch, 0, 0.015, 0.04);
    for (const s of [-1, 1]) p.cyl(0.05, 0.05, 0.24, C.skin, s * 0.08, 0.08, 0.13, [Math.PI / 2, 0, 0], 6);
    p.cyl(0.12, 0.15, 0.3, C.skin, 0, 0.22, 0, undefined, 8);
    for (const s of [-1, 1]) p.cyl(0.035, 0.035, 0.2, C.skin, s * 0.15, 0.22, 0.04, [0.4, 0, s * 0.3], 6);
    m.band.box(0.22, 0.24, 0.04, C.red, 0, 0.24, 0.13);
    p.sphere(0.24, C.skin, 0, 0.58, 0, [1, 0.95, 0.95], 12);
    for (const s of [-1, 1]) p.sphere(0.028, C.ink, s * 0.085, 0.57, 0.21, [1, 1.4, 0.5], 6);
    p.sphere(0.08, C.hair, 0, 0.8, 0.07, [1, 0.75, 1], 8);
    p.cone(0.045, 0.14, C.hair, 0, 0.86, 0.14, [0.9, 0, 0], 6);
  } else {
    // Thiếu niên đứng, cao hẳn lên, ôm bát cơm đầy; cạnh chân là chồng bát đã ăn hết mà vẫn chưa no.
    for (const s of [-1, 1]) p.cyl(0.05, 0.055, 0.36, C.skin, s * 0.07, 0.18, 0, undefined, 6);
    m.band.cyl(0.14, 0.16, 0.14, C.red, 0, 0.42, 0, undefined, 10);
    p.cyl(0.13, 0.15, 0.32, C.skin, 0, 0.64, 0, undefined, 8);
    m.band.box(0.22, 0.24, 0.04, C.red, 0, 0.66, 0.13);
    p.sphere(0.23, C.skin, 0, 0.98, 0, [1, 0.95, 0.95], 12);
    for (const s of [-1, 1]) p.sphere(0.027, C.ink, s * 0.08, 0.97, 0.2, [1, 1.4, 0.5], 6);
    p.sphere(0.075, C.hair, 0, 1.19, 0.07, [1, 0.75, 1], 8);
    p.cone(0.04, 0.12, C.hair, 0, 1.24, 0.13, [0.9, 0, 0], 6);
    for (const s of [-1, 1]) p.cyl(0.035, 0.035, 0.24, C.skin, s * 0.13, 0.66, 0.12, [1.2, 0, 0], 6);
    p.cyl(0.18, 0.1, 0.12, C.bronze, 0, 0.66, 0.28, undefined, 12);
    p.sphere(0.16, C.cream, 0, 0.73, 0.28, [1, 0.75, 1], 10);
    for (const s of [-1, 1]) p.box(0.015, 0.015, 0.34, C.woodLight, s * 0.03, 0.86, 0.22, [-0.7, 0, 0]);
    for (let i = 0; i < 3; i++) p.cyl(0.14, 0.08, 0.08, C.bronze, 0.42, 0.04 + i * 0.07, 0.12, undefined, 10);
  }
  const g = m.group();
  if (look === 'trangSi') {
    g.add(giongWeapon(opts.bamboo ?? false));
    // Lửa phun ra từ mõm ngựa, hai lớp đỏ cam và vàng, phần vẽ làm lập lòe.
    for (const [r, len, color, z] of [[0.13, 0.62, C.fire, 1.12], [0.07, 0.42, C.ember, 1.04]] as const) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(r, len, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      flame.position.set(0, 1.22, z);
      flame.rotation.x = Math.PI / 2;
      flame.userData.flame = true;
      g.add(flame);
    }
  }
  if (opts.glow) {
    const ring = halo();
    ring.position.set(0, 1.9, -0.32);
    g.add(ring);
  }
  return g;
}

// ---------- Chương 2: thủy quái của Thủy Tinh ----------

/** Tôm binh: thân tôm cong đứng thẳng, đầu có gai nhọn, râu dài, cầm giáo đồng. */
function shrimp(m: ToonModel): void {
  const p = m.plain;
  // Đuôi cong ra sau làm chân đứng, xòe quạt đuôi.
  for (let i = 0; i < 4; i++) {
    const r = 0.15 - i * 0.012;
    p.sphere(r, i % 2 ? C.shrimpLight : C.shrimp, 0, 0.12 + i * 0.17, -0.18 + i * 0.07, [1, 0.75, 1], 8);
  }
  for (const s of [-1, 0, 1]) p.box(0.1, 0.02, 0.22, C.shrimpLight, s * 0.09, 0.03, -0.3, [0, s * 0.4, 0]);
  // Ngực và đầu.
  p.sphere(0.2, C.shrimp, 0, 0.78, 0.04, [0.9, 1.1, 1], 10);
  p.cone(0.05, 0.3, C.shrimpLight, 0, 0.92, 0.27, [1.25, 0, 0], 5);
  for (const s of [-1, 1]) {
    p.cyl(0.015, 0.015, 0.12, C.ink, s * 0.1, 0.96, 0.14, [0, 0, s * 0.5], 4);
    p.sphere(0.045, C.ink, s * 0.14, 1.02, 0.14, [1, 1, 1], 6);
    // Râu dài vắt ra sau.
    p.cyl(0.01, 0.012, 0.9, C.shrimp, s * 0.12, 1.25, -0.1, [-0.6, 0, s * 0.35], 4);
  }
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) p.cyl(0.012, 0.012, 0.22, C.shrimpLight, s * 0.12, 0.58 - i * 0.08, 0.1, [0.4, 0, s * 0.6], 4);
  for (const s of [-1, 1]) p.cyl(0.03, 0.03, 0.26, C.shrimp, s * 0.17, 0.68, 0.12, [0.9, 0, s * 0.35], 5);
  p.cyl(0.018, 0.018, 1.15, C.woodDark, 0.24, 0.62, 0.12, undefined, 5);
  p.cone(0.05, 0.2, C.bronze, 0.24, 1.27, 0.12, undefined, 4);
}

/** Cá phun nước: con cá đứng trên đuôi, miệng tròn há to, vây xòe. */
function spitFish(m: ToonModel): void {
  const p = m.plain;
  p.sphere(0.3, C.fish, 0, 0.62, 0, [0.62, 1, 0.55], 12);
  p.sphere(0.24, C.fishBelly, 0, 0.58, 0.07, [0.5, 0.85, 0.45], 10);
  // Đuôi làm chân đứng.
  for (const s of [-1, 1]) p.box(0.22, 0.05, 0.16, C.fish, s * 0.12, 0.08, -0.02, [0, 0, s * 0.5]);
  p.cyl(0.07, 0.1, 0.22, C.fish, 0, 0.2, 0, undefined, 8);
  // Vây lưng, vây ngực.
  p.box(0.04, 0.34, 0.24, C.red, 0, 0.82, -0.17, [0.3, 0, 0]);
  for (const s of [-1, 1]) p.box(0.2, 0.04, 0.14, C.red, s * 0.2, 0.55, 0.05, [0, 0, s * 0.6]);
  // Mắt lồi và miệng tròn há to.
  for (const s of [-1, 1]) {
    p.sphere(0.07, C.cream, s * 0.12, 0.88, 0.12, [1, 1, 1], 8);
    p.sphere(0.035, C.ink, s * 0.13, 0.89, 0.18, [1, 1, 1], 6);
  }
  p.cyl(0.08, 0.06, 0.08, C.fishBelly, 0, 0.72, 0.17, [Math.PI / 2, 0, 0], 10);
  p.cyl(0.05, 0.05, 0.09, C.ink, 0, 0.72, 0.19, [Math.PI / 2, 0, 0], 10);
}

/** Cá sấu: mình dài sát đất, mõm dài răng trắng, lưng có vảy gai, đuôi vuốt dài. */
function crocodile(m: ToonModel): void {
  const p = m.plain;
  p.sphere(0.32, C.croc, 0, 0.3, 0, [0.85, 0.6, 1.5], 12);
  p.sphere(0.26, C.crocBelly, 0, 0.22, 0.04, [0.75, 0.35, 1.3], 10);
  p.box(0.3, 0.16, 0.6, C.croc, 0, 0.32, 0.68);
  p.box(0.26, 0.08, 0.56, C.crocBelly, 0, 0.22, 0.7);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) p.cone(0.025, 0.08, C.cream, s * 0.12, 0.2, 0.48 + i * 0.1, [Math.PI, 0, 0], 4);
  for (const s of [-1, 1]) {
    p.sphere(0.07, C.croc, s * 0.11, 0.44, 0.42, [1, 1, 1], 8);
    p.sphere(0.035, C.ember, s * 0.12, 0.47, 0.46, [1, 1, 1], 6);
  }
  p.cone(0.16, 1.0, C.croc, 0, 0.25, -0.85, [-Math.PI / 2, 0, 0], 8);
  for (let i = 0; i < 6; i++) p.box(0.06, 0.08, 0.06, C.serpent, 0, 0.5 - i * 0.03, 0.3 - i * 0.22);
  for (const x of [-0.25, 0.25]) for (const z of [-0.25, 0.3]) p.cyl(0.06, 0.07, 0.2, C.croc, x, 0.1, z, [0, 0, x > 0 ? -0.5 : 0.5], 6);
}

/** Thuồng luồng: mình rắn uốn khúc ngóc đầu cao, râu dài, sừng đồng, vây lưng đỏ. */
function serpent(m: ToonModel): void {
  const p = m.plain;
  const body: [number, number, number, number][] = [
    [0, 0.18, -0.9, 0.2],
    [0.25, 0.22, -0.55, 0.23],
    [0.1, 0.3, -0.15, 0.25],
    [-0.15, 0.5, 0.1, 0.25],
    [-0.05, 0.85, 0.2, 0.24],
    [0.05, 1.2, 0.25, 0.22],
  ];
  body.forEach(([x, y, z, r], i) => {
    p.sphere(r, C.serpent, x, y, z, [1, 0.9, 1], 10);
    p.sphere(r * 0.75, C.serpentBelly, x, y - r * 0.15, z + r * 0.4, [1, 0.8, 0.6], 8);
    p.cone(0.06, 0.22, C.red, x, y + r + 0.05, z - 0.05, [-0.4, 0, 0], 4);
    if (i === 0) p.cone(0.12, 0.5, C.serpent, x - 0.1, 0.12, z - 0.35, [-Math.PI / 2 - 0.2, 0, 0], 6);
  });
  // Đầu.
  p.box(0.34, 0.24, 0.42, C.serpent, 0.05, 1.42, 0.42);
  p.box(0.28, 0.08, 0.3, C.serpentBelly, 0.05, 1.3, 0.5);
  for (const s of [-1, 1]) {
    p.sphere(0.05, C.ember, 0.05 + s * 0.12, 1.5, 0.6, [1, 1, 0.6], 6);
    p.cone(0.04, 0.3, C.bronzeLight, 0.05 + s * 0.1, 1.68, 0.3, [-0.6, 0, s * 0.3], 5);
    p.cyl(0.012, 0.012, 0.6, C.cream, 0.05 + s * 0.16, 1.32, 0.78, [1.1, 0, s * 0.6], 4);
  }
}

/**
 * Lính trong trận của chương 2: tôm binh, cá phun nước, cá sấu, thuồng luồng và Thủy Tinh.
 * Trả về null nếu không phải thủy quái.
 */
export function makeWaterFoe(kind: FighterKind): THREE.Group | null {
  if (kind === 'thuyTinh') return makeThuyTinh();
  const m = new ToonModel(inkThin);
  if (kind === 'tomBinh') shrimp(m);
  else if (kind === 'caPhun') spitFish(m);
  else if (kind === 'caSau') crocodile(m);
  else if (kind === 'thuongLuong') serpent(m);
  else return null;
  return m.group();
}

/** Thủy Tinh, chúa miền nước thẳm: áo xanh biển, mũ đồng vây cá, cầm đinh ba, đứng trên ngọn sóng bạc đầu. */
export function makeThuyTinh(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  // Ngọn sóng cuộn dưới chân.
  p.cyl(0.42, 0.55, 0.3, C.sea, 0, 0.15, 0, undefined, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.cone(0.14, 0.34, i % 2 ? C.foam : C.sea, Math.cos(a) * 0.42, 0.34, Math.sin(a) * 0.42, [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], 6);
  }
  p.sphere(0.36, C.foam, 0, 0.3, 0, [1, 0.35, 1], 10);
  const y0 = 0.36;
  for (const x of [-0.07, 0.07]) p.cyl(0.05, 0.055, 0.22, C.sea, x, y0 + 0.11, 0, undefined, 6);
  m.band.cyl(0.17, 0.24, 0.36, C.sea, 0, y0 + 0.36, 0, undefined, 10);
  p.cyl(0.14, 0.17, 0.2, C.foam, 0, y0 + 0.6, 0, undefined, 10);
  for (const s of [-1, 1]) p.cyl(0.04, 0.04, 0.28, C.skin, s * 0.2, y0 + 0.55, 0.04, [0.3, 0, s * 0.4], 6);
  p.sphere(0.24, C.skin, 0, y0 + 0.92, 0, [1, 0.95, 0.95], 12);
  for (const s of [-1, 1]) {
    p.sphere(0.03, C.ink, s * 0.08, y0 + 0.91, 0.2, [1, 1.4, 0.5], 6);
    p.box(0.09, 0.02, 0.02, C.ink, s * 0.09, y0 + 0.99, 0.21, [0, 0, s * 0.35]);
  }
  // Râu dài như rong biển.
  p.cone(0.1, 0.28, C.serpent, 0, y0 + 0.72, 0.18, [Math.PI, 0, 0], 6);
  // Mũ đồng có vây cá xòe.
  p.sphere(0.25, C.bronze, 0, y0 + 1.02, -0.01, [1, 0.6, 1], 10);
  for (let i = -2; i <= 2; i++) p.box(0.05, 0.4, 0.12, i % 2 ? C.sea : C.bronzeLight, i * 0.07, y0 + 1.28, -0.04, [0, 0, -i * 0.25]);
  // Đinh ba.
  p.cyl(0.025, 0.025, 1.7, C.bronzeDark, 0.3, y0 + 0.75, 0.1, undefined, 6);
  for (const dx of [-0.1, 0, 0.1]) p.cone(0.03, 0.22, C.bronzeLight, 0.3 + dx, y0 + 1.7, 0.1, undefined, 4);
  p.box(0.26, 0.04, 0.04, C.bronzeLight, 0.3, y0 + 1.58, 0.1);
  return m.group();
}

// ---------- Sơn Tinh ----------

/**
 * Tay phải cầm gậy thần của Sơn Tinh, tách riêng để phần vẽ trận làm động tác vung.
 * Gốc nhóm là khớp vai, giống tay vũ khí của Gióng.
 */
function sonStaff(): THREE.Group {
  const w = new ToonModel(inkThin);
  const p = w.plain;
  p.cyl(0.05, 0.05, 0.38, C.skin, 0, 0.19, 0, undefined, 6);
  p.cyl(0.04, 0.05, 1.9, C.woodDark, 0, 1.0, 0, undefined, 6);
  // Đầu gậy: vòng đồng ôm một hòn đá thiêng.
  w.band.cyl(0.08, 0.08, 0.12, C.bronze, 0, 1.92, 0, undefined, 10);
  p.sphere(0.12, C.rock, 0, 2.08, 0, [1, 1.1, 1], 8);
  for (let i = 0; i < 3; i++) p.cone(0.035, 0.14, C.leaf[i], Math.cos(i * 2.1) * 0.09, 1.96, Math.sin(i * 2.1) * 0.09, [0, 0, Math.cos(i * 2.1) * 0.8], 4);
  const g = w.group();
  g.position.set(0.32, 1.5, 0.05);
  g.rotation.order = 'YXZ';
  g.rotation.set(WEAPON_REST.x, 0, WEAPON_REST.z);
  g.userData.weapon = true;
  return g;
}

/**
 * Sơn Tinh, chúa vùng non cao: cao hơn hẳn lính thường, giáp đồng có hoa văn trống,
 * áo choàng kết lá rừng, vai đắp đá núi, đội mũ lông chim, tay cầm gậy thần.
 * `rock`: đứng trên mỏm đá (khi đứng chờ ở kinh đô). `glow`: hiển linh, có hào quang.
 */
export function makeSonTinh(opts: { rock?: boolean; glow?: boolean } = {}): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  const y0 = opts.rock ? 0.32 : 0;
  if (opts.rock) {
    p.cone(0.62, 0.42, C.rockDark, 0, 0.18, 0, undefined, 7);
    p.cone(0.3, 0.3, C.rock, 0.32, 0.18, -0.2, undefined, 6);
    p.cone(0.25, 0.26, C.leaf[2], -0.35, 0.16, 0.15, undefined, 6);
  }
  for (const x of [-0.1, 0.1]) {
    p.cyl(0.07, 0.08, 0.42, C.skin, x, y0 + 0.21, 0, undefined, 6);
    p.cyl(0.085, 0.085, 0.08, C.bronze, x, y0 + 0.06, 0.02, undefined, 8);
  }
  // Váy lá và áo choàng lá rừng.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.cone(0.1, 0.36, C.leaf[i % 4], Math.sin(a) * 0.2, y0 + 0.44, Math.cos(a) * 0.18, [Math.PI + Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3], 4);
  }
  m.band.cyl(0.24, 0.27, 0.46, C.bronze, 0, y0 + 0.78, 0, undefined, 12);
  p.cyl(0.275, 0.275, 0.06, C.bronzeDark, 0, y0 + 0.56, 0, undefined, 12);
  p.box(0.62, 0.7, 0.05, C.mountainCloak, 0, y0 + 0.78, -0.3, [0.2, 0, 0]);
  for (let i = 0; i < 4; i++) p.cone(0.09, 0.26, C.leaf[i], -0.24 + i * 0.16, y0 + 0.38, -0.36, [Math.PI + 0.2, 0, 0], 4);
  // Vai đắp đá núi.
  for (const s of [-1, 1]) {
    p.sphere(0.15, C.rock, s * 0.3, y0 + 1.0, 0, [1, 0.8, 1], 7);
    p.cone(0.08, 0.16, C.leaf[1], s * 0.33, y0 + 1.14, 0, undefined, 5);
  }
  // Tay trái nắm lại trước ngực.
  p.cyl(0.05, 0.05, 0.36, C.skin, -0.3, y0 + 0.8, 0.12, [0.9, 0, 0.25], 6);
  p.sphere(0.27, C.skin, 0, y0 + 1.3, 0.02, [1, 0.95, 0.95], 12);
  for (const s of [-1, 1]) {
    p.sphere(0.03, C.ink, s * 0.09, y0 + 1.29, 0.24, [1, 1.4, 0.5], 6);
    p.box(0.09, 0.02, 0.02, C.ink, s * 0.095, y0 + 1.37, 0.245, [0, 0, -s * 0.25]);
  }
  p.sphere(0.27, C.hair, 0, y0 + 1.4, -0.05, [1, 0.6, 0.98], 12);
  p.cyl(0.275, 0.275, 0.06, C.bronze, 0, y0 + 1.36, -0.02, undefined, 12);
  // Mũ lông chim cao, xen lông xanh lá như cây núi.
  const plume = [C.red, C.cream, C.leaf[3]];
  for (let i = -3; i <= 3; i++) p.box(0.07, 0.6, 0.03, plume[Math.abs(i) % 3], i * 0.065, y0 + 1.82, -0.06, [0, 0, -i * 0.22]);
  const g = m.group();
  const staff = sonStaff();
  staff.position.y += y0;
  g.add(staff);
  if (opts.glow) {
    const ring = halo();
    ring.position.set(0, y0 + 1.5, -0.38);
    g.add(ring);
  }
  return g;
}

// ---------- Đê ----------

/** Một đoạn đê, tọa độ thế giới của tâm ô và mặt đất dưới chân. Cấp 1 là đê đất, cấp 2 là kè đá. */
export interface DikeSpot {
  x: number;
  y: number;
  z: number;
  level: number;
  damaged: boolean;
}

/** Đê đất: mô đất đắp thoai thoải, mặt đê phủ cỏ. Rộng trọn ô để các đoạn liền nhau thành một dải. */
function earthDike(): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  b.box(1.02, 0.22, 1.02, C.earthDark, 0, 0.11, 0);
  b.box(0.9, 0.22, 0.9, C.earth, 0, 0.33, 0);
  b.box(0.78, 0.1, 0.78, C.grass[1], 0, 0.49, 0);
  return b.mesh(toon);
}

/** Kè đá: đê cao hơn, mái đê lát đá hộc, mặt đê có lối đi lát đá. */
function stoneDike(): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(41);
  b.box(1.02, 0.3, 1.02, C.rockDark, 0, 0.15, 0);
  b.box(0.92, 0.3, 0.92, C.rock, 0, 0.45, 0);
  for (let i = 0; i < 6; i++) b.box(0.22, 0.12, 0.05, C.rockDark, -0.35 + (i % 3) * 0.35, 0.22 + Math.floor(i / 3) * 0.3, 0.5 + rand() * 0.02);
  b.box(0.8, 0.14, 0.8, C.grass[0], 0, 0.67, 0);
  b.box(0.3, 0.03, 0.82, C.rock, 0, 0.75, 0);
  return b.mesh(toon);
}

/** Đoạn đê vỡ: mô đất thấp sạt lở. */
function brokenDike(): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  b.box(0.95, 0.14, 0.95, C.earthDark, 0, 0.07, 0);
  b.box(0.4, 0.12, 0.5, C.earth, -0.2, 0.18, 0.1, [0, 0.4, 0.2]);
  b.box(0.3, 0.1, 0.3, C.rock, 0.25, 0.16, -0.2, [0.2, 0.5, 0]);
  return b.mesh(toon);
}

let cachedDikes: THREE.Mesh[] | null = null;

/** Dựng toàn bộ đê trong kinh đô. */
export function buildDikes(spots: DikeSpot[]): THREE.Object3D {
  cachedDikes ??= [earthDike(), stoneDike(), brokenDike()];
  return instanceTemplates(
    cachedDikes,
    spots.map((s) => ({ t: s.damaged ? 2 : s.level >= 2 ? 1 : 0, x: s.x, y: s.y, z: s.z, s: 1, ry: 0 })),
    treeOutline,
  );
}

// ---------- Lạc tướng đánh trống trận ----------

/** Tay cầm dùi trống: gốc ở vai, tay và dùi chĩa về trước (+z). Xoay quanh trục x: dương thì dùi chúc xuống. */
function drumStick(x: number): THREE.Group {
  const m = new ToonModel(inkThin);
  m.plain.cyl(0.04, 0.04, 0.26, C.skin, 0, 0, 0.13, [Math.PI / 2, 0, 0], 6);
  m.plain.cyl(0.022, 0.026, 0.42, C.woodDark, 0, 0, 0.42, [Math.PI / 2, 0, 0], 5);
  m.plain.sphere(0.055, C.red, 0, 0, 0.64, [1, 1, 1], 8);
  const g = m.group();
  g.position.set(x, 0.56, 0.04);
  return g;
}

/** Dùi trống lúc nghỉ, lúc giơ cao lấy đà, và lúc nện xuống mặt trống. */
export const STICK_POSE = { rest: 0.12, up: -0.75, hit: 0.32 };

/**
 * Lạc tướng đứng sau trống đồng lớn, hai tay cầm dùi, mũ lông chim cao như người trên trống đồng.
 * Mặt trống có bốn tượng cóc ở vành. Mặt trước hướng +z, trống ở phía trước.
 * `userData.sticks` là hai tay cầm dùi, `userData.face` là mặt trống, để phần vẽ trận làm động tác đánh trống.
 */
export function makeDrummer(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  for (const x of [-0.07, 0.07]) p.cyl(0.045, 0.05, 0.2, C.skin, x, 0.1, 0, undefined, 6);
  m.band.cyl(0.15, 0.19, 0.26, C.red, 0, 0.32, 0, undefined, 10);
  p.cyl(0.14, 0.16, 0.18, C.bronze, 0, 0.5, 0, undefined, 10);
  p.box(0.44, 0.5, 0.04, C.red, 0, 0.42, -0.17, [0.18, 0, 0]);
  for (const s of [-1, 1]) p.sphere(0.07, C.bronze, s * 0.17, 0.58, 0, [1, 0.8, 1], 8);
  p.sphere(0.23, C.skin, 0, 0.8, 0, [1, 0.95, 0.95], 12);
  for (const s of [-1, 1]) {
    p.sphere(0.028, C.ink, s * 0.08, 0.8, 0.2, [1, 1.4, 0.5], 6);
    p.box(0.08, 0.018, 0.02, C.ink, s * 0.085, 0.87, 0.21, [0, 0, -s * 0.3]);
  }
  p.sphere(0.24, C.hair, 0, 0.88, -0.04, [1, 0.62, 0.98], 12);
  for (let i = -3; i <= 3; i++) p.box(0.06, 0.46, 0.03, i % 2 ? C.cream : C.red, i * 0.058, 1.2, -0.06, [0, 0, -i * 0.24]);
  // Trống đồng lớn trên bốn chân ngắn, trước mặt Lạc tướng.
  const dz = 0.56;
  m.band.cyl(0.38, 0.33, 0.32, C.bronze, 0, 0.26, dz, undefined, 18);
  p.cyl(0.395, 0.395, 0.05, C.bronzeDark, 0, 0.41, dz, undefined, 18);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    p.cyl(0.03, 0.04, 0.12, C.bronzeDark, Math.cos(a) * 0.28, 0.06, dz + Math.sin(a) * 0.28, undefined, 5);
  }
  const g = m.group();
  const face = new ToonModel(inkThin);
  face.drum.cyl(0.4, 0.4, 0.035, 0xffffff, 0, 0, 0, undefined, 22);
  // Tượng cóc đồng ngồi trên vành mặt trống, như trống Đông Sơn.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * 0.32;
    const z = Math.sin(a) * 0.32;
    face.plain.sphere(0.05, C.bronzeDark, x, 0.04, z, [1, 0.7, 1.2], 7);
    face.plain.sphere(0.028, C.bronzeDark, x, 0.075, z + 0.03, [1, 0.9, 1], 6);
  }
  const faceGroup = face.group();
  faceGroup.position.set(0, 0.45, dz);
  g.add(faceGroup);
  const sticks = [drumStick(-0.17), drumStick(0.17)];
  for (const s of sticks) {
    s.rotation.x = STICK_POSE.rest;
    g.add(s);
  }
  g.userData.sticks = sticks;
  g.userData.face = faceGroup;
  return g;
}
