// Đề xuất mẫu nhà dân mới (docs/de-xuat/nha-moi.html): bốn dáng nhà sàn khác hẳn nhau và khác mọi công trình đang có,
// vẫn theo phong cách Nét Đông Sơn (viền mực, hoa văn trống đồng, mái theo cấp, giản lược kiểu một mái chính).
// Chỉ để chụp đề xuất, game chưa dùng. Chạy trong trình duyệt qua Vite: node scripts/chup-nha-moi.mjs.
// Móng 3×3 như nhà sàn, gốc tọa độ là tâm móng, mặt trước hướng +z, đơn vị là ô đất.

import * as THREE from 'three';
import { above5, lacBird, type Roof } from '../src/render/buildings';
import { type LotSpot, type V3, maiGon, partScale, rod, yard } from '../src/render/congTrinh/chung';
import { CONG_TRINH } from '../src/render/congTrinh/index';
import { C } from '../src/render/palette';
import type { ShapeBuilder } from '../src/render/shapes';
import { ToonModel, inkThin } from '../src/render/toon';
import { AZ, EL, PERSON, addPeople, groundPatch, makeRenderer, newScene } from './congTrinh';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** uv của mặt không vẽ hoa văn: chỗ trống của ảnh dải hoa văn (như `patternStrip`). */
const TRON: [number, number] = [0, 0.6];

/**
 * Khối lồi từ các mặt phẳng (mỗi mặt một đa giác lồi). Mặt tự quay ra ngoài theo tâm khối. Mặt `hoa` có uv trải
 * vừa mặt nhân `lap` (hoa văn trống đồng của ảnh dải), mặt khác dùng chỗ trống của ảnh.
 */
