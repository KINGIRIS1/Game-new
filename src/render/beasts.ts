// Thú có khung xương (rig.ts) và người cưỡi (soldier.ts): voi chiến có Lạc tướng cưỡi, chiến xa và đại tướng Ân,
// kỵ binh Triệu, Triệu Đà, hổ tinh, gà trắng nghìn năm, Rùa Vàng, ngựa vua chở An Dương Vương và Mỵ Châu.
// Gốc là mặt đất dưới thú, đầu hướng +z.
// Thú bốn chân đi theo nhịp chéo (chân trước trái cùng chân sau phải); ngã thì lăn nghiêng (`userData.fall`).

import * as THREE from 'three';
import type { FighterKind } from '../game/battle';
import { HUMAN, beginPose, featherCrown, hairCap, humanBody, humanHead, lerp, strikeCurve, type Human, type HumanRig } from './body';
import { C } from './palette';
import { RigBuilder, bakeRig, moveBones, resetBones, skinRig, type Act, type BoneDef, type Bones, type Poser, type RigSlots } from './rig';
import { drawRider, poseRider, type RiderKind } from './soldier';
import { IRON, IRON_DARK } from './weapons';

type Defs = Record<string, BoneDef<string>>;
type Rig = RigBuilder<string>;
type B = Bones<string>;
type V3 = [number, number, number];

const BASE: Defs = { base: { parent: null, at: [0, 0, 0] } };

/** Bốn chân đi nhịp chéo; thân hạ cho chân (dài `len`) vẫn chạm đất. Trả về sin pha. */
export function quadWalk(b: B, phase: number, stride: number, len: number): number {
  const sw = Math.sin(phase);
  b.qFL.rotation.x = b.qBR.rotation.x = stride * sw;
  b.qFR.rotation.x = b.qBL.rotation.x = -stride * sw;
  b.qBody.position.y -= len * (1 - Math.cos(stride * sw));
  return sw;
}

/** Ngã: chân duỗi ra, đầu gục (phần vẽ trận lăn cả con nằm nghiêng). */
export function quadFall(b: B, f: number): void {
  b.qFL.rotation.x = -0.6 * f;
  b.qFR.rotation.x = -0.35 * f;
  b.qBL.rotation.x = 0.5 * f;
  b.qBR.rotation.x = 0.3 * f;
}

// ---------- Ngựa ----------

/** Ngựa đứng, lưng cao chừng 0,85. */
const HORSE: Defs = {
  qBody: { parent: 'base', at: [0, 0.78, 0] },
  qFL: { parent: 'qBody', at: [-0.14, 0.62, 0.3] },
  qFR: { parent: 'qBody', at: [0.14, 0.62, 0.3] },
  qBL: { parent: 'qBody', at: [-0.14, 0.62, -0.3] },
  qBR: { parent: 'qBody', at: [0.14, 0.62, -0.3] },
  qNeck: { parent: 'qBody', at: [0, 0.9, 0.32] },
  qHead: { parent: 'qNeck', at: [0, 1.2, 0.52] },
  qTail: { parent: 'qBody', at: [0, 0.9, -0.42] },
};
const HORSE_LEG = 0.62;

function drawHorse(r: Rig, color: number, saddle: number | null): void {
  const body = r.on('qBody');
  body.plain.sphere(0.33, color, 0, 0.78, 0, [0.8, 0.78, 1.4], 12);
  if (saddle) body.band.box(0.5, 0.06, 0.46, saddle, 0, 1.0, -0.04);
  for (const [b, x, z] of [
    ['qFL', -0.14, 0.3],
    ['qFR', 0.14, 0.3],
    ['qBL', -0.14, -0.3],
    ['qBR', 0.14, -0.3],
  ] as const) {
    const p = r.on(b).plain;
    p.cyl(0.07, 0.055, 0.34, color, x, 0.46, z, undefined, 7);
    p.cyl(0.045, 0.05, 0.26, color, x, 0.17, z, undefined, 6);
    p.cyl(0.055, 0.06, 0.06, C.ink, x, 0.03, z, undefined, 6);
  }
  const neck = r.on('qNeck').plain;
  neck.cyl(0.1, 0.14, 0.46, color, 0, 1.05, 0.42, [-0.6, 0, 0], 8);
  // Bờm đen dọc cổ.
  neck.box(0.04, 0.32, 0.36, C.ink, 0, 1.18, 0.38, [-0.6, 0, 0]);
  const head = r.on('qHead').plain;
  head.box(0.17, 0.18, 0.4, color, 0, 1.25, 0.64, [0.35, 0, 0]);
  for (const s of [-1, 1]) {
    head.cone(0.035, 0.12, color, s * 0.06, 1.42, 0.5, [-0.3, 0, s * 0.25], 5);
    head.sphere(0.024, C.ink, s * 0.088, 1.3, 0.6, [0.5, 1, 1], 5);
  }
  r.on('qTail').plain.cone(0.06, 0.5, C.ink, 0, 0.85, -0.52, [-2.3, 0, 0], 6);
}

/** Ngựa đi, đứng (gật đầu, phẩy đuôi), cào chân khi người cưỡi ra đòn, ngã. */
function poseHorse(b: B, a: Act, e: number): void {
  const t = a.time ?? 0;
  if (a.act === 'walk') {
    const ph = a.phase ?? 0;
    const sw = quadWalk(b, ph, (a.stride ?? 0.5) * 0.9, HORSE_LEG);
    b.qNeck.rotation.x = 0.06 * Math.sin(ph * 2);
    b.qTail.rotation.set(0.15, 0, 0.2 * sw);
  } else if (a.act === 'dead') {
    const f = a.fall ?? 1;
    quadFall(b, f);
    b.qNeck.rotation.x = 0.5 * f;
  } else {
    b.qNeck.rotation.x = 0.04 * Math.sin(t * 1.5) - 0.12 * e;
    b.qTail.rotation.z = 0.12 * Math.sin(t * 2.2);
    b.qFL.rotation.x = -0.6 * e;
  }
}

// ---------- Chiến xa ----------

const CART_AT: V3 = [0, 0.45, -0.15];
const CHARIOT: Defs = {
  cart: { parent: 'base', at: CART_AT },
  wheelL: { parent: 'cart', at: [-0.38, 0.36, -0.15] },
  wheelR: { parent: 'cart', at: [0.38, 0.36, -0.15] },
  // Ngựa kéo nhỏ hơn ngựa cưỡi, đứng trước xe.
  ...moveBones(HORSE, 'base', [0, 0, 0.95], 0.78),
};

/** Xe hai bánh lớn có nan, thùng xe sơn đỏ hoa văn, càng xe nối tới ngựa. */
function drawChariot(r: Rig): void {
  for (const [b, x] of [
    ['wheelL', -0.38],
    ['wheelR', 0.38],
  ] as const) {
    const p = r.on(b).plain;
    p.add(new THREE.TorusGeometry(0.33, 0.035, 5, 16), C.woodDark, x, 0.36, -0.15, [0, Math.PI / 2, 0]);
    for (let i = 0; i < 4; i++) p.box(0.025, 0.64, 0.025, C.wood, x, 0.36, -0.15, [(i * Math.PI) / 4, 0, 0]);
    p.cyl(0.07, 0.07, 0.12, C.bronze, x, 0.36, -0.15, [0, 0, Math.PI / 2], 6);
  }
  const cart = r.on('cart');
  cart.plain.cyl(0.03, 0.03, 0.86, C.woodDark, 0, 0.36, -0.15, [0, 0, Math.PI / 2], 5);
  cart.band.box(0.62, 0.26, 0.46, C.enemyRed, 0, 0.55, -0.15);
  cart.plain.box(0.66, 0.04, 0.5, C.bronzeDark, 0, 0.69, -0.15);
  cart.plain.cyl(0.025, 0.025, 1.0, C.woodDark, 0, 0.45, 0.4, [Math.PI / 2, 0, 0], 5);
  cart.plain.box(0.4, 0.04, 0.05, C.woodDark, 0, 0.62, 0.86);
  r.place([0, 0, 0.95], 0.78, () => drawHorse(r, C.horse, null));
}

