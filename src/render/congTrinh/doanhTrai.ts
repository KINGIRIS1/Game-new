// Doanh trại 8×8 (đại doanh, bản lưu 26): khuôn viên vuông có tường bao, lầu cổng giữa các mặt, sân tập rộng có lính
// đứng tập thành hàng, đài tướng dài phía sau sân, mỗi doanh một nhà dài dọc tường sau và tường trái, phải. Bản vẽ ở
// docs/bo-cuc-cong-trinh.md. Camera nhìn từ trước bên phải nên nhà dài cao xếp dọc tường sau, tường trái; phía trước chỉ
// có phần thấp (tường, giá binh khí, bia) cho khỏi che lính tập và tướng.

import * as THREE from 'three';
import { DOANH_MAX, TUONG_IDS, type TuongId } from '../../game/defs';
import { GATES_LEVEL } from '../../game/doanhTrai';
import { archeryTarget, banner, coneRoof, drum, parasol, roofFor, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import type { Act } from '../rig';
import { saddleRoof } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LinhTap, type LotOpts, type LotSpot, YARD, yard } from './chung';
import { GATE_HALF, LAU_Y, cocRom, congTre, giaGiao, gopLinh, inFrame, lauCong, raoCocNhon } from './trai';

export const DOANH_TRAI_LOT = new Lot(8, [
  '#######CC#######',
  '#HHHHH.CC.IIIII#',
  '#HHHHH.,,.IIIII#',
  '#JJ.DDDDDDDD.LL#',
  '#JJ.DDDDDDDD.LL#',
  '#JJ.DDDDDDDD.LL#',
  '#JJ.DDDDDDDD.LL#',
  'CC.....,,.....CC',
  'CC..s.s,,s.s..CC',
  '#KK....,,....o.#',
  '#KK.s.s,,s.s.o.#',
  '#KK....,,....o.#',
  '#KK.s.s,,s.s...#',
  '#TT....,,...b.b#',
  '#TTggf.CC......#',
  '#######CC#######',
]);

/** Tường bao, rào đứng ở chừng này ô tính từ tâm móng (lùi vào trong mép móng cho mái tường khỏi chìa ra). */
const WALL = 3.8;
/** Mặt đài tướng. */
export const DAI_TOP = 0.3;

/** Nhà dài của năm doanh theo thứ tự doanh: hai nhà dọc tường sau, rồi tường trái, tường phải. */
const NHA: { ch: string; along: 'x' | 'z' }[] = [
  { ch: 'H', along: 'x' },
  { ch: 'I', along: 'x' },
  { ch: 'J', along: 'z' },
  { ch: 'K', along: 'z' },
  { ch: 'L', along: 'z' },
];

/** Cờ hiệu mỗi doanh theo màu tướng. */
const CO: Record<TuongId, number> = {
  lacTuong: C.red,
  giong: C.indigo,
  sonTinh: C.mountainCloak,
  anDuong: C.gold,
  caoLo: C.copper,
  trungTrac: C.trungRed,
  trungNhi: C.trungYellow,
};

/** Bốn mặt trại theo thứ tự cổng của `gates` (trước, sau, trái, phải): góc xoay đưa +z về phía ngoài mặt ấy. */
const MAT = [0, Math.PI, -Math.PI / 2, Math.PI / 2];

/** Tướng đứng trên đài tướng (các tướng khác đứng chầu trong sân Điện): Hai Bà cưỡi voi hai đầu, Gióng, Sơn Tinh ở giữa. */
const DAI_X: Partial<Record<TuongId, number>> = { trungTrac: -1.45, giong: -0.55, sonTinh: 0.6, trungNhi: 1.45 };

/**
 * Chỗ tướng `tuong` đứng trên đài tướng (tọa độ móng, gốc ở tâm móng), độ cao mặt đài ở cấp `level` (cấp 1 chưa có
 * đài, đứng trên sân) và góc quay mặt nhìn ra sân tập, chếch về phía camera.
 */
export function doanhTraiHeroSpot(tuong: TuongId, level: number): { x: number; y: number; z: number; ry: number } {
  const d = DOANH_TRAI_LOT.zone('D');
  // Ngựa sắt dài hơn voi: lùi về sau một chút cho đầu ngựa khỏi chìa ra khỏi đài.
  return { x: DAI_X[tuong] ?? 0, y: level >= 2 ? DAI_TOP : 0, z: d.z - (tuong === 'giong' ? 0.15 : 0), ry: 0.3 };
}

