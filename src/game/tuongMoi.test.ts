// Canh tướng dã ngoại (docs/thiet-ke.md mục Kế hoạch: năm tướng mới). PR 1 là Bà Triệu: về khi hạ boss map 6 lần
// đầu (một lần, kể cả bản lưu cũ đã hạ boss), chọn được vào đội dã ngoại, chỉ đánh ở dã ngoại (không doanh, không ra
// phó bản, không giữ thành trong Đấu thành), đứng chầu trong sân; Chém cá kình nhắm kẻ nhiều máu nhất, đủ bốn món bộ
// Núi Nưa thì mạnh hơn và choáng; bộ Núi Nưa chỉ rơi ở map 6 khi Bà đã về, máy chủ nhận ở chương 5. PR 2 là Triệu
// Quang Phục (map 7): Ngày ẩn đêm ra cho cả đội ẩn, quái mất dấu, hết ẩn thì đòn đầu mạnh gấp bội; bộ Dạ Trạch. PR 3
// là Mai Thúc Loan (map 8): Hắc Đế dấy binh cho cả đội thêm sức đánh, quái quanh ông quay sang ông; bộ Vạn An.

import { describe, expect, it } from 'vitest';
import { HERO_KINDS, isAlive, strike, useSkill, type Battle } from './battle';
import { BO_DO, CA_KINH, DA_BOSS_MS, DOANH_MAX, GIFT_IDS, HAC_DE, NGAY_AN, ROI_DO, type BoDo, type Chapter } from './defs';
import { capNhatDa, datDoi, moMap, tuongCo } from './daNgoai';
import { boCuc } from './daNgoaiMap';
import { stepDa } from './daNgoaiTran';
import { doanhCount, generals, tuongJoined } from './doanhTrai';
import { makeSnapshot, validateSnapshot } from './dauThanh';
import { createInitialState, type GameState } from './game';
import { deserialize, serialize } from './save';
import { heroesFor } from './son';
import { markStory, pendingStory } from './story';
import { boRoi, kiemMon, roiDo, rutMon, tinhDo } from './trangBi';

const CHUONG: Chapter[] = [1, 2, 3, 4, 5];

/** Kinh đô có Gióng (đồ đã mở), đủ lễ vật cho Sơn Tinh. */
function base(): GameState {
  const s = createInitialState(0);
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: true, restUntil: 0, ascended: false };
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  return s;
}

/** Hạ boss map 6 như trận thật báo về (`capNhatDa` ghi giờ boss mọc lại). */
function haBoss6(s: GameState): void {
  s.daNgoai.map = 6;
  s.daNgoai.cap = 60;
  datDoi(s, ['giong']);
  const b = moMap(s);
  b.da!.giet.push({ kind: 'lucDan', cap: 62, khu: -1, boss: true, x: 0, z: 0 });
  capNhatDa(s, b);
}

/** Map 6, đội chỉ Bà Triệu, đứng giữa khu `k`. */
function tranBaTrieu(s: GameState, k = 0): Battle {
  s.daNgoai.map = 6;
  s.daNgoai.tuDanh = false;
  const kh = boCuc(6).khu[k];
  s.daNgoai.cho = { x: kh.x, z: kh.z };
  expect(datDoi(s, ['baTrieu']).ok).toBe(true);
  return moMap(s);
}

