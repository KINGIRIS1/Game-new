// Canh chương 4 phần 4: thử thách phó bản (mở sau khi thắng màn, ba kiểu luật, độ khó mọi thử thách theo chuẩn đã
// chốt) và huân công (chỉ cho một lần, mua bậc, tăng sức ở mọi trận), bản lưu phiên bản 15.

import { describe, expect, it } from 'vitest';
import { huanBonus, isHero, startBattle, startFieldBattle, stepField, type Battle } from './battle';
import { canStartStage, startStage, updateCampaign } from './campaign';
import {
  CHALLENGES,
  CH4_QUEST_START,
  DEFAULT_ROWS,
  ENEMIES,
  FIELD,
  GIAC_DU_DMG,
  GIFT_IDS,
  HUAN_BONUS,
  HUAN_BRANCHES,
  HUAN_COST,
  STAGES,
  UNITS,
  type ChallengeKind,
  type EnemyType,
  type UnitType,
} from './defs';
import { createInitialState, place, type GameState } from './game';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { heroFor } from './son';
import { markStory } from './story';
import { FIELD_SLOTS, SAMPLE_ARMY, SAMPLE_ARMY4, SEEDS, challengeArmy, fightChallenge, lateHero } from './testkit';
import { buyHuan, canBuyHuan, challengeEnemies, challengeOf, challengeOpen, huanEarned, huanReward } from './thuThach';
import { DIEN_END, setDien } from './testmap';

/** Kinh đô đã hết truyện: Điện cấp 8, doanh trại cấp 5, mọi tướng đã về, đã qua màn 32. */
function late(): GameState {
  const s = createInitialState(0);
  setDien(s, 8);
  s.resources = { gao: 60000, voOc: 60000, datDa: 60000, sat: 60000 };
  s.dan = 40;
  s.questIndex = CH4_QUEST_START + 10;
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: true, restUntil: 0, ascended: true };
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  s.son.non = true;
  s.son.won = true;
  s.adv = { no: true, restUntil: 0, kimQuy: true, won: true, layTrao: true, bien: true };
  s.caoLo = { restUntil: 0, lenhBan: true };
  s.campaign.cleared = 32;
  const barracks = place(s, 'doanhTrai', DIEN_END + 1, DIEN_END + 1);
  if (!barracks.ok) throw new Error(barracks.reason);
  barracks.value.level = 5;
  s.troops = { ...SAMPLE_ARMY4 };
  for (const id of ['mo', 'suGia', 'vuonVai', 'roiGay', 'ketChuong', 'langLieu', 'kenRe', 'ruocDau', 'doiNon', 'ketChuong2', 'cotDa', 'dietYeu', 'noThan', 'kimQuy', 'ketChuong3', 'cauHon', 'caoLoCamQuan', 'layNo', 'longNgong', 'ngocTrai', 'hetTruyen'] as const) {
    markStory(s, id);
  }
  return s;
}

/** Cho trận phó bản đang đánh kết thúc ngay: diệt hết giặc (thắng) hay quân ta ngã hết (thua). */
function finish(s: GameState, outcome: 'win' | 'lose'): void {
  const b = s.campaign.battle!;
  for (const f of b.fighters) {
    if ((outcome === 'win') !== (f.side === 'giac')) continue;
    f.hp = 0;
    f.state = isHero(f.kind) ? 'gone' : 'dead';
  }
  b.waves = [];
  b.holdS = undefined;
  updateCampaign(s, 100);
}

const ARMY = (s: GameState) => ({ ...s.troops });
const only = (s: GameState, keep: UnitType[]) => {
  const army = { giao: 0, cung: 0, voi: 0, no: 0 };
  for (const k of keep) army[k] = s.troops[k];
  return army;
};

