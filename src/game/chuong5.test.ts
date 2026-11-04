// Canh chương 5 phần 1: vào chương 5 (nhận thưởng nhiệm vụ 51), Điện 10 mở theo chương, quân Hán (lính kích, nỏ thủ,
// giáp sĩ) đánh kinh đô xen với lũ, nhiệm vụ 54, bản lưu phiên bản 20.

import { describe, expect, it } from 'vitest';
import { startBattle, useSkill, type Battle } from './battle';
import { inChapter5 } from './chuong5';
import {
  CH5_QUEST_START,
  ENEMIES,
  FIRST_HAN_MS,
  GIFT_IDS,
  QUESTS,
  RAID_WARNING_MS,
  SKILL_IDS,
  UNITS,
  hanForces,
  hanHpScale,
} from './defs';
import { callRaidNow, canUpgrade, claimQuest, createInitialState, nextFoe, place, questProgress, tick, upgrade, type GameState } from './game';
import { chapterOf } from './manVao';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { heroFor, restingHero } from './son';
import { markStory } from './story';
import { SAMPLE_ARMY4 } from './testkit';
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
    expect(QUESTS.slice(CH5_QUEST_START).map((q) => q.id)).toEqual(['dien10', 'cap10', 'chongHan']);
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

  it('đợt quân Hán đầu: quân mẫu, Cao Lỗ và 5 chòi canh diệt hết; tính cho nhiệm vụ', () => {
    const s = ch5();
    for (const [x, z] of TOWERS) expect(place(s, 'choiCanh', x, z).ok).toBe(true);
    s.raid.foe = 'thuy';
    expect(callRaidNow(s).ok).toBe(true);
    expect(s.raid.foe).toBe('han');
    expect(['bac', 'tay']).toContain(s.raid.side);
    tick(s, RAID_WARNING_MS);
    expect(s.raid.battle?.hero?.kind).toBe('caoLo');
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

  it('giữ kinh đô chương 5: Cao Lỗ; kiệt sức thì Sơn Tinh, rồi Gióng ra thay. Mùa lũ vẫn là Sơn Tinh', () => {
    const s = ch5();
    expect(heroFor(s, 5)?.kind).toBe('caoLo');
    expect(restingHero(s, 5)).toBeNull();
    s.caoLo.restUntil = s.clock + 60_000;
    expect(heroFor(s, 5)?.kind).toBe('sonTinh');
    expect(restingHero(s, 5)?.kind).toBe('caoLo');
    s.son.restUntil = s.clock + 60_000;
    expect(heroFor(s, 5)?.kind).toBe('giong');
    s.caoLo.restUntil = 0;
    s.son.restUntil = 0;
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
    expect(SAVE_VERSION).toBe(20);
    expect(back.raid.han).toBe(3);
    expect(back.raid.hanHeld).toBe(2);
    expect(back.raid.foe).toBe('han');
  });

  it('nâng bản lưu 19 lên 20: thêm số đợt quân Hán; đã ở chương 5 thì hẹn quân Hán', () => {
    for (const questIndex of [CH5_QUEST_START - 1, CH5_QUEST_START, CH5_QUEST_START + 2]) {
      const s = ch5();
      s.questIndex = questIndex;
      s.clock = 50_000;
      s.raid.nextAt = s.clock + 10 * 60_000;
      s.raid.foe = 'thuyBinh';
      const raw = JSON.parse(serialize(s));
      raw.version = 19;
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
