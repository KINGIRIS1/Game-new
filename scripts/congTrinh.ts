// Bảng công trình cho scripts/chup-cong-trinh.mjs: dựng dáng cũ phóng theo móng (như kinh đô lớn lúc chưa vẽ lại)
// và dáng vẽ trên móng mới (src/render/congTrinh/) ở từng cấp, cùng móng, có người đứng để so cỡ, rồi chụp bằng
// camera nhìn chéo như trong game. Chạy trong trình duyệt qua Vite.

import * as THREE from 'three';
import { BUILDINGS, type BuildingType } from '../src/game/defs';
import {
  benBoats,
  dienFloor,
  footScale,
  makeBaiDa,
  makeBen,
  makeChuongVoi,
  makeDien,
  makeDoanhTrai,
  makeKho,
  makeLoRen,
  makeNhaSan,
  makeRuong,
  makeTraiCung,
  makeTraiGiao,
} from '../src/render/buildings';
import type { Dock, LotSpot } from '../src/render/congTrinh/chung';
import { CONG_TRINH } from '../src/render/congTrinh/index';
import { addSunLights } from '../src/render/lights';
import { makeBoat, makeTradeBoat } from '../src/render/models';
import { C } from '../src/render/palette';
import { makeWorker } from '../src/render/people';
import { vi } from '../src/text/vi';
import type { Poser } from '../src/render/rig';

/** Người trong kinh đô cao chừng này lần dáng gốc (như dân ở công trình cấp 5 trong game). */
const PERSON = 0.85 * 1.05;
/** Mặt nước sông thấp hơn mặt đất chừng này (như world.ts). */
const WATER_Y = -0.28;

/**
 * Dáng cũ, để so: hàm dựng cũ, chỗ đứng cũ (chép từ world.ts trước khi vẽ lại), phóng theo móng mới bằng `footScale`
 * như kinh đô lớn lúc chưa vẽ lại.
 */
const CU: Partial<Record<BuildingType, { make: (level: number) => THREE.Group; spots: LotSpot[] }>> = {
  dien: { make: makeDien, spots: [] },
  ruong: {
    make: makeRuong,
    spots: [
      { job: 'nong', x: -0.35, y: 0.06, z: -0.3, ry: 0.4 },
      { job: 'nong', x: 0.7, y: 0.06, z: -0.25, ry: -0.3 },
      { job: 'nong', x: -0.8, y: 0.06, z: 0.3, ry: 0.9 },
      { job: 'nong', x: 0.2, y: 0.06, z: 0.45, ry: -0.8 },
      { job: 'nong', x: -0.25, y: 0.06, z: 1.05, ry: 0.2 },
    ],
  },
  ben: {
    make: makeBen,
    spots: [
      { job: 'buon', x: -0.45, y: 0.5, z: 0.05, ry: 0 },
      { job: 'buon', x: 0.45, y: 0.5, z: 0.0, ry: 0 },
      { job: 'buon', x: 0.55, y: 0.38, z: 1.3, ry: 0 },
      { job: 'buon', x: -0.2, y: 0.5, z: -0.7, ry: 0 },
    ],
  },
  nhaSan: {
    make: makeNhaSan,
    spots: [
      { job: 'phuNu', x: 0.65, y: 0.06, z: 0.7, ry: 0.4 },
      { job: 'phuNu', x: -0.65, y: 0.06, z: 0.35, ry: -0.6 },
    ],
  },
  baiDa: {
    make: makeBaiDa,
    spots: [
      { job: 'thoDa', x: 0.15, y: 0.1, z: 0.15, ry: 0.6 },
      { job: 'thoDa', x: 0.65, y: 0.1, z: 0.1, ry: -0.5 },
      { job: 'thoDa', x: -0.55, y: 0.1, z: 0.0, ry: 2.6 },
      { job: 'thoDa', x: -0.75, y: 0.1, z: 0.35, ry: -2 },
      { job: 'thoDa', x: 0.92, y: 0.1, z: -0.18, ry: 2.8 },
    ],
  },
  loRen: {
    make: makeLoRen,
    spots: [
      { job: 'thoRen', x: 0.45, y: 0.08, z: 0.82, ry: Math.PI },
      { job: 'thoRen', x: -0.15, y: 0.08, z: 0.3, ry: -2.4 },
      { job: 'thoRen', x: -0.6, y: 0.08, z: 0.55, ry: 2.6 },
      { job: 'thoRen', x: 0.62, y: 0.08, z: -0.1, ry: -1.6 },
    ],
  },
  kho: { make: makeKho, spots: [{ job: 'giuKho', x: -0.1, y: 0.06, z: 0.7, ry: 0 }] },
  doanhTrai: {
    make: makeDoanhTrai,
    spots: [
      { job: 'linhGac', x: -0.2, y: 0.08, z: 1.0, ry: 0 },
      { job: 'linhGac', x: 0.95, y: 0.08, z: 0.3, ry: -0.6 },
    ],
  },
  traiGiao: { make: () => makeTraiGiao(), spots: [] },
  traiCung: { make: () => makeTraiCung(), spots: [] },
  chuongVoi: { make: () => makeChuongVoi(), spots: [] },
};

