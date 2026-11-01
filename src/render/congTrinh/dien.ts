// Điện Vua Hùng 5×5: cung điện có sân chầu. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5, banner, bird, birdSpread, boatRoof, drum, drumTower, roofFor, stiltHall } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, partScale, postFence, yard } from './chung';

export const DIEN_LOT = new Lot(5, [
  '7.HHHHHH.7',
  'ccHHHHHHCC',
  'ccHHHHHHCC',
  'ccHHHHHHCC',
  '..NNTTNN..',
  'Lmm.,,...L',
  '.2D.,,.D2.',
  '...l,,l...',
  '.ee.,,.aa.',
  '....GG....',
]);

/** Mặt nền đá dưới nhà chính (cấp 4 trở lên). */
const dienBase = (level: number) => (level >= 4 ? 0.45 : 0);

/** Lạc hầu (trái) và lính gác (phải, từ cấp 2) đứng hai bên lối giữa sân chầu. */
export function dienSpots(level: number): LotSpot[] {
  const [l, g] = DIEN_LOT.cells('l');
  return [
    { job: 'lacHau', x: l.x, z: l.z, y: 0.06, ry: 0.3 },
    ...(level >= 2 ? [{ job: 'linhGac' as const, x: g.x, z: g.z, y: 0.06, ry: -0.3 }] : []),
  ];
}

