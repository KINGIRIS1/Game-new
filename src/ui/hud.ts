// Giao diện HTML đặt đè lên cảnh 3D: thanh tài nguyên, nhiệm vụ, bảng xây dựng, bảng công trình, cài đặt,
// bản đồ phó bản và các nút trong trận.

import { enemiesLeft, alliesLeft, heroSetups, holdProgress, skillReady, wavesArrived, type Battle, type HeroKind } from '../game/battle';
import { advJoined, advLook, advResting, inChapter3, ruaVangCame, wallRings } from '../game/coLoa';
import {
  BUILDINGS,
  CA_BIEN_PER_MIN,
  CA_PER_MIN,
  BUILD_MENU,
  CONG_THANH,
  LAU_NO,
  LAU_NO_FROM_LEVEL,
  NU_TUONG,
  PHU_SA_BONUS,
  PHU_SA_TYPES,
  DECOR_TYPES,
  DAU_THANH,
  FIELD,
  RESOURCE_IDS,
  ROAD_TYPES,
  BRIDGE_FLOOD,
  DAC_SAN_BONUS,
  isBridge,
  isDecor,
  isRoad,
  RINGS_NEEDED,
  STAGES,
  UNITS,
  UNIT_TYPES,
  U_NO,
  type BuildingType,
  type Chapter,
  type Cost,
  type ResourceId,
  type Resources,
  type GearId,
  type HuanBranch,
  type GiftId,
  type Row,
  type SkillId,
  DOANH_MAX,
  type NuTuongId,
  type TuongId,
  type UnitType,
} from '../game/defs';
import { armySpace, canGuard, capOf, doanhCount, generals, guardCap, guardManual, guardPlan, guardTargets, reserve } from '../game/doanhTrai';
import { nuTuongList } from '../game/nuTuong';
import { scorePvp } from '../game/dauThanh';
import { dauHtml, dauMapHtml, newDauView, pickTarget, stepDauArmy, type DauTarget, type DauView } from './dauThanh';
import {
  barracksLevel,
  canAfford,
  canPlaceUNo,
  canTrain,
  homeOf,
  uNoCount,
  uNoLimit,
  uNoRepairCost,
  canUpgrade,
  canRotateType,
  moveCost,
  countOf,
  currentQuest,
  canRaiseBuilding,
  dienLevel,
  dienNeededFor,
  findBuilding,
  fishOf,
  fishPerMinute,
  floodSeason,
  foodPerMinute,
  freeDan,
  housing,
  isStarving,
  limitOf,
  usedOf,
  nextFloodLevel,
  raiseCostOf,
  netPerMinute,
  nextFoe,
  outputIn,
  phuSaPreview,
  questDone,
  questProgress,
  repairAllCost,
  repairCost,
  slotsOf,
  storageCap,
  troopCap,
  troopSpace,
  UNLOCK_REASON,
  unlocked,
  upgradeCostOf,
  type Building,
  type GameState,
  type RaidResult,
  type StageResult,
  type StoryId,
} from '../game/game';
import { chapterStages, stageHeroCheck } from '../game/campaign';
import { caoLoJoined, caoLoResting } from '../game/caoLo';
import { inChapter4, mergeCost, mergeable, mergedLevel } from '../game/chuong4';
import { CH5_LAST, HAI_BA_KINDS, haiBaJoined, haiBaResting, inChapter5 } from '../game/chuong5';
import { giongAppeared, giongLook, giongReady, giongResting } from '../game/giong';
import { KHOANH_N } from '../game/khoanh';
import { inChapter2, sonJoined, sonLook, sonResting, giftCount } from '../game/son';
import { floodToleranceOf, groundOf, hasOpenCong } from '../game/terrain';
import { tetOpen, tetStarted, type Banh } from '../game/tet';
import type { Resolution } from '../render/world';
import { formatClock, formatDuration, formatXay, vi } from '../text/vi';
import { canStartUpgrade, conLai, isBusy, pendingBuilding, planWallUpgrade, soTho, thoRanh, thoRanhSau, viecOf, wallComponent, xayMs } from '../game/xay';
import { XayLabels, fillXay, jobHtml, jobName, pendingHtml, quizHtml, realMs, thoHtml, type QuizResult } from './xay';
import { armyHtml, defaultPick, huanHtml, mapHtml, nextRow, pickNu, stageHtml, stageResultHtml, stepPick, type ArmyPick, type MapChapter } from './campaign';
import { armsHtml } from './binhKhi';
import { advHtml, caoLoHtml } from './coLoa';
import { buildingName, costHtml, esc, fmt, fmtShort } from './format';
import { endingHtml, giongHtml, isEnding, storyHtml } from './giong';
import { sonHtml } from './son';
import { blessingHtml, tetHtml } from './tet';
import { khoanhHtml } from './khoanh';
import { benKiaHtml } from './benKia';
import { campTier, cutOff, dacSanOf, plotAt, villageOutput } from '../game/benKia';
import { seaIndex, seaRoute, type QuanDaoId } from '../game/bien';
import { quanDaoHtml } from './bien';
import { farBankOf } from '../game/map';
import { mauItems } from './mau';
import { goLabel, pageCount, pageOf, pickOf, thumbUrl, xayDungHtml, type BuildItem } from './xayDung';
import type { MauId } from '../game/mau';

/** Dòng báo thường hiện chừng này mili giây. */
const TOAST_MS = 2600;
const SHOWN_RESOURCES: ResourceId[] = ['gao', 'voOc', 'datDa', 'sat'];
/** Tài nguyên hiện trên thanh trên: gỗ chỉ hiện từ khi mở xưởng mộc (Điện 2), hay khi đã có gỗ. */
function shownResources(state: GameState): ResourceId[] {
  return dienLevel(state) >= BUILDINGS.xuongMoc.minDien || state.resources.go > 0 ? [...SHOWN_RESOURCES, 'go'] : SHOWN_RESOURCES;
}
/** Nhóm thẻ trong bảng Xây dựng: công trình, đường đi, đồ trang trí, mẫu kinh đô. */
const BUILD_GROUPS: { key: keyof typeof vi.ui.buildGroups; types: BuildingType[] }[] = [
  { key: 'congTrinh', types: BUILD_MENU },
  { key: 'duong', types: ROAD_TYPES },
  { key: 'trangTri', types: DECOR_TYPES },
  { key: 'mau', types: [] },
];
/** Bốn công trình làm bánh của Hội Tết: chỉ hiện trong bảng Xây dựng khi đã mở (sau kết chương 1). */
const TET_TYPES: BuildingType[] = ['ruongNep', 'vuon', 'chuongLon', 'bep'];
/** Công trình chỉ hiện trong bảng Xây dựng khi đã sang chương có nó. */
const CHAPTER_OF: Partial<Record<string, number>> = { chuong2: 2, ketChuong2: 2, chuong3: 3, ruaVang: 3, ketChuong3: 3, chuong4: 4, ketChuong4: 4, chuong5: 5, ketChuong5: 5 };

export { buildingName } from './format';

/** Hết tốp thợ rảnh: báo bận, kèm lúc sớm nhất có tốp rảnh (chữ thường, cho dòng báo). */
function hetThoText(state: GameState): string {
  const ms = thoRanhSau(state);
  return Number.isFinite(ms) ? vi.ui.hetThoSau(formatClock(ms)) : vi.reasons.hetTho;
}

/** Như `hetThoText` nhưng cho bảng: số giờ đếm ngược thay tại chỗ (`fillXay`), bảng khỏi phải dựng lại mỗi giây. */
function hetThoHtml(state: GameState): string {
  return Number.isFinite(thoRanhSau(state)) ? vi.ui.hetThoSau('<b data-ranh></b>') : vi.reasons.hetTho;
}

/** Lý do chưa tới mốc truyện mở công trình này, rỗng khi đã mở. */
function unlockWhy(state: GameState, type: BuildingType): string {
  const u = BUILDINGS[type].unlock;
  if (!u || unlocked(state, u)) return '';
  return vi.reasons[UNLOCK_REASON[u]];
}

/** Chương đang chơi: 1 tới 5. */
function chapterNow(state: GameState): Chapter {
  return inChapter5(state) ? 5 : inChapter4(state) ? 4 : inChapter3(state) ? 3 : inChapter2(state) ? 2 : 1;
}

/** Chương mới nhất có bản đồ phó bản: chương 5 chưa có màn nên vẫn mở bản đồ chương 4. */
function mapChapterNow(state: GameState): MapChapter {
  return chapterNow(state);
}

export type HudAction =
  | { kind: 'openBuild' }
  | { kind: 'chooseBuild'; type: BuildingType }
  | { kind: 'chooseRaise' }
  /** Công cụ dọn: chạm ô đường hay món trang trí để dọn đi. */
  | { kind: 'chooseClear' }
  | { kind: 'raiseBuilding'; id: number }
  | { kind: 'openSon' }
  | { kind: 'offerGift'; gift: GiftId }
  | { kind: 'openAdv' }
  | { kind: 'openCaoLo' }
  /** Mở lại màn hình Hết truyện từ bảng Lạc hầu. */
  | { kind: 'openEnding' }
  | { kind: 'forgeNoThan' }
  | { kind: 'forgeArms'; unit: UnitType }
  | { kind: 'openTet' }
  | { kind: 'startMove'; id: number }
  /** Xoay bóng công trình đang đặt, dời một nấc 90°. */
  | { kind: 'rotatePlace' }
  /** Xoay công trình đã dựng tại chỗ một nấc 90° (nút trong bảng công trình). */
  | { kind: 'rotateBuilding'; id: number }
  | { kind: 'startMerge'; id: number }
  | { kind: 'rotateView' }
  /** Đổi cách kéo thả đắp tường: dải thẳng hay khung chữ nhật. */
  | { kind: 'toggleWallShape' }
  | { kind: 'applyMau'; mau: MauId }
  | { kind: 'phatRung'; id: number }
  | { kind: 'trinhSat'; id: number }
  | { kind: 'ketThan'; id: number }
  | { kind: 'marchCamp'; plot: number; army: Record<UnitType, number>; rows: Record<UnitType, Row>; nu: NuTuongId | null }
  | { kind: 'offerBanh'; banh: Banh }
  | { kind: 'confirmPlace' }
  | { kind: 'cancelPlace' }
  | { kind: 'upgrade'; id: number }
  | { kind: 'removeWall'; id: number }
  | { kind: 'toggleCong'; id: number }
  | { kind: 'claimQuest' }
  | { kind: 'openSettings' }
  | { kind: 'toggleMute' }
  | { kind: 'setResolution'; resolution: Resolution }
  | { kind: 'copyCode' }
  | { kind: 'saveFile' }
  | { kind: 'shareFile' }
  /** Mã lưu dán vào ô, hay đọc từ tệp lưu (`file`). */
  | { kind: 'importCode'; code: string; file?: boolean }
  | { kind: 'reset' }
  | { kind: 'closeSheet' }
  | { kind: 'workers'; id: number; delta: number }
  | { kind: 'danInfo' }
  | { kind: 'openMerchant' }
  | { kind: 'acceptOffer'; index: number }
  | { kind: 'train'; unit: UnitType }
  | { kind: 'guardDelta'; unit: UnitType; delta: 1 | -1 }
  | { kind: 'garrisonDelta'; id: number; unit: UnitType; delta: 1 | -1 }
  | { kind: 'guardAuto' }
  | { kind: 'repair'; id: number }
  | { kind: 'repairAll' }
  | { kind: 'callRaid' }
  | { kind: 'lookRaid' }
  /** Lướt camera ra quần đảo ngoài biển Đông (bảng bến thuyền khơi). */
  | { kind: 'seeIsland'; id: QuanDaoId }
  | { kind: 'openBarracks' }
  | { kind: 'selectBuilding'; id: number }
  | { kind: 'chooseUNo' }
  | { kind: 'placeUNo'; id: number }
  | { kind: 'repairUNo'; id: number }
  | { kind: 'dismissRaid' }
  | { kind: 'openCampaign' }
  | { kind: 'march'; stage: number; army: Record<UnitType, number>; rows: Record<UnitType, Row>; challenge: boolean; hero: HeroKind | null; nu: NuTuongId | null }
  | { kind: 'buyHuan'; branch: HuanBranch }
  | { kind: 'useSkill'; skill: SkillId }
  | { kind: 'openGiong' }
  | { kind: 'feedGiong' }
  | { kind: 'forgeGear'; gear: GearId }
  | { kind: 'storyDone'; id: StoryId }
  | { kind: 'retreat' }
  | { kind: 'leaveField' }
  | { kind: 'fieldToMap' }
  | { kind: 'cancelJob'; id: number }
  | { kind: 'wallUpgradeAll'; id: number }
  | { kind: 'openTho' }
  | { kind: 'askQuiz'; id: number }
  | { kind: 'answerQuiz'; id: number; dung: boolean; pick: number }
  /** Đấu thành: đánh thử kinh đô `target` (0 là kinh đô của mình, số khác là kinh đô máy Điện ấy). */
  | { kind: 'dauThanh'; target: DauTarget; side: 'bac' | 'tay'; army: Record<UnitType, number> }
  | { kind: 'dauHome' }
  | { kind: 'dauAgain' };

export type HudMode = 'view' | 'place' | 'move' | 'paint' | 'merge';
/** Kéo thả đắp tường: dải thẳng hay viền chữ nhật. */
export type WallShape = 'line' | 'rect';

/** Thẻ của bảng doanh trại: quân và nơi ở, bố trí giữ kinh đô, tướng chỉ huy, thông tin và nâng cấp trại. */
type BarracksTab = 'quan' | 'giu' | 'tuong' | 'trai';

type Sheet =
  | { kind: 'build' }
  | { kind: 'building'; id: number }
  | { kind: 'settings'; resolution: Resolution }
  | { kind: 'merchant' }
  | { kind: 'giong' }
  | { kind: 'son' }
  | { kind: 'adv' }
  | { kind: 'caoLo' }
  | { kind: 'tet' }
  | { kind: 'khoanh'; id: number }
  | { kind: 'benKia'; id: number }
  | { kind: 'quanDao'; id: QuanDaoId }
  | { kind: 'tho' }
  | null;

/** Máy có gửi được tệp qua bảng chia sẻ của hệ điều hành (Zalo, Messenger, Drive...) không. Hỏi một lần. */
let shareFileOk: boolean | undefined;
function canShareFile(): boolean {
  if (shareFileOk === undefined) {
    try {
      shareFileOk = !!navigator.canShare?.({ files: [new File([''], 'thu.txt', { type: 'text/plain' })] });
    } catch {
      shareFileOk = false;
    }
  }
  return shareFileOk;
}

/**
 * Nút kỹ năng: tên khi sẵn sàng; đang hồi thì biểu tượng và số giây đè lên chỗ tên (tên ẩn đi mà vẫn giữ chỗ), để nút
 * không hẹp lại rồi rộng ra làm cả hàng nút nhảy dòng.
 */
function skillButton(b: Battle, k: SkillId, small = false): string {
  return `<button class="btn bronze skill ${small ? 'small' : ''}" data-act="useSkill" data-skill="${k}" title="${vi.skills[k].desc}" ${skillReady(b, k) ? '' : 'disabled'}><span class="sk-name">${vi.skills[k].icon} ${vi.skills[k].name}</span><span class="sk-cd"></span></button>`;
}

