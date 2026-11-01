// Phần dùng chung của công trình vẽ trên móng mới (mục "Kế hoạch: công trình to hơn" ở docs/thiet-ke.md).
// Mỗi công trình một tệp trong thư mục này, theo bản vẽ ô con ở docs/bo-cuc-cong-trinh.md (đọc bằng `Lot`).
// Nguyên tắc: người, thú, đồ vật giữ cỡ như dáng cũ; phần chính to hơn dáng cũ chừng 15–30%; móng rộng ra để có sân,
// lối, rào; không thu tâm như dáng cũ (setSpread): mỗi phần đứng trong khối chữ của nó và to dần tại chỗ.
// Gốc tọa độ là tâm móng, mặt trước hướng +z, đơn vị là ô đất.

import type * as THREE from 'three';
import type { Job } from '../people';
import { C } from '../palette';
import type { ToonModel } from '../toon';

/** Cỡ phần chính theo cấp: 85% ở cấp 1 tới 105% ở cấp 5, như dáng cũ; cấp 6–8 cao lên chứ không rộng ra. */
export const partScale = (level: number) => 0.8 + 0.05 * Math.min(level, 5);

/** Người đứng trên móng (tọa độ móng, mô hình không phóng to). `walk`: đi qua lại chừng này ô. */
export interface LotSpot {
  job: Job;
  x: number;
  y: number;
  z: number;
  ry: number;
  walk?: number;
}

/** Màu sân đất nện: sáng hơn đất trồng để móng không nặng màu giữa cỏ. */
export const YARD = 0xcfb07a;

/** Sân phủ cả móng `tiles` ô, mép thấp cho thấy ranh móng. */
export function yard(m: ToonModel, tiles: number, color: number = YARD): void {
  m.plain.box(tiles - 0.06, 0.05, tiles - 0.06, color, 0, 0.025, 0);
}

/** Hàng rào cột chạm quanh mép móng, đầu cột bọc đồng, chừa cổng rộng `gate` giữa mặt trước. */
export function postFence(m: ToonModel, half: number, gate: number, step = 0.62): void {
  const p = m.plain;
  const n = Math.round((2 * half) / step);
  const posts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = -half + (i * 2 * half) / n;
    posts.push([t, -half], [-half, t], [half, t]);
    if (Math.abs(t) > gate / 2) posts.push([t, half]);
  }
  for (const [x, z] of posts) {
    p.cyl(0.045, 0.05, 0.55, C.woodDark, x, 0.3, z, undefined, 6);
    p.sphere(0.065, C.bronze, x, 0.6, z, [1, 1, 1], 6);
  }
  const rail = 0.42;
  p.box(2 * half, 0.05, 0.05, C.wood, 0, rail, -half);
  for (const s of [-1, 1]) {
    p.box(0.05, 0.05, 2 * half, C.wood, s * half, rail, 0);
    const len = half - gate / 2;
    p.box(len, 0.05, 0.05, C.wood, s * (gate / 2 + len / 2), rail, half);
  }
}

/** Khung chụp cho scripts/chup-cong-trinh.mjs: nửa chiều cao khung (ô), độ cao tâm nhìn, điểm ảnh mỗi ô. */
export interface View {
  half: number;
  lookY: number;
  px: number;
}

/** Thuyền neo theo bến (tọa độ móng; world.ts đặt ở mặt nước). */
export interface Dock {
  kind: 'small' | 'trader';
  x: number;
  z: number;
  ry: number;
  scale?: number;
}

/** Một công trình vẽ trên móng mới. */
export interface CongTrinh {
  /** Cạnh móng (ô). */
  tiles: number;
  make: (level: number) => THREE.Group;
  /** Mọi chỗ đứng của người ở cấp này; world.ts lấy đúng số người đang làm (hay 1–2 người) từ đầu danh sách. */
  spots: (level: number) => LotSpot[];
  view: View;
  /** Thuyền neo (chỉ bến). */
  docks?: (level: number) => Dock[];
}
