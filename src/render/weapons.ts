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
 * `thanh`: Nỏ Thần Linh Quang Kim Quy (cánh cung kép bằng vàng ròng, đầu nỏ chạm Kim Quy, mặt trống đồng trên cổ nỏ,
 * dây cung kéo căng chữ V, lẫy vuốt Rùa Vàng phát sáng và dàn 5 mũi tên thần đồng lửa Liên Châu xếp hình quạt);
 * không thì nỏ gỗ thường. Gốc ở giữa báng.
 */
export function crossbowParts(m: Pick<Parts, 'plain' | 'band' | 'glow'> & Partial<Pick<Parts, 'drum'>>, thanh: boolean, s = 1): void {
  const p = m.plain;
  if (!thanh) {
    p.box(0.07 * s, 0.07 * s, 0.72 * s, C.woodDark, 0, 0, 0.05 * s);
    for (const side of [-1, 1]) p.box(0.42 * s, 0.05 * s, 0.05 * s, C.wood, side * 0.2 * s, 0, 0.36 * s, [0, side * 0.35, 0]);
    p.box(0.012 * s, 0.012 * s, 0.82 * s, C.cream, 0, 0.02 * s, 0.24 * s, [0, Math.PI / 2, 0]);
    p.box(0.03 * s, 0.1 * s, 0.05 * s, C.bronzeDark, 0, -0.07 * s, -0.08 * s);
    p.box(0.018 * s, 0.018 * s, 0.4 * s, C.arrow, 0, 0.05 * s, 0.3 * s);
    return;
  }

  // 1. Thân nỏ thần đồng đen & báng tì vai chạm vàng + bệ rãnh tên Liên Châu mở rộng
  p.box(0.1 * s, 0.088 * s, 0.88 * s, C.bronzeDark, 0, -0.01 * s, 0.08 * s);
  p.box(0.16 * s, 0.038 * s, 0.72 * s, C.goldDark, 0, 0.038 * s, 0.15 * s);
  // Rãnh linh quang phát sáng dọc giữa mặt bệ nỏ
  m.glow.box(0.028 * s, 0.014 * s, 0.66 * s, C.ember, 0, 0.056 * s, 0.16 * s);
  // Báng tì vai phía sau bọc vàng và đai đồng chạm khắc
  p.box(0.118 * s, 0.135 * s, 0.13 * s, C.gold, 0, -0.025 * s, -0.34 * s);
  m.band.box(0.122 * s, 0.098 * s, 0.2 * s, C.bronze, 0, -0.005 * s, -0.11 * s);

  // 2. Đầu nỏ chạm Đầu Rùa Vàng (Kim Quy) mắt lửa + Mặt trống đồng Đông Sơn trên cổ nỏ
  m.band.cyl(0.094 * s, 0.086 * s, 0.15 * s, C.bronze, 0, 0.005 * s, 0.45 * s, [Math.PI / 2, 0, 0], 12);
  if (m.drum) {
    m.drum.cyl(0.092 * s, 0.092 * s, 0.028 * s, C.gold, 0, 0.064 * s, 0.43 * s, undefined, 16);
  }
  p.sphere(0.078 * s, C.gold, 0, 0.0 * s, 0.56 * s, [1.2, 0.88, 1.28], 10);
  p.cone(0.056 * s, 0.13 * s, C.gold, 0, -0.005 * s, 0.66 * s, [Math.PI / 2 + 0.15, 0, 0], 6);
  for (const side of [-1, 1]) {
    m.glow.sphere(0.026 * s, C.fire, side * 0.062 * s, 0.022 * s, 0.58 * s, [0.85, 1, 1], 6);
  }

  // 3. Cánh cung kép 2 tầng (cánh chính vàng ròng uốn cong cánh chim Lạc + cánh phụ trợ lực bằng đồng)
  for (const side of [-1, 1]) {
    // Cánh cung chính đoạn trong (bản rộng, đúc vàng ròng)
    p.box(0.34 * s, 0.072 * s, 0.078 * s, C.gold, side * 0.19 * s, 0.012 * s, 0.42 * s, [0, side * 0.28, 0]);
    // Khớp đồng chạm hoa văn nối giữa cánh cung
    m.band.box(0.072 * s, 0.088 * s, 0.092 * s, C.bronze, side * 0.34 * s, 0.012 * s, 0.36 * s, [0, side * 0.38, 0]);
    // Cánh cung chính đoạn ngoài uốn cong (recurve)
    p.box(0.28 * s, 0.056 * s, 0.062 * s, C.gold, side * 0.46 * s, 0.024 * s, 0.28 * s, [0, side * 0.56, side * 0.1]);
    // Đầu mấu cánh cung hình sừng Kim Quy phát sáng hướng về trước
    m.glow.cone(0.034 * s, 0.13 * s, C.fire, side * 0.56 * s, 0.042 * s, 0.22 * s, [Math.PI / 2 - 0.25, 0, -side * 0.35], 5);
    // Cánh cung phụ trợ lực tầng dưới
    p.box(0.38 * s, 0.045 * s, 0.052 * s, C.bronzeLight, side * 0.21 * s, -0.048 * s, 0.4 * s, [0, side * 0.35, -side * 0.08]);

    // Dây cung thần kéo căng chuẩn hình chữ V từ đầu cánh cung (side*0.54, 0.22) về ổ lẫy vuốt Rùa Vàng (0, -0.14)
    m.glow.box(0.018 * s, 0.018 * s, 0.65 * s, C.ember, side * 0.27 * s, 0.052 * s, 0.04 * s, [0, side * 0.983, 0]);
  }

  // 4. Hộp máy lẫy nỏ Cổ Loa & Vuốt Rùa Vàng tự sáng rực rỡ
  p.box(0.074 * s, 0.095 * s, 0.15 * s, C.goldDark, 0, -0.055 * s, -0.06 * s);
  // Vọng sơn (thước ngắm vàng đính ngọc lửa) phía trên ổ lẫy
  p.box(0.055 * s, 0.068 * s, 0.038 * s, C.gold, 0, 0.082 * s, -0.15 * s);
  m.glow.sphere(0.025 * s, C.fire, 0, 0.11 * s, -0.15 * s, [1, 1, 1], 6);
  // Ba móng Vuốt Rùa Vàng cong sắc dưới bụng nỏ
  for (const [dx, len, col] of [
    [0, 0.2, C.fire],
    [-0.048, 0.165, C.ember],
    [0.048, 0.165, C.ember],
  ] as const) {
    m.glow.cone(0.03 * s, len * s, col, dx * s, -0.125 * s, -0.05 * s, [Math.PI + 0.45, 0, 0], 6);
  }

  // 5. Dàn 5 mũi tên thần đồng lửa (Liên Châu vạn tiễn) xếp hình quạt chuẩn đồng trục trên bệ nỏ
  for (const i of [-2, -1, 0, 1, 2] as const) {
    const yaw = i * 0.09;
    const xStart = i * 0.016 * s;
    const zStart = -0.1 * s;
    const y0 = (i === 0 ? 0.082 : 0.072) * s;
    const len = (i === 0 ? 0.66 : 0.6) * s;
    const dMid = len * 0.5;
    const dTip = len + 0.055 * s;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    // Thân tên vàng ánh lửa
    m.glow.box(
      (i === 0 ? 0.025 : 0.019) * s,
      (i === 0 ? 0.025 : 0.019) * s,
      len,
      C.ember,
      xStart + sinY * dMid,
      y0,
      zStart + cosY * dMid,
      [0, yaw, 0],
    );
    // Lông vũ đỏ ở đuôi tên
    p.box(0.036 * s, 0.028 * s, 0.07 * s, C.red, xStart + sinY * 0.05 * s, y0 + 0.008 * s, zStart + cosY * 0.05 * s, [0, yaw, 0]);
    // Mũi tên đồng 3 cạnh Cổ Loa bốc lửa đỏ cam (dùng [Math.PI / 2, 0, -yaw] để mũi nhọn xoay đúng hướng quạt)
    m.glow.cone(
      (i === 0 ? 0.048 : 0.036) * s,
      (i === 0 ? 0.15 : 0.12) * s,
      i === 0 ? C.fire : i % 2 ? C.ember : C.fire,
      xStart + sinY * dTip,
      y0,
      zStart + cosY * dTip,
      [Math.PI / 2, 0, -yaw],
      4,
    );
  }
}

/** Khiên tròn mặt trống đồng, mặt hướng +z; `iron`: viền sắt. */
export function drumShield(s: Parts, iron: boolean, r = 0.165): void {
  s.drum.cyl(r, r, 0.035, 0xffffff, 0, 0, 0, [Math.PI / 2, 0, 0], 16);
  if (iron) s.plain.add(new THREE.TorusGeometry(r + 0.005, 0.024, 6, 20), IRON, 0, 0, 0.005);
}
