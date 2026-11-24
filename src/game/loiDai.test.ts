import { describe, expect, it } from 'vitest';
import { CH2_QUEST_START, GIFT_IDS, LOI_DAI, LOI_HE, LOI_MOC, TUONG_DA_IDS } from './defs';
import { createInitialState } from './game';
import { GEAR_IDS, GIONG_FEED } from './defs';

const initialState = () => createInitialState(0);
import {
  CHIEU,
  CHIEU_MOI,
  CHIEU_TUONG,
  HIEU_UNG_LOI,
  LOI_TUONG,
  canDanhTang,
  chieuCua,
  choCua,
  chuongTang,
  conSong,
  datDoiLoi,
  doiGoiY,
  doiLoi,
  doiTang,
  isLoiDaiState,
  laMoc,
  loiDaiMo,
  moTran,
  mucDuoc,
  ra,
  satTang,
  tangKe,
  tangMo,
  taoTran,
  thuTu,
  toiLuot,
  tuChon,
  tuDanhHet,
  tuongLoi,
  xongTran,
  type LoiSetup,
  type LoiTran,
  type LoiTuong,
} from './loiDai';
import { deserialize, serialize } from './save';

/** Đội của người chơi thường ở từng chương: ba tướng truyện mới về nhất (tầng chương 1 đánh khi đã sang chương 2). */
const DOI_THUONG: Record<number, LoiTuong[]> = {
  1: ['lacTuong', 'giong', 'sonTinh'],
  2: ['lacTuong', 'giong', 'sonTinh'],
  3: ['giong', 'sonTinh', 'anDuong'],
  4: ['sonTinh', 'anDuong', 'caoLo'],
  5: ['caoLo', 'trungTrac', 'trungNhi'],
};
/** Bộ đồ vừa phải của người chơi có đồ. */
const DO = { mau: 0.3, danh: 0.3, toc: 0.1, uy: 0.2, giap: 0.15, hoi: 0.15 };

function danhTang(tang: number, coDo: boolean): LoiTran {
  const may = doiTang(tang);
  const ta: LoiSetup[] = DOI_THUONG[chuongTang(tang)].map((kind) => ({ kind, ...(coDo ? { do: DO } : {}) }));
  const b = taoTran(tang, ta, may.doi, null, may.thu);
  tuDanhHet(b);
  return b;
}

/** Bản lưu đã có Gióng và Sơn Tinh (đầu chương 2, đủ ba tướng). */
function coBaTuong() {
  const s = initialState();
  s.giong.fed = GIONG_FEED.length;
  for (const g of GEAR_IDS) s.giong.gear[g] = true;
  s.questIndex = CH2_QUEST_START;
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  return s;
}

const doi2 = (a: LoiTuong[], b: LoiTuong[]) => taoTran(1, a.map((kind) => ({ kind })), b.map((kind) => ({ kind })));

describe('Lôi đài: tướng và chiêu', () => {
  it('mười hai tướng, mỗi tướng đánh thường và hai chiêu riêng không trùng ai', () => {
    expect(LOI_TUONG).toHaveLength(12);
    const all = LOI_TUONG.flatMap((k) => CHIEU_TUONG[k]);
    expect(new Set(all).size).toBe(24);
    for (const k of LOI_TUONG) expect(chieuCua(k)).toEqual(['danh', ...CHIEU_TUONG[k]]);
    for (const c of all) expect(CHIEU[c].cho).toBeGreaterThanOrEqual(3);
  });

  it('tám tướng một kỹ năng được thêm đúng tám chiêu mới', () => {
    expect(CHIEU_MOI).toHaveLength(8);
    const co = LOI_TUONG.filter((k) => CHIEU_TUONG[k].some((c) => CHIEU_MOI.includes(c)));
    expect(co).toEqual(['lacTuong', 'trungTrac', 'trungNhi', ...TUONG_DA_IDS]);
  });

  it('tối đa tám hiệu ứng trạng thái', () => {
    expect(HIEU_UNG_LOI).toHaveLength(8);
  });

  it('hồi kỹ năng của đồ rút ngắn lượt chờ, ít nhất một lượt', () => {
    expect(choCua('noThan', 0)).toBe(3);
    expect(choCua('noThan', 0.3)).toBe(2);
    expect(choCua('danh', 0.3)).toBe(0);
  });
});

