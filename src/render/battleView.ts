// Vẽ lính hai bên của một trận vào một nhóm cho sẵn: dùng cho trận giữ kinh đô (trong cảnh kinh đô)
// và trận ngoài bãi (trong cảnh bãi chiến). Tọa độ trận cộng `offset` thành tọa độ trong nhóm.

import * as THREE from 'three';
import type { Battle, FighterKind } from '../game/battle';
import { FIRE, HILL, RALLY_BEAT, ROCKS, SKILLS, TT_WAVE, type UnitType } from '../game/defs';
import { BOW_POSE, WEAPON_REST, makeAnDuong, makeFighter, makeGiong, makeMountain, makeRuaVang, makeSonTinh } from './models';
import { C } from './palette';
import { ShapeBuilder, seeded } from './shapes';
import { ToonModel, drumWaveTex, inkThin, outlineOf, toon } from './toon';

interface FighterView {
  obj: THREE.Group;
  deadAge: number;
  /** Gióng bay về trời: đã bay được bao lâu. */
  rise: number;
  /** Tay cầm roi (hay tre) của Gióng, để làm động tác quật. */
  weapon?: THREE.Object3D;
  /** Gióng đang quét tre một vòng (Nhổ tre): còn bao lâu. */
  smash: number;
  /** Gióng đang phi ngựa dọc đường lao (Phun lửa), tọa độ trận. */
  dash?: { fromX: number; fromZ: number; toX: number; toZ: number; age: number };
  /** Đá Dời non mọc quanh chân tên giặc đang bị giữ chân. */
  rocks?: { group: THREE.Group; age: number };
  /** Núi Tản Viên dâng lên dưới chân Sơn Tinh khi Thủy Tinh rút quân; Rùa Vàng nâng An Dương Vương khi Triệu Đà thua chạy. */
  peak?: THREE.Group;
  /** Vòng sáng đồng dưới chân lính ta khi có Trống trận, đập theo nhịp trống. */
  aura?: THREE.Mesh;
  /** Vòng sáng hình mai rùa dưới chân lính ta khi Rùa Vàng che chở. */
  shell?: THREE.Mesh;
  /** An Dương Vương đang chĩa nỏ thần lên trời: còn bao lâu. */
  volley: number;
  /** Đang làm phép (Sơn Tinh dời non, Thủy Tinh hô sóng hay gọi thủy quái): còn bao lâu. */
  cast?: number;
  /** Tôm binh Thủy Tinh vừa gọi lên: còn bao lâu mới trồi hẳn khỏi nước. */
  emerge?: number;
  /** Vũng nước bọt trắng dưới chân lính ta đang đi chậm vì trúng sóng Thủy Tinh. */
  wet?: THREE.Group;
}

/** Vòng núi đá Dời non quanh Sơn Tinh: từng mỏm trồi vụt lên lần lượt, đứng một lúc rồi lún xuống. */
interface Crag {
  group: THREE.Group;
  spikes: { obj: THREE.Group; h: number; delay: number }[];
  cracks: THREE.Group;
  crackMat: THREE.MeshBasicMaterial;
  age: number;
}

/** Bức tường sóng Thủy Tinh hô lên, chạy dọc dải bị quét rồi đổ sụp. */
interface Surge {
  group: THREE.Group;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  age: number;
}

/** Xoáy nước ở chỗ tôm binh được gọi lên: vòng nước xoáy dưới đất và cột nước phun vụt lên. */
interface Whirl {
  group: THREE.Group;
  rings: THREE.Mesh[];
  spout: THREE.Group;
  age: number;
}

/** Rùa Vàng trồi lên cạnh An Dương Vương khi che chở quân ta, rồi lặn dần. */
interface Turtle {
  group: THREE.Group;
  base: number;
  age: number;
}

/** Sóng trống: hoa văn mặt trống đồng loang ra trên mặt đất mỗi nhịp trống. */
interface DrumWave {
  mesh: THREE.Mesh;
  age: number;
}

/** Quả đồi Sơn Tinh ném xuống: rơi từ trên cao, đập xuống đất rồi lún dần. */
interface Hill {
  group: THREE.Group;
  age: number;
  landed: boolean;
}

/** Luồng lửa phun từ mõm ngựa sắt, gắn vào Gióng nên đi theo khi phi. */
interface Jet {
  group: THREE.Group;
  tongues: THREE.Object3D[];
  age: number;
}

/** Vệt đất cháy sém có than hồng, nằm đúng dải bị đốt. Mỗi thứ vẽ một lần (InstancedMesh). */
interface Scorch {
  group: THREE.Group;
  /** Chất liệu riêng của vệt cháy, để làm mờ dần. */
  mat: THREE.MeshBasicMaterial;
  blobs: THREE.InstancedMesh;
  embers: THREE.InstancedMesh;
  /** Chỗ từng hòn than trong dải và nhịp lập lòe riêng. */
  spots: { x: number; z: number; phase: number }[];
  age: number;
}

/** Ngọn lửa nhỏ cháy trên người tên giặc trúng lửa. */
interface Burn {
  group: THREE.Group;
  age: number;
}

/** Một đốm hiệu ứng ngắn: lửa, bụi, khói. Lớn dần rồi mờ đi. */
interface Puff {
  mesh: THREE.Mesh;
  age: number;
  delay: number;
  life: number;
  grow: number;
}

interface Arrow {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  age: number;
  dur: number;
  /** Chờ chừng này giây mới bay (mưa tên nỏ thần rơi lần lượt). */
  delay?: number;
  /** Độ vồng của đường bay; mặc định 0,6. */
  arc?: number;
  /** Lóe sáng vàng ở chỗ trúng. */
  flash?: boolean;
}

/** Vòng sóng đồng lan ra khi Lạc tướng đánh trống trận. */
interface Ring {
  mesh: THREE.Mesh;
  age: number;
}

const SCALE: Partial<Record<FighterKind, number>> = {
  voi: 0.75,
  chienXa: 0.75,
  phoTuong: 1,
  daiTuong: 0.85,
  giong: 1.1,
  sonTinh: 1.05,
  caSau: 0.8,
  thuongLuong: 1,
  thuyTinh: 0.95,
  anDuong: 1.05,
  hoTinh: 0.75,
  gaTrang: 1.05,
  kyBinh: 0.75,
  trieuDa: 0.85,
};
/** Nỏ thần: mũi tên vàng bay vút lên trong chừng này giây, rồi hóa mưa tên rơi xuống từng tên giặc. */
const VOLLEY_RISE = 0.3;
const VOLLEY_AIM = 0.9;
/** Rùa Vàng trồi lên, nằm lại, rồi lặn hẳn sau chừng này giây. */
const TURTLE_LIFE = 2.8;
const boltGeo = new THREE.BoxGeometry(0.07, 0.07, 0.75);
const goldMat = new THREE.MeshBasicMaterial({ color: C.ember });
const skyBoltGeo = new THREE.BoxGeometry(0.1, 0.1, 1.1);
const ghostBallGeo = new THREE.SphereGeometry(0.13, 8, 6);
const ghostBallMat = new THREE.MeshBasicMaterial({ color: C.ghost });
const darkBoltGeo = new THREE.BoxGeometry(0.035, 0.035, 0.36);
const darkBoltMat = new THREE.MeshBasicMaterial({ color: C.ink });
/** Vòng lục giác như mai rùa dưới chân lính ta khi Rùa Vàng che chở. */
const shellGeo = new THREE.RingGeometry(0.34, 0.5, 6).rotateX(-Math.PI / 2);
const shellMat = new THREE.MeshBasicMaterial({ color: 0xd8e060, transparent: true, opacity: 0.7, depthWrite: false });
/** Bốc đồi: đồi rơi trong chừng này giây, nằm lại một lúc rồi lún hẳn. */
const HILL_FALL = 0.45;
const HILL_LIFE = 2.4;
/** Sóng trống sống chừng này giây, loang tới bán kính này (ô). */
const WAVE_LIFE = 1.3;
const WAVE_RADIUS = 6.5;
const waveGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
const auraGeo = new THREE.RingGeometry(0.3, 0.46, 24).rotateX(-Math.PI / 2);
/** Mọi vòng sáng dưới chân dùng chung một chất liệu, đổi độ sáng một lần mỗi khung hình. */
const auraMat = new THREE.MeshBasicMaterial({ color: C.ember, transparent: true, opacity: 0.6, depthWrite: false });
const waterBallGeo = new THREE.SphereGeometry(0.09, 8, 6);
const waterBallMat = new THREE.MeshBasicMaterial({ color: 0x9fd4e8 });
/** Dời non: núi đá trồi lên trong chừng này giây (lần lượt từng mỏm), đứng tới giây CRAG_HOLD, lún hẳn ở CRAG_LIFE. */
const CRAG_RISE = 0.18;
const CRAG_HOLD = 1.25;
const CRAG_LIFE = 1.9;
/** Sóng Thủy Tinh chạy hết dải trong chừng này giây, rồi đổ sụp tới SURGE_LIFE. */
const SURGE_RUN = 0.6;
const SURGE_LIFE = 1.0;
const WHIRL_LIFE = 1.1;
/** Động tác làm phép của Sơn Tinh và Thủy Tinh kéo dài chừng này giây. */
const CAST_TIME = 0.8;
/** Tôm binh trồi khỏi nước trong chừng này giây. */
const EMERGE_TIME = 0.5;
const rainGeo = new THREE.BoxGeometry(0.03, 0.03, 0.55);
const rainMat = new THREE.MeshBasicMaterial({ color: C.rain, transparent: true, opacity: 0.8 });
const wetGeo = new THREE.CircleGeometry(0.46, 16).rotateX(-Math.PI / 2);
const wetMat = new THREE.MeshBasicMaterial({ color: 0x4f9fc0, transparent: true, opacity: 0.55, depthWrite: false });
const foamDotGeo = new THREE.SphereGeometry(0.07, 6, 5);
const foamMat = new THREE.MeshBasicMaterial({ color: C.foam });
const whirlGeo = new THREE.RingGeometry(0.25, 0.42, 20, 1, 0, Math.PI * 1.5).rotateX(-Math.PI / 2);

