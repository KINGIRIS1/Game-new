// Nhà thuốc nam (docs/thiet-ke.md, Kế hoạch: Nhà thuốc nam): sau mỗi trận (giữ kinh đô, phó bản, thử thách, đánh
// đồn, Đấu thành; trừ trận đảo) lang y khiêng về một phần quân ngã. Thương binh nằm ở nhà thuốc, chữa dần theo giờ
// (cả lúc vắng), khỏi thì về doanh trại nếu còn chỗ. Thương binh không tính chỗ quân, không ra trận, vẫn ăn gạo.

import { BUILDINGS, NHA_THUOC, UNITS, UNIT_TYPES, type UnitType } from './defs';
import { troopCap, troopSpace, type GameState } from './game';

/** Thương binh đang nằm ở nhà thuốc và thời gian đã chữa cho người kế tiếp. */
export interface ThuongState {
  linh: Record<UnitType, number>;
  /** Thời gian (ms) đã chữa cho người đứng đầu hàng chờ. */
  ms: number;
}

export function initialThuong(): ThuongState {
  return { linh: { giao: 0, cung: 0, voi: 0, no: 0 }, ms: 0 };
}

const zero = (): Record<UnitType, number> => ({ giao: 0, cung: 0, voi: 0, no: 0 });

/** Cấp nhà thuốc còn nguyên cao nhất (0 là không có nhà nào làm được). */
export function capNhaThuoc(state: GameState): number {
  let cap = 0;
  for (const b of state.buildings) if (b.type === 'nhaThuoc' && !b.damaged) cap = Math.max(cap, b.level);
  return Math.min(cap, BUILDINGS.nhaThuoc.maxLevel);
}

/** Tổng số giường (chỗ quân) của các nhà thuốc còn nguyên. */
export function soGiuong(state: GameState): number {
  let n = 0;
  for (const b of state.buildings) if (b.type === 'nhaThuoc' && !b.damaged) n += NHA_THUOC.giuong[b.level - 1] ?? 0;
  return n;
}

/** Số giường đang có thương binh nằm (tính bằng chỗ quân). */
export function giuongDung(state: GameState): number {
  return UNIT_TYPES.reduce((n, k) => n + state.thuong.linh[k] * UNITS[k].space, 0);
}

/** Số thương binh đang nằm. */
export function soThuong(state: GameState): number {
  return UNIT_TYPES.reduce((n, k) => n + state.thuong.linh[k], 0);
}

/** Phần quân ngã được cứu ở cấp nhà thuốc hiện có (0 khi không có nhà còn nguyên). */
export function tiLeCuu(state: GameState): number {
  const cap = capNhaThuoc(state);
  return cap ? NHA_THUOC.cuu[cap - 1] : 0;
}

/**
 * Một trận vừa xong, `lost` là quân ngã (đã trừ khỏi `state.troops`): khiêng về nhà thuốc `floor(ngã × tỉ lệ)` mỗi
 * binh chủng, không quá số giường còn trống (phần thừa mất như cũ). Trả số người được khiêng về.
 */
export function nhanThuong(state: GameState, lost: Partial<Record<UnitType, number>>): Record<UnitType, number> {
  const out = zero();
  const tl = tiLeCuu(state);
  if (!tl) return out;
  let trong = soGiuong(state) - giuongDung(state);
  for (const k of NHA_THUOC.thuTu) {
    const nga = Math.max(0, Math.floor(lost[k] ?? 0));
    const space = UNITS[k].space;
    const n = Math.min(Math.floor(nga * tl), Math.floor(Math.max(0, trong) / space));
    if (n <= 0) continue;
    out[k] = n;
    state.thuong.linh[k] += n;
    trong -= n * space;
  }
  return out;
}

/** Người kế tiếp sẽ được chữa: binh chủng đầu tiên theo `thuTu` còn thương binh. */
function keTiep(state: GameState): UnitType | null {
  return NHA_THUOC.thuTu.find((k) => state.thuong.linh[k] > 0) ?? null;
}

/** Thời gian chữa khỏi một người loại `k` ở cấp nhà thuốc hiện có (không có nhà còn nguyên thì Infinity). */
export function chuaMs(state: GameState, k: UnitType): number {
  const cap = capNhaThuoc(state);
  return cap ? NHA_THUOC.chuaMs[cap - 1] * UNITS[k].space : Infinity;
}

/** Doanh trại còn chỗ cho một người loại `k`. */
const conCho = (state: GameState, k: UnitType) => troopSpace(state) + UNITS[k].space <= troopCap(state);

/**
 * Thời gian trôi `ms`: chữa từng người theo hàng chờ, khỏi thì vào `state.troops`. Nhà thuốc hư (hay không có) thì
 * đồng hồ đứng; doanh trại hết chỗ thì người đã chữa xong nằm chờ (đồng hồ không tích thêm). Trả số người đã khỏi.
 */
export function hoiThuong(state: GameState, ms: number): Record<UnitType, number> {
  const out = zero();
  const t = state.thuong;
  if (ms <= 0 || !capNhaThuoc(state)) return out;
  let con = ms;
  for (let guard = 0; guard < 10_000; guard++) {
    const k = keTiep(state);
    if (!k) {
      t.ms = 0;
      break;
    }
    const can = chuaMs(state, k);
    const them = Math.min(con, Math.max(0, can - t.ms));
    t.ms += them;
    con -= them;
    if (t.ms < can) break;
    if (!conCho(state, k)) {
      t.ms = can;
      break;
    }
    t.linh[k]--;
    state.troops[k]++;
    out[k]++;
    t.ms = 0;
  }
  return out;
}

/** Thời gian còn lại (ms) tới khi người kế tiếp khỏi; null khi không có ai, nhà hư, hay đang chờ chỗ doanh trại. */
export function choKhoi(state: GameState): { k: UnitType; ms: number; cho: boolean } | null {
  const k = keTiep(state);
  if (!k || !capNhaThuoc(state)) return null;
  const ms = Math.max(0, chuaMs(state, k) - state.thuong.ms);
  return { k, ms, cho: ms === 0 && !conCho(state, k) };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Phần thương binh trong bản lưu đúng dạng. */
export function isThuongState(v: unknown): v is ThuongState {
  if (!isObj(v) || !isNum(v.ms) || v.ms < 0 || !isObj(v.linh)) return false;
  const l = v.linh;
  return UNIT_TYPES.every((k) => isNum(l[k]) && (l[k] as number) >= 0);
}

/**
 * Trừ quân ngã khỏi `state.troops` (không quá quân đang có) rồi khiêng về nhà thuốc (`nhanThuong`). Trả số được khiêng
 * về khi có ít nhất một người, không thì undefined (kết quả trận khỏi ghi trường rỗng).
 */
export function truQuanNga(state: GameState, lost: Partial<Record<UnitType, number>>): Record<UnitType, number> | undefined {
  const mat = zero();
  for (const k of UNIT_TYPES) {
    mat[k] = Math.min(Math.max(0, Math.floor(lost[k] ?? 0)), state.troops[k]);
    state.troops[k] -= mat[k];
  }
  const cuu = nhanThuong(state, mat);
  return UNIT_TYPES.some((k) => cuu[k] > 0) ? cuu : undefined;
}