describe('Lôi đài: luật lượt', () => {
  it('tốc cao ra lượt trước và đi nhiều lượt hơn', () => {
    const b = doi2(['trieuQuangPhuc', 'maiThucLoan'], ['sonTinh']);
    const tt = thuTu(b, 12);
    expect(tt[0]).toBe(0);
    expect(tt.filter((x) => x === 0).length).toBeGreaterThan(tt.filter((x) => x === 1).length);
    expect(toiLuot(b)).toBe(0);
  });

  it('cùng đội, cùng cách bấm thì ra cùng kết quả', () => {
    const chay = () => {
      const b = doi2(['giong', 'sonTinh', 'anDuong'], ['caoLo', 'trungTrac', 'trungNhi']);
      tuDanhHet(b);
      return JSON.stringify(b);
    };
    expect(chay()).toBe(chay());
  });

  it('chiêu vừa dùng phải chờ đủ lượt mới dùng lại', () => {
    const b = doi2(['anDuong'], ['maiThucLoan']);
    b.units[1].mau = b.units[1].mauMax = 100000;
    b.units[0].mauMax = b.units[0].mau = 100000;
    let dung = 0;
    const luot: number[] = [];
    for (let n = 0; n < 12 && !b.kq; n++) {
      const ai = toiLuot(b)!;
      if (ai === 0) {
        dung++;
        if (ra(b, 1, 1)) luot.push(dung);
        else expect(ra(b, 0, 1)).toBe(true);
      } else ra(b, 0, 0);
    }
    // Nỏ thần chờ 3 lượt: dùng ở lượt 1, 5, 9.
    expect(luot.slice(0, 2)).toEqual([1, 5]);
  });

  it('chọn sai mục tiêu hay chiêu còn chờ thì không đổi trận', () => {
    const b = doi2(['giong', 'lacTuong'], ['sonTinh']);
    const ai = toiLuot(b)!;
    const truoc = JSON.stringify(b);
    expect(ra(b, 0, ai)).toBe(false);
    expect(ra(b, 2, 2)).toBe(false);
    expect(JSON.stringify(b)).toBe(truoc);
  });

  it('choáng thì mất lượt; khiêu khích kéo đòn; ẩn thì không bị nhắm', () => {
    const b = doi2(['trungTrac', 'maiThucLoan', 'trieuQuangPhuc'], ['giong']);
    const giong = b.units[3];
    giong.mauMax = giong.mau = 100000;
    // Triệu Quang Phục nhanh nhất: cả đội ẩn.
    expect(toiLuot(b)).toBe(2);
    expect(ra(b, 1)).toBe(true);
    expect(b.units.slice(0, 3).every((u) => u.hu.an)).toBe(true);
    // Cả đội ẩn thì vẫn nhắm được (không ai lộ).
    expect(mucDuoc(b, giong)).toHaveLength(3);
    b.units[0].hu = {};
    expect(mucDuoc(b, giong).map((u) => u.id)).toEqual([0]);
    // Mai Thúc Loan khiêu khích: giặc chỉ nhắm được ông.
    b.units[1].hu.khieuKhich = { luot: 2, v: 0 };
    expect(mucDuoc(b, giong).map((u) => u.id)).toEqual([1]);
    // Voi xung trận làm choáng: Gióng mất lượt kế.
    giong.hu.choang = { luot: 1, v: 0 };
    const sk = b.sk.length;
    for (let n = 0; n < 8; n++) {
      const ai = toiLuot(b)!;
      expect(ai).not.toBe(3);
      if (b.sk.slice(sk).some((e) => e.t === 'boLuot' && e.id === 3)) break;
      ra(b, 0, 3);
    }
    expect(b.sk.slice(sk).some((e) => e.t === 'boLuot' && e.id === 3)).toBe(true);
    expect(giong.hu.choang).toBeUndefined();
  });

  it('khiên bớt sát thương, móng rồng xuyên khiên, tiên phong phá khiên', () => {
    const thu = (kind: LoiTuong, ci: number, khien: boolean) => {
      const b = doi2([kind], ['sonTinh']);
      const t = b.units[1];
      t.mauMax = t.mau = 100000;
      if (khien) t.hu.khien = { luot: 3, v: 0.5 };
      b.units[0].cd = [0, 0, 0];
      b.units[0].tb = 1;
      toiLuot(b);
      ra(b, ci, 1);
      return { mat: 100000 - t.mau, conKhien: !!t.hu.khien };
    };
    expect(thu('giong', 0, true).mat).toBeLessThan(thu('giong', 0, false).mat * 0.6);
    expect(thu('trieuQuangPhuc', 2, true).mat).toBe(thu('trieuQuangPhuc', 2, false).mat);
    const pha = thu('trungNhi', 2, true);
    expect(pha.conKhien).toBe(false);
    expect(pha.mat).toBe(thu('trungNhi', 2, false).mat);
  });

  it('cờ lệnh cho đồng đội ra lượt ngay; lời thề xóa hiệu ứng xấu', () => {
    const b = doi2(['lacTuong', 'maiThucLoan'], ['sonTinh']);
    b.units[0].cd = [0, 0, 0];
    b.units[0].tb = 1;
    expect(toiLuot(b)).toBe(0);
    expect(ra(b, 2, 1)).toBe(true);
    expect(toiLuot(b)).toBe(1);

    const c = doi2(['trungTrac', 'giong'], ['sonTinh']);
    c.units[1].hu = { cham: { luot: 2, v: 0.4 }, yeu: { luot: 2, v: 0.3 }, khien: { luot: 2, v: 0.4 } };
    c.units[0].cd = [0, 0, 0];
    c.units[0].tb = 1;
    toiLuot(c);
    expect(ra(c, 2)).toBe(true);
    expect(Object.keys(c.units[1].hu).sort()).toEqual(['hang', 'khien']);
  });

  it('triều rút đánh gấp đôi người đang chậm; phá ách hồi máu', () => {
    const b = doi2(['ngoQuyen'], ['sonTinh', 'giong']);
    for (const u of b.units.slice(1)) u.mauMax = u.mau = 100000;
    b.units[1].hu.cham = { luot: 2, v: 0.3 };
    b.units[0].cd = [0, 0, 0];
    b.units[0].tb = 1;
    toiLuot(b);
    ra(b, 2);
    expect(100000 - b.units[1].mau).toBe(2 * (100000 - b.units[2].mau));

    const c = doi2(['maiThucLoan'], ['sonTinh']);
    c.units[0].mau = 100;
    c.units[0].cd = [0, 0, 0];
    c.units[0].tb = 1;
    toiLuot(c);
    ra(c, 2, 1);
    expect(c.units[0].mau).toBeGreaterThan(100);
  });

  it('quá 30 vòng thì thua', () => {
    const b = doi2(['lacTuong'], ['lacTuong']);
    for (const u of b.units) u.mauMax = u.mau = 10_000_000;
    expect(tuDanhHet(b)).toBe('thua');
    expect(b.tg).toBeGreaterThanOrEqual(LOI_DAI.vong);
  });

  it('thần thú đứng ngoài sân tự ra chiêu, không bị nhắm', () => {
    const b = taoTran(1, [{ kind: 'giong' }], [{ kind: 'sonTinh' }], { kind: 'thuRong', cap: 10 }, null);
    let thuRa = 0;
    for (let n = 0; n < 40 && !b.kq; n++) {
      const ai = toiLuot(b);
      if (ai === null) break;
      if (ai < 0) {
        thuRa++;
        expect(ai).toBe(-1);
        ra(b);
      } else {
        const c = tuChon(b);
        ra(b, c.chieu, c.muc);
      }
    }
    expect(thuRa).toBeGreaterThan(0);
    expect(b.sk.some((e) => e.t === 'chieu' && e.chieu === 'thuRong')).toBe(true);
    // Có thú thì thắng dễ hơn không có.
    const co = taoTran(1, [{ kind: 'giong' }], [{ kind: 'sonTinh', he: 1.15 }], { kind: 'thuRong', cap: 30 }, null);
    const khong = taoTran(1, [{ kind: 'giong' }], [{ kind: 'sonTinh', he: 1.15 }]);
    expect(tuDanhHet(co)).toBe('thang');
    expect(tuDanhHet(khong)).toBe('thua');
  });
});