describe('mở thử thách', () => {
  it('thắng màn nào ở chế độ thường thì màn ấy mở thử thách, ở chương nào cũng vậy', () => {
    const s = late();
    s.campaign.cleared = 26;
    for (const n of [1, 9, 17, 26]) {
      expect(challengeOpen(s, n)).toBe(true);
      expect(canStartStage(s, n, true)).toEqual({ ok: true, value: undefined });
    }
    expect(challengeOpen(s, 27)).toBe(false);
    expect(canStartStage(s, 27, true)).toEqual({ ok: false, reason: 'thuThachKhoa' });
    // Màn 27 vẫn đánh được ở chế độ thường.
    expect(canStartStage(s, 27).ok).toBe(true);
  });

  it('kiểu thử thách từng màn đúng như đã chốt', () => {
    const by = (kind: ChallengeKind) => CHALLENGES.map((c, i) => (c.kind === kind ? i + 1 : 0)).filter(Boolean);
    expect(CHALLENGES.length).toBe(STAGES.length);
    expect(by('giacDu')).toEqual([1, 3, 4, 8, 12, 16, 19, 24, 28, 32]);
    expect(by('khongTuong')).toEqual([5, 7, 9, 11, 14, 17, 20, 22, 25, 27, 30]);
    expect(by('haiBinh')).toEqual([2, 6, 10, 13, 15, 18, 21, 23, 26, 29, 31]);
    for (const [i, c] of CHALLENGES.entries()) {
      if (c.kind !== 'haiBinh') continue;
      const n = i + 1;
      expect(c.units![0]).not.toBe(c.units![1]);
      // Lính nỏ chỉ có từ chương 4 (màn 25 trở đi).
      if (n < 25) expect(c.units).not.toContain('no');
    }
  });
});

