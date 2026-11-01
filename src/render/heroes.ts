// Các tướng có khung xương (rig.ts, body.ts): Thánh Gióng ba dáng và ngựa sắt, Sơn Tinh, Thủy Tinh, An Dương Vương,
// và Lạc tướng đánh trống trận ở bãi chiến. Tướng to hơn lính: thân người thường phóng to bằng `place` + `moveBones`.

import * as THREE from 'three';
import type { GiongLook } from '../game/giong';
import { quadFall, quadWalk } from './beasts';
import {
  GRIP_L,
  GRIP_R,
  HUMAN,
  beginPose,
  fallPose,
  featherCrown,
  gripHands,
  hairCap,
  headband,
  humanBody,
  humanHead,
  lerp,
  smooth,
  stance,
  strikeCurve,
  walkCycle,
  type Human,
  type HumanRig,
} from './body';
import { C } from './palette';
import { RigBuilder, bakeRig, moveBones, skinRig, type Act, type BoneDef, type Bones, type Poser } from './rig';
import { ToonModel, inkThin } from './toon';
import { IRON, IRON_DARK, crossbowParts, type Parts } from './weapons';

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

const IRON_HORSE: Defs = {
  qBody: { parent: 'base', at: [0, 0.82, 0] },
  qFL: { parent: 'qBody', at: [-0.175, 0.65, 0.34] },
  qFR: { parent: 'qBody', at: [0.175, 0.65, 0.34] },
  qBL: { parent: 'qBody', at: [-0.175, 0.65, -0.34] },
  qBR: { parent: 'qBody', at: [0.175, 0.65, -0.34] },
  qNeck: { parent: 'qBody', at: [0, 0.96, 0.32] },
  qHead: { parent: 'qNeck', at: [0, 1.32, 0.58] },
  qTail: { parent: 'qBody', at: [0, 0.96, -0.48] },
};