// ---------- Voi ----------

const ELEPHANT: Defs = {
  qBody: { parent: 'base', at: [0, 0.72, 0] },
  qFL: { parent: 'qBody', at: [-0.2, 0.5, 0.28] },
  qFR: { parent: 'qBody', at: [0.2, 0.5, 0.28] },
  qBL: { parent: 'qBody', at: [-0.2, 0.5, -0.28] },
  qBR: { parent: 'qBody', at: [0.2, 0.5, -0.28] },
  qHead: { parent: 'qBody', at: [0, 0.95, 0.42] },
  qEarL: { parent: 'qHead', at: [-0.2, 1.0, 0.42] },
  qEarR: { parent: 'qHead', at: [0.2, 1.0, 0.42] },
  qTrunk: { parent: 'qHead', at: [0, 0.8, 0.68] },
  qTrunk2: { parent: 'qTrunk', at: [0, 0.5, 0.75] },
  qTail: { parent: 'qBody', at: [0, 0.82, -0.48] },
};

/**
 * Voi chiến. `tier`: bậc giáp đã rèn: bậc 1 giáp trán sắt và giáp sườn sắt viền đồng; bậc 2 thêm ngà dài bịt đồng,
 * bành gỗ quây quanh chỗ ngồi và lọng đỏ.
 */
function drawElephant(r: Rig, tier: number): void {
  const body = r.on('qBody');
  const p = body.plain;
  p.sphere(0.42, C.elephant, 0, 0.72, 0, [0.85, 0.8, 1.2], 12);
  body.band.box(0.62, 0.08, 0.7, C.red, 0, 1.05, -0.05);
  for (const [b, x, z] of [
    ['qFL', -0.2, 0.28],
    ['qFR', 0.2, 0.28],
    ['qBL', -0.2, -0.28],
    ['qBR', 0.2, -0.28],
  ] as const) {
    const leg = r.on(b).plain;
    leg.cyl(0.11, 0.12, 0.5, C.elephant, x, 0.25, z, undefined, 8);
    leg.sphere(0.05, C.cream, x, 0.04, z + 0.1, [1.6, 0.6, 0.6], 5);
  }
  const head = r.on('qHead').plain;
  head.sphere(0.27, C.elephant, 0, 0.92, 0.48, [1, 1, 0.95], 10);
  for (const s of [-1, 1]) {
    head.sphere(0.035, C.ink, s * 0.15, 1.02, 0.66, [1, 1, 0.5], 6);
    head.cone(0.03, 0.26, C.cream, s * 0.1, 0.72, 0.68, [1.2, 0, 0], 5);
  }
  for (const [b, s] of [
    ['qEarL', -1],
    ['qEarR', 1],
  ] as const) {
    r.on(b).plain.sphere(0.2, C.elephant, s * 0.26, 0.95, 0.4, [0.35, 1, 0.9], 8);
  }
  for (let i = 0; i < 4; i++) {
    r.on(i < 2 ? 'qTrunk' : 'qTrunk2').plain.cyl(0.07 - i * 0.01, 0.08 - i * 0.01, 0.2, C.elephant, 0, 0.78 - i * 0.16, 0.7 + i * 0.03, [0.15 * i, 0, 0], 6);
  }
  r.on('qTrunk2').plain.sphere(0.04, C.elephant, 0, 0.24, 0.84, [1, 1, 1], 6);
  const tail = r.on('qTail').plain;
  tail.cyl(0.02, 0.025, 0.3, C.elephant, 0, 0.68, -0.52, [0.25, 0, 0], 5);
  tail.sphere(0.04, C.ink, 0, 0.53, -0.56, [1, 1.4, 1], 5);
  if (tier >= 1) {
    head.box(0.34, 0.26, 0.05, IRON, 0, 1.02, 0.7, [-0.35, 0, 0]);
    head.box(0.36, 0.04, 0.06, C.bronze, 0, 1.15, 0.66, [-0.35, 0, 0]);
    for (const s of [-1, 1]) {
      p.box(0.04, 0.3, 0.6, IRON_DARK, s * 0.35, 0.86, -0.05, [0, 0, s * 0.2]);
      for (const y of [0.72, 1.0]) p.box(0.05, 0.04, 0.62, C.bronze, s * (0.32 + (1.0 - y) * 0.2), y, -0.05, [0, 0, s * 0.2]);
      for (const dz of [-0.2, 0, 0.2]) p.sphere(0.028, C.bronzeLight, s * 0.38, 0.86, -0.05 + dz, [1, 1, 1], 5);
    }
  }
  if (tier >= 2) {
    for (const s of [-1, 1]) {
      head.cone(0.045, 0.42, C.cream, s * 0.12, 0.66, 0.78, [1.25, 0, 0], 6);
      head.cyl(0.05, 0.05, 0.06, C.bronze, s * 0.12, 0.7, 0.72, [1.25, 0, 0], 6);
      p.box(0.04, 0.16, 0.6, C.woodDark, s * 0.3, 1.18, -0.1);
      p.box(0.6, 0.16, 0.04, C.woodDark, 0, 1.18, -0.1 + s * 0.3);
    }
    // Lọng che trên bành: cán gỗ, tán đỏ viền đồng.
    p.cyl(0.02, 0.02, 0.95, C.woodDark, 0, 2.02, -0.35, undefined, 5);
    body.band.cone(0.42, 0.2, C.red, 0, 2.55, -0.35, undefined, 12);
    p.cyl(0.43, 0.43, 0.04, C.bronze, 0, 2.45, -0.35, undefined, 12);
  }
}

/** Voi đi chậm, vòi đung đưa, tai quạt; khi Lạc tướng đâm giáo thì voi giơ vòi, dậm chân trước. */
function poseElephant(b: B, a: Act, e: number): void {
  const t = a.time ?? 0;
  const flap = 0.15 + 0.15 * Math.sin(t * 2.4);
  b.qEarL.rotation.y = flap;
  b.qEarR.rotation.y = -flap;
  if (a.act === 'walk') {
    const ph = (a.phase ?? 0) * 0.6;
    const sw = quadWalk(b, ph, (a.stride ?? 0.5) * 0.55, 0.5);
    b.qBody.rotation.z = 0.03 * sw;
    b.qTrunk.rotation.x = 0.15 * sw;
    b.qTrunk2.rotation.x = 0.25 * Math.sin(ph - 0.8);
    b.qTail.rotation.z = 0.2 * sw;
  } else if (a.act === 'dead') {
    const f = a.fall ?? 1;
    quadFall(b, f);
    b.qTrunk.rotation.x = 0.3 * f;
  } else {
    b.qTrunk.rotation.x = 0.08 * Math.sin(t * 1.3) - 1.0 * e;
    b.qTrunk2.rotation.x = 0.12 * Math.sin(t * 1.3 - 0.7) - 1.2 * e;
    b.qHead.rotation.x = -0.2 * e;
    b.qFL.rotation.x = b.qFR.rotation.x = -0.35 * e;
    b.qBody.rotation.x = -0.1 * e;
    b.qTail.rotation.z = 0.1 * Math.sin(t * 2);
  }
}

