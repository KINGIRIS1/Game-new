#!/usr/bin/env node
// Chụp đề xuất mẫu nhà dân mới (scripts/nhaMoi.ts): mỗi mẫu ở cấp 1, 5, 7, 10 cạnh nhà sàn hiện tại, và xóm sáu nhà
// ở cỡ gần như trên điện thoại. Ảnh từng khung vào docs/de-xuat/nha-moi/ (webp, cho trang đề xuất), ảnh ghép vào
// chup/nha-moi.png để xem nhanh.
// Cách dùng: node scripts/chup-nha-moi.mjs

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(require.resolve('vite', { paths: [ROOT] }));

const CAPS = [1, 5, 7, 10];
const server = await createServer({ root: ROOT, configFile: false, server: { port: 5209, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const loi = [];
page.on('pageerror', (e) => loi.push(String(e)));
page.on('console', (m) => m.type() === 'error' && loi.push(m.text()));
const OUT = path.join(ROOT, 'docs', 'de-xuat', 'nha-moi');
const luu = (ten, src) => writeFile(path.join(OUT, ten), Buffer.from(src.split(',')[1], 'base64'));
try {
  await page.goto(url + 'package.json');
  await mkdir(OUT, { recursive: true });
  await mkdir(path.join(ROOT, 'chup'), { recursive: true });
  const anh = await page.evaluate(async (caps) => (await import('/scripts/nhaMoi.ts')).chupMau(caps), CAPS);
  for (const a of anh) await luu(`${a.id}-${a.cap}.webp`, a.src);
  const xom = {};
  for (const [ten, cap, cung] of [['xom-8', 8, false], ['xom-cu-8', 8, true]]) {
    xom[ten] = await page.evaluate(async ([cap, cung]) => (await import('/scripts/nhaMoi.ts')).chupXom(cap, cung), [cap, cung]);
    await luu(`${ten}.webp`, xom[ten]);
  }
  const nang = await page.evaluate(async () => {
    const mod = await import('/scripts/nhaMoi.ts');
    return { 5: mod.demNang(5), 10: mod.demNang(10) };
  });
  console.log(JSON.stringify(nang));
  const ids = [...new Set(anh.map((a) => a.id))];
  const css = 'margin:0;padding:12px;background:#efe3c6;font:600 15px system-ui;color:#3a2a1a;width:max-content';
  const img = (src, w) => `<img src="${src}" style="display:block;width:${w}px;border:1px solid #c9b48a">`;
  const html = `<body style="${css}">${ids
    .map((id) => `<div style="margin:6px 0 2px">${id}</div><div style="display:flex;gap:6px">${anh.filter((a) => a.id === id).map((a) => img(a.src, 300)).join('')}</div>`)
    .join('')}<div style="display:flex;gap:6px;margin-top:10px">${Object.values(xom).map((s) => img(s, 600)).join('')}</div></body>`;
  await page.setContent(html);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.screenshot({ path: path.join(ROOT, 'chup', 'nha-moi.png'), fullPage: true });
  console.log(`Đã chụp ${anh.length + 2} ảnh vào docs/de-xuat/nha-moi/, ảnh ghép chup/nha-moi.png`);
} finally {
  if (loi.length) console.error(loi.join('\n'));
  await browser.close();
  await server.close();
}
