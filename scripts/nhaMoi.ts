// Đề xuất mẫu nhà dân mới (docs/de-xuat/nha-moi.html), bản 2: chỉ dùng hai kiểu mái có dẫn chứng thời Văn Lang
// (hình nhà sàn khắc trên trống đồng Ngọc Lũ: mái võng có đôi chim, mái vòm; sách Lịch sử 6: nhà sàn mái cong hình
// thuyền hoặc mái tròn hình mui thuyền). Các mẫu khác nhau ở tỉ lệ nhà và đồ vật, cảnh sinh hoạt có trên trống đồng
// hay trong di vật Đông Sơn (giã gạo, kho thóc, thuyền độc mộc). Nguồn từng chi tiết ghi ở trang đề xuất.
// Theo Nét Đông Sơn: viền mực, hoa văn vòng tròn chấm giữa trên vách, mái theo cấp, giản lược kiểu một mái chính.
// Chỉ để chụp đề xuất, game chưa dùng. Chạy trong trình duyệt qua Vite: node scripts/chup-nha-moi.mjs.
// Móng 3×3 như nhà sàn, gốc tọa độ là tâm móng, mặt trước hướng +z, đơn vị là ô đất.

import * as THREE from 'three';
import { above5, bird, boatRoof, lacBird, type Roof } from '../src/render/buildings';
import { type LotSpot, type V3, maiGon, partScale, rod, yard } from '../src/render/congTrinh/chung';
import { CONG_TRINH } from '../src/render/congTrinh/index';
import { C } from '../src/render/palette';
import type { ShapeBuilder } from '../src/render/shapes';
import { ToonModel, inkThin } from '../src/render/toon';
import { AZ, EL, PERSON, addPeople, groundPatch, makeRenderer, newScene } from './congTrinh';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** uv của mặt không vẽ hoa văn: chỗ trống của ảnh dải hoa văn (như `patternStrip`). */
const TRON: [number, number] = [0, 0.6];

const nut = (b: ShapeBuilder, a: V3, c: V3, r: number, color: number) => rod(b, a, c, r, color, 6);

function gop(m: ToonModel, n: ToonModel): THREE.Group {
  const g = m.group();
  for (const c of n.group().children.slice()) g.add(c);
  return g;
}

/** Cột, sàn, vách hoa văn vòng tròn chấm giữa của nhà sàn tâm (x, z), rộng `w` theo x, sâu `d` theo z. */
function thanNha(m: ToonModel, x: number, z: number, w: number, d: number, postH: number, wallH: number, inset = 0.14): void {
  const p = m.plain;
  const cx = w > 1.6 ? [-w / 2 + 0.1, 0, w / 2 - 0.1] : [-w / 2 + 0.1, w / 2 - 0.1];
  const cz = d > 1.6 ? [-d / 2 + 0.1, 0, d / 2 - 0.1] : [-d / 2 + 0.1, d / 2 - 0.1];
  for (const dx of cx) for (const dz of cz) p.cyl(0.05, 0.065, postH, C.woodDark, x + dx, postH / 2, z + dz, undefined, 7);
  p.box(w + 0.08, 0.08, d + 0.08, C.wood, x, postH, z);
  m.band.box(w - 2 * inset, wallH, d - 2 * inset, C.woodLight, x, postH + 0.04 + wallH / 2, z);
}

/** Thang gỗ hai má từ mép sàn (top) xuống sân (foot), bậc ngang theo trục `ngang`. */
function thang(n: ToonModel, top: V3, foot: V3, ngang: 'x' | 'z'): void {
  const off = (k: number): [number, number] => (ngang === 'x' ? [k, 0] : [0, k]);
  for (const k of [-0.1, 0.1]) {
    const [ox, oz] = off(k);
    nut(n.plain, [foot[0] + ox, foot[1], foot[2] + oz], [top[0] + ox, top[1], top[2] + oz], 0.025, C.wood);
  }
  const bac = 3 + Math.round((top[1] - foot[1]) * 2);
  for (let i = 1; i <= bac; i++) {
    const t = i / (bac + 1);
    const [w, d] = ngang === 'x' ? [0.24, 0.05] : [0.05, 0.24];
    n.plain.box(w, 0.03, d, C.woodDark, foot[0] + (top[0] - foot[0]) * t, foot[1] + (top[1] - foot[1]) * t, foot[2] + (top[2] - foot[2]) * t);
  }
}

