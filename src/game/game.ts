// Luật chơi: trạng thái, truy vấn, thao tác và dòng thời gian.
// Không phụ thuộc DOM hay Three.js để test được bằng Vitest.

import { startBattle, stepBattle, type Battle, type RaidSide } from './battle';
import { updateCampaign } from './campaign';
import { inChapter4 } from './chuong4';
import { advJoined, initialAdv, inChapter3, ruaVangCame, wallRings } from './coLoa';
import { heroFor, inChapter2, initialSon, restAfter, sonJoined } from './son';
import { bake, datBonus, initialTet, troiBonus, updateTet, type TetState } from './tet';
import { footprintTop, groundOf, levelFootprint, tileHeight } from './terrain';
import {
  BUILDINGS,
  CH3_QUEST_START,
  DIEN_CHAPTER,
  LAU_NO_TOWERS,
  MOVE_FRACTION,
  FIRST_FLOOD_MS,
  FIRST_LAND_MS,
  FLOOD_RECEDE_S,
  GIFT_IDS,
  MAX_HEIGHT,
  floodLevel,
  isDecor,
  isRoad,
  ROAD_TYPES,
  raiseBuildingCost,
  raiseTileCost,
  DAN_GROW_MS,
  DEFAULT_ROWS,
  FIRST_RAID_MS,
  GAO_PER_DAN,
  MERCHANT_EVERY_MS,
  MERCHANT_FIRST_MS,
  MERCHANT_STAY_MS,
  OFFLINE_CAP_MS,
  OFFLINE_RATE,
  QUESTS,
  RAID_EVERY_MS,
  RAID_WARNING_MS,
  REPAIR_FRACTION,
  RESOURCE_IDS,
  STARVING_RATE,
  START_DAN,
  START_RESOURCES,
  STORAGE_CAP,
  TEMPLE_BONUS,
  TRADE_BONUS,
  TRADE_VALUE,
  UNITS,
  UNIT_TYPES,
  type BuildingType,
  type Chapter,
  type Cost,
  type Foe,
  type QuestDef,
  type ResourceId,
  type Resources,
  type GearId,
  type GiftId,
  type Row,
  type TuongId,
  type Unlock,
  type UnitType,
} from './defs';
import { capOf, generals } from './doanhTrai';
import { START_KHOANH, isOpen, openMask, openStart } from './khoanh';
import { DIEN_HOME, GRID, baseHeights, inGrid, touchesRiver } from './map';

export interface Building {
  id: number;
  type: BuildingType;
  x: number;
  z: number;
  level: number;
  /** Số dân đang làm việc ở đây. */
  workers: number;
  /** Bị giặc phá: không làm ra gì, không chắn đường, cần sửa. */
  damaged?: boolean;
  /** Doanh trại: tướng chỉ huy người chơi đã giao. Chưa giao thì tướng rảnh tự nhận (`commanders` ở `doanhTrai.ts`). */
  tuong?: TuongId;
  /** Doanh trại: số lính mỗi binh chủng người chơi bố trí giữ kinh đô ở đây. Chưa doanh trại nào có thì bố trí tự động. */
  guard?: Record<UnitType, number>;
}

export interface RaidResult {
  wave: number;
  /** Mùa lũ: mực nước đã dâng tới (bậc). Đợt giặc Ân thì là 0. */
  flood: number;
  won: boolean;
  killed: number;
  total: number;
  lost: Record<UnitType, number>;
  wrecked: number[];
  /** Công trình bị nước lũ làm hư. */
  drowned: number[];
  stolen: Resources;
  /** Ai đã đánh kinh đô đợt này. */
  foe: Foe;
}

export type { Foe };

export interface RaidState {
  /** Số đợt giặc đã đánh xong. */
  wave: number;
  /** Số đợt đã đánh lui hoàn toàn. */
  won: number;
  /** Lúc (đồng hồ chơi) trinh sát báo đợt tới. Null khi chưa có doanh trại. */
  nextAt: number | null;
  phase: 'idle' | 'warning' | 'battle';
  /** Đợt sắp tới hay đang đánh là giặc Ân hay mùa lũ. */
  foe: Foe;
  side: RaidSide;
  /** Số mùa lũ đã qua. */
  floods: number;
  /** Số mùa lũ giữ được: diệt hết thủy quái, không công trình nào bị ngập. */
  floodsHeld: number;
  /** Số đêm yêu tinh kéo về phá thành, và số đêm đánh lui được hết. */
  nights: number;
  nightsHeld: number;
  /** Số đợt quân Triệu Đà đánh kinh đô, và số đợt đánh lui được hết. */
  trieu: number;
  trieuHeld: number;
  /** Mực nước lũ đang thấy (bậc), 0 khi không có lũ. Dâng trong trận, rút dần sau trận. */
  water: number;
  /** Lúc giặc tràn vào (hết thời gian báo trước). */
  startsAt: number;
  battle: Battle | null;
  /** Kết quả đợt vừa rồi, giữ tới khi người chơi xem xong. */
  lastResult: RaidResult | null;
}

export interface StageResult {
  stage: number;
  outcome: 'win' | 'lose' | 'retreat';
  /** Lần đầu thắng màn này. */
  first: boolean;
  killed: number;
  total: number;
  lost: Record<UnitType, number>;
  reward: Cost;
  /** Lễ vật giành được khi thắng lần đầu màn này. */
  gift?: GiftId;
}

export interface CampaignState {
  /** Màn cao nhất đã thắng, 0 khi chưa thắng màn nào. */
  cleared: number;
  /** Hàng đứng của từng binh chủng, nhớ cho lần xuất quân sau. */
  rows: Record<UnitType, Row>;
  /** Trận đang đánh. Đánh xong vẫn giữ để vẽ cảnh cuối tới khi người chơi xem xong kết quả. */
  battle: Battle | null;
  lastResult: StageResult | null;
}

export interface GiongState {
  /** Số mốc gạo đã góp nuôi Gióng (0–5). */
  fed: number;
  gear: Record<GearId, boolean>;
  /** Roi sắt đã gãy (sau màn 6): Gióng nhổ tre quật giặc. */
  whipBroken: boolean;
  /** Đồng hồ chơi lúc Gióng hồi sức sau khi kiệt sức trong trận. */
  restUntil: number;
  /** Đã bay về trời (kết chương); từ đó Gióng hiển linh giúp quân ta. */
  ascended: boolean;
}

export interface SonState {
  /** Lễ vật thách cưới đã có. Đủ cả năm thì Sơn Tinh rước Mị Nương, cùng ra trận. */
  gifts: Record<GiftId, boolean>;
  /** Đồng hồ chơi lúc Sơn Tinh hồi sức sau khi kiệt sức trong trận. */
  restUntil: number;
  /** Đã mở kỹ năng Dời non (thắng màn 14 lần đầu). */
  non: boolean;
  /** Đã đánh lui Thủy Tinh ở đỉnh Tản Viên (kết chương 2). */
  won: boolean;
}

export interface AdvState {
  /** Cao Lỗ đã chế xong nỏ thần: An Dương Vương cùng ra trận. */
  no: boolean;
  /** Đồng hồ chơi lúc An Dương Vương hồi sức sau khi kiệt sức trong trận. */
  restUntil: number;
  /** Đã có Rùa Vàng che chở quân ta (thắng màn 22 lần đầu). */
  kimQuy: boolean;
  /** Đã đánh tan Triệu Đà dưới chân thành Cổ Loa (kết chương 3). */
  won: boolean;
}

