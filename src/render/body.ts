// Thân người chibi dùng chung cho lính, tướng và dân (khung xương ở rig.ts): khớp, các phần thân, mặt, tóc,
// mũ lông chim, và các tư thế chung (đứng, đi, thế đánh, ngã). Gốc tọa độ là giữa hai bàn chân, mặt trước hướng +z.

import * as THREE from 'three';
import { C } from './palette';
import { resetBones, type BoneDef, type Bones, type RigBuilder } from './rig';

export type HumanBone = 'hips' | 'legL' | 'legR' | 'chest' | 'head' | 'armL' | 'armR' | 'hand' | 'handL';
export type Human = Bones<HumanBone>;
export type HumanRig = RigBuilder<HumanBone>;

/** Khớp ở tư thế gốc: đứng thẳng, hai tay buông thẳng. */
export const HUMAN: Record<HumanBone, BoneDef<HumanBone>> = {
  hips: { parent: null, at: [0, 0.24, 0] },
  legL: { parent: 'hips', at: [-0.065, 0.21, 0] },
  legR: { parent: 'hips', at: [0.065, 0.21, 0] },
  chest: { parent: 'hips', at: [0, 0.4, 0] },
  head: { parent: 'chest', at: [0, 0.58, 0] },
  armL: { parent: 'chest', at: [-0.135, 0.545, 0] },
  armR: { parent: 'chest', at: [0.135, 0.545, 0] },
  // Đồ cầm tay là con của ngực chứ không của cánh tay, để xoay độc lập; `gripHands` đặt chúng vào bàn tay.
  hand: { parent: 'chest', at: [0.135, 0.29, 0] },
  handL: { parent: 'chest', at: [-0.135, 0.29, 0] },
};
/** Chiều dài chân, từ khớp háng tới mặt đất. */
export const LEG = 0.21;
/** Chỗ tay phải, tay trái nắm đồ ở tư thế gốc. */
export const GRIP_R = HUMAN.hand.at;
export const GRIP_L = HUMAN.handL.at;
/** Bàn tay so với vai, ở tư thế gốc. */
const HAND = new THREE.Vector3(0, HUMAN.hand.at[1] - HUMAN.armR.at[1], 0);

const CHEEK = 0xe58a6a;

export interface BodyLook {
  /** Ống chân: mặc định chân trần; quân Triệu mặc quần. */
  legs?: number;
  /** Khố (hay váy). */
  cloth: number;
  /** Khố có dải hoa văn trống đồng. Mặc định có. */
  pattern?: boolean;
  /** Váy dài quá gối thay cho khố ngắn. */
  long?: boolean;
  /** Vạt khố buông trước sau. Mặc định có, trừ váy dài. */
  flaps?: boolean;
  /** Áo che thân trên; không có thì ngực trần. */
  top?: number;
  /** Tay áo; không có thì tay trần. */
  sleeves?: number;
  /** Đai lưng. */
  belt?: number;
  /** Tấm đồng che ngực. */
  plate?: number;
  /** Tấm gương đồng hộ tâm mặt trời trống đồng ở giữa ngực. */
  drumPlate?: boolean;
  /** Dây đai da bắt chéo trước ngực giữ giáp hộ tâm. */
  crossStrap?: number;
  /** Vòng tay. */
  armband?: number;
  /** Xà cạp đồng hoặc da bảo vệ ống chân. */
  greaves?: number;
  /** Bao cổ tay bảo vệ. */
  wristband?: number;
  /** Xăm mình thủy quái / họa tiết sông nước Đông Sơn. */
  tattoo?: boolean;
}

