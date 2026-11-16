// Cảnh map dã ngoại (docs/thiet-ke.md mục Kế hoạch: dã ngoại): nền đất theo vùng, đường mòn nối trại, các khu và cổng,
// vật cản đúng chỗ của luật (`daNgoaiMap.ts`: cây rừng vẽ như rừng kinh đô, khóm tre, đá, bụi sim, cây chết, lau vẽ
// bằng hàm vẽ vật cản của bãi chiến `VE`, ao nước), rừng viền quanh map, trại có lều tranh và cột cờ, cổng sang map kề
// có vòng sáng xoay, vòng đá quanh khu boss. Đội và quái vẽ bằng `BattleView` như mọi trận.
//
// Map xoay 45° như bãi chiến (camera nhìn chéo); `toScene`, `fromScene` đổi tọa độ map và tọa độ cảnh.

import * as THREE from 'three';
import type { Battle } from '../game/battle';
import { DA_KHUNG, type DaCan, type DaMapId } from '../game/defs';
import { boCuc, type DaBoCuc, type Diem } from '../game/daNgoaiMap';
import { BattleView } from './battleView';
import { addSunLights, type SunLights } from './lights';
import { buildForest, setForestLite, type TreeSpot } from './models';
import { C } from './palette';
import { ShapeBuilder, seeded } from './shapes';
import { glowMaterial, inkThin, outlineOf, toon, ToonModel } from './toon';
import { TROI_NGAY, type BoTroi } from './troi';
import { VE } from './vatCan';

/** Màu đất, đường mòn, đất khu quái và trời của từng map. */
interface MauMap {
  co: number;
  co2: number;
  duong: number;
  khu: number;
  ngoai: number;
  troi: BoTroi;
}

const DEM: BoTroi = { sky: 0x4a4868, sun: 1.6, hemi: 0.85, sunColor: 0xc4ccff, hemiSky: 0x8a86c4, hemiGround: 0x3a3448 };

const MAU: Record<DaMapId, MauMap> = {
  1: { co: 0x86a54c, co2: 0x7a9a44, duong: 0xb89a62, khu: 0x9c9a58, ngoai: 0x5f7e36, troi: TROI_NGAY },
  2: { co: 0x7c9c5e, co2: 0x6c8e58, duong: 0x8f805a, khu: 0x8a8a5a, ngoai: 0x557a46, troi: { ...TROI_NGAY, sky: 0xd8e0d0 } },
  3: { co: 0x6e7a5a, co2: 0x626e52, duong: 0x8c7c68, khu: 0x7a7060, ngoai: 0x4c5640, troi: DEM },
  4: { co: 0xc9b886, co2: 0xa4ac66, duong: 0xb59c70, khu: 0xbfa878, ngoai: 0x8e9c5a, troi: { ...TROI_NGAY, sky: 0xe6ecdc } },
  5: { co: 0x5f9042, co2: 0x52823a, duong: 0xa48c5c, khu: 0x7c8a4c, ngoai: 0x3e6a30, troi: TROI_NGAY },
  // Núi Nưa: cỏ núi xanh sẫm, đường mòn đất đỏ, trời núi mờ sương.
  6: { co: 0x6a8a4a, co2: 0x5c7c42, duong: 0xa8724e, khu: 0x8a7656, ngoai: 0x445e34, troi: { ...TROI_NGAY, sky: 0xcfd8d8 } },
};

/** Map rộng thêm chừng này ô mỗi phía: rừng viền che mép map. */
const VIEN = 14;
const W = DA_KHUNG.w;
const D = DA_KHUNG.d;
const NUOC = { sau: C.water[1], nong: 0x6fa8a2, bo: 0xb8a878 };

const len = (dx: number, dz: number) => Math.sqrt(dx * dx + dz * dz);

function segDist(x: number, z: number, a: Diem, b: Diem): number {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const l2 = vx * vx + vz * vz;
  const k = l2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / l2)) : 0;
  return len(x - a.x - vx * k, z - a.z - vz * k);
}

