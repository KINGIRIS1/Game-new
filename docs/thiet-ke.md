# Thời đại Văn Lang: thiết kế chương 1

Tài liệu này ghi lại các quyết định đã chốt với chủ dự án. Khi cần đổi một quyết định, hãy hỏi chủ dự án trước rồi sửa tài liệu này cùng lúc với code.

## Tổng quan

- Game xây dựng chiến thuật cho một người chơi, chạy trên trình duyệt và ưu tiên điện thoại. Đăng miễn phí lên GitHub Pages. Làm cho vui, không kiếm tiền.
- Chỉ có tiếng Việt. Mọi chữ hiển thị nằm trong `src/text/vi.ts`, tách khỏi code để sau này dịch.
- Người chơi là **Vua Hùng**, xây dựng **kinh đô Phong Châu**. Lạc hầu hướng dẫn, Lạc tướng cầm quân, Bồ chính coi làng.
- Học các cơ chế quen thuộc của thể loại xây dựng chiến thuật (như Clash of Clans, Rise of Kingdoms), nhưng luật chơi, nội dung và hình ảnh là của riêng game này, không sao chép game nào.
- Bản đầu (chương 1) dài khoảng 30–60 phút chơi.

## Hình ảnh, âm thanh, công nghệ

- 3D bằng Three.js. Mọi thứ ghép từ **khối hộp phong cách chibi**, dựng hoàn toàn bằng code, không dùng ảnh ngoài.
- Chi tiết theo **văn hóa Đông Sơn**: nhà sàn mái cong hình thuyền, trống đồng, giáo đồng, người đóng khố, búi tóc, lũy tre. Tông màu đất ấm, điểm nhấn màu đồng và đỏ son.
- Màn hình dọc, camera isometric, kéo và phóng to bằng chạm. Giao diện bằng HTML đặt đè lên cảnh 3D.
- Máy thử chính là **Samsung Galaxy Z Fold5**. Màn hình ngoài (dài, hẹp) dùng bảng trượt lên từ dưới. Màn hình trong (gần vuông) dùng bảng bên cạnh.
- Mục tiêu 60 khung hình/giây trên Fold5, ít nhất 30 trên máy Android tầm trung đời cũ. Bãi chiến tối đa khoảng 40–60 lính.
- Hiệu ứng âm thanh ngắn tạo bằng code (Web Audio), có nút tắt tiếng. Nhạc nền để bản sau.
- TypeScript + Vite. Phần tính toán (`src/game/`) không phụ thuộc DOM hay Three.js và có test tự động bằng Vitest. GitHub Actions build, chạy test rồi đăng lên GitHub Pages.

## Bản đồ

- Lưới **30×30 ô**. Hai nhánh sông chảy dọc hai cạnh (nam và đông) rồi hợp lưu ở một góc, gợi ngã ba Bạch Hạc. Hai cạnh còn lại (bắc và tây) là rừng.
- Lúc đầu chỉ xây được trong vùng **16×16** sát hai bờ sông. Mỗi lần Điện Vua Hùng lên cấp thì phát rừng mở thêm đất.
- Bản đầu **chưa có độ cao ô đất và chưa có lũ**. Hai thứ này vào bản sau, cùng Sơn Tinh.

## Kinh tế

- 4 tài nguyên: **gạo, vỏ ốc** (làm tiền, vì thời Văn Lang chưa có tiền xu), **đất đá, sắt**.
- **Dân làng** đến từ nhà sàn và được phân công vào ruộng, chợ, bãi đất đá, lò rèn. Dân và lính ăn gạo theo thời gian. Thiếu gạo thì mọi việc sản xuất chậm còn một nửa và không luyện thêm quân được. Không ai chết đói.
- **Chợ thuyền**: tự sinh vỏ ốc theo số dân làm ở chợ. Khoảng 5 phút có một thuyền buôn cập bến với 3 lời mời đổi hàng, thuyền rời bến thì lời mời hết hạn.
- Nâng cấp **xong ngay** khi đủ tài nguyên. Không có đồng hồ đếm ngược hàng giờ.
- **Điện Vua Hùng** lên tối đa cấp 5 trong chương 1. Không công trình nào được vượt cấp Điện Vua Hùng.

### Công trình

| Công trình | Công dụng |
|---|---|
| Điện Vua Hùng | Mở rộng đất, giới hạn cấp các công trình khác |
| Nhà sàn | Thêm dân |
| Ruộng lúa | Ra gạo |
| Bến chợ thuyền | Ra vỏ ốc, đón thuyền buôn. Phải sát bờ sông |
| Bãi đất đá | Ra đất đá |
| Lò rèn | Ra sắt, rèn đồ cho Gióng |
| Kho thóc | Tăng sức chứa tài nguyên, cũng là mục tiêu của giặc |
| Doanh trại | Luyện quân. Cấp 1 giáo binh, cấp 2 cung thủ, cấp 3 voi chiến |
| Lũy tre → Thành đất | Tường. Lũy tre rẻ, có từ đầu. Thành đất chắc hơn, tốn đất đá, mở khóa khi Điện lên cấp |
| Chòi canh | Cung thủ tự bắn giặc |
| Bẫy chông tre | Gây sát thương cho giặc giẫm vào |
| Đền Phù Đổng | Có sau khi kết chương, cho thưởng vĩnh viễn |

