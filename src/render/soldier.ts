// Lính có khung xương (rig.ts): thân người chibi dùng chung, đầu, tay, chân và vũ khí cử động được.
// Bản thử đầu tiên là giáo binh; các binh chủng khác vẫn dựng bằng khối tĩnh ở models.ts.
// Gốc tọa độ là giữa hai bàn chân, mặt trước hướng +z, như mọi mô hình khác.

import * as THREE from 'three';
import { C } from './palette';
import { RigBuilder, bakeRig, resetBones, skinRig, type BoneDef, type Bones } from './rig';

export type HumanBone = 'hips' | 'legL' | 'legR' | 'chest' | 'head' | 'armL' | 'armR' | 'hand';

/** Khớp của thân người chibi ở tư thế gốc: đứng thẳng, hai tay buông thẳng. */
const HUMAN: Record<HumanBone, BoneDef<HumanBone>> = {
  hips: { parent: null, at: [0, 0.24, 0] },
  legL: { parent: 'hips', at: [-0.065, 0.21, 0] },
  legR: { parent: 'hips', at: [0.065, 0.21, 0] },
  chest: { parent: 'hips', at: [0, 0.4, 0] },
  head: { parent: 'chest', at: [0, 0.58, 0] },
  armL: { parent: 'chest', at: [-0.135, 0.545, 0] },
  armR: { parent: 'chest', at: [0.135, 0.545, 0] },
  // Vũ khí tay phải là con của ngực chứ không của cánh tay, để xoay độc lập; mỗi tư thế đặt nó vào bàn tay phải.
  hand: { parent: 'chest', at: [0.135, 0.29, 0] },
};
/** Chiều dài chân, từ khớp háng tới mặt đất. */
const LEG = 0.21;
/** Bàn tay phải so với vai phải, ở tư thế gốc. */
const HAND = new THREE.Vector3(0, HUMAN.hand.at[1] - HUMAN.armR.at[1], 0);

/** Sắt đã rèn, như giáp sắt của voi ở models.ts. */
const IRON = 0x7b8a9c;
const IRON_DARK = 0x4d5868;
const CHEEK = 0xe58a6a;

/** Thân người: chân trần, khố hoa văn, đai đồng, ngực trần đeo tấm đồng che ngực, vòng tay đồng. */
function body(r: RigBuilder<HumanBone>, cloth: number): void {
  for (const [b, x] of [
    ['legL', -0.065],
    ['legR', 0.065],
  ] as const) {
    const p = r.on(b).plain;
    p.cyl(0.048, 0.036, 0.2, C.skin, x, 0.115, 0, undefined, 8);
    // Bàn chân bẹt chĩa ra trước, để nhìn rõ bước đi.
    p.sphere(0.045, C.skin, x, 0.022, 0.025, [1, 0.55, 1.5], 6);
  }
  const hips = r.on('hips');
  hips.band.cyl(0.125, 0.165, 0.22, cloth, 0, 0.3, 0, undefined, 12);
  // Vạt khố buông trước và sau.
  hips.band.box(0.11, 0.2, 0.025, cloth, 0, 0.2, 0.15, [-0.12, 0, 0]);
  hips.band.box(0.11, 0.18, 0.025, cloth, 0, 0.21, -0.15, [0.12, 0, 0]);
  hips.plain.cyl(0.135, 0.135, 0.04, C.bronze, 0, 0.405, 0, undefined, 12);
  const chest = r.on('chest').plain;
  chest.cyl(0.125, 0.1, 0.17, C.skin, 0, 0.49, 0, undefined, 10);
  for (const s of [-1, 1]) chest.sphere(0.05, C.skin, s * 0.12, 0.545, 0, [1, 1, 1], 6);
  chest.cyl(0.05, 0.06, 0.05, C.skin, 0, 0.585, 0, undefined, 8);
  chest.cyl(0.05, 0.05, 0.016, C.bronzeLight, 0, 0.495, 0.112, [Math.PI / 2, 0, 0], 12);
  for (const [b, s] of [
    ['armL', -1],
    ['armR', 1],
  ] as const) {
    const p = r.on(b).plain;
    const x = s * 0.135;
    p.cyl(0.04, 0.033, 0.23, C.skin, x, 0.43, 0, undefined, 8);
    p.cyl(0.043, 0.043, 0.035, C.bronze, x, 0.4, 0, undefined, 8);
    p.sphere(0.045, C.skin, x, 0.3, 0, [1, 1, 1], 6);
  }
}

