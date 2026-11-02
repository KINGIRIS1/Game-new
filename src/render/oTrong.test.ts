// Canh trang trí ô trống (`oTrong.ts`): chỉ mọc trên ô trống đã mở, mỗi ô gieo theo hạt giống riêng, món nằm trọn
// trong ô, gần Điện sạch hơn ngoài xa.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GRID, RIVER_START } from '../game/map';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

const { WILD_RADIUS, WILD_VARIANTS, wildSpots, wildTemplates } = await import('./oTrong');
type Spot = ReturnType<typeof wildSpots>[number];

/** Mở hình vuông [lo, RIVER_START) ở góc sông, như đất đã khai phá. */
function openSquare(lo: number): Uint8Array {
  const mask = new Uint8Array(GRID * GRID);
  for (let z = lo; z < RIVER_START; z++) for (let x = lo; x < RIVER_START; x++) mask[z * GRID + x] = 1;
  return mask;
}

/** Đặt một công trình w×d ở (x, z) vào lưới chiếm ô. */
function occupy(occ: Int32Array, id: number, x: number, z: number, w: number, d = w): void {
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) occ[(z + dz) * GRID + x + dx] = id;
}

const tileOf = (s: Spot) => Math.floor(s.z) * GRID + Math.floor(s.x);
const key = (s: Spot) => `${s.kind}:${s.v}:${s.x.toFixed(4)}:${s.z.toFixed(4)}:${s.s.toFixed(4)}`;
const CENTER = { x: 39.5, z: 39.5 };

describe('trang trí ô trống', () => {
  it('chỉ mọc trên ô đã mở, không có công trình, không phải sông', () => {
    const mask = openSquare(32);
    const occ = new Int32Array(GRID * GRID);
    occupy(occ, 1, 37, 37, 5);
    occupy(occ, 2, 33, 40, 3);
    occ[45 * GRID + 45] = 3;
    const spots = wildSpots(mask, occ, CENTER);
    expect(spots.length).toBeGreaterThan(50);
    for (const s of spots) {
      const i = tileOf(s);
      expect(mask[i], `ô ${s.x}, ${s.z}`).toBe(1);
      expect(occ[i], `ô ${s.x}, ${s.z}`).toBe(0);
      expect(Math.floor(s.x)).toBeLessThan(RIVER_START);
      expect(Math.floor(s.z)).toBeLessThan(RIVER_START);
    }
  });

  it('món nằm trọn trong ô của nó, hai món cùng ô không chồng lên nhau', () => {
    const spots = wildSpots(openSquare(2), new Int32Array(GRID * GRID), CENTER);
    const byTile = new Map<number, Spot[]>();
    for (const s of spots) {
      const r = WILD_RADIUS[s.kind] * s.s;
      const fx = s.x - Math.floor(s.x);
      const fz = s.z - Math.floor(s.z);
      expect(Math.min(fx, 1 - fx, fz, 1 - fz) + 1e-9, `${s.kind} ở ${s.x}, ${s.z}`).toBeGreaterThanOrEqual(r);
      expect(s.v).toBeLessThan(WILD_VARIANTS[s.kind]);
      byTile.set(tileOf(s), [...(byTile.get(tileOf(s)) ?? []), s]);
    }
    for (const list of byTile.values()) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) expect(Math.hypot(list[i].x - list[j].x, list[i].z - list[j].z)).toBeGreaterThanOrEqual(0.26);
    }
  });

  it('mẫu vẽ không rộng quá bán kính khai báo, nên không lấn sang ô bên cạnh', () => {
    const t = wildTemplates();
    for (const [k, i] of t.of) {
      const geo = t.meshes[i].geometry;
      geo.computeBoundingBox();
      const pos = geo.getAttribute('position') as THREE.BufferAttribute;
      let r = 0;
      for (let j = 0; j < pos.count; j++) r = Math.max(r, Math.hypot(pos.getX(j), pos.getZ(j)));
      const kind = k.split(':')[0] as keyof typeof WILD_RADIUS;
      expect(r, k).toBeLessThanOrEqual(WILD_RADIUS[kind]);
      expect(geo.boundingBox!.max.y, k).toBeLessThan(0.35);
    }
  });

  it('mỗi ô gieo theo hạt giống riêng: dựng công trình chỗ khác không làm cỏ chỗ này đổi', () => {
    const mask = openSquare(32);
    const occ = new Int32Array(GRID * GRID);
    const before = wildSpots(mask, occ, CENTER);
    occupy(occ, 7, 34, 34, 3);
    const after = wildSpots(mask, occ, CENTER);
    const taken = (s: Spot) => occ[tileOf(s)] !== 0;
    expect(after.map(key)).toEqual(before.filter((s) => !taken(s)).map(key));
    expect(before.some(taken)).toBe(true);
  });

  it('gần Điện sạch hơn ngoài xa; đủ cả cỏ, hoa, đá; không ô nào quá rậm', () => {
    const spots = wildSpots(openSquare(2), new Int32Array(GRID * GRID), CENTER);
    const near = spots.filter((s) => Math.hypot(s.x - CENTER.x, s.z - CENTER.z) < 5).length / (Math.PI * 25);
    const far = spots.filter((s) => Math.hypot(s.x - CENTER.x, s.z - CENTER.z) > 20).length;
    const farTiles = (() => {
      let n = 0;
      for (let z = 2; z < RIVER_START; z++) for (let x = 2; x < RIVER_START; x++) if (Math.hypot(x + 0.5 - CENTER.x, z + 0.5 - CENTER.z) > 20) n++;
      return n;
    })();
    expect(near).toBeLessThan(0.45);
    expect(far / farTiles).toBeGreaterThan(0.6);
    expect(far / farTiles).toBeLessThan(1.3);
    for (const kind of ['co', 'hoa', 'da'] as const) expect(spots.some((s) => s.kind === kind), kind).toBe(true);
    const perTile = new Map<number, number>();
    for (const s of spots) perTile.set(tileOf(s), (perTile.get(tileOf(s)) ?? 0) + 1);
    expect(Math.max(...perTile.values())).toBeLessThanOrEqual(4);
    // Không ô nào trống cả một dải: cỏ rải khắp chứ không dồn cục.
    const share = perTile.size / ((RIVER_START - 2) * (RIVER_START - 2));
    expect(share).toBeGreaterThan(0.35);
  });
});
