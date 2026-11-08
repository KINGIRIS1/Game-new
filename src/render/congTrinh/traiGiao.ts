// Trại giáo 4×4 (bản lưu 26): nơi ở của giáo binh, cùng kiểu khuôn viên với doanh trại: rào cọc vót nhọn, lầu cổng
// giữa mặt trước, lều lính mái chữ A lớn ở góc sau bên trái, giá giáo góc sau bên phải, sân tập hai cọc rơm có hai giáo
// binh đâm thử. Dựng một lần, mái tranh. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { banner } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel } from '../toon';
import type { CongTrinh, LotOpts } from './chung';
import { LINH, cocRom, giaGiao, gopLinh, khuonVien, noiOSpots } from './trai';

export const TRAI_GIAO_LOT = new Lot(4, [
  'AAAAA.gg',
  'AAAAA.gg',
  'AAAAA...',
  '....s.o.',
  '........',
  '....s.o.',
  '...,,...',
  '...CC...',
]);

/**
 * Lều lính mái chữ A, nóc chạy dọc trục x (dáng `aFrameHut` cũ quay ngang): mái tranh chạm đất trước và sau,
 * hồi trái đan phên, hồi phải để ngỏ thấy chiếu ngủ; hai đầu nóc có cột tre bắt chéo. Gốc ở tâm sàn lều.
 */
function leuChuA(m: ToonModel, x: number, z: number, length: number, width: number, h: number): void {
  const p = m.plain;
  p.box(length, 0.06, width * 0.9, C.thatchDark, x, 0.06, z);
  const half = width / 2;
  const slope = Math.hypot(half, h);
  const tilt = Math.atan2(h, half);
  for (const s of [-1, 1]) m.band.box(length + 0.12, 0.07, slope + 0.06, C.thatch, x, h / 2 + 0.04, z + s * half * 0.5, [s * tilt, 0, 0]);
  // Nóc tre; cột tre bắt chéo chữ X ở hai đầu nóc, chìa lên quá nóc.
  p.cyl(0.03, 0.03, length + 0.22, C.woodDark, x, h + 0.08, z, [0, 0, Math.PI / 2], 5);
  const lean = Math.atan2(half, h);
  const len = slope + 0.3;
  for (const end of [-1, 1]) {
    for (const s of [-1, 1]) {
      const cz = z + s * (half / 2 - (0.13 * half) / slope);
      const cy = h / 2 + 0.06 + (0.13 * h) / slope;
      p.cyl(0.022, 0.022, len, C.woodDark, x + end * (length / 2 + 0.07), cy, cz, [-s * lean, 0, 0], 5);
    }
  }
  // Hồi trái đan phên (tam giác); hồi phải để ngỏ, thấy chiếu ngủ trải bên trong.
  const tri = new THREE.Shape();
  tri.moveTo(-half * 0.92, 0);
  tri.lineTo(half * 0.92, 0);
  tri.lineTo(0, h * 0.95);
  tri.closePath();
  p.add(new THREE.ExtrudeGeometry(tri, { depth: 0.04, bevelEnabled: false }), C.woodLight, x - length / 2 + 0.02, 0.06, z, [0, Math.PI / 2, 0]);
  p.box(length * 0.7, 0.02, width * 0.45, C.cream, x + 0.05, 0.1, z);
}

/** Mũi giáo của giáo binh thế thủ (`strike` 0,05), đã nhân cỡ lính: lệch sang tay phải `x`, chĩa tới `z`. */
const MUI_GIAO = { x: 0.21 * LINH, z: 1.383 * LINH };
/** Giáo binh đâm gần như dọc trục x (ngang khung nhìn nên thấy rõ cây giáo). */
const DAM_RY = 1.35;

/** `tier`: bậc binh khí đã rèn của giáo binh (đầu giáo sắt, tua đỏ, khiên viền sắt). */
export function makeTraiGiao(tier = 0): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = TRAI_GIAO_LOT;
  khuonVien(m);

  // Lều lính lớn góc sau bên trái, to hơn lều 3×3 chừng 30%; cờ đỏ cắm sau hồi trái, bay cao trên nóc.
  const A = L.zone('A');
  leuChuA(m, A.x - 0.05, A.z + 0.05, 2.1, 1.2, 1.4);
  banner(m, A.x - A.w / 2 + 0.22, A.z - 0.5, 2.4, C.red);

  const g = L.zone('g');
  giaGiao(m, g.x, g.z + 0.1, 0.8, 5);

  // Sân tập đất nện: hai cọc rơm, mỗi cọc một giáo binh đâm (một người thế thủ, một người đâm tới).
  const o = L.cells('o');
  p.box(2.0, 0.02, 1.9, C.earth, 0.75, 0.06, 0.25);
  for (const c of o) cocRom(p, c.x, c.z);
  const out = m.group();
  const at = (c: { x: number; z: number }) => ({
    x: c.x - (MUI_GIAO.x * Math.cos(DAM_RY) + MUI_GIAO.z * Math.sin(DAM_RY)),
    z: c.z - (-MUI_GIAO.x * Math.sin(DAM_RY) + MUI_GIAO.z * Math.cos(DAM_RY)),
  });
  out.add(
    gopLinh([
      { kind: 'giao', tier, ...at(o[0]), ry: DAM_RY, act: { act: 'fight', strike: 0.05 } },
      { kind: 'giao', tier, ...at(o[1]), ry: DAM_RY, act: { act: 'fight', strike: 0.3 } },
    ]),
  );
  return out;
}

export const TRAI_GIAO: CongTrinh = { tiles: 4, make: (_l: number, o: LotOpts = {}) => makeTraiGiao(o.tier), spots: noiOSpots, view: { half: 3.3, lookY: 0.9, px: 64 } };
