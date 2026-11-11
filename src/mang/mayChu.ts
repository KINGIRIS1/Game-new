// Gọi máy chủ Đấu thành (Supabase, docs/thiet-ke.md, Kế hoạch: Đấu thành, PR 5): đăng nhập ẩn danh, gọi Edge
// Function `dau-thanh`. Chỉ nạp khi cần (mở bảng Đấu thành, hay mở game khi đã tham gia): `import('../mang/mayChu')`.
// Không dùng thư viện Supabase: chỉ cần hai đường Auth (đăng ký ẩn danh, làm mới phiên) và một đường hàm.
// Phiên đăng nhập cất ở localStorage của máy này, không vào bản lưu (mã lưu chép sang máy khác thì máy ấy chưa tham gia).
// PR 6: gắn Google vào người dùng ẩn danh, đăng nhập Google (đi qua trang Google rồi Supabase trả về trang game,
// `nhanGoogle` ở cauHinh.ts cất phiên), đăng xuất ở máy này, bảng xếp hạng, xem lại trận, lưu và tải bản lưu trên mây.

import type { PvpInput } from '../game/dauThanh';
import type { HoSo, KetQuaMay, MayTom, TranTom, XemLaiTra, XepHang } from '../game/dauThat';
import type { PvpAttack } from '../game/battle';
import { PHIEN_KEY, SUPABASE_KEY as KEY, SUPABASE_URL as URL_, coMayChu, datGoogleCho, docPhien, phienTuToken, type Phien } from './cauHinh';

export { coMayChu };
/** Chạy hàm ở vùng có cơ sở dữ liệu (Singapore): mỗi truy vấn khỏi vòng qua nửa vòng trái đất. */
const REGION = 'ap-southeast-1';
/** Mỗi lần gọi chờ lâu nhất chừng này (đánh lại trận nặng mất vài giây). */
const CHO_MS = 25_000;
/** Làm mới phiên khi còn dưới chừng này. */
const LAM_MOI_TRUOC_MS = 120_000;

export const LUAT_MA: string = __LUAT_MA__;

/** Lỗi gọi máy chủ: `mang` khi không nối được; còn lại là mã máy chủ trả (`capNhat`, `coKhien`, `nhieuQua`…). */
export class LoiMay extends Error {
  constructor(
    readonly ma: string,
    readonly status = 0,
    readonly chiTiet?: string,
  ) {
    super(ma);
  }
}

function ghiPhien(p: Phien | null): void {
  try {
    if (p) localStorage.setItem(PHIEN_KEY, JSON.stringify(p));
    else localStorage.removeItem(PHIEN_KEY);
  } catch {
    // Trình duyệt chặn lưu: phiên chỉ sống tới khi đóng trang.
  }
  nho = p;
}

let nho: Phien | null | undefined;
const phienNay = () => (nho === undefined ? (nho = docPhien()) : nho);

async function fetchJson(path: string, init: RequestInit): Promise<{ status: number; json: Record<string, unknown> | null }> {
  let res: Response;
  try {
    res = await fetch(`${URL_}${path}`, { ...init, signal: AbortSignal.timeout(CHO_MS) });
  } catch {
    throw new LoiMay('mang');
  }
  const json = await res.json().catch(() => null);
  return { status: res.status, json: json && typeof json === 'object' ? json : null };
}

/** Phiên Auth trả về (đăng ký hay làm mới): người dùng, đã gắn Google chưa, email. */
function phienTu(json: Record<string, unknown> | null): Phien | null {
  const user = json?.user as { id?: unknown; is_anonymous?: unknown; email?: unknown } | undefined;
  if (!json || typeof json.access_token !== 'string' || typeof json.refresh_token !== 'string' || typeof user?.id !== 'string') return null;
  const giay = typeof json.expires_in === 'number' ? json.expires_in : 3600;
  // Thân JWT đọc được thì theo JWT (như lúc Google trả về); không thì theo phần `user` của câu trả lời.
  return (
    phienTuToken(json.access_token, json.refresh_token, giay, Date.now()) ?? {
      access: json.access_token,
      refresh: json.refresh_token,
      het: Date.now() + giay * 1000,
      uid: user.id,
      google: user.is_anonymous === false,
      email: typeof user.email === 'string' && user.email ? user.email : null,
    }
  );
}