/** Các đoạn truyện, hiện mỗi đoạn một lần theo đúng thứ tự. */
export type StoryId =
  | 'mo'
  | 'suGia'
  | 'vuonVai'
  | 'roiGay'
  | 'ketChuong'
  | 'langLieu'
  | 'kenRe'
  | 'ruocDau'
  | 'doiNon'
  | 'ketChuong2'
  | 'cotDa'
  | 'dietYeu'
  | 'noThan'
  | 'kimQuy'
  | 'ketChuong3';

/** Một lời mời đổi hàng của thuyền buôn: đưa `give`, nhận `get`. */
export interface Offer {
  give: { r: ResourceId; n: number };
  get: { r: ResourceId; n: number };
  taken: boolean;
}

export interface Merchant {
  /** Thời điểm (theo đồng hồ chơi) thuyền tiếp theo cập bến. */
  nextAt: number;
  /** Thuyền đang đậu, nếu có. */
  visit: { leavesAt: number; offers: Offer[] } | null;
  /** Số chuyến đã đến, dùng làm hạt giống cho lời mời. */
  seq: number;
}

/** Phiên bản bản lưu hiện tại (11: kinh đô lớn, móng to hơn một ô). */
export const SAVE_VERSION = 12;

export interface GameState {
  version: typeof SAVE_VERSION;
  resources: Resources;
  /** Số dân (không tính lính). */
  dan: number;
  /** Thời gian đã tích cho người dân tiếp theo. */
  danProgress: number;
  buildings: Building[];
  /** Độ cao từng ô (GRID×GRID, chỉ số z * GRID + x), sông là -1. Móng công trình luôn phẳng. */
  heights: number[];
  nextId: number;
  /** Chỉ số nhiệm vụ Lạc hầu đang làm. Bằng QUESTS.length khi đã xong hết. */
  questIndex: number;
  /** Thời điểm (ms, giờ máy) game được cập nhật lần cuối, dùng để tính phần vắng mặt. */
  lastSeen: number;
  /** Tổng thời gian đang mở game (ms). Thuyền buôn và giặc chỉ đến theo đồng hồ này. */
  clock: number;
  merchant: Merchant;
  /** Số lính mỗi loại đang có (lính không tính vào dân). */
  troops: Record<UnitType, number>;
  /** Binh khí đã rèn ở lò rèn cho từng binh chủng: 0, 1 hay 2 bậc. */
  arms: Record<UnitType, number>;
  raid: RaidState;
  campaign: CampaignState;
  /** Mã cho trận đánh tiếp theo (giữ kinh đô hay phó bản). */
  nextBattleId: number;
  giong: GiongState;
  son: SonState;
  adv: AdvState;
  /** Hội Tết bánh chưng bánh giầy. */
  tet: TetState;
  story: { seen: StoryId[] };
  settings: { muted: boolean };
  /** Các khoảnh đất 5×5 đã mở (số `cz * 10 + cx`, xếp tăng dần). Phát rừng thì thay bằng mảng mới (`khoanh.ts`). */
  khoanh: number[];
  /** Vừa nâng từ kinh đô nhỏ: kinh đô đã dựng lại theo mẫu, trả lại chừng này của. Giao diện báo một lần rồi xóa. */
  relaid?: { refund: Cost; dropped: number };
}

export type FailReason =
  | 'thieuTaiNguyen'
  | 'chuaDuCapDien'
  | 'datBiChiem'
  | 'ngoaiVung'
  | 'phaiSatSong'
  | 'datGioiHan'
  | 'capToiDa'
  | 'khongTheXay'
  | 'khongTheDo'
  | 'khongTimThay'
  | 'chuaXong'
  | 'thieuDan'
  | 'khongCoNguoiLam'
  | 'thuyenDaDi'
  | 'daDoi'
  | 'canDoanhTrai'
  | 'datGioiHanQuan'
  | 'thieuGao'
  | 'dangCoGiac'
  | 'khongHuHong'
  | 'manKhoa'
  | 'canThanhGiong'
  | 'chuaChonQuan'
  | 'khongDuQuan'
  | 'dangDanhPhoBan'
  | 'chuaCoGiong'
  | 'daGopDu'
  | 'daRen'
  | 'canLoRen'
  | 'giongKietSuc'
  | 'canKetChuong'
  | 'canChuong2'
  | 'canKetChuong2'
  | 'datCaoNhat'
  | 'khongDapNen'
  | 'canSonTinh'
  | 'sonKietSuc'
  | 'daCoLeVat'
  | 'leVatPhoBan'
  | 'canChuong3'
  | 'canKetChuong3'
  | 'canRuaVang'
  | 'thieuVongThanh'
  | 'canAnDuong'
  | 'advKietSuc'
  | 'chuaToiTet'
  | 'daDang'
  | 'thieuBanh'
  | 'khongTheDoi'
  | 'trungCho'
  | 'khongDuCho'
  | 'daTheoMau'
  | 'canChuong4'
  | 'khongGhepDuoc'
  | 'canNoiO'
  | 'noiOHu'
  | 'canTuongChiHuy'
  | 'tuongChuaCo'
  | 'daChiHuy'
  | 'quaChoPhoBan'
  | 'quaChoGiuThanh'
  | 'traiDay'
  | 'khongPhaiTrangTri'
  | 'khoanhDaMo'
  | 'khoanhChuaSat'
  | 'hetLuotKhoanh';

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; reason: FailReason };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

export function initialRaid(): RaidState {
  return {
    wave: 0,
    won: 0,
    nextAt: null,
    phase: 'idle',
    foe: 'an',
    side: 'bac',
    floods: 0,
    floodsHeld: 0,
    nights: 0,
    nightsHeld: 0,
    trieu: 0,
    trieuHeld: 0,
    water: 0,
    startsAt: 0,
    battle: null,
    lastResult: null,
  };
}

export function initialCampaign(): CampaignState {
  return { cleared: 0, rows: { ...DEFAULT_ROWS }, battle: null, lastResult: null };
}

export function initialGiong(): GiongState {
  return { fed: 0, gear: { ngua: false, roi: false, giap: false }, whipBroken: false, restUntil: 0, ascended: false };
}

export function createInitialState(now: number): GameState {
  const dien: Building = { id: 1, type: 'dien', x: DIEN_HOME, z: DIEN_HOME, level: 1, workers: 0 };
  const state: GameState = {
    version: SAVE_VERSION,
    resources: { ...START_RESOURCES },
    dan: START_DAN,
    danProgress: 0,
    buildings: [dien],
    heights: baseHeights(),
    nextId: 2,
    questIndex: 0,
    lastSeen: now,
    clock: 0,
    merchant: { nextAt: MERCHANT_FIRST_MS, visit: null, seq: 0 },
    troops: { giao: 0, cung: 0, voi: 0 },
    arms: { giao: 0, cung: 0, voi: 0 },
    raid: initialRaid(),
    campaign: initialCampaign(),
    nextBattleId: 1,
    giong: initialGiong(),
    son: initialSon(),
    adv: initialAdv(),
    tet: initialTet(),
    story: { seen: [] },
    settings: { muted: false },
    khoanh: [...START_KHOANH],
  };
  levelFootprint(state, dien, footprintTop(state, 'dien', dien.x, dien.z));
  return state;
}

