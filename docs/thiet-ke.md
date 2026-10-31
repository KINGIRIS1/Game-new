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
  - **mỗi loại công trình một dáng riêng**, để không loại nào trông như bản to nhỏ của loại khác:
    - Điện Vua Hùng là nhà sàn mái thuyền lớn;
    - nhà sàn có mái tròn hình mai rùa, kiểu nhà thứ hai trên trống đồng;
    - kho thóc thân tròn trên cột cao, mái nón;
    - doanh trại là nhà dài để trống không vách, mái thẳng;
    - lò rèn có lò nung hình nón to;
    - bến chợ thuyền có cầu tàu và sạp căng bạt;
    - bãi đất đá có hố và đống đá;
  - **mỗi cấp đổi hẳn dáng**: thêm một phần lớn nhìn thấy rõ và to dần, từ khoảng 85% ở cấp 1 lên 105% ở cấp 5.
    - Ví dụ Điện: cấp 2 thêm cờ, trống và chim đồng; cấp 3 thêm chái nhà bên; cấp 4 thêm nền đá và hàng rào; cấp 5 lợp mái hai tầng.
    - Cả bảng nằm ở `src/render/buildings.ts`.
  - **dân ăn mặc theo nơi làm việc**, mỗi nghề một dụng cụ và một động tác (`src/render/people.ts`):
    - nông dân quấn khăn, cầm cuốc, cúi cấy;
    - thương nhân mặc áo chàm, đội thúng, đi lại;
    - thợ đá vác đá, bổ cuốc chim;
    - thợ rèn đeo yếm da, quai búa;
    - người giữ kho vác bao thóc;
    - phụ nữ mặc váy, đeo gùi;
    - Lạc hầu và lính gác đội mũ lông chim;
  - ruộng, bến, bãi đất đá, lò rèn hiện **đúng số người đang làm**, tối đa bằng số chỗ đứng.
  - bảng màu: nền kem như giấy, đất vàng ô liu, nước xanh lam đục, điểm nhấn đồng, đỏ son và mực đen.
- Phong cách này được chọn qua bản dùng thử so sánh 4 phương án: khối hộp ban đầu, voxel tinh xảo, đồ chơi bo tròn, và Nét Đông Sơn. Cả bộ dùng thử được cất ở branch `prototype/phong-cach-hinh-anh`.
- Màn hình dọc, camera isometric, kéo và phóng to bằng chạm. Giao diện bằng HTML đặt đè lên cảnh 3D.
- Máy thử chính là **Samsung Galaxy Z Fold5**. Màn hình ngoài (dài, hẹp) dùng bảng trượt lên từ dưới. Màn hình trong (gần vuông) dùng bảng bên cạnh.
- Mục tiêu 60 khung hình/giây trên Fold5, ít nhất 30 trên máy Android tầm trung đời cũ. Bãi chiến tối đa khoảng 40–60 lính.
- Độ nét (pixel ratio) mặc định 1,5, không vượt quá màn hình thật, đặt lại mỗi lần đổi cỡ màn hình (mở hay gập Fold5). Cài đặt có 3 mức: Tiết kiệm (1), Vừa (1,5), Nét (2). Lựa chọn lưu riêng trên từng máy, không đi theo mã lưu.
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
| Đền Phù Đổng | Có sau khi kết chương. Thêm 10% sản lượng mọi tài nguyên, thêm 10% máu và sức đánh cho quân ta |

## Quân đội và trận đánh

- 3 binh chủng khắc chế vòng tròn, mỗi binh chủng ta khắc một loại giặc tương ứng:
  - **giáo binh** thắng quân nặng (chiến xa);
  - **voi chiến** thắng cung thủ Ân;
  - **cung thủ** thắng lính giáo Ân.