describe('Bà Triệu về khi hạ boss map 6', () => {
  it('chưa hạ boss thì chưa về; hạ lần đầu thì về, kể đoạn truyện một lần', () => {
    const s = base();
    expect(tuongJoined(s, 'baTrieu')).toBe(false);
    expect(tuongCo(s)).not.toContain('baTrieu');
    expect(datDoi(s, ['baTrieu']).ok).toBe(false);
    haBoss6(s);
    expect(tuongJoined(s, 'baTrieu')).toBe(true);
    expect(tuongCo(s)).toContain('baTrieu');
    // Đoạn truyện Bà Triệu tới lượt kể (các đoạn trước đã kể), kể xong thì thôi.
    for (let id = pendingStory(s); id && id !== 'baTrieu'; id = pendingStory(s)) markStory(s, id);
    expect(pendingStory(s)).toBe('baTrieu');
    markStory(s, 'baTrieu');
    expect(pendingStory(s)).toBeNull();
    // Boss mọc lại, hạ lần nữa: vẫn chỉ một Bà Triệu, truyện không kể lại.
    s.clock += DA_BOSS_MS;
    haBoss6(s);
    expect(tuongCo(s).filter((k) => k === 'baTrieu')).toHaveLength(1);
    expect(pendingStory(s)).toBeNull();
  });

  it('bản lưu cũ đã hạ boss map 6: tải lên là có Bà Triệu, không cần thêm trường lưu', () => {
    const s = base();
    haBoss6(s);
    const t = deserialize(serialize(s))!;
    expect(tuongJoined(t, 'baTrieu')).toBe(true);
  });
});

describe('Bà Triệu chỉ đánh ở dã ngoại', () => {
  it('không nhận doanh, không ra phó bản, không giữ thành trong Đấu thành', () => {
    const s = base();
    const doanh = doanhCount(s);
    haBoss6(s);
    expect(generals(s)).not.toContain('baTrieu');
    expect(doanhCount(s)).toBe(Math.min(doanh, DOANH_MAX));
    for (const ch of CHUONG) expect(heroesFor(s, ch).map((h) => h.kind)).not.toContain('baTrieu');
    // Bản chụp sửa tay cho Bà Triệu giữ thành: máy chủ không nhận.
    const snap = makeSnapshot(s);
    expect(snap.heroes.map((h) => h.kind)).not.toContain('baTrieu');
    const sua = { ...snap, heroes: [{ kind: 'baTrieu' as const, bamboo: false, glow: false, non: false }] };
    expect(validateSnapshot(sua)).not.toBeNull();
  });

  it('chọn được vào đội cùng tướng cũ; trận có Chém cá kình', () => {
    const s = base();
    haBoss6(s);
    expect(datDoi(s, ['baTrieu', 'giong']).ok).toBe(true);
    const b = moMap(s);
    expect(b.skills).toContain('chemCaKinh');
    expect(b.fighters.some((f) => f.kind === 'baTrieu')).toBe(true);
  });
});

describe('Chém cá kình', () => {
  /** Hạ máu mọi quái quanh Bà, trừ một con: con ấy là kẻ nhiều máu nhất trong tầm. */
  function chuanBi(b: Battle) {
    const ba = b.fighters.find((f) => f.kind === 'baTrieu')!;
    const gan = b.fighters.filter((f) => f.side === 'giac' && isAlive(f) && Math.hypot(f.x - ba.x, f.z - ba.z) <= CA_KINH.tam - 0.5);
    expect(gan.length).toBeGreaterThan(1);
    // Kẻ đứng xa nhất trong tầm có nhiều máu nhất: Bà phải chọn nó, không chọn kẻ gần nhất.
    gan.sort((a, c) => Math.hypot(c.x - ba.x, c.z - ba.z) - Math.hypot(a.x - ba.x, a.z - ba.z));
    const muc = gan[0];
    for (const f of gan) if (f !== muc) f.hp = Math.min(f.hp, muc.hp * 0.5);
    return { ba, muc, gan };
  }

  it('nhắm kẻ nhiều máu nhất trong tầm, voi lao tới trước mặt kẻ ấy', () => {
    const s = base();
    haBoss6(s);
    const b = tranBaTrieu(s);
    const { ba, muc, gan } = chuanBi(b);
    const truoc = new Map(gan.map((f) => [f, f.hp]));
    expect(useSkill(b, 'chemCaKinh')).toBe(true);
    expect(muc.hp).toBeLessThan(truoc.get(muc)!);
    for (const f of gan) if (f !== muc) expect(f.hp).toBe(truoc.get(f));
    expect(Math.hypot(ba.x - muc.x, ba.z - muc.z)).toBeLessThan(1.5);
    expect(b.events.some((e) => e.kind === 'chem')).toBe(true);
    // Hồi kỹ năng: bấm lại ngay không được.
    expect(useSkill(b, 'chemCaKinh')).toBe(false);
  });

  it('đủ bốn món bộ Núi Nưa: sát thương 260 → 330, thêm choáng', () => {
    const danh = (bo4: boolean) => {
      const s = base();
      haBoss6(s);
      const b = tranBaTrieu(s);
      if (bo4) b.hero!.trangBi = { ...tinhDo('baTrieu', []), bo4: true };
      const { muc } = chuanBi(b);
      muc.hp = muc.maxHp = 1e6;
      useSkill(b, 'chemCaKinh');
      return { mat: 1e6 - muc.hp, stun: muc.stun ?? 0 };
    };
    const thuong = danh(false);
    const du = danh(true);
    expect(du.mat / thuong.mat).toBeCloseTo(330 / 260, 3);
    expect(thuong.stun).toBe(0);
    expect(du.stun).toBe(1);
  });
});

