// Vùng đất bên kia sông: bờ nam sông Đà và bờ đông sông Thao, mỗi bờ 10 khoảnh dọc sông × 3 khoảnh vào trong
// (khoảnh 5×5 ô). Bắc cầu qua sông thì khoảnh đầu cầu bên kia được dò và mở; sai trinh sát dò dần từng khoảnh, thấy
// điểm lạ (đồn giặc, bản làng, đặc sản đất, của chôn) cố định, mọi máy như nhau. Đất bên kia không mua bằng của:
// mỗi khoảnh thuộc vùng của một đồn giặc, dẹp đồn thì cả vùng về tay ta. Không phụ thuộc DOM hay Three.js.

import { startFieldBattle, type Battle } from './battle';
import { inChapter3 } from './coLoa';
import { inChapter4 } from './chuong4';
import {
  BEN_KIA_DIEN,
  BUILDINGS,
  DAC_SAN_BONUS,
  RESOURCE_IDS,
  TREASURE_SHARE,
  VILLAGE_GIFT,
  VILLAGE_SHARE,
  SCOUT_COST,
  SCOUT_MS,
  SCOUT_TWO_DIEN,
  UNIT_TYPES,
  isBridge,
  type BuildingType,
  type Chapter,
  type Cost,
  type Resources,
  type EnemyType,
  type Row,
  type Terrain,
  type UnitType,
} from './defs';
import { armySpace, fieldCap } from './doanhTrai';
import { canAfford, countOf, dienLevel, gain, pay, troopBonus, type Building, type FailReason, type GameState, type Result } from './game';
import { heroFor, inChapter2, restAfter } from './son';
import { huanTiers } from './thuThach';
import { openMask } from './khoanh';
import { FAR_FOREST, FOREST_BAND, GRID, KHOANH, RIVER_END, RIVER_START } from './map';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

export type Bank = 'nam' | 'dong';
export const BANKS: readonly Bank[] = ['nam', 'dong'];
/** Mỗi bờ có chừng này khoảnh dọc sông và chừng này khoảnh từ bờ sông vào tới dải rừng ngoài cùng. */
export const FAR_ALONG = 10;
export const FAR_DEEP = 3;
const PER_BANK = FAR_ALONG * FAR_DEEP;
export const FAR_PLOTS = 2 * PER_BANK;

/** Một khoảnh bên kia: bờ nào, thứ mấy dọc sông (`i`, từ tây hay từ bắc), hàng mấy tính từ bờ sông (`j`). */
export interface Plot {
  bank: Bank;
  i: number;
  j: number;
}

export const plotId = (bank: Bank, i: number, j: number): number => (bank === 'nam' ? 0 : PER_BANK) + j * FAR_ALONG + i;

export function plotOf(id: number): Plot {
  const bank: Bank = id < PER_BANK ? 'nam' : 'dong';
  const k = id % PER_BANK;
  return { bank, i: k % FAR_ALONG, j: Math.floor(k / FAR_ALONG) };
}

export const validPlot = (id: number): boolean => Number.isInteger(id) && id >= 0 && id < FAR_PLOTS;

/** Góc khoảnh (ô nhỏ nhất theo x và z). Bờ nam: dọc theo x, vào trong theo z; bờ đông thì ngược lại. */
export function plotOrigin(id: number): { x: number; z: number } {
  const { bank, i, j } = plotOf(id);
  const along = FOREST_BAND + KHOANH * i;
  const deep = RIVER_END + KHOANH * j;
  return bank === 'nam' ? { x: along, z: deep } : { x: deep, z: along };
}

/** Khoảnh bên kia chứa ô (x, z), hay null nếu ô không thuộc khoảnh nào bên kia (bên này, sông, rừng ngoài cùng). */
export function plotAt(x: number, z: number): number | null {
  if (z >= RIVER_END && z < FAR_FOREST && x >= FOREST_BAND && x < RIVER_START) {
    return plotId('nam', Math.floor((x - FOREST_BAND) / KHOANH), Math.floor((z - RIVER_END) / KHOANH));
  }
  if (x >= RIVER_END && x < FAR_FOREST && z >= FOREST_BAND && z < RIVER_START) {
    return plotId('dong', Math.floor((z - FOREST_BAND) / KHOANH), Math.floor((x - RIVER_END) / KHOANH));
  }
  return null;
}

