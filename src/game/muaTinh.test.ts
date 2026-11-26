import { describe, expect, it } from 'vitest';
import { MUA_TINH } from './defs';
import { createInitialState, fishPerMinute, productionPerMinute } from './game';
import { capNhatMua, daQuy, danhHieuNay, nhanMua, nhanQuy, phanKet, phucMua, thuongMua, xepMua } from './muaTinh';
import { tuanCua } from './loiDai';
import { DAT_VAN_LANG, TINH_IDS, hangTinh, isVietNamState, muaCua, theoMay } from './vietNam';
import { makeSnapshot, defenderState } from './dauThanh';
import { setDien } from './testmap';

/** 0 giờ thứ Hai 23/11/2026 giờ Việt Nam. */
const THU_HAI = Date.UTC(2026, 10, 22, 17);
const TUAN = 7 * 86_400_000;

describe('phúc lành và thưởng cuối mùa', () => {
  it('hạng 1–3 +10%, 4–10 +6%, tỉnh còn lại đã diệt giặc +3%', () => {
    expect([1, 2, 3].map((h) => phucMua(h, false))).toEqual([10, 10, 10]);
    expect([4, 10].map((h) => phucMua(h, false))).toEqual([6, 6]);
    expect(phucMua(11, false)).toBe(0);
    expect(phucMua(11, true)).toBe(3);
    expect(phucMua(null, true)).toBe(3);
    expect(phucMua(null, false)).toBe(0);
    expect(phucMua(2, true)).toBe(10);
  });

  it('thưởng theo hạng; chưa góp điểm nào thì không có', () => {
    expect(thuongMua(1, 5)).toEqual(MUA_TINH.thuong[0]);
    expect(thuongMua(7, 5)).toEqual(MUA_TINH.thuong[1]);
    expect(thuongMua(null, 5)).toEqual(MUA_TINH.thuong[2]);
    expect(thuongMua(1, 0)).toEqual({ mon: 0, huan: 0 });
  });

  it('xếp hạng: điểm cao trước, ngang thì bắc vào nam, 0 điểm không có hạng', () => {
    const [a, b, c, d] = [TINH_IDS[3], TINH_IDS[1], TINH_IDS[2], TINH_IDS[0]];
    const x = xepMua([
      { tinh: a, diem: 50, diet: false },
      { tinh: b, diem: 80, diet: true },
      { tinh: c, diem: 50, diet: false },
      { tinh: d, diem: 0, diet: true },
      { tinh: 'zz', diem: 99, diet: false },
    ]);
    expect(x.map((r) => r.tinh)).toEqual([d, b, c, a]);
    expect(Object.fromEntries(x.map((r) => [r.tinh, r.hang]))).toEqual({ [b]: 1, [c]: 2, [a]: 3, [d]: null });
  });

  it('mỗi mùa nhận một lần, chỉ kết quả mùa ngay trước; hết mùa thì phúc lành hết', () => {
    const s = createInitialState(0);
    const now = THU_HAI + 3 * TUAN;
    const mua = muaCua(now);
    s.vietNam = { tinh: '12', chuc: 'nong' };
    const kq = { mua: mua - 1, tinh: '12' as const, hang: 2, diem: 900, diet: false, cua: 40 };
    expect(nhanMua(s, { ...kq, mua: mua - 2 }, now)).toBeNull();
    expect(nhanMua(s, kq, now)).toEqual({ mua, pct: 10, tinh: '12', hang: 2, ...MUA_TINH.thuong[0] });
    expect(nhanMua(s, kq, now)).toBeNull();
    expect(isVietNamState(s.vietNam)).toBe(true);
    expect(capNhatMua(s, now + 1000)).toBe(false);
    expect(s.vietNam.phuc?.pct).toBe(10);
    const sau = now + 4 * TUAN;
    expect(muaCua(sau)).toBe(mua + 1);
    expect(capNhatMua(s, sau)).toBe(true);
    expect(s.vietNam.phuc).toBeUndefined();
  });

  it('phúc lành cộng vào sản lượng kinh đô và cá, không vào kinh đô dựng từ bản chụp Đấu thành', () => {
    const s = createInitialState(0);
    setDien(s, 5);
    const goc = productionPerMinute(s);
    const ca = fishPerMinute(s);
    s.vietNam = { tinh: '12', chuc: 'nong', phuc: { mua: 0, pct: 10, tinh: '12', hang: 1 } };
    const them = productionPerMinute(s);
    expect(them.gao).toBeGreaterThan(goc.gao);
    expect(them.gao / goc.gao).toBeCloseTo(1.1, 5);
    expect(fishPerMinute(s)).toBeGreaterThanOrEqual(ca);
    // Phần lưu sửa tay quá trần thì vẫn chỉ +10%.
    s.vietNam.phuc!.pct = 90;
    expect(productionPerMinute(s).gao).toBeCloseTo(them.gao, 6);
    s.vietNam.phuc!.pct = 10;
    const d = defenderState(makeSnapshot(s));
    expect(d.vietNam?.phuc).toBeUndefined();
  });
});