- Luyện quân tốn tiền tuyển và gạo ăn hằng phút. Lính tách riêng khỏi dân làng (xem mục Giữ kinh đô). Doanh trại càng cao càng nuôi được nhiều quân. Luyện xong ngay.
- **Giặc Ân**: lính giáo (cung thủ ta khắc chế), cung thủ (voi chiến ta khắc chế), **chiến xa** (giáo binh ta khắc chế). Cuối mỗi phần có tướng giặc làm trùm.
- Trận đánh **tự động** trong 20–40 giây trên bãi chiến 3D, lính chibi có động tác đơn giản. Người chơi chỉ bấm kỹ năng của tướng.
- Trước trận phó bản: xem trước quân giặc, chọn số lính mỗi loại trong giới hạn sức chứa, xếp vào 3 hàng (tiền quân, trung quân, hậu quân).
- **Phó bản**: bản đồ chương 1 có khoảng 8 màn và trùm cuối. Màn đã qua đánh lại được để kiếm tài nguyên. Lính chết trong trận thì mất, dù thắng hay thua. Thua thì không có thưởng, ngoài ra không mất gì.
- **Lạc tướng** cầm quân trong mọi trận, có kỹ năng **Trống trận**:
  - bấm thì quân ta đánh mạnh thêm 50% và chạy nhanh thêm 30% trong 6 giây;
  - hồi lại sau 20 giây;
  - dùng được cả ở phó bản lẫn khi giữ kinh đô.
  - khi đánh, trống vang 0,5 giây một tiếng suốt 6 giây, cứ bốn tiếng có một tiếng nhấn trầm hơn (tạo bằng Web Audio). Mỗi tiếng, một sóng mang hoa văn mặt trống đồng (sao giữa, vòng tròn tiếp tuyến, răng cưa) lan ra, và cả đạo quân ta nhún lên một nhịp; dưới chân mỗi lính ta có vòng đồng nảy theo nhịp, tắt đúng lúc hết hiệu lực. Trận ngã ngũ thì thôi trống;
  - ở bãi chiến, Lạc tướng quay mặt vào trống đồng, nện dùi theo nhịp, mặt trống lóe sáng mỗi tiếng, cờ đỏ phấp phới; sóng trống lan từ chỗ trống. Khi giữ kinh đô, sóng lan từ giữa đám quân ta.
- **Giữ kinh đô**: khoảng 15 phút chơi có một đợt giặc Ân. Trinh sát báo trước 60 giây, kèm hướng giặc tới (một trong hai cạnh rừng). Giặc tìm đường tới kho và Điện, gặp lũy thì phải phá. Phòng thủ bằng chòi canh, bẫy chông và quân nhà. Thua thì chỉ mất một phần kho và vài công trình hư hỏng, sửa lại được.

### Giữ kinh đô (đã làm ở lát cắt 2b)

- **Doanh trại** cần Điện cấp 2. Sức chứa quân theo cấp: 8, 14, 20, 28, 38 chỗ.
- **Các binh chủng ta:**

  | Binh chủng | Cần doanh trại | Giá | Máu | Sát thương | Ghi chú |
  |---|---|---|---|---|---|
  | Giáo binh | cấp 1 | 20 gạo, 8 vỏ ốc | 60 | 8 | không cần sắt |
  | Cung thủ | cấp 2 | 25 gạo, 8 vỏ ốc, 4 sắt | 40 | 7 | tầm bắn 3,8 ô |
  | Voi chiến | cấp 3 | 60 gạo, 20 vỏ ốc, 12 sắt | 200 | 15 | chiếm 3 chỗ |

  **Lính tách riêng khỏi dân làng**: tuyển thẳng ở doanh trại, không lấy bớt người làm. Đổi lại phải trả tiền tuyển và gạo ăn: lính ăn 0,6 gạo/phút, riêng voi ăn 1,5. Chủ dự án chọn cách này sau khi chơi thử thấy không tuyển được lính vì dân đều đã vào làm. Đánh đúng thế khắc chế thì sát thương gấp đôi.
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

### Phó bản (đã làm ở lát cắt 3a)

