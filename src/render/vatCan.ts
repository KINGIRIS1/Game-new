// Vật cản giữa bãi chiến phó bản (`src/game/baiChien.ts`): mảng cỏ chỗ vật cản đứng (mặt bãi lõm vào, viền sẫm như
// mép bãi), mặt nước nông, bãi bùn có lau, và mô hình từng dáng (khóm tre, đá, rào tre, rào cọc, cụm chông, đống rơm,
// thuyền mắc cạn, đó cá, xe củi đổ, nhà sàn). Hình đọc cùng bố cục với luật đi, nên lính đi vòng đúng chỗ thấy vật cản.
// Tọa độ theo bãi như `Relief.field()` ở `battlefield.ts`: x từ 0 tới `FIELD.w`, z 0 là cuối bãi phía giặc.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sdHinh, type Bai, type DangCan, type Hinh, type VatCan, type VungCham } from '../game/baiChien';
import { FIELD } from '../game/defs';
import { makeNhaSan } from './buildings';
import { reedTemplates } from './lauSay';
import { bambooClump, boatHull } from './models';
import { C } from './palette';
import { ShapeBuilder, instanceTemplates, seeded, type Placement } from './shapes';
import { inkThin, outlineOf, toon } from './toon';

const { smoothstep } = THREE.MathUtils;

/** Màu mặt nước nông, nước sâu hơn ở giữa, cát ướt quanh nước; bùn, bùn ướt. */
const NUOC = { shallow: 0x6fa8a2, deep: 0x5b948f, bank: 0xa89468 };
const BUN = { rim: 0x8f7d54, wet: 0x6d5c3e, puddle: 0x6f7462 };

/** Mảng đất phẳng (cỏ, nước, bùn) đè lên mặt bãi: đẩy về phía camera cho khỏi nhòe với mặt bãi. */
const decalMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

/** Một điểm trên viền hình: tọa độ (x, z) và pháp tuyến ra ngoài (nx, nz). */
type Diem = [x: number, z: number, nx: number, nz: number];

/**
 * Viền hình `h` nở thêm `grow` ô (âm là thu vào), mỗi bước chừng 0,15 ô, đi một vòng quanh hình. Đoạn đầu tròn ra
 * hình viên thuốc, khối vuông ra chữ nhật bo góc bán kính `grow`.
 */
