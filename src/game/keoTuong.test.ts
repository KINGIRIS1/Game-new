// Kéo thả đắp tường cả mảng: dải thẳng (`lineTiles`) hay khung chữ nhật (`rectTiles`), xét trước cả dải có cộng dồn
// giá và số tối đa (`planLine`), đắp từng ô theo thứ tự (`placeLine`). Khung kín là một vòng thành, đê không lọt nước.

import { describe, expect, it } from 'vitest';
import { CH2_QUEST_START, CH3_QUEST_START, DIKE_RAISE } from './defs';
import { buildingAt, countOf, createInitialState, limitOf, place, placeLine, planLine, type GameState } from './game';
import { wallRings } from './coLoa';
import { GRID, RIVER_START, lineTiles, rectTiles } from './map';
import { DIEN, DIEN_END, setDien } from './testmap';
import { floodMap } from './terrain';

/** Kinh đô giàu của ở chương `chapter`, Điện cấp `dien`. */
function city(dien: number, chapter: 1 | 2 | 3 = 1): GameState {
  const s = createInitialState(0);
  setDien(s, dien);
  s.questIndex = chapter === 3 ? CH3_QUEST_START : chapter === 2 ? CH2_QUEST_START : 0;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  s.dan = 200;
  return s;
}

const key = (t: { x: number; z: number }) => `${t.x},${t.z}`;
const touching = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z) === 1;

describe('khung chữ nhật', () => {
  it('đi một vòng chu vi từ góc đầu, mỗi ô một lần, ô sau liền cạnh ô trước, ô cuối liền cạnh ô đầu', () => {
    for (const [a, b] of [
      [{ x: 2, z: 3 }, { x: 5, z: 7 }],
      [{ x: 9, z: 9 }, { x: 4, z: 2 }],
      [{ x: 3, z: 8 }, { x: 4, z: 1 }],
    ]) {
      const t = rectTiles(a, b);
      const w = Math.abs(b.x - a.x) + 1;
      const h = Math.abs(b.z - a.z) + 1;
      expect(t.length).toBe(2 * (w + h) - 4);
      expect(new Set(t.map(key)).size).toBe(t.length);
      expect(t[0]).toEqual(a);
      expect(t.map(key)).toContain(key(b));
      for (let i = 0; i < t.length; i++) expect(touching(t[i], t[(i + 1) % t.length]), `${key(t[i])}`).toBe(true);
      const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
      const [z0, z1] = [Math.min(a.z, b.z), Math.max(a.z, b.z)];
      for (const c of t) expect(c.x === x0 || c.x === x1 || c.z === z0 || c.z === z1).toBe(true);
    }
  });

  it('hai góc cùng hàng, cùng cột là dải thẳng; trùng nhau là một ô', () => {
    expect(rectTiles({ x: 4, z: 4 }, { x: 4, z: 4 })).toEqual([{ x: 4, z: 4 }]);
    expect(rectTiles({ x: 4, z: 4 }, { x: 7, z: 4 })).toEqual(lineTiles({ x: 4, z: 4 }, { x: 7, z: 4 }));
    expect(rectTiles({ x: 4, z: 6 }, { x: 4, z: 3 })).toEqual(lineTiles({ x: 4, z: 6 }, { x: 4, z: 3 }));
  });
});

