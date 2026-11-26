import { describe, expect, it } from 'vitest';
import { startFieldBattle } from './battle';
import { baiOf } from './baiChien';
import { botSnapshot, decodeSnapshot, encodeSnapshot } from './dauThanh';
import { DEFAULT_ROWS, GIAC_CHUNG, STAGES, type Chapter } from './defs';
import { tuanCua } from './loiDai';
import {
  BIEN_BAC,
  BIEN_TAY,
  NEN_GIAC,
  NHOM_GIAC,
  beginGiac,
  chiaDiem,
  daoTuan,
  giacDangDanh,
  giacRutLuc,
  giacToiLuc,
  heChuc,
  kiemQuanGiac,
  manGiac,
  mauDao,
  ngayTuan,
  noiDanh,
  phanHa,
  pushGiac,
  satThuong,
  setupGiac,
  simulateGiac,
  stepGiac,
  thuCua,
} from './giacChung';
import { danhGiac, nhanGiac } from './mayChu';
import { GIAP_BIEN, GIAP_BIEN_GIOI, TINH_IDS, langGieng, ngayCua } from './vietNam';
import { HALF_ARMY, HALF_ARMY4, SAMPLE_ARMY, SAMPLE_ARMY4, lateHeroes, playOut } from './testkit';

/** 0 giờ thứ Hai 23/11/2026 giờ Việt Nam (17 giờ Chủ nhật giờ UTC). */
const THU_HAI = Date.UTC(2026, 10, 22, 17);
const NGAY = 86_400_000;

describe('lịch đạo giặc', () => {
  it('thứ trong tuần, lúc giặc tới và rút theo giờ Việt Nam', () => {
    expect(thuCua(THU_HAI)).toBe(0);
    expect(thuCua(THU_HAI - 1)).toBe(6);
    expect(thuCua(THU_HAI + 4 * NGAY + 1)).toBe(4);
    const tuan = tuanCua(THU_HAI);
    expect(giacToiLuc(tuan)).toBe(THU_HAI + GIAC_CHUNG.tuNgay * NGAY);
    expect(giacRutLuc(tuan)).toBe(THU_HAI + 7 * NGAY);
    expect(giacDangDanh(giacToiLuc(tuan) - 1)).toBeNull();
    expect(giacDangDanh(giacToiLuc(tuan))).toBe(tuan);
    expect(giacDangDanh(giacRutLuc(tuan) - 1)).toBe(tuan);
    expect(giacDangDanh(giacRutLuc(tuan))).toBeNull();
    expect(ngayTuan(tuan)).toEqual({ tu: ngayCua(THU_HAI), den: ngayCua(THU_HAI) + 7 });
  });

  it('mỗi tuần một nhóm theo lượt, 3–5 tỉnh trong nhóm, xếp bắc vào nam, lần nào tính cũng ra y hệt', () => {
    const tuan = tuanCua(THU_HAI);
    const gap = new Set<string>();
    for (let t = tuan; t < tuan + 60; t++) {
      const d = daoTuan(t);
      expect(d).toEqual(daoTuan(t));
      expect(d.nhom).toBe(NHOM_GIAC[t % 3]);
      expect(d.tinh.length).toBeGreaterThanOrEqual(GIAC_CHUNG.tinhMin);
      expect(d.tinh.length).toBeLessThanOrEqual(GIAC_CHUNG.tinhMax);
      expect(new Set(d.tinh).size).toBe(d.tinh.length);
      const nhom = d.nhom === 'bac' ? BIEN_BAC : d.nhom === 'tay' ? BIEN_TAY : GIAP_BIEN;
      for (const id of d.tinh) expect(nhom).toContain(id);
      expect(d.tinh).toEqual(TINH_IDS.filter((id) => d.tinh.includes(id)));
      for (const id of d.tinh) gap.add(id);
    }
    // Sau một năm, tỉnh biên giới hay giáp biển nào cũng đã gặp giặc.
    for (const id of new Set([...BIEN_BAC, ...BIEN_TAY, ...GIAP_BIEN])) expect(gap.has(id)).toBe(true);
  });

  it('hai nhóm biên giới gộp lại đúng các tỉnh có biên giới đất liền', () => {
    expect(new Set([...BIEN_BAC, ...BIEN_TAY])).toEqual(new Set(GIAP_BIEN_GIOI));
  });

  it('máu đạo theo người góp tuần trước, ít nhất như 10 người', () => {
    expect(mauDao(0)).toBe(GIAC_CHUNG.nguoiMin * GIAC_CHUNG.mauNguoi);
    expect(mauDao(3)).toBe(mauDao(0));
    expect(mauDao(25)).toBe(25 * GIAC_CHUNG.mauNguoi);
  });

  it('chỗ đánh: tỉnh mình có giặc thì ở tỉnh mình, không thì giúp láng giềng có giặc', () => {
    const giac = ['12', '08'] as const;
    expect(noiDanh('12', giac)).toEqual(['12']);
    const lg = TINH_IDS.find((id) => !giac.includes(id as never) && langGieng(id).includes('12'))!;
    expect(noiDanh(lg, giac)).toContain('12');
    const xa = TINH_IDS.find((id) => !noiDanh(id, giac).length)!;
    expect(langGieng(xa).some((id) => giac.includes(id as never))).toBe(false);
  });

  it('hệ số chức, sát thương, điểm chia đôi khi giúp láng giềng', () => {
    expect(heChuc('quan', 'bien')).toBe(GIAC_CHUNG.heChuc);
    expect(heChuc('bien', 'bac')).toBe(GIAC_CHUNG.heChuc);
    expect(heChuc('bien', 'bien')).toBe(1);
    expect(heChuc('hai', 'bien')).toBe(GIAC_CHUNG.heChuc);
    expect(heChuc('hai', 'tay')).toBe(1);
    expect(heChuc('nong', 'bac')).toBe(1);
    expect(heChuc(null, 'bac')).toBe(1);
    expect(satThuong(0.5, 1)).toBe(50);
    expect(satThuong(1, 1.5)).toBe(150);
    expect(satThuong(1.3, 1)).toBe(100);
    expect(chiaDiem(51, '12', '12')).toEqual({ ta: 51, giup: 0 });
    expect(chiaDiem(51, '01', '12')).toEqual({ ta: 25, giup: 26 });
  });
});