export function vienHinh(h: Hinh, grow: number): Diem[] {
  const out: Diem[] = [];
  const arc = (cx: number, cz: number, r: number, a0: number, a1: number) => {
    if (r < 1e-6) {
      out.push([cx, cz, Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2)]);
      return;
    }
    const n = Math.max(2, Math.ceil(((a1 - a0) * r) / 0.15));
    for (let k = 0; k < n; k++) {
      const a = a0 + ((a1 - a0) * k) / n;
      out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, Math.cos(a), Math.sin(a)]);
    }
  };
  const line = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number) => {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.15));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, nx, nz]);
  };
  if (h.k === 'tron') {
    arc(h.x, h.z, h.r + grow, 0, Math.PI * 2);
    return out;
  }
  if (h.k === 'doan') {
    const l = Math.hypot(h.bx - h.ax, h.bz - h.az);
    const ex = l > 1e-9 ? (h.bx - h.ax) / l : 1;
    const ez = l > 1e-9 ? (h.bz - h.az) / l : 0;
    const a = Math.atan2(ez, ex);
    if (!h.vuong) {
      const r = h.half + grow;
      line(h.ax + ez * r, h.az - ex * r, h.bx + ez * r, h.bz - ex * r, ez, -ex);
      arc(h.bx, h.bz, r, a - Math.PI / 2, a + Math.PI / 2);
      line(h.bx - ez * r, h.bz + ex * r, h.ax - ez * r, h.az + ex * r, -ez, ex);
      arc(h.ax, h.az, r, a + Math.PI / 2, a + (3 * Math.PI) / 2);
      return out;
    }
    // Khối vuông: bốn góc, cạnh nở ra `grow`, góc bo tròn bán kính `grow`.
    const g = Math.max(grow, 0);
    const hw = h.half + Math.min(grow, 0);
    const corner = (s: number, t: number) => [h.ax + (h.bx - h.ax) * s - ez * hw * t, h.az + (h.bz - h.az) * s + ex * hw * t] as const;
    const steps: [number, number, number][] = [
      [0, -1, a - Math.PI / 2],
      [1, -1, a],
      [1, 1, a + Math.PI / 2],
      [0, 1, a + Math.PI],
    ];
    steps.forEach(([s, t, a0], i) => {
      const [cx, cz] = corner(s, t);
      const [ns, nt] = steps[(i + 1) % 4];
      const [dx, dz] = corner(ns, nt);
      const nx = Math.cos(a0);
      const nz = Math.sin(a0);
      line(cx + nx * g, cz + nz * g, dx + nx * g, dz + nz * g, nx, nz);
      arc(dx, dz, g, a0, a0 + Math.PI / 2);
    });
    return out;
  }
  // Đa giác: dời từng đỉnh ra theo pháp tuyến trung bình của hai cạnh kề, chia nhỏ từng cạnh.
  const pts = h.pts;
  const nrm = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const dx = q[0] - p[0];
    const dz = q[1] - p[1];
    const l = Math.hypot(dx, dz) || 1;
    let nx = dz / l;
    let nz = -dx / l;
    const mx = (p[0] + q[0]) / 2;
    const mz = (p[1] + q[1]) / 2;
    if (sdHinh(h, mx + nx * 0.01, mz + nz * 0.01) < sdHinh(h, mx, mz)) (nx = -nx), (nz = -nz);
    return [nx, nz] as const;
  });
  const moved = pts.map((p, i) => {
    const [ax, az] = nrm[(i + pts.length - 1) % pts.length];
    const [bx, bz] = nrm[i];
    let nx = ax + bx;
    let nz = az + bz;
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    const k = grow / Math.max(0.35, nx * bx + nz * bz);
    return [p[0] + nx * k, p[1] + nz * k] as const;
  });
  moved.forEach((p, i) => {
    const q = moved[(i + 1) % moved.length];
    line(p[0], p[1], q[0], q[1], nrm[i][0], nrm[i][1]);
  });
  return out;
}

/** Viền lượn nhẹ như nét vẽ tay: mỗi điểm đẩy ra ngoài 0 tới `amp` ô theo hạt giống. */
function luon(pts: Diem[], amp: number, seed: number): Diem[] {
  const r = seeded(seed);
  const p1 = r() * 6;
  const p2 = r() * 6;
  return pts.map(([x, z, nx, nz]) => {
    const w = (amp * (Math.sin(x * 2.3 + z * 1.1 + p1) + Math.sin(x * 0.9 - z * 2.7 + p2) + 2)) / 4;
    return [x + nx * w, z + nz * w, nx, nz];
  });
}

/** Mảng phẳng theo viền `pts` ở độ cao `y`, tô màu từng đỉnh theo `color`. Giữ trong vùng đất phẳng quanh bãi. */
function mangPhang(pts: Diem[], y: number, color: (x: number, z: number, out: THREE.Color) => THREE.Color): THREE.BufferGeometry {
  const lim = (x: number) => Math.min(FIELD.w + 1.45, Math.max(-1.45, x));
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(lim(x), -z))), 1);
  geo.rotateX(-Math.PI / 2).translate(0, y, 0);
  geo.deleteAttribute('uv');
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) color(pos.getX(i), pos.getZ(i), c).toArray(colors, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/** Gộp các mảng phẳng thành một lưới đất (nhận bóng, không đổ bóng). */
function luoiDat(parts: THREE.BufferGeometry[]): THREE.Mesh | null {
  if (!parts.length) return null;
  const geo = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  const mesh = new THREE.Mesh(geo, decalMaterial);
  mesh.receiveShadow = true;
  mesh.userData.ground = true;
  mesh.userData.vatCan = true;
  return mesh;
}

/** Màu bãi, màu đất ngoài bãi (cỏ) tại một điểm. */
export interface MauBai {
  /** Màu mặt bãi đất giẫm. */
  fill: number;
  /** Màu đất ngoài bãi ở (x, z): mảng cỏ dưới vật cản tô đúng màu đất quanh bãi. */
  ground: (x: number, z: number, out: THREE.Color) => THREE.Color;
}

/** Khoảng cách có dấu tới hình chữ nhật của bãi: âm ở trong. */
function sdBai(x: number, z: number): number {
  const dx = Math.max(-x, x - FIELD.w);
  const dz = Math.max(-z, z - FIELD.d);
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0);
}

