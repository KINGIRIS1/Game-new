// Test giặc chung của tỉnh (bản đồ Việt Nam PR 3) trên Postgres thật, như vietNam_test.ts: dựng lại schema, chạy
// migration, gọi các lệnh như máy khách. Người gọi lấy từ header `x-thu`, đồng hồ giả.
//
//   DAU_THANH_DB_URL=postgres://postgres@127.0.0.1:5432/postgres \
//     deno test --config supabase/functions/dau-thanh/deno.json --allow-env --allow-net --allow-read supabase/thu/
//
// Không có DAU_THANH_DB_URL thì bỏ qua. Test xóa sạch schema public và auth của cơ sở dữ liệu ấy.

import postgres from 'npm:postgres@3.4.9';
import {
  CAU_HINH,
  LUAT_MA,
  banChupGiac,
  danhGiac,
  daoTuan,
  giacToiLuc,
  mauDao,
  muaTinh,
  nhanGiac,
  ngayTuan,
  noiDanh,
  tuanTinh,
} from '../functions/dau-thanh/luat.js';
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
const A = U(0);
const B = U(1);
const C = U(2);
const GIO = 3_600_000;
const NGAY = 24 * GIO;
const TINH = [
  '07', '11', '08', '09', '14', '13', '15', '10', '12', '02', '01', '03', '04', '05', '06', '16', '17', '18',
  '19', '20', '21', '22', '24', '25', '23', '26', '28', '79', '27', '31', '30', '33', '32', '34',
];

