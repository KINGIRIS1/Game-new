// Nâng bản lưu từ kinh đô nhỏ (lưới 30×30, móng nhỏ hơn một ô, trước phiên bản 11) lên kinh đô lớn:
// dựng lại kinh đô theo mẫu của chương đang chơi, miễn phí, giữ cấp và người làm; trả lại của cho phần
// không còn chỗ (đoạn lũy, đê, thành, bẫy thừa) và cho đất đã đắp.

import { BUILDINGS, RAID_WARNING_MS, RESOURCE_IDS, raiseBuildingCost, raiseTileCost, type BuildingType, type Cost } from './defs';
import { inChapter3 } from './coLoa';
import type { Building, GameState } from './game';
import { DIEN_HOME, baseHeights } from './map';
import { seatInMau, type MauId } from './mau';
import { inChapter2 } from './son';
import { footprintTop, levelFootprint } from './terrain';

/** Kinh đô nhỏ trước phiên bản 11. */
export const LEGACY = { grid: 30, river: 27, dien: 16 } as const;

/** Cạnh móng của công trình ở kinh đô nhỏ: công trình nhiều ô nhỏ hơn bây giờ một ô mỗi chiều. */
export const legacySize = (type: BuildingType): number => (BUILDINGS[type].w > 1 ? BUILDINGS[type].w - 1 : 1);

type Raw = Record<string, unknown>;

/**
 * Bản lưu còn ở kinh đô nhỏ: Điện (không bao giờ dời được) đứng ở ô (16, 16), độ cao (nếu đã có) là lưới 30×30.
 * Kinh đô lớn đặt Điện ở ô khác, nên không nhầm được.
 */
export function isLegacyLayout(s: Raw): boolean {
  if (!Array.isArray(s.buildings)) return false;
  const dien = (s.buildings as Raw[]).find((b) => b && b.type === 'dien');
  if (!dien || dien.x !== LEGACY.dien || dien.z !== LEGACY.dien) return false;
  return !Array.isArray(s.heights) || s.heights.length === LEGACY.grid * LEGACY.grid;
}

/** Số ngẫu nhiên lặp lại được theo hạt giống (như ở kinh đô nhỏ). */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function legacyNoise(seed: number, cell: number): (x: number, z: number) => number {
  const n = Math.ceil(LEGACY.grid / cell) + 2;
  const rand = rng(seed);
  const knots = Array.from({ length: n * n }, () => rand());
  const at = (i: number, j: number) => knots[Math.min(j, n - 1) * n + Math.min(i, n - 1)];
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x, z) => {
    const i = Math.floor(x / cell);
    const j = Math.floor(z / cell);
    const u = fade(x / cell - i);
    const v = fade(z / cell - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * v;
  };
}

/** Độ cao tự nhiên của kinh đô nhỏ, y hệt bản cũ: để biết người chơi đã đắp thêm bao nhiêu. */
export function legacyBaseHeights(): number[] {
  const coarse = legacyNoise(20260, 5);
  const fine = legacyNoise(731, 2.5);
  const out: number[] = [];
  for (let z = 0; z < LEGACY.grid; z++) {
    for (let x = 0; x < LEGACY.grid; x++) {
      const d = Math.min(LEGACY.river - 1 - x, LEGACY.river - 1 - z);
      if (d < 0) out.push(-1);
      else if (d <= 1) out.push(0);
      else {
        const inland = Math.min(Math.max((d - 3) / 13, 0), 1);
        const n = coarse(x, z) * 0.75 + fine(x, z) * 0.25;
        out.push(Math.min(Math.max(1 + Math.floor(inland * 1.4 + Math.max(0, n - 0.42) * 2.6), 1), 3));
      }
    }
  }
  return out;
}

/** Đắp móng phẳng cho công trình ở kinh đô nhỏ (dùng khi nâng bản lưu rất cũ lên phiên bản có độ cao). */
export function levelLegacyFootprints(heights: number[], buildings: Pick<Building, 'type' | 'x' | 'z'>[]): void {
  const G = LEGACY.grid;
  for (const b of buildings) {
    const n = legacySize(b.type);
    let top = -1;
    for (let dx = 0; dx < n; dx++) for (let dz = 0; dz < n; dz++) top = Math.max(top, heights[(b.z + dz) * G + b.x + dx] ?? -1);
    for (let dx = 0; dx < n; dx++) for (let dz = 0; dz < n; dz++) if (b.x + dx < G && b.z + dz < G) heights[(b.z + dz) * G + b.x + dx] = top;
  }
}

const NO_RAISE: BuildingType[] = ['luy', 'bayChong', 'de', 'thanh'];

const addCost = (a: Cost, b: Cost, times = 1) => {
  for (const r of RESOURCE_IDS) if (b[r]) a[r] = (a[r] ?? 0) + b[r]! * times;
};

/** Giá đã bỏ ra để có công trình ở cấp hiện tại: giá dựng và các lần nâng cấp. */
export function investedCost(b: Pick<Building, 'type' | 'level'>): Cost {
  const def = BUILDINGS[b.type];
  const cost: Cost = {};
  addCost(cost, def.buildCost);
  for (let l = 2; l <= b.level; l++) addCost(cost, def.upgradeCost[l] ?? {});
  return cost;
}

/**
 * Đất đá đã bỏ ra để đắp ở kinh đô nhỏ: đắp nền công trình (nền cao hơn ô cao nhất tự nhiên dưới móng),
 * và đắp ô đất trống (kể cả ô dưới lũy, đê, thành, bẫy, vốn phải đắp đất trước khi dựng).
 */
