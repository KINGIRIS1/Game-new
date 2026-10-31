// Giao diện Sơn Tinh: năm lễ vật thách cưới, rồi Sơn Tinh ra trận và các kỹ năng.
// Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { heroSkills } from '../game/battle';
import { GIFTS, GIFT_IDS } from '../game/defs';
import type { GameState } from '../game/game';
import { canOffer, giftCount, sonJoined, sonLook, sonResting, sonSetup } from '../game/son';
import { vi } from '../text/vi';
import { costHtml, esc } from './format';

function skillsHtml(state: GameState): string {
  if (!sonJoined(state)) return '';
  const list = heroSkills({ kind: 'sonTinh', bamboo: false, glow: false, non: state.son.non });
  const rows = list.map((k) => `<div class="skill-row"><b>${vi.skills[k].icon} ${vi.skills[k].name}</b><span class="muted">${vi.skills[k].desc}</span></div>`).join('');
  return `<h3>${vi.ui.skillsTitle}</h3>${rows}`;
}

export function sonHtml(state: GameState): string {
  if (state.son.won) return `<div class="info giong"><p>${vi.ui.sonHienLinh}</p>${skillsHtml(state)}</div>`;
  const look = sonLook(state);
  const head = look ? `<div class="giong-head"><span class="big">${vi.sonLooks[look].icon}</span><b>${vi.sonLooks[look].name}</b></div>` : '';
  let status: string = vi.ui.sonWaiting;
  if (sonJoined(state)) status = sonResting(state) ? vi.ui.sonResting(Math.ceil((state.son.restUntil - state.clock) / 1000)) : vi.ui.sonReady;
  const pips = GIFT_IDS.map((g) => `<i class="${state.son.gifts[g] ? 'on' : ''}"></i>`).join('');
  const gifts = GIFT_IDS.map((id) => {
    const def = GIFTS[id];
    let action: string;
    if (state.son.gifts[id]) action = `<b class="done">✓</b>`;
    else if (def.cost) action = `<button class="btn small" data-act="offerGift" data-gift="${id}" ${canOffer(state, id).ok ? '' : 'disabled'}>${vi.ui.offer}<br>${costHtml(state, def.cost)}</button>`;
    else action = `<small class="muted">${vi.ui.giftFromStage(def.stage!)}</small>`;
    return `<div class="unit-row"><span class="unit-icon">${vi.gifts[id].icon}</span>
      <span class="unit-info"><b>${esc(vi.gifts[id].name)}</b></span>${action}</div>`;
  }).join('');
  return `<div class="info giong">${head}<p class="muted">${status}</p>
    <h3>💍 ${vi.ui.giftsTitle}</h3>
    <div class="stat"><span>${vi.ui.giftCount(giftCount(state), GIFT_IDS.length)}</span><span class="level-pips">${pips}</span></div>
    <div class="units">${gifts}</div>${sonSetup(state) || sonJoined(state) ? skillsHtml(state) : ''}</div>`;
}
