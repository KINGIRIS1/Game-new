// Mô phỏng một người chơi hợp lý để kiểm tra nhịp tiến trình của lát cắt 1.

import { describe, expect, it } from 'vitest';
import { BUILDINGS, type BuildingType } from './defs';
import {
  canPlace,
  canUpgrade,
  claimQuest,
  countOf,
  createInitialState,
  dienLevel,
  limitOf,
  place,
  questDone,
  tick,
  upgrade,
  type GameState,
} from './game';
import { GRID } from './map';

function placeAnywhere(s: GameState, type: BuildingType): boolean {
  const def = BUILDINGS[type];
  for (let z = 0; z <= GRID - def.d; z++) {
    for (let x = 0; x <= GRID - def.w; x++) {
      if (canPlace(s, type, x, z).ok) return place(s, type, x, z).ok;
    }
  }
  return false;
}

/** Mỗi giây chơi: nhận thưởng, xây cho đủ nhiệm vụ, ưu tiên nâng Điện, rồi đầu tư sản xuất. */
function playUntilDien(target: number, maxMinutes: number): number {
  const s = createInitialState(0);
  for (let sec = 0; sec < maxMinutes * 60; sec++) {
    if (dienLevel(s) >= target) return sec / 60;
    while (questDone(s)) claimQuest(s);
    if (countOf(s, 'luy') < 6) placeAnywhere(s, 'luy');
    if (canUpgrade(s, 1).ok) upgrade(s, 1);
    for (const type of ['ben', 'ruong'] as const) {
      if (countOf(s, type) < limitOf(s, type)) placeAnywhere(s, type);
    }
    for (const b of s.buildings) {
      if (b.type !== 'dien' && canUpgrade(s, b.id).ok) upgrade(s, b.id);
    }
    tick(s, 1000);
  }
  return Infinity;
}

describe('nhịp tiến trình', () => {
  it('lên Điện cấp 2 trong khoảng 3–10 phút', () => {
    const minutes = playUntilDien(2, 30);
    expect(minutes).toBeGreaterThanOrEqual(3);
    expect(minutes).toBeLessThanOrEqual(10);
  });

  // Lát cắt 1 chỉ có ruộng và bến. Phần thưởng phó bản ở lát cắt sau sẽ làm nhịp nhanh hơn.
  it('lên Điện cấp 5 trong khoảng 30–65 phút', () => {
    const minutes = playUntilDien(5, 120);
    expect(minutes).toBeGreaterThanOrEqual(30);
    expect(minutes).toBeLessThanOrEqual(65);
  });
});
