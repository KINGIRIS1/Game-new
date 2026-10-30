// Cảnh 3D của kinh đô: địa hình, rừng, sông, công trình, lũy tre và các hiệu ứng khi đặt công trình.

import * as THREE from 'three';
import { BUILDINGS, type BuildingType } from '../game/defs';
import type { Battle, RaidSide } from '../game/battle';
import { dienLevel, type Building, type GameState } from '../game/game';
import { GRID, RIVER_START, areaStart, isUnlocked } from '../game/map';
import { IsoCamera } from './camera';
import {
  buildForest,
  buildWalls,
  makeBaiDa,
  makeBayChong,
  makeBen,
  makeBoat,
  makeChoiCanh,
  makeDien,
  makeDoanhTrai,
  makeFighter,
  makeKho,
  makeLoRen,
  makeNhaSan,
  makePerson,
  makeRuong,
  type PersonKind,
  type TreeSpot,
  type WallSpot,
} from './models';
import { C } from './palette';
import { ShapeBuilder, seeded } from './shapes';

const HALF = GRID / 2;
/** Mặt nước nằm thấp hơn mặt đất. */
const WATER_Y = -0.28;

/** Mật độ rừng: thưa để công trình nổi bật, không rối mắt. */
const FOREST_DENSITY = 0.7;

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

interface BuildingView {
  group: THREE.Group;
  type: BuildingType;
  level: number;
  damaged: boolean;
  person?: THREE.Object3D;
  popAge: number;
  baseScale: number;
}

