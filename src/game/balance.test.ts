// Mô phỏng một người chơi hợp lý để kiểm tra nhịp tiến trình: Điện cấp 2–5 ở chương 1, cấp 6, 7 ở chương 2, 3.

import { describe, expect, it } from 'vitest';
import { playChapters, playUntilDien } from './moPhong';

/** Số phút từ lúc vào chương 2, 3 tới khi lên Điện 6, 7 (người chơi mô phỏng ở `moPhong.ts`). */
function chapterMinutes(): { dien6: number; dien7: number } {
  const m = playChapters();
  return {
    dien6: m.at6 < 0 ? Infinity : (m.at6 - m.enter2) / 60,
    dien7: m.at7 < 0 ? Infinity : (m.at7 - m.enter3) / 60,
  };
}

describe('nhịp tiến trình', () => {
  it('lên Điện cấp 2 trong khoảng 3–10 phút', () => {
    const minutes = playUntilDien(2, 30);
    expect(minutes).toBeGreaterThanOrEqual(3);
    expect(minutes).toBeLessThanOrEqual(10);
  });

  it('lên Điện cấp 3 trong khoảng 12–30 phút', () => {
    const minutes = playUntilDien(3, 60);
    expect(minutes).toBeGreaterThanOrEqual(12);
    expect(minutes).toBeLessThanOrEqual(30);
  });

  // Chưa có phần thưởng phó bản (lát cắt 3) nên chỉ trông vào kinh tế; phó bản sẽ làm nhịp nhanh hơn.
  it('lên Điện cấp 5 trong khoảng 45–70 phút', () => {
    const minutes = playUntilDien(5, 120);
    expect(minutes).toBeGreaterThanOrEqual(45);
    expect(minutes).toBeLessThanOrEqual(70);
  });

  // Không tính thưởng phó bản chương 2, 3 (hàng nghìn mỗi màn), nên chơi thật còn nhanh hơn.
  it('vào chương 2 thì khoảng 12–20 phút lên Điện 6; vào chương 3 thì khoảng 25–40 phút lên Điện 7', () => {
    const { dien6, dien7 } = chapterMinutes();
    expect(dien6).toBeGreaterThanOrEqual(12);
    expect(dien6).toBeLessThanOrEqual(20);
    expect(dien7).toBeGreaterThanOrEqual(25);
    expect(dien7).toBeLessThanOrEqual(40);
  });
});
