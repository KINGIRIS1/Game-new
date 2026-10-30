// Bộ hình ảnh: mọi thứ quyết định cảnh trông ra sao (mô hình, cây, màu đất, ánh sáng).
// World chỉ lo vị trí và chuyển động, còn vẽ thế nào là việc của ArtSet.

import * as THREE from 'three';
import { BoxBuilder, seeded } from './boxes';
import { makeBen, makeBoat, makeDien, makePerson, makeRuong, type PersonKind } from './models';
import { C } from './palette';

export type { PersonKind };

/** Một chỗ mọc cây, tọa độ thế giới. `seed` dùng để mỗi cây khác nhau nhưng không đổi giữa các lần vẽ. */
export interface TreeSpot {
  x: number;
  z: number;
  kind: 'tree' | 'bamboo';
  seed: number;
  farBank: boolean;
}

/** Một đoạn lũy tre, tọa độ thế giới của tâm ô. */
export interface WallSpot {
  x: number;
  z: number;
  seed: number;
}

export interface ArtSet {
  key: string;
  name: string;
  sky: number;
  grass: readonly number[];
  grassLocked: readonly number[];
  water: readonly number[];
  /** Hệ số mật độ rừng, 1 là mặc định. */
  forestDensity: number;
  setupRenderer(renderer: THREE.WebGLRenderer): void;
  lights(scene: THREE.Scene): void;
  makeDien(level: number): THREE.Group;
  makeRuong(level: number): THREE.Group;
  makeBen(level: number): THREE.Group;
  makePerson(kind: PersonKind): THREE.Object3D;
  makeBoat(): THREE.Object3D;
  buildForest(spots: TreeSpot[]): THREE.Object3D;
  buildWalls(spots: WallSpot[]): THREE.Object3D;
}

/** Nhiều khối hộp vẽ trong một lần, mỗi khối có màu riêng. */
export class InstancedBoxes {
  readonly mesh: THREE.InstancedMesh;
  private count = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();

  constructor(capacity: number, opts: { shadow?: boolean } = {}) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial();
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = !!opts.shadow;
    this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  begin(): void {
    this.count = 0;
  }

