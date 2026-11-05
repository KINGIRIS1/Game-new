// Thú có khung xương (rig.ts) và người cưỡi (soldier.ts): voi chiến có Lạc tướng cưỡi, chiến xa và đại tướng Ân,
// kỵ binh Triệu, Triệu Đà, Mã Viện cưỡi ngựa trắng, hổ tinh, gà trắng nghìn năm, Rùa Vàng, ngựa vua chở An Dương
// Vương và Mỵ Châu, voi trận của Hai Bà Trưng (người cưỡi dựng ở heroes.ts).
// Gốc là mặt đất dưới thú, đầu hướng +z.
// Thú bốn chân đi theo nhịp chéo (chân trước trái cùng chân sau phải); ngã thì lăn nghiêng (`userData.fall`).

import * as THREE from 'three';
import type { FighterKind } from '../game/battle';
import { HUMAN, beginPose, featherCrown, hairCap, headband, humanBody, humanHead, lerp, strikeCurve, type Human, type HumanRig } from './body';
import { Clay, ellipsoid } from './nan';
import { armor, bun, chestDisc, diadem, hairDown, necklace, pauldrons } from './nanDo';
import { clayPiece, figure, type Piece } from './nanNguoi';
import { elephantBody, elephantDrape, horseBody, horseDrape, roosterBody, tigerBody, turtleBody, turtleDrum } from './nanThu';
import { C } from './palette';
import { RigBuilder, bakeRig, moveBones, resetBones, skinRig, type Act, type BoneDef, type Bones, type Poser, type RigSlot, type RigSlots } from './rig';
import { drawRider, poseRider, riderBones, riderHasSkill, type RiderKind } from './soldier';
import { IRON, IRON_DARK, coLac } from './weapons';

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
  qFL: { parent: 'qBody', at: [-0.14, 0.62, 0.32] },
  qFR: { parent: 'qBody', at: [0.14, 0.62, 0.32] },
  qBL: { parent: 'qBody', at: [-0.14, 0.62, -0.32] },
  qBR: { parent: 'qBody', at: [0.14, 0.62, -0.32] },
  qNeck: { parent: 'qBody', at: [0, 0.86, 0.34] },
  qHead: { parent: 'qNeck', at: [0, 1.24, 0.66] },
  qTail: { parent: 'qBody', at: [0, 0.9, -0.42] },
};
const HORSE_LEG = 0.62;

/** Ngựa màu `color`, đệm yên `saddle` (không có thì ngựa kéo xe), bờm và đuôi màu `mane`. */
function drawHorse(r: Rig, color: number, saddle: number | null, mane: number = C.ink): void {
  horseBody(r, { coat: color, mane });
  if (saddle) horseDrape(r, { color: saddle, z0: -0.22, z1: 0.16, half: 0.95, pattern: true });
}

/**
 * Ngựa trắng của Mã Viện: bờm, đuôi xám bạc, đệm yên đỏ son, vạt yên đỏ son viền vàng buông hai bên sườn, tấm che
 * trán đồng đỏ, dây cương đồng, chùm tua đỏ đeo dưới cổ.
 */
