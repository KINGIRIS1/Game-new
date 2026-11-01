// Bản thử móng mới (xem mục "Kế hoạch: công trình to hơn" ở docs/thiet-ke.md): Điện Vua Hùng 5×5 và nhà sàn 3×3
// vẽ lại theo bản vẽ ô con ở docs/bo-cuc-cong-trinh.md. Chưa nối vào game; scripts/chup-cong-trinh.mjs chụp để duyệt.
// Người, thú, đồ vật giữ cỡ như dáng cũ; móng rộng ra để có sân, lối, rào. Không thu tâm (setSpread) như dáng cũ:
// mỗi phần đứng trong khối chữ của nó và to dần tại chỗ.
// Gốc tọa độ là tâm móng, mặt trước hướng +z.

import * as THREE from 'three';
import {
  above5,
  arecaPalm,
  banner,
  bird,
  birdSpread,
  boatRoof,
  domeHouse,
  drum,
  drumTower,
  roofFor,
  stiltHall,
} from './buildings';
import { Lot } from './lot';
import { C } from './palette';
import { seeded } from './shapes';
import { ToonModel } from './toon';

/** Cỡ phần chính theo cấp: 85% ở cấp 1 tới 105% ở cấp 5, như dáng cũ; cấp 6–8 cao lên chứ không rộng ra. */
const partScale = (level: number) => 0.8 + 0.05 * Math.min(level, 5);

/** Chỗ người đứng, theo tọa độ móng (chưa nhân cỡ). */
export interface LotSpot {
  x: number;
  z: number;
  y: number;
  ry: number;
}

// ---------- Điện Vua Hùng 5×5 ----------

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

/** Lạc hầu (trái) và lính gác (phải) đứng hai bên lối giữa sân chầu. */
export function dienSpots(level: number): LotSpot[] {
  const [l, g] = DIEN_LOT.cells('l');
  return [
    { x: l.x, z: l.z, y: 0.06, ry: 0.3 },
    ...(level >= 2 ? [{ x: g.x, z: g.z, y: 0.06, ry: -0.3 }] : []),
  ];
}

/** Màu sân đất nện: sáng hơn đất trồng để móng không nặng màu giữa cỏ. */
const YARD = 0xcfb07a;

/** Sân đất nện phủ cả móng, mép thấp cho thấy ranh móng. */
function yard(m: ToonModel, tiles: number, color: number): void {
  m.plain.box(tiles - 0.06, 0.05, tiles - 0.06, color, 0, 0.025, 0);
}

/** Hàng rào cột chạm quanh mép móng, đầu cột bọc đồng, chừa cổng rộng `gate` giữa mặt trước. */
function postFence(m: ToonModel, half: number, gate: number, step = 0.62): void {
  const p = m.plain;
  const n = Math.round((2 * half) / step);
  const posts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = -half + (i * 2 * half) / n;
    posts.push([t, -half], [-half, t], [half, t]);
    if (Math.abs(t) > gate / 2) posts.push([t, half]);
  }
  for (const [x, z] of posts) {
    p.cyl(0.045, 0.05, 0.55, C.woodDark, x, 0.3, z, undefined, 6);
    p.sphere(0.065, C.bronze, x, 0.6, z, [1, 1, 1], 6);
  }
  // Xà ngang nối đầu cột.
  const rail = 0.42;
  p.box(2 * half, 0.05, 0.05, C.wood, 0, rail, -half);
  for (const s of [-1, 1]) {
    p.box(0.05, 0.05, 2 * half, C.wood, s * half, rail, 0);
    const len = half - gate / 2;
    p.box(len, 0.05, 0.05, C.wood, s * (gate / 2 + len / 2), rail, half);
  }
}

