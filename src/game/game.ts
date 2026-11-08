// Luật chơi: trạng thái, truy vấn, thao tác và dòng thời gian.
// Không phụ thuộc DOM hay Three.js để test được bằng Vitest.

import { plannedBoats, startBattle, stepBattle, type Battle, type RaidSide } from './battle';
import { updateCampaign } from './campaign';
import { initialCaoLo } from './caoLo';
import { initialCayDa, updateCayDa, type CayDaState } from './cayDa';
import { bridgeFit, bridgeheadCells, cutOff, farFactor, farRaidBank, fortFit, initialBenKia, landRaidSide, openBridgehead, updateBenKia, villagesOutput, type BenKiaState } from './benKia';
import { huanTiers, initialThuThach } from './thuThach';
import { advanceDao, chanThuyen, daoArmy, donOf, initialDao, luaHieu, nguTruongBonus, type DaoState } from './dao';
import { advanceXay, initialXay, isBusy, nextXayEvent, pendingBuilding, pendingBuildings, pendingCount, pendingOf, type XayState } from './xay';
import { inChapter4 } from './chuong4';
import { chuong5Won, inChapter5, initialHaiBa, maVienCame } from './chuong5';
import { advJoined, initialAdv, inChapter3, ruaVangCame, wallRings } from './coLoa';
import { heroesFor, inChapter2, initialSon, restAfter, sonJoined } from './son';
import { bake, datBonus, initialTet, troiBonus, updateTet, type TetState } from './tet';
import { floodHits, footprintTop, groundOf, levelFootprint, tileHeight, type FloodHits } from './terrain';
import {
  BUILDINGS,
  CA_BIEN_PER_MIN,
  CA_PER_MIN,
  CH3_QUEST_START,
  CH4_QUEST_START,
  CH5_QUEST_START,
  DIEN_CHAPTER,
  FIRST_HAN_MS,
  FIRST_THUY_BINH_MS,
  U_NO,
  LAU_NO_TOWERS,
  MOVE_FRACTION,
  NEW_HINTS,
  FIRST_FLOOD_MS,
  FIRST_LAND_MS,
  FLOOD_RECEDE_S,
  PHU_SA_BONUS,
  PHU_SA_TYPES,
  GIFT_IDS,
  MAX_HEIGHT,
  floodLevel,
  isBridge,
  isDecor,
  isRoad,
  isWalkWall,
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
  DON_DAO,
  REPAIR_FRACTION,
  RESOURCE_IDS,
  RONG_TIEN_BONUS,
  RONG_TIEN_RES,
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
  type ChallengeKind,
  type Cost,
  type Foe,
  type QuestDef,
  type ResourceId,
  type Resources,
  type GearId,
  type GiftId,
  type HuanBranch,
  type Row,
  type NuTuongId,
  type Unlock,
  type UnitType,
} from './defs';
import { capOf } from './doanhTrai';
import { START_KHOANH, isOpen, openMask, openStart } from './khoanh';
import { DIEN_HOME, GRID, baseHeights, farBankOf, inGrid, isNearBank, touchesRiver } from './map';

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
  /** Doanh trại: số lính mỗi binh chủng người chơi bố trí giữ kinh đô. Chưa có thì bố trí tự động. */
  guard?: Record<UnitType, number>;
  /** Đoạn thành Cổ Loa có ụ nỏ trên mặt thành: còn tốt, hay đã hư theo thành (phải sửa riêng). */
  uNo?: 'ok' | 'hu';
  /** Công trình xoay được (`canRotateType`): đã xoay mấy nấc 90° (1–3). Không có là hướng gốc. */
  rot?: number;
  /** Cống đê đang mở: nước lũ tràn vào sau đê (`floodHits` ở `terrain.ts`). Không có là đóng. */
  mo?: true;
  /** Ruộng lúa, ruộng nếp được bồi phù sa ở mùa lũ vừa rồi: làm ra thêm `PHU_SA_BONUS` tới hết mùa lũ sau. */
  boi?: true;
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
  /** Mùa lũ: số ruộng được bồi phù sa (nước vào qua cống đang mở). */
  boi?: number;
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
  /** Số đợt thủy binh Triệu đi thuyền đánh kinh đô, và số đợt đánh lui được hết. */
  thuyBinh: number;
  thuyBinhHeld: number;
  /** Số đợt quân Hán đánh kinh đô (chương 5), và số đợt đánh lui được hết. */
  han: number;
  hanHeld: number;
  /** Số đợt thủy quân Hán (từ khi Mã Viện sang), số đợt đánh lui được hết, và số lâu thuyền đã đánh chìm. */
  thuyHan: number;
  thuyHanHeld: number;
  lauSunk: number;
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
  /** Trận thử thách: kiểu thử thách, huân công được (0 khi đã thắng thử thách này rồi, hay thua). */
  challenge?: { kind: ChallengeKind; huan: number };
  /** Trận đánh đồn giặc bên kia sông (khoảnh có đồn), `stage` khi ấy là 0. */
  camp?: number;
}

export interface CampaignState {
  /** Màn cao nhất đã thắng, 0 khi chưa thắng màn nào. */
  cleared: number;
  /** Hàng đứng của từng binh chủng, nhớ cho lần xuất quân sau. */
  rows: Record<UnitType, Row>;
  /** Trận đang đánh. Đánh xong vẫn giữ để vẽ cảnh cuối tới khi người chơi xem xong kết quả. */
  battle: Battle | null;
  lastResult: StageResult | null;
  /** Nữ tướng chọn làm phó tướng lần xuất quân trước (`nuTuong.ts`); không có là không mang ai. */
  phoTuong?: NuTuongId;
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
  /**
   * Trọng Thủy đã đánh tráo lẫy nỏ thần (thắng màn 28, đoạn truyện 3 của chương 4): từ đó khi giữ kinh đô An Dương
   * Vương không còn kỹ năng Nỏ thần, và giặc kéo tới ba đợt thay phiên. Phó bản màn 17–25 vẫn đủ Nỏ thần.
   */
  layTrao: boolean;
  /**
   * Đã theo Rùa Vàng xuống biển (thắng màn 32, kết chương 4): từ đó không đứng ở Điện, không giữ kinh đô nữa;
   * phó bản màn 17–25 vẫn hiển linh ra trận, vẫn chỉ huy doanh trại.
   */
  bien: boolean;
}

/** Thử thách phó bản và huân công (`thuThach.ts`). */
export interface ThuThachState {
  /** Các màn đã thắng thử thách, xếp tăng dần. */
  won: number[];
  /** Huân công đang có, chưa tiêu. */
  huan: number;
  /** Bậc huân công đã mua của từng nhánh (0–4). */
  bac: Record<HuanBranch, number>;
}

export interface CaoLoState {
  /** Đồng hồ chơi lúc Cao Lỗ hồi sức sau khi kiệt sức trong trận. */
  restUntil: number;
  /** Đã có Lệnh bắn (thắng màn 30 lần đầu). */
  lenhBan: boolean;
}

/** Hai Bà Trưng (chương 5): đồng hồ chơi lúc từng bà hồi sức sau khi kiệt sức trong trận. */
export interface HaiBaState {
  trungTrac: number;
  trungNhi: number;
}

