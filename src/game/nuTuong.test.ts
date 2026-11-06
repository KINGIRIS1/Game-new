// Canh chương 5 PR 4: bốn nữ tướng theo về theo mốc màn; đi theo làm phó tướng ở phó bản (cả thử thách), đứng cầm cờ
// sau hàng hậu, không đánh; ở kinh đô mỗi doanh trại một nữ tướng; binh chủng của nữ tướng được thêm 12% máu và sức
// đánh; Lạc hầu báo một lần khi mỗi người theo về; bản lưu 24.

import { describe, expect, it } from 'vitest';
import { startBattle, stepField, type Battle } from './battle';
import { startStage } from './campaign';
import { CH5_LAST, MA_VIEN_AT } from './chuong5';
import { BUILDINGS, CH5_QUEST_START, DEFAULT_ROWS, GIFT_IDS, NU_TUONG, NU_TUONG_BONUS, NU_TUONG_IDS, type NuTuongId } from './defs';
import { barracksList, guardPlan } from './doanhTrai';
import { createInitialState, place, type GameState } from './game';
import { assignNu, canAssignNu, markNuHinted, nextNuHint, nuJoined, nuOf, nuPostOf, nuPosts, nuTuongList, phoTuongOf } from './nuTuong';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { markStory } from './story';
import { SAMPLE_ARMY4 } from './testkit';
import { DIEN_END, setDien } from './testmap';

/** Kinh đô ở chương 5, Điện 9, một doanh trại cấp 5, đã thắng tới màn `cleared`. */
function ch5(cleared = 34): GameState {
  const s = createInitialState(0);
  setDien(s, 9);
  s.resources = { gao: 60000, voOc: 60000, datDa: 60000, sat: 60000, go: 60000 };
  s.dan = 40;
  s.questIndex = CH5_QUEST_START;
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: true, restUntil: 0, ascended: true };
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  s.son.non = true;
  s.son.won = true;
  s.adv = { no: true, restUntil: 0, kimQuy: true, won: true, layTrao: true, bien: true };
  s.caoLo.lenhBan = true;
  s.campaign.cleared = cleared;
  const barracks = place(s, 'doanhTrai', DIEN_END + 1, DIEN_END + 1);
  if (!barracks.ok) throw new Error(barracks.reason);
  barracks.value.level = 5;
  s.troops = { ...SAMPLE_ARMY4 };
  for (const id of ['mo', 'suGia', 'benKia', 'vuonVai', 'roiGay', 'ketChuong', 'langLieu', 'kenRe', 'ruocDau', 'doiNon', 'ketChuong2', 'cotDa', 'dietYeu', 'noThan', 'kimQuy', 'ketChuong3', 'cauHon', 'caoLoCamQuan', 'layNo', 'longNgong', 'ngocTrai', 'hetTruyen', 'meLinh', 'hatMon', 'trungVuong'] as const) {
    markStory(s, id);
  }
  return s;
}

/** Thêm một doanh trại cấp 5 cạnh doanh trại đầu. */
function secondBarracks(s: GameState) {
  const r = place(s, 'doanhTrai', DIEN_END + 2 + BUILDINGS.doanhTrai.w, DIEN_END + 1);
  if (!r.ok) throw new Error(r.reason);
  r.value.level = 5;
  return r.value;
}

const ours = (b: Battle, kind: string) => b.fighters.filter((f) => f.side === 'ta' && f.kind === kind);

describe('bốn nữ tướng theo về', () => {
  it('Lê Chân thắng màn 34 (lính nỏ), Thánh Thiên màn 35 (cung thủ), Bát Nàn màn 37 (giáo binh), Phùng Thị Chính màn 39 (voi chiến)', () => {
    expect(NU_TUONG).toEqual({
      leChan: { stage: 34, unit: 'no' },
      thanhThien: { stage: 35, unit: 'cung' },
      batNan: { stage: 37, unit: 'giao' },
      phungThiChinh: { stage: 39, unit: 'voi' },
    });
    expect(NU_TUONG_BONUS).toBe(0.12);
    const s = ch5(33);
    expect(nuTuongList(s)).toEqual([]);
    for (const [cleared, list] of [
      [34, ['leChan']],
      [35, ['leChan', 'thanhThien']],
      [37, ['leChan', 'thanhThien', 'batNan']],
      [MA_VIEN_AT + 2, NU_TUONG_IDS],
      [CH5_LAST, NU_TUONG_IDS],
    ] as const) {
      s.campaign.cleared = cleared;
      expect(nuTuongList(s), String(cleared)).toEqual(list);
    }
  });

  it('Lạc hầu báo một lần khi mỗi nữ tướng theo về', () => {
    const s = ch5(33);
    expect(nextNuHint(s)).toBe(null);
    s.campaign.cleared = 35;
    expect(nextNuHint(s)).toBe('leChan');
    markNuHinted(s, 'leChan');
    expect(nextNuHint(s)).toBe('thanhThien');
    markNuHinted(s, 'thanhThien');
    markNuHinted(s, 'thanhThien');
    expect(nextNuHint(s)).toBe(null);
    expect(s.hinted.filter((h) => h.startsWith('nu:'))).toEqual(['nu:leChan', 'nu:thanhThien']);
    s.campaign.cleared = 37;
    expect(nextNuHint(s)).toBe('batNan');
  });
});

