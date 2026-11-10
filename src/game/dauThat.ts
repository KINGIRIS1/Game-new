// Đấu thành đánh thật qua máy chủ (docs/thiet-ke.md, Kế hoạch: Đấu thành, PR 5): phần lưu trong bản lưu và các
// luật áp kết quả máy chủ vào kinh đô của mình. Không gọi mạng (việc ấy ở src/mang/); chỉ đọc dữ liệu máy chủ trả.
// Kết quả trận là của máy chủ: người đánh mất quân ngã, được của cướp (kho đầy thì bỏ phí); người giữ thành mất
// min(của bị cướp, của đang có). Mỗi trận chỉ áp một lần (nhớ id trận đã áp).

import { RESOURCE_IDS, UNIT_TYPES, type Resources, type UnitType } from './defs';
import { type PvpInput } from './dauThanh';
import { gain, type GameState } from './game';
import { type KetQua } from './mayChu';

/** Đấu thành trực tuyến trong bản lưu: chỉ có khi đã bấm Tham gia. */
export interface DauThanhState {
  /** Người dùng Supabase (đăng nhập ẩn danh ở máy này). Bản lưu chép sang máy khác thì máy ấy chưa tham gia. */
  uid: string;
  ten: string;
  chienCong: number;
  /** Có khiên tới lúc này (giờ máy chủ, mili giây), không thì null. */
  khienDen: number | null;
  /** Trận mình bị đánh đã trừ của (id trận), cũ trước mới sau. */
  daTru: string[];
  /** Trận mình đánh đã nhận kết quả (quân ngã, của cướp). */
  daNhan: string[];
  /** Trận mình đang đánh (hay đánh xong mà chưa gửi được lên máy chủ): các lần bấm để gửi lại khi có mạng. */
  dangDanh?: { tran: string; bam: PvpInput[] };
}

/** Giữ chừng này id trận đã áp (máy chủ trả 50 trận bị đánh, 20 trận đã đánh gần nhất). */
export const NHO_TRU = 100;
export const NHO_NHAN = 50;

/** Kết quả máy chủ ghi cho một trận (thêm thời gian đánh lại; `hong` khi trận đóng như rút quân ngay). */
export type KetQuaMay = KetQua & { ms: number; hong?: true };

/** Một trận như máy chủ trả trong `toi` (không kèm bản chụp, quân). */
export interface TranTom {
  id: string;
  may: boolean;
  tenDanh: string;
  tenGiu: string;
  dienDanh: number;
  dienGiu: number;
  batDau: number;
  xong: boolean;
  ketQua: KetQuaMay | null;
}

/** Hồ sơ của mình máy chủ trả. */
export interface HoSo {
  ten: string;
  chienCong: number;
  dien: number;
  khienDen: number | null;
}

const zeroRes = (): Resources => ({ gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 });
const zeroArmy = (): Record<UnitType, number> => ({ giao: 0, cung: 0, voi: 0, no: 0 });
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const nho = (list: string[], id: string, max: number) => {
  if (!list.includes(id)) list.push(id);
  if (list.length > max) list.splice(0, list.length - max);
};

/**
 * Vừa tham gia: nhớ mọi trận máy chủ đã có của người dùng này là đã áp (đăng nhập lại người dùng cũ sau khi chơi
 * game mới thì không áp trận của kinh đô cũ vào kinh đô mới).
 */
export function newDauThanh(uid: string, toi: HoSo, biDanh: TranTom[], daDanh: TranTom[]): DauThanhState {
  return {
    uid,
    ten: toi.ten,
    chienCong: toi.chienCong,
    khienDen: toi.khienDen,
    daTru: biDanh.map((t) => t.id).slice(0, NHO_TRU).reverse(),
    daNhan: daDanh.map((t) => t.id).slice(0, NHO_NHAN).reverse(),
  };
}

/** Ghi hồ sơ máy chủ trả (tên, chiến công, khiên). */
export function setHoSo(d: DauThanhState, toi: HoSo): void {
  d.ten = toi.ten;
  d.chienCong = toi.chienCong;
  d.khienDen = toi.khienDen;
}

