// Canh Hồ Kim Quy: mở khi Rùa Vàng hiện lên (thắng màn 19), dựng một lần, móng 8×8; hồ còn nguyên thì lũy, thành đất,
// thành Cổ Loa, cổng thành thêm máu khi giặc đánh (`KIM_QUY_WALLS`), hồ hư thì thôi; Lạc hầu gợi ý một lần; mẫu Cổ Loa
// chừa chỗ hồ (mẫu Cổ Loa giữ sông từ Điện 6).

import { describe, expect, it } from 'vitest';
import { maxHpOf, startBattle, stepBattle } from './battle';
import { YEU_LAST } from './coLoa';
import { BUILDINGS, BUILD_MENU, CH3_QUEST_START, GIFT_IDS, KIM_QUY_WALLS, RAID_WARNING_MS } from './defs';
import {
  callRaidNow,
  canPlace,
  createInitialState,
  hasKimQuy,
  markHinted,
  nextHint,
  place,
  remove,
  tick,
  type GameState,
} from './game';
import { RIVER_START } from './map';
import { applyMau, mauSlots } from './mau';
import { floodToleranceOf } from './terrain';
import { DIEN, edge, setDien } from './testmap';

/** Kinh đô chương 3, Điện `level`, đã thắng tới màn `cleared`, của nhiều. */
function ch3(cleared = YEU_LAST, level = 7): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.questIndex = CH3_QUEST_START;
  s.campaign.cleared = cleared;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  s.dan = 60;
  // Đã qua chương 2: Sơn Tinh đủ lễ vật, mùa lũ đã tới.
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  for (const t of ['xuongMoc', 'langChai', 'congThanh'] as const) markHinted(s, t);
  return s;
}

/** Góc móng hồ: sát bìa đất phía rừng, xa Điện. */
const LAKE = (level = 7) => edge(level, 1);

/** Vòng thành Cổ Loa kín vuông góc quanh Điện, dựa vào hai bờ sông, cách móng Điện `d` ô về phía rừng. */
function ring(s: GameState, d: number): void {
  const at = DIEN - d;
  for (let z = at; z < RIVER_START; z++) expect(place(s, 'thanh', at, z).ok).toBe(true);
  for (let x = at + 1; x < RIVER_START; x++) expect(place(s, 'thanh', x, at).ok).toBe(true);
}

