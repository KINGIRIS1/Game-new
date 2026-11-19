// So trận Đấu thành giữa Node và trình duyệt (docs/thiet-ke.md, Kế hoạch: Đấu thành, PR 5): máy khách đánh trận
// trên điện thoại (Safari là WebKit, Chrome là V8), máy chủ đánh lại trên Deno (V8). Trận phải ra y hệt từng chữ số,
// không thì máy chủ ra kết quả khác điều người chơi thấy. Chạy cùng các trận cố định với scripts/doi-chieu-deno.mjs
// (`doiChieu` trong src/game/mayChu.ts) trong Playwright.
//
//   node scripts/doi-chieu-trinh-duyet.mjs [webkit] [chromium] [firefox]   (mặc định webkit)
//
// GitHub Actions cài WebKit bằng `npx playwright install --with-deps webkit` (deploy.yml).

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { LUAT_FILE, ghiLuat } from './luat.mjs';

const require = createRequire(import.meta.url);
const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const engines = names.length ? names : ['webkit'];

await ghiLuat();
const code = readFileSync(LUAT_FILE, 'utf8');
const luat = await import(pathToFileURL(LUAT_FILE).href);
const t0 = performance.now();
const node = luat.doiChieu();
console.log(`Node: ${Math.round(performance.now() - t0)} ms`);
for (const line of node) console.log(`  ${line}`);

let pw;
try {
  pw = require('playwright');
} catch {
  console.error('Không tìm thấy Playwright (npm i --no-save playwright, rồi npx playwright install webkit).');
  process.exit(2);
}

let lech = false;
for (const name of engines) {
  const browser = await pw[name].launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // Nạp luat.js như một module từ blob (trang trống, không cần máy chủ web), rồi đánh các trận cố định.
    const out = await page.evaluate(async (src) => {
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const m = await import(url);
      const t = performance.now();
      const lines = m.doiChieu();
      return { lines, ms: Math.round(performance.now() - t), ua: navigator.userAgent, ma: m.LUAT_MA };
    }, code);
    if (out.ma !== luat.LUAT_MA) throw new Error(`mã luật lệch: ${out.ma} khác ${luat.LUAT_MA}`);
    console.log(`${name} (${out.ua}): ${out.ms} ms`);
    for (let i = 0; i < node.length; i++) {
      const same = out.lines[i] === node[i];
      lech ||= !same;
      console.log(`  ${same ? 'khớp' : 'LỆCH'}: ${out.lines[i]}`);
    }
    if (out.lines.length !== node.length) {
      lech = true;
      console.log(`  LỆCH: ${out.lines.length} trận, Node ${node.length} trận`);
    }
    for (const e of errors) console.log(`  ! ${e}`);
  } finally {
    await browser.close();
  }
}
if (lech) {
  console.error('Trận trên trình duyệt khác Node.');
  process.exit(1);
}
console.log(`Trình duyệt và Node đánh ${node.length} trận ra y hệt.`);
