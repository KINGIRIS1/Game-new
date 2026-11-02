// Canh cổng thành: mở ở chương 3 từ Điện 5, đặt trên ô trống hay thay một đoạn lũy, thành đất, thành Cổ Loa (không
// thay đê); giặc tìm đường thấy cổng dễ qua hơn tường nên dồn về cổng; lính trên lầu cổng bắn; cổng tính vào vòng
// thành; yêu tinh nhắm phá cổng như phá thành; mẫu kinh đô chừa chỗ cổng trên lũy và vòng thành.

import { describe, expect, it } from 'vitest';
import { findPath, startBattle, stepBattle, type Battle } from './battle';
import { wallRings } from './coLoa';
import { BUILDINGS, CH3_QUEST_START, CONG_THANH, CO_LOA_TOWER, RAID_SCALE, U_NO, type UnitType } from './defs';
import {
  canPlace,
  canUpgrade,
  createInitialState,
  limitOf,
  markHinted,
  nextHint,
  place,
  type Building,
  type GameState,
} from './game';
import { GRID, RIVER_START } from './map';
import { MAU_IDS, applyMau, mauSlots } from './mau';
import { DIEN, DIEN_END, edge, setDien } from './testmap';

/** Kinh đô đã vào chương 3, Điện `level`, của nhiều. */
function ch3(level = 5): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.questIndex = CH3_QUEST_START;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  s.dan = 60;
  return s;
}

/** Vòng `type` kín vuông góc quanh Điện, dựa vào hai bờ sông, cách móng Điện `d` ô về phía rừng. */
function ring(s: GameState, type: 'luy' | 'thanh', d: number): void {
  const at = DIEN - d;
  for (let z = at; z < RIVER_START; z++) expect(place(s, type, at, z).ok).toBe(true);
  for (let x = at + 1; x < RIVER_START; x++) expect(place(s, type, x, at).ok).toBe(true);
}

function gate(s: GameState, x: number, z: number, level = 1): Building {
  const r = place(s, 'congThanh', x, z);
  if (!r.ok) throw new Error(r.reason);
  r.value.level = level;
  return r.value;
}