describe('Hồ Kim Quy', () => {
  it('móng 8×8, dựng một lần, không dỡ được, có trong bảng Xây dựng', () => {
    const def = BUILDINGS.hoKimQuy;
    expect([def.w, def.d, def.maxLevel]).toEqual([8, 8, 1]);
    expect(def.limit.every((n) => n === 1)).toBe(true);
    expect(BUILD_MENU).toContain('hoKimQuy');
    const s = ch3();
    const r = place(s, 'hoKimQuy', LAKE(), LAKE());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(canPlace(s, 'hoKimQuy', LAKE() + 10, LAKE()).ok).toBe(false);
    expect(remove(s, r.value.id).ok).toBe(false);
  });

  it('chỉ dựng được sau khi Rùa Vàng hiện lên (thắng màn 19 ở chương 3)', () => {
    const s = ch3(YEU_LAST - 1);
    expect(canPlace(s, 'hoKimQuy', LAKE(), LAKE())).toEqual({ ok: false, reason: 'canRuaVang' });
    s.campaign.cleared = YEU_LAST;
    expect(canPlace(s, 'hoKimQuy', LAKE(), LAKE()).ok).toBe(true);
    // Chưa vào chương 3 thì chưa có Rùa Vàng.
    s.questIndex = CH3_QUEST_START - 1;
    expect(canPlace(s, 'hoKimQuy', LAKE(), LAKE())).toEqual({ ok: false, reason: 'canRuaVang' });
  });

  it('Lạc hầu gợi ý một lần khi Rùa Vàng hiện lên', () => {
    const s = ch3(YEU_LAST - 1);
    // Nhà thợ hồ mở từ đầu nên Lạc hầu gợi ý trước (`xay.test.ts`).
    markHinted(s, 'thoHo');
    // Cống đê mở từ chương 2 nên Lạc hầu gợi ý cống trước (`phuSa.test.ts`).
    expect(nextHint(s)).toBe('congDe');
    markHinted(s, 'congDe');
    expect(nextHint(s)).toBeNull();
    s.campaign.cleared = YEU_LAST;
    expect(nextHint(s)).toBe('hoKimQuy');
    markHinted(s, 'hoKimQuy');
    expect(nextHint(s)).toBeNull();
  });

  it('hồ còn nguyên: lũy, thành đất, thành Cổ Loa, cổng thành thêm 30% máu; công trình khác giữ nguyên', () => {
    const s = ch3();
    const z = DIEN - 4;
    const luy = place(s, 'luy', DIEN, z);
    const datThanh = place(s, 'luy', DIEN + 1, z);
    const thanh = place(s, 'thanh', DIEN + 2, z);
    const cong = place(s, 'congThanh', DIEN + 3, z);
    const kho = place(s, 'kho', DIEN + 6, z - 3);
    if (!luy.ok || !datThanh.ok || !thanh.ok || !cong.ok || !kho.ok) throw new Error('đặt hỏng');
    datThanh.value.level = 2;
    const plain = startBattle(s, 1, 'tay');
    const blessed = startBattle(s, 1, 'tay', { walls: true });
    for (const b of [luy.value, datThanh.value, thanh.value, cong.value]) {
      expect(maxHpOf(blessed, b), b.type).toBeCloseTo(BUILDINGS[b.type].hp[b.level - 1] * (1 + KIM_QUY_WALLS));
      expect(maxHpOf(plain, b), b.type).toBe(BUILDINGS[b.type].hp[b.level - 1]);
    }
    expect(maxHpOf(blessed, kho.value)).toBe(BUILDINGS.kho.hp[0]);
    expect(KIM_QUY_WALLS).toBe(0.3);
  });

  it('giữ kinh đô: hồ còn nguyên thì trận có phúc của thần, hồ hư thì thôi', () => {
    const s = ch3();
    expect(place(s, 'doanhTrai', DIEN + 6, DIEN - 10).ok).toBe(true);
    const r = place(s, 'hoKimQuy', LAKE(), LAKE());
    if (!r.ok) throw new Error(r.reason);
    expect(hasKimQuy(s)).toBe(true);
    expect(callRaidNow(s)).toEqual({ ok: true, value: undefined });
    tick(s, RAID_WARNING_MS + 1000);
    expect(s.raid.battle?.walls).toBe(true);
    r.value.damaged = true;
    expect(hasKimQuy(s)).toBe(false);
  });

  it('yêu tinh phá thành chậm hơn khi có phúc của thần', () => {
    const wrecked = (walls: boolean) => {
      const s = ch3(YEU_LAST - 1);
      ring(s, 4);
      s.troops = { giao: 0, cung: 0, voi: 0, no: 0 };
      const battle = startBattle(s, 1, 'tay', { land: { foe: 'yeu', n: 2 }, walls });
      for (let i = 0; i < 900; i++) stepBattle(s, battle, 0.05);
      return battle.wrecked.length;
    };
    const plain = wrecked(false);
    expect(plain).toBeGreaterThan(0);
    expect(wrecked(true)).toBeLessThan(plain);
  });

  it('hồ không sợ nước lũ', () => {
    expect(floodToleranceOf('hoKimQuy')).toBeGreaterThanOrEqual(99);
  });

  it('mẫu Cổ Loa chừa chỗ hồ ngoài vòng thành ngoài từ Điện 5, mẫu Cổ Loa giữ sông từ Điện 6; áp mẫu thì dựng hồ khi đã mở', () => {
    const lakes = (id: 'phongChau' | 'deBao' | 'coLoa' | 'coLoaSong') => [5, 6, 7, 8, 9, 10].map((l) => mauSlots(id, l).filter((x) => x.type === 'hoKimQuy').length);
    expect(lakes('coLoa')).toEqual([1, 1, 1, 1, 1, 1]);
    expect(lakes('coLoaSong')).toEqual([0, 1, 1, 1, 1, 1]);
    expect(lakes('phongChau')).toEqual([0, 0, 0, 0, 0, 0]);
    const before = ch3(YEU_LAST - 1);
    expect(applyMau(before, 'coLoa').ok).toBe(true);
    expect(before.buildings.some((b) => b.type === 'hoKimQuy')).toBe(false);
    const s = ch3();
    expect(applyMau(s, 'coLoa').ok).toBe(true);
    const lake = s.buildings.find((b) => b.type === 'hoKimQuy');
    expect(lake).toBeDefined();
    expect(mauSlots('coLoa', 7).some((x) => x.type === 'hoKimQuy' && x.x === lake!.x && x.z === lake!.z)).toBe(true);
  });
});
