# Thời đại Văn Lang: thiết kế chương 1, chương 2 và chương 3

Tài liệu này ghi lại các quyết định đã chốt với chủ dự án. Khi cần đổi một quyết định, hãy hỏi chủ dự án trước rồi sửa tài liệu này cùng lúc với code.

## Tổng quan

- Game xây dựng chiến thuật cho một người chơi, chạy trên trình duyệt và ưu tiên điện thoại. Đăng miễn phí lên GitHub Pages. Làm cho vui, không kiếm tiền.
- Chỉ có tiếng Việt. Mọi chữ hiển thị nằm trong `src/text/vi.ts`, tách khỏi code để sau này dịch.
- Người chơi là **Vua Hùng**, xây dựng **kinh đô Phong Châu**. Lạc hầu hướng dẫn, Lạc tướng cầm quân, Bồ chính coi làng. Từ chương 3, Vua Hùng truyền ngôi cho Thục Phán; người chơi trị vì tiếp trên cùng kinh đô với tư cách **An Dương Vương**.
- Học các cơ chế quen thuộc của thể loại xây dựng chiến thuật (như Clash of Clans, Rise of Kingdoms), nhưng luật chơi, nội dung và hình ảnh là của riêng game này, không sao chép game nào.
- Chương 1 dài khoảng 30–60 phút chơi. Chương 2 và chương 3 nối tiếp ngay trên cùng kinh đô.

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
- Ô đất có **độ cao theo bậc** ngay từ đầu game (xem mục Độ cao ô đất ở chương 2). Chương 1 chỉ để nhìn; từ chương 2 độ cao quyết định ô nào ngập lũ.

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
| Đê đất → Kè đá | Có từ chương 2. Chặn nước lũ tràn từ sông vào |
| Đền Tản Viên | Có sau khi kết chương 2. Lũ dâng thấp đi một bậc |
| Thành Cổ Loa | Có từ chương 3. Đoạn thành đất nện cao, chắc; đắp nhiều vòng quanh Điện |
| Đền Cổ Loa | Có sau khi kết chương 3. Chòi canh bắn mạnh gấp rưỡi, xa thêm 1 ô |

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
  - dùng được cả ở phó bản lẫn khi giữ kinh đô;
  - hình và tiếng, đều theo nhịp trống nửa giây một tiếng, suốt 6 giây:
    - ngoài bãi, Lạc tướng đứng nghiêng sau hàng quân ta, hai tay cầm dùi thay nhau nện xuống trống đồng có bốn tượng cóc trên mặt; mặt trống rung lên mỗi lần dùi chạm (`makeDrummer` trong `src/render/models.ts`);
    - mỗi nhịp, một sóng hoa văn mặt trống đồng (ngôi sao giữa, vòng tròn tiếp tuyến, chim bay) màu đồng loang ra trên mặt đất, từ mặt trống ngoài bãi, hay từ giữa quân ta khi giữ kinh đô;
    - dưới chân mỗi lính ta có vòng sáng đồng bừng lên đúng nhịp rồi dịu dần; lính nhún nhảy hăng hơn;
    - tiếng trống "tùng" trầm và "tung" nảy xen nhau, tắt ngay khi trận kết thúc, rút quân hay tắt tiếng.
- **Giữ kinh đô**: khoảng 15 phút chơi có một đợt giặc Ân. Trinh sát báo trước 60 giây, kèm hướng giặc tới (một trong hai cạnh rừng). Giặc tìm đường tới kho và Điện, gặp lũy thì phải phá. Phòng thủ bằng chòi canh, bẫy chông và quân nhà. Thua thì chỉ mất một phần kho và vài công trình hư hỏng, sửa lại được. Sang chương 2, mùa lũ của Thủy Tinh thay cho giặc Ân (xem mục Mùa lũ).

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
- **Kiệt sức**: hết máu thì Gióng rút khỏi trận, không tính vào lính tử trận. Sau trận Gióng nghỉ 2 phút theo đồng hồ chơi; trong lúc đó không ra trận và chưa đánh được màn cần Gióng. Màn không bắt buộc có Gióng thì vẫn xuất quân được, nhưng thẻ màn và bảng xếp quân báo đỏ (xem Chuẩn cân bằng phó bản).
- **Kết chương**: thắng màn 8 thì Gióng cưỡi ngựa bay lên trời ngay trên bãi chiến, bảng kết quả hiện sau đó.
  - Mở công trình **Đền Phù Đổng** (3×3, dựng một lần, 600 gạo, 600 vỏ ốc, 500 đất đá, 150 sắt).
  - Đền còn nguyên thì mọi tài nguyên làm ra thêm 10%, quân ta thêm 10% máu và sức đánh.
  - Từ đó Gióng **hiển linh** (có vòng hào quang vàng sau lưng, tia như ngôi sao giữa mặt trống đồng, xoay chậm), vẫn ra trận khi đánh lại phó bản và khi giữ kinh đô.
- Bản lưu lên phiên bản 5. Bản lưu cũ có thêm phần Gióng; người chơi cũ không phải xem lại đoạn mở đầu, nhưng vẫn được kể các đoạn về Gióng.
- Không có cơ chế chơi lại từ đầu (prestige). Tiến trình liên tục theo chương.
- Thứ tự theo truyền thuyết: Gióng (đời Hùng Vương thứ 6) có trước Sơn Tinh (đời thứ 18), rồi tới An Dương Vương (sau đời thứ 18). Chương 2 là Sơn Tinh, Thủy Tinh và lũ; chương 3 là An Dương Vương, thành Cổ Loa và nỏ thần.

## Chương 2: Sơn Tinh, Thủy Tinh (đã làm)

Chủ dự án đã chốt bốn điểm:
- **lũ kèm thủy quái**: từ đám cưới, Thủy Tinh dâng nước thay cho giặc Ân, cùng lúc thủy quái từ sông lên đánh; đê chặn nước, thủy quái phá vỡ đê thì nước tràn vào;
- **độ cao ô đất có sẵn từ đầu game**, công trình tự đắp nền bằng ô cao nhất; chương 2 mở Đắp đất và Đắp nền;
- **lễ vật lấy từ gạo và ba màn đầu phó bản chương 2**;
- **Sơn Tinh là tướng ra trận** như Gióng, mỗi trận một tướng.

### Cốt truyện

