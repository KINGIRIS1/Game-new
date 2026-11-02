// Mô phỏng một người chơi hợp lý để kiểm tra nhịp tiến trình: Điện cấp 2–5 ở chương 1, cấp 6, 7, 8 ở chương 2, 3, 4,
// cấp 9, 10 sau truyện.

import { describe, expect, it } from 'vitest';
import { playChapters, playUntilDien } from './moPhong';

/**
 * Số phút từ lúc vào chương 2, 3, 4 tới khi lên Điện 6, 7, 8; từ lúc hết truyện tới Điện 9; từ Điện 9 tới Điện 10
 * (người chơi mô phỏng ở `moPhong.ts`).
 */
const m = playChapters({ last: 10, maxSec: 12 * 3600 });
const since = (at: number, from: number) => (at < 0 || from < 0 ? Infinity : (at - from) / 60);
function chapterMinutes(): { dien6: number; dien7: number; dien8: number; dien9: number; dien10: number } {
  return {
    dien6: since(m.at6, m.enter2),
    dien7: since(m.at7, m.enter3),
    dien8: since(m.at8, m.enter4),
    dien9: since(m.at9, m.hetTruyen),
    dien10: since(m.at10, m.at9),
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

  // Không tính thưởng phó bản chương 2, 3, 4 (hàng nghìn mỗi màn), nên chơi thật còn nhanh hơn.
  // Điện 8 cho tới 47 phút: lúc vào chương 4, người chơi mô phỏng còn đang nâng nốt công trình lên cấp 7. Có xưởng mộc,
  // làng chài thì thời điểm nâng cấp xê dịch, đo được 44–46 phút; chủ dự án cho nới từ 45 lên 47.
  it('vào chương 2 thì 12–20 phút lên Điện 6; vào chương 3 thì 25–40 phút lên Điện 7; vào chương 4 thì 25–47 phút lên Điện 8', () => {
    const { dien6, dien7, dien8 } = chapterMinutes();
    expect(dien6).toBeGreaterThanOrEqual(12);
    expect(dien6).toBeLessThanOrEqual(20);
    expect(dien7).toBeGreaterThanOrEqual(25);
    expect(dien7).toBeLessThanOrEqual(40);
    expect(dien8).toBeGreaterThanOrEqual(25);
    expect(dien8).toBeLessThanOrEqual(47);
  });

  // Giá cấp 9, 10 đã hạ 20% (Điện 9 hạ 12%) so với đề xuất, bến cấp 9, 10 làm thêm 20%: với giá đề xuất, Điện 9 mất
  // 68 phút, Điện 10 mất 131 phút vì vỏ ốc không kịp cho chín loại công trình cùng lên cấp.
  it('hết truyện thì 35–50 phút lên Điện 9; lên Điện 9 rồi thì 45–65 phút lên Điện 10', () => {
    const { dien9, dien10 } = chapterMinutes();
    expect(dien9).toBeGreaterThanOrEqual(35);
    expect(dien9).toBeLessThanOrEqual(50);
    expect(dien10).toBeGreaterThanOrEqual(45);
    expect(dien10).toBeLessThanOrEqual(65);
  });
});