/** Đăng nhập ẩn danh (Supabase: Allow anonymous sign-ins). */
async function dangKy(): Promise<Phien> {
  const { status, json } = await fetchJson('/auth/v1/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY },
    body: JSON.stringify({ data: {} }),
  });
  const p = phienTu(json);
  if (!p) throw new LoiMay(status === 429 ? 'nhieuQua' : 'dangNhap', status);
  ghiPhien(p);
  return p;
}

/** Làm mới phiên. Phiên hỏng (bị thu hồi, người dùng bị xóa) thì bỏ phiên, trả null. */
async function lamMoi(p: Phien): Promise<Phien | null> {
  const { status, json } = await fetchJson('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY },
    body: JSON.stringify({ refresh_token: p.refresh }),
  });
  const next = phienTu(json);
  if (next) {
    ghiPhien(next);
    return next;
  }
  if (status >= 400 && status < 500) {
    ghiPhien(null);
    return null;
  }
  throw new LoiMay('mang', status);
}

let dangLamMoi: Promise<Phien | null> | null = null;

/** Phiên còn hạn (làm mới nếu sắp hết). `tao`: chưa có phiên thì đăng nhập ẩn danh. */
async function phien(tao: boolean): Promise<Phien | null> {
  let p = phienNay();
  if (p && p.het - Date.now() < LAM_MOI_TRUOC_MS) {
    dangLamMoi ??= lamMoi(p).finally(() => (dangLamMoi = null));
    p = await dangLamMoi;
  }
  if (!p && tao) p = await dangKy();
  return p;
}

/**
 * Gọi Edge Function: `hanh` và các trường khác. Máy chủ trả `ok: false` thì ném `LoiMay` với mã lỗi ấy. Máy chủ báo
 * chưa đăng nhập (phiên hết hạn sớm hơn giờ máy tưởng) thì làm mới phiên rồi gọi lại một lần.
 */
async function goi<T>(body: Record<string, unknown>, tao = false, lan = 0): Promise<T> {
  if (!coMayChu()) throw new LoiMay('khongCoMayChu');
  const p = body.hanh === 'ping' ? null : await phien(tao);
  if (body.hanh !== 'ping' && !p) throw new LoiMay('chuaDangNhap', 401);
  const { status, json } = await fetchJson('/functions/v1/dau-thanh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, 'x-region': REGION, ...(p ? { Authorization: `Bearer ${p.access}` } : {}) },
    body: JSON.stringify({ luat: LUAT_MA, ...body }),
  });
  if (!json) throw new LoiMay(status >= 500 || !status ? 'mayChu' : 'mang', status);
  if (json.ok !== true) {
    if (json.loi === 'chuaDangNhap' && p && lan === 0) {
      ghiPhien({ ...p, het: 0 });
      return goi<T>(body, tao, 1);
    }
    throw new LoiMay(typeof json.loi === 'string' ? json.loi : 'mayChu', status, typeof json.chiTiet === 'string' ? json.chiTiet : undefined);
  }
  return json as T;
}

// ---------- Lệnh ----------

/** Đối thủ máy chủ tìm cho (kinh đô máy thì `may`, id `'may'`, không tên). */
export interface DoiThu {
  id: string;
  may: boolean;
  ten: string | null;
  dien: number;
  chienCong: number;
  banChup: string;
}

export const ping = () => goi<{ luat: string; nguoi: number }>({ hanh: 'ping' });

/** Tham gia (đăng nhập ẩn danh nếu chưa) hay đổi tên, kèm bản chụp kinh đô. */
export const thamGia = (ten: string, banChup: string) => goi<{ toi: HoSo }>({ hanh: 'thamGia', ten, banChup }, true);

export const taiBanChup = (banChup: string) => goi<{ ok: true }>({ hanh: 'banChup', banChup });

export const toi = () => goi<{ toi: HoSo; biDanh: TranTom[]; daDanh: TranTom[] }>({ hanh: 'toi' });

export const tim = (bo: string[]) => goi<{ doiThu: DoiThu }>({ hanh: 'tim', bo });

/** Bắt đầu trận: quân máy chủ dựng (đánh đúng quân này), bản chụp kinh đô bị đánh, hạn khóa. */
export const danh = (doiThu: string, quan: Record<string, number>, huong: 'bac' | 'tay', banChup: string) =>
  goi<{ tran: string; quan: PvpAttack; banChup: string; het: number }>({ hanh: 'danh', doiThu, quan, huong, banChup });

