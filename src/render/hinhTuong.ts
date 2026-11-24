// Hình tướng mặc đồ cho túi đồ: tướng đứng mặc đúng các món đang đeo (vũ khí cầm tay, giáp, miện, áo choàng, bao tên
// thay phần cùng chỗ của tướng), thú cưỡi đứng sau, bảo vật lơ lửng bên vai có quầng sáng, cờ và khóm tre cắm đất bên
// cạnh. Mặc đủ bốn món bộ mình thì vũ khí ánh lên (`anhVuKhi.ts`, như ở trận). Chỉ để nhìn trong bảng: ra trận tướng
// vẫn dáng cũ.
// Vẽ một lần bằng renderer của cảnh (không mở thêm khung WebGL) vào khung vẽ riêng, đọc ra ảnh, nhớ theo tướng và món.

import * as THREE from 'three';
import type { HeroKind } from '../game/battle';
import { BO_CUA, BO_DO, O_DO, type ODo } from '../game/defs';
import { MON_VE, type MonId } from './doTuong';
import type { HumanRig } from './body';
import { CAM_GOC, bakeTuongDung, kDung, type ThayDo } from './heroes';
import { addSunLights } from './lights';
import { disposeModel } from './shapes';

/** Món tướng đang mặc ở từng ô. */
export type MacTuong = Partial<Record<ODo, MonId>>;

/** Khổ ảnh hình tướng (3:4), gấp đôi cỡ hiện trong bảng cho nét trên màn hình điện thoại. */
export const HINH_W = 300;
export const HINH_H = 400;

/** Hướng nhìn: hơi chếch từ bên phải tướng, gần ngang tầm mắt. */
const AZ = 0.32;
const EL = THREE.MathUtils.degToRad(9);

/** Khung vừa một vật: đổi cỡ cho cạnh dài nhất bằng `size`, đáy chạm y = 0, tâm ở gốc theo x, z. */
function vuaKhung(obj: THREE.Object3D, size: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(obj);
  const s = box.getSize(new THREE.Vector3());
  const k = size / Math.max(s.x, s.y, s.z);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.set(-c.x * k, -box.min.y * k, -c.z * k);
  obj.scale.multiplyScalar(k);
  const g = new THREE.Group();
  g.add(obj);
  return g;
}

const QUANG_DIA = new THREE.MeshBasicMaterial({ color: 0xffe7a0, transparent: true, opacity: 0.35, depthWrite: false });
const QUANG_VONG = new THREE.MeshBasicMaterial({ color: 0xffc94a });

/** Quầng sáng sau bảo vật: đĩa vàng mờ và vòng vàng, quay mặt về phía nhìn. */
function quang(r: number): THREE.Group {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 32), QUANG_DIA);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.92, r * 0.035, 6, 40), QUANG_VONG);
  g.add(disc, ring);
  g.rotation.y = AZ;
  return g;
}

/** Tướng `hero` mặc đủ bốn món bộ mình (như `ChiSoDo.bo4` của luật). */
export function duBo(hero: HeroKind, mac: MacTuong): boolean {
  const bo = BO_DO.find((b) => BO_CUA[b] === hero);
  return !!bo && O_DO.every((o) => mac[o] === `${bo}-${o}`);
}

/**
 * Mô hình hình tướng `hero` mặc `mac`. Tướng đứng ở gốc, mặt hướng +z. Thú cưỡi đứng sau lưng chếch sang phải, bảo vật
 * lơ lửng bên vai trái (phía −x), cờ và tre cắm đất phía sau bên trái.
 */
