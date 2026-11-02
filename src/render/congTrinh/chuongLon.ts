// Chuồng lợn 3×3 (Hội Tết): chuồng ở góc sau bên trái (cấp 1 ổ rơm, cấp 2 chuồng mái tranh, cấp 3 chuồng sàn gỗ có
// cầu dốc), sân rào tre rộng cho lợn chạy, máng gỗ bên phải, vũng bùn góc trước (cấp 3). Hai lợn ỉ ở cấp 1, thêm đàn
// lợn con ở cấp 2, bốn lợn lớn ở cấp 3. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { MUD, bambooFence, makePig } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { saddleRoof } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, rod, yard } from './chung';

export const CHUONG_LON_LOT = new Lot(3, [
  'CCCC..',
  'CCCC..',
  '....mm',
  '......',
  'bbb...',
  'bbb,,.',
]);

/** Nửa cạnh rào tre quanh sân: sát mép móng mà không chìa ra ngoài. */
const RAO = 1.42;
/** Bùn vũng lợn đằm: sẫm hơn đất sân cho dễ thấy. */
const BUN = 0x4a3220;
/** Lợn lớn, lợn con giữ cỡ như dáng cũ. */
const LON = 1.3;
const CON = 0.58;

/** Người chăn lợn: một người đổ cám bên máng, một người ở sân trước. */
export function chuongLonSpots(): LotSpot[] {
  const m = CHUONG_LON_LOT.zone('m');
  return [
    { job: 'nong', x: m.x + 0.2, y: 0.06, z: m.z - 0.42, ry: 0.3 },
    { job: 'nong', x: 0.35, y: 0.06, z: 0.55, ry: -0.5 },
  ];
}

/** Ổ rơm lót chuồng: tấm rơm phẳng, vài búi rơm nhô lên. */
function oRom(p: ToonModel['plain'], x: number, y: number, z: number, w: number, d: number): void {
  p.box(w, 0.04, d, C.thatchDark, x, y + 0.02, z);
  for (const [dx, dz, s] of [[-0.35, -0.12, 1], [0.2, 0.1, 0.8], [0.5, -0.15, 0.9], [-0.1, 0.18, 0.7]] as const) {
    p.sphere(0.12 * s, C.thatch, x + dx * (w / 1.6), y + 0.05, z + dz * (d / 0.8), [1.4, 0.45, 1], 7);
  }
}

/** Máng gỗ đựng cám kê trên hai khúc gỗ, cám trong máng. */
function mangGo(p: ToonModel['plain'], x: number, z: number): void {
  p.box(0.74, 0.13, 0.2, C.wood, x, 0.13, z);
  p.box(0.66, 0.03, 0.12, 0x8a7a50, x, 0.19, z);
  for (const s of [-1, 1]) p.cyl(0.05, 0.05, 0.26, C.woodDark, x + s * 0.27, 0.05, z, [Math.PI / 2, 0, 0], 6);
}

