// Thần thú (docs/thiet-ke.md mục Kế hoạch: nuôi thần thú): năm thú trong truyện (chim Lạc, ngựa sắt, gà chín cựa,
// Rùa Vàng, rồng), chỉ đánh ở dã ngoại, mỗi lần một con đi theo đội. Chim Lạc có ngay khi dã ngoại mở; các con sau về
// khi hạ boss map 1–4 lần đầu (xét như tướng dã ngoại: giờ boss mọc lại đã hẹn, không lưu thêm). Nuôi bằng cho ăn:
// mỗi bữa trả món ăn ưa theo cấp, bữa hồi theo giờ (cả lúc vắng), đủ bữa thì lên cấp; lên cấp thì mạnh thêm, đổi dáng
// ở cấp 10, 30. Ở kinh đô thú đi lại, bay trong thành chỉ để nhìn (`render/thanThu.ts`).
//
// Phần lưu `GameState.thanThu` là trường tùy chọn (như `dauThanh`), không lên phiên bản lưu: chưa có hay sai dạng thì
// coi như mới (`thuNay`).

import { FIELD, RESOURCE_IDS, THAN_THU, THAN_THU_IDS, THAN_THU_NUOI, type Cost, type ThanThuId } from './defs';
import type { FailReason, GameState, Result } from './game';
import { canAfford, pay } from './game';
import { daMo } from './daNgoai';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

export interface ThanThuState {
  /** Cấp và số bữa đã ăn ở cấp ấy, mỗi thú. */
  cap: Record<ThanThuId, number>;
  exp: Record<ThanThuId, number>;
  /** Số bữa đang có (tối đa `THAN_THU_NUOI.buaMax`) và phần thời gian đã tích tới bữa sau (ms). */
  bua: number;
  buaMs: number;
  /** Thú đi theo đội dã ngoại; null là chưa chọn (lấy con đầu đã về). */
  chon: ThanThuId | null;
}

const moiThu = <T>(v: T) => Object.fromEntries(THAN_THU_IDS.map((k) => [k, v])) as Record<ThanThuId, T>;

export function initialThanThu(): ThanThuState {
  return { cap: moiThu(1), exp: moiThu(0), bua: THAN_THU_NUOI.buaMax, buaMs: 0, chon: null };
}

/** Phần thần thú của bản lưu (chưa có thì tạo). */
export function thuNay(s: GameState): ThanThuState {
  if (!s.thanThu) s.thanThu = initialThanThu();
  return s.thanThu;
}

/** Thú `id` đã về chưa: chim Lạc khi dã ngoại mở; con khác khi boss map `ve` đã bị hạ ít nhất một lần. */
export function thuVe(s: GameState, id: ThanThuId): boolean {
  if (!daMo(s)) return false;
  const ve = THAN_THU[id].ve;
  return ve === 0 || (s.daNgoai.boss[ve - 1] ?? 0) > 0;
}

/** Các thú đã về. */
export const thuCo = (s: GameState): ThanThuId[] => THAN_THU_IDS.filter((k) => thuVe(s, k));

/** Thú đi theo đội lúc này: con đã chọn (nếu đã về), không thì con đầu đã về; chưa có con nào thì null. */
export function thuDiTheo(s: GameState): ThanThuId | null {
  const co = thuCo(s);
  const chon = s.thanThu?.chon;
  return chon && co.includes(chon) ? chon : (co[0] ?? null);
}

/** Chọn thú đi theo đội. */
export function chonThu(s: GameState, id: ThanThuId): Result<void> {
  if (!thuVe(s, id)) return fail('thuChuaVe');
  thuNay(s).chon = id;
  return ok(undefined);
}

/** Cấp của thú `id`. */
export const capThu = (s: GameState, id: ThanThuId): number => s.thanThu?.cap[id] ?? 1;

/** Số bữa cần để lên cấp sau (đã ở trần thì Infinity). */
export const buaLen = (cap: number): number => (cap >= THAN_THU_NUOI.tran ? Infinity : 1 + Math.floor(cap / 5));

