// Thủy quái của Thủy Tinh và yêu tinh núi Thất Diệu, có khung xương (rig.ts): tôm binh, cá phun nước, cá sấu,
// thuồng luồng, quỷ núi, ma trơi. Gốc là mặt đất (mặt nước) dưới chân, mặt trước hướng +z.

import * as THREE from 'three';
import type { FighterKind } from '../game/battle';
import { beginPose, fallPose, gripHands, lerp, stance, strikeCurve, walkCycle, type Human, type HumanBone } from './body';
import { C } from './palette';
import { RigBuilder, bakeRig, resetBones, skinRig, type Act, type BoneDef, type Bones, type Poser } from './rig';

type Defs = Record<string, BoneDef<string>>;
type Rig = RigBuilder<string>;
type B = Bones<string>;

const BASE: Defs = { base: { parent: null, at: [0, 0, 0] } };

// ---------- Tôm binh ----------

const SHRIMP: Defs = {
  ...BASE,
  tail0: { parent: 'base', at: [0, 0.1, -0.18] },
  tail1: { parent: 'tail0', at: [0, 0.4, -0.1] },
  chest: { parent: 'tail1', at: [0, 0.62, -0.02] },
  antL: { parent: 'chest', at: [-0.12, 1.02, 0.08] },
  antR: { parent: 'chest', at: [0.12, 1.02, 0.08] },
  arm: { parent: 'chest', at: [0.17, 0.78, 0.1] },
};

/** Tôm binh: đuôi cong đứng thẳng làm chân, xòe quạt đuôi, đầu có gai nhọn, mắt trên cuống, râu dài, cầm giáo đồng. */
function drawShrimp(r: Rig): void {
  const fan = r.on('base').plain;
  for (const s of [-1, 0, 1]) fan.box(0.1, 0.02, 0.22, C.shrimpLight, s * 0.09, 0.03, -0.3, [0, s * 0.4, 0]);
  for (let i = 0; i < 4; i++) {
    const rr = 0.15 - i * 0.012;
    r.on(i < 2 ? 'tail0' : 'tail1').plain.sphere(rr, i % 2 ? C.shrimpLight : C.shrimp, 0, 0.12 + i * 0.17, -0.18 + i * 0.07, [1, 0.75, 1], 8);
  }
  const p = r.on('chest').plain;
  p.sphere(0.2, C.shrimp, 0, 0.78, 0.04, [0.9, 1.1, 1], 10);
  p.cone(0.05, 0.3, C.shrimpLight, 0, 0.92, 0.27, [1.25, 0, 0], 5);
  for (const s of [-1, 1]) {
    p.cyl(0.015, 0.015, 0.12, C.ink, s * 0.1, 0.96, 0.14, [0, 0, s * 0.5], 4);
    p.sphere(0.045, C.ink, s * 0.14, 1.02, 0.14, [1, 1, 1], 6);
  }
  // Càng trái co trước ngực; càng phải (xương `arm`) cầm giáo.
  p.cyl(0.03, 0.03, 0.26, C.shrimp, -0.17, 0.68, 0.12, [0.9, 0, -0.35], 5);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) p.cyl(0.012, 0.012, 0.22, C.shrimpLight, s * 0.12, 0.58 - i * 0.08, 0.1, [0.4, 0, s * 0.6], 4);
  for (const [b, s] of [
    ['antL', -1],
    ['antR', 1],
  ] as const) {
    r.on(b).plain.cyl(0.01, 0.012, 0.9, C.shrimp, s * 0.12, 1.25, -0.1, [-0.6, 0, s * 0.35], 4);
  }
  // Càng phải cầm giáo đồng dựng đứng.
  const arm = r.on('arm').plain;
  arm.cyl(0.03, 0.03, 0.22, C.shrimp, 0.2, 0.68, 0.12, undefined, 5);
  arm.cyl(0.018, 0.018, 1.15, C.woodDark, 0.24, 0.62, 0.12, undefined, 5);
  arm.cone(0.05, 0.2, C.bronze, 0.24, 1.27, 0.12, undefined, 4);
}

