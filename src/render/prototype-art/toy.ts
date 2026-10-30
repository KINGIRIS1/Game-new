// PROTOTYPE, DÙNG XONG BỎ: biến thể B "Đồ chơi bo tròn".
// Hình bo góc, cầu, viên nang, chất liệu như nhựa mềm, màu tươi, mái cong thật.

import * as THREE from 'three';
import { seeded } from '../boxes';
import { addSunAndSky, type ArtSet, type PersonKind } from '../art';
import { ShapeBuilder, instanceTemplates, saddleRoof, type Placement } from './common';

const K = {
  wood: 0xb9773f,
  woodDark: 0x80502c,
  woodLight: 0xdca468,
  thatch: 0xe9a43c,
  thatchDark: 0xc07a1e,
  red: 0xe0483a,
  indigo: 0x3f63b8,
  skin: 0xffc896,
  hair: 0x3a2618,
  bronze: 0xd9a23a,
  bronzeLight: 0xf3c768,
  white: 0xfff6e6,
  blush: 0xff9a8a,
  stone: 0xd8c7a6,
  soil: 0xb88a55,
  paddyWater: 0x7cc8c0,
  rice: 0x8fd94f,
  ripe: 0xffd44a,
  leaf: [0x58b947, 0x4aa63d, 0x6ccb52, 0x3f9a37],
  trunk: 0x9a6233,
  bamboo: 0x7cc246,
  bambooDark: 0x5ea836,
  palm: 0xa98b6a,
  flower: [0xff7aa8, 0xffd23f, 0xffffff],
};

const matte = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
const gloss = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.05 });
const metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.55 });

/** Một mô hình gồm ba lớp chất liệu: mờ, bóng và kim loại. */
class Model {
  readonly m = new ShapeBuilder();
  readonly g = new ShapeBuilder();
  readonly k = new ShapeBuilder();
  group(): THREE.Group {
    const out = new THREE.Group();
    if (!this.m.empty) out.add(this.m.mesh(matte));
    if (!this.g.empty) out.add(this.g.mesh(gloss));
    if (!this.k.empty) out.add(this.k.mesh(metal));
    return out;
  }
}

function bird(k: ShapeBuilder, x: number, y: number, dir: number): void {
  k.sphere(0.11, K.bronze, x, y, 0, [1.4, 0.9, 0.9]);
  k.sphere(0.07, K.bronze, x + dir * 0.14, y + 0.08, 0);
  k.cone(0.03, 0.12, K.bronzeLight, x + dir * 0.24, y + 0.08, 0, [0, 0, -dir * Math.PI / 2]);
  k.capsule(0.03, 0.16, K.bronze, x - dir * 0.16, y + 0.1, 0, [0, 0, dir * 0.8]);
}

function drum(k: ShapeBuilder, x: number, z: number, s = 1): void {
  k.cyl(0.34 * s, 0.3 * s, 0.32 * s, K.bronze, x, 0.16 * s + 0.12, z, undefined, 16);
  k.cyl(0.36 * s, 0.36 * s, 0.05 * s, K.bronzeLight, x, 0.33 * s + 0.12, z, undefined, 16);
  k.cyl(0.1 * s, 0.1 * s, 0.02, K.red, x, 0.36 * s + 0.12, z, undefined, 10);
}