// ---------- Hổ tinh ----------

const TIGER: Defs = {
  qBody: { parent: 'base', at: [0, 0.66, 0] },
  qFL: { parent: 'qBody', at: [-0.17, 0.58, 0.36] },
  qFR: { parent: 'qBody', at: [0.17, 0.58, 0.36] },
  qBL: { parent: 'qBody', at: [-0.17, 0.45, -0.36] },
  qBR: { parent: 'qBody', at: [0.17, 0.45, -0.36] },
  qHead: { parent: 'qBody', at: [0, 0.86, 0.48] },
  qTail: { parent: 'qBody', at: [0, 0.64, -0.48] },
  qTail2: { parent: 'qTail', at: [0, 0.68, -0.92] },
};

/** Hổ vằn cam đen, to, chồm về trước (vai cao hơn mông), mắt đỏ, trán có vằn, đuôi cong vồng lên. */
function drawTiger(r: Rig): void {
  const p = r.on('qBody').plain;
  p.sphere(0.36, C.tiger, 0, 0.66, 0, [0.82, 0.72, 1.45], 12);
  p.sphere(0.3, C.tigerBelly, 0, 0.54, 0.05, [0.7, 0.5, 1.25], 10);
  for (let i = 0; i < 5; i++) {
    const z = -0.38 + i * 0.17;
    const top = 0.66 + 0.26 * Math.sqrt(Math.max(0, 1 - (z / 0.52) ** 2));
    p.box(0.22, 0.03, 0.06, C.ink, 0, top, z);
    for (const sd of [-1, 1]) p.box(0.03, 0.2, 0.06, C.ink, sd * 0.285, 0.7, z, [0, 0, sd * 0.35]);
  }
  for (const [b, x, front] of [
    ['qFL', -0.17, true],
    ['qFR', 0.17, true],
    ['qBL', -0.17, false],
    ['qBR', 0.17, false],
  ] as const) {
    const leg = r.on(b).plain;
    if (front) leg.cyl(0.075, 0.085, 0.56, C.tiger, x, 0.3, 0.36, [-0.25, 0, 0], 7);
    else leg.cyl(0.085, 0.095, 0.44, C.tiger, x, 0.23, -0.36, [0.15, 0, 0], 7);
    leg.sphere(0.08, C.tigerBelly, x, 0.05, front ? 0.48 : -0.3, [1, 0.6, 1.3], 6);
    leg.box(0.03, 0.1, 0.06, C.ink, x + (x > 0 ? 0.07 : -0.07), front ? 0.32 : 0.25, front ? 0.38 : -0.36);
  }
  const h = r.on('qHead').plain;
  h.sphere(0.28, C.tiger, 0, 0.98, 0.6, [1.12, 1, 1], 12);
  h.sphere(0.16, C.tigerBelly, 0, 0.88, 0.8, [1.3, 0.8, 0.8], 10);
  h.sphere(0.045, C.ink, 0, 0.95, 0.92, [1.4, 1, 1], 6);
  for (const dx of [-0.06, 0, 0.06]) h.box(0.025, 0.1, 0.02, C.ink, dx, 1.16, 0.84, [-0.5, 0, 0]);
  for (const sd of [-1, 1]) {
    h.sphere(0.085, C.tiger, sd * 0.19, 1.2, 0.54, [1, 1, 0.6], 8);
    h.sphere(0.04, C.ink, sd * 0.19, 1.21, 0.58, [1, 1, 0.4], 6);
    h.sphere(0.045, C.ember, sd * 0.1, 1.04, 0.84, [1, 0.8, 0.6], 6);
    h.cone(0.03, 0.12, C.cream, sd * 0.05, 0.78, 0.88, [Math.PI, 0, 0], 4);
    h.box(0.1, 0.02, 0.02, C.ink, sd * 0.25, 1.0, 0.7, [0, sd * 0.4, 0]);
  }
  r.on('qTail').plain.cyl(0.045, 0.055, 0.45, C.tiger, 0, 0.64, -0.7, [-1.45, 0, 0], 6);
  const tip = r.on('qTail2').plain;
  tip.cyl(0.04, 0.045, 0.3, C.tiger, 0, 0.78, -0.96, [-0.65, 0, 0], 6);
  tip.sphere(0.05, C.ink, 0, 0.92, -1.05, [1, 1.3, 1], 6);
}

/** Hổ rình (thấp người, đuôi quất), vồ (chồm lên, hai chân trước vươn tới, cắn), đi lừ đừ. */
function poseTiger(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  if (a.act === 'walk') {
    const ph = (a.phase ?? 0) * 0.8;
    const sw = quadWalk(b, ph, (a.stride ?? 0.5) * 0.8, 0.5);
    b.qBody.rotation.y = 0.05 * sw;
    b.qHead.rotation.y = -0.05 * sw;
    b.qTail.rotation.y = 0.3 * sw;
    b.qTail2.rotation.x = 0.2 * Math.sin(ph + 1);
  } else if (a.act === 'fight') {
    const e = strikeCurve(a.strike, 0.25, 0.45);
    b.qBody.position.y += 0.1 * e - 0.05 * (1 - e);
    b.qBody.position.z += 0.18 * e;
    b.qBody.rotation.x = -0.3 * e;
    b.qFL.rotation.x = b.qFR.rotation.x = -1.1 * e;
    b.qBL.rotation.x = b.qBR.rotation.x = 0.5 * e;
    b.qHead.rotation.x = 0.1 * (1 - e) + 0.3 * e;
    b.qTail.rotation.set(-0.4 * e, 0.35 * Math.sin(t * 4) * (1 - e), 0);
  } else if (a.act === 'dead') {
    const f = a.fall ?? 1;
    quadFall(b, f);
    b.qHead.rotation.x = 0.4 * f;
  } else {
    b.qTail.rotation.y = 0.25 * Math.sin(t * 2);
    b.qHead.rotation.y = 0.15 * Math.sin(t * 0.7);
  }
}

// ---------- Gà trắng ----------

const ROOSTER: Defs = {
  qBody: { parent: 'base', at: [0, 0.62, 0] },
  qBL: { parent: 'qBody', at: [-0.14, 0.5, 0] },
  qBR: { parent: 'qBody', at: [0.14, 0.5, 0] },
  qNeck: { parent: 'qBody', at: [0, 1.08, 0.26] },
  qHead: { parent: 'qNeck', at: [0, 1.45, 0.4] },
  qTail: { parent: 'qBody', at: [0, 1.0, -0.42] },
  qWingL: { parent: 'qBody', at: [-0.28, 1.05, 0] },
  qWingR: { parent: 'qBody', at: [0.28, 1.05, 0] },
};

