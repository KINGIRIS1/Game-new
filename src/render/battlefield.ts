// Cảnh bãi chiến của phó bản: một cảnh Three.js riêng, dùng chung renderer và camera với kinh đô.
// Bãi nằm xoay 45° để quân ta (phía z lớn) ở cuối màn hình, giặc (phía z nhỏ) ở đầu màn hình.
// Nền đổi theo từng màn: rừng, bến sông, làng, đồn giặc, chân núi.

import * as THREE from 'three';
import { FIELD, type Terrain } from '../game/defs';
import { BattleView } from './battleView';
import { addSunLights } from './lights';
import { buildForest, makeBoat, makeEnemyFlag, makeFighter, makeMountain, makeTent, type TreeSpot } from './models';
import { makeNhaSan, makeRuong } from './buildings';
import { C } from './palette';
import { ShapeBuilder, seeded } from './shapes';
import { ToonModel, toon } from './toon';

const groundMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

const TERRAINS: Terrain[] = ['rung', 'benSong', 'lang', 'don', 'nui'];
const OUTSIDE: Record<Terrain, number> = { rung: C.grassLocked[0], benSong: C.grassLocked[1], lang: C.grassLocked[2], don: 0x8a8550, nui: 0x7a8048 };
const FIELD_COLOR: Record<Terrain, number> = { rung: C.grass[0], benSong: 0xb8b27a, lang: C.grass[2], don: 0xa89a62, nui: 0x9aa262 };
const TREE_DENSITY: Record<Terrain, number> = { rung: 0.8, benSong: 0.45, lang: 0.35, don: 0.4, nui: 0.5 };

/** Một vùng không trồng cây (để chỗ cho sông, nhà, lều, núi). */
type Zone = { x0: number; x1: number; z0: number; z1: number };

export class Battlefield {
  readonly scene = new THREE.Scene();
  readonly view: BattleView;
  private readonly inner = new THREE.Group();
  private decor = new THREE.Group();
  private terrain: Terrain | null = null;

  constructor() {
    this.scene.background = new THREE.Color(C.sky);
    this.scene.fog = new THREE.Fog(C.sky, 75, 125);
    addSunLights(this.scene, 16, 1024);
    const field = new THREE.Group();
    field.rotation.y = Math.PI / 4;
    this.inner.position.set(-FIELD.w / 2, 0, -FIELD.d / 2);
    field.add(this.inner);
    this.scene.add(field);
    this.inner.add(this.decor);
    this.view = new BattleView(this.inner, { x: 0, z: 0 }, 1.25);
  }

  setTerrain(t: Terrain): void {
    if (t === this.terrain) return;
    this.terrain = t;
    this.inner.remove(this.decor);
    // Cây rừng dùng chung mẫu (InstancedMesh), chỉ bỏ hình riêng của từng cảnh.
    this.decor.traverse((o) => {
      if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh)) o.geometry.dispose();
    });
    this.decor = buildDecor(t);
    this.inner.add(this.decor);
  }
}