describe('cổng thành', () => {
  it('mở ở chương 3 từ Điện 5; tối đa 2 ở Điện 5–7, 4 ở Điện 8; cấp 2 cần Điện 7, cấp 3 cần Điện 8', () => {
    const s = ch3(5);
    s.questIndex = 0;
    expect(canPlace(s, 'congThanh', DIEN, DIEN - 4)).toEqual({ ok: false, reason: 'canChuong3' });
    s.questIndex = CH3_QUEST_START;
    const limits = [1, 2, 3, 4, 5, 6, 7, 8].map((level) => {
      setDien(s, level);
      return limitOf(s, 'congThanh');
    });
    expect(limits).toEqual([0, 0, 0, 0, 2, 2, 2, 4]);
    setDien(s, 5);
    const g = gate(s, DIEN, DIEN - 4);
    expect(canUpgrade(s, g.id).ok).toBe(false);
    setDien(s, 7);
    expect(canUpgrade(s, g.id).ok).toBe(true);
    g.level = 2;
    expect(canUpgrade(s, g.id).ok).toBe(false);
    setDien(s, 8);
    expect(canUpgrade(s, g.id).ok).toBe(true);
    expect(BUILDINGS.congThanh.hp).toEqual([3000, 4500, 6000]);
  });

  it('dựng thay một đoạn lũy, thành đất, thành Cổ Loa (ụ nỏ trên đoạn ấy mất theo); không thay được đê', () => {
    const s = ch3(7);
    s.questIndex = CH3_QUEST_START + 10;
    const z = DIEN - 4;
    expect(place(s, 'luy', DIEN, z).ok).toBe(true);
    expect(place(s, 'luy', DIEN + 1, z).ok).toBe(true);
    s.buildings.find((b) => b.type === 'luy' && b.x === DIEN + 1)!.level = 2;
    gate(s, DIEN, z);
    gate(s, DIEN + 1, z);
    expect(s.buildings.filter((b) => b.type === 'luy')).toHaveLength(0);
    expect(s.buildings.filter((b) => b.type === 'congThanh')).toHaveLength(2);
    // Đoạn thành có ụ nỏ.
    const s2 = ch3(7);
    const wall = place(s2, 'thanh', DIEN, z);
    if (!wall.ok) throw new Error(wall.reason);
    wall.value.uNo = 'ok';
    gate(s2, DIEN, z);
    expect(s2.buildings.some((b) => b.type === 'thanh')).toBe(false);
    expect(U_NO.limit.length).toBeGreaterThan(0);
    // Đê thì không.
    const s3 = ch3(5);
    expect(place(s3, 'de', DIEN, z).ok).toBe(true);
    expect(canPlace(s3, 'congThanh', DIEN, z)).toEqual({ ok: false, reason: 'datBiChiem' });
  });

  it('vòng tường kín: giặc tìm đường qua cổng thay vì phá tường', () => {
    for (const type of ['luy', 'thanh'] as const) {
      const s = ch3(5);
      ring(s, type, 4);
      if (type === 'luy') for (const b of s.buildings) if (b.type === 'luy') b.level = 2;
      const at = DIEN - 4;
      // Giặc chịu đi vòng tới cổng: thành đất (giá ô 30) thì cổng lệch trục 10 ô; thành Cổ Loa (45) thì cổng tận
      // cùng mặt tây, xa đường thẳng từ phía bắc xuống Điện.
      const g = type === 'luy' ? gate(s, DIEN + 10, at) : gate(s, at, RIVER_START - 3);
      const path = findPath(s, DIEN + 0.5, 1.5, s.buildings[0])!;
      expect(path).not.toBeNull();
      const walls = new Set(s.buildings.filter((b) => b.type === type).map((b) => b.z * GRID + b.x));
      expect(path.some((i) => walls.has(i)), type).toBe(false);
      expect(path.includes(g.z * GRID + g.x), type).toBe(true);
    }
  });

  it('cổng tính vào vòng thành; cổng hư thì vòng hở', () => {
    const s = ch3(5);
    ring(s, 'thanh', 4);
    expect(wallRings(s)).toBe(1);
    const g = gate(s, DIEN, DIEN - 4);
    expect(wallRings(s)).toBe(1);
    g.damaged = true;
    expect(wallRings(s)).toBe(0);
  });

  it('lính trên lầu cổng bắn giặc trong tầm; cổng cấp 3 mỗi phát bắn hai giặc', () => {
    for (const [level, shots] of [[1, 1], [3, 2]] as const) {
      const s = ch3(8);
      ring(s, 'thanh', 4);
      const g = gate(s, DIEN + 2, DIEN - 4, level);
      const battle = startBattle(s, 1, 'bac', { hero: null });
      // Phát đông nhất: số mũi tên bay ra từ lầu cổng trong cùng một bước.
      let most = 0;
      let seen = 0;
      for (let i = 0; i < 20 * 120; i++) {
        stepBattle(s, battle, 0.05);
        const volley = battle.events.filter((e) => e.seq > seen && e.kind === 'shot' && e.x === g.x + 0.5 && e.z === g.z + 0.5);
        most = Math.max(most, volley.length);
        seen = battle.seq;
      }
      expect(most, `cổng cấp ${level}`).toBe(shots);
    }
    expect(CONG_THANH.dmg).toEqual([20, 26, 32]);
  });

  it('Đền Cổ Loa: lính trên lầu cổng bắn mạnh hơn và xa hơn', () => {
    const s = ch3(5);
    const g = gate(s, DIEN + 2, DIEN - 6);
    s.troops = { giao: 0, cung: 0, voi: 0, no: 0 };
    const shot = (crossbows: boolean, dist: number) => {
      const b: Battle = startBattle(s, 1, 'bac', { hero: null, land: { foe: 'trieu', n: 1 }, crossbows });
      const foe = b.fighters.find((f) => f.side === 'giac')!;
      for (const f of b.fighters) if (f !== foe) f.state = 'gone';
      foe.x = g.x + 0.5 - dist;
      foe.z = g.z + 0.5;
      foe.cd = 99;
      stepBattle(s, b, 0.01);
      return foe.maxHp - foe.hp;
    };
    expect(shot(false, 3)).toBeCloseTo(CONG_THANH.dmg[0], 5);
    expect(shot(true, 3)).toBeCloseTo(CONG_THANH.dmg[0] * CO_LOA_TOWER.dmg, 5);
    expect(shot(false, CONG_THANH.range * RAID_SCALE + 0.5)).toBe(0);
    expect(shot(true, CONG_THANH.range * RAID_SCALE + 0.5)).toBeGreaterThan(0);
  });

  it('giặc không nhắm cổng làm đích (như tường), nhưng yêu tinh nhắm phá cổng như phá thành', () => {
    // Đêm yêu tinh: chỉ có một cổng, không có đoạn thành nào; yêu tinh tìm tới phá cổng.
    const s = ch3(5);
    const g = gate(s, DIEN + 2, DIEN - 6);
    const battle = startBattle(s, 1, 'bac', { hero: null, land: { foe: 'yeu', n: 1 } });
    for (let i = 0; i < 20 * 200 && !g.damaged; i++) stepBattle(s, battle, 0.05);
    expect(g.damaged).toBe(true);
  });

  it('Lạc hầu gợi ý cổng thành khi vào chương 3 và có Điện 5', () => {
    const s = ch3(5);
    markHinted(s, 'xuongMoc');
    markHinted(s, 'langChai');
    expect(nextHint(s)).toBe('congThanh');
    s.questIndex = 0;
    expect(nextHint(s)).toBeNull();
  });
});

