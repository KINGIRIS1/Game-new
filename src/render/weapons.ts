// Vũ khí, đồ đeo dùng chung cho lính, tướng và công trình. Mỗi món dựng trong khung riêng của nó:
// gốc ở chỗ tay nắm (hay chỗ đeo), thân dựng dọc +y, mặt trước (lưỡi, mũi) hướng +z, trừ nỏ (báng dọc +z).

import * as THREE from 'three';
import { C } from './palette';
import type { ToonModel } from './toon';

/** Các phần chất liệu để vẽ: ToonModel hay một xương của RigBuilder đều dùng được. */
export type Parts = Pick<ToonModel, 'plain' | 'band' | 'drum' | 'glow'>;

/** Sắt ánh thép xanh cho sáng hơn bóng đổ; viền và đồ trang sức bằng đồng như đồ Đông Sơn. */
export const IRON = 0x7b8a9c;
export const IRON_DARK = 0x4d5868;
/** Da thuộc làm bao tên. */
export const LEATHER = 0x8a5a33;
/** Sừng làm cung (cung sừng): vàng ngà. */
export const HORN = 0xe6d6a8;

/** Giáo dài 1,3, tay nắm cách đuôi 0,25. Bậc 0 mũi đồng; bậc 1 lưỡi sắt to hơn; bậc 2 thêm tua đỏ. */
export function spear(s: Parts, tier = 0, len = 1.3): void {
  const p = s.plain;
  p.cyl(0.018, 0.018, len, C.woodDark, 0, len / 2 - 0.25, 0, undefined, 6);
  const top = len - 0.25;
  const iron = tier >= 1;
  p.cyl(0.024, 0.02, 0.06, iron ? IRON_DARK : C.bronzeDark, 0, top + 0.02, 0, undefined, 6);
  // Lưỡi giáo hình lá, dẹt theo chiều trước sau.
  p.sphere(iron ? 0.07 : 0.058, iron ? IRON : C.bronze, 0, top + (iron ? 0.19 : 0.16), 0, [1, iron ? 2.6 : 2.5, 0.3], 8);
  if (tier >= 2) p.cone(0.06, 0.14, C.red, 0, top - 0.06, 0, [Math.PI, 0, 0], 8);
}

/** Qua (giáo móc) của giặc Ân: cán dài, lưỡi đồng ngang chĩa về trước, mũi nhọn trên đầu cán. */
export function qua(s: Parts): void {
  const p = s.plain;
  p.cyl(0.018, 0.018, 1.2, C.woodDark, 0, 0.4, 0, undefined, 5);
  p.box(0.03, 0.065, 0.26, C.bronze, 0, 0.9, 0.12);
  p.cone(0.03, 0.12, C.bronze, 0, 1.06, 0, undefined, 4);
  p.cyl(0.026, 0.026, 0.05, C.bronzeDark, 0, 0.9, 0, undefined, 6);
}

/** Rìu đồng lưỡi lớn của tướng giặc. */
export function bigAxe(s: Parts): void {
  const p = s.plain;
  p.cyl(0.025, 0.025, 1.2, C.woodDark, 0, 0.35, 0, undefined, 5);
  p.box(0.06, 0.34, 0.3, C.bronze, 0, 0.8, 0.15);
  p.box(0.07, 0.36, 0.04, C.bronzeDark, 0, 0.8, 0.3);
}

/** Kiếm thẳng sắt, chuôi và đốc đồng. */
export function sword(s: Parts, len = 0.6, guard: number = C.bronze): void {
  const p = s.plain;
  p.box(0.035, len, 0.02, C.iron, 0, 0.06 + len / 2, 0);
  p.box(0.12, 0.03, 0.045, guard, 0, 0.05, 0);
  p.cyl(0.018, 0.018, 0.1, C.woodDark, 0, -0.02, 0, undefined, 5);
}

/**
 * Cây cung cầm tay trái: dựng đứng, lưng cung cong về trước (+z), dây cung phía người bắn.
 * `horn`: cung sừng ngà, đầu bịt đồng.
 */
export function bow(s: Parts, horn = false): void {
  const p = s.plain;
  const w = horn ? 0.045 : 0.032;
  const color = horn ? HORN : C.woodDark;
  p.box(w, 0.22, w, color, 0, 0, 0.02);
  for (const k of [-1, 1]) p.box(w, 0.22, w, color, 0, k * 0.2, -0.03, [-k * 0.5, 0, 0]);
  if (horn) for (const k of [-1, 1]) p.sphere(0.03, C.bronze, 0, k * 0.3, -0.08, [1, 1, 1], 6);
  p.box(0.01, 0.6, 0.01, C.cream, 0, 0, -0.085);
}

