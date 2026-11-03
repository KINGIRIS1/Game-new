// Ảnh công trình cho bảng Xây dựng, vẽ sẵn từ chính mô hình trong game ở cấp 1 (cấp sẽ xây), trên bệ cỏ, nhìn chéo
// như camera game. Ảnh không vẽ lúc chơi: `node scripts/anh-cong-trinh.mjs` vẽ ra `public/anh-cong-trinh/<loại>.webp`
// và ghi dấu vân tay mô hình (`thumbHash`) vào `anhCongTrinhDau.ts`; game chỉ tải ảnh như ảnh thường.
// `anhCongTrinh.test.ts` so dấu vân tay với mô hình hiện tại: đổi dáng công trình mà chưa vẽ lại ảnh thì test hỏng.

import * as THREE from 'three';
import { BUILDINGS, isBridge, type BuildingType } from '../game/defs';
import { CONG_TRINH, lotModel } from './congTrinh/index';
import { addSunLights } from './lights';
import { CITADEL_TOP, SEA_BOAT_SCALE, buildCitadel, buildDikes, buildWalls, makeBoat, makeSailBoat, makeThuyenKhoi, makeTradeBoat, makeUNo } from './models';
import { C } from './palette';
import { ramp } from './toon';

/** Loại công trình, hay ụ nỏ (dựng trên đoạn thành, không phải loại công trình riêng). */
export type ThumbKind = BuildingType | 'uNo';

/** Mọi loại có ảnh: mọi loại công trình và ụ nỏ. */
export const THUMB_KINDS: ThumbKind[] = [...(Object.keys(BUILDINGS) as BuildingType[]), 'uNo'];

/** Khổ ảnh (4:3). Ảnh lớn trong bảng rộng chừng 160 điểm CSS, nhân mật độ điểm ảnh điện thoại. */
export const THUMB_W = 400;
export const THUMB_H = 300;

/** Tăng số này khi đổi cách dựng cảnh ảnh (bệ, khúc sông, khung hình) để test đòi vẽ lại mọi ảnh. */
const THUMB_VERSION = 1;

const AZ = Math.PI / 4;
const EL = THREE.MathUtils.degToRad(38);
const WATER_Y = -0.28;

const mat = (color: number) => new THREE.MeshToonMaterial({ color, gradientMap: ramp });
const GRASS = mat(C.grass[0]);
const EARTH = mat(0x9a7448);
const WATER = mat(C.water[0]);

/** Bệ đất cỏ cạnh `w`×`d` ô dưới công trình, mặt bệ ở y = 0. */
function plinth(w: number, d: number, x = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), [EARTH, EARTH, GRASS, EARTH, EARTH, EARTH]);
  m.position.set(x, -0.175, z);
  m.receiveShadow = true;
  return m;
}

function water(w: number, d: number, x: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), WATER);
  m.position.set(x, WATER_Y - 0.06, z);
  m.receiveShadow = true;
  return m;
}

/** Cảnh của ảnh: công trình trên bệ cỏ; bến, làng chài có khúc sông và thuyền neo; cầu vắt qua khúc sông. */
export function thumbScene(kind: ThumbKind): THREE.Group {
  const level = 1;
  const g = new THREE.Group();
  if (kind === 'luy' || kind === 'de' || kind === 'thanh' || kind === 'uNo') {
    // Đoạn tường gấp góc cho thấy các đoạn nối nhau.
    const cells: [number, number][] = kind === 'uNo' ? [[-1, 0], [0, 0], [1, 0]] : [[-1, 0.5], [0, 0.5], [1, 0.5], [1, -0.5]];
    g.add(plinth(3, kind === 'uNo' ? 1 : 2));
    if (kind === 'luy') g.add(buildWalls(cells.map(([x, z], i) => ({ x, y: 0, z, seed: i * 92821 + 7, level, damaged: false }))));
    else if (kind === 'de') g.add(buildDikes(cells.map(([x, z]) => ({ x, y: 0, z, level, damaged: false }))));
    else {
      g.add(buildCitadel(cells.map(([x, z], i) => ({ x, y: 0, z, seed: i * 31 + 5, damaged: false }))));
      if (kind === 'uNo') {
        const u = makeUNo();
        u.position.set(0, CITADEL_TOP, 0);
        g.add(u);
      }
    }
    return g;
  }
  const def = BUILDINGS[kind];
  const b = lotModel(kind, level);
  if (isBridge(kind)) {
    // Cầu vắt qua lòng sông, hai đầu chạm bờ cỏ.
    const along = def.d > def.w;
    const span = Math.max(def.w, def.d);
    const width = Math.min(def.w, def.d) + 2;
    g.add(along ? water(width, span - 2, 0, 0) : water(span - 2, width, 0, 0));
    for (const s of [-1, 1]) {
      const p = along ? plinth(width - 0.3, 1.2, 0, s * (span / 2 - 0.3)) : plinth(1.2, width - 0.3, s * (span / 2 - 0.3), 0);
      g.add(p);
    }
    g.add(b);
    return g;
  }
  g.add(plinth(def.w, def.d));
  if (def.nearRiver) {
    // Mặt trước quay ra sông (phía +z), thuyền neo như trong game.
    g.add(water(def.w + 2, 3, 0, def.d / 2 + 1.5));
    const docks = CONG_TRINH[kind]?.docks?.(level) ?? [];
    for (const d of docks) {
      const boat = d.kind === 'trader' ? makeTradeBoat(d.big) : d.big ? makeSailBoat() : makeBoat();
      boat.position.set(d.x, WATER_Y - 0.02, d.z);
      boat.rotation.y = d.ry;
      if (d.scale) boat.scale.setScalar(d.scale);
      g.add(boat);
    }
    if (kind === 'benKhoi') {
      // Thuyền khơi neo dọc cầu tàu, như lúc chờ ra biển (`benDock`: cách mép móng một ô).
      const boat = makeThuyenKhoi(level);
      boat.position.set(0, WATER_Y - 0.02, def.d / 2 + 1);
      boat.scale.setScalar(SEA_BOAT_SCALE);
      g.add(boat);
    }
  }
  g.add(b);
  return g;
}

