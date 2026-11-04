// Cảnh bãi chiến của phó bản: một cảnh Three.js riêng, dùng chung renderer và camera với kinh đô.
// Bãi nằm xoay 45° để quân ta (phía z lớn) ở cuối màn hình, giặc (phía z nhỏ) ở đầu màn hình.
// Nền đổi theo từng màn: rừng, bến sông, làng, đồn giặc, chân núi; chương 2 thêm đồi sim, đồng ngập lũ, đỉnh Tản Viên;
// chương 3 thêm núi Thất Diệu trong đêm và thành Cổ Loa xoáy ốc; chương 4 thêm cửa sông có thuyền giặc neo
// và bãi biển Mộ Dạ dưới chân núi, lông ngỗng rải trên cát; chương 5 thêm ngã ba sông Hát Môn có đàn tế, bãi ngô,
// thuyền nan, và thành Luy Lâu tường đất nện, cổng lầu mái ngói đen, hào nước.
// Đất quanh bãi nhấp nhô thành gò đồi bằng noise có hạt giống, nên mỗi màn luôn ra đúng một dáng đất.

import * as THREE from 'three';
import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
import { holdProgress, type Battle } from '../game/battle';
import { FIELD, RALLY_BEAT, SKILLS, type Terrain } from '../game/defs';
import { BattleView } from './battleView';
import { makeRoyalHorse, makeRuaVang } from './beasts';
import { addSunLights, type SunLights } from './lights';
import { STICK_POSE, makeDrummer } from './heroes';
import { buildForest, makeBoat, makeEnemyBoat, makeEnemyFlag, makeMountain, makeTent, type TreeSpot } from './models';
import { makeNhaSan, makeRuong } from './buildings';
import { makeBridge } from './benKia';
import { C } from './palette';
import { type Placement, ShapeBuilder, instanceTemplates, seeded } from './shapes';
import { ToonModel, inkThin, outlineOf, toon } from './toon';

const { smoothstep } = THREE.MathUtils;

const groundMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
/** Đất có đồi tô phẳng từng mặt tam giác, ra dáng low-poly như các mô hình khác. */
const reliefMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

const TERRAINS: Terrain[] = ['rung', 'benSong', 'lang', 'don', 'nui', 'doi', 'ngap', 'tanVien', 'thatDieu', 'coLoa', 'cuaSong', 'moDa', 'benKia', 'hatMon', 'luyLau'];
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
  moDa: 0xd3bf88,
  benKia: 0x7f8a4c,
  hatMon: C.grassLocked[1],
  luyLau: 0x939556,
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
  moDa: 0xe0d2a2,
  benKia: 0xb4ac74,
  hatMon: 0xbcb27a,
  luyLau: 0xb9a678,
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
  moDa: 0xc2aa72,
  benKia: 0x6a4a2c,
  hatMon: 0x9aa25a,
  luyLau: C.earth,
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
  benKia: { height: 1.5, freq: 0.06 },
  hatMon: { height: 1.3, freq: 0.05 },
  luyLau: { height: 1.2, freq: 0.05 },
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
  cuaSong: 0.35,
  moDa: 0.4,
  benKia: 0.4,
  hatMon: 0.4,
  luyLau: 0.3,
};
/** Trời và đèn theo nền: núi Thất Diệu là đêm tím, còn lại là ngày. */
const SKY: Partial<Record<Terrain, { sky: number; sun: number; hemi: number; sunColor: number; hemiSky: number; hemiGround: number }>> = {
  thatDieu: { sky: 0x4a4868, sun: 1.6, hemi: 0.85, sunColor: 0xc4ccff, hemiSky: 0x8a86c4, hemiGround: 0x3a3448 },
};
const DAY = { sky: C.sky, sun: 2.6, hemi: 0.9, sunColor: 0xfff0d8, hemiSky: 0xfff3dc, hemiGround: 0x6d6a45 };
/** Bãi cát ven sông, ven biển và cát ướt sát mép nước. */
const SAND = 0xd0bc88;
const WET_SAND = 0xa89468;
/** Nước sông và biển: chỗ sâu, chỗ nông sát bờ. */
const RIVER = { deep: C.water[1], shallow: 0x6fa8a2 };
const SEA = { deep: C.sea, mid: 0x3a88a8, shallow: 0x74bcc0 };
/** Lau sậy: thân, lá, bông lau trắng bạc, bông sậy nâu tím. */
const REED = { stalk: 0x8f9a4c, stalkDry: 0xa8a060, leaf: 0x6f8a3a, lau: 0xeee4cc, say: 0xa08068 };
/** Lông ngỗng trắng và cuống lông. */
const FEATHER = { vane: 0xfbf8ee, down: 0xffffff, quill: 0xcfc2a0 };
/** Thành Cổ Loa: ba vòng thành bao quanh bãi, cách mép bãi chừng này ô. */
const CO_LOA_RINGS = [3.4, 6, 8.6];
/** Bờ bên kia sông: cầu phao tre sau lưng quân ta, lệch sang phải bãi một chút (x, ô). */
const BEN_KIA_BRIDGE_X = FIELD.w / 2 + 3;
/**
 * Hát Môn: sông Hát chảy ngang sau lưng quân ta (bờ gần, bờ xa, z); sông nhánh chảy dọc bên trái bãi đổ vào, tạo
 * ngã ba (tâm dòng ở ngang hàng quân ta, ngả dần ra xa về phía giặc, nửa bề rộng).
 */
const HAT_MON = { near: FIELD.d + 5, far: FIELD.d + 11.5, branchX: -7, branchLean: 0.08, branchHalf: 1.8 };
/** Hát Môn: đàn tế đắp đất sau lưng quân ta, bên trái Lạc tướng (tâm, ô). */
const DAN_TE = { x: 0.9, z: FIELD.d + 2.75 };
/** Hát Môn: thuyền nan neo sát bờ (x, z, góc, 0 là thuyền nan dài, 1 là thúng chai). */
const NAN: [number, number, number, number][] = [
  [2.6, HAT_MON.near + 0.75, 0.12, 0],
  [3.9, HAT_MON.near + 0.9, -0.1, 1],
  [7.6, HAT_MON.near + 1.5, -0.35, 0],
  [HAT_MON.branchX + 0.2, 13, Math.PI / 2 + 0.2, 0],
  [HAT_MON.branchX - 0.7, FIELD.d + 3, 0, 1],
];
/**
 * Luy Lâu: hào nước trước thành (mép gần, mép xa, z), tường thành đất nện (mặt trước, mặt sau ở chân tường, z; cao),
 * cổng lầu giữa tường (x, nửa bề rộng lối cổng).
 */
const LUY_LAU = { moat: [-1.95, -3.2], wall: [-3.6, -4.8], h: 1.3, gate: { x: FIELD.w / 2, half: 0.85, h: 1 } };
/** Màu cảnh chương 5: ngói đen, cột gỗ son, gỗ cửa thành, vải cờ đen, nan tre quét dầu rái. */
const LUY = { tile: 0x2c2a2f, tileEdge: 0x47444c, post: 0x8e2a1c, door: 0x4a2c1c, cloth: 0x1f1d22, plaster: 0xd8c69c };
const NAN_COLOR = { hull: 0x4a3a24, rim: C.bamboo, inner: 0x8a6a3c };
/** Tấm đất quanh bãi và khoảng cách giữa hai đỉnh lưới (đơn vị: ô). */
const LAND = { w: 90, d: 100, step: 0.75 };

/** Cửa sông và Mộ Dạ: mặt nước sông, biển thấp hơn mặt bãi chừng này; chỗ nước sâu, đáy nằm ở `SEABED`. */
const WATER_Y = -0.28;
const SEABED = -0.7;
/** Cửa sông: bãi bồi giữa cửa sông (tâm và hai bán trục, ô). */
const BAR = { x: FIELD.w + 8, z: -9.5, rx: 3.2, rz: 1.1 };
/** Cửa sông: thuyền giặc neo mũi vào bờ gần (x, lùi ra sông bao nhiêu, góc lệch), và vài chiếc thả neo giữa dòng (x, z, góc). */
const MOORED: [number, number, number][] = [
  [-3.4, 0.2, 0.3],
  [0.5, 0, -0.28],
  [3.1, 0.55, 0.12],
  [6.1, 0.05, -0.36],
  [8.8, 0.4, 0.22],
];
const AFLOAT: [number, number, number][] = [
  [FIELD.w + 4.5, -7.2, 1.2],
  [FIELD.w + 11.5, -5.5, 2.0],
  [-6.5, -7.5, -1.4],
];
/** Mộ Dạ: núi Mộ Dạ ở bên trái bãi, ngọn chính và hai ngọn phụ (x, z, bán kính, cao, màu). */
const MO_DA_PEAKS: [number, number, number, number, number][] = [
  [-11, -1.5, 7.2, 12, 0x5f7a3c],
  [-4.7, -6.8, 4.4, 8, 0x6a8442],
  [-12.5, 10, 5.5, 8, 0x678040],
];

