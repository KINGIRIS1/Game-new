// Ngày đêm ở kinh đô: giờ trong ngày suy từ đồng hồ chơi. Chỉ để vẽ trời và đèn đuốc, không luật nào đọc tới
// (xem docs/thiet-ke.md mục Ngày đêm). Bản lưu không thêm trường gì.

import { BUOI_MS, NGAY_MS } from './defs';

export type Buoi = keyof typeof BUOI_MS;
export const BUOI: readonly Buoi[] = ['ngay', 'chieu', 'dem', 'rang'];

/** Trọng số mỗi buổi, tổng bằng 1: lúc chuyển buổi thì hai buổi kề nhau pha vào nhau. */
export type TroiLuc = Record<Buoi, number>;

/** Số ms đã qua kể từ đầu ngày (0 tới `NGAY_MS`). Nhận cả đồng hồ chơi lẫn giờ trong ngày. */
export function gioTrongNgay(clock: number): number {
  const t = clock % NGAY_MS;
  return t < 0 ? t + NGAY_MS : t;
}

/** Buổi đang là lúc `clock`, theo bảng `BUOI_MS`. */
export function buoiLuc(clock: number): Buoi {
  const t = gioTrongNgay(clock);
  if (t >= BUOI_MS.rang) return 'rang';
  if (t >= BUOI_MS.dem) return 'dem';
  if (t >= BUOI_MS.chieu) return 'chieu';
  return 'ngay';
}

/** Giờ đại diện cho mỗi buổi (giữa buổi), để ghim giờ khi chụp thử. */
export function gioBuoi(b: Buoi): number {
  const end = { ngay: BUOI_MS.chieu, chieu: BUOI_MS.dem, dem: BUOI_MS.rang, rang: NGAY_MS }[b];
  return (BUOI_MS[b] + end) / 2;
}

const smooth = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/**
 * Trọng số bốn buổi lúc `clock`. Ban ngày và ban đêm thuần một buổi; chiều tà là ngày nhạt dần sang chiều (nửa đầu)
 * rồi chiều sang đêm (nửa sau), rạng đông là đêm sang rạng đông rồi rạng đông sang ngày. Mượt, liền, tuần hoàn.
 */
export function troiLuc(clock: number): TroiLuc {
  const t = gioTrongNgay(clock);
  const w: TroiLuc = { ngay: 0, chieu: 0, dem: 0, rang: 0 };
  const pha = (from: Buoi, to: Buoi, a: number, b: number) => {
    const s = smooth((t - a) / (b - a));
    w[from] = 1 - s;
    w[to] = s;
  };
  const giuaChieu = (BUOI_MS.chieu + BUOI_MS.dem) / 2;
  const giuaRang = (BUOI_MS.rang + NGAY_MS) / 2;
  if (t < BUOI_MS.chieu) w.ngay = 1;
  else if (t < giuaChieu) pha('ngay', 'chieu', BUOI_MS.chieu, giuaChieu);
  else if (t < BUOI_MS.dem) pha('chieu', 'dem', giuaChieu, BUOI_MS.dem);
  else if (t < BUOI_MS.rang) w.dem = 1;
  else if (t < giuaRang) pha('dem', 'rang', BUOI_MS.rang, giuaRang);
  else pha('rang', 'ngay', giuaRang, NGAY_MS);
  return w;
}

/** Độ tối lúc `clock`: 0 giữa ban ngày, 1 giữa đêm, nửa chừng lúc chiều tà, rạng đông. Đèn đuốc thắp theo số này. */
export function doToi(clock: number): number {
  const w = troiLuc(clock);
  return w.dem + 0.5 * (w.chieu + w.rang);
}
