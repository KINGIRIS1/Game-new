// Canh trang bị tướng (docs/thiet-ke.md mục Kế hoạch: trang bị rơi ngẫu nhiên và sáu chỉ số tướng): rút đồ lặp lại
// được, tỉ lệ phẩm theo nơi rơi và trần chương, bộ rơi theo chương, kho đầy, mặc tháo, cường hóa, phân giải; chỉ số
// tổng và hiệu ứng bộ; trận nhận đúng máu, sát thương, tốc đánh, giáp, hồi, uy lực, hiệu ứng bốn món; rơi đồ sau
// trận; bản lưu 26 lên 27; Đấu thành chưa tính đồ.

import { describe, expect, it } from 'vitest';
import { doTa, isHero, startFieldBattle, stepField, useSkill, type Battle, type HeroSetup } from './battle';
import { startStage, updateCampaign } from './campaign';
import {
  BO_BON,
  BO_HAI,
  CAP_DO_GIA,
  CHI_SO_TRAN,
  CUONG_HOA_GIA,
  CUONG_HOA_TRAN,
  DEFAULT_ROWS,
  FIELD,
  FIRE,
  FIRST_RAID_MS,
  GIFT_IDS,
  GIONG,
  HIEU_TRIEU,
  KHO_DO_MAX,
  PHAM_TRAN,
  PHAN_GIAI_SAT,
  RAID_WARNING_MS,
  ROI_DO,
  SKILLS,
  STAGES,
  TRUNG_NHI,
  TRUNG_TRAC,
  type ChiSo,
  type NguonDo,
  type PhamDo,
} from './defs';
import { attackFrom, makeSnapshot } from './dauThanh';
import { createInitialState, place, tick, train, type GameState } from './game';
import { roll } from './ngauNhien';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { heroesFor } from './son';
import { SAMPLE_ARMY } from './testkit';
import { DIEN, DIEN_END, setDien } from './testmap';
import {
  boRoi,
  canCuongHoa,
  chinhOf,
  chiSoTuong,
  cuongHoa,
  doCua,
  giaCuongHoa,
  isTrangBiState,
  khoaDo,
  lucChienVoi,
  macDo,
  phanGiai,
  phanGiaiLoat,
  roiDo,
  rutMon,
  satPhanGiai,
  thaoDo,
  tinhDo,
  type Mon,
} from './trangBi';

/** Kinh đô có Gióng đã thành tráng sĩ, lò rèn cấp 5, nhiều của. */
function base(): GameState {
  const s = createInitialState(0);
  setDien(s, 6);
  s.resources = { gao: 900_000, voOc: 900_000, datDa: 900_000, sat: 900_000, go: 900_000 };
  s.dan = 40;
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: true, restUntil: 0, ascended: false };
  const lo = place(s, 'loRen', DIEN_END + 2, DIEN - 6);
  if (!lo.ok) throw new Error(lo.reason);
  lo.value.level = 5;
  return s;
}

/** Thêm một món vào kho (chỉ số tự chọn). */
function them(s: GameState, m: Partial<Mon> = {}): Mon {
  const mon: Mon = { id: s.trangBi.nextId++, o: 'vuKhi', bo: 'phuDong', pham: 3, cap: 1, chinh: 'danh', phu: [{ k: 'mau', nac: 1 }, { k: 'toc', nac: 5 }], cuong: 0, ...m };
  s.trangBi.kho.push(mon);
  return mon;
}

/** Sơn Tinh đã rước Mị Nương (để có tướng thứ hai mặc đồ). */
function voiSon(s: GameState): GameState {
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  return s;
}