function khoiLoi(mat: { p: THREE.Vector3[]; hoa?: boolean }[], lap: [number, number] = [1, 1]): THREE.BufferGeometry {
  const all = mat.flatMap((f) => f.p);
  const tam = all.reduce((a, b) => a.clone().add(b), V(0, 0, 0)).multiplyScalar(1 / all.length);
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  for (const f of mat) {
    let p = f.p;
    let n = p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize();
    if (n.dot(p[0].clone().sub(tam)) < 0) {
      p = [...p].reverse();
      n.negate();
    }
    const u = p[1].clone().sub(p[0]).normalize();
    const v = n.clone().cross(u);
    const q = p.map((x) => [x.clone().sub(p[0]).dot(u), x.clone().sub(p[0]).dot(v)]);
    const [u0, u1] = [Math.min(...q.map((a) => a[0])), Math.max(...q.map((a) => a[0]))];
    const [v0, v1] = [Math.min(...q.map((a) => a[1])), Math.max(...q.map((a) => a[1]))];
    const uvOf = (i: number): [number, number] =>
      f.hoa ? [((q[i][0] - u0) / (u1 - u0 || 1)) * lap[0], ((q[i][1] - v0) / (v1 - v0 || 1)) * lap[1]] : TRON;
    for (let i = 1; i + 1 < p.length; i++) {
      for (const k of [0, i, i + 1]) {
        pos.push(p[k].x, p[k].y, p[k].z);
        nor.push(n.x, n.y, n.z);
        uv.push(...uvOf(k));
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** Tấm dày `t` từ đa giác phẳng `p` (đẩy xuống theo trục đứng): mặt trên vẽ hoa văn. */
function tamDay(p: THREE.Vector3[], t: number, lap: [number, number] = [1, 1]): THREE.BufferGeometry {
  const d = p.map((x) => x.clone().add(V(0, -t, 0)));
  const mat: { p: THREE.Vector3[]; hoa?: boolean }[] = [{ p, hoa: true }, { p: [...d].reverse() }];
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    mat.push({ p: [p[i], p[j], d[j], d[i]] });
  }
  return khoiLoi(mat, lap);
}

/** Tấm tam giác đầu hồi dày `t` theo trục x (mặt ngoài vẽ hoa văn). */
function hoiTamGiac(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, t: number): THREE.BufferGeometry {
  const s = Math.sign(a.x) || 1;
  const off = V(-s * t, 0, 0);
  const [a2, b2, c2] = [a, b, c].map((x) => x.clone().add(off));
  return khoiLoi(
    [
      { p: [a, b, c], hoa: true },
      { p: [a2, b2, c2] },
      { p: [a, b, b2, a2] },
      { p: [b, c, c2, b2] },
      { p: [c, a, a2, c2] },
    ],
    [0.34, 1],
  );
}

const nut = (b: ShapeBuilder, a: V3, c: V3, r: number, color: number) => rod(b, a, c, r, color, 6);

/**
 * Mái hai dốc thẳng: diềm mái dài `eL` (nửa), nóc dài `rL` (nửa; dài hơn diềm thì đầu hồi chồm ra như lưỡi rìu),
 * rộng `hw` (nửa) ở diềm, diềm cao `eY`, nóc cao `rY`. Đầu hồi tam giác đan nan có hoa văn; sống mái và diềm theo cấp.
 */
function maiHaiDoc(m: ToonModel, r: Roof, x: number, z: number, eY: number, rY: number, eL: number, rL: number, hw: number, t = 0.07): void {
  for (const s of [-1, 1]) {
    const q = [V(x - eL, eY, z + s * hw), V(x + eL, eY, z + s * hw), V(x + rL, rY, z), V(x - rL, rY, z)];
    m.band.add(tamDay(q, t, [Math.max(1, Math.round(eL * 1.2)), 2]), r.main, 0, 0, 0);
  }
  // Đầu hồi lùi vào trong chút cho mái che đỉnh.
  for (const s of [-1, 1]) {
    const k = 0.9;
    const a = V(x + s * eL * 0.98, eY - 0.02, z + hw * k * 0.95);
    const b = V(x + s * eL * 0.98, eY - 0.02, z - hw * k * 0.95);
    const c = V(x + s * (eL + (rL - eL) * 0.93), eY + (rY - eY) * 0.93, z);
    m.band.add(hoiTamGiac(a, b, c, 0.04), C.woodLight, 0, 0, 0);
  }
  const vien = r.trim ?? r.dark;
  const p = m.plain;
  // Sống mái: bó tranh hay bọc đồng chạy suốt nóc.
  nut(p, [x - rL - 0.04, rY + 0.02, z], [x + rL + 0.04, rY + 0.02, z], 0.055, vien);
  if (r.trim !== null) {
    for (const s of [-1, 1]) {
      nut(p, [x - eL, eY - t / 2, z + s * hw], [x + eL, eY - t / 2, z + s * hw], 0.035, r.trim);
      // Ván gió hai đầu hồi.
      for (const e of [-1, 1]) nut(p, [x + e * eL, eY - t / 2, z + s * hw], [x + e * rL, rY, z], 0.032, r.trim);
    }
  }
}

/** Chim Lạc đồng cấp 10 hai đầu nóc dài `rL` (nửa), ngoảnh ra ngoài. */
function lacHaiDau(m: ToonModel, r: Roof, x: number, z: number, y: number, rL: number, s: number): void {
  if (!r.lac) return;
  for (const e of [-1, 1]) lacBird(m, x + e * rL, y, z, (e * Math.PI) / 2, s);
}

// ---------- Mẫu 1: Nhà mái lưỡi rìu ----------

/**
 * Nhà sàn cột cao, mái hai dốc dựng đứng, nóc dài hơn diềm nên hai đầu hồi chồm ra như lưỡi rìu đồng Đông Sơn;
 * đầu hồi đan nan có hoa văn, mũi nóc vút nhọn; thang độc mộc khoét bậc lên hiên.
 */
export function nhaLuoiRiu(level: number): THREE.Group {
  const m = new ToonModel();
  const n = new ToonModel(inkThin);
  const p = m.plain;
  const r = maiGon(level);
  const s = partScale(level);
  const tall = 0.12 * above5(level);
  const [hx, hz] = [-0.2, -0.3];
  yard(m, 3);
  p.box(0.55, 0.03, 1.1, C.earth, hx, 0.055, 1.0);

  const postH = 0.62 * s + tall;
  const w = 1.25 * s;
  const d = 0.95 * s;
  for (const cx of [-0.52, 0, 0.52]) for (const cz of [-0.38, 0.38]) p.cyl(0.055, 0.07, postH, C.woodDark, hx + cx * s, postH / 2, hz + cz * s, undefined, 7);
  p.box(w + 0.12, 0.08, d + 0.12, C.wood, hx, postH, hz);
  m.band.box(w - 0.12, 0.42 * s, d - 0.12, C.woodLight, hx, postH + 0.21 * s + 0.04, hz);
  p.box(0.22 * s, 0.32 * s, 0.03, C.woodDark, hx, postH + 0.2 * s, hz + (d - 0.12) / 2 + 0.01);

  const eY = postH + 0.4 * s;
  const rY = eY + 1.3 * s;
  const eL = 0.72 * s;
  const rL = 1.16 * s;
  const hw = 0.7 * s;
  maiHaiDoc(m, r, hx, hz, eY, rY, eL, rL, hw, 0.07);
  // Mặt trống đồng nhỏ giữa đầu hồi bên phải, nghiêng theo đầu hồi.
  {
    const a = V(hx + eL, eY, hz + hw);
    const b = V(hx + eL, eY, hz - hw);
    const c = V(hx + rL, rY, hz);
    const nor = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if (nor.x < 0) nor.negate();
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), nor));
    // Dời lên theo mặt đầu hồi (mặt nghiêng ra ngoài), không theo trục đứng, kẻo chìm sau vách.
    const len = c.clone().sub(a.clone().add(b).multiplyScalar(0.5));
    const at = a.clone().add(b).add(c).multiplyScalar(1 / 3).add(len.multiplyScalar(0.12)).add(nor.clone().multiplyScalar(0.03));
    m.drum.cyl(0.2 * s, 0.2 * s, 0.03, 0xffffff, at.x, at.y, at.z, [e.x, e.y, e.z], 18);
  }
  // Mũi nóc vút nhọn hai đầu như mũi rìu (cấp 10 thay bằng chim Lạc).
  if (!r.lac) for (const e of [-1, 1]) p.cone(0.05, 0.36 * s, r.trim ?? r.dark, hx + e * (rL + 0.08), rY + 0.12, hz, [0, 0, -e * 0.5], 6);
  lacHaiDau(m, r, hx, hz, rY + 0.05, rL, 0.42);

  // Hiên trước và thang độc mộc: một khúc gỗ khoét bậc dựng nghiêng.
  const fz = hz + d / 2 + 0.06;
  p.box(0.62 * s, 0.06, 0.3, C.wood, hx, postH, fz + 0.12);
  const top: V3 = [hx, postH, fz + 0.26];
  const foot: V3 = [hx, 0.06, fz + 0.26 + postH * 0.6];
  nut(n.plain, foot, top, 0.07, C.wood);
  const bac = 3 + Math.round(postH * 2);
  for (let i = 1; i <= bac; i++) {
    const t = i / (bac + 1);
    n.plain.box(0.17, 0.03, 0.06, C.woodDark, hx, foot[1] + (top[1] - foot[1]) * t + 0.06, foot[2] + (top[2] - foot[2]) * t + 0.03);
  }
  // Phần phụ: cây cau góc sau bên phải.
  if (level >= 3) {
    const h = 1.6 + 0.1 * (Math.min(level, 5) - 3) + 0.25 * above5(level);
    caySau(n.plain, 1.1, -1.05, h);
  }
  return gop(m, n);
}

