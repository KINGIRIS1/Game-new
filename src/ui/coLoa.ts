// Giao diện An Dương Vương: thành Cổ Loa mấy vòng, các bước để Cao Lỗ chế nỏ thần, rồi kỹ năng trong trận.
// Và bảng Cao Lỗ (chương 4): đã cầm quân chưa, đang nghỉ không, kỹ năng.
// Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { heroSkills } from '../game/battle';
import { caoLoJoined, caoLoResting } from '../game/caoLo';
import { advJoined, advLook, advResting, canForgeNoThan, noThanSteps } from '../game/coLoa';
import { NO_THAN_FORGE, RINGS_NEEDED } from '../game/defs';
import type { GameState } from '../game/game';
import { vi } from '../text/vi';
import { costHtml } from './format';

function skillsHtml(state: GameState): string {
  if (!advJoined(state)) return '';
  const list = heroSkills({ kind: 'anDuong', bamboo: false, glow: false, non: false, kimQuy: state.adv.kimQuy });
  const rows = list.map((k) => `<div class="skill-row"><b>${vi.skills[k].icon} ${vi.skills[k].name}</b><span class="muted">${vi.skills[k].desc}</span></div>`).join('');
  return `<h3>${vi.ui.skillsTitle}</h3>${rows}`;
}

/** Một bước trong danh sách: đã xong thì có dấu ✓. */
function step(done: boolean, icon: string, text: string): string {
  return `<div class="unit-row"><span class="unit-icon">${icon}</span>
    <span class="unit-info"><b>${text}</b></span>${done ? '<b class="done">✓</b>' : '<span class="muted">…</span>'}</div>`;
}

export function advHtml(state: GameState): string {
  const look = advLook(state);
  const head = look ? `<div class="giong-head"><span class="big">${vi.advLooks[look].icon}</span><b>${vi.advLooks[look].name}</b></div>` : '';
  const steps = noThanSteps(state);
  const pips = Array.from({ length: RINGS_NEEDED }, (_, i) => `<i class="${i < steps.rings ? 'on' : ''}"></i>`).join('');
  const citadel = `<h3>🏰 ${vi.ui.citadelTitle}</h3>
    <div class="stat"><span>${vi.ui.rings(Math.min(steps.rings, 9), RINGS_NEEDED)}</span><span class="level-pips">${pips}</span></div>
    <p class="muted">${vi.ui.ringsHint}</p>`;
  let status: string = vi.ui.advWaiting;
  if (advJoined(state)) {
    if (advResting(state)) status = vi.ui.advResting(Math.ceil((state.adv.restUntil - state.clock) / 1000));
    else status = state.adv.bien ? vi.ui.advSea : state.adv.won ? vi.ui.advWon : vi.ui.advReady;
  }
  let forge = '';
  if (!advJoined(state)) {
    const check = canForgeNoThan(state);
    forge = `<h3>🏹 ${vi.ui.noThanTitle}</h3>
      <div class="units">
        ${step(steps.yeu, '🐔', vi.ui.stepYeu)}
        ${step(steps.rings >= RINGS_NEEDED, '🏰', vi.ui.stepRings(steps.rings, RINGS_NEEDED))}
        ${step(steps.forge >= NO_THAN_FORGE.forgeLevel, '⚒️', vi.ui.stepForge(NO_THAN_FORGE.forgeLevel, steps.forge))}
      </div>
      <div class="actions"><button class="btn bronze" data-act="forgeNoThan" ${check.ok ? '' : 'disabled'}>🏹 ${vi.ui.forgeNoThan} · ${costHtml(state, NO_THAN_FORGE.cost)}</button></div>
      ${check.ok ? '' : `<div class="why">${vi.reasons[check.reason]}</div>`}`;
  }
  return `<div class="info giong">${head}<p class="muted">${status}</p>${citadel}${forge}${skillsHtml(state)}</div>`;
}

/** Bảng Cao Lỗ: cầm quân từ màn 25, kỹ năng Nỏ liên châu, Lệnh bắn từ màn 30. */
export function caoLoHtml(state: GameState): string {
  let status: string = vi.ui.caoLoWaiting;
  if (caoLoJoined(state)) status = caoLoResting(state) ? vi.ui.caoLoResting(Math.ceil((state.caoLo.restUntil - state.clock) / 1000)) : vi.ui.caoLoReady;
  const list = heroSkills({ kind: 'caoLo', bamboo: false, glow: false, non: false, lenhBan: state.caoLo.lenhBan });
  const rows = list.map((k) => `<div class="skill-row"><b>${vi.skills[k].icon} ${vi.skills[k].name}</b><span class="muted">${vi.skills[k].desc}</span></div>`).join('');
  const more = state.caoLo.lenhBan ? '' : `<p class="muted">${vi.ui.caoLoLenhBan}</p>`;
  return `<div class="info giong"><div class="giong-head"><span class="big">🎯</span><b>${vi.ui.caoLo}</b></div>
    <p class="muted">${status}</p><h3>${vi.ui.skillsTitle}</h3>${rows}${more}</div>`;
}