/** Gà trống trắng khổng lồ: mào đỏ to, tích đỏ, mắt đỏ rực, đuôi cong vút, cựa nhọn. */
function drawRooster(r: Rig): void {
  for (const [b, s] of [
    ['qBL', -1],
    ['qBR', 1],
  ] as const) {
    const p = r.on(b).plain;
    p.cyl(0.05, 0.06, 0.5, C.bronzeLight, s * 0.14, 0.25, 0, undefined, 6);
    p.cone(0.035, 0.18, C.bronzeLight, s * 0.14, 0.16, -0.12, [-Math.PI / 2 - 0.3, 0, 0], 5);
    for (const a of [-0.5, 0, 0.5]) p.box(0.04, 0.03, 0.2, C.bronzeLight, s * 0.14 + Math.sin(a) * 0.08, 0.02, 0.08, [0, a, 0]);
  }
  r.on('qBody').plain.sphere(0.48, C.rooster, 0, 0.88, 0, [0.9, 0.85, 1.15], 14);
  for (const [b, s] of [
    ['qWingL', -1],
    ['qWingR', 1],
  ] as const) {
    r.on(b).plain.sphere(0.3, C.cream, s * 0.32, 0.9, -0.05, [0.35, 0.7, 1.05], 10);
  }
  r.on('qNeck').plain.cyl(0.18, 0.24, 0.5, C.rooster, 0, 1.3, 0.32, [0.35, 0, 0], 10);
  const h = r.on('qHead');
  h.plain.sphere(0.22, C.rooster, 0, 1.6, 0.42, [1, 1, 1.05], 12);
  h.plain.cone(0.07, 0.24, C.bronzeLight, 0, 1.56, 0.7, [Math.PI / 2, 0, 0], 6);
  for (let i = 0; i < 5; i++) h.plain.sphere(0.08 + (i === 2 ? 0.03 : 0), C.comb, 0, 1.82 + Math.sin((i / 4) * Math.PI) * 0.08, 0.26 + i * 0.08, [0.6, 1.2, 0.8], 8);
  h.plain.sphere(0.07, C.comb, 0, 1.42, 0.62, [0.7, 1.4, 0.6], 8);
  for (const s of [-1, 1]) h.glow.sphere(0.045, C.comb, s * 0.13, 1.64, 0.56, [1, 1, 0.6], 6);
  const tail = r.on('qTail').plain;
  for (let i = 0; i < 6; i++) {
    const a = -0.6 + i * 0.24;
    tail.box(0.08, 0.95, 0.14, i % 2 ? C.cream : C.rooster, Math.sin(a) * 0.18, 1.25 + Math.cos(a) * 0.15, -0.62, [-0.55, 0, a]);
  }
}

/** Gà đi nghênh ngang gật gù, thủ thì xòe cánh, mổ thì vươn cổ mổ xuống và vỗ cánh. */
function poseRooster(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  if (a.act === 'walk') {
    const ph = (a.phase ?? 0) * 0.9;
    const sw = Math.sin(ph);
    const st = (a.stride ?? 0.5) * 0.9;
    b.qBL.rotation.x = st * sw;
    b.qBR.rotation.x = -st * sw;
    b.qBody.position.y -= 0.5 * (1 - Math.cos(st * sw));
    b.qBody.rotation.z = 0.06 * sw;
    b.qNeck.rotation.x = 0.25 * Math.sin(ph * 2);
  } else if (a.act === 'fight') {
    const e = strikeCurve(a.strike, 0.2, 0.4);
    const open = 0.2 + 0.08 * Math.sin(t * 8) + 0.7 * e;
    b.qWingL.rotation.z = -open;
    b.qWingR.rotation.z = open;
    b.qBody.rotation.x = 0.25 * e;
    b.qNeck.rotation.x = -0.1 + 1.0 * e;
    b.qHead.rotation.x = 0.3 * e;
    b.qBL.rotation.x = -0.2;
    b.qBR.rotation.x = 0.2;
  } else if (a.act === 'dead') {
    const f = a.fall ?? 1;
    b.qBL.rotation.x = -0.5 * f;
    b.qBR.rotation.x = -0.8 * f;
    b.qNeck.rotation.x = 0.8 * f;
    b.qWingL.rotation.z = -0.8 * f;
  } else {
    b.qNeck.rotation.x = 0.1 * Math.sin(t * 1.7);
    b.qTail.rotation.z = 0.05 * Math.sin(t * 1.2);
  }
}

// ---------- Thú và người cưỡi trong trận ----------

export type BeastKind = 'voi' | 'chienXa' | 'daiTuong' | 'kyBinh' | 'trieuDa' | 'hoTinh' | 'gaTrang';
const KINDS: readonly FighterKind[] = ['voi', 'chienXa', 'daiTuong', 'kyBinh', 'trieuDa', 'hoTinh', 'gaTrang'];
export const isBeast = (k: FighterKind): k is BeastKind => KINDS.includes(k);

interface Spec {
  defs: Defs;
  draw(r: Rig, tier: number): void;
  pose(b: B, a: Act): void;
}

/** Người cưỡi trên lưng thú hay trên xe: gốc người cưỡi (giữa hai bàn chân) ở chỗ `at`, hông là con của `parent`. */
function riderSpec(mount: Defs, parent: string, at: V3, kind: RiderKind, seat: 'ride' | 'stand', drawMount: (r: Rig, tier: number) => void, poseMount: (b: B, a: Act, e: number) => void): Spec {
  return {
    defs: { ...BASE, ...mount, ...moveBones(HUMAN, parent, at) },
    draw: (r, tier) => {
      drawMount(r, tier);
      r.place(at, 1, () => drawRider(r as unknown as HumanRig, kind));
    },
    pose: (b, a) => {
      // Người cưỡi trước (đặt lại mọi xương), thú sau.
      poseRider(kind, b as unknown as Human, a, seat);
      poseMount(b, a, a.act === 'fight' ? strikeCurve(a.strike, 0.3, 0.5) : 0);
      if (b.wheelL && a.act === 'walk') b.wheelL.rotation.x = b.wheelR.rotation.x = (a.phase ?? 0) * 0.5;
    },
  };
}

const SPECS: Record<BeastKind, Spec> = {
  voi: riderSpec(ELEPHANT, 'qBody', [0, 0.86, -0.1], 'lacTuong', 'ride', drawElephant, poseElephant),
  chienXa: riderSpec(CHARIOT, 'cart', [0, 0.5, -0.2], 'anXa', 'stand', drawChariot, poseHorse),
  daiTuong: riderSpec(CHARIOT, 'cart', [0, 0.5, -0.2], 'daiTuong', 'stand', drawChariot, poseHorse),
  kyBinh: riderSpec(HORSE, 'qBody', [0, 0.92, -0.08], 'kyBinh', 'ride', (r) => drawHorse(r, C.horse, C.trieuRed), poseHorse),
  trieuDa: riderSpec(
    HORSE,
    'qBody',
    [0, 0.92, -0.08],
    'trieuDa',
    'ride',
    (r) => {
      drawHorse(r, C.horseBlack, C.trieuRed);
      // Tấm che trán ngựa bằng vàng.
      r.on('qHead').plain.box(0.08, 0.2, 0.3, C.gold, 0, 1.33, 0.72, [0.35, 0, 0]);
    },
    poseHorse,
  ),
  hoTinh: { defs: { ...BASE, ...TIGER }, draw: drawTiger, pose: poseTiger },
  gaTrang: { defs: { ...BASE, ...ROOSTER }, draw: drawRooster, pose: poseRooster },
};

/** Thú và người cưỡi trong trận: bớt số mặt cho nhẹ máy (xem `ShapeBuilder.detail`). */
const DETAIL = 0.75;

function shapeOf(spec: Spec, tier: number) {
  const r = new RigBuilder(spec.defs, DETAIL);
  spec.draw(r, tier);
  return r.build();
}

function rigged(spec: Spec, tier: number): THREE.Group {
  const { group, bones } = skinRig(shapeOf(spec, tier));
  const pose: Poser = (a) => spec.pose(bones, a);
  pose({ act: 'stand' });
  group.userData.pose = pose;
  // Thú ngã thì lăn nghiêng chứ không ngả ngửa.
  group.userData.fall = 'side';
  return group;
}

/** Thú có xương cho trận đánh. `tier`: bậc giáp voi đã rèn. */
export function makeBeast(kind: BeastKind, tier = 0): THREE.Group {
  return rigged(SPECS[kind], tier);
}

