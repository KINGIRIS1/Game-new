# Thời đại Văn Lang: thiết kế chương 1

Tài liệu này ghi lại các quyết định đã chốt với chủ dự án. Khi cần đổi một quyết định, hãy hỏi chủ dự án trước rồi sửa tài liệu này cùng lúc với code.

## Tổng quan

- Game xây dựng chiến thuật cho một người chơi, chạy trên trình duyệt và ưu tiên điện thoại. Đăng miễn phí lên GitHub Pages. Làm cho vui, không kiếm tiền.
- Chỉ có tiếng Việt. Mọi chữ hiển thị nằm trong `src/text/vi.ts`, tách khỏi code để sau này dịch.
- Người chơi là **Vua Hùng**, xây dựng **kinh đô Phong Châu**. Lạc hầu hướng dẫn, Lạc tướng cầm quân, Bồ chính coi làng.
- Học các cơ chế quen thuộc của thể loại xây dựng chiến thuật (như Clash of Clans, Rise of Kingdoms), nhưng luật chơi, nội dung và hình ảnh là của riêng game này, không sao chép game nào.
- Bản đầu (chương 1) dài khoảng 30–60 phút chơi.

## Hình ảnh, âm thanh, công nghệ

- 3D bằng Three.js, dựng hoàn toàn bằng code, không dùng ảnh ngoài.
- Phong cách **"Nét Đông Sơn"**:
  - tô màu kiểu hoạt hình 3 dải sáng (MeshToonMaterial), mọi công trình, người và cây có **viền mực đen**;
  - **hoa văn trống đồng** (vòng tròn tiếp tuyến, răng cưa, mặt trống có sao và chim bay) vẽ bằng canvas, đắp lên mái, tường, trống;
  - nhà sàn **mái hình thuyền cong vút** có chim đồng đậu hai đầu nóc;
  - người chibi đầu to, **đội mũ lông chim** như hình người trên mặt trống đồng;
  - bảng màu: nền kem như giấy, đất vàng ô liu, nước xanh lam đục, điểm nhấn đồng, đỏ son và mực đen.
- Phong cách này được chọn qua bản dùng thử so sánh 4 phương án: khối hộp ban đầu, voxel tinh xảo, đồ chơi bo tròn, và Nét Đông Sơn. Cả bộ dùng thử được cất ở branch `prototype/phong-cach-hinh-anh`.
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

### Dân làng (đã làm ở lát cắt 2a)

- Bắt đầu có 4 dân. Điện Vua Hùng cho 4–8 chỗ ở theo cấp, mỗi nhà sàn cho 4–12 chỗ.
- Còn chỗ ở và không thiếu gạo thì cứ **30 giây có thêm một người dân**.
- Mỗi người dân ăn **0,4 gạo/phút**.
- Ruộng, bến chợ thuyền, bãi đất đá, lò rèn có **số chỗ làm theo cấp**, và chỉ làm ra đủ sản lượng khi đủ người.
- Xây hay nâng cấp xong, dân rảnh tự vào làm. Người chơi chỉnh bằng nút − / + trong bảng công trình, hoặc chạm vào ô dân 👥 để chia đều dân rảnh.
- **Thiếu gạo** (hết gạo mà gạo làm ra không đủ ăn) thì mọi sản lượng còn một nửa và dân không về thêm.
- **Kho thóc** cộng thêm sức chứa cho mọi tài nguyên. **Lò rèn** cần Điện cấp 2.
- **Thành đất**: là lũy tre nâng lên cấp 2, tốn đất đá, cần Điện cấp 3.
- **Thuyền buôn**:
  - Chỉ đến khi có bến, lần đầu sau khoảng 2 phút chơi, sau đó 5 phút một lần, mỗi lần đậu 90 giây.
  - Mỗi chuyến có 3 lời mời đổi hàng, trả hơn giá trị khoảng 15%. Chưa có Điện cấp 2 thì chưa buôn sắt.
  - Thuyền buôn và giặc chỉ đến theo **đồng hồ chơi**, tức là thời gian đang mở game.
- Bản lưu lát cắt 1 được tự nâng lên: có đủ dân ở và chia vào làm ngay.
- Nhịp đo bằng test mô phỏng một người chơi biết dành dụm: lên Điện cấp 2 khoảng 5 phút, cấp 3 khoảng 22 phút, cấp 5 khoảng 63 phút. Phần thưởng phó bản ở lát cắt 3 sẽ rút ngắn thêm.

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

### Giữ kinh đô (đã làm ở lát cắt 2b)

