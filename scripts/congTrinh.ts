// Bảng công trình cho scripts/chup-cong-trinh.mjs: dựng dáng cũ và dáng móng mới (src/render/mongMoi.ts) ở từng cấp
// trên cùng tỉ lệ ô đất, có người đứng để so cỡ, rồi chụp bằng camera nhìn chéo như trong game.
// Chạy trong trình duyệt qua Vite.

import * as THREE from 'three';
import { dienFloor, makeDien, makeNhaSan } from '../src/render/buildings';
import { addSunLights } from '../src/render/lights';
import { dienSpots, makeDienMoi, makeNhaSanMoi, nhaSanSpots } from '../src/render/mongMoi';
import { C } from '../src/render/palette';
import { makeWorker, type Job } from '../src/render/people';
import type { Poser } from '../src/render/rig';

/** Người trong kinh đô cao chừng này lần dáng gốc (như dân ở công trình cấp 5 trong game). */
const PERSON = 0.85 * 1.05;

interface Person {
  job: Job;
  x: number;
  y: number;
  z: number;
  ry: number;
}

interface Version {
  /** Cạnh móng (ô). */
  tiles: number;
  make: (level: number) => THREE.Group;
  /** Người đứng ở cấp này, tọa độ thế giới tính từ tâm móng. */
  people: (level: number) => Person[];
}

interface Kind {
  ten: string;
  cu: Version;
  moi: Version;
  /** Nửa chiều cao khung nhìn (ô) và độ cao tâm nhìn khi chụp từng cấp. */
  half: number;
  lookY: number;
  /** Điểm ảnh mỗi ô khi chụp từng cấp. */
  px: number;
}

const KINDS: Record<string, Kind> = {
  dien: {
    ten: 'Điện Vua Hùng',
    half: 5.4,
    lookY: 1.9,
    px: 44,
    cu: {
      tiles: 4,
      make: makeDien,
      // Như world.ts: Lạc hầu và lính gác đứng trên nền trước thềm, theo cỡ Điện.
      people: (lv) => {
        const k = Math.min(0.8 + 0.05 * lv, 1.05);
        const y = dienFloor(lv) * k;
        return [
          { job: 'lacHau', x: 0.75 * k, y, z: 1.75 * k, ry: 0 },
          ...(lv >= 2 ? [{ job: 'linhGac' as Job, x: -1.0 * k, y, z: 1.8 * k, ry: 0.2 }] : []),
        ];
      },
    },
    moi: {
      tiles: 5,
      make: makeDienMoi,
      people: (lv) => dienSpots(lv).map((s, i) => ({ job: i ? 'linhGac' : 'lacHau', ...s })),
    },
  },
  nhaSan: {
    ten: 'Nhà sàn',
    half: 3.2,
    lookY: 1.0,
    px: 64,
    cu: {
      tiles: 2,
      make: makeNhaSan,
      people: (lv) => {
        const k = Math.min(1, 1.05 / (0.8 + 0.05 * lv));
        const g = 0.8 + 0.05 * lv;
        const spots: Person[] = [
          { job: 'phuNu', x: 0.65 * k * g, y: 0.06 * g, z: 0.7 * k * g, ry: 0.4 },
          { job: 'phuNu', x: -0.65 * k * g, y: 0.06 * g, z: 0.35 * k * g, ry: -0.6 },
        ];
        return spots.slice(0, lv >= 2 ? 2 : 1);
      },
    },
    moi: {
      tiles: 3,
      make: makeNhaSanMoi,
      people: (lv) => nhaSanSpots().slice(0, lv >= 2 ? 2 : 1).map((s) => ({ job: 'phuNu' as Job, ...s })),
    },
  },
};

const AZ = Math.PI / 4;
const EL = THREE.MathUtils.degToRad(38);