/**
 * Mộ Dạ (màn 32), tọa độ trong bãi (quân ta ở phía z lớn): ngựa của vua phi dọc mép phải bãi theo đường `x = roadX`,
 * từ `fromZ` sau lưng quân ta tới `toZ` sát mép biển; Rùa Vàng nổi lên ở `turtle`, góc biển xa bên phải, mặt biển
 * ở độ cao `waterY`. Dải cát `x` từ `FIELD.w + 0.8` tới `FIELD.w + 3`, `z` từ −4 tới `FIELD.d + 2` phẳng, để trống
 * (không cây, đá, lông ngỗng) và luôn trên mặt nước; ở đầu đường, từ `x = FIELD.w + 3,6` trở ra là biển.
 * `battlefield.test.ts` canh các điều này.
 */
export const MO_DA = { roadX: FIELD.w + 1.8, fromZ: FIELD.d + 1, toZ: -3, turtle: { x: FIELD.w + 5.4, z: -6.2 }, waterY: WATER_Y };
/** Mộ Dạ: dải cát dọc đường ngựa chạy, để trống. */
const MO_DA_ROAD: Zone = { x0: FIELD.w + 0.5, x1: FIELD.w + 3.3, z0: -4.5, z1: FIELD.d + 2.5 };

/**
 * Lạc tướng đứng sau hàng quân ta, giữa bãi, quay nghiêng sang trái bãi, trống đồng ở trước mặt:
 * nhìn từ camera thấy rõ cả hai tay cầm dùi lẫn mặt trống.
 */
const DRUMMER = { x: FIELD.w / 2 + 0.3, z: FIELD.d + 2 };
/** Mặt trống: nơi sóng trống tỏa ra (tọa độ trận). */
const DRUM_AT = { x: DRUMMER.x - 0.56, z: DRUMMER.z };

/** Một vùng không trồng cây (để chỗ cho sông, nhà, lều, núi). Đất trong vùng được san phẳng, trừ khi giữ đồi. */
type Zone = { x0: number; x1: number; z0: number; z1: number; hills?: boolean };
/** Nền có mặt nước (sông, biển, hào): `Relief.wet` cho khoảng cách tới mép nước. */
const WATERY = new Set<Terrain>(['cuaSong', 'moDa', 'benKia', 'hatMon', 'luyLau']);

export class Battlefield {
  readonly scene = new THREE.Scene();
  readonly view: BattleView;
  private readonly inner = new THREE.Group();
  private decor = new THREE.Group();
  private terrain: Terrain | null = null;
  private drummer?: THREE.Group;
  /** Mộ Dạ (màn cầm cự): ngựa vua chở An Dương Vương và Mỵ Châu phi dọc mép bãi ra biển, theo thanh "Vua tới biển". */
  private horse?: { obj: THREE.Group; battle: number };
  /** Hộ giá tới biển: Rùa Vàng khổng lồ nổi lên ở góc biển. */
  private seaTurtle?: { obj: THREE.Group; battle: number; age: number };
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
    this.syncSea(battle, dt);
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

  /**
   * Màn cầm cự ở Mộ Dạ: ngựa vua phi dọc đường `MO_DA.roadX`, từ sau lưng quân ta ra tới sát mép biển, xa dần theo
   * thanh "Vua tới biển". Thắng (vua tới biển lần đầu) thì Rùa Vàng khổng lồ trồi lên ở góc biển.
   */
  private syncSea(battle: Battle | null, dt: number): void {
    const hold = !!battle && this.terrain === 'moDa' && battle.holdS !== undefined;
    if (!hold || this.horse?.battle !== battle!.id) {
      if (this.horse) this.inner.remove(this.horse.obj);
      this.horse = undefined;
    }
    if (!hold || this.seaTurtle?.battle !== battle!.id || !battle!.seaWin) {
      if (this.seaTurtle) this.inner.remove(this.seaTurtle.obj);
      this.seaTurtle = undefined;
    }
    if (!hold) return;
    const b = battle!;
    if (!this.horse) {
      const obj = makeRoyalHorse();
      obj.scale.setScalar(0.8 * 1.25);
      // Mô hình nhìn về +z; ngựa phi về phía biển (z nhỏ).
      obj.rotation.y = Math.PI;
      this.inner.add(obj);
      this.horse = { obj, battle: b.id };
    }
    const k = b.outcome === 'win' ? 1 : holdProgress(b);
    const z = MO_DA.fromZ + (MO_DA.toZ - MO_DA.fromZ) * k;
    const obj = this.horse.obj;
    const pose = obj.userData.pose as ((a: { act: 'walk' | 'stand'; phase?: number; stride?: number; time?: number }) => void) | undefined;
    const running = k < 1 && b.outcome !== 'lose';
    obj.position.set(MO_DA.roadX, this.groundAt(MO_DA.roadX, z) + (running ? Math.abs(Math.sin(this.time * 9)) * 0.06 : 0), z);
    pose?.(running ? { act: 'walk', phase: this.time * 18, stride: 0.9, time: this.time } : { act: 'stand', time: this.time });
    if (!b.seaWin || b.outcome !== 'win') return;
    if (!this.seaTurtle) {
      const t = makeRuaVang();
      t.scale.setScalar(3.4);
      t.rotation.y = -Math.PI / 2 - 0.5;
      this.inner.add(t);
      this.seaTurtle = { obj: t, battle: b.id, age: 0 };
    }
    const st = this.seaTurtle;
    st.age += dt;
    const rise = THREE.MathUtils.smoothstep(Math.min(st.age / 2.4, 1), 0, 1);
    st.obj.position.set(MO_DA.turtle.x, MO_DA.waterY - 1.6 + 1.5 * rise + Math.sin(this.time * 1.6) * 0.05 * rise, MO_DA.turtle.z);
  }

  /**
   * Điểm camera nên nhìn (tọa độ cảnh), khi có: hộ giá tới biển thì nhìn Rùa Vàng nổi lên ở góc biển. Không có thì null.
   */
  focus(): THREE.Vector3 | null {
    if (!this.seaTurtle) return null;
    this.inner.updateWorldMatrix(true, false);
    return this.inner.localToWorld(new THREE.Vector3(MO_DA.turtle.x - 3, 0, MO_DA.turtle.z + 5));
  }

  /** Nền đang dựng. */
  get current(): Terrain | null {
    return this.terrain;
  }

