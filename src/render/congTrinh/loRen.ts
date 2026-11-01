// Lò rèn 3×3: lò nón lớn góc sau bên trái, lán đe phía sau, sân làm việc giữa, lò thứ hai và bễ bên trái,
// giá binh khí bên phải, đống than quặng và sân đúc đồng ra phía trước. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { above5, drum, IRON_BLADE, roofFor, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import type { ShapeBuilder } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, partScale, yard } from './chung';

export const LO_REN_LOT = new Lot(3, [
  'NNNWWW',
  'NNNWWW',
  'NNN.A.',
  '77B..R',
  '77B..R',
  'qq,,88',
]);

/** Sân lò rèn: đất nện ám khói, sẫm hơn sân thường. */
const SOOT = 0xb0946c;
const COAL = 0x2f2a27;
const ORE = 0x7a4634;
const LEATHER = 0x7a4a2a;
/** Lò nón lớn quay miệng chéo ra góc trước bên phải (về phía camera), bễ và đe đứng quanh miệng lò. */
const MOUTH_FACE = Math.PI / 4;

type V3 = [number, number, number];

/** Thanh tròn từ điểm `a` tới điểm `b` (vòi bễ, khung nồi đồng). */
function rod(b: ShapeBuilder, a: V3, c: V3, r: number, color: number, seg = 5): void {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...c).sub(from);
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  b.cyl(r, r, dir.length(), color, from.x + dir.x / 2, from.y + dir.y / 2, from.z + dir.z / 2, [e.x, e.y, e.z], seg);
}

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

/** Bốn thợ rèn: quai búa bên đe dưới mép lán, kéo bễ, xúc than, giữa sân (cấp 8 trông nồi đồng). */
export function loRenSpots(): LotSpot[] {
  return [
    { job: 'thoRen', x: 0.75, y: 0.06, z: -0.56, ry: 0.25 },
    { job: 'thoRen', x: 0.12, y: 0.06, z: 0.42, ry: -1.3 },
    { job: 'thoRen', x: -0.38, y: 0.06, z: 1.22, ry: -2.0 },
    { job: 'thoRen', x: 0.72, y: 0.06, z: 0.62, ry: 0.15 },
  ];
}