/** Ngựa sắt của Gióng: thiết giáp đóng đinh tán đồng, ngực gắn mặt trống đồng, lò lửa trong sườn, bờm và đuôi lửa nhiều tầng. */
function drawIronHorse(r: Rig): void {
  const body = r.on('qBody');
  const p = body.plain;

  // Thân ngựa sắt 3 khối cơ bắp (ngực nở, bụng thon, mông nở) và khe lò lửa hai bên sườn.
  p.sphere(0.35, IRON, 0, 0.82, 0, [0.82, 0.82, 1.42], 14);
  p.sphere(0.31, IRON_LIGHT, 0, 0.86, 0.24, [0.88, 0.86, 0.95], 12);
  p.sphere(0.3, IRON, 0, 0.85, -0.26, [0.84, 0.84, 0.95], 12);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = 0.14 - i * 0.11;
      body.glow.box(0.025, 0.13 - i * 0.015, 0.04, i % 2 ? C.ember : C.fire, s * 0.278, 0.78 + i * 0.01, z, [0.2, 0, s * 0.12]);
      p.box(0.03, 0.16, 0.03, IRON_DARK, s * 0.275, 0.78 + i * 0.01, z + 0.045, [0.2, 0, s * 0.12]);
    }
  }

  // Giáp ngực gắn mặt trống đồng Đông Sơn + giáp ốp vai và mông đóng đinh tán vàng.
  body.band.cyl(0.31, 0.33, 0.16, C.bronze, 0, 0.84, 0.27, [0.25, 0, 0], 14);
  body.drum.cyl(0.14, 0.14, 0.04, C.gold, 0, 0.85, 0.56, [Math.PI / 2 - 0.15, 0, 0], 16);
  p.add(new THREE.TorusGeometry(0.145, 0.02, 6, 20), C.bronzeDark, 0, 0.85, 0.57, [-0.15, 0, 0]);
  for (const s of [-1, 1]) {
    p.sphere(0.18, IRON_DARK, s * 0.24, 0.82, 0.3, [0.55, 0.85, 1.1], 10);
    p.box(0.04, 0.05, 0.34, C.bronze, s * 0.31, 0.75, 0.3, [0.15, s * 0.15, 0]);
    for (const dz of [-0.1, 0, 0.1]) p.sphere(0.024, C.gold, s * 0.325, 0.84, 0.3 + dz, [1, 1, 1], 6);
    p.sphere(0.17, IRON_DARK, s * 0.22, 0.86, -0.3, [0.55, 0.8, 1.05], 10);
    p.box(0.04, 0.045, 0.3, C.bronze, s * 0.29, 0.79, -0.3, [-0.15, -s * 0.12, 0]);
  }

  // Yên ngựa chiến, tấm che hông dệt hoa văn Đông Sơn, cầu yên trước/sau và bàn đạp đồng.
  body.band.box(0.58, 0.09, 0.56, C.red, 0, 1.08, -0.04);
  for (const s of [-1, 1]) {
    body.band.box(0.04, 0.28, 0.52, C.red, s * 0.29, 0.96, -0.04, [0, 0, s * 0.12]);
    p.box(0.045, 0.04, 0.54, C.bronze, s * 0.31, 0.82, -0.04, [0, 0, s * 0.12]);
    for (const dz of [-0.18, 0, 0.18]) p.sphere(0.024, C.gold, s * 0.315, 0.95, -0.04 + dz, [1, 1, 1], 6);
    p.box(0.02, 0.28, 0.025, IRON_DARK, s * 0.31, 0.84, 0.02);
    p.add(new THREE.TorusGeometry(0.05, 0.014, 5, 10), C.bronzeLight, s * 0.32, 0.67, 0.02, [0, Math.PI / 2, 0]);
  }
  p.box(0.34, 0.14, 0.07, C.bronze, 0, 1.16, 0.2, [-0.25, 0, 0]);
  p.box(0.36, 0.15, 0.08, C.bronze, 0, 1.17, -0.27, [0.3, 0, 0]);

  // Bốn chân có khớp gối bọc đồng, ống chân sắt, vòng cổ chân có cựa lửa và móng bịt đồng.
  for (const [b, x, z, front] of [
    ['qFL', -0.175, 0.34, true],
    ['qFR', 0.175, 0.34, true],
    ['qBL', -0.175, -0.34, false],
    ['qBR', 0.175, -0.34, false],
  ] as const) {
    const leg = r.on(b);
    const lp = leg.plain;
    lp.cyl(0.088, 0.068, 0.34, IRON, x, 0.48, z, [front ? 0.06 : -0.08, 0, 0], 8);
    lp.sphere(0.074, IRON_DARK, x, 0.31, z + (front ? 0.015 : -0.015), [1, 0.85, 1.1], 8);
    lp.sphere(0.042, C.bronze, x + (x < 0 ? -0.05 : 0.05), 0.31, z + (front ? 0.015 : -0.015), [0.6, 1, 1], 6);
    lp.cyl(0.064, 0.054, 0.28, IRON_DARK, x, 0.17, z, [front ? -0.04 : 0.05, 0, 0], 8);
    lp.cyl(0.078, 0.084, 0.06, C.bronze, x, 0.08, z, undefined, 10);
    leg.glow.cone(0.038, 0.14, C.ember, x, 0.12, z - 0.08, [-2.1, 0, 0], 5);
    lp.cyl(0.082, 0.098, 0.07, C.bronzeDark, x, 0.035, z + 0.015, undefined, 10);
    lp.box(0.09, 0.04, 0.05, C.gold, x, 0.025, z + 0.07);
  }

  // Cổ ngựa bọc 4 vòng giáp xếp lớp và bờm lửa 2 tầng.
  const neck = r.on('qNeck');
  neck.plain.cyl(0.125, 0.185, 0.56, IRON, 0, 1.12, 0.44, [-0.62, 0, 0], 10);
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const ny = 0.96 + t * 0.28;
    const nz = 0.32 + t * 0.2;
    const rad = lerp(0.185, 0.135, t);
    neck.plain.cyl(rad, rad + 0.01, 0.045, i % 2 ? C.bronze : IRON_DARK, 0, ny, nz, [-0.62, 0, 0], 10);
  }
  for (let i = 0; i < 7; i++) {
    const ny = 1.44 - i * 0.055;
    const nz = 0.58 - i * 0.065;
    neck.glow.cone(0.082, 0.34 + i * 0.025, i % 2 ? C.ember : C.fire, 0, ny, nz - 0.12, [-0.85, 0, 0], 6);
    for (const s of [-1, 1]) {
      neck.glow.cone(0.05, 0.22 + i * 0.015, i % 2 ? C.fire : C.ember, s * 0.06, ny - 0.03, nz - 0.1, [-0.85, 0, s * 0.28], 5);
    }
  }

  // Đầu ngựa chạm khắc, mặt nạ trán đồng vàng, mắt lửa, khoen hàm thiết và dây cương đồng.
  const head = r.on('qHead');
  const hp = head.plain;
  hp.sphere(0.16, IRON, 0, 1.38, 0.58, [0.92, 0.9, 1.15], 10);
  hp.box(0.16, 0.15, 0.34, IRON, 0, 1.33, 0.74, [0.38, 0, 0]);
  hp.box(0.13, 0.075, 0.28, IRON_DARK, 0, 1.22, 0.72, [0.52, 0, 0]);
  head.glow.sphere(0.065, C.ember, 0, 1.27, 0.82, [0.9, 0.7, 1.2], 8);
  hp.box(0.18, 0.04, 0.38, C.bronze, 0, 1.41, 0.72, [0.38, 0, 0]);
  hp.box(0.045, 0.065, 0.4, C.gold, 0, 1.43, 0.71, [0.38, 0, 0]);
  head.glow.cone(0.055, 0.22, C.ember, 0, 1.56, 0.56, [-0.35, 0, 0], 5);

  for (const s of [-1, 1]) {
    hp.box(0.03, 0.12, 0.22, C.bronzeDark, s * 0.088, 1.32, 0.68, [0.38, s * 0.08, 0]);
    hp.sphere(0.038, IRON_DARK, s * 0.065, 1.3, 0.88, [0.8, 0.9, 1.1], 6);
    head.glow.sphere(0.024, C.ember, s * 0.068, 1.295, 0.9, [1, 1, 1], 5);
    head.glow.sphere(0.046, C.fire, s * 0.095, 1.39, 0.66, [0.7, 0.9, 1.1], 8);
    head.glow.sphere(0.025, C.ember, s * 0.105, 1.39, 0.68, [1, 1, 1], 6);
    hp.box(0.05, 0.03, 0.11, C.gold, s * 0.098, 1.435, 0.66, [0.3, 0, -s * 0.35]);
    hp.cone(0.044, 0.16, IRON_DARK, s * 0.08, 1.53, 0.52, [-0.35, 0, s * 0.25], 5);
    hp.cone(0.028, 0.12, C.gold, s * 0.11, 1.48, 0.56, [-0.15, 0, s * 0.55], 5);
    hp.add(new THREE.TorusGeometry(0.032, 0.009, 5, 10), C.gold, s * 0.085, 1.23, 0.78, [0, Math.PI / 2, 0]);
    hp.box(0.016, 0.02, 0.58, C.bronzeLight, s * 0.11, 1.26, 0.48, [0.08, -s * 0.08, 0]);
  }

  // Đuôi lửa: bọc gốc đuôi đồng + 7 ngọn lửa xòe dài.
  const tail = r.on('qTail');
  tail.plain.cyl(0.065, 0.08, 0.12, C.bronze, 0, 0.94, -0.52, [-1.4, 0, 0], 8);
  for (const [dx, dy, rz, len, col] of [
    [0, 0.02, 0, 0.68, C.ember],
    [-0.06, 0, 0.28, 0.6, C.fire],
    [0.06, 0, -0.28, 0.6, C.fire],
    [-0.11, -0.03, 0.52, 0.48, C.ember],
    [0.11, -0.03, -0.52, 0.48, C.ember],
    [-0.04, 0.05, 0.15, 0.52, C.fire],
    [0.04, 0.05, -0.15, 0.52, C.fire],
  ] as const) {
    tail.glow.cone(0.085, len, col, dx, 0.9 + dy, -0.68, [-2.15, 0, rz], 6);
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
  const r = new RigBuilder({ ...BASE, ...IRON_HORSE });
  drawIronHorse(r);
  return bakeRig(r.build());
}

