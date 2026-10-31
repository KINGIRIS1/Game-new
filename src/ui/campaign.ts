// Giao diện phó bản: bản đồ đường tới núi Trâu (chương 1) và đường lên núi Tản Viên (chương 2),
// thẻ màn, bảng xếp quân và bảng kết quả trận.
// Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { heroSkills, type HeroKind, type HeroSetup } from '../game/battle';
import { CH2_LAST, canStartStage, chapterStages, stageDef, stageHero, stageHeroCheck, stageOpen, stageReward } from '../game/campaign';
import { BOSSES, ROWS, UNIT_TYPES, type EnemyType, type Row, type UnitType } from '../game/defs';
import type { GameState, StageResult } from '../game/game';
import { giftOfStage, heroReady, heroRoster } from '../game/son';
import { vi } from '../text/vi';
import { costHtml, esc } from './format';

/** Lựa chọn trên bảng xếp quân: số lính mang theo, hàng đứng của từng binh chủng, tướng ra trận. */
export interface ArmyPick {
  army: Record<UnitType, number>;
  rows: Record<UnitType, Row>;
  hero: HeroKind | null;
}

/**
 * Vị trí các màn trên bản đồ (hệ tọa độ 100 × 160), đi từ Phong Châu ở dưới lên núi ở trên.
 * Chương 1 lên núi Trâu, chương 2 lên núi Tản Viên ba đỉnh.
 */
const NODES: Record<1 | 2, [number, number][]> = {
  1: [
    [26, 144],
    [62, 131],
    [80, 110],
    [46, 95],
    [20, 76],
    [55, 61],
    [80, 42],
    [50, 24],
  ],
  2: [
    [32, 142],
    [70, 130],
    [84, 108],
    [50, 98],
    [20, 84],
    [44, 64],
    [76, 52],
    [50, 30],
  ],
};
const START: [number, number] = [12, 154];

/** Núi, sông và tên đất vẽ sau đường đi, khác nhau ở mỗi chương. */
const SCENERY: Record<1 | 2, string> = {
  1: `<path class="mtn far" d="M8 30 L24 10 L40 30 Z M60 30 L78 8 L96 30 Z"/>
    <path class="mtn" d="M30 34 L50 4 L70 34 Z"/>
    <text class="label" x="50" y="40">Núi Trâu</text>
    <path class="river" d="M-2 122 C 20 112, 40 128, 62 118 S 92 104, 104 112"/>
    <path class="river" d="M-2 58 C 18 50, 34 66, 58 56 S 90 44, 104 50"/>`,
  2: `<path class="flood" d="M-2 112 C 20 100, 44 122, 70 108 S 96 96, 104 104 L104 122 C 84 128, 60 116, 36 128 S 6 128, -2 124 Z"/>
    <path class="mtn far" d="M4 40 L20 16 L36 40 Z M64 40 L80 16 L96 40 Z"/>
    <path class="mtn" d="M30 42 L50 6 L70 42 Z"/>
    <path class="cloud" d="M14 28 q 6 -5 12 0 q 5 -4 10 1 z M66 24 q 6 -5 12 0 q 5 -4 10 1 z"/>
    <text class="label" x="50" y="47">Núi Tản Viên</text>
    <path class="river" d="M-2 118 C 20 106, 44 126, 70 114 S 96 102, 104 110"/>
    <path class="river" d="M104 74 C 84 66, 62 84, 40 74 S 10 62, -2 68"/>
    <text class="label" x="84" y="82">Sông Đà</text>`,
};

export const hasBoss = (n: number) => BOSSES.some((k) => (stageDef(n)?.enemies[k] ?? 0) > 0);

export function mapHtml(state: GameState, selected: number | null, chapter: 1 | 2 = 1): string {
  const points = NODES[chapter];
  const stages = chapterStages(chapter);
  const road = [START, ...points].map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const nodes = points.map(([x, y], i) => {
    const n = stages[i];
    const cleared = n <= state.campaign.cleared;
    const open = !cleared && stageOpen(state, n);
    const cls = cleared ? 'cleared' : open ? 'open' : 'locked';
    const r = hasBoss(n) ? 7.5 : 6;
    const gift = giftOfStage(n);
    const mark = cleared ? '✓' : open ? String(n) : '🔒';
    return `<g class="node ${cls} ${selected === n ? 'sel' : ''}" data-act="pickStage" data-id="${n}" transform="translate(${x} ${y})">
      <circle class="halo" r="${r + 3}"/>
      <circle class="ring" r="${r}"/>
      <circle class="core" r="${r * 0.66}"/>
      <text class="num" y="${cleared || open ? 1.8 : 1.6}">${mark}</text>
      ${hasBoss(n) ? `<text class="boss" y="${-r - 1.5}">${stageDef(n)!.chapter === 2 ? '🌊' : '👹'}</text>` : ''}
      ${gift && !state.son.gifts[gift] ? `<text class="boss" y="${-r - 1.5}">${vi.gifts[gift].icon}</text>` : ''}
    </g>`;
  }).join('');
  const title = chapter === 2 ? vi.ui.campaignTitle2 : vi.ui.campaignTitle;
  return `<svg class="map" viewBox="0 0 100 160" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${title}">
    ${SCENERY[chapter]}
    <path class="road" d="${road}"/>
    <text class="start" x="${START[0]}" y="${START[1] + 1}">🏯</text>
    <text class="label" x="${START[0] + 19}" y="${START[1] + 2}">Phong Châu</text>
    ${nodes}
  </svg>`;
}

