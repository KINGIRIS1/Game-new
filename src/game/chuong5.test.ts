// Canh chương 5 phần 1: vào chương 5 (nhận thưởng nhiệm vụ 51), Điện 10 mở theo chương, quân Hán (lính kích, nỏ thủ,
// giáp sĩ) đánh kinh đô xen với lũ, nhiệm vụ 54, bản lưu phiên bản 21.
// Phần 2: Hai Bà Trưng (hai tướng cùng ra một trận, mỗi bà một kỹ năng), nghĩa binh, màn 33–36 và Tô Định bỏ chạy,
// đoạn truyện 1–3, nhiệm vụ 55–57, bản lưu phiên bản 22.

import { describe, expect, it } from 'vitest';
import { heroSetups, skillOwner, skillReady, startBattle, startFieldBattle, stepField, useSkill, type Battle, type BattleEvent, type HeroSetup } from './battle';
import { canStartStage, retreat, stageHeroList, startStage } from './campaign';
import { HIEU_TRIEU_AT, LUY_LAU_AT, haiBaSetups, inChapter5 } from './chuong5';
import {
  BUILDINGS,
  CH5_QUEST_START,
  DEFAULT_ROWS,
  ENEMIES,
  FIELD,
  FIRST_HAN_MS,
  GIFT_IDS,
  HAI_BA_REST_MS,
  HIEU_TRIEU,
  NGHIA_BINH,
  QUESTS,
  RAID_WARNING_MS,
  SKILLS,
  SKILL_IDS,
  STAGES,
  TO_DINH_FLEE,
  UNITS,
  VOI_XUNG,
  hanForces,
  hanHpScale,
} from './defs';
import { assignCommander, barracksList } from './doanhTrai';
import { callRaidNow, canUpgrade, claimQuest, createInitialState, nextFoe, place, questProgress, tick, upgrade, type GameState } from './game';
import { chapterOf } from './manVao';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { heroFor, heroesFor, restingHero } from './son';
import { markStory, pendingStory } from './story';
import { HALF_ARMY4, SAMPLE_ARMY4, SEEDS, fightStage } from './testkit';
import { DIEN_END, edge, setDien } from './testmap';

/** Năm chòi canh phía bắc và phía tây Điện, nơi giặc trên bộ kéo tới. */
const TOWERS = [[25, 31], [31, 31], [37, 31], [42, 31], [31, 37]];

/**
 * Kinh đô vừa vào chương 5: Điện cấp 9, doanh trại cấp 5 đủ quân mẫu chương 4, bốn đền, Cao Lỗ cầm quân,
 * An Dương Vương đã xuống biển, đã xem Hết truyện chương 4.
 */
function ch5(): GameState {
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
  s.campaign.cleared = 32;
  const barracks = place(s, 'doanhTrai', DIEN_END + 1, DIEN_END + 1);
  if (!barracks.ok) throw new Error(barracks.reason);
  barracks.value.level = 5;
  s.troops = { ...SAMPLE_ARMY4 };
  for (const id of ['mo', 'suGia', 'benKia', 'vuonVai', 'roiGay', 'ketChuong', 'langLieu', 'kenRe', 'ruocDau', 'doiNon', 'ketChuong2', 'cotDa', 'dietYeu', 'noThan', 'kimQuy', 'ketChuong3', 'cauHon', 'caoLoCamQuan', 'layNo', 'longNgong', 'ngocTrai', 'hetTruyen'] as const) {
    markStory(s, id);
  }
  return s;
}

/** Chạy trận giữ kinh đô đang báo tới khi xong, bấm mọi kỹ năng khi đã hồi. */
function fightRaid(s: GameState): void {
  tick(s, RAID_WARNING_MS);
  for (let i = 0; i < 1600 && s.raid.phase === 'battle'; i++) {
    const battle = s.raid.battle!;
    if (battle.t > 2) for (const k of SKILL_IDS) useSkill(battle, k);
    tick(s, 125);
  }
}