// ---------- Mẫu 2: Nhà nền đất mái chùm ----------

/**
 * Nhà đồng bằng không sàn: nền đất đắp kè đá, tường đất nện có dải hoa văn, mái chùm bốn dốc lợp tranh dày, bốn góc
 * mái cong vểnh lên (mầm của đầu đao); hai cột hiên trước. Phần phụ: cối giã gạo và nong thóc như cảnh giã gạo trên
 * mặt trống đồng.
 */
export function nhaMaiChum(level: number): THREE.Group {
  const m = new ToonModel();
  const n = new ToonModel(inkThin);
  const p = m.plain;
  const r = maiGon(level);
  const s = partScale(level);
  const up = above5(level);
  const [hx, hz] = [-0.2, -0.32];
  yard(m, 3);
  p.box(0.6, 0.03, 1.0, C.earth, hx, 0.055, 1.05);

  // Nền đắp, kè đá quanh mép, bậc lên giữa mặt trước.
  const nenH = 0.18 + 0.06 * up;
  const nw = 2.15 * s;
  const nd = 1.6 * s;
  p.box(nw, nenH, nd, C.earthDark, hx, nenH / 2 + 0.05, hz);
  for (const e of [-1, 1]) {
    p.box(nw + 0.04, nenH * 0.7, 0.06, C.rockDark, hx, nenH * 0.35 + 0.05, hz + e * (nd / 2));
    p.box(0.06, nenH * 0.7, nd + 0.04, C.rockDark, hx + e * (nw / 2), nenH * 0.35 + 0.05, hz);
  }
  const floor = nenH + 0.05;
  for (let i = 0; i < 2; i++) p.box(0.5, floor / 2, 0.14, C.rock, hx, (floor / 2) * (i + 0.5), hz + nd / 2 + 0.07 + (1 - i) * 0.13);

  // Tường đất nện, dải hoa văn quanh đầu tường, cửa giữa, hai cửa sổ chấn song.
  const tw = 1.55 * s;
  const td = 1.05 * s;
  const th = 0.6 * s + 0.08 * up;
  p.box(tw, th, td, 0xc99d63, hx, floor + th / 2, hz);
  for (const e of [0.3, 0.62]) p.box(tw + 0.012, 0.018, td + 0.012, 0xa77e4e, hx, floor + th * e, hz);
  m.band.box(tw + 0.03, 0.12 * s, td + 0.03, 0xe0bb80, hx, floor + th - 0.07 * s, hz);
  const fz = hz + td / 2 + 0.01;
  p.box(0.26 * s, 0.42 * s, 0.03, C.woodDark, hx, floor + 0.21 * s, fz);
  for (const e of [-1, 1]) {
    p.box(0.22 * s, 0.14 * s, 0.03, C.woodDark, hx + e * 0.48 * s, floor + th * 0.55, fz);
    for (const k of [-1, 0, 1]) p.box(0.018, 0.14 * s, 0.035, C.wood, hx + e * 0.48 * s + k * 0.06 * s, floor + th * 0.55, fz + 0.005);
  }

  // Mái chùm: diềm chữ nhật, nóc ngắn, tranh dày.
  const eY = floor + th + 0.02;
  const rY = eY + 0.8 * s;
  const [ex, ez, rl, t] = [1.22 * s, 0.92 * s, 0.5 * s, 0.13];
  const E = [V(-ex, eY, ez), V(ex, eY, ez), V(ex, eY, -ez), V(-ex, eY, -ez)].map((v) => v.add(V(hx, 0, hz)));
  const B = E.map((v) => v.clone().add(V(0, -t, 0)));
  const R = [V(hx - rl, rY, hz), V(hx + rl, rY, hz)];
  m.band.add(
    khoiLoi(
      [
        { p: [E[0], E[1], R[1], R[0]], hoa: true },
        { p: [E[2], E[3], R[0], R[1]], hoa: true },
        { p: [E[3], E[0], R[0]], hoa: true },
        { p: [E[1], E[2], R[1]], hoa: true },
        ...[0, 1, 2, 3].map((i) => ({ p: [E[i], E[(i + 1) % 4], B[(i + 1) % 4], B[i]] })),
        { p: [...B] },
      ],
      [2, 2],
    ),
    r.main,
    0,
    0,
    0,
  );
  const vien = r.trim ?? r.dark;
  nut(p, [R[0].x - 0.03, rY + 0.03, hz], [R[1].x + 0.03, rY + 0.03, hz], 0.06, vien);
  // Bốn sống góc từ đầu nóc xuống góc mái; góc mái cong vểnh lên.
  for (const [i, j] of [[0, 0], [3, 0], [1, 1], [2, 1]] as const) {
    nut(p, [R[j].x, rY + 0.02, hz], [E[i].x, eY + 0.02, E[i].z], 0.045, vien);
    const out = V(E[i].x - hx, 0, E[i].z - hz).normalize();
    const tip = V(E[i].x + out.x * 0.16, eY + 0.2, E[i].z + out.z * 0.16);
    nut(p, [E[i].x, eY + 0.02, E[i].z], [tip.x, tip.y, tip.z], 0.045, vien);
    p.sphere(0.05, vien, tip.x, tip.y, tip.z, [1, 1, 1], 6);
  }
  if (r.trim !== null) for (let i = 0; i < 4; i++) nut(p, [E[i].x, eY - t / 2, E[i].z], [E[(i + 1) % 4].x, eY - t / 2, E[(i + 1) % 4].z], 0.03, r.trim);
  lacHaiDau(m, r, hx, hz, rY + 0.06, rl, 0.4);

  // Hai cột hiên trước đỡ diềm.
  for (const e of [-1, 1]) p.cyl(0.045, 0.055, eY - floor - t, C.woodDark, hx + e * 0.95 * s, floor + (eY - floor - t) / 2, hz + 0.8 * s, undefined, 6);

  // Cối giã gạo, chày dựng, nong thóc ở sân trước bên phải.
  if (level >= 2) {
    n.plain.cyl(0.13, 0.11, 0.24, C.wood, 0.95, 0.17, 0.65, undefined, 8);
    n.plain.cyl(0.09, 0.09, 0.02, C.cream, 0.95, 0.29, 0.65, undefined, 8);
    nut(n.plain, [0.95, 0.3, 0.65], [1.0, 1.05, 0.6], 0.03, C.woodLight);
    n.plain.cyl(0.26, 0.24, 0.04, C.bamboo, 0.62, 0.08, 1.12, undefined, 12);
    n.plain.cyl(0.22, 0.22, 0.02, C.ripe, 0.62, 0.105, 1.12, undefined, 12);
  }
  return gop(m, n);
}