/** Thú bản tĩnh ở một tư thế, cho công trình. */
export function bakeBeast(kind: BeastKind, tier = 0, a: Act = { act: 'stand' }): THREE.Group {
  const spec = SPECS[kind];
  return bakeRig(shapeOf(spec, tier), (b) => spec.pose(b, a));
}

// ---------- Rùa Vàng ----------

const TURTLE: Defs = {
  ...BASE,
  qBody: { parent: 'base', at: [0, 0.05, 0] },
  qNeck: { parent: 'qBody', at: [0, 0.25, 0.62] },
  qHead: { parent: 'qNeck', at: [0, 0.58, 0.95] },
  qFL: { parent: 'qBody', at: [-0.55, 0.06, 0.45] },
  qFR: { parent: 'qBody', at: [0.55, 0.06, 0.45] },
  qBL: { parent: 'qBody', at: [-0.5, 0.05, -0.45] },
  qBR: { parent: 'qBody', at: [0.5, 0.05, -0.45] },
  qTail: { parent: 'qBody', at: [0, 0.06, -0.66] },
};

/**
 * Rùa Vàng (Thần Kim Quy — sứ Thanh Giang): mai vàng ròng chạm mặt trống đồng Đông Sơn & lục giác linh quy,
 * đỉnh mai khảm ngọc linh quang, đầu Long Quy ngóc cao có sừng vàng, mắt thần phát sáng, râu vàng và bốn chân chèo giương móng vuốt Kim Quy.
 * Gốc ở mặt nước (đáy mai), đầu hướng +z. Dài chừng 1,6.
 */
function drawTurtle(r: Rig): void {
  const body = r.on('qBody');
  const p = body.plain;
  const g = body.glow;
  const SHELL_GOLD = 0xf0c242;
  const SHELL_RIM = 0x8f6b1c;
  const TURTLE_SKIN = C.turtle;
  const TURTLE_DARK = 0x8f7d2e;
  const DIVINE_GLOW = 0xffe878;

  // 1. Yếm rùa (Plastron) dưới bụng & vành mai cuốn (Marginal rim) bè rộng
  p.cyl(0.56, 0.52, 0.07, SHELL_RIM, 0, 0.035, 0, undefined, 16);
  p.add(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), C.goldDark, 0, 0.04, 0, [0, 0, 0], [0.68, 0.14, 0.78]);
  // Vòm mai chính bằng vàng ròng
  p.add(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), C.gold, 0, 0.06, 0, [0, 0, 0], [0.62, 0.39, 0.72]);

  // 14 phiến giáp viền mai (Marginal scutes) chạm nổi chạy vòng quanh mép mai
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const sa = Math.sin(a);
    const ca = Math.cos(a);
    const rx = sa * 0.63;
    const rz = ca * 0.73;
    p.box(0.16, 0.055, 0.14, i % 2 === 0 ? SHELL_GOLD : C.goldDark, rx, 0.095, rz, [-ca * 0.22, a, sa * 0.22]);
    p.sphere(0.024, C.bronzeDark, rx * 0.96, 0.125, rz * 0.96, [1, 0.6, 1], 5);
  }
  // Vòm mai bảo vệ cổ (+z) và đuôi (-z)
  p.box(0.32, 0.06, 0.14, C.gold, 0, 0.14, 0.7, [-0.28, 0, 0]);
  p.box(0.24, 0.05, 0.12, C.goldDark, 0, 0.11, -0.71, [0.25, 0, 0]);

  // 8 múi giáp lục giác bên sườn mai (Costal scutes) + 3 múi sống lưng (Vertebral scutes)
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    const sa = Math.sin(a);
    const ca = Math.cos(a);
    const rx = sa * 0.46;
    const rz = ca * 0.54;
    p.cyl(0.11, 0.135, 0.045, C.goldDark, rx, 0.25, rz, [ca * 0.42, 0, -sa * 0.42], 6);
    p.cyl(0.075, 0.09, 0.05, SHELL_GOLD, rx * 0.98, 0.26, rz * 0.98, [ca * 0.42, 0, -sa * 0.42], 6);
  }
  for (const [z, y, sc] of [
    [0.42, 0.34, 1.0],
    [0.0, 0.41, 1.15],
    [-0.42, 0.34, 0.95],
  ] as const) {
    p.cyl(0.09 * sc, 0.12 * sc, 0.05, C.goldDark, 0, y, z, [z * 0.55, 0, 0], 6);
  }

  // 2. Tâm mai chạm Mặt Trống Đồng Đông Sơn & Bệ Ngọc Linh Quang Kim Quy trên đỉnh mai
  p.add(new THREE.CylinderGeometry(0.41, 0.44, 0.045, 20), C.goldDark, 0, 0.41, 0, [0, 0, 0], [1, 1, 1.14]);
  body.drum.add(new THREE.CylinderGeometry(0.38, 0.39, 0.045, 20), C.gold, 0, 0.435, 0, [0, 0, 0], [1, 1, 1.14]);
  // Bệ sen vàng & Viên Linh Châu Kim Quy tỏa sáng ở chính tâm mai + 4 linh vật góc mặt trống
  p.cyl(0.085, 0.11, 0.03, C.goldDark, 0, 0.462, 0, undefined, 8);
  g.sphere(0.065, DIVINE_GLOW, 0, 0.488, 0, [1, 0.68, 1], 8);
  for (const [dx, dz] of [
    [0, 0.33],
    [0, -0.33],
    [0.29, 0],
    [-0.29, 0],
  ] as const) {
    g.sphere(0.028, DIVINE_GLOW, dx, 0.46, dz, [1.1, 0.55, 1.1], 6);
  }

  // 3. Cổ Long Quy ('qNeck') vươn cao liền mạch từ cửa mai (0, 0.18, 0.62) lên đầu (0, 0.60, 0.98)
  const neck = r.on('qNeck').plain;
  const neckAng = 0.68;
  const caN = Math.cos(neckAng);
  const saN = Math.sin(neckAng);
  neck.cyl(0.13, 0.17, 0.56, TURTLE_SKIN, 0, 0.38, 0.79, [neckAng, 0, 0], 8);
  for (let i = 0; i < 4; i++) {
    const s = -0.15 + (i / 3) * 0.3;
    const ay = 0.38 + s * caN;
    const az = 0.79 + s * saN;
    // Đốt giáp yếm cổ bằng vàng ôm sát mặt trước cổ (+z, -y)
    neck.box(0.135 - i * 0.012, 0.048, 0.032, SHELL_GOLD, 0, ay - 0.115 * saN, az + 0.115 * caN, [neckAng, 0, 0]);
  }

  // 4. Đầu Thần Kim Quy ('qHead'): dáng Long Quy cổ đại, mỏ sừng vàng quặp, mắt thần phát sáng, mày rồng, sừng Kim Quy & râu thần
  const head = r.on('qHead');
  const h = head.plain;
  const hg = head.glow;
  // Sọ rùa thần & mũ giáp kim quy đỉnh đầu
  h.sphere(0.205, TURTLE_SKIN, 0, 0.64, 1.0, [1.0, 0.88, 1.16], 10);
  h.sphere(0.155, C.gold, 0, 0.72, 0.98, [0.92, 0.5, 1.06], 8);
  hg.sphere(0.035, DIVINE_GLOW, 0, 0.75, 1.09, [0.85, 0.65, 1.05], 6);
  // Mõm trên thuôn gọn & Mỏ sừng Kim Quy quặp xuống sắc bén ở chóp mũi (+z)
  h.sphere(0.12, TURTLE_SKIN, 0, 0.615, 1.13, [0.95, 0.72, 1.18], 8);
  h.cone(0.052, 0.1, SHELL_GOLD, 0, 0.585, 1.24, [Math.PI * 0.62, 0, 0], 5);
  h.sphere(0.095, TURTLE_DARK, 0, 0.555, 1.11, [0.9, 0.55, 1.15], 7);
  // Mắt thần rực sáng, mày rồng vàng uốn vút, sừng thái dương & râu thần
  for (const s of [-1, 1]) {
    h.sphere(0.044, C.ink, s * 0.128, 0.67, 1.11, [0.9, 1.05, 0.9], 6);
    hg.sphere(0.03, 0xffd24c, s * 0.14, 0.672, 1.126, [0.85, 0.95, 0.85], 6);
    // Chân mày rồng vàng uy nghiêm
    h.box(0.042, 0.03, 0.14, C.gold, s * 0.13, 0.72, 1.09, [-0.2, s * 0.25, -s * 0.28]);
    // Sừng Long Quy bằng vàng ròng vươn chéo lên và ra sau (-z)
    h.cyl(0.02, 0.038, 0.15, C.goldDark, s * 0.11, 0.76, 0.91, [-0.75, 0, -s * 0.26], 6);
    h.cone(0.022, 0.13, C.gold, s * 0.132, 0.82, 0.81, [-0.85, 0, -s * 0.3], 5);
    // Râu thần bằng vàng uốn rủ về phía sau dưới hàm
    h.cone(0.018, 0.15, C.gold, s * 0.08, 0.49, 1.12, [-Math.PI * 0.72, 0, -s * 0.2], 5);
  }
  // Chòm râu thần dưới cằm
  h.cone(0.022, 0.16, SHELL_GOLD, 0, 0.47, 1.11, [-Math.PI * 0.74, 0, 0], 5);

  // 5. Bốn chân chèo bọc vảy giáp vàng & Móng vuốt Kim Quy phát sáng (vật báu rèn lẫy Nỏ Thần)
  for (const [b, s] of [
    ['qFL', -1],
    ['qFR', 1],
  ] as const) {
    const leg = r.on(b);
    const f = leg.plain;
    const fg = leg.glow;
    // Bắp chân trước & bàn chân chèo lớn
    f.cyl(0.125, 0.09, 0.22, TURTLE_SKIN, s * 0.58, 0.07, 0.46, [0, -s * 0.25, s * 1.25], 7);
    f.box(0.42, 0.058, 0.22, TURTLE_SKIN, s * 0.74, 0.045, 0.48, [0.06, -s * 0.45, 0]);
    // 3 lớp vảy giáp vàng trên lưng chân chèo
    for (let k = 0; k < 3; k++) {
      f.box(0.11, 0.03, 0.16 - k * 0.02, k % 2 === 0 ? C.gold : C.goldDark, s * (0.62 + k * 0.1), 0.078 - k * 0.006, 0.49 - k * 0.02, [0.06, -s * 0.45, 0]);
    }
    // 3 móng vuốt Kim Quy bằng vàng sáng nằm ngang theo rìa chân chèo
    for (let c = 0; c < 3; c++) {
      const claw = new THREE.ConeGeometry(0.022, 0.11, 4);
      claw.rotateX(Math.PI / 2 + 0.12);
      claw.rotateY(s * (0.75 + c * 0.22));
      fg.add(claw, DIVINE_GLOW, s * (0.74 + c * 0.085), 0.04, 0.58 - c * 0.055);
    }
  }
  for (const [b, s] of [
    ['qBL', -1],
    ['qBR', 1],
  ] as const) {
    const leg = r.on(b);
    const f = leg.plain;
    const fg = leg.glow;
    f.cyl(0.1, 0.075, 0.18, TURTLE_SKIN, s * 0.52, 0.06, -0.45, [0, s * 0.3, s * 1.2], 6);
    f.box(0.32, 0.055, 0.18, TURTLE_SKIN, s * 0.64, 0.04, -0.5, [0.04, s * 0.48, 0]);
    f.box(0.2, 0.028, 0.13, C.goldDark, s * 0.6, 0.068, -0.49, [0.04, s * 0.48, 0]);
    for (let c = 0; c < 3; c++) {
      const claw = new THREE.ConeGeometry(0.018, 0.09, 4);
      claw.rotateX(Math.PI / 2 + 0.12);
      claw.rotateY(s * (2.15 + c * 0.2));
      fg.add(claw, DIVINE_GLOW, s * (0.68 + c * 0.065), 0.036, -0.56 - c * 0.04);
    }
  }

  // 6. Đuôi Linh Quy ('qTail') có gai vảy vàng
  const tail = r.on('qTail').plain;
  tail.cone(0.075, 0.28, TURTLE_SKIN, 0, 0.065, -0.82, [-Math.PI / 2 + 0.12, 0, 0], 6);
  for (let i = 0; i < 3; i++) {
    tail.cone(0.022 - i * 0.004, 0.055, C.gold, 0, 0.095 - i * 0.006, -0.74 - i * 0.065, [-0.35, 0, 0], 4);
  }
}

