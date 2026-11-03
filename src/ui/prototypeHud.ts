// PROTOTYPE, DÙNG XONG BỎ. Không gộp vào main.
//
// Câu hỏi: khung giao diện trong game (tài nguyên, nhiệm vụ Lạc hầu, thông báo, nút chính, bảng trượt)
// nên trông thế nào trên điện thoại?
// Kế hoạch: ba biến thể khác nhau về bố cục, cộng bản gốc để so, trên chính màn hình chơi,
// chuyển bằng `?variant=A|B|C|goc` và thanh nổi ở đáy màn hình (`prototypeSwitcher.ts`).
//   A. Góc màn hình: dải tài nguyên một hàng, cột nút tròn hai bên, nút Xây dựng tròn ở góc phải dưới.
//   B. Dock dưới: dải tài nguyên mỏng sát mép trên, thanh thẻ năm nút ở đáy cho một tay bấm, một dòng tin chạy.
//   C. Cột bên: hai cột như thẻ tre hai mép, bảng mở từ bên phải, nhiệm vụ là dải lụa ở đáy.
// Nội dung trong bảng (Xây dựng, công trình...) giữ nguyên; chỉ khung bên ngoài và chỗ đặt bảng thay đổi.
// Chỉ bật ở `npm run dev` hay bản dựng có VITE_PROTOTYPE_HUD=1. Chữ hiển thị viết thẳng ở đây (không qua vi.ts) vì là bản nháp.

import './prototypeHud.css';
import { alliesLeft, enemiesLeft, skillReady, type Battle } from '../game/battle';
import { advJoined, advLook, advResting, wallRings } from '../game/coLoa';
import { caoLoJoined, caoLoResting } from '../game/caoLo';
import { BUILDINGS, RINGS_NEEDED, type ResourceId, type SkillId } from '../game/defs';
import {
  countOf,
  currentQuest,
  dienLevel,
  findBuilding,
  freeDan,
  housing,
  isStarving,
  netPerMinute,
  nextFloodLevel,
  questDone,
  questProgress,
  storageCap,
  troopCap,
  troopSpace,
  type GameState,
} from '../game/game';
import { giongLook, giongReady, giongResting } from '../game/giong';
import { giftCount, sonJoined, sonLook, sonResting } from '../game/son';
import { tetOpen } from '../game/tet';
import { vi } from '../text/vi';
import { costHtml, esc, fmt } from './format';
import type { Hud, HudAction, HudMode } from './hud';
import { mountPrototypeSwitcher } from './prototypeSwitcher';

export const PROTOTYPE_HUD = import.meta.env.DEV || import.meta.env.VITE_PROTOTYPE_HUD === '1';

// ---------- Dữ liệu chung cho mọi biến thể (đọc từ state, không đổi state) ----------

interface Res {
  id: ResourceId;
  icon: string;
  name: string;
  v: number;
  cap: number;
  rate: number;
}

/** Nút tròn nhỏ: tướng, đồng hồ Tết, trinh sát, thuyền buôn. */
interface Pin {
  act?: string;
  icon: string;
  mark: string;
  title: string;
}

interface Alert {
  icon: string;
  text: string;
  tone: 'bad' | 'tet' | 'info';
  act?: string;
  actLabel?: string;
}

interface Model {
  dien: number;
  res: Res[];
  dan: { n: number; room: number; free: number };
  army: { space: number; cap: number } | null;
  heroes: Pin[];
  timers: Pin[];
  alerts: Alert[];
  /** Nút kỹ năng khi giặc đang đánh kinh đô. */
  skills: string;
  quest: { text: string; have: number; need: number; reward: string; done: boolean; over: boolean; ending: boolean };
  campaignReady: boolean;
}

const secsTo = (at: number, clock: number) => Math.max(0, Math.ceil((at - clock) / 1000));
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Số gọn: 6.145 · 49,1k · 1,2tr (đủ chỗ trên dải hẹp). `tight` thì gọn cả từ 1.000. */
function short(n: number, tight = false): string {
  const v = Math.floor(n);
  const one = (x: number) => x.toLocaleString('vi-VN', { maximumFractionDigits: x < 100 ? 1 : 0, minimumFractionDigits: x < 100 ? 1 : 0 });
  if (v >= 1e6) return `${one(v / 1e6)}tr`;
  if (v >= (tight ? 1000 : 10000)) return `${one(v / 1000)}k`;
  return fmt(v);
}

