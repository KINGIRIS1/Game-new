// Điểm khởi động: nạp game, nối luật chơi với cảnh 3D và giao diện, chạy vòng lặp.

import './style.css';
import { play, setMuted, unlockAudio } from './audio/sfx';
import { BUILDINGS, QUESTS, RESOURCE_IDS, type BuildingType, type Cost } from './game/defs';
import {
  applyOffline,
  buildingAt,
  canPlace,
  claimQuest,
  createInitialState,
  findBuilding,
  place,
  remove,
  tick,
  upgrade,
  type FailReason,
  type GameState,
} from './game/game';
import { GRID, RIVER_START } from './game/map';
import { fromCode, loadFromStorage, saveToStorage, toCode } from './game/save';
import { boxArt } from './render/art';
import { World } from './render/world';
import { vi } from './text/vi';
import { Hud, type HudAction } from './ui/hud';
import { mountPrototypeSwitcher } from './ui/prototype-switcher';

type Mode =
  | { kind: 'view'; selected: number | null }
  | { kind: 'place'; type: BuildingType; x: number; z: number }
  | { kind: 'wall' };

/** Vắng mặt lâu hơn mức này thì hiện bảng báo thu hoạch. */
const OFFLINE_NOTICE_MS = 60_000;
/** Khoảng trống giữa hai khung hình lớn hơn mức này (máy ngủ, chuyển app) được tính là vắng mặt. */
const GAP_AS_OFFLINE_MS = 5_000;
const AUTOSAVE_MS = 10_000;

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
  const hudRoot = document.querySelector<HTMLElement>('#hud')!;

  // PROTOTYPE, DÙNG XONG BỎ: ?variant= bật chế độ trưng bày để so sánh các phong cách hình ảnh.
  const variant = new URLSearchParams(window.location.search).get('variant');
  const showcase = variant !== null;
  let art = boxArt;
  if (showcase) {
    const proto = await import('./render/prototype-art');
    art = proto.artFor(variant);
    mountPrototypeSwitcher(proto.VARIANTS, art.key);
  }

  let world: World;
  try {
    world = new World(canvas, art);
  } catch {
    document.body.innerHTML = `<div class="fatal">${vi.ui.webglFailed}</div>`;
    return;
  }

  let state: GameState = showcase ? showcaseState(Date.now()) : (loadFromStorage(localStorage) ?? createInitialState(Date.now()));
  let mode: Mode = { kind: 'view', selected: null };
  let saveWarned = false;
  setMuted(state.settings.muted);

  const hud = new Hud(hudRoot, handle);

  const save = () => {
    // Chế độ trưng bày chỉ sống trong bộ nhớ, không được ghi đè game thật của người chơi.
    if (showcase) return;
    if (!saveToStorage(localStorage, state) && !saveWarned) {
      saveWarned = true;
      hud.toast(vi.ui.saveFailed, true);
    }
  };

  const refreshUi = () => {
    hud.updateTop(state);
    hud.updateQuest(state);
    hud.refreshSheet(state);
  };

  /** Gọi sau mọi thao tác: lưu, vẽ lại cảnh và giao diện. */
  const commit = () => {
    save();
    world.sync(state);
    refreshUi();
  };

  const fail = (reason: FailReason) => {
    play('error');
    hud.toast(vi.reasons[reason], true);
  };

  const rewardText = (cost: Cost) =>
    RESOURCE_IDS.filter((r) => (cost[r] ?? 0) > 0)
      .map((r) => `${vi.resources[r].icon} +${cost[r]}`)
      .join('  ');

  const showOfflineIfLong = (ms: number, gained: ReturnType<typeof applyOffline>['gained']) => {
    if (ms >= OFFLINE_NOTICE_MS && RESOURCE_IDS.some((r) => gained[r] >= 1)) hud.showOffline(ms, gained);
  };

  // ---------- Chế độ đặt công trình ----------

  const updateGhost = () => {
    if (mode.kind !== 'place') return;
    const check = canPlace(state, mode.type, mode.x, mode.z);
    world.setGhost(mode.type, mode.x, mode.z, check.ok);
    hud.setPlaceValid(check.ok, check.ok ? undefined : vi.reasons[check.reason]);
  };

  /** Tìm chỗ đặt được gần tâm màn hình nhất để bóng công trình hiện ra ở chỗ hợp lý. */
  const nearestSpot = (type: BuildingType): { x: number; z: number } => {
    const def = BUILDINGS[type];
    const c = world.screenCenterTile();
    const cx = c.x - Math.floor((def.w - 1) / 2);
    const cz = c.z - Math.floor((def.d - 1) / 2);
    let best: { x: number; z: number; d: number } | null = null;
    for (let x = 0; x <= GRID - def.w; x++) {
      for (let z = 0; z <= GRID - def.d; z++) {
        const d = Math.abs(x - cx) + Math.abs(z - cz);
        if ((!best || d < best.d) && canPlace(state, type, x, z).ok) best = { x, z, d };
      }
    }
    return best ?? { x: cx, z: cz };
  };

  const exitMode = () => {
    mode = { kind: 'view', selected: null };
    world.setGhost(null);
    world.setSelection(null);
    world.showGrid(false);
    hud.setMode('view');
  };

  const select = (id: number | null) => {
    const b = id === null ? undefined : findBuilding(state, id);
    mode = { kind: 'view', selected: b ? b.id : null };
    world.setSelection(b ?? null);
    if (b) {
      hud.showBuilding(state, b.id);
      const c = hud.freeCenter();
      world.focusOn(b, c.x, c.y);
    } else {
      hud.closeSheet();
    }
  };

  world.view.onTap = (cx, cy) => {
    const tile = world.pickTile(cx, cy);
    if (mode.kind === 'place') {
      if (!tile) return;
      const def = BUILDINGS[mode.type];
      // Chạm vào ô sát bờ thì đẩy công trình lùi vào đất liền thay vì chìa xuống sông.
      mode.x = Math.min(Math.max(tile.x - Math.floor((def.w - 1) / 2), 0), RIVER_START - def.w);
      mode.z = Math.min(Math.max(tile.z - Math.floor((def.d - 1) / 2), 0), RIVER_START - def.d);
      play('tap');
      updateGhost();
      return;
    }
    if (mode.kind === 'wall') {
      if (!tile) return;
      const r = place(state, 'luy', tile.x, tile.z);
      if (!r.ok) return fail(r.reason);
      play('place');
      commit();
      return;
    }
    const id = world.pickBuildingId(cx, cy) ?? (tile ? buildingAt(state, tile.x, tile.z)?.id : undefined) ?? null;
    if (id !== null) play('tap');
    select(id);
  };

  // ---------- Thao tác từ giao diện ----------

  function handle(a: HudAction): void {
    switch (a.kind) {
      case 'openBuild':
        if (mode.kind !== 'view') return;
        select(null);
        play('tap');
        hud.showBuildMenu(state);
        return;

      case 'chooseBuild': {
        const blocker = Hud.placeBlocker(state, a.type);
        if (blocker) {
          play('error');
          hud.toast(blocker, true);
          return;
        }
        hud.closeSheet();
        world.showGrid(true);
        play('tap');
        if (a.type === 'luy') {
          mode = { kind: 'wall' };
          hud.setMode('wall');
          return;
        }
        mode = { kind: 'place', type: a.type, ...nearestSpot(a.type) };
        hud.setMode('place');
        updateGhost();
        return;
      }

      case 'confirmPlace': {
        if (mode.kind !== 'place') return;
        const r = place(state, mode.type, mode.x, mode.z);
        if (!r.ok) return fail(r.reason);
        play('place');
        hud.toast(vi.ui.placed(vi.buildings[r.value.type].name));
        exitMode();
        commit();
        world.pop(r.value.id);
        return;
      }

      case 'cancelPlace':
        exitMode();
        return;

      case 'upgrade': {
        const r = upgrade(state, a.id);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        hud.toast(r.value.type === 'dien' ? vi.ui.landExpanded : vi.ui.upgraded(vi.buildings[r.value.type].name, r.value.level));
        commit();
        world.pop(r.value.id);
        world.setSelection(r.value);
        return;
      }

      case 'removeWall': {
        const r = remove(state, a.id);
        if (!r.ok) return fail(r.reason);
        play('tap');
        select(null);
        commit();
        return;
      }

      case 'claimQuest': {
        const r = claimQuest(state);
        if (!r.ok) return fail(r.reason);
        play('claim');
        hud.toast(`${vi.ui.reward}: ${rewardText(r.value)}`);
        commit();
        return;
      }

      case 'openSettings':
        if (mode.kind !== 'view') exitMode();
        select(null);
        hud.showSettings(state);
        return;

      case 'toggleMute':
        state.settings.muted = !state.settings.muted;
        setMuted(state.settings.muted);
        save();
        hud.showSettings(state);
        return;

      case 'copyCode': {
        const code = toCode(state);
        const fallback = () => {
          const box = document.querySelector<HTMLTextAreaElement>('#import-box');
          if (box) {
            box.value = code;
            box.select();
          }
        };
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).then(() => hud.toast(vi.ui.copied), fallback);
        } else {
          fallback();
        }
        return;
      }

      case 'importCode': {
        const loaded = fromCode(a.code);
        if (!loaded) {
          play('error');
          hud.toast(vi.ui.importBad, true);
          return;
        }
        state = loaded;
        state.lastSeen = Date.now();
        setMuted(state.settings.muted);
        world.resetAll();
        hud.closeSheet();
        hud.toast(vi.ui.imported);
        commit();
        return;
      }

      case 'reset':
        if (!window.confirm(vi.ui.resetConfirm)) return;
        state = createInitialState(Date.now());
        setMuted(false);
        world.resetAll();
        hud.closeSheet();
        commit();
        return;

      case 'closeSheet':
        select(null);
        return;
    }
  }

  // ---------- Khởi động và vòng lặp ----------

  const offline = applyOffline(state, Date.now());
  commit();
  showOfflineIfLong(offline.ms, offline.gained);
  if (showcase) {
    // Nhìn gần Điện Vua Hùng để thấy rõ chi tiết mô hình.
    world.view.target.set(18 - GRID / 2, 0, 19 - GRID / 2);
    world.view.zoom = 1.45;
    world.view.apply();
  }

  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('resize', () => world.resize());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') mode.kind === 'view' ? select(null) : exitMode();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
  window.addEventListener('pagehide', save);

  let prev = performance.now();
  let lastUi = 0;
  let lastSave = prev;
  const frame = (now: number) => {
    const dt = Math.min((now - prev) / 1000, 0.1);
    prev = now;

    const wall = Date.now();
    const gap = wall - state.lastSeen;
    if (gap > GAP_AS_OFFLINE_MS) {
      const off = applyOffline(state, wall);
      showOfflineIfLong(off.ms, off.gained);
      commit();
    } else {
      tick(state, gap);
      state.lastSeen = wall;
    }

    world.update(dt);
    if (now - lastUi > 250) {
      lastUi = now;
      refreshUi();
    }
    if (now - lastSave > AUTOSAVE_MS) {
      lastSave = now;
      save();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Cho phép kiểm thử tự động đọc trạng thái và tìm vị trí ô trên màn hình.
  (window as unknown as { __debug?: object }).__debug = {
    state: () => state,
    tileToScreen: (x: number, z: number) => world.tileToScreen(x, z),
    renderInfo: () => ({ ...world.renderer.info.render }),
  };
}

/** PROTOTYPE, DÙNG XONG BỎ: kinh đô dựng sẵn đủ loại công trình và nhiều cấp để so sánh phong cách. */
function showcaseState(now: number): GameState {
  const s = createInitialState(now);
  s.buildings = [
    { id: 1, type: 'dien', x: 16, z: 16, level: 3 },
    { id: 2, type: 'ruong', x: 12, z: 16, level: 1 },
    { id: 3, type: 'ruong', x: 12, z: 20, level: 3 },
    { id: 4, type: 'ruong', x: 16, z: 21, level: 5 },
    { id: 5, type: 'ben', x: 25, z: 17, level: 1 },
    { id: 6, type: 'ben', x: 21, z: 25, level: 4 },
  ];
  let id = 7;
  for (let x = 11; x < 22; x++) s.buildings.push({ id: id++, type: 'luy', x, z: 13, level: 1 });
  for (let z = 14; z < 23; z++) s.buildings.push({ id: id++, type: 'luy', x: 10, z, level: 1 });
  s.nextId = id;
  s.questIndex = QUESTS.length;
  s.resources = { gao: 2000, voOc: 2000, datDa: 0, sat: 0 };
  return s;
}

void start();
