// Thú có khung xương (rig.ts) và người cưỡi (soldier.ts): voi chiến có Lạc tướng cưỡi, chiến xa và đại tướng Ân,
// kỵ binh Triệu, Triệu Đà, hổ tinh, gà trắng nghìn năm, Rùa Vàng. Gốc là mặt đất dưới thú, đầu hướng +z.
// Thú bốn chân đi theo nhịp chéo (chân trước trái cùng chân sau phải); ngã thì lăn nghiêng (`userData.fall`).

import * as THREE from 'three';
import type { FighterKind } from '../game/battle';
import { HUMAN, strikeCurve, type Human, type HumanRig } from './body';
import { C } from './palette';
import { RigBuilder, bakeRig, moveBones, resetBones, skinRig, type Act, type BoneDef, type Bones, type Poser } from './rig';
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

function shapeOf(spec: Spec, tier: number) {
  const r = new RigBuilder(spec.defs);
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
 * Rùa Vàng, sứ Thanh Giang: mai vàng như mặt trống đồng có ngôi sao giữa, đầu ngóc cao, bốn chân chèo.
 * Gốc ở mặt nước (đáy mai), đầu hướng +z. Dài chừng 1,6.
 */
function drawTurtle(r: Rig): void {
  const body = r.on('qBody');
  const p = body.plain;
  p.add(new THREE.SphereGeometry(1, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), C.gold, 0, 0.05, 0, [0, 0, 0], [0.62, 0.38, 0.72]);
  p.cyl(0.66, 0.7, 0.1, C.goldDark, 0, 0.05, 0, undefined, 18);
  body.drum.add(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 20), C.gold, 0, 0.42, 0, [0, 0, 0], [1, 1, 1.15]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.box(0.16, 0.04, 0.16, C.goldDark, Math.sin(a) * 0.5, 0.26, Math.cos(a) * 0.58, [0, a, 0.5]);
  }
  r.on('qNeck').plain.cyl(0.13, 0.16, 0.55, C.turtle, 0, 0.36, 0.8, [-0.8, 0, 0], 8);
  const h = r.on('qHead').plain;
  h.sphere(0.22, C.turtle, 0, 0.64, 1.02, [1, 0.9, 1.15], 10);
  for (const s of [-1, 1]) h.sphere(0.045, C.ink, s * 0.11, 0.7, 1.18, [1, 1.3, 0.6], 6);
  for (const [b, s] of [
    ['qFL', -1],
    ['qFR', 1],
  ] as const) {
    const f = r.on(b).plain;
    f.cyl(0.13, 0.08, 0.06, C.turtle, s * 0.62, 0.06, 0.45, [0, 0, s * 1.2], 6);
    f.box(0.42, 0.05, 0.2, C.turtle, s * 0.7, 0.04, 0.5, [0, -s * 0.5, 0]);
  }
  for (const [b, s] of [
    ['qBL', -1],
    ['qBR', 1],
  ] as const) {
    r.on(b).plain.box(0.3, 0.05, 0.16, C.turtle, s * 0.6, 0.04, -0.5, [0, s * 0.5, 0]);
  }
  r.on('qTail').plain.cone(0.07, 0.25, C.turtle, 0, 0.06, -0.82, [-Math.PI / 2, 0, 0], 6);
}

/** Rùa bơi (đi): chân trước chèo mạnh, chân sau đạp nhẹ, đầu nhấp nhô. Đứng: chèo nhẹ giữ chỗ. */
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