## Quân đội và trận đánh

- 3 binh chủng khắc chế vòng tròn: **Giáo binh** thắng **Voi chiến**, Voi chiến thắng **Cung thủ**, Cung thủ thắng Giáo binh.
- Luyện quân tốn gạo, sắt và **một người dân** (dân đi lính thì không làm ruộng được). Doanh trại càng cao càng nuôi được nhiều quân. Luyện gần như ngay lập tức.
- **Giặc Ân**: lính giáo (cung thủ ta khắc chế), cung thủ (voi chiến ta khắc chế), **chiến xa** (giáo binh ta khắc chế). Cuối mỗi phần có tướng giặc làm trùm.
- Trận đánh **tự động** trong 20–40 giây trên bãi chiến 3D, lính chibi có động tác đơn giản. Người chơi chỉ bấm kỹ năng của tướng.
- Trước trận phó bản: xem trước quân giặc, chọn số lính mỗi loại trong giới hạn sức chứa, xếp vào 3 hàng (tiền quân, trung quân, hậu quân).
- **Phó bản**: bản đồ chương 1 có khoảng 8 màn và trùm cuối. Màn đã qua đánh lại được để kiếm tài nguyên. Lính chết trong trận thì mất, dù thắng hay thua. Thua thì không có thưởng, ngoài ra không mất gì.
- **Giữ kinh đô**: khoảng 15 phút chơi có một đợt giặc Ân. Trinh sát báo trước 60 giây, kèm hướng giặc tới (một trong hai cạnh rừng). Giặc tìm đường tới kho và Điện, gặp lũy thì phải phá. Phòng thủ bằng chòi canh, bẫy chông và quân nhà. Thua thì chỉ mất một phần kho và vài công trình hư hỏng, sửa lại được.

## Thánh Gióng và cốt truyện chương 1

1. **Giặc Ân xâm lược.** Lạc hầu hướng dẫn xây lũy tre, ruộng, chợ thuyền. Các trận đầu do Lạc tướng cầm quân thường.
2. **Sứ giả tìm người tài.** Khi Điện Vua Hùng lên cấp 2, cậu bé làng Phù Đổng lên tiếng xin ngựa sắt, roi sắt, giáp sắt. Gióng xuất hiện, lúc đầu còn nhỏ.
3. **Cả nước góp gạo nuôi Gióng, nhà vua sai thợ rèn đồ sắt.** Gióng lớn nhờ gạo. Lò rèn dùng sắt để rèn ngựa sắt, roi sắt, giáp sắt.
4. **Đánh giặc trên đường tới núi Trâu.** Giữa chương roi sắt gãy, mở khóa kỹ năng Nhổ tre. Trùm cuối là tướng giặc dưới chân núi Trâu.
5. **Kết chương.** Gióng cưỡi ngựa lên núi Sóc, cởi giáp, bay về trời. Vua phong Phù Đổng Thiên Vương, lập Đền Phù Đổng (thưởng vĩnh viễn). Sau đó Gióng **hiển linh**, vẫn ra trận khi đánh lại phó bản.

- Kỹ năng của Gióng (bấm tay trong trận): **Ngựa sắt phun lửa** (xung phong đốt một hàng giặc), **Nhổ tre quật giặc** (đòn diện rộng).
- Gióng không bao giờ chết, chỉ kiệt sức khoảng 2 phút.
- Không có cơ chế chơi lại từ đầu (prestige). Tiến trình liên tục theo chương.
- Thứ tự theo truyền thuyết: Gióng (đời Hùng Vương thứ 6) có trước Sơn Tinh (đời thứ 18). Chương 2 ở bản sau là Sơn Tinh, Thủy Tinh và lũ.

## Nhịp chơi và lưu game

- Nhịp chơi lai: mỗi lần mở game là một phiên ra quyết định ngắn.
- Khi tắt máy, kinh đô sản xuất với **50% tốc độ**, cộng dồn tối đa **8 giờ**. Giặc chờ đến khi người chơi mở game mới tấn công.
- Game không dùng năm hay mùa. Nhịp được tạo bởi các đợt giặc.
- Tự lưu sau mọi thao tác vào `localStorage`. Có nút **Xuất mã lưu** và **Nhập mã lưu** để sao lưu hoặc chuyển máy.

## Hướng dẫn của Lạc hầu

6 bước: xây lũy tre → đặt ruộng → phân công dân → nâng Điện Vua Hùng → luyện quân → đánh màn 1 và giữ kinh đô qua đợt giặc đầu tiên.

## Thứ tự làm

1. **Lát cắt 1** (đã làm): kinh đô 3D với Điện Vua Hùng, ruộng lúa, bến chợ thuyền, lũy tre. Đặt công trình trên lưới, nâng cấp, sản xuất, mở rộng đất, tính phần vắng mặt, lưu và xuất/nhập mã lưu, âm thanh, bốn nhiệm vụ đầu của Lạc hầu (lũy tre → ruộng → bến → nâng Điện). Lát cắt này chỉ dùng gạo và vỏ ốc.
2. **Lát cắt 2**: đủ kinh tế (dân, nhà sàn, đất đá, sắt, kho, thuyền buôn), doanh trại và quân đội, giữ kinh đô.
3. **Lát cắt 3**: phó bản chương 1, Thánh Gióng, cốt truyện.