/** Tôm nhún nhảy trên đuôi, râu đung đưa; thủ thì hạ giáo chĩa tới, đâm thì ngả cả mình tới. */
function poseShrimp(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  const sway = Math.sin(t * 2.5);
  b.antL.rotation.z = 0.1 * sway;
  b.antR.rotation.z = -0.1 * sway;
  if (a.act === 'walk') {
    const ph = a.phase ?? 0;
    b.base.position.y = 0.06 * Math.abs(Math.sin(ph));
    b.tail0.rotation.x = 0.15 * Math.sin(ph * 2);
    b.tail1.rotation.x = -0.18 * Math.sin(ph * 2);
    b.chest.rotation.z = 0.08 * Math.sin(ph);
    b.arm.rotation.x = 0.25;
  } else if (a.act === 'fight') {
    const e = strikeCurve(a.strike);
    b.arm.rotation.x = lerp(1.1, 1.45, e);
    b.chest.rotation.x = lerp(0.05, 0.3, e);
    b.tail1.rotation.x = lerp(0, 0.12, e);
    b.base.position.z = 0.08 * e;
  } else if (a.act === 'dead') {
    const f = a.fall ?? 1;
    b.arm.rotation.x = -0.8 * f;
    b.chest.rotation.x = -0.4 * f;
  } else {
    b.chest.rotation.x = 0.04 * sway;
  }
}

// ---------- Cá phun nước ----------

const FISH: Defs = {
  ...BASE,
  body: { parent: 'base', at: [0, 0.25, 0] },
  finL: { parent: 'body', at: [-0.16, 0.55, 0.05] },
  finR: { parent: 'body', at: [0.16, 0.55, 0.05] },
  mouth: { parent: 'body', at: [0, 0.72, 0.17] },
};

/** Cá phun nước: con cá đứng trên đuôi, miệng tròn há to, vây xòe, mắt lồi. */
function drawFish(r: Rig): void {
  const tail = r.on('base').plain;
  for (const s of [-1, 1]) tail.box(0.22, 0.05, 0.16, C.fish, s * 0.12, 0.08, -0.02, [0, 0, s * 0.5]);
  tail.cyl(0.07, 0.1, 0.22, C.fish, 0, 0.2, 0, undefined, 8);
  const p = r.on('body').plain;
  p.sphere(0.3, C.fish, 0, 0.62, 0, [0.62, 1, 0.55], 12);
  p.sphere(0.24, C.fishBelly, 0, 0.58, 0.07, [0.5, 0.85, 0.45], 10);
  p.box(0.04, 0.34, 0.24, C.red, 0, 0.82, -0.17, [0.3, 0, 0]);
  for (const s of [-1, 1]) {
    p.sphere(0.07, C.cream, s * 0.12, 0.88, 0.12, [1, 1, 1], 8);
    p.sphere(0.035, C.ink, s * 0.13, 0.89, 0.18, [1, 1, 1], 6);
  }
  for (const [b, s] of [
    ['finL', -1],
    ['finR', 1],
  ] as const) {
    r.on(b).plain.box(0.2, 0.04, 0.14, C.red, s * 0.2, 0.55, 0.05, [0, 0, s * 0.6]);
  }
  const m = r.on('mouth').plain;
  m.cyl(0.08, 0.06, 0.08, C.fishBelly, 0, 0.72, 0.17, [Math.PI / 2, 0, 0], 10);
  m.cyl(0.05, 0.05, 0.09, C.ink, 0, 0.72, 0.19, [Math.PI / 2, 0, 0], 10);
}

/** Cá nhảy trên đuôi, lắc mình, vây quạt; phun thì ngả ra sau lấy hơi rồi chúi tới, miệng phồng to. */
function poseFish(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  const flap = 0.25 * Math.sin(t * 9);
  b.finL.rotation.z = -flap;
  b.finR.rotation.z = flap;
  if (a.act === 'walk') {
    const ph = a.phase ?? 0;
    b.base.position.y = 0.1 * Math.abs(Math.sin(ph));
    b.body.rotation.z = 0.12 * Math.sin(ph);
    b.body.rotation.x = 0.12;
  } else if (a.act === 'fight') {
    const k = a.strike;
    const e = strikeCurve(k, 0.15, 0.3);
    // Trước khi phun (giữa hai đòn) ngả dần ra sau lấy hơi; phun thì chúi tới.
    b.body.rotation.x = k === undefined ? -0.12 - 0.04 * Math.sin(t * 3) : lerp(-0.15, 0.35, e);
    b.mouth.scale.setScalar(1 + 0.5 * e);
  } else if (a.act === 'dead') {
    b.body.rotation.x = -0.4 * (a.fall ?? 1);
  } else {
    b.body.rotation.z = 0.06 * Math.sin(t * 2);
  }
}