/** Dáng theo cấp: 0 non, 1 lớn, 2 thần. */
export const dangThu = (cap: number): 0 | 1 | 2 => (cap >= THAN_THU_NUOI.dang[1] ? 2 : cap >= THAN_THU_NUOI.dang[0] ? 1 : 0);

/** Hệ số máu và sức đánh theo cấp thú. */
export const heThu = (cap: number): number => 1 + THAN_THU_NUOI.moiCap * (Math.max(1, cap) - 1);

/** Giá một bữa của thú `id` ở cấp hiện tại. */
export function giaBua(s: GameState, id: ThanThuId): Cost {
  const cap = capThu(s, id);
  const out: Cost = {};
  for (const r of RESOURCE_IDS) {
    const n = THAN_THU[id].an[r];
    if (n) out[r] = n * cap;
  }
  return out;
}

/** Cho thú `id` ăn một bữa: trừ của, trừ một bữa, đủ bữa thì lên cấp. Trả cấp mới. */
export function choAn(s: GameState, id: ThanThuId): Result<{ cap: number; len: boolean }> {
  if (!thuVe(s, id)) return fail('thuChuaVe');
  const t = thuNay(s);
  if (t.cap[id] >= THAN_THU_NUOI.tran) return fail('thuDaTran');
  if (t.bua < 1) return fail('thuHetBua');
  const gia = giaBua(s, id);
  if (!canAfford(s, gia)) return fail('thieuTaiNguyen');
  pay(s, gia);
  // Đang đầy bữa thì đồng hồ bữa sau bắt đầu chạy từ bây giờ.
  if (t.bua >= THAN_THU_NUOI.buaMax) t.buaMs = 0;
  t.bua--;
  t.exp[id]++;
  let len = false;
  if (t.exp[id] >= buaLen(t.cap[id])) {
    t.exp[id] = 0;
    t.cap[id]++;
    len = true;
  }
  return ok({ cap: t.cap[id], len });
}

/** Bữa hồi theo thời gian (lúc chơi và lúc vắng). */
export function hoiBua(s: GameState, ms: number): void {
  if (ms <= 0 || !s.thanThu) return;
  const t = s.thanThu;
  if (t.bua >= THAN_THU_NUOI.buaMax) return;
  t.buaMs += ms;
  const them = Math.floor(t.buaMs / THAN_THU_NUOI.buaMs);
  if (!them) return;
  t.buaMs -= them * THAN_THU_NUOI.buaMs;
  t.bua = Math.min(THAN_THU_NUOI.buaMax, t.bua + them);
  if (t.bua >= THAN_THU_NUOI.buaMax) t.buaMs = 0;
}

/** Giây còn lại tới bữa sau (đã đầy bữa thì 0). */
export function buaCho(s: GameState): number {
  const t = s.thanThu;
  if (!t || t.bua >= THAN_THU_NUOI.buaMax) return 0;
  return Math.ceil((THAN_THU_NUOI.buaMs - t.buaMs) / 1000);
}

/** Thú đi theo đội vào trận dã ngoại: loại, cấp, máu (đã nhân cấp chung `bonus`), hệ số sức đánh. */
export function thuSetup(s: GameState, bonus: number): { kind: ThanThuId; cap: number; hp: number; manh: number } | null {
  const kind = thuDiTheo(s);
  if (!kind) return null;
  const cap = capThu(s, kind);
  const he = heThu(cap);
  return { kind, cap, hp: THAN_THU[kind].hp * FIELD.hpMul * (1 + bonus) * he, manh: he };
}

/** Bản lưu: phần thần thú đúng dạng. */
export function isThanThuState(v: unknown): v is ThanThuState {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  const bang = (x: unknown, lo: number, hi: number) =>
    !!x && typeof x === 'object' && THAN_THU_IDS.every((k) => num((x as Record<string, unknown>)[k]) && ((x as Record<string, number>)[k] >= lo) && (x as Record<string, number>)[k] <= hi);
  if (!bang(t.cap, 1, THAN_THU_NUOI.tran) || !bang(t.exp, 0, 1000)) return false;
  if (!num(t.bua) || (t.bua as number) > THAN_THU_NUOI.buaMax || !num(t.buaMs)) return false;
  return t.chon === null || THAN_THU_IDS.includes(t.chon as ThanThuId);
}