// ---------- Thánh Gióng ----------

const K_GIONG = 1.3;
const GIONG_AT: V3 = [0, 0.88, -0.03];

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
    p.sphere(0.042, C.gold, 0, -0.09, 0, [1, 1.1, 1], 8);
    p.cone(0.04, 0.12, C.red, 0, -0.15, -0.02, [Math.PI - 0.3, 0, 0], 6);
    s.band.cyl(0.034, 0.032, 0.18, C.bronze, 0, 0.01, 0, undefined, 10);
    p.cyl(0.055, 0.042, 0.045, C.gold, 0, 0.11, 0, undefined, 10);
    const joints = 7;
    const step = 0.14;
    for (let i = 0; i < joints; i++) {
      const y = 0.14 + i * step;
      const rSeg = lerp(0.032, 0.023, i / joints);
      p.cyl(rSeg * 0.94, rSeg, step * 0.82, i % 2 ? IRON : IRON_DARK, 0, y + step * 0.42, 0, undefined, 8);
      p.cyl(rSeg + 0.009, rSeg + 0.009, 0.026, C.gold, 0, y + step * 0.88, 0, undefined, 10);
    }
    const topY = 0.14 + joints * step;
    p.sphere(0.046, C.bronzeLight, 0, topY + 0.02, 0, [1, 1.15, 1], 10);
    p.cone(0.032, 0.11, IRON_LIGHT, 0, topY + 0.09, 0, undefined, 6);
  }
}