Deno.test({
  name: 'Giặc chung: lịch đạo giặc, máu theo người góp tuần trước, đánh ở tỉnh mình hay giúp láng giềng, 3 trận mỗi ngày, diệt đạo',
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
      for (let i = 0; i < 20; i++) await sql`insert into auth.users (id) values (${U(i)})`;

      // Thứ Hai 23/11/2026 giờ Việt Nam.
      let now = Date.UTC(2026, 10, 23, 5);
      const tuan = tuanTinh(now);
      const dao = daoTuan(tuan);
      ok(dao.tinh.length >= 3 && dao.tinh.length <= 5, 'đạo giặc vào 3–5 tỉnh');
      // T: tỉnh bị đánh có láng giềng không bị đánh (N); X: tỉnh không đánh được ở đâu.
      let T = '';
      let N = '';
      for (const n of TINH) {
        const noi = noiDanh(n, dao.tinh);
        if (!dao.tinh.includes(n) && noi.length) {
          N = n;
          T = noi[0];
          break;
        }
      }
      const X = TINH.find((n) => !noiDanh(n, dao.tinh).length)!;
      ok(T && N && X, `tìm được tỉnh thử (đạo ${dao.tinh.join(',')})`);

      const nguoiDung = (req: Request) => {
        const id = req.headers.get('x-thu');
        return Promise.resolve(id ? { id, anDanh: true } : null);
      };
      const xuLy = taoXuLy({ sql, nguoiDung, bayGio: () => now, ngauNhien: () => 0.37 });
      const goi = async (who: string | null, body: Record<string, unknown>) => {
        const res = await xuLy(new Request('http://thu/dau-thanh', { method: 'POST', headers: who ? { 'x-thu': who } : {}, body: JSON.stringify({ luat: LUAT_MA, ...body }) }));
        return { status: res.status, ...(await res.json()) };
      };

      // Quân mang đi: quân của kinh đô máy Điện 7, bớt dần tới khi vừa số chỗ một trận.
      const ban = banChupGiac(7);
      const quan = { ...ban.troops };
      for (let lan = 0; lan < 30 && 'loi' in nhanGiac(ban.ma, quan, {}); lan++) for (const k of Object.keys(quan) as (keyof typeof quan)[]) quan[k] = Math.floor(quan[k] * 0.8);
      const nhan = nhanGiac(ban.ma, quan, {});
      if ('loi' in nhan) throw new Error(`quân thử không hợp lệ: ${nhan.chiTiet}`);
      const maChuan = nhan.ma;
      const danh = (who: string, tinh: string, q: unknown = quan) => goi(who, { hanh: 'giacDanh', tinh, quan: q, hang: {}, banChup: ban.ma });

      // Tuần trước 12 người đã góp ở T: máu đạo ở T là 12 phần; tỉnh khác ít người thì như 10 người.
      const truoc = ngayTuan(tuan - 1);
      for (let i = 0; i < 12; i++) await sql`insert into public.tinh_diem (mua, tinh, nguoi, ngay, diem) values (${muaTinh(now)}, ${T}, ${U(i + 5)}, ${truoc.tu + (i % 7)}, 5)`;
      // Người chỉ có điểm trận (không góp của) không tính.
      await sql`insert into public.tinh_diem (mua, tinh, nguoi, ngay, danh) values (${muaTinh(now)}, ${T}, ${U(19)}, ${truoc.tu}, 50)`;

      ok((await goi(A, { hanh: 'chonTinh', tinh: T })).ok, 'A ở tỉnh bị đánh');
      ok((await goi(A, { hanh: 'chonChuc', chuc: 'quan' })).ok, 'A làm Bồ chính quân');
      ok((await goi(B, { hanh: 'chonTinh', tinh: N })).ok, 'B ở tỉnh láng giềng');
      ok((await goi(B, { hanh: 'chonChuc', chuc: 'nong' })).ok, 'B làm Bồ chính nông');
      ok((await goi(C, { hanh: 'chonTinh', tinh: X })).ok, 'C ở xa');

      // Trước thứ Sáu: chưa có giặc, bảng chưa có máu đạo.
      const g0 = (await goi(A, { hanh: 'bangTinh' })).giac;
      eq([g0.tuan, g0.nhom, g0.dao, g0.tranNay, g0.thuong], [tuan, dao.nhom, [], 0, []]);
      eq((await danh(A, T)).loi, 'giacChuaToi');

      // Thứ Sáu: đạo giặc tới.
      now = giacToiLuc(tuan) + GIO;
      const g1 = (await goi(null, { hanh: 'bangTinh' })).giac;
      eq(
        g1.dao.map((d: { tinh: string }) => d.tinh),
        dao.tinh,
        'đạo ở đúng các tỉnh của tuần',
      );
      eq(g1.dao.find((d: { tinh: string }) => d.tinh === T), { tinh: T, mau: mauDao(12), con: mauDao(12), diet: null });
      for (const d of g1.dao) if (d.tinh !== T) eq(d.mau, mauDao(0), 'tỉnh ít người góp thì như 10 người');

      // Chỗ đánh: tỉnh mình có giặc thì đánh ở tỉnh mình; không thì giúp láng giềng; ở xa thì không đánh được.
      eq((await danh(C, T)).loi, 'khongDanhDuoc');
      eq((await danh(A, N)).loi, 'khongDanhDuoc');
      eq((await danh(A, T, { giao: 9999 })).loi, 'quan');
      eq((await goi(A, { hanh: 'giacDanh', tinh: T, quan, banChup: 'TDVS1:hong' })).loi, 'banChup');

      // A đánh: máy chủ đánh lại ra đúng như máy khách đánh với cùng hạt giống, lần bấm; Bồ chính quân ×1,5.
      const d1 = await danh(A, T);
      eq([d1.tinh, d1.nhom, d1.he, d1.tranNay], [T, dao.nhom, 1.5, 1]);
      const may = danhGiac(maChuan, d1.quan, dao.nhom, d1.seed, [], 1.5);
      ok(may.sat > 0, `trận hạ được giặc (${may.pha})`);
      const x1 = await goi(A, { hanh: 'giacXong', tran: d1.tran, bam: [] });
      eq([x1.sat, x1.diemTa, x1.diemGiup, x1.con, x1.diet], [may.sat, may.sat, 0, mauDao(12) - may.sat, false]);
      eq((await goi(A, { hanh: 'giacXong', tran: d1.tran, bam: [{ s: 0, k: 'rut' }] })).sat, may.sat, 'đóng lại trận đã xong thì trả kết quả cũ');
      eq((await goi(B, { hanh: 'giacXong', tran: d1.tran, bam: [] })).loi, 'khongCoTran', 'không đóng trận người khác');
      const toiA = (await goi(A, { hanh: 'bangTinh' })).toi;
      eq([toiA.diemMua, toiA.diemNgay], [may.sat, 0], 'điểm trận vào điểm mùa, không vào trần góp ngày');

      // B giúp láng giềng: hệ số 1, điểm chia đôi (tỉnh mình phần lẻ xuống).
      const d2 = await danh(B, T);
      eq(d2.he, 1);
      const x2 = await goi(B, { hanh: 'giacXong', tran: d2.tran, bam: [] });
      const satB = danhGiac(maChuan, d2.quan, dao.nhom, d2.seed, [], 1).sat;
      eq([x2.sat, x2.diemTa, x2.diemGiup], [satB, Math.floor(satB / 2), satB - Math.floor(satB / 2)]);
      const bang = (await goi(B, { hanh: 'bangTinh' })).bang as { tinh: string; diem: number; nguoi: number; gop: number }[];
      eq(bang.find((d) => d.tinh === N)?.diem, Math.floor(satB / 2), 'tỉnh B được nửa điểm');
      // Tỉnh bị đánh: điểm trận của A, nửa điểm của B, cùng 12 người góp và một người đánh từ trước (cùng mùa).
      eq(bang.find((d) => d.tinh === T)?.diem, may.sat + satB - Math.floor(satB / 2) + 12 * 5 + 50, 'tỉnh bị đánh được điểm A và nửa điểm B');

      // Mỗi ngày 3 trận (trận bỏ dở cũng tính); quá giờ gửi kết quả thì như rút quân ở bước đầu.
      const d3 = await danh(A, T);
      now += CAU_HINH.giacXongMs + 1;
      eq((await goi(A, { hanh: 'giacXong', tran: d3.tran, bam: [] })).sat, 0, 'quá giờ thì không hạ được giặc nào');
      ok((await danh(A, T)).ok, 'trận thứ ba');
      eq((await danh(A, T)).loi, 'hetTran');
      eq((await goi(A, { hanh: 'bangTinh' })).giac.tranNay, CAU_HINH.giacTranNgay);

      // Sang ngày sau: đánh tiếp; đạo còn ít máu thì trận này diệt đạo, người đã đánh có thưởng.
      now += NGAY;
      await sql`update public.giac_chung set con = 1 where tuan = ${tuan} and tinh = ${T}`;
      const d5 = await danh(A, T);
      const x5 = await goi(A, { hanh: 'giacXong', tran: d5.tran, bam: [] });
      eq([x5.con, x5.diet], [0, true]);
      eq((await danh(A, T)).loi, 'daDiet');
      eq((await goi(A, { hanh: 'bangTinh' })).giac.thuong, [{ tuan, tinh: T }]);
      eq((await goi(B, { hanh: 'bangTinh' })).giac.thuong, [{ tuan, tinh: T }], 'B có đánh nên cũng có thưởng');
      eq((await goi(C, { hanh: 'bangTinh' })).giac.thuong, [], 'C không đánh');

      // Sang tuần sau (thứ Hai): giặc rút, chưa có đạo mới; thưởng vẫn còn (hai tuần gần đây).
      now = giacToiLuc(tuan + 1) - 2 * NGAY;
      eq((await danh(A, T)).loi, 'giacChuaToi');
      const g2 = (await goi(A, { hanh: 'bangTinh' })).giac;
      eq([g2.tuan, g2.dao, g2.thuong], [tuan + 1, [], [{ tuan, tinh: T }]]);
    } finally {
      await sql.end();
    }
  },
});