/** Một mỏm núi đá Dời non: khối đá nhọn nhiều mặt, đỉnh sáng màu, có viền mực. Gốc ở chân. */
function cragSpike(h: number, r: number, rand: () => number): THREE.Group {
  const b = new ShapeBuilder(false, true);
  b.cone(r, h, rand() < 0.5 ? C.rock : C.rockDark, 0, h / 2, 0, undefined, 5);
  b.cone(r * 0.55, h * 0.45, C.rock, r * 0.35, h * 0.22, -r * 0.2, [0.25, 0, -0.2], 5);
  b.cone(r * 0.32, h * 0.3, 0xb8b0a0, 0, h * 0.86, 0, undefined, 5);
  const g = new THREE.Group();
  const mesh = b.mesh(toon);
  g.add(mesh, outlineOf(mesh.geometry, inkThin));
  return g;
}

/**
 * Bức tường sóng: mặt cắt là con sóng đang vỡ (mặt trước lõm, mép sóng cuộn chúi về trước, lưng sóng thoải),
 * kéo dài theo bề ngang `width` (trục x), sóng chạy theo +z. Bọt trắng to nhỏ so le trên mép cuộn và chân sóng.
 */
function surgeModel(width: number, h: number, seed: number): THREE.Group {
  const shape = new THREE.Shape();
  shape.moveTo(-1.0, 0);
  shape.lineTo(0.45, 0);
  shape.quadraticCurveTo(0.08, h * 0.25, 0.12, h * 0.62);
  shape.quadraticCurveTo(0.24, h * 0.86, 0.58, h * 0.76);
  shape.quadraticCurveTo(0.4, h * 1.04, -0.08, h);
  shape.quadraticCurveTo(-0.55, h * 0.92, -1.0, h * 0.18);
  shape.closePath();
  const body = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 8 });
  body.rotateY(-Math.PI / 2);
  body.translate(width / 2, 0, 0);
  const b = new ShapeBuilder(false, true);
  b.add(body, 0x3f8fb8, 0, 0, 0);
  // Lưng sóng nhạt màu hơn: một dải nước thấp kéo dài phía sau.
  b.box(width * 0.96, h * 0.14, 1.0, 0x6fb8d8, 0, h * 0.07, -1.35);
  const rand = seeded(seed);
  const n = Math.max(5, Math.round(width / 0.32));
  for (let i = 0; i < n; i++) {
    const x = -width / 2 + (width * (i + 0.5)) / n + (rand() - 0.5) * 0.12;
    b.sphere(h * (0.09 + rand() * 0.08), C.foam, x, h * (0.8 + rand() * 0.1), 0.5 + rand() * 0.12, [1, 0.75, 1], 7);
    if (rand() < 0.7) b.sphere(h * (0.07 + rand() * 0.06), C.foam, x, h * (0.98 + rand() * 0.12), 0.05 + rand() * 0.2, [1, 0.8, 1], 6);
    b.sphere(h * (0.06 + rand() * 0.05), C.foam, x + 0.08, h * 0.05, 0.5 + rand() * 0.15, [1, 0.6, 1], 6);
  }
  const g = new THREE.Group();
  const mesh = b.mesh(toon);
  g.add(mesh, outlineOf(mesh.geometry, inkThin));
  return g;
}

/** Quả đồi nhỏ có cây: Sơn Tinh nhấc bổng lên ném vào giặc. Rộng vừa vùng bị đánh trúng. */
function hillModel(): THREE.Group {
  const m = new ToonModel(inkThin);
  m.plain.cone(HILL.radius * 0.95, 1.6, C.mountainCloak, 0, 0.8, 0, undefined, 9);
  m.plain.cone(HILL.radius * 0.5, 0.7, C.rock, 0.3, 0.35, 0.4, undefined, 6);
  m.plain.cone(0.45, 0.5, C.rock, 0, 1.45, 0, undefined, 6);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    m.plain.cone(0.22, 0.5, C.leaf[i % 4], Math.cos(a) * 1.0, 0.9, Math.sin(a) * 1.0, undefined, 5);
  }
  return m.group();
}

/** Ba mỏm đá nhọn mọc lên quanh chân một tên giặc. */
function rockSpikes(seed: number): THREE.Group {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rand();
    const h = 0.55 + rand() * 0.35;
    b.cone(0.16, h, i % 2 ? C.rock : C.rockDark, Math.cos(a) * 0.32, h / 2, Math.sin(a) * 0.32, [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25], 5);
  }
  const g = new THREE.Group();
  const mesh = b.mesh(toon);
  g.add(mesh, outlineOf(mesh.geometry, inkThin));
  return g;
}
const puffGeo = new THREE.SphereGeometry(0.3, 10, 8);
const arrowGeo = new THREE.BoxGeometry(0.03, 0.03, 0.45);
const arrowMat = new THREE.MeshBasicMaterial({ color: C.arrow });
const ringGeo = new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2);
const RING_LIFE = 1.1;
/** Phun lửa: ngựa sắt phi hết đường lao trong chừng này giây; lửa phun suốt lúc phi rồi tắt dần. */
const DASH_TIME = 0.4;
const JET_LIFE = 0.75;
const SCORCH_LIFE = 4;
const BURN_LIFE = 2;

// Lửa và than hồng không nhận ánh sáng nên luôn rực, kể cả khi nằm trong bóng.
const flameMats = [C.fire, C.ember, 0xfff0a0].map((color) => new THREE.MeshBasicMaterial({ color }));

/**
 * Một lưỡi lửa hình giọt: nhọn ở gốc, phình to nhất ở khoảng một phần ba, vuốt nhọn ở ngọn.
 * Gốc ở tâm, ngọn chĩa theo +z (hoặc +y nếu `up`).
 */
function tongueGeometry(r: number, len: number, up = false): THREE.BufferGeometry {
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    profile.push(new THREE.Vector2(r * Math.sin(Math.PI * t ** 0.65), t * len));
  }
  const geo = new THREE.LatheGeometry(profile, 7);
  return up ? geo : geo.rotateX(Math.PI / 2);
}
/** Các lưỡi lửa của luồng phun: bán kính, độ dài, màu (đỏ cam, vàng cam, vàng nhạt), xòe ngang, chếch lên. */
const jetShapes = [
  [0.36, 4.2, 0, 0, -0.12],
  [0.28, 3.3, 1, 0.24, -0.2],
  [0.28, 3.4, 1, -0.24, -0.2],
  [0.2, 2.4, 2, 0.08, -0.3],
  [0.2, 2.2, 2, -0.1, -0.05],
  [0.22, 2.7, 0, 0.42, -0.1],
  [0.22, 2.6, 0, -0.42, -0.1],
  [0.18, 2, 1, 0, -0.45],
].map(([r, len, color, yaw, pitch]) => {
  const geo = tongueGeometry(r, len);
  return { geo, outline: outlineOf(geo, inkThin).geometry, color, yaw, pitch };
});
/** Lửa cháy trên người giặc: một ngọn trên đầu, hai ngọn trên vai (vị trí trong khung mô hình lính). */
const burnShapes = [
  [0.2, 0.75, 0, 0, 0.82],
  [0.13, 0.5, 0, -0.2, 0.42],
  [0.13, 0.5, 1, 0.2, 0.42],
].map(([r, len, color, x, y]) => {
  const geo = tongueGeometry(r, len, true);
  return { geo, outline: outlineOf(geo, inkThin).geometry, color, x, y };
});
const scorchGeo = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2);
const emberGeo = new THREE.OctahedronGeometry(0.07, 0);
const EMBERS = 16;
const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const noTurn = new THREE.Quaternion();

