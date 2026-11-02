import { describe, expect, it } from 'vitest';
import { startBattle, startFieldBattle, stepBattle, stepField, useSkill, type Battle, type HeroSetup } from './battle';
import { canStartStage, startStage } from './campaign';
import { CH3_LAST, YEU_LAST, canForgeNoThan, forgeNoThan, wallRings } from './coLoa';
import {
  CH3_QUEST_START,
  CO_LOA_TOWER,
  DEFAULT_ROWS,
  FIELD,
  FIRST_LAND_MS,
  GIFT_IDS,
  KIM_QUY,
  NO_THAN,
  RAID_SCALE,
  QUESTS,
  RAID_WARNING_MS,
  SKILL_IDS,
  STAGES,
  TOWER,
  UNITS,
  type UnitType,
} from './defs';
import { callRaidNow, canPlace, claimQuest, createInitialState, nextFoe, place, questProgress, tick, type GameState } from './game';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { HALF_ARMY, SAMPLE_ARMY, SEEDS, fightStage } from './testkit';
import { heroFor, restingHero } from './son';
import { markStory, pendingStory } from './story';
import { RIVER_START } from './map';
import { DIEN, edge, setDien } from './testmap';

type Army = Record<UnitType, number>;
const ARMY: Army = { giao: 14, cung: 12, voi: 4, no: 0 };

/** Kinh đô vừa sang chương 3: Điện cấp 5, doanh trại cấp 5 đủ quân, Gióng đã bay về trời, Sơn Tinh đã về núi, có hai đền. */
function ch3(): GameState {
  const s = createInitialState(0);
  setDien(s, 5);
  s.resources = { gao: 8000, voOc: 8000, datDa: 8000, sat: 3000, go: 3000 };
  s.dan = 40;
  s.questIndex = CH3_QUEST_START;
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: true, restUntil: 0, ascended: true };
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  s.son.non = true;
  s.son.won = true;
  s.campaign.cleared = 16;
  const barracks = place(s, 'doanhTrai', edge(5, 1), edge(5, 1));
  if (!barracks.ok) throw new Error(barracks.reason);
  barracks.value.level = 5;
  for (const [type, x] of [['denPhuDong', edge(5, 6)], ['denTanVien', edge(5, 11)]] as const) if (!place(s, type, x, edge(5, 1)).ok) throw new Error(`dựng ${type} thử thất bại`);
  s.troops = { ...ARMY };
  return s;
}

/** Đắp một vòng thành vuông góc, dựa vào hai bờ sông, cách móng Điện `d` ô về phía rừng. Bỏ góc thì vòng hở chéo. */
function ring(s: GameState, d: number, corner = true): void {
  const at = DIEN - d;
  for (let z = at + 1; z < RIVER_START; z++) expect(place(s, 'thanh', at, z).ok).toBe(true);
  for (let x = at + 1; x < RIVER_START; x++) expect(place(s, 'thanh', x, at).ok).toBe(true);
  if (corner) expect(place(s, 'thanh', at, at).ok).toBe(true);
}

/** Năm chòi canh phía bắc Điện, nơi giặc trên bộ kéo tới. */
const TOWERS = [[25, 31], [31, 31], [37, 31], [42, 31], [31, 37]];

/** Lò rèn cấp 5 để chế nỏ thần. */
function forge(s: GameState): void {
  const r = place(s, 'loRen', edge(5, 2), edge(5, 14));
  if (!r.ok) throw new Error(r.reason);
  r.value.level = 5;
}

/** Đã có nỏ thần: An Dương Vương cùng ra trận. */
function armed(s = ch3()): GameState {
  s.campaign.cleared = YEU_LAST;
  s.adv.no = true;
  return s;
}

/** Chạy trận giữ kinh đô tới khi xong, bấm mọi kỹ năng khi đã hồi. */
function fightRaid(s: GameState): void {
  tick(s, RAID_WARNING_MS);
  const battle = s.raid.battle!;
  for (let i = 0; i < 1600 && s.raid.phase === 'battle'; i++) {
    if (battle.t > 2) for (const k of SKILL_IDS) useSkill(battle, k);
    tick(s, 125);
  }
}