  /** Mặt đất (hay đáy sông, đáy biển) ở điểm (x, z) trong bãi, theo nền đang dựng. */
  groundAt(x: number, z: number): number {
    return (this.decor.userData.relief as Relief | undefined)?.height(x, z) ?? 0;
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
  g.name = 'decor';
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

  if (t === 'moDa') {
    // Núi Mộ Dạ bên trái bãi, một ngọn chìa ra biển; đường ngựa của vua dọc mép phải để trống.
    MO_DA_PEAKS.forEach(([x, z, r, h, color], i) => place(makeMountain(r, h, color), x, z, i * 1.3, r * 0.8));
    zones.push(MO_DA_ROAD);
  }

  if (t === 'benKia') {
    // Giặc đóng đồn: rào cọc nhọn chắn ngang sau lưng quân giặc, hở một cửa giữa; lều, cờ trong đồn.
    const stakes = new ToonModel(inkThin);
    const rand = seeded(29);
    for (let x = 0.5; x <= W - 0.5; x += 0.34) {
      if (Math.abs(x - W / 2) < 1) continue;
      const h = 0.8 + rand() * 0.3;
      stakes.plain.cyl(0.07, 0.08, h, C.woodDark, x, h / 2, -2.2, undefined, 5);
      stakes.plain.cone(0.08, 0.2, C.woodLight, x, h + 0.1, -2.2, undefined, 5);
    }
    place(stakes.group(), 0, 0);
    for (const [x, z] of [
      [1.5, -4.6],
      [4.5, -6],
      [7.5, -4.8],
    ]) place(makeTent(), x, z, x, 0.8);
    place(makeEnemyFlag(), W / 2 + 1.3, -2.8, Math.PI / 2);
    zones.push({ x0: -1, x1: W + 1, z0: -8, z1: -1.5 });
    // Bờ sông phẳng chỗ đầu cầu.
    zones.push({ x0: BEN_KIA_BRIDGE_X - 1.5, x1: BEN_KIA_BRIDGE_X + 1.5, z0: D, z1: D + 5 });
  }

  if (t === 'hatMon') {
    // Đàn tế đắp đất bên trái Lạc tướng, nơi Hai Bà tế cờ; bãi ngô, thuyền nan dựng sau khi có dáng đất.
    place(danTe(), DAN_TE.x, DAN_TE.z, 0, 1.1);
    zones.push({ x0: DAN_TE.x - 1.5, x1: DAN_TE.x + 1.5, z0: DAN_TE.z - 1.4, z1: DAN_TE.z + 1.4 });
  }

  if (t === 'luyLau') {
    // Thành Luy Lâu sau lưng quân giặc: phố trong thành không có cây.
    g.add(thanhLuyLau());
    zones.push({ x0: -32, x1: W + 32, z0: -16, z1: -1.5 });
  }

  const relief = new Relief(t, zones, 7 + TERRAINS.indexOf(t) * 211);
  g.userData.relief = relief;
  g.add(relief.mesh(), relief.field());
  for (const { obj, foot } of placed) obj.position.y = relief.floor(obj.position.x, obj.position.z, foot);

  if (WATERY.has(t)) {
    g.add(waterSurface(relief), ...shoreLines(relief));
    if (t === 'benKia') {
      // Cầu phao tre vừa bắc qua sông sau lưng quân ta; lau sậy dọc hai bờ, chừa chỗ đầu cầu.
      const bridge = makeBridge(1);
      bridge.position.set(BEN_KIA_BRIDGE_X, 0, FIELD.d + 7.8);
      g.add(bridge);
      // Chừa chỗ đầu cầu và chỗ Lạc tướng đánh trống.
      const clear = [-1.2, 0, 1.2].map((dx) => ({ x: DRUMMER.x + dx, z: DRUMMER.z + 1 }));
      g.add(reedBeds(relief, [{ x: BEN_KIA_BRIDGE_X, z: FIELD.d + 4.6 }, { x: BEN_KIA_BRIDGE_X, z: FIELD.d + 11 }, ...clear]));
    } else if (t === 'cuaSong') {
      // Thuyền giặc đen buồm đỏ neo mũi vào bờ gần, sau lưng quân giặc, vài chiếc thả neo giữa dòng.
      const bankAt = (x: number) => {
        let z = -2;
        while (relief.wet(x, z) < 0 && z > -12) z -= 0.1;
        return z;
      };
      const boats: { x: number; z: number; ry: number }[] = [];
      for (const [x, back, ry] of MOORED) boats.push({ x, z: bankAt(x) - 1.1 - back, ry });
      for (const [x, z, ry] of AFLOAT) boats.push({ x, z, ry });
      for (const b of boats) {
        const boat = makeEnemyBoat();
        boat.userData.boat = true;
        boat.scale.setScalar(1.3);
        boat.position.set(b.x, WATER_Y - 0.08, b.z);
        boat.rotation.y = b.ry;
        g.add(boat);
      }
      g.add(reedBeds(relief, boats));
    } else if (t === 'hatMon') {
      // Thuyền nan, thúng chai neo sát bờ; lau sậy dọc mép nước, bãi ngô trên bãi bồi phía trên.
      const boats = NAN.map(([x, z, ry, kind]) => ({ x, z, ry, kind }));
      for (const b of boats) {
        const boat = b.kind ? thungChai() : thuyenNan();
        boat.userData.boat = true;
        boat.position.set(b.x, WATER_Y - 0.04, b.z);
        boat.rotation.y = b.ry;
        g.add(boat);
      }
      // Chừa chỗ Lạc tướng đánh trống và quanh đàn tế.
      const clear = [-1.2, 0, 1.2].map((dx) => ({ x: DRUMMER.x + dx, z: DRUMMER.z + 1 }));
      for (const dx of [-1.6, -0.8, 0, 0.8, 1.6]) clear.push({ x: DAN_TE.x + dx, z: DAN_TE.z + 1.2 });
      g.add(reedBeds(relief, [...boats, ...clear]), cornField(relief));
    } else if (t === 'moDa') {
      g.add(beachRocks(relief), feathers(relief));
    }
  }

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
      // Cửa sông, Mộ Dạ: không cây dưới nước và trên bãi sát mép nước. Hát Môn: chừa cả bãi ngô.
      if (relief.wet(px, pz) > (t === 'hatMon' ? -4.6 : -1.6)) continue;
      // Mộ Dạ: cây chỉ mọc ở chân núi bên trái và lác đác trên đụn cát xa sau lưng quân ta; bãi biển không có tre.
      if (t === 'moDa' && px > -2.5 && (pz < D + 5.5 || kindRoll < 0.55)) continue;
      // Tre mọc thành khóm riêng, không xen lẫn đều với cây lá.
      const bamboo = t !== 'moDa' && relief.grove(px * 1.7 - 30, pz * 1.7) + (kindRoll - 0.5) * 0.3 > (t === 'rung' ? 0.45 : 0.62);
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
  private readonly shore: NoiseFunction2D;
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
    this.shore = createNoise2D(seeded(seed + 3));
    this.flats = zones.filter((zn) => !zn.hills);
  }

  get terrain(): Terrain {
    return this.t;
  }

