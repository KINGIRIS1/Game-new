// Các tướng có khung xương (rig.ts, body.ts): Thánh Gióng ba dáng và ngựa sắt, Sơn Tinh, Thủy Tinh, An Dương Vương, Cao Lỗ,
// Hai Bà Trưng trên voi trận (voi ở beasts.ts), bốn nữ tướng của Hai Bà đứng cầm cờ, Lạc tướng đánh trống trận ở bãi
// chiến, Lạc tướng đứng chầu và Vua Hùng ngồi ngai vàng trong sân Điện. Tướng to hơn lính: thân người thường phóng to
// bằng `place` + `moveBones`.

import * as THREE from 'three';
import type { NuTuongId } from '../game/defs';
import type { GiongLook } from '../game/giong';
import { makeVoiTran, quadFall, quadWalk, voiTranSeat, type VoiTranMood } from './beasts';
import {
  GRIP_L,
  GRIP_R,
  HUMAN,
  beginPose,
  fallPose,
  gripHands,
  hairCap,
  hide,
  humanBody,
  humanHead,
  lerp,
  smooth,
  stance,
  strikeCurve,
  walkCycle,
  type BodyLook,
  type Human,
  type HumanRig,
} from './body';
import { Clay, cone, decal, ellipsoid, hit, radiusAt, slab, sphere, type Sdf } from './nan';
import {
  apron,
  armor,
  buckle,
  bun,
  chestDisc,
  cloak,
  diadem,
  hairDown,
  helmet,
  leafSkirt,
  mien,
  necklace,
  pauldrons,
  plumes,
  shoulderRocks,
  skirtArmor,
  streamer,
  studs,
  tufts,
  tuftsPieces,
  yem,
} from './nanDo';
import { clayPiece, figure, prim, rigid, segs, type Piece } from './nanNguoi';
import { horseBody, horseDrape, type HorseShape } from './nanThu';
import { C } from './palette';
import { RigBuilder, bakeRig, moveBones, skinRig, type Act, type BoneDef, type Bones, type Poser } from './rig';
import { ToonModel, inkThin } from './toon';
import {
  CO_NU,
  IRON,
  IRON_DARK,
  LEATHER,
  arrow,
  bow,
  coLac,
  coNuCan,
  coNuLa,
  crossbowParts,
  doanKiem,
  drumShield,
  guomDong,
  hornTrumpet,
  quiver,
  repeatingCrossbow,
  spear,
  type Parts,
} from './weapons';

type Defs = Record<string, BoneDef<string>>;
type Rig = RigBuilder<string>;
type B = Bones<string>;
type V3 = [number, number, number];

const BASE: Defs = { base: { parent: null, at: [0, 0, 0] } };
/** Cánh tay thân người thường: tướng phóng to thì nhân theo. */
const ARM = 0.255;

/** Thân người phóng to `k` lần, đứng ở `at` (hông là con của `parent`). */
function bigHuman(parent: string, at: V3, k: number): Defs {
  return moveBones(HUMAN, parent, at, k) as Defs;
}

/** Vẽ một thân người (tọa độ như đứng ở gốc) phóng to `k` lần ở `at`. */
function drawBig(r: Rig, at: V3, k: number, draw: (h: HumanRig) => void): void {
  r.place(at, k, () => draw(r as unknown as HumanRig));
}

/** Tre đằng ngà: vàng ngà ấm hơn tre xanh thường. */
const BAMBOO_GOLD = 0xd8b24c;
const BAMBOO_LIGHT = 0xe8c96b;
const BAMBOO_NODE = 0x926b22;
const IRON_LIGHT = 0x9aa9bc;
const FLAME_CORE = 0xfff0a8;

/** Dáng chung của miện lá (chủ dự án chốt ở mẫu Vua Hùng): lá nhỏ, ít xòe, nửa mặt trời trống đồng mọc trên vành. */
const MIEN = { fan: 0.28, around: 0.36, discHalf: true, discV: 0.045 } as const;

/**
 * Búp lá của nữ tướng, Hai Bà và Âu Cơ (chủ dự án đưa ảnh mẫu): vòng sắt, vành hoa văn có ngọc, diềm răng cưa trên
 * vành, rồi một búp lá hẹp cao chụm trước trán, lòng lá màu `inlay` có sống dọc. `rank` 2 (Hai Bà, Âu Cơ): vàng, bảy
 * lá, chóp bậc; 1 (nữ tướng): đồng, năm lá.
 */
function bupLa(h: HumanRig, inlay: number, rank: 1 | 2): void {
  const metal = rank === 2 ? C.gold : C.bronze;
  const dark = rank === 2 ? C.goldDark : C.bronzeDark;
  diadem(h, { color: IRON_DARK, y: 0.8, h: 0.022, puff: 0.014 });
  diadem(h, { color: metal, pattern: true, y: 0.82, h: 0.045, puff: 0.01, edge: dark, gem: inlay, spikes: { color: metal, n: 14, h: rank === 2 ? 0.06 : 0.05, low: 0.036 } });
  mien(h, {
    color: metal,
    inlay,
    bar: rank === 2 ? C.gold : C.bronzeLight,
    count: rank === 2 ? 7 : 5,
    h: rank === 2 ? 0.44 : 0.36,
    w: 0.052,
    y: 0.86,
    fan: 0.1,
    around: 0.13,
    drop: 0.15,
    flare: 1.25,
    rib: true,
    finial: rank === 2 ? metal : undefined,
  });
}

/** Hào quang Phù Đổng Thiên Vương: vòng nhật nguyệt kép có 8 nan hoa và 16 tia như mặt trời trống đồng. Tâm ở gốc, mặt hướng +z. */
function halo(): THREE.Group {
  const m = new ToonModel(inkThin);
  m.glow.add(new THREE.TorusGeometry(0.46, 0.036, 8, 40), C.ember, 0, 0, 0);
  m.glow.add(new THREE.TorusGeometry(0.33, 0.022, 6, 32), C.fire, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    m.glow.box(0.024, 0.13, 0.02, C.ember, Math.cos(a) * 0.395, Math.sin(a) * 0.395, 0, [0, 0, a - Math.PI / 2]);
  }
  const rays = 16;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const major = i % 2 === 0;
    const len = major ? 0.24 : 0.14;
    const r0 = 0.47 + len * 0.46;
    m.glow.cone(
      major ? 0.044 : 0.03,
      len,
      major ? C.ember : C.fire,
      Math.cos(a) * r0,
      Math.sin(a) * r0,
      0,
      [0, 0, a - Math.PI / 2],
      4,
    );
  }
  const g = m.group();
  g.userData.halo = true;
  return g;
}

/** Gắn hào quang sau lưng (phần vẽ trận xoay nó). */
function addHalo(g: THREE.Group, y: number, z: number): void {
  const ring = halo();
  ring.position.set(0, y, z);
  g.add(ring);
}

function finish(group: THREE.Group, pose: Poser): THREE.Group {
  pose({ act: 'stand' });
  group.userData.pose = pose;
  return group;
}

// ---------- Ngựa sắt ----------

/** Ngựa sắt của Gióng to hơn ngựa thường (tượng ở đền giữ cỡ 1). */
const K_HORSE = 1.22;

/** Khớp ngựa sắt ở cỡ 1 (ngực nở, chân to, cổ dày hơn ngựa thường). */
const IRON_BONES: Defs = {
  qBody: { parent: null, at: [0, 0.82, 0] },
  qFL: { parent: 'qBody', at: [-0.19, 0.65, 0.36] },
  qFR: { parent: 'qBody', at: [0.19, 0.65, 0.36] },
  qBL: { parent: 'qBody', at: [-0.19, 0.65, -0.36] },
  qBR: { parent: 'qBody', at: [0.19, 0.65, -0.36] },
  qNeck: { parent: 'qBody', at: [0, 0.98, 0.35] },
  qHead: { parent: 'qNeck', at: [0, 1.36, 0.6] },
  qTail: { parent: 'qBody', at: [0, 0.98, -0.52] },
};

/** Khớp ngựa sắt cỡ `k`, đứng ở gốc, là con của `base`. */
const ironHorse = (k: number): Defs => moveBones(IRON_BONES, 'base', [0, 0, 0], k) as Defs;

/** Chỗ các xương ngựa sắt cho thân nặn. */
const IRON_SHAPE: HorseShape = { y: 0.82, legX: 0.19, legZ: 0.36, neck: [0, 0.98, 0.35], head: [0, 1.36, 0.6], tail: [0, 0.98, -0.52], girth: 1.22, leg: 1.25 };

/** Sắt nung sẫm của thân ngựa: tối hơn giáp để lửa trong khe và giáp sáng nổi lên. */
const IRON_BLACK = 0x39424f;

/** Lưỡi lửa hình giọt: gốc ở tâm, phình to ở một phần ba, vuốt nhọn về +y. */
function tongue(r: number, len: number, seg = 6): THREE.BufferGeometry {
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    profile.push(new THREE.Vector2(r * Math.sin(Math.PI * t ** 0.65), t * len));
  }
  return new THREE.LatheGeometry(profile, seg);
}

/**
 * Ngựa sắt của Gióng (cỡ `k`): thân sắt nung sẫm, khe lò lửa hai bên sườn; giáp sắt sáng viền vàng che vai và mông,
 * ống chân bọc sắt, móng đồng; ngực đeo mặt trống đồng; mặt nạ đồng vàng; bờm và đuôi là lửa.
 */
function drawIronHorse(r: Rig, k = 1): void {
  r.place([0, 0, 0], k, () => ironHorseParts(r));
}

function ironHorseParts(r: Rig): void {
  const S = IRON_SHAPE;
  horseBody(r, { coat: IRON_BLACK, mane: IRON_DARK, hoof: C.bronze, muzzle: 0x2b323c, sock: IRON, bare: true }, S);
  const body = r.on('qBody');
  const p = body.plain;
  // Khe lò lửa hai bên sườn, dưới mép tấm phủ yên.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = 0.17 - i * 0.1;
      body.glow.box(0.03, 0.12 - Math.abs(i - 1.5) * 0.02, 0.045, i % 2 ? C.ember : C.fire, s * 0.272, 0.74, z, [0.25, 0, s * 0.18]);
    }
  }
  // Giáp mông và giáp vai: lá sắt sáng ôm thân, viền vàng, đinh tán đồng.
  horseDrape(r, { color: IRON, z0: -0.56, z1: -0.3, half: 1.2, trim: C.gold, thick: 0.02 }, S);
  horseDrape(r, { color: IRON, z0: 0.2, z1: 0.42, half: 1.05, trim: C.gold, thick: 0.02 }, S);
  for (const s of [-1, 1]) {
    for (const [y, z] of [
      [1.0, -0.44],
      [0.9, -0.47],
      [0.99, 0.31],
    ] as const) {
      const x = s * (y > 0.95 ? 0.215 : 0.265);
      p.sphere(0.022, C.bronzeLight, x, y, z, [1, 1, 1], 6);
    }
  }
  // Tấm phủ yên dệt hoa văn viền đồng, cầu yên trước sau bằng đồng.
  horseDrape(r, { color: C.red, z0: -0.3, z1: 0.2, half: 1.3, pattern: true, trim: C.gold }, S);
  p.box(0.22, 0.09, 0.05, C.bronze, 0, 1.135, 0.215, [-0.3, 0, 0]);
  p.box(0.3, 0.1, 0.06, C.bronze, 0, 1.14, -0.31, [0.35, 0, 0]);
  // Bàn đạp đồng.
  for (const s of [-1, 1]) {
    p.box(0.02, 0.24, 0.025, IRON_DARK, s * 0.315, 0.84, 0.04);
    p.add(new THREE.TorusGeometry(0.055, 0.015, 5, 10), C.bronzeLight, s * 0.325, 0.68, 0.04, [0, Math.PI / 2, 0]);
  }
  // Mặt trống đồng đeo ngực, vành đồng sẫm, đai ngực đồng vòng ra hai vai.
  body.drum.cyl(0.15, 0.15, 0.04, C.gold, 0, 0.86, 0.555, [Math.PI / 2 - 0.12, 0, 0], 18);
  p.add(new THREE.TorusGeometry(0.155, 0.022, 6, 20), C.bronzeDark, 0, 0.86, 0.565, [-0.12, 0, 0]);
  // Lửa phụt sau cổ chân.
  for (const [b, x, z] of [
    ['qFL', -S.legX, S.legZ],
    ['qFR', S.legX, S.legZ],
    ['qBL', -S.legX, -S.legZ - 0.045],
    ['qBR', S.legX, -S.legZ - 0.045],
  ] as const) {
    const leg = r.on(b);
    leg.glow.add(tongue(0.04, 0.17, 5), C.fire, x, 0.14, z - 0.05, [-2.0, 0, 0]);
    leg.plain.cyl(0.058, 0.062, 0.03, C.gold, x, 0.2, z + (z > 0 ? 0.012 : -0.005), undefined, 8);
  }

  // Bờm lửa: hai hàng lưỡi lửa dọc sống cổ, bốc cao rồi tạt về sau.
  const neck = r.on('qNeck');
  const [nx0, ny0, nz0] = S.neck;
  const [hx, hy, hz] = S.head;
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const y = ny0 + 0.2 + (hy - ny0 - 0.1) * t;
    const z = nz0 - 0.1 + (hz - nz0 - 0.02) * t;
    // Gần yên thì thấp cho khỏi che người cưỡi, lên gần đầu ngựa thì bốc cao.
    const len = 0.2 + 0.2 * t;
    const lean = -1.0 + 0.3 * t;
    neck.glow.add(tongue(0.085, len), i % 2 ? C.ember : C.fire, nx0, y, z, [lean, 0, 0]);
    for (const s of [-1, 1]) neck.glow.add(tongue(0.055, len * 0.7), i % 2 ? C.fire : C.ember, s * 0.055, y - 0.02, z + 0.03, [lean + 0.15, 0, -s * 0.4]);
  }

  // Mặt nạ đồng vàng dọc sống mũi, mặt trời trống đồng trên trán, mắt lửa, lỗ mũi phả lửa, ngọn lửa giữa hai tai, cương đồng.
  const head = r.on('qHead');
  const hp = head.plain;
  hp.box(0.1, 0.024, 0.2, C.bronze, hx, hy + 0.024, hz + 0.205, [0.6, 0, 0]);
  hp.box(0.04, 0.03, 0.22, C.gold, hx, hy + 0.03, hz + 0.205, [0.6, 0, 0]);
  head.drum.cyl(0.07, 0.07, 0.03, C.gold, hx, hy + 0.106, hz + 0.118, [0.74, 0, 0], 14);
  head.glow.add(tongue(0.055, 0.26), C.ember, hx, hy + 0.14, hz - 0.04, [-0.45, 0, 0]);
  for (const s of [-1, 1]) {
    head.glow.sphere(0.034, C.fire, s * 0.088, hy + 0.035, hz + 0.08, [0.6, 0.9, 1], 8);
    head.glow.sphere(0.02, C.ember, s * 0.04, hy - 0.125, hz + 0.355, [1, 1, 1], 5);
    hp.add(new THREE.TorusGeometry(0.032, 0.01, 5, 10), C.gold, s * 0.07, hy - 0.09, hz + 0.2, [0, Math.PI / 2, 0]);
    hp.box(0.016, 0.02, 0.6, C.bronzeLight, s * 0.12, hy - 0.07, hz - 0.1, [0.1, -s * 0.08, 0]);
  }

  // Đuôi lửa: bọc gốc đuôi đồng, chùm lưỡi lửa xòe dài ra sau.
  const tail = r.on('qTail');
  const [, ty, tz] = S.tail;
  tail.plain.cyl(0.065, 0.08, 0.13, C.bronze, 0, ty - 0.02, tz - 0.04, [-1.4, 0, 0], 8);
  for (const [dx, dy, rz, len, col] of [
    [0, 0.02, 0, 0.78, C.ember],
    [-0.06, 0, 0.28, 0.66, C.fire],
    [0.06, 0, -0.28, 0.66, C.fire],
    [-0.11, -0.03, 0.55, 0.5, C.ember],
    [0.11, -0.03, -0.55, 0.5, C.ember],
    [0, 0.06, 0, 0.5, C.fire],
  ] as const) {
    tail.glow.add(tongue(0.1, len), col, dx, ty - 0.04 + dy, tz - 0.08, [-2.1, 0, rz]);
  }
}

