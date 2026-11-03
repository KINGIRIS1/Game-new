// Điểm khởi động: nạp game, nối luật chơi với cảnh 3D và giao diện, chạy vòng lặp.

import './style.css';
import { play, setMuted, stopRally, unlockAudio } from './audio/sfx';
import { useSkill } from './game/battle';
import { leaveBattlefield, retreat, startStage, unitAllowed } from './game/campaign';
import { forgeArms } from './game/binhKhi';
import { assignCommander, autoGuard, setGuard } from './game/doanhTrai';
import { forgeNoThan, inChapter3, wallRings } from './game/coLoa';
import { offer } from './game/tet';
import { applyMau } from './game/mau';
import { inChapter4, mergeTowers } from './game/chuong4';
import { feedGiong, forgeGear } from './game/giong';
import { inChapter2, offerGift } from './game/son';
import { buyHuan } from './game/thuThach';
import { markStory, pendingStory } from './game/story';
import { footprintTop } from './game/terrain';
import { BUILDINGS, RESOURCE_IDS, STAGES, UNIT_TYPES, U_NO, isBridge, isDecor, isRoad, type BuildingType, type Cost, type ResourceId, type Row, type SkillId, type UnitType } from './game/defs';
import { CAMPS, benKiaOpen, bridgeSnap, campHero, campTier, canStartCamp, joinVillage, plotAt, poiAt, sendScout, setGarrison, startCamp } from './game/benKia';
import { fmt } from './ui/format';
import {
  canAfford,
  placeUNo,
  repairUNo,
  uNoCount,
  uNoLimit,
  applyOffline,
  markHinted,
  nextHint,
  buildingAt,
  canMove,
  canPlace,
  clearDecorAt,
  findSpot,
  claimQuest,
  createInitialState,
  findBuilding,
  move,
  place,
  acceptOffer,
  autoAssign,
  findBuilding as getBuilding,
  freeDan,
  housing,
  callRaidNow,
  dismissRaidResult,
  nextFloodLevel,
  raiseBuilding,
  raiseTile,
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
import { isOpen, khoanhOf, khoanhWood, openKhoanh, openable } from './game/khoanh';
import { cayDaAt, clearCayDa } from './game/cayDa';
import { GRID, RIVER_START, farBankOf, footOnLand } from './game/map';
import { fromCode, loadFromStorage, saveFileName, saveToStorage, toCode } from './game/save';
import { tomTat } from './game/manVao';
import { TitleDrift } from './render/camera';
import type { KieuNen } from './render/nenDat';
import { HALF, RESOLUTIONS, World, type Resolution } from './render/world';
import { vi } from './text/vi';
import { Hud, buildingName, type HudAction } from './ui/hud';
import { ManVao } from './ui/manVao';
import { preloadThumbs } from './ui/xayDung';

/**
 * Chạm từng ô để dựng lũy, gài bẫy, đắp đê, đắp thành Cổ Loa, trải đường, đặt đồ trang trí một ô, dựng ụ nỏ
 * trên thành (`uNo`); hay đắp đất (`raise`), dọn đường và đồ trang trí (`clear`).
 */
type PaintType = BuildingType | 'raise' | 'clear' | 'uNo';
const PAINTED: BuildingType[] = ['luy', 'bayChong', 'de', 'thanh'];
const isPainted = (type: BuildingType) => PAINTED.includes(type) || (isDecor(type) && BUILDINGS[type].w === 1);

type Mode =
  | { kind: 'view'; selected: number | null }
  | { kind: 'place'; type: BuildingType; x: number; z: number; moving?: number }
  | { kind: 'paint'; type: PaintType }
  /** Đang chọn chòi canh thứ hai để ghép với chòi `from` thành lầu nỏ. */
  | { kind: 'merge'; from: number };

/** Vắng mặt lâu hơn mức này thì hiện bảng báo thu hoạch. */
const OFFLINE_NOTICE_MS = 60_000;
/** Khoảng trống giữa hai khung hình lớn hơn mức này (máy ngủ, chuyển app) được tính là vắng mặt. */
const GAP_AS_OFFLINE_MS = 5_000;
const AUTOSAVE_MS = 10_000;
/** Độ nét lưu riêng trên từng máy, không đi theo mã lưu: máy mạnh máy yếu tự chọn. */
const RESOLUTION_KEY = 'thoi-dai-van-lang/resolution';

function loadResolution(): Resolution {
  try {
    const r = localStorage.getItem(RESOLUTION_KEY);
    return r && Object.keys(RESOLUTIONS).includes(r) ? (r as Resolution) : 'medium';
  } catch {
    return 'medium';
  }
}

function saveResolution(r: Resolution): void {
  try {
    localStorage.setItem(RESOLUTION_KEY, r);
  } catch {
    // Không lưu được thì lần sau dùng lại mức mặc định.
  }
}

/** Chờ trình duyệt vẽ xong một khung, để màn hình vào game kịp hiện trước khi dựng cảnh 3D (việc nặng, chạy liền một mạch). */
const nextPaint = () => new Promise<void>((done) => requestAnimationFrame(() => setTimeout(done, 0)));

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
  const hudRoot = document.querySelector<HTMLElement>('#hud')!;

  let state: GameState = loadFromStorage(localStorage) ?? createInitialState(Date.now());
  setMuted(state.settings.muted);

  // Màn hình vào game hiện ngay; nút Chơi tiếp chỉ bấm được khi cảnh đã dựng xong (`manVao.ready`).
  const manVao = new ManVao(document.body, state.settings.muted, {
    enter: () => enter(),
    mute: () => {
      state.settings.muted = !state.settings.muted;
      setMuted(state.settings.muted);
      saveToStorage(localStorage, state);
      return state.settings.muted;
    },
  });
  await nextPaint();

  let world: World;
  try {
    world = new World(canvas);
  } catch {
    document.body.innerHTML = `<div class="fatal">${vi.ui.webglFailed}</div>`;
    return;
  }
  world.setResolution(loadResolution());

  let mode: Mode = { kind: 'view', selected: null };
  let saveWarned = false;

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

  /** Công trình mới vừa mở (`NEW_HINTS`): Lạc hầu gợi ý một lần, để lâu cho kịp đọc. */
  const showHint = () => {
    const type = nextHint(state);
    if (!type) return;
    markHinted(state, type);
    const text = vi.ui.newHint[type];
    if (text) hud.toast(text, false, 8000);
  };

  /** Cây dại, tảng đá đầu tiên mọc: Lạc hầu gợi ý một lần cách dọn. */
  const showCayDaHint = () => {
    if (!state.cayDa.list.length || state.hinted.includes('cayDa')) return;
    state.hinted = [...state.hinted, 'cayDa'];
    hud.toast(vi.ui.cayDaHint, false, 8000);
  };

  /** Chạm vào cây dại, tảng đá ở (x, z): dân dọn, được chút gạo hay đất đá. */
  const clearGrowth = (x: number, z: number) => {
    const r = clearCayDa(state, x, z);
    if (!r.ok) return fail(r.reason);
    play('claim');
    select(null);
    const got = rewardText(r.value.gained);
    hud.toast(`${vi.ui.cayDaCleared[r.value.kind]}: ${got || vi.ui.cayDaFull}`);
    commit();
  };

  /** Gọi sau mọi thao tác: lưu, vẽ lại cảnh và giao diện. */
  const commit = () => {
    showHint();
    showCayDaHint();
    save();
    world.sync(state);
    refreshFloodPreview();
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
    const check = mode.moving !== undefined ? canMove(state, mode.moving, mode.x, mode.z) : canPlace(state, mode.type, mode.x, mode.z);
    world.setGhost(mode.type, mode.x, mode.z, check.ok, footprintTop(state, mode.type, mode.x, mode.z));
    hud.setPlaceValid(check.ok, check.ok ? undefined : vi.reasons[check.reason]);
  };

  /** Tô xanh vùng sẽ ngập ở mùa lũ tới: khi đắp đê, đắp đất, và lúc trinh sát báo lũ. */
  const refreshFloodPreview = () => {
    const painting = mode.kind === 'paint' && (mode.type === 'de' || mode.type === 'raise');
    const warning = state.raid.phase === 'warning' && state.raid.foe === 'thuy';
    world.setFloodPreview(painting || warning ? state : null, nextFloodLevel(state));
  };

  /** Tìm chỗ đặt được gần tâm màn hình nhất, ưu tiên chỗ thoáng, để bóng công trình hiện ra ở chỗ hợp lý. */
  const nearestSpot = (type: BuildingType): { x: number; z: number } => {
    const def = BUILDINGS[type];
    const c = world.screenCenterTile();
    const guess = { x: c.x - Math.floor((def.w - 1) / 2), z: c.z - Math.floor((def.d - 1) / 2) };
    return findSpot(state, type, c) ?? (isBridge(type) ? bridgeSnap(type, guess.x, guess.z) : guess);
  };

  const exitMode = () => {
    mode = { kind: 'view', selected: null };
    world.setGhost(null);
    world.setSelection(null);
    world.showGrid(false);
    hud.setMode('view');
    refreshFloodPreview();
  };

  const select = (id: number | null) => {
    const b = id === null ? undefined : findBuilding(state, id);
    mode = { kind: 'view', selected: b ? b.id : null };
    world.setSelection(b ?? null);
    world.setChunkSelection(null);
    if (b) {
      hud.showBuilding(state, b.id);
      const c = hud.freeCenter();
      world.focusOn(b, c.x, c.y);
    } else {
      hud.closeSheet();
    }
  };

  /** Quân đang hành quân qua cầu tới đồn giặc: chừng ba giây rồi mới sang bãi chiến. */
  let marching: { plot: number; army: Record<UnitType, number>; rows: Record<UnitType, Row>; at: number } | null = null;
  const MARCH_MS = 3200;

  world.view.onTap = (cx, cy) => {
    // Trên bãi chiến chỉ xem, không chọn gì; đang hành quân cũng vậy.
    if (world.inField || marching) return;
    const hero: string | null = mode.kind === 'view' ? world.pickHero(cx, cy) : null;
    if (hero) {
      play('tap');
      select(null);
      if (hero === 'giong') hud.showGiong(state);
      else if (hero === 'adv') hud.showAdv(state);
      else if (hero === 'caoLo') hud.showCaoLo(state);
      else hud.showSon(state);
      return;
    }
    const tile = world.pickTile(cx, cy);
    // Chạm vào cây dại, tảng đá (trúng mô hình, hay trúng ô của nó mà không có công trình): dân dọn đi.
    if (mode.kind === 'view') {
      const growth = world.pickCayDa(cx, cy) ?? (tile && !buildingAt(state, tile.x, tile.z) && cayDaAt(state, tile.x, tile.z) ? tile : null);
      if (growth) return clearGrowth(growth.x, growth.z);
    }
    if (mode.kind === 'place') {
      if (!tile) return;
      const def = BUILDINGS[mode.type];
      // Cầu bám theo sông: chạm đâu thì cầu dịch dọc sông tới đó.
      if (isBridge(mode.type)) {
        const at = bridgeSnap(mode.type, tile.x - (def.w - 1) / 2, tile.z - (def.d - 1) / 2);
        mode.x = at.x;
        mode.z = at.z;
        play('tap');
        updateGhost();
        return;
      }
      // Chạm vào ô sát bờ thì đẩy công trình lùi vào đất liền thay vì chìa xuống sông; chạm bên kia sông thì đặt bên kia.
      const at = footOnLand(tile.x, tile.z, def.w, def.d);
      mode.x = at.x;
      mode.z = at.z;
      play('tap');
      updateGhost();
      return;
    }
    if (mode.kind === 'paint') {
      if (!tile) return;
      if (mode.type === 'clear') {
        const r = clearDecorAt(state, tile.x, tile.z);
        if (!r.ok) return fail(r.reason);
        play('tap');
        hud.setHint(vi.ui.cleared(buildingName(r.value)));
        commit();
        return;
      }
      if (mode.type === 'raise') {
        const r = raiseTile(state, tile.x, tile.z);
        if (!r.ok) return fail(r.reason);
        play('place');
        hud.setHint(vi.ui.raisedTile(r.value));
        commit();
        return;
      }
      if (mode.type === 'uNo') {
        const r = placeUNo(state, tile.x, tile.z);
        if (!r.ok) return fail(r.reason);
        play('place');
        hud.setHint(vi.ui.uNoHint(uNoCount(state), uNoLimit(state)));
        commit();
        return;
      }
      const r = place(state, mode.type, tile.x, tile.z);
      if (!r.ok) return fail(r.reason);
      play('place');
      if (mode.type === 'thanh') hud.setHint(vi.ui.citadelHint(wallRings(state)));
      commit();
      return;
    }
    const id = world.pickBuildingId(cx, cy) ?? (tile ? buildingAt(state, tile.x, tile.z)?.id : undefined) ?? null;
    if (mode.kind === 'merge') {
      if (id === null) return;
      const r = mergeTowers(state, mode.from, id);
      if (!r.ok) return fail(r.reason);
      play('upgrade');
      hud.toast(vi.ui.merged);
      exitMode();
      commit();
      world.pop(r.value.id);
      select(r.value.id);
      return;
    }
    // Chạm vào đất bên kia sông (từ khi Điện đủ cấp mở chuyện bên kia): mở bảng Đất bên kia sông.
    const far = id === null && tile ? plotAt(tile.x, tile.z) : null;
    if (far !== null && benKiaOpen(state) && !isOpen(state, tile!.x, tile!.z)) {
      select(null);
      play('tap');
      world.setFarSelection(far);
      hud.showBenKia(state, far);
      return;
    }
    // Chạm vào rừng chưa phát: mở bảng Khoảnh rừng (dải rừng ngoài cùng thì không phát được).
    if (id === null && tile && !isOpen(state, tile.x, tile.z) && tile.x < RIVER_START && tile.z < RIVER_START) {
      const k = khoanhOf(tile.x, tile.z);
      select(null);
      play('tap');
      if (k < 0) {
        hud.toast(vi.ui.rungThieng);
        return;
      }
      world.setChunkSelection(k);
      hud.showKhoanh(state, k);
      return;
    }
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
        if (isPainted(a.type)) {
          mode = { kind: 'paint', type: a.type };
          const hint = isRoad(a.type)
            ? vi.ui.roadHint
            : isDecor(a.type)
              ? vi.ui.decorHint
              : a.type === 'luy'
                ? vi.ui.wallHint
                : a.type === 'de'
                  ? vi.ui.dikeHint
                  : a.type === 'thanh'
                    ? vi.ui.citadelHint(wallRings(state))
                    : vi.ui.trapHint;
          hud.setMode('paint', true, hint);
          refreshFloodPreview();
          if (a.type === 'de') hud.toast(vi.ui.floodPreview(nextFloodLevel(state)));
          return;
        }
        mode = { kind: 'place', type: a.type, ...nearestSpot(a.type) };
        hud.setMode('place');
        updateGhost();
        // Chỗ đặt ở bờ khác chỗ đang nhìn (đồn biên chỉ dựng bên kia sông): lướt camera tới đó.
        const seen = world.screenCenterTile();
        if (farBankOf(mode.x, mode.z) !== farBankOf(seen.x, seen.z)) {
          const c = hud.freeCenter();
          world.focusOn({ type: a.type, x: mode.x, z: mode.z }, c.x, c.y);
        }
        if (isBridge(a.type)) hud.toast(vi.ui.bridgeHint);
        return;
      }

      case 'confirmPlace': {
        if (mode.kind !== 'place') return;
        if (mode.moving !== undefined) {
          const m = move(state, mode.moving, mode.x, mode.z);
          if (!m.ok) return fail(m.reason);
          play('place');
          hud.toast(vi.ui.moved(buildingName(m.value)));
          exitMode();
          commit();
          world.pop(m.value.id);
          return;
        }
        const r = place(state, mode.type, mode.x, mode.z);
        if (!r.ok) return fail(r.reason);
        play('place');
        hud.toast(vi.ui.placed(buildingName(r.value)));
        exitMode();
        commit();
        world.pop(r.value.id);
        return;
      }

      case 'rotateView':
        // Xoay góc nhìn kinh đô 90°; bãi chiến phó bản không xoay.
        if (world.inField) return;
        play('tap');
        world.rotateView(1);
        return;

      case 'marchCamp': {
        const check = canStartCamp(state, a.plot);
        if (!check.ok) return fail(check.reason);
        if (UNIT_TYPES.every((k) => !a.army[k]) && !campHero(state, a.plot)) return fail('chuaChonQuan');
        hud.closeSheet();
        select(null);
        play('claim');
        navigator.vibrate?.(40);
        hud.toast(vi.benKia.campMarching);
        world.startMarch(state, a.plot, a.army, MARCH_MS / 1000);
        marching = { plot: a.plot, army: a.army, rows: a.rows, at: performance.now() + MARCH_MS };
        return;
      }

      case 'ketThan': {
        const r = joinVillage(state, a.id);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        const poi = poiAt(a.id);
        if (poi?.kind === 'lang') hud.toast(vi.benKia.villageToast(vi.benKia.lang[poi.nghe].name));
        commit();
        hud.refreshSheet(state);
        return;
      }

      case 'trinhSat': {
        const r = sendScout(state, a.id);
        if (!r.ok) return fail(r.reason);
        play('place');
        hud.toast(vi.benKia.scoutSent);
        commit();
        hud.refreshSheet(state);
        return;
      }

      case 'phatRung': {
        const r = openKhoanh(state, a.id);
        if (!r.ok) return fail(r.reason);
        play('place');
        hud.toast(vi.ui.khoanhOpened(khoanhWood(r.value)));
        world.setChunkSelection(null);
        commit();
        return;
      }

      case 'applyMau': {
        // Áp mẫu đổi cả kinh đô: bấm lần đầu chỉ hỏi lại, bấm lần nữa mới áp.
        if (hud.mauArmed !== a.mau) {
          play('tap');
          hud.mauArmed = a.mau;
          hud.refreshSheet(state);
          return;
        }
        hud.mauArmed = null;
        const r = applyMau(state, a.mau);
        if (!r.ok) {
          hud.refreshSheet(state);
          return fail(r.reason);
        }
        play('upgrade');
        hud.toast(vi.ui.mauDone(vi.ui.mau[a.mau].name));
        commit();
        return;
      }

      case 'startMove': {
        const b = findBuilding(state, a.id);
        if (!b) return fail('khongTimThay');
        if (b.type === 'dien') return fail('khongTheDoi');
        if (state.raid.phase !== 'idle') return fail('dangCoGiac');
        hud.closeSheet();
        world.setSelection(null);
        world.showGrid(true);
        play('tap');
        mode = { kind: 'place', type: b.type, x: b.x, z: b.z, moving: b.id };
        hud.setMode('move');
        updateGhost();
        return;
      }

      case 'startMerge': {
        const b = findBuilding(state, a.id);
        if (!b) return fail('khongTimThay');
        if (state.raid.phase !== 'idle') return fail('dangCoGiac');
        hud.closeSheet();
        world.setSelection(b);
        play('tap');
        mode = { kind: 'merge', from: b.id };
        hud.setMode('merge');
        return;
      }

      case 'chooseClear':
        if (mode.kind !== 'view') exitMode();
        hud.closeSheet();
        world.showGrid(true);
        play('tap');
        mode = { kind: 'paint', type: 'clear' };
        hud.setMode('paint', true, vi.ui.clearHint);
        return;

      case 'chooseUNo': {
        if (!inChapter4(state)) return fail('canChuong4');
        if (uNoCount(state) >= uNoLimit(state)) return fail('datGioiHan');
        if (!canAfford(state, U_NO.cost)) return fail('thieuTaiNguyen');
        hud.closeSheet();
        world.showGrid(true);
        play('tap');
        mode = { kind: 'paint', type: 'uNo' };
        hud.setMode('paint', true, vi.ui.uNoHint(uNoCount(state), uNoLimit(state)));
        return;
      }

      case 'placeUNo': {
        const b = findBuilding(state, a.id);
        if (!b) return;
        const r = placeUNo(state, b.x, b.z);
        if (!r.ok) return fail(r.reason);
        play('place');
        hud.toast(vi.ui.uNoPlaced);
        commit();
        select(b.id);
        return;
      }

      case 'repairUNo': {
        const r = repairUNo(state, a.id);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        commit();
        world.pop(r.value.id);
        return;
      }

      case 'chooseRaise':
        if (!inChapter2(state)) return fail('canChuong2');
        hud.closeSheet();
        world.showGrid(true);
        play('tap');
        mode = { kind: 'paint', type: 'raise' };
        hud.setMode('paint', true, vi.ui.dapDatHint);
        refreshFloodPreview();
        hud.toast(vi.ui.floodPreview(nextFloodLevel(state)));
        return;

      case 'raiseBuilding': {
        const r = raiseBuilding(state, a.id);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        hud.toast(vi.ui.raisedBuilding(buildingName(r.value), state.heights[r.value.z * GRID + r.value.x]));
        commit();
        world.pop(r.value.id);
        world.setSelection(r.value);
        return;
      }

      case 'openSon':
        if (mode.kind !== 'view') exitMode();
        select(null);
        play('tap');
        hud.showSon(state);
        return;

      case 'openAdv':
        if (mode.kind !== 'view') exitMode();
        select(null);
        play('tap');
        hud.showAdv(state);
        return;

      case 'openCaoLo':
        if (mode.kind !== 'view') exitMode();
        select(null);
        play('tap');
        hud.showCaoLo(state);
        return;

      case 'openEnding':
        if (hud.storyOpen || hud.modalOpen) return;
        play('tap');
        hud.showStory('hetTruyen', true);
        return;

      case 'forgeNoThan': {
        if (!inChapter3(state)) return fail('canChuong3');
        const r = forgeNoThan(state);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        hud.toast(vi.ui.noThanToast);
        commit();
        return;
      }

      case 'openTet':
        if (mode.kind !== 'view') exitMode();
        select(null);
        play('tap');
        hud.showTet(state);
        return;

      case 'offerBanh': {
        const r = offer(state, a.banh);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        hud.toast(vi.ui.offerToast(vi.ui.bless[a.banh].name));
        commit();
        return;
      }

      case 'forgeArms': {
        const r = forgeArms(state, a.unit);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        hud.toast(vi.ui.armsToast(vi.units[a.unit].name, r.value));
        commit();
        return;
      }

      case 'offerGift': {
        const r = offerGift(state, a.gift);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        hud.toast(vi.ui.giftToast(vi.gifts[a.gift].name));
        commit();
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
            ? vi.ui.dienUp(r.value.level)
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
        hud.showSettings(state, world.resolution);
        return;

      case 'toggleMute':
        state.settings.muted = !state.settings.muted;
        setMuted(state.settings.muted);
        if (state.settings.muted) stopRally();
        save();
        hud.showSettings(state, world.resolution);
        return;

      case 'setResolution':
        world.setResolution(a.resolution);
        saveResolution(a.resolution);
        hud.showSettings(state, a.resolution);
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

      case 'saveFile': {
        // Tệp lưu chứa đúng mã lưu, nên mở tệp ra chép mã cũng được.
        const url = URL.createObjectURL(new Blob([toCode(state)], { type: 'text/plain' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = saveFileName(new Date());
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        hud.toast(vi.ui.downloaded);
        return;
      }

      case 'shareFile': {
        // Gọi ngay trong lúc bấm: Safari chỉ cho mở bảng chia sẻ khi người chơi vừa chạm.
        const file = new File([toCode(state)], saveFileName(new Date()), { type: 'text/plain' });
        navigator.share({ files: [file], title: vi.gameTitle }).catch((err: unknown) => {
          // Người chơi tự đóng bảng chia sẻ thì thôi.
          if (err instanceof DOMException && err.name === 'AbortError') return;
          play('error');
          hud.toast(vi.ui.shareFailed, true);
        });
        return;
      }

      case 'importCode': {
        const loaded = fromCode(a.code);
        if (!loaded) {
          play('error');
          hud.toast(a.file ? vi.ui.fileBad : vi.ui.importBad, true);
          return;
        }
        state = loaded;
        state.lastSeen = Date.now();
        showRelaid();
        setMuted(state.settings.muted);
        world.resetAll();
        hud.closeSheet();
        hud.toast(a.file ? vi.ui.fileLoaded : vi.ui.imported);
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

      case 'assignTuong': {
        const r = assignCommander(state, a.id, a.tuong);
        if (!r.ok) return fail(r.reason);
        play('claim');
        hud.toast(vi.ui.commandAssigned(vi.ui.tuongNames[a.tuong]));
        commit();
        return;
      }

      case 'garrisonDelta': {
        const b = findBuilding(state, a.id);
        const bank = b ? farBankOf(b.x, b.z) : null;
        if (!bank) return;
        const r = setGarrison(state, bank, a.unit, state.benKia.garrison[bank][a.unit] + a.delta);
        if (!r.ok) return fail(r.reason);
        play('tap');
        commit();
        return;
      }

      case 'guardDelta': {
        const r = setGuard(state, a.id, a.unit, a.delta);
        if (!r.ok) return fail(r.reason);
        play('tap');
        commit();
        return;
      }

      case 'guardAuto':
        autoGuard(state);
        play('tap');
        commit();
        return;

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

      case 'selectBuilding':
        if (mode.kind !== 'view') exitMode();
        play('tap');
        select(a.id);
        return;

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
        const r = startStage(state, a.stage, a.army, a.rows, a.challenge);
        if (!r.ok) return fail(r.reason);
        play('claim');
        navigator.vibrate?.(40);
        commit();
        return;
      }

      case 'buyHuan': {
        const r = buyHuan(state, a.branch);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        hud.toast(vi.ui.huanToast(a.branch === 'tuong' ? vi.ui.huanTuong.name : vi.units[a.branch].name, r.value));
        commit();
        return;
      }

      case 'useSkill': {
        const battle = state.campaign.battle ?? (state.raid.phase === 'battle' ? state.raid.battle : null);
        if (!battle || !useSkill(battle, a.skill)) return;
        play(a.skill === 'trongTran' ? 'trongTran' : 'claim');
        navigator.vibrate?.(a.skill === 'trongTran' ? 30 : 60);
        commit();
        return;
      }

      case 'openGiong':
        if (mode.kind !== 'view') exitMode();
        select(null);
        play('tap');
        hud.showGiong(state);
        return;

      case 'feedGiong': {
        const r = feedGiong(state);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        hud.toast(vi.ui.fedToast(r.value));
        commit();
        return;
      }

      case 'forgeGear': {
        const r = forgeGear(state, a.gear);
        if (!r.ok) return fail(r.reason);
        play('upgrade');
        hud.toast(vi.ui.forgedToast(vi.gear[a.gear].name));
        commit();
        return;
      }

      case 'storyDone':
        markStory(state, a.id);
        commit();
        return;

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

  /** Bản lưu vừa nâng từ kinh đô nhỏ: báo một lần kinh đô đã dựng lại và phần của được hoàn. */
  const showRelaid = () => {
    if (!state.relaid) return;
    const refund = (Object.entries(state.relaid.refund) as [ResourceId, number][])
      .filter(([, n]) => n > 0)
      .map(([r, n]) => `${fmt(n)} ${vi.resources[r].icon}`)
      .join(', ');
    delete state.relaid;
    hud.toast(vi.ui.relaid(refund));
  };

  // Dựng cảnh theo bản lưu cho kinh đô hiện sau màn hình vào game. Luật chơi chưa chạy cho tới lúc vào game.
  world.sync(state);
  refreshUi();
  const drift = new TitleDrift(world.view);
  drift.start();
  // Người chơi tự kéo camera lúc đang lướt về thì thôi lướt.
  const userMove = world.view.onUserMove;
  world.view.onUserMove = () => {
    userMove?.();
    drift.done = true;
  };

  let entered = false;
  /** Bấm Chơi tiếp (hay Bắt đầu): thời gian nằm ở màn hình vào game tính như lúc vắng mặt, rồi báo thu hoạch như cũ. */
  const enter = () => {
    if (entered) return;
    entered = true;
    unlockAudio();
    play('vaoGame');
    manVao.close();
    drift.release();
    const offline = applyOffline(state, Date.now());
    showRelaid();
    showHint();
    commit();
    showOfflineIfLong(offline.ms, offline.gained);
    if (state.raid.lastResult) hud.showRaidResult(state, state.raid.lastResult);
    preloadThumbs();
  };

  /** Theo dõi giai đoạn giặc để phát âm thanh, hiện cảnh báo và bảng kết quả đúng lúc. */
  let shownPhase = state.raid.phase;
  const watchRaid = () => {
    const phase = state.raid.phase;
    world.setRaidWarning(phase === 'warning' ? state.raid.side : null);
    if (phase === shownPhase) return;
    refreshFloodPreview();
    if (phase === 'warning') {
      play('claim');
      navigator.vibrate?.([60, 80, 60]);
    }
    if (phase === 'battle') play('claim');
    if (phase === 'idle' && shownPhase === 'battle') stopRally();
    if (phase === 'idle' && shownPhase === 'battle' && state.raid.lastResult) {
      play(state.raid.lastResult.won ? 'upgrade' : 'error');
      commit();
      hud.showRaidResult(state, state.raid.lastResult);
    }
    shownPhase = phase;
  };

  /**
   * Sang bãi chiến khi xuất quân, về kinh đô khi xem xong kết quả, hiện bảng kết quả đúng một lần.
   * Bảng kết quả hiện trễ một chút để kịp thấy đòn cuối; trận cuối chương chờ lâu hơn để xem cảnh kết chương
   * (Gióng bay về trời, núi Tản Viên dâng cao, Rùa Vàng nổi lên dưới chân An Dương Vương hay ở biển Mộ Dạ).
   */
  let shownStage: StageResult | null = null;
  let resultAt = 0;
  const watchCampaign = () => {
    const battle = state.campaign.battle;
    if (battle && !world.inField) {
      if (mode.kind !== 'view') exitMode();
      select(null);
      hud.closeCampaign();
      const don = battle.camp !== undefined ? campTier(battle.camp) : null;
      world.showField(don ? CAMPS[don].terrain : STAGES[battle.wave - 1].terrain);
    } else if (!battle && world.inField) {
      world.showField(null);
      hud.closeStageResult();
    }
    const r = state.campaign.lastResult;
    const now = performance.now();
    if (!r) {
      shownStage = null;
      resultAt = 0;
      return;
    }
    if (r === shownStage) return;
    if (!resultAt) {
      stopRally();
      resultAt = now + (battle?.ascend || battle?.sonWin || battle?.advWin || battle?.seaWin ? 3500 : 700);
      play(r.outcome === 'win' ? 'upgrade' : 'error');
      commit();
    }
    if (now < resultAt) return;
    shownStage = r;
    resultAt = 0;
    hud.showStageResult(r);
  };

  /** Kể đoạn truyện đến lúc, khi không đang đánh và không có hộp thoại nào khác đang mở. */
  const watchStory = () => {
    if (hud.storyOpen || hud.modalOpen || state.campaign.battle || state.raid.phase === 'battle') return;
    const id = pendingStory(state);
    if (!id) return;
    if (mode.kind !== 'view') exitMode();
    select(null);
    hud.closeCampaign();
    play('claim');
    hud.showStory(id);
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
  let lastCayKey = '';
  let lastKnown = state.benKia.known.length;
  let lastSave = prev;
  const frame = (now: number) => {
    const dt = Math.min((now - prev) / 1000, 0.1);
    prev = now;
    drift.update(dt);
    if (!entered) {
      // Đang ở màn hình vào game: chỉ vẽ cảnh, không cho thời gian trôi trong game.
      world.update(dt);
      requestAnimationFrame(frame);
      return;
    }

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

    if (marching && now >= marching.at) {
      // Hành quân xong: sang bãi chiến đánh đồn.
      const m = marching;
      marching = null;
      world.stopMarch();
      const r = startCamp(state, m.plot, m.army, m.rows);
      if (!r.ok) fail(r.reason);
      commit();
    }
    world.updateFlood(state);
    world.updateBattle(state.raid.battle, dt);
    watchCampaign();
    world.updateField(state.campaign.battle, dt);
    world.update(dt);
    watchRaid();
    if (now - lastUi > 250) {
      lastUi = now;
      // Trong trận, công trình có thể bị phá bất cứ lúc nào: vẽ lại cảnh theo state.
      if (state.raid.phase === 'battle') world.sync(state);
      // Cây dại, tảng đá mọc theo đồng hồ chơi: mọc thêm thì vẽ (trang trí ô trống né chỗ ấy) và gợi ý lần đầu.
      const cayKey = `${state.cayDa.seq}:${state.cayDa.list.length}`;
      if (cayKey !== lastCayKey) {
        lastCayKey = cayKey;
        world.sync(state);
        showCayDaHint();
      }
      // Trinh sát về tới nơi: đất bên kia hiện ra thêm.
      if (state.benKia.known.length !== lastKnown) {
        if (state.benKia.known.length > lastKnown && !state.benKia.scouts.length) hud.toast(vi.benKia.scoutBack);
        lastKnown = state.benKia.known.length;
        world.sync(state);
      }
      refreshUi();
      watchStory();
    }
    if (now - lastSave > AUTOSAVE_MS) {
      lastSave = now;
      save();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  manVao.ready(tomTat(state, Date.now()));

  // Cho phép kiểm thử tự động đọc trạng thái và tìm vị trí ô trên màn hình.
  (window as unknown as { __debug?: object }).__debug = {
    state: () => state,
    /** Bấm qua màn hình vào game, như người chơi bấm Chơi tiếp. */
    enter: () => enter(),
    tileToScreen: (x: number, z: number) => world.tileToScreen(x, z),
    renderInfo: () => ({ ...world.renderer.info.render }),
    rotate: (dir: 1 | -1) => world.rotateView(dir),
    camera: (x: number, z: number, zoom: number) => {
      world.view.target.set(x - HALF, 0, z - HALF);
      world.view.zoom = zoom;
      world.view.apply();
    },
    /** Đổi kiểu nền đất (bản dùng thử): 'hop', 'vach', 'vat', 'o'. */
    nen: (kieu: KieuNen) => world.setNen(kieu),
    resync: () => {
      world.resetAll();
      world.sync(state);
    },
    advance: (ms: number) => {
      tick(state, ms);
      commit();
    },
    place: (type: BuildingType, x: number, z: number) => {
      const r = place(state, type, x, z);
      commit();
      return r;
    },
    /** Chỉ chạy cảnh quân hành quân qua cầu tới đồn ở khoảnh `plot` (không vào trận), để chụp thử. */
    marchPreview: (plot: number, army: Record<UnitType, number>, secs = 8) => world.startMarch(state, plot, army, secs),
    /** Điều quân đánh đồn ở khoảnh `plot` ngay (bỏ qua cảnh hành quân), để chụp thử bãi chiến bờ bên kia. */
    camp: (plot: number) => {
      const r = startCamp(state, plot, { ...state.troops }, state.campaign.rows);
      commit();
      return r;
    },
    /** Mở bảng Đất bên kia sông của khoảnh bên kia `id`, như khi chạm vào đất ấy. */
    benKia: (id: number) => {
      select(null);
      world.setFarSelection(id);
      hud.showBenKia(state, id);
    },
    /** Các khoảnh rừng phát được; `khoanh(id)` mở bảng Khoảnh rừng như khi chạm vào khoảnh ấy. */
    openable: () => openable(state),
    khoanh: (id: number) => {
      select(null);
      world.setChunkSelection(id);
      hud.showKhoanh(state, id);
    },
    /** Xuất toàn quân đánh màn `n`, rồi `skill(k)` để bấm kỹ năng: chụp thử trận ngoài bãi. */
    march: (n: number, challenge = false) => {
      // Thử thách Hai binh chủng: chỉ mang hai binh chủng được chỉ định.
      const army = { ...state.troops };
      for (const k of UNIT_TYPES) if (!unitAllowed(n, challenge, k)) army[k] = 0;
      const r = startStage(state, n, army, state.campaign.rows, challenge);
      commit();
      return r;
    },
    skill: (k: SkillId) => {
      const battle = state.campaign.battle ?? state.raid.battle;
      return !!battle && useSkill(battle, k);
    },
  };
}

void start();