function skillButton(b: Battle, k: SkillId): string {
  const cd = Math.ceil(b.skillCd[k] ?? 0);
  const label = cd > 0 && !b.outcome ? `${vi.skills[k].icon} ${cd}s` : `${vi.skills[k].icon} ${vi.skills[k].name}`;
  return `<button class="btn bronze skill small" data-act="useSkill" data-skill="${k}" ${skillReady(b, k) ? '' : 'disabled'}>${label}</button>`;
}

function collect(state: GameState): Model {
  const store = storageCap(state);
  const rate = netPerMinute(state);
  const ids: ResourceId[] = ['gao', 'voOc', 'datDa', 'sat'];
  if (dienLevel(state) >= BUILDINGS.xuongMoc.minDien || state.resources.go > 0) ids.push('go');
  const res = ids.map((id) => ({ id, icon: vi.resources[id].icon, name: vi.resources[id].name, v: state.resources[id], cap: store, rate: Math.round(rate[id]) }));

  const heroes: Pin[] = [];
  const look = giongLook(state);
  if (look) heroes.push({ act: 'openGiong', icon: vi.giongLooks[look].icon, mark: giongReady(state) ? (giongResting(state) ? '💤' : '⚔️') : `${state.giong.fed}/5`, title: vi.ui.giong });
  else if (state.giong.ascended && giongResting(state)) heroes.push({ act: 'openGiong', icon: '🐎', mark: '💤', title: vi.ui.giong });
  const sLook = sonLook(state);
  if (sLook) heroes.push({ act: 'openSon', icon: vi.sonLooks[sLook].icon, mark: sonJoined(state) ? (sonResting(state) ? '💤' : '⚔️') : `${giftCount(state)}/5`, title: vi.ui.son });
  else if (state.son.won && sonResting(state)) heroes.push({ act: 'openSon', icon: '⛰️', mark: '💤', title: vi.ui.son });
  const aLook = advLook(state);
  if (aLook) {
    const mark = advJoined(state) ? (advResting(state) ? '💤' : '⚔️') : `${Math.min(wallRings(state), RINGS_NEEDED)}/${RINGS_NEEDED}`;
    heroes.push({ act: 'openAdv', icon: vi.advLooks[aLook].icon, mark, title: vi.ui.adv });
  } else if (state.adv.bien && advResting(state)) heroes.push({ act: 'openAdv', icon: '🏹', mark: '💤', title: vi.ui.adv });
  if (caoLoJoined(state)) heroes.push({ act: 'openCaoLo', icon: '🎯', mark: caoLoResting(state) ? '💤' : '⚔️', title: vi.ui.caoLo });

  const timers: Pin[] = [];
  const visit = state.merchant.visit;
  if (visit) timers.push({ act: 'openMerchant', icon: '⛵', mark: `${secsTo(visit.leavesAt, state.clock)}s`, title: vi.ui.merchantOpen });
  if (tetOpen(state)) timers.push({ act: 'openTet', icon: '🎋', mark: mmss(secsTo(state.tet.openUntil, state.clock)), title: vi.ui.tet });
  if (state.benKia.scouts.length) {
    timers.push({ icon: '🧭', mark: `${secsTo(Math.min(...state.benKia.scouts.map((sc) => sc.at)), state.clock)}s`, title: vi.benKia.scoutChip });
  }

  const alerts: Alert[] = [];
  let skills = '';
  const raid = state.raid;
  const sideName = { bac: vi.ui.sideBac, tay: vi.ui.sideTay, nam: vi.ui.sideNam, dong: vi.ui.sideDong, namXa: vi.ui.sideNamXa, dongXa: vi.ui.sideDongXa }[raid.side];
  if (raid.phase === 'warning') {
    const secs = secsTo(raid.startsAt, state.clock);
    if (raid.foe === 'thuy') alerts.push({ icon: '🌧️', text: vi.ui.floodWarning(sideName, secs, nextFloodLevel(state)), tone: 'bad', act: 'lookRaid', actLabel: vi.ui.floodLook });
    else {
      const [icon, text] =
        raid.foe === 'yeu'
          ? ['🌙', vi.ui.yeuWarning(sideName, secs)]
          : raid.foe === 'trieu'
            ? ['⚠️', vi.ui.trieuWarning(sideName, secs)]
            : raid.foe === 'thuyBinh'
              ? ['⛵', vi.ui.thuyBinhWarning(sideName, secs)]
              : ['⚠️', vi.ui.raidWarning(sideName, secs)];
      alerts.push({ icon, text, tone: 'bad', act: 'lookRaid', actLabel: vi.ui.raidLook });
    }
  }
  if (raid.phase === 'battle' && raid.battle) {
    const b = raid.battle;
    const left = enemiesLeft(b);
    const ours = alliesLeft(b);
    const [icon, text] =
      b.floodTo > 0
        ? ['🌊', vi.ui.floodBattle(Math.floor(b.water * 10) / 10, b.floodTo, left, ours)]
        : b.foe === 'yeu'
          ? ['🌙', vi.ui.yeuBattle(left, ours)]
          : b.foe === 'trieu'
            ? ['⚔️', vi.ui.trieuBattle(left, ours)]
            : b.foe === 'thuyBinh'
              ? ['⛵', vi.ui.thuyBinhBattle(left, ours)]
              : ['⚔️', vi.ui.raidBattle(left, ours)];
    alerts.push({ icon, text, tone: 'bad' });
    const stolen = b.hero?.layTrao ? `<button class="btn bronze skill small" disabled>${vi.skills.noThan.icon} ${vi.ui.layTrao}</button>` : '';
    skills = stolen + b.skills.map((k) => skillButton(b, k)).join('');
  }
  if (isStarving(state)) alerts.push({ icon: '🍚', text: vi.ui.starving, tone: 'bad' });
  if (tetOpen(state) && !(state.tet.offered.chung && state.tet.offered.giay)) {
    alerts.push({ icon: '🎋', text: vi.ui.tetBanner(secsTo(state.tet.openUntil, state.clock)), tone: 'tet', act: 'openTet', actLabel: vi.ui.tetOfferBtn });
  }
  if (visit) alerts.push({ icon: '⛵', text: vi.ui.merchantHere(secsTo(visit.leavesAt, state.clock)), tone: 'info', act: 'openMerchant', actLabel: vi.ui.merchantOpen });

  const q = currentQuest(state);
  const p = questProgress(state);
  const quest =
    q && p
      ? { text: vi.quests[q.id], have: p.have, need: p.need, reward: costHtml(null, q.reward), done: questDone(state), over: false, ending: false }
      : { text: vi.quests.allDone, have: 0, need: 0, reward: '', done: false, over: true, ending: state.story.seen.includes('hetTruyen') };

  const cap = troopCap(state);
  return {
    dien: dienLevel(state),
    res,
    dan: { n: state.dan, room: housing(state), free: freeDan(state) },
    army: cap ? { space: troopSpace(state), cap } : null,
    heroes,
    timers,
    alerts,
    skills,
    quest,
    campaignReady: countOf(state, 'doanhTrai') > 0,
  };
}

