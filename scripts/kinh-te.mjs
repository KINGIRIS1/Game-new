#!/usr/bin/env node
// In báo cáo kinh tế của người chơi mô phỏng (src/game/kinhTe.ts) ra màn hình, dạng Markdown.
// Cách dùng: node scripts/kinh-te.mjs [> tệp.md]

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Vite nạp thẳng mã TypeScript của luật chơi, không cần build.
const server = await createServer({ root: ROOT, logLevel: 'error', appType: 'custom', server: { middlewareMode: true } });
try {
  const { doKinhTe, inBaoCao } = await server.ssrLoadModule('/src/game/kinhTe.ts');
  console.log(inBaoCao(doKinhTe()));
} finally {
  await server.close();
}
