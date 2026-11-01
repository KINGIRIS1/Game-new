// Giao diện vùng đất bên kia sông: bảng một khoảnh (đã dò chưa, có gì, sai trinh sát).
// Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { CAMPS, NGHE_BUILDING, canJoinVillage, canOpenPlot, canScout, canStartCamp, hasCamp, plotCost, plotOf, poiAt, villageOutput } from '../game/benKia';
import { DAC_SAN_BONUS, RESOURCE_IDS, SCOUT_COST, SCOUT_MS, VILLAGE_GIFT, type Cost } from '../game/defs';
import type { GameState } from '../game/game';
import { heroFor } from '../game/son';
import { vi } from '../text/vi';
import { armyPickerHtml, battleWarnings, enemiesHtml, heroNote, type ArmyPick } from './campaign';
import { costHtml, esc, fmt } from './format';

/** Sản lượng mỗi phút: biểu tượng và số. */
function perMinute(cost: Cost): string {
  return RESOURCE_IDS.filter((r) => (cost[r] ?? 0) > 0)
    .map((r) => `${vi.resources[r].icon} ${fmt(cost[r]!)}${vi.ui.perMinute}`)
    .join(' · ');
}

/** Đang chọn quân đánh đồn ở khoảnh nào (bảng đất bên kia chuyển sang bước chọn quân). */
export interface CampPick {
  plot: number;
  pick: ArmyPick;
}

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

/** Phần đồn giặc chưa dẹp: quân giặc, thưởng, tướng, lời báo, nút Điều quân. */
function campHtml(state: GameState, id: number, tier: 1 | 2 | 3 | 4): string {
  const def = CAMPS[tier];
  const check = canStartCamp(state, id);
  return `<div class="stat"><span>${vi.ui.enemyArmy}</span><b>${enemiesHtml(def.enemies)}</b></div>
    <div class="stat"><span>${vi.benKia.campReward}</span>${costHtml(null, def.reward)}</div>
    ${heroNote(heroFor(state, def.chapter))}
    ${battleWarnings(state, def.chapter)}
    <div class="actions">
      ${check.ok ? '' : `<span class="why">${esc(vi.reasons[check.reason])}</span>`}
      <button class="btn" data-act="campPrepare" data-id="${id}" ${check.ok ? '' : 'disabled'}>⚔️ ${vi.benKia.campPrepare}</button>
    </div>`;
}

/** Bảng một khoảnh bên kia sông; đang chọn quân đánh đồn ở khoảnh này thì hiện bảng chọn quân. */
export function farHtml(state: GameState, id: number, pick: CampPick | null = null): string {
  const tier = poiAt(id)?.kind === 'don' ? (poiAt(id) as { tier: 1 | 2 | 3 | 4 }).tier : null;
  if (pick && pick.plot === id && tier && hasCamp(state, id)) {
    return armyPickerHtml(state, pick.pick, CAMPS[tier].chapter, 'campBack', 'marchCamp', id);
  }
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
      rows.push(`<h3>${t.don[poi.tier].icon} ${t.don[poi.tier].name}</h3>`);
      if (cleared) rows.push(`<p class="done">✓ ${t.donCleared}</p>`);
      else rows.push(`<p>${t.donDesc}</p><p class="muted">${t.donNeed[poi.tier]}</p>${campHtml(state, id, poi.tier)}`);
    } else if (poi.kind === 'lang') {
      rows.push(`<h3>${t.lang[poi.nghe].icon} ${t.lang[poi.nghe].name}</h3>`);
      const out = perMinute(villageOutput(state, id));
      if (k.villages.includes(id)) {
        rows.push(`<p class="done">✓ ${t.langJoined}</p><div class="stat"><span>${vi.ui.production}</span><span>${out}</span></div>`);
      } else {
        rows.push(`<p>${t.langDesc}</p><div class="stat"><span>${t.langWill}</span><span>${out}</span></div>
          <p class="muted">${t.langLike(vi.buildings[NGHE_BUILDING[poi.nghe]].name)}</p>`);
        if (open) {
          const check = canJoinVillage(state, id);
          rows.push(`<div class="actions">${check.ok ? '' : `<span class="why">${esc(vi.reasons[check.reason])}</span>`}
            <button class="btn bronze" data-act="joinVillage" data-id="${id}" ${check.ok ? '' : 'disabled'}>🎁 ${t.langGift}</button></div>
            ${costHtml(state, VILLAGE_GIFT)}`);
        }
      }
    } else if (poi.kind === 'dacSan') {
      rows.push(`<h3>${t.dacSan[poi.dat].icon} ${t.dacSan[poi.dat].name}</h3><p>${t.dacSan[poi.dat].desc}</p>
        <p class="muted">${t.dacSanBonus(Math.round(DAC_SAN_BONUS * 100))}</p>`);
    } else {
      rows.push(`<h3>${t.cua.icon} ${t.cua.name}</h3><p>${k.dug.includes(id) ? t.cuaDug : t.cua.desc}</p>`);
    }
    if (!open) {
      const check = canOpenPlot(state, id);
      rows.push(`<div class="actions">${check.ok ? '' : `<span class="why">${esc(vi.reasons[check.reason])}</span>`}
        <button class="btn" data-act="openPlot" data-id="${id}" ${check.ok ? '' : 'disabled'}>🪓 ${t.openBtn}</button></div>
        ${costHtml(state, plotCost(state))}`);
    }
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