/** Một lưỡi lửa có viền mực từ hình đã dựng sẵn. */
function tongue(shape: { geo: THREE.BufferGeometry; outline: THREE.BufferGeometry; color: number }): THREE.Mesh {
  const mesh = new THREE.Mesh(shape.geo, flameMats[shape.color]);
  const ink = new THREE.Mesh(shape.outline, inkThin);
  ink.castShadow = false;
  mesh.add(ink);
  return mesh;
}

/** Nhổ tre: thời gian cả động tác, từ lấy đà tới giơ tre lên lại. */
const SMASH_TIME = 0.9;
const { lerp, smoothstep } = THREE.MathUtils;

/**
 * Động tác tay vũ khí của Gióng. Đòn thường: quật từ trên cao xuống trước mặt (theo `swing` của luật trận).
 * Nhổ tre: vung tre ra sau lấy đà, quật mạnh xuống trước mặt, nâng ngang lên quét trọn một vòng quanh mình,
 * rồi giơ lên lại. Vòng quét dài vừa bằng vùng bị đánh trúng.
 */
function swingWeapon(weapon: THREE.Object3D, swing: number, smash: number): void {
  if (smash > 0) {
    const k = 1 - smash / SMASH_TIME;
    let x: number;
    if (k < 0.15) x = lerp(WEAPON_REST.x, -1, smoothstep(k, 0, 0.15));
    else if (k < 0.3) x = lerp(-1, 2.2, smoothstep(k, 0.15, 0.3));
    else if (k < 0.85) x = lerp(2.2, 1.45, smoothstep(k, 0.3, 0.4));
    else x = lerp(1.45, WEAPON_REST.x, smoothstep(k, 0.85, 1));
    weapon.rotation.set(x, Math.PI * 2 * smoothstep(k, 0.35, 0.85), WEAPON_REST.z);
    return;
  }
  const k = swing > 0 ? 1 - swing / 0.3 : 0;
  weapon.rotation.set(WEAPON_REST.x + 2.25 * Math.sin(Math.PI * k), 0, WEAPON_REST.z);
}

export class BattleView {
  private readonly fighters = new Map<number, FighterView>();
  private readonly arrows: Arrow[] = [];
  private readonly rings: Ring[] = [];
  private readonly puffs: Puff[] = [];
  private readonly jets: Jet[] = [];
  private readonly scorches: Scorch[] = [];
  private readonly burns: Burn[] = [];
  private readonly hills: Hill[] = [];
  private readonly waves: DrumWave[] = [];
  private readonly turtles: Turtle[] = [];
  private readonly crags: Crag[] = [];
  private readonly surges: Surge[] = [];
  private readonly whirls: Whirl[] = [];
  /** Nhịp trống đã tỏa sóng gần nhất của Trống trận đang đánh, −1 khi không có. */
  private rallyBeat = -1;
  private battleId = -1;
  private lastSeq = 0;
  private time = 0;

  /**
   * `scale`: phóng to lính so với cỡ trong kinh đô (bãi chiến nhìn gần hơn cần lính to hơn).
   * `heightAt`: chỗ đứng (độ cao) tại tọa độ trận, cho kinh đô có đất bậc thang và nước lũ.
   * `drumAt`: mặt trống của Lạc tướng (tọa độ trận), nơi sóng trống tỏa ra. Không có thì sóng tỏa từ giữa quân ta.
   */
  constructor(
    private readonly root: THREE.Object3D,
    private readonly offset: { x: number; z: number },
    private readonly scale = 1,
    private readonly heightAt: (x: number, z: number) => number = () => 0,
    private readonly drumAt?: { x: number; z: number },
  ) {}

  /** Gọi mỗi khung hình với trận đang diễn ra, hoặc null khi không có trận. */
  /** Hệ số hình học của trận đang vẽ (`Battle.geo`): ở kinh đô, vùng kỹ năng rộng hơn theo độ giãn của kinh đô. */
  private geo = 1;

  update(battle: Battle | null, dt: number): void {
    this.geo = battle?.geo ?? 1;
    this.time += dt;
    if (!battle || battle.id !== this.battleId) {
      this.clear();
      this.battleId = battle ? battle.id : -1;
    }
    if (battle) {
      this.syncFighters(battle, dt);
      this.readEvents(battle);
      this.syncRally(battle);
      shellMat.opacity = 0.75 * Math.min(1, battle.shield / 0.8);
    }
    this.animate(dt);
  }

  /**
   * Trống trận: mỗi nhịp trống tỏa một sóng hoa văn mặt trống đồng trên mặt đất, từ mặt trống của Lạc tướng
   * (hay từ giữa quân ta khi giữ kinh đô). Vòng sáng dưới chân lính ta bừng lên đúng nhịp rồi dịu dần.
   */
  private syncRally(battle: Battle): void {
    const rally = battle.outcome ? 0 : battle.rally;
    if (rally <= 0) {
      this.rallyBeat = -1;
      return;
    }
    const t = SKILLS.trongTran.duration - rally;
    const beat = Math.floor(t / RALLY_BEAT);
    const k = (t % RALLY_BEAT) / RALLY_BEAT;
    const pulse = Math.exp(-k * 5);
    auraMat.opacity = 0.3 + 0.6 * pulse;
    for (const v of this.fighters.values()) if (v.aura) v.aura.scale.setScalar(1 + 0.3 * pulse);
    if (beat === this.rallyBeat) return;
    this.rallyBeat = beat;
    let at = this.drumAt;
    if (!at) {
      const allies = battle.fighters.filter((f) => f.side === 'ta' && f.state !== 'dead' && f.state !== 'gone');
      if (!allies.length) return;
      at = { x: allies.reduce((s, f) => s + f.x, 0) / allies.length, z: allies.reduce((s, f) => s + f.z, 0) / allies.length };
    }
    const mesh = new THREE.Mesh(
      waveGeo,
      new THREE.MeshBasicMaterial({ color: C.bronzeLight, map: drumWaveTex, transparent: true, depthWrite: false }),
    );
    mesh.position.set(at.x + this.offset.x, this.heightAt(at.x, at.z) + 0.06, at.z + this.offset.z);
    mesh.rotation.y = beat * 0.4;
    mesh.scale.setScalar(0.5);
    mesh.renderOrder = 3;
    this.root.add(mesh);
    this.waves.push({ mesh, age: 0 });
  }

