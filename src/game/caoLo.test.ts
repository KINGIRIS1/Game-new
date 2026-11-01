// Canh chương 4 phần 3: Cao Lỗ cầm quân (Nỏ liên châu, Lệnh bắn), phó bản màn 25–32 (màn 32 cầm cự),
// bốn đoạn truyện còn lại và màn hình Hết truyện, vua xuống biển, Đền Cuông bớt thuyền, nhiệm vụ 45–49,
// bản lưu phiên bản 14.

import { describe, expect, it } from 'vitest';
import { heroSkills, holdProgress, startBattle, startFieldBattle, stepField, useSkill, wavesArrived, type Battle, type HeroSetup } from './battle';
import { canStartStage, startStage } from './campaign';
import { CAO_LO_AT, CH4_LAST, LAY_TRAO_AT, LENH_BAN_AT, LONG_NGONG_AT, caoLoJoined } from './caoLo';
import { advLook } from './coLoa';
import {
  BOAT,
  CAO_LO,
  CH4_QUEST_START,
  DEFAULT_ROWS,
  FIELD,
  GIFT_IDS,
  LENH_BAN,
  LIEN_CHAU,
  QUESTS,
  SKILLS,
  STAGES,
  UNITS,
  stageEnemies,
  type UnitType,
} from './defs';
import { canPlace, createInitialState, nextFoe, place, questProgress, tick, type GameState } from './game';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { heroFor, restingHero } from './son';
import { markStory, pendingStory } from './story';
import { HALF_ARMY4, SAMPLE_ARMY4, SEEDS, fightStage } from './testkit';
import { DIEN_END, edge, setDien } from './testmap';

type Army = Record<UnitType, number>;

/** Kinh đô chương 4: Điện cấp 8, doanh trại cấp 5, ba đền, An Dương Vương có nỏ thần và Rùa Vàng, đã qua màn 24. */
function ch4(): GameState {
  const s = createInitialState(0);
  setDien(s, 8);
  s.resources = { gao: 60000, voOc: 60000, datDa: 60000, sat: 60000 };
  s.dan = 40;
  s.questIndex = CH4_QUEST_START;
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: true, restUntil: 0, ascended: true };
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  s.son.non = true;
  s.son.won = true;
  s.adv = { no: true, restUntil: 0, kimQuy: true, won: true, layTrao: false, bien: false };
  s.campaign.cleared = 24;
  const barracks = place(s, 'doanhTrai', DIEN_END + 1, DIEN_END + 1);
  if (!barracks.ok) throw new Error(barracks.reason);
  barracks.value.level = 5;
  s.troops = { ...SAMPLE_ARMY4 };
  for (const id of ['mo', 'suGia', 'vuonVai', 'roiGay', 'ketChuong', 'langLieu', 'kenRe', 'ruocDau', 'doiNon', 'ketChuong2', 'cotDa', 'dietYeu', 'noThan', 'kimQuy', 'ketChuong3', 'cauHon'] as const) {
    markStory(s, id);
  }
  return s;
}

/** Đánh màn `n` tới khi xong, bấm kỹ năng ngay khi hồi. */
function play(s: GameState, n: number): void {
  const r = startStage(s, n, { ...s.troops }, { ...DEFAULT_ROWS });
  if (!r.ok) throw new Error(r.reason);
  const b = s.campaign.battle!;
  for (let i = 0; i < 20 * 120 && !b.outcome; i++) {
    for (const k of b.skills) useSkill(b, k);
    tick(s, 50);
  }
}

const ADV: HeroSetup = { kind: 'anDuong', bamboo: false, glow: false, non: false, kimQuy: true };
const cao = (lenhBan: boolean): HeroSetup => ({ kind: 'caoLo', bamboo: false, glow: false, non: false, lenhBan });
/** Tướng của từng màn chương 4 trong chuẩn cân bằng: màn 25 An Dương Vương; Cao Lỗ từ màn 26, có Lệnh bắn từ màn 31. */
const heroOf = (n: number) => (n === CAO_LO_AT ? ADV : cao(n > LENH_BAN_AT));