  /**
   * Cửa sông và Mộ Dạ: cách mép nước bao nhiêu ô, dương là ở dưới nước, âm là trên bờ. Nền khác không có nước.
   * Mép nước thật (chỗ đất cắt mặt nước) nằm sát chỗ số này bằng 0.
   */
  wet(x: number, z: number): number {
    const W = FIELD.w;
    if (this.t === 'cuaSong') {
      // Bờ gần (phía giặc) lượn nhẹ sau lưng quân giặc, qua mép phải bãi thì ngoặt về phía quân ta: sông mở ra cửa biển.
      const turn = Math.max(0, x - W - 2);
      const near = -2.7 + 0.4 * this.shore(x * 0.12, 0) + turn * turn * 0.12;
      // Bờ xa lùi dần về phía cửa sông.
      const far = -10.6 + 0.7 * this.shore(x * 0.1, 7) - 12 * smoothstep(x, W - 4, W + 16);
      const river = Math.min(near - z, z - far);
      // Bãi bồi giữa cửa sông.
      const bar = (Math.hypot((x - BAR.x) / BAR.rx, (z - BAR.z) / BAR.rz) - 1) * BAR.rz;
      return Math.min(river, bar);
    }
    if (this.t === 'benKia') {
      // Sông chảy ngang sau lưng quân ta (phía z lớn), bờ gần lượn nhẹ theo noise.
      const near = FIELD.d + 4.4 + 0.4 * this.shore(x * 0.12, 0);
      const far = FIELD.d + 11.2 + 0.6 * this.shore(x * 0.1, 7);
      return Math.min(z - near, far - z);
    }
    if (this.t === 'hatMon') {
      // Sông Hát chảy ngang sau lưng quân ta; sông nhánh dọc bên trái bãi ngả dần ra xa, đổ vào ở góc sau bên trái.
      const near = HAT_MON.near + 0.4 * this.shore(x * 0.12, 0);
      const far = HAT_MON.far + 0.6 * this.shore(x * 0.1, 7);
      const river = Math.min(z - near, far - z);
      const cx = HAT_MON.branchX - HAT_MON.branchLean * (FIELD.d - z) + 0.5 * this.shore(z * 0.1, 3);
      const branch = Math.min(HAT_MON.branchHalf - Math.abs(x - cx), near + 2 - z);
      // Bo tròn hai góc ngã ba.
      return smoothMax(river, branch, 1.6);
    }
    if (this.t === 'luyLau') {
      // Hào nước chạy ngang trước chân thành, mép hào hơi lượn.
      const [nearZ, farZ] = LUY_LAU.moat;
      return Math.min(nearZ + 0.12 * this.shore(x * 0.2, 0) - z, z - farZ - 0.1 * this.shore(x * 0.2, 4));
    }
    if (this.t === 'moDa') {
      // Biển ở phía xa (z nhỏ) và bên phải. Bờ xa chìa ra quanh chân núi bên trái; bờ phải lùi dần về phía quân ta.
      // Bờ lượn nhiều ở xa, gần như thẳng ở góc cuối đường ngựa (đầu đường luôn là cát, góc ngoài luôn là biển).
      const top = -5 + this.shore(x * 0.15, 0) * (0.25 + 0.6 * smoothstep(W - x, 1, 6)) - 3.5 * smoothstep(-x, 2.5, 7) * (1 - smoothstep(-x, 12, 18));
      const along = 0.16 * Math.max(z + 4, 0);
      const right = W + 3.6 + along + Math.min(1.1, along) * this.shore(z * 0.15, 5);
      return smoothMax(top - z, x - right, 0.6);
    }
    return -Infinity;
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
    // Chân núi Mộ Dạ dâng lên bên trái bãi.
    if (this.t === 'moDa') h += 4 * smoothstep(-x, 2, 14) * smoothstep(near, 0.5, 4) * (0.45 + 0.55 * fbm(this.hills, x * 0.09 + 20, z * 0.09));
    // Cửa sông, Mộ Dạ: đất phẳng dần thành bãi ra tới mép nước, dưới nước là đáy sông, đáy biển. Bờ sông thoai thoải
    // hơn bờ biển (bờ biển phải dốc vừa đủ để đầu đường ngựa sát mép nước vẫn là cát khô).
    if (WATERY.has(this.t)) {
      const d = this.wet(x, z);
      // Hào thành đào dốc, bờ đứng hơn bờ sông.
      const slope = this.t === 'moDa' ? [-0.7, 1.3] : this.t === 'luyLau' ? [-0.4, 0.85] : [-1.6, 1.4];
      h = THREE.MathUtils.lerp(h * (1 - smoothstep(d, -4, -1.2)), SEABED, smoothstep(d, slope[0], slope[1]));
    }
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
    if (this.t === 'luyLau') {
      // Bờ hào đất trơ, sát nước sẫm màu; dải đất trống giữa hào và chân thành.
      const d = this.wet(x, z);
      out.lerp(this.tint.setHex(C.earth), smoothstep(d, -1.7, -0.9) * 0.85);
      out.lerp(this.tint.setHex(C.earthDark), smoothstep(d, -0.45, -0.05));
      return out;
    }
    if (WATERY.has(this.t)) {
      // Chân núi Mộ Dạ có cỏ cây; bãi cát dọc mép nước, cát ướt sẫm màu sát nước.
      if (this.t === 'moDa') out.lerp(this.tint.setHex(C.grassLocked[1]), smoothstep(h, 0.4, 1.6) * smoothstep(-x, 2, 7));
      const d = this.wet(x, z);
      out.lerp(this.tint.setHex(SAND), smoothstep(d, -3.2 + (p - 0.5) * 2.5, -2));
      out.lerp(this.tint.setHex(WET_SAND), smoothstep(d, -1.1, -0.4));
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
      mesh.userData.ground = true;
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
    mesh.userData.ground = true;
    return mesh;
  }
}

// ---------- Chương 5: Hát Môn, Luy Lâu ----------

/**
 * Khối chóp cụt đáy chữ nhật rộng `w`, sâu `d`, cao `h`, đáy ở `y` (nền đắp, mái). Mặt trên thu còn `tx`, `tz` lần
 * đáy theo hai chiều: mái chái có nóc khi `tz` gần 0. Mỗi mặt tô phẳng.
 */
function frustum(b: ShapeBuilder, w: number, d: number, h: number, tx: number, tz: number, color: number, x: number, y: number, z: number): void {
  const geo = new THREE.BoxGeometry(w, h, d);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) <= 0) continue;
    pos.setX(i, pos.getX(i) * tx);
    pos.setZ(i, pos.getZ(i) * tz);
  }
  geo.computeVertexNormals();
  b.add(geo, color, x, y + h / 2, z);
}

/**
 * Đàn tế Hát Môn: nền đất đắp hai tầng có bậc lên ở mặt trước, trên đỉnh cột cờ đỏ cao, trống đồng và mâm lễ;
 * bốn góc nền cắm phướn đỏ.
 */
function danTe(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  frustum(p, 2.5, 2.2, 0.42, 0.88, 0.86, C.earth, 0, -0.1, 0);
  p.box(2.16, 0.03, 1.86, C.earthDark, 0, 0.33, 0);
  frustum(p, 1.5, 1.3, 0.34, 0.86, 0.84, 0xb88f5c, 0, 0.32, -0.05);
  p.box(1.26, 0.03, 1.06, C.soil, 0, 0.67, -0.05);
  // Bậc đất lên đàn ở mặt trước (phía sông).
  for (let k = 0; k < 3; k++) p.box(0.7, 0.12, 0.2, k % 2 ? C.earthDark : C.earth, 0, 0.06 + k * 0.1, 1.15 - k * 0.18);
  for (let k = 0; k < 2; k++) p.box(0.5, 0.12, 0.18, C.earth, 0, 0.4 + k * 0.12, 0.66 - k * 0.16);
  // Cột cờ đỏ trên tầng trên, ngọn đồng, cờ đỏ lớn viền vàng.
  m.band.cyl(0.045, 0.06, 3.4, C.red, 0, 0.67 + 1.7, -0.35, undefined, 6);
  p.cone(0.07, 0.22, C.bronze, 0, 4.18, -0.35, undefined, 5);
  m.band.box(1.05, 0.7, 0.03, C.red, 0.55, 3.6, -0.35);
  p.box(1.08, 0.05, 0.035, C.gold, 0.55, 3.25, -0.35);
  p.box(1.08, 0.05, 0.035, C.gold, 0.55, 3.95, -0.35);
  // Trống đồng và mâm lễ trước cột cờ.
  m.drum.cyl(0.24, 0.24, 0.04, C.bronze, -0.32, 0.92, 0.15, undefined, 14);
  p.cyl(0.24, 0.2, 0.22, C.bronzeDark, -0.32, 0.79, 0.15, undefined, 14);
  p.cyl(0.2, 0.2, 0.05, C.woodDark, 0.32, 0.71, 0.18, undefined, 10);
  p.cyl(0.07, 0.05, 0.08, C.bronze, 0.32, 0.78, 0.18, undefined, 8);
  for (const dx of [-0.08, 0.08]) p.cyl(0.006, 0.006, 0.18, C.red, 0.32 + dx, 0.88, 0.18, undefined, 3);
  // Phướn đỏ bốn góc nền.
  for (const [x, z] of [
    [-1.05, -0.9],
    [1.05, -0.9],
    [-1.05, 0.9],
    [1.05, 0.9],
  ]) {
    p.cyl(0.022, 0.025, 1.5, C.woodDark, x, 0.75, z, undefined, 5);
    p.box(0.16, 0.6, 0.02, C.red, x + 0.1, 1.15, z);
    p.cone(0.08, 0.14, C.red, x + 0.1, 0.78, z, [Math.PI, 0, 0], 3);
  }
  return m.group();
}

