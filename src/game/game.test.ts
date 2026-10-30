import { describe, expect, it } from 'vitest';
import { BUILDINGS, OFFLINE_CAP_MS, QUESTS, STORAGE_CAP } from './defs';
import {
  applyOffline,
  buildingAt,
  canPlace,
  claimQuest,
  countOf,
  createInitialState,
  dienLevel,
  place,
  productionPerMinute,
  questDone,
  remove,
  tick,
  upgrade,
  type GameState,
} from './game';
import { RIVER_START, areaStart, isUnlocked } from './map';

const T0 = 1_000_000;

function rich(): GameState {
  const s = createInitialState(T0);
  s.resources = { gao: 400, voOc: 400, datDa: 0, sat: 0 };
  return s;
}

describe('trạng thái ban đầu', () => {
  it('có Điện Vua Hùng cấp 1 nằm trong vùng xây được', () => {
    const s = createInitialState(T0);
    const dien = s.buildings[0];
    expect(dien.type).toBe('dien');
    expect(dienLevel(s)).toBe(1);
    for (let dx = 0; dx < BUILDINGS.dien.w; dx++) {
      expect(isUnlocked(dien.x + dx, dien.z, 1)).toBe(true);
    }
  });
});

describe('đặt công trình', () => {
  it('đặt ruộng trừ đúng giá và chiếm đủ 3×3 ô', () => {
    const s = rich();
    const r = place(s, 'ruong', 12, 12);
    expect(r.ok).toBe(true);
    expect(s.resources.voOc).toBe(400 - 30);
    expect(buildingAt(s, 14, 14)?.type).toBe('ruong');
    expect(buildingAt(s, 15, 15)).toBeUndefined();
  });

  it('không cho đặt chồng lên công trình khác', () => {
    const s = rich();
    expect(canPlace(s, 'ruong', 15, 15)).toEqual({ ok: false, reason: 'datBiChiem' });
  });

  it('không cho đặt ngoài vùng đã mở hoặc xuống sông', () => {
    const s = rich();
    const lo = areaStart(1);
    expect(canPlace(s, 'luy', lo - 1, 20)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canPlace(s, 'luy', RIVER_START, 20)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canPlace(s, 'ruong', RIVER_START - 2, 20)).toEqual({ ok: false, reason: 'ngoaiVung' });
  });

  it('bến chợ thuyền phải sát bờ sông', () => {
    const s = rich();
    expect(canPlace(s, 'ben', 12, 12)).toEqual({ ok: false, reason: 'phaiSatSong' });
    expect(canPlace(s, 'ben', RIVER_START - 2, 12).ok).toBe(true);
    expect(canPlace(s, 'ben', 12, RIVER_START - 2).ok).toBe(true);
  });

  it('báo thiếu tài nguyên', () => {
    const s = createInitialState(T0);
    s.resources.voOc = 3;
    expect(canPlace(s, 'luy', 12, 12)).toEqual({ ok: false, reason: 'thieuTaiNguyen' });
  });

  it('giới hạn số lượng theo cấp Điện', () => {
    const s = rich();
    s.resources.voOc = 10_000;
    expect(place(s, 'ruong', 11, 11).ok).toBe(true);
    expect(place(s, 'ruong', 11, 20).ok).toBe(true);
    expect(canPlace(s, 'ruong', 21, 11)).toEqual({ ok: false, reason: 'datGioiHan' });
  });

  it('không tự xây thêm Điện Vua Hùng', () => {
    expect(canPlace(rich(), 'dien', 11, 11)).toEqual({ ok: false, reason: 'khongTheXay' });
  });

  it('chỉ phá được lũy tre', () => {
    const s = rich();
    const luy = place(s, 'luy', 12, 12);
    expect(luy.ok && remove(s, luy.value.id).ok).toBe(true);
    expect(countOf(s, 'luy')).toBe(0);
    expect(remove(s, 1)).toEqual({ ok: false, reason: 'khongTheDo' });
  });
});

describe('nâng cấp', () => {
  it('công trình không được vượt cấp Điện', () => {
    const s = rich();
    const r = place(s, 'ruong', 12, 12);
    if (!r.ok) throw new Error('đặt ruộng thất bại');
    expect(upgrade(s, r.value.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    s.resources = { gao: 1000, voOc: 1000, datDa: 0, sat: 0 };
    expect(upgrade(s, 1).ok).toBe(true);
    expect(upgrade(s, r.value.id).ok).toBe(true);
    expect(r.value.level).toBe(2);
  });

  it('nâng Điện thì mở rộng đất', () => {
    const s = rich();
    const lo1 = areaStart(1);
    expect(isUnlocked(lo1 - 1, lo1, dienLevel(s))).toBe(false);
    s.resources = { gao: 1000, voOc: 1000, datDa: 0, sat: 0 };
    upgrade(s, 1);
    expect(isUnlocked(lo1 - 1, lo1, dienLevel(s))).toBe(true);
  });

  it('dừng ở cấp tối đa', () => {
    const s = rich();
    s.buildings[0].level = BUILDINGS.dien.maxLevel;
    expect(upgrade(s, 1)).toEqual({ ok: false, reason: 'capToiDa' });
  });

  it('giá nâng Điện luôn vừa sức chứa của cấp hiện tại', () => {
    for (let level = 1; level < BUILDINGS.dien.maxLevel; level++) {
      const cost = BUILDINGS.dien.upgradeCost[level + 1];
      expect(Math.max(cost.gao ?? 0, cost.voOc ?? 0)).toBeLessThanOrEqual(STORAGE_CAP[level - 1]);
    }
  });
});

describe('dòng thời gian', () => {
  it('sản xuất theo phút và dừng ở sức chứa', () => {
    const s = createInitialState(T0);
    const perMin = productionPerMinute(s);
    tick(s, 60_000);
    expect(s.resources.gao).toBeCloseTo(150 + perMin.gao);
    tick(s, 10 * 60 * 60_000);
    expect(s.resources.gao).toBe(STORAGE_CAP[0]);
  });

  it('khi vắng mặt chỉ được một nửa và tối đa 8 giờ', () => {
    const s = createInitialState(T0);
    s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
    const perMin = productionPerMinute(s).gao;
    const r = applyOffline(s, T0 + 10 * 60_000);
    expect(r.gained.gao).toBeCloseTo(perMin * 10 * 0.5);
    expect(s.lastSeen).toBe(T0 + 10 * 60_000);

    const t = createInitialState(T0);
    t.resources.gao = 0;
    expect(applyOffline(t, T0 + 3 * OFFLINE_CAP_MS).ms).toBe(OFFLINE_CAP_MS);
  });

  it('không tính thời gian âm khi đồng hồ máy bị lùi', () => {
    const s = createInitialState(T0);
    expect(applyOffline(s, T0 - 5000).ms).toBe(0);
    expect(s.resources.gao).toBe(150);
  });
});

describe('nhiệm vụ Lạc hầu', () => {
  it('đi lần lượt và phát thưởng', () => {
    const s = rich();
    expect(claimQuest(s)).toEqual({ ok: false, reason: 'chuaXong' });
    for (let i = 0; i < 6; i++) place(s, 'luy', 12 + i, 12);
    expect(questDone(s)).toBe(true);
    const before = s.resources.voOc;
    expect(claimQuest(s).ok).toBe(true);
    expect(s.resources.voOc).toBe(before + (QUESTS[0].reward.voOc ?? 0));
    expect(s.questIndex).toBe(1);
  });
});
