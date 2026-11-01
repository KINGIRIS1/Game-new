// Bãi đất đá 3×3: mỏ đá bên gò. Hố đá bậc thang góc sau bên trái, bãi xẻ đá giữa, đường xe đá ra mặt trước.
// Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import * as THREE from 'three';
import { above5, BRICK, boatRoof, buffalo, roofFor } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import type { ShapeBuilder } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, type LotSpot, yard } from './chung';

export const BAI_DA_LOT = new Lot(3, [
  'PPPPTT',
  'PPPPTT',
  'PPPPqq',
  'rr..XX',
  'KK..VV',
  'KK,,VV',
]);

/** Sân đất nện lẫn bụi đá: sẫm hơn sân thường để đá xẻ sáng màu nổi lên. */
const DUST = 0xb89a6c;
/** Đường xe đá: đất nện sẫm hơn sân. */
const ROAD = 0xa4855a;
/** Mặt đá mới xẻ: sáng hơn đá tảng. */
const CUT = 0xcdc2ad;
/** Đáy hố: cấp 1–3 hố nông màu đất, từ cấp 4 hố sâu tối màu. */
const PIT_SHALLOW = 0x8f6e4a;
const PIT_DEEP = 0x5e544a;

/** Hố đá: mép trái, mép sau (gò), mép phải và mép trước của khối P; đáy hố nằm trong. */
const PIT = { x0: -1.47, x1: 0.47, z0: -1.47, z1: -0.02, floorX0: -1.0, floorX1: 0.3, floorZ0: -1.0, floorZ1: -0.2 };
/** Bậc đá thứ k (từ dưới lên) hình chữ L ôm góc sau bên trái: dải sau tới `xR`, sâu tới `zB`; dải trái rộng tới `xL`, dài tới `zF`. */
const TIERS = [
  { xR: 0.47, zB: -1.0, xL: -1.0, zF: -0.02 },
  { xR: 0.05, zB: -1.2, xL: -1.2, zF: -0.42 },
  { xR: -0.35, zB: -1.32, xL: -1.32, zF: -0.8 },
];

type V3 = [number, number, number];

/** Thanh tròn từ điểm `a` tới điểm `b` (chân tời, cần, dây). */
function rod(b: ShapeBuilder, a: V3, c: V3, r: number, color: number, seg = 5): void {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...c).sub(from);
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  b.cyl(r, r, dir.length(), color, from.x + dir.x / 2, from.y + dir.y / 2, from.z + dir.z / 2, [e.x, e.y, e.z], seg);
}

/** Đá tảng vỡ: (x, z, bán kính). Mấy viên đầu ở bãi đá vỡ (r), mấy viên sau rơi dưới đáy hố. */
const ROCKS: [number, number, number][] = [
  [-0.76, 0.2, 0.2],
  [-1.28, 0.12, 0.15],
  [-1.04, 0.08, 0.12],
  [-0.62, 0.42, 0.12],
  [-1.32, 0.44, 0.1],
];
const PIT_ROCKS: [number, number, number][] = [
  [-0.18, -0.36, 0.11],
  [-0.8, -0.78, 0.13],
  [0.12, -0.6, 0.1],
  [-0.84, -0.36, 0.1],
];

/** Năm thợ đá: dưới đáy hố, bên đá vỡ, cạnh chồng đá xẻ, hai người giữa bãi xẻ. Mỗi người một cột x − z khác nhau. */
export function baiDaSpots(): LotSpot[] {
  return [
    { job: 'thoDa', x: -0.4, y: 0.06, z: -0.6, ry: 0.7 },
    { job: 'thoDa', x: -1.1, y: 0.06, z: 0.38, ry: 0.9 },
    { job: 'thoDa', x: 0.3, y: 0.06, z: 0.45, ry: 1.57 },
    { job: 'thoDa', x: -0.25, y: 0.06, z: 0.75, ry: 0.4 },
    { job: 'thoDa', x: 0.32, y: 0.06, z: 0.92, ry: 0.8 },
  ];
}

