// Màn hình vào game: game mới hay chơi tiếp, chương đang chơi, Điện, dân, đã vắng bao lâu, đã hết truyện chưa.

import { describe, expect, it } from 'vitest';
import { CH2_QUEST_START, CH3_QUEST_START, CH4_QUEST_START } from './defs';
import { createInitialState } from './game';
import { chapterOf, tomTat } from './manVao';
import { deserialize, serialize } from './save';
import { markStory } from './story';
import { setDien } from './testmap';

describe('Màn hình vào game', () => {
  it('chưa xem đoạn mở đầu thì là game mới, chương 1', () => {
    const s = createInitialState(1000);
    const t = tomTat(s, 1000);
    expect(t.moi).toBe(true);
    expect(t.chapter).toBe(1);
    expect(t.hetTruyen).toBe(false);
    expect(t.dien).toBe(1);
    expect(t.dan).toBe(s.dan);
  });

  it('xem xong đoạn mở đầu thì là chơi tiếp', () => {
    const s = createInitialState(1000);
    markStory(s, 'mo');
    expect(tomTat(s, 1000).moi).toBe(false);
  });

  it('chương theo nhiệm vụ đã nhận', () => {
    const s = createInitialState(0);
    expect(chapterOf(s)).toBe(1);
    s.questIndex = CH2_QUEST_START;
    expect(chapterOf(s)).toBe(2);
    s.questIndex = CH3_QUEST_START;
    expect(chapterOf(s)).toBe(3);
    s.questIndex = CH4_QUEST_START;
    expect(chapterOf(s)).toBe(4);
  });

  it('đếm thời gian vắng từ lần chơi trước, không âm khi đồng hồ máy lùi', () => {
    const s = createInitialState(5000);
    expect(tomTat(s, 5000 + 90_000).vang).toBe(90_000);
    expect(tomTat(s, 1000).vang).toBe(0);
  });

  it('đọc được Điện và hết truyện từ bản lưu', () => {
    const s = createInitialState(0);
    setDien(s, 6);
    markStory(s, 'mo');
    markStory(s, 'hetTruyen');
    const t = tomTat(deserialize(serialize(s))!, 0);
    expect(t.dien).toBe(6);
    expect(t.hetTruyen).toBe(true);
  });
});