// ---------- Mẫu 1: Nhà mui thuyền (mái vòm dài) ----------

/**
 * Mái vòm như mui thuyền: nửa ống dài `L`, bán kính `rad`, hai đầu vểnh nhẹ `lift`, dày `t`. Mặt ngoài vẽ hoa văn.
 */
function muiThuyen(L: number, rad: number, lift: number, t: number, nu = 14, nv = 9): THREE.BufferGeometry {
  const pt = (u: number, th: number, rr: number) => {
    const a = Math.abs(u);
    const loe = 1 + 0.14 * a * a;
    return V((u * L) / 2, rr * Math.sin(th) + lift * a * a * a, rr * Math.cos(th) * loe);
  };
  const tam = (u: number) => V((u * L) / 2, lift * Math.abs(u) ** 3, 0);
  const pos: number[] = [];
  const uv: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, want: THREE.Vector3, ua: [number, number][]) => {
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    const q = n.dot(want) >= 0 ? [a, b, c] : [a, c, b];
    const w = n.dot(want) >= 0 ? ua : [ua[0], ua[2], ua[1]];
    for (const v of q) pos.push(v.x, v.y, v.z);
    for (const x of w) uv.push(...x);
  };
  const tron: [number, number][] = [TRON, TRON, TRON];
  for (let i = 0; i < nu; i++) {
    const [u0, u1] = [-1 + (2 * i) / nu, -1 + (2 * (i + 1)) / nu];
    for (let j = 0; j < nv; j++) {
      const [a0, a1] = [(Math.PI * j) / nv, (Math.PI * (j + 1)) / nv];
      for (const [rr, sgn] of [[rad, 1], [rad - t, -1]] as const) {
        const A = pt(u0, a0, rr);
        const B = pt(u1, a0, rr);
        const Cc = pt(u0, a1, rr);
        const D = pt(u1, a1, rr);
        const want = A.clone().sub(tam(u0)).multiplyScalar(sgn);
        const [i0, i1, j0, j1] = [(i / nu) * 3, ((i + 1) / nu) * 3, j / nv, (j + 1) / nv];
        tri(A, B, Cc, want, sgn > 0 ? [[i0, j0], [i1, j0], [i0, j1]] : tron);
        tri(B, D, Cc, want, sgn > 0 ? [[i1, j0], [i1, j1], [i0, j1]] : tron);
      }
    }
    // Hai mép diềm (θ = 0 và π): mặt quay xuống.
    for (const th of [0, Math.PI]) {
      const [A, B, Cc, D] = [pt(u0, th, rad), pt(u1, th, rad), pt(u0, th, rad - t), pt(u1, th, rad - t)];
      tri(A, B, Cc, V(0, -1, 0), tron);
      tri(B, D, Cc, V(0, -1, 0), tron);
    }
  }
  // Hai đầu mui (u = ±1).
  for (const u of [-1, 1]) {
    for (let j = 0; j < nv; j++) {
      const [a0, a1] = [(Math.PI * j) / nv, (Math.PI * (j + 1)) / nv];
      const [A, B, Cc, D] = [pt(u, a0, rad), pt(u, a1, rad), pt(u, a0, rad - t), pt(u, a1, rad - t)];
      tri(A, B, Cc, V(u, 0, 0), tron);
      tri(B, D, Cc, V(u, 0, 0), tron);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** Thuyền độc mộc: một thân cây khoét lòng, gác trên hai khúc gỗ kê ở sân. */
function docMoc(n: ToonModel, x: number, z: number, ry: number, len = 1.0): void {
  const p = n.plain;
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  for (const k of [-0.3, 0.3]) p.box(0.08, 0.06, 0.3, C.woodDark, x + c * k * len, 0.08, z - s * k * len, [0, ry, 0]);
  p.add(new THREE.SphereGeometry(1, 12, 6), C.wood, x, 0.15, z, [0, ry, 0], [len / 2, 0.08, 0.13]);
  p.add(new THREE.SphereGeometry(1, 12, 6), C.woodDark, x, 0.19, z, [0, ry, 0], [len / 2 - 0.06, 0.04, 0.09]);
}

/**
 * Nhà sàn mái vòm dài như mui thuyền ("mái tròn hình mui thuyền"): nan tre ôm mái như cách làm mui thuyền, hai đầu mui
 * đan nan hoa văn; thang tre bên phải; chiếc thuyền độc mộc gác ở sân trước.
 */
export function nhaMuiThuyen(level: number): THREE.Group {
  const m = new ToonModel();
  const n = new ToonModel(inkThin);
  const p = m.plain;
  const r = maiGon(level);
  const s = partScale(level);
  const tall = 0.1 * above5(level);
  yard(m, 3);

  const [hx, hz] = [-0.3, -0.45];
  const postH = 0.62 * s + tall;
  const w = 1.5 * s;
  const d = 0.95 * s;
  thanNha(m, hx, hz, w, d, postH, 0.36 * s, 0.1);
  p.box(0.22 * s, 0.3 * s, 0.03, C.woodDark, hx + 0.25 * s, postH + 0.19 * s, hz + d / 2 - 0.09);

  const L = 2.05 * s;
  const rad = 0.66 * s;
  const lift = 0.16 * s;
  const ay = postH + 0.22 * s;
  m.band.add(muiThuyen(L, rad, lift, 0.06), r.main, hx, ay, hz);
  const vien = r.trim ?? r.dark;
  for (const u of [-0.95, -0.55, -0.18, 0.18, 0.55, 0.95]) {
    const a = Math.abs(u);
    const loe = 1 + 0.14 * a * a;
    const day = a > 0.9 ? 0.035 : 0.022;
    p.add(new THREE.TorusGeometry(rad + 0.012, day, 4, 12, Math.PI), vien, hx + (u * L) / 2, ay + lift * a * a * a, hz, [0, Math.PI / 2, 0], [loe, 1, 1]);
  }
  for (const e of [-1, 1]) {
    const geo = new THREE.CylinderGeometry(rad * 0.92, rad * 0.92, 0.04, 12, 1, false, 0, Math.PI);
    geo.rotateZ(Math.PI / 2);
    m.band.add(geo, C.woodLight, hx + e * (L / 2 - 0.12), ay + lift * 0.6, hz, [0, 0, 0], [1, 1, 1.05]);
  }
  if (r.lac) for (const e of [-1, 1]) lacBird(m, hx + e * (L / 2 - 0.05), ay + rad + lift, hz, (e * Math.PI) / 2, 0.4);
  else p.sphere(0.07, vien, hx, ay + rad + 0.02, hz, [1.6, 0.7, 1], 8);

  // Hiên bên phải, thang tre xuống sân.
  const sx = hx + w / 2 + 0.04;
  p.box(0.4, 0.05, 0.36, C.bamboo, sx + 0.2, postH, hz + 0.1);
  thang(n, [sx + 0.4, postH, hz + 0.1], [sx + 0.4 + postH * 0.8, 0.06, hz + 0.1], 'z');
  // Thuyền độc mộc gác ở sân trước bên trái.
  if (level >= 2) docMoc(n, -0.55, 0.95, 0.15, 1.05);
  return gop(m, n);
}

// ---------- Mẫu 2: Nhà mái võng đôi chim ----------

/**
 * Nhà sàn mái võng thấp và dài như hình nhà khắc trên trống đồng Ngọc Lũ: mái trùm sát sàn, hai đầu nóc vút cao,
 * đôi chim đậu trên nóc quay mặt vào nhau; vách hoa văn vòng tròn chấm giữa.
 */
export function nhaMaiVong(level: number): THREE.Group {
  const m = new ToonModel();
  const n = new ToonModel(inkThin);
  const p = m.plain;
  const r = maiGon(level);
  const s = partScale(level);
  const tall = 0.1 * above5(level);
  yard(m, 3);
  p.box(0.55, 0.03, 1.05, C.earth, -0.1, 0.055, 0.95);

  const [hx, hz] = [-0.1, -0.4];
  const postH = 0.48 * s + tall;
  const w = 1.85 * s;
  const d = 0.95 * s;
  thanNha(m, hx, hz, w, d, postH, 0.38 * s);
  p.box(0.24 * s, 0.32 * s, 0.03, C.woodDark, hx, postH + 0.2 * s, hz + d / 2 - 0.13);

  const roofW = 1.65 * s;
  const drop = 0.6 * s;
  const ridge = postH + 0.14 + drop;
  boatRoof(m, r, { length: 2.75 * s, width: roofW, lift: 0.58 * s, drop, thickness: 0.08 }, hx, ridge, hz);
  // Đôi chim đậu giữa nóc, quay mặt vào nhau.
  for (const e of [-1, 1]) bird(m, hx + e * 0.42 * s, ridge + 0.16, hz, -e, 1.7);

  // Hiên trước, thang giữa.
  const fz = hz + d / 2 + 0.04;
  p.box(0.6 * s, 0.06, 0.28, C.wood, hx, postH, fz + 0.1);
  thang(n, [hx, postH, fz + 0.24], [hx, 0.06, fz + 0.24 + postH * 0.75], 'x');
  return gop(m, n);
}

// ---------- Mẫu 3: Nhà giã gạo ----------

/**
 * Nhà sàn mái võng quay đầu hồi ra trước (nhìn từ trước thấy hai đầu nóc vút như sừng), lùi về sau bên trái; sân
 * trước có cối giã gạo và hai chày đứng như cảnh giã gạo khắc trên trống đồng.
 */
export function nhaGiaGao(level: number): THREE.Group {
  const m = new ToonModel();
  const n = new ToonModel(inkThin);
  const p = m.plain;
  const r = maiGon(level);
  const s = partScale(level);
  const tall = 0.1 * above5(level);
  yard(m, 3);

  const [hx, hz] = [-0.45, -0.3];
  const postH = 0.62 * s + tall;
  const w = 1.15 * s;
  const d = 1.55 * s;
  thanNha(m, hx, hz, w, d, postH, 0.4 * s);
  p.box(0.24 * s, 0.32 * s, 0.03, C.woodDark, hx, postH + 0.2 * s, hz + d / 2 - 0.13);

  const roofW = 1.5 * s;
  const drop = 0.5 * s;
  const ridge = postH + 0.2 + drop;
  boatRoof(m, r, { length: 2.3 * s, width: roofW, lift: 0.75 * s, drop, thickness: 0.08 }, hx, ridge, hz, Math.PI / 2);

  // Hiên đầu hồi trước, thang xuống sân.
  const fz = hz + d / 2 + 0.04;
  p.box(0.62 * s, 0.06, 0.3, C.wood, hx, postH, fz + 0.11);
  thang(n, [hx, postH, fz + 0.26], [hx, 0.06, fz + 0.26 + postH * 0.75], 'x');

  // Cối giã gạo, hai chày đứng, nong thóc ở sân trước bên phải.
  if (level >= 2) {
    const [cx, cz] = [0.6, 0.9];
    n.plain.cyl(0.15, 0.12, 0.28, C.wood, cx, 0.19, cz, undefined, 9);
    n.plain.cyl(0.1, 0.1, 0.02, C.cream, cx, 0.33, cz, undefined, 9);
    nut(n.plain, [cx - 0.04, 0.34, cz], [cx - 0.12, 1.25, cz + 0.05], 0.03, C.woodLight);
    nut(n.plain, [cx + 0.04, 0.6, cz], [cx + 0.1, 1.45, cz - 0.04], 0.03, C.woodLight);
    n.plain.cyl(0.26, 0.24, 0.04, C.bamboo, -0.6, 0.08, 1.05, undefined, 12);
    n.plain.cyl(0.22, 0.22, 0.02, C.ripe, -0.6, 0.105, 1.05, undefined, 12);
  }
  return gop(m, n);
}

// ---------- Mẫu 4: Nhà có vựa thóc ----------

/** Vựa thóc nhỏ mái vòm trên bốn cột cao (cách hiểu nhà mái tròn trên trống đồng là kho thóc). */
function vuaThoc(m: ToonModel, r: Roof, x: number, z: number, s: number, tall: number): void {
  const p = m.plain;
  const h = 0.85 * s + tall;
  for (const dx of [-0.2, 0.2]) for (const dz of [-0.2, 0.2]) p.cyl(0.035, 0.045, h, C.woodDark, x + dx * s, h / 2, z + dz * s, undefined, 6);
  p.box(0.56 * s, 0.06, 0.56 * s, C.wood, x, h, z);
  m.band.cyl(0.24 * s, 0.26 * s, 0.26 * s, C.woodLight, x, h + 0.16 * s, z, undefined, 12);
  const dome = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
  m.band.add(dome, r.main, x, h + 0.26 * s, z, [0, 0, 0], [0.4 * s, 0.38 * s, 0.4 * s]);
  if (r.trim !== null) {
    p.add(new THREE.TorusGeometry(0.39 * s, 0.025, 5, 20), r.trim, x, h + 0.27 * s, z, [Math.PI / 2, 0, 0]);
    if (!r.lac) p.cone(0.06, 0.1, r.trim, x, h + 0.66 * s, z, undefined, 8);
  }
  if (r.lac) lacBird(m, x, h + 0.62 * s, z, 0, 0.32);
}

/**
 * Nhà sàn mái võng vừa, lùi về sau bên trái; vựa thóc mái vòm nhỏ trên cột cao ở góc sau bên phải (phần phụ); thang
 * trước.
 */
export function nhaVuaThoc(level: number): THREE.Group {
  const m = new ToonModel();
  const n = new ToonModel(inkThin);
  const p = m.plain;
  const r = maiGon(level);
  const s = partScale(level);
  const tall = 0.1 * above5(level);
  yard(m, 3);
  p.box(0.55, 0.03, 1.0, C.earth, -0.45, 0.055, 1.0);

  const [hx, hz] = [-0.45, -0.35];
  const postH = 0.58 * s + tall;
  const w = 1.4 * s;
  const d = 1.0 * s;
  thanNha(m, hx, hz, w, d, postH, 0.38 * s);
  p.box(0.24 * s, 0.32 * s, 0.03, C.woodDark, hx, postH + 0.2 * s, hz + d / 2 - 0.13);
  const roofW = 1.6 * s;
  const drop = 0.55 * s;
  const ridge = postH + 0.18 + drop;
  boatRoof(m, r, { length: 2.15 * s, width: roofW, lift: 0.5 * s, drop, thickness: 0.08 }, hx, ridge, hz);

  const fz = hz + d / 2 + 0.04;
  p.box(0.55 * s, 0.06, 0.28, C.wood, hx, postH, fz + 0.1);
  thang(n, [hx, postH, fz + 0.24], [hx, 0.06, fz + 0.24 + postH * 0.75], 'x');
  if (level >= 2) vuaThoc(m, r, 0.9, -0.85, Math.max(s, 0.9), tall);
  return gop(m, n);
}

// ---------- Chụp ----------

export interface Mau {
  id: string;
  make: (level: number) => THREE.Group;
  spots: LotSpot[];
}

export const MAU: Mau[] = [
  { id: 'muiThuyen', make: nhaMuiThuyen, spots: [{ job: 'phuNu', x: 0.95, z: 0.35, y: 0.05, ry: -0.3 }, { job: 'phuNu', x: 0.55, z: 1.05, y: 0.05, ry: 0.6 }] },
  { id: 'maiVong', make: nhaMaiVong, spots: [{ job: 'phuNu', x: 0.6, z: 0.95, y: 0.05, ry: 0.4 }, { job: 'phuNu', x: -0.95, z: 1.0, y: 0.05, ry: -0.5 }] },
  { id: 'giaGao', make: nhaGiaGao, spots: [{ job: 'phuNu', x: 1.05, z: 0.45, y: 0.05, ry: -0.9 }, { job: 'phuNu', x: 0.15, z: 1.2, y: 0.05, ry: 0.9 }] },
  { id: 'vuaThoc', make: nhaVuaThoc, spots: [{ job: 'phuNu', x: 0.55, z: 0.75, y: 0.05, ry: 0.4 }, { job: 'phuNu', x: 0.95, z: 0.2, y: 0.05, ry: -0.8 }] },
];

const HIEN_TAI: Mau = { id: 'nhaSan', make: (l) => CONG_TRINH.nhaSan!.make(l), spots: CONG_TRINH.nhaSan!.spots(1) };

function chup(renderer: THREE.WebGLRenderer, scene: THREE.Scene, w: number, h: number, half: number, target: THREE.Vector3, el = EL, az = AZ): string {
  renderer.setSize(w, h);
  const cam = new THREE.OrthographicCamera((-half * w) / h, (half * w) / h, half, -half, 0.1, 200);
  cam.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(60).add(target);
  cam.lookAt(target);
  renderer.render(scene, cam);
  return (renderer.domElement as HTMLCanvasElement).toDataURL('image/webp', 0.9);
}

function datNha(scene: THREE.Scene, mau: Mau, level: number, x: number, z: number, ry = 0): void {
  const b = mau.make(level);
  addPeople(b, mau.spots.slice(0, level >= 2 ? 2 : 1), PERSON, 1);
  b.position.set(x, 0, z);
  b.rotation.y = ry;
  scene.add(b);
}

export interface Anh {
  id: string;
  cap: number;
  src: string;
}

/** Mỗi mẫu (cả nhà sàn hiện tại để so) ở các cấp `caps`, cùng khung như chup-cong-trinh. */
export function chupMau(caps: number[]): Anh[] {
  const renderer = makeRenderer();
  const half = 3.4;
  const h = Math.round(2 * half * 64);
  const w = Math.round(h * 1.1);
  const out: Anh[] = [];
  for (const mau of [HIEN_TAI, ...MAU]) {
    for (const cap of caps) {
      const scene = newScene(5);
      scene.add(groundPatch(5, [{ x: 0, z: 0, tiles: 3 }]));
      datNha(scene, mau, cap, 0, 0);
      out.push({ id: mau.id, cap, src: chup(renderer, scene, w, h, half, V(0, 1.15, 0)) });
    }
  }
  renderer.dispose();
  renderer.domElement.remove();
  return out;
}

/**
 * Một xóm sáu nhà cấp `cap` ở cỡ gần như trên điện thoại: trộn nhà sàn hiện tại với bốn mẫu mới, có đường đất giữa,
 * để xem kinh đô nhiều nhà có đỡ đơn điệu không. `cung`: cả xóm cùng một dáng nhà sàn hiện tại để so.
 */
export function chupXom(cap: number, cung = false, px = 38): string {
  const renderer = makeRenderer();
  const half = 6.2;
  const h = Math.round(2 * half * px);
  const w = Math.round(h * 1.5);
  const scene = newScene(16);
  const cho: [number, number][] = [[-4, -2], [0, -2], [4, -2], [-4, 2], [0, 2], [4, 2]];
  scene.add(groundPatch(16, cho.map(([x, z]) => ({ x, z, tiles: 3 }))));
  // Đường đất giữa hai dãy nhà.
  const duong = new THREE.Mesh(new THREE.BoxGeometry(14, 0.03, 0.9), new THREE.MeshLambertMaterial({ color: 0xc7a46c }));
  duong.position.set(0, 0.015, 0);
  scene.add(duong);
  const thu = cung ? [HIEN_TAI, HIEN_TAI, HIEN_TAI, HIEN_TAI, HIEN_TAI, HIEN_TAI] : [MAU[1], HIEN_TAI, MAU[3], MAU[2], MAU[0], MAU[1]];
  cho.forEach(([x, z], i) => datNha(scene, thu[i], cap, x, z));
  const src = chup(renderer, scene, w, h, half, V(0, 0.8, 0));
  renderer.dispose();
  renderer.domElement.remove();
  return src;
}

/** Một mẫu ở một cấp, nhìn từ góc `az` (radian, 0 là từ trước): để soi chi tiết. */
export function chupMot(id: string, cap: number, az = AZ, el = EL, half = 2.6): string {
  const mau = [HIEN_TAI, ...MAU].find((m) => m.id === id)!;
  const renderer = makeRenderer();
  const scene = newScene(5);
  scene.add(groundPatch(5, [{ x: 0, z: 0, tiles: 3 }]));
  datNha(scene, mau, cap, 0, 0);
  const h = Math.round(2 * half * 90);
  const src = chup(renderer, scene, Math.round(h * 1.2), h, half, V(0, 1.4, 0), el, az);
  renderer.dispose();
  renderer.domElement.remove();
  return src;
}

/** Số lưới (lệnh vẽ, gồm viền mực) và tam giác của mỗi mẫu ở cấp `cap`, không tính người. */
export function demNang(cap: number): { id: string; luoi: number; tamGiac: number }[] {
  return [HIEN_TAI, ...MAU].map((mau) => {
    const g = mau.make(cap);
    let luoi = 0;
    let tamGiac = 0;
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      luoi++;
      const geo = mesh.geometry;
      tamGiac += (geo.index ? geo.index.count : geo.getAttribute('position').count) / 3;
    });
    return { id: mau.id, luoi, tamGiac: Math.round(tamGiac) };
  });
}
