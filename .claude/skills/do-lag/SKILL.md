---
name: do-lag
description: "Đo lag: chạy game ở khổ điện thoại, ghi từng khung (JS mỗi khung theo phần việc, lệnh vẽ, tam giác, hình và ảnh trên GPU, bộ nhớ, giật lúc vào cảnh) rồi so trước và sau khi sửa. Dùng khi chủ dự án báo game giật, lag, nóng máy, tụt khung hình; khi sửa src/render/ (thêm mô hình, nhân vật, hiệu ứng, rừng, nền đất) hay vòng lặp trận, kinh tế chạy mỗi khung; hoặc trước khi chốt một việc lớn về hình."
---

# Đo lag

Test Vitest không thấy game nặng thêm. Một thay đổi có thể làm nặng máy chỉ tính là xong khi đã đo **trước và sau** trên cùng cảnh, cùng tùy chọn, và số không tệ đi ngoài mức nhiễu.

## Bước

1. **Chọn cảnh** theo chỗ sửa (cảnh lấy từ `scripts/chup.mjs`, `node scripts/chup.mjs --giup` liệt kê đủ):
   - kinh đô: `kinh-do` (Điện 5), `dien8`, `chuong5` (nặng nhất), thêm `dem` nếu sửa đèn đuốc, trời;
   - trận giữ kinh đô: `tran`, `dem-tran`, `yeu-tinh`; ngoài bãi: `pho-ban`, `pho-ban-5` (Hai Bà, nhiều lính); Đấu thành: `dau-thanh-tran`;
   - sửa rừng, nền đất, độ phóng, cây bản thấp: thêm `--keo` (camera lướt vòng và phóng qua ngưỡng `LITE_ZOOM`).

   Không ghi cảnh thì đo `kinh-do dien8 tran pho-ban-5`. Mỗi cảnh mất chừng một tới ba phút (người chơi mô phỏng dựng state, worker nặn sẵn nhân vật, rồi mới đo). Đang đo thì đừng sửa `src/`: cảnh sau sẽ nạp mã mới.
2. **Đo bản gốc trước khi sửa** (hay trên `main`, ví dụ bằng `git stash`):
   `node scripts/do-lag.mjs <cảnh ...> --luu chup/lag-truoc.json`
3. **Sửa, rồi đo lại và so**: `node scripts/do-lag.mjs <cảnh ...> --so chup/lag-truoc.json`. Mỗi số có mức đổi phần trăm; đổi từ 10% trở lên có chữ "nặng hơn" hay "nhẹ hơn".
4. **Đọc kết quả** (bảng ở tham khảo). Số nào nặng hơn quá mức nhiễu thì tìm chỗ gây ra rồi sửa, đo lại. Đo hai lần bản gốc nếu không chắc mức nhiễu.
5. **Đọc các dòng `!`**: lỗi JavaScript trong trang, cảnh không dựng được, hay hai lần đo khác tùy chọn. Có thì xử lý trước.
6. **Báo lại cho chủ dự án**: đã đo cảnh nào, số trước và sau (dán bảng Markdown cuối output), điều gì nặng thêm và vì sao chấp nhận được. Việc đổi hình làm nặng máy rõ rệt (nhiều lệnh vẽ, tam giác hơn hẳn) là quyết định của chủ dự án: hỏi trước khi chốt.

Không đo được (thiếu Playwright, WebGL lỗi, cảnh không dựng được) thì ghi rõ "CHƯA ĐO ĐƯỢC LAG: <lý do>" trong câu trả lời.

## Tham khảo

**Máy cloud không có GPU.** Chromium vẽ bằng phần mềm (SwiftShader), chỉ được 0,2 tới 2 khung mỗi giây, khung nào cũng là việc dài. Vì vậy ở máy cloud script:

- không in việc dài, và khung mỗi giây chỉ để tham khảo;
- đo tới khi đủ `--so-khung` khung (mặc định 12) và `--giay` giây, lâu nhất `--toi-da` giây;
- cho thời gian chơi trôi chậm 10 lần (`--toc-do`, mặc định 0,1; `window.__debug.tocDo`), không thì trận giữ kinh đô, trận ngoài bãi hết trước khi kịp đo. Trận vẫn hết giữa chừng thì script thôi đo ở đó và báo.

Các số so được giữa hai bản:

