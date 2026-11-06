// Canh bậc lên thành: dựng sát một đoạn thành đất (lũy cấp 2) hay thành Cổ Loa; khi giữ kinh đô, cung thủ và lính nỏ
// theo bậc lên mặt thành, đi dọc mặt thành tới chỗ bắn tới giặc rồi bắn xuống, xa thêm 1 ô; giặc đánh gần không với
// tới; đoạn thành dưới chân bị phá thì xuống đất; không có bậc thì lính đánh như cũ.

import { describe, expect, it } from 'vitest';
import { startBattle, stepBattle, type Battle, type Fighter } from './battle';
import { BUILDINGS, CH3_QUEST_START, RAID_SCALE, TREN_THANH, UNITS, XAY_MS, type UnitType } from './defs';
import { canMove, canPlace, createInitialState, limitOf, markHinted, nextHint, place, type GameState } from './game';
import { GRID, RIVER_START } from './map';
import { DIEN, setDien } from './testmap';
import { advanceXay, startBuild, startWalls, xayMs } from './xay';

/** Kinh đô đã vào chương 3, Điện `level`, của nhiều. */
function ch3(level = 5): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.questIndex = CH3_QUEST_START;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  s.dan = 60;
  return s;
}

/** Hàng tường phía bắc Điện, cách móng Điện 4 ô. */
const AT = DIEN - 4;

/** Vòng `type` kín vuông góc quanh Điện, dựa vào hai bờ sông, cách móng Điện 4 ô về phía rừng. */
function ring(s: GameState, type: 'luy' | 'thanh'): void {
  for (let z = AT; z < RIVER_START; z++) expect(place(s, type, AT, z).ok).toBe(true);
  for (let x = AT + 1; x < RIVER_START; x++) expect(place(s, type, x, AT).ok).toBe(true);
  if (type === 'luy') for (const b of s.buildings) if (b.type === 'luy') b.level = 2;
}

/** Kinh đô có vòng thành, doanh trại trong vòng thành, chỉ có cung thủ; `stair` thì có bậc lên thành phía bắc. */
function walled(type: 'luy' | 'thanh', stair: boolean, army: Partial<Record<UnitType, number>> = { cung: 8 }): GameState {
  const s = ch3(5);
  ring(s, type);
  const camp = place(s, 'doanhTrai', DIEN + BUILDINGS.dien.w + 1, DIEN + 2);
  if (!camp.ok) throw new Error(camp.reason);
  camp.value.level = 5;
  s.troops = { giao: 0, cung: 0, voi: 0, no: 0, ...army };
  if (stair) expect(place(s, 'bacThanh', DIEN + 4, AT + 1).ok).toBe(true);
  return s;
}

const isWallTile = (s: GameState, x: number, z: number) =>
  s.buildings.some((b) => !b.damaged && b.x === Math.floor(x) && b.z === Math.floor(z) && ['luy', 'thanh', 'congThanh', 'bacThanh'].includes(b.type));

/** Đánh đợt quân Triệu thứ `n` từ phía bắc, gọi `each` sau mỗi bước. */
function fight(s: GameState, n: number, each: (b: Battle) => void): Battle {
  const b = startBattle(s, n, 'bac', { hero: null, land: { foe: 'trieu', n } });
  for (let i = 0; i < 20 * 300 && !stepBattle(s, b, 0.05); i++) each(b);
  return b;
}

/** Trận chỉ còn một cung thủ đứng ở (x, z) và một tên giặc ở (gx, gz); những người khác ra khỏi trận. */
function duel(s: GameState, x: number, z: number, gx: number, gz: number, wall: boolean, foeKind: Fighter['kind'] = 'noTrieu'): { b: Battle; ta: Fighter; foe: Fighter } {
  const b = startBattle(s, 2, 'bac', { hero: null, land: { foe: 'trieu', n: 2 } });
  const ta = b.fighters.find((f) => f.side === 'ta' && f.kind === 'cung')!;
  const foe = b.fighters.find((f) => f.side === 'giac' && f.kind === foeKind)!;
  for (const f of b.fighters) if (f !== ta && f !== foe) f.state = 'gone';
  Object.assign(ta, { x, z, wall: wall || undefined, cd: 0 });
  Object.assign(foe, { x: gx, z: gz });
  return { b, ta, foe };
}

