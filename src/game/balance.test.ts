// Mô phỏng một người chơi hợp lý để kiểm tra nhịp tiến trình: Điện cấp 2–5 ở chương 1, cấp 6, 7 ở chương 2, 3.

import { describe, expect, it } from 'vitest';
import { BUILDINGS, CH2_QUEST_START, CH3_QUEST_START, type BuildingType } from './defs';
import {
  acceptOffer,
  autoAssign,
  canPlace,
  canUpgrade,
  claimQuest,
  upgradeCostOf,
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

/** Người chơi biết dành dụm: chỉ chi cho việc khác khi vẫn còn giữ được một phần để nâng Điện. */
function affordWithReserve(s: GameState, cost: Partial<Record<keyof GameState['resources'], number>>): boolean {
  const dien = s.buildings.find((b) => b.type === 'dien')!;
  const next = BUILDINGS.dien.upgradeCost[dien.level + 1] ?? {};
  return (Object.keys(s.resources) as (keyof GameState['resources'])[]).every(
    (r) => s.resources[r] - (cost[r] ?? 0) >= 0.6 * (next[r] ?? 0) || !(cost[r] ?? 0),
  );
}

/** Đổi hàng với thuyền buôn: đưa thứ đang dư nhiều nhất, lấy thứ khác. */
function tradeSurplus(s: GameState): void {
  const visit = s.merchant.visit;
  if (!visit) return;
  visit.offers.forEach((o, i) => {
    if (o.taken) return;
    const most = (Object.keys(s.resources) as (keyof typeof s.resources)[]).reduce((a, b) => (s.resources[a] >= s.resources[b] ? a : b));
    if (o.give.r === most && s.resources[o.give.r] >= o.give.n * 2) acceptOffer(s, i);
  });
}

/** Thứ tự một người chơi hợp lý dựng kinh tế. */
const ECONOMY: BuildingType[] = ['ruong', 'ben', 'nhaSan', 'baiDa', 'kho', 'loRen'];

/**
 * Một giây chơi: nhận thưởng, xây cho đủ nhiệm vụ, ưu tiên nâng Điện,
 * rồi dựng và nâng công trình kinh tế, chia dân rảnh vào làm.
 */
function playSecond(s: GameState): void {
  while (questDone(s)) claimQuest(s);
  if (countOf(s, 'luy') < 6) placeAnywhere(s, 'luy');
  if (canUpgrade(s, 1).ok) upgrade(s, 1);
  // Như hướng dẫn của Lạc hầu: lên Điện cấp 2 trước rồi mới mở rộng kinh tế.
  for (const type of dienLevel(s) < 2 ? ECONOMY.slice(0, 2) : ECONOMY) {
    if (countOf(s, type) < limitOf(s, type) && affordWithReserve(s, BUILDINGS[type].buildCost)) placeAnywhere(s, type);
  }
  autoAssign(s);
  tradeSurplus(s);
  for (const b of s.buildings) {
    if (b.type !== 'dien' && b.type !== 'luy' && canUpgrade(s, b.id).ok && affordWithReserve(s, upgradeCostOf(b)!)) upgrade(s, b.id);
  }
  tick(s, 1000);
}

function playUntilDien(target: number, maxMinutes: number): number {
  const s = createInitialState(0);
  for (let sec = 0; sec < maxMinutes * 60; sec++) {
    if (dienLevel(s) >= target) return sec / 60;
    playSecond(s);
  }
  return Infinity;
}

/**
 * Chơi tiếp qua các chương: sau khi lên Điện 5 còn chừng nửa giờ chương 1 (Gióng, màn 5–8) thì vào chương 2;
 * lên Điện 6 rồi còn chừng nửa giờ chương 2 thì vào chương 3. Trả về số phút từ lúc vào mỗi chương tới khi lên Điện 6, 7.
 * Lúc vào mỗi chương, của dành dụm coi như đã tiêu hết (dựng đền, lễ vật, rèn đồ, quân), nên số phút đo được là
 * số phút sản lượng của kinh đô cần để lên cấp.
 */
function playChapters(): { dien6: number; dien7: number } {
  const s = createInitialState(0);
  let at5 = -1;
  let at6 = -1;
  let enter2 = -1;
  let enter3 = -1;
  for (let sec = 0; sec < 6 * 3600; sec++) {
    const level = dienLevel(s);
    if (level >= 5 && at5 < 0) at5 = sec;
    if (at5 >= 0 && enter2 < 0 && sec >= at5 + 30 * 60) {
      s.questIndex = CH2_QUEST_START;
      s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
      enter2 = sec;
    }
    if (level >= 6 && at6 < 0) at6 = sec;
    if (at6 >= 0 && enter3 < 0 && sec >= at6 + 30 * 60) {
      s.questIndex = CH3_QUEST_START;
      s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
      enter3 = sec;
    }
    if (level >= 7) return { dien6: (at6 - enter2) / 60, dien7: (sec - enter3) / 60 };
    playSecond(s);
  }
  return { dien6: at6 < 0 ? Infinity : (at6 - enter2) / 60, dien7: Infinity };
}

describe('nhịp tiến trình', () => {
  it('lên Điện cấp 2 trong khoảng 3–10 phút', () => {
    const minutes = playUntilDien(2, 30);
    expect(minutes).toBeGreaterThanOrEqual(3);
    expect(minutes).toBeLessThanOrEqual(10);
  });

  it('lên Điện cấp 3 trong khoảng 12–30 phút', () => {
    const minutes = playUntilDien(3, 60);
    expect(minutes).toBeGreaterThanOrEqual(12);
    expect(minutes).toBeLessThanOrEqual(30);
  });

  // Chưa có phần thưởng phó bản (lát cắt 3) nên chỉ trông vào kinh tế; phó bản sẽ làm nhịp nhanh hơn.
  it('lên Điện cấp 5 trong khoảng 45–70 phút', () => {
    const minutes = playUntilDien(5, 120);
    expect(minutes).toBeGreaterThanOrEqual(45);
    expect(minutes).toBeLessThanOrEqual(70);
  });

  // Không tính thưởng phó bản chương 2, 3 (hàng nghìn mỗi màn), nên chơi thật còn nhanh hơn.
  it('vào chương 2 thì khoảng 12–20 phút lên Điện 6; vào chương 3 thì khoảng 25–40 phút lên Điện 7', () => {
    const { dien6, dien7 } = playChapters();
    expect(dien6).toBeGreaterThanOrEqual(12);
    expect(dien6).toBeLessThanOrEqual(20);
    expect(dien7).toBeGreaterThanOrEqual(25);
    expect(dien7).toBeLessThanOrEqual(40);
  });
});
