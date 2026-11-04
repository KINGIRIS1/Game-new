// Các đoạn truyện của chương 1 (Thánh Gióng), chương 2 (Sơn Tinh, Thủy Tinh), chương 3 (An Dương Vương),
// chương 4 (Mỵ Châu, Trọng Thủy) và chương 5 (Hai Bà Trưng):
// kể mỗi đoạn một lần, đúng thứ tự.

import { benKiaOpen } from './benKia';
import { CAO_LO_AT, LONG_NGONG_AT, advAtSea } from './caoLo';
import { inChapter4 } from './chuong4';
import { HIEU_TRIEU_AT, LUY_LAU_AT, inChapter5 } from './chuong5';
import { advJoined, inChapter3, ruaVangCame } from './coLoa';
import type { GameState, StoryId } from './game';
import { giongAppeared, giongReady } from './giong';
import { inChapter2, sonJoined } from './son';

const STORY_ORDER: StoryId[] = [
  'mo',
  'suGia',
  'benKia',
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
  'meLinh',
  'hatMon',
  'trungVuong',
];
const STORY_WHEN: Record<StoryId, (s: GameState) => boolean> = {
  mo: () => true,
  suGia: giongAppeared,
  // Điện lên cấp 4: Lạc hầu tâu chuyện bên kia sông, mở cầu và trinh sát.
  benKia: benKiaOpen,
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
  // Vào chương 5: đất Mê Linh dưới ách nhà Hán, Hai Bà ra trận.
  meLinh: inChapter5,
  // Thắng màn 33: Tô Định giết Thi Sách, Hai Bà tế cờ ở cửa sông Hát. Trưng Nhị có Hiệu triệu.
  hatMon: (s) => inChapter5(s) && s.campaign.cleared >= HIEU_TRIEU_AT,
  // Thắng màn 36: Tô Định bỏ trốn, Trưng Trắc lên ngôi.
  trungVuong: (s) => inChapter5(s) && s.campaign.cleared >= LUY_LAU_AT,
};

/** Đoạn truyện đến lúc kể mà người chơi chưa xem, theo đúng thứ tự. */
export function pendingStory(s: GameState): StoryId | null {
  return STORY_ORDER.find((id) => !s.story.seen.includes(id) && STORY_WHEN[id](s)) ?? null;
}

export function markStory(s: GameState, id: StoryId): void {
  if (!s.story.seen.includes(id)) s.story.seen.push(id);
}
