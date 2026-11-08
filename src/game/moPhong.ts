// Người chơi mô phỏng: chơi từng giây theo cách hợp lý. Dùng chung cho test nhịp tiến trình (`balance.test.ts`),
// báo cáo kinh tế (`kinhTe.ts`) và cảnh chụp thử (`scripts/chup.mjs`). Không chạy trong game thật.

import { BUILDINGS, CH2_QUEST_START, CH3_QUEST_START, CH4_QUEST_START, DON_DAO, QUESTS, QUIZ_TURNS, THUYEN_CHIEN, type BuildingType } from './defs';
import { DAO_IDS, benOf, canDon, canThuyen, donCost } from './dao';
import {
  acceptOffer,
  autoAssign,
  findSpot,
  claimQuest,
  upgradeCostOf,
  createInitialState,
  dienLevel,
  fishPerMinute,
  foodPerMinute,
  limitOf,
  place,
  questDone,
  storageCap,
  tick,
  usedOf,
  type GameState,
} from './game';
import { KHOANH_N, khoanhCost, khoanhOrigin, openKhoanh, openable } from './khoanh';
import { KHOANH } from './map';
import { canStartUpgrade, isBusy, startBuild, startDon, startThuyen, startUpgrade, thoRanh, traLoi, type CongViec } from './xay';

/** Các việc người chơi mô phỏng làm. Báo cáo kinh tế dựa vào đây để ghi sổ từng khoản thu chi. */
export type Viec = 'nhiemVu' | 'xay' | 'phatRung' | 'nangDien' | 'nangCap' | 'dongDao' | 'doiHang' | 'vaoChuong' | 'thoiGian';
/** Bọc một việc: mặc định chỉ làm việc đó. Báo cáo kinh tế bọc thêm phần ghi tài nguyên trước và sau. */
export type Lam = (viec: Viec, run: () => void) => void;
const lamThang: Lam = (_, run) => run();

/** Dựng ngay ở chỗ hợp lý gần Điện nhất, ưu tiên chỗ thoáng (`findSpot`). Dùng cho test và cảnh chụp thử. */
export function placeAnywhere(s: GameState, type: BuildingType): boolean {
  const spot = findSpot(s, type);
  return !!spot && place(s, type, spot.x, spot.z).ok;
}

/** Số câu đố sử người chơi mô phỏng trả lời đúng mỗi việc xây (0–3); 3 là việc nào cũng xong ngay như trước. */
let dungMoiViec = 0;

/** Người chơi trả lời câu đố sử cho việc vừa giao: đúng `dungMoiViec` câu. */
function doSu(s: GameState, v: CongViec | null): void {
  for (let i = 0; v && i < dungMoiViec; i++) traLoi(s, v.id, true);
}

/** Giao một tốp dựng ở chỗ hợp lý gần Điện nhất (`findSpot`). */
function startAnywhere(s: GameState, type: BuildingType): boolean {
  if (!thoRanh(s)) return false;
  const spot = findSpot(s, type);
  if (!spot) return false;
  const r = startBuild(s, type, spot.x, spot.z);
  if (r.ok) doSu(s, r.value);
  return r.ok;
}

/** Giao một tốp nâng công trình `id`. */
function tryUpgrade(s: GameState, id: number): boolean {
  const r = startUpgrade(s, id);
  if (r.ok) doSu(s, r.value);
  return r.ok;
}

/** Người chơi biết dành dụm: chỉ chi cho việc khác khi vẫn còn giữ được một phần để nâng Điện. */
function affordWithReserve(s: GameState, cost: Partial<Record<keyof GameState['resources'], number>>): boolean {
  const dien = s.buildings.find((b) => b.type === 'dien')!;
  // Điện đang nâng (đã trả của) thì dành cho cấp sau nữa.
  const next = BUILDINGS.dien.upgradeCost[dien.level + (isBusy(s, dien.id) ? 2 : 1)] ?? {};
  return (Object.keys(s.resources) as (keyof GameState['resources'])[]).every(
    (r) => s.resources[r] - (cost[r] ?? 0) >= 0.6 * (next[r] ?? 0) || !(cost[r] ?? 0),
  );
}

