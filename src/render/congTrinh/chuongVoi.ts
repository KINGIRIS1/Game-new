// Chuồng voi 4×4 (bản lưu 26): nơi ở của voi chiến, cùng kiểu khuôn viên với doanh trại: rào cọc thưa có thanh ngang,
// lầu cổng giữa mặt trước, chuồng mái chóp bốn mặt trên bốn cột gỗ lớn ở góc sau bên trái (một voi nghỉ dưới mái),
// sân voi rộng có máng nước, đống cỏ, cọc buộc voi, đống thân chuối; một voi ra sân ăn cỏ. Dựng một lần, mái tranh.
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { banner } from '../buildings';
import { Lot } from '../lot';
import { makeFighter } from '../models';
import { C } from '../palette';
import { ToonModel } from '../toon';
import type { CongTrinh, LotOpts } from './chung';
import { gopHinh, khuonVien, noiOSpots } from './trai';

export const CHUONG_VOI_LOT = new Lot(4, [
  'MMMMM.mm',
  'MMMMM.mm',
  'MMMMM.c.',
  '........',
  '........',
  'ww....yy',
  'ww.,,.yy',
  '...CC...',
]);

/** Màu cỏ tươi, cỏ khô của đống cỏ (như dáng cũ). */
const GRASS = 0x8fa64a;
const GRASS_DARK = 0x7a9440;
/** Thân chuối xanh nhạt. */
const BANANA = 0xa9bc6a;

/** `tier`: bậc giáp đã rèn của voi chiến (giáp trán sắt, giáp ngà, bành có lọng). */
export function makeChuongVoi(tier = 0): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = CHUONG_VOI_LOT;
  // Rào cọc vót nhọn như doanh trại, nhưng cọc thưa, cao và có hai thanh rào ngang cho voi.
  khuonVien(m, { step: 0.36, h: 0.66, r: 0.055, rails: [0.24, 0.46], railColor: C.wood });

  // Bốn cột gỗ lớn đai đồng đỡ mái chóp bốn mặt, rộng cho một voi có người cưỡi đứng ngang dưới mái.
  const M = L.zone('M');
  const cx = M.x + 0.02;
  const cz = M.z + 0.04;
  const postH = 1.6;
  const hw = 1.0;
  const hd = 0.62;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      p.cyl(0.085, 0.105, postH, C.woodDark, cx + sx * hw, postH / 2, cz + sz * hd, undefined, 7);
      p.cyl(0.11, 0.11, 0.06, C.bronze, cx + sx * hw, 1.05, cz + sz * hd, undefined, 7);
    }
  }
  for (const s of [-1, 1]) {
    p.box(2 * hw + 0.22, 0.09, 0.1, C.wood, cx, postH, cz + s * hd);
    p.box(0.1, 0.09, 2 * hd + 0.22, C.wood, cx + s * hw, postH + 0.07, cz);
  }
  // Mái chóp bốn mặt: nón bốn mặt quay cho cạnh đáy song song mép móng, kéo dài theo x cho vừa khối mái.
  const roofH = 1.0;
  const roof = new THREE.ConeGeometry(Math.SQRT2, roofH, 4);
  roof.rotateY(Math.PI / 4);
  const base = postH + 0.09;
  m.band.add(roof, C.thatch, cx, base + roofH / 2, cz, [0, 0, 0], [hw + 0.3, 1, hd + 0.26]);
  p.sphere(0.085, C.bronzeLight, cx, base + roofH + 0.02, cz, [1, 1, 1], 6);
  p.cone(0.035, 0.2, C.bronze, cx, base + roofH + 0.16, cz, undefined, 5);
  // Rơm lót nền dưới mái, vách phên thấp chắn phía sau.
  p.box(2 * hw - 0.1, 0.03, 2 * hd - 0.1, C.thatchDark, cx, 0.065, cz);
  p.box(2 * hw - 0.1, 0.6, 0.04, C.woodLight, cx, 0.36, cz - hd + 0.02);

  // Cọc buộc voi đai đồng, cuộn thừng quấn quanh.
  const c = L.zone('c');
  p.cyl(0.065, 0.075, 0.6, C.woodDark, c.x, 0.33, c.z, undefined, 6);
  p.cyl(0.08, 0.08, 0.05, C.bronze, c.x, 0.52, c.z, undefined, 8);
  p.add(new THREE.TorusGeometry(0.09, 0.024, 4, 10), C.thatchDark, c.x, 0.33, c.z, [Math.PI / 2, 0, 0]);

  // Sân voi đất nện; máng nước gỗ dài kê trên hai khúc gỗ ở góc trước bên trái; đống cỏ góc trước bên phải.
  p.box(3.0, 0.02, 1.9, C.earth, 0.1, 0.06, 0.55);
  const w = L.zone('w');
  for (const s of [-1, 1]) p.box(0.09, 0.09, 0.28, C.woodDark, w.x + s * 0.3, 0.1, w.z);
  p.box(0.86, 0.16, 0.24, C.wood, w.x, 0.22, w.z);
  p.box(0.76, 0.02, 0.15, C.paddyWater, w.x, 0.3, w.z);
  const y = L.zone('y');
  p.sphere(0.36, GRASS, y.x - 0.05, 0.12, y.z - 0.1, [1.15, 1.0, 1.0], 9);
  p.sphere(0.24, GRASS_DARK, y.x - 0.4, 0.1, y.z + 0.18, [1.1, 0.8, 1.0], 8);
  p.sphere(0.2, GRASS_DARK, y.x + 0.28, 0.09, y.z - 0.42, [1.1, 0.75, 1.0], 7);

  // Góc sau bên phải: đống thân chuối cắt khúc cho voi ăn, xếp hai tầng, đầu cắt quay ra trước; cờ đỏ cạnh đó.
  const f = L.zone('m');
  for (const [dx, dy] of [[-0.18, 0], [0, 0], [0.18, 0], [-0.09, 0.14], [0.09, 0.14]] as const) {
    p.cyl(0.075, 0.075, 0.62, BANANA, f.x + dx, 0.13 + dy, f.z + 0.05, [Math.PI / 2, 0, 0], 7);
    p.cyl(0.066, 0.066, 0.01, C.cream, f.x + dx, 0.13 + dy, f.z + 0.36, [Math.PI / 2, 0, 0], 7);
  }
  banner(m, f.x + 0.42, f.z - 0.25, 2.2, C.red);

  const out = m.group();
  // Một voi nghỉ dưới mái, đứng ngang cho thấy cả thân; một voi ra sân, quay về đống cỏ. Hai voi gộp một lưới, có bóng.
  out.add(
    gopHinh(
      [
        { g: makeFighter('voi', tier), x: cx + 0.05, z: cz + 0.08, ry: -Math.PI / 2 },
        { g: makeFighter('voi', tier), x: 0.25, z: 0.3, ry: Math.atan2(y.x - 0.25, y.z - 0.3) },
      ],
      true,
    ),
  );
  return out;
}

export const CHUONG_VOI: CongTrinh = { tiles: 4, make: (_l: number, o: LotOpts = {}) => makeChuongVoi(o.tier), spots: noiOSpots, view: { half: 3.3, lookY: 0.9, px: 64 } };
