// Canh ảnh vẽ sẵn của bảng Xây dựng (public/anh-cong-trinh/) khớp mô hình hiện tại: mỗi loại có ảnh, và dấu vân tay
// mô hình lúc vẽ ảnh (anhCongTrinhDau.ts) bằng dấu vân tay bây giờ. Đổi dáng công trình thì chạy
// `node scripts/anh-cong-trinh.mjs` để vẽ lại ảnh.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import { describe, expect, it, vi } from 'vitest';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

describe('ảnh công trình vẽ sẵn', () => {
  it('mọi loại có ảnh, ảnh vẽ từ đúng mô hình hiện tại (lệch thì chạy node scripts/anh-cong-trinh.mjs)', async () => {
    const { THUMB_KINDS, thumbHash } = await import('./anhCongTrinh');
    const { ANH_DAU } = await import('./anhCongTrinhDau');
    const files = Object.keys(import.meta.glob('../../public/anh-cong-trinh/*.webp'));
    const missing = THUMB_KINDS.filter((k) => !files.includes(`../../public/anh-cong-trinh/${k}.webp`));
    expect(missing, 'thiếu ảnh').toEqual([]);
    const stale = THUMB_KINDS.filter((k) => ANH_DAU[k] !== thumbHash(k));
    expect(stale, 'ảnh cũ, mô hình đã đổi').toEqual([]);
  }, 20000);
});
