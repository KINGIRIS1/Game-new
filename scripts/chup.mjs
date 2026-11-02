#!/usr/bin/env node
// Chụp thử game ở khổ điện thoại bằng Playwright, để nhìn tận mắt mỗi thay đổi ở src/render/ và src/ui/.
// Script tự bật Vite, mở game, dựng cảnh qua window.__debug và các module luật chơi, rồi lưu ảnh vào chup/.
// Cách dùng: node scripts/chup.mjs --giup

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

/** Khổ màn hình (điểm CSS). Game làm cho điện thoại cầm dọc trước tiên. */
const KHUNG = {
  doc: { width: 390, height: 844 },
  /** Màn ngoài Samsung Galaxy Z Fold5 (máy thử chính): dài, hẹp. */
  fold: { width: 344, height: 882 },
  ngang: { width: 844, height: 390 },
  bang: { width: 820, height: 1180 },
};

// Mã dựng cảnh chạy trong trang, có sẵn các biến:
//   d = window.__debug, s = state đang chơi,
//   G = game.ts, M = moPhong.ts (người chơi mô phỏng), D = defs.ts, C = campaign.ts, S = story.ts, X = mau.ts.
// `truoc` chạy trước khi tải lại trang (dựng state rồi lưu), `sau` chạy sau khi tải lại (bấm trận, bấm kỹ năng...).

/** Cho kinh đô một doanh trại và một ít quân, giữ nguyên kho của người chơi. */
const CO_QUAN = `
  const kho = { ...s.resources };
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 };
  if (!G.countOf(s, 'doanhTrai') && !M.placeAnywhere(s, 'doanhTrai')) throw new Error('Không còn chỗ dựng doanh trại');
  s.resources = kho;
  const cho = G.troopCap(s);
  s.troops = { giao: Math.floor(cho / 2), cung: Math.floor(cho / 3), voi: 0, no: 0 };
`;
const KINH_DO = `M.playChapters({ s, until: (m) => m.at5 >= 0 });`;

const CANH = {
  dau: { mo: 'Vừa vào game, đã đóng đoạn truyện mở đầu', truoc: '' },
  truyen: { mo: 'Vừa vào game, đang hiện đoạn truyện mở đầu', truoc: '', giuTruyen: true },
  'kinh-do': { mo: 'Kinh đô chương 1 lúc vừa lên Điện cấp 5 (người chơi mô phỏng chơi chừng một giờ)', truoc: KINH_DO },
  chuong2: {
    mo: 'Kinh đô chương 2, mười phút sau khi vào chương',
    truoc: `M.playChapters({ s, until: (m, sec) => m.enter2 >= 0 && sec >= m.enter2 + 600 });`,
  },
  chuong3: { mo: 'Kinh đô chương 3 lúc lên Điện cấp 7', truoc: `M.playChapters({ s });` },
  dien8: { mo: 'Kinh đô chương 4 lúc lên Điện cấp 8', truoc: `M.playChapters({ s, last: 8 });` },
  'mau-phong-chau': {
    mo: 'Kinh đô chương 1, Điện cấp 5, đã áp mẫu Phong Châu',
    truoc: `${KINH_DO}\ns.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 }; s.khoanh = [...new Set([...s.khoanh, ...X.frameKhoanh(G.dienLevel(s))])].sort((a, b) => a - b); const r = X.applyMau(s, 'phongChau'); if (!r.ok) throw new Error(r.reason);`,
  },
  'mau-co-loa': {
    mo: 'Kinh đô chương 3, Điện cấp 7, đã áp mẫu Cổ Loa',
    truoc: `M.playChapters({ s });\ns.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 }; s.khoanh = [...new Set([...s.khoanh, ...X.frameKhoanh(G.dienLevel(s))])].sort((a, b) => a - b); const r = X.applyMau(s, 'coLoa'); if (!r.ok) throw new Error(r.reason);`,
  },
  tran: {
    mo: 'Giặc đánh kinh đô chương 1, chụp sau 4 giây giao chiến',
    truoc: KINH_DO + CO_QUAN,
    // Gọi giặc rồi cho hết một phút trinh sát báo, để vào trận ngay.
    sau: `const r = G.callRaidNow(s); if (!r.ok) throw new Error('Không gọi giặc được: ' + r.reason); d.advance(D.RAID_WARNING_MS);`,
    // Quay camera về giữa đám lính còn sống của cả hai bên.
    truocKhiChup: `
      const f = (s.raid.battle?.fighters ?? []).filter((f) => f.hp > 0);
      if (f.length) d.camera(f.reduce((a, b) => a + b.x, 0) / f.length, f.reduce((a, b) => a + b.z, 0) / f.length, 1.4);
    `,
    doi: 3000,
  },
  'pho-ban': {
    mo: 'Đánh màn 1 ngoài bãi, chụp sau 3 giây',
    truoc: KINH_DO + CO_QUAN,
    sau: `const r = d.march(1); if (!r.ok) throw new Error('Không đánh màn 1 được: ' + r.reason);`,
    doi: 3000,
  },
};

