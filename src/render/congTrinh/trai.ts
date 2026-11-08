// Phần dùng chung của doanh trại và bốn nơi ở (trại giáo, trại cung, chuồng voi, trại nỏ): rào cọc vót nhọn, cổng tre,
// lầu cổng, giá giáo, cọc rơm, bao tên, cỡ lính. Doanh trại và nơi ở cùng một kiểu khuôn viên: rào hay tường quanh mép,
// lầu cổng giữa mặt trước, sân tập ở giữa (mục Kế hoạch: một doanh trại lớn trong docs/thiet-ke.md).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boatRoof, roofFor, type Roof } from '../buildings';
import { C } from '../palette';
import type { Act } from '../rig';
import { bakeSoldier, type SoldierKind } from '../soldier';
import { ToonModel } from '../toon';
import { type LotSpot, yard } from './chung';

/** Lính đứng trong doanh trại, nơi ở giữ cỡ như dáng cũ (0,72 lần, cả mô hình cũ thu 0,95). */
export const LINH = 0.72 * 0.95;
/** Nửa bề rộng cửa cổng. */
export const GATE_HALF = 0.5;
/** Mặt sàn lầu cổng. */
export const LAU_Y = 1.1;
/** Nửa cạnh đường rào nơi ở 4×4: cọc đứng sát mép móng mà không chìa ra ngoài. */
export const RAO = 1.93;
/** Lầu cổng nơi ở nhỏ hơn lầu cổng doanh trại chừng này. */
const LAU_NOI_O = 0.85;

/**
 * Rào cọc vót nhọn quanh mép móng (nửa cạnh `half`), cùng kiểu rào doanh trại (cọc cao 0,62, cách 0,3, hai đai
 * buộc ngang), để ba nơi ở dựng sát doanh trại nhìn ra một cụm quân; chừa cổng rộng `gate` giữa mặt trước, hai cọc cổng
 * to, cao hơn buộc vải đỏ. `step`: khoảng cách cọc; `h`: cao cọc; `rails`: độ cao các đai (chuồng voi dùng cọc thưa,
 * cao hơn và hai thanh rào ngang cao hơn).
 */
export function raoCocNhon(m: ToonModel, half: number, gate: number, o: { step?: number; h?: number; r?: number; rails?: number[]; railColor?: number } = {}): void {
  const p = m.plain;
  const step = o.step ?? 0.3;
  const h = o.h ?? 0.62;
  const r = o.r ?? 0.05;
  const rails = o.rails ?? [0.16, 0.36];
  const n = Math.round((2 * half) / step);
  const at = (i: number) => -half + (i * 2 * half) / n;
  const stakes: [number, number][] = [];
  for (let i = 0; i <= n; i++) stakes.push([at(i), -half]);
  for (let i = 1; i <= n; i++) stakes.push([-half, at(i)], [half, at(i)]);
  for (let i = 1; i < n; i++) if (Math.abs(at(i)) > gate / 2 + step * 0.4) stakes.push([at(i), half]);
  for (const [x, z] of stakes) p.cone(r, h, C.wood, x, h / 2 + 0.02, z, undefined, 4);
  const railC = o.railColor ?? C.woodDark;
  const side = half - gate / 2;
  for (const y of rails) {
    p.box(2 * half, 0.04, 0.04, railC, 0, y, -half);
    for (const s of [-1, 1]) {
      p.box(0.04, 0.04, 2 * half, railC, s * half, y, 0);
      p.box(side, 0.04, 0.04, railC, s * (gate / 2 + side / 2), y, half);
    }
  }
  // Hai cọc cổng to, cao hơn, buộc vải đỏ.
  for (const s of [-1, 1]) {
    const x = (s * gate) / 2;
    const gh = h * 1.3;
    p.cyl(r * 1.05, r * 1.2, gh - 0.14, C.woodDark, x, (gh - 0.14) / 2 + 0.02, half, undefined, 6);
    p.cone(r * 1.05, 0.16, C.woodDark, x, gh - 0.04, half, undefined, 6);
    m.band.box(0.13, 0.12, 0.13, C.red, x, gh - 0.3, half);
  }
}

