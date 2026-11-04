// Điện cấp 9, 10 sau truyện: mốc mở, giá, sản lượng, số tối đa, kho, nhiệm vụ, mẫu kinh đô, bản lưu; lầu nỏ lên cấp 2,
// 3 và rèn binh khí bậc 3.

import { describe, expect, it } from 'vitest';
import { startBattle, startFieldBattle, stepBattle } from './battle';
import { canForgeArms, forgeArms } from './binhKhi';
import { mergeTowers } from './chuong4';
import {
  ARMS,
  ARMS_BONUS,
  BUILDINGS,
  CA_PER_MIN,
  CH4_QUEST_START,
  DEFAULT_ROWS,
  DIEN10_CHALLENGES,
  FIELD,
  GUARD_CAP,
  LAU_NO,
  QUESTS,
  STORAGE_CAP,
  TOWER,
  UNITS,
  type BuildingType,
} from './defs';
import { canUpgrade, claimQuest, createInitialState, currentQuest, limitOf, place, questDone, storageCap, upgrade, type Building, type GameState } from './game';
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

  it('số đã cân: giá Điện, kho, chỗ ở, quân giữ kinh đô', () => {
    expect(BUILDINGS.dien.upgradeCost[9]).toEqual({ gao: 14100, voOc: 12300, datDa: 11000, sat: 2400 });
    expect(BUILDINGS.dien.upgradeCost[10]).toEqual({ gao: 19200, voOc: 16800, datDa: 15200, sat: 3400 });
    expect(STORAGE_CAP.slice(7)).toEqual([32000, 44000, 60000]);
    expect(BUILDINGS.dien.housing!.slice(7)).toEqual([11, 12, 13]);
    expect(GUARD_CAP.slice(7)).toEqual([56, 62, 68]);
    const s = capital(10);
    expect(storageCap(s)).toBe(60000);
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

  it('bản lưu 18 lên 19 giữ nguyên; Điện 10 lưu rồi mở lại được', () => {
    const s = capital(10);
    expect(SAVE_VERSION).toBe(19);
    const back = deserialize(serialize(s))!;
    expect(back.buildings[0].level).toBe(10);
    const old = JSON.parse(serialize(capital(8))) as Record<string, unknown>;
    old.version = 18;
    const up = deserialize(JSON.stringify(old))!;
    expect(up.version).toBe(19);
    expect(up.buildings[0].level).toBe(8);
  });
});

/** Dựng chòi canh ở (x, z) rồi đặt thẳng lên cấp `level`. */
function tower(s: GameState, x: number, z: number, level: number): Building {
  const r = place(s, 'choiCanh', x, z);
  if (!r.ok) throw new Error(r.reason);
  r.value.level = level;
  return r.value;
}

