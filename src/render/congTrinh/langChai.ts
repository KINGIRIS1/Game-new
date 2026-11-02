// Làng chài 3×3: lều chài góc sau bên trái, giàn phơi cá bên phải, lối giữa ra bờ ván dọc mép nước, vó bè góc trước
// bên phải chìa cần ra sông. Bản vẽ ở docs/bo-cuc-cong-trinh.md.
// Mặt trước (+z) quay ra sông như bến: mép móng z = +1,5 là mép nước; vó, đáy và thuyền chìa ra quá mép này.

import type * as THREE from 'three';
import { above5, banner, bird, boatRoof, roofFor, stiltHall, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import type { ShapeBuilder } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type Dock, type LotSpot, rod, yard } from './chung';

export const LANG_CHAI_LOT = new Lot(3, [
  'NNN.QQ',
  'NNN.PP',
  'GG,,PP',
  'GG,,MF',
  'LL,,VV',
  '====VV',
]);

/** Bãi cát ven sông. */
const SAND = 0xd9c391;
/** Lối đất nện ra bờ. */
const PATH = 0xbf9f6c;
/** Lưới gai nhuộm củ nâu. */
const NET = 0x8a7656;
/** Phao lưới bằng gỗ nhẹ. */
const FLOAT = 0xe8dcb8;
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
 * cấp 8 thêm thuyền lưới lớn có buồm neo ngoài cùng. Không ra tới luồng thuyền qua lại, không chạm bờ bên kia.
 */
export function langChaiDocks(level: number): Dock[] {
  const out: Dock[] = [{ kind: 'fishing', x: -0.35, z: 2.25, ry: Math.PI / 2, scale: 0.55, span: 0.4 }];
  if (level >= 3) out.push({ kind: 'fishing', x: 0.4, z: 3.05, ry: -Math.PI / 2, scale: 0.55, span: 0.55 });
  if (level >= 8) out.push({ kind: 'trader', x: -0.95, z: 3.55, ry: Math.PI / 2, scale: 0.62 });
  return out;
}

/** Con cá phơi: thân dẹt thon, đuôi chẻ, treo đầu xuống. */
function fish(p: ShapeBuilder, x: number, y: number, z: number, s = 1): void {
  p.sphere(0.05 * s, C.fish, x, y, z, [0.45, 1.5, 0.2], 6);
  p.cone(0.035 * s, 0.05 * s, C.fishBelly, x, y + 0.085 * s, z, undefined, 4);
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
    for (const dx of [-0.5, 0.5]) for (const dz of [-0.3, 0.3]) p.cyl(0.035, 0.045, h, C.woodDark, N.x + dx, h / 2, N.z + dz, undefined, 5);
    m.band.box(0.95, 0.4, 0.5, C.thatchDark, N.x, 0.22, N.z - 0.05);
    boatRoof(m, roof, { length: 1.35, width: 0.95, lift: 0.14, drop: 0.32, thickness: 0.05 }, N.x, h + 0.3, N.z);
    // Lưới treo dưới hiên trước, phao gỗ dọc mép trên.
    p.box(0.7, 0.32, 0.012, NET, N.x - 0.05, 0.36, N.z + 0.36);
    for (let i = 0; i < 5; i++) p.sphere(0.025, FLOAT, N.x - 0.33 + i * 0.14, 0.53, N.z + 0.37, [1.3, 0.8, 0.8], 5);
    return;
  }
  const postH = 0.5 + 0.1 * up;
  stiltHall(m, { x: N.x, z: N.z - 0.05, w: 1.35, d: 0.85, postH, roofL: 1.6, roofW: 1.1, lift: 0.3, roof });
  // Lưới phơi vắt trên lan can trước sàn.
  p.box(0.8, 0.26, 0.012, NET, N.x + 0.05, postH - 0.08, N.z + 0.4);
  for (let i = 0; i < 5; i++) p.sphere(0.025, FLOAT, N.x - 0.3 + i * 0.15, postH + 0.05, N.z + 0.41, [1.3, 0.8, 0.8], 5);
  // Thang tre lên sàn.
  rod(p, [N.x + 0.55, 0, N.z + 0.55], [N.x + 0.55, postH, N.z + 0.35], 0.015, C.bamboo, 4);
  rod(p, [N.x + 0.4, 0, N.z + 0.55], [N.x + 0.4, postH, N.z + 0.35], 0.015, C.bamboo, 4);
}

