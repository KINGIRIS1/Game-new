// Cấu hình máy chủ Đấu thành lúc dựng bản game (biến VITE_SUPABASE_*, xem src/env.d.ts) và phiên đăng nhập cất ở
// máy này. Tách khỏi mayChu.ts để giao diện biết có máy chủ, đã đăng nhập chưa mà không phải nạp phần gọi mạng.
// PR 6: đọc phiên Supabase Auth trả về sau khi người chơi qua trang Google (gắn Google, hay đăng nhập ở máy mới).

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? '';
export const PHIEN_KEY = 'tdvl-dau-thanh-phien';
/** Bản lưu trên mây máy này biết: của người dùng nào, số bản, lúc lưu (giờ máy chủ). Không vào bản lưu. */
export const MAY_KEY = 'tdvl-luu-may';
/**
 * Đang chờ Google trả về trang game, và để làm gì: gắn vào người dùng đang có (`gan`), hay đăng nhập ở máy mới
 * (`vao`), kèm lúc bấm (`gan:1700000000000`). Dấu chỉ có giá trị `GOOGLE_CHO_MS`: bấm rồi bỏ dở thì về sau không còn
 * nhận phiên từ địa chỉ nữa.
 */
export const GOOGLE_CHO_KEY = 'tdvl-google-cho';
export const GOOGLE_CHO_MS = 15 * 60_000;

/** Ghi dấu chờ ngay trước khi chuyển sang trang Google. */
export function datGoogleCho(kieu: 'gan' | 'vao', now: number): void {
  localStorage.setItem(GOOGLE_CHO_KEY, `${kieu}:${now}`);
}

/** Dấu chờ còn hạn thì trả việc đang chờ, không thì null. */
function docGoogleCho(raw: string | null, now: number): 'gan' | 'vao' | null {
  const [kieu, luc] = (raw ?? '').split(':');
  const t = Number(luc);
  if ((kieu !== 'gan' && kieu !== 'vao') || !Number.isFinite(t) || now < t || now - t > GOOGLE_CHO_MS) return null;
  return kieu;
}

/** Bản game này có máy chủ không (dựng không có biến Supabase thì chỉ đánh thử). */
export const coMayChu = (): boolean => !!SUPABASE_URL && !!SUPABASE_KEY;

/** Phiên đăng nhập Supabase cất ở localStorage của máy này. */
export interface Phien {
  access: string;
  refresh: string;
  /** Hết hạn lúc này (ms, giờ máy). */
  het: number;
  uid: string;
  /** Đã gắn Google (không còn là người dùng ẩn danh). */
  google?: boolean;
  email?: string | null;
}

export function docPhien(): Phien | null {
  try {
    const p = JSON.parse(localStorage.getItem(PHIEN_KEY) ?? 'null');
    return p && typeof p.access === 'string' && typeof p.refresh === 'string' && typeof p.uid === 'string' && typeof p.het === 'number' ? p : null;
  } catch {
    return null;
  }
}

/** Người dùng Supabase đã đăng nhập ở máy này (đọc phiên đã cất), hay null. */
export function uidMay(): string | null {
  return docPhien()?.uid ?? null;
}

/** Tài khoản ở máy này: đã gắn Google chưa, email Google (chỉ để hiện cho chính người chơi). */
export function taiKhoanMay(): { uid: string; google: boolean; email: string | null } | null {
  const p = docPhien();
  return p ? { uid: p.uid, google: p.google === true, email: typeof p.email === 'string' ? p.email : null } : null;
}

