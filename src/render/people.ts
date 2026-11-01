// Dân làng theo nghề, có khung xương (body.ts): mỗi nơi làm việc một kiểu ăn mặc, một dụng cụ và một động tác,
// để nhìn là biết ai làm gì. `userData.pose(act)` đặt động tác mỗi khung (world.ts gọi): đứng là làm việc theo nghề,
// đi là đi qua đi lại mang hàng. Người lái đò (`makeRower`) chèo khi thuyền đi.

import * as THREE from 'three';
import {
  GRIP_R,
  HUMAN,
  beginPose,
  featherCrown,
  gripHands,
  hairCap,
  headband,
  humanBody,
  humanHead,
  lerp,
  walkCycle,
  type Human,
  type HumanRig,
} from './body';
import { C } from './palette';
import { RigBuilder, skinRig, type Act, type Poser } from './rig';
import { spear, type Parts } from './weapons';

/** Dân làng đông và nhỏ trên màn hình: bớt số mặt cho nhẹ máy (xem `ShapeBuilder.detail`). */
const DETAIL = 0.6;

export type Job = 'nong' | 'buon' | 'thoDa' | 'thoRen' | 'giuKho' | 'phuNu' | 'lacHau' | 'linhGac';

interface Look {
  cloth: number;
  /** Mặc áo che thân trên (thương nhân, thợ rèn, người giữ kho, phụ nữ, Lạc hầu); không có thì cởi trần. */
  shirt?: number;
  /** Váy dài thay cho khố. */
  skirt?: boolean;
  hair: 'buiToc' | 'khan' | 'dai' | 'longChim' | 'daiTran';
  headColor?: number;
}

const LOOKS: Record<Job, Look> = {
  nong: { cloth: 0x7a5232, hair: 'khan', headColor: C.cream },
  buon: { cloth: C.indigo, shirt: 0x4f6ea0, hair: 'buiToc' },
  thoDa: { cloth: 0x6f6a63, hair: 'buiToc' },
  thoRen: { cloth: 0x3f3229, shirt: 0x4a3a30, hair: 'daiTran', headColor: C.red },
  giuKho: { cloth: C.woodLight, shirt: C.cream, hair: 'khan', headColor: 0xc9a46a },
  phuNu: { cloth: C.red, shirt: 0xb85a3a, skirt: true, hair: 'dai' },
  lacHau: { cloth: C.cream, shirt: C.cream, skirt: true, hair: 'longChim' },
  linhGac: { cloth: C.red, hair: 'longChim' },
};

function hair(r: HumanRig, look: Look): void {
  const p = r.on('head').plain;
  if (look.hair === 'khan') {
    // Khăn quấn kín đầu, vành khăn dày, nút thắt phía sau.
    const color = look.headColor ?? C.cream;
    p.sphere(0.222, color, 0, 0.84, -0.03, [1, 0.6, 1], 12);
    p.cyl(0.228, 0.232, 0.07, color, 0, 0.82, -0.03, undefined, 12);
    p.sphere(0.06, color, 0, 0.84, -0.26, [1, 0.8, 0.8], 6);
    return;
  }
  hairCap(r);
  switch (look.hair) {
    case 'buiToc':
      p.sphere(0.08, C.hair, 0, 1.0, -0.08, [1, 1, 1], 8);
      break;
    case 'dai':
      // Tóc dài búi cao, đuôi tóc buông sau lưng.
      p.sphere(0.09, C.hair, 0, 1.02, -0.04, [1, 1, 1], 8);
      p.box(0.15, 0.34, 0.06, C.hair, 0, 0.64, -0.2);
      break;
    case 'daiTran':
      headband(r, look.headColor ?? C.red);
      break;
    case 'longChim':
      headband(r, C.red);
      featherCrown(r, [C.red, C.cream], { count: 5, len: 0.34 });
      break;
  }
}

// Dụng cụ cầm tay phải, dựng từ chỗ tay nắm.

/** Cuốc: cán gỗ, lưỡi đồng chĩa về trước. */
function hoe(s: Parts): void {
  s.plain.cyl(0.016, 0.016, 0.62, C.woodDark, 0, 0.2, 0, undefined, 5);
  s.plain.box(0.12, 0.03, 0.15, C.bronze, 0, 0.5, 0.07);
}