describe('Cao Lỗ cầm quân', () => {
  it('thắng màn 25 thì Cao Lỗ cầm quân; màn 26–32 cần Cao Lỗ, đang kiệt sức thì khóa', () => {
    const s = ch4();
    expect(canStartStage(s, 25).ok).toBe(true);
    expect(canStartStage(s, 26)).toEqual({ ok: false, reason: 'manKhoa' });
    s.campaign.cleared = 25;
    expect(caoLoJoined(s)).toBe(true);
    expect(canStartStage(s, 26).ok).toBe(true);
    s.caoLo.restUntil = s.clock + 60_000;
    expect(canStartStage(s, 26)).toEqual({ ok: false, reason: 'caoLoKietSuc' });
    // Chưa vào chương 4 thì chưa đánh được màn chương 4.
    const early = ch4();
    early.questIndex = CH4_QUEST_START - 1;
    expect(canStartStage(early, 25)).toEqual({ ok: false, reason: 'canChuong4' });
  });

  it('màn 25 có An Dương Vương, màn 26 trở đi có Cao Lỗ; chưa thắng màn 30 thì chưa có Lệnh bắn', () => {
    const s = ch4();
    s.campaign.cleared = 26;
    expect(heroFor(s, 4, 25)?.kind).toBe('anDuong');
    expect(heroFor(s, 4, 26)?.kind).toBe('caoLo');
    expect(heroSkills(heroFor(s, 4, 26)!)).toEqual(['lienChau']);
    s.caoLo.lenhBan = true;
    expect(heroSkills(heroFor(s, 4, 31)!)).toEqual(['lienChau', 'lenhBan']);
  });

  it('giữ kinh đô: An Dương Vương tới khi xuống biển, rồi Cao Lỗ; kiệt sức thì Cao Lỗ, Sơn Tinh, Gióng ra thay', () => {
    const s = ch4();
    s.campaign.cleared = 26;
    expect(heroFor(s, 4)?.kind).toBe('anDuong');
    s.adv.restUntil = s.clock + 60_000;
    expect(heroFor(s, 4)?.kind).toBe('caoLo');
    expect(restingHero(s, 4)?.kind).toBe('anDuong');
    s.caoLo.restUntil = s.clock + 60_000;
    expect(heroFor(s, 4)?.kind).toBe('sonTinh');
    s.adv.restUntil = 0;
    s.caoLo.restUntil = 0;
    s.adv.bien = true;
    expect(heroFor(s, 4)?.kind).toBe('caoLo');
    expect(restingHero(s, 4)).toBeNull();
    // Thủy binh và quân Triệu ở chương 4 tính như trận chương 4.
    s.raid.foe = 'thuy';
    s.raid.phase = 'idle';
    expect(nextFoe(s)).toBe('thuyBinh');
  });

  it('Nỏ liên châu: loạt tên rơi xuống chỗ giặc đông nhất, trúng mọi giặc trong vùng, không trúng giặc ở xa', () => {
    const b = startFieldBattle({ id: 1, stage: 26, enemies: { linhThuy: 6 }, hpScale: 3, army: { giao: 0, cung: 0, voi: 0, no: 0 }, rows: DEFAULT_ROWS, hero: cao(false) });
    const foes = b.fighters.filter((f) => f.side === 'giac');
    // Năm tên đứng sát nhau, một tên đứng xa.
    foes.forEach((f, i) => {
      f.x = i < 5 ? 4 + (i % 3) * 0.5 : 0.5;
      f.z = i < 5 ? 6 + Math.floor(i / 3) * 0.5 : 0.5;
    });
    const before = foes.map((f) => f.hp);
    expect(useSkill(b, 'lienChau')).toBe(true);
    const lost = foes.map((f, i) => before[i] - f.hp);
    for (let i = 0; i < 5; i++) expect(lost[i]).toBeCloseTo(LIEN_CHAU.dmg * FIELD.hpMul, 5);
    expect(lost[5]).toBe(0);
    expect(b.skillCd.lienChau).toBe(SKILLS.lienChau.cooldown);
  });

  it('Lệnh bắn: trong lúc có lệnh, lính nỏ bắn nhanh gấp đôi; ở kinh đô cả ụ nỏ và lầu nỏ', () => {
    const shotsIn = (lenh: boolean): number => {
      const b = startFieldBattle({ id: 2, stage: 31, enemies: { linhRiu: 4 }, hpScale: 50, army: { giao: 0, cung: 0, voi: 0, no: 4 }, rows: DEFAULT_ROWS, hero: cao(true) });
      // Giặc đứng yên ngay trong tầm lính nỏ.
      for (const f of b.fighters.filter((x) => x.side === 'giac')) {
        f.z = FIELD.d - 6;
        f.stun = 99;
      }
      for (const f of b.fighters.filter((x) => x.kind === 'no')) f.z = FIELD.d - 2;
      const hero = b.fighters.find((f) => f.kind === 'caoLo')!;
      hero.z = FIELD.d - 0.5;
      hero.x = 0.3;
      if (lenh) expect(useSkill(b, 'lenhBan')).toBe(true);
      const seq0 = b.seq;
      for (let i = 0; i < 20 * SKILLS.lenhBan.duration - 1; i++) stepField(b, 0.05);
      return b.events.filter((e) => e.seq > seq0 && e.kind === 'shot' && e.by === 'no').length;
    };
    const slow = shotsIn(false);
    const fast = shotsIn(true);
    expect(slow).toBeGreaterThan(0);
    expect(fast / slow).toBeGreaterThanOrEqual(LENH_BAN.rate * 0.75);
  });

  it('Cao Lỗ mạnh xấp xỉ An Dương Vương, mạnh hơn hẳn số ban đầu', () => {
    expect(CAO_LO.range).toBeGreaterThan(UNITS.cung.range);
    // Cùng một màn, người chơi thường có Cao Lỗ hay An Dương Vương đều thắng.
    for (const id of SEEDS) {
      expect(fightStage(26, SAMPLE_ARMY4, cao(false), 'thuong', id).outcome).toBe('win');
      expect(fightStage(26, SAMPLE_ARMY4, ADV, 'thuong', id).outcome).toBe('win');
    }
  });
});