- Nút **⚔️ Phó bản** ở thanh dưới hiện khi đã có doanh trại.
- **Bản đồ "Đường tới núi Trâu"**: 8 màn nối nhau từ Phong Châu tới chân núi Trâu. Thắng màn trước mới mở màn sau.

  | Màn | Tên | Cần Điện | Quân giặc | Thưởng lần đầu |
  |---|---|---|---|---|
  | 1 | Bìa rừng Phong Châu | 2 | 4 lính giáo | 150 gạo, 100 vỏ ốc |
  | 2 | Bến đò Bạch Hạc | 2 | 5 lính giáo, 2 cung | 200 gạo, 150 vỏ ốc, 80 đất đá |
  | 3 | Làng ven sông | 3 | 5 lính giáo, 3 cung, 1 chiến xa (máu ×1,1) | 300 gạo, 200 vỏ ốc, 150 đất đá, 40 sắt |
  | 4 | Đồn giặc, trùm **phó tướng Ân** | 3 | 5 lính giáo, 3 cung, 1 chiến xa, phó tướng (máu ×1,1) | 500 gạo, 300 vỏ ốc, 250 đất đá, 80 sắt |
  | 5 | Rừng sâu | 3 | 9 lính giáo, 5 cung, 3 chiến xa (máu ×1,35) | 600 gạo, 400 vỏ ốc, 300 đất đá, 100 sắt |
  | 6 | Bến sông Cầu | 4 | 12 lính giáo, 7 cung, 3 chiến xa (máu ×1,45) | 800 gạo, 500 vỏ ốc, 400 đất đá, 120 sắt |
  | 7 | Cánh đồng cháy | 4 | 10 lính giáo, 6 cung, 4 chiến xa (máu ×1,5) | 1000 gạo, 600 vỏ ốc, 500 đất đá, 150 sắt |
  | 8 | Chân núi Trâu, trùm **đại tướng Ân** | 5 | 12 lính giáo, 7 cung, 4 chiến xa, đại tướng (máu ×1,6) | 1500 gạo, 1000 vỏ ốc, 800 đất đá, 250 sắt |

  - Màn 5–8 cần Thánh Gióng đã thành tráng sĩ và không đang kiệt sức (xem mục Thánh Gióng).
  - Phó tướng Ân: 600 máu, 24 sát thương. Đại tướng Ân đứng trên chiến xa: 1100 máu, 30 sát thương.
  - Đánh lại màn đã qua được 30% thưởng lần đầu.
- **Trước trận**:
  - xem quân giặc và phần thưởng;
  - chọn số lính mỗi loại mang theo (mặc định mang hết);
  - **mỗi binh chủng đứng một hàng**, chạm để đổi hàng. Mặc định giáo binh ở tiền quân, voi ở trung quân, cung thủ ở hậu quân. Lần sau nhớ hàng đã chọn.
- **Bãi chiến**:
  - cảnh 3D riêng, rộng 9 ô, dài 22 ô; nền theo màn: rừng tre, bến sông, làng, đồn giặc, chân núi;
  - mặt bãi phẳng một màu cho dễ nhìn lính, mép lượn có viền đậm như nét vẽ tay;
  - đất quanh bãi nhấp nhô thành gò rồi thành đồi, có mảng cỏ khác màu, dựng bằng noise có hạt giống (thư viện `simplex-noise`) nên mỗi màn luôn ra đúng một dáng đất. Bến sông có bãi cát dọc bờ, chân núi có sườn đá dâng lên sau lưng giặc;
  - rừng mọc thành cụm có trảng trống, tre thành khóm riêng, thưa dần ra mép;
  - hai bên dàn ba hàng cách nhau 10 ô rồi xông vào đánh kẻ gần nhất;
  - lính đẩy nhau ra, không đứng chồng lên nhau;
  - ngoài bãi mọi người bền gấp 1,6 lần, để trận kéo dài chừng 10–35 giây và kịp bấm Trống trận.
- **Kết thúc trận**:
  - thắng khi diệt hết giặc;
  - thua khi quân ta chết hết, hoặc quá 90 giây mà chưa phá được giặc;
  - nút **Rút quân** kết thúc ngay: lính còn sống trở về, không có thưởng.
- **Đang đánh phó bản** thì:
  - đồng hồ giặc đứng lại;
  - không luyện quân và không gọi giặc được;
  - đang có giặc báo hay đang giữ kinh đô thì chưa xuất quân được.
