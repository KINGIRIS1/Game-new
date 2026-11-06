// Mô phỏng một người chơi hợp lý để kiểm tra nhịp tiến trình: Điện cấp 2–5 ở chương 1, cấp 6, 7, 8 ở chương 2, 3, 4,
// cấp 9, 10 sau truyện. Đo hai kiểu: không đố sử (chờ đủ thời gian xây) và đố đúng hết (xong ngay).

import { describe, expect, it } from 'vitest';
import { playChapters, playUntilDien } from './moPhong';

/**
 * Số phút từ lúc vào chương 2, 3, 4 tới khi lên Điện 6, 7, 8; từ lúc hết truyện tới Điện 9; từ Điện 9 tới Điện 10
 * (người chơi mô phỏng ở `moPhong.ts`). `dung`: số câu đố sử người chơi trả lời đúng mỗi việc xây (3 là việc nào cũng
 * xong ngay, như trước khi có thời gian xây).
 */
const since = (at: number, from: number) => (at < 0 || from < 0 ? Infinity : (at - from) / 60);
function chapterMinutes(dung: number): { dien6: number; dien7: number; dien8: number; dien9: number; dien10: number } {
  const m = playChapters({ last: 10, maxSec: 20 * 3600, dung });
  return {
    dien6: since(m.at6, m.enter2),
    dien7: since(m.at7, m.enter3),
    dien8: since(m.at8, m.enter4),
    dien9: since(m.at9, m.hetTruyen),
    dien10: since(m.at10, m.at9),
  };
}

// Không đố sử lần nào: chờ đủ thời gian xây, có nhà thợ hồ thêm tốp thợ. Chủ dự án chọn chương 1 chừng 1,5 giờ.
describe('nhịp tiến trình, không đố sử', () => {
  const ch = chapterMinutes(0);

  it('Điện cấp 2 trong 5–10 phút, cấp 3 trong 18–32 phút, cấp 5 trong 75–100 phút', () => {
    const d2 = playUntilDien(2, 30);
    expect(d2).toBeGreaterThanOrEqual(5);
    expect(d2).toBeLessThanOrEqual(10);
    const d3 = playUntilDien(3, 60);
    expect(d3).toBeGreaterThanOrEqual(18);
    expect(d3).toBeLessThanOrEqual(32);
    const d5 = playUntilDien(5, 180);
    expect(d5).toBeGreaterThanOrEqual(75);
    expect(d5).toBeLessThanOrEqual(100);
  });

  it('vào chương 2 thì 22–40 phút lên Điện 6; vào chương 3 thì 45–70 phút lên Điện 7; vào chương 4 thì 80–110 phút lên Điện 8', () => {
    expect(ch.dien6).toBeGreaterThanOrEqual(22);
    expect(ch.dien6).toBeLessThanOrEqual(40);
    expect(ch.dien7).toBeGreaterThanOrEqual(45);
    expect(ch.dien7).toBeLessThanOrEqual(70);
    expect(ch.dien8).toBeGreaterThanOrEqual(80);
    expect(ch.dien8).toBeLessThanOrEqual(110);
  });

  it('hết truyện thì 75–105 phút lên Điện 9; lên Điện 9 rồi thì 95–130 phút lên Điện 10', () => {
    expect(ch.dien9).toBeGreaterThanOrEqual(75);
    expect(ch.dien9).toBeLessThanOrEqual(105);
    expect(ch.dien10).toBeGreaterThanOrEqual(95);
    expect(ch.dien10).toBeLessThanOrEqual(130);
  });
});

// Đố đúng cả ba câu mỗi việc: việc nào cũng xong ngay, nhịp như trước khi có thời gian xây.
describe('nhịp tiến trình, đố sử đúng hết', () => {
  const ch = chapterMinutes(3);

  it('lên Điện cấp 2 trong khoảng 3–10 phút', () => {
    const minutes = playUntilDien(2, 30, 3);
    expect(minutes).toBeGreaterThanOrEqual(3);
    expect(minutes).toBeLessThanOrEqual(10);
  });

  it('lên Điện cấp 3 trong khoảng 12–30 phút', () => {
    const minutes = playUntilDien(3, 60, 3);
    expect(minutes).toBeGreaterThanOrEqual(12);
    expect(minutes).toBeLessThanOrEqual(30);
  });

  // Chưa có phần thưởng phó bản (lát cắt 3) nên chỉ trông vào kinh tế; phó bản sẽ làm nhịp nhanh hơn.
  it('lên Điện cấp 5 trong khoảng 45–70 phút', () => {
    const minutes = playUntilDien(5, 120, 3);
    expect(minutes).toBeGreaterThanOrEqual(45);
    expect(minutes).toBeLessThanOrEqual(70);
  });

  // Không tính thưởng phó bản chương 2, 3, 4 (hàng nghìn mỗi màn), nên chơi thật còn nhanh hơn.
  // Điện 8 cho tới 47 phút: lúc vào chương 4, người chơi mô phỏng còn đang nâng nốt công trình lên cấp 7. Có xưởng mộc,
  // làng chài thì thời điểm nâng cấp xê dịch, đo được 44–46 phút; chủ dự án cho nới từ 45 lên 47.
  it('vào chương 2 thì 12–20 phút lên Điện 6; vào chương 3 thì 25–40 phút lên Điện 7; vào chương 4 thì 25–47 phút lên Điện 8', () => {
    expect(ch.dien6).toBeGreaterThanOrEqual(12);
    expect(ch.dien6).toBeLessThanOrEqual(20);
    expect(ch.dien7).toBeGreaterThanOrEqual(25);
    expect(ch.dien7).toBeLessThanOrEqual(40);
    expect(ch.dien8).toBeGreaterThanOrEqual(25);
    expect(ch.dien8).toBeLessThanOrEqual(47);
  });

  // Giá cấp 9, 10 đã hạ 20% (Điện 9 hạ 12%) so với đề xuất, bến cấp 9, 10 làm thêm 20%: với giá đề xuất, Điện 9 mất
  // 68 phút, Điện 10 mất 131 phút vì vỏ ốc không kịp cho chín loại công trình cùng lên cấp.
  it('hết truyện thì 35–50 phút lên Điện 9; lên Điện 9 rồi thì 45–65 phút lên Điện 10', () => {
    expect(ch.dien9).toBeGreaterThanOrEqual(35);
    expect(ch.dien9).toBeLessThanOrEqual(50);
    expect(ch.dien10).toBeGreaterThanOrEqual(45);
    expect(ch.dien10).toBeLessThanOrEqual(65);
  });
});
