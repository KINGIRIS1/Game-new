// Vùng đất bên kia sông: lưới nới qua sông (bờ nam sông Đà, bờ đông sông Thao, ngã ba sông), bản lưu 18.

import { describe, expect, it } from 'vitest';
import { startBattle, stepBattle } from './battle';
import { canPlace, createInitialState, type GameState } from './game';
import { FAR_FOREST, GRID, RIVER_DIVE, RIVER_END, RIVER_START, baseHeights, farBankOf, isNearBank, isRiver, riverDistance } from './map';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { floodMap } from './terrain';

/** Dấu vân tay độ cao tự nhiên của lưới 55×55 trước khi nới lưới (tính từ `map.ts` cũ). */
const OLD_FINGERPRINT = 3373663266;
const OLD_GRID = 55;

describe('lưới qua sông', () => {
  it('sông rộng 7 ô; sông Thao chảy tới ngã ba rồi đổ vào sông Đà, sông Đà chảy suốt bề ngang', () => {
    expect(GRID).toBe(76);
    expect(RIVER_END - RIVER_START).toBe(7);
    for (let x = RIVER_START; x < RIVER_END; x++) for (const z of [0, 20, 51, 52, 58]) expect(isRiver(x, z)).toBe(true);
    for (let z = RIVER_START; z < RIVER_END; z++) for (const x of [0, 20, 51, 60, GRID - 1]) expect(isRiver(x, z)).toBe(true);
    // Qua ngã ba, sông Thao không chảy tiếp: bờ nam liền một dải.
    expect(isRiver(55, RIVER_END)).toBe(false);
    expect(isRiver(65, 65)).toBe(false);
    expect(isRiver(51, 51)).toBe(false);
    expect(isRiver(RIVER_END, 10)).toBe(false);
    expect(isRiver(10, RIVER_END)).toBe(false);
    // Thủy quái, thuyền giặc chỉ dùng ba ô sông sát bờ bên này, như khi sông trong lưới còn rộng 3 ô.
    expect(RIVER_DIVE).toBe(55);
  });

  it('hai bờ bên kia: bờ nam sông Đà (cả góc sau ngã ba), bờ đông sông Thao', () => {
    expect(farBankOf(10, 65)).toBe('nam');
    expect(farBankOf(65, 65)).toBe('nam');
    expect(farBankOf(65, 10)).toBe('dong');
    expect(farBankOf(10, 10)).toBe(null);
    expect(farBankOf(55, 10)).toBe(null);
    expect(farBankOf(65, 55)).toBe(null);
    expect(isNearBank(51, 51)).toBe(true);
    expect(isNearBank(52, 10)).toBe(false);
    expect(isNearBank(65, 10)).toBe(false);
    // Mỗi bờ sâu 3 khoảnh 5×5, rồi hai ô rừng ngoài cùng.
    expect(FAR_FOREST - RIVER_END).toBe(15);
    expect(GRID - FAR_FOREST).toBe(2);
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
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) {
        if (isRiver(x, z)) expect(h[z * GRID + x]).toBe(-1);
        else expect(h[z * GRID + x]).toBeLessThanOrEqual(3);
      }
    }
    expect(riverDistance(10, RIVER_END)).toBe(0);
    expect(riverDistance(RIVER_END + 4, 10)).toBe(4);
    expect(riverDistance(RIVER_END + 8, RIVER_START - 2)).toBe(1);
  });

  it('bờ bên kia chưa khai phá: không xây được, lũ không tràn vào', () => {
    const s: GameState = createInitialState(0);
    s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
    expect(canPlace(s, 'nhaSan', 20, 65).ok).toBe(false);
    expect(canPlace(s, 'nhaSan', 65, 20).ok).toBe(false);
    expect(canPlace(s, 'nhaSan', 54, 20).ok).toBe(false);
    const wet = floodMap(s, 3);
    for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) if (farBankOf(x, z)) expect(wet[z * GRID + x]).toBe(0);
  });
});

describe('nâng bản lưu 17 lên 18', () => {
  /** Đưa state hiện tại về dạng bản lưu 17: mảng độ cao 55×55, ô 52–54 là sông. */
  function asV17(s: GameState): Record<string, any> {
    const raw = JSON.parse(serialize(s));
    raw.version = 17;
    const old: number[] = [];
    for (let z = 0; z < OLD_GRID; z++) for (let x = 0; x < OLD_GRID; x++) old.push(s.heights[z * GRID + x]);
    raw.heights = old;
    return raw;
  }

  it('dàn lại độ cao, giữ đất đã đắp bên này, sông và bờ bên kia lấy độ cao tự nhiên', () => {
    const s = createInitialState(0);
    s.heights[40 * GRID + 30] = 4;
    const back = deserialize(JSON.stringify(asV17(s)))!;
    expect(back).toBeDefined();
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.heights.length).toBe(GRID * GRID);
    expect(back.heights[40 * GRID + 30]).toBe(4);
    expect(back.heights).toEqual(s.heights);
  });

  it('trận giữ kinh đô đang dở: đường đi của giặc đổi theo chỉ số ô mới, đánh tiếp được', () => {
    const s = createInitialState(0);
    const battle = startBattle(s, 1, 'bac');
    for (let i = 0; i < 40; i++) stepBattle(s, battle, 0.05);
    s.raid.phase = 'battle';
    s.raid.battle = battle;
    const walking = battle.fighters.filter((f) => f.path && f.path.length > 1);
    expect(walking.length).toBeGreaterThan(0);
    const raw = asV17(s);
    const toOld = (i: number) => Math.floor(i / GRID) * OLD_GRID + (i % GRID);
    for (const f of raw.raid.battle.fighters) if (f.path) f.path = f.path.map(toOld);
    const back = deserialize(JSON.stringify(raw))!;
    expect(back).toBeDefined();
    expect(back.raid.battle!.fighters.map((f) => f.path)).toEqual(battle.fighters.map((f) => f.path));
    for (let i = 0; i < 20; i++) stepBattle(back, back.raid.battle!, 0.05);
  });

  it('bản lưu mới giữ nguyên qua lưu rồi nạp', () => {
    const s = createInitialState(0);
    const back = deserialize(serialize(s))!;
    expect(back.heights).toEqual(s.heights);
  });
});