/** Cuốc chim: lưỡi sắt hai đầu nhọn. */
function pick(s: Parts): void {
  s.plain.cyl(0.016, 0.016, 0.55, C.woodDark, 0, 0.18, 0, undefined, 5);
  s.plain.box(0.04, 0.04, 0.3, C.iron, 0, 0.44, 0.02);
}

/** Búa rèn. */
function hammer(s: Parts): void {
  s.plain.cyl(0.016, 0.016, 0.36, C.woodDark, 0, 0.12, 0, undefined, 5);
  s.plain.box(0.09, 0.08, 0.12, C.iron, 0, 0.3, 0.02);
}

/** Gậy của Lạc hầu, đầu bịt đồng. */
function staff(s: Parts): void {
  s.plain.cyl(0.018, 0.018, 0.9, C.woodDark, 0, 0.15, 0, undefined, 5);
  s.plain.sphere(0.05, C.bronze, 0, 0.62, 0, [1, 1, 1], 6);
}

const TOOLS: Partial<Record<Job, (s: Parts) => void>> = {
  nong: hoe,
  thoDa: pick,
  thoRen: hammer,
  lacHau: staff,
  linhGac: (s) => spear(s, 0, 1.1),
};

function drawWorker(r: HumanRig, job: Job, sitting: boolean): void {
  const look = LOOKS[job];
  humanBody(r, { cloth: look.cloth, long: look.skirt, top: look.shirt, sleeves: look.shirt });
  humanHead(r);
  hair(r, look);
  const tool = TOOLS[job];
  if (tool) r.local('hand', GRIP_R, null, tool);
  const chest = r.on('chest');
  // Đồ mang theo trên người.
  if (job === 'buon') {
    const head = r.on('head').plain;
    head.cyl(0.18, 0.13, 0.1, C.thatch, 0, 1.04, 0, undefined, 10);
    head.sphere(0.06, 0xd9862e, 0.05, 1.11, 0.02, [1, 1, 1], 6);
    head.sphere(0.06, C.ripe, -0.06, 1.11, -0.02, [1, 1, 1], 6);
  }
  if (job === 'thoDa') chest.plain.box(0.2, 0.14, 0.16, C.rock, -0.2, 0.68, -0.02, [0, 0.3, 0.3]);
  if (job === 'thoRen') chest.band.box(0.24, 0.36, 0.04, 0x4a3a30, 0, 0.42, 0.14);
  if (job === 'giuKho') chest.plain.sphere(0.15, C.cream, 0, 0.64, -0.17, [1.3, 0.8, 0.9], 8);
  if (job === 'phuNu' && !sitting) chest.plain.cyl(0.13, 0.09, 0.3, C.thatch, 0, 0.55, -0.2, [0.15, 0, 0], 8);
}

/** Đồ mang trên người khi đứng hay đi: tay đỡ thúng trên đầu, vác đá trên vai, quàng bao thóc. */
function holdLoad(b: Human, job: Job, sw = 0): void {
  if (job === 'buon') b.armR.rotation.set(0, 0, 2.75);
  if (job === 'thoDa') b.armL.rotation.set(0, 0, -2.6);
  if (job === 'giuKho') {
    b.armL.rotation.set(-2.7, 0, -0.35);
    b.armR.rotation.set(-2.7, 0, 0.35);
  }
  if (job === 'phuNu') {
    // Hai tay nắm quai gùi.
    b.armL.rotation.set(-0.35 - 0.15 * sw, 0, -0.1);
    b.armR.rotation.set(-0.35 + 0.15 * sw, 0, 0.1);
  }
}

/**
 * Động tác theo nghề, theo đồng hồ `t`: nông dân cúi bổ cuốc, thợ đá giơ cuốc chim bổ đá, thợ rèn quai búa,
 * Lạc hầu và lính gác đứng nhìn quanh, người khác đứng nghỉ với đồ trên người.
 */
