// Bản đồ Việt Nam PR 4: mùa, phúc lành tỉnh, Lạc tướng và Lạc hầu, kết giao và quy về (docs/thiet-ke.md mục Kế
// hoạch: bản đồ Việt Nam, 34 tỉnh, chức Bồ chính). Số ở `MUA_TINH` (`defs.ts`).
//
// - Hết mùa (4 tuần), máy chủ xếp hạng các tỉnh đã quy về theo điểm mùa ấy (`xepMua`; điểm của tỉnh mới quy về chỉ
//   tính từ ngày sau ngày quy về). Người chơi theo tỉnh mình góp nhiều điểm nhất mùa ấy: cả mùa sau có phúc lành tỉnh
//   (`phucMua`, cộng vào sản lượng kinh đô ở `productionPerMinute`; không vào bản chụp Đấu thành) và nhận thưởng một
//   lần (`thuongMua`, `nhanMua`).
// - Mỗi tuần mỗi tỉnh một Lạc tướng (bên võ) và một Lạc hầu (bên văn): người góp nhiều nhất tuần trước của bên ấy.
//   Chỉ để nhìn: danh hiệu, viền tên vàng, cờ tỉnh cắm trước Điện (`DanhHieu`).
// - Tỉnh chưa quy về có thanh kết giao: mọi điểm góp ở tỉnh ấy dồn vào, đủ `MUA_TINH.ketGiao` thì cả tỉnh quy về với
//   mọi người chơi, giữ mãi (`daQuy`, `nhanQuy`: tỉnh vừa quy về thì kể đoạn truyện ngắn).
//
// Phúc lành, danh hiệu, danh sách tỉnh đã quy về lưu ở `GameState.vietNam` (tùy chọn, không lên phiên bản lưu); hết
// mùa, hết tuần thì `capNhatMua` bỏ phần đã hết hạn.

import { MUA_TINH } from './defs';
import type { GameState } from './game';
import { tuanCua } from './loiDai';
import { DAT_VAN_LANG, TINH_IDS, laTinh, muaCua, vnNay, type TinhId } from './vietNam';

/** Kết quả một tỉnh cuối mùa: hạng (null là không lên bảng: chưa quy về hay 0 điểm), điểm, đã diệt được đạo giặc. */
export interface MuaDong {
  tinh: TinhId;
  hang: number | null;
  diem: number;
  diet: boolean;
}

/** Kết quả mùa trước của mình (tỉnh mình góp nhiều nhất mùa ấy). */
export interface MuaToi extends MuaDong {
  mua: number;
  /** Điểm mình góp cho tỉnh ấy mùa ấy. */
  cua: number;
}

/** Phúc lành tỉnh cả mùa `mua`: phần trăm sản lượng kinh đô, tỉnh, hạng mùa trước. */
export interface PhucTinh {
  mua: number;
  pct: number;
  tinh: TinhId;
  hang: number | null;
}

export type LoaiDau = 'lacTuong' | 'lacHau';
export const LOAI_DAU: readonly LoaiDau[] = ['lacTuong', 'lacHau'];

/** Danh hiệu tuần `tuan`: Lạc tướng (bên võ) hay Lạc hầu (bên văn) của tỉnh `tinh`. */
export interface DanhHieu {
  tuan: number;
  loai: LoaiDau;
  tinh: TinhId;
}

/** Lạc tướng, Lạc hầu tuần này của một tỉnh (tên ở Đấu thành; chưa tham gia Đấu thành thì null). */
export interface DauTinh {
  tinh: TinhId;
  loai: LoaiDau;
  ten: string | null;
}

/** Phúc lành (phần trăm) của tỉnh hạng `hang` (null: không lên bảng) đã diệt được đạo giặc nào trong mùa chưa. */
export function phucMua(hang: number | null, diet: boolean): number {
  if (hang !== null && hang <= MUA_TINH.hangDau) return MUA_TINH.phuc[0];
  if (hang !== null && hang <= MUA_TINH.hangMuoi) return MUA_TINH.phuc[1];
  return diet ? MUA_TINH.phuc[2] : 0;
}

/** Thưởng cuối mùa của người góp `cua` điểm cho tỉnh hạng `hang`: chưa góp điểm nào thì không có. */
export function thuongMua(hang: number | null, cua: number): { mon: number; huan: number } {
  if (cua <= 0) return { mon: 0, huan: 0 };
  const t = MUA_TINH.thuong;
  const muc = hang !== null && hang <= MUA_TINH.hangDau ? t[0] : hang !== null && hang <= MUA_TINH.hangMuoi ? t[1] : t[2];
  return { mon: muc.mon, huan: muc.huan };
}