1. **Vua Hùng kén rể.** Mười hai đời sau, Hùng Vương thứ 18 kén chồng cho Mị Nương. Sơn Tinh và Thủy Tinh cùng đến cầu hôn. Vua thách cưới một trăm ván cơm nếp, một trăm nệp bánh chưng, voi chín ngà, gà chín cựa, ngựa chín hồng mao. Thủy Tinh sai thủy quái đi tranh lễ vật.
2. **Sơn Tinh rước dâu.** Đủ lễ vật, Sơn Tinh đến trước rước Mị Nương về núi. Thủy Tinh đến sau, nổi giận dâng nước đánh kinh đô. Sơn Tinh cùng quân ta giữ nước.
3. **Dời non chặn nước.** "Nước dâng bao nhiêu, đồi núi cao bấy nhiêu": giữa chương Sơn Tinh có thêm phép Dời non.
4. **Thủy Tinh rút quân.** Thua ở đỉnh Tản Viên, Thủy Tinh rút về biển, nhưng năm nào cũng dâng nước báo thù. Vua lập Đền Tản Viên.

- Mỗi đoạn kể đúng một lần, theo thứ tự, sau các đoạn của chương 1:
  - "Vua Hùng kén rể": nhận thưởng nhiệm vụ cuối chương 1 (Đền Phù Đổng);
  - "Sơn Tinh rước dâu": đủ năm lễ vật;
  - "Dời non chặn nước": thắng màn 14 lần đầu;
  - "Thủy Tinh rút quân": thắng màn 16 lần đầu.
- Người nói mới: Mị Nương, Sơn Tinh, Thủy Tinh.

### Độ cao ô đất

- Mỗi ô có bậc từ 0 tới 4, sông là −1. Đất tự nhiên dựng bằng value noise có hạt giống cố định nên mọi máy ra một dáng đất:
  - hai ô sát sông là bãi bồi, bậc 0;
  - vào trong là đồng bằng bậc 1, có gò bậc 2;
  - càng xa sông về phía rừng càng nhiều đồi bậc 2–3.
- Cảnh 3D vẽ mỗi ô một cột đất cao 0,3 đơn vị mỗi bậc, bậc cao sáng màu hơn chút. Rừng ngoài lưới nối liền theo bậc của ô mép.
- Dựng công trình thì **móng được đắp phẳng bằng ô cao nhất dưới móng**, không mất thêm gì. Bản lưu cũ được đắp móng y như vậy.
- Từ chương 2:
  - **Đắp đất** (thẻ ⛰️ trong bảng Xây dựng): chạm từng ô trống đã khai phá để đắp cao thêm một bậc, giá 20 + 10 × bậc hiện tại đất đá, cao nhất bậc 4;
  - **Đắp nền** (nút trong bảng công trình): cả công trình cao thêm một bậc, giá 8 × diện tích móng × (bậc + 1) đất đá, cao nhất bậc 4. Lũy, bẫy, đê không đắp nền được, muốn cao thì đắp ô đất trước;
  - bảng công trình ghi bậc nền và lũ dâng quá bậc nào thì hư.
- Độ cao không cản đường đi của lính.

### Đê

- 1×1 ô, dựng bằng cách chạm từng ô như lũy, tối đa 90 đoạn, có từ chương 2.

  | Cấp | Tên | Giá | Cao hơn mặt đất | Máu |
  |---|---|---|---|---|
  | 1 | Đê đất | 15 đất đá | 2 bậc | 600 |
  | 2 | Kè đá | 40 đất đá, 20 vỏ ốc | 3 bậc | 1500 |

- Đê còn nguyên chặn nước; đê phải **liền một dải** mới chặn được. Giặc không nhắm đánh đê, nhưng đê chắn đường thì giặc phá. Đê vỡ thì nước tràn qua chỗ vỡ.
- Khi đang đắp đê, đắp đất, hay lúc trinh sát báo lũ, những ô sẽ ngập ở mùa lũ tới được tô xanh.

### Nước lũ

- Nước loang từ sông sang bốn phía, chỉ vào ô **đã khai phá** thấp hơn mực nước (bậc nền cộng chiều cao đê). Rừng chưa phát giữ đất, không ngập.
- Công trình bị nước làm hư (như bị giặc phá, sửa tốn 30% giá) khi móng nằm trong vùng ngập và mực nước cao hơn bậc nền cộng sức chịu:
  - Điện, nhà sàn, kho thóc dựng trên cột, hai đền xây trên nền đá: chịu được 1 bậc;
  - bến chợ thuyền, lũy, bẫy chông, đê: không sợ nước;
  - còn lại ngập là hư.
- Cảnh 3D: nước lũ màu phù sa phủ ô ngập, nước sông và bờ bên kia dâng theo; trời tối sầm, mưa xối xả; xong trận nước rút dần trong 8 giây.

### Mùa lũ

- Sang chương 2 thì giặc Ân thôi tới. Đồng hồ giặc đứng lại tới đám cưới, rồi **mùa lũ đầu tiên tới sau 3 phút chơi**, sau đó 15 phút một mùa như lịch giặc cũ.
- Trinh sát báo trước 60 giây, kèm hướng sông thủy quái tới (sông phía Nam hoặc phía Đông), dải đỏ nhấp nháy trên mặt sông. Nút "Đón lũ ngay" trong doanh trại gọi lũ tới sớm.
- Mực lũ mùa thứ n:

  | Mùa | 1–2 | 3–4 | từ 5 |
  |---|---|---|---|
  | Nước dâng tới | bậc 1 | bậc 2 | bậc 3 |

  Đền Tản Viên còn nguyên thì lũ thấp đi một bậc, thấp nhất bậc 1.
- Nước dâng mỗi bậc trong 6 giây. **Diệt hết thủy quái thì nước rút ngay**, nên đánh nhanh thì lũ không kịp dâng cao.
- Thủy quái mùa thứ n: `6 + n` tôm binh (tối đa 16), `1 + n` cá phun nước (tối đa 10), `⌊(n + 1) / 2⌋` cá sấu (tối đa 6). Máu ×(1,3 + 0,12 × (n − 1)).
- Thủy quái ngoi lên từ sông, bơi được dưới sông, tìm đường tới kho rồi Điện như giặc Ân; cướp được thì lặn về sông.
- Sơn Tinh ra trận từ trước Điện (nếu đang kiệt sức thì Gióng hiển linh ra thay).
- **Giữ được mùa lũ** khi diệt hết thủy quái, không bị cướp, không công trình nào bị ngập.
- Độ khó đo bằng test: đê liền dải, năm chòi canh sát đê, quân mẫu và Sơn Tinh bấm kỹ năng giữ được mùa lũ bậc 3 mà không công trình nào ngập. Đê đất không có chòi canh gần thì thường vỡ từ mùa 7.

### Thủy quái

| Loại | Máu | Sát thương | Ghi chú | Quân ta khắc chế |
|---|---|---|---|---|
| Tôm binh | 85 | 10 | cầm giáo | cung thủ |
| Cá phun nước | 50 | 9 | phun nước xa 3,6 ô | voi chiến |
| Cá sấu | 260 | 22 | lao nhanh, gấp đôi sát thương lên cung thủ ta | giáo binh |
| Thuồng luồng (trùm màn 12) | 750 | 26 | | |
| Thủy Tinh (trùm màn 16) | 1400 | 32 | đứng trên ngọn sóng, cầm đinh ba | |

