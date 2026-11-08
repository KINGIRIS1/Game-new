// Lau sậy, ngô dùng chung cho bãi chiến: bờ sông, đầm, bãi ngô quanh bãi (`battlefield.ts`) và bãi bùn, khóm lau, ruộng
// ngô giữa bãi (`vatCan.ts`).

import * as THREE from 'three';
import { C } from './palette';
import { ShapeBuilder, seeded } from './shapes';
import { toon } from './toon';

/** Màu lau sậy: thân xanh, thân khô, lá, bông lau trắng bạc, bông sậy nâu tím. */
export const REED = { stalk: 0x8f9a4c, stalkDry: 0xa8a060, leaf: 0x6f8a3a, lau: 0xeee4cc, say: 0xa08068 };

/** Một khóm lau sậy: thân mảnh chếch ra, lá dài, ngọn trổ bông (lau trắng bạc hay sậy nâu tím). */
export function reedTemplate(seed: number, plume: number): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.2;
    const h = 0.85 + rand() * 0.6;
    const lean = 0.08 + rand() * 0.2;
    const dx = Math.cos(a) * Math.sin(lean);
    const dz = Math.sin(a) * Math.sin(lean);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const rot: [number, number, number] = [Math.sin(a) * lean, 0, -Math.cos(a) * lean];
    b.cone(0.024, h, i % 3 ? REED.stalk : REED.stalkDry, x + (dx * h) / 2, (Math.cos(lean) * h) / 2, z + (dz * h) / 2, rot, 3);
    // Bông trổ ở ngọn, chúc đầu theo chiều thân chếch.
    const tip = h + 0.14;
    b.cone(0.055, 0.34, plume, x + dx * tip, Math.cos(lean) * tip, z + dz * tip, [rot[0] * 2.2 + Math.PI, 0, rot[2] * 2.2], 4);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rand();
    const lean = 0.5 + rand() * 0.3;
    const len = 0.55 + rand() * 0.25;
    const s = Math.sin(lean) * len * 0.5;
    b.box(0.06, len, 0.012, REED.leaf, Math.cos(a) * s, Math.cos(lean) * len * 0.5, Math.sin(a) * s, [Math.sin(a) * lean, 0, -Math.cos(a) * lean]);
  }
  return b.mesh(toon);
}

let cached: THREE.Mesh[] | null = null;

/** Ba mẫu khóm dùng chung (lau, sậy, lau), dựng một lần: chỉ dùng trong lô bản sao, không gỡ khi đổi cảnh. */
export function reedTemplates(): THREE.Mesh[] {
  cached ??= [reedTemplate(3, REED.lau), reedTemplate(8, REED.say), reedTemplate(13, REED.lau)];
  return cached;
}

/**
 * Một khúc luống ngô: ba cây thẳng hàng theo trục x, lá to chĩa ra hai bên luống rồi rủ xuống, cờ ngô vàng khô
 * trên ngọn, bắp ngô bẹ xanh nhú hạt vàng có râu nâu.
 */
export function cornTemplate(seed: number): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.24 + (rand() - 0.5) * 0.05;
    const z = (rand() - 0.5) * 0.08;
    const h = 1.1 + rand() * 0.3;
    b.cyl(0.02, 0.034, h, 0x6f8f38, x, h / 2, z, undefined, 4);
    for (let k = 0; k < 4; k++) {
      // Lá mọc so le hai bên luống: đoạn gốc vươn chếch lên, đoạn ngọn rủ xuống.
      const side = k % 2 ? 1 : -1;
      const a = Math.PI / 2 + (side > 0 ? 0 : Math.PI) + (rand() - 0.5) * 0.7;
      const y = h * (0.24 + k * 0.18);
      const color = k % 2 ? C.corn : 0x9cb85a;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const l1 = 0.28 + rand() * 0.08;
      const t1 = 0.75;
      b.box(0.11, l1, 0.014, color, x + ca * Math.sin(t1) * l1 * 0.5, y + Math.cos(t1) * l1 * 0.5, z + sa * Math.sin(t1) * l1 * 0.5, [sa * t1, 0, -ca * t1]);
      const tx = x + ca * Math.sin(t1) * l1;
      const tyy = y + Math.cos(t1) * l1;
      const tz = z + sa * Math.sin(t1) * l1;
      const l2 = 0.26 + rand() * 0.08;
      const t2 = 1.85;
      b.box(0.09, l2, 0.012, color, tx + ca * Math.sin(t2) * l2 * 0.5, tyy + Math.cos(t2) * l2 * 0.5, tz + sa * Math.sin(t2) * l2 * 0.5, [sa * t2, 0, -ca * t2]);
    }
    // Cờ ngô: chùm nhánh vàng khô xòe trên ngọn.
    b.cone(0.018, 0.24, C.cornDry, x, h + 0.12, z, undefined, 3);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + rand();
      b.cone(0.014, 0.2, C.cornDry, x + Math.cos(a) * 0.05, h + 0.06, z + Math.sin(a) * 0.05, [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7], 3);
    }
    if (i !== 1) continue;
    // Bắp ngô chếch ra một bên thân cây giữa.
    const ey = h * (0.42 + rand() * 0.1);
    const es = rand() < 0.5 ? 1 : -1;
    b.add(new THREE.SphereGeometry(0.06, 5, 3), 0xbcc46a, x, ey, z + es * 0.06, [es * 0.45, 0, 0], [1, 2.3, 1]);
    b.add(new THREE.SphereGeometry(0.045, 5, 3), C.ripe, x, ey + 0.06, z + es * 0.1, [es * 0.45, 0, 0], [1, 1.6, 1]);
    b.cone(0.022, 0.09, 0x8a4a2a, x, ey + 0.16, z + es * 0.13, [es * 0.6, 0, 0], 3);
  }
  return b.mesh(toon);
}

let cachedCorn: THREE.Mesh[] | null = null;

/** Ba mẫu khúc luống ngô dùng chung, dựng một lần: chỉ dùng trong lô bản sao hay chép hình, không gỡ khi đổi cảnh. */
export function cornTemplates(): THREE.Mesh[] {
  cachedCorn ??= [cornTemplate(5), cornTemplate(19), cornTemplate(41)];
  return cachedCorn;
}