/** Nền đất: một tấm lưới ô 1 tô màu theo đỉnh (cỏ lốm đốm, đường mòn, đất khu, ngoài mép map sẫm). */
function nenDat(bc: DaBoCuc, mau: MauMap): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(W + VIEN * 2, D + VIEN * 2, W + VIEN * 2, D + VIEN * 2);
  geo.rotateX(-Math.PI / 2);
  geo.translate(W / 2, 0, D / 2);
  geo.deleteAttribute('uv');
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const co = new THREE.Color(mau.co);
  const co2 = new THREE.Color(mau.co2);
  const duong = new THREE.Color(mau.duong);
  const khu = new THREE.Color(mau.khu);
  const ngoai = new THREE.Color(mau.ngoai);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = 0.5 + 0.25 * Math.sin(x * 0.37 + z * 0.21) + 0.25 * Math.sin(x * 0.13 - z * 0.41 + 1.7);
    c.copy(co).lerp(co2, n);
    let dLoi = Infinity;
    for (let k = 0; k + 1 < bc.loi.length; k++) dLoi = Math.min(dLoi, segDist(x, z, bc.loi[k], bc.loi[k + 1]));
    for (const v of [...bc.khu, bc.boss]) {
      const d = len(x - v.x, z - v.z) - v.r;
      if (d < 1.5) c.lerp(khu, 0.55 * THREE.MathUtils.smoothstep(1.5 - d, 0, 2.5));
    }
    if (len(x - bc.trai.x, z - bc.trai.z) < 6) dLoi = Math.min(dLoi, len(x - bc.trai.x, z - bc.trai.z) - 4);
    c.lerp(duong, 0.85 * (1 - THREE.MathUtils.smoothstep(dLoi, 0.6, 1.6)));
    const out = Math.max(-x, x - W, -z, z - D);
    if (out > -1) c.lerp(ngoai, THREE.MathUtils.smoothstep(out, -1, 3));
    c.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, toon);
  mesh.receiveShadow = true;
  return mesh;
}

/** Ao nước: bờ cát, mặt nước nông, giữa sâu, vài khóm lá sen. */
function aoNuoc(list: { x: number; z: number; r: number }[], rand: () => number): THREE.Group {
  const g = new THREE.Group();
  const mats = [NUOC.bo, NUOC.nong, NUOC.sau].map((color) => new THREE.MeshToonMaterial({ color, gradientMap: (toon as THREE.MeshToonMaterial).gradientMap }));
  for (const a of list) {
    const layers: [number, number, THREE.Material][] = [
      [a.r + 0.35, 0.02, mats[0]],
      [a.r, 0.03, mats[1]],
      [a.r * 0.6, 0.035, mats[2]],
    ];
    for (const [r, y, m] of layers) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2), m);
      disc.position.set(a.x, y, a.z);
      disc.receiveShadow = true;
      g.add(disc);
    }
    const p = new ShapeBuilder();
    for (let i = 0; i < 4; i++) {
      const ang = rand() * Math.PI * 2;
      const d = a.r * (0.3 + rand() * 0.5);
      p.cyl(0.14, 0.14, 0.012, 0x5a8a3a, a.x + Math.cos(ang) * d, 0.05, a.z + Math.sin(ang) * d, undefined, 9);
    }
    g.add(p.mesh(toon));
  }
  return g;
}

/** Trại: lều tranh, cột cờ đỏ, bếp lửa, hàng rào cọc lưng chừng. */
function trai(at: Diem): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  for (const [dx, dz, s] of [
    [-2.2, -1.2, 1],
    [2.0, -1.6, 0.85],
    [0.4, 2.2, 0.9],
  ] as const) {
    p.cone(1.15 * s, 1.3 * s, C.thatch, at.x + dx, 0.65 * s + 0.05, at.z + dz, undefined, 8);
    p.cyl(1.1 * s, 1.1 * s, 0.1, C.thatchDark, at.x + dx, 0.05, at.z + dz, undefined, 8);
    p.box(0.4 * s, 0.55 * s, 0.05, C.woodDark, at.x + dx, 0.28 * s, at.z + dz + 1.02 * s);
  }
  p.cyl(0.05, 0.06, 3.2, C.woodDark, at.x - 0.8, 1.6, at.z + 0.2, undefined, 6);
  m.band.box(0.9, 0.6, 0.03, C.red, at.x - 0.34, 2.85, at.z + 0.2);
  p.cone(0.08, 0.18, C.bronze, at.x - 0.8, 3.3, at.z + 0.2, undefined, 5);
  // Bếp lửa giữa trại.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.sphere(0.13, C.rock, at.x + 0.6 + Math.cos(a) * 0.35, 0.08, at.z + 0.4 + Math.sin(a) * 0.35, [1, 0.6, 1], 6);
  }
  m.glow.cone(0.22, 0.5, 0xffa83a, at.x + 0.6, 0.3, at.z + 0.4, undefined, 6);
  m.glow.cone(0.12, 0.35, 0xffe27a, at.x + 0.6, 0.28, at.z + 0.4, undefined, 6);
  const g = m.group();
  g.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material !== glowMaterial) o.castShadow = true;
  });
  return g;
}

