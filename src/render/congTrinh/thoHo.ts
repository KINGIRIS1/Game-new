// Nhà thợ hồ 3×3: nhà tường gạch mái thuyền suốt phía sau; đoạn tường đất nện dựng dở trong khuôn ván góc
// trước bên trái; sân đóng gạch để trống (giản lược kiểu 2: một mái chính, xem docs/thiet-ke.md mục Giản lược công
// trình). Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5, boatRoof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, maiGon, yard } from './chung';

export const THO_HO_LOT = new Lot(3, [
  'LLLLLL',
  'LLLLLL',
  'SS,NNN',
  'SS,NNN',
  'KK,,..',
  'KK,,..',
]);

/** Sân thợ hồ: đất sét nện, đỏ nâu hơn sân thường. */
const CLAY_YARD = 0xc9a271;
/** Lối đất nện vào sân. */
const PATH = 0xb8955f;
/** Gạch mộc phơi khô: vàng đất. */
const BRICK = 0xc8955a;
/** Gạch, ngói đã nung: đỏ sẫm. */
const FIRED = 0xa4472c;

/**
 * Chỗ đứng theo thứ tự có người: thợ đóng gạch ở sân, thợ cả đứng trước cửa nhà, người giẫm đất bên trái sân (cấp 2),
 * thợ nện tường bên khuôn ván (cấp 3).
 */
export function thoHoSpots(level: number): LotSpot[] {
  const N = THO_HO_LOT.zone('N');
  const K = THO_HO_LOT.zone('K');
  const S = THO_HO_LOT.zone('S');
  const out: LotSpot[] = [
    { job: 'thoDa', x: N.x - 0.5, y: 0.06, z: N.z + 0.32, ry: 2.6 },
    { job: 'thoMoc', x: -0.3, y: 0.06, z: -0.3, ry: 0.3 },
  ];
  if (level >= 2) out.push({ job: 'nong', x: S.x, y: 0.06, z: S.z, ry: 0.4 });
  if (level >= 3) out.push({ job: 'thoDa', x: K.x + 0.12, y: 0.06, z: K.z + 0.24, ry: Math.PI - 0.6 });
  return out;
}

export function makeThoHo(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const up = above5(level);
  yard(m, 3, CLAY_YARD);
  const path = THO_HO_LOT.zone(',');
  p.box(0.5, 0.02, path.d, PATH, path.x, 0.055, path.z);

  // Nhà gạch suốt phía sau: nền đá, tường gạch mộc (cấp 9 gạch nung), cửa giữa, mái thuyền theo cấp; cấp 6–8 cao dần.
  const hx = 0;
  const hz = -1.0;
  const w = 2.3;
  const d = 0.8;
  const wh = 0.62 + 0.08 * up;
  p.box(w + 0.1, 0.08, d + 0.1, C.rock, hx, 0.04, hz);
  p.box(w, wh, d, level >= 9 ? FIRED : BRICK, hx, 0.08 + wh / 2, hz);
  p.box(0.28, 0.42, 0.03, 0x2a1d12, hx - 0.3, 0.29, hz + d / 2 + 0.01);
  boatRoof(m, maiGon(level), { length: w + 0.4, width: d + 0.4, lift: 0.22, drop: 0.32, thickness: 0.05 }, hx, 0.08 + wh + 0.3, hz);

  // Đoạn tường đất nện dựng dở giữa hai tấm ván khuôn góc trước bên trái (cấp 3), cao thêm theo cấp tới cấp 8.
  if (level >= 3) {
    const K = THO_HO_LOT.zone('K');
    const len = K.w - 0.24;
    const wh = 0.22 + 0.05 * (Math.min(level, 8) - 3);
    p.box(len - 0.1, wh, 0.26, C.earth, K.x, wh / 2 + 0.05, K.z - 0.15);
    for (const s of [-1, 1]) p.box(len, 0.18, 0.025, C.woodLight, K.x, wh + 0.09, K.z - 0.15 + s * 0.15);
  }
  return m.group();
}

export const THO_HO: CongTrinh = { tiles: 3, make: makeThoHo, spots: thoHoSpots, view: { half: 2.9, lookY: 0.9, px: 64 } };