/** Các khoảnh kề cạnh (4 hướng) cùng bờ. */
export function plotNeighbors(id: number): number[] {
  const { bank, i, j } = plotOf(id);
  const out: number[] = [];
  for (const [di, dj] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const ni = i + di;
    const nj = j + dj;
    if (ni >= 0 && ni < FAR_ALONG && nj >= 0 && nj < FAR_DEEP) out.push(plotId(bank, ni, nj));
  }
  return out;
}

// ---------- Điểm lạ ----------

/** Nghề của bản làng: trồng lúa (gạo), mò ốc (vỏ ốc), thợ đá (đất đá), thợ rèn (sắt). */
export type Nghe = 'lua' | 'oc' | 'da' | 'ren';
export type Dat = 'phuSa' | 'nuiDa' | 'moSat';
export type Tier = 1 | 2 | 3 | 4;

/** Điểm lạ trên một khoảnh bên kia: đồn giặc (bậc theo chương), bản làng (theo nghề), đặc sản đất, của chôn. */
export type Poi = { kind: 'don'; tier: Tier } | { kind: 'lang'; nghe: Nghe } | { kind: 'dacSan'; dat: Dat } | { kind: 'cua' };

/**
 * Sáu đồn mỗi bờ (`i`, `j` như `Plot`), hai bờ chung khung đồn: bậc 1 sát sông, bậc 2 hàng giữa, bậc 3–4 sát rừng.
 * Ngã ba sông (gần kinh đô) ở phía `i` = 9.
 */
const CAMP_SPOTS: [number, number, Tier][] = [
  [3, 0, 1],
  [8, 0, 1],
  [1, 1, 2],
  [5, 1, 2],
  [7, 2, 3],
  [3, 2, 4],
];

/**
 * Vùng của từng đồn (chỉ số trong `CAMP_SPOTS`), theo hàng `j` rồi khoảnh `i`. Mỗi khoảnh thuộc vùng một đồn; dẹp đồn
 * thì cả vùng về tay ta. Vùng đồn bậc 1 gần ngã ba có một đặc sản và một của chôn, khai phá được từ chương 1; làng
 * và đặc sản khác nằm trong vùng đồn bậc 2–4 (`benKia.test.ts` canh).
 */
const REGION: number[][] = [
  // j = 0 (sát sông)
  [2, 2, 0, 0, 0, 3, 1, 1, 1, 1],
  // j = 1
  [2, 2, 2, 0, 3, 3, 3, 4, 1, 1],
  // j = 2 (sát rừng)
  [2, 2, 5, 5, 5, 3, 4, 4, 4, 1],
];

const LAYOUT: Record<Bank, [number, number, Poi][]> = {
  nam: [
    [4, 1, { kind: 'lang', nghe: 'lua' }],
    [0, 0, { kind: 'lang', nghe: 'oc' }],
    [8, 1, { kind: 'dacSan', dat: 'phuSa' }],
    [0, 1, { kind: 'dacSan', dat: 'phuSa' }],
    [6, 2, { kind: 'dacSan', dat: 'nuiDa' }],
    [9, 2, { kind: 'cua' }],
    [2, 2, { kind: 'cua' }],
  ],
  dong: [
    [4, 1, { kind: 'lang', nghe: 'da' }],
    [0, 0, { kind: 'lang', nghe: 'ren' }],
    [8, 1, { kind: 'dacSan', dat: 'nuiDa' }],
    [0, 1, { kind: 'dacSan', dat: 'moSat' }],
    [6, 2, { kind: 'dacSan', dat: 'moSat' }],
    [9, 2, { kind: 'cua' }],
    [2, 2, { kind: 'cua' }],
  ],
};