- **Cân bằng** đo bằng test. Mỗi màn có một đạo quân mẫu vừa đủ chỗ trong doanh trại ở cấp Điện mà màn yêu cầu:
  - màn 1: 6 giáo binh;
  - màn 2: 8 giáo, 3 cung;
  - màn 3: 8 giáo, 5 cung, 1 voi;
  - màn 4: 8 giáo, 6 cung, 2 voi.

  Quân mẫu thắng, nửa quân mẫu thua. Ở màn 4, quân mẫu thắng nhưng mất nhiều giáo binh; bấm Trống trận thì đỡ thiệt hơn.
- Màn 5–8 có quân mẫu riêng, luôn tính có Gióng ra trận:
  - màn 5: 8 giáo, 6 cung, 2 voi;
  - màn 6 và 7: 10 giáo, 9 cung, 3 voi;
  - màn 8: 14 giáo, 12 cung, 4 voi.

  Có Gióng và bấm kỹ năng thì thắng. Không có Gióng, hoặc chỉ mang nửa quân, thì thua. Trùm cuối không bấm kỹ năng thì thua.
- Bản lưu lên phiên bản 4. Bản lưu cũ có thêm phần phó bản, và chỉ số nhiệm vụ được dời cho khớp với nhiệm vụ mới chèn vào.

## Thánh Gióng và cốt truyện chương 1

1. **Giặc Ân xâm lược.** Lạc hầu hướng dẫn xây lũy tre, ruộng, chợ thuyền. Các trận đầu do Lạc tướng cầm quân thường.
2. **Sứ giả tìm người tài.** Khi Điện Vua Hùng lên cấp 2, cậu bé làng Phù Đổng lên tiếng xin ngựa sắt, roi sắt, giáp sắt. Gióng xuất hiện, lúc đầu còn nhỏ.
3. **Cả nước góp gạo nuôi Gióng, nhà vua sai thợ rèn đồ sắt.** Gióng lớn nhờ gạo. Lò rèn dùng sắt để rèn ngựa sắt, roi sắt, giáp sắt.
4. **Đánh giặc trên đường tới núi Trâu.** Giữa chương roi sắt gãy, mở khóa kỹ năng Nhổ tre. Trùm cuối là tướng giặc dưới chân núi Trâu.
5. **Kết chương.** Gióng cưỡi ngựa lên núi Sóc, cởi giáp, bay về trời. Vua phong Phù Đổng Thiên Vương, lập Đền Phù Đổng (thưởng vĩnh viễn). Sau đó Gióng **hiển linh**, vẫn ra trận khi đánh lại phó bản.

- Kỹ năng của Gióng (bấm tay trong trận): **Ngựa sắt phun lửa** (xung phong đốt một hàng giặc), **Nhổ tre quật giặc** (đòn diện rộng).
- Chủ dự án đã chốt cho lát cắt 3b:
  - **Gióng ra trận cả ở phó bản lẫn khi giặc vào kinh đô**;
  - nuôi Gióng bằng cách **bấm góp gạo theo 5 mốc**;
  - đủ 5 mốc và rèn xong ngựa sắt, roi sắt, giáp sắt ở lò rèn thì Gióng vươn vai thành tráng sĩ.
- Gióng không bao giờ chết, chỉ kiệt sức khoảng 2 phút.

### Thánh Gióng (đã làm ở lát cắt 3b)

- **Truyện**: mỗi đoạn là một chuỗi thẻ hội thoại, có người nói (Lời kể, Lạc hầu, Vua Hùng, Gióng), bấm "Tiếp" để sang thẻ sau. Mỗi đoạn kể đúng một lần, khi không đang đánh và không có hộp thoại nào khác:
  - "Giặc Ân xâm lược": vào game mới;
  - "Sứ giả tìm người tài": Điện lên cấp 2;
  - "Vươn vai thành tráng sĩ": Gióng thành tráng sĩ;
  - "Roi sắt gãy": thắng màn 6 lần đầu;
  - "Phù Đổng Thiên Vương": thắng màn 8 lần đầu.
