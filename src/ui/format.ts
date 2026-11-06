// Định dạng chữ và số dùng chung cho các phần giao diện.

import { RESOURCE_IDS, isBridge, type Cost } from '../game/defs';
import type { Building, GameState } from '../game/game';
import { vi } from '../text/vi';

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const fmt = (n: number) => Math.floor(n).toLocaleString('vi-VN');

/** Số gọn cho dải tài nguyên: 531 · 6,1k · 48,6k · 123k · 1,2tr (đủ chỗ năm tài nguyên trên màn hẹp). */
export function fmtShort(n: number): string {
  const v = Math.floor(n);
  const one = (x: number) => x.toLocaleString('vi-VN', { minimumFractionDigits: x < 100 ? 1 : 0, maximumFractionDigits: x < 100 ? 1 : 0 });
  if (v >= 1e6) return `${one(v / 1e6)}tr`;
  if (v >= 1000) return `${one(v / 1000)}k`;
  return fmt(v);
}

/** Giá hoặc phần thưởng; tô đỏ phần còn thiếu khi có `state`. */
export function costHtml(state: GameState | null, cost: Cost): string {
  const parts = RESOURCE_IDS.filter((r) => (cost[r] ?? 0) > 0).map((r) => {
    const lack = state && state.resources[r] < (cost[r] ?? 0);
    return `<span class="${lack ? 'lack' : ''}">${vi.resources[r].icon} ${fmt(cost[r]!)}</span>`;
  });
  return parts.length ? `<span class="cost">${parts.join('')}</span>` : vi.ui.free;
}

/** Tên hiển thị của công trình, tính cả lũy tre đã đắp thành đất và đê đã kè đá. */
export function buildingName(b: Pick<Building, 'type' | 'level'>): string {
  if (b.type === 'luy' && b.level >= 2) return vi.ui.wallEarth;
  if (isBridge(b.type)) return vi.ui.bridgeName(b.level, b.type === 'cauSongDa' ? vi.ui.songDa : vi.ui.songThao);
  if (b.type === 'de' && b.level >= 2) return vi.ui.dikeStone;
  return vi.buildings[b.type].name;
}
