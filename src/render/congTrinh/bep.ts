// Bếp gói bánh 3×3 (Hội Tết): gian bếp phía sau, nồi bánh chưng trên kiềng ba hòn đặt ngay dưới mép trước mái cho dễ
// thấy, chồng lá dong góc sau bên phải, chiếu gói bánh trải rộng phía trước. Cấp 2 dựng mái tranh cao che bếp, chiếu
// rộng thêm và chõng tre có khuôn gói bánh; cấp 3 thêm nồi thứ hai, khói bếp, cối đá chày gỗ giã bánh giầy.
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { DONG, banhChung, banhGiay, hearth } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { saddleRoof } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, rod, yard } from './chung';

export const BEP_LOT = new Lot(3, [
  'MMMMll',
  'MKKMll',
  'MKKM..',
  '....GG',
  'cccc..',
  'cccc,,',
]);

/** Nồi bánh chính (cấp 1), nồi thứ hai (cấp 3): tọa độ móng trong khối `K`, nồi chính sát mép trước mái. */
const K = BEP_LOT.zone('K');
const NOI = { x: K.x - 0.22, z: K.z + 0.2 };
const NOI2 = { x: K.x + 0.32, z: K.z - 0.25 };
/** Chiếu gói bánh ở khối `c`: tâm và cỡ theo cấp. */
const CHIEU = BEP_LOT.zone('c');
const chieuSize = (level: number) => (level >= 2 ? { w: 1.5, d: 0.78 } : { w: 1.0, d: 0.6 });

/**
 * Chỗ người ngồi gói bánh ngày Tết (tọa độ móng, World đặt người ngồi xếp bằng ở đây): mép sau chiếu, quay ra trước,
 * nên vẫn trong móng.
 */
export const BEP_TET_SEAT = { x: CHIEU.x - 0.25, z: CHIEU.z - 0.12, ry: 0 };

/** Người làm bếp: một người canh nồi, một người xếp lá dong, (cấp 3) một người giã bánh giầy. */
export function bepSpots(level: number): LotSpot[] {
  const l = BEP_LOT.zone('l');
  const G = BEP_LOT.zone('G');
  const spots: LotSpot[] = [
    // Đứng sau nồi, quay ra trước: không che nồi bánh.
    { job: 'phuNu', x: NOI.x - 0.05, y: 0.06, z: NOI.z - 0.52, ry: 0.15 },
    { job: 'phuNu', x: l.x - 0.55, y: 0.06, z: l.z + 0.35, ry: 1.9 },
  ];
  if (level >= 3) spots.push({ job: 'phuNu', x: G.x - 0.2, y: 0.06, z: G.z - 0.3, ry: 0.93 });
  else spots.push({ job: 'phuNu', x: CHIEU.x + 0.6, y: 0.06, z: CHIEU.z - 0.42, ry: -2.3 });
  return spots;
}

/** Chồng lá dong: các lớp lá xếp so le, cấp cao thì chồng cao hơn, thêm một bó buộc lạt. */
function chongLaDong(p: ToonModel['plain'], x: number, z: number, level: number): void {
  const n = 3 + level * 2;
  for (let i = 0; i < n; i++) p.box(0.42, 0.025, 0.24, i % 2 ? DONG : 0x4f8a42, x, 0.07 + i * 0.027, z, [0, 0.18 * ((i % 3) - 1), 0]);
  if (level >= 2) {
    p.box(0.4, 0.05, 0.22, DONG, x + 0.08, 0.08, z + 0.32, [0, 0.4, 0]);
    p.box(0.03, 0.055, 0.23, 0xd8c48a, x + 0.08, 0.08, z + 0.32, [0, 0.4, 0]);
  }
}

/** Chõng tre thấp có khuôn gói bánh (khung gỗ vuông), một cái bánh đang gói trong khuôn. */
function chongTre(p: ToonModel['plain'], x: number, z: number): void {
  for (const dx of [-0.2, 0.2]) for (const dz of [-0.14, 0.14]) p.cyl(0.022, 0.022, 0.3, C.bamboo, x + dx, 0.17, z + dz, undefined, 5);
  p.box(0.5, 0.035, 0.4, C.bamboo, x, 0.33, z);
  for (let i = 0; i < 5; i++) p.box(0.5, 0.012, 0.02, C.thatchDark, x, 0.352, z - 0.16 + i * 0.08);
  for (const s of [-1, 1]) {
    p.box(0.2, 0.05, 0.025, C.wood, x, 0.375, z + s * 0.09);
    p.box(0.025, 0.05, 0.2, C.wood, x + s * 0.09, 0.375, z);
  }
  banhChung(p, x, 0.35, z, 0.9);
}

