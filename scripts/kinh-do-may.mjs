#!/usr/bin/env node
// Chụp lại kinh đô máy Đấu thành từ mẫu kinh đô hiện tại, ghi src/game/kinhDoMayMa.ts (xem src/game/kinhDoMay.ts).
// Kinh đô máy đổi thì cân bằng Đấu thành đổi: chạy xong thì đo lại (npx vitest run src/game/dauThanh.test.ts
// src/game/tatDinh.test.ts) và báo chủ dự án.
//
//   node scripts/kinh-do-may.mjs          ghi tệp
//   node scripts/kinh-do-may.mjs --so     chỉ so với tệp đang có, không ghi

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.resolve(ROOT, 'src/game/kinhDoMayMa.ts');
const so = process.argv.includes('--so');
const server = await createServer({ root: ROOT, logLevel: 'error', appType: 'custom', server: { middlewareMode: true } });
try {
  const { tepMa } = await server.ssrLoadModule('/scripts/kinhDoMay.ts');
  const moi = tepMa();
  let cu = '';
  try {
    cu = readFileSync(FILE, 'utf8');
  } catch {
    // Chưa có tệp.
  }
  if (moi === cu) console.log('Kinh đô máy không đổi.');
  else if (so) console.log('Kinh đô máy theo mẫu hiện tại khác bản đã chụp (chạy không có --so để ghi).');
  else {
    writeFileSync(FILE, moi);
    console.log(`Đã ghi ${path.relative(ROOT, FILE)}. Đo lại cân bằng Đấu thành trước khi commit.`);
  }
} finally {
  await server.close();
}