/** Lán đe mái một dốc, cao ở trước cho thấy trong lán; cấp 4 dài sang phải, cấp 6–8 cao lên. Trả chiều cao mép mái trước. */
function shed(m: ToonModel, level: number, roof: Roof): number {
  const p = m.plain;
  const up = above5(level);
  const long = level >= 4;
  const x0 = 0.06;
  const mid = 1.05;
  const x1 = long ? 1.44 : mid;
  const hb = level >= 6 ? 1.15 + 0.1 * (up - 1) : 0.95;
  const hf = hb + 0.3;
  const zb = -1.38;
  const zf = -0.62;
  for (const x of long ? [x0, mid, x1] : [x0, x1]) {
    p.cyl(0.04, 0.05, hb, C.woodDark, x, hb / 2, zb, undefined, 6);
    p.cyl(0.04, 0.05, hf, C.woodDark, x, hf / 2, zf, undefined, 6);
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
  const rx1 = Math.min(x1 + 0.1, 1.52);
  const len = Math.hypot(zr1 - zr0, y1 - y0);
  m.band.box(rx1 - rx0, 0.05, len, roof.main, (rx0 + rx1) / 2, (y0 + y1) / 2, (zr0 + zr1) / 2, [-Math.atan(k), 0, 0]);
  if (roof.trim !== null) {
    for (const [y, z] of [[y0, zr0], [y1, zr1]] as const) p.box(rx1 - rx0 + 0.04, 0.07, 0.07, roof.trim, (rx0 + rx1) / 2, y + 0.02, z);
  }
  // Trong lán: máng nước tôi sắt; tới cấp 5 có giá treo kìm búa ở vách sau.
  p.box(0.48, 0.18, 0.22, C.wood, 0.42, 0.11, -1.1);
  p.box(0.42, 0.02, 0.16, C.paddyWater, 0.42, 0.2, -1.1);
  if (level < 6) {
    p.box(0.8, 0.04, 0.04, C.woodDark, 0.55, 0.78, zb + 0.03);
    for (let i = 0; i < 3; i++) {
      const x = 0.3 + i * 0.25;
      p.box(0.03, 0.26, 0.03, C.iron, x, 0.64, zb + 0.05);
      p.box(0.1, 0.05, 0.05, C.iron, x, 0.5, zb + 0.05);
    }
  }
  if (long) {
    // Bàn gỗ, phôi đồng đặt trên bàn.
    for (const dx of [-0.2, 0.2]) for (const dz of [-0.1, 0.1]) p.box(0.04, 0.34, 0.04, C.woodDark, 1.22 + dx, 0.17, -1.05 + dz);
    p.box(0.5, 0.05, 0.3, C.wood, 1.22, 0.36, -1.05);
    p.box(0.26, 0.03, 0.06, C.bronze, 1.2, 0.4, -1.05, [0, 0.3, 0]);
  }
  if (level >= 6) {
    // Giá treo binh khí sắt dọc vách sau lán: kiếm, giáo, rìu sắt treo ngay ngắn.
    const rz = zb + 0.06;
    for (const y of [0.42, 1.0]) p.box(x1 - x0 - 0.1, 0.05, 0.05, C.woodDark, (x0 + x1) / 2, y, rz);
    for (let i = 0; i < 6; i++) {
      const x = 0.24 + i * 0.2;
      if (i % 2) {
        p.box(0.05, 0.48, 0.02, IRON_BLADE, x, 0.7, rz + 0.04);
        p.box(0.14, 0.03, 0.03, C.bronze, x, 0.45, rz + 0.04);
      } else {
        p.cyl(0.012, 0.012, 0.58, C.woodDark, x, 0.7, rz + 0.04, undefined, 4);
        p.cone(0.04, 0.15, IRON_BLADE, x, 1.06, rz + 0.04, undefined, 4);
      }
    }
  }
  return hf;
}

export function makeLoRen(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = LO_REN_LOT;
  const roof = roofFor(level);
  const up = above5(level);
  const extras: THREE.Object3D[] = [];

  yard(m, 3, SOOT);
  // Lối vào: ba phiến đá lát từ mặt trước vào giữa sân.
  const path = L.zone(',');
  for (const [i, dz] of [0.06, -0.24, -0.54].entries()) p.box(0.4, 0.03, 0.24, i % 2 ? C.rockDark : C.rock, path.x + (i % 2 ? 0.05 : -0.04), 0.06, path.z + dz, [0, (i - 1) * 0.12, 0]);

  // Lò nón lớn: to hơn dáng cũ chừng 15%; cấp 6–8 cao lên, có đai, khói đen từ ống lò.
  const N = L.zone('N');
  const ks = 1.38 * partScale(level);
  const chimney = coneKiln(m, extras, N.x, N.z, ks, MOUTH_FACE, 1 + 0.13 * up);
  if (up) smoke(extras, 0x4f4a45, ...chimney);
  const mouth: V3 = [N.x + Math.sin(MOUTH_FACE) * 0.45 * ks, 0.2, N.z + Math.cos(MOUTH_FACE) * 0.45 * ks];

  shed(m, level, roof);

  // Đe sắt trên gốc gỗ trước lán, thanh sắt nung đỏ trên đe.
  const A = L.zone('A');
  p.cyl(0.1, 0.12, 0.22, C.woodDark, A.x, 0.11, A.z + 0.05, undefined, 8);
  p.box(0.3, 0.1, 0.14, C.iron, A.x, 0.27, A.z + 0.05);
  p.box(0.18, 0.06, 0.1, C.iron, A.x, 0.2, A.z + 0.05);
  p.cone(0.05, 0.14, C.iron, A.x + 0.21, 0.29, A.z + 0.05, [0, 0, -Math.PI / 2], 6);
  m.glow.box(0.16, 0.025, 0.04, C.ember, A.x - 0.02, 0.335, A.z + 0.05);

  if (level >= 2) {
    // Đống than và đống quặng sắt; cấp 4 thêm thúng than, cấp 6 đống to hơn.
    const big = level >= 6 ? 1.2 : 1;
    p.sphere(0.22 * big, COAL, -1.2, 0.05, 1.24, [1.05, 0.6, 0.95], 8);
    p.sphere(0.18 * big, ORE, -0.8, 0.05, 1.22, [1, 0.6, 1], 8);
    for (const [x, z, c] of [[-1.0, 1.42, COAL], [-0.62, 1.1, ORE], [-1.42, 1.06, COAL]] as const) p.sphere(0.05, c, x, 0.07, z, [1, 0.7, 1], 5);
    if (level >= 4) {
      p.cyl(0.12, 0.09, 0.14, C.thatch, -0.62, 0.12, 1.36, undefined, 8);
      p.sphere(0.1, COAL, -0.62, 0.19, 1.36, [1, 0.5, 1], 6);
    }
  }
  const B = L.zone('B');
  if (level >= 2 && level < 6) {
    // Bễ da: hai ván kẹp túi da, cán kéo, vòi thổi vào miệng lò.
    const bx = B.x;
    const bz = B.z;
    p.box(0.32, 0.04, 0.46, C.wood, bx, 0.12, bz);
    p.box(0.28, 0.12, 0.42, LEATHER, bx, 0.2, bz);
    p.box(0.32, 0.04, 0.46, C.wood, bx, 0.28, bz, [0.12, 0, 0]);
    p.box(0.05, 0.04, 0.2, C.woodDark, bx, 0.33, bz + 0.3);
    rod(p, [bx, 0.18, bz - 0.22], mouth, 0.03, C.iron);
  } else if (level >= 6) {
    // Ống bễ đôi bằng gỗ bọc da: hai ống đứng, cán pít-tông nối đòn ngang, ống gió dưới chân vào miệng lò.
    for (const z of [B.z - 0.2, B.z + 0.14]) {
      p.cyl(0.11, 0.12, 0.6, C.wood, B.x, 0.32, z, undefined, 10);
      p.cyl(0.115, 0.115, 0.08, LEATHER, B.x, 0.64, z, undefined, 10);
      p.cyl(0.02, 0.02, 0.3, C.woodDark, B.x, 0.82, z, undefined, 5);
    }
    p.box(0.05, 0.03, 0.5, C.woodDark, B.x, 0.97, B.z - 0.03);
    rod(p, [B.x, 0.12, B.z - 0.3], mouth, 0.035, C.woodDark);
  }

  const S = L.zone('7');
  if (level >= 3 && level < 7) {
    // Lò nhỏ thứ hai, miệng lò quay ra trước.
    coneKiln(m, extras, S.x, S.z, 0.9, 0);
  } else if (level >= 7) {
    // Lò luyện cao: thân tròn đắp đất có đai sắt, lửa đỏ rực trên miệng, máng sắt nóng chảy ra góc trước.
    const H = 1.3 + 0.15 * (up - 2);
    p.cyl(0.36, 0.44, H, C.earth, S.x, H / 2, S.z, undefined, 12);
    const bands = level >= 8 ? [0.3, 0.7, 1.05, 1.3] : [0.3, 0.7, 1.05];
    for (const y of bands) {
      const r = 0.44 - (0.08 * y) / H + 0.02;
      p.cyl(r, r, 0.05, C.iron, S.x, y, S.z, undefined, 12);
    }
    p.cyl(0.37, 0.37, 0.06, C.earthDark, S.x, H + 0.01, S.z, undefined, 12);
    flame(extras, 0.24, 0.55, C.fire, S.x, H + 0.25, S.z);
    flame(extras, 0.15, 0.38, C.ember, S.x, H + 0.21, S.z);
    const tx = S.x + Math.sin(MOUTH_FACE) * 0.52;
    const tz = S.z + Math.cos(MOUTH_FACE) * 0.52;
    p.box(0.12, 0.05, 0.3, C.earthDark, tx, 0.09, tz, [0, MOUTH_FACE, 0]);
    m.glow.box(0.07, 0.02, 0.26, C.ember, tx, 0.12, tz, [0, MOUTH_FACE, 0]);
  }
  if (level >= 5) {
    // Giá binh khí đồng bên phải sân: hai cột, xà trên; ba ngọn giáo và hai rìu đồng dựng nghiêng tựa xà, quay ra sân.
    const R = L.zone('R');
    const rx = R.x + 0.12;
    for (const z of [R.z - 0.38, R.z + 0.38]) p.cyl(0.03, 0.035, 0.8, C.woodDark, rx, 0.4, z, undefined, 5);
    p.box(0.05, 0.05, 0.86, C.wood, rx, 0.78, R.z);
    p.box(0.05, 0.04, 0.86, C.wood, rx, 0.1, R.z);
    for (const dz of [-0.26, -0.1, 0.06]) {
      const foot: V3 = [rx - 0.26, 0.03, R.z + dz];
      const top: V3 = [rx - 0.02, 1.0, R.z + dz];
      rod(p, foot, top, 0.014, C.woodDark, 4);
      // Mũi giáo đồng theo hướng cán.
      const a = Math.atan2(top[0] - foot[0], top[1] - foot[1]);
      p.cone(0.045, 0.18, C.bronze, top[0] + Math.sin(a) * 0.08, top[1] + Math.cos(a) * 0.08, top[2], [0, 0, -a], 4);
    }
    for (const dz of [0.22, 0.33]) {
      rod(p, [rx - 0.2, 0.03, R.z + dz], [rx - 0.03, 0.62, R.z + dz], 0.016, C.woodDark, 4);
      p.box(0.03, 0.16, 0.14, C.bronze, rx - 0.06, 0.6, R.z + dz + 0.06, [0.2, 0, 0]);
    }
  }
  if (level >= 8) {
    // Sân đúc đồng: khuôn đất đúc trống, nồi nấu đồng trên giá nghiêng rót nước đồng đỏ rực vào khuôn;
    // trống đồng vừa đúc xong trên giá gỗ thấp bên phải.
    const E = L.zone('8');
    const mx = E.x - 0.28;
    const mz = E.z;
    p.cyl(0.2, 0.22, 0.32, C.earthDark, mx, 0.2, mz, undefined, 12);
    p.cyl(0.21, 0.21, 0.04, C.earth, mx, 0.37, mz, undefined, 12);
    rod(p, [mx - 0.22, 0.05, mz + 0.1], [mx - 0.02, 0.6, mz + 0.1], 0.03, C.woodDark);
    rod(p, [mx + 0.22, 0.05, mz + 0.1], [mx + 0.02, 0.6, mz + 0.1], 0.03, C.woodDark);
    p.cyl(0.1, 0.07, 0.13, C.bronzeDark, mx, 0.58, mz + 0.06, [0.6, 0, 0], 8);
    const pour = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.16, 6), new THREE.MeshBasicMaterial({ color: C.ember }));
    pour.position.set(mx, 0.46, mz + 0.02);
    pour.userData.flame = true;
    extras.push(pour);
    m.glow.cyl(0.14, 0.14, 0.02, C.ember, mx, 0.395, mz, undefined, 12);
    for (const dx of [-0.15, 0.15]) for (const dz of [-0.12, 0.12]) p.cyl(0.025, 0.025, 0.2, C.woodDark, E.x + 0.25 + dx, 0.12, mz + dz, undefined, 5);
    p.box(0.4, 0.04, 0.32, C.wood, E.x + 0.25, 0.23, mz);
    drum(m, E.x + 0.25, mz, 0.56, 0.21);
  }

  const g = m.group();
  for (const o of extras) g.add(o);
  return g;
}

export const LO_REN: CongTrinh = { tiles: 3, make: makeLoRen, spots: loRenSpots, view: { half: 2.9, lookY: 0.9, px: 64 } };
