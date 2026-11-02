// Nhà sàn 3×3: một nếp nhà có vườn. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5, arecaPalm, bird, boatRoof, domeHouse, roofFor, stiltHall } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { seeded } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, partScale, yard } from './chung';

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
    { job: 'phuNu', x: 0.3, z: 0.9, y: 0.05, ry: 0.5 },
    { job: 'phuNu', x: V.x + 0.1, z: V.z - 0.05, y: 0.05, ry: -0.7 },
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

export function makeNhaSan(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = NHA_SAN_LOT;
  const roof = roofFor(level);
  const up = above5(level);
  const s = partScale(level);
  // Cấp 6–8: cột nhà sàn cao thêm.
  const tall = 0.1 * up;

  yard(m, 3);
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
    if (!roof.lac) {
      bird(m, hx + 1.0, top, hz, 1, 0.65);
      bird(m, hx - 1.0, top, hz, -1, 0.65);
    }
    frontZ = hz + 0.575;
    floorY = 0.72 + tall;
    if (level >= 9) {
      // Lan can quanh sàn chạm hoa văn trống đồng, tay vịn đỏ, chừa lối thang giữa mặt trước.
      const fy = floorY + 0.13;
      for (const sx of [-1, 1]) {
        m.band.box(0.6, 0.18, 0.04, C.woodLight, hx + sx * 0.56, fy, frontZ - 0.01);
        p.box(0.62, 0.035, 0.06, C.red, hx + sx * 0.56, fy + 0.1, frontZ - 0.01);
        m.band.box(0.04, 0.18, 1.1, C.woodLight, hx + sx * 0.86, fy, hz);
        p.box(0.06, 0.035, 1.12, C.red, hx + sx * 0.86, fy + 0.1, hz);
      }
    }
  }
  if (level >= 2) {
    // Hiên trước, thang tre xuống sân; chum nước góc sân.
    const E = L.zone('E');
    p.box(0.9, 0.06, 0.32, C.wood, E.x, floorY, frontZ + 0.14);
    const steps = 3 + up;
    // Cấp 9 trở lên: cầu thang gỗ to, bậc rộng, hai má thang sơn đỏ, trụ đầu thang bịt đồng.
    const wide = level >= 9;
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / (steps + 1);
      p.box(wide ? 0.5 : 0.32, wide ? 0.05 : 0.04, wide ? 0.13 : 0.1, C.woodDark, E.x, floorY - t * (floorY - 0.06), frontZ + 0.32 + t * 0.32);
    }
    if (wide) {
      for (const sx of [-1, 1]) {
        const x = E.x + sx * 0.27;
        const a: [number, number, number] = [x, floorY + 0.02, frontZ + 0.3];
        const b: [number, number, number] = [x, 0.08, frontZ + 0.68];
        p.box(0.05, 0.1, Math.hypot(a[1] - b[1], a[2] - b[2]), C.red, x, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, [Math.atan2(a[1] - b[1], b[2] - a[2]), 0, 0]);
        p.cyl(0.035, 0.04, 0.3, C.woodDark, x, 0.15, frontZ + 0.7, undefined, 6);
        p.sphere(0.045, C.gold, x, 0.32, frontZ + 0.7, [1, 1.1, 1], 6);
      }
    }
    const J = L.zone('J');
    p.cyl(0.13, 0.1, 0.24, C.soil, J.x, 0.14, J.z, undefined, 10);
    p.cyl(0.11, 0.11, 0.02, C.paddyWater, J.x, 0.26, J.z, undefined, 10);
  }
  if (level >= 3) {
    // Nhà phụ mái tròn bên phải.
    const h = L.zone('h');
    if (level >= 10) {
      // Cấp 10: nhà phụ thành nếp nhà sàn thứ hai, mái thuyền, sàn ngang sàn nhà chính.
      stiltHall(m, { x: h.x + 0.05, z: h.z - 0.05, w: 0.72, d: 0.78, postH: 0.72 + tall, roofL: 0.95, roofW: 0.92, lift: 0.34, roof });
    } else domeHouse(m, h.x + 0.05, h.z - 0.05, 0.75 + 0.05 * (Math.min(level, 5) - 3), roof, tall);
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
    if (level >= 10) {
      // Hiên có mái nối hai nếp nhà: sàn gỗ, bốn cột, mái thuyền nhỏ quay ngang.
      const x0 = hx + 0.8;
      const x1 = h.x - 0.28;
      const cx = (x0 + x1) / 2;
      const cz = (hz + h.z - 0.05) / 2;
      p.box(x1 - x0 + 0.1, 0.05, 0.62, C.wood, cx, floorY - 0.01, cz);
      for (const dx of [-1, 1]) for (const dz of [-0.26, 0.26]) p.cyl(0.03, 0.035, 0.55, C.woodDark, cx + dx * ((x1 - x0) / 2), floorY + 0.27, cz + dz, undefined, 5);
      boatRoof(m, roof, { length: 0.82, width: 0.5, lift: 0.14, drop: 0.14, thickness: 0.04 }, cx, floorY + 0.68, cz, Math.PI / 2);
    } else bambooBridge(m, hx + 0.75, hz + 0.2, h.x - 0.35, h.z, floorY - 0.02);
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


export const NHA_SAN: CongTrinh = { tiles: 3, make: makeNhaSan, spots: nhaSanSpots, view: { half: 3.2, lookY: 1.0, px: 64 } };