describe('Lôi đài: 50 tầng', () => {
  it('đủ 50 tầng, mỗi tầng một đội ba người; tầng mốc là tướng giặc, từ tầng 20 có thú bóng', () => {
    expect(LOI_HE).toHaveLength(LOI_DAI.tang);
    for (let t = 1; t <= LOI_DAI.tang; t++) {
      const may = doiTang(t);
      expect(may.doi).toHaveLength(3);
      expect(new Set(may.doi.map((d) => d.kind)).size).toBeGreaterThanOrEqual(2);
      if (laMoc(t)) {
        expect(may.doi.map((d) => d.kind)).toEqual(LOI_MOC[t / 10 - 1].doi);
        expect(!!may.thu).toBe(t >= 20);
      } else expect(may.thu).toBeNull();
      // Bóng tướng dã ngoại chỉ ở tầng 41–50.
      if (t <= 40) expect(may.doi.some((d) => (TUONG_DA_IDS as string[]).includes(d.kind))).toBe(false);
    }
  });

  it('người chơi thường (không đồ, không thú, Tự đánh) thắng mọi tầng thường và thua mọi tầng mốc', () => {
    for (let t = 1; t <= LOI_DAI.tang; t++) {
      const b = danhTang(t, false);
      expect(b.kq, `tầng ${t}`).toBe(laMoc(t) ? 'thua' : 'thang');
      // Trận không quá ngắn, không kéo tới hết giờ.
      if (!laMoc(t)) expect(b.tg, `tầng ${t}`).toBeLessThan(LOI_DAI.vong / 2);
    }
  });

  it('có đồ thì Tự đánh thắng cả tầng mốc', () => {
    for (let t = 10; t <= LOI_DAI.tang; t += 10) expect(danhTang(t, true).kq, `tầng ${t}`).toBe('thang');
  });
});