// ---------- Mảnh giao diện dùng chung ----------

/** Bảng chi tiết tài nguyên: số chính xác, sức chứa, thu chi mỗi phút. */
function resTable(m: Model): string {
  const rows = m.res
    .map((r) => {
      const full = r.v >= r.cap;
      return `<tr><td>${r.icon} ${r.name}</td><td class="${full ? 'full' : ''}"><b>${fmt(r.v)}</b><small>/${fmt(r.cap)}</small></td>
        <td class="${r.rate < 0 ? 'neg' : 'pos'}">${r.rate < 0 ? '−' + fmt(-r.rate) : '+' + fmt(r.rate)}${vi.ui.perMinute}</td></tr>`;
    })
    .join('');
  const dan = `<tr><td>👥 Dân</td><td><b>${m.dan.n}</b><small>/${m.dan.room}</small></td><td class="pos">${m.dan.free} rảnh</td></tr>`;
  const army = m.army ? `<tr><td>⚔️ Quân</td><td><b>${m.army.space}</b><small>/${m.army.cap}</small></td><td></td></tr>` : '';
  return `<table class="proto-res">${rows}${dan}${army}</table>`;
}

function questCard(m: Model): string {
  const q = m.quest;
  if (q.over) {
    return `<div class="proto-quest-card"><h4>📜 ${vi.ui.lacHau}</h4><p>${esc(q.text)}</p>
      ${q.ending ? `<button class="btn small ghost" data-act="openEnding">${vi.ui.endingOpen}</button>` : ''}</div>`;
  }
  return `<div class="proto-quest-card ${q.done ? 'ready' : ''}"><h4>📜 ${vi.ui.lacHau}</h4><p>${esc(q.text)}</p>
    <div class="foot"><b>${q.have}/${q.need}</b><span class="reward">${vi.ui.reward}: ${q.reward}</span>
    ${q.done ? `<button class="btn small bronze" data-act="claimQuest">${vi.ui.claim}</button>` : ''}</div></div>`;
}