describe('vào chương 5', () => {
  it('nhận thưởng nhiệm vụ "một công trình cấp 9" thì sang chương 5; nhiệm vụ đầu chương là lên Điện 10', () => {
    expect(QUESTS[CH5_QUEST_START - 1].id).toBe('cap9');
    expect(QUESTS[CH5_QUEST_START].id).toBe('dien10');
    const s = ch5();
    s.questIndex = CH5_QUEST_START - 1;
    expect(inChapter5(s)).toBe(false);
    expect(chapterOf(s)).toBe(4);
    const kho = place(s, 'kho', edge(9, 1), edge(9, 1));
    if (!kho.ok) throw new Error(kho.reason);
    kho.value.level = 9;
    expect(claimQuest(s).ok).toBe(true);
    expect(inChapter5(s)).toBe(true);
    expect(chapterOf(s)).toBe(5);
  });

  it('Điện 10 mở khi vào chương 5, không cần thắng thử thách', () => {
    const s = ch5();
    s.questIndex = CH5_QUEST_START - 1;
    expect(canUpgrade(s, 1)).toEqual({ ok: false, reason: 'canChuong5' });
    s.questIndex = CH5_QUEST_START;
    expect(s.thuThach.won).toEqual([]);
    expect(upgrade(s, 1).ok).toBe(true);
    expect(s.buildings[0].level).toBe(10);
  });

  it('nhiệm vụ chương 5 phần 1: lên Điện 10, một công trình cấp 10, đánh lui một đợt quân Hán', () => {
    expect(QUESTS.slice(CH5_QUEST_START, CH5_QUEST_START + 3).map((q) => q.id)).toEqual(['dien10', 'cap10', 'chongHan']);
    expect(QUESTS.find((q) => q.id === 'chongHan')!.reward).toEqual({ voOc: 2500, sat: 700 });
  });
});

describe('quân Hán', () => {
  it('ba loại lính đúng vòng khắc chế: cung thủ khắc lính kích, voi khắc nỏ thủ, giáo binh và lính nỏ khắc giáp sĩ', () => {
    expect(UNITS.cung.strongVs).toContain('linhHan');
    expect(UNITS.voi.strongVs).toContain('noHan');
    expect(UNITS.giao.strongVs).toContain('giapHan');
    expect(UNITS.no.strongVs).toContain('giapHan');
    expect(ENEMIES.giapHan.strongVs).toEqual(['cung']);
    // Mạnh hơn quân Triệu chừng 10%.
    expect(ENEMIES.linhHan.hp / ENEMIES.linhTrieu.hp).toBeCloseTo(1.1, 1);
    expect(ENEMIES.noHan.hp / ENEMIES.noTrieu.hp).toBeCloseTo(1.1, 1);
    expect(ENEMIES.giapHan.hp / ENEMIES.linhRiu.hp).toBeGreaterThan(1);
  });

  it('quân số mỗi đợt: 10 + n lính kích, 5 + ⌊n/2⌋ nỏ thủ, 2 + ⌊n/3⌋ giáp sĩ, có trần; máu nhân 2,2 + 0,12 mỗi đợt', () => {
    expect(hanForces(1)).toEqual({ linhHan: 11, noHan: 5, giapHan: 2 });
    expect(hanForces(6)).toEqual({ linhHan: 16, noHan: 8, giapHan: 4 });
    expect(hanForces(30)).toEqual({ linhHan: 20, noHan: 12, giapHan: 6 });
    expect(hanHpScale(1)).toBeCloseTo(2.2, 5);
    expect(hanHpScale(6)).toBeCloseTo(2.8, 5);
    const s = ch5();
    const one = startBattle(s, 1, 'bac', { land: { foe: 'han', n: 1 } });
    const nine = startBattle(s, 9, 'bac', { land: { foe: 'han', n: 9 } });
    expect(one.foe).toBe('han');
    expect(nine.total).toBeGreaterThan(one.total);
    const hp = (b: Battle) => b.fighters.find((f) => f.kind === 'linhHan')!.maxHp;
    expect(hp(nine) / hp(one)).toBeCloseTo(hanHpScale(9) / hanHpScale(1), 5);
  });

  it('đợt quân Hán đầu: quân mẫu, Hai Bà và 5 chòi canh diệt hết; tính cho nhiệm vụ', () => {
    const s = ch5();
    for (const [x, z] of TOWERS) expect(place(s, 'choiCanh', x, z).ok).toBe(true);
    s.raid.foe = 'thuy';
    expect(callRaidNow(s).ok).toBe(true);
    expect(s.raid.foe).toBe('han');
    expect(['bac', 'tay']).toContain(s.raid.side);
    tick(s, RAID_WARNING_MS);
    expect(s.raid.battle?.hero?.kind).toBe('trungTrac');
    expect(s.raid.battle?.hero2?.kind).toBe('trungNhi');
    fightRaid(s);
    const r = s.raid.lastResult!;
    expect(r.foe).toBe('han');
    expect(r.killed).toBe(r.total);
    expect(r.won).toBe(true);
    expect(s.raid.han).toBe(1);
    expect(s.raid.hanHeld).toBe(1);
    s.questIndex = QUESTS.findIndex((q) => q.id === 'chongHan');
    expect(questProgress(s)).toEqual({ have: 1, need: 1 });
  });
});