describe('rút đồ', () => {
  it('cùng lần rút ra cùng món; món đúng luật', () => {
    for (let seq = 0; seq < 300; seq++) {
      const a = rutMon(seq, 'manDau', 3, ['coLoa']);
      expect(a).toEqual(rutMon(seq, 'manDau', 3, ['coLoa']));
      const m = { ...a!, id: 1 };
      expect(isTrangBiState({ kho: [m], seq: 0, nextId: 2 })).toBe(true);
      expect(m.phu.length).toBe(m.pham - 1);
      expect(m.cap).toBe(3);
      expect(m.bo).toBe('coLoa');
    }
  });

  it('tỉ lệ có rơi và tỉ lệ phẩm theo nơi rơi; phẩm không quá trần của chương', () => {
    const N = 20000;
    for (const nguon of Object.keys(ROI_DO) as NguonDo[]) {
      const def = ROI_DO[nguon];
      const dem = [0, 0, 0, 0];
      let roi = 0;
      for (let seq = 0; seq < N; seq++) {
        const m = rutMon(seq, nguon, 5, ['trungTrac']);
        if (!m) continue;
        roi++;
        dem[m.pham - 1]++;
      }
      expect(roi / N).toBeCloseTo(def.p, 1);
      const tong = def.w.reduce((a, b) => a + b, 0);
      for (let i = 0; i < 4; i++) expect(Math.abs(dem[i] / roi - def.w[i] / tong)).toBeLessThan(0.02);
    }
    for (const chuong of [1, 2, 3] as const) {
      let max = 0;
      for (let seq = 0; seq < 5000; seq++) max = Math.max(max, rutMon(seq, 'don', chuong, ['phuDong'])?.pham ?? 0);
      expect(max).toBe(PHAM_TRAN[chuong]);
    }
  });

  it('chưa có Gióng thì không rơi, không tốn lần rút', () => {
    const s = createInitialState(0);
    expect(roiDo(s, 'manDau', 1)).toBeNull();
    expect(s.trangBi.seq).toBe(0);
    expect(s.trangBi.kho).toEqual([]);
  });

  it('phó bản, thử thách rơi bộ của chương màn ấy; đồn, giữ kinh đô rơi bộ của tướng đã về', () => {
    const s = voiSon(base());
    expect(boRoi(s, 'manLai', 1)).toEqual(['phuDong']);
    expect(boRoi(s, 'thuDau', 4)).toEqual(['caoLo']);
    expect(boRoi(s, 'manDau', 5)).toEqual(['trungTrac', 'trungNhi']);
    expect(boRoi(s, 'giu', 2)).toEqual(['phuDong', 'tanVien']);
    expect(boRoi(s, 'don', 3)).toEqual(['phuDong', 'tanVien']);
    const r = roiDo(s, 'manDau', 2)!;
    expect(r.mon).toEqual(s.trangBi.kho[0]);
    expect(r.mon.bo).toBe('tanVien');
    expect(r.mon.id).toBe(1);
    expect(s.trangBi.seq).toBe(1);
  });

  it('kho đầy thì món mới tự phân giải ra sắt', () => {
    const s = base();
    for (let i = 0; i < KHO_DO_MAX; i++) them(s);
    const sat = s.resources.sat;
    const r = roiDo(s, 'manDau', 1)!;
    expect(r.sat).toBe(satPhanGiai(r.mon));
    expect(s.trangBi.kho.length).toBe(KHO_DO_MAX);
    expect(s.resources.sat).toBe(Math.min(sat + r.sat!, s.resources.sat));
    expect(r.sat).toBeGreaterThan(0);
  });
});