describe('bộ Núi Nưa', () => {
  it('chỉ rơi ở map 6 sau khi Bà về; phó bản, giữ kinh đô, đồn không rơi', () => {
    const s = base();
    const rut = () => {
      const bo = new Set<BoDo>();
      s.trangBi.kho.length = 0;
      for (let i = 0; i < 200; i++) {
        const b = moMap(s);
        b.da!.giet.push({ kind: 'gauNgua', cap: 55, khu: 0, boss: false, x: 0, z: 0 });
        capNhatDa(s, b);
      }
      for (const m of s.trangBi.kho) bo.add(m.bo);
      return bo;
    };
    s.daNgoai.map = 6;
    datDoi(s, ['giong']);
    expect(rut().has('nuiNua')).toBe(false);
    haBoss6(s);
    expect([...rut()]).toEqual(['nuiNua']);
    for (const nguon of Object.keys(ROI_DO) as (keyof typeof ROI_DO)[]) {
      if (nguon === 'daQuai' || nguon === 'daBoss') continue;
      for (const ch of CHUONG) expect(boRoi(s, nguon, ch)).not.toContain('nuiNua');
    }
    // Rơi thật ở giữ kinh đô: không ra bộ Núi Nưa.
    for (let i = 0; i < 100; i++) expect(roiDo(s, 'giu', 5)?.mon.bo).not.toBe('nuiNua');
  });

  it('máy chủ nhận món Núi Nưa ở chương 5; hiệu ứng bộ chỉ khi Bà Triệu mặc', () => {
    expect(BO_DO).toContain('nuiNua');
    const m = rutMon(1, 'daBoss', 5, ['nuiNua'], [0, 0, 0, 100])!;
    expect(kiemMon(m, 5)).toBeNull();
    expect(kiemMon(m, 4)).not.toBeNull();
    const bon = (['vuKhi', 'giap', 'phucSuc', 'baoVat'] as const).map((o) => ({ ...m, o, chinh: o === 'vuKhi' ? 'danh' : o === 'giap' ? 'mau' : o === 'phucSuc' ? 'toc' : 'uy' }) as typeof m);
    expect(tinhDo('baTrieu', bon).bo4).toBe(true);
    expect(tinhDo('giong', bon).bo4).toBeUndefined();
    expect(tinhDo('baTrieu', bon).mau).toBeGreaterThan(tinhDo('giong', bon).mau);
  });

  it('mọi tướng mặc được đồ, Bà Triệu có trong danh sách tướng', () => {
    expect(HERO_KINDS).toContain('baTrieu');
  });
});

