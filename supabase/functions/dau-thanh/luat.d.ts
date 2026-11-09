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
};

export type TenLoi = 'ngan' | 'dai' | 'kyTu' | 'tuc';
export declare function kiemTen(raw: unknown): { ten: string } | { loi: TenLoi };

export declare function nhanBanChup(ma: unknown): { ma: string; dien: number } | { loi: string };
export declare function kinhDoMay(dien: number): { ma: string; dien: number };

/** Quân đánh thành máy chủ dựng (JSON, lưu ở cột `tran.quan`). */
export type QuanDanh = {
  army: Record<string, number>;
  heroes: Record<string, string | boolean>[];
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