function makeDien(level: number): THREE.Group {
  const md = new Model();
  const { m, k } = md;
  m.rbox(3.85, 0.24, 3.85, 0.1, K.stone, 0, 0.12, 0);
  for (const x of [-1.25, 0, 1.25]) for (const z of [-0.95, 0, 0.95]) m.cyl(0.1, 0.12, 1.0, K.woodDark, x, 0.74, z);
  m.rbox(3.2, 0.18, 2.6, 0.07, K.wood, 0, 1.25, 0);
  m.rbox(2.6, 0.86, 1.9, 0.09, K.woodLight, 0, 1.76, -0.1);
  m.rbox(0.62, 0.64, 0.1, 0.05, K.woodDark, 0, 1.68, 0.86);
  m.rbox(0.8, 0.08, 0.12, 0.03, K.red, 0, 2.04, 0.87);
  for (const x of [-0.95, 0.95]) m.rbox(0.36, 0.3, 0.08, 0.04, K.woodDark, x, 1.8, 0.86);
  for (let i = 0; i < 4; i++) m.rbox(0.66, 0.1, 0.24, 0.04, K.woodDark, 0, 1.1 - i * 0.27, 1.32 + i * 0.21);
  // Mái tranh hai lớp cho có chiều sâu, viền mép mái màu đậm.
  m.add(saddleRoof({ length: 4.1, width: 2.9, lift: 0.6, drop: 1.0, thickness: 0.16 }), K.thatchDark, 0, 3.18, -0.1);
  m.add(saddleRoof({ length: 3.6, width: 2.3, lift: 0.5, drop: 0.8, thickness: 0.14 }), K.thatch, 0, 3.32, -0.1);
  m.capsule(0.11, 2.2, 0x9c5f1c, 0, 3.34, -0.1, [0, 0, Math.PI / 2]);
  bird(k, 1.95, 3.9, 1);
  bird(k, -1.95, 3.9, -1);
  drum(k, 1.4, 1.55);
  m.cyl(0.04, 0.05, 2.5, K.woodDark, -1.6, 1.4, 1.5);
  m.rbox(0.6, 0.36, 0.05, 0.04, K.red, -1.28, 2.38, 1.5, [0, 0.15, 0]);
  if (level >= 3) {
    m.rbox(0.9, 0.12, 1.8, 0.05, K.wood, -1.95, 0.95, 0);
    for (const z of [-0.7, 0.7]) m.cyl(0.07, 0.08, 0.9, K.woodDark, -2.25, 0.5, z);
    drum(k, -1.0, 1.6, 0.75);
  }
  if (level >= 4) {
    for (const x of [-0.65, 0.65]) {
      m.cyl(0.04, 0.05, 1.4, K.woodDark, x, 0.82, 1.9);
      m.capsule(0.05, 0.22, K.white, x - 0.06, 1.62, 1.9, [0, 0, 0.35]);
      m.capsule(0.05, 0.22, K.red, x + 0.06, 1.64, 1.9, [0, 0, -0.35]);
    }
  }
  if (level >= 5) k.capsule(0.1, 1.2, K.bronzeLight, 0, 3.26, -0.1, [0, 0, Math.PI / 2]);
  const g = md.group();
  g.scale.setScalar(0.9 + 0.04 * level);
  return g;
}

function makeRuong(level: number): THREE.Group {
  const md = new Model();
  const { m, g } = md;
  for (const s of [-1, 1]) {
    m.rbox(2.95, 0.18, 0.22, 0.08, K.soil, 0, 0.1, s * 1.36);
    m.rbox(0.22, 0.18, 2.95, 0.08, K.soil, s * 1.36, 0.1, 0);
  }
  m.rbox(2.6, 0.14, 0.16, 0.06, K.soil, 0, 0.09, 0);
  g.rbox(2.55, 0.06, 2.55, 0.02, K.paddyWater, 0, 0.07, 0);
  const color = new THREE.Color(K.rice).lerp(new THREE.Color(K.ripe), (level - 1) / 4);
  const h = 0.2 + level * 0.05;
  const rand = seeded(level * 31);
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (j === 2) continue;
      const x = -1.0 + i * 0.5;
      const z = -1.0 + j * 0.5;
      for (let s = 0; s < 5; s++) {
        const a = (s / 5) * Math.PI * 2 + rand();
        m.capsule(0.034, h, color, x + Math.cos(a) * 0.06, 0.1 + h / 2, z + Math.sin(a) * 0.06, [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3]);
      }
      if (level >= 3) m.sphere(0.05, K.ripe, x, 0.12 + h, z, [1, 1.4, 1], 8);
    }
  }
  return md.group();
}