/** Tráng sĩ Gióng: giáp sắt hộ tâm trống đồng, giáp vai cánh chim Lạc, áo choàng đại hồng bào, mũ trụ sắt 9 lông chim. */
function drawGiongRider(r: HumanRig, bamboo: boolean): void {
  humanBody(r, {
    legs: IRON_DARK,
    cloth: C.red,
    pattern: true,
    top: IRON_DARK,
    sleeves: IRON,
    belt: C.gold,
    armband: C.gold,
  });
  for (const [b, x] of [
    ['legL', -0.065],
    ['legR', 0.065],
  ] as const) {
    const lp = r.on(b).plain;
    lp.cyl(0.052, 0.044, 0.14, IRON, x, 0.11, 0.008, undefined, 8);
    lp.sphere(0.044, C.bronze, x, 0.185, 0.035, [0.9, 0.9, 0.7], 8);
    lp.cyl(0.054, 0.054, 0.03, C.gold, x, 0.05, 0.008, undefined, 8);
  }

  const hips = r.on('hips');
  hips.plain.box(0.09, 0.075, 0.04, C.gold, 0, 0.405, 0.135);
  hips.plain.sphere(0.026, C.red, 0, 0.405, 0.155, [1, 1, 0.6], 6);
  for (const s of [-1, 1]) {
    hips.band.box(0.04, 0.19, 0.17, IRON, s * 0.145, 0.3, 0, [0, 0, -s * 0.18]);
    hips.plain.box(0.044, 0.032, 0.18, C.bronze, s * 0.16, 0.21, 0, [0, 0, -s * 0.18]);
  }

  const chest = r.on('chest');
  chest.band.cyl(0.148, 0.126, 0.21, IRON, 0, 0.485, 0, undefined, 12);
  chest.plain.cyl(0.115, 0.13, 0.035, C.gold, 0, 0.58, 0, undefined, 12);
  chest.drum.cyl(0.072, 0.072, 0.022, C.gold, 0, 0.495, 0.13, [Math.PI / 2, 0, 0], 14);
  chest.plain.add(new THREE.TorusGeometry(0.074, 0.012, 6, 16), C.bronze, 0, 0.495, 0.138);

  for (const s of [-1, 1]) {
    chest.plain.sphere(0.082, IRON, s * 0.155, 0.565, 0, [1.15, 0.82, 1.08], 10);
    chest.plain.sphere(0.068, IRON_DARK, s * 0.175, 0.525, 0, [1.1, 0.7, 1.02], 8);
    chest.plain.box(0.11, 0.025, 0.13, C.gold, s * 0.165, 0.545, 0, [0, 0, -s * 0.25]);
    chest.plain.cone(0.032, 0.11, C.gold, s * 0.205, 0.615, -0.01, [0, 0, -s * 0.65], 5);
    chest.plain.sphere(0.032, C.gold, s * 0.115, 0.56, 0.095, [1, 1, 0.6], 7);
  }

  chest.plain.box(0.36, 0.48, 0.032, C.red, 0, 0.45, -0.22, [0.72, 0, 0]);
  chest.band.box(0.38, 0.07, 0.036, C.gold, 0, 0.28, -0.37, [0.72, 0, 0]);
  for (const s of [-1, 1]) {
    chest.plain.box(0.14, 0.46, 0.028, C.red, s * 0.17, 0.44, -0.2, [0.7, s * 0.18, -s * 0.15]);
  }

  for (const [b, s] of [
    ['armL', -1],
    ['armR', 1],
  ] as const) {
    const ap = r.on(b).plain;
    const x = s * 0.135;
    ap.cyl(0.046, 0.04, 0.11, IRON_DARK, x, 0.375, 0, undefined, 8);
    ap.cyl(0.049, 0.049, 0.024, C.gold, x, 0.425, 0, undefined, 8);
    ap.cyl(0.044, 0.044, 0.022, C.bronze, x, 0.325, 0, undefined, 8);
  }

  humanHead(r, { brows: true });
  const head = r.on('head');
  const hp = head.plain;
  hp.sphere(0.236, IRON, 0, 0.845, -0.02, [1.02, 0.66, 1.02], 12);
  hp.box(0.036, 0.16, 0.26, C.gold, 0, 0.93, 0.02, [-0.15, 0, 0]);
  head.band.cyl(0.242, 0.242, 0.048, C.bronze, 0, 0.84, -0.02, undefined, 14);
  for (const s of [-1, 1]) {
    hp.box(0.13, 0.032, 0.03, C.gold, s * 0.062, 0.845, 0.215, [0, -s * 0.22, s * 0.18]);
    hp.box(0.028, 0.13, 0.1, IRON_DARK, s * 0.205, 0.745, 0.04, [0.12, s * 0.2, -s * 0.12]);
    hp.box(0.032, 0.135, 0.024, C.bronze, s * 0.208, 0.745, 0.085, [0.12, s * 0.2, -s * 0.12]);
  }
  hp.sphere(0.028, C.red, 0, 0.845, 0.232, [1, 1.2, 0.6], 7);
  hp.cyl(0.045, 0.065, 0.06, C.gold, 0, 0.99, -0.03, undefined, 8);
  featherCrown(r, [C.red, C.ember, C.cream, C.gold], { count: 9, len: 0.44, spread: 0.23 });
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

  const hips = r.on('cHips').plain;
  for (const s of [-1, 1]) {
    hips.cyl(0.054, 0.048, 0.24, C.skin, s * 0.085, 0.08, 0.13, [Math.PI / 2, 0, -s * 0.08], 8);
    hips.sphere(0.048, C.skin, s * 0.095, 0.095, 0.26, [0.9, 1.15, 0.75], 7);
    hips.cyl(0.052, 0.052, 0.022, C.gold, s * 0.09, 0.08, 0.22, [Math.PI / 2, 0, 0], 8);
  }
  const chest = r.on('cChest');
  chest.plain.cyl(0.125, 0.155, 0.3, C.skin, 0, 0.22, 0, undefined, 10);
  chest.band.box(0.23, 0.24, 0.042, C.red, 0, 0.235, 0.132);
  chest.drum.cyl(0.065, 0.065, 0.015, C.gold, 0, 0.235, 0.152, [Math.PI / 2, 0, 0], 12);
  chest.plain.add(new THREE.TorusGeometry(0.105, 0.014, 6, 16), C.gold, 0, 0.365, 0.02, [Math.PI / 2 + 0.2, 0, 0]);
  for (const [b, s] of [
    ['cArmL', -1],
    ['cArmR', 1],
  ] as const) {
    const p = r.on(b).plain;
    p.cyl(0.038, 0.034, 0.2, C.skin, s * 0.155, 0.22, 0.04, [0.4, 0, s * 0.3], 8);
    p.cyl(0.04, 0.04, 0.02, C.gold, s * 0.165, 0.16, 0.065, [0.4, 0, s * 0.3], 8);
    p.sphere(0.044, C.skin, s * 0.175, 0.13, 0.085, [1, 1, 1], 7);
  }
  const h = r.on('cHead').plain;
  h.sphere(0.242, C.skin, 0, 0.58, 0, [1, 0.96, 0.96], 14);
  for (const s of [-1, 1]) {
    h.sphere(0.036, C.skin, s * 0.232, 0.57, 0, [0.55, 1, 0.9], 6);
    h.sphere(0.033, C.ink, s * 0.086, 0.575, 0.212, [1, 1.4, 0.5], 7);
    h.sphere(0.013, C.cream, s * 0.078, 0.59, 0.23, [1, 1, 1], 5);
    h.box(0.055, 0.014, 0.016, C.hair, s * 0.086, 0.635, 0.21, [0, 0, -s * 0.15]);
    h.sphere(0.038, 0xe58a6a, s * 0.135, 0.515, 0.185, [1, 0.62, 0.45], 6);
  }
  h.box(0.048, 0.016, 0.018, C.red, 0, 0.495, 0.222);
  h.sphere(0.085, C.hair, 0, 0.805, 0.065, [1, 0.78, 1], 9);
  h.add(new THREE.TorusGeometry(0.042, 0.011, 5, 12), C.red, 0, 0.835, 0.095, [Math.PI / 2 - 0.5, 0, 0]);
  h.cone(0.048, 0.15, C.hair, 0, 0.87, 0.135, [0.85, 0, 0], 7);
  for (const s of [-1, 1]) {
    h.sphere(0.046, C.hair, s * 0.15, 0.74, -0.02, [1, 0.8, 1], 7);
    h.cone(0.028, 0.08, C.hair, s * 0.18, 0.78, -0.02, [0, 0, -s * 0.6], 5);
  }
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
    const chest = h.on('chest');
    chest.band.box(0.19, 0.2, 0.035, C.red, 0, 0.5, 0.116);
    chest.drum.cyl(0.055, 0.055, 0.015, C.gold, 0, 0.5, 0.132, [Math.PI / 2, 0, 0], 10);
    chest.plain.add(new THREE.TorusGeometry(0.068, 0.01, 6, 14), C.gold, 0, 0.575, 0.01, [Math.PI / 2 + 0.15, 0, 0]);
    humanHead(h);
    const head = h.on('head').plain;
    head.sphere(0.07, C.hair, 0, 0.955, 0.055, [1, 0.78, 1], 9);
    head.add(new THREE.TorusGeometry(0.036, 0.009, 5, 12), C.red, 0, 0.98, 0.08, [Math.PI / 2 - 0.5, 0, 0]);
    head.cone(0.04, 0.13, C.hair, 0, 1.01, 0.105, [0.85, 0, 0], 6);
    for (const s of [-1, 1]) {
      head.sphere(0.038, C.hair, s * 0.13, 0.89, -0.02, [1, 0.8, 1], 7);
    }
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
 */
export function makeGiong(look: GiongLook, opts: { bamboo?: boolean; glow?: boolean } = {}): THREE.Group {
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
  const r = new RigBuilder({ ...BASE, ...IRON_HORSE, ...bigHuman('qBody', GIONG_AT, K_GIONG) });
  drawIronHorse(r);
  drawBig(r, GIONG_AT, K_GIONG, (h) => drawGiongRider(h, opts.bamboo ?? false));
  const { group, bones } = skinRig(r.build());
  // Luồng lửa phun nhiều tầng từ mõm ngựa sắt, gắn vào đầu ngựa để theo đầu ngựa gật.
  const flames: THREE.Mesh[] = [];
  const flameRoot = new THREE.Group();
  flameRoot.position.set(0, 1.25 - 1.32, 0.88 - 0.58);
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
  if (opts.glow) addHalo(group, 2.0, -0.35);
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
  humanBody(h, { cloth: C.mountainCloak, pattern: true, flaps: true, top: C.bronze, belt: C.bronzeDark, armband: C.gold });

  // Xà cạp đồng đen, vòng chân vàng và hộ gối đá núi
  for (const [b, x] of [
    ['legL', -0.065],
    ['legR', 0.065],
  ] as const) {
    const lp = h.on(b).plain;
    lp.cyl(0.054, 0.048, 0.13, C.bronzeDark, x, 0.1, 0.005, undefined, 8);
    lp.cyl(0.058, 0.058, 0.032, C.gold, x, 0.045, 0.008, undefined, 8);
    lp.sphere(0.044, C.rock, x, 0.175, 0.032, [0.95, 0.85, 0.7], 7);
  }

  // Đai lưng Sơn Vương khảm ngọc xanh & váy lá rừng 2 tầng xen phiến đá
  const hips = h.on('hips');
  const hp = hips.plain;
  hp.box(0.095, 0.075, 0.042, C.gold, 0, 0.405, 0.135);
  hips.glow.sphere(0.026, JADE, 0, 0.405, 0.156, [1, 1, 0.6], 6);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    hp.cone(0.068, 0.24, C.leaf[i % 4], Math.sin(a) * 0.145, 0.26, Math.cos(a) * 0.135, [Math.PI + Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3], 4);
  }
  for (const s of [-1, 1]) {
    hp.box(0.042, 0.17, 0.16, C.rockDark, s * 0.148, 0.31, 0, [0, 0, -s * 0.2]);
    hp.box(0.046, 0.03, 0.17, C.gold, s * 0.16, 0.23, 0, [0, 0, -s * 0.2]);
  }

  // Giáp ngực Đông Sơn, hộ tâm phiến mặt trống đồng, vai đắp đá núi 3 đỉnh & áo choàng rừng già 3 nếp
  const chest = h.on('chest');
  chest.band.cyl(0.158, 0.136, 0.22, C.bronze, 0, 0.485, 0, undefined, 12);
  chest.plain.cyl(0.118, 0.132, 0.034, C.gold, 0, 0.58, 0, undefined, 12);
  chest.drum.cyl(0.072, 0.072, 0.022, C.gold, 0, 0.495, 0.138, [Math.PI / 2, 0, 0], 14);
  chest.plain.add(new THREE.TorusGeometry(0.074, 0.012, 6, 16), C.bronzeDark, 0, 0.495, 0.145);

  // Áo choàng rừng già 3 nếp viền thổ cẩm Đông Sơn và đuôi lá
  chest.plain.box(0.4, 0.48, 0.034, C.mountainCloak, 0, 0.4, -0.19, [0.2, 0, 0]);
  chest.band.box(0.42, 0.065, 0.038, C.bronze, 0, 0.19, -0.235, [0.2, 0, 0]);
  for (const s of [-1, 1]) {
    chest.plain.box(0.14, 0.46, 0.03, C.leaf[2], s * 0.18, 0.4, -0.18, [0.2, s * 0.15, -s * 0.12]);
    chest.plain.sphere(0.032, C.gold, s * 0.115, 0.56, 0.1, [1, 1, 0.6], 7);
  }
  for (let i = 0; i < 5; i++) {
    chest.plain.cone(0.058, 0.17, C.leaf[i % 4], -0.18 + i * 0.09, 0.15, -0.245, [Math.PI + 0.22, 0, 0], 4);
  }

  // Giáp vai đá núi Ba Vì (mỗi vai có khối đá gốc + 2 chóp đá + mầm cây xanh + viền vàng)
  for (const s of [-1, 1]) {
    chest.plain.sphere(0.095, C.rockDark, s * 0.185, 0.575, 0, [1.1, 0.78, 1.05], 8);
    chest.plain.box(0.12, 0.026, 0.14, C.gold, s * 0.18, 0.535, 0, [0, 0, -s * 0.22]);
    chest.plain.cone(0.052, 0.13, C.rock, s * 0.195, 0.65, 0, [0, 0, -s * 0.35], 6);
    chest.plain.cone(0.038, 0.1, C.rockDark, s * 0.23, 0.62, -0.02, [0, 0, -s * 0.65], 5);
    chest.plain.cone(0.042, 0.11, C.leaf[1], s * 0.165, 0.655, 0.02, [0, 0, -s * 0.18], 5);
  }

  // Hộ uyển đồng khắc hoa văn ở hai cẳng tay
  for (const [b, s] of [
    ['armL', -1],
    ['armR', 1],
  ] as const) {
    const ap = h.on(b).plain;
    const x = s * 0.135;
    ap.cyl(0.045, 0.039, 0.1, C.bronzeDark, x, 0.375, 0, undefined, 8);
    ap.cyl(0.048, 0.048, 0.022, C.gold, x, 0.42, 0, undefined, 8);
  }

  // Khuôn mặt uy nghi có râu ngắn, miện đồng vàng khảm ngọc núi và 9 lông chim rừng
  humanHead(h, { brows: true, mustache: C.hair });
  hairCap(h);
  const head = h.on('head');
  // Chòm râu ngắn dưới cằm
  head.plain.cone(0.065, 0.14, C.hair, 0, 0.62, 0.155, [Math.PI + 0.3, 0, 0], 6);
  // Vành miện đồng khắc hoa văn trống đồng + diềm vàng + ngọc lục bảo giữa trán
  head.band.cyl(0.226, 0.23, 0.052, C.bronze, 0, 0.83, -0.03, undefined, 14);
  head.plain.cyl(0.232, 0.232, 0.018, C.gold, 0, 0.855, -0.03, undefined, 14);
  head.plain.box(0.07, 0.07, 0.03, C.gold, 0, 0.84, 0.195, [0, 0, Math.PI / 4]);
  head.glow.sphere(0.024, JADE, 0, 0.84, 0.21, [1, 1.2, 0.6], 6);
  for (const s of [-1, 1]) {
    head.plain.cone(0.03, 0.11, C.gold, s * 0.22, 0.88, 0.02, [0.2, 0, -s * 0.45], 5);
  }
  featherCrown(h, [C.red, C.cream, C.leaf[3], C.gold], { count: 9, len: 0.44, spread: 0.23 });
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
    });

    // Đai lưng khảm thủy châu phát sáng & tấm giáp hông vảy thuồng luồng
    const hips = h.on('hips');
    hips.plain.box(0.09, 0.075, 0.04, C.gold, 0, 0.405, 0.135);
    hips.glow.sphere(0.028, C.ghost, 0, 0.405, 0.156, [1, 1, 0.6], 7);
    hips.band.box(0.12, 0.24, 0.028, C.foam, 0, 0.25, 0.155, [-0.1, 0, 0]);
    for (const s of [-1, 1]) {
      hips.plain.box(0.04, 0.2, 0.17, C.serpent, s * 0.15, 0.3, 0, [0, 0, -s * 0.2]);
      hips.plain.box(0.045, 0.03, 0.18, C.gold, s * 0.165, 0.21, 0, [0, 0, -s * 0.2]);
    }

    // Giáp ngực Hải Vương, hộ tâm mặt trống đồng, giáp vai vây thuồng luồng & áo choàng sóng nước
    const chest = h.on('chest');
    chest.band.cyl(0.152, 0.132, 0.21, C.serpent, 0, 0.485, 0, undefined, 12);
    chest.plain.cyl(0.115, 0.13, 0.034, C.gold, 0, 0.58, 0, undefined, 12);
    chest.drum.cyl(0.07, 0.07, 0.022, C.gold, 0, 0.495, 0.132, [Math.PI / 2, 0, 0], 14);
    chest.glow.sphere(0.022, C.ghost, 0, 0.495, 0.148, [1, 1, 0.6], 6);

    // Áo choàng thủy triều sau lưng viền bọt sóng
    chest.plain.box(0.4, 0.48, 0.032, C.sea, 0, 0.4, -0.19, [0.22, 0, 0]);
    chest.band.box(0.42, 0.065, 0.036, C.foam, 0, 0.19, -0.24, [0.22, 0, 0]);
    for (const s of [-1, 1]) {
      chest.plain.sphere(0.086, C.serpent, s * 0.17, 0.57, 0, [1.15, 0.8, 1.05], 9);
      chest.plain.box(0.11, 0.025, 0.13, C.gold, s * 0.17, 0.54, 0, [0, 0, -s * 0.25]);
      // Gai vây cá cong vút trên hai vai
      chest.plain.cone(0.038, 0.15, C.gold, s * 0.22, 0.63, -0.01, [-0.15, 0, -s * 0.65], 5);
      chest.plain.cone(0.028, 0.11, C.foam, s * 0.18, 0.65, -0.02, [-0.2, 0, -s * 0.35], 4);
    }

    // Hộ uyển cẳng tay có vây bén
    for (const [b, s] of [
      ['armL', -1],
      ['armR', 1],
    ] as const) {
      const ap = h.on(b).plain;
      const x = s * 0.135;
      ap.cyl(0.044, 0.038, 0.1, C.serpent, x, 0.375, 0, undefined, 8);
      ap.cone(0.022, 0.08, C.gold, x + s * 0.045, 0.39, -0.01, [0, 0, -s * 0.8], 4);
    }

    // Khuôn mặt Long Vương, râu rong biển 3 nhánh & Mão đồng vàng vây rồng
    humanHead(h, { brows: true, mustache: C.serpent, beard: C.serpent });
    const head = h.on('head');
    const hp = head.plain;
    for (const s of [-1, 1]) {
      hp.cone(0.055, 0.22, C.sea, s * 0.08, 0.59, 0.13, [Math.PI + 0.22, 0, s * 0.25], 6);
    }
    // Mão đồng vàng ôm đỉnh đầu (cao thoáng để lộ rõ mắt và mày dữ)
    hp.sphere(0.228, C.bronze, 0, 0.855, -0.02, [1.02, 0.6, 1.02], 12);
    head.band.cyl(0.236, 0.236, 0.048, C.gold, 0, 0.84, -0.02, undefined, 14);
    // Diềm trán chữ V khảm thủy châu phát sáng + 2 sừng giao long bên thái dương
    for (const s of [-1, 1]) {
      hp.box(0.12, 0.03, 0.028, C.gold, s * 0.058, 0.845, 0.21, [0, -s * 0.22, s * 0.18]);
      hp.cone(0.034, 0.16, C.gold, s * 0.215, 0.91, 0.01, [-0.25, 0, -s * 0.48], 5);
    }
    head.glow.sphere(0.03, C.ghost, 0, 0.85, 0.228, [1, 1.2, 0.6], 7);
    featherCrown(h, [C.sea, C.foam, C.gold], { count: 7, len: 0.38, spread: 0.26 });
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

