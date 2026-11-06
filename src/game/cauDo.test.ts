// Đố sử khi xây: ngân hàng câu đố (`text/cauDo.ts`) đủ, không trùng; hỏi câu (`askQuiz` ở `xay.ts`) giữ câu đang hỏi
// qua lưu và nạp, tránh câu vừa hỏi; trả lời (`traLoi`) đúng bớt một phần ba, sai mất lượt, tối đa ba lượt; thứ tự đáp
// án (`thuTu` ở `ui/xay.ts`) cố định theo việc và lượt hỏi.

import { describe, expect, it } from 'vitest';
import { CAU_DO, CAU_DO_IDS, THOI_KY, type ThoiKy } from '../text/cauDo';
import { thuTu } from '../ui/xay';
import { DA_HOI_NHO, QUIZ_TURNS } from './defs';
import { createInitialState, type GameState } from './game';
import { deserialize, serialize } from './save';
import { edge, setDien } from './testmap';
import { askQuiz, startBuild, tongCong, traLoi, type CongViec } from './xay';

function city(): GameState {
  const s = createInitialState(0);
  setDien(s, 5);
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  s.dan = 200;
  return s;
}

/** Giao một tốp dựng ruộng lúa ở góc vùng đất. */
function newJob(s: GameState, k = 1): CongViec {
  const r = startBuild(s, 'ruong', edge(5, k), edge(5, 1));
  if (!r.ok || !r.value) throw new Error(r.ok ? 'xong ngay' : r.reason);
  return r.value;
}

describe('ngân hàng câu đố', () => {
  it('chừng 120 câu trở lên, mã không trùng, mỗi câu bốn đáp án khác nhau và có lời giảng', () => {
    expect(CAU_DO.length).toBeGreaterThanOrEqual(120);
    expect(new Set(CAU_DO_IDS).size).toBe(CAU_DO.length);
    for (const c of CAU_DO) {
      expect(Number.isInteger(c.id) && c.id > 0, `câu ${c.id}`).toBe(true);
      const all = [c.dung, ...c.sai].map((x) => x.trim());
      expect(new Set(all).size, `câu ${c.id}`).toBe(4);
      expect(all.every((x) => x.length > 0)).toBe(true);
      expect(c.hoi.trim().length).toBeGreaterThan(10);
      expect(c.giang.trim().length).toBeGreaterThan(10);
    }
  });

  it('thời kỳ nào cũng có câu', () => {
    for (const ky of Object.keys(THOI_KY) as ThoiKy[]) {
      expect(CAU_DO.filter((c) => c.ky === ky).length, ky).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('hỏi và trả lời', () => {
  it('hỏi lại khi chưa trả lời vẫn là câu cũ, kể cả sau khi lưu rồi nạp', () => {
    const s = city();
    const v = newJob(s);
    const a = askQuiz(s, v.id, CAU_DO_IDS);
    if (!a.ok) throw new Error(a.reason);
    expect(CAU_DO_IDS).toContain(a.value);
    expect(askQuiz(s, v.id, CAU_DO_IDS)).toEqual(a);
    const back = deserialize(serialize(s))!;
    expect(back.xay.viec[0].cau).toBe(a.value);
    expect(askQuiz(back, v.id, CAU_DO_IDS)).toEqual(a);
  });

  it('đúng bớt một phần ba, sai mất lượt; trả lời xong thì câu sau khác câu trước; hết ba lượt thì thôi', () => {
    const s = city();
    const v = newJob(s);
    const all = tongCong(v);
    const asked: number[] = [];
    for (let i = 0; i < QUIZ_TURNS; i++) {
      const a = askQuiz(s, v.id, CAU_DO_IDS);
      if (!a.ok) throw new Error(a.reason);
      expect(asked).not.toContain(a.value);
      asked.push(a.value);
      expect(traLoi(s, v.id, i !== 1).ok).toBe(true);
      expect(v.cau).toBeUndefined();
    }
    expect(v.lam).toBeCloseTo((2 * all) / 3);
    expect(askQuiz(s, v.id, CAU_DO_IDS)).toEqual({ ok: false, reason: 'daHoiDu' });
  });

  it('không hỏi lại câu vừa hỏi gần đây', () => {
    const s = city();
    const seen: number[] = [];
    for (let k = 0; k < 14; k++) {
      const v = newJob(s, 1 + (k % 4) * 5);
      for (let i = 0; i < QUIZ_TURNS; i++) {
        const a = askQuiz(s, v.id, CAU_DO_IDS);
        if (!a.ok) throw new Error(a.reason);
        expect(seen.slice(-DA_HOI_NHO)).not.toContain(a.value);
        seen.push(a.value);
        traLoi(s, v.id, false);
      }
      s.xay.viec = [];
    }
    expect(s.xay.daHoi.length).toBe(DA_HOI_NHO);
  });

  it('thứ tự bốn đáp án cố định theo việc và lượt hỏi, đáp án đúng rơi đủ bốn chỗ', () => {
    const where = new Set<number>();
    for (let v = 1; v < 60; v++) {
      for (let h = 0; h < QUIZ_TURNS; h++) {
        const o = thuTu(v, h);
        expect([...o].sort()).toEqual([0, 1, 2, 3]);
        expect(thuTu(v, h)).toEqual(o);
        where.add(o.indexOf(0));
      }
    }
    expect(where.size).toBe(4);
  });
});
