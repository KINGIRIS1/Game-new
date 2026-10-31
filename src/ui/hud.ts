// Giao diện HTML đặt đè lên cảnh 3D: thanh tài nguyên, nhiệm vụ, bảng xây dựng, bảng công trình, cài đặt,
// bản đồ phó bản và các nút trong trận.

import { enemiesLeft, alliesLeft, skillReady, type Battle } from '../game/battle';
import {
  BUILDINGS,
  FIELD,
  RESOURCE_IDS,
  STAGES,
  UNITS,
  UNIT_TYPES,
  type BuildingType,
  type Cost,
  type ResourceId,
  type Resources,
  type GearId,
  type Row,
  type SkillId,
  type UnitType,
} from '../game/defs';
import {
  canAfford,
  canTrain,
  canUpgrade,
  countOf,
  currentQuest,
  dienLevel,
  dienNeededFor,
  findBuilding,
  freeDan,
  housing,
  isStarving,
  limitOf,
  netPerMinute,
  outputOf,
  questDone,
  questProgress,
  repairAllCost,
  repairCost,
  slotsOf,
  storageCap,
  troopCap,
  troopSpace,
  upgradeCostOf,
  type Building,
  type GameState,
  type RaidResult,
  type StageResult,
  type StoryId,
} from '../game/game';
import { giongAppeared, giongLook, giongReady, giongResting } from '../game/giong';
import { AREA_SIZE } from '../game/map';
import { formatDuration, vi } from '../text/vi';
import { armyHtml, defaultPick, mapHtml, nextRow, stageHtml, stageResultHtml, type ArmyPick } from './campaign';
import { costHtml, esc, fmt } from './format';
import { giongHtml, storyHtml } from './giong';

const SHOWN_RESOURCES: ResourceId[] = ['gao', 'voOc', 'datDa', 'sat'];
const BUILD_MENU: BuildingType[] = ['luy', 'ruong', 'ben', 'nhaSan', 'baiDa', 'kho', 'loRen', 'doanhTrai', 'choiCanh', 'bayChong', 'denPhuDong'];

/** Tên hiển thị của công trình, tính cả lũy tre đã đắp thành đất. */
export function buildingName(b: Pick<Building, 'type' | 'level'>): string {
  return b.type === 'luy' && b.level >= 2 ? vi.ui.wallEarth : vi.buildings[b.type].name;
}

export type HudAction =
  | { kind: 'openBuild' }
  | { kind: 'chooseBuild'; type: BuildingType }
  | { kind: 'confirmPlace' }
  | { kind: 'cancelPlace' }
  | { kind: 'upgrade'; id: number }
  | { kind: 'removeWall'; id: number }
  | { kind: 'claimQuest' }
  | { kind: 'openSettings' }
  | { kind: 'toggleMute' }
  | { kind: 'copyCode' }
  | { kind: 'importCode'; code: string }
  | { kind: 'reset' }
  | { kind: 'closeSheet' }
  | { kind: 'workers'; id: number; delta: number }
  | { kind: 'danInfo' }
  | { kind: 'openMerchant' }
  | { kind: 'acceptOffer'; index: number }
  | { kind: 'train'; unit: UnitType }
  | { kind: 'repair'; id: number }
  | { kind: 'repairAll' }
  | { kind: 'callRaid' }
  | { kind: 'lookRaid' }
  | { kind: 'openBarracks' }
  | { kind: 'dismissRaid' }
  | { kind: 'openCampaign' }
  | { kind: 'march'; stage: number; army: Record<UnitType, number>; rows: Record<UnitType, Row> }
  | { kind: 'useSkill'; skill: SkillId }
  | { kind: 'openGiong' }
  | { kind: 'feedGiong' }
  | { kind: 'forgeGear'; gear: GearId }
  | { kind: 'storyDone'; id: StoryId }
  | { kind: 'retreat' }
  | { kind: 'leaveField' }
  | { kind: 'fieldToMap' };

export type HudMode = 'view' | 'place' | 'paint';

type Sheet = { kind: 'build' } | { kind: 'building'; id: number } | { kind: 'settings' } | { kind: 'merchant' } | { kind: 'giong' } | null;

/** Chữ trên nút kỹ năng: tên khi sẵn sàng, chỉ biểu tượng và số giây khi đang hồi (cho gọn trên điện thoại). */
function skillLabel(b: Battle, k: SkillId): string {
  const cd = Math.ceil(b.skillCd[k] ?? 0);
  return cd > 0 && !b.outcome ? `${vi.skills[k].icon} ${cd}s` : `${vi.skills[k].icon} ${vi.skills[k].name}`;
}

function skillButton(b: Battle, k: SkillId, small = false): string {
  return `<button class="btn bronze skill ${small ? 'small' : ''}" data-act="useSkill" data-skill="${k}" title="${vi.skills[k].desc}" ${skillReady(b, k) ? '' : 'disabled'}>${skillLabel(b, k)}</button>`;
}