describe('mặc, tháo, cường hóa, phân giải', () => {
  it('mặc món đang ở tướng khác thì tự tháo khỏi tướng ấy; cùng ô thì thay món cũ', () => {
    const s = voiSon(base());
    const a = them(s, { o: 'vuKhi' });
    const b = them(s, { o: 'vuKhi', bo: 'tanVien' });
    expect(macDo(s, a.id, 'giong')).toEqual({ ok: true, value: undefined });
    expect(macDo(s, b.id, 'giong').ok).toBe(true);
    expect(a.tuong).toBeUndefined();
    expect(b.tuong).toBe('giong');
    expect(macDo(s, b.id, 'sonTinh')).toEqual({ ok: true, value: 'giong' });
    expect(b.tuong).toBe('sonTinh');
    expect(doCua(s, 'giong')).toBeUndefined();
    expect(macDo(s, a.id, 'anDuong')).toEqual({ ok: false, reason: 'tuongChuaCo' });
    expect(macDo(s, 999, 'giong')).toEqual({ ok: false, reason: 'khongCoDo' });
    expect(thaoDo(s, b.id).ok).toBe(true);
    expect(b.tuong).toBeUndefined();
  });

  it('cường hóa thêm 10% chỉ số chính mỗi nấc tới trần của phẩm, tốn của theo cấp đồ, cần lò rèn còn nguyên', () => {
    const s = base();
    const m = them(s, { pham: 2, cap: 3, o: 'giap', chinh: 'mau', phu: [{ k: 'danh', nac: 2 }] });
    const goc = chinhOf(m);
    const g = CUONG_HOA_GIA;
    expect(giaCuongHoa(m)).toEqual({ gao: g.gao * 4, datDa: g.voOcDatDa * 4, sat: g.sat * 4 });
    const gao = s.resources.gao;
    for (let n = 1; n <= CUONG_HOA_TRAN[2]; n++) expect(cuongHoa(s, m.id)).toEqual({ ok: true, value: n });
    expect(chinhOf(m)).toBeCloseTo(goc * 1.6, 9);
    expect(s.resources.gao).toBe(gao - g.gao * 4 * 21);
    expect(canCuongHoa(s, m.id)).toEqual({ ok: false, reason: 'capToiDa' });
    const v = them(s, { pham: 4, cuong: 5 });
    expect(giaCuongHoa(v)!.go).toBe(g.go * 6 * CAP_DO_GIA[1]);
    expect(giaCuongHoa(v)!.voOc).toBe(g.voOcDatDa * 6);
    s.buildings.find((b) => b.type === 'loRen')!.damaged = true;
    expect(canCuongHoa(s, v.id)).toEqual({ ok: false, reason: 'canLoRenNguyen' });
    s.buildings.find((b) => b.type === 'loRen')!.damaged = false;
    s.resources.sat = 0;
    expect(canCuongHoa(s, v.id)).toEqual({ ok: false, reason: 'thieuTaiNguyen' });
  });

  it('phân giải ra sắt, cộng lại nửa sắt đã cường hóa; món khóa, món đang mặc không phân giải được', () => {
    const s = base();
    const a = them(s, { pham: 3, cap: 2, cuong: 2 });
    expect(satPhanGiai(a)).toBe(PHAN_GIAI_SAT[3] * 2 + 0.5 * (CUONG_HOA_GIA.sat * 2 * 1 + CUONG_HOA_GIA.sat * 2 * 2));
    expect(khoaDo(s, a.id)).toEqual({ ok: true, value: true });
    expect(phanGiai(s, a.id)).toEqual({ ok: false, reason: 'doDaKhoa' });
    expect(khoaDo(s, a.id)).toEqual({ ok: true, value: false });
    macDo(s, a.id, 'giong');
    expect(phanGiai(s, a.id)).toEqual({ ok: false, reason: 'doDangMac' });
    thaoDo(s, a.id);
    s.resources.sat = 0;
    expect(phanGiai(s, a.id)).toEqual({ ok: true, value: satPhanGiai(a) });
    expect(s.resources.sat).toBe(satPhanGiai(a));
    expect(s.trangBi.kho).toEqual([]);
  });

  it('phân giải hàng loạt chỉ món phẩm thấp chưa khóa, chưa mặc', () => {
    const s = base();
    const thuong = them(s, { pham: 1, phu: [] });
    const tot = them(s, { pham: 2, phu: [{ k: 'mau', nac: 1 }] });
    const khoa = them(s, { pham: 1, phu: [], khoa: true });
    const mac = them(s, { pham: 2, o: 'baoVat', chinh: 'uy', phu: [{ k: 'mau', nac: 1 }], tuong: 'giong' });
    const quy = them(s, { pham: 3 });
    s.resources.sat = 0;
    expect(phanGiaiLoat(s, 2)).toEqual({ n: 2, sat: satPhanGiai(thuong) + satPhanGiai(tot) });
    expect(s.trangBi.kho).toEqual([khoa, mac, quy]);
  });
});