export function makeChuongLon(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = CHUONG_LON_LOT;
  yard(m, 3);
  const gate = L.zone(',');
  bambooFence(p, RAO, 0.4, gate.x - gate.w / 2 - 0.02, gate.x + gate.w / 2 + 0.02);
  // Hai cọc cổng to hơn rào, buộc lạt.
  for (const s of [-1, 1]) p.cyl(0.04, 0.045, 0.56, C.woodDark, gate.x + (s * gate.w) / 2, 0.28, RAO, undefined, 6);
  p.box(gate.w * 0.8, 0.03, gate.d, C.earth, gate.x, 0.055, gate.z);

  // Chuồng ở góc sau bên trái.
  const Cz = L.zone('C');
  const floorY = level >= 3 ? 0.36 : 0.05;
  if (level >= 2) {
    // Chuồng mái tranh trên bốn cột, mái che trọn khối chuồng; cấp 3 dựng sàn gỗ cao, vách ván sau và bên trái.
    const roofY = level >= 3 ? 1.25 : 0.95;
    const w = Cz.w - 0.3;
    const d = Cz.d - 0.2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.cyl(0.04, 0.045, roofY, C.woodDark, Cz.x + (sx * w) / 2, roofY / 2, Cz.z + (sz * d) / 2, undefined, 5);
    m.band.add(saddleRoof({ length: w + 0.35, width: d + 0.4, lift: 0.16, drop: 0.3, thickness: 0.05 }), C.thatch, Cz.x, roofY + 0.24, Cz.z);
    if (level >= 3) {
      p.box(w, 0.06, d, C.wood, Cz.x, floorY, Cz.z);
      for (let i = 0; i < 7; i++) p.box(0.02, 0.01, d, C.woodDark, Cz.x - w / 2 + 0.12 + i * ((w - 0.24) / 6), floorY + 0.035, Cz.z);
      p.box(w, 0.42, 0.04, C.woodLight, Cz.x, floorY + 0.24, Cz.z - d / 2);
      p.box(0.04, 0.42, d, C.woodLight, Cz.x - w / 2, floorY + 0.24, Cz.z);
      // Cầu dốc ván gỗ từ sàn xuống sân, nẹp ngang cho lợn bám chân.
      const top: [number, number, number] = [Cz.x + w / 2 - 0.2, floorY + 0.02, Cz.z + d / 2 - 0.05];
      const foot: [number, number, number] = [Cz.x + w / 2 - 0.2, 0.06, Cz.z + d / 2 + 0.55];
      const len = Math.hypot(foot[1] - top[1], foot[2] - top[2]);
      const tilt = Math.atan2(top[1] - foot[1], foot[2] - top[2]);
      p.box(0.34, 0.04, len, C.woodLight, top[0], (top[1] + foot[1]) / 2, (top[2] + foot[2]) / 2, [tilt, 0, 0]);
      for (let i = 1; i < 4; i++) {
        const t = i / 4;
        p.box(0.34, 0.03, 0.03, C.woodDark, top[0], top[1] + (foot[1] - top[1]) * t + 0.03, top[2] + (foot[2] - top[2]) * t, [tilt, 0, 0]);
      }
      // Cột kê sàn.
      for (const sx of [-0.5, 0, 0.5]) rod(p, [Cz.x + sx * w, 0, Cz.z + d / 2 - 0.05], [Cz.x + sx * w, floorY, Cz.z + d / 2 - 0.05], 0.035, C.woodDark);
    }
  }
  oRom(p, Cz.x, floorY, Cz.z, Cz.w - 0.5, Cz.d - 0.35);

  // Máng gỗ bên phải; một lợn chúi mõm ăn.
  const mg = L.zone('m');
  mangGo(p, mg.x, mg.z);

  // Lợn: [x, z, hướng, cỡ].
  const pigs: [number, number, number, number][] = [
    [mg.x - 0.1, mg.z + 0.36, Math.PI, LON],
    [-0.35, 0.15, 1.2, LON],
  ];
  if (level >= 2) pigs.push([-0.85, 0.42, 0.8, CON], [-0.6, 0.6, 0.3, CON * 0.95], [-0.3, 0.42, -0.5, CON], [0.15, 0.7, 2.2, CON * 0.95]);
  if (level >= 3) {
    // Vũng bùn góc trước bên trái, một lợn đằm bùn; một lợn ở chân cầu dốc.
    const b = L.zone('b');
    // Bùn sẫm, mép bùn vun cao, vài vũng nước đọng ánh trời.
    p.add(new THREE.CylinderGeometry(0.6, 0.6, 0.03, 18), BUN, b.x, 0.065, b.z + 0.05, [0, 0, 0], [1.1, 1, 0.75]);
    p.add(new THREE.TorusGeometry(0.6, 0.035, 4, 20), MUD, b.x, 0.07, b.z + 0.05, [Math.PI / 2, 0, 0], [1.1, 0.75, 1]);
    for (const [dx, dz, r] of [[0.32, -0.12, 0.13], [-0.4, 0.15, 0.1], [0.15, 0.25, 0.08]] as const) p.cyl(r, r, 0.01, C.paddyWater, b.x + dx, 0.085, b.z + 0.05 + dz, undefined, 10);
    pigs.push([b.x - 0.1, b.z + 0.05, -0.4, LON], [0.55, -0.1, -2.4, LON]);
  }
  const g = m.group();
  for (const [x, z, ry, s] of pigs) {
    const pig = makePig(s);
    pig.position.set(x, 0.05, z);
    pig.rotation.y = ry;
    g.add(pig);
  }
  return g;
}

export const CHUONG_LON: CongTrinh = { tiles: 3, make: makeChuongLon, spots: () => chuongLonSpots(), view: { half: 2.4, lookY: 0.6, px: 72 } };