/** Số người hiện ra như world.ts: công trình cần người làm thì đủ chỗ làm của cấp ấy, nhà sàn và doanh trại 1–2 người, còn lại 1. */
function peopleCount(type: BuildingType, level: number, spots: number): number {
  const work = BUILDINGS[type].workers;
  if (work) return Math.min(work[Math.min(level, work.length) - 1], spots);
  if (type === 'nhaSan' || type === 'doanhTrai' || type === 'dien') return Math.min(level >= 2 ? 2 : 1, spots);
  return Math.min(1, spots);
}

const AZ = Math.PI / 4;
const EL = THREE.MathUtils.degToRad(38);

/** Mặt cỏ `size` ô quanh gốc có đường kẻ ô; `riverFrom`: từ z này trở ra là sông. Móng công trình viền đen. */
function groundPatch(size: number, lots: { x: number; z: number; tiles: number }[], riverFrom?: number): THREE.Group {
  const g = new THREE.Group();
  const h = size / 2;
  const landD = riverFrom === undefined ? size : riverFrom + h;
  const grass = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, landD), new THREE.MeshLambertMaterial({ color: C.grass[0] }));
  grass.position.set(0, -0.1, -h + landD / 2);
  grass.receiveShadow = true;
  g.add(grass);
  if (riverFrom !== undefined) {
    const water = new THREE.Mesh(new THREE.BoxGeometry(size, 0.05, size - landD), new THREE.MeshLambertMaterial({ color: C.water[0] }));
    water.position.set(0, WATER_Y - 0.03, riverFrom + (size - landD) / 2);
    g.add(water);
  }
  const pts: number[] = [];
  for (let i = -h; i <= h + 1e-6; i++) {
    pts.push(i, 0.004, -h, i, 0.004, -h + landD);
    if (i <= -h + landD + 1e-6) pts.push(-h, 0.004, i, h, 0.004, i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x4a5a2a, transparent: true, opacity: 0.45 })));
  for (const l of lots) {
    const edge: number[] = [];
    const a = l.tiles / 2;
    const c: [number, number][] = [[-a, -a], [a, -a], [a, a], [-a, a], [-a, -a]];
    for (let i = 0; i < 4; i++) edge.push(l.x + c[i][0], 0.01, l.z + c[i][1], l.x + c[i + 1][0], 0.01, l.z + c[i + 1][1]);
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(edge, 3));
    g.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: C.ink })));
  }
  return g;
}

function addPeople(group: THREE.Group, spots: LotSpot[], scale: number, spread: number): void {
  for (const p of spots) {
    const w = makeWorker(p.job);
    w.position.set(p.x * spread, p.y, p.z * spread);
    w.rotation.y = p.ry;
    w.scale.setScalar(scale);
    (w.userData.pose as Poser | undefined)?.({ act: 'stand', time: 0.3 });
    group.add(w);
  }
}

function addDocks(group: THREE.Group, docks: Dock[], spread = 1): void {
  for (const d of docks) {
    const boat = d.kind === 'trader' ? makeTradeBoat() : makeBoat();
    boat.position.set(d.x * spread, WATER_Y - 0.02, d.z * spread);
    boat.rotation.y = d.ry;
    if (d.scale) boat.scale.setScalar(d.scale);
    group.add(boat);
  }
}

/** Dáng cũ ở cấp `level`, phóng theo móng và đặt như world.ts đặt trước khi vẽ lại (người, thuyền là con của mô hình). */
function placeOld(scene: THREE.Scene, type: BuildingType, level: number, x: number, z: number): void {
  const v = CU[type]!;
  const b = v.make(level);
  const k = footScale(type);
  b.scale.multiplyScalar(k);
  b.position.set(x, 0, z);
  const spread = (b.userData.spread as number | undefined) ?? 1;
  if (type === 'dien') {
    const y = dienFloor(level);
    const spots: LotSpot[] = [{ job: 'lacHau', x: 0.75, y, z: 1.75, ry: 0 }, ...(level >= 2 ? [{ job: 'linhGac' as const, x: -1.0, y, z: 1.8, ry: 0.2 }] : [])];
    addPeople(b, spots, 0.85 / k, 1);
  } else addPeople(b, v.spots.slice(0, peopleCount(type, level, v.spots.length)), (0.85 * spread) / k, spread);
  if (type === 'ben') {
    // Thuyền là con của bến (bến to theo cấp và theo móng): chia cho cỡ bến để thuyền vẫn nổi đúng mặt nước.
    for (const boat of benBoats(level, spread)) {
      boat.position.y = (WATER_Y - 0.02) / b.scale.y;
      b.add(boat);
    }
  }
  scene.add(b);
}

