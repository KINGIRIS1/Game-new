// Canh trận đánh tất định (Đấu thành PR 1): cùng một trận chạy lại ra y hệt, sin, cos tự tính sát với của trình
// duyệt, lưới chi phí tìm đường lưu sẵn cho cùng đường đi như dựng lại, và một trận nặng chạy đủ nhanh để máy chủ đánh
// lại được (Edge Function cho chừng 2 giây CPU).

import { describe, expect, it } from 'vitest';
import { dcos, dsin, findPath, startBattle, stepBattle, type Battle } from './battle';
import { CH3_QUEST_START } from './defs';
import { createInitialState, place, type GameState } from './game';
import { RIVER_START } from './map';
import { DIEN, edge, setDien } from './testmap';

/** Kinh đô Điện 8 có vòng thành, chòi canh, doanh trại đủ quân giữ: trận giữ kinh đô nặng nhất có thể dựng gọn. */
function capital(): GameState {
  const s = createInitialState(0);
  setDien(s, 8);
  s.questIndex = CH3_QUEST_START;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  s.dan = 80;
  const r = place(s, 'doanhTrai', edge(8, 1), edge(8, 1));
  if (!r.ok) throw new Error(r.reason);
  r.value.level = 5;
  s.troops = { giao: 20, cung: 16, voi: 6, no: 8 };
  for (const [x, z] of [[DIEN - 8, DIEN - 8], [DIEN, DIEN - 8], [DIEN - 8, DIEN], [DIEN + 6, DIEN - 8]]) place(s, 'choiCanh', x, z);
  const at = DIEN - 6;
  for (let z = at; z < RIVER_START; z++) place(s, 'thanh', at, z);
  for (let x = at + 1; x < RIVER_START; x++) place(s, 'thanh', x, at);
  return s;
}

function run(side: 'bac' | 'tay', n: number): { battle: Battle; state: GameState; ms: number } {
  const state = capital();
  const battle = startBattle(state, n, side, { hero: null, land: { foe: 'han', n } });
  const t0 = performance.now();
  for (let i = 0; i < 20 * 260 && !stepBattle(state, battle, 0.05); i++);
  return { battle, state, ms: performance.now() - t0 };
}

describe('trận đánh tất định', () => {
  it('cùng một trận chạy hai lần ra y hệt: quân, máu, công trình bị phá, của bị cướp', () => {
    for (const side of ['bac', 'tay'] as const) {
      const a = run(side, 6);
      const b = run(side, 6);
      expect(JSON.stringify(b.battle)).toBe(JSON.stringify(a.battle));
      expect(JSON.stringify(b.state.buildings)).toBe(JSON.stringify(a.state.buildings));
      expect(b.state.resources).toEqual(a.state.resources);
    }
  }, 30000);

  it('sin, cos tự tính lệch không quá 1e-9 so với Math.sin, Math.cos, kể cả góc lớn', () => {
    for (let a = -50; a <= 250; a += 0.0137) {
      expect(Math.abs(dsin(a) - Math.sin(a))).toBeLessThan(1e-9);
      expect(Math.abs(dcos(a) - Math.cos(a))).toBeLessThan(1e-9);
    }
  });

  it('lưới chi phí lưu sẵn cho cùng đường đi như dựng lại mỗi lần, kể cả sau khi công trình bị phá', () => {
    const s = capital();
    const from = [[1.5, 1.5], [1.5, DIEN + 2.5], [DIEN + 2.5, 1.5]];
    const check = (b?: Battle) => {
      for (const t of s.buildings) for (const [x, z] of from) expect(findPath(s, x, z, t, false, b)).toEqual(findPath(s, x, z, t));
    };
    const b = startBattle(s, 1, 'bac', { hero: null });
    check(b);
    // Phá vài đoạn thành và một chòi canh: lưới lưu sẵn phải dựng lại.
    for (const t of s.buildings.filter((o) => o.type === 'thanh').slice(0, 6)) {
      t.damaged = true;
      b.wrecked.push(t.id);
    }
    check(b);
  }, 30000);

  it('một trận nặng chạy dưới 700 ms', () => {
    const { ms, battle } = run('bac', 8);
    expect(battle.total).toBeGreaterThan(30);
    console.log(`trận nặng: ${battle.total} giặc, ${battle.t.toFixed(1)} giây trận, ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(700);
  }, 30000);
});
