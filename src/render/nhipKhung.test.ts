import { describe, expect, it } from 'vitest';
import { KHUNG_CHE, KHUNG_MAC_DINH, NhipKhung, docKhung } from './nhipKhung';

/** Số khung chạy trong `giay` giây khi màn hình làm tươi `hz` lần mỗi giây, giới hạn `fps`; `lech` xê dịch dấu giờ. */
function dem(hz: number, fps: number, giay = 10, lech = 0): number {
  const nhip = new NhipKhung();
  let n = 0;
  const tong = Math.round(hz * giay);
  for (let i = 0; i < tong; i++) {
    const now = (i * 1000) / hz + (i % 2 ? lech : -lech);
    if (nhip.chay(now, fps)) n++;
  }
  return n / giay;
}

describe('nhịp khung hình', () => {
  it('giới hạn đúng số khung mỗi giây trên mọi tần số màn hình', () => {
    for (const hz of [60, 90, 120, 144]) {
      expect(dem(hz, 60)).toBeCloseTo(60, -0.5);
      expect(dem(hz, 30)).toBeCloseTo(30, -0.5);
    }
    // Màn 90 Hz giới hạn 60: chạy hai trên ba lần, không tụt về 45.
    expect(dem(90, 60)).toBeGreaterThan(58);
  });

  it('màn 60 Hz giới hạn 60 thì khung nào cũng chạy, kể cả khi dấu giờ xê dịch', () => {
    expect(dem(60, 60)).toBe(60);
    expect(dem(60, 60, 10, 1)).toBe(60);
    expect(dem(120, 60, 10, 1)).toBe(60);
  });

  it('không giới hạn thì theo màn hình', () => {
    expect(dem(120, 0)).toBe(120);
  });

  it('bảng che kín: mỗi khung cách 0,1 giây, trần dt của vòng lặp', () => {
    expect(dem(120, KHUNG_CHE)).toBeCloseTo(10, -0.5);
    expect(dem(60, KHUNG_CHE)).toBeCloseTo(10, -0.5);
  });

  it('đổi mức thì chạy ngay, không chờ hẹn của mức thưa', () => {
    const nhip = new NhipKhung();
    expect(nhip.chay(0, KHUNG_CHE)).toBe(true);
    expect(nhip.chay(16, KHUNG_CHE)).toBe(false);
    // Đóng bảng che kín: khung kế chạy luôn.
    expect(nhip.chay(33, 60)).toBe(true);
    expect(nhip.chay(41, 60)).toBe(false);
    expect(nhip.chay(50, 60)).toBe(true);
  });

  it('máy khựng lâu thì hẹn lại từ lúc ấy, không chạy dồn', () => {
    const nhip = new NhipKhung();
    nhip.chay(0, 60);
    expect(nhip.chay(500, 60)).toBe(true);
    // Khung kế chỉ chạy sau một bước nữa.
    expect(nhip.chay(508, 60)).toBe(false);
    expect(nhip.chay(517, 60)).toBe(true);
  });

  it('đọc mức từ bộ nhớ máy', () => {
    expect(docKhung('30')).toBe(30);
    expect(docKhung('0')).toBe(0);
    expect(docKhung('60')).toBe(60);
    expect(docKhung(null)).toBe(KHUNG_MAC_DINH);
    expect(docKhung('')).toBe(KHUNG_MAC_DINH);
    expect(docKhung('45')).toBe(KHUNG_MAC_DINH);
    expect(docKhung('abc')).toBe(KHUNG_MAC_DINH);
  });
});