/** Dáng mới ở cấp `level`: người giữ cỡ, không thu tâm. */
function placeNew(scene: THREE.Scene, type: BuildingType, level: number, x: number, z: number): void {
  const v = CONG_TRINH[type]!;
  const b = v.make(level);
  b.position.set(x, 0, z);
  const spots = v.spots(level);
  addPeople(b, spots.slice(0, peopleCount(type, level, spots.length)), PERSON, 1);
  if (v.docks) addDocks(b, v.docks(level));
  scene.add(b);
}

function render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, w: number, h: number, half: number, target: THREE.Vector3): string {
  renderer.setSize(w, h);
  const aspect = w / h;
  const cam = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 200);
  cam.position.set(Math.cos(EL) * Math.sin(AZ), Math.sin(EL), Math.cos(EL) * Math.cos(AZ)).multiplyScalar(60).add(target);
  cam.lookAt(target);
  renderer.render(scene, cam);
  return (renderer.domElement as HTMLCanvasElement).toDataURL('image/png');
}

function newScene(extent: number): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.sky);
  addSunLights(scene, extent, 2048);
  return scene;
}

function makeRenderer(): THREE.WebGLRenderer {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

export interface Shot {
  cap: number;
  cu: string;
  moi: string;
}

/** Từng cấp của một loại: mỗi cấp một cặp ảnh cũ, mới cùng tỉ lệ ô đất. Loại một cấp thì chỉ một cặp. */
export function chupCap(loai: string): Shot[] {
  const type = loai as BuildingType;
  const moi = CONG_TRINH[type];
  const cu = CU[type];
  if (!moi || !cu) throw new Error(`Không có công trình ${loai}. Có: ${Object.keys(CONG_TRINH).join(', ')}`);
  const renderer = makeRenderer();
  // Bến có thêm dải sông phía trước cho cầu tàu và thuyền.
  const size = moi.tiles + (type === 'ben' ? 6 : 2);
  const { half, lookY, px } = moi.view;
  const h = Math.round(2 * half * px);
  const w = Math.round(h * 1.15);
  const river = type === 'ben' ? moi.tiles / 2 : undefined;
  const out: Shot[] = [];
  for (let level = 1; level <= BUILDINGS[type].maxLevel; level++) {
    const shots: string[] = [];
    for (const which of ['cu', 'moi'] as const) {
      const scene = newScene(size);
      scene.add(groundPatch(size, [{ x: 0, z: 0, tiles: moi.tiles }], river));
      if (which === 'cu') placeOld(scene, type, level, 0, 0);
      else placeNew(scene, type, level, 0, 0);
      shots.push(render(renderer, scene, w, h, half, new THREE.Vector3(0, lookY, 0)));
    }
    out.push({ cap: level, cu: shots[0], moi: shots[1] });
  }
  renderer.dispose();
  renderer.domElement.remove();
  return out;
}

/**
 * Cảnh cỡ thật: Điện giữa ba nhà sàn như một góc kinh đô, cũ và mới, ở cấp `levels`.
 * `px` điểm ảnh mỗi ô, chừng như trên điện thoại lúc chưa phóng to (độ nét 1,5).
 */
export function chupCanh(levels: number[], px = 32): Shot[] {
  const renderer = makeRenderer();
  const out: Shot[] = [];
  const half = 8;
  const h = Math.round(2 * half * px);
  const w = Math.round(h * 1.2);
  for (const level of levels) {
    const shots: string[] = [];
    for (const which of ['cu', 'moi'] as const) {
      const dt = CONG_TRINH.dien!.tiles;
      const nt = CONG_TRINH.nhaSan!.tiles;
      const scene = newScene(12);
      const gap = 1;
      const nx = dt / 2 + gap + nt / 2;
      const nz = -dt / 2 + nt / 2;
      const lots = [
        { x: 0, z: 0, tiles: dt },
        { x: -nx, z: nz, tiles: nt },
        { x: nx, z: nz, tiles: nt },
        { x: -nx, z: nz + nt + gap, tiles: nt },
      ];
      scene.add(groundPatch(16, lots));
      const put = which === 'cu' ? placeOld : placeNew;
      put(scene, 'dien', level, 0, 0);
      for (const l of lots.slice(1)) put(scene, 'nhaSan', level, l.x, l.z);
      shots.push(render(renderer, scene, w, h, half, new THREE.Vector3(0, 1.2, 0)));
    }
    out.push({ cap: level, cu: shots[0], moi: shots[1] });
  }
  renderer.dispose();
  renderer.domElement.remove();
  return out;
}

export const LOAI = Object.fromEntries(
  Object.keys(CONG_TRINH).map((id) => [id, { ten: vi.buildings[id as BuildingType].name, moi: CONG_TRINH[id as BuildingType]!.tiles }]),
);
