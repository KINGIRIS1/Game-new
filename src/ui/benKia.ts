// Bảng Đất bên kia sông: chạm một khoảnh bên kia (không trúng công trình) thì hiện bờ nào, khoảnh thứ mấy, đã dò hay
// chưa, điểm lạ, vùng đồn giặc nào đang giữ, nút Sai trinh sát kèm giá hay lý do chưa sai được. Chỉ dựng chuỗi HTML;
// Hud lo việc gắn vào trang và bắt sự kiện.

import { campOf, canScout, plotHeld, plotOf, poiAt, regionOf, type Poi } from '../game/benKia';
import { SCOUT_COST, SCOUT_MS } from '../game/defs';
import type { GameState } from '../game/game';
import { vi } from '../text/vi';
import { costHtml } from './format';

/** Tên và biểu tượng của một điểm lạ. */
export function poiLabel(poi: Poi): { name: string; icon: string } {
  if (poi.kind === 'don') return vi.benKia.don[poi.tier];
  if (poi.kind === 'lang') return vi.benKia.lang[poi.nghe];
  if (poi.kind === 'dacSan') return vi.benKia.dacSan[poi.dat];
  return vi.benKia.cua;
}

export function benKiaHtml(state: GameState, id: number): string {
  const k = state.benKia;
  const { bank, i, j } = plotOf(id);
  const known = k.known.includes(id);
  const open = k.open.includes(id);
  const rows = [`<p>${vi.benKia.plot(vi.benKia.bank[bank], i, j)}</p>`];
  rows.push(`<p class="muted">${!known ? vi.benKia.unknown : open ? vi.benKia.open : vi.benKia.known}</p>`);
  if (known) {
    const poi = poiAt(id);
    if (poi) {
      const { name, icon } = poiLabel(poi);
      rows.push(`<div class="stat"><span>${icon} ${name}</span><span></span></div>`);
      if (poi.kind === 'don') {
        rows.push(`<p class="muted">${vi.benKia.donDesc(regionOf(id).length)} ${vi.benKia.donNeed[poi.tier]}. ${vi.benKia.donSoon}</p>`);
      } else if (poi.kind === 'lang') rows.push(`<p class="muted">${vi.benKia.langDesc}</p>`);
      else if (poi.kind === 'dacSan') rows.push(`<p class="muted">${vi.benKia.dacSan[poi.dat].desc}</p>`);
      else rows.push(`<p class="muted">${vi.benKia.cua.desc}</p>`);
    } else if (!open) rows.push(`<p class="muted">${vi.benKia.empty}</p>`);
    // Vùng đồn giặc nào giữ khoảnh này (chưa dẹp thì chưa về tay ta).
    const camp = campOf(id);
    if (!open && plotHeld(state, id) && camp !== id) {
      const don = poiAt(camp);
      const name = don?.kind === 'don' && k.known.includes(camp) ? vi.benKia.donOf[don.tier] : vi.benKia.someCamp;
      rows.push(`<p class="muted">${vi.benKia.held(name)}</p>`);
    }
  }
  const actions: string[] = [];
  const scout = k.scouts.find((s) => s.plot === id);
  if (scout) {
    rows.push(`<p class="muted">${vi.benKia.scouting(Math.max(0, Math.ceil((scout.at - state.clock) / 1000)))}</p>`);
  } else if (!known) {
    const check = canScout(state, id);
    actions.push(
      `<button class="btn" data-act="trinhSat" data-id="${id}" ${check.ok ? '' : 'disabled'}>🧭 ${vi.benKia.scout} · ${costHtml(state, SCOUT_COST)}</button>`,
    );
    actions.push(`<div class="muted">${vi.benKia.scoutMeta(Math.round(SCOUT_MS / 1000))}</div>`);
    if (!check.ok) actions.push(`<div class="why">${vi.reasons[check.reason]}</div>`);
  }
  return `<div class="info">${rows.join('')}${actions.length ? `<div class="actions">${actions.join('')}</div>` : ''}</div>`;
}