const fill = (r: Res) => Math.min(100, Math.round((r.v / r.cap) * 100));

/** Trạng thái giao diện riêng của prototype: ô bật lên nào đang mở, bảng nào đang mở. */
interface Ui {
  pop: string | null;
  sheet: string | null;
  campaignOpen: boolean;
  alertIndex: number;
}

interface Variant {
  key: string;
  name: string;
  /** Khung HTML của biến thể; mỗi phần tử có `data-slot` được vẽ lại riêng. */
  shell: string;
  render(m: Model, ui: Ui): Record<string, string>;
}

// ---------- A. Góc màn hình ----------

export const VariantA: Variant = {
  key: 'A',
  name: 'Góc màn hình',
  shell: `<div class="pa-top" data-slot="top"></div>
    <div class="pa-alert" data-slot="alert"></div>
    <div class="pa-left" data-slot="left"></div>
    <div class="pa-right" data-slot="right"></div>
    <div class="pa-pop" data-slot="pop"></div>
    <div class="pa-skills" data-slot="skills"></div>
    <div class="pa-bottom" data-slot="bottom"></div>`,
  render(m, ui) {
    const top = `<div class="pa-dien" title="Điện Vua Hùng">🏯<b>${m.dien}</b></div>
      <button class="pa-strip ${ui.pop === 'res' ? 'on' : ''}" data-pact="res">${m.res
        .map((r) => `<span class="pa-res ${r.v >= r.cap ? 'full' : ''}"><em>${r.icon}</em><b>${short(r.v)}</b><i style="width:${fill(r) * 0.8}%"></i></span>`)
        .join('')}</button>`;
    const bad = m.alerts.filter((a) => a.tone === 'bad');
    const alert = bad
      .map((a) => `<div class="pa-ribbon">${a.icon} <span>${a.text}</span>${a.act ? `<button class="btn small" data-act="${a.act}">${a.actLabel}</button>` : ''}</div>`)
      .join('');
    const q = m.quest;
    const questBtn = `<button class="pa-round pa-q ${q.done ? 'ready' : ''} ${ui.pop === 'quest' ? 'on' : ''}" data-pact="quest" title="${vi.ui.lacHau}">📜
      <small>${q.done ? '!' : q.over ? '✓' : `${q.have}/${q.need}`}</small></button>`;
    const pin = (p: Pin) =>
      `<button class="pa-round" ${p.act ? `data-act="${p.act}"` : 'disabled'} title="${p.title}">${p.icon}<small>${p.mark}</small></button>`;
    const left = questBtn + m.timers.map(pin).join('') + `<button class="pa-round gear" data-act="openSettings" title="${vi.ui.settings}">⚙️</button>`;
    const right =
      `<button class="pa-round ${m.dan.free > 0 ? 'idle' : ''}" data-act="danInfo" title="Dân">👥<small>${m.dan.free > 0 ? `${m.dan.free} rảnh` : m.dan.n}</small></button>` +
      (m.army ? `<button class="pa-round" data-act="openBarracks" title="Quân">⚔️<small>${m.army.space}/${m.army.cap}</small></button>` : '') +
      m.heroes.map(pin).join('');
    const pop = ui.pop === 'quest' ? `<div class="pa-bubble pa-bq">${questCard(m)}</div>` : ui.pop === 'res' ? `<div class="pa-bubble res">${resTable(m)}</div>` : '';
    const bottom = `${m.campaignReady ? `<button class="pa-fab camp" data-act="openCampaign">⚔️<span>${vi.ui.campaign}</span></button>` : '<span></span>'}
      <span class="pa-gap"></span>
      <button class="pa-fab small" data-act="rotateView" aria-label="${vi.ui.rotate}">⟳</button>
      <button class="pa-fab build" data-act="openBuild">🔨<span>${vi.ui.build}</span></button>`;
    return { top, alert, left, right, pop, skills: m.skills, bottom };
  },
};