/** Cối đá, chày gỗ dựa vào cối, nong bánh giầy vừa nặn bên cạnh (cấp 3). */
function coiGiaBanh(p: ToonModel['plain'], x: number, z: number): void {
  p.cyl(0.2, 0.24, 0.3, C.rock, x, 0.2, z, undefined, 12);
  p.cyl(0.14, 0.14, 0.02, 0x3d3530, x, 0.355, z, undefined, 12);
  p.sphere(0.1, 0xf4efe0, x, 0.35, z, [1, 0.35, 1], 8);
  rod(p, [x - 0.05, 0.3, z], [x - 0.3, 1.1, z - 0.2], 0.035, C.wood, 6);
  p.cyl(0.22, 0.22, 0.03, C.thatch, x - 0.5, 0.07, z + 0.05, undefined, 12);
  for (const [dx, dz] of [[-0.07, -0.04], [0.07, -0.02], [0, 0.08]] as const) banhGiay(p, x - 0.5 + dx, 0.085, z + 0.05 + dz);
}

/** Khói bếp bốc qua mái (World cho khói bay lên như ở công trình hư). */
function khoiBep(g: THREE.Group, x: number, y: number, z: number, phase: number): void {
  const smoke = new THREE.Group();
  smoke.userData.smoke = true;
  const mat = new THREE.MeshBasicMaterial({ color: 0xb8b2a8, transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), mat);
    puff.userData.phase = (i + phase) / 4;
    smoke.add(puff);
  }
  smoke.position.set(x, y, z);
  g.add(smoke);
}

export function makeBep(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const g = new THREE.Group();
  const L = BEP_LOT;
  yard(m, 3);
  const path = L.zone(',');
  p.box(path.w * 0.8, 0.03, path.d + 0.4, C.earth, path.x, 0.055, path.z - 0.2);

  // Nền bếp đất nện thẫm dưới mái, kiềng ba hòn và nồi đồng luộc bánh chưng.
  const M = L.zone('M');
  p.box(M.w - 0.1, 0.03, M.d - 0.1, C.earthDark, M.x, 0.055, M.z);
  hearth(m, g, NOI.x, NOI.z);
  // Đống củi dự trữ ở góc sau bếp, xếp dọc vách sau.
  for (let i = 0; i < 5; i++) p.cyl(0.035, 0.04, 0.6, C.woodDark, M.x - M.w / 2 + 0.5, 0.08 + Math.floor(i / 3) * 0.07, M.z - M.d / 2 + 0.15 + (i % 3) * 0.08, [0, 0, Math.PI / 2], 5);

  chongLaDong(p, L.zone('l').x, L.zone('l').z - 0.1, level);

  // Chiếu gói bánh phía trước: lá dong trải sẵn, bánh đã gói xếp mép chiếu (cấp cao nhiều bánh hơn).
  const cs = chieuSize(level);
  const cx = CHIEU.x - (level >= 2 ? 0.15 : 0.35);
  m.band.box(cs.w, 0.02, cs.d, C.thatch, cx, 0.07, CHIEU.z);
  for (const [dx, dz, a] of [[-0.25, -0.08, 0.3], [-0.1, 0.12, -0.4], [0.15, -0.1, 0.1]] as const) p.box(0.22, 0.012, 0.12, DONG, cx + dx, 0.085, CHIEU.z + dz, [0, a, 0]);
  const banh = level >= 3 ? 6 : level >= 2 ? 4 : 2;
  for (let i = 0; i < banh; i++) banhChung(p, cx + cs.w / 2 - 0.14 - (i % 3) * 0.17, 0.08, CHIEU.z - 0.15 + Math.floor(i / 3) * 0.2, 1, 0.2 * (i % 2 ? 1 : -1));

  if (level >= 2) {
    // Mái tranh dựng cao che bếp, cho thấy nồi bánh dưới mái; chõng tre có khuôn gói bánh ở đầu chiếu.
    const h = 1.6;
    const w = M.w - 0.2;
    const d = M.d - 0.2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.cyl(0.04, 0.045, h, C.woodDark, M.x + (sx * w) / 2, h / 2, M.z + (sz * d) / 2, undefined, 5);
    m.band.add(saddleRoof({ length: w + 0.4, width: d + 0.45, lift: 0.22, drop: 0.34, thickness: 0.05 }), C.thatch, M.x, h + 0.26, M.z);
    chongTre(p, CHIEU.x + 0.82, CHIEU.z + 0.08);
  }
  if (level >= 3) {
    hearth(m, g, NOI2.x, NOI2.z);
    const G = L.zone('G');
    coiGiaBanh(p, G.x + 0.2, G.z);
    khoiBep(g, NOI.x, 2.0, NOI.z, 0);
    khoiBep(g, NOI2.x, 2.0, NOI2.z, 0.5);
  }
  const model = m.group();
  model.add(...g.children);
  return model;
}

export const BEP: CongTrinh = { tiles: 3, make: makeBep, spots: bepSpots, view: { half: 2.6, lookY: 0.8, px: 72 } };
