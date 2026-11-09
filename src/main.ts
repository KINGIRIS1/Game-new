// Điểm khởi động: nạp game, nối luật chơi với cảnh 3D và giao diện, chạy vòng lặp.

import './style.css';
import { play, setMuted, stopRally, unlockAudio } from './audio/sfx';
import { skillReady, useSkill, type HeroKind } from './game/battle';
import { attackFrom, beginPvp, canPractice, lootPvp, pushInput, scorePvp, stepPvp, validateArmy, type PvpRun } from './game/dauThanh';
import { leaveBattlefield, markBaiHinted, needsBaiHint, retreat, startStage, unitAllowed } from './game/campaign';
import { forgeArms } from './game/binhKhi';
import { autoGuard, fieldCap, fitArmy, setGuard } from './game/doanhTrai';
import { markNuHinted, nextNuHint } from './game/nuTuong';
import { forgeNoThan, inChapter3, wallRings } from './game/coLoa';
import { offer } from './game/tet';
import { startMau } from './game/mau';
import { advanceXay, askQuiz, canStartBuild, cancelJob, conLai, startBuild, startUpgrade, startWallUpgrade, startWalls, thoRanh, thoRanhSau, traLoi, viecOf, xayMs, type CongViec } from './game/xay';
import { CAU_DO_IDS } from './text/cauDo';
import { jobDoneText } from './ui/xay';
import { inChapter4, mergeTowers } from './game/chuong4';
import { feedGiong, forgeGear } from './game/giong';
import { inChapter2, offerGift } from './game/son';
import { buyHuan } from './game/thuThach';
import { markStory, pendingStory } from './game/story';
import { footprintTop } from './game/terrain';
import { BUILDINGS, QUIZ_TURNS, RESOURCE_IDS, STAGES, UNIT_TYPES, U_NO, isBridge, isDecor, isRoad, type BuildingType, type Cost, type NuTuongId, type ResourceId, type Row, type SkillId, type UnitType } from './game/defs';
import { CAMPS, benKiaOpen, bridgeSnap, campHero, campTier, canStartCamp, joinVillage, plotAt, poiAt, sendScout, setGarrison, startCamp } from './game/benKia';
import type { QuanDaoId } from './game/bien';
import type { Buoi } from './game/ngayDem';
import { fmt } from './ui/format';
import {
  canAfford,
  dienLevel,
  placeUNo,
  repairUNo,
  uNoCount,
  uNoLimit,
  applyOffline,
  markHinted,
  nextHint,
  buildingAt,
  canMove,
  occupant,
  pendingAt,
  canRotateType,
  placeLine,
  planLine,
  rotOf,
  rotateBuilding,
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
  setCong,
  setWorkers,
  train,
  tick,
  type FailReason,
  type GameState,
  type StageResult,
} from './game/game';
import { isOpen, khoanhOf, khoanhWood, openKhoanh, openable } from './game/khoanh';
import { cayDaAt, clearCayDa } from './game/cayDa';
import { GRID, RIVER_START, farBankOf, footOnLand, lineTiles, rectTiles } from './game/map';
import { fromCode, loadFromStorage, saveFileName, saveToStorage, toCode } from './game/save';
import { chapterOf, tomTat } from './game/manVao';
import { TitleDrift } from './render/camera';
import { HALF, RESOLUTIONS, World, type Resolution } from './render/world';
import { formatClock, formatXay, vi } from './text/vi';
import { Hud, buildingName, type HudAction, type WallShape } from './ui/hud';
import { khoNanTk, luuSau, moKhoNan } from './render/nanKho';
import { KHO_PHIEN_BAN, moSanWorker, nanTruoc, prewarmJobs } from './render/nanTruoc';
import { ManVao } from './ui/manVao';
import { preloadThumbs } from './ui/xayDung';
import { dauResultHtml, targetSnapshot } from './ui/dauThanh';

/**
 * Chạm từng ô để dựng lũy, gài bẫy, đắp đê, đắp thành Cổ Loa, trải đường, đặt đồ trang trí một ô, dựng ụ nỏ
 * trên thành (`uNo`); hay đắp đất (`raise`), dọn đường và đồ trang trí (`clear`).
 */
type PaintType = BuildingType | 'raise' | 'clear' | 'uNo';
const PAINTED: BuildingType[] = ['luy', 'bayChong', 'de', 'thanh'];
const isPainted = (type: BuildingType) => PAINTED.includes(type) || (isDecor(type) && BUILDINGS[type].w === 1);
/** Tường (lũy, bẫy, đê, thành Cổ Loa): kéo thả đắp cả dải hay cả khung. */
const isWall = (type: PaintType) => PAINTED.includes(type as BuildingType);
/** Kéo một ngón để trải, đắp cả dải: đường đi và tường. */
const isDragged = (type: PaintType) => isWall(type) || isRoad(type as BuildingType);

