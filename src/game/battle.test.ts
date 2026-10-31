import { describe, expect, it } from 'vitest';
import { enemiesLeft, findPath, startBattle, stepBattle } from './battle';
import { BUILDINGS, FIRST_RAID_MS, RAID_WARNING_MS, UNITS } from './defs';
import {
  applyOffline,
  callRaidNow,
  canTrain,
  createInitialState,
  freeDan,
  outputOf,
  place,
  repair,
  repairCost,
  tick,
  train,
  type GameState,
} from './game';
import { GRID } from './map';

const T0 = 1_000_000;

/** Kinh đô Điện cấp 2 có doanh trại và một kho, đủ tiền, đủ dân. */
function capital(): GameState {
  const s = createInitialState(T0);
  s.buildings[0].level = 2;
  s.resources = { gao: 900, voOc: 900, datDa: 900, sat: 400 };
  s.dan = 30;
  const barracks = place(s, 'doanhTrai', 12, 20);
  const kho = place(s, 'kho', 21, 20);
  if (!barracks.ok || !kho.ok) throw new Error('dựng kinh đô thử thất bại');
  return s;
}

function fight(s: GameState, wave: number, side: 'bac' | 'tay' = 'bac') {
  const battle = startBattle(s, wave, side);
  let done = false;
  for (let i = 0; i < 20 * 260 && !done; i++) done = stepBattle(s, battle, 0.05);
  return battle;
}

describe('tìm đường của giặc', () => {
  it('đi vòng qua chỗ hở của lũy thay vì phá lũy', () => {
    const s = capital();
    for (let x = 9; x < 27; x++) if (x !== 13) place(s, 'luy', x, 12);
    const path = findPath(s, 15.5, 1.5, s.buildings[0])!;
    expect(path).not.toBeNull();
    const walls = new Set(s.buildings.filter((b) => b.type === 'luy').map((b) => b.z * GRID + b.x));
    expect(path.some((i) => walls.has(i))).toBe(false);
  });

  it('lũy bao kín thì đường đi xuyên qua lũy (giặc phải phá)', () => {
    const s = capital();
    // Vòng lũy kín quanh Điện (Điện chiếm các ô 16–19).
    for (let i = 15; i <= 20; i++) {
      for (const [x, z] of [[i, 15], [i, 20], [15, i], [20, i]]) place(s, 'luy', x, z);
    }
    const path = findPath(s, 15.5, 1.5, s.buildings[0])!;
    const walls = new Set(s.buildings.filter((b) => b.type === 'luy').map((b) => b.z * GRID + b.x));
    expect(path.some((i) => walls.has(i))).toBe(true);
  });
});

describe('trận giữ kinh đô', () => {
  it('bỏ trống kinh đô thì giặc phá kho, cướp của rồi chạy', () => {
    const s = capital();
    const before = s.resources.gao;
    const battle = fight(s, 1);
    expect(enemiesLeft(battle)).toBe(0);
    expect(battle.stolen.gao).toBeGreaterThan(0);
    expect(s.resources.gao).toBeLessThan(before);
    expect(s.buildings.some((b) => b.damaged)).toBe(true);
  });

  it('có giáo binh và chòi canh thì đánh lui đợt đầu, không mất của', () => {
    const s = capital();
    place(s, 'choiCanh', 18, 14);
    for (let i = 0; i < 6; i++) expect(train(s, 'giao').ok).toBe(true);
    const battle = fight(s, 1);
    expect(battle.killed).toBe(battle.total);
    expect(battle.stolen).toEqual({ gao: 0, voOc: 0, datDa: 0, sat: 0 });
  });

  it('bẫy chông gây sát thương khi giặc giẫm vào', () => {
    const s = capital();
    // Rải bẫy kín một hàng để giặc từ phía bắc phải đi qua.
    s.buildings[0].level = 5;
    for (let x = 4; x < 27; x++) place(s, 'bayChong', x, 8);
    const battle = fight(s, 1);
    expect(battle.trapsUsed.length).toBeGreaterThan(0);
    expect(battle.events.some((e) => e.kind === 'trap') || battle.trapsUsed.length > 0).toBe(true);
  });

  it('cung thủ khắc chế lính giáo Ân', () => {
    const s = capital();
    s.buildings.find((b) => b.type === 'doanhTrai')!.level = 2;
    for (let i = 0; i < 5; i++) expect(train(s, 'cung').ok).toBe(true);
    const battle = fight(s, 1);
    expect(battle.killed).toBe(battle.total);
  });
});

