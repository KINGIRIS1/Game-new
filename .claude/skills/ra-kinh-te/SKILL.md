---
name: ra-kinh-te
description: "Rà kinh tế: lập sổ nguồn vào (faucet) và chỗ tiêu (sink) của gạo, vỏ ốc, đất đá, sắt, tìm chỗ ứ đọng, chỗ thiếu, chỗ tiêu cạn. Dùng khi đổi giá, sản lượng, sức chứa hay phần thưởng trong defs.ts, khi thêm một chỗ tiêu hay nguồn thu mới, hoặc khi chủ dự án hỏi kinh tế có cân không."
---

# Rà kinh tế

Kinh tế cân khi mỗi tài nguyên có **nguồn vào** (faucet) đủ cho các **chỗ tiêu** (sink) đúng lúc người chơi cần, và khi chỗ tiêu cạn (nâng hết cấp, mua hết) thì tài nguyên còn có chỗ đi. Bản rà dựa trên hai thứ: sổ đo của người chơi mô phỏng, và bảng mọi chỗ thu chi trong code.

## Bước

1. **Lấy sổ đo**: `node scripts/kinh-te.mjs > chup/kinh-te.md`, rồi đọc. Sổ ghi từng khoản thu chi theo giai đoạn: chương 1, 2, 3, rồi từng giờ trong ba giờ sau Điện 7. Mục cuối sổ nói người chơi mô phỏng làm gì; mọi khoản khác là **chưa đo**. Đang đổi con số thì lưu một bản **trước khi sửa** (`chup/kinh-te-truoc.md`) để so với bản sau.
2. **Lập bảng chỗ thu chi trong code**:
   - chỗ trừ và cộng tài nguyên: `grep -nE "pay\(|gain\(|resources\[.*\] -=" src/game/*.ts`;
   - sản xuất, ăn, tràn kho nằm trong `produce` ở `game.ts` (sổ đo đã tách sẵn), hệ số cộng sản lượng là `templeBonus` và `datBonus`, chơi khi vắng mặt là `applyOffline`;
   - bảng giá và thưởng: `grep -nE "Cost|cost|reward|production|storage|upkeep|FEED|FRACTION|SHARE" src/game/defs.ts`.

   Với mỗi chỗ ghi: tài nguyên nào, mở từ chương nào (chỗ mở ở kết một chương tính cho chương sau), **lặp lại** hay **có trần** (dùng một lần, có cấp tối đa, mua hết), và **đã đo** hay **chưa đo**.
3. **So ngân sách với chỗ tiêu chưa đo**, từng chương, từng tài nguyên:
   - Ngân sách chương 1, 2 là dòng "Vào chương mới" (của dành dụm cuối chương). Ngân sách chương 3 là tồn kho cuối chương 3.
   - Cộng giá các chỗ tiêu chưa đo mở trong chương thành hai mức: **bắt buộc** (phải mua để đi tiếp truyện, nhiệm vụ, màn) và **tối đa** (mua hết mọi thứ). Ghi dư hay thiếu ở cả hai mức.
   - Thưởng phó bản là nguồn vào chưa đo, có màn lớn ngang sản lượng cả chương. Tính hai cột: không có thưởng phó bản, và có thưởng của các màn mở trong chương (`STAGES` trong `defs.ts`).
4. **Tìm ba loại vấn đề**, mỗi điều thấy đều dẫn số trong sổ hoặc giá trong `defs.ts`:
   - **Ứ đọng**: tài nguyên vào đều mà gần như không có chỗ tiêu lặp lại. Dấu hiệu: tồn kho cuối cứ tăng, có tràn kho, có thời gian kho đầy.
   - **Thiếu**: chỗ tiêu bắt buộc cần nhiều hơn nguồn vào trong thời gian dự tính cho chương đó. Nhịp đã chốt nằm rải ở các mục Tổng quan, Dân làng và PR 2 của `docs/thiet-ke.md`; khoảng cho phép được canh trong `balance.test.ts`.
   - **Chỗ tiêu cạn**: chỗ tiêu có trần đã dùng hết thì tài nguyên đi đâu. Các giờ sau Điện 7 cho thấy điều này.
5. **Viết báo cáo** vào `chup/ra-kinh-te.md`: mỗi tài nguyên một mục, gồm nguồn vào chính, chỗ tiêu chính, điều thấy kèm số. Khoản nào sổ không đo và bảng giá cũng không đủ để tính thì ghi **CHƯA ĐO**, không ước lượng. Muốn đổi con số thì thử phương án bằng `--thu` (xem tham khảo), rồi đưa phương án kèm số đo được để chủ dự án chọn: con số cân bằng là quyết định của chủ dự án. Trong câu trả lời, tóm tắt điều thấy quan trọng nhất của mỗi tài nguyên.

Bản rà xong khi cả bốn tài nguyên đều có kết luận dựa trên số, và mọi chỗ trong bảng ở bước 2 đều đã xếp vào "đã đo" hay "chưa đo".

## Tham khảo

- **Sổ đo**: số dương là thu vào kho, số âm là chi ra hay mất đi. "Tràn kho" là phần làm ra khi kho đã đầy, bị bỏ phí. Sức chứa kho dùng chung một mức cho cả bốn loại.
- **Thử phương án mà không sửa repo**: `node scripts/kinh-te.mjs --thu "D.BUILDINGS.nhaSan.upgradeCost[6].gao = 2000"`. Mã trong `--thu` đổi tạm `defs.ts` (biến `D`) trước khi đo; chỉ số `upgradeCost` là cấp đích. `--sau-dien8 <phút>` đổi thời gian chơi thêm sau Điện 8.
- **Người chơi mô phỏng** nằm ở `src/game/moPhong.ts` và cũng là người chơi của `balance.test.ts`. Thêm việc vào `playSecond` sẽ đổi nhịp tiến trình mà test đó canh, nên muốn đo thêm một chỗ tiêu thì hỏi chủ dự án trước. Khi được đồng ý: thêm một `Viec` mới, bọc việc đó bằng `lam(...)`, thêm khoản tương ứng vào `KHOAN` trong `src/game/kinhTe.ts`.
- **Quy ước "Vào chương mới"** lấy từ `balance.test.ts`: lúc sang chương mới, của dành dụm coi như đã tiêu hết, nên nhịp lên Điện 6, 7 chỉ dựa vào sản lượng.
- `kinhTe.test.ts` canh cho sổ khớp với `game.ts`. Khoản "Khác" khác 0 nghĩa là `game.ts` có cách thu chi mới chạy lúc thời gian trôi mà `kinhTe.ts` chưa tách thành khoản riêng.
