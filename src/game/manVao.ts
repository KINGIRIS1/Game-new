// Màn hình vào game: tóm tắt bản lưu để người chơi biết mình đang ở đâu trước khi vào kinh đô.

import { inChapter4 } from './chuong4';
import { inChapter3 } from './coLoa';
import type { Chapter } from './defs';
import { dienLevel, type GameState } from './game';
import { inChapter2 } from './son';

export type TomTat = {
  /** Chưa xem đoạn truyện mở đầu: coi như game mới, nút là Bắt đầu. */
  moi: boolean;
  chapter: Chapter;
  dien: number;
  dan: number;
  /** Đã xem màn hình Hết truyện. */
  hetTruyen: boolean;
  /** Đã vắng bao lâu kể từ lần chơi trước (ms). */
  vang: number;
};

/** Chương đang chơi, theo nhiệm vụ đã nhận. */
export function chapterOf(s: GameState): Chapter {
  if (inChapter4(s)) return 4;
  if (inChapter3(s)) return 3;
  if (inChapter2(s)) return 2;
  return 1;
}

export function tomTat(s: GameState, now: number): TomTat {
  return {
    moi: !s.story.seen.includes('mo'),
    chapter: chapterOf(s),
    dien: dienLevel(s),
    dan: s.dan,
    hetTruyen: s.story.seen.includes('hetTruyen'),
    vang: Math.max(0, now - s.lastSeen),
  };
}
