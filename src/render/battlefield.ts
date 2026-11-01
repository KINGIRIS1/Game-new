// Cảnh bãi chiến của phó bản: một cảnh Three.js riêng, dùng chung renderer và camera với kinh đô.
// Bãi nằm xoay 45° để quân ta (phía z lớn) ở cuối màn hình, giặc (phía z nhỏ) ở đầu màn hình.
// Nền đổi theo từng màn: rừng, bến sông, làng, đồn giặc, chân núi; chương 2 thêm đồi sim, đồng ngập lũ, đỉnh Tản Viên;
// chương 3 thêm núi Thất Diệu trong đêm và thành Cổ Loa xoáy ốc.
// Đất quanh bãi nhấp nhô thành gò đồi bằng noise có hạt giống, nên mỗi màn luôn ra đúng một dáng đất.

import * as THREE from 'three';
import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
import type { Battle } from '../game/battle';
import { FIELD, RALLY_BEAT, SKILLS, type Terrain } from '../game/defs';
import { BattleView } from './battleView';
import { addSunLights, type SunLights } from './lights';
import { STICK_POSE, makeDrummer } from './heroes';
import { buildForest, makeBoat, makeEnemyFlag, makeMountain, makeTent, type TreeSpot } from './models';
import { makeNhaSan, makeRuong } from './buildings';
import { C } from './palette';
import { ShapeBuilder, seeded } from './shapes';
import { ToonModel, inkThin, outlineOf, toon } from './toon';

const { smoothstep } = THREE.MathUtils;

const groundMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
/** Đất có đồi tô phẳng từng mặt tam giác, ra dáng low-poly như các mô hình khác. */
const reliefMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

const TERRAINS: Terrain[] = ['rung', 'benSong', 'lang', 'don', 'nui', 'doi', 'ngap', 'tanVien', 'thatDieu', 'coLoa', 'cuaSong', 'moDa'];
const OUTSIDE: Record<Terrain, number> = {
  rung: C.grassLocked[0],
  benSong: C.grassLocked[1],
  lang: C.grassLocked[2],
  don: 0x8a8550,
  nui: 0x7a8048,
  doi: 0x86904e,
  ngap: 0x7d8650,
  tanVien: 0x6f7a44,
  thatDieu: C.nightLand,
  coLoa: C.grassLocked[0],
  cuaSong: C.grassLocked[1],
  moDa: 0xc9b98a,
};
const FIELD_COLOR: Record<Terrain, number> = {
  rung: C.grass[0],
  benSong: 0xb8b27a,
  lang: C.grass[2],
  don: 0xa89a62,
  nui: 0x9aa262,
  doi: 0xadb46c,
  ngap: 0xa69e6c,
  tanVien: 0x9ca466,
  thatDieu: 0x8c8496,
  coLoa: 0xb1ad72,
  cuaSong: 0xb8b27a,
  moDa: 0xd8c896,
};
/** Màu các mảng loang trên đất: cỏ rậm, cỏ úa, đất trống, đá; đồi sim nở hoa tím. */
const PATCH: Record<Terrain, number> = {
  rung: 0x66763c,
  benSong: 0x8d9656,
  lang: 0x9aa262,
  don: C.earthDark,
  nui: C.rock,
  doi: 0x8f5f92,
  ngap: C.earthDark,
  tanVien: C.rock,
  thatDieu: 0x45405a,
  coLoa: C.earthDark,
  cuaSong: 0x8d9656,
  moDa: 0xc4b07a,
};
/** Đồng ngập lũ và đỉnh Tản Viên: nước lũ phủ chỗ trũng quanh bãi, ở độ cao này. */
const FLOOD_Y = -0.3;
/** Bến sông: lòng sông nằm ở z này, hai bên bờ là bãi cát. */
const RIVER_Z = -5;
/** Đồi quanh bãi: cao tối đa bao nhiêu và rộng bao nhiêu (tần số noise càng nhỏ thì đồi càng rộng). */
const HILLS: Record<Terrain, { height: number; freq: number }> = {
  rung: { height: 2.4, freq: 0.06 },
  benSong: { height: 1.6, freq: 0.05 },
  lang: { height: 1.4, freq: 0.045 },
  don: { height: 2, freq: 0.07 },
  nui: { height: 2.6, freq: 0.07 },
  doi: { height: 2.8, freq: 0.08 },
  ngap: { height: 1.8, freq: 0.07 },
  tanVien: { height: 2.6, freq: 0.07 },
  thatDieu: { height: 2.8, freq: 0.08 },
  coLoa: { height: 1.4, freq: 0.05 },
  cuaSong: { height: 1.2, freq: 0.05 },
  moDa: { height: 1.0, freq: 0.05 },
};
const TREE_DENSITY: Record<Terrain, number> = {
  rung: 0.8,
  benSong: 0.45,
  lang: 0.35,
  don: 0.4,
  nui: 0.5,
  doi: 0.45,
  ngap: 0.3,
  tanVien: 0.5,
  thatDieu: 0.05,
  coLoa: 0.35,
  cuaSong: 0.2,
  moDa: 0.1,
};
/** Trời và đèn theo nền: núi Thất Diệu là đêm tím, còn lại là ngày. */
const SKY: Partial<Record<Terrain, { sky: number; sun: number; hemi: number; sunColor: number; hemiSky: number; hemiGround: number }>> = {
  thatDieu: { sky: 0x4a4868, sun: 1.6, hemi: 0.85, sunColor: 0xc4ccff, hemiSky: 0x8a86c4, hemiGround: 0x3a3448 },
};
const DAY = { sky: C.sky, sun: 2.6, hemi: 0.9, sunColor: 0xfff0d8, hemiSky: 0xfff3dc, hemiGround: 0x6d6a45 };
/** Thành Cổ Loa: ba vòng thành bao quanh bãi, cách mép bãi chừng này ô. */
const CO_LOA_RINGS = [3.4, 6, 8.6];
/** Tấm đất quanh bãi và khoảng cách giữa hai đỉnh lưới (đơn vị: ô). */
const LAND = { w: 90, d: 100, step: 0.75 };