export function hinhTuongModel(hero: HeroKind, mac: MacTuong): THREE.Group {
  const ve = O_DO.flatMap((o) => (mac[o] ? [MON_VE[mac[o]]] : []));
  const thay: ThayDo = {};
  for (const v of ve) if (v.cho === 'tay' || v.cho === 'than' || v.cho === 'dau' || v.cho === 'lung') thay[v.cho] = true;
  const cam = ve.find((v) => v.cho === 'tay')?.cam ?? CAM_GOC[hero];
  const root = new THREE.Group();
  // Đủ bộ mình: món cầm tay vẽ trong `vuKhi` để có lớp vỏ sáng.
  const du = duBo(hero, mac);
  const them = (h: HumanRig, k: number) => ve.forEach((v) => (du && v.cho === 'tay' ? h.vuKhi(() => v.mac?.(h, k)) : v.mac?.(h, k)));
  root.add(bakeTuongDung(hero, thay, cam, them, du));
  const k = kDung(hero);
  for (const v of ve) {
    if (v.cho === 'thu') {
      // Thú cưỡi đứng sau lưng tướng, chếch sang phải, nhỏ hơn thật cho tướng vẫn là chính.
      const g = vuaKhung(v.rieng(), 1.05 * k);
      g.position.set(0.2 * k, 0, -0.75 * k);
      g.rotation.y = 0.5;
      root.add(g);
    } else if (v.cho === 'bay') {
      const g = vuaKhung(v.rieng(), 0.34 * k);
      g.rotation.y = 0.35;
      g.position.set(-0.4 * k, 0.6 * k, 0.12 * k);
      const q = quang(0.22 * k);
      q.position.set(-0.4 * k, 0.77 * k, 0.02 * k);
      root.add(q, g);
    } else if (v.cho === 'dat') {
      // Cờ, khóm tre cắm đất phía sau bên trái, cao ngang tướng.
      const g = vuaKhung(v.rieng(), 1.12 * k);
      g.rotation.y = 1.3;
      g.position.set(-0.36 * k, 0, -0.32 * k);
      root.add(g);
    }
  }
  return root;
}

/** Hướng từ mô hình tới chỗ nhìn. */
const HUONG = new THREE.Vector3(Math.cos(EL) * Math.sin(AZ), Math.sin(EL), Math.cos(EL) * Math.cos(AZ));
/** Hai trục ngang, dọc của ảnh trong cảnh. */
const NGANG = new THREE.Vector3(0, 1, 0).cross(HUONG).normalize();
const DOC = HUONG.clone().cross(NGANG).normalize();

/** Chỗ một điểm trên ảnh (đơn vị cảnh), gốc tọa độ chiếu vào (0, 0). */
export function chieuDiem(p: THREE.Vector3): { x: number; y: number } {
  return { x: p.dot(NGANG), y: p.dot(DOC) };
}

/** Khung chiếu của cả mô hình trên ảnh (đơn vị cảnh, gốc tọa độ chiếu vào (0, 0)). */
export function chieuHinh(root: THREE.Object3D): { x0: number; x1: number; y0: number; y1: number } {
  root.updateMatrixWorld(true);
  const p = new THREE.Vector3();
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    const pos = m.geometry?.getAttribute('position');
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      const x = p.dot(NGANG);
      const y = p.dot(DOC);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  });
  return { x0, x1, y0, y1 };
}

/** Bảng đổi một nửa số thực (dạng 16 bit) tuyến tính ra một byte sRGB. */
let halfLut: Uint8Array | null = null;
function srgbByte(v: number): number {
  const c = Math.min(1, Math.max(0, v));
  return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
}
function halfToSrgb(): Uint8Array {
  if (!halfLut) {
    halfLut = new Uint8Array(65536);
    for (let i = 0; i < 65536; i++) halfLut[i] = srgbByte(THREE.DataUtils.fromHalfFloat(i));
  }
  return halfLut;
}
const byteLut = Uint8Array.from({ length: 256 }, (_, i) => srgbByte(i / 255));

/**
 * Vẽ `root` vào khung vẽ riêng bằng `renderer` (nền trong, khổ `HINH_W`×`HINH_H`), trả ảnh dạng data URL. Khung ôm sát
 * mô hình; renderer trả lại khung vẽ, màu nền như trước khi vẽ.
 */