describe('lịch đợt chương 5', () => {
  it('vào chương 5 thì đợt quân Hán đầu tới sau 3 phút; thủy binh, quân Triệu thôi tới; quân Hán và lũ xen nhau', () => {
    const s = ch5();
    s.questIndex = CH5_QUEST_START - 1;
    const kho = place(s, 'kho', edge(9, 1), edge(9, 1));
    if (!kho.ok) throw new Error(kho.reason);
    kho.value.level = 9;
    s.raid.nextAt = s.clock + 10 * 60_000;
    s.raid.foe = 'thuyBinh';
    expect(nextFoe(s)).toBe('trieu');
    expect(claimQuest(s).ok).toBe(true);
    expect(s.raid.nextAt! - s.clock).toBe(FIRST_HAN_MS);
    expect(nextFoe(s)).toBe('han');
    s.raid.foe = 'han';
    expect(nextFoe(s)).toBe('thuy');
    s.raid.foe = 'thuy';
    expect(nextFoe(s)).toBe('han');
    // Bản lưu còn đợt thủy binh, quân Triệu cũ thì đợt sau vẫn là quân Hán.
    for (const foe of ['thuyBinh', 'trieu'] as const) {
      s.raid.foe = foe;
      expect(nextFoe(s)).toBe('han');
    }
  });

  it('giữ kinh đô chương 5: Hai Bà; cả hai kiệt sức thì Cao Lỗ, rồi Sơn Tinh, rồi Gióng ra thay. Mùa lũ vẫn là Sơn Tinh', () => {
    const s = ch5();
    expect(heroesFor(s, 5).map((h) => h.kind)).toEqual(['trungTrac', 'trungNhi']);
    s.haiBa.trungTrac = s.clock + 60_000;
    expect(heroesFor(s, 5).map((h) => h.kind)).toEqual(['trungNhi']);
    s.haiBa.trungNhi = s.clock + 60_000;
    expect(heroFor(s, 5)?.kind).toBe('caoLo');
    expect(restingHero(s, 5)?.kind).toBe('trungTrac');
    s.caoLo.restUntil = s.clock + 60_000;
    expect(heroFor(s, 5)?.kind).toBe('sonTinh');
    expect(restingHero(s, 5)?.kind).toBe('trungTrac');
    s.son.restUntil = s.clock + 60_000;
    expect(heroFor(s, 5)?.kind).toBe('giong');
    s.caoLo.restUntil = 0;
    s.son.restUntil = 0;
    s.haiBa = { trungTrac: 0, trungNhi: 0 };
    s.raid.foe = 'han';
    expect(callRaidNow(s).ok).toBe(true);
    expect(s.raid.foe).toBe('thuy');
    tick(s, RAID_WARNING_MS);
    expect(s.raid.battle?.hero?.kind).toBe('sonTinh');
  });
});

