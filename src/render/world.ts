// Cảnh 3D của kinh đô: địa hình bậc thang, rừng, sông, công trình, lũy tre, đê, thành Cổ Loa, nước lũ, mưa,
// đêm yêu tinh, cảnh Tết (cây nêu, dây cờ, mâm bánh, người gói bánh) và các hiệu ứng khi đặt công trình.

import * as THREE from 'three';
import { BUILDINGS, FIELD, isRoad, type BuildingType, type Terrain, type TuongId } from '../game/defs';
import { raidSpawnBand, type Battle, type RaidSide } from '../game/battle';
import { advLook, inChapter3, ruaVangCame, type AdvLook } from '../game/coLoa';
import { heroPost } from '../game/doanhTrai';
import { dienLevel, type Building, type GameState } from '../game/game';
import { giongLook, type GiongLook } from '../game/giong';
import { DIEN_HOME, FAR_BANK, FOREST_BAND, GRID, RIVER_START, areaStart, baseHeights, isUnlocked } from '../game/map';
import { sonLook, type SonLook } from '../game/son';
import { floodMap } from '../game/terrain';
import { tetOpen } from '../game/tet';
import { Battlefield } from './battlefield';
import { BattleView } from './battleView';
import { IsoCamera } from './camera';
import { banhChung, banhGiay, footScale } from './buildings';
import { PERSON_SCALE } from './congTrinh/chung';
import { DIEN_LOT } from './congTrinh/dien';
import { DOANH_TRAI_HERO } from './congTrinh/doanhTrai';
import { CONG_TRINH, lotModel } from './congTrinh/index';
import { makeRuaVang } from './beasts';
import { buildDecor, disposeDecor, isBatchedDecor, type DecorSpot } from './decor';
import { makeAnDuong, makeGiong, makeSonTinh } from './heroes';
import { addSunLights, type SunLights } from './lights';
import {
  buildCitadel,
  buildDikes,
  buildForest,
  buildWalls,
  makeBoat,
  makeTradeBoat,
  type CitadelSpot,
  type DikeSpot,
  type TreeSpot,
  type WallSpot,
} from './models';
import { makeWorker, type Job } from './people';
import { C } from './palette';
import type { Poser } from './rig';
import { ShapeBuilder, seeded } from './shapes';
import { ToonModel, inkThin, outlineOf, toon } from './toon';

const HALF = GRID / 2;
/** Mép bờ bên kia (tọa độ thế giới): sông vẽ rộng hơn sông trong lưới, xem `FAR_BANK`. */
const FAR = FAR_BANK - HALF;
/** Luồng thuyền qua lại: sát bờ bên kia, ngoài tầm cầu tàu và thuyền neo ở bến. */
const BOAT_LANE = FAR - 0.9;
/** Thuyền buôn ghé đậu cách bờ chừng này ô (tâm thuyền), ngoài thuyền neo của bến, trong luồng thuyền. */
const MERCHANT_OUT = 3.5;
/** Số gợn sóng trên mặt sông: chừng 20 gợn mỗi ô bề rộng sông. */
const RIPPLES = 20 * (FAR_BANK - RIVER_START);
/** Mặt nước nằm thấp hơn mặt đất. */
const WATER_Y = -0.28;
/** Mỗi bậc đất cao chừng này (đơn vị thế giới). Mặt ô bậc h nằm ở h * LEVEL_H. */
export const LEVEL_H = 0.3;
const topY = (h: number) => Math.max(h, 0) * LEVEL_H;

/**
 * Mặt nước lũ khi nước dâng tới mực `level` (bậc): ở mực L, nước phủ ô bậc L − 1 mà chưa tới mặt ô bậc L.
 * Dưới bậc 1 thì nước sông dâng dần lên từ mặt sông.
 */
export function waterSurface(level: number): number {
  const one = (1 - 0.35) * LEVEL_H;
  if (level >= 1) return (level - 0.35) * LEVEL_H;
  return WATER_Y + Math.max(level, 0) * (one - WATER_Y);
}

/** Ánh trăng, trời và đất trong đêm yêu tinh. */
const NIGHT_MOON = new THREE.Color(0x9fb4ff);
const NIGHT_SKY = new THREE.Color(0x5a6aa8);
const NIGHT_GROUND = new THREE.Color(0x2a2a48);

/** Mật độ rừng: thưa để công trình nổi bật, không rối mắt. */
const FOREST_DENSITY = 0.7;

/**
 * Độ nét: số điểm ảnh vẽ cho mỗi điểm CSS, không vượt quá màn hình thật.
 * Mặc định 1,5: vẫn sắc trên điện thoại mà chỉ phải tô khoảng nửa số điểm ảnh của mức 2.
 */
export const RESOLUTIONS = { low: 1, medium: 1.5, high: 2 } as const;
export type Resolution = keyof typeof RESOLUTIONS;

/** Đất, nước và ô lưới dùng chất liệu Lambert đơn giản, công trình và cây mới dùng tô màu hoạt hình. */
const groundMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

/** Tọa độ thế giới của góc ô (x, z). */
const wx = (x: number) => x - HALF;
const wz = (z: number) => z - HALF;

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

/** Chỗ đứng của một người dân trong công trình (tọa độ trong mô hình). `walk` là quãng đi qua lại. */
interface Spot {
  job: Job;
  x: number;
  y: number;
  z: number;
  ry: number;
  walk?: number;
}

interface WorkerView {
  obj: THREE.Group;
  spot: Spot;
  phase: number;
}

interface BuildingView {
  group: THREE.Group;
  type: BuildingType;
  level: number;
  damaged: boolean;
  workers: number;
  /** Ô góc đang vẽ: công trình được dời đi thì dựng lại ở chỗ mới. */
  x: number;
  z: number;
  /** Bậc nền đang vẽ. */
  ground: number;
  people: WorkerView[];
  popAge: number;
  baseScale: number;
}

/**
 * Chỗ đứng của người ở công trình còn vẽ theo móng cũ (ba đền, bốn công trình Hội Tết), tọa độ mô hình trước khi
 * phóng theo móng. Công trình vẽ trên móng mới (`congTrinh/`) cho chỗ đứng theo bản vẽ của nó.
 */
const SPOTS: Partial<Record<BuildingType, Spot[]>> = {
  // Hội Tết: mỗi người một cột x − z như thợ đá, tránh bù nhìn, giàn, chuồng, nồi.
  ruongNep: [
    { job: 'nong', x: -0.85, y: 0.06, z: 0.3, ry: 0.5 },
    { job: 'nong', x: 0.3, y: 0.06, z: 0.3, ry: -0.4 },
    { job: 'nong', x: 0.75, y: 0.06, z: -0.4, ry: -0.9 },
  ],
  vuon: [
    { job: 'phuNu', x: -0.2, y: 0.08, z: 0.62, ry: -0.4 },
    { job: 'phuNu', x: 0.78, y: 0.08, z: 0.02, ry: -1.8 },
  ],
  chuongLon: [
    { job: 'nong', x: 0.65, y: 0.06, z: 0.72, ry: -2.0 },
    { job: 'nong', x: 0.62, y: 0.06, z: -0.58, ry: -1.6 },
  ],
  bep: [
    { job: 'phuNu', x: -0.74, y: 0.06, z: 0.14, ry: -2.9 },
    { job: 'phuNu', x: 0.6, y: 0.06, z: -0.02, ry: 2.9 },
    { job: 'phuNu', x: 0.4, y: 0.06, z: 0.4, ry: 0.9 },
  ],
};

/** Cây nêu ngày Tết cao chừng này. Khánh đất nung treo trên nêu. */
const NEU_H = 4.2;
const KHANH = 0xa8502e;

/** Công trình cần người làm: hiện đúng số người đang làm. */
const WORKED: BuildingType[] = ['ruong', 'ben', 'baiDa', 'loRen', 'ruongNep', 'vuon', 'chuongLon', 'bep'];

