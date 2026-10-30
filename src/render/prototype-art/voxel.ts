// PROTOTYPE, DÙNG XONG BỎ: biến thể A "Voxel tinh xảo".
// Ghép từ khối nhỏ (1/8 ô), mỗi khối lệch màu nhẹ, góc khuất tối hơn (ambient occlusion).

import * as THREE from 'three';
import { seeded } from '../boxes';
import { addSunAndSky, type ArtSet, type PersonKind } from '../art';
import { instanceTemplates, type Placement } from './common';

const V = {
  soil: 0xa47a4c,
  soilDark: 0x7d5a36,
  stone: 0xbfae8f,
  wood: 0x9a6438,
  woodDark: 0x6a4224,
  woodLight: 0xc28a52,
  thatch: 0xe0aa4e,
  thatchDark: 0xb98234,
  red: 0xc8372b,
  indigo: 0x34509a,
  skin: 0xf2b98a,
  hair: 0x2b1d14,
  bronze: 0xc89436,
  bronzeLight: 0xeac46a,
  white: 0xfaf3e3,
  blush: 0xf48f86,
  water: 0x6fb8c4,
  waterLight: 0x9fd6dc,
  rice: 0x86cc4c,
  ripe: 0xf2cf45,
  leaf: [0x4f9e3a, 0x5fb446, 0x3f8a33, 0x76c556],
  trunk: 0x7a5232,
  bamboo: 0x78b844,
  bambooNode: 0xa8d36a,
  palm: 0x9c8466,
  flower: [0xff7aa8, 0xffd23f, 0xffffff, 0xff9a3d],
};

const material = new THREE.MeshLambertMaterial({ vertexColors: true });
const AO = [0.55, 0.7, 0.85, 1];

function jitter(x: number, y: number, z: number): number {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return 0.9 + (h - Math.floor(h)) * 0.2;
}

/** Lưới voxel thưa: mỗi ô chứa một màu. Chỉ vẽ mặt lộ ra ngoài. */
class Vox {
  private readonly cells = new Map<number, number>();

  private static key(x: number, y: number, z: number): number {
    return ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
  }

  set(x: number, y: number, z: number, color: number | null): void {
    const k = Vox.key(x, y, z);
    if (color === null) this.cells.delete(k);
    else this.cells.set(k, color);
  }

  has(x: number, y: number, z: number): boolean {
    return this.cells.has(Vox.key(x, y, z));
  }

