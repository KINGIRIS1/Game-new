import { describe, expect, it } from 'vitest';
import { SA_BAN, banKinh, daiNet, doMo } from './saBan';

/** Màn điện thoại cầm dọc và cầm ngang (điểm ảnh CSS). */
const DOC = [390, 844] as const;
const NGANG = [844, 390] as const;

describe('hiệu ứng sa bàn', () => {
  it('màn dọc: giữa màn hình nét, mép trên và mép dưới mờ hẳn', () => {
    expect(doMo(SA_BAN.giua, ...DOC)).toBe(0);
    expect(doMo(SA_BAN.giua + SA_BAN.net, ...DOC)).toBe(0);
    expect(doMo(SA_BAN.giua - SA_BAN.net, ...DOC)).toBe(0);
    expect(doMo(0, ...DOC)).toBe(1);
    expect(doMo(1, ...DOC)).toBe(1);
  });

  it('mờ tăng dần từ dải nét ra mép, hai phía như nhau', () => {
    for (const [w, h] of [DOC, NGANG]) {
      let truoc = 0;
      for (let y = SA_BAN.giua; y <= 1; y += 0.02) {
        const m = doMo(y, w, h);
        expect(m).toBeGreaterThanOrEqual(truoc);
        expect(doMo(2 * SA_BAN.giua - y, w, h)).toBeCloseTo(m, 10);
        truoc = m;
      }
    }
  });

  it('màn ngang: dải nét rộng ra, mép chỉ mờ nhẹ (mái Điện giữa màn hình không mờ)', () => {
    expect(daiNet(...NGANG).net).toBeGreaterThan(daiNet(...DOC).net * 2);
    // Dải nét tính theo cạnh dài: bề cao dải nét bằng nhau ở hai chiều cầm (điểm ảnh).
    expect(daiNet(...NGANG).net * NGANG[1]).toBeCloseTo(daiNet(...DOC).net * DOC[1], 6);
    expect(doMo(0.3, ...NGANG)).toBe(0);
    expect(doMo(0, ...NGANG)).toBeGreaterThan(0);
    expect(doMo(0, ...NGANG)).toBeLessThan(0.6);
  });

  it('kéo ra xa thì mờ hơn, phóng gần thì nhạt dần nhưng không tắt hẳn', () => {
    expect(banKinh(0.28, 1)).toBeGreaterThan(banKinh(0.72, 1));
    expect(banKinh(0.72, 1)).toBeGreaterThan(banKinh(2, 1));
    expect(banKinh(3, 1)).toBeGreaterThan(0);
    expect(banKinh(0.72, 1)).toBeCloseTo(SA_BAN.mo, 1);
  });

  it('bán kính theo tỉ lệ điểm ảnh: máy nét cao vẫn mờ y như nhau trên màn hình', () => {
    expect(banKinh(0.72, 2)).toBeCloseTo(2 * banKinh(0.72, 1), 10);
  });
});
