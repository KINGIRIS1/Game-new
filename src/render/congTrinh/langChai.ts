// Làng chài 3×3: lều chài (cấp 4 nhà sàn) góc sau bên trái, lối giữa ra bờ ván dọc mép nước, vó bè góc trước bên phải
// chìa cần ra sông (giản lược kiểu 2: một mái chính, xem docs/thiet-ke.md mục Giản lược công trình). Bản vẽ ở docs/bo-cuc-cong-trinh.md.
// Mặt trước (+z) quay ra sông như bến: mép móng z = +1,5 là mép nước; vó, đáy và thuyền chìa ra quá mép này.

import type * as THREE from 'three';
import { above5, boatRoof, stiltHall, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import type { ShapeBuilder } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type Dock, type LotSpot, maiGon, rod, yard } from './chung';

export const LANG_CHAI_LOT = new Lot(3, [
  'NNN...',
  'NNN...',
  '..,,..',
  '..,,..',
  '..,,VV',
  '====VV',
]);

/** Bãi cát ven sông. */
const SAND = 0xd9c391;
/** Lối đất nện ra bờ. */
const PATH = 0xbf9f6c;
/** Lưới gai nhuộm củ nâu. */
const NET = 0x8a7656;
/** Mặt bờ ván và cầu ván. */
const DECK_Y = 0.1;
/** Mặt nước dưới chân bờ (tọa độ móng), chừng như chỗ thuyền nổi. */
const WATER = -0.12;

/**
 * Ba ngư dân theo thứ tự có người: quăng chài ở đầu cầu ván (cấp 1), kéo vó trên bè vó (từ cấp 2 có vó), xếp cá lên
 * giàn phơi. Người quăng chài và kéo vó quay mặt ra sông, cũng là phía camera.
 */
export function langChaiSpots(): LotSpot[] {
  return [
    { job: 'nguDan', x: -0.62, y: DECK_Y, z: 1.62, ry: 0.15 },
    { job: 'nguDan', x: 0.78, y: DECK_Y + 0.06, z: 1.18, ry: 0.55 },
    { job: 'nguDan', x: 0.28, y: 0.05, z: -0.45, ry: Math.PI / 2 },
  ];
}

/**
 * Thuyền ngoài sông: thuyền đánh cá bơi vòng quanh chỗ neo trước bờ ván (cấp 1), chiếc thứ hai xa hơn (cấp 3);
 * cấp 8 thêm thuyền lưới lớn có buồm neo ngoài cùng; cấp 10 thêm thuyền đánh cá có buồm cói ngoài xa.
 * Không ra tới luồng thuyền qua lại, không chạm bờ bên kia.
 */
export function langChaiDocks(level: number): Dock[] {
  const out: Dock[] = [{ kind: 'fishing', x: -0.35, z: 2.25, ry: Math.PI / 2, scale: 0.55, span: 0.4 }];
  if (level >= 3) out.push({ kind: 'fishing', x: 0.4, z: 3.05, ry: -Math.PI / 2, scale: 0.55, span: 0.55 });
  if (level >= 8) out.push({ kind: 'trader', x: -0.95, z: 3.55, ry: Math.PI / 2, scale: 0.62 });
  if (level >= 10) out.push({ kind: 'fishing', x: 0.3, z: 3.85, ry: Math.PI / 2, scale: 0.6, span: 0.3, big: true });
  return out;
}

/** Bờ ván dọc mép sông, cọc cắm xuống nước, cầu ván ngắn chìa ra cho thuyền ghé và người quăng chài. */
function boardwalk(p: ShapeBuilder): void {
  const E = LANG_CHAI_LOT.zone('=');
  const z0 = E.z - E.d / 2 + 0.02;
  const z1 = 1.48;
  p.box(E.w - 0.04, 0.07, z1 - z0, C.woodLight, E.x, DECK_Y - 0.035, (z0 + z1) / 2);
  for (const t of [1 / 3, 2 / 3]) p.box(E.w - 0.04, 0.012, 0.015, C.wood, E.x, DECK_Y + 0.001, z0 + t * (z1 - z0));
  for (const x of [-1.35, -0.85, -0.3, 0.35]) p.cyl(0.04, 0.045, 0.62, C.woodDark, x, -0.21, z1 - 0.03, undefined, 5);
  // Cầu ván ra nước.
  p.box(0.36, 0.06, 0.5, C.wood, -0.6, DECK_Y - 0.03, 1.72);
  for (const sx of [-1, 1]) p.cyl(0.035, 0.04, 0.6, C.woodDark, -0.6 + sx * 0.15, -0.2, 1.93, undefined, 5);
}

