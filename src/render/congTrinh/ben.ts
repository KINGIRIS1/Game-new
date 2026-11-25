// Bến chợ thuyền 3×3: nhà chợ mở suốt phía sau, lối chợ ra sàn bến và cầu tàu (giản lược kiểu 2: một mái chính, xem
// docs/thiet-ke.md mục Giản lược công trình). Bản vẽ ở docs/bo-cuc-cong-trinh.md.
// Mặt trước (+z) quay ra sông: mép móng z = +1,5 là mép nước, cầu tàu và thuyền chìa ra quá mép này.

import type * as THREE from 'three';
import { above5 } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel } from '../toon';
import { type CongTrinh, type Dock, type LotSpot, lanMo, maiGon, yard } from './chung';

export const BEN_LOT = new Lot(3, [
  'KKKKK.',
  'KKKKK.',
  '..,,..',
  '..,,..',
  '..,,..',
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
 * qua lại giữa hai dãy sạp; ở chân cầu tàu nhận hàng; sau chợ cạnh nhà kho; trước sạp đỏ.
 */
export function benSpots(): LotSpot[] {
  return [
    { job: 'buon', x: 0, y: LANE_Y, z: 0.05, ry: 0, walk: 0.3 },
    { job: 'buon', x: -0.12, y: DECK_Y, z: 1.75, ry: Math.PI, walk: 0 },
    { job: 'buon', x: 0.25, y: 0.05, z: -0.95, ry: 0, walk: 0.15 },
    { job: 'buon', x: -0.6, y: 0.05, z: 0.75, ry: 0, walk: 0.15 },
  ];
}

/**
 * Thuyền neo dọc theo cầu tàu (camera nhìn từ trước bên phải nên thuyền đậu bên phải cầu tàu mới thấy rõ):
 * thuyền nhỏ sát bên phải cầu tàu (cấp 1); cấp 6 thuyền buôn lớn ghé sát cầu tàu, thuyền nhỏ dời ra ngoài;
 * cấp 8 thuyền buôn thứ hai neo bên trái, ngoài nhánh phụ; cấp 10 thuyền ấy thành thuyền buôn lớn hai buồm.
 */
export function benDocks(level: number): Dock[] {
  const out: Dock[] = [{ kind: 'small', x: level >= 6 ? 1.25 : 0.55, z: 2.6, ry: Math.PI / 2, scale: 0.9 }];
  if (level >= 6) out.push({ kind: 'trader', x: 0.66, z: 2.95, ry: -Math.PI / 2, scale: 0.8 });
  if (level >= 8) out.push({ kind: 'trader', x: -1.1, z: 2.9, ry: Math.PI / 2, scale: 0.72, big: level >= 10 });
  return out;
}

export function makeBen(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = BEN_LOT;
  const roof = maiGon(level);
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
  // Cấp 9 trở lên: cầu tàu lát phiến đá trên trụ đá, cột neo bọc đồng có chỏm đồng vàng.
  const end = jettyEnd(level);
  const jz0 = deckZ0;
  const stone = level >= 9;
  p.box(0.56, 0.07, end - jz0, stone ? C.rock : C.wood, 0, DECK_Y - 0.03, (jz0 + end) / 2);
  if (stone) {
    for (let z = 1.62, i = 0; z < end - 0.1; z += 0.26, i++) p.box(0.5, 0.02, 0.22, i % 2 ? C.rockDark : C.rock, 0, DECK_Y + 0.01, z + 0.13);
    for (const sx of [-1, 1]) p.box(0.04, 0.05, end - 1.5, C.gold, sx * 0.29, DECK_Y + 0.01, (1.5 + end) / 2);
  } else for (let z = 1.75; z < end; z += 0.32) p.box(0.56, 0.012, 0.015, C.woodDark, 0, DECK_Y + 0.006, z);
  const posts = level >= 3 ? [1.95, 2.65, end - 0.06] : [1.95, end - 0.06];
  for (const z of posts) for (const sx of [-1, 1]) {
    if (stone) p.box(0.14, 0.62, 0.14, C.rockDark, sx * 0.24, -0.21, z);
    else p.cyl(0.045, 0.05, 0.62, C.woodDark, sx * 0.25, -0.21, z, undefined, 5);
  }
  const bollard = (x: number, z: number) => {
    if (!stone) return p.cyl(0.04, 0.045, 0.2, C.woodDark, x, DECK_Y + 0.1, z, undefined, 5);
    p.cyl(0.05, 0.06, 0.2, C.bronze, x, DECK_Y + 0.1, z, undefined, 8);
    p.sphere(0.06, C.gold, x, DECK_Y + 0.22, z, [1, 0.8, 1], 7);
  };
  for (const sx of [-1, 1]) bollard(sx * 0.21, end - 0.1);
  if (stone) for (const sx of [-1, 1]) bollard(sx * 0.21, 2.3);
  if (level >= 3) {
    // Nhánh phụ chìa sang trái ở đầu cầu tàu, chỗ thuyền buôn thứ hai ghé (cấp 8).
    p.box(0.5, 0.07, 0.3, stone ? C.rock : C.wood, -0.53, DECK_Y - 0.03, end - 0.15);
    if (stone) p.box(0.14, 0.62, 0.14, C.rockDark, -0.68, -0.21, end - 0.15);
    else p.cyl(0.045, 0.05, 0.62, C.woodDark, -0.68, -0.21, end - 0.15, undefined, 5);
    bollard(-0.7, end - 0.25);
  }

  // Nhà chợ mở suốt phía sau, mái theo cấp, dài dần tới cấp 5, cao dần ở cấp 6–8; hai bàn hàng bày vải đỏ, vải chàm.
  const w = 1.4 + 0.2 * (Math.min(level, 5) - 1);
  const hx = -1.35 + w / 2;
  const hz = -0.95;
  lanMo(m, hx, hz, w, 0.8, 0.92 + 0.1 * up, roof, 0.24, 0.05);
  for (const [dx, c] of [[-0.35, C.red], [0.35, C.indigo]] as const) {
    p.box(0.55, 0.3, 0.42, C.wood, hx + dx * (w / 1.5), 0.2, hz);
    p.box(0.52, 0.06, 0.4, c, hx + dx * (w / 1.5), 0.38, hz);
  }
  return m.group();
}

export const BEN: CongTrinh = { tiles: 3, make: makeBen, spots: benSpots, view: { half: 3.6, lookY: 0.5, px: 56 }, docks: benDocks };