const POIS = new Map<number, Poi>();
for (const bank of BANKS) {
  for (const [i, j, tier] of CAMP_SPOTS) POIS.set(plotId(bank, i, j), { kind: 'don', tier });
  for (const [i, j, poi] of LAYOUT[bank]) POIS.set(plotId(bank, i, j), poi);
}

/** Điểm lạ trên khoảnh `id` (có hay không, chưa xét đã dò chưa). */
export const poiAt = (id: number): Poi | undefined => POIS.get(id);

/** Mọi khoảnh có điểm lạ. */
export const poiPlots = (): number[] => [...POIS.keys()];

/** Khoảnh có đồn giặc giữ vùng của khoảnh `id`. */
export function campOf(id: number): number {
  const { bank, i, j } = plotOf(id);
  const [ci, cj] = CAMP_SPOTS[REGION[j][i]];
  return plotId(bank, ci, cj);
}

/** Các khoảnh trong vùng của đồn đóng ở khoảnh `camp`. */
export function regionOf(camp: number): number[] {
  const { bank } = plotOf(camp);
  const out: number[] = [];
  for (let k = 0; k < PER_BANK; k++) {
    const id = plotId(bank, 0, 0) + k;
    if (campOf(id) === camp) out.push(id);
  }
  return out;
}

// ---------- Trạng thái ----------

export interface BenKiaState {
  /** Khoảnh bên kia đã dò: thấy địa hình và điểm lạ. */
  known: number[];
  /** Khoảnh bên kia đã mở: xây được. */
  open: number[];
  /** Trinh sát đang đi: dò khoảnh nào, lúc đi và lúc tới (đồng hồ chơi). */
  scouts: { plot: number; from: number; at: number }[];
  /** Đồn giặc đã dẹp (khoảnh). */
  cleared: number[];
  /** Bản làng đã về theo (khoảnh). */
  villages: number[];
  /** Của chôn đã đào (khoảnh). */
  dug: number[];
}

export function initialBenKia(): BenKiaState {
  return { known: [], open: [], scouts: [], cleared: [], villages: [], dug: [] };
}

/** Khoảnh `id` còn đồn giặc chưa dẹp. */
export function hasCamp(state: GameState, id: number): boolean {
  return poiAt(id)?.kind === 'don' && !state.benKia.cleared.includes(id);
}

/** Khoảnh `id` còn thuộc vùng một đồn giặc chưa dẹp (chưa về tay ta). */
export function plotHeld(state: GameState, id: number): boolean {
  return !state.benKia.cleared.includes(campOf(id));
}

export const plotKnown = (state: GameState, id: number): boolean => state.benKia.known.includes(id);
export const plotOpen = (state: GameState, id: number): boolean => state.benKia.open.includes(id);

/**
 * Thêm các khoảnh vào danh sách đã dò (và đã mở, nếu `open`). Thay mảng mới để mặt nạ đất đã mở tính lại. Khoảnh vừa
 * mở có của chôn thì đào luôn; trả về của đào được.
 */
export function revealPlots(state: GameState, ids: number[], open = false): Cost {
  const k = state.benKia;
  const known = ids.filter((id) => !k.known.includes(id));
  if (known.length) k.known = [...k.known, ...known].sort((a, b) => a - b);
  if (!open) return {};
  const fresh = ids.filter((id) => !k.open.includes(id));
  if (fresh.length) k.open = [...k.open, ...fresh].sort((a, b) => a - b);
  const dug: Cost = {};
  for (const id of fresh) {
    const got = digTreasure(state, id);
    for (const r of RESOURCE_IDS) if (got[r]) dug[r] = (dug[r] ?? 0) + got[r]!;
  }
  return dug;
}

/** Ô (x, z) thuộc giữa bản làng (3×3 ô giữa khoảnh có làng): nhà làng đứng đó, không dựng công trình được. */
export function villageCore(x: number, z: number): boolean {
  const id = plotAt(x, z);
  if (id === null || poiAt(id)?.kind !== 'lang') return false;
  const o = plotOrigin(id);
  return x > o.x && x < o.x + 4 && z > o.z && z < o.z + 4;
}

