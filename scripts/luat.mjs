// Đóng gói luật cho máy chủ Đấu thành (docs/thiet-ke.md, Kế hoạch: Đấu thành, mục Server).
// src/game/mayChu.ts và mọi luật nó dùng gộp thành một tệp JS chạy được trên Node, Deno và Edge Function Supabase:
// supabase/functions/dau-thanh/luat.js (không đưa vào git; kiểu ở luat.d.ts cạnh đó).
// Mã băm luật (`LUAT_MA`) là băm của chính phần đóng gói: bản game và máy chủ dựng từ cùng một commit thì cùng mã,
// máy chủ gặp mã khác thì báo người chơi cập nhật game.
//
//   node scripts/luat.mjs          ghi luat.js, in mã băm
//   import { dongGoiLuat } from './luat.mjs'   lấy { code, ma } (cho vite.config sau này)

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'rolldown';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const LUAT_FILE = resolve(ROOT, 'supabase/functions/dau-thanh/luat.js');

/** Đóng gói luật máy chủ: mã JS và mã băm 16 ký tự. */
export async function dongGoiLuat() {
  const out = await build({
    input: resolve(ROOT, 'src/game/mayChu.ts'),
    write: false,
    platform: 'neutral',
    logLevel: 'warn',
    output: { format: 'esm' },
  });
  const code = out.output[0].code;
  const ma = createHash('sha256').update(code).digest('hex').slice(0, 16);
  return { code, ma };
}

/** Ghi luat.js: đầu tệp trỏ kiểu sang luat.d.ts, cuối tệp là mã băm. */
export async function ghiLuat() {
  const { code, ma } = await dongGoiLuat();
  writeFileSync(
    LUAT_FILE,
    `/* @ts-self-types="./luat.d.ts" */\n// Sinh ra bởi \`node scripts/luat.mjs\` từ src/game/mayChu.ts. Đừng sửa tay.\n${code}\nexport const LUAT_MA = ${JSON.stringify(ma)};\n`,
  );
  return { ma, bytes: code.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { ma, bytes } = await ghiLuat();
  console.log(`luat.js: ${Math.round(bytes / 1024)} KB, mã luật ${ma}`);
}
