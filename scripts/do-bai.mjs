#!/usr/bin/env node
// Đo độ khó các trận ngoài bãi trên bố cục bãi chiến (scripts/doBai.ts), mỗi tiêu chí nhiều hạt giống.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const GIUP = `Đo độ khó các trận ngoài bãi có bố cục (màn chương 1, đồn bên kia sông, thử thách chương 1),
theo đúng tiêu chí các test cân bằng, mỗi tiêu chí nhiều hạt giống. In bảng Markdown.

  node scripts/do-bai.mjs [m1 m2 … d1 d2 d4 t1 …] [--hat <số>] [--phang] [--thu "<mã>"]

  m1…m8       Chỉ đo màn này (mặc định: mọi màn chương 1, đồn bậc 1, 2, 4, thử thách 1–8)
  d1 d2 d4    Chỉ đo đồn bậc này
  t1…t8       Chỉ đo thử thách màn này
  --hat <số>  Số hạt giống mỗi tiêu chí (mặc định 10)
  --phang     Đo trên bãi phẳng (bỏ mọi bố cục) để có mức gốc
  --thu "<mã>" Đổi tạm số trước khi đo: D là defs.ts, B là baiChien.ts, K là benKia.ts. Ví dụ
              --thu "D.STAGES[7].hpScale = 2.4"
              --thu "B.BAI.nui.can[0].hinh.r = 0.8"
  --giup      Hiện hướng dẫn này`;

const argv = process.argv.slice(2);
const opts = { cac: [] };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--giup' || a === '-h' || a === '--help') opts.giup = true;
  else if (a === '--hat') opts.seeds = Number(argv[++i]);
  else if (a === '--phang') opts.phang = true;
  else if (a === '--thu') opts.thu = argv[++i];
  else if (/^[mdt]\d+$/.test(a)) opts.cac.push(a);
  else {
    console.error(`Không hiểu tham số ${a}. Xem --giup.`);
    process.exit(1);
  }
}
if (opts.giup) {
  console.log(GIUP);
  process.exit(0);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root: ROOT, logLevel: 'error', appType: 'custom', server: { middlewareMode: true } });
try {
  if (opts.thu) {
    const D = await server.ssrLoadModule('/src/game/defs.ts');
    const B = await server.ssrLoadModule('/src/game/baiChien.ts');
    const K = await server.ssrLoadModule('/src/game/benKia.ts');
    new Function('D', 'B', 'K', opts.thu)(D, B, K);
  }
  const { doBai, inBang } = await server.ssrLoadModule('/scripts/doBai.ts');
  const t0 = Date.now();
  console.log(inBang(doBai(opts), !!opts.phang));
  console.log(`\n(${((Date.now() - t0) / 1000).toFixed(0)} giây${opts.thu ? `; thử: ${opts.thu}` : ''})`);
} finally {
  await server.close();
}