/** Rùa bơi (đi): chân trước chèo mạnh, chân sau đạp nhẹ, đầu nhấp nhô, đuôi vẫy. Đứng: chèo nhẹ giữ chỗ. */
function poseTurtle(b: B, a: Act): void {
  resetBones(b);
  const swim = a.act === 'walk';
  const ph = swim ? (a.phase ?? 0) : (a.time ?? 0) * 1.6;
  const amp = swim ? 1 : 0.35;
  for (const [k, s] of [
    ['qFL', -1],
    ['qFR', 1],
  ] as const) {
    b[k].rotation.set(0, s * 0.5 * amp * Math.sin(ph), s * 0.25 * amp * Math.cos(ph));
  }
  for (const [k, s] of [
    ['qBL', -1],
    ['qBR', 1],
  ] as const) {
    b[k].rotation.y = -s * 0.3 * amp * Math.sin(ph + Math.PI);
  }
  b.qNeck.rotation.x = 0.08 * Math.sin(ph * 2);
  b.qHead.rotation.x = -0.06 * Math.sin(ph * 2);
  b.qTail.rotation.y = 0.18 * amp * Math.sin(ph * 2);
}

/** Rùa Vàng có xương: `userData.pose` cho bơi (đi) hay nằm chèo nhẹ (đứng). */
export function makeRuaVang(): THREE.Group {
  const r = new RigBuilder(TURTLE);
  drawTurtle(r);
  const { group, bones } = skinRig(r.build());
  const pose: Poser = (a) => poseTurtle(bones, a);
  pose({ act: 'stand' });
  group.userData.pose = pose;
  return group;
}

/** Rùa Vàng bản tĩnh, cho công trình. */
export function bakeRuaVang(): THREE.Group {
  const r = new RigBuilder(TURTLE);
  drawTurtle(r);
  return bakeRig(r.build(), (b) => poseTurtle(b, { act: 'stand' }));
}

// ---------- Ngựa vua ----------

/** Ngựa vua to hơn ngựa kỵ binh: lông hồng (nâu đỏ), bờm đen. */
const K_ROYAL = 1.15;
const ROYAL_COAT = 0x9a5a2a;
/** Gốc thân người (giữa hai bàn chân khi đứng) của vua ngồi trước và Mỵ Châu ngồi sau, và cỡ thân mỗi người. */
const KING_AT: V3 = [0, 0.98, 0.24];
const K_KING = 1.1;
const PRINCESS_AT: V3 = [0.05, 0.97, -0.34];
const K_PRINCESS = 0.9;
/** Tiền tố xương của Mỵ Châu (khung xương người thứ hai trên cùng lưng ngựa). */
const MC = 'mc';
/** Áo đỏ hồng của công chúa, áo lông ngỗng trắng. */
const ROSE = 0xd0546a;
const GOOSE = 0xfaf6ec;
const GOOSE_SHADE = 0xe2dccb;
/** Chỗ treo hai vạt áo lông ngỗng (tọa độ thân người): sau gáy, và giữa lưng. */
const CAPE_TOP: V3 = [0, 0.57, -0.13];
const CAPE_MID: V3 = [0, 0.36, -0.17];