// ---------- PR 2: Triệu Quang Phục (map 7 Đầm Dạ Trạch) ----------

/** Hạ boss map 7 như trận thật báo về. */
function haBoss7(s: GameState): void {
  s.daNgoai.map = 7;
  s.daNgoai.cap = 70;
  datDoi(s, ['giong']);
  const b = moMap(s);
  b.da!.giet.push({ kind: 'tranBaTien', cap: 72, khu: -1, boss: true, x: 0, z: 0 });
  capNhatDa(s, b);
}

/** Map 7, đội Triệu Quang Phục và Gióng, đứng giữa khu `k`. */
function tranTqp(s: GameState, k = 0): Battle {
  s.daNgoai.map = 7;
  s.daNgoai.tuDanh = false;
  const kh = boCuc(7).khu[k];
  s.daNgoai.cho = { x: kh.x, z: kh.z };
  expect(datDoi(s, ['trieuQuangPhuc', 'giong']).ok).toBe(true);
  return moMap(s);
}

/** Chạy trận dã ngoại `giay` giây theo bước thật. */
function chay(b: Battle, giay: number): void {
  for (let t = 0; t < giay; t += 0.05) stepDa(b, 0.05);
}

describe('Triệu Quang Phục về khi hạ boss map 7', () => {
  it('chưa hạ Trần Bá Tiên thì chưa về; hạ map 6 không kéo theo; hạ map 7 thì về, kể truyện một lần', () => {
    const s = base();
    haBoss6(s);
    expect(tuongJoined(s, 'trieuQuangPhuc')).toBe(false);
    expect(datDoi(s, ['trieuQuangPhuc']).ok).toBe(false);
    haBoss7(s);
    expect(tuongJoined(s, 'trieuQuangPhuc')).toBe(true);
    expect(tuongCo(s)).toContain('trieuQuangPhuc');
    for (let id = pendingStory(s); id && id !== 'trieuQuangPhuc'; id = pendingStory(s)) markStory(s, id);
    expect(pendingStory(s)).toBe('trieuQuangPhuc');
    markStory(s, 'trieuQuangPhuc');
    expect(pendingStory(s)).toBeNull();
    s.clock += DA_BOSS_MS;
    haBoss7(s);
    expect(pendingStory(s)).toBeNull();
  });

  it('chỉ đánh ở dã ngoại: không doanh, không phó bản, không giữ thành', () => {
    const s = base();
    haBoss7(s);
    expect(generals(s)).not.toContain('trieuQuangPhuc');
    for (const ch of CHUONG) expect(heroesFor(s, ch).map((h) => h.kind)).not.toContain('trieuQuangPhuc');
    const sua = { ...makeSnapshot(s), heroes: [{ kind: 'trieuQuangPhuc' as const, bamboo: false, glow: false, non: false }] };
    expect(validateSnapshot(sua)).not.toBeNull();
  });
});