/** Giàn phơi cá: hai chân chữ A, sào tre ngang, cá xâu treo thành hàng (nhiều thêm theo cấp), nong cá dưới chân. */
function dryingRack(p: ShapeBuilder, level: number): void {
  const P = LANG_CHAI_LOT.zone('P');
  const x0 = P.x - 0.4;
  const x1 = P.x + 0.4;
  for (const x of [x0, x1]) {
    for (const dz of [-0.22, 0.22]) rod(p, [x, 0, P.z + dz], [x, 0.85, P.z], 0.022, C.bamboo, 4);
  }
  const rows = Math.min(1 + Math.floor((level + 1) / 2), 3);
  for (let r = 0; r < rows; r++) {
    const y = 0.8 - r * 0.2;
    const z = P.z + (r % 2 ? 0.06 : -0.06);
    rod(p, [x0 - 0.05, y, z], [x1 + 0.05, y, z], 0.016, C.bamboo, 4);
    for (let i = 0; i < 6; i++) fish(p, x0 + 0.08 + i * 0.128, y - 0.1, z);
  }
  // Nong tre phơi cá nhỏ trên đất.
  p.cyl(0.2, 0.2, 0.025, C.thatch, P.x - 0.25, 0.04, P.z + 0.38, undefined, 12);
  for (let i = 0; i < 5; i++) p.sphere(0.035, C.fish, P.x - 0.33 + (i % 3) * 0.08, 0.065, P.z + 0.33 + Math.floor(i / 3) * 0.1, [1.6, 0.35, 0.7], 5);
}

/** Vó bè: bè tre sát bờ, cần vó dài chìa ra sông, khung lưới vuông treo ở đầu cần, buông gần mặt nước. */
function liftNet(p: ShapeBuilder): void {
  const V = LANG_CHAI_LOT.zone('V');
  // Bè tre ngồi kéo vó.
  p.box(0.62, 0.06, 0.46, C.bamboo, V.x - 0.05, DECK_Y + 0.03, V.z + 0.2);
  for (let i = 0; i < 4; i++) p.box(0.62, 0.012, 0.015, 0x6a8a3a, V.x - 0.05, DECK_Y + 0.065, V.z + 0.02 + i * 0.12);
  // Cột chống và cần vó qua đầu cột.
  const post: [number, number, number] = [V.x + 0.12, 0.62, V.z + 0.42];
  rod(p, [V.x + 0.12, -0.3, V.z + 0.42], post, 0.035, C.woodDark, 5);
  const butt: [number, number, number] = [V.x - 0.12, 0.32, V.z + 0.05];
  const tip: [number, number, number] = [V.x + 0.2, 0.95, V.z + 1.45];
  rod(p, butt, tip, 0.028, C.bamboo, 5);
  // Khung vó: hai thanh tre bắt chéo cong, lưới vuông, bốn dây từ đầu cần xuống bốn góc.
  const cx = tip[0];
  const cz = tip[2];
  const y = WATER + 0.1;
  const h = 0.36;
  for (const [ax, az] of [[-1, -1], [-1, 1]] as const) rod(p, [cx + ax * h, y + 0.04, cz + az * h], [cx - ax * h, y + 0.04, cz - az * h], 0.013, C.bamboo, 4);
  p.box(2 * h * 0.9, 0.008, 2 * h * 0.9, NET, cx, y, cz, [0, Math.PI / 4, 0]);
  for (const [ax, az] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) rod(p, tip, [cx + ax * h, y + 0.04, cz + az * h], 0.005, C.cream, 3);
}

/** Giá phơi lưới: hai cột, sào ngang, tấm lưới vắt có phao gỗ. */
function netRack(p: ShapeBuilder): void {
  const L = LANG_CHAI_LOT.zone('L');
  for (const dx of [-0.36, 0.36]) p.cyl(0.03, 0.035, 0.78, C.woodDark, L.x + dx, 0.39, L.z, undefined, 5);
  rod(p, [L.x - 0.42, 0.74, L.z], [L.x + 0.42, 0.74, L.z], 0.016, C.bamboo, 4);
  p.box(0.66, 0.46, 0.012, NET, L.x, 0.5, L.z, [0.08, 0, 0]);
  for (let i = 0; i < 5; i++) p.sphere(0.025, FLOAT, L.x - 0.28 + i * 0.14, 0.72, L.z + 0.02, [1.3, 0.8, 0.8], 5);
}

/** Hàng đáy: cọc tre cắm xuống sông thành hàng chắn dòng, lưới đáy căng giữa các cọc, cờ đỏ buộc cọc đầu. */
function stakeNets(m: ToonModel): void {
  const p = m.plain;
  const z = 2.8;
  const xs = [-1.45, -1.2, -0.95, -0.7, -0.45];
  for (const x of xs) rod(p, [x, -0.45, z], [x, 0.5, z], 0.022, C.bamboo, 4);
  p.box(1.0, 0.3, 0.01, NET, -0.95, 0.05, z + 0.01);
  m.band.box(0.12, 0.08, 0.01, C.red, -1.39, 0.45, z);
}

