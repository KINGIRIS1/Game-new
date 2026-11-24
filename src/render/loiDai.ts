// Cảnh Lôi đài Phong Châu (docs/thiet-ke.md mục Kế hoạch: Lôi đài Phong Châu): sân chầu riêng, không phải sân Điện ở
// kinh đô. Phía sau là thềm cao ba bậc có ngai vàng, Vua Hùng ngồi ngai nhìn xuống (bản tĩnh `bakeVuaHung`), sau nữa
// là khối cung điện; giữa là sân lát đá có mặt trống đồng khảm trên nền; đội ta bên trái, đội máy bên phải, thần thú ở
// mép sân phía đội mình; tướng đã về mà không lên đài đứng chầu hai bên thềm, nữ tướng cầm cờ đứng sau.
//
// Người trên sân là nhân vật có xương dùng chung với trận thường (tướng, lính, thú, quái), hiệu ứng chiêu ghép từ
// `HieuUng`. Cảnh chỉ diễn lại việc luật đã tính (`LoiSk`): `dien` nhận các việc của một lượt, trả thời lượng.

import * as THREE from 'three';
import type { FighterKind } from '../game/battle';
import type { NuTuongId, ThanThuId } from '../game/defs';
import { CHIEU, laLoiTuong, type ChieuId, type LoiKind, type LoiSk, type LoiTran, type LoiTuong } from '../game/loiDai';
import { dangThu } from '../game/thanThu';
import { SCALE } from './battleView';
import { isBeast, makeBeast } from './beasts';
import { banner, birdSpread, drum, drumTower, roofFor } from './buildings';
import { lotModel } from './congTrinh/index';
import { featherFans, nghiMon, palaceBlock, parasol, royalCenser, scaled, stoneElephant, throne } from './congTrinh/dien';
import {
  VUA_SEAT,
  bakeVuaHung,
  makeAnDuong,
  makeBaTrieu,
  makeCaoLo,
  makeGiong,
  makeLacTuong,
  makeLyThuongKiet,
  makeMaiThucLoan,
  makeNgoQuyen,
  makeNuTuong,
  makeSonTinh,
  makeThuyTinh,
  makeTrieuQuangPhuc,
  makeTrungNhi,
  makeTrungTrac,
} from './heroes';
import { HieuUng } from './hieuUng';
import { addSunLights, type SunLights } from './lights';
import { buildForest, makeFighter, makeMountain, type TreeSpot } from './models';
import { ShapeBuilder, seeded } from './shapes';
import { makeThuyenChien } from './thuyenChien';
import { VE } from './vatCan';
import { isMonster, makeMonster } from './monsters';
import { C } from './palette';
import type { Poser } from './rig';
import { isSoldier, makeSoldier } from './soldier';
import { makeThanThu } from './thanThu';
import { ToonModel, inkThin, outlineOf, toon } from './toon';
import { TROI_NGAY } from './troi';

/** Bố cục sân (tọa độ trong cảnh, trước khi xoay 45° cho hợp hướng camera): ngai ở phía −z, đội ta ở −x. */
export const SAN = {
  /** Nửa bề ngang, nửa bề sâu sân lát đá. */
  w: 9.8,
  d: 8.2,
  /** Bán kính mặt trống đồng khảm giữa sân. */
  trong: 2.6,
  /** Thềm ngai: mép trước, độ cao mỗi bậc, số bậc. */
  themZ: -5.3,
  bac: 0.42,
  soBac: 3,
  /** Chỗ đứng: đội cách tâm sân, giãn cách giữa ba người, thú đứng xa hơn. */
  doiX: 5.4,
  gian: 3.7,
  thuX: 6.7,
} as const;

const THEM_Y = SAN.bac * SAN.soBac;
/** Phóng người trên sân so với cỡ trong trận thường. */
const CO = 1.5;
/** Ai đánh từ xa thì đứng tại chỗ ra đòn. */
const BAN_XA: LoiKind[] = ['anDuong', 'caoLo', 'trungNhi', 'cung', 'no', 'lacTuong'];

/** Màu hiệu ứng của từng chiêu (đòn thường: trắng). */
const MAU: Partial<Record<ChieuId | ThanThuId, number>> = {
  trongTran: C.fxVang,
  coLenh: C.fxVang,
  phunLua: C.fxLua,
  nhoTre: C.fxXanh,
  bocDoi: C.fxXanh,
  doiNon: C.fxHo,
  noThan: C.fxVang,
  ruaVang: C.fxVang,
  lienChau: C.fxVang,
  lenhBan: C.fxDo,
  voiXung: C.fxBui,
  loiThe: C.fxDo,
  hieuTrieu: C.fxXanh,
  tienPhong: C.fxDo,
  chemCaKinh: C.fxNuoc,
  dapSong: C.fxNuoc,
  ngayAn: C.fxSuong,
  mongRong: C.fxSuong,
  hacDe: C.fxDo,
  phaAch: C.fxDo,
  cocBachDang: C.fxNuoc,
  trieuRut: C.fxNuoc,
  namQuoc: C.fxVang,
  tienPhat: C.fxTim,
  giacChem: C.fxDo,
  giacQuet: C.fxDo,
  giacChoang: C.fxTim,
  giacHo: C.fxDo,
  thuLac: C.fxVang,
  thuNgua: C.fxLua,
  thuGa: C.fxVang,
  thuRua: C.fxVang,
  thuRong: C.fxNuoc,
};