Vòng khắc chế của quân ta giữ nguyên: giáo binh thắng quân nặng, cung thủ thắng lính bộ, voi thắng quân bắn xa.

### Lễ vật và Sơn Tinh

- Chạm vào Sơn Tinh đứng trên mỏm đá trước Điện, vào chip ⛰️ trên thanh trên, hoặc nút trong bảng Điện, để mở bảng Sơn Tinh.

  | Lễ vật | Lấy ở đâu |
  |---|---|
  | Trăm ván cơm nếp | dâng 900 gạo |
  | Trăm nệp bánh chưng | dâng 700 gạo, 400 vỏ ốc |
  | Gà chín cựa | thắng màn 9 lần đầu |
  | Ngựa chín hồng mao | thắng màn 10 lần đầu |
  | Voi chín ngà | thắng màn 11 lần đầu |

- Đủ năm lễ vật thì Sơn Tinh rước Mị Nương và **cùng ra trận**:
  - mỗi trận một tướng: trận chương 2 (phó bản chương 2, mùa lũ) có Sơn Tinh, các trận khác có Gióng hiển linh. Chưa rước Mị Nương, hay Sơn Tinh đang kiệt sức, thì trận chương 2 có Gióng hiển linh;
  - 560 máu (ngoài bãi bền gấp 1,6), 20 sát thương, mỗi đòn gậy làm rung đất, quét thêm nửa sát thương lên giặc quanh mục tiêu trong 1,3 ô như Gióng;
  - hết máu thì kiệt sức, nghỉ 2 phút chơi, không tính vào lính tử trận.
- **Kỹ năng của Sơn Tinh**:
  - **Bốc đồi**: nhấc một quả đồi có cây ném xuống chỗ giặc đứng đông nhất, giặc trong 2,2 ô mất 70 máu. Hồi 16 giây. Đồi rơi trong 0,45 giây, bụi đất tung lên, rồi lún dần;
  - **Dời non**: có từ khi thắng màn 14. Đá mọc lên dưới chân mọi kẻ địch trong 4 ô quanh Sơn Tinh: mất 30 máu và bị giữ chân 3 giây (đứng yên, không đánh). Hồi 22 giây;
  - ngoài bãi, sát thương kỹ năng nhân 1,6 lần như của Gióng.
- **Dáng Sơn Tinh** (`makeSonTinh` trong `src/render/models.ts`): to hơn lính thường, giáp đồng hoa văn trống, áo choàng kết lá rừng, vai đắp đá núi, mũ lông chim xen lông xanh lá, tay cầm gậy thần đầu đồng ôm hòn đá thiêng.
- **Kết chương 2**: thắng màn 16 thì núi Tản Viên dâng cao dưới chân Sơn Tinh ngay trên bãi chiến, bảng kết quả hiện sau đó.
  - Mở **Đền Tản Viên** (3×3, dựng một lần, 1500 gạo, 1500 vỏ ốc, 1500 đất đá, 400 sắt): nền đá ba bậc, ba ngọn núi Ba Vì sau lưng, tượng Sơn Tinh trước sân. Đền còn nguyên thì lũ dâng thấp đi một bậc.
  - Từ đó Sơn Tinh về núi, không đứng ở kinh đô nữa, nhưng **hiển linh** (có hào quang) vẫn ra trận mỗi mùa lũ và ở phó bản chương 2. Mùa lũ vẫn tới.

### Phó bản chương 2: đường lên núi Tản Viên

- Bản đồ phó bản có hai thẻ Chương 1, Chương 2. Mở màn 9 cần đã thắng màn 8 và đã sang chương 2.

  | Màn | Tên | Quân giặc | Máu | Ghi chú |
  |---|---|---|---|---|
  | 9 | Đồi sim Ba Vì | 10 tôm, 6 cá phun, 2 cá sấu | ×3,2 | gà chín cựa |
  | 10 | Bãi cỏ sông Đà | 11 tôm, 7 cá phun, 3 cá sấu | ×2,8 | ngựa chín hồng mao |
  | 11 | Rừng già Tản Viên | 12 tôm, 8 cá phun, 3 cá sấu | ×2,5 | voi chín ngà |
  | 12 | Bạch Hạc ngập nước | 12 tôm, 7 cá phun, 3 cá sấu, thuồng luồng | ×2,1 | cần Sơn Tinh |
  | 13 | Làng chìm trong lũ | 14 tôm, 8 cá phun, 4 cá sấu | ×2,1 | cần Sơn Tinh |
  | 14 | Sông Đà cuồn cuộn | 14 tôm, 8 cá phun, 4 cá sấu | ×2,1 | cần Sơn Tinh, mở Dời non |
  | 15 | Chân núi Tản | 14 tôm, 9 cá phun, 4 cá sấu | ×2,5 | cần Sơn Tinh |
  | 16 | Đỉnh Tản Viên | 12 tôm, 8 cá phun, 3 cá sấu, Thủy Tinh | ×2,4 | cần Sơn Tinh |

  - Mọi màn cần Điện cấp 5. Thưởng lần đầu từ 1200 gạo, 800 vỏ ốc, 600 đất đá, 150 sắt (màn 9) tới 3000 gạo, 2000 vỏ ốc, 2000 đất đá, 500 sắt (màn 16). Đánh lại được 30%.
  - Máu của màn 9–11 cao hơn màn 12–16 vì màn 9–11 có Gióng hiển linh hai kỹ năng, còn màn 12–14 Sơn Tinh mới có một kỹ năng.
  - Máu giặc các màn 9–24 được đặt lại theo chuẩn cân bằng mới (xem mục **Chuẩn cân bằng phó bản**).
- Bãi chiến mới:
  - **đồi sim**: đồi lượn cao, mảng hoa sim tím;
  - **đồng ngập**: bãi chiến là một gò nổi giữa biển nước lũ, nhà sàn chìm nửa, thuyền trôi giữa đồng, chỗ đất chìm thì không có cây;
  - **đỉnh Tản Viên**: ba ngọn núi Ba Vì sau lưng giặc, mây vờn lưng chừng núi, nước lũ dưới chân.
  - Màn 10, 14 dùng bến sông; màn 11 rừng; màn 13 làng; màn 15 chân núi.
- Cân bằng đo bằng test theo **Chuẩn cân bằng phó bản**, với quân mẫu chương 2: 14 giáo, 12 cung, 4 voi (vừa 38 chỗ doanh trại cấp 5). Tướng là Gióng hiển linh ở màn 9–11, Sơn Tinh ở màn 12–16. Thủy Tinh không bấm kỹ năng thì thua.

