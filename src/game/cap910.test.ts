// Điện cấp 9, 10 sau truyện: mốc mở, giá, sản lượng, số tối đa, khoảnh, kho, nhiệm vụ, mẫu kinh đô, bản lưu.

import { describe, expect, it } from 'vitest';
import { BUILDINGS, CA_PER_MIN, CH4_QUEST_START, DIEN10_CHALLENGES, GUARD_CAP, QUESTS, STORAGE_CAP, TOWER, type BuildingType } from './defs';
import { canUpgrade, claimQuest, createInitialState, currentQuest, limitOf, place, questDone, storageCap, upgrade, type GameState } from './game';
import { khoanhQuota } from './khoanh';
import { MAU_IDS, mauSlots, planMau } from './mau';
import { HAU_QUEST_START } from './moPhong';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { edge, setDien } from './testmap';

/** Chín loại công trình lên được cấp 9, 10 cùng Điện. */
const NINE: BuildingType[] = ['ruong', 'ben', 'nhaSan', 'baiDa', 'loRen', 'kho', 'choiCanh', 'xuongMoc', 'langChai'];

/** Kinh đô đã hết truyện (vua ra biển Mộ Dạ), Điện cấp `level`, của nhiều. */
function capital(level: number): GameState {
  const s = createInitialState(0);
  s.questIndex = HAU_QUEST_START;
  s.adv.bien = true;
  s.campaign.cleared = 32;
  setDien(s, level);
  s.resources = { gao: 60000, voOc: 60000, datDa: 60000, sat: 60000, go: 60000 };
  s.dan = 40;
  return s;
}

