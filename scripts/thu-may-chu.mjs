// Thử máy chủ Đấu thành thật sau khi triển khai (.github/workflows/may-chu.yml): ping (mã luật phải khớp bản vừa đóng
// gói), đăng nhập ẩn danh, tham gia, đánh kinh đô máy hai trận nặng (Điện 7 và 10, có tướng, bấm kỹ năng), so kết quả
// máy chủ với tự đánh lại ở đây, rồi rời Đấu thành. Mỗi lần chạy để lại một người dùng ẩn danh trong Supabase Auth.
//
//   SUPABASE_URL=https://<mã dự án>.supabase.co SUPABASE_PUBLISHABLE_KEY=sb_publishable_... node scripts/thu-may-chu.mjs

import { pathToFileURL } from 'node:url';
import { LUAT_FILE, ghiLuat } from './luat.mjs';

const URL_ = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';
const REGION = process.env.SUPABASE_REGION ?? 'ap-southeast-1';
if (!URL_ || !KEY) {
  console.error('Thiếu SUPABASE_URL hay SUPABASE_PUBLISHABLE_KEY (GitHub: Settings → Secrets and variables → Actions → Variables).');
  process.exit(1);
}

await ghiLuat();
const luat = await import(pathToFileURL(LUAT_FILE).href);

/** JSON xếp khóa (jsonb của Postgres đổi thứ tự khóa). */
const canon = (v) =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, canon(x)])) : v;

class ThuHong extends Error {}
function fail(msg) {
  throw new ThuHong(msg);
}
process.on('uncaughtException', (e) => {
  console.error(e instanceof ThuHong ? `LỖI: ${e.message}` : e);
  process.exit(1);
});

/** Mỗi lần gọi chờ lâu nhất chừng này (Edge Function gói miễn phí tự dừng sau 150 giây). */
const CHO_MS = 60_000;

let token = '';
async function goi(body) {
  const t = performance.now();
  const res = await fetch(`${URL_}/functions/v1/dau-thanh`, {
    method: 'POST',
    // Chạy hàm ở Singapore, cạnh cơ sở dữ liệu (Region lúc tạo dự án); máy khách PR 5 cũng gửi header này.
    headers: { 'Content-Type': 'application/json', apikey: KEY, 'x-region': REGION, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ luat: luat.LUAT_MA, ...body }),
    signal: AbortSignal.timeout(CHO_MS),
  }).catch((e) => fail(`${body.hanh}: không gọi được máy chủ sau ${Math.round(performance.now() - t)} ms (${e.message})`));
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    fail(`${body.hanh}: máy chủ trả ${res.status} không phải JSON: ${text.slice(0, 300)}`);
  }
  if (!json.ok) fail(`${body.hanh}: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

// 1. Ping: Edge Function chạy, nối được cơ sở dữ liệu, đúng bản luật vừa triển khai.
const ping = await goi({ hanh: 'ping' });
if (ping.luat !== luat.LUAT_MA) fail(`mã luật máy chủ ${ping.luat}, bản vừa đóng gói ${luat.LUAT_MA}`);
console.log(`Ping: mã luật ${ping.luat} khớp, ${ping.nguoi} người chơi.`);

// 2. Đăng nhập ẩn danh (Authentication → Sign In / Providers → Allow anonymous sign-ins).
const auth = await fetch(`${URL_}/auth/v1/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: KEY },
  body: JSON.stringify({ data: {} }),
  signal: AbortSignal.timeout(CHO_MS),
});
const session = await auth.json().catch(() => ({}));
if (!auth.ok || !session.access_token) fail(`đăng nhập ẩn danh: ${auth.status} ${JSON.stringify(session)} (đã bật Allow anonymous sign-ins chưa?)`);
token = session.access_token;
console.log('Đăng nhập ẩn danh: được.');

// 3. Tham gia, đánh kinh đô máy hai trận nặng, so kết quả.
try {
  for (const [dien, huong] of [
    [7, 'tay'],
    [10, 'tay'],
  ]) {
    const thu = luat.banChupThu(dien);
    await goi({ hanh: 'thamGia', ten: 'Máy thử', banChup: thu.ma });
    const start = await goi({ hanh: 'danh', doiThu: 'may', quan: thu.quan, huong });
    const bam = luat.bamThu();
    const t0 = performance.now();
    const mine = luat.danhLai(start.banChup, start.quan, bam, { atkDien: dien, atkTrophies: 0, defTrophies: 0, bot: true });
    const localMs = Math.round(performance.now() - t0);
    const t1 = performance.now();
    const done = await goi({ hanh: 'xong', tran: start.tran, bam });
    const callMs = Math.round(performance.now() - t1);
    const { ms, ...ketQua } = done.ketQua;
    const same = JSON.stringify(canon(ketQua)) === JSON.stringify(canon({ ...mine, chienCong: ketQua.chienCong }));
    console.log(
      `Điện ${dien} ${huong}: ${ketQua.sao} sao, ${Math.round(ketQua.pct * 100)}%, ${ketQua.buoc} bước; máy chủ đánh lại ${ms} ms (cả lần gọi ${callMs} ms), ở đây ${localMs} ms; ${same ? 'khớp' : 'LỆCH'}`,
    );
    if (!same) fail(`kết quả máy chủ ${JSON.stringify(ketQua)} khác tự đánh lại ${JSON.stringify(mine)}`);
  }
  const me = await goi({ hanh: 'toi' });
  if (me.daDanh.length !== 2 || me.daDanh.some((t) => !t.xong)) fail(`toi: ${JSON.stringify(me.daDanh)}`);
  console.log(`Hồ sơ: ${me.toi.ten}, ${me.toi.chienCong} chiến công, ${me.daDanh.length} trận.`);
} finally {
  // 4. Rời Đấu thành để người chơi thật không gặp người thử.
  await goi({ hanh: 'roi' });
  console.log('Rời Đấu thành: xong.');
}