/**
 * Lạc tướng đứng sau hàng quân ta, giữa bãi, quay nghiêng sang trái bãi, trống đồng ở trước mặt:
 * nhìn từ camera thấy rõ cả hai tay cầm dùi lẫn mặt trống.
 */
const DRUMMER = { x: FIELD.w / 2 + 0.3, z: FIELD.d + 2 };
/** Mặt trống: nơi sóng trống tỏa ra (tọa độ trận). */
const DRUM_AT = { x: DRUMMER.x - 0.56, z: DRUMMER.z };

/** Một vùng không trồng cây (để chỗ cho sông, nhà, lều, núi). Đất trong vùng được san phẳng, trừ khi giữ đồi. */
type Zone = { x0: number; x1: number; z0: number; z1: number; hills?: boolean };

export class Battlefield {
  readonly scene = new THREE.Scene();
  readonly view: BattleView;
  private readonly inner = new THREE.Group();
  private decor = new THREE.Group();
  private terrain: Terrain | null = null;
  private drummer?: THREE.Group;
  private readonly lights: SunLights;
  private time = 0;

  constructor() {
    this.scene.background = new THREE.Color(C.sky);
    this.scene.fog = new THREE.Fog(C.sky, 75, 125);
    this.lights = addSunLights(this.scene, 16, 1024);
    const field = new THREE.Group();
    field.rotation.y = Math.PI / 4;
    this.inner.position.set(-FIELD.w / 2, 0, -FIELD.d / 2);
    field.add(this.inner);
    this.scene.add(field);
    this.inner.add(this.decor);
    this.view = new BattleView(this.inner, { x: 0, z: 0 }, 1.25, undefined, DRUM_AT);
  }

