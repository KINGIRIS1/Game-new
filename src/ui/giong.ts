// Giao diện Thánh Gióng: bảng góp gạo và rèn đồ sắt, và hộp thoại kể từng đoạn truyện.
// Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { GEAR, GEAR_IDS, GIONG_FEED, type SkillId } from '../game/defs';
import type { GameState, StoryId } from '../game/game';
import { canFeed, canForge, giongLook, giongReady, giongResting, nextFeedCost } from '../game/giong';
import { vi } from '../text/vi';
import { costHtml, esc } from './format';

function skillsHtml(state: GameState): string {
  if (!giongReady(state)) return '';
  const list: SkillId[] = state.giong.whipBroken ? ['phunLua', 'nhoTre'] : ['phunLua'];
  const rows = list.map((k) => `<div class="skill-row"><b>${vi.skills[k].icon} ${vi.skills[k].name}</b><span class="muted">${vi.skills[k].desc}</span></div>`).join('');
  return `<h3>${vi.ui.skillsTitle}</h3>${rows}${state.giong.whipBroken ? `<p class="muted">${vi.ui.whipBroken}</p>` : ''}`;
}

export function giongHtml(state: GameState): string {
  const g = state.giong;
  if (g.ascended) return `<div class="info giong"><p>${vi.ui.giongHienLinh}</p>${skillsHtml(state)}</div>`;
  const look = giongLook(state);
  const head = look ? `<div class="giong-head"><span class="big">${vi.giongLooks[look].icon}</span><b>${vi.giongLooks[look].name}</b></div>` : '';
  let status: string = vi.ui.giongNotReady;
  if (giongReady(state)) status = giongResting(state) ? vi.ui.giongResting(Math.ceil((g.restUntil - state.clock) / 1000)) : vi.ui.giongReady;
  const pips = GIONG_FEED.map((_, i) => `<i class="${i < g.fed ? 'on' : ''}"></i>`).join('');
  const cost = nextFeedCost(state);
  const feed = `<h3>🌾 ${vi.ui.giongFeedTitle}</h3>
    <div class="stat"><span>${vi.ui.giongFed(g.fed, GIONG_FEED.length)}</span><span class="level-pips">${pips}</span></div>
    ${cost !== null ? `<div class="actions"><button class="btn bronze" data-act="feedGiong" ${canFeed(state).ok ? '' : 'disabled'}>🌾 ${vi.ui.feed} · ${costHtml(state, { gao: cost })}</button></div>` : ''}`;
  const gear = GEAR_IDS.map((id) => {
    const check = canForge(state, id);
    const why = !g.gear[id] && !check.ok && check.reason === 'canLoRen' ? vi.ui.needForge(GEAR[id].forgeLevel) : '';
    const action = g.gear[id]
      ? `<b class="done">✓ ${vi.ui.forged}</b>`
      : `<button class="btn small" data-act="forgeGear" data-gear="${id}" ${check.ok ? '' : 'disabled'}>${vi.ui.forge}<br>${costHtml(state, GEAR[id].cost)}</button>`;
    return `<div class="unit-row"><span class="unit-icon">${vi.gear[id].icon}</span>
      <span class="unit-info"><b>${vi.gear[id].name}</b>${why ? `<small class="lack">${why}</small>` : ''}</span>${action}</div>`;
  }).join('');
  return `<div class="info giong">${head}<p class="muted">${status}</p>${feed}
    <h3>⚒️ ${vi.ui.gearTitle}</h3><div class="units">${gear}</div>${skillsHtml(state)}</div>`;
}

/** Một thẻ trong đoạn truyện `id`: người nói, lời, nút sang thẻ sau. */
export function storyHtml(id: StoryId, step: number): string {
  const story = vi.stories[id];
  const line = story.lines[step];
  const who = vi.speakers[line.who];
  const last = step >= story.lines.length - 1;
  return `<div class="modal story">
    <div class="story-title">${esc(story.title)}</div>
    <div class="speaker ${line.who}"><span class="avatar">${who.icon}</span><b>${who.name}</b></div>
    <p class="line">${esc(line.text)}</p>
    <div class="story-foot"><span class="muted">${step + 1}/${story.lines.length}</span>
      <button class="btn bronze" data-act="storyNext">${last ? vi.ui.storyEnd : vi.ui.storyNext}</button></div>
  </div>`;
}
