// Trời ngày đêm ở kinh đô: màu trời, nắng, đèn bán cầu theo buổi (giờ ở `src/game/ngayDem.ts`), rồi pha mưa giông và
// đêm yêu tinh lên trên. Ban ngày đúng y số cũ, nên cảnh ban ngày trông như trước khi có ngày đêm.

import * as THREE from 'three';
import { BUOI, type Buoi, type TroiLuc } from '../game/ngayDem';
import { C } from './palette';

/** Trời và đèn của một cảnh: màu nền (cũng là màu sương), độ sáng và màu nắng, độ sáng và hai màu đèn bán cầu. */
export interface BoTroi {
  sky: number;
  sun: number;
  hemi: number;
  sunColor: number;
  hemiSky: number;
  hemiGround: number;
}

/** Trời ban ngày, như `addSunLights` dựng sẵn (`lights.ts`). Bãi chiến dùng cho mọi nền trừ núi Thất Diệu. */
export const TROI_NGAY: BoTroi = { sky: C.sky, sun: 2.6, hemi: 0.9, sunColor: 0xfff0d8, hemiSky: 0xfff3dc, hemiGround: 0x6d6a45 };

/** Một buổi ở kinh đô: thêm độ đậm bóng đổ và màu nhân cho vật không nhận đèn (khói, bọt sóng, mây mù, mưa). */
export interface BoBuoi extends BoTroi {
  shadow: number;
  unlit: number;
}

/**
 * Bốn buổi. Đêm lấy trời đêm núi Thất Diệu (`battlefield.ts`) làm gốc, bớt tím, để vẫn đọc rõ công trình và lính trên
 * điện thoại; đêm yêu tinh (`TROI_YEU`) tối hơn đêm thường.
 */
export const TROI_BUOI: Record<Buoi, BoBuoi> = {
  ngay: { ...TROI_NGAY, shadow: 1, unlit: 0xffffff },
  chieu: { sky: 0xf0c098, sun: 2.2, hemi: 0.85, sunColor: 0xffbc84, hemiSky: 0xf4d0b0, hemiGround: 0x60503c, shadow: 0.9, unlit: 0xf2cdb0 },
  dem: { sky: 0x4c5680, sun: 1.6, hemi: 0.85, sunColor: 0xbac8ff, hemiSky: 0x8692c6, hemiGround: 0x383a54, shadow: 0.6, unlit: 0x707ca8 },
  rang: { sky: 0xe4bec6, sun: 1.95, hemi: 0.85, sunColor: 0xffcab2, hemiSky: 0xe8ccd2, hemiGround: 0x565046, shadow: 0.85, unlit: 0xe2c8d2 },
};

/** Màu trời, đèn, bóng đã pha, để gán thẳng vào cảnh. Màu là `THREE.Color` (không gian màu tuyến tính của three). */
export class TroiMau {
  readonly sky = new THREE.Color();
  readonly sunColor = new THREE.Color();
  readonly hemiSky = new THREE.Color();
  readonly hemiGround = new THREE.Color();
  readonly unlit = new THREE.Color();
  sun = 0;
  hemi = 0;
  shadow = 1;

  /** Lấy đúng một bộ. */
  set(b: BoBuoi): this {
    this.sky.setHex(b.sky);
    this.sunColor.setHex(b.sunColor);
    this.hemiSky.setHex(b.hemiSky);
    this.hemiGround.setHex(b.hemiGround);
    this.unlit.setHex(b.unlit);
    this.sun = b.sun;
    this.hemi = b.hemi;
    this.shadow = b.shadow;
    return this;
  }

  copy(o: TroiMau): this {
    this.sky.copy(o.sky);
    this.sunColor.copy(o.sunColor);
    this.hemiSky.copy(o.hemiSky);
    this.hemiGround.copy(o.hemiGround);
    this.unlit.copy(o.unlit);
    this.sun = o.sun;
    this.hemi = o.hemi;
    this.shadow = o.shadow;
    return this;
  }
}

/** Mỗi buổi một bộ màu đã đổi sẵn ra `THREE.Color`. */
const BUOI_MAU: Record<Buoi, TroiMau> = {
  ngay: new TroiMau().set(TROI_BUOI.ngay),
  chieu: new TroiMau().set(TROI_BUOI.chieu),
  dem: new TroiMau().set(TROI_BUOI.dem),
  rang: new TroiMau().set(TROI_BUOI.rang),
};

const addScaled = (out: THREE.Color, c: THREE.Color, w: number) => {
  out.r += c.r * w;
  out.g += c.g * w;
  out.b += c.b * w;
};

/**
 * Trời nền theo trọng số bốn buổi (`troiLuc`). Thuần ban ngày (trọng số ngày là 1) thì ra đúng y bộ ban ngày, từng
 * số một: cộng thêm 0 không làm lệch số nào.
 */