/** Cổng: hai trụ đá, xà đá trên, vòng sáng giữa (xoay ở `update`). `sau`: cổng sang map sau (vàng), không thì xanh. */
function cong(at: Diem, sau: boolean): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  for (const s of [-1, 1]) {
    p.box(0.5, 2.6, 0.5, C.rock, at.x + s * 1.3, 1.3, at.z);
    p.box(0.7, 0.25, 0.7, C.rock, at.x + s * 1.3, 0.12, at.z);
  }
  p.box(3.4, 0.4, 0.6, C.rock, at.x, 2.75, at.z);
  m.band.box(2.2, 0.18, 0.62, sau ? C.gold : C.bronze, at.x, 2.75, at.z);
  const g = m.group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 1.05, 28),
    new THREE.MeshBasicMaterial({ color: sau ? 0xffd25a : 0x7fe0ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.position.set(at.x, 1.35, at.z);
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 28),
    new THREE.MeshBasicMaterial({ color: sau ? 0xfff0b0 : 0xc8f4ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  core.position.copy(ring.position);
  g.add(ring, core);
  g.userData.ring = ring;
  return g;
}

/** Vòng đá dựng quanh khu boss, có cờ đen ở giữa vòng. */
function vongDa(at: Diem & { r: number }): THREE.Group {
  const m = new ToonModel(inkThin);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const h = 0.9 + ((i * 5) % 3) * 0.3;
    m.plain.box(0.45, h, 0.3, C.rock, at.x + Math.cos(a) * (at.r + 0.6), h / 2, at.z + Math.sin(a) * (at.r + 0.6), [0, -a, 0]);
  }
  const g = m.group();
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return g;
}

/** Vật cản nhỏ (tre, đá, sim, cây chết, gỗ, lau) gộp một lưới bằng hàm vẽ của bãi chiến; cây rừng, ao vẽ riêng. */
function vatCan(bc: DaBoCuc): THREE.Group {
  const g = new THREE.Group();
  const rand = seeded(bc.id * 7919 + 3);
  const p = new ShapeBuilder();
  const them: THREE.BufferGeometry[] = [];
  const cay: TreeSpot[] = [];
  const ao: { x: number; z: number; r: number }[] = [];
  bc.can.forEach((c, i) => {
    const ve: DaCan = c.ve;
    if (ve === 'cay') cay.push({ x: c.x, z: c.z, kind: 'tree', seed: bc.id * 1000 + i });
    else if (ve === 'ao') ao.push(c);
    else VE[ve]?.(p, { k: 'tron', x: c.x, z: c.z, r: c.r }, rand, them);
  });
  const parts = [...(p.empty ? [] : [p.geometry()]), ...them];
  if (parts.length) {
    for (const geo of parts) {
      const mesh = new THREE.Mesh(geo, toon);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh, outlineOf(geo, inkThin));
    }
  }
  // Rừng viền quanh map, ngoài mép (không thuộc luật, chỉ che mép).
  const r2 = seeded(bc.id * 31 + 7);
  for (let x = -VIEN + 1; x < W + VIEN; x += 2.2) {
    for (let z = -VIEN + 1; z < D + VIEN; z += 2.2) {
      const out = Math.max(-x, x - W, -z, z - D);
      if (out < 0.5 || r2() < 0.25) continue;
      cay.push({ x: x + (r2() - 0.5) * 1.6, z: z + (r2() - 0.5) * 1.6, kind: r2() < 0.15 ? 'bamboo' : 'tree', seed: Math.floor(r2() * 1e6) });
    }
  }
  if (cay.length) {
    const forest = buildForest(cay, { lod: true });
    forest.traverse((o) => {
      o.castShadow = false;
    });
    g.add(forest);
  }
  if (ao.length) g.add(aoNuoc(ao, rand));
  return g;
}

