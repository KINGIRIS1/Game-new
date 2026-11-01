import { describe, expect, it } from 'vitest';
import { alliesLeft, heroOf, skillReady, startBattle, startFieldBattle, stepField, useSkill, type Battle } from './battle';
import { canStartStage, startStage } from './campaign';
import { DEFAULT_ROWS, FIELD, FIRE, GIONG, GIONG_FEED, GIONG_REST_MS, STAGES, UNITS, type SkillId, type UnitType } from './defs';
import { canPlace, createInitialState, place, productionPerMinute, tick, type GameState } from './game';
import { canFeed, canForge, feedGiong, forgeGear, giongLook, giongReady, heroSetup } from './giong';
import { markStory, pendingStory } from './story';
import { deserialize, serialize } from './save';

type Army = Record<UnitType, number>;

/** Kinh đô Điện cấp 3 có lò rèn cấp 3 và doanh trại cấp 3, nhiều của. */
function capital(): GameState {
  const s = createInitialState(0);
  s.buildings[0].level = 3;
  s.resources = { gao: 5000, voOc: 5000, datDa: 5000, sat: 2000 };
  s.dan = 30;
  const forge = place(s, 'loRen', 9, 9);
  // Doanh trại phía nam Điện: tướng ra trận từ sân doanh trại, trước mặt Điện.
  const barracks = place(s, 'doanhTrai', 15, 29);
  if (!forge.ok || !barracks.ok) throw new Error('dựng kinh đô thử thất bại');
  forge.value.level = 3;
  barracks.value.level = 3;
  return s;
}

/** Gióng đã thành tráng sĩ. */
function withGiong(s = capital()): GameState {
  for (let i = 0; i < GIONG_FEED.length; i++) feedGiong(s);
  for (const g of ['ngua', 'roi', 'giap'] as const) forgeGear(s, g);
  return s;
}

const SKILL_ORDER: SkillId[] = ['trongTran', 'phunLua', 'nhoTre'];

function fieldFight(stage: number, army: Army, hero: boolean, skills = true): Battle {
  const def = STAGES[stage - 1];
  const b = startFieldBattle({ id: 1, stage, enemies: def.enemies, hpScale: def.hpScale, army, rows: DEFAULT_ROWS, hero: hero ? { kind: 'giong', bamboo: stage > 6, glow: false, non: false } : null });
  for (let i = 0; i < 20 * 120 && !stepField(b, 0.05); i++) if (skills && b.t > 3) for (const k of SKILL_ORDER) useSkill(b, k);
  return b;
}

describe('nuôi Gióng', () => {
  it('Gióng xuất hiện khi Điện lên cấp 2, lớn dần theo mốc gạo', () => {
    const s = createInitialState(0);
    s.resources.gao = 5000;
    expect(canFeed(s)).toEqual({ ok: false, reason: 'chuaCoGiong' });
    expect(giongLook(s)).toBeNull();
    s.buildings[0].level = 2;
    expect(giongLook(s)).toBe('be');
    expect(feedGiong(s)).toEqual({ ok: true, value: 1 });
    expect(s.resources.gao).toBe(5000 - GIONG_FEED[0]);
    feedGiong(s);
    expect(giongLook(s)).toBe('thieuNien');
    for (let i = 0; i < 3; i++) feedGiong(s);
    expect(s.giong.fed).toBe(5);
    expect(canFeed(s)).toEqual({ ok: false, reason: 'daGopDu' });
  });

  it('thiếu gạo thì chưa góp được', () => {
    const s = createInitialState(0);
    s.buildings[0].level = 2;
    s.resources.gao = GIONG_FEED[0] - 1;
    expect(canFeed(s)).toEqual({ ok: false, reason: 'thieuTaiNguyen' });
  });

  it('rèn đồ sắt cần đủ cấp lò rèn, mỗi món rèn một lần', () => {
    const s = capital();
    const forge = s.buildings.find((b) => b.type === 'loRen')!;
    forge.level = 1;
    expect(canForge(s, 'roi')).toEqual({ ok: false, reason: 'canLoRen' });
    expect(forgeGear(s, 'ngua').ok).toBe(true);
    expect(canForge(s, 'ngua')).toEqual({ ok: false, reason: 'daRen' });
    forge.damaged = true;
    expect(canForge(s, 'giap')).toEqual({ ok: false, reason: 'canLoRen' });
  });

  it('đủ 5 mốc gạo và 3 món đồ thì Gióng thành tráng sĩ, ra trận được', () => {
    const s = capital();
    expect(heroSetup(s)).toBeNull();
    withGiong(s);
    expect(giongReady(s)).toBe(true);
    expect(giongLook(s)).toBe('trangSi');
    expect(heroSetup(s)).toEqual({ kind: 'giong', bamboo: false, glow: false, non: false });
  });
});

