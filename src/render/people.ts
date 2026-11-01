// Dân làng theo nghề, có khung xương (body.ts): mỗi nơi làm việc một kiểu ăn mặc, một dụng cụ và một động tác,
// để nhìn là biết ai làm gì. `userData.pose(act)` đặt động tác mỗi khung (world.ts gọi): đứng là làm việc theo nghề,
// đi là đi qua đi lại mang hàng. Người lái đò (`makeRower`) chèo khi thuyền đi.

import * as THREE from 'three';
import {
  GRIP_L,
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
  pattern?: boolean;
  /** Mặc áo che thân trên (thương nhân, thợ rèn, người giữ kho, phụ nữ, Lạc hầu); không có thì cởi trần. */
  shirt?: number;
  /** Váy dài thay cho khố. */
  skirt?: boolean;
  hair: 'nonLa' | 'khanXep' | 'khanTho' | 'daiTran' | 'tocBuiNu' | 'miengHoang' | 'longChim';
  headColor?: number;
  drumPlate?: boolean;
  crossStrap?: number;
  greaves?: number;
  wristband?: number;
  earrings?: number;
  hairPin?: number;
}

const LOOKS: Record<Job, Look> = {
  nong: { cloth: 0x7a5232, pattern: false, hair: 'nonLa' },
  buon: { cloth: C.indigo, shirt: 0x4f6ea0, hair: 'khanXep' },
  thoDa: { cloth: 0x6f6a63, pattern: false, hair: 'khanTho', headColor: 0x55504a, wristband: 0x5a483a },
  thoRen: { cloth: 0x3f3229, pattern: false, hair: 'daiTran', headColor: C.red, wristband: 0x4a3424 },
  giuKho: { cloth: C.woodLight, shirt: C.cream, hair: 'khanTho', headColor: 0xd4b882 },
  phuNu: { cloth: C.red, shirt: 0xc85a3a, skirt: true, hair: 'tocBuiNu', earrings: C.bronzeLight, hairPin: C.bronzeLight },
  lacHau: { cloth: C.cream, shirt: C.cream, skirt: true, hair: 'miengHoang' },
  linhGac: { cloth: C.red, hair: 'longChim', drumPlate: true, crossStrap: C.woodDark, greaves: C.bronze, wristband: C.bronze },
};

function hair(r: HumanRig, look: Look): void {
  const p = r.on('head').plain;
  hairCap(r, look.hair === 'khanXep' ? C.indigo : C.hair);
  switch (look.hair) {
    case 'nonLa': {
      // Nón lá truyền thống Lạc Việt đan lá cọ/tre hình chóp nhọn che nắng mưa
      p.cone(0.28, 0.15, C.thatch, 0, 0.96, 0.01, [0.08, 0, 0], 14);
      p.cyl(0.285, 0.285, 0.014, 0xcfa560, 0, 0.89, 0.0, [0.08, 0, 0], 14);
      // Quai nón ôm hàm
      p.box(0.014, 0.16, 0.01, C.woodDark, -0.15, 0.77, 0.03, [0, 0, -0.2]);
      p.box(0.014, 0.16, 0.01, C.woodDark, 0.15, 0.77, 0.03, [0, 0, 0.2]);
      break;
    }
    case 'khanXep': {
      // Khăn xếp quấn đầu chỉnh chu màu xanh chàm
      p.cyl(0.225, 0.23, 0.08, C.indigo, 0, 0.83, -0.02, undefined, 14);
      p.cyl(0.232, 0.235, 0.03, 0x5a75a8, 0, 0.85, -0.02, undefined, 14);
      p.sphere(0.07, C.hair, 0, 0.96, -0.07, [1, 1, 1], 8);
      break;
    }
    case 'khanTho': {
      // Khăn quấn đầu thợ đá / thủ kho nẹp gọn gàng, thắt nút sau gáy
      p.cyl(0.224, 0.228, 0.065, look.headColor ?? 0x55504a, 0, 0.825, -0.02, undefined, 12);
      p.box(0.06, 0.08, 0.03, look.headColor ?? 0x55504a, 0, 0.82, -0.24, [0.3, 0, 0]);
      p.box(0.04, 0.12, 0.02, look.headColor ?? 0x55504a, -0.03, 0.74, -0.25, [0.4, 0, -0.2]);
      break;
    }
    case 'daiTran': {
      headband(r, look.headColor ?? C.red);
      // Dải vải buộc trán có 2 đuôi vải bay sau gáy
      p.box(0.04, 0.14, 0.015, look.headColor ?? C.red, 0.04, 0.74, -0.23, [0.35, 0, 0.2]);
      p.box(0.04, 0.12, 0.015, look.headColor ?? C.red, -0.04, 0.75, -0.23, [0.35, 0, -0.2]);
      break;
    }
    case 'tocBuiNu': {
      // Tóc búi cao quý phái của phụ nữ Lạc Việt, cài trâm đồng
      p.sphere(0.1, C.hair, 0, 0.98, -0.04, [1, 1.1, 1], 10);
      p.box(0.14, 0.36, 0.05, C.hair, 0, 0.65, -0.19, [0.1, 0, 0]);
      p.cyl(0.008, 0.008, 0.32, C.bronzeLight, 0, 0.98, -0.04, [0, 0, Math.PI / 2], 6);
      p.sphere(0.02, C.bronzeLight, -0.16, 0.98, -0.04, [1, 1, 1], 6);
      p.sphere(0.02, C.bronzeLight, 0.16, 0.98, -0.04, [1, 1, 1], 6);
      break;
    }
    case 'miengHoang': {
      // Mũ miện lông chim hồng hoàng của Lạc hầu: đai vàng ròng chạm mặt trời
      r.on('head').band.cyl(0.228, 0.235, 0.055, C.gold, 0, 0.835, -0.025, undefined, 16);
      p.sphere(0.035, C.bronzeLight, 0, 0.855, 0.19, [1, 1, 0.6], 8);
      featherCrown(r, [C.gold, C.red, C.cream], { count: 9, len: 0.44, spread: 0.24, tier2: true });
      break;
    }
    case 'longChim': {
      headband(r, C.red);
      featherCrown(r, [C.red, C.cream], { count: 7, len: 0.38, bronzeRim: true });
      break;
    }
  }
}