/** Ngựa sắt đi (phi), đứng (gật đầu), cào chân khi Gióng quật roi. */
function poseIronHorse(b: B, a: Act, e: number): void {
  const t = a.time ?? 0;
  if (a.act === 'walk') {
    const ph = a.phase ?? 0;
    quadWalk(b, ph, (a.stride ?? 0.5) * 0.92, 0.65);
    b.qNeck.rotation.x = 0.08 * Math.sin(ph * 2);
    b.qHead.rotation.x = -0.05 * Math.sin(ph * 2);
    b.qTail.rotation.x = 0.12 * Math.sin(ph * 2);
  } else if (a.act === 'dead') {
    quadFall(b, a.fall ?? 1);
  } else {
    b.qNeck.rotation.x = 0.05 * Math.sin(t * 1.6) - 0.15 * e;
    b.qHead.rotation.x = -0.04 * Math.sin(t * 1.6) + 0.08 * e;
    b.qFL.rotation.x = -0.58 * e;
    b.qFR.rotation.x = -0.18 * e;
    b.qTail.rotation.z = 0.14 * Math.sin(t * 2.4);
  }
}

/** Tượng ngựa sắt bản tĩnh, cho Đền Phù Đổng. */
export function bakeIronHorse(): THREE.Group {
  const r = new RigBuilder({ ...BASE, ...ironHorse(1) });
  drawIronHorse(r);
  return bakeRig(r.build());
}

// ---------- Thánh Gióng ----------

/** Tráng sĩ cao lớn: to hơn hẳn ngựa mình cưỡi. */
const K_GIONG = 1.5;
const GIONG_AT: V3 = [0, 1.1, -0.03];

/** Roi sắt 7 đốt trúc (hay khóm 3 thân tre đằng ngà nguyên gốc rễ khi roi đã gãy), dựng từ chỗ tay nắm. */
function giongWeapon(s: Parts, bamboo: boolean): void {
  const p = s.plain;
  if (bamboo) {
    p.sphere(0.072, BAMBOO_NODE, 0, -0.06, 0, [1.15, 0.85, 1.15], 8);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      p.cone(0.02, 0.12, C.woodDark, Math.cos(a) * 0.055, -0.09, Math.sin(a) * 0.055, [Math.PI + Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55], 4);
    }
    const nodes = 6;
    const segLen = 0.245;
    for (let i = 0; i < nodes; i++) {
      const y0 = i * segLen;
      const rBot = lerp(0.044, 0.03, i / nodes);
      const rTop = lerp(0.041, 0.027, (i + 1) / nodes);
      p.cyl(rTop, rBot, segLen, i % 2 ? BAMBOO_GOLD : BAMBOO_LIGHT, 0, y0 + segLen * 0.5, 0, undefined, 8);
      p.cyl(rTop + 0.008, rTop + 0.008, 0.022, BAMBOO_NODE, 0, y0 + segLen, 0, undefined, 9);
    }
    for (const [side, hMul] of [
      [-1, 0.88],
      [1, 0.82],
    ] as const) {
      const len = nodes * segLen * hMul;
      p.cyl(0.018, 0.026, len, BAMBOO_GOLD, side * 0.036, len * 0.48, 0.01 * side, [0, 0, -side * 0.045], 6);
      for (let j = 1; j <= 4; j++) {
        const ny = (len / 4.2) * j;
        p.cyl(0.027, 0.027, 0.018, BAMBOO_NODE, side * (0.036 + ny * 0.035), ny, 0.01 * side, [0, 0, -side * 0.045], 7);
      }
    }
    const topY = nodes * segLen;
    const leafColors = [C.leaf[0], C.leaf[1], C.leaf[3], BAMBOO_GOLD];
    for (let i = 0; i < 11; i++) {
      const a = ((i - 5) / 5) * 0.9;
      const row = i % 3;
      const ly = topY - 0.14 + row * 0.11 + Math.cos(a) * 0.06;
      const lx = Math.sin(a) * (0.11 + row * 0.035);
      const lz = ((i % 2) - 0.5) * 0.1;
      p.cone(0.058, 0.27, leafColors[i % 4], lx, ly, lz, [0.12 * (row - 1), 0, -a * 0.85], 4);
    }
  } else {
    // Roi sắt bảy đốt như đốt trúc, đai vàng mỗi đốt, chuôi bọc đồng hoa văn, đầu roi búp sen đồng.
    p.sphere(0.048, C.gold, 0, -0.1, 0, [1, 1.1, 1], 8);
    p.cone(0.045, 0.13, C.red, 0, -0.17, -0.02, [Math.PI - 0.3, 0, 0], 6);
    s.band.cyl(0.04, 0.038, 0.19, C.bronze, 0, 0.01, 0, undefined, 10);
    p.cyl(0.066, 0.05, 0.05, C.gold, 0, 0.115, 0, undefined, 10);
    const joints = 7;
    const step = 0.145;
    for (let i = 0; i < joints; i++) {
      const y = 0.14 + i * step;
      const rSeg = lerp(0.042, 0.03, i / joints);
      p.cyl(rSeg * 0.92, rSeg, step * 0.84, i % 2 ? IRON : IRON_DARK, 0, y + step * 0.42, 0, undefined, 8);
      p.cyl(rSeg + 0.011, rSeg + 0.011, 0.03, C.gold, 0, y + step * 0.88, 0, undefined, 10);
    }
    const topY = 0.14 + joints * step;
    p.sphere(0.056, C.bronzeLight, 0, topY + 0.03, 0, [1, 1.2, 1], 10);
    p.cone(0.036, 0.12, IRON_LIGHT, 0, topY + 0.12, 0, undefined, 6);
  }
}

/**
 * Tráng sĩ Gióng: tay trần, chân trần của trai làng; giáp sắt lá vảy viền vàng, hộ tâm mặt trống đồng; khố đỏ hoa văn,
 * đai lưng đỏ buông hai dải sau lưng; mũ sắt vành đồng hoa văn có che gáy, trên vành dựng miện lá sắt khảm đỏ son,
 * mặt trời trống đồng trước trán.
 */
function drawGiongRider(r: HumanRig, bamboo: boolean): void {
  humanBody(r, {
    cloth: C.red,
    pattern: true,
    hem: C.gold,
    belt: C.red,
    armband: C.gold,
    greaves: IRON,
    greavesTrim: C.gold,
    knee: C.bronze,
    wristband: C.bronze,
  });
  buckle(r, { color: C.gold, gem: C.red });
  skirtArmor(r, { color: IRON, trim: C.gold, rows: 2, to: 0.24, panels: [0, Math.PI], half: 0.5 });
  armor(r, { color: IRON, trim: C.gold, rows: 3, scales: true, y0: 0.395, y1: 0.6 });
  chestDisc(r, { color: C.gold, drum: true, r: 0.078, rim: C.bronze, thick: 0.024 });
  pauldrons(r, { color: IRON, trim: C.gold, layers: 1, size: 1.05 });
  // Hai dải đai lưng đỏ buông sau lưng.
  for (const s of [-1, 1]) streamer(r, { from: [s * 0.03, 0.42, -0.12], dir: [s * 0.3, -1, -0.3], len: 0.22, width: 0.055, color: C.red, bone: 'hips' });
  humanHead(r, { brows: true, blush: true });
  hairCap(r);
  helmet(r, { color: IRON, band: C.bronze, bandH: 0.05, bandPattern: true, ridge: C.gold, neck: 0.14, cheek: 0.1, guard: IRON, guardTrim: C.gold, gem: C.red });
  // Miện lá sắt khảm đỏ son, nan vàng, dựng trên vành mũ.
  mien(r, { ...MIEN, color: IRON, inlay: C.red, bar: C.gold, disc: C.gold, discRim: C.bronzeDark, curls: C.gold, puff: 0.03, h: 0.28, w: 0.085, y: 0.835, discR: 0.095 });
  r.local('hand', GRIP_R, null, (s) => giongWeapon(s, bamboo));
}

/** Gióng cưỡi ngựa: giơ cao roi, quật xuống, quét tre một vòng (kỹ năng), ngã. */
function poseGiongRider(b: Human, a: Act): void {
  beginPose(b, a.time);
  // Tay trái cầm cương; tay phải giơ cao roi, ngả ra sau và chếch ra ngoài.
  b.armL.rotation.set(-0.92, 0.12, -0.12);
  b.armR.rotation.set(-2.68, 0, 0.36);
  b.hand.rotation.set(-0.48, 0, -0.28);
  if (a.skill !== undefined) {
    // Nhổ tre: giơ cao lấy đà, bổ xuống ngang người, quét một vòng quanh mình, rồi giơ lại.
    const k = a.skill;
    if (k < 0.15) {
      const w = smooth(k, 0, 0.15);
      b.armR.rotation.x = lerp(-2.68, -3.1, w);
      b.hand.rotation.x = lerp(-0.48, -0.9, w);
    } else if (k < 0.85) {
      const down = smooth(k, 0.15, 0.3);
      const turn = Math.PI * 2 * smooth(k, 0.35, 0.85);
      b.armR.rotation.set(lerp(-3.1, -1.5, down), turn, lerp(0.36, 0, down));
      b.hand.rotation.set(lerp(-0.9, Math.PI / 2, down), turn, 0);
      b.chest.rotation.set(0.16 * down, 0.22 * Math.sin(turn), 0);
    } else {
      const back = smooth(k, 0.85, 1);
      b.armR.rotation.set(lerp(-1.5, -2.68, back), 0, lerp(0, 0.36, back));
      b.hand.rotation.set(lerp(Math.PI / 2, -0.48, back), 0, lerp(0, -0.28, back));
    }
  } else if (a.win !== undefined) {
    const w = a.win;
    b.armR.rotation.set(lerp(-2.68, -3.05, w), 0, 0.25);
    b.armL.rotation.set(lerp(-0.92, -2.4, w), 0, -0.35);
    b.chest.rotation.x = -0.12 * w;
  } else if (a.act === 'fight' && a.strike !== undefined) {
    const e = Math.sin(Math.PI * a.strike);
    b.armR.rotation.x = lerp(-2.68, -0.68, e);
    b.hand.rotation.x = lerp(-0.48, 1.62, e);
    b.chest.rotation.x = 0.32 * e;
  } else if (a.act === 'dead') {
    fallPose(b, a.fall ?? 1);
  }
  b.hips.position.copy(b.hips.userData.rest as THREE.Vector3);
  b.legL.rotation.set(-0.35, 0, -0.82);
  b.legR.rotation.set(-0.35, 0, 0.82);
  gripHands(b, ARM * K_GIONG);
}

/** Gióng xuống ngựa đứng chầu trong sân Điện: roi sắt (hay tre) dựng bên phải, tay trái nắm hờ, thở nhẹ. */
function poseGiongStand(b: Human, a: Act): void {
  const t = a.time ?? 0;
  beginPose(b, t);
  b.armR.rotation.set(-0.2, 0, 0.2);
  b.hand.rotation.set(0.12 + 0.02 * Math.sin(t * 1.2), 0, -0.12);
  b.armL.rotation.set(-0.3, 0, -0.26);
  gripHands(b, ARM * K_GIONG);
}

// Cậu bé lên ba ngồi bệt trên chiếu.
const CHILD: Defs = {
  ...BASE,
  cHips: { parent: 'base', at: [0, 0.1, 0] },
  cChest: { parent: 'cHips', at: [0, 0.12, 0] },
  cHead: { parent: 'cChest', at: [0, 0.38, 0] },
  cArmL: { parent: 'cChest', at: [-0.135, 0.32, 0.02] },
  cArmR: { parent: 'cChest', at: [0.135, 0.32, 0.02] },
};

/** Cậu bé lên ba ngồi bệt trên chiếu cói viền điều, mặc yếm đào thêu trống đồng, đeo kiềng vàng, đầu 3 chỏm tóc đào. */
function drawChild(r: Rig): void {
  const base = r.on('base');
  base.band.box(0.72, 0.032, 0.58, C.thatch, 0, 0.016, 0.04);
  base.plain.box(0.75, 0.026, 0.04, C.red, 0, 0.018, 0.32);
  base.plain.box(0.75, 0.026, 0.04, C.red, 0, 0.018, -0.24);
  base.plain.box(0.04, 0.026, 0.58, C.red, -0.355, 0.018, 0.04);
  base.plain.box(0.04, 0.026, 0.58, C.red, 0.355, 0.018, 0.04);
  base.plain.cyl(0.065, 0.042, 0.055, C.bronze, 0.25, 0.055, 0.18, undefined, 10);
  base.plain.sphere(0.058, C.cream, 0.25, 0.088, 0.18, [1, 0.7, 1], 8);
  figure(r as unknown as HumanRig, 'giongBe', childPieces);
}