  /** Vẽ trận đang diễn ra, và Lạc tướng đánh trống khi có Trống trận. */
  update(battle: Battle | null, dt: number): void {
    this.view.update(battle, dt);
    this.time += dt;
    // Ma trơi trên núi Thất Diệu bập bềnh, lập lòe.
    for (const w of (this.decor.userData.wisps as THREE.Object3D[] | undefined) ?? []) {
      const ph = w.userData.phase as number;
      w.position.y = (w.userData.y as number) + Math.sin(this.time * 1.7 + ph) * 0.3;
      w.scale.setScalar(0.8 + 0.3 * Math.abs(Math.sin(this.time * 3 + ph)));
    }
    const d = this.drummer;
    if (!d) return;
    const beat = d.userData.beat as (left: number, right: number) => void;
    const face = d.userData.face as THREE.Object3D;
    const rally = battle && !battle.outcome ? battle.rally : 0;
    if (rally <= 0) {
      beat(STICK_POSE.rest, STICK_POSE.rest);
      face.scale.set(1, 1, 1);
      return;
    }
    // Mỗi nhịp một tay nện xuống, tay kia giơ cao lấy đà; mặt trống rung lên đúng lúc dùi chạm.
    const t = SKILLS.trongTran.duration - rally;
    const n = Math.floor(t / RALLY_BEAT);
    const k = (t % RALLY_BEAT) / RALLY_BEAT;
    const striking = k < 0.12 ? STICK_POSE.hit : THREE.MathUtils.lerp(STICK_POSE.hit, STICK_POSE.rest, smoothstep(k, 0.12, 0.5));
    const lifting = THREE.MathUtils.lerp(STICK_POSE.rest, STICK_POSE.up, smoothstep(k, 0.3, 0.9));
    if (n % 2) beat(lifting, striking);
    else beat(striking, lifting);
    const bump = Math.exp(-k * 9);
    face.scale.set(1 + 0.06 * bump, 1 + 1.2 * bump, 1 + 0.06 * bump);
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
    this.drummer = this.decor.userData.drummer as THREE.Group;
    const sky = SKY[t] ?? DAY;
    (this.scene.background as THREE.Color).setHex(sky.sky);
    (this.scene.fog as THREE.Fog).color.setHex(sky.sky);
    this.lights.sun.intensity = sky.sun;
    this.lights.sun.color.setHex(sky.sunColor);
    this.lights.hemi.intensity = sky.hemi;
    this.lights.hemi.color.setHex(sky.hemiSky);
    this.lights.hemi.groundColor.setHex(sky.hemiGround);
  }
}

