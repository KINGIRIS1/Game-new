// Luật chơi: trạng thái, truy vấn, thao tác và dòng thời gian.
// Không phụ thuộc DOM hay Three.js để test được bằng Vitest.

import {
  BUILDINGS,
  DAN_GROW_MS,
  GAO_PER_DAN,
  MERCHANT_EVERY_MS,
  MERCHANT_FIRST_MS,
  MERCHANT_STAY_MS,
  OFFLINE_CAP_MS,
  OFFLINE_RATE,
  QUESTS,
  RESOURCE_IDS,
  STARVING_RATE,
  START_DAN,
  START_RESOURCES,
  STORAGE_CAP,
  TRADE_BONUS,
  TRADE_VALUE,
  type BuildingType,
  type Cost,
  type QuestDef,
  type ResourceId,
  type Resources,
} from './defs';
import { GRID, inGrid, isUnlocked, touchesRiver } from './map';

export interface Building {
  id: number;
  type: BuildingType;
  x: number;
  z: number;
  level: number;
  /** Số dân đang làm việc ở đây. */
  workers: number;
}

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

export interface GameState {
  version: 2;
  resources: Resources;
  /** Số dân (không tính lính). */
  dan: number;
  /** Thời gian đã tích cho người dân tiếp theo. */
  danProgress: number;
  buildings: Building[];
  nextId: number;
  /** Chỉ số nhiệm vụ Lạc hầu đang làm. Bằng QUESTS.length khi đã xong hết. */
  questIndex: number;
  /** Thời điểm (ms, giờ máy) game được cập nhật lần cuối, dùng để tính phần vắng mặt. */
  lastSeen: number;
  /** Tổng thời gian đang mở game (ms). Thuyền buôn và giặc chỉ đến theo đồng hồ này. */
  clock: number;
  merchant: Merchant;
  settings: { muted: boolean };
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
  | 'daDoi';

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; reason: FailReason };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

export function createInitialState(now: number): GameState {
  return {
    version: 2,
    resources: { ...START_RESOURCES },
    dan: START_DAN,
    danProgress: 0,
    buildings: [{ id: 1, type: 'dien', x: 16, z: 16, level: 1, workers: 0 }],
    nextId: 2,
    questIndex: 0,
    lastSeen: now,
    clock: 0,
    merchant: { nextAt: MERCHANT_FIRST_MS, visit: null, seq: 0 },
    settings: { muted: false },
  };
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

/** Gạo cả kinh đô ăn mỗi phút. */
export function upkeepPerMinute(state: GameState): number {
  return state.dan * GAO_PER_DAN;
}

/** Lưới GRID×GRID, mỗi ô chứa id công trình đang chiếm hoặc 0. */
export function occupancy(state: GameState): Int32Array {
  const grid = new Int32Array(GRID * GRID);
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type];
    for (let dx = 0; dx < def.w; dx++) {
      for (let dz = 0; dz < def.d; dz++) grid[(b.z + dz) * GRID + (b.x + dx)] = b.id;
    }
  }
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
  const prod = BUILDINGS[b.type].production[b.level - 1] ?? {};
  const slots = slotsOf(b);
  const k = slots ? Math.min(b.workers, slots) / slots : 1;
  const out: Cost = {};
  for (const r of RESOURCE_IDS) if (prod[r]) out[r] = prod[r]! * k;
  return out;
}

/** Sản lượng mỗi phút của cả kinh đô, chưa trừ gạo ăn và chưa tính thiếu gạo. */
export function productionPerMinute(state: GameState): Resources {
  const total: Resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
  for (const b of state.buildings) {
    const out = outputOf(b);
    for (const r of RESOURCE_IDS) total[r] += out[r] ?? 0;
  }
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

export function canPlace(state: GameState, type: BuildingType, x: number, z: number): Result {
  const def = BUILDINGS[type];
  if (!def.buildable) return fail('khongTheXay');
  if (dienLevel(state) < def.minDien) return fail('chuaDuCapDien');
  if (countOf(state, type) >= limitOf(state, type)) return fail('datGioiHan');
  const level = dienLevel(state);
  const grid = occupancy(state);
  for (let dx = 0; dx < def.w; dx++) {
    for (let dz = 0; dz < def.d; dz++) {
      const tx = x + dx;
      const tz = z + dz;
      if (!inGrid(tx, tz) || !isUnlocked(tx, tz, level)) return fail('ngoaiVung');
      if (grid[tz * GRID + tx]) return fail('datBiChiem');
    }
  }
  if (def.nearRiver && !touchesRiver(x, z, def.w, def.d)) return fail('phaiSatSong');
  if (!canAfford(state, def.buildCost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

export function canUpgrade(state: GameState, id: number): Result {
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  const cost = upgradeCostOf(b);
  if (!cost) return fail('capToiDa');
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

function pay(state: GameState, cost: Cost): void {
  for (const r of RESOURCE_IDS) state.resources[r] -= cost[r] ?? 0;
}

function gain(state: GameState, amounts: Cost): void {
  const cap = storageCap(state);
  for (const r of RESOURCE_IDS) {
    const add = amounts[r] ?? 0;
    const before = state.resources[r];
    if (add > 0) state.resources[r] = Math.max(before, Math.min(cap, before + add));
  }
}

/** Cho dân rảnh vào làm ở công trình này cho tới khi đủ chỗ. */
function fillWorkers(state: GameState, b: Building): void {
  const add = Math.min(slotsOf(b) - b.workers, freeDan(state));
  if (add > 0) b.workers += add;
}

export function place(state: GameState, type: BuildingType, x: number, z: number): Result<Building> {
  const check = canPlace(state, type, x, z);
  if (!check.ok) return check;
  pay(state, BUILDINGS[type].buildCost);
  const b: Building = { id: state.nextId++, type, x, z, level: 1, workers: 0 };
  state.buildings.push(b);
  fillWorkers(state, b);
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
  return ok(quest.reward);
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
  return gained;
}

/** Tính phần sản xuất trong lúc vắng mặt, từ lastSeen tới now. Đồng hồ chơi không chạy. */
export function applyOffline(state: GameState, now: number): { ms: number; gained: Resources } {
  const ms = Math.min(Math.max(now - state.lastSeen, 0), OFFLINE_CAP_MS);
  const gained = produce(state, ms, OFFLINE_RATE);
  state.lastSeen = now;
  return { ms, gained };
}