describe('Gióng trong trận', () => {
  it('ra trận cùng quân ta, có kỹ năng Phun lửa, chưa có Nhổ tre', () => {
    const b = startFieldBattle({ id: 1, stage: 1, enemies: { giaoAn: 4 }, hpScale: 1, army: { giao: 2, cung: 0, voi: 0 }, rows: DEFAULT_ROWS, hero: { kind: 'giong', bamboo: false, glow: false, non: false } });
    expect(heroOf(b)).toBeDefined();
    expect(b.skills).toEqual(['trongTran', 'phunLua']);
    expect(skillReady(b, 'nhoTre')).toBe(false);
  });

  it('Phun lửa đốt giặc trong dải lửa và đưa Gióng lao lên', () => {
    const b = startFieldBattle({ id: 1, stage: 1, enemies: { giaoAn: 3 }, hpScale: 1, army: { giao: 0, cung: 0, voi: 0 }, rows: DEFAULT_ROWS, hero: { kind: 'giong', bamboo: false, glow: false, non: false } });
    const hero = heroOf(b)!;
    // Dồn giặc vào một hàng thẳng trước mặt Gióng.
    const foes = b.fighters.filter((f) => f.side === 'giac');
    foes.forEach((f, i) => {
      f.x = hero.x;
      f.z = hero.z - 2 - i * 1.5;
    });
    const z0 = hero.z;
    expect(useSkill(b, 'phunLua')).toBe(true);
    for (const f of foes) expect(f.hp).toBeLessThanOrEqual(f.maxHp - FIRE.dmg * FIELD.hpMul + 1e-6);
    expect(hero.z).toBeLessThan(z0 - 3);
    expect(b.events.some((e) => e.kind === 'fire')).toBe(true);
    expect(useSkill(b, 'phunLua')).toBe(false);
  });

  it('roi gãy rồi thì có Nhổ tre: đánh giặc quanh mình và hất ra xa', () => {
    const b = startFieldBattle({ id: 1, stage: 1, enemies: { giaoAn: 2 }, hpScale: 1, army: { giao: 0, cung: 0, voi: 0 }, rows: DEFAULT_ROWS, hero: { kind: 'giong', bamboo: true, glow: false, non: false } });
    const hero = heroOf(b)!;
    const foes = b.fighters.filter((f) => f.side === 'giac');
    foes[0].x = hero.x + 1;
    foes[0].z = hero.z;
    foes[1].x = hero.x;
    foes[1].z = hero.z - 6;
    expect(useSkill(b, 'nhoTre')).toBe(true);
    expect(foes[0].hp).toBeLessThan(foes[0].maxHp);
    expect(foes[0].x).toBeGreaterThan(hero.x + 1.5);
    expect(foes[1].hp).toBe(foes[1].maxHp);
  });

  it('Gióng không chết: hết sức thì rút khỏi trận, không tính vào lính tử trận', () => {
    const b = startFieldBattle({ id: 1, stage: 4, enemies: { phoTuong: 3 }, hpScale: 3, army: { giao: 0, cung: 0, voi: 0 }, rows: DEFAULT_ROWS, hero: { kind: 'giong', bamboo: false, glow: false, non: false } });
    while (!stepField(b, 0.05));
    expect(b.outcome).toBe('lose');
    expect(b.hero?.down).toBe(true);
    expect(b.fighters.find((f) => f.kind === 'giong')?.state).toBe('gone');
    expect(b.lost).toEqual({ giao: 0, cung: 0, voi: 0 });
    expect(b.events.some((e) => e.kind === 'exhaust')).toBe(true);
  });

  it('kiệt sức thì nghỉ 2 phút chơi, chưa đánh được màn cần Gióng', () => {
    const s = withGiong();
    s.campaign.cleared = 4;
    expect(startStage(s, 5, { giao: 0, cung: 0, voi: 0 }, DEFAULT_ROWS).ok).toBe(true);
    // Một mình Gióng không địch nổi đạo quân màn 5.
    for (let i = 0; i < 200 && !s.campaign.lastResult; i++) tick(s, 1000);
    expect(s.campaign.lastResult?.outcome).toBe('lose');
    s.campaign.battle = null;
    expect(heroSetup(s)).toBeNull();
    expect(canStartStage(s, 5)).toEqual({ ok: false, reason: 'giongKietSuc' });
    s.raid.nextAt = null;
    tick(s, GIONG_REST_MS);
    expect(canStartStage(s, 5).ok).toBe(true);
  });

  it('khi giặc đánh kinh đô, Gióng ra trận từ trước Điện', () => {
    const s = withGiong();
    const battle = startBattle(s, 1, 'bac', { hero: heroSetup(s) });
    const hero = heroOf(battle)!;
    expect(hero.z).toBeGreaterThan(s.buildings[0].z + 4);
    expect(battle.skills).toContain('phunLua');
    expect(alliesLeft(battle)).toBe(1);
  });
});

