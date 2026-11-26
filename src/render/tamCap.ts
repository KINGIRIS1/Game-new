import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BUILDINGS, type BuildingType } from '../game/defs';
import { GATES_LEVEL } from '../game/doanhTrai';
import type { KeKieu } from './ke';
import { CELL, type Lot } from './lot';
import { outlineOf, toon } from './toon';

/**
 * Bậc tam cấp trước cổng, lối vào công trình đứng cao hơn đất quanh (chủ dự án: chỗ tiếp giáp cổng làm bậc tam cấp
 * cho thấy công trình ở trên cao; rồi: bậc lẫn vào nền khi đắp cao). Chỉ để nhìn: bậc đá đi từ mặt móng xuống tới chỗ
 * gặp mặt đất phía ngoài, mỗi bậc cao chừng `BAC_CAO`, nên đắp càng cao bậc càng nhiều, càng dài; hai bên có má bậc đá
 * chạy dọc theo dốc bậc. Người đi qua lối ấy bước trên mặt bậc (`tamCapY`).
 */

/** Một chỗ cổng trên mép móng, tọa độ móng (tâm móng là gốc, mặt trước là +z): tâm cổng, bề rộng, hướng ra ngoài. */
export interface CongMong {
  x: number;
  z: number;
  w: number;
  ox: number;
  oz: number;
}

/** Đất cách mép móng một ô thấp hơn móng ít nhất chừng này thì mới có bậc. */
export const TAM_CAP_MIN = 0.15;
/** Mỗi bậc cao chừng này (đơn vị thế giới), sâu `BAC_SAU` ô. */
export const BAC_CAO = 0.17;
export const BAC_SAU = 0.28;
/** Ít nhất, nhiều nhất chừng này bậc. Lối xuống ngắn quá (gặp móng khác) thì bậc cao hơn `BAC_CAO`. */
export const BAC_IT = 3;
export const BAC_NHIEU = 12;
/**
 * Lối xuống bị chặn (gặp móng khác, tường) nên không đủ chỗ xuống tới đất thì bậc cao hơn, tới chừng này; vẫn chưa tới
 * đất thì bậc cuối đứng trên một khối đá xuống tới đất.
 */
const BAC_TRAN = 0.3;
/** Má bậc dày, nhô cao hơn mũi bậc chừng này. */
const MA_DAY = 0.13;
const MA_NHO = 0.11;
/** Thân bậc, má bậc cắm xuống dưới mặt đất thấp nhất chừng này. */
const CHAN = 0.2;

/**
 * Các chỗ cổng của một công trình: Điện là cổng lầu trước sân chầu, doanh trại theo số cổng của cấp, loại khác là chỗ
 * lối đi (`,`) của bản vẽ ô con chạm mép móng. Loại sát sông, ruộng, vườn, đường, đồ trang trí, tường không có.
 */
export function tamCapCho(type: BuildingType, level: number, lot?: Lot): CongMong[] {
  const def = BUILDINGS[type];
  // Ruộng, vườn là đất trũng, không có cổng.
  if (def.nearRiver || def.decor || def.w < 2 || type === 'ruong' || type === 'ruongNep' || type === 'vuon') return [];
  if (type === 'dien') return [{ x: 0, z: def.d / 2, w: 3, ox: 0, oz: 1 }];
  if (type === 'doanhTrai') {
    const sides: [number, number][] = level >= GATES_LEVEL ? [[0, 1], [0, -1], [-1, 0], [1, 0]] : [[0, 1]];
    return sides.map(([sx, sz]) => ({ x: (sx * def.w) / 2, z: (sz * def.d) / 2, w: 1.6, ox: sx, oz: sz }));
  }
  if (!lot) return [];
  const out: CongMong[] = [];
  const half = lot.tiles / 2;
  const at = (i: number) => -half + (i + 0.5) * CELL;
  // Bốn mép bản vẽ: gom từng dải ô lối đi liền nhau thành một cổng.
  const mep: { cell: (k: number) => string; make: (c: number, w: number) => CongMong }[] = [
    { cell: (k) => lot.rows[lot.n - 1][k], make: (c, w) => ({ x: c, z: half, w, ox: 0, oz: 1 }) },
    { cell: (k) => lot.rows[0][k], make: (c, w) => ({ x: c, z: -half, w, ox: 0, oz: -1 }) },
    { cell: (k) => lot.rows[k][0], make: (c, w) => ({ x: -half, z: c, w, ox: -1, oz: 0 }) },
    { cell: (k) => lot.rows[k][lot.n - 1], make: (c, w) => ({ x: half, z: c, w, ox: 1, oz: 0 }) },
  ];
  for (const m of mep) {
    let k = 0;
    while (k < lot.n) {
      if (m.cell(k) !== ',') {
        k++;
        continue;
      }
      let e = k;
      while (e + 1 < lot.n && m.cell(e + 1) === ',') e++;
      out.push(m.make((at(k) + at(e)) / 2, Math.max(0.9, (e - k + 1) * CELL + 0.2)));
      k = e + 1;
    }
  }
  return out;
}

