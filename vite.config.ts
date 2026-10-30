import { defineConfig } from 'vite';

// Đường dẫn tương đối để chạy được ở mọi địa chỉ GitHub Pages.
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 800 },
});