function makeBen(level: number): THREE.Group {
  const md = new Model();
  const { m, g } = md;
  for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.2]) m.cyl(0.07, 0.08, 0.45, K.woodDark, x, 0.22, z);
  m.rbox(1.95, 0.14, 1.45, 0.05, K.woodLight, 0, 0.45, -0.25);
  for (const dx of [-0.17, 0, 0.17]) m.rbox(0.15, 0.08, 1.7, 0.03, K.wood, 0.55 + dx, 0.33, 1.3);
  for (const z of [0.9, 1.6, 2.1]) m.cyl(0.06, 0.06, 0.8, K.woodDark, 0.55, -0.05, z);
  m.rbox(1.0, 0.56, 0.78, 0.08, K.woodLight, -0.4, 0.8, -0.45);
  m.rbox(0.36, 0.42, 0.08, 0.04, K.woodDark, -0.4, 0.74, -0.05);
  m.add(saddleRoof({ length: 1.45, width: 1.1, lift: 0.22, drop: 0.38, thickness: 0.08 }), K.thatch, -0.4, 1.46, -0.45);
  m.cyl(0.16, 0.12, 0.16, K.thatch, 0.45, 0.6, -0.6);
  m.cyl(0.17, 0.17, 0.03, K.thatchDark, 0.45, 0.68, -0.6);
  g.sphere(0.14, K.soil, 0.75, 0.66, -0.25);
  g.cyl(0.06, 0.07, 0.08, K.soil, 0.75, 0.8, -0.25);
  g.capsule(0.04, 0.16, 0xcfd8dc, 0.45, 0.74, -0.6, [0, 0, Math.PI / 2]);
  if (level >= 2) m.cyl(0.16, 0.12, 0.16, K.thatch, 0.15, 0.6, 0.15);
  if (level >= 3) {
    m.cyl(0.035, 0.04, 1.2, K.woodDark, 0.9, 1.05, 0.35);
    m.rbox(0.4, 0.26, 0.04, 0.03, K.indigo, 0.68, 1.48, 0.35);
  }
  if (level >= 4) g.sphere(0.13, K.soil, -0.85, 0.66, 0.25);
  if (level >= 5) md.k.rbox(0.3, 0.22, 0.3, 0.05, K.bronze, 0.1, 0.63, -0.15);
  return md.group();
}

