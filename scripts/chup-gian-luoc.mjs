#!/usr/bin/env node
// Chụp bản thử giản lược dáng công trình (scripts/thuGianLuoc.ts): mỗi loại một bảng (hàng: hiện tại, kiểu 1, 2, 3;
// cột: cấp), và một góc kinh đô ở độ phóng mặc định cho từng kiểu. Ảnh vào chup/gian-luoc/.
// Cách dùng: node scripts/chup-gian-luoc.mjs [--cap 1,5,8,10] [--cum 5,10]

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(require.resolve('vite', { paths: [ROOT] }));

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1].split(',').map(Number) : d);
const caps = opt('--cap', [1, 5, 8, 10]);
const cums = opt('--cum', [5, 10]);
const OUT = path.join(ROOT, 'chup', 'gian-luoc');

const server = await createServer({ root: ROOT, configFile: false, server: { port: 5209, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const loi = [];
page.on('pageerror', (e) => loi.push(String(e)));
page.on('console', (m) => m.type() === 'error' && loi.push(m.text()));
const luu = (ten, data) => writeFile(path.join(OUT, ten), Buffer.from(data.split(',')[1], 'base64'));
try {
  await page.goto(url + 'package.json');
  await mkdir(OUT, { recursive: true });
  for (const loai of ['nhaSan', 'kho', 'baiDa', 'ruong']) {
    const rows = await page.evaluate(async ([l, c]) => (await import('/scripts/thuGianLuoc.ts')).chupLoai(l, c), [loai, caps]);
    for (const [k, row] of rows.entries()) for (const [i, a] of row.entries()) await luu(`${loai}-k${k}-c${caps[i]}.png`, a);
    console.log('xong', loai);
  }
  for (const level of cums) {
    const anh = await page.evaluate(async (lv) => (await import('/scripts/thuGianLuoc.ts')).chupCum(lv), level);
    for (const [k, a] of anh.entries()) await luu(`cum-c${level}-k${k}.png`, a);
    console.log('xong cụm cấp', level);
  }
} finally {
  if (loi.length) console.error('Lỗi trang:\n' + loi.join('\n'));
  await browser.close();
  await server.close();
}
