// Điểm khởi động: nạp game, nối luật chơi với cảnh 3D và giao diện, chạy vòng lặp.

import './style.css';
import { play, setMuted, unlockAudio } from './audio/sfx';
import { useSkill } from './game/battle';
import { leaveBattlefield, retreat, startStage } from './game/campaign';
import { BUILDINGS, RESOURCE_IDS, STAGES, type BuildingType, type Cost } from './game/defs';
import {
  applyOffline,
  buildingAt,
  canPlace,
  claimQuest,
  createInitialState,
  findBuilding,
  place,
  acceptOffer,
  autoAssign,
  findBuilding as getBuilding,
  freeDan,
  housing,
  callRaidNow,
  dismissRaidResult,
  remove,
  repair,
  repairAll,
  setWorkers,
  train,
  tick,
  upgrade,
  type FailReason,
  type GameState,
  type StageResult,
} from './game/game';
import { GRID, RIVER_START } from './game/map';
import { fromCode, loadFromStorage, saveToStorage, toCode } from './game/save';
import { World } from './render/world';
import { vi } from './text/vi';
import { Hud, buildingName, type HudAction } from './ui/hud';

type Mode =
  | { kind: 'view'; selected: number | null }
  | { kind: 'place'; type: BuildingType; x: number; z: number }
  | { kind: 'paint'; type: 'luy' | 'bayChong' };

/** Vắng mặt lâu hơn mức này thì hiện bảng báo thu hoạch. */
const OFFLINE_NOTICE_MS = 60_000;
/** Khoảng trống giữa hai khung hình lớn hơn mức này (máy ngủ, chuyển app) được tính là vắng mặt. */
const GAP_AS_OFFLINE_MS = 5_000;
const AUTOSAVE_MS = 10_000;