// ---------- Cá sấu ----------

const CROC: Defs = {
  ...BASE,
  body: { parent: 'base', at: [0, 0.3, 0] },
  head: { parent: 'body', at: [0, 0.32, 0.38] },
  jaw: { parent: 'head', at: [0, 0.24, 0.42] },
  qFL: { parent: 'body', at: [-0.2, 0.18, 0.3] },
  qFR: { parent: 'body', at: [0.2, 0.18, 0.3] },
  qBL: { parent: 'body', at: [-0.2, 0.18, -0.25] },
  qBR: { parent: 'body', at: [0.2, 0.18, -0.25] },
  tail: { parent: 'body', at: [0, 0.27, -0.38] },
  tail2: { parent: 'tail', at: [0, 0.25, -0.85] },
};

/** Cá sấu: mình dài sát đất, mõm dài răng trắng, hàm dưới há được, lưng có vảy gai, đuôi vuốt dài. */
function drawCroc(r: Rig): void {
  const p = r.on('body').plain;
  p.sphere(0.32, C.croc, 0, 0.3, 0, [0.85, 0.6, 1.5], 12);
  p.sphere(0.26, C.crocBelly, 0, 0.22, 0.04, [0.75, 0.35, 1.3], 10);
  for (let i = 0; i < 3; i++) p.box(0.06, 0.08, 0.06, C.serpent, 0, 0.5 - i * 0.03, 0.3 - i * 0.22);
  const h = r.on('head').plain;
  h.box(0.3, 0.12, 0.6, C.croc, 0, 0.34, 0.68);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) h.cone(0.025, 0.08, C.cream, s * 0.12, 0.25, 0.48 + i * 0.1, [Math.PI, 0, 0], 4);
  for (const s of [-1, 1]) {
    h.sphere(0.07, C.croc, s * 0.11, 0.44, 0.42, [1, 1, 1], 8);
    h.sphere(0.035, C.ember, s * 0.12, 0.47, 0.46, [1, 1, 1], 6);
  }
  const j = r.on('jaw').plain;
  j.box(0.26, 0.07, 0.56, C.crocBelly, 0, 0.23, 0.7);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) j.cone(0.02, 0.06, C.cream, s * 0.1, 0.29, 0.55 + i * 0.1, undefined, 4);
  for (const [b, x, z] of [
    ['qFL', -0.25, 0.3],
    ['qFR', 0.25, 0.3],
    ['qBL', -0.25, -0.25],
    ['qBR', 0.25, -0.25],
  ] as const) {
    r.on(b).plain.cyl(0.06, 0.07, 0.2, C.croc, x, 0.1, z, [0, 0, x > 0 ? -0.5 : 0.5], 6);
  }
  const tl = r.on('tail').plain;
  tl.cone(0.16, 0.55, C.croc, 0, 0.26, -0.62, [-Math.PI / 2, 0, 0], 8);
  for (let i = 3; i < 6; i++) tl.box(0.06, 0.08, 0.06, C.serpent, 0, 0.5 - i * 0.05, 0.3 - i * 0.2);
  r.on('tail2').plain.cone(0.09, 0.55, C.croc, 0, 0.24, -1.1, [-Math.PI / 2, 0, 0], 6);
}

