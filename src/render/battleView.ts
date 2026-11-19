// Vẽ lính hai bên của một trận vào một nhóm cho sẵn: dùng cho trận giữ kinh đô (trong cảnh kinh đô)
// và trận ngoài bãi (trong cảnh bãi chiến). Tọa độ trận cộng `offset` thành tọa độ trong nhóm.

import * as THREE from 'three';
import { heroSetups, type Battle, type Fighter, type FighterKind } from '../game/battle';
import { FIRE, HIEU_TRIEU, HILL, VOI_XUNG, LIEN_CHAU, MA_VIEN_VOLLEY, RALLY_BEAT, ROCKS, SKILLS, SMASH, SWIMMERS, TT_WAVE, type NuTuongId, type UnitType } from '../game/defs';
import { isBeast, makeBeast, makeRuaVang } from './beasts';
import { isMonster, makeMonster } from './monsters';
import { makeAnDuong, makeBaTrieu, makeCaoLo, makeGiong, makeNuTuong, makeSonTinh, makeThuyTinh, makeTrungNhi, makeTrungTrac } from './heroes';
import { LAU_THUYEN_SINK, makeEnemyBoat, makeFighter, makeMountain } from './models';
import { C } from './palette';
import type { Poser } from './rig';
import { ShapeBuilder, disposeModel, seeded } from './shapes';
import { isSoldier, makeSoldier } from './soldier';
import { drumWaveTex, inkThin, outlineOf, toon } from './toon';
import { HieuUng } from './hieuUng';
import { taoDoi, type DoiRoi } from './bocDoi';
import { daGiu, dungNon, type NonDung } from './doiNon';

interface FighterView {
  obj: THREE.Group;
  deadAge: number;
  /** Gióng bay về trời: đã bay được bao lâu. */
  rise: number;
  /** Gióng đang quét tre một vòng (Nhổ tre): còn bao lâu. */
  smash: number;
  /** Gióng đang phi ngựa dọc đường lao (Phun lửa), tọa độ trận. */
  dash?: { fromX: number; fromZ: number; toX: number; toZ: number; age: number };
  /** Đá Dời non mọc quanh chân tên giặc đang bị giữ chân. */
  rocks?: { stone: ReturnType<typeof daGiu>; age: number };
  /** Núi Tản Viên dâng lên dưới chân Sơn Tinh khi Thủy Tinh rút quân; Rùa Vàng nâng An Dương Vương khi Triệu Đà thua chạy. */
  peak?: THREE.Group;
  /** Vòng sáng đồng dưới chân lính ta khi có Trống trận, đập theo nhịp trống. */
  aura?: THREE.Mesh;
  /** Vòng sáng hình mai rùa dưới chân lính ta khi Rùa Vàng che chở. */
  shell?: THREE.Mesh;
  /** Đấu thành: vòng màu dưới chân để biết phe (hai bên cùng là lính ta): đồng là quân đánh thành, đỏ son là quân giữ thành. */
  team?: THREE.Mesh;
  /** An Dương Vương đang chĩa nỏ thần lên trời: còn bao lâu. */
  volley: number;
  /** Đang làm phép (Sơn Tinh dời non, Thủy Tinh hô sóng hay gọi thủy quái): còn bao lâu. */
  cast?: number;
  /** Tôm binh Thủy Tinh vừa gọi lên: còn bao lâu mới trồi hẳn khỏi nước. */
  emerge?: number;
  /** Vũng nước bọt trắng dưới chân lính ta đang đi chậm vì trúng sóng Thủy Tinh. */
  wet?: THREE.Group;
  /** Nhân vật có khung xương: đi, đánh, ngã bằng cách xoay xương thay vì nhún và ngả cả thân. */
  pose?: Poser;
  /** An Dương Vương chĩa nỏ lên trời (bắn nỏ thần), Cao Lỗ ngẩng nỏ bắn liên châu: 0..1, đổi dần cho mượt. */
  lift?: number;
  /** Cao Lỗ đang thổi tù và ra Lệnh bắn: còn bao lâu. */
  horn?: number;
  /** Vòng sáng Lệnh bắn dưới chân lính nỏ. */
  order?: THREE.Mesh;
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

/** Sóng trống: hoa văn mặt trống đồng loang ra trên mặt đất mỗi nhịp trống. */
interface DrumWave {
  mesh: THREE.Mesh;
  age: number;
}

/** Quả đồi Sơn Tinh ném xuống: rơi từ trên cao, đập xuống đất rồi lún dần hay tan (`bocDoi.ts`). */
interface Hill {
  doi: DoiRoi;
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
  /** Loang tới bán kính này (ô); không có thì như cũ, chừng 6,5 ô. */
  size?: number;
}

const SCALE: Partial<Record<FighterKind, number>> = {
  // Lâu thuyền dựng đúng cỡ ô kinh đô (dài chừng 4 ô); Mã Viện trên ngựa nhỉnh hơn Triệu Đà.
  lauThuyen: 1,
  maVien: 0.9,
  lucDan: 0.9,
  tranBaTien: 0.9,
  duongTuHuc: 0.9,
  hoangThao: 0.9,
  quachQuy: 0.9,
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
  caoLo: 1.05,
  tuongThuy: 1,
  hoTinh: 0.75,
  lonRung: 0.75,
  baoGam: 0.72,
  gauNgua: 0.78,
  voiRung: 0.75,
  trauRung: 0.78,
  soiDo: 0.8,
  teGiac: 0.8,
  raiCa: 0.8,
  ruaBien: 0.7,
  naiRung: 0.8,
  boTot: 0.8,
  tranGam: 0.9,
  ranHo: 0.85,
  cuaDa: 0.8,
  gaTrang: 1.05,
  kyBinh: 0.75,
  trieuDa: 0.85,
  // Hai Bà trên voi trận cỡ như voi chiến (voi trận đã to hơn voi chiến một phần ba); Tô Định nhỉnh hơn lính.
  trungTrac: 0.75,
  trungNhi: 0.75,
  baTrieu: 0.75,
  toDinh: 1,
};
/** Thứ đi dưới nước: lâu thuyền, lính còn trên thuyền, thủy quái. Qua ô cầu thì đi dưới gầm, không lên mặt cầu. */
const inWater = (f: Fighter): boolean => f.kind === 'lauThuyen' || f.state === 'aboard' || (SWIMMERS as readonly FighterKind[]).includes(f.kind);
/** Nữ tướng phó tướng đứng sau hàng hậu: cỡ như tướng đi bộ, nhỏ hơn Hai Bà trên voi. */
const NU_SCALE = 0.95;
/** Nỏ thần: mũi tên vàng bay vút lên trong chừng này giây, rồi hóa mưa tên rơi xuống từng tên giặc. */
const VOLLEY_RISE = 0.3;
const VOLLEY_AIM = 0.9;
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
/** Sóng Thủy Tinh chạy hết dải trong chừng này giây, rồi đổ sụp tới SURGE_LIFE. */
const SURGE_RUN = 0.6;
const SURGE_LIFE = 1.0;
const WHIRL_LIFE = 1.1;
/** Động tác làm phép của Sơn Tinh và Thủy Tinh kéo dài chừng này giây. */
const CAST_TIME = 0.8;
/**
 * Tướng cưỡi voi trận làm kỹ năng lâu hơn: voi chồm lên rống rồi mới lao (Voi xung trận), rút cờ phất ba vòng rồi cắm
 * lại (Hiệu triệu), voi lao tới rồi Bà Triệu mới chém (Chém cá kình).
 */
const BA_CAST_TIME = 1.2;
/** Độ cao trận dưới sông nằm dưới mặt nước chừng này (cho thủy quái lặn): lâu thuyền nhấc lên cho nổi. */
const SHIP_FLOAT = 0.3;
/** Lâu thuyền nghiêng rồi chìm hẳn trong chừng này giây. */
const SHIP_SINK = LAU_THUYEN_SINK;
/** Mũi nỏ từ lâu thuyền bay ra từ các tầng lầu, cao hơn mặt nước chừng này. */
const SHIP_SHOT_Y = 1.0;
/** Mã Viện giơ đao, phất cờ lệnh (Lệnh nỏ) trong chừng này giây: tên rơi lúc cờ đang phất lượt hai. */
const MA_VIEN_CAST = 1.2;
/** Tướng cưỡi voi trận: Hai Bà, Bà Triệu. */
const isVoiTuong = (k: FighterKind) => k === 'trungTrac' || k === 'trungNhi' || k === 'baTrieu';
const castTime = (k: FighterKind) => (isVoiTuong(k) ? BA_CAST_TIME : k === 'maVien' ? MA_VIEN_CAST : CAST_TIME);
/** Chém cá kình: voi lao trong khúc này của kỹ năng (khớp `poseBaTrieu` ở heroes.ts), rồi Bà mới chém. */
const CHEM_RUN: [number, number] = [0.1, 0.6];
/** Tôm binh trồi khỏi nước trong chừng này giây. */
const EMERGE_TIME = 0.5;
const rainGeo = new THREE.BoxGeometry(0.03, 0.03, 0.55);
const rainMat = new THREE.MeshBasicMaterial({ color: C.rain, transparent: true, opacity: 0.8 });
const wetGeo = new THREE.CircleGeometry(0.46, 16).rotateX(-Math.PI / 2);
const wetMat = new THREE.MeshBasicMaterial({ color: 0x4f9fc0, transparent: true, opacity: 0.55, depthWrite: false });
const foamDotGeo = new THREE.SphereGeometry(0.07, 6, 5);
const foamMat = new THREE.MeshBasicMaterial({ color: C.foam });
const whirlGeo = new THREE.RingGeometry(0.25, 0.42, 20, 1, 0, Math.PI * 1.5).rotateX(-Math.PI / 2);

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

const puffGeo = new THREE.SphereGeometry(0.3, 10, 8);
const arrowGeo = new THREE.BoxGeometry(0.03, 0.03, 0.45);
const arrowMat = new THREE.MeshBasicMaterial({ color: C.arrow });
/** Tên đồng của Cao Lỗ (đòn thường và Nỏ liên châu). */
const bronzeBoltGeo = new THREE.BoxGeometry(0.05, 0.05, 0.6);
const bronzeBoltMat = new THREE.MeshBasicMaterial({ color: C.bronzeLight });
/** Lệnh bắn: vòng sáng đỏ đồng dưới chân lính nỏ trong lúc có lệnh. Dùng chung một chất liệu, nhấp nháy theo nhịp. */
const orderGeo = new THREE.RingGeometry(0.22, 0.36, 4).rotateX(-Math.PI / 2);
/** Đấu thành: vòng tròn đặc dưới chân, đồng cho quân đánh thành, đỏ son cho quân giữ thành. */
const teamGeo = new THREE.RingGeometry(0.2, 0.42, 20).rotateX(-Math.PI / 2);
const teamMat: Record<'ta' | 'giac', THREE.MeshBasicMaterial> = {
  ta: new THREE.MeshBasicMaterial({ color: C.bronzeLight, transparent: true, opacity: 0.85, depthWrite: false }),
  giac: new THREE.MeshBasicMaterial({ color: C.red, transparent: true, opacity: 0.85, depthWrite: false }),
};
const orderMat = new THREE.MeshBasicMaterial({ color: C.red, transparent: true, opacity: 0.75, depthWrite: false });
/** Nỏ liên châu: số mũi tên rơi xuống vùng trúng, và chừng này giây sau khi bắn mới rơi. */
const RAIN_ARROWS = 18;
const RAIN_RISE = 0.25;
const ringGeo = new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2);
const RING_LIFE = 1.1;
/** Phun lửa: ngựa sắt phi hết đường lao trong chừng này giây; lửa phun suốt lúc phi rồi tắt dần. */
const DASH_TIME = 0.4;
const JET_LIFE = 0.75;
const SCORCH_LIFE = 4;
const BURN_LIFE = 2;