export function veHinh(renderer: THREE.WebGLRenderer, root: THREE.Object3D, w = HINH_W, h = HINH_H, khung?: Khung): string {
  const scene = new THREE.Scene();
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && !((o as THREE.Mesh).material as THREE.Material).transparent) o.castShadow = o.receiveShadow = true;
  });
  scene.add(root);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const { sun } = addSunLights(scene, Math.max(size.x, size.y, size.z) * 0.8 + 1, 1024);
  sun.position.copy(center).add(new THREE.Vector3(-6, 14, 16));
  sun.target.position.copy(center);

  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  cam.position.copy(center).addScaledVector(HUONG, 100);
  cam.lookAt(center);
  cam.updateMatrixWorld(true);
  // Chiếu song song: tọa độ trên ảnh là chiếu quanh gốc cộng chỗ của gốc.
  const goc = new THREE.Vector3().applyMatrix4(cam.matrixWorldInverse);
  const { x0, x1, y0, y1 } = chieuHinh(root);
  const aspect = w / h;
  let halfY = Math.max((y1 - y0) / 2, (x1 - x0) / 2 / aspect) * 1.08;
  let cx = goc.x + (x0 + x1) / 2;
  let cy = goc.y + (y0 + y1) / 2;
  if (khung) {
    // Khung cố định quanh một điểm (ảnh bán thân: quanh đầu tướng; hình đứng: cả người và đồ đi kèm), không ôm cả mô
    // hình, để mọi tướng hiện cùng một cỡ dù cầm vũ khí dài hay có thú cưỡi.
    const c = chieuDiem(new THREE.Vector3(khung.x ?? 0, khung.y, 0));
    cx = goc.x + c.x;
    cy = goc.y + c.y;
    halfY = khung.half;
  }
  cam.left = cx - halfY * aspect;
  cam.right = cx + halfY * aspect;
  cam.top = cy + halfY;
  cam.bottom = cy - halfY;
  cam.updateProjectionMatrix();

  // Khung vẽ riêng tuyến tính (renderer chỉ đổi ra sRGB khi vẽ lên màn hình): đọc ra rồi tự đổi sRGB.
  const half = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4, type: half ? THREE.HalfFloatType : THREE.UnsignedByteType });
  const prevTarget = renderer.getRenderTarget();
  const prevColor = renderer.getClearColor(new THREE.Color());
  const prevAlpha = renderer.getClearAlpha();
  const n = w * h * 4;
  const px = new Uint8ClampedArray(n);
  try {
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, cam);
    if (half) {
      const buf = new Uint16Array(n);
      renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
      const lut = halfToSrgb();
      for (let i = 0; i < n; i += 4) {
        px[i] = lut[buf[i]];
        px[i + 1] = lut[buf[i + 1]];
        px[i + 2] = lut[buf[i + 2]];
        px[i + 3] = Math.round(THREE.DataUtils.fromHalfFloat(buf[i + 3]) * 255);
      }
    } else {
      const buf = new Uint8Array(n);
      renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
      for (let i = 0; i < n; i += 4) {
        px[i] = byteLut[buf[i]];
        px[i + 1] = byteLut[buf[i + 1]];
        px[i + 2] = byteLut[buf[i + 2]];
        px[i + 3] = buf[i + 3];
      }
    }
  } finally {
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevColor, prevAlpha);
    rt.dispose();
    sun.shadow.map?.dispose();
    disposeModel(root);
  }
  // Điểm ảnh đọc ra từ dưới lên: lật dọc khi chép vào canvas.
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  const img = g.createImageData(w, h);
  const row = w * 4;
  for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * row, (h - y) * row), y * row);
  g.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Khung cố định cho `veHinh`: tâm ở độ cao `y` (lệch ngang `x`) trên trục tướng, nửa bề cao `half`. */
export interface Khung {
  x?: number;
  y: number;
  half: number;
}

/**
 * Khung hình đứng: theo cỡ dáng `kDung` của tướng, giống nhau cho mọi tướng và mọi món, nên người tướng nào cũng cao
 * bằng nhau trong khung hình nhân. Đủ chỗ cho tre, gậy cao, thú cưỡi sau lưng, bảo vật bên vai (`hinhTuong.test.ts`).
 */
export function khungDung(hero: HeroKind): Khung {
  const k = kDung(hero);
  return { x: 0.05 * k, y: 0.79 * k, half: 0.92 * k };
}

/** Khổ ảnh bán thân (vuông) trên chip tướng. */
export const BAN_PX = 120;

