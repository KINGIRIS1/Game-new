// Giao diện phó bản: bản đồ đường tới núi Trâu (chương 1), đường lên núi Tản Viên (chương 2)
// và đường giữ thành Cổ Loa (chương 3),
// thẻ màn, bảng xếp quân và bảng kết quả trận.
// Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import type { HeroSetup } from '../game/battle';
import { CH2_LAST, canStartStage, chapterStages, stageDef, stageOpen, stageReward } from '../game/campaign';
import { CH3_LAST } from '../game/coLoa';
import { BOSSES, ROWS, UNITS, UNIT_TYPES, type Chapter, type EnemyType, type Row, type UnitType } from '../game/defs';
import { armySpace, fieldCap, fitArmy } from '../game/doanhTrai';
import type { GameState, StageResult } from '../game/game';
import { giftOfStage, heroFor, restingHero } from '../game/son';
import { vi } from '../text/vi';
import { costHtml, esc } from './format';

/** Lựa chọn trên bảng xếp quân: số lính mang theo và hàng đứng của từng binh chủng. */
export interface ArmyPick {
  army: Record<UnitType, number>;
  rows: Record<UnitType, Row>;
}

/**
 * Vị trí các màn trên bản đồ (hệ tọa độ 100 × 160), đi từ Phong Châu ở dưới lên núi ở trên.
 * Chương 1 lên núi Trâu, chương 2 lên núi Tản Viên ba đỉnh. Chương 3 lên núi Thất Diệu rồi quay về giữ thành Cổ Loa.
 */
const NODES: Record<Chapter, [number, number][]> = {
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
  3: [
    [32, 138],
    [16, 112],
    [25, 84],
    [52, 96],
    [80, 88],
    [86, 58],
    [60, 44],
    [72, 24],
  ],
  // Chương 4: xuôi sông từ thành Cổ Loa ra cửa sông (màn 25–28), quay về giữ thành (29–31), rồi theo dải lông ngỗng
  // về phương Nam ra biển Mộ Dạ (màn 32).
  4: [
    [40, 136],
    [70, 124],
    [84, 102],
    [88, 78],
    [52, 92],
    [24, 80],
    [36, 58],
    [56, 22],
  ],
};
const START: [number, number] = [12, 154];

/** Núi, sông và tên đất vẽ sau đường đi, khác nhau ở mỗi chương. */
const SCENERY: Record<Chapter, string> = {
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
  3: `<path class="mtn far" d="M0 92 L7 76 L14 92 Z M8 86 L14 72 L20 86 Z M22 84 L28 70 L34 84 Z M30 92 L37 76 L44 92 Z"/>
    <path class="mtn" d="M4 100 L13 82 L22 100 Z M16 98 L25 74 L34 98 Z M28 100 L36 84 L44 100 Z"/>
    <text class="label" x="22" y="66">Núi Thất Diệu</text>
    <path class="mtn far" d="M74 66 L86 46 L98 66 Z"/>
    <text class="label" x="88" y="43">Tiên Du</text>
    <ellipse class="citadel" cx="72" cy="24" rx="22" ry="11"/>
    <ellipse class="citadel" cx="72" cy="24" rx="15" ry="7.5"/>
    <ellipse class="citadel" cx="72" cy="24" rx="8" ry="4"/>
    <text class="label" x="72" y="9">Thành Cổ Loa</text>
    <path class="river" d="M-2 128 C 20 118, 44 136, 70 122 S 96 112, 104 118"/>
    <path class="river" d="M48 74 C 60 80, 74 66, 88 72 S 100 74, 104 72"/>
    <text class="label" x="62" y="69">Sông Đuống</text>`,
  4: `<path class="flood" d="M-2 0 L104 0 L104 12 C 80 18, 60 8, 40 14 S 6 16, -2 12 Z"/>
    <text class="label" x="22" y="9">Biển Mộ Dạ</text>
    <path class="mtn" d="M66 26 L76 10 L86 26 Z"/>
    <text class="label" x="84" y="32">Núi Mộ Dạ</text>
    <path class="river" d="M-2 126 C 24 120, 50 134, 72 120 S 92 96, 90 70 S 98 40, 104 30"/>
    <ellipse class="citadel" cx="30" cy="96" rx="16" ry="8"/>
    <ellipse class="citadel" cx="30" cy="96" rx="10.5" ry="5.3"/>
    <ellipse class="citadel" cx="30" cy="96" rx="5.5" ry="2.8"/>
    <text class="label" x="30" y="84">Thành Cổ Loa</text>
    <path class="feather" d="M36 58 C 40 48, 48 40, 54 26"/>
    <text class="label" x="96" y="66">Cửa sông</text>`,
};