/** Thuyền nan đan tre quét dầu rái: thân dài thon hai đầu, cạp tre, ba đòn ngang, sào chống và nón lá trong lòng. */
function thuyenNan(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  p.box(1.5, 0.06, 0.4, NAN_COLOR.hull, 0, 0.03, 0);
  p.box(1.42, 0.02, 0.36, NAN_COLOR.inner, 0, 0.065, 0);
  for (const s of [-1, 1]) {
    m.band.box(1.5, 0.16, 0.04, NAN_COLOR.hull, 0, 0.12, s * 0.21, [s * 0.18, 0, 0]);
    p.cyl(0.022, 0.022, 1.5, NAN_COLOR.rim, 0, 0.2, s * 0.235, [0, 0, Math.PI / 2], 5);
    // Hai đầu vuốt nhọn, hơi cong lên.
    for (const dir of [-1, 1]) {
      p.box(0.4, 0.14, 0.05, NAN_COLOR.hull, dir * 0.88, 0.14, s * 0.1, [0, -dir * s * 0.5, dir * 0.22]);
      p.cyl(0.02, 0.02, 0.42, NAN_COLOR.rim, dir * 0.88, 0.22, s * 0.12, [0, -dir * s * 0.5, Math.PI / 2 + dir * 0.22], 4);
    }
  }
  for (const x of [-0.45, 0, 0.45]) p.box(0.04, 0.03, 0.44, NAN_COLOR.rim, x, 0.19, 0);
  p.cyl(0.015, 0.015, 2.1, C.bamboo, 0.1, 0.24, 0.08, [0, 0.12, Math.PI / 2 - 0.06], 4);
  p.cone(0.17, 0.09, C.thatch, -0.35, 0.13, -0.05, [0.25, 0, 0.1], 10);
  return m.group();
}

/** Thúng chai: thuyền tròn đan tre, cạp tre dày, mái chèo gác ngang. */
function thungChai(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  p.add(new THREE.SphereGeometry(0.36, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), NAN_COLOR.hull, 0, 0.2, 0, [0, 0, 0], [1, 0.55, 1]);
  p.cyl(0.33, 0.33, 0.02, NAN_COLOR.inner, 0, 0.13, 0, undefined, 12);
  p.add(new THREE.TorusGeometry(0.36, 0.03, 5, 16), NAN_COLOR.rim, 0, 0.2, 0, [Math.PI / 2, 0, 0]);
  p.cyl(0.014, 0.014, 0.9, C.woodLight, 0, 0.24, 0, [0.1, 0.5, Math.PI / 2], 4);
  p.box(0.16, 0.02, 0.07, C.woodLight, 0.45 * Math.cos(0.5), 0.24, -0.45 * Math.sin(0.5), [0, 0.5, 0]);
  return m.group();
}

/**
 * Một khúc luống ngô: ba cây thẳng hàng theo trục x, lá to chĩa ra hai bên luống rồi rủ xuống, cờ ngô vàng khô
 * trên ngọn, bắp ngô bẹ xanh nhú hạt vàng có râu nâu.
 */
function cornTemplate(seed: number): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.24 + (rand() - 0.5) * 0.05;
    const z = (rand() - 0.5) * 0.08;
    const h = 1.1 + rand() * 0.3;
    b.cyl(0.02, 0.034, h, 0x6f8f38, x, h / 2, z, undefined, 4);
    for (let k = 0; k < 4; k++) {
      // Lá mọc so le hai bên luống: đoạn gốc vươn chếch lên, đoạn ngọn rủ xuống.
      const side = k % 2 ? 1 : -1;
      const a = Math.PI / 2 + (side > 0 ? 0 : Math.PI) + (rand() - 0.5) * 0.7;
      const y = h * (0.24 + k * 0.18);
      const color = k % 2 ? C.corn : 0x9cb85a;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const l1 = 0.28 + rand() * 0.08;
      const t1 = 0.75;
      b.box(0.11, l1, 0.014, color, x + ca * Math.sin(t1) * l1 * 0.5, y + Math.cos(t1) * l1 * 0.5, z + sa * Math.sin(t1) * l1 * 0.5, [sa * t1, 0, -ca * t1]);
      const tx = x + ca * Math.sin(t1) * l1;
      const tyy = y + Math.cos(t1) * l1;
      const tz = z + sa * Math.sin(t1) * l1;
      const l2 = 0.26 + rand() * 0.08;
      const t2 = 1.85;
      b.box(0.09, l2, 0.012, color, tx + ca * Math.sin(t2) * l2 * 0.5, tyy + Math.cos(t2) * l2 * 0.5, tz + sa * Math.sin(t2) * l2 * 0.5, [sa * t2, 0, -ca * t2]);
    }
    // Cờ ngô: chùm nhánh vàng khô xòe trên ngọn.
    b.cone(0.018, 0.24, C.cornDry, x, h + 0.12, z, undefined, 3);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + rand();
      b.cone(0.014, 0.2, C.cornDry, x + Math.cos(a) * 0.05, h + 0.06, z + Math.sin(a) * 0.05, [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7], 3);
    }
    if (i !== 1) continue;
    // Bắp ngô chếch ra một bên thân cây giữa.
    const ey = h * (0.42 + rand() * 0.1);
    const es = rand() < 0.5 ? 1 : -1;
    b.add(new THREE.SphereGeometry(0.06, 5, 3), 0xbcc46a, x, ey, z + es * 0.06, [es * 0.45, 0, 0], [1, 2.3, 1]);
    b.add(new THREE.SphereGeometry(0.045, 5, 3), C.ripe, x, ey + 0.06, z + es * 0.1, [es * 0.45, 0, 0], [1, 1.6, 1]);
    b.cone(0.022, 0.09, 0x8a4a2a, x, ey + 0.16, z + es * 0.13, [es * 0.6, 0, 0], 3);
  }
  return b.mesh(toon);
}

let cachedCorn: THREE.Mesh[] | null = null;

/**
 * Bãi ngô Hát Môn trên bãi bồi ven sông: luống ngô thẳng hàng phía trên dải lau sậy sát nước, có quãng bỏ trống;
 * không lấn bãi chiến, đàn tế, chỗ Lạc tướng đánh trống.
 */
function cornField(relief: Relief): THREE.Object3D {
  cachedCorn ??= [cornTemplate(5), cornTemplate(19), cornTemplate(41)];
  const rand = seeded(67);
  const spots: Placement[] = [];
  const keepOut: Zone[] = [
    { x0: DRUMMER.x - 2.6, x1: DRUMMER.x + 2.4, z0: FIELD.d, z1: FIELD.d + 3.6 },
    { x0: DAN_TE.x - 1.6, x1: DAN_TE.x + 1.6, z0: DAN_TE.z - 1.5, z1: DAN_TE.z + 1.7 },
  ];
  // Chỉ trồng trong tầm camera thấy được (khổ dọc lẫn khổ ngang), cho nhẹ máy.
  for (let x = -9; x <= FIELD.w + 9; x += 0.74) {
    for (let z = -5; z <= FIELD.d + 7.5; z += 0.62) {
      // Luống thẳng hàng theo trục x, mỗi khúc chỉ lệch chút ít.
      const px = x + (rand() - 0.5) * 0.08;
      const pz = z + (rand() - 0.5) * 0.06;
      const kind = rand();
      const s = 0.9 + rand() * 0.25;
      const ry = (rand() - 0.5) * 0.3 + (rand() < 0.5 ? Math.PI : 0);
      const d = relief.wet(px, pz);
      if (d < -4.2 || d > -1.5) continue;
      if (relief.grove(px * 0.8 + 120, pz * 0.8) < 0.25) continue;
      if (signedDistance(FIELD_RIM, px, pz) < 0.2) continue;
      if (keepOut.some((zn) => signedDistance(zn, px, pz) < 0)) continue;
      spots.push({ t: kind < 0.4 ? 0 : kind < 0.75 ? 1 : 2, x: px, y: relief.height(px, pz) - 0.02, z: pz, s, ry });
    }
  }
  return instanceTemplates(cachedCorn, spots, thinOutline);
}

/** Cờ đen viền đỏ của quân Hán trên thành: cột, lá cờ bay về +x. */
function blackFlag(b: ToonModel, x: number, y: number, z: number, h: number, size = 1): void {
  b.plain.cyl(0.03, 0.035, h, C.woodDark, x, y + h / 2, z, undefined, 5);
  b.plain.cone(0.05, 0.14, C.hanIron, x, y + h + 0.07, z, undefined, 4);
  const w = 0.6 * size;
  const fh = 0.44 * size;
  b.plain.box(w, fh, 0.025, LUY.cloth, x + w / 2 + 0.03, y + h - fh / 2 - 0.05, z);
  b.plain.box(w + 0.02, 0.05 * size, 0.03, C.hanRed, x + w / 2 + 0.03, y + h - fh - 0.05, z);
  b.plain.box(0.05 * size, fh, 0.03, C.hanRed, x + w + 0.04, y + h - fh / 2 - 0.05, z);
}