/** Bản đồ phó bản đang mở: màn đang xem, đang xem thẻ màn hay đang xếp quân. */
interface CampaignView {
  stage: number | null;
  step: 'stage' | 'army';
  pick: ArmyPick;
}

function prodHtml(prod: Cost): string {
  const parts = RESOURCE_IDS.filter((r) => (prod[r] ?? 0) > 0).map((r) => `${vi.resources[r].icon} ${fmt(prod[r]!)}${vi.ui.perMinute}`);
  return parts.join(' · ') || '—';
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly topbar: HTMLElement;
  private readonly banners: HTMLElement;
  private readonly quest: HTMLElement;
  private readonly bottombar: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly sheetEl: HTMLElement;
  private readonly toasts: HTMLElement;
  private sheet: Sheet = null;
  private sheetHtml = '';
  private questHtml = '';
  private topHtml = '';
  private bannerHtml = '';
  private questCollapsed = false;
  private mode: HudMode = 'view';
  /** Đã có doanh trại: hiện nút Phó bản ở thanh dưới. */
  private campaignReady = false;
  private readonly campaignEl: HTMLElement;
  private readonly fieldTop: HTMLElement;
  private readonly fieldBar: HTMLElement;
  private camp: CampaignView | null = null;
  private campHtml = '';
  /** Đoạn truyện đang kể và thẻ đang xem. */
  private story: { id: StoryId; step: number } | null = null;
  private skillKey = '';

  constructor(
    root: HTMLElement,
    private readonly onAction: (a: HudAction) => void,
    private readonly getState: () => GameState,
  ) {
    this.root = root;
    root.innerHTML = `
      <div class="top-area">
        <header class="topbar"></header>
        <div class="banners"></div>
        <section class="quest"></section>
        <div class="field-top"><b></b><span></span></div>
      </div>
      <div class="hint" hidden></div>
      <footer class="bottombar"></footer>
      <footer class="fieldbar">
        <button class="btn ghost small" data-act="retreat" title="${vi.ui.retreat}">🏳️</button>
        <span class="skills"></span>
      </footer>
      <aside class="sheet" aria-live="polite"></aside>
      <section class="campaign" hidden></section>
      <div class="toasts"></div>`;
    this.campaignEl = root.querySelector('.campaign')!;
    this.fieldTop = root.querySelector('.field-top')!;
    this.fieldBar = root.querySelector('.fieldbar')!;
    this.topbar = root.querySelector('.topbar')!;
    this.banners = root.querySelector('.banners')!;
    this.quest = root.querySelector('.quest')!;
    this.bottombar = root.querySelector('.bottombar')!;
    this.hint = root.querySelector('.hint')!;
    this.sheetEl = root.querySelector('.sheet')!;
    this.toasts = root.querySelector('.toasts')!;
    root.addEventListener('click', this.onClick);
    this.setMode('view');
  }

  private onClick = (e: Event): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const act = el.dataset.act!;
    const id = Number(el.dataset.id);
    switch (act) {
      case 'toggleQuest':
        this.questCollapsed = !this.questCollapsed;
        this.quest.classList.toggle('collapsed', this.questCollapsed);
        return;
      case 'chooseBuild':
        return this.onAction({ kind: 'chooseBuild', type: el.dataset.type as BuildingType });
      case 'upgrade':
      case 'removeWall':
        return this.onAction({ kind: act, id });
      case 'workers':
        return this.onAction({ kind: 'workers', id, delta: Number(el.dataset.delta) });
      case 'acceptOffer':
        return this.onAction({ kind: 'acceptOffer', index: id });
      case 'repair':
        return this.onAction({ kind: 'repair', id });
      case 'train':
        return this.onAction({ kind: 'train', unit: el.dataset.unit as UnitType });
      case 'closeCampaign':
        return this.closeCampaign();
      case 'useSkill':
        return this.onAction({ kind: 'useSkill', skill: el.dataset.skill as SkillId });
      case 'forgeGear':
        return this.onAction({ kind: 'forgeGear', gear: el.dataset.gear as GearId });
      case 'storyNext':
        return this.storyNext();
      case 'pickStage':
      case 'prepareStage':
      case 'backToStage':
      case 'armyDelta':
      case 'armyRow':
        return this.campaignStep(act, id, el);
      case 'march': {
        if (!this.camp?.stage) return;
        const { army, rows } = this.camp.pick;
        return this.onAction({ kind: 'march', stage: this.camp.stage, army: { ...army }, rows: { ...rows } });
      }
      case 'importCode': {
        const box = this.sheetEl.querySelector<HTMLTextAreaElement>('#import-box');
        return this.onAction({ kind: 'importCode', code: box?.value ?? '' });
      }
      default:
        return this.onAction({ kind: act } as HudAction);
    }
  };

  // ---------- Thanh trên ----------

  updateTop(state: GameState): void {
    const store = storageCap(state);
    const rate = netPerMinute(state);
    const res = SHOWN_RESOURCES.map((r) => {
      const v = state.resources[r];
      const n = Math.round(rate[r]);
      return `<div class="chip ${v >= store ? 'full' : ''}" title="${vi.resources[r].name}">
        ${vi.resources[r].icon} <b>${fmt(v)}</b><small>/${fmt(store)}</small>
        <span class="rate ${n < 0 ? 'neg' : ''}">${n < 0 ? '−' + fmt(-n) : '+' + fmt(n)}</span>
      </div>`;
    }).join('');
    const free = freeDan(state);
    const room = housing(state);
    const dan = `<button class="chip dan ${free > 0 ? 'idle' : ''}" data-act="danInfo" title="${vi.ui.danTitle(state.dan, room, free)}">
      👥 <b>${state.dan}</b><small>/${room}</small>${free > 0 ? `<span class="rate">${free} rảnh</span>` : ''}</button>`;
    const ready = countOf(state, 'doanhTrai') > 0;
    if (ready !== this.campaignReady) {
      this.campaignReady = ready;
      if (this.mode === 'view') this.setMode('view');
    }
    const cap = troopCap(state);
    const army = cap
      ? `<button class="chip dan" data-act="openBarracks" title="${vi.ui.troopSpace(troopSpace(state), cap)}">⚔️ <b>${troopSpace(state)}</b><small>/${cap}</small></button>`
      : '';
    const look = giongLook(state);
    let giong = '';
    if (look) {
      const mark = giongReady(state) ? (giongResting(state) ? '💤' : '⚔️') : `${state.giong.fed}/5`;
      giong = `<button class="chip dan" data-act="openGiong" title="${vi.ui.giong}">${vi.giongLooks[look].icon} <b>${mark}</b></button>`;
    }
    const html = `<div class="chip level" title="${vi.buildings.dien.name}">🏯 ${dienLevel(state)}</div>${res}${dan}${army}${giong}
      <span class="spacer"></span>
      <button class="icon-btn" data-act="openSettings" aria-label="${vi.ui.settings}">⚙️</button>`;
    // So với chuỗi đã vẽ lần trước (không so với innerHTML vì trình duyệt chuẩn hóa lại chuỗi),
    // để không thay nút ⚙️ giữa lúc người chơi đang chạm.
    if (html !== this.topHtml) {
      this.topHtml = html;
      this.topbar.innerHTML = html;
    }
  }

  // ---------- Thông báo nổi: thiếu gạo, thuyền buôn ----------

  updateBanners(state: GameState): void {
    const parts: string[] = [];
    const raid = state.raid;
    if (raid.phase === 'warning') {
      const secs = Math.max(0, Math.ceil((raid.startsAt - state.clock) / 1000));
      const side = raid.side === 'bac' ? vi.ui.sideBac : vi.ui.sideTay;
      parts.push(`<div class="banner bad">⚠️ ${vi.ui.raidWarning(side, secs)}
        <button class="btn small" data-act="lookRaid">${vi.ui.raidLook}</button></div>`);
    }
    if (raid.phase === 'battle' && raid.battle) {
      const b = raid.battle;
      parts.push(`<div class="banner bad">⚔️ ${vi.ui.raidBattle(enemiesLeft(b), alliesLeft(b))}</div>
        <div class="banner skills">${b.skills.map((k) => skillButton(b, k, true)).join('')}</div>`);
    }
    if (isStarving(state)) parts.push(`<div class="banner bad">🍚 ${vi.ui.starving}</div>`);
    const visit = state.merchant.visit;
    if (visit) {
      const secs = Math.max(0, Math.ceil((visit.leavesAt - state.clock) / 1000));
      parts.push(`<div class="banner">⛵ ${vi.ui.merchantHere(secs)}
        <button class="btn small bronze" data-act="openMerchant">${vi.ui.merchantOpen}</button></div>`);
    }
    const html = parts.join('');
    if (html !== this.bannerHtml) {
      this.bannerHtml = html;
      this.banners.innerHTML = html;
    }
  }

  // ---------- Nhiệm vụ Lạc hầu ----------

  updateQuest(state: GameState): void {
    const quest = currentQuest(state);
    const progress = questProgress(state);
    const done = questDone(state);
    let body: string;
    if (!quest || !progress) {
      body = `<p>${esc(vi.quests.allDone)}</p>`;
    } else {
      body = `<p>${esc(vi.quests[quest.id])}</p>
        <div class="quest-foot">
          <span class="progress">${progress.have}/${progress.need}</span>
          <span class="reward">${vi.ui.reward}: ${costHtml(null, quest.reward)}</span>
          <span class="spacer"></span>
          ${done ? `<button class="btn small bronze" data-act="claimQuest">${vi.ui.claim}</button>` : ''}
        </div>`;
    }
    const html = `<button class="quest-head" data-act="toggleQuest">📜 ${vi.ui.lacHau}<span class="toggle">${this.questCollapsed ? '▾' : '▴'}</span></button>${body}`;
    if (html !== this.questHtml) {
      this.questHtml = html;
      this.quest.innerHTML = html;
    }
    this.quest.classList.toggle('ready', done);
    this.quest.classList.toggle('collapsed', this.questCollapsed);
  }

  // ---------- Thanh dưới ----------

  setMode(mode: HudMode, placeValid = true, hint?: string): void {
    this.mode = mode;
    if (mode === 'view') {
      const camp = this.campaignReady ? `<button class="btn bronze" data-act="openCampaign">⚔️ ${vi.ui.campaign}</button>` : '';
      this.bottombar.innerHTML = `<button class="btn" data-act="openBuild">🔨 ${vi.ui.build}</button>${camp}`;
      this.hint.hidden = true;
    } else if (mode === 'place') {
      this.bottombar.innerHTML = `
        <button class="btn ghost" data-act="cancelPlace">✕ ${vi.ui.cancel}</button>
        <button class="btn" data-act="confirmPlace" ${placeValid ? '' : 'disabled'}>✓ ${vi.ui.place}</button>`;
      this.hint.hidden = false;
      this.hint.textContent = vi.ui.placeHint;
    } else {
      this.bottombar.innerHTML = `<button class="btn" data-act="cancelPlace">✓ ${vi.ui.done}</button>`;
      this.hint.hidden = false;
      this.hint.textContent = hint ?? vi.ui.wallHint;
    }
  }

  /** Bật/tắt nút Đặt và đổi dòng gợi ý thành lý do khi chỗ này không đặt được. */
  setPlaceValid(valid: boolean, reason?: string): void {
    const btn = this.bottombar.querySelector<HTMLButtonElement>('[data-act="confirmPlace"]');
    if (btn) btn.disabled = !valid;
    if (btn) this.hint.textContent = valid || !reason ? vi.ui.placeHint : reason;
  }

  /** Đổi tạm dòng gợi ý (chế độ dựng lũy). */
  setHint(text: string): void {
    this.hint.textContent = text;
  }

  // ---------- Bảng trượt ----------

  get openSheet(): Sheet {
    return this.sheet;
  }

  showBuildMenu(state: GameState): void {
    this.sheet = { kind: 'build' };
    this.refreshSheet(state);
  }

  showBuilding(state: GameState, id: number): void {
    this.sheet = { kind: 'building', id };
    this.refreshSheet(state);
  }

  showMerchant(state: GameState): void {
    this.sheet = { kind: 'merchant' };
    this.refreshSheet(state);
  }

  showGiong(state: GameState): void {
    this.sheet = { kind: 'giong' };
    this.refreshSheet(state);
  }

  showSettings(state: GameState): void {
    this.sheet = { kind: 'settings' };
    this.refreshSheet(state, true);
  }

  closeSheet(): void {
    this.sheet = null;
    this.sheetEl.classList.remove('open');
    this.root.classList.remove('sheet-open');
  }

  /** Tâm của phần màn hình không bị bảng trượt che, để camera đưa công trình đang chọn vào đó. */
  freeCenter(): { x: number; y: number } {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!this.sheet) return { x: w / 2, y: h / 2 };
    const sideBySide = window.matchMedia('(min-width: 600px) and (min-aspect-ratio: 4/5)').matches;
    if (sideBySide) return { x: (w - this.sheetEl.offsetWidth - 10) / 2, y: h / 2 + 30 };
    const top = 70;
    return { x: w / 2, y: top + (h - this.sheetEl.offsetHeight - top) / 2 };
  }

  /** Vẽ lại bảng đang mở. Bỏ qua nếu nội dung không đổi để không làm mất lần chạm của người chơi. */
  refreshSheet(state: GameState, force = false): void {
    if (!this.sheet) return;
    if (this.sheet.kind === 'settings' && !force) return;
    let title = '';
    let body = '';
    if (this.sheet.kind === 'build') {
      title = `🔨 ${vi.ui.buildTitle}`;
      body = this.buildMenuHtml(state);
    } else if (this.sheet.kind === 'building') {
      const b = findBuilding(state, this.sheet.id);
      if (!b) return this.closeSheet();
      title = `${vi.buildings[b.type].icon} ${buildingName(b)}`;
      body = this.buildingHtml(state, b.id);
    } else if (this.sheet.kind === 'merchant') {
      if (!state.merchant.visit) return this.closeSheet();
      title = `⛵ ${vi.ui.merchantTitle}`;
      body = this.merchantHtml(state);
    } else if (this.sheet.kind === 'giong') {
      title = `🐎 ${vi.ui.giong}`;
      body = giongHtml(state);
    } else {
      title = `⚙️ ${vi.ui.settings}`;
      body = this.settingsHtml(state);
    }
    const html = `<div class="sheet-head"><h2>${title}</h2><button class="close" data-act="closeSheet" aria-label="${vi.ui.close}">✕</button></div>
      <div class="sheet-body">${body}</div>`;
    if (html !== this.sheetHtml || force) {
      this.sheetHtml = html;
      this.sheetEl.innerHTML = html;
    }
    this.sheetEl.classList.add('open');
    this.root.classList.add('sheet-open');
  }

  private buildMenuHtml(state: GameState): string {
    const cards = BUILD_MENU.map((type) => {
      const def = BUILDINGS[type];
      const have = countOf(state, type);
      const max = limitOf(state, type);
      let why = '';
      if (def.afterChapter && !state.giong.ascended) why = vi.reasons.canKetChuong;
      else if (dienLevel(state) < def.minDien) why = `Cần Điện cấp ${def.minDien}`;
      else if (have >= max) why = vi.reasons.datGioiHan;
      else if (!canAfford(state, def.buildCost)) why = vi.reasons.thieuTaiNguyen;
      return `<button class="card ${why ? 'locked' : ''}" data-act="chooseBuild" data-type="${type}">
        <span class="icon">${vi.buildings[type].icon}</span>
        <span class="name">${vi.buildings[type].name}</span>
        <span class="meta">${def.w}×${def.d} ô · ${vi.ui.count(have, max)}</span>
        ${costHtml(state, def.buildCost)}
        ${why ? `<span class="why">${why}</span>` : ''}
      </button>`;
    }).join('');
    return `<div class="cards">${cards}</div>`;
  }

  private buildingHtml(state: GameState, id: number): string {
    const b = findBuilding(state, id)!;
    const def = BUILDINGS[b.type];
    const pips = Array.from({ length: def.maxLevel }, (_, i) => `<i class="${i < b.level ? 'on' : ''}"></i>`).join('');
    const rows: string[] = [];
    if (def.maxLevel > 1) {
      rows.push(`<div class="stat"><span>${vi.ui.level}</span><span>${b.level}/${def.maxLevel} <span class="level-pips">${pips}</span></span></div>`);
    }
    const prod = def.production[b.level - 1];
    if (RESOURCE_IDS.some((r) => (prod[r] ?? 0) > 0)) {
      rows.push(`<div class="stat"><span>${vi.ui.production}</span><span>${prodHtml(outputOf(b))}</span></div>`);
      if (b.level < def.maxLevel) {
        rows.push(`<div class="stat"><span>${vi.ui.nextLevel}</span><span>${prodHtml(def.production[b.level])}</span></div>`);
      }
    }
    const slots = slotsOf(b);
    if (slots) {
      const free = freeDan(state);
      rows.push(`<div class="stat workers"><span>${vi.ui.workers}</span><span>
        <button class="step" data-act="workers" data-id="${b.id}" data-delta="-1" ${b.workers > 0 ? '' : 'disabled'} aria-label="Bớt một người">−</button>
        <b>${b.workers}/${slots}</b>
        <button class="step" data-act="workers" data-id="${b.id}" data-delta="1" ${b.workers < slots && free > 0 ? '' : 'disabled'} aria-label="Thêm một người">+</button>
      </span></div>`);
      rows.push(`<div class="stat"><span></span><span class="muted">${vi.ui.freeDan(free)}</span></div>`);
    }
    if (def.housing) {
      const next = b.level < def.maxLevel ? ` → ${def.housing[b.level]}` : '';
      rows.push(`<div class="stat"><span>${vi.ui.housing}</span><span>${def.housing[b.level - 1]}${next}</span></div>`);
    }
    if (def.storage) {
      const next = b.level < def.maxLevel ? ` → +${fmt(def.storage[b.level])}` : '';
      rows.push(`<div class="stat"><span>${vi.ui.storage}</span><span>+${fmt(def.storage[b.level - 1])}${next}</span></div>`);
    }
    if (b.type === 'dien') {
      const size = AREA_SIZE[b.level - 1];
      const next = b.level < def.maxLevel ? ` → ${AREA_SIZE[b.level]}×${AREA_SIZE[b.level]}` : '';
      rows.push(`<div class="stat"><span>${vi.ui.storage}</span><span>${fmt(storageCap(state))}</span></div>`);
      rows.push(`<div class="stat"><span>${vi.ui.dan}</span><span>${state.dan}/${housing(state)}</span></div>`);
      rows.push(`<div class="stat"><span>Đất kinh đô</span><span>${size}×${size}${next}</span></div>`);
    }

    if (b.type === 'doanhTrai') rows.push(this.barracksHtml(state));
    if ((b.type === 'loRen' || b.type === 'dien') && giongAppeared(state) && !state.giong.ascended) {
      const label = b.type === 'loRen' ? `⚒️ ${vi.ui.giongForge}` : `${vi.giongLooks[giongLook(state)!].icon} ${vi.ui.giong}`;
      rows.push(`<div class="actions"><button class="btn bronze" data-act="openGiong">${label}</button></div>`);
    }

    const actions: string[] = [];
    if (b.damaged) {
      const rc = repairCost(b);
      actions.push(`<div class="why">${vi.ui.damaged}</div>`);
      actions.push(`<button class="btn bronze" data-act="repair" data-id="${b.id}" ${canAfford(state, rc) && state.raid.phase !== 'battle' ? '' : 'disabled'}>
        ${vi.ui.repair} · ${costHtml(state, rc)}</button>`);
    }
    const cost = upgradeCostOf(b);
    if (cost) {
      const check = canUpgrade(state, b.id);
      const label = b.type === 'luy' ? `🧱 Đắp ${vi.ui.wallEarth.toLowerCase()}` : `⬆ ${vi.ui.upgradeTo(b.level + 1)}`;
      actions.push(`<button class="btn" data-act="upgrade" data-id="${b.id}" ${check.ok ? '' : 'disabled'}>
        ${label} · ${costHtml(state, cost)}</button>`);
      if (!check.ok) {
        const why = check.reason === 'chuaDuCapDien' ? `Cần Điện cấp ${dienNeededFor(b.type, b.level + 1)}` : vi.reasons[check.reason];
        actions.push(`<div class="why">${why}</div>`);
      }
    } else if (def.maxLevel > 1) {
      actions.push(`<div class="muted" style="text-align:center">${vi.ui.maxLevel}</div>`);
    }
    if (def.removable) actions.push(`<button class="btn ghost" data-act="removeWall" data-id="${b.id}">${vi.ui.remove}</button>`);

    return `<div class="info"><p>${esc(vi.buildings[b.type].desc)}</p>${rows.join('')}<div class="actions">${actions.join('')}</div></div>`;
  }

  private barracksHtml(state: GameState): string {
    const rows = UNIT_TYPES.map((k) => {
      const def = UNITS[k];
      const check = canTrain(state, k);
      const why = check.ok ? '' : check.reason === 'canDoanhTrai' ? `Cần doanh trại cấp ${def.barracksLevel}` : vi.reasons[check.reason];
      return `<div class="unit-row">
        <span class="unit-icon">${vi.units[k].icon}</span>
        <span class="unit-info"><b>${vi.units[k].name}</b> × ${state.troops[k]}
          <small>${vi.units[k].desc}</small>
          ${why ? `<small class="lack">${why}</small>` : ''}</span>
        <button class="btn small" data-act="train" data-unit="${k}" ${check.ok ? '' : 'disabled'}>${vi.ui.train}<br>${costHtml(state, def.cost)}</button>
      </div>`;
    }).join('');
    const raid = state.raid;
    let next = '';
    if (raid.phase === 'idle') {
      next = raid.nextAt === null ? vi.ui.noRaidYet : vi.ui.nextRaid(Math.ceil((raid.nextAt - state.clock) / 60000));
    }
    return `<div class="stat"><span>${vi.ui.troopSpace(troopSpace(state), troopCap(state))}</span></div>
      <div class="units">${rows}</div>
      ${next ? `<p class="muted">${next}</p><button class="btn ghost small" data-act="callRaid">${vi.ui.callRaid}</button>` : ''}`;
  }

  private merchantHtml(state: GameState): string {
    const visit = state.merchant.visit!;
    const secs = Math.max(0, Math.ceil((visit.leavesAt - state.clock) / 1000));
    const rows = visit.offers
      .map((o, i) => {
        const can = !o.taken && state.resources[o.give.r] >= o.give.n;
        const give = `<span class="${state.resources[o.give.r] < o.give.n && !o.taken ? 'lack' : ''}">${vi.resources[o.give.r].icon} ${fmt(o.give.n)}</span>`;
        return `<div class="offer ${o.taken ? 'taken' : ''}">
          <span class="trade"><small>${vi.ui.give}</small> ${give} <span class="arrow">→</span> <small>${vi.ui.get}</small> ${vi.resources[o.get.r].icon} ${fmt(o.get.n)}</span>
          <button class="btn small" data-act="acceptOffer" data-id="${i}" ${can ? '' : 'disabled'}>${o.taken ? vi.ui.traded : vi.ui.trade}</button>
        </div>`;
      })
      .join('');
    return `<p class="muted">${vi.ui.merchantHint} (${secs}s)</p><div class="offers">${rows}</div>`;
  }

  private settingsHtml(state: GameState): string {
    return `
      <div class="setting-row"><span>${vi.ui.sound}</span>
        <button class="btn small ghost" data-act="toggleMute">${state.settings.muted ? '🔇 ' + vi.ui.off : '🔊 ' + vi.ui.on}</button></div>
      <div class="setting-row"><span>${vi.ui.exportSave}</span>
        <button class="btn small ghost" data-act="copyCode">📋 ${vi.ui.copy}</button></div>
      <p class="muted">${vi.ui.exportHint}</p>
      <div style="margin-top:12px"><b>${vi.ui.importSave}</b></div>
      <p class="muted">${vi.ui.importHint}</p>
      <textarea id="import-box" placeholder="TDVL1:..."></textarea>
      <button class="btn small ghost" data-act="importCode">📥 ${vi.ui.importSave}</button>
      <div class="actions"><button class="btn ghost" data-act="reset">🔄 ${vi.ui.reset}</button></div>
      <p class="muted" style="text-align:center;margin-top:14px">${vi.gameTitle} · bản thử 0.4</p>`;
  }

  // ---------- Phó bản ----------

  get campaignOpen(): boolean {
    return this.camp !== null;
  }

  showCampaign(state: GameState): void {
    this.closeSheet();
    const next = state.campaign.cleared + 1;
    this.camp = { stage: next <= STAGES.length ? next : null, step: 'stage', pick: defaultPick(state) };
    this.campaignEl.hidden = false;
    this.refreshCampaign(state, true);
  }

  closeCampaign(): void {
    this.camp = null;
    this.campHtml = '';
    this.campaignEl.hidden = true;
  }

  /** Thao tác trên bản đồ chỉ đổi giao diện: chọn màn, xếp quân. */
  private campaignStep(act: string, id: number, el: HTMLElement): void {
    const camp = this.camp;
    if (!camp) return;
    const state = this.getState();
    const unit = el.dataset.unit as UnitType;
    if (act === 'pickStage') {
      camp.stage = id;
      camp.step = 'stage';
    } else if (act === 'prepareStage') {
      camp.step = 'army';
      camp.pick = defaultPick(state);
    } else if (act === 'backToStage') {
      camp.step = 'stage';
    } else if (act === 'armyDelta') {
      const n = camp.pick.army[unit] + Number(el.dataset.delta);
      camp.pick.army[unit] = Math.max(0, Math.min(state.troops[unit], n));
    } else if (act === 'armyRow') {
      camp.pick.rows[unit] = nextRow(camp.pick.rows[unit]);
    }
    this.refreshCampaign(state);
  }

  refreshCampaign(state: GameState, force = false): void {
    const camp = this.camp;
    if (!camp) return;
    for (const k of UNIT_TYPES) camp.pick.army[k] = Math.min(camp.pick.army[k], state.troops[k]);
    let panel = `<p class="muted">${vi.ui.campaignHint}</p>`;
    if (camp.stage) panel = camp.step === 'army' ? armyHtml(state, camp.pick) : stageHtml(state, camp.stage);
    const html = `<div class="camp-head"><h2>⚔️ ${vi.ui.campaignTitle}</h2>
        <button class="close" data-act="closeCampaign" aria-label="${vi.ui.close}">✕</button></div>
      <div class="camp-main"><div class="camp-map">${mapHtml(state, camp.stage)}</div><div class="camp-panel">${panel}</div></div>`;
    if (html !== this.campHtml || force) {
      this.campHtml = html;
      this.campaignEl.innerHTML = html;
    }
  }

  /** Thanh trên và nút dưới khi đang đánh ngoài bãi. Nút kỹ năng chỉ đổi chữ tại chỗ để không nuốt lần chạm. */
  updateField(state: GameState): void {
    const b = state.campaign.battle;
    this.root.classList.toggle('in-field', !!b);
    if (!b) return;
    const secs = Math.max(0, Math.ceil(FIELD.maxS - b.t));
    this.fieldTop.querySelector('b')!.textContent = `${vi.ui.stageN(b.wave)} · ${vi.stages[b.wave - 1].name}`;
    this.fieldTop.querySelector('span')!.textContent = vi.ui.fieldBanner(enemiesLeft(b), alliesLeft(b), secs);
    const box = this.fieldBar.querySelector<HTMLElement>('.skills')!;
    const key = `${b.id}:${b.skills.join(',')}`;
    if (key !== this.skillKey) {
      this.skillKey = key;
      box.innerHTML = b.skills.map((k) => skillButton(b, k)).join('');
    }
    for (const btn of box.querySelectorAll<HTMLButtonElement>('[data-skill]')) {
      const k = btn.dataset.skill as SkillId;
      btn.disabled = !skillReady(b, k);
      btn.textContent = skillLabel(b, k);
      btn.classList.toggle('active', k === 'trongTran' && b.rally > 0);
    }
    this.fieldBar.querySelector<HTMLButtonElement>('[data-act="retreat"]')!.disabled = !!b.outcome;
  }

  // ---------- Truyện ----------

  get storyOpen(): boolean {
    return this.story !== null;
  }

  /** Có hộp thoại nào đang mở (kết quả trận, vắng mặt, truyện) thì chưa kể truyện mới. */
  get modalOpen(): boolean {
    return !!this.root.querySelector('.modal-back');
  }

  showStory(id: StoryId): void {
    this.story = { id, step: 0 };
    const back = document.createElement('div');
    back.className = 'modal-back story-back';
    back.innerHTML = storyHtml(id, 0);
    this.root.appendChild(back);
  }

  private storyNext(): void {
    const story = this.story;
    const back = this.root.querySelector('.modal-back.story-back');
    if (!story || !back) return;
    if (story.step < vi.stories[story.id].lines.length - 1) {
      story.step += 1;
      back.innerHTML = storyHtml(story.id, story.step);
      return;
    }
    back.remove();
    this.story = null;
    this.onAction({ kind: 'storyDone', id: story.id });
  }

  showStageResult(r: StageResult): void {
    this.closeStageResult();
    const back = document.createElement('div');
    back.className = 'modal-back stage';
    back.innerHTML = stageResultHtml(r);
    this.root.appendChild(back);
  }

  closeStageResult(): void {
    this.root.querySelector('.modal-back.stage')?.remove();
  }

  // ---------- Thông báo ----------

  toast(message: string, bad = false): void {
    const el = document.createElement('div');
    el.className = `toast ${bad ? 'bad' : ''}`;
    el.textContent = message;
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
    setTimeout(() => el.remove(), 2600);
  }

  showOffline(ms: number, gained: Resources): void {
    const back = document.createElement('div');
    back.className = 'modal-back';
    const gains = SHOWN_RESOURCES.filter((r) => gained[r] >= 1)
      .map((r) => `<span>${vi.resources[r].icon} +${fmt(gained[r])}</span>`)
      .join('');
    back.innerHTML = `<div class="modal"><h2>${vi.ui.offlineTitle}</h2>
      <div>${vi.ui.offlineBody(formatDuration(ms))}</div>
      <div class="gains">${gains}</div>
      <button class="btn bronze">${vi.ui.ok}</button></div>`;
    back.querySelector('button')!.addEventListener('click', () => back.remove());
    this.root.appendChild(back);
  }

  /** Bảng tổng kết sau một đợt giặc. */
  showRaidResult(state: GameState, r: RaidResult): void {
    this.root.querySelector('.modal-back.raid')?.remove();
    const back = document.createElement('div');
    back.className = 'modal-back raid';
    const lost = UNIT_TYPES.filter((k) => r.lost[k] > 0).map((k) => `${vi.units[k].icon} ${r.lost[k]}`).join(' ') || vi.ui.raidNone;
    const stolen = RESOURCE_IDS.filter((x) => r.stolen[x] > 0).map((x) => `${vi.resources[x].icon} ${fmt(r.stolen[x])}`).join(' ') || vi.ui.raidNone;
    const damaged = state.buildings.filter((b) => b.damaged).length;
    const cost = repairAllCost(state);
    back.innerHTML = `<div class="modal">
      <h2>${r.won ? '🥁 ' + vi.ui.raidWonTitle : '🔥 ' + vi.ui.raidLostTitle}</h2>
      <div class="result-rows">
        <div>${vi.ui.raidKilled(r.killed, r.total)}</div>
        <div>${vi.ui.raidLostTroops}: ${lost}</div>
        <div>${vi.ui.raidStolen}: ${stolen}</div>
        <div>${vi.ui.raidWrecked(r.wrecked.length)}</div>
      </div>
      <div class="actions">
        ${damaged ? `<button class="btn bronze" data-act="repairAll">${vi.ui.repairAll} · ${costHtml(state, cost)}</button>` : ''}
        <button class="btn ghost" data-act="dismissRaid">${vi.ui.ok}</button>
      </div></div>`;
    this.root.appendChild(back);
  }

  closeRaidResult(): void {
    this.root.querySelector('.modal-back.raid')?.remove();
  }

  /** Kiểm tra nhanh xem có thể đặt công trình loại này ở đâu đó trên vùng đã mở không (dùng để báo lỗi sớm). */
  static placeBlocker(state: GameState, type: BuildingType): string | null {
    if (BUILDINGS[type].afterChapter && !state.giong.ascended) return vi.reasons.canKetChuong;
    if (dienLevel(state) < BUILDINGS[type].minDien) return `Cần Điện cấp ${BUILDINGS[type].minDien}`;
    if (countOf(state, type) >= limitOf(state, type)) return vi.reasons.datGioiHan;
    if (!canAfford(state, BUILDINGS[type].buildCost)) return vi.reasons.thieuTaiNguyen;
    return null;
  }
}
