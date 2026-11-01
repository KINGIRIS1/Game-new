---
name: doi-chieu-thiet-ke
description: "Đối chiếu thiết kế: so docs/thiet-ke.md với code (con số trong defs.ts, luật trong src/game/, chữ trong vi.ts, dáng trong src/render/) để tìm chỗ lệch (drift). Dùng sau khi đổi luật chơi hay con số, trước khi chốt một việc lớn, hoặc khi chủ dự án hỏi tài liệu và code còn khớp không."
---

# Đối chiếu thiết kế

`docs/thiet-ke.md` ghi các quyết định đã chốt với chủ dự án. Theo CLAUDE.md, đổi luật thì sửa tài liệu cùng lúc với code. Bản đối chiếu tìm những chỗ hai bên đã lệch (drift) nhau.

## Bước

1. **Chọn phạm vi**: một mục theo tiêu đề, hoặc cả tài liệu. `grep -n '^#' docs/thiet-ke.md` cho mục lục kèm số dòng. Tài liệu nặng chừng 80 KB nên đọc từng mục bằng Read có `offset` và `limit`.
   - Cả tài liệu: chia theo các mục `##`, giao mỗi nhóm mục cho một subagent kèm các bước 2–4 của skill này, rồi gộp kết quả. Các mục "Thứ tự làm" và "Kế hoạch" ghi việc sẽ làm, nên ở đó chỗ "chưa làm" là bình thường.
2. **Liệt kê mọi khẳng định kiểm được** trong phạm vi:
   - con số: giá, sản lượng, máu, sức đánh, thời gian, sức chứa, số màn;
   - luật: điều kiện mở khóa, thứ tự, chuyện gì xảy ra khi nào;
   - nội dung: tên công trình, quân, giặc, kỹ năng, đoạn truyện, lời Lạc hầu;
   - hình ảnh: dáng mỗi loại công trình, mỗi cấp;
   - nhịp chơi ("lên Điện 2 trong 3–10 phút"): đối chiếu với test canh nhịp đó (`balance.test.ts`, `chuong2.test.ts`...), vì đó là nơi nhịp được canh.
3. **Tìm từng khẳng định trong code**: con số tìm trong `defs.ts` trước, luật tìm trong file luật tương ứng (bảng file ở CLAUDE.md), tên và lời trong `src/text/vi.ts`, dáng trong `src/render/buildings.ts` và `models.ts`. Xếp mỗi khẳng định vào một loại:
   - **khớp**;
   - **lệch**: hai bên đều có nhưng khác nhau; ghi giá trị ở cả hai bên;
   - **chưa làm**: tài liệu có, code chưa có;
   - **chưa ghi**: code có một luật hay con số quan trọng mà tài liệu không nhắc (ghi những chỗ gặp trong lúc tìm, không cần quét hết code);
   - **không kiểm được**: câu quá chung để so (ghi lý do).
4. **Viết báo cáo**: mở đầu bằng số đếm mỗi loại, rồi một bảng mỗi mục gồm khẳng định, tài liệu (dòng), code (`file:dòng`), loại. Đưa "lệch" và "chưa làm" lên đầu.
5. **Xử lý chỗ lệch cùng chủ dự án.** Mỗi chỗ lệch có thể là tài liệu cũ (code đã sửa sau chơi thử) hoặc code sai (chưa làm đúng quyết định). Đưa từng chỗ cho chủ dự án chọn bên đúng, rồi sửa bên kia. Sửa code thì sửa tài liệu trong cùng commit.

Bản đối chiếu xong khi mọi khẳng định kiểm được trong phạm vi đều đã có loại, kèm dẫn chứng `file:dòng` ở cả hai bên.
