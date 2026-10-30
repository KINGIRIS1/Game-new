// Cảnh 3D của kinh đô: địa hình, rừng, sông, công trình, lũy tre và các hiệu ứng khi đặt công trình.

import * as THREE from 'three';
import { BUILDINGS, type BuildingType } from '../game/defs';
import { dienLevel, type Building, type GameState } from '../game/game';
import { GRID, RIVER_START, areaStart, isUnlocked } from '../game/map';
import { BoxBuilder, seeded } from './boxes';
import { IsoCamera } from './camera';
import { makeBen, makeBoat, makeDien, makePerson, makeRuong, type PersonKind } from './models';
import { C } from './palette';

const HALF = GRID / 2;
/** Mặt nước nằm thấp hơn mặt đất. */
const WATER_Y = -0.28;

/** Tọa độ thế giới của góc ô (x, z). */
const wx = (x: number) => x - HALF;
const wz = (z: number) => z - HALF;

/** Nhiều khối hộp vẽ trong một lần, mỗi khối có màu riêng. */
class InstancedBoxes {
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

/** Một bụi tre: vài cây tre cao, lá ở ngọn. */
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

interface BuildingView {
  group: THREE.Group;
  type: BuildingType;
  level: number;
  person?: THREE.Object3D;
  popAge: number;
  baseScale: number;
}

const PERSON_OF: Partial<Record<BuildingType, { kind: PersonKind; x: number; y: number; z: number; ry: number }>> = {
  dien: { kind: 'linh', x: 0.75, y: 0.12, z: 1.85, ry: 0 },
  ruong: { kind: 'nong', x: 0.25, y: 0.14, z: 0.05, ry: 0.6 },
  ben: { kind: 'buon', x: 0.15, y: 0.48, z: -0.1, ry: 0.4 },
};

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly view: IsoCamera;

  private readonly land = new InstancedBoxes(RIVER_START * RIVER_START);
  private readonly forest = new InstancedBoxes(9000, { shadow: true });
  private readonly walls = new InstancedBoxes(2000, { shadow: true });
  private readonly ripples = new InstancedBoxes(60);
  private readonly buildingsRoot = new THREE.Group();
  private readonly views = new Map<number, BuildingView>();
  private readonly boats: { obj: THREE.Group; axis: 'x' | 'z'; speed: number; pos: number }[] = [];
  private readonly rippleState: { axis: 'x' | 'z'; pos: number; lane: number; len: number }[] = [];
  private gridOverlay?: THREE.LineSegments;
  private ghost?: THREE.Group;
  private readonly footprint: THREE.Mesh;
  private readonly selection: THREE.LineLoop;
  private panGoal: THREE.Vector3 | null = null;
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
    this.addStaticTerrain();
    this.scene.add(this.land.mesh, this.forest.mesh, this.walls.mesh, this.ripples.mesh, this.buildingsRoot);
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