function makePerson(kind: PersonKind): THREE.Object3D {
  const md = new Model();
  const { m, g, k } = md;
  const cloth = kind === 'buon' ? K.indigo : K.red;
  for (const x of [-0.07, 0.07]) m.capsule(0.055, 0.08, K.skin, x, 0.1, 0);
  m.rbox(0.3, 0.2, 0.22, 0.08, cloth, 0, 0.25, 0);
  m.sphere(0.14, K.skin, 0, 0.38, 0, [1, 0.8, 0.85]);
  for (const s of [-1, 1]) m.capsule(0.045, 0.12, K.skin, s * 0.17, 0.33, 0, [0, 0, s * 0.35]);
  m.sphere(0.26, K.skin, 0, 0.66, 0, [1, 0.95, 0.95], 16);
  // Tóc phủ đỉnh và sau đầu, chừa trống phần mắt.
  m.sphere(0.27, K.hair, 0, 0.84, -0.06, [1.03, 0.55, 1], 16);
  m.sphere(0.25, K.hair, 0, 0.7, -0.1, [1.02, 0.8, 0.8], 12);
  m.sphere(0.09, K.hair, 0, 0.96, -0.07);
  for (const s of [-1, 1]) {
    g.sphere(0.045, 0x1b1410, s * 0.09, 0.64, 0.225, [1, 1.3, 0.6]);
    g.sphere(0.016, 0xffffff, s * 0.09 + 0.016, 0.675, 0.255);
    m.sphere(0.042, K.blush, s * 0.155, 0.575, 0.205, [1, 0.6, 0.3]);
  }
  m.capsule(0.012, 0.04, 0x7a3a2a, 0, 0.555, 0.25, [0, 0, Math.PI / 2]);
  if (kind === 'linh') {
    m.cyl(0.02, 0.02, 1.1, K.woodDark, 0.25, 0.55, 0.05);
    k.cone(0.05, 0.16, K.bronze, 0.25, 1.17, 0.05);
    m.capsule(0.04, 0.22, K.white, 0, 1.04, -0.09, [-0.35, 0, 0]);
    m.capsule(0.03, 0.16, K.red, 0.07, 1.0, -0.09, [-0.35, 0, -0.3]);
  }
  if (kind === 'buon') {
    m.cyl(0.18, 0.13, 0.1, K.thatch, 0, 1.02, 0);
    m.sphere(0.06, 0xff8a3d, 0.05, 1.08, 0.02);
    m.sphere(0.06, 0x8bd24a, -0.06, 1.08, -0.02);
  }
  if (kind === 'nong') {
    m.cyl(0.018, 0.018, 0.65, K.woodDark, -0.22, 0.34, 0.08, [0.35, 0, 0]);
    k.rbox(0.12, 0.05, 0.1, 0.02, K.bronze, -0.22, 0.03, 0.2);
  }
  if (kind === 'laiDo') {
    m.cyl(0.018, 0.018, 0.75, K.woodDark, 0.2, 0.38, 0.12, [0.9, 0, 0]);
    m.rbox(0.08, 0.2, 0.03, 0.02, K.wood, 0.2, 0.08, 0.4, [0.9, 0, 0]);
  }
  return md.group();
}

function makeBoat(): THREE.Object3D {
  const md = new Model();
  const { m } = md;
  m.capsule(0.22, 0.95, K.woodDark, 0, 0.07, 0, [0, 0, Math.PI / 2], [0.55, 1, 1]);
  m.rbox(1.0, 0.04, 0.3, 0.02, K.wood, 0, 0.17, 0);
  m.sphere(0.3, K.thatch, -0.1, 0.18, 0, [1.25, 0.75, 0.85]);
  const g = md.group();
  const rower = makePerson('laiDo');
  rower.scale.setScalar(0.75);
  rower.position.set(-0.6, 0.12, 0);
  rower.rotation.y = Math.PI / 2;
  g.add(rower);
  return g;
}

// ---------- Cây cối ----------

function treeTemplates(): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  // Cây được nhân lên hàng trăm lần nên dùng cầu ít mặt hơn.
  // 0: cây tán tròn phồng.
  let b = new ShapeBuilder(false, true);
  b.cyl(0.07, 0.12, 0.75, K.trunk, 0, 0.37, 0);
  b.sphere(0.42, K.leaf[0], 0, 1.0, 0);
  b.sphere(0.3, K.leaf[1], 0.27, 0.86, 0.1);
  b.sphere(0.32, K.leaf[2], -0.24, 0.9, -0.12);
  b.sphere(0.27, K.leaf[2], 0.02, 1.3, 0.05);
  out.push(b.mesh(matte));
  // 1: cây hai tầng tán.
  b = new ShapeBuilder(false, true);
  b.cyl(0.06, 0.1, 1.0, K.trunk, 0, 0.5, 0);
  b.sphere(0.38, K.leaf[3], 0, 1.0, 0, [1.1, 0.75, 1.1]);
  b.sphere(0.3, K.leaf[0], 0, 1.4, 0, [1, 0.8, 1]);
  b.sphere(0.18, K.leaf[2], 0, 1.7, 0);
  out.push(b.mesh(matte));
  // 2: cây cau.
  b = new ShapeBuilder(false, true);
  b.cyl(0.035, 0.06, 1.9, K.palm, 0, 0.95, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.capsule(0.045, 0.55, K.leaf[i % 3], Math.cos(a) * 0.3, 1.86, Math.sin(a) * 0.3, [Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1], [1, 1, 0.45]);
  }
  for (let i = 0; i < 4; i++) b.sphere(0.05, 0xff9a3d, Math.cos(i * 1.6) * 0.07, 1.78, Math.sin(i * 1.6) * 0.07);
  out.push(b.mesh(matte));
  // 3: bụi tre.
  out.push(bambooClump(5, 2.1, 1));
  // 4: bụi hoa thấp.
  b = new ShapeBuilder(false, true);
  b.sphere(0.28, K.leaf[1], 0, 0.2, 0, [1.3, 0.75, 1.3]);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    b.sphere(0.05, K.flower[i % 3], Math.cos(a) * 0.25, 0.3 + (i % 2) * 0.06, Math.sin(a) * 0.25);
  }
  out.push(b.mesh(matte));
  return out;
}