// ---------- Truy vấn ----------

export function dienLevel(state: GameState): number {
  return state.buildings.find((b) => b.type === 'dien')?.level ?? 1;
}

export function storageCap(state: GameState): number {
  let cap = STORAGE_CAP[dienLevel(state) - 1];
  for (const b of state.buildings) cap += BUILDINGS[b.type].storage?.[b.level - 1] ?? 0;
  return cap;
}

export function countOf(state: GameState, type: BuildingType): number {
  return state.buildings.filter((b) => b.type === type).length;
}

export function limitOf(state: GameState, type: BuildingType): number {
  const limit = BUILDINGS[type].limit[dienLevel(state) - 1];
  // Mỗi doanh trại một tướng chỉ huy: có bao nhiêu tướng thì dựng được bấy nhiêu doanh trại.
  return type === 'doanhTrai' ? Math.min(limit, generals(state).length) : limit;
}

/** Số chỗ đã dùng trong giới hạn `limitOf`: mỗi lầu nỏ tính là hai chòi canh; bốn loại đường chung một giới hạn. */
export function usedOf(state: GameState, type: BuildingType): number {
  if (isRoad(type)) return ROAD_TYPES.reduce((n, t) => n + countOf(state, t), 0);
  return countOf(state, type) + (type === 'choiCanh' ? LAU_NO_TOWERS * countOf(state, 'lauNo') : 0);
}

export function findBuilding(state: GameState, id: number): Building | undefined {
  return state.buildings.find((b) => b.id === id);
}

/** Số chỗ làm của công trình ở cấp hiện tại (0 nếu không cần người). */
export function slotsOf(b: Building): number {
  return BUILDINGS[b.type].workers?.[b.level - 1] ?? 0;
}

/** Tổng chỗ ở cho dân. */
export function housing(state: GameState): number {
  let total = 0;
  for (const b of state.buildings) total += BUILDINGS[b.type].housing?.[b.level - 1] ?? 0;
  return total;
}

export function workingDan(state: GameState): number {
  return state.buildings.reduce((sum, b) => sum + b.workers, 0);
}

export function freeDan(state: GameState): number {
  return state.dan - workingDan(state);
}

/** Gạo cả kinh đô ăn mỗi phút: dân và lính. */
export function upkeepPerMinute(state: GameState): number {
  let total = state.dan * GAO_PER_DAN;
  for (const k of UNIT_TYPES) total += state.troops[k] * UNITS[k].upkeep;
  return total;
}

export function troopCount(state: GameState): number {
  return UNIT_TYPES.reduce((n, k) => n + state.troops[k], 0);
}

/** Số chỗ quân đang dùng (voi chiến chiếm nhiều chỗ). */
export function troopSpace(state: GameState): number {
  return UNIT_TYPES.reduce((n, k) => n + state.troops[k] * UNITS[k].space, 0);
}

/** Tổng chỗ quân của mọi doanh trại có tướng chỉ huy. */
export function troopCap(state: GameState): number {
  let cap = 0;
  for (const b of state.buildings) if (b.type === 'doanhTrai') cap += capOf(state, b);
  return cap;
}

export function barracksLevel(state: GameState): number {
  return state.buildings.filter((b) => b.type === 'doanhTrai').reduce((m, b) => Math.max(m, b.level), 0);
}

const TYPE_INDEX = new Map(Object.keys(BUILDINGS).map((t, i) => [t, i + 1]));
const occupancyCache = new WeakMap<GameState, { a: number; b: number; n: number; grid: Int32Array }>();

/**
 * Lưới GRID×GRID, mỗi ô chứa id công trình đang chiếm hoặc 0. Chỉ đọc: kết quả được ghi nhớ theo dấu vân tay
 * của danh sách công trình (id, loại, chỗ), vì việc dò chỗ dựng gọi hàm này hàng nghìn lần trên lưới lớn.
 */
export function occupancy(state: GameState): Int32Array {
  let a = 0x811c9dc5;
  let h = 0x9e3779b9;
  for (const b of state.buildings) {
    const v = (((b.id * 64 + (TYPE_INDEX.get(b.type) ?? 0)) * 64 + b.x) * 64 + b.z) | 0;
    a = Math.imul(a ^ v, 0x01000193);
    h = Math.imul(h ^ v ^ b.id, 0x85ebca6b) ^ (h >>> 13);
  }
  const n = state.buildings.length;
  const hit = occupancyCache.get(state);
  if (hit && hit.a === a && hit.b === h && hit.n === n) return hit.grid;
  const grid = new Int32Array(GRID * GRID);
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type];
    for (let dx = 0; dx < def.w; dx++) {
      for (let dz = 0; dz < def.d; dz++) grid[(b.z + dz) * GRID + (b.x + dx)] = b.id;
    }
  }
  occupancyCache.set(state, { a, b: h, n, grid });
  return grid;
}

export function buildingAt(state: GameState, x: number, z: number): Building | undefined {
  if (!inGrid(x, z)) return undefined;
  const id = occupancy(state)[z * GRID + x];
  return id ? findBuilding(state, id) : undefined;
}

export function canAfford(state: GameState, cost: Cost): boolean {
  return RESOURCE_IDS.every((r) => state.resources[r] >= (cost[r] ?? 0));
}

/** Sản lượng mỗi phút của một công trình, tỉ lệ theo số người đang làm. */
export function outputOf(b: Building): Cost {
  if (b.damaged) return {};
  const prod = BUILDINGS[b.type].production[b.level - 1] ?? {};
  const slots = slotsOf(b);
  const k = slots ? Math.min(b.workers, slots) / slots : 1;
  const out: Cost = {};
  for (const r of RESOURCE_IDS) if (prod[r]) out[r] = prod[r]! * k;
  return out;
}

/** Phần cộng thêm của Đền Phù Đổng, khi đền đã dựng và còn nguyên. */
export function templeBonus(state: GameState): number {
  return state.buildings.some((b) => b.type === 'denPhuDong' && !b.damaged) ? TEMPLE_BONUS : 0;
}

/** Phần cộng thêm vào máu và sức đánh quân ta: Đền Phù Đổng và phúc lành Trời của Tết. */
export function troopBonus(state: GameState): number {
  return templeBonus(state) + troiBonus(state);
}

/** Sản lượng mỗi phút của cả kinh đô, chưa trừ gạo ăn và chưa tính thiếu gạo. Đền Phù Đổng và phúc lành Đất cộng thêm. */
export function productionPerMinute(state: GameState): Resources {
  const total: Resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
  for (const b of state.buildings) {
    const out = outputOf(b);
    for (const r of RESOURCE_IDS) total[r] += out[r] ?? 0;
  }
  const bonus = 1 + templeBonus(state) + datBonus(state);
  for (const r of RESOURCE_IDS) total[r] *= bonus;
  return total;
}

/** Hết gạo mà gạo làm ra không đủ ăn: mọi việc chậm lại. */
export function isStarving(state: GameState): boolean {
  return state.resources.gao <= 0.01 && productionPerMinute(state).gao < upkeepPerMinute(state);
}