/**
 * Dựng một dáng vật cản vào `p` (khung tọa độ `p.frame` đặt theo vật cản bằng `khung`). Dáng dựng sẵn từ mẫu có màu
 * riêng (khóm tre) thì đẩy hình đã đặt chỗ vào `them`; mọi hình gộp làm một lưới.
 */
type Ve = (p: ShapeBuilder, h: Hinh, rand: () => number, them: THREE.BufferGeometry[]) => void;

/** Ma trận đặt vật cản: gốc ở tâm hình, trục x dọc theo đoạn. */
function datCho(h: Hinh): THREE.Matrix4 {
  if (h.k === 'doan') {
    const at = new THREE.Vector3((h.ax + h.bx) / 2, 0, (h.az + h.bz) / 2);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-(h.bz - h.az), h.bx - h.ax));
    return new THREE.Matrix4().compose(at, q, new THREE.Vector3(1, 1, 1));
  }
  const x = h.k === 'tron' ? h.x : h.pts.reduce((s, p) => s + p[0], 0) / h.pts.length;
  const z = h.k === 'tron' ? h.z : h.pts.reduce((s, p) => s + p[1], 0) / h.pts.length;
  return new THREE.Matrix4().makeTranslation(x, 0, z);
}

/** Đặt khung vẽ của `p` theo hình. Trả về nửa dài (đoạn; tròn là 0) và bán kính hay nửa dày. */
function khung(p: ShapeBuilder, h: Hinh): { half: number; r: number } {
  p.frame = datCho(h);
  if (h.k === 'doan') return { half: Math.hypot(h.bx - h.ax, h.bz - h.az) / 2, r: h.half };
  return { half: 0, r: h.k === 'tron' ? h.r : 1 };
}

/** Khóm tre: vài bụi tre thấp (như tre rừng quanh bãi, thấp hơn) đứng sát nhau, chân có bụi lá. */
const tre: Ve = (p, h, rand, them) => {
  const { r } = khung(p, h);
  const n = r < 1 ? 3 : 4;
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.6;
    const d = r * (0.42 + rand() * 0.1);
    const clump = bambooClump(4 + (i % 2), 1.05 + rand() * 0.25, 101 + Math.floor(rand() * 1000), false, true);
    m.compose(new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6), new THREE.Vector3(1, 1, 1));
    clump.geometry.applyMatrix4(m.premultiply(p.frame!));
    them.push(clump.geometry);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rand();
    p.sphere(r * 0.3, C.leaf[(i + 2) % 4], Math.cos(a) * r * 0.62, 0.08, Math.sin(a) * r * 0.62, [1, 0.55, 1], 6);
  }
};

/** Tảng đá to nằm phục, vài hòn nhỏ quanh chân. */
const da: Ve = (p, h, rand) => {
  const { r } = khung(p, h);
  p.add(new THREE.DodecahedronGeometry(r * 0.82, 0), C.rock, 0, r * 0.16, 0, [rand(), rand() * 6, rand() * 0.4], [1, 0.72, 0.95]);
  const k = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2 + rand();
    const s = r * (0.24 + rand() * 0.12);
    p.add(new THREE.DodecahedronGeometry(s, 0), i % 2 ? C.rockDark : C.rock, Math.cos(a) * r * 0.72, s * 0.3, Math.sin(a) * r * 0.72, [rand(), rand() * 6, rand()], [1, 0.75, 1]);
  }
};

