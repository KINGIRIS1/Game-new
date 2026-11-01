---
name: chup-kiem-tra
description: "Chụp kiểm tra: chạy game ở khổ điện thoại, chụp ảnh rồi nhìn tận mắt. Dùng sau khi sửa src/render/ hoặc src/ui/ (dáng công trình, cảnh, bảng, nút, chữ hiển thị), trước khi commit; hoặc khi cần ảnh để gửi chủ dự án."
---

# Chụp kiểm tra

Vitest chỉ canh luật chơi. Một thay đổi người chơi nhìn thấy chỉ tính là xong khi đã chạy game, chụp ảnh và **nhìn tận mắt** chính ảnh đó.

## Bước

1. **Chọn cảnh cho thấy chỗ vừa sửa.** `node scripts/chup.mjs --giup` liệt kê các cảnh có sẵn và tùy chọn. Lấy cảnh gần nhất rồi chỉnh:
   - `--cham <loại công trình>` (vd. `dien`, `loRen`) để mở bảng công trình, `--bam "text=Phó bản"` để bấm nút, `--cam x,z,zoom` để nhìn một chỗ.
   - Chưa có cảnh nào gần: dựng thêm bằng `--truoc` (sửa state rồi tải lại trang) và `--sau` (thao tác sau khi tải lại). Xem phần tham khảo.
   - Sửa bảng, nút, chữ: chụp `--khung doc,ngang`. Khổ ngang rơi vào `@media (min-width: 600px)` nên bố cục khác.
2. **Chụp**, ví dụ `node scripts/chup.mjs kinh-do --cham loRen --ten lo-ren`. Mỗi khung mất chừng 15–30 giây.
3. **Đọc các dòng `!` ở cuối output**: đó là lỗi JavaScript trong trang. Có lỗi thì sửa trước.
4. **Mở từng ảnh bằng Read** và so với điều vừa sửa: chỗ sửa có hiện ra đúng không; có bị bảng che, tràn khung, chữ bị cắt hay đè nhau không; màu và dáng có hợp phong cách "Nét Đông Sơn" không.
5. **Sai thì sửa rồi chụp lại.** Bước này xong khi ảnh cuối cho thấy đúng điều đã sửa và không còn dòng `!` nào.
6. **Báo lại cho chủ dự án**: đã chụp cảnh nào, thấy gì. Gửi kèm ảnh (SendUserFile) khi chỗ sửa là thứ họ muốn xem. Ảnh nằm ở `chup/`, thư mục này đã gitignore nên ảnh ở lại trên máy.

Chụp không được (thiếu Playwright, WebGL lỗi, cảnh không dựng được) thì ghi rõ "CHƯA CHỤP ĐƯỢC: <lý do>" trong câu trả lời, để chủ dự án biết thay đổi chưa được nhìn.

## Tham khảo

**Mã trong `--truoc` và `--sau`** chạy trong trang, có sẵn các biến:

| Biến | Là gì |
| --- | --- |
| `d` | `window.__debug` (`main.ts`): `advance(ms)`, `place()`, `march()`, `skill()`, `camera()`, `resync()` |
| `s` | state đang chơi, sửa thẳng được |
| `G`, `D`, `C`, `S` | `game.ts`, `defs.ts`, `campaign.ts`, `story.ts` |
| `M` | người chơi mô phỏng `moPhong.ts`: `playChapters({ s, until })`, `playSecond(s)`, `placeAnywhere(s, loại)` |

Ví dụ:

```sh
# Kinh đô chương 1 đầy kho, mở bảng lò rèn để xem nút nâng cấp lúc đủ tài nguyên
node scripts/chup.mjs kinh-do --truoc "s.resources = { gao: 9000, voOc: 9000, datDa: 9000, sat: 9000 }" --cham loRen
# Đánh màn 1 (cảnh pho-ban đã xuất quân) rồi bấm Trống trận
node scripts/chup.mjs pho-ban --sau "d.skill('trongTran')"
```

- `--truoc` chạy xong thì script tự đánh dấu các đoạn truyện đang chờ là đã xem, lưu state rồi tải lại trang. Giao diện vì thế đúng như người chơi vừa mở game. Cảnh `truyen` giữ lại đoạn truyện.
- `d.advance(ms)` cho thời gian trôi rồi lưu và vẽ lại. `d.advance(0)` chỉ lưu và vẽ lại.
- Sau mỗi ảnh có số lệnh vẽ và tam giác. So hai số này trước và sau khi sửa model để biết cảnh nặng thêm bao nhiêu trên điện thoại.
- Script tự bật Vite ở cổng 5199. Nếu đang chạy `npm run dev` thì truyền `--url http://localhost:5173/` để khỏi bật lại.
