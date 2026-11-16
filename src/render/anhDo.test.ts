// Canh ảnh món trang bị vẽ sẵn (public/anh-do/) khớp mô hình hiện tại: mỗi món có ảnh, và dấu vân tay mô hình lúc vẽ ảnh
// (anhDoDau.ts) bằng dấu vân tay bây giờ. Đổi dáng món đồ thì chạy `node scripts/anh-do.mjs` để vẽ lại ảnh.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import { describe, expect, it, vi } from 'vitest';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

describe('ảnh món trang bị vẽ sẵn', () => {
  it('đủ 32 món, mỗi món có ảnh vẽ từ đúng mô hình hiện tại (lệch thì chạy node scripts/anh-do.mjs)', async () => {
    const { MON_IDS } = await import('./doTuong');
    const { monHash } = await import('./anhDo');
    const { ANH_DO_DAU } = await import('./anhDoDau');
    expect(MON_IDS).toHaveLength(32);
    const files = Object.keys(import.meta.glob('../../public/anh-do/*.webp'));
    const missing = MON_IDS.filter((k) => !files.includes(`../../public/anh-do/${k}.webp`));
    expect(missing, 'thiếu ảnh').toEqual([]);
    const stale = MON_IDS.filter((k) => ANH_DO_DAU[k] !== monHash(k));
    expect(stale, 'ảnh cũ, mô hình đã đổi').toEqual([]);
  }, 60000);
});
