// Hướng dẫn chỉ tay khi mở tính năng lớn (docs/thiet-ke.md mục Lạc hầu và bản lưu: hướng dẫn chỉ tay).
// Luật chỉ lo mục nào đã tới lúc, đã chỉ chưa; nút nào cần bấm ở từng bước do giao diện lo (`ui/huongDan.ts`).
// Đã chỉ ghi khóa `hd:<id>` vào `state.hinted` như các lời gợi ý một lần khác, nên bản lưu không đổi phiên bản.

import { daMo } from './daNgoai';
import { countOf, type GameState } from './game';
import { doMo } from './trangBi';

export type HuongDanId = 'phoBan' | 'trangBi' | 'daNgoai';

/** Các mục theo thứ tự ưu tiên: cùng mở một lúc thì mục trước chỉ trước. */
export const HUONG_DAN: { id: HuongDanId; khi: (s: GameState) => boolean }[] = [
  // Có doanh trại thì thẻ Phó bản ở dock hết khóa.
  { id: 'phoBan', khi: (s) => countOf(s, 'doanhTrai') > 0 },
  { id: 'trangBi', khi: doMo },
  { id: 'daNgoai', khi: daMo },
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