/** Rào tre: cọc cách nhau 0,3 ô, hai thanh ngang buộc dây. */
const rao: Ve = (p, h, rand) => {
  const { half } = khung(p, h);
  for (let x = -half; x <= half + 1e-6; x += 0.3) {
    const hgt = 0.7 + rand() * 0.12;
    p.cyl(0.035, 0.04, hgt, rand() < 0.3 ? C.woodLight : C.bamboo, x, hgt / 2, (rand() - 0.5) * 0.06, [(rand() - 0.5) * 0.1, 0, (rand() - 0.5) * 0.1], 5);
  }
  for (const y of [0.28, 0.56]) p.cyl(0.028, 0.028, half * 2 + 0.2, C.bamboo, 0, y, 0.05, [0, 0, Math.PI / 2], 5);
  // Bụi cỏ dưới chân rào.
  for (let x = -half; x <= half; x += 0.9) p.sphere(0.18, C.leaf[2], x + rand() * 0.3, 0.06, -0.12, [1.3, 0.5, 1], 6);
};

/** Rào cọc nhọn (đoạn) hay cụm chông (tròn). */
const coc: Ve = (p, h, rand) => {
  const { half, r } = khung(p, h);
  if (h.k === 'doan') {
    // Hai hàng cọc so le, chúc về phía giặc; quãng gãy có cọc đổ nằm.
    for (let x = -half - 0.1; x <= half + 0.1 + 1e-6; x += 0.2) {
      const row = Math.round((x + half) / 0.2) % 2 ? 0.08 : -0.08;
      if (rand() < 0.14) {
        p.cyl(0.05, 0.055, 0.8, C.bamboo, x, 0.06, row + 0.25, [Math.PI / 2 - 0.15, rand() * 0.6, 0], 5);
        continue;
      }
      const hgt = 0.7 + rand() * 0.3;
      const lean = -0.12 - rand() * 0.1;
      p.cyl(0.055, 0.065, hgt, C.bamboo, x, hgt / 2, row, [lean, 0, (rand() - 0.5) * 0.12], 5);
      p.cone(0.06, 0.18, C.woodLight, x, hgt + 0.08, row + Math.sin(lean) * hgt * 0.5, [lean, 0, 0], 5);
    }
    p.cyl(0.03, 0.03, half * 2 + 0.3, C.woodDark, 0, 0.32, 0, [0, 0, Math.PI / 2], 5);
    return;
  }
  // Cụm chông: cọc tre vót nhọn cắm chếch tỏa ra mọi phía từ một ụ đất, như con nhím.
  p.sphere(r * 0.45, C.earthDark, 0, 0, 0, [1, 0.5, 1], 8);
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.3;
    const tilt = 0.55 + rand() * 0.35;
    const len = r * (1.05 + rand() * 0.35);
    // Cọc dựng theo trục y rồi nghiêng ra ngoài theo hướng `a`.
    const dx = Math.cos(a) * Math.sin(tilt);
    const dz = Math.sin(a) * Math.sin(tilt);
    const dy = Math.cos(tilt);
    const rot: [number, number, number] = [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt];
    const bx = Math.cos(a) * r * 0.15;
    const bz = Math.sin(a) * r * 0.15;
    p.cyl(0.035, 0.05, len, i % 3 ? C.bamboo : 0x98b457, bx + (dx * len) / 2, (dy * len) / 2, bz + (dz * len) / 2, rot, 5);
    p.cone(0.045, 0.16, C.woodLight, bx + dx * (len + 0.06), dy * (len + 0.06), bz + dz * (len + 0.06), rot, 5);
  }
};