### Hướng dẫn của Lạc hầu chương 2

10 nhiệm vụ nối sau 20 nhiệm vụ chương 1: dâng cơm nếp → dâng bánh chưng → đắp 8 đoạn đê → qua màn 9 → đủ 5 lễ vật → giữ được một mùa lũ → qua màn 12 → qua màn 14 → qua màn 16 → dựng Đền Tản Viên.

### Bản lưu phiên bản 6

- Thêm độ cao từng ô, Sơn Tinh, mùa lũ. Bản lưu cũ được tính độ cao tự nhiên rồi đắp móng công trình cũ.
- Người chơi đã nhận thưởng nhiệm vụ Đền Phù Đổng thì vào thẳng chương 2.

## Chương 3: An Dương Vương, thành Cổ Loa, nỏ thần (đã làm)

Chủ dự án đã chốt:
- **chương 3 kể truyền thuyết An Dương Vương**, nối ngay sau Hùng Vương thứ 18 cho đúng thứ tự truyền thuyết. Chủ dự án có hỏi truyện Bánh chưng bánh giầy; đã xem và thấy truyện không có đánh nhau (không giặc, không trùm, Lang Liêu không phải tướng), xảy ra đời Hùng Vương thứ 6 (trước chương 2), và chương 2 đã có lễ vật bánh chưng. Bánh chưng bánh giầy để dành làm hội Tết gói bánh, thiên về kinh tế, ở bản sau;
- ba điểm còn lại chủ dự án để tùy, nên theo phương án khuyên dùng:
  - **kết chương ở chiến thắng**: nỏ thần đánh tan Triệu Đà. Chuyện Mỵ Châu, Trọng Thủy để dành cho chương sau;
  - **An Dương Vương cầm nỏ ra trận**, là tướng bắn xa đầu tiên;
  - **cơ chế mới ở kinh đô là đắp thành Cổ Loa** nhiều vòng quanh Điện, yêu tinh núi Thất Diệu kéo về phá thành.

### Cốt truyện

1. **Cột đá thề.** Hùng Vương thứ 18 già, không có con trai nối ngôi, truyền ngôi cho Thục Phán, thủ lĩnh Âu Việt. Thục Phán dựng cột đá thề giữ đền thờ các vua Hùng, lên ngôi An Dương Vương, đặt tên nước Âu Lạc, cho đắp thành Cổ Loa. Thành đắp tới đâu lở tới đó, vì yêu tinh núi Thất Diệu đêm đêm kéo về phá.
2. **Rùa Vàng hiện lên.** Diệt được con gà trắng nghìn năm, đầu sỏ lũ yêu tinh, thì Rùa Vàng (sứ Thanh Giang) nổi lên. Từ đó thành không đổ nữa. Rùa Vàng hứa: thành đủ ba vòng sẽ để lại một vật giữ nước.
3. **Nỏ thần.** Thành xong, Rùa Vàng tặng vuốt làm lẫy nỏ; Cao Lỗ chế nỏ thần. Triệu Đà ở nước Nam Việt vẫn cất quân sang đánh.
4. **Rùa Vàng hộ quân.** Giữa chương, Rùa Vàng hứa che chở quân ta khi núng thế.
5. **Triệu Đà thua chạy.** Dưới chân thành Cổ Loa, nỏ thần bắn một phát giặc chết hàng trăm. Triệu Đà thua chạy, xin giảng hòa. Vua lập Đền Cổ Loa. Câu cuối nhắc chuyện Mỵ Châu, Trọng Thủy "là chuyện về sau".

- Mỗi đoạn kể đúng một lần, theo thứ tự, sau các đoạn của chương 2:
  - "Cột đá thề": nhận thưởng nhiệm vụ cuối chương 2 (Đền Tản Viên);
  - "Rùa Vàng hiện lên": thắng màn 19 lần đầu;
  - "Nỏ thần": chế xong nỏ thần;
  - "Rùa Vàng hộ quân": thắng màn 22 lần đầu;
  - "Triệu Đà thua chạy": thắng màn 24 lần đầu.
- Người nói mới: Thục Phán, An Dương Vương, Rùa Vàng, Cao Lỗ, Triệu Đà.

### Thành Cổ Loa

- Thẻ **Thành Cổ Loa** trong bảng Xây dựng (có từ chương 3): chạm từng ô như lũy, đê. Mỗi đoạn 1×1 ô, giá 30 đất đá, 10 vỏ ốc, 1000 máu, tối đa 150 đoạn, không sợ nước lũ, không đắp nền được.
- **Đắp đè lên lũy tre** (hay thành đất) được: lũy cũ được dỡ đi, chỉ trả giá thành.
- **Số vòng thành** = số đoạn thành còn nguyên ít nhất mà giặc phải phá qua để đi từ bìa rừng tới Điện:
  - giặc đi tám hướng như khi tìm đường thật, nên các đoạn thành phải nối liền theo cạnh ô; nối chéo góc là hở;
  - giặc trên bộ không lội qua sông, nên vòng thành dựa vào bờ sông cũng kín;
  - đoạn thành bị phá thì vòng ấy hở;
  - thành dày hai lớp liền nhau cũng tính là hai vòng.
- Chip 🏰 trên thanh trên ghi số vòng (x/3); bảng Điện, bảng một đoạn thành và bảng An Dương Vương cũng ghi. Khi đang đắp thành, dòng gợi ý báo số vòng hiện có.
- Giặc phải phá thành mới qua (chi phí tìm đường 45, cao hơn mọi loại tường khác).

### Giặc chương 3

| Loại | Máu | Sát thương | Ghi chú | Quân ta khắc chế |
|---|---|---|---|---|
| Quỷ núi | 90 | 11 | yêu tinh, cầm chày đá | cung thủ |
| Ma trơi | 55 | 10 | yêu tinh, phun lửa xanh xa 3,6 ô | voi chiến |
| Hổ tinh | 280 | 23 | yêu tinh, vồ nhanh, gấp đôi sát thương lên cung thủ ta | giáo binh |
| Gà trắng nghìn năm (trùm màn 19) | 1300 | 30 | đầu sỏ yêu tinh | |
| Lính khiên Triệu | 95 | 11 | | cung thủ |
| Nỏ thủ Triệu | 55 | 11 | bắn nỏ xa 3,8 ô | voi chiến |
| Kỵ binh Triệu | 290 | 24 | lao nhanh, gấp đôi sát thương lên cung thủ ta | giáo binh |
| Triệu Đà (trùm màn 24) | 1700 | 34 | cưỡi ngựa | |

### Giữ kinh đô ở chương 3