/** Đổi trạng thái và số giây hồi trên nút kỹ năng đã dựng. */
function syncSkill(btn: HTMLButtonElement, b: Battle, k: SkillId): void {
  const cd = b.outcome ? 0 : Math.ceil(b.skillCd[k] ?? 0);
  btn.disabled = !skillReady(b, k);
  btn.classList.toggle('cooling', cd > 0);
  const tail = btn.querySelector('.sk-cd');
  if (tail) tail.textContent = cd > 0 ? `${vi.skills[k].icon} ${cd}s` : '';
}

/** Bản đồ phó bản đang mở: chương nào, màn đang xem, đang xem thẻ màn hay đang xếp quân. */
interface CampaignView {
  chapter: MapChapter;
  stage: number | null;
  /** Thẻ màn, bảng xếp quân (màn thường hay thử thách, theo `pick.challenge`), bảng Huân công, bảng Đấu thành. */
  step: 'stage' | 'army' | 'huan' | 'dau';
  pick: ArmyPick;
  /** Bảng Đấu thành (giữ lại lựa chọn khi chuyển qua lại các bảng). */
  dau?: DauView;
}

/** Trận Đấu thành đang đánh (trận không nằm trong state): kinh đô bị đánh, tên để ghi trên thanh trận. */
export interface HudPvp {
  battle: Battle;
  def: GameState;
  name: string;
}

function prodHtml(prod: Cost): string {
  const parts = RESOURCE_IDS.filter((r) => (prod[r] ?? 0) > 0).map((r) => `${vi.resources[r].icon} ${fmt(prod[r]!)}${vi.ui.perMinute}`);
  return parts.join(' · ') || '—';
}

export class Hud {
  private readonly root: HTMLElement;
  /** Dải tài nguyên sát mép trên. */
  private readonly topbar: HTMLElement;
  /** Ô tốp thợ dưới dải tài nguyên: số tốp rảnh trên tổng, chạm mở bảng Thợ hồ. */
  private readonly thoChip: HTMLElement;
  /** Nhãn đếm giờ nổi trên chỗ đang xây (`main.ts` gọi mỗi khung). */
  readonly xayLabels: XayLabels;
  /** Bảng kho và thu chi mỗi phút, thả xuống dưới dải tài nguyên. */
  private readonly resDrop: HTMLElement;
  /** Nút kỹ năng khi giặc đánh kinh đô, ngay trên dòng tin. */
  private readonly raidSkills: HTMLElement;
  /** Dòng tin ngay trên dock: giặc, đói, Tết, thuyền buôn, trinh sát; nhiều tin thì lật từng tin. */
  private readonly ticker: HTMLElement;
  /** Ô bật lên trên dock: thẻ Lạc hầu hay danh sách tướng. */
  private readonly dockPop: HTMLElement;
  /** Dock năm thẻ ở đáy: Quân, Phó bản, Xây dựng, Tướng, Lạc hầu. */
  private readonly dock: HTMLElement;
  /** Thanh Hủy, Đặt thay chỗ dock khi đang đặt, dời, trải, ghép. */
  private readonly bottombar: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly sheetEl: HTMLElement;
  private readonly toasts: HTMLElement;
  private sheet: Sheet = null;
  private sheetHtml = '';
  /** Ô bật lên đang mở: bảng kho (trên), thẻ Lạc hầu hay danh sách tướng (trên dock). */
  private pop: 'res' | 'quest' | 'heroes' | null = null;
  /** Tin đang xem trên dòng tin, và bộ tin lúc ấy (đổi bộ tin thì về tin đầu, tin gấp nhất). */
  private alertIndex = 0;
  private alertIds = '';
  private tickerKey = '';
  private raidSkillKey = '';
  private bandKey = '';
  private dockHtml = '';
  private popHtml = '';
  private resHtml = '';
  private mode: HudMode = 'view';
  private readonly campaignEl: HTMLElement;
  private readonly fieldTop: HTMLElement;
  private readonly fieldBar: HTMLElement;
  private camp: CampaignView | null = null;
  /** Đang chọn quân đánh đồn bên kia sông (trong bảng Đất bên kia sông). */
  private donPick: ArmyPick | null = null;
  private campHtml = '';
  /** Đoạn truyện đang kể và thẻ đang xem. */
  private story: { id: StoryId; step: number; replay?: boolean } | null = null;
  private skillKey = '';
  /** Trận Đấu thành đang đánh, để thanh trận và nút kỹ năng dùng thay cho trận phó bản. */
  private pvp: HudPvp | null = null;

  constructor(
    root: HTMLElement,
    private readonly onAction: (a: HudAction) => void,
    private readonly getState: () => GameState,
  ) {
    this.root = root;
    root.innerHTML = `
      <header class="topbar"></header>
      <button class="tho-chip" data-act="openTho" title="${vi.ui.thoChipTitle}" hidden></button>
      <div class="top-area">
        <div class="res-drop" hidden></div>
        <div class="field-top"><b></b><span></span><div class="hold-bar" hidden><i></i><em>🐎</em></div><div class="hero-hp" hidden></div></div>
      </div>
      <div class="hint" hidden></div>
      <div class="dock-pop"></div>
      <div class="raid-skills"></div>
      <div class="ticker"></div>
      <nav class="dock" aria-label="${vi.ui.dockLabel}"></nav>
      <footer class="bottombar"></footer>
      <footer class="fieldbar">
        <button class="btn ghost small" data-act="retreat" title="${vi.ui.retreat}">🏳️</button>
        <span class="skills"></span>
      </footer>
      <div class="xay-labels"></div>
      <aside class="sheet" aria-live="polite"></aside>
      <section class="campaign" hidden></section>
      <div class="toasts"></div>`;
    this.campaignEl = root.querySelector('.campaign')!;
    this.fieldTop = root.querySelector('.field-top')!;
    this.fieldBar = root.querySelector('.fieldbar')!;
    this.topbar = root.querySelector('.topbar')!;
    this.thoChip = root.querySelector('.tho-chip')!;
    this.xayLabels = new XayLabels(root.querySelector('.xay-labels')!);
    this.resDrop = root.querySelector('.res-drop')!;
    this.raidSkills = root.querySelector('.raid-skills')!;
    this.ticker = root.querySelector('.ticker')!;
    this.dockPop = root.querySelector('.dock-pop')!;
    this.dock = root.querySelector('.dock')!;
    this.bottombar = root.querySelector('.bottombar')!;
    this.hint = root.querySelector('.hint')!;
    this.sheetEl = root.querySelector('.sheet')!;
    this.toasts = root.querySelector('.toasts')!;
    root.addEventListener('click', this.onClick);
    root.addEventListener('change', this.onChange);
    // Chạm ra ngoài ô bật lên (kể cả xuống cảnh 3D) thì đóng ô ấy.
    document.addEventListener('pointerdown', (e) => {
      if (!this.pop) return;
      const t = e.target as HTMLElement;
      if (t.closest('[data-pop], .res-drop, .dock-pop')) return;
      this.setPop(null);
    });
    this.setMode('view');
  }

  /** Mở hay đóng ô bật lên. Thẻ Lạc hầu, danh sách tướng nằm chỗ bảng trượt nên đóng bảng đang mở. */
  private setPop(pop: typeof this.pop): void {
    if (pop && pop !== 'res' && this.sheet) this.onAction({ kind: 'closeSheet' });
    this.pop = pop;
    const state = this.getState();
    this.updateTop(state);
    this.updateQuest(state);
  }