/**
 * Lính gác: cấp 1 đứng trong cổng trước; có lầu cổng thì mỗi lầu một người đứng trên sàn lầu nhìn ra ngoài (cổng trước,
 * phải, trái, sau: hai cổng nhìn thấy rõ trước).
 */
export function doanhTraiSpots(level: number): LotSpot[] {
  if (level < 2) return [{ job: 'linhGac', x: -0.85, y: 0.06, z: 3.3, ry: 0.3 }];
  const y = LAU_Y + 0.04;
  const out: LotSpot[] = [{ job: 'linhGac', x: 0.3, y, z: WALL, ry: 0 }];
  if (level >= GATES_LEVEL) {
    out.push(
      { job: 'linhGac', x: WALL, y, z: -0.3, ry: Math.PI / 2 },
      { job: 'linhGac', x: -WALL, y, z: 0.3, ry: -Math.PI / 2 },
      { job: 'linhGac', x: -0.3, y, z: -WALL, ry: Math.PI },
    );
  }
  return out;
}


/**
 * Nhà dài để trống không vách, mái thẳng: hàng cột, sàn ván thấp, chiếu ngủ và chăn cuộn của lính.
 * `along`: 'x' nhà chạy ngang, 'z' nhà chạy dọc. `length`, `depth`: khoảng cột (ô).
 */
function nhaDai(m: ToonModel, cx: number, cz: number, length: number, depth: number, along: 'x' | 'z', roof: Roof): void {
  const p = m.plain;
  const at = (u: number, v: number): [number, number] => (along === 'x' ? [cx + u, cz + v] : [cx + v, cz + u]);
  const dims = (lu: number, lv: number): [number, number] => (along === 'x' ? [lu, lv] : [lv, lu]);
  const postH = 1.1;
  const bays = Math.max(2, Math.round(length / 1.1));
  for (let i = 0; i <= bays; i++) {
    const u = -length / 2 + (i * length) / bays;
    for (const v of [-depth / 2, depth / 2]) p.cyl(0.055, 0.065, postH, C.woodDark, ...pos(at(u, v), postH / 2), undefined, 6);
  }
  // Sàn ván thấp và dầm sàn.
  const [fw, fd] = dims(length + 0.1, depth + 0.12);
  p.box(fw, 0.08, fd, C.wood, cx, 0.13, cz);
  const [ew, ed] = dims(length + 0.14, 0.06);
  for (const v of [-1, 1]) p.box(ew, 0.1, ed, C.woodDark, ...pos(at(0, (v * (depth + 0.12)) / 2), 0.1));
  // Chiếu ngủ, mỗi gian một chiếu, chăn cuộn đầu chiếu.
  for (let i = 0; i < bays; i++) {
    const u = -length / 2 + ((i + 0.5) * length) / bays;
    const [mw, md] = dims(0.5, depth * 0.62);
    p.box(mw, 0.02, md, C.cream, ...pos(at(u, 0.02), 0.18));
    p.cyl(0.05, 0.05, 0.42, C.indigo, ...pos(at(u, -depth * 0.25), 0.22), along === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0], 6);
  }
  // Mái thẳng kiểu nhà dài (sống mái không cong), khác mái cong vút của Điện.
  const width = depth + 0.38;
  m.band.add(saddleRoof({ length: length + 0.5, width, lift: 0, drop: width * 0.38, thickness: 0.08 }), roof.main, cx, 1.47, cz, [0, along === 'x' ? 0 : Math.PI / 2, 0]);
}

/** Tọa độ (x, z) và độ cao y thành bộ ba cho ShapeBuilder. */
const pos = ([x, z]: [number, number], y: number): [number, number, number] => [x, y, z];



/**
 * Tường đất nện thấp chạy dọc một mặt (trong khung mặt ấy: gốc giữa mặt, tường chạy theo x), chừa cửa giữa nếu `gate`;
 * đỉnh tường có mái tranh nhỏ hai mái.
 */
function tuongDat(m: ToonModel, gate: boolean): void {
  const p = m.plain;
  const end = WALL + 0.16;
  const runs: [number, number][] = gate ? [[-end, -GATE_HALF - 0.06], [GATE_HALF + 0.06, end]] : [[-end, end]];
  for (const [a, b] of runs) {
    const len = b - a;
    const cx = (a + b) / 2;
    p.box(len, 0.06, 0.38, C.rockDark, cx, 0.03, 0);
    p.box(len, 0.46, 0.3, C.earth, cx, 0.29, 0);
    m.band.add(saddleRoof({ length: len + 0.06, width: 0.5, lift: 0, drop: 0.12, thickness: 0.05 }), C.thatch, cx, 0.64, 0);
  }
}