describe('cân bằng phó bản chương 4', () => {
  it('quân mẫu chương 4 vừa 38 chỗ; mỗi màn tối đa 28 giặc, cả bãi không quá 60 người', () => {
    const space = (a: Army) => (Object.keys(a) as UnitType[]).reduce((n, k) => n + a[k] * UNITS[k].space, 0);
    expect(space(SAMPLE_ARMY4)).toBe(38);
    const people = (Object.values(SAMPLE_ARMY4) as number[]).reduce((a, b) => a + b, 0);
    for (const def of STAGES.filter((d) => d.chapter === 4)) {
      const foes = Object.values(stageEnemies(def)).reduce((a, b) => a + (b ?? 0), 0);
      expect(foes - (def.enemies.trieuDa ?? 0) - (def.waves?.some((w) => w.enemies.trieuDa) ? 1 : 0)).toBeLessThanOrEqual(28);
      expect(foes + people + 1).toBeLessThanOrEqual(60);
    }
  });

  for (let n = 25; n <= 32; n++) {
    it(`màn ${n}: người chơi thường có ${n === 25 ? 'An Dương Vương' : 'Cao Lỗ'} thì thắng; không tướng, hay nửa quân, chơi giỏi cũng thua`, () => {
      for (const id of SEEDS) {
        const won = fightStage(n, SAMPLE_ARMY4, heroOf(n), 'thuong', id);
        expect(won.outcome).toBe('win');
        expect(won.t).toBeLessThanOrEqual(FIELD.maxS + 0.1);
        expect(fightStage(n, SAMPLE_ARMY4, null, 'gioi', id).outcome).toBe('lose');
        expect(fightStage(n, HALF_ARMY4, heroOf(n), 'gioi', id).outcome).toBe('lose');
      }
    });
  }

  it('tướng thủy binh (màn 28) và Triệu Đà ở đường ra biển (màn 32) cần bấm kỹ năng mới thắng', () => {
    for (const n of [28, CH4_LAST]) for (const id of SEEDS) expect(fightStage(n, SAMPLE_ARMY4, heroOf(n), 'khongBam', id).outcome).toBe('lose');
  });
});