  /** Đọc tệp lưu vừa chọn ở bảng Cài đặt. */
  private onChange = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    const file = input.id === 'save-file' ? input.files?.[0] : undefined;
    if (!file) return;
    const load = (code: string) => this.onAction({ kind: 'importCode', code, file: true });
    // Tệp lưu chỉ vài chục KB; tệp quá lớn chắc chắn không phải.
    if (file.size > 1_000_000) return load('');
    file.text().then(load, () => load(''));
  };

  private onClick = (e: Event): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const act = el.dataset.act!;
    const id = Number(el.dataset.id);
    switch (act) {
      case 'pickBuild':
        this.buildPick = el.dataset.key ?? null;
        this.mauArmed = null;
        return this.refreshSheet(this.getState());
      case 'buildPage':
        this.buildPage = Number(el.dataset.page);
        return this.refreshSheet(this.getState());
      case 'barracksTab':
        this.barracksTab = el.dataset.tab as BarracksTab;
        this.refreshSheet(this.getState());
        this.sheetEl.querySelector('.sheet-body')?.scrollTo(0, 0);
        return;
      case 'togglePop': {
        const p = el.dataset.pop as NonNullable<typeof this.pop>;
        return this.setPop(this.pop === p ? null : p);
      }
      case 'nextAlert':
        this.alertIndex++;
        return this.updateBanners(this.getState());
      case 'openTho':
        if (this.sheet?.kind === 'tho') return this.onAction({ kind: 'closeSheet' });
        return this.onAction({ kind: 'openTho' });
      case 'openBuild':
        // Chạm lại thẻ đang sáng thì đóng bảng.
        if (this.sheet?.kind === 'build') return this.onAction({ kind: 'closeSheet' });
        return this.onAction({ kind: 'openBuild' });
      case 'openBarracks':
        if (this.barracksOpen(this.getState())) return this.onAction({ kind: 'closeSheet' });
        return this.onAction({ kind: 'openBarracks' });
      case 'chooseBuild':
        return this.onAction({ kind: 'chooseBuild', type: el.dataset.type as BuildingType });
      case 'buildTab':
        this.buildTab = el.dataset.tab as typeof this.buildTab;
        this.buildPick = null;
        this.buildPage = null;
        this.mauArmed = null;
        this.refreshSheet(this.getState());
        this.sheetEl.querySelector('.sheet-body')?.scrollTo(0, 0);
        return;
      case 'selectBuilding':
      case 'placeUNo':
      case 'repairUNo':
      case 'upgrade':
      case 'removeWall':
      case 'toggleCong':
      case 'raiseBuilding':
      case 'startMove':
      case 'startMerge':
      case 'rotateBuilding':
      case 'wallUpgradeAll':
        return this.onAction({ kind: act, id });
      case 'askQuiz':
        return this.onAction({ kind: 'askQuiz', id });
      case 'answerQuiz':
        return this.onAction({ kind: 'answerQuiz', id, dung: el.dataset.dung === '1', pick: Number(el.dataset.i) });
      case 'closeQuiz':
        return this.closeQuiz();
      case 'cancelJob':
        // Hủy việc xây: bấm lần đầu chỉ hỏi lại, bấm lần nữa mới hủy.
        if (this.cancelArmed !== id) {
          this.cancelArmed = id;
          return this.refreshSheet(this.getState());
        }
        this.cancelArmed = null;
        return this.onAction({ kind: 'cancelJob', id });
      case 'offerGift':
        return this.onAction({ kind: 'offerGift', gift: el.dataset.gift as GiftId });
      case 'workers':
        return this.onAction({ kind: 'workers', id, delta: Number(el.dataset.delta) });
      case 'acceptOffer':
        return this.onAction({ kind: 'acceptOffer', index: id });
      case 'repair':
        return this.onAction({ kind: 'repair', id });
      case 'train':
        return this.onAction({ kind: 'train', unit: el.dataset.unit as UnitType });
      case 'guardDelta':
        return this.onAction({ kind: 'guardDelta', unit: el.dataset.unit as UnitType, delta: Number(el.dataset.delta) < 0 ? -1 : 1 });
      case 'garrisonDelta':
        return this.onAction({ kind: 'garrisonDelta', id, unit: el.dataset.unit as UnitType, delta: Number(el.dataset.delta) < 0 ? -1 : 1 });
      case 'forgeArms':
        return this.onAction({ kind: 'forgeArms', unit: el.dataset.unit as UnitType });
      case 'applyMau':
        return this.onAction({ kind: 'applyMau', mau: el.dataset.mau as MauId });
      case 'phatRung':
        return this.onAction({ kind: 'phatRung', id });
      case 'seeIsland':
        return this.onAction({ kind: 'seeIsland', id: el.dataset.dao as QuanDaoId });
      case 'trinhSat':
        return this.onAction({ kind: 'trinhSat', id });
      case 'ketThan':
        return this.onAction({ kind: 'ketThan', id });
      case 'donPrepare':
        this.donPick = { ...defaultPick(this.getState()), don: id };
        return this.refreshSheet(this.getState());
      case 'donBack':
        this.donPick = null;
        return this.refreshSheet(this.getState());
      case 'donMarch': {
        if (!this.donPick) return;
        const { don, army, rows, nu } = this.donPick;
        return this.onAction({ kind: 'marchCamp', plot: don!, army: { ...army }, rows: { ...rows }, nu: nu ?? null });
      }
      case 'offerBanh':
        return this.onAction({ kind: 'offerBanh', banh: el.dataset.banh as Banh });
      case 'closeCampaign':
        return this.closeCampaign();
      case 'useSkill':
        return this.onAction({ kind: 'useSkill', skill: el.dataset.skill as SkillId });
      case 'forgeGear':
        return this.onAction({ kind: 'forgeGear', gear: el.dataset.gear as GearId });
      case 'setResolution':
        return this.onAction({ kind: 'setResolution', resolution: el.dataset.resolution as Resolution });
      case 'storyNext':
        return this.storyNext();
      case 'campChapter':
      case 'pickStage':
      case 'prepareStage':
      case 'prepareChallenge':
      case 'openHuan':
      case 'backToStage':
      case 'armyDelta':
      case 'armyRow':
      case 'armyHero':
      case 'armyNu':
      case 'openDau':
      case 'dauTarget':
      case 'dauSide':
      case 'dauNext':
      case 'dauBack':
      case 'dauDelta':
        // Đang chọn quân đánh đồn trong bảng Đất bên kia sông.
        if (this.donPick && this.sheet?.kind === 'benKia' && act !== 'backToStage') return this.donPickStep(act, el);
        return this.campaignStep(act, id, el);
      case 'march': {
        if (!this.camp?.stage) return;
        const { army, rows, challenge, hero, nu } = this.camp.pick;
        return this.onAction({ kind: 'march', stage: this.camp.stage, army: { ...army }, rows: { ...rows }, challenge, hero: hero ?? null, nu: nu ?? null });
      }
      case 'buyHuan':
        return this.onAction({ kind: 'buyHuan', branch: el.dataset.branch as HuanBranch });
      case 'dauAttack': {
        const dau = this.camp?.dau;
        if (!dau) return;
        return this.onAction({ kind: 'dauThanh', target: dau.target, side: dau.side, army: { ...dau.army } });
      }
      case 'openFile': {
        const input = this.sheetEl.querySelector<HTMLInputElement>('#save-file');
        if (!input) return;
        // Xóa lựa chọn cũ để chọn lại đúng tệp đó vẫn nạp được.
        input.value = '';
        return input.click();
      }
      case 'importCode': {
        const box = this.sheetEl.querySelector<HTMLTextAreaElement>('#import-box');
        return this.onAction({ kind: 'importCode', code: box?.value ?? '' });
      }
      default:
        return this.onAction({ kind: act } as HudAction);
    }
  };

  // ---------- Dải tài nguyên (mép trên) ----------

  /** Dải tài nguyên: cấp Điện, các tài nguyên số gọn, dân, nút cài đặt. Chạm dải thì thả bảng kho và thu chi.
   *  Khung dựng lại chỉ khi đổi bộ tài nguyên; số thì thay tại chỗ để không thay nút giữa lúc người chơi chạm. */
  updateTop(state: GameState): void {
    const ids = shownResources(state);
    const key = ids.join();
    if (key !== this.bandKey) {
      this.bandKey = key;
      this.topbar.innerHTML = `<div class="dien-level" title="${vi.buildings.dien.name}">🏯<b></b></div>
        <button class="res-strip" data-act="togglePop" data-pop="res" aria-label="${vi.ui.resDetail}">
          ${ids.map((r) => `<span class="res" data-res="${r}" title="${vi.resources[r].name}">${vi.resources[r].icon}<b></b></span>`).join('')}
          <span class="more"></span>
        </button>
        <button class="dan-btn" data-act="danInfo">👥<b></b><i></i></button>
        <button class="icon-btn" data-act="openSettings" aria-label="${vi.ui.settings}">⚙️</button>`;
    }
    const store = storageCap(state);
    this.topbar.querySelector('.dien-level b')!.textContent = String(dienLevel(state));
    // Tốp thợ: hết tốp rảnh thì ô đổi màu, ghi lúc sớm nhất có tốp rảnh.
    const tho = soTho(state);
    const allBusy = tho.ranh === 0 && viecOf(state).length > 0;
    this.thoChip.hidden = tho.tong === 0;
    this.thoChip.classList.toggle('busy', allBusy);
    this.thoChip.classList.toggle('on', this.sheet?.kind === 'tho');
    const chip = `🔨 ${tho.ranh}/${tho.tong}${allBusy ? ` · ${formatClock(thoRanhSau(state))}` : ''}`;
    if (this.thoChip.textContent !== chip) this.thoChip.textContent = chip;
    for (const el of this.topbar.querySelectorAll<HTMLElement>('[data-res]')) {
      const v = state.resources[el.dataset.res as ResourceId];
      el.querySelector('b')!.textContent = fmtShort(v);
      el.classList.toggle('full', v >= store);
    }
    const open = this.pop === 'res';
    const strip = this.topbar.querySelector<HTMLElement>('.res-strip')!;
    strip.classList.toggle('on', open);
    strip.setAttribute('aria-expanded', String(open));
    strip.querySelector('.more')!.textContent = open ? '▴' : '▾';
    const free = freeDan(state);
    const room = housing(state);
    const dan = this.topbar.querySelector<HTMLElement>('.dan-btn')!;
    dan.classList.toggle('idle', free > 0);
    dan.title = vi.ui.danTitle(state.dan, room, free);
    dan.querySelector('b')!.textContent = String(state.dan);
    dan.querySelector('i')!.textContent = free > 0 ? `+${free}` : '';

    // Bảng kho: số đúng, sức chứa, thu chi mỗi phút; dân và quân.
    let html = '';
    if (open) {
      const rate = netPerMinute(state);
      const rows = ids.map((r) => {
        const v = state.resources[r];
        const n = Math.round(rate[r]);
        return `<tr><td>${vi.resources[r].icon} ${vi.resources[r].name}</td><td class="${v >= store ? 'full' : ''}"><b>${fmt(v)}</b><small>/${fmt(store)}</small></td>
          <td class="${n < 0 ? 'neg' : 'pos'}">${n < 0 ? '−' + fmt(-n) : '+' + fmt(n)}${vi.ui.perMinute}</td></tr>`;
      });
      rows.push(`<tr><td>👥 ${vi.ui.dan}</td><td><b>${state.dan}</b><small>/${room}</small></td><td class="pos">${vi.ui.freeShort(free)}</td></tr>`);
      const cap = troopCap(state);
      if (cap) rows.push(`<tr><td>⚔️ ${vi.ui.tabArmy}</td><td><b>${troopSpace(state)}</b><small>/${cap}</small></td><td></td></tr>`);
      html = `<table class="res-table">${rows.join('')}</table>`;
    }
    if (html !== this.resHtml) {
      this.resHtml = html;
      this.resDrop.innerHTML = html;
    }
    this.resDrop.hidden = !open;
  }

  // ---------- Dòng tin trên dock: giặc, đói, Tết, thuyền buôn, trinh sát ----------

  /** Các tin đang có, tin gấp (giặc, đói) trước. */
  private alerts(state: GameState): { id: string; text: string; tone: 'bad' | 'tet' | 'info'; act?: string; label?: string }[] {
    const list: ReturnType<Hud['alerts']> = [];
    const raid = state.raid;
    const sideName = { bac: vi.ui.sideBac, tay: vi.ui.sideTay, nam: vi.ui.sideNam, dong: vi.ui.sideDong, namXa: vi.ui.sideNamXa, dongXa: vi.ui.sideDongXa }[raid.side];
    if (raid.phase === 'warning') {
      const secs = Math.max(0, Math.ceil((raid.startsAt - state.clock) / 1000));
      if (raid.foe === 'thuy') {
        list.push({ id: 'giac', text: `🌧️ ${vi.ui.floodWarning(sideName, secs, nextFloodLevel(state))}`, tone: 'bad', act: 'lookRaid', label: vi.ui.floodLook });
        // Cống đang mở: nhắc ruộng nào được bồi, công trình nào sẽ ngập, còn kịp đóng.
        if (hasOpenCong(state)) {
          const p = phuSaPreview(state);
          list.push({ id: 'phuSa', text: vi.ui.phuSaWarning(p.boi.length, p.drown.length), tone: 'info' });
        }
      } else {
        const text =
          raid.foe === 'yeu'
            ? `🌙 ${vi.ui.yeuWarning(sideName, secs)}`
            : raid.foe === 'trieu'
              ? `⚠️ ${vi.ui.trieuWarning(sideName, secs)}`
              : raid.foe === 'han'
                ? `⚠️ ${vi.ui.hanWarning(sideName, secs)}`
                : raid.foe === 'thuyBinh'
                  ? `⛵ ${vi.ui.thuyBinhWarning(sideName, secs)}`
                  : raid.foe === 'thuyHan'
                    ? `⛵ ${vi.ui.thuyHanWarning(sideName, secs)}`
                    : `⚠️ ${vi.ui.raidWarning(sideName, secs)}`;
        list.push({ id: 'giac', text, tone: 'bad', act: 'lookRaid', label: vi.ui.raidLook });
      }
    }
    if (raid.phase === 'battle' && raid.battle) {
      const b = raid.battle;
      const left = enemiesLeft(b);
      const ours = alliesLeft(b);
      const text =
        b.floodTo > 0
          ? `🌊 ${vi.ui.floodBattle(Math.floor(b.water * 10) / 10, b.floodTo, left, ours)}`
          : b.foe === 'yeu'
            ? `🌙 ${vi.ui.yeuBattle(left, ours)}`
            : b.foe === 'trieu'
              ? `⚔️ ${vi.ui.trieuBattle(left, ours)}`
              : b.foe === 'han'
                ? `⚔️ ${vi.ui.hanBattle(left, ours)}`
                : b.foe === 'thuyBinh'
                  ? `⛵ ${vi.ui.thuyBinhBattle(left, ours)}`
                  : b.foe === 'thuyHan'
                    ? `⛵ ${vi.ui.thuyHanBattle(left, ours)}`
                    : `⚔️ ${vi.ui.raidBattle(left, ours)}`;
      list.push({ id: 'tran', text, tone: 'bad' });
    }
    if (isStarving(state)) list.push({ id: 'doi', text: `🍚 ${vi.ui.starving}`, tone: 'bad' });
    if (tetOpen(state)) {
      const secs = Math.max(0, Math.ceil((state.tet.openUntil - state.clock) / 1000));
      if (!(state.tet.offered.chung && state.tet.offered.giay)) list.push({ id: 'tet', text: vi.ui.tetBanner(secs), tone: 'tet', act: 'openTet', label: vi.ui.tetOfferBtn });
      else list.push({ id: 'tet', text: vi.ui.tetLeft(secs), tone: 'info', act: 'openTet', label: vi.ui.tet });
    }
    const visit = state.merchant.visit;
    if (visit) {
      const secs = Math.max(0, Math.ceil((visit.leavesAt - state.clock) / 1000));
      list.push({ id: 'thuyen', text: `⛵ ${vi.ui.merchantHere(secs)}`, tone: 'info', act: 'openMerchant', label: vi.ui.merchantOpen });
    }
    if (state.benKia.scouts.length) {
      const secs = Math.max(0, Math.ceil((Math.min(...state.benKia.scouts.map((sc) => sc.at)) - state.clock) / 1000));
      list.push({ id: 'trinhSat', text: vi.ui.scoutAway(secs), tone: 'info' });
    }
    // Việc xây sắp xong nhất.
    const jobs = viecOf(state);
    if (jobs.length) {
      const v = jobs.reduce((a, j) => (conLai(state, j) < conLai(state, a) ? j : a));
      list.push({ id: 'xay', text: vi.ui.tickerXay(jobName(state, v), formatClock(conLai(state, v))), tone: 'info', act: 'openTho', label: vi.ui.thoTitle });
    }
    return list;
  }

  /** Dòng tin và nút kỹ năng khi giặc đánh kinh đô. Chữ đếm ngược thay tại chỗ để nút trong tin không bị thay giữa lúc chạm. */
  updateBanners(state: GameState): void {
    const list = this.alerts(state);
    const ids = list.map((a) => a.id).join();
    // Có tin mới (hay tin cũ hết) thì về tin đầu: tin gấp nhất luôn hiện trước.
    if (ids !== this.alertIds) {
      this.alertIds = ids;
      this.alertIndex = 0;
    }
    const i = list.length ? this.alertIndex % list.length : 0;
    const a = list[i];
    const key = a ? `${a.id}|${a.act ?? ''}|${a.label ?? ''}|${a.tone}|${i}/${list.length}` : '';
    if (key !== this.tickerKey) {
      this.tickerKey = key;
      this.ticker.innerHTML = a
        ? `<div class="ticker-item ${a.tone}"><span class="tx"></span>
          ${a.act ? `<button class="btn small ${a.tone === 'bad' ? 'light' : 'bronze'}" data-act="${a.act}">${a.label}</button>` : ''}
          ${list.length > 1 ? `<button class="next" data-act="nextAlert" aria-label="${vi.ui.nextAlert}">${i + 1}/${list.length} ›</button>` : ''}</div>`
        : '';
    }
    if (a) this.ticker.querySelector('.tx')!.textContent = a.text;

    // Nút kỹ năng khi giặc đánh kinh đô: dựng lại khi đổi bộ kỹ năng, còn lại chỉ đổi chữ và trạng thái.
    const b = state.raid.phase === 'battle' ? state.raid.battle : null;
    const skillKey = b ? `${b.id}:${b.skills.join(',')}:${b.hero?.layTrao ? 1 : 0}` : '';
    if (skillKey !== this.raidSkillKey) {
      this.raidSkillKey = skillKey;
      const stolen = b?.hero?.layTrao ? `<button class="btn bronze skill small" disabled>${vi.skills.noThan.icon} ${vi.ui.layTrao}</button>` : '';
      this.raidSkills.innerHTML = b ? stolen + b.skills.map((k) => skillButton(b, k, true)).join('') : '';
    }
    if (b) {
      for (const btn of this.raidSkills.querySelectorAll<HTMLButtonElement>('[data-skill]')) {
        syncSkill(btn, b, btn.dataset.skill as SkillId);
      }
    }
  }

  // ---------- Dock: Quân, Phó bản, Xây dựng, Tướng, Lạc hầu ----------

  /** Bảng đang mở là bảng doanh trại (thẻ Quân sáng). */
  private barracksOpen(state: GameState): boolean {
    return this.sheet?.kind === 'building' && findBuilding(state, this.sheet.id)?.type === 'doanhTrai';
  }

  /** Các tướng đang có ở kinh đô (hay đang nghỉ dù đã đi), với dấu: đang góp đủ chưa, sẵn sàng ⚔️ hay nghỉ 💤. */
  private heroes(state: GameState): { act: string; icon: string; name: string; mark: string }[] {
    const list: ReturnType<Hud['heroes']> = [];
    const look = giongLook(state);
    if (look) {
      const mark = giongReady(state) ? (giongResting(state) ? '💤' : '⚔️') : `${state.giong.fed}/5`;
      list.push({ act: 'openGiong', icon: vi.giongLooks[look].icon, name: vi.ui.giong, mark });
    } else if (state.giong.ascended && giongResting(state)) {
      // Gióng đã về trời thì không đứng ở kinh đô, nhưng vẫn báo khi đang kiệt sức để người chơi khỏi xuất quân thiếu tướng.
      list.push({ act: 'openGiong', icon: '🐎', name: vi.ui.giong, mark: '💤' });
    }
    const sLook = sonLook(state);
    if (sLook) {
      const mark = sonJoined(state) ? (sonResting(state) ? '💤' : '⚔️') : `${giftCount(state)}/5`;
      list.push({ act: 'openSon', icon: vi.sonLooks[sLook].icon, name: vi.ui.son, mark });
    } else if (state.son.won && sonResting(state)) {
      list.push({ act: 'openSon', icon: '⛰️', name: vi.ui.son, mark: '💤' });
    }
    const aLook = advLook(state);
    if (aLook) {
      const mark = advJoined(state) ? (advResting(state) ? '💤' : '⚔️') : `${Math.min(wallRings(state), RINGS_NEEDED)}/${RINGS_NEEDED}`;
      list.push({ act: 'openAdv', icon: vi.advLooks[aLook].icon, name: vi.ui.adv, mark });
    } else if (state.adv.bien && advResting(state)) {
      // Vua đã xuống biển thì không đứng ở Điện, nhưng vẫn báo khi đang kiệt sức (vẫn ra trận ở màn 17–25).
      list.push({ act: 'openAdv', icon: '🏹', name: vi.ui.adv, mark: '💤' });
    }
    // Cao Lỗ cầm quân từ màn 25.
    if (caoLoJoined(state)) list.push({ act: 'openCaoLo', icon: '🎯', name: vi.ui.caoLo, mark: caoLoResting(state) ? '💤' : '⚔️' });
    // Hai Bà Trưng từ chương 5: chưa có bảng riêng, chỉ báo bà nào sẵn sàng, bà nào đang nghỉ.
    if (haiBaJoined(state)) {
      for (const k of HAI_BA_KINDS) list.push({ act: '', icon: vi.ui.tuongIcons[k], name: vi.ui.heroNames[k], mark: haiBaResting(state, k) ? '💤' : '⚔️' });
    }
    return list;
  }

  /** Dock năm thẻ và ô bật lên trên dock (thẻ Lạc hầu, danh sách tướng). */
  updateQuest(state: GameState): void {
    const quest = currentQuest(state);
    const progress = questProgress(state);
    const done = questDone(state);
    const heroes = this.heroes(state);
    const cap = troopCap(state);
    const tab = (o: { act: string; pop?: string; icon: string; label: string; on: boolean; off?: boolean; badge?: string; hot?: boolean; main?: boolean; title?: string }) =>
      `<button class="tab ${o.on ? 'on' : ''} ${o.main ? 'main' : ''}" data-act="${o.act}" ${o.pop ? `data-pop="${o.pop}"` : ''} ${o.title ? `title="${o.title}"` : ''} ${o.off ? 'disabled' : ''}>
        <span class="ic">${o.icon}${o.badge ? `<i class="badge ${o.hot ? 'hot' : ''}">${o.badge}</i>` : ''}</span><span class="lb">${o.label}</span></button>`;
    // Xây dựng nổi tròn ở giữa: việc làm nhiều nhất, ngón cái với tới dễ nhất.
    const dock =
      tab({ act: 'openBarracks', icon: '⚔️', label: vi.ui.tabArmy, on: this.barracksOpen(state), off: !cap, badge: cap ? `${troopSpace(state)}/${cap}` : '', title: cap ? vi.ui.troopSpace(troopSpace(state), cap) : '' }) +
      tab({ act: 'openCampaign', icon: '🗺️', label: vi.ui.campaign, on: this.camp !== null, off: countOf(state, 'doanhTrai') === 0 }) +
      tab({ act: 'openBuild', icon: '🔨', label: vi.ui.build, on: this.sheet?.kind === 'build', main: true }) +
      tab({ act: 'togglePop', pop: 'heroes', icon: '🎖️', label: vi.ui.tabHeroes, on: this.pop === 'heroes', off: !heroes.length, badge: heroes.some((h) => h.mark === '⚔️') ? '⚔️' : '', hot: true }) +
      tab({ act: 'togglePop', pop: 'quest', icon: '📜', label: vi.ui.lacHau, on: this.pop === 'quest', badge: done ? '!' : progress ? `${progress.have}/${progress.need}` : '', hot: done }) +
      `<button class="icon-btn rotate" data-act="rotateView" aria-label="${vi.ui.rotate}" title="${vi.ui.rotate}">⟳</button>`;
    if (dock !== this.dockHtml) {
      this.dockHtml = dock;
      this.dock.innerHTML = dock;
    }
    this.dock.classList.toggle('quest-ready', done);

    let pop = '';
    if (this.pop === 'quest') {
      if (!quest || !progress) {
        // Hết truyện rồi thì mở lại được màn hình Hết truyện.
        const ending = state.story.seen.includes('hetTruyen') ? `<div class="quest-foot"><button class="btn small ghost" data-act="openEnding">${vi.ui.endingOpen}</button></div>` : '';
        pop = `<div class="pop-card quest-card"><h4>📜 ${vi.ui.lacHau}</h4><p>${esc(vi.quests.allDone)}</p>${ending}</div>`;
      } else {
        pop = `<div class="pop-card quest-card ${done ? 'ready' : ''}"><h4>📜 ${vi.ui.lacHau}</h4><p>${esc(vi.quests[quest.id])}</p>
          <div class="quest-foot">
            <span class="progress">${progress.have}/${progress.need}</span>
            <span class="reward">${vi.ui.reward}: ${costHtml(null, quest.reward)}</span>
            ${done ? `<button class="btn small bronze" data-act="claimQuest">${vi.ui.claim}</button>` : ''}
          </div></div>`;
      }
    } else if (this.pop === 'heroes') {
      pop = `<div class="pop-card"><h4>🎖️ ${vi.ui.tabHeroes}</h4>${heroes
        .map((h) => {
          const inner = `<span class="ic">${h.icon}</span><b>${h.name}</b><span class="mark">${h.mark}</span>`;
          return h.act ? `<button class="hero-row" data-act="${h.act}">${inner}</button>` : `<div class="hero-row">${inner}</div>`;
        })
        .join('')}</div>`;
    }
    if (pop !== this.popHtml) {
      this.popHtml = pop;
      this.dockPop.innerHTML = pop;
    }
  }

  // ---------- Thanh Hủy, Đặt (thay chỗ dock khi đặt, dời, trải, ghép) ----------

  /**
   * Đổi chế độ thanh dưới. `turnable`: công trình đang đặt, dời xoay được, hiện nút ↻ Xoay. `shape`: đang đắp tường,
   * hiện nút đổi kéo dải thẳng hay khung chữ nhật.
   */
  setMode(mode: HudMode, placeValid = true, hint?: string, turnable = false, shape?: WallShape): void {
    this.mode = mode;
    this.turnable = turnable;
    this.root.classList.toggle('placing', mode !== 'view');
    if (mode !== 'view' && this.pop) {
      this.pop = null;
      const state = this.getState();
      this.updateTop(state);
      this.updateQuest(state);
    }
    // Nút xoay cảnh ở mọi chế độ: lúc đặt, dời, dựng lũy là lúc cần xoay nhất.
    const rotate = `<button class="icon-btn rotate" data-act="rotateView" aria-label="${vi.ui.rotate}" title="${vi.ui.rotate}">⟳</button>`;
    this.bottombar.classList.remove('crowded');
    if (mode === 'view') {
      this.bottombar.innerHTML = '';
      this.hint.hidden = true;
    } else if (mode === 'place' || mode === 'move') {
      const label = mode === 'move' ? vi.ui.moveHere : vi.ui.place;
      // Nút xoay công trình chữ rõ "Xoay", khác nút tròn ⟳ xoay cảnh.
      const turn = turnable
        ? `<button class="btn bronze turn" data-act="rotatePlace" aria-label="${vi.ui.turnTitle}" title="${vi.ui.turnTitle}">↻ ${vi.ui.turn}</button>`
        : '';
      this.bottombar.innerHTML = `
        <button class="btn ghost" data-act="cancelPlace">✕ ${vi.ui.cancel}</button>${turn}
        <button class="btn" data-act="confirmPlace" ${placeValid ? '' : 'disabled'}>✓ ${label}</button>${rotate}`;
      this.bottombar.classList.toggle('crowded', turnable);
      this.hint.hidden = false;
      this.hint.textContent = this.placeHint();
    } else if (mode === 'merge') {
      this.bottombar.innerHTML = `<button class="btn ghost" data-act="cancelPlace">✕ ${vi.ui.cancel}</button>${rotate}`;
      this.hint.hidden = false;
      this.hint.textContent = vi.ui.mergeHint;
    } else {
      const toggle = shape
        ? `<button class="btn bronze turn" data-act="toggleWallShape" aria-label="${vi.ui.wallShapeTitle}" title="${vi.ui.wallShapeTitle}">${vi.ui.wallShape[shape]}</button>`
        : '';
      this.bottombar.innerHTML = `<button class="btn" data-act="cancelPlace">✓ ${vi.ui.done}</button>${toggle}${rotate}`;
      this.bottombar.classList.toggle('crowded', !!shape);
      this.hint.hidden = false;
      this.hint.textContent = hint ?? vi.ui.wallHint;
    }
  }

  /** Bật/tắt nút Đặt và đổi dòng gợi ý thành lý do khi chỗ này không đặt được. */
  setPlaceValid(valid: boolean, reason?: string): void {
    const btn = this.bottombar.querySelector<HTMLButtonElement>('[data-act="confirmPlace"]');
    if (btn) btn.disabled = !valid;
    if (btn) this.hint.textContent = valid || !reason ? this.placeHint() : reason;
  }

  /** Công trình đang đặt, dời có xoay được không (thanh dưới có nút ↻ Xoay). */
  private turnable = false;

  /** Dòng gợi ý khi đặt, dời công trình. */
  private placeHint(): string {
    if (this.mode === 'move') return vi.ui.moveHint;
    return this.turnable ? vi.ui.placeTurnHint : vi.ui.placeHint;
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
    this.buildPage = null;
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

  showSon(state: GameState): void {
    this.sheet = { kind: 'son' };
    this.refreshSheet(state);
  }

  showAdv(state: GameState): void {
    this.sheet = { kind: 'adv' };
    this.refreshSheet(state);
  }

  /** Hộp thoại đố sử của việc `viec`, câu `cau` ở lượt `hoi`; có `result` thì hiện kết quả vừa trả lời. */
  showQuiz(viec: number, cau: number, hoi: number, result?: QuizResult): void {
    this.closeQuiz();
    const back = document.createElement('div');
    back.className = 'modal-back quiz-back';
    back.innerHTML = quizHtml(viec, cau, hoi, result);
    this.root.appendChild(back);
  }

  closeQuiz(): void {
    this.root.querySelector('.modal-back.quiz-back')?.remove();
  }

  /** Bảng Thợ hồ: các tốp thợ và việc đang làm. */
  showTho(state: GameState): void {
    this.sheet = { kind: 'tho' };
    this.refreshSheet(state);
  }

  showCaoLo(state: GameState): void {
    this.sheet = { kind: 'caoLo' };
    this.refreshSheet(state);
  }

  /** Mẫu vừa bấm Áp lần đầu (chờ bấm lần nữa cho chắc). */
  mauArmed: MauId | null = null;
  /** Việc xây vừa bấm Hủy lần đầu (chờ bấm lần nữa cho chắc). */
  private cancelArmed: number | null = null;
  /** Loại bảng đang vẽ trên màn hình, để giữ chỗ cuộn khi vẽ lại cùng bảng. */
  private sheetKindShown = '';
  /** Nhóm đang xem trong bảng Xây dựng; nhớ cho lần mở sau. */
  private buildTab: (typeof BUILD_GROUPS)[number]['key'] = 'congTrinh';
  /** Mục đang chọn trong bảng Xây dựng (`BuildItem.key`); nhớ cho lần mở sau để xây tiếp cùng loại. */
  private buildPick: string | null = null;
  /** Trang đang xem của lưới ảnh nhỏ; null là trang có mục đang chọn (mở bảng, đổi thẻ). */
  private buildPage: number | null = null;
  /** Thẻ đang xem trong bảng doanh trại; nhớ cho lần mở sau. */
  private barracksTab: BarracksTab = 'quan';

  /** Mục lính đóng ở đồn biên: mỗi binh chủng một hàng, bớt, thêm (không quá quân đang có, trừ phần đóng ở bờ kia). */
  private garrisonHtml(state: GameState, b: Building): string {
    const bank = farBankOf(b.x, b.z);
    if (!bank) return '';
    const here = state.benKia.garrison[bank];
    const other = bank === 'nam' ? state.benKia.garrison.dong : state.benKia.garrison.nam;
    const owned = UNIT_TYPES.filter((k) => state.troops[k] > 0 || here[k] > 0);
    const rows = owned.map((k) => {
      const max = Math.max(0, state.troops[k] - other[k]);
      return `<div class="unit-row army">
        <span class="unit-icon">${vi.units[k].icon}</span>
        <span class="unit-info"><b>${vi.units[k].name}</b><small>${vi.ui.haveTroops(state.troops[k])}</small></span>
        <button class="step" data-act="garrisonDelta" data-id="${b.id}" data-unit="${k}" data-delta="-1" ${here[k] > 0 ? '' : 'disabled'} aria-label="Bớt một lính đóng ở đồn">−</button>
        <b class="count">${here[k]}</b>
        <button class="step" data-act="garrisonDelta" data-id="${b.id}" data-unit="${k}" data-delta="1" ${here[k] < max ? '' : 'disabled'} aria-label="Thêm một lính đóng ở đồn">+</button>
      </div>`;
    });
    return `<h3>🛡️ ${vi.benKia.garrisonTitle}</h3><p class="muted">${vi.benKia.garrisonHint}</p>${owned.length ? `<div class="units">${rows.join('')}</div>` : `<p class="why">${vi.ui.noTroops}</p>`}`;
  }

  /** Bảng Đất bên kia sông của khoảnh bên kia `id`. */
  showBenKia(state: GameState, id: number): void {
    this.sheet = { kind: 'benKia', id };
    this.donPick = null;
    this.refreshSheet(state);
  }

  /** Chọn số lính, hàng đứng khi điều quân đánh đồn. */
  private donPickStep(act: string, el: HTMLElement): void {
    const pick = this.donPick!;
    const state = this.getState();
    const unit = el.dataset.unit as UnitType;
    if (act === 'armyDelta') stepPick(state, pick, unit, Number(el.dataset.delta));
    else if (act === 'armyNu') pickNu(state, pick, el.dataset.nu);
    else pick.rows[unit] = nextRow(pick.rows[unit]);
    this.refreshSheet(state);
  }

  /** Bảng quần đảo `id` ngoài biển Đông (vừa chạm vào đảo). */
  showQuanDao(state: GameState, id: QuanDaoId): void {
    this.sheet = { kind: 'quanDao', id };
    this.refreshSheet(state);
  }

  /** Bảng Khoảnh rừng của khoảnh `id` (vừa chạm vào rừng). */
  showKhoanh(state: GameState, id: number): void {
    this.sheet = { kind: 'khoanh', id };
    this.refreshSheet(state);
  }

  showTet(state: GameState): void {
    this.sheet = { kind: 'tet' };
    this.refreshSheet(state);
  }

  showSettings(state: GameState, resolution: Resolution): void {
    this.sheet = { kind: 'settings', resolution };
    this.refreshSheet(state, true);
  }

  closeSheet(): void {
    const was = this.sheet !== null;
    this.sheet = null;
    this.donPick = null;
    this.cancelArmed = null;
    this.sheetKindShown = '';
    this.sheetEl.classList.remove('open');
    this.root.classList.remove('sheet-open');
    // Tắt thẻ đang sáng trên dock ngay, không chờ lần vẽ sau.
    if (was) this.updateQuest(this.getState());
  }

  /** Tâm của phần màn hình không bị dải tài nguyên, dock và bảng trượt che, để camera đưa công trình đang chọn vào đó. */
  freeCenter(): { x: number; y: number } {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const top = this.topbar.offsetHeight;
    const dock = this.dock.offsetHeight;
    if (!this.sheet) return { x: w / 2, y: (top + h - dock) / 2 };
    const sideBySide = window.matchMedia('(min-width: 600px) and (min-aspect-ratio: 4/5)').matches;
    if (sideBySide) return { x: (w - this.sheetEl.offsetWidth - 10) / 2, y: (top + h - dock) / 2 };
    // Bảng nằm ngay trên dock (offsetHeight không tính phần đang trượt lên).
    return { x: w / 2, y: (top + h - dock - this.sheetEl.offsetHeight) / 2 };
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
      const dung = b ? undefined : pendingBuilding(state, this.sheet.id);
      if (dung) {
        // Công trình đang dựng mới: chưa vào kinh đô, bảng chỉ có việc xây; xong thì thành bảng công trình như thường.
        title = `${vi.buildings[dung.type].icon} ${buildingName(dung)}`;
        body = pendingHtml(state, dung, this.cancelArmed);
      } else {
        if (!b) return this.closeSheet();
        title = `${vi.buildings[b.type].icon} ${buildingName(b)}`;
        body = this.buildingHtml(state, b.id);
      }
    } else if (this.sheet.kind === 'tho') {
      title = `🔨 ${vi.ui.thoTitle}`;
      body = thoHtml(state, this.cancelArmed);
    } else if (this.sheet.kind === 'merchant') {
      if (!state.merchant.visit) return this.closeSheet();
      title = `⛵ ${vi.ui.merchantTitle}`;
      body = this.merchantHtml(state);
    } else if (this.sheet.kind === 'giong') {
      title = `🐎 ${vi.ui.giong}`;
      body = giongHtml(state);
    } else if (this.sheet.kind === 'son') {
      title = `⛰️ ${vi.ui.son}`;
      body = sonHtml(state);
    } else if (this.sheet.kind === 'adv') {
      title = `🏹 ${vi.ui.adv}`;
      body = advHtml(state);
    } else if (this.sheet.kind === 'caoLo') {
      title = `🎯 ${vi.ui.caoLo}`;
      body = caoLoHtml(state);
    } else if (this.sheet.kind === 'khoanh') {
      // Đã phát xong thì đóng bảng.
      if (state.khoanh.includes(this.sheet.id)) return this.closeSheet();
      title = `🌳 ${vi.ui.khoanhTitle}`;
      body = khoanhHtml(state, this.sheet.id);
    } else if (this.sheet.kind === 'quanDao') {
      title = `${vi.bien.icon} ${vi.bien.quanDao[this.sheet.id].name}`;
      body = quanDaoHtml(state, this.sheet.id);
    } else if (this.sheet.kind === 'benKia') {
      title = `🌄 ${vi.benKia.title}`;
      if (this.donPick) for (const k of UNIT_TYPES) this.donPick.army[k] = Math.min(this.donPick.army[k], state.troops[k]);
      body = benKiaHtml(state, this.sheet.id, this.donPick);
    } else if (this.sheet.kind === 'tet') {
      title = `🎋 ${vi.ui.tet}`;
      body = tetHtml(state);
    } else {
      title = `⚙️ ${vi.ui.settings}`;
      body = this.settingsHtml(state, this.sheet.resolution);
    }
    const html = `<div class="sheet-head"><h2>${title}</h2><button class="close" data-act="closeSheet" aria-label="${vi.ui.close}">✕</button></div>
      <div class="sheet-body">${body}</div>`;
    if (html !== this.sheetHtml || force) {
      // Bảng Xây dựng vẽ lại (đổi mục chọn, đủ tiền...) thì giữ chỗ đã cuộn.
      const body = this.sheetEl.querySelector('.sheet-body');
      const top = body?.scrollTop ?? 0;
      const same = this.sheet.kind === 'build' && this.sheetKindShown === 'build';
      this.sheetHtml = html;
      this.sheetEl.innerHTML = html;
      if (same) {
        this.sheetEl.querySelector('.sheet-body')?.scrollTo(0, top);
      }
      this.sheetKindShown = this.sheet.kind;
    }
    fillXay(this.sheetEl, state);
    const opening = !this.sheetEl.classList.contains('open');
    this.sheetEl.classList.toggle('build', this.sheet.kind === 'build');
    this.sheetEl.classList.toggle('tall', this.sheet.kind === 'build' || this.barracksOpen(state));
    this.sheetEl.classList.add('open');
    this.root.classList.add('sheet-open');
    // Thẻ Lạc hầu, danh sách tướng nằm đúng chỗ bảng: mở bảng thì đóng chúng.
    if (this.pop === 'quest' || this.pop === 'heroes') this.pop = null;
    if (opening) this.updateQuest(state);
  }

  private buildMenuHtml(state: GameState): string {
    const { tabs, note, items, prefer, foot } = this.buildMenuData(state);
    this.buildPick = pickOf(items, this.buildPick, prefer);
    const { cols, rows } = Hud.buildGrid();
    const per = cols * rows;
    const page = Math.min(this.buildPage ?? pageOf(items, this.buildPick, per), pageCount(items.length, per) - 1);
    this.buildPage = page;
    return `${tabs}${note}${xayDungHtml(items, this.buildPick, foot, { page, cols, rows })}`;
  }

  /**
   * Cỡ một trang lưới ảnh nhỏ trong bảng Xây dựng, cho ảnh lớn, nút Xây và cả trang vừa bảng mà không phải cuộn:
   * điện thoại dọc 2 hàng (5 cột, màn hẹp như màn ngoài Fold5 thì 4); bảng bên phải màn rộng 4 cột, số hàng theo
   * chiều cao màn.
   */
  private static buildGrid(): { cols: number; rows: number } {
    const side = window.matchMedia('(min-width: 600px) and (min-aspect-ratio: 4/5)').matches;
    if (side) return { cols: 4, rows: Math.min(8, Math.max(1, Math.floor((window.innerHeight - 430) / 78))) };
    return { cols: window.innerWidth >= 370 ? 5 : 4, rows: 2 };
  }

  /**
   * Thẻ chọn nhóm, dòng ghi chú, các mục của nhóm đang xem trong bảng Xây dựng, mục nên chọn sẵn và ghi chú cuối bảng.
   */
  private buildMenuData(state: GameState): { tabs: string; note: string; items: BuildItem[]; prefer?: string; foot?: string } {
    // Đắp đất là việc của dân, không phải công trình: chỉ hiện từ chương 2.
    const raise: BuildItem | null = inChapter2(state)
      ? { key: 'raise', act: 'chooseRaise', pic: null, icon: '⛰️', name: vi.ui.dapDat, meta: '1×1 ô', desc: vi.ui.dapDatDesc, go: goLabel('chooseRaise', false, false) }
      : null;
    // Công trình của chương 2–5 chỉ hiện khi đã sang chương ấy.
    const chapter = chapterNow(state);
    const shownOf = (types: BuildingType[]) =>
      types.filter((type) => (CHAPTER_OF[BUILDINGS[type].unlock ?? ''] ?? 1) <= chapter && (!TET_TYPES.includes(type) || tetStarted(state)));
    const card = (type: BuildingType): BuildItem => {
      const def = BUILDINGS[type];
      const have = usedOf(state, type);
      const max = limitOf(state, type);
      let why = unlockWhy(state, type);
      if (why) {
        // Đã ghi lý do mở khóa.
      } else if (dienLevel(state) < def.minDien) why = `Cần Điện cấp ${def.minDien}`;
      else if (def.barracksLevel && barracksLevel(state) < def.barracksLevel) why = vi.ui.needBarracks(def.barracksLevel);
      // Đường đầy giới hạn vẫn trải đè đổi vật liệu được.
      else if (have >= max && !isRoad(type)) why = vi.reasons.datGioiHan;
      else if (!canAfford(state, def.buildCost)) why = vi.reasons.thieuTaiNguyen;
      const ms = xayMs(type, 1);
      if (!why && ms > 0 && !thoRanh(state)) why = hetThoHtml(state);
      // Bốn loại đường chung một giới hạn, ghi ở đầu nhóm.
      const count = isRoad(type) ? '' : ` · ${vi.ui.count(have, max)}`;
      const time = ms > 0 ? ` · ${vi.ui.xayTime(formatXay(realMs(state, ms)))}` : '';
      return {
        key: type,
        act: 'chooseBuild',
        attrs: `data-type="${type}"`,
        pic: thumbUrl(type),
        icon: vi.buildings[type].icon,
        name: vi.buildings[type].name,
        meta: `${def.w}×${def.d} ô${count}${time}`,
        cost: costHtml(state, def.buildCost),
        why,
        desc: vi.buildings[type].desc,
        go: goLabel('chooseBuild', isRoad(type), isDecor(type)),
      };
    };
    // Ụ nỏ dựng trên đoạn thành Cổ Loa có sẵn, không chiếm đất: có từ chương 4.
    let uNo: BuildItem | null = null;
    if (inChapter4(state)) {
      const have = uNoCount(state);
      const max = uNoLimit(state);
      const why = have >= max ? vi.reasons.datGioiHan : !canAfford(state, U_NO.cost) ? vi.reasons.thieuTaiNguyen : '';
      uNo = {
        key: 'uNo',
        act: 'chooseUNo',
        pic: thumbUrl('uNo'),
        icon: '🎯',
        name: vi.ui.uNo,
        meta: vi.ui.uNoCard(have, max),
        cost: costHtml(state, U_NO.cost),
        why,
        go: goLabel('chooseUNo', false, false),
      };
    }
    // Công cụ dọn đường, đồ trang trí: chạm từng ô như khi trải.
    const clear: BuildItem = {
      key: 'clear',
      act: 'chooseClear',
      pic: null,
      icon: '🧹',
      name: vi.ui.clearDecor,
      meta: vi.ui.clearDecorDesc,
      go: goLabel('chooseClear', false, false),
    };
    // Bốn nhóm thẻ chọn ở đầu bảng; mỗi lần chỉ hiện một nhóm cho khỏi cuộn dài trên điện thoại.
    const tabs = BUILD_GROUPS.map(
      ({ key }) =>
        `<button class="tab ${key === this.buildTab ? 'on' : ''}" data-act="buildTab" data-tab="${key}">${vi.ui.buildGroups[key]}</button>`,
    ).join('');
    const group = BUILD_GROUPS.find((g) => g.key === this.buildTab)!;
    if (group.key === 'mau') {
      const { items, prefer } = mauItems(state, this.mauArmed);
      return { tabs: `<div class="build-tabs">${tabs}</div>`, note: '', items, prefer, foot: `<p class="muted xd-foot">${vi.ui.mauHint}</p>` };
    }
    const cards = shownOf(group.types).map(card);
    const note =
      group.key === 'duong'
        ? `<p class="muted">${vi.ui.roadCount(usedOf(state, 'duongDat'), limitOf(state, 'duongDat'))}. ${vi.ui.decorOnly}</p>`
        : group.key === 'trangTri'
          ? `<p class="muted">${vi.ui.decorOnly}</p>`
          : '';
    const items = group.key === 'congTrinh' ? [...cards, uNo, raise] : group.key === 'trangTri' ? [...cards, clear] : cards;
    return { tabs: `<div class="build-tabs">${tabs}</div>`, note, items: items.filter((i): i is BuildItem => !!i) };
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
      rows.push(`<div class="stat"><span>${vi.ui.production}</span><span>${prodHtml(outputIn(state, b))}</span></div>`);
      // Bên kia sông: đặc sản thêm phần làm ra; cầu hư thì dân bên này không sang làm được.
      const dat = dacSanOf(b);
      if (dat && !cutOff(state, b)) rows.push(`<div class="stat"><span></span><span class="muted">${vi.benKia.dacSan[dat].icon} ${vi.benKia.dacSanBonus(vi.benKia.dacSan[dat].name, Math.round(DAC_SAN_BONUS * 100))}</span></div>`);
      if (cutOff(state, b)) rows.push(`<p class="why warn">${vi.benKia.cutOff}</p>`);
      if (b.level < def.maxLevel) {
        rows.push(`<div class="stat"><span>${vi.ui.nextLevel}</span><span>${prodHtml(def.production[b.level])}</span></div>`);
      }
    }
    const fishRate = (n: number) => `🐟 ${fmt(n)}${vi.ui.perMinute}`;
    if (b.type === 'langChai') {
      rows.push(`<div class="stat"><span>${vi.ui.fishHere}</span><span>${fishRate(fishOf(b))}</span></div>`);
      if (b.level < def.maxLevel) rows.push(`<div class="stat"><span>${vi.ui.nextLevel}</span><span>${fishRate(CA_PER_MIN[b.level])}</span></div>`);
    }
    if (b.type === 'benKhoi') {
      // Cá biển của bến này, và thuyền ra ngư trường quanh quần đảo nào (bến chẵn Hoàng Sa, bến lẻ Trường Sa).
      rows.push(`<div class="stat"><span>${vi.ui.seaFishHere}</span><span>${fishRate(fishOf(b))}</span></div>`);
      if (b.level < def.maxLevel) rows.push(`<div class="stat"><span>${vi.ui.nextLevel}</span><span>${fishRate(CA_BIEN_PER_MIN[b.level])}</span></div>`);
      const ground = seaRoute(b, seaIndex(state, b)).quanDao;
      rows.push(`<div class="stat"><span>${vi.ui.seaGround}</span><span>${vi.bien.icon} ${vi.bien.quanDao[ground].name}</span></div>`);
      rows.push(`<div class="actions"><button class="btn bronze" data-act="seeIsland" data-dao="${ground}">${vi.bien.icon} ${vi.bien.seeIsland}</button></div>`);
    }
    if (b.type === 'donBien') rows.push(this.garrisonHtml(state, b));
    if (b.type === 'banLang') {
      const id = plotAt(b.x, b.z);
      if (id !== null) rows.push(`<div class="stat"><span>${vi.benKia.villageMakes}</span><span>${b.damaged ? '—' : prodHtml(villageOutput(state, id))}</span></div>`);
      if (b.damaged) rows.push(`<p class="why warn">${vi.benKia.villageWrecked}</p>`);
    }
    if (PHU_SA_TYPES.includes(b.type) && b.boi && !b.damaged) {
      rows.push(`<div class="stat"><span>${vi.ui.phuSa}</span><span>${vi.ui.phuSaRow(Math.round(PHU_SA_BONUS * 100))}</span></div>`);
    }
    if (b.type === 'congDe') rows.push(this.congHtml(state, b));
    if (b.type === 'congThanh') {
      const shot = (lv: number) => vi.ui.gateShot(CONG_THANH.dmg[lv - 1], CONG_THANH.targets[lv - 1]);
      rows.push(`<div class="stat"><span>${vi.ui.gateGuard}</span><span>${shot(b.level)}</span></div>`);
      if (b.level < def.maxLevel) rows.push(`<div class="stat"><span>${vi.ui.nextLevel}</span><span>${shot(b.level + 1)}</span></div>`);
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
    if (isBridge(b.type)) {
      // Cầu đứng trên sông: lũ cuốn tùy cấp cầu, không theo nền đất.
      rows.push(`<div class="stat"><span>${vi.ui.bridgeFloodLabel}</span><span class="muted">${vi.ui.bridgeFlood(BRIDGE_FLOOD[b.level - 1] ?? Infinity)}</span></div>`);
      if (b.level < def.maxLevel) rows.push(`<div class="stat"><span>${vi.ui.nextLevel}</span><span class="muted">${vi.ui.bridgeFlood(BRIDGE_FLOOD[b.level] ?? Infinity)}</span></div>`);
      rows.push(`<p class="muted">${vi.ui.bridgeRings}</p>`);
    } else if (inChapter2(state)) {
      const ground = groundOf(state, b);
      const tol = floodToleranceOf(b.type);
      rows.push(`<div class="stat"><span>${vi.ui.ground}</span><span>${vi.ui.groundLevel(ground)}</span></div>`);
      rows.push(`<div class="stat"><span></span><span class="muted">${tol >= 9 ? vi.ui.floodImmune : vi.ui.floodRisk(ground + tol)}</span></div>`);
    }
    if (b.type === 'dien') {
      rows.push(`<div class="stat"><span>${vi.ui.storage}</span><span>${fmt(storageCap(state))}</span></div>`);
      rows.push(`<div class="stat"><span>${vi.ui.dan}</span><span>${state.dan}/${housing(state)}</span></div>`);
      rows.push(`<div class="stat"><span>${vi.ui.khoanhCount}</span><span>${state.khoanh.length}/${KHOANH_N * KHOANH_N}</span></div>`);
    }

    if (b.type === 'lauNo') {
      const shot = (lv: number) => vi.ui.gateShot(LAU_NO.dmg[lv - 1], LAU_NO.targets);
      rows.push(`<div class="stat"><span>${vi.ui.lauNoShots}</span><span>${shot(b.level)}</span></div>`);
      if (b.level < def.maxLevel) rows.push(`<div class="stat"><span>${vi.ui.nextLevel}</span><span>${shot(b.level + 1)}</span></div>`);
    }
    if (isDecor(b.type)) rows.push(`<div class="stat"><span></span><span class="muted">${vi.ui.decorOnly}</span></div>`);
    if (b.type === 'doanhTrai') {
      const per = BUILDINGS.doanhTrai.troopCap![b.level - 1] ?? 0;
      rows.push(`<div class="stat"><span>${vi.ui.barracksCap(capOf(state, b), per, doanhCount(state))}</span></div>`);
    }
    const home = UNIT_TYPES.find((k) => UNITS[k].home === b.type);
    if (home) rows.push(this.homeHtml(state, home));
    if (TET_TYPES.includes(b.type)) rows.push(tetHtml(state));
    if (b.type === 'langChai' || b.type === 'benKhoi') {
      // Cả kinh đô: cá mỗi phút, phần ăn của dân và lính, số gạo cá đỡ được; cá đủ ăn thì báo dựng thêm chưa có ích
      // (bến thuyền khơi vẫn có ích vì vỏ ốc).
      const fish = fishPerMinute(state);
      const food = foodPerMinute(state);
      rows.push(`<div class="stat"><span>${vi.ui.fishAll}</span><span>${fishRate(fish)}</span></div>`);
      rows.push(`<div class="stat"><span>${vi.ui.foodAll}</span><span>${vi.resources.gao.icon} ${fmt(food)}${vi.ui.perMinute}</span></div>`);
      rows.push(`<div class="stat"><span>${vi.ui.fishSaved}</span><span>${vi.resources.gao.icon} ${fmt(Math.min(fish, food))}${vi.ui.perMinute}</span></div>`);
      if (fish >= food) rows.push(`<div class="stat"><span></span><span class="muted">${b.type === 'benKhoi' ? vi.ui.seaFishEnough : vi.ui.fishEnough}</span></div>`);
    }
    if (b.type === 'dien' && tetStarted(state)) {
      rows.push(`<h3>🎋 ${vi.ui.blessTitle}</h3>${blessingHtml(state)}`);
      rows.push(`<div class="actions"><button class="btn bronze" data-act="openTet">🎋 ${vi.ui.tet}</button></div>`);
    }
    // Rèn binh khí cần lò rèn cấp 6, tức là từ chương 2 (Điện cấp 6).
    if (b.type === 'loRen' && inChapter2(state)) rows.push(armsHtml(state));
    if ((b.type === 'loRen' || b.type === 'dien') && giongAppeared(state) && !state.giong.ascended) {
      const label = b.type === 'loRen' ? `⚒️ ${vi.ui.giongForge}` : `${vi.giongLooks[giongLook(state)!].icon} ${vi.ui.giong}`;
      rows.push(`<div class="actions"><button class="btn bronze" data-act="openGiong">${label}</button></div>`);
    }
    if (b.type === 'dien' && sonLook(state)) {
      rows.push(`<div class="actions"><button class="btn bronze" data-act="openSon">⛰️ ${vi.ui.son}</button></div>`);
    }
    if (b.type === 'thanh' && b.uNo) {
      rows.push(`<div class="stat"><span>🎯&nbsp;${vi.ui.uNo}</span><span>${b.uNo === 'hu' ? vi.ui.uNoHu : vi.ui.uNoOn}</span></div>`);
      rows.push(`<p class="muted">${vi.ui.uNoDesc}</p>`);
    }
    if ((b.type === 'dien' || b.type === 'thanh') && advLook(state)) {
      rows.push(`<div class="stat"><span>${vi.ui.citadelTitle}</span><span>${vi.ui.ringsNow(wallRings(state))}</span></div>`);
      if (b.type === 'dien') rows.push(`<div class="actions"><button class="btn bronze" data-act="openAdv">${vi.advLooks[advLook(state)!].icon} ${vi.ui.adv}</button></div>`);
    }
    if (b.type === 'dien' && caoLoJoined(state)) {
      rows.push(`<div class="actions"><button class="btn bronze" data-act="openCaoLo">🎯 ${vi.ui.caoLo}</button></div>`);
    }

    const actions: string[] = [];
    // Công trình hư: báo và nút sửa đầu mục. Doanh trại thì để trên các thẻ, thẻ nào cũng thấy.
    let repair = '';
    if (b.damaged) {
      const rc = repairCost(b);
      repair = `<div class="why">${vi.ui.damaged}</div>
        <button class="btn bronze" data-act="repair" data-id="${b.id}" ${canAfford(state, rc) && state.raid.phase !== 'battle' ? '' : 'disabled'}>
        ${vi.ui.repair} · ${costHtml(state, rc)}</button>`;
      if (b.type !== 'doanhTrai') actions.push(repair);
    }
    // Cống đê: đóng mở lúc nào cũng được, kể cả giữa mùa lũ.
    if (b.type === 'congDe' && !b.damaged) {
      actions.push(`<button class="btn bronze" data-act="toggleCong" data-id="${b.id}">${b.mo ? vi.ui.congClose : vi.ui.congOpen}</button>`);
    }
    if (b.type === 'thanh' && b.uNo === 'hu') {
      // Sửa thành trước rồi mới sửa được ụ trên mặt thành.
      const rc = uNoRepairCost();
      const can = !b.damaged && canAfford(state, rc) && state.raid.phase !== 'battle';
      actions.push(`<button class="btn bronze" data-act="repairUNo" data-id="${b.id}" ${can ? '' : 'disabled'}>🎯 ${vi.ui.repairUNo} · ${costHtml(state, rc)}</button>`);
      if (b.damaged) actions.push(`<div class="why">${vi.ui.uNoBroken}</div>`);
    }
    if (b.type === 'thanh' && !b.uNo && inChapter4(state)) {
      const check = canPlaceUNo(state, b.x, b.z);
      actions.push(`<button class="btn" data-act="placeUNo" data-id="${b.id}" ${check.ok ? '' : 'disabled'}>🎯 ${vi.ui.uNo} · ${costHtml(state, U_NO.cost)}</button>`);
      if (!check.ok) actions.push(`<div class="why">${vi.reasons[check.reason]}</div>`);
    }
    if (mergeable(b) && dienLevel(state) >= BUILDINGS.lauNo.minDien) {
      // Ghép hai chòi canh cấp 8 thành lầu nỏ: bấm nút rồi chạm vào chòi thứ hai trên bản đồ.
      const pair = state.buildings.some((o) => o.id !== b.id && mergeable(o));
      const cost = mergeCost();
      const can = pair && state.raid.phase === 'idle' && canAfford(state, cost);
      actions.push(`<div class="muted">${vi.ui.mergeInfo}</div>`);
      if (b.level > LAU_NO_FROM_LEVEL) actions.push(`<div class="muted">${vi.ui.mergeLevel(mergedLevel(b, b))}</div>`);
      actions.push(`<button class="btn bronze" data-act="startMerge" data-id="${b.id}" ${can ? '' : 'disabled'}>🎯 ${vi.ui.merge} · ${costHtml(state, cost)}</button>`);
      if (!pair) actions.push(`<div class="why">${vi.ui.mergeNoPair}</div>`);
    }
    {
      const mc = moveCost(b);
      const free = state.raid.phase === 'idle' && canAfford(state, mc);
      const moveBtn = `<button class="btn ghost" data-act="startMove" data-id="${b.id}" ${free ? '' : 'disabled'}>↔ ${vi.ui.move} · ${costHtml(state, mc)}</button>`;
      // Xoay tại chỗ không tốn của: nút nhỏ cạnh nút Dời.
      actions.push(
        canRotateType(b.type)
          ? `<div class="btn-pair">${moveBtn}<button class="btn ghost" data-act="rotateBuilding" data-id="${b.id}" title="${vi.ui.turnTitle}">↻ ${vi.ui.turn}</button></div>`
          : moveBtn,
      );
    }
    const cost = upgradeCostOf(b);
    if (isBusy(state, b.id)) {
      // Đang có thợ nâng cấp hay đắp loại khác: không nâng chồng, khối việc ở đầu bảng.
    } else if (cost) {
      const check = canStartUpgrade(state, b.id);
      const label =
        b.type === 'luy' ? `🧱 Đắp ${vi.ui.wallEarth.toLowerCase()}` : b.type === 'de' ? `🪨 ${vi.ui.dikeStone}` : `⬆ ${vi.ui.upgradeTo(b.level + 1)}`;
      const ms = xayMs(b.type, b.level + 1);
      const time = ms > 0 ? ` · ${vi.ui.xayTime(formatXay(realMs(state, ms)))}` : '';
      actions.push(`<button class="btn" data-act="upgrade" data-id="${b.id}" ${check.ok ? '' : 'disabled'}>
        ${label} · ${costHtml(state, cost)}${time}</button>`);
      if (!check.ok) {
        const why =
          check.reason === 'chuaDuCapDien'
            ? `Cần Điện cấp ${dienNeededFor(b.type, b.level + 1)}`
            : check.reason === 'hetTho'
              ? hetThoHtml(state)
              : vi.reasons[check.reason];
        actions.push(`<div class="why">${why}</div>`);
      }
      // Lũy, đê: nâng cả đoạn liền cùng loại cùng cấp một lượt.
      const run = wallComponent(state, b.id).length;
      if (run > 1) {
        const plan = planWallUpgrade(state, b.id);
        const n = plan.ok ? plan.value.ids.length : run;
        const wcost = plan.ok ? plan.value.cost : cost;
        const wtime = plan.ok ? ` · ${vi.ui.xayTime(formatXay(realMs(state, plan.value.ms)))}` : '';
        actions.push(`<button class="btn ghost" data-act="wallUpgradeAll" data-id="${b.id}" ${plan.ok ? '' : 'disabled'}>
          ${vi.ui.wallUpgradeAll(label, n)} · ${costHtml(state, wcost)}${wtime}</button>`);
      }
    } else if (def.maxLevel > 1) {
      actions.push(`<div class="muted" style="text-align:center">${vi.ui.maxLevel}</div>`);
    }
    if (inChapter2(state)) {
      const raise = canRaiseBuilding(state, b.id);
      if (raise.ok || (raise.reason !== 'khongDapNen' && raise.reason !== 'datCaoNhat')) {
        actions.push(`<button class="btn ghost" data-act="raiseBuilding" data-id="${b.id}" ${raise.ok ? '' : 'disabled'}>
          ⛰️ ${vi.ui.raiseGround} · ${costHtml(state, raiseCostOf(state, b))}</button>`);
      }
    }
    if (def.removable) {
      const label = isDecor(b.type)
        ? vi.ui.removeDecor
        : b.type === 'de'
          ? vi.ui.removeDike
          : b.type === 'thanh'
            ? vi.ui.removeCitadel
            : b.type === 'congThanh'
              ? vi.ui.removeGate
              : b.type === 'congDe'
                ? vi.ui.removeCong
                : vi.ui.remove;
      actions.push(`<button class="btn ghost" data-act="removeWall" data-id="${b.id}">${label}</button>`);
    }

    const job = jobHtml(state, b.id, this.cancelArmed);
    const info = `<div class="info"><p>${esc(vi.buildings[b.type].desc)}</p>${job}${rows.join('')}<div class="actions">${actions.join('')}</div></div>`;
    if (b.type === 'doanhTrai') return this.barracksHtml(state, b, info, repair);
    return info;
  }

  /** Bảng cống đê: đang đóng hay mở, xem trước mùa lũ tới khi mở. Nút đóng mở ở hàng nút cuối bảng. */
  private congHtml(state: GameState, b: Building): string {
    const rows = [`<div class="stat"><span>${vi.ui.congState}</span><span>${b.mo ? vi.ui.congIsOpen : vi.ui.congIsShut}</span></div>`];
    if (b.mo && !b.damaged) {
      const p = phuSaPreview(state);
      rows.push(`<div class="stat"><span>${vi.ui.congPreview}</span><span>${vi.ui.congPreviewText(p.level, p.boi.length, p.drown.length)}</span></div>`);
      rows.push(`<div class="stat"><span></span><span class="muted">${vi.ui.phuSaPreview(p.level)}</span></div>`);
    }
    return rows.join('');
  }

  /** Một dòng binh chủng ở nơi ở riêng: số lính, binh khí đã rèn, nút Luyện kèm giá. */
  private unitRowHtml(state: GameState, k: UnitType): string {
    const def = UNITS[k];
    const check = canTrain(state, k);
    const why = check.ok ? '' : vi.reasons[check.reason];
    return `<div class="unit-row">
        <span class="unit-icon">${vi.units[k].icon}</span>
        <span class="unit-info"><b>${vi.units[k].name}</b> × ${state.troops[k]}
          <small>${vi.units[k].desc}</small>
          ${state.arms[k] ? `<small>⚔️ ${vi.ui.armsOnUnit(state.arms[k])}</small>` : ''}
          ${state.thuThach.bac[k] ? `<small>🎖 ${vi.ui.huanOnUnit(state.thuThach.bac[k])}</small>` : ''}
          ${why ? `<small class="lack">${why}</small>` : ''}</span>
        <button class="btn small" data-act="train" data-unit="${k}" ${check.ok ? '' : 'disabled'}>${vi.ui.train}<br>${costHtml(state, def.cost)}</button>
      </div>`;
  }

  /** Bảng nơi ở riêng của một binh chủng: luyện binh chủng ấy ở đây. Tổng chỗ quân vẫn do doanh trại giữ. */
  private homeHtml(state: GameState, k: UnitType): string {
    return `${this.troopSpaceHtml(state)}
      <div class="units">${this.unitRowHtml(state, k)}</div>`;
  }

  /** Số chỗ quân đang dùng trên tổng chỗ của mọi doanh trại. */
  private troopSpaceHtml(state: GameState): string {
    return `<div class="stat"><span>${vi.ui.troopSpaceAll(troopSpace(state), troopCap(state), doanhCount(state))}</span></div>`;
  }

  /**
   * Các tướng ở doanh trại: ai sẵn sàng ra trận, ai đang nghỉ; mỗi tướng một doanh (năm tướng đầu), mỗi doanh thêm chỗ
   * quân theo cấp trại.
   */
  private generalsHtml(state: GameState): string {
    const status = (resting: boolean, until: number, hienLinh = false) =>
      resting ? `💤 ${vi.ui.heroRest(Math.ceil((until - state.clock) / 1000))}` : hienLinh ? vi.ui.heroHienLinh : vi.ui.heroReady;
    const info: Record<TuongId, () => string> = {
      lacTuong: () => vi.ui.lacTuongDesc,
      giong: () => status(giongResting(state), state.giong.restUntil, state.giong.ascended),
      sonTinh: () => status(sonResting(state), state.son.restUntil, state.son.won),
      anDuong: () => `${status(advResting(state), state.adv.restUntil, state.adv.bien)} · ${state.adv.bien ? vi.ui.advAtSea : vi.ui.advAtDien}`,
      caoLo: () => `${status(caoLoResting(state), state.caoLo.restUntil)} · ${vi.ui.caoLoAtDien}`,
      trungTrac: () => `${status(haiBaResting(state, 'trungTrac'), state.haiBa.trungTrac)} · ${vi.ui.haiBaDesc}`,
      trungNhi: () => `${status(haiBaResting(state, 'trungNhi'), state.haiBa.trungNhi)} · ${vi.ui.haiBaDesc}`,
    };
    const open: Partial<Record<TuongId, string>> = { giong: 'openGiong', sonTinh: 'openSon', anDuong: 'openAdv', caoLo: 'openCaoLo' };
    const rows = generals(state).map((t, i) => {
      const where = i < DOANH_MAX ? vi.ui.doanhOf(i + 1) : vi.ui.doanhNone;
      const button = open[t] ? `<span class="btn-col"><button class="btn small bronze" data-act="${open[t]}">${vi.ui.heroOpen}</button></span>` : '';
      return `<div class="unit-row">
        <span class="unit-icon">${vi.ui.tuongIcons[t]}</span>
        <span class="unit-info"><b>${vi.ui.tuongNames[t]}</b><small>${where}</small><small>${info[t]()}</small></span>
        ${button}
      </div>`;
    });
    return `<p class="muted">${vi.ui.generalsHint}</p><div class="units">${rows.join('')}</div>${this.nuTuongHtml(state)}`;
  }

  /** Nữ tướng ở doanh trại (chương 5): cả bốn ở trại; lính giữ kinh đô thuộc binh chủng của bà được cộng thêm. */
  private nuTuongHtml(state: GameState): string {
    const list = nuTuongList(state);
    if (!list.length) return '';
    const rows = list.map((n) => {
      const unit = vi.units[NU_TUONG[n].unit];
      return `<div class="unit-row">
        <span class="unit-icon">${vi.nuTuong.list[n].icon}</span>
        <span class="unit-info"><b>${vi.nuTuong.list[n].name}</b><small>${vi.nuTuong.boost(unit.icon, unit.name)}</small></span>
      </div>`;
    });
    return `<h4 class="sub-head">${vi.nuTuong.barracksTitle}</h4><p class="muted">${vi.nuTuong.barracksHint}</p><div class="units">${rows.join('')}</div>`;
  }

  /**
   * Bố trí giữ kinh đô: mỗi binh chủng bao nhiêu lính ra trận khi giặc, lũ đánh kinh đô (ra từ cổng trại gần giặc).
   * Cả kinh đô không quá số chỗ giữ kinh đô theo cấp Điện; lính còn lại là quân dự trữ.
   */
  private guardHtml(state: GameState): string {
    const got = guardPlan(state);
    const want = guardTargets(state);
    const used = armySpace(got);
    const owned = UNIT_TYPES.filter((k) => state.troops[k] > 0 || want[k] > 0);
    // Lý do chưa thêm được (đủ chỗ giữ kinh đô) báo một lần dưới đầu mục.
    const full = new Set<string>();
    const rows = owned.map((k) => {
      const short = want[k] - got[k];
      const minus = canGuard(state, k, -1);
      const plus = canGuard(state, k, 1);
      if (!plus.ok && plus.reason !== 'khongDuQuan') full.add(vi.reasons[plus.reason]);
      return `<div class="unit-row army">
        <span class="unit-icon">${vi.units[k].icon}</span>
        <span class="unit-info"><b>${vi.units[k].name}</b><small>${vi.ui.haveTroops(state.troops[k])}</small>
          ${short > 0 ? `<small class="lack">${vi.ui.guardShort(short)}</small>` : ''}</span>
        <button class="step" data-act="guardDelta" data-unit="${k}" data-delta="-1" ${minus.ok ? '' : 'disabled'} aria-label="Bớt một lính giữ kinh đô">−</button>
        <b class="count">${got[k]}</b>
        <button class="step" data-act="guardDelta" data-unit="${k}" data-delta="1" ${plus.ok ? '' : 'disabled'} aria-label="Thêm một lính giữ kinh đô">+</button>
      </div>`;
    });
    const left = reserve(state);
    const spare = UNIT_TYPES.filter((k) => left[k] > 0).map((k) => `${vi.units[k].icon} ${left[k]}`).join(' · ') || vi.ui.reserveNone;
    const manual = guardManual(state);
    return `<div class="stat"><span>${vi.ui.guardInfo(used, guardCap(state))}</span></div>
      <p class="muted">${manual ? vi.ui.guardManualNote : vi.ui.guardAutoNote} ${vi.ui.guardGate}</p>
      ${[...full].map((t) => `<p class="why">${t}</p>`).join('')}
      ${owned.length ? `<div class="units">${rows.join('')}</div>` : `<p class="muted">${vi.ui.noTroops}</p>`}
      <p class="muted">${vi.ui.reserveLine(spare)}</p>
      ${manual ? `<button class="btn ghost small" data-act="guardAuto">${vi.ui.guardAuto}</button>` : ''}`;
  }

  /**
   * Bảng doanh trại chia thẻ cho khỏi cuộn dài: Quân (binh chủng, nơi ở, lịch giặc), Giữ kinh đô (bố trí), Tướng
   * (tướng chỉ huy), Trại (lời tả, cấp, nâng cấp, dời, xoay: `info`). Dòng chỗ quân và nút sửa (`repair`) ở trên các thẻ.
   */
  private barracksHtml(state: GameState, b: Building, info: string, repair: string): string {
    const tab = this.barracksTab;
    const tabs = (
      [
        ['quan', vi.ui.barracksTabs.quan, ''],
        ['giu', vi.ui.barracksTabs.giu, ''],
        ['tuong', vi.ui.barracksTabs.tuong, ''],
        // Nâng cấp được thì thẻ Trại có dấu ⬆.
        ['trai', vi.ui.barracksTabs.trai, upgradeCostOf(b) && canUpgrade(state, b.id).ok ? '⬆' : ''],
      ] as const
    )
      .map(
        ([key, label, mark]) =>
          `<button class="tab ${key === tab ? 'on' : ''}" data-act="barracksTab" data-tab="${key}">${label}${mark ? `<i class="tab-mark">${mark}</i>` : ''}</button>`,
      )
      .join('');
    const body =
      tab === 'giu' ? this.guardHtml(state) : tab === 'tuong' ? this.generalsHtml(state) : tab === 'trai' ? info : this.troopsHtml(state);
    return `${this.troopSpaceHtml(state)}${repair ? `<div class="actions top">${repair}</div>` : ''}
      <div class="build-tabs barracks-tabs">${tabs}</div>
      <div class="barracks-body">${body}</div>`;
  }

  /** Thẻ Quân của doanh trại: mỗi binh chủng một dòng (số lính, nút tới nơi ở hay dựng nơi ở), lịch đợt giặc. */
  private troopsHtml(state: GameState): string {
    const homes = UNIT_TYPES.filter((k) => k !== 'no' || inChapter4(state) || state.troops.no > 0).map((k) => {
      const type = UNITS[k].home;
      const home = homeOf(state, k);
      const name = vi.buildings[type].name;
      let act: string;
      if (home) {
        act = `<button class="btn small ghost" data-act="selectBuilding" data-id="${home.id}">${vi.buildings[type].icon} ${name} ›</button>`;
      } else {
        const blocker = Hud.placeBlocker(state, type);
        act = `<button class="btn small" data-act="chooseBuild" data-type="${type}" ${blocker ? 'disabled' : ''}>${vi.ui.buildHome(name)}<br>${costHtml(state, BUILDINGS[type].buildCost)}</button>`;
      }
      const why = home ? (home.damaged ? vi.reasons.noiOHu : '') : (Hud.placeBlocker(state, type) ?? '');
      // Chưa có nơi ở: nút Dựng kèm giá dài, xuống hàng dưới tên binh chủng cho chữ khỏi bị bóp hẹp.
      return `<div class="unit-row ${home ? '' : 'wrap'}">
        <span class="unit-icon">${vi.units[k].icon}</span>
        <span class="unit-info"><b>${vi.units[k].name}</b> × ${state.troops[k]}
          <small>${vi.ui.trainAt(name)}</small>
          ${why ? `<small class="lack">${why}</small>` : ''}</span>
        ${act}
      </div>`;
    }).join('');
    const raid = state.raid;
    let next = '';
    let call = '';
    if (raid.phase === 'idle') {
      const min = raid.nextAt === null ? 0 : Math.ceil((raid.nextAt - state.clock) / 60000);
      const foe = nextFoe(state);
      if (inChapter2(state) && !floodSeason(state)) next = vi.ui.calmBeforeWedding;
      else if (foe === 'thuyBinh' || foe === 'thuyHan') {
        next = foe === 'thuyBinh' ? vi.ui.nextThuyBinh(min) : vi.ui.nextThuyHan(min);
        call = vi.ui.callRaid;
      } else if (foe === 'yeu' || foe === 'trieu' || foe === 'han') {
        next = foe === 'yeu' ? vi.ui.nextYeu(min) : foe === 'trieu' ? vi.ui.nextTrieu(min) : vi.ui.nextHan(min);
        call = vi.ui.callRaid;
      } else if (floodSeason(state)) {
        next = vi.ui.nextFlood(min, nextFloodLevel(state));
        if (ruaVangCame(state) && !advJoined(state)) next += `. ${vi.ui.calmBeforeNoThan}`;
        call = vi.ui.callFlood;
      } else {
        next = raid.nextAt === null ? vi.ui.noRaidYet : vi.ui.nextRaid(min);
        call = vi.ui.callRaid;
      }
    }
    return `<div class="units">${homes}</div>
      ${next ? `<p class="muted">${next}</p>` : ''}${call ? `<button class="btn ghost small" data-act="callRaid">${call}</button>` : ''}`;
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

  private settingsHtml(state: GameState, resolution: Resolution): string {
    const levels = (Object.keys(vi.resolutions) as Resolution[])
      .map((r) => `<button class="btn small ${r === resolution ? 'bronze' : 'ghost'}" data-act="setResolution" data-resolution="${r}">${vi.resolutions[r]}</button>`)
      .join('');
    return `
      <div class="setting-row"><span>${vi.ui.sound}</span>
        <button class="btn small ghost" data-act="toggleMute">${state.settings.muted ? '🔇 ' + vi.ui.off : '🔊 ' + vi.ui.on}</button></div>
      <div class="setting-row"><span>${vi.ui.resolution}</span><div class="choices">${levels}</div></div>
      <p class="muted">${vi.ui.resolutionHint}</p>
      <h3 class="setting-title">${vi.ui.backupTitle}</h3>
      <div class="setting-row"><span>${vi.ui.saveFile}</span><div class="choices">
        <button class="btn small ghost" data-act="saveFile">💾 ${vi.ui.download}</button>
        ${canShareFile() ? `<button class="btn small ghost" data-act="shareFile">📤 ${vi.ui.share}</button>` : ''}</div></div>
      <p class="muted">${vi.ui.saveFileHint}</p>
      <div class="setting-row"><span>${vi.ui.openFile}</span>
        <button class="btn small ghost" data-act="openFile">📂 ${vi.ui.chooseFile}</button></div>
      <input type="file" id="save-file" accept=".txt,text/plain" hidden>
      <p class="muted">${vi.ui.openFileHint}</p>
      <div class="setting-row"><span>${vi.ui.exportSave}</span>
        <button class="btn small ghost" data-act="copyCode">📋 ${vi.ui.copy}</button></div>
      <p class="muted">${vi.ui.exportHint}</p>
      <div style="margin-top:12px"><b>${vi.ui.importSave}</b></div>
      <p class="muted">${vi.ui.importHint}</p>
      <textarea id="import-box" placeholder="TDVL2:..."></textarea>
      <button class="btn small ghost" data-act="importCode">📥 ${vi.ui.importSave}</button>
      <div class="actions"><button class="btn ghost" data-act="reset">🔄 ${vi.ui.reset}</button></div>
      <p class="muted" style="text-align:center;margin-top:14px">${vi.gameTitle} · bản thử 0.5</p>`;
  }

  // ---------- Phó bản ----------

  get campaignOpen(): boolean {
    return this.camp !== null;
  }

  showCampaign(state: GameState): void {
    this.closeSheet();
    // Mở ở chương có màn kế tiếp chưa thắng, hay chương mới nhất nếu đã thắng hết.
    const now = mapChapterNow(state);
    const chapter = ([1, 2, 3, 4] as const).find((c) => c <= now && this.nextStage(state, c) !== null) ?? now;
    this.camp = { chapter, stage: this.nextStage(state, chapter), step: 'stage', pick: defaultPick(state) };
    this.campaignEl.hidden = false;
    this.pop = null;
    this.refreshCampaign(state, true);
    this.updateQuest(state);
  }

  /** Màn kế tiếp chưa thắng trong chương, hoặc null khi đã thắng hết. */
  private nextStage(state: GameState, chapter: Chapter): number | null {
    const next = state.campaign.cleared + 1;
    const stages = chapterStages(chapter);
    return stages.includes(next) && next <= STAGES.length ? next : null;
  }

  closeCampaign(): void {
    this.camp = null;
    this.campHtml = '';
    this.campaignEl.hidden = true;
    this.updateQuest(this.getState());
  }

  /** Thao tác trên bản đồ chỉ đổi giao diện: chọn màn, xếp quân. */
  private campaignStep(act: string, id: number, el: HTMLElement): void {
    const camp = this.camp;
    if (!camp) return;
    const state = this.getState();
    const unit = el.dataset.unit as UnitType;
    if (act === 'campChapter') {
      camp.chapter = ([1, 2, 3, 4, 5] as const).find((c) => c === id) ?? 1;
      camp.stage = this.nextStage(state, camp.chapter);
      camp.step = 'stage';
    } else if (act === 'pickStage') {
      camp.stage = id;
      camp.step = 'stage';
    } else if (act === 'prepareStage' || act === 'prepareChallenge') {
      if (!camp.stage) return;
      camp.step = 'army';
      camp.pick = defaultPick(state, camp.stage, act === 'prepareChallenge');
    } else if (act === 'openHuan') {
      camp.step = camp.step === 'huan' ? 'stage' : 'huan';
    } else if (act === 'backToStage') {
      camp.step = 'stage';
    } else if (act === 'armyDelta') {
      stepPick(state, camp.pick, unit, Number(el.dataset.delta));
    } else if (act === 'armyRow') {
      camp.pick.rows[unit] = nextRow(camp.pick.rows[unit]);
    } else if (act === 'armyHero' && camp.stage) {
      // Phó bản chương 2: chạm thẻ Sơn Tinh hay Gióng để chọn tướng ra trận; tướng kiệt sức thì không chọn được.
      const hero = el.dataset.hero as HeroKind;
      if (stageHeroCheck(state, camp.stage, hero, camp.pick.challenge).ok) camp.pick.hero = hero;
    } else if (act === 'armyNu') {
      pickNu(state, camp.pick, el.dataset.nu);
    } else if (act === 'openDau') {
      camp.step = camp.step === 'dau' ? 'stage' : 'dau';
      camp.dau ??= newDauView(state);
    } else if (camp.dau && act === 'dauTarget') {
      Object.assign(camp.dau, pickTarget(state, id));
    } else if (camp.dau && act === 'dauSide') {
      camp.dau.side = el.dataset.side === 'tay' ? 'tay' : 'bac';
    } else if (camp.dau && act === 'dauNext') {
      camp.dau.step = 'army';
    } else if (camp.dau && act === 'dauBack') {
      camp.dau.step = 'target';
    } else if (camp.dau && act === 'dauDelta') {
      stepDauArmy(state, camp.dau, unit, Number(el.dataset.delta));
    }
    this.refreshCampaign(state);
  }

  /** Mở thẳng bảng Đấu thành (nút Đánh lại sau trận), ở bước chọn kinh đô hay bước chọn quân. */
  showDau(state: GameState, step: DauView['step'] = 'target'): void {
    this.showCampaign(state);
    const camp = this.camp!;
    camp.step = 'dau';
    camp.dau = { ...newDauView(state), step };
    this.refreshCampaign(state, true);
  }

  refreshCampaign(state: GameState, force = false): void {
    const camp = this.camp;
    if (!camp) return;
    for (const k of UNIT_TYPES) camp.pick.army[k] = Math.min(camp.pick.army[k], state.troops[k]);
    const hint = [vi.ui.campaignHint, vi.ui.campaignHint, vi.ui.campaignHint2, vi.ui.campaignHint3, vi.ui.campaignHint4, vi.ui.campaignHint5][camp.chapter];
    let panel = `<p class="muted">${hint}</p>`;
    if (camp.step === 'dau' && camp.dau) {
      for (const k of UNIT_TYPES) camp.dau.army[k] = Math.min(camp.dau.army[k], state.troops[k]);
      panel = dauHtml(state, camp.dau);
    } else if (camp.step === 'huan') panel = huanHtml(state);
    else if (camp.stage) panel = camp.step === 'army' ? armyHtml(state, camp.pick, camp.stage, camp.pick.challenge) : stageHtml(state, camp.stage);
    const now = mapChapterNow(state);
    const tabs =
      now > 1
        ? `<div class="camp-tabs"><span class="lb">${vi.ui.chapterTabs}</span>${([1, 2, 3, 4, 5] as const)
            .filter((c) => c <= now)
            .map((c) => `<button class="btn small ${c === camp.chapter ? 'bronze' : 'ghost'}" data-act="campChapter" data-id="${c}" aria-label="${vi.ui.chapterTab(c)}">${c}</button>`)
            .join('')}</div>`
        : '';
    const title = [vi.ui.campaignTitle, vi.ui.campaignTitle, vi.ui.campaignTitle2, vi.ui.campaignTitle3, vi.ui.campaignTitle4, vi.ui.campaignTitle5][camp.chapter];
    // Chip huân công: có từ khi thắng màn đầu tiên (mở thử thách đầu tiên).
    const huan = state.campaign.cleared > 0
      ? `<button class="huan-chip ${camp.step === 'huan' ? 'on' : ''}" data-act="openHuan" aria-label="${vi.ui.huanTitle}">${vi.ui.huanChip(state.thuThach.huan)}</button>`
      : '';
    // Chip Đấu thành: đánh thử kinh đô người khác (bảng ghi lý do khi chưa đánh được).
    const dau = `<button class="huan-chip dau-chip ${camp.step === 'dau' ? 'on' : ''}" data-act="openDau" aria-label="${vi.dauThanh.title}">${vi.dauThanh.chip}</button>`;
    const map = camp.step === 'dau' && camp.dau ? dauMapHtml(camp.dau) : mapHtml(state, camp.stage, camp.chapter);
    const head = camp.step === 'dau' ? `🏯 ${vi.dauThanh.title}` : `⚔️ ${title}`;
    const html = `<div class="camp-head"><h2>${head}</h2>${camp.step === 'dau' ? '' : tabs}${huan}${dau}
        <button class="close" data-act="closeCampaign" aria-label="${vi.ui.close}">✕</button></div>
      <div class="camp-main"><div class="camp-map">${map}</div><div class="camp-panel">${panel}</div></div>`;
    if (html !== this.campHtml || force) {
      this.campHtml = html;
      this.campaignEl.innerHTML = html;
    }
  }

  /** Thanh trên và nút dưới khi đang đánh ngoài bãi. Nút kỹ năng chỉ đổi chữ tại chỗ để không nuốt lần chạm. */
  updateField(state: GameState): void {
    const b = this.pvp?.battle ?? state.campaign.battle;
    this.root.classList.toggle('in-field', !!b);
    if (!b) return;
    if (this.pvp) {
      // Đấu thành: tên kinh đô bị đánh; phần trăm phá, sao, giây còn lại.
      const score = scorePvp(this.pvp.def);
      this.fieldTop.querySelector('b')!.textContent = vi.dauThanh.banner(this.pvp.name);
      this.fieldTop.querySelector('span')!.textContent = vi.dauThanh.status(Math.floor(score.pct * 100), score.stars, Math.max(0, Math.ceil(DAU_THANH.holdS - b.t)));
      this.fieldTop.querySelector<HTMLElement>('.hold-bar')!.hidden = true;
    }
    const hold = b.holdS !== undefined;
    const secs = Math.max(0, Math.ceil((hold ? b.holdS! : FIELD.maxS) - b.t));
    const tag = b.challenge ? ` · 🎖 ${vi.ui.challengeKinds[b.challenge].name}` : '';
    const don = b.camp !== undefined ? campTier(b.camp) : null;
    if (!this.pvp) this.fieldTop.querySelector('b')!.textContent = don ? `${vi.benKia.don[don].icon} ${vi.benKia.don[don].name}` : `${vi.ui.stageN(b.wave)} · ${vi.stages[b.wave - 1].name}${tag}`;
    // Màn 40 giữ cửa rừng Cấm Khê cho dân rút về núi; màn 32 cầm chân giặc cho vua tới biển.
    const camKhe = hold && b.camp === undefined && b.wave === CH5_LAST;
    const holdText = camKhe ? vi.ui.holdBannerCamKhe : vi.ui.holdBanner;
    if (!this.pvp)
      this.fieldTop.querySelector('span')!.textContent = hold
        ? `${holdText(enemiesLeft(b), alliesLeft(b), secs)} · ${vi.ui.holdWave(wavesArrived(b), b.waveCount ?? 1)}`
        : vi.ui.fieldBanner(enemiesLeft(b), alliesLeft(b), secs);
    // Màn cầm cự: thanh "Vua tới biển" có ngựa vua, thanh "Dân rút về núi" có trâu dắt theo, chạy theo thanh.
    const bar = this.fieldTop.querySelector<HTMLElement>('.hold-bar')!;
    bar.hidden = !hold;
    if (hold) {
      const rider = bar.querySelector<HTMLElement>('em')!;
      const icon = camKhe ? '🐃' : '🐎';
      if (rider.textContent !== icon) rider.textContent = icon;
      const k = `${Math.round(holdProgress(b) * 1000) / 10}%`;
      bar.querySelector<HTMLElement>('i')!.style.width = k;
      bar.querySelector<HTMLElement>('em')!.style.left = k;
    }
    // Hai tướng cùng ra trận (Hai Bà): mỗi bà một thanh máu, bà nào kiệt sức thì thanh mờ, có dấu nghỉ.
    const heroHp = this.fieldTop.querySelector<HTMLElement>('.hero-hp')!;
    const setups = heroSetups(b);
    heroHp.hidden = setups.length < 2;
    if (setups.length >= 2) {
      const hpKey = `${b.id}:${setups.map((h) => h.kind).join(',')}`;
      if (heroHp.dataset.key !== hpKey) {
        heroHp.dataset.key = hpKey;
        heroHp.innerHTML = setups
          .map((h) => `<span class="hh" data-hero="${h.kind}"><em>${vi.ui.tuongIcons[h.kind]}</em><b>${vi.ui.heroNames[h.kind]}</b><i><u></u></i></span>`)
          .join('');
      }
      for (const h of setups) {
        const f = b.fighters.find((x) => x.kind === h.kind);
        const el = heroHp.querySelector<HTMLElement>(`[data-hero="${h.kind}"]`)!;
        el.classList.toggle('down', h.down);
        el.querySelector<HTMLElement>('u')!.style.width = `${f && !h.down ? Math.round((100 * f.hp) / f.maxHp) : 0}%`;
        el.querySelector('em')!.textContent = h.down ? '💤' : vi.ui.tuongIcons[h.kind];
      }
    }
    const box = this.fieldBar.querySelector<HTMLElement>('.skills')!;
    const key = `${b.id}:${b.skills.join(',')}`;
    if (key !== this.skillKey) {
      this.skillKey = key;
      box.innerHTML = b.skills.map((k) => skillButton(b, k)).join('');
    }
    for (const btn of box.querySelectorAll<HTMLButtonElement>('[data-skill]')) {
      const k = btn.dataset.skill as SkillId;
      syncSkill(btn, b, k);
      btn.classList.toggle('active', (k === 'trongTran' && b.rally > 0) || (k === 'ruaVang' && b.shield > 0) || (k === 'lenhBan' && (b.lenh ?? 0) > 0));
    }
    this.fieldBar.querySelector<HTMLButtonElement>('[data-act="retreat"]')!.disabled = !!b.outcome;
  }

  /** Đang đánh Đấu thành (hay đã xong, null): thanh trận dùng trận này. */
  setPvp(pvp: HudPvp | null): void {
    this.pvp = pvp;
    this.updateField(this.getState());
  }

  showDauResult(html: string): void {
    this.closeDauResult();
    const back = document.createElement('div');
    back.className = 'modal-back stage dau';
    back.innerHTML = html;
    this.root.appendChild(back);
  }

  closeDauResult(): void {
    this.root.querySelector('.modal-back.dau')?.remove();
  }

  // ---------- Truyện ----------

  get storyOpen(): boolean {
    return this.story !== null;
  }

  /** Có hộp thoại nào đang mở (kết quả trận, vắng mặt, truyện) thì chưa kể truyện mới. */
  get modalOpen(): boolean {
    return !!this.root.querySelector('.modal-back');
  }

  /**
   * Kể đoạn truyện `id`, thẻ này sang thẻ khác. Hết truyện thì là một màn hình riêng, mọi dòng cùng hiện, nút
   * Chơi tiếp. `replay`: mở lại từ bảng Lạc hầu (không báo xong truyện nữa).
   */
  showStory(id: StoryId, replay = false): void {
    this.story = { id, step: 0, replay };
    const back = document.createElement('div');
    back.className = `modal-back story-back ${isEnding(id) ? 'ending-back' : ''}`;
    back.innerHTML = isEnding(id) ? endingHtml(id) : storyHtml(id, 0);
    this.root.appendChild(back);
  }

  private storyNext(): void {
    const story = this.story;
    const back = this.root.querySelector('.modal-back.story-back');
    if (!story || !back) return;
    if (isEnding(story.id) || story.replay) {
      back.remove();
      this.story = null;
      if (!story.replay) this.onAction({ kind: 'storyDone', id: story.id });
      return;
    }
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

  /** Hiện một dòng báo trong `ms` mili giây (lời dài như gợi ý của Lạc hầu thì để lâu hơn). */
  toast(message: string, bad = false, ms = TOAST_MS): void {
    const el = document.createElement('div');
    el.className = `toast ${bad ? 'bad' : ''} ${ms > TOAST_MS ? 'long' : ''}`;
    el.textContent = message;
    // Mờ dần ngay trước khi gỡ, dù dòng báo hiện lâu hay chóng.
    el.style.animation = `toast-in 0.2s ease, toast-out 0.3s ease ${(ms - 400) / 1000}s forwards`;
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
    setTimeout(() => el.remove(), ms);
  }

  showOffline(ms: number, gained: Resources, built = 0): void {
    const back = document.createElement('div');
    back.className = 'modal-back';
    const gains = RESOURCE_IDS.filter((r) => gained[r] >= 1)
      .map((r) => `<span>${vi.resources[r].icon} +${fmt(gained[r])}</span>`)
      .join('');
    back.innerHTML = `<div class="modal"><h2>${vi.ui.offlineTitle}</h2>
      <div>${vi.ui.offlineBody(formatDuration(ms))}</div>
      <div class="gains">${gains}</div>
      ${built ? `<div>${vi.ui.offlineBuilt(built)}</div>` : ''}
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
    const damaged = state.buildings.filter((b) => b.damaged || b.uNo === 'hu').length;
    const cost = repairAllCost(state);
    const flood = r.flood > 0;
    let title: string;
    if (flood) title = '🌊 ' + (r.won && !r.drowned.length ? vi.ui.floodWonTitle : r.won ? vi.ui.floodHeldTitle : vi.ui.floodLostTitle);
    else if (r.foe === 'yeu') {
      const broken = r.wrecked.some((id) => state.buildings.find((b) => b.id === id)?.type === 'thanh');
      title = '🌙 ' + (!r.won ? vi.ui.yeuLostTitle : broken ? vi.ui.yeuHeldTitle : vi.ui.yeuWonTitle);
    }
    else if (r.foe === 'trieu') title = r.won ? '🏹 ' + vi.ui.trieuWonTitle : '🔥 ' + vi.ui.trieuLostTitle;
    else if (r.foe === 'han') title = r.won ? '🏹 ' + vi.ui.hanWonTitle : '🔥 ' + vi.ui.hanLostTitle;
    else if (r.foe === 'thuyBinh') title = r.won ? '🎯 ' + vi.ui.thuyBinhWonTitle : '🔥 ' + vi.ui.thuyBinhLostTitle;
    else if (r.foe === 'thuyHan') title = r.won ? '🎯 ' + vi.ui.thuyHanWonTitle : '🔥 ' + vi.ui.thuyHanLostTitle;
    else title = r.won ? '🥁 ' + vi.ui.raidWonTitle : '🔥 ' + vi.ui.raidLostTitle;
    back.innerHTML = `<div class="modal">
      <h2>${title}</h2>
      <div class="result-rows">
        ${flood ? `<div>${vi.ui.floodPeak(Math.round(r.flood * 10) / 10)}</div>` : ''}
        <div>${vi.ui.raidKilled(r.killed, r.total)}</div>
        <div>${vi.ui.raidLostTroops}: ${lost}</div>
        <div>${vi.ui.raidStolen}: ${stolen}</div>
        <div>${vi.ui.raidWrecked(r.wrecked.length)}</div>
        ${flood ? `<div>${vi.ui.floodDrowned(r.drowned.length)}</div>` : ''}
        ${r.boi ? `<div>${vi.ui.phuSaResult(r.boi)}</div>` : ''}
        ${r.foe === 'thuyHan' && !r.won ? `<div class="muted">⛵ ${vi.ui.shipsLeft}</div>` : ''}
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
    const why = unlockWhy(state, type);
    if (why) return why;
    if (dienLevel(state) < BUILDINGS[type].minDien) return `Cần Điện cấp ${BUILDINGS[type].minDien}`;
    const need = BUILDINGS[type].barracksLevel;
    if (need && barracksLevel(state) < need) return vi.ui.needBarracks(need);
    // Đường đầy giới hạn vẫn vào trải được: trải đè lên ô đường loại khác thì đổi vật liệu, không thêm ô.
    if (!isRoad(type) && usedOf(state, type) >= limitOf(state, type)) return vi.reasons.datGioiHan;
    if (!canAfford(state, BUILDINGS[type].buildCost)) return vi.reasons.thieuTaiNguyen;
    if (xayMs(type, 1) > 0 && !thoRanh(state)) return hetThoText(state);
    return null;
  }
}