/** Giá giáo dựng dọc trục x: hai cột, xà ngang, giáo dựa xà ngả về sau, mũi đồng lớn (cỡ như dáng cũ). */
export function giaGiao(m: ToonModel, x: number, z: number, w: number, count: number): void {
  const p = m.plain;
  for (const s of [-1, 1]) p.cyl(0.033, 0.038, 0.9, C.woodDark, x + (s * w) / 2, 0.45, z - 0.09, undefined, 6);
  p.box(w + 0.08, 0.06, 0.06, C.woodDark, x, 0.86, z - 0.09);
  const tilt = 0.18;
  for (let i = 0; i < count; i++) {
    const sx = x - w / 2 + 0.08 + (i * (w - 0.16)) / (count - 1);
    p.cyl(0.015, 0.015, 1.19, C.woodDark, sx, 0.59, z, [-tilt, 0, 0], 5);
    p.cone(0.048, 0.19, C.bronze, sx, 0.59 + 0.69 * Math.cos(tilt), z - 0.69 * Math.sin(tilt), [-tilt, 0, 0], 4);
  }
}

/**
 * Cọc rơm tập đâm (cỡ như `strawDummy` cũ): cọc gỗ, bó rơm làm thân hạ thấp ngang tầm mũi giáo của lính đứng thế thủ,
 * thanh ngang làm vai, nắm rơm làm đầu.
 */
export function cocRom(p: ToonModel['plain'], x: number, z: number): void {
  p.cyl(0.026, 0.026, 0.68, C.woodDark, x, 0.39, z, undefined, 5);
  p.cyl(0.11, 0.11, 0.31, C.thatch, x, 0.42, z, undefined, 7);
  p.box(0.043, 0.043, 0.34, C.woodDark, x, 0.62, z);
  p.cyl(0.055, 0.065, 0.12, C.thatch, x, 0.73, z, undefined, 5);
}

/** Bao tên đan dựng đứng, mấy mũi tên thò lên. */
export function quiver(p: ToonModel['plain'], x: number, z: number, y = 0.05): void {
  p.cyl(0.055, 0.048, 0.32, C.earthDark, x, y + 0.16, z, undefined, 7);
  p.cyl(0.058, 0.058, 0.04, C.red, x, y + 0.26, z, undefined, 7);
  for (const d of [-0.022, 0.022]) p.cyl(0.007, 0.007, 0.2, C.woodLight, x + d, y + 0.4, z + d * 0.5, undefined, 3);
}

/** Vẽ trong khung riêng ở (x, z) xoay `ry`, phóng `s`, rồi trả khung cũ. */
export function inFrame(m: ToonModel, x: number, z: number, ry: number, draw: () => void, s = 1): void {
  const f = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s));
  const keep = [m.plain.frame, m.band.frame, m.drum.frame] as const;
  m.plain.frame = f;
  m.band.frame = f;
  m.drum.frame = f;
  draw();
  [m.plain.frame, m.band.frame, m.drum.frame] = keep;
}

/**
 * Cổng tre (cấp 1, trong khung cổng: gốc giữa cổng trên đường rào, +z ra ngoài): hai cột đầu vót, xà ngang, vải đỏ,
 * cờ đuôi nheo đỏ trên đầu cột.
 */
export function congTre(m: ToonModel): void {
  const p = m.plain;
  for (const sx of [-1, 1]) {
    p.cyl(0.06, 0.07, 1.6, C.woodDark, sx * GATE_HALF, 0.8, 0, undefined, 6);
    p.cone(0.075, 0.16, C.wood, sx * GATE_HALF, 1.68, 0, undefined, 6);
    m.band.box(0.03, 0.34, 0.22, C.red, sx * GATE_HALF, 1.46, -0.14);
  }
  p.box(1.16, 0.09, 0.12, C.wood, 0, 1.45, 0);
  m.band.box(0.6, 0.22, 0.04, C.red, 0, 1.28, 0.05);
}

/**
 * Lầu cổng (trong khung cổng): bốn cột chân đứng hai bên cửa, sàn lầu có lan can đỏ, chòi tre mái tranh cong, cờ đuôi
 * nheo đỏ cắm góc lầu.
 */