function raisedCost(heights: number[], buildings: Building[]): Cost {
  const G = LEGACY.grid;
  const base = legacyBaseHeights();
  const cost: Cost = {};
  const covered = new Uint8Array(G * G);
  for (const b of buildings) {
    const n = legacySize(b.type);
    if (NO_RAISE.includes(b.type)) continue;
    let natural = -1;
    for (let dx = 0; dx < n; dx++) {
      for (let dz = 0; dz < n; dz++) {
        const i = (b.z + dz) * G + b.x + dx;
        if (b.x + dx >= G || b.z + dz >= G) continue;
        natural = Math.max(natural, base[i]);
        covered[i] = 1;
      }
    }
    const ground = heights[b.z * G + b.x] ?? natural;
    const def = BUILDINGS[b.type];
    for (let h = Math.max(natural, 0); h < ground; h++) addCost(cost, raiseBuildingCost(def.w, def.d, h));
  }
  for (let i = 0; i < G * G; i++) {
    if (covered[i]) continue;
    for (let h = Math.max(base[i], 0); h < (heights[i] ?? base[i]); h++) addCost(cost, raiseTileCost(h));
  }
  return cost;
}

/**
 * Số vòng thành Cổ Loa của kinh đô nhỏ (như `wallRings` nhưng trên lưới 30×30): giặc đi tám hướng từ bìa rừng tới Điện
 * phải phá qua ít nhất bao nhiêu đoạn thành còn nguyên; sông không lội qua được.
 */
export function legacyRings(buildings: Building[]): number {
  const G = LEGACY.grid;
  const river = (x: number, z: number) => x >= LEGACY.river || z >= LEGACY.river;
  const wall = new Uint8Array(G * G);
  for (const b of buildings) if (b.type === 'thanh' && !b.damaged && b.x < G && b.z < G) wall[b.z * G + b.x] = 1;
  if (!wall.some((w) => w)) return 0;
  const dist = new Int32Array(G * G).fill(1 << 20);
  const buckets: number[][] = [[], []];
  for (let z = 0; z < G; z++) {
    for (let x = 0; x < G; x++) {
      if ((x !== 0 && z !== 0) || river(x, z)) continue;
      dist[z * G + x] = wall[z * G + x];
      buckets[wall[z * G + x]].push(z * G + x);
    }
  }
  for (let d = 0; d < buckets.length; d++) {
    const list = buckets[d];
    while (list.length) {
      const i = list.pop()!;
      if (dist[i] !== d) continue;
      const cx = i % G;
      const cz = Math.floor(i / G);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const nz = cz + dz;
          if ((!dx && !dz) || nx < 0 || nz < 0 || nx >= G || nz >= G || river(nx, nz)) continue;
          if (dx && dz && (river(cx + dx, cz) || river(cx, cz + dz))) continue;
          const ni = nz * G + nx;
          const nd = d + wall[ni];
          if (nd >= dist[ni]) continue;
          dist[ni] = nd;
          (buckets[nd] ??= []).push(ni);
        }
      }
    }
  }
  const dien = buildings.find((b) => b.type === 'dien');
  if (!dien) return 0;
  const n = legacySize('dien');
  let best = 1 << 20;
  for (let dx = 0; dx < n; dx++) for (let dz = 0; dz < n; dz++) best = Math.min(best, dist[(dien.z + dz) * G + dien.x + dx]);
  return best >= 1 << 20 ? 0 : best;
}

/** Mẫu kinh đô của chương đang chơi (chương 4 dùng mẫu Cổ Loa). */
export function mauForChapter(state: GameState): MauId {
  if (inChapter3(state)) return 'coLoa';
  if (inChapter2(state)) return 'deBao';
  return 'phongChau';
}

/**
 * Dựng lại kinh đô nhỏ thành kinh đô lớn theo mẫu của chương đang chơi. `state` đã có đủ phần của phiên bản 10,
 * công trình còn ở tọa độ và độ cao của kinh đô nhỏ. Ghi phần của trả lại vào `state.relaid`.
 */
export function relayLegacy(state: GameState): void {
  const refund: Cost = {};
  addCost(refund, raisedCost(state.heights, state.buildings));
  const rings = legacyRings(state.buildings);
  state.heights = baseHeights();
  const dien = state.buildings.find((b) => b.type === 'dien')!;
  const rest = state.buildings.filter((b) => b !== dien);
  dien.x = DIEN_HOME;
  dien.z = DIEN_HOME;
  state.buildings = [dien];
  const { dropped } = seatInMau(state, mauForChapter(state), rest, rings);
  for (const b of dropped) addCost(refund, investedCost(b));
  for (const b of state.buildings) levelFootprint(state, b, footprintTop(state, b.type, b.x, b.z));
  for (const r of RESOURCE_IDS) if (refund[r]) state.resources[r] += refund[r]!;
  // Trận giữ kinh đô đang dở ở kinh đô nhỏ: giặc lùi về bìa rừng, trinh sát báo lại từ đầu; của bị cướp được trả lại.
  const raid = state.raid;
  if (raid.phase === 'battle' && raid.battle) {
    for (const r of RESOURCE_IDS) state.resources[r] += raid.battle.stolen[r] ?? 0;
    raid.battle = null;
    raid.phase = 'warning';
    raid.water = 0;
    raid.startsAt = state.clock + RAID_WARNING_MS;
  }
  state.relaid = { refund, dropped: dropped.length };
}