describe('thành Cổ Loa', () => {
  it('chỉ đắp từ chương 3; đắp đè lên lũy tre được', () => {
    const s = ch3();
    s.questIndex = CH3_QUEST_START - 1;
    const [x, z] = [edge(5, 2), edge(5, 10)];
    expect(canPlace(s, 'thanh', x, z)).toEqual({ ok: false, reason: 'canChuong3' });
    s.questIndex = CH3_QUEST_START;
    const luy = place(s, 'luy', x, z);
    if (!luy.ok) throw new Error(luy.reason);
    const thanh = place(s, 'thanh', x, z);
    expect(thanh.ok).toBe(true);
    expect(s.buildings.some((b) => b.id === luy.value.id)).toBe(false);
    expect(s.buildings.filter((b) => b.x === x && b.z === z).map((b) => b.type)).toEqual(['thanh']);
    // Không đắp đè lên công trình khác (doanh trại).
    expect(canPlace(s, 'thanh', edge(5, 1), edge(5, 1))).toEqual({ ok: false, reason: 'datBiChiem' });
  });

  it('đếm vòng: vòng kín dựa bờ sông là 1, hở chéo góc là 0, ba lớp là 3, một đoạn hư là hở', () => {
    const s = ch3();
    expect(wallRings(s)).toBe(0);
    ring(s, 2, false);
    expect(wallRings(s)).toBe(0);
    expect(place(s, 'thanh', DIEN - 2, DIEN - 2).ok).toBe(true);
    expect(wallRings(s)).toBe(1);
    ring(s, 4);
    ring(s, 6);
    expect(wallRings(s)).toBe(3);
    s.buildings.find((b) => b.type === 'thanh' && b.x === DIEN - 6 && b.z === DIEN + 4)!.damaged = true;
    expect(wallRings(s)).toBe(2);
  });

  it('nhiệm vụ đếm vòng thành', () => {
    const s = ch3();
    expect(QUESTS[CH3_QUEST_START].id).toBe('thanh1');
    expect(questProgress(s)).toEqual({ have: 0, need: 1 });
    ring(s, 2);
    expect(questProgress(s)).toEqual({ have: 1, need: 1 });
  });

  it('đêm yêu tinh: yêu tinh nhắm phá thành trước tiên, không nhắm kho', () => {
    const s = ch3();
    ring(s, 4);
    place(s, 'kho', edge(5, 2), edge(5, 6));
    s.troops = { giao: 0, cung: 0, voi: 0, no: 0 };
    const battle = startBattle(s, 1, 'tay', { land: { foe: 'yeu', n: 1 } });
    expect(battle.foe).toBe('yeu');
    for (let i = 0; i < 40; i++) stepBattle(s, battle, 0.05);
    const targets = battle.fighters.filter((f) => f.side === 'giac' && f.targetBuilding !== null).map((f) => s.buildings.find((b) => b.id === f.targetBuilding)!.type);
    expect(targets.length).toBeGreaterThan(5);
    expect(new Set(targets)).toEqual(new Set(['thanh']));
    for (let i = 0; i < 1200; i++) stepBattle(s, battle, 0.05);
    expect(battle.wrecked.length).toBeGreaterThan(0);
  });
});

