// Cấu hình máy chủ Đấu thành lúc dựng bản game (biến VITE_SUPABASE_*, xem src/env.d.ts) và phiên đăng nhập cất ở
// máy này. Tách khỏi mayChu.ts để giao diện biết có máy chủ, đã đăng nhập chưa mà không phải nạp phần gọi mạng.

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? '';
export const PHIEN_KEY = 'tdvl-dau-thanh-phien';

/** Bản game này có máy chủ không (dựng không có biến Supabase thì chỉ đánh thử). */
export const coMayChu = (): boolean => !!SUPABASE_URL && !!SUPABASE_KEY;

/** Người dùng Supabase đã đăng nhập ẩn danh ở máy này (đọc phiên đã cất), hay null. */
export function uidMay(): string | null {
  try {
    const p = JSON.parse(localStorage.getItem(PHIEN_KEY) ?? 'null');
    return p && typeof p.uid === 'string' ? p.uid : null;
  } catch {
    return null;
  }
}
