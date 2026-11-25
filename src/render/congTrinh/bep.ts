// Bếp gói bánh 3×3 (Hội Tết): gian bếp mái tranh phía sau, nồi bánh chưng trên kiềng ba hòn đặt ngay dưới mép trước
// mái cho dễ thấy, chiếu gói bánh trải rộng phía trước. Cấp 2 mái cao hơn, chiếu rộng thêm; cấp 3 thêm nồi thứ hai,
// khói bếp (giản lược kiểu 2, xem docs/thiet-ke.md mục Giản lược công trình).
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { DONG, banhChung, hearth } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { saddleRoof } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, yard } from './chung';

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

  // Chiếu gói bánh phía trước: lá dong trải sẵn, bánh đã gói xếp mép chiếu (cấp cao nhiều bánh hơn).
  const cs = chieuSize(level);
  const cx = CHIEU.x - (level >= 2 ? 0.15 : 0.35);
  m.band.box(cs.w, 0.02, cs.d, C.thatch, cx, 0.07, CHIEU.z);
  for (const [dx, dz, a] of [[-0.25, -0.08, 0.3], [-0.1, 0.12, -0.4], [0.15, -0.1, 0.1]] as const) p.box(0.22, 0.012, 0.12, DONG, cx + dx, 0.085, CHIEU.z + dz, [0, a, 0]);
  const banh = level >= 3 ? 6 : level >= 2 ? 4 : 2;
  for (let i = 0; i < banh; i++) banhChung(p, cx + cs.w / 2 - 0.14 - (i % 3) * 0.17, 0.08, CHIEU.z - 0.15 + Math.floor(i / 3) * 0.2, 1, 0.2 * (i % 2 ? 1 : -1));

  // Gian bếp mái tranh che nồi bánh, cấp 2 trở lên dựng cao hơn; cấp 3 thêm nồi thứ hai, khói bếp.
  const h = level >= 2 ? 1.6 : 1.3;
  const w = M.w - 0.2;
  const d = M.d - 0.2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.cyl(0.045, 0.05, h, C.woodDark, M.x + (sx * w) / 2, h / 2, M.z + (sz * d) / 2, undefined, 5);
  m.band.add(saddleRoof({ length: w + 0.4, width: d + 0.45, lift: 0.22, drop: 0.34, thickness: 0.05 }), C.thatch, M.x, h + 0.26, M.z);
  if (level >= 3) {
    hearth(m, g, NOI2.x, NOI2.z);
    khoiBep(g, NOI.x, 2.0, NOI.z, 0);
    khoiBep(g, NOI2.x, 2.0, NOI2.z, 0.5);
  }
  const model = m.group();
  model.add(...g.children);
  return model;
}

export const BEP: CongTrinh = { tiles: 3, make: makeBep, spots: bepSpots, view: { half: 2.6, lookY: 0.8, px: 72 } };