/** Đổi tên mọi xương người thêm tiền tố `pre`; xương cha ngoài thân người (lưng ngựa) giữ nguyên. */
function prefixBones(defs: Defs, pre: string): Defs {
  const out: Defs = {};
  for (const [k, d] of Object.entries(defs)) out[pre + k] = { parent: d.parent && d.parent in defs ? pre + d.parent : d.parent, at: d.at };
  return out;
}

/** Vẽ thân người thứ hai trong cùng khung xương: các hàm vẽ người (body.ts) gọi `on('hips')`... thành `on(pre + 'hips')`. */
function prefixRig(r: Rig, pre: string): HumanRig {
  const rig = {
    on: (b: string) => r.on(pre + b),
    local: (b: string, origin: V3, rot: V3 | null, draw: (s: RigSlots) => void) => r.local(pre + b, origin, rot, draw),
  };
  return rig as unknown as HumanRig;
}

/** Các xương người có tiền tố `pre`, gọi theo tên thường để dùng các tư thế chung (body.ts). */
function humanView(b: B, pre: string): Human {
  const out: Record<string, THREE.Bone> = {};
  for (const k of Object.keys(HUMAN)) out[k] = b[pre + k];
  return out as Human;
}

/** Điểm trên thân người (tọa độ thân) đặt ở `at`, cỡ `k`, ra tọa độ mô hình. */
const onBody = (at: V3, k: number, v: V3): V3 => [at[0] + v[0] * k, at[1] + v[1] * k, at[2] + v[2] * k];

const ROYAL_HORSE: Defs = {
  ...BASE,
  ...moveBones(HORSE, 'base', [0, 0, 0], K_ROYAL),
  ...moveBones(HUMAN, 'qBody', KING_AT, K_KING),
  ...prefixBones(moveBones(HUMAN, 'qBody', PRINCESS_AT, K_PRINCESS), MC),
  [MC + 'Cape']: { parent: MC + 'chest', at: onBody(PRINCESS_AT, K_PRINCESS, CAPE_TOP) },
  [MC + 'Cape2']: { parent: MC + 'Cape', at: onBody(PRINCESS_AT, K_PRINCESS, CAPE_MID) },
};

/** Ngựa vua: yên dài phủ vải đỏ hoa văn viền vàng cho hai người ngồi, cương vàng, chùm lông đỏ trên đầu, lục lạc đồng. */
function drawRoyalMount(r: Rig): void {
  r.place([0, 0, 0], K_ROYAL, () => {
    drawHorse(r, ROYAL_COAT, null);
    // Tấm phủ lưng đỏ hoa văn trùm như vòm trên lưng ngựa, mặt trống đồng hai bên sườn, tua vàng quanh mép.
    const body = r.on('qBody');
    const capTheta = Math.PI * 0.4;
    body.band.add(new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, capTheta), C.red, 0, 0.785, -0.04, [0, 0, 0], [0.28, 0.272, 0.37]);
    for (let i = 0; i < 12; i++) {
      const a = ((i + 0.5) / 12) * Math.PI * 2;
      const rim = Math.sin(capTheta);
      body.plain.cone(0.026, 0.07, C.gold, Math.sin(a) * 0.28 * rim, 0.785 + 0.272 * Math.cos(capTheta) - 0.03, -0.04 + Math.cos(a) * 0.37 * rim, [0, 0, Math.PI], 5);
    }
    for (const s of [-1, 1]) {
      body.drum.cyl(0.07, 0.07, 0.02, C.gold, s * 0.245, 0.935, -0.04, [0, 0, -s * (Math.PI / 2 - 0.57)], 12);
    }
    // Đai ngực đỏ có lục lạc đồng.
    const neck = r.on('qNeck');
    neck.plain.add(new THREE.TorusGeometry(0.15, 0.022, 5, 14), C.red, 0, 0.9, 0.36, [Math.PI / 2 - 0.5, 0, 0]);
    neck.plain.sphere(0.04, C.bronzeLight, 0, 0.8, 0.47, [1, 1, 1], 6);
    // Cương vàng quanh mõm, vành trán vàng, chùm lông đỏ.
    const head = r.on('qHead').plain;
    head.box(0.19, 0.035, 0.035, C.gold, 0, 1.36, 0.58, [0.35, 0, 0]);
    head.box(0.19, 0.03, 0.03, C.gold, 0, 1.2, 0.76, [0.35, 0, 0]);
    head.box(0.1, 0.12, 0.03, C.gold, 0, 1.36, 0.6, [0.35, 0, 0]);
    head.cone(0.05, 0.22, C.red, 0, 1.5, 0.48, [-0.3, 0, 0], 6);
    head.sphere(0.03, C.gold, 0, 1.4, 0.5, [1, 1, 1], 6);
  });
  // Dây cương từ hàm ngựa về tay vua.
  const reins = r.on('qNeck').plain;
  for (const s of [-1, 1]) reins.box(0.014, 0.014, 0.5, C.gold, s * 0.105, 1.4, 0.71, [0.12, -s * 0.06, 0]);
}

/** An Dương Vương cưỡi ngựa: hoàng bào đỏ, giáp ngực đồng chạm mặt trống, vương miện vàng, mũ lông chim, râu đen. */
function drawKingRider(h: HumanRig): void {
  humanBody(h, { legs: C.red, cloth: C.red, flaps: false, top: C.bronze, sleeves: C.red, belt: C.gold, armband: C.gold });
  const chest = h.on('chest');
  chest.band.cyl(0.155, 0.136, 0.22, C.bronze, 0, 0.485, 0, undefined, 12);
  chest.plain.cyl(0.118, 0.132, 0.034, C.gold, 0, 0.58, 0, undefined, 12);
  chest.drum.cyl(0.07, 0.07, 0.022, C.gold, 0, 0.495, 0.137, [Math.PI / 2, 0, 0], 14);
  for (const s of [-1, 1]) chest.plain.sphere(0.085, C.bronzeLight, s * 0.18, 0.57, 0, [1.1, 0.75, 1.05], 8);
  humanHead(h, { brows: true, mustache: C.hair });
  hairCap(h);
  const head = h.on('head');
  head.plain.cone(0.055, 0.13, C.hair, 0, 0.62, 0.16, [Math.PI + 0.28, 0, 0], 6);
  head.band.cyl(0.228, 0.232, 0.062, C.gold, 0, 0.835, -0.03, undefined, 16);
  head.plain.box(0.075, 0.075, 0.032, C.gold, 0, 0.85, 0.198, [0, 0, Math.PI / 4]);
  head.plain.sphere(0.026, C.red, 0, 0.85, 0.215, [1, 1.2, 0.6], 7);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    head.plain.cone(0.026, i % 2 === 0 ? 0.085 : 0.058, C.gold, Math.sin(a) * 0.222, 0.89, Math.cos(a) * 0.222 - 0.03, undefined, 4);
  }
  featherCrown(h, [C.red, C.gold, C.cream, C.ember], { count: 9, len: 0.42, spread: 0.23 });
}

/**
 * Mỵ Châu ngồi sau: tóc đen dài xõa lưng cài trâm vàng, áo đỏ hồng, kiềng vàng, áo lông ngỗng trắng khoác vai
 * (cổ áo lông xù và hai vạt lông xếp lớp, gắn hai xương để bay phần phật khi ngựa phi). Vẽ như đứng ở gốc.
 */
