// Hội Tết bánh chưng bánh giầy: ruộng nếp, vườn đậu xanh lá dong, chuồng lợn cho nguyên liệu,
// bếp gói bánh chưng và giã bánh giầy. Cứ khoảng 20 phút chơi lại có Tết, mở 3 phút để dâng bánh lấy phúc lành.

import {
  BEP_PER_MIN,
  BEP_STORE,
  DAU_LA_PER_MIN,
  NEP_PER_MIN,
  TET_DAT_BONUS,
  TET_EVERY_MS,
  TET_FIRST_MS,
  TET_FIRST_NEED,
  TET_NEED,
  TET_OPEN_MS,
  TET_TROI_BONUS,
  THIT_PER_MIN,
  type BuildingType,
} from './defs';
import { dienLevel, slotsOf, type Building, type GameState, type Result } from './game';

export type Banh = 'chung' | 'giay';
export const BANH_IDS: Banh[] = ['chung', 'giay'];
/** Nguồn làm bánh chưng: nếp, đậu xanh và lá dong, thịt lợn; `bep` là sức bếp. */
export type Nguon = 'nep' | 'dauLa' | 'thit' | 'bep';

export interface TetState {
  /** Số Tết đã mở. */
  seq: number;
  /** Lúc (đồng hồ chơi) Tết tới. Null khi chưa kể truyện Lang Liêu. */
  nextAt: number | null;
  /** Tết đang mở tới lúc này (đồng hồ chơi); 0 khi không mở. */
  openUntil: number;
  /** Bánh trên gác bếp (số thực; hiện ra thì làm tròn xuống). */
  banh: Record<Banh, number>;
  /** Tết đang mở đã dâng loại bánh nào. */
  offered: Record<Banh, boolean>;
  /** Phúc lành đang có: bánh chưng cho phúc lành Đất, bánh giầy cho phúc lành Trời. */
  blessing: Record<Banh, boolean>;
}

export function initialTet(): TetState {
  return {
    seq: 0,
    nextAt: null,
    openUntil: 0,
    banh: { chung: 0, giay: 0 },
    offered: { chung: false, giay: false },
    blessing: { chung: false, giay: false },
  };
}

/** Phần làm ra của một công trình theo số người đang làm; hư thì không làm gì. */
function share(b: Building, table: number[]): number {
  if (b.damaged) return 0;
  const slots = slotsOf(b);
  const k = slots ? Math.min(b.workers, slots) / slots : 1;
  return (table[b.level - 1] ?? 0) * k;
}

function sumOf(state: GameState, type: BuildingType, table: number[]): number {
  return state.buildings.filter((b) => b.type === type).reduce((n, b) => n + share(b, table), 0);
}

export interface Bake {
  /** Nguyên liệu mỗi phút, tính bằng số cái bánh làm được. */
  nep: number;
  dauLa: number;
  thit: number;
  /** Sức bếp mỗi phút cho mỗi loại bánh. */
  bep: number;
  /** Bánh làm ra mỗi phút. */
  chung: number;
  giay: number;
  /** Nguồn đang giữ chân bánh chưng (chậm nhất), hay null khi chưa có bếp. */
  short: Nguon | null;
}

/**
 * Bếp gói bánh chưng trước, nhanh bằng nguồn chậm nhất trong nếp, đậu lá, thịt lợn và không quá sức bếp.
 * Nếp còn thừa thì giã bánh giầy, cũng không quá sức bếp.
 */
export function bakeRates(state: GameState): Bake {
  const nep = sumOf(state, 'ruongNep', NEP_PER_MIN);
  const dauLa = sumOf(state, 'vuon', DAU_LA_PER_MIN);
  const thit = sumOf(state, 'chuongLon', THIT_PER_MIN);
  const bep = sumOf(state, 'bep', BEP_PER_MIN);
  const chung = Math.min(nep, dauLa, thit, bep);
  const giay = Math.min(nep - chung, bep);
  const hasBep = state.buildings.some((b) => b.type === 'bep');
  let short: Nguon | null = null;
  if (hasBep) {
    const order: [Nguon, number][] = [['nep', nep], ['dauLa', dauLa], ['thit', thit], ['bep', bep]];
    short = order.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  }
  return { nep, dauLa, thit, bep, chung, giay, short };
}