/**
 * Đổi hàng với thuyền buôn: đưa thứ đang dư nhiều nhất, lấy thứ khác. Gỗ thì đưa phần thừa ra ngoài số gỗ còn cần
 * cho việc sắp làm (`woodWant`), không lấy thêm gỗ khi chưa thiếu.
 */
function tradeSurplus(s: GameState): void {
  const visit = s.merchant.visit;
  if (!visit) return;
  visit.offers.forEach((o, i) => {
    if (o.taken) return;
    if (o.get.r === 'go' && !woodShort(s)) return;
    if (o.give.r === 'go') {
      if (s.resources.go - o.give.n >= woodWant(s)) acceptOffer(s, i);
      return;
    }
    const most = (Object.keys(s.resources) as (keyof typeof s.resources)[]).reduce((a, b) => (s.resources[a] >= s.resources[b] ? a : b));
    if (o.give.r === most && s.resources[o.give.r] >= o.give.n * 2) acceptOffer(s, i);
  });
}

/**
 * Khoảnh nên phát để dựng `type`, theo thứ tự ưu tiên: loại cần sát sông (bến) thì khoảnh ven sông; loại khác thì
 * khoảnh gần Điện nhất. Rỗng nếu không giữ được phần dành để nâng Điện (giá phát rừng tăng từng nấc nên càng về sau
 * càng ít phát).
 */
function khoanhFor(s: GameState, type: BuildingType): number[] {
  if (!affordWithReserve(s, khoanhCost(s))) return [];
  const dien = s.buildings.find((b) => b.type === 'dien')!;
  const cx = dien.x + BUILDINGS.dien.w / 2;
  const cz = dien.z + BUILDINGS.dien.d / 2;
  const far = (id: number) => {
    const o = khoanhOrigin(id);
    return Math.hypot(o.x + KHOANH / 2 - cx, o.z + KHOANH / 2 - cz);
  };
  const edge = KHOANH_N - 1;
  const list = openable(s).filter((id) => !BUILDINGS[type].nearRiver || id % KHOANH_N === edge || Math.floor(id / KHOANH_N) === edge);
  return list.sort((a, b) => far(a) - far(b) || a - b);
}

/** Phát một khoảnh rừng để có chỗ thoáng dựng `type`. */
function phatRung(s: GameState, type: BuildingType): boolean {
  return khoanhFor(s, type).some((id) => openKhoanh(s, id).ok);
}

/**
 * Dựng `type` như người chơi muốn kinh đô thoáng: có chỗ thoáng thì dựng ngay; hết chỗ thoáng mà phát rừng được thì
 * để phát rừng trước (trả về false); không thì đặt sát vào chỗ còn trống.
 */
function buildRoomy(s: GameState, type: BuildingType): 'built' | 'needLand' | 'none' {
  if (!thoRanh(s)) return 'none';
  const roomy = findSpot(s, type, undefined, true);
  if (roomy) {
    const r = startBuild(s, type, roomy.x, roomy.z);
    if (r.ok) doSu(s, r.value);
    return r.ok ? 'built' : 'none';
  }
  if (khoanhFor(s, type).length) return 'needLand';
  return startAnywhere(s, type) ? 'built' : 'none';
}

/**
 * Thứ tự một người chơi hợp lý dựng kinh tế. Ngoài các loại này, người chơi mô phỏng chỉ dựng lũy. Xưởng mộc chỉ dựng
 * thêm, nâng khi thiếu gỗ (`woodShort`); làng chài thôi dựng, nâng, và rút bớt ngư dân khi cá đã đủ ăn (`wanted`,
 * `trimFishers`).
 */
export const ECONOMY: BuildingType[] = ['ruong', 'ben', 'nhaSan', 'baiDa', 'kho', 'loRen', 'xuongMoc', 'langChai', 'benKhoi'];
/** Số lũy người chơi mô phỏng dựng cho đủ nhiệm vụ đầu. */
export const LUY_COUNT = 6;