- Giặc trên bộ và mùa lũ **thay phiên nhau**: đợt trước là giặc trên bộ thì đợt này là lũ, và ngược lại. Lịch vẫn 15 phút một đợt, trinh sát báo trước 60 giây.
  - Từ khi vào chương 3 tới khi thắng màn 19: giặc trên bộ là **đêm yêu tinh**. Đợt đầu tới 3 phút sau khi vào chương 3.
  - Sau màn 19, chưa có nỏ thần: chỉ có lũ.
  - Từ khi có nỏ thần: giặc trên bộ là **quân Triệu Đà**, đợt đầu tới 3 phút sau khi chế xong nỏ.
- **Đêm yêu tinh** thứ n: `9 + n` quỷ núi (tối đa 18), `4 + n` ma trơi (tối đa 12), `2 + ⌊n/2⌋` hổ tinh (tối đa 6), máu ×(1,6 + 0,12 × (n − 1)). Yêu tinh tới từ bìa rừng, **nhắm phá đoạn thành Cổ Loa gần nhất trước tiên**; hết thành mới tới kho rồi Điện. Trời tối như đêm.
- **Quân Triệu** đợt thứ n: `10 + n` lính khiên (tối đa 18), `5 + n` nỏ thủ (tối đa 12), `2 + ⌊(n + 1)/2⌋` kỵ binh (tối đa 7), máu ×(1,9 + 0,12 × (n − 1)). Tới từ bìa rừng, nhắm kho rồi Điện như giặc Ân.
- Tướng: đêm yêu tinh và quân Triệu có An Dương Vương (chưa có thì Sơn Tinh hiển linh, rồi Gióng); mùa lũ vẫn có Sơn Tinh.
- Nút "Nghênh chiến ngay" ở doanh trại gọi đợt kế tiếp tới sớm, dù là giặc hay lũ.
- Độ khó đo bằng test: đêm yêu tinh đầu, và đợt quân Triệu đầu, đều bị quân mẫu, tướng và 5 chòi canh diệt hết.

### An Dương Vương và nỏ thần

- Chạm vào An Dương Vương đứng trước Điện, vào chip 🏰/🏹 trên thanh trên, hoặc nút trong bảng Điện, để mở bảng An Dương Vương: số vòng thành, ba bước để có nỏ thần, nút chế nỏ, kỹ năng.
- **Chế nỏ thần** (Cao Lỗ lấy vuốt Rùa Vàng làm lẫy) cần:
  - đã diệt yêu tinh (thắng màn 19);
  - thành Cổ Loa đủ **3 vòng** quanh Điện lúc chế;
  - lò rèn còn nguyên, cấp 5;
  - 400 sắt, 600 đất đá, 600 vỏ ốc.
- Có nỏ thần thì **An Dương Vương cùng ra trận**:
  - mỗi trận một tướng: trận chương 3 (phó bản chương 3, đêm yêu tinh, quân Triệu) có An Dương Vương; chưa có hay đang kiệt sức thì Sơn Tinh hiển linh, rồi Gióng. Trận chương 2 có Sơn Tinh, trận chương 1 có Gióng như cũ;
  - 620 máu (ngoài bãi bền gấp 1,6), 19 sát thương, bắn xa 4,2 ô; mũi tên găm thêm nửa sát thương lên giặc quanh mục tiêu trong 1,3 ô như đòn của các tướng khác;
  - ngoài bãi, ngài đứng giữa, lùi sau hàng đầu quân ta 1,8 ô (tướng bắn xa);
  - hết máu thì kiệt sức, nghỉ 2 phút chơi, không tính vào lính tử trận.
- **Kỹ năng**:
  - **Nỏ thần** 🏹: một phát tên bay ra hóa muôn mũi, **mọi kẻ địch** còn đứng trên bãi (hay trong kinh đô) mất 80 máu. Hồi 18 giây;
  - **Rùa Vàng** 🐢: có từ khi thắng màn 22. Quân ta hồi 30% máu tối đa, và trong 6 giây chỉ chịu nửa sát thương. Hồi 24 giây;
  - ngoài bãi, sát thương kỹ năng nhân 1,6 lần như của các tướng khác.
- Cân bằng: ban đầu Nỏ thần chỉ 28 máu và An Dương Vương 480 máu đứng đầu hàng thì thua cả năm màn quân Triệu, yếu hơn hẳn Sơn Tinh hiển linh. Đã tăng như trên để ngài mạnh xấp xỉ Sơn Tinh hiển linh, vì trận chương 3 ưu tiên ngài ra trận.
- **Kết chương 3**: thắng màn 24 thì Rùa Vàng khổng lồ nổi lên dưới chân An Dương Vương ngay trên bãi chiến, bảng kết quả hiện sau đó.
  - Mở **Đền Cổ Loa** (3×3, dựng một lần, 2500 gạo, 2500 vỏ ốc, 2500 đất đá, 700 sắt). Đền còn nguyên thì chòi canh bắn mạnh gấp rưỡi và xa thêm 1 ô.
  - An Dương Vương vẫn đứng trước Điện, vẫn cầm nỏ ra trận. Quân Triệu và mùa lũ vẫn thay phiên tới.

### Hình ảnh chương 3

- **An Dương Vương** (`makeAnDuong` trong `src/render/models.ts`): to cỡ Sơn Tinh, giáp đồng hoa văn trống, áo choàng đỏ son, mũ lông chim có vành vàng. Chưa có nỏ thì cầm rìu đồng nghi lễ; có nỏ thì cầm nỏ thần màu đồng vàng, lẫy hình vuốt rùa. Đứng trước Điện, cạnh cột đá thề.
- **Rùa Vàng** (`makeRuaVang`): rùa mai vàng có hoa văn mặt trống. Từ khi diệt yêu tinh, một con Rùa Vàng nhỏ bơi trên sông phía nam kinh đô.
- **Đoạn thành Cổ Loa** (`buildCitadel`): đất nện cao hơn thành đất của lũy, có ụ góc, hàng cọc gỗ, thỉnh thoảng một chòi canh; đoạn bị phá là đống đất sạt.
- **Đền Cổ Loa** (`makeDenCoLoa` trong `src/render/buildings.ts`): đền nền đá mái cong, trước sân có tượng Rùa Vàng và cây nỏ đồng lớn trên giá.
- **Giặc**: quỷ núi da xám xanh có sừng, cầm chày đá; ma trơi là đốm lửa xanh lơ lửng có mặt, tự sáng; hổ tinh vằn cam đen; gà trắng nghìn năm là gà trống trắng khổng lồ mào đỏ. Lính khiên Triệu áo đen viền đỏ, khiên chữ nhật; nỏ thủ Triệu cầm nỏ gỗ; kỵ binh cưỡi ngựa nâu; Triệu Đà râu bạc, giáp đen viền vàng, cưỡi ngựa đen.
- **Đêm yêu tinh** ở kinh đô: ánh trăng xanh tím, trời tối, ma trơi lơ lửng ở bìa rừng, không mưa.
- **Trong trận**: An Dương Vương bắn tên vàng, ma trơi bắn cầu lửa xanh, nỏ thủ Triệu bắn tên sẫm. Nỏ thần: một mũi tên vàng vút lên rồi mưa tên rơi xuống từng tên giặc, lóe sáng chỗ trúng. Rùa Vàng: rùa lớn trồi lên cạnh An Dương Vương rồi lặn; dưới chân lính ta có vòng lục giác như mai rùa khi đang được che chở. Kết chương: Rùa Vàng khổng lồ trồi lên nâng An Dương Vương, nỏ chĩa lên trời.
- **Bãi chiến núi Thất Diệu**: đất tím, bảy mỏm núi nhọn, cây chết, ma trơi, trời đêm. **Bãi chiến thành Cổ Loa**: ba vòng thành đất bao quanh bãi, mỗi vòng chừa cửa ở một góc như xoáy ốc, vòng trong bị phá một mảng phía giặc tràn vào, có hào nước và cờ đỏ. Không đặt thành hẳn sau lưng quân ta vì như thế nằm ngoài khung hình và che Lạc tướng đánh trống.