describe('bản lưu chương 5', () => {
  it('lưu rồi đọc lại giữ số đợt quân Hán', () => {
    const s = ch5();
    s.raid.han = 3;
    s.raid.hanHeld = 2;
    s.raid.foe = 'han';
    const back = deserialize(serialize(s))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(21);
    expect(back.raid.han).toBe(3);
    expect(back.raid.hanHeld).toBe(2);
    expect(back.raid.foe).toBe('han');
  });

  it('nâng bản lưu 20 lên 21: thêm số đợt quân Hán; đã ở chương 5 thì hẹn quân Hán', () => {
    for (const questIndex of [CH5_QUEST_START - 1, CH5_QUEST_START, CH5_QUEST_START + 2]) {
      const s = ch5();
      s.questIndex = questIndex;
      s.clock = 50_000;
      s.raid.nextAt = s.clock + 10 * 60_000;
      s.raid.foe = 'thuyBinh';
      const raw = JSON.parse(serialize(s));
      raw.version = 20;
      delete raw.raid.han;
      delete raw.raid.hanHeld;
      const back = deserialize(JSON.stringify(raw))!;
      expect(back, String(questIndex)).toBeDefined();
      expect(back.version).toBe(SAVE_VERSION);
      expect(back.raid.han).toBe(0);
      expect(back.raid.hanHeld).toBe(0);
      if (questIndex >= CH5_QUEST_START) {
        expect(back.raid.nextAt! - back.clock).toBe(FIRST_HAN_MS);
        expect(nextFoe(back)).toBe('han');
      } else {
        expect(back.raid.nextAt! - back.clock).toBe(10 * 60_000);
        expect(back.raid.foe).toBe('thuyBinh');
      }
    }
  });
});

const TRAC: HeroSetup = { kind: 'trungTrac', bamboo: false, glow: false, non: false };
const NHI = (hieuTrieu: boolean): HeroSetup => ({ kind: 'trungNhi', bamboo: false, glow: false, non: false, hieuTrieu });
/** Hai Bà ra trận màn `n`: Trưng Nhị có Hiệu triệu từ khi thắng màn 33. */
const haiBa = (n: number) => [TRAC, NHI(n > HIEU_TRIEU_AT)];
const run = (b: Battle, secs: number) => {
  const end = b.t + secs;
  for (let i = 0; i < 20 * secs + 20 && b.t < end && !stepField(b, 0.05); i++);
};