// ---------- B. Dock dưới ----------

export const VariantB: Variant = {
  key: 'B',
  name: 'Dock dưới',
  shell: `<div class="pb-band" data-slot="band"></div>
    <div class="pb-skills" data-slot="skills"></div>
    <div class="pb-ticker" data-slot="ticker"></div>
    <div class="pb-pop" data-slot="pop"></div>
    <nav class="pb-dock" data-slot="dock"></nav>`,
  render(m, ui) {
    const band = `<button class="pb-strip ${ui.pop === 'res' ? 'on' : ''}" data-pact="res">
        <span class="pb-dien">🏯${m.dien}</span>
        ${m.res.map((r) => `<span class="pb-res ${r.v >= r.cap ? 'full' : ''}">${r.icon}<b>${short(r.v, true)}</b></span>`).join('')}
        <span class="pb-res ${m.dan.free > 0 ? 'idle' : ''}">👥<b>${m.dan.n}</b></span>
        <span class="pb-more">${ui.pop === 'res' ? '▴' : '▾'}</span>
      </button>
      <button class="pb-gear" data-act="openSettings" aria-label="${vi.ui.settings}">⚙️</button>`;
    const timers = m.timers.filter((t) => t.act !== 'openMerchant');
    let pop = '';
    if (ui.pop === 'res') pop = `<div class="pb-drop">${resTable(m)}</div>`;
    else if (ui.pop === 'quest') pop = `<div class="pb-up">${questCard(m)}</div>`;
    else if (ui.pop === 'heroes') {
      // Thuyền buôn đã có ở dòng tin; ở đây chỉ còn tướng và đồng hồ Tết, trinh sát.
      pop = `<div class="pb-up heroes"><h4>🎖️ Tướng</h4>${m.heroes
        .map((h) => `<button class="pb-hero" data-act="${h.act}"><span>${h.icon}</span><b>${h.title}</b><small>${h.mark}</small></button>`)
        .join('')}${timers.map((t) => `<${t.act ? `button data-act="${t.act}"` : 'div'} class="pb-hero timer"><span>${t.icon}</span><b>${t.title}</b><small>${t.mark}</small></${t.act ? 'button' : 'div'}>`).join('')}</div>`;
    }
    let ticker = '';
    if (m.alerts.length) {
      const i = ui.alertIndex % m.alerts.length;
      const a = m.alerts[i];
      ticker = `<div class="pb-tick ${a.tone}"><span class="ic">${a.icon}</span><span class="tx">${a.text}</span>
        ${a.act ? `<button class="btn small ${a.tone === 'bad' ? '' : 'bronze'}" data-act="${a.act}">${a.actLabel}</button>` : ''}
        ${m.alerts.length > 1 ? `<button class="pb-next" data-pact="next">${i + 1}/${m.alerts.length} ›</button>` : ''}</div>`;
    }
    const tab = (on: boolean, attrs: string, icon: string, label: string, badge = '', off = false, main = false) =>
      `<button class="pb-tab ${on ? 'on' : ''} ${main ? 'main' : ''}" ${attrs} ${off ? 'disabled' : ''}><span class="ic">${icon}${badge}</span><span class="lb">${label}</span></button>`;
    const q = m.quest;
    const qBadge = q.done ? '<i class="badge hot">!</i>' : q.over ? '' : `<i class="badge">${q.have}/${q.need}</i>`;
    const armyBadge = m.army ? `<i class="badge">${m.army.space}/${m.army.cap}</i>` : '';
    // Chấm đỏ khi có tướng sẵn sàng ra trận.
    const heroBadge = m.heroes.some((h) => h.mark === '⚔️') ? '<i class="badge hot">⚔️</i>' : '';
    // Xây dựng nổi tròn ở giữa: việc làm nhiều nhất, ngón cái với tới dễ nhất.
    const dock =
      tab(ui.sheet === 'barracks', 'data-act="openBarracks"', '⚔️', 'Quân', armyBadge, !m.army) +
      tab(ui.campaignOpen, 'data-act="openCampaign"', '🗺️', vi.ui.campaign, '', !m.campaignReady) +
      tab(ui.sheet === 'build', 'data-act="openBuild"', '🔨', vi.ui.build, '', false, true) +
      tab(ui.pop === 'heroes', 'data-pact="heroes"', '🎖️', 'Tướng', heroBadge, !m.heroes.length && !timers.length) +
      tab(ui.pop === 'quest', 'data-pact="quest"', '📜', vi.ui.lacHau, qBadge) +
      `<button class="pb-rotate" data-act="rotateView" aria-label="${vi.ui.rotate}">⟳</button>`;
    return { band, pop, skills: m.skills, ticker, dock };
  },
};

