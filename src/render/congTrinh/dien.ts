// Điện Vua Hùng 5×5: cung điện Hoàng Gia Lạc Việt có sân chầu, thềm rồng đá, đỉnh đồng, cổng tứ trụ. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import type * as THREE from 'three';
import { above5, banner, bird, birdSpread, boatRoof, drum, drumTower, type Roof, roofFor, stiltHall } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, partScale, postFence, rod, yard } from './chung';

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

/** Đỉnh đồng / Lư hương hoàng cung 3 chân đặt hai bên thềm chầu. */
function royalCenser(m: ToonModel, x: number, y0: number, z: number, s = 1): void {
  const p = m.plain;
  p.cyl(0.14 * s, 0.16 * s, 0.05 * s, C.rockDark, x, y0 + 0.025 * s, z, undefined, 8);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    p.cyl(0.022 * s, 0.018 * s, 0.14 * s, C.bronzeDark, x + Math.cos(a) * 0.08 * s, y0 + 0.09 * s, z + Math.sin(a) * 0.08 * s, undefined, 5);
  }
  m.band.sphere(0.115 * s, C.bronze, x, y0 + 0.19 * s, z, [1.05, 0.82, 1.05], 10);
  p.cyl(0.11 * s, 0.095 * s, 0.05 * s, C.gold, x, y0 + 0.27 * s, z, undefined, 10);
  for (const sx of [-1, 1]) {
    p.box(0.03 * s, 0.11 * s, 0.05 * s, C.gold, x + sx * 0.125 * s, y0 + 0.23 * s, z, [0, 0, -sx * 0.2]);
  }
  m.glow.sphere(0.055 * s, 0xff9a2e, x, y0 + 0.3 * s, z, [1.2, 0.55, 1.2], 7);
}

/**
 * Chính Điện Hoàng Cung Lạc Việt:
 * - Hàng cột cái sơn son / gỗ lim có chân tảng đá chạm và đai đồng vàng, đầu cột có kẻ bẩy.
 * - Sàn gỗ lim dày viền hoa văn Đông Sơn.
 * - Vách điện 3 gian: gian giữa mở cửa triều đình sơn đỏ thếp vàng treo Hoành Phi & Mặt Trống Đồng Ngọc Lũ;
 *   hai gian bên có cửa sổ chấn song, khiên đồng hộ môn và đèn lồng đồng phát sáng.
 */