/** Dựng một người trên sân: tướng (có hào quang, vũ khí ánh nếu có), lính, thú, quái. */
export function taoNguoi(kind: LoiKind, glow = false, anh = false): THREE.Group {
  switch (kind) {
    case 'lacTuong':
      return makeLacTuong();
    case 'giong':
      return makeGiong('trangSi', { glow, anh });
    case 'sonTinh':
      return makeSonTinh({ glow, anh });
    case 'anDuong':
      return makeAnDuong({ crossbow: true, glow, anh });
    case 'caoLo':
      return makeCaoLo({ glow, anh });
    case 'trungTrac':
      return makeTrungTrac({ glow, anh });
    case 'trungNhi':
      return makeTrungNhi({ glow, anh });
    case 'baTrieu':
      return makeBaTrieu({ anh });
    case 'trieuQuangPhuc':
      return makeTrieuQuangPhuc({ anh });
    case 'maiThucLoan':
      return makeMaiThucLoan({ anh });
    case 'ngoQuyen':
      return makeNgoQuyen({ anh });
    case 'lyThuongKiet':
      return makeLyThuongKiet({ anh });
    case 'thuyTinh':
      return makeThuyTinh();
  }
  const k = kind as FighterKind;
  return isSoldier(k) ? makeSoldier(k, 0) : isBeast(k) ? makeBeast(k, 0) : isMonster(k) ? makeMonster(k) : makeFighter(k, 0);
}

/** Tướng đứng chầu bên thềm (xuống voi, xuống ngựa). */
export function taoChau(kind: LoiTuong): THREE.Group {
  switch (kind) {
    case 'giong':
      return makeGiong('trangSi', { onFoot: true });
    case 'trungTrac':
      return makeTrungTrac({ onFoot: true });
    case 'trungNhi':
      return makeTrungNhi({ onFoot: true });
    case 'baTrieu':
      return makeBaTrieu({ onFoot: true });
    case 'ngoQuyen':
      return makeNgoQuyen({ onFoot: true });
    case 'anDuong':
      return makeAnDuong({});
    default:
      return taoNguoi(kind);
  }
}

const coCua = (kind: LoiKind): number => (kind === 'lacTuong' ? 0.95 : (SCALE[kind as FighterKind] ?? 0.8)) * CO;

/** Sân chầu: nền, thềm ngai, ngai, lọng, quạt, cung điện phía sau, cờ, trống, lư hương. */
function dungSan(kieu: KieuSan): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  // Đất quanh sân, sân lát đá ô so le, viền đá sẫm.
  p.box(90, 0.1, 90, DAT[kieu], 0, -0.07, 0);
  p.box(SAN.w * 2 + 0.5, 0.08, SAN.d * 2 + 0.5, C.rockDark, 0, -0.02, 0);
  const o = 1.3;
  for (let ix = -8; ix < 8; ix++) {
    for (let iz = -7; iz < 7; iz++) {
      const x = (ix + 0.5) * o;
      const z = (iz + 0.5) * o;
      if (Math.abs(x) > SAN.w || Math.abs(z) > SAN.d) continue;
      p.box(o - 0.05, 0.05, o - 0.05, (ix + iz) % 2 ? C.rock : 0xb9b29c, x, 0.005, z);
    }
  }
  // Mặt trống đồng khảm giữa sân: vành đá sẫm, vành đồng, mặt trống.
  p.cyl(SAN.trong + 0.75, SAN.trong + 0.75, 0.05, C.rockDark, 0, 0.012, 0, undefined, 48);
  m.band.cyl(SAN.trong + 0.5, SAN.trong + 0.5, 0.05, C.bronze, 0, 0.02, 0, undefined, 48);
  p.cyl(SAN.trong + 0.14, SAN.trong + 0.14, 0.05, C.bronzeDark, 0, 0.026, 0, undefined, 48);
  m.drum.cyl(SAN.trong, SAN.trong, 0.05, 0xffffff, 0, 0.032, 0, undefined, 48);

  // Thềm ngai ba bậc, mỗi bậc viền vàng, thảm đỏ giữa.
  const sau = SAN.themZ - 4.3;
  for (let i = 0; i < SAN.soBac; i++) {
    const z0 = SAN.themZ - i * 0.55;
    const w = 8.2 - i * 0.9;
    const d = z0 - sau;
    (i === SAN.soBac - 1 ? m.band : p).box(w, SAN.bac, d, i % 2 ? C.rockDark : C.rock, 0, SAN.bac * (i + 0.5), z0 - d / 2);
    p.box(w + 0.04, 0.05, 0.06, C.gold, 0, SAN.bac * (i + 1), z0);
    p.box(1.5, 0.02, 0.56, C.red, 0, SAN.bac * (i + 1) + 0.012, z0 - 0.27);
  }
  p.box(1.5, 0.02, 2.2, C.red, 0, THEM_Y + 0.012, SAN.themZ - 2.1);
  p.box(1.5, 0.02, 1.4, C.red, 0, 0.04, SAN.themZ + 0.7);
  for (const sx of [-1, 1]) {
    p.box(0.08, 0.03, 2.2, C.gold, sx * 0.79, THEM_Y + 0.016, SAN.themZ - 2.1);
    royalCenser(m, sx * (SAN.w - 0.7), 0, SAN.themZ + 0.7, 2.2);
  }
  // Ngai vàng, lọng, quạt lông chim (dáng của Điện cấp 10, phóng to).
  const ngaiZ = SAN.themZ - 3.0;
  scaled(m, 0, ngaiZ, NGAI_K, () => {
    const b = [m.plain, m.band, m.drum, m.glow];
    const up = new THREE.Matrix4().makeTranslation(0, THEM_Y, 0);
    const truoc = b.map((x) => x.frame);
    for (const x of b) x.frame = up.clone().multiply(x.frame!);
    throne(m, 0, 0, 10);
    parasol(m, 0, -0.42, 10);
    featherFans(m, 0, -0.3);
    b.forEach((x, i) => (x.frame = truoc[i]));
  });
  // Khối cung điện phía sau thềm.
  scaled(m, 0, SAN.themZ - 9.6, 1.9, () => palaceBlock(m, 10));
  // Cờ đại hai bên sân, trống đồng trên giá ở hai góc trước, hai trống lớn bên thềm.
  for (const sx of [-1, 1]) {
    [-4.6, -1.2, 2.2, 5.6].forEach((z, i) => banner(m, sx * (SAN.w - 0.25) - 0.2, z, 3.6, i % 2 ? C.gold : C.red));
    // Trống đồng trên giá ở hai góc trước sân.
    const dx0 = sx * 6.6;
    const dz0 = SAN.d - 0.9;
    p.box(1.3, 0.12, 0.3, C.woodDark, dx0, 0.45, dz0);
    for (const dx of [-0.52, 0.52]) p.box(0.14, 0.45, 0.16, C.red, dx0 + dx, 0.22, dz0);
    drum(m, dx0, dz0, 1.7, 0.45);
  }
  const them = (kieu === 1 ? ngoaiKinhThanh : kieu === 2 ? ngoaiNuiRung : ngoaiBenSong)(m);
  const g = m.group();
  g.traverse((x) => {
    if (x instanceof THREE.Mesh) x.receiveShadow = true;
  });
  for (const o of them) g.add(o);
  const vua = bakeVuaHung();
  vua.scale.setScalar(NGAI_K);
  vua.position.set(0, THEM_Y + (0.37 - VUA_SEAT) * NGAI_K, ngaiZ + 0.08 * NGAI_K);
  g.add(vua);
  return g;
}
const NGAI_K = 1.7;