// Dụng cụ cầm tay phải, dựng từ chỗ tay nắm.

/** Cuốc đồng: cán gỗ, nẹp đồng, lưỡi đồng chữ U xòe sắc sảo thời Đông Sơn. */
function hoe(s: Parts): void {
  s.plain.cyl(0.016, 0.016, 0.65, C.woodDark, 0, 0.2, 0, undefined, 6);
  s.plain.cyl(0.024, 0.024, 0.05, C.bronzeDark, 0, 0.5, 0, undefined, 6);
  s.plain.box(0.15, 0.026, 0.16, C.bronze, 0, 0.51, 0.08, [0.15, 0, 0]);
  s.plain.box(0.16, 0.02, 0.04, C.bronzeLight, 0, 0.49, 0.15, [0.15, 0, 0]);
}

/** Đòn cân đồng của thương nhân. */
function scaleTool(s: Parts): void {
  s.plain.cyl(0.01, 0.01, 0.42, C.bronzeDark, 0, 0.14, 0, undefined, 5);
  s.plain.box(0.006, 0.14, 0.006, C.cream, 0, 0.26, 0.08);
  s.plain.cyl(0.055, 0.045, 0.012, C.bronzeLight, 0, 0.18, 0.08, undefined, 8);
  s.plain.sphere(0.022, C.bronze, 0, 0.32, -0.06);
}

/** Cuốc chim / búa đục đá: lưỡi sắt hai đầu nhọn. */
function pick(s: Parts): void {
  s.plain.cyl(0.018, 0.018, 0.58, C.woodDark, 0, 0.18, 0, undefined, 6);
  s.plain.box(0.05, 0.05, 0.32, C.iron, 0, 0.46, 0.02);
  s.plain.cone(0.025, 0.09, C.iron, 0, 0.46, 0.21, [Math.PI / 2, 0, 0], 4);
  s.plain.cone(0.025, 0.09, C.iron, 0, 0.46, -0.17, [-Math.PI / 2, 0, 0], 4);
}

/** Búa rèn kim khí nặng chắc. */
function hammer(s: Parts): void {
  s.plain.cyl(0.018, 0.018, 0.4, C.woodDark, 0, 0.14, 0, undefined, 6);
  s.plain.box(0.1, 0.09, 0.14, C.iron, 0, 0.33, 0.02);
  s.plain.box(0.11, 0.04, 0.05, C.bronzeDark, 0, 0.33, 0.08);
}

/** Thẻ bài kiểm kê kho thóc/kho vũ khí bằng gỗ bịt đồng. */
function inventoryTablet(s: Parts): void {
  s.plain.box(0.06, 0.28, 0.015, C.woodLight, 0, 0.16, 0.02);
  s.plain.box(0.065, 0.04, 0.02, C.bronze, 0, 0.28, 0.02);
  s.plain.box(0.01, 0.1, 0.01, C.red, 0, 0.04, 0.02);
}

