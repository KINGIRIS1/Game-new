// PROTOTYPE, DÙNG XONG BỎ. Chụp các biến thể khung giao diện (src/ui/prototypeHud.ts):
// dựng kinh đô một lần, rồi mỗi biến thể chụp bốn trạng thái (thường, ô nhiệm vụ, bảng Xây dựng, có giặc).
// Cần server Vite đang chạy (npm run dev).
//   node scripts/chup-prototype-giao-dien.mjs http://localhost:5173/ chup d5 doc [A B C goc]
//   canh: d5 (chương 1, Điện 5) | d8 (chương 4, Điện 8); khung: doc | ngang | fold
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [url, ra, canh = 'd5', khung = 'doc', ...vs] = process.argv.slice(2);
const variants = vs.length ? vs : ['A', 'B', 'C', 'goc'];
const KHUNG = { doc: { width: 390, height: 844 }, ngang: { width: 844, height: 390 }, fold: { width: 344, height: 882 } };
const KEY = 'thoi-dai-van-lang/save/v1';

const browser = await chromium.launch();
const mk = async (save) => {
  const ctx = await browser.newContext({ viewport: KHUNG[khung], deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'vi-VN' });
  if (save) await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { const o = JSON.parse(v); o.lastSeen = Date.now(); localStorage.setItem(k, JSON.stringify(o)); sessionStorage.setItem('seeded', '1'); } }, [KEY, save]);
  const page = await ctx.newPage();
  const loi = [];
  page.on('pageerror', (e) => loi.push(e.message));
  page.on('console', (m) => m.type() === 'error' && loi.push(m.text()));
  return { ctx, page, loi };
};
const wait = (page) => page.waitForFunction(() => window.__debug, null, { timeout: 60000 });

// 1. Dựng state.
const { ctx: c0, page: p0 } = await mk(null);
await p0.goto(url + '?variant=goc');
await wait(p0);
const save = await p0.evaluate(async (canh) => {
  const [G, M, S, SV] = await Promise.all(['/src/game/game.ts', '/src/game/moPhong.ts', '/src/game/story.ts', '/src/game/save.ts'].map((u) => import(u)));
  const s = G.createInitialState(Date.now());
  if (canh === 'd5') M.playChapters({ s, until: (m) => m.at5 >= 0 });
  else M.playChapters({ s, last: 8 });
  for (const r of ['gao', 'voOc', 'datDa', 'sat', 'go']) s.resources[r] += 2000;
  if (G.countOf(s, 'doanhTrai') === 0) M.placeAnywhere(s, 'doanhTrai');
  for (let id; (id = S.pendingStory(s)); ) S.markStory(s, id);
  s.lastSeen = Date.now();
  return SV.serialize(s);
}, canh);
await c0.close();
console.log('state xong');

// 2. Mỗi biến thể: thường, ô nhiệm vụ, bảng Xây dựng, có giặc.
for (const v of variants) {
  const { ctx, page, loi } = await mk(save);
  await page.goto(`${url}?variant=${v}`);
  await wait(page);
  await page.evaluate(() => window.__debug.enter());
  await page.waitForTimeout(1500);
  const shot = async (ten) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${ra}/${canh}-${khung}-${v}-${ten}.png` });
    console.log(v, ten);
  };
  await shot('1thuong');
  const q = await page.evaluate(() => { const el = document.querySelector('[data-pact=quest]'); el?.click(); return !!el; });
  if (q) {
    await shot('2nhiemvu');
    await page.mouse.click(KHUNG[khung].width / 2, KHUNG[khung].height * 0.45);
  }
  await page.evaluate(() => document.querySelector('[data-act=openBuild]').click());
  await shot('3xay');
  await page.evaluate(() => document.querySelector('[data-act=closeSheet]')?.click());
  await page.evaluate(async () => {
    const G = await import('/src/game/game.ts');
    G.callRaidNow(window.__debug.state());
    window.__debug.advance(0);
  });
  await shot('4giac');
  console.log(`${v}: xong${loi.length ? ' | lỗi: ' + loi.join(' / ') : ''}`);
  await ctx.close();
}
await browser.close();
