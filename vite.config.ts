import { defineConfig } from 'vite';

// Đường dẫn tương đối để chạy được ở mọi địa chỉ GitHub Pages.
export default defineConfig({
  base: './',
  // Mô hình Meshy (src/assets/mo-hinh/*.glb) là tài nguyên: nạp bằng địa chỉ có dấu băm.
  assetsInclude: ['**/*.glb'],
  build: { target: 'es2022', chunkSizeWarningLimit: 800 },
});