/** Kiểu cảnh của tầng thuộc chương 1–5: kinh thành, đỉnh núi, bến sông luân phiên. */
export const KIEU_CHUONG: KieuSan[] = [1, 2, 3, 1, 2];

/** Ba kiểu cảnh quanh sân: 1 kinh thành Phong Châu, 2 đỉnh núi Nghĩa Lĩnh, 3 bến sông hội xuân. */
export type KieuSan = 1 | 2 | 3;
const DAT: Record<KieuSan, number> = { 1: 0x8aa750, 2: 0x6f9248, 3: 0x8fae56 };

const CO_MAU = [C.red, C.gold, 0x3f7f8a, 0xf2ead2, 0x6f9a3a];

/** Rừng ngoài sân: gieo cây trong ô lưới, bỏ chỗ `tranh` trả true. */
function rung(seed: number, buoc: number, tre: number, tranh: (x: number, z: number) => boolean, xa = 26): THREE.Object3D {
  const r = seeded(seed);
  const cay: TreeSpot[] = [];
  for (let x = -xa; x <= xa; x += buoc) {
    for (let z = -xa; z <= xa * 0.7; z += buoc) {
      const px = x + (r() - 0.5) * buoc * 0.8;
      const pz = z + (r() - 0.5) * buoc * 0.8;
      const giu = r() > 0.2;
      const k = r() < tre ? 'bamboo' : 'tree';
      const sd = Math.floor(r() * 1e6);
      if (!giu || tranh(px, pz)) continue;
      cay.push({ x: px, z: pz, kind: k, seed: sd });
    }
  }
  return buildForest(cay);
}

/** Trong sân và thềm, cung điện (kèm một dải chừa `vien` ô). */
const trongSan = (x: number, z: number, vien: number): boolean =>
  (Math.abs(x) < SAN.w + vien && z > SAN.themZ - 0.5 && z < SAN.d + vien) || (Math.abs(x) < 8.5 + vien && z <= SAN.themZ - 0.5 && z > SAN.themZ - 16);

/** Vật cản của bãi chiến (đá, khóm tre, rơm, giếng...) dựng thành một lưới để đặt quanh sân. */
function doVat(ve: (p: ShapeBuilder, rand: () => number, them: THREE.BufferGeometry[]) => void, seed: number): THREE.Object3D {
  const g = new THREE.Group();
  const p = new ShapeBuilder();
  const them: THREE.BufferGeometry[] = [];
  ve(p, seeded(seed), them);
  for (const geo of [...(p.empty ? [] : [p.geometry()]), ...them]) {
    const mesh = new THREE.Mesh(geo, toon);
    mesh.castShadow = true;
    g.add(mesh, outlineOf(geo, inkThin));
  }
  return g;
}

/** Hàng rào cột chạm quanh sân (hở chỗ cổng trước và chỗ thềm). */
function raoSan(m: ToonModel, cong: number): void {
  const p = m.plain;
  const X = SAN.w + 0.9;
  const Z = SAN.d + 0.9;
  const cot = (x: number, z: number) => {
    p.cyl(0.09, 0.11, 1.15, C.woodDark, x, 0.57, z, undefined, 6);
    p.cyl(0.13, 0.13, 0.08, C.red, x, 1.12, z, undefined, 6);
    p.sphere(0.09, C.gold, x, 1.24, z, undefined, 6);
  };
  for (const sx of [-1, 1]) {
    for (let z = SAN.themZ + 0.6; z <= Z + 0.01; z += 1.3) cot(sx * X, z);
    p.box(0.07, 0.07, Z - SAN.themZ - 0.6, C.red, sx * X, 0.8, (Z + SAN.themZ + 0.6) / 2);
    p.box(0.07, 0.07, Z - SAN.themZ - 0.6, C.woodDark, sx * X, 0.45, (Z + SAN.themZ + 0.6) / 2);
    for (let x = cong + 0.4; x <= X - 0.5; x += 1.3) cot(sx * x, Z);
    const len = X - cong - 0.4;
    p.box(len, 0.07, 0.07, C.red, sx * (cong + 0.4 + len / 2), 0.8, Z);
    p.box(len, 0.07, 0.07, C.woodDark, sx * (cong + 0.4 + len / 2), 0.45, Z);
  }
}