// ---------- Cầu ----------

export type BridgeType = 'cauSongDa' | 'cauSongThao';

/** Cầu bắc sang bờ nào: cầu qua sông Đà sang bờ nam, cầu qua sông Thao sang bờ đông. */
export const bridgeBank = (type: BridgeType): Bank => (type === 'cauSongDa' ? 'nam' : 'dong');
export const bankBridge = (bank: Bank): BridgeType => (bank === 'nam' ? 'cauSongDa' : 'cauSongThao');

/** Cầu đang có sang bờ `bank` (còn nguyên hay hư). */
export function bridgeTo(state: GameState, bank: Bank): Building | undefined {
  const type = bankBridge(bank);
  return state.buildings.find((b) => b.type === type);
}

/** Có cầu còn nguyên sang bờ `bank`. */
export function bridgeUp(state: GameState, bank: Bank): boolean {
  const b = bridgeTo(state, bank);
  return !!b && !b.damaged;
}

/** Hai đầu cầu: các ô đất bên này và bên kia mà cầu (đặt ở góc x, z) chạm vào. */
export function bridgeEnds(type: BridgeType, x: number, z: number): { near: [number, number][]; far: [number, number][] } {
  const def = BUILDINGS[type];
  if (type === 'cauSongDa') {
    const xs = Array.from({ length: def.w }, (_, k) => x + k);
    return { near: xs.map((tx) => [tx, z - 1]), far: xs.map((tx) => [tx, z + def.d]) };
  }
  const zs = Array.from({ length: def.d }, (_, k) => z + k);
  return { near: zs.map((tz) => [x - 1, tz]), far: zs.map((tz) => [x + def.w, tz]) };
}

/** Các khoảnh bên kia mà đầu cầu chạm vào (một hay hai khoảnh). */
export function bridgeheadPlots(type: BridgeType, x: number, z: number): number[] {
  const ids = bridgeEnds(type, x, z)
    .far.map(([tx, tz]) => plotAt(tx, tz))
    .filter((id): id is number => id !== null);
  return [...new Set(ids)];
}

/** Chỗ đặt cầu gần ô (x, z) nhất: cầu bám theo sông, chỉ dịch dọc sông. */
export function bridgeSnap(type: BridgeType, x: number, z: number): { x: number; z: number } {
  const def = BUILDINGS[type];
  const clamp = (v: number, span: number) => Math.min(Math.max(Math.round(v), FOREST_BAND), RIVER_START - span);
  return type === 'cauSongDa' ? { x: clamp(x, def.w), z: RIVER_START } : { x: RIVER_START, z: clamp(z, def.d) };
}

/**
 * Chỗ đặt cầu: vắt qua đúng 7 ô sông (cầu sông Đà nằm trên sông Đà, cầu sông Thao trên sông Thao), đầu bên này trên
 * đất đã khai phá, đầu bên kia trên một khoảnh bên kia, không bắc thẳng vào khoảnh có đồn giặc. Trả về lý do không
 * đặt được, hay null.
 */
export function bridgeFit(state: GameState, type: BridgeType, x: number, z: number): FailReason | null {
  const def = BUILDINGS[type];
  const across = type === 'cauSongDa' ? z : x;
  const along = type === 'cauSongDa' ? x : z;
  const span = type === 'cauSongDa' ? def.w : def.d;
  if (across !== RIVER_START || along < FOREST_BAND || along + span > RIVER_START) return 'ngoaiVung';
  const mask = openMask(state);
  const ends = bridgeEnds(type, x, z);
  if (!ends.near.every(([tx, tz]) => mask[tz * GRID + tx] === 1)) return 'ngoaiVung';
  const plots = ends.far.map(([tx, tz]) => plotAt(tx, tz));
  if (plots.some((id) => id === null)) return 'ngoaiVung';
  if (plots.some((id) => hasCamp(state, id!))) return 'dauCauCoDon';
  return null;
}