describe('chỉ số tướng', () => {
  it('cộng mọi món đang mặc; hai món bộ mình thì thêm hiệu ứng hai món, đủ bốn món thì có hiệu ứng bốn món', () => {
    const s = voiSon(base());
    const a = them(s, { o: 'vuKhi', chinh: 'danh', bo: 'phuDong', phu: [{ k: 'mau', nac: 1 }, { k: 'toc', nac: 5 }] });
    const b = them(s, { o: 'giap', chinh: 'mau', bo: 'phuDong', phu: [{ k: 'danh', nac: 3 }, { k: 'hoi', nac: 1 }] });
    macDo(s, a.id, 'giong');
    const mot = doCua(s, 'giong')!;
    expect(mot.danh).toBeCloseTo(0.04, 9);
    expect(mot.mau).toBeCloseTo(0.01, 9);
    expect(mot.toc).toBeCloseTo(0.02 * 0.6, 9);
    macDo(s, b.id, 'giong');
    const hai = doCua(s, 'giong')!;
    expect(hai.danh).toBeCloseTo(0.04 + 0.015 + BO_HAI.phuDong.v, 9);
    expect(hai.bo4).toBeUndefined();
    // Sơn Tinh mặc đồ bộ Phù Đổng: không có hiệu ứng bộ.
    macDo(s, a.id, 'sonTinh');
    macDo(s, b.id, 'sonTinh');
    expect(doCua(s, 'sonTinh')!.danh).toBeCloseTo(0.055, 9);
    const c = them(s, { o: 'phucSuc', chinh: 'toc', bo: 'phuDong', phu: [{ k: 'uy', nac: 1 }, { k: 'mau', nac: 1 }] });
    const d = them(s, { o: 'baoVat', chinh: 'uy', bo: 'phuDong', phu: [{ k: 'danh', nac: 1 }, { k: 'mau', nac: 1 }] });
    for (const m of [a, b, c, d]) macDo(s, m.id, 'giong');
    expect(doCua(s, 'giong')!.bo4).toBe(true);
  });

  it('giáp, hồi kỹ năng, tốc đánh có trần', () => {
    const worn: Mon[] = (['vuKhi', 'giap', 'phucSuc', 'baoVat'] as const).map((o, i) => ({
      id: i + 1,
      o,
      bo: 'trungTrac',
      pham: 4,
      cap: 5,
      chinh: o === 'giap' ? 'giap' : o === 'phucSuc' ? 'hoi' : o === 'vuKhi' ? 'danh' : 'uy',
      phu: [{ k: 'toc', nac: 5 }, { k: o === 'giap' ? 'hoi' : 'giap', nac: 5 }, { k: 'mau', nac: 5 }],
      cuong: 10,
    }));
    // Bộ tốt nhất (Huyền thoại chương 5 +10) chưa chạm trần; trần để chặn khi chỉ số dồn quá mức.
    const d = tinhDo('trungTrac', worn);
    for (const k of ['giap', 'hoi', 'toc'] as ChiSo[]) expect(d[k]).toBeLessThan(CHI_SO_TRAN[k]!);
    const qua = tinhDo('trungTrac', Array.from({ length: 6 }, () => worn).flat());
    for (const k of ['giap', 'hoi', 'toc'] as ChiSo[]) expect(qua[k]).toBe(CHI_SO_TRAN[k]);
  });

  it('chỉ số tổng ở bảng tướng: gốc, Đền, huân công, đồ; lực chiến tăng khi mặc món tốt', () => {
    const s = base();
    s.thuThach.bac.tuong = 2;
    const truoc = chiSoTuong(s, 'giong');
    expect(truoc.mau).toBeCloseTo(GIONG.hp * (1 + truoc.den + 0.08), 9);
    expect(truoc.nghi).toBe(GIONG.cooldown);
    const m = them(s, { o: 'phucSuc', chinh: 'toc', phu: [{ k: 'mau', nac: 1 }, { k: 'danh', nac: 1 }] });
    const lc = lucChienVoi(s, 'giong', m);
    expect(lc).toBeGreaterThan(truoc.lucChien);
    macDo(s, m.id, 'giong');
    const sau = chiSoTuong(s, 'giong');
    expect(sau.lucChien).toBe(lc);
    expect(sau.nghi).toBeCloseTo(GIONG.cooldown / (1 + 0.04 * 0.6), 9);
  });
});

