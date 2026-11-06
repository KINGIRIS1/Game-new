// Bến thuyền khơi 3×3: kho hải sản sàn cao góc sau bên trái, giàn phơi lưới vây bên trái, đụn vỏ ốc biển bên phải,
// cầu tàu gỗ dọc mép sông, cầu ván chìa ra chỗ thuyền khơi neo. Bản vẽ ở docs/bo-cuc-cong-trinh.md.
// Mặt trước (+z) quay ra sông như bến, làng chài. Thuyền khơi không thuộc mô hình: World dựng riêng (`makeThuyenKhoi`),
// neo trước cầu ván (`benDock` ở game/bien.ts) rồi xuôi sông ra biển.
// Ba cấp mở theo Điện 8, 9, 10 nên mái theo cấp Điện ấy (`roofFor(level + 7)`).

import type * as THREE from 'three';
import { banner, boatRoof, lacBird, roofFor, stiltHall, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { seeded, type ShapeBuilder } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, rod, yard } from './chung';

export const BEN_KHOI_LOT = new Lot(3, [
  'KKK.QQ',
  'KKK.QQ',
  'LL,,OO',
  'LL,,OO',
  'DD,,MT',
  '======',
]);

/** Bãi cát ven sông. */
const SAND = 0xd9c391;
/** Lối đất nện ra cầu tàu. */
const PATH = 0xbf9f6c;
/** Lưới vây nhuộm nâu. */
const NET = 0x7a6448;
/** Phao lưới bằng gỗ nhẹ. */
const FLOAT = 0xe8dcb8;
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
  const p = m.plain;
  const K = BEN_KHOI_LOT.zone('K');
  const postH = 0.6 + 0.06 * (level - 1);
  stiltHall(m, { x: K.x, z: K.z - 0.05, w: 1.4, d: 0.85, postH, roofL: 1.65, roofW: 1.1, lift: 0.3, roof });
  // Cá khô xâu treo dưới sàn, phía trước.
  rod(p, [K.x - 0.6, postH - 0.06, K.z + 0.4], [K.x + 0.6, postH - 0.06, K.z + 0.4], 0.012, C.bamboo, 4);
  for (let i = 0; i < 7; i++) {
    const fx = K.x - 0.52 + i * 0.17;
    p.sphere(0.045, C.fish, fx, postH - 0.17, K.z + 0.4, [0.45, 1.5, 0.2], 6);
    p.cone(0.03, 0.045, C.fishBelly, fx, postH - 0.09, K.z + 0.4, undefined, 4);
  }
  // Thang tre lên sàn, thúng cá chân cột.
  rod(p, [K.x + 0.55, 0, K.z + 0.62], [K.x + 0.55, postH, K.z + 0.38], 0.016, C.bamboo, 4);
  rod(p, [K.x + 0.4, 0, K.z + 0.62], [K.x + 0.4, postH, K.z + 0.38], 0.016, C.bamboo, 4);
  for (const [dx, s] of [[-0.45, 1], [-0.2, 0.85]] as const) {
    p.cyl(0.12 * s, 0.09 * s, 0.12 * s, C.thatch, K.x + dx, 0.07, K.z + 0.62, undefined, 8);
    for (const fz of [-0.03, 0.04]) p.sphere(0.04 * s, C.fish, K.x + dx, 0.14 * s, K.z + 0.62 + fz, [1.6, 0.4, 0.6], 5);
  }
}