/** Hố đá lộ thiên khoét vào gò: bậc đá chữ L ôm góc sau bên trái, đáy hố, mép hố; cấp 4 hố sâu có bậc gỗ xuống. */
function quarry(m: ToonModel, level: number): void {
  const p = m.plain;
  const up = above5(level);
  const deep = level >= 4;
  const tiers = deep ? 3 : 2;
  const th = (deep ? 0.22 : 0.18) + 0.06 * up;
  const rim = deep ? 0.26 : 0.12;
  const { x0, z0 } = PIT;
  for (let k = 0; k < tiers; k++) {
    const t = TIERS[k];
    const top = th * (k + 1);
    const color = k % 2 ? CUT : C.rock;
    p.box(t.xR - x0, top, t.zB - z0, color, (x0 + t.xR) / 2, top / 2, (z0 + t.zB) / 2);
    p.box(t.xL - x0, top, t.zF - t.zB, color, (x0 + t.xL) / 2, top / 2, (t.zB + t.zF) / 2);
  }
  const top = th * tiers;
  // Đỉnh gò: đá tảng, khóm cỏ.
  p.sphere(0.24, C.rock, -1.18, top, -1.18, [1.1, 0.75, 1.05], 7);
  p.sphere(0.16, C.rockDark, -0.86, top - 0.02, -1.3, [1.2, 0.7, 1], 7);
  for (const [x, z] of [[-1.38, -0.95], [-0.95, -1.4], [-1.32, -1.38]] as const) p.cone(0.06, 0.18, C.leaf[1], x, top + 0.07, z, undefined, 4);
  // Đáy hố, mép trước, mép phải.
  const { floorX0, floorX1, floorZ0, floorZ1 } = PIT;
  p.box(floorX1 - floorX0, 0.03, floorZ1 - floorZ0, deep ? PIT_DEEP : PIT_SHALLOW, (floorX0 + floorX1) / 2, 0.04, (floorZ0 + floorZ1) / 2);
  p.box(PIT.x1 - floorX0, rim, PIT.z1 - floorZ1, C.rock, (floorX0 + PIT.x1) / 2, rim / 2, (floorZ1 + PIT.z1) / 2);
  p.box(PIT.x1 - floorX1, rim, floorZ1 - floorZ0, C.rock, (floorX1 + PIT.x1) / 2, rim / 2, (floorZ0 + floorZ1) / 2);
  if (level >= 2) {
    // Khối đá đang xẻ dở trên bậc dưới.
    p.box(0.3, 0.16, 0.24, CUT, 0.24, th + 0.08, -1.22);
    p.box(0.26, 0.012, 0.012, C.ink, 0.24, th + 0.16, -1.1);
  }
  if (deep) {
    // Bậc gỗ từ sân qua mép hố xuống đáy.
    for (const [y, z] of [[0.08, 0.06], [rim + 0.02, -0.11], [rim * 0.55, -0.3], [0.1, -0.45]] as const) p.box(0.34, 0.04, 0.15, C.wood, -0.62, y, z);
    for (const s of [-1, 1]) rod(p, [-0.62 + s * 0.18, rim + 0.04, -0.1], [-0.62 + s * 0.18, 0.05, -0.5], 0.02, C.woodDark, 4);
  }
}

