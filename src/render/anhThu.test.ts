// Canh ảnh động thần thú vẽ sẵn (public/anh-thu/) khớp mô hình hiện tại: mỗi thú có ảnh, và dấu vân tay mô hình lúc vẽ
// (anhThuDau.ts) bằng dấu vân tay bây giờ. Đổi dáng thần thú thì chạy `node scripts/anh-thu.mjs` để vẽ lại ảnh.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import type * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

describe('ảnh động thần thú vẽ sẵn', () => {
  it('đủ năm thú, mỗi thú có ảnh vẽ từ đúng mô hình hiện tại (lệch thì chạy node scripts/anh-thu.mjs)', async () => {
    const { THAN_THU_IDS } = await import('../game/defs');
    const { thuHash, thuAct, thuScene, THU_KHUNG } = await import('./anhThu');
    const { ANH_THU_DAU } = await import('./anhThuDau');
    const files = Object.keys(import.meta.glob('../../public/anh-thu/*.webp'));
    const missing = THAN_THU_IDS.filter((k) => !files.includes(`../../public/anh-thu/${k}.webp`));
    expect(missing, 'thiếu ảnh').toEqual([]);
    const stale = THAN_THU_IDS.filter((k) => ANH_THU_DAU[k] !== thuHash(k));
    expect(stale, 'ảnh cũ, mô hình đã đổi').toEqual([]);
    // Dải khung lặp liền: tư thế ngay sau khung cuối y như khung đầu (vòng trọn nhịp, hay đi tới rồi lùi về chỗ cũ).
    const xuong = (k: (typeof THAN_THU_IDS)[number], i: number): number[] => {
      const g = thuScene(k);
      g.userData.pose(thuAct(k, i));
      const out: number[] = [];
      g.traverse((o) => {
        if ((o as THREE.Bone).isBone) out.push(...o.quaternion.toArray(), ...o.position.toArray());
      });
      return out;
    };
    for (const k of THAN_THU_IDS) {
      const a = xuong(k, 0);
      const b = xuong(k, THU_KHUNG);
      expect(Math.max(...a.map((v, i) => Math.abs(v - b[i]))), k).toBeLessThan(1e-6);
    }
  }, 60000);
});
