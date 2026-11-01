// Các đoạn truyện của chương 1 (Thánh Gióng), chương 2 (Sơn Tinh, Thủy Tinh) và chương 3 (An Dương Vương):
// kể mỗi đoạn một lần, đúng thứ tự.

import { advJoined, inChapter3, ruaVangCame } from './coLoa';
import type { GameState, StoryId } from './game';
import { giongAppeared, giongReady } from './giong';
import { inChapter2, sonJoined } from './son';

const STORY_ORDER: StoryId[] = [
  // Bản lưu cũ vừa được nâng lên: Lạc hầu báo kinh đô đã dựng lại rộng hơn, kể trước mọi đoạn khác.
  'moRong',
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
];
const STORY_WHEN: Record<StoryId, (s: GameState) => boolean> = {
  moRong: (s) => s.relayout !== null,
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
};

/** Đoạn truyện đến lúc kể mà người chơi chưa xem, theo đúng thứ tự. */
export function pendingStory(s: GameState): StoryId | null {
  return STORY_ORDER.find((id) => !s.story.seen.includes(id) && STORY_WHEN[id](s)) ?? null;
}

export function markStory(s: GameState, id: StoryId): void {
  if (!s.story.seen.includes(id)) s.story.seen.push(id);
}
