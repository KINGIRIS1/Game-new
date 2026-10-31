// Giao diện Hội Tết: nguyên liệu và bánh của bếp, lịch Tết, nút dâng bánh, phúc lành đang có.
// Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import type { GameState } from '../game/game';
import { BANH_IDS, bakeRates, bakeStore, canOffer, tetNeed, tetOpen, type Nguon } from '../game/tet';
import { vi } from '../text/vi';

const NGUON_ICON: Record<Nguon, string> = { nep: '🌾', dauLa: '🌿', thit: '🐖', bep: '🍲' };
const NGUON_IDS: Nguon[] = ['nep', 'dauLa', 'thit', 'bep'];

const num = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });

/** Tết đang mở thì đếm ngược; chưa tới thì còn bao lâu. */
function scheduleHtml(state: GameState): string {
  const tet = state.tet;
  if (tetOpen(state)) return `<p><b>🎋 ${vi.ui.tetOpen(Math.max(0, Math.ceil((tet.openUntil - state.clock) / 1000)))}</b></p>`;
  if (tet.nextAt === null) return `<p class="muted">${vi.ui.tetSoon}</p>`;
  const busy = state.raid.phase !== 'idle' || !!state.campaign.battle;
  if (busy && state.clock >= tet.nextAt) return `<p class="muted">🎋 ${vi.ui.tetWaitBattle}</p>`;
  return `<p class="muted">🎋 ${vi.ui.tetNext(Math.ceil((tet.nextAt - state.clock) / 60000))}</p>`;
}

/** Bánh đang có so với số cần dâng; Tết đang mở thì có nút dâng. */
function banhHtml(state: GameState): string {
  const need = tetNeed(state);
  const open = tetOpen(state);
  const rows = BANH_IDS.map((k) => {
    const have = Math.floor(state.tet.banh[k]);
    let action = '';
    if (open) {
      if (state.tet.offered[k]) action = `<b class="done">✓ ${vi.ui.offered}</b>`;
      else {
        const ok = canOffer(state, k).ok;
        action = `<button class="btn small bronze" data-act="offerBanh" data-banh="${k}" ${ok ? '' : 'disabled'}>${vi.ui.offerBanh(vi.ui.banh[k].name, need)}</button>`;
      }
    }
    const bless = vi.ui.bless[k];
    return `<div class="unit-row"><span class="unit-icon">${vi.ui.banh[k].icon}</span>
      <span class="unit-info"><b>${vi.ui.banh[k].name}: ${vi.ui.tetStock(have, need)}</b><small>${bless.icon} ${bless.name}: ${bless.desc}</small></span>${action}</div>`;
  }).join('');
  return `<h3>${vi.ui.tetNeedTitle}</h3><div class="units">${rows}</div>`;
}

/** Phúc lành đang có. */
export function blessingHtml(state: GameState): string {
  const on = BANH_IDS.filter((k) => state.tet.blessing[k]);
  if (!on.length) return `<p class="muted">${vi.ui.blessNone}</p>`;
  const list = on.map((k) => `<div class="stat"><span>${vi.ui.bless[k].icon} ${vi.ui.bless[k].name}</span><span>${vi.ui.bless[k].desc}</span></div>`).join('');
  return `${list}<p class="muted">${vi.ui.blessUntil}</p>`;
}

/** Nguyên liệu mỗi phút, bánh làm ra, nguồn đang thiếu. */
function bakeHtml(state: GameState): string {
  const r = bakeRates(state);
  if (r.short === null) return `<p class="muted">${vi.ui.tetNoBep}</p>`;
  // Mọi nguyên liệu cùng chậm nhất đều là chỗ thiếu; bếp chỉ thiếu khi nguyên liệu dư.
  const least = r[r.short];
  const lacking = r.short === 'bep' ? [] : NGUON_IDS.filter((k) => k !== 'bep' && r[k] <= least + 1e-9);
  const rows = NGUON_IDS.map(
    (k) => `<div class="stat ${lacking.includes(k) || k === r.short ? 'lack' : ''}"><span>${NGUON_ICON[k]} ${vi.ui.nguon[k]}</span><span>${vi.ui.perMin(r[k])}</span></div>`,
  ).join('');
  const out = BANH_IDS.map((k) => `${vi.ui.banh[k].icon} ${vi.ui.perMin(r[k])}`).join(' · ');
  const short = r.short === 'bep' ? vi.ui.tetBepShort : vi.ui.tetShort(lacking.map((k) => vi.ui.nguon[k]), num(r.chung));
  return `<h3>${vi.ui.tetIngredients}</h3>${rows}
    <div class="stat"><span>${vi.ui.tetBaking}</span><span>${out}</span></div>
    <p class="muted">${short} ${vi.ui.tetStore(bakeStore(state))}</p>`;
}

/** Mục Hội Tết trong bảng của bốn công trình làm bánh, và cả bảng Tết. */
export function tetHtml(state: GameState): string {
  return `<div class="info tet">${scheduleHtml(state)}${banhHtml(state)}${bakeHtml(state)}<h3>${vi.ui.blessTitle}</h3>${blessingHtml(state)}</div>`;
}