/** Đồ mẫu: mọi chỉ số một phần cộng. */
const DO = (v: Partial<Record<ChiSo, number>>, bo4?: true) => ({ mau: 0, danh: 0, toc: 0, uy: 0, giap: 0, hoi: 0, ...v, ...(bo4 ? { bo4 } : {}) });

const fieldWith = (hero: HeroSetup, hero2?: HeroSetup, army = SAMPLE_ARMY, hpScale = 1) =>
  startFieldBattle({ id: 3, stage: 5, enemies: STAGES[4].enemies, hpScale, army, rows: DEFAULT_ROWS, hero, hero2 });
/** Không mang lính: chỉ tướng đánh, đòn nào trúng giặc cũng là của tướng. */
const ALONE = { giao: 0, cung: 0, voi: 0, no: 0 };

const GIONG_SETUP: HeroSetup = { kind: 'giong', bamboo: true, glow: false, non: false };
const heroOf = (b: Battle, kind = 'giong') => b.fighters.find((f) => f.side === 'ta' && f.kind === kind)!;
const hpGiac = (b: Battle) => b.fighters.filter((f) => f.side === 'giac').reduce((t, f) => t + f.hp, 0);

describe('trận nhận chỉ số đồ', () => {
  it('máu, sức đánh, tốc đánh của tướng', () => {
    const goc = fieldWith(GIONG_SETUP, undefined, ALONE, 10);
    const co = fieldWith({ ...GIONG_SETUP, trangBi: DO({ mau: 0.2, danh: 0.3, toc: 0.25 }) }, undefined, ALONE, 10);
    expect(heroOf(co).maxHp / heroOf(goc).maxHp).toBeCloseTo(1.2, 9);
    expect(heroOf(goc).maxHp).toBeCloseTo(GIONG.hp * FIELD.hpMul, 9);
    // Hai trận như nhau tới đòn đầu tiên của tướng: đo máu giặc mất ở bước tướng ra đòn, và thời gian nghỉ sau đòn.
    const firstHit = (b: Battle) => {
      const g = heroOf(b);
      for (let i = 0; i < 5000; i++) {
        const before = hpGiac(b);
        stepField(b, 0.02);
        if (g.cd > 0) return { cd: g.cd, hit: before - hpGiac(b) };
      }
      throw new Error('tướng chưa ra đòn');
    };
    const a = firstHit(goc);
    const c = firstHit(co);
    expect(c.hit / a.hit).toBeCloseTo(1.3, 6);
    expect(c.cd / a.cd).toBeCloseTo(1 / 1.25, 2);
  });

  it('giáp bớt sát thương tướng phải chịu', () => {
    const firstDrop = (b: Battle) => {
      const g = heroOf(b);
      for (let i = 0; i < 5000; i++) {
        const hp = g.hp;
        stepField(b, 0.02);
        if (g.hp < hp) return hp - g.hp;
      }
      throw new Error('tướng chưa trúng đòn');
    };
    const goc = fieldWith(GIONG_SETUP, undefined, ALONE, 10);
    const co = fieldWith({ ...GIONG_SETUP, trangBi: DO({ giap: 0.3 }) }, undefined, ALONE, 10);
    expect(doTa(co, 'giong')!.giap).toBe(0.3);
    expect(doTa(co, 'giao')).toBeUndefined();
    expect(firstDrop(co) / firstDrop(goc)).toBeCloseTo(0.7, 9);
  });

  it('hồi kỹ năng nhanh hơn, đòn kỹ năng mạnh theo uy lực của chính tướng làm kỹ năng', () => {
    const goc = fieldWith(GIONG_SETUP, undefined, ALONE, 10);
    const co = fieldWith({ ...GIONG_SETUP, trangBi: DO({ hoi: 0.2, uy: 0.5 }) }, undefined, ALONE, 10);
    for (const b of [goc, co]) for (let i = 0; i < 150; i++) stepField(b, 0.02);
    const burn = (b: Battle) => {
      const before = hpGiac(b);
      expect(useSkill(b, 'phunLua')).toBe(true);
      return before - hpGiac(b);
    };
    const a = burn(goc);
    expect(a).toBeGreaterThan(0);
    expect(burn(co) / a).toBeCloseTo(1.5, 9);
    expect(goc.skillCd.phunLua).toBe(SKILLS.phunLua.cooldown);
    expect(co.skillCd.phunLua).toBeCloseTo(SKILLS.phunLua.cooldown * 0.8, 9);
    // Trống trận của Lạc tướng không theo đồ của tướng nào.
    expect(useSkill(co, 'trongTran')).toBe(true);
    expect(co.skillCd.trongTran).toBe(SKILLS.trongTran.cooldown);
  });

  it('Hai Bà mỗi bà một bộ đồ, một hệ số', () => {
    const tt: HeroSetup = { kind: 'trungTrac', bamboo: false, glow: false, non: false, trangBi: DO({ mau: 0.5 }) };
    const tn: HeroSetup = { kind: 'trungNhi', bamboo: false, glow: false, non: false, hieuTrieu: true, trangBi: DO({ hoi: 0.25 }) };
    const b = fieldWith(tt, tn);
    expect(heroOf(b, 'trungTrac').maxHp).toBeCloseTo(TRUNG_TRAC.hp * FIELD.hpMul * 1.5, 9);
    expect(heroOf(b, 'trungNhi').maxHp).toBeCloseTo(TRUNG_NHI.hp * FIELD.hpMul, 9);
    for (let i = 0; i < 300; i++) stepField(b, 0.02);
    expect(useSkill(b, 'voiXung')).toBe(true);
    expect(useSkill(b, 'hieuTrieu')).toBe(true);
    expect(b.skillCd.voiXung).toBe(SKILLS.voiXung.cooldown);
    expect(b.skillCd.hieuTrieu).toBeCloseTo(SKILLS.hieuTrieu.cooldown * 0.75, 9);
  });

  it('đủ bốn món bộ mình thì kỹ năng mạnh hơn, sự kiện mang số mới cho phần vẽ', () => {
    const goc = fieldWith(GIONG_SETUP);
    const bon = fieldWith({ ...GIONG_SETUP, trangBi: DO({}, true) });
    for (const b of [goc, bon]) {
      for (let i = 0; i < 400; i++) stepField(b, 0.02);
      useSkill(b, 'phunLua');
    }
    const fire = (b: Battle) => b.events.filter((e) => e.kind === 'fire').at(-1)!;
    expect(fire(goc).len).toBeUndefined();
    expect(fire(bon).len).toBe(BO_BON.phunLua.length);
    expect(BO_BON.phunLua.length).toBeGreaterThan(FIRE.length);
    const tn: HeroSetup = { kind: 'trungNhi', bamboo: false, glow: false, non: false, hieuTrieu: true, trangBi: DO({}, true) };
    const b = fieldWith({ kind: 'trungTrac', bamboo: false, glow: false, non: false }, tn);
    for (let i = 0; i < 300; i++) stepField(b, 0.02);
    expect(useSkill(b, 'hieuTrieu')).toBe(true);
    expect(b.fighters.filter((f) => f.kind === 'nghiaBinh').length).toBe(BO_BON.hieuTrieu.count);
    expect(BO_BON.hieuTrieu.count).toBe(HIEU_TRIEU.count + 1);
    expect(b.events.at(-1)!.n).toBe(BO_BON.hieuTrieu.count);
  });

  it('tướng ra trận mang đồ đang mặc; mặc đồ giữa trận không đổi trận đang đánh', () => {
    const s = base();
    s.troops = { giao: 10, cung: 6, voi: 0, no: 0 };
    s.campaign.cleared = 5;
    const m = them(s, { o: 'giap', chinh: 'mau', phu: [{ k: 'danh', nac: 1 }, { k: 'toc', nac: 1 }] });
    expect(heroesFor(s, 1)[0].trangBi).toBeUndefined();
    macDo(s, m.id, 'giong');
    expect(heroesFor(s, 1)[0].trangBi).toEqual(doCua(s, 'giong'));
    const place1 = place(s, 'doanhTrai', DIEN - 10, DIEN_END + 2);
    if (!place1.ok) throw new Error(place1.reason);
    expect(startStage(s, 6, { giao: 10, cung: 6, voi: 0, no: 0 }, DEFAULT_ROWS).ok).toBe(true);
    const b = s.campaign.battle!;
    const truoc = { ...b.hero!.trangBi! };
    cuongHoa(s, m.id);
    thaoDo(s, m.id);
    expect(b.hero!.trangBi).toEqual(truoc);
  });
});