describe('lịch giặc chương 3', () => {
  it('vào chương 3 thì ít phút sau yêu tinh kéo tới từ bìa rừng; sau đó xen với mùa lũ', () => {
    const s = ch3();
    s.questIndex = CH3_QUEST_START - 1;
    tick(s, 1000);
    s.raid.nextAt = s.clock + 14 * 60_000;
    expect(claimQuest(s).ok).toBe(true);
    expect(s.questIndex).toBe(CH3_QUEST_START);
    expect(s.raid.nextAt! - s.clock).toBe(FIRST_LAND_MS);
    expect(nextFoe(s)).toBe('yeu');
    tick(s, FIRST_LAND_MS);
    expect(s.raid.phase).toBe('warning');
    expect(s.raid.foe).toBe('yeu');
    expect(['bac', 'tay']).toContain(s.raid.side);
    fightRaid(s);
    expect(s.raid.nights).toBe(1);
    expect(s.raid.lastResult?.foe).toBe('yeu');
    expect(nextFoe(s)).toBe('thuy');
    s.raid.foe = 'thuy';
    expect(nextFoe(s)).toBe('yeu');
  });

  it('diệt yêu tinh rồi thì chỉ có lũ; có nỏ thần thì quân Triệu tới, xen với lũ', () => {
    const s = ch3();
    s.campaign.cleared = YEU_LAST;
    s.raid.foe = 'thuy';
    expect(nextFoe(s)).toBe('thuy');
    ring(s, 2);
    ring(s, 3);
    ring(s, 4);
    forge(s);
    tick(s, 1000);
    s.raid.nextAt = s.clock + 10 * 60_000;
    expect(forgeNoThan(s).ok).toBe(true);
    expect(s.raid.nextAt! - s.clock).toBe(FIRST_LAND_MS);
    expect(nextFoe(s)).toBe('trieu');
    s.raid.foe = 'trieu';
    expect(nextFoe(s)).toBe('thuy');
  });

  it('quân mẫu, An Dương Vương và 5 chòi canh đánh lui quân Triệu đợt đầu; được tính cho nhiệm vụ', () => {
    const s = armed();
    for (const [x, z] of TOWERS) expect(place(s, 'choiCanh', x, z).ok).toBe(true);
    s.raid.foe = 'thuy';
    expect(callRaidNow(s).ok).toBe(true);
    expect(s.raid.foe).toBe('trieu');
    tick(s, RAID_WARNING_MS);
    expect(s.raid.battle?.hero?.kind).toBe('anDuong');
    for (let i = 0; i < 1600 && s.raid.phase === 'battle'; i++) {
      const battle = s.raid.battle!;
      if (battle.t > 2) for (const k of SKILL_IDS) useSkill(battle, k);
      tick(s, 125);
    }
    const r = s.raid.lastResult!;
    expect(r.foe).toBe('trieu');
    expect(r.killed).toBe(r.total);
    expect(r.won).toBe(true);
    expect(s.raid.trieuHeld).toBe(1);
    s.questIndex = QUESTS.findIndex((q) => q.id === 'chongTrieu');
    expect(questProgress(s)).toEqual({ have: 1, need: 1 });
  });

  it('đêm yêu tinh đầu: quân mẫu, Sơn Tinh hiển linh và 5 chòi canh diệt hết yêu tinh', () => {
    const s = ch3();
    for (const [x, z] of TOWERS) expect(place(s, 'choiCanh', x, z).ok).toBe(true);
    s.raid.foe = 'thuy';
    expect(callRaidNow(s).ok).toBe(true);
    expect(s.raid.foe).toBe('yeu');
    tick(s, RAID_WARNING_MS);
    expect(s.raid.battle?.hero?.kind).toBe('sonTinh');
    for (let i = 0; i < 1600 && s.raid.phase === 'battle'; i++) {
      const battle = s.raid.battle!;
      if (battle.t > 2) for (const k of SKILL_IDS) useSkill(battle, k);
      tick(s, 125);
    }
    const r = s.raid.lastResult!;
    expect(r.killed).toBe(r.total);
    expect(s.raid.nightsHeld).toBe(1);
  });
});

