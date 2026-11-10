// Thử máy chủ Đấu thành thật sau khi triển khai (job `server` của .github/workflows/deploy.yml): ping (mã luật phải
// khớp bản vừa đóng gói), trình duyệt gọi được (CORS, kể cả header x-region), đăng nhập ẩn danh, tham gia, đánh kinh
// đô máy hai trận nặng (Điện 7 và 10, có tướng, bấm kỹ năng), so kết quả máy chủ với tự đánh lại ở đây; người thử thứ
// hai tham gia để người thứ nhất đánh (đường trận giữa hai người chơi: khóa, khiên, cướp của, trừ kho bản chụp); PR 6:
// bảng xếp hạng, người giữ thành xem lại trận (đánh lại từ dữ liệu máy chủ trả phải ra đúng kết quả đã ghi), lưu mây
// từ chối người ẩn danh; rồi cả hai rời Đấu thành. Mỗi lần chạy để lại hai người dùng ẩn danh trong Supabase Auth.
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
/** Gọi một lệnh. `mongLoi`: lệnh này phải bị từ chối, trả cả mã HTTP và thân trả lời thay vì dừng. */
async function goi(body, as = token, mongLoi = false) {
  const t = performance.now();
  const res = await fetch(`${URL_}/functions/v1/dau-thanh`, {
    method: 'POST',
    // Chạy hàm ở Singapore, cạnh cơ sở dữ liệu (Region lúc tạo dự án); máy khách PR 5 cũng gửi header này.
    headers: { 'Content-Type': 'application/json', apikey: KEY, 'x-region': REGION, ...(as ? { Authorization: `Bearer ${as}` } : {}) },
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
  if (mongLoi) return { status: res.status, ...json };
  if (!json.ok) fail(`${body.hanh}: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

// 1. Ping: Edge Function chạy, nối được cơ sở dữ liệu, đúng bản luật vừa triển khai.
const ping = await goi({ hanh: 'ping' });
if (ping.luat !== luat.LUAT_MA) fail(`mã luật máy chủ ${ping.luat}, bản vừa đóng gói ${luat.LUAT_MA}`);
console.log(`Ping: mã luật ${ping.luat} khớp, ${ping.nguoi} người chơi.`);

// Trình duyệt (trang game trên GitHub Pages) hỏi trước khi gửi: hàm và Auth phải cho phép đủ header game gửi.
const ORIGIN = 'https://kingiris1.github.io';
async function preflight(path, headers) {
  const res = await fetch(`${URL_}${path}`, {
    method: 'OPTIONS',
    headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': headers },
    signal: AbortSignal.timeout(CHO_MS),
  });
  const origin = res.headers.get('access-control-allow-origin');
  const allow = (res.headers.get('access-control-allow-headers') ?? '').toLowerCase();
  if (!res.ok || (origin !== '*' && origin !== ORIGIN)) fail(`CORS ${path}: ${res.status}, allow-origin ${origin}`);
  for (const h of headers.split(',')) if (allow !== '*' && !allow.includes(h)) fail(`CORS ${path}: không cho header ${h} (${allow})`);
}
await preflight('/functions/v1/dau-thanh', 'apikey,authorization,content-type,x-region');
await preflight('/auth/v1/signup', 'apikey,content-type');
console.log('CORS: trình duyệt gọi được hàm và Auth.');

// 2. Đăng nhập ẩn danh (Authentication → Sign In / Providers → Allow anonymous sign-ins).
async function dangKy() {
  const auth = await fetch(`${URL_}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY },
    body: JSON.stringify({ data: {} }),
    signal: AbortSignal.timeout(CHO_MS),
  });
  const session = await auth.json().catch(() => ({}));
  if (!auth.ok || !session.access_token) fail(`đăng nhập ẩn danh: ${auth.status} ${JSON.stringify(session)} (đã bật Allow anonymous sign-ins chưa?)`);
  return { token: session.access_token, id: session.user?.id };
}
token = (await dangKy()).token;
const { token: tokenB, id: idB } = await dangKy();
console.log('Đăng nhập ẩn danh: được.');

