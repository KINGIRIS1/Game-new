// Lò rèn 3×3: lò nón lớn góc sau bên trái, lán đe mái một dốc góc sau bên phải, đe trước lán, sân trước để trống
// (giản lược kiểu 2: một mái chính, xem docs/thiet-ke.md mục Giản lược công trình). Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { above5, lacBird, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { ToonModel, inkThin } from '../toon';
import { type CongTrinh, type LotSpot, type V3, maiGon, partScale, yard } from './chung';

export const LO_REN_LOT = new Lot(3, [
  'NNNWWW',
  'NNNWWW',
  'NNN.A.',
  '......',
  '......',
  '..,,..',
]);

/** Sân lò rèn: đất nện ám khói, sẫm hơn sân thường. */
const SOOT = 0xb0946c;
/** Lò nón lớn quay miệng chéo ra góc trước bên phải (về phía camera), bễ và đe đứng quanh miệng lò. */
const MOUTH_FACE = Math.PI / 4;

/** Lửa nhấp nháy (world.ts cho co giãn theo `userData.flame`). */
function flame(g: THREE.Object3D[], r: number, h: number, color: number, x: number, y: number, z: number): void {
  const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), new THREE.MeshBasicMaterial({ color }));
  f.position.set(x, y, z);
  f.userData.flame = true;
  g.push(f);
}

/** Khói bốc từ (x, y, z) (world.ts cho bay theo `userData.smoke`). */
function smoke(g: THREE.Object3D[], color: number, x: number, y: number, z: number): void {
  const s = new THREE.Group();
  s.userData.smoke = true;
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), mat);
    puff.userData.phase = i / 4;
    s.add(puff);
  }
  s.position.set(x, y, z);
  g.push(s);
}

/**
 * Lò nung hình nón bằng đất sét cỡ `s`, chân lò có hoa văn, miệng lò quay hướng `face` có lửa.
 * `tall`: cao thêm (cấp 6–8), có đai đất và ống lò cao. Trả đỉnh ống lò.
 */
function coneKiln(m: ToonModel, g: THREE.Object3D[], x: number, z: number, s: number, face: number, tall = 1): V3 {
  const p = m.plain;
  const fx = Math.sin(face);
  const fz = Math.cos(face);
  m.band.cyl(0.42 * s, 0.5 * s, 0.25 * s, C.soil, x, 0.125 * s, z, undefined, 12);
  const coneH = 0.95 * s * tall;
  const base = 0.25 * s;
  p.cone(0.45 * s, coneH, C.earth, x, base + coneH / 2, z, undefined, 12);
  if (tall > 1) {
    // Đai đất quấn thân lò.
    for (const t of [0.3, 0.6]) p.add(new THREE.TorusGeometry(0.45 * s * (1 - t) + 0.005, 0.028, 5, 18), C.earthDark, x, base + t * coneH, z, [Math.PI / 2, 0, 0]);
  }
  const chimH = 0.28 * s * tall;
  const top = base + coneH * 0.92;
  p.cyl(0.08 * s, 0.1 * s, chimH, C.earthDark, x, top + chimH / 2, z, undefined, 8);
  const r = 0.45 * s;
  p.box(0.24 * s, 0.22 * s, 0.12 * s, 0x2a1d12, x + fx * r, 0.2 * s, z + fz * r, [0, face, 0]);
  flame(g, 0.1 * s, 0.24 * s, C.fire, x + fx * (r + 0.05 * s), 0.24 * s, z + fz * (r + 0.05 * s));
  flame(g, 0.06 * s, 0.16 * s, C.ember, x + fx * (r + 0.07 * s), 0.22 * s, z + fz * (r + 0.07 * s));
  return [x, top + chimH, z];
}

/** Bốn thợ rèn: quai búa bên đe dưới mép lán, canh miệng lò, hai người giữa sân. */
export function loRenSpots(): LotSpot[] {
  return [
    { job: 'thoRen', x: 0.75, y: 0.06, z: -0.56, ry: 0.25 },
    { job: 'thoRen', x: 0.12, y: 0.06, z: 0.42, ry: -1.3 },
    { job: 'thoRen', x: -0.38, y: 0.06, z: 1.22, ry: -2.0 },
    { job: 'thoRen', x: 0.72, y: 0.06, z: 0.62, ry: 0.15 },
  ];
}