function buildDecor(t: Terrain): THREE.Group {
  const g = new THREE.Group();
  const W = FIELD.w;
  const D = FIELD.d;
  const zones: Zone[] = [{ x0: -1.5, x1: W + 1.5, z0: -1.5, z1: D + 1.5 }];
  // Lạc tướng đứng sau hàng quân ta, đánh trống đồng, cạnh cờ đỏ.
  zones.push({ x0: W / 2 - 2.5, x1: W / 2 + 2.5, z0: D, z1: D + 4 });
  const lord = commander(DRUMMER.x, DRUMMER.z);
  g.add(lord);
  g.userData.drummer = lord.userData.drummer;

  // Đặt trước ở mặt phẳng, dựng xong dáng đất mới hạ xuống đúng mặt đất. `foot` là bán kính chân.
  const placed: { obj: THREE.Object3D; foot: number }[] = [];
  const place = (obj: THREE.Object3D, x: number, z: number, ry = 0, foot = 0) => {
    obj.position.set(x, 0, z);
    obj.rotation.y = ry;
    g.add(obj);
    placed.push({ obj, foot });
    return obj;
  };

  if (t === 'benSong') {
    // Sông chảy ngang phía sau quân giặc, có thuyền đậu.
    const water = new ShapeBuilder();
    water.box(60, 0.1, 5, C.water[0], W / 2, 0.01, RIVER_Z);
    const wm = water.mesh(groundMaterial);
    wm.castShadow = false;
    g.add(wm);
    // Sông và bãi cát hai bờ tới sát mép bãi: không cây nào mọc trên cầu tàu.
    zones.push({ x0: -30, x1: 40, z0: -8, z1: -1.5 });
    for (const [x, z] of [[1.5, -4.2], [7.5, -5.6]]) {
      const boat = makeBoat();
      boat.position.set(x, 0.02, z);
      boat.rotation.y = Math.PI / 2;
      g.add(boat);
    }
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
  if (t === 'ngap' || t === 'tanVien') {
    // Nước lũ Thủy Tinh dâng phủ kín chỗ trũng, chỉ còn bãi chiến và gò đồi nhô lên như đảo.
    const water = new ShapeBuilder();
    water.box(LAND.w, 0.1, LAND.d, C.flood, W / 2, FLOOD_Y, D / 2);
    const wm = water.mesh(groundMaterial);
    wm.castShadow = false;
    g.add(wm);
  }
  if (t === 'ngap') {
    // Nhà sàn chìm nửa trong nước, thuyền trôi giữa đồng.
    for (const [x, z, ry] of [[-3.5, 3, 0.4], [W + 3.2, 7, -0.6], [-3, 14, 1.2], [W + 3.5, 17, 0.2], [2, -4.5, 2.6]] as const) {
      const house = makeNhaSan(2);
      house.position.set(x, FLOOD_Y - 0.6, z);
      house.rotation.set(0.08, ry, -0.06);
      g.add(house);
      zones.push({ x0: x - 1.4, x1: x + 1.4, z0: z - 1.4, z1: z + 1.4 });
    }
    for (const [x, z] of [[-2, 9], [W + 2, 12]]) {
      const boat = makeBoat();
      boat.position.set(x, FLOOD_Y + 0.02, z);
      boat.rotation.y = 0.3;
      g.add(boat);
    }
  }
  if (t === 'tanVien') {
    // Ba ngọn núi Ba Vì sau lưng quân giặc, mây vờn lưng chừng núi.
    place(makeMountain(6, 10, 0x667a40), W / 2, -15, 0, 5);
    place(makeMountain(4.8, 7.5, 0x6f8046), -3, -12, 0, 4);
    place(makeMountain(4.8, 7.5, 0x6f8046), W + 3, -12, 0, 4);
    zones.push({ x0: -8, x1: W + 8, z0: -22, z1: -7, hills: true });
    const clouds = new ShapeBuilder();
    const rand = seeded(53);
    for (let i = 0; i < 9; i++) {
      const x = -6 + rand() * (W + 12);
      const z = -16 + rand() * 8;
      for (let k = 0; k < 3; k++) clouds.sphere(0.9 + rand() * 0.7, C.cream, x + k * 0.9, 4 + rand() * 2.5, z + rand() * 0.6, [1.4, 0.55, 1]);
    }
    const cm = clouds.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }));
    cm.castShadow = false;
    g.add(cm);
  }
  if (t === 'thatDieu') {
    // Bảy mỏm núi nhọn của núi Thất Diệu sau lưng yêu tinh, mỏm giữa cao nhất.
    const peaks: [number, number, number, number][] = [
      [W / 2, -11, 3, 9.5],
      [W / 2 - 4.5, -9, 2.3, 7],
      [W / 2 + 4.5, -9, 2.3, 7],
      [W / 2 - 8.5, -8, 2.1, 5.8],
      [W / 2 + 8.5, -8, 2.1, 5.8],
      [W / 2 - 12.5, -7.5, 1.9, 4.6],
      [W / 2 + 12.5, -7.5, 1.9, 4.6],
    ];
    peaks.forEach(([x, z, r, h], i) => place(makeMountain(r, h, i % 2 ? 0x5d5670 : 0x6a6280), x, z, i, r * 0.8));
    zones.push({ x0: -18, x1: W + 18, z0: -24, z1: -6, hills: true });
    // Cây chết khẳng khiu quanh bãi, cả sau lưng yêu tinh.
    const rand = seeded(77);
    for (let i = 0; i < 22; i++) {
      const around = i % 3;
      const x = around === 0 ? -2 - rand() * 5 : around === 1 ? W + 2 + rand() * 5 : -1 + rand() * (W + 2);
      const z = around === 2 ? -2.2 - rand() * 3 : -4 + rand() * (D + 8);
      place(bareTree(i), x, z, rand() * 6);
    }
    // Ma trơi lơ lửng quanh mép bãi, tự sáng.
    const wisps: THREE.Object3D[] = [];
    const glow = seeded(91);
    const orbGeo = new THREE.SphereGeometry(0.15, 8, 6);
    for (let i = 0; i < 18; i++) {
      const orb = new THREE.Mesh(orbGeo, new THREE.MeshBasicMaterial({ color: i % 3 ? C.ghost : C.ghostDeep }));
      const around = i % 3;
      const x = around === 0 ? -0.8 - glow() * 3 : around === 1 ? W + 0.8 + glow() * 3 : glow() * W;
      const z = around === 2 ? -1.5 - glow() * 3 : glow() * D;
      const y = 0.9 + glow() * 1.8;
      orb.position.set(x, y, z);
      orb.userData = { phase: glow() * 6, y };
      g.add(orb);
      wisps.push(orb);
    }
    g.userData.wisps = wisps;
  }
  if (t === 'coLoa') {
    // Thành Cổ Loa bao quanh bãi: ba vòng thành đất cao lồng nhau, mỗi vòng chừa cửa ở một góc khác nhau
    // như đường xoáy ốc; vòng trong bị quân Triệu phá một mảng ở phía giặc tràn vào. Hào nước bao ngoài, cờ đỏ trên thành.
    const wall = new ShapeBuilder();
    const rubble = new ShapeBuilder();
    const ditch = new ShapeBuilder();
    const flags: [number, number, number][] = [];
    // Vòng trong không có đoạn sau lưng quân ta, để thành không che Lạc tướng đánh trống.
    const gates: ((x: number, z: number) => boolean)[] = [
      (x, z) => (z < 0 && Math.abs(x - W / 2) < 1.6) || z > D,
      (x, z) => z < 2 && x < 0,
      (x, z) => z < 2 && x > W,
    ];
    CO_LOA_RINGS.forEach((d, ring) => {
      ringPath(d, 0.92).forEach(({ x, z, ry }, n) => {
        if (gates[ring](x, z)) {
          if (ring === 0 && n % 2 === 0) {
            rubble.box(0.9, 0.3, 0.9, C.earthDark, x, 0.15, z, [0, ry + 0.4, 0]);
            rubble.box(0.5, 0.25, 0.4, C.earth, x + 0.2, 0.35, z, [0.3, ry, 0.2]);
          }
          return;
        }
        wall.box(1.0, 0.55, 1.0, C.earthDark, x, 0.27, z, [0, ry, 0]);
        wall.box(0.88, 0.5, 0.9, C.earth, x, 0.78, z, [0, ry, 0]);
        wall.box(0.76, 0.3, 0.86, n % 2 ? C.earthDark : C.earth, x, 1.18, z, [0, ry, 0]);
        if (n % 2 === 0) wall.box(0.22, 0.22, 0.22, C.earth, x, 1.44, z, [0, ry, 0]);
        if (n % 11 === 5) flags.push([x, z, ry]);
      });
    });
    // Hào nước bao ngoài vòng thành ngoài cùng.
    const outer = CO_LOA_RINGS[CO_LOA_RINGS.length - 1] + 1.5;
    for (const { x, z, ry } of ringPath(outer, 0.9)) ditch.box(1.0, 0.08, 1.3, C.ditchWater, x, 0.03, z, [0, ry, 0]);
    for (const b of [wall, rubble]) {
      const mesh = b.mesh(toon);
      g.add(mesh, outlineOf(mesh.geometry, inkThin));
    }
    const dm = ditch.mesh(groundMaterial);
    dm.castShadow = false;
    g.add(dm);
    for (const [x, z, ry] of flags) {
      const flag = new ToonModel(inkThin);
      flag.plain.cyl(0.03, 0.035, 1.4, C.woodDark, 0, 0.7, 0, undefined, 5);
      flag.band.box(0.5, 0.36, 0.03, C.red, 0.26, 1.2, 0);
      const fg = flag.group();
      fg.position.set(x, 1.3, z);
      fg.rotation.y = ry;
      g.add(fg);
    }
    zones.push({ x0: -outer - 1, x1: W + outer + 1, z0: -outer - 1, z1: D + outer + 1 });
  }
  if (t === 'nui') {
    // Núi Trâu sừng sững sau lưng quân giặc.
    place(makeMountain(6.5, 9, 0x6f7a44), W / 2, -15, 0, 5);
    place(makeMountain(4.5, 6, 0x7a8549), -2, -11.5, 0, 3.5);
    place(makeMountain(5, 6.5, 0x75804a), W + 2, -12, 0, 4);
    zones.push({ x0: -8, x1: W + 8, z0: -22, z1: -7, hills: true });
    for (const [x, z] of [[W / 2 - 1.1, -2.3], [W / 2 + 1.1, -2.3]]) place(makeEnemyFlag(2.8), x, z, Math.PI / 2);
  }

  const relief = new Relief(t, zones, 7 + TERRAINS.indexOf(t) * 211);
  g.add(relief.mesh(), relief.field());
  for (const { obj, foot } of placed) obj.position.y = relief.floor(obj.position.x, obj.position.z, foot);

  const rand = seeded(31 + TERRAINS.indexOf(t) * 101);
  const spots: TreeSpot[] = [];
  const inZone = (x: number, z: number) => zones.some((zn) => x > zn.x0 && x < zn.x1 && z > zn.z0 && z < zn.z1);
  const forest: Zone = { x0: -8, x1: W + 8, z0: -20, z1: D + 18 };
  for (let x = forest.x0; x <= forest.x1; x += 1.3) {
    for (let z = forest.z0; z <= forest.z1; z += 1.3) {
      const px = x + (rand() - 0.5) * 0.9;
      const pz = z + (rand() - 0.5) * 0.9;
      const roll = rand();
      const kindRoll = rand();
      const seed = Math.floor(rand() * 1e6);
      if (inZone(px, pz)) continue;
      // Rừng mọc thành từng cụm, có trảng trống, và thưa dần ra mép chứ không dừng ở một khung chữ nhật.
      const edge = -signedDistance(forest, px, pz) + (relief.grove(px + 50, pz) - 0.5) * 6;
      if (roll >= TREE_DENSITY[t] * (0.55 + 0.75 * relief.grove(px, pz)) * smoothstep(edge, 0, 4)) continue;
      // Chỗ đất chìm dưới nước lũ thì không có cây.
      const ground = relief.height(px, pz);
      if ((t === 'ngap' || t === 'tanVien') && ground < FLOOD_Y + 0.15) continue;
      // Tre mọc thành khóm riêng, không xen lẫn đều với cây lá.
      const bamboo = relief.grove(px * 1.7 - 30, pz * 1.7) + (kindRoll - 0.5) * 0.3 > (t === 'rung' ? 0.45 : 0.62);
      spots.push({ x: px, y: ground, z: pz, kind: bamboo ? 'bamboo' : 'tree', seed });
    }
  }
  g.add(buildForest(spots));
  return g;
}