export const hasBoss = (n: number) => BOSSES.some((k) => (stageDef(n)?.enemies[k] ?? 0) > 0);

/** Biểu tượng trùm trên bản đồ: chính tên trùm của màn ấy. */
function bossIcon(n: number): string {
  const boss = BOSSES.find((k) => (stageDef(n)?.enemies[k] ?? 0) > 0);
  if (!boss) return '';
  return stageDef(n)!.chapter === 1 ? '👹' : vi.enemyIcons[boss];
}

export function mapHtml(state: GameState, selected: number | null, chapter: Chapter = 1): string {
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
      ${hasBoss(n) ? `<text class="boss" y="${-r - 1.5}">${bossIcon(n)}</text>` : ''}
      ${gift && !state.son.gifts[gift] ? `<text class="boss" y="${-r - 1.5}">${vi.gifts[gift].icon}</text>` : ''}
    </g>`;
  }).join('');
  const title = chapter === 3 ? vi.ui.campaignTitle3 : chapter === 2 ? vi.ui.campaignTitle2 : vi.ui.campaignTitle;
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
  if (hero.kind === 'anDuong') return `<p class="hero-note">🏹 ${vi.ui.advJoins}</p>`;
  if (hero.kind === 'sonTinh') return `<p class="hero-note">⛰️ ${hero.glow ? vi.ui.sonHienLinhJoins : vi.ui.sonJoins}</p>`;
  return `<p class="hero-note">🐎 ${hero.glow ? vi.ui.giongHienLinhJoins : vi.ui.giongJoins}</p>`;
}

/** Đền Phù Đổng đã dựng mà đang hư: quân ta mất phần cộng thêm của đền. */
const templeDamaged = (state: GameState) => state.buildings.some((b) => b.type === 'denPhuDong' && b.damaged);

/**
 * Lời báo đỏ trước khi xuất quân: tướng lẽ ra ra trận đang kiệt sức (ai ra thay, hay không có tướng),
 * Đền Phù Đổng đang hư.
 */
export function battleWarnings(state: GameState, chapter: Chapter): string {
  const out: string[] = [];
  const rest = restingHero(state, chapter);
  if (rest) {
    const standIn = heroFor(state, chapter);
    const tail = standIn ? vi.ui.heroStandIn(vi.ui.heroNames[standIn.kind]) : vi.ui.noHeroWarn;
    out.push(`💤 ${vi.ui.heroRestWarn(vi.ui.heroNames[rest.kind], rest.secs)} ${tail}`);
  }
  if (templeDamaged(state)) out.push(`🏮 ${vi.ui.templeDamaged}`);
  return out.map((t) => `<p class="why warn">${esc(t)}</p>`).join('');
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
    ${heroNote(heroFor(state, stageDef(n)!.chapter))}
    ${battleWarnings(state, stageDef(n)!.chapter)}
    <div class="actions">
      ${why ? `<span class="why">${esc(why)}</span>` : ''}
      <button class="btn" data-act="prepareStage" ${why ? 'disabled' : ''}>${vi.ui.prepare}</button>
    </div>
  </div>`;
}

