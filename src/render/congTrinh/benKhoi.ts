// Bến thuyền khơi 3×3: kho hải sản sàn cao góc sau bên trái, đụn vỏ ốc biển bên phải, cầu tàu gỗ dọc mép sông, cầu
// ván chìa ra chỗ thuyền khơi neo (giản lược kiểu 2: một mái chính, xem docs/thiet-ke.md mục Giản lược công trình). Bản vẽ ở docs/bo-cuc-cong-trinh.md.
// Mặt trước (+z) quay ra sông như bến, làng chài. Thuyền khơi không thuộc mô hình: World dựng riêng (`makeThuyenKhoi`),
// neo trước cầu ván (`benDock` ở game/bien.ts) rồi xuôi sông ra biển.
// Ba cấp mở theo Điện 8, 9, 10 nên mái theo cấp Điện ấy (`roofFor(level + 7)`).

import type * as THREE from 'three';
import { stiltHall, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { seeded, type ShapeBuilder } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, maiGon, yard } from './chung';

export const BEN_KHOI_LOT = new Lot(3, [
  'KKKK..',
  'KKKK..',
  '..,,OO',
  '..,,OO',
  '..,,..',
  '======',
]);

/** Bãi cát ven sông. */
const SAND = 0xd9c391;
/** Lối đất nện ra cầu tàu. */
const PATH = 0xbf9f6c;
/** Mặt cầu tàu. */
const DECK_Y = 0.1;
/** Cầu ván chìa ra sông tới mạn thuyền khơi (thuyền neo ở z = 2,5, `benDock`). */
const PIER_END = 2.12;

/** Cấp Điện ứng với cấp bến: cấp 1, 2, 3 mở ở Điện 8, 9, 10. */
const dienOf = (level: number) => level + 7;

/**
 * Năm người theo thứ tự có người: ngư dân vá lưới vây, người gánh cá đi dọc cầu tàu, người giữ kho trước kho hải sản
 * (cấp 1, ba người); ngư dân ở đầu cầu ván buộc chão thuyền (cấp 2); người nhặt vỏ ốc bên đụn ốc (cấp 3).
 */
export function benKhoiSpots(): LotSpot[] {
  return [
    { job: 'nguDan', x: -1.0, y: 0.05, z: 0.42, ry: Math.PI * 0.85 },
    { job: 'buon', x: -0.35, y: DECK_Y, z: 1.22, ry: Math.PI / 2, walk: 0.75 },
    { job: 'giuKho', x: -0.6, y: 0.05, z: -0.3, ry: 0.2 },
    { job: 'nguDan', x: 0.42, y: DECK_Y, z: 1.95, ry: 0.4 },
    { job: 'phuNu', x: 0.55, y: 0.05, z: 0.15, ry: Math.PI / 2 },
  ];
}

/** Cầu tàu ván dọc mép sông trên cọc, cầu ván chìa ra chỗ thuyền khơi neo, cột neo bọc đồng ở đầu cầu. */
function wharf(p: ShapeBuilder): void {
  const E = BEN_KHOI_LOT.zone('=');
  const z0 = E.z - E.d / 2 + 0.02;
  const z1 = 1.48;
  p.box(E.w - 0.04, 0.08, z1 - z0, C.woodLight, E.x, DECK_Y - 0.04, (z0 + z1) / 2);
  for (const t of [1 / 4, 2 / 4, 3 / 4]) p.box(E.w - 0.04, 0.012, 0.015, C.wood, E.x, DECK_Y + 0.001, z0 + t * (z1 - z0));
  for (const x of [-1.38, -0.7, 0.7, 1.38]) p.cyl(0.045, 0.05, 0.62, C.woodDark, x, -0.21, z1 - 0.03, undefined, 5);
  // Cầu ván ra sông, cọc hai bên, cột neo đồng ở đầu cầu.
  const x = 0.35;
  const len = PIER_END - z1;
  p.box(0.42, 0.07, len, C.wood, x, DECK_Y - 0.035, z1 + len / 2);
  for (const sx of [-1, 1]) for (const z of [z1 + 0.25, PIER_END - 0.05]) p.cyl(0.035, 0.04, 0.62, C.woodDark, x + sx * 0.19, -0.2, z, undefined, 5);
  for (const sx of [-1, 1]) {
    p.cyl(0.035, 0.04, 0.16, C.woodDark, x + sx * 0.14, DECK_Y + 0.08, PIER_END - 0.08, undefined, 6);
    p.sphere(0.045, C.bronze, x + sx * 0.14, DECK_Y + 0.17, PIER_END - 0.08, [1, 0.8, 1], 6);
  }
}

/** Kho hải sản: nhà sàn cao mái theo cấp, cá khô treo hàng dưới hiên, thúng cá chân cột. */
function store(m: ToonModel, level: number, roof: Roof): void {
  const K = BEN_KHOI_LOT.zone('K');
  const postH = 0.6 + 0.06 * (level - 1);
  stiltHall(m, { x: K.x - 0.05, z: K.z - 0.05, w: 1.7, d: 0.95, postH, roofL: 2.0, roofW: 1.2, lift: 0.34, roof });
}

/**
 * Đụn vỏ ốc biển (ốc tiền) trong nong lớn: hàng trăm vỏ ốc kem, hồng chất thành đụn. Cấp 2 thêm thúng ốc, cấp 3 đụn
 * thứ hai cao hơn.
 */
function shells(p: ShapeBuilder, level: number): void {
  const O = BEN_KHOI_LOT.zone('O');
  const heap = (cx: number, cz: number, r: number, h: number, seed: number) => {
    p.cyl(r + 0.05, r + 0.03, 0.03, C.thatch, cx, 0.045, cz, undefined, 14);
    const rand = seeded(seed);
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * r;
      const y = 0.08 + (1 - d / r) * h * (0.75 + rand() * 0.25);
      p.sphere(0.035, rand() < 0.3 ? C.shellPink : C.shell, cx + Math.cos(a) * d, y, cz + Math.sin(a) * d, [1.3, 0.75, 0.95], 5);
    }
  };
  heap(O.x - 0.05, O.z - 0.12, 0.32, 0.26, 41);
  if (level >= 2) {
    for (const [dx, dz] of [[0.32, 0.33], [0.05, 0.4]] as const) {
      p.cyl(0.1, 0.08, 0.12, C.thatchDark, O.x + dx, 0.07, O.z + dz, undefined, 8);
      for (let i = 0; i < 4; i++) p.sphere(0.03, i % 2 ? C.shellPink : C.shell, O.x + dx - 0.04 + (i % 2) * 0.07, 0.14, O.z + dz - 0.03 + Math.floor(i / 2) * 0.06, [1.3, 0.75, 0.95], 5);
    }
  }
  if (level >= 3) heap(O.x + 0.28, O.z - 0.3, 0.2, 0.34, 77);
}

export function makeBenKhoi(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = BEN_KHOI_LOT;
  const roof = maiGon(dienOf(level));

  yard(m, 3, SAND);
  const path = L.zone(',');
  p.box(path.w - 0.04, 0.02, path.d - 0.03, PATH, path.x, 0.055, path.z);

  wharf(p);
  store(m, level, roof);
  // Đụn vỏ ốc biển bên phải, to dần theo cấp.
  shells(p, level);
  return m.group();
}

export const BEN_KHOI: CongTrinh = { tiles: 3, make: makeBenKhoi, spots: benKhoiSpots, view: { half: 3.6, lookY: 0.5, px: 56 } };