type Mode =
  | { kind: 'view'; selected: number | null }
  /** Đặt mới hay dời (`moving`): góc móng (x, z), hướng xoay `rot` (số nấc 90°, chỉ loại xoay được). */
  | { kind: 'place'; type: BuildingType; x: number; z: number; rot: number; moving?: number }
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
/** Ngày đêm bật hay tắt (luôn ban ngày), lưu riêng trên từng máy như độ nét. */
const NGAY_DEM_KEY = 'thoi-dai-van-lang/ngay-dem';
/** Bóng đổ bật hay tắt (máy yếu tắt cho nhẹ), lưu riêng trên từng máy như độ nét. */
const BONG_DO_KEY = 'thoi-dai-van-lang/bong-do';
/** Cách kéo đắp tường lần trước (dải thẳng hay khung chữ nhật), lưu riêng trên từng máy. */
const WALL_SHAPE_KEY = 'thoi-dai-van-lang/wall-shape';

function loadWallShape(): WallShape {
  try {
    return localStorage.getItem(WALL_SHAPE_KEY) === 'rect' ? 'rect' : 'line';
  } catch {
    return 'line';
  }
}

function saveWallShape(shape: WallShape): void {
  try {
    localStorage.setItem(WALL_SHAPE_KEY, shape);
  } catch {
    // Không lưu được thì lần sau kéo dải thẳng như mặc định.
  }
}

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

function loadNgayDem(): boolean {
  try {
    return localStorage.getItem(NGAY_DEM_KEY) !== 'tat';
  } catch {
    return true;
  }
}

function loadBongDo(): boolean {
  try {
    return localStorage.getItem(BONG_DO_KEY) !== 'tat';
  } catch {
    return true;
  }
}

function saveBongDo(on: boolean): void {
  try {
    localStorage.setItem(BONG_DO_KEY, on ? 'bat' : 'tat');
  } catch {
    // Không lưu được thì lần sau bóng đổ bật như mặc định.
  }
}

function saveNgayDem(on: boolean): void {
  try {
    localStorage.setItem(NGAY_DEM_KEY, on ? 'bat' : 'tat');
  } catch {
    // Không lưu được thì lần sau ngày đêm bật như mặc định.
  }
}