/** Đống rơm: chân tròn, mái rơm phồng, cây sào cắm đỉnh. */
const rom: Ve = (p, h, rand) => {
  const { r } = khung(p, h);
  p.cyl(r * 0.88, r * 0.94, 0.32, C.thatchDark, 0, 0.16, 0, undefined, 10);
  p.sphere(r * 0.9, C.thatch, 0, 0.32, 0, [1, 0.95, 1], 10);
  p.cone(r * 0.32, 0.3, C.thatchDark, 0, 0.32 + r * 0.85, 0, undefined, 8);
  p.cyl(0.03, 0.03, 0.45, C.woodDark, 0, 0.42 + r * 0.95, 0, [(rand() - 0.5) * 0.2, 0, 0.1], 5);
  // Rơm rơi vãi quanh chân.
  for (let i = 0; i < 3; i++) {
    const a = rand() * Math.PI * 2;
    p.box(0.3, 0.04, 0.12, C.thatch, Math.cos(a) * r * 0.95, 0.02, Math.sin(a) * r * 0.95, [0, a, 0]);
  }
};

/** Đó cá đan bằng tre nằm nghiêng giữa nước nông, cọc cắm giữ. */
const chum: Ve = (p, h, rand) => {
  const { r } = khung(p, h);
  const traps: [number, number, number, number][] = [
    [-0.12, -0.1, 0.4, 1],
    [0.22, 0.2, -2.2, 0.72],
  ];
  for (const [x, z, a, s] of traps) {
    const len = r * 1.5 * s;
    p.cyl(0.24 * s, 0.07 * s, len, C.thatchDark, x, 0.24 * s, z, [0, a, Math.PI / 2], 9);
    p.cyl(0.25 * s, 0.25 * s, 0.06, C.woodDark, x - Math.cos(a) * len * 0.5, 0.24 * s, z + Math.sin(a) * len * 0.5, [0, a, Math.PI / 2], 9);
  }
  for (const [x, z] of [[-0.35, 0.15], [0.3, -0.25], [0.05, 0.4]]) p.cyl(0.03, 0.035, 0.75, C.woodDark, x, 0.3, z, [(rand() - 0.5) * 0.2, 0, (rand() - 0.5) * 0.2], 5);
};

/** Xe củi đổ: thùng xe lật nghiêng, một bánh dựng, một bánh nằm, củi lăn lóc. */
const xeCui: Ve = (p, h, rand) => {
  const { half, r } = khung(p, h);
  p.box(1.0, 0.32, r * 1.5, C.wood, -half * 0.35, 0.3, 0, [0, 0, 0.45]);
  p.box(1.05, 0.05, r * 1.6, C.woodDark, -half * 0.35 - 0.12, 0.08, 0, [0, 0, 0.45]);
  p.cyl(0.3, 0.3, 0.06, C.woodDark, -half * 0.35 + 0.1, 0.3, r * 0.75, [Math.PI / 2, 0, 0], 10);
  p.cyl(0.3, 0.3, 0.06, C.woodDark, -half * 0.35 - 0.2, 0.04, -r * 0.55, undefined, 10);
  p.cyl(0.04, 0.04, 0.9, C.woodLight, -half - 0.05, 0.08, 0.1, [0, 0.2, Math.PI / 2 + 0.1], 5);
  for (let i = 0; i < 6; i++) {
    const x = half * 0.15 + rand() * half * 0.85;
    const z = (rand() - 0.5) * r * 1.3;
    p.cyl(0.06, 0.06, 0.55 + rand() * 0.25, i % 2 ? C.wood : C.woodLight, x, 0.06 + (i > 3 ? 0.11 : 0), z, [Math.PI / 2, rand() * 3, 0], 6);
  }
};

/** Mỗi dáng vật cản nhỏ vẽ thế nào (gộp chung một lưới). */
export const VE: Partial<Record<DangCan, Ve>> = { tre, da, rao, coc, rom, chum, xeCui };