/**
 * Số gỗ cần cho việc dùng gỗ sắp làm: món đắt nhất trong các việc dựng thêm hay nâng công trình tốn gỗ trong
 * `ECONOMY` mà người chơi còn muốn làm.
 */
function woodWant(s: GameState): number {
  let want = 0;
  for (const type of ECONOMY) {
    if (wanted(s, type) && usedOf(s, type) < limitOf(s, type)) want = Math.max(want, BUILDINGS[type].buildCost.go ?? 0);
  }
  const level = dienLevel(s);
  for (const b of s.buildings) {
    if (b.type !== 'xuongMoc' && wanted(s, b.type) && b.level < level) want = Math.max(want, upgradeCostOf(b)?.go ?? 0);
  }
  return want;
}

/**
 * Gỗ trong kho chưa đủ cho việc sắp làm. Người chơi hợp lý chỉ dựng thêm, nâng xưởng mộc khi thiếu gỗ, vì xưởng mộc
 * nâng tốn vỏ ốc mà gỗ thừa chỉ đem đổi.
 */
function woodShort(s: GameState): boolean {
  return s.resources.go < woodWant(s);
}

/**
 * Cá đã thừa thì rút bớt ngư dân, để dân rảnh vào chỗ còn trống ở ruộng, bến, bãi đá, lò rèn khi các nơi ấy lên cấp
 * (`autoAssign` chia dân rảnh đều cho mọi nơi còn chỗ, kể cả làng chài). Giữ đủ cá cho dân và lính ăn.
 */
function trimFishers(s: GameState): void {
  const food = foodPerMinute(s);
  const villages = s.buildings.filter((b) => b.type === 'langChai').sort((a, b) => b.workers - a.workers);
  for (const b of villages) {
    while (b.workers > 0) {
      b.workers -= 1;
      if (fishPerMinute(s) >= food) continue;
      b.workers += 1;
      break;
    }
  }
}

/**
 * Người chơi hợp lý còn muốn dựng thêm, nâng thêm loại này không. Làng chài: cá đã đủ cho dân và lính ăn thì thôi
 * (bảng làng chài cũng báo dựng thêm chưa có ích). Ruộng: kho gạo đã đầy thì thôi.
 */
function wanted(s: GameState, type: BuildingType): boolean {
  // Kho gạo đã đầy thì nâng ruộng chỉ thêm gạo tràn kho: dành vỏ ốc, đất đá cho việc khác.
  if (type === 'ruong' && s.resources.gao >= 0.95 * storageCap(s)) return false;
  return type !== 'langChai' || fishPerMinute(s) < foodPerMinute(s);
}

/**
 * Một giây chơi: nhận thưởng, xây cho đủ nhiệm vụ, ưu tiên nâng Điện, dựng nhà thợ hồ cho thêm tốp thợ, rồi dựng và
 * nâng công trình kinh tế, chia dân rảnh vào làm. Mỗi việc xây cần một tốp thợ rảnh; hết tốp thì chờ. Mỗi việc giao
 * xong thì trả lời đúng `dung` câu đố sử (mặc định 0: không đố, chờ đủ thời gian).
 */