/**
 * Thành Luy Lâu: tường đất nện từng lớp ván khuôn, chân choãi, có ụ nhô ra từng quãng và lỗ châu mai trên đỉnh;
 * cổng giữa có khung gỗ, hai cánh cửa đinh đồng, trên là lầu cổng cột son hai tầng mái ngói đen; cờ đen dọc thành;
 * cầu gỗ qua hào trước cổng; mái nhà ngói đen trong thành nhô sau tường.
 */
function thanhLuyLau(): THREE.Group {
  const g = new THREE.Group();
  const m = new ToonModel(inkThin);
  const p = m.plain;
  const { wall, h, gate } = LUY_LAU;
  const [front, back] = wall;
  const zc = (front + back) / 2;
  const thick = front - back;
  const LAYERS = 7;
  const lh = h / LAYERS;
  const earth = [C.earth, 0xb38a58, 0x9c7446];
  // Một khối tường đất nện từ x0 tới x1, từ độ cao y0 trở lên (chân tường chôn xuống đất cho khỏi hở), dày thêm
  // `bulge` về phía trước.
  const rammed = (x0: number, x1: number, y0: number, bulge = 0, seed = 0) => {
    const len = x1 - x0;
    if (len < 0.05) return;
    const k0 = Math.max(0, Math.floor(y0 / lh));
    for (let k = k0; k < LAYERS; k++) {
      const tk = thick * (1 - (0.3 * k) / (LAYERS - 1)) + bulge;
      const yb = k === k0 ? (k === 0 ? -0.4 : y0) : k * lh;
      const yt = (k + 1) * lh;
      p.box(len, yt - yb, tk, earth[(k + seed) % 3], (x0 + x1) / 2, (yb + yt) / 2, zc + bulge / 2);
    }
    // Đỉnh tường: lối đi đất sẫm, tường chắn mái có lỗ châu mai ở mép trước.
    const top = thick * 0.7 + bulge;
    p.box(len, 0.04, top, C.earthDark, (x0 + x1) / 2, h + 0.02, zc + bulge / 2);
    const fz = zc + bulge / 2 + top / 2 - 0.08;
    p.box(len, 0.16, 0.16, C.earth, (x0 + x1) / 2, h + 0.1, fz);
    for (let x = x0 + 0.2; x < x1 - 0.15; x += 0.62) p.box(0.32, 0.22, 0.16, earth[1], x + 0.08, h + 0.29, fz);
  };
  const gx0 = gate.x - gate.half;
  const gx1 = gate.x + gate.half;
  const bastions = [-17.5, -11.5, -5.5, 5.5, 11.5, 17.5].map((dx) => gate.x + dx);
  let seed = 0;
  const run = (from: number, to: number) => {
    for (let x = from; x < to - 0.01; x += 2.4) rammed(x, Math.min(x + 2.4, to), 0, 0, seed++);
  };
  run(-27, gx0 - 0.5);
  run(gx1 + 0.5, FIELD.w + 27);
  // Hai trụ cổng nhô ra, và mảng tường trên lối cổng.
  const bulge = 0.25;
  rammed(gx0 - 0.5, gx0, 0, bulge, 1);
  rammed(gx1, gx1 + 0.5, 0, bulge, 2);
  rammed(gx0, gx1, gate.h + 0.02, bulge, 0);
  for (const x of bastions) rammed(x - 0.7, x + 0.7, 0, bulge, 1);
  // Khung cổng gỗ son, hai cánh cửa gỗ đinh vàng đóng kín.
  const gz = front + bulge - 0.05;
  for (const x of [gx0, gx1]) p.box(0.14, gate.h + 0.05, 0.14, LUY.post, x + (x < gate.x ? 0.07 : -0.07), (gate.h + 0.05) / 2, gz);
  p.box(gate.half * 2 + 0.1, 0.14, 0.16, LUY.post, gate.x, gate.h, gz);
  for (const s of [-1, 1]) {
    const cx = gate.x + (s * gate.half) / 2;
    p.box(gate.half - 0.06, gate.h - 0.06, 0.08, LUY.door, cx, (gate.h - 0.06) / 2, zc);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) p.sphere(0.022, C.gold, cx + (i - 1) * 0.2, 0.2 + j * 0.26, zc + 0.05, [1, 1, 0.6], 5);
    p.sphere(0.045, C.bronze, gate.x + s * 0.07, 0.5, zc + 0.06, [1, 1, 0.6], 6);
  }
  // Lầu cổng: sàn, tường gỗ, hàng cột son, mái ngói đen hai tầng, nóc cong hai đầu.
  const ty = h + 0.04;
  const tz = zc + 0.05;
  p.box(3.0, 0.1, thick * 0.85, C.woodDark, gate.x, ty + 0.05, tz);
  p.box(2.5, 0.45, 0.72, 0x6e3a24, gate.x, ty + 0.32, tz - 0.04);
  for (let i = 0; i < 4; i++) {
    const x = gate.x - 1.1 + (i * 2.2) / 3;
    p.box(0.09, 0.47, 0.09, LUY.post, x, ty + 0.33, tz + 0.4);
    if (i < 3) p.box(0.42, 0.24, 0.02, LUY.cloth, x + 1.1 / 3, ty + 0.36, tz + 0.33);
  }
  p.box(2.6, 0.08, 0.08, LUY.post, gate.x, ty + 0.56, tz + 0.4);
  frustum(p, 3.5, 1.75, 0.22, 0.72, 0.5, LUY.tile, gate.x, ty + 0.56, tz);
  p.box(3.54, 0.04, 1.79, LUY.tileEdge, gate.x, ty + 0.56, tz);
  p.box(1.7, 0.16, 0.55, 0x6e3a24, gate.x, ty + 0.86, tz);
  for (let i = 0; i < 3; i++) p.box(0.07, 0.16, 0.07, LUY.post, gate.x - 0.6 + i * 0.6, ty + 0.86, tz + 0.29);
  frustum(p, 2.5, 1.25, 0.42, 0.44, 0.05, LUY.tile, gate.x, ty + 0.94, tz);
  p.box(2.54, 0.04, 1.29, LUY.tileEdge, gate.x, ty + 0.94, tz);
  p.box(1.15, 0.07, 0.09, LUY.tileEdge, gate.x, ty + 1.38, tz);
  for (const s of [-1, 1]) p.box(0.18, 0.07, 0.07, LUY.tileEdge, gate.x + s * 0.62, ty + 1.43, tz, [0, 0, -s * 0.6]);
  // Cờ đen hai bên lầu cổng và dọc mặt thành.
  blackFlag(m, gate.x - 1.5, ty, tz + 0.3, 1.7, 1.1);
  blackFlag(m, gate.x + 1.5, ty, tz + 0.3, 1.7, 1.1);
  for (let x = -14; x <= FIELD.w + 14; x += 3.1) {
    if (Math.abs(x - gate.x) < 2.4) continue;
    blackFlag(m, x, h, zc - 0.15, 1.1, 0.9);
  }
  // Cầu gỗ qua hào trước cổng.
  const [mNear, mFar] = LUY_LAU.moat;
  const bz0 = mNear + 0.35;
  const bz1 = front + 0.15;
  const bl = bz0 - bz1;
  p.box(1.4, 0.08, bl, C.wood, gate.x, 0.12, (bz0 + bz1) / 2);
  for (let k = 0; k < Math.round(bl / 0.22); k++) p.box(1.44, 0.02, 0.05, C.woodDark, gate.x, 0.17, bz1 + 0.11 + k * 0.22);
  for (const s of [-1, 1]) {
    p.box(0.05, 0.05, bl, C.woodDark, gate.x + s * 0.66, 0.42, (bz0 + bz1) / 2);
    for (const z of [bz1 + 0.15, (mNear + mFar) / 2, bz0 - 0.15]) p.box(0.08, 1.15, 0.08, C.woodDark, gate.x + s * 0.66, -0.2, z);
  }
  // Nhà ngói đen trong thành, nhô mái sau tường.
  for (const [x, z, w, d] of [
    [-3.2, -6.6, 2.2, 1.4],
    [0.6, -7.6, 2.6, 1.6],
    [gate.x, -7, 2.2, 1.4],
    [8.4, -7.5, 2.6, 1.6],
    [12.2, -6.6, 2.2, 1.4],
    [3, -10, 3.2, 1.8],
    [7.6, -10.5, 2.8, 1.6],
  ]) {
    p.box(w, 1.1, d, LUY.plaster, x, 0.55, z);
    frustum(p, w + 0.5, d + 0.5, 0.65, (w - d) / (w + 0.5), 0.05, LUY.tile, x, 1.1, z);
  }
  g.add(m.group());
  return g;
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