/** Mặt cỏ `size` ô quanh gốc, có đường kẻ ô để đếm được móng. Móng công trình tô đậm hơn. */
function groundPatch(size: number, lots: { x: number; z: number; tiles: number }[]): THREE.Group {
  const g = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), new THREE.MeshLambertMaterial({ color: C.grass[0] }));
  grass.position.y = -0.1;
  grass.receiveShadow = true;
  g.add(grass);
  const pts: number[] = [];
  const h = size / 2;
  for (let i = -h; i <= h + 1e-6; i++) pts.push(i, 0.004, -h, i, 0.004, h, -h, 0.004, i, h, 0.004, i);
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

function place(scene: THREE.Scene, v: Version, level: number, x: number, z: number): void {
  const b = v.make(level);
  b.position.set(x, 0, z);
  scene.add(b);
  for (const p of v.people(level)) {
    const w = makeWorker(p.job);
    w.position.set(x + p.x, p.y, z + p.z);
    w.rotation.y = p.ry;
    w.scale.setScalar(PERSON);
    (w.userData.pose as Poser | undefined)?.({ act: 'stand', time: 0.3 });
    scene.add(w);
  }
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

/** Từng cấp: mỗi cấp một cặp ảnh cũ, mới cùng tỉ lệ. */
export function chupCap(loai: string): { cap: number; cu: string; moi: string }[] {
  const k = KINDS[loai];
  if (!k) throw new Error(`Không có công trình ${loai}. Có: ${Object.keys(KINDS).join(', ')}`);
  const renderer = makeRenderer();
  const size = k.moi.tiles + 2;
  const h = Math.round(2 * k.half * k.px);
  const w = Math.round(h * 1.15);
  const out: { cap: number; cu: string; moi: string }[] = [];
  for (let level = 1; level <= 8; level++) {
    const shots: string[] = [];
    for (const v of [k.cu, k.moi]) {
      const scene = newScene(size);
      scene.add(groundPatch(size, [{ x: 0, z: 0, tiles: v.tiles }]));
      place(scene, v, level, 0, 0);
      shots.push(render(renderer, scene, w, h, k.half, new THREE.Vector3(0, k.lookY, 0)));
    }
    out.push({ cap: level, cu: shots[0], moi: shots[1] });
  }
  renderer.dispose();
  renderer.domElement.remove();
  return out;
}

/**
 * Cảnh cỡ thật: Điện giữa hai nhà sàn như một góc kinh đô, cũ và mới, ở cấp `levels`.
 * `px` điểm ảnh mỗi ô, chừng như trên điện thoại lúc chưa phóng to (độ nét 1,5).
 */
export function chupCanh(levels: number[], px = 32): { cap: number; cu: string; moi: string }[] {
  const renderer = makeRenderer();
  const out: { cap: number; cu: string; moi: string }[] = [];
  const half = 8;
  const h = Math.round(2 * half * px);
  const w = Math.round(h * 1.2);
  for (const level of levels) {
    const shots: string[] = [];
    for (const which of ['cu', 'moi'] as const) {
      const d = KINDS.dien[which];
      const n = KINDS.nhaSan[which];
      const scene = newScene(12);
      const gap = 1;
      const nx = d.tiles / 2 + gap + n.tiles / 2;
      const nz = -d.tiles / 2 + n.tiles / 2;
      const lots = [
        { x: 0, z: 0, tiles: d.tiles },
        { x: -nx, z: nz, tiles: n.tiles },
        { x: nx, z: nz, tiles: n.tiles },
        { x: -nx, z: nz + n.tiles + gap, tiles: n.tiles },
      ];
      scene.add(groundPatch(16, lots));
      place(scene, d, level, 0, 0);
      for (const l of lots.slice(1)) place(scene, n, level, l.x, l.z);
      shots.push(render(renderer, scene, w, h, half, new THREE.Vector3(0, 1.2, 0)));
    }
    out.push({ cap: level, cu: shots[0], moi: shots[1] });
  }
  renderer.dispose();
  renderer.domElement.remove();
  return out;
}

export const LOAI = Object.fromEntries(Object.entries(KINDS).map(([id, k]) => [id, { ten: k.ten, cu: k.cu.tiles, moi: k.moi.tiles }]));