/** Khoảng cách có dấu từ một điểm tới vùng chữ nhật: dương ở ngoài, âm ở trong. */
function signedDistance(zn: Zone, x: number, z: number): number {
  const dx = Math.max(zn.x0 - x, x - zn.x1);
  const dz = Math.max(zn.z0 - z, z - zn.z1);
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0);
}

/**
 * Đường viền bãi: đi quanh hình chữ nhật của bãi, mỗi bước 0,25 ô, đẩy ra ngoài một đoạn `grow + wobble`.
 * Góc bo tròn. Điểm trả về là (x, -z) để sau khi xoay nằm đúng trên mặt đất.
 */
function fieldOutline(wobble: (x: number, z: number) => number, grow: number): THREE.Vector2[] {
  const { w: W, d: D } = FIELD;
  // Mỗi góc: tọa độ và hướng pháp tuyến lúc bắt đầu cung bo; cạnh tiếp theo có pháp tuyến quay thêm 90°.
  const corners: [number, number, number][] = [
    [W, 0, -Math.PI / 2],
    [W, D, 0],
    [0, D, Math.PI / 2],
    [0, 0, Math.PI],
  ];
  const pts: THREE.Vector2[] = [];
  const push = (x: number, z: number, a: number) => {
    const d = grow + wobble(x + Math.cos(a), z + Math.sin(a));
    pts.push(new THREE.Vector2(x + Math.cos(a) * d, -(z + Math.sin(a) * d)));
  };
  corners.forEach(([cx, cz, a0], i) => {
    for (let k = 0; k <= 6; k++) push(cx, cz, a0 + (k / 6) * (Math.PI / 2));
    const [nx, nz] = corners[(i + 1) % 4];
    const steps = Math.ceil(Math.hypot(nx - cx, nz - cz) / 0.25);
    for (let s = 1; s < steps; s++) push(cx + ((nx - cx) * s) / steps, cz + ((nz - cz) * s) / steps, a0 + Math.PI / 2);
  });
  return pts;
}

