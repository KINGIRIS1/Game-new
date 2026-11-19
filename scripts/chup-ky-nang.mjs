#!/usr/bin/env node
// Chụp hiệu ứng kỹ năng tướng ngoài bãi theo từng mốc giây sau khi bấm, không cần state game (dựng thẳng `Battlefield`
// trong trang, trận chạy theo bước cố định nên lần nào cũng y nhau). Ảnh là một dải ngang: chup/ky-<kỹ năng>.png.
// Cách dùng: node scripts/chup-ky-nang.mjs <kỹ năng> [kỹ năng ...] [--man <số màn>] [--truoc <giây trận chạy trước khi
//            bấm, mặc định 3>] [--moc 0.2,0.5,0.9,1.4] [--phong <hệ số phóng, mặc định 2.2>] [--co 360x360]
// Kỹ năng: trongTran, phunLua, nhoTre, bocDoi, doiNon, noThan, ruaVang, lienChau, lenhBan, voiXung, hieuTrieu,
// chemCaKinh, ngayAn, hacDe, cocBachDang, namQuoc.

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(require.resolve('vite', { paths: [ROOT] }));

const argv = process.argv.slice(2);
const opts = { ky: [], truoc: 3, moc: [0.2, 0.5, 0.9, 1.4], phong: 2.2, w: 360, h: 360 };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--man') opts.man = Number(argv[++i]);
  else if (a === '--truoc') opts.truoc = Number(argv[++i]);
  else if (a === '--moc') opts.moc = argv[++i].split(',').map(Number);
  else if (a === '--phong') opts.phong = Number(argv[++i]);
  else if (a === '--co') [opts.w, opts.h] = argv[++i].split('x').map(Number);
  else opts.ky.push(a);
}
if (!opts.ky.length) opts.ky = ['voiXung'];

const server = await createServer({ root: ROOT, configFile: false, server: { port: 5219, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const loi = [];
page.on('pageerror', (e) => loi.push(String(e)));
page.on('console', (m) => m.type() === 'error' && loi.push(m.text()));
try {
  await page.goto(url + 'package.json');
  await mkdir(path.join(ROOT, 'chup'), { recursive: true });
  for (const ky of opts.ky) {
    const anh = await page.evaluate(
      async ({ ky, o }) => (await import('/scripts/kyNang.ts')).chupKyNang(ky, o.man, o.truoc, o.moc, o.w, o.h, o.phong),
      { ky, o: opts },
    );
    const ten = `ky-${ky}.png`;
    const out = path.join(ROOT, 'chup', ten);
    await writeFile(out, Buffer.from(anh.url.split(',')[1], 'base64'));
    console.log(`Đã chụp chup/${ten} (${anh.calls} lệnh vẽ, ${anh.triangles} tam giác)`);
  }
} catch (e) {
  loi.push(String(e));
} finally {
  await browser.close();
  await server.close();
}
for (const l of loi) console.log('!', l);