function enemyList(n: number): string {
  const enemies = stageDef(n)?.enemies ?? {};
  return (Object.keys(enemies) as EnemyType[])
    .filter((k) => (enemies[k] ?? 0) > 0)
    .map((k) => `<span title="${vi.enemies[k]}">${vi.enemyIcons[k]} ${enemies[k]}</span>`)
    .join(' · ');
}

/** Lý do chưa đánh được màn `n`, rỗng khi đánh được. */
export function stageBlocker(state: GameState, n: number): string {
  const check = canStartStage(state, n);
  if (check.ok) return '';
  if (check.reason === 'chuaDuCapDien') return `Cần Điện cấp ${stageDef(n)!.minDien}`;
  return vi.reasons[check.reason];
}

/** Dòng báo tướng nào cùng ra trận. */
export function heroNote(hero: HeroSetup | null): string {
  if (!hero) return '';
  if (hero.kind === 'sonTinh') return `<p class="hero-note">⛰️ ${vi.ui.sonJoins}</p>`;
  return `<p class="hero-note">🐎 ${hero.glow ? vi.ui.giongHienLinhJoins : vi.ui.giongJoins}</p>`;
}

export function stageHtml(state: GameState, n: number): string {
  const text = vi.stages[n - 1];
  const first = n > state.campaign.cleared;
  const why = stageBlocker(state, n);
  const gift = giftOfStage(n);
  return `<div class="stage-card">
    <h3>${vi.ui.stageN(n)} · ${esc(text.name)} ${hasBoss(n) ? `<span class="tag">👹 ${vi.ui.stageBoss}</span>` : ''}</h3>
    <p class="intro">${esc(text.intro)}</p>
    <div class="stat"><span>${vi.ui.enemyArmy}</span><b>${enemyList(n)}</b></div>
    <div class="stat"><span>${first ? vi.ui.firstReward : vi.ui.replayReward}</span>${costHtml(null, stageReward(state, n))}</div>
    ${gift && !state.son.gifts[gift] ? `<div class="stat"><span>${vi.ui.giftWon}</span><b>${vi.gifts[gift].icon} ${esc(vi.gifts[gift].name)}</b></div>` : ''}
    ${heroNote(stageHero(state, n))}
    <div class="actions">
      ${why ? `<span class="why">${esc(why)}</span>` : ''}
      <button class="btn" data-act="prepareStage" ${why ? 'disabled' : ''}>${vi.ui.prepare}</button>
    </div>
  </div>`;
}

const heroIcon = (k: HeroKind) => (k === 'sonTinh' ? '⛰️' : '🐎');
const heroName = (state: GameState, k: HeroKind) => (k === 'sonTinh' ? vi.ui.son : state.giong.ascended ? vi.ui.phuDong : vi.ui.giong);

/** Chọn tướng ra trận khi có hơn một tướng: mỗi trận một tướng, chạm để đổi. Tướng kiệt sức thì mờ đi. */
function heroPickHtml(state: GameState, pick: ArmyPick, stage: number): string {
  const def = stageDef(stage);
  const roster = def ? heroRoster(state, def.chapter) : [];
  if (roster.length < 2) return heroNote(stageHero(state, stage, pick.hero));
  const opts = roster
    .map((k) => {
      const check = stageHeroCheck(state, stage, k);
      // Không đếm ngược từng giây: bảng vẽ lại liên tục thì nuốt mất lần chạm.
      const ready = heroReady(state, k);
      const note = check.ok
        ? heroSkills(ready!).map((sk) => `${vi.skills[sk].icon} ${vi.skills[sk].name}`).join(' · ')
        : check.reason === 'sonKietSuc' || check.reason === 'giongKietSuc'
          ? vi.ui.heroResting
          : vi.reasons[check.reason];
      return `<button class="hero-opt ${pick.hero === k ? 'sel' : ''}" data-act="armyHero" data-hero="${k}" aria-pressed="${pick.hero === k}" ${check.ok ? '' : 'disabled'}>
        <span class="unit-icon">${heroIcon(k)}</span>
        <span class="unit-info"><b>${heroName(state, k)}</b><small>${esc(note)}</small></span>
      </button>`;
    })
    .join('');
  return `<div class="hero-pick"><h4>${vi.ui.heroPickTitle}</h4><div class="hero-opts">${opts}</div></div>`;
}