export function playSecond(s: GameState, lam: Lam = lamThang, dung = 0): void {
  dungMoiViec = dung;
  lam('nhiemVu', () => {
    while (questDone(s)) claimQuest(s);
  });
  lam('xay', () => {
    if (usedOf(s, 'luy') < LUY_COUNT) startAnywhere(s, 'luy');
  });
  const dien = s.buildings.find((b) => b.type === 'dien')!;
  lam('nangDien', () => {
    if (canStartUpgrade(s, dien.id).ok) tryUpgrade(s, dien.id);
  });
  // Nhà thợ hồ: thêm tốp thợ, dựng ngay khi còn chỗ và đủ của. Người đố đúng cả ba câu thì việc nào cũng xong ngay,
  // không phải chờ thợ, nên không cần.
  const needTho = dung < QUIZ_TURNS;
  lam('xay', () => {
    if (needTho && usedOf(s, 'thoHo') < limitOf(s, 'thoHo') && affordWithReserve(s, BUILDINGS.thoHo.buildCost)) buildRoomy(s, 'thoHo');
  });
  let cramped: BuildingType | null = null;
  lam('xay', () => {
    // Như hướng dẫn của Lạc hầu: lên Điện cấp 2 trước rồi mới mở rộng kinh tế.
    for (const type of dienLevel(s) < 2 ? ECONOMY.slice(0, 2) : ECONOMY) {
      if (!thoRanh(s)) break;
      // Xưởng mộc thứ hai trở đi chỉ dựng khi thiếu gỗ; làng chài thôi dựng khi cá đã đủ ăn.
      if (type === 'xuongMoc' && usedOf(s, type) > 0 && !woodShort(s)) continue;
      if (!wanted(s, type)) continue;
      if (usedOf(s, type) < limitOf(s, type) && affordWithReserve(s, BUILDINGS[type].buildCost) && buildRoomy(s, type) === 'needLand') cramped ??= type;
    }
  });
  // Hết chỗ thoáng: phát rừng, giây sau dựng trên đất mới.
  if (cramped) lam('phatRung', () => phatRung(s, cramped!));
  autoAssign(s);
  trimFishers(s);
  lam('doiHang', () => tradeSurplus(s));
  // Điện 10: nâng bến thuyền khơi của quần đảo lên cấp 3, đóng thuyền chiến, dựng và nâng đồn đảo (không luyện quân
  // nên không đóng lính).
  lam('dongDao', () => {
    if (dienLevel(s) < DON_DAO.minDien) return;
    for (const id of DAO_IDS) {
      if (!thoRanh(s)) break;
      const ben = benOf(s, id);
      if (!ben) continue;
      if (ben.level < DON_DAO.benCap) {
        if (canStartUpgrade(s, ben.id).ok) tryUpgrade(s, ben.id);
        continue;
      }
      const r = canThuyen(s, id).ok && affordWithReserve(s, THUYEN_CHIEN.cost) ? startThuyen(s, id) : canDon(s, id).ok && affordWithReserve(s, donCost(s, id)!) ? startDon(s, id) : null;
      if (r?.ok) doSu(s, r.value);
    }
  });
  lam('nangCap', () => {
    const wood = woodShort(s);
    for (const b of s.buildings) {
      if (!thoRanh(s)) break;
      if ((b.type === 'xuongMoc' && !wood) || !wanted(s, b.type) || (b.type === 'thoHo' && !needTho)) continue;
      if (b.type !== 'dien' && b.type !== 'luy' && canStartUpgrade(s, b.id).ok && affordWithReserve(s, upgradeCostOf(b)!)) tryUpgrade(s, b.id);
    }
  });
  lam('thoiGian', () => tick(s, 1000));
}

/**
 * Chơi từ đầu tới khi Điện đạt cấp `target`. Trả về số phút, hoặc Infinity nếu quá `maxMinutes`. `dung`: số câu đố
 * sử trả lời đúng mỗi việc xây.
 */
export function playUntilDien(target: number, maxMinutes: number, dung = 0): number {
  const s = createInitialState(0);
  for (let sec = 0; sec < maxMinutes * 60; sec++) {
    if (dienLevel(s) >= target) return sec / 60;
    playSecond(s, lamThang, dung);
  }
  return Infinity;
}

/** Giây chơi lúc đạt từng mốc, -1 nếu chưa tới. */
export type Moc = {
  at5: number;
  enter2: number;
  at6: number;
  enter3: number;
  at7: number;
  enter4: number;
  at8: number;
  /** Lúc Hết truyện (thắng màn 32): mở Điện 9; nhận thưởng nhiệm vụ Điện 9 thì vào chương 5, mở Điện 10. */
  hetTruyen: number;
  at9: number;
  at10: number;
};

/** Nhiệm vụ đầu tiên sau truyện (lên Điện 9). */
export const HAU_QUEST_START = QUESTS.findIndex((q) => q.id === 'dien9');

/** Sau khi lên Điện 5 (hay 6, 7), người chơi còn ở chương cũ chừng chừng này giây rồi mới vào chương mới. */
export const STAY_AFTER_S = 30 * 60;