describe('luật từng kiểu thử thách', () => {
  it('Không tướng: không tướng nào ra trận, tướng của màn đang nghỉ vẫn đánh được', () => {
    const s = late();
    expect(challengeOf(5)!.kind).toBe('khongTuong');
    s.giong.restUntil = s.clock + 60_000;
    expect(canStartStage(s, 5)).toEqual({ ok: false, reason: 'giongKietSuc' });
    expect(startStage(s, 5, ARMY(s), DEFAULT_ROWS, true).ok).toBe(true);
    const b = s.campaign.battle!;
    expect(b.hero).toBeNull();
    expect(b.fighters.some((f) => isHero(f.kind))).toBe(false);
    expect(b.skills).toEqual(['trongTran']);
  });

  it('Không tướng mà không mang quân thì không xuất quân được', () => {
    const s = late();
    expect(startStage(s, 5, { giao: 0, cung: 0, voi: 0, no: 0 }, DEFAULT_ROWS, true)).toEqual({ ok: false, reason: 'chuaChonQuan' });
  });

  it('Hai binh chủng: mang binh chủng khác thì không xuất quân được', () => {
    const s = late();
    const ch = challengeOf(26)!;
    expect(ch).toMatchObject({ kind: 'haiBinh', units: ['giao', 'no'] });
    expect(startStage(s, 26, { ...only(s, ['giao', 'no']), cung: 1 }, DEFAULT_ROWS, true)).toEqual({ ok: false, reason: 'thuThachBinhChung' });
    expect(startStage(s, 26, only(s, ['giao', 'no']), DEFAULT_ROWS, true).ok).toBe(true);
    // Tướng vẫn ra trận như màn thường.
    expect(s.campaign.battle!.hero?.kind).toBe('caoLo');
  });

  it('Giặc dữ: giặc gây sát thương ×1,25', () => {
    const run = (fury?: number) => {
      const def = STAGES[3];
      return startFieldBattle({ id: 7, stage: 4, enemies: def.enemies, hpScale: 1, army: SAMPLE_ARMY, rows: DEFAULT_ROWS, fury });
    };
    const a = run();
    const b = run(GIAC_DU_DMG);
    const ours = (x: Battle) => x.fighters.filter((f) => f.side === 'ta').reduce((n, f) => n + f.hp, 0);
    const full = ours(a);
    for (let i = 0; i < 2000 && ours(a) === full; i++) {
      stepField(a, 0.05);
      stepField(b, 0.05);
    }
    expect(full - ours(a)).toBeGreaterThan(0);
    expect(full - ours(b)).toBeCloseTo((full - ours(a)) * GIAC_DU_DMG, 5);
  });

  it('thử thách dùng hệ số máu giặc riêng, ghi kiểu thử thách vào trận', () => {
    const s = late();
    for (const n of [4, 5, 26]) {
      s.campaign.battle = null;
      const army = n === 26 ? only(s, ['giao', 'no']) : ARMY(s);
      expect(startStage(s, n, army, DEFAULT_ROWS, true).ok).toBe(true);
      const b = s.campaign.battle!;
      const ch = challengeOf(n)!;
      expect(b.challenge).toBe(ch.kind);
      expect(b.fury).toBe(ch.kind === 'giacDu' ? GIAC_DU_DMG : undefined);
      const foe = b.fighters.find((f) => f.side === 'giac')!;
      expect(foe.maxHp).toBeCloseTo(ENEMIES[foe.kind as EnemyType].hp * ch.hpScale * FIELD.hpMul, 5);
    }
  });

  it('màn 1–4 vốn ít giặc nên thử thách có thêm giặc, đông ngang màn 5–8; bãi chiến không quá 60 người', () => {
    const count = (e: Partial<Record<EnemyType, number>>) => Object.values(e).reduce((a, b) => a + (b ?? 0), 0);
    for (let n = 1; n <= STAGES.length; n++) {
      const ch = challengeOf(n)!;
      expect(!!ch.extra).toBe(n <= 4);
      const foes = count(challengeEnemies(n));
      if (n <= 4) expect(foes).toBeGreaterThanOrEqual(count(STAGES[4].enemies));
      else expect(challengeEnemies(n)).toEqual(STAGES[n - 1].enemies);
      // Quân mẫu 30 người, một tướng.
      expect(foes + 30 + 1).toBeLessThanOrEqual(60);
    }
    const s = late();
    expect(startStage(s, 1, ARMY(s), DEFAULT_ROWS, true).ok).toBe(true);
    expect(s.campaign.battle!.total).toBe(count(challengeEnemies(1)));
    expect(s.campaign.battle!.fighters.filter((f) => f.side === 'giac' && f.kind === 'chienXa').length).toBe(3);
  });

  it('màn 32 thử thách vẫn là cầm cự 90 giây', () => {
    const s = late();
    expect(startStage(s, 32, ARMY(s), DEFAULT_ROWS, true).ok).toBe(true);
    expect(s.campaign.battle!.holdS).toBe(90);
    expect(s.campaign.battle!.waveCount).toBe(3);
  });
});