describe('Hai Bà Trưng', () => {
  it('trận phó bản chương 5 có cả hai bà; mỗi bà một kỹ năng; Trưng Nhị có Hiệu triệu khi đã thắng màn 33', () => {
    const s = ch5();
    expect(startStage(s, 33, SAMPLE_ARMY4, DEFAULT_ROWS).ok).toBe(true);
    const b = s.campaign.battle!;
    expect(b.hero?.kind).toBe('trungTrac');
    expect(b.hero2?.kind).toBe('trungNhi');
    expect(b.fighters.filter((f) => f.kind === 'trungTrac' || f.kind === 'trungNhi').length).toBe(2);
    expect(b.skills).toContain('voiXung');
    expect(b.skills).not.toContain('hieuTrieu');
    expect(skillOwner(b, 'voiXung')?.kind).toBe('trungTrac');
    // Trưng Nhị bắn cung, đứng lùi sau Trưng Trắc (giặc ở phía z nhỏ).
    const z = (k: string) => b.fighters.find((f) => f.kind === k)!.z;
    expect(z('trungNhi')).toBeGreaterThan(z('trungTrac'));
    expect(retreat(s).ok).toBe(true);
    s.campaign.battle = null;
    s.campaign.lastResult = null;
    s.campaign.cleared = HIEU_TRIEU_AT;
    expect(haiBaSetups(s).find((h) => h.kind === 'trungNhi')?.hieuTrieu).toBe(true);
    expect(startStage(s, 34, SAMPLE_ARMY4, DEFAULT_ROWS).ok).toBe(true);
    expect(s.campaign.battle!.skills).toEqual(expect.arrayContaining(['voiXung', 'hieuTrieu']));
    expect(skillOwner(s.campaign.battle!, 'hieuTrieu')?.kind).toBe('trungNhi');
    expect(SKILLS.voiXung.cooldown).toBe(12);
    expect(SKILLS.hieuTrieu.cooldown).toBe(25);
  });

  it('Voi xung trận: voi lao về phía giặc đông nhất, giặc trên đường mất máu, bị hất và choáng; hồi 12 giây', () => {
    const b = startFieldBattle({ id: 1, stage: 33, enemies: STAGES[32].enemies, hpScale: 1, army: { giao: 0, cung: 0, voi: 0, no: 0 }, rows: DEFAULT_ROWS, hero: TRAC });
    run(b, 4);
    const before = new Map(b.fighters.map((f) => [f, { hp: f.hp, x: f.x, z: f.z }]));
    const trac = b.fighters.find((f) => f.kind === 'trungTrac')!;
    const from = { x: trac.x, z: trac.z };
    expect(skillReady(b, 'voiXung')).toBe(true);
    useSkill(b, 'voiXung');
    const hit = b.fighters.filter((f) => f.side === 'giac' && f.hp < before.get(f)!.hp);
    expect(hit.length).toBeGreaterThan(0);
    for (const f of hit) {
      expect(before.get(f)!.hp - f.hp).toBeGreaterThanOrEqual(Math.min(before.get(f)!.hp, VOI_XUNG.dmg * FIELD.hpMul) - 1e-6);
      if (f.hp > 0) expect(f.stun).toBeCloseTo(VOI_XUNG.stun, 5);
    }
    // Voi đã lao lên phía giặc.
    expect(Math.hypot(trac.x - from.x, trac.z - from.z)).toBeGreaterThan(1);
    expect(b.events.some((e: BattleEvent) => e.kind === 'charge')).toBe(true);
    expect(skillReady(b, 'voiXung')).toBe(false);
  });

  it('Hiệu triệu: 5 nghĩa binh ra quanh voi Trưng Nhị, gọi lại chỉ bù người đã ngã; quân ta quanh voi hồi máu; nghĩa binh không tính là quân mất', () => {
    const b = startFieldBattle({ id: 2, stage: 34, enemies: STAGES[33].enemies, hpScale: 1, army: { ...SAMPLE_ARMY4 }, rows: DEFAULT_ROWS, hero: TRAC, hero2: NHI(true) });
    run(b, 3.5);
    const nhi = b.fighters.find((f) => f.kind === 'trungNhi')!;
    const near = b.fighters.find((f) => f.side === 'ta' && f.kind === 'cung' && Math.hypot(f.x - nhi.x, f.z - nhi.z) <= HIEU_TRIEU.radius)!;
    near.hp = near.maxHp * 0.5;
    useSkill(b, 'hieuTrieu');
    const nghia = () => b.fighters.filter((f) => f.kind === 'nghiaBinh' && f.hp > 0 && f.state !== 'dead');
    expect(nghia().length).toBe(HIEU_TRIEU.count);
    expect(nghia()[0].maxHp).toBeCloseTo(NGHIA_BINH.hp * FIELD.hpMul, 5);
    expect(near.hp).toBeCloseTo(near.maxHp * (0.5 + HIEU_TRIEU.heal), 5);
    expect(b.events.some((e: BattleEvent) => e.kind === 'call')).toBe(true);
    // Hai người ngã; gọi lại thì chỉ bù hai người.
    for (const f of nghia().slice(0, 2)) {
      f.hp = 0;
      f.state = 'dead';
    }
    b.skillCd.hieuTrieu = 0;
    useSkill(b, 'hieuTrieu');
    expect(nghia().length).toBe(HIEU_TRIEU.count);
    expect(b.fighters.filter((f) => f.kind === 'nghiaBinh').length).toBe(HIEU_TRIEU.count + 2);
    expect('nghiaBinh' in b.lost).toBe(false);
  });

  it('bà nào kiệt sức thì chỉ bà ấy nghỉ 2 phút, bà kia ra trận một mình; cả hai kiệt sức thì màn khóa', () => {
    const s = ch5();
    expect(startStage(s, 33, SAMPLE_ARMY4, DEFAULT_ROWS).ok).toBe(true);
    const b = s.campaign.battle!;
    b.hero!.down = true;
    expect(retreat(s).ok).toBe(true);
    expect(s.haiBa.trungTrac).toBe(s.clock + HAI_BA_REST_MS);
    expect(s.haiBa.trungNhi).toBe(0);
    s.campaign.battle = null;
    s.campaign.lastResult = null;
    expect(stageHeroList(s, 33).map((h) => h.kind)).toEqual(['trungNhi']);
    expect(canStartStage(s, 33).ok).toBe(true);
    s.haiBa.trungNhi = s.clock + 1000;
    expect(canStartStage(s, 33)).toEqual({ ok: false, reason: 'haiBaKietSuc' });
    tick(s, HAI_BA_REST_MS);
    expect(stageHeroList(s, 33).map((h) => h.kind)).toEqual(['trungTrac', 'trungNhi']);
  });

  it('một bà hết máu giữa trận thì ngã, bà kia vẫn đánh', () => {
    const b = startFieldBattle({ id: 3, stage: 33, enemies: STAGES[32].enemies, hpScale: 1.8, army: { ...SAMPLE_ARMY4 }, rows: DEFAULT_ROWS, hero: TRAC, hero2: NHI(false) });
    const trac = b.fighters.find((f) => f.kind === 'trungTrac')!;
    trac.hp = 1;
    for (let i = 0; i < 20 * 60 && !b.hero!.down && !stepField(b, 0.05); i++);
    expect(b.hero!.down).toBe(true);
    expect(b.hero2!.down).toBe(false);
    expect(heroSetups(b).length).toBe(2);
    expect(b.fighters.find((f) => f.kind === 'trungNhi')!.hp).toBeGreaterThan(0);
  });

  it('giữ kinh đô: bà nào chỉ huy doanh trại thì ra từ trại ấy, bà chưa chỉ huy trại nào thì đứng trước Điện', () => {
    const s = ch5();
    s.raid.foe = 'thuy';
    const trai = barracksList(s)[0];
    expect(assignCommander(s, trai.id, 'trungNhi').ok).toBe(true);
    expect(callRaidNow(s).ok).toBe(true);
    tick(s, RAID_WARNING_MS);
    const b = s.raid.battle!;
    const at = (k: string) => b.fighters.find((f) => f.kind === k)!;
    const dien = s.buildings.find((x) => x.type === 'dien')!;
    // Trưng Nhị ra từ mặt trước doanh trại, Trưng Trắc đứng trước Điện.
    expect(Math.hypot(at('trungNhi').x - (trai.x + 2), at('trungNhi').z - (trai.z + 4))).toBeLessThan(3);
    // Trước sân Điện (Điện chưa xoay): ngay ngoài mặt trước móng, bên trái lối giữa.
    expect(Math.abs(at('trungTrac').z - (dien.z + BUILDINGS.dien.d))).toBeLessThan(1.5);
    expect(at('trungTrac').x).toBeLessThan(dien.x + BUILDINGS.dien.w / 2);
    expect(Math.hypot(at('trungTrac').x - at('trungNhi').x, at('trungTrac').z - at('trungNhi').z)).toBeGreaterThan(1);
  });
});