export function armyHtml(state: GameState, pick: ArmyPick, stage: number): string {
  const hero = heroFor(state, stageDef(stage)?.chapter ?? 1);
  const owned = UNIT_TYPES.filter((k) => state.troops[k] > 0);
  const total = UNIT_TYPES.reduce((s, k) => s + pick.army[k], 0);
  const cap = fieldCap(state);
  const space = armySpace(pick.army);
  const rows = owned
    .map((k) => {
      const n = pick.army[k];
      const more = n < state.troops[k] && space + UNITS[k].space <= cap;
      return `<div class="unit-row army">
        <span class="unit-icon">${vi.units[k].icon}</span>
        <span class="unit-info"><b>${vi.units[k].name}</b><small>${vi.ui.haveTroops(state.troops[k])}</small></span>
        <button class="row-chip ${pick.rows[k]}" data-act="armyRow" data-unit="${k}">${vi.rows[pick.rows[k]]}</button>
        <button class="step" data-act="armyDelta" data-unit="${k}" data-delta="-1" ${n <= 0 ? 'disabled' : ''}>−</button>
        <b class="count">${n}</b>
        <button class="step" data-act="armyDelta" data-unit="${k}" data-delta="1" ${more ? '' : 'disabled'}>+</button>
      </div>`;
    })
    .join('');
  return `<div class="stage-card">
    <h3>${vi.ui.armyTitle}</h3>
    <p class="muted">${vi.ui.armyHint}</p>
    ${heroNote(hero)}
    ${battleWarnings(state, stageDef(stage)?.chapter ?? 1)}
    ${owned.length ? `<div class="stat"><span>${vi.ui.fieldSpace(space, cap)}</span></div><div class="units">${rows}</div>` : `<p class="why">${vi.ui.noTroops}</p>`}
    <div class="actions">
      <button class="btn ghost" data-act="backToStage">${vi.ui.back}</button>
      <button class="btn" data-act="march" ${total || hero ? '' : 'disabled'}>${vi.ui.march}</button>
    </div>
  </div>`;
}

/** Hàng kế tiếp khi chạm vào chip hàng: Tiền → Trung → Hậu → Tiền. */
export const nextRow = (r: Row): Row => ROWS[(ROWS.indexOf(r) + 1) % ROWS.length];

/**
 * Mặc định mang hết lính đang có, đứng theo hàng đã chọn lần trước. Nhiều lính hơn số chỗ một trận phó bản thì
 * chọn bớt, giữ tỉ lệ các binh chủng.
 */
export function defaultPick(state: GameState): ArmyPick {
  return { army: fitArmy(state.troops, fieldCap(state)), rows: { ...state.campaign.rows } };
}

/** Thêm hay bớt một lính binh chủng `k` mang theo, không quá số lính có và số chỗ một trận phó bản. */
export function stepPick(state: GameState, pick: ArmyPick, k: UnitType, delta: number): void {
  const n = Math.max(0, Math.min(state.troops[k], pick.army[k] + delta));
  const next = { ...pick.army, [k]: n };
  if (delta > 0 && armySpace(next) > fieldCap(state)) return;
  pick.army[k] = n;
}

export function stageResultHtml(r: StageResult): string {
  const lost = UNIT_TYPES.filter((k) => r.lost[k] > 0).map((k) => `${vi.units[k].icon} ${r.lost[k]}`).join(' ') || vi.ui.raidNone;
  const won1st = r.outcome === 'win' && r.first;
  let title: string;
  if (won1st && r.stage === CH3_LAST) title = `🐢 ${vi.ui.advWinTitle}`;
  else if (won1st && r.stage === CH2_LAST) title = `⛰️ ${vi.ui.sonWinTitle}`;
  else if (r.outcome === 'win') title = `🥁 ${vi.ui.stageWonTitle(r.stage)}`;
  else if (r.outcome === 'retreat') title = `🏳️ ${vi.ui.stageRetreatTitle}`;
  else title = `🔥 ${vi.ui.stageLostTitle}`;
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