/** Cá sấu bò lắc mình, đuôi vẫy theo; thủ thì há hàm chờ, đớp thì chồm tới sập hàm, đuôi quất. */
function poseCroc(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  if (a.act === 'walk') {
    const ph = (a.phase ?? 0) * 0.8;
    const sw = Math.sin(ph);
    b.qFL.rotation.y = b.qBR.rotation.y = 0.5 * sw;
    b.qFR.rotation.y = b.qBL.rotation.y = 0.5 * sw;
    b.body.rotation.y = 0.1 * sw;
    b.head.rotation.y = -0.12 * sw;
    b.tail.rotation.y = -0.25 * Math.sin(ph - 0.6);
    b.tail2.rotation.y = -0.35 * Math.sin(ph - 1.2);
    b.jaw.rotation.x = 0.08;
  } else if (a.act === 'fight') {
    const k = a.strike;
    const e = strikeCurve(k, 0.2, 0.4);
    // Há hàm chờ; đớp: sập hàm nhanh rồi há lại dần.
    const open = k === undefined ? 0.4 + 0.05 * Math.sin(t * 4) : k < 0.12 ? lerp(0.6, 0, k / 0.12) : 0.4 * Math.min(1, (k - 0.12) / 0.6);
    b.jaw.rotation.x = open;
    b.head.rotation.x = -0.15 * e - 0.1;
    b.body.position.z = 0.15 * e;
    b.tail.rotation.y = 0.4 * Math.sin(Math.PI * Math.min(1, (k ?? 0) * 2)) + 0.1 * Math.sin(t * 2);
  } else if (a.act === 'dead') {
    b.jaw.rotation.x = 0.4 * (a.fall ?? 1);
  } else {
    b.tail.rotation.y = 0.15 * Math.sin(t * 1.5);
    b.jaw.rotation.x = 0.06 + 0.06 * Math.sin(t * 0.8);
  }
}

// ---------- Thuồng luồng ----------

/** Các khúc mình rắn từ đuôi lên cổ: x, y, z, bán kính. */
const SERPENT_BODY: [number, number, number, number][] = [
  [0, 0.18, -0.9, 0.2],
  [0.25, 0.22, -0.55, 0.23],
  [0.1, 0.3, -0.15, 0.25],
  [-0.15, 0.5, 0.1, 0.25],
  [-0.05, 0.85, 0.2, 0.24],
  [0.05, 1.2, 0.25, 0.22],
];
const SERPENT: Defs = {
  ...BASE,
  ...Object.fromEntries(
    SERPENT_BODY.map(([x, y, z], i) => [`s${i}`, { parent: i ? `s${i - 1}` : 'base', at: [x, y, z] as [number, number, number] }]),
  ),
  head: { parent: 's5', at: [0.05, 1.32, 0.3] },
};

/** Thuồng luồng: mình rắn uốn khúc ngóc đầu cao, râu dài, sừng đồng, vây lưng đỏ, mắt rực. */
function drawSerpent(r: Rig): void {
  SERPENT_BODY.forEach(([x, y, z, rr], i) => {
    const p = r.on(`s${i}`).plain;
    p.sphere(rr, C.serpent, x, y, z, [1, 0.9, 1], 10);
    p.sphere(rr * 0.75, C.serpentBelly, x, y - rr * 0.15, z + rr * 0.4, [1, 0.8, 0.6], 8);
    p.cone(0.06, 0.22, C.red, x, y + rr + 0.05, z - 0.05, [-0.4, 0, 0], 4);
    if (i === 0) p.cone(0.12, 0.5, C.serpent, x - 0.1, 0.12, z - 0.35, [-Math.PI / 2 - 0.2, 0, 0], 6);
  });
  const h = r.on('head').plain;
  h.box(0.34, 0.24, 0.42, C.serpent, 0.05, 1.42, 0.42);
  h.box(0.28, 0.08, 0.3, C.serpentBelly, 0.05, 1.3, 0.5);
  for (const s of [-1, 1]) {
    h.sphere(0.05, C.ember, 0.05 + s * 0.12, 1.5, 0.6, [1, 1, 0.6], 6);
    h.cone(0.04, 0.3, C.bronzeLight, 0.05 + s * 0.1, 1.68, 0.3, [-0.6, 0, s * 0.3], 5);
    h.cyl(0.012, 0.012, 0.6, C.cream, 0.05 + s * 0.16, 1.32, 0.78, [1.1, 0, s * 0.6], 4);
  }
}

