// Gọi máy chủ Đấu thành (Supabase, docs/thiet-ke.md, Kế hoạch: Đấu thành, PR 5): đăng nhập ẩn danh, gọi Edge
// Function `dau-thanh`. Chỉ nạp khi cần (mở bảng Đấu thành, hay mở game khi đã tham gia): `import('../mang/mayChu')`.
// Không dùng thư viện Supabase: chỉ cần hai đường Auth (đăng ký ẩn danh, làm mới phiên) và một đường hàm.
// Phiên đăng nhập cất ở localStorage của máy này, không vào bản lưu (mã lưu chép sang máy khác thì máy ấy chưa tham gia).

import type { PvpInput } from '../game/dauThanh';
import type { HoSo, KetQuaMay, TranTom } from '../game/dauThat';
import type { PvpAttack } from '../game/battle';
import { PHIEN_KEY, SUPABASE_KEY as KEY, SUPABASE_URL as URL_, coMayChu } from './cauHinh';

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

interface Phien {
  access: string;
  refresh: string;
  /** Hết hạn lúc này (ms, giờ máy). */
  het: number;
  uid: string;
}

function docPhien(): Phien | null {
  try {
    const p = JSON.parse(localStorage.getItem(PHIEN_KEY) ?? 'null');
    return p && typeof p.access === 'string' && typeof p.refresh === 'string' && typeof p.uid === 'string' && typeof p.het === 'number' ? p : null;
  } catch {
    return null;
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

/** Phiên Auth trả về (đăng ký hay làm mới). */
function phienTu(json: Record<string, unknown> | null): Phien | null {
  const user = json?.user as { id?: unknown } | undefined;
  if (!json || typeof json.access_token !== 'string' || typeof json.refresh_token !== 'string' || typeof user?.id !== 'string') return null;
  const giay = typeof json.expires_in === 'number' ? json.expires_in : 3600;
  return { access: json.access_token, refresh: json.refresh_token, het: Date.now() + giay * 1000, uid: user.id };
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
