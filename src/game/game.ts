// Luật chơi: trạng thái, truy vấn, thao tác và dòng thời gian.
// Không phụ thuộc DOM hay Three.js để test được bằng Vitest.

import {
  BUILDINGS,
  OFFLINE_CAP_MS,
  OFFLINE_RATE,
  QUESTS,
  RESOURCE_IDS,
  START_RESOURCES,
  STORAGE_CAP,
  type BuildingType,
  type Cost,
  type QuestDef,
  type Resources,
} from './defs';
import { GRID, inGrid, isUnlocked, touchesRiver } from './map';

export interface Building {
  id: number;
  type: BuildingType;
  x: number;
  z: number;
  level: number;
}

export interface GameState {
  version: 1;
  resources: Resources;
  buildings: Building[];
  nextId: number;
  /** Chỉ số nhiệm vụ Lạc hầu đang làm. Bằng QUESTS.length khi đã xong hết. */
  questIndex: number;
  /** Thời điểm (ms) game được cập nhật lần cuối, dùng để tính phần vắng mặt. */
  lastSeen: number;
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
  | 'chuaXong';

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; reason: FailReason };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

export function createInitialState(now: number): GameState {
  return {
    version: 1,
    resources: { ...START_RESOURCES },
    buildings: [{ id: 1, type: 'dien', x: 16, z: 16, level: 1 }],
    nextId: 2,
    questIndex: 0,
    lastSeen: now,
    settings: { muted: false },
  };
}

// ---------- Truy vấn ----------

export function dienLevel(state: GameState): number {
  return state.buildings.find((b) => b.type === 'dien')?.level ?? 1;
}

export function storageCap(state: GameState): number {
  return STORAGE_CAP[dienLevel(state) - 1];
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

/** Sản lượng mỗi phút của cả kinh đô (chưa nhân hệ số vắng mặt). */
export function productionPerMinute(state: GameState): Resources {
  const total: Resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
  for (const b of state.buildings) {
    const prod = BUILDINGS[b.type].production[b.level - 1] ?? {};
    for (const r of RESOURCE_IDS) total[r] += prod[r] ?? 0;
  }
  return total;
}

export function upgradeCostOf(b: Building): Cost | undefined {
  const def = BUILDINGS[b.type];
  return b.level < def.maxLevel ? def.upgradeCost[b.level + 1] : undefined;
}

export function canPlace(state: GameState, type: BuildingType, x: number, z: number): Result {
  const def = BUILDINGS[type];
  if (!def.buildable) return fail('khongTheXay');
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
  if (b.type !== 'dien' && b.level + 1 > dienLevel(state)) return fail('chuaDuCapDien');
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
  if (goal.kind === 'count') {
    return { have: Math.min(countOf(state, goal.building), goal.amount), need: goal.amount };
  }
  return { have: Math.min(dienLevel(state), goal.level), need: goal.level };
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

export function place(state: GameState, type: BuildingType, x: number, z: number): Result<Building> {
  const check = canPlace(state, type, x, z);
  if (!check.ok) return check;
  pay(state, BUILDINGS[type].buildCost);
  const b: Building = { id: state.nextId++, type, x, z, level: 1 };
  state.buildings.push(b);
  return ok(b);
}

export function upgrade(state: GameState, id: number): Result<Building> {
  const check = canUpgrade(state, id);
  if (!check.ok) return check;
  const b = findBuilding(state, id)!;
  pay(state, upgradeCostOf(b)!);
  b.level += 1;
  return ok(b);
}

export function remove(state: GameState, id: number): Result {
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  if (!BUILDINGS[b.type].removable) return fail('khongTheDo');
  state.buildings = state.buildings.filter((other) => other.id !== id);
  return ok(undefined);
}

export function claimQuest(state: GameState): Result<Cost> {
  const quest = currentQuest(state);
  if (!quest) return fail('khongTimThay');
  if (!questDone(state)) return fail('chuaXong');
  gain(state, quest.reward);
  state.questIndex += 1;
  return ok(quest.reward);
}

/** Cho thời gian trôi `ms` mili giây với hệ số tốc độ `rate`. Trả về lượng tài nguyên thực nhận. */
export function tick(state: GameState, ms: number, rate = 1): Resources {
  const perMin = productionPerMinute(state);
  const cap = storageCap(state);
  const gained: Resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
  if (ms <= 0) return gained;
  for (const r of RESOURCE_IDS) {
    const before = state.resources[r];
    const after = Math.min(cap, before + (perMin[r] * rate * ms) / 60000);
    // Không cắt bớt phần đang vượt sức chứa (ví dụ do thưởng), chỉ ngừng tăng.
    state.resources[r] = Math.max(before, after);
    gained[r] = state.resources[r] - before;
  }
  return gained;
}

/** Tính phần sản xuất trong lúc vắng mặt, từ lastSeen tới now. */
export function applyOffline(state: GameState, now: number): { ms: number; gained: Resources } {
  const ms = Math.min(Math.max(now - state.lastSeen, 0), OFFLINE_CAP_MS);
  const gained = tick(state, ms, OFFLINE_RATE);
  state.lastSeen = now;
  return { ms, gained };
}
