// Vùng đất bên kia sông: lưới nới qua sông (bờ nam sông Đà, bờ đông sông Thao, ngã ba sông).

import { describe, expect, it } from 'vitest';
import { canPlace, createInitialState, type GameState } from './game';
import { FAR_FOREST, GRID, RIVER_END, RIVER_START, baseHeights, farBankOf, isRiver, isUnlocked, riverDistance } from './map';
import { deserialize, serialize } from './save';
import { floodMap } from './terrain';

/** Dấu vân tay độ cao tự nhiên của lưới 55×55 trước khi nới lưới (tính từ `map.ts` cũ). */
const OLD_FINGERPRINT = 3373663266;
const OLD_GRID = 55;

describe('lưới qua sông', () => {
  it('sông Thao chảy tới ngã ba rồi đổ vào sông Đà, sông Đà chảy suốt bề ngang', () => {
    expect(GRID).toBe(72);
    for (let x = RIVER_START; x < RIVER_END; x++) for (const z of [0, 20, 51, 52, 54]) expect(isRiver(x, z)).toBe(true);
    for (let z = RIVER_START; z < RIVER_END; z++) for (const x of [0, 20, 51, 60, 71]) expect(isRiver(x, z)).toBe(true);
    // Qua ngã ba, sông Thao không chảy tiếp: bờ nam liền một dải.
    expect(isRiver(53, 60)).toBe(false);
    expect(isRiver(60, 60)).toBe(false);
    expect(isRiver(51, 51)).toBe(false);
    expect(isRiver(RIVER_END, 10)).toBe(false);
    expect(isRiver(10, RIVER_END)).toBe(false);
  });

  it('hai bờ bên kia: bờ nam sông Đà, bờ đông sông Thao', () => {
    expect(farBankOf(10, 60)).toBe('nam');
    expect(farBankOf(60, 60)).toBe('nam');
    expect(farBankOf(60, 10)).toBe('dong');
    expect(farBankOf(10, 10)).toBe(null);
    expect(farBankOf(53, 10)).toBe(null);
    expect(farBankOf(60, 53)).toBe(null);
  });

  it('độ cao bên này giữ y như trước khi nới lưới', () => {
    const h = baseHeights();
    expect(h.length).toBe(GRID * GRID);
    let fp = 0x811c9dc5;
    for (let z = 0; z < OLD_GRID; z++) for (let x = 0; x < OLD_GRID; x++) fp = Math.imul(fp ^ (h[z * GRID + x] + 2), 0x01000193) >>> 0;
    expect(fp).toBe(OLD_FINGERPRINT);
  });

  it('bờ bên kia có bãi bồi sát sông, vào trong là đồng bằng và đồi', () => {
    const h = baseHeights();
    for (const x of [5, 20, 40]) {
      for (let z = RIVER_END; z < RIVER_END + 3; z++) expect(h[z * GRID + x]).toBe(0);
      expect(h[(RIVER_END + 6) * GRID + x]).toBeGreaterThanOrEqual(1);
    }
    for (const z of [5, 20, 40]) for (let x = RIVER_END; x < RIVER_END + 3; x++) expect(h[z * GRID + x]).toBe(0);
    for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) if (!isRiver(x, z)) expect(h[z * GRID + x]).toBeLessThanOrEqual(3);
    expect(riverDistance(10, RIVER_END)).toBe(0);
    expect(riverDistance(RIVER_END + 4, 10)).toBe(4);
    expect(FAR_FOREST).toBe(70);
  });

  it('bờ bên kia chưa khai phá: không xây được, lũ không tràn vào', () => {
    const s: GameState = createInitialState(0);
    expect(isUnlocked(20, 60, 8)).toBe(false);
    expect(isUnlocked(60, 20, 8)).toBe(false);
    s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 };
    expect(canPlace(s, 'luy', 20, 60)).toEqual({ ok: false, reason: 'ngoaiVung' });
    const wet = floodMap(s, 3, 8);
    for (let z = RIVER_END; z < GRID; z++) for (let x = 0; x < RIVER_START; x++) expect(wet[z * GRID + x]).toBe(0);
  });
});

describe('nâng bản lưu 11 lên 12', () => {
  /** Đưa state hiện tại về dạng bản lưu 11: mảng độ cao 55×55. */
  function asV11(s: GameState): Record<string, unknown> {
    const raw = JSON.parse(serialize(s));
    raw.version = 11;
    const old: number[] = [];
    for (let z = 0; z < OLD_GRID; z++) for (let x = 0; x < OLD_GRID; x++) old.push(s.heights[z * GRID + x]);
    raw.heights = old;
    return raw;
  }

  it('dàn lại độ cao, giữ đất đã đắp bên này, bờ bên kia lấy độ cao tự nhiên', () => {
    const s = createInitialState(0);
    s.heights[40 * GRID + 30] = 4;
    const back = deserialize(JSON.stringify(asV11(s)))!;
    expect(back).toBeDefined();
    expect(back.version).toBe(12);
    expect(back.heights.length).toBe(GRID * GRID);
    expect(back.heights[40 * GRID + 30]).toBe(4);
    expect(back.heights).toEqual(s.heights);
  });

  it('đường đi của giặc trong trận đang dở đổi theo chỉ số ô mới', () => {
    const s = createInitialState(0);
    const raw = asV11(s);
    const path = [10 * OLD_GRID + 20, 11 * OLD_GRID + 21];
    raw.raid = {
      ...(raw.raid as object),
      phase: 'battle',
      battle: { fighters: [{ path }] },
    };
    const json = JSON.stringify(raw);
    // Bản lưu này thiếu nhiều phần của một trận thật; chỉ xem bước nâng đổi đường đi đúng chưa.
    const migrated = JSON.parse(json);
    const back = deserialize(json);
    const fighters = (back?.raid.battle as unknown as { fighters: { path: number[] }[] } | undefined)?.fighters;
    expect(migrated.raid.battle.fighters[0].path).toEqual(path);
    expect(fighters?.[0].path).toEqual([10 * GRID + 20, 11 * GRID + 21]);
  });
});
