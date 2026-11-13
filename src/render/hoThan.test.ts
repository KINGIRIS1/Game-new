// Canh linh vật hộ thân của tướng (`hoThan.ts`): rồng cuốn, chim Lạc bay quanh là nhóm con của mô hình tướng, cử động
// theo `Act.time` sau tư thế của tướng, tan khi tướng ngã; chim vỗ cánh bằng ba dáng cánh, mỗi lúc chỉ hiện một dáng.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Act, Poser } from './rig';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

let H: typeof import('./hoThan');
beforeAll(async () => {
  H = await import('./hoThan');
});

/** Mô hình tướng giả: nhóm rỗng có tư thế ghi lại lần gọi. */
function tuongGia(): { group: THREE.Group; calls: Act[] } {
  const group = new THREE.Group();
  const calls: Act[] = [];
  group.userData.pose = ((a: Act) => calls.push(a)) as Poser;
  return { group, calls };
}

const pose = (g: THREE.Group, a: Act) => (g.userData.pose as Poser)(a);
const LOOK = { body: 0xe8b830, belly: 0xf3e6c4, fin: 0xa8322a, horn: 0x7d5a22 };

describe('Rồng cuốn quanh tướng nam', () => {
  it('là nhóm con của tướng, vẫn gọi tư thế của tướng, phóng theo cỡ tướng', () => {
    const { group, calls } = tuongGia();
    expect(H.addRong(group, LOOK, { k: 1.4 })).toBe(group);
    expect(group.children).toHaveLength(1);
    const rong = group.children[0];
    expect(rong.scale.x).toBeCloseTo(1.4);
    pose(group, { act: 'stand', time: 2 });
    expect(calls).toHaveLength(1);
    let tris = 0;
    rong.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (mesh.isMesh) tris += mesh.geometry.getAttribute('position').count / 3;
    });
    expect(tris).toBeGreaterThan(500);
    // Nhẹ máy: cả con rồng (kể viền mực) không quá 8 nghìn tam giác.
    expect(tris).toBeLessThan(8000);
  });

  it('lắc lư, nhấp nhô theo đồng hồ; đặt đúng chỗ ngồi khi tướng cưỡi thú', () => {
    const { group } = tuongGia();
    H.addRong(group, LOOK, { k: 1.5, at: [0, 1.1, -0.03], from: 0.34, turns: 1.4 });
    const rong = group.children[0];
    pose(group, { act: 'stand', time: 0 });
    const y0 = rong.rotation.y;
    expect(rong.position.x).toBe(0);
    expect(rong.position.y).toBeCloseTo(1.1);
    expect(rong.position.z).toBeCloseTo(-0.03);
    pose(group, { act: 'walk', time: 1 });
    expect(rong.rotation.y).not.toBeCloseTo(y0);
    // Đầu rồng không vòng ra trước mặt tướng: chỉ lắc trong một góc hẹp.
    for (let t = 0; t < 20; t += 0.25) {
      pose(group, { act: 'stand', time: t });
      expect(Math.abs(rong.rotation.y)).toBeLessThan(0.35);
    }
  });

  it('tan khi tướng ngã, hiện lại khi tướng đứng dậy', () => {
    const { group } = tuongGia();
    H.addRong(group, LOOK, { k: 1 });
    pose(group, { act: 'dead', fall: 1 });
    expect(group.children[0].visible).toBe(false);
    pose(group, { act: 'stand' });
    expect(group.children[0].visible).toBe(true);
  });
});

describe('Chim Lạc bay quanh tướng nữ', () => {
  it('thân một lưới, ba dáng cánh, mỗi lúc chỉ hiện một dáng', () => {
    const { group, calls } = tuongGia();
    H.addChimLac(group, 0x2f6fbf, { k: 1.22 });
    const dan = group.children[0];
    // Thân chim và ba dáng cánh.
    expect(dan.children).toHaveLength(4);
    const seen = new Set<number>();
    for (let t = 0; t < 2; t += 0.03) {
      pose(group, { act: 'stand', time: t });
      const hien = dan.children.slice(1).map((c) => c.visible);
      expect(hien.filter(Boolean)).toHaveLength(1);
      expect(dan.children[0].visible).toBe(true);
      seen.add(hien.indexOf(true));
    }
    expect(seen.size).toBe(3);
    expect(calls.length).toBeGreaterThan(10);
  });

  it('cả đàn bay vòng quanh người, tan khi tướng ngã', () => {
    const { group } = tuongGia();
    H.addChimLac(group, 0xa8322a, { k: 1.4, at: [0, 2, 0.1] });
    const dan = group.children[0];
    pose(group, { act: 'stand', time: 1 });
    const a = dan.rotation.y;
    pose(group, { act: 'stand', time: 2 });
    expect(dan.rotation.y).toBeGreaterThan(a);
    expect(dan.position.z).toBeCloseTo(0.1);
    pose(group, { act: 'dead', fall: 0.5 });
    expect(dan.visible).toBe(false);
  });
});