describe('An Dương Vương', () => {
  const ADV1: HeroSetup = { kind: 'anDuong', bamboo: false, glow: false, non: false, kimQuy: false };

  it('chế nỏ thần cần diệt yêu tinh, đủ ba vòng thành và lò rèn cấp 5', () => {
    const s = ch3();
    expect(canForgeNoThan(s)).toEqual({ ok: false, reason: 'canRuaVang' });
    s.campaign.cleared = YEU_LAST;
    expect(canForgeNoThan(s)).toEqual({ ok: false, reason: 'thieuVongThanh' });
    ring(s, 2);
    ring(s, 3);
    ring(s, 4);
    expect(canForgeNoThan(s)).toEqual({ ok: false, reason: 'canLoRen' });
    forge(s);
    expect(heroFor(s, 3)?.kind).toBe('sonTinh');
    const sat = s.resources.sat;
    expect(forgeNoThan(s).ok).toBe(true);
    expect(s.resources.sat).toBe(sat - 400);
    expect(canForgeNoThan(s)).toEqual({ ok: false, reason: 'daRen' });
    expect(heroFor(s, 3)).toEqual({ kind: 'anDuong', bamboo: false, glow: false, non: false, kimQuy: false });
    expect(heroFor(s, 2)?.kind).toBe('sonTinh');
    expect(heroFor(s, 1)?.kind).toBe('giong');
  });

  it('báo tướng đang kiệt sức: tướng nào lẽ ra ra trận, ai ra thay, hay không còn tướng', () => {
    const s = ch3();
    expect(restingHero(s, 3)).toBeNull();
    s.son.restUntil = s.clock + 60_000;
    expect(restingHero(s, 3)).toEqual({ kind: 'sonTinh', secs: 60 });
    expect(heroFor(s, 3)?.kind).toBe('giong');
    expect(restingHero(s, 1)).toBeNull();
    s.giong.restUntil = s.clock + 30_000;
    expect(restingHero(s, 1)).toEqual({ kind: 'giong', secs: 30 });
    expect(heroFor(s, 3)).toBeNull();
    // Có nỏ thần rồi thì An Dương Vương đứng đầu; ngài nghỉ thì Sơn Tinh ra thay (khi Sơn Tinh khỏe).
    s.adv.no = true;
    s.adv.restUntil = s.clock + 45_000;
    s.son.restUntil = 0;
    expect(restingHero(s, 3)).toEqual({ kind: 'anDuong', secs: 45 });
    expect(heroFor(s, 3)?.kind).toBe('sonTinh');
    expect(restingHero(s, 2)).toBeNull();
  });

  it('màn 20 cần An Dương Vương', () => {
    const s = ch3();
    s.campaign.cleared = YEU_LAST;
    expect(canStartStage(s, 20)).toEqual({ ok: false, reason: 'canAnDuong' });
    s.adv.no = true;
    expect(canStartStage(s, 20).ok).toBe(true);
  });

  it('Nỏ thần trúng mọi kẻ địch trên bãi, gần hay xa', () => {
    const b = startFieldBattle({ id: 1, stage: 20, enemies: { linhTrieu: 4, noTrieu: 2 }, hpScale: 3, army: { giao: 0, cung: 0, voi: 0, no: 0 }, rows: DEFAULT_ROWS, hero: ADV1 });
    expect(b.skills).toEqual(['trongTran', 'noThan']);
    expect(useSkill(b, 'noThan')).toBe(true);
    for (const f of b.fighters.filter((f) => f.side === 'giac')) expect(f.hp).toBeCloseTo(f.maxHp - NO_THAN.dmg * FIELD.hpMul, 5);
    expect(b.events.some((e) => e.kind === 'volley')).toBe(true);
    expect(useSkill(b, 'noThan')).toBe(false);
  });

  it('Rùa Vàng: quân ta hồi máu, chỉ chịu nửa sát thương trong lúc được che', () => {
    const b = startFieldBattle({
      id: 1,
      stage: 23,
      enemies: { linhTrieu: 1 },
      hpScale: 3,
      army: { giao: 2, cung: 0, voi: 0, no: 0 },
      rows: DEFAULT_ROWS,
      hero: { ...ADV1, kimQuy: true },
    });
    expect(b.skills).toEqual(['trongTran', 'noThan', 'ruaVang']);
    const [a, c] = b.fighters.filter((f) => f.kind === 'giao');
    a.hp = a.maxHp * 0.2;
    c.hp = c.maxHp * 0.5;
    expect(useSkill(b, 'ruaVang')).toBe(true);
    expect(a.hp).toBeCloseTo(a.maxHp * (0.2 + KIM_QUY.heal), 5);
    expect(b.shield).toBeGreaterThan(0);
    // Giặc đứng sát lính ta và đánh một đòn: chỉ mất nửa sát thương.
    const foe = b.fighters.find((f) => f.side === 'giac')!;
    for (const f of b.fighters) if (f !== c && f !== foe) f.state = 'gone';
    foe.x = c.x;
    foe.z = c.z - 0.5;
    foe.cd = 0;
    c.cd = 99;
    const before = c.hp;
    stepField(b, 0.01);
    expect(before - c.hp).toBeCloseTo(11 * KIM_QUY.reduce, 5);
  });

  it('thắng màn 22 thì có Rùa Vàng; thắng màn 24 thì kết chương, mở Đền Cổ Loa', () => {
    const s = armed();
    const win = (n: number) => {
      s.campaign.cleared = n - 1;
      s.troops = { ...ARMY };
      const r = startStage(s, n, ARMY, DEFAULT_ROWS);
      if (!r.ok) throw new Error(r.reason);
      for (let i = 0; i < 600 && !s.campaign.lastResult; i++) {
        for (const k of SKILL_IDS) if (s.campaign.battle!.t > 3) useSkill(s.campaign.battle!, k);
        tick(s, 250);
      }
      const result = s.campaign.lastResult!;
      const battle = s.campaign.battle!;
      s.campaign.battle = null;
      s.campaign.lastResult = null;
      s.adv.restUntil = 0;
      return { result, battle };
    };
    s.raid.nextAt = null;
    expect(win(22).result.outcome).toBe('win');
    expect(s.adv.kimQuy).toBe(true);
    expect(heroFor(s, 3)?.kimQuy).toBe(true);
    expect(canPlace(s, 'denCoLoa', edge(5, 1), edge(5, 12))).toEqual({ ok: false, reason: 'canKetChuong3' });
    s.raid.nextAt = null;
    const last = win(CH3_LAST);
    expect(last.result.outcome).toBe('win');
    expect(last.battle.advWin).toBe(true);
    expect(s.adv.won).toBe(true);
    expect(canPlace(s, 'denCoLoa', edge(5, 1), edge(5, 12)).ok).toBe(true);
  });

  it('Đền Cổ Loa: chòi canh bắn mạnh hơn và xa hơn', () => {
    const s = ch3();
    const at = edge(5, 8);
    const tower = place(s, 'choiCanh', at, at);
    if (!tower.ok) throw new Error(tower.reason);
    s.troops = { giao: 0, cung: 0, voi: 0, no: 0 };
    const shot = (crossbows: boolean, dist: number) => {
      const b: Battle = startBattle(s, 1, 'bac', { land: { foe: 'trieu', n: 1 }, crossbows });
      const foe = b.fighters.find((f) => f.side === 'giac')!;
      for (const f of b.fighters) if (f !== foe) f.state = 'gone';
      foe.x = at + 0.5 + dist;
      foe.z = at + 0.5;
      foe.cd = 99;
      stepBattle(s, b, 0.01);
      return foe.maxHp - foe.hp;
    };
    expect(shot(false, 3)).toBeCloseTo(TOWER.dmg[0], 5);
    expect(shot(true, 3)).toBeCloseTo(TOWER.dmg[0] * CO_LOA_TOWER.dmg, 5);
    // Ở kinh đô, tầm bắn tính bằng ô nhân với độ giãn của kinh đô.
    expect(shot(false, TOWER.range * RAID_SCALE + 0.5)).toBe(0);
    expect(shot(true, TOWER.range * RAID_SCALE + 0.5)).toBeGreaterThan(0);
  });
});

