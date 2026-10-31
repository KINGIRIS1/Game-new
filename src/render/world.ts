// Cảnh 3D của kinh đô: địa hình bậc thang, rừng, sông, công trình, lũy tre, đê, nước lũ, mưa
// và các hiệu ứng khi đặt công trình.

import * as THREE from 'three';
import { BUILDINGS, FIELD, type BuildingType, type Terrain } from '../game/defs';
import type { Battle, RaidSide } from '../game/battle';
import { dienLevel, type Building, type GameState } from '../game/game';
import { giongLook, type GiongLook } from '../game/giong';
import { GRID, RIVER_START, areaStart, baseHeights, isUnlocked } from '../game/map';
import { sonLook, type SonLook } from '../game/son';
import { floodMap } from '../game/terrain';
import { Battlefield } from './battlefield';
import { BattleView } from './battleView';
import { IsoCamera } from './camera';
import {
  makeBaiDa,
  makeBayChong,
  makeBen,
  makeChoiCanh,
  makeDenPhuDong,
  makeDenTanVien,
  makeDien,
  makeDoanhTrai,
  makeKho,
  makeLoRen,
  makeNhaSan,
  makeRuong,
} from './buildings';
import { addSunLights, type SunLights } from './lights';
import { buildDikes, buildForest, buildWalls, makeBoat, makeGiong, makeSonTinh, type DikeSpot, type TreeSpot, type WallSpot } from './models';
import { makeWorker, type Job } from './people';
import { C } from './palette';
import { ShapeBuilder, seeded } from './shapes';

const HALF = GRID / 2;
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
  /** Bậc nền đang vẽ. */
  ground: number;
  people: WorkerView[];
  popAge: number;
  baseScale: number;
}

const SPOTS: Partial<Record<BuildingType, Spot[]>> = {
  ruong: [
    { job: 'nong', x: -0.6, y: 0.06, z: -0.45, ry: 0.4 },
    { job: 'nong', x: 0.45, y: 0.06, z: -0.4, ry: -0.3 },
    { job: 'nong', x: -0.35, y: 0.06, z: 0.45, ry: 0.9 },
    { job: 'nong', x: 0.35, y: 0.06, z: 0.2, ry: -0.8 },
  ],
  ben: [
    { job: 'buon', x: -0.45, y: 0.5, z: 0.05, ry: 0, walk: 0.3 },
    { job: 'buon', x: 0.45, y: 0.5, z: 0.0, ry: 0, walk: 0.25 },
    { job: 'buon', x: 0.55, y: 0.38, z: 1.3, ry: 0, walk: 0 },
  ],
  baiDa: [
    { job: 'thoDa', x: -0.35, y: 0.1, z: 0.4, ry: 0.6 },
    { job: 'thoDa', x: 0.3, y: 0.1, z: 0.15, ry: -0.5 },
    { job: 'thoDa', x: -0.1, y: 0.1, z: -0.15, ry: 2.6 },
    { job: 'thoDa', x: 0.65, y: 0.1, z: -0.25, ry: -2 },
  ],
  loRen: [
    { job: 'thoRen', x: 0.45, y: 0.08, z: 0.82, ry: Math.PI },
    { job: 'thoRen', x: -0.15, y: 0.08, z: 0.3, ry: -2.4 },
    { job: 'thoRen', x: -0.6, y: 0.08, z: 0.55, ry: 2.6 },
  ],
  kho: [{ job: 'giuKho', x: -0.1, y: 0.06, z: 0.7, ry: 0, walk: 0.5 }],
  nhaSan: [
    { job: 'phuNu', x: 0.65, y: 0.06, z: 0.7, ry: 0.4 },
    { job: 'phuNu', x: -0.65, y: 0.06, z: 0.35, ry: -0.6 },
  ],
  doanhTrai: [
    { job: 'linhGac', x: -0.2, y: 0.08, z: 1.0, ry: 0 },
    { job: 'linhGac', x: 0.95, y: 0.08, z: 0.3, ry: -0.6 },
  ],
};