### Phó bản chương 3: giữ thành Cổ Loa

- Bản đồ phó bản có thêm thẻ Chương 3, mở khi đã sang chương 3. Bản đồ vẽ ba mỏm núi Thất Diệu, núi Tiên Du, sông Đuống và ba vòng thành Cổ Loa.

  | Màn | Tên | Quân giặc | Máu | Ghi chú |
  |---|---|---|---|---|
  | 17 | Chân núi Thất Diệu | 12 quỷ núi, 7 ma trơi, 3 hổ tinh | ×2,6 | |
  | 18 | Rừng ma | 13 quỷ núi, 8 ma trơi, 4 hổ tinh | ×2,4 | |
  | 19 | Đỉnh Thất Diệu | 12 quỷ núi, 7 ma trơi, 3 hổ tinh, gà trắng nghìn năm | ×2,4 | Rùa Vàng hiện lên |
  | 20 | Rừng biên ải | 14 lính khiên, 8 nỏ thủ, 4 kỵ binh | ×1,9 | cần An Dương Vương |
  | 21 | Bến sông Đuống | 14 lính khiên, 9 nỏ thủ, 4 kỵ binh | ×1,8 | cần An Dương Vương |
  | 22 | Núi Tiên Du | 15 lính khiên, 9 nỏ thủ, 4 kỵ binh | ×1,8 | cần An Dương Vương, mở Rùa Vàng |
  | 23 | Làng ven Cổ Loa | 14 lính khiên, 9 nỏ thủ, 5 kỵ binh | ×2,1 | cần An Dương Vương |
  | 24 | Chân thành Cổ Loa | 13 lính khiên, 9 nỏ thủ, 4 kỵ binh, Triệu Đà | ×1,9 | cần An Dương Vương |

  - Mọi màn cần Điện cấp 5. Thưởng lần đầu từ 2600 gạo, 1800 vỏ ốc, 1600 đất đá, 400 sắt (màn 17) tới 5000 gạo, 4000 vỏ ốc, 3500 đất đá, 900 sắt (màn 24). Đánh lại được 30%.
  - Mỗi màn tối đa 28 giặc, cộng quân mẫu và tướng không quá 60 người trên bãi.
- Bãi chiến mới: **núi Thất Diệu** cho màn 17, 19; **thành Cổ Loa** cho màn 24 (xem Hình ảnh chương 3). Màn 18, 20 dùng rừng; 21 bến sông; 22 chân núi; 23 làng.
- Cân bằng đo bằng test theo **Chuẩn cân bằng phó bản** (`src/game/chuong3.test.ts`), quân mẫu 14 giáo, 12 cung, 4 voi. Tướng là Sơn Tinh hiển linh ở màn 17–19, An Dương Vương ở màn 20–24. Triệu Đà không bấm kỹ năng thì thua.

### Hướng dẫn của Lạc hầu chương 3

10 nhiệm vụ nối sau 30 nhiệm vụ của hai chương trước: đắp 1 vòng thành → qua màn 17 → đắp 2 vòng thành → qua màn 19 → đắp 3 vòng thành → chế nỏ thần → đánh lui một đợt quân Triệu ở kinh đô → qua màn 22 → phá Triệu Đà (màn 24) → dựng Đền Cổ Loa. Không nhiệm vụ nào đòi đêm yêu tinh, vì thắng màn 19 sớm thì yêu tinh thôi tới.

### Bản lưu phiên bản 7

- Thêm An Dương Vương (đã có nỏ thần chưa, nghỉ tới lúc nào, đã có Rùa Vàng chưa, đã kết chương chưa) và số đêm yêu tinh, số đợt quân Triệu đã đánh và đã giữ được.
- Bản lưu chương 2 được nâng lên, chưa có gì của chương 3.

## Chuẩn cân bằng phó bản (sửa sau chơi thử chương 3)

- Chủ dự án chơi thật báo 38 quân không qua được màn 11, dù test cũ báo thắng. Đo 20 hạt giống cho thấy:
  - test cũ giả định chơi hoàn hảo: bấm kỹ năng ngay khi hồi, có Đền Phù Đổng. Màn 11 chỉ dư khoảng 7% máu giặc so với ngưỡng thua;
  - lệch một thứ là tụt: quên Trống trận còn thắng 13/20, Đền bị phá 12/20, cung đứng tiền quân 9/20, không tuyển bù quân sau màn 10 thì 0/20;
  - không có tướng thì thua 20/20 ở mọi mức máu. Mà màn 9–11 vẫn cho xuất quân khi Gióng đang kiệt sức, giao diện lại không báo gì: thua một lần rồi đánh lại liền thì gần như chắc thua.
- **Chuẩn mới** cho mọi màn chương 2, 3 (`src/game/testkit.ts`), mỗi màn thử 3 hạt giống:
  - **người chơi thường thắng**: kỹ năng sẵn sàng 1,5 giây mới bấm, không có Đền Phù Đổng (chưa dựng hay đang hư), quân mẫu 38 chỗ, có tướng, thắng trong 90 giây;
  - **chơi giỏi mà thiếu thì thua**: bấm ngay khi hồi, có Đền, nhưng không có tướng, hay chỉ mang nửa quân, thì thua.
- Màn nào không đạt thì đổi máu giặc. Hầu hết các màn hạ xuống, riêng màn 9 nâng từ ×2,9 lên ×3,2: Gióng hiển linh quá mạnh ở đó, quân mẫu không có tướng cũng thắng 6/10 lần. Mỗi màn lấy mức cao nhất mà người chơi thường vẫn thắng cả 10 hạt giống thử.
- **Báo trước khi xuất quân** (thẻ màn và bảng xếp quân), bằng dòng đỏ:
  - tướng lẽ ra ra trận đang kiệt sức: còn bao nhiêu giây, và ai ra thay hay trận này không có tướng. Vẫn cho xuất quân;
  - Đền Phù Đổng đang hư: quân ta mất 10% máu và sức đánh.