function start(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
  const hudRoot = document.querySelector<HTMLElement>('#hud')!;

  let world: World;
  try {
    world = new World(canvas);
  } catch {
    document.body.innerHTML = `<div class="fatal">${vi.ui.webglFailed}</div>`;
    return;
  }

  let state: GameState = loadFromStorage(localStorage) ?? createInitialState(Date.now());
  let mode: Mode = { kind: 'view', selected: null };
  let saveWarned = false;
  setMuted(state.settings.muted);

  const hud = new Hud(hudRoot, handle, () => state);

  const save = () => {
    if (!saveToStorage(localStorage, state) && !saveWarned) {
      saveWarned = true;
      hud.toast(vi.ui.saveFailed, true);
    }
  };

  const refreshUi = () => {
    hud.updateTop(state);
    hud.updateBanners(state);
    hud.updateQuest(state);
    hud.refreshSheet(state);
    hud.refreshCampaign(state);
    hud.updateField(state);
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
    // Trên bãi chiến chỉ xem, không chọn gì.
    if (world.inField) return;
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
    if (mode.kind === 'paint') {
      if (!tile) return;
      const r = place(state, mode.type, tile.x, tile.z);
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
        if (a.type === 'luy' || a.type === 'bayChong') {
          mode = { kind: 'paint', type: a.type };
          hud.setMode('paint', true, a.type === 'luy' ? vi.ui.wallHint : vi.ui.trapHint);
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
        hud.toast(vi.ui.placed(buildingName(r.value)));
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
        hud.toast(
          r.value.type === 'dien'
            ? vi.ui.landExpanded
            : r.value.type === 'luy'
              ? vi.ui.placed(buildingName(r.value))
              : vi.ui.upgraded(buildingName(r.value), r.value.level),
        );
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

      case 'workers': {
        const b = getBuilding(state, a.id);
        if (!b) return;
        const r = setWorkers(state, a.id, b.workers + a.delta);
        if (!r.ok) return fail(r.reason);
        play('tap');
        commit();
        return;
      }

      case 'danInfo': {
        if (freeDan(state) > 0) {
          const n = autoAssign(state);
          play(n ? 'place' : 'error');
          hud.toast(vi.ui.assigned(n), !n);
          if (n) commit();
        } else {
          hud.toast(vi.ui.danTitle(state.dan, housing(state), freeDan(state)));
        }
        return;
      }

      case 'openMerchant':
        if (mode.kind !== 'view') exitMode();
        select(null);
        play('tap');
        hud.showMerchant(state);
        return;

      case 'acceptOffer': {
        const r = acceptOffer(state, a.index);
        if (!r.ok) return fail(r.reason);
        play('claim');
        hud.toast(vi.ui.tradeDone);
        commit();
        return;
      }

      case 'train': {
        const r = train(state, a.unit);
        if (!r.ok) return fail(r.reason);
        play('place');
        hud.toast(vi.ui.trained(vi.units[a.unit].name));
        commit();
        return;
      }

      case 'repair': {
        const r = repair(state, a.id);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        commit();
        world.pop(r.value.id);
        return;
      }

      case 'repairAll': {
        const n = repairAll(state);
        play(n ? 'upgrade' : 'error');
        hud.toast(vi.ui.repaired(n), !n);
        dismissRaidResult(state);
        hud.closeRaidResult();
        commit();
        return;
      }

      case 'dismissRaid':
        dismissRaidResult(state);
        hud.closeRaidResult();
        save();
        return;

      case 'callRaid': {
        const r = callRaidNow(state);
        if (!r.ok) return fail(r.reason);
        play('claim');
        select(null);
        commit();
        return;
      }

      case 'lookRaid':
        world.lookAtEdge(state.raid.side);
        return;

      case 'openBarracks': {
        const barracks = state.buildings.find((b) => b.type === 'doanhTrai');
        if (barracks) {
          if (mode.kind !== 'view') exitMode();
          play('tap');
          select(barracks.id);
        }
        return;
      }

      case 'closeSheet':
        select(null);
        return;

      case 'openCampaign':
        if (mode.kind !== 'view') exitMode();
        select(null);
        play('tap');
        hud.showCampaign(state);
        return;

      case 'march': {
        const r = startStage(state, a.stage, a.army, a.rows);
        if (!r.ok) return fail(r.reason);
        play('claim');
        navigator.vibrate?.(40);
        commit();
        return;
      }

      case 'useRally': {
        const battle = state.campaign.battle ?? (state.raid.phase === 'battle' ? state.raid.battle : null);
        if (!battle || !useSkill(battle, 'trongTran')) return;
        play('claim');
        commit();
        return;
      }

      case 'retreat':
        if (!retreat(state).ok) return;
        play('tap');
        commit();
        return;

      case 'leaveField':
      case 'fieldToMap':
        leaveBattlefield(state);
        hud.closeStageResult();
        play('tap');
        commit();
        if (a.kind === 'fieldToMap') hud.showCampaign(state);
        return;
    }
  }

  // ---------- Khởi động và vòng lặp ----------

  const offline = applyOffline(state, Date.now());
  commit();
  showOfflineIfLong(offline.ms, offline.gained);
  if (state.raid.lastResult) hud.showRaidResult(state, state.raid.lastResult);

  /** Theo dõi giai đoạn giặc để phát âm thanh, hiện cảnh báo và bảng kết quả đúng lúc. */
  let shownPhase = state.raid.phase;
  const watchRaid = () => {
    const phase = state.raid.phase;
    world.setRaidWarning(phase === 'warning' ? state.raid.side : null);
    if (phase === shownPhase) return;
    if (phase === 'warning') {
      play('claim');
      navigator.vibrate?.([60, 80, 60]);
    }
    if (phase === 'battle') play('claim');
    if (phase === 'idle' && shownPhase === 'battle' && state.raid.lastResult) {
      play(state.raid.lastResult.won ? 'upgrade' : 'error');
      commit();
      hud.showRaidResult(state, state.raid.lastResult);
    }
    shownPhase = phase;
  };

  /** Sang bãi chiến khi xuất quân, về kinh đô khi xem xong kết quả, hiện bảng kết quả đúng một lần. */
  let shownStage: StageResult | null = null;
  const watchCampaign = () => {
    const battle = state.campaign.battle;
    if (battle && !world.inField) {
      if (mode.kind !== 'view') exitMode();
      select(null);
      hud.closeCampaign();
      world.showField(STAGES[battle.wave - 1].terrain);
    } else if (!battle && world.inField) {
      world.showField(null);
      hud.closeStageResult();
    }
    const r = state.campaign.lastResult;
    if (r && r !== shownStage) {
      play(r.outcome === 'win' ? 'upgrade' : 'error');
      commit();
      hud.showStageResult(r);
    }
    shownStage = r;
  };

  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('resize', () => world.resize());
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (hud.campaignOpen) hud.closeCampaign();
    else if (mode.kind === 'view') select(null);
    else exitMode();
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

    world.updateBattle(state.raid.battle, dt);
    watchCampaign();
    world.updateField(state.campaign.battle, dt);
    world.update(dt);
    watchRaid();
    if (now - lastUi > 250) {
      lastUi = now;
      // Trong trận, công trình có thể bị phá bất cứ lúc nào: vẽ lại cảnh theo state.
      if (state.raid.phase === 'battle') world.sync(state);
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
    camera: (x: number, z: number, zoom: number) => {
      world.view.target.set(x - GRID / 2, 0, z - GRID / 2);
      world.view.zoom = zoom;
      world.view.apply();
    },
    resync: () => {
      world.resetAll();
      world.sync(state);
    },
    advance: (ms: number) => {
      tick(state, ms);
      commit();
    },
  };
}

start();
