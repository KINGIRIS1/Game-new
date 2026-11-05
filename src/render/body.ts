// Thân người chibi dùng chung cho lính, tướng và dân (khung xương ở rig.ts): khớp, các phần thân, mặt, tóc,
// mũ lông chim, và các tư thế chung (đứng, đi, thế đánh, ngã). Gốc tọa độ là giữa hai bàn chân, mặt trước hướng +z.

import * as THREE from 'three';
import { nanBody, nanCrown, nanHair, nanHead, nanHeadband, type CrownOpts } from './nanNguoi';
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
  /** Tay áo rộng loe (quan phục). */
  wideSleeves?: boolean;
  /** Hộ uyển: ống giáp ôm cẳng tay, và màu viền hai đầu. */
  bracer?: number;
  bracerTrim?: number;
  /** Dáng thân khác thân thường: bụng phệ. */
  build?: 'belly';
  /** Viền gấu khố, váy; viền cổ áo chữ V; viền cổ tay áo. */
  hem?: number;
  collar?: number;
  cuff?: number;
}

/** Thân nặn liền khối mặc đồ `look`: chân, hông, ngực, tay (xem nanNguoi.ts). */
export function humanBody(r: HumanRig, look: BodyLook): void {
  nanBody(r, look);
}

export interface FaceLook {
  /** Mày xếch: giặc, tướng. */
  brows?: boolean;
  /** Màu mày (mặc định mực đen; lão tướng mày bạc). */
  browColor?: number;
  /** Má hồng và đốm sáng trong mắt: quân ta, dân. Mặc định có, trừ khi có mày xếch. */
  blush?: boolean;
  /** Râu mép. */
  mustache?: number;
  /** Râu cằm (màu). */
  beard?: number;
  /** Râu cằm dài bao nhiêu (mặc định 0,17). */
  beardLen?: number;
  /** Râu cằm chẻ hai chòm. */
  beardSplit?: boolean;
  /** Hoa tai đồng tròn xoắn ốc (phụ nữ Lạc Việt). */
  earrings?: number;
  /** Trâm cài tóc bằng đồng. */
  hairPin?: number;
}

/**
 * Đầu to nặn liền: mặt, tai, mắt (tâm đầu ở y 0,76, bán kính 0,2). Tóc, băng đầu, mũ lông chim gọi sau trên cùng
 * khung xương thì gộp vào đầu này, nặn một lần khi dựng xong.
 */
export function humanHead(r: HumanRig, face: FaceLook = {}): void {
  nanHead(r, face);
}

/** Tóc dày phủ đỉnh đầu, có chân tóc. */
export function hairCap(r: HumanRig, color: number = C.hair): void {
  nanHair(r, color);
}

/** Dải buộc tóc (vải, hay vành đồng, vành vàng của vua) ôm quanh đầu. */
export function headband(r: HumanRig, color: number, h = 0.04): void {
  nanHeadband(r, color, h);
}

/** Mũ lông chim xòe hình quạt, ngả ra sau, như hình người trên mặt trống đồng. */
export function featherCrown(r: HumanRig, colors: readonly number[] = [C.red, C.cream], opts: CrownOpts = {}): void {
  nanCrown(r, colors, opts);
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