export function makeDien(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = DIEN_LOT;
  const roof = roofFor(level);
  const up = above5(level);
  const s = partScale(level);
  const base = dienBase(level);
  const terrace = 0.16 * up;

  yard(m, 5);
  if (level < 4) {
    // Chưa có rào: bốn cọc mốc tre buộc vải đỏ ở bốn góc đánh dấu đất của Điện.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        p.cyl(0.04, 0.05, 0.75, C.bamboo, sx * 2.3, 0.37, sz * 2.3, undefined, 5);
        m.band.box(0.05, 0.22, 0.14, C.red, sx * 2.3, 0.62, sz * 2.3 + 0.08);
      }
    }
  }

  // Lối giữa sân từ thềm ra cổng: đất nện tới cấp 3, lát đá từ cấp 4.
  const path = L.zone(',');
  const gateZ = L.zone('G');
  const pathZ0 = path.z - path.d / 2;
  const pathZ1 = gateZ.z + gateZ.d / 2 - 0.03;
  if (level < 4) p.box(0.8, 0.03, pathZ1 - pathZ0, C.earth, 0, 0.055, (pathZ0 + pathZ1) / 2);
  else {
    const slabs = 8;
    const len = (pathZ1 - pathZ0) / slabs;
    for (let i = 0; i < slabs; i++) p.box(0.86, 0.05, len - 0.04, i % 2 ? C.rock : C.rockDark, 0, 0.065, pathZ0 + len * (i + 0.5));
  }

  // Nhà chính lùi về sau, to hơn dáng cũ chừng 15% (người giữ cỡ nên điện trông bề thế hơn).
  const hallW = 3.25 * s;
  const hallD = 1.85 * s;
  const hallZ = -1.3;
  const platW = hallW + 0.1;
  const platFront = hallZ + hallD / 2 + 0.12;
  if (level >= 4) {
    // Nền đất đắp viền đá dưới nhà chính; hai bên thềm là nền đá thấp; thềm đá ba bậc ở giữa.
    const platD = platFront + 2.45;
    p.box(platW, base, platD, C.earth, 0, base / 2, platFront - platD / 2);
    p.box(platW + 0.06, 0.08, platD + 0.04, C.rock, 0, base, platFront - platD / 2);
    const stepW = level >= 8 ? 2.0 : 1.0;
    for (const sx of [-1, 1]) {
      const w = (platW - stepW) / 2;
      p.box(w, base * 0.5, 0.4, C.rock, sx * (stepW / 2 + w / 2), base * 0.25, platFront + 0.2);
      p.box(w + 0.02, 0.05, 0.42, C.rockDark, sx * (stepW / 2 + w / 2), base * 0.5, platFront + 0.2);
    }
    for (let i = 0; i < 3; i++) {
      const h = base - i * 0.15;
      p.box(stepW, h, 0.2, i % 2 && level >= 8 ? C.rockDark : C.rock, 0, h / 2, platFront + 0.1 + i * 0.2);
    }
  }
  if (up) {
    // Cấp 6–8: nền đá thứ hai dưới nhà chính, cao dần; cấp 8 viền đồng.
    p.box(hallW + 0.2, terrace, hallD + 0.3, C.rock, 0, base + terrace / 2, hallZ);
    p.box(hallW + 0.24, 0.06, hallD + 0.34, C.rockDark, 0, base + terrace, hallZ);
    if (level >= 8) {
      for (const sz of [-1, 1]) p.box(hallW + 0.28, 0.07, 0.07, C.bronze, 0, base + terrace + 0.01, hallZ + (sz * (hallD + 0.34)) / 2);
      for (const sx of [-1, 1]) p.box(0.07, 0.07, hallD + 0.38, C.bronze, (sx * (hallW + 0.24)) / 2, base + terrace + 0.01, hallZ);
    }
  }
  const floor = base + terrace;
  const hall = {
    x: 0,
    z: hallZ,
    w: hallW,
    d: hallD,
    postH: 1.2 * s + floor + 0.12 * up,
    roofL: Math.min(hallW + 1.3 * s, 4.9),
    roofW: Math.min(hallD + 0.4 + 0.06 * up, 2 * (hallZ + 2.48)),
    lift: 1.05 * s + 0.15 * up,
    roof,
  };
  stiltHall(m, hall);
  p.box(0.5 * s, 0.55 * s, 0.06, C.woodDark, 0, hall.postH + 0.33 * s, hallZ + hallD / 2 - 0.2);
  // Thang gỗ từ sàn xuống nền (hay xuống sân khi chưa có nền): nhà càng cao thang càng nhiều bậc.
  const rungs = 4 + up;
  const ladderTop = hallZ + hallD / 2;
  const ladderRun = 0.45;
  for (let i = 0; i < rungs; i++) {
    const t = i / (rungs - 1);
    p.box(0.5, 0.06, 0.18, C.woodDark, 0, hall.postH - 0.15 - t * (hall.postH - floor - 0.25), ladderTop + 0.05 + t * ladderRun);
  }
  const roofTop = hall.postH + 0.68 + hall.roofW * 0.4 + hall.lift;

  if (level >= 2) {
    // Chim đồng hai đầu nóc; cờ đỏ hai bên lối; trống đồng trên giá bên phải lối.
    bird(m, hall.roofL / 2 - 0.1, roofTop + 0.05, hallZ, 1, 1.1);
    bird(m, -hall.roofL / 2 + 0.1, roofTop + 0.05, hallZ, -1, 1.1);
    for (const f of L.groups('2')) banner(m, f.x - 0.2, f.z, level >= 6 ? 2.7 : 2.4, C.red);
    const drums = L.groups('D');
    const big = level >= 5;
    for (const d of big ? drums : drums.slice(1)) {
      // Giá gỗ thấp: hai cột, xà ngang; trống đặt trên giá.
      for (const sx of [-1, 1]) p.box(0.06, 0.28, 0.06, C.woodDark, d.x + sx * 0.3, 0.14, d.z);
      p.box(0.68, 0.06, 0.12, C.wood, d.x, 0.28, d.z);
      drum(m, d.x, d.z, big ? 1.05 : 0.85, 0.3);
    }
  }
  if (level >= 3) {
    // Chái nhà bên phải, mái quay ngang.
    const Cz = L.zone('C');
    stiltHall(m, { x: Cz.x + 0.07, z: Cz.z, w: 0.76, d: 1.3, postH: 0.85 * s + 0.2 * up, roofL: 1.6, roofW: 1.15, lift: 0.35 + 0.08 * up, ry: Math.PI / 2, roof });
  }
  if (level >= 4) {
    // Hàng rào cột chạm quanh móng, cổng gỗ có mái nhỏ giữa mặt trước (mái theo cấp).
    postFence(m, 2.45, 1.2);
    const G = L.zone('G');
    const gz = G.z + 0.15;
    for (const sx of [-1, 1]) {
      p.cyl(0.07, 0.08, 1.45, C.woodDark, sx * 0.55, 0.72, gz, undefined, 8);
      p.cyl(0.09, 0.09, 0.07, C.bronze, sx * 0.55, 1.05, gz, undefined, 8);
    }
    p.box(1.4, 0.1, 0.14, C.wood, 0, 1.45, gz);
    m.band.box(0.7, 0.22, 0.05, C.red, 0, 1.28, gz + 0.06);
    boatRoof(m, roof, { length: 1.75, width: 0.6, lift: 0.22, drop: 0.2, thickness: 0.05 }, 0, 1.68, gz);
    if (level >= 8) {
      bird(m, 0.8, 1.9, gz, 1, 0.45);
      bird(m, -0.8, 1.9, gz, -1, 0.45);
    }
  }
  if (level >= 5) {
    // Mái tầng hai trên nóc, sống mái mạ đồng.
    const y2 = hall.postH + 0.68 + hall.roofW * 0.4 + 0.65 + 0.1 * up;
    boatRoof(m, roof, { length: hallW * 0.8, width: 1.35 + 0.08 * up, lift: 0.7 + 0.1 * up, drop: 0.5, thickness: 0.08 }, 0, y2, hallZ);
    if (roof.trim === null) p.box(hallW * 0.7, 0.07, 0.14, C.bronzeLight, 0, y2 + 0.04, hallZ);
  }
  if (level >= 6) {
    // Hai lầu trống đồng ở hai góc trước sân.
    for (const t of L.groups('L')) drumTower(m, Math.sign(t.x) * 2.1, t.z, 0, roof, level >= 8);
    // Lan can sơn đỏ hoa văn quanh hiên nhà chính, chừa lối cửa giữa.
    const fy = hall.postH + 0.16;
    const fz = hallZ + hallD / 2 - 0.03;
    for (const sx of [-1, 1]) {
      m.band.box(hallW / 2 - 0.35, 0.2, 0.05, C.red, sx * (hallW / 4 + 0.17), fy, fz);
      m.band.box(0.05, 0.2, hallD - 0.1, C.red, sx * (hallW / 2 - 0.03), fy, hallZ);
    }
  }
  if (level >= 7) {
    // Chái nhà bên trái cho cân hai bên.
    const cz = L.zone('c');
    stiltHall(m, { x: cz.x - 0.07, z: cz.z, w: 0.76, d: 1.3, postH: 0.85 * s + 0.2 * up, roofL: 1.6, roofW: 1.15, lift: 0.35 + 0.08 * up, ry: Math.PI / 2, roof });
    // Hai cột chim Lạc ở hai góc sau: cột gỗ chạm, đai đồng, chim Lạc dang cánh trên đỉnh.
    for (const c of L.groups('7')) {
      p.cyl(0.07, 0.09, 3.2, C.woodDark, c.x, 1.6, c.z, undefined, 8);
      for (const y of [1.0, 2.0, 2.9]) p.cyl(0.1, 0.1, 0.08, C.bronze, c.x, y, c.z, undefined, 8);
      birdSpread(m, c.x, 3.2, c.z, 0.75);
    }
    // Mái tầng ba trên cùng, đôi chim đồng lớn đậu hai đầu nóc.
    const y3 = hall.postH + 0.68 + hall.roofW * 0.4 + 1.25 + 0.2 * up;
    boatRoof(m, roof, { length: hallW * 0.6, width: 0.95 + 0.06 * up, lift: 0.55 + 0.08 * up, drop: 0.38, thickness: 0.07 }, 0, y3, hallZ, 0, true);
    if (roof.trim === null) p.box(hallW * 0.5, 0.06, 0.12, C.bronzeLight, 0, y3 + 0.03, hallZ);
    const top = y3 + 0.55;
    bird(m, hallW * 0.3, top, hallZ, 1, 1.5);
    bird(m, -hallW * 0.3, top, hallZ, -1, 1.5);
    if (level >= 8) {
      // Trống đồng lớn trên nóc, giữa đôi chim đồng.
      drum(m, 0, hallZ, 0.6, top - 0.18);
      p.cyl(0.05, 0.07, 0.25, C.bronzeDark, 0, top - 0.12, hallZ, undefined, 8);
    }
  }
  return m.group();
}


export const DIEN: CongTrinh = { tiles: 5, make: makeDien, spots: dienSpots, view: { half: 5.4, lookY: 1.9, px: 44 } };
