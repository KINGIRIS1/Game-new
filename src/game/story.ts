// Các đoạn truyện của chương 1 (Thánh Gióng), chương 2 (Sơn Tinh, Thủy Tinh), chương 3 (An Dương Vương)
// và chương 4 (Mỵ Châu, Trọng Thủy):
// kể mỗi đoạn một lần, đúng thứ tự.

import { CAO_LO_AT, LONG_NGONG_AT, advAtSea } from './caoLo';
import { inChapter4 } from './chuong4';
import { advJoined, inChapter3, ruaVangCame } from './coLoa';
import type { GameState, StoryId } from './game';
import { giongAppeared, giongReady } from './giong';
import { inChapter2, sonJoined } from './son';

const STORY_ORDER: StoryId[] = [
  'mo',
  'suGia',
  'vuonVai',
  'roiGay',
  'ketChuong',
  'langLieu',
  'kenRe',
  'ruocDau',
  'doiNon',
  'ketChuong2',
  'cotDa',
  'dietYeu',
  'noThan',
  'kimQuy',
  'ketChuong3',
  'cauHon',
  'caoLoCamQuan',
  'layNo',
  'longNgong',
  'ngocTrai',
  'hetTruyen',
];
const STORY_WHEN: Record<StoryId, (s: GameState) => boolean> = {
  mo: () => true,
  suGia: giongAppeared,
  vuonVai: giongReady,
  roiGay: (s) => s.giong.whipBroken,
  ketChuong: (s) => s.giong.ascended,
  // Chuyện Lang Liêu kể như chuyện xưa, mở Hội Tết.
  langLieu: (s) => s.giong.ascended,
  kenRe: inChapter2,
  ruocDau: sonJoined,
  doiNon: (s) => s.son.non,
  ketChuong2: (s) => s.son.won,
  cotDa: inChapter3,
  dietYeu: ruaVangCame,
  noThan: advJoined,
  kimQuy: (s) => s.adv.kimQuy,
  ketChuong3: (s) => s.adv.won,
  // Vào chương 4: Triệu Đà sai sứ cầu hôn Mỵ Châu cho Trọng Thủy.
  cauHon: inChapter4,
  // Thắng màn 25: bắt được cướp sông, Cao Lỗ xin cầm quân.
  caoLoCamQuan: (s) => inChapter4(s) && s.campaign.cleared >= CAO_LO_AT,
  // Thắng màn 28: Trọng Thủy tráo lẫy nỏ thần.
  layNo: (s) => s.adv.layTrao,
  // Thắng màn 31: giặc tới thành, vua cùng Mỵ Châu chạy về phương Nam.
  longNgong: (s) => inChapter4(s) && s.campaign.cleared >= LONG_NGONG_AT,
  // Thắng màn 32: tới biển Mộ Dạ, vua theo Rùa Vàng xuống biển. Sau đó là màn hình Hết truyện.
  ngocTrai: advAtSea,
  hetTruyen: advAtSea,
};

/** Đoạn truyện đến lúc kể mà người chơi chưa xem, theo đúng thứ tự. */
export function pendingStory(s: GameState): StoryId | null {
  return STORY_ORDER.find((id) => !s.story.seen.includes(id) && STORY_WHEN[id](s)) ?? null;
}

export function markStory(s: GameState, id: StoryId): void {
  if (!s.story.seen.includes(id)) s.story.seen.push(id);
}
