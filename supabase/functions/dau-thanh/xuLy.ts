// Edge Function Đấu thành: các lệnh máy chủ (docs/thiet-ke.md, Kế hoạch: Đấu thành, mục Server).
// Máy khách gửi POST JSON `{ hanh, luat, ... }` (luat là mã băm luật của bản game, lệch thì báo cập nhật game):
//   ping                         không cần đăng nhập: mã luật máy chủ, số người chơi; dọn dữ liệu cũ
//   thamGia { ten, banChup }     tham gia (hay đổi tên) kèm bản chụp kinh đô
//   banChup { banChup }          tải bản chụp kinh đô mới
//   toi                          hồ sơ, trận mình bị đánh, trận mình đánh
//   tim { bo? }                  tìm đối thủ (bỏ qua các id trong `bo`); không ai thì kinh đô máy
//   danh { doiThu, quan, huong, banChup? }
//                                bắt đầu trận (kèm bản chụp mới của mình, để quân có là quân lúc này): khóa người
//                                giữ thành, mình mất khiên; trả quân máy chủ dựng
//   xong { tran, bam }           gửi các lần bấm: máy chủ đánh lại, ghi kết quả, chiến công, khiên; trừ của bị cướp
//                                khỏi kho trong bản chụp người giữ thành
//   roi                          rời Đấu thành (xóa người chơi và bản chụp)
//   xepHang                      bảng xếp hạng: những người chiến công cao nhất, hạng của mình (PR 6)
//   xemLai { tran }              bản chụp, quân, các lần bấm của một trận mình đánh hay bị đánh, để máy khách đánh
//                                lại cho người chơi xem; chỉ khi trận đóng bằng đúng bản luật đang chạy
//   luuMay { ma, dien, goc, de? } lưu game lên mây (người đã gắn Google); `goc` là số bản máy này biết, lệch thì máy
//                                khác đã lưu bản mới hơn (`de`: ghi đè)
//   taiMay { chiXem? }           bản lưu trên mây của mình (`chiXem`: chỉ số bản, lúc lưu, cấp Điện)
// Bản đồ Việt Nam (PR 2: máy chủ điểm tỉnh; không cần tham gia Đấu thành, chỉ cần đăng nhập, kể cả ẩn danh):
//   bangTinh                     bảng tỉnh mùa này (điểm cộng 30 người góp nhiều nhất, số người, số người góp),
//                                tỉnh, chức, điểm của mình; không đăng nhập cũng xem được bảng (không có phần mình)
//   chonTinh { tinh }            chọn tỉnh (mỗi mùa đổi một lần; sang tỉnh không giáp biển thì mất Bồ chính hải)
//   chonChuc { chuc }            nhận chức Bồ chính (đổi chức chờ 24 giờ)
//   gop { gop, banChup }         góp của cho tỉnh kèm bản chụp kinh đô lúc góp: kho phải có đủ, đúng loại của chức;
//                                điểm theo phần trăm sức chứa kho, trần mỗi ngày (giờ Việt Nam)
// Giặc chung của tỉnh (PR 3; bảng tỉnh trả thêm `giac`: đạo giặc tuần này, máu từng tỉnh, số trận hôm nay, đạo đã
// diệt mình có đánh):
//   giacDanh { tinh, quan, hang, banChup }
//                                bắt đầu trận ở tỉnh mình (hay tỉnh láng giềng khi tỉnh mình không có giặc), giặc đang
//                                đánh, chưa quá số trận mỗi ngày: cất bản chụp, quân; trả hạt giống, hệ số chức
//   giacXong { tran, bam }       gửi các lần bấm: máy chủ đánh lại, trừ máu đạo, ghi điểm tỉnh (giúp láng giềng thì
//                                chia đôi); quá giờ thì như rút quân ở bước đầu
// Kết quả trận chỉ do máy chủ tính (`danhLai` trong luat.js, đóng gói từ src/game/mayChu.ts).

import postgres from 'npm:postgres@3.4.9';
import {
  CAU_HINH,
  LUAT_MA,
  chiaDiem,
  chonDoiThu,
  danhGiac,
  danhLai,
  daoTuan,
  giacDangDanh,
  heChuc,
  mauDao,
  ngayTuan,
  nhanGiac,
  noiDanh,
  tuanTinh,
  gopTinh,
  kiemChuc,
  kiemTen,
  kiemTinh,
  kinhDoMay,
  muaTinh,
  ngayTinh,
  nhanBanChup,
  quanDanh,
  truCua,
  type ChucId,
  type KetQua,
  type QuanDanh,
  type QuanGiac,
} from './luat.js';

type Sql = postgres.Sql;
type Tx = postgres.TransactionSql;

/** Người gọi: id người dùng Supabase, và còn là người dùng ẩn danh hay đã gắn Google. */
export interface NguoiGoi {
  id: string;
  anDanh: boolean;
}

export interface MoiTruong {
  sql: Sql;
  /** Người dùng Supabase của người gọi (từ JWT trong `Authorization`), hay null nếu không đăng nhập. */
  nguoiDung: (req: Request) => Promise<NguoiGoi | null>;
  /** Đồng hồ (mili giây); test cho chạy nhanh. */
  bayGio?: () => number;
  /** Số ngẫu nhiên trong [0, 1): hạt giống trận, chọn đối thủ. */
  ngauNhien?: () => number;
}

