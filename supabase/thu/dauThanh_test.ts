// Test Edge Function Đấu thành trên Postgres thật (không cần Supabase): dựng lại schema, giả phần Supabase có sẵn
// (giaSupabase.sql), chạy migration, rồi gọi các lệnh như máy khách. Người gọi lấy từ header `x-thu`, đồng hồ giả.
//
//   DAU_THANH_DB_URL=postgres://postgres@127.0.0.1:5432/postgres \
//     deno test --config supabase/functions/dau-thanh/deno.json --allow-env --allow-net --allow-read supabase/thu/
//
// Không có DAU_THANH_DB_URL thì bỏ qua. Test xóa sạch schema public và auth của cơ sở dữ liệu ấy: đừng trỏ vào
// cơ sở dữ liệu thật.

import postgres from 'npm:postgres@3.4.9';
import { CAU_HINH, LUAT_MA, danhLai, kinhDoMay, truCua, type QuanDanh } from '../functions/dau-thanh/luat.js';
import { taoXuLy } from '../functions/dau-thanh/xuLy.ts';

const DB = Deno.env.get('DAU_THANH_DB_URL');

/** JSON xếp khóa theo chữ cái (jsonb của Postgres đổi thứ tự khóa). */
const canon = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, canon(x)])) : v;

function eq(actual: unknown, expected: unknown, msg = '') {
  const a = JSON.stringify(canon(actual));
  const e = JSON.stringify(canon(expected));
  if (a !== e) throw new Error(`${msg}\n  được: ${a}\n  cần:  ${e}`);
}
function ok(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
const D = '00000000-0000-4000-8000-00000000000d';
const QUAN5 = { giao: 14, cung: 12, voi: 4 };

Deno.test({
  name: 'Đấu thành: tham gia, tìm, đánh, xong, khiên, khóa, trận bỏ dở, giới hạn lượt, kinh đô máy, xếp hạng, xem lại, lưu mây, rời',
  ignore: !DB,
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const sql = postgres(DB!, { prepare: false, max: 3, onnotice: () => {} });
    try {
      await sql.unsafe('drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;');
      await sql.unsafe(await Deno.readTextFile(new URL('./giaSupabase.sql', import.meta.url)));
      // Migration chạy theo thứ tự tên (mốc thời gian), như `supabase db push`.
      const files = [];
      for await (const f of Deno.readDir(new URL('../migrations/', import.meta.url))) if (f.name.endsWith('.sql')) files.push(f.name);
      for (const name of files.sort()) await sql.unsafe(await Deno.readTextFile(new URL(`../migrations/${name}`, import.meta.url)));
      await sql`insert into auth.users (id) values (${A}), (${B}), (${C}), (${D})`;

      let now = Date.UTC(2026, 10, 9, 12);
      const r = 0.1;
      // Người gọi lấy từ header `x-thu`; có `x-google` thì coi như đã gắn Google (không còn ẩn danh).
      const nguoiDung = (req: Request) => {
        const id = req.headers.get('x-thu');
        return Promise.resolve(id ? { id, anDanh: req.headers.get('x-google') !== '1' } : null);
      };
      const xuLy = taoXuLy({ sql, nguoiDung, bayGio: () => now, ngauNhien: () => r });
      const goi = async (who: string | null, body: Record<string, unknown>, luat = LUAT_MA, google = false) => {
        const headers: Record<string, string> = who ? { 'x-thu': who, ...(google ? { 'x-google': '1' } : {}) } : {};
        const res = await xuLy(new Request('http://thu/dau-thanh', { method: 'POST', headers, body: JSON.stringify({ luat, ...body }) }));
        return { status: res.status, ...(await res.json()) };
      };

      // Ping không cần đăng nhập; lệnh khác cần đúng mã luật và đăng nhập.
      eq(await goi(null, { hanh: 'ping' }), { status: 200, ok: true, luat: LUAT_MA, nguoi: 0 });
      eq(await goi(A, { hanh: 'toi' }, 'cu'), { status: 409, ok: false, loi: 'capNhat', chiTiet: LUAT_MA });
      eq((await goi(null, { hanh: 'toi' })).loi, 'chuaDangNhap');
      eq((await goi(A, { hanh: 'toi' })).loi, 'chuaThamGia');
      eq((await goi(A, { hanh: 'bay' })).loi, 'saiLenh');
      const opt = await xuLy(new Request('http://thu/dau-thanh', { method: 'OPTIONS' }));
      eq([opt.status, opt.headers.get('access-control-allow-origin')], [200, '*']);
      ok(opt.headers.get('access-control-allow-headers')?.includes('x-region'), 'trình duyệt gửi được header x-region');

      // Tham gia: tên và bản chụp phải hợp lệ.
      eq(await goi(A, { hanh: 'thamGia', ten: 'Đụ má', banChup: kinhDoMay(5).ma }), { status: 400, ok: false, loi: 'ten', chiTiet: 'tuc' });
      eq((await goi(A, { hanh: 'thamGia', ten: 'Lạc Long', banChup: 'TDVS1:hỏng' })).loi, 'banChup');
      eq((await goi(A, { hanh: 'thamGia', ten: '  Lạc   Long ', banChup: kinhDoMay(5).ma })).toi, { ten: 'Lạc Long', chienCong: 0, dien: 5, khienDen: null });
      ok((await goi(B, { hanh: 'thamGia', ten: 'Âu Cơ', banChup: kinhDoMay(6).ma })).ok, 'B tham gia');
      ok((await goi(C, { hanh: 'thamGia', ten: 'Cao Lỗ', banChup: kinhDoMay(9).ma })).ok, 'C tham gia');
      ok((await goi(D, { hanh: 'thamGia', ten: 'Dạ Trạch', banChup: kinhDoMay(6).ma })).ok, 'D tham gia');
      eq((await goi(null, { hanh: 'ping' })).nguoi, 4);

      // Ghép trận: Điện chênh 1 trước; C (Điện 9) không có ai trong chênh 2 thì gặp kinh đô máy.
      const found = await goi(A, { hanh: 'tim', bo: [D] });
      eq([found.doiThu.id, found.doiThu.ten, found.doiThu.dien, found.doiThu.banChup], [B, 'Âu Cơ', 6, kinhDoMay(6).ma]);
      eq((await goi(C, { hanh: 'tim' })).doiThu, { id: 'may', may: true, ten: null, dien: 9, chienCong: 0, banChup: kinhDoMay(9).ma });

      // Bắt đầu trận: quân sai thì từ chối; đúng thì khóa B, A mất khiên.
      eq((await goi(A, { hanh: 'danh', doiThu: B, quan: { giao: 99 }, huong: 'bac' })).chiTiet, 'quân nhiều hơn quân đang có');
      const start = await goi(A, { hanh: 'danh', doiThu: B, quan: QUAN5, huong: 'tay' });
      ok(start.ok, `A đánh B: ${JSON.stringify(start)}`);
      eq([start.banChup, start.het, start.quan.side, start.quan.army], [kinhDoMay(6).ma, now + CAU_HINH.lockS * 1000, 'tay', { ...QUAN5, no: 0 }]);
      eq((await goi(A, { hanh: 'danh', doiThu: D, quan: QUAN5, huong: 'bac' })).loi, 'dangCoTran');
      eq((await goi(D, { hanh: 'danh', doiThu: B, quan: QUAN5, huong: 'bac' })).loi, 'dangBiDanh');
      eq((await goi(D, { hanh: 'tim' })).doiThu.id, A, 'B đang bị khóa nên D gặp A');

      // Xong: máy chủ đánh lại ra đúng như tự đánh lại với cùng lần bấm; chiến công, khiên ghi vào hồ sơ.
      const bam: { s: number; k: string }[] = [];
      for (let s = 60; s < 3600; s += 120) for (const k of ['trongTran', 'voiXung', 'hieuTrieu', 'lienChau', 'lenhBan']) bam.push({ s, k });
      const quan = start.quan as QuanDanh;
      const mine = danhLai(kinhDoMay(6).ma, quan, bam, { atkDien: 5, atkTrophies: 0, defTrophies: 0, bot: false });
      const done = await goi(A, { hanh: 'xong', tran: start.tran, bam });
      const { ms, ...ketQua } = done.ketQua;
      eq(ketQua, mine, 'kết quả máy chủ');
      ok(ms >= 0, 'có thời gian đánh lại');
      eq((await goi(A, { hanh: 'xong', tran: start.tran, bam: [] })).ketQua, done.ketQua, 'gửi lại thì trả kết quả cũ');
      const a1 = (await goi(A, { hanh: 'toi' })) as { toi: { chienCong: number }; daDanh: { id: string; xong: boolean }[] };
      eq(a1.toi.chienCong, Math.max(0, mine.chienCong.atk));
      eq([a1.daDanh.length, a1.daDanh[0].id, a1.daDanh[0].xong], [1, start.tran, true]);
      const b1 = await goi(B, { hanh: 'toi' });
      eq([b1.toi.chienCong, b1.toi.khienDen, b1.biDanh[0].tenDanh, b1.biDanh[0].ketQua.cuop], [Math.max(0, mine.chienCong.def), now + CAU_HINH.shieldH * 3_600_000, 'Lạc Long', mine.cuop]);
      // Kho trong bản chụp của B trừ đi của bị cướp.
      ok(Object.values(mine.cuop).some((n) => n > 0), `A cướp được của: ${JSON.stringify(mine.cuop)}`);
      const [snapB] = await sql`select ma from public.ban_chup where nguoi = ${B}`;
      eq(snapB.ma, truCua(kinhDoMay(6).ma, mine.cuop), 'bản chụp B đã trừ của bị cướp');

      // Khiên 8 giờ, không đánh lại cùng người trong 12 giờ.
      eq((await goi(D, { hanh: 'danh', doiThu: B, quan: QUAN5, huong: 'bac' })).loi, 'coKhien');
      now += 9 * 3_600_000;
      eq((await goi(A, { hanh: 'danh', doiThu: B, quan: QUAN5, huong: 'bac' })).loi, 'vuaDanh');
      eq((await goi(A, { hanh: 'tim', bo: [D] })).doiThu.id, 'may', 'B vừa bị A đánh, D bị bỏ qua: gặp kinh đô máy');
      now += 4 * 3_600_000;
      eq((await goi(A, { hanh: 'tim', bo: [D] })).doiThu.id, B, 'quá 12 giờ thì gặp lại B');

      // Trận bỏ dở: quá giờ khóa thì người giữ thành mở game là đóng trận, không lần bấm nào.
      const left = await goi(D, { hanh: 'danh', doiThu: B, quan: QUAN5, huong: 'bac' });
      ok(left.ok, 'D đánh B');
      eq(left.banChup, truCua(kinhDoMay(6).ma, mine.cuop), 'D đánh bản chụp B đã trừ của');
      now += (CAU_HINH.lockS + 1) * 1000;
      const b2 = await goi(B, { hanh: 'toi' });
      eq([b2.biDanh[0].id, b2.biDanh[0].xong, b2.biDanh[0].ketQua.bam], [left.tran, true, 0]);
      const [row] = await sql`select bam from public.tran where id = ${left.tran}`;
      eq(row.bam, []);

      // Kinh đô máy: không mất khiên, không cướp của thật. Gửi kèm bản chụp mới (B lên Điện 7) thì gặp kinh đô máy
      // Điện 7; bản chụp sai thì từ chối.
      eq((await goi(B, { hanh: 'danh', doiThu: 'may', quan: QUAN5, huong: 'bac', banChup: 'TDVS1:hỏng' })).loi, 'banChup');
      const botStart = await goi(B, { hanh: 'danh', doiThu: 'may', quan: QUAN5, huong: 'bac', banChup: kinhDoMay(7).ma });
      ok(botStart.ok, `B đánh kinh đô máy: ${JSON.stringify(botStart)}`);
      eq([botStart.banChup, (await goi(B, { hanh: 'toi' })).toi.dien], [kinhDoMay(7).ma, 7]);
      const botDone = await goi(B, { hanh: 'xong', tran: botStart.tran, bam: [{ s: 0, k: 'rut' }] });
      eq([botDone.ketQua.cuop, botDone.ketQua.chienCong.def, botDone.toi.khienDen !== null], [{ gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 }, 0, true]);

      // Trận mà máy chủ đã thử đóng hỏng 2 lần (bị ngắt vì quá CPU): lần sau đóng như rút quân ngay.
      const stuck = await goi(B, { hanh: 'danh', doiThu: 'may', quan: QUAN5, huong: 'tay' });
      await sql`update public.tran set lan_dong = 2 where id = ${stuck.tran}`;
      const rescued = await goi(B, { hanh: 'xong', tran: stuck.tran, bam });
      eq([rescued.ketQua.hong, rescued.ketQua.buoc, rescued.ketQua.sao, rescued.ketQua.bam], [true, 1, 0, 1]);

      // Giới hạn lượt gọi: tìm 30 lần một giờ.
      for (let i = 0; i < CAU_HINH.findPerH; i++) ok((await goi(C, { hanh: 'tim' })).ok, `C tìm lần ${i + 1}`);
      eq(await goi(C, { hanh: 'tim' }), { status: 429, ok: false, loi: 'nhieuQua' });
      now += 3_600_000;
      ok((await goi(C, { hanh: 'tim' })).ok, 'sang giờ sau tìm được');

      // Máy khách đọc theo RLS: chỉ trận mình đánh hay bị đánh; không đọc được bản chụp.
      const seen = await sql.begin(async (tx) => {
        await tx`select set_config('request.jwt.claim.sub', ${D}, true)`;
        await tx`set local role authenticated`;
        return await tx`select ten_danh, ten_giu from public.tran order by bat_dau`;
      });
      eq(seen, [{ ten_danh: 'Dạ Trạch', ten_giu: 'Âu Cơ' }]);
      let denied = false;
      await sql
        .begin(async (tx) => {
          await tx`set local role authenticated`;
          await tx`select * from public.ban_chup`;
        })
        .catch(() => (denied = true));
      ok(denied, 'máy khách không đọc được bản chụp');

      // ---------- PR 6 ----------
      // Bảng xếp hạng: chiến công cao trước, đủ bốn người, đánh dấu đúng mình, hạng khớp chỗ đứng trong bảng.
      const rank = await goi(A, { hanh: 'xepHang' });
      const cups = rank.bang.map((x: { chienCong: number }) => x.chienCong);
      eq([rank.tong, rank.bang.length, cups], [4, 4, [...cups].sort((x, y) => y - x)]);
      const meRow = rank.bang.find((x: { toi?: boolean }) => x.toi);
      eq([meRow.ten, meRow.hang, meRow.chienCong], ['Lạc Long', rank.hang, Math.max(0, mine.chienCong.atk)]);
      eq(rank.bang.map((x: { hang: number }) => x.hang), [1, 2, 3, 4]);
      ok(!JSON.stringify(rank).includes(B), 'bảng xếp hạng không lộ id người khác');
      const [{ top }] = await sql`select ten as top from public.nguoi_choi order by chien_cong desc, tao_luc, id limit 1`;
      eq(rank.bang[0].ten, top);

      // Xem lại trận: người đánh và người giữ thành lấy được bản chụp, quân, các lần bấm; đánh lại ra đúng kết quả đã
      // ghi. Người ngoài không lấy được; trận chưa xong, trận đóng bằng bản luật khác thì không xem lại được.
      for (const who of [A, B]) {
        const re = await goi(who, { hanh: 'xemLai', tran: start.tran });
        eq([re.ok, re.vai, re.banChup, re.quan, re.bam, re.tran.id, re.tran.xemLai], [true, who === A ? 'danh' : 'giu', kinhDoMay(6).ma, quan, bam, start.tran, true], `xem lại (${who})`);
        const { ms: _ms, ...kq } = re.tran.ketQua;
        eq(danhLai(re.banChup, re.quan, re.bam, { atkDien: 5, atkTrophies: 0, defTrophies: 0, bot: false }), kq, 'đánh lại từ dữ liệu xem lại');
      }
      eq((await goi(C, { hanh: 'xemLai', tran: start.tran })).loi, 'khongCoTran');
      eq((await goi(A, { hanh: 'xemLai', tran: 'x' })).loi, 'khongCoTran');
      const dang = await goi(C, { hanh: 'danh', doiThu: 'may', quan: { giao: 5 }, huong: 'bac' });
      ok(dang.ok, `C đánh kinh đô máy: ${JSON.stringify(dang)}`);
      eq((await goi(C, { hanh: 'xemLai', tran: dang.tran })).loi, 'chuaXong');
      await sql`update public.tran set luat = 'cu' where id = ${left.tran}`;
      eq((await goi(B, { hanh: 'xemLai', tran: left.tran })).loi, 'banCu');
      const b3 = (await goi(B, { hanh: 'toi' })) as { biDanh: { id: string; xemLai: boolean }[] };
      eq(b3.biDanh.map((t) => [t.id, t.xemLai]), [[left.tran, false], [start.tran, true]]);

      // Lưu game lên mây: chỉ người đã gắn Google; mã phải đúng dạng mã lưu; máy khác lưu bản mới hơn thì báo lệch.
      const MA = 'TDVL2:' + 'QUJD'.repeat(50);
      eq(await goi(A, { hanh: 'luuMay', ma: MA, dien: 5, goc: 0 }), { status: 403, ok: false, loi: 'canGoogle' });
      eq(await goi(A, { hanh: 'taiMay' }, LUAT_MA, true), { status: 200, ok: true, may: null });
      eq((await goi(A, { hanh: 'luuMay', ma: 'TDVS1:abc', dien: 5, goc: 0 }, LUAT_MA, true)).loi, 'maLuu');
      eq((await goi(A, { hanh: 'luuMay', ma: 'TDVL2:<script>', dien: 5, goc: 0 }, LUAT_MA, true)).loi, 'maLuu');
      eq(await goi(A, { hanh: 'luuMay', ma: MA, dien: 5, goc: 0 }, LUAT_MA, true), { status: 200, ok: true, ban: 1, luc: now });
      now += 60_000;
      eq(await goi(A, { hanh: 'luuMay', ma: MA + 'QUJD', dien: 6, goc: 1 }, LUAT_MA, true), { status: 200, ok: true, ban: 2, luc: now });
      // Máy thứ hai còn giữ số bản 1: không ghi đè; xem thử thấy bản 2; chọn ghi đè thì được.
      eq(await goi(A, { hanh: 'luuMay', ma: MA, dien: 5, goc: 1 }, LUAT_MA, true), { status: 409, ok: false, loi: 'lechMay' });
      eq(await goi(A, { hanh: 'taiMay', chiXem: true }, LUAT_MA, true), { status: 200, ok: true, may: { ban: 2, dien: 6, luc: now } });
      eq((await goi(A, { hanh: 'taiMay' }, LUAT_MA, true)).may.ma, MA + 'QUJD');
      eq((await goi(A, { hanh: 'luuMay', ma: MA, dien: 99, goc: 1, de: true }, LUAT_MA, true)).ban, 3);
      eq((await goi(A, { hanh: 'taiMay' })).may, { ban: 3, dien: 10, luc: now, ma: MA }, 'tải về không cần còn gắn Google');
      eq(await goi(B, { hanh: 'taiMay' }, LUAT_MA, true), { status: 200, ok: true, may: null });
      // Mã lưu dài quá giới hạn, thân yêu cầu dài quá; lệnh khác vẫn chỉ nhận thân ngắn.
      eq((await goi(A, { hanh: 'luuMay', ma: 'TDVL2:' + 'A'.repeat(CAU_HINH.saveMax), dien: 5, goc: 3 }, LUAT_MA, true)).loi, 'maLuu');
      eq((await goi(A, { hanh: 'luuMay', ma: 'TDVL2:' + 'A'.repeat(CAU_HINH.saveMax + 3000), dien: 5, goc: 3 }, LUAT_MA, true)).status, 413);
      eq(await goi(A, { hanh: 'toi', rac: 'A'.repeat(90_000) }), { status: 413, ok: false, loi: 'daiQua' });
      ok((await goi(A, { hanh: 'luuMay', ma: 'TDVL2:' + 'A'.repeat(CAU_HINH.saveMax - 6), dien: 5, goc: 3 }, LUAT_MA, true)).ok, 'mã lưu vừa giới hạn thì nhận');
      let deniedSave = false;
      await sql
        .begin(async (tx) => {
          await tx`set local role authenticated`;
          await tx`select * from public.luu_may`;
        })
        .catch(() => (deniedSave = true));
      ok(deniedSave, 'máy khách không đọc được bản lưu trên mây qua Data API');

      // Rời Đấu thành: xóa người chơi, bản chụp; trận cũ vẫn còn tên; bản lưu trên mây vẫn còn.
      eq(await goi(A, { hanh: 'roi' }), { status: 200, ok: true });
      eq((await goi(A, { hanh: 'taiMay', chiXem: true })).may.ban, 4);
      eq((await goi(A, { hanh: 'toi' })).loi, 'chuaThamGia');
      const [{ n }] = await sql`select count(*)::int as n from public.ban_chup where nguoi = ${A}`;
      eq(n, 0);
      eq((await goi(B, { hanh: 'toi' })).biDanh.at(-1).tenDanh, 'Lạc Long');
    } finally {
      await sql.end();
    }
  },
});