// Lửa và than hồng không nhận ánh sáng nên luôn rực, kể cả khi nằm trong bóng.
const flameMats = [C.fire, C.ember, 0xfff0a0].map((color) => new THREE.MeshBasicMaterial({ color }));

const scorchGeo = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2);
const emberGeo = new THREE.OctahedronGeometry(0.07, 0);
const EMBERS = 16;
const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const noTurn = new THREE.Quaternion();

/** Nhổ tre: thời gian cả động tác, từ lấy đà tới giơ tre lên lại. */
const SMASH_TIME = 0.9;
/** Cao Lỗ thổi tù và (Lệnh bắn) trong chừng này giây. */
const HORN_TIME = 1.1;
const { lerp, smoothstep } = THREE.MathUtils;

export class BattleView {
  private readonly fighters = new Map<number, FighterView>();
  /** Thuyền giặc của thủy binh Triệu, theo thứ tự trong `Battle.boats`. */
  private readonly boats: THREE.Group[] = [];
  private readonly arrows: Arrow[] = [];
  private readonly rings: Ring[] = [];
  private readonly puffs: Puff[] = [];
  private readonly scorches: Scorch[] = [];
  private readonly hills: Hill[] = [];
  private readonly waves: DrumWave[] = [];
  private readonly nons: NonDung[] = [];
  private readonly surges: Surge[] = [];
  private readonly whirls: Whirl[] = [];
  /** Nhịp trống đã tỏa sóng gần nhất của Trống trận đang đánh, −1 khi không có. */
  private rallyBeat = -1;
  private battleId = -1;
  private lastSeq = 0;
  private time = 0;

  /**
   * `scale`: phóng to lính so với cỡ trong kinh đô (bãi chiến nhìn gần hơn cần lính to hơn).
   * `heightAt`: chỗ đứng (độ cao) tại tọa độ trận, cho kinh đô có đất bậc thang, nước lũ và cầu qua sông. `wet`: thứ đi
   *   dưới nước (thuyền, lính còn trên thuyền, thủy quái), dưới gầm cầu thì vẫn ở mặt sông chứ không lên mặt cầu.
   * `drumAt`: mặt trống của Lạc tướng (tọa độ trận), nơi sóng trống tỏa ra. Không có thì sóng tỏa từ giữa quân ta.
   */
  constructor(
    private readonly root: THREE.Object3D,
    private readonly offset: { x: number; z: number },
    private readonly scale = 1,
    private readonly heightAt: (x: number, z: number, wet?: boolean, wall?: boolean) => number = () => 0,
    private readonly drumAt?: { x: number; z: number },
  ) {
    this.hu = new HieuUng(root);
  }

  /** Hiệu ứng kỹ năng tướng dùng chung (sóng, lóe, tia, cột sáng, vệt chém...). */
  private readonly hu: HieuUng;

  /** Điểm (x, z) của trận ra tọa độ trong nhóm, nhấc lên `dy` khỏi mặt đất. */
  private at(x: number, z: number, dy = 0): THREE.Vector3 {
    return new THREE.Vector3(x + this.offset.x, this.heightAt(x, z) + dy, z + this.offset.z);
  }

  /** Gọi mỗi khung hình với trận đang diễn ra, hoặc null khi không có trận. */
  /** Hệ số hình học của trận đang vẽ (`Battle.geo`): ở kinh đô, vùng kỹ năng rộng hơn theo độ giãn của kinh đô. */
  private geo = 1;
  /** Chỗ Hai Bà quay nhìn về khi thắng kết chương 5 (sông Hát sau lưng quân ta ở Cấm Khê), tọa độ trận. */
  winLook?: { x: number; z: number };
  /** Nữ tướng đi theo làm phó tướng (trận ngoài bãi): mô hình, chỗ khung trước, đà thắng trận. */
  private nu: { obj: THREE.Group; kind: NuTuongId; x: number; z: number; win: number } | null = null;

  update(battle: Battle | null, dt: number): void {
    this.geo = battle?.geo ?? 1;
    this.time += dt;
    if (!battle || battle.id !== this.battleId) {
      this.clear();
      this.battleId = battle ? battle.id : -1;
    }
    if (battle) {
      this.syncBoats(battle);
      this.syncFighters(battle, dt);
      this.syncNu(battle, dt);
      this.readEvents(battle);
      this.syncRally(battle);
      shellMat.opacity = 0.75 * Math.min(1, battle.shield / 0.8);
      orderMat.opacity = (0.45 + 0.35 * Math.abs(Math.sin(this.time * 9))) * Math.min(1, (battle.lenh ?? 0) / 0.6);
    }
    this.animate(dt);
  }

  /**
   * Nữ tướng phó tướng đứng cầm cờ sau hàng hậu, mặt quay về phía giặc: đi theo khi quân ta tiến lên, đứng thì phất cờ
   * hô quân; thắng trận thì giơ cờ lên trời. Không phải người đánh nên không có thanh máu, không ngã.
   */
  private syncNu(battle: Battle, dt: number): void {
    const nu = battle.nuTuong;
    if (!nu) return;
    if (!this.nu || this.nu.kind !== nu.kind) {
      if (this.nu) {
        this.root.remove(this.nu.obj);
        disposeModel(this.nu.obj);
      }
      const obj = makeNuTuong(nu.kind);
      obj.scale.setScalar(NU_SCALE * this.scale);
      this.root.add(obj);
      this.nu = { obj, kind: nu.kind, x: nu.x, z: nu.z, win: 0 };
    }
    const v = this.nu;
    const moved = Math.hypot(nu.x - v.x, nu.z - v.z);
    v.x = nu.x;
    v.z = nu.z;
    const [ox, oz] = [this.offset.x, this.offset.z];
    v.obj.position.set(nu.x + ox, this.heightAt(nu.x, nu.z), nu.z + oz);
    // Quân ta ở phía z lớn, giặc ở phía z nhỏ.
    v.obj.rotation.y = Math.PI;
    const pose = v.obj.userData.pose as Poser | undefined;
    if (battle.outcome === 'win') {
      v.win = Math.min(1, v.win + dt * 1.5);
      pose?.({ act: 'stand', win: v.win, time: this.time });
    } else if (moved > 0.002 && dt > 0) {
      pose?.({ act: 'walk', phase: this.time * 7, stride: 0.45, time: this.time });
    } else {
      pose?.({ act: battle.outcome ? 'stand' : 'fight', time: this.time });
    }
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
    // Mỗi nhịp một sóng đồng sáng từ mặt trống; nhịp đầu bừng cột sáng, tia đồng tóe lên.
    const s = this.scale;
    const c = this.at(at.x, at.z);
    this.hu.soc(c, { mau: C.fxVang, r: 3.2 * s, life: 0.5 });
    // Quân ta cũng thấy nhịp trống: vòng đồng mảnh bừng quanh giữa đám quân ta.
    const allies = battle.fighters.filter((f) => f.side === 'ta' && f.state !== 'dead' && f.state !== 'gone');
    if (allies.length && this.drumAt) {
      const mx = allies.reduce((n, f) => n + f.x, 0) / allies.length;
      const mz = allies.reduce((n, f) => n + f.z, 0) / allies.length;
      this.hu.soc(this.at(mx, mz), { mau: C.fxVang, r: 4.5 * s * this.geo, life: 0.45, loi: false });
    }
    if (beat === 0) {
      this.hu.cot(c, { mau: C.fxVang, r: 0.6 * s, h: 4 * s, life: 0.9, sang: 0.7 });
      this.hu.loe(this.at(at.x, at.z, 1 * s), { mau: C.fxVang, size: 2.6 * s, life: 0.4 });
      this.hu.tia(this.at(at.x, at.z, 0.8 * s), { mau: C.fxVang, n: 18, toc: 8, len: 0.5, up: 1, life: 0.6 });
      for (const f of battle.fighters) {
        if (f.side !== 'ta' || f.state === 'dead' || f.state === 'gone' || f.kind === 'lauThuyen') continue;
        this.hu.hat(this.at(f.x, f.z), { mau: C.fxVang, n: 2, r: 0.25, h: 1.6 * s, size: 0.2, delay: 0.1 + (f.id % 6) * 0.04, life: 0.8 });
      }
    }
  }

