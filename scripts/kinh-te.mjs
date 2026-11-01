#!/usr/bin/env node
// In báo cáo kinh tế của người chơi mô phỏng (src/game/kinhTe.ts) ra màn hình, dạng Markdown.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const GIUP = `Báo cáo kinh tế của người chơi mô phỏng, dạng Markdown.

  node scripts/kinh-te.mjs [--sau-dien8 <phút>] [--thu "<mã>"] [> chup/kinh-te.md]

  --sau-dien8 <phút>  Chơi thêm bao lâu sau Điện 8, sổ chia theo từng giờ (mặc định 180)
  --thu "<mã>"        Đổi tạm số trong defs.ts (biến D) trước khi đo, để thử một phương án
                      mà không sửa repo. Ví dụ, giá nâng nhà sàn lên cấp 6 (chỉ số là cấp đích):
                      --thu "D.BUILDINGS.nhaSan.upgradeCost[6].gao = 2000"
  --giup              Hiện hướng dẫn này`;

const argv = process.argv.slice(2);
const opts = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--giup' || a === '-h' || a === '--help') opts.giup = true;
  else if (a === '--sau-dien8') opts.sauDien8 = Number(argv[++i]);
  else if (a === '--thu') opts.thu = argv[++i];
  else {
    console.error(`Không hiểu tham số ${a}. Xem --giup.`);
    process.exit(1);
  }
}
if (opts.giup) {
  console.log(GIUP);
  process.exit(0);
}
if (opts.sauDien8 !== undefined && !(opts.sauDien8 >= 0)) {
  console.error('--sau-dien8 cần một số phút không âm');
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Vite nạp thẳng mã TypeScript của luật chơi, không cần build. Các module dùng chung một bản trong cùng server,
// nên số đổi ở defs.ts qua --thu cũng là số kinhTe.ts đọc.
const server = await createServer({ root: ROOT, logLevel: 'error', appType: 'custom', server: { middlewareMode: true } });
try {
  if (opts.thu) {
    const D = await server.ssrLoadModule('/src/game/defs.ts');
    new Function('D', opts.thu)(D);
  }
  const { doKinhTe, inBaoCao } = await server.ssrLoadModule('/src/game/kinhTe.ts');
  console.log(inBaoCao(doKinhTe(opts.sauDien8), opts.thu));
} finally {
  await server.close();
}
