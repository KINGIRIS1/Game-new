import { describe, expect, it } from 'vitest';
import { alliesLeft, startFieldBattle, stepField, useSkill, type Battle } from './battle';
import { canStartStage, leaveBattlefield, retreat, stageReward, startStage } from './campaign';
import { DEFAULT_ROWS, FIELD, STAGES, UNITS, type UnitType } from './defs';
import { callRaidNow, canTrain, createInitialState, place, questProgress, tick, train, type GameState } from './game';

type Army = Record<UnitType, number>;

/** Kinh đô Điện cấp 3 có doanh trại cấp 3 và ba nơi ở, đủ tiền luyện quân. */
function capital(): GameState {
  const s = createInitialState(0);
  s.buildings[0].level = 3;
  s.resources = { gao: 3000, voOc: 3000, datDa: 3000, sat: 1000 };
  const barracks = place(s, 'doanhTrai', 12, 20);
  if (!barracks.ok) throw new Error('dựng doanh trại thử thất bại');
  barracks.value.level = 3;
  // Mỗi binh chủng luyện ở nơi ở riêng.
  for (const [type, x] of [['traiGiao', 15], ['traiCung', 17], ['chuongVoi', 19]] as const) {
    if (!place(s, type, x, 21).ok) throw new Error('dựng nơi ở thử thất bại');
  }
  return s;
}

function withTroops(s: GameState, army: Army): GameState {
  for (const k of Object.keys(army) as UnitType[]) for (let i = 0; i < army[k]; i++) if (!train(s, k).ok) throw new Error('không luyện được ' + k);
  return s;
}

function fieldFight(stage: number, army: Army, drum = false, id = 1): Battle {
  const def = STAGES[stage - 1];
  const b = startFieldBattle({ id, stage, enemies: def.enemies, hpScale: def.hpScale, army, rows: DEFAULT_ROWS });
  for (let i = 0; i < 20 * 120 && !stepField(b, 0.05); i++) if (drum) useSkill(b, 'trongTran');
  return b;
}

/** Đánh hết trận phó bản đang dở bằng đồng hồ chơi. */
function playOut(s: GameState): void {
  for (let i = 0; i < 200 && s.campaign.battle && !s.campaign.battle.outcome; i++) tick(s, 1000);
}

describe('trận ngoài bãi', () => {
  it('dàn quân theo hàng: tiền quân đứng gần giặc nhất, hậu quân đứng sau', () => {
    const b = startFieldBattle({ id: 1, stage: 2, enemies: { giaoAn: 3, cungAn: 2 }, hpScale: 1, army: { giao: 3, cung: 3, voi: 0 }, rows: DEFAULT_ROWS });
    const avgZ = (side: 'ta' | 'giac', kind: string) => {
      const list = b.fighters.filter((f) => f.side === side && f.kind === kind);
      return list.reduce((s, f) => s + f.z, 0) / list.length;
    };
    // Quân ta ở phía z lớn, giặc ở phía z nhỏ.
    expect(avgZ('ta', 'giao')).toBeLessThan(avgZ('ta', 'cung'));
    expect(avgZ('giac', 'giaoAn')).toBeGreaterThan(avgZ('giac', 'cungAn'));
    expect(avgZ('giac', 'giaoAn')).toBeLessThan(avgZ('ta', 'giao'));
    expect(b.total).toBe(5);
    for (const f of b.fighters) {
      expect(f.x).toBeGreaterThan(0);
      expect(f.x).toBeLessThan(FIELD.w);
    }
  });

  it('đổi hàng thì lính đứng chỗ khác', () => {
    const rows = { giao: 'hau', cung: 'tien', voi: 'trung' } as const;
    const b = startFieldBattle({ id: 1, stage: 1, enemies: { giaoAn: 1 }, hpScale: 1, army: { giao: 2, cung: 2, voi: 0 }, rows });
    const z = (kind: string) => b.fighters.find((f) => f.side === 'ta' && f.kind === kind)!.z;
    expect(z('cung')).toBeLessThan(z('giao'));
  });

  it('cùng một trận chạy lại ra cùng kết quả', () => {
    const a = fieldFight(3, { giao: 8, cung: 5, voi: 1 });
    const b = fieldFight(3, { giao: 8, cung: 5, voi: 1 });
    expect(a.t).toBe(b.t);
    expect(a.lost).toEqual(b.lost);
  });

  it('quân ta chết hết thì thua', () => {
    const b = fieldFight(1, { giao: 2, cung: 0, voi: 0 });
    expect(b.outcome).toBe('lose');
    expect(alliesLeft(b)).toBe(0);
    expect(b.lost.giao).toBe(2);
  });

  it('quá giờ chưa phá được giặc thì cũng thua', () => {
    const b = startFieldBattle({ id: 1, stage: 1, enemies: { giaoAn: 1 }, hpScale: 100, army: { giao: 0, cung: 0, voi: 10 }, rows: DEFAULT_ROWS });
    while (!stepField(b, 0.05));
    expect(b.outcome).toBe('lose');
    expect(b.t).toBeGreaterThan(FIELD.maxS);
    expect(alliesLeft(b)).toBeGreaterThan(0);
  });

  it('Trống trận thúc quân đánh nhanh hơn, rồi phải chờ hồi mới bấm lại được', () => {
    const def = STAGES[0];
    const b = startFieldBattle({ id: 1, stage: 1, enemies: def.enemies, hpScale: 1, army: { giao: 6, cung: 0, voi: 0 }, rows: DEFAULT_ROWS });
    expect(useSkill(b, 'trongTran')).toBe(true);
    expect(useSkill(b, 'trongTran')).toBe(false);
    expect(b.events.some((e) => e.kind === 'rally')).toBe(true);
    const plain = fieldFight(1, { giao: 6, cung: 0, voi: 0 });
    const drummed = fieldFight(1, { giao: 6, cung: 0, voi: 0 }, true);
    expect(drummed.outcome).toBe('win');
    expect(drummed.t).toBeLessThan(plain.t);
  });
});