/** Lối đá từ mép trước sân đi ra. */
function loiDa(m: ToonModel, tu: number, toi: number, rong: number): void {
  const n = Math.round((toi - tu) / 1.3);
  for (let i = 0; i < n; i++) m.plain.box(rong, 0.05, 1.22, i % 2 ? C.rock : C.rockDark, 0, 0.005, tu + (i + 0.5) * 1.3);
  for (const sx of [-1, 1]) m.plain.box(0.12, 0.07, toi - tu, C.red, sx * (rong / 2 + 0.06), 0.02, (tu + toi) / 2);
}

/**
 * Kiểu 1, kinh thành Phong Châu: sân có hàng rào cột chạm, cổng tứ trụ phía trước, hai lầu trống ở góc, voi đá chầu
 * hai bên lối vào, nhà sàn của kinh đô hai bên, cây thưa.
 */
function ngoaiKinhThanh(m: ToonModel): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const Z = SAN.d + 0.9;
  raoSan(m, 1.9);
  scaled(m, 0, Z + 1.3, 1.9, () => nghiMon(m, 10, roofFor(10)));
  loiDa(m, SAN.d + 0.25, SAN.d + 13, 2.6);
  for (const sx of [-1, 1]) {
    scaled(m, sx * (SAN.w + 0.9), Z, 2.3, () => drumTower(m, 0, 0, 0, roofFor(10), true));
    scaled(m, sx * 3.4, Z + 2.4, 1.9, () => stoneElephant(m, 0, 0, 8));
    for (const z of [Z + 4.8, Z + 7.6]) banner(m, sx * 2.0 - 0.2, z, 3.2, C.red);
    royalCenser(m, sx * 2.1, 0, Z + 1.0, 2.2);
    // Nhà sàn của kinh đô hai bên sân và hai bên lối vào: quay mặt ra trước như ở kinh đô (mái nhìn từ mặt trước).
    for (const [x, z] of [[SAN.w + 3.6, -6.5], [SAN.w + 3.6, -0.5], [SAN.w + 3.6, 5.5], [6.2, Z + 6.2], [11.6, Z + 4.4], [6.4, Z + 11.4]]) {
      const nha = lotModel('nhaSan', 10);
      nha.scale.setScalar(1.3);
      nha.position.set(sx * x, 0, z);
      out.push(nha);
    }
  }
  out.push(rung(11, 3.4, 0.25, (x, z) => trongSan(x, z, 6.4) || (Math.abs(x) < 15 && z > 0)));
  return out;
}

/**
 * Kiểu 2, đỉnh núi Nghĩa Lĩnh: rừng già vây sát sân, núi đá phía sau và hai bên, cột đá chim Lạc ở bốn góc, tảng đá,
 * khóm tre, bậc đá và lư hương dọc lối lên.
 */
function ngoaiNuiRung(m: ToonModel): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const p = m.plain;
  const nui: [number, number, number, number, number][] = [
    [-15, -17, 7, 13, 0x5f7f52],
    [15, -18, 8, 15, 0x587a50],
    [-24, -6, 8, 12, 0x6a8a5c],
    [24, -5, 7, 11, 0x64865a],
    [0, -30, 11, 19, 0x4f7048],
    [-20, 9, 6, 8, 0x6f9060],
    [21, 10, 6, 9, 0x6a8c5c],
  ];
  for (const [x, z, r, h, mau] of nui) {
    const n = makeMountain(r, h, mau);
    n.position.set(x, -0.3, z);
    out.push(n);
  }
  // Cột đá chim Lạc ở bốn góc sân.
  for (const sx of [-1, 1]) {
    for (const z of [SAN.themZ + 0.2, SAN.d + 1.1]) {
      const x = sx * (SAN.w + 1.1);
      p.cyl(0.42, 0.5, 0.3, C.rockDark, x, 0.15, z, undefined, 8);
      p.cyl(0.2, 0.26, 3.4, C.rock, x, 2.0, z, undefined, 8);
      m.band.cyl(0.27, 0.27, 0.3, C.bronze, x, 3.2, z, undefined, 8);
      birdSpread(m, x, 3.75, z, 1.5);
    }
    // Bậc đá và lư hương dọc lối lên.
    for (const z of [SAN.d + 1.6, SAN.d + 4.4, SAN.d + 7.2]) royalCenser(m, sx * 2.2, 0, z, 2.4);
  }
  for (let i = 0; i < 9; i++) p.box(3.4 - (i % 2) * 0.2, 0.09, 1.1, i % 2 ? C.rock : C.rockDark, 0, 0.02, SAN.d + 0.8 + i * 1.25);
  const da: [number, number, number][] = [[-10.2, 4.6, 1.3], [10.4, 2.2, 1.5], [-5.2, 9.8, 1.1], [5.8, 10.6, 1.4], [-10.8, -3.4, 1.2], [10.6, -4.2, 1.0], [8.2, 13.8, 1.2], [-8.6, 14.2, 1.0]];
  out.push(
    doVat((b, rand, them) => {
      da.forEach(([x, z, r], i) => (i % 3 === 2 ? VE.daNhon : VE.da)?.(b, { k: 'tron', x, z, r }, rand, them));
      for (const [x, z] of [[-9.6, 8.2], [9.4, 7.4], [-4.6, 13.6], [4.4, 14.6]]) VE.tre?.(b, { k: 'tron', x, z, r: 1.1 }, rand, them);
    }, 23),
  );
  out.push(rung(29, 2.3, 0.12, (x, z) => trongSan(x, z, 1.6) || (Math.abs(x) < 2.6 && z > 0) || da.some(([dx, dz, r]) => Math.hypot(x - dx, z - dz) < r + 0.8), 30));
  return out;
}

