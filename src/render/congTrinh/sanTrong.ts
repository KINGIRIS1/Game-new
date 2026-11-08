// Sân trống đồng 3×3: đồ trang trí, chỉ để nhìn. Trống đồng lớn dáng Đông Sơn (chân loe, lưng thắt, tang phình, mặt
// rộng chìa ra, bốn đôi quai, bốn tượng cóc cầu mưa trên mặt trống) đặt trên bệ đá tròn hai bậc; hai cột chim Lạc góc
// sau, hai bát lửa đồng hai bên lối, giá dùi trống trên bệ. Bản vẽ ở docs/bo-cuc-cong-trinh.md. Một cấp.

import * as THREE from 'three';
import { lacBird } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { seeded, type ShapeBuilder } from '../shapes';
import { ToonModel } from '../toon';
import { type CongTrinh, rod } from './chung';

export const SAN_TRONG_LOT = new Lot(3, [
  'C....C',
  '..BB..',
  '.BTTB.',
  '.BTTB.',
  'L.dB.L',
  '..,,..',
]);

const LAWN = 0x93a85a;
const GRASS = [0x6f9a3e, 0x7fa845, 0x5f8a36] as const;
const PAVE = [0xc2b8a4, 0xb3a895] as const;
const STONE = 0xa39a8c;
const STONE_DARK = 0x7f766a;
const STONE_LIGHT = 0xc4bcae;
/** Mặt sân lát đá quanh bệ; mặt bậc dưới; mặt bệ, chỗ chân trống đứng. */
const PAVE_Y = 0.07;
const STEP_Y = 0.15;
const FLOOR_Y = 0.24;
/** Bán kính sân lát; bậc dưới; mặt bệ. */
const PAVE_R = 1.3;
const STEP_R = 1.16;
const FLOOR_R = 1.0;
/** Mặt trống cách chân trống chừng này, mặt rộng chừng này. */
const DRUM_TOP = 1.02;
const DRUM_R = 0.7;

/** Khối tiện tròn quanh trục đứng: `pts` là [bán kính, độ cao], từ dưới lên. */
function turned(b: ShapeBuilder, pts: [number, number][], color: number, y: number): void {
  b.add(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 36), color, 0, y, 0);
}

/** Vẽ trong khung riêng: gốc ở (x, y, z), xoay `ry` quanh trục đứng, phóng `s` lần. */
function framed(p: ShapeBuilder, x: number, y: number, z: number, ry: number, s: number, draw: () => void): void {
  p.frame = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s));
  draw();
  p.frame = null;
}

/** Cỏ cả móng, khóm cỏ ở bốn góc, sân lát đá tròn có viền đá, bệ đá hai bậc, bậc đá lên bệ ở mặt trước. */
function ground(m: ToonModel): void {
  const p = m.plain;
  const rand = seeded(1908);
  p.box(3 - 0.06, 0.04, 3 - 0.06, LAWN, 0, 0.02, 0);
  for (let i = 0; i < 14; i++) {
    const sx = i % 4 < 2 ? 1 : -1;
    const sz = i % 2 ? 1 : -1;
    const x = sx * (1.08 + rand() * 0.3);
    const z = sz * (1.08 + rand() * 0.3);
    if (Math.hypot(x, z) < PAVE_R + 0.1) continue;
    p.cone(0.075, 0.2 + rand() * 0.1, GRASS[i % 3], x, 0.13, z, undefined, 5);
  }
  p.cyl(PAVE_R, PAVE_R, 0.03, PAVE[0], 0, PAVE_Y - 0.015, 0, undefined, 36);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    p.box(0.3, 0.05, 0.1, PAVE[(i + 1) % 2], Math.cos(a) * PAVE_R, PAVE_Y - 0.01, Math.sin(a) * PAVE_R, [0, Math.PI / 2 - a, 0]);
  }
  p.cyl(STEP_R, STEP_R + 0.02, STEP_Y - PAVE_Y, STONE_DARK, 0, (STEP_Y + PAVE_Y) / 2, 0, undefined, 36);
  p.cyl(FLOOR_R, FLOOR_R, FLOOR_Y - STEP_Y, STONE, 0, (FLOOR_Y + STEP_Y) / 2, 0, undefined, 36);
  // Dải hoa văn tròn đồng tâm dát trên mặt bệ, quanh chân trống.
  turned(m.band, [[0.97, FLOOR_Y + 0.006], [0.76, FLOOR_Y + 0.006]], STONE_LIGHT, 0);
  const walk = SAN_TRONG_LOT.zone(',');
  const zEdge = STEP_R - 0.06;
  const zEnd = walk.z + walk.d / 2 - 0.06;
  const d = (zEnd - zEdge) / 2;
  for (let i = 0; i < 2; i++) p.box(0.8, 0.06, d - 0.03, PAVE[i % 2], walk.x, PAVE_Y + 0.04 - i * 0.02, zEdge + (i + 0.5) * d);
}

/** Tượng cóc đồng trên mặt trống, đầu hướng +z (trong khung): thân dẹt rộng, hai mắt lồi, hai chân sau xòe. */
function coc(p: ShapeBuilder): void {
  p.sphere(0.09, C.bronzeLight, 0, 0.035, 0, [1.05, 0.55, 1.2], 8);
  for (const s of [-1, 1]) {
    p.sphere(0.024, C.gold, s * 0.042, 0.082, 0.062, [1, 1, 1], 6);
    p.box(0.1, 0.035, 0.05, C.bronze, s * 0.095, 0.02, -0.06, [0, s * 0.5, 0]);
  }
}