describe('huân công', () => {
  it('cả 32 thử thách cho đúng 80 huân công, bằng giá mua đủ năm nhánh', () => {
    const total = STAGES.reduce((n, _, i) => n + huanReward(i + 1), 0);
    expect(total).toBe(80);
    expect([huanReward(1), huanReward(9), huanReward(17), huanReward(25)]).toEqual([1, 2, 3, 4]);
    expect(HUAN_COST.reduce((a, b) => a + b, 0) * HUAN_BRANCHES.length).toBe(80);
  });

  it('thắng thử thách lần đầu được huân công, không có của cải, không mở màn mới; thắng lại không có thêm', () => {
    const s = late();
    s.campaign.cleared = 26;
    const res = { ...s.resources };
    expect(startStage(s, 25, ARMY(s), DEFAULT_ROWS, true).ok).toBe(true);
    finish(s, 'win');
    expect(s.campaign.lastResult).toMatchObject({ stage: 25, outcome: 'win', first: false, reward: {}, challenge: { kind: 'khongTuong', huan: 4 } });
    expect(s.thuThach).toMatchObject({ huan: 4, won: [25] });
    expect(s.resources).toEqual(res);
    expect(s.campaign.cleared).toBe(26);
    s.campaign.battle = null;
    expect(startStage(s, 25, ARMY(s), DEFAULT_ROWS, true).ok).toBe(true);
    finish(s, 'win');
    expect(s.campaign.lastResult!.challenge).toEqual({ kind: 'khongTuong', huan: 0 });
    expect(s.thuThach).toMatchObject({ huan: 4, won: [25] });
  });

  it('thua thử thách thì chỉ mất lính tử trận như thường', () => {
    const s = late();
    const giao = s.troops.giao;
    expect(startStage(s, 12, ARMY(s), DEFAULT_ROWS, true).ok).toBe(true);
    s.campaign.battle!.lost.giao = 3;
    finish(s, 'lose');
    expect(s.campaign.lastResult).toMatchObject({ outcome: 'lose', challenge: { kind: 'giacDu', huan: 0 } });
    expect(s.troops.giao).toBe(giao - 3);
    expect(s.thuThach).toMatchObject({ huan: 0, won: [] });
  });

  it('mua bậc: giá 3, 5, 8; thiếu huân công hay đủ 3 bậc thì không mua được', () => {
    const s = late();
    expect(canBuyHuan(s, 'giao')).toEqual({ ok: false, reason: 'thieuHuanCong' });
    s.thuThach.huan = 16;
    expect(buyHuan(s, 'giao')).toEqual({ ok: true, value: 1 });
    expect(s.thuThach.huan).toBe(13);
    expect(buyHuan(s, 'giao')).toEqual({ ok: true, value: 2 });
    expect(buyHuan(s, 'giao')).toEqual({ ok: true, value: 3 });
    expect(s.thuThach.huan).toBe(0);
    expect(canBuyHuan(s, 'giao')).toEqual({ ok: false, reason: 'huanToiDa' });
    expect(huanEarned(s)).toBe(16);
  });

  it('mỗi bậc thêm 4% máu và sức đánh cho binh chủng ấy, nhánh tướng cho mọi tướng, cộng với binh khí và Đền', () => {
    const def = STAGES[25];
    const fight = (huan?: Record<string, number>) =>
      startFieldBattle({ id: 1, stage: 26, enemies: def.enemies, hpScale: 1, army: SAMPLE_ARMY4, rows: DEFAULT_ROWS, hero: lateHero(26), bonus: 0.1, arms: { giao: 2, cung: 0, voi: 0, no: 0 }, huan: huan as never });
    const tiers = { giao: 2, cung: 0, voi: 3, no: 1, tuong: 3 };
    const base = fight();
    const up = fight(tiers);
    const hpOf = (b: Battle, kind: string) => b.fighters.find((f) => f.side === 'ta' && f.kind === kind)!.maxHp;
    expect(hpOf(up, 'giao') / hpOf(base, 'giao')).toBeCloseTo((1 + 0.1 + 0.2 + 2 * HUAN_BONUS) / 1.3, 5);
    expect(hpOf(up, 'cung') / hpOf(base, 'cung')).toBeCloseTo(1, 5);
    expect(hpOf(up, 'voi') / hpOf(base, 'voi')).toBeCloseTo(1 + (3 * HUAN_BONUS) / 1.1, 5);
    expect(hpOf(up, 'caoLo') / hpOf(base, 'caoLo')).toBeCloseTo(1 + (3 * HUAN_BONUS) / 1.1, 5);
    expect(huanBonus(up, 'no')).toBeCloseTo(HUAN_BONUS, 5);
    expect(huanBonus(up, 'giong')).toBeCloseTo(3 * HUAN_BONUS, 5);
    expect(huanBonus(up, 'linhTrieu')).toBe(0);
  });

  it('huân công có tác dụng cả khi giữ kinh đô và khi xuất quân phó bản', () => {
    const s = late();
    s.thuThach.bac = { giao: 3, cung: 0, voi: 0, no: 0, tuong: 0 };
    expect(startStage(s, 26, ARMY(s), DEFAULT_ROWS).ok).toBe(true);
    expect(s.campaign.battle!.huan).toEqual(s.thuThach.bac);
    const raid = (huan?: GameState['thuThach']['bac']) => startBattle(s, 1, 'bac', { huan });
    const hpGiao = (b: Battle) => b.fighters.find((f) => f.side === 'ta' && f.kind === 'giao')!.maxHp;
    expect(hpGiao(raid(s.thuThach.bac)) / hpGiao(raid())).toBeCloseTo(1 + 3 * HUAN_BONUS, 5);
  });
});