/** Thân cậu bé nặn liền khối: bụng tròn, chân duỗi trước, tay mũm mĩm, đầu to má phúng phính; yếm, kiềng, vòng. */
function childPieces(detail: number): Piece[] {
  const body = new Clay(C.skin);
  body.add('cChest', ellipsoid([0, 0.215, 0], [0.142, 0.16, 0.125]), { k: 0 });
  body.add('cChest', ellipsoid([0, 0.17, 0.03], [0.138, 0.12, 0.118]), { k: 0.05 });
  body.add('cChest', cone([0, 0.3, -0.005], [0, 0.4, 0], 0.075, 0.062), { k: 0.04 });
  body.add('cHips', ellipsoid([0, 0.1, -0.015], [0.15, 0.075, 0.13]), { k: 0.04 });
  for (const s of [-1, 1]) {
    body.add('cHips', cone([s * 0.078, 0.085, 0.02], [s * 0.095, 0.08, 0.23], 0.058, 0.046), { k: 0.03 });
    body.add('cHips', ellipsoid([s * 0.097, 0.1, 0.262], [0.042, 0.055, 0.034]), { k: 0.025 });
    const arm = s < 0 ? 'cArmL' : 'cArmR';
    body.add(arm, cone([s * 0.128, 0.31, 0.01], [s * 0.172, 0.15, 0.075], 0.042, 0.034), { k: 0.03 });
    body.add(arm, ellipsoid([s * 0.178, 0.125, 0.088], [0.04, 0.042, 0.04]), { k: 0.02 });
  }
  const out: Piece[] = [clayPiece(body.build({ kind: 'nets', min: [-0.27, 0.0, -0.17], max: [0.27, 0.43, 0.32], cell: 0.011 / detail, target: Math.round(1100 * detail) }))];
  // Yếm đào thêu mặt trống đồng.
  const chest = body.only(['cChest']);
  const P = (u: number, v: number): V3 => {
    const y = 0.33 - 0.2 * v;
    const th = Math.PI / 2 + (u - 0.5) * 2 * (0.5 + 0.25 * Math.min(1, v * 1.5));
    const rr = radiusAt(chest, [0, y, 0.0], [Math.cos(th), 0, Math.sin(th)], 0.3) + 0.006;
    return [Math.cos(th) * rr, y, Math.sin(th) * rr];
  };
  const inward = (u: number, v: number): V3 => {
    const th = Math.PI / 2 + (u - 0.5) * 2 * (0.5 + 0.25 * Math.min(1, v * 1.5));
    return [-Math.cos(th), 0, -Math.sin(th)];
  };
  out.push(rigid(slab(P, inward, Math.max(4, Math.round(6 * detail)), Math.max(3, Math.round(4 * detail)), 0.008, C.red, true), 'cChest', 'band'));
  const plateF: Sdf = (x, y, z) => chest(x, y, z) - 0.015;
  const c = hit(plateF, [0, 0.235, 0.5], [0, 0, -1]) ?? [0, 0.235, 0.14];
  out.push(rigid(decal(plateF, c, { r: 0.058, lift: 0.004, seg: segs(18, detail, 12), rings: 2 }, C.gold), 'cChest', 'drum'));
  const kieng = new THREE.TorusGeometry(0.098, 0.014, 6, 18);
  kieng.rotateX(Math.PI / 2 + 0.2);
  kieng.translate(0, 0.362, 0.02);
  out.push(prim(kieng, C.gold, 'cChest'));
  for (const s of [-1, 1]) {
    const v = new THREE.TorusGeometry(0.04, 0.009, 5, 12);
    v.lookAt(new THREE.Vector3(s * 0.044, -0.16, 0.065));
    v.translate(s * 0.166, 0.165, 0.063);
    out.push(prim(v, C.gold, s < 0 ? 'cArmL' : 'cArmR'));
    const a = new THREE.TorusGeometry(0.05, 0.009, 5, 12);
    a.translate(s * 0.093, 0.082, 0.205);
    out.push(prim(a, C.gold, 'cHips'));
  }
  // Đầu to tròn, má phúng phính, mắt to có đốm sáng, má hồng, miệng chúm.
  const head = new Clay(C.skin);
  head.add('cHead', ellipsoid([0, 0.585, 0], [0.24, 0.228, 0.226]), { k: 0 });
  for (const s of [-1, 1]) head.add('cHead', ellipsoid([s * 0.11, 0.515, 0.12], [0.075, 0.062, 0.07]), { k: 0.06 });
  head.add('cHead', ellipsoid([0, 0.55, 0.21], [0.022, 0.02, 0.016]), { k: 0.02 });
  const on = (x: number, y: number): V3 => hit(head.dist, [x, y, 0.5], [0, 0, -1]) ?? [x, y, 0.21];
  const paints = [-1, 1].flatMap((s) => [
    head.layer('cHead', ellipsoid(on(s * 0.086, 0.578), [0.034, 0.046, 0.03]), C.ink, 2),
    head.layer('cHead', sphere(on(s * 0.076, 0.595), 0.013), C.cream, 2),
    head.layer('cHead', ellipsoid(on(s * 0.088, 0.64), [0.03, 0.008, 0.03], [0, 0, -s * 0.15]), C.hair, 1),
    head.layer('cHead', ellipsoid(on(s * 0.135, 0.515), [0.038, 0.022, 0.03]), 0xe58a6a),
  ]);
  paints.push(head.layer('cHead', ellipsoid(on(0, 0.497), [0.022, 0.009, 0.03]), C.red, 1));
  out.push(clayPiece(head.build({ kind: 'radial', c: [0, 0.585, 0], detail: Math.max(3, Math.round(4 * detail)), rmax: 0.34, front: 0.3 }, paints)));
  for (const s of [-1, 1]) {
    const ear = new THREE.SphereGeometry(0.036, 8, 6);
    ear.scale(0.55, 1, 0.9);
    ear.translate(s * 0.232, 0.57, 0);
    out.push(prim(ear, C.skin, 'cHead'));
  }
  out.push(...tuftsPieces({ color: C.hair, front: [0, 0.8, 0.07], side: [0.15, 0.745, -0.02], size: 0.08 }, detail, 'cHead'));
  return out;
}

/** Cậu bé lắc lư, hai tay đập đập xuống chiếu. */
function poseChild(b: B, a: Act): void {
  for (const k of Object.keys(b)) b[k].rotation.set(0, 0, 0);
  const t = a.time ?? 0;
  b.cChest.rotation.z = 0.08 * Math.sin(t * 1.5);
  b.cHead.rotation.z = -0.05 * Math.sin(t * 1.5);
  b.cArmR.rotation.x = -0.6 * Math.max(0, Math.sin(t * 3));
  b.cArmL.rotation.x = -0.6 * Math.max(0, Math.sin(t * 3 + Math.PI));
}

const K_TEEN = 1.28;

/** Thiếu niên Gióng: cao hẳn lên, đeo kiềng đồng, yếm đỏ thêu trống đồng, ôm liễn cơm đầy, cạnh chân là chồng bát và nồi đất. */
function drawTeen(r: Rig): void {
  const base = r.on('base').plain;
  for (let i = 0; i < 4; i++) {
    base.cyl(0.135, 0.08, 0.075, i % 2 ? C.bronze : C.bronzeLight, 0.42, 0.038 + i * 0.068, 0.12, [0, 0, (i % 2 ? 1 : -1) * 0.05], 10);
  }
  base.sphere(0.16, C.earthDark, -0.42, 0.13, 0.08, [1.1, 0.88, 1.1], 10);
  base.cyl(0.13, 0.11, 0.045, C.earth, -0.42, 0.24, 0.08, undefined, 10);
  base.sphere(0.11, C.cream, -0.42, 0.26, 0.08, [1, 0.6, 1], 8);

  drawBig(r, [0, 0, 0], K_TEEN, (h) => {
    humanBody(h, { cloth: C.red, pattern: true, belt: C.bronze, armband: C.bronze });
    yem(h, { color: C.red, pattern: true, disc: C.gold, top: 0.575, bottom: 0.415 });
    necklace(h, { color: C.gold, r: 0.068, y: 0.575, z: 0.01, tilt: 0.15, thick: 0.01 });
    humanHead(h);
    tufts(h, { color: C.hair, front: [0, 0.955, 0.055], side: [0.13, 0.89, -0.02], size: 0.068 });
    h.local('handL', GRIP_L, null, (s) => {
      s.band.cyl(0.15, 0.088, 0.11, C.bronze, 0, 0.03, 0.06, undefined, 12);
      s.plain.sphere(0.138, C.cream, 0, 0.095, 0.06, [1, 0.8, 1], 10);
    });
    h.local('hand', GRIP_R, null, (s) => {
      for (const dx of [-0.02, 0.02]) s.plain.box(0.013, 0.28, 0.013, BAMBOO_GOLD, dx, 0.12, 0);
      s.plain.sphere(0.036, C.cream, 0, 0.26, 0, [1.1, 0.9, 1], 7);
    });
  });
}

/** Thiếu niên ôm bát, gắp cơm đưa lên miệng, cúi đầu ăn. */
function poseTeen(b: B, a: Act): void {
  const h = b as unknown as Human;
  beginPose(h, a.time);
  const t = a.time ?? 0;
  const c = Math.max(0, Math.sin(t * 3));
  h.armL.rotation.set(-1.0, 0.45, 0);
  h.armR.rotation.set(lerp(-0.9, -1.9, c), 0.35, 0);
  h.hand.rotation.set(lerp(0.6, -0.3, c), 0, 0);
  h.head.rotation.x = 0.22 * c;
  gripHands(h, ARM * K_TEEN);
}

/**
 * Thánh Gióng theo từng dáng: cậu bé lên ba ngồi trên chiếu, thiếu niên ôm bát cơm, tráng sĩ cưỡi ngựa sắt giơ cao
 * roi sắt (hay cây tre khi roi đã gãy), lửa phun ra từ mõm ngựa. `glow`: Phù Đổng Thiên Vương hiển linh, có hào quang.
 * `onFoot`: tráng sĩ xuống ngựa, đứng chầu trong sân Điện (tướng đứng trong sân không cưỡi thú).
 */
export function makeGiong(look: GiongLook, opts: { bamboo?: boolean; glow?: boolean; onFoot?: boolean } = {}): THREE.Group {
  if (look === 'be') {
    const r = new RigBuilder(CHILD);
    drawChild(r);
    const { group, bones } = skinRig(r.build());
    return finish(group, (a) => poseChild(bones, a));
  }
  if (look === 'thieuNien') {
    const r = new RigBuilder({ ...BASE, ...bigHuman('base', [0, 0, 0], K_TEEN) });
    drawTeen(r);
    const { group, bones } = skinRig(r.build());
    return finish(group, (a) => poseTeen(bones, a));
  }
  if (opts.onFoot) {
    const r = new RigBuilder({ ...BASE, ...bigHuman('base', [0, 0, 0], K_GIONG) });
    drawBig(r, [0, 0, 0], K_GIONG, (h) => drawGiongRider(h, opts.bamboo ?? false));
    const { group, bones } = skinRig(r.build());
    if (opts.glow) addHalo(group, 1.72, -0.44);
    return finish(group, (a) => poseGiongStand(bones as unknown as Human, a));
  }
  const r = new RigBuilder({ ...BASE, ...ironHorse(K_HORSE), ...bigHuman('qBody', GIONG_AT, K_GIONG) });
  drawIronHorse(r, K_HORSE);
  drawBig(r, GIONG_AT, K_GIONG, (h) => drawGiongRider(h, opts.bamboo ?? false));
  const { group, bones } = skinRig(r.build());
  // Luồng lửa phun nhiều tầng từ mõm ngựa sắt, gắn vào đầu ngựa để theo đầu ngựa gật.
  const flames: THREE.Mesh[] = [];
  const flameRoot = new THREE.Group();
  flameRoot.position.set(0, -0.1 * K_HORSE, 0.34 * K_HORSE);
  bones.qHead.add(flameRoot);
  for (const [rr, len, color, zOff, rx, ry, rz] of [
    [0.125, 0.6, C.fire, 0.25, Math.PI / 2 + 0.06, 0, 0],
    [0.082, 0.44, C.ember, 0.2, Math.PI / 2 + 0.05, 0, 0],
    [0.048, 0.28, FLAME_CORE, 0.14, Math.PI / 2 + 0.04, 0, 0],
    [0.068, 0.4, C.fire, 0.21, Math.PI / 2 + 0.1, 0, 0.24],
    [0.068, 0.4, C.fire, 0.21, Math.PI / 2 + 0.1, 0, -0.24],
  ] as const) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(rr, len, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 }));
    flame.position.set(-Math.sin(rz) * 0.07, 0, zOff);
    flame.rotation.set(rx, ry, rz);
    flameRoot.add(flame);
    flames.push(flame);
  }
  if (opts.glow) addHalo(group, 2.5, -0.44);
  return finish(group, (a) => {
    poseGiongRider(bones as unknown as Human, a);
    const e = a.act === 'fight' && a.strike !== undefined ? Math.sin(Math.PI * a.strike) : 0;
    poseIronHorse(bones, a, e);
    const t = a.time ?? 0;
    flames.forEach((f, i) => f.scale.set(1, 0.78 + 0.42 * Math.abs(Math.sin(t * 10 + i * 1.1)), 1));
  });
}

// ---------- Sơn Tinh ----------

const K_SON = 1.45;
const JADE = 0x5fd89a;

/** Quyền trượng Sơn Thần: cán gỗ cổ thụ bịt đồng, bệ đồng nâng khối đá thiêng 3 đỉnh núi Tản Viên có mạch ngọc sáng và lá rừng. */
function sonStaff(s: Parts): void {
  const p = s.plain;
  // Đốc gậy bịt đồng
  p.cyl(0.032, 0.024, 0.1, C.bronzeDark, 0, -0.22, 0, undefined, 7);
  p.sphere(0.036, C.gold, 0, -0.28, 0, [1, 1, 1], 7);
  // Cán gỗ cổ thụ có các đốt mắt gỗ
  p.cyl(0.032, 0.038, 1.28, C.woodDark, 0, 0.42, 0, undefined, 7);
  for (const y of [0.15, 0.52, 0.85]) {
    p.cyl(0.04, 0.04, 0.03, C.bronze, 0, y, 0, undefined, 8);
  }
  // Bệ đồng Đông Sơn trên đầu trượng
  s.band.cyl(0.068, 0.048, 0.09, C.bronze, 0, 1.05, 0, undefined, 10);
  p.cyl(0.076, 0.068, 0.03, C.gold, 0, 1.1, 0, undefined, 10);
  // Khối Linh Thạch 3 đỉnh Tản Viên + tinh thể ngọc lục bảo ở tâm
  p.sphere(0.088, C.rockDark, 0, 1.19, 0, [1.05, 1.15, 0.95], 8);
  p.cone(0.065, 0.16, C.rock, 0, 1.29, 0, undefined, 6);
  for (const side of [-1, 1]) {
    p.cone(0.048, 0.13, C.rock, side * 0.065, 1.24, 0, [0, 0, -side * 0.35], 5);
  }
  s.glow.sphere(0.032, JADE, 0, 1.2, 0.072, [0.8, 1.2, 0.6], 6);
  // Chồi lá rừng mọc quanh cổ trượng
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    p.cone(0.028, 0.12, C.leaf[i % 4], Math.cos(a) * 0.07, 1.12, Math.sin(a) * 0.07, [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.7], 4);
  }
}

/** Sơn Tinh, chúa vùng non cao: giáp đồng chạm trống đồng, vai đắp đá núi Ba Vì, váy thổ cẩm và lá rừng, mũ Sơn Vương. */
function drawSon(h: HumanRig): void {
  humanBody(h, {
    cloth: C.mountainCloak,
    pattern: true,
    flaps: true,
    top: C.bronze,
    belt: C.bronzeDark,
    armband: C.gold,
    greaves: C.bronzeDark,
    greavesTrim: C.gold,
    knee: C.rock,
    bracer: C.bronzeDark,
    bracerTrim: C.gold,
  });
  // Đai lưng Sơn Vương khảm ngọc xanh, váy lá rừng, phiến đá che hông.
  buckle(h, { color: C.gold, gem: JADE, glow: true });
  leafSkirt(h, { colors: C.leaf, n: 10, to: 0.21 });
  skirtArmor(h, { color: C.rockDark, trim: C.gold, rows: 1, to: 0.23, panels: [0, Math.PI], half: 0.45 });
  // Giáp ngực Đông Sơn, hộ tâm mặt trống đồng, áo choàng rừng già viền đồng.
  armor(h, { color: C.bronze, trim: C.gold, pattern: true, y0: 0.395, y1: 0.6 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.072, rim: C.bronzeDark, thick: 0.02 });
  cloak(h, { color: C.mountainCloak, trim: C.bronze, clasp: C.gold, hem: 0.14 });
  // Giáp vai đá núi Ba Vì: lớp giáp viền vàng, trên đắp khối đá có chóp và mầm cây.
  pauldrons(h, { color: C.rockDark, trim: C.gold, size: 1.05 });
  shoulderRocks(h, { color: C.rock, dark: C.rockDark, sprout: C.leaf[1], size: 1.05 });

  // Khuôn mặt uy nghi có râu ngắn, vành miện đồng khảm ngọc núi, hai sừng vàng, miện lá đồng khảm xanh rừng
  humanHead(h, { brows: true, mustache: C.hair, beard: C.hair, beardLen: 0.1 });
  hairCap(h);
  diadem(h, { color: IRON_DARK, y: 0.8, h: 0.026, puff: 0.014 });
  diadem(h, { color: C.bronze, pattern: true, y: 0.824, h: 0.06, puff: 0.01, edge: C.gold, gem: JADE, glow: true, horns: { color: C.gold, len: 0.085, r: 0.02, out: 1.3 } });
  // Búi tóc buộc dây ngọc; vòng sắt, vành đồng; miện lá đồng khảm xanh rừng, nan ngọc.
  bun(h, { color: C.hair, at: [0, 0.985, -0.03], size: 0.085, tie: JADE });
  mien(h, { ...MIEN, color: C.bronzeLight, inlay: C.leaf[2], bar: JADE, disc: C.gold, discRim: C.bronzeDark, h: 0.28, w: 0.085, y: 0.87, discR: 0.095 });
  h.local('hand', GRIP_R, null, sonStaff);
}