const GIUP = `Chụp thử Thời đại Văn Lang ở khổ điện thoại.

  node scripts/chup.mjs [cảnh ...] [tùy chọn]

Cảnh có sẵn (mặc định: dau):
${Object.entries(CANH)
  .map(([k, c]) => `  ${k.padEnd(15)} ${c.mo}`)
  .join('\n')}

Tùy chọn:
  --khung doc,fold,ngang,bang  Khổ màn hình, cách nhau dấu phẩy (mặc định: doc = 390×844; fold = 344×882)
  --truoc "<mã>"          Chạy thêm trong trang trước khi tải lại, để dựng state
  --sau "<mã>"            Chạy thêm trong trang sau khi tải lại, để bấm trận, kỹ năng...
                          Mã có sẵn d (window.__debug), s (state), G (game.ts), M (moPhong.ts),
                          D (defs.ts), C (campaign.ts), S (story.ts), X (mau.ts)
  --cam x,z,zoom          Đặt camera nhìn vào ô (x, z)
  --cham <x,z | loại>     Chạm một ô, hoặc công trình đầu tiên thuộc loại đó (vd: dien, ruong) để mở bảng
  --bam "<bộ chọn>"       Bấm một phần tử giao diện (CSS, hoặc text=Chữ trên nút)
  --doi <ms>              Chờ thêm trước khi chụp (mặc định 1200, cảnh trận chờ lâu hơn)
  --ten <tên>             Tên ảnh (mặc định: tên cảnh)
  --ra <thư mục>          Nơi lưu ảnh (mặc định: chup/)
  --dpr <số>              Mật độ điểm ảnh (mặc định 2, như điện thoại thật)
  --url <địa chỉ>         Dùng server Vite đang chạy (npm run dev) thay vì tự bật
  --giup                  Hiện hướng dẫn này

Ví dụ:
  node scripts/chup.mjs kinh-do --cham dien
  node scripts/chup.mjs chuong2 --khung doc,ngang
  node scripts/chup.mjs dau --truoc "s.resources.gao = 5000" --bam "text=Phó bản"

Ảnh lưu ở chup/<tên>-<khung>.png. Lỗi JavaScript trong trang được in ra cuối cùng.`;