/** Lán đe mái một dốc theo cấp, cao ở trước cho thấy trong lán; cấp 6–8 cao lên; cấp 10 chim Lạc hai góc diềm trước. */
function shed(m: ToonModel, level: number, roof: Roof): void {
  const p = m.plain;
  const up = above5(level);
  const x0 = 0.06;
  const x1 = 1.44;
  const hb = 0.95 + 0.1 * up;
  const hf = hb + 0.3;
  const zb = -1.38;
  const zf = -0.62;
  for (const x of [x0, (x0 + x1) / 2, x1]) {
    p.cyl(0.045, 0.055, hb, C.woodDark, x, hb / 2, zb, undefined, 6);
    p.cyl(0.045, 0.055, hf, C.woodDark, x, hf / 2, zf, undefined, 6);
  }
  p.box(x1 - x0 + 0.08, 0.06, 0.06, C.wood, (x0 + x1) / 2, hb, zb);
  p.box(x1 - x0 + 0.08, 0.06, 0.06, C.wood, (x0 + x1) / 2, hf, zf);
  // Mái một dốc qua hai xà, chìa ra trước và sau.
  const k = (hf - hb) / (zf - zb);
  const zr0 = -1.47;
  const zr1 = -0.46;
  const y0 = hb + 0.06 + k * (zr0 - zb);
  const y1 = hb + 0.06 + k * (zr1 - zb);
  const rx0 = x0 - 0.1;
  const rx1 = 1.52;
  const len = Math.hypot(zr1 - zr0, y1 - y0);
  m.band.box(rx1 - rx0, 0.05, len, roof.main, (rx0 + rx1) / 2, (y0 + y1) / 2, (zr0 + zr1) / 2, [-Math.atan(k), 0, 0]);
  if (roof.trim !== null) for (const [y, z] of [[y0, zr0], [y1, zr1]] as const) p.box(rx1 - rx0 + 0.04, 0.07, 0.07, roof.trim, (rx0 + rx1) / 2, y + 0.02, z);
  if (roof.lac) for (const [x, ry] of [[rx0 + 0.05, -Math.PI / 2], [rx1 - 0.05, Math.PI / 2]] as const) lacBird(m, x, y1 + 0.05, zr1, ry, 0.3);
}

export function makeLoRen(level: number): THREE.Group {
  const m = new ToonModel();
  // Đe, thanh sắt: viền mảnh.
  const n = new ToonModel(inkThin);
  const p = m.plain;
  const L = LO_REN_LOT;
  const up = above5(level);
  const extras: THREE.Object3D[] = [];

  yard(m, 3, SOOT);
  const path = L.zone(',');
  p.box(0.8, 0.03, path.d, C.earth, path.x, 0.055, path.z);

  // Lò nón lớn góc sau bên trái, to dần tới cấp 5; cấp 6–8 cao lên, có đai, khói đen từ ống lò.
  const N = L.zone('N');
  const ks = 1.55 * partScale(level);
  const chimney = coneKiln(m, extras, N.x + 0.05, N.z + 0.05, ks, MOUTH_FACE, 1 + 0.13 * up);
  if (up) smoke(extras, 0x4f4a45, ...chimney);

  // Lán đe góc sau bên phải từ cấp 2 (mái theo cấp).
  if (level >= 2) shed(m, level, maiGon(level));

  // Đe sắt trên gốc gỗ trước lán, thanh sắt nung đỏ trên đe.
  const A = L.zone('A');
  const q = n.plain;
  q.cyl(0.1, 0.12, 0.22, C.woodDark, A.x, 0.11, A.z + 0.05, undefined, 8);
  q.box(0.3, 0.1, 0.14, C.iron, A.x, 0.27, A.z + 0.05);
  q.cone(0.05, 0.14, C.iron, A.x + 0.21, 0.29, A.z + 0.05, [0, 0, -Math.PI / 2], 6);
  n.glow.box(0.16, 0.025, 0.04, C.ember, A.x - 0.02, 0.335, A.z + 0.05);

  const g = m.group();
  for (const c of n.group().children.slice()) g.add(c);
  for (const o of extras) g.add(o);
  return g;
}

export const LO_REN: CongTrinh = { tiles: 3, make: makeLoRen, spots: loRenSpots, view: { half: 2.9, lookY: 0.9, px: 64 } };
