#!/usr/bin/env node
// Đo lag: dựng các cảnh của scripts/chup.mjs ở khổ điện thoại, chờ worker nặn sẵn nhân vật xong, cho chạy ấm máy rồi ghi
// từng khung trong vài giây (window.__debug.lag, src/render/doLag.ts): JS mỗi khung theo phần việc, khung giật vì JS,
// số lệnh vẽ, tam giác, hình và ảnh trên GPU, việc của GPU, bộ nhớ JS, nặn nhân vật ở luồng chính, cú giật lúc vào
// cảnh. Ghi ra JSON để so trước và sau khi sửa.
// Cách dùng: node scripts/do-lag.mjs --giup

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANH, KHUNG, batVite, dungCanh, napPlaywright } from './chup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAC_DINH = ['kinh-do', 'dien8', 'tran', 'pho-ban-5'];
const DO_PHAN_GIAI = ['low', 'medium', 'high'];

const GIUP = `Đo lag Thời đại Văn Lang ở khổ điện thoại (dùng các cảnh của scripts/chup.mjs).

  node scripts/do-lag.mjs [cảnh ...] [tùy chọn]

Cảnh (mặc định: ${MAC_DINH.join(' ')}): mọi cảnh của chup.mjs, xem node scripts/chup.mjs --giup.

Tùy chọn:
  --giay <s>       Số giây đo ít nhất mỗi cảnh (mặc định 10)
  --so-khung <n>   Số khung ghi ít nhất (mặc định 12; máy vẽ bằng phần mềm chỉ được chừng một khung mỗi giây)
  --toi-da <s>     Đo lâu nhất bấy nhiêu giây dù chưa đủ khung (mặc định 60). Trận hết giữa chừng thì thôi đo
  --am <s>         Số giây cho chạy ấm máy trước khi đo (mặc định 2)
  --cpu <hệ số>    Làm chậm CPU luồng chính bấy nhiêu lần cho gần điện thoại (mặc định 1: không làm chậm)
  --toc-do <k>     Thời gian chơi trôi k lần mỗi khung (mặc định 0,1 khi vẽ bằng phần mềm cho trận kéo dài đủ đo, 1 khi có GPU)
  --keo            Lúc đo, lướt camera vòng quanh chỗ đang nhìn và phóng to thu nhỏ qua ngưỡng cây bản thấp
  --khung <tên>    Khổ màn hình: ${Object.keys(KHUNG).join(', ')} (mặc định fold, màn ngoài Fold5)
  --dpr <số>       Mật độ điểm ảnh (mặc định 2)
  --do-phan-giai <mức>  Cài đặt Độ phân giải của game: ${DO_PHAN_GIAI.join(', ')} (mặc định medium, như người chơi mới)
  --hien           Mở cửa sổ trình duyệt thật (máy có màn hình và GPU): khung mỗi giây mới có nghĩa
  --luu <tệp>      Ghi kết quả ra tệp JSON (để so lần sau)
  --so <tệp>       So với kết quả đã ghi bằng --luu, in mức tăng giảm
  --truoc, --sau, --cam, --gio, --url   Như chup.mjs
  --giup           Hiện hướng dẫn này

Ví dụ:
  node scripts/do-lag.mjs --luu chup/lag-truoc.json           # trước khi sửa
  node scripts/do-lag.mjs --so chup/lag-truoc.json            # sau khi sửa
  node scripts/do-lag.mjs dien8 --keo --cpu 4                 # kinh đô nặng, kéo camera, CPU chậm như điện thoại

Máy không có GPU (máy cloud) thì Chromium vẽ bằng phần mềm, chỉ được vài khung mỗi giây: khung mỗi giây và việc dài
không giống điện thoại. Số so được giữa hai bản là JS mỗi khung, JS ước ở 60 khung mỗi giây, lệnh vẽ, tam giác, hình,
ảnh, việc của GPU phần mềm, bộ nhớ, khung giật vì JS.`;