// 3. Tham gia, đánh kinh đô máy hai trận nặng, so kết quả.
try {
  for (const [dien, huong] of [
    [7, 'tay'],
    [10, 'tay'],
  ]) {
    const thu = luat.banChupThu(dien);
    await goi({ hanh: 'thamGia', ten: 'Máy thử', banChup: thu.ma });
    // Gửi kèm bản chụp như máy khách thật (tải lại bản chụp lúc vào trận).
    const start = await goi({ hanh: 'danh', doiThu: 'may', quan: thu.quan, huong, banChup: thu.ma });
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
  // Trận giữa hai người thử: B giữ kinh đô máy Điện 7 (có của trong kho); A gửi kèm bản chụp Điện 7 (cùng cấp với B)
  // rồi đánh B theo id, đủ 3 phút.
  await goi({ hanh: 'thamGia', ten: 'Máy thử hai', banChup: luat.kinhDoMay(7).ma }, tokenB);
  const mA = await goi({ hanh: 'toi' });
  const thuA = luat.banChupThu(7);
  const pvp = await goi({ hanh: 'danh', doiThu: idB, quan: thuA.quan, huong: 'bac', banChup: thuA.ma });
  const bam = luat.bamThu();
  const mine = luat.danhLai(pvp.banChup, pvp.quan, bam, { atkDien: 7, atkTrophies: mA.toi.chienCong, defTrophies: 0, bot: false });
  const t1 = performance.now();
  const doneB = await goi({ hanh: 'xong', tran: pvp.tran, bam });
  const { ms, ...ketB } = doneB.ketQua;
  if (JSON.stringify(canon(ketB)) !== JSON.stringify(canon(mine))) fail(`trận hai người: máy chủ ${JSON.stringify(ketB)} khác tự đánh lại ${JSON.stringify(mine)}`);
  const seenB = await goi({ hanh: 'toi' }, tokenB);
  if (seenB.biDanh[0]?.id !== pvp.tran || !seenB.toi.khienDen) fail(`B không thấy mình bị đánh, hay chưa có khiên: ${JSON.stringify(seenB)}`);
  const lay = Object.values(ketB.cuop).reduce((a, b) => a + b, 0);
  console.log(`A đánh B: ${ketB.sao} sao, ${Math.round(ketB.pct * 100)}%, cướp ${lay}; máy chủ đánh lại ${ms} ms (cả lần gọi ${Math.round(performance.now() - t1)} ms); khớp; B có khiên.`);

  const me = await goi({ hanh: 'toi' });
  if (me.daDanh.length !== 3 || me.daDanh.some((t) => !t.xong)) fail(`toi: ${JSON.stringify(me.daDanh)}`);
  console.log(`Hồ sơ: ${me.toi.ten}, ${me.toi.chienCong} chiến công, ${me.daDanh.length} trận.`);

  // PR 6. Bảng xếp hạng: có mình, hạng khớp chỗ đứng. Xem lại: B lấy dữ liệu trận vừa bị đánh, đánh lại ở đây ra
  // đúng kết quả máy chủ đã ghi. Lưu mây: người ẩn danh bị từ chối, chưa có bản lưu nào.
  const rank = await goi({ hanh: 'xepHang' });
  const meRow = rank.bang.find((x) => x.toi);
  if (!meRow || meRow.hang !== rank.hang || meRow.chienCong !== me.toi.chienCong || rank.tong < 2) fail(`xepHang: ${JSON.stringify({ meRow, hang: rank.hang, tong: rank.tong })}`);
  const re = await goi({ hanh: 'xemLai', tran: pvp.tran }, tokenB);
  if (!re.tran.xemLai || re.banChup !== pvp.banChup) fail(`xemLai: ${JSON.stringify(re.tran)}`);
  const again = luat.danhLai(re.banChup, re.quan, re.bam, { atkDien: 7, atkTrophies: mA.toi.chienCong, defTrophies: 0, bot: false });
  if (JSON.stringify(canon(again)) !== JSON.stringify(canon(ketB))) fail(`xem lại: đánh lại ${JSON.stringify(again)} khác kết quả đã ghi ${JSON.stringify(ketB)}`);
  const luu = await goi({ hanh: 'luuMay', ma: 'TDVL2:QUJD', dien: 7, goc: 0 }, token, true);
  if (luu.status !== 403 || luu.loi !== 'canGoogle') fail(`luuMay của người ẩn danh phải bị từ chối: ${JSON.stringify(luu)}`);
  const tai = await goi({ hanh: 'taiMay', chiXem: true });
  if (tai.may !== null) fail(`taiMay: ${JSON.stringify(tai)}`);
  console.log(`Xếp hạng: hạng ${rank.hang}/${rank.tong}. Xem lại: B đánh lại trận bị đánh ra đúng kết quả. Lưu mây: từ chối người ẩn danh.`);

  // Đọc qua Data API theo RLS: thấy trận của mình, không thấy bản chụp.
  const rest = async (path) => {
    const res = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(CHO_MS) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const tran = await rest('tran?select=id,ten_danh&limit=50');
  if (tran.status !== 200 || !Array.isArray(tran.body)) fail(`Data API đọc trận: ${tran.status} ${JSON.stringify(tran.body)}`);
  const ids = new Set(me.daDanh.map((t) => t.id));
  if (tran.body.length !== ids.size || tran.body.some((t) => !ids.has(t.id))) fail(`Data API cho thấy trận không phải của mình: ${JSON.stringify(tran.body)}`);
  const snap = await rest('ban_chup?select=ma&limit=1');
  if (snap.status === 200 && Array.isArray(snap.body) && snap.body.length) fail('Data API cho đọc bản chụp');
  console.log(`Data API: thấy ${tran.body.length} trận của mình, bản chụp bị chặn (${snap.status}).`);
} finally {
  // 4. Rời Đấu thành để người chơi thật không gặp người thử.
  await goi({ hanh: 'roi' });
  await goi({ hanh: 'roi' }, tokenB);
  console.log('Rời Đấu thành: xong.');
}