/** Sơn Tinh chống gậy; đi; vung gậy bổ; dời non (giơ gậy quá đầu, dộng xuống đất); thắng thì giơ cao gậy. */
function poseSon(b: Human, a: Act): void {
  beginPose(b, a.time);
  const t = a.time ?? 0;
  // Tay phải chống gậy, gậy khẽ đung đưa; tay trái nắm lại trước ngực.
  b.armR.rotation.z = 0.25;
  b.hand.rotation.set(0.05 + 0.05 * Math.sin(t * 1.3), 0, -0.08);
  b.armL.rotation.set(-1.25, 0.6, 0);
  if (a.skill !== undefined) {
    const k = a.skill;
    const up = k < 0.55 ? smooth(k, 0, 0.3) : 1 - smooth(k, 0.55, 0.75);
    const slam = k >= 0.55 ? smooth(k, 0.55, 0.7) * (1 - smooth(k, 0.85, 1)) : 0;
    b.armR.rotation.set(lerp(-0.3, -3.0, up), 0, 0.2);
    b.armL.rotation.set(lerp(-1.25, -2.7, up), lerp(0.6, 0, up), lerp(0, -0.3, up));
    b.hand.rotation.set(lerp(0.05, -0.2, up), 0, 0);
    b.hips.position.y -= 0.06 * slam;
    b.chest.rotation.x = 0.25 * slam - 0.1 * up;
  } else if (a.win !== undefined) {
    const w = a.win;
    b.armR.rotation.set(-3.0 * w, 0, 0.25);
    b.armL.rotation.set(lerp(-1.25, -2.6, w), lerp(0.6, 0, w), -0.4 * w);
    b.hand.rotation.set(lerp(0.05, -0.2, w), 0, 0);
  } else if (a.act === 'walk') {
    const sw = walkCycle(b, a.phase ?? 0, (a.stride ?? 0.5) * 0.8);
    b.armR.rotation.x = -0.2 + 0.2 * sw;
    b.hand.rotation.set(0.25, 0, -0.08);
    b.armL.rotation.set(-1.25 - 0.15 * sw, 0.6, 0);
  } else if (a.act === 'fight') {
    const e = strikeCurve(a.strike, 0.25, 0.45);
    stance(b, lerp(0.2, 0.45, e), lerp(0.2, 0.35, e));
    b.chest.rotation.set(lerp(-0.08, 0.35, e), lerp(0.2, -0.2, e), 0);
    b.armR.rotation.set(lerp(-2.9, -0.9, e), 0, 0.15);
    b.hand.rotation.set(lerp(-0.6, 1.7, e), 0, 0);
  } else if (a.act === 'dead') {
    fallPose(b, a.fall ?? 1);
  }
  gripHands(b, ARM * K_SON);
}

function sonDefs(rock: boolean): Defs {
  return { ...BASE, ...bigHuman('base', [0, rock ? 0.32 : 0, 0], K_SON) };
}

function drawSonAll(r: Rig, rock: boolean): void {
  if (rock) {
    const p = r.on('base').plain;
    // Bệ núi đá Tản Viên nhiều tầng bậc, đốm rêu xanh và bụi cây rừng
    p.cyl(0.46, 0.64, 0.22, C.rockDark, 0, 0.11, 0, undefined, 8);
    p.cyl(0.34, 0.46, 0.16, C.rock, 0, 0.25, 0, undefined, 7);
    p.cone(0.32, 0.34, C.rock, 0.34, 0.17, -0.18, [0, 0, -0.2], 6);
    p.cone(0.28, 0.3, C.rockDark, -0.34, 0.15, -0.16, [0, 0, 0.22], 6);
    p.sphere(0.24, C.leaf[2], -0.34, 0.12, 0.22, [1.2, 0.65, 1], 7);
    p.cone(0.18, 0.24, C.leaf[1], 0.3, 0.14, 0.24, undefined, 5);
  }
  drawBig(r, [0, rock ? 0.32 : 0, 0], K_SON, drawSon);
}

/**
 * Sơn Tinh. `rock`: đứng trên mỏm đá (khi đứng chờ ở kinh đô). `glow`: hiển linh, có hào quang.
 */
export function makeSonTinh(opts: { rock?: boolean; glow?: boolean } = {}): THREE.Group {
  const rock = opts.rock ?? false;
  const r = new RigBuilder(sonDefs(rock));
  drawSonAll(r, rock);
  const { group, bones } = skinRig(r.build());
  if (opts.glow) addHalo(group, (rock ? 0.32 : 0) + 1.5, -0.38);
  return finish(group, (a) => poseSon(bones as unknown as Human, a));
}

/** Tượng Sơn Tinh bản tĩnh, cho Đền Tản Viên. */
export function bakeSonTinh(): THREE.Group {
  const r = new RigBuilder(sonDefs(false));
  drawSonAll(r, false);
  return bakeRig(r.build(), (b) => poseSon(b as unknown as Human, { act: 'stand' }));
}

// ---------- Thủy Tinh ----------

const K_THUY = 1.28;
const THUY_AT: V3 = [0, 0.36, 0];

/** Đinh ba Hải Vương: cán đồng đen chạm vảy giao long, bầu đồng khảm thủy châu, ba mũi đinh ba uốn vây cá sắc bén. */
function trident(s: Parts): void {
  const p = s.plain;
  // Đốc đinh ba hình vây đuôi cá
  p.cone(0.042, 0.12, C.gold, 0, -0.26, 0, [Math.PI, 0, 0], 5);
  // Cán đồng đen có các khoen vàng
  p.cyl(0.024, 0.028, 1.32, C.bronzeDark, 0, 0.42, 0, undefined, 7);
  for (const y of [0.1, 0.5, 0.82]) {
    p.cyl(0.033, 0.033, 0.028, C.gold, 0, y, 0, undefined, 8);
  }
  // Cổ đinh ba hoa văn trống đồng + viên thủy châu phát sáng
  s.band.cyl(0.048, 0.036, 0.09, C.bronze, 0, 0.98, 0, undefined, 10);
  s.glow.sphere(0.038, C.ghost, 0, 1.04, 0.032, [1, 1, 0.7], 7);
  // Gọng ngang hình sừng thuồng luồng và 3 mũi đinh ba
  p.box(0.26, 0.042, 0.04, C.gold, 0, 1.05, 0);
  for (const side of [-1, 1]) {
    p.box(0.032, 0.14, 0.034, C.bronzeLight, side * 0.115, 1.11, 0, [0, 0, -side * 0.18]);
    p.cone(0.03, 0.22, C.gold, side * 0.13, 1.25, 0, [0, 0, -side * 0.08], 4);
    // Ngạnh vây bên ngoài
    p.cone(0.022, 0.09, C.bronzeLight, side * 0.16, 1.12, 0, [0, 0, -side * 0.85], 4);
  }
  // Mũi chính giữa dài và sắc
  p.cone(0.036, 0.3, C.gold, 0, 1.24, 0, undefined, 4);
}

/** Thủy Tinh, chúa miền nước thẳm: giáp vảy giao long, râu rong biển, mão Long Vương khảm thủy châu, đứng trên xoáy sóng cuộn. */
function drawThuy(r: Rig): void {
  const base = r.on('base');
  const p = base.plain;
  // Xoáy nước biển sâu 2 tầng và 10 ngọn sóng bạc đầu cuộn trào
  p.cyl(0.46, 0.58, 0.22, C.ditchWater, 0, 0.11, 0, undefined, 14);
  p.cyl(0.38, 0.46, 0.16, C.sea, 0, 0.24, 0, undefined, 14);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rad = i % 2 ? 0.44 : 0.4;
    p.cone(
      0.13,
      i % 2 ? 0.38 : 0.3,
      i % 2 ? C.foam : C.sea,
      Math.cos(a) * rad,
      0.32,
      Math.sin(a) * rad,
      [Math.sin(a) * 0.48, 0, -Math.cos(a) * 0.48],
      6,
    );
  }
  p.sphere(0.38, C.foam, 0, 0.31, 0, [1.05, 0.36, 1.05], 12);

  drawBig(r, THUY_AT, K_THUY, (h) => {
    humanBody(h, {
      legs: C.ditchWater,
      cloth: C.sea,
      long: true,
      pattern: true,
      top: C.serpent,
      sleeves: C.sea,
      belt: C.gold,
      armband: C.gold,
      bracer: C.serpent,
      bracerTrim: C.gold,
    });
    // Đai lưng khảm thủy châu phát sáng, vạt bọt sóng trước bụng, tấm giáp hông vảy thuồng luồng.
    buckle(h, { color: C.gold, gem: C.ghost, glow: true });
    apron(h, { color: C.foam, to: 0.14, half: 0.36, pattern: true, trim: C.gold });
    skirtArmor(h, { color: C.serpent, trim: C.gold, rows: 2, to: 0.2, panels: [0, Math.PI], half: 0.48 });
    // Giáp vảy giao long, hộ tâm mặt trống đồng có thủy châu, áo choàng thủy triều viền bọt sóng.
    armor(h, { color: C.serpent, trim: C.gold, rows: 3, scales: true, y0: 0.395, y1: 0.6 });
    chestDisc(h, { color: C.gold, drum: true, r: 0.07, thick: 0.03, boss: C.ghost, glow: true });
    cloak(h, { color: C.sea, trim: C.foam, clasp: C.gold, hem: 0.12 });
    // Giáp vai vây thuồng luồng, gai vây cong vút.
    pauldrons(h, { color: C.serpent, trim: C.gold, layers: 2, size: 1.1, spike: C.gold });

    // Khuôn mặt Long Vương, râu rong biển chẻ hai chòm, mão đồng vàng vây rồng khảm thủy châu, hai sừng giao long.
    humanHead(h, { brows: true, mustache: C.serpent, beard: C.serpent, beardLen: 0.24, beardSplit: true });
    helmet(h, { color: C.bronze, rim: 0.81, band: C.gold, bandH: 0.04, chevron: C.gold, gem: C.ghost, glow: true, horns: { color: C.gold, len: 0.17, r: 0.03 } });
    plumes(h, [C.sea, C.foam, C.gold], { count: 7, len: 0.38, spread: 0.26, y: 0.97, z: -0.06 });
    h.local('hand', GRIP_R, null, trident);
  });
}

/** Thủy Tinh đứng trên sóng (không bước), đâm đinh ba; hô mưa (kỹ năng) thì giơ đinh ba lên trời, ngửa mặt. */
function poseThuy(b: Human, a: Act): void {
  beginPose(b, a.time);
  const t = a.time ?? 0;
  b.armR.rotation.z = 0.22;
  b.hand.rotation.set(0.06, 0, -0.06);
  b.armL.rotation.set(-0.5, 0, -0.35);
  b.chest.rotation.z = 0.05 * Math.sin((a.act === 'walk' ? (a.phase ?? 0) * 0.5 : t * 1.4));
  if (a.skill !== undefined) {
    const up = Math.sin(Math.PI * a.skill);
    b.armR.rotation.set(lerp(0, -3.0, up), 0, 0.2);
    b.armL.rotation.set(lerp(-0.5, -2.6, up), 0, -0.3);
    b.hand.rotation.set(lerp(0.06, -0.15, up), 0, 0);
    b.head.rotation.x = -0.3 * up;
  } else if (a.act === 'fight') {
    const e = strikeCurve(a.strike);
    b.chest.rotation.set(lerp(0.1, 0.3, e), lerp(0.25, -0.25, e), 0);
    b.armR.rotation.set(lerp(-0.5, -1.4, e), 0, lerp(0.15, 0.05, e));
    b.hand.rotation.set(lerp(1.3, 1.57, e), -b.chest.rotation.y, 0);
  } else if (a.act === 'dead') {
    fallPose(b, a.fall ?? 1);
  }
  gripHands(b, ARM * K_THUY);
}

const THUY_DEFS = (): Defs => ({ ...BASE, ...bigHuman('base', THUY_AT, K_THUY) });

/** Thủy Tinh có xương, cho trận đánh. */
export function makeThuyTinh(): THREE.Group {
  const r = new RigBuilder(THUY_DEFS());
  drawThuy(r);
  const { group, bones } = skinRig(r.build());
  return finish(group, (a) => poseThuy(bones as unknown as Human, a));
}

/** Thủy Tinh bản tĩnh. */
export function bakeThuyTinh(): THREE.Group {
  const r = new RigBuilder(THUY_DEFS());
  drawThuy(r);
  return bakeRig(r.build(), (b) => poseThuy(b as unknown as Human, { act: 'stand' }));
}

// ---------- An Dương Vương ----------

const K_ADV = 1.45;

/** Rìu chiến hoàng gia (Việt đồng lưỡi xéo Đông Sơn): cán gỗ mun bịt vàng, tua đỏ, họng rìu khắc hoa văn, lưỡi đồng vàng cong vút. */
function royalAxe(s: Parts): void {
  const p = s.plain;
  p.sphere(0.036, C.gold, 0, -0.18, 0, [1, 1, 1], 7);
  p.cyl(0.024, 0.026, 0.98, C.woodDark, 0, 0.34, 0, undefined, 7);
  for (const y of [0.08, 0.48]) {
    p.cyl(0.031, 0.031, 0.028, C.gold, 0, y, 0, undefined, 8);
  }
  // Tua lụa đỏ dưới cổ rìu
  p.cone(0.048, 0.13, C.red, 0, 0.64, -0.02, [Math.PI - 0.25, 0, 0], 7);
  // Họng rìu khắc hoa văn trống đồng & lưỡi rìu xéo hình thuyền Đông Sơn
  s.band.cyl(0.038, 0.036, 0.14, C.bronze, 0, 0.75, 0, undefined, 10);
  p.box(0.042, 0.25, 0.24, C.bronze, 0, 0.77, 0.11, [0.35, 0, 0]);
  p.box(0.046, 0.28, 0.055, C.gold, 0, 0.78, 0.22, [0.35, 0, 0]);
  p.cone(0.035, 0.14, C.gold, 0, 0.92, 0.19, [0.6, 0, 0], 4);
  // Đỉnh cán rìu đính quả cầu đồng vàng
  p.sphere(0.042, C.gold, 0, 0.87, 0, [1, 1.1, 1], 8);
}

