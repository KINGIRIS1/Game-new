---
name: ra-kinh-te
description: "Rà kinh tế: lập sổ nguồn vào (faucet) và chỗ tiêu (sink) của gạo, vỏ ốc, đất đá, sắt, tìm chỗ ứ đọng, chỗ thiếu, chỗ tiêu cạn. Dùng khi đổi giá, sản lượng, sức chứa hay phần thưởng trong defs.ts, khi thêm một chỗ tiêu hay nguồn thu mới, hoặc khi chủ dự án hỏi kinh tế có cân không."
---

# Rà kinh tế

Kinh tế cân khi mỗi tài nguyên có **nguồn vào** (faucet) đủ cho các **chỗ tiêu** (sink) đúng lúc người chơi cần, và khi chỗ tiêu cạn (nâng hết cấp, mua hết) thì tài nguyên còn có chỗ đi. Bản rà dựa trên hai thứ: sổ đo của người chơi mô phỏng, và bảng mọi chỗ thu chi trong code.

## Bước

1. **Lấy sổ đo**: `node scripts/kinh-te.mjs > chup/kinh-te.md`, rồi đọc. Sổ ghi từng khoản thu chi theo bốn giai đoạn: chương 1, chương 2, chương 3, và một giờ sau Điện 7. Đang đổi con số thì chạy một lần **trước khi sửa** (`chup/kinh-te-truoc.md`) và một lần sau khi sửa, rồi so hai bản.
2. **Lập bảng chỗ thu chi trong code**: `grep -n "pay(\|gain(\|resources\[.*\] -=" src/game/*.ts`, cộng các bảng giá trong `defs.ts` (`buildCost`, `upgradeCost`, `cost`, `reward`, `production`, `storage`). Với mỗi chỗ ghi: tài nguyên nào, mở từ chương nào, **lặp lại** hay **có trần** (dùng một lần, có cấp tối đa, mua hết), và người chơi mô phỏng có làm không (mục "Chưa đo" cuối sổ).
3. **So ngân sách với chỗ tiêu chưa đo.** Dòng "Vào chương mới" là của dành dụm cuối mỗi chương, tức ngân sách cho các chỗ tiêu người chơi mô phỏng không làm (đền, lễ vật, rèn đồ, quân...). Với từng chương và từng tài nguyên, cộng giá các chỗ tiêu chưa đo mở trong chương đó, rồi ghi dư hay thiếu bao nhiêu.
4. **Tìm ba loại vấn đề**, mỗi điều thấy đều dẫn số trong sổ hoặc giá trong `defs.ts`:
   - **Ứ đọng**: tài nguyên vào đều mà gần như không có chỗ tiêu lặp lại. Dấu hiệu: tồn kho cuối cứ tăng, có tràn kho, có thời gian kho đầy.
   - **Thiếu**: chỗ tiêu cần nhiều hơn nguồn vào trong khoảng thời gian thiết kế cho chương đó (xem nhịp chương ở `docs/thiet-ke.md`).
   - **Chỗ tiêu cạn**: chỗ tiêu có trần đã dùng hết thì tài nguyên đi đâu. Giai đoạn "Sau Điện 7" cho thấy điều này.
5. **Viết báo cáo**: mỗi tài nguyên một mục, gồm nguồn vào chính, chỗ tiêu chính, điều thấy kèm số. Khoản nào sổ không đo và bảng giá cũng không đủ để tính thì ghi **CHƯA ĐO**, không ước lượng. Muốn đổi con số thì đưa ra phương án kèm số dự tính để chủ dự án chọn: con số cân bằng là quyết định của chủ dự án.

Bản rà xong khi cả bốn tài nguyên đều có kết luận dựa trên số, và mọi chỗ trong bảng ở bước 2 đều đã xếp vào "đã đo" hay "chưa đo".

## Tham khảo

- **Sổ đo**: số dương là thu vào kho, số âm là chi ra hay mất đi. "Tràn kho" là phần làm ra khi kho đã đầy, bị bỏ phí. Sức chứa kho dùng chung một mức cho cả bốn loại.
- **Người chơi mô phỏng** nằm ở `src/game/moPhong.ts` và cũng là người chơi của `balance.test.ts`. Thêm việc vào `playSecond` sẽ đổi nhịp tiến trình mà test đó canh, nên muốn đo thêm một chỗ tiêu thì hỏi chủ dự án trước. Khi được đồng ý: thêm một `Viec` mới, bọc việc đó bằng `lam(...)`, thêm khoản tương ứng vào `KHOAN` trong `src/game/kinhTe.ts`.
- **Quy ước "Vào chương mới"** lấy từ `balance.test.ts`: lúc sang chương mới, của dành dụm coi như đã tiêu hết, nên nhịp lên Điện 6, 7 chỉ dựa vào sản lượng.
- `kinhTe.test.ts` canh cho sổ khớp với `game.ts`. Khoản "Khác" khác 0 nghĩa là `game.ts` có cách thu chi mới chạy lúc thời gian trôi mà `kinhTe.ts` chưa tách thành khoản riêng.