/**
 * Chơi tiếp qua các chương: sau khi lên Điện 5 còn chừng nửa giờ chương 1 (Gióng, màn 5–8) thì vào chương 2;
 * lên Điện 6 rồi còn chừng nửa giờ chương 2 thì vào chương 3. Dừng khi lên Điện 7, hay (với `last: 8`) chơi tiếp
 * chừng nửa giờ chương 3 rồi vào chương 4, dừng khi lên Điện 8. Với `last: 9` hay `10`: lên Điện 8 rồi còn chừng nửa
 * giờ chương 4 thì hết truyện (thắng màn 32), dừng khi lên Điện 9; với `last: 10` nhận thưởng nhiệm vụ Điện 9 thì vào
 * chương 5 (Hai Bà Trưng), dừng khi lên Điện 10.
 * Lúc vào mỗi chương, của dành dụm coi như đã tiêu hết (dựng đền, lễ vật, rèn đồ, quân), nên số phút đo được là
 * số phút sản lượng của kinh đô cần để lên cấp.
 *
 * - `lam`: bọc từng việc (báo cáo kinh tế ghi sổ ở đây).
 * - `s`: chơi tiếp trên state này thay vì một ván mới.
 * - `until`: dừng sớm khi trả về true, xét trước mỗi giây chơi (cảnh chụp thử dừng ở giữa chương 2).
 * - `last`: cấp Điện cuối cùng thì dừng, 7 (mặc định) tới 10.
 * - `dung`: số câu đố sử trả lời đúng mỗi việc xây (0–3, mặc định 0).
 */
export function playChapters(
  opts: { lam?: Lam; s?: GameState; maxSec?: number; until?: (m: Moc, sec: number) => boolean; last?: 7 | 8 | 9 | 10; dung?: number } = {},
): Moc {
  const { lam = lamThang, s = createInitialState(0), maxSec = 8 * 3600, until, last = 7, dung = 0 } = opts;
  const m: Moc = { at5: -1, enter2: -1, at6: -1, enter3: -1, at7: -1, enter4: -1, at8: -1, hetTruyen: -1, at9: -1, at10: -1 };
  for (let sec = 0; sec < maxSec; sec++) {
    if (until?.(m, sec)) return m;
    const level = dienLevel(s);
    if (level >= 5 && m.at5 < 0) m.at5 = sec;
    if (m.at5 >= 0 && m.enter2 < 0 && sec >= m.at5 + STAY_AFTER_S) {
      lam('vaoChuong', () => {
        s.questIndex = CH2_QUEST_START;
        s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
      });
      m.enter2 = sec;
    }
    if (level >= 6 && m.at6 < 0) m.at6 = sec;
    if (m.at6 >= 0 && m.enter3 < 0 && sec >= m.at6 + STAY_AFTER_S) {
      lam('vaoChuong', () => {
        s.questIndex = CH3_QUEST_START;
        s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
      });
      m.enter3 = sec;
    }
    if (level >= 7 && m.at7 < 0) {
      m.at7 = sec;
      if (last === 7) return m;
    }
    if (m.at7 >= 0 && m.enter4 < 0 && sec >= m.at7 + STAY_AFTER_S) {
      lam('vaoChuong', () => {
        s.questIndex = CH4_QUEST_START;
        s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
      });
      m.enter4 = sec;
    }
    if (level >= 8 && m.at8 < 0) {
      m.at8 = sec;
      if (last === 8) return m;
    }
    if (m.at8 >= 0 && m.hetTruyen < 0 && sec >= m.at8 + STAY_AFTER_S) {
      lam('vaoChuong', () => {
        s.adv.bien = true;
        s.campaign.cleared = Math.max(s.campaign.cleared, 32);
        s.questIndex = HAU_QUEST_START;
        s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
      });
      m.hetTruyen = sec;
    }
    if (level >= 9 && m.at9 < 0) {
      m.at9 = sec;
      if (last === 9) return m;
    }
    if (level >= 10) {
      m.at10 = sec;
      return m;
    }
    playSecond(s, lam, dung);
  }
  return m;
}