function bambooClump(stalks: number, height: number, seed: number, mound = false): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  if (mound) b.rbox(0.96, 0.14, 0.96, 0.06, K.soil, 0, 0.07, 0);
  for (let i = 0; i < stalks; i++) {
    const x = (rand() - 0.5) * 0.55;
    const z = (rand() - 0.5) * 0.55;
    const lean = (rand() - 0.5) * 0.2;
    const segs = 3;
    const segLen = (height * (0.8 + rand() * 0.3)) / segs;
    for (let s = 0; s < segs; s++) {
      const y = segLen * (s + 0.5);
      b.capsule(0.045, segLen - 0.09, i % 2 ? K.bamboo : K.bambooDark, x + lean * y, y, z, [0, 0, -lean]);
    }
    const top = segLen * segs;
    for (let l = 0; l < 3; l++) {
      const a = rand() * Math.PI * 2;
      b.sphere(0.18, K.leaf[(i + l) % 4], x + lean * top + Math.cos(a) * 0.14, top - l * 0.18, z + Math.sin(a) * 0.14, [1.5, 0.35, 0.7]);
    }
  }
  return b.mesh(matte);
}

let cachedTrees: THREE.Mesh[] | null = null;
let cachedWalls: THREE.Mesh[] | null = null;

export const toyArt: ArtSet = {
  key: 'B',
  name: 'Đồ chơi bo tròn',
  sky: 0xbfe6f7,
  grass: [0x79b843, 0x72b03e, 0x80c049],
  grassLocked: [0x4f8f30, 0x4a882d, 0x569734],
  water: [0x4fb4e0, 0x48a9d6, 0x55bbe6],
  forestDensity: 0.7,
  setupRenderer(renderer) {
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  },
  lights(scene) {
    addSunAndSky(scene, { sky: 0xfff8ec, ground: 0x6f9a4e, hemi: 1.15, sun: 2.5, sunColor: 0xffe9c8 });
  },
  makeDien,
  makeRuong,
  makeBen,
  makePerson,
  makeBoat,
  buildForest(spots) {
    cachedTrees ??= treeTemplates();
    const placements: Placement[] = spots.map((s) => {
      const r = seeded(s.seed);
      const pick = r();
      const t = s.kind === 'bamboo' ? 3 : pick < 0.45 ? 0 : pick < 0.7 ? 1 : pick < 0.88 ? 2 : 4;
      return { t, x: s.x, z: s.z, s: 0.85 + r() * 0.3, ry: r() * Math.PI * 2 };
    });
    return instanceTemplates(cachedTrees, placements);
  },
  buildWalls(spots) {
    cachedWalls ??= [bambooClump(5, 1.7, 3, true), bambooClump(5, 1.8, 9, true)];
    return instanceTemplates(
      cachedWalls,
      spots.map((s) => ({ t: s.seed % 2, x: s.x, z: s.z, s: 1, ry: (s.seed % 4) * (Math.PI / 2) })),
    );
  },
};