function buildDecor(t: Terrain): THREE.Group {
  const g = new THREE.Group();
  const W = FIELD.w;
  const D = FIELD.d;
  const ground = new ShapeBuilder();
  ground.box(90, 1, 100, OUTSIDE[t], W / 2, -0.5, D / 2);
  ground.box(W + 1, 0.04, D + 1, FIELD_COLOR[t], W / 2, 0.02, D / 2);
  const groundMesh = ground.mesh(groundMaterial);
  groundMesh.castShadow = false;
  g.add(groundMesh);

  const zones: Zone[] = [{ x0: -1.5, x1: W + 1.5, z0: -1.5, z1: D + 1.5 }];
  // Lạc tướng đứng sau hàng quân ta, cạnh trống đồng và cờ đỏ.
  zones.push({ x0: W / 2 - 2.5, x1: W / 2 + 2.5, z0: D, z1: D + 4 });
  g.add(commander(W / 2, D + 2));

  const place = (obj: THREE.Object3D, x: number, z: number, ry = 0) => {
    obj.position.set(x, 0, z);
    obj.rotation.y = ry;
    g.add(obj);
    return obj;
  };

  if (t === 'benSong') {
    // Sông chảy ngang phía sau quân giặc, có thuyền đậu.
    const water = new ShapeBuilder();
    water.box(60, 0.1, 5, C.water[0], W / 2, 0.01, -5);
    const wm = water.mesh(groundMaterial);
    wm.castShadow = false;
    g.add(wm);
    zones.push({ x0: -30, x1: 40, z0: -8, z1: -2 });
    for (const [x, z] of [[1.5, -4.2], [7.5, -5.6]]) place(makeBoat(), x, z, Math.PI / 2).position.y = 0.02;
    const dock = new ToonModel();
    dock.plain.box(1.2, 0.12, 2.2, C.wood, 0, 0.16, 0);
    for (const dx of [-0.5, 0.5]) for (const dz of [-0.9, 0.9]) dock.plain.cyl(0.06, 0.06, 0.3, C.woodDark, dx, 0.05, dz, undefined, 5);
    place(dock.group(), W / 2, -2.8);
  }
  if (t === 'lang') {
    for (const [x, z] of [[-0.5, -4], [3, -5.6], [6.5, -3.8], [10, -5.2]]) {
      place(makeNhaSan(2), x, z, Math.PI);
      zones.push({ x0: x - 1.6, x1: x + 1.6, z0: z - 1.6, z1: z + 1.6 });
    }
    for (const [x, z] of [[0.5, D + 3.5], [8.5, D + 3.5]]) {
      place(makeRuong(2), x, z);
      zones.push({ x0: x - 2, x1: x + 2, z0: z - 2, z1: z + 2 });
    }
  }
  if (t === 'don') {
    // Hàng rào cọc nhọn chắn đồn, chừa cổng ở giữa.
    const stakes = new ShapeBuilder();
    const rand = seeded(17);
    for (let x = -1.5; x <= W + 1.5; x += 0.32) {
      if (Math.abs(x - W / 2) < 0.9) continue;
      const h = 0.9 + rand() * 0.3;
      stakes.cyl(0.07, 0.08, h, C.bamboo, x, h / 2, -1.9, undefined, 5);
      stakes.cone(0.08, 0.2, C.woodLight, x, h + 0.1, -1.9, undefined, 5);
    }
    g.add(stakes.mesh(toon));
    for (const [x, z] of [[0.5, -4.5], [3, -6.5], [6, -5.5], [8.5, -4.2], [W / 2, -9]]) place(makeTent(), x, z, x);
    for (const [x, z] of [[W / 2 - 1.1, -2.3], [W / 2 + 1.1, -2.3], [W / 2 + 0.3, -7.2]]) place(makeEnemyFlag(), x, z, Math.PI / 2);
    zones.push({ x0: -3, x1: W + 3, z0: -11, z1: -1.5 });
  }
  if (t === 'nui') {
    // Núi Trâu sừng sững sau lưng quân giặc.
    place(makeMountain(6.5, 9, 0x6f7a44), W / 2, -15);
    place(makeMountain(4.5, 6, 0x7a8549), -2, -11.5);
    place(makeMountain(5, 6.5, 0x75804a), W + 2, -12);
    zones.push({ x0: -8, x1: W + 8, z0: -22, z1: -7 });
    for (const [x, z] of [[W / 2 - 1.1, -2.3], [W / 2 + 1.1, -2.3]]) place(makeEnemyFlag(2.8), x, z, Math.PI / 2);
  }

  const rand = seeded(31 + TERRAINS.indexOf(t) * 101);
  const spots: TreeSpot[] = [];
  const inZone = (x: number, z: number) => zones.some((zn) => x > zn.x0 && x < zn.x1 && z > zn.z0 && z < zn.z1);
  for (let x = -8; x <= W + 8; x += 1.3) {
    for (let z = -20; z <= D + 18; z += 1.3) {
      const px = x + (rand() - 0.5) * 0.9;
      const pz = z + (rand() - 0.5) * 0.9;
      const keep = rand() < TREE_DENSITY[t];
      const bamboo = rand() < (t === 'rung' ? 0.55 : 0.3);
      const seed = Math.floor(rand() * 1e6);
      if (!keep || inZone(px, pz)) continue;
      spots.push({ x: px, z: pz, kind: bamboo ? 'bamboo' : 'tree', seed });
    }
  }
  g.add(buildForest(spots));
  return g;
}

/** Lạc tướng đứng cạnh trống đồng lớn và cờ đỏ, sau lưng quân ta. */
function commander(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const lord = makeFighter('giao');
  lord.position.set(0.7, 0, 0);
  lord.rotation.y = Math.PI;
  const m = new ToonModel();
  m.band.cyl(0.42, 0.38, 0.4, C.bronze, -0.4, 0.28, 0, undefined, 16);
  m.drum.cyl(0.44, 0.44, 0.05, 0xffffff, -0.4, 0.5, 0, undefined, 20);
  for (const s of [-1, 1]) m.plain.cyl(0.03, 0.03, 0.4, C.woodDark, -0.4 + s * 0.38, 0.12, 0, undefined, 5);
  m.plain.cyl(0.035, 0.04, 2.4, C.woodDark, 1.4, 1.2, 0.3, undefined, 6);
  m.band.box(0.6, 0.5, 0.03, C.red, 1.7, 2.1, 0.3);
  g.add(lord, m.group());
  g.position.set(x, 0, z);
  return g;
}