describe('cân bằng phó bản chương 3', () => {
  const SON: HeroSetup = { kind: 'sonTinh', bamboo: false, glow: true, non: true };
  const advFor = (n: number): HeroSetup => ({ kind: 'anDuong', bamboo: false, glow: false, non: false, kimQuy: n > 22 });
  const heroFor3 = (n: number) => (n <= 19 ? SON : advFor(n));

  it('quân mẫu chương 3 vừa doanh trại cấp 5, bãi chiến không quá 60 người', () => {
    const space = (Object.keys(ARMY) as UnitType[]).reduce((n, k) => n + ARMY[k] * UNITS[k].space, 0);
    expect(space).toBeLessThanOrEqual(38);
    for (const def of STAGES.filter((d) => d.chapter === 3)) {
      const foes = Object.values(def.enemies).reduce((a, b) => a + (b ?? 0), 0);
      expect(foes + 30 + 1).toBeLessThanOrEqual(60);
    }
  });

  for (const n of [17, 18, 19, 20, 21, 22, 23, 24]) {
    it(`màn ${n}: người chơi thường có ${n <= 19 ? 'Sơn Tinh hiển linh' : 'An Dương Vương'} thì thắng; không tướng, hay nửa quân, chơi giỏi cũng thua`, () => {
      for (const id of SEEDS) {
        const won = fightStage(n, SAMPLE_ARMY, heroFor3(n), 'thuong', id);
        expect(won.outcome).toBe('win');
        expect(won.t).toBeLessThan(FIELD.maxS);
        expect(fightStage(n, SAMPLE_ARMY, null, 'gioi', id).outcome).toBe('lose');
        expect(fightStage(n, HALF_ARMY, heroFor3(n), 'gioi', id).outcome).toBe('lose');
      }
    });
  }
  it('Triệu Đà cần bấm kỹ năng mới thắng', () => {
    for (const id of SEEDS) expect(fightStage(CH3_LAST, SAMPLE_ARMY, advFor(CH3_LAST), 'khongBam', id).outcome).toBe('lose');
  });
});