| Số | Ý nghĩa | Đáng lo khi |
| --- | --- | --- |
| JS mỗi khung (TB, p95, dài nhất) | Thời gian vòng lặp khung ở `main.ts` (`DoLag` ở `src/render/doLag.ts`) | tăng rõ so với bản gốc |
| chia ra: cảnh | Hoạt cảnh, lính, thú, gửi lệnh vẽ (`world.update…`). Tốn theo mỗi khung | phần lớn JS nằm đây |
| chia ra: luật chơi | `tick`, trận Đấu thành. Tốn theo thời gian chơi nên in theo ms mỗi giây chơi (`luatMoiGiay`) | trận đông lính làm tăng |
| chia ra: nhịp | Khối chạy 4 lần mỗi giây (làm mới giao diện, `world.sync` trong trận, nặn sẵn) | dài nhất cao là giật đều đặn 4 lần mỗi giây |
| Ước 60 k/giây | JS mỗi khung nếu máy chạy được 60 khung mỗi giây (`uoc60`) | gần 16,7 ms là không còn chỗ cho GPU |
| Khung JS > 16,7 ms, > 50 ms | Khung mà riêng JS đã quá một khung, quá mức người chơi thấy giật | > 0 khi trước là 0 |
| Lệnh vẽ, tam giác | `renderer.info.render`, kể cả lượt vẽ bóng. Điện thoại nặng theo số lệnh vẽ hơn máy tính | tăng mà không có lý do |
| GPU giữ hình, ảnh, shader | `renderer.info.memory`, `programs` | tăng dần qua các lần đo cùng cảnh: dựng lại mà quên `disposeModel` |
| Tiến trình GPU (ms CPU mỗi khung) | Việc của trình vẽ phần mềm, tỉ lệ với việc GPU thật (nhất là số đỉnh, tam giác) | tăng rõ |
| Bộ nhớ JS | `JSHeapUsedSize` lúc đo xong | tăng rõ |
| Nặn ở luồng chính | Nặn nhân vật lúc chơi thay vì worker nặn sẵn: đứng hình chục tới vài trăm ms. Script in tên dáng (khóa của `figure` ở `nanNguoi.ts`, `@1` là đủ chi tiết như tướng) | > 0: tìm nhân vật dùng dáng ấy, thêm vào `prewarmJobs` (`nanTruoc.ts`) hay `runJob` (`nanSan.ts`) |
| Lúc vào cảnh | Từ lúc bấm vào game tới lúc bắt đầu đo (gồm `sau` của cảnh: xuất quân, gọi giặc): khung JS dài nhất, khung JS > 50 ms | cú giật lúc vào trận dài hơn |

- **Mức nhiễu** (cùng một bản đo hai lần ở máy cloud): lệnh vẽ, tam giác, hình, ảnh, shader y hệt; JS mỗi khung, cảnh lệch tới khoảng 15%; luật chơi, khối nhịp lệch tới 40% (số nhỏ); bộ nhớ (đã dọn rác) lệch vài MB; khung JS dài nhất lúc vào cảnh lệch tới 40–80% (dọn rác, tải mã chen vào). Script chỉ gắn chữ "nặng hơn", "nhẹ hơn" khi đổi quá các mức này (`NHIEU` ở `do-lag.mjs`). Vì vậy tin lệnh vẽ, tam giác, hình hơn số thời gian; số thời gian đổi rõ thì đo lại lần nữa, hay đo nhiều khung hơn (`--so-khung 24`), cho chắc.
- **Gần điện thoại hơn**: `--cpu 4` làm chậm luồng chính bốn lần (Chrome DevTools cũng làm vậy). Hai lần so phải cùng `--cpu`, cùng `--khung`, `--dpr`, `--do-phan-giai`, `--keo`; script báo `!` nếu khác.
- **Máy có GPU** (máy chủ dự án): `--hien` mở cửa sổ Chromium thật, khi ấy khung mỗi giây và việc dài mới có nghĩa. Đo trên chính điện thoại: nối máy, mở `chrome://inspect` ở máy tính, ghi tab Performance khi chơi trên https://kingiris1.github.io/Game-new/.
- **Bản dev**: script chạy Vite dev (chưa nén mã, không có kho hình nặn), nên số tuyệt đối cao hơn bản đăng một chút; so giữa hai bản vẫn đúng. Worker nặn sẵn xong mới đo (`window.__debug.nanCon()` về 0), đồng hồ chơi đặt lại để lúc chờ không tính là vắng.
- **Tự đo trong trang**: `window.__debug.lag(true)` bắt đầu ghi, `window.__debug.lag(false)` trả tóm tắt (`tomLag` cùng `uoc60`, `hinh`, `anh`, `shader`). Thêm phần việc mới vào vòng lặp khung thì đặt nó giữa đúng hai mốc `lag.cat(...)` ở `main.ts`.
- `--truoc`, `--sau`, `--cam`, `--gio`, `--url` như `chup.mjs` (xem skill `chup-kiem-tra`). Ví dụ đo trận giữ kinh đô Điện 8: `node scripts/do-lag.mjs tran --truoc "M.playChapters({ s, last: 8 })"`.