describe('Ngày ẩn đêm ra', () => {
  /** Trận map 7 có quái đang đuổi đội (đã đánh nhau một lúc). */
  function dangDanh() {
    const s = base();
    haBoss7(s);
    const b = tranTqp(s);
    b.da!.tuDanh = true;
    for (const f of b.fighters) if (f.side === 'ta') f.hp = f.maxHp = 1e6;
    // Chưa cho Tự đánh dùng kỹ năng: để quái kịp đuổi đội.
    b.skillCd.ngayAn = 999;
    chay(b, 6);
    b.skillCd.ngayAn = 0;
    const duoi = b.fighters.filter((f) => f.side === 'giac' && isAlive(f) && f.nha?.trang === 'duoi');
    expect(duoi.length).toBeGreaterThan(0);
    return { s, b, duoi };
  }

  it('cả đội ẩn: quái đang đuổi mất dấu, đứng lại (không về chỗ mọc), không đánh trúng ai; hết ẩn thì đuổi lại', () => {
    const { b, duoi } = dangDanh();
    b.da!.tuDanh = false;
    b.da!.muc = null;
    expect(useSkill(b, 'ngayAn')).toBe(true);
    const ta = b.fighters.filter((f) => f.side === 'ta' && isAlive(f));
    for (const f of ta) expect(f.an).toBe(NGAY_AN.an);
    expect(b.events.some((e) => e.kind === 'an')).toBe(true);
    // Đội đứng yên tại chỗ (không Tự đánh): ẩn chừng ba giây, không ai mất máu (yên thì còn hồi máu).
    for (const f of ta) f.cd = 99;
    for (let t = 0; t < 3.5; t += 0.05) {
      const mau = ta.map((f) => f.hp);
      stepDa(b, 0.05);
      ta.forEach((f, i) => expect(f.hp).toBeGreaterThanOrEqual(mau[i]));
    }
    for (const q of duoi) if (isAlive(q)) expect(q.nha?.trang).toBe('cho');
    // Hết ẩn: quái đã bị đánh thấy đội thì đuổi lại.
    chay(b, 1);
    for (const f of ta) expect(f.an ?? 0).toBe(0);
    expect(duoi.some((q) => isAlive(q) && q.nha?.trang === 'duoi')).toBe(true);
    expect(useSkill(b, 'ngayAn')).toBe(false);
  });

  it('hết ẩn thì đòn thường đầu tiên mạnh gấp 2,5 (đủ bộ Dạ Trạch: ẩn 5 giây, gấp 3), đòn sau như thường', () => {
    const danh = (bo4: boolean) => {
      const s = base();
      haBoss7(s);
      const b = tranTqp(s);
      const tqp = b.fighters.find((f) => f.kind === 'trieuQuangPhuc')!;
      if (bo4) b.hero!.trangBi = { ...tinhDo('trieuQuangPhuc', []), bo4: true };
      const foe = b.fighters.find((f) => f.side === 'giac' && isAlive(f))!;
      foe.hp = foe.maxHp = 1e6;
      const don = () => {
        const truoc = foe.hp;
        strike(b, tqp, foe);
        return truoc - foe.hp;
      };
      const thuong = don();
      useSkill(b, 'ngayAn');
      const an = tqp.an!;
      // Đang ẩn: đánh như thường, chưa dùng đòn mạnh.
      const trongAn = don();
      tqp.an = 0;
      const dau = don();
      const sau = don();
      return { thuong, trongAn, dau, sau, an };
    };
    const t = danh(false);
    expect(t.an).toBe(4);
    expect(t.trongAn).toBeCloseTo(t.thuong, 6);
    expect(t.dau / t.thuong).toBeCloseTo(2.5, 6);
    expect(t.sau).toBeCloseTo(t.thuong, 6);
    const d = danh(true);
    expect(d.an).toBe(5);
    expect(d.dau / d.thuong).toBeCloseTo(3, 6);
  });

  it('Tự đánh tự dùng Ngày ẩn đêm ra khi có quái gần, vẫn hạ được quái', () => {
    const { b } = dangDanh();
    const giet = b.da!.giet.length;
    chay(b, 30);
    expect(b.skillCd.ngayAn ?? 0).toBeGreaterThan(0);
    expect(b.da!.giet.length).toBeGreaterThan(giet);
  });
});

