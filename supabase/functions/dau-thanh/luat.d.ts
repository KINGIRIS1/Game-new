// Kiểu của luat.js (luật máy chủ Đấu thành, đóng gói từ src/game/mayChu.ts bằng `node scripts/luat.mjs`).
// Viết tay, chỉ phần máy chủ dùng; src/game/mayChu.test.ts canh đủ tên hàm khớp mayChu.ts.

export declare const LUAT_MA: string;

export declare const CAU_HINH: {
  readonly unlockDien: number;
  readonly lockS: number;
  readonly shieldH: number;
  readonly rematchH: number;
  readonly matchDien: number;
  readonly matchDienWide: number;
  readonly findPerH: number;
  readonly attackPerH: number;
  readonly snapPerH: number;
  readonly keepDays: number;
  readonly rankTop: number;
  readonly rankPerH: number;
  readonly replayPerH: number;
  readonly savePerH: number;
  readonly saveMax: number;
  readonly gopNgay: number;
  readonly topTinh: number;
  readonly doiChucMs: number;
  readonly gopPerH: number;
  readonly chonPerH: number;
  readonly bangPerH: number;
  readonly giacPerH: number;
  readonly giacTranNgay: number;
  readonly giacXongMs: number;
  readonly giuNgay: number;
};

export type TenLoi = 'ngan' | 'dai' | 'kyTu' | 'tuc';
export declare function kiemTen(raw: unknown): { ten: string } | { loi: TenLoi };

export declare function nhanBanChup(ma: unknown): { ma: string; dien: number } | { loi: string };
export declare function kinhDoMay(dien: number): { ma: string; dien: number };
export declare function truCua(ma: string, cuop: unknown): string;

/**
 * Quân đánh thành máy chủ dựng (JSON, lưu ở cột `tran.quan`). Tướng mặc đồ có `trangBi`: chỉ số đồ máy chủ tính lại từ
 * món trong bản chụp người đánh.
 */
export type QuanDanh = {
  army: Record<string, number>;
  heroes: { kind: string; trangBi?: Record<string, number | boolean>; [k: string]: string | boolean | Record<string, number | boolean> | undefined }[];
  side: 'bac' | 'tay';
  seed: number;
  bonus: number;
  arms: Record<string, number>;
  huan?: Record<string, number>;
}
export declare function quanDanh(atkMa: string, army: unknown, side: unknown, seed: number): { quan: QuanDanh } | { loi: string };

export type KetQua = {
  sao: number;
  pct: number;
  dien: boolean;
  kho: number;
  khoTotal: number;
  cuop: Record<string, number>;
  chienCong: { atk: number; def: number };
  mat: Record<string, number>;
  buoc: number;
  bam: number;
}
export declare function danhLai(
  defMa: string,
  quan: QuanDanh,
  inputs: unknown,
  opts: { atkDien: number; atkTrophies: number; defTrophies: number; bot: boolean },
): KetQua;

export type UngVien = {
  id: string;
  dien: number;
  trophies: number;
}
export declare function chonDoiThu(me: { dien: number; trophies: number }, list: UngVien[], r: number): string | null;

export declare function doiChieu(): string[];
export declare function banChupThu(dien: number): { ma: string; quan: Record<string, number> };
export declare function bamThu(): { s: number; k: string }[];

// ---------- Bản đồ Việt Nam: điểm tỉnh (PR 2) ----------

export type ChucId = 'quan' | 'nong' | 'thuy' | 'thuong' | 'bien' | 'hai';
export declare function kiemTinh(tinh: unknown): string | null;
export declare function kiemChuc(tinh: string, chuc: unknown): { chuc: ChucId } | { loi: 'khongCoChuc' | 'chucChiGiapBien' };
export declare function muaTinh(now: number): number;
export declare function ngayTinh(now: number): number;
export type LoiGop = 'banChup' | 'chucKhongGop' | 'gopSai' | 'thieuCua' | 'itQua';
export declare function gopTinh(
  ma: unknown,
  chuc: unknown,
  gop: unknown,
): { diem: number; gop: Record<string, number>; dien: number } | { loi: LoiGop; chiTiet?: string };
export declare function banChupGop(dien: number, kho: number): { ma: string; cap: number };

// ---------- Giặc chung của tỉnh (PR 3) ----------
export type NhomGiac = 'bac' | 'tay' | 'bien';
export type UnitType = 'giao' | 'cung' | 'voi' | 'no';
export interface QuanGiac {
  army: Record<UnitType, number>;
  rows: Record<UnitType, 'tien' | 'trung' | 'hau'>;
}
export type LoiGiac = 'banChup' | 'quan';
export declare function nhanGiac(ma: unknown, army: unknown, rows: unknown): { ma: string; quan: QuanGiac; chuong: number } | { loi: LoiGiac; chiTiet?: string };
export declare function danhGiac(
  ma: string,
  quan: QuanGiac,
  nhom: NhomGiac,
  seed: number,
  inputs: unknown,
  he: number,
): { pha: number; sat: number; buoc: number; bam: number; thang: boolean; mat: Record<UnitType, number> };
export declare function banChupGiac(dien: number): { ma: string; troops: Record<UnitType, number>; chuong: number };
export declare function chiaDiem(diem: number, ta: string, giup: string): { ta: number; giup: number };
export declare function daoTuan(tuan: number): { nhom: NhomGiac; tinh: string[] };
export declare function giacDangDanh(now: number): number | null;
export declare function giacToiLuc(tuan: number): number;
export declare function giacRutLuc(tuan: number): number;
export declare function heChuc(chuc: ChucId | null, nhom: NhomGiac): number;
export declare function laTinhGiac(id: unknown, tuan: number): boolean;
export declare function mauDao(nguoi: number): number;
export declare function ngayTuan(tuan: number): { tu: number; den: number };
export declare function noiDanh(ta: string, tinhGiac: readonly string[]): string[];
export declare function thuCua(now: number): number;
export declare function tuanTinh(now: number): number;