function docThamSo(argv) {
  const opts = { canh: [], khung: ['doc'], ra: 'chup', dpr: 2 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Thiếu giá trị sau ${a}`);
      return argv[++i];
    };
    if (a === '--giup' || a === '-h' || a === '--help') opts.giup = true;
    else if (a === '--khung') opts.khung = next().split(',');
    else if (a === '--truoc') opts.truoc = next();
    else if (a === '--sau') opts.sau = next();
    else if (a === '--cam') opts.cam = next().split(',').map(Number);
    else if (a === '--cham') opts.cham = next();
    else if (a === '--bam') opts.bam = next();
    else if (a === '--doi') opts.doi = Number(next());
    else if (a === '--ten') opts.ten = next();
    else if (a === '--ra') opts.ra = next();
    else if (a === '--dpr') opts.dpr = Number(next());
    else if (a === '--url') opts.url = next();
    else if (a.startsWith('--')) throw new Error(`Không hiểu tùy chọn ${a}`);
    else opts.canh.push(a);
  }
  if (!opts.canh.length) opts.canh = ['dau'];
  for (const c of opts.canh) if (!CANH[c]) throw new Error(`Không có cảnh "${c}". Các cảnh: ${Object.keys(CANH).join(', ')}`);
  for (const k of opts.khung) if (!KHUNG[k]) throw new Error(`Không có khung "${k}". Các khung: ${Object.keys(KHUNG).join(', ')}`);
  if (opts.ten && opts.canh.length > 1) throw new Error('--ten chỉ dùng khi chụp một cảnh');
  return opts;
}

function napPlaywright() {
  for (const name of ['playwright', '@playwright/test']) {
    try {
      return require(name);
    } catch {
      // thử tên khác
    }
  }
  console.error('Không tìm thấy Playwright. Cài bằng: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

/** Chạy một đoạn mã trong trang với các biến d, s, G, M, D, C, S, X. */
async function chayMa(page, ma) {
  if (!ma.trim()) return;
  await page.evaluate(async (ma) => {
    const urls = ['/src/game/game.ts', '/src/game/moPhong.ts', '/src/game/defs.ts', '/src/game/campaign.ts', '/src/game/story.ts', '/src/game/mau.ts'];
    const [G, M, D, C, S, X] = await Promise.all(urls.map((u) => import(/* @vite-ignore */ u)));
    const d = window.__debug;
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction('d', 's', 'G', 'M', 'D', 'C', 'S', 'X', ma)(d, d.state(), G, M, D, C, S, X);
  }, ma);
}

async function choGame(page) {
  await page.waitForFunction(() => window.__debug || document.querySelector('.fatal'), null, { timeout: 30000 });
  const fatal = await page.locator('.fatal').count();
  if (fatal) throw new Error(`Game không chạy được: ${await page.locator('.fatal').innerText()}`);
}

async function cham(page, dich) {
  const so = dich.split(',').map(Number);
  const o = so.length === 2 && so.every(Number.isFinite)
    ? { x: so[0], z: so[1] }
    : await page.evaluate((type) => {
        const b = window.__debug.state().buildings.find((b) => b.type === type);
        return b ? { x: b.x, z: b.z } : null;
      }, dich);
  if (!o) throw new Error(`Kinh đô chưa có công trình loại "${dich}"`);
  const p = await page.evaluate(({ x, z }) => window.__debug.tileToScreen(x, z), o);
  await page.touchscreen.tap(p.x, p.y);
}

async function chupMotCanh(browser, url, tenCanh, khung, opts) {
  const canh = CANH[tenCanh];
  const ctx = await browser.newContext({
    viewport: KHUNG[khung],
    deviceScaleFactor: opts.dpr,
    isMobile: true,
    hasTouch: true,
    locale: 'vi-VN',
  });
  const page = await ctx.newPage();
  const loi = [];
  page.on('pageerror', (e) => loi.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') loi.push(`console.error: ${m.text()}`);
  });
  try {
    await page.goto(url, { waitUntil: 'load' });
    await choGame(page);

    // Dựng state, đánh dấu các đoạn truyện đã xem (trừ cảnh muốn xem truyện), lưu rồi tải lại cho giao diện sạch.
    const truoc = [canh.truoc, opts.truoc ?? ''].join('\n');
    const dongTruyen = canh.giuTruyen ? '' : 'for (let id; (id = S.pendingStory(s)); ) S.markStory(s, id);';
    await chayMa(page, `${truoc}\n${dongTruyen}\ns.lastSeen = Date.now(); d.advance(0);`);
    await page.reload({ waitUntil: 'load' });
    await choGame(page);
    await page.waitForTimeout(800);

    await chayMa(page, [canh.sau ?? '', opts.sau ?? ''].join('\n'));
    if (opts.cam) await page.evaluate(([x, z, zoom]) => window.__debug.camera(x, z, zoom), opts.cam);
    if (opts.cham) {
      await page.waitForTimeout(300);
      await cham(page, opts.cham);
    }
    if (opts.bam) await page.locator(opts.bam).first().click({ timeout: 5000 });
    await page.waitForTimeout(opts.doi ?? canh.doi ?? 1200);
    if (canh.truocKhiChup && !opts.cam) {
      await chayMa(page, canh.truocKhiChup);
      await page.waitForTimeout(300);
    }

    const file = path.join(opts.ra, `${opts.ten ?? tenCanh}-${khung}.png`);
    await page.screenshot({ path: file });
    const info = await page.evaluate(() => window.__debug.renderInfo());
    return { file, info, loi };
  } catch (e) {
    return { file: null, info: null, loi: [...loi, `lỗi khi dựng cảnh: ${e.message}`] };
  } finally {
    await ctx.close();
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
  opts.ra = path.resolve(ROOT, opts.ra);
  await mkdir(opts.ra, { recursive: true });

  const { chromium } = napPlaywright();
  let server = null;
  let url = opts.url;
  if (!url) {
    const { createServer } = await import('vite');
    server = await createServer({ root: ROOT, logLevel: 'error', server: { host: '127.0.0.1', port: 5199 } });
    await server.listen();
    url = server.resolvedUrls.local[0];
  }

  const browser = await chromium.launch();
  let coLoi = false;
  try {
    for (const tenCanh of opts.canh) {
      for (const khung of opts.khung) {
        const r = await chupMotCanh(browser, url, tenCanh, khung, opts);
        if (r.file) {
          const draw = r.info ? ` (${r.info.calls} lệnh vẽ, ${r.info.triangles} tam giác)` : '';
          console.log(`Đã chụp ${path.relative(ROOT, r.file)}${draw}`);
        } else {
          console.log(`Không chụp được ${tenCanh}-${khung}`);
        }
        for (const l of r.loi) console.log(`  ! ${l}`);
        coLoi ||= r.loi.length > 0 || !r.file;
      }
    }
  } finally {
    await browser.close();
    await server?.close();
  }
  if (coLoi) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
