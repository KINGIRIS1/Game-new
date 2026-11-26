// Bản đồ Việt Nam, 34 tỉnh, chức Bồ chính (docs/thiet-ke.md mục Kế hoạch cùng tên; PR 1: chỉ máy khách).
//
// Tầng chơi chung gắn trên game hiện có: người chơi chọn một tỉnh trong 34 tỉnh, thành hiện nay (Nghị quyết
// 202/2025/QH15) và giữ một chức Bồ chính ở tỉnh ấy, vẫn là vua ở kinh đô mình. 18 tỉnh từ Hà Tĩnh trở ra là đất Văn
// Lang từ đầu; 16 tỉnh, thành từ Quảng Trị trở vào bắt đầu "chưa quy về" (quy về bằng kết giao ở PR 4), chọn được ngay.
// Hình tỉnh ở `public/ban-do/34-tinh.json` (`scripts/ban-do.mjs`), láng giềng tính từ hình ở `vietNamHinh.ts`.
// Tên tỉnh, tên vùng xưa ở `vi.vietNam` (`src/text/vi.ts`).
//
// Phần lưu `GameState.vietNam` là trường tùy chọn (như `dauThanh`), không lên phiên bản lưu: chưa có là chưa chọn
// tỉnh; sai dạng thì bỏ riêng phần ấy (`isVietNamState` ở `save.ts`).

import { VIET_NAM } from './defs';
import { dienLevel, type FailReason, type GameState, type Result } from './game';
import { TUAN_MS, tuanCon, tuanCua } from './loiDai';
import { LANG_GIENG_HINH } from './vietNamHinh';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

/** Mã 34 tỉnh, thành theo tệp hình (mã của nguồn Free-GIS-Data), xếp từ bắc vào nam. */
export const TINH_IDS = [
  '07', '11', '08', '09', '14', '13', '15', '10', '12', '02', '01', '03', '04', '05', '06', '16', '17', '18',
  '19', '20', '21', '22', '24', '25', '23', '26', '28', '79', '27', '31', '30', '33', '32', '34',
] as const;
export type TinhId = (typeof TINH_IDS)[number];

/** 18 tỉnh từ Hà Tĩnh trở ra: đất Văn Lang từ đầu. */
export const DAT_VAN_LANG: readonly TinhId[] = TINH_IDS.slice(0, 18);

/**
 * 21 tỉnh, thành giáp biển (kể cả bờ đảo). Hình tỉnh không phân biệt bờ biển với biên giới đất liền, nên ghi tay; test
 * canh khớp với viền ngoài tính từ hình (`VIEN_NGOAI_KM`).
 */
export const GIAP_BIEN: readonly TinhId[] = [
  '03', '04', '05', '06', '16', '17', '18', '19', '20', '21', '22', '24', '25', '23', '26', '79', '31', '30', '33', '32', '34',
];

/** 22 tỉnh có biên giới đất liền (Trung Quốc, Lào, Campuchia). Ghi tay như `GIAP_BIEN`. */
export const GIAP_BIEN_GIOI: readonly TinhId[] = [
  '07', '11', '08', '09', '14', '13', '15', '03', '16', '17', '18', '19', '20', '21', '22', '24', '25', '26', '28', '27', '31', '32',
];

/** Tỉnh có đặc khu Hoàng Sa (Đà Nẵng), Trường Sa (Khánh Hòa). */
export const QUAN_DAO_TINH = { hoangSa: '21', truongSa: '23' } as const satisfies Record<string, TinhId>;

export const laTinh = (v: unknown): v is TinhId => typeof v === 'string' && (TINH_IDS as readonly string[]).includes(v);
export const laDatVanLang = (id: TinhId): boolean => DAT_VAN_LANG.includes(id);
export const giapBien = (id: TinhId): boolean => GIAP_BIEN.includes(id);
export const giapBienGioi = (id: TinhId): boolean => GIAP_BIEN_GIOI.includes(id);
/** Tỉnh chung cạnh (tính từ hình tỉnh). */
export const langGieng = (id: TinhId): readonly TinhId[] => (LANG_GIENG_HINH[id] ?? []) as readonly TinhId[];

/** Sáu chức Bồ chính (tên ghép "Bồ chính + việc" đặt cho game; sử chỉ có "Bồ chính"). */
export const CHUC_IDS = ['quan', 'nong', 'thuy', 'thuong', 'bien', 'hai'] as const;
export type ChucId = (typeof CHUC_IDS)[number];
/** Bên võ (quân, biên, hải) và bên văn (nông, thủy, thương): Lạc tướng, Lạc hầu của tỉnh chọn theo hai bên (PR 4). */
export const CHUC_VO: readonly ChucId[] = ['quan', 'bien', 'hai'];
export const laChuc = (v: unknown): v is ChucId => typeof v === 'string' && (CHUC_IDS as readonly string[]).includes(v);