/** Nhà sàn ở mép bãi: mô hình nhà sàn cấp 2 co vừa khối, mặt trước quay vào giữa bãi. */
function nhaSan(h: Hinh): THREE.Object3D {
  const house = makeNhaSan(2);
  const at = new THREE.Vector3().setFromMatrixPosition(datCho(h));
  const size = h.k === 'doan' ? Math.min(Math.hypot(h.bx - h.ax, h.bz - h.az), h.half * 2) : h.k === 'tron' ? h.r * 1.4 : 1.8;
  house.scale.setScalar(size / 2);
  house.position.copy(at);
  // Mặt trước (+z của mô hình) quay vào giữa bãi.
  house.rotation.y = Math.atan2(FIELD.w / 2 - at.x, 0);
  return house;
}

/** Thuyền mắc cạn: thuyền Lạc Việt (không người lái) nằm nghiêng trên bãi, dọc theo đoạn. */
function thuyenCan(h: Hinh): THREE.Object3D {
  const boat = boatHull();
  const len = h.k === 'doan' ? Math.hypot(h.bx - h.ax, h.bz - h.az) + h.half * 1.4 : 2.2;
  boat.scale.setScalar(len / 2.2);
  const m = datCho(h);
  boat.position.setFromMatrixPosition(m);
  boat.rotation.setFromRotationMatrix(m);
  // Nghiêng mạn như mắc cạn.
  boat.rotateX(0.16);
  return boat;
}

/** Dáng vật cản dựng thành mô hình riêng (nhà, thuyền), không gộp. */
export const RIENG: Partial<Record<DangCan, (h: Hinh) => THREE.Object3D>> = { nha: nhaSan, thuyen: thuyenCan };

/** Bãi bùn có lau: vài khóm lau thấp mọc ven mép bùn, phía ngoài bãi. */
function lauBun(v: VungCham, seed: number): THREE.Object3D | null {
  if (v.ve !== 'lau') return null;
  const rand = seeded(seed);
  const spots: Placement[] = [];
  const pts = vienHinh(v.hinh, -0.15);
  for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 9))) {
    const [x, z] = pts[i];
    // Chỉ mọc ở nửa vùng phía xa giữa bãi, chừa lối đi lội qua bùn.
    if (Math.abs(x - FIELD.w / 2) < Math.abs(pts[(i + Math.floor(pts.length / 2)) % pts.length][0] - FIELD.w / 2)) continue;
    spots.push({ t: Math.floor(rand() * 3), x, y: 0.02, z, s: 0.5 + rand() * 0.2, ry: rand() * Math.PI * 2 });
  }
  return spots.length ? instanceTemplates(reedTemplates(), spots, (g) => outlineOf(g, inkThin)) : null;
}

/** Vài vũng nước đọng trong bãi bùn. */
function vungDong(v: VungCham, seed: number): THREE.BufferGeometry[] {
  const rand = seeded(seed);
  const out: THREE.BufferGeometry[] = [];
  const b = v.hinh.k === 'tron' ? v.hinh : null;
  if (!b) return out;
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * b.r * 0.55;
    const r = 0.16 + rand() * 0.18;
    out.push(mangPhang(luon(vienHinh({ k: 'tron', x: b.x + Math.cos(a) * d, z: b.z + Math.sin(a) * d, r }, 0), 0.06, seed + i), 0.05, (_x, _z, c) => c.setHex(BUN.puddle)));
  }
  return out;
}