/** Số người hiện ra: công trình cần người làm thì đúng số người đang làm, còn lại cố định theo cấp. */
function peopleCount(b: Building, spots: number): number {
  if (b.type === 'ruong' || b.type === 'ben' || b.type === 'baiDa' || b.type === 'loRen') return Math.min(b.workers, spots);
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
  private readonly lights: SunLights;
  private state?: GameState;
  private forest?: THREE.Object3D;
  private walls?: THREE.Object3D;
  private dikes?: THREE.Object3D;
  private readonly ripples = new InstancedBoxes(60);
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
  private cityCam: { target: THREE.Vector3; zoom: number; bounds: { min: number; max: number } } | null = null;
  private readonly warning: THREE.Mesh;
  private merchantBoat?: THREE.Object3D;
  /** Gióng đứng trước Điện, đổi dáng khi lớn lên; không còn khi đã bay về trời. */
  private giong?: { obj: THREE.Group; look: GiongLook; key: string };
  /** Sơn Tinh đứng trước Điện ở chương 2, tới khi đánh lui Thủy Tinh thì về núi. */
  private son?: { obj: THREE.Group; look: SonLook; key: string };
  private shownLevel = 0;
  private wallKey = '';
  private dikeKey = '';
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
    this.view.target.set(wx(19), 0, wz(19));

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
    // Bờ bên kia sông Thao (phía đông) và sông Đà (phía nam).
    land.box(far - HALF, 1, 2 * far, C.grassLocked[1], (HALF + far) / 2, -0.52, 0);
    land.box(far + river, 1, far - HALF, C.grassLocked[2], (river - far) / 2, -0.52, (HALF + far) / 2);
    const water = new ShapeBuilder();
    water.box(HALF - river, 1, 2 * far, C.water[0], (river + HALF) / 2, WATER_Y - 0.5, 0);
    water.box(far + river, 1, HALF - river, C.water[1], (river - far) / 2, WATER_Y - 0.5, (river + HALF) / 2);
    const landMesh = land.mesh(groundMaterial);
    landMesh.castShadow = false;
    const waterMesh = water.mesh(groundMaterial);
    waterMesh.castShadow = false;
    this.riverWater = waterMesh;
    // Bờ bên kia sông Thao và sông Đà: mặt nước lũ phẳng phủ kín, chỉ cây cối nhô lên.
    const flood = new ShapeBuilder();
    flood.box(far - HALF, 0.1, 2 * far, C.flood, (HALF + far) / 2, -0.05, 0);
    flood.box(far + river, 0.1, far - HALF, C.flood, (river - far) / 2, -0.05, (HALF + far) / 2);
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
    for (let x = -10; x < GRID + 8; x++) {
      for (let z = -10; z < GRID + 8; z++) {
        const insideGrid = x >= 0 && z >= 0 && x < GRID && z < GRID;
        const inRiver = (x >= RIVER_START && x < GRID) || (z >= RIVER_START && z < GRID);
        if (insideGrid || inRiver) continue;
        const farBank = x >= GRID || z >= GRID;
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
    const river = RIVER_START - HALF + 1.5;
    const routes: { axis: 'x' | 'z'; speed: number; pos: number }[] = [
      { axis: 'z', speed: 1.1, pos: -30 },
      { axis: 'z', speed: 0.8, pos: 5 },
      { axis: 'x', speed: 0.9, pos: -20 },
    ];
    for (const r of routes) {
      const obj = makeBoat();
      obj.position.y = WATER_Y - 0.02;
      if (r.axis === 'z') {
        obj.position.x = river;
        obj.rotation.y = -Math.PI / 2;
      } else {
        obj.position.z = river;
      }
      this.scene.add(obj);
      this.boats.push({ obj, ...r });
    }
  }

  private initRipples(): void {
    const rand = seeded(11);
    for (let i = 0; i < 60; i++) {
      this.rippleState.push({
        axis: i % 2 ? 'x' : 'z',
        pos: -40 + rand() * 60,
        lane: RIVER_START - HALF + 0.3 + rand() * 2.4,
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
    this.wallKey = '';
    this.dikeKey = '';
    this.floodKey = '';
    this.heights = [];
    this.shownLevel = 0;
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
    const heightsChanged = state.heights.length !== this.heights.length || state.heights.some((h, i) => h !== this.heights[i]);
    if (heightsChanged) this.heights = [...state.heights];
    if (level !== this.shownLevel || heightsChanged) {
      this.shownLevel = level;
      this.rebuildLand(level);
      this.rebuildForest(level);
      this.rebuildGridOverlay(level);
      this.floodKey = '';
    }

    const alive = new Set<number>();
    for (const b of state.buildings) {
      if (b.type === 'luy' || b.type === 'de') continue;
      alive.add(b.id);
      const v = this.views.get(b.id);
      if (!v || v.level !== b.level || v.damaged !== !!b.damaged || v.workers !== b.workers) this.createView(b);
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

    const walls = state.buildings.filter((b) => b.type === 'luy');
    const key = walls.map((b) => `${b.id}:${b.level}:${b.damaged ? 1 : 0}:${this.heights[b.z * GRID + b.x]}`).join(',');
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
    const dkey = dikes.map((b) => `${b.id}:${b.level}:${b.damaged ? 1 : 0}:${this.heights[b.z * GRID + b.x]}`).join(',');
    if (dkey !== this.dikeKey) {
      this.dikeKey = dkey;
      if (this.dikes) this.scene.remove(this.dikes);
      const spots: DikeSpot[] = dikes.map((d) => ({ x: wx(d.x) + 0.5, y: this.groundY(d.x, d.z), z: wz(d.z) + 0.5, level: d.level, damaged: !!d.damaged }));
      this.dikes = buildDikes(spots);
      this.scene.add(this.dikes);
      this.floodKey = '';
    }
    this.syncFlood(state);
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
    if (!here && this.merchantBoat) {
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
      boat.position.set(east ? cx + 2.4 : cx - 0.6, WATER_Y - 0.02, east ? cz - 0.6 : cz + 2.4);
      boat.rotation.y = east ? -Math.PI / 2 : 0;
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
    const people: WorkerView[] = [];
    const spots: Spot[] =
      b.type === 'dien'
        ? [
            { job: 'lacHau', x: 0.75, y: b.level >= 4 ? 0.45 : 0.14, z: 1.75, ry: 0 },
            ...(b.level >= 2 ? [{ job: 'linhGac' as Job, x: -1.0, y: b.level >= 4 ? 0.45 : 0.14, z: 1.8, ry: 0.2 }] : []),
          ]
        : (SPOTS[b.type] ?? []);
    const n = b.damaged ? 0 : b.type === 'dien' ? spots.length : peopleCount(b, spots.length);
    for (let i = 0; i < n; i++) {
      const spot = spots[i];
      const obj = makeWorker(spot.job);
      obj.position.set(spot.x, spot.y, spot.z);
      obj.rotation.y = spot.ry;
      obj.scale.setScalar(0.85);
      group.add(obj);
      people.push({ obj, spot, phase: b.id * 1.7 + i * 2.1 });
    }
    if (b.type === 'ben') {
      const boat = makeBoat();
      boat.position.set(-0.15, WATER_Y - 0.02 - topY(ground), 1.75);
      boat.userData.dock = true;
      group.add(boat);
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
    this.views.set(b.id, { group, type: b.type, level: b.level, damaged: !!b.damaged, workers: b.workers, ground, people, popAge: 0, baseScale: group.scale.x });
  }

  private makeBuilding(type: BuildingType, level: number): THREE.Group {
    if (type === 'dien') return makeDien(level);
    if (type === 'ruong') return makeRuong(level);
    if (type === 'ben') return makeBen(level);
    if (type === 'nhaSan') return makeNhaSan(level);
    if (type === 'baiDa') return makeBaiDa(level);
    if (type === 'loRen') return makeLoRen(level);
    if (type === 'kho') return makeKho(level);
    if (type === 'doanhTrai') return makeDoanhTrai(level);
    if (type === 'choiCanh') return makeChoiCanh(level);
    if (type === 'bayChong') return makeBayChong();
    if (type === 'denPhuDong') return makeDenPhuDong();
    if (type === 'denTanVien') return makeDenTanVien();
    return new THREE.Group();
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

  /** Chỗ đứng trước Điện, bên phải bậc lên: nơi Gióng, rồi Sơn Tinh đứng. */
  private heroSpot(dien: Building): { x: number; y: number; z: number } {
    const tx = Math.min(dien.x + 3, RIVER_START - 1);
    const tz = Math.min(dien.z + 4, RIVER_START - 1);
    return { x: wx(dien.x) + 3.6, y: this.groundY(tx, tz), z: wz(dien.z) + 4.5 };
  }

  /** Gióng đứng ngay trước Điện, bên phải bậc lên. */
  private syncGiong(state: GameState): void {
    const look = giongLook(state);
    const dien = state.buildings.find((b) => b.type === 'dien');
    const spot = dien ? this.heroSpot(dien) : null;
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

  /** Sơn Tinh đứng trên mỏm đá trước Điện ở chương 2, đánh lui Thủy Tinh thì về núi. */
  private syncSon(state: GameState): void {
    const look = sonLook(state);
    const dien = state.buildings.find((b) => b.type === 'dien');
    const spot = dien ? this.heroSpot(dien) : null;
    const key = look && spot ? `${look}:${spot.x}:${spot.y}:${spot.z}` : '';
    if (this.son?.key === key) return;
    if (this.son) this.scene.remove(this.son.obj);
    this.son = undefined;
    if (!look || !spot) return;
    const obj = makeSonTinh({ rock: true });
    obj.scale.setScalar(0.95);
    obj.position.set(spot.x, spot.y, spot.z);
    obj.rotation.y = 0.4;
    this.scene.add(obj);
    this.son = { obj, look, key };
  }

  /** Người chơi chạm vào tướng đứng trước Điện: Gióng hay Sơn Tinh. */
  pickHero(clientX: number, clientY: number): 'giong' | 'son' | null {
    const ray = this.view.setRay(clientX, clientY);
    if (this.giong && ray.intersectObject(this.giong.obj, true).length) return 'giong';
    if (this.son && ray.intersectObject(this.son.obj, true).length) return 'son';
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

  /** Động tác theo nghề: cúi cấy, bổ cuốc, quai búa, đi qua đi lại, đứng gác. */
  private animateWorker(w: WorkerView, t: number): void {
    const { obj, spot, phase } = w;
    const tool = obj.children.find((c) => c.userData.tool);
    const s = Math.sin(t * 2 + phase);
    switch (spot.job) {
      case 'nong':
        obj.rotation.x = 0.3 + 0.15 * s;
        if (tool) tool.rotation.x = -0.5 + 0.5 * s;
        break;
      case 'thoDa':
        if (tool) tool.rotation.x = -1.4 + 1.4 * Math.abs(Math.sin(t * 3 + phase));
        obj.rotation.x = 0.15 * Math.abs(Math.sin(t * 3 + phase));
        break;
      case 'thoRen':
        if (tool) tool.rotation.x = -1.5 + 1.5 * Math.abs(Math.sin(t * 4.5 + phase));
        break;
      case 'buon':
      case 'giuKho': {
        const walk = spot.walk ?? 0;
        if (walk) {
          const k = t * 0.7 + phase;
          obj.position.x = spot.x + Math.sin(k) * walk;
          obj.rotation.y = Math.cos(k) >= 0 ? Math.PI / 2 : -Math.PI / 2;
        }
        obj.position.y = spot.y + Math.abs(Math.sin(t * 6 + phase)) * 0.04;
        break;
      }
      default:
        obj.rotation.y = spot.ry + 0.3 * Math.sin(t * 0.5 + phase);
        obj.position.y = spot.y + Math.abs(Math.sin(t * 1.5 + phase)) * 0.02;
    }
  }

  /** Dải đỏ nhấp nháy ở bìa rừng (giặc Ân) hay trên mặt sông (thủy quái) phía giặc sắp tới; null để tắt. */
  setRaidWarning(side: RaidSide | null): void {
    this.warning.visible = !!side;
    if (!side) return;
    const len = RIVER_START;
    if (side === 'bac') {
      this.warning.scale.set(len, 1, 3);
      this.warning.position.set(wx(0) + len / 2, 1.0, wz(0) + 1.5);
    } else if (side === 'tay') {
      this.warning.scale.set(3, 1, len);
      this.warning.position.set(wx(0) + 1.5, 1.0, wz(0) + len / 2);
    } else if (side === 'nam') {
      this.warning.scale.set(len, 1, 2.6);
      this.warning.position.set(wx(0) + len / 2, WATER_Y + 0.08, wz(RIVER_START) + 1.4);
    } else {
      this.warning.scale.set(2.6, 1, len);
      this.warning.position.set(wx(RIVER_START) + 1.4, WATER_Y + 0.08, wz(0) + len / 2);
    }
  }

  /** Lướt camera tới phía giặc tới. */
  lookAtEdge(side: RaidSide): void {
    const at: Record<RaidSide, [number, number]> = { bac: [15, 5], tay: [5, 15], nam: [17, 23], dong: [23, 17] };
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
      if (!this.cityCam) this.cityCam = { target: v.target.clone(), zoom: v.zoom, bounds: { ...v.bounds } };
      this.panGoal = null;
      v.bounds = { min: -6, max: 6 };
      v.target.set(0, 0, 0);
      this.fitField();
      return;
    }
    if (!this.cityCam) return;
    v.bounds = this.cityCam.bounds;
    v.target.copy(this.cityCam.target);
    v.zoom = this.cityCam.zoom;
    v.apply();
    this.cityCam = null;
    this.field?.view.update(null, 0);
  }

  /** Vừa khít bề ngang bãi, chừa chỗ cho lính đứng sát mép. */
  private fitField(): void {
    this.view.zoomToFit(FIELD.w + 1.5, FIELD.d * 0.62 + 3);
  }

  /** Vẽ trận ngoài bãi đang diễn ra. */
  updateField(battle: Battle | null, dt: number): void {
    this.field?.view.update(battle, dt);
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

    if (this.panGoal) {
      this.view.target.lerp(this.panGoal, 1 - Math.exp(-dt * 9));
      this.view.apply();
      if (this.view.target.distanceTo(this.panGoal) < 0.01) this.panGoal = null;
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
        if (child.userData.dock) child.position.y = WATER_Y - 0.02 + Math.sin(t * 1.6 + v.group.id) * 0.03;
        if (child.userData.flame) child.scale.y = 0.75 + 0.35 * Math.abs(Math.sin(t * 9 + child.id));
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
      const staff = this.son.obj.children.find((c) => c.userData.weapon);
      if (staff) staff.rotation.x = -0.35 + 0.12 * Math.sin(t * 1.3);
    }

    this.updateStorm(dt);

    if (this.giong) {
      const g = this.giong;
      // Cậu bé lắc lư, thiếu niên cúi ăn cơm, ngựa sắt thở ra lửa.
      if (g.look === 'trangSi') g.obj.position.y = Math.abs(Math.sin(t * 2)) * 0.03;
      else g.obj.rotation.x = (g.look === 'be' ? 0.06 : 0.15) * Math.sin(t * (g.look === 'be' ? 1.5 : 3));
      for (const c of g.obj.children) if (c.userData.flame) c.scale.set(1, 0.7 + 0.5 * Math.abs(Math.sin(t * 9)), 1);
    }

    for (const boat of this.boats) {
      boat.pos += boat.speed * dt;
      if (boat.pos > 45) boat.pos = -45;
      if (boat.axis === 'z') boat.obj.position.z = boat.pos;
      else boat.obj.position.x = Math.min(boat.pos, RIVER_START - HALF + 0.5);
      if (boat.axis === 'x' && boat.pos > RIVER_START - HALF) boat.pos = -45;
      boat.obj.position.y = WATER_Y - 0.02 + Math.sin(t * 1.4 + boat.speed * 10) * 0.03;
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

  /** Trời tối sầm và mưa xối xả khi Thủy Tinh hô mưa gọi gió, tạnh dần khi nước rút. */
  private updateStorm(dt: number): void {
    this.storm += (this.stormGoal - this.storm) * Math.min(1, dt * 1.5);
    const k = this.storm;
    const sky = (this.scene.background as THREE.Color).setHex(C.sky).lerp(new THREE.Color(C.storm), k * 0.85);
    (this.scene.fog as THREE.Fog).color.copy(sky);
    this.lights.sun.intensity = 2.6 * (1 - 0.45 * k);
    this.lights.hemi.intensity = 0.9 * (1 - 0.2 * k);
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