/** Mũi tên cầm tay phải: đuôi tên ở chỗ tay nắm, mũi dọc +y. */
export function arrow(s: Parts, iron = false): void {
  const p = s.plain;
  p.cyl(0.009, 0.009, 0.5, C.woodLight, 0, 0.22, 0, undefined, 4);
  p.cone(0.024, 0.08, iron ? IRON : C.bronze, 0, 0.5, 0, undefined, 4);
  for (const k of [-1, 1]) p.box(0.004, 0.08, 0.04, C.red, 0, 0.02, k * 0.012);
}

/** Bao tên đeo sau lưng: gốc ở giữa bao, miệng bao dọc +y. `arrows`: mấy mũi tên nhô khỏi miệng bao. */
export function quiver(s: Parts, color: number, arrows: { iron: boolean } | null): void {
  const p = s.plain;
  p.cyl(0.05, 0.045, 0.36, color, 0, 0, 0, undefined, 6);
  p.cyl(0.055, 0.055, 0.03, C.bronzeDark, 0, 0.17, 0, undefined, 6);
  if (!arrows) return;
  for (const dx of [-0.025, 0.02, 0.0]) {
    p.cyl(0.008, 0.008, 0.16, C.woodLight, dx, 0.24, dx * 0.6, undefined, 4);
    p.cone(0.022, 0.07, arrows.iron ? IRON : C.bronze, dx, 0.34, dx * 0.6, undefined, 4);
  }
}

/**
 * Cây nỏ: báng dọc theo +z, cánh cung ngang ở đầu báng, dây cung kéo về sau, lẫy hình vuốt rùa ở dưới báng.
 * `thanh`: nỏ thần đồng vàng có lẫy vuốt Rùa Vàng tự sáng và mũi tên vàng lắp sẵn; không thì nỏ gỗ thường.
 * Gốc ở giữa báng.
 */
export function crossbowParts(m: Pick<Parts, 'plain' | 'band' | 'glow'>, thanh: boolean, s = 1): void {
  const p = m.plain;
  const wood = thanh ? C.goldDark : C.woodDark;
  const arm = thanh ? C.gold : C.wood;
  p.box(0.07 * s, 0.07 * s, 0.72 * s, wood, 0, 0, 0.05 * s);
  // Hai cánh cung ngả về sau như chữ V.
  for (const side of [-1, 1]) p.box(0.42 * s, 0.05 * s, 0.05 * s, arm, side * 0.2 * s, 0, 0.36 * s, [0, side * 0.35, 0]);
  p.box(0.012 * s, 0.012 * s, 0.82 * s, C.cream, 0, 0.02 * s, 0.24 * s, [0, Math.PI / 2, 0]);
  if (thanh) {
    m.band.cyl(0.05 * s, 0.05 * s, 0.1 * s, C.bronze, 0, 0, 0.4 * s, [Math.PI / 2, 0, 0], 8);
    // Lẫy nỏ là vuốt Rùa Vàng: ba móng cong tự sáng.
    for (const dx of [-0.035, 0, 0.035]) m.glow.cone(0.022 * s, 0.14 * s, C.ember, dx * s, -0.09 * s, -0.04 * s, [Math.PI + 0.4, 0, 0], 5);
    m.glow.box(0.02 * s, 0.02 * s, 0.5 * s, C.ember, 0, 0.06 * s, 0.3 * s);
    m.glow.cone(0.035 * s, 0.1 * s, C.fire, 0, 0.06 * s, 0.58 * s, [Math.PI / 2, 0, 0], 5);
  } else {
    p.box(0.03 * s, 0.1 * s, 0.05 * s, C.bronzeDark, 0, -0.07 * s, -0.08 * s);
    p.box(0.018 * s, 0.018 * s, 0.4 * s, C.arrow, 0, 0.05 * s, 0.3 * s);
  }
}

/** Khiên tròn mặt trống đồng, mặt hướng +z; `iron`: viền sắt. */
export function drumShield(s: Parts, iron: boolean, r = 0.165): void {
  s.drum.cyl(r, r, 0.035, 0xffffff, 0, 0, 0, [Math.PI / 2, 0, 0], 16);
  if (iron) s.plain.add(new THREE.TorusGeometry(r + 0.005, 0.024, 6, 20), IRON, 0, 0, 0.005);
}