/** Chỗ làm bậc: điểm giữa mép móng (mặt móng `y`), hướng ra ngoài (`dx`, `dz`, độ dài 1), bề rộng lối. */
export interface TamCapCho {
  x: number;
  y: number;
  z: number;
  dx: number;
  dz: number;
  w: number;
}

/** Bậc đã xếp: số bậc, mỗi bậc cao `cao`, sâu `sau` ô; đáy thân bậc `day`. */
export interface TamCap extends TamCapCho {
  n: number;
  cao: number;
  sau: number;
  day: number;
}

/**
 * Xếp bậc cho một chỗ cổng: `dat(d, s)` là mặt đất ở điểm cách mép móng d ô ra ngoài, lệch ngang s ô khỏi tâm lối;
 * `xa` là lối xuống dài được bao nhiêu ô (gặp móng khác, tường, sông thì dừng). Bậc đi xuống tới chỗ gặp mặt đất (lấy
 * chỗ đất cao nhất ngang lối, để bậc cuối không chìm); lối ngắn thì bậc cao hơn, tới `BAC_TRAN`. Không có chỗ (đất ngoài
 * cổng không thấp hơn móng, lối bị chặn sát mép) thì `null`.
 */
export function xepTamCap(c: TamCapCho, dat: (d: number, s: number) => number, xa: number): TamCap | null {
  const ngang = [-c.w / 2, 0, c.w / 2];
  const cao = (d: number) => Math.max(...ngang.map((s) => dat(d, s)));
  if (c.y - cao(1) < TAM_CAP_MIN && c.y - cao(0.05) < TAM_CAP_MIN) return null;
  const nMax = Math.min(BAC_NHIEU, Math.floor(xa / BAC_SAU + 1e-6));
  if (nMax < 2) return null;
  // Ít bậc nhất mà mỗi bậc không cao quá `BAC_CAO` vẫn xuống tới đất ở chân bậc.
  let n = Math.min(BAC_IT, nMax);
  while (n < nMax && c.y - cao(n * BAC_SAU) > n * BAC_CAO) n++;
  const h = Math.min((c.y - cao(n * BAC_SAU)) / n, BAC_TRAN);
  if (h <= 0.02) return null;
  let low = Infinity;
  for (let k = 0; k <= 2 * n; k++) for (const s of ngang) low = Math.min(low, dat((k * BAC_SAU) / 2, s * 1.2));
  return { ...c, n, cao: h, sau: BAC_SAU, day: Math.min(low, c.y - n * h) - CHAN };
}

/** Mặt bậc dưới chân người ở (px, pz) (cùng hệ tọa độ với chỗ bậc), hay `null` nếu không đứng trên bậc nào. */
export function tamCapY(list: readonly TamCap[], px: number, pz: number): number | null {
  for (const s of list) {
    const ox = px - s.x;
    const oz = pz - s.z;
    const d = ox * s.dx + oz * s.dz;
    const ngang = ox * s.dz - oz * s.dx;
    if (d < 0 || d >= s.n * s.sau || Math.abs(ngang) > s.w / 2) continue;
    return s.y - (Math.floor(d / s.sau) + 1) * s.cao;
  }
  return null;
}