/** Thay đổi thật mỗi phút của từng loại tài nguyên (đã trừ gạo ăn, đã tính thiếu gạo). */
export function netPerMinute(state: GameState): Resources {
  const k = isStarving(state) ? STARVING_RATE : 1;
  const prod = productionPerMinute(state);
  const net: Resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
  for (const r of RESOURCE_IDS) net[r] = prod[r] * k;
  net.gao -= upkeepPerMinute(state);
  return net;
}

export function upgradeCostOf(b: Building): Cost | undefined {
  const def = BUILDINGS[b.type];
  return b.level < def.maxLevel ? def.upgradeCost[b.level + 1] : undefined;
}

/** Cấp Điện cần có để công trình lên cấp `level`. */
export function dienNeededFor(type: BuildingType, level: number): number {
  const def = BUILDINGS[type];
  if (type === 'dien') return 0;
  return Math.max(def.levelMinDien?.[level] ?? 0, level);
}

/** Đã tới mốc truyện mở khóa công trình hay thao tác này chưa. */
export function unlocked(state: GameState, unlock: Unlock | undefined): boolean {
  if (unlock === 'ketChuong1') return state.giong.ascended;
  if (unlock === 'chuong2') return inChapter2(state);
  if (unlock === 'ketChuong2') return state.son.won;
  if (unlock === 'chuong3') return inChapter3(state);
  if (unlock === 'ketChuong3') return state.adv.won;
  return true;
}

export const UNLOCK_REASON: Record<Unlock, FailReason> = {
  ketChuong1: 'canKetChuong',
  chuong2: 'canChuong2',
  ketChuong2: 'canKetChuong2',
  chuong3: 'canChuong3',
  ketChuong3: 'canKetChuong3',
};

/**
 * Công trình bị thay khi dựng `type` ở (x, z): thành Cổ Loa đắp đè lên lũy tre (hay thành đất) được, lũy cũ được dỡ đi;
 * trải loại đường khác đè lên ô đường cũ thì đổi vật liệu.
 */
function replacedWall(state: GameState, type: BuildingType, x: number, z: number): Building | undefined {
  if (type !== 'thanh' && !isRoad(type)) return undefined;
  const b = buildingAt(state, x, z);
  if (type === 'thanh') return b?.type === 'luy' ? b : undefined;
  return b && isRoad(b.type) && b.type !== type ? b : undefined;
}

