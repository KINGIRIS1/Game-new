// Bảng Khoảnh rừng: chạm một khoảnh rừng chưa phát thì hiện số khoảnh đã mở trên lượt của cấp Điện, giá phát rừng
// và nút Phát rừng, hoặc lý do chưa phát được. Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { dienLevel, type GameState } from '../game/game';
import { KHOANH_N, canOpenKhoanh, khoanhCost, khoanhQuota, nextQuotaLevel } from '../game/khoanh';
import { vi } from '../text/vi';
import { costHtml } from './format';

export function khoanhHtml(state: GameState, id: number): string {
  const level = dienLevel(state);
  const quota = khoanhQuota(level);
  const check = canOpenKhoanh(state, id);
  const cost = khoanhCost(state);
  const rows = [
    `<div class="stat"><span>${vi.ui.khoanhCount}</span><span>${state.khoanh.length}/${quota}</span></div>`,
    `<div class="stat"><span>${vi.ui.khoanhCost}</span><span>${costHtml(state, cost)}</span></div>`,
  ];
  const edge = KHOANH_N - 1;
  const river = id % KHOANH_N === edge || Math.floor(id / KHOANH_N) === edge;
  if (river) rows.push(`<div class="stat"><span></span><span class="muted">${vi.ui.khoanhRiver}</span></div>`);
  const actions = [
    `<button class="btn" data-act="phatRung" data-id="${id}" ${check.ok ? '' : 'disabled'}>🪓 ${vi.ui.khoanhOpen} · ${costHtml(state, cost)}</button>`,
  ];
  if (!check.ok) {
    let why = vi.reasons[check.reason];
    if (check.reason === 'hetLuotKhoanh') {
      const next = nextQuotaLevel(state);
      why += `. ${next ? vi.ui.khoanhMore(next, khoanhQuota(next) - Math.max(state.khoanh.length, quota)) : vi.ui.khoanhMax}`;
    }
    actions.push(`<div class="why">${why}</div>`);
  }
  return `<div class="info"><p>${vi.ui.khoanhDesc}</p>${rows.join('')}<div class="actions">${actions.join('')}</div></div>`;
}
