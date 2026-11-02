// Bảng Đất bên kia sông: chạm một khoảnh bên kia (không trúng công trình) thì hiện bờ nào, khoảnh thứ mấy, đã dò hay
// chưa, điểm lạ, vùng đồn giặc nào đang giữ, nút Sai trinh sát kèm giá hay lý do chưa sai được. Chỉ dựng chuỗi HTML;
// Hud lo việc gắn vào trang và bắt sự kiện.

import { CAMPS, campHero, campOf, campTier, canJoinVillage, canScout, canStartCamp, hasCamp, plotHeld, plotOf, poiAt, regionOf, treasureReward, villageOutput, type Poi, type Tier } from '../game/benKia';
import { SCOUT_COST, SCOUT_MS, VILLAGE_GIFT } from '../game/defs';
import type { GameState } from '../game/game';
import { vi } from '../text/vi';
import { armyHtml, enemyList, heroNote, warningsFor, type ArmyPick } from './campaign';
import { costHtml, esc } from './format';

/** Tên và biểu tượng của một điểm lạ. */
export function poiLabel(poi: Poi): { name: string; icon: string } {
  if (poi.kind === 'don') return vi.benKia.don[poi.tier];
  if (poi.kind === 'lang') return vi.benKia.lang[poi.nghe];
  if (poi.kind === 'dacSan') return vi.benKia.dacSan[poi.dat];
  return vi.benKia.cua;
}

/** Phần đồn giặc chưa dẹp: quân giặc, thưởng, vùng sẽ về tay ta, tướng, lời báo, nút Điều quân. */
function campHtml(state: GameState, id: number, tier: Tier): string {
  const def = CAMPS[tier];
  const check = canStartCamp(state, id);
  return `<div class="stat"><span>${vi.ui.enemyArmy}</span><b>${enemyList(0, def.enemies)}</b></div>
    <div class="stat"><span>${vi.benKia.campReward}</span><span>${costHtml(null, def.reward)}</span></div>
    <p class="muted">${vi.benKia.campRegion(regionOf(id).length)}</p>
    ${heroNote(campHero(state, id))}
    ${warningsFor(state, def.chapter)}
    <div class="actions">
      <button class="btn" data-act="donPrepare" data-id="${id}" ${check.ok ? '' : 'disabled'}>⚔️ ${vi.benKia.campPrepare}</button>
      ${check.ok ? '' : `<div class="why">${esc(vi.reasons[check.reason])}</div>`}
    </div>`;
}

/** Phần bản làng: về theo thì làm ra bao nhiêu; chưa về theo thì nút dâng lễ kết thân kèm giá, hay lý do chưa được. */
function villageHtml(state: GameState, id: number): string {
  const out = `<div class="stat"><span>${vi.benKia.villageMakes}</span><span>${costHtml(null, villageOutput(state, id))}${vi.ui.perMinute}</span></div>`;
  if (state.benKia.villages.includes(id)) return `<p class="done">✓ ${vi.benKia.villageJoined}</p>${out}`;
  const check = canJoinVillage(state, id);
  return `<p class="muted">${vi.benKia.langDesc}</p>${out}
    <div class="actions">
      <button class="btn" data-act="ketThan" data-id="${id}" ${check.ok ? '' : 'disabled'}>🎁 ${vi.benKia.villageJoin} · ${costHtml(state, VILLAGE_GIFT)}</button>
      ${check.ok ? '' : `<div class="why">${esc(vi.reasons[check.reason])}</div>`}
    </div>`;
}

/** Bảng một khoảnh bên kia sông; đang chọn quân đánh đồn ở khoảnh này thì hiện bảng chọn quân. */
export function benKiaHtml(state: GameState, id: number, pick: ArmyPick | null = null): string {
  const tier = campTier(id);
  if (pick && pick.don === id && tier && hasCamp(state, id)) return armyHtml(state, pick, 0);
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
        if (!hasCamp(state, id)) rows.push(`<p class="done">✓ ${vi.benKia.donCleared}</p>`);
        else rows.push(`<p class="muted">${vi.benKia.donDesc(regionOf(id).length)} ${vi.benKia.donNeed[poi.tier]}.</p>${campHtml(state, id, poi.tier)}`);
      } else if (poi.kind === 'lang') rows.push(villageHtml(state, id));
      else if (poi.kind === 'dacSan') rows.push(`<p class="muted">${vi.benKia.dacSan[poi.dat].desc}</p>`);
      else if (k.dug.includes(id)) rows.push(`<p class="done">✓ ${vi.benKia.cuaDug}</p>`);
      else rows.push(`<p class="muted">${vi.benKia.cua.desc}</p><div class="stat"><span>${vi.benKia.cuaWorth}</span><span>${costHtml(null, treasureReward(state))}</span></div>`);
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
