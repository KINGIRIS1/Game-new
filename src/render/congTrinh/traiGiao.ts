// Trại giáo 3×3: nơi ở của giáo binh. Hai lều chữ A song song phía sau, giá giáo bên phải, sân tập cọc rơm phía trước,
// rào cọc vót nhọn quanh móng như doanh trại. Dựng một lần, mái tranh. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { banner } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { bakeSoldier } from '../soldier';
import { ToonModel } from '../toon';
import { type CongTrinh, yard } from './chung';

export const TRAI_GIAO_LOT = new Lot(3, [
  'AAAAgg',
  'AAAAgg',
  'aaaa..',
  'aaaa..',
  '.o..o.',
  '..,,..',
]);

/** Lính trong nơi ở giữ cỡ như dáng cũ (0,72 lần, cả mô hình cũ thu 0,95). */
export const LINH = 0.72 * 0.95;

/** Nửa cạnh đường rào trên móng 3×3: cọc đứng sát mép móng mà không chìa ra ngoài. */
export const RAO = 1.43;

/**
 * Rào cọc vót nhọn quanh mép móng (nửa cạnh `half`), cùng kiểu rào doanh trại (cọc cao 0,62, cách 0,3, hai đai
 * buộc ngang), để ba nơi ở dựng sát doanh trại nhìn ra một cụm quân; chừa cổng rộng `gate` giữa mặt trước, hai cọc cổng
 * to, cao hơn buộc vải đỏ. `step`: khoảng cách cọc; `h`: cao cọc; `rails`: độ cao các đai (chuồng voi dùng cọc thưa,
 * cao hơn và hai thanh rào ngang cao hơn).
 */
export function raoCocNhon(m: ToonModel, half: number, gate: number, o: { step?: number; h?: number; r?: number; rails?: number[]; railColor?: number } = {}): void {
  const p = m.plain;
  const step = o.step ?? 0.3;
  const h = o.h ?? 0.62;
  const r = o.r ?? 0.05;
  const rails = o.rails ?? [0.16, 0.36];
  const n = Math.round((2 * half) / step);
  const at = (i: number) => -half + (i * 2 * half) / n;
  const stakes: [number, number][] = [];
  for (let i = 0; i <= n; i++) stakes.push([at(i), -half]);
  for (let i = 1; i <= n; i++) stakes.push([-half, at(i)], [half, at(i)]);
  for (let i = 1; i < n; i++) if (Math.abs(at(i)) > gate / 2 + step * 0.4) stakes.push([at(i), half]);
  for (const [x, z] of stakes) p.cone(r, h, C.wood, x, h / 2 + 0.02, z, undefined, 4);
  const railC = o.railColor ?? C.woodDark;
  const side = half - gate / 2;
  for (const y of rails) {
    p.box(2 * half, 0.04, 0.04, railC, 0, y, -half);
    for (const s of [-1, 1]) {
      p.box(0.04, 0.04, 2 * half, railC, s * half, y, 0);
      p.box(side, 0.04, 0.04, railC, s * (gate / 2 + side / 2), y, half);
    }
  }
  // Hai cọc cổng to, cao hơn, buộc vải đỏ.
  for (const s of [-1, 1]) {
    const x = (s * gate) / 2;
    const gh = h * 1.3;
    p.cyl(r * 1.05, r * 1.2, gh - 0.14, C.woodDark, x, (gh - 0.14) / 2 + 0.02, half, undefined, 6);
    p.cone(r * 1.05, 0.16, C.woodDark, x, gh - 0.04, half, undefined, 6);
    m.band.box(0.13, 0.12, 0.13, C.red, x, gh - 0.3, half);
  }
}

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