// ---------- Mẫu 3: Nhà sàn bên ao, mái mui thuyền ----------

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
        const uvs = sgn > 0 ? ([[i / nu * 3, j / nv], [(i + 1) / nu * 3, j / nv], [i / nu * 3, (j + 1) / nv]] as [number, number][]) : tron;
        const uvs2 = sgn > 0 ? ([[(i + 1) / nu * 3, j / nv], [(i + 1) / nu * 3, (j + 1) / nv], [i / nu * 3, (j + 1) / nv]] as [number, number][]) : tron;
        tri(A, B, Cc, want, uvs);
        tri(B, D, Cc, want, uvs2);
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

/**
 * Nhà sàn đứng nửa trên ao: cột trước chân dưới nước, mái vòm như mui thuyền có nan tre ôm, hai đầu mui đan nan hoa
 * văn; cầu tre xuống sân; ao có lá sen, hoa sen và chiếc thuyền độc mộc.
 */
export function nhaBenAo(level: number): THREE.Group {
  const m = new ToonModel();
  const n = new ToonModel(inkThin);
  const p = m.plain;
  const r = maiGon(level);
  const s = partScale(level);
  const tall = 0.1 * above5(level);
  yard(m, 3);

  // Ao: bờ đất, mặt nước, lá sen, hoa sen.
  const [ax, az] = [-0.45, 0.35];
  p.add(new THREE.CylinderGeometry(1, 1, 0.05, 20), C.earthDark, ax, 0.05, az, [0, 0, 0], [1.02, 1, 0.98]);
  p.add(new THREE.CylinderGeometry(1, 1, 0.05, 20), C.water[0], ax, 0.07, az, [0, 0, 0], [0.92, 1, 0.88]);
  const sen: [number, number, number][] = [[-1.0, 0.85, 0.13], [-0.75, 1.05, 0.1], [0.05, 0.95, 0.12], [-1.15, 0.4, 0.1], [0.2, 0.65, 0.09]];
  for (const [x, z, rr] of sen) n.plain.cyl(rr, rr, 0.015, C.leaf[1], x, 0.1, z, undefined, 9);
  for (const [x, z] of [[-0.75, 1.05], [0.2, 0.65]]) n.plain.cone(0.05, 0.1, 0xe58aa6, x, 0.16, z, undefined, 6);
  // Thuyền độc mộc buộc trong ao.
  if (level >= 2) {
    n.plain.add(new THREE.SphereGeometry(1, 10, 6), C.wood, -0.75, 0.1, 0.55, [0, 0.5, 0], [0.42, 0.07, 0.1]);
    n.plain.add(new THREE.SphereGeometry(1, 10, 6), C.woodDark, -0.75, 0.13, 0.55, [0, 0.5, 0], [0.36, 0.03, 0.07]);
  }

  // Nhà: sàn rộng theo x, cột trước đứng trong ao.
  const [hx, hz] = [-0.3, -0.5];
  const postH = 0.66 * s + tall;
  const w = 1.5 * s;
  const d = 0.95 * s;
  for (const cx of [-0.62, 0, 0.62]) for (const cz of [-0.38, 0.38]) p.cyl(0.05, 0.065, postH, C.woodDark, hx + cx * s, postH / 2, hz + cz * s, undefined, 7);
  p.box(w + 0.14, 0.08, d + 0.14, C.wood, hx, postH, hz);
  m.band.box(w - 0.2, 0.36 * s, d - 0.16, C.woodLight, hx, postH + 0.22 * s, hz);
  p.box(0.22 * s, 0.3 * s, 0.03, C.woodDark, hx + 0.25 * s, postH + 0.19 * s, hz + (d - 0.16) / 2 + 0.01);

  // Mái mui thuyền, nan tre ôm mái, hai đầu mui đan nan.
  const L = 2.05 * s;
  const rad = 0.66 * s;
  const lift = 0.16 * s;
  const ay = postH + 0.22 * s;
  m.band.add(muiThuyen(L, rad, lift, 0.06), r.main, hx, ay, hz);
  const vien = r.trim ?? r.dark;
  for (const u of [-0.95, -0.55, -0.18, 0.18, 0.55, 0.95]) {
    const a = Math.abs(u);
    const loe = 1 + 0.14 * a * a;
    p.add(new THREE.TorusGeometry(rad + 0.012, u === -0.95 || u === 0.95 ? 0.035 : 0.022, 4, 12, Math.PI), vien, hx + (u * L) / 2, ay + lift * a * a * a, hz, [0, Math.PI / 2, 0], [loe, 1, 1]);
  }
  for (const e of [-1, 1]) {
    const geo = new THREE.CylinderGeometry(rad * 0.92, rad * 0.92, 0.04, 12, 1, false, 0, Math.PI);
    geo.rotateZ(Math.PI / 2);
    m.band.add(geo, C.woodLight, hx + e * (L / 2 - 0.12), ay + lift * 0.6, hz, [0, 0, 0], [1, 1, 1.05]);
  }
  lacHaiDau(m, r, hx, hz, ay + rad + lift, L / 2 - 0.05, 0.4);
  if (!r.lac) p.sphere(0.07, vien, hx, ay + rad + 0.02, hz, [1.6, 0.7, 1], 8);

  // Cầu tre từ hiên bên phải xuống sân.
  const sx = hx + w / 2 + 0.07;
  p.box(0.42, 0.05, 0.36, C.bamboo, sx + 0.21, postH, hz + 0.1);
  const top: V3 = [sx + 0.42, postH, hz + 0.1];
  const foot: V3 = [sx + 0.42 + postH * 0.9, 0.07, hz + 0.1];
  for (const k of [-0.1, 0.1]) nut(n.plain, [foot[0], foot[1], foot[2] + k], [top[0], top[1], top[2] + k], 0.03, C.bamboo);
  const bac = 3 + Math.round(postH * 2);
  for (let i = 1; i <= bac; i++) {
    const t = i / (bac + 1);
    n.plain.box(0.05, 0.03, 0.26, C.woodDark, foot[0] + (top[0] - foot[0]) * t, foot[1] + (top[1] - foot[1]) * t + 0.03, hz + 0.1);
  }
  return gop(m, n);
}