/** Gác bếp chứa tối đa bấy nhiêu bánh mỗi loại (theo cấp bếp cao nhất); chưa có bếp thì không chứa được. */
export function bakeStore(state: GameState): number {
  const levels = state.buildings.filter((b) => b.type === 'bep').map((b) => b.level);
  return levels.length ? BEP_STORE[Math.max(...levels) - 1] : 0;
}

/** Bếp làm bánh trong `ms` mili giây với hệ số tốc độ `rate` (thiếu gạo, vắng mặt). Bánh cũ vượt sức gác bếp thì giữ nguyên. */
export function bake(state: GameState, ms: number, rate: number): void {
  if (ms <= 0) return;
  const r = bakeRates(state);
  const store = bakeStore(state);
  for (const k of BANH_IDS) {
    const before = state.tet.banh[k];
    state.tet.banh[k] = Math.max(before, Math.min(store, before + (r[k] * rate * ms) / 60000));
  }
}

/** Số bánh mỗi loại cần dâng ở Tết sắp tới (hay đang mở). */
export function tetNeed(state: GameState): number {
  const first = state.tet.seq === 0 || (state.tet.seq === 1 && tetOpen(state));
  return first ? TET_FIRST_NEED : TET_NEED[dienLevel(state) - 1];
}

export function tetOpen(state: GameState): boolean {
  return state.tet.openUntil > state.clock;
}

/** Đã kể truyện Lang Liêu: Hội Tết bắt đầu. */
export function tetStarted(state: GameState): boolean {
  return state.story.seen.includes('langLieu');
}

/** Đang có trận ở kinh đô (kể cả lúc trinh sát báo) hay đang đánh phó bản: Tết lùi lại. */
function busy(state: GameState): boolean {
  return state.raid.phase !== 'idle' || !!state.campaign.battle;
}

/** Lịch Tết theo đồng hồ chơi: hẹn Tết đầu sau truyện, mở Tết khi rảnh trận, đóng Tết thì tính lại phúc lành. */
export function updateTet(state: GameState): void {
  const tet = state.tet;
  if (tet.nextAt === null) {
    if (tetStarted(state)) tet.nextAt = state.clock + TET_FIRST_MS;
    return;
  }
  if (tet.openUntil > 0 && state.clock >= tet.openUntil) {
    // Hết Tết: phúc lành giữ tới Tết sau nếu Tết này có dâng, lỡ dâng thì hết.
    tet.openUntil = 0;
    tet.blessing = { ...tet.offered };
    tet.offered = { chung: false, giay: false };
  }
  if (tet.openUntil === 0 && state.clock >= tet.nextAt && !busy(state)) {
    tet.seq += 1;
    tet.openUntil = state.clock + TET_OPEN_MS;
    tet.nextAt = state.clock + TET_EVERY_MS;
  }
}

export function canOffer(state: GameState, kind: Banh): Result {
  if (!tetOpen(state)) return { ok: false, reason: 'chuaToiTet' };
  if (state.tet.offered[kind]) return { ok: false, reason: 'daDang' };
  if (state.tet.banh[kind] < tetNeed(state)) return { ok: false, reason: 'thieuBanh' };
  return { ok: true, value: undefined };
}

/** Dâng bánh trước Điện: trừ đúng số cần dâng, có phúc lành ngay, kéo dài tới khi Tết sau đóng. */
export function offer(state: GameState, kind: Banh): Result {
  const check = canOffer(state, kind);
  if (!check.ok) return check;
  state.tet.banh[kind] -= tetNeed(state);
  state.tet.offered[kind] = true;
  state.tet.blessing[kind] = true;
  return check;
}

/** Phần cộng thêm vào sản lượng mọi tài nguyên của phúc lành Đất. */
export function datBonus(state: GameState): number {
  return state.tet.blessing.chung ? TET_DAT_BONUS : 0;
}

/** Phần cộng thêm vào máu và sức đánh quân ta của phúc lành Trời. */
export function troiBonus(state: GameState): number {
  return state.tet.blessing.giay ? TET_TROI_BONUS : 0;
}