describe('phó tướng ở phó bản', () => {
  it('binh chủng của phó tướng thêm 12% máu và sức đánh, binh chủng khác như cũ; nữ tướng không phải người đánh', () => {
    const s = ch5(34);
    expect(startStage(s, 34, { ...s.troops }, DEFAULT_ROWS, false, undefined, null).ok).toBe(true);
    const base = s.campaign.battle!;
    expect(base.nuTuong).toBeUndefined();
    s.campaign.battle = null;
    expect(startStage(s, 34, { ...s.troops }, DEFAULT_ROWS, false, undefined, 'leChan').ok).toBe(true);
    const up = s.campaign.battle!;
    expect(up.nuTuong?.kind).toBe('leChan');
    const mult = 1 + base.bonus + NU_TUONG_BONUS;
    expect(ours(up, 'no')[0].maxHp / ours(base, 'no')[0].maxHp).toBeCloseTo(mult / (1 + base.bonus), 5);
    expect(ours(up, 'no').every((f) => f.nu)).toBe(true);
    for (const k of ['giao', 'cung', 'voi', 'trungTrac']) {
      expect(ours(up, k)[0].maxHp, k).toBe(ours(base, k)[0].maxHp);
      expect(ours(up, k).some((f) => f.nu), k).toBe(false);
    }
    // Nữ tướng không có trong danh sách người đánh, nên giặc không nhắm được.
    expect(up.fighters.length).toBe(base.fighters.length);
  });

  it('đứng cầm cờ sau hàng hậu, đi theo khi quân ta tiến lên, không ra khỏi bãi', () => {
    const s = ch5(39);
    expect(startStage(s, 37, { ...s.troops }, DEFAULT_ROWS, false, undefined, 'phungThiChinh').ok).toBe(true);
    const b = s.campaign.battle!;
    const rear = () => Math.max(...b.fighters.filter((f) => f.side === 'ta' && f.state !== 'dead' && f.state !== 'gone').map((f) => f.z));
    const z0 = b.nuTuong!.z;
    expect(z0).toBeGreaterThan(rear());
    for (let i = 0; i < 20 * 15; i++) stepField(b, 0.05);
    expect(b.nuTuong!.z).toBeLessThan(z0);
    expect(b.nuTuong!.z).toBeGreaterThan(rear() - 0.5);
    expect(b.nuTuong!.x).toBeGreaterThan(0);
  });

  it('nhớ phó tướng đã chọn cho lần sau; null là không mang ai; chưa theo về thì không chọn được', () => {
    const s = ch5(35);
    expect(phoTuongOf(s)).toBe(null);
    expect(startStage(s, 35, { ...s.troops }, DEFAULT_ROWS, false, undefined, 'batNan')).toEqual({ ok: false, reason: 'tuongChuaCo' });
    expect(startStage(s, 35, { ...s.troops }, DEFAULT_ROWS, false, undefined, 'thanhThien').ok).toBe(true);
    expect(s.campaign.phoTuong).toBe('thanhThien');
    s.campaign.battle = null;
    // Không ghi phó tướng thì mang người chọn lần trước.
    expect(startStage(s, 35, { ...s.troops }, DEFAULT_ROWS).ok).toBe(true);
    expect(s.campaign.battle!.nuTuong?.kind).toBe('thanhThien');
    s.campaign.battle = null;
    expect(startStage(s, 35, { ...s.troops }, DEFAULT_ROWS, false, undefined, null).ok).toBe(true);
    expect(s.campaign.battle!.nuTuong).toBeUndefined();
    expect(s.campaign.phoTuong).toBeUndefined();
  });

  it('đi theo cả ở thử thách, kể cả Không tướng (nữ tướng không đánh), và khi đánh lại màn chương trước', () => {
    const s = ch5(CH5_LAST);
    expect(startStage(s, 33, { ...s.troops }, DEFAULT_ROWS, true, undefined, 'batNan').ok).toBe(true);
    expect(s.campaign.battle!.challenge).toBe('khongTuong');
    expect(s.campaign.battle!.hero).toBe(null);
    expect(s.campaign.battle!.nuTuong?.kind).toBe('batNan');
    s.campaign.battle = null;
    expect(startStage(s, 12, { ...s.troops }, DEFAULT_ROWS, false, undefined, 'phungThiChinh').ok).toBe(true);
    expect(ours(s.campaign.battle!, 'voi').every((f) => f.nu)).toBe(true);
  });
});