/** Lỗi trả cho máy khách: mã lỗi, mã HTTP, chi tiết (như lý do bản chụp sai). */
class Loi extends Error {
  constructor(
    readonly ma: string,
    readonly status = 400,
    readonly chiTiet?: string,
  ) {
    super(ma);
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  // x-region: máy khách xin chạy hàm ở vùng có cơ sở dữ liệu (Singapore).
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const tra = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Thân yêu cầu dài nhất nhận (bản chụp tối đa 64 nghìn ký tự, cộng phần khác); riêng `luuMay` mang cả mã lưu. */
const MAX_BODY = 80_000;
const MAX_BODY_LUU = CAU_HINH.saveMax + 2_000;
/** Mã lưu game (`toCode` ở src/game/save.ts): tiền tố rồi base64. */
const MA_LUU = /^TDVL2:[A-Za-z0-9+/=]+$/;
const GIO = 3_600_000;
/** Đóng một trận hỏng quá chừng này lần (hàm bị ngắt vì quá giới hạn CPU) thì đóng như người đánh rút quân ngay. */
const LAN_DONG_MAX = 2;
const NGAY = 24 * GIO;

/** Người gọi theo JWT: hỏi Supabase Auth (chạy được với mọi kiểu khóa ký JWT, cả khóa publishable lẫn anon). */
export function nguoiDungTuSupabase(url: string, anonKey?: string) {
  return async (req: Request): Promise<NguoiGoi | null> => {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (token.split('.').length !== 3) return null;
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: req.headers.get('apikey') ?? anonKey ?? '' },
    });
    if (!res.ok) return null;
    const user = await res.json().catch(() => null);
    // Chỉ khi Supabase nói rõ không còn ẩn danh (đã gắn Google) mới coi là đã gắn.
    return typeof user?.id === 'string' && UUID.test(user.id) ? { id: user.id, anDanh: user.is_anonymous !== false } : null;
  };
}

interface NguoiChoi {
  id: string;
  ten: string;
  chien_cong: number;
  dien: number;
  khien_den: Date | null;
  khoa_den: Date | null;
}

interface TranRow {
  id: string;
  nguoi_danh: string | null;
  nguoi_giu: string | null;
  may: boolean;
  ten_danh: string;
  ten_giu: string;
  dien_danh: number;
  dien_giu: number;
  ban_chup: string;
  quan: QuanDanh;
  trang_thai: 'dang' | 'xong';
  bam: unknown;
  ket_qua: (KetQua & { ms: number }) | null;
  /** Mã luật đã đánh lại trận (trận đóng trước PR 6 thì không có). */
  luat: string | null;
  bat_dau: Date;
  xong_luc: Date | null;
}