/** Vừa bắc cầu: khoảnh đầu cầu bên kia được dò và mở luôn, làm chỗ đặt chân. */
export function openBridgehead(state: GameState, b: Building): void {
  if (!isBridge(b.type)) return;
  revealPlots(state, bridgeheadPlots(b.type, b.x, b.z), true);
}

/** Ô (x, z) thuộc đầu cầu (bên này hay bên kia) của một cầu đang có. Mẫu kinh đô chừa các ô này cho lối lên cầu. */
export function bridgeheadCells(state: GameState): Set<number> {
  const cells = new Set<number>();
  for (const b of state.buildings) {
    if (!isBridge(b.type)) continue;
    const ends = bridgeEnds(b.type, b.x, b.z);
    for (const [tx, tz] of [...ends.near, ...ends.far]) cells.add(tz * GRID + tx);
  }
  return cells;
}

// ---------- Trinh sát ----------

/** Đã tới lúc lo chuyện bên kia sông: Điện cấp 4 (đoạn truyện "Bên kia sông"). */
export const benKiaOpen = (state: GameState): boolean => dienLevel(state) >= BEN_KIA_DIEN;

/** Số trinh sát được đi cùng lúc. */
export function scoutLimit(state: GameState): number {
  return dienLevel(state) >= SCOUT_TWO_DIEN ? 2 : 1;
}