export function canPlace(state: GameState, type: BuildingType, x: number, z: number): Result {
  const def = BUILDINGS[type];
  if (!def.buildable) return fail('khongTheXay');
  if (def.unlock && !unlocked(state, def.unlock)) return fail(UNLOCK_REASON[def.unlock]);
  if (dienLevel(state) < def.minDien) return fail('chuaDuCapDien');
  if (def.barracksLevel && barracksLevel(state) < def.barracksLevel) return fail('canDoanhTrai');
  // Đổi vật liệu một ô đường không thêm ô nào.
  const swap = isRoad(type) && !!replacedWall(state, type, x, z);
  if (!swap && usedOf(state, type) >= limitOf(state, type)) return fail(needsGeneral(state, type) ? 'canTuongChiHuy' : 'datGioiHan');
  const why = fitsAt(state, type, x, z, occupancy(state));
  if (why) return fail(why);
  if (!canAfford(state, def.buildCost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/** Hết chỗ dựng doanh trại vì thiếu tướng chỉ huy (cấp Điện vẫn cho dựng thêm). */
export function needsGeneral(state: GameState, type: BuildingType): boolean {
  return type === 'doanhTrai' && limitOf(state, type) < BUILDINGS.doanhTrai.limit[dienLevel(state) - 1];
}

/** Phần chỗ đặt của `canPlace`: móng nằm trong vùng đã khai phá, không chồng công trình khác (thành đắp đè lũy được), bến sát sông. */
function fitsAt(state: GameState, type: BuildingType, x: number, z: number, grid: Int32Array): FailReason | null {
  const def = BUILDINGS[type];
  const open = openMask(state);
  const over = replacedWall(state, type, x, z);
  for (let dx = 0; dx < def.w; dx++) {
    for (let dz = 0; dz < def.d; dz++) {
      const tx = x + dx;
      const tz = z + dz;
      if (!inGrid(tx, tz) || !open[tz * GRID + tx]) return 'ngoaiVung';
      if (grid[tz * GRID + tx] && grid[tz * GRID + tx] !== over?.id) return 'datBiChiem';
    }
  }
  if (def.nearRiver && !touchesRiver(x, z, def.w, def.d)) return 'phaiSatSong';
  return null;
}

export function canUpgrade(state: GameState, id: number): Result {
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  const cost = upgradeCostOf(b);
  if (!cost) return fail('capToiDa');
  // Điện lên cấp 6 khi đã vào chương 2, cấp 7 khi đã vào chương 3, cấp 8 khi đã vào chương 4.
  const chapter = b.type === 'dien' ? DIEN_CHAPTER[b.level + 1] : undefined;
  if (chapter === 2 && !inChapter2(state)) return fail('canChuong2');
  if (chapter === 3 && !inChapter3(state)) return fail('canChuong3');
  if (chapter === 4 && !inChapter4(state)) return fail('canChuong4');
  if (dienLevel(state) < dienNeededFor(b.type, b.level + 1)) return fail('chuaDuCapDien');
  if (!canAfford(state, cost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

export function currentQuest(state: GameState): QuestDef | undefined {
  return QUESTS[state.questIndex];
}

/** Tiến độ nhiệm vụ hiện tại: đã đạt bao nhiêu trên bao nhiêu. */
export function questProgress(state: GameState): { have: number; need: number } | undefined {
  const quest = currentQuest(state);
  if (!quest) return undefined;
  const goal = quest.goal;
  let have: number;
  let need: number;
  if (goal.kind === 'count') {
    have = countOf(state, goal.building);
    need = goal.amount;
  } else if (goal.kind === 'workers') {
    have = state.buildings.filter((b) => b.type === goal.building).reduce((s, b) => s + b.workers, 0);
    need = goal.amount;
  } else if (goal.kind === 'troops') {
    have = troopCount(state);
    need = goal.amount;
  } else if (goal.kind === 'raidsWon') {
    have = state.raid.won;
    need = goal.amount;
  } else if (goal.kind === 'stage') {
    have = state.campaign.cleared;
    need = goal.stage;
  } else if (goal.kind === 'giongFed') {
    have = state.giong.fed;
    need = goal.amount;
  } else if (goal.kind === 'giongGear') {
    have = Object.values(state.giong.gear).filter(Boolean).length;
    need = goal.amount;
  } else if (goal.kind === 'gift') {
    have = state.son.gifts[goal.gift] ? 1 : 0;
    need = 1;
  } else if (goal.kind === 'gifts') {
    have = GIFT_IDS.filter((g) => state.son.gifts[g]).length;
    need = goal.amount;
  } else if (goal.kind === 'floodsHeld') {
    have = state.raid.floodsHeld;
    need = goal.amount;
  } else if (goal.kind === 'rings') {
    have = wallRings(state);
    need = goal.amount;
  } else if (goal.kind === 'noThan') {
    have = advJoined(state) ? 1 : 0;
    need = 1;
  } else if (goal.kind === 'trieuHeld') {
    have = state.raid.trieuHeld;
    need = goal.amount;
  } else {
    have = dienLevel(state);
    need = goal.level;
  }
  return { have: Math.min(have, need), need };
}

export function questDone(state: GameState): boolean {
  const p = questProgress(state);
  return !!p && p.have >= p.need;
}

// ---------- Thao tác (thay đổi state tại chỗ) ----------

export function pay(state: GameState, cost: Cost): void {
  for (const r of RESOURCE_IDS) state.resources[r] -= cost[r] ?? 0;
}

/** Cộng thêm tài nguyên, không vượt sức chứa kho. */
export function gain(state: GameState, amounts: Cost): void {
  const cap = storageCap(state);
  for (const r of RESOURCE_IDS) {
    const add = amounts[r] ?? 0;
    const before = state.resources[r];
    if (add > 0) state.resources[r] = Math.max(before, Math.min(cap, before + add));
  }
}

/** Cho dân rảnh vào làm ở công trình này cho tới khi đủ chỗ. */
export function fillWorkers(state: GameState, b: Building): void {
  const add = Math.min(slotsOf(b) - b.workers, freeDan(state));
  if (add > 0) b.workers += add;
}

export function place(state: GameState, type: BuildingType, x: number, z: number): Result<Building> {
  const check = canPlace(state, type, x, z);
  if (!check.ok) return check;
  const over = replacedWall(state, type, x, z);
  if (over) state.buildings = state.buildings.filter((b) => b.id !== over.id);
  pay(state, BUILDINGS[type].buildCost);
  const b: Building = { id: state.nextId++, type, x, z, level: 1, workers: 0 };
  // Dân đắp móng phẳng bằng chỗ cao nhất dưới móng.
  levelFootprint(state, b, footprintTop(state, type, x, z));
  state.buildings.push(b);
  fillWorkers(state, b);
  return ok(b);
}

/**
 * Công trình một ô (lũy, đê, thành, bẫy, chòi canh, lầu nỏ) đứng liền nhau được; không tính khi xét viền trống.
 * Đường đi và đồ trang trí cũng không tính: nhà đứng cạnh ao, cạnh cây đa vẫn là thoáng.
 */
const isSolid = (type: BuildingType) => BUILDINGS[type].w > 1 && !isDecor(type);

/** Quanh móng (x, z, w, d) một ô có công trình nhiều ô nào không (ô ngoài lưới, sông, rừng coi như trống). */
function ringFree(state: GameState, grid: Int32Array, x: number, z: number, w: number, d: number): boolean {
  for (let tx = x - 1; tx <= x + w; tx++) {
    for (let tz = z - 1; tz <= z + d; tz++) {
      if (tx >= x && tx < x + w && tz >= z && tz < z + d) continue;
      if (!inGrid(tx, tz)) continue;
      const id = grid[tz * GRID + tx];
      if (id && isSolid(findBuilding(state, id)!.type)) return false;
    }
  }
  return true;
}

const spotOrder = new Map<string, Int32Array>();
/** Mọi góc móng (x, z) cho móng w×d, xếp theo khoảng cách từ tâm móng tới (ax, az), gần trước. Ghi nhớ theo khóa. */
function spotsAround(w: number, d: number, ax: number, az: number): Int32Array {
  const key = `${w}:${d}:${ax}:${az}`;
  let list = spotOrder.get(key);
  if (!list) {
    const spots: { x: number; z: number; k: number }[] = [];
    for (let z = 0; z <= GRID - d; z++) {
      for (let x = 0; x <= GRID - w; x++) {
        const dx = x + w / 2 - ax;
        const dz = z + d / 2 - az;
        spots.push({ x, z, k: dx * dx + dz * dz });
      }
    }
    spots.sort((a, b) => a.k - b.k || a.z - b.z || a.x - b.x);
    list = new Int32Array(spots.length * 2);
    spots.forEach((s, i) => {
      list![2 * i] = s.x;
      list![2 * i + 1] = s.z;
    });
    if (spotOrder.size > 64) spotOrder.clear();
    spotOrder.set(key, list);
  }
  return list;
}

/**
 * Tìm chỗ dựng `type` gần điểm neo (mặc định là tâm Điện; công trình một ô thì neo ở góc vùng đất phía rừng).
 * Ưu tiên chỗ có viền trống một ô quanh móng để kinh đô thoáng; hết chỗ thoáng mới đặt sát.
 * Không xét giá: trả về chỗ mà `canPlace` sẽ nhận nếu đủ tài nguyên. Không có chỗ (hay, với `roomyOnly`, không có
 * chỗ thoáng) thì trả về null.
 */
export function findSpot(
  state: GameState,
  type: BuildingType,
  anchor?: { x: number; z: number },
  roomyOnly = false,
): { x: number; z: number } | null {
  const def = BUILDINGS[type];
  const probe = canPlace(state, type, -def.w, -def.d);
  if (!probe.ok && probe.reason !== 'ngoaiVung') return null;
  const dien = state.buildings.find((b) => b.type === 'dien');
  const lo = openStart(state);
  const a = anchor ?? (isSolid(type) && dien ? { x: dien.x + BUILDINGS.dien.w / 2, z: dien.z + BUILDINGS.dien.d / 2 } : { x: lo, z: lo });
  const grid = occupancy(state);
  const list = spotsAround(def.w, def.d, Math.round(a.x * 2) / 2, Math.round(a.z * 2) / 2);
  let packed: { x: number; z: number } | null = null;
  for (let i = 0; i < list.length; i += 2) {
    const x = list[i];
    const z = list[i + 1];
    if (fitsAt(state, type, x, z, grid) !== null) continue;
    if (!isSolid(type) || ringFree(state, grid, x, z, def.w, def.d)) return { x, z };
    packed ??= { x, z };
  }
  return roomyOnly ? null : packed;
}

// ---------- Dời công trình ----------

/** Giá dời một công trình: một phần giá dựng, làm tròn lên. */
export function moveCost(b: Pick<Building, 'type'>): Cost {
  const build = BUILDINGS[b.type].buildCost;
  const cost: Cost = {};
  for (const r of RESOURCE_IDS) if (build[r]) cost[r] = Math.ceil(build[r]! * MOVE_FRACTION);
  return cost;
}

/** Ô (x, z) có đặt được công trình `b` không, coi như `b` đã nhấc khỏi chỗ cũ. */
function fitsWithout(state: GameState, b: Building, x: number, z: number, grid: Int32Array): FailReason | null {
  const def = BUILDINGS[b.type];
  const open = openMask(state);
  for (let dx = 0; dx < def.w; dx++) {
    for (let dz = 0; dz < def.d; dz++) {
      const tx = x + dx;
      const tz = z + dz;
      if (!inGrid(tx, tz) || !open[tz * GRID + tx]) return 'ngoaiVung';
      const at = grid[tz * GRID + tx];
      if (at && at !== b.id) return 'datBiChiem';
    }
  }
  if (def.nearRiver && !touchesRiver(x, z, def.w, def.d)) return 'phaiSatSong';
  return null;
}

export function canMove(state: GameState, id: number, x: number, z: number): Result {
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  if (b.type === 'dien') return fail('khongTheDoi');
  if (state.raid.phase !== 'idle') return fail('dangCoGiac');
  if (b.x === x && b.z === z) return fail('trungCho');
  const why = fitsWithout(state, b, x, z, occupancy(state));
  if (why) return fail(why);
  if (!canAfford(state, moveCost(b))) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/**
 * Dời công trình sang (x, z): giữ cấp, người làm, hư hỏng. Nền đất cũ ở lại chỗ cũ; chỗ mới dân đắp móng
 * phẳng bằng ô cao nhất dưới móng như khi dựng mới (đã đắp nền cao hơn thì phải đắp lại).
 */
export function move(state: GameState, id: number, x: number, z: number): Result<Building> {
  const check = canMove(state, id, x, z);
  if (!check.ok) return check;
  const b = findBuilding(state, id)!;
  pay(state, moveCost(b));
  b.x = x;
  b.z = z;
  levelFootprint(state, b, footprintTop(state, b.type, x, z));
  return ok(b);
}

// ---------- Đắp đất, đắp nền ----------

/** Lũy, bẫy, đê là công trình một ô gắn với đất: muốn cao hơn thì đắp ô đất trước khi dựng. */
const NO_RAISE: BuildingType[] = ['luy', 'bayChong', 'de', 'thanh'];

export function canRaiseTile(state: GameState, x: number, z: number): Result<Cost> {
  if (!inChapter2(state)) return fail('canChuong2');
  if (!isOpen(state, x, z)) return fail('ngoaiVung');
  // Ô đường hay món trang trí một ô thì đắp đất ngay dưới nó được, nó nằm trên mặt đất mới.
  const on = buildingAt(state, x, z);
  if (on && !(isDecor(on.type) && BUILDINGS[on.type].w === 1)) return fail('datBiChiem');
  const h = tileHeight(state, x, z);
  if (h >= MAX_HEIGHT) return fail('datCaoNhat');
  if (state.raid.phase === 'battle') return fail('dangCoGiac');
  const cost = raiseTileCost(h);
  if (!canAfford(state, cost)) return fail('thieuTaiNguyen');
  return ok(cost);
}

/** Đắp ô đất trống (x, z) cao thêm một bậc. */
export function raiseTile(state: GameState, x: number, z: number): Result<number> {
  const check = canRaiseTile(state, x, z);
  if (!check.ok) return check;
  pay(state, check.value);
  state.heights[z * GRID + x] += 1;
  return ok(state.heights[z * GRID + x]);
}

export function raiseCostOf(state: GameState, b: Building): Cost {
  const def = BUILDINGS[b.type];
  return raiseBuildingCost(def.w, def.d, groundOf(state, b));
}

export function canRaiseBuilding(state: GameState, id: number): Result<Cost> {
  if (!inChapter2(state)) return fail('canChuong2');
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  if (NO_RAISE.includes(b.type)) return fail('khongDapNen');
  if (groundOf(state, b) >= MAX_HEIGHT) return fail('datCaoNhat');
  if (state.raid.phase === 'battle') return fail('dangCoGiac');
  const cost = raiseCostOf(state, b);
  if (!canAfford(state, cost)) return fail('thieuTaiNguyen');
  return ok(cost);
}

/** Đắp nền cả công trình cao thêm một bậc. */
export function raiseBuilding(state: GameState, id: number): Result<Building> {
  const check = canRaiseBuilding(state, id);
  if (!check.ok) return check;
  const b = findBuilding(state, id)!;
  pay(state, check.value);
  levelFootprint(state, b, groundOf(state, b) + 1);
  return ok(b);
}

export function upgrade(state: GameState, id: number): Result<Building> {
  const check = canUpgrade(state, id);
  if (!check.ok) return check;
  const b = findBuilding(state, id)!;
  pay(state, upgradeCostOf(b)!);
  b.level += 1;
  fillWorkers(state, b);
  return ok(b);
}

export function remove(state: GameState, id: number): Result {
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  if (!BUILDINGS[b.type].removable) return fail('khongTheDo');
  state.buildings = state.buildings.filter((other) => other.id !== id);
  return ok(undefined);
}

/** Dọn ô đường hay món trang trí đang chiếm ô (x, z). Không hoàn của, như dỡ lũy. */
export function clearDecorAt(state: GameState, x: number, z: number): Result<Building> {
  const b = buildingAt(state, x, z);
  if (!b) return fail('khongTimThay');
  if (!isDecor(b.type)) return fail('khongPhaiTrangTri');
  state.buildings = state.buildings.filter((other) => other.id !== b.id);
  return ok(b);
}

/** Đặt số người làm ở một công trình. */
export function setWorkers(state: GameState, id: number, n: number): Result<Building> {
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  const slots = slotsOf(b);
  if (!slots) return fail('khongCoNguoiLam');
  const target = Math.max(0, Math.min(slots, Math.round(n)));
  if (target - b.workers > freeDan(state)) return fail('thieuDan');
  b.workers = target;
  return ok(b);
}

/** Thứ tự ưu tiên khi tự phân công: có gạo ăn trước, rồi tới tiền, đất đá, sắt. */
const ASSIGN_ORDER: BuildingType[] = ['ruong', 'ben', 'baiDa', 'loRen'];

/** Chia đều dân rảnh vào các chỗ còn trống, mỗi vòng một người cho mỗi công trình. */
export function autoAssign(state: GameState): number {
  let placed = 0;
  const targets = ASSIGN_ORDER.flatMap((t) => state.buildings.filter((b) => b.type === t));
  let progress = true;
  while (freeDan(state) > 0 && progress) {
    progress = false;
    for (const b of targets) {
      if (freeDan(state) <= 0) break;
      if (b.workers < slotsOf(b)) {
        b.workers++;
        placed++;
        progress = true;
      }
    }
  }
  return placed;
}

export function claimQuest(state: GameState): Result<Cost> {
  const quest = currentQuest(state);
  if (!quest) return fail('khongTimThay');
  if (!questDone(state)) return fail('chuaXong');
  gain(state, quest.reward);
  state.questIndex += 1;
  // Vào chương 3: ít phút sau, yêu tinh núi Thất Diệu kéo về phá thành.
  if (state.questIndex === CH3_QUEST_START) scheduleLandRaid(state);
  return ok(quest.reward);
}

// ---------- Quân đội ----------

/** Nơi ở riêng còn nguyên của binh chủng (lính luyện ở đó), nếu có. */
export function homeOf(state: GameState, kind: UnitType): Building | undefined {
  const homes = state.buildings.filter((b) => b.type === UNITS[kind].home);
  return homes.find((b) => !b.damaged) ?? homes[0];
}

export function canTrain(state: GameState, kind: UnitType): Result {
  const def = UNITS[kind];
  if (countOf(state, 'doanhTrai') === 0) return fail('canDoanhTrai');
  const home = homeOf(state, kind);
  if (!home) return fail('canNoiO');
  if (home.damaged) return fail('noiOHu');
  if (state.raid.phase === 'battle') return fail('dangCoGiac');
  if (state.campaign.battle) return fail('dangDanhPhoBan');
  if (isStarving(state)) return fail('thieuGao');
  if (troopSpace(state) + def.space > troopCap(state)) return fail('datGioiHanQuan');
  if (!canAfford(state, def.cost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/**
 * Tuyển một người lính ở nơi ở riêng của binh chủng ấy, xong ngay. Doanh trại giữ tổng số chỗ quân.
 * Lính tách riêng khỏi dân làng:
 * cái giá là tiền tuyển và gạo ăn mỗi phút, không lấy bớt người làm.
 */
export function train(state: GameState, kind: UnitType): Result<UnitType> {
  const check = canTrain(state, kind);
  if (!check.ok) return check;
  pay(state, UNITS[kind].cost);
  state.troops[kind] += 1;
  return ok(kind);
}

export function repairCost(b: Building): Cost {
  const def = BUILDINGS[b.type];
  const base = b.level > 1 ? def.upgradeCost[b.level] : def.buildCost;
  const cost: Cost = {};
  for (const r of RESOURCE_IDS) if (base[r]) cost[r] = Math.max(5, Math.round((base[r]! * REPAIR_FRACTION) / 5) * 5);
  return cost;
}

export function repair(state: GameState, id: number): Result<Building> {
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  if (!b.damaged) return fail('khongHuHong');
  if (state.raid.phase === 'battle') return fail('dangCoGiac');
  const cost = repairCost(b);
  if (!canAfford(state, cost)) return fail('thieuTaiNguyen');
  pay(state, cost);
  b.damaged = false;
  return ok(b);
}

export function repairAllCost(state: GameState): Cost {
  const total: Cost = {};
  for (const b of state.buildings) {
    if (!b.damaged) continue;
    const c = repairCost(b);
    for (const r of RESOURCE_IDS) if (c[r]) total[r] = (total[r] ?? 0) + c[r]!;
  }
  return total;
}

/** Sửa mọi công trình hư hỏng còn đủ tiền sửa, ưu tiên theo thứ tự trong kinh đô. */
export function repairAll(state: GameState): number {
  let fixed = 0;
  for (const b of state.buildings) if (b.damaged && repair(state, b.id).ok) fixed++;
  return fixed;
}

// ---------- Giặc Ân đánh kinh đô ----------

/** Bước nhỏ của mô phỏng trận, giây. */
export const BATTLE_STEP = 0.05;

/** Đền Tản Viên còn nguyên: lũ dâng thấp đi một bậc. */
export function hasTanVien(state: GameState): boolean {
  return state.buildings.some((b) => b.type === 'denTanVien' && !b.damaged);
}

/** Mực lũ của mùa lũ sắp tới (hay đang tới). */
export function nextFloodLevel(state: GameState): number {
  return floodLevel(state.raid.floods + 1, hasTanVien(state));
}

/** Từ đám cưới Sơn Tinh, Thủy Tinh dâng nước kèm thủy quái thay cho giặc Ân. */
export function floodSeason(state: GameState): boolean {
  return sonJoined(state);
}

/** Đền Cổ Loa còn nguyên: chòi canh bắn nỏ mạnh hơn. */
export function hasCoLoa(state: GameState): boolean {
  return state.buildings.some((b) => b.type === 'denCoLoa' && !b.damaged);
}

/**
 * Giặc trên bộ của chương 3: yêu tinh núi Thất Diệu tới khi Rùa Vàng hiện lên (thắng màn 19),
 * quân Triệu Đà từ khi An Dương Vương có nỏ thần. Ở giữa hai mốc ấy chỉ có lũ.
 */
function landFoe(state: GameState): 'yeu' | 'trieu' | null {
  if (!inChapter3(state)) return null;
  if (!ruaVangCame(state)) return 'yeu';
  return advJoined(state) ? 'trieu' : null;
}

/**
 * Đợt sắp tới là ai: chương 1 giặc Ân; chương 2 mùa lũ; chương 3 thì giặc trên bộ và mùa lũ xen nhau,
 * đợt trước là giặc trên bộ thì đợt này là lũ.
 */
export function nextFoe(state: GameState): Foe {
  const raid = state.raid;
  if (raid.phase !== 'idle') return raid.foe;
  if (!floodSeason(state)) return 'an';
  const land = landFoe(state);
  return land && raid.foe !== land ? land : 'thuy';
}

/** Đợt giặc này thuộc chương nào, để chọn tướng ra trận. */
const FOE_CHAPTER: Record<Foe, Chapter> = { an: 1, thuy: 2, yeu: 3, trieu: 3 };

function finishRaid(state: GameState): void {
  const raid = state.raid;
  const battle = raid.battle!;
  // Lính ta còn sống trở về doanh trại, lính tử trận mất hẳn.
  for (const k of UNIT_TYPES) state.troops[k] = Math.max(0, state.troops[k] - battle.lost[k]);
  const stolenAny = RESOURCE_IDS.some((r) => battle.stolen[r] > 0);
  const won = battle.killed === battle.total && !stolenAny;
  const flood = battle.floodTo > 0;
  raid.lastResult = {
    foe: battle.foe,
    wave: battle.wave,
    flood: flood ? battle.water : 0,
    won,
    killed: battle.killed,
    total: battle.total,
    lost: { ...battle.lost },
    wrecked: [...battle.wrecked],
    drowned: [...battle.drowned],
    stolen: { ...battle.stolen },
  };
  if (won) raid.won += 1;
  if (flood) {
    raid.floods += 1;
    if (won && !battle.drowned.length) raid.floodsHeld += 1;
  }
  if (battle.foe === 'yeu') {
    raid.nights += 1;
    if (won) raid.nightsHeld += 1;
  }
  if (battle.foe === 'trieu') {
    raid.trieu += 1;
    if (won) raid.trieuHeld += 1;
  }
  restAfter(state, battle);
  raid.wave = battle.wave;
  raid.phase = 'idle';
  raid.battle = null;
  raid.nextAt = state.clock + RAID_EVERY_MS;
}

/** Đủ lễ vật, Sơn Tinh rước Mị Nương: Thủy Tinh nổi giận, mùa lũ đầu tiên tới sau một lúc. */
export function scheduleFirstFlood(state: GameState): void {
  const raid = state.raid;
  if (raid.phase === 'idle' && raid.floods === 0) raid.nextAt = state.clock + FIRST_FLOOD_MS;
}

/** Vào chương 3, hay An Dương Vương vừa có nỏ thần: giặc trên bộ kéo tới sau một lúc (không muộn hơn lịch sẵn có). */
export function scheduleLandRaid(state: GameState): void {
  const raid = state.raid;
  if (raid.phase !== 'idle' || raid.nextAt === null) return;
  raid.nextAt = Math.min(raid.nextAt, state.clock + FIRST_LAND_MS);
  // Đợt tới phải là giặc trên bộ: coi như đợt trước là lũ.
  if (landFoe(state)) raid.foe = 'thuy';
}

/** Lịch giặc: báo trước, tràn vào, đánh, rồi hẹn đợt sau. Chỉ chạy theo đồng hồ chơi. */
function updateRaid(state: GameState, ms: number): void {
  const raid = state.raid;
  if (raid.phase !== 'battle') raid.water = Math.max(0, raid.water - ms / 1000 / FLOOD_RECEDE_S);
  if (raid.nextAt === null) {
    if (countOf(state, 'doanhTrai') > 0) raid.nextAt = state.clock + FIRST_RAID_MS;
    return;
  }
  // Quân đang đánh phó bản thì giặc chưa tới: đồng hồ giặc đứng lại.
  // Sang chương 2, bờ cõi yên bình tới khi Sơn Tinh rước Mị Nương làm Thủy Tinh nổi giận.
  if (raid.phase === 'idle' && (state.campaign.battle || (inChapter2(state) && !floodSeason(state)))) {
    raid.nextAt += ms;
    return;
  }
  if (raid.phase === 'idle' && state.clock >= raid.nextAt) {
    raid.foe = nextFoe(state);
    raid.phase = 'warning';
    const roll = (raid.wave * 2654435761) % 7 < 4;
    raid.side = raid.foe === 'thuy' ? (roll ? 'nam' : 'dong') : roll ? 'bac' : 'tay';
    raid.startsAt = state.clock + RAID_WARNING_MS;
  }
  if (raid.phase === 'warning' && state.clock >= raid.startsAt) {
    raid.phase = 'battle';
    const foe = raid.foe;
    raid.battle = startBattle(state, raid.wave + 1, raid.side, {
      hero: heroFor(state, FOE_CHAPTER[foe]),
      bonus: troopBonus(state),
      flood: foe === 'thuy' ? { n: raid.floods + 1, level: nextFloodLevel(state) } : null,
      land: foe === 'yeu' ? { foe, n: raid.nights + 1 } : foe === 'trieu' ? { foe, n: raid.trieu + 1 } : null,
      crossbows: hasCoLoa(state),
      arms: state.arms,
    });
    return;
  }
  if (raid.phase === 'battle' && raid.battle) {
    let left = ms / 1000;
    while (left > 1e-9) {
      const dt = Math.min(BATTLE_STEP, left);
      left -= dt;
      const done = stepBattle(state, raid.battle, dt);
      raid.water = raid.battle.water;
      if (done) {
        finishRaid(state);
        return;
      }
    }
  }
}

/** Gọi tới ngay đợt giặc tiếp theo (trinh sát báo luôn). Dùng cho nút "Nghênh chiến" và kiểm thử. */
export function callRaidNow(state: GameState): Result {
  if (countOf(state, 'doanhTrai') === 0) return fail('canDoanhTrai');
  if (state.raid.phase !== 'idle') return fail('dangCoGiac');
  if (state.campaign.battle) return fail('dangDanhPhoBan');
  if (inChapter2(state) && !floodSeason(state)) return fail('canSonTinh');
  state.raid.nextAt = state.clock;
  updateRaid(state, 0);
  return ok(undefined);
}

export function dismissRaidResult(state: GameState): void {
  state.raid.lastResult = null;
}

// ---------- Thuyền buôn ----------

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/** Ba lời mời đổi hàng, lặp lại được theo số chuyến và cấp Điện. */
export function makeOffers(seq: number, level: number): Offer[] {
  let t = (seq * 2654435761 + 97) >>> 0;
  const rand = () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  // Chưa có lò rèn (Điện cấp 1) thì thuyền chưa buôn sắt.
  const pool: ResourceId[] = level >= 2 ? ['gao', 'voOc', 'datDa', 'sat'] : ['gao', 'voOc', 'datDa'];
  const offers: Offer[] = [];
  for (let i = 0; i < 3; i++) {
    const give = pool[Math.floor(rand() * pool.length)];
    let get = pool[Math.floor(rand() * pool.length)];
    if (get === give) get = pool[(pool.indexOf(give) + 1) % pool.length];
    const giveN = round5((40 * level * (0.8 + rand() * 0.5)) / TRADE_VALUE[give]);
    const getN = round5(((giveN * TRADE_VALUE[give]) / TRADE_VALUE[get]) * TRADE_BONUS);
    offers.push({ give: { r: give, n: giveN }, get: { r: get, n: getN }, taken: false });
  }
  return offers;
}

/** Thuyền buôn đến khi tới giờ và kinh đô đã có bến, rời đi khi hết giờ đậu. */
function updateMerchant(state: GameState): void {
  const m = state.merchant;
  if (m.visit && state.clock >= m.visit.leavesAt) m.visit = null;
  if (!m.visit && state.clock >= m.nextAt) {
    if (countOf(state, 'ben') > 0) {
      m.seq += 1;
      m.visit = { leavesAt: state.clock + MERCHANT_STAY_MS, offers: makeOffers(m.seq, dienLevel(state)) };
      m.nextAt = state.clock + MERCHANT_EVERY_MS;
    } else {
      // Chưa có bến thì hẹn lại sau một lúc.
      m.nextAt = state.clock + 30_000;
    }
  }
}

export function acceptOffer(state: GameState, index: number): Result<Offer> {
  const visit = state.merchant.visit;
  if (!visit) return fail('thuyenDaDi');
  const offer = visit.offers[index];
  if (!offer) return fail('khongTimThay');
  if (offer.taken) return fail('daDoi');
  if (state.resources[offer.give.r] < offer.give.n) return fail('thieuTaiNguyen');
  state.resources[offer.give.r] -= offer.give.n;
  gain(state, { [offer.get.r]: offer.get.n });
  offer.taken = true;
  return ok(offer);
}

// ---------- Dòng thời gian ----------

/** Sản xuất, ăn uống và sinh thêm dân trong `ms` mili giây với hệ số tốc độ `rate`. */
function produce(state: GameState, ms: number, rate: number): Resources {
  const gained: Resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
  if (ms <= 0) return gained;
  const starving = isStarving(state);
  const net = netPerMinute(state);
  const cap = storageCap(state);
  for (const r of RESOURCE_IDS) {
    const before = state.resources[r];
    const raw = before + (net[r] * rate * ms) / 60000;
    // Không cắt bớt phần đang vượt sức chứa (ví dụ do thưởng), chỉ ngừng tăng.
    const after = net[r] >= 0 ? Math.max(before, Math.min(cap, raw)) : Math.max(0, raw);
    state.resources[r] = after;
    gained[r] = after - before;
  }
  bake(state, ms, rate * (starving ? STARVING_RATE : 1));
  const room = housing(state);
  if (state.dan >= room || starving) {
    state.danProgress = 0;
  } else {
    state.danProgress += ms * rate;
    while (state.danProgress >= DAN_GROW_MS && state.dan < room) {
      state.danProgress -= DAN_GROW_MS;
      state.dan += 1;
    }
    if (state.dan >= room) state.danProgress = 0;
  }
  return gained;
}

/** Thời gian trôi khi đang mở game: sản xuất, đồng hồ chơi chạy, thuyền buôn đến đi. */
export function tick(state: GameState, ms: number): Resources {
  if (ms <= 0) return { gao: 0, voOc: 0, datDa: 0, sat: 0 };
  const gained = produce(state, ms, 1);
  state.clock += ms;
  updateMerchant(state);
  updateCampaign(state, ms);
  updateRaid(state, ms);
  updateTet(state);
  return gained;
}

/** Tính phần sản xuất trong lúc vắng mặt, từ lastSeen tới now. Đồng hồ chơi không chạy. */
export function applyOffline(state: GameState, now: number): { ms: number; gained: Resources } {
  const ms = Math.min(Math.max(now - state.lastSeen, 0), OFFLINE_CAP_MS);
  const gained = produce(state, ms, OFFLINE_RATE);
  state.lastSeen = now;
  return { ms, gained };
}
