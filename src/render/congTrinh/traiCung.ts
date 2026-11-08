// Trại cung 4×4 (bản lưu 26): nơi ở của cung thủ, cùng kiểu khuôn viên với doanh trại: rào cọc vót nhọn, lầu cổng
// giữa mặt trước, lán một mái ở góc sau bên trái, trường bắn chạy ngang sân: hai cung thủ đứng sau vạch bắn bên phải bắn
// sang hai bia rơm ở mép trái. Dựng một lần, mái tranh. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { archeryTarget, banner } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel } from '../toon';
import type { CongTrinh, LotOpts } from './chung';
import { gopLinh, khuonVien, noiOSpots, quiver } from './trai';

export const TRAI_CUNG_LOT = new Lot(4, [
  'LLLLL.f.',
  'LLLLL...',
  '.r......',
  'B....vc.',
  '.....v..',
  'b....vc.',
  '...,,...',
  '...CC...',
]);

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

/** `tier`: bậc binh khí đã rèn của cung thủ (mũi tên sắt, bao tên da, cung sừng). */
export function makeTraiCung(tier = 0): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = TRAI_CUNG_LOT;
  khuonVien(m);

  // Lán một mái góc sau bên trái, dài hơn lán 3×3 chừng 70%.
  const Lz = L.zone('L');
  lanMotMai(m, Lz.x - 0.05, -1.85, -0.75, 2.3);

  // Trường bắn: sân đất nện chạy ngang, hai bia rơm ở mép trái quay mặt sang phải, vạch bắn là khúc gỗ nằm dọc trước
  // chỗ cung thủ đứng, bao tên bên cạnh; mấy mũi tên trượt găm xuống đất quanh bia.
  p.box(3.6, 0.02, 1.8, C.earth, 0, 0.06, 0.25);
  const B = L.zone('B');
  const b = L.zone('b');
  archeryTarget(m, B.x + 0.1, B.z, Math.PI / 2);
  archeryTarget(m, b.x + 0.1, b.z, Math.PI / 2);
  for (const [x, z, a] of [[-1.3, 0.3, 0.5], [-1.15, 1.1, -0.4], [-1.45, -0.7, 0.3], [-1.2, 0.05, -0.6], [-1.35, 0.6, 0.2]] as const) {
    p.cyl(0.008, 0.008, 0.3, C.woodLight, x, 0.15, z, [a * 0.6, 0, 0.7], 3);
  }
  const v = L.zone('v');
  p.cyl(0.05, 0.05, v.d + 0.2, C.wood, v.x, 0.1, v.z, [Math.PI / 2, 0, 0], 6);
  const c = L.cells('c');
  quiver(p, c[0].x + 0.4, (c[0].z + c[1].z) / 2);

  // Góc sau bên phải: cờ đỏ cao; trước lán, đống bó rơm làm bia.
  const f = L.zone('f');
  banner(m, f.x, f.z, 2.2, C.red);
  const r = L.zone('r');
  boRom(p, r.x, 0.15, r.z);
  boRom(p, r.x, 0.15, r.z + 0.2);
  boRom(p, r.x + 0.03, 0.32, r.z + 0.1);

  const out = m.group();
  // Hai cung thủ quay sang bia: một người giương cung, một người vừa buông dây.
  out.add(
    gopLinh([
      { kind: 'cung', tier, x: c[0].x, z: c[0].z, ry: -Math.PI / 2, act: { act: 'fight' } },
      { kind: 'cung', tier, x: c[1].x, z: c[1].z, ry: -Math.PI / 2 - 0.08, act: { act: 'fight', strike: 0.35 } },
    ]),
  );
  return out;
}

export const TRAI_CUNG: CongTrinh = { tiles: 4, make: (_l: number, o: LotOpts = {}) => makeTraiCung(o.tier), spots: noiOSpots, view: { half: 3.3, lookY: 0.9, px: 64 } };