/**
 * Lều chài mái tranh thấp, lưới treo dưới hiên (cấp 1–3); từ cấp 4 thành nhà sàn ngư dân mái thuyền, cột cao dần ở
 * cấp 6–8, lưới phơi trên lan can sàn.
 */
function home(m: ToonModel, level: number, roof: Roof): void {
  const p = m.plain;
  const N = LANG_CHAI_LOT.zone('N');
  const up = above5(level);
  if (level < 4) {
    const h = 0.55;
    for (const dx of [-0.55, 0.55]) for (const dz of [-0.32, 0.32]) p.cyl(0.04, 0.05, h, C.woodDark, N.x + dx, h / 2, N.z + dz, undefined, 5);
    m.band.box(1.05, 0.42, 0.55, C.thatchDark, N.x, 0.23, N.z - 0.05);
    boatRoof(m, roof, { length: 1.5, width: 1.05, lift: 0.16, drop: 0.34, thickness: 0.05 }, N.x, h + 0.32, N.z);
    return;
  }
  const postH = 0.5 + 0.1 * up;
  stiltHall(m, { x: N.x, z: N.z - 0.05, w: 1.45, d: 0.9, postH, roofL: 1.75, roofW: 1.15, lift: 0.32, roof });
}

/**
 * Vó bè: bè tre sát bờ, cần vó dài chìa ra sông, khung lưới vuông treo ở đầu cần, buông gần mặt nước.
 * `big` (cấp 9): giàn vó lớn: cần dài hơn, lưới rộng hơn, thêm cột chống thứ hai và hòn đá đối trọng ở gốc cần.
 */
function liftNet(p: ShapeBuilder, big = false): void {
  const V = LANG_CHAI_LOT.zone('V');
  // Bè tre ngồi kéo vó.
  p.box(0.62, 0.06, 0.46, C.bamboo, V.x - 0.05, DECK_Y + 0.03, V.z + 0.2);
  for (let i = 0; i < 4; i++) p.box(0.62, 0.012, 0.015, 0x6a8a3a, V.x - 0.05, DECK_Y + 0.065, V.z + 0.02 + i * 0.12);
  // Cột chống và cần vó qua đầu cột.
  const post: [number, number, number] = [V.x + 0.12, 0.62, V.z + 0.42];
  rod(p, [V.x + 0.12, -0.3, V.z + 0.42], post, 0.035, C.woodDark, 5);
  const butt: [number, number, number] = [V.x - 0.12, 0.32, V.z + 0.05];
  const tip: [number, number, number] = big ? [V.x + 0.24, 1.2, V.z + 1.78] : [V.x + 0.2, 0.95, V.z + 1.45];
  rod(p, butt, tip, big ? 0.034 : 0.028, C.bamboo, 5);
  if (big) {
    rod(p, [V.x - 0.12, -0.3, V.z + 0.42], [V.x + 0.12, 0.66, V.z + 0.42], 0.03, C.woodDark, 5);
    p.box(0.2, 0.04, 0.05, C.woodDark, V.x, 0.64, V.z + 0.42);
    p.sphere(0.1, C.rockDark, butt[0], butt[1] - 0.05, butt[2] - 0.02, [1.1, 0.85, 1], 7);
  }
  // Khung vó: hai thanh tre bắt chéo cong, lưới vuông, bốn dây từ đầu cần xuống bốn góc.
  const cx = tip[0];
  const cz = tip[2];
  const y = WATER + 0.1;
  const h = big ? 0.5 : 0.36;
  for (const [ax, az] of [[-1, -1], [-1, 1]] as const) rod(p, [cx + ax * h, y + 0.04, cz + az * h], [cx - ax * h, y + 0.04, cz - az * h], 0.013, C.bamboo, 4);
  p.box(2 * h * 0.9, 0.008, 2 * h * 0.9, NET, cx, y, cz, [0, Math.PI / 4, 0]);
  for (const [ax, az] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) rod(p, tip, [cx + ax * h, y + 0.04, cz + az * h], 0.005, C.cream, 3);
}

export function makeLangChai(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = LANG_CHAI_LOT;
  const roof = maiGon(level);

  yard(m, 3, SAND);
  const path = L.zone(',');
  p.box(path.w - 0.04, 0.02, path.d - 0.03, PATH, path.x, 0.055, path.z);

  boardwalk(p);
  home(m, level, roof);
  // Vó bè góc trước bên phải chìa cần ra sông (cấp 2).
  if (level >= 2) liftNet(p, level >= 9);
  return m.group();
}

export const LANG_CHAI: CongTrinh = { tiles: 3, make: makeLangChai, spots: langChaiSpots, view: { half: 3.6, lookY: 0.5, px: 56 }, docks: langChaiDocks };