/** An Dương Vương: hoàng bào đỏ son, giáp đồng vàng chạm mặt trống đồng, giáp vai Kim Quy, vương miện vàng Âu Lạc, mũ 9 lông chim. */
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
  });

  // Hài và giáp ống chân đồng đen viền vàng ròng
  for (const [b, x] of [
    ['legL', -0.065],
    ['legR', 0.065],
  ] as const) {
    const lp = h.on(b).plain;
    lp.cyl(0.056, 0.05, 0.12, C.bronzeDark, x, 0.09, 0.01, undefined, 8);
    lp.cyl(0.06, 0.062, 0.035, C.gold, x, 0.04, 0.015, undefined, 8);
  }

  // Đai vàng đế vương, vạt lễ phục trước bụng thêu hoa văn Đông Sơn & phiến giáp đùi mạ vàng
  const hips = h.on('hips');
  hips.plain.box(0.1, 0.08, 0.044, C.gold, 0, 0.405, 0.138);
  hips.plain.sphere(0.028, C.red, 0, 0.405, 0.16, [1, 1, 0.6], 7);
  hips.band.box(0.13, 0.25, 0.03, C.gold, 0, 0.24, 0.158, [-0.1, 0, 0]);
  for (const s of [-1, 1]) {
    hips.band.box(0.042, 0.2, 0.18, C.bronze, s * 0.152, 0.3, 0, [0, 0, -s * 0.18]);
    hips.plain.box(0.046, 0.032, 0.19, C.gold, s * 0.168, 0.21, 0, [0, 0, -s * 0.18]);
  }

  // Giáp ngực hoàng gia, gương hộ tâm mặt trống đồng vàng ròng, giáp vai 2 tầng & đại hồng bào 3 nếp
  const chest = h.on('chest');
  chest.band.cyl(0.158, 0.138, 0.22, C.bronze, 0, 0.485, 0, undefined, 12);
  chest.plain.cyl(0.118, 0.134, 0.038, C.gold, 0, 0.582, 0, undefined, 12);
  chest.drum.cyl(0.078, 0.078, 0.024, C.gold, 0, 0.495, 0.138, [Math.PI / 2, 0, 0], 16);
  chest.plain.add(new THREE.TorusGeometry(0.08, 0.013, 6, 18), C.goldDark, 0, 0.495, 0.146);

  // Đại hồng bào 3 nếp dài sau lưng, gấu áo dệt hoa văn vàng
  chest.plain.box(0.46, 0.58, 0.035, C.red, 0, 0.39, -0.2, [0.18, 0, 0]);
  chest.band.box(0.48, 0.075, 0.04, C.gold, 0, 0.13, -0.25, [0.18, 0, 0]);
  for (const s of [-1, 1]) {
    chest.plain.box(0.15, 0.55, 0.03, C.red, s * 0.19, 0.39, -0.19, [0.18, s * 0.15, -s * 0.12]);
    // Giáp vai 2 tầng bằng đồng sáng & vàng ròng + khuy giữ áo choàng
    chest.plain.sphere(0.092, C.bronzeLight, s * 0.185, 0.58, 0, [1.15, 0.78, 1.05], 9);
    chest.plain.sphere(0.074, C.bronze, s * 0.205, 0.535, 0, [1.1, 0.7, 1], 8);
    chest.plain.box(0.12, 0.026, 0.14, C.gold, s * 0.19, 0.555, 0, [0, 0, -s * 0.25]);
    chest.plain.cone(0.038, 0.12, C.gold, s * 0.24, 0.635, 0, [0, 0, -s * 0.75], 5);
    chest.plain.sphere(0.034, C.gold, s * 0.12, 0.56, 0.105, [1, 1, 0.6], 7);
  }

  // Hộ uyển đồng mạ vàng ở hai cẳng tay
  for (const [b, s] of [
    ['armL', -1],
    ['armR', 1],
  ] as const) {
    const ap = h.on(b).plain;
    const x = s * 0.135;
    ap.cyl(0.046, 0.04, 0.1, C.bronze, x, 0.375, 0, undefined, 8);
    ap.cyl(0.05, 0.05, 0.024, C.gold, x, 0.42, 0, undefined, 8);
  }

  // Khuôn mặt đế vương (râu mép + chòm râu cằm), Vương miện vàng Âu Lạc chạm hoa văn trống đồng & 9 lông chim hồng hoàng
  humanHead(h, { brows: true, mustache: C.hair });
  hairCap(h);
  const head = h.on('head');
  const hp = head.plain;
  hp.cone(0.055, 0.13, C.hair, 0, 0.62, 0.16, [Math.PI + 0.28, 0, 0], 6);
  head.band.cyl(0.228, 0.232, 0.062, C.gold, 0, 0.835, -0.03, undefined, 16);
  hp.cyl(0.236, 0.236, 0.02, C.goldDark, 0, 0.805, -0.03, undefined, 16);
  // Huy hiệu mặt trời & hồng ngọc giữa trán
  hp.box(0.075, 0.075, 0.032, C.gold, 0, 0.85, 0.198, [0, 0, Math.PI / 4]);
  hp.sphere(0.026, C.red, 0, 0.85, 0.215, [1, 1.2, 0.6], 7);
  // 10 mũi miện vàng cao thấp xen kẽ quanh vương miện
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const hSpk = i % 2 === 0 ? 0.085 : 0.058;
    hp.cone(0.026, hSpk, C.gold, Math.sin(a) * 0.222, 0.89, Math.cos(a) * 0.222 - 0.03, undefined, 4);
  }
  featherCrown(h, [C.red, C.gold, C.cream, C.ember], { count: 9, len: 0.45, spread: 0.23 });

  if (crossbow) h.local('hand', GRIP_R, null, (s) => crossbowParts(s, true, 1.05 / K_ADV));
  else h.local('hand', GRIP_R, null, royalAxe);
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

// ---------- Lạc tướng đánh trống trận ----------

/** Dùi trống lúc nghỉ, lúc giơ cao lấy đà, và lúc nện xuống mặt trống (góc chúc xuống, radian). */
export const STICK_POSE = { rest: 0.12, up: -0.75, hit: 0.32 };

const DRUM_Z = 0.56;

/**
 * Lạc tướng đứng sau trống đồng lớn, hai tay cầm dùi, mũ lông chim cao như người trên trống đồng.
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
    const chest = h.on('chest').plain;
    chest.box(0.4, 0.45, 0.035, C.red, 0, 0.42, -0.18, [0.18, 0, 0]);
    for (const s of [-1, 1]) chest.sphere(0.06, C.bronze, s * 0.14, 0.56, 0, [1, 0.8, 1], 8);
    humanHead(h, { brows: true });
    hairCap(h);
    headband(h, C.red);
    featherCrown(h, [C.red, C.cream], { len: 0.44 });
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