describe('đắp cả mảng tường', () => {
  it('khung thành Cổ Loa quanh Điện là một vòng thành kín', () => {
    const s = city(8, 3);
    const tiles = rectTiles({ x: DIEN - 2, z: DIEN - 2 }, { x: DIEN_END + 1, z: DIEN_END + 1 });
    const r = placeLine(s, 'thanh', tiles);
    expect(r.reason).toBe(null);
    expect(r.placed.length).toBe(tiles.length);
    expect(wallRings(s)).toBe(1);
  });

  it('khung đê kín: nước lũ không lọt vào trong', () => {
    const s = city(8, 2);
    const a = { x: RIVER_START - 9, z: RIVER_START - 9 };
    const b = { x: RIVER_START - 2, z: RIVER_START - 2 };
    const inside: number[] = [];
    for (let z = a.z + 1; z < b.z; z++) for (let x = a.x + 1; x < b.x; x++) inside.push(z * GRID + x);
    const tiles = rectTiles(a, b);
    // Mực lũ vừa sát mặt đê thấp nhất: đê còn giữ được.
    const level = Math.min(...tiles.map((t) => s.heights[t.z * GRID + t.x])) + DIKE_RAISE[0];
    const before = floodMap(s, level);
    expect(inside.filter((i) => before[i]).length).toBeGreaterThan(0);
    expect(placeLine(s, 'de', tiles).placed.length).toBe(tiles.length);
    const after = floodMap(s, level);
    expect(inside.filter((i) => after[i]).length).toBe(0);
  });

  it('kéo thành Cổ Loa đè lên lũy thì thay lũy', () => {
    const s = city(8, 3);
    const z = DIEN - 3;
    for (let x = DIEN; x < DIEN + 4; x++) expect(place(s, 'luy', x, z).ok).toBe(true);
    const r = placeLine(s, 'thanh', lineTiles({ x: DIEN - 2, z }, { x: DIEN + 6, z }));
    expect(r.placed.length).toBe(9);
    expect(countOf(s, 'luy')).toBe(0);
    expect(buildingAt(s, DIEN + 1, z)?.type).toBe('thanh');
  });

  it('ô đã có đúng loại thì bỏ qua, ô vướng công trình thì hỏng, dựng tiếp ô sau', () => {
    const s = city(5);
    const tiles = lineTiles({ x: DIEN - 4, z: DIEN + 2 }, { x: DIEN + 2, z: DIEN + 2 });
    expect(place(s, 'luy', DIEN - 4, DIEN + 2).ok).toBe(true);
    const plan = planLine(s, 'luy', tiles);
    expect(plan.cells[0]).toMatchObject({ ok: true, has: true });
    // Ba ô cuối đè lên móng Điện.
    expect(plan.cells.slice(-3).map((c) => c.reason)).toEqual(['datBiChiem', 'datBiChiem', 'datBiChiem']);
    expect(plan.n).toBe(3);
    const r = placeLine(s, 'luy', tiles);
    expect(r.placed.length).toBe(3);
    expect(r.reason).toBe('datBiChiem');
  });

  it('xét trước cộng dồn giá: hết của giữa dải thì phần sau tô đỏ, chỉ đắp phần đủ của', () => {
    const s = city(5);
    s.resources.voOc = 4 * 3 + 2;
    const tiles = lineTiles({ x: DIEN - 8, z: DIEN - 3 }, { x: DIEN - 8, z: DIEN - 8 });
    const plan = planLine(s, 'luy', tiles);
    expect(plan.n).toBe(3);
    expect(plan.cost).toEqual({ voOc: 12 });
    expect(plan.cells.map((c) => c.ok)).toEqual([true, true, true, false, false, false]);
    expect(plan.cells[3].reason).toBe('thieuTaiNguyen');
    const r = placeLine(s, 'luy', tiles);
    expect(r.placed.length).toBe(3);
    expect(r.reason).toBe('thieuTaiNguyen');
    expect(s.resources.voOc).toBe(2);
  });

  it('xét trước cộng dồn số tối đa: đủ giới hạn giữa dải thì dừng', () => {
    const s = city(1);
    const limit = limitOf(s, 'luy');
    const row = DIEN - 4;
    let n = 0;
    for (let z = 4; n < limit - 2; z++) {
      for (let x = 4; x < DIEN && n < limit - 2; x += 2) {
        if (place(s, 'luy', x, z).ok) n++;
      }
    }
    const tiles = lineTiles({ x: DIEN, z: row }, { x: DIEN + 4, z: row });
    const plan = planLine(s, 'luy', tiles);
    expect(plan.n).toBe(2);
    expect(plan.cells[2].reason).toBe('datGioiHan');
    expect(placeLine(s, 'luy', tiles).placed.length).toBe(2);
    expect(countOf(s, 'luy')).toBe(limit);
  });
});