/** Giàn phơi lưới vây lớn: hai cột cao, sào ngang, tấm lưới buông có hàng phao; cấp 2 thêm tấm lưới thứ hai. */
function netRack(p: ShapeBuilder, level: number): void {
  const L = BEN_KHOI_LOT.zone('L');
  const h = 1.05;
  for (const dx of [-0.42, 0.42]) p.cyl(0.035, 0.04, h, C.woodDark, L.x + dx, h / 2, L.z - 0.1, undefined, 5);
  rod(p, [L.x - 0.48, h - 0.05, L.z - 0.1], [L.x + 0.48, h - 0.05, L.z - 0.1], 0.018, C.bamboo, 4);
  p.box(0.8, 0.72, 0.012, NET, L.x, h - 0.43, L.z - 0.1, [0.06, 0, 0]);
  for (let i = 0; i < 6; i++) p.sphere(0.028, FLOAT, L.x - 0.35 + i * 0.14, h - 0.08, L.z - 0.08, [1.3, 0.8, 0.8], 5);
  if (level >= 2) {
    // Tấm lưới thứ hai vắt trên giá thấp phía trước, chì lưới đá treo mép dưới.
    rod(p, [L.x - 0.45, 0.62, L.z + 0.22], [L.x + 0.45, 0.62, L.z + 0.22], 0.016, C.bamboo, 4);
    for (const dx of [-0.42, 0.42]) p.cyl(0.03, 0.035, 0.64, C.woodDark, L.x + dx, 0.32, L.z + 0.22, undefined, 5);
    p.box(0.78, 0.42, 0.012, NET, L.x, 0.4, L.z + 0.24, [-0.08, 0, 0]);
    for (let i = 0; i < 5; i++) p.sphere(0.022, C.rockDark, L.x - 0.3 + i * 0.15, 0.2, L.z + 0.26, [1, 1, 1], 5);
  }
  // Cuộn chão gai dưới chân giàn.
  p.cyl(0.13, 0.13, 0.07, C.thatchDark, L.x + 0.15, 0.06, L.z + 0.42, undefined, 10);
  p.cyl(0.06, 0.06, 0.075, C.earthDark, L.x + 0.15, 0.065, L.z + 0.42, undefined, 8);
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

/** Chum mắm cá biển có nắp, hai chiếc. */
function jars(p: ShapeBuilder): void {
  const M = BEN_KHOI_LOT.zone('M');
  for (const [dx, dz, s] of [[-0.05, -0.05, 1], [0.1, 0.1, 0.8]] as const) {
    p.cyl(0.1 * s, 0.075 * s, 0.24 * s, C.soil, M.x + dx, 0.12 * s + 0.03, M.z + dz, undefined, 8);
    p.cyl(0.08 * s, 0.08 * s, 0.025, C.earthDark, M.x + dx, 0.25 * s + 0.03, M.z + dz, undefined, 8);
  }
}

/** Tời gỗ kéo thuyền: trụ tời đứng, bốn tay quay, chão chạy ra mép nước. */
function capstan(p: ShapeBuilder): void {
  const T = BEN_KHOI_LOT.zone('T');
  p.cyl(0.08, 0.1, 0.36, C.wood, T.x, 0.2, T.z, undefined, 8);
  p.cyl(0.11, 0.11, 0.04, C.woodDark, T.x, 0.38, T.z, undefined, 8);
  for (const a of [0, Math.PI / 2]) p.box(0.5, 0.03, 0.03, C.woodDark, T.x, 0.33, T.z, [0, a, 0]);
  rod(p, [T.x, 0.15, T.z + 0.08], [T.x - 0.25, DECK_Y + 0.02, 1.45], 0.01, C.thatchDark, 4);
}

/** Cấp 1: đá neo thuyền (hòn đá buộc ngáng gỗ) và thúng cá; cấp 2: chòi lửa hiệu đốt đuốc dẫn thuyền về bến. */
function beacon(m: ToonModel, level: number): void {
  const p = m.plain;
  const D = BEN_KHOI_LOT.zone('D');
  if (level < 2) {
    p.sphere(0.13, C.rockDark, D.x - 0.2, 0.1, D.z, [1.2, 0.8, 1], 7);
    p.box(0.42, 0.04, 0.05, C.woodDark, D.x - 0.2, 0.2, D.z, [0, 0.5, 0]);
    p.cyl(0.12, 0.09, 0.12, C.thatch, D.x + 0.25, 0.07, D.z, undefined, 8);
    return;
  }
  const h = 1.35;
  for (const dx of [-0.17, 0.17]) for (const dz of [-0.12, 0.12]) rod(p, [D.x + dx * 1.4, 0, D.z + dz * 1.4], [D.x + dx, h, D.z + dz], 0.025, C.bamboo, 4);
  p.box(0.44, 0.05, 0.34, C.wood, D.x, h, D.z);
  p.cyl(0.13, 0.08, 0.1, C.bronze, D.x, h + 0.08, D.z, undefined, 10);
  m.glow.cone(0.1, 0.24, C.fire, D.x, h + 0.25, D.z, undefined, 6);
  m.glow.cone(0.06, 0.16, C.ember, D.x, h + 0.22, D.z, undefined, 6);
  // Thang tre lên chòi.
  rod(p, [D.x + 0.32, 0, D.z + 0.2], [D.x + 0.2, h, D.z + 0.12], 0.014, C.bamboo, 4);
}

/**
 * Góc sau bên phải. Cấp 1, 2: cột buồm dự phòng gác trên hai mễ, cuộn chão. Cấp 3: miếu thờ cá Ông (cá voi phù hộ
 * người đi biển): nền đá, gian miếu mái theo cấp, vòm xương sườn cá voi trước cửa, bát hương đồng.
 */
function corner(m: ToonModel, level: number, roof: Roof): void {
  const p = m.plain;
  const Q = BEN_KHOI_LOT.zone('Q');
  if (level < 3) {
    for (const dx of [-0.32, 0.32]) {
      rod(p, [Q.x + dx - 0.1, 0, Q.z - 0.1], [Q.x + dx, 0.24, Q.z], 0.022, C.woodDark, 4);
      rod(p, [Q.x + dx + 0.1, 0, Q.z + 0.1], [Q.x + dx, 0.24, Q.z], 0.022, C.woodDark, 4);
    }
    rod(p, [Q.x - 0.48, 0.26, Q.z], [Q.x + 0.48, 0.26, Q.z], 0.04, C.wood, 6);
    p.cyl(0.14, 0.14, 0.08, C.thatchDark, Q.x + 0.1, 0.05, Q.z + 0.32, undefined, 10);
    return;
  }
  const x = Q.x + 0.05;
  const z = Q.z - 0.15;
  p.box(0.62, 0.18, 0.48, C.rock, x, 0.09, z);
  m.band.box(0.44, 0.32, 0.32, C.woodLight, x, 0.34, z);
  p.box(0.14, 0.2, 0.02, C.red, x, 0.31, z + 0.165);
  boatRoof(m, roof, { length: 0.72, width: 0.56, lift: 0.15, drop: 0.15, thickness: 0.04 }, x, 0.63, z);
  if (roof.lac) for (const s of [-1, 1]) lacBird(m, x + s * 0.32, 0.78, z, s > 0 ? 0 : Math.PI, 0.5);
  p.cyl(0.04, 0.035, 0.05, C.bronze, x, 0.205, z + 0.28, undefined, 8);
  // Vòm xương sườn cá voi: bốn cặp xương cong trắng ngà dựng trước miếu.
  for (let i = 0; i < 4; i++) {
    const zz = z + 0.34 + i * 0.1;
    const s = 1 - i * 0.12;
    for (const sx of [-1, 1]) {
      rod(p, [x + sx * 0.3 * s, 0.02, zz], [x + sx * 0.25 * s, 0.32 * s, zz], 0.018, C.cream, 4);
      rod(p, [x + sx * 0.25 * s, 0.32 * s, zz], [x + sx * 0.05, 0.46 * s, zz], 0.016, C.cream, 4);
    }
  }
}

export function makeBenKhoi(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = BEN_KHOI_LOT;
  const roof = roofFor(dienOf(level));

  yard(m, 3, SAND);
  const path = L.zone(',');
  p.box(path.w - 0.04, 0.02, path.d - 0.03, PATH, path.x, 0.055, path.z);

  wharf(p);
  store(m, level, roof);
  netRack(p, level);
  shells(p, level);
  jars(p);
  capstan(p);
  beacon(m, level);
  corner(m, level, roof);
  // Cờ đuôi nheo ở đầu cầu ván: chàm ở cấp 1, đỏ từ cấp 2.
  banner(m, 0.62, PIER_END - 0.1, 1.5 + 0.15 * level, level >= 2 ? C.red : C.indigo);
  return m.group();
}

export const BEN_KHOI: CongTrinh = { tiles: 3, make: makeBenKhoi, spots: benKhoiSpots, view: { half: 3.6, lookY: 0.5, px: 56 } };