  private clear(): void {
    if (this.nu) {
      this.root.remove(this.nu.obj);
      disposeModel(this.nu.obj);
      this.nu = null;
    }
    for (const b of this.boats) this.root.remove(b);
    this.boats.length = 0;
    // Hiệu ứng gắn trên người (lửa cháy, sao choáng) gỡ trước khi giải phóng hình của lính.
    this.hu.clear();
    for (const v of this.fighters.values()) {
      this.root.remove(v.obj);
      if (v.peak) this.root.remove(v.peak);
      v.obj.traverse((o) => {
        // Khung xương có ảnh xương riêng trên GPU, trả cùng với hình.
        if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
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
    for (const h of this.hills) {
      this.root.remove(h.doi.group);
      disposeModel(h.doi.group);
      h.doi.drop?.();
    }
    this.hills.length = 0;
    for (const w of this.waves) this.dropWave(w);
    this.waves.length = 0;
    for (const n of this.nons) {
      n.group.removeFromParent();
      n.drop();
    }
    this.nons.length = 0;
    for (const w of this.surges) this.root.remove(w.group);
    this.surges.length = 0;
    for (const w of this.whirls) this.root.remove(w.group);
    this.whirls.length = 0;
    this.hu.clear();
    this.rallyBeat = -1;
    this.lastSeq = 0;
  }

  /**
   * Thuyền chở lính (thuyền đen buồm đỏ của thủy binh Triệu, thuyền mạn đỏ son của thủy quân Hán): chèo từ mép sông xa vào bờ, mũi hướng vào bờ, nhấp nhô theo sóng,
   * cập bờ thì neo tới hết trận.
   */
  private syncBoats(battle: Battle): void {
    const { x: ox, z: oz } = this.offset;
    battle.boats.forEach((b, i) => {
      let obj = this.boats[i];
      if (!obj) {
        obj = makeEnemyBoat(battle.foe === 'thuyHan' ? 'han' : 'trieu');
        obj.scale.setScalar(0.9 * this.scale);
        obj.rotation.y = battle.side === 'dong' ? -Math.PI / 2 : Math.PI;
        this.root.add(obj);
        this.boats[i] = obj;
      }
      obj.position.set(b.x + ox, this.heightAt(b.x, b.z, true) + 0.26 + Math.sin(this.time * 2.4 + i) * 0.03, b.z + oz);
    });
  }

  private syncFighters(battle: Battle, dt: number): void {
    const { x: ox, z: oz } = this.offset;
    // Người đã bị dọn khỏi trận (quái dã ngoại chết lâu, `daNgoaiTran.ts`): gỡ hình.
    if (this.fighters.size > battle.fighters.length || battle.da) {
      const ids = new Set(battle.fighters.map((f) => f.id));
      for (const [id, view] of this.fighters) {
        if (ids.has(id)) continue;
        this.root.remove(view.obj);
        if (view.peak) this.root.remove(view.peak);
        view.obj.traverse((o) => {
          if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
        this.fighters.delete(id);
      }
    }
    const hasRocks = heroSetups(battle).some((h) => h.kind === 'sonTinh');
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
        const glow = heroSetups(battle).find((h) => h.kind === f.kind)?.glow;
        // Tướng mặc đủ bốn món bộ mình (cả tướng giữ thành trong Đấu thành): vũ khí ánh lên.
        const anh = !!f.trangBi?.bo4;
        const obj =
          f.kind === 'baTrieu'
            ? makeBaTrieu({ anh })
            : f.kind === 'trungTrac'
            ? makeTrungTrac({ glow, anh })
            : f.kind === 'trungNhi'
              ? makeTrungNhi({ glow, anh })
              : f.kind === 'giong'
            ? makeGiong('trangSi', { bamboo: battle.hero?.bamboo, glow: battle.hero?.glow, anh })
            : f.kind === 'sonTinh'
              ? makeSonTinh({ glow: battle.hero?.glow, anh })
              : f.kind === 'anDuong'
                ? makeAnDuong({ crossbow: true, glow: battle.hero?.glow, anh })
                : f.kind === 'caoLo'
                  ? makeCaoLo({ glow: battle.hero?.glow, anh })
                  : f.kind === 'thuyTinh'
                  ? makeThuyTinh()
                  : isSoldier(f.kind)
                  ? makeSoldier(f.kind, f.side === 'ta' ? (battle.arms?.[f.kind as UnitType] ?? 0) : 0)
                  : isBeast(f.kind)
                    ? makeBeast(f.kind, f.side === 'ta' ? (battle.arms?.[f.kind as UnitType] ?? 0) : 0)
                    : isMonster(f.kind)
                      ? makeMonster(f.kind)
                      : makeFighter(f.kind, f.side === 'ta' ? (battle.arms?.[f.kind as UnitType] ?? 0) : 0);
        // Lâu thuyền không phóng theo cỡ lính của trận.
        obj.scale.setScalar(f.kind === 'lauThuyen' ? SCALE.lauThuyen! : (SCALE[f.kind] ?? 0.8) * this.scale);
        this.root.add(obj);
        view = { obj, deadAge: 0, rise: 0, smash: 0, volley: 0, pose: obj.userData.pose };
        this.fighters.set(f.id, view);
      }
      const obj = view.obj;
      obj.position.x = f.x + ox;
      obj.position.z = f.z + oz;
      obj.rotation.y = f.face;
      const base = this.heightAt(f.x, f.z, inWater(f), f.wall);
      // Chỉ Dời non mới mọc đá; giặc choáng vì Voi xung trận thì không.
      this.syncRocks(view, hasRocks ? (f.stun ?? 0) : 0, f.id, dt);
      this.syncAura(view, f.side === 'ta' && f.state !== 'dead' && battle.rally > 0 && !battle.outcome);
      this.syncTeam(view, battle.mode === 'pvp' && f.state !== 'dead' ? f.side : null);
      this.syncShell(view, f.side === 'ta' && f.state !== 'dead' && battle.shield > 0 && !battle.outcome);
      this.syncOrder(view, f.kind === 'no' && f.state !== 'dead' && (battle.lenh ?? 0) > 0 && !battle.outcome);
      if (f.kind === 'lauThuyen') {
        this.poseShip(view, f, base, dt);
        continue;
      }
      if (f.state === 'dead') {
        view.deadAge += dt;
        // Người ngã ngửa; thú lăn nghiêng; ma trơi không ngả, chỉ tắt dần (theo tư thế ngã).
        const fall = Math.min(view.deadAge * 4, Math.PI / 2);
        if (obj.userData.fall === 'side') obj.rotation.z = -fall;
        else if (obj.userData.fall !== 'none') obj.rotation.x = -fall;
        obj.position.y = base + (view.deadAge > 1.2 ? -(view.deadAge - 1.2) * 0.6 : 0);
        view.pose?.({ act: 'dead', fall: Math.min(view.deadAge * 3, 1) });
        if (view.deadAge > 2.5) obj.visible = false;
        continue;
      }
      if (f.kind === 'sonTinh') {
        spinHalo(obj, this.time);
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
          // Giơ cao gậy thần.
          view.pose?.({ act: 'stand', win: Math.min(view.rise, 1), time: this.time });
          continue;
        }
      }
      if (f.kind === 'anDuong') {
        spinHalo(obj, this.time);
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
          view.pose?.({ act: 'stand', win: Math.min(view.rise * 2, 1), time: this.time });
          continue;
        }
        view.volley = Math.max(0, view.volley - dt);
        // Bắn nỏ thần thì chĩa nỏ lên trời (đổi dần); ra đòn thì nâng nỏ ngắm, nghỉ thì hạ (theo tư thế).
        const goal = view.volley > 0 ? 1 : 0;
        view.lift = (view.lift ?? 0) + (goal - (view.lift ?? 0)) * Math.min(1, dt * 14);
      }
      if (f.kind === 'caoLo') {
        spinHalo(obj, this.time);
        // Nỏ liên châu và tù và Lệnh bắn: tư thế chạy theo thời gian còn lại (0 → 1).
        view.volley = Math.max(0, view.volley - dt);
        view.lift = view.volley > 0 ? 1 - view.volley / VOLLEY_AIM : undefined;
        view.horn = Math.max(0, (view.horn ?? 0) - dt);
        if (battle.seaWin && battle.outcome === 'win') {
          view.rise += dt;
          view.pose?.({ act: 'stand', win: Math.min(view.rise * 2, 1), time: this.time });
          obj.rotation.x = 0;
          continue;
        }
      }
      if (f.kind === 'giong') {
        spinHalo(obj, this.time);
        if (battle.ascend && battle.outcome === 'win') {
          // Phá xong giặc, Gióng cưỡi ngựa phi bay lên trời.
          view.rise += dt;
          obj.position.y = base + view.rise * view.rise * 0.8;
          obj.rotation.y = f.face + view.rise * 0.6;
          obj.rotation.x = -0.35;
          view.pose?.({ act: 'walk', phase: this.time * 20, stride: 0.8, time: this.time });
          continue;
        }
        view.smash = Math.max(0, view.smash - dt);
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
          view.pose?.({ act: 'walk', phase: d.age * 26, stride: 0.85, time: this.time });
          if (d.age >= DASH_TIME) view.dash = undefined;
          continue;
        }
      }
      if (isVoiTuong(f.kind)) {
        spinHalo(obj, this.time);
        if (battle.outcome === 'win') {
          // Thắng trận: Trưng Trắc giơ gươm, Trưng Nhị phất cờ, hai voi giơ vòi. Thắng màn 40 thì hai bà quay nhìn về
          // phía sông Hát.
          view.rise += dt;
          obj.position.y = base;
          obj.rotation.x = 0;
          if (battle.hatWin && this.winLook) obj.rotation.y = Math.atan2(this.winLook.x - f.x, this.winLook.z - f.z);
          view.pose?.({ act: 'stand', win: Math.min(view.rise * 1.5, 1), time: this.time + f.id });
          continue;
        }
        if (view.dash) {
          // Voi xung trận: voi chồm lên rống, rồi lao dọc đường xung (luật trận đã đặt bà ở cuối đường).
          const d = view.dash;
          d.age += dt;
          const k = Math.min(d.age / BA_CAST_TIME, 1);
          const run = f.kind === 'baTrieu' ? THREE.MathUtils.smoothstep(k, ...CHEM_RUN) : THREE.MathUtils.smoothstep(k, 0.28, 0.95);
          const x = lerp(d.fromX, d.toX, run);
          const z = lerp(d.fromZ, d.toZ, run);
          obj.position.set(x + ox, this.heightAt(x, z), z + oz);
          if (Math.hypot(d.toX - d.fromX, d.toZ - d.fromZ) > 0.01) obj.rotation.y = Math.atan2(d.toX - d.fromX, d.toZ - d.fromZ);
          obj.rotation.x = 0;
          view.pose?.({ act: 'stand', time: this.time + f.id, skill: k });
          if (k >= 1) view.dash = undefined;
          continue;
        }
      }
      if (f.state === 'aboard') {
        // Thủy binh còn trên thuyền: đứng trên sàn thuyền, nhấp nhô theo thuyền.
        const boat = f.boat !== undefined ? battle.boats[f.boat] : undefined;
        obj.position.y = this.heightAt(f.x, f.z, true) + 0.26 + 0.2 * this.scale + (boat ? Math.sin(this.time * 2.4 + f.boat!) * 0.03 : 0);
        obj.rotation.x = 0;
        continue;
      }
      // Gióng ra đòn bằng tay vũ khí, ngựa chỉ chồm nhẹ khi quét tre; nhân vật có xương tự làm động tác.
      if (f.kind === 'giong') obj.rotation.x = view.smash > 0 ? -0.2 * Math.sin(Math.PI * (1 - view.smash / SMASH_TIME)) : 0;
      else if (f.kind === 'sonTinh' || f.kind === 'anDuong' || f.kind === 'caoLo' || view.pose) obj.rotation.x = 0;
      else obj.rotation.x = f.swing > 0 ? -0.5 * (f.swing / 0.3) : 0;
      // Đang có Trống trận thì quân ta nhún nhảy hăng hơn; trúng sóng Thủy Tinh thì lội nước, nhún ít.
      const rally = f.side === 'ta' && battle.rally > 0;
      const hop = rally ? 0.12 : 0.06;
      const wading = (f.slow ?? 0) > 0;
      const moving = f.state === 'move' && !f.stun;
      if (view.pose) {
        // Nhân vật có xương tự bước, tự ra đòn. Trống trận thì bước dài và nảy theo nhịp; lội nước thì bước ngắn
        // và chậm; giặc cướp được của thì chạy.
        const flee = f.state === 'flee' && !f.stun;
        const walking = moving || flee;
        const phase = this.time * (wading ? 6 : rally || flee ? 13 : 11) + f.id;
        obj.position.y = base + (walking && rally ? Math.abs(Math.sin(phase)) * 0.05 : 0);
        const time = this.time + f.id;
        // Kỹ năng riêng của tướng: Gióng quét tre, Sơn Tinh dời non, Thủy Tinh hô mưa, An Dương Vương nỏ thần.
        const skill =
          f.kind === 'giong'
            ? view.smash > 0
              ? 1 - view.smash / SMASH_TIME
              : undefined
            : f.kind === 'anDuong' || f.kind === 'caoLo'
              ? view.lift
              : view.cast && view.cast > 0
                ? 1 - view.cast / castTime(f.kind)
                : undefined;
        // Cao Lỗ thổi tù và ra Lệnh bắn.
        const horn = view.horn && view.horn > 0 ? 1 - view.horn / HORN_TIME : undefined;
        // Tô Định bỏ chạy thì rơi mũ, ôm ấn (kể cả lúc bị choáng giữa đường chạy).
        const fled = f.state === 'flee' || undefined;
        view.pose(
          walking
            ? { act: 'walk', phase, stride: wading ? 0.3 : rally || flee ? 0.65 : 0.5, time, skill, horn, flee: fled }
            : f.state === 'fight'
              ? { act: 'fight', strike: f.swing > 0 ? 1 - f.swing / 0.3 : undefined, time, skill, horn }
              : { act: 'stand', time, skill, horn, flee: fled },
        );
      } else obj.position.y = base + (moving ? Math.abs(Math.sin(this.time * (wading ? 5 : 10) + f.id)) * hop : 0);
      this.syncWet(view, f.side === 'ta' && wading && !battle.outcome);
      if (view.cast && view.cast > 0) {
        view.cast = Math.max(0, view.cast - dt);
        const k = 1 - view.cast / castTime(f.kind);
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

  /**
   * Lâu thuyền nổi trên mặt sông (độ cao trận ở sông là dưới mặt nước `SHIP_FLOAT`), nhấp nhô; chèo thì khua mái
   * chèo, bắn thì lính nỏ trên lầu giật nỏ; bị đánh chìm thì nghiêng dần rồi chìm hẳn trong `SHIP_SINK` giây.
   */
  private poseShip(view: FighterView, f: Battle['fighters'][number], base: number, dt: number): void {
    const obj = view.obj;
    obj.position.y = base + SHIP_FLOAT;
    obj.rotation.x = 0;
    const time = this.time + f.id;
    if (f.state === 'dead') {
      view.deadAge += dt;
      view.pose?.({ act: 'dead', fall: Math.min(view.deadAge / SHIP_SINK, 1), time });
      if (view.deadAge > SHIP_SINK) obj.visible = false;
      return;
    }
    const rowing = f.state === 'move' || f.state === 'flee';
    view.pose?.(
      rowing
        ? { act: 'walk', phase: this.time * 3 + f.id, stride: 0.5, time }
        : f.state === 'fight'
          ? { act: 'fight', strike: f.swing > 0 ? 1 - f.swing / 0.3 : undefined, time }
          : { act: 'stand', time },
    );
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
    const s = this.scale;
    const R = ROCKS.radius * this.geo;
    const non = dungNon({
      hu: this.hu,
      at: (dx, dz, dy = 0) => this.at(x + dx, z + dz, dy),
      cao: (dx, dz) => this.heightAt(x + dx, z + dz),
      R,
      sc: s,
      seed: seq,
    });
    non.group.position.set(x + ox, 0, z + oz);
    this.root.add(non.group);
    this.nons.push(non);
    for (const f of battle.fighters) {
      if (f.side !== 'giac' || !f.stun || f.stun <= 0 || f.state === 'dead') continue;
      const v = this.fighters.get(f.id);
      if (v) this.hu.choang(v.obj, { mau: C.fxVang, cao: 1.75 * s, delay: 0.2, life: f.stun - 0.2 });
    }
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
      g.position.set(f.x + ox, this.heightAt(f.x, f.z, true), f.z + oz);
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

  /** Đấu thành: thêm hay bỏ vòng màu phe dưới chân. */
  private syncTeam(view: FighterView, side: 'ta' | 'giac' | null): void {
    if (side && !view.team) {
      view.team = new THREE.Mesh(teamGeo, teamMat[side]);
      view.team.position.y = 0.03;
      view.team.renderOrder = 1;
      view.obj.add(view.team);
    } else if (!side && view.team) {
      view.team.removeFromParent();
      view.team = undefined;
    }
  }

  /** Thêm hay bỏ vòng sáng Lệnh bắn (hình thoi đỏ đồng) dưới chân một lính nỏ. */
  private syncOrder(view: FighterView, on: boolean): void {
    if (on && !view.order) {
      view.order = new THREE.Mesh(orderGeo, orderMat);
      view.order.position.y = 0.05;
      view.order.renderOrder = 2;
      view.obj.add(view.order);
    } else if (!on && view.order) {
      view.order.removeFromParent();
      view.order = undefined;
    }
    if (view.order) view.order.rotation.y = this.time * 2;
  }

  /**
   * Nỏ liên châu: Cao Lỗ ngẩng nỏ bắn một loạt tên đồng vút lên, rồi tên rơi lả tả xuống khắp vùng trúng quanh
   * (tx, tz), bụi đất tung lên chỗ tên cắm.
   */
  /** `radius`: bán kính vùng tên rơi của luật (đủ bốn món bộ Cao Lỗ thì rộng hơn); không có là số gốc. */
  private lienChau(battle: Battle, seq: number, x: number, z: number, tx: number, tz: number, radius = LIEN_CHAU.radius): void {
    const { x: ox, z: oz } = this.offset;
    const hero = battle.fighters.find((f) => f.kind === 'caoLo');
    const view = hero && this.fighters.get(hero.id);
    if (view) view.volley = VOLLEY_AIM;
    const ground = this.heightAt(x, z);
    const rand = seeded(seq * 97 + 3);
    // Ba mũi tên vút lên chếch về phía vùng trúng.
    for (let i = 0; i < 3; i++) {
      const from = new THREE.Vector3(x + ox, ground + 1.4 * this.scale, z + oz);
      const top = new THREE.Vector3(lerp(x, tx, 0.4) + ox + (i - 1) * 0.4, ground + 6, lerp(z, tz, 0.4) + oz);
      const up = new THREE.Mesh(bronzeBoltGeo, bronzeBoltMat);
      up.position.copy(from);
      this.root.add(up);
      this.arrows.push({ mesh: up, from, to: top, age: 0, dur: RAIN_RISE, arc: 0 });
    }
    const r = radius * this.geo;
    const s = this.scale;
    // Vòng ngắm đồng co vào vùng tên sắp rơi; tên cắm hết thì sóng đồng bừng lên.
    this.hu.soc(this.at(tx, tz), { mau: C.red, r: r * 1.05, thu: true, life: RAIN_RISE + 0.3, loi: false });
    this.hu.loe(this.at(x, z, 1.4 * s), { mau: C.fxVang, size: 1.6 * s, life: 0.3 });
    this.hu.soc(this.at(tx, tz), { mau: C.bronzeLight, r: r * 1.1, delay: RAIN_RISE + 0.45, life: 0.6 });
    for (let i = 0; i < RAIN_ARROWS; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * r;
      const px = tx + Math.cos(a) * d;
      const pz = tz + Math.sin(a) * d;
      const h = this.heightAt(px, pz);
      const to = new THREE.Vector3(px + ox, h + 0.15, pz + oz);
      const start = new THREE.Vector3(px + ox - 0.8, h + 6.5, pz + oz - 0.8);
      const mesh = new THREE.Mesh(bronzeBoltGeo, bronzeBoltMat);
      mesh.position.copy(start);
      mesh.visible = false;
      this.root.add(mesh);
      this.arrows.push({ mesh, from: start, to, age: 0, dur: 0.3, delay: RAIN_RISE + rand() * 0.35, arc: 0 });
      if (i % 3 === 0) this.addPuff(px + ox, h + 0.15, pz + oz, C.earth, RAIN_RISE + 0.3 + rand() * 0.35, 0.6, 1.2);
      const land = (this.arrows[this.arrows.length - 1].delay ?? 0) + 0.3;
      if (i % 2 === 0) {
        this.hu.loe(to, { mau: C.fxVang, size: 1 * s, delay: land, life: 0.25 });
        this.hu.tia(to, { mau: C.fxVang, n: 4, toc: 5, len: 0.3, up: 1, delay: land, life: 0.35 });
      }
    }
    // Vòng sóng đồng loang ra từ giữa vùng trúng.
    const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: C.bronzeLight, transparent: true, depthWrite: false }));
    mesh.position.set(tx + ox, this.heightAt(tx, tz) + 0.08, tz + oz);
    mesh.renderOrder = 3;
    this.root.add(mesh);
    this.rings.push({ mesh, age: 0 });
  }

  /**
   * Voi xung trận: voi Trưng Trắc chồm lên rống rồi lao từ (x, z) tới (tx, tz); bụi đất tung dọc đường theo bước voi.
   * Giặc bị hất, choáng thì luật trận đã đặt chỗ; phần vẽ chỉ cho voi lao tới đó.
   */
  private voiXung(battle: Battle, x: number, z: number, tx: number, tz: number): void {
    const hero = battle.fighters.find((f) => f.kind === 'trungTrac');
    const view = hero && this.fighters.get(hero.id);
    if (view) {
      view.dash = { fromX: x, fromZ: z, toX: tx, toZ: tz, age: 0 };
      view.cast = undefined;
    }
    const s = this.scale;
    const T = BA_CAST_TIME;
    const from = this.at(x, z);
    const to = this.at(tx, tz);
    const len = Math.hypot(tx - x, tz - z) || 1;
    const yaw = Math.atan2(-(tz - z), tx - x);
    // Báo đường lao: dải mũi tên đỏ son chạy dồn về chỗ voi sẽ tới.
    this.hu.duong(from, to, { mau: C.trungRed, rong: VOI_XUNG.width * this.geo, life: T * 0.95 });
    // Voi chồm lên rống: sóng vàng nhỏ dưới chân, lóe sáng.
    this.hu.soc(from, { mau: C.trungYellow, r: 1.8 * s, delay: 0.15, life: 0.55 });
    this.hu.loe(this.at(x, z, 1.4 * s), { mau: C.fxVang, size: 2 * s, delay: 0.15, life: 0.35 });
    // Bụi cuộn hai bên theo bước voi, vệt gió ngược chiều lao.
    const px = -(tz - z) / len;
    const pz = (tx - x) / len;
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      const delay = T * (0.28 + 0.67 * smoothstep(k, 0, 1));
      const cx = lerp(x, tx, k);
      const cz = lerp(z, tz, k);
      for (const side of [-1, 1]) {
        const p = this.at(cx + px * side * 0.35, cz + pz * side * 0.35, 0.25);
        this.hu.bui(p, { mau: C.fxBui, size: 1.1 * s, delay, life: 0.85, bay: new THREE.Vector3(px * side * 0.7, 0, pz * side * 0.7) });
      }
      if (i % 2 === 0) this.hu.tia(this.at(cx, cz, 0.9 * s), { mau: C.fxTrang, n: 5, toc: 7, len: 1, day: 0.04, yaw: yaw + Math.PI, xoe: 0.5, up: 0.05, delay, life: 0.3 });
    }
    // Va chạm ở cuối đường: sóng lửa, lóe, tia tóe, vòng bụi.
    const hit = T * 0.95;
    this.hu.soc(to, { mau: C.fxLua, r: 2.8 * s, delay: hit, life: 0.6 });
    this.hu.soc(to, { mau: C.fxVang, r: 1.6 * s, delay: hit + 0.06, life: 0.45, loi: false });
    this.hu.loe(this.at(tx, tz, 0.8 * s), { mau: C.fxVang, size: 3.2 * s, delay: hit, life: 0.4 });
    this.hu.tia(this.at(tx, tz, 0.5 * s), { mau: C.fxVang, n: 26, toc: 10, len: 0.6, up: 0.9, delay: hit, life: 0.6 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.hu.bui(this.at(tx, tz, 0.3), { mau: C.fxBui, size: 1.2 * s, delay: hit, life: 0.9, bay: new THREE.Vector3(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6) });
    }
    // Giặc bị hất, choáng (luật đã đặt): sao vàng xoay trên đầu tới hết choáng.
    for (const f of battle.fighters) {
      if (f.side !== 'giac' || !f.stun || f.stun <= 0 || f.state === 'dead') continue;
      const v = this.fighters.get(f.id);
      if (!v) continue;
      this.hu.loe(this.at(f.x, f.z, 0.8 * s), { mau: C.fxTrang, size: 1.2 * s, delay: hit + 0.05, life: 0.3 });
      this.hu.choang(v.obj, { mau: C.fxVang, cao: 1.75 * s, delay: hit, life: Math.max(0.3, f.stun - hit) });
    }
  }

  /**
   * Chém cá kình: voi trắng Bà Triệu lao từ (x, z) tới trước kẻ bị chém ở (tx, tz), bụi tung theo bước voi; lúc gươm
   * chém xuống thì vòng sáng ngà loang ở chỗ kẻ bị chém, tia sáng tóe ra. Luật trận đã đặt chỗ; phần vẽ cho voi lao.
   */
  private chemCaKinh(battle: Battle, x: number, z: number, tx: number, tz: number): void {
    const hero = battle.fighters.find((f) => f.kind === 'baTrieu');
    const view = hero && this.fighters.get(hero.id);
    // Chỗ voi dừng: luật đã đặt Bà ở đó.
    const ex = hero ? hero.x : x;
    const ez = hero ? hero.z : z;
    if (view) {
      view.dash = { fromX: x, fromZ: z, toX: ex, toZ: ez, age: 0 };
      view.cast = undefined;
    }
    const s = this.scale;
    const T = BA_CAST_TIME;
    const hit = T * 0.7;
    const yaw = Math.atan2(-(tz - z), tx - x);
    const tgt = this.at(tx, tz);
    // Vòng ngắm đỏ co dần vào kẻ sắp bị chém.
    this.hu.soc(tgt, { mau: C.red, r: 1.6 * s, thu: true, life: hit, loi: false });
    // Voi trắng lao: bụi cuộn theo bước, vệt gió.
    for (let i = 0; i <= 6; i++) {
      const k = i / 6;
      const delay = T * lerp(CHEM_RUN[0], CHEM_RUN[1], k);
      const cx = lerp(x, ex, k);
      const cz = lerp(z, ez, k);
      this.hu.bui(this.at(cx, cz, 0.25), { mau: C.fxBui, size: 1 * s, delay, life: 0.8 });
      this.hu.tia(this.at(cx, cz, 0.9 * s), { mau: C.fxTrang, n: 4, toc: 7, len: 1, day: 0.04, yaw: yaw + Math.PI, xoe: 0.5, up: 0.05, delay, life: 0.3 });
    }
    // Nhát chém: hai vệt trăng lưỡi liềm (một quét ngang, một chém chéo), lóe trắng, tia vàng, sóng trắng, vết chém trên đất.
    this.hu.chem(this.at(tx, tz, 0.7 * s), { mau: C.fxVang, r: 1.7 * s, yaw, nam: true, nghieng: 0, quet: 2.2, delay: hit, life: 0.4 });
    this.hu.chem(this.at(tx, tz, 1 * s), { mau: C.fxTrang, r: 1.9 * s, yaw: yaw + Math.PI / 2, nghieng: 1.1, quet: 1.8, delay: hit + 0.05, life: 0.42 });
    this.hu.loe(this.at(tx, tz, 0.9 * s), { mau: C.fxTrang, size: 3.6 * s, delay: hit + 0.04, life: 0.35 });
    this.hu.tia(this.at(tx, tz, 0.8 * s), { mau: C.fxVang, n: 28, toc: 11, len: 0.7, up: 0.6, delay: hit + 0.04, life: 0.55 });
    this.hu.soc(tgt, { mau: C.fxTrang, r: 2.6 * s * this.geo, delay: hit + 0.04, life: 0.55 });
    this.hu.vet(tgt, { mau: C.fxVet, dai: 2.8 * s, yaw: yaw + Math.PI / 2 + 0.5, delay: hit + 0.05, life: 1.8 });
  }

  /**
   * Hiệu triệu: Trưng Nhị rút cờ phất, vòng sáng xanh loang dưới chân quân ta được hồi máu, bụi tung ở chỗ từng
   * nghĩa binh chạy ra.
   */
  /** `count`: số nghĩa binh tối đa của luật (đủ bốn món bộ Trưng Nhị thì nhiều hơn). */
  private hieuTrieu(battle: Battle, x: number, z: number, count = HIEU_TRIEU.count): void {
    const hero = battle.fighters.find((f) => f.kind === 'trungNhi');
    const view = hero && this.fighters.get(hero.id);
    if (view) view.cast = BA_CAST_TIME;
    const s = this.scale;
    const R = HIEU_TRIEU.radius * this.geo;
    const c = this.at(x, z);
    // Hoa văn mặt trống đồng xanh nở ra đúng vùng hồi máu, cột sáng ở chỗ Trưng Nhị phất cờ.
    this.hu.vong(c, { mau: C.heal, r: R, delay: 0.1, life: 1.9 });
    this.hu.soc(c, { mau: C.fxXanh, r: R, delay: 0.35, life: 0.8 });
    this.hu.soc(c, { mau: C.fxVang, r: R * 0.7, delay: 0.6, life: 0.7, loi: false });
    this.hu.cot(c, { mau: C.fxXanh, r: 0.55 * s, h: 4.5 * s, delay: 0.2, life: 1, sang: 0.6 });
    this.hu.loe(this.at(x, z, 2.2 * s), { mau: C.fxVang, size: 2.6 * s, delay: 0.3, life: 0.5 });
    this.hu.hat(c, { mau: C.fxXanh, n: 26, r: R, h: 2.4 * s, delay: 0.3, life: 1.6 });
    // Quân ta trong vùng được hồi máu: cột sáng mảnh và hạt sáng bốc lên ở từng người.
    const healed = battle.fighters.filter((f) => f.side === 'ta' && f.state !== 'dead' && f.state !== 'gone' && f.kind !== 'nghiaBinh' && Math.hypot(f.x - x, f.z - z) <= R);
    healed.forEach((f, i) => {
      const p = this.at(f.x, f.z);
      const delay = 0.45 + (i % 8) * 0.04;
      this.hu.cot(p, { mau: C.fxXanh, r: 0.22 * s, h: 1.3 * s, delay, life: 0.7, sang: 0.55 });
      this.hu.hat(p, { mau: 0xd8ffd0, n: 4, r: 0.3, h: 1.9 * s, size: 0.22, delay, life: 1 });
    });
    // Nghĩa binh chạy ra: bụi tung và lóe vàng ở chỗ từng người.
    const fresh = battle.fighters
      .filter((f) => f.kind === 'nghiaBinh' && f.state !== 'dead' && f.state !== 'gone' && !this.fighters.has(f.id))
      .slice(0, count);
    fresh.forEach((f, i) => {
      const delay = 0.3 + i * 0.05;
      this.hu.bui(this.at(f.x, f.z, 0.25), { mau: C.fxBui, size: 1.1 * s, delay, life: 0.8 });
      this.hu.loe(this.at(f.x, f.z, 0.8 * s), { mau: C.fxVang, size: 1.3 * s, delay, life: 0.35 });
    });
  }

  /** Lệnh bắn: Cao Lỗ nâng tù và lên thổi, một vòng sóng đỏ đồng loang ra từ chỗ ngài đứng. */
  /**
   * Lệnh nỏ của Mã Viện: hắn giơ đao phất cờ lệnh, vòng đỏ hiện ở chỗ quân ta đông nhất, rồi mưa tên nỏ đen từ phía
   * quân Hán rơi xuống đúng lúc luật trận gây sát thương (`MA_VIEN_VOLLEY.delay` giây sau).
   */
  private lenhNo(battle: Battle, seq: number, x: number, z: number, tx: number, tz: number): void {
    const { x: ox, z: oz } = this.offset;
    const boss = battle.fighters.find((f) => f.kind === 'maVien');
    const view = boss && this.fighters.get(boss.id);
    if (view) view.cast = MA_VIEN_CAST;
    const r = MA_VIEN_VOLLEY.radius * this.geo;
    const warn = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: C.red, transparent: true, depthWrite: false }));
    warn.position.set(tx + ox, this.heightAt(tx, tz) + 0.08, tz + oz);
    warn.renderOrder = 3;
    this.root.add(warn);
    this.rings.push({ mesh: warn, age: 0, size: r });
    const rand = seeded(seq * 53 + 11);
    // Tên bay từ phía sau lưng Mã Viện (phía quân Hán), vồng cao rồi cắm xuống vùng trúng.
    const dx = tx - x;
    const dz = tz - z;
    const d = Math.hypot(dx, dz) || 1;
    for (let i = 0; i < RAIN_ARROWS; i++) {
      const a = rand() * Math.PI * 2;
      const k = Math.sqrt(rand()) * r;
      const px = tx + Math.cos(a) * k;
      const pz = tz + Math.sin(a) * k;
      const h = this.heightAt(px, pz);
      const to = new THREE.Vector3(px + ox, h + 0.15, pz + oz);
      const start = new THREE.Vector3(px + ox - (dx / d) * 2.5, h + 6, pz + oz - (dz / d) * 2.5);
      const mesh = new THREE.Mesh(darkBoltGeo, darkBoltMat);
      mesh.position.copy(start);
      mesh.visible = false;
      this.root.add(mesh);
      const fall = 0.3;
      this.arrows.push({ mesh, from: start, to, age: 0, dur: fall, delay: Math.max(0, MA_VIEN_VOLLEY.delay - fall) + (rand() - 0.5) * 0.12, arc: 0 });
    }
  }

  private lenhBan(battle: Battle, x: number, z: number): void {
    const { x: ox, z: oz } = this.offset;
    const hero = battle.fighters.find((f) => f.kind === 'caoLo');
    const view = hero && this.fighters.get(hero.id);
    if (view) view.horn = HORN_TIME;
    const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: C.red, transparent: true, depthWrite: false }));
    mesh.position.set(x + ox, this.heightAt(x, z) + 0.08, z + oz);
    mesh.renderOrder = 3;
    this.root.add(mesh);
    this.rings.push({ mesh, age: 0 });
    // Tiếng tù và: ba sóng đỏ son nối nhau loang ra, hoa văn trống đồng đỏ; lính nỏ nhận lệnh bừng cột sáng đỏ.
    const s = this.scale;
    const c = this.at(x, z);
    this.hu.vong(c, { mau: C.red, r: 3.2 * s, delay: 0.25, life: 1.4 });
    for (let i = 0; i < 3; i++) this.hu.soc(c, { mau: i % 2 ? C.fxVang : C.trungRed, r: (3 + i) * s, delay: 0.3 + i * 0.22, life: 0.55, loi: i === 0 });
    this.hu.loe(this.at(x, z, 1.5 * s), { mau: C.fxLua, size: 2.2 * s, delay: 0.3, life: 0.4 });
    for (const f of battle.fighters) {
      if (f.side !== 'ta' || f.kind !== 'no' || f.state === 'dead' || f.state === 'gone') continue;
      const p = this.at(f.x, f.z);
      const delay = 0.45 + Math.hypot(f.x - x, f.z - z) * 0.06;
      this.hu.cot(p, { mau: C.fxLua, r: 0.25 * s, h: 1.5 * s, delay, life: 0.7, sang: 0.7 });
      this.hu.loe(this.at(f.x, f.z, 0.9 * s), { mau: C.fxVang, size: 1 * s, delay, life: 0.3 });
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
    // Tia sáng vàng phóng thẳng lên trời từ nỏ thần, nổ thành quầng sáng trên cao rồi mới tỏa mưa tên.
    const s = this.scale;
    this.hu.cot(this.at(x, z, 1.4 * s), { mau: C.fxVang, r: 0.22 * s, h: 7, life: 0.6 });
    this.hu.loe(this.at(x, z, 1.6 * s), { mau: C.fxVang, size: 2 * s, life: 0.3 });
    this.hu.loe(top, { mau: C.fxVang, size: 4.5 * s, delay: VOLLEY_RISE, life: 0.45 });
    this.hu.tia(top, { mau: C.fxVang, n: 24, toc: 10, len: 0.6, up: -0.3, delay: VOLLEY_RISE, life: 0.5 });
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
      const delay = VOLLEY_RISE + rand() * 0.3;
      this.arrows.push({ mesh, from: start, to, age: 0, dur: 0.28, delay, arc: 0, flash: true });
      // Chỗ mỗi mũi tên vàng cắm: sóng vàng nhỏ, lóe, tia tóe.
      this.hu.soc(this.at(f.x, f.z), { mau: C.fxVang, r: 1 * s, delay: delay + 0.28, life: 0.4 });
      this.hu.loe(to, { mau: C.fxVang, size: 1.4 * s, delay: delay + 0.28, life: 0.3 });
      this.hu.tia(to, { mau: C.fxVang, n: 6, toc: 6, len: 0.35, up: 0.9, delay: delay + 0.28, life: 0.4 });
    }
  }

  /**
   * Rùa Vàng che chở: vòm mai rùa vàng lưới lục giác nở lên trùm quanh An Dương Vương, sóng vàng loang ra, hạt sáng bay
   * lên khắp quân ta (mỗi lính ta có vòng mai rùa dưới chân suốt lúc được che, xem `syncShell`).
   */
  private riseTurtle(battle: Battle, x: number, z: number): void {
    const s = this.scale;
    const c = this.at(x, z);
    this.hu.khien(c, { mau: C.fxVang, r: 3 * s * this.geo, life: 2.2 });
    this.hu.soc(c, { mau: 0xd8e060, r: 4 * s * this.geo, life: 0.7 });
    this.hu.loe(this.at(x, z, 1.4 * s), { mau: C.fxVang, size: 3 * s, life: 0.45 });
    this.hu.tia(this.at(x, z, 0.4), { mau: C.fxVang, n: 20, toc: 7, len: 0.35, up: 1.3, life: 0.7 });
    for (const f of battle.fighters) {
      if (f.side !== 'ta' || f.state === 'dead' || f.state === 'gone' || f.kind === 'anDuong') continue;
      this.hu.hat(this.at(f.x, f.z), { mau: 0xe8f080, n: 3, r: 0.3, h: 1.7 * s, size: 0.22, delay: 0.3 + (f.id % 8) * 0.04, life: 1 });
    }
  }

  private dropWave(w: DrumWave): void {
    this.root.remove(w.mesh);
    (w.mesh.material as THREE.Material).dispose();
  }

  /** Đá Dời non: mọc nhanh lên quanh chân khi bị giữ chân, lún xuống khi hết. */
  private syncRocks(view: FighterView, stun: number, id: number, dt: number): void {
    if (stun > 0 && !view.rocks) {
      const stone = daGiu(id * 31 + 7);
      view.obj.add(stone.group);
      view.rocks = { stone, age: 0 };
    }
    if (!view.rocks) return;
    const r = view.rocks;
    r.age += dt;
    r.stone.tick(r.age, stun);
    if (stun <= 0) {
      r.stone.group.removeFromParent();
      r.stone.drop();
      view.rocks = undefined;
    }
  }

  private readEvents(battle: Battle): void {
    const { x: ox, z: oz } = this.offset;
    for (const e of battle.events) {
      if (e.seq <= this.lastSeq) continue;
      if (e.kind === 'shot' && e.tx !== undefined && e.tz !== undefined) {
        // Cá phun nước bắn tia nước, ma trơi phun cầu lửa xanh, An Dương Vương bắn tên đồng vàng, nỏ Triệu, nỏ Hán bắn tên sẫm.
        const mesh =
          e.by === 'caPhun'
            ? new THREE.Mesh(waterBallGeo, waterBallMat)
            : e.by === 'maTroi'
              ? new THREE.Mesh(ghostBallGeo, ghostBallMat)
              : e.by === 'anDuong'
                ? new THREE.Mesh(boltGeo, goldMat)
                : e.by === 'caoLo'
                  ? new THREE.Mesh(bronzeBoltGeo, bronzeBoltMat)
                  : e.by === 'noTrieu' || e.by === 'noHan' || e.by === 'noNgo' || e.by === 'noLuong' || e.by === 'noDuong' || e.by === 'noTong'
                  ? new THREE.Mesh(darkBoltGeo, darkBoltMat)
                  : new THREE.Mesh(arrowGeo, arrowMat);
        // Lâu thuyền bắn từ các tầng lầu, cao hơn lính trên bờ.
        const ship = e.by === 'noHan' && battle.fighters.some((f) => f.kind === 'lauThuyen' && f.x === e.x && f.z === e.z);
        const from = new THREE.Vector3(e.x + ox, this.heightAt(e.x, e.z, false, e.fromWall) + (ship ? SHIP_FLOAT + SHIP_SHOT_Y : 0.8), e.z + oz);
        const to = new THREE.Vector3(e.tx + ox, this.heightAt(e.tx, e.tz, false, e.toWall) + 0.5, e.tz + oz);
        mesh.position.copy(from);
        this.root.add(mesh);
        const fast = e.by === 'anDuong' || e.by === 'caoLo' || e.by === 'noTrieu' || e.by === 'noHan' || e.by === 'noNgo' || e.by === 'noLuong' || e.by === 'noDuong' || e.by === 'noTong' || e.by === 'no';
        this.arrows.push({ mesh, from, to, age: 0, dur: Math.max(0.12, from.distanceTo(to) / (fast ? 18 : 12)), arc: fast ? 0.25 : 0.6, flash: e.by === 'anDuong' });
      }
      if (e.kind === 'volley') this.volley(battle, e.seq, e.x, e.z);
      if (e.kind === 'rain' && e.tx !== undefined && e.tz !== undefined) this.lienChau(battle, e.seq, e.x, e.z, e.tx, e.tz, e.r);
      if (e.kind === 'order') this.lenhBan(battle, e.x, e.z);
      if (e.kind === 'barrage' && e.tx !== undefined && e.tz !== undefined) this.lenhNo(battle, e.seq, e.x, e.z, e.tx, e.tz);
      if (e.kind === 'barrageHit') {
        // Tên nỏ cắm xuống: bụi đất tung lên khắp vùng trúng.
        const r = MA_VIEN_VOLLEY.radius * this.geo;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const px = e.x + Math.cos(a) * r * 0.6;
          const pz = e.z + Math.sin(a) * r * 0.6;
          this.addPuff(px + ox, this.heightAt(px, pz) + 0.15, pz + oz, C.earth, i * 0.02, 0.7, 1.4);
        }
      }
      if (e.kind === 'sink') {
        // Lâu thuyền chìm: nước trắng tung quanh thân thuyền.
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const px = e.x + Math.cos(a) * 1.4;
          const pz = e.z + Math.sin(a) * 0.7;
          this.addPuff(px + ox, this.heightAt(px, pz) + 0.3, pz + oz, C.foam, i * 0.08, 1.1, 2.2);
        }
      }
      if (e.kind === 'arrive') {
        // Màn cầm cự: đợt giặc mới kéo vào bãi, bụi tung lên ở cuối bãi phía giặc.
        for (let i = 0; i < 7; i++) this.addPuff(1 + i * 1.2 + ox, this.heightAt(1 + i * 1.2, e.z) + 0.2, e.z + oz, C.earth, i * 0.06, 0.9, 2);
      }
      if (e.kind === 'rocks') this.raiseCrags(battle, e.x, e.z, e.seq);
      if (e.kind === 'wave' && e.tx !== undefined && e.tz !== undefined) this.surge(battle, e.x, e.z, e.tx, e.tz, e.seq);
      if (e.kind === 'summon') this.summon(battle, e.x, e.z);
      if (e.kind === 'shield') this.riseTurtle(battle, e.x, e.z);
      if (e.kind === 'smash') {
        const hero = battle.fighters.find((f) => f.kind === 'giong');
        const view = hero && this.fighters.get(hero.id);
        if (view) view.smash = SMASH_TIME;
        // Bụi tre quét một vòng: hai vệt quét ngang xanh vàng, sóng đất, lá tre và tia tóe ra.
        const sc = this.scale;
        const R = (e.r ?? SMASH.radius) * this.geo;
        const face = hero?.face ?? 0;
        const hit = SMASH_TIME * 0.38;
        for (const [k, mau] of [
          [0, C.fxVang],
          [Math.PI, C.fxTrang],
        ] as const) {
          this.hu.chem(this.at(e.x, e.z, 0.6 * sc), { mau, r: R * 0.85, yaw: face + k, nam: true, quet: 3.2, delay: hit - 0.08, life: 0.45 });
        }
        this.hu.soc(this.at(e.x, e.z), { mau: C.bamboo, r: R * 1.1, delay: hit, life: 0.6 });
        this.hu.tia(this.at(e.x, e.z, 0.6 * sc), { mau: C.fxVang, n: 22, toc: 9, len: 0.5, up: 0.5, delay: hit, life: 0.55 });
        this.hu.tia(this.at(e.x, e.z, 0.6 * sc), { mau: C.fxXanh, n: 14, toc: 7, len: 0.3, day: 0.09, up: 0.8, delay: hit, life: 0.8 });
      }
      if (e.kind === 'hill' && e.tx !== undefined && e.tz !== undefined) {
        // Đồi to theo vùng đánh của luật (đủ bốn món bộ Tản Viên thì rộng hơn).
        const R = (e.r ?? HILL.radius) * this.geo;
        const doi = taoDoi({ hu: this.hu, at: (dx, dz, dy = 0) => this.at(e.tx! + dx, e.tz! + dz, dy), R, sc: this.scale, seed: e.seq });
        doi.group.scale.multiplyScalar(R / HILL.radius);
        doi.group.position.set(e.tx + ox, this.heightAt(e.tx, e.tz) + 7, e.tz + oz);
        doi.group.rotation.y = e.seq;
        this.root.add(doi.group);
        this.hills.push({ doi, age: 0 });
        doi.noRa(HILL_FALL);
      }
      if (e.kind === 'drown') {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this.addPuff(e.x + Math.cos(a) * 0.8 + ox, this.heightAt(e.x, e.z) + 0.3, e.z + Math.sin(a) * 0.8 + oz, i % 2 ? C.foam : 0x9fd4e8, i * 0.05, 0.8, 1.3);
        }
      }
      // Trống trận vẽ bằng sóng trống theo từng nhịp (xem syncRally), không cần vòng ở đây.
      if (e.kind === 'smash') {
        const color = C.bamboo;
        const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
        mesh.position.set(e.x + ox, this.heightAt(e.x, e.z) + 0.08, e.z + oz);
        mesh.renderOrder = 3;
        this.root.add(mesh);
        this.rings.push({ mesh, age: 0 });
      }
      if (e.kind === 'fire' && e.tx !== undefined && e.tz !== undefined) this.breatheFire(battle, e.seq, e.x, e.z, e.tx, e.tz, e.len);
      if (e.kind === 'smash') {
        const r = (1.6 * (e.r ?? SMASH.radius)) / SMASH.radius;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.addPuff(e.x + Math.cos(a) * r + ox, this.heightAt(e.x, e.z) + 0.2, e.z + Math.sin(a) * r + oz, C.earth, 0.05, 0.7, 1.6);
        }
      }
      if (e.kind === 'exhaust') this.addPuff(e.x + ox, this.heightAt(e.x, e.z) + 0.6, e.z + oz, C.smoke, 0, 1.2, 3);
      if (e.kind === 'charge' && e.tx !== undefined && e.tz !== undefined) this.voiXung(battle, e.x, e.z, e.tx, e.tz);
      if (e.kind === 'call') this.hieuTrieu(battle, e.x, e.z, e.n);
      if (e.kind === 'chem' && e.tx !== undefined && e.tz !== undefined) this.chemCaKinh(battle, e.x, e.z, e.tx, e.tz);
      if (e.kind === 'escape') {
        // Tô Định chạy thoát khỏi bãi: bụi tung ở mép bãi phía giặc.
        for (let i = 0; i < 6; i++) this.addPuff(e.x + (i - 2.5) * 0.35 + ox, this.heightAt(e.x, e.z) + 0.25, e.z + oz, C.earth, i * 0.05, 0.9, 1.8);
      }
    }
    this.lastSeq = battle.seq;
  }

  /**
   * Phun lửa: Gióng phi từ (x, z) tới (tx, tz), lửa phun từ mõm ngựa suốt lúc phi, để lại vệt đất cháy
   * dài đúng dải bị đốt, và giặc trong dải bốc cháy. Luật trận đã đặt Gióng ở chỗ mới; phần vẽ cho phi tới đó.
   */
  /** `length`: độ dài dải lửa của luật (đủ bốn món bộ Phù Đổng thì dài hơn). */
  private breatheFire(battle: Battle, seq: number, x: number, z: number, tx: number, tz: number, length = FIRE.length): void {
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
      // Luồng lửa phun từ mõm ngựa sắt (trong khung mô hình Gióng) suốt lúc phi.
      this.hu.phun(view.obj, new THREE.Vector3(0, 1.22, 1.02), { mau: C.fxLua, life: JET_LIFE, toc: 12, size: 0.8 * this.scale, rate: 150 });
    }

    // Vệt đất cháy sém dọc dải bị đốt, vị trí từng vệt và than lấy theo hạt giống của sự kiện.
    const rand = seeded(seq * 7919 + 13);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2e2216, transparent: true, opacity: 0.6, depthWrite: false });
    const group = new THREE.Group();
    group.position.set(x + ox, 0.05, z + oz);
    group.rotation.y = face;
    group.scale.set(this.geo, 1, this.geo);
    const steps = Math.ceil(length / 0.55);
    const blobs = new THREE.InstancedMesh(scorchGeo, mat, steps);
    for (let i = 0; i < steps; i++) {
      tmpPos.set((rand() - 0.5) * 0.5, 0, 0.2 + i * 0.55);
      tmpScale.set(FIRE.width * (0.32 + rand() * 0.14), 1, 0.45 + rand() * 0.25);
      blobs.setMatrixAt(i, tmpMatrix.compose(tmpPos, noTurn, tmpScale));
    }
    blobs.renderOrder = 1;
    const spots = Array.from({ length: EMBERS }, () => ({ x: (rand() - 0.5) * FIRE.width * 0.8, z: rand() * length, phase: rand() * Math.PI * 2 }));
    const embers = new THREE.InstancedMesh(emberGeo, flameMats[1], EMBERS);
    group.add(blobs, embers);
    this.root.add(group);
    this.scorches.push({ group, mat, blobs, embers, spots, age: 0 });

    // Ánh lửa dọc dải đốt theo bước ngựa phi: quầng lửa, than tóe lên, khói sẫm; đầu dải bừng sóng lửa.
    const sc = this.scale;
    const L = length * this.geo;
    this.hu.soc(this.at(x, z), { mau: C.fxLua, r: 1.8 * sc, life: 0.45 });
    for (let i = 0; i <= 7; i++) {
      const d = (L * i) / 7;
      const px = x + dx * d;
      const pz = z + dz * d;
      const delay = (DASH_TIME * i) / 7;
      this.hu.loe(this.at(px, pz, 0.5 * sc), { mau: C.fxLua, size: 2.4 * sc, delay, life: 0.5 });
      this.hu.tia(this.at(px, pz, 0.3), { mau: C.fxVang, n: 6, toc: 5, len: 0.35, up: 1.4, delay: delay + 0.05, life: 0.7 });
      if (i % 2 === 1) this.hu.bui(this.at(px, pz, 0.8), { mau: 0x9a908a, size: 1 * sc, delay: delay + 0.2, life: 1.1 });
    }
    this.hu.soc(this.at(x + dx * L, z + dz * L), { mau: C.fxLua, r: 2.2 * sc, delay: DASH_TIME, life: 0.55 });

    // Giặc đứng trong dải lửa (cùng phép đo với luật trận) bốc cháy một lúc.
    for (const f of battle.fighters) {
      if (f.side === 'ta') continue;
      const along = (f.x - x) * dx + (f.z - z) * dz;
      const across = Math.abs((f.x - x) * dz - (f.z - z) * dx);
      const target = this.fighters.get(f.id);
      if (!target || along < -0.3 || along > length * this.geo || across > (FIRE.width * this.geo) / 2) continue;
      this.hu.chay(target.obj, { mau: C.fxLua, cao: 1.1 * this.scale, size: 0.6 * this.scale, delay: Math.max(0, along / Math.max(length * this.geo, 0.1)) * DASH_TIME, life: BURN_LIFE });
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
    this.hu.update(dt);
    for (let i = this.nons.length - 1; i >= 0; i--) {
      const n = this.nons[i];
      if (n.tick(dt)) continue;
      n.group.removeFromParent();
      n.drop();
      this.nons.splice(i, 1);
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
      const g = h.doi.group;
      h.age += dt;
      const { x, z } = g.position;
      const ground = this.heightAt(x - this.offset.x, z - this.offset.z);
      // Gốc mô hình cắm xuống dưới mặt đất khi đồi đập xuống.
      const bury = h.doi.bury * (g.scale.y || 1);
      const roi = h.age < HILL_FALL;
      if (roi) {
        const k = h.age / HILL_FALL;
        g.position.y = ground - bury * k * k + 7 * (1 - k * k);
      } else {
        // Đập xuống nảy nhẹ, nằm lại một lúc rồi lún dần xuống đất (bóng núi thần thì tan tại chỗ).
        const t = h.age - HILL_FALL;
        const bounce = t < 0.25 && !h.doi.tan ? Math.sin((t / 0.25) * Math.PI) * 0.18 : 0;
        const sink = h.doi.tan ? 0 : Math.max(0, (h.age - 1.2) / (HILL_LIFE - 1.2));
        g.position.y = ground - bury + bounce - 1.6 * (g.scale.y || 1) * sink * sink;
      }
      h.doi.tick(h.age, dt, roi);
      if (h.age >= (h.doi.tan ? HILL_FALL + h.doi.tanSau : HILL_LIFE)) {
        this.root.remove(g);
        disposeModel(g);
        h.doi.drop?.();
        this.hills.splice(i, 1);
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
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      // Vòng hẹn giờ (tuổi âm) chưa hiện.
      r.mesh.visible = r.age >= 0;
      if (r.age < 0) continue;
      const k = r.age / RING_LIFE;
      r.mesh.scale.setScalar(0.5 + k * ((r.size ?? 6.5) - 0.5));
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
      if (k >= 1) {
        this.root.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        this.rings.splice(i, 1);
      }
    }
  }
}

/** Xoay hào quang của tướng hiển linh theo tốc độ riêng mỗi kiểu (`userData.halo`, rad/giây; 0 thì đứng yên). */
function spinHalo(obj: THREE.Object3D, time: number): void {
  for (const c of obj.children) if (typeof c.userData.halo === 'number' && c.userData.halo) c.rotation.z = time * c.userData.halo;
}
