// Cây dại, tảng đá mọc trên ô trống (kinh đô lớn PR 4, luật ở `game/cayDa.ts`), chạm vào để dọn. Mỗi loại ba dáng:
// cây là bụi chuối có buồng chuối xanh và bắp chuối, bụi sim chín tím lẫn hoa sim, cây sung con sai quả; đá là một
// tảng to có rêu, ba hòn chụm nhau, tảng dẹt nằm có dương xỉ. Mỗi cái nằm gọn trong một ô (gốc là tâm ô, mặt đất y = 0),
// to hơn khóm cỏ, hoa trang trí ô trống cho người chơi thấy mà chạm.

import * as THREE from 'three';
import type { CayDaKind } from '../game/defs';
import { C } from './palette';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ShapeBuilder } from './shapes';
import { inkThin, outlineOf, toon } from './toon';

const CHUOI_THAN = 0x8fae52;
const CHUOI_LA = [0x6fa040, 0x7fb04a, 0x5f9036];
const CHUOI_QUA = 0x9cbc48;
const BAP_CHUOI = 0x7a2e4a;
const SIM_LA = [0x4f7a34, 0x5f8a3c, 0x45702e];
const SIM_QUA = 0x5a2a6a;
const SIM_HOA = 0xd27ab8;
const SUNG_QUA = [0x9ab84a, 0xc86a4a, 0xb0c058];
const REU = 0x6f8f3a;

/** Lá chuối: phiến dài bản to, cong võng, tỏa từ ngọn thân ra hướng `a`, chúc xuống `droop`. */
function laChuoi(p: ShapeBuilder, x: number, y: number, z: number, a: number, len: number, droop: number, color: number): void {
  const leaf = new THREE.SphereGeometry(1, 8, 5);
  leaf.scale(len / 2, 0.012, 0.09);
  // Phiến lá nằm dọc trục x, đẩy ra để cuống ở gốc rồi nghiêng chúc xuống, xoay theo hướng.
  leaf.translate(len / 2, 0, 0);
  leaf.rotateZ(-droop);
  leaf.rotateY(-a);
  p.add(leaf, color, x, y, z);
  // Gân giữa.
  const rib = new THREE.BoxGeometry(len * 0.95, 0.016, 0.012);
  rib.translate(len * 0.475, 0.008, 0);
  rib.rotateZ(-droop);
  rib.rotateY(-a);
  p.add(rib, 0xa8c46a, x, y, z);
}

/** Bụi chuối: ba thân giả cao thấp, lá to xòe từ ngọn, một buồng chuối xanh trĩu xuống có bắp chuối tím. */
function buiChuoi(p: ShapeBuilder): void {
  const stems: [number, number, number][] = [
    [0.02, 0.0, 0.78],
    [-0.16, 0.1, 0.56],
    [0.15, 0.13, 0.42],
  ];
  stems.forEach(([x, z, h], i) => {
    p.cyl(0.045, 0.06, h, CHUOI_THAN, x, h / 2, z, undefined, 7);
    const n = i === 0 ? 5 : 4;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + i * 0.9;
      laChuoi(p, x, h, z, a, 0.42 - i * 0.05, 0.2 + (k % 2) * 0.35, CHUOI_LA[(k + i) % 3]);
    }
  });
  // Buồng chuối treo dưới tán thân chính, nải chuối xanh và bắp chuối tím ở cuối.
  const bx = 0.08;
  const bz = 0.12;
  p.cyl(0.014, 0.014, 0.22, CHUOI_THAN, bx, 0.68, bz - 0.05, [0.5, 0, 0], 5);
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + r * 0.5;
      p.cyl(0.02, 0.016, 0.09, CHUOI_QUA, bx + Math.cos(a) * 0.05, 0.62 - r * 0.065, bz + Math.sin(a) * 0.05, [0.35 * Math.sin(a), 0, -0.35 * Math.cos(a)], 5);
    }
  }
  p.cone(0.045, 0.13, BAP_CHUOI, bx, 0.3, bz, [Math.PI, 0, 0], 7);
}

