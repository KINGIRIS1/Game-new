#!/usr/bin/env node
// Vẽ sẵn ảnh công trình cho bảng Xây dựng: public/anh-cong-trinh/<loại>.webp, và ghi dấu vân tay mô hình vào
// src/render/anhCongTrinhDau.ts. Chỉ vẽ lại loại có mô hình đã đổi (hay chưa có ảnh); --het thì vẽ lại hết.
// Chạy sau khi đổi dáng công trình (test anhCongTrinh.test.ts nhắc khi quên).
// Cách dùng: node scripts/anh-cong-trinh.mjs [--het]

import { createRequire } from 'node:module';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'anh-cong-trinh');
const DAU = path.join(ROOT, 'src', 'render', 'anhCongTrinhDau.ts');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(require.resolve('vite', { paths: [ROOT] }));
const het = process.argv.includes('--het');

const server = await createServer({ root: ROOT, configFile: false, server: { port: 5209, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];

// Dấu vân tay tính trong Node như test: phần vẽ tạo canvas khi nạp module, giả lập `document` cho đủ dùng.
const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
const anh = await server.ssrLoadModule('/src/render/anhCongTrinh.ts');
const cu = het || !(await access(DAU).then(() => true, () => false)) ? {} : (await server.ssrLoadModule('/src/render/anhCongTrinhDau.ts')).ANH_DAU;
delete globalThis.document;

const dau = {};
const can = [];
for (const kind of anh.THUMB_KINDS) {
  dau[kind] = anh.thumbHash(kind);
  const file = path.join(OUT, `${kind}.webp`);
  const co = await access(file).then(() => true, () => false);
  if (!co || cu[kind] !== dau[kind]) can.push(kind);
}
console.log(can.length ? `Vẽ ${can.length} ảnh: ${can.join(', ')}` : 'Mọi ảnh đã khớp mô hình, không vẽ lại.');

const browser = await chromium.launch();
const loi = [];
try {
  if (can.length) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => loi.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && loi.push(m.text()));
    await page.goto(url + 'package.json');
    const ra = await page.evaluate(async (can) => {
      const anh = await import('/src/render/anhCongTrinh.ts');
      const renderer = anh.thumbRenderer();
      const out = document.createElement('canvas');
      out.width = anh.THUMB_W;
      out.height = anh.THUMB_H;
      const g = out.getContext('2d');
      g.imageSmoothingQuality = 'high';
      const res = {};
      for (const kind of can) {
        anh.renderThumb(renderer, kind);
        g.clearRect(0, 0, out.width, out.height);
        g.drawImage(renderer.domElement, 0, 0, out.width, out.height);
        res[kind] = out.toDataURL('image/webp', 0.85).split(',')[1];
      }
      return res;
    }, can);
    await mkdir(OUT, { recursive: true });
    let kb = 0;
    for (const [kind, b64] of Object.entries(ra)) {
      const buf = Buffer.from(b64, 'base64');
      kb += buf.length / 1024;
      await writeFile(path.join(OUT, `${kind}.webp`), buf);
    }
    console.log(`Đã ghi ${Object.keys(ra).length} ảnh vào public/anh-cong-trinh/ (${kb.toFixed(0)} KB)`);
  }
  const dong = Object.keys(dau)
    .sort()
    .map((k) => `  ${k}: '${dau[k]}',`)
    .join('\n');
  await writeFile(
    DAU,
    `// Tệp sinh bởi scripts/anh-cong-trinh.mjs, đừng sửa tay. Dấu vân tay mô hình của từng ảnh trong public/anh-cong-trinh/:
// game dùng làm ?v= cho trình duyệt tải ảnh mới khi ảnh đổi; anhCongTrinh.test.ts so với mô hình hiện tại.

export const ANH_DAU: Record<string, string> = {
${dong}
};
`,
  );
  console.log('Đã ghi src/render/anhCongTrinhDau.ts');
} finally {
  if (loi.length) console.log(loi.map((l) => '  ! ' + l).join('\n'));
  await browser.close();
  await server.close();
}
