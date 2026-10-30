// Giao diện HTML đặt đè lên cảnh 3D: thanh tài nguyên, nhiệm vụ, bảng xây dựng, bảng công trình, cài đặt.

import { BUILDINGS, RESOURCE_IDS, type BuildingType, type Cost, type ResourceId, type Resources } from '../game/defs';
import {
  canAfford,
  canUpgrade,
  countOf,
  currentQuest,
  dienLevel,
  findBuilding,
  limitOf,
  productionPerMinute,
  questDone,
  questProgress,
  storageCap,
  upgradeCostOf,
  type GameState,
} from '../game/game';
import { AREA_SIZE } from '../game/map';
import { formatDuration, vi } from '../text/vi';

/** Lát cắt 1 chỉ dùng gạo và vỏ ốc. */
const SHOWN_RESOURCES: ResourceId[] = ['gao', 'voOc'];
const BUILD_MENU: BuildingType[] = ['luy', 'ruong', 'ben'];

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
  | { kind: 'closeSheet' };

export type HudMode = 'view' | 'place' | 'wall';

type Sheet = { kind: 'build' } | { kind: 'building'; id: number } | { kind: 'settings' } | null;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fmt = (n: number) => Math.floor(n).toLocaleString('vi-VN');

function costHtml(state: GameState | null, cost: Cost): string {
  const parts = RESOURCE_IDS.filter((r) => (cost[r] ?? 0) > 0).map((r) => {
    const lack = state && state.resources[r] < (cost[r] ?? 0);
    return `<span class="${lack ? 'lack' : ''}">${vi.resources[r].icon} ${fmt(cost[r]!)}</span>`;
  });
  return parts.length ? `<span class="cost">${parts.join('')}</span>` : vi.ui.free;
}

function prodHtml(prod: Cost): string {
  const parts = RESOURCE_IDS.filter((r) => (prod[r] ?? 0) > 0).map((r) => `${vi.resources[r].icon} ${fmt(prod[r]!)}${vi.ui.perMinute}`);
  return parts.join(' · ') || '—';
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly topbar: HTMLElement;
  private readonly quest: HTMLElement;
  private readonly bottombar: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly sheetEl: HTMLElement;
  private readonly toasts: HTMLElement;
  private sheet: Sheet = null;
  private sheetHtml = '';
  private questHtml = '';
  private topHtml = '';
  private questCollapsed = false;

  constructor(root: HTMLElement, private readonly onAction: (a: HudAction) => void) {
    this.root = root;
    root.innerHTML = `
      <header class="topbar"></header>
      <section class="quest"></section>
      <div class="hint" hidden></div>
      <footer class="bottombar"></footer>
      <aside class="sheet" aria-live="polite"></aside>
      <div class="toasts"></div>`;
    this.topbar = root.querySelector('.topbar')!;
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
    const cap = storageCap(state);
    const rate = productionPerMinute(state);
    const res = SHOWN_RESOURCES.map((r) => {
      const v = state.resources[r];
      return `<div class="chip ${v >= cap ? 'full' : ''}" title="${vi.resources[r].name}">
        ${vi.resources[r].icon} <b>${fmt(v)}</b><small>/${fmt(cap)}</small>
        <span class="rate">+${fmt(rate[r])}</span>
      </div>`;
    }).join('');
    const html = `<div class="chip level" title="${vi.buildings.dien.name}">🏯 ${dienLevel(state)}</div>${res}
      <span class="spacer"></span>
      <button class="icon-btn" data-act="openSettings" aria-label="${vi.ui.settings}">⚙️</button>`;
    // So với chuỗi đã vẽ lần trước (không so với innerHTML vì trình duyệt chuẩn hóa lại chuỗi),
    // để không thay nút ⚙️ giữa lúc người chơi đang chạm.
    if (html !== this.topHtml) {
      this.topHtml = html;
      this.topbar.innerHTML = html;
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

  setMode(mode: HudMode, placeValid = true): void {
    if (mode === 'view') {
      this.bottombar.innerHTML = `<button class="btn" data-act="openBuild">🔨 ${vi.ui.build}</button>`;
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
      this.hint.textContent = vi.ui.wallHint;
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
      title = `${vi.buildings[b.type].icon} ${vi.buildings[b.type].name}`;
      body = this.buildingHtml(state, b.id);
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
      if (have >= max) why = vi.reasons.datGioiHan;
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
      rows.push(`<div class="stat"><span>${vi.ui.production}</span><span>${prodHtml(prod)}</span></div>`);
      if (b.level < def.maxLevel) {
        rows.push(`<div class="stat"><span>${vi.ui.nextLevel}</span><span>${prodHtml(def.production[b.level])}</span></div>`);
      }
    }
    if (b.type === 'dien') {
      const size = AREA_SIZE[b.level - 1];
      const next = b.level < def.maxLevel ? ` → ${AREA_SIZE[b.level]}×${AREA_SIZE[b.level]}` : '';
      rows.push(`<div class="stat"><span>${vi.ui.storage}</span><span>${fmt(storageCap(state))}</span></div>`);
      rows.push(`<div class="stat"><span>Đất kinh đô</span><span>${size}×${size}${next}</span></div>`);
    }

    const actions: string[] = [];
    const cost = upgradeCostOf(b);
    if (cost) {
      const check = canUpgrade(state, b.id);
      actions.push(`<button class="btn" data-act="upgrade" data-id="${b.id}" ${check.ok ? '' : 'disabled'}>
        ⬆ ${vi.ui.upgradeTo(b.level + 1)} · ${costHtml(state, cost)}</button>`);
      if (!check.ok) actions.push(`<div class="why">${vi.reasons[check.reason]}</div>`);
    } else if (def.maxLevel > 1) {
      actions.push(`<div class="muted" style="text-align:center">${vi.ui.maxLevel}</div>`);
    }
    if (def.removable) actions.push(`<button class="btn ghost" data-act="removeWall" data-id="${b.id}">${vi.ui.remove}</button>`);

    return `<div class="info"><p>${esc(vi.buildings[b.type].desc)}</p>${rows.join('')}<div class="actions">${actions.join('')}</div></div>`;
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
      <p class="muted" style="text-align:center;margin-top:14px">${vi.gameTitle} · bản thử 0.1</p>`;
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

  /** Kiểm tra nhanh xem có thể đặt công trình loại này ở đâu đó trên vùng đã mở không (dùng để báo lỗi sớm). */
  static placeBlocker(state: GameState, type: BuildingType): string | null {
    if (countOf(state, type) >= limitOf(state, type)) return vi.reasons.datGioiHan;
    if (!canAfford(state, BUILDINGS[type].buildCost)) return vi.reasons.thieuTaiNguyen;
    return null;
  }
}