/** Bụi sim: tán tròn nhiều khối lá, quả sim chín tím và vài bông hoa sim hồng. */
function buiSim(p: ShapeBuilder): void {
  const blobs: [number, number, number, number][] = [
    [0, 0.3, 0, 0.24],
    [-0.17, 0.22, 0.08, 0.17],
    [0.17, 0.2, -0.05, 0.18],
    [0.03, 0.2, 0.18, 0.15],
    [-0.05, 0.45, -0.06, 0.15],
  ];
  blobs.forEach(([x, y, z, r], i) => p.sphere(r, SIM_LA[i % 3], x, y, z, [1, 0.85, 1], 8));
  for (let k = 0; k < 14; k++) {
    const a = k * 2.39;
    const y = 0.16 + (k % 5) * 0.08;
    const r = 0.23 - Math.abs(y - 0.3) * 0.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (k % 4 === 3) p.sphere(0.035, SIM_HOA, x, y, z, [1, 0.5, 1], 6);
    else p.sphere(0.03, SIM_QUA, x, y, z, [1, 1, 1], 6);
  }
  for (const s of [-1, 1]) p.cyl(0.02, 0.025, 0.12, C.trunk, s * 0.06, 0.06, 0, undefined, 5);
}

/** Cây sung con: thân nghiêng nhẹ, tán ba khối lá, quả sung chùm trên thân. */
function caySung(p: ShapeBuilder): void {
  p.cyl(0.04, 0.065, 0.9, C.trunk, 0, 0.45, 0, [0.05, 0, 0.06], 7);
  p.cyl(0.025, 0.035, 0.32, C.trunk, 0.1, 0.78, 0.02, [0, 0, -0.8], 6);
  const crown: [number, number, number, number][] = [
    [0.02, 1.0, 0, 0.26],
    [0.2, 0.9, 0.05, 0.19],
    [-0.15, 0.88, -0.05, 0.18],
  ];
  crown.forEach(([x, y, z, r], i) => p.sphere(r, C.leaf[i % 4], x, y, z, [1, 0.8, 1], 9));
  for (let k = 0; k < 9; k++) {
    const a = k * 2.1;
    p.sphere(0.03, SUNG_QUA[k % 3], Math.cos(a) * 0.065, 0.25 + (k % 4) * 0.1, Math.sin(a) * 0.065, [1, 1.1, 1], 6);
  }
  // Rễ nổi quanh gốc.
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + 0.4;
    p.box(0.16, 0.035, 0.04, C.trunk, Math.cos(a) * 0.08, 0.03, Math.sin(a) * 0.08, [0, -a, 0]);
  }
}

/** Đá góc cạnh: khối mười hai mặt dẹt theo `sy`, xoay ngẫu nhiên đều tay. */
function hon(p: ShapeBuilder, x: number, z: number, r: number, sy: number, color: number, spin: number): void {
  p.add(new THREE.DodecahedronGeometry(r, 0), color, x, r * sy * 0.62, z, [spin, spin * 1.7, spin * 0.6], [1.15, sy, 1]);
}

/** Dương xỉ nhỏ: lá kép mảnh tỏa ra từ gốc. */
function duongXi(p: ShapeBuilder, x: number, z: number, s: number): void {
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const leaf = new THREE.BoxGeometry(0.2 * s, 0.01, 0.05 * s);
    leaf.translate(0.1 * s, 0, 0);
    leaf.rotateZ(0.5);
    leaf.rotateY(-a);
    p.add(leaf, C.leaf[k % 4], x, 0.04, z);
  }
}

function tangDa(p: ShapeBuilder): void {
  hon(p, 0, 0, 0.3, 0.75, C.rock, 0.3);
  // Rêu phủ lưng đá, cỏ mọc chân đá.
  p.sphere(0.13, REU, -0.05, 0.36, 0.02, [1.4, 0.3, 1.1], 8);
  p.sphere(0.07, REU, 0.12, 0.3, 0.1, [1.3, 0.3, 1], 7);
  duongXi(p, 0.27, 0.2, 0.9);
}