/** Chân, hông, ngực, tay. */
export function humanBody(r: HumanRig, look: BodyLook): void {
  const legs = look.legs ?? C.skin;
  for (const [b, x] of [
    ['legL', -0.065],
    ['legR', 0.065],
  ] as const) {
    const p = r.on(b).plain;
    p.cyl(0.048, 0.036, 0.2, legs, x, 0.115, 0, undefined, 8);
    // Bàn chân bẹt chĩa ra trước, để nhìn rõ bước đi.
    p.sphere(0.045, legs === C.skin ? C.skin : C.ink, x, 0.022, 0.025, [1, 0.55, 1.5], 6);
  }
  if (look.greaves) {
    for (const [b, x] of [
      ['legL', -0.065],
      ['legR', 0.065],
    ] as const) {
      const p = r.on(b).plain;
      p.cyl(0.052, 0.042, 0.12, look.greaves, x, 0.105, 0.01, undefined, 8);
      r.on(b).band.cyl(0.054, 0.054, 0.025, look.greaves, x, 0.14, 0.01, undefined, 8);
    }
  }
  const hips = r.on('hips');
  const skirt = look.pattern === false ? hips.plain : hips.band;
  if (look.long) skirt.cyl(0.125, 0.19, 0.3, look.cloth, 0, 0.26, 0, undefined, 12);
  else skirt.cyl(0.125, 0.165, 0.22, look.cloth, 0, 0.3, 0, undefined, 12);
  if (look.flaps ?? !look.long) {
    skirt.box(0.11, 0.2, 0.025, look.cloth, 0, 0.2, 0.15, [-0.12, 0, 0]);
    skirt.box(0.11, 0.18, 0.025, look.cloth, 0, 0.21, -0.15, [0.12, 0, 0]);
  }
  hips.plain.cyl(0.135, 0.135, 0.04, look.belt ?? C.bronze, 0, 0.405, 0, undefined, 12);
  const chest = r.on('chest').plain;
  const torso = look.top ?? C.skin;
  chest.cyl(0.125, 0.1, 0.17, torso, 0, 0.49, 0, undefined, 10);
  for (const s of [-1, 1]) chest.sphere(0.05, look.sleeves ?? torso, s * 0.12, 0.545, 0, [1, 1, 1], 6);
  chest.cyl(0.05, 0.06, 0.05, C.skin, 0, 0.585, 0, undefined, 8);
  if (look.crossStrap) {
    chest.box(0.022, 0.22, 0.01, look.crossStrap, 0, 0.49, 0.108, [0, 0, 0.46]);
    chest.box(0.022, 0.22, 0.01, look.crossStrap, 0, 0.49, 0.108, [0, 0, -0.46]);
  }
  if (look.drumPlate) {
    r.on('chest').drum.cyl(0.065, 0.065, 0.016, C.bronzeLight, 0, 0.495, 0.116, [Math.PI / 2, 0, 0], 16);
    chest.cyl(0.075, 0.075, 0.012, C.bronzeDark, 0, 0.495, 0.114, [Math.PI / 2, 0, 0], 16);
    chest.sphere(0.022, C.bronzeLight, 0, 0.495, 0.126, [1, 1, 0.6], 8);
  } else if (look.plate) {
    chest.cyl(0.05, 0.05, 0.016, look.plate, 0, 0.495, 0.112, [Math.PI / 2, 0, 0], 12);
  }
  if (look.tattoo) {
    r.on('chest').band.cyl(0.128, 0.102, 0.09, C.ink, 0, 0.48, 0, undefined, 10);
    for (const [b, x] of [
      ['legL', -0.065],
      ['legR', 0.065],
    ] as const) {
      r.on(b).band.cyl(0.05, 0.038, 0.08, C.ink, x, 0.12, 0, undefined, 8);
    }
  }
  for (const [b, s] of [
    ['armL', -1],
    ['armR', 1],
  ] as const) {
    const p = r.on(b).plain;
    const x = s * 0.135;
    p.cyl(0.04, 0.033, 0.23, look.sleeves ?? C.skin, x, 0.43, 0, undefined, 8);
    if (look.armband) p.cyl(0.043, 0.043, 0.035, look.armband, x, 0.4, 0, undefined, 8);
    if (look.wristband) p.cyl(0.045, 0.045, 0.045, look.wristband, x, 0.33, 0, undefined, 8);
    p.sphere(0.045, C.skin, x, 0.3, 0, [1, 1, 1], 6);
  }
}

export interface FaceLook {
  /** Mày xếch: giặc, tướng. */
  brows?: boolean;
  /** Má hồng và đốm sáng trong mắt: quân ta, dân. Mặc định có, trừ khi có mày xếch. */
  blush?: boolean;
  /** Râu mép. */
  mustache?: number;
  /** Râu cằm (màu). */
  beard?: number;
  /** Hoa tai đồng tròn xoắn ốc (phụ nữ Lạc Việt). */
  earrings?: number;
  /** Trâm cài tóc bằng đồng. */
  hairPin?: number;
}

