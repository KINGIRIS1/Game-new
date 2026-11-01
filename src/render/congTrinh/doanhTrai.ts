// Doanh trại 4×4: nhà dài để trống không vách chạy suốt phía sau, sân tập rộng ở giữa cho tướng đứng,
// chòi trống sau bên phải, đài tướng trước bên phải; nhà dài thứ hai quay dọc bên trái (cấp 4).
// Bản vẽ ở docs/bo-cuc-cong-trinh.md. Camera nhìn từ trước bên phải nên phần cao (chòi trống) đứng phía sau,
// phía trước tướng chỉ có phần thấp (đài tướng, rào) để không che tướng.

import type * as THREE from 'three';
import { coneRoof, drum, parasol, roofFor } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { saddleRoof } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, yard } from './chung';

export const DOANH_TRAI_LOT = new Lot(4, [
  'HHHHHHHH',
  'HHHHHHHH',
  'hh....55',
  'hh....55',
  'hh..X...',
  'hh....22',
  'g.....22',
  '...,,...',
]);

/** Chỗ tướng đứng giữa sân tập (tâm khối X, tọa độ móng): sân để trống quanh đó cho tướng to. */
export const DOANH_TRAI_HERO = { x: DOANH_TRAI_LOT.zone('X').x, z: DOANH_TRAI_LOT.zone('X').z };

/** Hai lính gác, mỗi người một cột x − z, không đứng trước tướng: một trong cổng trại bên trái, một giữa chòi trống và đài tướng. */
export function doanhTraiSpots(): LotSpot[] {
  return [
    { job: 'linhGac', x: -1.15, y: 0.06, z: 1.45, ry: 0.3 },
    { job: 'linhGac', x: 1.55, y: 0.06, z: 0.15, ry: -1.0 },
  ];
}

/**
 * Nhà dài để trống không vách, mái thẳng: hàng cột, sàn ván thấp, chiếu ngủ và chăn cuộn của lính.
 * `along`: 'x' nhà chạy ngang, 'z' nhà chạy dọc. `length`, `depth`: khoảng cột (ô).
 */
function nhaDai(m: ToonModel, cx: number, cz: number, length: number, depth: number, along: 'x' | 'z'): void {
  const p = m.plain;
  const at = (u: number, v: number): [number, number] => (along === 'x' ? [cx + u, cz + v] : [cx + v, cz + u]);
  const dims = (lu: number, lv: number): [number, number] => (along === 'x' ? [lu, lv] : [lv, lu]);
  const postH = 1.1;
  const bays = Math.max(2, Math.round(length / 1.1));
  for (let i = 0; i <= bays; i++) {
    const u = -length / 2 + (i * length) / bays;
    for (const v of [-depth / 2, depth / 2]) p.cyl(0.055, 0.065, postH, C.woodDark, ...pos(at(u, v), postH / 2), undefined, 6);
  }
  // Sàn ván thấp và dầm sàn.
  const [fw, fd] = dims(length + 0.1, depth + 0.12);
  p.box(fw, 0.08, fd, C.wood, cx, 0.13, cz);
  const [ew, ed] = dims(length + 0.14, 0.06);
  for (const v of [-1, 1]) p.box(ew, 0.1, ed, C.woodDark, ...pos(at(0, (v * (depth + 0.12)) / 2), 0.1));
  // Chiếu ngủ, mỗi gian một chiếu, chăn cuộn đầu chiếu.
  for (let i = 0; i < bays; i++) {
    const u = -length / 2 + ((i + 0.5) * length) / bays;
    const [mw, md] = dims(0.5, depth * 0.62);
    p.box(mw, 0.02, md, C.cream, ...pos(at(u, 0.02), 0.18));
    p.cyl(0.05, 0.05, 0.42, C.indigo, ...pos(at(u, -depth * 0.25), 0.22), along === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0], 6);
  }
  // Mái thẳng kiểu nhà dài (sống mái không cong), khác mái cong vút của Điện.
  const [rx, rz] = [cx, cz];
  const roof = roofFor(1);
  const width = depth + 0.38;
  m.band.add(saddle(length + 0.5, width), roof.main, rx, 1.47, rz, [0, along === 'x' ? 0 : Math.PI / 2, 0]);
}

