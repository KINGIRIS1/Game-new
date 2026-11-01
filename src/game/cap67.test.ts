import { describe, expect, it } from 'vitest';
import { startFieldBattle, stepField } from './battle';
import { canForgeArms, forgeArms } from './binhKhi';
import { ARMS, ARMS_BONUS, BUILDINGS, CH2_QUEST_START, CH3_QUEST_START, DEFAULT_ROWS, FIELD, STORAGE_CAP, UNITS } from './defs';
import { canUpgrade, createInitialState, limitOf, place, storageCap, upgrade, type GameState } from './game';
import { KHOANH_QUOTA } from './defs';
import { khoanhQuota } from './khoanh';
import { edge, setDien } from './testmap';
import { SAVE_VERSION, deserialize, serialize } from './save';

/** Kinh đô Điện cấp 5, đủ của để nâng. */
function rich(questIndex = 0): GameState {
  const s = createInitialState(0);
  setDien(s, 5);
  s.resources = { gao: 20000, voOc: 20000, datDa: 20000, sat: 20000 };
  s.questIndex = questIndex;
  return s;
}

describe('Điện và công trình cấp 6–7', () => {
  it('Điện lên cấp 6 khi đã vào chương 2, lên cấp 7 khi đã vào chương 3', () => {
    const s = rich(CH2_QUEST_START - 1);
    expect(canUpgrade(s, 1)).toEqual({ ok: false, reason: 'canChuong2' });
    s.questIndex = CH2_QUEST_START;
    expect(upgrade(s, 1).ok).toBe(true);
    expect(s.buildings[0].level).toBe(6);
    expect(canUpgrade(s, 1)).toEqual({ ok: false, reason: 'canChuong3' });
    s.questIndex = CH3_QUEST_START;
    expect(upgrade(s, 1).ok).toBe(true);
    expect(s.buildings[0].level).toBe(7);
    // Cấp 8 mở ở chương 4 (cap8.test.ts).
    expect(canUpgrade(s, 1)).toEqual({ ok: false, reason: 'canChuong4' });
  });

  it('Điện cấp 6, 7 được phát tới 60, 72 khoảnh đất; kho chứa nhiều hơn', () => {
    expect(KHOANH_QUOTA.slice(5, 7)).toEqual([60, 72]);
    expect(khoanhQuota(7)).toBeGreaterThan(khoanhQuota(6));
    const s = rich(CH3_QUEST_START);
    setDien(s, 7);
    expect(storageCap(s)).toBe(STORAGE_CAP[6]);
  });

  it('công trình lên cấp 6, 7 khi Điện đã lên tới; mỗi cấp Điện mới cho dựng thêm', () => {
    const s = rich(CH3_QUEST_START);
    const ruong = place(s, 'ruong', edge(5, 1), edge(5, 1));
    if (!ruong.ok) throw new Error(ruong.reason);
    ruong.value.level = 5;
    expect(canUpgrade(s, ruong.value.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 6);
    expect(upgrade(s, ruong.value.id).ok).toBe(true);
    setDien(s, 7);
    expect(upgrade(s, ruong.value.id).ok).toBe(true);
    expect(ruong.value.level).toBe(7);
    expect(limitOf(s, 'ruong')).toBe(8);
    expect(BUILDINGS.doanhTrai.maxLevel).toBe(5);
    // Mọi mảng theo cấp Điện đủ 8 phần (cấp 8 từ chương 4), mọi mảng theo cấp công trình đủ số cấp.
    for (const def of Object.values(BUILDINGS)) {
      expect(def.limit.length).toBe(8);
      expect(def.hp.length).toBe(def.maxLevel);
      expect(def.production.length).toBe(def.maxLevel);
      expect(def.upgradeCost.length).toBe(def.maxLevel + 1);
    }
  });
});

describe('rèn binh khí', () => {
  /** Kinh đô có lò rèn ở cấp `level`. */
  function withForge(level: number): GameState {
    const s = rich(CH3_QUEST_START);
    setDien(s, 7);
    const r = place(s, 'loRen', edge(7, 1), edge(7, 10));
    if (!r.ok) throw new Error(r.reason);
    r.value.level = level;
    return s;
  }

  it('bậc 1 cần lò rèn cấp 6, bậc 2 cần lò rèn cấp 7; rèn đủ thì thôi', () => {
    const s = withForge(5);
    expect(canForgeArms(s, 'giao')).toEqual({ ok: false, reason: 'canLoRen' });
    s.buildings.find((b) => b.type === 'loRen')!.level = 6;
    const sat = s.resources.sat;
    expect(forgeArms(s, 'giao')).toEqual({ ok: true, value: 1 });
    expect(s.resources.sat).toBe(sat - ARMS[0].cost.sat!);
    expect(canForgeArms(s, 'giao')).toEqual({ ok: false, reason: 'canLoRen' });
    s.buildings.find((b) => b.type === 'loRen')!.level = 7;
    expect(forgeArms(s, 'giao')).toEqual({ ok: true, value: 2 });
    expect(canForgeArms(s, 'giao')).toEqual({ ok: false, reason: 'capToiDa' });
    expect(s.arms).toEqual({ giao: 2, cung: 0, voi: 0 });
    // Lò rèn hư thì không rèn được.
    s.buildings.find((b) => b.type === 'loRen')!.damaged = true;
    expect(canForgeArms(s, 'cung')).toEqual({ ok: false, reason: 'canLoRen' });
  });

  it('binh khí đã rèn thêm máu và sức đánh cho đúng binh chủng ấy', () => {
    const setup = { id: 1, stage: 9, enemies: { tomBinh: 1 }, hpScale: 1, army: { giao: 1, cung: 1, voi: 0 }, rows: DEFAULT_ROWS };
    const plain = startFieldBattle(setup);
    const armed = startFieldBattle({ ...setup, arms: { giao: 2, cung: 0, voi: 0 } });
    const hp = (b: typeof plain, k: string) => b.fighters.find((f) => f.kind === k)!.maxHp;
    expect(hp(armed, 'giao')).toBeCloseTo(UNITS.giao.hp * FIELD.hpMul * (1 + 2 * ARMS_BONUS), 5);
    expect(hp(armed, 'cung')).toBeCloseTo(hp(plain, 'cung'), 5);
    // Giáo binh đứng sát tôm binh và đánh một đòn.
    const hit = (b: typeof plain) => {
      const giao = b.fighters.find((f) => f.kind === 'giao')!;
      const foe = b.fighters.find((f) => f.side === 'giac')!;
      for (const f of b.fighters) if (f !== giao && f !== foe) f.state = 'gone';
      foe.x = giao.x;
      foe.z = giao.z - 0.5;
      foe.cd = 99;
      giao.cd = 0;
      stepField(b, 0.01);
      return foe.maxHp - foe.hp;
    };
    expect(hit(armed)).toBeCloseTo(hit(plain) * (1 + 2 * ARMS_BONUS), 5);
  });

  it('lưu và nạp lại giữ bậc rèn; bản lưu chương 3 được thêm bậc rèn 0', () => {
    const s = withForge(7);
    forgeArms(s, 'voi');
    expect(deserialize(serialize(s))).toEqual(s);
    const s7 = createInitialState(7) as unknown as Record<string, unknown>;
    s7.version = 7;
    delete s7.arms;
    const back = deserialize(JSON.stringify(s7))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.arms).toEqual({ giao: 0, cung: 0, voi: 0 });
  });
});