/** Lần rút đầu từ `from` có rơi ở nơi `nguon`. */
const seqRoi = (nguon: NguonDo, from = 0) => {
  let seq = from;
  while (roll(seq, 0) >= ROI_DO[nguon].p) seq++;
  return seq;
};

describe('rơi đồ sau trận', () => {
  it('thắng màn lần đầu chắc rơi, cấp đồ và bộ theo chương của màn; thua không rơi', () => {
    const s = base();
    s.troops = { giao: 10, cung: 6, voi: 0, no: 0 };
    s.campaign.cleared = 5;
    const trai = place(s, 'doanhTrai', DIEN - 10, DIEN_END + 2);
    if (!trai.ok) throw new Error(trai.reason);
    const finish = (outcome: 'win' | 'lose') => {
      const b = s.campaign.battle!;
      for (const f of b.fighters) {
        if ((outcome === 'win') !== (f.side === 'giac')) continue;
        f.hp = 0;
        f.state = isHero(f.kind) ? 'gone' : 'dead';
      }
      b.waves = [];
      b.holdS = undefined;
      updateCampaign(s, 100);
    };
    expect(startStage(s, 6, { giao: 10, cung: 6, voi: 0, no: 0 }, DEFAULT_ROWS).ok).toBe(true);
    finish('lose');
    expect(s.campaign.lastResult!.do).toBeUndefined();
    s.campaign.battle = null;
    s.giong.restUntil = 0;
    expect(startStage(s, 6, { giao: 10, cung: 6, voi: 0, no: 0 }, DEFAULT_ROWS).ok).toBe(true);
    finish('win');
    const r = s.campaign.lastResult!;
    expect(r.first).toBe(true);
    expect(r.do!.mon.cap).toBe(1);
    expect(r.do!.mon.bo).toBe('phuDong');
    expect(r.do!.mon.pham).toBeGreaterThanOrEqual(2);
    expect(s.trangBi.kho).toContainEqual(r.do!.mon);
  });

  it('giữ được kinh đô thì có khi rơi đồ, cấp đồ theo chương đang chơi', () => {
    const s = createInitialState(0);
    setDien(s, 2);
    s.resources = { gao: 900, voOc: 900, datDa: 900, sat: 400, go: 400 };
    s.dan = 30;
    s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: false, restUntil: 0, ascended: false };
    for (const [t, x, z] of [['doanhTrai', DIEN - 10, DIEN_END + 2], ['kho', DIEN_END + 2, DIEN_END + 2], ['traiGiao', DIEN - 1, DIEN_END + 2]] as const) {
      if (!place(s, t, x, z).ok) throw new Error(t);
    }
    for (let i = 0; i < 6; i++) train(s, 'giao');
    place(s, 'choiCanh', DIEN + 2, DIEN - 3);
    s.trangBi.seq = seqRoi('giu');
    tick(s, 1000);
    tick(s, FIRST_RAID_MS);
    tick(s, RAID_WARNING_MS);
    for (let i = 0; i < 300 && s.raid.phase === 'battle'; i++) tick(s, 1000);
    expect(s.raid.lastResult?.won).toBe(true);
    expect(s.raid.lastResult!.do!.mon.cap).toBe(1);
    expect(s.trangBi.kho.length).toBe(1);
  });
});

