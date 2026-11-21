// Canh hướng dẫn chỉ tay: mục tới lúc theo tính năng mở, mỗi mục chỉ một lần, bản lưu cũ đã mở sẵn thì đánh dấu im
// lặng; mọi mục có chữ, mỗi bước có lời, nút của bước khớp một `data-act` có thật ở giao diện.

import { describe, expect, it } from 'vitest';
import { createInitialState, place } from './game';
import { HD_INIT, HUONG_DAN, daChi, huongDanDaMo, initHuongDan, markHuongDan, nextHuongDan } from './huongDan';
import { deserialize, serialize } from './save';
import { doMo } from './trangBi';
import { vi } from '../text/vi';
import { BUOC } from '../ui/huongDan';
import { setDien } from './testmap';
import { findSpot } from './game';
import { BUILDINGS } from './defs';
import { playChapters } from './moPhong';

function coTrai() {
  const s = createInitialState(0);
  setDien(s, 3);
  s.resources = { gao: 9e5, voOc: 9e5, datDa: 9e5, sat: 9e5, go: 9e5 };
  s.dan = 40;
  const at = findSpot(s, 'doanhTrai')!;
  expect(place(s, 'doanhTrai', at.x, at.z).ok).toBe(true);
  return s;
}

describe('hướng dẫn chỉ tay', () => {
  it('game mới: chưa mục nào tới lúc, lần xét đầu không đánh dấu mục nào', () => {
    const s = createInitialState(0);
    initHuongDan(s);
    expect(s.hinted).toEqual([HD_INIT]);
    expect(nextHuongDan(s)).toBeNull();
    expect(huongDanDaMo(s)).toEqual([]);
  });

  it('có doanh trại thì tới lúc chỉ Phó bản, chỉ rồi thì thôi', () => {
    const s = createInitialState(0);
    initHuongDan(s);
    const t = coTrai();
    t.hinted = [...s.hinted];
    expect(nextHuongDan(t)).toBe('phoBan');
    markHuongDan(t, 'phoBan');
    markHuongDan(t, 'phoBan');
    expect(t.hinted.filter((k) => k === 'hd:phoBan')).toHaveLength(1);
    expect(nextHuongDan(t)).toBe(doMo(t) ? 'trangBi' : null);
    expect(huongDanDaMo(t)).toContain('phoBan');
  });

  it('bản lưu cũ đã có doanh trại: lần xét đầu đánh dấu im lặng, vẫn có trong Sổ', () => {
    const t = coTrai();
    initHuongDan(t);
    expect(daChi(t, 'phoBan')).toBe(true);
    expect(nextHuongDan(t)).toBeNull();
    expect(huongDanDaMo(t)).toContain('phoBan');
  });

  it('khóa đã chỉ đi qua bản lưu', () => {
    const t = coTrai();
    initHuongDan(t);
    const u = deserialize(serialize(t));
    expect(u && daChi(u, 'phoBan')).toBe(true);
    expect(u!.hinted).toContain(HD_INIT);
  });

  it('mọi mục có tên, mỗi bước một lời, nút khớp data-act có thật', () => {
    const ids = HUONG_DAN.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    const ui = Object.values(import.meta.glob<string>('../ui/*.ts', { query: '?raw', import: 'default', eager: true })).join('\n');
    const s = createInitialState(0);
    for (const id of ids) {
      expect(vi.huongDan.ten[id], id).toBeTruthy();
      expect(vi.huongDan.buoc[id], id).toHaveLength(BUOC[id].length);
      for (const b of BUOC[id]) {
        if (b.chon) expect(BUILDINGS[b.chon], `${id}: ${b.chon}`).toBeTruthy();
        const sel = typeof b.cho === 'function' ? b.cho(s) : b.cho;
        if (sel === null) continue;
        for (const m of sel.matchAll(/data-act=(\w+)/g)) {
          // Nút dựng thẳng (`data-act="…"`), qua hàm dựng thẻ dock (`act: '…'`) hay chọn theo điều kiện (`'…'`).
          const co = ui.includes(`data-act="${m[1]}"`) || ui.includes(`'${m[1]}'`);
          expect(co, `${id}: ${m[1]}`).toBe(true);
        }
        for (const m of sel.matchAll(/\.([a-z][\w-]*)/g)) expect(ui.includes(m[1]), `${id}: .${m[1]}`).toBe(true);
      }
    }
  });

  it('người chơi mô phỏng chơi tới Điện 7: các mục kinh đô lần lượt tới lúc, mỗi lần một mục', () => {
    const s = createInitialState(0);
    initHuongDan(s);
    const da: string[] = [];
    playChapters({
      s,
      until: (_m, sec) => {
        if (sec % 60 === 0) {
          const id = nextHuongDan(s);
          if (id) {
            markHuongDan(s, id);
            da.push(id);
          }
        }
        return false;
      },
    });
    expect(new Set(da).size).toBe(da.length);
    for (const id of ['mauKinhDo', 'benKia', 'congDe'] as const) expect(da, id).toContain(id);
  }, 120_000);
});