/** Chòi trống trận: chân cột cao, sàn có lan can đỏ, trống đồng, mái tranh nhọn, thang tre dựa bên phải quay ra sân. */
function choiTrong(m: ToonModel, x: number, z: number, roof: Roof): void {
  const p = m.plain;
  const fy = 1.25;
  for (const ox of [-0.27, 0.27]) for (const oz of [-0.27, 0.27]) p.cyl(0.045, 0.055, fy, C.woodDark, x + ox, fy / 2, z + oz, undefined, 6);
  p.box(0.72, 0.07, 0.72, C.wood, x, fy, z);
  for (const s of [-1, 1]) {
    m.band.box(0.72, 0.12, 0.04, C.red, x, fy + 0.1, z + s * 0.34);
    m.band.box(0.04, 0.12, 0.72, C.red, x + s * 0.34, fy + 0.1, z);
  }
  drum(m, x, z, 0.72, fy + 0.04);
  for (const ox of [-0.29, 0.29]) for (const oz of [-0.29, 0.29]) p.cyl(0.025, 0.025, 0.55, C.woodDark, x + ox, fy + 0.31, z + oz, undefined, 5);
  coneRoof(m, roof, 0.56, 0.48, x, fy + 0.8, z, 8, true);
  for (const oz of [-0.1, 0.1]) p.cyl(0.018, 0.018, 1.4, C.bamboo, x + 0.55, fy / 2, z + oz, [0, 0, 0.33], 4);
  for (let i = 1; i <= 4; i++) p.box(0.03, 0.025, 0.22, C.bamboo, x + 0.78 - i * 0.09, (i * fy) / 5, z);
}

/** Cột cờ lớn: cột gỗ cao chân kè đá, đầu bọc đồng, cờ đỏ lớn viền vàng. */
function cotCo(m: ToonModel, x: number, z: number): void {
  const p = m.plain;
  const h = 3.2;
  p.cyl(0.16, 0.2, 0.16, C.rock, x, 0.08, z, undefined, 8);
  p.cyl(0.04, 0.05, h, C.woodDark, x, h / 2, z, undefined, 6);
  p.sphere(0.07, C.bronzeLight, x, h + 0.04, z, [1, 1, 1], 6);
  m.band.box(0.72, 0.5, 0.03, C.red, x + 0.38, h - 0.32, z);
  p.box(0.74, 0.04, 0.035, C.gold, x + 0.38, h - 0.58, z);
}

/** Giá nỏ nhỏ (chương 4 có lính nỏ): hai cột, xà ngang, hai cây nỏ treo dựng báng xuống. */
function giaNo(m: ToonModel, x: number, z: number): void {
  const p = m.plain;
  for (const s of [-1, 1]) p.cyl(0.03, 0.034, 0.9, C.woodDark, x + s * 0.27, 0.45, z - 0.09, undefined, 6);
  p.box(0.62, 0.05, 0.05, C.woodDark, x, 0.86, z - 0.09);
  for (const dx of [-0.12, 0.12]) {
    p.box(0.05, 0.46, 0.04, C.woodDark, x + dx, 0.6, z - 0.04);
    p.add(new THREE.TorusGeometry(0.15, 0.013, 3, 8, Math.PI), C.wood, x + dx, 0.72, z - 0.03);
  }
}

/** Số lính đứng tập theo cấp trại: cấp 1 bốn người, mỗi cấp thêm hai. */
export const linhTapCount = (level: number): number => 4 + 2 * (Math.min(Math.max(level, 1), 5) - 1);

/**
 * Chỗ lính tập theo thứ tự lấp: hàng giữa trước, rồi hàng sau, hàng trước; mỗi hàng hai người trong trước, hai người
 * ngoài sau.
 */
const CHO_TAP: { x: number; z: number }[] = (() => {
  const cells = DOANH_TRAI_LOT.cells('s');
  const rows = [...new Set(cells.map((c) => c.z))].sort((a, b) => a - b);
  const order = [rows[1], rows[0], rows[2]];
  const out: { x: number; z: number }[] = [];
  for (const z of order) {
    const row = cells.filter((c) => c.z === z).sort((a, b) => Math.abs(a.x) - Math.abs(b.x) || a.x - b.x);
    out.push(...row);
  }
  return out;
})();