/**
 * Kiểu 3, bến sông hội xuân: trước sân là bến ván ra sông, hai thuyền trống đồng đậu, cây nêu và dây cờ, khóm tre, lau
 * sậy ven nước, đống rơm, chum vại, giếng làng.
 */
function ngoaiBenSong(m: ToonModel): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const p = m.plain;
  const bo = SAN.d + 3.6;
  // Bãi cát ven sông, mặt sông.
  p.box(90, 0.06, 1.6, 0xd8c690, 0, -0.012, bo + 0.2);
  p.box(90, 0.06, 40, C.water[0], 0, -0.02, bo + 21);
  for (let i = 0; i < 14; i++) p.box(2.2 + (i % 3) * 0.9, 0.02, 0.09, 0x9fd0d2, ((i * 7.3) % 30) - 15, 0.015, bo + 2.2 + ((i * 3.1) % 11));
  // Bến ván ra sông, cọc gỗ hai bên.
  loiDa(m, SAN.d + 0.25, bo - 0.6, 2.6);
  for (let i = 0; i < 6; i++) p.box(2.8, 0.1, 0.72, i % 2 ? C.wood : C.woodDark, 0, 0.16, bo - 0.3 + i * 0.78);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) p.cyl(0.11, 0.12, 1.0, C.woodDark, sx * 1.5, 0.3, bo + 0.2 + i * 1.9, undefined, 6);
  for (const sx of [-1, 1]) {
    const thuyen = makeThuyenChien();
    thuyen.scale.setScalar(1.45);
    thuyen.position.set(sx * 6.4, 0.02, bo + 4.4 + (sx > 0 ? 1.8 : 0));
    thuyen.rotation.y = sx * 0.28;
    out.push(thuyen);
    // Cây nêu sát bờ sông: tre cao, vòng tre, dải vải đỏ, vàng, chùm lá trên ngọn.
    const nx = sx * 7.1;
    const nz = bo - 1.3;
    p.cyl(0.07, 0.11, 6.0, C.bamboo, nx, 3.0, nz, undefined, 6);
    p.add(new THREE.TorusGeometry(0.42, 0.03, 5, 14), C.bamboo, nx, 5.3, nz);
    for (let i = 0; i < 5; i++) m.band.box(0.07, 1.1 - i * 0.12, 0.26, i % 2 ? C.gold : C.red, nx + (i - 2) * 0.17, 4.6 - i * 0.05, nz);
    p.cone(0.5, 0.9, 0x6f9a3a, nx, 6.3, nz, undefined, 6);
    royalCenser(m, sx * 2.1, 0, SAN.d + 1.0, 2.2);
    // Dây cờ đuôi nheo giăng thấp dọc bờ, từ cây nêu ra cọc tre đầu bến.
    p.cyl(0.05, 0.07, 2.6, C.bamboo, sx * 1.9, 1.3, nz, undefined, 5);
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      const x = sx * (1.9 + k * 5.0);
      const y = 2.5 - Math.sin(k * Math.PI) * 0.7;
      p.box(0.5, 0.03, 0.03, C.woodDark, x, y, nz);
      p.cone(0.2, 0.5, CO_MAU[i % CO_MAU.length], x, y - 0.27, nz, [Math.PI, 0, 0], 3);
    }
  }
  out.push(
    doVat((b, rand, them) => {
      for (const [x, z] of [[-11.2, 5.2], [11.4, 4.4], [-12.6, -1.6], [12.4, -2.4], [-10.6, -7.4], [10.8, -8.2], [-14.6, 8.6], [14.8, 8.2]]) VE.tre?.(b, { k: 'tron', x, z, r: 1.2 }, rand, them);
      for (const [x, z] of [[-9.8, 8.6], [-8.4, 9.4], [9.6, 9.0]]) VE.rom?.(b, { k: 'tron', x, z, r: 0.8 }, rand, them);
      for (const [x, z] of [[9.4, 1.2], [-9.6, 1.6], [8.9, 7.6]]) VE.chum?.(b, { k: 'tron', x, z, r: 0.6 }, rand, them);
      VE.gieng?.(b, { k: 'tron', x: -9.8, z: -3.8, r: 0.8 }, rand, them);
      for (let i = 0; i < 16; i++) {
        const x = (i - 7.5) * 2.6 + (i % 2) * 0.7;
        if (Math.abs(x) < 3 || (Math.abs(Math.abs(x) - 6.4) < 2.6)) continue;
        VE.lau?.(b, { k: 'tron', x, z: bo + 0.9 + (i % 3) * 0.4, r: 0.8 }, rand, them);
      }
    }, 37),
  );
  for (const sx of [-1, 1]) {
    const nha = lotModel('nhaSan', 6);
    nha.scale.setScalar(1.35);
    nha.position.set(sx * (SAN.w + 5.4), 0, -3.2);
    nha.rotation.y = -sx * Math.PI / 2;
    out.push(nha);
  }
  out.push(rung(41, 3.0, 0.45, (x, z) => trongSan(x, z, 3.6) || z > bo - 1.6 || (Math.abs(Math.abs(x) - SAN.w - 5.4) < 3 && Math.abs(z + 3.2) < 3)));
  return out;
}