/**
 * Trống đồng dáng Đông Sơn: chân loe, lưng thắt có dải hoa văn, tang phình có dải hoa văn sát mặt, mặt rộng chìa ra
 * ngoài tang, mặt trống có ngôi sao và chim bay, bốn đôi quai nối tang với lưng, bốn tượng cóc trên mặt trống.
 */
function bronzeDrum(m: ToonModel): void {
  const p = m.plain;
  const y = FLOOR_Y;
  turned(p, [[0.64, 0], [0.62, 0.05], [0.54, 0.24]], C.bronzeDark, y);
  turned(m.band, [[0.54, 0.24], [0.49, 0.46]], C.bronze, y);
  turned(p, [[0.49, 0.46], [0.48, 0.54], [0.56, 0.66], [0.63, 0.78]], C.bronzeDark, y);
  turned(m.band, [[0.63, 0.78], [0.64, 0.9]], C.bronzeLight, y);
  turned(p, [[0.64, 0.9], [DRUM_R - 0.01, DRUM_TOP - 0.03], [DRUM_R, DRUM_TOP]], C.bronze, y);
  m.drum.cyl(DRUM_R, DRUM_R, 0.03, 0xf4d58a, 0, y + DRUM_TOP, 0, undefined, 36);
  // Bốn đôi quai: vòng nửa tròn nối tang với lưng.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    for (const off of [-0.17, 0.17]) {
      const t = a + off;
      p.add(new THREE.TorusGeometry(0.13, 0.021, 6, 10, Math.PI), C.bronzeLight, Math.cos(t) * 0.49, y + 0.61, Math.sin(t) * 0.49, [0, -t, -Math.PI / 2]);
    }
  }
  // Bốn tượng cóc đi ngược chiều kim đồng hồ quanh vành mặt trống.
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    framed(p, Math.cos(a) * 0.54, y + DRUM_TOP + 0.015, Math.sin(a) * 0.54, Math.PI - a, 1.45, () => coc(p));
  }
}

/** Hai cột chim Lạc góc sau: chân đá, cột gỗ đai đồng, dải hoa văn trên cột, chim Lạc dang cánh nhìn ra trước. */
function lacPosts(m: ToonModel): void {
  const p = m.plain;
  const H = 1.62;
  for (const c of SAN_TRONG_LOT.groups('C')) {
    p.box(0.3, 0.1, 0.3, STONE_DARK, c.x, 0.09, c.z);
    p.box(0.22, 0.06, 0.22, STONE, c.x, 0.17, c.z);
    p.cyl(0.05, 0.07, H, C.woodDark, c.x, 0.2 + H / 2, c.z, undefined, 8);
    for (const h of [0.34, 0.72]) p.cyl(0.076, 0.076, 0.035, C.bronze, c.x, 0.2 + h, c.z, undefined, 10);
    m.band.cyl(0.066, 0.066, 0.3, C.red, c.x, 0.2 + H - 0.42, c.z, undefined, 10);
    p.cyl(0.085, 0.06, 0.05, C.bronzeLight, c.x, 0.2 + H, c.z, undefined, 10);
    lacBird(m, c.x, 0.2 + H - 0.04, c.z, 0, 0.85);
  }
}

/** Hai bát lửa đồng hai bên lối: chân đá, ba chân đồng, bát đồng dải hoa văn, than hồng và lửa. */
function fireBowls(m: ToonModel): void {
  const p = m.plain;
  for (const l of SAN_TRONG_LOT.groups('L')) {
    p.cyl(0.2, 0.23, 0.08, STONE_DARK, l.x, 0.08, l.z, undefined, 10);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      rod(p, [l.x + Math.cos(a) * 0.14, 0.12, l.z + Math.sin(a) * 0.14], [l.x + Math.cos(a) * 0.09, 0.42, l.z + Math.sin(a) * 0.09], 0.016, C.bronzeDark, 5);
    }
    p.sphere(0.16, C.bronze, l.x, 0.45, l.z, [1, 0.62, 1], 10);
    m.band.cyl(0.165, 0.165, 0.06, C.bronzeLight, l.x, 0.52, l.z, undefined, 12);
    p.cyl(0.14, 0.14, 0.02, C.woodDark, l.x, 0.55, l.z, undefined, 10);
    m.glow.cone(0.1, 0.24, C.fire, l.x, 0.67, l.z, undefined, 7);
    m.glow.cone(0.055, 0.16, C.ember, l.x, 0.63, l.z, undefined, 6);
  }
}

/** Giá dùi trống đặt trên bệ, trước mặt trống: hai cọc gỗ gác đôi dùi đầu bọc vải đỏ. */
function malletRack(p: ShapeBuilder): void {
  const d = SAN_TRONG_LOT.zone('d');
  const y = FLOOR_Y;
  for (const s of [-1, 1]) p.box(0.04, 0.2, 0.05, C.woodDark, d.x + s * 0.19, y + 0.1, d.z);
  p.box(0.44, 0.03, 0.05, C.wood, d.x, y + 0.2, d.z);
  for (const s of [-1, 1]) {
    const z = d.z + s * 0.012;
    const x = d.x + s * 0.05;
    rod(p, [x - 0.24, y + 0.3, z], [x + 0.2, y + 0.24, z], 0.012, C.woodLight, 5);
    p.sphere(0.042, C.red, x - 0.26, y + 0.305, z, [1.3, 1, 1], 6);
  }
}

export function makeSanTrong(): THREE.Group {
  const m = new ToonModel();
  ground(m);
  bronzeDrum(m);
  lacPosts(m);
  fireBowls(m);
  malletRack(m.plain);
  return m.group();
}

export const SAN_TRONG: CongTrinh = { tiles: 3, make: makeSanTrong, spots: () => [], view: { half: 2.4, lookY: 0.8, px: 110 } };