    this.resize();
  }

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xfff4dc, 0x6d7a45, 1.6));
    const sun = new THREE.DirectionalLight(0xffe7c2, 2.2);
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
  private addStaticTerrain(): void {
    const b = new BoxBuilder();
    const far = 70;
    const river = RIVER_START - HALF;
    // Đất bên này sông (phía rừng), nằm dưới các ô lưới.
    b.box(far + river, 1, far + river, C.grassLocked[0], (river - far) / 2, -0.52, (river - far) / 2);
    // Bờ bên kia sông Thao (phía đông) và sông Đà (phía nam).
    b.box(far - HALF, 1, 2 * far, C.grassLocked[1], (HALF + far) / 2, -0.52, 0);
    b.box(far + river, 1, far - HALF, C.grassLocked[2], (river - far) / 2, -0.52, (HALF + far) / 2);
    const terrain = b.build();
    terrain.castShadow = false;
    this.scene.add(terrain);

    const water = new BoxBuilder();
    water.box(HALF - river, 1, 2 * far, C.water[0], (river + HALF) / 2, WATER_Y - 0.5, 0);
    water.box(far + river, 1, HALF - river, C.water[1], (river - far) / 2, WATER_Y - 0.5, (river + HALF) / 2);
    const waterMesh = water.build();
    waterMesh.castShadow = false;
    this.scene.add(waterMesh);

    // Rừng bao ngoài lưới và cây thưa ở bờ bên kia.
    this.scene.add(this.outerForest());
  }

  private outerForest(): THREE.InstancedMesh {
    const trees = new InstancedBoxes(4000, { shadow: true });
    trees.begin();
    const rand = seeded(7);
    for (let x = -10; x < GRID + 8; x++) {
      for (let z = -10; z < GRID + 8; z++) {
        const insideGrid = x >= 0 && z >= 0 && x < GRID && z < GRID;
        const inRiver = (x >= RIVER_START && x < GRID) || (z >= RIVER_START && z < GRID);
        if (insideGrid || inRiver) continue;
        const farBank = x >= GRID || z >= GRID;
        if (rand() > (farBank ? 0.25 : 0.6)) continue;
        const cx = wx(x) + 0.5 + (rand() - 0.5) * 0.4;
        const cz = wz(z) + 0.5 + (rand() - 0.5) * 0.4;
        if (rand() < 0.3) addBamboo(trees, cx, cz, rand, 4, 2.0);
        else addTree(trees, cx, cz, rand);
      }
    }
    trees.end();
    return trees.mesh;
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
      if (!v || v.level !== b.level) this.createView(b);
    }
    for (const [id, v] of this.views) {
      if (!alive.has(id)) {
        this.buildingsRoot.remove(v.group);
        this.views.delete(id);
      }
    }

    const walls = state.buildings.filter((b) => b.type === 'luy');
    const key = walls.map((b) => b.id).join(',');
    if (key !== this.wallKey) {
      this.wallKey = key;
      this.walls.begin();
      for (const w of walls) {
        const cx = wx(w.x) + 0.5;
        const cz = wz(w.z) + 0.5;
        this.walls.add(0.96, 0.12, 0.96, C.soil, cx, 0.06, cz);
        addBamboo(this.walls, cx, cz, seeded(w.x * 92821 + w.z * 68917), 5, 1.7);
      }
      this.walls.end();
    }
  }

  private createView(b: Building): void {
    const old = this.views.get(b.id);
    if (old) this.buildingsRoot.remove(old.group);
    const def = BUILDINGS[b.type];
    const group = b.type === 'dien' ? makeDien(b.level) : b.type === 'ruong' ? makeRuong(b.level) : makeBen(b.level);
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
    this.buildingsRoot.add(group);
    this.views.set(b.id, { group, type: b.type, level: b.level, person, popAge: 0, baseScale: group.scale.x });
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
    this.forest.begin();
    const lo = areaStart(level);
    for (let x = 0; x < RIVER_START; x++) {
      for (let z = 0; z < RIVER_START; z++) {
        if (isUnlocked(x, z, level)) continue;
        const rand = seeded(x * 73856093 + z * 19349663);
        // Chừa một dải đất trống sát vùng đã mở cho dễ nhìn.
        const nearEdge = x >= lo - 1 && z >= lo - 1;
        if (rand() > (nearEdge ? 0.25 : 0.65)) continue;
        const cx = wx(x) + 0.5 + (rand() - 0.5) * 0.3;
        const cz = wz(z) + 0.5 + (rand() - 0.5) * 0.3;
        if (rand() < 0.35) addBamboo(this.forest, cx, cz, rand, 4, 2.0);
        else addTree(this.forest, cx, cz, rand);
      }
    }
    this.forest.end();
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
      this.ghost = type === 'luy' ? new THREE.Group() : type === 'ruong' ? makeRuong(1) : type === 'ben' ? makeBen(1) : makeDien(1);
      this.ghost.userData.type = type;
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false });
      this.ghost.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.material = mat;
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
      }
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
      this.ripples.add(w, 0.02, d, 0xbfe3f0, x, WATER_Y + 0.01, z);
    }
    this.ripples.end();

    if (this.selection.visible) {
      (this.selection.material as THREE.LineBasicMaterial).opacity = 0.6 + Math.sin(t * 5) * 0.4;
    }

    this.renderer.render(this.scene, this.view.camera);
  }
}