/** Phần thân của một JWT (không kiểm chữ ký: máy chủ mới là nơi kiểm), hay null nếu không đọc được. */
export function docJwt(token: string): Record<string, unknown> | null {
  const part = token.split('.');
  if (part.length !== 3) return null;
  try {
    const b64 = part[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
    const v = JSON.parse(new TextDecoder().decode(bytes));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Phiên từ token Supabase Auth cấp: người dùng, đã gắn Google chưa, email đọc từ thân JWT. */
export function phienTuToken(access: string, refresh: string, giay: number, now: number): Phien | null {
  const jwt = docJwt(access);
  if (!jwt || typeof jwt.sub !== 'string' || !UUID.test(jwt.sub) || !refresh) return null;
  return {
    access,
    refresh,
    het: now + (Number.isFinite(giay) && giay > 0 ? giay : 3600) * 1000,
    uid: jwt.sub,
    google: jwt.is_anonymous === false,
    email: typeof jwt.email === 'string' && jwt.email ? jwt.email : null,
  };
}

/**
 * Supabase Auth trả người chơi về trang game sau khi qua Google, kèm phiên ở sau dấu `#` (`access_token`,
 * `refresh_token`, `expires_in`), hay lỗi (`error_code`, cũng có khi ở sau dấu `?`). Đọc ra phiên hay mã lỗi; địa chỉ
 * không có gì của Supabase thì null.
 */
export function docTraVe(hash: string, search: string, now: number): { phien: Phien } | { loi: string } | null {
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const q = new URLSearchParams(search.replace(/^\?/, ''));
  const loi = h.get('error_code') ?? q.get('error_code') ?? h.get('error') ?? q.get('error');
  if (loi) return { loi };
  const access = h.get('access_token');
  if (!access) return null;
  const phien = phienTuToken(access, h.get('refresh_token') ?? '', Number(h.get('expires_in')), now);
  return phien ? { phien } : { loi: 'phien' };
}

/** Việc Google vừa trả về: gắn Google (`gan`) hay đăng nhập ở máy mới (`vao`); được thì có email, không thì mã lỗi. */
export type GoogleVe = { kieu: 'gan' | 'vao' } & ({ email: string | null } | { loi: string });

/**
 * Gọi một lần lúc mở trang: nếu Supabase Auth vừa trả người chơi về từ Google thì cất phiên mới, xóa phiên và lỗi khỏi
 * thanh địa chỉ. Chỉ nhận phiên khi chính máy này vừa bấm nút Google (có dấu chờ), để một đường dẫn lạ có sẵn phiên
 * của người khác không đổi được tài khoản ở máy này; gắn Google thì phiên mới phải là của đúng người dùng đang có.
 */
export function nhanGoogle(): GoogleVe | null {
  if (!coMayChu() || typeof location === 'undefined') return null;
  let ve: ReturnType<typeof docTraVe>;
  let kieu: 'gan' | 'vao' | null = null;
  try {
    ve = docTraVe(location.hash, location.search, Date.now());
    if (!ve) return null;
    kieu = docGoogleCho(localStorage.getItem(GOOGLE_CHO_KEY), Date.now());
    localStorage.removeItem(GOOGLE_CHO_KEY);
    // Bỏ phiên, lỗi khỏi địa chỉ (cả tham số lỗi sau dấu ?), giữ đường dẫn trang game.
    const q = new URLSearchParams(location.search);
    for (const k of ['error', 'error_code', 'error_description']) q.delete(k);
    const con = q.toString();
    history.replaceState(null, '', location.pathname + (con ? `?${con}` : ''));
  } catch {
    return null;
  }
  if (!kieu) return null;
  if ('loi' in ve) return { kieu, loi: ve.loi };
  if (kieu === 'gan' && docPhien()?.uid !== ve.phien.uid) return { kieu, loi: 'khacNguoi' };
  try {
    localStorage.setItem(PHIEN_KEY, JSON.stringify(ve.phien));
  } catch {
    return { kieu, loi: 'luuPhien' };
  }
  return { kieu, email: ve.phien.email ?? null };
}

/** Bản lưu trên mây máy này biết (của người dùng `uid`): số bản và lúc lưu. */
export interface MayBiet {
  uid: string;
  ban: number;
  luc: number;
}

export function mayBiet(uid: string | null): MayBiet | null {
  try {
    const v = JSON.parse(localStorage.getItem(MAY_KEY) ?? 'null');
    return v && v.uid === uid && typeof v.ban === 'number' && typeof v.luc === 'number' ? v : null;
  } catch {
    return null;
  }
}

export function ghiMayBiet(v: MayBiet | null): void {
  try {
    if (v) localStorage.setItem(MAY_KEY, JSON.stringify(v));
    else localStorage.removeItem(MAY_KEY);
  } catch {
    // Trình duyệt chặn lưu: lần lưu sau máy chủ sẽ báo lệch, người chơi chọn lại.
  }
}