/**
 * Xếp hạng cuối mùa (máy chủ dùng): tỉnh có điểm, điểm cao trước, ngang điểm thì theo thứ tự bắc vào nam; tỉnh 0 điểm
 * không có hạng. Trả mỗi tỉnh trong `ds` một dòng, theo thứ tự `TINH_IDS`.
 */
export function xepMua(ds: readonly { tinh: string; diem: number; diet: boolean }[]): MuaDong[] {
  const thu = (id: string) => TINH_IDS.indexOf(id as TinhId);
  const co = ds.filter((d) => laTinh(d.tinh) && d.diem > 0).sort((a, b) => b.diem - a.diem || thu(a.tinh) - thu(b.tinh));
  return ds
    .filter((d) => laTinh(d.tinh))
    .sort((a, b) => thu(a.tinh) - thu(b.tinh))
    .map((d) => ({ tinh: d.tinh as TinhId, hang: d.diem > 0 ? co.indexOf(d) + 1 : null, diem: Math.max(0, d.diem), diet: d.diet }));
}

/** Tỉnh đã quy về: đất Văn Lang từ đầu, hay có trong danh sách quy về (máy chủ trả, máy lưu lại). */
export const daQuy = (id: TinhId, quy: readonly string[] = []): boolean => DAT_VAN_LANG.includes(id) || quy.includes(id);

/** Phần thanh kết giao (0–1) khi đã góp `ket` điểm. */
export const phanKet = (ket: number): number => Math.max(0, Math.min(1, ket / MUA_TINH.ketGiao));

/** Tỉnh đã quy về máy này biết (để tô bản đồ khi chưa hỏi được máy chủ). */
export const quyCua = (s: GameState): readonly TinhId[] => s.vietNam?.quy ?? [];

/**
 * Nhận danh sách tỉnh đã quy về từ máy chủ, trả các tỉnh vừa quy về (để kể truyện). Lần đầu máy này biết danh sách
 * thì chỉ ghi lại, không kể (người mới vào khỏi nghe một loạt truyện cũ; thẻ tỉnh vẫn có nút đọc lại).
 */
export function nhanQuy(s: GameState, quy: readonly string[]): TinhId[] {
  const ds = TINH_IDS.filter((id) => quy.includes(id) && !DAT_VAN_LANG.includes(id));
  const v = vnNay(s);
  const cu = v.quy;
  v.quy = ds;
  return cu ? ds.filter((id) => !cu.includes(id)) : [];
}

/**
 * Nhận kết quả mùa trước (máy chủ trả) lúc `now`: mỗi mùa một lần ghi phúc lành cả mùa này và trả thưởng để trao (số
 * món đồ, huân công). Đã nhận, kết quả không phải của mùa ngay trước, hay không có kết quả thì trả null.
 */
export function nhanMua(s: GameState, t: MuaToi | null | undefined, now: number): (PhucTinh & { mon: number; huan: number }) | null {
  const v = s.vietNam;
  const mua = muaCua(now);
  if (!v || !t || !laTinh(t.tinh) || t.mua !== mua - 1 || v.phuc?.mua === mua) return null;
  const phuc: PhucTinh = { mua, pct: phucMua(t.hang, t.diet), tinh: t.tinh, hang: t.hang };
  v.phuc = phuc;
  return { ...phuc, ...thuongMua(t.hang, t.cua) };
}

/** Bỏ phúc lành đã hết mùa, danh hiệu đã hết tuần. Trả true nếu có gì đổi (để lưu, vẽ lại cờ). */
export function capNhatMua(s: GameState, now: number): boolean {
  const v = s.vietNam;
  if (!v) return false;
  let doi = false;
  if (v.phuc && v.phuc.mua !== muaCua(now)) {
    delete v.phuc;
    doi = true;
  }
  if (v.danhHieu && v.danhHieu.tuan !== tuanCua(now)) {
    delete v.danhHieu;
    doi = true;
  }
  return doi;
}

/** Danh hiệu đang giữ tuần này (cờ tỉnh trước Điện). */
export const danhHieuNay = (s: GameState, now: number): DanhHieu | null => {
  const d = s.vietNam?.danhHieu;
  return d && d.tuan === tuanCua(now) ? d : null;
};