/** Một trận bị đánh vừa trừ của: trận ấy và của mất thật (không quá của đang có). */
export interface BiDanh {
  tran: TranTom;
  mat: Resources;
}

/**
 * Trừ của các trận mình bị đánh đã xong mà chưa trừ (người đánh là người chơi, không phải kinh đô máy): mỗi loại
 * mất min(của bị cướp, của đang có). Trả các trận vừa trừ, cũ trước mới sau, để hiện bảng Bị đánh.
 */
export function truBiDanh(state: GameState, list: TranTom[]): BiDanh[] {
  const d = state.dauThanh;
  if (!d) return [];
  const out: BiDanh[] = [];
  for (const t of [...list].sort((a, b) => a.batDau - b.batDau)) {
    if (!t.xong || !t.ketQua || t.may || d.daTru.includes(t.id)) continue;
    const mat = zeroRes();
    for (const r of RESOURCE_IDS) {
      mat[r] = Math.min(num(t.ketQua.cuop?.[r]), Math.max(0, Math.floor(state.resources[r])));
      state.resources[r] -= mat[r];
    }
    nho(d.daTru, t.id, NHO_TRU);
    out.push({ tran: t, mat });
  }
  return out;
}

/** Kết quả áp vào kinh đô người đánh: của thật vào kho (kho đầy thì bỏ phí), quân mất thật. */
export interface DaNhan {
  duoc: Resources;
  mat: Record<UnitType, number>;
}

/**
 * Nhận kết quả một trận mình đánh: quân ngã mất thật, của cướp vào kho (không quá sức chứa). Trận đã nhận thì trả
 * null. Trận đang chờ gửi (`dangDanh`) là trận này thì xóa.
 */
export function nhanKetQua(state: GameState, tran: string, ket: KetQuaMay): DaNhan | null {
  const d = state.dauThanh;
  if (!d) return null;
  if (d.dangDanh?.tran === tran) delete d.dangDanh;
  if (d.daNhan.includes(tran)) return null;
  nho(d.daNhan, tran, NHO_NHAN);
  const mat = zeroArmy();
  for (const k of UNIT_TYPES) {
    mat[k] = Math.min(num(ket.mat?.[k]), state.troops[k]);
    state.troops[k] -= mat[k];
  }
  const before = { ...state.resources };
  const cuop = zeroRes();
  for (const r of RESOURCE_IDS) cuop[r] = num(ket.cuop?.[r]);
  gain(state, cuop);
  const duoc = zeroRes();
  for (const r of RESOURCE_IDS) duoc[r] = Math.max(0, Math.floor(state.resources[r] - before[r]));
  return { duoc, mat };
}

/** Nhận kết quả các trận mình đánh đã xong mà chưa nhận (thoát giữa trận, mất mạng lúc gửi). */
export function nhanTranCu(state: GameState, list: TranTom[]): { tran: TranTom; nhan: DaNhan }[] {
  const out: { tran: TranTom; nhan: DaNhan }[] = [];
  for (const t of [...list].sort((a, b) => a.batDau - b.batDau)) {
    if (!t.xong || !t.ketQua) continue;
    const nhan = nhanKetQua(state, t.id, t.ketQua);
    if (nhan) out.push({ tran: t, nhan });
  }
  return out;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isIds = (v: unknown, max: number) => Array.isArray(v) && v.length <= max && v.every((x) => typeof x === 'string' && x.length <= 64);

/** Phần Đấu thành trong bản lưu đúng dạng (sai thì bỏ, coi như chưa tham gia). */
export function isDauThanhState(v: unknown): v is DauThanhState {
  if (!isObj(v) || typeof v.uid !== 'string' || typeof v.ten !== 'string' || typeof v.chienCong !== 'number') return false;
  if (!(v.khienDen === null || typeof v.khienDen === 'number')) return false;
  if (!isIds(v.daTru, NHO_TRU) || !isIds(v.daNhan, NHO_NHAN)) return false;
  if (v.dangDanh === undefined) return true;
  const dd = v.dangDanh;
  return isObj(dd) && typeof dd.tran === 'string' && Array.isArray(dd.bam) && dd.bam.every((i) => isObj(i) && typeof i.s === 'number' && typeof i.k === 'string');
}