/** Cộng nhiều lớp noise, lớp sau dày gấp đôi và nhẹ bằng nửa lớp trước. Kết quả trong khoảng 0..1. */
function fbm(noise: NoiseFunction2D, x: number, z: number, octaves = 4): number {
  let total = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    // Mỗi lớp lệch tâm một chút để các lớp không chồng khít lên nhau.
    total += amp * noise(x * freq + i * 5.3, z * freq - i * 9.1);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return (total / norm + 1) / 2;
}

/**
 * Dáng đất quanh bãi: phẳng ở bãi và những chỗ đặt nhà, lều, sông; ra xa thì nhô dần thành gò rồi thành đồi.
 * Ba lớp noise riêng hạt giống: độ cao, mảng màu loang, và chỗ rừng rậm hay thưa.
 */
class Relief {
  private readonly hills: NoiseFunction2D;
  private readonly patches: NoiseFunction2D;
  private readonly groves: NoiseFunction2D;
  private readonly flats: Zone[];
  private readonly tint = new THREE.Color();

  constructor(
    private readonly t: Terrain,
    zones: Zone[],
    seed: number,
  ) {
    this.hills = createNoise2D(seeded(seed));
    this.patches = createNoise2D(seeded(seed + 1));
    this.groves = createNoise2D(seeded(seed + 2));
    this.flats = zones.filter((zn) => !zn.hills);
  }