function drawMyChau(r: Rig): void {
  const h = prefixRig(r, MC);
  humanBody(h, { legs: ROSE, cloth: ROSE, flaps: false, top: ROSE, sleeves: ROSE, belt: C.gold, armband: C.gold });
  const chest = h.on('chest').plain;
  chest.add(new THREE.TorusGeometry(0.075, 0.016, 5, 14), C.gold, 0, 0.575, 0.03, [Math.PI / 2 + 0.25, 0, 0]);
  // Cổ áo lông ngỗng xù quanh vai.
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    chest.sphere(0.06, i % 2 ? GOOSE_SHADE : GOOSE, Math.cos(a) * 0.15, 0.585, -Math.sin(a) * 0.12 + 0.01, [1.3, 0.7, 1], 6);
  }
  humanHead(h);
  hairCap(h);
  const head = h.on('head').plain;
  // Tóc dài xõa sau lưng, tóc mai hai bên má, búi tóc cài trâm vàng, vành vàng trên trán.
  head.sphere(0.18, C.hair, 0, 0.6, -0.15, [1, 1.45, 0.5], 9);
  for (const s of [-1, 1]) head.box(0.05, 0.22, 0.09, C.hair, s * 0.19, 0.7, 0.04, [0, 0, -s * 0.12]);
  head.sphere(0.07, C.hair, 0, 0.98, -0.1, [1, 0.85, 1], 7);
  head.cyl(0.01, 0.01, 0.22, C.gold, 0, 0.99, -0.1, [0, 0, Math.PI / 2 - 0.3], 5);
  head.sphere(0.025, C.red, 0.1, 1.02, -0.1, [1, 1, 1], 6);
  head.cyl(0.222, 0.226, 0.022, C.gold, 0, 0.84, -0.03, undefined, 14);
  // Áo lông ngỗng: mỗi vạt một tấm lót trắng, ngoài phủ lông xếp lớp như vảy (lông trắng xen lông ngà, hàng sau so le
  // hàng trước); vạt dưới rộng hơn, mép dưới lông dài lởm chởm.
  for (const [bone, top, bottom, w0, w1] of [
    [MC + 'Cape', CAPE_TOP, CAPE_MID[1] - 0.02, 0.34, 0.4],
    [MC + 'Cape2', CAPE_MID, 0.1, 0.4, 0.5],
  ] as const) {
    const p = r.on(bone).plain;
    const h = top[1] - bottom;
    p.box((w0 + w1) / 2, h, 0.025, GOOSE_SHADE, 0, top[1] - h / 2, top[2] - 0.01);
    const rows = Math.round(h / 0.06);
    for (let row = 0; row < rows; row++) {
      const k = (row + 0.5) / rows;
      const y = top[1] - k * h;
      const half = lerp(w0, w1, k) / 2;
      const n = 5;
      for (let i = 0; i < n; i++) {
        const x = lerp(-half, half, (i + (row % 2 ? 0.75 : 0.25)) / n);
        const tip = bone === MC + 'Cape2' && row === rows - 1;
        p.sphere(0.05, (row + i) % 2 ? GOOSE : GOOSE_SHADE, x, y - (tip ? 0.03 : 0), top[2] - 0.03 - row * 0.004, [1.05, tip ? 2.2 : 1.6, 0.32], 6);
      }
    }
  }
}

/**
 * Ngựa phi nước đại: hai chân trước cùng vươn, hai chân sau cùng đạp, lệch nhau chút; thân bổng lên rồi chồm xuống,
 * cổ gật ngược thân, đuôi bay ra sau. Trả về sin pha.
 */
function gallop(b: B, phase: number, stride: number): number {
  const st = stride * 1.5;
  const s = Math.sin(phase);
  b.qFL.rotation.x = -st * s;
  b.qFR.rotation.x = -st * Math.sin(phase - 0.45);
  b.qBL.rotation.x = st * Math.sin(phase - 0.2);
  b.qBR.rotation.x = st * Math.sin(phase - 0.65);
  b.qBody.position.y += 0.05 * s - HORSE_LEG * K_ROYAL * (1 - Math.cos(st)) * 0.5;
  b.qBody.rotation.x = 0.09 * Math.sin(phase + 1.2);
  b.qNeck.rotation.x = -0.14 * Math.sin(phase + 1.2) - 0.1;
  b.qTail.rotation.x = 0.55 + 0.12 * Math.sin(phase * 2);
  return s;
}

/** Ngựa vua phi (đi) hay đứng chờ; vua cầm cương, Mỵ Châu ôm lưng vua, áo lông ngỗng bay theo gió. */
function poseRoyalHorse(b: B, a: Act): void {
  resetBones(b);
  const king = humanView(b, '');
  const princess = humanView(b, MC);
  const t = a.time ?? 0;
  beginPose(king, t);
  beginPose(princess, t);
  const run = a.act === 'walk';
  const ph = a.phase ?? 0;
  const sw = run ? gallop(b, ph, a.stride ?? 0.5) : 0;
  if (!run) poseHorse(b, { act: 'stand', time: t }, 0);
  // Vua: hai tay cầm cương trước bụng, ngả người tới trước khi phi.
  king.chest.rotation.x = run ? 0.14 + 0.04 * sw : 0.03;
  king.armL.rotation.set(-1.0 + 0.06 * sw, 0, 0.12);
  king.armR.rotation.set(-1.0 + 0.06 * sw, 0, -0.12);
  // Mỵ Châu: hai tay ôm lưng vua, nghiêng người ló ra sau vai vua, ngoái đầu nhìn sang bên.
  princess.chest.rotation.set(run ? 0.3 + 0.04 * sw : 0.2, 0, -0.14);
  princess.armL.rotation.set(-1.3, 0, 0.22);
  princess.armR.rotation.set(-1.3, 0, -0.22);
  princess.head.rotation.set(-0.05, 0.45, 0);
  for (const [k, x] of [
    ['legL', -1],
    ['legR', 1],
  ] as const) {
    king[k].rotation.set(-0.4, 0, x * 0.85);
    princess[k].rotation.set(-0.4, 0, x * 0.85);
  }
  // Áo lông ngỗng: vạt trên phủ vai, vạt dưới bay phần phật ra sau khi phi; đứng thì buông rủ xuống lưng ngựa.
  const wave = run ? ph * 2 : t * 1.5;
  const amp = run ? 1 : 0.3;
  b[MC + 'Cape'].rotation.x = (run ? 0.5 : 0.3) + 0.06 * amp * Math.sin(wave);
  b[MC + 'Cape2'].rotation.x = (run ? 0.55 : 0.15) + 0.2 * amp * Math.sin(wave - 1.0);
}

/**
 * Ngựa vua chở An Dương Vương ngồi trước, Mỵ Châu ngồi sau (cảnh màn 32, vua chạy ra biển): chỉ là cảnh, không đánh.
 * `userData.pose({ act: 'walk', phase, stride })` là phi nước đại; `stand` là đứng chờ.
 */
export function makeRoyalHorse(): THREE.Group {
  const r = new RigBuilder(ROYAL_HORSE, DETAIL);
  drawRoyalMount(r);
  r.place(KING_AT, K_KING, () => drawKingRider(r as unknown as HumanRig));
  r.place(PRINCESS_AT, K_PRINCESS, () => drawMyChau(r));
  const { group, bones } = skinRig(r.build());
  const pose: Poser = (a) => poseRoyalHorse(bones, a);
  pose({ act: 'stand' });
  group.userData.pose = pose;
  return group;
}