describe('cân bằng màn có Gióng', () => {
  // Quân mẫu vừa đủ chỗ trong doanh trại ở cấp Điện mà màn yêu cầu.
  const SAMPLE: Record<number, Army> = {
    5: { giao: 8, cung: 6, voi: 2 },
    6: { giao: 10, cung: 9, voi: 3 },
    7: { giao: 10, cung: 9, voi: 3 },
    8: { giao: 14, cung: 12, voi: 4 },
  };
  for (const [n, army] of Object.entries(SAMPLE)) {
    const stage = Number(n);
    it(`màn ${stage}: có Gióng và bấm kỹ năng thì thắng; không Gióng, hay nửa quân, thì thua`, () => {
      expect(fieldFight(stage, army, true).outcome).toBe('win');
      expect(fieldFight(stage, army, false).outcome).toBe('lose');
      const half = { giao: Math.floor(army.giao / 2), cung: Math.floor(army.cung / 2), voi: Math.floor(army.voi / 2) };
      expect(fieldFight(stage, half, true).outcome).toBe('lose');
    });
    it(`màn ${stage}: quân mẫu vừa doanh trại`, () => {
      const space = (Object.keys(army) as UnitType[]).reduce((s, k) => s + army[k] * UNITS[k].space, 0);
      expect(space).toBeLessThanOrEqual([8, 14, 20, 28, 38][STAGES[stage - 1].minDien - 1]);
    });
  }

  it('trùm cuối cần bấm kỹ năng mới thắng', () => {
    expect(fieldFight(8, SAMPLE[8], true, false).outcome).toBe('lose');
  });
});

describe('roi gãy, kết chương, Đền Phù Đổng', () => {
  function winStage(s: GameState, n: number, army: Army) {
    s.campaign.cleared = n - 1;
    s.troops = { ...army };
    const r = startStage(s, n, army, DEFAULT_ROWS);
    if (!r.ok) throw new Error(r.reason);
    for (let i = 0; i < 200 && !s.campaign.lastResult; i++) {
      for (const k of SKILL_ORDER) if (s.campaign.battle!.t > 3) useSkill(s.campaign.battle!, k);
      tick(s, 250);
    }
    expect(s.campaign.lastResult?.outcome).toBe('win');
    s.campaign.battle = null;
    s.campaign.lastResult = null;
  }

  it('thắng màn 6 lần đầu thì roi sắt gãy, Gióng có Nhổ tre', () => {
    const s = withGiong();
    s.buildings[0].level = 4;
    s.raid.nextAt = null;
    winStage(s, 6, { giao: 10, cung: 9, voi: 3 });
    expect(s.giong.whipBroken).toBe(true);
    expect(heroSetup(s)?.bamboo).toBe(true);
  });

  it('thắng màn 8 thì Gióng bay về trời, mở Đền Phù Đổng, Gióng vẫn hiển linh', () => {
    const s = withGiong();
    s.buildings[0].level = 5;
    s.giong.whipBroken = true;
    s.raid.nextAt = null;
    expect(canPlace(s, 'denPhuDong', 5, 5)).toEqual({ ok: false, reason: 'canKetChuong' });
    winStage(s, 8, { giao: 14, cung: 12, voi: 4 });
    expect(s.giong.ascended).toBe(true);
    expect(giongLook(s)).toBeNull();
    expect(heroSetup(s)).toEqual({ kind: 'giong', bamboo: true, glow: true, non: false });
    expect(canPlace(s, 'denPhuDong', 5, 5).ok).toBe(true);
  });

  it('Đền Phù Đổng thêm 10% sản lượng và 10% máu cho quân ta', () => {
    const s = withGiong();
    s.giong.ascended = true;
    s.buildings[0].level = 5;
    place(s, 'ruong', 12, 12);
    s.buildings.find((b) => b.type === 'ruong')!.workers = 2;
    const before = productionPerMinute(s).gao;
    expect(place(s, 'denPhuDong', 5, 5).ok).toBe(true);
    expect(productionPerMinute(s).gao).toBeCloseTo(before * 1.1);
    s.troops = { giao: 1, cung: 0, voi: 0 };
    const battle = startBattle(s, 1, 'bac', { bonus: 0.1 });
    const giao = battle.fighters.find((f) => f.kind === 'giao')!;
    expect(giao.maxHp).toBeCloseTo(UNITS.giao.hp * 1.1);
  });
});

describe('truyện', () => {
  it('kể từng đoạn đúng thứ tự, mỗi đoạn một lần', () => {
    const s = capital();
    expect(pendingStory(s)).toBe('mo');
    markStory(s, 'mo');
    expect(pendingStory(s)).toBe('suGia');
    markStory(s, 'suGia');
    expect(pendingStory(s)).toBeNull();
    withGiong(s);
    expect(pendingStory(s)).toBe('vuonVai');
    markStory(s, 'vuonVai');
    markStory(s, 'vuonVai');
    expect(s.story.seen).toEqual(['mo', 'suGia', 'vuonVai']);
  });

  it('lưu và nạp lại giữ nguyên Gióng và truyện', () => {
    const s = withGiong();
    markStory(s, 'mo');
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('Gióng mạnh hơn hẳn lính thường', () => {
    expect(GIONG.hp).toBeGreaterThan(UNITS.voi.hp * 2);
  });
});