describe('quân đội', () => {
  it('tuyển lính tốn tiền nhưng không lấy bớt dân', () => {
    const s = capital();
    const dan = s.dan;
    const gao = s.resources.gao;
    expect(train(s, 'giao').ok).toBe(true);
    expect(s.troops.giao).toBe(1);
    expect(s.dan).toBe(dan);
    expect(s.resources.gao).toBe(gao - UNITS.giao.cost.gao!);
  });

  it('vẫn tuyển được lính khi mọi người dân đều đang bận việc', () => {
    const s = capital();
    s.dan = 2;
    place(s, 'ruong', 12, 12);
    expect(freeDan(s)).toBe(0);
    expect(train(s, 'giao').ok).toBe(true);
  });

  it('giáo binh không cần sắt, tuyển được ngay khi mới có doanh trại', () => {
    const s = capital();
    s.resources.sat = 0;
    expect(train(s, 'giao').ok).toBe(true);
  });

  it('cung thủ cần doanh trại cấp 2, voi chiến cần cấp 3', () => {
    const s = capital();
    expect(canTrain(s, 'cung')).toEqual({ ok: false, reason: 'canDoanhTrai' });
    s.buildings.find((b) => b.type === 'doanhTrai')!.level = 3;
    expect(canTrain(s, 'cung').ok).toBe(true);
    expect(canTrain(s, 'voi').ok).toBe(true);
  });

  it('không vượt sức chứa doanh trại', () => {
    const s = capital();
    const cap = BUILDINGS.doanhTrai.troopCap![0];
    for (let i = 0; i < cap; i++) expect(train(s, 'giao').ok).toBe(true);
    expect(canTrain(s, 'giao')).toEqual({ ok: false, reason: 'datGioiHanQuan' });
  });
});

describe('lịch giặc', () => {
  it('có doanh trại thì sau một lúc trinh sát báo, rồi giặc tràn vào, đánh xong hẹn đợt sau', () => {
    const s = capital();
    for (let i = 0; i < 6; i++) train(s, 'giao');
    place(s, 'choiCanh', 18, 14);
    tick(s, 1000);
    expect(s.raid.nextAt).not.toBeNull();
    tick(s, FIRST_RAID_MS);
    expect(s.raid.phase).toBe('warning');
    tick(s, RAID_WARNING_MS);
    expect(s.raid.phase).toBe('battle');
    for (let i = 0; i < 300 && s.raid.phase === 'battle'; i++) tick(s, 1000);
    expect(s.raid.phase).toBe('idle');
    expect(s.raid.wave).toBe(1);
    expect(s.raid.lastResult?.won).toBe(true);
    expect(s.raid.won).toBe(1);
    expect(s.raid.nextAt).toBeGreaterThan(s.clock);
  });

  it('giặc chờ khi tắt máy', () => {
    const s = capital();
    tick(s, 1000);
    const nextAt = s.raid.nextAt;
    applyOffline(s, T0 + 3 * 60 * 60_000);
    expect(s.raid.nextAt).toBe(nextAt);
    expect(s.raid.phase).toBe('idle');
  });

  it('gọi giặc tới ngay khi đã sẵn sàng', () => {
    const s = capital();
    expect(callRaidNow(s).ok).toBe(true);
    expect(s.raid.phase).toBe('warning');
  });
});

describe('hư hỏng và sửa chữa', () => {
  it('công trình hư không làm ra gì, sửa xong thì làm lại', () => {
    const s = capital();
    const r = place(s, 'ruong', 12, 12);
    if (!r.ok) throw new Error();
    r.value.damaged = true;
    expect(outputOf(r.value)).toEqual({});
    const voOc = s.resources.voOc;
    expect(repair(s, r.value.id).ok).toBe(true);
    expect(r.value.damaged).toBe(false);
    expect(s.resources.voOc).toBe(voOc - (repairCost(r.value).voOc ?? 0));
    expect(outputOf(r.value).gao).toBeGreaterThan(0);
  });
});