export function makeDienMoi(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = DIEN_LOT;
  const roof = roofFor(level);
  const up = above5(level);
  const s = partScale(level);
  const base = dienBase(level);
  const terrace = 0.16 * up;

  yard(m, 5, YARD);
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

// ---------- Nhà sàn 3×3 ----------

export const NHA_SAN_LOT = new Lot(3, [
  'HHHHQQ',
  'HHHHhh',
  'HHHHhh',
  '.EE.kk',
  'VV..gJ',
  'VV,,PP',
]);

/** Hai người: một ở sân trước nhà, một ở vườn rau. */
export function nhaSanSpots(): LotSpot[] {
  const V = NHA_SAN_LOT.zone('V');
  return [
    { x: 0.3, z: 0.9, y: 0.05, ry: 0.5 },
    { x: V.x + 0.1, z: V.z - 0.05, y: 0.05, ry: -0.7 },
  ];
}

/** Cầu tre nối hai sàn nhà từ (x0, z0) tới (x1, z1) ở độ cao `y`: sàn hai cây tre, tay vịn hai bên. */
function bambooBridge(m: ToonModel, x0: number, z0: number, x1: number, z1: number, y: number): void {
  const p = m.plain;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const a = Math.atan2(x1 - x0, z1 - z0);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  p.box(0.16, 0.04, len, C.bamboo, cx, y, cz, [0, a, 0]);
  for (const off of [-0.08, 0.08]) {
    const ox = Math.cos(a) * off;
    const oz = -Math.sin(a) * off;
    p.box(0.025, 0.025, len, C.bamboo, cx + ox, y + 0.18, cz + oz, [0, a, 0]);
    for (const t of [-0.3, 0, 0.3]) p.cyl(0.015, 0.015, 0.18, C.woodDark, cx + ox + Math.sin(a) * t * len, y + 0.09, cz + oz + Math.cos(a) * t * len, undefined, 4);
  }
}

export function makeNhaSanMoi(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = NHA_SAN_LOT;
  const roof = roofFor(level);
  const up = above5(level);
  const s = partScale(level);
  // Cấp 6–8: cột nhà sàn cao thêm.
  const tall = 0.1 * up;

  yard(m, 3, YARD);
  const path = L.zone(',');
  p.box(path.w * 0.8, 0.03, path.d + 0.5, C.earth, path.x, 0.055, path.z - 0.25);

  // Nhà chính lùi về góc sau bên trái.
  const H = L.zone('H');
  const hx = H.x;
  const hz = H.z + 0.13;
  // Nhà chính to hơn dáng cũ chừng 30%: mái tròn rộng gần hết khối H.
  const mainS = 1.5 * s;
  // Mặt trước sàn nhà chính, chỗ hiên và thang.
  let frontZ = hz + 0.425 * mainS;
  let floorY = 0.55 * mainS + tall;
  if (level <= 6) domeHouse(m, hx, hz, mainS, roof, tall);
  else if (level === 7) {
    // Nhà chính thành nhà mái thuyền, nối cầu tre sang nhà phụ mái tròn.
    stiltHall(m, { x: hx, z: hz, w: 1.65, d: 1.1, postH: 0.68 + tall, roofL: 2.05, roofW: 1.35, lift: 0.45, roof });
    frontZ = hz + 0.55;
    floorY = 0.68 + tall;
  } else {
    // Nhà sàn dài mái thuyền vút cao hai đầu như nhà khắc trên trống đồng, chim đồng hai đầu nóc.
    stiltHall(m, { x: hx, z: hz, w: 1.75, d: 1.15, postH: 0.72 + tall, roofL: 2.1, roofW: 1.4, lift: 0.8, roof });
    const top = 0.72 + tall + 0.68 + 1.4 * 0.4 + 0.8;
    bird(m, hx + 1.0, top, hz, 1, 0.65);
    bird(m, hx - 1.0, top, hz, -1, 0.65);
    frontZ = hz + 0.575;
    floorY = 0.72 + tall;
  }
  if (level >= 2) {
    // Hiên trước, thang tre xuống sân; chum nước góc sân.
    const E = L.zone('E');
    p.box(0.9, 0.06, 0.32, C.wood, E.x, floorY, frontZ + 0.14);
    const steps = 3 + up;
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / (steps + 1);
      p.box(0.32, 0.04, 0.1, C.woodDark, E.x, floorY - t * (floorY - 0.06), frontZ + 0.32 + t * 0.32);
    }
    const J = L.zone('J');
    p.cyl(0.13, 0.1, 0.24, C.soil, J.x, 0.14, J.z, undefined, 10);
    p.cyl(0.11, 0.11, 0.02, C.paddyWater, J.x, 0.26, J.z, undefined, 10);
  }
  if (level >= 3) {
    // Nhà phụ mái tròn bên phải.
    const h = L.zone('h');
    domeHouse(m, h.x + 0.05, h.z - 0.05, 0.75 + 0.05 * (Math.min(level, 5) - 3), roof, tall);
  }
  if (level >= 4) {
    // Vườn rau rào tre góc trước bên trái: ba luống rau.
    const V = L.zone('V');
    for (let i = 0; i < 3; i++) {
      const z = V.z - 0.3 + i * 0.3;
      p.box(V.w - 0.25, 0.07, 0.16, C.earthDark, V.x, 0.08, z);
      for (let j = 0; j < 4; j++) p.sphere(0.07, i % 2 ? C.leaf[1] : C.leaf[3], V.x - 0.28 + j * 0.19, 0.15, z, [1, 0.7, 1], 6);
    }
    const x0 = V.x - V.w / 2 + 0.06;
    const x1 = V.x + V.w / 2 - 0.06;
    const z0 = V.z - V.d / 2 + 0.06;
    const z1 = V.z + V.d / 2 - 0.06;
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      for (const [x, z] of [[x0 + t * (x1 - x0), z1], [x0, z0 + t * (z1 - z0)], [x1, z0 + t * (z1 - z0)], [x0 + t * (x1 - x0), z0]] as const) {
        p.cyl(0.018, 0.018, 0.28, C.bamboo, x, 0.14, z, undefined, 4);
      }
    }
    for (const [cx, cz, w, d] of [[(x0 + x1) / 2, z1, x1 - x0, 0.025], [(x0 + x1) / 2, z0, x1 - x0, 0.025], [x0, (z0 + z1) / 2, 0.025, z1 - z0], [x1, (z0 + z1) / 2, 0.025, z1 - z0]] as const) {
      p.box(w, 0.025, d, C.bamboo, cx, 0.22, cz);
    }
  }
  if (level >= 5) {
    // Nhà nhỏ thứ ba ở trước nhà phụ; chim đồng trên nóc nhà chính.
    const k = L.zone('k');
    domeHouse(m, k.x + 0.1, k.z + 0.12, 0.55, roof, tall * 0.5);
    if (level <= 6) bird(m, hx + 0.1, 0.55 * mainS + tall + 0.9 * mainS, hz + 0.05, 1, 0.6);
  }
  if (level >= 6) {
    // Cây cau cao vút góc sau bên phải, cao dần theo cấp.
    const Q = L.zone('Q');
    arecaPalm(p, Q.x + 0.2, Q.z, 2.0 + 0.25 * up);
    // Sàn phơi lúa trên cọc thấp góc trước bên phải: thóc vàng, cây cào gỗ.
    const P = L.zone('P');
    for (const dx of [-0.35, 0.35]) for (const dz of [-0.15, 0.15]) p.cyl(0.03, 0.03, 0.26, C.woodDark, P.x + dx, 0.13, P.z + dz, undefined, 5);
    p.box(0.86, 0.05, 0.44, C.bamboo, P.x, 0.27, P.z);
    p.box(0.78, 0.04, 0.36, C.ripe, P.x, 0.31, P.z);
    p.cyl(0.012, 0.012, 0.55, C.woodDark, P.x + 0.15, 0.42, P.z, [0, 0, 1.0], 4);
    // Chuồng gà tre và hai con gà ra sân.
    const g = L.zone('g');
    p.box(0.4, 0.26, 0.34, C.bamboo, g.x, 0.14, g.z);
    for (let i = 0; i < 3; i++) p.box(0.02, 0.26, 0.35, C.woodDark, g.x - 0.13 + i * 0.13, 0.14, g.z);
    p.box(0.46, 0.04, 0.4, C.thatch, g.x, 0.29, g.z);
    for (const [cx, cz, c] of [[g.x - 0.35, g.z + 0.15, C.cream], [g.x + 0.05, g.z + 0.4, 0xb8743a]] as const) {
      p.sphere(0.08, c, cx, 0.1, cz, [1, 0.9, 1.2], 7);
      p.sphere(0.05, c, cx, 0.19, cz + 0.06, [1, 1, 1], 6);
      p.cone(0.025, 0.06, C.red, cx, 0.25, cz + 0.06, undefined, 4);
      p.cone(0.015, 0.04, C.bronzeLight, cx, 0.18, cz + 0.12, [Math.PI / 2, 0, 0], 4);
    }
  }
  if (level >= 7) {
    // Cầu tre từ hiên bên phải nhà chính sang sàn nhà phụ.
    const h = L.zone('h');
    bambooBridge(m, hx + 0.75, hz + 0.2, h.x - 0.35, h.z, floorY - 0.02);
  }
  // Vài khóm cỏ ven mép sân cho mềm ranh móng.
  const rand = seeded(17);
  for (let i = 0; i < 6; i++) {
    const t = rand() * 2.6 - 1.3;
    const [x, z] = i % 2 ? [1.38, t] : [t, -1.38];
    p.cone(0.06, 0.16, C.leaf[(i % 3) + 1], x, 0.1, z, undefined, 5);
  }
  return m.group();
}

