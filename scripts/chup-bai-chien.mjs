#!/usr/bin/env node
// Chụp bãi chiến phó bản theo nền, ở khổ điện thoại, không cần state game (dựng thẳng `Battlefield` trong trang).
// Có quân hai bên dàn trận như lúc vừa xuất quân để so cỡ. Ảnh vào chup/bai-<nền>-<khung>.png.
// Cách dùng: node scripts/chup-bai-chien.mjs <nền> [nền ...] [--man <số màn lấy quân giặc>] [--khung doc,fold,ngang]
//            [--lui <hệ số>] (lùi camera xa: 0.5 là thấy gấp đôi) [--moc] (vẽ đường ngựa, chỗ Rùa Vàng của Mộ Dạ)
// Nền: rung, benSong, lang, don, nui, doi, ngap, tanVien, thatDieu, coLoa, cuaSong, moDa.

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(require.resolve('vite', { paths: [ROOT] }));

const KHUNG = { doc: [390, 844], fold: [344, 882], ngang: [844, 390] };
const argv = process.argv.slice(2);
const opts = { nen: [], man: 25, khung: ['doc'], lui: 1, moc: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--man') opts.man = Number(argv[++i]);
  else if (a === '--khung') opts.khung = argv[++i].split(',');
  else if (a === '--lui') opts.lui = Number(argv[++i]);
  else if (a === '--moc') opts.moc = true;
  else opts.nen.push(a);
}
if (!opts.nen.length) opts.nen = ['cuaSong', 'moDa'];

const server = await createServer({ root: ROOT, configFile: false, server: { port: 5209, strictPort: false }, logLevel: 'error' });
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
  for (const nen of opts.nen) {
    for (const k of opts.khung) {
      const [w, h] = KHUNG[k];
      const anh = await page.evaluate(
        async ({ nen, man, w, h, lui, moc }) => (await import('/scripts/baiChien.ts')).chupBai(nen, man, w, h, 2, lui, moc),
        { nen, man: opts.man, w, h, lui: opts.lui, moc: opts.moc },
      );
      const ten = `bai-${nen}-${k}${opts.lui !== 1 ? '-lui' : ''}.png`;
      const out = path.join(ROOT, 'chup', ten);
      await writeFile(out, Buffer.from(anh.url.split(',')[1], 'base64'));
      console.log(`Đã chụp chup/${ten} (${anh.calls} lệnh vẽ, ${anh.triangles} tam giác)`);
    }
  }
} finally {
  if (loi.length) console.log(loi.map((l) => '  ! ' + l).join('\n'));
  await browser.close();
  await server.close();
}