// ---------- C. Cột bên ----------

export const VariantC: Variant = {
  key: 'C',
  name: 'Cột bên',
  shell: `<aside class="pc-left" data-slot="left"></aside>
    <aside class="pc-right" data-slot="right"></aside>
    <div class="pc-notes" data-slot="notes"></div>
    <div class="pc-skills" data-slot="skills"></div>
    <div class="pc-quest" data-slot="quest"></div>
    <div class="pc-act" data-slot="act"></div>`,
  render(m, ui) {
    const left = `<div class="pc-dien">🏯<b>${m.dien}</b></div>
      ${m.res
        .map(
          (r) => `<div class="pc-res ${r.v >= r.cap ? 'full' : ''}" title="${r.name}"><i style="height:${fill(r)}%"></i>
        <em>${r.icon}</em><b>${short(r.v)}</b><small class="${r.rate < 0 ? 'neg' : ''}">${r.rate < 0 ? '−' + short(-r.rate) : '+' + short(r.rate)}</small></div>`,
        )
        .join('')}
      <button class="pc-res people ${m.dan.free > 0 ? 'idle' : ''}" data-act="danInfo"><em>👥</em><b>${m.dan.n}</b><small>${m.dan.free > 0 ? `${m.dan.free} rảnh` : `/${m.dan.room}`}</small></button>
      ${m.army ? `<button class="pc-res people" data-act="openBarracks"><em>⚔️</em><b>${m.army.space}</b><small>/${m.army.cap}</small></button>` : ''}`;
    const pin = (p: Pin) => `<button class="pc-pin" ${p.act ? `data-act="${p.act}"` : 'disabled'} title="${p.title}">${p.icon}<small>${p.mark}</small></button>`;
    const right = `<button class="pc-pin" data-act="openSettings" aria-label="${vi.ui.settings}">⚙️</button>${m.heroes.map(pin).join('')}${m.timers.map(pin).join('')}`;
    const notes = m.alerts
      .map(
        (a) => `<div class="pc-note ${a.tone}"><span class="tx">${a.icon} ${a.text}</span>${a.act ? `<button class="btn small ${a.tone === 'bad' ? '' : 'bronze'}" data-act="${a.act}">${a.actLabel}</button>` : ''}</div>`,
      )
      .join('');
    const q = m.quest;
    const open = ui.pop === 'quest';
    const quest = open
      ? `<div class="pc-scroll open">${questCard(m)}<button class="pc-fold" data-pact="quest">▾ Thu gọn</button></div>`
      : `<button class="pc-scroll ${q.done ? 'ready' : ''}" data-pact="quest"><span class="tx">📜 ${esc(q.text)}</span>
          <b>${q.done ? 'Nhận thưởng' : q.over ? '' : `${q.have}/${q.need}`}</b></button>`;
    const act = `<button class="pc-btn small" data-act="rotateView" aria-label="${vi.ui.rotate}">⟳</button>
      ${m.campaignReady ? `<button class="pc-btn camp" data-act="openCampaign">⚔️<span>${vi.ui.campaign}</span></button>` : ''}
      <button class="pc-btn build" data-act="openBuild">🔨<span>${vi.ui.build}</span></button>`;
    return { left, right, notes, skills: m.skills, quest, act };
  },
};

const GOC = { key: 'goc', name: 'Gốc (hiện tại)' };
const VARIANTS: Variant[] = [VariantA, VariantB, VariantC];
const ALL = [...VARIANTS, GOC];

// ---------- Lắp vào Hud ----------

