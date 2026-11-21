#!/usr/bin/env node
// Vẽ sẵn ảnh động thần thú: public/anh-thu/<thú>.webp (dải khung xếp ngang), và ghi dấu vân tay mô hình vào
// src/render/anhThuDau.ts. Chỉ vẽ lại thú có mô hình đã đổi (hay chưa có ảnh); --het thì vẽ lại hết.
// Chạy sau khi đổi dáng thần thú (test anhThu.test.ts nhắc khi quên).
// Cách dùng: node scripts/anh-thu.mjs [--het]

import { createRequire } from 'node:module';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'anh-thu');
const DAU = path.join(ROOT, 'src', 'render', 'anhThuDau.ts');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(require.resolve('vite', { paths: [ROOT] }));
const het = process.argv.includes('--het');

const server = await createServer({ root: ROOT, configFile: false, server: { port: 5213, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];

// Dấu vân tay tính trong Node như test: phần vẽ tạo canvas khi nạp module, giả lập `document` cho đủ dùng.
const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
const anh = await server.ssrLoadModule('/src/render/anhThu.ts');
const { THAN_THU_IDS: MON_IDS } = await server.ssrLoadModule('/src/game/defs.ts');
const cu = het || !(await access(DAU).then(() => true, () => false)) ? {} : (await server.ssrLoadModule('/src/render/anhThuDau.ts')).ANH_THU_DAU;
delete globalThis.document;

const dau = {};
const can = [];
for (const kind of MON_IDS) {
  dau[kind] = anh.thuHash(kind);
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
      const anh = await import('/src/render/anhThu.ts');
      const { thumbRenderer } = await import('/src/render/anhCongTrinh.ts');
      const renderer = thumbRenderer();
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(anh.THU_PX, anh.THU_PX, false);
      const out = document.createElement('canvas');
      out.width = anh.THU_PX * anh.THU_KHUNG;
      out.height = anh.THU_PX;
      const g = out.getContext('2d');
      g.imageSmoothingQuality = 'high';
      const res = {};
      for (const kind of can) {
        const { scene, cam, frame } = anh.thuCanh(kind);
        g.clearRect(0, 0, out.width, out.height);
        for (let i = 0; i < anh.THU_KHUNG; i++) {
          frame(i);
          renderer.render(scene, cam);
          g.drawImage(renderer.domElement, i * anh.THU_PX, 0, anh.THU_PX, anh.THU_PX);
        }
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
    console.log(`Đã ghi ${Object.keys(ra).length} ảnh vào public/anh-thu/ (${kb.toFixed(0)} KB)`);
  }
  const dong = Object.keys(dau)
    .sort()
    .map((k) => `  '${k}': '${dau[k]}',`)
    .join('\n');
  await writeFile(
    DAU,
    `// Tệp sinh bởi scripts/anh-thu.mjs, đừng sửa tay. Dấu vân tay mô hình của từng ảnh động thần thú trong public/anh-thu/:
// game dùng làm ?v= cho trình duyệt tải ảnh mới khi ảnh đổi; anhThu.test.ts so với mô hình hiện tại.

export const ANH_THU_DAU: Record<string, string> = {
${dong}
};
`,
  );
  console.log('Đã ghi src/render/anhThuDau.ts');
} finally {
  if (loi.length) console.log(loi.map((l) => '  ! ' + l).join('\n'));
  await browser.close();
  await server.close();
}
