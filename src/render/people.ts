// Dân làng theo nghề: mỗi nơi làm việc một kiểu ăn mặc và một dụng cụ, để nhìn là biết ai làm gì.
// Tay cầm dụng cụ là một nhóm riêng (`tool`) xoay quanh vai, để World làm động tác.

import * as THREE from 'three';
import { C } from './palette';
import { ToonModel, inkThin } from './toon';

export type Job = 'nong' | 'buon' | 'thoDa' | 'thoRen' | 'giuKho' | 'phuNu' | 'lacHau' | 'linhGac';

interface Look {
  cloth: number;
  /** Mặc áo che thân trên (thương nhân, phụ nữ, Lạc hầu); không có thì cởi trần. */
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

function head(m: ToonModel, look: Look, y: number): void {
  const p = m.plain;
  p.sphere(0.21, C.skin, 0, y, 0, [1, 0.95, 0.95], 12);
  for (const s of [-1, 1]) p.sphere(0.028, C.ink, s * 0.075, y - 0.01, 0.18, [1, 1.4, 0.5], 6);
  switch (look.hair) {
    case 'khan':
      // Khăn quấn đầu, nút thắt phía sau.
      p.sphere(0.22, C.hair, 0, y + 0.07, -0.04, [1, 0.55, 0.98], 12);
      p.cyl(0.215, 0.215, 0.08, look.headColor ?? C.cream, 0, y + 0.1, -0.01, undefined, 12);
      p.sphere(0.06, look.headColor ?? C.cream, 0, y + 0.1, -0.22, [1, 0.8, 0.8], 6);
      break;
    case 'buiToc':
      p.sphere(0.22, C.hair, 0, y + 0.07, -0.04, [1, 0.6, 0.98], 12);
      p.sphere(0.08, C.hair, 0, y + 0.24, -0.08, [1, 1, 1], 8);
      break;
    case 'dai':
      // Tóc dài búi cao, đuôi tóc buông sau lưng.
      p.sphere(0.225, C.hair, 0, y + 0.06, -0.04, [1, 0.65, 1], 12);
      p.sphere(0.09, C.hair, 0, y + 0.26, -0.04, [1, 1, 1], 8);
      p.box(0.16, 0.34, 0.06, C.hair, 0, y - 0.18, -0.17);
      break;
    case 'daiTran':
      p.sphere(0.22, C.hair, 0, y + 0.07, -0.04, [1, 0.6, 0.98], 12);
      p.cyl(0.22, 0.22, 0.05, look.headColor ?? C.red, 0, y + 0.06, 0, undefined, 12);
      break;
    case 'longChim':
      p.sphere(0.22, C.hair, 0, y + 0.07, -0.04, [1, 0.62, 0.98], 12);
      for (let i = -2; i <= 2; i++) p.box(0.055, 0.34, 0.03, i % 2 ? C.cream : C.red, i * 0.055, y + 0.32, -0.06, [0, 0, -i * 0.28]);
      break;
  }
}

/** Tay cầm dụng cụ, gốc tọa độ đặt ở vai để xoay. */
function toolArm(job: Job): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  p.cyl(0.035, 0.035, 0.24, C.skin, 0, -0.1, 0.02, [0.3, 0, 0], 6);
  switch (job) {
    case 'nong':
      // Cuốc: cán gỗ, lưỡi đồng.
      p.cyl(0.016, 0.016, 0.62, C.woodDark, 0, -0.12, 0.2, [1.1, 0, 0], 5);
      p.box(0.12, 0.03, 0.14, C.bronze, 0, -0.26, 0.47);
      break;
    case 'thoDa':
      // Cuốc chim: lưỡi sắt hai đầu nhọn.
      p.cyl(0.016, 0.016, 0.55, C.woodDark, 0, -0.08, 0.2, [1.1, 0, 0], 5);
      p.box(0.04, 0.04, 0.3, C.iron, 0, -0.12, 0.42, [0.5, 0, 0]);
      break;
    case 'thoRen':
      // Búa rèn.
      p.cyl(0.016, 0.016, 0.36, C.woodDark, 0, -0.14, 0.14, [1.1, 0, 0], 5);
      p.box(0.09, 0.08, 0.12, C.iron, 0, -0.2, 0.3);
      break;
    case 'lacHau':
      p.cyl(0.018, 0.018, 0.9, C.woodDark, 0, -0.05, 0.08, undefined, 5);
      p.sphere(0.05, C.bronze, 0, 0.42, 0.08, [1, 1, 1], 6);
      break;
    case 'linhGac':
      p.cyl(0.018, 0.018, 1.1, C.woodDark, 0, 0.05, 0.08, undefined, 5);
      p.cone(0.05, 0.2, C.bronze, 0, 0.7, 0.08, undefined, 4);
      break;
    default:
      break;
  }
  return m.group();
}

/** Một người dân làm nghề `job`, cao khoảng 1 ô. */
export function makeWorker(job: Job): THREE.Group {
  const look = LOOKS[job];
  const m = new ToonModel(inkThin);
  const p = m.plain;
  for (const x of [-0.06, 0.06]) p.cyl(0.04, 0.045, 0.18, C.skin, x, 0.09, 0, undefined, 6);
  if (look.skirt) m.band.cyl(0.12, 0.2, 0.36, look.cloth, 0, 0.22, 0, undefined, 10);
  else m.band.cyl(0.13, 0.17, 0.24, look.cloth, 0, 0.28, 0, undefined, 8);
  p.cyl(0.1, 0.12, 0.16, look.shirt ?? C.skin, 0, 0.47, 0, undefined, 8);
  // Tay trái để yên, tay phải là `tool`.
  p.cyl(0.035, 0.035, 0.22, look.shirt ?? C.skin, -0.15, 0.38, 0, [0, 0, -0.35], 6);
  head(m, look, 0.7);
  // Đồ mang theo trên người.
  if (job === 'buon') {
    p.cyl(0.18, 0.13, 0.1, C.thatch, 0, 1.0, 0, undefined, 10);
    p.sphere(0.06, 0xd9862e, 0.05, 1.07, 0.02, [1, 1, 1], 6);
    p.sphere(0.06, C.ripe, -0.06, 1.07, -0.02, [1, 1, 1], 6);
  }
  if (job === 'thoDa') p.box(0.2, 0.14, 0.16, C.rock, -0.2, 0.62, -0.02, [0, 0.3, 0.3]);
  if (job === 'thoRen') m.band.box(0.26, 0.34, 0.05, 0x4a3a30, 0, 0.36, 0.13);
  if (job === 'giuKho') p.sphere(0.15, C.cream, 0.0, 0.66, -0.16, [1.3, 0.8, 0.9], 8);
  if (job === 'phuNu') {
    // Gùi đeo sau lưng.
    p.cyl(0.13, 0.09, 0.3, C.thatch, 0, 0.5, -0.2, [0.15, 0, 0], 8);
  }
  const g = m.group();
  const arm = toolArm(job);
  arm.position.set(0.16, 0.5, 0);
  arm.userData.tool = true;
  g.add(arm);
  g.userData.job = job;
  return g;
}
