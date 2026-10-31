# Thời đại Văn Lang

Game xây dựng chiến thuật chạy trên trình duyệt điện thoại (TypeScript + Vite + Three.js). Chủ dự án làm việc bằng tiếng Việt.

- Thiết kế đã chốt nằm ở `docs/thiet-ke.md`. Đọc trước khi đổi luật chơi. Muốn đổi một quyết định thì hỏi chủ dự án, rồi sửa tài liệu cùng lúc với code.
- `src/game/`: luật chơi thuần, không dùng DOM hay Three.js, có test Vitest.
  - Con số cân bằng ở `defs.ts`. `balance.test.ts` canh nhịp tiến trình, kể cả lên Điện cấp 6, 7 ở chương 2, 3. `cap67.test.ts` canh cấp 6–7 và rèn binh khí.
  - `battle.ts` mô phỏng trận: giữ kinh đô (`raid`, kể cả mùa lũ, đêm yêu tinh, quân Triệu) và ngoài bãi (`field`).
  - `campaign.ts` lo phó bản cả ba chương. `giong.ts` lo Thánh Gióng. `binhKhi.ts` lo rèn binh khí ở lò rèn cấp 6, 7. `son.ts` lo lễ vật, Sơn Tinh và chọn tướng cho từng trận. `coLoa.ts` lo chương 3: đếm vòng thành Cổ Loa, chế nỏ thần, An Dương Vương. `story.ts` lo thứ tự các đoạn truyện.
  - `map.ts` dựng độ cao tự nhiên của ô đất. `terrain.ts` lo nền công trình, đê và nước lũ loang từ sông.
  - `campaign.test.ts`, `giong.test.ts`, `chuong2.test.ts` và `chuong3.test.ts` canh độ khó từng màn, từng mùa lũ, đêm yêu tinh và đợt quân Triệu. Màn chương 2, 3 đánh thử bằng `testkit.ts` theo chuẩn: người chơi thường (bấm chậm, không Đền) phải thắng.
- `src/render/`: cảnh 3D phong cách "Nét Đông Sơn" (tô màu hoạt hình, viền mực, hoa văn trống đồng).
  - Công trình, mỗi loại một dáng và mỗi cấp một dáng: `buildings.ts`.
  - Dân theo nghề: `people.ts`.
  - Lính, thủy quái, yêu tinh, quân Triệu, Thánh Gióng và ngựa sắt, Sơn Tinh, Thủy Tinh, An Dương Vương, Rùa Vàng, thuyền, cây, lũy, đê, thành Cổ Loa, lều trại, núi: `models.ts`.
  - Đất bậc thang, nước lũ, mưa giông, đêm yêu tinh ở kinh đô: `world.ts`.
  - Bãi chiến phó bản là cảnh riêng: `battlefield.ts`. Lính trong trận vẽ bằng `battleView.ts`, dùng chung cho cả hai loại trận.
  - Chất liệu ở `toon.ts`, màu ở `palette.ts`.
  - `window.__debug` (trong `main.ts`) cho phép sửa state, `resync()`, đặt `camera()`, `place()` công trình, `march()` đánh màn, `skill()` bấm kỹ năng để chụp thử bằng Playwright.
- `src/ui/`: giao diện HTML.
  - `hud.ts` là khung chính.
  - `campaign.ts` dựng bản đồ phó bản và bảng xếp quân.
  - `giong.ts` dựng bảng Gióng và hộp thoại truyện. `binhKhi.ts` dựng mục rèn binh khí trong bảng lò rèn. `son.ts` dựng bảng Sơn Tinh và lễ vật. `coLoa.ts` dựng bảng An Dương Vương, thành Cổ Loa và nỏ thần.
- `src/text/vi.ts`: mọi chữ hiển thị, kể cả lời các đoạn truyện.
- Lệnh: `npm test`, `npm run build` (gồm typecheck), `npm run dev`.
- Đẩy lên `main` thì GitHub Actions chạy test, build rồi đăng lên GitHub Pages (`.github/workflows/deploy.yml`).
- Game đã đăng ở https://kingiris1.github.io/Game-new/. Cuối mỗi câu trả lời cho chủ dự án, ghi link này.