/** Ảnh bán thân: tướng mặc đồ thân, đầu, lưng, cầm vũ khí; khung quanh đầu và vai. */
export function veBan(renderer: THREE.WebGLRenderer, hero: HeroKind, mac: MacTuong): string {
  const than: MacTuong = {};
  for (const o of O_DO) {
    const id = mac[o];
    if (id && ['tay', 'than', 'dau', 'lung'].includes(MON_VE[id].cho)) than[o] = id;
  }
  const k = kDung(hero);
  return veHinh(renderer, hinhTuongModel(hero, than), BAN_PX, BAN_PX, { y: 0.84 * k, half: 0.3 * k });
}

/**
 * Ảnh đại diện của một nhân vật có xương bất kỳ (võ sĩ, tướng giặc trên lôi đài): khung quanh xương đầu cao nhất (người
 * cưỡi thì là đầu người cưỡi); không có xương đầu thì ôm cả mô hình. Vẽ xong gỡ mô hình.
 */
export function veBanNguoi(renderer: THREE.WebGLRenderer, root: THREE.Object3D): string {
  (root.userData.pose as ((p: { act: string; time: number }) => void) | undefined)?.({ act: 'stand', time: 0 });
  root.updateMatrixWorld(true);
  let dau: THREE.Vector3 | null = null;
  root.traverse((o) => {
    if (!(o as THREE.Bone).isBone || !/head$/i.test(o.name)) return;
    const p = o.getWorldPosition(new THREE.Vector3());
    if (!dau || p.y > dau.y) dau = p;
  });
  const d = dau as THREE.Vector3 | null;
  const url = veHinh(renderer, root, BAN_PX, BAN_PX, d ? { x: d.x, y: d.y + 0.1, half: 0.3 } : undefined);
  root.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
  });
  return url;
}

/** Khóa nhớ ảnh: tướng và món từng ô. */
export function hinhKey(hero: HeroKind, mac: MacTuong): string {
  return `${hero}|${O_DO.map((o) => mac[o] ?? '').join('|')}`;
}

/**
 * Kho ảnh hình tướng: `get` trả ảnh đã vẽ, chưa có thì hẹn vẽ sau một nhịp (lần đầu phải nặn món đồ mới, vài trăm mili
 * giây) và trả null; vẽ xong thì gọi `onReady` để bảng dựng lại.
 */
export class HinhTuong {
  private readonly done = new Map<string, string>();
  private readonly queue: { key: string; ve: () => string }[] = [];
  private timer = 0;
  onReady: () => void = () => {};

  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  /** Hình đứng mặc đồ cho khung hình nhân (vẽ trước ảnh bán thân). */
  get(hero: HeroKind, mac: MacTuong): string | null {
    return this.take(`hinh|${hinhKey(hero, mac)}`, () => veHinh(this.renderer, hinhTuongModel(hero, mac), HINH_W, HINH_H, khungDung(hero)), true);
  }

  /** Ảnh bán thân cho chip tướng. */
  ban(hero: HeroKind, mac: MacTuong): string | null {
    return this.take(`ban|${hinhKey(hero, mac)}`, () => veBan(this.renderer, hero, mac), false);
  }

  /** Ảnh đại diện của nhân vật khác (khóa `key`), mô hình dựng bằng `tao` lúc tới lượt vẽ. */
  nguoi(key: string, tao: () => THREE.Object3D): string | null {
    return this.take(`nguoi|${key}`, () => veBanNguoi(this.renderer, tao()), false);
  }

  private take(key: string, ve: () => string, first: boolean): string | null {
    const got = this.done.get(key);
    if (got !== undefined) return got || null;
    if (!this.queue.some((q) => q.key === key)) {
      if (first) this.queue.unshift({ key, ve });
      else this.queue.push({ key, ve });
    }
    if (!this.timer) this.timer = window.setTimeout(() => this.run(), 30);
    return null;
  }

  private run(): void {
    this.timer = 0;
    const job = this.queue.shift();
    if (!job) return;
    let url = '';
    try {
      url = job.ve();
    } catch (e) {
      console.error('Không vẽ được hình tướng', e);
    }
    this.done.set(job.key, url);
    // Giữ chừng 90 ảnh gần nhất (mỗi lần đổi món là một ảnh mới; lôi đài thêm ảnh đại diện võ sĩ, tướng giặc).
    while (this.done.size > 90) this.done.delete(this.done.keys().next().value!);
    if (this.queue.length) this.timer = window.setTimeout(() => this.run(), 30);
    this.onReady();
  }
}
