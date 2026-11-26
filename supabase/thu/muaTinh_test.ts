// Test lệnh bản đồ Việt Nam PR 4 (mùa, Lạc tướng và Lạc hầu, quy về) trên Postgres thật, như vietNam_test.ts.
//
//   DAU_THANH_DB_URL=postgres://postgres@127.0.0.1:5432/postgres \
//     deno test --config supabase/functions/dau-thanh/deno.json --allow-env --allow-net --allow-read supabase/thu/
//
// Không có DAU_THANH_DB_URL thì bỏ qua. Test xóa sạch schema public và auth của cơ sở dữ liệu ấy.

import postgres from 'npm:postgres@3.4.9';
import { CAU_HINH, LUAT_MA, banChupGop, muaTinh, ngayTinh, tuanTinh } from '../functions/dau-thanh/luat.js';
import { taoXuLy } from '../functions/dau-thanh/xuLy.ts';

const DB = Deno.env.get('DAU_THANH_DB_URL');

function eq(actual: unknown, expected: unknown, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg}\n  được: ${a}\n  cần:  ${e}`);
}
function ok(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const U = (i: number) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
const NGAY = 86_400_000;
const TUAN = 7 * NGAY;

Deno.test({
  name: 'Bản đồ Việt Nam PR 4: kết giao đủ thì tỉnh quy về, Lạc tướng và Lạc hầu mỗi tuần, xếp hạng cuối mùa',
  ignore: !DB,
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const sql = postgres(DB!, { prepare: false, max: 3, onnotice: () => {} });
    try {
      await sql.unsafe('drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;');
      await sql.unsafe(await Deno.readTextFile(new URL('./giaSupabase.sql', import.meta.url)));
      const files = [];
      for await (const f of Deno.readDir(new URL('../migrations/', import.meta.url))) if (f.name.endsWith('.sql')) files.push(f.name);
      for (const name of files.sort()) await sql.unsafe(await Deno.readTextFile(new URL(`../migrations/${name}`, import.meta.url)));
      for (let i = 0; i < 8; i++) await sql`insert into auth.users (id) values (${U(i)})`;

      // Thứ Hai đầu một mùa, giữa trưa giờ Việt Nam.
      let now = Date.UTC(2026, 10, 23, 5);
      while (tuanTinh(now) % CAU_HINH.muaTuan !== 0) now += TUAN;
      const M = muaTinh(now);
      const W = tuanTinh(now);
      const nguoiDung = (req: Request) => {
        const id = req.headers.get('x-thu');
        return Promise.resolve(id ? { id, anDanh: true } : null);
      };
      const xuLy = taoXuLy({ sql, nguoiDung, bayGio: () => now, ngauNhien: () => 0.1 });
      const goi = async (who: string | null, body: Record<string, unknown>) => {
        const res = await xuLy(new Request('http://thu/dau-thanh', { method: 'POST', headers: who ? { 'x-thu': who } : {}, body: JSON.stringify({ luat: LUAT_MA, ...body }) }));
        return { status: res.status, ...(await res.json()) };
      };
      const kho = banChupGop(5, 1e9).ma;
      const [A, B, C, D, E] = [0, 1, 2, 3, 4].map(U);
      for (const [who, tinh, chuc] of [
        [A, '12', 'nong'],
        [B, '12', 'quan'],
        [C, '01', 'thuy'],
        [D, '21', 'hai'],
        [E, '22', 'nong'],
      ]) {
        ok((await goi(who, { hanh: 'chonTinh', tinh })).ok, `chọn ${tinh}`);
        ok((await goi(who, { hanh: 'chonChuc', chuc })).ok, `nhận ${chuc}`);
      }

      // Tuần đầu mùa: A góp 10 điểm gạo, C góp 20 điểm đất đá, B đánh giặc được 30 điểm.
      ok((await goi(A, { hanh: 'gop', gop: { gao: 2000 }, banChup: kho })).ok, 'A góp');
      ok((await goi(C, { hanh: 'gop', gop: { datDa: 4000 }, banChup: kho })).ok, 'C góp');
      await sql`insert into public.tinh_diem (mua, tinh, nguoi, ngay, danh) values (${M}, '12', ${B}, ${ngayTinh(now)}, 30)`;

      // Kết giao: Đà Nẵng chỉ còn thiếu 5 điểm; D góp 10 thì cả tỉnh quy về, lên bảng từ ngày sau.
      await sql`insert into public.tinh_quy (tinh, ket) values ('21', ${CAU_HINH.ketGiao - 5})`;
      const b0 = await goi(null, { hanh: 'bangTinh' });
      eq([b0.quy, b0.bang.find((r: { tinh: string }) => r.tinh === '21')], [[], { tinh: '21', diem: 0, nguoi: 1, gop: 0, ket: CAU_HINH.ketGiao - 5 }]);
      eq((await goi(D, { hanh: 'gop', gop: { go: 1000, sat: 1000 }, banChup: kho })).quyVe, '21', 'góp đủ thì quy về');
      const b1 = await goi(null, { hanh: 'bangTinh' });
      eq([b1.quy, b1.bang.find((r: { tinh: string }) => r.tinh === '21')], [['21'], { tinh: '21', diem: 0, nguoi: 1, gop: 1 }], 'điểm ngày quy về đã dồn vào kết giao');
      eq((await sql`select ket from public.tinh_quy where tinh = '21'`)[0].ket, CAU_HINH.ketGiao + 5);
      now += NGAY;
      const g = await goi(D, { hanh: 'gop', gop: { go: 1000, sat: 1000 }, banChup: kho });
      ok(g.ok && !g.quyVe, 'tỉnh đã quy về thì không báo quy về nữa');
      eq((await sql`select ket from public.tinh_quy where tinh = '21'`)[0].ket, CAU_HINH.ketGiao + 5, 'tỉnh đã quy về thì thôi kết giao');
      eq((await goi(null, { hanh: 'bangTinh' })).bang.find((r: { tinh: string }) => r.tinh === '21').diem, 10, 'từ ngày sau thì lên bảng');

      // Quảng Ngãi chưa quy về: điểm dồn vào kết giao; đạo giặc tuần này ở Quảng Ngãi bị diệt.
      ok((await goi(E, { hanh: 'gop', gop: { gao: 2000 }, banChup: kho })).ok, 'E góp');
      await sql`insert into public.giac_chung (tuan, tinh, mau, con, diet) values (${W}, '22', 3000, 0, now())`;
      const b2 = await goi(E, { hanh: 'bangTinh' });
      eq(b2.bang.find((r: { tinh: string }) => r.tinh === '22'), { tinh: '22', diem: 0, nguoi: 1, gop: 1, ket: 10 });
      eq([b2.dau, b2.toi.danhHieu, b2.toi.truoc, b2.truoc], [[], null, null, { mua: M - 1, xep: [] }], 'mùa đầu chưa có ai, chưa có mùa trước');

      // Tuần sau: Lạc tướng, Lạc hầu theo điểm tuần trước của người đang giữ chức bên võ, bên văn.
      now += TUAN;
      await sql`insert into public.nguoi_choi (id, ten, dien) values (${B}, 'Bé Lạc', 5)`;
      const b3 = await goi(A, { hanh: 'bangTinh' });
      const dau = (b3.dau as { tinh: string; loai: string; ten: string | null }[]).sort((a, b) => (a.tinh + a.loai < b.tinh + b.loai ? -1 : 1));
      eq(dau, [
        { tinh: '01', loai: 'lacHau', ten: null },
        { tinh: '12', loai: 'lacHau', ten: null },
        { tinh: '12', loai: 'lacTuong', ten: 'Bé Lạc' },
        { tinh: '21', loai: 'lacTuong', ten: null },
        { tinh: '22', loai: 'lacHau', ten: null },
      ]);
      eq(b3.toi.danhHieu, { tuan: W + 1, loai: 'lacHau', tinh: '12' });
      eq((await sql`select count(*)::int as n from public.tinh_dau where tuan = ${W + 1}`)[0].n, 68, 'mỗi tỉnh hai dòng, chọn một lần');
      // Đổi chức giữa tuần không đổi danh hiệu tuần này.
      now += CAU_HINH.doiChucMs;
      ok((await goi(A, { hanh: 'chonChuc', chuc: 'thuy' })).ok, 'A đổi chức');
      eq((await goi(A, { hanh: 'bangTinh' })).toi.danhHieu, { tuan: W + 1, loai: 'lacHau', tinh: '12' });
      // Bảng xếp hạng Đấu thành: Lạc tướng có viền tên vàng.
      const xh = await goi(B, { hanh: 'xepHang' });
      eq(xh.bang[0], { hang: 1, ten: 'Bé Lạc', chienCong: 0, dien: 5, toi: true, dau: { loai: 'lacTuong', tinh: '12' } });

      // Sang mùa sau: xếp hạng mùa trước (tỉnh có điểm, hay tỉnh chưa lên bảng mà đã diệt giặc), kết quả của mình.
      now = Date.UTC(2026, 10, 23, 5);
      while (muaTinh(now) !== M + 1) now += TUAN;
      const b4 = await goi(A, { hanh: 'bangTinh' });
      eq(b4.truoc, {
        mua: M,
        xep: [
          { tinh: '01', hang: 2, diem: 20, diet: false },
          { tinh: '12', hang: 1, diem: 40, diet: false },
          { tinh: '21', hang: 3, diem: 10, diet: false },
          { tinh: '22', hang: null, diem: 0, diet: true },
        ].sort((a, b) => ['12', '01', '21', '22'].indexOf(a.tinh) - ['12', '01', '21', '22'].indexOf(b.tinh)),
      });
      eq(b4.toi.truoc, { mua: M, tinh: '12', cua: 10, hang: 1, diem: 40, diet: false });
      eq((await goi(E, { hanh: 'bangTinh' })).toi.truoc, { mua: M, tinh: '22', cua: 10, hang: null, diem: 0, diet: true });
      eq((await sql`select count(*)::int as n from public.mua_ket where mua = ${M}`)[0].n, 34, 'xếp một lần, mỗi tỉnh một dòng');
      eq([b4.dau, b4.toi.danhHieu], [[], null], 'tuần cuối mùa trước không ai góp');
      // Tỉnh đã quy về giữ mãi.
      eq(b4.quy, ['21']);
    } finally {
      await sql.end();
    }
  },
});
