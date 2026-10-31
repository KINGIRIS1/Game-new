# Thời đại Văn Lang

Game xây dựng chiến thuật chạy trên trình duyệt điện thoại (TypeScript + Vite + Three.js). Chủ dự án làm việc bằng tiếng Việt.

- Thiết kế đã chốt nằm ở `docs/thiet-ke.md`. Đọc trước khi đổi luật chơi. Muốn đổi một quyết định thì hỏi chủ dự án, rồi sửa tài liệu cùng lúc với code.
- `src/game/`: luật chơi thuần, không dùng DOM hay Three.js, có test Vitest.
  - Con số cân bằng ở `defs.ts`. `balance.test.ts` canh nhịp tiến trình.
  - `battle.ts` mô phỏng trận: giữ kinh đô (`raid`) và ngoài bãi (`field`).
  - `campaign.ts` lo phó bản. `giong.ts` lo Thánh Gióng và thứ tự các đoạn truyện.
  - `campaign.test.ts` và `giong.test.ts` canh độ khó từng màn.
- `src/render/`: cảnh 3D phong cách "Nét Đông Sơn" (tô màu hoạt hình, viền mực, hoa văn trống đồng).
  - Công trình, mỗi loại một dáng và mỗi cấp một dáng: `buildings.ts`.
  - Dân theo nghề: `people.ts`.
  - Lính, Thánh Gióng và ngựa sắt, thuyền, cây, tường, lều trại, núi: `models.ts`.
  - Bãi chiến phó bản là cảnh riêng: `battlefield.ts`. Lính trong trận vẽ bằng `battleView.ts`, dùng chung cho cả hai loại trận.
  - Chất liệu ở `toon.ts`, màu ở `palette.ts`.
  - `window.__debug` (trong `main.ts`) cho phép sửa state, `resync()` và đặt `camera()` để chụp thử bằng Playwright.
- `src/ui/`: giao diện HTML.
  - `hud.ts` là khung chính.
  - `campaign.ts` dựng bản đồ phó bản và bảng xếp quân.
  - `giong.ts` dựng bảng Gióng và hộp thoại truyện.
- `src/text/vi.ts`: mọi chữ hiển thị, kể cả lời các đoạn truyện.
- Lệnh: `npm test`, `npm run build` (gồm typecheck), `npm run dev`.
- Đẩy lên `main` thì GitHub Actions chạy test, build rồi đăng lên GitHub Pages (`.github/workflows/deploy.yml`).
- Game đã đăng ở https://kingiris1.github.io/Game-new/. Cuối mỗi câu trả lời cho chủ dự án, ghi link này.