describe('bộ Dạ Trạch', () => {
  it('chỉ rơi ở map 7 sau khi Triệu Quang Phục về; map 6 vẫn rơi Núi Nưa', () => {
    const s = base();
    haBoss6(s);
    const rut = (map: 6 | 7) => {
      const bo = new Set<BoDo>();
      s.trangBi.kho.length = 0;
      s.daNgoai.map = map;
      datDoi(s, ['giong']);
      for (let i = 0; i < 200; i++) {
        const b = moMap(s);
        b.da!.giet.push({ kind: 'trauRung', cap: 65, khu: 0, boss: false, x: 0, z: 0 });
        capNhatDa(s, b);
      }
      for (const m of s.trangBi.kho) bo.add(m.bo);
      return bo;
    };
    expect(rut(7).has('daTrach')).toBe(false);
    haBoss7(s);
    expect([...rut(7)]).toEqual(['daTrach']);
    expect([...rut(6)]).toEqual(['nuiNua']);
    for (const ch of CHUONG) expect(boRoi(s, 'giu', ch)).not.toContain('daTrach');
  });

  it('máy chủ nhận ở chương 5; hai món thêm tốc đánh, chỉ khi Triệu Quang Phục mặc', () => {
    const m = rutMon(3, 'daBoss', 5, ['daTrach'], [0, 0, 0, 100])!;
    expect(kiemMon(m, 5)).toBeNull();
    const hai = (['vuKhi', 'giap'] as const).map((o) => ({ ...m, o, chinh: o === 'vuKhi' ? 'danh' : 'mau' }) as typeof m);
    expect(tinhDo('trieuQuangPhuc', hai).toc - tinhDo('giong', hai).toc).toBeCloseTo(0.08, 6);
  });
});

// ---------- PR 3: Mai Thúc Loan (map 8 Núi Vệ) ----------

/** Hạ boss map 8 như trận thật báo về. */
function haBoss8(s: GameState): void {
  s.daNgoai.map = 8;
  s.daNgoai.cap = 80;
  datDoi(s, ['giong']);
  const b = moMap(s);
  b.da!.giet.push({ kind: 'duongTuHuc', cap: 82, khu: -1, boss: true, x: 0, z: 0 });
  capNhatDa(s, b);
}

/** Map 8, đội Mai Thúc Loan và Gióng, đứng giữa khu `k`. */
function tranMtl(s: GameState, k = 0): Battle {
  s.daNgoai.map = 8;
  s.daNgoai.tuDanh = false;
  const kh = boCuc(8).khu[k];
  s.daNgoai.cho = { x: kh.x, z: kh.z };
  expect(datDoi(s, ['maiThucLoan', 'giong']).ok).toBe(true);
  return moMap(s);
}

describe('Mai Thúc Loan về khi hạ boss map 8', () => {
  it('hạ Dương Tư Húc lần đầu thì về, kể truyện một lần; chỉ đánh ở dã ngoại', () => {
    const s = base();
    expect(tuongJoined(s, 'maiThucLoan')).toBe(false);
    haBoss8(s);
    expect(tuongJoined(s, 'maiThucLoan')).toBe(true);
    expect(tuongCo(s)).toContain('maiThucLoan');
    for (let id = pendingStory(s); id && id !== 'maiThucLoan'; id = pendingStory(s)) markStory(s, id);
    expect(pendingStory(s)).toBe('maiThucLoan');
    markStory(s, 'maiThucLoan');
    expect(pendingStory(s)).toBeNull();
    expect(generals(s)).not.toContain('maiThucLoan');
    for (const ch of CHUONG) expect(heroesFor(s, ch).map((h) => h.kind)).not.toContain('maiThucLoan');
    const sua = { ...makeSnapshot(s), heroes: [{ kind: 'maiThucLoan' as const, bamboo: false, glow: false, non: false }] };
    expect(validateSnapshot(sua)).not.toBeNull();
  });
});

