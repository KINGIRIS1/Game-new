// Ruộng lúa 4×4: bốn thửa vuông chia bằng bờ chữ thập; chòi, trâu, guồng, miếu ở bốn góc, ao cò giữa bốn thửa.
// Bản vẽ ở docs/bo-cuc-cong-trinh.md. Góc nào chưa tới cấp có phần thì vẫn cấy lúa; tới cấp thì góc ấy đắp bờ dựng phần.

import * as THREE from 'three';
import { above5, bird, boatRoof, buffalo, coneRoof, egret, grown, POND, roofFor, type Roof, waterWheel } from '../buildings';
import { CELL, Lot, type Zone } from '../lot';
import { C } from '../palette';
import { type ShapeBuilder, seeded } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, type V3, rod } from './chung';

export const RUONG_LOT = new Lot(4, [
  'CCaabbMM',
  'CCaabbMM',
  'aaaabbbb',
  'aaaOObbb',
  'cccOOddd',
  'ccccdddd',
  'GGccddSS',
  'GGcc,,TT',
]);

/** Cấp có từng phần (thửa, lối, phần góc). Trước cấp ấy chỗ của phần góc vẫn là ruộng cấy lúa. */
const FROM: Record<string, number> = { a: 1, b: 1, ',': 1, c: 2, d: 2, T: 3, C: 4, S: 5, G: 6, M: 7, O: 8 };

/** Mép ngoài phần vẽ (lùi trong mép móng một chút), mép trong bờ ngoài, nửa bề rộng bờ chữ thập. */
const EDGE = 1.98;
const RIM = 1.8;
const DYKE = 0.08;
/** Nước ruộng mới cày: đục màu đất. */
const MUD_WATER = 0x6f7f68;
/** Guồng nước: tâm trục, cỡ (guồng giữ cỡ như dáng cũ). */
const WHEEL = { x: -1.42, y: 0.62, z: 1.4, scale: 1.25 };

/** Vẽ `draw` (tọa độ gốc ở chân) đặt tại (x, y, z), xoay `ry` quanh trục đứng: dùng cho trâu đứng nghiêng trên bờ. */
function turned(b: ShapeBuilder, x: number, y: number, z: number, ry: number, draw: () => void): void {
  b.frame = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
  draw();
  b.frame = null;
}

/** Chữ của ô con chứa điểm (x, z). */
function letterAt(x: number, z: number): string {
  const L = RUONG_LOT;
  const k = (v: number) => Math.min(L.n - 1, Math.max(0, Math.floor((v + L.tiles / 2) / CELL)));
  return L.rows[k(z)][k(x)];
}

/** Điểm (x, z) còn cấy lúa ở cấp này không: cấp 1 hai thửa trước còn là đất cày; lối không cấy; góc chưa có phần thì cấy. */
function planted(x: number, z: number, level: number): boolean {
  if (level < 2 && z > 0) return false;
  const ch = letterAt(x, z);
  if ('abcd'.includes(ch)) return true;
  return ch !== ',' && level < FROM[ch];
}

/** Số khóm lúa mỗi cạnh thửa: cấp 1–2 mới cấy thưa, từ cấp 3 cấy dày. */
const rowsFor = (level: number) => (level <= 2 ? 3 : 4);
const pitch = (level: number) => (RIM - DYKE) / rowsFor(level);
/** Khóm thứ `k` tính từ bờ chữ thập ra bờ ngoài (cùng bước theo x và z). */
const clump = (level: number, k: number) => DYKE + pitch(level) * (k + 0.5);
/** Giữa khóm `k` và `k + 1`: chỗ người đứng không chạm lúa. */
const gap = (level: number, k: number) => DYKE + pitch(level) * (k + 1);

/**
 * Năm nông dân đứng giữa các khóm lúa, rải đủ bốn thửa, mỗi người một cột x − z khác nhau.
 * Cấp 1: người thứ hai cày thửa trước bên phải (chưa cấy).
 */
export function ruongSpots(level: number): LotSpot[] {
  const g = (k: number) => gap(level, k);
  const at: V3[] =
    level <= 2
      ? [[-g(0), -g(0), 0.5], [g(1), g(0), -0.5], [g(0), -g(0), 0.9], [-g(1), g(0), 0.3], [-g(1), -g(0), 1.1]]
      : [[-g(1), -g(0), 0.5], [g(0), g(0), -0.5], [g(0), -g(1), 0.9], [-g(2), g(0), 0.3], [-g(0), -g(2), 1.1]];
  return at.map(([x, z, ry]) => ({ job: 'nong' as const, x, y: 0.06, z, ry }));
}