describe('lầu nỏ lên cấp 2, 3', () => {
  it('cấp 2 cần Điện 9, cấp 3 cần Điện 10, giá và máu theo cấp, rồi hết cấp', () => {
    expect(BUILDINGS.lauNo.maxLevel).toBe(3);
    expect(BUILDINGS.lauNo.upgradeCost[2]).toEqual({ voOc: 3200, datDa: 3200, sat: 800 });
    expect(BUILDINGS.lauNo.upgradeCost[3]).toEqual({ voOc: 5000, datDa: 5000, sat: 1300 });
    expect(BUILDINGS.lauNo.hp).toEqual([1400, 1540, 1700]);
    expect(LAU_NO.dmg).toEqual([34, 41, 49]);
    const s = capital(8);
    const a = tower(s, edge(8, 1), edge(8, 3), 8);
    const b = tower(s, edge(8, 3), edge(8, 3), 8);
    const lau = mergeTowers(s, a.id, b.id);
    if (!lau.ok) throw new Error(lau.reason);
    expect(lau.value.level).toBe(1);
    expect(canUpgrade(s, a.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 9);
    const before = { ...s.resources };
    expect(upgrade(s, a.id).ok).toBe(true);
    expect(lau.value.level).toBe(2);
    expect(s.resources.sat).toBe(before.sat - 800);
    expect(canUpgrade(s, a.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 10);
    expect(upgrade(s, a.id).ok).toBe(true);
    expect(lau.value.level).toBe(3);
    expect(canUpgrade(s, a.id)).toEqual({ ok: false, reason: 'capToiDa' });
  });

  it('ghép hai chòi canh đã lên cấp 9, 10 thì lầu nỏ ra ngay cấp 2, 3, theo chòi thấp hơn', () => {
    const s = capital(10);
    const pair = (la: number, lb: number, x: number) => {
      const a = tower(s, x, edge(10, 3), la);
      const b = tower(s, x + 2, edge(10, 3), lb);
      const r = mergeTowers(s, a.id, b.id);
      if (!r.ok) throw new Error(r.reason);
      return r.value.level;
    };
    expect(pair(9, 10, edge(10, 1))).toBe(2);
    expect(pair(10, 10, edge(10, 5))).toBe(3);
    expect(pair(8, 10, edge(10, 9))).toBe(1);
  });

  it('lầu nỏ cấp 3 mỗi phát bắn ba giặc, mỗi mũi sát thương theo cấp', () => {
    const s = capital(10);
    const x = edge(10, 4);
    const z = edge(10, 4);
    const a = tower(s, x, z, 10);
    const b = tower(s, x + 2, z, 10);
    mergeTowers(s, a.id, b.id);
    const battle = startBattle(s, 4, 'bac');
    const foes = battle.fighters.filter((f) => f.side === 'giac').slice(0, 4);
    expect(foes.length).toBe(4);
    foes.forEach((f, i) => {
      f.x = x + 0.5 + 1 + i * 0.3;
      f.z = z + 0.5;
      f.state = 'move';
      f.cd = 99;
    });
    for (const f of battle.fighters) if (f.side === 'giac' && !foes.includes(f)) f.state = 'gone';
    // Chỉ lầu nỏ bắn: lính ta đứng ngoài trận.
    for (const f of battle.fighters) if (f.side === 'ta') f.state = 'gone';
    const hp = foes.map((f) => f.hp);
    stepBattle(s, battle, 0.01);
    const lost = foes.map((f, i) => hp[i] - f.hp);
    expect(lost.slice(0, 3).every((d) => Math.abs(d - LAU_NO.dmg[2]) < 1e-6), String(lost)).toBe(true);
    expect(lost[3]).toBe(0);
  });
});

describe('rèn binh khí bậc 3', () => {
  it('bậc 3 cần lò rèn cấp 9 (sau truyện), giá cao hơn bậc 2, rồi hết bậc', () => {
    expect(ARMS.length).toBe(3);
    expect(ARMS[2]).toEqual({ cost: { sat: 2000, voOc: 2000 }, forgeLevel: 9 });
    const s = capital(9);
    const lo = place(s, 'loRen', edge(9, 1), edge(9, 10));
    if (!lo.ok) throw new Error(lo.reason);
    lo.value.level = 8;
    s.arms.no = 2;
    expect(canForgeArms(s, 'no')).toEqual({ ok: false, reason: 'canLoRen' });
    lo.value.level = 9;
    const sat = s.resources.sat;
    expect(forgeArms(s, 'no')).toEqual({ ok: true, value: 3 });
    expect(s.resources.sat).toBe(sat - 2000);
    expect(canForgeArms(s, 'no')).toEqual({ ok: false, reason: 'capToiDa' });
    // Lưu rồi nạp lại giữ bậc 3.
    expect(deserialize(serialize(s))!.arms.no).toBe(3);
  });

  it('bậc 3 thêm 30% máu cho binh chủng ấy', () => {
    const setup = { id: 1, stage: 9, enemies: { tomBinh: 1 }, hpScale: 1, army: { giao: 1, cung: 1, voi: 0, no: 0 }, rows: DEFAULT_ROWS };
    const armed = startFieldBattle({ ...setup, arms: { giao: 3, cung: 0, voi: 0, no: 0 } });
    const giao = armed.fighters.find((f) => f.kind === 'giao')!;
    expect(giao.maxHp).toBeCloseTo(UNITS.giao.hp * FIELD.hpMul * (1 + 3 * ARMS_BONUS), 5);
  });
});