// ---------- Mẫu 4: Nhà sàn dài có khau cút ----------

/** Khau cút: hai tấm ván chéo chữ X trên đầu nóc, mỗi đầu ván uốn thành đầu chim Lạc mỏ dài. */
function khauCut(m: ToonModel, x: number, y: number, z: number, s: number, color: number, tip: number): void {
  const p = m.plain;
  for (const e of [-1, 1]) {
    const a = 0.55;
    const len = 0.9 * s;
    p.box(0.07 * s, len, 0.07 * s, color, x, y + 0.22 * s, z + e * 0.12 * s, [e * a, 0, 0]);
    // Đầu ván: đầu chim, mỏ chĩa ra ngoài, hơi ngẩng.
    const ty = y + 0.22 * s + Math.cos(a) * (len / 2);
    const tz = z + e * (0.12 * s + Math.sin(a) * (len / 2));
    p.sphere(0.08 * s, tip, x, ty, tz, [1, 1, 1.2], 7);
    p.cone(0.035 * s, 0.3 * s, tip, x, ty + 0.03 * s, tz + e * 0.16 * s, [e * (Math.PI / 2 - 0.35), 0, 0], 5);
  }
}

/**
 * Nhà sàn dài nhiều gian: mái hai dốc thẳng, đầu nóc dựng khau cút đầu chim Lạc, vách đan hoa văn suốt mặt trước,
 * hành lang sàn có lan can chạy dọc mặt trước, một thang giữa.
 */
