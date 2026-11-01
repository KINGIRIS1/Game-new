---
name: doi-chieu-thiet-ke
description: "Đối chiếu thiết kế: so docs/thiet-ke.md với code (con số trong defs.ts, luật trong src/game/, chữ trong vi.ts, dáng trong src/render/) để tìm chỗ lệch (drift). Dùng sau khi đổi luật chơi hay con số, trước khi chốt một việc lớn, hoặc khi chủ dự án hỏi tài liệu và code còn khớp không."
---

# Đối chiếu thiết kế

`docs/thiet-ke.md` ghi các quyết định đã chốt với chủ dự án. Theo CLAUDE.md, đổi luật thì sửa tài liệu cùng lúc với code. Bản đối chiếu tìm những chỗ hai bên đã lệch (drift) nhau. Code để so là các file hiện có trên đĩa, kể cả thay đổi chưa commit.

## Bước

1. **Chọn phạm vi**: một mục theo tiêu đề, hoặc cả tài liệu. `grep -n '^#' docs/thiet-ke.md` cho mục lục kèm số dòng. Tài liệu nặng chừng 80 KB nên đọc từng mục bằng Read có `offset` và `limit`.
   - Cả tài liệu: chia theo các mục `##`, giao mỗi nhóm mục cho một subagent kèm các bước 2–4 của skill này, rồi gộp kết quả.
   - Mục có tiêu đề ghi "(đã làm)" phải khớp code như mọi mục khác. Chỉ mục "Thứ tự làm" và mục kế hoạch chưa ghi "(đã làm)" mới được có chỗ "chưa làm".
2. **Liệt kê mọi khẳng định kiểm được** trong phạm vi. Một khẳng định là một giá trị hay một luật đứng riêng; một hàng bảng tính là một khẳng định (ô nào khác code thì ghi rõ ô đó). Các loại:
   - con số: giá, sản lượng, máu, sức đánh, thời gian, sức chứa, số màn;
   - luật: điều kiện mở khóa, thứ tự, chuyện gì xảy ra khi nào;
   - nội dung: tên công trình, quân, giặc, kỹ năng, đoạn truyện, lời Lạc hầu;
   - hình ảnh: dáng mỗi loại công trình, mỗi cấp;
   - nhịp chơi ("lên Điện 2 chừng 5 phút"): lấy số đo bằng `node scripts/kinh-te.mjs` (bảng "Mốc thời gian"), còn khoảng cho phép thì xem test canh nhịp (`balance.test.ts`, `chuong2.test.ts`...).

   Câu kể lịch sử (số đo lần trước, giá cũ trước khi sửa) thì bỏ qua; chỉ đối chiếu điều tài liệu nói về hiện tại.
3. **Tìm từng khẳng định trong code**: con số tìm trong `defs.ts` trước; luật, chữ và dáng tìm theo bản đồ file ở CLAUDE.md (gồm cả `main.ts`, `save.ts`, `testkit.ts`, `src/render/`, `src/ui/`). Dáng hình đối chiếu bằng đọc code; còn phân vân thì chụp bằng skill `chup-kiem-tra`. Xếp mỗi khẳng định vào một loại:
   - **khớp**: đúng như tài liệu. Số ghi "khoảng X" thì khớp khi code lệch X không quá chừng một phần tư;
   - **lệch**: hai bên đều có nhưng khác nhau; ghi giá trị ở cả hai bên. Tài liệu tự mâu thuẫn (một câu chung nói một đằng, bảng chi tiết khớp code) cũng là lệch; ghi rõ phần nào khớp code;
   - **chưa làm**: tài liệu có, code chưa có;
   - **chưa ghi**: code có một luật hay con số quan trọng mà tài liệu không nhắc (ghi những chỗ gặp trong lúc tìm, không cần quét hết code);
   - **không kiểm được**: câu quá chung để so (ghi lý do).
4. **Viết báo cáo** vào `chup/doi-chieu-thiet-ke.md` (thư mục gitignore) theo thứ tự:
   - số đếm mỗi loại;
   - phần "Cần chủ dự án xem" liệt kê mọi chỗ lệch và chưa làm;
   - một bảng mỗi mục: khẳng định, tài liệu (dòng), code (`file:dòng`), loại.

   Trong câu trả lời, tóm tắt số đếm và phần "Cần chủ dự án xem".
5. **Xử lý chỗ lệch cùng chủ dự án.** Mỗi chỗ lệch có thể là tài liệu cũ (code đã sửa sau chơi thử) hoặc code sai (chưa làm đúng quyết định). Đưa từng chỗ cho chủ dự án chọn bên đúng, rồi sửa bên kia. Sửa code thì sửa tài liệu trong cùng commit.

Bản đối chiếu xong khi mọi khẳng định kiểm được trong phạm vi đều đã có loại và có dẫn chứng: dòng tài liệu, `file:dòng` code, hay lệnh đo cho số nhịp chơi.