/** Thuồng luồng uốn mình như sóng; thủ thì rụt cổ ra sau, mổ thì lao đầu tới. */
function poseSerpent(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  const walk = a.act === 'walk';
  const ph = walk ? (a.phase ?? 0) * 0.7 : t * 1.6;
  const amp = walk ? 1 : 0.5;
  for (let i = 0; i < 3; i++) b[`s${i}`].rotation.y = 0.18 * amp * Math.sin(ph - i * 0.9);
  for (let i = 3; i < 6; i++) b[`s${i}`].rotation.z = 0.07 * amp * Math.sin(ph - i * 0.9);
  b.head.rotation.z = -0.1 * amp * Math.sin(ph - 5);
  if (a.act === 'fight') {
    const e = strikeCurve(a.strike, 0.2, 0.4);
    b.s3.rotation.x = lerp(-0.2, 0.25, e);
    b.s4.rotation.x = lerp(-0.25, 0.3, e);
    b.s5.rotation.x = lerp(-0.15, 0.25, e);
    b.head.rotation.x = lerp(0.1, 0.25, e);
  } else if (a.act === 'dead') {
    const f = a.fall ?? 1;
    b.s4.rotation.x = 0.4 * f;
    b.s5.rotation.x = 0.4 * f;
  }
}

// ---------- Quỷ núi ----------

/** Khung người to, chân ngắn, tay dài: cùng tên khớp với thân người thường để dùng chung các tư thế. */
const DEMON: Record<HumanBone, BoneDef<HumanBone>> = {
  hips: { parent: null, at: [0, 0.36, 0] },
  legL: { parent: 'hips', at: [-0.1, 0.3, 0] },
  legR: { parent: 'hips', at: [0.1, 0.3, 0] },
  chest: { parent: 'hips', at: [0, 0.42, 0] },
  head: { parent: 'chest', at: [0, 0.78, 0.04] },
  armL: { parent: 'chest', at: [-0.25, 0.68, 0.03] },
  armR: { parent: 'chest', at: [0.25, 0.68, 0.03] },
  hand: { parent: 'chest', at: [0.25, 0.31, 0.03] },
  handL: { parent: 'chest', at: [-0.25, 0.31, 0.03] },
};
const DEMON_ARM = 0.37;

/** Quỷ núi: da xám xanh, đầu to có sừng, mắt đỏ, nanh trắng, khố da, vác chày đá. */
function drawDemon(r: RigBuilder<HumanBone>): void {
  for (const [b, x] of [
    ['legL', -0.1],
    ['legR', 0.1],
  ] as const) {
    const p = r.on(b).plain;
    p.cyl(0.07, 0.08, 0.3, C.demonDark, x, 0.15, 0, undefined, 6);
    p.sphere(0.07, C.demonDark, x, 0.03, 0.04, [1, 0.6, 1.4], 6);
  }
  const hips = r.on('hips').plain;
  hips.cyl(0.25, 0.28, 0.14, C.earthDark, 0, 0.38, 0, undefined, 10);
  for (let i = 0; i < 4; i++) hips.cone(0.06, 0.14, C.earthDark, -0.18 + i * 0.12, 0.27, 0.2, [Math.PI, 0, 0], 4);
  r.on('chest').plain.sphere(0.27, C.demon, 0, 0.56, 0, [1, 0.95, 0.85], 10);
  for (const [b, s] of [
    ['armL', -1],
    ['armR', 1],
  ] as const) {
    const p = r.on(b).plain;
    p.cyl(0.07, 0.06, 0.34, C.demon, s * 0.25, 0.5, 0.03, undefined, 6);
    p.sphere(0.075, C.demonDark, s * 0.25, 0.31, 0.03, [1, 1, 1], 6);
  }
  const h = r.on('head').plain;
  h.sphere(0.25, C.demon, 0, 0.94, 0.04, [1.05, 0.95, 0.95], 12);
  for (const s of [-1, 1]) {
    h.cone(0.06, 0.26, C.cream, s * 0.16, 1.17, 0, [0, 0, -s * 0.45], 5);
    h.sphere(0.05, C.ember, s * 0.09, 0.98, 0.22, [1, 0.8, 0.6], 6);
    h.cone(0.025, 0.08, C.cream, s * 0.06, 0.82, 0.24, [Math.PI, 0, 0], 4);
    h.box(0.08, 0.025, 0.02, C.ink, s * 0.08, 1.05, 0.24, [0, 0, -s * 0.35]);
  }
  // Chày đá: cán gỗ, đầu đá to.
  r.local('hand', DEMON.hand.at, null, (s) => {
    s.plain.cyl(0.03, 0.035, 0.8, C.woodDark, 0, 0.3, 0, undefined, 5);
    s.plain.sphere(0.15, C.rock, 0, 0.75, 0, [1, 1.2, 1], 7);
  });
}