  /** Khối hộp [x0, x1) × [y0, y1) × [z0, z1). Màu có thể là hàm theo tọa độ. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: number | ((x: number, y: number, z: number) => number | null)): this {
    for (let x = x0; x < x1; x++)
      for (let y = y0; y < y1; y++)
        for (let z = z0; z < z1; z++) this.set(x, y, z, typeof color === 'number' ? color : color(x, y, z));
    return this;
  }

  /** Trụ đứng tâm (cx, cz), bán kính r. */
  cyl(cx: number, cz: number, r: number, y0: number, y1: number, color: number | ((x: number, y: number, z: number, d: number) => number)): this {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
        if (d > r) continue;
        for (let y = y0; y < y1; y++) this.set(x, y, z, typeof color === 'number' ? color : color(x, y, z, d));
      }
    return this;
  }

  /** Khối tròn lồi lõm (tán cây). */
  blob(cx: number, cy: number, cz: number, r: number, colors: readonly number[], seed: number, sy = 1): this {
    const rand = seeded(seed);
    const bumps = Array.from({ length: 6 }, () => [rand() - 0.5, rand() - 0.5, rand() - 0.5, rand()]);
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++)
      for (let y = Math.floor(cy - r * sy - 1); y <= cy + r * sy + 1; y++)
        for (let z = Math.floor(cz - r - 1); z <= cz + r + 1; z++) {
          const dx = x + 0.5 - cx;
          const dy = (y + 0.5 - cy) / sy;
          const dz = z + 0.5 - cz;
          let rr = r;
          for (const [bx, by, bz, s] of bumps) rr += (dx * bx + dy * by + dz * bz) * 0.25 * s;
          if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
          const shade = dy > r * 0.35 ? colors[3 % colors.length] : colors[Math.floor(jitter(x, y, z) * 10) % 3];
          this.set(x, y, z, shade);
        }
    return this;
  }

  build(unit: number, cx = 0, cz = 0): THREE.Mesh {
    const pos: number[] = [];
    const nor: number[] = [];
    const col: number[] = [];
    const c = new THREE.Color();
    const p = [0, 0, 0];
    for (const [k, color] of this.cells) {
      const z = (k % 1024) - 512;
      const y = (Math.floor(k / 1024) % 1024) - 512;
      const x = Math.floor(k / 1048576) - 512;
      p[0] = x;
      p[1] = y;
      p[2] = z;
      const j = jitter(x, y, z);
      for (let a = 0; a < 3; a++) {
        for (const s of [1, -1]) {
          const n = [0, 0, 0];
          n[a] = s;
          if (this.has(x + n[0], y + n[1], z + n[2])) continue;
          const b = (a + 1) % 3;
          const cc = (a + 2) % 3;
          const corners = s > 0 ? [[0, 0], [1, 0], [1, 1], [0, 1]] : [[0, 0], [0, 1], [1, 1], [1, 0]];
          const verts = corners.map(([db, dc]) => {
            const v = [p[0], p[1], p[2]];
            v[a] += s > 0 ? 1 : 0;
            v[b] += db;
            v[cc] += dc;
            // Ambient occlusion: đếm khối kề ở phía trước mặt này quanh góc.
            const o1 = [x + n[0], y + n[1], z + n[2]];
            const o2 = [...o1];
            const o3 = [...o1];
            o1[b] += db ? 1 : -1;
            o2[cc] += dc ? 1 : -1;
            o3[b] += db ? 1 : -1;
            o3[cc] += dc ? 1 : -1;
            const s1 = this.has(o1[0], o1[1], o1[2]) ? 1 : 0;
            const s2 = this.has(o2[0], o2[1], o2[2]) ? 1 : 0;
            const s3 = this.has(o3[0], o3[1], o3[2]) ? 1 : 0;
            const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + s3);
            return { v, light: AO[ao] * j };
          });
          for (const i of [0, 1, 2, 0, 2, 3]) {
            const { v, light } = verts[i];
            pos.push((v[0] - cx) * unit, v[1] * unit, (v[2] - cz) * unit);
            nor.push(n[0], n[1], n[2]);
            c.set(color).multiplyScalar(light);
            col.push(c.r, c.g, c.b);
          }
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}

const U = 1 / 8;

function wrap(mesh: THREE.Mesh, scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh);
  g.scale.setScalar(scale);
  return g;
}

/** Mái nhà sàn bậc thang: sống mái cong lên ở hai đầu. */
function voxRoof(v: Vox, x0: number, x1: number, z0: number, z1: number, baseY: number, lift: number, slope: number): void {
  const mid = (x0 + x1 - 1) / 2;
  const half = (x1 - x0 - 1) / 2;
  const zMid = (z0 + z1 - 1) / 2;
  for (let x = x0; x < x1; x++) {
    const u = Math.abs(x - mid) / half;
    const ridge = baseY + Math.round(lift * Math.pow(u, 2.2));
    for (let z = z0; z < z1; z++) {
      const d = Math.abs(z - zMid);
      const y = ridge - Math.floor(d * slope);
      const col = d < 1 ? V.thatchDark : y % 2 ? V.thatch : 0xd29b45;
      v.set(x, y, z, col);
      v.set(x, y - 1, z, V.thatchDark);
    }
  }
}

function voxBird(v: Vox, x: number, y: number, z: number, dir: number): void {
  v.box(x, y, z, x + 2, y + 1, z + 1, V.bronze);
  v.set(x + (dir > 0 ? 2 : -1), y + 1, z, V.bronze);
  v.set(x + (dir > 0 ? 3 : -2), y + 1, z, V.bronzeLight);
  v.set(x + (dir > 0 ? -1 : 2), y + 1, z, V.bronze);
  v.set(x + (dir > 0 ? -1 : 2), y + 2, z, V.bronze);
}

function voxDrum(v: Vox, cx: number, cz: number, r: number, y0: number): void {
  v.cyl(cx, cz, r, y0, y0 + 3, (_x, y, _z, d) => (y === y0 + 2 ? (d < 0.9 ? V.red : Math.floor(d * 1.6) % 2 ? V.bronzeLight : V.bronze) : V.bronze));
}

function makeDien(level: number): THREE.Group {
  const v = new Vox();
  v.box(0, 0, 0, 32, 1, 32, (x, _y, z) => (x === 0 || z === 0 || x === 31 || z === 31 ? V.stone : V.soil));
  for (const x of [5, 15, 25]) for (const z of [7, 15, 23]) v.box(x, 1, z, x + 2, 9, z + 2, V.woodDark);
  v.box(3, 9, 5, 29, 10, 27, (x) => (x % 2 ? V.wood : V.woodLight));
  v.box(6, 10, 8, 26, 17, 24, (x, y) => (y === 16 ? V.red : x % 3 === 0 ? V.wood : V.woodLight));
  v.box(14, 10, 23, 18, 15, 24, V.woodDark);
  for (const x of [8, 22]) v.box(x, 12, 23, x + 2, 14, 24, V.woodDark);
  for (let i = 0; i < 4; i++) v.box(13, 8 - i * 2, 27 + i, 19, 9 - i * 2, 28 + i, V.woodDark);
  voxRoof(v, 1, 31, 2, 30, 23, 5, 0.75);
  voxDrum(v, 28, 29, 2.6, 1);
  v.box(2, 1, 29, 3, 21, 30, V.woodDark);
  v.box(3, 17, 29, 8, 20, 30, (x, y) => ((x + y) % 4 === 0 ? 0xe24a3a : V.red));
  if (level >= 2) {
    voxBird(v, 0, 29, 15, -1);
    voxBird(v, 30, 29, 15, 1);
  }
  if (level >= 3) {
    v.box(0, 7, 10, 3, 8, 22, V.wood);
    for (const z of [10, 21]) v.box(0, 1, z, 1, 7, z + 1, V.woodDark);
    voxDrum(v, 7, 29, 2, 1);
  }
  if (level >= 4) {
    for (const x of [11, 20]) {
      v.box(x, 1, 30, x + 1, 13, 31, V.woodDark);
      v.box(x - 1, 13, 30, x, 16, 31, V.white);
      v.box(x + 1, 13, 30, x + 2, 16, 31, V.red);
    }
  }
  if (level >= 5) for (let x = 10; x < 22; x++) v.set(x, 24, 16, V.bronzeLight);
  return wrap(v.build(U, 16, 16), 0.9 + 0.04 * level);
}

function makeRuong(level: number): THREE.Group {
  const v = new Vox();
  const ripe = new THREE.Color(V.rice).lerp(new THREE.Color(V.ripe), (level - 1) / 4).getHex();
  v.box(0, 0, 0, 24, 1, 24, (x, _y, z) => (jitter(x, 0, z) > 1.06 ? V.waterLight : V.water));
  v.box(0, 1, 0, 24, 2, 24, (x, _y, z) => (x === 0 || z === 0 || x === 23 || z === 23 || z === 11 || z === 12 ? V.soil : null));
  for (let x = 3; x < 22; x += 3) {
    for (let z = 2; z < 23; z += 3) {
      if (z === 11) continue;
      const h = 2 + level + (jitter(x, 1, z) > 1.05 ? 1 : 0);
      v.box(x, 1, z, x + 1, 1 + h, z + 1, (_x, y) => (y >= h ? ripe : y === h - 1 && level >= 2 ? ripe : V.rice));
      if (level >= 3) v.set(x + 1, h, z, ripe);
    }
  }
  return wrap(v.build(U, 12, 12));
}

function makeBen(level: number): THREE.Group {
  const v = new Vox();
  for (const x of [1, 13]) for (const z of [1, 10]) v.box(x, -3, z, x + 2, 3, z + 2, V.woodDark);
  v.box(0, 3, 0, 16, 4, 13, (x) => (x % 2 ? V.wood : V.woodLight));
  v.box(8, 2, 12, 12, 3, 30, (_x, _y, z) => (z % 2 ? V.wood : V.woodLight));
  for (const z of [17, 23, 29]) v.box(9, -4, z, 10, 2, z + 1, V.woodDark);
  v.box(1, 4, 1, 9, 9, 7, (x, y) => (y === 8 ? V.red : x % 3 ? V.woodLight : V.wood));
  v.box(4, 4, 6, 6, 8, 7, V.woodDark);
  voxRoof(v, 0, 10, 0, 8, 12, 2, 0.8);
  v.box(11, 4, 1, 14, 6, 4, V.thatch);
  v.box(12, 5, 2, 13, 6, 3, V.white);
  v.cyl(13, 7, 1.4, 4, 7, V.soilDark);
  if (level >= 2) v.box(2, 4, 9, 5, 6, 12, V.thatch);
  if (level >= 3) {
    v.box(15, 4, 9, 16, 14, 10, V.woodDark);
    v.box(12, 11, 9, 15, 14, 10, V.indigo);
  }
  if (level >= 4) v.cyl(6, 10, 1.3, 4, 7, V.soilDark);
  if (level >= 5) v.box(10, 4, 8, 12, 6, 10, V.bronze);
  return wrap(v.build(U, 8, 8));
}

function makePerson(kind: PersonKind): THREE.Object3D {
  const v = new Vox();
  const cloth = kind === 'buon' ? V.indigo : V.red;
  v.box(3, 0, 3, 5, 3, 5, V.skin);
  v.box(6, 0, 3, 8, 3, 5, V.skin);
  v.box(2, 3, 2, 9, 7, 6, (_x, y) => (y === 6 ? V.hair : cloth));
  v.box(3, 7, 3, 8, 9, 5, V.skin);
  v.box(1, 5, 3, 2, 9, 5, V.skin);
  v.box(9, 5, 3, 10, 9, 5, V.skin);
  // Đầu to, mặt quay về +z.
  v.box(0, 9, 0, 11, 18, 9, V.skin);
  v.box(0, 15, 0, 11, 18, 9, V.hair);
  v.box(0, 10, 0, 11, 15, 2, V.hair);
  for (const x of [0, 10]) v.box(x, 12, 2, x + 1, 15, 6, V.hair);
  v.box(1, 15, 8, 10, 16, 9, V.skin);
  v.box(2, 14, 8, 5, 15, 9, V.hair);
  v.box(6, 14, 8, 9, 15, 9, V.hair);
  v.box(4, 18, 2, 7, 20, 5, V.hair);
  for (const x of [2, 7]) {
    v.box(x, 11, 8, x + 2, 13, 9, 0x1b1410);
    v.set(x + 1, 12, 8, 0xffffff);
  }
  v.set(1, 10, 8, V.blush);
  v.set(9, 10, 8, V.blush);
  v.box(5, 10, 8, 6, 11, 9, 0x8a3a2a);
  if (kind === 'linh') {
    v.box(11, 1, 5, 12, 24, 6, V.woodDark);
    v.box(11, 24, 5, 12, 27, 6, V.bronze);
    v.box(5, 20, 1, 6, 25, 2, V.white);
    v.box(6, 20, 1, 7, 23, 2, V.red);
  }
  if (kind === 'buon') v.box(1, 20, 1, 10, 22, 8, (x, y) => (y === 21 && x % 3 === 0 ? 0xff8a3d : V.thatch));
  if (kind === 'nong') {
    v.box(-1, 2, 6, 0, 12, 7, V.woodDark);
    v.box(-2, 1, 6, 1, 2, 9, V.bronze);
  }
  if (kind === 'laiDo') {
    v.box(11, 2, 7, 12, 14, 8, V.woodDark);
    v.box(11, 0, 7, 12, 3, 10, V.wood);
  }
  return wrap(v.build(1 / 20, 5.5, 4.5));
}

function makeBoat(): THREE.Object3D {
  const v = new Vox();
  v.box(1, 0, 0, 13, 2, 4, (x, y, z) => (y === 1 && z > 0 && z < 3 && x > 1 && x < 12 ? null : V.woodDark));
  v.box(0, 1, 1, 1, 3, 3, V.woodDark);
  v.box(13, 1, 1, 14, 3, 3, V.woodDark);
  v.box(4, 2, 0, 9, 4, 4, (x, y) => (y === 3 || x === 4 || x === 8 ? V.thatchDark : V.thatch));
  const g = wrap(v.build(U, 7, 2));
  const rower = makePerson('laiDo');
  rower.scale.setScalar(0.75);
  rower.position.set(-0.6, 0.12, 0);
  rower.rotation.y = Math.PI / 2;
  g.add(rower);
  return g;
}

// ---------- Cây cối ----------

function bamboo(v: Vox, x: number, z: number, h: number, seed: number): void {
  const rand = seeded(seed);
  for (let y = 0; y < h; y++) v.set(x, y, z, y % 4 === 3 ? V.bambooNode : V.bamboo);
  for (let i = 0; i < 4; i++) {
    const y = h - 1 - i * 2;
    const dx = rand() < 0.5 ? 1 : -1;
    const dz = rand() < 0.5 ? 1 : -1;
    v.set(x + dx, y, z, V.leaf[i % 4]);
    v.set(x + dx * 2, y - 1, z, V.leaf[(i + 1) % 4]);
    v.set(x, y, z + dz, V.leaf[(i + 2) % 4]);
  }
  v.set(x, h, z, V.leaf[3]);
}

function treeTemplates(): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  // 0: cây tán tròn.
  let v = new Vox();
  v.box(-1, 0, -1, 1, 7, 1, V.trunk);
  v.blob(0, 9, 0, 4.6, V.leaf, 3);
  out.push(v.build(U));
  // 1: cây đa lớn.
  v = new Vox();
  v.box(-1, 0, -1, 2, 8, 2, V.trunk);
  v.box(-3, 0, 0, -1, 1, 1, V.trunk);
  v.box(2, 0, 0, 4, 1, 1, V.trunk);
  v.blob(0, 10, 0, 6, V.leaf, 8, 0.7);
  out.push(v.build(U));
  // 2: cây cau.
  v = new Vox();
  for (let y = 0; y < 15; y++) v.set(0, y, 0, y % 3 === 2 ? 0x7d6a52 : V.palm);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]];
  dirs.forEach(([dx, dz], i) => {
    for (let t = 1; t <= 5; t++) v.set(dx * t, 15 - Math.floor((t * t) / 7), dz * t, V.leaf[(i + t) % 4]);
  });
  v.set(0, 15, 0, V.leaf[3]);
  v.box(-1, 13, -1, 1, 14, 1, 0xff9a3d);
  out.push(v.build(U));
  // 3: bụi tre.
  v = new Vox();
  const rand = seeded(5);
  for (let i = 0; i < 5; i++) bamboo(v, Math.floor((rand() - 0.5) * 6), Math.floor((rand() - 0.5) * 6), 13 + Math.floor(rand() * 5), i + 1);
  out.push(v.build(U));
  // 4: bụi hoa.
  v = new Vox();
  v.blob(0, 2, 0, 2.6, [V.leaf[1], V.leaf[0], V.leaf[2], V.leaf[3]], 2, 0.8);
  for (let i = 0; i < 8; i++) {
    const a = i * 0.8;
    v.set(Math.round(Math.cos(a) * 2.4), 3 + (i % 2), Math.round(Math.sin(a) * 2.4), V.flower[i % 4]);
  }
  out.push(v.build(U));
  return out;
}