/** An Dương Vương: hoàng bào đỏ son, giáp đồng vàng chạm mặt trống đồng, giáp vai Kim Quy, miện lá vàng khảm đỏ son của vua Âu Lạc. */
function drawAdv(h: HumanRig, crossbow: boolean): void {
  humanBody(h, {
    legs: C.bronzeDark,
    cloth: C.red,
    long: true,
    pattern: true,
    top: C.bronze,
    sleeves: C.red,
    belt: C.gold,
    armband: C.gold,
    hem: C.gold,
    greaves: C.bronzeDark,
    greavesTrim: C.gold,
    bracer: C.bronze,
    bracerTrim: C.gold,
  });
  // Đai vàng đế vương, vạt lễ phục thêu hoa văn trước bụng, phiến giáp đùi mạ vàng.
  buckle(h, { color: C.gold, gem: C.red });
  apron(h, { color: C.gold, to: 0.13, half: 0.38, pattern: true, trim: C.goldDark });
  skirtArmor(h, { color: C.bronze, trim: C.gold, rows: 2, to: 0.2, panels: [0, Math.PI], half: 0.5 });
  // Giáp ngực hoàng gia, gương hộ tâm mặt trống đồng vàng ròng, giáp vai hai tầng, đại hồng bào viền vàng.
  armor(h, { color: C.bronze, trim: C.gold, pattern: true, y0: 0.395, y1: 0.6 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.078, rim: C.goldDark, thick: 0.02 });
  pauldrons(h, { color: C.bronzeLight, trim: C.gold, layers: 2, size: 1.15, spike: C.gold });
  cloak(h, { color: C.red, trim: C.gold, clasp: C.gold, hem: 0.1 });

  // Khuôn mặt đế vương (râu mép + chòm râu cằm), vành miện vàng Âu Lạc chạm hoa văn trống đồng, hồng ngọc giữa trán,
  // miện lá vàng khảm đỏ son có mặt trời trống đồng.
  humanHead(h, { brows: true, mustache: C.hair, beard: C.hair, beardLen: 0.12 });
  hairCap(h);
  // Miện lá vàng khảm đỏ son của vua Âu Lạc: để lộ tóc, vòng sắt, vành vàng, có chóp bậc và tai xoắn.
  diadem(h, { color: IRON_DARK, y: 0.8, h: 0.03, puff: 0.014 });
  diadem(h, { color: C.gold, pattern: true, y: 0.828, h: 0.07, puff: 0.01, edge: C.goldDark, gem: C.red });
  mien(h, { ...MIEN, color: C.gold, inlay: C.red, bar: C.ember, disc: C.gold, discRim: C.goldDark, finial: C.gold, curls: C.gold, h: 0.3, w: 0.085, y: 0.885, discR: 0.1 });

  if (crossbow) {
    // Bao đựng tên thần Liên Châu đeo chéo sau lưng (bằng đồng mạ vàng, cắm 5 mũi tên đồng lửa)
    h.local('chest', [0.13, 0.52, -0.17], [0.18, 0, -0.38], (s) => {
      s.band.cyl(0.058, 0.048, 0.36, C.gold, 0, 0, 0, undefined, 8);
      s.plain.cyl(0.064, 0.064, 0.036, C.bronzeDark, 0, 0.17, 0, undefined, 8);
      s.plain.cyl(0.054, 0.054, 0.03, C.bronzeDark, 0, -0.17, 0, undefined, 8);
      for (const [dx, dz] of [
        [-0.024, -0.01],
        [0.024, -0.01],
        [0, 0.018],
        [-0.014, 0.014],
        [0.014, 0.014],
      ] as const) {
        s.glow.cyl(0.009, 0.009, 0.18, C.ember, dx, 0.24, dz, undefined, 4);
        s.glow.cone(0.024, 0.075, C.fire, dx, 0.35, dz, undefined, 4);
      }
    });
    h.local('hand', GRIP_R, null, (s) => crossbowParts(s, true, 1.15 / K_ADV));
  } else h.local('hand', GRIP_R, null, royalAxe);
}

/**
 * An Dương Vương cầm nỏ thần: nghỉ thì cầm nỏ ngang thắt lưng, mũi chúc xuống; đánh thì nâng nỏ ngang vai ngắm,
 * nỏ giật khi bắn; bắn nỏ thần (kỹ năng) hay thắng trận thì chĩa nỏ lên trời.
 * Cầm rìu (ở kinh đô khi chưa có nỏ): rìu dựng bên phải.
 */
function poseAdv(b: Human, a: Act, crossbow: boolean): void {
  beginPose(b, a.time);
  const t = a.time ?? 0;
  if (!crossbow) {
    b.armR.rotation.z = 0.22;
    b.hand.rotation.set(0.15 + 0.04 * Math.sin(t * 1.2), 0, -0.35);
    b.armL.rotation.set(-0.3, 0, -0.25);
    gripHands(b, ARM * K_ADV);
    return;
  }
  const sky = Math.max(a.skill ?? 0, a.win ?? 0);
  if (a.act === 'walk') walkCycle(b, a.phase ?? 0, (a.stride ?? 0.5) * 0.8);
  if (a.act === 'dead') {
    fallPose(b, a.fall ?? 1);
    b.hand.rotation.x = 1.0;
  } else if (a.act === 'fight' || sky > 0) {
    const k = a.act === 'fight' ? a.strike : undefined;
    const kick = k !== undefined && k < 0.3 ? Math.sin((Math.PI * k) / 0.3) : 0;
    stance(b, 0.15, 0.15);
    b.chest.rotation.set(0.04 - 0.08 * kick, 0.15, 0);
    b.armR.rotation.set(lerp(-1.4 - 0.2 * kick, -2.4, sky), -0.1, 0.05);
    b.armL.rotation.set(lerp(-1.5 - 0.15 * kick, -2.5, sky), 0.4, 0);
    b.hand.rotation.set(lerp(-b.chest.rotation.x - 0.45 * kick, -1.0, sky), -0.15, 0);
  } else {
    b.armR.rotation.set(-0.6, 0, 0.1);
    b.armL.rotation.set(-0.7, 0.55, 0);
    b.hand.rotation.set(0.5 + 0.06 * Math.sin(t * 1.2), 0, 0);
  }
  gripHands(b, ARM * K_ADV);
}

/**
 * An Dương Vương. `crossbow`: cầm nỏ thần đồng vàng; không thì cầm rìu đồng nghi lễ. `glow`: hiển linh, có hào quang.
 */
export function makeAnDuong(opts: { crossbow?: boolean; glow?: boolean } = {}): THREE.Group {
  const crossbow = opts.crossbow ?? false;
  const r = new RigBuilder({ ...BASE, ...bigHuman('base', [0, 0, 0], K_ADV) });
  drawBig(r, [0, 0, 0], K_ADV, (h) => drawAdv(h, crossbow));
  const { group, bones } = skinRig(r.build());
  if (opts.glow) addHalo(group, 1.6, -0.4);
  return finish(group, (a) => poseAdv(bones as unknown as Human, a, crossbow));
}

// ---------- Cao Lỗ ----------

const K_CAO = 1.35;
/** Da thuộc sẫm làm xà cạp, đai đeo. */
const LEATHER_DARK = 0x5e3a20;
/** Tù và đeo bên hông trái (xương riêng để giấu khi đã cầm lên tay). */
const CAO_HORN: V3 = [-0.18, 0.32, 0.08];

/**
 * Cao Lỗ, tướng giỏi chế nỏ: tóc búi cài trâm đồng, râu đen, giáp da khảm đồng có hộ tâm mặt trống đồng, váy chàm
 * hoa văn, miện lá đồng của tướng, bao tên đồng sau lưng, tù và sừng trâu đeo hông, tay phải cầm nỏ liên châu.
 */
function drawCaoLo(h: HumanRig): void {
  humanBody(h, {
    cloth: C.indigo,
    pattern: true,
    flaps: true,
    top: LEATHER,
    belt: C.bronzeDark,
    armband: C.bronze,
    greaves: LEATHER_DARK,
    greavesTrim: C.bronze,
    bracer: LEATHER_DARK,
    bracerTrim: C.bronze,
  });
  // Khóa đai đồng, hai vạt giáp da che hông.
  buckle(h, { color: C.bronze, gem: C.bronzeLight });
  skirtArmor(h, { color: LEATHER, trim: LEATHER_DARK, rows: 2, to: 0.22, panels: [0, Math.PI], half: 0.45 });
  // Giáp da viền đồng, hộ tâm mặt trống đồng, hai hàng đinh đồng khảm quanh ngực, giáp vai da viền đồng.
  armor(h, { color: LEATHER, trim: C.bronze, y0: 0.39, y1: 0.6 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.066, rim: C.bronzeDark, thick: 0.02 });
  const row = (y: number, xs: number[]): [number, number][] => xs.map((x) => [x, y]);
  studs(h, { color: C.bronzeLight, at: [...row(0.44, [-0.12, -0.085, 0.085, 0.12]), ...row(0.54, [-0.12, -0.09, 0.09, 0.12])], thick: 0.02 });
  studs(h, { color: C.bronzeLight, at: [...row(0.44, [-0.07, 0, 0.07]), ...row(0.54, [-0.07, 0, 0.07])], back: true, thick: 0.02 });
  pauldrons(h, { color: LEATHER, trim: C.bronze, size: 1.05 });

  // Bao tên đồng đeo chéo sau lưng, miệng bao qua vai phải, đuôi tên lông đỏ.
  h.local('chest', [0.12, 0.5, -0.17], [0.2, 0, -0.4], (s) => {
    s.band.cyl(0.058, 0.05, 0.38, C.bronze, 0, 0, 0, undefined, 8);
    s.plain.cyl(0.064, 0.064, 0.034, C.bronzeDark, 0, 0.18, 0, undefined, 8);
    s.plain.cyl(0.056, 0.056, 0.03, C.bronzeDark, 0, -0.18, 0, undefined, 8);
    for (const [dx, dz] of [
      [-0.022, -0.012],
      [0.022, -0.012],
      [0, 0.02],
    ] as const) {
      s.plain.cyl(0.008, 0.008, 0.12, C.woodLight, dx, 0.24, dz, undefined, 4);
      s.plain.box(0.006, 0.07, 0.04, C.red, dx, 0.28, dz);
      s.plain.box(0.04, 0.07, 0.006, C.red, dx, 0.28, dz);
    }
  });

  // Mặt cương nghị: mày xếch, râu mép và chòm râu đen; tóc búi cài trâm đồng, vòng sắt và vành đồng quanh trán, miện lá đồng của tướng.
  humanHead(h, { brows: true, mustache: C.hair, beard: C.hair, beardLen: 0.17 });
  hairCap(h);
  diadem(h, { color: IRON_DARK, y: 0.8, h: 0.026, puff: 0.014 });
  diadem(h, { color: C.bronze, pattern: true, y: 0.824, h: 0.043, puff: 0.01 });
  bun(h, { color: C.hair, at: [0, 0.985, -0.01], size: 0.08, tie: C.bronze, pin: { color: C.bronzeLight, len: 0.26, tilt: 0.15 } });
  // Miện lá đồng của tướng: thấp hơn miện vua, không chóp.
  mien(h, { ...MIEN, color: C.bronze, inlay: C.bronzeDark, bar: C.bronzeLight, disc: C.gold, discRim: C.bronzeDark, curls: C.bronze, h: 0.25, w: 0.08, y: 0.852, discR: 0.085 });

  // Tù và sừng trâu đeo hông trái (giấu đi lúc cầm lên thổi), và tù và cầm tay trái (chỉ hiện lúc thổi).
  (h as unknown as Rig).local('tuVa', CAO_HORN, [0.15, Math.PI + 0.35, 0], (s) => {
    hornTrumpet(s, 0.95);
    s.plain.box(0.012, 0.09, 0.012, LEATHER_DARK, 0, 0.05, 0.02);
  });
  h.local('handL', GRIP_L, null, (s) => hornTrumpet(s, 1.0));
  h.local('hand', GRIP_R, null, (s) => repeatingCrossbow(s, 1.05 / K_CAO));
}

/** Năm lần bật dây của nỏ liên châu trong kỹ năng (tiến trình). */
const VOLLEY_SHOTS = [0.28, 0.38, 0.48, 0.58, 0.68];

/**
 * Cao Lỗ: nghỉ thì cầm nỏ ngang thắt lưng, mũi chúc xuống; đánh thì nâng nỏ ngang vai ngắm, nỏ giật khi bắn.
 * `skill` (nỏ liên châu): chĩa nỏ lên trời chừng 50 độ, bắn liền năm phát. `horn` (lệnh bắn): tay trái rút tù và
 * bên hông đưa lên miệng thổi, ngửa đầu, tay phải hạ nỏ. `win`: giơ cao nỏ quá đầu, tay trái giơ nắm đấm.
 */
function poseCaoLo(bones: B, a: Act): void {
  const b = bones as unknown as Human;
  beginPose(b, a.time);
  const t = a.time ?? 0;
  if (a.act === 'walk') walkCycle(b, a.phase ?? 0, (a.stride ?? 0.5) * 0.8);
  const sw = a.act === 'walk' ? Math.sin(a.phase ?? 0) : 0;
  // Cầm nỏ ngang thắt lưng (nghỉ, đi): tay phải nắm báng, tay trái đỡ thân nỏ.
  b.armR.rotation.set(-0.6 + 0.08 * sw, 0, 0.1);
  b.armL.rotation.set(-0.7 - 0.08 * sw, 0.55, 0);
  b.hand.rotation.set(0.5 + 0.05 * Math.sin(t * 1.2), 0, 0);
  let blowing = false;
  if (a.act === 'dead') {
    fallPose(b, a.fall ?? 1);
    b.hand.rotation.x = 1.0;
  } else if (a.horn !== undefined) {
    const k = a.horn;
    const up = smooth(k, 0, 0.2) * (1 - smooth(k, 0.85, 1));
    const blow = k > 0.2 && k < 0.85 ? 1 : 0;
    blowing = up > 0.03;
    stance(b, 0.12, 0.12);
    b.chest.rotation.x = -0.1 * up;
    b.head.rotation.set(-0.12 * up + 0.025 * blow * Math.sin(k * 90), 0, 0);
    b.armL.rotation.set(lerp(-0.25, -2.15, up), lerp(0, 0.05, up), lerp(-0.2, 0.28, up));
    b.handL.rotation.set(lerp(1.2, -0.15, up), lerp(0, -0.45, up), 0);
    b.armR.rotation.set(lerp(-0.6, -0.25, up), 0, lerp(0.1, 0.2, up));
    b.hand.rotation.set(lerp(0.5, 0.85, up), 0, 0);
  } else if (a.skill !== undefined) {
    const k = a.skill;
    const aim = smooth(k, 0, 0.2) * (1 - smooth(k, 0.86, 1));
    let kick = 0;
    for (const s of VOLLEY_SHOTS) if (k >= s && k < s + 0.08) kick = Math.sin((Math.PI * (k - s)) / 0.08);
    stance(b, lerp(0, 0.22, aim), lerp(0, 0.2, aim));
    b.chest.rotation.set(-0.15 * aim + 0.05 * kick, 0.12 * aim, 0);
    b.head.rotation.set(-0.15 * aim, -0.1 * aim, 0);
    b.armR.rotation.set(lerp(-0.6, -2.3 + 0.12 * kick, aim), lerp(0, -0.1, aim), lerp(0.1, 0.12, aim));
    b.armL.rotation.set(lerp(-0.7, -2.45 + 0.12 * kick, aim), lerp(0.55, 0.42, aim), 0);
    b.hand.rotation.set(lerp(0.5, -0.87 - b.chest.rotation.x - 0.3 * kick, aim), lerp(0, -0.12, aim), 0);
  } else if (a.win !== undefined) {
    const w = a.win;
    b.armR.rotation.set(lerp(-0.6, -2.95, w), 0, lerp(0.1, 0.4, w));
    b.armL.rotation.set(lerp(-0.7, -2.7, w), lerp(0.55, 0, w), lerp(0, -0.45, w));
    b.hand.rotation.set(lerp(0.5, -1.55, w), 0, lerp(0, -0.25, w));
    b.chest.rotation.x = -0.1 * w;
  } else if (a.act === 'fight') {
    const k = a.strike;
    const kick = k !== undefined && k < 0.3 ? Math.sin((Math.PI * k) / 0.3) : 0;
    stance(b, 0.15, 0.15);
    b.chest.rotation.set(0.04 - 0.08 * kick, 0.15, 0);
    b.armR.rotation.set(-1.4 - 0.2 * kick, -0.1, 0.05);
    b.armL.rotation.set(-1.5 - 0.15 * kick, 0.4, 0);
    b.hand.rotation.set(-b.chest.rotation.x - 0.45 * kick, -0.15, 0);
  }
  hide(b.handL, !blowing);
  hide(bones.tuVa, blowing);
  gripHands(b, ARM * K_CAO);
}