describe('truyện và lưu game chương 3', () => {
  it('kể các đoạn chương 3 đúng thứ tự sau chương 2', () => {
    const s = ch3();
    for (const id of ['mo', 'suGia', 'vuonVai', 'roiGay', 'ketChuong', 'langLieu', 'kenRe', 'ruocDau', 'doiNon', 'ketChuong2'] as const) markStory(s, id);
    expect(pendingStory(s)).toBe('cotDa');
    markStory(s, 'cotDa');
    expect(pendingStory(s)).toBeNull();
    s.campaign.cleared = YEU_LAST;
    expect(pendingStory(s)).toBe('dietYeu');
    markStory(s, 'dietYeu');
    s.adv.no = true;
    s.adv.kimQuy = true;
    s.adv.won = true;
    expect(pendingStory(s)).toBe('noThan');
    markStory(s, 'noThan');
    expect(pendingStory(s)).toBe('kimQuy');
    markStory(s, 'kimQuy');
    expect(pendingStory(s)).toBe('ketChuong3');
  });

  it('lưu và nạp lại giữ nguyên thành, An Dương Vương, lịch giặc', () => {
    const s = armed();
    ring(s, 3);
    s.raid.foe = 'trieu';
    s.raid.trieu = 2;
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('nâng bản lưu chương 2: thêm An Dương Vương và đếm đợt giặc mới', () => {
    const s6 = createInitialState(6) as unknown as Record<string, unknown>;
    s6.version = 6;
    delete s6.adv;
    const raid = s6.raid as Record<string, unknown>;
    for (const k of ['nights', 'nightsHeld', 'trieu', 'trieuHeld']) delete raid[k];
    raid.foe = 'thuy';
    const back = deserialize(JSON.stringify(s6))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.adv).toEqual({ no: false, restUntil: 0, kimQuy: false, won: false, layTrao: false });
    expect(back.raid.nights).toBe(0);
    expect(back.raid.foe).toBe('thuy');
  });
});
