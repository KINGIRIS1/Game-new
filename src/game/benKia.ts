// Vùng đất bên kia sông: bờ nam sông Đà và bờ đông sông Thao, mỗi bờ 10 khoảnh dọc sông × 3 khoảnh vào trong
// (khoảnh 5×5 ô). Bắc cầu qua sông thì khoảnh đầu cầu bên kia được dò và mở; sai trinh sát dò dần từng khoảnh, thấy
// điểm lạ (đồn giặc, bản làng, đặc sản đất, của chôn) cố định, mọi máy như nhau. Không phụ thuộc DOM hay Three.js.

import { startFieldBattle, type Battle } from './battle';
import { inChapter3 } from './coLoa';
import { inChapter4 } from './chuong4';
import {
  BEN_KIA_DIEN,
  BUILDINGS,
  SCOUT_COST,
  SCOUT_MS,
  SCOUT_TWO_DIEN,
  UNIT_TYPES,
  type BuildingType,
  type Chapter,
  type Cost,
  type EnemyType,
  type Row,
  type Terrain,
  type UnitType,
} from './defs';
import { canAfford, countOf, dienLevel, gain, pay, troopBonus, type Building, type FailReason, type GameState, type Result } from './game';
import { FAR_FOREST, GRID, KHOANH, RIVER_END, RIVER_START, inGrid, isUnlocked } from './map';
import { heroFor, inChapter2, restAfter } from './son';

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

/** Góc khoảnh (ô nhỏ nhất theo x và z). Bờ nam: dọc theo x, vào trong theo z; bờ đông thì ngược lại. */
export function plotOrigin(id: number): { x: number; z: number } {
  const { bank, i, j } = plotOf(id);
  const along = 2 + KHOANH * i;
  const deep = RIVER_END + KHOANH * j;
  return bank === 'nam' ? { x: along, z: deep } : { x: deep, z: along };
}

