// Trại cung 3×3: nơi ở của cung thủ. Lán một mái góc sau bên phải, trường bắn chạy ngang hết móng: cung thủ đứng
// bên phải bắn sang hai bia rơm ở mép trái. Rào cọc vót nhọn như doanh trại. Dựng một lần, mái tranh.
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { archeryTarget, banner } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { bakeSoldier } from '../soldier';
import { ToonModel } from '../toon';
import { type CongTrinh, yard } from './chung';
import { LINH, RAO, raoCocNhon } from './traiGiao';

export const TRAI_CUNG_LOT = new Lot(3, [
  'rf.LLL',
  '...LLL',
  'B..LLL',
  '.....c',
  'b....c',
  '..,,..',
]);

/** Bao tên đan dựng đứng, mấy mũi tên thò lên. */
function quiver(p: ToonModel['plain'], x: number, z: number, y = 0.05): void {
  p.cyl(0.055, 0.048, 0.32, C.earthDark, x, y + 0.16, z, undefined, 7);
  p.cyl(0.058, 0.058, 0.04, C.red, x, y + 0.26, z, undefined, 7);
  for (const d of [-0.022, 0.022]) p.cyl(0.007, 0.007, 0.2, C.woodLight, x + d, y + 0.4, z + d * 0.5, undefined, 3);
}

/** Lán một mái: cột sau cao tựa vách phên, cột trước thấp, mái tranh dốc ra trước; giá cung, bao tên dưới mái. */
function lanMotMai(m: ToonModel, x: number, z0: number, z1: number, w: number): void {
  const p = m.plain;
  const back = 1.55;
  const front = 1.0;
  const xs = [x - w / 2 + 0.1, x, x + w / 2 - 0.1];
  for (const px of xs) {
    p.cyl(0.045, 0.055, back, C.woodDark, px, back / 2, z0, undefined, 6);
    p.cyl(0.045, 0.055, front, C.woodDark, px, front / 2, z1, undefined, 6);
  }
  // Xà dọc hai đầu cột, mái tranh dốc ra trước.
  p.box(w - 0.1, 0.06, 0.06, C.wood, x, back - 0.03, z0);
  p.box(w - 0.1, 0.06, 0.06, C.wood, x, front - 0.03, z1);
  const run = z1 - z0;
  const tilt = Math.atan2(back - front, run);
  const len = Math.hypot(back - front, run) + 0.3;
  m.band.box(w + 0.04, 0.08, len, C.thatch, x, (back + front) / 2 + 0.06, (z0 + z1) / 2 + 0.02, [tilt, 0, 0]);
  p.box(w + 0.06, 0.05, 0.05, C.thatchDark, x, back + 0.12, z0 - 0.12);
  // Vách phên sau (dưới mái nên khuất); giá cung đứng và bao tên ngay dưới mép mái trước, ra chỗ dễ thấy.
  p.box(w - 0.14, 0.95, 0.04, C.woodLight, x, 0.52, z0 + 0.02);
  p.box(w - 0.3, 0.02, run - 0.35, C.cream, x - 0.05, 0.07, (z0 + z1) / 2 - 0.08);
  const rackZ = z1 - 0.1;
  const rx = x - 0.12;
  for (const s of [-1, 1]) p.cyl(0.025, 0.03, 0.72, C.woodDark, rx + s * 0.32, 0.38, rackZ, undefined, 5);
  p.box(0.74, 0.04, 0.04, C.woodDark, rx, 0.7, rackZ);
  for (let i = 0; i < 3; i++) p.add(new THREE.TorusGeometry(0.15, 0.013, 3, 8, Math.PI), C.wood, rx - 0.2 + i * 0.2, 0.55, rackZ + 0.03, [0, 0, -Math.PI / 2]);
  quiver(p, x + 0.38, rackZ - 0.02);
}

/** Bó rơm nằm dọc trục x, có lạt buộc giữa. */
function boRom(p: ToonModel['plain'], x: number, y: number, z: number): void {
  p.cyl(0.1, 0.1, 0.44, C.thatch, x, y, z, [0, 0, Math.PI / 2], 6);
  p.cyl(0.104, 0.104, 0.05, C.thatchDark, x, y, z, [0, 0, Math.PI / 2], 6);
}

export function makeTraiCung(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = TRAI_CUNG_LOT;
  yard(m, 3);
  raoCocNhon(m, RAO, 1.0);
  const path = L.zone(',');
  p.box(0.8, 0.03, 0.62, C.earth, path.x, 0.055, path.z - 0.06);

  // Lán một mái góc sau bên phải, rộng hơn lán cũ chừng 20% theo chiều sâu.
  const Lz = L.zone('L');
  lanMotMai(m, Lz.x - 0.02, -1.28, -0.28, 1.36);

  // Trường bắn: hai bia rơm ở mép trái quay mặt sang phải; vạch bắn là khúc gỗ nằm trước chỗ cung thủ đứng.
  const B = L.zone('B');
  const b = L.zone('b');
  archeryTarget(m, B.x + 0.05, B.z, Math.PI / 2);
  archeryTarget(m, b.x + 0.05, b.z, Math.PI / 2);
  // Mấy mũi tên trượt găm xuống đất quanh bia.
  for (const [x, z, a] of [[-0.95, 0.35, 0.5], [-0.8, 1.05, -0.4], [-1.05, -0.62, 0.3], [-0.85, 0.1, -0.6]] as const) {
    p.cyl(0.008, 0.008, 0.3, C.woodLight, x, 0.15, z, [a * 0.6, 0, 0.7], 3);
  }
  const c = L.zone('c');
  p.cyl(0.05, 0.05, c.d + 0.1, C.wood, c.x - 0.45, 0.1, c.z, [Math.PI / 2, 0, 0], 6);
  quiver(p, c.x + 0.05, c.z - 0.55);

  // Góc sau bên trái: cờ đỏ cao và đống rơm làm bia.
  const f = L.zone('f');
  banner(m, f.x + 0.02, f.z - 0.05, 2.0, C.red);
  const r = L.zone('r');
  boRom(p, r.x + 0.12, 0.15, r.z);
  boRom(p, r.x + 0.12, 0.15, r.z + 0.2);
  boRom(p, r.x + 0.15, 0.32, r.z + 0.1);

  const out = m.group();
  const cung = bakeSoldier('cung', 0, { act: 'fight' });
  cung.scale.setScalar(LINH);
  cung.position.set(c.x - 0.1, 0.05, c.z + 0.05);
  cung.rotation.y = -Math.PI / 2;
  out.add(cung);
  return out;
}

export const TRAI_CUNG: CongTrinh = { tiles: 3, make: () => makeTraiCung(), spots: () => [], view: { half: 2.6, lookY: 0.9, px: 72 } };