/** Lính mẫu (ảnh công trình, chụp thử): giáo binh, cung thủ xen nhau. */
const LINH_MAU: LinhTap[] = ['giao', 'giao', 'cung', 'cung'];

/** Hai tư thế tập của mỗi binh chủng, đổi nhau theo nhịp "một, hai": giáo thế thủ rồi đâm, cung giương rồi buông. */
const NHIP: Record<LinhTap, [Act, Act]> = {
  giao: [{ act: 'fight', strike: 0.05 }, { act: 'fight', strike: 0.32 }],
  cung: [{ act: 'fight' }, { act: 'fight', strike: 0.35 }],
  no: [{ act: 'fight' }, { act: 'fight', strike: 0.35 }],
};

/** Lính tập quay mặt ra cổng trước, chếch về phía camera. */
const TAP_RY = 0.45;

/**
 * Cả sân lính tập ở tư thế `nhip` gộp lại (`gopLinh`, mỗi tư thế 2–4 lệnh vẽ). `userData.drill`: World cho hai nhóm hiện
 * thay nhau theo nhịp.
 */
function hangLinh(list: { kind: LinhTap; tier: number; x: number; z: number }[], nhip: 0 | 1): THREE.Group {
  const out = gopLinh(list.map((s) => ({ ...s, ry: TAP_RY, act: NHIP[s.kind][nhip] })));
  out.userData.drill = nhip;
  // Lúc đầu chỉ hiện nhịp "một" (bóng mờ lúc đặt, ảnh công trình); World cho hai nhịp đổi nhau.
  out.visible = nhip === 0;
  return out;
}