  add(w: number, h: number, d: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void {
    if (this.count >= this.mesh.instanceMatrix.count) return;
    this.q.setFromEuler(this.e.set(rx, ry, rz));
    this.m.compose(this.p.set(x, y, z), this.q, this.s.set(w, h, d));
    this.mesh.setMatrixAt(this.count, this.m);
    this.mesh.setColorAt(this.count, this.c.set(color));
    this.count++;
  }

  end(): void {
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

/** Mặt trời có bóng đổ phủ cả lưới, cộng ánh sáng bầu trời. */
export function addSunAndSky(
  scene: THREE.Scene,
  opts: { sky: number; ground: number; hemi: number; sun: number; sunColor: number; mapSize?: number },
): THREE.DirectionalLight {
  scene.add(new THREE.HemisphereLight(opts.sky, opts.ground, opts.hemi));
  const sun = new THREE.DirectionalLight(opts.sunColor, opts.sun);
  sun.position.set(-10, 24, 14);
  sun.castShadow = true;
  const cam = sun.shadow.camera;
  cam.left = -24;
  cam.right = 24;
  cam.top = 24;
  cam.bottom = -24;
  cam.near = 1;
  cam.far = 70;
  sun.shadow.mapSize.set(opts.mapSize ?? 2048, opts.mapSize ?? 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  return sun;
}

// ---------- Bộ hình khối hộp hiện tại ----------

function addBamboo(target: InstancedBoxes, cx: number, cz: number, rand: () => number, stalks: number, height: number): void {
  for (let i = 0; i < stalks; i++) {
    const x = cx + (rand() - 0.5) * 0.6;
    const z = cz + (rand() - 0.5) * 0.6;
    const h = height * (0.75 + rand() * 0.45);
    const lean = (rand() - 0.5) * 0.25;
    target.add(0.08, h, 0.08, i % 2 ? C.bamboo : C.bambooDark, x, h / 2, z, lean, 0, lean);
    target.add(0.34, 0.16, 0.34, C.leaf[i % 3], x + lean * h * 0.5, h, z - lean * h * 0.5, 0, rand() * 1.5, 0);
    target.add(0.22, 0.14, 0.22, C.leaf[(i + 1) % 3], x + lean * h * 0.4, h - 0.25, z - lean * h * 0.4, 0, rand() * 1.5, 0);
  }
}

function addTree(target: InstancedBoxes, cx: number, cz: number, rand: () => number): void {
  const s = 0.8 + rand() * 0.5;
  const leaf = C.leaf[Math.floor(rand() * 3)];
  target.add(0.18 * s, 0.7 * s, 0.18 * s, C.trunk, cx, 0.35 * s, cz);
  target.add(0.95 * s, 0.6 * s, 0.95 * s, leaf, cx, 0.95 * s, cz, 0, rand(), 0);
  target.add(0.6 * s, 0.45 * s, 0.6 * s, leaf, cx, 1.4 * s, cz, 0, rand(), 0);
}

export const boxArt: ArtSet = {
  key: '0',
  name: 'Khối hộp hiện tại',
  sky: C.sky,
  grass: C.grass,
  grassLocked: C.grassLocked,
  water: C.water,
  forestDensity: 1,
  setupRenderer(renderer) {
    renderer.shadowMap.type = THREE.PCFShadowMap;
  },
  lights(scene) {
    addSunAndSky(scene, { sky: 0xfff4dc, ground: 0x6d7a45, hemi: 1.6, sun: 2.2, sunColor: 0xffe7c2 });
  },
  makeDien,
  makeRuong,
  makeBen,
  makePerson,
  makeBoat,
  buildForest(spots) {
    const trees = new InstancedBoxes(spots.length * 12 + 1, { shadow: true });
    trees.begin();
    for (const s of spots) {
      const rand = seeded(s.seed);
      if (s.kind === 'bamboo') addBamboo(trees, s.x, s.z, rand, 4, 2.0);
      else addTree(trees, s.x, s.z, rand);
    }
    trees.end();
    return trees.mesh;
  },
  buildWalls(spots) {
    const walls = new InstancedBoxes(spots.length * 16 + 1, { shadow: true });
    walls.begin();
    for (const s of spots) {
      walls.add(0.96, 0.12, 0.96, C.soil, s.x, 0.06, s.z);
      addBamboo(walls, s.x, s.z, seeded(s.seed), 5, 1.7);
    }
    walls.end();
    return walls.mesh;
  },
};

/** Đất và nước ngoài lưới theo màu của bộ hình. */
export function buildStaticTerrain(art: ArtSet, half: number, riverStart: number, waterY: number): THREE.Object3D {
  const group = new THREE.Group();
  const b = new BoxBuilder();
  const far = 70;
  const river = riverStart - half;
  // Đất bên này sông (phía rừng), nằm dưới các ô lưới.
  b.box(far + river, 1, far + river, art.grassLocked[0], (river - far) / 2, -0.52, (river - far) / 2);
  // Bờ bên kia sông Thao (phía đông) và sông Đà (phía nam).
  b.box(far - half, 1, 2 * far, art.grassLocked[1], (half + far) / 2, -0.52, 0);
  b.box(far + river, 1, far - half, art.grassLocked[2], (river - far) / 2, -0.52, (half + far) / 2);
  const terrain = b.build();
  terrain.castShadow = false;
  group.add(terrain);

  const water = new BoxBuilder();
  water.box(half - river, 1, 2 * far, art.water[0], (river + half) / 2, waterY - 0.5, 0);
  water.box(far + river, 1, half - river, art.water[1], (river - far) / 2, waterY - 0.5, (river + half) / 2);
  const waterMesh = water.build();
  waterMesh.castShadow = false;
  group.add(waterMesh);
  return group;
}