- Chip tướng trên thanh trên hiện 💤 khi tướng nghỉ, kể cả khi Gióng đã về trời hay Sơn Tinh đã về núi (lúc khỏe thì chip ẩn như cũ).

## Kế hoạch: kinh đô lớn tiếp và Hội Tết (đã chốt, chưa làm)

Chủ dự án đã chốt qua một buổi hỏi đáp. Vấn đề: từ cuối chương 1 mọi công trình đã ở cấp 5, kinh đô hết việc để xây, kho chạm trần. Mục tiêu là để kinh đô tiếp tục lớn qua các chương. Làm thành ba PR theo thứ tự:

1. **Sửa lỗi và cân bằng lại** (mục Chuẩn cân bằng phó bản ở trên).
2. **Cấp 6–7 và rèn binh khí**:
   - Điện Vua Hùng lên cấp 6 khi vào chương 2, cấp 7 khi vào chương 3. Người đang ở chương sau thì mở ngay;
   - đất mở ra 25×25 ở cấp 6, 26×26 ở cấp 7, chừa một hàng rừng cho giặc trên bộ hiện ra;
   - ruộng, bến chợ thuyền, nhà sàn, bãi đất đá, lò rèn, kho thóc, chòi canh lên được cấp 6, 7. Lũy, đê, thành Cổ Loa giữ cấp riêng;
   - mỗi cấp mới vẫn đổi hẳn dáng: thêm một phần lớn nhìn rõ (ví dụ ruộng cấp 6 có guồng nước, cấp 7 có miếu thần lúa), cỡ không to quá 105%;
   - **doanh trại giữ 38 chỗ**, không lên thêm cấp, vì bãi chiến tối đa khoảng 60 người;
   - **rèn binh khí** ở bảng lò rèn: giáo, cung, voi mỗi loại 2 bậc (bậc 1 cần lò rèn cấp 6, bậc 2 cần cấp 7), mỗi bậc thêm 10% máu và sức đánh ở mọi trận, lính đổi dáng vũ khí;
   - nhịp: người biết dành dụm lên Điện 6 trước màn 12, Điện 7 trước màn 20; canh bằng test như `balance.test.ts`.
3. **Hội Tết bánh chưng bánh giầy**:
   - mở khi kết chương 1 (người đang ở chương 2, 3 mở ngay). Lạc hầu kể chuyện Lang Liêu như chuyện xưa, trước "Vua Hùng kén rể"; chỉ là truyện, không có trò thi tính điểm;
   - công trình mới, cần dân làm: **ruộng nếp** (3×3), **vườn** đậu xanh và lá dong (2×2), **chuồng lợn** (2×2, lợn không ăn gạo), **bếp gói bánh** (2×2);
   - bếp làm bánh chưng nhanh bằng nguồn chậm nhất trong ba nguồn, bánh giầy chỉ cần nếp. Nguyên liệu không tích trữ; bảng bếp báo nguồn nào đang thiếu;
   - bánh tích trữ được, chỉ hiện trong bảng bếp và bảng Tết, không thêm chip trên thanh trên;
   - **Tết** khoảng 20 phút chơi một lần, mở 3 phút để dâng bánh; đang có giặc hay mùa lũ thì lùi tới khi xong trận; lần đầu 2 phút sau truyện. Lỡ Tết thì không có phúc lành, bánh vẫn còn;
   - dâng đủ bánh chưng được **phúc lành Đất** (mọi tài nguyên thêm khoảng 15%), đủ bánh giầy được **phúc lành Trời** (quân ta thêm khoảng 10% máu và sức đánh), kéo dài tới Tết sau, cộng thêm vào phần của các đền;
   - cảnh Tết: cây nêu trước Điện, cờ hội, dân quây quần gói bánh quanh bếp, mâm bánh trước Điện khi dâng; không có pháo.
- Không chèn nhiệm vụ Lạc hầu mới (để khỏi dời chỉ số nhiệm vụ của người đang chơi): Hội Tết dẫn bằng truyện Lang Liêu, cấp 6–7 và rèn binh khí dẫn bằng lời Lạc hầu ở các đoạn truyện mở chương.
- Mọi con số (giá, sản lượng, chỗ làm, số công trình tối đa, giá rèn, nhịp Tết) và dáng từng công trình được ghi vào tài liệu này để chủ dự án duyệt **trước khi** làm code của PR 2, PR 3.
- Binh chủng thứ tư (nỏ thủ Âu Lạc) để dành cho chương 4.

### PR 2: cấp 6–7 và rèn binh khí (chủ dự án đã duyệt, đã làm)

Giá mỗi cấp mới khoảng gấp đôi cấp trước; sản lượng mỗi cấp tăng khoảng 35%. Chủ dự án cho chỉnh trong khoảng ±20% để khớp nhịp đo bằng test; bảng dưới là số cuối cùng.

**Điện Vua Hùng**

| Cấp | Mở khi | Giá nâng | Đất | Sức chứa kho | Chỗ ở | Gạo, vỏ ốc /phút | Máu |
|---|---|---|---|---|---|---|---|
| 6 | vào chương 2 | 4000 gạo, 4000 vỏ ốc, 3000 đất đá, 600 sắt | 25×25 | 14000 | 9 | 14, 7 | 1600 |
| 7 | vào chương 3 | 7200 gạo, 6400 vỏ ốc, 5600 đất đá, 1200 sắt | 26×26 | 22000 | 10 | 16, 8 | 1800 |

**Công trình lên cấp 6, 7** (giá là giá nâng lên cấp ấy)

| Công trình | Cấp 6 | Cấp 7 | Sản lượng hay công dụng (cấp 5 → 6 → 7) | Chỗ làm | Tối đa ở Điện 5 → 6 → 7 |
|---|---|---|---|---|---|
| Ruộng lúa | 850 vỏ ốc, 550 đất đá | 1700 vỏ ốc, 1100 đất đá | gạo 110 → 150 → 200 | 4 → 5 → 5 | 6 → 7 → 8 |
| Bến chợ thuyền | 1000 gạo, 600 đất đá | 2000 gạo, 1200 đất đá | vỏ ốc 112 → 150 → 200 | 3 → 4 → 4 | 4 → 4 → 5 |
| Nhà sàn | 760 vỏ ốc, 640 đất đá | 1500 vỏ ốc, 1300 đất đá | chỗ ở 12 → 14 → 16 | – | 5 → 6 → 7 |
| Bãi đất đá | 480 gạo, 1000 vỏ ốc | 960 gạo, 2000 vỏ ốc | đất đá 105 → 145 → 195 | 4 → 5 → 5 | 4 → 5 → 5 |
| Lò rèn | 1300 vỏ ốc, 1400 đất đá | 2600 vỏ ốc, 2800 đất đá | sắt 29 → 40 → 54 | 3 → 4 → 4 | 2 → 3 → 3 |
| Kho thóc | 1300 vỏ ốc, 1600 đất đá | 2600 vỏ ốc, 3200 đất đá | thêm sức chứa 4000 → 6000 → 9000 | – | 3 → 3 → 4 |
| Chòi canh | 960 vỏ ốc, 960 đất đá, 160 sắt | 1900 vỏ ốc, 1900 đất đá, 320 sắt | sát thương 19 → 24 → 30 | – | 5 → 6 → 7 |