function royalPalaceHall(
  m: ToonModel,
  o: { x: number; z: number; w: number; d: number; floor: number; postH: number; roofL: number; roofW: number; lift: number; roof: Roof; level: number },
): void {
  const p = m.plain;
  const colH = o.postH - o.floor;
  const colY = o.floor + colH / 2;
  const colColor = o.level >= 4 ? C.red : C.woodDark;
  const ringColor = o.level >= 6 ? C.gold : C.bronze;

  // 1. Hệ 8 cột cái (4 cột tiền đường, 4 cột hậu đường) có chân tảng đá & đai đồng
  const xs = [-o.w / 2 + 0.16, -o.w * 0.17, o.w * 0.17, o.w / 2 - 0.16];
  const zs = [-o.d / 2 + 0.14, o.d / 2 - 0.14];
  for (const cx of xs) {
    for (const cz of zs) {
      const px = o.x + cx;
      const pz = o.z + cz;
      p.cyl(0.1, 0.125, 0.1, C.rockDark, px, o.floor + 0.05, pz, undefined, 8);
      p.cyl(0.078, 0.095, colH, colColor, px, colY, pz, undefined, 8);
      p.cyl(0.092, 0.092, 0.055, ringColor, px, o.floor + colH * 0.35, pz, undefined, 8);
      p.cyl(0.088, 0.088, 0.055, ringColor, px, o.floor + colH * 0.78, pz, undefined, 8);
    }
  }

  // 2. Sàn Chính Điện dày có diềm hoa văn Đông Sơn và nẹp đồng 4 góc
  p.box(o.w, 0.14, o.d, C.wood, o.x, o.postH, o.z);
  m.band.box(o.w + 0.04, 0.08, o.d + 0.04, C.woodLight, o.x, o.postH - 0.02, o.z);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      p.box(0.14, 0.15, 0.14, ringColor, o.x + sx * (o.w / 2 - 0.05), o.postH, o.z + sz * (o.d / 2 - 0.05));
    }
  }

  // 3. Thân vách Chính Điện 3 gian & Cửa Triều Đình
  const wallW = o.w - 0.48;
  const wallD = o.d - 0.44;
  const wallH = 0.68;
  const wallY = o.postH + 0.07 + wallH / 2;
  m.band.box(wallW, wallH, wallD, C.woodLight, o.x, wallY, o.z);

  // Các cột trụ vách sơn đỏ chia 3 gian mặt trước & mặt sau
  const frontZ = o.z + wallD / 2 + 0.02;
  for (const k of [-0.48, -0.18, 0.18, 0.48]) {
    p.box(0.07, wallH + 0.04, 0.06, C.red, o.x + k * wallW, wallY, frontZ);
  }

  // Cửa Chính Điện ở gian giữa + khung bao đỏ viền vàng + Hoành phi & Mặt Trống Đồng trên trán cửa
  const doorW = wallW * 0.28;
  const doorH = wallH * 0.82;
  p.box(doorW, doorH, 0.06, 0x24160e, o.x, o.postH + 0.07 + doorH / 2, frontZ + 0.01);
  for (const sx of [-1, 1]) {
    p.box(0.05, doorH + 0.04, 0.07, C.gold, o.x + sx * (doorW / 2 + 0.02), o.postH + 0.07 + doorH / 2, frontZ + 0.02);
  }
  // Bức Hoành Phi đỏ viền vàng & Mặt Trống Đồng Ngọc Lũ treo giữa mặt tiền điện
  p.box(doorW + 0.24, 0.14, 0.08, C.gold, o.x, o.postH + wallH + 0.02, frontZ + 0.03);
  m.band.box(doorW + 0.18, 0.1, 0.09, C.red, o.x, o.postH + wallH + 0.02, frontZ + 0.035);
  m.drum.cyl(0.19, 0.19, 0.05, 0xffffff, o.x, o.postH + wallH + 0.16, frontZ + 0.04, [Math.PI / 2, 0, 0], 16);

  // Hai gian bên: cửa sổ chấn song, khiên đồng hộ môn & đèn lồng đồng phát sáng
  for (const sx of [-1, 1]) {
    const bx = o.x + sx * wallW * 0.33;
    p.box(0.32, 0.26, 0.05, C.woodDark, bx, wallY + 0.02, frontZ + 0.01);
    p.cyl(0.11, 0.11, 0.04, ringColor, bx, wallY + 0.02, frontZ + 0.03, [Math.PI / 2, 0, 0], 10);
    if (o.level >= 3) {
      const lx = o.x + sx * (doorW / 2 + 0.16);
      const ly = o.postH + wallH * 0.72;
      p.cyl(0.045, 0.035, 0.09, C.red, lx, ly, frontZ + 0.1, undefined, 6);
      m.glow.sphere(0.038, 0xffb84a, lx, ly, frontZ + 0.11, [1, 1.2, 1], 6);
    }
  }

  // 4. Đòn tay gỗ nhô ra dưới diềm mái & Mái thuyền Hoàng Cung
  const roofY = o.postH + 0.72 + o.roofW * 0.4;
  for (const sx of [-1, 1]) {
    p.cyl(0.035, 0.035, o.roofL * 0.92, C.woodDark, o.x, o.postH + wallH + 0.08, o.z + sx * (wallD / 2 + 0.08), [0, 0, Math.PI / 2], 6);
  }
  boatRoof(m, o.roof, { length: o.roofL, width: o.roofW, lift: o.lift, drop: o.roofW * 0.4, thickness: 0.11 }, o.x, roofY, o.z);
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
  // Viền đá bao sân chầu từ cấp 2
  if (level >= 2) {
    for (const sd of [-1, 1]) {
      p.box(4.86, 0.04, 0.08, C.rockDark, 0, 0.045, sd * 2.4);
      p.box(0.08, 0.04, 4.86, C.rockDark, sd * 2.4, 0.045, 0);
    }
  }

  if (level < 4) {
    // Chưa có rào: bốn cọc mốc tre buộc vải đỏ ở bốn góc đánh dấu đất của Điện.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        p.cyl(0.045, 0.055, 0.8, C.bamboo, sx * 2.3, 0.4, sz * 2.3, undefined, 6);
        p.cyl(0.058, 0.058, 0.04, C.bronze, sx * 2.3, 0.76, sz * 2.3, undefined, 6);
        m.band.box(0.05, 0.24, 0.16, C.red, sx * 2.3, 0.64, sz * 2.3 + 0.08);
      }
    }
  }

  // Lối Thần Đạo giữa sân từ thềm ra cổng: đất nện viền gỗ tới cấp 3, lát đá xanh viền đồng/đỏ từ cấp 4.
  const path = L.zone(',');
  const gateZ = L.zone('G');
  const pathZ0 = path.z - path.d / 2;
  const pathZ1 = gateZ.z + gateZ.d / 2 - 0.03;
  if (level < 4) {
    p.box(0.84, 0.035, pathZ1 - pathZ0, C.earth, 0, 0.055, (pathZ0 + pathZ1) / 2);
    for (const sx of [-1, 1]) p.box(0.05, 0.045, pathZ1 - pathZ0, C.woodDark, sx * 0.44, 0.06, (pathZ0 + pathZ1) / 2);
  } else {
    const slabs = 8;
    const len = (pathZ1 - pathZ0) / slabs;
    for (let i = 0; i < slabs; i++) {
      const sz = pathZ0 + len * (i + 0.5);
      p.box(0.92, 0.055, len - 0.03, i % 2 ? C.rock : C.rockDark, 0, 0.065, sz);
      p.box(0.42, 0.06, len - 0.06, C.bronze, 0, 0.066, sz);
    }
    for (const sx of [-1, 1]) {
      p.box(0.07, 0.07, pathZ1 - pathZ0, level >= 6 ? C.gold : C.red, sx * 0.49, 0.07, (pathZ0 + pathZ1) / 2);
    }
  }

  // Nhà chính lùi về sau, bề thế uy nghiêm.
  const hallW = 3.25 * s;
  const hallD = 1.85 * s;
  const hallZ = -1.3;
  const platW = hallW + 0.14;
  const platFront = hallZ + hallD / 2 + 0.14;
  if (level >= 4) {
    // Nền đất đắp viền đá chạm hoa văn dưới nhà chính; bốn góc có trụ đá đầu đồng; thềm đá ba bậc có thành bậc chạm Giao Long.
    const platD = platFront + 2.45;
    const platCenterZ = platFront - platD / 2;
    p.box(platW, base, platD, C.earth, 0, base / 2, platCenterZ);
    m.band.box(platW + 0.02, base * 0.55, platD + 0.02, C.rockDark, 0, base * 0.52, platCenterZ);
    p.box(platW + 0.08, 0.08, platD + 0.06, C.rock, 0, base, platCenterZ);
    for (const sx of [-1, 1]) {
      for (const sz of [platFront, platFront - platD]) {
        p.box(0.16, base + 0.18, 0.16, C.rockDark, sx * (platW / 2), (base + 0.18) / 2, sz);
        p.sphere(0.075, level >= 8 ? C.gold : C.bronze, sx * (platW / 2), base + 0.22, sz, [1, 1.15, 1], 7);
      }
    }
    const stepW = level >= 8 ? 2.0 : 1.12;
    for (const sx of [-1, 1]) {
      const w = (platW - stepW) / 2;
      p.box(w, base * 0.52, 0.42, C.rock, sx * (stepW / 2 + w / 2), base * 0.26, platFront + 0.2);
      p.box(w + 0.02, 0.05, 0.44, C.rockDark, sx * (stepW / 2 + w / 2), base * 0.52, platFront + 0.2);
    }
    for (let i = 0; i < 3; i++) {
      const h = base - i * 0.14;
      p.box(stepW, h, 0.22, i % 2 && level >= 8 ? C.rockDark : C.rock, 0, h / 2, platFront + 0.1 + i * 0.2);
      p.box(stepW * 0.55, h + 0.01, 0.22, C.red, 0, h / 2, platFront + 0.1 + i * 0.2);
    }
    // Đôi thành bậc đá chạm Rồng / Giao Long uốn bậc hai bên thềm chầu
    for (const sx of [-1, 1]) {
      const bx = sx * (stepW / 2 + 0.06);
      rod(p, [bx, base + 0.12, platFront + 0.02], [bx, 0.16, platFront + 0.58], 0.055, C.rockDark, 6);
      p.box(0.12, 0.22, 0.16, C.rockDark, bx, 0.14, platFront + 0.62);
      p.sphere(0.065, level >= 6 ? C.gold : C.bronze, bx, 0.28, platFront + 0.64, [0.9, 1.1, 1.25], 7);
    }
    // Đôi Đỉnh Đồng 3 chân (Lư hương hoàng cung) đặt đối xứng hai bên trước thềm
    for (const sx of [-1, 1]) {
      royalCenser(m, sx * (stepW / 2 + 0.42), 0.05, platFront + 0.52, level >= 7 ? 1.12 : 0.95);
    }
  }
  if (up) {
    // Cấp 6–8: nền đá thứ hai dưới nhà chính, cao dần; cấp 8 viền đồng vàng.
    p.box(hallW + 0.22, terrace, hallD + 0.32, C.rock, 0, base + terrace / 2, hallZ);
    p.box(hallW + 0.26, 0.06, hallD + 0.36, C.rockDark, 0, base + terrace, hallZ);
    if (level >= 8) {
      for (const sz of [-1, 1]) p.box(hallW + 0.3, 0.075, 0.075, C.gold, 0, base + terrace + 0.015, hallZ + (sz * (hallD + 0.36)) / 2);
      for (const sx of [-1, 1]) p.box(0.075, 0.075, hallD + 0.4, C.gold, (sx * (hallW + 0.26)) / 2, base + terrace + 0.015, hallZ);
    }
  }
  const floor = base + terrace;
  const hall = {
    x: 0,
    z: hallZ,
    w: hallW,
    d: hallD,
    floor,
    postH: 1.2 * s + floor + 0.12 * up,
    roofL: Math.min(hallW + 1.3 * s, 4.9),
    roofW: Math.min(hallD + 0.4 + 0.06 * up, 2 * (hallZ + 2.48)),
    lift: 1.05 * s + 0.15 * up,
    roof,
    level,
  };
  royalPalaceHall(m, hall);

  // Cầu thang gỗ lim dẫn lên sàn Chính Điện có dầm cốn thang sơn đỏ & tay vịn bịt đồng
  const rungs = 4 + up;
  const ladderTop = hallZ + hallD / 2;
  const ladderRun = 0.46;
  for (let i = 0; i < rungs; i++) {
    const t = i / (rungs - 1);
    p.box(0.56, 0.06, 0.18, C.woodDark, 0, hall.postH - 0.14 - t * (hall.postH - floor - 0.24), ladderTop + 0.05 + t * ladderRun);
  }
  for (const sx of [-1, 1]) {
    const lx = sx * 0.3;
    rod(p, [lx, hall.postH + 0.18, ladderTop], [lx, floor + 0.16, ladderTop + ladderRun + 0.08], 0.032, C.red, 5);
    p.cyl(0.04, 0.045, 0.28, C.woodDark, lx, floor + 0.14, ladderTop + ladderRun + 0.08, undefined, 6);
    p.sphere(0.052, C.gold, lx, floor + 0.3, ladderTop + ladderRun + 0.08, [1, 1.15, 1], 6);
  }
  const roofTop = hall.postH + 0.72 + hall.roofW * 0.4 + hall.lift;

  if (level >= 2) {
    // Chim đồng hai đầu nóc; cờ đại hồng kỳ hai bên lối; trống đồng đặt trên giá chạm khắc.
    bird(m, hall.roofL / 2 - 0.1, roofTop + 0.05, hallZ, 1, 1.15);
    bird(m, -hall.roofL / 2 + 0.1, roofTop + 0.05, hallZ, -1, 1.15);
    for (const f of L.groups('2')) banner(m, f.x - 0.2, f.z, level >= 6 ? 2.75 : 2.45, C.red);
    const drums = L.groups('D');
    const big = level >= 5;
    for (const d of big ? drums : drums.slice(1)) {
      // Giá gỗ chạm sơn đỏ bịt đồng đặt trống đồng chầu
      for (const sx of [-1, 1]) {
        p.box(0.07, 0.3, 0.08, C.red, d.x + sx * 0.32, 0.15, d.z);
        p.box(0.09, 0.05, 0.12, C.bronze, d.x + sx * 0.32, 0.3, d.z);
      }
      p.box(0.72, 0.065, 0.14, C.woodDark, d.x, 0.28, d.z);
      drum(m, d.x, d.z, big ? 1.08 : 0.88, 0.31);
    }
  }
  if (level >= 3) {
    // Đông Phối Điện (chái nhà bên phải), mái thuyền quay ngang có chim Lạc trên nóc.
    const Cz = L.zone('C');
    const rPost = 0.85 * s + 0.2 * up;
    stiltHall(m, { x: Cz.x + 0.07, z: Cz.z, w: 0.78, d: 1.32, postH: rPost, roofL: 1.64, roofW: 1.16, lift: 0.38 + 0.08 * up, ry: Math.PI / 2, roof });
    bird(m, Cz.x + 0.07, rPost + 0.68 + 1.16 * 0.4 + 0.38 + 0.08 * up, Cz.z + 0.72, 1, 0.55);
  }
  if (level >= 4) {
    // Hàng rào cột chạm quanh móng, Cổng Nghi Môn Tứ Trụ có 2 tầng mái thuyền giữa mặt trước.
    postFence(m, 2.45, 1.3);
    const G = L.zone('G');
    const gz = G.z + 0.15;
    // 2 cột trụ chính & 2 cột trụ biểu phụ của Cổng Nghi Môn
    for (const sx of [-1, 1]) {
      p.cyl(0.095, 0.115, 0.12, C.rockDark, sx * 0.56, 0.06, gz, undefined, 8);
      p.cyl(0.072, 0.085, 1.52, C.red, sx * 0.56, 0.78, gz, undefined, 8);
      p.cyl(0.092, 0.092, 0.07, C.gold, sx * 0.56, 1.12, gz, undefined, 8);
      // Trụ biểu phụ hai bên cổng
      p.cyl(0.055, 0.065, 1.18, C.woodDark, sx * 0.92, 0.59, gz, undefined, 6);
      p.sphere(0.075, C.bronze, sx * 0.92, 1.22, gz, [1, 1.2, 1], 6);
    }
    p.box(1.96, 0.09, 0.14, C.woodDark, 0, 1.08, gz);
    p.box(1.48, 0.11, 0.16, C.red, 0, 1.48, gz);
    // Bảng Hoành Phi Cổng Điện viền vàng
    p.box(0.82, 0.26, 0.07, C.gold, 0, 1.3, gz + 0.06);
    m.band.box(0.74, 0.2, 0.08, C.red, 0, 1.3, gz + 0.065);
    boatRoof(m, roof, { length: 1.92, width: 0.66, lift: 0.26, drop: 0.22, thickness: 0.055 }, 0, 1.72, gz);
    if (level >= 6) {
      boatRoof(m, roof, { length: 1.22, width: 0.48, lift: 0.2, drop: 0.16, thickness: 0.045 }, 0, 2.02, gz, 0, true);
    }
    if (level >= 8) {
      bird(m, 0.86, 1.98, gz, 1, 0.5);
      bird(m, -0.86, 1.98, gz, -1, 0.5);
    }
  }
  if (level >= 5) {
    // Mái tầng hai trên nóc Chính Điện, cổ diêm sơn đỏ chạm hoa văn, sống mái mạ đồng.
    const y2 = hall.postH + 0.72 + hall.roofW * 0.4 + 0.66 + 0.1 * up;
    m.band.box(hallW * 0.62, 0.28, hallD * 0.52, C.red, 0, y2 - 0.32, hallZ);
    boatRoof(m, roof, { length: hallW * 0.82, width: 1.38 + 0.08 * up, lift: 0.72 + 0.1 * up, drop: 0.5, thickness: 0.085 }, 0, y2, hallZ);
    if (roof.trim === null) p.box(hallW * 0.7, 0.07, 0.14, C.bronzeLight, 0, y2 + 0.04, hallZ);
  }
  if (level >= 6) {
    // Hai lầu trống đồng ở hai góc trước sân.
    for (const t of L.groups('L')) drumTower(m, Math.sign(t.x) * 2.1, t.z, 0, roof, level >= 8);
    // Lan can con tiện sơn đỏ thếp vàng quanh hiên nhà chính, chừa lối cửa giữa.
    const fy = hall.postH + 0.17;
    const fz = hallZ + hallD / 2 - 0.03;
    for (const sx of [-1, 1]) {
      m.band.box(hallW / 2 - 0.35, 0.22, 0.055, C.red, sx * (hallW / 4 + 0.17), fy, fz);
      p.box(hallW / 2 - 0.33, 0.04, 0.07, C.gold, sx * (hallW / 4 + 0.17), fy + 0.11, fz);
      m.band.box(0.055, 0.22, hallD - 0.1, C.red, sx * (hallW / 2 - 0.03), fy, hallZ);
      p.box(0.07, 0.04, hallD - 0.08, C.gold, sx * (hallW / 2 - 0.03), fy + 0.11, hallZ);
    }
  }
  if (level >= 7) {
    // Tây Phối Điện (chái nhà bên trái) cân xứng hai bên.
    const cz = L.zone('c');
    const lPost = 0.85 * s + 0.2 * up;
    stiltHall(m, { x: cz.x - 0.07, z: cz.z, w: 0.78, d: 1.32, postH: lPost, roofL: 1.64, roofW: 1.16, lift: 0.38 + 0.08 * up, ry: Math.PI / 2, roof });
    bird(m, cz.x - 0.07, lPost + 0.68 + 1.16 * 0.4 + 0.38 + 0.08 * up, cz.z + 0.72, -1, 0.55);
    // Hai cột biểu Chim Lạc ở hai góc sau: bệ đá chạm, cột gỗ lim đai đồng vàng, Chim Lạc dang cánh trên đỉnh.
    for (const c of L.groups('7')) {
      p.cyl(0.14, 0.17, 0.18, C.rockDark, c.x, 0.09, c.z, undefined, 8);
      p.cyl(0.075, 0.095, 3.2, C.woodDark, c.x, 1.6, c.z, undefined, 8);
      for (const y of [1.0, 2.0, 2.9]) p.cyl(0.105, 0.105, 0.085, C.gold, c.x, y, c.z, undefined, 8);
      birdSpread(m, c.x, 3.2, c.z, 0.82);
    }
    // Mái tầng ba trên cùng, đôi chim đồng lớn đậu hai đầu nóc.
    const y3 = hall.postH + 0.72 + hall.roofW * 0.4 + 1.28 + 0.2 * up;
    m.band.box(hallW * 0.44, 0.24, hallD * 0.38, C.red, 0, y3 - 0.26, hallZ);
    boatRoof(m, roof, { length: hallW * 0.62, width: 0.98 + 0.06 * up, lift: 0.58 + 0.08 * up, drop: 0.38, thickness: 0.075 }, 0, y3, hallZ, 0, true);
    if (roof.trim === null) p.box(hallW * 0.5, 0.06, 0.12, C.bronzeLight, 0, y3 + 0.03, hallZ);
    const top = y3 + 0.56;
    bird(m, hallW * 0.3, top, hallZ, 1, 1.55);
    bird(m, -hallW * 0.3, top, hallZ, -1, 1.55);
    if (level >= 8) {
      // Bệ Mặt Trời & Trống Đồng Ngọc Lũ tỏa hào quang vàng trên đỉnh nóc Chính Điện.
      drum(m, 0, hallZ, 0.64, top - 0.18);
      p.cyl(0.055, 0.08, 0.26, C.gold, 0, top - 0.12, hallZ, undefined, 8);
      m.glow.sphere(0.085, 0xffe066, 0, top + 0.08, hallZ, [1.2, 1.2, 0.5], 8);
    }
  }
  return m.group();
}


export const DIEN: CongTrinh = { tiles: 5, make: makeDien, spots: dienSpots, view: { half: 5.4, lookY: 1.9, px: 44 } };