/** Số người hiện ra: công trình cần người làm thì đúng số người đang làm, còn lại cố định theo cấp. */
function peopleCount(b: Building, spots: number): number {
  if (WORKED.includes(b.type)) return Math.min(b.workers, spots);
  if (b.type === 'nhaSan' || b.type === 'doanhTrai') return Math.min(b.level >= 2 ? 2 : 1, spots);
  return Math.min(1, spots);
}

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly view: IsoCamera;

  private readonly land = new InstancedBoxes(RIVER_START * RIVER_START);
  /** Ô đất ứng với từng bản sao trong `land`, để biết người chơi chạm vào ô nào. */
  private readonly landTiles: number[] = [];
  /** Độ cao đã vẽ, so với state để biết khi nào phải dựng lại đất. */
  private heights: number[] = [];
  /** Nước lũ phủ trên các ô ngập, và lớp tô xanh báo trước vùng sẽ ngập. */
  private readonly floodWater = new InstancedBoxes(RIVER_START * RIVER_START);
  private readonly floodPreview = new InstancedBoxes(RIVER_START * RIVER_START);
  private floodKey = '';
  private riverWater?: THREE.Object3D;
  /** Nước lũ tràn cả bờ bên kia sông, hiện khi nước dâng cao hơn mặt bãi bên ấy. */
  private farFlood?: THREE.Object3D;
  /** Mưa giông khi Thủy Tinh hô mưa gọi gió. */
  private readonly rain: THREE.InstancedMesh;
  private readonly drops: { x: number; y: number; z: number; v: number }[] = [];
  private storm = 0;
  private stormGoal = 0;
  /** Đêm yêu tinh: trời tối xanh, ma trơi lơ lửng ở bìa rừng. */
  private night = 0;
  private nightGoal = 0;
  private readonly wisps = new THREE.Group();
  private readonly lights: SunLights;
  private state?: GameState;
  private forest?: THREE.Object3D;
  private walls?: THREE.Object3D;
  private dikes?: THREE.Object3D;
  private citadel?: THREE.Object3D;
  /** Đường đi và đồ trang trí một ô, vẽ theo lô. */
  private decor?: THREE.Object3D;
  private readonly ripples = new InstancedBoxes(RIPPLES);
  private readonly buildingsRoot = new THREE.Group();
  private readonly views = new Map<number, BuildingView>();
  private readonly boats: { obj: THREE.Object3D; axis: 'x' | 'z'; speed: number; pos: number }[] = [];
  private readonly rippleState: { axis: 'x' | 'z'; pos: number; lane: number; len: number }[] = [];
  private gridOverlay?: THREE.LineSegments;
  private ghost?: THREE.Group;
  private readonly footprint: THREE.Mesh;
  private readonly selection: THREE.LineLoop;
  private panGoal: THREE.Vector3 | null = null;
  private readonly raidView = new BattleView(this.scene, { x: -HALF, z: -HALF }, 1, (x, z) => this.fighterY(x, z));
  /** Bãi chiến phó bản, dựng khi cần lần đầu. */
  private field?: Battlefield;
  /** Đang xem bãi chiến: chỗ camera nhìn kinh đô trước đó, để trả về sau trận. */
  private cityCam: { target: THREE.Vector3; zoom: number; bounds: { min: number; max: number }; facing: number } | null = null;
  private readonly warning: THREE.Mesh;
  private merchantBoat?: THREE.Object3D;
  /** Gióng đứng trước Điện, đổi dáng khi lớn lên; không còn khi đã bay về trời. */
  private giong?: { obj: THREE.Group; look: GiongLook; key: string };
  /** Sơn Tinh đứng trước Điện ở chương 2, tới khi đánh lui Thủy Tinh thì về núi. */
  private son?: { obj: THREE.Group; look: SonLook; key: string };
  /** An Dương Vương đứng trước Điện ở chương 3, cạnh cột đá thề. */
  private adv?: { obj: THREE.Group; look: AdvLook; key: string; y: number };
  private pillar?: { obj: THREE.Group; key: string };
  /** Cảnh Tết trước Điện và quanh bếp gói bánh, chỉ có lúc Tết mở. */
  private tetDecor?: THREE.Group;
  private tetKey = '';
  /** Rùa Vàng bơi chậm trên sông sau khi đã hiện lên diệt yêu tinh. */
  private turtle?: THREE.Group;
  private shownLevel = 0;
  private wallKey = '';
  private dikeKey = '';
  private citadelKey = '';
  private decorKey = '';
  private time = 0;
  private res: Resolution = 'medium';

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene.background = new THREE.Color(C.sky);
    this.scene.fog = new THREE.Fog(C.sky, 75, 125);
    this.view = new IsoCamera(canvas);
    this.view.onUserMove = () => {
      this.panGoal = null;
    };
    this.view.target.set(wx(DIEN_HOME) + BUILDINGS.dien.w / 2, 0, wz(DIEN_HOME) + BUILDINGS.dien.d / 2);

    this.lights = addSunLights(this.scene, 24, 2048);
    const edge = baseHeights();
    this.scene.add(this.staticTerrain(edge));
    this.scene.add(buildForest(this.outerForestSpots(edge)));
    this.scene.add(this.land.mesh, this.ripples.mesh, this.buildingsRoot);
    // Nước lũ màu phù sa đục, mờ một chút để còn thấy móng nhà dưới nước.
    const floodMat = this.floodWater.mesh.material as THREE.MeshLambertMaterial;
    floodMat.transparent = true;
    floodMat.opacity = 0.88;
    this.floodWater.mesh.renderOrder = 1;
    const previewMat = this.floodPreview.mesh.material as THREE.MeshLambertMaterial;
    previewMat.transparent = true;
    previewMat.opacity = 0.45;
    previewMat.depthWrite = false;
    this.floodPreview.mesh.renderOrder = 2;
    this.scene.add(this.floodWater.mesh, this.floodPreview.mesh);
    this.rain = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.025, 0.55, 0.025),
      new THREE.MeshBasicMaterial({ color: C.rain, transparent: true, opacity: 0.55, depthWrite: false }),
      420,
    );
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);
    for (let i = 0; i < 420; i++) this.drops.push({ x: Math.random() * 40 - 20, y: Math.random() * 16, z: Math.random() * 40 - 20, v: 14 + Math.random() * 6 });
    this.addBoats();
    this.initRipples();
    this.initWisps();

    this.footprint = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    this.footprint.visible = false;
    this.footprint.renderOrder = 2;
    this.scene.add(this.footprint);

    const ring = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, 0.5),
      new THREE.Vector3(-0.5, 0, 0.5),
    ]);
    this.selection = new THREE.LineLoop(ring, new THREE.LineBasicMaterial({ color: 0xffd54a, transparent: true }));
    this.selection.visible = false;
    this.scene.add(this.selection);

    this.warning = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xd0342c, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.warning.visible = false;
    this.warning.renderOrder = 2;
    this.scene.add(this.warning);

    this.resize();
  }

  /**
   * Đất ngoài lưới, hai dòng sông và bờ bên kia. Đất bên này sông kéo dài từng dải theo đúng bậc của ô mép lưới,
   * để mép rừng liền với đất trong lưới.
   */
  private staticTerrain(edge: number[]): THREE.Object3D {
    const group = new THREE.Group();
    const far = 70;
    const river = RIVER_START - HALF;
    const land = new ShapeBuilder();
    const strip = (w: number, d: number, h: number, x: number, z: number, shade: number) => {
      const top = topY(h);
      land.box(w, top + 1, d, C.grassLocked[shade % 3], x, (top - 1) / 2 - 0.02, z);
    };
    // Đất bên này sông (phía rừng): dải phía bắc, dải phía tây, và góc tây bắc.
    for (let x = 0; x < RIVER_START; x++) strip(1, far, edge[x], wx(x) + 0.5, wz(0) - far / 2, x);
    for (let z = 0; z < RIVER_START; z++) strip(far, 1, edge[z * GRID], wx(0) - far / 2, wz(z) + 0.5, z + 1);
    strip(far, far, edge[0], wx(0) - far / 2, wz(0) - far / 2, 0);
    // Bờ bên kia sông Thao (phía đông) và sông Đà (phía nam), lùi ra ngoài lưới cho sông rộng (`FAR_BANK`).
    land.box(far - FAR, 1, 2 * far, C.grassLocked[1], (FAR + far) / 2, -0.52, 0);
    land.box(far + river, 1, far - FAR, C.grassLocked[2], (river - far) / 2, -0.52, (FAR + far) / 2);
    const water = new ShapeBuilder();
    water.box(FAR - river, 1, 2 * far, C.water[0], (river + FAR) / 2, WATER_Y - 0.5, 0);
    water.box(far + river, 1, FAR - river, C.water[1], (river - far) / 2, WATER_Y - 0.5, (river + FAR) / 2);
    const landMesh = land.mesh(groundMaterial);
    landMesh.castShadow = false;
    const waterMesh = water.mesh(groundMaterial);
    waterMesh.castShadow = false;
    this.riverWater = waterMesh;
    // Bờ bên kia sông Thao và sông Đà: mặt nước lũ phẳng phủ kín, chỉ cây cối nhô lên.
    const flood = new ShapeBuilder();
    flood.box(far - FAR, 0.1, 2 * far, C.flood, (FAR + far) / 2, -0.05, 0);
    flood.box(far + river, 0.1, far - FAR, C.flood, (river - far) / 2, -0.05, (FAR + far) / 2);
    const floodMesh = flood.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.88 }));
    floodMesh.castShadow = false;
    floodMesh.visible = false;
    this.farFlood = floodMesh;
    group.add(landMesh, waterMesh, floodMesh);
    return group;
  }

  /** Rừng bao ngoài lưới và cây thưa ở bờ bên kia. */
  private outerForestSpots(edge: number[]): TreeSpot[] {
    const spots: TreeSpot[] = [];
    const rand = seeded(7);
    for (let x = -10; x < FAR_BANK + 8; x++) {
      for (let z = -10; z < FAR_BANK + 8; z++) {
        const insideGrid = x >= 0 && z >= 0 && x < GRID && z < GRID;
        // Sông Thao chảy suốt dọc cạnh đông; sông Đà chảy tới chỗ hợp lưu, bên đông nữa là bờ bên kia sông Thao.
        const inRiver = (x >= RIVER_START && x < FAR_BANK) || (z >= RIVER_START && z < FAR_BANK && x < RIVER_START);
        if (insideGrid || inRiver) continue;
        const farBank = x >= FAR_BANK || z >= FAR_BANK;
        if (rand() > (farBank ? 0.25 : 0.6) * FOREST_DENSITY) continue;
        const cx = wx(x) + 0.5 + (rand() - 0.5) * 0.4;
        const cz = wz(z) + 0.5 + (rand() - 0.5) * 0.4;
        const ex = Math.min(Math.max(x, 0), RIVER_START - 1);
        const ez = Math.min(Math.max(z, 0), RIVER_START - 1);
        const y = farBank ? 0 : topY(edge[ez * GRID + ex]);
        spots.push({ x: cx, y, z: cz, kind: rand() < 0.3 ? 'bamboo' : 'tree', seed: Math.floor(rand() * 1e9) });
      }
    }
    return spots;
  }

  private addBoats(): void {
    const routes: { axis: 'x' | 'z'; speed: number; pos: number }[] = [
      { axis: 'z', speed: 1.1, pos: -30 },
      { axis: 'z', speed: 0.8, pos: 5 },
      { axis: 'x', speed: 0.9, pos: -20 },
    ];
    for (const r of routes) {
      const obj = makeBoat();
      obj.position.y = WATER_Y - 0.02;
      if (r.axis === 'z') {
        obj.position.x = BOAT_LANE;
        obj.rotation.y = -Math.PI / 2;
      } else {
        obj.position.z = BOAT_LANE;
      }
      this.scene.add(obj);
      this.boats.push({ obj, ...r });
    }
  }

  /** Đốm ma trơi xanh lơ lửng dọc bìa rừng phía bắc và phía tây, chỉ hiện trong đêm yêu tinh. */
  private initWisps(): void {
    const rand = seeded(23);
    const geo = new THREE.SphereGeometry(0.16, 8, 6);
    for (let i = 0; i < 22; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i % 3 ? C.ghost : C.ghostDeep, transparent: true, opacity: 0, depthWrite: false });
      const wisp = new THREE.Mesh(geo, mat);
      // Chỗ trong dải giặc xuất phát (0..1 dọc bìa rừng, 0..1 theo chiều sâu), đặt thật ở `placeWisps`.
      wisp.userData.u = rand();
      wisp.userData.v = rand();
      wisp.userData.north = i % 2 === 0;
      wisp.position.y = 1 + rand() * 1.4;
      wisp.userData.base = wisp.position.clone();
      wisp.userData.phase = rand() * Math.PI * 2;
      this.wisps.add(wisp);
    }
    this.wisps.visible = false;
    this.scene.add(this.wisps);
  }

  /**
   * Bóng nắng phủ quanh chỗ đang nhìn (cạnh theo độ phóng), bám theo từng điểm ảnh của bóng để bóng khỏi rung khi kéo.
   * Sương mù lùi xa khi thu nhỏ, để nhìn trọn kinh đô lớn không bị mờ nửa trên.
   */
  private followView(): void {
    const v = this.view;
    const sun = this.lights.sun;
    const extent = THREE.MathUtils.clamp(15 / v.zoom, 15, 48);
    const cam = sun.shadow.camera;
    if (cam.right !== extent) {
      cam.left = -extent;
      cam.right = extent;
      cam.top = extent;
      cam.bottom = -extent;
      cam.updateProjectionMatrix();
    }
    const texel = (2 * extent) / sun.shadow.mapSize.x;
    const tx = Math.round(v.target.x / texel) * texel;
    const tz = Math.round(v.target.z / texel) * texel;
    sun.target.position.set(tx, 0, tz);
    sun.position.set(tx - 10, 24, tz + 14);
    sun.target.updateMatrixWorld();
    const fog = this.scene.fog as THREE.Fog;
    const far = Math.max(0, 1 / v.zoom - 1);
    fog.near = 75 + 40 * far;
    fog.far = 125 + 70 * far;
  }

  /** Đã đặt tâm nhìn ban đầu theo vùng đất chưa. */
  private framed = false;
  private wispKey = '';
  /** Đặt ma trơi dọc dải yêu tinh xuất phát ở bìa rừng phía bắc và phía tây (`raidSpawnBand`). */
  private placeWisps(state: GameState): void {
    const band = raidSpawnBand(state);
    const key = `${band.lo}:${band.from}:${band.to}`;
    if (key === this.wispKey) return;
    this.wispKey = key;
    for (const w of this.wisps.children) {
      const along = band.lo + (w.userData.u as number) * (RIVER_START - band.lo - 1);
      const depth = Math.max(0, band.from - 1) + (w.userData.v as number) * (band.to - band.from + 2);
      const north = w.userData.north as boolean;
      const base = w.userData.base as THREE.Vector3;
      base.set(wx(north ? along : depth), base.y, wz(north ? depth : along));
      w.position.copy(base);
    }
  }

  private initRipples(): void {
    const rand = seeded(11);
    for (let i = 0; i < RIPPLES; i++) {
      this.rippleState.push({
        axis: i % 2 ? 'x' : 'z',
        pos: -40 + rand() * 60,
        lane: RIVER_START - HALF + 0.3 + rand() * (FAR_BANK - RIVER_START - 0.6),
        len: 0.4 + rand() * 0.6,
      });
    }
  }

  get resolution(): Resolution {
    return this.res;
  }

  setResolution(res: Resolution): void {
    this.res = res;
    this.resize();
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Đặt lại mỗi lần đổi cỡ: mở hay gập Fold5, phóng to trang đều có thể đổi devicePixelRatio.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RESOLUTIONS[this.res]));
    this.renderer.setSize(w, h, false);
    this.view.setSize(w, h);
    if (this.inField) this.fitField();
  }

  /** Xóa mọi thứ đã vẽ theo state cũ, dùng khi nạp mã lưu hoặc chơi lại. */
  resetAll(): void {
    for (const v of this.views.values()) this.buildingsRoot.remove(v.group);
    this.views.clear();
    // Khóa không trùng với khóa nào (kể cả khóa rỗng khi không còn đoạn nào): lần vẽ sau gỡ lô cũ, vẽ lại từ đầu.
    this.wallKey = '#';
    this.dikeKey = '#';
    this.citadelKey = '#';
    this.decorKey = '#';
    this.floodKey = '';
    this.heights = [];
    this.shownLevel = 0;
    this.framed = false;
    this.setSelection(null);
    if (this.merchantBoat) this.scene.remove(this.merchantBoat);
    this.merchantBoat = undefined;
  }

  /** Mặt đất (tọa độ thế giới) của ô (x, z). */
  private groundY(x: number, z: number): number {
    const h = this.heights[z * GRID + x];
    return h === undefined ? 0 : topY(h);
  }

  /** Chỗ lính đứng trong trận giữ kinh đô (tọa độ trận): mặt đất, hay ngập nửa người dưới nước. */
  private fighterY(x: number, z: number): number {
    const tx = Math.floor(x);
    const tz = Math.floor(z);
    const inRiver = tx >= RIVER_START || tz >= RIVER_START || tx < 0 || tz < 0;
    const ground = inRiver ? WATER_Y : this.groundY(tx, tz);
    const water = this.state?.raid.water ?? 0;
    const surface = water > 0 ? waterSurface(water) : WATER_Y;
    if (inRiver) return Math.max(WATER_Y, surface) - 0.3;
    return surface > ground ? Math.max(ground, surface - 0.3) : ground;
  }

  /** Cập nhật cảnh theo state. Chỉ dựng lại phần đã thay đổi. */
  sync(state: GameState): void {
    this.state = state;
    const level = dienLevel(state);
    this.placeWisps(state);
    const heightsChanged = state.heights.length !== this.heights.length || state.heights.some((h, i) => h !== this.heights[i]);
    if (heightsChanged) this.heights = [...state.heights];
    if (level !== this.shownLevel || heightsChanged) {
      this.shownLevel = level;
      // Kéo cảnh trong vùng đất đã khai phá, chừa một dải rừng và một phần sông.
      const bounds = { min: wx(areaStart(level)) - 3, max: wx(RIVER_START) + 2 };
      if (this.cityCam) this.cityCam.bounds = bounds;
      else this.view.bounds = bounds;
      // Lần đầu dựng cảnh: nhìn vào giữa vùng đất đã khai phá (Điện ở gần góc sông, nhìn vào Điện thì nửa màn hình là sông).
      if (!this.framed) {
        this.framed = true;
        const mid = wx((areaStart(level) + RIVER_START) / 2);
        this.view.target.set(mid, 0, mid);
        this.view.apply();
      }
      this.rebuildLand(level);
      this.rebuildForest(level);
      this.rebuildGridOverlay(level);
      this.floodKey = '';
    }

    const alive = new Set<number>();
    for (const b of state.buildings) {
      if (b.type === 'luy' || b.type === 'de' || b.type === 'thanh' || isBatchedDecor(b.type)) continue;
      alive.add(b.id);
      const v = this.views.get(b.id);
      if (!v || v.type !== b.type || v.level !== b.level || v.damaged !== !!b.damaged || v.workers !== b.workers || v.x !== b.x || v.z !== b.z) this.createView(b);
      else if (v.ground !== this.heights[b.z * GRID + b.x]) {
        v.ground = this.heights[b.z * GRID + b.x];
        v.group.position.y = topY(v.ground);
      }
    }
    for (const [id, v] of this.views) {
      if (!alive.has(id)) {
        this.buildingsRoot.remove(v.group);
        this.views.delete(id);
      }
    }

    this.syncMerchant(state);
    this.syncGiong(state);
    this.syncSon(state);
    this.syncAdv(state);
    this.syncTurtle(state);
    this.syncTet(state);

    const walls = state.buildings.filter((b) => b.type === 'luy');
    // Khóa có cả ô đứng: dời một đoạn lũy sang chỗ khác thì vẽ lại.
    const key = walls.map((b) => `${b.id}:${b.x}:${b.z}:${b.level}:${b.damaged ? 1 : 0}:${this.heights[b.z * GRID + b.x]}`).join(',');
    if (key !== this.wallKey) {
      this.wallKey = key;
      if (this.walls) this.scene.remove(this.walls);
      const spots: WallSpot[] = walls.map((w) => ({
        x: wx(w.x) + 0.5,
        y: this.groundY(w.x, w.z),
        z: wz(w.z) + 0.5,
        seed: w.x * 92821 + w.z * 68917,
        level: w.level,
        damaged: !!w.damaged,
      }));
      this.walls = buildWalls(spots);
      this.scene.add(this.walls);
    }

    const dikes = state.buildings.filter((b) => b.type === 'de');
    const dkey = dikes.map((b) => `${b.id}:${b.x}:${b.z}:${b.level}:${b.damaged ? 1 : 0}:${this.heights[b.z * GRID + b.x]}`).join(',');
    if (dkey !== this.dikeKey) {
      this.dikeKey = dkey;
      if (this.dikes) this.scene.remove(this.dikes);
      const spots: DikeSpot[] = dikes.map((d) => ({ x: wx(d.x) + 0.5, y: this.groundY(d.x, d.z), z: wz(d.z) + 0.5, level: d.level, damaged: !!d.damaged }));
      this.dikes = buildDikes(spots);
      this.scene.add(this.dikes);
      this.floodKey = '';
    }

    const citadel = state.buildings.filter((b) => b.type === 'thanh');
    const ckey = citadel.map((b) => `${b.id}:${b.x}:${b.z}:${b.damaged ? 1 : 0}:${this.heights[b.z * GRID + b.x]}`).join(',');
    if (ckey !== this.citadelKey) {
      this.citadelKey = ckey;
      if (this.citadel) this.scene.remove(this.citadel);
      const spots: CitadelSpot[] = citadel.map((c) => ({
        x: wx(c.x) + 0.5,
        y: this.groundY(c.x, c.z),
        z: wz(c.z) + 0.5,
        seed: c.x * 31 + c.z * 17,
        damaged: !!c.damaged,
      }));
      this.citadel = buildCitadel(spots);
      this.scene.add(this.citadel);
    }
    this.syncDecor(state);
    this.syncFlood(state);
  }

  /**
   * Đường đi và đồ trang trí một ô: vẽ lại cả lô khi có ô thêm, bớt, đổi loại hay đổi bậc đất. Mép ô đường không giáp
   * ô cùng loại thì có viền.
   */
  private syncDecor(state: GameState): void {
    const small = state.buildings.filter((b) => isBatchedDecor(b.type));
    const key = small.map((b) => `${b.id}:${b.type}:${b.x}:${b.z}:${this.heights[b.z * GRID + b.x]}`).join(',');
    if (key === this.decorKey) return;
    this.decorKey = key;
    if (this.decor) {
      this.scene.remove(this.decor);
      disposeDecor(this.decor);
    }
    const roadAt = new Map<number, BuildingType>();
    for (const b of small) if (isRoad(b.type)) roadAt.set(b.z * GRID + b.x, b.type);
    const spots: DecorSpot[] = small.map((b) => {
      const spot: DecorSpot = { type: b.type, x: wx(b.x) + 0.5, y: this.groundY(b.x, b.z), z: wz(b.z) + 0.5, seed: b.x * 92821 + b.z * 68917 };
      if (isRoad(b.type)) {
        const same = (dx: number, dz: number) => roadAt.get((b.z + dz) * GRID + b.x + dx) === b.type;
        spot.open = [!same(0, 1), !same(0, -1), !same(1, 0), !same(-1, 0)];
      }
      return spot;
    });
    this.decor = buildDecor(spots);
    this.scene.add(this.decor);
  }

  /** Gọi mỗi khung hình: nước lũ dâng, rút mượt theo state mà không phải dựng lại cả cảnh. */
  updateFlood(state: GameState): void {
    if (this.state !== state) return;
    this.syncFlood(state);
  }

  /** Nước lũ phủ các ô đang ngập, nước sông dâng theo; mưa giông khi Thủy Tinh dâng nước. */
  private syncFlood(state: GameState): void {
    const raid = state.raid;
    this.stormGoal = raid.foe === 'thuy' && raid.phase !== 'idle' ? 1 : raid.water > 0.02 ? 0.5 : 0;
    this.nightGoal = raid.foe === 'yeu' && raid.phase !== 'idle' ? 1 : 0;
    const water = raid.water;
    const key = water > 0.005 ? `${water.toFixed(2)}:${state.buildings.filter((b) => b.type === 'de' && b.damaged).length}` : '';
    if (key === this.floodKey) return;
    this.floodKey = key;
    const surface = waterSurface(water);
    if (this.riverWater) this.riverWater.position.y = Math.max(0, surface - WATER_Y);
    if (this.farFlood) {
      this.farFlood.visible = surface > 0.02;
      this.farFlood.position.y = surface;
    }
    this.floodWater.begin();
    if (water > 0.005) {
      const wet = floodMap(state, water, dienLevel(state));
      for (let z = 0; z < RIVER_START; z++) {
        for (let x = 0; x < RIVER_START; x++) {
          if (!wet[z * GRID + x]) continue;
          const top = this.groundY(x, z);
          if (surface <= top + 0.01) continue;
          const shade = (x * 5 + z * 3) % 2 ? C.flood : C.floodDeep;
          this.floodWater.add(1, surface - top, 1, shade, wx(x) + 0.5, (surface + top) / 2, wz(z) + 0.5);
        }
      }
    }
    this.floodWater.end();
  }

  /** Tô xanh những ô sẽ ngập khi lũ dâng tới `level`; null để tắt. */
  setFloodPreview(state: GameState | null, level = 0): void {
    this.floodPreview.begin();
    if (state && level > 0) {
      const wet = floodMap(state, level, dienLevel(state));
      for (let z = 0; z < RIVER_START; z++) {
        for (let x = 0; x < RIVER_START; x++) {
          if (!wet[z * GRID + x]) continue;
          this.floodPreview.add(0.96, 0.04, 0.96, 0x3f8fd0, wx(x) + 0.5, this.groundY(x, z) + 0.04, wz(z) + 0.5);
        }
      }
    }
    this.floodPreview.end();
  }

  /** Thuyền buôn lớn neo cạnh bến đầu tiên trong lúc đang đậu. */
  private syncMerchant(state: GameState): void {
    const ben = state.buildings.find((b) => b.type === 'ben');
    const here = !!state.merchant.visit && !!ben;
    // Bến được dời đi thì thuyền buôn neo lại cạnh bến ở chỗ mới.
    const at = ben ? `${ben.x}:${ben.z}` : '';
    if (this.merchantBoat && (!here || this.merchantBoat.userData.at !== at)) {
      this.scene.remove(this.merchantBoat);
      this.merchantBoat = undefined;
    }
    if (here && !this.merchantBoat && ben) {
      const boat = makeBoat();
      boat.scale.setScalar(1.5);
      const def = BUILDINGS.ben;
      const east = ben.x + def.w === RIVER_START;
      const cx = wx(ben.x) + def.w / 2;
      const cz = wz(ben.z) + def.d / 2;
      // Thuyền buôn ghé dọc dòng, ngoài các thuyền neo của bến (`benDocks` chìa ra chừng 2,8 ô từ bờ), cách bờ
      // `MERCHANT_OUT` ô, còn chừa luồng thuyền qua lại sát bờ bên kia.
      const out = def.w / 2 + MERCHANT_OUT;
      boat.position.set(east ? cx + out : cx - 0.9, WATER_Y - 0.02, east ? cz - 0.9 : cz + out);
      boat.rotation.y = east ? -Math.PI / 2 : 0;
      boat.userData.at = at;
      this.scene.add(boat);
      this.merchantBoat = boat;
    }
  }

  private createView(b: Building): void {
    const old = this.views.get(b.id);
    if (old) this.buildingsRoot.remove(old.group);
    const def = BUILDINGS[b.type];
    const group = this.makeBuilding(b.type, b.level);
    if (b.type === 'ben') group.rotation.y = b.x + def.w === RIVER_START ? Math.PI / 2 : 0;
    const ground = this.heights[b.z * GRID + b.x] ?? 0;
    group.position.set(wx(b.x) + def.w / 2, topY(ground), wz(b.z) + def.d / 2);
    group.userData.buildingId = b.id;
    // Dân làm việc theo nghề; Điện có Lạc hầu, từ cấp 2 có thêm lính gác. Công trình hư thì không ai làm.
    // Công trình móng mới (`congTrinh/`) cho chỗ đứng theo bản vẽ, mô hình không phóng nên người giữ cỡ
    // `PERSON_SCALE`. Dáng cũ thì chỗ đứng thu theo hệ số thu tâm (`spread`, xem buildings.ts) và người thu lại
    // theo cỡ đã phóng theo móng (`foot`).
    const people: WorkerView[] = [];
    const moi = CONG_TRINH[b.type];
    const spots: Spot[] = moi ? moi.spots(b.level) : (SPOTS[b.type] ?? []);
    const n = b.damaged ? 0 : b.type === 'dien' ? spots.length : peopleCount(b, spots.length);
    const spread = moi ? 1 : ((group.userData.spread as number | undefined) ?? 1);
    const personScale = moi ? PERSON_SCALE : (0.85 * spread) / ((group.userData.foot as number | undefined) ?? 1);
    for (let i = 0; i < n; i++) {
      const spot = { ...spots[i], x: spots[i].x * spread, z: spots[i].z * spread };
      const obj = makeWorker(spot.job);
      obj.position.set(spot.x, spot.y, spot.z);
      obj.rotation.y = spot.ry;
      obj.scale.setScalar(personScale);
      group.add(obj);
      people.push({ obj, spot, phase: b.id * 1.7 + i * 2.1 });
    }
    if (moi?.docks) {
      // Thuyền neo theo bến, nổi trên mặt sông.
      const waterY = (WATER_Y - 0.02 - topY(ground)) / group.scale.y;
      for (const d of moi.docks(b.level)) {
        const boat = d.kind === 'trader' ? makeTradeBoat() : makeBoat();
        boat.position.set(d.x, waterY, d.z);
        boat.rotation.y = d.ry;
        if (d.scale) boat.scale.setScalar(d.scale);
        boat.userData.dock = waterY;
        group.add(boat);
      }
    }
    if (b.damaged) {
      // Công trình bị phá: nghiêng đổ, khói đen bốc lên.
      group.rotation.z = 0.12;
      group.scale.y *= 0.85;
      const smoke = new THREE.Group();
      smoke.userData.smoke = true;
      const mat = new THREE.MeshBasicMaterial({ color: C.smoke, transparent: true, opacity: 0.5, depthWrite: false });
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), mat);
        puff.userData.phase = i / 4;
        smoke.add(puff);
      }
      smoke.position.y = 1.2;
      group.add(smoke);
    }
    this.buildingsRoot.add(group);
    this.views.set(b.id, { group, type: b.type, level: b.level, damaged: !!b.damaged, workers: b.workers, x: b.x, z: b.z, ground, people, popAge: 0, baseScale: group.scale.x });
  }

  /** Mô hình công trình đặt vừa móng (`lotModel`): vẽ trên móng mới, hay dáng cũ phóng theo móng. */
  private makeBuilding(type: BuildingType, level: number): THREE.Group {
    return lotModel(type, level);
  }


  /** Đất trong lưới: mỗi ô một cột đất cao theo bậc, bậc cao sáng màu hơn một chút. */
  private rebuildLand(level: number): void {
    this.land.begin();
    this.landTiles.length = 0;
    const c = new THREE.Color();
    for (let x = 0; x < RIVER_START; x++) {
      for (let z = 0; z < RIVER_START; z++) {
        const open = isUnlocked(x, z, level);
        const palette = open ? C.grass : C.grassLocked;
        const h = Math.max(this.heights[z * GRID + x] ?? 0, 0);
        c.setHex(palette[(x * 7 + z * 13) % 3]).offsetHSL(0, -0.02 * h, 0.022 * h - 0.02);
        const top = topY(h);
        this.land.add(1, top + 0.5, 1, c.getHex(), wx(x) + 0.5, (top - 0.5) / 2, wz(z) + 0.5);
        this.landTiles.push(z * GRID + x);
      }
    }
    this.land.end();
    // Đất đổi bậc thì khối bao cũng đổi: tính lại khi chạm lần sau.
    this.land.mesh.boundingSphere = null;
    this.land.mesh.boundingBox = null;
  }

  private rebuildForest(level: number): void {
    if (this.forest) this.scene.remove(this.forest);
    const spots: TreeSpot[] = [];
    const lo = areaStart(level);
    for (let x = 0; x < RIVER_START; x++) {
      for (let z = 0; z < RIVER_START; z++) {
        if (isUnlocked(x, z, level)) continue;
        const rand = seeded(x * 73856093 + z * 19349663);
        // Chừa một dải đất trống sát vùng đã mở cho dễ nhìn.
        const nearEdge = x >= lo - 1 && z >= lo - 1;
        if (rand() > (nearEdge ? 0.25 : 0.65) * FOREST_DENSITY) continue;
        const cx = wx(x) + 0.5 + (rand() - 0.5) * 0.3;
        const cz = wz(z) + 0.5 + (rand() - 0.5) * 0.3;
        spots.push({ x: cx, y: this.groundY(x, z), z: cz, kind: rand() < 0.35 ? 'bamboo' : 'tree', seed: Math.floor(rand() * 1e9) });
      }
    }
    this.forest = buildForest(spots);
    this.scene.add(this.forest);
  }

  private rebuildGridOverlay(level: number): void {
    const visible = this.gridOverlay?.visible ?? false;
    if (this.gridOverlay) {
      this.scene.remove(this.gridOverlay);
      this.gridOverlay.geometry.dispose();
    }
    const lo = areaStart(level);
    const pts: THREE.Vector3[] = [];
    // Viền từng ô ở đúng mặt đất của ô, để lưới bám theo bậc đất.
    for (let x = lo; x < RIVER_START; x++) {
      for (let z = lo; z < RIVER_START; z++) {
        const y = this.groundY(x, z) + 0.02;
        const x0 = wx(x) + 0.03;
        const x1 = wx(x + 1) - 0.03;
        const z0 = wz(z) + 0.03;
        const z1 = wz(z + 1) - 0.03;
        pts.push(new THREE.Vector3(x0, y, z0), new THREE.Vector3(x1, y, z0), new THREE.Vector3(x1, y, z0), new THREE.Vector3(x1, y, z1));
        pts.push(new THREE.Vector3(x1, y, z1), new THREE.Vector3(x0, y, z1), new THREE.Vector3(x0, y, z1), new THREE.Vector3(x0, y, z0));
      }
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    this.gridOverlay = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.35 }));
    this.gridOverlay.visible = visible;
    this.scene.add(this.gridOverlay);
  }

  showGrid(on: boolean): void {
    if (this.gridOverlay) this.gridOverlay.visible = on;
  }

  /** Hiệu ứng nảy lên khi vừa xây hoặc nâng cấp. */
  pop(id: number): void {
    const v = this.views.get(id);
    if (v) v.popAge = 0.0001;
  }

  /** Ô lưới dưới vị trí màn hình, hoặc null nếu chạm ra ngoài lưới. Chạm trúng mặt đất bậc nào thì lấy ô đó. */
  pickTile(clientX: number, clientY: number): { x: number; z: number } | null {
    const hit = this.view.setRay(clientX, clientY).intersectObject(this.land.mesh, false)[0];
    if (hit && hit.instanceId !== undefined) {
      const i = this.landTiles[hit.instanceId];
      if (i !== undefined) return { x: i % GRID, z: Math.floor(i / GRID) };
    }
    const p = this.view.groundPoint(clientX, clientY);
    if (!p) return null;
    const x = Math.floor(p.x + HALF);
    const z = Math.floor(p.z + HALF);
    return x >= 0 && z >= 0 && x < GRID && z < GRID ? { x, z } : null;
  }

  /**
   * Chỗ tướng đứng trong sân chầu của Điện, bên phải lối giữa (khối `a` trong bản vẽ Điện): nơi Gióng lúc nhỏ,
   * Sơn Tinh lúc cầu hôn và An Dương Vương đứng. Móng Điện phẳng nên đứng cùng độ cao mặt sân.
   */
  private heroSpot(dien: Building): { x: number; y: number; z: number } {
    const a = DIEN_LOT.zone('a');
    const def = BUILDINGS.dien;
    return { x: wx(dien.x) + def.w / 2 + a.x - 0.15, y: this.groundY(dien.x, dien.z) + 0.05, z: wz(dien.z) + def.d / 2 + a.z };
  }

  /** Chỗ tướng đứng giữa sân doanh trại tướng ấy chỉ huy (không chỉ huy trại nào thì trại của Lạc tướng). Chưa có doanh trại thì null. */
  private barracksSpot(state: GameState, tuong: TuongId): { x: number; y: number; z: number } | null {
    const b = heroPost(state, tuong);
    if (!b) return null;
    const def = BUILDINGS.doanhTrai;
    return { x: wx(b.x) + def.w / 2 + DOANH_TRAI_HERO.x, y: this.groundY(b.x, b.z) + 0.08, z: wz(b.z) + def.d / 2 + DOANH_TRAI_HERO.z };
  }

  /**
   * Chỗ đứng của tướng: tướng đã cùng ra trận (Gióng tráng sĩ, Sơn Tinh đã rước dâu) ở doanh trại;
   * Gióng lúc nhỏ ở trước Điện cho dân nuôi, Sơn Tinh lúc cầu hôn đứng chầu trước Điện.
   */
  private heroHome(state: GameState, tuong: TuongId, atBarracks: boolean): { x: number; y: number; z: number } | null {
    if (atBarracks) {
      const spot = this.barracksSpot(state, tuong);
      if (spot) return spot;
    }
    const dien = state.buildings.find((b) => b.type === 'dien');
    return dien ? this.heroSpot(dien) : null;
  }

  /** Gióng lúc nhỏ ở trước Điện, bên phải bậc lên; thành tráng sĩ thì về doanh trại. */
  private syncGiong(state: GameState): void {
    const look = giongLook(state);
    const spot = this.heroHome(state, 'giong', look === 'trangSi');
    const key = look && spot ? `${look}:${spot.x}:${spot.y}:${spot.z}` : '';
    if (this.giong?.key === key) return;
    if (this.giong) this.scene.remove(this.giong.obj);
    this.giong = undefined;
    if (!look || !spot) return;
    const obj = makeGiong(look);
    obj.scale.setScalar(look === 'trangSi' ? 0.9 : look === 'be' ? 1.1 : 1);
    obj.position.set(spot.x, spot.y, spot.z);
    obj.rotation.y = look === 'trangSi' ? -Math.PI / 2 + 0.5 : 0.3;
    this.scene.add(obj);
    this.giong = { obj, look, key };
  }

  /**
   * Sơn Tinh lúc cầu hôn đứng trên mỏm đá trước Điện; rước Mị Nương rồi thì cùng ra trận, ở doanh trại.
   * Đánh lui Thủy Tinh thì về núi.
   */
  private syncSon(state: GameState): void {
    const look = sonLook(state);
    const camp = look === 'trangSi' && !!this.barracksSpot(state, 'sonTinh');
    const spot = this.heroHome(state, 'sonTinh', look === 'trangSi');
    const key = look && spot ? `${look}:${camp}:${spot.x}:${spot.y}:${spot.z}` : '';
    if (this.son?.key === key) return;
    if (this.son) this.scene.remove(this.son.obj);
    this.son = undefined;
    if (!look || !spot) return;
    const obj = makeSonTinh({ rock: !camp });
    obj.scale.setScalar(0.95);
    obj.position.set(spot.x, spot.y, spot.z);
    obj.rotation.y = 0.4;
    this.scene.add(obj);
    this.son = { obj, look, key };
  }

  /**
   * An Dương Vương đứng trước Điện ở chương 3: chưa có nỏ thần thì cầm rìu đồng, có rồi thì cầm nỏ thần.
   * Cạnh ngài là cột đá thề Thục Phán dựng khi nhận ngôi, thề giữ đền thờ các vua Hùng.
   */
  private syncAdv(state: GameState): void {
    const look = advLook(state);
    const dien = state.buildings.find((b) => b.type === 'dien');
    const spot = dien ? this.heroSpot(dien) : null;
    const key = look && spot ? `${look}:${spot.x}:${spot.y}:${spot.z}` : '';
    if (this.adv?.key !== key) {
      if (this.adv) this.scene.remove(this.adv.obj);
      this.adv = undefined;
      if (look && spot) {
        const obj = makeAnDuong({ crossbow: look === 'noThan' });
        obj.scale.setScalar(0.9);
        obj.position.set(spot.x, spot.y, spot.z);
        obj.rotation.y = 0.4;
        this.scene.add(obj);
        this.adv = { obj, look, key, y: spot.y };
      }
    }
    const pkey = inChapter3(state) && spot ? `${spot.x}:${spot.y}:${spot.z}` : '';
    if (this.pillar?.key === pkey) return;
    if (this.pillar) this.scene.remove(this.pillar.obj);
    this.pillar = undefined;
    if (!pkey || !spot) return;
    const obj = this.makePillar();
    // Cột đá đứng sau lưng tướng, phía phải, còn trong sân Điện.
    obj.position.set(spot.x + 0.55, spot.y, spot.z - 0.35);
    obj.rotation.y = 0.3;
    this.scene.add(obj);
    this.pillar = { obj, key: pkey };
  }

  /**
   * Cảnh Tết, chỉ lúc Tết mở, trong sân chầu của Điện (khối `e`, `m` trong bản vẽ Điện): cây nêu bên trái lối giữa,
   * dây cờ đuôi nheo căng từ ngọn nêu tới hai cột cờ hai bên lối, mâm bánh đã dâng bày trước thềm (chỉ loại đã dâng),
   * và một người ngồi chiếu gói bánh trước bếp. Không có pháo. Tướng và cột đá thề đứng bên phải lối.
   */
  private syncTet(state: GameState): void {
    const dien = state.buildings.find((b) => b.type === 'dien');
    const bep = state.buildings.find((b) => b.type === 'bep' && !b.damaged);
    const o = state.tet.offered;
    const h = (b: Building) => this.heights[b.z * GRID + b.x] ?? 0;
    const key = dien && tetOpen(state) ? [dien.x, dien.z, dien.level, h(dien), o.chung, o.giay, bep ? `${bep.x},${bep.z},${bep.level},${h(bep)}` : '-'].join(':') : '';
    if (key === this.tetKey) return;
    this.tetKey = key;
    if (this.tetDecor) this.scene.remove(this.tetDecor);
    this.tetDecor = undefined;
    if (!key || !dien) return;
    const root = new THREE.Group();
    // Tọa độ trong bản vẽ Điện (gốc ở tâm móng) đổi ra tọa độ cảnh. Móng Điện phẳng nên mặt sân cùng một độ cao.
    const def = BUILDINGS.dien;
    const cx = wx(dien.x) + def.w / 2;
    const cz = wz(dien.z) + def.d / 2;
    const y = topY(h(dien)) + 0.05;
    // Dây cờ buộc vào đầu hai cột cờ hai bên lối (Điện cấp 1 chưa có cột cờ thì buộc vào hai cọc mốc góc trước).
    const flagH = dien.level >= 6 ? 2.7 : 2.4;
    const [left, right] =
      dien.level >= 2
        ? DIEN_LOT.groups('2').map((f) => new THREE.Vector3(cx + f.x - 0.2, y + flagH - 0.1, cz + f.z))
        : [-1, 1].map((sx) => new THREE.Vector3(cx + sx * 2.3, y + 0.7, cz + 2.3));
    const e = DIEN_LOT.zone('e');
    const neu = this.makeNeu();
    neu.position.set(cx + e.x, y, cz + e.z);
    neu.rotation.y = Math.PI / 4;
    root.add(neu);
    const top = new THREE.Vector3(cx + e.x, y + NEU_H - 0.3, cz + e.z);
    root.add(this.makeFlagLine(top, left, 4));
    root.add(this.makeFlagLine(top, right, 9));
    if (o.chung || o.giay) {
      const m = DIEN_LOT.zone('m');
      const tray = this.makeTray(o.chung, o.giay);
      tray.position.set(cx + m.x, y, cz + m.z);
      tray.rotation.y = Math.PI / 4;
      root.add(tray);
    }
    if (bep) {
      // Một người ngồi xếp bằng ở mép chiếu gói bánh trước bếp (chiếu ở tọa độ bếp -0.3, 0.55), quay vào chiếu.
      const w = makeWorker('phuNu', true);
      w.scale.setScalar(0.85);
      const bk = footScale('bep');
      w.position.set(wx(bep.x) + BUILDINGS.bep.w / 2 - 0.3 * bk, topY(h(bep)) + 0.08, wz(bep.z) + BUILDINGS.bep.d / 2 + 0.88 * bk);
      w.rotation.y = Math.PI;
      root.add(w);
    }
    this.scene.add(root);
    this.tetDecor = root;
  }

  /** Cây nêu: cây tre cao, ngọn còn chùm lá, vòng tre, thanh ngang treo khánh đất nung, dải vải đỏ. Mặt chính theo trục x. */
  private makeNeu(): THREE.Group {
    const m = new ToonModel(inkThin);
    const p = m.plain;
    p.sphere(0.22, C.earthDark, 0, 0.02, 0, [1, 0.35, 1], 8);
    p.cyl(0.05, 0.07, NEU_H, C.bamboo, 0, NEU_H / 2, 0, undefined, 6);
    for (let i = 1; i < 10; i++) p.cyl(0.062, 0.062, 0.035, C.thatchDark, 0, i * 0.42, 0, undefined, 6);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const leaf = new THREE.ConeGeometry(0.05, 0.62, 4);
      leaf.scale(1, 1, 0.3);
      leaf.rotateX(1.95 + (i % 2) * 0.25);
      leaf.rotateY(a);
      p.add(leaf, i % 2 ? C.bamboo : 0x6f8f44, Math.sin(a) * 0.2, NEU_H - 0.08, Math.cos(a) * 0.2);
    }
    p.add(new THREE.TorusGeometry(0.2, 0.02, 5, 16), C.bamboo, 0, NEU_H - 0.42, 0);
    p.cyl(0.02, 0.02, 0.8, C.bamboo, 0, NEU_H - 0.7, 0, [0, 0, Math.PI / 2], 4);
    for (const x of [-0.36, -0.12, 0.12, 0.36]) {
      p.cyl(0.005, 0.005, 0.2, C.ink, x, NEU_H - 0.8, 0, undefined, 3);
      p.cone(0.08, 0.14, KHANH, x, NEU_H - 0.97, 0, [Math.PI, 0, 0], 3);
    }
    m.band.box(0.14, 1.4, 0.015, C.red, 0.09, NEU_H - 1.5, 0.06, [0, 0, -0.06]);
    m.band.box(0.1, 1.0, 0.015, C.bronzeLight, -0.09, NEU_H - 1.3, 0.06, [0, 0, 0.08]);
    return m.group();
  }

  /** Dây cờ đuôi nheo nhiều màu võng xuống giữa hai điểm (tọa độ cảnh). */
  private makeFlagLine(a: THREE.Vector3, b: THREE.Vector3, flags: number): THREE.Group {
    const m = new ToonModel(inkThin);
    const p = m.plain;
    const colors = [C.red, C.bronzeLight, C.indigo, 0x6f8f44, C.cream];
    const n = flags * 2;
    const sag = a.distanceTo(b) * 0.1;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0)));
    }
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const d = new THREE.Vector3().subVectors(pts[i + 1], pts[i]);
      const mid = new THREE.Vector3().addVectors(pts[i], pts[i + 1]).multiplyScalar(0.5);
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()));
      p.cyl(0.01, 0.01, d.length(), C.woodDark, mid.x, mid.y, mid.z, [e.x, e.y, e.z], 4);
    }
    // Cờ tam giác mũi chúc xuống, mặt cờ nằm dọc theo dây.
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    for (let i = 1, k = 0; i < n; i += 2, k++) {
      const flag = new THREE.ConeGeometry(0.11, 0.3, 3);
      flag.rotateX(Math.PI);
      flag.scale(1, 1, 0.2);
      flag.rotateY(yaw - Math.PI / 2);
      p.add(flag, colors[k % colors.length], pts[i].x, pts[i].y - 0.15, pts[i].z);
    }
    return m.group();
  }

  /** Mâm đồng trên chân gỗ, bày chồng bánh chưng và bánh giầy đã dâng. Mặt chính theo trục x. */
  private makeTray(chung: boolean, giay: boolean): THREE.Group {
    const m = new ToonModel(inkThin);
    const p = m.plain;
    p.cyl(0.16, 0.22, 0.26, C.woodDark, 0, 0.13, 0, undefined, 10);
    p.cyl(0.46, 0.4, 0.05, C.bronze, 0, 0.285, 0, undefined, 18);
    p.add(new THREE.TorusGeometry(0.45, 0.02, 5, 20), C.bronzeDark, 0, 0.31, 0, [Math.PI / 2, 0, 0]);
    const both = chung && giay;
    const y = 0.31;
    if (chung) {
      const x0 = both ? -0.2 : 0;
      for (const dx of [-0.08, 0.08]) for (const dz of [-0.08, 0.08]) banhChung(p, x0 + dx, y, dz);
      banhChung(p, x0, y + 0.08, 0, 1, Math.PI / 4);
    }
    if (giay) {
      const x0 = both ? 0.2 : 0;
      for (const dx of [-0.075, 0.075]) for (const dz of [-0.075, 0.075]) banhGiay(p, x0 + dx, y, dz);
      banhGiay(p, x0, y + 0.05, 0);
    }
    return m.group();
  }

  /** Cột đá thề: trụ đá vuông trên bệ, mặt khắc vạch chữ, đỉnh vát. */
  private makePillar(): THREE.Group {
    const b = new ShapeBuilder();
    b.box(0.42, 0.08, 0.42, C.rockDark, 0, 0.04, 0);
    b.box(0.24, 0.9, 0.24, C.rock, 0, 0.53, 0);
    b.cone(0.18, 0.16, C.rockDark, 0, 1.06, 0, [0, Math.PI / 4, 0], 4);
    for (let i = 0; i < 5; i++) b.box(0.12, 0.02, 0.01, C.ink, 0, 0.3 + i * 0.12, 0.122);
    const g = new THREE.Group();
    const mesh = b.mesh(toon);
    g.add(mesh, outlineOf(mesh.geometry, inkThin));
    return g;
  }

  /** Rùa Vàng bơi qua bơi lại trên sông phía nam kinh đô, từ khi hiện lên diệt yêu tinh. */
  private syncTurtle(state: GameState): void {
    const want = ruaVangCame(state);
    if (want && !this.turtle) {
      this.turtle = makeRuaVang();
      this.turtle.scale.setScalar(0.55);
      this.scene.add(this.turtle);
    } else if (!want && this.turtle) {
      this.scene.remove(this.turtle);
      this.turtle = undefined;
    }
  }

  /** Người chơi chạm vào tướng (ở doanh trại hay trước Điện): Gióng, Sơn Tinh hay An Dương Vương. */
  pickHero(clientX: number, clientY: number): 'giong' | 'son' | 'adv' | null {
    const ray = this.view.setRay(clientX, clientY);
    if (this.giong && ray.intersectObject(this.giong.obj, true).length) return 'giong';
    if (this.son && ray.intersectObject(this.son.obj, true).length) return 'son';
    if (this.adv && ray.intersectObject(this.adv.obj, true).length) return 'adv';
    return null;
  }

  /** Id công trình (trừ lũy tre, đê) dưới vị trí chạm, ưu tiên phần nhô cao như mái nhà. */

  pickBuildingId(clientX: number, clientY: number): number | null {
    const ray = this.view.setRay(clientX, clientY);
    const hits = ray.intersectObjects(this.buildingsRoot.children, true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o && o.userData.buildingId === undefined) o = o.parent;
      if (o) return o.userData.buildingId as number;
    }
    return null;
  }

  /** Vị trí màn hình của tâm ô (x, z). Dùng cho kiểm thử tự động. */
  tileToScreen(x: number, z: number): { x: number; y: number } {
    const p = new THREE.Vector3(wx(x) + 0.5, this.groundY(x, z), wz(z) + 0.5).project(this.view.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
  }

  screenCenterTile(): { x: number; z: number } {
    return { x: Math.floor(this.view.target.x + HALF), z: Math.floor(this.view.target.z + HALF) };
  }

  /** Lướt camera để công trình hiện ra ở vị trí màn hình (screenX, screenY), ví dụ phần không bị bảng che. */
  focusOn(b: Building, screenX: number, screenY: number): void {
    const def = BUILDINGS[b.type];
    const at = this.view.groundPoint(screenX, screenY);
    if (!at) return;
    const goal = this.view.target.clone();
    goal.x += wx(b.x) + def.w / 2 - at.x;
    goal.z += wz(b.z) + def.d / 2 - at.z;
    this.panGoal = goal;
  }

  /** Động tác theo nghề (people.ts): cúi bổ cuốc, bổ đá, quai búa, đi qua đi lại mang hàng, đứng gác nhìn quanh. */
  private animateWorker(w: WorkerView, t: number): void {
    const { obj, spot, phase } = w;
    const pose = obj.userData.pose as Poser | undefined;
    const walk = spot.job === 'buon' || spot.job === 'giuKho' ? (spot.walk ?? 0) : 0;
    if (walk) {
      const k = t * 0.7 + phase;
      obj.position.x = spot.x + Math.sin(k) * walk;
      obj.rotation.y = Math.cos(k) >= 0 ? Math.PI / 2 : -Math.PI / 2;
      pose?.({ act: 'walk', phase: t * 8 + phase, stride: 0.45, time: t + phase });
      return;
    }
    if (spot.job === 'phuNu' || spot.job === 'lacHau' || spot.job === 'linhGac') obj.rotation.y = spot.ry + 0.25 * Math.sin(t * 0.5 + phase);
    pose?.({ act: 'stand', time: t + phase });
  }

  /** Dải đỏ nhấp nháy ở bìa rừng (giặc Ân) hay trên mặt sông (thủy quái) phía giặc sắp tới; null để tắt. */
  setRaidWarning(side: RaidSide | null): void {
    this.warning.visible = !!side;
    if (!side) return;
    const len = RIVER_START;
    // Giặc trên bộ ra từ dải ở bìa rừng (`raidSpawnBand`): dải đỏ phủ đúng chỗ ấy.
    const band = this.state ? raidSpawnBand(this.state) : { lo: FOREST_BAND, from: 0.6, to: 2 };
    const along = RIVER_START - band.lo;
    const deep = Math.max(3, band.to - band.from + 2);
    const mid = (band.from + band.to) / 2;
    if (side === 'bac') {
      this.warning.scale.set(along, 1, deep);
      this.warning.position.set(wx(band.lo) + along / 2, 1.0, wz(0) + mid);
    } else if (side === 'tay') {
      this.warning.scale.set(deep, 1, along);
      this.warning.position.set(wx(0) + mid, 1.0, wz(band.lo) + along / 2);
    } else if (side === 'nam') {
      this.warning.scale.set(len, 1, 2.6);
      this.warning.position.set(wx(0) + len / 2, WATER_Y + 0.08, wz(RIVER_START) + 1.4);
    } else {
      this.warning.scale.set(2.6, 1, len);
      this.warning.position.set(wx(RIVER_START) + 1.4, WATER_Y + 0.08, wz(0) + len / 2);
    }
  }

  /**
   * Xoay cảnh kinh đô một nấc 90° quanh tâm nhìn (1: theo chiều kim đồng hồ, −1: ngược lại).
   * Ở bãi chiến thì không xoay. Trả về hướng nhìn mới (0–3).
   */
  rotateView(dir: 1 | -1): number {
    if (!this.inField) {
      // Xoay quanh đúng chỗ đang nhìn: bỏ lướt camera dở dang.
      this.panGoal = null;
      this.view.rotate(dir);
    }
    return this.view.facing;
  }

  /** Lướt camera tới phía giặc tới. */
  lookAtEdge(side: RaidSide): void {
    const band = this.state ? raidSpawnBand(this.state) : { lo: FOREST_BAND, from: 0.6, to: 2 };
    const along = (band.lo + RIVER_START) / 2;
    const deep = band.to + 3;
    const bank = RIVER_START - 4;
    const at: Record<RaidSide, [number, number]> = { bac: [along, deep], tay: [deep, along], nam: [along, bank], dong: [bank, along] };
    const [x, z] = at[side];
    this.panGoal = new THREE.Vector3(wx(x), 0, wz(z));
  }

  /** Vẽ lính hai bên của trận giữ kinh đô; null khi không có trận. */
  updateBattle(battle: Battle | null, dt: number): void {
    this.raidView.update(battle, dt);
  }

  get inField(): boolean {
    return this.cityCam !== null;
  }

  /** Sang bãi chiến với nền `terrain`, hoặc về lại kinh đô khi `terrain` là null. */
  showField(terrain: Terrain | null): void {
    const v = this.view;
    if (terrain) {
      this.field ??= new Battlefield();
      this.field.setTerrain(terrain);
      if (!this.cityCam) this.cityCam = { target: v.target.clone(), zoom: v.zoom, bounds: { ...v.bounds }, facing: v.facing };
      this.panGoal = null;
      // Bãi chiến vẽ cho hướng nhìn mặc định: quân ta ở dưới, giặc ở trên.
      v.setFacing(0);
      v.bounds = { min: -6, max: 6 };
      v.target.set(0, 0, 0);
      this.fitField();
      return;
    }
    if (!this.cityCam) return;
    v.bounds = this.cityCam.bounds;
    v.target.copy(this.cityCam.target);
    v.zoom = this.cityCam.zoom;
    v.setFacing(this.cityCam.facing);
    this.cityCam = null;
    this.field?.update(null, 0);
  }

  /** Vừa khít bề ngang bãi, chừa chỗ cho lính đứng sát mép. */
  private fitField(): void {
    this.view.zoomToFit(FIELD.w + 1.5, FIELD.d * 0.62 + 3);
  }

  /** Vẽ trận ngoài bãi đang diễn ra. */
  updateField(battle: Battle | null, dt: number): void {
    this.field?.update(battle, dt);
  }

  /** Bóng mờ của công trình sắp đặt ở mặt đất bậc `h`, viền xanh nếu đặt được, đỏ nếu không. */
  setGhost(type: BuildingType | null, x = 0, z = 0, valid = true, h = 0): void {
    if (!type) {
      if (this.ghost) this.scene.remove(this.ghost);
      this.ghost = undefined;
      this.footprint.visible = false;
      return;
    }
    const def = BUILDINGS[type];
    if (!this.ghost || this.ghost.userData.type !== type) {
      if (this.ghost) this.scene.remove(this.ghost);
      this.ghost = this.makeBuilding(type, 1);
      this.ghost.userData.type = type;
      // Mỗi bộ hình có chất liệu riêng, nên làm mờ bằng cách nhân bản chất liệu của chính nó.
      this.ghost.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const toGhost = (m: THREE.Material) => {
            const g = m.clone();
            g.transparent = true;
            g.opacity = 0.6;
            g.depthWrite = false;
            return g;
          };
          o.material = Array.isArray(o.material) ? o.material.map(toGhost) : toGhost(o.material);
          o.castShadow = false;
        }
      });
      this.scene.add(this.ghost);
    }
    const y = topY(h);
    this.ghost.position.set(wx(x) + def.w / 2, y + 0.02, wz(z) + def.d / 2);
    if (type === 'ben') this.ghost.rotation.y = x + def.w === RIVER_START ? Math.PI / 2 : 0;
    this.footprint.visible = true;
    this.footprint.scale.set(def.w, 1, def.d);
    this.footprint.position.set(wx(x) + def.w / 2, y + 0.03, wz(z) + def.d / 2);
    (this.footprint.material as THREE.MeshBasicMaterial).color.set(valid ? 0x4caf50 : 0xe53935);
  }

  setSelection(b: Building | null): void {
    if (!b) {
      this.selection.visible = false;
      return;
    }
    const def = BUILDINGS[b.type];
    this.selection.visible = true;
    this.selection.scale.set(def.w + 0.15, 1, def.d + 0.15);
    this.selection.position.set(wx(b.x) + def.w / 2, this.groundY(b.x, b.z) + 0.06, wz(b.z) + def.d / 2);
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;

    this.view.tick(dt);
    this.followView();
    if (this.panGoal) {
      const before = this.view.target.clone();
      this.view.target.lerp(this.panGoal, 1 - Math.exp(-dt * 9));
      this.view.apply();
      // Tới nơi, hoặc đích nằm ngoài ranh giới kéo (tâm nhìn bị giữ lại, không nhích nữa) thì thôi lướt.
      if (this.view.target.distanceTo(this.panGoal) < 0.01 || (dt > 0 && this.view.target.distanceTo(before) < 1e-4)) this.panGoal = null;
    }

    for (const v of this.views.values()) {
      for (const w of v.people) this.animateWorker(w, t);
      if (v.popAge > 0) {
        v.popAge += dt;
        const k = Math.min(v.popAge / 0.4, 1);
        v.group.scale.setScalar(v.baseScale * (1 + 0.2 * Math.sin(Math.PI * k) * (1 - k * 0.5)));
        if (k >= 1) {
          v.popAge = 0;
          v.group.scale.setScalar(v.baseScale);
        }
      }
      for (const child of v.group.children) {
        if (child.userData.dock !== undefined) child.position.y = (child.userData.dock as number) + Math.sin(t * 1.6 + v.group.id) * 0.03;
        if (child.userData.flame) child.scale.y = 0.75 + 0.35 * Math.abs(Math.sin(t * 9 + child.id));
        if (child.userData.spin) child.rotation.x = t * (child.userData.spin as number);
        if (child.userData.smoke) {
          for (const puff of child.children) {
            const k = (t * 0.35 + (puff.userData.phase as number)) % 1;
            puff.position.set(Math.sin(k * 6 + puff.id) * 0.2, k * 1.6, Math.cos(k * 5) * 0.15);
            puff.scale.setScalar(0.6 + k * 1.2);
            ((puff as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k);
          }
        }
      }
    }

    if (this.merchantBoat) {
      this.merchantBoat.position.y = WATER_Y - 0.02 + Math.sin(t * 1.2) * 0.04;
    }

    if (this.son) {
      // Sơn Tinh đứng chờ, tay gậy đung đưa.
      (this.son.obj.userData.pose as Poser | undefined)?.({ act: 'stand', time: t });
    }

    if (this.adv) {
      // An Dương Vương đứng nhún nhẹ, nỏ (hay rìu) khẽ đưa lên xuống.
      this.adv.obj.position.y = this.adv.y + Math.abs(Math.sin(t * 1.6)) * 0.02;
      (this.adv.obj.userData.pose as Poser | undefined)?.({ act: 'stand', time: t });
    }

    if (this.turtle) {
      // Bơi dọc sông phía nam, tới đầu thì quay lại; đầu ngóc nhấp nhô theo sóng.
      const span = RIVER_START - 5;
      const k = (t * 0.045) % 2;
      const along = k < 1 ? k : 2 - k;
      const lane = RIVER_START - HALF + 1.3;
      this.turtle.position.set(-HALF + 2 + along * span, WATER_Y - 0.05 + Math.sin(t * 1.3) * 0.03, lane);
      this.turtle.rotation.y = k < 1 ? Math.PI / 2 : -Math.PI / 2;
      (this.turtle.userData.pose as Poser | undefined)?.({ act: 'walk', phase: t * 2.6 });
    }

    this.updateStorm(dt);
    this.updateNight(dt);

    if (this.giong) {
      const g = this.giong;
      // Cậu bé lắc lư, thiếu niên cúi ăn cơm, ngựa sắt thở ra lửa.
      if (g.look === 'trangSi') g.obj.position.y = Math.abs(Math.sin(t * 2)) * 0.03;
      (g.obj.userData.pose as Poser | undefined)?.({ act: 'stand', time: t });
    }

    for (const boat of this.boats) {
      boat.pos += boat.speed * dt;
      if (boat.pos > 45) boat.pos = -45;
      if (boat.axis === 'z') boat.obj.position.z = boat.pos;
      else boat.obj.position.x = Math.min(boat.pos, BOAT_LANE);
      if (boat.axis === 'x' && boat.pos > BOAT_LANE) boat.pos = -45;
      boat.obj.position.y = WATER_Y - 0.02 + Math.sin(t * 1.4 + boat.speed * 10) * 0.03;
      (boat.obj.userData.pose as Poser | undefined)?.({ act: 'walk', phase: t * 3 + boat.speed * 10 });
    }

    this.ripples.begin();
    for (const r of this.rippleState) {
      r.pos += dt * 0.9;
      const limit = r.axis === 'x' ? RIVER_START - HALF : 40;
      if (r.pos > limit) r.pos = -40;
      const x = r.axis === 'x' ? r.pos : r.lane;
      const z = r.axis === 'x' ? r.lane : r.pos;
      const w = r.axis === 'x' ? r.len : 0.06;
      const d = r.axis === 'x' ? 0.06 : r.len;
      this.ripples.add(w, 0.02, d, C.ripple, x, WATER_Y + 0.01, z);
    }
    this.ripples.end();

    if (this.warning.visible) {
      (this.warning.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.abs(Math.sin(t * 4)) * 0.3;
    }

    if (this.selection.visible) {
      (this.selection.material as THREE.LineBasicMaterial).opacity = 0.6 + Math.sin(t * 5) * 0.4;
    }

    this.renderer.render(this.inField && this.field ? this.field.scene : this.scene, this.view.camera);
  }

  /** Đêm yêu tinh: ma trơi bập bềnh, sáng mờ dần theo trời tối. Màu trời và đèn tính chung ở `updateStorm`. */
  private updateNight(dt: number): void {
    this.night += (this.nightGoal - this.night) * Math.min(1, dt * 1.2);
    const k = this.night;
    this.wisps.visible = !this.inField && k > 0.05;
    if (!this.wisps.visible) return;
    for (const w of this.wisps.children) {
      const base = w.userData.base as THREE.Vector3;
      const ph = w.userData.phase as number;
      w.position.set(base.x + Math.sin(this.time * 0.7 + ph) * 0.4, base.y + Math.sin(this.time * 1.9 + ph) * 0.25, base.z + Math.cos(this.time * 0.6 + ph) * 0.4);
      const mat = (w as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = k * (0.55 + 0.4 * Math.abs(Math.sin(this.time * 3 + ph)));
    }
  }

  /**
   * Trời tối sầm và mưa xối xả khi Thủy Tinh hô mưa gọi gió, tạnh dần khi nước rút.
   * Đêm yêu tinh thì trời tối xanh, không mưa.
   */
  private updateStorm(dt: number): void {
    this.storm += (this.stormGoal - this.storm) * Math.min(1, dt * 1.5);
    const k = this.storm;
    const n = this.night;
    const sky = (this.scene.background as THREE.Color).setHex(C.sky).lerp(new THREE.Color(C.storm), k * 0.85).lerp(new THREE.Color(C.night), n * 0.85);
    (this.scene.fog as THREE.Fog).color.copy(sky);
    this.lights.sun.intensity = 2.6 * (1 - 0.45 * k) * (1 - 0.6 * n);
    this.lights.hemi.intensity = 0.9 * (1 - 0.2 * k) * (1 - 0.25 * n);
    // Đêm: nắng thành ánh trăng xanh nhạt, trời và đất hắt ánh xanh tím.
    this.lights.sun.color.setHex(0xfff0d8).lerp(NIGHT_MOON, n * 0.8);
    this.lights.hemi.color.setHex(0xfff3dc).lerp(NIGHT_SKY, n * 0.85);
    this.lights.hemi.groundColor.setHex(0x6d6a45).lerp(NIGHT_GROUND, n * 0.85);
    this.rain.visible = !this.inField && k > 0.05;
    if (!this.rain.visible) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 0, -0.15));
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3(1, 1, 1);
    const c = this.view.target;
    const shown = Math.floor(this.drops.length * Math.min(1, k));
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      d.y -= d.v * dt;
      d.x += 1.2 * dt;
      if (d.y < 0) {
        d.y += 16;
        d.x = Math.random() * 40 - 20;
        d.z = Math.random() * 40 - 20;
      }
      sc.setScalar(i < shown ? 1 : 0.0001);
      this.rain.setMatrixAt(i, m.compose(p.set(c.x + d.x, d.y, c.z + d.z), q, sc));
    }
    this.rain.instanceMatrix.needsUpdate = true;
  }
}

