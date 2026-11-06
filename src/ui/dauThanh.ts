// Bảng Đấu thành (mở bằng chip 🏯 trên đầu bản đồ phó bản): chọn kinh đô để đánh thử (kinh đô của mình hay kinh
// đô máy), hướng tràn vào, quân mang theo; bảng kết quả sau trận. Máy chủ chưa mở nên chỉ đánh thử.

import { isScored } from '../game/battle';
import { BUILDINGS, DAU_THANH, RESOURCE_IDS, UNITS, UNIT_TYPES } from '../game/defs';
import { armySpace, fieldCap, fitArmy, type Army } from '../game/doanhTrai';
import { botSnapshot, canPractice, defenderState, lootCap, makeSnapshot, validateArmy, type PvpScore, type Snapshot } from '../game/dauThanh';
import { dienLevel, type GameState } from '../game/game';
import { chapterOf } from '../game/manVao';
import { heroesFor } from '../game/son';
import { vi } from '../text/vi';
import { fmt } from './format';
import { capitalMiniMap } from './mau';

/** Kinh đô để đánh thử: 0 là kinh đô của mình, số khác là kinh đô máy ở cấp Điện ấy. */
export type DauTarget = number;

/** Bảng Đấu thành đang mở: kinh đô chọn đánh (và bản chụp của nó), hướng tràn vào, quân mang theo, bước. */
export interface DauView {
  step: 'target' | 'army';
  target: DauTarget;
  snap: Snapshot;
  /** Bản đồ thu nhỏ của kinh đô chọn đánh (ảnh dựng một lần mỗi lần chọn). */
  map: string;
  side: 'bac' | 'tay';
  army: Army;
}

/** Bản chụp của kinh đô `target` (kinh đô máy dựng một lần mỗi cấp Điện). */
const bots = new Map<number, Snapshot>();
export function targetSnapshot(state: GameState, target: DauTarget): Snapshot {
  if (!target) return makeSnapshot(state);
  let snap = bots.get(target);
  if (!snap) {
    snap = botSnapshot(target);
    bots.set(target, snap);
  }
  return snap;
}

/** Các kinh đô đánh thử được: kinh đô của mình, kinh đô máy kém một cấp, cùng cấp, hơn một cấp Điện (từ Điện 5). */
export function dauTargets(state: GameState): DauTarget[] {
  const d = dienLevel(state);
  const bots = [d - 1, d, d + 1].filter((n) => n >= DAU_THANH.unlockDien && n <= BUILDINGS.dien.maxLevel);
  return [0, ...bots];
}

/** Mở bảng Đấu thành: chọn sẵn kinh đô máy cùng cấp (hay kinh đô của mình), phía bắc, quân như phó bản. */
export function newDauView(state: GameState): DauView {
  const targets = dauTargets(state);
  const target = targets.includes(dienLevel(state)) ? dienLevel(state) : 0;
  return { step: 'target', side: 'bac', army: fitArmy({ ...state.troops }, fieldCap(state)), ...pickTarget(state, target) };
}

/** Chọn kinh đô để đánh: bản chụp và bản đồ thu nhỏ. */
export function pickTarget(state: GameState, target: DauTarget): Pick<DauView, 'target' | 'snap' | 'map'> {
  const snap = targetSnapshot(state, target);
  return { target, snap, map: capitalMiniMap(defenderState(snap)) };
}

/** Thêm bớt một lính mang theo, không quá số có và số chỗ một trận. */
export function stepDauArmy(state: GameState, view: DauView, k: (typeof UNIT_TYPES)[number], delta: number): void {
  const n = Math.max(0, Math.min(state.troops[k], view.army[k] + delta));
  const next = { ...view.army, [k]: n };
  if (delta > 0 && armySpace(next) > fieldCap(state)) return;
  view.army[k] = n;
}

const DEFENSES = new Set(['choiCanh', 'lauNo', 'congThanh']);

function targetInfo(snap: Snapshot): string {
  const guards = snap.guards.reduce((n, g) => n + g.n, 0);
  const towers = snap.buildings.filter((b) => DEFENSES.has(b.type) || b.uNo).length;
  return vi.dauThanh.info(snap.dien, guards, towers);
}

function lootHtml(snap: Snapshot): string {
  const cap = lootCap(snap);
  const parts = RESOURCE_IDS.filter((r) => cap[r] > 0).map((r) => `${vi.resources[r].icon} ${fmt(cap[r])}`);
  return parts.join(' ') || vi.ui.raidNone;
}

/** Bản đồ bên trái bảng: kinh đô chọn đánh, thu nhỏ. */
export function dauMapHtml(view: DauView): string {
  return `<img class="dau-map" src="${view.map}" alt="${vi.dauThanh.title}">`;
}