/** Lớn hơn trong hai số, bo tròn chỗ hai số gần nhau (góc bờ biển tròn chứ không nhọn). */
function smoothMax(a: number, b: number, k: number): number {
  return (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2;
}

/** Lưới lấy mẫu trùng các đỉnh của tấm đất quanh bãi (`Relief.mesh`), trong khung `x0..x1`, `z0..z1`. */
function landGrid(x0: number, x1: number, z0: number, z1: number): { xs: number[]; zs: number[] } {
  const nx = Math.round(LAND.w / LAND.step);
  const nz = Math.round(LAND.d / LAND.step);
  const dx = LAND.w / nx;
  const dz = LAND.d / nz;
  const ox = FIELD.w / 2 - LAND.w / 2;
  const oz = FIELD.d / 2 - LAND.d / 2;
  const i0 = Math.max(0, Math.floor((x0 - ox) / dx));
  const i1 = Math.min(nx, Math.ceil((x1 - ox) / dx));
  const j0 = Math.max(0, Math.floor((z0 - oz) / dz));
  const j1 = Math.min(nz, Math.ceil((z1 - oz) / dz));
  return {
    xs: Array.from({ length: i1 - i0 + 1 }, (_, i) => ox + (i0 + i) * dx),
    zs: Array.from({ length: j1 - j0 + 1 }, (_, j) => oz + (j0 + j) * dz),
  };
}

type Segment = [number, number, number, number];

/**
 * Đường đồng mức của `f` ở mức `level` trên lưới `xs` × `zs` (marching squares): các đoạn thẳng [x1, z1, x2, z2],
 * kèm chỉ số ô để vẽ nét đứt. Nội suy tuyến tính trên cạnh ô, nên trên lưới đỉnh đất thì đường nằm đúng mép đất.
 */
function contour(f: (x: number, z: number) => number, level: number, xs: number[], zs: number[]): { seg: Segment; i: number; j: number }[] {
  const v = zs.map((z) => xs.map((x) => f(x, z) - level));
  const out: { seg: Segment; i: number; j: number }[] = [];
  for (let j = 0; j + 1 < zs.length; j++) {
    for (let i = 0; i + 1 < xs.length; i++) {
      // Bốn góc theo vòng; điểm cắt trên từng cạnh có đổi dấu.
      const c: [number, number, number][] = [
        [xs[i], zs[j], v[j][i]],
        [xs[i + 1], zs[j], v[j][i + 1]],
        [xs[i + 1], zs[j + 1], v[j + 1][i + 1]],
        [xs[i], zs[j + 1], v[j + 1][i]],
      ];
      const hits: [number, number][] = [];
      for (let k = 0; k < 4; k++) {
        const [ax, az, av] = c[k];
        const [bx, bz, bv] = c[(k + 1) % 4];
        if (av < 0 === bv < 0) continue;
        const u = av / (av - bv);
        hits.push([ax + (bx - ax) * u, az + (bz - az) * u]);
      }
      for (let k = 0; k + 1 < hits.length; k += 2) out.push({ seg: [hits[k][0], hits[k][1], hits[k + 1][0], hits[k + 1][1]], i, j });
    }
  }
  return out;
}

/** Chất liệu bọt sóng, lằn sóng theo màu, dùng chung giữa các lần dựng bãi. */
const lineMaterials = new Map<number, THREE.MeshLambertMaterial>();

/**
 * Dải phẳng rộng `width` nằm ngang ở độ cao `y` dọc các đoạn thẳng. Có `side` thì dải lệch hẳn về phía `side` lớn hơn
 * (phía nước), để nét bọt nằm trên mặt nước sát bờ chứ không chìm dưới đất.
 */
function ribbon(segs: Segment[], width: number, y: number, color: number, side?: (x: number, z: number) => number): THREE.Mesh {
  const pos: number[] = [];
  for (const [x1, z1, x2, z2] of segs) {
    const len = Math.hypot(x2 - x1, z2 - z1) || 1;
    let nx = -(z2 - z1) / len;
    let nz = (x2 - x1) / len;
    let shift = 0;
    if (side) {
      const mx = (x1 + x2) / 2;
      const mz = (z1 + z2) / 2;
      if (side(mx + nx * 0.3, mz + nz * 0.3) < side(mx - nx * 0.3, mz - nz * 0.3)) {
        nx = -nx;
        nz = -nz;
      }
      shift = width * 0.45;
    }
    // Kéo dài mỗi đoạn một chút cho các đoạn liền nhau khít nét.
    const ex = ((x2 - x1) / len) * width * 0.4;
    const ez = ((z2 - z1) / len) * width * 0.4;
    const lo = shift - width / 2;
    const hi = shift + width / 2;
    const a = [x1 - ex + nx * lo, z1 - ez + nz * lo];
    const b = [x1 - ex + nx * hi, z1 - ez + nz * hi];
    const c = [x2 + ex + nx * hi, z2 + ez + nz * hi];
    const d = [x2 + ex + nx * lo, z2 + ez + nz * lo];
    // Mỗi tam giác quay mặt lên trời (thứ tự đỉnh ngược chiều kim đồng hồ nhìn từ trên xuống).
    for (const [p, q, r] of [[a, b, c], [a, c, d]]) {
      const up = (q[1] - p[1]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[1] - p[1]);
      for (const [px, pz] of up > 0 ? [p, q, r] : [p, r, q]) pos.push(px, y, pz);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  let material = lineMaterials.get(color);
  if (!material) lineMaterials.set(color, (material = new THREE.MeshLambertMaterial({ color })));
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.userData.ground = true;
  return mesh;
}

/** Mặt nước cửa sông, biển Mộ Dạ: tấm phẳng ở `WATER_Y`, sát bờ nước nông màu sáng, ra xa sẫm dần. */
function waterSurface(relief: Relief): THREE.Mesh {
  const step = 1.5;
  const geo = new THREE.PlaneGeometry(LAND.w, LAND.d, Math.round(LAND.w / step), Math.round(LAND.d / step));
  geo.rotateX(-Math.PI / 2).translate(FIELD.w / 2, WATER_Y, FIELD.d / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const tint = new THREE.Color();
  const sea = relief.terrain === 'moDa';
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = relief.wet(x, z);
    if (sea) {
      c.setHex(SEA.shallow).lerp(tint.setHex(SEA.mid), smoothstep(d, 0, 2.5)).lerp(tint.setHex(SEA.deep), smoothstep(d, 3, 9));
    } else if (relief.terrain === 'luyLau') {
      c.setHex(C.ditchWater).lerp(tint.setHex(0x2c5d66), smoothstep(d, 0.1, 0.8));
    } else {
      c.setHex(RIVER.shallow).lerp(tint.setHex(RIVER.deep), smoothstep(d, 0, 2.2));
      // Ra tới cửa sông thì nước sông hòa vào biển.
      if (relief.terrain === 'cuaSong') c.lerp(tint.setHex(SEA.mid), smoothstep(x, FIELD.w + 4, FIELD.w + 20) * 0.8);
    }
    c.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, groundMaterial);
  mesh.receiveShadow = true;
  mesh.userData.ground = true;
  return mesh;
}

/**
 * Bọt sóng trắng chạy dọc mép nước (đúng chỗ đất cắt mặt nước) và vài lằn sóng đứt quãng ngoài xa song song với bờ,
 * như hoa văn sóng nước trên trống đồng. Sông thì lằn gợn nhạt hơn, thưa hơn.
 */
function shoreLines(relief: Relief): THREE.Mesh[] {
  const sea = relief.terrain === 'moDa';
  const { xs, zs } = landGrid(-28, FIELD.w + 28, -30, FIELD.d + 14);
  const foam = contour((x, z) => relief.height(x, z), WATER_Y, xs, zs).map((c) => c.seg);
  const out = [ribbon(foam, sea ? 0.16 : 0.11, WATER_Y + 0.012, sea ? C.foam : C.ripple, (x, z) => relief.wet(x, z))];
  const wave = (level: number, keep: (i: number, j: number) => boolean) =>
    contour((x, z) => relief.wet(x, z), level, xs, zs)
      .filter((c) => keep(c.i, c.j))
      .map((c) => c.seg);
  const lines = sea
    ? [...wave(1.3, (i, j) => (i * 7 + j * 3) % 5 < 3), ...wave(2.8, (i, j) => (i * 5 + j * 11) % 6 < 3)]
    : wave(1.6, (i, j) => (i * 7 + j * 3) % 7 < 3);
  out.push(ribbon(lines, sea ? 0.1 : 0.07, WATER_Y + 0.01, sea ? C.foam : C.ripple));
  for (const m of out) m.castShadow = false;
  return out;
}

/** Một khóm lau sậy: thân mảnh chếch ra, lá dài, ngọn trổ bông (lau trắng bạc hay sậy nâu tím). */
function reedTemplate(seed: number, plume: number): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.2;
    const h = 0.85 + rand() * 0.6;
    const lean = 0.08 + rand() * 0.2;
    const dx = Math.cos(a) * Math.sin(lean);
    const dz = Math.sin(a) * Math.sin(lean);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const rot: [number, number, number] = [Math.sin(a) * lean, 0, -Math.cos(a) * lean];
    b.cone(0.024, h, i % 3 ? REED.stalk : REED.stalkDry, x + (dx * h) / 2, (Math.cos(lean) * h) / 2, z + (dz * h) / 2, rot, 3);
    // Bông trổ ở ngọn, chúc đầu theo chiều thân chếch.
    const tip = h + 0.14;
    b.cone(0.055, 0.34, plume, x + dx * tip, Math.cos(lean) * tip, z + dz * tip, [rot[0] * 2.2 + Math.PI, 0, rot[2] * 2.2], 4);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rand();
    const lean = 0.5 + rand() * 0.3;
    const len = 0.55 + rand() * 0.25;
    const s = Math.sin(lean) * len * 0.5;
    b.box(0.06, len, 0.012, REED.leaf, Math.cos(a) * s, Math.cos(lean) * len * 0.5, Math.sin(a) * s, [Math.sin(a) * lean, 0, -Math.cos(a) * lean]);
  }
  return b.mesh(toon);
}

let cachedReeds: THREE.Mesh[] | null = null;
const thinOutline = (geo: THREE.BufferGeometry) => outlineOf(geo, inkThin);
/** Bãi chiến và một viền quanh: lau sậy, đá, lông ngỗng không lấn vào. */
const FIELD_RIM: Zone = { x0: -1.5, x1: FIELD.w + 1.5, z0: -1.5, z1: FIELD.d + 1.5 };

/** Bãi lau sậy mọc thành từng đám dọc hai bờ sông và quanh bãi bồi, chừa chỗ thuyền neo và mép bãi chiến. */
function reedBeds(relief: Relief, boats: { x: number; z: number }[]): THREE.Object3D {
  cachedReeds ??= [reedTemplate(3, REED.lau), reedTemplate(8, REED.say), reedTemplate(13, REED.lau)];
  const rand = seeded(57);
  const spots: Placement[] = [];
  // Cửa sông: sông phía giặc; bờ bên kia: sông sau lưng quân ta; Hát Môn: sông sau lưng và sông nhánh bên trái.
  const [z0, z1] = relief.terrain === 'benKia' ? [FIELD.d, FIELD.d + 14] : relief.terrain === 'hatMon' ? [-26, FIELD.d + 14] : [-26, 10];
  for (let x = -22; x <= FIELD.w + 22; x += 0.5) {
    for (let z = z0; z <= z1; z += 0.5) {
      const px = x + (rand() - 0.5) * 0.5;
      const pz = z + (rand() - 0.5) * 0.5;
      const kind = rand();
      const s = 0.8 + rand() * 0.45;
      const ry = rand() * Math.PI * 2;
      const d = relief.wet(px, pz);
      if (d < -1.5 || d > 0.4) continue;
      // Mọc thành đám, có quãng bờ trống (Hát Môn thưa hơn, cho thấy bãi ngô và thuyền nan).
      if (relief.grove(px * 1.6 + 70, pz * 1.6) < (relief.terrain === 'hatMon' ? 0.5 : 0.3)) continue;
      // Không lấn vào bãi chiến và chỗ thuyền giặc neo.
      if (signedDistance(FIELD_RIM, px, pz) < 0.3) continue;
      if (boats.some((b) => Math.abs(b.x - px) < 0.8 && Math.abs(b.z - pz) < 2.2)) continue;
      spots.push({ t: kind < 0.45 ? 0 : kind < 0.75 ? 1 : 2, x: px, y: Math.max(relief.height(px, pz), WATER_Y) - 0.03, z: pz, s, ry });
    }
  }
  return instanceTemplates(cachedReeds, spots, thinOutline);
}

/** Đá tảng lăn lóc ven biển dưới chân núi Mộ Dạ, xa đường ngựa của vua. */
function beachRocks(relief: Relief): THREE.Group {
  const b = new ShapeBuilder();
  const rand = seeded(83);
  let n = 0;
  for (let k = 0; k < 400 && n < 16; k++) {
    const x = -12 + rand() * 12;
    const z = -10 + rand() * 18;
    const r = 0.25 + rand() * 0.45;
    const d = relief.wet(x, z);
    if (d < -2.2 || d > 0.6 || signedDistance(FIELD_RIM, x, z) < 1) continue;
    b.add(new THREE.DodecahedronGeometry(r, 0), rand() < 0.5 ? C.rock : C.rockDark, x, Math.max(relief.height(x, z), WATER_Y) + r * 0.25, z, [rand(), rand() * 6, rand()], [1, 0.7, 1]);
    n++;
  }
  const g = new THREE.Group();
  const mesh = b.mesh(toon);
  g.add(mesh, outlineOf(mesh.geometry, inkThin));
  return g;
}

/** Một chiếc lông ngỗng nằm trên cát: phiến lông dẹt thon, gốc lông tơ xù, cuống lông; `curl` làm phiến hơi cong lên. */
function featherTemplate(curl: number): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  b.add(new THREE.SphereGeometry(1, 6, 3), FEATHER.vane, 0.03, 0.03, 0, [curl, 0, 0], [0.19, 0.018, 0.06]);
  b.add(new THREE.SphereGeometry(1, 5, 3), FEATHER.down, -0.15, 0.03, 0, [0, 0, 0], [0.07, 0.03, 0.05]);
  b.cyl(0.008, 0.011, 0.42, FEATHER.quill, 0.01, 0.045, 0, [0, 0, Math.PI / 2], 3);
  return b.mesh(toon);
}