describe('bản lưu và Đấu thành', () => {
  it('bản lưu 26 lên 27: kho đồ rỗng; lưu rồi đọc lại giữ nguyên đồ', () => {
    const s = base();
    const m = them(s, { khoa: true, tuong: 'giong', cuong: 3 });
    const back = deserialize(serialize(s))!;
    expect(back.trangBi).toEqual(s.trangBi);
    expect(back.trangBi.kho[0]).toEqual(m);
    const raw = JSON.parse(serialize(s));
    raw.version = 26;
    delete raw.trangBi;
    const up = deserialize(JSON.stringify(raw))!;
    expect(up.version).toBe(SAVE_VERSION);
    expect(up.trangBi).toEqual({ kho: [], seq: 0, nextId: 1 });
  });

  it('kiểm phần đồ của bản lưu: sai phẩm, sai chỉ số, hai món một ô của một tướng thì hỏng', () => {
    const ok: Mon = { id: 1, o: 'giap', bo: 'caoLo', pham: 2, cap: 4, chinh: 'giap', phu: [{ k: 'mau', nac: 3 }], cuong: 6 };
    const st = (kho: unknown[]) => ({ kho, seq: 3, nextId: 9 });
    expect(isTrangBiState(st([ok]))).toBe(true);
    expect(isTrangBiState(st([{ ...ok, cuong: 7 }]))).toBe(false);
    expect(isTrangBiState(st([{ ...ok, chinh: 'danh' }]))).toBe(false);
    expect(isTrangBiState(st([{ ...ok, phu: [] }]))).toBe(false);
    expect(isTrangBiState(st([{ ...ok, phu: [{ k: 'giap', nac: 1 }] }]))).toBe(false);
    expect(isTrangBiState(st([{ ...ok, phu: [{ k: 'mau', nac: 6 }] }]))).toBe(false);
    expect(isTrangBiState(st([{ ...ok, pham: 5 as PhamDo }]))).toBe(false);
    expect(isTrangBiState(st([ok, { ...ok }]))).toBe(false);
    expect(isTrangBiState(st([{ ...ok, tuong: 'caoLo' }, { ...ok, id: 2, tuong: 'caoLo' }]))).toBe(false);
    expect(isTrangBiState(st([{ ...ok, tuong: 'caoLo' }, { ...ok, id: 2, tuong: 'giong' }]))).toBe(true);
    expect(isTrangBiState(st([{ ...ok, id: 9 }]))).toBe(false);
  });

  it('Đấu thành chưa tính đồ: bản chụp và quân đi đánh không mang đồ của tướng', () => {
    const s = base();
    const m = them(s);
    macDo(s, m.id, 'giong');
    expect(heroesFor(s, 1)[0].trangBi).toBeDefined();
    for (const h of makeSnapshot(s).heroes) expect(h.trangBi).toBeUndefined();
    for (const h of attackFrom(s, { giao: 1, cung: 0, voi: 0, no: 0 }, 'bac', 1).heroes) expect(h.trangBi).toBeUndefined();
  });
});

