// Nhịp khung hình: vòng lặp ở main.ts chạy theo requestAnimationFrame, tức theo tần số màn hình (điện thoại mới 90,
// 120 Hz). Vẽ cả cảnh 3D mỗi lần như vậy làm máy nóng nhanh, nên vòng lặp hỏi `NhipKhung` xem khung này có chạy không:
// cài đặt Khung hình (30, 60 hay theo màn hình), màn hình vào game 30 khung, bảng che kín cảnh thì thưa hẳn.

/** Các mức của cài đặt Khung hình (số khung mỗi giây); 0 là theo màn hình, không giới hạn. Lưu riêng từng máy. */
export const KHUNG_CHON = [30, 60, 0] as const;
export type KhungChon = (typeof KHUNG_CHON)[number];
/** Mặc định 60: màn 60 Hz vẫn y như cũ, màn 120 Hz đỡ một nửa số lần vẽ. */
export const KHUNG_MAC_DINH: KhungChon = 60;
/** Màn hình vào game: chỉ có camera trôi chậm sau tên game, 30 khung là đủ mượt. */
export const KHUNG_MAN_VAO = 30;
/**
 * Bảng che kín cảnh (bản đồ phó bản, bảng tướng, nhắc xoay ngang): không vẽ cảnh, vòng lặp vẫn chạy để luật chơi, trận
 * Đấu thành, dòng tin theo kịp. 10 khung thì mỗi khung 0,1 giây, vừa đúng trần `dt` của vòng lặp, nên trận không chậm đi.
 */
export const KHUNG_CHE = 10;
/** Dấu giờ của requestAnimationFrame xê dịch chút ít: tới sớm hơn hẹn chừng này mili giây vẫn cho chạy. */
const DUNG_SAI_MS = 2;

/** Mức đọc từ bộ nhớ máy: chuỗi hỏng hay mức không có thì về mặc định. */
export function docKhung(s: string | null): KhungChon {
  const n = Number(s);
  return s !== null && s !== '' && (KHUNG_CHON as readonly number[]).includes(n) ? (n as KhungChon) : KHUNG_MAC_DINH;
}

/**
 * Hẹn giờ khung kế. Hẹn cộng dồn từng bước (không tính lại từ lúc chạy), nên màn 90 Hz giới hạn 60 khung chạy đều hai
 * trên ba lần, vẫn ra 60 khung mỗi giây chứ không tụt về 45.
 */
export class NhipKhung {
  private hen = 0;
  private fps = -1;

  /** Khung có dấu giờ `now` (ms) có chạy không, với giới hạn `fps` khung mỗi giây (0 là khung nào cũng chạy). */
  chay(now: number, fps: number): boolean {
    if (fps <= 0) {
      this.fps = fps;
      return true;
    }
    const buoc = 1000 / fps;
    // Vừa đổi mức (đóng bảng che kín, vào game): chạy ngay, hẹn lại từ đây, khỏi chờ hẹn cũ của mức thưa.
    if (fps !== this.fps) {
      this.fps = fps;
      this.hen = now + buoc;
      return true;
    }
    if (now < this.hen - DUNG_SAI_MS) return false;
    // Trễ quá một bước (máy khựng, tab vừa hiện lại) thì hẹn lại từ bây giờ, không chạy dồn cho kịp.
    this.hen = now - this.hen > buoc ? now + buoc : this.hen + buoc;
    return true;
  }
}
