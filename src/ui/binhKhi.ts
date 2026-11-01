// Giao diện rèn binh khí trong bảng lò rèn: mỗi binh chủng hai bậc.
// Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { canForgeArms, nextArms } from '../game/binhKhi';
import { ARMS, UNIT_TYPES } from '../game/defs';
import { inChapter4 } from '../game/chuong4';
import type { GameState } from '../game/game';
import { vi } from '../text/vi';
import { costHtml } from './format';

export function armsHtml(state: GameState): string {
  // Lính nỏ có từ chương 4.
  const rows = UNIT_TYPES.filter((k) => k !== 'no' || inChapter4(state)).map((k) => {
    const tier = state.arms[k];
    const next = nextArms(state, k);
    const pips = ARMS.map((_, i) => `<i class="${i < tier ? 'on' : ''}"></i>`).join('');
    let action: string;
    let why = '';
    if (!next) {
      action = `<b class="done">✓ ${vi.ui.armsDone}</b>`;
    } else {
      const check = canForgeArms(state, k);
      if (!check.ok && check.reason === 'canLoRen') why = vi.ui.needForge(next.forgeLevel);
      action = `<button class="btn small" data-act="forgeArms" data-unit="${k}" ${check.ok ? '' : 'disabled'}>${vi.ui.armsForge(tier + 1)}<br>${costHtml(state, next.cost)}</button>`;
    }
    return `<div class="unit-row"><span class="unit-icon">${vi.units[k].icon}</span>
      <span class="unit-info"><b>${vi.units[k].name}</b><small>${vi.ui.armsTier(tier)} <span class="level-pips">${pips}</span></small>
      ${why ? `<small class="lack">${why}</small>` : ''}</span>${action}</div>`;
  }).join('');
  return `<h3>⚔️ ${vi.ui.armsTitle}</h3><p class="muted">${vi.ui.armsHint}</p><div class="units">${rows}</div>`;
}