/** Quỷ núi đi lừ đừ vác chày trên vai; thủ thì giơ chày quá đầu, đánh thì nện xuống. */
function poseDemon(b: Human, a: Act): void {
  beginPose(b, a.time);
  b.armR.rotation.z = 0.35;
  b.armL.rotation.z = -0.35;
  if (a.act === 'walk') {
    const sw = walkCycle(b, (a.phase ?? 0) * 0.8, (a.stride ?? 0.5) * 0.7);
    b.chest.rotation.z = 0.08 * sw;
    b.armR.rotation.set(-0.9, 0, 0.3);
    b.hand.rotation.set(-0.9, 0, -0.1);
  } else if (a.act === 'fight') {
    const e = strikeCurve(a.strike, 0.28, 0.5);
    stance(b, lerp(0.2, 0.45, e), lerp(0.2, 0.35, e));
    b.chest.rotation.set(lerp(-0.12, 0.45, e), lerp(0.2, -0.2, e), 0);
    b.head.rotation.x = lerp(0.1, -0.35, e);
    b.armR.rotation.set(lerp(-3.0, -1.0, e), 0, 0.15);
    b.armL.rotation.set(lerp(-0.8, -0.3, e), 0, -0.4);
    b.hand.rotation.set(lerp(-0.8, 1.9, e), 0, 0);
  } else if (a.act === 'dead') {
    const f = a.fall ?? 1;
    fallPose(b, f);
    b.hand.rotation.x = lerp(0.1, -1.2, f);
  } else {
    b.hand.rotation.set(0.1, 0, -0.15);
  }
  gripHands(b, DEMON_ARM);
}

// ---------- Ma trơi ----------

const GHOST: Defs = {
  ...BASE,
  core: { parent: 'base', at: [0, 0.62, 0] },
  flame: { parent: 'core', at: [0, 0.78, -0.03] },
  flameL: { parent: 'core', at: [0.1, 0.8, 0.02] },
  flameR: { parent: 'core', at: [-0.1, 0.8, 0.02] },
  orbit: { parent: 'base', at: [0, 0.45, 0] },
};

/** Ma trơi: đốm lửa xanh lơ lửng có đôi mắt đen, lưỡi lửa vuốt nhọn lên trời, vài đốm nhỏ bay quanh. Tự sáng. */
function drawGhost(r: Rig): void {
  const c = r.on('core');
  c.glow.sphere(0.24, C.ghost, 0, 0.62, 0, [1, 1.05, 1], 12);
  c.glow.sphere(0.17, 0xe8fbff, 0, 0.58, 0.05, [1, 1, 1], 10);
  for (const s of [-1, 1]) c.plain.sphere(0.045, C.ink, s * 0.08, 0.66, 0.2, [1, 1.4, 0.5], 6);
  c.plain.sphere(0.035, C.ink, 0, 0.55, 0.22, [1.2, 0.8, 0.5], 6);
  r.on('flame').glow.cone(0.2, 0.55, C.ghostDeep, 0, 0.98, -0.04, [-0.2, 0, 0], 8);
  r.on('flameL').glow.cone(0.1, 0.3, C.ghost, 0.12, 0.92, 0.02, [-0.1, 0, -0.4], 6);
  r.on('flameR').glow.cone(0.1, 0.3, C.ghost, -0.12, 0.92, 0.02, [-0.1, 0, 0.4], 6);
  const o = r.on('orbit').glow;
  for (const [x, y, z] of [
    [0.3, 0.4, -0.1],
    [-0.28, 0.5, 0.05],
    [0.05, 0.3, -0.25],
  ] as const) {
    o.sphere(0.05, C.ghost, x, y, z, [1, 1, 1], 6);
  }
}

