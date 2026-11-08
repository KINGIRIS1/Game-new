import { describe, expect, it } from 'vitest';
import { BUOI_MS, NGAY_MS } from './defs';
import { BUOI, buoiLuc, doToi, gioBuoi, gioTrongNgay, troiLuc } from './ngayDem';
import { createInitialState, productionPerMinute, tick } from './game';

const PHUT = 60_000;
const tong = (clock: number) => BUOI.reduce((a, b) => a + troiLuc(clock)[b], 0);

describe('Ngày đêm', () => {
  it('một ngày 12 phút chơi, đồng hồ 0 là sáng sớm', () => {
    expect(NGAY_MS).toBe(12 * PHUT);
    expect(buoiLuc(0)).toBe('ngay');
    expect(doToi(0)).toBe(0);
    expect(troiLuc(0)).toEqual({ ngay: 1, chieu: 0, dem: 0, rang: 0 });
    expect(gioTrongNgay(NGAY_MS * 3 + 1234)).toBe(1234);
    expect(gioTrongNgay(-1000)).toBe(NGAY_MS - 1000);
  });

  it('ngày 7,5 phút, chiều tà 1 phút, đêm 2,5 phút, rạng đông 1 phút', () => {
    const dai = { ngay: 0, chieu: 0, dem: 0, rang: 0 };
    for (let t = 0; t < NGAY_MS; t += 1000) dai[buoiLuc(t)] += 1000;
    expect(dai).toEqual({ ngay: 7.5 * PHUT, chieu: PHUT, dem: 2.5 * PHUT, rang: PHUT });
    for (const b of BUOI) expect(buoiLuc(gioBuoi(b))).toBe(b);
  });

  it('trọng số bốn buổi tổng bằng 1, giữa đêm tối hẳn, giữa chiều tà là chiều tà thuần', () => {
    for (let t = 0; t < NGAY_MS; t += 777) expect(tong(t)).toBeCloseTo(1, 12);
    expect(troiLuc(gioBuoi('dem'))).toEqual({ ngay: 0, chieu: 0, dem: 1, rang: 0 });
    expect(doToi(gioBuoi('dem'))).toBe(1);
    expect(troiLuc(gioBuoi('chieu')).chieu).toBe(1);
    expect(troiLuc(gioBuoi('rang')).rang).toBe(1);
    expect(doToi(gioBuoi('chieu'))).toBe(0.5);
  });

  it('trời đổi liền mạch, không giật, cả lúc sang ngày mới', () => {
    for (let t = 0; t <= NGAY_MS * 2; t += 100) {
      const a = troiLuc(t);
      const b = troiLuc(t + 100);
      for (const k of BUOI) expect(Math.abs(a[k] - b[k])).toBeLessThan(0.01);
    }
    expect(troiLuc(NGAY_MS - 1).ngay).toBeCloseTo(1, 6);
    expect(troiLuc(BUOI_MS.chieu - 1).ngay).toBe(1);
  });

  it('chỉ để nhìn: ngày hay đêm thì sản lượng như nhau', () => {
    const ngay = createInitialState(0);
    const dem = createInitialState(0);
    dem.clock = gioBuoi('dem');
    expect(productionPerMinute(dem)).toEqual(productionPerMinute(ngay));
    const a = tick(ngay, 10_000);
    const b = tick(dem, 10_000);
    expect(b).toEqual(a);
  });
});