/** Đầu to: mặt, tai, mắt. Tóc và mũ vẽ riêng. Tâm đầu ở y 0,76, bán kính 0,2. */
export function humanHead(r: HumanRig, face: FaceLook = {}): void {
  const p = r.on('head').plain;
  p.sphere(0.2, C.skin, 0, 0.76, 0, [1, 0.95, 0.95], 12);
  const blush = face.blush ?? !face.brows;
  for (const s of [-1, 1]) {
    p.sphere(0.03, C.skin, s * 0.195, 0.75, 0, [0.6, 1, 1], 5);
    p.sphere(0.03, C.ink, s * 0.072, 0.745, 0.172, [1, 1.45, 0.5], 6);
    if (blush) {
      p.sphere(0.011, C.cream, s * 0.066, 0.76, 0.19, [1, 1, 1], 5);
      p.sphere(0.03, CHEEK, s * 0.115, 0.7, 0.148, [1, 0.6, 0.4], 5);
    }
    if (face.brows) p.box(0.075, 0.018, 0.02, C.ink, s * 0.078, 0.8, 0.178, [0, 0, -s * 0.32]);
    if (face.mustache) p.box(0.08, 0.022, 0.02, face.mustache, s * 0.05, 0.69, 0.188, [0, 0, s * 0.35]);
    if (face.earrings) {
      p.cyl(0.032, 0.032, 0.015, face.earrings, s * 0.2, 0.71, 0, [0, 0, Math.PI / 2], 8);
      p.sphere(0.016, C.bronzeLight, s * 0.208, 0.69, 0, [1, 1, 1], 6);
    }
  }
  if (face.beard) p.cone(0.1, 0.3, face.beard, 0, 0.56, 0.13, [Math.PI + 0.25, 0, 0], 7);
  if (face.hairPin) {
    p.cyl(0.008, 0.008, 0.32, face.hairPin, 0, 0.98, -0.05, [0, 0, Math.PI / 2], 6);
    p.sphere(0.02, face.hairPin, -0.16, 0.98, -0.05, [1, 1, 1], 6);
    p.sphere(0.02, face.hairPin, 0.16, 0.98, -0.05, [1, 1, 1], 6);
  }
}

/** Tóc ngắn phủ đỉnh đầu. */
export function hairCap(r: HumanRig, color: number = C.hair): void {
  r.on('head').plain.sphere(0.215, color, 0, 0.835, -0.03, [1, 0.62, 1], 12);
}

/** Dải buộc tóc (vải, hay vành đồng, vành vàng của vua). */
export function headband(r: HumanRig, color: number, h = 0.04): void {
  r.on('head').plain.cyl(0.222, 0.226, h, color, 0, 0.825, -0.03, undefined, 12);
}

/** Mũ lông chim xòe hình quạt, ngả ra sau, như hình người trên mặt trống đồng. */
export function featherCrown(
  r: HumanRig,
  colors: readonly number[] = [C.red, C.cream],
  opts: { count?: number; len?: number; spread?: number; bronzeRim?: boolean; tier2?: boolean } = {},
): void {
  const p = r.on('head').plain;
  if (opts.bronzeRim) {
    r.on('head').band.cyl(0.228, 0.232, 0.045, C.bronze, 0, 0.83, -0.03, undefined, 14);
    p.cyl(0.235, 0.235, 0.012, C.bronzeDark, 0, 0.81, -0.03, undefined, 14);
  }
  const n = opts.count ?? 7;
  const half = (n - 1) / 2;
  const tilt = -0.3;
  for (let k = 0; k < n; k++) {
    const i = k - half;
    const a = i * (opts.spread ?? 0.27);
    const len = (opts.len ?? 0.36) - Math.abs(i) * 0.02;
    const d = new THREE.Vector3(Math.sin(a), Math.cos(a) * Math.cos(tilt), Math.cos(a) * Math.sin(tilt));
    const color = colors[Math.abs(Math.round(i)) % colors.length];
    p.box(0.05, len, 0.022, color, d.x * len * 0.5, 0.88 + d.y * len * 0.5, -0.1 + d.z * len * 0.5, [tilt, 0, -a]);
  }
  if (opts.tier2) {
    const n2 = Math.max(3, n - 2);
    const half2 = (n2 - 1) / 2;
    for (let k = 0; k < n2; k++) {
      const i = k - half2;
      const a = i * (opts.spread ?? 0.27);
      const len = (opts.len ?? 0.36) * 0.62 - Math.abs(i) * 0.02;
      const d = new THREE.Vector3(Math.sin(a), Math.cos(a) * Math.cos(tilt + 0.15), Math.cos(a) * Math.sin(tilt + 0.15));
      const color = colors[(Math.abs(Math.round(i)) + 1) % colors.length];
      p.box(0.045, len, 0.018, color, d.x * len * 0.5, 0.89 + d.y * len * 0.5, -0.07 + d.z * len * 0.5, [tilt + 0.15, 0, -a]);
    }
  }
}