export function phaTroi(w: TroiLuc, out: TroiMau): TroiMau {
  for (const c of [out.sky, out.sunColor, out.hemiSky, out.hemiGround, out.unlit]) c.setRGB(0, 0, 0);
  out.sun = 0;
  out.hemi = 0;
  out.shadow = 0;
  for (const b of BUOI) {
    const k = w[b];
    if (k === 0) continue;
    const m = BUOI_MAU[b];
    addScaled(out.sky, m.sky, k);
    addScaled(out.sunColor, m.sunColor, k);
    addScaled(out.hemiSky, m.hemiSky, k);
    addScaled(out.hemiGround, m.hemiGround, k);
    addScaled(out.unlit, m.unlit, k);
    out.sun += m.sun * k;
    out.hemi += m.hemi * k;
    out.shadow += m.shadow * k;
  }
  return out;
}

/** Ánh trăng, trời và đất trong đêm yêu tinh (trước đây ở `world.ts`). */
const NIGHT_MOON = 0x9fb4ff;
const NIGHT_SKY = 0x5a6aa8;
const NIGHT_GROUND = 0x2a2a48;

const lerpHex = (a: number, b: number, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t);

/**
 * Đêm yêu tinh, tính đúng như trước khi có ngày đêm (trời ban ngày kéo về ánh trăng): nhờ là số tuyệt đối nên đêm
 * yêu tinh trông y như cũ dù tới lúc nào trong ngày.
 */
const YEU = (() => {
  const m = new TroiMau();
  m.sky.copy(lerpHex(C.sky, C.night, 0.85));
  m.sunColor.copy(lerpHex(TROI_NGAY.sunColor, NIGHT_MOON, 0.8));
  m.hemiSky.copy(lerpHex(TROI_NGAY.hemiSky, NIGHT_SKY, 0.85));
  m.hemiGround.copy(lerpHex(TROI_NGAY.hemiGround, NIGHT_GROUND, 0.85));
  m.unlit.setHex(0x6470a0);
  m.sun = TROI_NGAY.sun * 0.4;
  m.hemi = TROI_NGAY.hemi * 0.75;
  m.shadow = 1;
  return m;
})();

const STORM = new THREE.Color(C.storm);
const lum = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const LUM_NGAY = lum(BUOI_MAU.ngay.sky);
const stormSky = new THREE.Color();

/**
 * Pha thời tiết lên trời nền: mưa giông `storm` (0..1, Thủy Tinh hô mưa) rồi đêm yêu tinh `yeu` (0..1). Ban ngày, trời
 * quang thì ra đúng số cũ của `World.updateStorm`. Mưa giông ban đêm thì màu trời giông tối theo trời nền, không sáng
 * xám lên giữa đêm.
 */
export function phaThoiTiet(base: TroiMau, storm: number, yeu: number, out: TroiMau): TroiMau {
  out.copy(base);
  const f = Math.min(1, lum(base.sky) / LUM_NGAY);
  stormSky.copy(STORM);
  if (f < 1) stormSky.multiplyScalar(f);
  out.sky.lerp(stormSky, storm * 0.85).lerp(YEU.sky, yeu);
  out.sun = (1 - 0.45 * storm) * (base.sun + (YEU.sun - base.sun) * yeu);
  out.hemi = (1 - 0.2 * storm) * (base.hemi + (YEU.hemi - base.hemi) * yeu);
  out.sunColor.lerp(YEU.sunColor, yeu);
  out.hemiSky.lerp(YEU.hemiSky, yeu);
  out.hemiGround.lerp(YEU.hemiGround, yeu);
  out.unlit.lerp(YEU.unlit, yeu);
  out.shadow = base.shadow + (YEU.shadow - base.shadow) * yeu;
  return out;
}

/**
 * Vật không nhận đèn mà mang màu ban ngày (bọt sóng, bụi nước, màn mây mù biển, mưa): ghi vào sổ để tối theo trời,
 * không thì sáng trắng giữa đêm. Lửa, đèn, ma trơi, khung chọn không ghi. Chất liệu bị `dispose` thì tự ra khỏi sổ.
 */
const SO_TOI = new Set<THREE.MeshBasicMaterial>();
const WHITE = new THREE.Color(1, 1, 1);
const lastTint = WHITE.clone();
export function toiTheoTroi<M extends THREE.MeshBasicMaterial>(mat: M): M {
  if (SO_TOI.has(mat)) return mat;
  mat.userData.mauGoc = mat.color.clone();
  SO_TOI.add(mat);
  mat.addEventListener('dispose', () => SO_TOI.delete(mat));
  if (!lastTint.equals(WHITE)) mat.color.multiply(lastTint);
  return mat;
}

/** Nhân màu tối `tint` vào mọi chất liệu trong sổ (chỉ làm khi màu đổi). */
export function apMauToi(tint: THREE.Color): void {
  if (tint.equals(lastTint)) return;
  lastTint.copy(tint);
  for (const m of SO_TOI) m.color.copy(m.userData.mauGoc as THREE.Color).multiply(tint);
}

/** Độ sáng thô của đèn (nắng cộng bán cầu), để so ngày, đêm, đêm yêu tinh và bù sáng các ô chỉ dẫn ban đêm. */
export function doSang(m: TroiMau): number {
  return m.sun * lum(m.sunColor) + m.hemi * lum(m.hemiSky);
}
export const SANG_NGAY = doSang(BUOI_MAU.ngay);