describe('độ khó thử thách', () => {
  it('tướng đánh thử là tướng người chơi có khi đã hết truyện', () => {
    const s = late();
    for (let n = 1; n <= STAGES.length; n++) expect(heroFor(s, STAGES[n - 1].chapter, n)).toEqual(lateHero(n));
  });

  it('quân mẫu thử thách vừa 38 chỗ, Hai binh chủng chỉ có hai binh chủng được mang', () => {
    for (let n = 1; n <= STAGES.length; n++) {
      const army = challengeArmy(n);
      const space = (Object.keys(army) as UnitType[]).reduce((t, k) => t + army[k] * UNITS[k].space, 0);
      expect(space).toBeLessThanOrEqual(FIELD_SLOTS);
      expect(space).toBeGreaterThanOrEqual(FIELD_SLOTS - 1);
      const ch = challengeOf(n)!;
      if (ch.kind === 'haiBinh') for (const k of Object.keys(army) as UnitType[]) expect(army[k] > 0).toBe(ch.units!.includes(k));
      else expect(army).toEqual(STAGES[n - 1].chapter === 4 ? SAMPLE_ARMY4 : SAMPLE_ARMY);
    }
  });

  for (let n = 1; n <= 32; n++) {
    const ch = CHALLENGES[n - 1];
    it(`thử thách màn ${n} (${ch.kind}, máu giặc ×${ch.hpScale}): người chơi giỏi thắng cả 3 hạt giống, người chơi thường thua ít nhất 2`, () => {
      for (const id of SEEDS) {
        const won = fightChallenge(n, 'gioi', id);
        expect(won.outcome).toBe('win');
        // Màn cầm cự thắng khi giữ đủ giờ, đúng bằng thời hạn trận.
        if (!STAGES[n - 1].holdS) expect(won.t).toBeLessThan(FIELD.maxS);
      }
      const lost = SEEDS.filter((id) => fightChallenge(n, 'thuong', id).outcome !== 'win').length;
      expect(lost).toBeGreaterThanOrEqual(2);
    });
  }
});

describe('bản lưu phiên bản 15', () => {
  it('lưu và nạp lại giữ nguyên thử thách đã thắng, huân công và bậc từng nhánh', () => {
    const s = late();
    s.thuThach = { won: [1, 5, 26], huan: 3, bac: { giao: 1, cung: 0, voi: 2, no: 0, tuong: 3 } };
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('nâng bản lưu 14 lên 15: chưa thắng thử thách nào, chưa có huân công', () => {
    const old = JSON.parse(serialize(late())) as Record<string, any>;
    old.version = 14;
    delete old.thuThach;
    const back = deserialize(JSON.stringify(old))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(15);
    expect(back.thuThach).toEqual({ won: [], huan: 0, bac: { giao: 0, cung: 0, voi: 0, no: 0, tuong: 0 } });
  });

  it('bản lưu có bậc huân công quá 3 thì không nạp', () => {
    const bad = JSON.parse(serialize(late())) as Record<string, any>;
    bad.thuThach.bac.giao = 4;
    expect(deserialize(JSON.stringify(bad))).toBeUndefined();
  });
});