function chumDa(p: ShapeBuilder): void {
  hon(p, -0.08, 0.04, 0.22, 0.9, C.rock, 0.7);
  hon(p, 0.17, -0.06, 0.16, 0.8, C.rockDark, 1.4);
  hon(p, 0.06, 0.2, 0.11, 0.7, 0xb0a594, 2.2);
  p.sphere(0.06, REU, -0.1, 0.33, 0.02, [1.3, 0.35, 1], 7);
}

function phienDa(p: ShapeBuilder): void {
  // Tảng đá dẹt nằm sát đất, mặt nứt một đường, hòn nhỏ kê bên, dương xỉ mọc ở kẽ.
  hon(p, 0, 0, 0.3, 0.42, C.rock, 0.15);
  p.box(0.3, 0.012, 0.02, C.rockDark, 0.02, 0.2, 0.02, [0, 0.6, 0]);
  hon(p, 0.24, 0.19, 0.09, 0.75, C.rockDark, 0.9);
  p.sphere(0.07, REU, -0.12, 0.19, -0.05, [1.5, 0.3, 1], 7);
  duongXi(p, -0.24, 0.2, 1);
}

const DRAW: Record<CayDaKind, ((p: ShapeBuilder) => void)[]> = {
  cay: [buiChuoi, buiSim, caySung],
  da: [tangDa, chumDa, phienDa],
};

/** Cỡ phóng mỗi loại: to hơn khóm cỏ, hoa trang trí ô trống cho dễ thấy, dễ chạm, mà vẫn gọn trong ô. */
export const CAY_DA_SCALE: Record<CayDaKind, number> = { cay: 1.3, da: 1.25 };

const geometries = new Map<string, THREE.BufferGeometry>();

/** Hình (đã phóng theo loại, gốc ở tâm ô) của dáng `v`, dựng một lần. Ít mặt vì cả kinh đô có thể có vài chục cái. */
export function cayDaGeometry(kind: CayDaKind, v: number): THREE.BufferGeometry {
  const draw = DRAW[kind];
  const i = ((v % draw.length) + draw.length) % draw.length;
  const key = `${kind}:${i}`;
  let geo = geometries.get(key);
  if (!geo) {
    const b = new ShapeBuilder();
    b.detail = 0.6;
    draw[i](b);
    geo = b.geometry();
    geo.scale(CAY_DA_SCALE[kind], CAY_DA_SCALE[kind], CAY_DA_SCALE[kind]);
    geometries.set(key, geo);
  }
  return geo;
}

/** Mesh có viền mực mảnh, đổ bóng (viền mực không đổ bóng). */
function inked(geo: THREE.BufferGeometry): THREE.Group {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(geo, toon);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh, outlineOf(geo, inkThin));
  return g;
}

/** Mô hình một cây dại hay tảng đá dáng `v`, gốc ở tâm ô (vẽ riêng lúc đang mọc lên). */
export function makeCayDa(kind: CayDaKind, v: number): THREE.Group {
  return inked(cayDaGeometry(kind, v));
}

/** Một cây đá trong lô: dáng, chỗ (tọa độ thế giới, mặt đất), góc xoay. */
export interface CayDaPlace {
  kind: CayDaKind;
  v: number;
  x: number;
  y: number;
  z: number;
  ry: number;
}

/** Gộp mọi cây đá đã lớn thành một mesh (một lần vẽ, một lần vẽ viền, một lần đổ bóng), dựng lại khi danh sách đổi. */
export function buildCayDaBatch(list: CayDaPlace[]): THREE.Group | null {
  if (!list.length) return null;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const parts = list.map((c) => {
    const geo = cayDaGeometry(c.kind, c.v).clone();
    geo.applyMatrix4(m.compose(new THREE.Vector3(c.x, c.y, c.z), q.setFromAxisAngle(up, c.ry), new THREE.Vector3(1, 1, 1)));
    return geo;
  });
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return merged ? inked(merged) : null;
}

/** Gỡ lô đã gộp: trả bộ nhớ hình gộp và viền mực của nó (hình từng dáng giữ lại để dùng tiếp). */
export function disposeCayDaBatch(g: THREE.Group): void {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}