/** Bảng bên phải (hay dưới) bản đồ. */
export function dauHtml(state: GameState, view: DauView): string {
  const why = canPractice(state);
  const head = `<h3>${vi.dauThanh.chip}</h3><p class="muted">${vi.dauThanh.intro}</p>`;
  if (view.step === 'target') {
    const opts = dauTargets(state)
      .map((t) => {
        const snap = t === view.target ? view.snap : targetSnapshot(state, t);
        const sel = t === view.target;
        return `<button class="hero-opt ${sel ? 'sel' : ''}" data-act="dauTarget" data-id="${t}" aria-pressed="${sel}">
          <span class="unit-icon">${t ? '🏯' : '🏠'}</span>
          <span class="unit-info"><b>${t ? vi.dauThanh.bot(t) : vi.dauThanh.own}</b><small>${t ? vi.dauThanh.botDesc : vi.dauThanh.ownDesc}<br>${targetInfo(snap)}</small></span>
        </button>`;
      })
      .join('');
    const sides = (['bac', 'tay'] as const)
      .map((s) => `<button class="btn small ${s === view.side ? 'bronze' : 'ghost'}" data-act="dauSide" data-side="${s}">${vi.dauThanh.sides[s]}</button>`)
      .join(' ');
    return `<div class="stage-card dau">${head}
      <div class="hero-pick"><h4>${vi.dauThanh.targetTitle}</h4><div class="hero-opts">${opts}</div></div>
      <div class="stat"><span>${vi.dauThanh.lootCap}</span><b>${lootHtml(view.snap)}</b></div>
      <p class="rule">⭐ ${vi.dauThanh.rules}</p>
      <div class="hero-pick"><h4>${vi.dauThanh.sideTitle}</h4><div class="dau-sides">${sides}</div></div>
      ${why ? `<p class="why">${vi.dauThanh.reasons[why]}</p>` : ''}
      <div class="actions"><button class="btn" data-act="dauNext" ${why ? 'disabled' : ''}>${vi.dauThanh.next}</button></div>
    </div>`;
  }
  const cap = fieldCap(state);
  const space = armySpace(view.army);
  const rows = UNIT_TYPES.filter((k) => state.troops[k] > 0)
    .map((k) => {
      const n = view.army[k];
      const more = n < state.troops[k] && space + UNITS[k].space <= cap;
      return `<div class="unit-row army">
        <span class="unit-icon">${vi.units[k].icon}</span>
        <span class="unit-info"><b>${vi.units[k].name}</b><small>${vi.ui.haveTroops(state.troops[k])}</small></span>
        <button class="step" data-act="dauDelta" data-unit="${k}" data-delta="-1" ${n <= 0 ? 'disabled' : ''}>−</button>
        <b class="count">${n}</b>
        <button class="step" data-act="dauDelta" data-unit="${k}" data-delta="1" ${more ? '' : 'disabled'}>+</button>
      </div>`;
    })
    .join('');
  const heroes = heroesFor(state, chapterOf(state));
  const heroNote = heroes.length ? vi.dauThanh.heroes(heroes.map((h) => vi.ui.heroNames[h.kind]).join(', ')) : vi.dauThanh.noHero;
  const bad = validateArmy(state, view.army) ?? canPractice(state);
  return `<div class="stage-card dau"><h3>${vi.dauThanh.armyTitle}</h3>
    <p class="muted">${view.target ? vi.dauThanh.bot(view.target) : vi.dauThanh.own} · ${vi.dauThanh.sides[view.side]}</p>
    <p class="muted">${vi.dauThanh.armyHint}</p>
    <p class="hero-note">${heroNote}</p>
    <div class="stat"><span>${vi.ui.fieldSpace(space, cap)}</span></div>
    ${rows ? `<div class="units">${rows}</div>` : `<p class="why">${vi.ui.noTroops}</p>`}
    ${bad ? `<p class="why">${vi.dauThanh.reasons[bad]}</p>` : ''}
    <div class="actions">
      <button class="btn ghost" data-act="dauBack">${vi.ui.back}</button>
      <button class="btn" data-act="dauAttack" ${bad ? 'disabled' : ''}>${vi.dauThanh.attack}</button>
    </div>
  </div>`;
}

/** Số công trình tính điểm của kinh đô, để thanh trận ghi phần trăm. */
export const scoredCount = (def: GameState): number => def.buildings.filter(isScored).length;

/** Bảng kết quả sau trận Đấu thành (đánh thử). */
export function dauResultHtml(score: PvpScore, lost: Army, loot: Record<(typeof RESOURCE_IDS)[number], number>): string {
  const fallen = UNIT_TYPES.filter((k) => lost[k] > 0).map((k) => `${vi.units[k].icon} ${lost[k]}`).join(' ') || vi.ui.raidNone;
  const got = RESOURCE_IDS.filter((r) => loot[r] > 0).map((r) => `${vi.resources[r].icon} ${fmt(loot[r])}`).join(' ') || vi.ui.raidNone;
  return `<div class="modal dau-result">
    <h2>${score.stars ? vi.dauThanh.resultWon(score.stars) : '🏳️ ' + vi.dauThanh.resultLost}</h2>
    <div class="dau-stars">${'⭐'.repeat(score.stars)}${'☆'.repeat(3 - score.stars)}</div>
    <div class="result-rows">
      <div>${vi.dauThanh.resultPct(Math.floor(score.pct * 100))}</div>
      <div>${score.dien ? vi.dauThanh.resultDien : vi.dauThanh.resultNoDien}</div>
      <div>${vi.dauThanh.resultFallen}: ${fallen}</div>
      <div>${vi.dauThanh.resultLoot}: ${got}</div>
    </div>
    <p class="muted">${vi.dauThanh.practiceNote}</p>
    <div class="actions">
      <button class="btn ghost" data-act="dauAgain">${vi.dauThanh.again}</button>
      <button class="btn bronze" data-act="dauHome">${vi.dauThanh.home}</button>
    </div>
  </div>`;
}