export class DaNgoaiCanh {
  readonly scene = new THREE.Scene();
  readonly view: BattleView;
  readonly map: DaMapId;
  private readonly inner = new THREE.Group();
  private readonly lights: SunLights;
  private readonly rings: THREE.Mesh[] = [];
  private readonly boss: THREE.Group;
  private time = 0;
  private lite = false;

  constructor(map: DaMapId) {
    this.map = map;
    const bc = boCuc(map);
    const mau = MAU[map];
    this.scene.background = new THREE.Color(mau.troi.sky);
    this.scene.fog = new THREE.Fog(mau.troi.sky, 75, 125);
    this.lights = addSunLights(this.scene, 18, 1024);
    this.lights.sun.intensity = mau.troi.sun;
    this.lights.sun.color.setHex(mau.troi.sunColor);
    this.lights.hemi.intensity = mau.troi.hemi;
    this.lights.hemi.color.setHex(mau.troi.hemiSky);
    this.lights.hemi.groundColor.setHex(mau.troi.hemiGround);
    const field = new THREE.Group();
    field.rotation.y = Math.PI / 4;
    this.inner.position.set(-W / 2, 0, -D / 2);
    field.add(this.inner);
    // Đất ngoài vành rừng trải rộng tới chân trời (sương mù che mép), để đứng sát mép map không nhìn ra khoảng trống.
    const xa = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ color: mau.ngoai, gradientMap: (toon as THREE.MeshToonMaterial).gradientMap }));
    xa.position.y = -0.04;
    xa.receiveShadow = true;
    xa.userData.boMat = true;
    field.add(xa);
    this.scene.add(field);
    this.inner.add(nenDat(bc, mau), vatCan(bc), trai(bc.trai));
    for (const [at, sau] of [
      [bc.congTruoc, false],
      ...(bc.congSau ? ([[bc.congSau, true]] as const) : []),
    ] as const) {
      const g = cong(at, sau);
      this.rings.push(g.userData.ring as THREE.Mesh);
      this.inner.add(g);
    }
    this.boss = vongDa(bc.boss);
    this.inner.add(this.boss);
    this.view = new BattleView(this.inner, { x: 0, z: 0 }, 1.15);
  }

  setShadows(on: boolean): void {
    this.lights.sun.castShadow = on;
  }

  /** Tọa độ cảnh của điểm (x, z) trên map. */
  toScene(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    const c = Math.SQRT1_2;
    const lx = x - W / 2;
    const lz = z - D / 2;
    // Quay quanh trục y một góc π/4: x' = x cos + z sin, z' = −x sin + z cos.
    return out.set(lx * c + lz * c, 0, -lx * c + lz * c);
  }

  /** Điểm trên map của tọa độ cảnh `p`. */
  fromScene(p: THREE.Vector3): Diem {
    const c = Math.SQRT1_2;
    return { x: p.x * c - p.z * c + W / 2, z: p.x * c + p.z * c + D / 2 };
  }

  /** Vẽ trận trên map; nắng đi theo chỗ camera nhìn cho bóng đổ quanh đội. */
  update(battle: Battle | null, dt: number, look: THREE.Vector3, zoom: number): void {
    this.time += dt;
    this.view.update(battle, dt);
    for (const r of this.rings) {
      r.rotation.z = this.time * 1.4;
      r.scale.setScalar(1 + 0.05 * Math.sin(this.time * 3));
    }
    const sun = this.lights.sun;
    sun.position.set(look.x - 10, 24, look.z + 14);
    sun.target.position.copy(look);
    const lite = zoom < 1;
    if (lite !== this.lite) {
      this.lite = lite;
      setForestLite(this.scene, lite);
    }
  }

  dispose(): void {
    this.view.update(null, 0);
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh)) o.geometry.dispose();
      if (o instanceof THREE.Mesh && o.userData.boMat) (o.material as THREE.Material).dispose();
    });
  }
}