function docThamSo(argv) {
  const opts = { canh: [], giay: 10, soKhung: 12, toiDa: 60, am: 2, cpu: 1, khung: 'fold', dpr: 2, doPhanGiai: 'medium' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Thiếu giá trị sau ${a}`);
      return argv[++i];
    };
    const duong = () => {
      const x = Number(next());
      if (!(x > 0)) throw new Error(`${a} phải là số dương`);
      return x;
    };
    if (a === '--giup' || a === '-h' || a === '--help') opts.giup = true;
    else if (a === '--giay') opts.giay = duong();
    else if (a === '--so-khung') opts.soKhung = duong();
    else if (a === '--toi-da') opts.toiDa = duong();
    else if (a === '--am') opts.am = Number(next());
    else if (a === '--cpu') opts.cpu = duong();
    else if (a === '--toc-do') opts.tocDo = duong();
    else if (a === '--keo') opts.keo = true;
    else if (a === '--khung') opts.khung = next();
    else if (a === '--dpr') opts.dpr = duong();
    else if (a === '--do-phan-giai') opts.doPhanGiai = next();
    else if (a === '--hien') opts.hien = true;
    else if (a === '--luu') opts.luu = next();
    else if (a === '--so') opts.so = next();
    else if (a === '--truoc') opts.truoc = next();
    else if (a === '--sau') opts.sau = next();
    else if (a === '--cam') opts.cam = next().split(',').map(Number);
    else if (a === '--gio') opts.gio = next();
    else if (a === '--url') opts.url = next();
    else if (a.startsWith('--')) throw new Error(`Không hiểu tùy chọn ${a}`);
    else opts.canh.push(a);
  }
  if (!opts.canh.length) opts.canh = [...MAC_DINH];
  for (const c of opts.canh) if (!CANH[c]) throw new Error(`Không có cảnh "${c}". Các cảnh: ${Object.keys(CANH).join(', ')}`);
  if (!KHUNG[opts.khung]) throw new Error(`Không có khung "${opts.khung}". Các khung: ${Object.keys(KHUNG).join(', ')}`);
  if (!DO_PHAN_GIAI.includes(opts.doPhanGiai)) throw new Error(`--do-phan-giai phải là ${DO_PHAN_GIAI.join(', ')}`);
  if (!(opts.am >= 0)) throw new Error('--am phải là số không âm');
  return opts;
}

/** Ghi việc dài (long task: quá 50 ms chặn luồng chính) từ lúc tải trang; mỗi lần tải lại ghi lại từ đầu. */
const GHI_VIEC_DAI = () => {
  window.__viecDai = [];
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__viecDai.push([e.startTime, e.duration]);
    }).observe({ type: 'longtask', buffered: true });
  } catch {
    // Trình duyệt không có long task: bỏ qua.
  }
};

/** Việc dài trong khoảng [t0, t1] (giờ trang): số việc, tổng và việc dài nhất (ms). */
async function viecDai(page, t0, t1) {
  return page.evaluate(
    ([t0, t1]) => {
      const ds = (window.__viecDai ?? []).filter(([t]) => t >= t0 && t <= t1).map(([, d]) => d);
      return { so: ds.length, tong: Math.round(ds.reduce((a, b) => a + b, 0)), max: Math.round(Math.max(0, ...ds)) };
    },
    [t0, t1],
  );
}

const gioTrang = (page) => page.evaluate(() => performance.now());

/** `n` phần tử cuối của `xs` (tên các dáng vừa nặn thêm). */
const cuoi = (xs, n) => (n > 0 ? xs.slice(-n) : []);

async function soLieuCdp(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
}

/** Số khung đã ghi, và có đang đánh (giữ kinh đô, phó bản, Đấu thành chưa phân thắng bại) không. */
const DEM_KHUNG = () => {
  const d = window.__debug;
  const s = d.state();
  const f = s.campaign.battle;
  const p = d.dauBattle();
  return { n: d.lag(), danh: s.raid.phase === 'battle' || (!!f && !f.outcome) || (!!p && !p.outcome) };
};

/** Thời gian CPU (giây) của tiến trình GPU, nơi Chromium vẽ bằng phần mềm khi máy không có GPU; không đọc được thì null. */
async function cpuGpu(bcdp) {
  if (!bcdp) return null;
  try {
    const { processInfo } = await bcdp.send('SystemInfo.getProcessInfo');
    const gpu = processInfo.filter((p) => p.type === 'GPU');
    return gpu.length ? gpu.reduce((a, p) => a + p.cpuTime, 0) : null;
  } catch {
    return null;
  }
}

/** Lướt camera vòng tròn 8 ô quanh chỗ đang nhìn, độ phóng lên xuống qua ngưỡng cây bản thấp (`LITE_ZOOM` = 1). */
const KEO_CAMERA = () => {
  const d = window.__debug;
  const v0 = d.view();
  const t0 = performance.now();
  let on = true;
  const buoc = (now) => {
    if (!on) return;
    const t = (now - t0) / 1000;
    d.camera(v0.x + 8 * Math.sin(t * 0.8), v0.z + 8 * (1 - Math.cos(t * 0.8)), 1.05 - 0.33 * Math.cos(t * 1.1));
    requestAnimationFrame(buoc);
  };
  requestAnimationFrame(buoc);
  window.__thoiKeo = () => {
    on = false;
    d.camera(v0.x, v0.z, v0.zoom);
  };
};

async function doMotCanh(browser, bcdp, url, tenCanh, opts) {
  const ctx = await browser.newContext({ viewport: KHUNG[opts.khung], deviceScaleFactor: opts.dpr, isMobile: true, hasTouch: true, locale: 'vi-VN' });
  const page = await ctx.newPage();
  const loi = [];
  page.on('pageerror', (e) => loi.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') loi.push(`console.error: ${m.text()}`);
  });
  await page.addInitScript(GHI_VIEC_DAI);
  await page.addInitScript((r) => localStorage.setItem('thoi-dai-van-lang/resolution', r), opts.doPhanGiai);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const vao = {};
  let nanSan = 0;
  try {
    await dungCanh(page, url, tenCanh, opts, {
      // Chờ worker nặn sẵn xong (người chơi quay lại đã có đủ dáng trong kho; bản dev không có kho nên lần nào cũng nặn),
      // rồi mới làm chậm CPU. Đồng hồ chơi đặt lại để lúc chờ không tính là vắng.
      sauTaiLai: async () => {
        const t = Date.now();
        await page.waitForFunction(() => window.__debug.nanCon() === 0, null, { timeout: 300000, polling: 250 });
        nanSan = (Date.now() - t) / 1000;
        await page.evaluate((k) => {
          window.__debug.state().lastSeen = Date.now();
          window.__debug.tocDo(k);
        }, opts.tocDo);
        if (opts.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.cpu });
      },
      // Lúc vào cảnh (bấm qua màn hình vào game, chạy `sau` như xuất quân, gọi giặc): ghi riêng để thấy cú giật lúc vào.
      sauKhiVao: async () => {
        vao.t0 = await gioTrang(page);
        vao.nan = await page.evaluate(() => window.__debug.khoNan());
        await page.evaluate(() => window.__debug.lag(true));
      },
    });
    const tomVao = await page.evaluate(() => window.__debug.lag(false));
    const nanVao = await page.evaluate(() => window.__debug.khoNan());
    const tVao = await gioTrang(page);
    const vaoCanh = {
      giay: (tVao - vao.t0) / 1000,
      jsMax: tomVao.js.max,
      jsTren50: tomVao.jsTren50,
      khungMax: tomVao.khung.max,
      viecDai: await viecDai(page, vao.t0, tVao),
      nanLan: nanVao.nanLan - vao.nan.nanLan,
      nanMs: nanVao.nanMs - vao.nan.nanMs,
      nanTen: cuoi(nanVao.nanTen, nanVao.nanLan - vao.nan.nanLan),
    };

    await page.waitForTimeout(opts.am * 1000);
    if (opts.keo) await page.evaluate(KEO_CAMERA);
    const coTran = (await page.evaluate(DEM_KHUNG)).danh;
    const g0 = await cpuGpu(bcdp);
    const t0 = await gioTrang(page);
    await page.evaluate(() => window.__debug.lag(true));
    // Đo tới khi đủ giây và đủ khung, hay tới lúc lâu nhất; trận hết giữa chừng thì thôi (sau đó là cảnh kết quả).
    const batDau = Date.now();
    let hetTran = null;
    for (;;) {
      await page.waitForTimeout(500);
      const giay = (Date.now() - batDau) / 1000;
      const { n, danh } = await page.evaluate(DEM_KHUNG);
      if (coTran && !danh) hetTran = giay;
      if (hetTran !== null || (giay >= opts.giay && n >= opts.soKhung) || giay >= opts.toiDa) break;
    }
    const tom = await page.evaluate(() => window.__debug.lag(false));
    const t1 = await gioTrang(page);
    const g1 = await cpuGpu(bcdp);
    // Dọn rác trước khi đọc bộ nhớ, không thì số tùy lúc trình duyệt vừa dọn hay chưa.
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const m1 = await soLieuCdp(cdp);
    if (opts.keo) await page.evaluate(() => window.__thoiKeo());
    const nanCuoi = await page.evaluate(() => window.__debug.khoNan());

    const n = Math.max(1, tom.soKhung);
    return {
      mo: CANH[tenCanh].mo,
      nanSan,
      ...tom,
      hetTran,
      gpuMs: g0 !== null && g1 !== null ? ((g1 - g0) * 1000) / n : null,
      heapMB: m1.JSHeapUsedSize / 2 ** 20,
      viecDai: await viecDai(page, t0, t1),
      nanLuc: { lan: nanCuoi.nanLan - nanVao.nanLan, ms: nanCuoi.nanMs - nanVao.nanMs, ten: cuoi(nanCuoi.nanTen, nanCuoi.nanLan - nanVao.nanLan) },
      vaoCanh,
      loi,
    };
  } catch (e) {
    return { mo: CANH[tenCanh].mo, loi: [...loi, `lỗi khi đo: ${e.message}`] };
  } finally {
    await ctx.close();
  }
}

const so = (x, f = 1) => (x === null || x === undefined ? '–' : Number(x).toLocaleString('vi-VN', { maximumFractionDigits: f, minimumFractionDigits: 0 }));
const nghin = (x) => `${so(x / 1000, 0)} nghìn`;

/**
 * Mức nhiễu: cùng một bản đo hai lần ở máy cloud lệch chừng ấy. `p` là phần trăm, `min` là mức lệch tuyệt đối nhỏ hơn
 * thế thì bỏ qua. Số đếm (lệnh vẽ, tam giác, hình) gần như không đổi; thời gian JS mỗi khung lệch tới 15%; luật chơi,
 * khối nhịp, khung dài nhất là số nhỏ hay số lẻ, lệch tới 40–80%; bộ nhớ sau khi dọn rác lệch vài MB.
 */
const NHIEU = {
  dem: { p: 1, min: 0 },
  thoiGian: { p: 20, min: 0.5 },
  le: { p: 50, min: 5 },
  vao: { p: 50, min: 20 },
  boNho: { p: 20, min: 3 },
};

/**
 * Mức đổi so với lần trước: " (+12%)", " (+31% nặng hơn)"; không có số cũ thì rỗng. Chỉ ghi nặng hơn, nhẹ hơn khi đổi
 * quá mức nhiễu `muc`. `tot` là số càng lớn càng tốt.
 */
function doi(moi, cu, muc = NHIEU.thoiGian, tot = false) {
  if (cu === undefined || cu === null || moi === null || moi === undefined) return '';
  if (!cu) return moi ? ' (mới có)' : '';
  const p = ((moi - cu) / cu) * 100;
  if (Math.abs(p) < 0.5) return ' (=)';
  const xau = tot ? p < 0 : p > 0;
  const ro = Math.abs(p) >= muc.p && Math.abs(moi - cu) >= muc.min;
  return ` (${p > 0 ? '+' : '−'}${so(Math.abs(p), 0)}%${ro ? (xau ? ' nặng hơn' : ' nhẹ hơn') : ''})`;
}

function inCanh(ten, r, cu, phanMem) {
  console.log(`\n${ten}  ${r.mo}`);
  if (!r.khung) {
    for (const l of r.loi) console.log(`  ! ${l}`);
    return;
  }
  if (r.hetTran !== null) console.log(`  (trận phân thắng bại sau ${so(r.hetTran)} giây đo: thôi đo ở đó)`);
  if (r.soKhung < 5) console.log(`  ! Chỉ ghi được ${r.soKhung} khung: số dưới đây chưa đáng tin`);
  const c = cu ?? {};
  console.log(
    `  JS mỗi khung   TB ${so(r.js.tb, 2)} ms${doi(r.js.tb, c.js?.tb)} · p95 ${so(r.js.p95, 2)} · dài nhất ${so(r.js.max)} ms · ${r.jsTren16} khung > 16,7 ms · ${r.jsTren50} khung > 50 ms (trong ${r.soKhung} khung)`,
  );
  console.log(
    `    chia ra      cảnh ${so(r.canh.tb, 2)} ms${doi(r.canh.tb, c.canh?.tb)} · khác ${so(r.khac.tb, 2)} ms · luật chơi ${so(r.luatGiay)} ms mỗi giây chơi${doi(r.luatGiay, c.luatGiay, NHIEU.le)} · nhịp 4 lần/giây TB ${so(r.nhip.tb, 2)}, dài nhất ${so(r.nhip.max)} ms${doi(r.nhip.tb, c.nhip?.tb, NHIEU.le)}`,
  );
  console.log(`  Ước 60 k/giây  JS ~${so(r.uoc60, 2)} ms mỗi khung${doi(r.uoc60, c.uoc60)} (một khung có 16,7 ms, còn phải chừa cho GPU và trình duyệt)`);
  console.log(
    `  Vẽ             ${so(r.lenh.tb, 0)} lệnh vẽ${doi(r.lenh.tb, c.lenh?.tb, NHIEU.dem)} (nhiều nhất ${r.lenh.max}) · ${nghin(r.tamGiac.tb)} tam giác${doi(r.tamGiac.tb, c.tamGiac?.tb, NHIEU.dem)} · GPU giữ ${r.hinh} hình${doi(r.hinh, c.hinh, NHIEU.dem)}, ${r.anh} ảnh${doi(r.anh, c.anh, NHIEU.dem)}, ${r.shader} shader${doi(r.shader, c.shader, NHIEU.dem)}`,
  );
  if (r.gpuMs !== null) {
    console.log(`  Tiến trình GPU ${so(r.gpuMs, 0)} ms CPU mỗi khung${doi(r.gpuMs, c.gpuMs)}${phanMem ? ' (vẽ bằng phần mềm: tỉ lệ với việc của GPU thật, nhất là số đỉnh, tam giác)' : ''}`);
  }
  console.log(
    `  Khung hình     ${so(r.fps)} khung/giây${doi(r.fps, c.fps, { p: 20, min: 0.2 }, true)} · p95 ${so(r.khung.p95, 0)} ms · ${r.tren50} khung cách > 50 ms${phanMem ? ' (GPU phần mềm: không giống điện thoại)' : ''}`,
  );
  if (!phanMem) {
    const vd = r.viecDai;
    console.log(`  Việc dài       ${vd.so} việc > 50 ms lúc đo${vd.so ? `, tổng ${so(vd.tong, 0)} ms, dài nhất ${so(vd.max, 0)} ms` : ''}${doi(vd.so, c.viecDai?.so, NHIEU.le)}`);
  }
  console.log(`  Bộ nhớ JS      ${so(r.heapMB, 0)} MB sau khi dọn rác${doi(r.heapMB, c.heapMB, NHIEU.boNho)}`);
  console.log(`  Nặn nhân vật   worker nặn sẵn ${so(r.nanSan, 0)} giây (bản dev không có kho) · lúc đo nặn ở luồng chính ${r.nanLuc.lan} lần${r.nanLuc.lan ? `, ${so(r.nanLuc.ms, 0)} ms: ${r.nanLuc.ten.join(', ')}` : ''}`);
  const v = r.vaoCanh;
  const vd = v.viecDai;
  console.log(
    `  Lúc vào cảnh   ${so(v.giay)} giây đầu: khung JS dài nhất ${so(v.jsMax, 0)} ms${doi(v.jsMax, c.vaoCanh?.jsMax, NHIEU.vao)} · ${v.jsTren50} khung JS > 50 ms · nặn ở luồng chính ${v.nanLan} lần${v.nanLan ? `, ${so(v.nanMs, 0)} ms: ${v.nanTen.join(', ')}` : ''}${phanMem ? '' : ` · ${vd.so} việc dài${vd.so ? `, dài nhất ${so(vd.max, 0)} ms` : ''}`}`,
  );
  for (const l of r.loi) console.log(`  ! ${l}`);
}

/** Bảng gọn cuối cùng (Markdown, dán được vào PR). */
function inBang(kq, phanMem) {
  const cot = ['Cảnh', 'JS/khung (ms)', 'p95 JS (ms)', 'Ước 60 k/giây (ms)', 'Lệnh vẽ', 'Tam giác', 'Hình GPU', 'GPU (ms/khung)', 'Bộ nhớ JS (MB)', 'Khung JS > 50 ms', 'Vào cảnh: khung JS dài nhất (ms)'];
  if (!phanMem) cot.push('Khung/giây');
  console.log(`\n| ${cot.join(' | ')} |`);
  console.log(`| --- |${' ---: |'.repeat(cot.length - 1)}`);
  for (const [ten, r] of Object.entries(kq)) {
    if (!r.khung) {
      console.log(`| ${ten} | lỗi |${' |'.repeat(cot.length - 2)}`);
      continue;
    }
    const o = [ten, so(r.js.tb, 2), so(r.js.p95, 1), so(r.uoc60, 2), so(r.lenh.tb, 0), nghin(r.tamGiac.tb), r.hinh, so(r.gpuMs, 0), so(r.heapMB, 0), r.jsTren50, so(r.vaoCanh.jsMax, 0)];
    if (!phanMem) o.push(so(r.fps));
    console.log(`| ${o.join(' | ')} |`);
  }
}

async function main() {
  let opts;
  try {
    opts = docThamSo(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  if (opts.giup) {
    console.log(GIUP);
    return;
  }
  const cu = opts.so ? JSON.parse(await readFile(path.resolve(ROOT, opts.so), 'utf8')) : null;

  const { chromium } = napPlaywright();
  const { url, tat } = await batVite(opts.url);
  const browser = await chromium.launch({ headless: !opts.hien });
  let bcdp = null;
  try {
    bcdp = await browser.newBrowserCDPSession();
  } catch {
    // Trình duyệt không cho phiên CDP cấp trình duyệt: bỏ số tiến trình GPU.
  }
  const kq = {};
  let coLoi = false;
  try {
    const p = await browser.newPage();
    const gl = await p.evaluate(() => {
      const c = document.createElement('canvas').getContext('webgl2');
      const ext = c?.getExtension('WEBGL_debug_renderer_info');
      return c ? String(c.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : c.RENDERER)) : 'không có WebGL2';
    });
    await p.close();
    const phanMem = /swiftshader|llvmpipe|software/i.test(gl);
    opts.tocDo ??= phanMem ? 0.1 : 1;
    const k = KHUNG[opts.khung];
    console.log(
      `Đo lag: khổ ${opts.khung} ${k.width}×${k.height}, dpr ${opts.dpr}, độ phân giải ${opts.doPhanGiai}, CPU chậm ×${opts.cpu}, thời gian chơi ×${so(opts.tocDo, 2)}, ấm máy ${opts.am} giây, đo ít nhất ${opts.giay} giây và ${opts.soKhung} khung (lâu nhất ${opts.toiDa} giây)${opts.keo ? ', kéo camera' : ''}`,
    );
    console.log(`Trình duyệt vẽ bằng: ${gl}`);
    if (phanMem) console.log('  Vẽ bằng phần mềm: khung mỗi giây thấp hơn điện thoại nhiều, không in việc dài (khung nào cũng là việc dài).');
    if (cu) {
      console.log(`So với ${opts.so}: khổ ${cu.khung}, CPU ×${cu.cpu}${cu.keo ? ', kéo camera' : ''}, đo lúc ${cu.luc}`);
      if (cu.khung !== opts.khung || cu.cpu !== opts.cpu || cu.tocDo !== opts.tocDo || !!cu.keo !== !!opts.keo || cu.dpr !== opts.dpr || cu.doPhanGiai !== opts.doPhanGiai) {
        console.log('  ! Lần trước đo với tùy chọn khác: so sánh không công bằng.');
      }
    }
    for (const ten of opts.canh) {
      const r = await doMotCanh(browser, bcdp, url, ten, opts);
      kq[ten] = r;
      inCanh(ten, r, cu?.canh?.[ten], phanMem);
      coLoi ||= !r.khung || r.loi.length > 0;
    }
    inBang(kq, phanMem);
    if (opts.luu) {
      const file = path.resolve(ROOT, opts.luu);
      await mkdir(path.dirname(file), { recursive: true });
      const { canh: _canh, giup: _giup, luu: _luu, so: _so, ...thamSo } = opts;
      await writeFile(file, JSON.stringify({ ...thamSo, gl, luc: new Date().toISOString(), canh: kq }, null, 2));
      console.log(`\nĐã ghi ${path.relative(ROOT, file)}`);
    }
  } finally {
    await browser.close();
    await tat();
  }
  if (coLoi) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
