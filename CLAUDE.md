# Thời đại Văn Lang

Game xây dựng chiến thuật chạy trên trình duyệt điện thoại (TypeScript + Vite + Three.js). Chủ dự án làm việc bằng tiếng Việt.

- Thiết kế đã chốt nằm ở `docs/thiet-ke.md`. Đọc trước khi đổi luật chơi. Muốn đổi một quyết định thì hỏi chủ dự án, rồi sửa tài liệu cùng lúc với code.
- `src/game/`: luật chơi thuần, không dùng DOM hay Three.js, có test Vitest. Con số cân bằng ở `src/game/defs.ts`. `balance.test.ts` canh nhịp tiến trình.
- `src/render/`: cảnh 3D chibi khối hộp. `src/ui/`: giao diện HTML. `src/text/vi.ts`: mọi chữ hiển thị.
- Lệnh: `npm test`, `npm run build` (gồm typecheck), `npm run dev`.
- Đẩy lên `main` thì GitHub Actions chạy test, build rồi đăng lên GitHub Pages (`.github/workflows/deploy.yml`).
