// Các đoạn truyện của chương 1 (Thánh Gióng) và chương 2 (Sơn Tinh, Thủy Tinh): kể mỗi đoạn một lần, đúng thứ tự.

import type { GameState, StoryId } from './game';
import { giongAppeared, giongReady } from './giong';
import { inChapter2, sonJoined } from './son';

const STORY_ORDER: StoryId[] = ['mo', 'suGia', 'vuonVai', 'roiGay', 'ketChuong', 'kenRe', 'ruocDau', 'doiNon', 'ketChuong2'];
const STORY_WHEN: Record<StoryId, (s: GameState) => boolean> = {
  mo: () => true,
  suGia: giongAppeared,
  vuonVai: giongReady,
  roiGay: (s) => s.giong.whipBroken,
  ketChuong: (s) => s.giong.ascended,
  kenRe: inChapter2,
  ruocDau: sonJoined,
  doiNon: (s) => s.son.non,
  ketChuong2: (s) => s.son.won,
};

/** Đoạn truyện đến lúc kể mà người chơi chưa xem, theo đúng thứ tự. */
export function pendingStory(s: GameState): StoryId | null {
  return STORY_ORDER.find((id) => !s.story.seen.includes(id) && STORY_WHEN[id](s)) ?? null;
}

export function markStory(s: GameState, id: StoryId): void {
  if (!s.story.seen.includes(id)) s.story.seen.push(id);
}