function caoLoDefs(): Defs {
  const at = (v: V3): V3 => [v[0] * K_CAO, v[1] * K_CAO, v[2] * K_CAO];
  return { ...BASE, ...bigHuman('base', [0, 0, 0], K_CAO), tuVa: { parent: 'hips', at: at(CAO_HORN) } };
}

/** Cao Lỗ cầm nỏ liên châu. `glow`: hiển linh, có hào quang. */
export function makeCaoLo(opts: { glow?: boolean } = {}): THREE.Group {
  const r = new RigBuilder(caoLoDefs());
  drawBig(r, [0, 0, 0], K_CAO, drawCaoLo);
  const { group, bones } = skinRig(r.build());
  if (opts.glow) addHalo(group, 1.5, -0.38);
  return finish(group, (a) => poseCaoLo(bones, a));
}

// ---------- Hai Bà Trưng ----------

/** Cỡ thân Hai Bà, và gốc thân người (giữa hai bàn chân khi đứng) khi ngồi bành voi trận. */
const K_BA = 1.4;
const SEAT_BA = voiTranSeat(K_BA);
/** Hào quang khi hiển linh: sau đầu, dưới tán lọng. */
const HALO_BA: [number, number] = [SEAT_BA[1] + 0.8 * K_BA, SEAT_BA[2] - 0.45];
const LIPS = 0xc0303a;

/** Điểm trên thân Hai Bà (tọa độ thân người) ra tọa độ mô hình. */
const onSeat = (v: V3): V3 => [SEAT_BA[0] + v[0] * K_BA, SEAT_BA[1] + v[1] * K_BA, SEAT_BA[2] + v[2] * K_BA];

/** Áo dài tới chân (`cloth`), quần cùng màu, cổ áo giao lĩnh viền (`trim`), kiềng vàng, đai vàng, vòng tay vàng. */
function drawBaBody(h: HumanRig, cloth: number, trim: number, extra: Partial<BodyLook> = {}): void {
  humanBody(h, { legs: cloth, cloth, long: true, pattern: true, top: cloth, sleeves: cloth, belt: C.gold, armband: C.gold, collar: trim, ...extra });
  necklace(h, { color: C.gold, r: 0.068, y: 0.578, tilt: 0.25 });
}

/** Mặt nữ (Hai Bà, nữ tướng): má hồng, mày cong mảnh, môi son, hoa tai vàng, tóc phủ đỉnh đầu. */
function drawWomanFace(h: HumanRig): void {
  humanHead(h, { earrings: C.gold, femBrows: true, lips: LIPS });
  hairCap(h);
}

/**
 * Đầu Hai Bà: mặt nữ má hồng, mày cong mảnh, môi son, hoa tai vàng; tóc dài xõa lưng, tóc mai, búi sau gáy cài trâm
 * vàng; búp lá vàng bảy lá có chóp bậc, lòng lá màu `inlay` (`bupLa`).
 */
function drawBaHead(h: HumanRig, inlay: number): void {
  drawWomanFace(h);
  hairDown(h, { color: C.hair, to: 0.44, width: 0.17, locks: 0.17 });
  bun(h, { color: C.hair, at: [0, 0.84, -0.245], size: 0.085, pin: { color: C.gold, len: 0.28, tilt: 0.25, ends: C.red } });
  bupLa(h, inlay, 2);
}

/** Trưng Trắc: áo đỏ thắm, giáp ngực đồng hoa văn có hộ tâm mặt trống đồng, giáp vai đồng nhỏ, gươm đồng. */
function drawTrungTrac(h: HumanRig): void {
  drawBaBody(h, C.trungRed, C.gold);
  armor(h, { color: C.bronze, trim: C.gold, pattern: true, y0: 0.392, y1: 0.59, thick: 0.012 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.058, thick: 0.016 });
  pauldrons(h, { color: C.bronzeLight, trim: C.gold, size: 0.9 });
  drawBaHead(h, C.trungRed);
  h.local('hand', GRIP_R, null, guomDong);
}

/** Trưng Nhị: áo vàng cổ viền đỏ, dây đeo đỏ bắt chéo, bao tên đồng sau lưng, cung sừng bịt vàng, tên đồng. */
function drawTrungNhi(h: HumanRig): void {
  drawBaBody(h, C.trungYellow, C.red, { crossStrap: C.red });
  drawBaHead(h, C.red);
  h.local('chest', [0.06, 0.55, -0.15], [-0.3, 0, -0.35], (s) => quiver(s, C.bronze, { iron: false }));
  h.local('handL', GRIP_L, null, (s) => bow(s, true, true));
  h.local('hand', GRIP_R, null, (s) => arrow(s));
}

/** Ngồi bành: hông giữ trên nệm, hai chân duỗi ra trước, hơi dạng. Gọi sau khi đặt tay. */
function sitBa(b: Human): void {
  b.hips.position.copy(b.hips.userData.rest as THREE.Vector3);
  b.legL.rotation.set(-1.4, 0, -0.18);
  b.legR.rotation.set(-1.4, 0, 0.18);
}

/**
 * Trưng Trắc: nghỉ thì gươm dựng trước vai phải; đánh thì giơ gươm quá đầu rồi chém xuống trước mặt (voi dậm chân
 * giơ vòi theo). `skill` (Voi xung trận): voi chồm lên rống, bà giơ cao gươm; voi lao tới, bà rạp người chĩa gươm về
 * trước; rồi về nghỉ. `win`: giơ cao gươm, voi giơ vòi.
 */
function poseTrungTrac(bones: B, a: Act): VoiTranMood {
  const b = bones as unknown as Human;
  beginPose(b, a.time);
  const t = a.time ?? 0;
  const mood: VoiTranMood = {};
  const sway = a.act === 'walk' ? Math.sin((a.phase ?? 0) * 0.55) : 0;
  b.chest.rotation.z = 0.05 * sway;
  b.armR.rotation.set(-0.55, 0, 0.25);
  b.hand.rotation.set(0.15 + 0.04 * Math.sin(t * 1.2), 0, -0.15);
  b.armL.rotation.set(-0.6, 0, -0.15);
  if (a.act === 'dead') {
    const f = a.fall ?? 1;
    fallPose(b, f);
    b.chest.rotation.x = -0.35 * f;
    b.hand.rotation.x = lerp(0.15, -0.9, f);
  } else if (a.skill !== undefined) {
    const k = a.skill;
    const up = smooth(k, 0, 0.12) * (1 - smooth(k, 0.25, 0.38));
    const run = smooth(k, 0.28, 0.38) * (1 - smooth(k, 0.82, 0.95));
    const busy = Math.max(up, run);
    mood.strike = 0;
    mood.rear = smooth(k, 0, 0.12) * (1 - smooth(k, 0.22, 0.32));
    mood.trumpet = smooth(k, 0, 0.1) * (1 - smooth(k, 0.28, 0.4));
    mood.charge = run;
    mood.chargePhase = k * 24;
    b.chest.rotation.set(lerp(-0.15 * up, 0.35, run), 0, 0);
    b.head.rotation.x = lerp(-0.15 * up, -0.3, run);
    b.armR.rotation.set(lerp(lerp(-0.55, -2.5, up), -1.45, run), 0, lerp(lerp(0.25, 0.4, up), 0.1, run));
    b.hand.rotation.set(lerp(lerp(0.15, 0.4, up), 1.25, run), 0, lerp(-0.15, lerp(-0.3, 0, run), busy));
    b.armL.rotation.set(lerp(lerp(-0.6, -1.2, up), -0.9, run), 0, lerp(-0.15, -0.45, busy));
  } else if (a.win !== undefined) {
    const w = a.win;
    mood.strike = 0;
    mood.trumpet = w;
    b.chest.rotation.x = -0.12 * w;
    b.head.rotation.x = -0.15 * w;
    // Gươm chĩa lên trời chếch ra trước, ra ngoài, cho khỏi đâm vào tán lọng.
    b.armR.rotation.set(lerp(-0.55, -2.35, w), 0, lerp(0.25, 0.45, w));
    b.hand.rotation.set(lerp(0.15, 0.5, w), 0, lerp(-0.15, -0.35, w));
    b.armL.rotation.set(lerp(-0.6, -0.35, w), 0, lerp(-0.15, -0.55, w));
  } else if (a.act === 'fight') {
    const e = strikeCurve(a.strike, 0.22, 0.4);
    b.chest.rotation.set(lerp(-0.08, 0.35, e), lerp(0.25, -0.2, e), 0);
    b.head.rotation.set(lerp(0.05, -0.25, e), -b.chest.rotation.y, 0);
    b.armR.rotation.set(lerp(-2.8, -1.0, e), 0, lerp(0.2, 0.05, e));
    b.hand.rotation.set(lerp(-0.7, 1.7, e), 0, 0);
    b.armL.rotation.set(lerp(-0.7, -0.3, e), 0, -0.35);
  }
  sitBa(b);
  gripHands(b, ARM * K_BA);
  return mood;
}

/** Ba vòng phất cờ của Hiệu triệu (tiến trình kỹ năng). */
const WAVE_FROM = 0.28;
const WAVE_TO = 0.78;

/**
 * Trưng Nhị: nghỉ thì cung cầm tay trái dựng bên hông; đánh thì bắn cung như cung thủ (ngồi nghiêng người, kéo dây tới
 * má, buông, rút tên sau vai). `skill` (Hiệu triệu): với ra sau rút cờ chim Lạc, giơ cao, phất ba vòng lớn, rồi cắm
 * lại (voi rống theo). `win`: rút cờ phất mãi, voi giơ vòi.
 */
function poseTrungNhi(bones: B, a: Act): VoiTranMood {
  const b = bones as unknown as Human;
  beginPose(b, a.time);
  const t = a.time ?? 0;
  const mood: VoiTranMood = { strike: 0 };
  const sway = a.act === 'walk' ? Math.sin((a.phase ?? 0) * 0.55) : 0;
  b.chest.rotation.z = 0.05 * sway;
  b.armL.rotation.set(-0.5, 0, -0.2);
  b.handL.rotation.set(-0.05, 0, 0.1);
  b.armR.rotation.set(-0.55, 0, 0.15);
  let arrowOn = false;
  let flagOn = false;
  // Tay phải cầm cờ: với ra sau (`reach`), giơ cao (`raise`), phất vòng (`phi`).
  let reach = 0;
  let raise = 0;
  let phi = 0;
  if (a.act === 'dead') {
    const f = a.fall ?? 1;
    fallPose(b, f);
    b.chest.rotation.x = -0.35 * f;
    b.handL.rotation.x = lerp(-0.05, -0.6, f);
  } else if (a.skill !== undefined) {
    const k = a.skill;
    reach = smooth(k, 0, 0.12) * (1 - smooth(k, 0.13, 0.25)) + smooth(k, 0.82, 0.9) * (1 - smooth(k, 0.93, 1));
    raise = smooth(k, 0.12, 0.28) * (1 - smooth(k, 0.78, 0.88));
    phi = (Math.PI * 2 * 3 * Math.min(Math.max(k - WAVE_FROM, 0), WAVE_TO - WAVE_FROM)) / (WAVE_TO - WAVE_FROM);
    flagOn = k >= 0.12 && k < 0.9;
    mood.trumpet = 0.7 * raise;
  } else if (a.win !== undefined) {
    const w = a.win;
    reach = smooth(w, 0, 0.3) * (1 - smooth(w, 0.3, 0.6));
    raise = smooth(w, 0.35, 1);
    phi = t * 4;
    flagOn = w >= 0.3;
    mood.trumpet = w;
  } else if (a.act === 'fight') {
    const k = a.strike;
    const flick = k !== undefined && k < 0.25 ? Math.sin((Math.PI * k) / 0.25) : 0;
    const back = k !== undefined && k > 0.2 && k < 0.7 ? Math.sin((Math.PI * (k - 0.2)) / 0.5) : 0;
    const yaw = k === undefined ? 0.9 : k < 0.5 ? lerp(0.9, 0.6, smooth(k, 0.1, 0.5)) : lerp(0.6, 0.9, smooth(k, 0.7, 1));
    b.hips.rotation.y = yaw * 0.3;
    b.chest.rotation.y = yaw * 0.7;
    b.head.rotation.set(-0.05, -yaw, 0);
    b.armL.rotation.set(-1.5, -yaw, 0);
    b.handL.rotation.set(0, -yaw, 0.12);
    b.armR.rotation.set(lerp(-1.5, -2.9, back), lerp(lerp(-yaw - 0.05, 0.6, flick), 0.3, back), 0);
    b.hand.rotation.set(Math.PI / 2, -yaw, 0);
    arrowOn = k === undefined || k >= 0.55;
  }
  if (reach > 0 || raise > 0) {
    // Tay cầm cung hạ xuống; vai phải xoay ra sau với cờ, rồi giơ cờ quá đầu phất vòng (đỉnh cờ vẽ vòng tròn, luôn
    // chúc ra trước cho khỏi vướng lọng). Giơ lên thì xoay cán cho lá cờ bay ra bên phải, ngoài tán lọng.
    const wave = raise * Math.sin(phi);
    b.chest.rotation.y = 0.5 * reach - 0.12 * wave;
    b.chest.rotation.x = lerp(b.chest.rotation.x, 0.05, raise);
    b.head.rotation.set(-0.2 * raise, 0.6 * reach, 0);
    b.armL.rotation.set(lerp(-0.5, -0.3, raise), 0, lerp(-0.2, -0.35, raise));
    b.armR.rotation.set(lerp(lerp(-0.55, 0.75, reach), -2.5, raise), 0, lerp(lerp(0.15, 0.6, reach), 0.25 + 0.15 * wave, raise));
    b.hand.rotation.set(
      lerp(lerp(0.3, -0.35, reach), -0.6 * Math.sin(phi), raise),
      lerp(0, -Math.PI / 2, raise),
      lerp(lerp(0, -0.4, reach), -0.35 - 0.3 * Math.cos(phi), raise),
    );
  }
  sitBa(b);
  gripHands(b, ARM * K_BA);
  bones.flagGrip.position.copy(b.hand.position);
  bones.flagGrip.rotation.copy(b.hand.rotation);
  hide(b.hand, !arrowOn);
  hide(bones.flagGrip, !flagOn);
  hide(bones.qFlag, flagOn);
  return mood;
}

/**
 * Trưng Trắc cưỡi voi trận đệm đỏ có mặt trống đồng, lọng đỏ. `glow`: hiển linh, có hào quang. `onFoot`: xuống voi,
 * đứng chầu trong sân Điện (tướng đứng trong sân không cưỡi thú).
 */
export function makeTrungTrac(opts: { glow?: boolean; onFoot?: boolean } = {}): THREE.Group {
  if (opts.onFoot) return standingBa(drawTrungTrac, 'trungTrac', opts.glow);
  const group = makeVoiTran(
    { pad: C.red, trim: C.gold, drum: true, parasol: C.trungRed },
    {
      defs: bigHuman('qBody', SEAT_BA, K_BA),
      draw: (r) => drawBig(r, SEAT_BA, K_BA, drawTrungTrac),
      pose: poseTrungTrac,
    },
  );
  if (opts.glow) addHalo(group, ...HALO_BA);
  return group;
}

/**
 * Trưng Nhị cưỡi voi trận đệm vàng, lọng vàng, cờ đỏ chim Lạc cắm sau bành. `glow`: hiển linh, có hào quang.
 * `onFoot`: xuống voi, đứng chầu trong sân Điện.
 */
