#!/usr/bin/env node
// Chụp cận cảnh các nhân vật có khung xương ở mọi tư thế (đứng, đi, thủ, ra đòn, ngã), mỗi nhân vật một hàng.
// Danh sách nhân vật ở scripts/nhanVat.ts. Ảnh vào chup/nhan-vat-<nhóm>.png.
// Cách dùng: node scripts/chup-nhan-vat.mjs <nhóm> [--huong <radian>]   (vd: linh)

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(require.resolve('vite', { paths: [ROOT] }));

const args = process.argv.slice(2);
const nhom = args.find((a) => !a.startsWith('--')) ?? 'linh';
const hi = args.indexOf('--huong');
const huong = hi >= 0 ? Number(args[hi + 1]) : -0.6;

const server = await createServer({ root: ROOT, configFile: false, server: { port: 5207, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const loi = [];
page.on('pageerror', (e) => loi.push(String(e)));
page.on('console', (m) => m.type() === 'error' && loi.push(m.text()));
try {
  await page.goto(url + 'package.json');
  const { cot, hang } = await page.evaluate(
    async ([nhom, huong]) => {
      const m = await import('/scripts/nhanVat.ts');
      return { cot: m.TU_THE.map(([t]) => t), hang: m.chup(nhom, huong) };
    },
    [nhom, huong],
  );
  const html = `<body style="margin:0;padding:12px;background:#efe3c6;font:600 15px system-ui;color:#3a2a1a;width:max-content">
    ${hang.map((h) => `<div style="margin:6px 0 2px">${h.ten}</div><img src="${h.anh}" style="display:block">`).join('')}
    <div style="margin-top:6px;font-weight:400">Cột: ${cot.join(' · ')}</div></body>`;
  await page.setContent(html);
  await mkdir(path.join(ROOT, 'chup'), { recursive: true });
  const out = path.join(ROOT, 'chup', `nhan-vat-${nhom}.png`);
  await page.screenshot({ path: out, fullPage: true });
  console.log('Đã chụp', path.relative(process.cwd(), out));
} finally {
  if (loi.length) console.log(loi.map((l) => '  ! ' + l).join('\n'));
  await browser.close();
  await server.close();
}