/** Đầu to: mắt có đốm sáng, má hồng, tóc, dải vải buộc tóc và mũ lông chim xòe như hình người trên mặt trống đồng. */
function head(r: RigBuilder<HumanBone>): void {
  const p = r.on('head').plain;
  p.sphere(0.2, C.skin, 0, 0.76, 0, [1, 0.95, 0.95], 12);
  for (const s of [-1, 1]) {
    p.sphere(0.03, C.skin, s * 0.195, 0.75, 0, [0.6, 1, 1], 5);
    p.sphere(0.03, C.ink, s * 0.072, 0.745, 0.172, [1, 1.45, 0.5], 6);
    p.sphere(0.011, C.cream, s * 0.066, 0.76, 0.19, [1, 1, 1], 5);
    p.sphere(0.03, CHEEK, s * 0.115, 0.7, 0.148, [1, 0.6, 0.4], 5);
  }
  p.sphere(0.215, C.hair, 0, 0.835, -0.03, [1, 0.62, 1], 12);
  // Dải vải đỏ buộc tóc, không dùng đồng để khỏi lẫn với mũ trụ đồng của giặc khi nhìn xa.
  p.cyl(0.222, 0.226, 0.04, C.red, 0, 0.825, -0.03, undefined, 12);
  // Bảy lông chim đỏ, kem xen nhau, xòe hình quạt và ngả ra sau.
  const tilt = -0.3;
  for (let i = -3; i <= 3; i++) {
    const a = i * 0.27;
    const len = 0.36 - Math.abs(i) * 0.02;
    const d = new THREE.Vector3(Math.sin(a), Math.cos(a) * Math.cos(tilt), Math.cos(a) * Math.sin(tilt));
    p.box(0.05, len, 0.022, i % 2 ? C.cream : C.red, d.x * len * 0.5, 0.88 + d.y * len * 0.5, -0.1 + d.z * len * 0.5, [tilt, 0, -a]);
  }
}

/** Giáo dài 1,3, tay nắm cách đuôi 0,25. Bậc 0 mũi đồng; bậc 1 lưỡi sắt to hơn; bậc 2 thêm tua đỏ. */
function spear(r: RigBuilder<HumanBone>, tier: number): void {
  const p = r.on('hand').plain;
  const [x, grip, z] = HUMAN.hand.at;
  p.cyl(0.018, 0.018, 1.3, C.woodDark, x, grip - 0.25 + 0.65, z, undefined, 6);
  const top = grip + 1.05;
  const iron = tier >= 1;
  p.cyl(0.024, 0.02, 0.06, iron ? IRON_DARK : C.bronzeDark, x, top + 0.02, z, undefined, 6);
  // Lưỡi giáo hình lá, dẹt theo chiều trước sau.
  p.sphere(iron ? 0.07 : 0.058, iron ? IRON : C.bronze, x, top + (iron ? 0.19 : 0.16), z, [1, iron ? 2.6 : 2.5, 0.3], 8);
  if (tier >= 2) p.cone(0.06, 0.14, C.red, x, top - 0.06, z, [Math.PI, 0, 0], 8);
}

/** Khiên tròn mặt trống đồng đeo ở cẳng tay trái; bậc 2 viền sắt. */
function shield(r: RigBuilder<HumanBone>, tier: number): void {
  const s = r.on('armL');
  s.drum.cyl(0.165, 0.165, 0.035, 0xffffff, -0.2, 0.39, 0.06, [Math.PI / 2, 0, 0], 16);
  if (tier >= 2) s.plain.add(new THREE.TorusGeometry(0.17, 0.024, 6, 20), IRON, -0.2, 0.39, 0.065);
}

function spearmanShape(tier: number) {
  const r = new RigBuilder(HUMAN);
  body(r, C.red);
  head(r);
  spear(r, tier);
  shield(r, tier);
  return r.build();
}

/** Lính đang làm gì, để đặt tư thế. */
export interface SpearmanPose {
  /** Đứng nghỉ, đi, thế thủ giữa hai đòn (có thể đang đâm), hay ngã. */
  act: 'stand' | 'walk' | 'guard' | 'dead';
  /** Pha bước chân (radian), tăng đều khi đi. */
  phase?: number;
  /** Góc vung chân khi đi (radian). Đi thường 0,5. */
  stride?: number;
  /** Tiến trình cú đâm, 0 lúc vừa ra đòn tới 1 lúc thu giáo về. Bỏ trống là không đâm. */
  strike?: number;
  /** Đồng hồ (giây), cho nhịp thở. */
  time?: number;
  /** Ngã được bao nhiêu, 0..1. */
  fall?: number;
}

const smooth = THREE.MathUtils.smoothstep;
const lerp = THREE.MathUtils.lerp;