/** Quyền trượng của Lạc hầu: gỗ quý, cổ bịt vàng, đầu chạm chim Lạc vỗ cánh. */
function royalStaff(s: Parts): void {
  s.plain.cyl(0.018, 0.018, 1.05, C.woodDark, 0, 0.22, 0, undefined, 6);
  s.band.cyl(0.025, 0.025, 0.12, C.gold, 0, 0.72, 0, undefined, 8);
  s.plain.sphere(0.05, C.gold, 0, 0.78, 0, [1, 1.2, 1], 8);
  s.plain.cone(0.03, 0.12, C.gold, 0, 0.84, 0.04, [Math.PI / 4, 0, 0], 4);
  s.plain.box(0.14, 0.025, 0.06, C.gold, 0, 0.78, 0);
}

const TOOLS: Partial<Record<Job, (s: Parts) => void>> = {
  nong: hoe,
  buon: scaleTool,
  thoDa: pick,
  thoRen: hammer,
  giuKho: inventoryTablet,
  lacHau: royalStaff,
  linhGac: (s) => spear(s, 0, 1.25),
};

function drawWorker(r: HumanRig, job: Job, sitting: boolean): void {
  const look = LOOKS[job];
  humanBody(r, {
    cloth: look.cloth,
    pattern: look.pattern,
    long: look.skirt,
    top: look.shirt,
    sleeves: look.shirt,
    drumPlate: look.drumPlate,
    crossStrap: look.crossStrap,
    greaves: look.greaves,
    wristband: look.wristband,
  });
  humanHead(r, { earrings: look.earrings, hairPin: look.hairPin });
  hair(r, look);
  const tool = TOOLS[job];
  if (tool) r.local('hand', GRIP_R, null, tool);
  const chest = r.on('chest');

  // Đồ mang theo trên người và đạo cụ đặc trưng theo nghề.
  if (job === 'nong') {
    // Bình bầu hồ lô đựng nước vắt chéo bên hông
    chest.plain.sphere(0.05, 0xcfa560, -0.16, 0.38, 0.02, [1, 1.2, 1], 7);
    chest.plain.sphere(0.035, 0xcfa560, -0.16, 0.44, 0.02, [1, 1.2, 1], 6);
    chest.plain.cyl(0.012, 0.012, 0.03, C.woodDark, -0.16, 0.47, 0.02, undefined, 4);
    chest.plain.box(0.012, 0.25, 0.01, 0x5a3720, -0.06, 0.46, 0.08, [0, 0, -0.6]);
  }
  if (job === 'buon') {
    const head = r.on('head').plain;
    // Khay mây sơn then đựng các cuộn vải lụa tơ tằm quý
    head.box(0.36, 0.04, 0.26, C.woodDark, 0, 1.04, 0);
    head.box(0.38, 0.06, 0.28, C.bronzeDark, 0, 1.03, 0);
    head.cyl(0.035, 0.035, 0.2, C.red, -0.09, 1.08, 0, [Math.PI / 2, 0, 0], 8);
    head.cyl(0.035, 0.035, 0.2, C.gold, 0, 1.08, 0, [Math.PI / 2, 0, 0], 8);
    head.cyl(0.035, 0.035, 0.2, C.indigo, 0.09, 1.08, 0, [Math.PI / 2, 0, 0], 8);
    // Túi gấm bên hông
    chest.plain.sphere(0.055, C.red, 0.16, 0.38, 0.02, [1, 1.2, 0.8], 6);
    chest.plain.sphere(0.02, C.gold, 0.16, 0.43, 0.02, [1, 1, 1], 4);
  }
  if (job === 'thoDa') {
    // Khối sa thạch góc cạnh vác trên vai
    chest.plain.box(0.24, 0.18, 0.2, C.rock, -0.22, 0.68, -0.02, [0, 0.2, 0.25]);
    chest.plain.box(0.2, 0.14, 0.16, C.rockDark, -0.22, 0.68, -0.02, [0, 0.2, 0.25]);
    // Tạp dề da thợ đục đá
    chest.plain.box(0.24, 0.28, 0.03, 0x5a483a, 0, 0.4, 0.12);
  }
  if (job === 'thoRen') {
    // Tạp dề da chống lửa có đai da nẹp đinh
    chest.plain.box(0.25, 0.36, 0.035, 0x4a3424, 0, 0.43, 0.13);
    chest.plain.box(0.03, 0.16, 0.02, 0x3a2516, -0.08, 0.54, 0.11, [0, 0, 0.3]);
    chest.plain.box(0.03, 0.16, 0.02, 0x3a2516, 0.08, 0.54, 0.11, [0, 0, -0.3]);
    chest.plain.sphere(0.015, C.bronze, -0.08, 0.46, 0.145);
    chest.plain.sphere(0.015, C.bronze, 0.08, 0.46, 0.145);
    // Tay trái kẹp phôi đồng đỏ lửa rực sáng
    r.local('handL', GRIP_L, null, (s) => {
      s.plain.cyl(0.012, 0.012, 0.32, C.iron, 0, 0.1, 0, undefined, 4);
      s.plain.box(0.03, 0.06, 0.08, C.iron, 0, 0.25, 0.04);
      s.glow.box(0.045, 0.045, 0.1, C.fire, 0, 0.26, 0.1);
      s.glow.box(0.035, 0.035, 0.08, C.ember, 0, 0.26, 0.1);
    });
  }
  if (job === 'giuKho') {
    // Bao thóc đầy ắp cột miệng dây thừng
    chest.plain.sphere(0.18, 0xd4b882, 0, 0.64, -0.19, [1.2, 0.85, 0.9], 10);
    chest.plain.cyl(0.06, 0.04, 0.08, 0xc4a66e, 0, 0.8, -0.2, undefined, 6);
    chest.plain.box(0.12, 0.02, 0.02, C.woodDark, 0, 0.77, -0.2);
    // Cuộn trúc giản (sách thẻ tre) kẹp bên sườn trái
    chest.plain.cyl(0.035, 0.035, 0.24, C.woodLight, -0.16, 0.45, 0, [0.3, 0, 0], 8);
  }
  if (job === 'phuNu') {
    if (!sitting) {
      // Gùi tre đan tinh tế sau lưng có hoa dại
      chest.plain.cyl(0.14, 0.1, 0.32, C.thatch, 0, 0.55, -0.2, [0.15, 0, 0], 10);
      chest.band.cyl(0.145, 0.105, 0.06, C.red, 0, 0.62, -0.21, [0.15, 0, 0], 10);
      chest.plain.sphere(0.03, C.red, -0.04, 0.72, -0.18);
      chest.plain.sphere(0.028, C.gold, 0.04, 0.73, -0.18);
      chest.plain.sphere(0.022, C.cream, 0, 0.75, -0.19);
    } else {
      // Khi ngồi gói bánh: mẹt tre và bánh chưng xanh vuông vức buộc lạt giang trước mặt
      chest.plain.cyl(0.24, 0.24, 0.025, C.thatch, 0, 0.25, 0.32, undefined, 12);
      chest.plain.box(0.15, 0.07, 0.15, 0x4f7f38, 0, 0.29, 0.32);
      chest.plain.box(0.155, 0.075, 0.02, C.cream, 0, 0.29, 0.32);
      chest.plain.box(0.02, 0.075, 0.155, C.cream, 0, 0.29, 0.32);
      chest.plain.box(0.2, 0.006, 0.1, 0x3d6828, -0.06, 0.265, 0.26, [0, 0.4, 0]);
    }
  }
  if (job === 'lacHau') {
    // Chuỗi ngọc bích quý phái trước ngực
    chest.plain.cyl(0.08, 0.08, 0.015, 0x3a7d65, 0, 0.56, 0.08, [0.35, 0, 0], 10);
    chest.plain.sphere(0.025, C.gold, 0, 0.51, 0.12);
    // Dải lụa đỏ thắm buông từ thắt lưng
    chest.plain.box(0.07, 0.28, 0.018, C.red, 0, 0.26, 0.14);
    chest.plain.box(0.05, 0.06, 0.022, C.gold, 0, 0.38, 0.14);
  }
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

/** Người lái đò: khố đỏ hoa văn, hình xăm sóng nước, mũ lông chim 5 nhánh, mái chèo gỗ lớn chạm khắc. */
export function makeRower(): THREE.Group {
  const r = new RigBuilder(HUMAN, DETAIL);
  humanBody(r, { cloth: C.red, pattern: true, armband: C.bronze, tattoo: true, wristband: C.bronze });
  humanHead(r);
  hairCap(r);
  headband(r, C.red);
  featherCrown(r, [C.red, C.cream], { count: 5, len: 0.36, bronzeRim: true });
  r.local('hand', GRIP_R, null, (s) => {
    s.plain.cyl(0.018, 0.018, 1.05, C.woodDark, 0, 0.05, 0, undefined, 6);
    s.plain.box(0.022, 0.36, 0.14, C.wood, 0, -0.4, 0);
    s.band.box(0.026, 0.16, 0.145, C.bronze, 0, -0.38, 0);
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