export function taoXuLy(env: MoiTruong): (req: Request) => Promise<Response> {
  const { sql } = env;
  const bayGio = env.bayGio ?? Date.now;
  const ngauNhien = env.ngauNhien ?? Math.random;
  const luc = (ms: number) => new Date(ms);

  // ---------- Đọc ----------

  async function nguoi(me: string): Promise<NguoiChoi | undefined> {
    const [p] = await sql<NguoiChoi[]>`select id, ten, chien_cong, dien, khien_den, khoa_den from public.nguoi_choi where id = ${me}`;
    return p;
  }

  async function canNguoi(me: string): Promise<NguoiChoi> {
    const p = await nguoi(me);
    if (!p) throw new Loi('chuaThamGia', 403);
    return p;
  }

  async function banChupCua(me: string): Promise<string> {
    const [b] = await sql<{ ma: string }[]>`select ma from public.ban_chup where nguoi = ${me}`;
    if (!b) throw new Loi('chuaCoBanChup', 403);
    return b.ma;
  }

  const hoSo = (p: NguoiChoi, now: number) => ({
    ten: p.ten,
    chienCong: p.chien_cong,
    dien: p.dien,
    khienDen: p.khien_den && p.khien_den.getTime() > now ? p.khien_den.getTime() : null,
  });

  /** Trận gửi cho máy khách (không kèm bản chụp, quân). */
  const tomTran = (t: TranRow) => ({
    id: t.id,
    may: t.may,
    tenDanh: t.ten_danh,
    tenGiu: t.ten_giu,
    dienDanh: t.dien_danh,
    dienGiu: t.dien_giu,
    batDau: t.bat_dau.getTime(),
    xong: t.trang_thai === 'xong',
    ketQua: t.ket_qua,
    // Xem lại được: trận đã đóng bằng đúng bản luật đang chạy (luật đổi thì cùng lần bấm ra trận khác).
    xemLai: t.trang_thai === 'xong' && t.luat === LUAT_MA,
  });

  /** Không quá `max` lần mỗi giờ cho mỗi loại lệnh. */
  async function demLuot(me: string, loai: string, max: number, now: number) {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from public.luot_goi where nguoi = ${me} and loai = ${loai} and luc > ${luc(now - GIO)}`;
    if (n >= max) throw new Loi('nhieuQua', 429);
    await sql`insert into public.luot_goi (nguoi, loai, luc) values (${me}, ${loai}, ${luc(now)})`;
  }

  // ---------- Đóng trận ----------

  /**
   * Đánh lại trận rồi ghi kết quả: chiến công hai bên, khiên người giữ thành, mở khóa. Hai lần đóng cùng một trận thì
   * chỉ lần đầu được ghi; lần sau trả kết quả đã ghi. `bam` là các lần bấm người đánh gửi lên (trận bỏ dở thì rỗng).
   * Đã thử đóng quá `LAN_DONG_MAX` lần mà chưa xong (hàm bị ngắt giữa lúc đánh lại) thì đóng như rút quân ở bước đầu.
   */
  async function dongTran(t: TranRow, bam: unknown, now: number): Promise<KetQua & { ms: number; hong?: true }> {
    const [{ lan }] = await sql<{ lan: number }[]>`update public.tran set lan_dong = lan_dong + 1 where id = ${t.id} returning lan_dong as lan`;
    const hong = lan > LAN_DONG_MAX;
    if (hong) bam = [{ s: 0, k: 'rut' }];
    const ids = [t.nguoi_danh, t.nguoi_giu].filter((x): x is string => !!x);
    const cups = new Map((await sql<{ id: string; chien_cong: number }[]>`select id, chien_cong from public.nguoi_choi where id = any(${sql.array(ids)}::uuid[])`).map((r) => [r.id, r.chien_cong]));
    const t0 = performance.now();
    const kq = danhLai(t.ban_chup, t.quan, bam, {
      atkDien: t.dien_danh,
      atkTrophies: (t.nguoi_danh && cups.get(t.nguoi_danh)) || 0,
      defTrophies: (t.nguoi_giu && cups.get(t.nguoi_giu)) || 0,
      bot: t.may,
    });
    const ket = { ...kq, ms: Math.round(performance.now() - t0), ...(hong ? { hong: true as const } : {}) };
    const saved = Array.isArray(bam) ? bam.slice(0, 600) : [];
    const wrote = await sql.begin(async (tx) => {
      const done = await tx`
        update public.tran set trang_thai = 'xong', bam = ${tx.json(saved)}, ket_qua = ${tx.json(ket)}, xong_luc = ${luc(now)}, luat = ${LUAT_MA}
        where id = ${t.id} and trang_thai = 'dang' returning id`;
      if (!done.length) return false;
      if (t.nguoi_danh) {
        await tx`update public.nguoi_choi set chien_cong = greatest(0, chien_cong + ${ket.chienCong.atk}) where id = ${t.nguoi_danh}`;
      }
      if (t.nguoi_giu) {
        await tx`
          update public.nguoi_choi set chien_cong = greatest(0, chien_cong + ${ket.chienCong.def}),
            khien_den = ${luc(now + CAU_HINH.shieldH * GIO)}, khoa_den = null
          where id = ${t.nguoi_giu}`;
        // Kho trong bản chụp mới nhất trừ đi của bị cướp (giữ `luc`: vẫn là lúc người giữ thành tải lên).
        if (Object.values(ket.cuop).some((n) => n > 0)) {
          const [b] = await tx<{ ma: string }[]>`select ma from public.ban_chup where nguoi = ${t.nguoi_giu} for update`;
          if (b) await tx`update public.ban_chup set ma = ${truCua(b.ma, ket.cuop)} where nguoi = ${t.nguoi_giu}`;
        }
      }
      return true;
    });
    if (wrote) return ket;
    const [again] = await sql<TranRow[]>`select * from public.tran where id = ${t.id}`;
    return again.ket_qua!;
  }

  /** Trận bỏ dở quá giờ khóa (người đánh thoát giữa trận): đóng với các lần bấm đã có (không có). Mỗi lần một trận. */
  async function dongTranBoDo(me: string, now: number) {
    const [t] = await sql<TranRow[]>`
      select * from public.tran
      where trang_thai = 'dang' and bat_dau <= ${luc(now - CAU_HINH.lockS * 1000)} and (nguoi_danh = ${me} or nguoi_giu = ${me})
      order by bat_dau limit 1`;
    if (t) await dongTran(t, [], now);
  }

  /** Ghi bản chụp mới của người chơi (đã kiểm) và cấp Điện theo bản chụp ấy. */
  async function luuBanChup(tx: Tx, me: string, snap: { ma: string; dien: number }, now: number) {
    await tx`
      insert into public.ban_chup (nguoi, ma, dien, luc) values (${me}, ${snap.ma}, ${snap.dien}, ${luc(now)})
      on conflict (nguoi) do update set ma = excluded.ma, dien = excluded.dien, luc = excluded.luc`;
    await tx`update public.nguoi_choi set dien = ${snap.dien}, goi_luc = ${luc(now)} where id = ${me}`;
  }

  /** Nhận bản chụp người chơi gửi lên: kiểm luật, đếm lượt tải. */
  async function nhan(me: string, ma: unknown, now: number) {
    const snap = nhanBanChup(ma);
    if ('loi' in snap) throw new Loi('banChup', 400, snap.loi);
    await demLuot(me, 'banChup', CAU_HINH.snapPerH, now);
    return snap;
  }

  // ---------- Lệnh ----------

  async function ping() {
    await sql`select public.don_dau_thanh()`;
    await sql`select public.don_viet_nam()`;
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from public.nguoi_choi`;
    return { ok: true, luat: LUAT_MA, nguoi: n };
  }

  async function thamGia(me: string, body: Record<string, unknown>, now: number) {
    const ten = kiemTen(body.ten);
    if ('loi' in ten) throw new Loi('ten', 400, ten.loi);
    const snap = await nhan(me, body.banChup, now);
    await sql.begin(async (tx) => {
      await tx`
        insert into public.nguoi_choi (id, ten, dien, tao_luc, goi_luc) values (${me}, ${ten.ten}, ${snap.dien}, ${luc(now)}, ${luc(now)})
        on conflict (id) do update set ten = excluded.ten, dien = excluded.dien, goi_luc = excluded.goi_luc`;
      await luuBanChup(tx, me, snap, now);
    });
    return { ok: true, toi: hoSo((await nguoi(me))!, now) };
  }

  async function taiBanChup(me: string, body: Record<string, unknown>, now: number) {
    await canNguoi(me);
    const snap = await nhan(me, body.banChup, now);
    await sql.begin((tx) => luuBanChup(tx, me, snap, now));
    return { ok: true };
  }

  async function toi(me: string, now: number) {
    await canNguoi(me);
    await dongTranBoDo(me, now);
    await sql`update public.nguoi_choi set goi_luc = ${luc(now)} where id = ${me}`;
    const biDanh = await sql<TranRow[]>`select * from public.tran where nguoi_giu = ${me} order by bat_dau desc limit 50`;
    const daDanh = await sql<TranRow[]>`select * from public.tran where nguoi_danh = ${me} order by bat_dau desc limit 20`;
    return { ok: true, toi: hoSo((await nguoi(me))!, now), biDanh: biDanh.map(tomTran), daDanh: daDanh.map(tomTran) };
  }

  async function tim(me: string, body: Record<string, unknown>, now: number) {
    const p = await canNguoi(me);
    await banChupCua(me);
    await demLuot(me, 'tim', CAU_HINH.findPerH, now);
    const bo = (Array.isArray(body.bo) ? body.bo : []).filter((x): x is string => typeof x === 'string' && UUID.test(x)).slice(0, 50);
    const rows = await sql<{ id: string; dien: number; chien_cong: number }[]>`
      select n.id, n.dien, n.chien_cong
      from public.nguoi_choi n join public.ban_chup b on b.nguoi = n.id
      where n.id <> ${me}
        and (n.khien_den is null or n.khien_den <= ${luc(now)})
        and (n.khoa_den is null or n.khoa_den <= ${luc(now)})
        and abs(n.dien - ${p.dien}) <= ${CAU_HINH.matchDienWide}
        and b.luc > ${luc(now - CAU_HINH.keepDays * NGAY)}
        and not (n.id = any(${sql.array(bo)}::uuid[]))
        and not exists (
          select 1 from public.tran t
          where t.nguoi_danh = ${me} and t.nguoi_giu = n.id and t.bat_dau > ${luc(now - CAU_HINH.rematchH * GIO)})
      order by abs(n.chien_cong - ${p.chien_cong}), n.id
      limit 100`;
    const id = chonDoiThu({ dien: p.dien, trophies: p.chien_cong }, rows.map((r) => ({ id: r.id, dien: r.dien, trophies: r.chien_cong })), ngauNhien());
    if (!id) {
      const bot = kinhDoMay(p.dien);
      return { ok: true, doiThu: { id: 'may', may: true, ten: null, dien: bot.dien, chienCong: p.chien_cong, banChup: bot.ma } };
    }
    const [d] = await sql<{ ten: string; dien: number; chien_cong: number; ma: string }[]>`
      select n.ten, n.dien, n.chien_cong, b.ma from public.nguoi_choi n join public.ban_chup b on b.nguoi = n.id where n.id = ${id}`;
    return { ok: true, doiThu: { id, may: false, ten: d.ten, dien: d.dien, chienCong: d.chien_cong, banChup: d.ma } };
  }

  async function danh(me: string, body: Record<string, unknown>, now: number) {
    const p = await canNguoi(me);
    // Mỗi người một trận đang đánh; trận cũ bỏ dở quá giờ khóa thì đóng trước.
    const [open] = await sql<TranRow[]>`select * from public.tran where nguoi_danh = ${me} and trang_thai = 'dang' order by bat_dau limit 1`;
    if (open) {
      if (open.bat_dau.getTime() > now - CAU_HINH.lockS * 1000) throw new Loi('dangCoTran', 409);
      await dongTran(open, [], now);
    }
    await demLuot(me, 'danh', CAU_HINH.attackPerH, now);
    // Bản chụp mới gửi kèm (quân có lúc này, cấp Điện lúc này); không gửi thì dùng bản chụp đã tải.
    let myMa: string;
    if (body.banChup !== undefined) {
      const snap = await nhan(me, body.banChup, now);
      await sql.begin((tx) => luuBanChup(tx, me, snap, now));
      myMa = snap.ma;
      p.dien = snap.dien;
    } else myMa = await banChupCua(me);
    const q = quanDanh(myMa, body.quan, body.huong, Math.floor(ngauNhien() * 2 ** 31));
    if ('loi' in q) throw new Loi('quan', 400, q.loi);
    const het = now + CAU_HINH.lockS * 1000;

    if (body.doiThu === 'may') {
      // Kinh đô máy không phải người khác: không mất khiên, không khóa ai.
      const bot = kinhDoMay(p.dien);
      const [t] = await sql<{ id: string }[]>`
        insert into public.tran (nguoi_danh, may, ten_danh, ten_giu, dien_danh, dien_giu, ban_chup, quan, bat_dau)
        values (${me}, true, ${p.ten}, ${''}, ${p.dien}, ${bot.dien}, ${bot.ma}, ${sql.json(q.quan)}, ${luc(now)})
        returning id`;
      return { ok: true, tran: t.id, quan: q.quan, banChup: bot.ma, het };
    }

    const target = body.doiThu;
    if (typeof target !== 'string' || !UUID.test(target) || target === me) throw new Loi('khongCoDoiThu', 404);
    const made = await sql.begin(async (tx) => {
      const [d] = await tx<(NguoiChoi & { ma: string })[]>`
        select n.id, n.ten, n.chien_cong, n.dien, n.khien_den, n.khoa_den, b.ma
        from public.nguoi_choi n join public.ban_chup b on b.nguoi = n.id
        where n.id = ${target} for update of n`;
      if (!d) throw new Loi('khongCoDoiThu', 404);
      if (d.khien_den && d.khien_den.getTime() > now) throw new Loi('coKhien', 409);
      if (d.khoa_den && d.khoa_den.getTime() > now) throw new Loi('dangBiDanh', 409);
      if (Math.abs(d.dien - p.dien) > CAU_HINH.matchDienWide) throw new Loi('chenhDien', 409);
      const [recent] = await tx`
        select 1 from public.tran where nguoi_danh = ${me} and nguoi_giu = ${target} and bat_dau > ${luc(now - CAU_HINH.rematchH * GIO)} limit 1`;
      if (recent) throw new Loi('vuaDanh', 409);
      await tx`update public.nguoi_choi set khoa_den = ${luc(het)} where id = ${target}`;
      await tx`update public.nguoi_choi set khien_den = null, goi_luc = ${luc(now)} where id = ${me}`;
      const [t] = await tx<{ id: string }[]>`
        insert into public.tran (nguoi_danh, nguoi_giu, ten_danh, ten_giu, dien_danh, dien_giu, ban_chup, quan, bat_dau)
        values (${me}, ${target}, ${p.ten}, ${d.ten}, ${p.dien}, ${d.dien}, ${d.ma}, ${tx.json(q.quan)}, ${luc(now)})
        returning id`;
      return { id: t.id, ma: d.ma };
    });
    return { ok: true, tran: made.id, quan: q.quan, banChup: made.ma, het };
  }

  async function xong(me: string, body: Record<string, unknown>, now: number) {
    const id = body.tran;
    if (typeof id !== 'string' || !UUID.test(id)) throw new Loi('khongCoTran', 404);
    const [t] = await sql<TranRow[]>`select * from public.tran where id = ${id} and nguoi_danh = ${me}`;
    if (!t) throw new Loi('khongCoTran', 404);
    const ketQua = t.trang_thai === 'xong' ? t.ket_qua! : await dongTran(t, body.bam, now);
    const p = await nguoi(me);
    return { ok: true, ketQua, ...(p ? { toi: hoSo(p, now) } : {}) };
  }

  async function roi(me: string) {
    await sql`delete from public.nguoi_choi where id = ${me}`;
    return { ok: true };
  }

  // ---------- PR 6: bảng xếp hạng, xem lại trận, lưu game lên mây ----------

  /** Những người chiến công cao nhất (ngang nhau thì ai tham gia trước đứng trước), hạng của mình, tổng số người. */
  async function xepHang(me: string, now: number) {
    await canNguoi(me);
    await demLuot(me, 'xepHang', CAU_HINH.rankPerH, now);
    const top = await sql<{ id: string; ten: string; chien_cong: number; dien: number }[]>`
      select id, ten, chien_cong, dien from public.nguoi_choi order by chien_cong desc, tao_luc, id limit ${CAU_HINH.rankTop}`;
    const [{ hang, tong }] = await sql<{ hang: number; tong: number }[]>`
      select
        (select count(*)::int from public.nguoi_choi) as tong,
        (select count(*)::int + 1 from public.nguoi_choi n, public.nguoi_choi m
          where m.id = ${me} and (n.chien_cong > m.chien_cong or (n.chien_cong = m.chien_cong and (n.tao_luc, n.id) < (m.tao_luc, m.id)))) as hang`;
    return {
      ok: true,
      bang: top.map((r, i) => ({ hang: i + 1, ten: r.ten, chienCong: r.chien_cong, dien: r.dien, ...(r.id === me ? { toi: true } : {}) })),
      hang,
      tong,
    };
  }

  /** Dữ liệu để đánh lại một trận đã xong cho người trong cuộc xem: bản chụp kinh đô bị đánh, quân, các lần bấm. */
  async function xemLai(me: string, body: Record<string, unknown>, now: number) {
    const id = body.tran;
    if (typeof id !== 'string' || !UUID.test(id)) throw new Loi('khongCoTran', 404);
    const [t] = await sql<TranRow[]>`select * from public.tran where id = ${id} and (nguoi_danh = ${me} or nguoi_giu = ${me})`;
    if (!t) throw new Loi('khongCoTran', 404);
    if (t.trang_thai !== 'xong') throw new Loi('chuaXong', 409);
    if (t.luat !== LUAT_MA) throw new Loi('banCu', 409);
    await demLuot(me, 'xemLai', CAU_HINH.replayPerH, now);
    return { ok: true, tran: tomTran(t), vai: t.nguoi_danh === me ? 'danh' : 'giu', banChup: t.ban_chup, quan: t.quan, bam: Array.isArray(t.bam) ? t.bam : [] };
  }

  /**
   * Lưu game lên mây. Chỉ người đã gắn Google (người ẩn danh không đăng nhập lại được ở máy khác, lưu cũng vô ích).
   * Máy chủ không đọc mã lưu, chỉ kiểm dạng và cỡ: đây là bản lưu của chính người chơi, máy tải về tự kiểm.
   */
  async function luuMay(nguoiGoi: NguoiGoi, body: Record<string, unknown>, now: number) {
    const me = nguoiGoi.id;
    if (nguoiGoi.anDanh) throw new Loi('canGoogle', 403);
    const ma = body.ma;
    if (typeof ma !== 'string' || ma.length > CAU_HINH.saveMax || !MA_LUU.test(ma)) throw new Loi('maLuu', 400);
    const dien = Number.isInteger(body.dien) ? Math.min(10, Math.max(1, body.dien as number)) : 1;
    await demLuot(me, 'luuMay', CAU_HINH.savePerH, now);
    const ban = await sql.begin(async (tx) => {
      const [cu] = await tx<{ ban: number }[]>`select ban from public.luu_may where nguoi = ${me} for update`;
      // Máy khác đã lưu bản mới hơn bản máy này biết: không ghi đè khi chưa hỏi người chơi.
      if (cu && cu.ban !== body.goc && body.de !== true) throw new Loi('lechMay', 409);
      const next = (cu?.ban ?? 0) + 1;
      await tx`
        insert into public.luu_may (nguoi, ma, ban, dien, luc) values (${me}, ${ma}, ${next}, ${dien}, ${luc(now)})
        on conflict (nguoi) do update set ma = excluded.ma, ban = excluded.ban, dien = excluded.dien, luc = excluded.luc`;
      return next;
    });
    return { ok: true, ban, luc: now };
  }

  async function taiMay(me: string, body: Record<string, unknown>, now: number) {
    // Xem thử (bảng hỏi mỗi lần mở) đếm riêng với tải cả mã lưu về, để mở bảng nhiều không chặn mất lượt tải.
    if (body.chiXem === true) await demLuot(me, 'xemMay', CAU_HINH.rankPerH, now);
    else await demLuot(me, 'taiMay', CAU_HINH.savePerH, now);
    const [r] = await sql<{ ma: string; ban: number; dien: number; luc: Date }[]>`select ma, ban, dien, luc from public.luu_may where nguoi = ${me}`;
    if (!r) return { ok: true, may: null };
    return { ok: true, may: { ban: r.ban, dien: r.dien, luc: r.luc.getTime(), ...(body.chiXem === true ? {} : { ma: r.ma }) } };
  }

  // ---------- Bản đồ Việt Nam: điểm tỉnh (PR 2) ----------

  interface TinhRow {
    tinh: string;
    mua: number;
    chuc: ChucId | null;
    chuc_luc: Date | null;
  }

  /** Tỉnh, chức, điểm mình đã góp cho tỉnh mình mùa này và điểm đã góp hôm nay (mọi tỉnh), hay null nếu chưa chọn tỉnh. */
  async function toiTinh(me: string, now: number) {
    const [r] = await sql<TinhRow[]>`select tinh, mua, chuc, chuc_luc from public.tinh_nguoi where nguoi = ${me}`;
    if (!r) return null;
    const mua = muaTinh(now);
    const ngay = ngayTinh(now);
    const [d] = await sql<{ diem_mua: number; diem_ngay: number }[]>`
      select
        coalesce(sum(diem + danh) filter (where mua = ${mua} and tinh = ${r.tinh}), 0)::int as diem_mua,
        coalesce(sum(diem) filter (where ngay = ${ngay}), 0)::int as diem_ngay
      from public.tinh_diem where nguoi = ${me} and (mua = ${mua} or ngay = ${ngay})`;
    return { tinh: r.tinh, chuc: r.chuc, mua: r.mua, chucLuc: r.chuc_luc?.getTime() ?? null, diemMua: d.diem_mua, diemNgay: d.diem_ngay };
  }

  async function bangTinh(me: string | null, now: number) {
    if (me) await demLuot(me, 'bangTinh', CAU_HINH.bangPerH, now);
    const mua = muaTinh(now);
    const diem = await sql<{ tinh: string; diem: number; gop: number }[]>`
      with moi as (
        select tinh, nguoi, sum(diem + danh) as d from public.tinh_diem where mua = ${mua} group by tinh, nguoi
      ), xep as (
        select tinh, d, row_number() over (partition by tinh order by d desc, nguoi) as hang from moi
      )
      select tinh, coalesce(sum(d) filter (where hang <= ${CAU_HINH.topTinh}), 0)::int as diem, count(*)::int as gop
      from xep group by tinh`;
    const nguoi = await sql<{ tinh: string; n: number }[]>`select tinh, count(*)::int as n from public.tinh_nguoi group by tinh`;
    const bang = new Map<string, { tinh: string; diem: number; nguoi: number; gop: number }>();
    const dong = (tinh: string) => bang.get(tinh) ?? bang.set(tinh, { tinh, diem: 0, nguoi: 0, gop: 0 }).get(tinh)!;
    for (const r of diem) Object.assign(dong(r.tinh), { diem: r.diem, gop: r.gop });
    for (const r of nguoi) dong(r.tinh).nguoi = r.n;
    return { ok: true, mua, ngay: ngayTinh(now), toi: me ? await toiTinh(me, now) : null, bang: [...bang.values()], giac: await giacBang(me, now) };
  }

  // ---------- Giặc chung (PR 3) ----------

  interface GiacRow {
    tinh: string;
    mau: number;
    con: number;
    diet: Date | null;
  }

  /** Số người đã góp (điểm góp của, không tính trận) ở tỉnh `tinh` trong tuần `tuan`. */
  async function nguoiGop(tinh: string, tuan: number): Promise<number> {
    const { tu, den } = ngayTuan(tuan);
    const [{ n }] = await sql<{ n: number }[]>`
      select count(distinct nguoi)::int as n from public.tinh_diem where tinh = ${tinh} and ngay >= ${tu} and ngay < ${den} and diem > 0`;
    return n;
  }

  /** Đạo giặc tuần `tuan` ở mọi tỉnh bị đánh: tạo dòng còn thiếu (máu theo số người đã góp tuần trước). */
  async function daoGiac(tuan: number): Promise<GiacRow[]> {
    const tinh = daoTuan(tuan).tinh;
    let rows = await sql<GiacRow[]>`select tinh, mau, con, diet from public.giac_chung where tuan = ${tuan}`;
    const thieu = tinh.filter((t) => !rows.some((r) => r.tinh === t));
    if (thieu.length) {
      for (const t of thieu) {
        const mau = mauDao(await nguoiGop(t, tuan - 1));
        await sql`insert into public.giac_chung (tuan, tinh, mau, con) values (${tuan}, ${t}, ${mau}, ${mau}) on conflict do nothing`;
      }
      rows = await sql<GiacRow[]>`select tinh, mau, con, diet from public.giac_chung where tuan = ${tuan}`;
    }
    return tinh.map((t) => rows.find((r) => r.tinh === t)!).filter(Boolean);
  }

  /** Phần giặc chung của bảng tỉnh: đạo tuần này (máu khi giặc đang đánh), số trận hôm nay, đạo đã diệt mình có đánh. */
  async function giacBang(me: string | null, now: number) {
    const tuan = tuanTinh(now);
    const dang = giacDangDanh(now) !== null;
    const dao = dang ? (await daoGiac(tuan)).map((r) => ({ tinh: r.tinh, mau: r.mau, con: r.con, diet: r.diet?.getTime() ?? null })) : [];
    let tranNay = 0;
    let thuong: { tuan: number; tinh: string }[] = [];
    if (me) {
      [{ n: tranNay }] = await sql<{ n: number }[]>`select count(*)::int as n from public.giac_tran where nguoi = ${me} and ngay = ${ngayTinh(now)}`;
      thuong = await sql<{ tuan: number; tinh: string }[]>`
        select distinct t.tuan, t.tinh from public.giac_tran t
        join public.giac_chung g on g.tuan = t.tuan and g.tinh = t.tinh
        where t.nguoi = ${me} and t.xong and t.sat > 0 and g.diet is not null and t.tuan >= ${tuan - 2}
        order by t.tuan, t.tinh`;
    }
    return { tuan, nhom: daoTuan(tuan).nhom, dao, tranNay, thuong: thuong.map((r) => ({ tuan: r.tuan, tinh: r.tinh })) };
  }

  async function giacDanh(me: string, body: Record<string, unknown>, now: number) {
    const tuan = giacDangDanh(now);
    if (tuan === null) throw new Loi('giacChuaToi', 409);
    const [r] = await sql<TinhRow[]>`select tinh, mua, chuc, chuc_luc from public.tinh_nguoi where nguoi = ${me}`;
    if (!r) throw new Loi('chuaChonTinh', 409);
    const dao = daoTuan(tuan);
    const tinh = typeof body.tinh === 'string' ? body.tinh : '';
    if (!noiDanh(r.tinh, dao.tinh).includes(tinh)) throw new Loi('khongDanhDuoc', 409);
    // Đếm lượt trước khi kiểm bản chụp (kiểm tốn CPU).
    await demLuot(me, 'giacDanh', CAU_HINH.giacPerH, now);
    const g = nhanGiac(body.banChup, body.quan, body.hang);
    if ('loi' in g) throw new Loi(g.loi, 400, g.chiTiet);
    const ngay = ngayTinh(now);
    const he = heChuc(r.chuc, dao.nhom);
    const seed = Math.floor(ngauNhien() * 2 ** 31);
    await daoGiac(tuan);
    const id = await sql.begin(async (tx) => {
      // Khóa dòng tỉnh của mình: hai trận bắt đầu cùng lúc không vượt số trận mỗi ngày.
      await tx`select 1 from public.tinh_nguoi where nguoi = ${me} for update`;
      const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from public.giac_tran where nguoi = ${me} and ngay = ${ngay}`;
      if (n >= CAU_HINH.giacTranNgay) throw new Loi('hetTran', 409);
      const [d] = await tx<{ con: number }[]>`select con from public.giac_chung where tuan = ${tuan} and tinh = ${tinh}`;
      if (!d || d.con <= 0) throw new Loi('daDiet', 409);
      const [{ id }] = await tx<{ id: string }[]>`
        insert into public.giac_tran (nguoi, tuan, tinh, tinh_ta, ngay, he, seed, ban_chup, quan, bat_dau)
        values (${me}, ${tuan}, ${tinh}, ${r.tinh}, ${ngay}, ${he}, ${seed}, ${g.ma}, ${tx.json(g.quan as never)}, ${luc(now)})
        returning id::text as id`;
      return { id, n: n + 1 };
    });
    return { ok: true, tran: id.id, seed, tinh, nhom: dao.nhom, he, quan: g.quan, tranNay: id.n };
  }

  interface GiacTranRow {
    id: string;
    nguoi: string;
    tuan: number;
    tinh: string;
    tinh_ta: string;
    he: number;
    seed: number;
    ban_chup: string;
    quan: QuanGiac;
    bat_dau: Date;
    xong: boolean;
    ket_qua: Record<string, unknown> | null;
  }

  async function giacXong(me: string, body: Record<string, unknown>, now: number) {
    const id = typeof body.tran === 'string' && /^[0-9]{1,18}$/.test(body.tran) ? body.tran : null;
    if (!id) throw new Loi('khongCoTran', 404);
    const [t] = await sql<GiacTranRow[]>`
      select id::text as id, nguoi, tuan, tinh, tinh_ta, he, seed::float8 as seed, ban_chup, quan, bat_dau, xong, ket_qua
      from public.giac_tran where id = ${id} and nguoi = ${me}`;
    if (!t) throw new Loi('khongCoTran', 404);
    if (t.xong) return { ok: true, ...t.ket_qua };
    // Gửi quá giờ: như rút quân ở bước đầu (khỏi để dành trận thử lần bấm).
    const bam = now - t.bat_dau.getTime() > CAU_HINH.giacXongMs ? [{ s: 0, k: 'rut' }] : body.bam;
    const kq = danhGiac(t.ban_chup, t.quan, daoTuan(t.tuan).nhom, Number(t.seed), bam, t.he);
    const chia = chiaDiem(kq.sat, t.tinh_ta, t.tinh);
    const ngay = ngayTinh(now);
    const mua = muaTinh(now);
    const ket = await sql.begin(async (tx) => {
      const [lai] = await tx<{ xong: boolean; ket_qua: Record<string, unknown> | null }[]>`select xong, ket_qua from public.giac_tran where id = ${id} for update`;
      if (lai.xong) return lai.ket_qua ?? {};
      const [d] = await tx<{ con: number; diet: Date | null }[]>`select con, diet from public.giac_chung where tuan = ${t.tuan} and tinh = ${t.tinh} for update`;
      const con = Math.max(0, (d?.con ?? 0) - kq.sat);
      const diet = d && d.con > 0 && con === 0;
      if (d) await tx`update public.giac_chung set con = ${con}, diet = ${diet ? luc(now) : d.diet} where tuan = ${t.tuan} and tinh = ${t.tinh}`;
      for (const [tinh, diem] of [
        [t.tinh_ta, chia.ta],
        [t.tinh, chia.giup],
      ] as const) {
        if (diem <= 0) continue;
        await tx`
          insert into public.tinh_diem (mua, tinh, nguoi, ngay, danh) values (${mua}, ${tinh}, ${me}, ${ngay}, ${diem})
          on conflict (mua, tinh, nguoi, ngay) do update set danh = public.tinh_diem.danh + excluded.danh`;
      }
      const ket = { pha: kq.pha, sat: kq.sat, thang: kq.thang, mat: kq.mat, buoc: kq.buoc, diemTa: chia.ta, diemGiup: chia.giup, tinh: t.tinh, con, diet: !!diet };
      await tx`update public.giac_tran set xong = true, sat = ${kq.sat}, ket_qua = ${tx.json(ket as never)}, ban_chup = '' where id = ${id}`;
      return ket;
    });
    return { ok: true, ...ket };
  }

  async function chonTinh(me: string, body: Record<string, unknown>, now: number) {
    const tinh = kiemTinh(body.tinh);
    if (!tinh) throw new Loi('khongCoTinh');
    await demLuot(me, 'chonTinh', CAU_HINH.chonPerH, now);
    const mua = muaTinh(now);
    await sql.begin(async (tx) => {
      const [r] = await tx<TinhRow[]>`select tinh, mua, chuc, chuc_luc from public.tinh_nguoi where nguoi = ${me} for update`;
      if (r?.tinh === tinh) return;
      // Mỗi mùa đổi tỉnh một lần (chọn lần đầu thì được ngay).
      if (r && r.mua === mua) throw new Loi('doiTinhMuaSau', 409);
      // Sang tỉnh không có chức đang giữ (Bồ chính hải ở tỉnh không giáp biển) thì mất chức, nhận chức khác ngay.
      const giu = r?.chuc && 'chuc' in kiemChuc(tinh, r.chuc);
      await tx`
        insert into public.tinh_nguoi (nguoi, tinh, mua, chuc, chuc_luc, luc)
        values (${me}, ${tinh}, ${mua}, ${giu ? r!.chuc : null}, ${giu ? r!.chuc_luc : null}, ${luc(now)})
        on conflict (nguoi) do update set tinh = excluded.tinh, mua = excluded.mua, chuc = excluded.chuc, chuc_luc = excluded.chuc_luc, luc = excluded.luc`;
    });
    return { ok: true, toi: await toiTinh(me, now) };
  }

  async function chonChuc(me: string, body: Record<string, unknown>, now: number) {
    await demLuot(me, 'chonChuc', CAU_HINH.chonPerH, now);
    await sql.begin(async (tx) => {
      const [r] = await tx<TinhRow[]>`select tinh, mua, chuc, chuc_luc from public.tinh_nguoi where nguoi = ${me} for update`;
      if (!r) throw new Loi('chuaChonTinh', 409);
      const c = kiemChuc(r.tinh, body.chuc);
      if ('loi' in c) throw new Loi(c.loi);
      if (r.chuc === c.chuc) return;
      const het = r.chuc && r.chuc_luc ? r.chuc_luc.getTime() + CAU_HINH.doiChucMs : 0;
      if (het > now) throw new Loi('doiChucCho', 409, String(het - now));
      await tx`update public.tinh_nguoi set chuc = ${c.chuc}, chuc_luc = ${luc(now)} where nguoi = ${me}`;
    });
    return { ok: true, toi: await toiTinh(me, now) };
  }

  async function gop(me: string, body: Record<string, unknown>, now: number) {
    const [r] = await sql<TinhRow[]>`select tinh, mua, chuc, chuc_luc from public.tinh_nguoi where nguoi = ${me}`;
    if (!r) throw new Loi('chuaChonTinh', 409);
    if (!r.chuc) throw new Loi('chuaCoChuc', 409);
    // Đếm lượt trước khi kiểm bản chụp (kiểm tốn CPU).
    await demLuot(me, 'gop', CAU_HINH.gopPerH, now);
    const g = gopTinh(body.banChup, r.chuc, body.gop);
    if ('loi' in g) throw new Loi(g.loi, 400, g.chiTiet);
    const mua = muaTinh(now);
    const ngay = ngayTinh(now);
    await sql.begin(async (tx) => {
      // Khóa dòng tỉnh của mình: hai lần góp cùng lúc không vượt trần ngày.
      await tx`select 1 from public.tinh_nguoi where nguoi = ${me} for update`;
      const [{ n }] = await tx<{ n: number }[]>`select coalesce(sum(diem), 0)::int as n from public.tinh_diem where nguoi = ${me} and ngay = ${ngay}`;
      if (n + g.diem > CAU_HINH.gopNgay) throw new Loi('tranNgay', 409, String(Math.max(0, CAU_HINH.gopNgay - n)));
      await tx`
        insert into public.tinh_diem (mua, tinh, nguoi, ngay, diem) values (${mua}, ${r.tinh}, ${me}, ${ngay}, ${g.diem})
        on conflict (mua, tinh, nguoi, ngay) do update set diem = public.tinh_diem.diem + excluded.diem`;
    });
    return { ok: true, diem: g.diem, gop: g.gop, toi: await toiTinh(me, now) };
  }

  // ---------- Vào ----------

  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return tra({ ok: false, loi: 'chiNhanPost' }, 405);
    let body: Record<string, unknown>;
    try {
      const text = await req.text();
      if (text.length > MAX_BODY_LUU) throw new Loi('daiQua', 413);
      const raw = JSON.parse(text);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Loi('saiDang');
      if (text.length > MAX_BODY && raw.hanh !== 'luuMay') throw new Loi('daiQua', 413);
      body = raw;
    } catch (e) {
      return e instanceof Loi ? tra({ ok: false, loi: e.ma }, e.status) : tra({ ok: false, loi: 'saiDang' }, 400);
    }
    try {
      if (body.hanh === 'ping') return tra(await ping());
      if (body.luat !== LUAT_MA) throw new Loi('capNhat', 409, LUAT_MA);
      const nguoiGoi = await env.nguoiDung(req);
      // Bảng tỉnh là dữ liệu chung: chưa đăng nhập (chưa chọn tỉnh) cũng xem được.
      if (body.hanh === 'bangTinh') return tra(await bangTinh(nguoiGoi?.id ?? null, bayGio()));
      if (!nguoiGoi) throw new Loi('chuaDangNhap', 401);
      const me = nguoiGoi.id;
      const now = bayGio();
      switch (body.hanh) {
        case 'thamGia':
          return tra(await thamGia(me, body, now));
        case 'banChup':
          return tra(await taiBanChup(me, body, now));
        case 'toi':
          return tra(await toi(me, now));
        case 'tim':
          return tra(await tim(me, body, now));
        case 'danh':
          return tra(await danh(me, body, now));
        case 'xong':
          return tra(await xong(me, body, now));
        case 'roi':
          return tra(await roi(me));
        case 'xepHang':
          return tra(await xepHang(me, now));
        case 'xemLai':
          return tra(await xemLai(me, body, now));
        case 'luuMay':
          return tra(await luuMay(nguoiGoi, body, now));
        case 'taiMay':
          return tra(await taiMay(me, body, now));
        case 'chonTinh':
          return tra(await chonTinh(me, body, now));
        case 'chonChuc':
          return tra(await chonChuc(me, body, now));
        case 'gop':
          return tra(await gop(me, body, now));
        case 'giacDanh':
          return tra(await giacDanh(me, body, now));
        case 'giacXong':
          return tra(await giacXong(me, body, now));
      }
      throw new Loi('saiLenh');
    } catch (e) {
      if (e instanceof Loi) return tra({ ok: false, loi: e.ma, ...(e.chiTiet ? { chiTiet: e.chiTiet } : {}) }, e.status);
      console.error(e);
      return tra({ ok: false, loi: 'mayChu' }, 500);
    }
  };
}
