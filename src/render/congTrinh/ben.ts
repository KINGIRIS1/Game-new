// Bến chợ thuyền 3×3: ba dải từ bờ ra sông (kho, chợ hai dãy sạp, sàn bến). Bản vẽ ở docs/bo-cuc-cong-trinh.md.
// Mặt trước (+z) quay ra sông: mép móng z = +1,5 là mép nước, cầu tàu và thuyền chìa ra quá mép này.

import type * as THREE from 'three';
import { above5, banner, bird, boatRoof, roofFor } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel } from '../toon';
import { type CongTrinh, type Dock, type LotSpot, yard } from './chung';

export const BEN_LOT = new Lot(3, [
  'KKK.WW',
  'KKK.WW',
  'SS,,ss',
  'SS,,ss',
  'F.,,.F',
  '==GG==',
]);

/** Mặt sàn bến gỗ dọc mép sông và mặt cầu tàu. */
const DECK_Y = 0.1;
/** Mặt lối chợ lát ván. */
const LANE_Y = 0.08;
/** Cầu tàu chìa ra sông tới z này: cấp 1–2 ngắn, cấp 3 trở lên dài, có nhánh phụ. */
const jettyEnd = (level: number) => (level >= 3 ? 3.35 : 2.5);

/**
 * Bốn người buôn, mỗi người một cột x − z để khỏi che nhau (đi qua lại theo trục x):
 * qua lại giữa hai dãy sạp; trên cầu tàu nhận hàng; sau chợ trước nhà kho; trước sạp đỏ.
 */
export function benSpots(): LotSpot[] {
  return [
    { job: 'buon', x: 0, y: LANE_Y, z: 0.05, ry: 0, walk: 0.3 },
    { job: 'buon', x: -0.06, y: DECK_Y, z: 1.75, ry: Math.PI, walk: 0 },
    { job: 'buon', x: 0.25, y: 0.05, z: -0.95, ry: 0, walk: 0.15 },
    { job: 'buon', x: -0.75, y: 0.05, z: 0.78, ry: 0, walk: 0.2 },
  ];
}

/**
 * Thuyền neo dọc theo cầu tàu (camera nhìn từ trước bên phải nên thuyền đậu bên phải cầu tàu mới thấy rõ):
 * thuyền nhỏ sát bên phải cầu tàu (cấp 1); cấp 6 thuyền buôn lớn ghé sát cầu tàu, thuyền nhỏ dời ra ngoài;
 * cấp 8 thuyền buôn thứ hai neo bên trái, ngoài nhánh phụ.
 */
export function benDocks(level: number): Dock[] {
  const out: Dock[] = [{ kind: 'small', x: level >= 6 ? 1.25 : 0.55, z: 2.6, ry: Math.PI / 2, scale: 0.9 }];
  if (level >= 6) out.push({ kind: 'trader', x: 0.66, z: 2.95, ry: -Math.PI / 2, scale: 0.8 });
  if (level >= 8) out.push({ kind: 'trader', x: -1.1, z: 2.9, ry: Math.PI / 2, scale: 0.72 });
  return out;
}

/**
 * Sạp chợ dài theo trục z, quầy quay ra lối chợ: `face` = +1 lối ở bên phải (+x), −1 lối ở bên trái.
 * Bạt căng nghiêng về phía sau, quầy có hàng, chum đứng góc sau. To hơn sạp cũ chừng 20%.
 */
function sap(m: ToonModel, x: number, z: number, color: number, goods: number, face: number): void {
  const p = m.plain;
  for (const dx of [-0.3, 0.3]) {
    const h = dx * face > 0 ? 1.0 : 0.88;
    for (const dz of [-0.4, 0.4]) p.cyl(0.026, 0.028, h, C.woodDark, x + dx, h / 2, z + dz, undefined, 5);
  }
  m.band.box(0.8, 0.04, 0.98, color, x, 0.96, z, [0, 0, face * 0.15]);
  // Quầy: mặt ván, tấm chắn trước quầy chạm đất.
  const qx = x + face * 0.12;
  p.box(0.36, 0.06, 0.82, C.woodLight, qx, 0.48, z);
  p.box(0.04, 0.42, 0.82, C.wood, qx + face * 0.17, 0.26, z);
  for (let i = 0; i < goods; i++) {
    const gz = z - 0.27 + (i * 0.54) / Math.max(goods - 1, 1);
    if (i % 2) p.sphere(0.075, i === 1 ? 0xd9862e : C.ripe, qx, 0.57, gz, [1, 0.8, 1], 6);
    else p.cyl(0.085, 0.065, 0.1, C.thatch, qx, 0.56, gz, undefined, 7);
  }
  p.cyl(0.1, 0.075, 0.24, C.soil, x - face * 0.24, 0.17, z + 0.3, undefined, 7);
}

