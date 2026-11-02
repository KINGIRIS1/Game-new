// Bảng Khoảnh rừng: chạm một khoảnh rừng chưa phát thì hiện số khoảnh đã mở, giá phát rừng (tăng từng nấc) kèm giá
// khoảnh sau, và nút Phát rừng, hoặc lý do chưa phát được. Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import type { GameState } from '../game/game';
import { KHOANH_N, canOpenKhoanh, khoanhCost, khoanhCostAt } from '../game/khoanh';
import { vi } from '../text/vi';
import { costHtml } from './format';

export function khoanhHtml(state: GameState, id: number): string {
  const check = canOpenKhoanh(state, id);
  const cost = khoanhCost(state);
  const rows = [
    `<div class="stat"><span>${vi.ui.khoanhCount}</span><span>${state.khoanh.length}/${KHOANH_N * KHOANH_N}</span></div>`,
    `<div class="stat"><span>${vi.ui.khoanhCost}</span><span>${costHtml(state, cost)}</span></div>`,
  ];
  // Còn rừng sau khoảnh này thì báo trước nấc giá kế tiếp.
  if (state.khoanh.length + 1 < KHOANH_N * KHOANH_N) {
    rows.push(`<div class="stat"><span>${vi.ui.khoanhNext}</span><span class="muted">${costHtml(null, khoanhCostAt(state.khoanh.length + 1))}</span></div>`);
  }
  const edge = KHOANH_N - 1;
  const river = id % KHOANH_N === edge || Math.floor(id / KHOANH_N) === edge;
  if (river) rows.push(`<div class="stat"><span></span><span class="muted">${vi.ui.khoanhRiver}</span></div>`);
  const actions = [
    `<button class="btn" data-act="phatRung" data-id="${id}" ${check.ok ? '' : 'disabled'}>🪓 ${vi.ui.khoanhOpen} · ${costHtml(state, cost)}</button>`,
  ];
  if (!check.ok) actions.push(`<div class="why">${vi.reasons[check.reason]}</div>`);
  return `<div class="info"><p>${vi.ui.khoanhDesc}</p>${rows.join('')}<div class="actions">${actions.join('')}</div></div>`;
}
