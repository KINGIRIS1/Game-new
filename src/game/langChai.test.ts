// Canh làng chài và cá: cần Điện 3, phải sát sông, cá mỗi phút theo cấp và người làm, dân và lính ăn cá trước rồi mới
// ăn gạo, cá thừa bỏ phí, đủ cá thì hết thiếu gạo, Đền cộng vào cá, lũ không làm hư, Lạc hầu gợi ý sau xưởng mộc.

import { describe, expect, it } from 'vitest';
import { BUILDINGS, CA_PER_MIN, GAO_PER_DAN, TEMPLE_BONUS } from './defs';
import {
  canPlace,
  createInitialState,
  findSpot,
  fishOf,
  fishPerMinute,
  foodPerMinute,
  isStarving,
  limitOf,
  markHinted,
  netPerMinute,
  nextHint,
  place,
  productionPerMinute,
  upkeepPerMinute,
  type Building,
  type GameState,
} from './game';
import { floodToleranceOf } from './terrain';
import { DIEN, bank, setDien } from './testmap';

/** Kinh đô ở Điện `level`, của nhiều, `dan` dân. */
function capital(level: number, dan = 30): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.resources = { gao: 5000, voOc: 5000, datDa: 5000, sat: 1000, go: 5000 };
  s.dan = dan;
  return s;
}

/** Dựng làng chài sát bờ sông phía nam, ở cấp `level`, đủ người làm. */
function village(s: GameState, level = 1, x = DIEN): Building {
  const r = place(s, 'langChai', x, bank('langChai'));
  if (!r.ok) throw new Error(r.reason);
  r.value.level = level;
  r.value.workers = BUILDINGS.langChai.workers![level - 1];
  return r.value;
}

describe('làng chài', () => {
  it('cần Điện cấp 3, phải sát bờ sông; số tối đa 0, 0, 1, 1, 2, 2, 3, 3 theo cấp Điện', () => {
    const s = capital(2);
    expect(canPlace(s, 'langChai', DIEN, bank('langChai'))).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    const limits = [1, 2, 3, 4, 5, 6, 7, 8].map((level) => {
      setDien(s, level);
      return limitOf(s, 'langChai');
    });
    expect(limits).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    setDien(s, 3);
    expect(canPlace(s, 'langChai', DIEN, bank('langChai', 2))).toEqual({ ok: false, reason: 'phaiSatSong' });
    expect(canPlace(s, 'langChai', DIEN, bank('langChai')).ok).toBe(true);
    // Chỗ gợi ý dựng cũng sát sông.
    const spot = findSpot(s, 'langChai')!;
    const def = BUILDINGS.langChai;
    expect(spot.x + def.w === 52 || spot.z + def.d === 52).toBe(true);
  });

  it('dựng tốn gạo và gỗ; nâng cấp cũng tốn gỗ (đóng thuyền)', () => {
    expect(BUILDINGS.langChai.buildCost).toEqual({ gao: 80, go: 60 });
    for (let level = 2; level <= 8; level++) expect(BUILDINGS.langChai.upgradeCost[level].go).toBeGreaterThan(0);
  });

  it('cá 6 → 101 mỗi phút theo cấp khi đủ người, thiếu người thì ít đi theo tỉ lệ, làng hư thì không có cá', () => {
    const s = capital(8);
    const b = village(s);
    const perLevel = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
      b.level = level;
      b.workers = BUILDINGS.langChai.workers![level - 1];
      return fishOf(b);
    });
    expect(perLevel).toEqual([6, 10, 15, 22, 30, 40, 52, 68, 83, 101]);
    expect(perLevel).toEqual(CA_PER_MIN);
    b.level = 5;
    b.workers = 1;
    expect(fishOf(b)).toBeCloseTo(30 / 3);
    b.damaged = true;
    expect(fishOf(b)).toBe(0);
    // Làng chài không làm ra tài nguyên nào vào kho: cá chỉ đỡ phần ăn.
    expect(productionPerMinute(s).gao).toBe(productionPerMinute(capital(8)).gao);
  });

  it('dân và lính ăn cá trước, thiếu mới ăn gạo; cá thừa bỏ phí', () => {
    const s = capital(5, 40);
    s.troops.giao = 10;
    const food = 40 * GAO_PER_DAN + 10 * 0.6;
    expect(foodPerMinute(s)).toBeCloseTo(food);
    expect(upkeepPerMinute(s)).toBeCloseTo(food);
    const netBefore = netPerMinute(s).gao;
    village(s, 2);
    expect(fishPerMinute(s)).toBeCloseTo(10);
    expect(upkeepPerMinute(s)).toBeCloseTo(food - 10);
    expect(netPerMinute(s).gao).toBeCloseTo(netBefore + 10);
    // Thêm làng chài cấp 5: cá 40, quá phần ăn 22; gạo phải ăn còn 0, không âm, phần thừa không thành gạo.
    village(s, 5, DIEN - 5);
    expect(fishPerMinute(s)).toBeCloseTo(40);
    expect(upkeepPerMinute(s)).toBe(0);
    expect(netPerMinute(s).gao).toBeCloseTo(netBefore + food);
  });

  it('đủ cá thì hết thiếu gạo', () => {
    // 30 dân ăn 12 gạo mỗi phút, Điện cấp 3 chỉ làm ra 8: hết gạo là thiếu.
    const s = capital(3, 30);
    const b = village(s, 3);
    s.resources.gao = 0;
    expect(fishPerMinute(s)).toBeGreaterThanOrEqual(foodPerMinute(s));
    expect(isStarving(s)).toBe(false);
    b.workers = 0;
    expect(isStarving(s)).toBe(true);
  });

  it('Đền Phù Đổng cộng vào cá như mọi sản lượng', () => {
    const s = capital(5, 60);
    village(s, 5);
    expect(fishPerMinute(s)).toBeCloseTo(30);
    s.giong.ascended = true;
    const spot = findSpot(s, 'denPhuDong')!;
    expect(place(s, 'denPhuDong', spot.x, spot.z).ok).toBe(true);
    expect(fishPerMinute(s)).toBeCloseTo(30 * (1 + TEMPLE_BONUS));
  });

  it('lũ không làm hư làng chài, như bến', () => {
    expect(floodToleranceOf('langChai')).toBe(floodToleranceOf('ben'));
    expect(floodToleranceOf('langChai')).toBeGreaterThanOrEqual(9);
  });

  it('Lạc hầu gợi ý làng chài khi lên Điện 3, sau lời gợi ý xưởng mộc', () => {
    const s = capital(2);
    // Nhà thợ hồ mở từ đầu nên Lạc hầu gợi ý trước (`xay.test.ts`).
    markHinted(s, 'thoHo');
    expect(nextHint(s)).toBe('xuongMoc');
    markHinted(s, 'xuongMoc');
    expect(nextHint(s)).toBeNull();
    setDien(s, 3);
    expect(nextHint(s)).toBe('langChai');
    markHinted(s, 'langChai');
    expect(nextHint(s)).toBeNull();
  });
});