describe('màn 32: hộ giá ra biển', () => {
  const def = STAGES[CH4_LAST - 1];
  /** Chạy trận tới giây `until` (hay tới khi xong), không quá thời gian tối đa của bãi chiến. */
  const run = (b: Battle, until = Infinity) => {
    for (let i = 0; i < 20 * (FIELD.maxS + 10) && b.t < until && !stepField(b, 0.05); i++);
  };

  it('giặc tới ba đợt lúc 0, 30 và 60 giây; Triệu Đà ở đợt cuối; tổng số giặc tính cả các đợt sau', () => {
    expect(def.holdS).toBe(90);
    expect(def.waves!.map((w) => w.at)).toEqual([30, 60]);
    expect(def.waves![1].enemies.trieuDa).toBe(1);
    const b = startFieldBattle({ id: 3, stage: CH4_LAST, enemies: def.enemies, waves: def.waves, holdS: def.holdS, hpScale: 50, army: { ...SAMPLE_ARMY4 }, rows: DEFAULT_ROWS, hero: cao(true) });
    // Quân ta không chết, giặc không chết: trận kéo dài cho tới hết giờ.
    for (const f of b.fighters) if (f.side === 'ta') f.hp = f.maxHp = 1e9;
    const all = Object.values(stageEnemies(def)).reduce((a, n) => a + (n ?? 0), 0);
    expect(b.total).toBe(all);
    expect(b.fighters.filter((f) => f.side === 'giac').length).toBe(10);
    expect(wavesArrived(b)).toBe(1);
    run(b, 30);
    expect(wavesArrived(b)).toBe(2);
    expect(b.fighters.filter((f) => f.side === 'giac').length).toBe(20);
    run(b, 60);
    expect(wavesArrived(b)).toBe(3);
    expect(b.fighters.some((f) => f.kind === 'trieuDa')).toBe(true);
  });

  it('đầy thanh "Vua tới biển" mà quân ta chưa chết hết thì thắng, dù giặc còn; chết hết trước thì thua', () => {
    // Giặc khỏe như núi: không ai hạ được ai cho tới hết giờ.
    const b = startFieldBattle({ id: 4, stage: CH4_LAST, enemies: def.enemies, waves: def.waves, holdS: def.holdS, hpScale: 400, army: { giao: 0, cung: 0, voi: 2, no: 0 }, rows: DEFAULT_ROWS, hero: null });
    for (const f of b.fighters) if (f.side === 'ta') f.hp = f.maxHp = 1e9;
    run(b);
    expect(b.outcome).toBe('win');
    expect(b.t).toBeGreaterThanOrEqual(def.holdS!);
    expect(holdProgress(b)).toBe(1);
    expect(b.killed).toBeLessThan(b.total);
    // Quân ta yếu ớt: chết hết trước khi vua tới biển.
    const weak = startFieldBattle({ id: 5, stage: CH4_LAST, enemies: def.enemies, waves: def.waves, holdS: def.holdS, hpScale: 3, army: { giao: 2, cung: 0, voi: 0, no: 0 }, rows: DEFAULT_ROWS, hero: null });
    run(weak);
    expect(weak.outcome).toBe('lose');
    expect(weak.t).toBeLessThan(def.holdS!);
  });
});

