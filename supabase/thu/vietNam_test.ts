// Test lệnh bản đồ Việt Nam (PR 2: máy chủ điểm tỉnh) trên Postgres thật, như dauThanh_test.ts: dựng lại schema, chạy
// migration, gọi các lệnh như máy khách. Người gọi lấy từ header `x-thu`, đồng hồ giả.
//
//   DAU_THANH_DB_URL=postgres://postgres@127.0.0.1:5432/postgres \
//     deno test --config supabase/functions/dau-thanh/deno.json --allow-env --allow-net --allow-read supabase/thu/
//
// Không có DAU_THANH_DB_URL thì bỏ qua. Test xóa sạch schema public và auth của cơ sở dữ liệu ấy.

import postgres from 'npm:postgres@3.4.9';
import { CAU_HINH, LUAT_MA, banChupGop, muaTinh, ngayTinh } from '../functions/dau-thanh/luat.js';
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

/** Người dùng thứ `i` (0 là A). */
const U = (i: number) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
const A = U(0);
const B = U(1);
const GIO = 3_600_000;
const NGAY = 24 * GIO;

Deno.test({
  name: 'Bản đồ Việt Nam: chọn tỉnh mỗi mùa một lần, chức chờ 24 giờ, góp của theo sức chứa kho, trần ngày, bảng tỉnh top 30',
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
      for (let i = 0; i < 40; i++) await sql`insert into auth.users (id) values (${U(i)})`;

      // Giữa thứ Hai 23/11/2026 giờ Việt Nam: đầu một tuần.
      let now = Date.UTC(2026, 10, 23, 5);
      const nguoiDung = (req: Request) => {
        const id = req.headers.get('x-thu');
        return Promise.resolve(id ? { id, anDanh: true } : null);
      };
      const xuLy = taoXuLy({ sql, nguoiDung, bayGio: () => now, ngauNhien: () => 0.1 });
      const goi = async (who: string | null, body: Record<string, unknown>) => {
        const res = await xuLy(new Request('http://thu/dau-thanh', { method: 'POST', headers: who ? { 'x-thu': who } : {}, body: JSON.stringify({ luat: LUAT_MA, ...body }) }));
        return { status: res.status, ...(await res.json()) };
      };
      const toi = async (who: string) => (await goi(who, { hanh: 'bangTinh' })).toi;

      // Cần đăng nhập; chưa chọn tỉnh thì bảng trống, chưa nhận chức được, chưa góp được.
      eq((await goi(null, { hanh: 'bangTinh' })).toi, null, 'chưa đăng nhập vẫn xem được bảng');
      eq((await goi(null, { hanh: 'chonTinh', tinh: '12' })).loi, 'chuaDangNhap');
      const trong = await goi(A, { hanh: 'bangTinh' });
      eq([trong.ok, trong.mua, trong.ngay, trong.toi, trong.bang], [true, muaTinh(now), ngayTinh(now), null, []]);
      eq((await goi(A, { hanh: 'chonChuc', chuc: 'nong' })).loi, 'chuaChonTinh');
      eq((await goi(A, { hanh: 'gop', gop: { gao: 1 }, banChup: banChupGop(5, 1000).ma })).loi, 'chuaChonTinh');

      // Chọn tỉnh: mã sai thì từ chối; chọn lần đầu được ngay, cả tỉnh chưa quy về.
      eq((await goi(A, { hanh: 'chonTinh', tinh: '99' })).loi, 'khongCoTinh');
      eq((await goi(A, { hanh: 'chonTinh', tinh: '12' })).toi, { tinh: '12', chuc: null, mua: muaTinh(now), chucLuc: null, diemMua: 0, diemNgay: 0 });
      eq((await goi(A, { hanh: 'chonTinh', tinh: '01' })).loi, 'doiTinhMuaSau', 'cùng mùa không đổi tỉnh');
      ok((await goi(A, { hanh: 'chonTinh', tinh: '12' })).ok, 'chọn lại đúng tỉnh đang ở thì được');

      // Chức: hải chỉ ở tỉnh giáp biển (Phú Thọ không giáp biển); đổi chức chờ 24 giờ.
      eq((await goi(A, { hanh: 'chonChuc', chuc: 'tuong' })).loi, 'khongCoChuc');
      eq((await goi(A, { hanh: 'chonChuc', chuc: 'hai' })).loi, 'chucChiGiapBien');
      eq((await goi(A, { hanh: 'chonChuc', chuc: 'nong' })).toi.chuc, 'nong');
      const t0 = now;
      now += 23 * GIO;
      eq((await goi(A, { hanh: 'chonChuc', chuc: 'thuy' })).chiTiet, String(GIO), 'còn một giờ mới đổi được chức');
      ok((await goi(A, { hanh: 'chonChuc', chuc: 'nong' })).ok, 'nhận lại đúng chức đang giữ thì được');
      now = t0 + NGAY;
      eq((await goi(A, { hanh: 'chonChuc', chuc: 'thuy' })).toi.chucLuc, now);
      now += NGAY;
      ok((await goi(A, { hanh: 'chonChuc', chuc: 'nong' })).ok, 'đủ 24 giờ thì đổi lại được');

      // Góp: kho 20 000 thì 2 000 gạo là 10% sức chứa, được 10 điểm.
      const kho = banChupGop(5, 1e9);
      eq(kho.cap, 20_000, 'sức chứa kho máy Điện 5');
      const g1 = await goi(A, { hanh: 'gop', gop: { gao: 2000 }, banChup: kho.ma });
      eq([g1.diem, g1.gop, g1.toi.diemMua, g1.toi.diemNgay], [10, { gao: 2000 }, 10, 10]);
      eq((await goi(A, { hanh: 'gop', gop: { datDa: 2000 }, banChup: kho.ma })).loi, 'gopSai', 'Bồ chính nông chỉ góp gạo');
      eq((await goi(A, { hanh: 'gop', gop: { gao: 1.5 }, banChup: kho.ma })).loi, 'gopSai');
      eq((await goi(A, { hanh: 'gop', gop: { gao: 100 }, banChup: kho.ma })).loi, 'itQua', 'dưới 1 điểm');
      eq((await goi(A, { hanh: 'gop', gop: { gao: 2000 }, banChup: banChupGop(5, 1000).ma })).chiTiet, 'gao', 'kho không đủ của');
      eq((await goi(A, { hanh: 'gop', gop: { gao: 2000 }, banChup: 'TDVS1:hong' })).loi, 'banChup');
      // Trần ngày: góp thêm 90 điểm là đủ 100; thêm nữa thì từ chối, báo còn 0.
      ok((await goi(A, { hanh: 'gop', gop: { gao: 18_000 }, banChup: kho.ma })).ok, 'góp thêm 90 điểm');
      eq([(await goi(A, { hanh: 'gop', gop: { gao: 200 }, banChup: kho.ma })).loi, (await goi(A, { hanh: 'gop', gop: { gao: 200 }, banChup: kho.ma })).chiTiet], ['tranNgay', '0']);
      eq((await toi(A)).diemNgay, CAU_HINH.gopNgay);
      // Sang ngày mới (giờ Việt Nam) thì góp tiếp được.
      now += NGAY;
      eq((await goi(A, { hanh: 'gop', gop: { gao: 4000 }, banChup: kho.ma })).toi, { tinh: '12', chuc: 'nong', mua: muaTinh(now), chucLuc: t0 + 2 * NGAY, diemMua: 120, diemNgay: 20 });

      // Bồ chính quân chưa góp của (đánh giặc chung ở PR 3); giới hạn lượt góp mỗi giờ.
      ok((await goi(B, { hanh: 'chonTinh', tinh: '12' })).ok, 'B chọn Phú Thọ');
      eq((await goi(B, { hanh: 'gop', gop: { gao: 2000 }, banChup: kho.ma })).loi, 'chuaCoChuc');
      ok((await goi(B, { hanh: 'chonChuc', chuc: 'quan' })).ok, 'B nhận Bồ chính quân');
      for (let i = 0; i < CAU_HINH.gopPerH; i++) eq((await goi(B, { hanh: 'gop', gop: { gao: 2000 }, banChup: kho.ma })).loi, 'chucKhongGop');
      eq((await goi(B, { hanh: 'gop', gop: { gao: 2000 }, banChup: kho.ma })).loi, 'nhieuQua');

      // Bảng tỉnh: điểm tỉnh cộng 30 người góp nhiều nhất. 32 người nữa ở Phú Thọ, người thứ k góp k điểm (k = 1..32);
      // Bồ chính thương góp vỏ ốc và gỗ cùng lần.
      const diemNguoi = [120];
      for (let k = 1; k <= 32; k++) {
        const who = U(k + 2);
        ok((await goi(who, { hanh: 'chonTinh', tinh: '12' })).ok, `người ${k} chọn tỉnh`);
        ok((await goi(who, { hanh: 'chonChuc', chuc: 'thuong' })).ok, `người ${k} nhận chức`);
        const voOc = Math.ceil(k / 2) * 200;
        const go = (k - Math.ceil(k / 2)) * 200;
        const g = await goi(who, { hanh: 'gop', gop: go ? { voOc, go } : { voOc }, banChup: kho.ma });
        eq(g.diem, k, `người ${k} góp ${k} điểm`);
        diemNguoi.push(k);
      }
      // Một người ở Đà Nẵng (giáp biển) làm Bồ chính hải.
      const dn = U(36);
      ok((await goi(dn, { hanh: 'chonTinh', tinh: '21' })).ok, 'chọn Đà Nẵng');
      ok((await goi(dn, { hanh: 'chonChuc', chuc: 'hai' })).ok, 'Bồ chính hải ở tỉnh giáp biển');
      eq((await goi(dn, { hanh: 'gop', gop: { go: 1000, sat: 1000 }, banChup: kho.ma })).diem, 10);
      const top30 = [...diemNguoi].sort((a, b) => b - a).slice(0, CAU_HINH.topTinh).reduce((a, b) => a + b, 0);
      const bang = (await goi(A, { hanh: 'bangTinh' })).bang as { tinh: string; diem: number; nguoi: number; gop: number }[];
      eq(
        bang.sort((a, b) => (a.tinh < b.tinh ? -1 : 1)),
        [
          { tinh: '12', diem: top30, nguoi: 34, gop: 33 },
          { tinh: '21', diem: 10, nguoi: 1, gop: 1 },
        ],
      );

      // Sang mùa sau: điểm mùa mới về 0; đổi tỉnh được một lần, giữ chức nếu tỉnh mới có chức ấy.
      now += CAU_HINH.doiChucMs + 28 * NGAY;
      ok(muaTinh(now) > muaTinh(t0), 'đã sang mùa sau');
      eq((await goi(A, { hanh: 'bangTinh' })).bang.find((d: { tinh: string }) => d.tinh === '12').diem, 0, 'mùa mới chưa ai góp');
      eq((await goi(A, { hanh: 'chonTinh', tinh: '21' })).toi.chuc, 'nong');
      eq((await goi(A, { hanh: 'chonTinh', tinh: '01' })).loi, 'doiTinhMuaSau');
      // Bồ chính hải sang tỉnh không giáp biển thì mất chức, nhận chức khác ngay.
      eq((await goi(dn, { hanh: 'chonTinh', tinh: '01' })).toi, { tinh: '01', chuc: null, mua: muaTinh(now), chucLuc: null, diemMua: 0, diemNgay: 0 });
      ok((await goi(dn, { hanh: 'chonChuc', chuc: 'bien' })).ok, 'nhận chức mới ngay');

      // Ping dọn điểm quá 120 ngày.
      now += (CAU_HINH.giuNgay + 30) * NGAY;
      await sql`update public.tinh_diem set ngay = ngay - ${CAU_HINH.giuNgay + 10}`;
      ok((await goi(null, { hanh: 'ping' })).ok, 'ping');
      eq((await sql`select count(*)::int as n from public.tinh_diem`)[0].n, 0, 'điểm cũ đã dọn');
    } finally {
      await sql.end();
    }
  },
});