/** Khoảnh bên kia chứa ô (x, z), hay null nếu ô không thuộc khoảnh nào bên kia (bên này, sông, dải rừng ngoài cùng). */
export function plotAt(x: number, z: number): number | null {
  if (z >= RIVER_END && z < FAR_FOREST && x >= 2 && x < RIVER_START) {
    return plotId('nam', Math.floor((x - 2) / KHOANH), Math.floor((z - RIVER_END) / KHOANH));
  }
  if (x >= RIVER_END && x < FAR_FOREST && z >= 2 && z < RIVER_START) {
    return plotId('dong', Math.floor((z - 2) / KHOANH), Math.floor((x - RIVER_END) / KHOANH));
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

export type Nghe = 'lua' | 'chai' | 'da' | 'ren';
export type Dat = 'phuSa' | 'nuiDa' | 'moSat';
export type Tier = 1 | 2 | 3 | 4;

/** Điểm lạ trên một khoảnh bên kia: đồn giặc (bậc theo chương), bản làng (theo nghề), đặc sản đất, của chôn. */
export type Poi = { kind: 'don'; tier: Tier } | { kind: 'lang'; nghe: Nghe } | { kind: 'dacSan'; dat: Dat } | { kind: 'cua' };

/**
 * Điểm lạ cố định của hai bờ (`i`, `j` như `Plot`). Mỗi bờ sáu đồn (bậc 1, 1, 2, 2, 3, 4), hai làng, ba đặc sản, hai
 * của chôn. Đồn bậc 1 sát sông, bậc 2 hàng giữa, bậc 3–4 sát rừng. Đồn chặn khai phá khoảnh của nó và các khoảnh kề
 * cạnh, nên đồn bậc 2 ở hàng giữa chặn kín cả bề ngang bờ, chia bờ thành ba quãng. Quãng gần ngã ba (đối diện kinh
 * đô) có một đặc sản sau đồn bậc 1, khai phá được từ chương 1; làng và đặc sản khác nằm sau đồn bậc 2–4
 * (`benKia.test.ts` canh). Hai bờ chung khung đồn, khác làng và đặc sản.
 */
const CAMP_SPOTS: [number, number, Poi][] = [
  [3, 0, { kind: 'don', tier: 1 }],
  [8, 0, { kind: 'don', tier: 1 }],
  [1, 1, { kind: 'don', tier: 2 }],
  [5, 1, { kind: 'don', tier: 2 }],
  [7, 2, { kind: 'don', tier: 3 }],
  [3, 2, { kind: 'don', tier: 4 }],
];
const LAYOUT: Record<Bank, [number, number, Poi][]> = {
  nam: [
    ...CAMP_SPOTS,
    [4, 1, { kind: 'lang', nghe: 'lua' }],
    [0, 0, { kind: 'lang', nghe: 'chai' }],
    [8, 1, { kind: 'dacSan', dat: 'phuSa' }],
    [0, 1, { kind: 'dacSan', dat: 'phuSa' }],
    [6, 2, { kind: 'dacSan', dat: 'nuiDa' }],
    [9, 2, { kind: 'cua' }],
    [2, 2, { kind: 'cua' }],
  ],
  dong: [
    ...CAMP_SPOTS,
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
for (const bank of BANKS) for (const [i, j, poi] of LAYOUT[bank]) POIS.set(plotId(bank, i, j), poi);

/** Điểm lạ trên khoảnh `id` (có hay không, chưa xét đã dò chưa). */
export const poiAt = (id: number): Poi | undefined => POIS.get(id);

/** Mọi khoảnh có điểm lạ. */
export const poiPlots = (): number[] => [...POIS.keys()];

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
}

export function initialBenKia(): BenKiaState {
  return { known: [], open: [], scouts: [], cleared: [] };
}

/** Khoảnh `id` còn đồn giặc chưa dẹp. */
export function hasCamp(state: GameState, id: number): boolean {
  return poiAt(id)?.kind === 'don' && !state.benKia.cleared.includes(id);
}

/** Khoảnh `id` bị đồn giặc chặn: có đồn, hay kề cạnh một đồn chưa dẹp. */
export function plotBlocked(state: GameState, id: number): boolean {
  return hasCamp(state, id) || plotNeighbors(id).some((n) => hasCamp(state, n));
}

/**
 * Hàm hỏi nhanh ô (x, z) đã khai phá chưa: bên này theo cấp Điện, bên kia theo khoảnh đã mở. Dựng một lần rồi dùng
 * trong các vòng lặp trên cả lưới (nước lũ loang, đặt công trình).
 */
export function openTester(state: GameState): (x: number, z: number) => boolean {
  const level = dienLevel(state);
  const open = new Set(state.benKia.open);
  return (x, z) => {
    if (!inGrid(x, z)) return false;
    if (isUnlocked(x, z, level)) return true;
    const id = plotAt(x, z);
    return id !== null && open.has(id);
  };
}

// ---------- Cầu ----------

export const isBridge = (type: BuildingType): type is 'cauDa' | 'cauThao' => type === 'cauDa' || type === 'cauThao';

/** Cầu bắc sang bờ nào: cầu qua sông Đà sang bờ nam, cầu qua sông Thao sang bờ đông. */
export const bridgeBank = (type: 'cauDa' | 'cauThao'): Bank => (type === 'cauDa' ? 'nam' : 'dong');

/** Cầu đang có sang bờ `bank` (còn nguyên hay hư). */
export function bridgeTo(state: GameState, bank: Bank): Building | undefined {
  return state.buildings.find((b) => isBridge(b.type) && bridgeBank(b.type) === bank);
}

/** Hai đầu cầu: các ô đất bên này và bên kia mà cầu (đặt ở góc x, z) chạm vào. */
export function bridgeEnds(type: 'cauDa' | 'cauThao', x: number, z: number): { near: [number, number][]; far: [number, number][] } {
  const def = BUILDINGS[type];
  if (type === 'cauDa') {
    const xs = Array.from({ length: def.w }, (_, k) => x + k);
    return { near: xs.map((tx) => [tx, z - 1]), far: xs.map((tx) => [tx, z + def.d]) };
  }
  const zs = Array.from({ length: def.d }, (_, k) => z + k);
  return { near: zs.map((tz) => [x - 1, tz]), far: zs.map((tz) => [x + def.w, tz]) };
}

/** Các khoảnh bên kia mà đầu cầu chạm vào (một hay hai khoảnh). */
export function bridgeheadPlots(type: 'cauDa' | 'cauThao', x: number, z: number): number[] {
  const ids = bridgeEnds(type, x, z)
    .far.map(([tx, tz]) => plotAt(tx, tz))
    .filter((id): id is number => id !== null);
  return [...new Set(ids)];
}

/**
 * Chỗ đặt cầu: vắt qua đúng ba ô sông (cầu sông Đà nằm ở hàng sông đầu tiên, cầu sông Thao ở cột sông đầu tiên),
 * đầu bên này trên đất đã khai phá, đầu bên kia trên đất bên kia (không phải dải rừng ngoài cùng), không bắc thẳng
 * vào khoảnh có đồn giặc. Trả về lý do không đặt được, hay null.
 */
export function bridgeFit(state: GameState, type: 'cauDa' | 'cauThao', x: number, z: number): FailReason | null {
  const def = BUILDINGS[type];
  const across = type === 'cauDa' ? z : x;
  const along = type === 'cauDa' ? x : z;
  const span = type === 'cauDa' ? def.w : def.d;
  if (across !== RIVER_START || along < 0 || along + span > RIVER_START) return 'ngoaiVung';
  const open = openTester(state);
  const ends = bridgeEnds(type, x, z);
  if (!ends.near.every(([tx, tz]) => open(tx, tz))) return 'ngoaiVung';
  const plots = ends.far.map(([tx, tz]) => plotAt(tx, tz));
  if (plots.some((id) => id === null)) return 'ngoaiVung';
  if (plots.some((id) => hasCamp(state, id!))) return 'dauCauCoDon';
  return null;
}

/** Vừa bắc cầu: khoảnh đầu cầu bên kia được dò và mở luôn, làm chỗ đặt chân. */
export function openBridgehead(state: GameState, b: Building): void {
  if (!isBridge(b.type)) return;
  const k = state.benKia;
  for (const id of bridgeheadPlots(b.type, b.x, b.z)) {
    if (!k.known.includes(id)) k.known.push(id);
    if (!k.open.includes(id)) k.open.push(id);
  }
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

/** Số trinh sát được đi cùng lúc. */
export function scoutLimit(state: GameState): number {
  return dienLevel(state) >= SCOUT_TWO_DIEN ? 2 : 1;
}

/** Sai trinh sát dò khoảnh `id` được không: chưa dò, sát vùng đã dò cùng bờ, có cầu còn nguyên sang bờ ấy. */
export function canScout(state: GameState, id: number): Result {
  if (id < 0 || id >= FAR_PLOTS) return fail('khongTimThay');
  if (dienLevel(state) < BEN_KIA_DIEN) return fail('chuaDuCapDien');
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
  state.benKia.scouts.push({ plot: id, from: state.clock, at: state.clock + SCOUT_MS });
  return ok(undefined);
}

/** Trinh sát đã tới nơi: khoảnh ấy và các khoảnh kề cạnh hiện ra. Gọi mỗi lần đồng hồ chơi chạy. */
export function updateBenKia(state: GameState): void {
  const k = state.benKia;
  if (!k.scouts.length) return;
  const back = k.scouts.filter((s) => s.at <= state.clock);
  if (!back.length) return;
  k.scouts = k.scouts.filter((s) => s.at > state.clock);
  for (const s of back) {
    for (const id of [s.plot, ...plotNeighbors(s.plot)]) if (!k.known.includes(id)) k.known.push(id);
  }
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
  4: { enemies: { linhTrieu: 14, noTrieu: 8, kyBinh: 4 }, hpScale: 2.6, terrain: 'benKia', reward: { gao: 4200, voOc: 3500, datDa: 3100, sat: 800 }, chapter: 3 },
};

/** Quân mẫu đánh đồn bậc 1 ở Điện cấp 4: vừa 28 chỗ doanh trại cấp 4. Bậc 2–4 dùng quân mẫu chương 2, 3 (38 chỗ). */
export const CAMP1_ARMY: Record<UnitType, number> = { giao: 10, cung: 6, voi: 3 };

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
  const def = CAMPS[campTier(id)!];
  const hero = heroFor(state, def.chapter);
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
  });
  return ok(undefined);
}

/** Trận đánh đồn vừa xong: trừ lính tử trận; thắng thì dẹp đồn và nhận thưởng. Trận vẫn giữ để vẽ cảnh cuối. */
export function finishCamp(state: GameState, battle: Battle): void {
  const id = battle.camp!;
  const outcome = battle.outcome ?? 'lose';
  for (const k of UNIT_TYPES) state.troops[k] = Math.max(0, state.troops[k] - battle.lost[k]);
  const won = outcome === 'win' && hasCamp(state, id);
  const reward = won ? { ...CAMPS[campTier(id)!].reward } : {};
  if (won) {
    gain(state, reward);
    state.benKia.cleared.push(id);
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