/** Sai trinh sát dò khoảnh `id` được không: chưa dò, sát vùng đã dò cùng bờ, có cầu còn nguyên sang bờ ấy. */
export function canScout(state: GameState, id: number): Result {
  if (!validPlot(id)) return fail('khongTimThay');
  if (!benKiaOpen(state)) return fail('chuaDuCapDien');
  const k = state.benKia;
  if (k.known.includes(id)) return fail('daDo');
  if (k.scouts.some((s) => s.plot === id)) return fail('dangDo');
  const bridge = bridgeTo(state, plotOf(id).bank);
  if (!bridge) return fail('canCau');
  if (bridge.damaged) return fail('cauHu');
  if (!plotNeighbors(id).some((n) => k.known.includes(n))) return fail('xaQua');
  if (k.scouts.length >= scoutLimit(state)) return fail('trinhSatBan');
  if (!canAfford(state, SCOUT_COST)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

export function sendScout(state: GameState, id: number): Result {
  const check = canScout(state, id);
  if (!check.ok) return check;
  pay(state, SCOUT_COST);
  state.benKia.scouts = [...state.benKia.scouts, { plot: id, from: state.clock, at: state.clock + SCOUT_MS }];
  return ok(undefined);
}

/** Trinh sát đã tới nơi: khoảnh ấy và các khoảnh kề cạnh hiện ra. Gọi mỗi lần đồng hồ chơi chạy; trả về số trinh sát vừa về. */
export function updateBenKia(state: GameState): number {
  const k = state.benKia;
  if (!k.scouts.length) return 0;
  const back = k.scouts.filter((s) => s.at <= state.clock);
  if (!back.length) return 0;
  k.scouts = k.scouts.filter((s) => s.at > state.clock);
  for (const s of back) revealPlots(state, [s.plot, ...plotNeighbors(s.plot)]);
  return back.length;
}

/** Bản lưu hợp lệ: khoảnh đúng chỉ số, không trùng; trinh sát đúng dạng. */
export function isBenKiaState(v: unknown): v is BenKiaState {
  if (!v || typeof v !== 'object') return false;
  const k = v as Record<string, unknown>;
  const isPlots = (list: unknown) => Array.isArray(list) && list.every(validPlot) && new Set(list).size === list.length;
  if (!isPlots(k.known) || !isPlots(k.open) || !isPlots(k.cleared) || !isPlots(k.villages) || !isPlots(k.dug) || !Array.isArray(k.scouts)) return false;
  const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
  return k.scouts.every((t: unknown) => !!t && typeof t === 'object' && validPlot((t as Record<string, unknown>).plot as number) && num((t as Record<string, unknown>).from) && num((t as Record<string, unknown>).at));
}

// ---------- Đồn giặc và điều quân ----------

/**
 * Đồn giặc theo bậc: quân giặc, máu (như màn phó bản), nền bãi chiến, thưởng lần đầu (và duy nhất: đồn dẹp rồi là
 * hết), tướng như trận của chương nào. Máu đo bằng test theo Chuẩn cân bằng phó bản (`benKia.test.ts`).
 */
export interface CampDef {
  enemies: Partial<Record<EnemyType, number>>;
  hpScale: number;
  terrain: Terrain;
  reward: Cost;
  /** Tướng ra trận như trận của chương này (`heroFor`). */
  chapter: Chapter;
}

export const CAMPS: Record<Tier, CampDef> = {
  1: { enemies: { giaoAn: 7, cungAn: 4, chienXa: 2 }, hpScale: 1.9, terrain: 'benKia', reward: { gao: 400, voOc: 300, datDa: 250, sat: 60 }, chapter: 1 },
  2: { enemies: { tomBinh: 11, caPhun: 7, caSau: 3 }, hpScale: 2.95, terrain: 'benKia', reward: { gao: 1300, voOc: 900, datDa: 700, sat: 180 }, chapter: 2 },
  3: { enemies: { quyNui: 12, maTroi: 7, hoTinh: 3 }, hpScale: 3.05, terrain: 'thatDieu', reward: { gao: 2400, voOc: 1700, datDa: 1500, sat: 400 }, chapter: 3 },
  4: { enemies: { linhTrieu: 14, noTrieu: 8, kyBinh: 4 }, hpScale: 2.6, terrain: 'benKia', reward: { gao: 4200, voOc: 3500, datDa: 3100, sat: 800 }, chapter: 4 },
};

/** Quân mẫu đánh đồn bậc 1 ở Điện cấp 4 (vừa số chỗ một trận ở Điện 4). Bậc 2–4 dùng quân mẫu chương 2, 3, 4 (38 chỗ). */
export const CAMP1_ARMY: Record<UnitType, number> = { giao: 10, cung: 6, voi: 3, no: 0 };

/** Bậc của đồn ở khoảnh `id` (không có đồn thì null). */
export function campTier(id: number): Tier | null {
  const poi = poiAt(id);
  return poi?.kind === 'don' ? poi.tier : null;
}

/** Đã tới chương đánh được đồn bậc `tier` chưa: bậc 1 cần Điện cấp 4, bậc 2, 3, 4 cần vào chương 2, 3, 4. */
export function tierOpen(state: GameState, tier: Tier): boolean {
  if (tier === 1) return dienLevel(state) >= BEN_KIA_DIEN;
  if (tier === 2) return inChapter2(state);
  if (tier === 3) return inChapter3(state);
  return inChapter4(state);
}

/** Tướng ra trận đánh đồn ở khoảnh `id`: như trận của chương ứng với bậc đồn. */
export function campHero(state: GameState, id: number) {
  const tier = campTier(id);
  return tier ? heroFor(state, CAMPS[tier].chapter) : null;
}

/** Đánh được đồn ở khoảnh `id` chưa, chưa tính quân mang theo. */
export function canStartCamp(state: GameState, id: number): Result {
  const tier = campTier(id);
  if (tier === null || !state.benKia.known.includes(id)) return fail('khongTimThay');
  if (!hasCamp(state, id)) return fail('donDaDep');
  if (!tierOpen(state, tier)) return fail(tier === 1 ? 'chuaDuCapDien' : tier === 2 ? 'canChuong2' : tier === 3 ? 'canChuong3' : 'canChuong4');
  if (countOf(state, 'doanhTrai') === 0) return fail('canDoanhTrai');
  const bridge = bridgeTo(state, plotOf(id).bank);
  if (!bridge) return fail('canCau');
  if (bridge.damaged) return fail('cauHu');
  if (state.raid.phase !== 'idle') return fail('dangCoGiac');
  if (state.campaign.battle) return fail('dangDanhPhoBan');
  return ok(undefined);
}

/** Điều quân đánh đồn ở khoảnh `id` với số lính `army`, đứng theo hàng `rows`: trận ngoài bãi như phó bản. */
export function startCamp(state: GameState, id: number, army: Record<UnitType, number>, rows: Record<UnitType, Row>): Result {
  const check = canStartCamp(state, id);
  if (!check.ok) return check;
  if (UNIT_TYPES.some((k) => (army[k] ?? 0) < 0 || (army[k] ?? 0) > state.troops[k])) return fail('khongDuQuan');
  if (armySpace(army) > fieldCap(state)) return fail('quaChoPhoBan');
  const def = CAMPS[campTier(id)!];
  const hero = campHero(state, id);
  if (!hero && UNIT_TYPES.every((k) => !army[k])) return fail('chuaChonQuan');
  state.campaign.rows = { ...rows };
  state.campaign.lastResult = null;
  state.campaign.battle = startFieldBattle({
    id: state.nextBattleId++,
    stage: 0,
    camp: id,
    enemies: def.enemies,
    hpScale: def.hpScale,
    army: { ...army },
    rows: { ...rows },
    hero,
    bonus: troopBonus(state),
    arms: state.arms,
    huan: huanTiers(state),
  });
  return ok(undefined);
}

/**
 * Trận đánh đồn vừa xong: trừ lính tử trận; thắng thì dẹp đồn, nhận thưởng, cả vùng của đồn về tay ta (dò và mở
 * luôn). Thắng đồn không tính là thắng màn phó bản. Trận vẫn giữ để vẽ cảnh cuối.
 */
export function finishCamp(state: GameState, battle: Battle): void {
  const id = battle.camp!;
  const outcome = battle.outcome ?? 'lose';
  for (const k of UNIT_TYPES) state.troops[k] = Math.max(0, state.troops[k] - battle.lost[k]);
  const won = outcome === 'win' && hasCamp(state, id);
  const reward = won ? { ...CAMPS[campTier(id)!].reward } : {};
  if (won) {
    gain(state, reward);
    state.benKia.cleared = [...state.benKia.cleared, id].sort((a, b) => a - b);
    // Vùng vừa chiếm có của chôn thì đào luôn, ghi chung vào phần thưởng.
    const dug = revealPlots(state, regionOf(id), true);
    for (const r of RESOURCE_IDS) if (dug[r]) reward[r] = (reward[r] ?? 0) + dug[r]!;
  }
  restAfter(state, battle);
  state.campaign.lastResult = {
    stage: 0,
    camp: id,
    outcome,
    first: won,
    killed: battle.killed,
    total: battle.total,
    lost: { ...battle.lost },
    reward,
  };
}

// ---------- Của chôn ----------

/** Giá nâng Điện lên cấp kế tiếp (Điện đã tối đa thì giá lên cấp cao nhất): mốc tính của chôn. */
function dienStepCost(state: GameState): Cost {
  const up = BUILDINGS.dien.upgradeCost;
  return up[Math.min(dienLevel(state) + 1, up.length - 1)] ?? {};
}

/** Của chôn đào được ở cấp Điện hiện tại: `TREASURE_SHARE` giá nâng Điện kế tiếp, làm tròn 10. */
export function treasureReward(state: GameState): Cost {
  const base = dienStepCost(state);
  const reward: Cost = {};
  for (const r of RESOURCE_IDS) if (base[r]) reward[r] = Math.round((base[r]! * TREASURE_SHARE) / 10) * 10;
  return reward;
}

/** Của chôn trên khoảnh vừa mở: đào được một lần (không vượt sức chứa kho). Trả về phần đã định thưởng. */
function digTreasure(state: GameState, id: number): Cost {
  const k = state.benKia;
  if (poiAt(id)?.kind !== 'cua' || k.dug.includes(id)) return {};
  const reward = treasureReward(state);
  gain(state, reward);
  k.dug = [...k.dug, id].sort((a, b) => a - b);
  return reward;
}

// ---------- Đặc sản đất, cầu hư ----------

/** Đặc sản hợp nghề với loại công trình nào. */
const DAT_FOR: Record<Dat, BuildingType[]> = { phuSa: ['ruong', 'ruongNep'], nuiDa: ['baiDa'], moSat: ['loRen'] };

/** Đặc sản đất dưới công trình `b`: móng nằm trọn trong một khoảnh đặc sản hợp nghề. */
export function dacSanOf(b: Pick<Building, 'type' | 'x' | 'z'>): Dat | null {
  const def = BUILDINGS[b.type];
  const id = plotAt(b.x, b.z);
  if (id === null || plotAt(b.x + def.w - 1, b.z + def.d - 1) !== id) return null;
  const poi = poiAt(id);
  return poi?.kind === 'dacSan' && DAT_FOR[poi.dat].includes(b.type) ? poi.dat : null;
}

/** Công trình `b` ở bên kia sông mà cầu sang bờ ấy hư hay chưa có: dân bên này không sang làm được. */
export function cutOff(state: GameState, b: Pick<Building, 'x' | 'z'>): boolean {
  const id = plotAt(b.x, b.z);
  if (id === null) return false;
  return !bridgeUp(state, plotOf(id).bank);
}

/**
 * Hệ số sản lượng của công trình `b` theo đất bên kia: 0 khi cầu sang bờ ấy hư (không ai sang làm), thêm phần đặc sản
 * khi móng nằm trọn trên đất đặc sản hợp nghề, còn lại 1.
 */
export function farFactor(state: GameState, b: Building): number {
  if (plotAt(b.x, b.z) === null) return 1;
  if (cutOff(state, b)) return 0;
  return dacSanOf(b) ? 1 + DAC_SAN_BONUS : 1;
}

// ---------- Bản làng ----------

/** Làng làm nghề gì thì làm ra như công trình nào. */
export const NGHE_BUILDING: Record<Nghe, BuildingType> = { lua: 'ruong', oc: 'ben', da: 'baiDa', ren: 'loRen' };

/** Dâng lễ kết thân làng ở khoảnh `id` được không: đất làng đã về tay ta, làng chưa về theo. */
export function canJoinVillage(state: GameState, id: number): Result {
  const k = state.benKia;
  if (poiAt(id)?.kind !== 'lang' || !k.known.includes(id)) return fail('khongTimThay');
  if (k.villages.includes(id)) return fail('daVeTheo');
  if (!k.open.includes(id)) return fail('chuaVeTay');
  if (state.raid.phase !== 'idle') return fail('dangCoGiac');
  if (!canAfford(state, VILLAGE_GIFT)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

export function joinVillage(state: GameState, id: number): Result {
  const check = canJoinVillage(state, id);
  if (!check.ok) return check;
  pay(state, VILLAGE_GIFT);
  state.benKia.villages = [...state.benKia.villages, id].sort((a, b) => a - b);
  return ok(undefined);
}

/** Một làng đã về theo làm ra mỗi phút (chưa cộng đền, phúc lành): nửa công trình cùng nghề đủ người ở cấp Điện. */
export function villageOutput(state: GameState, id: number): Cost {
  const poi = poiAt(id);
  if (poi?.kind !== 'lang') return {};
  const def = BUILDINGS[NGHE_BUILDING[poi.nghe]];
  const prod = def.production[Math.min(dienLevel(state), def.maxLevel) - 1] ?? {};
  const out: Cost = {};
  for (const r of RESOURCE_IDS) if (prod[r]) out[r] = prod[r]! * VILLAGE_SHARE;
  return out;
}

/** Mọi làng đã về theo làm ra mỗi phút (chưa cộng đền, phúc lành). */
export function villagesOutput(state: GameState): Resources {
  const total: Resources = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
  for (const id of state.benKia.villages) {
    const out = villageOutput(state, id);
    for (const r of RESOURCE_IDS) total[r] += out[r] ?? 0;
  }
  return total;
}