/** Màu đá bậc theo kiểu kè (`ke.ts`): mặt bậc, mặt đứng, má bậc. */
const MAU_DA: Record<KeKieu, [number, number, number]> = {
  // Đất nện cọc tre: bậc đá ong.
  0: [0xdcbb8c, 0x8a6440, 0x7f5a36],
  // Đá hộc: đá xám vàng.
  1: [0xd2c9b8, 0x7e7466, 0x6f655a],
  // Đá xanh đẽo vuông, có diềm đồng.
  2: [0xc6ced0, 0x67737b, 0x5c666e],
  3: [0xc6ced0, 0x67737b, 0x5c666e],
};
/** Vạch mực dọc mũi mỗi bậc cho thấy rõ từng bậc (viền mực ngoài chỉ vẽ quanh cả khối). */
const MUC = new THREE.Color(0x3b3129);
const MUC_DAY = 0.035;

/** Tô màu khối: mặt hướng lên một màu, mặt đứng một màu. */
function toMau(g: THREE.BufferGeometry, tren: THREE.Color, dung: THREE.Color): void {
  const nor = g.getAttribute('normal');
  const n = nor.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = nor.getY(i) > 0.5 ? tren : dung;
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/**
 * Khối dài dọc lối, tọa độ lối (x ngang, z ra ngoài): ngang [x0, x1], dọc [z0, z1], đáy `day`, mặt trên đi thẳng từ
 * `y0` ở z0 xuống `y1` ở z1.
 */
function khoiDoc(x0: number, x1: number, z0: number, z1: number, day: number, y0: number, y1: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(x1 - x0, 1, z1 - z0);
  g.translate((x0 + x1) / 2, 0.5, (z0 + z1) / 2);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const t = (p.getZ(i) - z0) / (z1 - z0);
    p.setY(i, p.getY(i) > 0.5 ? y0 + (y1 - y0) * t : day);
  }
  g.computeVertexNormals();
  return g;
}

/** Hình các bậc tam cấp gộp một lưới (kèm viền mực); không có bậc nào thì `null`. */
export function buildTamCap(list: readonly TamCap[], kieu: KeKieu = 1): THREE.Group | null {
  if (!list.length) return null;
  const geos: THREE.BufferGeometry[] = [];
  const [hTren, hDung, hMa] = MAU_DA[kieu];
  const tren = new THREE.Color(hTren);
  const dung = new THREE.Color(hDung);
  const ma = new THREE.Color(hMa);
  const maTren = ma.clone().lerp(tren, 0.35);
  const m = new THREE.Matrix4();
  for (const s of list) {
    const goc = Math.atan2(s.dx, s.dz);
    m.makeRotationY(goc).setPosition(s.x, 0, s.z);
    const dai = s.n * s.sau;
    for (let k = 0; k < s.n; k++) {
      // Bậc k: mặt bậc thấp hơn mặt móng (k + 1) bậc, thân cắm xuống tới đáy chung.
      const top = s.y - (k + 1) * s.cao;
      const g = new THREE.BoxGeometry(s.w, top - s.day, s.sau);
      g.translate(0, (top + s.day) / 2, (k + 0.5) * s.sau);
      toMau(g, tren, dung);
      geos.push(g.applyMatrix4(m));
      const muc = new THREE.BoxGeometry(s.w, MUC_DAY, MUC_DAY);
      muc.translate(0, top - MUC_DAY / 2 + 0.004, (k + 1) * s.sau - MUC_DAY / 2 + 0.004);
      toMau(muc, MUC, MUC);
      geos.push(muc.applyMatrix4(m));
    }
    // Hai má bậc dọc theo dốc bậc, nhô hơn mũi bậc một chút, cuối má có trụ đá nhỏ.
    for (const ben of [-1, 1]) {
      const x0 = ben < 0 ? -s.w / 2 - MA_DAY : s.w / 2;
      const ma1 = khoiDoc(x0, x0 + MA_DAY, 0, dai, s.day, s.y + MA_NHO, s.y - s.n * s.cao + MA_NHO);
      toMau(ma1, maTren, ma);
      geos.push(ma1.applyMatrix4(m));
      const tru = new THREE.BoxGeometry(MA_DAY + 0.04, 1, MA_DAY + 0.04);
      const yTru = s.y - s.n * s.cao + MA_NHO + 0.14;
      tru.scale(1, yTru - s.day, 1);
      tru.translate(x0 + MA_DAY / 2, (yTru + s.day) / 2, dai - MA_DAY / 2);
      toMau(tru, maTren, ma);
      geos.push(tru.applyMatrix4(m));
    }
  }
  const geo = mergeGeometries(geos, false)!;
  for (const g of geos) g.dispose();
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geo, toon);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh, outlineOf(geo));
  return group;
}
