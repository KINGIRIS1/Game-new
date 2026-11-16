// Canh tướng dã ngoại (docs/thiet-ke.md mục Kế hoạch: năm tướng mới), PR 1 là Bà Triệu: về khi hạ boss map 6 lần
// đầu (một lần, kể cả bản lưu cũ đã hạ boss), chọn được vào đội dã ngoại, chỉ đánh ở dã ngoại (không doanh, không ra
// phó bản, không giữ thành trong Đấu thành), đứng chầu trong sân; Chém cá kình nhắm kẻ nhiều máu nhất, đủ bốn món bộ
// Núi Nưa thì mạnh hơn và choáng; bộ Núi Nưa chỉ rơi ở map 6 khi Bà đã về, máy chủ nhận ở chương 5.

import { describe, expect, it } from 'vitest';
import { HERO_KINDS, isAlive, useSkill, type Battle } from './battle';
import { BO_DO, CA_KINH, DA_BOSS_MS, DOANH_MAX, GIFT_IDS, ROI_DO, type BoDo, type Chapter } from './defs';
import { capNhatDa, datDoi, moMap, tuongCo } from './daNgoai';
import { boCuc } from './daNgoaiMap';
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
