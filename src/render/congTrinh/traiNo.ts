// Trại nỏ 4×4 (chương 4, bản lưu 26): nơi ở của lính nỏ, cùng kiểu khuôn viên với doanh trại: rào cọc vót nhọn, lầu
// cổng giữa mặt trước, lán mái ngói đỏ cam như ngói thành Cổ Loa ở góc sau bên trái, dưới lán giá treo nỏ; nỏ lớn lẫy
// đồng trên giá; bia gỗ vuông ở mép trái, một lính nỏ quỳ một gối nhắm bia; ụ đất tập lên dây ở góc trước bên phải, một
// lính nỏ đứng trên ụ lên dây. Dựng một lần. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { TILE, TILE_DARK, banner, boatRoof } from '../buildings';
import { Lot } from '../lot';
import { makeCrossbowStand } from '../models';
import { C } from '../palette';
import { ToonModel } from '../toon';
import type { CongTrinh, LotOpts } from './chung';
import { gopLinh, khuonVien, noiOSpots } from './trai';

export const TRAI_NO_LOT = new Lot(4, [
  'NNNNN.f.',
  'NNNNN...',
  '......k.',
  'B....s..',
  '........',
  '.....uu.',
  '...,,uu.',
  '...CC...',
]);

/**
 * Lán mái ngói (gốc ở tâm khối `N`): sáu cột, sàn đất nện, mái thuyền lợp ngói; dưới mái dọc vách sau là giá gác bốn
 * cây nỏ, báng chúc xuống, cánh nỏ ngang.
 */
function lanNgoi(m: ToonModel, x: number, z: number, w: number, d: number): void {
  const p = m.plain;
  const postH = 1.15;
  for (const px of [x - w / 2 + 0.1, x, x + w / 2 - 0.1]) {
    for (const pz of [z - d / 2 + 0.08, z + d / 2 - 0.08]) p.cyl(0.05, 0.06, postH, C.woodDark, px, postH / 2, pz, undefined, 6);
  }
  p.box(w - 0.1, 0.06, d - 0.1, C.earthDark, x, 0.08, z);
  const width = d + 0.4;
  const drop = width * 0.36;
  boatRoof(m, { main: TILE, dark: TILE_DARK, trim: null }, { length: w + 0.35, width, lift: 0.2, drop, thickness: 0.07 }, x, postH + drop - 0.04, z);
  // Giá treo nỏ dọc vách sau.
  const rz = z - d / 2 + 0.16;
  p.box(w - 0.4, 0.045, 0.05, C.woodDark, x, 0.76, rz);
  for (let i = 0; i < 4; i++) {
    const nx = x - 0.75 + i * 0.5;
    p.box(0.05, 0.05, 0.4, C.woodDark, nx, 0.64, rz + 0.08, [0.6, 0, 0]);
    p.add(new THREE.TorusGeometry(0.17, 0.014, 3, 8, Math.PI), C.wood, nx, 0.7, rz + 0.17, [0.6, 0, 0]);
  }
}

/** Bia gỗ vuông dựng trên hai cột, mặt vẽ vòng tròn đỏ trắng quay sang phải (+x), mấy mũi tên nỏ găm vào. */
function biaGo(m: ToonModel, x: number, z: number): void {
  const p = m.plain;
  for (const s of [-1, 1]) p.cyl(0.03, 0.035, 0.85, C.woodDark, x - 0.04, 0.43, z + s * 0.24, undefined, 5);
  p.box(0.05, 0.58, 0.58, C.woodLight, x, 0.66, z);
  m.band.cyl(0.2, 0.2, 0.02, C.cream, x + 0.03, 0.66, z, [0, 0, Math.PI / 2], 14);
  m.band.cyl(0.11, 0.11, 0.022, C.red, x + 0.04, 0.66, z, [0, 0, Math.PI / 2], 12);
  for (const [dy, dz] of [[0.05, -0.06], [-0.08, 0.1], [0.14, 0.12]] as const) p.cyl(0.008, 0.008, 0.26, C.iron, x + 0.15, 0.66 + dy, z + dz, [0, 0, Math.PI / 2], 3);
}

/** Nỏ lớn trên giá thu còn chừng này (dáng gốc cánh nỏ dài 1,4, quá to cho sân 4×4). */
const NO_LON = 0.55;

/** `tier`: bậc binh khí đã rèn của lính nỏ. */
export function makeTraiNo(tier = 0): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = TRAI_NO_LOT;
  khuonVien(m);

  const N = L.zone('N');
  lanNgoi(m, N.x - 0.05, N.z, 2.3, 0.9);
  const f = L.zone('f');
  banner(m, f.x, f.z, 2.2, C.red);

  // Trường bắn ngang sân: bia gỗ ở mép trái, hòm tên nỏ cạnh chỗ lính quỳ.
  p.box(3.6, 0.02, 1.0, C.earth, 0, 0.06, L.zone('B').z);
  const B = L.zone('B');
  biaGo(m, B.x + 0.05, B.z);
  const s = L.zone('s');
  p.box(0.3, 0.14, 0.2, C.wood, s.x + 0.15, 0.13, s.z + 0.45);
  for (let i = 0; i < 4; i++) p.cyl(0.008, 0.008, 0.32, C.iron, s.x + 0.06 + i * 0.06, 0.24, s.z + 0.45, [Math.PI / 2, 0, 0], 3);

  // Ụ đất tập lên dây: nền đất đắp viền đá thấp, mặt đất nện.
  const u = L.zone('u');
  p.box(u.w - 0.1, 0.06, u.d - 0.1, C.rock, u.x, 0.03, u.z);
  p.box(u.w - 0.16, 0.16, u.d - 0.16, C.earthDark, u.x, 0.1, u.z);
  p.box(u.w - 0.2, 0.02, u.d - 0.2, C.earth, u.x, 0.19, u.z);

  const out = m.group();
  // Nỏ lớn lẫy đồng trên giá cạnh lán, thu nhỏ cho vừa sân, chĩa ra trước.
  const k = L.zone('k');
  const no = makeCrossbowStand();
  no.scale.setScalar(NO_LON);
  no.position.set(k.x + 0.1, 0.05, k.z - 0.05);
  no.rotation.y = -0.3;
  out.add(no);
  // Một lính quỳ một gối nhắm bia; một lính đứng trên ụ lên dây, quay ra sân.
  out.add(
    gopLinh([
      { kind: 'no', tier, x: s.x, z: s.z, ry: -Math.PI / 2, act: { act: 'fight', strike: 0.9 } },
      { kind: 'no', tier, x: u.x, z: u.z, y: 0.15, ry: 0.35, act: { act: 'fight', strike: 0.45 } },
    ]),
  );
  return out;
}

export const TRAI_NO: CongTrinh = { tiles: 4, make: (_l: number, o: LotOpts = {}) => makeTraiNo(o.tier), spots: noiOSpots, view: { half: 3.3, lookY: 0.9, px: 64 } };