function wallTemplate(seed: number): THREE.Mesh {
  const v = new Vox();
  v.box(-4, 0, -4, 4, 1, 4, (x, _y, z) => (jitter(x, 0, z) > 1.04 ? V.soilDark : V.soil));
  const rand = seeded(seed);
  for (let i = 0; i < 6; i++) bamboo(v, Math.floor((rand() - 0.5) * 6), Math.floor((rand() - 0.5) * 6), 11 + Math.floor(rand() * 4), seed * 10 + i);
  return v.build(U);
}

let cachedTrees: THREE.Mesh[] | null = null;
let cachedWalls: THREE.Mesh[] | null = null;

export const voxelArt: ArtSet = {
  key: 'A',
  name: 'Voxel tinh xảo',
  sky: 0xcde9f2,
  grass: [0x9ccc5a, 0x94c453, 0xa3d262],
  grassLocked: [0x6aa441, 0x649c3c, 0x70ab46],
  water: [0x5aa9d6, 0x55a1cd, 0x60b1dd],
  forestDensity: 0.6,
  setupRenderer(renderer) {
    renderer.shadowMap.type = THREE.PCFShadowMap;
  },
  lights(scene) {
    addSunAndSky(scene, { sky: 0xeaf6ff, ground: 0x8a7a50, hemi: 1.8, sun: 2.4, sunColor: 0xffefd2 });
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
      const t = s.kind === 'bamboo' ? 3 : pick < 0.4 ? 0 : pick < 0.55 ? 1 : pick < 0.8 ? 2 : 4;
      return { t, x: s.x, z: s.z, s: 0.85 + r() * 0.3, ry: Math.floor(r() * 4) * (Math.PI / 2) };
    });
    return instanceTemplates(cachedTrees, placements);
  },
  buildWalls(spots) {
    cachedWalls ??= [wallTemplate(1), wallTemplate(2)];
    return instanceTemplates(
      cachedWalls,
      spots.map((s) => ({ t: s.seed % 2, x: s.x, z: s.z, s: 1, ry: (s.seed % 4) * (Math.PI / 2) })),
    );
  },
};