function work(b: Human, job: Job, t: number): void {
  switch (job) {
    case 'nong': {
      const u = 0.5 + 0.5 * Math.sin(t * 2);
      b.chest.rotation.x = 0.35 + 0.12 * u;
      b.armR.rotation.set(lerp(-2.2, -0.6, u), 0, 0.15);
      b.armL.rotation.set(lerp(-1.6, -0.7, u), 0.35, 0);
      b.hand.rotation.set(lerp(-0.4, 1.1, u), 0, 0);
      break;
    }
    case 'thoDa': {
      const u = Math.abs(Math.sin(t * 3));
      b.chest.rotation.x = lerp(-0.05, 0.3, u);
      b.armR.rotation.set(lerp(-2.8, -0.7, u), 0, 0.1);
      b.hand.rotation.set(lerp(-0.6, 1.4, u), 0, 0);
      break;
    }
    case 'thoRen': {
      const u = Math.abs(Math.sin(t * 4.5));
      b.chest.rotation.x = 0.25;
      b.armR.rotation.set(lerp(-2.2, -0.9, u), 0, 0.1);
      b.hand.rotation.set(lerp(-0.3, 1.2, u), 0, 0);
      b.armL.rotation.set(-0.8, 0.3, 0);
      break;
    }
    case 'lacHau':
    case 'linhGac':
      b.head.rotation.y = 0.4 * Math.sin(t * 0.6);
      b.hand.rotation.set(0.05, 0, -0.06);
      break;
    default:
      holdLoad(b, job);
      b.head.rotation.y = 0.2 * Math.sin(t * 0.5);
  }
}

function poseWorker(b: Human, job: Job, sitting: boolean, a: Act): void {
  const t = a.time ?? 0;
  beginPose(b, t);
  if (sitting) {
    // Ngồi xếp bằng trên chiếu: hông hạ thấp, hai ống chân bắt chéo trước bụng, hai tay gói bánh.
    b.hips.position.y -= 0.22;
    b.legL.rotation.order = b.legR.rotation.order = 'YXZ';
    b.legL.rotation.set(-1.45, 0.55, 0);
    b.legR.rotation.set(-1.45, -0.55, 0);
    b.armR.rotation.set(-0.95 + 0.15 * Math.sin(t * 3), -0.35, 0);
    b.armL.rotation.set(-0.95 + 0.15 * Math.sin(t * 3 + Math.PI), 0.35, 0);
    b.chest.rotation.x = 0.15;
  } else if (a.act === 'walk') {
    const sw = walkCycle(b, a.phase ?? 0, a.stride ?? 0.45);
    holdLoad(b, job, sw);
  } else work(b, job, t);
  gripHands(b);
}

/**
 * Một người dân làm nghề `job`, cao khoảng 1 ô. `sitting`: ngồi xếp bằng trên chiếu (thân hạ thấp,
 * hai ống chân bắt chéo trước bụng), không đeo gùi.
 */
export function makeWorker(job: Job, sitting = false): THREE.Group {
  const r = new RigBuilder(HUMAN, DETAIL);
  drawWorker(r, job, sitting);
  const { group, bones } = skinRig(r.build());
  const pose: Poser = (a) => poseWorker(bones, job, sitting, a);
  pose({ act: 'stand' });
  group.userData.pose = pose;
  group.userData.job = job;
  return group;
}

/** Người lái đò: khố đỏ, mũ lông chim, hai tay cầm sào chèo. Đi (thuyền chạy) thì chèo; đứng thì cầm sào nghỉ. */
export function makeRower(): THREE.Group {
  const r = new RigBuilder(HUMAN, DETAIL);
  humanBody(r, { cloth: C.red, armband: C.bronze });
  humanHead(r);
  hairCap(r);
  headband(r, C.red);
  featherCrown(r, [C.red, C.cream], { count: 5, len: 0.34 });
  r.local('hand', GRIP_R, null, (s) => {
    s.plain.cyl(0.016, 0.016, 0.85, C.woodDark, 0, 0.0, 0, undefined, 5);
    s.plain.box(0.02, 0.18, 0.08, C.wood, 0, -0.4, 0);
  });
  const { group, bones } = skinRig(r.build());
  const pose: Poser = (a) => {
    beginPose(bones, a.time);
    // Sào chéo trước người, đầu dưới chĩa ra sau mạn thuyền; chèo thì kéo sào từ trước ra sau.
    const k = a.act === 'walk' ? Math.sin(a.phase ?? 0) : 0;
    bones.chest.rotation.x = 0.15 + 0.12 * k;
    bones.armR.rotation.set(-0.9 + 0.35 * k, 0, 0.2);
    bones.armL.rotation.set(-1.2 + 0.35 * k, 0.6, 0);
    bones.hand.rotation.set(0.9 + 0.3 * k, 0, 0.3);
    gripHands(bones);
  };
  pose({ act: 'stand' });
  group.userData.pose = pose;
  return group;
}