export function makeTrungNhi(opts: { glow?: boolean; onFoot?: boolean } = {}): THREE.Group {
  if (opts.onFoot) return standingBa(drawTrungNhi, 'trungNhi', opts.glow);
  const group = makeVoiTran(
    { pad: C.trungYellow, trim: C.red, parasol: C.trungYellow, flag: K_BA },
    {
      defs: { ...bigHuman('qBody', SEAT_BA, K_BA), flagGrip: { parent: 'chest', at: onSeat(GRIP_R) } },
      draw: (r) => {
        drawBig(r, SEAT_BA, K_BA, drawTrungNhi);
        r.place(SEAT_BA, K_BA, () => r.local('flagGrip', GRIP_R, null, coLac));
      },
      pose: poseTrungNhi,
    },
  );
  if (opts.glow) addHalo(group, ...HALO_BA);
  return group;
}

/**
 * Hai Bà đứng chầu trong sân Điện, cùng cỡ Lạc tướng đứng chầu: Trưng Trắc dựng gươm trước vai phải, Trưng Nhị cầm
 * cung dựng bên trái, tay phải buông cầm tên; thở nhẹ.
 */
function standingBa(draw: (h: HumanRig) => void, kind: 'trungTrac' | 'trungNhi', glow = false): THREE.Group {
  const r = new RigBuilder({ ...BASE, ...bigHuman('base', [0, 0, 0], K_LAC) });
  drawBig(r, [0, 0, 0], K_LAC, draw);
  const { group, bones } = skinRig(r.build());
  const b = bones as unknown as Human;
  finish(group, (a) => {
    const t = a.time ?? 0;
    beginPose(b, t);
    if (kind === 'trungTrac') {
      b.armR.rotation.set(-0.35, 0, 0.18);
      b.hand.rotation.set(0.35 + 0.02 * Math.sin(t * 1.3), 0, -0.1);
      b.armL.rotation.set(-0.1, 0, -0.18);
    } else {
      b.armL.rotation.set(-0.35, 0, -0.25);
      b.handL.rotation.set(0.35, 0, 0.1);
      b.armR.rotation.set(-0.05, 0, 0.2);
    }
    gripHands(b, ARM * K_LAC);
  });
  if (glow) addHalo(group, 1.5, -0.38);
  return group;
}

// ---------- Lạc tướng đánh trống trận ----------

/** Dùi trống lúc nghỉ, lúc giơ cao lấy đà, và lúc nện xuống mặt trống (góc chúc xuống, radian). */
export const STICK_POSE = { rest: 0.12, up: -0.75, hit: 0.32 };

const DRUM_Z = 0.56;

/**
 * Lạc tướng đứng sau trống đồng lớn, hai tay cầm dùi, búi tóc, miện ba lá đồng khảm đỏ.
 * Mặt trước hướng +z, trống ở phía trước. `userData.beat(trái, phải)` đặt góc hai dùi (xem STICK_POSE);
 * `userData.face` là mặt trống (có bốn tượng cóc ở vành), để phần vẽ trận làm mặt trống rung.
 */
export function makeDrummer(): THREE.Group {
  const r = new RigBuilder({ ...BASE, ...bigHuman('base', [0, 0, 0], 1.05) });
  const p = r.on('base');
  p.band.cyl(0.38, 0.33, 0.32, C.bronze, 0, 0.26, DRUM_Z, undefined, 18);
  p.plain.cyl(0.395, 0.395, 0.05, C.bronzeDark, 0, 0.41, DRUM_Z, undefined, 18);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    p.plain.cyl(0.03, 0.04, 0.12, C.bronzeDark, Math.cos(a) * 0.28, 0.06, DRUM_Z + Math.sin(a) * 0.28, undefined, 5);
  }
  drawBig(r, [0, 0, 0], 1.05, (h) => {
    humanBody(h, { cloth: C.red, top: C.bronze, armband: C.bronze });
    cloak(h, { color: C.red, hem: 0.17 });
    pauldrons(h, { color: C.bronze, size: 0.85 });
    humanHead(h, { brows: true });
    hairCap(h);
    diadem(h, { color: IRON_DARK, y: 0.8, h: 0.024, puff: 0.014 });
    diadem(h, { color: C.red, y: 0.822, h: 0.036, puff: 0.01 });
    bun(h, { color: C.hair, at: [0, 0.98, -0.03], size: 0.075, tie: C.red });
    mien(h, { ...MIEN, color: C.bronze, inlay: C.red, bar: C.bronzeLight, count: 3, disc: C.gold, discRim: C.bronzeDark, h: 0.22, w: 0.08, y: 0.843, discR: 0.08 });
    for (const [b, at] of [
      ['hand', GRIP_R],
      ['handL', GRIP_L],
    ] as const) {
      h.local(b, at, null, (s) => {
        s.plain.cyl(0.022, 0.026, 0.42, C.woodDark, 0, 0.24, 0, undefined, 5);
        s.plain.sphere(0.055, C.red, 0, 0.46, 0, [1, 1, 1], 8);
      });
    }
  });
  const { group, bones } = skinRig(r.build());
  const h = bones as unknown as Human;
  const beat = (left: number, right: number) => {
    beginPose(h, 0);
    // Tay chĩa về trước, dùi nối dài theo tay; góc dương thì chúc xuống mặt trống.
    h.armL.rotation.set(-Math.PI / 2 + left, 0, 0);
    h.armR.rotation.set(-Math.PI / 2 + right, 0, 0);
    h.handL.rotation.set(Math.PI / 2 + left, 0, 0);
    h.hand.rotation.set(Math.PI / 2 + right, 0, 0);
    h.chest.rotation.x = 0.08;
    gripHands(h, ARM * 1.05);
  };
  beat(STICK_POSE.rest, STICK_POSE.rest);
  group.userData.beat = beat;
  const face = new ToonModel(inkThin);
  face.drum.cyl(0.4, 0.4, 0.035, 0xffffff, 0, 0, 0, undefined, 22);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * 0.32;
    const z = Math.sin(a) * 0.32;
    face.plain.sphere(0.05, C.bronzeDark, x, 0.04, z, [1, 0.7, 1.2], 7);
    face.plain.sphere(0.028, C.bronzeDark, x, 0.075, z + 0.03, [1, 0.9, 1], 6);
  }
  const faceGroup = face.group();
  faceGroup.position.set(0, 0.45, DRUM_Z);
  group.add(faceGroup);
  group.userData.face = faceGroup;
  return group;
}

// ---------- Sân chầu Điện: Lạc tướng đứng chầu, Vua Hùng ngồi ngai vàng ----------

const K_LAC = 1.3;

/** Lạc tướng đứng chầu: khố đỏ hoa văn, giáp đồng có gương hộ tâm, áo choàng đỏ, búi tóc, miện ba lá đồng khảm đỏ, giáo mũi sắt, khiên mặt trống. */
function drawLacTuong(h: HumanRig): void {
  humanBody(h, { cloth: C.red, top: C.bronze, belt: C.bronze, armband: C.bronze, greaves: C.bronze, drumPlate: true });
  cloak(h, { color: C.red, trim: C.bronzeDark, hem: 0.16 });
  pauldrons(h, { color: C.bronze, size: 0.85 });
  humanHead(h, { brows: true, mustache: C.hair });
  hairCap(h);
  diadem(h, { color: IRON_DARK, y: 0.8, h: 0.024, puff: 0.014 });
  diadem(h, { color: C.red, y: 0.822, h: 0.036, puff: 0.01 });
  bun(h, { color: C.hair, at: [0, 0.98, -0.03], size: 0.075, tie: C.red });
  mien(h, { ...MIEN, color: C.bronze, inlay: C.red, bar: C.bronzeLight, count: 3, disc: C.gold, discRim: C.bronzeDark, h: 0.22, w: 0.08, y: 0.843, discR: 0.08 });
  h.local('hand', GRIP_R, null, (s) => spear(s, 1, 1.45));
  h.local('armL', [-0.2, 0.39, 0.06], null, (s) => drumShield(s, false, 0.17));
}

/** Đứng nghiêm, giáo dựng bên phải, khiên trước bụng, thở nhẹ. */
function poseLacTuong(b: Human, a: Act): void {
  const t = a.time ?? 0;
  beginPose(b, t);
  b.armL.rotation.set(-0.45, 0, -0.28);
  b.hand.rotation.set(0.06 + 0.02 * Math.sin(t * 1.3), 0, -0.06);
  gripHands(b, ARM * K_LAC);
}

/** Lạc tướng đứng chầu trong sân Điện (ở bãi chiến thì là người đánh trống, `makeDrummer`). */
export function makeLacTuong(): THREE.Group {
  const r = new RigBuilder({ ...BASE, ...bigHuman('base', [0, 0, 0], K_LAC) });
  drawBig(r, [0, 0, 0], K_LAC, drawLacTuong);
  const { group, bones } = skinRig(r.build());
  return finish(group, (a) => poseLacTuong(bones as unknown as Human, a));
}

const K_VUA = 1.45;
/** Chỗ vua ngồi chạm mặt ngai, tính từ gốc tượng (giữa hai bàn chân lúc đứng): mặt dưới đùi khi ngồi. */
export const VUA_SEAT = (HUMAN.legL.at[1] - 0.045) * K_VUA;

/**
 * Vua Hùng: hoàng bào đỏ son dài dệt hoa văn trống đồng, áo vàng nghệ, đai vàng, gương đồng hộ tâm, áo choàng đỏ sau
 * lưng, râu tóc bạc, để lộ tóc, miện lá vàng năm lá có vòng sắt, nửa mặt trời trống đồng trước trán, chóp bậc, tai xoắn.
 */
function drawVuaHung(h: HumanRig): void {
  humanBody(h, { cloth: C.red, long: true, pattern: true, top: C.ripe, sleeves: C.ripe, belt: C.gold, armband: C.gold, drumPlate: true, collar: C.red, hem: C.gold });
  buckle(h, { color: C.gold, gem: C.red });
  // Vạt lễ phục ngắn (vua ngồi, đùi nằm ngang trước bụng).
  apron(h, { color: C.gold, to: 0.3, half: 0.34, pattern: true });
  cloak(h, { color: C.red, trim: C.gold, hem: 0.16, half: 1.0 });
  // Vai áo vàng viền đỏ và chuỗi hạt đồng trước ngực.
  pauldrons(h, { color: C.ripe, trim: C.red, size: 1.1 });
  necklace(h, { color: C.bronzeLight, r: 0.1, y: 0.57, z: 0.06, tilt: 0.5, thick: 0.012, half: true });
  humanHead(h, { brows: true, browColor: C.beard, mustache: C.beard, beard: C.beard, beardLen: 0.22 });
  hairCap(h, C.beard);
  // Miện lá vàng của Vua Hùng (chủ dự án chốt): để lộ tóc, vòng sắt dưới cùng, vành vàng cao có hoa văn, hồng ngọc,
  // nửa mặt trời trống đồng mọc trên vành, năm lá nhỏ ít xòe lòng khảm đồng sẫm, chóp bậc, tai xoắn.
  diadem(h, { color: IRON_DARK, y: 0.8, h: 0.03, puff: 0.014 });
  diadem(h, { color: C.gold, pattern: true, y: 0.828, h: 0.075, puff: 0.01, edge: C.goldDark, gem: C.red });
  mien(h, { ...MIEN, color: C.gold, inlay: C.bronzeDark, bar: C.gold, disc: C.gold, discRim: C.goldDark, finial: C.gold, curls: C.gold, h: 0.32, w: 0.088, y: 0.89, discR: 0.105 });
}

/** Vua Hùng ngồi ngai vàng, bản tĩnh (ngồi yên) để đặt vào mô hình Điện: lưng thẳng, đùi gần nằm ngang, hai tay đặt trên gối. */
export function bakeVuaHung(): THREE.Group {
  const r = new RigBuilder({ ...BASE, ...bigHuman('base', [0, 0, 0], K_VUA) });
  drawBig(r, [0, 0, 0], K_VUA, drawVuaHung);
  return bakeRig(r.build(), (bones) => {
    const b = bones as unknown as Human;
    beginPose(b, 0);
    b.legL.rotation.order = b.legR.rotation.order = 'YXZ';
    b.legL.rotation.set(-1.32, 0.1, 0);
    b.legR.rotation.set(-1.32, -0.1, 0);
    b.armL.rotation.set(-0.95, 0.2, -0.16);
    b.armR.rotation.set(-0.95, -0.2, 0.16);
    b.chest.rotation.x = -0.03;
    gripHands(b, ARM * K_VUA);
  });
}

// ---------- Lạc Long Quân và Âu Cơ (tượng ở Đền Rồng Tiên) ----------

/** Cỡ hai tượng tổ: bằng Vua Hùng. */
const K_TO = 1.45;
/** Áo choàng xanh rêu biển của Lạc Long Quân; áo hồng phấn, áo choàng lông chim trắng của Âu Cơ. */
const SEA_MOSS = 0x3f7a5c;
const AU_CO_PINK = 0xf2b8c0;
const FEATHER_WHITE = 0xf6f1e6;

/**
 * Lạc Long Quân, giống rồng ở biển: áo dài xanh biển viền vàng, giáp vảy rồng xanh lục, hộ tâm mặt trống đồng, áo
 * choàng xanh rêu viền bọt sóng, mũ đồng vành vàng có hai sừng rồng và chùm lông chim, râu đen, gươm đồng.
 */
function drawLacLongQuan(h: HumanRig): void {
  humanBody(h, { cloth: C.sea, long: true, pattern: true, top: C.serpent, sleeves: C.sea, belt: C.gold, armband: C.gold, collar: C.gold, hem: C.gold });
  buckle(h, { color: C.gold, gem: C.ghost });
  armor(h, { color: C.serpent, trim: C.gold, rows: 3, scales: true, y0: 0.395, y1: 0.6 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.06, thick: 0.02 });
  cloak(h, { color: SEA_MOSS, trim: C.foam, clasp: C.gold, hem: 0.12 });
  pauldrons(h, { color: C.serpent, trim: C.gold, size: 1.0 });
  humanHead(h, { brows: true, mustache: C.hair, beard: C.hair, beardLen: 0.2 });
  hairCap(h);
  helmet(h, { color: C.bronze, rim: 0.81, band: C.gold, bandH: 0.04, gem: C.ghost, horns: { color: C.gold, len: 0.16, r: 0.028 } });
  plumes(h, [C.sea, C.gold, C.cream], { count: 7, len: 0.38, spread: 0.24, y: 0.97, z: -0.06 });
  h.local('hand', GRIP_R, null, guomDong);
}

/**
 * Âu Cơ, giống tiên ở núi: áo hồng phấn, váy dài trắng ngà hoa văn, kiềng vàng, áo choàng lông chim trắng viền vàng;
 * tóc dài xõa lưng, búi cài trâm, búp lá vàng bảy lá lòng hồng phấn.
 */
function drawAuCo(h: HumanRig): void {
  humanBody(h, { legs: C.cream, cloth: C.cream, long: true, pattern: true, top: AU_CO_PINK, sleeves: AU_CO_PINK, belt: C.gold, armband: C.gold, collar: C.gold });
  necklace(h, { color: C.gold, r: 0.068, y: 0.578, tilt: 0.25 });
  cloak(h, { color: FEATHER_WHITE, trim: C.gold, hem: 0.1, flare: 0.08 });
  drawWomanFace(h);
  hairDown(h, { color: C.hair, to: 0.4, width: 0.17, locks: 0.17 });
  bun(h, { color: C.hair, at: [0, 0.84, -0.245], size: 0.085, pin: { color: C.gold, len: 0.28, tilt: 0.25, ends: C.red } });
  bupLa(h, AU_CO_PINK, 2);
}

/** Tượng Lạc Long Quân bản tĩnh cho Đền Rồng Tiên: đứng thẳng, gươm đồng dựng trước vai phải. */
export function bakeLacLongQuan(): THREE.Group {
  const r = new RigBuilder({ ...BASE, ...bigHuman('base', [0, 0, 0], K_TO) });
  drawBig(r, [0, 0, 0], K_TO, drawLacLongQuan);
  return bakeRig(r.build(), (bones) => {
    const b = bones as unknown as Human;
    beginPose(b, 0);
    b.armR.rotation.set(-0.35, 0, 0.18);
    b.hand.rotation.set(0.35, 0, -0.1);
    b.armL.rotation.set(-0.1, 0, -0.18);
    gripHands(b, ARM * K_TO);
  });
}

