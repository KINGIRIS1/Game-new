import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BUILDINGS, type BuildingType } from '../game/defs';
import { GATES_LEVEL } from '../game/doanhTrai';
import { CELL, type Lot } from './lot';
import { C } from './palette';
import { outlineOf, toon } from './toon';

/**
 * Bậc tam cấp trước cổng, lối vào công trình đứng cao hơn đất quanh (chủ dự án: chỗ tiếp giáp cổng làm bậc tam cấp
 * cho thấy công trình ở trên cao). Chỉ để nhìn: ba bậc đá từ mép móng xuống mặt đất phía ngoài.
 */

/** Một chỗ cổng trên mép móng, tọa độ móng (tâm móng là gốc, mặt trước là +z): tâm cổng, bề rộng, hướng ra ngoài. */
export interface CongMong {
  x: number;
  z: number;
  w: number;
  ox: number;
  oz: number;
}

/** Bậc tam cấp dài chừng này ô ra khỏi mép móng. */
export const TAM_CAP_DAI = 1;
/** Đất phía ngoài thấp hơn móng ít nhất chừng này thì mới có bậc. */
export const TAM_CAP_MIN = 0.15;
const BAC = 3;

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

/** Một bậc tam cấp trong cảnh: điểm giữa mép móng (mặt móng `y`), hướng ra ngoài, bề rộng, độ hạ xuống tới mặt đất. */
export interface TamCap {
  x: number;
  y: number;
  z: number;
  dx: number;
  dz: number;
  w: number;
  ha: number;
}

/** Hình các bậc tam cấp gộp một lưới (kèm viền mực); không có bậc nào thì `null`. */
export function buildTamCap(list: readonly TamCap[]): THREE.Group | null {
  if (!list.length) return null;
  const geos: THREE.BufferGeometry[] = [];
  const sang = new THREE.Color(C.rock);
  const toi = new THREE.Color(C.rockDark);
  const mau = new THREE.Color();
  for (const s of list) {
    const goc = Math.atan2(s.dx, s.dz);
    const sau = TAM_CAP_DAI / BAC;
    for (let k = 0; k < BAC; k++) {
      // Mặt bậc k ngang mặt dốc ở mép trong của bậc (bậc đầu ngang móng) nên bậc nào cũng nhô khỏi dốc; thân bậc cắm
      // xuống dưới mặt đất.
      const top = -(s.ha * k) / BAC;
      const day = -s.ha - 0.3;
      const g = new THREE.BoxGeometry(s.w, top - day, sau);
      g.translate(0, (top + day) / 2, (k + 0.5) * sau);
      g.rotateY(goc);
      g.translate(s.x, s.y, s.z);
      mau.copy(sang).lerp(toi, k / (BAC - 1) / 2);
      const n = g.getAttribute('position').count;
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.set([mau.r, mau.g, mau.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geos.push(g);
    }
  }
  const geo = mergeGeometries(geos, false)!;
  for (const g of geos) g.dispose();
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geo, toon);
  mesh.receiveShadow = true;
  group.add(mesh, outlineOf(geo));
  return group;
}