describe('Tô Định', () => {
  it('còn 30% máu thì bỏ chạy về cuối bãi, nhanh gấp rưỡi; chạy thoát thì tính như đã hạ', () => {
    const def = STAGES[LUY_LAU_AT - 1];
    expect(def.enemies.toDinh).toBe(1);
    const b = startFieldBattle({ id: 4, stage: LUY_LAU_AT, enemies: { toDinh: 1 }, hpScale: 1, army: { giao: 0, cung: 0, voi: 0, no: 0 }, rows: DEFAULT_ROWS, hero: TRAC });
    const td = b.fighters.find((f) => f.kind === 'toDinh')!;
    run(b, 1);
    expect(td.state).not.toBe('flee');
    td.hp = td.maxHp * (TO_DINH_FLEE.at - 0.01);
    const z0 = td.z;
    run(b, 0.5);
    expect(td.state).toBe('flee');
    expect(td.z).toBeLessThan(z0);
    // Chạy nhanh gấp rưỡi bước đi thường của hắn.
    expect((z0 - td.z) / 0.5).toBeGreaterThan(ENEMIES.toDinh.speed * 1.2);
    run(b, 60);
    expect(td.state).toBe('gone');
    expect(b.killed).toBe(1);
    expect(b.outcome).toBe('win');
    expect(b.events.some((e: BattleEvent) => e.kind === 'escape') || b.killed === 1).toBe(true);
  });
});

