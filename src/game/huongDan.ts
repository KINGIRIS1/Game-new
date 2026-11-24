// Hướng dẫn chỉ tay khi mở tính năng lớn (docs/thiet-ke.md mục Lạc hầu và bản lưu: hướng dẫn chỉ tay).
// Luật chỉ lo mục nào đã tới lúc, đã chỉ chưa; nút nào cần bấm ở từng bước do giao diện lo (`ui/huongDan.ts`).
// Đã chỉ ghi khóa `hd:<id>` vào `state.hinted` như các lời gợi ý một lần khác, nên bản lưu không đổi phiên bản.

import { benKiaOpen } from './benKia';
import { DAO_IDS, daoMo } from './dao';
import { daMo } from './daNgoai';
import { BUILDINGS } from './defs';
import { countOf, dienLevel, unlocked, type GameState } from './game';
import { tetOpen } from './tet';
import { thuCo } from './thanThu';
import { challengeOpen } from './thuThach';
import { doMo } from './trangBi';
import { loiDaiMo } from './loiDai';

export type HuongDanId =
  | 'phoBan'
  | 'thuThach'
  | 'trangBi'
  | 'daNgoai'
  | 'thanThu'
  | 'loiDai'
  | 'dauThanh'
  | 'mauKinhDo'
  | 'benKia'
  | 'congDe'
  | 'tet'
  | 'binhKhi'
  | 'dongDao';

/** Điện cấp này thì mẫu kinh đô đầu tiên (Phong Châu) áp được. */
const MAU_DIEN = 5;
/** Lò rèn cấp này thì rèn được binh khí bậc 1 (`binhKhi.ts`). */
const REN_CAP = 6;

/** Các mục theo thứ tự ưu tiên: cùng mở một lúc thì mục trước chỉ trước. */
export const HUONG_DAN: { id: HuongDanId; khi: (s: GameState) => boolean }[] = [
  // Có doanh trại thì thẻ Phó bản ở dock hết khóa.
  { id: 'phoBan', khi: (s) => countOf(s, 'doanhTrai') > 0 },
  { id: 'thuThach', khi: (s) => challengeOpen(s, 1) },
  { id: 'trangBi', khi: doMo },
  { id: 'daNgoai', khi: daMo },
  { id: 'thanThu', khi: (s) => thuCo(s).length > 0 },
  { id: 'loiDai', khi: loiDaiMo },
  // Chip Đấu thành lúc nào cũng hiện; chỉ khi đã quen đánh trận (hết chương 1).
  { id: 'dauThanh', khi: (s) => unlocked(s, 'ketChuong1') },
  { id: 'mauKinhDo', khi: (s) => dienLevel(s) >= MAU_DIEN },
  { id: 'benKia', khi: benKiaOpen },
  { id: 'congDe', khi: (s) => unlocked(s, BUILDINGS.congDe.unlock) && dienLevel(s) >= BUILDINGS.congDe.minDien },
  { id: 'tet', khi: tetOpen },
  { id: 'binhKhi', khi: (s) => s.buildings.some((b) => b.type === 'loRen' && b.level >= REN_CAP) },
  { id: 'dongDao', khi: (s) => DAO_IDS.some((id) => daoMo(s, id)) },
];

/** Khóa đánh dấu bản lưu đã qua lần xét đầu (bản lưu có trước khi có hướng dẫn chỉ tay). */
export const HD_INIT = 'hd:init';

const key = (id: HuongDanId): string => `hd:${id}`;

export const daChi = (s: GameState, id: HuongDanId): boolean => s.hinted.includes(key(id));

/** Đánh dấu đã chỉ (kể cả khi người chơi bỏ qua giữa chừng). */
export function markHuongDan(s: GameState, id: HuongDanId): void {
  if (!daChi(s, id)) s.hinted = [...s.hinted, key(id)];
}

/**
 * Lần đầu xét một bản lưu: mục nào đã mở sẵn thì đánh dấu im lặng (người chơi đã quen tính năng ấy, khỏi bị chỉ dồn
 * mười mục một lúc); vẫn xem lại được ở Sổ hướng dẫn. Game mới thì chưa mục nào mở nên không mất gì.
 */
export function initHuongDan(s: GameState): void {
  if (s.hinted.includes(HD_INIT)) return;
  const da = HUONG_DAN.filter((h) => h.khi(s)).map((h) => key(h.id));
  s.hinted = [...s.hinted, HD_INIT, ...da.filter((k) => !s.hinted.includes(k))];
}

/** Mục đầu tiên đã tới lúc mà chưa chỉ. */
export function nextHuongDan(s: GameState): HuongDanId | null {
  return HUONG_DAN.find((h) => !daChi(s, h.id) && h.khi(s))?.id ?? null;
}

/** Các mục đã mở (cho Sổ hướng dẫn xem lại). */
export function huongDanDaMo(s: GameState): HuongDanId[] {
  return HUONG_DAN.filter((h) => h.khi(s)).map((h) => h.id);
}