/** Tọa độ (x, z) và độ cao y thành bộ ba cho ShapeBuilder. */
const pos = ([x, z]: [number, number], y: number): [number, number, number] => [x, y, z];

/** Mái hai dốc thẳng (không vút hai đầu). */
const saddle = (length: number, width: number) => saddleRoof({ length, width, lift: 0, drop: width * 0.38, thickness: 0.08 });

export function makeDoanhTrai(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = DOANH_TRAI_LOT;

  yard(m, 4);
  // Sân tập: đất nện sẫm hơn sân, chỗ lính dượt và tướng đứng.
  p.box(1.9, 0.02, 2.2, C.earth, 0.05, 0.06, 0.25);

  // Nhà dài suốt phía sau.
  const H = L.zone('H');
  nhaDai(m, H.x, H.z + 0.05, 3.3, 0.72, 'x');

  // Giá giáo đồng góc trước bên trái, chạy dọc mép trái: hai cột, hai xà, năm cây giáo mũi đồng.
  const g = L.zone('g');
  const rx = g.x + 0.03;
  const rz0 = g.z;
  const rz1 = rz0 + 0.6;
  for (const z of [rz0, rz1]) p.cyl(0.03, 0.035, 0.95, C.woodDark, rx, 0.47, z, undefined, 5);
  for (const y of [0.35, 0.85]) p.box(0.06, 0.05, rz1 - rz0 + 0.08, C.wood, rx, y, (rz0 + rz1) / 2);
  for (let i = 0; i < 5; i++) {
    const z = rz0 + 0.06 + i * 0.12;
    p.cyl(0.015, 0.015, 1.2, C.woodDark, rx + 0.03, 0.62, z, undefined, 4);
    p.cone(0.04, 0.16, C.bronze, rx + 0.03, 1.3, z, undefined, 4);
  }

  // Cổng trại giữa mặt trước: hai cột đầu vót, xà ngang, vải đỏ, cờ đuôi nheo đỏ trên đầu cột.
  const gate = L.zone(',');
  const gtz = gate.z + 0.08;
  for (const sx of [-1, 1]) {
    p.cyl(0.06, 0.07, 1.6, C.woodDark, sx * 0.6, 0.8, gtz, undefined, 6);
    p.cone(0.075, 0.16, C.wood, sx * 0.6, 1.68, gtz, undefined, 6);
    m.band.box(0.03, 0.34, 0.22, C.red, sx * 0.6, 1.46, gtz - 0.14);
  }
  p.box(1.46, 0.09, 0.12, C.wood, 0, 1.45, gtz);
  m.band.box(0.7, 0.22, 0.04, C.red, 0, 1.28, gtz + 0.05);

  if (level >= 2) {
    // Đài tướng trước bên phải: nền đất đắp kè đá, sàn ván, chiếu cói viền đỏ, lan can đỏ hai phía ngoài,
    // bậc đá quay ra sân, lọng đỏ che góc sau.
    const d = L.zone('2');
    const dx = d.x - 0.07;
    const dz = d.z - 0.02;
    const top = 0.3;
    p.box(0.8, 0.08, 0.82, C.rock, dx, 0.04, dz);
    p.box(0.76, top - 0.08, 0.78, C.earthDark, dx, 0.08 + (top - 0.08) / 2, dz);
    p.box(0.8, 0.05, 0.82, C.wood, dx, top, dz);
    for (let i = 0; i < 2; i++) p.box(0.13, top * (0.4 + 0.3 * i), 0.44, C.rock, dx - 0.47 + i * 0.07, (top * (0.4 + 0.3 * i)) / 2, dz + 0.06);
    p.box(0.5, 0.02, 0.5, C.thatch, dx + 0.02, top + 0.035, dz + 0.04);
    m.band.box(0.5, 0.022, 0.06, C.red, dx + 0.02, top + 0.036, dz + 0.27);
    m.band.box(0.8, 0.14, 0.04, C.red, dx, top + 0.1, dz - 0.39);
    m.band.box(0.04, 0.14, 0.82, C.red, dx + 0.38, top + 0.1, dz);
    parasol(m, dx + 0.22, dz - 0.22, 1.3);
  }
  if (level >= 3) {
    // Rào cọc vót nhọn quanh móng (hai bên và mặt trước; phía sau đã có nhà dài), chừa cổng giữa mặt trước.
    const e = 1.92;
    const step = 0.32;
    const n = Math.round((2 * e) / step);
    for (let i = 0; i <= n; i++) {
      const t = -e + (i * 2 * e) / n;
      if (t > -1.0) {
        p.cone(0.05, 0.62, C.wood, -e, 0.31, t, undefined, 4);
        p.cone(0.05, 0.62, C.wood, e, 0.31, t, undefined, 4);
      }
      if (Math.abs(t) > 0.7) p.cone(0.05, 0.62, C.wood, t, 0.31, e, undefined, 4);
    }
    for (const y of [0.16, 0.36]) {
      for (const sx of [-1, 1]) {
        p.box(0.04, 0.04, e + 1.0, C.woodDark, sx * e, y, (e - 1.0) / 2);
        p.box(e - 0.7, 0.04, 0.04, C.woodDark, sx * (0.7 + (e - 0.7) / 2), y, e);
      }
    }
  }
  if (level >= 4) {
    // Nhà dài thứ hai quay dọc bên trái.
    const h = L.zone('h');
    nhaDai(m, h.x + 0.03, h.z + 0.14, 1.5, 0.68, 'z');
  }
  if (level >= 5) {
    // Chòi trống trận sau bên phải, cạnh nhà dài: chân cột cao, sàn có lan can đỏ, trống đồng, mái tranh nhọn, thang tre.
    const c = L.zone('5');
    const x = c.x - 0.05;
    const z = c.z + 0.05;
    const fy = 1.25;
    for (const ox of [-0.27, 0.27]) for (const oz of [-0.27, 0.27]) p.cyl(0.045, 0.055, fy, C.woodDark, x + ox, fy / 2, z + oz, undefined, 6);
    p.box(0.72, 0.07, 0.72, C.wood, x, fy, z);
    for (const s of [-1, 1]) {
      m.band.box(0.72, 0.12, 0.04, C.red, x, fy + 0.1, z + s * 0.34);
      m.band.box(0.04, 0.12, 0.72, C.red, x + s * 0.34, fy + 0.1, z);
    }
    drum(m, x, z, 0.72, fy + 0.04);
    for (const ox of [-0.29, 0.29]) for (const oz of [-0.29, 0.29]) p.cyl(0.025, 0.025, 0.55, C.woodDark, x + ox, fy + 0.31, z + oz, undefined, 5);
    coneRoof(m, roofFor(level), 0.56, 0.48, x, fy + 0.8, z, 8, true);
    // Thang tre dựa bên trái chòi, quay ra sân.
    for (const oz of [-0.1, 0.1]) p.cyl(0.018, 0.018, 1.4, C.bamboo, x - 0.55, fy / 2, z + oz, [0, 0, -0.33], 4);
    for (let i = 1; i <= 4; i++) p.box(0.03, 0.025, 0.22, C.bamboo, x - 0.78 + i * 0.09, (i * fy) / 5, z);
  }
  return m.group();
}

export const DOANH_TRAI: CongTrinh = { tiles: 4, make: makeDoanhTrai, spots: doanhTraiSpots, view: { half: 4.3, lookY: 1.0, px: 48 } };