/** Ma trơi lơ lửng nhấp nhô, lửa bập bùng, đốm lửa bay vòng; bay tới thì ngả về trước; bắn thì phồng lên; tan thì tắt dần. */
function poseGhost(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  b.core.position.y += 0.06 * Math.sin(t * 2.5);
  b.orbit.rotation.y = t * 1.5;
  b.flame.scale.set(1, 0.85 + 0.25 * Math.abs(Math.sin(t * 7)), 1);
  b.flameL.scale.set(1, 0.8 + 0.3 * Math.abs(Math.sin(t * 9 + 1)), 1);
  b.flameR.scale.set(1, 0.8 + 0.3 * Math.abs(Math.sin(t * 8 + 2)), 1);
  if (a.act === 'walk') {
    b.core.rotation.x = 0.25;
    b.core.position.y += 0.04 * Math.sin((a.phase ?? 0) * 0.8);
  } else if (a.act === 'fight') {
    const e = strikeCurve(a.strike, 0.15, 0.3);
    b.core.scale.setScalar(1 + 0.25 * e);
    b.core.rotation.x = 0.3 * e;
  } else if (a.act === 'dead') {
    const k = Math.max(1 - (a.fall ?? 1), 1e-3);
    b.core.scale.setScalar(k);
    b.orbit.scale.setScalar(k);
  }
}

// ---------- Trong trận ----------

export type MonsterKind = 'tomBinh' | 'caPhun' | 'caSau' | 'thuongLuong' | 'quyNui' | 'maTroi';
const KINDS: readonly FighterKind[] = ['tomBinh', 'caPhun', 'caSau', 'thuongLuong', 'quyNui', 'maTroi'];
export const isMonster = (k: FighterKind): k is MonsterKind => KINDS.includes(k);

interface Spec {
  defs: Defs;
  draw(r: Rig): void;
  pose(b: B, a: Act): void;
  /** Ngã thế nào: lăn nghiêng (thú bò), không ngả (ma trơi tắt dần), hay ngả ngửa như người (mặc định). */
  fall?: 'side' | 'none';
}

const SPECS: Record<MonsterKind, Spec> = {
  tomBinh: { defs: SHRIMP, draw: drawShrimp, pose: poseShrimp },
  caPhun: { defs: FISH, draw: drawFish, pose: poseFish },
  caSau: { defs: CROC, draw: drawCroc, pose: poseCroc, fall: 'side' },
  thuongLuong: { defs: SERPENT, draw: drawSerpent, pose: poseSerpent, fall: 'side' },
  quyNui: {
    defs: DEMON as Defs,
    draw: (r) => drawDemon(r as unknown as RigBuilder<HumanBone>),
    pose: (b, a) => poseDemon(b as unknown as Human, a),
  },
  maTroi: { defs: GHOST, draw: drawGhost, pose: poseGhost, fall: 'none' },
};

function shapeOf(spec: Spec) {
  const r = new RigBuilder(spec.defs);
  spec.draw(r);
  return r.build();
}

/** Thủy quái, yêu tinh có xương cho trận đánh: `userData.pose(a)` mỗi khung hình. */
export function makeMonster(kind: MonsterKind): THREE.Group {
  const spec = SPECS[kind];
  const { group, bones } = skinRig(shapeOf(spec));
  const pose: Poser = (a) => spec.pose(bones, a);
  pose({ act: 'stand' });
  group.userData.pose = pose;
  if (spec.fall) group.userData.fall = spec.fall;
  return group;
}

/** Bản tĩnh ở một tư thế. */
export function bakeMonster(kind: MonsterKind, a: Act = { act: 'stand' }): THREE.Group {
  const spec = SPECS[kind];
  return bakeRig(shapeOf(spec), (b) => spec.pose(b, a));
}