describe('phó bản chương 5: màn 33–36', () => {
  it('mở khi vào chương 5, cần Điện 5; mỗi màn tối đa 25 giặc, cả bãi không quá 60 người', () => {
    const s = ch5();
    s.questIndex = CH5_QUEST_START - 1;
    expect(canStartStage(s, 33)).toEqual({ ok: false, reason: 'canChuong5' });
    s.questIndex = CH5_QUEST_START;
    expect(canStartStage(s, 33).ok).toBe(true);
    expect(canStartStage(s, 34)).toEqual({ ok: false, reason: 'manKhoa' });
    const people = (Object.values(SAMPLE_ARMY4) as number[]).reduce((a, b) => a + b, 0);
    for (const def of STAGES.filter((d) => d.chapter === 5)) {
      expect(def.minDien).toBe(5);
      const foes = Object.values(def.enemies).reduce((a, n) => a + (n ?? 0), 0);
      expect(foes - (def.enemies.toDinh ?? 0)).toBeLessThanOrEqual(25);
      expect(foes + people + 2 + HIEU_TRIEU.count).toBeLessThanOrEqual(60);
    }
  });

  for (let n = 33; n <= LUY_LAU_AT; n++) {
    it(`màn ${n} (máu giặc ×${STAGES[n - 1].hpScale}): người chơi thường có Hai Bà thì thắng; không tướng, hay nửa quân, chơi giỏi cũng thua`, () => {
      for (const id of SEEDS) {
        const won = fightStage(n, SAMPLE_ARMY4, haiBa(n), 'thuong', id);
        expect(won.outcome).toBe('win');
        expect(won.t).toBeLessThanOrEqual(FIELD.maxS + 0.1);
        expect(fightStage(n, SAMPLE_ARMY4, null, 'gioi', id).outcome).toBe('lose');
        expect(fightStage(n, HALF_ARMY4, haiBa(n), 'gioi', id).outcome).toBe('lose');
      }
    });
  }

  it('gặp Tô Định (màn 36) mà không bấm kỹ năng thì thua', () => {
    for (const id of SEEDS) expect(fightStage(LUY_LAU_AT, SAMPLE_ARMY4, haiBa(LUY_LAU_AT), 'khongBam', id).outcome).toBe('lose');
  });
});

describe('truyện và nhiệm vụ chương 5 phần 2', () => {
  it('kể Đất Mê Linh khi vào chương 5, Lời thề Hát Môn khi thắng màn 33, Trưng Vương khi thắng màn 36', () => {
    const s = ch5();
    s.questIndex = CH5_QUEST_START - 1;
    expect(pendingStory(s)).toBeNull();
    s.questIndex = CH5_QUEST_START;
    expect(pendingStory(s)).toBe('meLinh');
    markStory(s, 'meLinh');
    expect(pendingStory(s)).toBeNull();
    s.campaign.cleared = HIEU_TRIEU_AT;
    expect(pendingStory(s)).toBe('hatMon');
    markStory(s, 'hatMon');
    s.campaign.cleared = LUY_LAU_AT - 1;
    expect(pendingStory(s)).toBeNull();
    s.campaign.cleared = LUY_LAU_AT;
    expect(pendingStory(s)).toBe('trungVuong');
  });

  it('nhiệm vụ 55–57: luyện 6 voi chiến, qua màn 33, hạ thành Luy Lâu', () => {
    const at = CH5_QUEST_START + 3;
    expect(QUESTS.slice(at, at + 3).map((q) => q.id)).toEqual(['luyenVoi', 'quaMan33', 'haLuyLau']);
    expect(QUESTS[at].reward).toEqual({ gao: 2500, sat: 600 });
    expect(QUESTS[at + 1].reward).toEqual({ gao: 2500, voOc: 2000 });
    expect(QUESTS[at + 2].reward).toEqual({ gao: 3000, datDa: 2000 });
    const s = ch5();
    s.questIndex = at;
    s.troops.voi = 3;
    expect(questProgress(s)).toEqual({ have: 3, need: 6 });
    s.troops.voi = 6;
    expect(questProgress(s)).toEqual({ have: 6, need: 6 });
    s.questIndex = at + 2;
    s.campaign.cleared = LUY_LAU_AT;
    const p = questProgress(s)!;
    expect(p.have).toBeGreaterThanOrEqual(p.need);
  });

  it('bản lưu 21 lên 22: thêm chỗ nghỉ của Hai Bà; lưu rồi đọc lại giữ nguyên', () => {
    const s = ch5();
    s.haiBa = { trungTrac: 5000, trungNhi: 0 };
    expect(deserialize(serialize(s))!.haiBa).toEqual({ trungTrac: 5000, trungNhi: 0 });
    const raw = JSON.parse(serialize(s));
    raw.version = 21;
    delete raw.haiBa;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.haiBa).toEqual({ trungTrac: 0, trungNhi: 0 });
  });
});