describe('Điện cấp 9, 10', () => {
  it('Điện 9 mở khi hết truyện, Điện 10 khi đã thắng 16 thử thách, rồi hết cấp', () => {
    const s = capital(8);
    s.adv.bien = false;
    s.questIndex = CH4_QUEST_START;
    expect(canUpgrade(s, 1)).toEqual({ ok: false, reason: 'canHetTruyen' });
    s.adv.bien = true;
    expect(upgrade(s, 1).ok).toBe(true);
    expect(s.buildings[0].level).toBe(9);
    expect(DIEN10_CHALLENGES).toBe(16);
    s.thuThach.won = Array.from({ length: 15 }, (_, i) => i + 1);
    expect(canUpgrade(s, 1)).toEqual({ ok: false, reason: 'canThuThach' });
    s.thuThach.won.push(16);
    expect(upgrade(s, 1).ok).toBe(true);
    expect(s.buildings[0].level).toBe(10);
    expect(canUpgrade(s, 1)).toEqual({ ok: false, reason: 'capToiDa' });
  });

  it('số đã cân: giá Điện, kho, khoảnh, chỗ ở, quân giữ kinh đô', () => {
    expect(BUILDINGS.dien.upgradeCost[9]).toEqual({ gao: 14100, voOc: 12300, datDa: 11000, sat: 2400 });
    expect(BUILDINGS.dien.upgradeCost[10]).toEqual({ gao: 19200, voOc: 16800, datDa: 15200, sat: 3400 });
    expect(STORAGE_CAP.slice(7)).toEqual([32000, 44000, 60000]);
    expect([8, 9, 10].map(khoanhQuota)).toEqual([80, 88, 94]);
    expect(BUILDINGS.dien.housing!.slice(7)).toEqual([11, 12, 13]);
    expect(GUARD_CAP.slice(7)).toEqual([56, 62, 68]);
    const s = capital(10);
    expect(storageCap(s)).toBe(60000);
    // Đất mẫu vẫn vừa: lượt phát của Điện 9 đủ phủ khung 45×45 (81 khoảnh) của mẫu.
    expect(khoanhQuota(9)).toBeGreaterThanOrEqual(81);
  });

  it('chín loại lên cấp 9 khi Điện 9, cấp 10 khi Điện 10; thêm ruộng, nhà sàn, chòi canh', () => {
    for (const t of NINE) {
      const def = BUILDINGS[t];
      expect(def.maxLevel, t).toBe(10);
      expect(def.upgradeCost.length, t).toBe(11);
      expect(def.production.length, t).toBe(10);
      expect(def.hp.length, t).toBe(10);
      // Mỗi cấp mới đắt hơn và bền hơn cấp trước.
      for (const lv of [9, 10]) {
        const now = def.upgradeCost[lv];
        const before = def.upgradeCost[lv - 1];
        for (const r of Object.keys(now) as (keyof typeof now)[]) expect(now[r]!, `${t} ${lv} ${r}`).toBeGreaterThan(before[r] ?? 0);
        expect(def.hp[lv - 1], t).toBeGreaterThan(def.hp[lv - 2]);
      }
    }
    expect(BUILDINGS.ruong.production.slice(7)).toEqual([{ gao: 260 }, { gao: 320 }, { gao: 390 }]);
    expect(BUILDINGS.ben.production.slice(7)).toEqual([{ voOc: 260 }, { voOc: 385 }, { voOc: 470 }]);
    expect(BUILDINGS.xuongMoc.production.slice(7)).toEqual([{ go: 118 }, { go: 144 }, { go: 176 }]);
    expect(CA_PER_MIN.slice(7)).toEqual([68, 83, 101]);
    expect(TOWER.dmg.slice(7)).toEqual([37, 44, 52]);
    expect(BUILDINGS.kho.storage!.slice(7)).toEqual([13000, 17000, 22000]);
    expect(BUILDINGS.nhaSan.housing!.slice(7)).toEqual([18, 20, 22]);
    for (const [t, lim] of [
      ['ruong', [8, 9, 10]],
      ['nhaSan', [7, 8, 9]],
      ['choiCanh', [7, 8, 9]],
      ['ben', [5, 5, 5]],
      ['luy', [180, 190, 200]],
      ['thanh', [240, 250, 260]],
    ] as const) {
      expect(BUILDINGS[t].limit.slice(7), t).toEqual(lim);
    }

    const s = capital(8);
    const ruong = place(s, 'ruong', edge(8, 1), edge(8, 1));
    if (!ruong.ok) throw new Error(ruong.reason);
    ruong.value.level = 8;
    expect(canUpgrade(s, ruong.value.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 9);
    expect(limitOf(s, 'ruong')).toBe(9);
    expect(upgrade(s, ruong.value.id).ok).toBe(true);
    expect(canUpgrade(s, ruong.value.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 10);
    expect(upgrade(s, ruong.value.id).ok).toBe(true);
    expect(ruong.value.level).toBe(10);
    expect(canUpgrade(s, ruong.value.id)).toEqual({ ok: false, reason: 'capToiDa' });
  });

  it('nhiệm vụ sau truyện: lên Điện 9, một công trình cấp 9, lên Điện 10, một công trình cấp 10', () => {
    expect(QUESTS.slice(HAU_QUEST_START).map((q) => q.id)).toEqual(['dien9', 'cap9', 'dien10', 'cap10']);
    expect(QUESTS[HAU_QUEST_START - 1].id).toBe('denCuong');
    const s = capital(9);
    expect(currentQuest(s)?.id).toBe('dien9');
    expect(questDone(s)).toBe(true);
    claimQuest(s);
    expect(currentQuest(s)?.id).toBe('cap9');
    expect(questDone(s)).toBe(false);
    const kho = place(s, 'kho', edge(9, 1), edge(9, 1));
    if (!kho.ok) throw new Error(kho.reason);
    kho.value.level = 9;
    expect(questDone(s)).toBe(true);
  });

  it('mẫu kinh đô dựng được ở Điện 9, 10, đủ số tối đa mới', () => {
    for (const id of MAU_IDS) {
      for (const lv of [9, 10]) {
        const slots = mauSlots(id, lv);
        expect(slots.filter((x) => x.type === 'ruong').length, `${id} Điện ${lv}`).toBe(BUILDINGS.ruong.limit[lv - 1]);
        expect(slots.filter((x) => x.type === 'choiCanh').length, `${id} Điện ${lv}`).toBe(BUILDINGS.choiCanh.limit[lv - 1]);
      }
    }
    const s = capital(10);
    expect(planMau(s, 'coLoaSong').stuck).toEqual([]);
  });

  it('bản lưu 17 lên 18 giữ nguyên; Điện 10 lưu rồi mở lại được', () => {
    const s = capital(10);
    expect(SAVE_VERSION).toBe(18);
    const back = deserialize(serialize(s))!;
    expect(back.buildings[0].level).toBe(10);
    const old = JSON.parse(serialize(capital(8))) as Record<string, unknown>;
    old.version = 17;
    const up = deserialize(JSON.stringify(old))!;
    expect(up.version).toBe(18);
    expect(up.buildings[0].level).toBe(8);
  });
});