// ---------- Tư thế chung ----------

export const smooth = THREE.MathUtils.smoothstep;
export const lerp = THREE.MathUtils.lerp;

/** Hạ hông cho bàn chân (chân thẳng, vung góc `a`) vẫn chạm đất. */
export const hipDrop = (a: number) => LEG * (1 - Math.cos(a));

/**
 * Đường cong một đòn đánh theo tiến trình `k` (0..1): vụt ra nhanh tới 1 lúc k = `hit`, giữ một chút, rồi thu về 0.
 * Không ra đòn (k bỏ trống) thì 0.
 */
export function strikeCurve(k: number | undefined, hit = 0.3, hold = 0.45): number {
  if (k === undefined) return 0;
  return k < hit ? smooth(k, 0, hit) : 1 - smooth(k, hold, 1);
}

/** Về tư thế đứng nghỉ: hai tay buông hơi dang, thở nhẹ. Gọi đầu tiên trong mọi hàm đặt tư thế. */
export function beginPose(b: Human, time = 0): void {
  resetBones(b);
  // Tay và đồ cầm tay: nghiêng ra ngoài (z), giơ về trước (x), rồi quay ngang (y).
  for (const k of ['armL', 'armR', 'hand', 'handL'] as const) b[k].rotation.order = 'YXZ';
  const breath = Math.sin(time * 3);
  b.armR.rotation.z = 0.2;
  b.armL.rotation.z = -0.2;
  b.chest.rotation.x = 0.02 * breath;
  b.head.rotation.x = -0.02 * breath;
}

/**
 * Bước đi: chân vung ngược nhau, hông hạ cho chân chạm đất và xoay theo chân, vai xoay ngược hông,
 * đầu giữ nhìn thẳng. Hai tay vung ngược chân (đồ cầm tay đặt sau). Trả về sin pha, để tay cầm đồ nhún theo.
 */
export function walkCycle(b: Human, phase: number, stride: number): number {
  const sw = Math.sin(phase);
  b.legL.rotation.x = stride * sw;
  b.legR.rotation.x = -stride * sw;
  b.hips.position.y -= hipDrop(stride * sw) - 0.012 * (1 - Math.abs(sw));
  b.hips.rotation.y = 0.12 * sw;
  b.chest.rotation.set(0.08, -0.2 * sw, 0);
  b.head.rotation.set(0, 0.08 * sw, 0);
  b.armL.rotation.x = -0.4 * sw;
  b.armR.rotation.x = 0.4 * sw;
  return sw;
}

/** Thế đứng đánh: chân trái trước, chân phải sau, hông hạ cho cả hai chân chạm đất. */
export function stance(b: Human, front: number, back: number): void {
  b.legL.rotation.x = -front;
  b.legR.rotation.x = back;
  b.hips.position.y -= hipDrop(Math.min(front, back));
}

/** Ngã ngửa (phần vẽ trận ngả cả người ra sau): tay vung lên, chân hất. */
export function fallPose(b: Human, f: number): void {
  b.armL.rotation.set(lerp(0, -2.5, f), 0, lerp(-0.2, -0.5, f));
  b.armR.rotation.set(lerp(0, -2.3, f), 0, lerp(0.2, 0.5, f));
  b.legL.rotation.x = -0.35 * f;
  b.head.rotation.x = -0.3 * f;
}

const tmpHand = new THREE.Vector3();

/** Đặt đồ cầm tay vào hai bàn tay. Gọi sau khi đã xoay cánh tay. `arm`: dài cánh tay, nếu khác thân người thường. */
export function gripHands(b: Human, arm?: number): void {
  const hand = arm === undefined ? HAND : tmpHand.set(0, -arm, 0);
  b.armR.updateMatrix();
  b.hand.position.copy(hand).applyMatrix4(b.armR.matrix);
  b.armL.updateMatrix();
  b.handL.position.copy(hand).applyMatrix4(b.armL.matrix);
}

/** Giấu đồ cầm tay (vd. mũi tên đã bắn đi) bằng cách thu xương về gần như không. */
export function hide(bone: THREE.Bone, hidden: boolean): void {
  bone.scale.setScalar(hidden ? 1e-3 : 1);
}
