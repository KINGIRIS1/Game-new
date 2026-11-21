// Canh vòng nút quanh công trình (`nutCua`, `theHtml`): nút nào hiện ở công trình nào, khi nào khóa, và mọi nút đều có
// chỗ xử lý ở `hud.ts` hay `main.ts`.

import { describe, expect, it } from 'vitest';
import { createInitialState, findBuilding, place, type GameState } from '../game/game';
import { edge, setDien } from '../game/testmap';
import { startBuild, startUpgrade } from '../game/xay';
import { VONG_MAX, nutCua, theHtml } from './vongNut';
import hud from './hud.ts?raw';
import main from '../main.ts?raw';

function city(dien: number): GameState {
  const s = createInitialState(0);
  setDien(s, dien);
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  s.dan = 200;
  return s;
}

const dien = (s: GameState) => s.buildings.find((b) => b.type === 'dien')!;
const acts = (s: GameState, id: number) => nutCua(s, id).map((n) => n.act);

describe('vòng nút quanh công trình', () => {
  it('Điện: ℹ️ đầu vòng, nâng cấp mở thẻ, dời, xoay; không có nút dỡ', () => {
    const s = city(3);
    const nut = nutCua(s, dien(s).id);
    expect(nut[0]).toMatchObject({ act: 'openInfo', hinh: 'thongTin' });
    expect(nut.find((n) => n.hinh === 'nangCap')).toMatchObject({ act: 'vongThe', the: 'nang', kem: false });
    expect(acts(s, dien(s).id)).toEqual(['openInfo', 'vongThe', 'startMove', 'rotateBuilding']);
  });

  it('công trình hư có nút sửa; đang có trận thì sửa, dời khóa', () => {
    const s = city(3);
    const d = dien(s);
    d.damaged = true;
    expect(acts(s, d.id)).toContain('repair');
    s.raid.phase = 'battle';
    const nut = nutCua(s, d.id);
    expect(nut.find((n) => n.act === 'repair')!.khoa).toBe(true);
    expect(nut.find((n) => n.act === 'startMove')!.khoa).toBe(true);
  });

  it('đang nâng cấp: không nâng chồng, có nút đố sử', () => {
    const s = city(3);
    const d = dien(s);
    const r = startUpgrade(s, d.id);
    expect(r.ok && r.value).toBeTruthy();
    expect(nutCua(s, d.id).map((n) => n.hinh)).toEqual(['thongTin', 'doSu', 'doi', 'xoay']);
    expect(nutCua(s, d.id)[1].id).toBe(r.ok && r.value ? r.value.id : -1);
  });

  it('công trình đang dựng mới: chỉ ℹ️ và đố sử', () => {
    const s = city(3);
    const r = startBuild(s, 'ruong', edge(3, 1), edge(3, 1));
    if (!r.ok || !r.value) throw new Error('không dựng được');
    const id = r.value.o[0].id;
    expect(findBuilding(s, id)).toBeUndefined();
    expect(acts(s, id)).toEqual(['openInfo', 'askQuiz']);
  });

  it('lũy dỡ được: nút dỡ mở thẻ xác nhận có nút dỡ thật', () => {
    const s = city(3);
    const r = place(s, 'luy', edge(3, 1), edge(3, 3));
    if (!r.ok) throw new Error(r.reason);
    const nut = nutCua(s, r.value.id);
    expect(nut.find((n) => n.hinh === 'do')).toMatchObject({ act: 'vongThe', the: 'do' });
    expect(theHtml(s, r.value, 'do')).toContain('data-act="removeWall"');
  });

  it('thẻ nâng cấp có nút Đồng ý; thiếu của thì nút khóa, nút trên vòng mờ', () => {
    const s = city(3);
    const d = dien(s);
    expect(theHtml(s, d, 'nang')).toMatch(/data-act="upgrade" data-id="\d+" >/);
    s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
    expect(theHtml(s, d, 'nang')).toMatch(/data-act="upgrade" data-id="\d+" disabled/);
    expect(nutCua(s, d.id).find((n) => n.hinh === 'nangCap')!.kem).toBe(true);
  });

  it('không có công trình thì không có vòng', () => {
    expect(nutCua(city(1), 99999)).toEqual([]);
  });

  it('mọi nút có chỗ xử lý và không quá số nút tối đa', () => {
    const s = city(3);
    place(s, 'luy', edge(3, 1), edge(3, 3));
    for (const b of s.buildings) {
      b.damaged = true;
      expect(nutCua(s, b.id).length).toBeLessThanOrEqual(VONG_MAX);
    }
    const all = new Set(s.buildings.flatMap((b) => acts(s, b.id)).concat('toggleCong', 'askQuiz'));
    for (const a of all) expect(hud.includes(`case '${a}'`) || main.includes(`case '${a}'`), a).toBe(true);
  });
});