describe('độ khó khi có cổng', () => {
  type Army = Record<UnitType, number>;
  const FULL: Army = { giao: 14, cung: 12, voi: 4, no: 0 };
  const TOWERS = [[25, 31], [31, 31], [37, 31], [42, 31], [31, 37]];
  const AXIS = DIEN + Math.floor(BUILDINGS.dien.w / 2);

  /** Đợt quân Triệu thứ `n` đánh kinh đô Điện 5 có vòng thành, năm chòi canh, không tướng; có hay không hai cổng giữa trục. */
  function raid(army: Army, n: number, side: 'bac' | 'tay', gates: boolean): { lost: number; wrecked: number } {
    const s = ch3(5);
    const barracks = place(s, 'doanhTrai', edge(5, 1), edge(5, 1));
    if (!barracks.ok) throw new Error(barracks.reason);
    barracks.value.level = 5;
    s.troops = { ...army };
    for (const [x, z] of TOWERS) expect(place(s, 'choiCanh', x, z).ok).toBe(true);
    ring(s, 'thanh', 4);
    if (gates) for (const [x, z] of [[AXIS, DIEN - 4], [DIEN - 4, AXIS]]) gate(s, x, z);
    const b = startBattle(s, n, side, { hero: null, land: { foe: 'trieu', n } });
    for (let i = 0; i < 20 * 400 && !stepBattle(s, b, 0.05); i++);
    return { lost: Object.values(b.lost).reduce((a, c) => a + c, 0), wrecked: b.wrecked.length };
  }

  it('cổng không làm trận dễ hẳn: không quân thì giặc phá chừng ấy công trình; đủ quân thì quân ta mất không ít hơn nửa so với khi không cổng', () => {
    for (const side of ['bac', 'tay'] as const) {
      const none = { giao: 0, cung: 0, voi: 0, no: 0 };
      expect(raid(none, 4, side, true).wrecked, side).toBeGreaterThanOrEqual(raid(none, 4, side, false).wrecked);
      for (const n of [4, 6]) {
        const without = raid(FULL, n, side, false);
        const withGates = raid(FULL, n, side, true);
        expect(withGates.lost, `đợt ${n} ${side}`).toBeGreaterThanOrEqual(without.lost / 2);
        expect(withGates.lost + withGates.wrecked, `đợt ${n} ${side}`).toBeGreaterThan(10);
      }
    }
  });
});

describe('mẫu kinh đô có cổng thành', () => {
  it('chỗ cổng: Phong Châu hai cổng trên lũy; Cổ Loa, Cổ Loa giữ sông hai cổng trên vòng ngoài, Điện 8 thêm hai trên vòng giữa; Đê bao không có', () => {
    const want: Record<string, number[]> = {
      phongChau: [0, 0, 0, 0, 2, 2, 2, 2],
      deBao: [0, 0, 0, 0, 0, 0, 0, 0],
      coLoa: [0, 0, 0, 0, 2, 2, 2, 4],
      coLoaSong: [0, 0, 0, 0, 2, 2, 2, 4],
    };
    for (const id of MAU_IDS) {
      for (let level = 1; level <= 8; level++) {
        const marks = mauSlots(id, level).filter((s) => s.cong);
        expect(marks.length, `${id} Điện ${level}`).toBe(want[id][level - 1]);
        // Chỗ cổng là đoạn tường, không trùng ụ nỏ; từng cặp đối xứng qua đường chéo.
        for (const m of marks) {
          expect(['luy', 'thanh']).toContain(m.type);
          expect(m.uNo).toBeFalsy();
          expect(marks.some((o) => o.x === m.z && o.z === m.x)).toBe(true);
        }
      }
    }
  });

  it('chưa mở cổng: áp mẫu vẫn dựng tường ở chỗ cổng; đã mở: dựng cổng, vòng thành vẫn đủ ba vòng', () => {
    const s = ch3(7);
    const r = applyMau(s, 'coLoa');
    expect(r.ok).toBe(true);
    const gates = s.buildings.filter((b) => b.type === 'congThanh');
    expect(gates).toHaveLength(2);
    expect(wallRings(s)).toBeGreaterThanOrEqual(3);
    // Mỗi cổng đứng đúng một chỗ có cờ cổng của mẫu.
    const marks = mauSlots('coLoa', 7).filter((x) => x.cong);
    for (const g of gates) expect(marks.some((m) => m.x === g.x && m.z === g.z)).toBe(true);

    // Chương 2 (cổng chưa mở): mẫu Phong Châu ở Điện 6 dựng lũy liền ở chỗ cổng, không để hở.
    const s2 = createInitialState(0);
    setDien(s2, 6);
    s2.questIndex = CH3_QUEST_START - 1;
    s2.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
    expect(applyMau(s2, 'phongChau').ok).toBe(true);
    expect(s2.buildings.some((b) => b.type === 'congThanh')).toBe(false);
    for (const m of mauSlots('phongChau', 6).filter((x) => x.cong)) {
      expect(s2.buildings.some((b) => b.type === 'luy' && b.x === m.x && b.z === m.z)).toBe(true);
    }
  });

  it('cổng giữa trục Điện: lũy Phong Châu có cổng thẳng cột giữa Điện', () => {
    const marks = mauSlots('phongChau', 5).filter((x) => x.cong);
    const axis = DIEN + Math.floor(BUILDINGS.dien.w / 2);
    expect(marks.some((m) => m.x === axis)).toBe(true);
    expect(marks.some((m) => m.z === axis)).toBe(true);
    expect(DIEN_END).toBeGreaterThan(axis);
    expect(edge(5)).toBeLessThan(axis);
  });
});
