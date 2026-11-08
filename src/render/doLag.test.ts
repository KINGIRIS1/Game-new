import { afterEach, describe, expect, it, vi } from 'vitest';
import { DoLag, luatMoiGiay, phanBo, tomLag, uoc60 } from './doLag';

/** Cho `performance.now()` trả lần lượt các số trong `ts`. */
function gioGia(ts: number[]) {
  let i = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => ts[Math.min(i++, ts.length - 1)]);
}

afterEach(() => vi.restoreAllMocks());

describe('Đo lag', () => {
  it('phân bố: trung bình, bách phân vị lấy phần tử gần nhất, dài nhất', () => {
    const xs = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(phanBo(xs)).toEqual({ tong: 5050, tb: 50.5, p50: 50, p95: 95, max: 100 });
    expect(phanBo([7])).toEqual({ tong: 7, tb: 7, p50: 7, p95: 7, max: 7 });
    expect(phanBo([])).toEqual({ tong: 0, tb: 0, p50: 0, p95: 0, max: 0 });
  });

  it('chưa bật thì không ghi gì', () => {
    const d = new DoLag();
    d.dau(16);
    d.cat('luat');
    d.xong({ calls: 5, triangles: 9 });
    d.bat();
    expect(d.tat()).toEqual({ khung: [], luat: [], canh: [], khac: [], nhip: [], js: [], choi: [], lenh: [], tamGiac: [] });
  });

  it('ghi khoảng cách giữa các khung, từng phần việc, nhịp chỉ ở khung có nhịp', () => {
    const d = new DoLag();
    d.bat();
    // Khung 1 (rAF 1000): luật 1 ms, cảnh 4 ms, khác 0,5 ms; không có nhịp.
    gioGia([0, 1, 5, 5.5, 5.5]);
    d.dau(1000);
    d.troi(16);
    d.cat('luat');
    d.cat('canh');
    d.cat('khac');
    d.xong({ calls: 100, triangles: 2000 });
    // Khung 2 (rAF 1020): luật 2 ms, cảnh 6 ms, khác 1 ms, nhịp 3 ms, cuối khung thêm 0,5 ms vào khác.
    vi.restoreAllMocks();
    gioGia([10, 12, 18, 19, 22, 22.5]);
    d.dau(1020);
    d.troi(20);
    d.cat('luat');
    d.cat('canh');
    d.cat('khac');
    d.cat('nhip');
    d.xong({ calls: 120, triangles: 3000 });
    const g = d.tat();
    expect(g.khung).toEqual([20]);
    expect(g.luat).toEqual([1, 2]);
    expect(g.canh).toEqual([4, 6]);
    expect(g.khac).toEqual([0.5, 1.5]);
    expect(g.nhip).toEqual([3]);
    expect(g.js).toEqual([5.5, 12.5]);
    expect(g.choi).toEqual([16, 20]);
    expect(g.lenh).toEqual([100, 120]);
    expect(g.tamGiac).toEqual([2000, 3000]);
  });

  it('tóm tắt: khung mỗi giây, khung giật, JS quá một khung 60 khung/giây', () => {
    const t = tomLag({
      khung: [16, 16, 16, 52],
      luat: [1, 1, 1, 1],
      canh: [4, 4, 4, 40],
      khac: [0, 0, 0, 0],
      nhip: [10],
      js: [5, 5, 15, 51],
      choi: [16, 16, 16, 52],
      lenh: [100, 100, 110, 110],
      tamGiac: [1000, 1000, 1000, 1001],
    });
    expect(t.soKhung).toBe(4);
    expect(t.ms).toBe(100);
    expect(t.fps).toBe(40);
    expect(t.tren50).toBe(1);
    expect(t.jsTren16).toBe(1);
    expect(t.jsTren50).toBe(1);
    expect(t.lenh).toEqual({ tb: 105, max: 110 });
    expect(t.tamGiac).toEqual({ tb: 1000, max: 1001 });
  });

  it('ước 60 khung/giây: cảnh và khác theo khung, luật theo giây chơi, nhịp 4 lần mỗi giây', () => {
    // Máy chậm: 2 khung mỗi giây trong 2 giây, thời gian chơi trôi chậm 4 lần (mỗi khung 125 ms chơi). Cảnh 3 ms, khác
    // 0,5 ms mỗi khung; luật 30 ms mỗi khung, tức 240 ms mỗi giây chơi; nhịp 3 ms mỗi lần.
    const t = tomLag({
      khung: [500, 500, 500, 500],
      luat: [30, 30, 30, 30],
      canh: [3, 3, 3, 3],
      khac: [0.5, 0.5, 0.5, 0.5],
      nhip: [3, 3, 3, 3],
      js: [36.5, 36.5, 36.5, 36.5],
      choi: [125, 125, 125, 125],
      lenh: [1, 1, 1, 1],
      tamGiac: [1, 1, 1, 1],
    });
    expect(luatMoiGiay(t)).toBe(240);
    expect(uoc60(t)).toBe(3 + 0.5 + 240 / 60 + (3 * 4) / 60);
  });
});
