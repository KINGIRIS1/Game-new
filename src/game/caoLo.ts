// Chương 4 phần 3: Cao Lỗ cầm quân, vua xuống biển.
// Thắng màn 25 thì Cao Lỗ xin cầm quân, cùng ra trận từ màn 26 (thắng màn 30 có thêm Lệnh bắn). Thắng màn 28 thì
// Trọng Thủy đánh tráo lẫy nỏ thần. Thắng màn 32 (hộ giá ra biển Mộ Dạ) thì An Dương Vương theo Rùa Vàng xuống biển:
// từ đó ngài không đứng ở Điện, không giữ kinh đô nữa (phó bản màn 17–25 vẫn hiển linh ra trận), Cao Lỗ cầm quân giữ
// kinh đô, mở Đền Cuông.

import type { HeroSetup } from './battle';
import { CH4_QUEST_START } from './defs';
import type { CaoLoState, GameState } from './game';

/** Thắng màn này lần đầu thì Cao Lỗ cầm quân, cùng ra trận. */
export const CAO_LO_AT = 25;
/** Thắng màn này lần đầu thì Trọng Thủy đã đánh tráo lẫy nỏ thần (đoạn truyện 3). */
export const LAY_TRAO_AT = 28;
/** Thắng màn này lần đầu thì Cao Lỗ có thêm Lệnh bắn. */
export const LENH_BAN_AT = 30;
/** Thắng màn này lần đầu thì giặc kéo tới thành, vua cùng Mỵ Châu chạy về phương Nam (đoạn truyện 4). */
export const LONG_NGONG_AT = 31;
/** Màn cuối chương 4: thắng lần đầu thì vua tới biển Mộ Dạ, theo Rùa Vàng xuống biển. */
export const CH4_LAST = 32;

export function initialCaoLo(): CaoLoState {
  return { restUntil: 0, lenhBan: false };
}

const inChapter4 = (s: GameState) => s.questIndex >= CH4_QUEST_START;
/** Cao Lỗ đã cầm quân (thắng màn 25): cùng ra trận, chỉ huy được một doanh trại. */
export const caoLoJoined = (s: GameState) => inChapter4(s) && s.campaign.cleared >= CAO_LO_AT;
export const caoLoResting = (s: GameState) => s.clock < s.caoLo.restUntil;

/** Cao Lỗ có ra trận lần này không, đã có Lệnh bắn chưa. */
export function caoLoSetup(s: GameState): HeroSetup | null {
  if (!caoLoJoined(s) || caoLoResting(s)) return null;
  return { kind: 'caoLo', bamboo: false, glow: false, non: false, lenhBan: s.caoLo.lenhBan };
}

/** An Dương Vương đã theo Rùa Vàng xuống biển (kết chương 4). */
export const advAtSea = (s: GameState) => s.adv.bien;

/** Cao Lỗ đứng trước Điện từ khi cầm quân (vua xuống biển rồi thì đứng chỗ của vua). */
export const caoLoAtDien = (s: GameState) => caoLoJoined(s);