describe('quy về', () => {
  it('thanh kết giao đủ ở 30 người × 7 ngày × 100 điểm', () => {
    expect(MUA_TINH.ketGiao).toBe(21000);
    expect(phanKet(0)).toBe(0);
    expect(phanKet(10500)).toBe(0.5);
    expect(phanKet(99999)).toBe(1);
  });

  it('tỉnh đã quy về lên bảng xếp hạng, tô như đất Văn Lang; lần đầu biết danh sách thì không kể truyện', () => {
    const chua = TINH_IDS.find((id) => !DAT_VAN_LANG.includes(id))!;
    expect(daQuy(chua)).toBe(false);
    expect(daQuy(chua, [chua])).toBe(true);
    expect(daQuy(DAT_VAN_LANG[0])).toBe(true);
    const bang = [
      { tinh: chua, diem: 50, nguoi: 1, gop: 1 },
      { tinh: DAT_VAN_LANG[0], diem: 10, nguoi: 1, gop: 1 },
    ];
    expect(hangTinh(bang).map((d) => d.tinh)).toEqual([DAT_VAN_LANG[0]]);
    expect(hangTinh(bang, [chua]).map((d) => d.tinh)).toEqual([chua, DAT_VAN_LANG[0]]);
    const s = createInitialState(0);
    expect(nhanQuy(s, [chua])).toEqual([]);
    const khac = TINH_IDS.filter((id) => !DAT_VAN_LANG.includes(id))[3];
    expect(nhanQuy(s, [khac, chua, DAT_VAN_LANG[0]])).toEqual([khac]);
    expect(s.vietNam?.quy).toEqual(TINH_IDS.filter((id) => id === chua || id === khac));
    expect(nhanQuy(s, [khac, chua])).toEqual([]);
    expect(isVietNamState(s.vietNam)).toBe(true);
  });
});

describe('Lạc tướng, Lạc hầu', () => {
  it('danh hiệu theo máy chủ, hết tuần thì bỏ; phần lưu sai dạng bị bỏ', () => {
    const s = createInitialState(0);
    const tuan = tuanCua(THU_HAI);
    s.vietNam = { tinh: '12', chuc: 'quan', nhan: ['1:12'] };
    theoMay(s, { tinh: '12', chuc: 'quan', mua: 0, chucLuc: null, diemMua: 0, diemNgay: 0, danhHieu: { tuan, loai: 'lacTuong', tinh: '12' } });
    expect(danhHieuNay(s, THU_HAI + 1000)).toEqual({ tuan, loai: 'lacTuong', tinh: '12' });
    expect(s.vietNam.nhan).toEqual(['1:12']);
    expect(danhHieuNay(s, THU_HAI + TUAN)).toBeNull();
    expect(capNhatMua(s, THU_HAI + TUAN)).toBe(true);
    expect(s.vietNam.danhHieu).toBeUndefined();
    theoMay(s, { tinh: '12', chuc: 'quan', mua: 0, chucLuc: null, diemMua: 0, diemNgay: 0, danhHieu: { tuan, loai: 'lacHau', tinh: '12' } });
    theoMay(s, { tinh: '12', chuc: 'quan', mua: 0, chucLuc: null, diemMua: 0, diemNgay: 0, danhHieu: null });
    expect(s.vietNam.danhHieu).toBeUndefined();
    expect(isVietNamState({ tinh: '12', chuc: null, danhHieu: { tuan, loai: 'vua', tinh: '12' } })).toBe(false);
    expect(isVietNamState({ tinh: '12', chuc: null, phuc: { mua: 1, pct: 10, tinh: 'xx', hang: 1 } })).toBe(false);
    expect(isVietNamState({ tinh: '12', chuc: null, quy: ['99'] })).toBe(false);
  });
});
