// Ruộng lúa 4×4: bốn thửa vuông chia bằng bờ chữ thập, mỗi thửa ba luống lúa; chòi canh trên gò góc sau bên trái
// từ cấp 3 (giản lược kiểu 2: một mái chính, xem docs/thiet-ke.md mục Giản lược công trình). Cấp 1 mới cấy hai
// thửa sau. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { above5, coneRoof, grown, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { inkThick, inkThin, ToonModel } from '../toon';
import { type CongTrinh, type LotOpts, type LotSpot, type V3, maiGon } from './chung';

export const RUONG_LOT = new Lot(4, [
  'CCaabbbb',
  'CCaabbbb',
  'aaaabbbb',
  'aaaabbbb',
  'ccccdddd',
  'ccccdddd',
  'ccccdddd',
  'cccc,,dd',
]);

/** Mép ngoài phần vẽ (lùi trong mép móng một chút), mép trong bờ ngoài, nửa bề rộng bờ chữ thập. */
const EDGE = 1.98;
const RIM = 1.8;
const DYKE = 0.08;
/** Nước ruộng mới cày: đục màu đất. */
const MUD_WATER = 0x6f7f68;
/** Bề rộng lòng một thửa. */
const THUA = RIM - DYKE;
/** Giữa luống `k` và `k + 1` (tính từ bờ chữ thập ra): chỗ người đứng. */
const khe = (k: number) => DYKE + (THUA / 3) * (k + 1);
/** Gò chòi canh góc sau bên trái: mép trong. */
const GO = 1.0;

/** Màu luống `k` theo cấp: mạ xanh, lúa đứng cái, rồi chín vàng; luống cạnh nhau đậm nhạt xen nhau. */
const luaMau = (level: number, k: number) => (level <= 2 ? 0x8fae4a : level <= 4 ? (k % 2 ? 0xa9b04a : 0xb3b84a) : k % 2 ? 0xc29f46 : 0xd0ad50);

/** Năm nông dân đứng giữa các luống, rải đủ bốn thửa, mỗi người một cột x − z khác nhau. */
export function ruongSpots(): LotSpot[] {
  const at: V3[] = [
    [-0.55, -khe(0), 0.5],
    [0.75, khe(0), -0.5],
    [0.45, -khe(1), 0.9],
    [-1.3, khe(0), 0.3],
    [-0.45, khe(1), 1.1],
  ];
  return at.map(([x, z, ry]) => ({ job: 'nong' as const, x, y: 0.06, z, ry }));
}

/** Chòi canh ruộng trên gò: bốn cột, sàn, mái nón theo cấp; cấp 6–8 chòi cao lên. */
function choi(m: ToonModel, x: number, z: number, y0: number, level: number, roof: Roof): void {
  const p = m.plain;
  const up = above5(level);
  const ph = 0.55 + 0.18 * up;
  for (const dx of [-0.26, 0.26]) for (const dz of [-0.26, 0.26]) p.cyl(0.035, 0.042, ph + 0.4, C.woodDark, x + dx, y0 + (ph + 0.4) / 2, z + dz, undefined, 5);
  p.box(0.7, 0.07, 0.7, C.wood, x, y0 + ph, z);
  const rh = 0.4 + 0.06 * up;
  coneRoof(m, roof, 0.56, rh, x, y0 + ph + 0.4 + rh / 2 - 0.02, z, 6);
}

export function makeRuong(level: number, opts: LotOpts = {}): THREE.Group {
  const m = new ToonModel(inkThin);
  // Luống lúa không viền mực: viền quanh từng khóm lúa làm cả thửa thành mảng lốm đốm sẫm.
  const lua = new ToonModel();
  const p = m.plain;
  // Mái theo cấp, bỏ dải đồng hoa văn cấp 9; chim Lạc cấp 10 giữ.
  const roof = maiGon(level);
  const lv = grown(level);
  const bank = 0.12 + lv * 0.02;
  const dyke = bank * 0.85;

  // Nước ruộng phủ cả lòng ruộng (đã bồi phù sa thì đục đỏ nâu). Cấp 1 hai thửa trước mới cày, nước đục.
  p.box(2 * RIM, 0.04, 2 * RIM, opts.boi ? C.paddySilt : C.paddyWater, 0, 0.05, 0);
  if (level < 2) for (const sx of [-1, 1]) p.box(THUA, 0.03, THUA, MUD_WATER, (sx * (RIM + DYKE)) / 2, 0.06, (RIM + DYKE) / 2);

  // Bờ ngoài quanh móng (cấp 6 kè đá xám), bờ chữ thập chia bốn thửa.
  const outer = level >= 6 ? C.rock : C.soil;
  const bw = EDGE - RIM;
  const bc = (EDGE + RIM) / 2;
  for (const s of [-1, 1]) {
    p.box(2 * EDGE, bank, bw, outer, 0, bank / 2, s * bc);
    p.box(bw, bank, 2 * RIM, outer, s * bc, bank / 2, 0);
    p.box(2 * DYKE, dyke, RIM, C.soil, 0, dyke / 2, (s * RIM) / 2);
    p.box(RIM, dyke, 2 * DYKE, C.soil, (s * RIM) / 2, dyke / 2, 0);
  }

  // Lúa: mỗi thửa ba luống dài nổi khỏi nước, cao và chín vàng dần theo cấp. Chòi canh lấn góc thửa sau bên trái.
  const h = 0.05 + lv * 0.025 + 0.012 * above5(level);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      if (level < 2 && sz > 0) continue;
      const cx = (sx * (RIM + DYKE)) / 2;
      for (let k = 0; k < 3; k++) {
        const z = sz * (DYKE + (THUA / 3) * (k + 0.5));
        // Luống sau cùng của thửa sau bên trái chừa chỗ cho gò chòi canh.
        const cut = level >= 3 && sx < 0 && sz < 0 && k === 2 ? EDGE - GO : 0;
        const len = THUA - 0.2 - cut;
        lua.plain.box(len, h, THUA / 3 - 0.22, luaMau(level, k), cx - (sx * cut) / 2, 0.05 + h / 2, z);
      }
    }
  }

  // Lối xuống ruộng: dốc đất cắt qua bờ trước.
  const P = RUONG_LOT.zone(',');
  p.box(0.5, bank + 0.005, 0.38, C.earth, P.x, (bank + 0.005) / 2, EDGE - 0.19);

  // Chòi canh trên gò góc sau bên trái từ cấp 3.
  if (level >= 3) {
    p.box(EDGE - GO, bank + 0.04, EDGE - GO, C.soil, -(EDGE + GO) / 2, (bank + 0.04) / 2, -(EDGE + GO) / 2);
    choi(m, -(EDGE + GO) / 2, -(EDGE + GO) / 2, bank + 0.04, level, roof);
  }

  const g = m.group();
  const lg = lua.group();
  for (const c of lg.children.slice()) {
    const mat = (c as THREE.Mesh).material;
    if (mat !== inkThick && mat !== inkThin) g.add(c);
  }
  return g;
}

export const RUONG: CongTrinh = { tiles: 4, make: makeRuong, spots: ruongSpots, view: { half: 3.6, lookY: 0.8, px: 52 } };
