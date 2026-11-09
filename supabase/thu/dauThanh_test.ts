// Test Edge Function Đấu thành trên Postgres thật (không cần Supabase): dựng lại schema, giả phần Supabase có sẵn
// (giaSupabase.sql), chạy migration, rồi gọi các lệnh như máy khách. Người gọi lấy từ header `x-thu`, đồng hồ giả.
//
//   DAU_THANH_DB_URL=postgres://postgres@127.0.0.1:5432/postgres \
//     deno test --config supabase/functions/dau-thanh/deno.json --allow-env --allow-net --allow-read supabase/thu/
//
// Không có DAU_THANH_DB_URL thì bỏ qua. Test xóa sạch schema public và auth của cơ sở dữ liệu ấy: đừng trỏ vào
// cơ sở dữ liệu thật.

import postgres from 'npm:postgres@3.4.9';
import { CAU_HINH, LUAT_MA, danhLai, kinhDoMay, type QuanDanh } from '../functions/dau-thanh/luat.js';
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
  name: 'Đấu thành: tham gia, tìm, đánh, xong, khiên, khóa, trận bỏ dở, giới hạn lượt, kinh đô máy, rời',
  ignore: !DB,
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const sql = postgres(DB!, { prepare: false, max: 3, onnotice: () => {} });
    try {
      await sql.unsafe('drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;');
      await sql.unsafe(await Deno.readTextFile(new URL('./giaSupabase.sql', import.meta.url)));
      for await (const f of Deno.readDir(new URL('../migrations/', import.meta.url))) {
        await sql.unsafe(await Deno.readTextFile(new URL(`../migrations/${f.name}`, import.meta.url)));
      }
      await sql`insert into auth.users (id) values (${A}), (${B}), (${C}), (${D})`;

      let now = Date.UTC(2026, 10, 9, 12);
      const r = 0.1;
      const xuLy = taoXuLy({ sql, nguoiDung: async (req) => req.headers.get('x-thu'), bayGio: () => now, ngauNhien: () => r });
      const goi = async (who: string | null, body: Record<string, unknown>, luat = LUAT_MA) => {
        const res = await xuLy(
          new Request('http://thu/dau-thanh', { method: 'POST', headers: who ? { 'x-thu': who } : {}, body: JSON.stringify({ luat, ...body }) }),
        );
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
      now += (CAU_HINH.lockS + 1) * 1000;
      const b2 = await goi(B, { hanh: 'toi' });
      eq([b2.biDanh[0].id, b2.biDanh[0].xong, b2.biDanh[0].ketQua.bam], [left.tran, true, 0]);
      const [row] = await sql`select bam from public.tran where id = ${left.tran}`;
      eq(row.bam, []);

      // Kinh đô máy: không mất khiên, không cướp của thật.
      const botStart = await goi(B, { hanh: 'danh', doiThu: 'may', quan: QUAN5, huong: 'bac' });
      ok(botStart.ok, `B đánh kinh đô máy: ${JSON.stringify(botStart)}`);
      const botDone = await goi(B, { hanh: 'xong', tran: botStart.tran, bam: [{ s: 0, k: 'rut' }] });
      eq([botDone.ketQua.cuop, botDone.ketQua.chienCong.def, botDone.toi.khienDen !== null], [{ gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 }, 0, true]);

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

      // Rời Đấu thành: xóa người chơi, bản chụp; trận cũ vẫn còn tên.
      eq(await goi(A, { hanh: 'roi' }), { status: 200, ok: true });
      eq((await goi(A, { hanh: 'toi' })).loi, 'chuaThamGia');
      const [{ n }] = await sql`select count(*)::int as n from public.ban_chup where nguoi = ${A}`;
      eq(n, 0);
      eq((await goi(B, { hanh: 'toi' })).biDanh.at(-1).tenDanh, 'Lạc Long');
    } finally {
      await sql.end();
    }
  },
});