interface NguoiView {
  obj: THREE.Group;
  pose?: Poser;
  nha: THREE.Vector3;
  huong: number;
  kind: LoiKind | ThanThuId;
  /** Đang ra chiêu: đã diễn bao lâu, cả thời lượng, lúc trúng, chỗ lao tới, chiêu riêng hay đòn thường. */
  ra?: { t: number; dur: number; trung: number; toi: THREE.Vector3 | null; ky: boolean; horn: boolean };
  /** Vừa trúng đòn: còn rung bao lâu. */
  rung: number;
  nga: boolean;
  ngaTuoi: number;
  thang: number;
  /** Chiều cao người (đỉnh đầu, đã phóng), để đặt thẻ máu và chữ nổi. */
  cao: number;
}

interface ViecCho {
  luc: number;
  lam: () => void;
}

export class LoiDaiCanh {
  readonly scene = new THREE.Scene();
  private readonly inner = new THREE.Group();
  private readonly lights: SunLights;
  private readonly hu: HieuUng;
  private readonly nguoi = new Map<number, NguoiView>();
  private readonly chau: THREE.Group[] = [];
  private readonly vongLuot: THREE.Mesh;
  private readonly vongMuc: THREE.Mesh[] = [];
  private viec: ViecCho[] = [];
  private time = 0;
  private kq: 'thang' | 'thua' | null = null;