describe('bậc lên thành', () => {
  it('dựng sát mặt trong một đoạn thành đất hay thành Cổ Loa; lũy tre thì chưa được; mở từ Điện 3', () => {
    const s = ch3(5);
    expect(limitOf(s, 'bacThanh')).toBe(3);
    for (let x = DIEN; x < DIEN + 5; x++) expect(place(s, 'luy', x, AT).ok).toBe(true);
    // Lũy tre không có mặt cho lính đứng.
    expect(canPlace(s, 'bacThanh', DIEN + 1, AT + 1)).toEqual({ ok: false, reason: 'phaiSatThanh' });
    for (const b of s.buildings) if (b.type === 'luy') b.level = 2;
    expect(canPlace(s, 'bacThanh', DIEN + 1, AT + 1).ok).toBe(true);
    // Chéo góc không tính là sát.
    expect(canPlace(s, 'bacThanh', DIEN + 5, AT + 1)).toEqual({ ok: false, reason: 'phaiSatThanh' });
    expect(place(s, 'thanh', DIEN + 5, AT).ok).toBe(true);
    const stair = place(s, 'bacThanh', DIEN + 5, AT + 1);
    expect(stair.ok).toBe(true);
    if (!stair.ok) return;
    // Mặt ngoài thành (xa Điện hơn đoạn thành) thì không được.
    expect(canPlace(s, 'bacThanh', DIEN + 2, AT - 1)).toEqual({ ok: false, reason: 'phaiSatThanh' });
    // Dời đi thì cũng phải sát mặt trong thành.
    expect(canMove(s, stair.value.id, DIEN + 8, AT + 3)).toEqual({ ok: false, reason: 'phaiSatThanh' });
    expect(canMove(s, stair.value.id, DIEN + 2, AT - 1)).toEqual({ ok: false, reason: 'phaiSatThanh' });
    expect(canMove(s, stair.value.id, DIEN + 2, AT + 1).ok).toBe(true);
    setDien(s, 2);
    expect(canPlace(s, 'bacThanh', DIEN + 1, AT + 1)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => BUILDINGS.bacThanh.limit[level - 1])).toEqual([0, 0, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('có thời gian xây: đoạn thành đắp dở chưa dựa được, bậc đang dựng thì chưa vào kinh đô', () => {
    const s = ch3(5);
    const tiles = Array.from({ length: 5 }, (_, i) => ({ x: DIEN + i, z: AT }));
    expect(startWalls(s, 'thanh', tiles).n).toBe(5);
    expect(canPlace(s, 'bacThanh', DIEN + 1, AT + 1)).toEqual({ ok: false, reason: 'phaiSatThanh' });
    advanceXay(s, 5 * xayMs('thanh', 1));
    expect(s.buildings.filter((b) => b.type === 'thanh')).toHaveLength(5);
    const job = startBuild(s, 'bacThanh', DIEN + 1, AT + 1);
    expect(job.ok && job.value).toBeTruthy();
    expect(xayMs('bacThanh', 1)).toBe(XAY_MS[1]);
    expect(s.buildings.some((b) => b.type === 'bacThanh')).toBe(false);
    advanceXay(s, xayMs('bacThanh', 1));
    expect(s.buildings.some((b) => b.type === 'bacThanh' && b.x === DIEN + 1 && b.z === AT + 1)).toBe(true);
  });

  it('Lạc hầu gợi ý một lần khi đã có đoạn thành đất hay thành Cổ Loa', () => {
    const s = ch3(5);
    for (const t of ['thoHo', 'xuongMoc', 'langChai', 'congThanh', 'congDe'] as const) markHinted(s, t);
    expect(place(s, 'luy', DIEN, AT).ok).toBe(true);
    expect(nextHint(s)).toBeNull();
    s.buildings.find((b) => b.type === 'luy')!.level = 2;
    expect(nextHint(s)).toBe('bacThanh');
    markHinted(s, 'bacThanh');
    expect(nextHint(s)).toBeNull();
  });

  for (const type of ['thanh', 'luy'] as const) {
    it(`cung thủ theo bậc lên mặt ${type === 'thanh' ? 'thành Cổ Loa' : 'thành đất'}, đi dọc mặt thành rồi bắn xuống`, () => {
      const s = walled(type, true);
      let onTop = 0;
      let shots = 0;
      fight(s, 3, (b) => {
        for (const f of b.fighters) {
          if (f.side !== 'ta' || !f.wall || f.state === 'dead') continue;
          // Trên thành thì chỉ đứng trên mặt thành hay trên bậc.
          expect(isWallTile(s, f.x, f.z)).toBe(true);
          onTop++;
          if (f.state === 'fight') shots++;
        }
      });
      expect(onTop).toBeGreaterThan(0);
      expect(shots).toBeGreaterThan(0);
    });
  }

  it('không có bậc thì không ai lên thành, đánh như cũ', () => {
    const s = walled('thanh', false);
    fight(s, 3, (b) => {
      for (const f of b.fighters) expect(f.wall).toBeFalsy();
    });
  });

  it('giáo binh không lên thành; chỉ cung thủ, lính nỏ', () => {
    expect(TREN_THANH.units).toEqual(['cung', 'no']);
    const s = walled('thanh', true, { giao: 6, no: 4 });
    let no = 0;
    fight(s, 3, (b) => {
      for (const f of b.fighters) {
        if (f.side === 'ta' && f.kind === 'giao') expect(f.wall).toBeFalsy();
        if (f.side === 'ta' && f.kind === 'no' && f.wall) no++;
      }
    });
    expect(no).toBeGreaterThan(0);
  });

  it('trên mặt thành bắn xa thêm 1 ô', () => {
    const s = walled('thanh', true);
    const reach = UNITS.cung.range * RAID_SCALE + 0.3;
    // Giặc ngoài tầm bắn dưới đất, trong tầm bắn trên thành.
    const gap = reach + (TREN_THANH.range * RAID_SCALE) / 2;
    const x = DIEN + 0.5;
    const z = AT + 0.5;
    for (const wall of [true, false]) {
      const { b, foe } = duel(s, x, z, x, z - gap, wall);
      foe.cd = 99;
      stepBattle(s, b, 0.05);
      expect(foe.hp < foe.maxHp, wall ? 'trên thành' : 'dưới đất').toBe(wall);
    }
  });

  it('giặc đánh gần không với tới cung thủ trên mặt thành, giặc bắn xa thì vẫn bắn được', () => {
    const s = walled('thanh', true);
    const x = DIEN + 0.5;
    const z = AT + 0.5;
    for (const [kind, hit] of [
      ['linhTrieu', false],
      ['noTrieu', true],
    ] as const) {
      const { b, ta, foe } = duel(s, x, z, x, z - 0.8, true, kind);
      ta.cd = 99;
      for (let i = 0; i < 40; i++) stepBattle(s, b, 0.05);
      expect(ta.hp < ta.maxHp, kind).toBe(hit);
      if (!hit) expect(foe.state === 'fight' && Math.hypot(foe.x - ta.x, foe.z - ta.z) < 0.5).toBe(false);
    }
  });

  it('đoạn thành dưới chân bị phá thì cung thủ xuống đất đánh tiếp', () => {
    const s = walled('thanh', true);
    const x = DIEN + 0.5;
    const z = AT + 0.5;
    const { b, ta } = duel(s, x, z, x, z - 3, true);
    stepBattle(s, b, 0.05);
    expect(ta.wall).toBe(true);
    s.buildings.find((w) => w.type === 'thanh' && w.x === DIEN && w.z === AT)!.damaged = true;
    stepBattle(s, b, 0.05);
    expect(ta.wall).toBeFalsy();
    expect(Math.floor(ta.z) * GRID + Math.floor(ta.x)).toBe(AT * GRID + DIEN);
  });
});