const PERSON_OF: Partial<Record<BuildingType, { kind: PersonKind; x: number; y: number; z: number; ry: number }>> = {
  dien: { kind: 'linh', x: 0.75, y: 0.12, z: 1.85, ry: 0 },
  ruong: { kind: 'nong', x: 0.25, y: 0.14, z: 0.05, ry: 0.6 },
  ben: { kind: 'buon', x: 0.15, y: 0.48, z: -0.1, ry: 0.4 },
  baiDa: { kind: 'nong', x: -0.1, y: 0.1, z: 0.3, ry: 0.5 },
  loRen: { kind: 'linh', x: 0.4, y: 0.1, z: 0.6, ry: -0.4 },
};

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly view: IsoCamera;

  private readonly land = new InstancedBoxes(RIVER_START * RIVER_START);
  private forest?: THREE.Object3D;
  private walls?: THREE.Object3D;
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
  private readonly fighters = new Map<number, { obj: THREE.Group; deadAge: number }>();
  private readonly arrows: { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; age: number; dur: number }[] = [];
  private battleWave = 0;
  private lastEventSeq = 0;
  private readonly warning: THREE.Mesh;
  private merchantBoat?: THREE.Object3D;
  private shownLevel = 0;
  private wallKey = '';
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene.background = new THREE.Color(C.sky);
    this.scene.fog = new THREE.Fog(C.sky, 75, 125);
    this.view = new IsoCamera(canvas);
    this.view.onUserMove = () => {
      this.panGoal = null;
    };
    this.view.target.set(wx(19), 0, wz(19));

    this.addLights();
    this.scene.add(this.staticTerrain());
    this.scene.add(buildForest(this.outerForestSpots()));
    this.scene.add(this.land.mesh, this.ripples.mesh, this.buildingsRoot);
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

  /** Ánh sáng bầu trời dịu cộng nắng mạnh, để tô màu hoạt hình tách rõ 3 dải sáng. */
  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xfff3dc, 0x6d6a45, 0.9));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
    sun.position.set(-10, 24, 14);
    sun.castShadow = true;
    const cam = sun.shadow.camera;
    cam.left = -24;
    cam.right = 24;
    cam.top = 24;
    cam.bottom = -24;
    cam.near = 1;
    cam.far = 70;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);
  }

  /** Đất ngoài lưới, hai dòng sông và bờ bên kia. */
  private staticTerrain(): THREE.Object3D {
    const group = new THREE.Group();
    const far = 70;
    const river = RIVER_START - HALF;
    const land = new ShapeBuilder();
    // Đất bên này sông (phía rừng), nằm dưới các ô lưới.
    land.box(far + river, 1, far + river, C.grassLocked[0], (river - far) / 2, -0.52, (river - far) / 2);
    // Bờ bên kia sông Thao (phía đông) và sông Đà (phía nam).
    land.box(far - HALF, 1, 2 * far, C.grassLocked[1], (HALF + far) / 2, -0.52, 0);
    land.box(far + river, 1, far - HALF, C.grassLocked[2], (river - far) / 2, -0.52, (HALF + far) / 2);
    const water = new ShapeBuilder();
    water.box(HALF - river, 1, 2 * far, C.water[0], (river + HALF) / 2, WATER_Y - 0.5, 0);
    water.box(far + river, 1, HALF - river, C.water[1], (river - far) / 2, WATER_Y - 0.5, (river + HALF) / 2);
    for (const b of [land, water]) {
      const mesh = b.mesh(groundMaterial);
      mesh.castShadow = false;
      group.add(mesh);
    }
    return group;
  }

  /** Rừng bao ngoài lưới và cây thưa ở bờ bên kia. */
  private outerForestSpots(): TreeSpot[] {
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
        spots.push({ x: cx, z: cz, kind: rand() < 0.3 ? 'bamboo' : 'tree', seed: Math.floor(rand() * 1e9) });
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

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.view.setSize(w, h);
  }

  /** Xóa mọi thứ đã vẽ theo state cũ, dùng khi nạp mã lưu hoặc chơi lại. */
  resetAll(): void {
    for (const v of this.views.values()) this.buildingsRoot.remove(v.group);
    this.views.clear();
    this.wallKey = '';
    this.shownLevel = 0;
    this.setSelection(null);
    if (this.merchantBoat) this.scene.remove(this.merchantBoat);
    this.merchantBoat = undefined;
  }

  /** Cập nhật cảnh theo state. Chỉ dựng lại phần đã thay đổi. */
  sync(state: GameState): void {
    const level = dienLevel(state);
    if (level !== this.shownLevel) {
      this.shownLevel = level;
      this.rebuildLand(level);
      this.rebuildForest(level);
      this.rebuildGridOverlay(level);
    }

    const alive = new Set<number>();
    for (const b of state.buildings) {
      if (b.type === 'luy') continue;
      alive.add(b.id);
      const v = this.views.get(b.id);
      if (!v || v.level !== b.level || v.damaged !== !!b.damaged) this.createView(b);
    }
    for (const [id, v] of this.views) {
      if (!alive.has(id)) {
        this.buildingsRoot.remove(v.group);
        this.views.delete(id);
      }
    }

    this.syncMerchant(state);

    const walls = state.buildings.filter((b) => b.type === 'luy');
    const key = walls.map((b) => `${b.id}:${b.level}:${b.damaged ? 1 : 0}`).join(',');
    if (key !== this.wallKey) {
      this.wallKey = key;
      if (this.walls) this.scene.remove(this.walls);
      const spots: WallSpot[] = walls.map((w) => ({ x: wx(w.x) + 0.5, z: wz(w.z) + 0.5, seed: w.x * 92821 + w.z * 68917, level: w.level, damaged: !!w.damaged }));
      this.walls = buildWalls(spots);
      this.scene.add(this.walls);
    }
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
    group.position.set(wx(b.x) + def.w / 2, 0, wz(b.z) + def.d / 2);
    group.userData.buildingId = b.id;
    const p = PERSON_OF[b.type];
    let person: THREE.Object3D | undefined;
    if (p) {
      person = makePerson(p.kind);
      person.position.set(p.x, p.y, p.z);
      person.rotation.y = p.ry;
      person.userData.baseY = p.y;
      group.add(person);
    }
    if (b.type === 'ben') {
      const boat = makeBoat();
      boat.position.set(-0.15, WATER_Y - 0.02, 1.75);
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
    this.views.set(b.id, { group, type: b.type, level: b.level, damaged: !!b.damaged, person, popAge: 0, baseScale: group.scale.x });
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
    return new THREE.Group();
  }

  private rebuildLand(level: number): void {
    this.land.begin();
    for (let x = 0; x < RIVER_START; x++) {
      for (let z = 0; z < RIVER_START; z++) {
        const open = isUnlocked(x, z, level);
        const palette = open ? C.grass : C.grassLocked;
        const shade = palette[(x * 7 + z * 13) % 3];
        this.land.add(1, 0.4, 1, shade, wx(x) + 0.5, -0.2, wz(z) + 0.5);
      }
    }
    this.land.end();
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
        spots.push({ x: cx, z: cz, kind: rand() < 0.35 ? 'bamboo' : 'tree', seed: Math.floor(rand() * 1e9) });
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
    for (let i = lo; i <= RIVER_START; i++) {
      pts.push(new THREE.Vector3(wx(i), 0.02, wz(lo)), new THREE.Vector3(wx(i), 0.02, wz(RIVER_START)));
      pts.push(new THREE.Vector3(wx(lo), 0.02, wz(i)), new THREE.Vector3(wx(RIVER_START), 0.02, wz(i)));
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

  /** Ô lưới dưới vị trí màn hình, hoặc null nếu chạm ra ngoài lưới. */
  pickTile(clientX: number, clientY: number): { x: number; z: number } | null {
    const p = this.view.groundPoint(clientX, clientY);
    if (!p) return null;
    const x = Math.floor(p.x + HALF);
    const z = Math.floor(p.z + HALF);
    return x >= 0 && z >= 0 && x < GRID && z < GRID ? { x, z } : null;
  }

  /** Id công trình (trừ lũy tre) dưới vị trí chạm, ưu tiên phần nhô cao như mái nhà. */
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
    const p = new THREE.Vector3(wx(x) + 0.5, 0, wz(z) + 0.5).project(this.view.camera);
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

  /** Dải đỏ nhấp nháy ở bìa rừng phía giặc sắp tới; null để tắt. */
  setRaidWarning(side: RaidSide | null): void {
    this.warning.visible = !!side;
    if (!side) return;
    const len = RIVER_START;
    if (side === 'bac') {
      this.warning.scale.set(len, 1, 3);
      this.warning.position.set(wx(0) + len / 2, 0.05, wz(0) + 1.5);
    } else {
      this.warning.scale.set(3, 1, len);
      this.warning.position.set(wx(0) + 1.5, 0.05, wz(0) + len / 2);
    }
  }

  /** Lướt camera tới bìa rừng phía giặc tới. */
  lookAtEdge(side: RaidSide): void {
    this.panGoal = side === 'bac' ? new THREE.Vector3(wx(15), 0, wz(5)) : new THREE.Vector3(wx(5), 0, wz(15));
  }

  /** Vẽ lính hai bên theo trận đang diễn ra; null khi không có trận. */
  updateBattle(battle: Battle | null, dt: number): void {
    if (!battle || battle.wave !== this.battleWave) {
      for (const f of this.fighters.values()) this.scene.remove(f.obj);
      this.fighters.clear();
      for (const a of this.arrows) this.scene.remove(a.mesh);
      this.arrows.length = 0;
      this.lastEventSeq = 0;
      this.battleWave = battle ? battle.wave : 0;
      if (!battle) return;
    }
    for (const f of battle.fighters) {
      let view = this.fighters.get(f.id);
      if (f.state === 'gone') {
        if (view) {
          this.scene.remove(view.obj);
          this.fighters.delete(f.id);
        }
        continue;
      }
      if (!view) {
        if (f.state === 'dead') continue;
        const obj = makeFighter(f.kind);
        obj.scale.setScalar(f.kind === 'voi' || f.kind === 'chienXa' ? 0.75 : 0.8);
        this.scene.add(obj);
        view = { obj, deadAge: 0 };
        this.fighters.set(f.id, view);
      }
      const obj = view.obj;
      obj.position.x = f.x - HALF;
      obj.position.z = f.z - HALF;
      obj.rotation.y = f.face;
      if (f.state === 'dead') {
        view.deadAge += dt;
        obj.rotation.x = Math.min(view.deadAge * 4, Math.PI / 2) * -1;
        obj.position.y = view.deadAge > 1.2 ? -(view.deadAge - 1.2) * 0.6 : 0;
        if (view.deadAge > 2.5) obj.visible = false;
        continue;
      }
      obj.rotation.x = f.swing > 0 ? -0.5 * (f.swing / 0.3) : 0;
      obj.position.y = f.state === 'move' ? Math.abs(Math.sin(this.time * 10 + f.id)) * 0.06 : 0;
    }
    for (const e of battle.events) {
      if (e.seq <= this.lastEventSeq) continue;
      if (e.kind === 'shot' && e.tx !== undefined && e.tz !== undefined) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.45), new THREE.MeshBasicMaterial({ color: C.arrow }));
        const from = new THREE.Vector3(e.x - HALF, 0.8, e.z - HALF);
        const to = new THREE.Vector3(e.tx - HALF, 0.5, e.tz - HALF);
        mesh.position.copy(from);
        this.scene.add(mesh);
        this.arrows.push({ mesh, from, to, age: 0, dur: Math.max(0.15, from.distanceTo(to) / 12) });
      }
    }
    this.lastEventSeq = battle.seq;
  }

  /** Bóng mờ của công trình sắp đặt, viền xanh nếu đặt được, đỏ nếu không. */
  setGhost(type: BuildingType | null, x = 0, z = 0, valid = true): void {
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
    this.ghost.position.set(wx(x) + def.w / 2, 0.02, wz(z) + def.d / 2);
    if (type === 'ben') this.ghost.rotation.y = x + def.w === RIVER_START ? Math.PI / 2 : 0;
    this.footprint.visible = true;
    this.footprint.scale.set(def.w, 1, def.d);
    this.footprint.position.set(wx(x) + def.w / 2, 0.03, wz(z) + def.d / 2);
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
    this.selection.position.set(wx(b.x) + def.w / 2, 0.06, wz(b.z) + def.d / 2);
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
      if (v.person) {
        const phase = v.group.id * 0.7;
        v.person.position.y = (v.person.userData.baseY as number) + Math.abs(Math.sin(t * 3 + phase)) * 0.05;
        if (v.type === 'ruong') v.person.rotation.x = 0.25 + Math.sin(t * 2 + phase) * 0.2;
      }
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

    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.age += dt;
      const k = Math.min(a.age / a.dur, 1);
      const prev = a.mesh.position.clone();
      a.mesh.position.lerpVectors(a.from, a.to, k);
      a.mesh.position.y += Math.sin(Math.PI * k) * 0.6;
      a.mesh.lookAt(a.mesh.position.clone().add(a.mesh.position.clone().sub(prev)));
      if (k >= 1) {
        this.scene.remove(a.mesh);
        a.mesh.geometry.dispose();
        this.arrows.splice(i, 1);
      }
    }

    if (this.warning.visible) {
      (this.warning.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.abs(Math.sin(t * 4)) * 0.3;
    }

    if (this.selection.visible) {
      (this.selection.material as THREE.LineBasicMaterial).opacity = 0.6 + Math.sin(t * 5) * 0.4;
    }

    this.renderer.render(this.scene, this.view.camera);
  }
}