/** Bờ đất đắp cao bằng bờ ruộng phủ khối chữ `zone` (cắt ở mép móng); `front`: lấn thêm về phía trước. */
function mound(p: ShapeBuilder, zone: Zone, h: number, front = 0): void {
  const x0 = Math.max(zone.x - zone.w / 2, -EDGE);
  const x1 = Math.min(zone.x + zone.w / 2, EDGE);
  const z0 = Math.max(zone.z - zone.d / 2, -EDGE);
  const z1 = Math.min(zone.z + zone.d / 2 + front, EDGE);
  p.box(x1 - x0, h - 0.005, z1 - z0, C.soil, (x0 + x1) / 2, (h - 0.005) / 2, (z0 + z1) / 2);
  // Khóm cỏ trên bờ cho mềm.
  p.cone(0.06, 0.16, C.leaf[1], x0 + 0.15, h + 0.06, z1 - 0.14, undefined, 4);
}

/** Chòi canh ruộng trên bốn cột, sàn có lan can tre, mái nón theo cấp; cấp 6–8 chòi cao lên, có thang tre. */
function watchHut(m: ToonModel, x: number, z: number, y0: number, level: number, roof: Roof): void {
  const p = m.plain;
  const up = above5(level);
  const ph = 0.55 + 0.22 * up;
  const fy = y0 + ph;
  const post = 0.42;
  for (const dx of [-0.27, 0.27]) for (const dz of [-0.27, 0.27]) p.cyl(0.035, 0.045, ph + post, C.woodDark, x + dx, y0 + (ph + post) / 2, z + dz, undefined, 5);
  p.box(0.7, 0.06, 0.7, C.wood, x, fy, z);
  // Lan can tre ba mặt sau, trái, phải; mặt trước để trống chỗ thang.
  p.box(0.62, 0.03, 0.03, C.bamboo, x, fy + 0.2, z - 0.33);
  for (const s of [-1, 1]) p.box(0.03, 0.03, 0.62, C.bamboo, x + s * 0.33, fy + 0.2, z);
  const rh = 0.36 + 0.08 * up;
  coneRoof(m, roof, 0.56, rh, x, fy + post + rh / 2 - 0.02, z, 6);
  if (up) {
    // Thang tre từ mép sàn xuống bờ.
    const top = z + 0.36;
    const foot = top + 0.18 + 0.04 * up;
    for (const s of [-1, 1]) rod(p, [x + s * 0.11, fy, top], [x + s * 0.11, y0, foot], 0.016, C.bamboo, 4);
    const rungs = 3 + up;
    for (let i = 1; i <= rungs; i++) {
      const t = i / (rungs + 1);
      p.cyl(0.012, 0.012, 0.22, C.bamboo, x, fy - t * ph, top + t * (foot - top), [0, 0, Math.PI / 2], 4);
    }
  }
}

/** Miếu thần lúa: nền đá, vách son có hoa văn, hai cột hiên, mái cong theo cấp, chim đồng trên nóc, lư hương trước cửa. */
function shrine(m: ToonModel, x: number, z: number, y0: number, roof: Roof): void {
  const p = m.plain;
  p.box(0.86, 0.16, 0.8, C.rock, x, y0 + 0.08, z);
  p.box(0.9, 0.04, 0.84, C.rockDark, x, y0 + 0.17, z);
  const fy = y0 + 0.19;
  m.band.box(0.56, 0.46, 0.42, C.red, x, fy + 0.23, z - 0.08);
  p.box(0.16, 0.26, 0.02, 0x2a1d12, x, fy + 0.13, z + 0.135);
  for (const s of [-1, 1]) p.cyl(0.03, 0.03, 0.5, C.woodDark, x + s * 0.3, fy + 0.25, z + 0.2, undefined, 5);
  const ry = fy + 0.46 + 0.3;
  boatRoof(m, roof, { length: 1.0, width: 0.82, lift: 0.3, drop: 0.3, thickness: 0.05 }, x, ry, z - 0.02);
  bird(m, x - 0.05, ry + 0.06, z - 0.02, 1, 0.45);
  p.cyl(0.08, 0.06, 0.1, C.bronze, x, y0 + 0.24, z + 0.3, undefined, 8);
  p.cyl(0.006, 0.006, 0.14, C.cream, x, y0 + 0.36, z + 0.3, undefined, 3);
}