export function nhaKhauCut(level: number): THREE.Group {
  const m = new ToonModel();
  const n = new ToonModel(inkThin);
  const p = m.plain;
  const r = maiGon(level);
  const s = partScale(level);
  const tall = 0.1 * above5(level);
  const [hx, hz] = [-0.08, -0.45];
  yard(m, 3);
  p.box(0.55, 0.03, 0.9, C.earth, hx, 0.055, 1.05);

  const postH = 0.55 * s + tall;
  const w = 2.25 * s;
  const d = 0.82 * s;
  const gal = 0.3;
  for (const cx of [-0.5, -0.17, 0.17, 0.5]) for (const cz of [-d / 2 + 0.08, d / 2 - 0.08, d / 2 + gal - 0.04]) p.cyl(0.045, 0.06, postH, C.woodDark, hx + cx * w, postH / 2, hz + cz, undefined, 6);
  p.box(w + 0.1, 0.08, d + gal + 0.06, C.wood, hx, postH, hz + gal / 2);
  m.band.box(w - 0.1, 0.4 * s, d - 0.1, C.woodLight, hx, postH + 0.24 * s, hz);
  for (const cx of [-0.28, 0.28]) p.box(0.2 * s, 0.3 * s, 0.03, C.woodDark, hx + cx * w, postH + 0.19 * s, hz + (d - 0.1) / 2 + 0.01);
  // Lan can hành lang: tay vịn và chấn song tre, chừa chỗ thang giữa.
  const lz = hz + d / 2 + gal - 0.03;
  const ly = postH + 0.2;
  for (const e of [-1, 1]) {
    nut(n.plain, [hx + e * 0.12, ly, lz], [hx + e * (w / 2), ly, lz], 0.018, C.bamboo);
    for (let i = 0; i < 6; i++) {
      const x = hx + e * (0.14 + (i * (w / 2 - 0.16)) / 5);
      n.plain.cyl(0.012, 0.012, 0.2, C.bamboo, x, postH + 0.1, lz, undefined, 4);
    }
  }
  const top: V3 = [hx, postH, lz + 0.02];
  const foot: V3 = [hx, 0.06, lz + 0.02 + postH * 0.75];
  for (const k of [-0.1, 0.1]) nut(n.plain, [foot[0] + k, foot[1], foot[2]], [top[0] + k, top[1], top[2]], 0.025, C.wood);
  const bac = 3 + Math.round(postH * 2);
  for (let i = 1; i <= bac; i++) {
    const t = i / (bac + 1);
    n.plain.box(0.24, 0.03, 0.05, C.woodDark, hx, foot[1] + (top[1] - foot[1]) * t, foot[2] + (top[2] - foot[2]) * t);
  }

  const eY = postH + 0.42 * s;
  const rY = eY + 0.62 * s;
  const eL = w / 2 + 0.16;
  const rL = eL + 0.06;
  maiHaiDoc(m, r, hx, hz + gal / 2, eY, rY, eL, rL, (d + gal) / 2 + 0.2, 0.07);
  const mau = r.trim !== null ? r.trim : C.woodDark;
  for (const e of [-1, 1]) khauCut(m, hx + e * (rL - 0.04), rY, hz + gal / 2, Math.max(s, 0.95), mau, r.trim !== null ? C.bronzeLight : C.bronze);
  if (r.lac) lacBird(m, hx, rY + 0.05, hz + gal / 2, 0, 0.42);
  return gop(m, n);
}

