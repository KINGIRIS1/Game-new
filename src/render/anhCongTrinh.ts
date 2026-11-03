// Ảnh công trình cho bảng Xây dựng, vẽ từ chính mô hình trong game ở cấp 1 (cấp sẽ xây), trên bệ cỏ, nhìn chéo như
// camera game. Một WebGLRenderer nhỏ riêng, dựng lúc cần, vẽ vài ảnh mỗi khung rồi tự hủy khi xong cho nhẹ máy.
// Ảnh giữ ở dạng blob URL (chuỗi ngắn) để bảng so HTML không phải so cả ảnh.

import * as THREE from 'three';
import { BUILDINGS, isBridge, type BuildingType } from '../game/defs';
import { CONG_TRINH, lotModel } from './congTrinh/index';
import { addSunLights } from './lights';
import { CITADEL_TOP, buildCitadel, buildDikes, buildWalls, makeBoat, makeSailBoat, makeTradeBoat, makeUNo } from './models';
import { C } from './palette';
import { ramp } from './toon';

/** Loại công trình, hay ụ nỏ (dựng trên đoạn thành, không phải loại công trình riêng). */
export type ThumbKind = BuildingType | 'uNo';

const AZ = Math.PI / 4;
const EL = THREE.MathUtils.degToRad(38);
const WATER_Y = -0.28;

const cache = new Map<string, string>();
const pending = new Set<string>();
const queue: { kind: ThumbKind; px: number; key: string }[] = [];
const listeners: (() => void)[] = [];
let renderer: THREE.WebGLRenderer | null = null;
let frame = 0;
let idle = 0;
let notifyAt = 0;

/** Ảnh công trình `kind` khổ 4:3 rộng `px` điểm ảnh. Chưa có thì xếp hàng vẽ và trả null (bảng hiện icon tạm). */
export function thumb(kind: ThumbKind, px: number): string | null {
  const key = thumbKey(kind, px);
  const url = cache.get(key);
  if (url) return url;
  if (!pending.has(key)) {
    pending.add(key);
    // Ảnh lớn là ảnh người chơi đang xem: vẽ trước các ảnh nhỏ còn chờ.
    if (px > 256) queue.unshift({ kind, px, key });
    else queue.push({ kind, px, key });
    if (!frame) frame = requestAnimationFrame(work);
  }
  return null;
}

/** Ảnh đã vẽ xong theo khóa `thumbKey`, không xếp hàng vẽ. */
export function cachedThumb(key: string): string | null {
  return cache.get(key) ?? null;
}

export const thumbKey = (kind: ThumbKind, px: number) => `${kind}:${px}`;

/** Gọi `cb` khi có thêm ảnh vẽ xong (gộp mỗi khung một lần). */
export function onThumb(cb: () => void): void {
  listeners.push(cb);
}

function work(): void {
  frame = 0;
  const t0 = performance.now();
  // Mỗi khung vẽ tới chừng 12 ms rồi nhường cho cảnh chính.
  while (queue.length && performance.now() - t0 < 12) draw(queue.shift()!);
  if (queue.length) frame = requestAnimationFrame(work);
  else {
    clearTimeout(idle);
    idle = window.setTimeout(release, 4000);
  }
}

function release(): void {
  if (!renderer || queue.length) return;
  renderer.dispose();
  renderer.forceContextLoss();
  renderer = null;
}

function getRenderer(): THREE.WebGLRenderer {
  if (renderer) return renderer;
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

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

/** Dựng cảnh nhỏ: công trình trên bệ cỏ; bến, làng chài có khúc sông và thuyền neo; cầu vắt qua khúc sông. */
function model(kind: ThumbKind): THREE.Group {
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
  }
  g.add(b);
  return g;
}

function draw(job: { kind: ThumbKind; px: number; key: string }): void {
  const r = getRenderer();
  const scene = new THREE.Scene();
  const root = model(job.kind);
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  scene.add(root);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  addSunLights(scene, Math.max(size.x, size.z) * 0.8 + 2, 1024);

  // Camera nhìn chéo như trong game, khung ôm trọn khối bao.
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
  // Khung ngang 4:3: công trình nhìn chéo thường bè ngang hơn cao.
  const w = job.px;
  const h = Math.round(job.px * 0.75);
  const halfY = Math.max(hy, hx * 0.75) * 1.04;
  const halfX = halfY / 0.75;
  cam.left = -halfX;
  cam.right = halfX;
  cam.top = halfY;
  cam.bottom = -halfY;
  cam.updateProjectionMatrix();

  r.setSize(w, h, false);
  r.render(scene, cam);
  // Chép ngay sang canvas 2D: đọc thẳng canvas WebGL bằng toBlob có lúc ra ảnh trống khi khung sau đã đổi cỡ.
  const copy = document.createElement('canvas');
  copy.width = w;
  copy.height = h;
  copy.getContext('2d')!.drawImage(r.domElement, 0, 0);
  copy.toBlob((blob) => {
    if (!blob) return;
    cache.set(job.key, URL.createObjectURL(blob));
    pending.delete(job.key);
    if (!notifyAt) {
      notifyAt = requestAnimationFrame(() => {
        notifyAt = 0;
        for (const cb of listeners) cb();
      });
    }
  }, 'image/png');
}