export function makeRuong(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = RUONG_LOT;
  const roof = roofFor(level);
  const lv = grown(level);
  const up = above5(level);
  const has = (ch: string) => level >= FROM[ch];
  const bank = 0.12 + lv * 0.02;
  const dyke = bank * 0.85;

  // Nước ruộng phủ cả lòng ruộng. Cấp 1 hai thửa trước mới cày: nước đục, luống đất chạy ngang.
  p.box(2 * RIM, 0.04, 2 * RIM, C.paddyWater, 0, 0.05, 0);
  if (level < 2) {
    const w = RIM - DYKE;
    for (const sx of [-1, 1]) {
      const cx = (sx * (RIM + DYKE)) / 2;
      p.box(w, 0.03, w, MUD_WATER, cx, 0.06, (RIM + DYKE) / 2);
      for (let k = 0; k < 5; k++) p.box(w - 0.14, 0.035, 0.07, C.soil, cx, 0.08, DYKE + 0.2 + k * 0.34);
    }
  }

  // Bờ ngoài quanh móng (cấp 6 kè đá xám, mặt bờ đá sẫm).
  const outer = level >= 6 ? C.rock : C.soil;
  const bw = EDGE - RIM;
  const bc = (EDGE + RIM) / 2;
  for (const s of [-1, 1]) {
    p.box(2 * EDGE, bank, bw, outer, 0, bank / 2, s * bc);
    p.box(bw, bank, 2 * RIM, outer, s * bc, bank / 2, 0);
    if (level >= 6) {
      p.box(2 * EDGE + 0.02, 0.04, bw + 0.02, C.rockDark, 0, bank, s * bc);
      p.box(bw + 0.02, 0.04, 2 * RIM, C.rockDark, s * bc, bank, 0);
    }
  }
  // Bờ chữ thập chia bốn thửa; cấp 8 chừa giữa cho ao.
  const inner = has('O') ? 0.46 : 0;
  for (const s of [-1, 1]) {
    const len = RIM - inner;
    const c = (s * (RIM + inner)) / 2;
    p.box(2 * DYKE, dyke, len, C.soil, 0, dyke / 2, c);
    p.box(len, dyke, 2 * DYKE, C.soil, c, dyke / 2, 0);
  }
  const tufts = seeded(5);
  for (let i = 0; i < 4; i++) {
    const t = (i % 2 ? 1 : -1) * (0.6 + tufts() * 1.0);
    const [x, z] = i < 2 ? [0, t] : [t, 0];
    p.cone(0.05, 0.14, C.leaf[i % 4], x + (i < 2 ? 0.03 : 0), dyke + 0.05, z + (i < 2 ? 0 : 0.03), undefined, 4);
  }

  // Lúa: cấp càng cao khóm càng cao, càng chín vàng; cấp 6–8 cao thêm.
  const color = new THREE.Color(C.rice).lerp(new THREE.Color(C.ripe), (lv - 1) / 4);
  const h = 0.16 + lv * 0.075 + 0.04 * up;
  const r = 0.08 + lv * 0.012;
  const n = rowsFor(level);
  const rand = seeded(23);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const x = sx * clump(level, i);
          const z = sz * clump(level, j);
          const k = 0.88 + rand() * 0.24;
          if (planted(x, z, level)) p.cone(r, h * k, color, x, 0.07 + (h * k) / 2, z, undefined, 5);
        }
      }
    }
  }

  // Lối xuống ruộng: dốc đất cắt qua bờ trước, hai bậc xuống nước.
  const P = L.zone(',');
  p.box(0.5, bank + 0.005, 0.38, C.earth, P.x, (bank + 0.005) / 2, EDGE - 0.19);
  p.box(0.5, bank * 0.6, 0.14, C.earth, P.x, bank * 0.3, EDGE - 0.45);
  p.box(0.5, bank * 0.32, 0.14, C.earth, P.x, bank * 0.16, EDGE - 0.59);

  if (has('T')) {
    // Trâu đứng nghỉ trên bờ góc trước bên phải, ngoảnh mặt về phía trước (thấp, đứng trước bó lúa).
    const T = L.zone('T');
    mound(p, T, bank);
    turned(p, T.x - 0.08, bank, T.z - 0.05, Math.PI / 2 - 0.25, () => buffalo(p, 0, 0));
  }
  if (has('C')) {
    // Chòi canh ruộng trên gò góc sau bên trái.
    const Cz = L.zone('C');
    mound(p, Cz, bank, 0.12);
    watchHut(m, Cz.x + 0.05, Cz.z + 0.05, bank, level, roof);
  }
  if (has('S')) {
    // Bó lúa đã gặt dựng chụm trên bờ, đụn rơm quanh cây cọc sát mép phải.
    const S = L.zone('S');
    mound(p, S, bank);
    for (const [x, z] of [[1.14, 1.16], [1.36, 1.24], [1.18, 1.38]] as const) {
      p.cyl(0.08, 0.12, 0.46, C.ripe, x, bank + 0.23, z, [0.1, 0, -0.1], 6);
      p.cone(0.12, 0.2, C.bronzeLight, x, bank + 0.55, z, undefined, 6);
    }
    p.cyl(0.22, 0.25, 0.28, C.thatch, 1.72, bank + 0.14, 1.24, undefined, 8);
    p.cone(0.25, 0.34, C.thatchDark, 1.72, bank + 0.45, 1.24, undefined, 8);
    p.cyl(0.015, 0.015, 0.2, C.woodDark, 1.72, bank + 0.68, 1.24, undefined, 4);
  }
  if (has('G')) {
    // Mương nước giữa hai bờ đất, hai cột giữ trục guồng; máng tre từ đỉnh guồng dẫn nước vào thửa trước bên trái.
    const { x: wx, y: wy, z: wz } = WHEEL;
    p.box(EDGE - 1.64, bank, 0.98, C.soil, -(EDGE + 1.64) / 2, bank / 2, 1.49);
    p.box(0.22, bank, 0.98, C.soil, -1.11, bank / 2, 1.49);
    p.box(0.42, bank, 0.12, C.soil, wx, bank / 2, 1.06);
    p.box(0.42, 0.03, 0.72, POND, wx, 0.065, 1.48);
    for (const s of [-1, 1]) {
      const px = wx + s * 0.34;
      p.cyl(0.045, 0.055, wy - bank + 0.06, C.woodDark, px, (wy + bank + 0.06) / 2, wz, undefined, 6);
      p.box(0.12, 0.05, 0.12, C.wood, px, wy + 0.06, wz);
    }
    const fz = wz - 0.12;
    const end: V3 = [-0.6, 0.55, fz];
    rod(p, [wx + 0.16, 1.02, fz], end, 0.055, C.bamboo, 6);
    rod(p, [-0.82, 0.07, fz], [-0.82, 0.68, fz], 0.03, C.woodDark);
    if (!has('O')) p.cyl(0.03, 0.045, 0.46, POND, end[0] + 0.02, 0.3, fz, undefined, 6);
  }
  if (has('M')) {
    // Miếu thần lúa trên gò góc sau bên phải.
    const M = L.zone('M');
    mound(p, M, bank);
    shrine(m, M.x - 0.03, M.z, bank, roof);
  }
  if (has('O')) {
    // Ao nước trong bờ đá giữa bốn thửa, lá sen, đàn cò; ống tre nối từ máng guồng đổ vào ao.
    p.cyl(0.5, 0.54, bank, C.rock, 0, bank / 2, 0, undefined, 16);
    p.cyl(0.43, 0.43, 0.03, POND, 0, bank - 0.005, 0, undefined, 16);
    for (const [x, z] of [[-0.2, 0.18], [0.24, -0.16], [0.08, 0.28]] as const) p.cyl(0.08, 0.08, 0.015, C.leaf[3], x, bank + 0.015, z, undefined, 8);
    egret(p, 0.1, 0.06, 0.6, bank - 0.12);
    egret(p, -0.18, -0.16, -2.3, bank - 0.12);
    egret(p, 1.25, 0.0, 1.9, dyke);
    const a: V3 = [-0.6, 0.52, WHEEL.z - 0.12];
    const b: V3 = [-0.32, 0.26, 0.32];
    rod(p, a, b, 0.045, C.bamboo, 6);
    rod(p, [-0.46, 0.07, 0.8], [-0.46, 0.39, 0.8], 0.025, C.woodDark);
    p.cyl(0.025, 0.035, 0.12, POND, -0.3, bank + 0.06, 0.3, undefined, 6);
  }

  const g = m.group();
  if (has('G')) {
    const wheel = waterWheel();
    wheel.position.set(WHEEL.x, WHEEL.y, WHEEL.z);
    wheel.scale.setScalar(WHEEL.scale);
    g.add(wheel);
  }
  return g;
}

export const RUONG: CongTrinh = { tiles: 4, make: makeRuong, spots: ruongSpots, view: { half: 3.6, lookY: 0.8, px: 52 } };