/** Chum mắm đất nung có nắp, nhiều dần theo cấp. */
function jars(p: ShapeBuilder): void {
  const M = LANG_CHAI_LOT.zone('M');
  for (const [dx, dz, s] of [[-0.1, -0.1, 1], [0.12, 0.05, 0.85], [-0.08, 0.14, 0.75]] as const) {
    p.cyl(0.1 * s, 0.075 * s, 0.24 * s, C.soil, M.x + dx, 0.12 * s + 0.03, M.z + dz, undefined, 8);
    p.cyl(0.08 * s, 0.08 * s, 0.025, C.earthDark, M.x + dx, 0.25 * s + 0.03, M.z + dz, undefined, 8);
  }
}

/** Sạp chợ cá (cấp 7): mái theo cấp trên bốn cột, quầy ván bày thúng cá. */
function fishStall(m: ToonModel, level: number, roof: Roof): void {
  const p = m.plain;
  const G = LANG_CHAI_LOT.zone('G');
  const h = 0.72 + 0.06 * Math.max(0, level - 7);
  for (const dx of [-0.38, 0.38]) for (const dz of [-0.36, 0.36]) p.cyl(0.03, 0.04, h, C.woodDark, G.x + dx, h / 2, G.z + dz, undefined, 5);
  boatRoof(m, roof, { length: 1.0, width: 0.98, lift: 0.18, drop: 0.24, thickness: 0.045 }, G.x, h + 0.24, G.z);
  p.box(0.7, 0.05, 0.36, C.woodLight, G.x + 0.05, 0.42, G.z + 0.05);
  p.box(0.7, 0.36, 0.03, C.wood, G.x + 0.05, 0.22, G.z + 0.22);
  for (const dx of [-0.18, 0.1, 0.32]) {
    p.cyl(0.11, 0.08, 0.08, C.thatch, G.x + dx, 0.49, G.z + 0.05, undefined, 8);
    for (const fz of [-0.03, 0.04]) p.sphere(0.035, C.fish, G.x + dx, 0.54, G.z + 0.05 + fz, [1.6, 0.4, 0.6], 5);
  }
}

/** Miếu thần sông (cấp 8): nền đá, gian miếu nhỏ mái ngói viền đồng, bát hương, cây phướn đỏ cao. */
function shrine(m: ToonModel, roof: Roof): void {
  const p = m.plain;
  const Q = LANG_CHAI_LOT.zone('Q');
  const x = Q.x - 0.12;
  p.box(0.5, 0.18, 0.4, C.rock, x, 0.09, Q.z);
  m.band.box(0.36, 0.3, 0.28, C.woodLight, x, 0.33, Q.z);
  p.box(0.12, 0.18, 0.02, C.red, x, 0.3, Q.z + 0.145);
  boatRoof(m, roof, { length: 0.62, width: 0.5, lift: 0.14, drop: 0.14, thickness: 0.04 }, x, 0.6, Q.z);
  bird(m, x + 0.25, 0.74, Q.z, 1, 0.22);
  p.cyl(0.04, 0.035, 0.05, C.bronze, x, 0.205, Q.z + 0.24, undefined, 8);
  p.cyl(0.025, 0.03, 1.5, C.woodDark, Q.x + 0.38, 0.75, Q.z, undefined, 5);
  m.band.box(0.1, 0.62, 0.012, C.red, Q.x + 0.38, 1.12, Q.z + 0.03, [0, 0, 0.06]);
}

export function makeLangChai(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = LANG_CHAI_LOT;
  const roof = roofFor(level);
  const up = above5(level);

  yard(m, 3, SAND);
  const path = L.zone(',');
  p.box(path.w - 0.04, 0.02, path.d - 0.03, PATH, path.x, 0.055, path.z);

  boardwalk(p);
  home(m, level, roof);
  dryingRack(p, level);
  if (level >= 2) liftNet(p);
  if (level >= 3) netRack(p);
  if (level >= 5) {
    jars(p);
    const F = L.zone('F');
    banner(m, F.x - 0.15, F.z, 1.4 + 0.12 * up, C.indigo);
  }
  if (level >= 6) stakeNets(m);
  if (level >= 7) fishStall(m, level, roof);
  if (level >= 8) shrine(m, roof);
  return m.group();
}

export const LANG_CHAI: CongTrinh = { tiles: 3, make: makeLangChai, spots: langChaiSpots, view: { half: 3.6, lookY: 0.5, px: 56 }, docks: langChaiDocks };