export function makeBaiDa(level: number): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = BAI_DA_LOT;
  const roof = roofFor(level);
  const up = above5(level);

  yard(m, 3, DUST);
  quarry(m, level);

  // Đường xe đá: đất nện sẫm, hai vệt bánh xe, từ bãi xẻ ra mặt trước.
  const road = L.zone(',');
  const rz0 = 0.45;
  const rz1 = road.z + road.d / 2 - 0.03;
  p.box(0.8, 0.02, rz1 - rz0, ROAD, road.x, 0.055, (rz0 + rz1) / 2);
  for (const s of [-1, 1]) p.box(0.05, 0.01, rz1 - rz0 - 0.1, C.earthDark, road.x + s * 0.2, 0.066, (rz0 + rz1) / 2);

  // Đá tảng vỡ: nhiều dần theo cấp; từ cấp 3 có đá rơi dưới đáy hố.
  const rocks = ROCKS.slice(0, Math.min(2 + Math.floor(level / 2), ROCKS.length));
  const fallen = PIT_ROCKS.slice(0, 1 + Math.min(Math.max(level - 2, 0), PIT_ROCKS.length - 1));
  for (const [i, [x, z, r]] of [...rocks, ...fallen].entries()) p.sphere(r, i % 2 ? C.rockDark : C.rock, x, 0.07 + r * 0.3, z, [1.2, 0.7, 1], 6);

  if (level >= 2) {
    // Hai chồng đá xẻ vuông; cấp 6–8 mỗi cấp cao thêm một khối.
    for (const [x, n] of [[0.8, 3 + up], [1.2, 2 + up]] as const) {
      for (let i = 0; i < n; i++) p.box(0.3, 0.17, 0.24, i % 2 ? C.rock : CUT, x, 0.145 + i * 0.17, 0.25, [0, (i % 2 ? 1 : -1) * 0.12, 0]);
    }
  }
  if (level >= 3 && level < 6) {
    // Tời gỗ chữ A: hai chân dựng bên phải hố chụm đỉnh trên hố, dây néo sau, tời quay tay kéo khối đá lên.
    const apex: V3 = [0.18, 1.5, -0.88];
    for (const fz of [-1.3, -0.56]) rod(p, [0.72, 0, fz], apex, 0.035, C.woodDark);
    p.sphere(0.055, C.wood, ...apex, [1, 1, 1], 6);
    rod(p, apex, [1.44, 0.04, -0.92], 0.008, C.cream, 3);
    for (const z of [-1.18, -0.66]) p.box(0.06, 0.44, 0.06, C.woodDark, 1.15, 0.22, z);
    p.cyl(0.07, 0.07, 0.6, C.wood, 1.15, 0.4, -0.92, [Math.PI / 2, 0, 0], 8);
    p.box(0.03, 0.2, 0.03, C.woodDark, 1.15, 0.36, -0.59);
    rod(p, [1.15, 0.46, -0.92], apex, 0.008, C.cream, 3);
    rod(p, apex, [apex[0], 0.7, apex[2]], 0.008, C.cream, 3);
    p.box(0.26, 0.18, 0.22, CUT, apex[0], 0.6, apex[2]);
  }
  if (level >= 5) {
    // Xe gỗ chở đá xẻ, càng xe chĩa ra trước.
    const vx = 1.2;
    const vz = 0.95;
    for (const s of [-1, 1]) p.cyl(0.16, 0.16, 0.05, C.woodDark, vx + s * 0.25, 0.16, vz, [0, 0, Math.PI / 2], 10);
    p.cyl(0.03, 0.03, 0.5, C.woodDark, vx, 0.16, vz, [0, 0, Math.PI / 2], 5);
    p.box(0.42, 0.06, 0.5, C.wood, vx, 0.3, vz);
    for (const s of [-1, 1]) p.box(0.04, 0.12, 0.5, C.woodDark, vx + s * 0.19, 0.38, vz);
    for (const s of [-1, 1]) rod(p, [vx + s * 0.12, 0.3, vz + 0.24], [vx + s * 0.1, 0.12, vz + 0.5], 0.02, C.woodDark, 4);
    p.box(0.3, 0.16, 0.22, CUT, vx, 0.41, vz - 0.1);
    p.box(0.26, 0.14, 0.2, C.rock, vx + 0.02, 0.4, vz + 0.13, [0, 0.3, 0]);
  }
  if (level >= 6) {
    // Tời lớn: cột cái, chống chéo, cần với ra trên hố thả khối đá; bánh xe tời quay tay dưới lán mái theo cấp.
    const mx = 0.88;
    const mz = -1.28;
    const mh = 1.9 + 0.15 * up;
    p.cyl(0.055, 0.075, mh, C.woodDark, mx, mh / 2, mz, undefined, 6);
    for (const [fx, fz] of [[1.3, -1.2], [0.62, -1.44]] as const) rod(p, [fx, 0, fz], [mx, 0.9, mz], 0.03, C.wood);
    const tip: V3 = [0.02, mh * 0.72, -0.8];
    rod(p, [mx, 0.35, mz], tip, 0.04, C.wood);
    rod(p, [mx, mh, mz], tip, 0.008, C.cream, 3);
    rod(p, tip, [tip[0], 0.98, tip[2]], 0.008, C.cream, 3);
    p.box(0.32, 0.24, 0.28, CUT, tip[0], 0.86, tip[2]);
    for (const x of [0.8, 1.38]) for (const z of [-1.0, -0.56]) p.cyl(0.03, 0.035, 0.9, C.woodDark, x, 0.45, z, undefined, 5);
    boatRoof(m, roof, { length: 0.86, width: 0.64, lift: 0.14, drop: 0.18, thickness: 0.05 }, 1.07, 1.1, -0.78);
    p.add(new THREE.TorusGeometry(0.26, 0.03, 6, 16), C.woodDark, 1.09, 0.38, -0.78);
    for (let i = 0; i < 4; i++) p.box(0.03, 0.52, 0.03, C.wood, 1.09, 0.38, -0.78, [0, 0, (i * Math.PI) / 4]);
    for (const z of [-0.95, -0.61]) p.box(0.05, 0.4, 0.05, C.woodDark, 1.09, 0.2, z);
    p.cyl(0.03, 0.03, 0.38, C.woodDark, 1.09, 0.38, -0.78, [Math.PI / 2, 0, 0], 5);
  }
  const extras: THREE.Object3D[] = [];
  if (level >= 7) {
    // Lò nung gạch đất: lò vòm gạch có hoa văn, miệng lò đỏ lửa, ống khói sau bốc khói; chồng gạch bên cạnh (cấp 8 cao gấp đôi).
    const K = L.zone('K');
    const kx = K.x - 0.06;
    const kz = K.z + 0.02;
    p.cyl(0.38, 0.4, 0.16, C.earthDark, kx, 0.08, kz, undefined, 12);
    m.band.add(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), BRICK, kx, 0.15, kz, [0, 0, 0], [0.36, 0.44, 0.36]);
    p.box(0.22, 0.2, 0.1, 0x2a1d12, kx, 0.25, kz + 0.32);
    m.glow.box(0.15, 0.08, 0.03, C.fire, kx, 0.2, kz + 0.37);
    const chimney: V3 = [kx + 0.12, 1.05, kz - 0.2];
    p.cyl(0.07, 0.09, 0.66, C.earthDark, chimney[0], 0.72, chimney[2], undefined, 8);
    p.cyl(0.09, 0.09, 0.05, BRICK, chimney[0], 1.03, chimney[2], undefined, 8);
    const layers = level >= 8 ? 6 : 3;
    for (let i = 0; i < layers; i++) for (let j = 0; j < 2; j++) p.box(0.18, 0.07, 0.15, i % 2 ? 0x9a4628 : BRICK, -0.6, 0.085 + i * 0.075, 0.61 + j * 0.17, [0, i % 2 ? 0.08 : 0, 0]);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 6), new THREE.MeshBasicMaterial({ color: C.ember }));
    flame.position.set(kx, 0.24, kz + 0.37);
    flame.userData.flame = true;
    extras.push(flame);
    const smoke = new THREE.Group();
    smoke.userData.smoke = true;
    const mat = new THREE.MeshBasicMaterial({ color: 0x9a948c, transparent: true, opacity: 0.5, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), mat);
      puff.userData.phase = i / 4;
      smoke.add(puff);
    }
    smoke.position.set(...chimney);
    extras.push(smoke);
  }
  if (level >= 8) {
    // Giàn cần vọt: cột chạc, đòn dài, đầu này đá đối trọng, đầu kia thúng đá trên hố.
    const qz = -0.3;
    for (const dz of [-0.07, 0.07]) p.box(0.05, 0.96, 0.04, C.woodDark, 0.85, 0.48, qz + dz);
    rod(p, [1.42, 0.68, qz], [-0.12, 1.38, qz], 0.03, C.wood);
    p.sphere(0.13, C.rockDark, 1.32, 0.6, qz, [1.1, 0.9, 1], 7);
    rod(p, [-0.1, 1.37, qz], [-0.1, 0.72, qz], 0.008, C.cream, 3);
    p.cyl(0.12, 0.09, 0.14, C.thatch, -0.1, 0.64, qz, undefined, 8);
    p.sphere(0.08, C.rock, -0.1, 0.72, qz, [1, 0.6, 1], 6);
    // Trâu đứng cạnh xe đá, dây buộc vào càng xe.
    buffalo(p, 0.72, 0.98);
    rod(p, [0.72, 0.42, 1.2], [1.08, 0.18, 1.42], 0.008, C.cream, 3);
  }
  const g = m.group();
  for (const o of extras) g.add(o);
  return g;
}

export const BAI_DA: CongTrinh = { tiles: 3, make: makeBaiDa, spots: baiDaSpots, view: { half: 2.9, lookY: 0.9, px: 64 } };
