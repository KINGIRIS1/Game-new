// Đối chiếu trận Đấu thành trên Node và Deno (Edge Function Supabase chạy Deno): đóng gói luật máy chủ
// (scripts/luat.mjs), cho cả hai đánh cùng mấy trận cố định (`doiChieu` ở src/game/mayChu.ts) rồi so dấu trạng thái
// cuối từng trận. Lệch một chữ cũng báo lỗi: máy chủ đánh lại trận phải ra y như máy người chơi.
//
//   node scripts/doi-chieu-deno.mjs      (Deno ở PATH, hay chỉ đường bằng biến DENO)

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { LUAT_FILE, ghiLuat } from './luat.mjs';

const { ma } = await ghiLuat();
const url = pathToFileURL(LUAT_FILE).href;

let t = performance.now();
const node = (await import(url)).doiChieu();
const nodeMs = performance.now() - t;

t = performance.now();
const deno = JSON.parse(
  execFileSync(process.env.DENO || 'deno', ['eval', `import { doiChieu } from ${JSON.stringify(url)}; console.log(JSON.stringify(doiChieu()));`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }),
);
const denoMs = performance.now() - t;

console.log(`Mã luật ${ma}. Node ${Math.round(nodeMs)} ms, Deno ${Math.round(denoMs)} ms (cả lúc mở Deno).`);
let bad = 0;
node.forEach((line, i) => {
  const same = deno[i] === line;
  if (!same) bad++;
  console.log(`${same ? 'khớp' : 'LỆCH'}  ${line}${same ? '' : `\n      Deno: ${deno[i]}`}`);
});
if (bad || node.length !== deno.length) {
  console.error(`Node và Deno ra khác nhau ở ${bad || 'số'} trận.`);
  process.exit(1);
}