/** Các đoạn truyện, hiện mỗi đoạn một lần theo đúng thứ tự. */
export type StoryId =
  | 'mo'
  | 'suGia'
  | 'benKia'
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
  | 'ketChuong3'
  | 'cauHon'
  | 'caoLoCamQuan'
  | 'layNo'
  | 'longNgong'
  | 'ngocTrai'
  /** Màn hình Hết truyện sau đoạn cuối chương 4 (không phải hộp thoại); nay dẫn sang chương 5. */
  | 'hetTruyen'
  | 'meLinh'
  | 'hatMon'
  | 'trungVuong'
  | 'phucBa'
  | 'langBac'
  | 'songHat'
  /** Màn hình Hết truyện sau đoạn cuối chương 5. */
  | 'hetTruyen5';

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

/**
 * Phiên bản bản lưu hiện tại (11: kinh đô lớn; 12: khoảnh tự chọn; 13: lính nỏ, ụ nỏ; 14: Cao Lỗ, vua xuống biển;
 * 15: thử thách, huân công; 16: gỗ, tài nguyên thứ năm, và gợi ý của Lạc hầu về công trình mới; 17: cây, đá mọc trên
 * ô trống; 18: lưới nới qua sông, 76×76; 20: Điện 10×10; 21: chương 5, quân Hán; 22: Hai Bà Trưng; 23: thủy quân Hán,
 * lâu thuyền; 24: nữ tướng, thử thách màn 33–40; 25: thời gian xây, tốp thợ, nhà thợ hồ, đố sử; 26: một doanh trại
 * lớn; 27: đóng đảo).
 */
export const SAVE_VERSION = 27;

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
  caoLo: CaoLoState;
  haiBa: HaiBaState;
  thuThach: ThuThachState;
  /** Hội Tết bánh chưng bánh giầy. */
  tet: TetState;
  story: { seen: StoryId[] };
  settings: { muted: boolean };
  /** Các khoảnh đất 5×5 đã mở (số `cz * 10 + cx`, xếp tăng dần). Phát rừng thì thay bằng mảng mới (`khoanh.ts`). */
  khoanh: number[];
  /** Công trình mới (`NEW_HINTS`) Lạc hầu đã gợi ý lần đầu mở, mỗi loại một lần. */
  hinted: string[];
  /** Cây, đá mọc trên ô trống (`cayDa.ts`). */
  cayDa: CayDaState;
  /** Vùng đất bên kia sông (`benKia.ts`): khoảnh đã dò, đã mở, trinh sát đang đi, đồn đã dẹp. */
  benKia: BenKiaState;
  /** Việc xây đang làm, tốp thợ, câu đố sử vừa hỏi (`xay.ts`). */
  xay: XayState;
  /** Đóng đảo (`dao.ts`): đồn đảo, thuyền chiến, lính đóng ở Hoàng Sa, Trường Sa. */
  dao: DaoState;
  /** Vừa nâng từ kinh đô nhỏ: kinh đô đã dựng lại theo mẫu, trả lại chừng này của. Giao diện báo một lần rồi xóa. */
  relaid?: { refund: Cost; dropped: number; dien?: boolean; trai?: boolean };
}

export type FailReason =
  | 'thieuTaiNguyen'
  | 'chuaDuCapDien'
  | 'datBiChiem'
  | 'ngoaiVung'
  | 'phaiSatSong'
  | 'phaiSatThanh'
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
  | 'tuongKietSuc'
  | 'chiSonTinh'
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
  | 'canHetTruyen'
  | 'canChuong5'
  | 'khongGhepDuoc'
  | 'canNoiO'
  | 'noiOHu'
  | 'tuongChuaCo'
  | 'quaChoPhoBan'
  | 'quaChoGiuThanh'
  | 'khongPhaiTrangTri'
  | 'khoanhDaMo'
  | 'khoanhChuaSat'
  | 'canThanh'
  | 'daCoUNo'
  | 'khongCoUNo'
  | 'canKetChuong4'
  | 'canKetChuong5'
  | 'canCaoLo'
  | 'caoLoKietSuc'
  | 'haiBaKietSuc'
  | 'thuThachKhoa'
  | 'thuThachBinhChung'
  | 'huanToiDa'
  | 'thieuHuanCong'
  | 'dauCauCoDon'
  | 'cauKhongDoi'
  | 'daDo'
  | 'dangDo'
  | 'canCau'
  | 'cauHu'
  | 'xaQua'
  | 'trinhSatBan'
  | 'donDaDep'
  | 'chanLoiCau'
  | 'daVeTheo'
  | 'chuaVeTay'
  | 'phaiBenKia'
  | 'khongXoayDuoc'
  | 'hetTho'
  | 'dangXay'
  | 'daHoiDu'
  | 'canBenKhoi'
  | 'canBenKhoi3'
  | 'daCoThuyen'
  | 'canThuyenChien'
  | 'canDonDao';

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
    thuyBinh: 0,
    thuyBinhHeld: 0,
    han: 0,
    hanHeld: 0,
    thuyHan: 0,
    thuyHanHeld: 0,
    lauSunk: 0,
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
    troops: { giao: 0, cung: 0, voi: 0, no: 0 },
    arms: { giao: 0, cung: 0, voi: 0, no: 0 },
    raid: initialRaid(),
    campaign: initialCampaign(),
    nextBattleId: 1,
    giong: initialGiong(),
    son: initialSon(),
    adv: initialAdv(),
    caoLo: initialCaoLo(),
    haiBa: initialHaiBa(),
    thuThach: initialThuThach(),
    tet: initialTet(),
    story: { seen: [] },
    settings: { muted: false },
    khoanh: [...START_KHOANH],
    hinted: [],
    cayDa: initialCayDa(),
    benKia: initialBenKia(),
    xay: initialXay(),
    dao: initialDao(),
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
  return BUILDINGS[type].limit[dienLevel(state) - 1];
}

/**
 * Số chỗ đã dùng trong giới hạn `limitOf`: tính cả công trình đang dựng và đoạn tường đang đổi sang loại này; mỗi lầu
 * nỏ tính là hai chòi canh; bốn loại đường chung một giới hạn.
 */