  height(x: number, z: number): number {
    const near = Math.min(...this.flats.map((zn) => Math.max(signedDistance(zn, x, z), 0)));
    const { height, freq } = HILLS[this.t];
    // Sát chỗ phẳng chỉ là gò thấp, ra xa mới thành đồi.
    const rise = smoothstep(near, 0.5, 5) * (0.35 + 0.65 * smoothstep(near, 3, 18));
    let h = height * Math.pow(fbm(this.hills, x * freq, z * freq), 1.5) * rise;
    // Sườn núi Trâu, núi Tản dâng dần lên sau lưng quân giặc.
    if (this.t === 'nui' || this.t === 'tanVien' || this.t === 'thatDieu') h += 3.5 * smoothstep(-z, 7, 20) * (0.5 + fbm(this.hills, x * 0.11 + 40, z * 0.11) * 0.5);
    // Đồng ngập: ra khỏi bãi là đất trũng chìm dưới nước lũ, chỉ gò cao mới nhô lên.
    if (this.t === 'ngap') h -= 0.9 * smoothstep(near, 0.3, 3);
    if (this.t === 'tanVien') h -= 0.7 * smoothstep(near, 0.5, 4) * (1 - smoothstep(-z, 4, 12));
    return h;
  }

  /** Mặt đất thấp nhất dưới chân một vật rộng `foot`, để vật không lơ lửng trên sườn dốc. */
  floor(x: number, z: number, foot: number): number {
    const h = this.height(x, z);
    if (!foot) return h;
    const r = foot * 0.8;
    return Math.min(h, this.height(x + r, z), this.height(x - r, z), this.height(x, z + r), this.height(x, z - r));
  }

  /** Độ rậm của rừng (0..1) tại một điểm. */
  grove(x: number, z: number): number {
    return smoothstep(fbm(this.groves, x * 0.09, z * 0.09, 3), 0.35, 0.65);
  }

  /** Màu đất ngoài bãi: chỗ cao sáng hơn chỗ trũng, có mảng cỏ khác màu; bến sông có bãi cát dọc bờ. */
  color(x: number, z: number, h: number, out: THREE.Color): THREE.Color {
    out.setHex(OUTSIDE[this.t]).offsetHSL(0, 0, (Math.min(h / HILLS[this.t].height, 1.5) - 0.3) * 0.08);
    const p = fbm(this.patches, x * 0.09, z * 0.09, 3);
    out.lerp(this.tint.setHex(PATCH[this.t]), smoothstep(p, 0.56, 0.66) * 0.45);
    if (this.t === 'benSong') {
      const bank = 1 - smoothstep(Math.abs(z - RIVER_Z) - (p - 0.5) * 2, 2.8, 3.6);
      out.lerp(this.tint.setHex(FIELD_COLOR.benSong), bank);
    }
    return out;
  }