/** Hạ hông cho bàn chân (chân thẳng, vung góc `a`) vẫn chạm đất. */
const hipDrop = (a: number) => LEG * (1 - Math.cos(a));

/** Đặt tư thế giáo binh. Gọi mỗi khung hình; tư thế không phụ thuộc khung trước. */
export function poseSpearman(b: Bones<HumanBone>, s: SpearmanPose): void {
  resetBones(b);
  const { hips, legL, legR, chest, head, armL, armR, hand } = b;
  // Vũ khí: lăn (z) rồi ngả về trước (x) rồi quay ngang (y), để chĩa giáo theo một hướng dù ngực đang xoay.
  hand.rotation.order = 'YXZ';
  const t = s.time ?? 0;
  const breath = Math.sin(t * 3);
  // Mặc định: đứng nghỉ, giáo dựng đứng bên phải, khiên che trước bụng.
  let spearTilt = 0.06;
  armR.rotation.z = 0.2;
  armL.rotation.set(-0.45, 0, -0.28);
  chest.rotation.x = 0.02 * breath;
  head.rotation.x = -0.02 * breath;
  if (s.act === 'walk') {
    const sw = Math.sin(s.phase ?? 0);
    const a = s.stride ?? 0.5;
    legL.rotation.x = a * sw;
    legR.rotation.x = -a * sw;
    hips.position.y -= hipDrop(a * sw) - 0.012 * (1 - Math.abs(sw));
    hips.rotation.y = 0.12 * sw;
    chest.rotation.set(0.08, -0.2 * sw, 0);
    head.rotation.set(0, 0.08 * sw, 0);
    // Tay trái vung ngược chân trái; tay phải vác giáo ngả về trước, nhún theo bước.
    armL.rotation.x = -0.45 - 0.3 * sw;
    armR.rotation.x = -0.15 + 0.2 * sw;
    spearTilt = 0.35;
  } else if (s.act === 'guard') {
    // Thế thủ: chân trái trước, vai trái và khiên đưa ra, giáo kẹp ngang hông chĩa tới.
    // Đâm: lao người tới, xoay vai phải lên, duỗi thẳng tay, giáo nằm ngang.
    const k = s.strike;
    const e = k === undefined ? 0 : k < 0.3 ? smooth(k, 0, 0.3) : 1 - smooth(k, 0.45, 1);
    legL.rotation.x = lerp(-0.3, -0.55, e);
    legR.rotation.x = lerp(0.28, 0.45, e);
    hips.position.y -= hipDrop(Math.min(-legL.rotation.x, legR.rotation.x)) + 0.01 * (1 - e) * (1 + breath);
    hips.position.z += 0.06 * e;
    hips.rotation.y = lerp(0.15, -0.1, e);
    chest.rotation.set(lerp(0.12, 0.32, e) + 0.02 * breath, lerp(0.3, -0.3, e), 0);
    head.rotation.set(lerp(-0.1, -0.28, e), -chest.rotation.y - hips.rotation.y, 0);
    armR.rotation.set(lerp(-0.4, -1.35, e), 0, lerp(0.18, 0.05, e));
    armL.rotation.set(lerp(-0.95, -0.6, e), 0, lerp(-0.1, -0.3, e));
    spearTilt = lerp(1.35, 1.57, e);
    hand.rotation.y = -chest.rotation.y - hips.rotation.y;
  } else if (s.act === 'dead') {
    const f = s.fall ?? 1;
    armL.rotation.set(lerp(-0.45, -2.5, f), 0, lerp(-0.28, -0.5, f));
    armR.rotation.set(lerp(0, -2.3, f), 0, lerp(0.2, 0.5, f));
    legL.rotation.x = -0.35 * f;
    head.rotation.x = -0.3 * f;
    spearTilt = lerp(0.06, -0.9, f);
  }
  // Giáo luôn nằm trong bàn tay phải.
  armR.updateMatrix();
  hand.position.copy(HAND).applyMatrix4(armR.matrix);
  hand.rotation.x = spearTilt;
  hand.rotation.z = s.act === 'guard' ? 0 : -0.06;
}

const STAND: SpearmanPose = { act: 'stand' };

/** Giáo binh có xương, cho trận đánh. Xoay xương bằng `poseSpearman(group.userData.bones, ...)`. */
export function makeSpearman(tier = 0): THREE.Group {
  const { group, bones } = skinRig(spearmanShape(tier));
  poseSpearman(bones, STAND);
  return group;
}

/** Giáo binh bản tĩnh ở một tư thế, cho công trình. */
export function bakeSpearman(tier = 0, pose: SpearmanPose = STAND): THREE.Group {
  return bakeRig(spearmanShape(tier), (b) => poseSpearman(b, pose));
}