/** Lắp prototype lên Hud đang chạy: thay phần vẽ thanh trên, thông báo, nhiệm vụ, thanh dưới; bảng trượt giữ nguyên. */
export function installHudPrototype(hud: Hud, root: HTMLElement, handle: (a: HudAction) => void, getState: () => GameState): void {
  if (!PROTOTYPE_HUD) return;
  // `?variant=B`, hay `#B` (link artifact chỉ giữ được phần sau dấu #).
  const param = new URLSearchParams(location.search).get('variant') ?? (location.hash.slice(1) || 'A');
  let current = ALL.find((v) => v.key.toLowerCase() === param.toLowerCase()) ?? VariantA;
  const ui: Ui = { pop: null, sheet: null, campaignOpen: false, alertIndex: 0 };
  const box = document.createElement('div');
  box.className = 'proto-ui';
  // Đặt đầu tiên để bảng trượt, phó bản, hộp thoại của game vẽ đè lên trên.
  root.prepend(box);
  let slots: Record<string, string> = {};

  const orig = {
    updateTop: hud.updateTop.bind(hud),
    updateBanners: hud.updateBanners.bind(hud),
    updateQuest: hud.updateQuest.bind(hud),
    setMode: hud.setMode.bind(hud),
  };
  const variant = () => (current.key === 'goc' ? null : (current as Variant));

  const draw = () => {
    const v = variant();
    if (!v) return;
    const state = getState();
    const sheet = hud.openSheet;
    ui.sheet = !sheet ? null : sheet.kind === 'building' && findBuilding(state, sheet.id)?.type === 'doanhTrai' ? 'barracks' : sheet.kind;
    ui.campaignOpen = !root.querySelector<HTMLElement>('.campaign')!.hidden;
    const out = v.render(collect(state), ui);
    for (const [k, html] of Object.entries(out)) {
      if (slots[k] === html) continue;
      slots[k] = html;
      const el = box.querySelector<HTMLElement>(`[data-slot="${k}"]`);
      if (el) el.innerHTML = html;
    }
  };

  const apply = () => {
    for (const v of ALL) root.classList.toggle(`proto-${v.key}`, v === current);
    root.classList.toggle('proto-on', current.key !== 'goc');
    const v = variant();
    box.innerHTML = v ? v.shell : '';
    slots = {};
    ui.pop = null;
    try {
      const url = new URL(location.href);
      url.searchParams.set('variant', current.key);
      url.hash = current.key;
      history.replaceState(null, '', url);
    } catch {
      // Khung nhúng không cho đổi địa chỉ: vẫn đổi biến thể, chỉ không nhớ khi tải lại.
    }
    // Vẽ lại phần gốc cho đúng khi quay về Gốc.
    const state = getState();
    orig.updateTop(state);
    orig.updateBanners(state);
    orig.updateQuest(state);
    draw();
    switcher.set(current.key, current.name);
  };

  hud.updateTop = (state) => {
    orig.updateTop(state);
    draw();
  };
  hud.updateBanners = (state) => (variant() ? undefined : orig.updateBanners(state));
  hud.updateQuest = (state) => (variant() ? undefined : orig.updateQuest(state));
  hud.setMode = (mode: HudMode, placeValid?: boolean, hint?: string) => {
    orig.setMode(mode, placeValid, hint);
    root.classList.toggle('proto-placing', mode !== 'view');
  };
  // Bảng mở hay đóng thì vẽ lại thẻ đang sáng (dock B).
  const observer = new MutationObserver(() => draw());
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  observer.observe(root.querySelector('.campaign')!, { attributes: true, attributeFilter: ['hidden'] });

  // Nút riêng của prototype (mở ô bật lên) dùng data-pact để không lẫn với hành động của game.
  box.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-pact]');
    if (el) {
      const p = el.dataset.pact!;
      if (p === 'next') ui.alertIndex++;
      else ui.pop = ui.pop === p ? null : p;
      return draw();
    }
    // Bấm một hành động của game trong ô bật lên thì đóng ô ấy.
    if ((e.target as HTMLElement).closest('[data-act]') && ui.pop && ui.pop !== 'res') {
      ui.pop = null;
      draw();
    }
  });
  // Chạm ra ngoài (kể cả cảnh 3D) thì đóng ô bật lên.
  document.addEventListener('pointerdown', (e) => {
    if (!ui.pop) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-pact]') || t.closest('.pa-bubble, .pb-drop, .pb-up, .pc-scroll')) return;
    ui.pop = null;
    draw();
  });

  const switcher = mountPrototypeSwitcher({
    variants: ALL.map((v) => ({ key: v.key, name: v.name })),
    current: current.key,
    onChange: (key) => {
      current = ALL.find((v) => v.key === key)!;
      apply();
    },
    getState,
    handle,
  });
  apply();
}