describe('Hắc Đế dấy binh', () => {
  it('cả đội đánh mạnh hơn 30% trong 8 giây (đủ bộ Vạn An: 40%, 10 giây), hết giờ thì thôi', () => {
    const danh = (bo4: boolean) => {
      const s = base();
      haBoss8(s);
      const b = tranMtl(s);
      if (bo4) b.hero!.trangBi = { ...tinhDo('maiThucLoan', []), bo4: true };
      const giong = b.fighters.find((f) => f.kind === 'giong')!;
      const foe = b.fighters.find((f) => f.side === 'giac' && isAlive(f))!;
      foe.hp = foe.maxHp = 1e6;
      const don = () => {
        const truoc = foe.hp;
        strike(b, giong, foe);
        return truoc - foe.hp;
      };
      const thuong = don();
      expect(useSkill(b, 'hacDe')).toBe(true);
      const t = giong.hang!;
      const manh = don();
      giong.hang = 0;
      return { thuong, manh, t, het: don() };
    };
    const a = danh(false);
    expect(a.t).toBe(HAC_DE.t);
    expect(a.manh / a.thuong).toBeCloseTo(1.3, 6);
    expect(a.het).toBeCloseTo(a.thuong, 6);
    const d = danh(true);
    expect(d.t).toBe(10);
    expect(d.manh / d.thuong).toBeCloseTo(1.4, 6);
  });

  it('quái trong 3 ô quanh ông quay sang đuổi ông; quái xa hơn không đổi; hết giờ theo bước trận', () => {
    const s = base();
    haBoss8(s);
    const b = tranMtl(s);
    const mtl = b.fighters.find((f) => f.kind === 'maiThucLoan')!;
    const giong = b.fighters.find((f) => f.kind === 'giong')!;
    const quai = b.fighters.filter((f) => f.side === 'giac' && isAlive(f) && f.nha);
    // Đặt hai con sát ông đang đuổi Gióng, một con xa đang đứng chờ.
    const [a, c, xa] = quai;
    for (const [q, d] of [[a, 1.5], [c, 2.5]] as const) {
      q.x = mtl.x + d;
      q.z = mtl.z;
      q.nha!.trang = 'duoi';
      q.nha!.duoi = giong.id;
    }
    xa.x = mtl.x + 9;
    xa.z = mtl.z;
    xa.nha!.trang = 'cho';
    expect(useSkill(b, 'hacDe')).toBe(true);
    expect(a.nha!.duoi).toBe(mtl.id);
    expect(c.nha!.duoi).toBe(mtl.id);
    expect(xa.nha!.trang).toBe('cho');
    expect(b.events.some((e) => e.kind === 'hacDe')).toBe(true);
    for (let t = 0; t < HAC_DE.t + 0.2; t += 0.05) stepDa(b, 0.05);
    for (const f of b.fighters) if (f.side === 'ta') expect(f.hang ?? 0).toBe(0);
  });
});

describe('bộ Vạn An', () => {
  it('chỉ rơi ở map 8 sau khi Mai Thúc Loan về; máy chủ nhận ở chương 5; hai món thêm giáp khi ông mặc', () => {
    const s = base();
    const rut = () => {
      const bo = new Set<BoDo>();
      s.trangBi.kho.length = 0;
      s.daNgoai.map = 8;
      datDoi(s, ['giong']);
      for (let i = 0; i < 200; i++) {
        const b = moMap(s);
        b.da!.giet.push({ kind: 'teGiac', cap: 75, khu: 0, boss: false, x: 0, z: 0 });
        capNhatDa(s, b);
      }
      for (const m of s.trangBi.kho) bo.add(m.bo);
      return bo;
    };
    expect(rut().has('vanAn')).toBe(false);
    haBoss8(s);
    expect([...rut()]).toEqual(['vanAn']);
    for (const ch of CHUONG) expect(boRoi(s, 'giu', ch)).not.toContain('vanAn');
    const m = rutMon(5, 'daBoss', 5, ['vanAn'], [0, 0, 0, 100])!;
    expect(kiemMon(m, 5)).toBeNull();
    const hai = (['vuKhi', 'baoVat'] as const).map((o) => ({ ...m, o, chinh: o === 'vuKhi' ? 'danh' : 'uy' }) as typeof m);
    expect(tinhDo('maiThucLoan', hai).giap - tinhDo('giong', hai).giap).toBeCloseTo(0.08, 6);
  });
});
