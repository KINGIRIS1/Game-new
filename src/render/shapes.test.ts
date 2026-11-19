// Gộp đỉnh nhanh (`weld` ở shapes.ts) phải ra y hệt `mergeVertices` của three.js: cùng thứ tự đỉnh, cùng chỉ số, cùng
// kiểu mảng. Viền mực mọi mô hình (`smoothForOutline`) và mọi nhân vật (`skinnedOutline` ở rig.ts) dùng nó.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { describe, expect, it, vi } from 'vitest';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

/** Hai hình y hệt: cùng thuộc tính (tên, kiểu mảng, giá trị), cùng chỉ số, cùng nhóm. */
function giongHet(a: THREE.BufferGeometry, b: THREE.BufferGeometry, ten: string): void {
  expect(Object.keys(a.attributes), ten).toEqual(Object.keys(b.attributes));
  for (const n of Object.keys(a.attributes)) {
    const x = a.getAttribute(n) as THREE.BufferAttribute;
    const y = b.getAttribute(n) as THREE.BufferAttribute;
    expect(x.array.constructor, `${ten} ${n}`).toBe(y.array.constructor);
    expect(x.itemSize, `${ten} ${n}`).toBe(y.itemSize);
    expect(Array.from(x.array), `${ten} ${n}`).toEqual(Array.from(y.array));
  }
  expect(a.index!.array.constructor, ten).toBe(b.index!.array.constructor);
  expect(Array.from(a.index!.array), ten).toEqual(Array.from(b.index!.array));
  expect(a.groups, ten).toEqual(b.groups);
}

/** Số ngẫu nhiên lặp lại được. */
function rand(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hình thử: nhiều đỉnh trùng hẳn, nhiều đỉnh lệch nhau quanh đúng ngưỡng làm tròn (chỗ dễ lệch nhất), số âm, có
 * thuộc tính xương như nhân vật.
 */
function hinhThu(seed: number, n: number, tol: number, indexed: boolean): THREE.BufferGeometry {
  const r = rand(seed);
  const pos: number[] = [];
  const si: number[] = [];
  const sw: number[] = [];
  const base: number[][] = [];
  for (let i = 0; i < n; i++) {
    let p: number[];
    if (base.length && r() < 0.6) {
      // Chép một đỉnh cũ, có khi lệch đúng quanh nửa ngưỡng hay một ngưỡng.
      p = [...base[Math.floor(r() * base.length)]];
      const k = Math.floor(r() * 3);
      p[k] += [0, tol * 0.5, -tol * 0.5, tol * 0.49, tol * 0.51, tol, 1e-9][Math.floor(r() * 7)];
    } else {
      p = [(r() - 0.5) * 4, (r() - 0.5) * 4, (r() - 0.5) * 4].map((v) => Math.round(v / tol) * tol);
      base.push(p);
    }
    pos.push(...p);
    const b = Math.floor(r() * 3);
    si.push(b, b + 1, 0, 0);
    const w = r() < 0.7 ? 1 : 0.5;
    sw.push(w, 1 - w, 0, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  if (indexed) g.setIndex(Array.from({ length: n * 2 }, () => Math.floor(r() * n)));
  return g;
}

describe('gộp đỉnh nhanh (weld)', () => {
  it('ra y hệt mergeVertices trên hình thử: đỉnh lệch quanh ngưỡng làm tròn, có chỉ số hay không, nhiều ngưỡng', async () => {
    const { weld } = await import('./shapes');
    for (const tol of [1e-3, 1e-4, 1e-6]) {
      for (const indexed of [false, true]) {
        for (const seed of [1, 2, 3]) {
          const g = hinhThu(seed, 3000, tol, indexed);
          giongHet(weld(g, tol), mergeVertices(g, tol), `ngưỡng ${tol}, ${indexed ? 'có' : 'không'} chỉ số, hạt ${seed}`);
        }
      }
    }
  });

  it('trên hơn 65535 đỉnh mới thì chỉ số dùng Uint32 như three.js', async () => {
    const { weld } = await import('./shapes');
    const g = hinhThu(9, 120_000, 1e-3, false);
    const a = weld(g, 1e-3);
    expect(a.getAttribute('position').count).toBeGreaterThan(65535);
    giongHet(a, mergeVertices(g, 1e-3), 'hình lớn');
  });

  it('ra y hệt mergeVertices trên viền mực của mô hình thật (công trình, cảnh bãi chiến)', async () => {
    const { weld } = await import('./shapes');
    const { lotModel } = await import('./congTrinh/index');
    const { makeTent, makeBoat } = await import('./models');
    for (const [ten, obj] of [
      ['Điện cấp 8', lotModel('dien', 8)],
      ['lò rèn cấp 3', lotModel('loRen', 3)],
      ['lều', makeTent()],
      ['thuyền', makeBoat()],
    ] as const) {
      const geos: THREE.BufferGeometry[] = [];
      obj.traverse((o) => {
        if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh) && !o.geometry.index) {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', o.geometry.getAttribute('position').clone());
          if (o instanceof THREE.SkinnedMesh) for (const a of ['skinIndex', 'skinWeight']) g.setAttribute(a, o.geometry.getAttribute(a).clone());
          geos.push(g);
        }
      });
      expect(geos.length, ten).toBeGreaterThan(0);
      for (const [i, g] of geos.entries()) giongHet(weld(g, 1e-3), mergeVertices(g, 1e-3), `${ten} hình ${i}`);
      // Cả mô hình gộp một hình như viền mực nhân vật.
      const all = mergeGeometries(geos.filter((g) => !g.getAttribute('skinIndex')), false);
      if (all) giongHet(weld(all, 1e-3), mergeVertices(all, 1e-3), `${ten} gộp`);
    }
  });

  it('ra y hệt mergeVertices trên viền mực nhân vật có xương (Lạc tướng đánh trống, nặn thật)', async () => {
    const { weld } = await import('./shapes');
    const { makeDrummer } = await import('./heroes');
    const { inkThin } = await import('./toon');
    // Như `skinnedOutline` ở rig.ts: gộp mọi chất liệu, giữ vị trí và xương.
    const parts: THREE.BufferGeometry[] = [];
    makeDrummer().traverse((o) => {
      if (!(o instanceof THREE.SkinnedMesh) || o.material === inkThin) return;
      const g = new THREE.BufferGeometry();
      for (const a of ['position', 'skinIndex', 'skinWeight']) g.setAttribute(a, o.geometry.getAttribute(a).clone());
      parts.push(g);
    });
    expect(parts.length).toBeGreaterThan(1);
    const g = mergeGeometries(parts, false)!;
    expect(g.getAttribute('position').count).toBeGreaterThan(10_000);
    giongHet(weld(g, 1e-3), mergeVertices(g, 1e-3), 'người đánh trống');
  }, 60_000);
});