let cachedFeathers: THREE.Mesh[] | null = null;

/**
 * Lông ngỗng Mỵ Châu rắc dọc đường chạy: một dải dọc mép phải bãi, cạnh đường ngựa của vua (không trên đường),
 * và rải rác trên cát quanh bãi. Không có trên mặt bãi chiến cho lính dễ nhìn.
 */
function feathers(relief: Relief): THREE.Object3D {
  cachedFeathers ??= [featherTemplate(0), featherTemplate(0.35)];
  const rand = seeded(61);
  const spots: Placement[] = [];
  const put = (x: number, z: number) => {
    if (relief.wet(x, z) > -0.5 || signedDistance(MO_DA_ROAD, x, z) < 0.15) return;
    spots.push({ t: rand() < 0.6 ? 0 : 1, x, y: Math.max(relief.height(x, z), 0.02), z, s: 1 + rand() * 0.4, ry: rand() * Math.PI * 2 });
  };
  // Dải lông dọc đường vua chạy về phía biển.
  for (let z = MO_DA.toZ; z < MO_DA.fromZ; z += 0.55 + rand() * 0.5) put(FIELD.w + 0.15 + rand() * 0.3, z);
  // Rải rác trên cát quanh bãi, ngoài mặt bãi chiến.
  for (let k = 0; k < 900 && spots.length < 140; k++) {
    const x = -8 + rand() * (FIELD.w + 20);
    const z = -6 + rand() * (FIELD.d + 14);
    if (signedDistance(FIELD_RIM, x, z) < -1.2) continue;
    if (relief.grove(x * 2 + 30, z * 2) < 0.4) continue;
    put(x, z);
  }
  return instanceTemplates(cachedFeathers, spots, thinOutline);
}
