// Giao diện phó bản: bản đồ đường tới núi Trâu, thẻ màn, bảng xếp quân và bảng kết quả trận.
// Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { canStartStage, stageDef, stageOpen, stageReward } from '../game/campaign';
import { ROWS, UNIT_TYPES, type EnemyType, type Row, type UnitType } from '../game/defs';
import type { GameState, StageResult } from '../game/game';
import { vi } from '../text/vi';
import { costHtml, esc } from './format';

/** Lựa chọn trên bảng xếp quân: số lính mang theo và hàng đứng của từng binh chủng. */
export interface ArmyPick {
  army: Record<UnitType, number>;
  rows: Record<UnitType, Row>;
}

/** Vị trí các màn trên bản đồ (hệ tọa độ 100 × 160), đi từ Phong Châu ở dưới lên núi Trâu ở trên. */
const NODES: [number, number][] = [
  [26, 144],
  [62, 131],
  [80, 110],
  [46, 95],
  [20, 76],
  [55, 61],
  [80, 42],
  [50, 24],
];
const START: [number, number] = [12, 154];

export const hasBoss = (n: number) => !!stageDef(n)?.enemies.phoTuong;

export function mapHtml(state: GameState, selected: number | null): string {
  const road = [START, ...NODES].map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const nodes = NODES.map(([x, y], i) => {
    const n = i + 1;
    const cleared = n <= state.campaign.cleared;
    const open = !cleared && stageOpen(state, n);
    const cls = cleared ? 'cleared' : open ? 'open' : 'locked';
    const r = hasBoss(n) ? 7.5 : 6;
    const mark = cleared ? '✓' : open ? String(n) : '🔒';
    return `<g class="node ${cls} ${selected === n ? 'sel' : ''}" data-act="pickStage" data-id="${n}" transform="translate(${x} ${y})">
      <circle class="halo" r="${r + 3}"/>
      <circle class="ring" r="${r}"/>
      <circle class="core" r="${r * 0.66}"/>
      <text class="num" y="${cleared || open ? 1.8 : 1.6}">${mark}</text>
      ${hasBoss(n) ? `<text class="boss" y="${-r - 1.5}">👹</text>` : ''}
    </g>`;
  }).join('');
  return `<svg class="map" viewBox="0 0 100 160" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${vi.ui.campaignTitle}">
    <path class="mtn far" d="M8 30 L24 10 L40 30 Z M60 30 L78 8 L96 30 Z"/>
    <path class="mtn" d="M30 34 L50 4 L70 34 Z"/>
    <text class="label" x="50" y="40">Núi Trâu</text>
    <path class="river" d="M-2 122 C 20 112, 40 128, 62 118 S 92 104, 104 112"/>
    <path class="river" d="M-2 58 C 18 50, 34 66, 58 56 S 90 44, 104 50"/>
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

export function stageHtml(state: GameState, n: number): string {
  const text = vi.stages[n - 1];
  const first = n > state.campaign.cleared;
  const why = stageBlocker(state, n);
  return `<div class="stage-card">
    <h3>${vi.ui.stageN(n)} · ${esc(text.name)} ${hasBoss(n) ? `<span class="tag">👹 ${vi.ui.stageBoss}</span>` : ''}</h3>
    <p class="intro">${esc(text.intro)}</p>
    <div class="stat"><span>${vi.ui.enemyArmy}</span><b>${enemyList(n)}</b></div>
    <div class="stat"><span>${first ? vi.ui.firstReward : vi.ui.replayReward}</span>${costHtml(null, stageReward(state, n))}</div>
    <div class="actions">
      ${why ? `<span class="why">${esc(why)}</span>` : ''}
      <button class="btn" data-act="prepareStage" ${why ? 'disabled' : ''}>${vi.ui.prepare}</button>
    </div>
  </div>`;
}

export function armyHtml(state: GameState, pick: ArmyPick): string {
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
    ${owned.length ? `<div class="units">${rows}</div>` : `<p class="why">${vi.ui.noTroops}</p>`}
    <div class="actions">
      <button class="btn ghost" data-act="backToStage">${vi.ui.back}</button>
      <button class="btn" data-act="march" ${total ? '' : 'disabled'}>${vi.ui.march}</button>
    </div>
  </div>`;
}

/** Hàng kế tiếp khi chạm vào chip hàng: Tiền → Trung → Hậu → Tiền. */
export const nextRow = (r: Row): Row => ROWS[(ROWS.indexOf(r) + 1) % ROWS.length];

/** Mặc định mang hết lính đang có, đứng theo hàng đã chọn lần trước. */
export function defaultPick(state: GameState): ArmyPick {
  return { army: { ...state.troops }, rows: { ...state.campaign.rows } };
}

export function stageResultHtml(r: StageResult): string {
  const lost = UNIT_TYPES.filter((k) => r.lost[k] > 0).map((k) => `${vi.units[k].icon} ${r.lost[k]}`).join(' ') || vi.ui.raidNone;
  const title =
    r.outcome === 'win' ? `🥁 ${vi.ui.stageWonTitle(r.stage)}` : r.outcome === 'retreat' ? `🏳️ ${vi.ui.stageRetreatTitle}` : `🔥 ${vi.ui.stageLostTitle}`;
  const won = r.outcome === 'win';
  return `<div class="modal">
    <h2>${title}</h2>
    <div class="result-rows">
      <div>${esc(vi.stages[r.stage - 1].name)}</div>
      <div>${vi.ui.raidKilled(r.killed, r.total)}</div>
      <div>${vi.ui.raidLostTroops}: ${lost}</div>
      ${won ? `<div>${r.first ? vi.ui.firstReward : vi.ui.replayReward}: ${costHtml(null, r.reward)}</div>` : ''}
    </div>
    <div class="actions">
      <button class="btn ghost" data-act="fieldToMap">${vi.ui.toMap}</button>
      <button class="btn bronze" data-act="leaveField">${vi.ui.toCity}</button>
    </div>
  </div>`;
}