export function makeBen(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = BEN_LOT;
  const roof = roofFor(level);
  const up = above5(level);

  yard(m, 3);

  // Lối chợ lát ván từ sau chợ thẳng ra sàn bến và cầu tàu.
  const lane = L.zone(',');
  const laneZ0 = lane.z - lane.d / 2;
  const laneZ1 = lane.z + lane.d / 2;
  p.box(0.64, 0.04, laneZ1 - laneZ0, C.wood, lane.x, LANE_Y - 0.02, (laneZ0 + laneZ1) / 2);
  for (const sx of [-0.11, 0.11]) p.box(0.015, 0.012, laneZ1 - laneZ0, C.woodDark, lane.x + sx, LANE_Y, (laneZ0 + laneZ1) / 2);

  // Sàn bến gỗ dọc mép sông: ván chạy dọc bờ, dầm mép nước, cọc cắm xuống sông.
  const dk = L.zone('=');
  const deckZ0 = dk.z - dk.d / 2 + 0.02;
  const deckZ1 = 1.48;
  const deckD = deckZ1 - deckZ0;
  p.box(2.94, 0.07, deckD, C.woodLight, 0, DECK_Y - 0.035, (deckZ0 + deckZ1) / 2);
  for (const t of [1 / 3, 2 / 3]) p.box(2.94, 0.012, 0.015, C.wood, 0, DECK_Y + 0.001, deckZ0 + t * deckD);
  p.box(2.96, 0.09, 0.07, C.wood, 0, DECK_Y - 0.06, deckZ1 - 0.02);
  for (const x of [-1.35, -0.75, 0.75, 1.35]) p.cyl(0.045, 0.05, 0.62, C.woodDark, x, -0.21, deckZ1 - 0.03, undefined, 5);

  // Cầu tàu chìa ra sông từ giữa sàn bến; cọc đôi cắm xuống nước; cọc buộc thuyền ở đầu cầu.
  const end = jettyEnd(level);
  const jz0 = deckZ0;
  p.box(0.56, 0.07, end - jz0, C.wood, 0, DECK_Y - 0.03, (jz0 + end) / 2);
  for (let z = 1.75; z < end; z += 0.32) p.box(0.56, 0.012, 0.015, C.woodDark, 0, DECK_Y + 0.006, z);
  const posts = level >= 3 ? [1.95, 2.65, end - 0.06] : [1.95, end - 0.06];
  for (const z of posts) for (const sx of [-1, 1]) p.cyl(0.045, 0.05, 0.62, C.woodDark, sx * 0.25, -0.21, z, undefined, 5);
  for (const sx of [-1, 1]) p.cyl(0.04, 0.045, 0.2, C.woodDark, sx * 0.21, DECK_Y + 0.1, end - 0.1, undefined, 5);
  if (level >= 3) {
    // Nhánh phụ chìa sang trái ở đầu cầu tàu, chỗ thuyền buôn thứ hai ghé (cấp 8).
    p.box(0.5, 0.07, 0.3, C.wood, -0.53, DECK_Y - 0.03, end - 0.15);
    p.cyl(0.045, 0.05, 0.62, C.woodDark, -0.68, -0.21, end - 0.15, undefined, 5);
    p.cyl(0.04, 0.045, 0.2, C.woodDark, -0.7, DECK_Y + 0.1, end - 0.25, undefined, 5);
  }

  // Hai dãy sạp chợ hai bên lối: sạp bạt đỏ (cấp 1), sạp bạt chàm (cấp 2, thành lầu chợ ở cấp 7).
  const S = L.zone('S');
  sap(m, S.x + 0.05, S.z, C.red, 3, 1);
  const s = L.zone('s');
  if (level >= 2 && level < 7) sap(m, s.x - 0.05, s.z, C.indigo, level >= 5 ? 3 : 2, -1);

  const K = L.zone('K');
  if (level < 4) {
    // Chưa có nhà kho: hàng chờ xuống thuyền chất ngoài sân sau chợ (chum, bao, hòm, thúng).
    p.cyl(0.11, 0.08, 0.26, C.soil, K.x - 0.3, 0.15, K.z + 0.1, undefined, 7);
    p.cyl(0.1, 0.075, 0.24, C.soil, K.x - 0.05, 0.14, K.z - 0.12, undefined, 7);
    p.sphere(0.13, C.cream, K.x + 0.25, 0.13, K.z + 0.12, [1.2, 0.75, 0.9], 6);
    p.box(0.26, 0.2, 0.22, C.woodLight, K.x + 0.2, 0.15, K.z - 0.2);
    p.cyl(0.09, 0.07, 0.12, C.thatch, K.x + 0.2, 0.31, K.z - 0.2, undefined, 7);
  } else {
    // Nhà kho ven sông trên cột thấp, mái thuyền; chum dưới sàn; bậc ván xuống lối chợ.
    const pk = 0.4 + 0.1 * up;
    for (const dx of [-0.55, 0, 0.55]) for (const dz of [-0.3, 0.3]) p.cyl(0.045, 0.055, pk, C.woodDark, K.x + dx, pk / 2, K.z + dz, undefined, 6);
    p.box(1.25, 0.07, 0.78, C.wood, K.x, pk, K.z);
    m.band.box(1.0, 0.52, 0.6, C.woodLight, K.x, pk + 0.3, K.z);
    p.box(0.24, 0.36, 0.03, C.woodDark, K.x + 0.25, pk + 0.22, K.z + 0.31);
    boatRoof(m, roof, { length: 1.45, width: 1.0, lift: 0.28, drop: 0.36, thickness: 0.06 }, K.x, pk + 0.8, K.z);
    for (let i = 0; i < 3; i++) p.box(0.2, 0.04, 0.1, C.woodDark, K.x + 0.25, pk * (1 - (i + 1) / 4), K.z + 0.42 + i * 0.1);
    p.cyl(0.11, 0.08, 0.26, C.soil, K.x - 0.3, 0.13, K.z, undefined, 7);
    p.cyl(0.1, 0.075, 0.24, C.soil, K.x - 0.05, 0.12, K.z + 0.05, undefined, 7);
  }
  if (level >= 5) {
    // Cờ hai cột hai góc trước chợ, cao thêm ở cấp 6–8.
    const [fl, fr] = L.groups('F');
    banner(m, fl.x - 0.15, fl.z, 1.8 + 0.12 * up, C.red);
    banner(m, fr.x - 0.25, fr.z, 1.65 + 0.12 * up, C.indigo);
  }
  if (level >= 6) {
    // Cổng bến có mái dựng ở chân cầu tàu: hai cột đai đồng, xà ngang, mái nhỏ theo cấp, cờ đuôi nheo hai bên.
    const G = L.zone('G');
    const gz = G.z;
    for (const sx of [-1, 1]) {
      const x = sx * 0.33;
      p.cyl(0.05, 0.06, 1.35, C.woodDark, x, DECK_Y + 0.67, gz, undefined, 6);
      p.cyl(0.07, 0.07, 0.06, C.bronze, x, DECK_Y + 0.9, gz, undefined, 8);
      m.band.box(0.18, 0.42, 0.03, sx < 0 ? C.red : C.indigo, x + sx * 0.13, DECK_Y + 1.02, gz);
    }
    p.box(0.86, 0.08, 0.1, C.wood, 0, DECK_Y + 1.3, gz);
    boatRoof(m, roof, { length: 1.0, width: 0.44, lift: 0.18, drop: 0.12, thickness: 0.04 }, 0, DECK_Y + 1.5, gz);
    if (level >= 8) {
      bird(m, 0.42, DECK_Y + 1.7, gz, 1, 0.35);
      bird(m, -0.42, DECK_Y + 1.7, gz, -1, 0.35);
    }
  }
  if (level >= 7) {
    // Lầu chợ hai tầng mái hình thuyền thay sạp bạt chàm: tầng dưới bày hàng, tầng trên vách hoa văn, chim đồng hai đầu nóc.
    const x = s.x;
    const z = s.z;
    const fy = 1.05 + 0.08 * (up - 2);
    for (const dx of [-0.38, 0.38]) for (const dz of [-0.38, 0.38]) p.cyl(0.045, 0.055, fy, C.woodDark, x + dx, fy / 2, z + dz, undefined, 6);
    p.box(0.92, 0.07, 0.92, C.wood, x, fy, z);
    m.band.box(0.66, 0.42, 0.66, C.woodLight, x, fy + 0.25, z);
    const ry = fy + 0.72;
    boatRoof(m, roof, { length: 1.02, width: 1.0, lift: 0.42, drop: 0.36, thickness: 0.06 }, x, ry, z);
    bird(m, x + 0.32, ry + 0.38, z, 1, 0.4);
    bird(m, x - 0.32, ry + 0.38, z, -1, 0.4);
    p.box(0.36, 0.06, 0.72, C.woodLight, x - 0.12, 0.48, z);
    p.box(0.04, 0.42, 0.72, C.wood, x - 0.29, 0.26, z);
    for (let i = 0; i < 3; i++) {
      const gz = z - 0.24 + i * 0.24;
      if (i % 2) p.sphere(0.075, 0xd9862e, x - 0.12, 0.57, gz, [1, 0.8, 1], 6);
      else p.cyl(0.085, 0.065, 0.1, C.thatch, x - 0.12, 0.56, gz, undefined, 7);
    }
  }
  if (level >= 8) {
    // Kho hàng mái cong vút góc sau bên phải, chim đồng hai đầu nóc.
    const W = L.zone('W');
    for (const dx of [-0.34, 0.34]) for (const dz of [-0.28, 0.28]) p.cyl(0.04, 0.05, 0.45, C.woodDark, W.x + dx, 0.225, W.z + dz, undefined, 6);
    p.box(0.86, 0.07, 0.74, C.wood, W.x, 0.45, W.z);
    m.band.box(0.66, 0.5, 0.56, C.woodLight, W.x, 0.72, W.z);
    boatRoof(m, roof, { length: 1.0, width: 0.92, lift: 0.5, drop: 0.32, thickness: 0.05 }, W.x, 1.22, W.z);
    bird(m, W.x + 0.34, 1.66, W.z, 1, 0.4);
    bird(m, W.x - 0.34, 1.66, W.z, -1, 0.4);
  }
  return m.group();
}

export const BEN: CongTrinh = { tiles: 3, make: makeBen, spots: benSpots, view: { half: 3.6, lookY: 0.5, px: 56 }, docks: benDocks };