/** Giá giáo dựng dọc trục x: hai cột, xà ngang, giáo dựa xà ngả về sau, mũi đồng lớn (cỡ như dáng cũ). */
function giaGiao(m: ToonModel, x: number, z: number, w: number, count: number): void {
  const p = m.plain;
  for (const s of [-1, 1]) p.cyl(0.033, 0.038, 0.9, C.woodDark, x + (s * w) / 2, 0.45, z - 0.09, undefined, 6);
  p.box(w + 0.08, 0.06, 0.06, C.woodDark, x, 0.86, z - 0.09);
  const tilt = 0.18;
  for (let i = 0; i < count; i++) {
    const sx = x - w / 2 + 0.08 + (i * (w - 0.16)) / (count - 1);
    p.cyl(0.015, 0.015, 1.19, C.woodDark, sx, 0.59, z, [-tilt, 0, 0], 5);
    p.cone(0.048, 0.19, C.bronze, sx, 0.59 + 0.69 * Math.cos(tilt), z - 0.69 * Math.sin(tilt), [-tilt, 0, 0], 4);
  }
}

/**
 * Cọc rơm tập đâm (cỡ như `strawDummy` cũ): cọc gỗ, bó rơm làm thân hạ thấp ngang tầm mũi giáo của lính đứng thế thủ,
 * thanh ngang làm vai, nắm rơm làm đầu.
 */
function cocRom(p: ToonModel['plain'], x: number, z: number): void {
  p.cyl(0.026, 0.026, 0.68, C.woodDark, x, 0.39, z, undefined, 5);
  p.cyl(0.11, 0.11, 0.31, C.thatch, x, 0.42, z, undefined, 7);
  p.box(0.043, 0.043, 0.34, C.woodDark, x, 0.62, z);
  p.cyl(0.055, 0.065, 0.12, C.thatch, x, 0.73, z, undefined, 5);
}

/** Mũi giáo của giáo binh thế thủ (`strike` 0,05), đã nhân cỡ lính: lệch sang tay phải `x`, chĩa tới `z`. */
const MUI_GIAO = { x: 0.21 * LINH, z: 1.383 * LINH };

export function makeTraiGiao(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = TRAI_GIAO_LOT;
  yard(m, 3);
  raoCocNhon(m, RAO, 1.0);
  const path = L.zone(',');
  p.box(0.8, 0.03, 0.62, C.earth, path.x, 0.055, path.z - 0.06);

  // Lều lính lớn phía sau, lều thứ hai thấp hơn ở trước; to hơn lều cũ chừng 20%.
  const A = L.zone('A');
  leuChuA(m, A.x + 0.05, A.z + 0.1, 1.6, 0.92, 1.18);
  const a = L.zone('a');
  leuChuA(m, a.x + 0.05, a.z + 0.06, 1.5, 0.86, 1.02);
  // Cờ đỏ cắm sau đầu hồi lều lớn, bay cao trên nóc.
  banner(m, A.x - A.w / 2 + 0.17, A.z - 0.3, 2.1, C.red);

  const g = L.zone('g');
  giaGiao(m, g.x - 0.02, g.z + 0.08, 0.8, 5);

  // Sân tập: hai cọc rơm; một giáo binh đâm thử vào cọc bên phải.
  const [o1, o2] = L.cells('o');
  cocRom(p, o1.x, o1.z);
  cocRom(p, o2.x, o2.z);
  const out = m.group();
  const giao = bakeSoldier('giao', 0, { act: 'fight', strike: 0.05 });
  giao.scale.setScalar(LINH);
  // Đâm gần như dọc trục x (ngang khung nhìn nên thấy rõ cây giáo); đặt lính sao cho mũi giáo cắm vào giữa bó rơm.
  const ry = 1.35;
  const sx = o2.x - (MUI_GIAO.x * Math.cos(ry) + MUI_GIAO.z * Math.sin(ry));
  const sz = o2.z - (-MUI_GIAO.x * Math.sin(ry) + MUI_GIAO.z * Math.cos(ry));
  giao.position.set(sx, 0.05, sz);
  giao.rotation.y = ry;
  out.add(giao);
  return out;
}

export const TRAI_GIAO: CongTrinh = { tiles: 3, make: () => makeTraiGiao(), spots: () => [], view: { half: 2.6, lookY: 0.9, px: 72 } };