- Máu mỗi công trình tăng thêm khoảng 10% mỗi cấp.
- Doanh trại giữ cấp 5, 38 chỗ. Số lũy tối đa 110 → 120 → 130; bẫy chông 10 → 12 → 14; đê 90 → 100 → 110; thành Cổ Loa 150 → 160 → 170, vì đất rộng hơn.
- Ở Điện 7, kho tối đa khoảng 22000 + 4 × 9000 = 58000 mỗi loại.

**Rèn binh khí** (bảng lò rèn, lò rèn phải còn nguyên)

| Bậc | Cần | Giá mỗi binh chủng | Tác dụng |
|---|---|---|---|
| 1 | lò rèn cấp 6 | 400 sắt, 400 vỏ ốc | +10% máu và sức đánh |
| 2 | lò rèn cấp 7, đã rèn bậc 1 | 900 sắt, 900 vỏ ốc | thêm +10% (cộng 20%) |

Rèn riêng cho giáo binh, cung thủ, voi chiến. Có tác dụng ở mọi trận (phó bản, giữ kinh đô), cộng thêm vào phần của Đền Phù Đổng và phúc lành Tết. Chuẩn cân bằng phó bản vẫn tính lính chưa rèn.

**Nhịp** (test mô phỏng người biết dành dụm trong `balance.test.ts`, không tính thưởng phó bản):
- sau khi lên Điện 5 còn chừng nửa giờ chương 1 thì vào chương 2; lên Điện 6 rồi còn chừng nửa giờ chương 2 thì vào chương 3;
- lúc vào mỗi chương, của dành dụm coi như đã tiêu hết (đền, lễ vật, rèn đồ, quân), nên số phút đo được là số phút sản lượng cần để lên cấp. Lần đo đầu để nguyên kho đầy thì Điện 6 chỉ mất 8 phút, vì giá nằm dưới sức chứa kho;
- đích: vào chương 2 thì **12–20 phút** lên Điện 6 (đo được 14 phút); vào chương 3 thì **25–40 phút** lên Điện 7. Với giá đề xuất ban đầu (9000 gạo, 8000 vỏ ốc, 7000 đất đá, 1500 sắt) Điện 7 mất 39 phút, sát mép trên; hạ 20% còn 34 phút.

**Dáng mới** (móng giữ nguyên số ô, cỡ không to quá 105%):

| Công trình | Cấp 6 | Cấp 7 |
|---|---|---|
| Điện Vua Hùng | hai lầu trống đồng hai bên thềm | mái ba tầng, đôi chim đồng lớn trên nóc |
| Ruộng lúa | guồng nước tre quay bên bờ ruộng | miếu thần lúa nhỏ ở góc ruộng |
| Bến chợ thuyền | một thuyền buôn lớn đậu cạnh cầu tàu | lầu chợ hai tầng mái hình thuyền |
| Nhà sàn | sàn phơi lúa và chuồng gà dưới sàn | hai nhà sàn nối nhau bằng cầu tre |
| Bãi đất đá | tời gỗ kéo đá | lò nung gạch đất bốc khói |
| Lò rèn | ống bễ da lớn và giá treo binh khí | hai lò nung, lửa đỏ rực |
| Kho thóc | thêm một vựa thóc tròn thứ hai | ba vựa quây quanh sân phơi |
| Chòi canh | chòi hai tầng, trên có nỏ lớn | lầu canh đá có cờ đỏ |

| Binh chủng | Rèn bậc 1 | Rèn bậc 2 |
|---|---|---|
| Giáo binh | đầu giáo sắt xám | thêm tua đỏ và khiên viền sắt |
| Cung thủ | mũi tên sắt, bao tên da | cung sừng, bao tên đồng |
| Voi chiến | giáp trán sắt | giáp ngà và bành có lọng |

- Đã vẽ: guồng nước ruộng cấp 6 quay thật; bến cấp 6 có thuyền buôn lớn neo cạnh cầu tàu nhấp nhô theo sóng; ruộng và bãi đất đá cấp 6–7 có 5 chỗ đứng cho người làm, bến và lò rèn 4 chỗ.
- Bản lưu lên phiên bản 8 (thêm bậc rèn của từng binh chủng).
- Lời Lạc hầu: đoạn "Vua Hùng kén rể" thêm một câu nhắc Điện có thể lên cấp 6 và lò rèn rèn binh khí; đoạn "Cột đá thề" thêm một câu nhắc Điện cấp 7. Người đã xem các đoạn ấy thì thấy nút nâng cấp như thường.

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
4. **Chương 2** (đã làm): độ cao ô đất, đắp đất, đắp nền, đê và kè đá, mùa lũ kèm thủy quái, lễ vật thách cưới, Sơn Tinh ra trận với Bốc đồi và Dời non, phó bản màn 9–16 với thuồng luồng và Thủy Tinh, cốt truyện, kết chương, Đền Tản Viên.
5. **Chương 3** (đã làm): thành Cổ Loa và số vòng thành, đêm yêu tinh phá thành, quân Triệu Đà xen với mùa lũ, An Dương Vương cầm nỏ ra trận với Nỏ thần và Rùa Vàng, phó bản màn 17–24 với gà trắng nghìn năm và Triệu Đà, cốt truyện, kết chương, Đền Cổ Loa.
6. **Sửa sau chơi thử chương 3** (đã làm): chuẩn cân bằng mới cho màn 9–24, báo tướng kiệt sức và Đền Phù Đổng hư trước khi xuất quân.
7. **Cấp 6–7 và rèn binh khí** (đã làm, xem mục Kế hoạch): Điện và 7 loại công trình lên cấp 6, 7, đất 25×25 rồi 26×26, rèn binh khí hai bậc ở lò rèn, bản lưu phiên bản 8.
8. **Tiếp theo** (đã chốt): Hội Tết bánh chưng bánh giầy.
9. **Để sau**: chương về Mỵ Châu, Trọng Thủy, có binh chủng nỏ thủ Âu Lạc.