describe('trận giặc chung', () => {
  it('giặc theo chương: màn của chương ấy, không phải màn cầm cự', () => {
    for (const ch of [1, 2, 3, 4, 5] as Chapter[]) {
      const def = STAGES[manGiac(ch) - 1];
      expect(def.chapter).toBe(ch);
      expect(def.waves).toBeUndefined();
    }
  });

  it('kiểm quân: không quá quân trong bản chụp, không quá số chỗ một trận', () => {
    const snap = botSnapshot(7);
    expect(kiemQuanGiac(snap, { giao: snap.troops.giao + 1 }, {})).toEqual({ loi: 'quân nhiều hơn quân đang có' });
    expect(kiemQuanGiac(snap, { giao: 0 }, {})).toEqual({ loi: 'không có quân' });
    expect(kiemQuanGiac(snap, { giao: -1 }, {})).toEqual({ loi: 'quân sai dạng' });
    expect(kiemQuanGiac(snap, { giao: 1 }, { giao: 'hau', cung: 'xa' })).toEqual({
      quan: { army: { giao: 1, cung: 0, voi: 0, no: 0 }, rows: { ...DEFAULT_ROWS, giao: 'hau' } },
    });
  });

  it('máy khách đánh theo khung hình ra y hệt máy chủ đánh lại một mạch (kể cả bấm kỹ năng, rút quân)', () => {
    const snap = botSnapshot(8);
    const quan = { army: { giao: 6, cung: 6, voi: 2, no: 2 }, rows: { ...DEFAULT_ROWS } };
    const setup = setupGiac(snap, quan, 'bien', 12345);
    const run = beginGiac(setup);
    let lan = 0;
    while (!stepGiac(run, 37 + (lan++ % 5) * 11)) {
      if (run.step === 20) pushGiac(run, 'trongTran');
      if (run.step === 60) pushGiac(run, 'rut');
    }
    const lai = simulateGiac(setupGiac(snap, quan, 'bien', 12345), run.inputs);
    expect(lai.step).toBe(run.step);
    expect(phanHa(lai.battle)).toBe(phanHa(run.battle));
    expect(lai.battle.lost).toEqual(run.battle.lost);
    expect(run.battle.outcome).toBe('retreat');
  });

  it('máy chủ nhận bản chụp chuẩn hóa, đánh lại ra đúng trận máy khách dựng từ cùng mã', () => {
    const ma = encodeSnapshot(botSnapshot(6));
    const nhan = nhanGiac(ma, { giao: 4, cung: 3 }, {});
    if ('loi' in nhan) throw new Error(nhan.chiTiet);
    const kq = danhGiac(nhan.ma, nhan.quan, 'bac', 99, [], 1.5);
    const b = simulateGiac(setupGiac(decodeSnapshot(nhan.ma)!, nhan.quan, 'bac', 99), []).battle;
    expect(kq.pha).toBe(phanHa(b));
    expect(kq.sat).toBe(satThuong(phanHa(b), 1.5));
    expect(kq.mat).toEqual(b.lost);
    expect(nhanGiac('TDVS1:hong', {}, {})).toMatchObject({ loi: 'banChup' });
    expect(nhanGiac(ma, { giao: 999 }, {})).toMatchObject({ loi: 'quan' });
  });

  it('độ khó: đủ quân bấm kỹ năng thường hạ phần lớn máu giặc; không bấm hay nửa quân thì hạ ít hơn', () => {
    // Như các test cân bằng: người chơi thường (bấm chậm), tướng khi đã hết truyện, không Đền, không đồ.
    for (const ch of [2, 3, 4, 5] as Chapter[]) {
      const n = manGiac(ch);
      const def = STAGES[n - 1];
      const tb = (army: typeof SAMPLE_ARMY, play: 'thuong' | 'khongBam') => {
        let tong = 0;
        for (const nhom of NHOM_GIAC) {
          const [h1 = null, h2 = null] = lateHeroes(n);
          const b = startFieldBattle({ id: 1, stage: 0, enemies: def.enemies, hpScale: def.hpScale * GIAC_CHUNG.hpMul, army, rows: DEFAULT_ROWS, hero: h1, hero2: h2, bai: baiOf(NEN_GIAC[nhom], ch) });
          tong += phanHa(playOut(b, play));
        }
        return tong / NHOM_GIAC.length;
      };
      const du = tb(ch >= 4 ? SAMPLE_ARMY4 : SAMPLE_ARMY, 'thuong');
      const khong = tb(ch >= 4 ? SAMPLE_ARMY4 : SAMPLE_ARMY, 'khongBam');
      const nua = tb(ch >= 4 ? HALF_ARMY4 : HALF_ARMY, 'thuong');
      expect(du, `chương ${ch} đủ quân`).toBeGreaterThanOrEqual(0.7);
      expect(khong, `chương ${ch} không bấm`).toBeLessThan(du);
      expect(nua, `chương ${ch} nửa quân`).toBeLessThan(du);
      expect(nua, `chương ${ch} nửa quân vẫn hạ được`).toBeGreaterThan(0.2);
    }
  });
});

describe('phần lưu giặc chung', () => {
  it('nhận khóa thưởng đã nhận và trận chờ gửi; theo máy chủ thì giữ hai phần ấy', async () => {
    const { isVietNamState, theoMay } = await import('./vietNam');
    const { createInitialState } = await import('./game');
    const v = { tinh: '12', chuc: 'quan', nhan: ['100:12'], cho: { tran: '7', bam: [{ s: 3, k: 'rut' }] } };
    expect(isVietNamState(v)).toBe(true);
    expect(isVietNamState({ ...v, nhan: [1] })).toBe(false);
    expect(isVietNamState({ ...v, cho: { tran: 7, bam: [] } })).toBe(false);
    const s = createInitialState(0);
    s.vietNam = v as never;
    theoMay(s, { tinh: '08', chuc: 'bien', mua: 2, chucLuc: null, diemMua: 0, diemNgay: 0 });
    expect(s.vietNam).toEqual({ tinh: '08', mua: 2, chuc: 'bien', nhan: ['100:12'], cho: v.cho });
  });
});