export function lauCong(m: ToonModel, roof: Roof): void {
  const p = m.plain;
  for (const x of [-GATE_HALF, GATE_HALF]) {
    for (const z of [-0.22, 0.22]) p.cyl(0.055, 0.065, LAU_Y, C.woodDark, x, LAU_Y / 2, z, undefined, 6);
    // Giằng chéo hai cột mỗi bên cửa.
    p.box(0.04, 0.04, 0.5, C.wood, x, 0.5, 0, [0.9, 0, 0]);
  }
  for (const z of [-0.22, 0.22]) p.box(2 * GATE_HALF + 0.14, 0.08, 0.08, C.wood, 0, LAU_Y - 0.12, z);
  p.box(1.34, 0.07, 0.66, C.wood, 0, LAU_Y, 0);
  for (const s of [-1, 1]) {
    m.band.box(1.34, 0.12, 0.04, C.red, 0, LAU_Y + 0.1, s * 0.31);
    m.band.box(0.04, 0.12, 0.66, C.red, s * 0.65, LAU_Y + 0.1, 0);
  }
  for (const x of [-0.58, 0.58]) for (const z of [-0.27, 0.27]) p.cyl(0.026, 0.026, 0.52, C.woodDark, x, LAU_Y + 0.27, z, undefined, 5);
  boatRoof(m, roof, { length: 1.55, width: 0.92, lift: 0.22, drop: 0.92 * 0.4, thickness: 0.07 }, 0, LAU_Y + 0.88, 0);
  // Cờ đuôi nheo trên cột tre cắm góc lầu, bay cao hơn nóc.
  const fx = -0.62;
  p.cyl(0.018, 0.018, 1.25, C.bamboo, fx, LAU_Y + 0.62, 0.26, undefined, 4);
  m.band.box(0.36, 0.2, 0.025, C.red, fx + 0.19, LAU_Y + 1.1, 0.26);
  m.band.box(0.18, 0.1, 0.025, C.red, fx + 0.42, LAU_Y + 1.06, 0.26, [0, 0, -0.35]);
}

/** Một lính đứng trong doanh trại hay nơi ở: binh chủng, bậc binh khí, chỗ đứng (tọa độ móng), góc quay, tư thế. */
export interface LinhDung {
  kind: SoldierKind;
  tier: number;
  x: number;
  z: number;
  ry: number;
  act: Act;
  /** Đứng cao hơn mặt sân chừng này (trên ụ đất). */
  y?: number;
}

/** Một hình tĩnh (`bakeRig`) đặt trong sân: chỗ đứng, góc quay, độ cao trên mặt sân. */
export interface HinhDat {
  g: THREE.Group;
  x: number;
  z: number;
  ry: number;
  y?: number;
}

/**
 * Các hình tĩnh `list` gộp thành một lưới mỗi chất liệu (vài lính, vài voi chỉ còn 2–4 lệnh vẽ). Lưới gộp tính theo cỡ
 * gốc của hình rồi thu cả nhóm lại `LINH`, để viền mực mảnh như hình đứng riêng. `shadow`: phần màu đổ bóng (voi).
 */
export function gopHinh(list: HinhDat[], shadow = false): THREE.Group {
  const buckets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; ink: boolean }>();
  const mtx = new THREE.Matrix4();
  const one = new THREE.Vector3(1, 1, 1);
  for (const s of list) {
    mtx.compose(new THREE.Vector3(s.x / LINH, (0.05 + (s.y ?? 0)) / LINH, s.z / LINH), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.ry, 0)), one);
    for (const c of s.g.children) {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) continue;
      const geo = mesh.geometry.applyMatrix4(mtx);
      const mat = mesh.material as THREE.Material;
      const key = `${mat.uuid}|${Object.keys(geo.attributes).sort().join(',')}|${!!geo.index}`;
      const b = buckets.get(key) ?? { mat, geos: [], ink: !mesh.castShadow };
      b.geos.push(geo);
      buckets.set(key, b);
    }
  }
  const out = new THREE.Group();
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    for (const g of b.geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.receiveShadow = true;
    mesh.castShadow = shadow && !b.ink;
    out.add(mesh);
  }
  out.scale.setScalar(LINH);
  return out;
}

/** Lính tập đứng trong sân (`gopHinh`), không đổ bóng. */
export const gopLinh = (list: LinhDung[]): THREE.Group => gopHinh(list.map((s) => ({ ...s, g: bakeSoldier(s.kind, s.tier, s.act) })));

/**
 * Khuôn viên nơi ở 4×4 (cùng kiểu doanh trại): sân, rào cọc vót nhọn quanh mép, lầu cổng mái tranh giữa mặt trước, lối
 * đất từ cổng vào sân. `rao`: kiểu rào (chuồng voi cọc thưa, cao, có thanh ngang).
 */
export function khuonVien(m: ToonModel, rao: Parameters<typeof raoCocNhon>[3] = {}): void {
  yard(m, 4);
  raoCocNhon(m, RAO, 2 * GATE_HALF, rao);
  inFrame(m, 0, RAO, 0, () => lauCong(m, roofFor(1)), LAU_NOI_O);
  m.plain.box(0.8, 0.03, 0.7, C.earth, 0, 0.055, RAO - 0.5);
}

/** Lính gác đứng trên sàn lầu cổng nơi ở, nhìn ra ngoài. */
export const noiOSpots = (): LotSpot[] => [{ job: 'linhGac', x: 0.24, y: LAU_Y * LAU_NOI_O + 0.04, z: RAO, ry: 0 }];