/**
 * Dấu vân tay của cảnh ảnh: băm hình khối, màu đỉnh, vị trí mọi khối (làm tròn) theo thứ tự dựng. Đổi dáng hay màu
 * công trình thì dấu đổi.
 */
export function thumbHash(kind: ThumbKind): string {
  const root = thumbScene(kind);
  root.updateMatrixWorld(true);
  let h = 0x811c9dc5 ^ THUMB_VERSION;
  const mix = (n: number) => {
    h ^= n & 0xffff;
    h = Math.imul(h, 0x01000193);
    h ^= n >>> 16;
    h = Math.imul(h, 0x01000193);
  };
  const arr = (a: ArrayLike<number>) => {
    mix(a.length);
    for (let i = 0; i < a.length; i++) mix(Math.round(a[i] * 1000));
  };
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.geometry) return;
    arr(m.matrixWorld.elements);
    const g = m.geometry as THREE.BufferGeometry;
    for (const name of ['position', 'color']) {
      const a = g.getAttribute(name);
      if (a) arr(a.array as ArrayLike<number>);
    }
    if (g.index) arr(g.index.array);
    const inst = (o as THREE.InstancedMesh).instanceMatrix;
    if (inst) arr(inst.array);
    for (const mat of ([] as THREE.Material[]).concat(m.material)) {
      const c = (mat as THREE.MeshBasicMaterial).color;
      if (c) mix(c.getHex());
    }
  });
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Renderer để vẽ ảnh: nền trong suốt, có bóng đổ, vẽ gấp đôi cỡ ảnh để thu về cho mịn cạnh. */
export function thumbRenderer(): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(2);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

/**
 * Vẽ ảnh `kind` lên canvas của `renderer` (khổ `THUMB_W`×`THUMB_H`, nền trong suốt). Chỉ `scripts/anh-cong-trinh.mjs`
 * gọi, lúc vẽ sẵn ảnh.
 */
export function renderThumb(renderer: THREE.WebGLRenderer, kind: ThumbKind): void {
  const scene = new THREE.Scene();
  const root = thumbScene(kind);
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  scene.add(root);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  addSunLights(scene, Math.max(size.x, size.z) * 0.8 + 2, 2048);

  // Camera nhìn chéo như trong game, khung 4:3 ôm trọn khối bao.
  const dir = new THREE.Vector3(Math.cos(EL) * Math.sin(AZ), Math.sin(EL), Math.cos(EL) * Math.cos(AZ));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  cam.position.copy(center).addScaledVector(dir, 100);
  cam.lookAt(center);
  cam.updateMatrixWorld(true);
  const inv = cam.matrixWorldInverse;
  let hx = 0;
  let hy = 0;
  const p = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    p.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(inv);
    hx = Math.max(hx, Math.abs(p.x));
    hy = Math.max(hy, Math.abs(p.y));
  }
  const aspect = THUMB_W / THUMB_H;
  const halfY = Math.max(hy, hx / aspect) * 1.04;
  cam.left = -halfY * aspect;
  cam.right = halfY * aspect;
  cam.top = halfY;
  cam.bottom = -halfY;
  cam.updateProjectionMatrix();

  renderer.setClearColor(0x000000, 0);
  renderer.setSize(THUMB_W, THUMB_H, false);
  renderer.render(scene, cam);
}