- **Doanh trại** cần Điện cấp 2. Sức chứa quân theo cấp: 8, 14, 20, 28, 38 chỗ.
- **Các binh chủng ta:**

  | Binh chủng | Cần doanh trại | Giá | Máu | Sát thương | Ghi chú |
  |---|---|---|---|---|---|
  | Giáo binh | cấp 1 | 20 gạo, 4 sắt | 60 | 8 | |
  | Cung thủ | cấp 2 | 25 gạo, 6 sắt | 40 | 7 | tầm bắn 3,8 ô |
  | Voi chiến | cấp 3 | 60 gạo, 15 sắt | 200 | 15 | chiếm 3 chỗ |

  Mỗi lính lấy đi một người dân rảnh. Lính ăn 0,6 gạo/phút, riêng voi ăn 1,5. Đánh đúng thế khắc chế thì sát thương gấp đôi.
- **Giặc Ân:**

  | Loại | Máu | Sát thương | Ghi chú |
  |---|---|---|---|
  | Lính giáo | 75 | 9 | |
  | Cung thủ | 45 | 8 | tầm 3,5 ô |
  | Chiến xa | 230 | 20 | nhanh, gấp đôi sát thương lên cung thủ ta |

  - Đợt thứ n có `3 + n` lính giáo. Từ đợt 2 có `n` cung thủ, từ đợt 3 có `n − 2` chiến xa.
  - Máu giặc tăng 12% mỗi đợt.
- **Chòi canh**: tự bắn trong tầm 4,5 ô, sát thương 7–19 theo cấp.
- **Bẫy chông**: gây 45 sát thương cho giặc giẫm vào, mỗi đợt dùng một lần.
- **Lịch giặc** (theo đồng hồ chơi):
  - Đợt đầu đến 4 phút sau khi có doanh trại, sau đó 15 phút một đợt.
  - Trinh sát báo trước 60 giây, kèm hướng tới (cạnh rừng phía Bắc hoặc phía Tây), có dải đỏ nhấp nháy ở bìa rừng.
  - Nút "Nghênh chiến ngay" trong doanh trại gọi giặc tới sớm.
- **Trận đánh**:
  - Giặc tìm đường (A* 8 hướng) tới kho trước, rồi tới Điện. Lũy và công trình chắn đường thì giặc phá. Lũy có chỗ hở thì giặc đi vòng.
  - Quân ta ra từ doanh trại, đánh giặc gần nhất. Chòi canh bắn, bẫy chông đâm.
  - Quá 3 phút thì giặc rút.
- **Hậu quả**:
  - Giặc phá được kho thì cướp 15% mỗi loại tài nguyên, phá được Điện thì cướp 8%, rồi bỏ chạy.
  - Công trình bị phá thì hư hỏng: không làm ra gì, không chắn đường. Sửa tốn 30% giá.
  - Lính tử trận mất hẳn.
  - Thắng (diệt hết, không mất của) mới tính là giữ được kinh đô.
- Độ khó đo bằng test: đợt 1 cần khoảng 6 giáo binh và 1 chòi canh để thắng. Đợt 4 trở đi cần cung thủ, voi, lũy và nhiều chòi hơn.

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

Đã làm (lát cắt 2): lũy tre → ruộng → bến → Điện cấp 2 → nhà sàn → bãi đất đá có 2 người làm → kho thóc → lò rèn → Điện cấp 3 → doanh trại → luyện 5 lính → chòi canh → đánh lui đợt giặc đầu tiên. Phó bản và Thánh Gióng thêm ở lát cắt 3.

## Thứ tự làm

1. **Lát cắt 1** (đã làm): kinh đô 3D với Điện Vua Hùng, ruộng lúa, bến chợ thuyền, lũy tre. Đặt công trình trên lưới, nâng cấp, sản xuất, mở rộng đất, tính phần vắng mặt, lưu và xuất/nhập mã lưu, âm thanh, bốn nhiệm vụ đầu của Lạc hầu (lũy tre → ruộng → bến → nâng Điện). Lát cắt này chỉ dùng gạo và vỏ ốc.
2. **Lát cắt 2a** (đã làm): dân làng và phân công, nhà sàn, bãi đất đá, lò rèn, kho thóc, thành đất, thuyền buôn, thiếu gạo, nâng bản lưu cũ.
   **Lát cắt 2b** (đã làm): doanh trại và quân đội, chòi canh, bẫy chông, giữ kinh đô trước giặc Ân, hư hỏng và sửa chữa.
3. **Lát cắt 3**: phó bản chương 1, Thánh Gióng, cốt truyện.