describe('cân bằng các màn', () => {
  // Quân mẫu vừa đủ chỗ trong doanh trại ở cấp Điện mà màn yêu cầu.
  const SAMPLE: Record<number, Army> = {
    1: { giao: 6, cung: 0, voi: 0 },
    2: { giao: 8, cung: 3, voi: 0 },
    3: { giao: 8, cung: 5, voi: 1 },
    4: { giao: 8, cung: 6, voi: 2 },
  };
  for (const [n, army] of Object.entries(SAMPLE)) {
    const stage = Number(n);
    it(`màn ${stage}: quân mẫu thắng, nửa quân mẫu thua`, () => {
      expect(fieldFight(stage, army).outcome).toBe('win');
      const half = { giao: Math.floor(army.giao / 2), cung: Math.floor(army.cung / 2), voi: Math.floor(army.voi / 2) };
      expect(fieldFight(stage, half).outcome).toBe('lose');
    });
    it(`màn ${stage}: quân mẫu vừa doanh trại ở cấp Điện của màn`, () => {
      const space = (Object.keys(army) as UnitType[]).reduce((s, k) => s + army[k] * UNITS[k].space, 0);
      const caps = [8, 14, 20, 28, 38];
      expect(space).toBeLessThanOrEqual(caps[STAGES[stage - 1].minDien - 1]);
    });
  }

  it('trận kéo dài đủ để kịp bấm kỹ năng', () => {
    const b = fieldFight(1, SAMPLE[1]);
    expect(b.t).toBeGreaterThan(8);
  });
});