export function makeDoanhTrai(level: number, opts: LotOpts = {}): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = DOANH_TRAI_LOT;
  const roof = roofFor(level);
  const four = level >= GATES_LEVEL;

  yard(m, 8);
  // Sân tập: đất nện sẫm hơn sân, lối giữa sáng từ cổng trước vào tới đài tướng.
  const lane = L.groups(',').sort((a, b) => b.z - a.z)[0];
  const sanZ0 = L.zone('D').z + L.zone('D').d / 2;
  const sanZ1 = lane.z + lane.d / 2;
  const sanW = 5;
  p.box(sanW, 0.02, sanZ1 - sanZ0, C.earth, 0, 0.06, (sanZ0 + sanZ1) / 2);
  p.box(lane.w - 0.1, 0.022, sanZ1 - sanZ0, level >= 4 ? C.rock : YARD, 0, 0.062, (sanZ0 + sanZ1) / 2);
  if (level >= 4) {
    // Sân kẻ ô vạch vôi, lối giữa lát đá có mạch.
    for (let x = -sanW / 2; x <= sanW / 2 + 1e-6; x += 1) if (Math.abs(x) > lane.w / 2) p.box(0.04, 0.012, sanZ1 - sanZ0, C.cream, x, 0.074, (sanZ0 + sanZ1) / 2);
    for (let z = sanZ0; z <= sanZ1 + 1e-6; z += 1) {
      for (const s of [-1, 1]) p.box(sanW / 2 - lane.w / 2, 0.012, 0.04, C.cream, (s * (sanW / 2 + lane.w / 2)) / 2, 0.074, z);
    }
    for (let z = sanZ0 + 0.5; z < sanZ1; z += 0.5) p.box(lane.w - 0.12, 0.012, 0.03, C.rockDark, 0, 0.075, z);
  }

  // Tường bao: cấp 1–2 rào cọc vót nhọn chừa cổng trước; từ cấp 3 tường đất nện, cổng giữa bốn mặt.
  if (four) MAT.forEach((ry) => inFrame(m, Math.sin(ry) * WALL, Math.cos(ry) * WALL, ry, () => tuongDat(m, true)));
  else raoCocNhon(m, WALL + 0.05, 2 * GATE_HALF);
  // Cổng: cấp 1 cổng tre, cấp 2 lầu cổng trước, cấp 3 bốn lầu cổng.
  MAT.forEach((ry, i) => {
    if (i > 0 && !four) return;
    inFrame(m, Math.sin(ry) * WALL, Math.cos(ry) * WALL, ry, () => (level >= 2 ? lauCong(m, roof) : congTre(m)));
  });

  // Nhà dài của từng doanh, cờ hiệu màu tướng cắm góc nhà nhìn ra sân.
  const doanh = (opts.doanh ?? TUONG_IDS.slice(0, level)).slice(0, DOANH_MAX);
  doanh.forEach((t, i) => {
    const { ch, along } = NHA[i];
    const z = L.zone(ch);
    nhaDai(m, z.x, z.z, (along === 'x' ? z.w : z.d) - 0.25, 0.72, along, roof);
    const fx = along === 'x' ? z.x - Math.sign(z.x) * (z.w / 2 - 0.12) : z.x - Math.sign(z.x) * (z.w / 2 - 0.05);
    const fz = along === 'x' ? z.z + z.d / 2 - 0.05 : z.z - Math.sign(z.z) * (z.d / 2 - 0.1);
    banner(m, fx, fz, 2.15, CO[t]);
  });

  // Giá binh khí góc trước bên trái: giáo đồng; có lính nỏ thì treo thêm nỏ.
  const g = L.zone('g');
  if (opts.no) {
    giaGiao(m, g.x - 0.22, g.z + 0.05, 0.56, 4);
    giaNo(m, g.x + 0.3, g.z + 0.05);
  } else giaGiao(m, g.x - 0.05, g.z + 0.05, 0.9, 5);

  if (level >= 2) {
    // Đài tướng dài phía sau sân: nền đất đắp kè đá, sàn ván có mạch, chiếu cói viền đỏ mỗi chỗ tướng, lan can đỏ phía
    // sau và hai đầu, bậc đá giữa xuống lối sân, lọng đỏ giữa mép sau (sau lưng Gióng, Sơn Tinh; voi Hai Bà có lọng riêng).
    const d = L.zone('D');
    p.box(d.w, 0.08, d.d, C.rock, d.x, 0.04, d.z);
    p.box(d.w - 0.06, DAI_TOP - 0.08, d.d - 0.06, C.earthDark, d.x, 0.08 + (DAI_TOP - 0.08) / 2, d.z);
    p.box(d.w, 0.05, d.d, C.wood, d.x, DAI_TOP, d.z);
    for (let x = d.x - d.w / 2 + 0.5; x < d.x + d.w / 2 - 0.1; x += 0.5) p.box(0.025, 0.012, d.d - 0.04, C.woodDark, x, DAI_TOP + 0.026, d.z);
    for (const x of Object.values(DAI_X)) {
      p.box(0.62, 0.02, 0.95, C.thatchDark, x, DAI_TOP + 0.035, d.z + 0.1);
      m.band.box(0.62, 0.022, 0.06, C.red, x, DAI_TOP + 0.036, d.z + 0.1 + 0.475);
    }
    m.band.box(d.w, 0.14, 0.04, C.red, d.x, DAI_TOP + 0.1, d.z - d.d / 2 + 0.02);
    for (const s of [-1, 1]) m.band.box(0.04, 0.14, d.d, C.red, d.x + s * (d.w / 2 - 0.02), DAI_TOP + 0.1, d.z);
    const front = d.z + d.d / 2;
    for (let i = 0; i < 2; i++) p.box(0.8, DAI_TOP * (0.35 + 0.33 * i), 0.18, C.rock, 0, (DAI_TOP * (0.35 + 0.33 * i)) / 2, front + 0.27 - i * 0.18);
    parasol(m, d.x + 0.02, d.z - d.d / 2 + 0.14, 2.4);
  }
  if (level >= 3) {
    // Sân tập bên phải: ba cọc rơm tập đâm, hai bia rơm.
    for (const o of L.cells('o')) cocRom(p, o.x, o.z);
    for (const b of L.cells('b')) archeryTarget(m, b.x, b.z, 0.3);
  }
  if (level >= 4) {
    const f = L.zone('f');
    cotCo(m, f.x, f.z);
  }
  if (level >= 5) {
    const t = L.zone('T');
    choiTrong(m, t.x - 0.05, t.z, roof);
  }

  const out = m.group();
  // Lính đứng tập: đúng số chỗ theo cấp, không quá số lính đang có; hai tư thế đổi nhau theo nhịp.
  const linh = opts.linh ?? Array.from({ length: linhTapCount(level) }, (_, i) => ({ kind: LINH_MAU[i % LINH_MAU.length], tier: 0 }));
  const list = linh.slice(0, linhTapCount(level)).map((l, i) => ({ ...l, ...CHO_TAP[i] }));
  if (list.length) for (const nhip of [0, 1] as const) out.add(hangLinh(list, nhip));
  return out;
}

export const DOANH_TRAI: CongTrinh = { tiles: 8, make: makeDoanhTrai, spots: doanhTraiSpots, view: { half: 4.9, lookY: 0.8, px: 64 } };