function drawWhiteHorse(r: Rig): void {
  drawHorse(r, C.horseWhite, C.hanRed, C.horseWhiteMane);
  const head = r.on('qHead').plain;
  head.box(0.08, 0.2, 0.3, C.copper, 0, 1.28, 0.76, [0.42, 0, 0]);
  head.box(0.19, 0.035, 0.05, C.copperDark, 0, 1.22, 0.76, [0.42, 0, 0]);
  const neck = r.on('qNeck').plain;
  neck.sphere(0.04, C.gold, 0, 0.98, 0.56, [1, 1, 1], 6);
  neck.cone(0.075, 0.2, C.hanRed, 0, 0.86, 0.57, [Math.PI, 0, 0], 7);
  const body = r.on('qBody').plain;
  for (const sx of [-1, 1]) {
    body.box(0.025, 0.2, 0.4, C.hanRed, sx * 0.255, 0.9, -0.04, [0, 0, sx * 0.3]);
    body.box(0.03, 0.03, 0.41, C.gold, sx * 0.285, 0.805, -0.04, [0, 0, sx * 0.3]);
  }
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
 * bành gỗ quây quanh chỗ ngồi và lọng đỏ; bậc 3 giáp trán đồng vàng có núm mặt trời, chuông đồng đeo cổ, lọng hai
 * tầng có chóp vàng.
 */
function drawElephant(r: Rig, tier: number, look: { pad?: number | null; tusks?: boolean } = {}): void {
  const body = r.on('qBody');
  const p = body.plain;
  elephantBody(r, { skin: C.elephant });
  // Voi trận (`makeVoiTran`) tự vẽ đệm và ngà riêng.
  if (look.pad !== null) elephantDrape(r, { color: look.pad ?? C.red, z0: -0.4, z1: 0.32, half: 1.0, pattern: true });
  const head = r.on('qHead').plain;
  if (look.tusks !== false) for (const s of [-1, 1]) head.cone(0.03, 0.26, C.cream, s * 0.1, 0.72, 0.68, [1.2, 0, 0], 5);
  if (tier >= 1) {
    head.box(0.34, 0.26, 0.05, tier >= 3 ? C.gold : IRON, 0, 1.02, 0.7, [-0.35, 0, 0]);
    head.box(0.36, 0.04, 0.06, tier >= 3 ? C.bronzeDark : C.bronze, 0, 1.15, 0.66, [-0.35, 0, 0]);
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
  if (tier >= 3) {
    // Núm mặt trời giữa giáp trán vàng; chuông đồng đeo cổ; lọng thêm tầng trên chóp vàng, viền tầng dưới vàng.
    head.sphere(0.05, C.bronzeLight, 0, 1.03, 0.72, [1, 1, 0.5], 8);
    for (const s of [-1, 1]) head.sphere(0.05, C.gold, s * 0.16, 0.7, 0.55, [1, 1.15, 1], 6);
    p.cyl(0.43, 0.43, 0.045, C.gold, 0, 2.45, -0.35, undefined, 12);
    body.band.cone(0.24, 0.16, C.red, 0, 2.72, -0.35, undefined, 10);
    p.cone(0.06, 0.16, C.gold, 0, 2.86, -0.35, undefined, 6);
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

// ---------- Voi trận của Hai Bà ----------

/** Voi trận to hơn voi chiến một phần ba. */
export const K_VOI_TRAN = 4 / 3;
/** Mặt nệm trong bành (tọa độ voi chưa phóng): người cưỡi ngồi lên đây. */
const CUSHION_TOP = 1.165;
/** Chân cán lọng ngay sau thành sau của bành, và tâm tán lọng (tọa độ voi chưa phóng). */
const PARASOL_FOOT: V3 = [0, 1.08, -0.43];
const PARASOL_TOP = 2.58;
/** Chỗ tay nắm cán cờ cắm ở góc sau bên phải bành (tọa độ mô hình); cán ngả ra ngoài cho khỏi vướng lọng. */
const FLAG_SOCKET: V3 = [0.38, 1.75, -0.56];
const FLAG_TILT: V3 = [-0.12, 0, -0.42];

/** Gốc thân người cưỡi (giữa hai bàn chân khi đứng) cỡ `k`: hông vừa chạm nệm bành. */
export function voiTranSeat(k: number): V3 {
  return [0, CUSHION_TOP * K_VOI_TRAN - 0.2 * k, -0.12 * K_VOI_TRAN];
}

const VOI_TRAN: Defs = {
  ...BASE,
  ...moveBones(ELEPHANT, 'base', [0, 0, 0], K_VOI_TRAN),
  qFlag: { parent: 'qBody', at: FLAG_SOCKET },
};

/** Voi trận: màu đệm, viền, lọng; có mặt trống đồng hai bên đệm hay không; có cờ chim Lạc sau bành hay không. */
export interface VoiTranLook {
  /** Đệm phủ lưng voi. */
  pad: number;
  /** Viền đệm, tua, nệm bành, vành lọng. */
  trim: number;
  /** Mặt trống đồng hai bên đệm. */
  drum?: boolean;
  /** Tán lọng. */
  parasol: number;
  /** Cờ chim Lạc cắm sau bành: cỡ cờ (bằng cỡ người cưỡi); bỏ trống là không có cờ. */
  flag?: number;
}

/** Voi làm gì thêm, do người cưỡi định theo động tác của mình (kỹ năng, thắng trận). Mỗi số 0..1. */
export interface VoiTranMood {
  /** Dậm chân, giơ vòi theo đòn đánh; bỏ trống thì theo `strike` của người cưỡi. */
  strike?: number;
  /** Giơ vòi rống. */
  trumpet?: number;
  /** Chồm hai chân trước. */
  rear?: number;
  /** Lao tới: sức lao, và pha bước (`chargePhase`). */
  charge?: number;
  chargePhase?: number;
}

/** Người cưỡi voi trận: xương thêm, hình vẽ, và tư thế (gọi trước voi, trả về voi làm gì thêm). */
export interface VoiTranRider {
  defs: Defs;
  draw(r: Rig): void;
  pose(b: B, a: Act): VoiTranMood;
}

/**
 * Voi trận: đệm vòm phủ lưng viền tua, mặt trống đồng hai bên (`drum`), bành gỗ dải hoa văn nẹp đồng có nệm, ngà dài
 * bọc đồng bịt mũi đồng, giáp trán đồng núm vàng có chùm lông đỏ, vòng đồng cổ chân, lọng hai tầng chóp vàng cắm sau
 * bành, và cờ chim Lạc ở góc sau bên phải (`flag`).
 */
function drawVoiTran(r: Rig, look: VoiTranLook): void {
  r.place([0, 0, 0], K_VOI_TRAN, () => {
    drawElephant(r, 0, { pad: null, tusks: false });
    const body = r.on('qBody');
    const p = body.plain;
    // Đệm vòm trùm lưng như tấm phủ ngựa vua, viền và tua quanh mép.
    const cap = Math.PI * 0.42;
    const pad: V3 = [0.374, 0.352, 0.53];
    const padY = 0.72;
    const padZ = -0.03;
    body.band.add(new THREE.SphereGeometry(1, 18, 7, 0, Math.PI * 2, 0, cap), look.pad, 0, padY, padZ, [0, 0, 0], pad);
    const rimY = padY + pad[1] * Math.cos(cap);
    const rx = pad[0] * Math.sin(cap);
    const rz = pad[2] * Math.sin(cap);
    p.add(new THREE.TorusGeometry(1, 0.035, 5, 24), look.trim, 0, rimY, padZ, [Math.PI / 2, 0, 0], [rx, rz, 1]);
    for (let i = 0; i < 16; i++) {
      const a = ((i + 0.5) / 16) * Math.PI * 2;
      p.cone(0.03, 0.09, look.trim, Math.sin(a) * rx, rimY - 0.05, padZ + Math.cos(a) * rz, [Math.PI, 0, 0], 5);
    }
    if (look.drum) {
      const th = Math.PI * 0.3;
      const tilt = Math.atan2(Math.sin(th) / pad[0], Math.cos(th) / pad[1]);
      for (const s of [-1, 1]) {
        const x = s * (pad[0] * Math.sin(th) + 0.012);
        const y = padY + pad[1] * Math.cos(th) + 0.01;
        body.drum.cyl(0.13, 0.13, 0.024, C.gold, x, y, padZ, [0, 0, -s * tilt], 16);
        p.cyl(0.148, 0.148, 0.014, C.bronzeDark, x, y, padZ, [0, 0, -s * tilt], 16);
      }
    }
    // Bành gỗ: sàn, thành hai bên và trước thấp, thành sau cao, cột góc bịt đồng, nệm.
    p.box(0.5, 0.05, 0.6, C.woodDark, 0, 1.09, -0.1);
    for (const s of [-1, 1]) {
      body.band.box(0.035, 0.12, 0.6, C.woodLight, s * 0.25, 1.17, -0.1);
      p.box(0.045, 0.025, 0.62, C.bronze, s * 0.25, 1.235, -0.1);
    }
    body.band.box(0.5, 0.08, 0.035, C.woodLight, 0, 1.15, 0.2);
    p.box(0.52, 0.025, 0.045, C.bronze, 0, 1.195, 0.2);
    body.band.box(0.5, 0.18, 0.035, C.woodLight, 0, 1.2, -0.4);
    p.box(0.52, 0.025, 0.045, C.bronze, 0, 1.295, -0.4);
    for (const [x, z, h] of [
      [-0.25, 0.2, 0.15],
      [0.25, 0.2, 0.15],
      [-0.25, -0.4, 0.25],
      [0.25, -0.4, 0.25],
    ] as const) {
      p.cyl(0.026, 0.026, h, C.woodDark, x, 1.09 + h / 2, z, undefined, 6);
      p.sphere(0.034, C.bronzeLight, x, 1.09 + h, z, [1, 1, 1], 6);
    }
    p.box(0.42, 0.05, 0.5, look.trim, 0, CUSHION_TOP - 0.025, -0.08);
    // Ngà dài bọc đồng: khâu đồng ở gốc, dải đồng hoa văn, vòng đồng, mũi bịt đồng nhọn.
    for (const s of [-1, 1]) {
      r.local('qHead', [s * 0.115, 0.6, 0.6], [1.3, 0, -s * 0.12], (t) => {
        t.plain.cone(0.05, 0.5, C.cream, 0, 0.25, 0, undefined, 7);
        t.plain.cyl(0.06, 0.062, 0.09, C.bronze, 0, 0.045, 0, undefined, 8);
        t.band.cyl(0.042, 0.05, 0.1, C.bronze, 0, 0.16, 0, undefined, 8);
        t.plain.cyl(0.033, 0.033, 0.022, C.bronzeLight, 0, 0.3, 0, undefined, 6);
        t.plain.cone(0.02, 0.15, C.bronzeLight, 0, 0.46, 0, undefined, 6);
      });
    }
    // Giáp trán đồng có núm vàng và chùm lông đỏ.
    const head = r.on('qHead');
    head.band.box(0.3, 0.26, 0.05, C.bronze, 0, 1.02, 0.7, [-0.35, 0, 0]);
    head.plain.box(0.32, 0.035, 0.06, C.gold, 0, 1.15, 0.66, [-0.35, 0, 0]);
    head.plain.sphere(0.05, C.gold, 0, 1.03, 0.725, [1, 1, 0.55], 8);
    head.plain.cone(0.05, 0.2, C.red, 0, 1.24, 0.6, [-0.25, 0, 0], 6);
    // Vòng đồng cổ chân.
    for (const [b, x, z] of [
      ['qFL', -0.2, 0.28],
      ['qFR', 0.2, 0.28],
      ['qBL', -0.2, -0.28],
      ['qBR', 0.2, -0.28],
    ] as const) {
      r.on(b).band.cyl(0.125, 0.13, 0.07, C.bronze, x, 0.14, z, undefined, 10);
    }
    // Lọng hai tầng cắm sau thành sau: cán gỗ kẹp đồng, tán dưới viền, tán trên, chóp vàng, tua rủ quanh vành.
    const [px, py, pz] = PARASOL_FOOT;
    p.cyl(0.022, 0.022, PARASOL_TOP - py, C.woodDark, px, (py + PARASOL_TOP) / 2, pz, undefined, 6);
    p.cyl(0.036, 0.036, 0.1, C.bronze, px, 1.25, pz, undefined, 6);
    body.band.cone(0.5, 0.2, look.parasol, px, PARASOL_TOP, pz, undefined, 14);
    p.cyl(0.51, 0.51, 0.045, look.trim, px, PARASOL_TOP - 0.1, pz, undefined, 14);
    body.band.cone(0.27, 0.16, look.parasol, px, PARASOL_TOP + 0.15, pz, undefined, 12);
    p.cyl(0.28, 0.28, 0.03, look.trim, px, PARASOL_TOP + 0.07, pz, undefined, 12);
    p.sphere(0.045, C.gold, px, PARASOL_TOP + 0.25, pz, [1, 1, 1], 7);
    p.cone(0.05, 0.16, C.gold, px, PARASOL_TOP + 0.34, pz, undefined, 6);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      p.box(0.03, 0.14, 0.03, look.trim, px + Math.sin(a) * 0.49, PARASOL_TOP - 0.19, pz + Math.cos(a) * 0.49);
    }
  });
  if (look.flag) {
    const k = look.flag;
    r.place(FLAG_SOCKET, k, () => r.local('qFlag', [0, 0, 0], FLAG_TILT, coLac));
    // Ống đồng giữ chân cán cờ, buộc vào cột góc bành.
    r.place(FLAG_SOCKET, k, () => r.local('qBody', [0, 0, 0], FLAG_TILT, (s) => s.plain.cyl(0.034, 0.034, 0.2, C.bronze, 0, -0.14, 0, undefined, 6)));
  }
}

/**
 * Voi trận đi chậm, vòi đung đưa, tai quạt; dậm chân giơ vòi theo đòn đánh. Người cưỡi định thêm (`m`): giơ vòi rống,
 * chồm hai chân trước (xoay quanh hông sau, chân sau vẫn chạm đất), lao tới.
 */
function poseVoiTran(b: B, a: Act, m: VoiTranMood): void {
  const t = a.time ?? 0;
  const K = K_VOI_TRAN;
  const trumpet = m.trumpet ?? 0;
  const flap = 0.15 + 0.15 * Math.sin(t * 2.4) + 0.5 * trumpet;
  b.qEarL.rotation.y = flap;
  b.qEarR.rotation.y = -flap;
  b.qFlag.rotation.set(0.05 * Math.sin(t * 1.9), 0, 0.04 * Math.sin(t * 1.3));
  if (a.act === 'dead') {
    const f = a.fall ?? 1;
    quadFall(b, f);
    b.qTrunk.rotation.x = 0.3 * f;
    return;
  }
  const charge = m.charge ?? 0;
  if (charge > 0) {
    const sw = quadWalk(b, m.chargePhase ?? 0, 0.55 * charge, 0.5 * K);
    b.qBody.rotation.set(0.08 * charge, 0, 0.03 * sw);
    b.qHead.rotation.x = 0.18 * charge;
    b.qTrunk.rotation.x = -0.75 * charge + 0.12 * sw;
    b.qTrunk2.rotation.x = -0.6 * charge;
    b.qTail.rotation.x = 0.6 * charge;
  } else if (a.act === 'walk') {
    const ph = (a.phase ?? 0) * 0.55;
    const sw = quadWalk(b, ph, (a.stride ?? 0.5) * 0.5, 0.5 * K);
    b.qBody.rotation.z = 0.03 * sw;
    b.qTrunk.rotation.x = 0.15 * sw;
    b.qTrunk2.rotation.x = 0.25 * Math.sin(ph - 0.8);
    b.qTail.rotation.z = 0.2 * sw;
  } else {
    const e = m.strike ?? (a.act === 'fight' ? strikeCurve(a.strike, 0.3, 0.5) : 0);
    b.qTrunk.rotation.x = 0.08 * Math.sin(t * 1.3) - 1.0 * e;
    b.qTrunk2.rotation.x = 0.12 * Math.sin(t * 1.3 - 0.7) - 1.2 * e;
    b.qHead.rotation.x = -0.2 * e;
    b.qFL.rotation.x = b.qFR.rotation.x = -0.35 * e;
    b.qBody.rotation.x = -0.1 * e;
    b.qTail.rotation.z = 0.1 * Math.sin(t * 2);
  }
  if (trumpet > 0) {
    b.qTrunk.rotation.x = lerp(b.qTrunk.rotation.x, -2.25 + 0.06 * Math.sin(t * 9), trumpet);
    b.qTrunk2.rotation.x = lerp(b.qTrunk2.rotation.x, -0.85, trumpet);
    b.qHead.rotation.x = lerp(b.qHead.rotation.x, -0.3, trumpet);
  }
  const rear = m.rear ?? 0;
  if (rear > 0) {
    // Ngả thân lên quanh hông sau (so với khớp thân: thấp hơn 0,22, lùi 0,28), dời thân bù cho hông sau đứng yên.
    const ang = 0.4 * rear;
    const hy = -0.22 * K;
    const hz = -0.28 * K;
    b.qBody.rotation.x -= ang;
    b.qBody.position.y += hy * (1 - Math.cos(ang)) - hz * Math.sin(ang);
    b.qBody.position.z += hz * (1 - Math.cos(ang)) + hy * Math.sin(ang);
    b.qBL.rotation.x = b.qBR.rotation.x = ang;
    b.qFL.rotation.x = -1.0 * rear;
    b.qFR.rotation.x = -0.7 * rear;
  }
}

/**
 * Voi trận của Hai Bà (`look`: màu đệm, lọng, trống đồng, cờ) có người cưỡi (`rider`, heroes.ts) hay không.
 * `userData.pose(a)` đặt tư thế cả người lẫn voi; ngã thì lăn nghiêng.
 */
export function makeVoiTran(look: VoiTranLook, rider?: VoiTranRider): THREE.Group {
  // Có người cưỡi thì là tướng: đủ chi tiết như các tướng khác.
  const r = new RigBuilder({ ...VOI_TRAN, ...rider?.defs }, rider ? 1 : DETAIL);
  drawVoiTran(r, look);
  rider?.draw(r);
  const { group, bones } = skinRig(r.build());
  const pose: Poser = (a) => {
    resetBones(bones);
    const mood = rider ? rider.pose(bones, a) : {};
    poseVoiTran(bones, a, mood);
  };
  pose({ act: 'stand' });
  group.userData.pose = pose;
  group.userData.fall = 'side';
  return group;
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
  tigerBody(r);
  const h = r.on('qHead').plain;
  for (const sd of [-1, 1]) h.cone(0.03, 0.12, C.cream, sd * 0.05, 0.78, 0.87, [Math.PI, 0, 0], 4);
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
  roosterBody(r);
  // Mắt đỏ rực.
  for (const s of [-1, 1]) r.on('qHead').glow.sphere(0.04, C.comb, s * 0.13, 1.64, 0.56, [1, 1, 0.6], 6);
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

export type BeastKind = 'voi' | 'chienXa' | 'daiTuong' | 'kyBinh' | 'trieuDa' | 'maVien' | 'hoTinh' | 'gaTrang';
const KINDS: readonly FighterKind[] = ['voi', 'chienXa', 'daiTuong', 'kyBinh', 'trieuDa', 'maVien', 'hoTinh', 'gaTrang'];
export const isBeast = (k: FighterKind): k is BeastKind => KINDS.includes(k);

interface Spec {
  defs: Defs;
  draw(r: Rig, tier: number): void;
  pose(b: B, a: Act): void;
}

/**
 * Người cưỡi trên lưng thú hay trên xe: gốc người cưỡi (giữa hai bàn chân) ở chỗ `at`, hông là con của `parent`.
 * Người cưỡi có kỹ năng riêng (Mã Viện phất cờ Lệnh nỏ) thì thú chồm chân trước theo kỹ năng.
 */
function riderSpec(mount: Defs, parent: string, at: V3, kind: RiderKind, seat: 'ride' | 'stand', drawMount: (r: Rig, tier: number) => void, poseMount: (b: B, a: Act, e: number) => void): Spec {
  const skill = riderHasSkill(kind);
  return {
    defs: { ...BASE, ...mount, ...moveBones({ ...HUMAN, ...riderBones(kind) }, parent, at) },
    draw: (r, tier) => {
      drawMount(r, tier);
      r.place(at, 1, () => drawRider(r as unknown as HumanRig, kind));
    },
    pose: (b, a) => {
      // Người cưỡi trước (đặt lại mọi xương), thú sau.
      poseRider(kind, b as unknown as Human, a, seat);
      const e = a.act === 'fight' ? strikeCurve(a.strike, 0.3, 0.5) : 0;
      const rear = skill && a.skill !== undefined && a.act !== 'dead' ? Math.sin(Math.PI * Math.min(Math.max(a.skill, 0), 1)) : 0;
      poseMount(b, a, Math.max(e, rear));
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
  maVien: riderSpec(HORSE, 'qBody', [0, 0.92, -0.08], 'maVien', 'ride', drawWhiteHorse, poseHorse),
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
  const DIVINE_GLOW = 0xffe878;

  // 1. Mai vàng ròng có rãnh chia múi lục giác, vành mai bè, yếm; cổ, đầu Long Quy, chân chèo, đuôi nặn liền.
  turtleBody(r, { shell: C.gold, groove: C.goldDark, skin: TURTLE_SKIN, cap: C.gold, beak: SHELL_GOLD });
  // 2. Tâm mai chạm Mặt Trống Đồng Đông Sơn & Viên Linh Châu Kim Quy tỏa sáng ở chính tâm mai + 4 linh vật góc mặt trống
  turtleDrum(r, { color: C.gold, rim: SHELL_RIM });
  p.cyl(0.085, 0.11, 0.03, C.goldDark, 0, 0.462, 0, undefined, 8);
  g.sphere(0.065, DIVINE_GLOW, 0, 0.488, 0, [1, 0.68, 1], 8);
  for (const [dx, dz] of [
    [0, 0.26],
    [0, -0.26],
    [0.23, 0],
    [-0.23, 0],
  ] as const) {
    g.sphere(0.028, DIVINE_GLOW, dx, 0.455 - 0.12 * (dx * dx + dz * dz), dz, [1.1, 0.55, 1.1], 6);
  }

  // 3. Đầu Thần Kim Quy ('qHead'): mắt thần phát sáng, mày rồng, sừng Kim Quy & râu thần; ngọc trên mũ giáp đỉnh đầu.
  const head = r.on('qHead');
  const h = head.plain;
  const hg = head.glow;
  hg.sphere(0.035, DIVINE_GLOW, 0, 0.79, 1.06, [0.85, 0.65, 1.05], 6);
  // Mắt thần rực sáng, mày rồng vàng uốn vút, sừng thái dương & râu thần
  for (const s of [-1, 1]) {
    h.sphere(0.044, C.ink, s * 0.128, 0.67, 1.14, [0.9, 1.05, 0.9], 6);
    hg.sphere(0.03, 0xffd24c, s * 0.138, 0.672, 1.165, [0.85, 0.95, 0.85], 6);
    // Chân mày rồng vàng uy nghiêm
    h.box(0.042, 0.03, 0.14, C.gold, s * 0.13, 0.725, 1.115, [-0.2, s * 0.25, -s * 0.28]);
    // Sừng Long Quy bằng vàng ròng vươn chéo lên và ra sau (-z)
    h.cyl(0.02, 0.038, 0.15, C.goldDark, s * 0.11, 0.76, 0.91, [-0.75, 0, -s * 0.26], 6);
    h.cone(0.022, 0.13, C.gold, s * 0.132, 0.82, 0.81, [-0.85, 0, -s * 0.3], 5);
    // Râu thần bằng vàng uốn rủ về phía sau dưới hàm
    h.cone(0.018, 0.15, C.gold, s * 0.08, 0.49, 1.12, [-Math.PI * 0.72, 0, -s * 0.2], 5);
  }
  // Chòm râu thần dưới cằm
  h.cone(0.022, 0.16, SHELL_GOLD, 0, 0.47, 1.11, [-Math.PI * 0.74, 0, 0], 5);

  // 4. Móng vuốt Kim Quy phát sáng ở rìa bốn chân chèo (vật báu rèn lẫy Nỏ Thần), gai vảy vàng trên đuôi.
  for (const [b, s] of [
    ['qFL', -1],
    ['qFR', 1],
  ] as const) {
    const fg = r.on(b).glow;
    for (let c = 0; c < 3; c++) {
      const claw = new THREE.ConeGeometry(0.022, 0.11, 4);
      claw.rotateX(Math.PI / 2 + 0.12);
      claw.rotateY(s * (0.75 + c * 0.22));
      fg.add(claw, DIVINE_GLOW, s * (0.76 + c * 0.085), 0.04, 0.58 - c * 0.055);
    }
  }
  for (const [b, s] of [
    ['qBL', -1],
    ['qBR', 1],
  ] as const) {
    const fg = r.on(b).glow;
    for (let c = 0; c < 3; c++) {
      const claw = new THREE.ConeGeometry(0.018, 0.09, 4);
      claw.rotateX(Math.PI / 2 + 0.12);
      claw.rotateY(s * (2.15 + c * 0.2));
      fg.add(claw, DIVINE_GLOW, s * (0.7 + c * 0.065), 0.036, -0.58 - c * 0.04);
    }
  }
  const tail = r.on('qTail').plain;
  for (let i = 0; i < 3; i++) {
    tail.cone(0.022 - i * 0.004, 0.055, C.gold, 0, 0.12 - i * 0.008, -0.7 - i * 0.065, [-0.35, 0, 0], 4);
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
  const r = new RigBuilder(TURTLE, DETAIL);
  drawTurtle(r);
  const { group, bones } = skinRig(r.build());
  const pose: Poser = (a) => poseTurtle(bones, a);
  pose({ act: 'stand' });
  group.userData.pose = pose;
  return group;
}

/** Rùa Vàng bản tĩnh, cho công trình. */
export function bakeRuaVang(): THREE.Group {
  const r = new RigBuilder(TURTLE, DETAIL);
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
    detail: r.detail,
    on: (b: string) => r.on(pre + b),
    local: (b: string, origin: V3, rot: V3 | null, draw: (s: RigSlots) => void) => r.local(pre + b, origin, rot, draw),
    skinned: (slot: RigSlot, geo: THREE.BufferGeometry, bones: readonly string[]) => r.skinned(slot, geo, bones.map((b) => pre + b)),
    defer: (run: () => void) => r.defer(run),
    place: (at: V3, k: number, draw: () => void) => r.place(at, k, draw),
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
    // Tấm phủ lưng đỏ hoa văn trùm lưng ngựa viền vàng, mặt trống đồng hai bên sườn.
    horseDrape(r, { color: C.red, z0: -0.36, z1: 0.3, half: 1.25, pattern: true, trim: C.gold });
    const body = r.on('qBody');
    for (const s of [-1, 1]) {
      body.drum.cyl(0.07, 0.07, 0.02, C.gold, s * 0.24, 0.92, -0.04, [0, 0, -s * (Math.PI / 2 - 0.62)], 12);
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
  humanBody(h, { legs: C.red, cloth: C.red, flaps: false, top: C.bronze, sleeves: C.red, belt: C.gold, armband: C.gold, bracer: C.bronze, bracerTrim: C.gold });
  armor(h, { color: C.bronze, trim: C.gold, pattern: true, y0: 0.395, y1: 0.6 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.07, rim: C.goldDark, thick: 0.02 });
  pauldrons(h, { color: C.bronzeLight, trim: C.gold, size: 1.05 });
  humanHead(h, { brows: true, mustache: C.hair, beard: C.hair, beardLen: 0.12 });
  hairCap(h);
  diadem(h, { color: C.gold, pattern: true, y: 0.806, h: 0.06, rim: C.goldDark, plate: C.gold, gem: C.red, spikes: { color: C.gold, n: 10, h: 0.085, low: 0.058 } });
  featherCrown(h, [C.red, C.gold, C.cream, C.ember], { count: 9, len: 0.42, spread: 0.23 });
}

/**
 * Mỵ Châu ngồi sau: tóc đen dài xõa lưng cài trâm vàng, áo đỏ hồng, kiềng vàng, áo lông ngỗng trắng khoác vai
 * (cổ áo lông xù và hai vạt lông xếp lớp, gắn hai xương để bay phần phật khi ngựa phi). Vẽ như đứng ở gốc.
 */
function drawMyChau(r: Rig): void {
  const h = prefixRig(r, MC);
  humanBody(h, { legs: ROSE, cloth: ROSE, flaps: false, top: ROSE, sleeves: ROSE, belt: C.gold, armband: C.gold });
  necklace(h, { color: C.gold, r: 0.075, y: 0.575, z: 0.03, tilt: 0.25, thick: 0.016 });
  // Tóc dài xõa sau lưng, tóc mai hai bên má, búi tóc cài trâm vàng, vành vàng trên trán.
  humanHead(h, { femBrows: true, lips: 0xc0303a });
  hairCap(h);
  headband(h, C.gold, 0.022);
  hairDown(h, { color: C.hair, to: 0.44, width: 0.17, locks: 0.2 });
  bun(h, { color: C.hair, at: [0, 0.975, -0.1], size: 0.07, pin: { color: C.gold, len: 0.22, tilt: 0.3, ends: C.red } });
  // Cổ áo lông ngỗng xù quanh vai, hai vạt lông xếp lớp sau lưng.
  figure(h, 'gooseCape', gooseCape);
}

/**
 * Áo lông ngỗng nặn: cổ áo là vòng lông xù ôm vai; mỗi vạt một tấm lót, ngoài phủ lông xếp lớp như vảy (lông trắng
 * xen lông ngà, hàng sau so le hàng trước); vạt dưới rộng hơn, mép dưới lông dài lởm chởm.
 */
function gooseCape(detail: number): Piece[] {
  const out: Piece[] = [];
  const collar = new Clay(GOOSE);
  const shade: ReturnType<Clay['layer']>[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    const c: V3 = [Math.cos(a) * 0.15, 0.585, -Math.sin(a) * 0.12 + 0.01];
    collar.add('chest', ellipsoid(c, [0.078, 0.042, 0.06]), { k: 0.012 });
    if (i % 2) shade.push(collar.layer('chest', ellipsoid(c, [0.07, 0.05, 0.065]), GOOSE_SHADE));
  }
  out.push(clayPiece(collar.build({ kind: 'nets', min: [-0.26, 0.5, -0.22], max: [0.26, 0.66, 0.1], cell: 0.009 / detail, target: Math.round(420 * detail) }, shade)));
  for (const [bone, top, bottom, w0, w1] of [
    ['Cape', CAPE_TOP, CAPE_MID[1] - 0.02, 0.34, 0.4],
    ['Cape2', CAPE_MID, 0.1, 0.4, 0.5],
  ] as const) {
    const clay = new Clay(GOOSE_SHADE);
    const hh = top[1] - bottom;
    const z0 = top[2];
    clay.add(bone, ellipsoid([0, top[1] - hh / 2, z0 - 0.012], [(w0 + w1) / 4, hh / 2, 0.014]), { k: 0 });
    const rows = Math.round(hh / 0.06);
    const paints: ReturnType<Clay['layer']>[] = [];
    for (let row = 0; row < rows; row++) {
      const k = (row + 0.5) / rows;
      const y = top[1] - k * hh;
      const half = lerp(w0, w1, k) / 2;
      const n = 5;
      for (let i = 0; i < n; i++) {
        const x = lerp(-half, half, (i + (row % 2 ? 0.75 : 0.25)) / n);
        const tip = bone === 'Cape2' && row === rows - 1;
        const c: V3 = [x, y - (tip ? 0.03 : 0), z0 - 0.03 - row * 0.004];
        const f = ellipsoid(c, [0.052, tip ? 0.11 : 0.08, 0.016]);
        clay.add(bone, f, { k: 0.006 });
        if ((row + i) % 2) paints.push(clay.layer(bone, ellipsoid(c, [0.056, tip ? 0.115 : 0.085, 0.03]), GOOSE));
      }
    }
    const wmax = Math.max(w0, w1) / 2 + 0.08;
    out.push(clayPiece(clay.build({ kind: 'nets', min: [-wmax, bottom - 0.15, z0 - 0.09], max: [wmax, top[1] + 0.08, z0 + 0.02], cell: 0.008 / detail, target: Math.round(700 * detail) }, paints)));
  }
  return out;
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
