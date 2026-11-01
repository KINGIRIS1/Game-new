#!/usr/bin/env node
// Chụp dáng cũ phóng theo móng (như kinh đô lớn lúc chưa vẽ lại) và dáng vẽ trên móng mới của công trình ở cả 8 cấp,
// cùng móng, cùng tỉ lệ ô đất, có người đứng để so cỡ.
// Danh sách ở scripts/congTrinh.ts. Ảnh vào chup/cong-trinh-<loại>.png, cảnh cỡ thật vào chup/cong-trinh-canh.png.
// Cách dùng: node scripts/chup-cong-trinh.mjs [loại ...|canh]   (loại: dien, ruong, ben, nhaSan, baiDa, loRen, kho,
// doanhTrai, traiGiao, traiCung, chuongVoi; không ghi gì thì chụp dien, nhaSan và canh)
// Loại còn vẽ theo móng cũ (denPhuDong, denTanVien, denCoLoa, denCuong, bep...) thì chụp mô hình game dựng
// (phóng theo móng), nhìn từ trước và từ sau.

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(require.resolve('vite', { paths: [ROOT] }));

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const muc = args.length ? args : ['dien', 'nhaSan', 'canh'];

const server = await createServer({ root: ROOT, configFile: false, server: { port: 5208, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const loi = [];
page.on('pageerror', (e) => loi.push(String(e)));
page.on('console', (m) => m.type() === 'error' && loi.push(m.text()));
const css = 'margin:0;padding:14px;background:#efe3c6;font:600 16px system-ui;color:#3a2a1a;width:max-content';
const cell = (src, label) => `<figure style="margin:0"><img src="${src}" style="display:block;border:1px solid #c9b48a"><figcaption style="margin-top:4px;font-weight:500">${label}</figcaption></figure>`;
try {
  await page.goto(url + 'package.json');
  await mkdir(path.join(ROOT, 'chup'), { recursive: true });
  for (const m of muc) {
    let html;
    if (m === 'canh') {
      const anh = await page.evaluate(async () => (await import('/scripts/congTrinh.ts')).chupCanh([1, 5, 8]));
      html = `<body style="${css}"><div style="font-size:20px;margin-bottom:8px">Cỡ thật: Điện giữa ba nhà sàn, như lúc chưa phóng to trên điện thoại</div>
        ${anh.map((a) => `<div style="display:flex;gap:12px;margin-bottom:12px">${cell(a.cu, `Dáng cũ phóng theo móng, cấp ${a.cap}`)}${cell(a.moi, `Vẽ lại trên móng, cấp ${a.cap}`)}</div>`).join('')}</body>`;
    } else {
      const { anh, loai } = await page.evaluate(async (m) => {
        const mod = await import('/scripts/congTrinh.ts');
        const loai = mod.LOAI[m];
        if (!loai) throw new Error(`Không có công trình ${m}`);
        return { anh: loai.cu ? mod.chupLo(m) : mod.chupCap(m), loai };
      }, m);
      const [tren, duoi] = loai.cu ? ['nhìn từ trước', 'nhìn từ sau'] : ['dáng cũ phóng theo móng', 'vẽ lại trên móng'];
      const hang = (list) => `<div style="display:flex;gap:10px;margin-bottom:6px">${list.map((a) => cell(a.cu, `Cấp ${a.cap}: ${tren}`)).join('')}</div>
        <div style="display:flex;gap:10px;margin-bottom:18px">${list.map((a) => cell(a.moi, `Cấp ${a.cap}: ${duoi}`)).join('')}</div>`;
      const nhom = [];
      for (let i = 0; i < anh.length; i += 4) nhom.push(anh.slice(i, i + 4));
      const tieuDe = loai.cu ? 'mô hình vẽ theo móng cũ, phóng theo móng; trên nhìn từ trước, dưới nhìn từ sau' : 'trên là dáng cũ phóng theo móng, dưới là vẽ lại';
      html = `<body style="${css}"><div style="font-size:20px;margin-bottom:8px">${loai.ten}, móng ${loai.moi}×${loai.moi}: ${tieuDe}; nét đen là ranh móng</div>
        ${nhom.map(hang).join('')}</body>`;
    }
    await page.setContent(html);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const out = path.join(ROOT, 'chup', `cong-trinh-${m}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log('Đã chụp', path.relative(process.cwd(), out));
    await page.goto(url + 'package.json');
  }
} finally {
  if (loi.length) console.log(loi.map((l) => '  ! ' + l).join('\n'));
  await browser.close();
  await server.close();
}