  private clear(): void {
    // Lưỡi lửa dùng hình dựng sẵn cho mọi trận: gỡ khỏi lính trước khi giải phóng hình của lính.
    for (const fx of [...this.jets, ...this.burns]) fx.group.removeFromParent();
    this.jets.length = 0;
    this.burns.length = 0;
    for (const v of this.fighters.values()) {
      this.root.remove(v.obj);
      if (v.peak) this.root.remove(v.peak);
      v.obj.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    }
    this.fighters.clear();
    for (const a of this.arrows) this.root.remove(a.mesh);
    this.arrows.length = 0;
    for (const r of this.rings) {
      this.root.remove(r.mesh);
      (r.mesh.material as THREE.Material).dispose();
    }
    this.rings.length = 0;
    for (const p of this.puffs) {
      this.root.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.puffs.length = 0;
    for (const s of this.scorches) this.dropScorch(s);
    this.scorches.length = 0;
    for (const h of this.hills) this.root.remove(h.group);
    this.hills.length = 0;
    for (const w of this.waves) this.dropWave(w);
    this.waves.length = 0;
    for (const t of this.turtles) this.root.remove(t.group);
    this.turtles.length = 0;
    for (const c of this.crags) this.dropCrag(c);
    this.crags.length = 0;
    for (const w of this.surges) this.root.remove(w.group);
    this.surges.length = 0;
    for (const w of this.whirls) this.root.remove(w.group);
    this.whirls.length = 0;
    this.rallyBeat = -1;
    this.lastSeq = 0;
  }

  private syncFighters(battle: Battle, dt: number): void {
    const { x: ox, z: oz } = this.offset;
    for (const f of battle.fighters) {
      let view = this.fighters.get(f.id);
      if (f.state === 'gone') {
        if (view) {
          this.root.remove(view.obj);
          this.fighters.delete(f.id);
        }
        continue;
      }
      if (!view) {
        if (f.state === 'dead') continue;
        const obj =
          f.kind === 'giong'
            ? makeGiong('trangSi', { bamboo: battle.hero?.bamboo, glow: battle.hero?.glow })
            : f.kind === 'sonTinh'
              ? makeSonTinh({ glow: battle.hero?.glow })
              : f.kind === 'anDuong'
                ? makeAnDuong({ crossbow: true, glow: battle.hero?.glow })
                : makeFighter(f.kind, f.side === 'ta' ? (battle.arms?.[f.kind as UnitType] ?? 0) : 0);
        obj.scale.setScalar((SCALE[f.kind] ?? 0.8) * this.scale);
        this.root.add(obj);
        view = { obj, deadAge: 0, rise: 0, weapon: obj.children.find((c) => c.userData.weapon), smash: 0, volley: 0 };
        this.fighters.set(f.id, view);
      }
      const obj = view.obj;
      obj.position.x = f.x + ox;
      obj.position.z = f.z + oz;
      obj.rotation.y = f.face;
      const base = this.heightAt(f.x, f.z);
      this.syncRocks(view, f.stun ?? 0, f.id, dt);
      this.syncAura(view, f.side === 'ta' && f.state !== 'dead' && battle.rally > 0 && !battle.outcome);
      this.syncShell(view, f.side === 'ta' && f.state !== 'dead' && battle.shield > 0 && !battle.outcome);
      if (f.state === 'dead') {
        view.deadAge += dt;
        obj.rotation.x = -Math.min(view.deadAge * 4, Math.PI / 2);
        obj.position.y = base + (view.deadAge > 1.2 ? -(view.deadAge - 1.2) * 0.6 : 0);
        if (view.deadAge > 2.5) obj.visible = false;
        continue;
      }
      if (f.kind === 'sonTinh') {
        for (const c of obj.children) if (c.userData.halo) c.rotation.z = this.time * 0.6;
        if (battle.sonWin && battle.outcome === 'win') {
          // Thủy Tinh rút quân: núi Tản Viên dâng cao dưới chân Sơn Tinh.
          view.rise += dt;
          const k = Math.min(view.rise / 2.5, 1);
          if (!view.peak) {
            view.peak = makeMountain(2.2, 3.2, C.mountainCloak);
            this.root.add(view.peak);
          }
          view.peak.position.set(obj.position.x, base - 3.2 + 3.2 * THREE.MathUtils.smoothstep(k, 0, 1), obj.position.z);
          obj.position.y = view.peak.position.y + 3.2;
          if (view.weapon) view.weapon.rotation.set(WEAPON_REST.x - 2.4 * Math.min(view.rise, 1), 0, WEAPON_REST.z);
          continue;
        }
        if (view.weapon) swingWeapon(view.weapon, f.swing, 0);
        if (view.cast && view.cast > 0 && view.weapon) {
          // Dời non: giơ gậy thần lên cao quá đầu, rồi dộng mạnh xuống đất.
          const k = 1 - view.cast / CAST_TIME;
          const up = k < 0.55 ? smoothstep(k, 0, 0.3) : 1 - smoothstep(k, 0.55, 0.75);
          view.weapon.rotation.set(WEAPON_REST.x - 2.6 * up, 0, WEAPON_REST.z);
        }
      }
      if (f.kind === 'anDuong') {
        for (const c of obj.children) if (c.userData.halo) c.rotation.z = this.time * 0.6;
        if (battle.advWin && battle.outcome === 'win') {
          // Triệu Đà thua chạy: Rùa Vàng khổng lồ trồi lên, nâng An Dương Vương lên cao, nỏ thần chĩa lên trời.
          view.rise += dt;
          const k = Math.min(view.rise / 2.2, 1);
          const size = 2.6 * this.scale;
          if (!view.peak) {
            view.peak = makeRuaVang();
            view.peak.scale.setScalar(size);
            // Rùa quay nghiêng, đầu ngóc sang bên để không che An Dương Vương đứng trên mai.
            view.peak.rotation.y = f.face + Math.PI / 2;
            this.root.add(view.peak);
            for (let n = 0; n < 10; n++) {
              const a = (n / 10) * Math.PI * 2;
              this.addPuff(obj.position.x + Math.cos(a) * 2, base + 0.3, obj.position.z + Math.sin(a) * 2, n % 2 ? C.ember : C.gold, n * 0.04, 1, 2);
            }
          }
          view.peak.position.set(obj.position.x, base - 1.3 * size * 0.4 + 1.3 * size * 0.4 * THREE.MathUtils.smoothstep(k, 0, 1), obj.position.z);
          obj.position.y = view.peak.position.y + 0.42 * size;
          obj.rotation.x = 0;
          if (view.weapon) view.weapon.rotation.x = lerp(BOW_POSE.rest, BOW_POSE.sky, Math.min(view.rise * 2, 1));
          continue;
        }
        view.volley = Math.max(0, view.volley - dt);
        if (view.weapon) {
          // Ra đòn thì nâng nỏ ngang vai ngắm; bắn nỏ thần thì chĩa lên trời; nghỉ thì hạ ngang thắt lưng.
          const goal = view.volley > 0 ? BOW_POSE.sky : f.swing > 0 ? BOW_POSE.aim : BOW_POSE.rest;
          view.weapon.rotation.x += (goal - view.weapon.rotation.x) * Math.min(1, dt * 14);
        }
      }
      if (f.kind === 'giong') {
        for (const c of obj.children) {
          if (c.userData.flame) c.scale.set(1, 0.7 + 0.5 * Math.abs(Math.sin(this.time * 9)), 1);
          if (c.userData.halo) c.rotation.z = this.time * 0.6;
        }
        if (battle.ascend && battle.outcome === 'win') {
          // Phá xong giặc, Gióng cưỡi ngựa bay lên trời.
          view.rise += dt;
          obj.position.y = base + view.rise * view.rise * 0.8;
          obj.rotation.y = f.face + view.rise * 0.6;
          obj.rotation.x = -0.35;
          continue;
        }
        view.smash = Math.max(0, view.smash - dt);
        if (view.weapon) swingWeapon(view.weapon, f.swing, view.smash);
        if (view.dash) {
          // Phun lửa: ngựa phi dọc đường lao, chồm về trước, nảy theo nhịp vó.
          const d = view.dash;
          d.age += dt;
          const k = 1 - (1 - Math.min(d.age / DASH_TIME, 1)) ** 2;
          obj.position.x = lerp(d.fromX, d.toX, k) + ox;
          obj.position.z = lerp(d.fromZ, d.toZ, k) + oz;
          if (Math.hypot(d.toX - d.fromX, d.toZ - d.fromZ) > 0.01) obj.rotation.y = Math.atan2(d.toX - d.fromX, d.toZ - d.fromZ);
          obj.position.y = this.heightAt(lerp(d.fromX, d.toX, k), lerp(d.fromZ, d.toZ, k)) + Math.abs(Math.sin(d.age * 26)) * 0.14;
          obj.rotation.x = 0.12;
          if (d.age >= DASH_TIME) view.dash = undefined;
          continue;
        }
      }
      // Gióng ra đòn bằng tay vũ khí, ngựa chỉ chồm nhẹ khi quét tre; người khác ngả cả thân.
      if (f.kind === 'giong') obj.rotation.x = view.smash > 0 ? -0.2 * Math.sin(Math.PI * (1 - view.smash / SMASH_TIME)) : 0;
      else if (f.kind === 'sonTinh' || f.kind === 'anDuong') obj.rotation.x = 0;
      else obj.rotation.x = f.swing > 0 ? -0.5 * (f.swing / 0.3) : 0;
      // Đang có Trống trận thì quân ta nhún nhảy hăng hơn; trúng sóng Thủy Tinh thì lội nước, nhún ít.
      const hop = f.side === 'ta' && battle.rally > 0 ? 0.12 : 0.06;
      const wading = (f.slow ?? 0) > 0;
      obj.position.y = base + (f.state === 'move' && !f.stun ? Math.abs(Math.sin(this.time * (wading ? 5 : 10) + f.id)) * hop : 0);
      this.syncWet(view, f.side === 'ta' && wading && !battle.outcome);
      if (view.cast && view.cast > 0) {
        view.cast = Math.max(0, view.cast - dt);
        const k = 1 - view.cast / CAST_TIME;
        if (f.kind === 'sonTinh') {
          // Nhún người lấy đà rồi dậm xuống đúng lúc dộng gậy.
          obj.position.y += 0.35 * this.scale * Math.sin(Math.PI * smoothstep(k, 0.1, 0.6));
        }
        if (f.kind === 'thuyTinh') {
          // Hô mưa gọi gió: ngửa người, giơ đinh ba lên trời, nhô cao trên ngọn sóng.
          const up = Math.sin(Math.PI * k);
          obj.rotation.x = -0.25 * up;
          obj.position.y += 0.3 * this.scale * up;
        }
      }
      if (view.emerge && view.emerge > 0) {
        view.emerge = Math.max(0, view.emerge - dt);
        obj.position.y -= (view.emerge / EMERGE_TIME) ** 2 * 0.9 * this.scale;
      }
    }
  }

  /** Thêm hay bỏ vũng nước bọt trắng dưới chân một người lính ta đang lội vì trúng sóng. */
  private syncWet(view: FighterView, on: boolean): void {
    if (on && !view.wet) {
      const g = new THREE.Group();
      const pool = new THREE.Mesh(wetGeo, wetMat);
      pool.renderOrder = 2;
      g.add(pool);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const dot = new THREE.Mesh(foamDotGeo, foamMat);
        dot.position.set(Math.cos(a) * 0.4, 0.04, Math.sin(a) * 0.4);
        g.add(dot);
      }
      g.position.y = 0.05;
      view.obj.add(g);
      view.wet = g;
    } else if (!on && view.wet) {
      view.wet.removeFromParent();
      view.wet = undefined;
    }
    if (view.wet) {
      view.wet.rotation.y = this.time * 1.5;
      view.wet.children.forEach((c, i) => {
        if (i > 0) c.position.y = 0.04 + Math.abs(Math.sin(this.time * 6 + i)) * 0.06;
      });
    }
  }