  /**
   * Mặt bãi: một tấm phẳng màu đất giẫm, mép lượn theo noise và có viền đậm như nét vẽ tay.
   * Mép chỉ lượn ra ngoài, nên chỗ nào lính đứng cũng nằm trên mặt bãi.
   */
  field(): THREE.Group {
    const g = new THREE.Group();
    const wobble = (x: number, z: number) => 0.15 + fbm(this.patches, x * 0.35 + 20, z * 0.35, 2) * 0.7;
    const fill = new THREE.Color(FIELD_COLOR[this.t]);
    const rim = fill.clone().offsetHSL(0, 0, -0.09);
    for (const [grow, color, y] of [[0.2, rim, 0.012], [0, fill, 0.02]] as const) {
      const geo = new THREE.ShapeGeometry(new THREE.Shape(fieldOutline(wobble, grow)), 1);
      geo.rotateX(-Math.PI / 2).translate(0, y, 0);
      const colors = new Float32Array(geo.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mesh = new THREE.Mesh(geo, groundMaterial);
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    return g;
  }

  /** Tấm đất có đồi phủ quanh bãi. */
  mesh(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(LAND.w, LAND.d, Math.round(LAND.w / LAND.step), Math.round(LAND.d / LAND.step));
    geo.rotateX(-Math.PI / 2).translate(FIELD.w / 2, 0, FIELD.d / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.height(x, z);
      pos.setY(i, h);
      this.color(x, z, h, c).toArray(colors, i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, reliefMaterial);
    mesh.receiveShadow = true;
    return mesh;
  }
}

/** Lạc tướng đứng sau trống đồng lớn, cạnh cờ đỏ, sau lưng quân ta. */
function commander(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const drummer = makeDrummer();
  drummer.rotation.y = -Math.PI / 2;
  const m = new ToonModel();
  m.plain.cyl(0.035, 0.04, 2.4, C.woodDark, 1.2, 1.2, 0.3, undefined, 6);
  m.band.box(0.6, 0.5, 0.03, C.red, 1.5, 2.1, 0.3);
  g.add(drummer, m.group());
  g.position.set(x, 0, z);
  g.userData.drummer = drummer;
  return g;
}

/** Cây chết khẳng khiu trên núi Thất Diệu: thân cong, vài cành trơ trụi. */
function bareTree(seed: number): THREE.Group {
  const b = new ShapeBuilder();
  const rand = seeded(seed * 13 + 5);
  const h = 1.6 + rand() * 0.8;
  b.cyl(0.05, 0.1, h, 0x3e3446, 0, h / 2, 0, [rand() * 0.2 - 0.1, 0, rand() * 0.2 - 0.1], 6);
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const y = h * (0.45 + rand() * 0.5);
    const len = 0.5 + rand() * 0.5;
    b.cyl(0.02, 0.04, len, 0x3e3446, Math.cos(a) * len * 0.35, y + len * 0.3, Math.sin(a) * len * 0.35, [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], 5);
  }
  const g = new THREE.Group();
  const mesh = b.mesh(toon);
  g.add(mesh, outlineOf(mesh.geometry, inkThin));
  return g;
}

/**
 * Đường đi quanh bãi, cách mép bãi `d` ô, góc bo tròn: các điểm cách nhau chừng `step`,
 * kèm góc xoay `ry` để khối thành nằm dọc theo đường.
 */
function ringPath(d: number, step: number): { x: number; z: number; ry: number }[] {
  const { w: W, d: D } = FIELD;
  const out: { x: number; z: number; ry: number }[] = [];
  // Bốn cạnh thẳng và bốn góc bo, theo chiều kim đồng hồ nhìn từ trên xuống.
  const legs: [number, number, number, number][] = [
    [0, -d, W, -d],
    [W + d, 0, W + d, D],
    [W, D + d, 0, D + d],
    [-d, D, -d, 0],
  ];
  const corners: [number, number, number][] = [
    [W, 0, -Math.PI / 2],
    [W, D, 0],
    [0, D, Math.PI / 2],
    [0, 0, Math.PI],
  ];
  legs.forEach(([x0, z0, x1, z1], i) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / step));
    const ry = Math.atan2(x1 - x0, z1 - z0);
    for (let k = 0; k < n; k++) out.push({ x: x0 + ((x1 - x0) * k) / n, z: z0 + ((z1 - z0) * k) / n, ry });
    const [cx, cz, a0] = corners[i];
    const arc = Math.max(1, Math.round((d * Math.PI) / 2 / step));
    for (let k = 0; k < arc; k++) {
      const a = a0 + ((k + 0.5) / arc) * (Math.PI / 2);
      out.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, ry: -a });
    }
  });
  return out;
}
