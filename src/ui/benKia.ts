// Giao diện vùng đất bên kia sông: bảng một khoảnh (đã dò chưa, có gì, sai trinh sát).
// Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { canScout, hasCamp, plotBlocked, plotOf, poiAt } from '../game/benKia';
import { SCOUT_COST, SCOUT_MS } from '../game/defs';
import type { GameState } from '../game/game';
import { vi } from '../text/vi';
import { costHtml, esc } from './format';

/** Tên và biểu tượng điểm lạ trên khoảnh, dùng cho tiêu đề bảng. */
export function poiTitle(id: number): { icon: string; name: string } | null {
  const poi = poiAt(id);
  if (!poi) return null;
  const t = vi.benKia;
  if (poi.kind === 'don') return t.don[poi.tier];
  if (poi.kind === 'lang') return t.lang[poi.nghe];
  if (poi.kind === 'dacSan') return t.dacSan[poi.dat];
  return t.cua;
}

/** Bảng một khoảnh bên kia sông. */
export function farHtml(state: GameState, id: number): string {
  const t = vi.benKia;
  const k = state.benKia;
  const { bank, i, j } = plotOf(id);
  const known = k.known.includes(id);
  const open = k.open.includes(id);
  const rows: string[] = [`<p class="muted">${esc(t.plot(t.bank[bank], i, j))}</p>`];
  rows.push(`<p>${open ? t.open : known ? t.known : t.unknown}</p>`);
  if (known) {
    const poi = poiAt(id);
    if (!poi) rows.push(`<p class="muted">${t.empty}</p>`);
    else if (poi.kind === 'don') {
      const cleared = !hasCamp(state, id);
      rows.push(`<h3>${t.don[poi.tier].icon} ${t.don[poi.tier].name}</h3><p>${t.donDesc}</p><p class="muted">${t.donNeed[poi.tier]}</p>`);
      if (cleared) rows.push(`<p class="done">✓</p>`);
    } else if (poi.kind === 'lang') {
      rows.push(`<h3>${t.lang[poi.nghe].icon} ${t.lang[poi.nghe].name}</h3><p>${t.langDesc}</p>`);
    } else if (poi.kind === 'dacSan') {
      rows.push(`<h3>${t.dacSan[poi.dat].icon} ${t.dacSan[poi.dat].name}</h3><p>${t.dacSan[poi.dat].desc}</p>`);
    } else {
      rows.push(`<h3>${t.cua.icon} ${t.cua.name}</h3><p>${t.cua.desc}</p>`);
    }
    if (!open && plotBlocked(state, id) && poi?.kind !== 'don') rows.push(`<p class="why">${t.blocked}</p>`);
  } else {
    const going = k.scouts.find((s) => s.plot === id);
    if (going) rows.push(`<p>🧭 ${t.scouting(Math.max(0, Math.ceil((going.at - state.clock) / 1000)))}</p>`);
    else {
      const check = canScout(state, id);
      rows.push(`<button class="btn bronze" data-act="sendScout" data-id="${id}" ${check.ok ? '' : 'disabled'}>🧭 ${t.scout}</button>
        ${costHtml(state, SCOUT_COST)}
        <p class="muted">${t.scoutMeta(Math.round(SCOUT_MS / 1000))}</p>
        ${check.ok ? '' : `<p class="why">${vi.reasons[check.reason]}</p>`}`);
    }
  }
  return rows.join('');
}