- **Gióng ở kinh đô**: đứng trước Điện, đổi dáng theo mốc gạo: cậu bé lên ba ngồi bệt trên chiếu, thiếu niên đứng ôm bát cơm đầy cạnh chồng bát đã ăn (từ mốc 2), tráng sĩ cưỡi ngựa sắt. Chạm vào Gióng, vào chip trên thanh trên, hoặc nút trong bảng Điện, bảng lò rèn, để mở bảng Gióng.
- **Dáng Gióng** (`makeGiong` trong `src/render/models.ts`): to hơn hẳn lính thường để nhận ra ngay.
  - Tráng sĩ mặc giáp sắt viền đồng, đội mũ sắt có chùm lông chim như người trên trống đồng, khoác áo choàng đỏ ngắn vắt bay ra sau, giơ cao roi sắt (hay cây tre khi roi đã gãy).
  - Ngựa sắt màu thép xanh, có móng, vòng cổ và tấm trán bằng đồng; mắt, bờm, đuôi và lửa phun từ mõm tự sáng, không bị bóng đổ làm tối.
- **Góp gạo theo 5 mốc**: 80, 150, 250, 400, 600 gạo.
- **Rèn đồ sắt ở lò rèn**:

  | Món | Giá | Cần lò rèn |
  |---|---|---|
  | Ngựa sắt | 40 sắt | cấp 1 |
  | Roi sắt | 60 sắt | cấp 2 |
  | Giáp sắt | 90 sắt, 100 đất đá | cấp 3 |

  Lò rèn đang hư thì không rèn được.
- **Tráng sĩ**: đủ 5 mốc gạo và 3 món đồ thì Gióng vươn vai thành tráng sĩ, từ đó cùng ra trận:
  - ở phó bản, Gióng đứng giữa, trước tiền quân. Có Gióng thì xuất quân một mình cũng được;
  - khi giặc đánh kinh đô, Gióng ra từ trước Điện.
- **Gióng trong trận**:
  - 500 máu (ngoài bãi cũng bền gấp 1,6 lần như mọi người), 22 sát thương, chạy nhanh;
  - mỗi đòn quét thêm nửa sát thương lên giặc đứng quanh mục tiêu trong 1,3 ô;
  - mỗi đòn, Gióng quật roi sắt (hay cây tre) từ trên cao xuống trước mặt.
- **Kỹ năng của Gióng**:
  - **Phun lửa**: Gióng phi ngựa lao về phía giặc gần nhất. Mọi tên giặc trong dải dài 7 ô, rộng 1,5 ô mất 60 máu. Hồi 15 giây. Ngựa sắt phi dọc đường lao trong 0,4 giây, lửa hình giọt có viền mực phun từ mõm, để lại vệt đất cháy sém có than hồng đúng dải bị đốt (tắt dần trong 4 giây); giặc trúng lửa bốc cháy trên đầu và vai chừng 2 giây;
  - **Nhổ tre**: có từ khi roi sắt gãy. Giặc trong vòng 2,5 ô quanh Gióng mất 45 máu và bị hất lùi 1,2 ô. Hồi 20 giây. Gióng vung tre ra sau lấy đà, quật xuống trước mặt rồi quét trọn một vòng quanh mình, chừng 0,9 giây;
  - ngoài bãi, sát thương kỹ năng cũng nhân 1,6 lần cho tương xứng.
- **Kiệt sức**: hết máu thì Gióng rút khỏi trận, không tính vào lính tử trận. Sau trận Gióng nghỉ 2 phút theo đồng hồ chơi; trong lúc đó không ra trận và chưa đánh được màn cần Gióng.
- **Kết chương**: thắng màn 8 thì Gióng cưỡi ngựa bay lên trời ngay trên bãi chiến, bảng kết quả hiện sau đó.
  - Mở công trình **Đền Phù Đổng** (3×3, dựng một lần, 600 gạo, 600 vỏ ốc, 500 đất đá, 150 sắt).
  - Đền còn nguyên thì mọi tài nguyên làm ra thêm 10%, quân ta thêm 10% máu và sức đánh.
  - Từ đó Gióng **hiển linh** (có vòng hào quang vàng sau lưng, tia như ngôi sao giữa mặt trống đồng, xoay chậm), vẫn ra trận khi đánh lại phó bản và khi giữ kinh đô.