describe('truyện, vua xuống biển và Đền Cuông', () => {
  it('kể các đoạn chương 4 đúng thứ tự, khi thắng màn 25, 28, 31, 32; sau đoạn cuối là màn hình Hết truyện', () => {
    const s = ch4();
    expect(pendingStory(s)).toBeNull();
    s.campaign.cleared = CAO_LO_AT;
    expect(pendingStory(s)).toBe('caoLoCamQuan');
    markStory(s, 'caoLoCamQuan');
    s.campaign.cleared = LAY_TRAO_AT;
    s.adv.layTrao = true;
    expect(pendingStory(s)).toBe('layNo');
    markStory(s, 'layNo');
    s.campaign.cleared = LONG_NGONG_AT;
    expect(pendingStory(s)).toBe('longNgong');
    markStory(s, 'longNgong');
    expect(pendingStory(s)).toBeNull();
    s.campaign.cleared = CH4_LAST;
    s.adv.bien = true;
    expect(pendingStory(s)).toBe('ngocTrai');
    markStory(s, 'ngocTrai');
    expect(pendingStory(s)).toBe('hetTruyen');
    markStory(s, 'hetTruyen');
    expect(pendingStory(s)).toBeNull();
  });

  it('đánh thật: thắng màn 28 thì lẫy bị tráo, màn 30 có Lệnh bắn, màn 32 vua xuống biển và mở Đền Cuông', () => {
    const s = ch4();
    s.campaign.cleared = 27;
    s.resources.gao = 1e6;
    expect(canPlace(s, 'denCuong', edge(8, 1), edge(8, 1))).toEqual({ ok: false, reason: 'canKetChuong4' });
    play(s, LAY_TRAO_AT);
    expect(s.campaign.lastResult?.outcome).toBe('win');
    expect(s.adv.layTrao).toBe(true);
    s.troops = { ...SAMPLE_ARMY4 };
    s.campaign.battle = null;
    s.campaign.cleared = 29;
    play(s, LENH_BAN_AT);
    expect(s.caoLo.lenhBan).toBe(true);
    s.troops = { ...SAMPLE_ARMY4 };
    s.campaign.battle = null;
    s.campaign.cleared = 31;
    expect(advLook(s)).toBe('noThan');
    play(s, CH4_LAST);
    expect(s.campaign.lastResult?.outcome).toBe('win');
    expect(s.campaign.battle!.seaWin).toBe(true);
    expect(s.adv.bien).toBe(true);
    // Vua không còn đứng ở Điện, không giữ kinh đô nữa; phó bản màn 17–25 vẫn hiển linh ra trận.
    expect(advLook(s)).toBeNull();
    expect(heroFor(s, 4)?.kind).toBe('caoLo');
    expect(heroFor(s, 3)).toMatchObject({ kind: 'anDuong', glow: true });
    expect(heroFor(s, 4, 25)).toMatchObject({ kind: 'anDuong', glow: true });
    s.campaign.battle = null;
    expect(canPlace(s, 'denCuong', edge(8, 1), edge(8, 1)).ok).toBe(true);
  });

  it('Đền Cuông còn nguyên: mỗi đợt thủy binh bớt 20% số thuyền (làm tròn xuống, còn ít nhất một), bớt chừng ấy lính', () => {
    const s = ch4();
    const plain = startBattle(s, 1, 'nam', { land: { foe: 'thuyBinh', n: 9 } });
    const fewer = startBattle(s, 1, 'nam', { land: { foe: 'thuyBinh', n: 9 }, fewerBoats: true });
    const boats = plain.boats.length;
    expect(fewer.boats.length).toBe(Math.max(1, Math.floor(boats * 0.8)));
    expect(fewer.total).toBe(Math.min(plain.total, fewer.boats.length * BOAT.carry));
    // Đợt nhỏ chỉ một thuyền thì vẫn còn một thuyền.
    const one = startBattle(s, 1, 'nam', { land: { foe: 'thuyBinh', n: 1 }, fewerBoats: true });
    expect(one.boats.length).toBeGreaterThanOrEqual(1);
    // Ở kinh đô: có đền thì đợt thủy binh tới ít thuyền hơn.
    s.adv.bien = true;
    expect(place(s, 'denCuong', edge(8, 1), edge(8, 1)).ok).toBe(true);
    s.raid.nextAt = s.clock;
    s.raid.foe = 'thuy';
    tick(s, 50);
    tick(s, 60_000);
    expect(s.raid.battle?.foe).toBe('thuyBinh');
    expect(s.raid.battle?.boats.length).toBe(Math.max(1, Math.floor(Math.ceil(19 / BOAT.carry) * 0.8)));
  });

  it('nhiệm vụ 45–49: qua màn 25, 28, 30, 32 và dựng Đền Cuông', () => {
    const ids = QUESTS.map((q) => q.id);
    expect(ids.slice(CH4_QUEST_START + 5)).toEqual(['quaMan25', 'quaMan28', 'quaMan30', 'hoGia', 'denCuong']);
    const s = ch4();
    s.questIndex = ids.indexOf('hoGia');
    expect(questProgress(s)).toEqual({ have: 24, need: 32 });
    s.campaign.cleared = 32;
    expect(questProgress(s)).toEqual({ have: 32, need: 32 });
    s.questIndex = ids.indexOf('denCuong');
    expect(questProgress(s)).toEqual({ have: 0, need: 1 });
  });
});

describe('bản lưu phiên bản 14', () => {
  it('lưu và nạp lại giữ nguyên Cao Lỗ và vua đã xuống biển', () => {
    const s = ch4();
    s.campaign.cleared = 32;
    s.caoLo = { restUntil: 1234, lenhBan: true };
    s.adv.bien = true;
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('nâng bản lưu 13 lên 14: thêm Cao Lỗ chưa nghỉ, chưa có Lệnh bắn; vua chưa xuống biển', () => {
    const old = JSON.parse(serialize(ch4())) as Record<string, any>;
    old.version = 13;
    delete old.caoLo;
    delete old.adv.bien;
    const back = deserialize(JSON.stringify(old))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.caoLo).toEqual({ restUntil: 0, lenhBan: false });
    expect(back.adv.bien).toBe(false);
  });
});