/** Tượng Âu Cơ bản tĩnh cho Đền Rồng Tiên: đứng thẳng, hai tay chắp trước ngực. */
export function bakeAuCo(): THREE.Group {
  const r = new RigBuilder({ ...BASE, ...bigHuman('base', [0, 0, 0], K_TO) });
  drawBig(r, [0, 0, 0], K_TO, drawAuCo);
  return bakeRig(r.build(), (bones) => {
    const b = bones as unknown as Human;
    beginPose(b, 0);
    b.armL.rotation.set(-1.15, 0, 0.42);
    b.armR.rotation.set(-1.15, 0, -0.42);
    gripHands(b, ARM * K_TO);
  });
}

// ---------- Bốn nữ tướng của Hai Bà ----------

/** Cỡ thân nữ tướng: nhỏ hơn Hai Bà đứng chầu (`K_LAC` 1,3) một chút, cho thấy là phó tướng. */
const K_NU = 1.22;
/** Ba xương lá cờ nối nhau từ cán ra, cho cờ bay lượn sóng. */
const NU_FLAG = ['nuFlag0', 'nuFlag1', 'nuFlag2'] as const;
/** Chỗ buộc khúc cờ `i` (tọa độ thân người, tư thế gốc): trên cán cờ cầm tay trái. */
const nuFlagAt = (i: number): V3 => [GRIP_L[0], GRIP_L[1] + CO_NU.top, GRIP_L[2] - i * CO_NU.w];
/** Cổ em bé địu sau lưng Phùng Thị Chính (tọa độ thân người): sau vai phải, đầu ló qua vai. */
const NU_BABY: V3 = [0.19, 0.64, -0.2];
/** Lúc phất cờ hô quân, vũ khí tay phải chĩa về trước (góc đồ cầm tay). */
const NU_POINT = 0.75;

interface NuLook {
  /** Áo dài, quần cùng màu; lá cờ và lòng búp lá trên đầu cùng màu áo. */
  cloth: number;
  /** Viền cổ áo, viền và tua cờ. */
  trim: number;
  /** Thêm cho thân: giáp, dây đeo, bao cổ tay. */
  body?: Partial<BodyLook>;
  /** Đồ đeo sau lưng và vũ khí tay phải. */
  gear: (h: HumanRig, r: Rig) => void;
  /** Lúc đứng: góc cánh tay phải và góc đồ cầm tay phải. */
  armR: V3;
  hand: V3;
}

/** Xoay `rot` (thứ tự XYZ như `RigBuilder.local`) rồi nghiêng thêm `tilt` quanh trục z của mô hình (trong mặt lưng). */
function tilted(rot: V3, tilt: number): V3 {
  const q = new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(0, 0, 1), tilt)
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)));
  const e = new THREE.Euler().setFromQuaternion(q);
  return [e.x, e.y, e.z];
}

/**
 * Đầu nữ tướng: mặt nữ như Hai Bà; tóc búi cao sau gáy cài trâm vàng, tóc mai ngắn (không xõa lưng như Hai Bà, chừa
 * chỗ đeo nỏ, cung, địu con); búp lá đồng năm lá, lòng lá màu áo (Hai Bà bảy lá vàng có chóp).
 */
function drawNuHead(h: HumanRig, inlay: number): void {
  drawWomanFace(h);
  hairDown(h, { color: C.hair, to: 0.63, width: 0.15, locks: 0.12 });
  bun(h, { color: C.hair, at: [0, 0.9, -0.2], size: 0.09, pin: { color: C.gold, len: 0.24, tilt: 0.25 } });
  bupLa(h, inlay, 1);
}

/**
 * Địu con của Phùng Thị Chính: túi địu vải chàm dệt hoa văn ôm lưng, quai qua hai vai (dây chéo trước ngực vẽ ở
 * thân); em bé quấn khăn đỏ ngồi trong túi, đầu đội mũ khăn đỏ ló qua vai phải (xương `nuBe`, ngó quanh).
 */
function drawDiuCon(h: HumanRig): void {
  figure(h, 'diuCon', (detail) => {
    // Túi địu ôm lưng, bọc khăn đỏ của em bé ló trên miệng túi.
    const bag = new Clay(C.diuCham);
    bag.add('chest', ellipsoid([0.04, 0.45, -0.2], [0.13, 0.14, 0.08]), { k: 0 });
    bag.add('chest', ellipsoid([0.12, 0.555, -0.215], [0.085, 0.065, 0.075]), { k: 0.04 });
    bag.sub('chest', ellipsoid([0.02, 0.45, -0.07], [0.2, 0.25, 0.08]), 0.02);
    const wrap = bag.layer('chest', (x, y, z) => Math.max(0.52 - y, Math.hypot(x - 0.13, z + 0.215) - 0.12), C.red);
    const bagMesh = bag.build({ kind: 'nets', min: [-0.12, 0.29, -0.31], max: [0.24, 0.64, -0.1], cell: 0.012 / detail, target: Math.round(420 * detail) }, [wrap]);
    // Em bé: đầu tròn, mũ khăn đỏ có núm, mắt, má hồng.
    const [x, y, z] = NU_BABY;
    const be = new Clay(C.skin);
    be.add('nuBe', ellipsoid([x, y + 0.075, z], [0.085, 0.081, 0.081]), { k: 0 });
    be.add('nuBe', ellipsoid([x, y + 0.1, z - 0.045], [0.092, 0.088, 0.078]), { k: 0.01 });
    be.add('nuBe', sphere([x, y + 0.18, z - 0.05], 0.032), { k: 0.012 });
    const on = (dx: number, dy: number): V3 => hit(be.dist, [x + dx, y + dy, z + 0.4], [0, 0, -1]) ?? [x + dx, y + dy, z + 0.08];
    const paints = [
      be.layer('nuBe', (px, py, pz) => Math.max(ellipsoid([x, y + 0.1, z - 0.045], [0.095, 0.091, 0.081])(px, py, pz), y + 0.095 - py - 0.04 * (pz - z)), C.red),
      be.layer('nuBe', sphere([x, y + 0.18, z - 0.05], 0.04), C.red),
      ...[-1, 1].flatMap((sd) => [be.layer('nuBe', ellipsoid(on(sd * 0.03, 0.07), [0.013, 0.018, 0.02]), C.ink, 1), be.layer('nuBe', ellipsoid(on(sd * 0.047, 0.045), [0.016, 0.01, 0.02]), 0xe58a6a)]),
    ];
    const beMesh = be.build({ kind: 'radial', c: [x, y + 0.09, z], detail: Math.max(2, Math.round(3 * detail)), rmax: 0.2 }, paints);
    return [clayPiece(bagMesh), clayPiece(beMesh)];
  });
}

const NU_LOOK: Record<NuTuongId, NuLook> = {
  // Lê Chân (lập trang An Biên ven biển, lo lính nỏ): áo lam biển viền kem, hộ tâm đồng, nỏ đeo chéo sau lưng (dây da
  // bắt chéo trước ngực), tay phải giơ kiếm ngắn sắt chếch trước vai.
  leChan: {
    cloth: C.nuLam,
    trim: C.cream,
    body: { plate: C.bronzeLight, crossStrap: LEATHER },
    gear: (h) => {
      // Báng nằm ngang lưng, đầu nỏ sang phải; cánh nỏ dựng đứng ngoài vai phải cho nhìn trước, nhìn sau đều thấy.
      h.local('chest', [-0.02, 0.42, -0.2], tilted([-Math.PI / 2, Math.PI / 2, 0], 0.25), (s) => crossbowParts(s, false, 0.75));
      h.local('hand', GRIP_R, null, doanKiem);
    },
    armR: [-0.9, 0, 0.25],
    hand: [-0.45, 0, -0.35],
  },
  // Thánh Thiên (lo cung thủ): áo lục lá viền vàng, bao cổ tay da, bao tên da sau vai phải, cung sừng đeo chéo lưng.
  thanhThien: {
    cloth: C.nuLuc,
    trim: C.gold,
    body: { crossStrap: LEATHER, wristband: LEATHER },
    gear: (h, r) => {
      h.local('chest', [0.1, 0.52, -0.16], [-0.3, 0, -0.35], (s) => quiver(s, LEATHER, { iron: false }));
      // Cung sừng to (1,2 lần cung lính) đeo chếch sau lưng: đầu trên sau gáy, đầu dưới ló ngoài hông phải.
      r.place([0.02, 0.5, -0.25], 1.2, () => h.local('chest', [0, 0, 0], tilted([0, -Math.PI / 2, 0], 0.3), (s) => bow(s, true)));
    },
    armR: [-0.1, 0, 0.22],
    hand: [0, 0, 0],
  },
  // Bát Nàn (lo giáo binh): áo tím hoa cà viền vàng, gương đồng hộ tâm, giáp vai đồng, tay phải cầm giáo mũi sắt dựng đứng.
  batNan: {
    cloth: C.nuTim,
    trim: C.gold,
    body: { drumPlate: true },
    gear: (h) => {
      pauldrons(h, { color: C.bronzeLight, size: 0.88 });
      h.local('hand', GRIP_R, null, (s) => spear(s, 1, 1.45));
    },
    armR: [-0.12, 0, 0.2],
    hand: [0.1, 0, -0.06],
  },
  // Phùng Thị Chính (lo voi chiến): áo hồng sen viền kem, địu con vải chàm sau lưng, tay phải dựng gươm đồng chếch ngoài vai phải.
  phungThiChinh: {
    cloth: C.nuHong,
    trim: C.cream,
    body: { crossStrap: C.diuCham },
    gear: (h) => {
      drawDiuCon(h);
      h.local('hand', GRIP_R, null, guomDong);
    },
    armR: [-0.35, 0, 0.18],
    hand: [0.3, 0, -0.35],
  },
};

/**
 * Nữ tướng không đánh. Đứng: tay trái dựng cờ cạnh hông, thở nhẹ, cờ bay phấp phới. Đi: vẫn dựng cờ, tay phải vung
 * theo bước. `fight` là phất cờ hô quân: ưỡn người giơ cờ cao quá đầu phất qua lại (theo `time`), tay phải chĩa vũ khí
 * về trước. `win`: giơ cờ và vũ khí lên trời. `dead` thì cứ đứng.
 */
function poseNu(bones: B, a: Act, look: NuLook): void {
  const b = bones as unknown as Human;
  const t = a.time ?? 0;
  beginPose(b, t);
  b.armL.rotation.set(-0.5, 0, -0.26);
  b.handL.rotation.set(0, 0, 0.03);
  b.armR.rotation.set(...look.armR);
  b.hand.rotation.set(...look.hand);
  // Cờ lệch ra ngoài `bias`, mỗi khúc lượn chậm hơn khúc trong một nhịp.
  let speed = 2.6;
  let amp = 0.2;
  let bias = 0.35;
  if (a.win !== undefined) {
    const w = a.win;
    b.chest.rotation.x = -0.1 * w;
    b.head.rotation.x = -0.18 * w;
    b.armL.rotation.set(lerp(-0.5, -2.75, w), 0, lerp(-0.26, -0.42, w));
    b.handL.rotation.set(0, 0, lerp(0.03, 0.18 + 0.22 * Math.sin(t * 4), w));
    b.armR.rotation.set(lerp(look.armR[0], -2.75, w), 0, lerp(look.armR[2], 0.42, w));
    b.hand.rotation.set(lerp(look.hand[0], -0.15, w), 0, lerp(look.hand[2], -0.22, w));
    speed = lerp(2.6, 6, w);
    amp = lerp(0.2, 0.38, w);
    bias = lerp(0.35, 0.2, w);
  } else if (a.act === 'walk') {
    const sw = walkCycle(b, a.phase ?? 0, (a.stride ?? 0.5) * 0.8);
    b.armL.rotation.set(-0.55 - 0.06 * sw, 0, -0.26);
    b.handL.rotation.set(0.05 * sw, 0, 0.03);
    b.armR.rotation.set(look.armR[0] + 0.3 * sw, 0, look.armR[2]);
    b.hand.rotation.set(look.hand[0] + 0.08 * sw, 0, look.hand[2]);
    speed = 4.2;
    amp = 0.28;
    bias = 0.45;
  } else if (a.act === 'fight') {
    const wave = Math.sin(t * 3.4);
    stance(b, 0.22, 0.18);
    b.chest.rotation.set(-0.08, 0.12, 0.04 * wave);
    b.head.rotation.set(-0.15, -0.12, 0);
    b.armL.rotation.set(-2.65, 0, -0.4 - 0.08 * wave);
    b.handL.rotation.set(-0.05, 0, 0.12 + 0.3 * wave);
    b.armR.rotation.set(-1.3, 0, 0.14);
    b.hand.rotation.set(NU_POINT, 0, 0);
    speed = 7;
    amp = 0.4;
    bias = 0.25;
  }
  gripHands(b, ARM * K_NU);
  NU_FLAG.forEach((name, i) => {
    bones[name].rotation.y = (i ? 0 : bias) + amp * (1 + 0.2 * i) * Math.sin(t * speed - i * 1.1);
  });
  const be = bones.nuBe as THREE.Bone | undefined;
  if (be) {
    const bob = a.act === 'walk' ? 0.1 * Math.sin((a.phase ?? 0) * 2) : 0.05 * Math.sin(t * 1.7);
    be.rotation.set(bob, 0.45 + 0.4 * Math.sin(t * 0.8), 0);
  }
}

/**
 * Nữ tướng của Hai Bà (`kind`): đứng, không cưỡi thú, cỡ thân 1,22 (đỉnh đầu 1,17, đỉnh búp lá 1,49; Hai Bà đứng
 * chầu 1,8), mặt trước hướng +z, gốc ở giữa hai bàn chân. Mỗi người một màu áo, lá cờ cùng màu cầm tay trái: chóp cờ
 * cao 2,57 lúc đứng, 2,84 lúc phất cờ (cờ phất ra tới 1,9 bên trái), 3,06 lúc giơ cờ thắng trận. `userData.pose` đặt
 * tư thế (xem `poseNu`). `glow`: hiển linh, có hào quang sau đầu.
 */
export function makeNuTuong(kind: NuTuongId, opts: { glow?: boolean } = {}): THREE.Group {
  const look = NU_LOOK[kind];
  const extra: Defs = {};
  NU_FLAG.forEach((name, i) => (extra[name] = { parent: i ? NU_FLAG[i - 1] : 'handL', at: nuFlagAt(i) }));
  if (kind === 'phungThiChinh') extra.nuBe = { parent: 'chest', at: NU_BABY };
  const r = new RigBuilder({ ...BASE, ...bigHuman('base', [0, 0, 0], K_NU), ...(moveBones(extra, 'base', [0, 0, 0], K_NU) as Defs) });
  drawBig(r, [0, 0, 0], K_NU, (h) => {
    drawBaBody(h, look.cloth, look.trim, { belt: C.bronze, armband: C.bronze, ...look.body });
    drawNuHead(h, look.cloth);
    h.local('handL', GRIP_L, null, (s) => coNuCan(s, look.trim));
    NU_FLAG.forEach((name, i) => r.local(name, nuFlagAt(i), null, (s) => coNuLa(s, i, look.cloth, look.trim)));
    look.gear(h, r);
  });
  const { group, bones } = skinRig(r.build());
  if (opts.glow) addHalo(group, 1.35, -0.45);
  return finish(group, (a) => poseNu(bones, a, look));
}
