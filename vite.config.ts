import { defineConfig } from 'vite';
import { dongGoiLuat } from './scripts/luat.mjs';

// Đường dẫn tương đối để chạy được ở mọi địa chỉ GitHub Pages.
// `__LUAT_MA__`: mã băm luật máy chủ Đấu thành (scripts/luat.mjs), cùng cách tính với luat.js của Edge Function, nên
// bản game và máy chủ dựng từ cùng một commit thì cùng mã. Chạy test thì không đóng gói (mã 'thu').
export default defineConfig(async ({ mode }) => ({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 800 },
  define: { __LUAT_MA__: JSON.stringify(mode === 'test' ? 'thu' : (await dongGoiLuat()).ma) },
}));