- Bản lưu lên phiên bản 5. Bản lưu cũ có thêm phần Gióng; người chơi cũ không phải xem lại đoạn mở đầu, nhưng vẫn được kể các đoạn về Gióng.
- Không có cơ chế chơi lại từ đầu (prestige). Tiến trình liên tục theo chương.
- Thứ tự theo truyền thuyết: Gióng (đời Hùng Vương thứ 6) có trước Sơn Tinh (đời thứ 18). Chương 2 ở bản sau là Sơn Tinh, Thủy Tinh và lũ.

## Nhịp chơi và lưu game

- Nhịp chơi lai: mỗi lần mở game là một phiên ra quyết định ngắn.
- Khi tắt máy, kinh đô sản xuất với **50% tốc độ**, cộng dồn tối đa **8 giờ**. Giặc chờ đến khi người chơi mở game mới tấn công.
- Game không dùng năm hay mùa. Nhịp được tạo bởi các đợt giặc.
- Tự lưu sau mọi thao tác vào `localStorage`. Có nút **Xuất mã lưu** và **Nhập mã lưu** để sao lưu hoặc chuyển máy.

## Hướng dẫn của Lạc hầu

6 bước: xây lũy tre → đặt ruộng → phân công dân → nâng Điện Vua Hùng → luyện quân → đánh màn 1 và giữ kinh đô qua đợt giặc đầu tiên.

Đã làm (lát cắt 3b), 20 nhiệm vụ:
1. lũy tre → ruộng → bến → Điện cấp 2 → nhà sàn;
2. bãi đất đá có 2 người làm → kho thóc → lò rèn → Điện cấp 3;
3. doanh trại → luyện 5 lính → **đánh màn 1** → chòi canh → đánh lui đợt giặc đầu tiên → **qua màn 4**;
4. **góp đủ 5 mốc gạo nuôi Gióng** → **rèn đủ 3 món đồ sắt** → **qua màn 6** → **phá giặc ở núi Trâu (màn 8)** → **dựng Đền Phù Đổng**.

## Thứ tự làm

1. **Lát cắt 1** (đã làm): kinh đô 3D với Điện Vua Hùng, ruộng lúa, bến chợ thuyền, lũy tre. Đặt công trình trên lưới, nâng cấp, sản xuất, mở rộng đất, tính phần vắng mặt, lưu và xuất/nhập mã lưu, âm thanh, bốn nhiệm vụ đầu của Lạc hầu (lũy tre → ruộng → bến → nâng Điện). Lát cắt này chỉ dùng gạo và vỏ ốc.
2. **Lát cắt 2a** (đã làm): dân làng và phân công, nhà sàn, bãi đất đá, lò rèn, kho thóc, thành đất, thuyền buôn, thiếu gạo, nâng bản lưu cũ.
   **Lát cắt 2b** (đã làm): doanh trại và quân đội, chòi canh, bẫy chông, giữ kinh đô trước giặc Ân, hư hỏng và sửa chữa.
   **Sửa sau chơi thử 2b** (đã làm):
   - lính tách khỏi dân, giáo binh không cần sắt;
   - mỗi công trình một dáng riêng, mỗi cấp đổi hẳn dáng;
   - dân ăn mặc theo nghề.
3. **Lát cắt 3a** (đã làm): phó bản màn 1–4, bãi chiến riêng, xếp quân theo hàng, Lạc tướng đánh Trống trận, phó tướng Ân.
   **Lát cắt 3b** (đã làm): Thánh Gióng (góp gạo, rèn đồ, hai kỹ năng, kiệt sức), màn 5–8, đại tướng Ân, cốt truyện, kết chương, Đền Phù Đổng.
4. **Chương 2** (bản sau): Sơn Tinh, Thủy Tinh, độ cao ô đất và lũ.