export function armyHtml(state: GameState, pick: ArmyPick, stage: number): string {
  const hero = stageHero(state, stage, pick.hero);
  const owned = UNIT_TYPES.filter((k) => state.troops[k] > 0);
  const total = UNIT_TYPES.reduce((s, k) => s + pick.army[k], 0);
  const rows = owned
    .map((k) => {
      const n = pick.army[k];
      return `<div class="unit-row army">
        <span class="unit-icon">${vi.units[k].icon}</span>
        <span class="unit-info"><b>${vi.units[k].name}</b><small>${vi.ui.haveTroops(state.troops[k])}</small></span>
        <button class="row-chip ${pick.rows[k]}" data-act="armyRow" data-unit="${k}">${vi.rows[pick.rows[k]]}</button>
        <button class="step" data-act="armyDelta" data-unit="${k}" data-delta="-1" ${n <= 0 ? 'disabled' : ''}>−</button>
        <b class="count">${n}</b>
        <button class="step" data-act="armyDelta" data-unit="${k}" data-delta="1" ${n >= state.troops[k] ? 'disabled' : ''}>+</button>
      </div>`;
    })
    .join('');
  return `<div class="stage-card">
    <h3>${vi.ui.armyTitle}</h3>
    <p class="muted">${vi.ui.armyHint}</p>
    ${heroPickHtml(state, pick, stage)}
    ${owned.length ? `<div class="units">${rows}</div>` : `<p class="why">${vi.ui.noTroops}</p>`}
    <div class="actions">
      <button class="btn ghost" data-act="backToStage">${vi.ui.back}</button>
      <button class="btn" data-act="march" ${total || hero ? '' : 'disabled'}>${vi.ui.march}</button>
    </div>
  </div>`;
}

/** Hàng kế tiếp khi chạm vào chip hàng: Tiền → Trung → Hậu → Tiền. */
export const nextRow = (r: Row): Row => ROWS[(ROWS.indexOf(r) + 1) % ROWS.length];

/** Mặc định mang hết lính đang có, đứng theo hàng đã chọn lần trước, cùng tướng chọn sẵn của màn `stage`. */
export function defaultPick(state: GameState, stage: number | null): ArmyPick {
  return { army: { ...state.troops }, rows: { ...state.campaign.rows }, hero: stage ? (stageHero(state, stage)?.kind ?? null) : null };
}

export function stageResultHtml(r: StageResult): string {
  const lost = UNIT_TYPES.filter((k) => r.lost[k] > 0).map((k) => `${vi.units[k].icon} ${r.lost[k]}`).join(' ') || vi.ui.raidNone;
  const finale = r.outcome === 'win' && r.first && r.stage === CH2_LAST;
  const title = finale
    ? `⛰️ ${vi.ui.sonWinTitle}`
    : r.outcome === 'win'
      ? `🥁 ${vi.ui.stageWonTitle(r.stage)}`
      : r.outcome === 'retreat'
        ? `🏳️ ${vi.ui.stageRetreatTitle}`
        : `🔥 ${vi.ui.stageLostTitle}`;
  const won = r.outcome === 'win';
  return `<div class="modal">
    <h2>${title}</h2>
    <div class="result-rows">
      <div>${esc(vi.stages[r.stage - 1].name)}</div>
      <div>${vi.ui.raidKilled(r.killed, r.total)}</div>
      <div>${vi.ui.raidLostTroops}: ${lost}</div>
      ${won ? `<div>${r.first ? vi.ui.firstReward : vi.ui.replayReward}: ${costHtml(null, r.reward)}</div>` : ''}
      ${r.gift ? `<div>${vi.ui.giftWon}: ${vi.gifts[r.gift].icon} ${esc(vi.gifts[r.gift].name)}</div>` : ''}
    </div>
    <div class="actions">
      <button class="btn ghost" data-act="fieldToMap">${vi.ui.toMap}</button>
      <button class="btn bronze" data-act="leaveField">${vi.ui.toCity}</button>
    </div>
  </div>`;
}
