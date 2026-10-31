// Định dạng chữ và số dùng chung cho các phần giao diện.

import { RESOURCE_IDS, type Cost } from '../game/defs';
import type { GameState } from '../game/game';
import { vi } from '../text/vi';

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const fmt = (n: number) => Math.floor(n).toLocaleString('vi-VN');

/** Giá hoặc phần thưởng; tô đỏ phần còn thiếu khi có `state`. */
export function costHtml(state: GameState | null, cost: Cost): string {
  const parts = RESOURCE_IDS.filter((r) => (cost[r] ?? 0) > 0).map((r) => {
    const lack = state && state.resources[r] < (cost[r] ?? 0);
    return `<span class="${lack ? 'lack' : ''}">${vi.resources[r].icon} ${fmt(cost[r]!)}</span>`;
  });
  return parts.length ? `<span class="cost">${parts.join('')}</span>` : vi.ui.free;
}
