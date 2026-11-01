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

/** Hào quang Phù Đổng Thiên Vương: vòng vàng có tia như ngôi sao giữa mặt trống đồng. Tâm ở gốc, mặt hướng +z. */
function halo(): THREE.Group {
  const m = new ToonModel(inkThin);
  m.glow.add(new THREE.TorusGeometry(0.42, 0.035, 6, 32), C.ember, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    m.glow.cone(0.035, i % 2 ? 0.12 : 0.2, i % 2 ? C.fire : C.ember, Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0, [0, 0, a - Math.PI / 2], 4);
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
  qBody: { parent: 'base', at: [0, 0.78, 0] },
  qFL: { parent: 'qBody', at: [-0.16, 0.62, 0.32] },
  qFR: { parent: 'qBody', at: [0.16, 0.62, 0.32] },
  qBL: { parent: 'qBody', at: [-0.16, 0.62, -0.32] },
  qBR: { parent: 'qBody', at: [0.16, 0.62, -0.32] },
  qNeck: { parent: 'qBody', at: [0, 0.92, 0.3] },
  qHead: { parent: 'qNeck', at: [0, 1.25, 0.55] },
  qTail: { parent: 'qBody', at: [0, 0.92, -0.45] },
};

/** Ngựa sắt của Gióng: thân sắt có đồ đồng, mắt đỏ rực, bờm và đuôi là lửa tự sáng. */
function drawIronHorse(r: Rig): void {
  const body = r.on('qBody');
  body.plain.sphere(0.34, IRON, 0, 0.78, 0, [0.8, 0.8, 1.45], 12);
  body.band.box(0.54, 0.08, 0.5, C.red, 0, 1.08, -0.05);
  for (const s of [-1, 1]) body.plain.box(0.03, 0.22, 0.46, C.bronze, s * 0.28, 1.0, -0.05);
  for (const [b, x, z] of [
    ['qFL', -0.16, 0.32],
    ['qFR', 0.16, 0.32],
    ['qBL', -0.16, -0.32],
    ['qBR', 0.16, -0.32],
  ] as const) {
    const leg = r.on(b).plain;
    leg.cyl(0.06, 0.075, 0.62, IRON_DARK, x, 0.31, z, undefined, 7);
    leg.cyl(0.085, 0.085, 0.07, C.bronze, x, 0.05, z, undefined, 8);
  }
  const neck = r.on('qNeck');
  neck.plain.cyl(0.11, 0.16, 0.52, IRON, 0, 1.08, 0.42, [-0.6, 0, 0], 8);
  neck.plain.cyl(0.16, 0.17, 0.06, C.bronze, 0, 0.95, 0.3, [-0.6, 0, 0], 10);
  // Bờm lửa chạy dọc cổ, cao dần về phía gáy.
  for (let i = 0; i < 6; i++) neck.glow.cone(0.075, 0.3 + i * 0.03, i % 2 ? C.ember : C.fire, 0, 1.36 - i * 0.05, 0.56 - i * 0.12, [-0.75, 0, 0], 5);
  const head = r.on('qHead');
  head.plain.box(0.19, 0.2, 0.44, IRON, 0, 1.3, 0.66, [0.35, 0, 0]);
  head.plain.box(0.2, 0.12, 0.03, C.bronze, 0, 1.43, 0.6, [0.35 - Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) {
    head.plain.cone(0.04, 0.13, IRON_DARK, s * 0.07, 1.5, 0.5, [-0.3, 0, s * 0.25], 5);
    head.glow.sphere(0.04, C.fire, s * 0.09, 1.37, 0.75, [1, 1, 0.6], 6);
  }
  // Đuôi lửa xòe ba nhánh.
  const tail = r.on('qTail').glow;
  for (const [dx, rz] of [
    [0, 0],
    [-0.07, 0.35],
    [0.07, -0.35],
  ] as const) {
    tail.cone(0.09, 0.55, dx ? C.ember : C.fire, dx, 0.9, -0.66, [-2.2, 0, rz], 6);
  }
}

/** Ngựa sắt đi (phi), đứng (gật đầu), cào chân khi Gióng quật roi. */
function poseIronHorse(b: B, a: Act, e: number): void {
  const t = a.time ?? 0;
  if (a.act === 'walk') {
    const ph = a.phase ?? 0;
    quadWalk(b, ph, (a.stride ?? 0.5) * 0.9, 0.62);
    b.qNeck.rotation.x = 0.07 * Math.sin(ph * 2);
    b.qTail.rotation.x = 0.1 * Math.sin(ph * 2);
  } else if (a.act === 'dead') {
    quadFall(b, a.fall ?? 1);
  } else {
    b.qNeck.rotation.x = 0.05 * Math.sin(t * 1.5) - 0.12 * e;
    b.qFL.rotation.x = -0.5 * e;
    b.qTail.rotation.z = 0.12 * Math.sin(t * 2.2);
  }
}

/** Tượng ngựa sắt bản tĩnh, cho Đền Phù Đổng. */
export function bakeIronHorse(): THREE.Group {
  const r = new RigBuilder({ ...BASE, ...IRON_HORSE });
  drawIronHorse(r);
  return bakeRig(r.build());
}

// ---------- Thánh Gióng ----------

const K_GIONG = 1.2;
const GIONG_AT: V3 = [0, 0.84, -0.02];

/** Roi sắt (hay cây tre đằng ngà khi roi đã gãy), dựng từ chỗ tay nắm. */
function giongWeapon(s: Parts, bamboo: boolean): void {
  const p = s.plain;
  if (bamboo) {
    p.cyl(0.038, 0.046, 1.65, C.bamboo, 0, 0.75, 0, undefined, 6);
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.5;
      p.cone(0.066, 0.27, C.leaf[i % 4], Math.sin(a) * 0.1, 1.62 + Math.cos(a) * 0.1, (i % 2) * 0.1 - 0.05, [0, 0, -a], 4);
    }
  } else {
    p.cyl(0.025, 0.025, 1.0, IRON_DARK, 0, 0.45, 0, undefined, 6);
    p.cyl(0.038, 0.038, 0.13, C.bronze, 0, 0.0, 0, undefined, 8);
    p.sphere(0.042, C.bronze, 0, 0.96, 0, [1, 1, 1], 8);
  }
}

/** Tráng sĩ Gióng: giáp sắt viền đồng, áo choàng đỏ bay, mũ sắt chùm lông chim, cầm roi sắt (hay tre). */
function drawGiongRider(r: HumanRig, bamboo: boolean): void {
  humanBody(r, { legs: IRON_DARK, cloth: IRON, top: IRON, belt: C.bronze, armband: C.bronze });
  const chest = r.on('chest');
  chest.band.cyl(0.14, 0.12, 0.2, IRON, 0, 0.48, 0, undefined, 10);
  for (const s of [-1, 1]) chest.plain.sphere(0.065, C.bronze, s * 0.14, 0.56, 0, [1, 0.8, 1], 8);
  chest.plain.box(0.3, 0.42, 0.03, C.red, 0, 0.47, -0.22, [0.75, 0, 0]);
  humanHead(r, { brows: true });
  const head = r.on('head').plain;
  head.sphere(0.232, IRON, 0, 0.84, -0.02, [1, 0.62, 1], 10);
  head.cyl(0.236, 0.236, 0.04, C.bronze, 0, 0.845, -0.02, undefined, 12);
  featherCrown(r, [C.red, C.cream, C.bronzeLight], { len: 0.42 });
  r.local('hand', GRIP_R, null, (s) => giongWeapon(s, bamboo));
}

/** Gióng cưỡi ngựa: giơ cao roi, quật xuống, quét tre một vòng (kỹ năng), ngã. */
function poseGiongRider(b: Human, a: Act): void {
  beginPose(b, a.time);
  // Tay trái cầm cương; tay phải giơ cao roi, ngả ra sau và chếch ra ngoài.
  b.armL.rotation.set(-0.9, 0, -0.1);
  b.armR.rotation.set(-2.7, 0, 0.35);
  b.hand.rotation.set(-0.5, 0, -0.3);
  if (a.skill !== undefined) {
    // Nhổ tre: giơ cao lấy đà, bổ xuống ngang người, quét một vòng quanh mình, rồi giơ lại.
    const k = a.skill;
    if (k < 0.15) {
      const w = smooth(k, 0, 0.15);
      b.armR.rotation.x = lerp(-2.7, -3.1, w);
      b.hand.rotation.x = lerp(-0.5, -0.9, w);
    } else if (k < 0.85) {
      const down = smooth(k, 0.15, 0.3);
      const turn = Math.PI * 2 * smooth(k, 0.35, 0.85);
      b.armR.rotation.set(lerp(-3.1, -1.5, down), turn, lerp(0.35, 0, down));
      b.hand.rotation.set(lerp(-0.9, Math.PI / 2, down), turn, 0);
      b.chest.rotation.set(0.15 * down, 0.2 * Math.sin(turn), 0);
    } else {
      const back = smooth(k, 0.85, 1);
      b.armR.rotation.set(lerp(-1.5, -2.7, back), 0, lerp(0, 0.35, back));
      b.hand.rotation.set(lerp(Math.PI / 2, -0.5, back), 0, lerp(0, -0.3, back));
    }
  } else if (a.act === 'fight' && a.strike !== undefined) {
    const e = Math.sin(Math.PI * a.strike);
    b.armR.rotation.x = lerp(-2.7, -0.7, e);
    b.hand.rotation.x = lerp(-0.5, 1.6, e);
    b.chest.rotation.x = 0.3 * e;
  } else if (a.act === 'dead') {
    fallPose(b, a.fall ?? 1);
  }
  b.hips.position.copy(b.hips.userData.rest as THREE.Vector3);
  b.legL.rotation.set(-0.35, 0, -0.8);
  b.legR.rotation.set(-0.35, 0, 0.8);
  gripHands(b, ARM * K_GIONG);
}

// Cậu bé lên ba ngồi bệt trên chiếu.
const CHILD: Defs = {
  ...BASE,
  cHips: { parent: 'base', at: [0, 0.1, 0] },
  cChest: { parent: 'cHips', at: [0, 0.12, 0] },
  cHead: { parent: 'cChest', at: [0, 0.38, 0] },
  cArmL: { parent: 'cChest', at: [-0.13, 0.32, 0.02] },
  cArmR: { parent: 'cChest', at: [0.13, 0.32, 0.02] },
};

/** Cậu bé lên ba ngồi bệt trên chiếu, đầu cạo trọc chừa chỏm tóc trước trán, mặc yếm đỏ. */
function drawChild(r: Rig): void {
  r.on('base').band.box(0.66, 0.03, 0.52, C.thatch, 0, 0.015, 0.04);
  const hips = r.on('cHips').plain;
  for (const s of [-1, 1]) hips.cyl(0.05, 0.05, 0.24, C.skin, s * 0.08, 0.08, 0.13, [Math.PI / 2, 0, 0], 6);
  const chest = r.on('cChest');
  chest.plain.cyl(0.12, 0.15, 0.3, C.skin, 0, 0.22, 0, undefined, 8);
  chest.band.box(0.22, 0.24, 0.04, C.red, 0, 0.24, 0.13);
  for (const [b, s] of [
    ['cArmL', -1],
    ['cArmR', 1],
  ] as const) {
    const p = r.on(b).plain;
    p.cyl(0.035, 0.035, 0.2, C.skin, s * 0.15, 0.22, 0.04, [0.4, 0, s * 0.3], 6);
    p.sphere(0.04, C.skin, s * 0.17, 0.13, 0.08, [1, 1, 1], 6);
  }
  const h = r.on('cHead').plain;
  h.sphere(0.24, C.skin, 0, 0.58, 0, [1, 0.95, 0.95], 12);
  for (const s of [-1, 1]) {
    h.sphere(0.03, C.ink, s * 0.085, 0.57, 0.21, [1, 1.4, 0.5], 6);
    h.sphere(0.011, C.cream, s * 0.078, 0.585, 0.228, [1, 1, 1], 5);
    h.sphere(0.034, 0xe58a6a, s * 0.13, 0.51, 0.18, [1, 0.6, 0.4], 5);
  }
  h.sphere(0.08, C.hair, 0, 0.8, 0.07, [1, 0.75, 1], 8);
  h.cone(0.045, 0.14, C.hair, 0, 0.86, 0.14, [0.9, 0, 0], 6);
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

const K_TEEN = 1.25;

/** Thiếu niên Gióng: cao hẳn lên, yếm đỏ, ôm bát cơm đầy, cạnh chân là chồng bát đã ăn hết mà vẫn chưa no. */
function drawTeen(r: Rig): void {
  const base = r.on('base').plain;
  for (let i = 0; i < 3; i++) base.cyl(0.14, 0.08, 0.08, C.bronze, 0.42, 0.04 + i * 0.07, 0.12, undefined, 10);
  drawBig(r, [0, 0, 0], K_TEEN, (h) => {
    humanBody(h, { cloth: C.red });
    h.on('chest').band.box(0.18, 0.19, 0.03, C.red, 0, 0.5, 0.115);
    humanHead(h);
    const head = h.on('head').plain;
    head.sphere(0.06, C.hair, 0, 0.95, 0.06, [1, 0.75, 1], 8);
    head.cone(0.032, 0.1, C.hair, 0, 0.99, 0.11, [0.9, 0, 0], 6);
    h.local('handL', GRIP_L, null, (s) => {
      s.plain.cyl(0.144, 0.08, 0.1, C.bronze, 0, 0.03, 0.06, undefined, 12);
      s.plain.sphere(0.13, C.cream, 0, 0.09, 0.06, [1, 0.75, 1], 10);
    });
    h.local('hand', GRIP_R, null, (s) => {
      for (const dx of [-0.02, 0.02]) s.plain.box(0.012, 0.27, 0.012, C.woodLight, dx, 0.12, 0);
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
  // Lửa phun ra từ mõm ngựa, hai lớp đỏ cam và vàng, gắn vào đầu ngựa để theo đầu ngựa gật.
  const flames: THREE.Mesh[] = [];
  for (const [rr, len, color, z] of [
    [0.13, 0.62, C.fire, 1.12],
    [0.07, 0.42, C.ember, 1.04],
  ] as const) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(rr, len, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    flame.position.set(0, 1.22 - 1.25, z - 0.55);
    flame.rotation.x = Math.PI / 2;
    bones.qHead.add(flame);
    flames.push(flame);
  }
  if (opts.glow) addHalo(group, 1.9, -0.32);
  return finish(group, (a) => {
    poseGiongRider(bones as unknown as Human, a);
    const e = a.act === 'fight' && a.strike !== undefined ? Math.sin(Math.PI * a.strike) : 0;
    poseIronHorse(bones, a, e);
    const t = a.time ?? 0;
    flames.forEach((f, i) => f.scale.set(1, 0.7 + 0.5 * Math.abs(Math.sin(t * 9 + i)), 1));
  });
}

// ---------- Sơn Tinh ----------

const K_SON = 1.45;

/** Gậy thần: cán gỗ, đầu gậy có vòng đồng ôm một hòn đá thiêng, vài lá rừng. */
function sonStaff(s: Parts): void {
  s.plain.cyl(0.03, 0.035, 1.3, C.woodDark, 0, 0.4, 0, undefined, 6);
  s.band.cyl(0.055, 0.055, 0.08, C.bronze, 0, 1.05, 0, undefined, 10);
  s.plain.sphere(0.08, C.rock, 0, 1.16, 0, [1, 1.1, 1], 8);
  for (let i = 0; i < 3; i++) s.plain.cone(0.024, 0.1, C.leaf[i], Math.cos(i * 2.1) * 0.06, 1.08, Math.sin(i * 2.1) * 0.06, [0, 0, Math.cos(i * 2.1) * 0.8], 4);
}

/** Sơn Tinh, chúa vùng non cao: giáp đồng hoa văn trống, váy và áo choàng lá rừng, vai đắp đá núi, mũ lông chim. */
function drawSon(h: HumanRig): void {
  humanBody(h, { cloth: C.mountainCloak, pattern: false, flaps: false, top: C.bronze, belt: C.bronzeDark, armband: C.bronze });
  const hips = h.on('hips').plain;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    hips.cone(0.07, 0.24, C.leaf[i % 4], Math.sin(a) * 0.14, 0.26, Math.cos(a) * 0.13, [Math.PI + Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3], 4);
  }
  for (const [b, x] of [
    ['legL', -0.065],
    ['legR', 0.065],
  ] as const) {
    h.on(b).plain.cyl(0.058, 0.058, 0.05, C.bronze, x, 0.045, 0.01, undefined, 8);
  }
  const chest = h.on('chest');
  chest.band.cyl(0.155, 0.135, 0.22, C.bronze, 0, 0.48, 0, undefined, 12);
  chest.plain.box(0.42, 0.48, 0.035, C.mountainCloak, 0, 0.4, -0.19, [0.2, 0, 0]);
  for (let i = 0; i < 4; i++) chest.plain.cone(0.06, 0.18, C.leaf[i], -0.16 + i * 0.11, 0.17, -0.24, [Math.PI + 0.2, 0, 0], 4);
  for (const s of [-1, 1]) {
    chest.plain.sphere(0.1, C.rock, s * 0.19, 0.58, 0, [1, 0.8, 1], 7);
    chest.plain.cone(0.05, 0.11, C.leaf[1], s * 0.21, 0.67, 0, undefined, 5);
  }
  humanHead(h, { brows: true });
  hairCap(h);
  headband(h, C.bronze);
  featherCrown(h, [C.red, C.cream, C.leaf[3]], { len: 0.42 });
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
    p.cone(0.62, 0.42, C.rockDark, 0, 0.18, 0, undefined, 7);
    p.cone(0.3, 0.3, C.rock, 0.32, 0.18, -0.2, undefined, 6);
    p.cone(0.25, 0.26, C.leaf[2], -0.35, 0.16, 0.15, undefined, 6);
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

const K_THUY = 1.25;
const THUY_AT: V3 = [0, 0.36, 0];

/** Đinh ba đồng, dựng từ chỗ tay nắm. */
function trident(s: Parts): void {
  s.plain.cyl(0.022, 0.022, 1.36, C.bronzeDark, 0, 0.43, 0, undefined, 6);
  s.plain.box(0.21, 0.035, 0.035, C.bronzeLight, 0, 1.03, 0);
  for (const dx of [-0.08, 0, 0.08]) s.plain.cone(0.025, 0.18, C.bronzeLight, dx, 1.15, 0, undefined, 4);
}

/** Thủy Tinh, chúa miền nước thẳm: áo xanh biển, râu rong biển, mũ đồng vây cá, cầm đinh ba, đứng trên ngọn sóng. */
function drawThuy(r: Rig): void {
  const p = r.on('base').plain;
  p.cyl(0.42, 0.55, 0.3, C.sea, 0, 0.15, 0, undefined, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.cone(0.14, 0.34, i % 2 ? C.foam : C.sea, Math.cos(a) * 0.42, 0.34, Math.sin(a) * 0.42, [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], 6);
  }
  p.sphere(0.36, C.foam, 0, 0.3, 0, [1, 0.35, 1], 10);
  drawBig(r, THUY_AT, K_THUY, (h) => {
    humanBody(h, { legs: C.sea, cloth: C.sea, long: true, top: C.foam, belt: C.bronze, armband: C.bronze });
    humanHead(h, { brows: true, beard: C.serpent });
    const head = h.on('head').plain;
    head.sphere(0.232, C.bronze, 0, 0.84, -0.02, [1, 0.62, 1], 10);
    featherCrown(h, [C.sea, C.bronzeLight], { count: 5, len: 0.34, spread: 0.32 });
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

/** An Dương Vương: giáp đồng hoa văn trống, váy và áo choàng đỏ son, râu mép, vương miện vàng, mũ lông chim. */
function drawAdv(h: HumanRig, crossbow: boolean): void {
  humanBody(h, { cloth: C.red, long: true, pattern: false, top: C.bronze, belt: C.gold, armband: C.gold });
  for (const [b, x] of [
    ['legL', -0.065],
    ['legR', 0.065],
  ] as const) {
    h.on(b).plain.cyl(0.058, 0.06, 0.05, C.bronzeDark, x, 0.035, 0.02, undefined, 8);
  }
  const chest = h.on('chest');
  chest.band.cyl(0.155, 0.135, 0.22, C.bronze, 0, 0.48, 0, undefined, 12);
  chest.plain.box(0.46, 0.58, 0.035, C.red, 0, 0.4, -0.2, [0.18, 0, 0]);
  for (const s of [-1, 1]) {
    chest.plain.sphere(0.09, C.bronzeLight, s * 0.19, 0.58, 0, [1, 0.75, 1], 8);
    chest.plain.cone(0.035, 0.1, C.gold, s * 0.24, 0.63, 0, [0, 0, -s * 0.8], 5);
  }
  humanHead(h, { brows: true, mustache: C.hair });
  hairCap(h);
  headband(h, C.gold, 0.06);
  const head = h.on('head').plain;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    head.cone(0.025, 0.07, C.gold, Math.sin(a) * 0.218, 0.88, Math.cos(a) * 0.218 - 0.03, undefined, 4);
  }
  featherCrown(h, [C.red, C.cream, C.gold], { len: 0.42 });
  if (crossbow) h.local('hand', GRIP_R, null, (s) => crossbowParts(s, true, 1.05 / K_ADV));
  else {
    // Rìu đồng lưỡi xéo kiểu Đông Sơn, vua cầm khi chưa có nỏ thần.
    h.local('hand', GRIP_R, null, (s) => {
      s.plain.cyl(0.022, 0.022, 0.9, C.woodDark, 0, 0.35, 0, undefined, 6);
      s.band.box(0.04, 0.22, 0.25, C.bronze, 0, 0.75, 0.11, [0.35, 0, 0]);
      s.plain.sphere(0.035, C.bronzeLight, 0, 0.85, 0, [1, 1, 1], 8);
    });
  }
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