export const xong = (tran: string, bam: PvpInput[]) => goi<{ ketQua: KetQuaMay; toi?: HoSo }>({ hanh: 'xong', tran, bam });

export const roi = () => goi<{ ok: true }>({ hanh: 'roi' });

// ---------- PR 6: bảng xếp hạng, xem lại trận, lưu game lên mây ----------

export const xepHang = () => goi<XepHang>({ hanh: 'xepHang' });

export const xemLai = (tran: string) => goi<XemLaiTra>({ hanh: 'xemLai', tran });

/** Lưu mã lưu lên mây. `goc`: số bản máy này biết (0 nếu chưa biết); `de`: ghi đè dù máy khác đã lưu bản mới hơn. */
export const luuMay = (ma: string, dien: number, goc: number, de = false) =>
  goi<{ ban: number; luc: number }>({ hanh: 'luuMay', ma, dien, goc, ...(de ? { de: true } : {}) });

/** Bản lưu trên mây của mình (`chiXem`: không kèm mã lưu), hay null nếu chưa có. */
export const taiMay = (chiXem = false) => goi<{ may: (MayTom & { ma?: string }) | null }>({ hanh: 'taiMay', ...(chiXem ? { chiXem: true } : {}) });

// ---------- PR 6: Google ----------

/** Địa chỉ trang game để Supabase Auth trả người chơi về (phải nằm trong Redirect URLs của dự án Supabase). */
const trangGame = () => location.origin + location.pathname;

let googleBat: Promise<boolean> | null = null;

/** Máy chủ đã bật đăng nhập Google chưa (Supabase → Authentication → Providers). Hỏi một lần mỗi lần mở trang. */
export function coGoogle(): Promise<boolean> {
  if (!coMayChu()) return Promise.resolve(false);
  return (googleBat ??= fetchJson('/auth/v1/settings', { headers: { apikey: KEY } })
    .then(({ json }) => (json?.external as { google?: unknown } | undefined)?.google === true)
    .catch(() => {
      googleBat = null;
      return false;
    }));
}

function datCho(kieu: 'gan' | 'vao'): void {
  try {
    datGoogleCho(kieu, Date.now());
  } catch {
    throw new LoiMay('luuPhien');
  }
}

/**
 * Gắn Google vào người dùng đang đăng nhập ở máy này (Supabase: Allow manual linking): xin địa chỉ trang Google rồi
 * chuyển trang. Xong thì Supabase trả về trang game kèm phiên mới của cùng người dùng (`nhanGoogle` ở cauHinh.ts).
 */
export async function ganGoogle(): Promise<void> {
  const p = await phien(false);
  if (!p) throw new LoiMay('chuaDangNhap', 401);
  const { status, json } = await fetchJson(
    `/auth/v1/user/identities/authorize?provider=google&redirect_to=${encodeURIComponent(trangGame())}&skip_http_redirect=true`,
    { headers: { apikey: KEY, Authorization: `Bearer ${p.access}` } },
  );
  if (typeof json?.url !== 'string') throw new LoiMay(status === 401 || status === 403 ? 'chuaDangNhap' : 'googleChuaBat', status);
  datCho('gan');
  location.assign(json.url);
}

/**
 * Đăng nhập Google khi máy này chưa có người chơi Đấu thành nào để giữ (máy mới, người chơi chưa tham gia): chuyển
 * sang trang Google; về thì máy này là người dùng của tài khoản Google ấy (chưa có thì Supabase lập mới).
 */
export function vaoGoogle(): void {
  datCho('vao');
  location.assign(`${URL_}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(trangGame())}`);
}

/**
 * Đăng xuất ở máy này: báo Supabase thu phiên của riêng máy này (không được cũng thôi), rồi bỏ phiên đã cất. Bản lưu
 * ở máy và trên mây không đổi; đăng nhập Google lại là có lại.
 */
export async function dangXuat(): Promise<void> {
  const p = phienNay();
  ghiPhien(null);
  if (!p) return;
  await fetchJson('/auth/v1/logout?scope=local', { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${p.access}` } }).catch(() => undefined);
}