export function usedOf(state: GameState, type: BuildingType): number {
  if (isRoad(type)) return ROAD_TYPES.reduce((n, t) => n + countOf(state, t), 0);
  return countOf(state, type) + pendingCount(state, type) + (type === 'choiCanh' ? LAU_NO_TOWERS * countOf(state, 'lauNo') : 0);
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

/** Phần ăn mỗi phút của cả kinh đô (dân và lính), tính bằng gạo, chưa trừ phần cá đỡ. */
export function foodPerMinute(state: GameState): number {
  let total = state.dan * GAO_PER_DAN;
  // Lính đóng đảo (và đang trên thuyền chiến) vẫn ăn gạo kinh đô gửi ra.
  const away = state.dao ? daoArmy(state) : null;
  for (const k of UNIT_TYPES) total += (state.troops[k] + (away?.[k] ?? 0)) * UNITS[k].upkeep;
  return total;
}

/**
 * Cá một làng chài (hay cá biển một bến thuyền khơi) đánh được mỗi phút, tỉ lệ theo số người làm; công trình hư thì
 * không.
 */
export function fishOf(b: Building): number {
  const table = b.type === 'langChai' ? CA_PER_MIN : b.type === 'benKhoi' ? CA_BIEN_PER_MIN : null;
  if (!table || b.damaged) return 0;
  const slots = slotsOf(b);
  return (table[b.level - 1] ?? 0) * (slots ? Math.min(b.workers, slots) / slots : 1);
}

/**
 * Cá cả kinh đô mỗi phút: mọi làng chài, bến thuyền khơi (bên kia sông mà cầu hư thì không ai sang đánh cá), cộng
 * phần của Đền Phù Đổng và phúc lành Đất như mọi sản lượng, và phần của Đền Rồng Tiên (cá là của từ nước).
 */
export function fishPerMinute(state: GameState): number {
  const fish = state.buildings.reduce((sum, b) => sum + (cutOff(state, b) ? 0 : fishOf(b) * (1 + nguTruongBonus(state, b))), 0);
  return fish * (1 + templeBonus(state) + datBonus(state) + rongTienBonus(state));
}

/** Gạo cả kinh đô ăn mỗi phút: phần ăn của dân và lính trừ đi phần cá đỡ (cá thừa bỏ phí). */
export function upkeepPerMinute(state: GameState): number {
  return Math.max(0, foodPerMinute(state) - fishPerMinute(state));
}

export function troopCount(state: GameState): number {
  return UNIT_TYPES.reduce((n, k) => n + state.troops[k], 0);
}

/** Số chỗ quân đang dùng (voi chiến chiếm nhiều chỗ). */
export function troopSpace(state: GameState): number {
  return UNIT_TYPES.reduce((n, k) => n + state.troops[k] * UNITS[k].space, 0);
}

/** Tổng chỗ quân: chỗ của doanh trại (mỗi tướng một doanh). */
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
  // Công trình đang dựng mới cũng chiếm ô.
  const all = state.xay?.viec.length ? [...state.buildings, ...pendingBuildings(state)] : state.buildings;
  for (const b of all) {
    const v = (((b.id * 64 + (TYPE_INDEX.get(b.type) ?? 0)) * 64 + b.x) * 64 + b.z) | 0;
    a = Math.imul(a ^ v, 0x01000193);
    h = Math.imul(h ^ v ^ b.id, 0x85ebca6b) ^ (h >>> 13);
  }
  const n = all.length;
  const hit = occupancyCache.get(state);
  if (hit && hit.a === a && hit.b === h && hit.n === n) return hit.grid;
  const grid = new Int32Array(GRID * GRID);
  for (const b of all) {
    const def = BUILDINGS[b.type];
    for (let dx = 0; dx < def.w; dx++) {
      for (let dz = 0; dz < def.d; dz++) grid[(b.z + dz) * GRID + (b.x + dx)] = b.id;
    }
  }
  occupancyCache.set(state, { a, b: h, n, grid });
  return grid;
}

/** Công trình đã dựng ở ô (x, z). Công trình đang dựng mới không tính (xem `pendingAt`). */
export function buildingAt(state: GameState, x: number, z: number): Building | undefined {
  if (!inGrid(x, z)) return undefined;
  const id = occupancy(state)[z * GRID + x];
  return id ? findBuilding(state, id) : undefined;
}

/**
 * Đoạn thành đất hay thành Cổ Loa (`isWalkWall`) chung cạnh với ô (x, z) mà ô ấy ở mặt trong (gần tâm Điện hơn đoạn
 * thành): bậc lên thành ở đó dựa vào đoạn này (lấy đoạn đầu tiên theo thứ tự đông, tây, nam, bắc). Bậc ở mặt trong
 * thì lính trong thành lên được, và trận biết giặc đã vào trong hay còn ngoài thành (gần bậc hay gần mặt thành hơn).
 * `grid` là lưới chiếm ô nếu đã có sẵn.
 */
export function stairWall(state: GameState, x: number, z: number, grid = occupancy(state)): Building | undefined {
  const dien = state.buildings.find((b) => b.type === 'dien');
  const cx = dien ? dien.x + BUILDINGS.dien.w / 2 : DIEN_HOME;
  const cz = dien ? dien.z + BUILDINGS.dien.d / 2 : DIEN_HOME;
  const here = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    if (!inGrid(x + dx, z + dz)) continue;
    const id = grid[(z + dz) * GRID + x + dx];
    const b = id ? findBuilding(state, id) : undefined;
    if (b && isWalkWall(b) && Math.hypot(b.x + 0.5 - cx, b.z + 0.5 - cz) > here) return b;
  }
  return undefined;
}

/** Công trình (đã dựng, hay đang dựng mới) có mã `id`: dùng khi tra theo lưới ô bị chiếm (`occupancy`). */
export function occupant(state: GameState, id: number): Building | undefined {
  return findBuilding(state, id) ?? pendingBuilding(state, id);
}