describe('Lôi đài: mở, đội, thưởng, lưu', () => {
  it('mở khi tướng thứ ba về; tầng mở theo chương', () => {
    const s = initialState();
    expect(loiDaiMo(s)).toBe(false);
    expect(canDanhTang(s, 1).ok).toBe(false);
    const t = coBaTuong();
    expect(tuongLoi(t)).toEqual(['lacTuong', 'giong', 'sonTinh']);
    expect(loiDaiMo(t)).toBe(true);
    expect(tangMo(t)).toBe(20);
    expect(tangKe(t)).toBe(1);
    expect(canDanhTang(t, 1).ok).toBe(true);
    expect(canDanhTang(t, 2).ok).toBe(false);
  });

  it('chọn đội: chỉ tướng đã về, không trùng, tối đa ba', () => {
    const s = coBaTuong();
    expect(doiGoiY(s)).toEqual(['lacTuong', 'giong', 'sonTinh']);
    expect(datDoiLoi(s, ['giong', 'giong']).ok).toBe(false);
    expect(datDoiLoi(s, ['anDuong']).ok).toBe(false);
    expect(datDoiLoi(s, ['sonTinh', 'giong']).ok).toBe(true);
    // Đội chưa đủ ba thì chưa lên đài được.
    expect(doiLoi(s)).toEqual(['sonTinh', 'giong']);
    expect(moTran(s, 1).ok).toBe(false);
    expect(datDoiLoi(s, ['sonTinh', 'giong', 'lacTuong']).ok).toBe(true);
    expect(moTran(s, 1).ok).toBe(true);
  });

  it('thắng tầng mới thì ghi tầng, được sắt và một món đồ; đánh lại không có thưởng', () => {
    const s = coBaTuong();
    const sat = s.resources.sat;
    const b = moTran(s, 1);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(conSong(b.value, 0)).toHaveLength(3);
    expect(tuDanhHet(b.value)).toBe('thang');
    const th = xongTran(s, b.value);
    expect(th?.sat).toBe(satTang(1));
    expect(th?.roi?.mon.cap).toBe(1);
    expect(s.resources.sat).toBe(sat + satTang(1) + (th?.roi?.sat ?? 0));
    expect(s.loiDai?.tang).toBe(1);
    expect(xongTran(s, b.value)).toBeNull();
    const lai = moTran(s, 1);
    if (!lai.ok) return;
    tuDanhHet(lai.value);
    expect(xongTran(s, lai.value)).toBeNull();
    expect(s.loiDai?.tang).toBe(1);
  });

  it('thua thì không mất gì, không ghi tầng', () => {
    const s = coBaTuong();
    const b = moTran(s, 1);
    if (!b.ok) return;
    b.value.kq = 'thua';
    const truoc = JSON.stringify(s);
    expect(xongTran(s, b.value)).toBeNull();
    expect(JSON.stringify(s)).toBe(truoc);
  });

  it('bản lưu giữ phần lôi đài; sai dạng thì bỏ riêng phần ấy', () => {
    const s = coBaTuong();
    datDoiLoi(s, ['sonTinh', 'giong', 'lacTuong']);
    s.loiDai!.tang = 7;
    const lai = deserialize(serialize(s))!;
    expect(lai.loiDai).toEqual(s.loiDai);
    expect(isLoiDaiState({ ...s.loiDai, tang: 99 })).toBe(false);
    const hong = JSON.parse(serialize(s));
    hong.loiDai.doi = ['khongCo'];
    const bo = deserialize(JSON.stringify(hong))!;
    expect(bo).toBeDefined();
    expect(bo.loiDai).toBeUndefined();
  });
});

describe('ảnh chiêu lôi đài', () => {
  it('đòn thường và mọi chiêu của tướng đều có ảnh vẽ trong public/anh-ky-nang', () => {
    const files = Object.keys(import.meta.glob('../../public/anh-ky-nang/*.webp'));
    const ids = new Set(['danh', ...LOI_TUONG.flatMap((k) => CHIEU_TUONG[k])]);
    for (const id of ids) expect(files.some((f) => f.endsWith(`/${id}.webp`)), id).toBe(true);
  });
});