describe('nữ tướng ở doanh trại khi giữ kinh đô', () => {
  it('nữ tướng rảnh về doanh trại theo thứ tự dựng; giao lại thì hai người đổi chỗ', () => {
    const s = ch5(35);
    const [a] = barracksList(s);
    const b = secondBarracks(s);
    expect([...nuPosts(s)]).toEqual([
      [a.id, 'leChan'],
      [b.id, 'thanhThien'],
    ]);
    expect(canAssignNu(s, a.id, 'leChan')).toEqual({ ok: false, reason: 'nuDaO' });
    expect(canAssignNu(s, a.id, 'batNan')).toEqual({ ok: false, reason: 'tuongChuaCo' });
    expect(assignNu(s, a.id, 'thanhThien')).toEqual({ ok: true, value: 'thanhThien' });
    expect(nuOf(s, a)).toBe('thanhThien');
    expect(nuOf(s, b)).toBe('leChan');
    expect([a.nuTuong, b.nuTuong]).toEqual(['thanhThien', 'leChan']);
    // Người mới theo về chưa có trại trống thì chưa ở đâu.
    s.campaign.cleared = 37;
    expect(nuPostOf(s, 'batNan')).toBeUndefined();
    expect(assignNu(s, b.id, 'batNan').ok).toBe(true);
    expect(nuPostOf(s, 'leChan')).toBeUndefined();
    expect(nuOf(s, b)).toBe('batNan');
  });

  it('lính giữ kinh đô của trại có nữ tướng, đúng binh chủng của người ấy, thêm 12% máu; trại khác như cũ', () => {
    const s = ch5(34);
    const [a] = barracksList(s);
    const b = secondBarracks(s);
    expect(nuOf(s, a)).toBe('leChan');
    const plan = guardPlan(s);
    expect(plan.get(a.id)!.no).toBeGreaterThan(0);
    expect(plan.get(b.id)!.no).toBeGreaterThan(0);
    const battle = startBattle(s, 1, 'bac');
    const inside = (f: { x: number; z: number }, h: typeof a) => f.x >= h.x && f.x <= h.x + BUILDINGS.doanhTrai.w && f.z >= h.z && f.z <= h.z + BUILDINGS.doanhTrai.d;
    const no = ours(battle, 'no');
    const boosted = no.filter((f) => f.nu);
    expect(boosted.length).toBe(plan.get(a.id)!.no);
    expect(boosted.every((f) => inside(f, a))).toBe(true);
    const plain = no.filter((f) => !f.nu);
    expect(plain.length).toBe(plan.get(b.id)!.no);
    expect(boosted[0].maxHp / plain[0].maxHp).toBeCloseTo(1 + NU_TUONG_BONUS, 5);
    expect(ours(battle, 'giao').some((f) => f.nu)).toBe(false);
  });
});

describe('bản lưu 24', () => {
  it('lưu rồi đọc lại giữ nữ tướng ở doanh trại và phó tướng đã chọn', () => {
    const s = ch5(MA_VIEN_AT + 2);
    const [a] = barracksList(s);
    assignNu(s, a.id, 'phungThiChinh');
    s.campaign.phoTuong = 'batNan';
    const back = deserialize(serialize(s))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(24);
    expect(back.buildings.find((b) => b.id === a.id)!.nuTuong).toBe('phungThiChinh');
    expect(back.campaign.phoTuong).toBe('batNan');
    expect(nuJoined(back, 'phungThiChinh')).toBe(true);
  });

  it('nâng bản lưu 23 lên 24: đã qua màn 34 thì có ngay Lê Chân', () => {
    const raw = JSON.parse(serialize(ch5(34)));
    raw.version = 23;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(nuTuongList(back)).toEqual(['leChan']);
    expect(phoTuongOf(back)).toBe(null);
  });

  it('nữ tướng lạ, hay nữ tướng ở công trình không phải doanh trại thì không nạp', () => {
    const s = ch5(34);
    for (const bad of [
      (r: any) => (r.campaign.phoTuong = 'trungTrac'),
      (r: any) => (r.buildings.find((b: any) => b.type === 'doanhTrai').nuTuong = 'abc'),
      (r: any) => (r.buildings.find((b: any) => b.type === 'dien').nuTuong = 'leChan' as NuTuongId),
    ]) {
      const raw = JSON.parse(serialize(s));
      bad(raw);
      expect(deserialize(JSON.stringify(raw))).toBeUndefined();
    }
  });
});