/** Dựng toàn bộ vật cản và vùng chậm của bố cục `bai`. */
export function buildVatCan(bai: Bai, mau: MauBai): THREE.Group {
  const g = new THREE.Group();
  g.name = 'vatCan';
  const fill = new THREE.Color(mau.fill);
  const rim = fill.clone().offsetHSL(0, 0, -0.09);
  const tint = new THREE.Color();
  // Mảng cỏ dưới vật cản chặn đường, viền sẫm như mép bãi; ra ngoài bãi thì viền hòa vào màu đất quanh bãi.
  const rims: THREE.BufferGeometry[] = [];
  const grass: THREE.BufferGeometry[] = [];
  bai.can.forEach((c, i) => {
    rims.push(
      mangPhang(luon(vienHinh(c.hinh, 0.38), 0.12, 11 + i), 0.03, (x, z, out) => {
        mau.ground(x, z, tint);
        return out.copy(rim).lerp(tint, smoothstep(sdBai(x, z), 0, 0.5));
      }),
    );
    grass.push(mangPhang(luon(vienHinh(c.hinh, 0.16), 0.1, 29 + i), 0.04, mau.ground));
  });
  // Nước nông: bờ cát ướt, mặt nước, giữa sâu hơn. Bùn: viền bùn khô, bùn ướt, vài vũng đọng.
  const banks: THREE.BufferGeometry[] = [];
  const tops: THREE.BufferGeometry[] = [];
  const inner: THREE.BufferGeometry[] = [];
  const solid = (hex: number) => (_x: number, _z: number, out: THREE.Color) => out.setHex(hex);
  bai.cham.forEach((v, i) => {
    const water = v.loai === 'nuoc';
    banks.push(mangPhang(luon(vienHinh(v.hinh, 0.2), 0.1, 41 + i), 0.03, solid(water ? NUOC.bank : BUN.rim)));
    tops.push(mangPhang(luon(vienHinh(v.hinh, 0), 0.08, 53 + i), 0.04, solid(water ? NUOC.shallow : BUN.wet)));
    if (water) inner.push(mangPhang(luon(vienHinh(v.hinh, -0.32), 0.12, 67 + i), 0.05, solid(NUOC.deep)));
    else inner.push(...vungDong(v, 67 + i * 7));
    const reeds = lauBun(v, 79 + i);
    if (reeds) g.add(reeds);
  });
  for (const mesh of [luoiDat([...rims, ...banks]), luoiDat([...grass, ...tops]), luoiDat(inner)]) if (mesh) g.add(mesh);
  // Mô hình vật cản: mọi dáng nhỏ gộp một lưới (một lưới màu, một viền mực); nhà, thuyền dựng riêng.
  const p = new ShapeBuilder();
  const them: THREE.BufferGeometry[] = [];
  const rand = seeded(bai.id.length * 97 + bai.can.length);
  for (const c of bai.can) {
    const rieng = RIENG[c.ve];
    if (rieng) g.add(rieng(c.hinh));
    else VE[c.ve]?.(p, c.hinh, rand, them);
  }
  const parts = [...(p.empty ? [] : [p.geometry()]), ...them];
  if (parts.length) {
    const geo = mergeGeometries(parts, false)!;
    for (const q of parts) q.dispose();
    const mesh = new THREE.Mesh(geo, toon);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.vatCanModel = true;
    g.add(mesh, outlineOf(geo, inkThin));
  }
  return g;
}

/** Dáng vật cản có hàm vẽ. */
export const coVe = (c: VatCan) => !!RIENG[c.ve] || !!VE[c.ve];

/**
 * Chân lính lội xuống nước, bùn bao sâu ở (x, z) (âm): nước 0,12 ô, bùn 0,05 ô, chuyển mượt qua mép vùng. Chỉ đổi
 * hình, mặt bãi vẫn phẳng.
 */
export function loiAt(bai: Bai | undefined, x: number, z: number): number {
  if (!bai?.cham.length) return 0;
  let y = 0;
  for (const v of bai.cham) {
    const s = sdHinh(v.hinh, x, z);
    if (s > 0.15) continue;
    y = Math.min(y, -(v.loai === 'nuoc' ? 0.12 : 0.05) * smoothstep(-s, -0.15, 0.15));
  }
  return y;
}
