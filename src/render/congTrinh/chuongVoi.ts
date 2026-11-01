// Chuồng voi 3×3: nơi ở của voi chiến. Mái chóp bốn mặt trên bốn cột gỗ lớn ở góc sau, sân voi rộng phía trước có
// máng nước, đống cỏ, cọc buộc voi; rào cọc vót nhọn có hai thanh ngang quanh móng. Dựng một lần, mái tranh.
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { Lot } from '../lot';
import { makeFighter } from '../models';
import { C } from '../palette';
import { ToonModel } from '../toon';
import { type CongTrinh, yard } from './chung';
import { RAO, raoCocNhon } from './traiGiao';

export const CHUONG_VOI_LOT = new Lot(3, [
  'MMMMmm',
  'MMMMmm',
  'MMMMc.',
  '......',
  'ww..yy',
  '..,,yy',
]);

/** Voi giữ cỡ như dáng cũ (0,62 lần, cả mô hình cũ thu 0,95). */
const VOI = 0.62 * 0.95;

/** Màu cỏ tươi, cỏ khô của đống cỏ (như dáng cũ). */
const GRASS = 0x8fa64a;
const GRASS_DARK = 0x7a9440;
/** Thân chuối xanh nhạt. */
const BANANA = 0xa9bc6a;

export function makeChuongVoi(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = CHUONG_VOI_LOT;
  yard(m, 3);
  // Rào cọc vót nhọn như doanh trại, nhưng cọc thưa, cao và có hai thanh rào ngang cho voi.
  raoCocNhon(m, RAO, 1.0, { step: 0.36, h: 0.66, r: 0.055, rails: [0.24, 0.46], railColor: C.wood });
  const path = L.zone(',');
  p.box(0.8, 0.03, 0.62, C.earth, path.x, 0.055, path.z - 0.06);

  // Bốn cột gỗ lớn đai đồng đỡ mái chóp bốn mặt: mái rộng hơn mái cũ chừng 35% bề ngang, 15% bề sâu, cao hơn chừng 30%;
  // cột cao đủ cho voi có người cưỡi đứng lọt.
  const M = L.zone('M');
  const cx = M.x + 0.02;
  const cz = M.z + 0.04;
  const postH = 1.5;
  const hw = 0.64;
  const hd = 0.52;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      p.cyl(0.075, 0.095, postH, C.woodDark, cx + sx * hw, postH / 2, cz + sz * hd, undefined, 7);
      p.cyl(0.1, 0.1, 0.06, C.bronze, cx + sx * hw, 0.95, cz + sz * hd, undefined, 7);
    }
  }
  for (const s of [-1, 1]) {
    p.box(2 * hw + 0.2, 0.08, 0.09, C.wood, cx, postH, cz + s * hd);
    p.box(0.09, 0.08, 2 * hd + 0.2, C.wood, cx + s * hw, postH + 0.06, cz);
  }
  // Mái chóp bốn mặt: nón bốn mặt quay cho cạnh đáy song song mép móng, kéo dài theo x cho vừa khối mái.
  const roofH = 0.8;
  const roof = new THREE.ConeGeometry(Math.SQRT2, roofH, 4);
  roof.rotateY(Math.PI / 4);
  const base = postH + 0.08;
  m.band.add(roof, C.thatch, cx, base + roofH / 2, cz, [0, 0, 0], [0.88, 1, 0.76]);
  p.sphere(0.075, C.bronzeLight, cx, base + roofH + 0.02, cz, [1, 1, 1], 6);
  p.cone(0.03, 0.18, C.bronze, cx, base + roofH + 0.15, cz, undefined, 5);
  // Rơm lót nền dưới mái.
  p.box(2 * hw - 0.1, 0.03, 2 * hd - 0.1, C.thatchDark, cx, 0.065, cz);

  // Cọc buộc voi đai đồng, cuộn thừng quấn quanh.
  const c = L.zone('c');
  p.cyl(0.06, 0.07, 0.55, C.woodDark, c.x, 0.3, c.z, undefined, 6);
  p.cyl(0.075, 0.075, 0.05, C.bronze, c.x, 0.48, c.z, undefined, 8);
  p.add(new THREE.TorusGeometry(0.085, 0.022, 4, 10), C.thatchDark, c.x, 0.3, c.z, [Math.PI / 2, 0, 0]);

  // Máng nước gỗ kê trên hai khúc gỗ; đống cỏ góc trước bên phải.
  const w = L.zone('w');
  // Máng lùi vào trong một chút cho cọc cổng khỏi che.
  const wz = w.z - 0.15;
  for (const s of [-1, 1]) p.box(0.08, 0.08, 0.24, C.woodDark, w.x + s * 0.2, 0.09, wz);
  p.box(0.58, 0.14, 0.2, C.wood, w.x, 0.2, wz);
  p.box(0.5, 0.02, 0.12, C.paddyWater, w.x, 0.27, wz);
  const y = L.zone('y');
  // Đống cỏ cao, lùi khỏi góc rào cho nhô lên trên thanh rào.
  p.sphere(0.3, GRASS, y.x - 0.02, 0.1, y.z - 0.22, [1.15, 1.0, 1.0], 9);
  p.sphere(0.2, GRASS_DARK, y.x - 0.3, 0.09, y.z + 0.02, [1.1, 0.8, 1.0], 8);
  p.sphere(0.16, GRASS_DARK, y.x + 0.24, 0.08, y.z - 0.48, [1.1, 0.75, 1.0], 7);

  // Góc sau bên phải: đống thân chuối cắt khúc cho voi ăn, xếp hai tầng, đầu cắt quay ra trước.
  const f = L.zone('m');
  for (const [dx, dy] of [[-0.15, 0], [0, 0], [0.15, 0], [-0.075, 0.13], [0.075, 0.13]] as const) {
    p.cyl(0.07, 0.07, 0.56, BANANA, f.x + dx, 0.12 + dy, f.z + 0.02, [Math.PI / 2, 0, 0], 7);
    p.cyl(0.062, 0.062, 0.01, C.cream, f.x + dx, 0.12 + dy, f.z + 0.3, [Math.PI / 2, 0, 0], 7);
  }

  const out = m.group();
  // Voi đứng giữa sân, quay về phía đống cỏ.
  const voi = makeFighter('voi');
  voi.scale.setScalar(VOI);
  voi.position.set(-0.08, 0.05, 0.4);
  voi.rotation.y = Math.atan2(y.x + 0.08, y.z - 0.4);
  out.add(voi);
  return out;
}

export const CHUONG_VOI: CongTrinh = { tiles: 3, make: () => makeChuongVoi(), spots: () => [], view: { half: 2.6, lookY: 0.9, px: 72 } };