  constructor(readonly kieu: KieuSan = 1) {
    this.scene.background = new THREE.Color(TROI_NGAY.sky);
    this.lights = addSunLights(this.scene, 16, 2048);
    // Camera nhìn chéo: xoay cả sân cho thềm ngai nằm phía trên màn hình, đội ta bên trái.
    this.inner.rotation.y = Math.PI / 4;
    this.scene.add(this.inner);
    this.inner.add(dungSan(kieu));
    this.hu = new HieuUng(this.inner);
    const vong = (mau: number, r: number) => {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(r * 0.82, r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: mau, transparent: true, opacity: 0.9, depthWrite: false }));
      mesh.visible = false;
      mesh.renderOrder = 3;
      this.inner.add(mesh);
      return mesh;
    };
    this.vongLuot = vong(C.gold, 1.1);
    for (let i = 0; i < 3; i++) this.vongMuc.push(vong(C.fxDo, 1.0));
  }

  setShadows(on: boolean): void {
    this.lights.sun.castShadow = on;
  }

  /** Chỗ đứng của người `u` (hay thần thú phe `phe`). */
  private cho(phe: 0 | 1, cho: number | null): THREE.Vector3 {
    const s = phe === 0 ? -1 : 1;
    if (cho === null) return new THREE.Vector3(s * SAN.thuX, 0, -1.4);
    return new THREE.Vector3(s * (SAN.doiX - (cho === 1 ? 0.9 : 0)), 0, (cho - 1) * SAN.gian + 1.0);
  }

  private them(id: number, kind: LoiKind | ThanThuId, obj: THREE.Group, co: number, phe: 0 | 1, cho: number | null): void {
    const nha = this.cho(phe, cho);
    obj.scale.setScalar(co);
    obj.position.copy(nha);
    const huong = phe === 0 ? Math.PI / 2 : -Math.PI / 2;
    obj.rotation.y = huong;
    obj.traverse((o) => {
      if (o instanceof THREE.Mesh) o.frustumCulled = false;
    });
    this.inner.add(obj);
    (obj.userData.pose as Poser | undefined)?.({ act: 'stand', time: 0 });
    obj.updateMatrixWorld(true);
    const cao = THREE.MathUtils.clamp(new THREE.Box3().setFromObject(obj).max.y, 1.2, 3.4);
    this.nguoi.set(id, { obj, pose: obj.userData.pose, nha, huong, kind, rung: 0, nga: false, ngaTuoi: 0, thang: 0, cao });
  }

  private go(obj: THREE.Object3D): void {
    this.inner.remove(obj);
    obj.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
    });
  }

  /** Dựng người của trận `b` và hàng tướng đứng chầu (`chau`: tướng không lên đài; `nu`: nữ tướng đã theo về). */
  dat(b: LoiTran, chau: LoiTuong[] = [], nu: NuTuongId[] = []): void {
    for (const v of this.nguoi.values()) this.go(v.obj);
    for (const o of this.chau) this.go(o);
    this.nguoi.clear();
    this.chau.length = 0;
    this.hu.clear();
    this.viec = [];
    this.kq = null;
    this.vongLuot.visible = false;
    for (const v of this.vongMuc) v.visible = false;
    for (const u of b.units) this.them(u.id, u.kind, taoNguoi(u.kind, !!u.glow, !!u.bo4), coCua(u.kind), u.phe, u.cho);
    b.thu.forEach((t, i) => {
      if (t) this.them(-1 - i, t.kind, makeThanThu(t.kind, dangThu(t.cap)), (SCALE[t.kind] ?? 0.72) * CO * 0.8, i as 0 | 1, null);
    });
    // Hàng chầu trên thềm, hai bên ngai, quay mặt xuống sân; nữ tướng cầm cờ đứng hàng sau.
    chau.forEach((k, i) => {
      const s = i % 2 ? 1 : -1;
      const o = taoChau(k);
      o.scale.setScalar(coCua(k) * 0.8);
      o.position.set(s * (1.6 + Math.floor(i / 2) * 0.95), THEM_Y, SAN.themZ - 1.5);
      o.rotation.y = -s * 0.3;
      (o.userData.pose as Poser | undefined)?.({ act: 'stand', time: i });
      this.inner.add(o);
      this.chau.push(o);
    });
    nu.forEach((k, i) => {
      const s = i % 2 ? 1 : -1;
      const o = makeNuTuong(k);
      o.scale.setScalar(0.8 * CO * 0.8);
      o.position.set(s * (1.75 + Math.floor(i / 2) * 0.95), THEM_Y, SAN.themZ - 2.7);
      o.rotation.y = -s * 0.25;
      (o.userData.pose as Poser | undefined)?.({ act: 'stand', time: i + 3 });
      this.inner.add(o);
      this.chau.push(o);
    });
  }

  /** Điểm trong cảnh (đã xoay) ở độ cao `k` lần chiều cao người `id` (1 là đỉnh đầu), để giao diện đặt thẻ máu, chữ nổi và bắt lần chạm. */
  diem(id: number, k = 1, out = new THREE.Vector3()): THREE.Vector3 | null {
    const v = this.nguoi.get(id);
    if (!v) return null;
    return this.inner.localToWorld(out.copy(v.obj.position).setY(v.obj.position.y + v.cao * k));
  }

  /** Vòng vàng dưới chân người đang tới lượt, vòng đỏ dưới chân những người chọn được làm mục tiêu. */
  chi(luot: number | null, muc: number[]): void {
    const a = luot !== null ? this.nguoi.get(luot) : undefined;
    this.vongLuot.visible = !!a && !a.nga;
    if (a) this.vongLuot.position.set(a.nha.x, 0.07, a.nha.z);
    this.vongMuc.forEach((m, i) => {
      const v = muc[i] !== undefined ? this.nguoi.get(muc[i]) : undefined;
      m.visible = !!v;
      if (v) m.position.set(v.nha.x, 0.075, v.nha.z);
    });
  }

  private sau(luc: number, lam: () => void): void {
    this.viec.push({ luc: this.time + luc, lam });
  }

  /** Hiệu ứng lúc đòn trúng người `v`. */
  private trung(v: NguoiView, mau: number, manh: boolean): void {
    const p = v.obj.position.clone().setY(1.1);
    this.hu.loe(p, { mau, size: manh ? 2.6 : 1.7 });
    this.hu.tia(p, { mau, n: manh ? 14 : 7, toc: manh ? 5 : 3.5 });
    if (manh) this.hu.soc(v.obj.position.clone(), { mau, r: 1.5 });
    v.rung = 0.3;
  }

  /**
   * Diễn các việc của một lượt (`sk` vừa thêm vào trận). Trả thời lượng (giây, ở tốc độ thường) và lúc đòn trúng, để
   * giao diện hiện số máu đúng lúc.
   */
  dien(sk: LoiSk[]): { dur: number; trung: number } {
    const chieu = sk.find((e) => e.t === 'chieu');
    const nga = sk.filter((e) => e.t === 'nga').map((e) => e.id);
    const bi = new Set(sk.filter((e) => e.t === 'mat').map((e) => e.id));
    const hoi = sk.filter((e) => e.t === 'hoi').map((e) => e.id);
    const hu = sk.filter((e): e is Extract<LoiSk, { t: 'hu' }> => e.t === 'hu' && e.on);
    const het = sk.find((e): e is Extract<LoiSk, { t: 'het' }> => e.t === 'het');
    if (!chieu || chieu.t !== 'chieu') {
      // Đầu lượt: mất máu dần, choáng mất lượt.
      for (const id of bi) {
        const v = this.nguoi.get(id);
        if (v) this.trung(v, C.fxLua, false);
      }
      for (const id of nga) this.nguoi.get(id)!.nga = true;
      if (het) this.kq = het.kq;
      return { dur: sk.length ? 0.55 : 0, trung: 0 };
    }
    const a = this.nguoi.get(chieu.ai);
    const c = chieu.chieu;
    const laThu = chieu.ai < 0;
    const def = laThu ? null : CHIEU[c as ChieuId];
    const ky = laThu || c !== 'danh';
    const mau = MAU[c] ?? C.fxTrang;
    const dur = ky ? 1.25 : 0.85;
    const trung = dur * 0.45;
    const muc = chieu.muc.map((id) => this.nguoi.get(id)).filter((v): v is NguoiView => !!v);
    const danhDich = laThu ? c !== 'thuRua' : def!.muc === 'dich' || def!.muc === 'caDich';
    if (a) {
      // Đánh gần một người thì lao tới trước mặt người ấy; còn lại bước lên một bước.
      const s = a.nha.x < 0 ? 1 : -1;
      let toi: THREE.Vector3 | null = a.nha.clone().setX(a.nha.x + s * 0.7);
      if (danhDich && muc.length === 1 && !BAN_XA.includes(a.kind as LoiKind) && !laThu) toi = muc[0].nha.clone().setX(muc[0].nha.x - s * 1.9);
      else if (danhDich && !BAN_XA.includes(a.kind as LoiKind)) toi = new THREE.Vector3(-s * 0.6, 0, laThu ? a.nha.z * 0.5 : a.nha.z * 0.4);
      a.ra = { t: 0, dur, trung, toi, ky, horn: c === 'lenhBan' };
      if (ky) this.hu.vong(a.nha.clone(), { mau, r: 1.2, life: 0.8 });
    }
    this.sau(trung, () => {
      const tam = new THREE.Vector3();
      for (const v of muc) tam.add(v.nha);
      if (muc.length) tam.multiplyScalar(1 / muc.length);
      if (danhDich) {
        if (muc.length > 1) this.hu.soc(tam, { mau, r: 3.4 });
        for (const v of muc) if (bi.has(this.idCua(v))) this.trung(v, mau, ky && muc.length === 1);
        if (c === 'chemCaKinh' || c === 'giacChem' || c === 'tienPhong' || c === 'mongRong') for (const v of muc) this.hu.chem(v.obj.position.clone().setY(1.2), { mau, r: 1.6, yaw: a && a.nha.x < 0 ? 0 : Math.PI });
        if (c === 'bocDoi' || c === 'doiNon' || c === 'voiXung' || c === 'giacQuet') for (const v of muc) this.hu.bui(v.obj.position.clone().setY(0.3), { mau: C.fxBui, size: 2 });
        if (c === 'noThan' || c === 'lienChau' || c === 'lenhBan' || c === 'namQuoc') for (const v of muc) this.hu.cot(v.obj.position.clone(), { mau, r: 0.5, h: 4 });
      } else {
        for (const v of muc) {
          if (c === 'ruaVang' || c === 'thuRua') this.hu.khien(v.nha.clone(), { mau, r: 1.15, life: 1.4 });
          else this.hu.cot(v.nha.clone(), { mau, r: 0.7, h: 3.2 });
          this.hu.hat(v.nha.clone(), { mau, n: 10, r: 0.7, h: 2.2 });
        }
      }
      if (c === 'namQuoc') for (const e of hu) if (e.hu === 'yeu') this.trungNhe(e.id, C.fxTim);
      for (const id of hoi) {
        const v = this.nguoi.get(id);
        if (v) this.hu.hat(v.nha.clone(), { mau: C.fxXanh, n: 12, r: 0.6, h: 2.4 });
      }
      for (const e of hu) {
        const v = this.nguoi.get(e.id);
        if (v && e.hu === 'choang') this.hu.choang(v.obj, { mau: C.fxVang, cao: 2.2 / v.obj.scale.x, life: 1.6 });
      }
      for (const id of nga) {
        const v = this.nguoi.get(id);
        if (v) v.nga = true;
      }
      if (het) this.kq = het.kq;
    });
    return { dur, trung };
  }

  private trungNhe(id: number, mau: number): void {
    const v = this.nguoi.get(id);
    if (v) this.hu.loe(v.obj.position.clone().setY(1.4), { mau, size: 1.4 });
  }

  private idCua(v: NguoiView): number {
    for (const [id, x] of this.nguoi) if (x === v) return id;
    return NaN;
  }

  /** Đang diễn dở một lượt. */
  get dangDien(): boolean {
    if (this.viec.length) return true;
    for (const v of this.nguoi.values()) if (v.ra) return true;
    return false;
  }

  update(dt: number): void {
    this.time += dt;
    if (this.viec.length) {
      const toi = this.viec.filter((v) => v.luc <= this.time);
      this.viec = this.viec.filter((v) => v.luc > this.time);
      for (const v of toi) v.lam();
    }
    const nhip = 0.55 + 0.45 * Math.abs(Math.sin(this.time * 3.2));
    (this.vongLuot.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.45 * nhip;
    this.vongLuot.rotation.y = this.time * 0.8;
    for (const m of this.vongMuc) (m.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.55 * nhip;
    for (const [id, v] of this.nguoi) {
      const o = v.obj;
      const t = this.time + id * 0.7;
      if (v.nga) {
        v.ra = undefined;
        v.ngaTuoi += dt;
        const k = Math.min(v.ngaTuoi * 4, Math.PI / 2);
        if (o.userData.fall === 'side') o.rotation.z = -k;
        else if (o.userData.fall !== 'none') o.rotation.x = -k;
        o.position.lerp(v.nha, Math.min(1, dt * 6));
        v.pose?.({ act: 'dead', fall: Math.min(v.ngaTuoi * 3, 1) });
        continue;
      }
      o.rotation.x = 0;
      o.rotation.z = 0;
      if (v.ra) {
        const r = v.ra;
        r.t += dt;
        const k = Math.min(1, r.t / r.dur);
        // Lao tới (0–0,3), ra đòn (0,25–0,7), lùi về (0,7–1).
        const di = k < 0.3 ? k / 0.3 : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        const e = di * di * (3 - 2 * di);
        if (r.toi) o.position.lerpVectors(v.nha, r.toi, e);
        o.position.y = v.kind === 'thuLac' || v.kind === 'thuRong' ? Math.sin(k * Math.PI) * 0.5 : 0;
        const don = THREE.MathUtils.clamp((k - 0.25) / 0.45, 0, 1);
        const dangDi = (k < 0.3 || k > 0.7) && !!r.toi;
        if (r.horn) v.pose?.({ act: 'stand', horn: k, time: t });
        else if (r.ky && laLoiTuong(v.kind) && v.kind !== 'lacTuong') v.pose?.({ act: dangDi ? 'walk' : 'stand', phase: r.t * 14, stride: 0.6, skill: don, time: t });
        else v.pose?.({ act: dangDi ? 'walk' : 'fight', phase: r.t * 14, stride: 0.6, strike: dangDi ? undefined : don, time: t });
        if (k >= 1) {
          v.ra = undefined;
          o.position.copy(v.nha);
        }
        continue;
      }
      o.position.copy(v.nha);
      if (v.rung > 0) {
        v.rung -= dt;
        o.position.x += Math.sin(this.time * 70) * 0.07 * (v.nha.x < 0 ? -1 : 1);
      }
      o.rotation.y = v.huong;
      const thang = this.kq && ((this.kq === 'thang') === v.nha.x < 0);
      if (thang) {
        v.thang = Math.min(1, v.thang + dt * 1.5);
        v.pose?.({ act: 'stand', win: v.thang, time: t });
      } else v.pose?.({ act: 'stand', time: t });
    }
    this.hu.update(dt);
  }

  dispose(): void {
    for (const v of this.nguoi.values()) this.go(v.obj);
    for (const o of this.chau) this.go(o);
    this.hu.clear();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && !(o instanceof THREE.SkinnedMesh)) o.geometry.dispose();
    });
  }
}
