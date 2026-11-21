// Giao diện nhà thuốc nam (docs/thiet-ke.md, Kế hoạch: Nhà thuốc nam): mục trong bảng công trình, dòng "được khiêng về"
// ở bảng kết quả trận. Đếm ngược người kế tiếp khỏi thay tại chỗ (`fillThuoc`) để bảng khỏi dựng lại mỗi giây.

import { BUILDINGS, NHA_THUOC, UNIT_TYPES, type UnitType } from '../game/defs';
import type { Building, GameState } from '../game/game';
import { choKhoi, giuongDung, soGiuong, soThuong, tiLeCuu } from '../game/nhaThuoc';
import { formatClock, vi } from '../text/vi';

const pct = (x: number) => Math.round(x * 100);

/** Dòng lính theo binh chủng: "🗡 3 🏹 1"; không ai thì rỗng. */
export function linhHtml(n: Partial<Record<UnitType, number>> | undefined): string {
  if (!n) return '';
  return UNIT_TYPES.filter((k) => (n[k] ?? 0) > 0)
    .map((k) => `${vi.units[k].icon} ${n[k]}`)
    .join(' ');
}

/** Dòng "được khiêng về nhà thuốc" của bảng kết quả trận; không ai thì rỗng. */
export function khiengHtml(n: Partial<Record<UnitType, number>> | undefined): string {
  const line = linhHtml(n);
  return line ? `<div>${vi.ui.thuocKhieng}: ${line}</div>` : '';
}

/** Mục nhà thuốc trong bảng công trình: tỉ lệ cứu, giường, thương binh, người kế tiếp khỏi, cấp sau. */
export function nhaThuocHtml(state: GameState, b: Building): string {
  const rows: string[] = [];
  const stat = (k: string, v: string) => `<div class="stat"><span>${k}</span><span>${v}</span></div>`;
  if (b.damaged) rows.push(`<p class="why warn">${vi.ui.thuocHu}</p>`);
  rows.push(stat(vi.ui.thuocCuu, vi.ui.thuocCuuRow(pct(tiLeCuu(state) || NHA_THUOC.cuu[b.level - 1]))));
  rows.push(stat(vi.ui.thuocGiuong, vi.ui.thuocGiuongRow(giuongDung(state), soGiuong(state))));
  rows.push(stat(vi.ui.thuocNam, soThuong(state) ? linhHtml(state.thuong.linh) : `<span class="muted">${vi.ui.thuocNone}</span>`));
  const k = choKhoi(state);
  if (k?.cho) rows.push(`<p class="why">${vi.ui.thuocCho}</p>`);
  else if (k) rows.push(stat(vi.ui.thuocNext, `${vi.units[k.k].icon} <span data-thuoc>${formatClock(k.ms)}</span>`));
  if (b.level < BUILDINGS.nhaThuoc.maxLevel) {
    const i = b.level;
    rows.push(stat(vi.ui.nextLevel, vi.ui.thuocNextLevel(pct(NHA_THUOC.cuu[i]), NHA_THUOC.giuong[i], NHA_THUOC.chuaMs[i] / 1000)));
  }
  rows.push(`<p class="muted small">${vi.ui.thuocHint}</p>`);
  return rows.join('');
}

/** Thay đếm ngược người kế tiếp khỏi tại chỗ. */
export function fillThuoc(root: HTMLElement, state: GameState): void {
  const els = root.querySelectorAll<HTMLElement>('[data-thuoc]');
  if (!els.length) return;
  const k = choKhoi(state);
  for (const el of els) el.textContent = k ? formatClock(k.ms) : '';
}