/** Công trình đang dựng mới (chưa xong) chiếm ô (x, z), nếu có. */
export function pendingAt(state: GameState, x: number, z: number): Building | undefined {
  if (!inGrid(x, z) || !state.xay?.viec.length) return undefined;
  const id = occupancy(state)[z * GRID + x];
  return id && !findBuilding(state, id) ? pendingBuilding(state, id) : undefined;
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

/**
 * Phần cộng thêm của Đền Rồng Tiên, khi đền đã dựng và còn nguyên: chỉ cho của từ nước, từ núi (`RONG_TIEN_RES`) và cá.
 */
export function rongTienBonus(state: GameState): number {
  return state.buildings.some((b) => b.type === 'denRongTien' && !b.damaged) ? RONG_TIEN_BONUS : 0;
}

/** Phần cộng thêm vào máu và sức đánh quân ta: Đền Phù Đổng và phúc lành Trời của Tết. */
export function troopBonus(state: GameState): number {
  return templeBonus(state) + troiBonus(state);
}

/** Phần cộng thêm của phù sa: ruộng lúa, ruộng nếp được bồi ở mùa lũ vừa rồi làm ra thêm `PHU_SA_BONUS`. */
export function phuSaBonus(b: Building): number {
  return b.boi && PHU_SA_TYPES.includes(b.type) ? PHU_SA_BONUS : 0;
}

/**
 * Sản lượng mỗi phút của công trình `b` trong kinh đô: theo người làm, cộng đặc sản đất bên kia sông và phù sa, bằng 0
 * khi cầu sang bờ ấy hư (chưa cộng đền, phúc lành).
 */
export function outputIn(state: GameState, b: Building): Cost {
  const out = outputOf(b);
  const far = farFactor(state, b);
  if (far === 0) return {};
  const k = far + phuSaBonus(b) + nguTruongBonus(state, b);
  if (k === 1) return out;
  for (const r of RESOURCE_IDS) if (out[r]) out[r] = out[r]! * k;
  return out;
}

/**
 * Sản lượng mỗi phút của cả kinh đô (cả bản làng bên kia sông đã về theo), chưa trừ gạo ăn và chưa tính thiếu gạo.
 * Đền Phù Đổng và phúc lành Đất cộng thêm mọi tài nguyên; Đền Rồng Tiên cộng thêm của từ nước, từ núi.
 */
export function productionPerMinute(state: GameState): Resources {
  const total = villagesOutput(state);
  for (const b of state.buildings) {
    const out = outputIn(state, b);
    for (const r of RESOURCE_IDS) total[r] += out[r] ?? 0;
  }
  const bonus = 1 + templeBonus(state) + datBonus(state);
  const rongTien = rongTienBonus(state);
  for (const r of RESOURCE_IDS) total[r] *= bonus + (RONG_TIEN_RES.includes(r) ? rongTien : 0);
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
  const net: Resources = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
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
  if (unlock === 'ruaVang') return ruaVangCame(state);
  if (unlock === 'ketChuong3') return state.adv.won;
  if (unlock === 'chuong4') return inChapter4(state);
  if (unlock === 'ketChuong4') return state.adv.bien;
  if (unlock === 'chuong5') return inChapter5(state);
  if (unlock === 'ketChuong5') return chuong5Won(state);
  return true;
}

/**
 * Công trình mới Lạc hầu cần gợi ý: loại đầu tiên trong `NEW_HINTS` đã mở theo truyện và cấp Điện mà chưa gợi ý
 * (bậc lên thành thì cần có thành để dựa vào). Giao diện báo rồi ghi vào `hinted` (`markHinted`).
 */
export function nextHint(state: GameState): BuildingType | null {
  for (const type of NEW_HINTS) {
    const def = BUILDINGS[type];
    // Bậc lên thành chỉ gợi ý khi kinh đô đã có đoạn thành đất hay thành Cổ Loa để dựa vào.
    if (type === 'bacThanh' && !state.buildings.some(isWalkWall)) continue;
    if (!state.hinted.includes(type) && unlocked(state, def.unlock) && dienLevel(state) >= def.minDien) return type;
  }
  return null;
}

export function markHinted(state: GameState, type: BuildingType): void {
  if (!state.hinted.includes(type)) state.hinted = [...state.hinted, type];
}

export const UNLOCK_REASON: Record<Unlock, FailReason> = {
  ketChuong1: 'canKetChuong',
  chuong2: 'canChuong2',
  ketChuong2: 'canKetChuong2',
  chuong3: 'canChuong3',
  ruaVang: 'canRuaVang',
  ketChuong3: 'canKetChuong3',
  chuong4: 'canChuong4',
  ketChuong4: 'canKetChuong4',
  chuong5: 'canChuong5',
  ketChuong5: 'canKetChuong5',
};

/**
 * Công trình bị thay khi dựng `type` ở (x, z): thành Cổ Loa đắp đè lên lũy tre (hay thành đất) được, lũy cũ được dỡ đi;
 * cổng thành dựng thay một đoạn lũy, thành đất hay thành Cổ Loa (ụ nỏ trên đoạn thành mất theo); cống đê dựng thay
 * một đoạn đê; trải loại đường khác đè lên ô đường cũ thì đổi vật liệu. Không hoàn lại giá đoạn bị thay.
 */
export function replacedWall(state: GameState, type: BuildingType, x: number, z: number): Building | undefined {
  if (type !== 'thanh' && type !== 'congThanh' && type !== 'congDe' && !isRoad(type)) return undefined;
  const b = buildingAt(state, x, z);
  // Đoạn đang có thợ làm (nâng cấp, đổi loại) thì không đắp đè được.
  if (b && isBusy(state, b.id)) return undefined;
  if (type === 'thanh') return b?.type === 'luy' ? b : undefined;
  if (type === 'congThanh') return b?.type === 'luy' || b?.type === 'thanh' ? b : undefined;
  if (type === 'congDe') return b?.type === 'de' ? b : undefined;
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
  if (!swap && usedOf(state, type) >= limitOf(state, type)) return fail('datGioiHan');
  const why = fitsAt(state, type, x, z, occupancy(state));
  if (why) return fail(why);
  if (!canAfford(state, def.buildCost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/**
 * Phần chỗ đặt của `canPlace`: móng nằm trong vùng đã khai phá (bên này, hay khoảnh đã mở bên kia sông), không chồng
 * công trình khác (thành đắp đè lũy được), bến sát sông. Cầu thì vắt qua sông (`bridgeFit`).
 */
function fitsAt(state: GameState, type: BuildingType, x: number, z: number, grid: Int32Array): FailReason | null {
  if (isBridge(type)) return bridgeFit(state, type, x, z) ?? (bridgeClear(type, x, z, grid) ? null : 'datBiChiem');
  const def = BUILDINGS[type];
  // Ô đầu cầu (hai bờ) chừa làm lối lên cầu; đường đi thì trải được.
  if (!isRoad(type) && blocksBridge(state, x, z, def.w, def.d)) return 'chanLoiCau';
  // Đồn biên chỉ dựng bên kia sông, mỗi bờ một.
  if (type === 'donBien') {
    const why = fortFit(state, x, z);
    if (why) return why;
  }
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
  if (type === 'bacThanh' && !stairWall(state, x, z, grid)) return 'phaiSatThanh';
  return null;
}

/** Móng (x, z, w, d) chồng lên ô đầu cầu của một cầu đang có. */
function blocksBridge(state: GameState, x: number, z: number, w: number, d: number): boolean {
  if (!state.buildings.some((b) => isBridge(b.type))) return false;
  const heads = bridgeheadCells(state);
  for (let dx = 0; dx < w; dx++) for (let dz = 0; dz < d; dz++) if (heads.has((z + dz) * GRID + x + dx)) return true;
  return false;
}

/** Ô sông dưới cầu chưa có gì (cầu khác chẳng hạn). */
function bridgeClear(type: BuildingType, x: number, z: number, grid: Int32Array): boolean {
  const def = BUILDINGS[type];
  for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (grid[(z + dz) * GRID + x + dx]) return false;
  return true;
}

export function canUpgrade(state: GameState, id: number): Result {
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  if (isBusy(state, id)) return fail('dangXay');
  const cost = upgradeCostOf(b);
  if (!cost) return fail('capToiDa');
  // Điện lên cấp 6 khi đã vào chương 2, cấp 7 khi đã vào chương 3, cấp 8 khi đã vào chương 4, cấp 10 khi đã vào
  // chương 5.
  const chapter = b.type === 'dien' ? DIEN_CHAPTER[b.level + 1] : undefined;
  if (chapter === 2 && !inChapter2(state)) return fail('canChuong2');
  if (chapter === 3 && !inChapter3(state)) return fail('canChuong3');
  if (chapter === 4 && !inChapter4(state)) return fail('canChuong4');
  if (chapter === 5 && !inChapter5(state)) return fail('canChuong5');
  // Sau truyện chương 4: Điện 9 khi vua đã ra biển Mộ Dạ (Hết truyện).
  if (b.type === 'dien' && b.level + 1 === 9 && !state.adv.bien) return fail('canHetTruyen');
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
  } else if (goal.kind === 'uNo') {
    have = uNoCount(state);
    need = goal.amount;
  } else if (goal.kind === 'unitTroops') {
    have = state.troops[goal.unit];
    need = goal.amount;
  } else if (goal.kind === 'thuyBinhHeld') {
    have = state.raid.thuyBinhHeld;
    need = goal.amount;
  } else if (goal.kind === 'hanHeld') {
    have = state.raid.hanHeld;
    need = goal.amount;
  } else if (goal.kind === 'lauSunk') {
    have = state.raid.lauSunk;
    need = goal.amount;
  } else if (goal.kind === 'buildingLevel') {
    const lv = goal.level;
    have = state.buildings.filter((b) => b.type !== 'dien' && b.level >= lv).length;
    need = goal.amount;
  } else if (goal.kind === 'thuyenChien') {
    have = (['hoangSa', 'truongSa'] as const).filter((id) => donOf(state, id).thuyen).length;
    need = goal.amount;
  } else if (goal.kind === 'donDao') {
    have = goal.dao ? donOf(state, goal.dao).cap : Math.max(donOf(state, 'hoangSa').cap, donOf(state, 'truongSa').cap);
    need = goal.level;
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

/**
 * Dựng công trình loại `type` ở góc móng (x, z). Loại xoay được thì dựng theo hướng `rot` (số nấc 90°, xem
 * `canRotateType`); loại khác bỏ qua `rot`.
 */
export function place(state: GameState, type: BuildingType, x: number, z: number, rot = 0): Result<Building> {
  const check = canPlace(state, type, x, z);
  if (!check.ok) return check;
  const over = replacedWall(state, type, x, z);
  if (over) state.buildings = state.buildings.filter((b) => b.id !== over.id);
  pay(state, BUILDINGS[type].buildCost);
  const b = newBuilding(state, type, x, z, rot);
  state.buildings.push(b);
  fillWorkers(state, b);
  openBridgehead(state, b);
  return ok(b);
}

/**
 * Công trình mới loại `type` ở góc móng (x, z), hướng `rot`, cấp 1, chưa người làm: cấp mã mới, dân đắp móng phẳng
 * bằng chỗ cao nhất dưới móng. Chưa đưa vào kinh đô (`place` đưa vào ngay, `startBuild` ở `xay.ts` đưa vào khi xong).
 */
export function newBuilding(state: GameState, type: BuildingType, x: number, z: number, rot = 0): Building {
  const b: Building = { id: state.nextId++, type, x, z, level: 1, workers: 0 };
  if (canRotateType(type)) setRot(b, rot);
  levelFootprint(state, b, footprintTop(state, type, x, z));
  return b;
}

/** Một ô của dải kéo thả: dựng được (`ok`), đã có đúng loại ấy (`has`, không dựng thêm), hay hỏng vì `reason`. */
export interface LineCell {
  x: number;
  z: number;
  ok: boolean;
  has?: true;
  reason?: FailReason;
}

/**
 * Xét dải `tiles` khi kéo thả trải đường, đắp tường: từng ô dựng được không, theo thứ tự, có cộng dồn giá và số tối
 * đa của các ô trước trong dải (nên ô cuối dải tô đỏ khi hết của hay đủ giới hạn giữa chừng). Ô đã có đúng loại ấy
 * thì không dựng thêm, không tính giá. Trả từng ô, số ô sẽ dựng và tổng giá.
 */
export function planLine(state: GameState, type: BuildingType, tiles: { x: number; z: number }[]): { cells: LineCell[]; n: number; cost: Cost } {
  const def = BUILDINGS[type];
  const limit = limitOf(state, type);
  let used = usedOf(state, type);
  const left: Resources = { ...state.resources };
  const cost: Cost = {};
  const seen = new Set<number>();
  const cells: LineCell[] = [];
  let n = 0;
  for (const t of tiles) {
    const key = t.z * GRID + t.x;
    if (seen.has(key)) continue;
    seen.add(key);
    // Đã có đúng loại ấy, hay đang có thợ dựng, đổi sang loại ấy: không dựng thêm.
    const here = buildingAt(state, t.x, t.z);
    if (here?.type === type || pendingAt(state, t.x, t.z)?.type === type || (here && pendingOf(state, here.id)?.doi === type)) {
      cells.push({ x: t.x, z: t.z, ok: true, has: true });
      continue;
    }
    const r = canPlace(state, type, t.x, t.z);
    // Đổi vật liệu một ô đường không thêm ô nào.
    const swap = isRoad(type) && !!replacedWall(state, type, t.x, t.z);
    let reason: FailReason | null = r.ok ? null : r.reason;
    if (!reason && !swap && used >= limit) reason = 'datGioiHan';
    if (!reason && RESOURCE_IDS.some((id) => (def.buildCost[id] ?? 0) > left[id])) reason = 'thieuTaiNguyen';
    if (reason) {
      cells.push({ x: t.x, z: t.z, ok: false, reason });
      continue;
    }
    if (!swap) used++;
    for (const id of RESOURCE_IDS) {
      const c = def.buildCost[id] ?? 0;
      if (!c) continue;
      left[id] -= c;
      cost[id] = (cost[id] ?? 0) + c;
    }
    n++;
    cells.push({ x: t.x, z: t.z, ok: true });
  }
  return { cells, n, cost };
}

/**
 * Dựng `type` lên từng ô của dải `tiles` theo thứ tự (kéo thả trải đường, đắp tường). Ô nào không dựng được thì bỏ
 * qua, dựng tiếp ô sau; ô đã có đúng loại ấy thì không tính là hỏng. Trả các công trình đã dựng và lý do của ô hỏng
 * đầu tiên.
 */
export function placeLine(state: GameState, type: BuildingType, tiles: { x: number; z: number }[]): { placed: Building[]; reason: FailReason | null } {
  const placed: Building[] = [];
  let reason: FailReason | null = null;
  for (const c of planLine(state, type, tiles).cells) {
    if (c.has) continue;
    if (!c.ok) {
      reason ??= c.reason ?? null;
      continue;
    }
    const r = place(state, type, c.x, c.z);
    if (r.ok) placed.push(r.value);
    else reason ??= r.reason;
  }
  return { placed, reason };
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
      const o = id ? occupant(state, id) : undefined;
      if (o && isSolid(o.type)) return false;
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
  // Thử ở ngoài lưới: lý do tùy chỗ đặt (ngoài vùng, đồn biên phải ở bên kia sông) chưa nói gì; lý do khác thì chịu.
  if (!probe.ok && probe.reason !== 'ngoaiVung' && probe.reason !== 'phaiBenKia') return null;
  return roomFor(state, type, anchor, roomyOnly);
}

/**
 * Chỗ đặt `type` như `findSpot` nhưng chỉ xét chỗ (đất đã mở, không chồng công trình, bến sát sông), không xét giới
 * hạn, mốc mở hay giá: để đưa một công trình đã có (chưa nằm trong state) vào chỗ khác, như khi Điện nới móng.
 */
export function roomFor(
  state: GameState,
  type: BuildingType,
  anchor?: { x: number; z: number },
  roomyOnly = false,
): { x: number; z: number } | null {
  const def = BUILDINGS[type];
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
  if (!isRoad(b.type) && blocksBridge(state, x, z, def.w, def.d)) return 'chanLoiCau';
  // Điện ở bên này sông: giặc, trinh sát, tướng đều lấy Điện làm gốc phía kinh đô.
  if (b.type === 'dien' && !(isNearBank(x, z) && isNearBank(x + def.w - 1, z + def.d - 1))) return 'khongTheDoi';
  // Đồn biên dời đi vẫn phải ở bên kia sông, mỗi bờ một.
  if (b.type === 'donBien') {
    const bank = farBankOf(x, z);
    if (!bank || farBankOf(x + def.w - 1, z + def.d - 1) !== bank) return 'phaiBenKia';
    if (state.buildings.some((o) => o.id !== b.id && o.type === 'donBien' && farBankOf(o.x, o.z) === bank)) return 'datGioiHan';
  }
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
  if (b.type === 'bacThanh' && !stairWall(state, x, z, grid)) return 'phaiSatThanh';
  return null;
}

export function canMove(state: GameState, id: number, x: number, z: number): Result {
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  if (isBridge(b.type)) return fail('cauKhongDoi');
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
export function move(state: GameState, id: number, x: number, z: number, rot?: number): Result<Building> {
  const check = canMove(state, id, x, z);
  if (!check.ok) return check;
  const b = findBuilding(state, id)!;
  pay(state, moveCost(b));
  // Ruộng dời sang đất mới thì mất phù sa đã bồi.
  if (b.x !== x || b.z !== z) delete b.boi;
  b.x = x;
  b.z = z;
  if (rot !== undefined && canRotateType(b.type)) setRot(b, rot);
  levelFootprint(state, b, footprintTop(state, b.type, x, z));
  return ok(b);
}

// ---------- Xoay công trình ----------

/**
 * Loại công trình xoay được, mỗi nấc 90°: móng vuông nhiều ô, nên xoay không đổi ô nào bị chiếm, chỉ đổi hướng mặt
 * trước (và chỗ tướng đứng, ra trận ở doanh trại; ở Điện thì sân chầu, ngai vua, chỗ tướng chầu xoay theo). Bến, làng
 * chài luôn quay mặt ra sông;
 * cầu theo dòng sông; công trình một ô (lũy, đê, thành, cổng, chòi, đường, đồ trang trí nhỏ) không cần xoay.
 */
export function canRotateType(type: BuildingType): boolean {
  const def = BUILDINGS[type];
  return def.w === def.d && def.w > 1 && !def.nearRiver && !isBridge(type);
}

/** Hướng xoay của công trình: số nấc 90° (0–3). */
export const rotOf = (b: Pick<Building, 'rot'>): number => b.rot ?? 0;

function setRot(b: Building, rot: number): void {
  const r = ((Math.round(rot) % 4) + 4) % 4;
  if (r) b.rot = r;
  else delete b.rot;
}

/** Xoay công trình tại chỗ sang hướng `rot` (số nấc 90°). Không tốn của, lúc nào cũng xoay được. */
export function rotateBuilding(state: GameState, id: number, rot: number): Result<Building> {
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  if (!canRotateType(b.type)) return fail('khongXoayDuoc');
  setRot(b, rot);
  return ok(b);
}

// ---------- Đắp đất, đắp nền ----------

/**
 * Lũy, bẫy, đê, cống đê, thành, cổng thành là công trình một ô gắn với đất: muốn cao hơn thì đắp ô đất trước khi dựng.
 * Cầu vắt qua sông, hai đầu gác lên bờ: đắp nền thì chỉ nâng lòng sông dưới cầu, cầu lơ lửng khỏi bờ.
 */
const NO_RAISE: BuildingType[] = ['luy', 'bayChong', 'de', 'congDe', 'thanh', 'congThanh', 'bacThanh', 'cauSongDa', 'cauSongThao'];

export function canRaiseTile(state: GameState, x: number, z: number): Result<Cost> {
  if (!inChapter2(state)) return fail('canChuong2');
  if (!isOpen(state, x, z)) return fail('ngoaiVung');
  // Ô đường hay món trang trí một ô thì đắp đất ngay dưới nó được, nó nằm trên mặt đất mới.
  const on = buildingAt(state, x, z);
  if (on && !(isDecor(on.type) && BUILDINGS[on.type].w === 1)) return fail('datBiChiem');
  if (pendingAt(state, x, z)) return fail('datBiChiem');
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
  if (isBusy(state, id)) return fail('dangXay');
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
const ASSIGN_ORDER: BuildingType[] = ['ruong', 'ben', 'baiDa', 'loRen', 'xuongMoc', 'langChai', 'benKhoi'];

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
  // Vào chương 4: ít phút sau, thủy binh Triệu đội lốt cướp sông đi thuyền tới.
  if (state.questIndex === CH4_QUEST_START) scheduleThuyBinh(state);
  // Vào chương 5: ít phút sau, quân Hán kéo tới.
  if (state.questIndex === CH5_QUEST_START) scheduleHan(state);
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
  const add = (c: Cost) => {
    for (const r of RESOURCE_IDS) if (c[r]) total[r] = (total[r] ?? 0) + c[r]!;
  };
  for (const b of state.buildings) {
    if (b.damaged) add(repairCost(b));
    if (b.uNo === 'hu') add(uNoRepairCost());
  }
  return total;
}

/** Sửa mọi công trình hư hỏng còn đủ tiền sửa, ưu tiên theo thứ tự trong kinh đô; thành sửa xong thì sửa ụ nỏ trên đó. */
export function repairAll(state: GameState): number {
  let fixed = 0;
  for (const b of state.buildings) if (b.damaged && repair(state, b.id).ok) fixed++;
  for (const b of state.buildings) if (b.uNo === 'hu' && repairUNo(state, b.id).ok) fixed++;
  return fixed;
}

// ---------- Ụ nỏ trên thành Cổ Loa ----------

/** Số ụ nỏ đã dựng (kể cả ụ đang hư). */
export function uNoCount(state: GameState): number {
  return state.buildings.filter((b) => b.uNo).length;
}

/** Số ụ nỏ tối đa theo cấp Điện. */
export function uNoLimit(state: GameState): number {
  return U_NO.limit[dienLevel(state) - 1] ?? 0;
}

/** Dựng được ụ nỏ trên ô (x, z) không: phải là đoạn thành Cổ Loa còn nguyên, chưa có ụ, từ chương 4. */
export function canPlaceUNo(state: GameState, x: number, z: number): Result<Building> {
  if (!inChapter4(state)) return fail('canChuong4');
  const b = buildingAt(state, x, z);
  if (!b || b.type !== 'thanh') return fail('canThanh');
  if (b.uNo) return fail('daCoUNo');
  if (isBusy(state, b.id)) return fail('dangXay');
  if (b.damaged) return fail('canThanh');
  if (uNoCount(state) >= uNoLimit(state)) return fail('datGioiHan');
  if (!canAfford(state, U_NO.cost)) return fail('thieuTaiNguyen');
  return ok(b);
}

/** Dựng ụ nỏ lên đoạn thành ở ô (x, z). */
export function placeUNo(state: GameState, x: number, z: number): Result<Building> {
  const check = canPlaceUNo(state, x, z);
  if (!check.ok) return check;
  pay(state, U_NO.cost);
  check.value.uNo = 'ok';
  return check;
}

/** Giá sửa một ụ nỏ hư: một phần giá dựng, như mọi công trình. */
export function uNoRepairCost(): Cost {
  const cost: Cost = {};
  for (const r of RESOURCE_IDS) if (U_NO.cost[r]) cost[r] = Math.max(5, Math.round((U_NO.cost[r]! * REPAIR_FRACTION) / 5) * 5);
  return cost;
}

/** Sửa ụ nỏ hư trên đoạn thành `id`: phải sửa thành trước. */
export function repairUNo(state: GameState, id: number): Result<Building> {
  const b = findBuilding(state, id);
  if (!b || !b.uNo) return fail('khongCoUNo');
  if (b.uNo !== 'hu') return fail('khongHuHong');
  if (b.damaged) return fail('canThanh');
  if (state.raid.phase === 'battle') return fail('dangCoGiac');
  const cost = uNoRepairCost();
  if (!canAfford(state, cost)) return fail('thieuTaiNguyen');
  pay(state, cost);
  b.uNo = 'ok';
  return ok(b);
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

/** Hồ Kim Quy còn nguyên: tường thành thêm máu khi giặc đánh. */
export function hasKimQuy(state: GameState): boolean {
  return state.buildings.some((b) => b.type === 'hoKimQuy' && !b.damaged);
}

/**
 * Đoàn thuyền thủy binh Triệu hay thủy quân Hán đang từ biển kéo vào trong lúc trinh sát báo: chỗ mỗi thuyền sẽ hiện
 * ra khi trận mở, y như trận đặt (`big`: lâu thuyền). Không có đợt đi thuyền đang báo thì mảng rỗng.
 */
export function upcomingBoats(state: GameState): { x: number; z: number; big?: boolean }[] {
  const raid = state.raid;
  if (raid.phase !== 'warning') return [];
  if (raid.foe === 'thuyBinh') return plannedBoats(state, raid.wave + 1, raid.side, 'thuyBinh', raid.thuyBinh + 1, hasCuong(state));
  if (raid.foe === 'thuyHan') return plannedBoats(state, raid.wave + 1, raid.side, 'thuyHan', raid.thuyHan + 1, hasCuong(state));
  return [];
}

/** Đền Cuông còn nguyên: thủy binh Triệu (và thuyền chở lính của thủy quân Hán) tới ít thuyền hơn. */
export function hasCuong(state: GameState): boolean {
  return state.buildings.some((b) => b.type === 'denCuong' && !b.damaged);
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
 * đợt trước là giặc trên bộ thì đợt này là lũ. Chương 4: thủy binh Triệu và lũ xen nhau; từ khi lẫy nỏ thần
 * bị tráo thì ba đợt thay phiên: thủy binh → quân Triệu trên bộ → lũ. Chương 5: thủy binh và quân Triệu thôi tới,
 * quân Hán trên bộ và lũ xen nhau; từ khi Mã Viện sang thì ba đợt thay phiên: thủy quân Hán → quân Hán trên bộ → lũ.
 */
export function nextFoe(state: GameState): Foe {
  const raid = state.raid;
  if (raid.phase !== 'idle') return raid.foe;
  if (inChapter5(state)) {
    if (raid.foe === 'han') return 'thuy';
    if (raid.foe === 'thuy' && maVienCame(state)) return 'thuyHan';
    return 'han';
  }
  if (inChapter4(state)) {
    if (raid.foe === 'thuyBinh') return state.adv.layTrao ? 'trieu' : 'thuy';
    if (raid.foe === 'trieu' && state.adv.layTrao) return 'thuy';
    return 'thuyBinh';
  }
  if (!floodSeason(state)) return 'an';
  const land = landFoe(state);
  return land && raid.foe !== land ? land : 'thuy';
}

/**
 * Đợt giặc này thuộc chương nào, để chọn tướng ra trận. Quân Triệu ở chương 4 và thủy binh tính như trận chương 4:
 * An Dương Vương giữ kinh đô tới khi xuống biển, rồi Cao Lỗ. Quân Hán là trận chương 5.
 */
function foeChapter(state: GameState, foe: Foe): Chapter {
  if (foe === 'han' || foe === 'thuyHan') return 5;
  if (foe === 'thuyBinh' || (foe === 'trieu' && inChapter4(state))) return 4;
  return foe === 'an' ? 1 : foe === 'thuy' ? 2 : 3;
}

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
    // Phù sa: ruộng được bồi ở mùa lũ này giữ tới hết mùa lũ sau; ruộng khác mất phù sa đã có.
    const boi = settlePhuSa(state, battle.boi ?? []);
    if (boi) raid.lastResult.boi = boi;
    // Cầu bị lũ cuốn thì phải sửa, nhưng không tính là để mất mùa lũ.
    const lost = battle.drowned.filter((id) => {
      const b = findBuilding(state, id);
      return !b || !isBridge(b.type);
    });
    if (won && !lost.length) raid.floodsHeld += 1;
  }
  if (battle.foe === 'yeu') {
    raid.nights += 1;
    if (won) raid.nightsHeld += 1;
  }
  if (battle.foe === 'trieu') {
    raid.trieu += 1;
    if (won) raid.trieuHeld += 1;
  }
  if (battle.foe === 'thuyBinh') {
    raid.thuyBinh += 1;
    if (won) raid.thuyBinhHeld += 1;
  }
  if (battle.foe === 'han') {
    raid.han += 1;
    if (won) raid.hanHeld += 1;
  }
  if (battle.foe === 'thuyHan') {
    raid.thuyHan += 1;
    if (won) raid.thuyHanHeld += 1;
  }
  raid.lauSunk += battle.sunk ?? 0;
  restAfter(state, battle);
  raid.wave = battle.wave;
  raid.phase = 'idle';
  raid.battle = null;
  raid.nextAt = state.clock + RAID_EVERY_MS;
}

/**
 * Hết một mùa lũ: ruộng lúa, ruộng nếp có tên trong `ids` (được nước qua cống bồi trong trận) mà không hư thì có phù sa,
 * ruộng khác mất phù sa. Trả về số ruộng được bồi.
 */
function settlePhuSa(state: GameState, ids: number[]): number {
  let n = 0;
  for (const b of state.buildings) {
    if (!PHU_SA_TYPES.includes(b.type)) continue;
    if (ids.includes(b.id) && !b.damaged) {
      b.boi = true;
      n++;
    } else delete b.boi;
  }
  return n;
}

/** Đóng (`mo` false) hay mở cống đê. Lúc nào cũng được, kể cả giữa mùa lũ: nước sau cống theo đó mà vào hay rút. */
export function setCong(state: GameState, id: number, mo: boolean): Result<Building> {
  const b = findBuilding(state, id);
  if (!b || b.type !== 'congDe') return fail('khongTimThay');
  if (mo) b.mo = true;
  else delete b.mo;
  return ok(b);
}

/**
 * Xem trước mùa lũ tới (mực `nextFloodLevel`) với các cống như đang đóng mở: ô nào ngập, ruộng nào được bồi phù sa,
 * công trình nào sẽ hư nếu nước lên tới đỉnh (không tính thủy quái phá đê).
 */
export function phuSaPreview(state: GameState): FloodHits & { level: number } {
  const level = nextFloodLevel(state);
  return { ...floodHits(state, level), level };
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

/** Vào chương 4: đợt thủy binh đầu tới sau một lúc (không muộn hơn lịch sẵn có). */
export function scheduleThuyBinh(state: GameState): void {
  const raid = state.raid;
  if (raid.phase !== 'idle') return;
  raid.nextAt = Math.min(raid.nextAt ?? Infinity, state.clock + FIRST_THUY_BINH_MS);
  // Đợt tới phải là thủy binh: coi như đợt trước là lũ.
  raid.foe = 'thuy';
}

/** Vào chương 5: đợt quân Hán đầu tới sau một lúc (không muộn hơn lịch sẵn có). */
export function scheduleHan(state: GameState): void {
  const raid = state.raid;
  if (raid.phase !== 'idle') return;
  raid.nextAt = Math.min(raid.nextAt ?? Infinity, state.clock + FIRST_HAN_MS);
  // Đợt tới phải là quân Hán: coi như đợt trước là lũ.
  raid.foe = 'thuy';
}

/** Thắng màn 37 lần đầu (Mã Viện sang): đợt thủy quân Hán đầu tới sau một lúc (không muộn hơn lịch sẵn có). */
export function scheduleThuyHan(state: GameState): void {
  const raid = state.raid;
  if (raid.phase !== 'idle') return;
  raid.nextAt = Math.min(raid.nextAt ?? Infinity, state.clock + FIRST_HAN_MS);
  // Đợt tới phải là thủy quân Hán: coi như đợt trước là lũ.
  raid.foe = 'thuy';
}

/** Lịch giặc: báo trước, tràn vào, đánh, rồi hẹn đợt sau. Chỉ chạy theo đồng hồ chơi. */
function updateRaid(state: GameState, ms: number, busy = false): void {
  const raid = state.raid;
  if (raid.phase !== 'battle') raid.water = Math.max(0, raid.water - ms / 1000 / FLOOD_RECEDE_S);
  if (raid.nextAt === null) {
    if (countOf(state, 'doanhTrai') > 0) raid.nextAt = state.clock + FIRST_RAID_MS;
    return;
  }
  // Quân đang đánh phó bản (hay đang Đấu thành, `busy`) thì giặc chưa tới: đồng hồ giặc đứng lại.
  // Sang chương 2, bờ cõi yên bình tới khi Sơn Tinh rước Mị Nương làm Thủy Tinh nổi giận.
  if (raid.phase === 'idle' && (state.campaign.battle || busy || (inChapter2(state) && !floodSeason(state)))) {
    raid.nextAt += ms;
    return;
  }
  if (raid.phase === 'idle' && state.clock >= raid.nextAt) {
    raid.foe = nextFoe(state);
    raid.phase = 'warning';
    const roll = (raid.wave * 2654435761) % 7 < 4;
    // Lũ và thủy binh tới từ sông (phía nam hay đông), giặc trên bộ tới từ bìa rừng (phía bắc hay tây). Bờ bên kia đã
    // có công trình thì cứ ba đợt có một đợt tới bờ bên kia (`farRaidBank`): giặc trên bộ ra từ bìa rừng bên ấy, thủy
    // binh cập bờ ấy. Lũ vẫn từ sông.
    const byBoat = raid.foe === 'thuyBinh' || raid.foe === 'thuyHan';
    const far = byBoat ? farRaidBank(state, raid.wave) : null;
    raid.side =
      raid.foe === 'thuy'
        ? roll ? 'nam' : 'dong'
        : byBoat
          ? far ? (far === 'nam' ? 'namXa' : 'dongXa') : roll ? 'nam' : 'dong'
          : landRaidSide(state, raid.wave, roll);
    // Đồn đảo giữ biển đốt lửa hiệu: thủy quân Hán được báo sớm.
    raid.startsAt = state.clock + (raid.foe === 'thuyHan' && luaHieu(state) ? DON_DAO.baoSom : RAID_WARNING_MS);
  }
  if (raid.phase === 'warning' && state.clock >= raid.startsAt) {
    raid.phase = 'battle';
    const foe = raid.foe;
    // Chương 5: Hai Bà cùng ra trận (bà nào kiệt sức thì bà kia ra một mình).
    const [hero = null, hero2 = null] = heroesFor(state, foeChapter(state, foe));
    raid.battle = startBattle(state, raid.wave + 1, raid.side, {
      // Lẫy nỏ thần đã bị tráo: giữ kinh đô thì An Dương Vương không còn Nỏ thần.
      hero: hero?.kind === 'anDuong' && state.adv.layTrao ? { ...hero, layTrao: true } : hero,
      hero2,
      bonus: troopBonus(state),
      flood: foe === 'thuy' ? { n: raid.floods + 1, level: nextFloodLevel(state) } : null,
      land:
        foe === 'yeu'
          ? { foe, n: raid.nights + 1 }
          : foe === 'trieu'
            ? { foe, n: raid.trieu + 1 }
            : foe === 'thuyBinh'
              ? { foe, n: raid.thuyBinh + 1 }
              : foe === 'han'
                ? { foe, n: raid.han + 1 }
                : foe === 'thuyHan'
                  ? { foe, n: raid.thuyHan + 1 }
                  : null,
      crossbows: hasCoLoa(state),
      walls: hasKimQuy(state),
      fewerBoats: hasCuong(state),
      chan: foe === 'thuyHan' ? chanThuyen(state) : 0,
      arms: state.arms,
      huan: huanTiers(state),
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

/**
 * Ba lời mời đổi hàng, lặp lại được theo số chuyến và cấp Điện; `go`: kinh đô đã có xưởng mộc thì thêm lời mời thứ tư
 * về gỗ.
 */
export function makeOffers(seq: number, level: number, go = false): Offer[] {
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
  const offer = (give: ResourceId, get: ResourceId) => {
    const giveN = round5((40 * level * (0.8 + rand() * 0.5)) / TRADE_VALUE[give]);
    const getN = round5(((giveN * TRADE_VALUE[give]) / TRADE_VALUE[get]) * TRADE_BONUS);
    offers.push({ give: { r: give, n: giveN }, get: { r: get, n: getN }, taken: false });
  };
  for (let i = 0; i < 3; i++) {
    const give = pool[Math.floor(rand() * pool.length)];
    let get = pool[Math.floor(rand() * pool.length)];
    if (get === give) get = pool[(pool.indexOf(give) + 1) % pool.length];
    offer(give, get);
  }
  // Kinh đô có xưởng mộc: thêm một lời mời thứ tư, mua gỗ hay bán gỗ đổi lấy một thứ khác. Ba lời mời trên giữ nguyên.
  if (go) {
    const other = pool[Math.floor(rand() * pool.length)];
    if (rand() < 0.5) offer('go', other);
    else offer(other, 'go');
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
      m.visit = { leavesAt: state.clock + MERCHANT_STAY_MS, offers: makeOffers(m.seq, dienLevel(state), countOf(state, 'xuongMoc') > 0) };
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
  const gained: Resources = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
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

/**
 * Thời gian trôi khi đang mở game: sản xuất, đồng hồ chơi chạy, thuyền buôn đến đi. `busy`: quân đang đi Đấu thành
 * (trận không nằm trong state), đồng hồ giặc đứng lại như khi đang đánh phó bản.
 */
export function tick(state: GameState, ms: number, busy = false): Resources {
  if (ms <= 0) return { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
  const gained = produce(state, ms, 1);
  state.clock += ms;
  // Thợ xây sau phần sản xuất của khung này: công trình xong từ khung sau mới làm ra (sổ thu chi `kinhTe.ts` khớp).
  advanceXay(state, ms);
  advanceDao(state, ms, busy);
  updateMerchant(state);
  updateCampaign(state, ms);
  updateRaid(state, ms, busy);
  updateTet(state);
  updateCayDa(state);
  updateBenKia(state);
  return gained;
}

/**
 * Tính phần vắng mặt, từ lastSeen tới now. Đồng hồ chơi không chạy. Kinh đô sản xuất `OFFLINE_RATE` tốc độ trong
 * `OFFLINE_CAP_MS` đầu; thợ xây tiếp đủ tốc độ suốt quãng vắng, không giới hạn. Quãng vắng chia khúc theo lúc từng
 * phần việc xong, để công trình xong giữa chừng làm ra từ lúc xong. Trả số ms đã tính sản xuất, của làm ra và số phần
 * việc xây đã xong.
 */
export function applyOffline(state: GameState, now: number): { ms: number; gained: Resources; built: number } {
  const away = Math.max(now - state.lastSeen, 0);
  const cap = Math.min(away, OFFLINE_CAP_MS);
  const gained: Resources = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
  const seq = state.xay.seq;
  let t = 0;
  // Mỗi vòng xong ít nhất một phần việc; chặn trên cho chắc.
  for (let guard = 0; t < away && guard < 100_000; guard++) {
    const dt = Math.min(away - t, nextXayEvent(state));
    const prod = Math.max(0, Math.min(t + dt, cap) - t);
    if (prod > 0) {
      const g = produce(state, prod, OFFLINE_RATE);
      for (const r of RESOURCE_IDS) gained[r] += g[r];
    }
    advanceXay(state, dt);
    t += dt;
  }
  // Thuyền chiến chạy tiếp suốt quãng vắng, đủ chuyến.
  advanceDao(state, away);
  state.lastSeen = now;
  return { ms: cap, gained, built: state.xay.seq - seq };
}