describe('phó bản', () => {
  it('chưa có doanh trại thì chưa đánh được', () => {
    const s = createInitialState(0);
    s.buildings[0].level = 2;
    expect(canStartStage(s, 1)).toEqual({ ok: false, reason: 'canDoanhTrai' });
  });

  it('mở màn lần lượt, đủ cấp Điện, màn có Gióng thì chờ bản sau', () => {
    const s = capital();
    expect(canStartStage(s, 1).ok).toBe(true);
    expect(canStartStage(s, 2)).toEqual({ ok: false, reason: 'manKhoa' });
    s.campaign.cleared = 2;
    s.buildings[0].level = 2;
    expect(canStartStage(s, 3)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    s.campaign.cleared = 4;
    s.buildings[0].level = 5;
    expect(canStartStage(s, 5)).toEqual({ ok: false, reason: 'canThanhGiong' });
    expect(canStartStage(s, 9)).toEqual({ ok: false, reason: 'canChuong2' });
    expect(canStartStage(s, 17)).toEqual({ ok: false, reason: 'canChuong3' });
    expect(canStartStage(s, 25)).toEqual({ ok: false, reason: 'khongTimThay' });
  });

  it('phải chọn lính, và không mang quá số lính đang có', () => {
    const s = withTroops(capital(), { giao: 3, cung: 0, voi: 0 });
    expect(startStage(s, 1, { giao: 0, cung: 0, voi: 0 }, DEFAULT_ROWS)).toEqual({ ok: false, reason: 'chuaChonQuan' });
    expect(startStage(s, 1, { giao: 4, cung: 0, voi: 0 }, DEFAULT_ROWS)).toEqual({ ok: false, reason: 'khongDuQuan' });
  });

  it('thắng màn: được thưởng lần đầu, mở màn sau, đánh lại được ít hơn', () => {
    const s = withTroops(capital(), { giao: 8, cung: 0, voi: 0 });
    s.resources = { gao: 100, voOc: 100, datDa: 0, sat: 0 };
    const first = stageReward(s, 1);
    expect(first).toEqual(STAGES[0].reward);
    expect(startStage(s, 1, { giao: 8, cung: 0, voi: 0 }, DEFAULT_ROWS).ok).toBe(true);
    playOut(s);
    const result = s.campaign.lastResult!;
    expect(result.outcome).toBe('win');
    expect(result.first).toBe(true);
    expect(s.campaign.cleared).toBe(1);
    expect(s.resources.gao).toBeGreaterThanOrEqual(100 + first.gao! - 20);
    // Còn đang xem kết quả thì chưa xuất quân tiếp được; xem xong thì rời bãi chiến.
    expect(canStartStage(s, 2)).toEqual({ ok: false, reason: 'dangDanhPhoBan' });
    leaveBattlefield(s);
    expect(s.campaign.battle).toBeNull();
    expect(s.campaign.lastResult).toBeNull();
    expect(canStartStage(s, 2).ok).toBe(true);
    const replay = stageReward(s, 1);
    expect(replay.gao).toBeLessThan(first.gao!);
    expect(replay.gao).toBeGreaterThan(0);
  });

  it('thua màn: mất lính tử trận, không có thưởng, màn sau vẫn khóa', () => {
    const s = withTroops(capital(), { giao: 2, cung: 0, voi: 0 });
    const before = { ...s.resources };
    startStage(s, 1, { giao: 2, cung: 0, voi: 0 }, DEFAULT_ROWS);
    playOut(s);
    expect(s.campaign.lastResult?.outcome).toBe('lose');
    expect(s.troops.giao).toBe(0);
    expect(s.campaign.cleared).toBe(0);
    expect(s.resources.voOc).toBeLessThanOrEqual(before.voOc);
  });

  it('rút quân: lính còn sống trở về, không có thưởng', () => {
    const s = withTroops(capital(), { giao: 6, cung: 0, voi: 0 });
    startStage(s, 1, { giao: 4, cung: 0, voi: 0 }, DEFAULT_ROWS);
    tick(s, 1000);
    expect(retreat(s).ok).toBe(true);
    expect(s.campaign.lastResult?.outcome).toBe('retreat');
    expect(s.troops.giao).toBe(6);
    expect(s.campaign.cleared).toBe(0);
    expect(retreat(s).ok).toBe(false);
  });

  it('đang đánh phó bản: đồng hồ giặc đứng lại, không luyện quân, không gọi giặc', () => {
    const s = withTroops(capital(), { giao: 6, cung: 0, voi: 0 });
    tick(s, 1000);
    const nextAt = s.raid.nextAt!;
    startStage(s, 1, { giao: 6, cung: 0, voi: 0 }, DEFAULT_ROWS);
    tick(s, 3000);
    expect(s.raid.nextAt).toBe(nextAt + 3000);
    expect(canTrain(s, 'giao')).toEqual({ ok: false, reason: 'dangDanhPhoBan' });
    expect(callRaidNow(s)).toEqual({ ok: false, reason: 'dangDanhPhoBan' });
  });

  it('đang có giặc báo thì chưa xuất quân được', () => {
    const s = withTroops(capital(), { giao: 6, cung: 0, voi: 0 });
    callRaidNow(s);
    expect(canStartStage(s, 1)).toEqual({ ok: false, reason: 'dangCoGiac' });
  });

  it('nhiệm vụ Lạc hầu đếm theo màn đã thắng', () => {
    const s = capital();
    s.questIndex = 11;
    expect(questProgress(s)).toEqual({ have: 0, need: 1 });
    s.campaign.cleared = 1;
    expect(questProgress(s)).toEqual({ have: 1, need: 1 });
  });
});
