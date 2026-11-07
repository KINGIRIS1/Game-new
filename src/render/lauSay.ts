// Lau sậy dùng chung cho bãi chiến: bờ sông, đầm (`battlefield.ts`) và bãi bùn giữa bãi (`vatCan.ts`).

import type * as THREE from 'three';
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