/** Cây cau thân mảnh, chùm tàu lá: dáng gọn của `arecaPalm`. */
function caySau(b: ShapeBuilder, x: number, z: number, h: number): void {
  b.cyl(0.035, 0.055, h, C.palm, x, h / 2, z, undefined, 6);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = new THREE.BoxGeometry(0.12, 0.02, 0.6);
    leaf.translate(0, 0, 0.3);
    leaf.rotateX(0.55 + (i % 2) * 0.25);
    leaf.rotateY(a);
    b.add(leaf, i % 2 ? C.leaf[1] : C.leaf[3], x, h, z);
  }
}

function gop(m: ToonModel, n: ToonModel): THREE.Group {
  const g = m.group();
  for (const c of n.group().children.slice()) g.add(c);
  return g;
}

// ---------- Chụp ----------

export interface Mau {
  id: string;
  make: (level: number) => THREE.Group;
  spots: LotSpot[];
}

export const MAU: Mau[] = [
  { id: 'luoiRiu', make: nhaLuoiRiu, spots: [{ job: 'phuNu', x: 0.6, z: 0.85, y: 0.05, ry: 0.4 }, { job: 'phuNu', x: -1.05, z: 1.05, y: 0.05, ry: -0.7 }] },
  { id: 'maiChum', make: nhaMaiChum, spots: [{ job: 'phuNu', x: 0.72, z: 0.78, y: 0.05, ry: 1.2 }, { job: 'phuNu', x: -1.05, z: 1.05, y: 0.05, ry: -0.7 }] },
  { id: 'benAo', make: nhaBenAo, spots: [{ job: 'phuNu', x: 1.05, z: 0.5, y: 0.05, ry: -0.3 }, { job: 'phuNu', x: 0.75, z: 1.1, y: 0.05, ry: 0.6 }] },
  { id: 'khauCut', make: nhaKhauCut, spots: [{ job: 'phuNu', x: 0.6, z: 0.95, y: 0.05, ry: 0.4 }, { job: 'phuNu', x: -0.9, z: 0.95, y: 0.05, ry: -0.5 }] },
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
  const half = 3.7;
  const h = Math.round(2 * half * 60);
  const w = Math.round(h * 1.1);
  const out: Anh[] = [];
  for (const mau of [HIEN_TAI, ...MAU]) {
    for (const cap of caps) {
      const scene = newScene(5);
      scene.add(groundPatch(5, [{ x: 0, z: 0, tiles: 3 }]));
      datNha(scene, mau, cap, 0, 0);
      out.push({ id: mau.id, cap, src: chup(renderer, scene, w, h, half, V(0, 1.35, 0)) });
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
  const thu = cung ? [HIEN_TAI, HIEN_TAI, HIEN_TAI, HIEN_TAI, HIEN_TAI, HIEN_TAI] : [MAU[1], HIEN_TAI, MAU[0], MAU[3], MAU[2], MAU[1]];
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