/** Chức nào có ở tỉnh `id`: Bồ chính hải chỉ ở tỉnh giáp biển. */
export const chucCo = (id: TinhId): readonly ChucId[] => (giapBien(id) ? CHUC_IDS : CHUC_IDS.filter((c) => c !== 'hai'));

export interface VietNamState {
  /** Tỉnh đã chọn; null là chưa chọn. */
  tinh: TinhId | null;
  /** Mùa (`muaCua`) lúc chọn tỉnh lần gần nhất: mỗi mùa đổi tỉnh một lần. */
  mua?: number;
  /** Chức Bồ chính đang giữ; null là chưa nhận. */
  chuc: ChucId | null;
  /** Lúc nhận chức gần nhất (ms): đổi chức phải chờ `VIET_NAM.doiChucMs`. */
  chucLuc?: number;
}

/** Mùa thứ mấy (4 tuần một mùa, mỗi mùa bắt đầu 0 giờ thứ Hai giờ Việt Nam). */
export const muaCua = (now: number): number => Math.floor(tuanCua(now) / VIET_NAM.muaTuan);
/** Còn bao lâu (ms) tới mùa sau. */
export const muaCon = (now: number): number => tuanCon(now) + (VIET_NAM.muaTuan - 1 - (tuanCua(now) % VIET_NAM.muaTuan)) * TUAN_MS;

/** Mở từ Điện cấp 5. */
export const vietNamMo = (s: GameState): boolean => dienLevel(s) >= VIET_NAM.dien;

/** Phần lưu, chưa có thì tạo (chưa chọn tỉnh, chưa nhận chức). */
export function vnNay(s: GameState): VietNamState {
  s.vietNam ??= { tinh: null, chuc: null };
  return s.vietNam;
}

/** Đổi được tỉnh lúc `now` không: chọn lần đầu thì được; đã chọn thì chỉ khi sang mùa khác. */
export function doiTinhDuoc(s: GameState, now: number): boolean {
  const v = s.vietNam;
  return !v?.tinh || v.mua === undefined || v.mua !== muaCua(now);
}

/** Còn bao lâu (ms) mới đổi được chức; 0 là đổi được ngay. */
export function choDoiChuc(s: GameState, now: number): number {
  const v = s.vietNam;
  if (!v?.chuc || v.chucLuc === undefined) return 0;
  return Math.max(0, v.chucLuc + VIET_NAM.doiChucMs - now);
}

/**
 * Chọn tỉnh `id`. Chọn lại đúng tỉnh đang ở thì không tính lượt. Sang tỉnh không giáp biển mà đang giữ Bồ chính hải
 * thì mất chức ấy và chọn lại chức được ngay.
 */
export function chonTinh(s: GameState, id: string, now: number): Result<void> {
  if (!vietNamMo(s)) return fail('vnChuaMo');
  if (!laTinh(id)) return fail('vnKhongCoTinh');
  const v = vnNay(s);
  if (v.tinh === id) return ok(undefined);
  if (!doiTinhDuoc(s, now)) return fail('vnDoiTinhMuaSau');
  v.tinh = id;
  v.mua = muaCua(now);
  if (v.chuc && !chucCo(id).includes(v.chuc)) {
    v.chuc = null;
    delete v.chucLuc;
  }
  return ok(undefined);
}

/** Nhận chức `chuc` ở tỉnh đang chọn. Nhận lại đúng chức đang giữ thì không tính lượt. */
export function chonChuc(s: GameState, chuc: string, now: number): Result<void> {
  if (!vietNamMo(s)) return fail('vnChuaMo');
  const v = s.vietNam;
  if (!v?.tinh) return fail('vnChuaChonTinh');
  if (!laChuc(chuc)) return fail('vnKhongCoChuc');
  if (!chucCo(v.tinh).includes(chuc)) return fail('vnChucChiGiapBien');
  if (v.chuc === chuc) return ok(undefined);
  if (choDoiChuc(s, now) > 0) return fail('vnDoiChucCho');
  v.chuc = chuc;
  v.chucLuc = now;
  return ok(undefined);
}

/** Kiểm phần lưu (`save.ts`): sai dạng thì bỏ riêng phần ấy. */
export function isVietNamState(v: unknown): v is VietNamState {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  if (t.tinh !== null && !laTinh(t.tinh)) return false;
  if (t.chuc !== null && !laChuc(t.chuc)) return false;
  if (t.chuc !== null && t.tinh === null) return false;
  if (t.tinh !== null && t.chuc !== null && !chucCo(t.tinh as TinhId).includes(t.chuc as ChucId)) return false;
  if (t.mua !== undefined && (typeof t.mua !== 'number' || !Number.isInteger(t.mua))) return false;
  return t.chucLuc === undefined || (typeof t.chucLuc === 'number' && Number.isFinite(t.chucLuc));
}