  /**
   * Dời non: một vòng núi đá nhọn trồi vụt lên quanh Sơn Tinh đúng bán kính bị đánh (ROCKS.radius), lần lượt
   * từng mỏm; đất nứt toác từ chân Sơn Tinh ra; bụi đất tung ở chân đá. Đứng một lúc rồi lún xuống.
   */
  private raiseCrags(battle: Battle, x: number, z: number, seq: number): void {
    const { x: ox, z: oz } = this.offset;
    const hero = battle.fighters.find((f) => f.kind === 'sonTinh');
    const view = hero && this.fighters.get(hero.id);
    if (view) view.cast = CAST_TIME;
    const rand = seeded(seq * 131 + 17);
    const group = new THREE.Group();
    group.position.set(x + ox, 0, z + oz);
    const spikes: Crag['spikes'] = [];
    const add = (n: number, r: number, hMin: number, hMax: number, size: number, delay0: number): void => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand() * 0.3 + (r < (ROCKS.radius * this.geo) ? 0.3 : 0);
        const px = Math.cos(a) * r;
        const pz = Math.sin(a) * r;
        const h = (hMin + rand() * (hMax - hMin)) * this.scale;
        const obj = cragSpike(h, size * this.scale * (0.85 + rand() * 0.3), rand);
        obj.position.set(px, this.heightAt(x + px, z + pz) - h, pz);
        // Mỏm đá chĩa hơi ra ngoài vòng.
        obj.rotation.set(Math.sin(a) * 0.18, rand() * Math.PI, -Math.cos(a) * 0.18);
        group.add(obj);
        spikes.push({ obj, h, delay: delay0 + (i / n) * 0.12 });
      }
    };
    add(11, (ROCKS.radius * this.geo), 1.0, 1.6, 0.42, 0.04);
    add(7, (ROCKS.radius * this.geo) * 0.62, 0.55, 0.9, 0.28, 0);
    // Đất nứt: những đường nứt sẫm tỏa từ chân Sơn Tinh ra tới vòng đá.
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x2a2018, transparent: true, opacity: 0.7, depthWrite: false });
    const cracks = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
      let cx = 0;
      let cz = 0;
      let dir = a;
      for (let seg = 0; seg < 3; seg++) {
        const len = ((ROCKS.radius * this.geo) / 3) * (0.8 + rand() * 0.4);
        dir += (rand() - 0.5) * 0.6;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.09 - seg * 0.02, 0.01, len), crackMat);
        mesh.position.set(cx + Math.cos(dir) * len * 0.5, this.heightAt(x + cx, z + cz) + 0.04, cz + Math.sin(dir) * len * 0.5);
        mesh.rotation.y = Math.atan2(Math.cos(dir), Math.sin(dir));
        mesh.renderOrder = 2;
        cracks.add(mesh);
        cx += Math.cos(dir) * len;
        cz += Math.sin(dir) * len;
      }
    }
    group.add(cracks);
    this.root.add(group);
    this.crags.push({ group, spikes, cracks, crackMat, age: 0 });
    // Bụi đất tung ở chân từng mỏm đá lớn.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const px = x + Math.cos(a) * (ROCKS.radius * this.geo);
      const pz = z + Math.sin(a) * (ROCKS.radius * this.geo);
      this.addPuff(px + ox, this.heightAt(px, pz) + 0.2, pz + oz, i % 3 ? C.earth : C.rock, 0.05 + (i / 12) * 0.12, 0.9, 1.8);
    }
  }

  private dropCrag(c: Crag): void {
    this.root.remove(c.group);
    c.cracks.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
    c.crackMat.dispose();
  }

  /**
   * Hô mưa gọi gió: Thủy Tinh giơ đinh ba, mây đen và mưa xiên quất xuống quanh mình, một bức tường sóng
   * bề ngang đúng dải bị quét (TT_WAVE.width) chạy từ chỗ Thủy Tinh tới cuối dải rồi đổ sụp, bọt tung dọc đường.
   */
  private surge(battle: Battle, x: number, z: number, tx: number, tz: number, seq: number): void {
    const { x: ox, z: oz } = this.offset;
    const tt = battle.fighters.find((f) => f.kind === 'thuyTinh');
    const view = tt && this.fighters.get(tt.id);
    if (view) view.cast = CAST_TIME;
    const face = Math.atan2(tx - x, tz - z);
    const group = surgeModel(TT_WAVE.width, 1.35 * this.scale, seq * 53 + 1);
    group.rotation.y = face;
    group.position.set(x + ox, this.heightAt(x, z), z + oz);
    group.scale.set(1, 0.3, 1);
    this.root.add(group);
    this.surges.push({ group, fromX: x, fromZ: z, toX: tx, toZ: tz, age: 0 });
    // Bọt tung hai bên mép sóng dọc đường sóng chạy.
    const dx = Math.sin(face);
    const dz = Math.cos(face);
    for (let n = 0; n <= 6; n++) {
      const k = n / 6;
      for (const side of [-1, 1]) {
        const px = x + (tx - x) * k + dz * side * TT_WAVE.width * 0.5;
        const pz = z + (tz - z) * k - dx * side * TT_WAVE.width * 0.5;
        this.addPuff(px + ox, this.heightAt(px, pz) + 0.4, pz + oz, n % 2 ? C.foam : 0x9fd4e8, SURGE_RUN * k, 0.6, 1.4);
      }
    }
    // Mây đen kéo tới trên đầu Thủy Tinh, mưa xiên theo gió quất xuống quanh mình.
    const ground = this.heightAt(x, z);
    for (let n = 0; n < 5; n++) {
      const a = (n / 5) * Math.PI * 2;
      this.addPuff(x + ox + Math.cos(a) * 1.2, ground + 3.4 * this.scale, z + oz + Math.sin(a) * 1.2, C.storm, n * 0.05, 1.3, 2.4);
    }
    const rand = seeded(seq * 977 + 3);
    for (let n = 0; n < 30; n++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 3;
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      const g = this.heightAt(px, pz);
      const mesh = new THREE.Mesh(rainGeo, rainMat);
      mesh.visible = false;
      this.root.add(mesh);
      const from = new THREE.Vector3(px + ox + dx * 1.2, g + 4.2 * this.scale, pz + oz + dz * 1.2);
      const to = new THREE.Vector3(px + ox, g, pz + oz);
      mesh.position.copy(from);
      this.arrows.push({ mesh, from, to, age: 0, dur: 0.28, arc: 0, delay: rand() * 0.9 });
    }
  }

  /** Gọi thủy quái: xoáy nước và bọt bắn lên ở chỗ từng tôm binh trồi lên quanh Thủy Tinh; Thủy Tinh giơ đinh ba. */
  private summon(battle: Battle, x: number, z: number): void {
    const { x: ox, z: oz } = this.offset;
    const tt = battle.fighters.find((f) => f.kind === 'thuyTinh');
    const view = tt && this.fighters.get(tt.id);
    if (view) view.cast = CAST_TIME;
    // Tôm binh vừa gọi là mấy con mới nhất đứng sát Thủy Tinh.
    const fresh = battle.fighters
      .filter((f) => f.kind === 'tomBinh' && f.state !== 'dead' && f.state !== 'gone' && Math.hypot(f.x - x, f.z - z) < 1.8)
      .sort((a, b) => b.id - a.id)
      .slice(0, 3);
    for (const f of fresh) {
      const v = this.fighters.get(f.id);
      if (v) v.emerge = EMERGE_TIME;
      const g = new THREE.Group();
      const rings: THREE.Mesh[] = [];
      for (const [i, color] of [C.sea, 0x6fb8d8, C.foam].entries()) {
        const ring = new THREE.Mesh(whirlGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
        ring.scale.setScalar(1.6 - i * 0.45);
        ring.rotation.y = i * 1.3;
        ring.position.y = 0.03 + i * 0.01;
        ring.renderOrder = 3;
        g.add(ring);
        rings.push(ring);
      }
      // Cột nước xoắn phun vụt lên, đầu cột tung bọt.
      const b = new ShapeBuilder(false, true);
      b.cyl(0.2, 0.32, 1.3, 0x6fb8d8, 0, 0.65, 0, undefined, 10);
      b.cyl(0.12, 0.2, 0.5, C.sea, 0.05, 0.5, 0.04, undefined, 8);
      for (let n = 0; n < 6; n++) {
        const a = (n / 6) * Math.PI * 2;
        b.sphere(0.12 + (n % 3) * 0.03, C.foam, Math.cos(a) * 0.22, 1.3 + (n % 2) * 0.12, Math.sin(a) * 0.22, [1, 0.8, 1], 6);
      }
      const spout = new THREE.Group();
      const mesh = b.mesh(toon);
      spout.add(mesh, outlineOf(mesh.geometry, inkThin));
      spout.scale.set(1, 0.01, 1);
      g.add(spout);
      g.position.set(f.x + ox, this.heightAt(f.x, f.z), f.z + oz);
      g.scale.setScalar(this.scale);
      this.root.add(g);
      this.whirls.push({ group: g, rings, spout, age: 0 });
      for (let n = 0; n < 4; n++) {
        this.addPuff(f.x + ox + (n - 1.5) * 0.15, this.heightAt(f.x, f.z) + 0.3, f.z + oz, n % 2 ? C.foam : 0x9fd4e8, 0.05 + n * 0.06, 0.7, 1.1);
      }
    }
  }

  /** Thêm hay bỏ vòng sáng dưới chân một người lính ta. */
  private syncAura(view: FighterView, on: boolean): void {
    if (on && !view.aura) {
      view.aura = new THREE.Mesh(auraGeo, auraMat);
      view.aura.position.y = 0.04;
      view.aura.renderOrder = 2;
      view.obj.add(view.aura);
    } else if (!on && view.aura) {
      view.aura.removeFromParent();
      view.aura = undefined;
    }
  }

  /** Thêm hay bỏ vòng sáng mai rùa dưới chân một người lính ta. */
  private syncShell(view: FighterView, on: boolean): void {
    if (on && !view.shell) {
      view.shell = new THREE.Mesh(shellGeo, shellMat);
      view.shell.position.y = 0.05;
      view.shell.renderOrder = 2;
      view.obj.add(view.shell);
    } else if (!on && view.shell) {
      view.shell.removeFromParent();
      view.shell = undefined;
    }
    if (view.shell) view.shell.rotation.y = this.time * 0.8;
  }

  /**
   * Nỏ thần: An Dương Vương chĩa nỏ lên trời, một mũi tên vàng vút lên rồi hóa mưa tên vàng
   * rơi xuống từng kẻ địch còn đứng trên bãi lúc ấy, lóe sáng chỗ trúng.
   */
  private volley(battle: Battle, seq: number, x: number, z: number): void {
    const { x: ox, z: oz } = this.offset;
    const hero = battle.fighters.find((f) => f.kind === 'anDuong');
    const view = hero && this.fighters.get(hero.id);
    if (view) view.volley = VOLLEY_AIM;
    const ground = this.heightAt(x, z);
    const from = new THREE.Vector3(x + ox, ground + 1.6 * this.scale, z + oz);
    const top = new THREE.Vector3(x + ox, ground + 8, z + oz);
    const rise = new THREE.Mesh(skyBoltGeo, goldMat);
    rise.position.copy(from);
    this.root.add(rise);
    this.arrows.push({ mesh: rise, from, to: top, age: 0, dur: VOLLEY_RISE, arc: 0 });
    const rand = seeded(seq * 131 + 7);
    for (const f of battle.fighters) {
      if (f.side === 'ta' || f.state === 'dead' || f.state === 'gone') continue;
      const h = this.heightAt(f.x, f.z);
      const to = new THREE.Vector3(f.x + ox, h + 0.45, f.z + oz);
      const start = new THREE.Vector3(f.x + ox + (rand() - 0.5) * 2, h + 7, f.z + oz + (rand() - 0.5) * 2);
      const mesh = new THREE.Mesh(boltGeo, goldMat);
      mesh.position.copy(start);
      mesh.visible = false;
      this.root.add(mesh);
      this.arrows.push({ mesh, from: start, to, age: 0, dur: 0.28, delay: VOLLEY_RISE + rand() * 0.3, arc: 0, flash: true });
    }
  }

  /** Rùa Vàng trồi lên cạnh An Dương Vương, kèm vòng sáng vàng lục loang ra. */
  private riseTurtle(battle: Battle, x: number, z: number): void {
    const { x: ox, z: oz } = this.offset;
    const hero = battle.fighters.find((f) => f.kind === 'anDuong');
    const face = hero?.face ?? 0;
    // Trồi lên bên cạnh, hơi lùi về sau tướng.
    const tx = x + Math.cos(face) * 1.4 - Math.sin(face) * 0.6;
    const tz = z - Math.sin(face) * 1.4 - Math.cos(face) * 0.6;
    const group = makeRuaVang();
    group.scale.setScalar(1.3 * this.scale);
    group.rotation.y = face;
    const base = this.heightAt(tx, tz);
    group.position.set(tx + ox, base - 1, tz + oz);
    this.root.add(group);
    this.turtles.push({ group, base, age: 0 });
    const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xd8e060, transparent: true, depthWrite: false }));
    mesh.position.set(x + ox, this.heightAt(x, z) + 0.08, z + oz);
    mesh.renderOrder = 3;
    this.root.add(mesh);
    this.rings.push({ mesh, age: 0 });
  }

  private dropWave(w: DrumWave): void {
    this.root.remove(w.mesh);
    (w.mesh.material as THREE.Material).dispose();
  }

  /** Đá Dời non: mọc nhanh lên quanh chân khi bị giữ chân, lún xuống khi hết. */
  private syncRocks(view: FighterView, stun: number, id: number, dt: number): void {
    if (stun > 0 && !view.rocks) {
      const group = rockSpikes(id * 31 + 7);
      group.scale.set(1, 0.01, 1);
      view.obj.add(group);
      view.rocks = { group, age: 0 };
    }
    if (!view.rocks) return;
    const r = view.rocks;
    r.age += dt;
    // Mọc vụt lên trong 0,2 giây, lún dần trong 0,3 giây cuối.
    r.group.scale.set(1, Math.max(0.01, Math.min(r.age / 0.2, 1) * Math.min(1, stun / 0.3)), 1);
    if (stun <= 0) {
      r.group.removeFromParent();
      view.rocks = undefined;
    }
  }

  private readEvents(battle: Battle): void {
    const { x: ox, z: oz } = this.offset;
    for (const e of battle.events) {
      if (e.seq <= this.lastSeq) continue;
      if (e.kind === 'shot' && e.tx !== undefined && e.tz !== undefined) {
        // Cá phun nước bắn tia nước, ma trơi phun cầu lửa xanh, An Dương Vương bắn tên đồng vàng, nỏ Triệu bắn tên sẫm.
        const mesh =
          e.by === 'caPhun'
            ? new THREE.Mesh(waterBallGeo, waterBallMat)
            : e.by === 'maTroi'
              ? new THREE.Mesh(ghostBallGeo, ghostBallMat)
              : e.by === 'anDuong'
                ? new THREE.Mesh(boltGeo, goldMat)
                : e.by === 'noTrieu'
                  ? new THREE.Mesh(darkBoltGeo, darkBoltMat)
                  : new THREE.Mesh(arrowGeo, arrowMat);
        const from = new THREE.Vector3(e.x + ox, this.heightAt(e.x, e.z) + 0.8, e.z + oz);
        const to = new THREE.Vector3(e.tx + ox, this.heightAt(e.tx, e.tz) + 0.5, e.tz + oz);
        mesh.position.copy(from);
        this.root.add(mesh);
        const fast = e.by === 'anDuong' || e.by === 'noTrieu';
        this.arrows.push({ mesh, from, to, age: 0, dur: Math.max(0.12, from.distanceTo(to) / (fast ? 18 : 12)), arc: fast ? 0.25 : 0.6, flash: e.by === 'anDuong' });
      }
      if (e.kind === 'volley') this.volley(battle, e.seq, e.x, e.z);
      if (e.kind === 'rocks') this.raiseCrags(battle, e.x, e.z, e.seq);
      if (e.kind === 'wave' && e.tx !== undefined && e.tz !== undefined) this.surge(battle, e.x, e.z, e.tx, e.tz, e.seq);
      if (e.kind === 'summon') this.summon(battle, e.x, e.z);
      if (e.kind === 'shield') this.riseTurtle(battle, e.x, e.z);
      if (e.kind === 'smash') {
        const hero = battle.fighters.find((f) => f.kind === 'giong');
        const view = hero && this.fighters.get(hero.id);
        if (view) view.smash = SMASH_TIME;
      }
      if (e.kind === 'hill' && e.tx !== undefined && e.tz !== undefined) {
        const group = hillModel();
        group.scale.multiplyScalar(this.geo);
        group.position.set(e.tx + ox, this.heightAt(e.tx, e.tz) + 7, e.tz + oz);
        group.rotation.y = e.seq;
        this.root.add(group);
        this.hills.push({ group, age: 0, landed: false });
      }
      if (e.kind === 'drown') {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this.addPuff(e.x + Math.cos(a) * 0.8 + ox, this.heightAt(e.x, e.z) + 0.3, e.z + Math.sin(a) * 0.8 + oz, i % 2 ? C.foam : 0x9fd4e8, i * 0.05, 0.8, 1.3);
        }
      }
      // Trống trận vẽ bằng sóng trống theo từng nhịp (xem syncRally), không cần vòng ở đây.
      if (e.kind === 'smash' || e.kind === 'rocks') {
        const color = e.kind === 'rocks' ? C.rock : C.bamboo;
        const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
        mesh.position.set(e.x + ox, this.heightAt(e.x, e.z) + 0.08, e.z + oz);
        mesh.renderOrder = 3;
        this.root.add(mesh);
        this.rings.push({ mesh, age: 0 });
      }
      if (e.kind === 'fire' && e.tx !== undefined && e.tz !== undefined) this.breatheFire(battle, e.seq, e.x, e.z, e.tx, e.tz);
      if (e.kind === 'smash') {
        const r = 1.6;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.addPuff(e.x + Math.cos(a) * r + ox, this.heightAt(e.x, e.z) + 0.2, e.z + Math.sin(a) * r + oz, C.earth, 0.05, 0.7, 1.6);
        }
      }
      if (e.kind === 'exhaust') this.addPuff(e.x + ox, this.heightAt(e.x, e.z) + 0.6, e.z + oz, C.smoke, 0, 1.2, 3);
    }
    this.lastSeq = battle.seq;
  }

  /**
   * Phun lửa: Gióng phi từ (x, z) tới (tx, tz), lửa phun từ mõm ngựa suốt lúc phi, để lại vệt đất cháy
   * dài đúng dải bị đốt, và giặc trong dải bốc cháy. Luật trận đã đặt Gióng ở chỗ mới; phần vẽ cho phi tới đó.
   */
  private breatheFire(battle: Battle, seq: number, x: number, z: number, tx: number, tz: number): void {
    const { x: ox, z: oz } = this.offset;
    const hero = battle.fighters.find((f) => f.kind === 'giong');
    const view = hero && this.fighters.get(hero.id);
    const len = Math.hypot(tx - x, tz - z);
    const face = len > 0.01 ? Math.atan2(tx - x, tz - z) : (hero?.face ?? 0);
    const dx = Math.sin(face);
    const dz = Math.cos(face);
    if (view) {
      view.dash = { fromX: x, fromZ: z, toX: tx, toZ: tz, age: 0 };
      view.obj.position.set(x + ox, 0, z + oz);
      view.obj.rotation.y = face;
      const group = new THREE.Group();
      // Mõm ngựa sắt trong khung của mô hình Gióng.
      group.position.set(0, 1.22, 1.02);
      const tongues = jetShapes.map((shape) => {
        const t = tongue(shape);
        t.rotation.set(shape.pitch, shape.yaw, 0);
        group.add(t);
        return t;
      });
      group.scale.setScalar(0.01);
      view.obj.add(group);
      this.jets.push({ group, tongues, age: 0 });
    }

    // Vệt đất cháy sém dọc dải bị đốt, vị trí từng vệt và than lấy theo hạt giống của sự kiện.
    const rand = seeded(seq * 7919 + 13);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2e2216, transparent: true, opacity: 0.6, depthWrite: false });
    const group = new THREE.Group();
    group.position.set(x + ox, 0.05, z + oz);
    group.rotation.y = face;
    group.scale.set(this.geo, 1, this.geo);
    const steps = Math.ceil(FIRE.length / 0.55);
    const blobs = new THREE.InstancedMesh(scorchGeo, mat, steps);
    for (let i = 0; i < steps; i++) {
      tmpPos.set((rand() - 0.5) * 0.5, 0, 0.2 + i * 0.55);
      tmpScale.set(FIRE.width * (0.32 + rand() * 0.14), 1, 0.45 + rand() * 0.25);
      blobs.setMatrixAt(i, tmpMatrix.compose(tmpPos, noTurn, tmpScale));
    }
    blobs.renderOrder = 1;
    const spots = Array.from({ length: EMBERS }, () => ({ x: (rand() - 0.5) * FIRE.width * 0.8, z: rand() * FIRE.length, phase: rand() * Math.PI * 2 }));
    const embers = new THREE.InstancedMesh(emberGeo, flameMats[1], EMBERS);
    group.add(blobs, embers);
    this.root.add(group);
    this.scorches.push({ group, mat, blobs, embers, spots, age: 0 });

    // Giặc đứng trong dải lửa (cùng phép đo với luật trận) bốc cháy một lúc.
    for (const f of battle.fighters) {
      if (f.side === 'ta') continue;
      const along = (f.x - x) * dx + (f.z - z) * dz;
      const across = Math.abs((f.x - x) * dz - (f.z - z) * dx);
      const target = this.fighters.get(f.id);
      if (!target || along < -0.3 || along > FIRE.length * this.geo || across > (FIRE.width * this.geo) / 2) continue;
      const fire = new THREE.Group();
      for (const shape of burnShapes) {
        const t = tongue(shape);
        t.position.set(shape.x, shape.y, 0);
        fire.add(t);
      }
      target.obj.add(fire);
      this.burns.push({ group: fire, age: 0 });
    }
  }

  private dropScorch(s: Scorch): void {
    this.root.remove(s.group);
    s.blobs.dispose();
    s.embers.dispose();
    s.mat.dispose();
  }

  private addPuff(x: number, y: number, z: number, color: number, delay: number, life: number, grow: number): void {
    const mesh = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(0.01);
    this.root.add(mesh);
    this.puffs.push({ mesh, age: 0, delay, life, grow });
  }

  private animate(dt: number): void {
    for (let i = this.crags.length - 1; i >= 0; i--) {
      const c = this.crags[i];
      c.age += dt;
      const sink = smoothstep(c.age, CRAG_HOLD, CRAG_LIFE);
      for (const sp of c.spikes) {
        // Trồi vụt lên, vượt đà một chút rồi đứng lại; về cuối thì lún xuống.
        const k = Math.min(Math.max((c.age - sp.delay) / CRAG_RISE, 0), 1);
        const back = 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
        const ground = sp.obj.userData.ground ?? (sp.obj.userData.ground = sp.obj.position.y + sp.h);
        sp.obj.position.y = (ground as number) - sp.h + sp.h * back - sp.h * 1.05 * sink;
      }
      c.crackMat.opacity = 0.7 * (1 - smoothstep(c.age, CRAG_HOLD * 0.8, CRAG_LIFE));
      if (c.age >= CRAG_LIFE) {
        this.dropCrag(c);
        this.crags.splice(i, 1);
      }
    }
    for (let i = this.surges.length - 1; i >= 0; i--) {
      const w = this.surges[i];
      w.age += dt;
      const k = Math.min(w.age / SURGE_RUN, 1);
      const run = 1 - (1 - k) ** 2;
      const px = lerp(w.fromX, w.toX, run);
      const pz = lerp(w.fromZ, w.toZ, run);
      w.group.position.set(px + this.offset.x, this.heightAt(px, pz), pz + this.offset.z);
      // Dâng cao lúc đầu, chạy, rồi đổ sụp xuống khi tới cuối dải.
      const grow = Math.min(w.age / 0.15, 1);
      const fall = smoothstep(w.age, SURGE_RUN, SURGE_LIFE);
      w.group.scale.set(1, Math.max(0.01, (0.3 + 0.7 * grow) * (1 - fall)), 1 + 0.4 * fall);
      if (w.age >= SURGE_LIFE) {
        this.root.remove(w.group);
        this.surges.splice(i, 1);
      }
    }
    for (let i = this.whirls.length - 1; i >= 0; i--) {
      const w = this.whirls[i];
      w.age += dt;
      const k = w.age / WHIRL_LIFE;
      w.rings.forEach((ring, n) => {
        ring.rotation.y -= dt * (6 + n * 3);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k);
        ring.scale.setScalar((1.6 - n * 0.45) * (1.2 - 0.5 * k));
      });
      // Cột nước vọt lên rất nhanh, đứng một chút rồi sụp xuống.
      const up = smoothstep(w.age, 0, 0.18) * (1 - smoothstep(w.age, 0.45, 0.85));
      w.spout.scale.set(1, Math.max(0.01, up), 1);
      w.spout.rotation.y += dt * 8;
      if (k >= 1) {
        this.root.remove(w.group);
        w.rings.forEach((ring) => (ring.material as THREE.Material).dispose());
        this.whirls.splice(i, 1);
      }
    }
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.age += dt;
      const k = Math.min(w.age / WAVE_LIFE, 1);
      // Loang nhanh lúc đầu rồi chậm dần, mờ đi khi ra xa.
      w.mesh.scale.setScalar(0.5 + (WAVE_RADIUS - 0.5) * (1 - (1 - k) ** 2));
      (w.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - k) ** 1.3;
      if (k >= 1) {
        this.dropWave(w);
        this.waves.splice(i, 1);
      }
    }
    for (let i = this.hills.length - 1; i >= 0; i--) {
      const h = this.hills[i];
      h.age += dt;
      const { x, z } = h.group.position;
      const ground = this.heightAt(x - this.offset.x, z - this.offset.z);
      if (h.age < HILL_FALL) {
        const k = h.age / HILL_FALL;
        h.group.position.y = ground + 7 * (1 - k * k);
      } else {
        if (!h.landed) {
          h.landed = true;
          // Đồi đập xuống: bụi đất tung lên quanh chân đồi.
          for (let n = 0; n < 10; n++) {
            const a = (n / 10) * Math.PI * 2;
            const r = HILL.radius * (h.group.scale.x || 1);
            this.addPuff(x + Math.cos(a) * r, ground + 0.2, z + Math.sin(a) * r, C.earth, 0, 0.8, 1.8);
          }
        }
        // Nằm lại một lúc rồi lún dần xuống đất.
        const sink = Math.max(0, (h.age - 1.2) / (HILL_LIFE - 1.2));
        h.group.position.y = ground - 1.8 * sink * sink;
      }
      if (h.age >= HILL_LIFE) {
        this.root.remove(h.group);
        this.hills.splice(i, 1);
      }
    }
    for (let i = this.jets.length - 1; i >= 0; i--) {
      const j = this.jets[i];
      j.age += dt;
      // Bùng lên rất nhanh, giữ suốt lúc phi, rồi co lại tắt.
      const size = j.age < 0.08 ? j.age / 0.08 : j.age < DASH_TIME ? 1 : 1 - (j.age - DASH_TIME) / (JET_LIFE - DASH_TIME);
      j.group.scale.setScalar(Math.max(size, 0.01));
      j.tongues.forEach((t, k) => {
        const flick = 0.8 + 0.35 * Math.abs(Math.sin(this.time * 22 + k * 1.7));
        t.scale.set(0.9 + 0.2 * Math.sin(this.time * 31 + k), 0.9 + 0.2 * Math.cos(this.time * 27 + k), flick);
      });
      if (j.age >= JET_LIFE) {
        j.group.removeFromParent();
        this.jets.splice(i, 1);
      }
    }
    for (let i = this.burns.length - 1; i >= 0; i--) {
      const b = this.burns[i];
      b.age += dt;
      const fade = Math.min(1, (BURN_LIFE - b.age) / 0.4);
      b.group.children.forEach((t, k) => t.scale.set(fade, fade * (0.7 + 0.5 * Math.abs(Math.sin(this.time * 18 + k * 2))), fade));
      if (b.age >= BURN_LIFE || !b.group.parent) {
        b.group.removeFromParent();
        this.burns.splice(i, 1);
      }
    }
    for (let i = this.scorches.length - 1; i >= 0; i--) {
      const s = this.scorches[i];
      s.age += dt;
      const k = s.age / SCORCH_LIFE;
      s.mat.opacity = 0.6 * Math.min(1, (1 - k) * 2.5);
      s.spots.forEach((p, n) => {
        const glow = Math.max(0, 1 - k * 1.4) * (0.6 + 0.4 * Math.abs(Math.sin(this.time * 6 + p.phase)));
        s.embers.setMatrixAt(n, tmpMatrix.compose(tmpPos.set(p.x, 0.04, p.z), noTurn, tmpScale.setScalar(Math.max(glow, 0.001))));
      });
      s.embers.instanceMatrix.needsUpdate = true;
      if (k >= 1) {
        this.dropScorch(s);
        this.scorches.splice(i, 1);
      }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      const k = (p.age - p.delay) / p.life;
      if (k < 0) continue;
      p.mesh.scale.setScalar(0.3 + k * p.grow);
      p.mesh.position.y += dt * 0.6;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k);
      if (k >= 1) {
        this.root.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.puffs.splice(i, 1);
      }
    }
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.age += dt;
      const t = a.age - (a.delay ?? 0);
      if (t < 0) continue;
      a.mesh.visible = true;
      const k = Math.min(t / a.dur, 1);
      const prev = a.mesh.position.clone();
      a.mesh.position.lerpVectors(a.from, a.to, k);
      a.mesh.position.y += Math.sin(Math.PI * k) * (a.arc ?? 0.6);
      const dir = a.mesh.position.clone().sub(prev);
      if (dir.lengthSq() < 1e-8) dir.subVectors(a.to, a.from);
      a.mesh.lookAt(a.mesh.position.clone().add(dir));
      if (k >= 1) {
        if (a.flash) this.addPuff(a.to.x, a.to.y, a.to.z, C.ember, 0, 0.35, 0.9);
        this.root.remove(a.mesh);
        this.arrows.splice(i, 1);
      }
    }
    for (let i = this.turtles.length - 1; i >= 0; i--) {
      const tu = this.turtles[i];
      tu.age += dt;
      // Trồi vụt lên, nằm lại nhấp nhô, rồi lặn dần xuống đất.
      const up = smoothstep(tu.age, 0, 0.5);
      const down = smoothstep(tu.age, TURTLE_LIFE - 0.8, TURTLE_LIFE);
      tu.group.position.y = tu.base - 1 + up * 1 - down * 1.3 + (up - down > 0.5 ? Math.sin(this.time * 3) * 0.05 : 0);
      if (tu.age >= TURTLE_LIFE) {
        this.root.remove(tu.group);
        this.turtles.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      const k = r.age / RING_LIFE;
      r.mesh.scale.setScalar(0.5 + k * 6);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
      if (k >= 1) {
        this.root.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        this.rings.splice(i, 1);
      }
    }
  }
}