/** Chờ trình duyệt vẽ xong một khung, để màn hình vào game kịp hiện trước khi dựng cảnh 3D (việc nặng, chạy liền một mạch). */
const nextPaint = () => new Promise<void>((done) => requestAnimationFrame(() => setTimeout(done, 0)));

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
  const hudRoot = document.querySelector<HTMLElement>('#hud')!;

  moSanWorker();
  let state: GameState = loadFromStorage(localStorage) ?? createInitialState(Date.now());
  setMuted(state.settings.muted);
  // Worker nặn sẵn nhân vật của chương đang chơi, song song với việc dựng cảnh, để quân mới ra trận khỏi khựng hình.
  // Sang chương mới, rèn binh khí bậc mới, Điện ra tới biển thì nặn thêm (`prewarm` ở vòng lặp). Gọi sau khi mở kho
  // hình nặn, để bỏ qua việc kho đã có đủ dáng.
  let prewarmKey = '';
  const prewarm = () => {
    const sea = dienLevel(state) >= 8;
    const key = `${chapterOf(state)}|${Object.values(state.arms).join()}|${sea}`;
    if (key === prewarmKey) return;
    prewarmKey = key;
    nanTruoc(prewarmJobs(chapterOf(state), state.arms, sea));
  };

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
  // Kho hình nặn của lần chơi trước (IndexedDB): dân, tướng đứng chầu lấy ra dùng ngay, khỏi nặn lại lúc dựng cảnh.
  await moKhoNan(KHO_PHIEN_BAN);
  prewarm();

  let world: World;
  try {
    world = new World(canvas);
  } catch {
    document.body.innerHTML = `<div class="fatal">${vi.ui.webglFailed}</div>`;
    return;
  }
  world.setResolution(loadResolution());
  world.setNgayDem(loadNgayDem(), true);
  world.setBongDo(loadBongDo());

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

  /** Nữ tướng vừa theo về (chương 5): Lạc hầu báo một lần, để lâu cho kịp đọc. */
  const showNuHint = () => {
    const nu = nextNuHint(state);
    if (!nu) return;
    markNuHinted(state, nu);
    hud.toast(vi.nuTuong.hint[nu], false, 8000);
  };

  /** Trận ngoài bãi đầu tiên có vật cản: thẻ màn, thẻ đồn thôi kèm lời Lạc hầu nhắc về vật cản. */
  const seenBai = () => {
    if (needsBaiHint(state)) markBaiHinted(state);
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

  /** Việc xây đang làm lần xét trước (theo id), để báo khi một việc xong hết. */
  let jobsSeen = new Map<number, CongViec>();
  let lastXaySeq = state.xay.seq;
  /**
   * Thợ xong phần việc nào (`xay.seq` đổi): vẽ lại cảnh, báo việc đã xong hết. `quiet`: sau lúc vắng thì không báo
   * từng việc (bảng báo lúc vắng đã ghi số việc xong).
   */
  const watchXay = (quiet = false) => {
    const now = new Map(viecOf(state).map((v) => [v.id, v]));
    if (state.xay.seq !== lastXaySeq) {
      lastXaySeq = state.xay.seq;
      const done = [...jobsSeen.values()].filter((v) => !now.has(v.id));
      if (!quiet && done.length) {
        play('upgrade');
        for (const v of done) hud.toast(jobDoneText(state, v));
      }
      commit();
      if (!quiet) for (const v of done) for (const p of v.o) world.pop(p.id);
    }
    jobsSeen = now;
  };

  /** Gọi sau mọi thao tác: lưu, vẽ lại cảnh và giao diện. */
  const commit = () => {
    showHint();
    showNuHint();
    showCayDaHint();
    seenBai();
    save();
    world.sync(scene());
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

  const showOfflineIfLong = (ms: number, gained: ReturnType<typeof applyOffline>['gained'], built = 0) => {
    if (ms >= OFFLINE_NOTICE_MS && (built > 0 || RESOURCE_IDS.some((r) => gained[r] >= 1))) hud.showOffline(ms, gained, built);
  };

  // ---------- Chế độ đặt công trình ----------

  /** Hướng xoay vừa chọn khi đặt mỗi loại: dựng tiếp cùng loại thì giữ hướng ấy. */
  const lastRot: Partial<Record<BuildingType, number>> = {};

  /** Đang dời mà vẫn ở chỗ cũ, chỉ đổi hướng: xoay tại chỗ, không tốn của. */
  const onlyTurning = () => {
    if (mode.kind !== 'place' || mode.moving === undefined) return false;
    const b = findBuilding(state, mode.moving);
    return !!b && b.x === mode.x && b.z === mode.z && rotOf(b) !== mode.rot;
  };

  const updateGhost = () => {
    if (mode.kind !== 'place') return;
    const check = onlyTurning()
      ? { ok: true as const }
      : mode.moving !== undefined
        ? canMove(state, mode.moving, mode.x, mode.z)
        : canStartBuild(state, mode.type, mode.x, mode.z);
    world.setGhost(mode.type, mode.x, mode.z, check.ok, footprintTop(state, mode.type, mode.x, mode.z), mode.rot);
    hud.setPlaceValid(check.ok, check.ok ? undefined : vi.reasons[check.reason]);
  };

  /**
   * Tô vùng sẽ ngập ở mùa lũ tới (xanh là nước tràn, vàng là nước vào qua cống mở): khi đắp đê, đắp đất, đặt cống,
   * xem bảng một cống, và lúc trinh sát báo lũ.
   */
  const refreshFloodPreview = () => {
    const painting = (mode.kind === 'paint' && (mode.type === 'de' || mode.type === 'raise')) || (mode.kind === 'place' && mode.type === 'congDe');
    const gate = mode.kind === 'view' && mode.selected !== null && findBuilding(state, mode.selected)?.type === 'congDe';
    const warning = state.raid.phase === 'warning' && state.raid.foe === 'thuy';
    world.setFloodPreview(painting || gate || warning ? state : null, nextFloodLevel(state));
  };

  /** Tìm chỗ đặt được gần tâm màn hình nhất, ưu tiên chỗ thoáng, để bóng công trình hiện ra ở chỗ hợp lý. */
  const nearestSpot = (type: BuildingType): { x: number; z: number } => {
    const def = BUILDINGS[type];
    const c = world.screenCenterTile();
    const guess = { x: c.x - Math.floor((def.w - 1) / 2), z: c.z - Math.floor((def.d - 1) / 2) };
    return findSpot(state, type, c) ?? (isBridge(type) ? bridgeSnap(type, guess.x, guess.z) : guess);
  };

  const exitMode = () => {
    world.view.drawMode = false;
    world.view.stopDrawing();
    world.setLinePreview(null);
    mode = { kind: 'view', selected: null };
    world.setGhost(null);
    world.setSelection(null);
    world.showGrid(false);
    hud.setMode('view');
    refreshFloodPreview();
  };

  const select = (id: number | null) => {
    // Công trình đang dựng mới (chưa vào kinh đô) cũng chọn được: bảng của nó chỉ có việc xây.
    const b = id === null ? undefined : occupant(state, id);
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
    refreshFloodPreview();
  };

  /**
   * Trận Đấu thành đang đánh thử (không nằm trong state, không lưu): trận, tên kinh đô bị đánh, camera trước trận để
   * về lại đúng chỗ, lúc trận xong (để bảng kết quả hiện trễ một chút cho kịp thấy đòn cuối).
   */
  let pvp: { run: PvpRun; name: string; cam: { x: number; z: number; zoom: number }; doneAt: number; shown: boolean } | null = null;
  /** Cảnh đang vẽ: kinh đô bị đánh khi đang Đấu thành, không thì kinh đô của mình. */
  function scene(): GameState {
    return pvp?.run.def ?? state;
  }

  /** Quân đang hành quân qua cầu tới đồn giặc: chừng ba giây rồi mới sang bãi chiến. */
  let marching: { plot: number; army: Record<UnitType, number>; rows: Record<UnitType, Row>; nu: NuTuongId | null; at: number } | null = null;
  const MARCH_MS = 3200;

  world.view.onTap = (cx, cy) => {
    // Trên bãi chiến chỉ xem, không chọn gì; đang hành quân, đang Đấu thành cũng vậy.
    if (world.inField || marching || pvp) return;
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
    // Chạm vào đảo ngoài biển Đông: bảng quần đảo.
    const dao = mode.kind === 'view' ? world.pickIsland(cx, cy) : null;
    if (dao) {
      play('tap');
      select(null);
      hud.showQuanDao(state, dao);
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
      // Tường chạm từng ô: mỗi ô một việc cho một tốp thợ. Đường, đồ trang trí xong ngay.
      if (xayMs(mode.type as BuildingType, 1) > 0) {
        const w = startWalls(state, mode.type as BuildingType, [tile]);
        if (!w.job) return fail(w.reason ?? 'datBiChiem');
        play('place');
        hud.setHint(vi.ui.wallStarted(w.n, formatClock(conLai(state, w.job)), !!thoRanh(state)));
        commit();
        return;
      }
      const r = place(state, mode.type, tile.x, tile.z);
      if (!r.ok) return fail(r.reason);
      play('place');
      commit();
      return;
    }
    const id =
      world.pickBuildingId(cx, cy) ?? (tile ? (buildingAt(state, tile.x, tile.z) ?? pendingAt(state, tile.x, tile.z))?.id : undefined) ?? null;
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

  // ---------- Kéo thả trải đường ----------

  /** Dải ô đang kéo (ô đầu, ô cuối), và chỗ ngón đang ở chờ xét ở khung hình sau (xét mỗi khung một lần cho nhẹ máy). */
  let drag: { from: { x: number; z: number }; tiles: { x: number; z: number }[] } | null = null;
  let dragAt: { fx: number; fy: number; tx: number; ty: number } | null = null;
  let dragFrame = 0;

  /** Giá cả dải, ghi chữ cho dòng gợi ý. */
  const costText = (cost: Cost) =>
    RESOURCE_IDS.filter((r) => (cost[r] ?? 0) > 0)
      .map((r) => `${vi.resources[r].icon} ${fmt(cost[r] ?? 0)}`)
      .join(' ');

  /** Đắp tường: kéo dải thẳng hay khung chữ nhật (nút đổi ở thanh dưới, nhớ lần trước). */
  let wallShape = loadWallShape();

  /** Ghi thêm theo loại tường: đê phải liền dải, thành ghi số vòng quanh Điện. */
  const wallExtra = (type: PaintType) =>
    type === 'de' ? vi.ui.dikeExtra : type === 'thanh' ? vi.ui.citadelExtra(wallRings(state)) : '';

  /** Dòng gợi ý khi đắp tường loại `type`. */
  const wallHint = (type: PaintType) => vi.ui.wallDragHint(vi.ui.wallVerb[type] ?? '', wallShape, wallExtra(type));

  /** Xét dải ô theo chỗ ngón vừa kéo tới: tô xanh đỏ, dòng gợi ý ghi số ô và giá. */
  const updateDrag = () => {
    dragFrame = 0;
    if (!dragAt || mode.kind !== 'paint' || !isDragged(mode.type)) return;
    const type = mode.type as BuildingType;
    const from = drag?.from ?? world.pickTile(dragAt.fx, dragAt.fy);
    const to = world.pickTile(dragAt.tx, dragAt.ty);
    if (!from) return;
    const shape = isWall(type) && wallShape === 'rect' ? rectTiles : lineTiles;
    const tiles = to ? shape(from, to) : (drag?.tiles ?? [from]);
    drag = { from, tiles };
    // Cộng dồn giá và số tối đa theo thứ tự: hết của hay đủ giới hạn giữa dải thì phần sau tô đỏ.
    const plan = planLine(state, type, tiles);
    const ms = xayMs(type, 1);
    // Tường phải có tốp thợ rảnh: hết tốp thì cả dải tô đỏ, dòng gợi ý báo lúc có tốp rảnh.
    const tho = ms > 0 ? thoRanh(state) : undefined;
    if (ms > 0 && !tho) {
      world.setLinePreview(plan.cells.map((c) => ({ ...c, ok: false })));
      hud.setHint(vi.ui.hetThoSau(formatClock(thoRanhSau(state))));
      return;
    }
    world.setLinePreview(plan.cells);
    const time = tho ? ` · ${vi.ui.xayTime(formatXay((plan.n * ms) / tho.toc))}` : '';
    hud.setHint(isWall(type) ? vi.ui.wallDrag(vi.ui.wallVerb[type] ?? '', plan.n, costText(plan.cost)) + (plan.n ? time : '') : vi.ui.roadDrag(plan.n, costText(plan.cost)));
  };

  world.view.onDraw = (phase, fx, fy, tx, ty) => {
    if (phase === 'move') {
      dragAt = { fx, fy, tx, ty };
      if (!dragFrame) dragFrame = requestAnimationFrame(updateDrag);
      return;
    }
    if (dragFrame) cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    if (phase === 'end') {
      dragAt = { fx, fy, tx, ty };
      updateDrag();
    }
    const done = drag;
    drag = null;
    dragAt = null;
    world.setLinePreview(null);
    if (mode.kind !== 'paint' || !isDragged(mode.type)) return;
    const type = mode.type as BuildingType;
    const idleHint = isWall(type) ? wallHint(type) : vi.ui.roadHint;
    if (phase === 'cancel' || !done) {
      hud.setHint(idleHint);
      return;
    }
    // Tường: cả dải thành một việc cho một tốp thợ, đắp lần lượt theo thứ tự kéo. Đường trải xong ngay.
    const timed = xayMs(type, 1) > 0;
    const w = timed ? startWalls(state, type, done.tiles) : null;
    const r = w ? { n: w.n, reason: w.reason } : (() => {
      const p = placeLine(state, type, done.tiles);
      return { n: p.placed.length, reason: p.reason };
    })();
    if (!r.n) {
      hud.setHint(idleHint);
      if (r.reason) fail(r.reason);
      return;
    }
    play('place');
    hud.setHint(
      w?.job ? vi.ui.wallStarted(r.n, formatClock(conLai(state, w.job)), !!thoRanh(state)) : isWall(type) ? vi.ui.wallBuilt(r.n, wallExtra(type)) : vi.ui.roadPaved(r.n),
    );
    // Có ô hỏng (hết của, đủ giới hạn, vướng công trình) thì báo lý do của ô hỏng đầu.
    if (r.reason) hud.toast(vi.reasons[r.reason], true);
    commit();
    if (type === 'de') refreshFloodPreview();
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
          // Trải đường, đắp tường: một ngón kéo để trải, đắp cả dải, hai ngón kéo cảnh.
          world.view.drawMode = isDragged(a.type);
          const hint = isRoad(a.type) ? vi.ui.roadHint : isDecor(a.type) ? vi.ui.decorHint : wallHint(a.type);
          hud.setMode('paint', true, hint, false, isWall(a.type) ? wallShape : undefined);
          refreshFloodPreview();
          if (a.type === 'de') hud.toast(vi.ui.floodPreview(nextFloodLevel(state)));
          return;
        }
        mode = { kind: 'place', type: a.type, rot: lastRot[a.type] ?? 0, ...nearestSpot(a.type) };
        hud.setMode('place', true, undefined, canRotateType(a.type));
        updateGhost();
        refreshFloodPreview();
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
        if (onlyTurning()) {
          const t = rotateBuilding(state, mode.moving!, mode.rot);
          if (!t.ok) return fail(t.reason);
          play('place');
          hud.toast(vi.ui.turned(buildingName(t.value)));
          exitMode();
          commit();
          world.pop(t.value.id);
          return;
        }
        if (mode.moving !== undefined) {
          const m = move(state, mode.moving, mode.x, mode.z, mode.rot);
          if (!m.ok) return fail(m.reason);
          play('place');
          hud.toast(vi.ui.moved(buildingName(m.value)));
          exitMode();
          commit();
          world.pop(m.value.id);
          return;
        }
        if (xayMs(mode.type, 1) > 0) {
          // Giao một tốp thợ dựng: công trình vào kinh đô khi xong.
          const s = startBuild(state, mode.type, mode.x, mode.z, mode.rot);
          if (!s.ok) return fail(s.reason);
          lastRot[mode.type] = mode.rot;
          play('place');
          const name = buildingName({ type: mode.type, level: 1 });
          const left = formatClock(s.value ? conLai(state, s.value) : 0);
          hud.toast(s.value?.o[0].doi ? vi.ui.doiStarted(name, left) : vi.ui.xayStarted(name, left));
          exitMode();
          commit();
          return;
        }
        const r = place(state, mode.type, mode.x, mode.z, mode.rot);
        if (!r.ok) return fail(r.reason);
        lastRot[mode.type] = mode.rot;
        play('place');
        hud.toast(vi.ui.placed(buildingName(r.value)));
        exitMode();
        commit();
        world.pop(r.value.id);
        return;
      }

      case 'rotatePlace':
        // Xoay bóng công trình đang đặt, dời một nấc theo chiều kim đồng hồ trên màn hình.
        if (mode.kind !== 'place' || !canRotateType(mode.type)) return;
        play('tap');
        mode.rot = (mode.rot + 3) % 4;
        updateGhost();
        return;

      case 'rotateBuilding': {
        const b = findBuilding(state, a.id);
        if (!b) return fail('khongTimThay');
        const r = rotateBuilding(state, b.id, (rotOf(b) + 3) % 4);
        if (!r.ok) return fail(r.reason);
        play('tap');
        commit();
        return;
      }

      case 'toggleWallShape':
        if (mode.kind !== 'paint' || !isWall(mode.type)) return;
        play('tap');
        wallShape = wallShape === 'line' ? 'rect' : 'line';
        saveWallShape(wallShape);
        hud.setMode('paint', true, wallHint(mode.type), false, wallShape);
        return;

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
        marching = { plot: a.plot, army: a.army, rows: a.rows, nu: a.nu, at: performance.now() + MARCH_MS };
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
        // Dời ngay; phần dựng thêm giao cả cho một tốp thợ, làm lần lượt.
        const r = startMau(state, a.mau);
        if (!r.ok) {
          hud.refreshSheet(state);
          return fail(r.reason);
        }
        play('upgrade');
        const job = r.value.builds.length ? viecOf(state).at(-1) : undefined;
        hud.toast(job ? vi.ui.mauStarted(vi.ui.mau[a.mau].name, job.o.length, formatClock(conLai(state, job))) : vi.ui.mauDone(vi.ui.mau[a.mau].name));
        commit();
        return;
      }

      case 'startMove': {
        const b = findBuilding(state, a.id);
        if (!b) return fail('khongTimThay');
        if (state.raid.phase !== 'idle') return fail('dangCoGiac');
        hud.closeSheet();
        world.setSelection(null);
        world.showGrid(true);
        play('tap');
        mode = { kind: 'place', type: b.type, x: b.x, z: b.z, rot: rotOf(b), moving: b.id };
        hud.setMode('move', true, undefined, canRotateType(b.type));
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
        // Mở lại màn hình Hết truyện mới nhất đã xem.
        hud.showStory(state.story.seen.includes('hetTruyen5') ? 'hetTruyen5' : 'hetTruyen', true);
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
        const s = startUpgrade(state, a.id);
        if (!s.ok) return fail(s.reason);
        if (s.value) {
          // Giao một tốp thợ nâng: công trình làm ở cấp cũ tới khi xong.
          const b = findBuilding(state, a.id)!;
          play('place');
          hud.toast(vi.ui.nangStarted(buildingName(b), b.level + 1, formatClock(conLai(state, s.value))));
          commit();
          return;
        }
        const r = { ok: true as const, value: findBuilding(state, a.id)! };
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

      case 'wallUpgradeAll': {
        const s = startWallUpgrade(state, a.id);
        if (!s.ok) return fail(s.reason);
        play('place');
        hud.toast(vi.ui.wallUpStarted(s.value.o.length, formatClock(conLai(state, s.value))));
        commit();
        return;
      }

      case 'cancelJob': {
        const r = cancelJob(state, a.id);
        if (!r.ok) return fail(r.reason);
        jobsSeen.delete(a.id);
        play('tap');
        hud.toast(vi.ui.jobCancelled(costText(r.value)));
        commit();
        return;
      }

      case 'askQuiz': {
        // Lạc hầu đố sử: hỏi câu đang dở, hay bốc câu mới (ghi vào việc ngay để mở lại vẫn là câu ấy).
        const r = askQuiz(state, a.id, CAU_DO_IDS);
        if (!r.ok) {
          hud.closeQuiz();
          return fail(r.reason);
        }
        play('tap');
        const v = viecOf(state).find((j) => j.id === a.id)!;
        commit();
        hud.showQuiz(a.id, r.value, v.hoi);
        return;
      }

      case 'answerQuiz': {
        const v = viecOf(state).find((j) => j.id === a.id);
        if (!v || v.cau === undefined) {
          hud.closeQuiz();
          hud.toast(vi.ui.quizGone, true);
          return;
        }
        const cau = v.cau;
        const hoi = v.hoi;
        const r = traLoi(state, a.id, a.dung);
        if (!r.ok) return fail(r.reason);
        play(a.dung ? 'claim' : 'error');
        // Đúng cả ba thì việc xong ngay, không còn trong danh sách.
        const still = viecOf(state).find((j) => j.id === a.id);
        const left = still ? conLai(state, still) : 0;
        commit();
        hud.showQuiz(a.id, cau, hoi, { pick: a.pick, dung: a.dung, left, turns: still ? QUIZ_TURNS - still.hoi : 0 });
        return;
      }

      case 'openTho':
        if (mode.kind !== 'view') exitMode();
        select(null);
        play('tap');
        hud.showTho(state);
        return;

      case 'toggleCong': {
        const b = findBuilding(state, a.id);
        const r = setCong(state, a.id, !b?.mo);
        if (!r.ok) return fail(r.reason);
        play('tap');
        hud.toast(r.value.mo ? vi.ui.congIsOpen : vi.ui.congIsShut);
        commit();
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
        hud.showSettings(state, world.resolution, world.ngayDemOn, world.bongDoOn);
        return;

      case 'toggleMute':
        state.settings.muted = !state.settings.muted;
        setMuted(state.settings.muted);
        if (state.settings.muted) stopRally();
        save();
        hud.showSettings(state, world.resolution, world.ngayDemOn, world.bongDoOn);
        return;

      case 'setResolution':
        world.setResolution(a.resolution);
        saveResolution(a.resolution);
        hud.showSettings(state, a.resolution, world.ngayDemOn, world.bongDoOn);
        return;

      case 'setNgayDem':
        world.setNgayDem(a.on);
        saveNgayDem(a.on);
        hud.showSettings(state, world.resolution, a.on, world.bongDoOn);
        return;

      case 'setBongDo':
        world.setBongDo(a.on);
        saveBongDo(a.on);
        hud.showSettings(state, world.resolution, world.ngayDemOn, a.on);
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
        const r = setGuard(state, a.unit, a.delta);
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

      case 'seeIsland':
        // Đóng bảng cho thấy trọn biển, lướt camera ra quần đảo thuyền bến này đánh cá.
        select(null);
        world.panToIsland(a.id);
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
        const r = startStage(state, a.stage, a.army, a.rows, a.challenge, a.hero, a.nu);
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
        if (pvp) {
          // Đấu thành: ghi lần bấm, áp ở đầu bước trận kế tiếp (đánh lại ra y hệt).
          if (!skillReady(pvp.run.battle, a.skill)) return;
          pushInput(pvp.run, a.skill);
          play(a.skill === 'trongTran' ? 'trongTran' : 'claim');
          navigator.vibrate?.(a.skill === 'trongTran' ? 30 : 60);
          return;
        }
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
        if (pvp) {
          pushInput(pvp.run, 'rut');
          play('tap');
          return;
        }
        if (!retreat(state).ok) return;
        play('tap');
        commit();
        return;

      case 'dauThanh': {
        const why = canPractice(state) ?? validateArmy(state, a.army);
        if (why) {
          play('error');
          hud.toast(vi.dauThanh.reasons[why], true);
          return;
        }
        const snap = targetSnapshot(state, a.target);
        // Đánh thử: hạt giống theo giờ, mỗi lần đánh lại mỗi khác (đánh thật thì máy chủ cấp hạt giống).
        const run = beginPvp(snap, attackFrom(state, a.army, a.side, Date.now() % 2_147_483_647));
        const t = world.view.target;
        pvp = { run, name: a.target ? vi.dauThanh.bot(a.target) : vi.dauThanh.own, cam: { x: t.x, z: t.z, zoom: world.view.zoom }, doneAt: 0, shown: false };
        if (mode.kind !== 'view') exitMode();
        select(null);
        hud.closeCampaign();
        world.resetAll();
        world.sync(run.def);
        world.lookAtEdge(a.side);
        hud.setPvp({ battle: run.battle, def: run.def, name: pvp.name });
        play('claim');
        navigator.vibrate?.(40);
        return;
      }

      case 'dauHome':
      case 'dauAgain':
        leavePvp();
        play('tap');
        if (a.kind === 'dauAgain') hud.showDau(state);
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
    const text = state.relaid.trai ? vi.ui.relaidTrai(refund) : state.relaid.dien ? vi.ui.relaidDien(refund) : vi.ui.relaid(refund);
    delete state.relaid;
    hud.toast(text);
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
    watchXay(true);
    showOfflineIfLong(offline.ms, offline.gained, offline.built);
    if (state.raid.lastResult) hud.showRaidResult(state, state.raid.lastResult);
    preloadThumbs();
  };

  /** Về kinh đô sau trận Đấu thành: vẽ lại kinh đô của mình, camera về chỗ cũ. Đánh thử nên quân, của không đổi. */
  const leavePvp = () => {
    if (!pvp) return;
    const cam = pvp.cam;
    pvp = null;
    hud.setPvp(null);
    hud.closeDauResult();
    world.updateBattle(null, 0);
    world.resetAll();
    world.sync(state);
    world.view.target.set(cam.x, 0, cam.z);
    world.view.zoom = cam.zoom;
    world.view.apply();
    refreshUi();
  };

  /** Trận Đấu thành xong thì hiện bảng kết quả (sao, phần trăm phá, quân ngã, của cướp được nếu đánh thật). */
  const watchPvp = (now: number) => {
    if (!pvp || !pvp.run.done || pvp.shown) return;
    if (!pvp.doneAt) {
      pvp.doneAt = now + 900;
      stopRally();
      const score = scorePvp(pvp.run.def);
      play(score.stars ? 'upgrade' : 'error');
    }
    if (now < pvp.doneAt) return;
    pvp.shown = true;
    const score = scorePvp(pvp.run.def);
    hud.showDauResult(dauResultHtml(score, pvp.run.battle.lost, lootPvp(pvp.run.snap, score, dienLevel(state))));
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
      world.showField(don ? CAMPS[don].terrain : STAGES[battle.wave - 1].terrain, battle.bai ?? null);
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
      resultAt = now + (battle?.ascend || battle?.sonWin || battle?.advWin || battle?.seaWin || battle?.hatWin ? 3500 : 700);
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
    if (hud.storyOpen || hud.modalOpen || state.campaign.battle || state.raid.phase === 'battle' || pvp) return;
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
      showOfflineIfLong(off.ms, off.gained, off.built);
      commit();
      watchXay(true);
    } else {
      // Đang Đấu thành: kinh tế vẫn chạy, đồng hồ giặc đứng lại.
      tick(state, gap, !!pvp);
      state.lastSeen = wall;
    }
    // Trận Đấu thành chạy theo khung hình (đã chặn 0,1 giây), chỉ trọn bước; ẩn tab thì trận dừng.
    if (pvp) stepPvp(pvp.run, dt * 1000);

    if (marching && now >= marching.at) {
      // Hành quân xong: sang bãi chiến đánh đồn.
      const m = marching;
      marching = null;
      world.stopMarch();
      const r = startCamp(state, m.plot, m.army, m.rows, m.nu);
      if (!r.ok) fail(r.reason);
      commit();
    }
    world.updateFlood(scene());
    world.updateBattle(pvp ? pvp.run.battle : state.raid.battle, dt);
    watchCampaign();
    world.updateField(state.campaign.battle, dt);
    world.update(dt);
    hud.xayLabels.update(state, (x, z, lift) => (world.inField ? null : world.screenAt(x, z, lift)));
    watchRaid();
    watchPvp(now);
    if (now - lastUi > 250) {
      lastUi = now;
      // Trong trận, công trình có thể bị phá bất cứ lúc nào: vẽ lại cảnh theo state (Đấu thành: kinh đô bị đánh).
      if (state.raid.phase === 'battle' || pvp) world.sync(scene());
      // Cây dại, tảng đá mọc theo đồng hồ chơi: mọc thêm thì vẽ (trang trí ô trống né chỗ ấy) và gợi ý lần đầu.
      const cayKey = `${state.cayDa.seq}:${state.cayDa.list.length}`;
      if (cayKey !== lastCayKey) {
        lastCayKey = cayKey;
        world.sync(scene());
        showCayDaHint();
      }
      // Trinh sát về tới nơi: đất bên kia hiện ra thêm.
      if (state.benKia.known.length !== lastKnown) {
        if (state.benKia.known.length > lastKnown && !state.benKia.scouts.length) hud.toast(vi.benKia.scoutBack);
        lastKnown = state.benKia.known.length;
        world.sync(scene());
      }
      watchXay();
      refreshUi();
      watchStory();
      prewarm();
      luuSau();
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
      // Đặt camera tay thì thôi lướt về chỗ cũ (máy chụp chạy chậm, lướt chưa xong sẽ kéo camera đi mất).
      drift.done = true;
      world.view.target.set(x - HALF, 0, z - HALF);
      world.view.zoom = zoom;
      world.view.apply();
    },
    resync: () => {
      world.resetAll();
      world.sync(scene());
    },
    /**
     * Đấu thành: đánh thử kinh đô `target` (0 là kinh đô của mình, số khác là kinh đô máy Điện ấy) với quân đang có
     * (vừa số chỗ một trận), để chụp thử. `secs`: cho trận chạy trước chừng ấy giây.
     */
    dauThanh: (target = dienLevel(state), side: 'bac' | 'tay' = 'bac', secs = 0) => {
      handle({ kind: 'dauThanh', target, side, army: fitArmy({ ...state.troops }, fieldCap(state)) });
      if (pvp && secs > 0) stepPvp(pvp.run, secs * 1000);
      return !!pvp;
    },
    /** Mở bảng Đấu thành ở bước chọn kinh đô (`army`: bước chọn quân), để chụp thử. */
    dauPanel: (army = false) => hud.showDau(state, army ? 'army' : 'target'),
    /** Đấu thành: cho trận đang đánh chạy hết (bảng kết quả hiện ngay sau đó). */
    dauFinish: () => {
      if (pvp) stepPvp(pvp.run, 400_000);
    },
    /** Trận Đấu thành đang đánh (để chụp thử quay camera về quân). */
    dauBattle: () => pvp?.run.battle ?? null,
    advance: (ms: number) => {
      tick(state, ms);
      commit();
    },
    /** Cho mọi tốp thợ xong hết việc đang làm (chụp thử cảnh đã xây xong). */
    xongHet: () => {
      advanceXay(state, 1e13);
      commit();
    },
    place: (type: BuildingType, x: number, z: number, rot = 0) => {
      const r = place(state, type, x, z, rot);
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
    /** Mở bảng công trình `id` như khi chạm vào nó (chụp thử bảng của công trình bị công trình khác che). */
    select: (id: number | null) => select(id),
    /** Chọn công trình trong bảng Xây dựng như bấm nút Xây (đặt, trải, đắp tường). */
    build: (type: BuildingType) => handle({ kind: 'chooseBuild', type }),
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
    /**
     * Xuất toàn quân đánh màn `n` cùng tướng `hero` (phó bản chương 2; bỏ trống thì tướng chọn sẵn) và phó tướng `nu`
     * (chương 5), rồi `skill(k)` để bấm kỹ năng: chụp thử trận ngoài bãi.
     */
    march: (n: number, challenge = false, hero?: HeroKind, nu?: NuTuongId | null) => {
      // Thử thách Hai binh chủng: chỉ mang hai binh chủng được chỉ định.
      const army = { ...state.troops };
      for (const k of UNIT_TYPES) if (!unitAllowed(n, challenge, k)) army[k] = 0;
      const r = startStage(state, n, army, state.campaign.rows, challenge, hero, nu);
      commit();
      return r;
    },
    /** Mở bảng quần đảo `id` như khi chạm vào đảo. */
    quanDao: (id: QuanDaoId) => hud.showQuanDao(state, id),
    /** Đặt đồng hồ cảnh (giây): thuyền khơi, cá voi, cá heo theo đồng hồ này, để chụp thử thuyền đang ở biển. */
    seaTime: (t: number) => world.seekTime(t),
    /**
     * Ghim giờ trong ngày ở kinh đô để chụp thử: 'ngay', 'chieu', 'dem', 'rang', hay phần của ngày (0 tới 1); `null`
     * thì theo lại đồng hồ chơi.
     */
    gio: (g: Buoi | number | null) => world.setGio(g),
    /** Trời lúc này: trọng số bốn buổi, độ tối, giờ đang ghim, ngày đêm có bật không. */
    troi: () => world.troiInfo(),
    /** Cho cá voi (`whale`) hay đàn cá heo (`dolphins`) nổi lên ngay gần chỗ camera nhìn. */
    seaLife: (kind: 'whale' | 'dolphins') => world.showSeaLife(kind),
    khoNan: () => khoNanTk(),
        skill: (k: SkillId) => {
      const battle = state.campaign.battle ?? state.raid.battle;
      return !!battle && useSkill(battle, k);
    },
  };
}

void start();
