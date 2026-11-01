// Người chơi mô phỏng: chơi từng giây theo cách hợp lý. Dùng chung cho test nhịp tiến trình (`balance.test.ts`),
// báo cáo kinh tế (`kinhTe.ts`) và cảnh chụp thử (`scripts/chup.mjs`). Không chạy trong game thật.

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

/** Các việc người chơi mô phỏng làm. Báo cáo kinh tế dựa vào đây để ghi sổ từng khoản thu chi. */
export type Viec = 'nhiemVu' | 'xay' | 'nangDien' | 'nangCap' | 'doiHang' | 'vaoChuong' | 'thoiGian';
/** Bọc một việc: mặc định chỉ làm việc đó. Báo cáo kinh tế bọc thêm phần ghi tài nguyên trước và sau. */
export type Lam = (viec: Viec, run: () => void) => void;
const lamThang: Lam = (_, run) => run();

export function placeAnywhere(s: GameState, type: BuildingType): boolean {
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

/** Thứ tự một người chơi hợp lý dựng kinh tế. Ngoài các loại này, người chơi mô phỏng chỉ dựng lũy. */
export const ECONOMY: BuildingType[] = ['ruong', 'ben', 'nhaSan', 'baiDa', 'kho', 'loRen'];
/** Số lũy người chơi mô phỏng dựng cho đủ nhiệm vụ đầu. */
export const LUY_COUNT = 6;

/**
 * Một giây chơi: nhận thưởng, xây cho đủ nhiệm vụ, ưu tiên nâng Điện,
 * rồi dựng và nâng công trình kinh tế, chia dân rảnh vào làm.
 */
export function playSecond(s: GameState, lam: Lam = lamThang): void {
  lam('nhiemVu', () => {
    while (questDone(s)) claimQuest(s);
  });
  lam('xay', () => {
    if (countOf(s, 'luy') < LUY_COUNT) placeAnywhere(s, 'luy');
  });
  lam('nangDien', () => {
    if (canUpgrade(s, 1).ok) upgrade(s, 1);
  });
  lam('xay', () => {
    // Như hướng dẫn của Lạc hầu: lên Điện cấp 2 trước rồi mới mở rộng kinh tế.
    for (const type of dienLevel(s) < 2 ? ECONOMY.slice(0, 2) : ECONOMY) {
      if (countOf(s, type) < limitOf(s, type) && affordWithReserve(s, BUILDINGS[type].buildCost)) placeAnywhere(s, type);
    }
  });
  autoAssign(s);
  lam('doiHang', () => tradeSurplus(s));
  lam('nangCap', () => {
    for (const b of s.buildings) {
      if (b.type !== 'dien' && b.type !== 'luy' && canUpgrade(s, b.id).ok && affordWithReserve(s, upgradeCostOf(b)!)) upgrade(s, b.id);
    }
  });
  lam('thoiGian', () => tick(s, 1000));
}

/** Chơi từ đầu tới khi Điện đạt cấp `target`. Trả về số phút, hoặc Infinity nếu quá `maxMinutes`. */
export function playUntilDien(target: number, maxMinutes: number): number {
  const s = createInitialState(0);
  for (let sec = 0; sec < maxMinutes * 60; sec++) {
    if (dienLevel(s) >= target) return sec / 60;
    playSecond(s);
  }
  return Infinity;
}

/** Giây chơi lúc đạt từng mốc, -1 nếu chưa tới. */
export type Moc = { at5: number; enter2: number; at6: number; enter3: number; at7: number };

/** Sau khi lên Điện 5 (hay 6), người chơi còn ở chương cũ chừng chừng này giây rồi mới vào chương mới. */
export const STAY_AFTER_S = 30 * 60;

/**
 * Chơi tiếp qua các chương: sau khi lên Điện 5 còn chừng nửa giờ chương 1 (Gióng, màn 5–8) thì vào chương 2;
 * lên Điện 6 rồi còn chừng nửa giờ chương 2 thì vào chương 3. Dừng khi lên Điện 7.
 * Lúc vào mỗi chương, của dành dụm coi như đã tiêu hết (dựng đền, lễ vật, rèn đồ, quân), nên số phút đo được là
 * số phút sản lượng của kinh đô cần để lên cấp.
 *
 * - `lam`: bọc từng việc (báo cáo kinh tế ghi sổ ở đây).
 * - `s`: chơi tiếp trên state này thay vì một ván mới.
 * - `until`: dừng sớm khi trả về true, xét trước mỗi giây chơi (cảnh chụp thử dừng ở giữa chương 2).
 */
export function playChapters(
  opts: { lam?: Lam; s?: GameState; maxSec?: number; until?: (m: Moc, sec: number) => boolean } = {},
): Moc {
  const { lam = lamThang, s = createInitialState(0), maxSec = 6 * 3600, until } = opts;
  const m: Moc = { at5: -1, enter2: -1, at6: -1, enter3: -1, at7: -1 };
  for (let sec = 0; sec < maxSec; sec++) {
    if (until?.(m, sec)) return m;
    const level = dienLevel(s);
    if (level >= 5 && m.at5 < 0) m.at5 = sec;
    if (m.at5 >= 0 && m.enter2 < 0 && sec >= m.at5 + STAY_AFTER_S) {
      lam('vaoChuong', () => {
        s.questIndex = CH2_QUEST_START;
        s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
      });
      m.enter2 = sec;
    }
    if (level >= 6 && m.at6 < 0) m.at6 = sec;
    if (m.at6 >= 0 && m.enter3 < 0 && sec >= m.at6 + STAY_AFTER_S) {
      lam('vaoChuong', () => {
        s.questIndex = CH3_QUEST_START;
        s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
      });
      m.enter3 = sec;
    }
    if (level >= 7) {
      m.at7 = sec;
      return m;
    }
    playSecond(s, lam);
  }
  return m;
}
