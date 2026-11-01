# Thời đại Văn Lang: thiết kế chương 1 tới chương 4

Tài liệu này ghi lại các quyết định đã chốt với chủ dự án. Khi cần đổi một quyết định, hãy hỏi chủ dự án trước rồi sửa tài liệu này cùng lúc với code.

## Tổng quan

- Game xây dựng chiến thuật cho một người chơi, chạy trên trình duyệt và ưu tiên điện thoại. Đăng miễn phí lên GitHub Pages. Làm cho vui, không kiếm tiền.
- Chỉ có tiếng Việt. Mọi chữ hiển thị nằm trong `src/text/vi.ts`, tách khỏi code để sau này dịch.
- Người chơi là **Vua Hùng**, xây dựng **kinh đô Phong Châu**. Lạc hầu hướng dẫn, Lạc tướng cầm quân, Bồ chính coi làng. Từ chương 3, Vua Hùng truyền ngôi cho Thục Phán; người chơi trị vì tiếp trên cùng kinh đô với tư cách **An Dương Vương**. Chương 4 kể chuyện Mỵ Châu, Trọng Thủy; hết truyện thì người chơi vẫn trông coi kinh đô, chơi tiếp (xem Kế hoạch chương 4).
- Học các cơ chế quen thuộc của thể loại xây dựng chiến thuật (như Clash of Clans, Rise of Kingdoms), nhưng luật chơi, nội dung và hình ảnh là của riêng game này, không sao chép game nào.
- Chương 1 dài khoảng 30–60 phút chơi. Chương 2, 3 và 4 nối tiếp ngay trên cùng kinh đô.

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
    - doanh trại là nhà dài để trống không vách, mái thẳng, giữa sân để trống cho tướng đứng;
    - trại giáo là lều lính mái chữ A; trại cung có lán một mái và bia rơm tròn; chuồng voi có mái chóp bốn mặt trên cột gỗ lớn;
    - lò rèn có lò nung hình nón to;
    - bến chợ thuyền có cầu tàu và sạp căng bạt;
    - bãi đất đá có hố và đống đá;
  - **mỗi cấp đổi hẳn dáng**: thêm một phần lớn nhìn thấy rõ và to dần, từ khoảng 85% ở cấp 1 lên 105% ở cấp 5, rồi 110%, 115%, 120% ở cấp 6, 7, 8.
    - Ví dụ Điện: cấp 2 thêm cờ, trống và chim đồng; cấp 3 thêm chái nhà bên; cấp 4 thêm nền đá và hàng rào; cấp 5 lợp mái hai tầng.
    - **Cấp 6, 7, 8 to mà không tràn ô**: móng giữ nguyên số ô. Cả khối phóng to nhưng tâm từng phần giữ chỗ như cấp 5 (thu tâm, `ShapeBuilder.spread`), nền và rào thu lại vừa ô; mỗi phần to ra tại chỗ. Người làm việc giữ cỡ như cấp 5. Nhà cũng cao dần (cột, sàn, mái), và mỗi cấp thêm chi tiết. Điện đã kín bốn ô nên giữ 105%, to lên bằng nền đá thứ hai dưới nhà chính, cột cao, mái rộng và vút hơn. Bến to 106%, 110%, 114%; bãi đất đá 105%, 110%, 114% so với cấp 5; chòi canh móng một ô chỉ cao lên; ruộng giữ cỡ, lúa và chòi canh ruộng cao lên.
    - **Mái theo cấp** (nhìn mái để biết cấp, chung cho mọi công trình có mái): tới cấp 5 mái tranh; cấp 6 mái tranh có sống mái và diềm mái sơn đỏ; cấp 7 mái ngói đất nung đỏ cam như ngói thành Cổ Loa; cấp 8 mái ngói, sống mái và diềm mái bọc đồng vàng. Mái nón, mái tròn thì viền là vành diềm mái và chóp mái. Lầu nỏ mái như cấp 8. Đền và bốn công trình Hội Tết giữ mái tranh.
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
  - **nhân vật có khung xương dựng bằng code** (chủ dự án duyệt qua bản thử giáo binh, rồi yêu cầu làm cho mọi nhân vật): mỗi khối hình gắn vào một xương (hông, chân, ngực, đầu, tay, đồ cầm tay; thú có thêm cổ, vòi, tai, đuôi, bánh xe), cả người vẫn là một mesh mỗi chất liệu, viền mực chạy theo động tác. Nhân vật cử động tay chân thay vì nhún và ngả cả người:
    - lính bước chân khi đi; mỗi loại vũ khí một động tác đánh: đâm giáo; giơ cao bổ xuống (qua, rìu, kiếm, chày); giương cung, buông dây, rút tên sau lưng, lắp tên; nâng nỏ ngắm, nỏ giật, hạ xuống lên dây. Người ngã ngửa, thú lăn nghiêng, ma trơi tắt dần;
    - thú đi nhịp chéo; voi giơ vòi dậm chân khi Lạc tướng đâm giáo, hổ vồ, gà xòe cánh mổ, cá sấu đớp, thuồng luồng rụt cổ rồi lao đầu; bánh chiến xa có nan, lăn khi chạy;
    - tướng giữ đủ động tác kỹ năng: Gióng quét tre một vòng, ngựa sắt phi, lửa phun ở mõm; Sơn Tinh giơ gậy quá đầu dộng xuống (dời non), thắng thì giơ cao gậy; Thủy Tinh giơ đinh ba lên trời (hô mưa); An Dương Vương chĩa nỏ thần lên trời; Lạc tướng nện dùi hai tay luân phiên;
    - dân làm việc theo nghề (cúi bổ cuốc, bổ đá, quai búa, đi mang hàng, ngồi xếp bằng gói bánh), người lái đò chèo khi thuyền đi;
    - quân ta buộc tóc bằng dải vải đỏ dưới mũ lông chim, không dùng vành đồng, để nhìn xa không lẫn với mũ trụ đồng của giặc Ân;
    - mặt quân ta và dân có đốm sáng trong mắt và má hồng; giặc và tướng có mày xếch;
    - lính, thú, dân dựng ít mặt hơn tướng cho nhẹ máy (số mặt nhân 0,7, 0,75, 0,6), nên kinh đô gần như không nặng thêm mà số lệnh vẽ giảm.
  - bảng màu: nền kem như giấy, đất vàng ô liu, nước xanh lam đục, điểm nhấn đồng, đỏ son và mực đen.
- Phong cách này được chọn qua bản dùng thử so sánh 4 phương án: khối hộp ban đầu, voxel tinh xảo, đồ chơi bo tròn, và Nét Đông Sơn. Cả bộ dùng thử được cất ở branch `prototype/phong-cach-hinh-anh`.
- Màn hình dọc, camera isometric, kéo và phóng to bằng chạm. Giao diện bằng HTML đặt đè lên cảnh 3D.
- Máy thử chính là **Samsung Galaxy Z Fold5**. Màn hình ngoài (dài, hẹp) dùng bảng trượt lên từ dưới. Màn hình trong (gần vuông) dùng bảng bên cạnh.
- Mục tiêu 60 khung hình/giây trên Fold5, ít nhất 30 trên máy Android tầm trung đời cũ. Bãi chiến tối đa khoảng 40–60 lính.
- Độ nét (pixel ratio) mặc định 1,5, không vượt quá màn hình thật, đặt lại mỗi lần đổi cỡ màn hình (mở hay gập Fold5). Cài đặt có 3 mức: Tiết kiệm (1), Vừa (1,5), Nét (2). Lựa chọn lưu riêng trên từng máy, không đi theo mã lưu.
- **Sao lưu, chuyển máy** (bảng Cài đặt). Game tự lưu trên trình duyệt. Muốn sang máy khác thì dùng một trong hai cách:
  - **tệp lưu**: bấm Tải về, hoặc Gửi qua bảng chia sẻ của điện thoại (Zalo, Messenger, Drive). Máy kia bấm Chọn tệp ở dòng Mở tệp lưu. Nút Gửi chỉ hiện trên máy chia sẻ được tệp. Tệp lưu là tệp `.txt` chứa đúng mã lưu, tên theo ngày giờ (`thoi-dai-van-lang-2026-11-01-1430.txt`);
  - **mã lưu**: chép rồi dán vào ô Nhập mã lưu.
  - Mã lưu được nén (đầu mã `TDVL2:`), ngắn hơn mã đời đầu (`TDVL1:`) chừng 4–8 lần: ván mới chừng 1.000 ký tự (trước 4.200), lên Điện 8 chừng 1.550 (trước 7.300), kinh đô xây kín chừng 4.000 (trước 31.000). Mã đời đầu vẫn nhập được. Nén bằng thư viện `fflate` vì nén xong ngay trong lúc bấm: Safari trên iPhone chỉ cho chép mã và mở bảng chia sẻ ngay lúc người chơi chạm.
  - Nạp tệp hay mã lưu thì tiến trình hiện tại bị thay bằng tiến trình trong đó.
- Hiệu ứng âm thanh ngắn tạo bằng code (Web Audio), có nút tắt tiếng. Nhạc nền để bản sau.
- TypeScript + Vite. Phần tính toán (`src/game/`) không phụ thuộc DOM hay Three.js và có test tự động bằng Vitest. GitHub Actions build, chạy test rồi đăng lên GitHub Pages.

## Bản đồ

- Lưới **72×72 ô** (từ bản lưu phiên bản 12; phiên bản 11 là 55×55, xem mục Kế hoạch: kinh đô lớn và Kế hoạch: vùng đất bên kia sông). Hai nhánh sông rộng 3 ô (ô 52–54) bao kinh đô ở phía nam và phía đông, gợi ngã ba Bạch Hạc: sông Thao phía đông chảy từ bắc xuống, đổ vào sông Đà ở góc đông nam; sông Đà chảy suốt về phía đông. Bên kia sông là bờ đông sông Thao và bờ nam sông Đà (chưa khai phá). Hai cạnh bắc và tây là rừng; hai ô ngoài cùng luôn là rừng, chỗ giặc trên bộ xuất phát.
- Điện Vua Hùng (móng 5×5) ở ô (37, 37). Lúc đầu chỉ xây được trong vùng **20×20** sát hai bờ sông. Mỗi lần Điện lên cấp thì phát rừng mở thêm đất: cạnh 20, 25, 25, 30, 35, 40, 40, 45 theo cấp 1–8 (tạm thời; PR 2 của kế hoạch kinh đô lớn đổi sang khoảnh tự chọn).
- Công trình nhiều ô có móng rộng hơn mô hình, mô hình chừa viền cỏ chừng 12% móng, nên đặt sát nhau vẫn thoáng. Ruộng kín móng hơn (95%).
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

| Công trình | Móng | Công dụng |
|---|---|---|
| Điện Vua Hùng | 5×5 | Mở rộng đất, giới hạn cấp các công trình khác |
| Nhà sàn | 3×3 | Thêm dân |
| Ruộng lúa | 4×4 | Ra gạo |
| Bến chợ thuyền | 3×3 | Ra vỏ ốc, đón thuyền buôn. Phải sát bờ sông |
| Bãi đất đá | 3×3 | Ra đất đá |
| Lò rèn | 3×3 | Ra sắt, rèn đồ cho Gióng |
| Kho thóc | 3×3 | Tăng sức chứa tài nguyên, cũng là mục tiêu của giặc |
| Doanh trại | 4×4 | Nơi các tướng ở và điều binh: giữ tổng chỗ quân, quân và tướng ra trận từ đây. Cấp 1 cho dựng trại giáo, cấp 2 trại cung, cấp 3 chuồng voi |
| Trại giáo, trại cung, chuồng voi | 3×3 | Nơi ở riêng của giáo binh, cung thủ, voi chiến. Luyện mỗi binh chủng ở nơi ở của nó (xem mục Doanh trại và nơi ở riêng) |
| Lũy tre → Thành đất | 1×1 | Tường. Lũy tre rẻ, có từ đầu. Thành đất chắc hơn, tốn đất đá, mở khóa khi Điện lên cấp |
| Chòi canh | 1×1 | Cung thủ tự bắn giặc |
| Bẫy chông tre | 1×1 | Gây sát thương cho giặc giẫm vào |
| Đền Phù Đổng | 4×4 | Có sau khi kết chương. Thêm 10% sản lượng mọi tài nguyên, thêm 10% máu và sức đánh cho quân ta |
| Đê đất → Kè đá | 1×1 | Có từ chương 2. Chặn nước lũ tràn từ sông vào |
| Đền Tản Viên | 4×4 | Có sau khi kết chương 2. Lũ dâng thấp đi một bậc |
| Thành Cổ Loa | 1×1 | Có từ chương 3. Đoạn thành đất nện cao, chắc; đắp nhiều vòng quanh Điện |
| Đền Cổ Loa | 4×4 | Có sau khi kết chương 3. Chòi canh bắn mạnh gấp rưỡi, xa thêm 1 ô |

Giá đắp nền tính theo lõi móng (bỏ viền cỏ một ô), nên giữ như trước khi móng to ra.

## Quân đội và trận đánh

- 3 binh chủng khắc chế vòng tròn, mỗi binh chủng ta khắc một loại giặc tương ứng:
  - **giáo binh** thắng quân nặng (chiến xa);
  - **voi chiến** thắng cung thủ Ân;
  - **cung thủ** thắng lính giáo Ân.
- Luyện quân tốn tiền tuyển và gạo ăn hằng phút. Lính tách riêng khỏi dân làng (xem mục Giữ kinh đô). Mỗi binh chủng luyện ở nơi ở riêng; doanh trại càng cao càng điều được nhiều quân. Luyện xong ngay.
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

  | Binh chủng | Luyện ở | Giá | Máu | Sát thương | Ghi chú |
  |---|---|---|---|---|---|
  | Giáo binh | trại giáo (cần doanh trại cấp 1) | 20 gạo, 8 vỏ ốc | 60 | 8 | không cần sắt |
  | Cung thủ | trại cung (cần doanh trại cấp 2) | 25 gạo, 8 vỏ ốc, 4 sắt | 40 | 7 | tầm bắn 3,8 ô |
  | Voi chiến | chuồng voi (cần doanh trại cấp 3) | 60 gạo, 20 vỏ ốc, 12 sắt | 200 | 15 | chiếm 3 chỗ |

  **Lính tách riêng khỏi dân làng**: tuyển thẳng ở nơi ở riêng của binh chủng, không lấy bớt người làm. Đổi lại phải trả tiền tuyển và gạo ăn: lính ăn 0,6 gạo/phút, riêng voi ăn 1,5. Chủ dự án chọn cách này sau khi chơi thử thấy không tuyển được lính vì dân đều đã vào làm. Đánh đúng thế khắc chế thì sát thương gấp đôi.
- **Giặc Ân:**

  | Loại | Máu | Sát thương | Ghi chú |
  |---|---|---|---|
  | Lính giáo | 75 | 9 | |
  | Cung thủ | 45 | 8 | tầm 3,5 ô |
  | Chiến xa | 230 | 20 | nhanh, gấp đôi sát thương lên cung thủ ta |

  - Đợt thứ n có `3 + n` lính giáo. Từ đợt 2 có `n` cung thủ, từ đợt 3 có `n − 2` chiến xa.
  - Máu giặc tăng 12% mỗi đợt.
- **Chòi canh**: tự bắn trong tầm 4,5 ô, sát thương 7–19 theo cấp.
- **Kinh đô lớn** (từ bản lưu phiên bản 11): công trình to hơn một ô mỗi chiều nên kinh đô giãn chừng 1,4 lần. Trong trận giữ kinh đô (giặc Ân, mùa lũ, đêm yêu tinh, quân Triệu), mọi tầm bắn, tốc độ, bán kính kỹ năng tính bằng ô ghi trong tài liệu này đều nhân 1,4 (`RAID_SCALE`); trận ngoài bãi giữ nguyên. Giặc trên bộ xuất phát ở chỗ cách sông xa như trước nhân 1,4, nhưng luôn ở ngoài vùng đã khai phá; bỏ chạy qua lại vạch ấy là thoát.
- **Bẫy chông**: gây 45 sát thương cho giặc giẫm vào, mỗi đợt dùng một lần.
- **Lịch giặc** (theo đồng hồ chơi):
  - Đợt đầu đến 4 phút sau khi có doanh trại, sau đó 15 phút một đợt.
  - Trinh sát báo trước 60 giây, kèm hướng tới (cạnh rừng phía Bắc hoặc phía Tây), có dải đỏ nhấp nháy ở bìa rừng.
  - Nút "Nghênh chiến ngay" trong doanh trại gọi giặc tới sớm.
- **Trận đánh**:
  - Giặc tìm đường (A* 8 hướng) tới kho trước, rồi tới Điện. Lũy và công trình chắn đường thì giặc phá. Lũy có chỗ hở thì giặc đi vòng.
  - Quân ta và tướng ra từ doanh trại, đánh giặc gần nhất. Chòi canh bắn, bẫy chông đâm.
  - Quá 3 phút thì giặc rút.
- **Hậu quả**:
  - Giặc phá được kho thì cướp 15% mỗi loại tài nguyên, phá được Điện thì cướp 8%, rồi bỏ chạy.
  - Công trình bị phá thì hư hỏng: không làm ra gì, không chắn đường. Sửa tốn 30% giá.
  - Lính tử trận mất hẳn.
  - Thắng (diệt hết, không mất của) mới tính là giữ được kinh đô.
- Độ khó đo bằng test: đợt 1 cần khoảng 6 giáo binh và 1 chòi canh để thắng. Đợt 4 trở đi cần cung thủ, voi, lũy và nhiều chòi hơn.

### Doanh trại và nơi ở riêng của binh chủng (chủ dự án yêu cầu, đã làm)

Chủ dự án đổi: doanh trại là nơi các tướng ở; mỗi binh chủng có nơi ở riêng và luyện ở đó; điều binh vẫn phải qua doanh trại. Chủ dự án chọn hai phương án khuyên dùng: doanh trại giữ tổng chỗ quân như cũ, và tướng về đứng ở doanh trại.

- **Doanh trại** giữ nguyên giá, cấp và sức chứa (8, 14, 20, 28, 38 chỗ, tính chung mọi binh chủng). Không có doanh trại thì không luyện được, không đánh phó bản được. Nút "Nghênh chiến ngay" vẫn ở doanh trại.
- **Nơi ở riêng**: móng 3×3, dựng một lần, không lên cấp (mái tranh), không dỡ được, dời được như công trình khác. Còn nguyên mới luyện được; hư thì phải sửa trước. Lính đã luyện vẫn ra trận dù nơi ở hư.

  | Nơi ở | Binh chủng | Cần | Giá dựng | Máu |
  |---|---|---|---|---|
  | Trại giáo | giáo binh | Điện cấp 2, doanh trại cấp 1 | 40 gạo, 30 vỏ ốc, 30 đất đá | 300 |
  | Trại cung | cung thủ | Điện cấp 2, doanh trại cấp 2 | 60 gạo, 50 vỏ ốc, 50 đất đá, 10 sắt | 300 |
  | Chuồng voi | voi chiến | Điện cấp 3, doanh trại cấp 3 | 120 gạo, 80 vỏ ốc, 100 đất đá, 20 sắt | 400 |

  Giá nhỏ hơn doanh trại để không làm chậm nhịp chương 1; người chơi mô phỏng ở `balance.test.ts` không luyện quân nên nhịp lên Điện không đổi.
- **Tướng ở doanh trại**:
  - Gióng đã thành tráng sĩ, Sơn Tinh đã rước Mị Nương thì đứng giữa sân doanh trại. Gióng lúc nhỏ vẫn ở trước Điện cho dân nuôi; Sơn Tinh lúc cầu hôn vẫn đứng trên mỏm đá trước Điện. An Dương Vương là vua, vẫn đứng trước Điện cạnh cột đá thề. Chưa có doanh trại thì tướng đứng trước Điện như cũ;
  - khi giữ kinh đô, tướng ra trận cùng quân từ sân trước doanh trại (chưa có doanh trại thì từ trước Điện). Vì thế nên đặt doanh trại gần chỗ giặc hay lũ tới: test mùa lũ bậc 3 đặt doanh trại trong đê, gần phía sông như mẫu Đê bao; doanh trại ở góc rừng xa sông thì thủy quái kịp phá đê.
- **Bảng doanh trại**: số chỗ quân; mục **Tướng ở doanh trại** (Lạc tướng cầm quân mọi trận; Gióng, Sơn Tinh, An Dương Vương khi đã cùng ra trận, kèm trạng thái sẵn sàng, kiệt sức bao lâu hay hiển linh, và nút Xem mở bảng tướng); mục **Quân và nơi ở** (mỗi binh chủng: số lính, nút tới nơi ở, hoặc nút dựng nơi ở kèm giá khi chưa có); lịch đợt giặc và nút Nghênh chiến ngay.
- **Bảng nơi ở**: số chỗ quân trong doanh trại, dòng binh chủng ấy với số lính, binh khí đã rèn và nút Luyện kèm giá.
- **Dáng**: trại giáo có lều lính mái chữ A, giá giáo đồng, hai cọc rơm tập đâm và một giáo binh đâm thử; trại cung có lán một mái tựa vách phên, giá cung, bao tên, bia rơm tròn vòng đỏ trắng có tên găm và một cung thủ nhắm bia; chuồng voi có bốn cột lớn đỡ mái chóp bốn mặt, rào gỗ, máng nước, đống cỏ, cọc buộc voi và một voi chiến đang ăn cỏ. Doanh trại bỏ cọc rơm tập đâm ở cấp 2 (đã sang trại giáo), thay bằng đài tướng có chiếu và lọng đỏ; giữa sân để trống cho tướng đứng.
- **Mẫu kinh đô**: cả ba mẫu có chỗ cho ba nơi ở, sát doanh trại. Áp mẫu chỉ dựng nơi ở khi doanh trại đủ cấp; doanh trại dựng theo mẫu tính là cấp 1, nên trại giáo dựng được cùng lúc.
- **Nhiệm vụ** giữ nguyên thứ tự. Lời Lạc hầu ở nhiệm vụ doanh trại nói dựng cho Lạc tướng ở và điều binh; nhiệm vụ luyện 5 lính nhắc dựng trại giáo trước.
- **Bản lưu** không đổi phiên bản. Bản lưu cũ giữ nguyên lính đã luyện; muốn luyện thêm thì dựng nơi ở (bảng doanh trại có nút dựng).
- Lính nỏ ở chương 4 cũng sẽ có nơi ở riêng (xem PR 2 chương 4).

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
- **Gióng ở kinh đô**: đứng trước Điện, đổi dáng theo mốc gạo: cậu bé lên ba ngồi bệt trên chiếu, thiếu niên đứng ôm bát cơm đầy cạnh chồng bát đã ăn (từ mốc 2), tráng sĩ cưỡi ngựa sắt. Thành tráng sĩ thì về ở doanh trại (xem mục Doanh trại và nơi ở riêng). Chạm vào Gióng, vào chip trên thanh trên, hoặc nút trong bảng Điện, bảng lò rèn, để mở bảng Gióng.
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
  - khi giặc đánh kinh đô, Gióng ra từ doanh trại (chưa có doanh trại thì từ trước Điện).
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
  - Mở công trình **Đền Phù Đổng** (4×4, dựng một lần, 600 gạo, 600 vỏ ốc, 500 đất đá, 150 sắt).
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
- Sơn Tinh ra trận từ doanh trại (nếu đang kiệt sức thì Gióng hiển linh ra thay).
- **Giữ được mùa lũ** khi diệt hết thủy quái, không bị cướp, không công trình nào bị ngập.
- Độ khó đo bằng test: đê liền dải, năm chòi canh sát đê, quân mẫu và Sơn Tinh bấm kỹ năng giữ được mùa lũ bậc 3 mà không công trình nào ngập, đê không vỡ. Đê đất không có chòi canh gần thì thường vỡ từ mùa 7.
  - Từ khi tướng ra trận từ doanh trại, test đặt doanh trại trong đê gần phía sông. Quân tới sớm nên thủy quái chết trước khi nước kịp dâng hết bậc 3; test vẫn canh riêng đê liền dải giữ khô vùng trong đê ở bậc 3.

### Thủy quái

| Loại | Máu | Sát thương | Ghi chú | Quân ta khắc chế |
|---|---|---|---|---|
| Tôm binh | 85 | 10 | cầm giáo | cung thủ |
| Cá phun nước | 50 | 9 | phun nước xa 3,6 ô | voi chiến |
| Cá sấu | 260 | 22 | lao nhanh, gấp đôi sát thương lên cung thủ ta | giáo binh |
| Thuồng luồng (trùm màn 12) | 750 | 26 | | |
| Thủy Tinh (trùm màn 16) | 1400 | 32 | đứng trên ngọn sóng, cầm đinh ba; có hai phép (xem dưới) | |

Vòng khắc chế của quân ta giữ nguyên: giáo binh thắng quân nặng, cung thủ thắng lính bộ, voi thắng quân bắn xa.

**Phép của Thủy Tinh** (chủ dự án chọn có cả hai, thêm sau khi chơi thử; số ở `TT_WAVE`, `TT_SUMMON`):
- **Hô mưa gọi gió**: lần đầu sau 6 giây, rồi cứ 12 giây, nếu quân ta trong tầm 8 ô. Một con sóng quét dải dài 6 ô, rộng 2,6 ô từ Thủy Tinh về phía quân ta gần nhất. Ai trúng mất 30 máu, bị đẩy lùi 1,4 ô, đi chậm còn nửa tốc độ trong 3 giây.
- **Gọi thủy quái**: lần đầu sau 9 giây, rồi cứ 15 giây, gọi 3 tôm binh từ dưới nước lên quanh mình, khỏe như tôm binh của màn; tối đa 4 lần (12 con) mỗi trận.
- Thêm hai phép thì màn 16 khó hơn hẳn: hạ máu giặc từ ×2,4 xuống ×1,8. Đo bằng test: người chơi thường có Sơn Tinh thắng ở cả ×1,9 (dư một bậc); không tướng, hay nửa quân, chơi giỏi vẫn thua.

### Lễ vật và Sơn Tinh

- Chạm vào Sơn Tinh (lúc cầu hôn đứng trên mỏm đá trước Điện, rước Mị Nương rồi thì ở doanh trại), vào chip ⛰️ trên thanh trên, hoặc nút trong bảng Điện, bảng doanh trại, để mở bảng Sơn Tinh.

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
  - Mở **Đền Tản Viên** (4×4, dựng một lần, 1500 gạo, 1500 vỏ ốc, 1500 đất đá, 400 sắt): nền đá ba bậc, ba ngọn núi Ba Vì sau lưng, tượng Sơn Tinh trước sân. Đền còn nguyên thì lũ dâng thấp đi một bậc.
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
  | 16 | Đỉnh Tản Viên | 12 tôm, 8 cá phun, 3 cá sấu, Thủy Tinh | ×1,8 | cần Sơn Tinh; Thủy Tinh có hai phép |

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
  - Mở **Đền Cổ Loa** (4×4, dựng một lần, 2500 gạo, 2500 vỏ ốc, 2500 đất đá, 700 sắt). Đền còn nguyên thì chòi canh bắn mạnh gấp rưỡi và xa thêm 1 ô.
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

## Kế hoạch: kinh đô lớn tiếp và Hội Tết (đã chốt, đã làm)

Chủ dự án đã chốt qua một buổi hỏi đáp. Vấn đề: từ cuối chương 1 mọi công trình đã ở cấp 5, kinh đô hết việc để xây, kho chạm trần. Mục tiêu là để kinh đô tiếp tục lớn qua các chương. Làm thành ba PR theo thứ tự:

1. **Sửa lỗi và cân bằng lại** (mục Chuẩn cân bằng phó bản ở trên).
2. **Cấp 6–7 và rèn binh khí**:
   - Điện Vua Hùng lên cấp 6 khi vào chương 2, cấp 7 khi vào chương 3. Người đang ở chương sau thì mở ngay;
   - đất mở ra 25×25 ở cấp 6, 26×26 ở cấp 7, chừa một hàng rừng cho giặc trên bộ hiện ra (kinh đô lớn: 40×40 ở cả hai cấp);
   - ruộng, bến chợ thuyền, nhà sàn, bãi đất đá, lò rèn, kho thóc, chòi canh lên được cấp 6, 7. Lũy, đê, thành Cổ Loa giữ cấp riêng;
   - mỗi cấp mới vẫn đổi hẳn dáng: thêm một phần lớn nhìn rõ (ví dụ ruộng cấp 6 có guồng nước, cấp 7 có miếu thần lúa); ban đầu cỡ giữ 105%, sau chủ dự án yêu cầu to thêm (xem mục Phong cách);
   - **doanh trại giữ 38 chỗ**, không lên thêm cấp, vì bãi chiến tối đa khoảng 60 người;
   - **rèn binh khí** ở bảng lò rèn: giáo, cung, voi mỗi loại 2 bậc (bậc 1 cần lò rèn cấp 6, bậc 2 cần cấp 7), mỗi bậc thêm 10% máu và sức đánh ở mọi trận, lính đổi dáng vũ khí;
   - nhịp: người biết dành dụm lên Điện 6 trước màn 12, Điện 7 trước màn 20; canh bằng test như `balance.test.ts`.
3. **Hội Tết bánh chưng bánh giầy**:
   - mở khi kết chương 1 (người đang ở chương 2, 3 mở ngay). Lạc hầu kể chuyện Lang Liêu như chuyện xưa, trước "Vua Hùng kén rể"; chỉ là truyện, không có trò thi tính điểm;
   - công trình mới, cần dân làm: **ruộng nếp** (4×4), **vườn** đậu xanh và lá dong (3×3), **chuồng lợn** (3×3, lợn không ăn gạo), **bếp gói bánh** (3×3);
   - bếp làm bánh chưng nhanh bằng nguồn chậm nhất trong ba nguồn, bánh giầy chỉ cần nếp. Nguyên liệu không tích trữ; bảng bếp báo nguồn nào đang thiếu;
   - bánh tích trữ được, chỉ hiện trong bảng bếp và bảng Tết, không thêm chip trên thanh trên;
   - **Tết** khoảng 20 phút chơi một lần, mở 3 phút để dâng bánh; đang có giặc hay mùa lũ thì lùi tới khi xong trận; lần đầu 2 phút sau truyện. Lỡ Tết thì không có phúc lành, bánh vẫn còn;
   - dâng đủ bánh chưng được **phúc lành Đất** (mọi tài nguyên thêm khoảng 15%), đủ bánh giầy được **phúc lành Trời** (quân ta thêm khoảng 10% máu và sức đánh), kéo dài tới Tết sau, cộng thêm vào phần của các đền;
   - cảnh Tết: cây nêu trước Điện, cờ hội, dân quây quần gói bánh quanh bếp, mâm bánh trước Điện khi dâng; không có pháo.
- Không chèn nhiệm vụ Lạc hầu mới (để khỏi dời chỉ số nhiệm vụ của người đang chơi): Hội Tết dẫn bằng truyện Lang Liêu, cấp 6–7 và rèn binh khí dẫn bằng lời Lạc hầu ở các đoạn truyện mở chương.
- Mọi con số (giá, sản lượng, chỗ làm, số công trình tối đa, giá rèn, nhịp Tết) và dáng từng công trình được ghi vào tài liệu này để chủ dự án duyệt **trước khi** làm code của PR 2, PR 3.
- Binh chủng thứ tư (nỏ thủ Âu Lạc) để dành cho chương 4. Nay là **lính nỏ** (xem Kế hoạch chương 4).

### PR 2: cấp 6–7 và rèn binh khí (chủ dự án đã duyệt, đã làm)

Giá mỗi cấp mới khoảng gấp đôi cấp trước; sản lượng mỗi cấp tăng khoảng 35%. Chủ dự án cho chỉnh trong khoảng ±20% để khớp nhịp đo bằng test; bảng dưới là số cuối cùng.

**Điện Vua Hùng**

| Cấp | Mở khi | Giá nâng | Đất | Sức chứa kho | Chỗ ở | Gạo, vỏ ốc /phút | Máu |
|---|---|---|---|---|---|---|---|
| 6 | vào chương 2 | 4000 gạo, 4000 vỏ ốc, 3000 đất đá, 600 sắt | 40×40 | 14000 | 9 | 14, 7 | 1600 |
| 7 | vào chương 3 | 7200 gạo, 6400 vỏ ốc, 5600 đất đá, 1200 sắt | 40×40 | 22000 | 10 | 16, 8 | 1800 |

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
- Doanh trại giữ cấp 5, 38 chỗ. Số lũy tối đa 150 → 170 → 180; bẫy chông 10 → 12 → 14; đê 130 → 140 → 150; thành Cổ Loa 220 → 230 → 240, vì đất rộng hơn (số của kinh đô lớn: lũy, đê, thành nhiều hơn chừng 40% vì vòng quanh kinh đô dài hơn; thành 220 từ đầu để ba vòng của mẫu Cổ Loa dựng được ngay ở Điện 5).
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

**Dáng mới** (móng giữ nguyên số ô; cỡ ban đầu giữ 105%, nay 110%, 115% ở cấp 6, 7, xem mục Phong cách):

| Công trình | Cấp 6 | Cấp 7 |
|---|---|---|
| Điện Vua Hùng | hai lầu trống đồng hai bên thềm; nền đá thứ hai dưới nhà chính, lan can đỏ hoa văn quanh hiên | mái ba tầng, đôi chim đồng lớn trên nóc; hai cột chim Lạc đai đồng ở hai góc sau nền |
| Ruộng lúa | guồng nước tre quay bên bờ ruộng, bờ ruộng kè đá; chòi canh ruộng cao có thang tre | miếu thần lúa ở góc ruộng |
| Bến chợ thuyền | một thuyền buôn lớn đậu cạnh cầu tàu; cổng bến có mái ở đầu cầu tàu, cờ đuôi nheo hai cột | lầu chợ hai tầng mái hình thuyền |
| Nhà sàn | sàn phơi lúa và chuồng gà dưới sàn; cây cau cao góc vườn | hai nhà sàn nối nhau bằng cầu tre |
| Bãi đất đá | tời gỗ kéo đá, lán che bánh xe tời; chồng đá xẻ cao thêm mỗi cấp | lò nung gạch đất bốc khói |
| Lò rèn | ống bễ da lớn, lán cao hơn che giá treo binh khí; lò chính to hơn, khói bốc từ ống lò | hai lò nung, lửa đỏ rực |
| Kho thóc | thêm một vựa thóc tròn thứ hai | ba vựa quây quanh sân phơi; cót cao hơn |
| Chòi canh | chòi hai tầng, trên có nỏ lớn gác qua lan can (cánh nỏ đồng, mũi tên sắt) | lầu canh đá có cờ đỏ |

| Binh chủng | Rèn bậc 1 | Rèn bậc 2 |
|---|---|---|
| Giáo binh | đầu giáo sắt xám | thêm tua đỏ và khiên viền sắt |
| Cung thủ | mũi tên sắt, bao tên da | cung sừng, bao tên đồng |
| Voi chiến | giáp trán sắt, giáp sườn sắt viền đồng (nhìn từ sau lưng cũng thấy) | giáp ngà và bành có lọng |

- Đã vẽ: guồng nước ruộng cấp 6 quay thật; bến cấp 6 có thuyền buôn lớn neo cạnh cầu tàu nhấp nhô theo sóng; ruộng và bãi đất đá cấp 6–7 có 5 chỗ đứng cho người làm, bến và lò rèn 4 chỗ. Người làm rải khắp ruộng; thợ đá mỗi người đứng một cột theo hướng camera để khỏi che nhau.
- Từ Điện cấp 6, tướng đứng trước Điện (Sơn Tinh lúc cầu hôn, An Dương Vương cùng cột đá thề) ra đứng hẳn bên phải nền Điện, để khỏi che lầu trống bên phải.
- Chụp ở cỡ thật trên điện thoại thì các phần thêm ở cấp 6, 7 quá nhỏ, cùng màu tranh nên khó biết cấp. Chủ dự án yêu cầu công trình cấp cao có ngoại hình rõ hơn, nên thêm **mái theo cấp** (xem mục Phong cách): cấp 6 viền đỏ, cấp 7 mái ngói, cấp 8 viền đồng vàng. Ruộng ít mái nên từ cấp 6 bờ kè đá xám; guồng nước to thêm khoảng 30%, miếu thần lúa to thêm khoảng 30%. Bãi đất đá không có mái nên từ cấp 6 có lán che bánh xe tời, mái theo cấp.
- Chủ dự án yêu cầu thêm: không chỉ đổi màu, công trình cấp cao phải to hơn và nhiều chi tiết hơn. Nên cấp 6, 7, 8 to 110%, 115%, 120% mà không tràn ô (xem mục Phong cách), nhà cao dần theo cấp (cột nhà sàn, vựa, lán lò rèn, chòi canh, chòi canh ruộng, lúa), và mỗi cấp thêm chi tiết ghi trong hai bảng dáng. Chủ dự án đã duyệt cả mái theo cấp lẫn cỡ và chi tiết mới.
- Bản lưu lên phiên bản 8 (thêm bậc rèn của từng binh chủng).
- Lời Lạc hầu: đoạn "Vua Hùng kén rể" thêm một câu nhắc Điện có thể lên cấp 6 và lò rèn rèn binh khí; đoạn "Cột đá thề" thêm một câu nhắc Điện cấp 7. Người đã xem các đoạn ấy thì thấy nút nâng cấp như thường.

### PR 3: Hội Tết bánh chưng bánh giầy (chủ dự án đã duyệt, đã làm)

Con số và dáng dưới đây chủ dự án đã duyệt trước khi viết code. Những chỗ **in đậm có dấu (mới)** là quyết định thêm ngoài buổi hỏi đáp, cũng đã được duyệt.

**Mở khóa và truyện**

- Kết chương 1 (Gióng về trời) thì Lạc hầu kể **chuyện Lang Liêu**, ngay sau đoạn "Gióng về trời", trước "Vua Hùng kén rể". Người đang ở chương 2, 3 thấy đoạn này ngay khi mở game.
- Truyện: Hùng Vương thứ 6 muốn truyền ngôi, bảo các lang tìm lễ vật cúng Tiên vương. Lang Liêu nghèo, chỉ có lúa gạo, được thần mách rằng trong trời đất không gì quý bằng hạt gạo. Chàng làm bánh vuông tượng đất, bánh tròn tượng trời, lá bọc ngoài, nhân ở trong. Vua chọn bánh của Lang Liêu, truyền ngôi cho chàng, từ đó Tết có bánh chưng bánh giầy. Lạc hầu kết: kinh đô ta cũng mở hội Tết, dâng bánh chưng thì đất cho mùa màng tốt hơn, dâng bánh giầy thì trời phù hộ quân ta.
- Chỉ là truyện, không có trò thi tính điểm. Không thêm nhiệm vụ Lạc hầu.

**Bốn công trình mới**

Cả bốn cần dân làm, mở sau truyện Lang Liêu, cần Điện cấp 3. **Mỗi loại có 3 cấp (mới)**: cấp 2 cần Điện cấp 5, cấp 3 cần Điện cấp 6. Mỗi cấp đổi hẳn dáng.

| Công trình | Ô | Giá dựng | Lên cấp 2 | Lên cấp 3 | Chỗ làm (cấp 1 → 2 → 3) | Làm ra mỗi phút (cấp 1 → 2 → 3) | Tối đa ở Điện 3–4 / 5 / 6–7 |
|---|---|---|---|---|---|---|---|
| Ruộng nếp | 4×4 | 300 vỏ ốc, 150 đất đá | 900 vỏ ốc, 500 đất đá | 2500 vỏ ốc, 1500 đất đá | 2 → 3 → 3 | nếp đủ cho 2 → 3 → 4 cái bánh | 1 / 2 / 2 |
| Vườn đậu xanh, lá dong | 3×3 | 200 gạo, 150 vỏ ốc | 600 gạo, 450 vỏ ốc | 1800 gạo, 1300 vỏ ốc | 1 → 2 → 2 | đậu và lá đủ cho 1 → 1,5 → 2 cái bánh chưng | 1 / 1 / 2 |
| Chuồng lợn | 3×3 | 250 gạo, 200 đất đá | 750 gạo, 600 đất đá | 2200 gạo, 1800 đất đá | 1 → 1 → 2 | thịt đủ cho 1 → 1,5 → 2 cái bánh chưng | 1 / 1 / 2 |
| Bếp gói bánh | 3×3 | 200 vỏ ốc, 250 đất đá, 40 sắt | 600 vỏ ốc, 750 đất đá, 120 sắt | 1800 vỏ ốc, 2200 đất đá, 350 sắt | 2 → 2 → 3 | gói tối đa 2 → 3 → 4 bánh chưng, giã tối đa 2 → 3 → 4 bánh giầy | 1 / 1 / 1 |

- Lợn không ăn gạo. Thiếu người làm thì làm ra ít đi theo tỉ lệ, như ruộng lúa. Thiếu gạo hay vắng mặt thì chậm lại như mọi công trình khác.
- Nguyên liệu không tích trữ: chỉ tính theo mỗi phút.
- **Cách bếp chia nếp (mới):** bếp gói bánh chưng trước, nhanh bằng nguồn chậm nhất trong ba nguồn nếp, đậu lá, thịt lợn (và không quá sức bếp). **Nếp còn thừa** thì giã bánh giầy (không quá sức bếp). Ví dụ đủ bộ cấp 1: nếp 2, đậu lá 1, thịt 1, nên mỗi phút được 1 bánh chưng, nếp thừa 1 giã được 1 bánh giầy. Muốn nhiều bánh giầy hơn thì cấy thêm ruộng nếp.
- Bảng bếp báo nguồn nào đang thiếu. Ví dụ "Thiếu thịt lợn: bánh chưng chỉ được 1 cái mỗi phút". Nhiều nguồn cùng chậm nhất thì báo hết. Nguyên liệu đủ mà bếp làm hết sức thì báo nâng bếp.
- Bánh để trên gác bếp, tích trữ được. **Gác bếp chứa tối đa 30 → 45 → 60 cái mỗi loại theo cấp bếp (mới)**. Bánh chỉ hiện trong bảng bếp và bảng Tết, không thêm chip trên thanh trên.

**Tết**

- Tết khoảng 20 phút chơi một lần, tính từ lúc Tết trước mở. Mỗi lần mở 3 phút để dâng bánh.
- Lần đầu: 2 phút sau truyện Lang Liêu.
- Tới giờ mà đang có giặc, lũ, yêu tinh, quân Triệu, hay đang đánh phó bản, thì lùi tới khi xong trận. Vắng mặt thì Tết chờ người chơi quay lại mới mở.
- **Tết đang mở mà giặc tới thì vẫn dâng được (mới)**. Dâng chỉ là bấm nút.
- **Số bánh cần dâng lớn dần theo kinh đô (mới)**, để nâng cấp và dựng thêm bốn công trình mới có ích:

  | Điện | 3–4 | 5 | 6 | 7 |
  |---|---|---|---|---|
  | Bánh chưng cần dâng | 12 | 20 | 30 | 40 |
  | Bánh giầy cần dâng | 12 | 20 | 30 | 40 |

  **Tết đầu tiên chỉ cần 3 mỗi loại (mới)**, vì mới có 2 phút chuẩn bị.
- Dâng riêng từng loại, mỗi loại một nút. Dâng thì trừ đúng số bánh cần dâng.
- Dâng đủ bánh chưng được **phúc lành Đất**: mọi tài nguyên làm ra thêm 15%. Dâng đủ bánh giầy được **phúc lành Trời**: quân ta thêm 10% máu và sức đánh, cả khi giữ kinh đô lẫn ngoài phó bản.
- Phúc lành cộng thêm vào phần của Đền Phù Đổng (đền thêm 10% cả hai thứ) và của binh khí đã rèn.
- Phúc lành kéo dài tới khi Tết sau đóng. Tết sau dâng tiếp thì nối liền. Lỡ Tết thì hết phúc lành, nhưng bánh vẫn còn.
- Đo bằng test: có Đền và phúc lành Trời (quân thêm 20%), người chơi giỏi đánh màn 9 không cần tướng cũng thắng, màn 17 nửa quân thắng 2 trong 3 lần; 14 màn còn lại vẫn thua như chuẩn. Chuẩn cân bằng phó bản giữ nguyên (đo không có phúc lành): phúc lành là phần thưởng cho người dâng bánh.

**Nhịp, đo bằng test**: với bộ công trình nên có ở mỗi mức Điện, số bánh cần dâng phải làm xong trong khoảng 15 phút, chừa 5 phút cho lúc đánh nhau hay quên xếp người.

| Điện | Bộ nên có | Mỗi phút (chưng, giầy) | Đủ số cần dâng sau | Người làm |
|---|---|---|---|---|
| 3–4 | 1 ruộng nếp, 1 vườn, 1 chuồng, 1 bếp, đều cấp 1 | 1, 1 | 12 phút | 6 |
| 5 | thêm ruộng nếp thứ hai; cả bốn loại lên cấp 2 | 1,5, 3 | 13,3 phút | 11 |
| 6 | mỗi loại một cái, đều cấp 3 | 2, 2 | 15 phút | 10 |
| 7 | 2 ruộng nếp, 2 vườn, 2 chuồng, 1 bếp, đều cấp 3 | 4, 4 | 10 phút | 17 |

- Dân rảnh khi mọi công trình cũ đủ người: khoảng 3 người ở Điện 4, 10 ở Điện 5, 5 ở Điện 6, 25 ở Điện 7. Vì vậy ở Điện 4 và Điện 6 phải rút vài người từ công trình khác.
- Đổi lại thì được: phúc lành Đất ở Điện 6 thêm khoảng 375 tài nguyên mỗi phút, còn 5 người làm ruộng lúa cấp 6 chỉ ra khoảng 150 gạo mỗi phút.

**Giao diện**

- Bảng bếp có các mục sau:
  - mỗi phút có bao nhiêu nếp, đậu lá, thịt, nguồn nào đang thiếu;
  - mỗi phút làm được bao nhiêu bánh chưng, bánh giầy;
  - bánh đang có, so với số cần dâng ở Tết tới;
  - còn bao lâu tới Tết;
  - phúc lành đang có.
- Tết mở thì có băng báo "Tết đến, dâng bánh trước Điện", kèm chip 🎋 đếm ngược trên thanh trên (chỉ hiện lúc Tết mở). Chạm vào chip mở bảng Tết, có hai nút dâng bánh chưng, dâng bánh giầy.
- Bảng Điện ghi phúc lành đang có. Sản lượng mỗi phút trên thanh trên đã gồm phúc lành Đất.

**Dáng công trình** (cỡ không quá 105%)

| Công trình | Cấp 1 | Cấp 2 | Cấp 3 |
|---|---|---|---|
| Ruộng nếp | khóm lúa nếp bông trĩu màu ngà, khác hàng lúa nhọn vàng của ruộng lúa | lúa dày hơn, bù nhìn rơm đội nón giữa ruộng | giàn tre phơi bó nếp bên bờ |
| Vườn đậu xanh, lá dong | hai luống đậu xanh thấp, một khóm lá dong lá to bản | thêm giàn tre cho đậu leo, chum nước tưới | rào tre quanh vườn, lều nhỏ có nong đậu phơi |
| Chuồng lợn | rào tre thấp, hai con lợn ỉ đen bụng phệ, máng gỗ | chuồng có mái tranh, thêm đàn lợn con | chuồng sàn gỗ, vũng bùn, bốn con lợn |
| Bếp gói bánh | kiềng ba hòn đá, nồi đồng to luộc bánh, lửa củi, chồng lá dong | thêm mái tranh che bếp, chõng tre có khuôn gói bánh | thêm cối đá chày gỗ giã bánh giầy, nồi thứ hai, khói bếp |

- Người làm: ruộng nếp và chuồng lợn là nhà nông, vườn và bếp là phụ nữ.
- Cảnh Tết, chỉ lúc Tết mở:
  - cây nêu trước Điện: cây tre cao, ngọn còn chùm lá, treo dải vải đỏ và khánh đất nung;
  - dây cờ hội nhiều màu căng từ cây nêu tới Điện;
  - thêm một người ngồi xếp bằng ở mép chiếu gói bánh trước bếp (bếp đã có 2–3 người làm, thêm nữa thì chật);
  - dâng rồi thì có mâm bánh chưng vuông, bánh giầy tròn bày trước thềm Điện tới hết Tết;
  - cây nêu và mâm bánh đứng ngoài móng Điện: ô ấy có công trình khác (kể cả lũy, thành) thì không dựng, dây cờ căng thẳng giữa hai cột cờ của Điện;
  - không có pháo.
- Dáng đã chỉnh sau khi chụp thử: lợn con chạy ngoài sân theo mẹ (không khuất dưới mái chuồng), mái bếp dựng cao và nồi bánh dời ra trước cho thấy nồi, lá dong là lá thuôn dài trên cuống cao (không chụm tròn như bắp cải).

**Bản lưu phiên bản 9**: thêm phần Tết (Tết thứ mấy, lúc Tết tới, Tết mở tới khi nào, bánh đang có, Tết này đã dâng gì, phúc lành đang có). Bản lưu cũ được thêm phần này. Người đã qua kết chương 1 sẽ thấy truyện Lang Liêu, rồi 2 phút sau tới Tết đầu.

**Test**:
- tính bánh: nguồn chậm nhất, nếp thừa ra bánh giầy, sức bếp, gác bếp đầy, thiếu người;
- hẹn Tết, lùi khi có trận, Tết chờ khi vắng mặt;
- phúc lành kéo dài tới khi Tết sau đóng, lỡ Tết thì mất;
- phúc lành cộng vào sản lượng và vào trận;
- nhịp theo bảng trên;
- nâng bản lưu 8 lên 9.

## Xoay cảnh, dời công trình, mẫu kinh đô (thêm sau chơi thử Hội Tết)

Chủ dự án đã chọn qua bốn câu hỏi: Thủy Tinh có cả hai phép (xem mục Thủy quái), xoay cảnh 4 hướng, dời công trình mất phí, áp mẫu thì dời và dựng đủ.

**Xoay cảnh**
- Có nút ⟳ trên màn hình kinh đô. Mỗi lần bấm, góc nhìn xoay 90°, có 4 hướng nhìn chéo, chuyển mượt.
- Vuốt hai ngón theo vòng tròn cũng xoay theo nấc 90°, không xoay tự do, để hình vẽ luôn đúng góc đẹp và lưới ô không xiên.
- Bãi chiến phó bản không xoay.

**Dời công trình**
- Chạm công trình, bấm ↔ Dời, chọn chỗ mới như khi dựng, rồi bấm Dời tới đây.
- Mỗi lần dời tốn 10% giá dựng của công trình ấy (làm tròn lên; `MOVE_FRACTION`).
- Giữ nguyên cấp, người làm, hư hỏng.
- Không dời được Điện Vua Hùng. Không dời được lúc đang có giặc, lũ (kể cả lúc trinh sát báo).
- Nền đất cũ ở lại chỗ cũ. Chỗ mới dân đắp móng phẳng bằng ô cao nhất dưới móng như khi dựng mới; đã đắp nền cao hơn thì phải đắp lại.

**Mẫu kinh đô** (`src/game/mau.ts`, bản vẽ từng ô ngay trong code)
- Mỗi chương mở một mẫu:

  | Mẫu | Mở khi | Vẽ cho | Nét chính |
  |---|---|---|---|
  | Kinh đô Phong Châu | từ đầu | Điện cấp 5 | ruộng quanh Điện và dọc bờ sông, nhà sàn và kho gần Điện, bãi đá trên đồi phía bắc; lũy tre bao hai mặt rừng (67 đoạn), 10 bẫy chông trước lũy |
  | Đê bao chống lũ | vào chương 2 | Điện cấp 6 | đê liền dải dọc hai bờ sông, cách sông 3 ô (73 đoạn), bến ngoài đê, chòi canh sát đê; ruộng, đền, ruộng nếp trong đê |
  | Thành Cổ Loa | vào chương 3 | Điện cấp 7 | ba vòng thành kín quanh Điện (216 đoạn); vòng trong chỉ có Điện và sân; nhà sàn, kho, lò rèn, bếp giữa các vòng; ruộng, đền, doanh trại ngoài vòng ngoài; đê bao ngoài cùng |

  Từ bản lưu phiên bản 11, ba mẫu vẽ cho kinh đô lớn (lưới 55×55, móng to hơn một ô): giữa các khối nhà chừa lối đi một ô, trước Điện chừa sân. Bản vẽ ghi góc gốc của nó, không phải vẽ cả lưới.

- Vòng thành Cổ Loa trong mẫu là vòng kín quanh Điện, không chạm sông: thành không chặn nước như đê, nên vòng nào cắt ngang dải đê để chạm sông sẽ làm nước lọt vào.
- Mỗi mẫu có đủ chỗ cho số công trình tối đa ở cấp Điện nó được vẽ, kể cả bốn công trình Hội Tết, các đền và ba nơi ở của binh chủng (sát doanh trại). Nó cũng chừa ô trước Điện cho cây nêu, mâm bánh và chỗ An Dương Vương đứng.
- **Áp mẫu**:
  - mỗi công trình đang có dời vào chỗ cùng loại gần nhất trong mẫu; cái nào đã đứng đúng chỗ thì giữ nguyên;
  - chỗ còn trống trong mẫu thì dựng thêm, tới số tối đa theo cấp Điện hiện tại, nếu loại ấy đã mở;
  - chỗ của mẫu nằm ngoài vùng đã khai phá thì bỏ qua;
  - đoạn lũy, đê, thành, bẫy thừa so với mẫu, hay vướng chỗ của mẫu, thì dỡ đi, không trả lại của;
  - công trình không có chỗ trong mẫu mà vướng thì tìm chỗ trống gần nhất;
  - không còn chỗ nào thì không áp được.
- Giá áp mẫu bằng giá dựng phần thêm cộng 10% giá dựng mỗi công trình phải dời. Phải đủ tài nguyên mới áp được. Đang có giặc thì không áp được.
- Bảng Mẫu kinh đô mở từ bảng Xây dựng. Mỗi mẫu có:
  - bản đồ thu nhỏ; đất chưa khai phá vẽ mờ;
  - số công trình sẽ dời, dựng thêm, dỡ đi;
  - tổng giá;
  - nút Áp mẫu. Bấm hai lần mới áp, cho khỏi lỡ tay.
- Test (`sapxep.test.ts`) canh các việc sau:
  - mẫu vẽ đúng: không chồng nhau, không lấn sông, bến sát sông, đủ chỗ cho số tối đa;
  - áp mẫu giữ cấp và người làm, trả đúng giá;
  - mẫu Đê bao và Cổ Loa giữ được lũ bậc 3;
  - mẫu Cổ Loa cho đủ 3 vòng thành;
  - đổi từ mẫu Phong Châu sang Cổ Loa vẫn xếp được.

## Kế hoạch chương 4: Mỵ Châu, Trọng Thủy (chủ dự án đã duyệt, đang làm)

Chủ dự án đã chốt hướng qua một buổi hỏi đáp 26 câu. Ở nhiều câu, chủ dự án nhờ tìm hiểu các game cùng thể loại rồi đề xuất theo đó. Chỉ học cơ chế, còn luật chơi, nội dung và hình ảnh vẫn là của riêng game này:
- **Clash of Clans**: làng không rộng thêm, mỗi lần mở cấp Tòa thị chính mới thì thêm cấp cho công trình cũ. Hai công trình phòng thủ đã tối đa ghép được thành một công trình mạnh hơn, ghép rồi không tách lại được. Từ đây có cấp 8 và **lầu nỏ**.
- **Rise of Kingdoms**: lên tối đa Tòa thị chính thì người chơi chuyển sang lo quân và tướng. Loại quân thứ tư (công thành) đứng ngoài vòng khắc chế, chuyên một việc. Từ đây có **lính nỏ**.
- **Forge of Empires**: mỗi thời đại mới có binh chủng mới, công trình mới, vùng bản đồ mới. Từ đây giữ nguyên khung một chương như ba chương trước.
- **Kingdom Rush**: thắng một màn thì mở thử thách cho màn đó, phần thưởng nhỏ nhưng cho người chơi lý do đánh lại. Từ đây có **thử thách phó bản** và **huân công**.
- **Age of Empires II, Halo: Reach**: nhiều chiến dịch kết thúc buồn; người chơi biết trước kết cục nhưng vẫn thắng từng trận. Từ đây chương 4 **kể trọn truyền thuyết**.

Chủ dự án đã duyệt mọi con số dưới đây trước khi viết code. Như lúc làm cấp 6–7, cho chỉnh trong khoảng ±20% để khớp nhịp và độ khó đo bằng test; làm xong phần nào thì ghi số cuối cùng của phần ấy.

### Những điều đã chốt

- **Truyện**: An Dương Vương và Mỵ Châu, Trọng Thủy, nối liền chương 3. Năm đoạn truyện. Truyền thuyết không có trận nào giữa đám cưới và lúc Triệu Đà đánh lần cuối, nên thêm một chi tiết không có trong truyện: trong lúc giả hòa, Triệu Đà sai **thủy binh đội lốt cướp sông** sang dò thế Âu Lạc.
- **Kết**: kể trọn truyền thuyết. Thắng màn 32 thì hiện màn hình **Hết truyện**, rồi chơi tiếp trên kinh đô như bây giờ. Câu cuối nhắc trước Hai Bà Trưng, để ngỏ một chương 5. Cảnh chém chỉ kể một câu nhẹ, không vẽ.
- **Kinh đô lớn tiếp nhưng không thêm đất**: Điện cấp 8 và 7 loại công trình lên cấp 8. Số công trình tối đa giữ như Điện 7. Ở Điện 7, đất 26×26 đã ra sát mép, chỉ chừa một hàng rừng cho giặc trên bộ hiện ra. (Kinh đô lớn đổi lại: Điện 8 mở đất tới 45×45.)
- **Lầu nỏ**: hai chòi canh cấp 8 ghép thành một, không tách lại được.
- **Ụ nỏ** dựng trên đoạn thành Cổ Loa, không tốn thêm đất. Đây là cơ chế mới ở kinh đô; nhờ nó ba vòng thành mới có tác dụng trong trận.
- **Thủy binh Triệu** đi thuyền từ phía sông tới đánh kinh đô. Đây là lần đầu bờ sông phải lo giặc chứ không chỉ lo lũ.
- **Lính nỏ** là binh chủng thứ tư, đứng ngoài vòng khắc chế, chuyên hạ trùm và quân nặng.
- **Cao Lỗ** là tướng thứ tư. An Dương Vương giữ kinh đô tới khi xuống biển.
- **Màn 25–32**, **Đền Cuông**, mẫu kinh đô chương 4, 10 nhiệm vụ Lạc hầu (số 40–49).
- **Thử thách phó bản** cho mọi màn 1–32, thưởng **huân công** đổi lấy tăng sức nhỏ, giữ mãi.
- **Cách làm**: chủ dự án duyệt tài liệu này một lần, rồi làm 4 PR theo thứ tự ở mục cuối.

**Một chỗ đổi so với buổi hỏi đáp, chờ duyệt**: buổi hỏi đáp chốt lính nỏ mở khi thắng màn 25 (đoạn 2). Nhưng lính nỏ làm ở PR 2, còn màn 25 tới PR 3 mới có. Đề xuất **mở lính nỏ ngay khi vào chương 4 (đoạn 1)**, để người chơi có lính nỏ chống thủy binh ở kinh đô và có nhiệm vụ luyện lính nỏ trước màn 25. Đoạn 2 đổi tên thành "Cao Lỗ cầm quân": thắng màn 25 thì Cao Lỗ ra trận.

### Truyện chương 4

1. **Cầu hôn** (vào chương 4, tức khi nhận thưởng nhiệm vụ Đền Cổ Loa): Triệu Đà thua trận, sai sứ xin cưới Mỵ Châu cho con trai là Trọng Thủy. Vua gả, Trọng Thủy theo tục ở rể tại Cổ Loa. Trên sông bắt đầu có thuyền lạ cướp bóc. Cao Lỗ tâu vua cho dân luyện nỏ và dựng ụ nỏ trên thành. Lạc hầu nhắc Điện có thể lên cấp 8.
2. **Cao Lỗ cầm quân** (thắng màn 25 lần đầu): bắt được tên cướp sông, nó khai là người phương Bắc. Cao Lỗ xin cầm quân đi dẹp, vua cho.
3. **Lẫy nỏ bị tráo** (thắng màn 28 lần đầu): Trọng Thủy dỗ Mỵ Châu cho xem nỏ thần, lén đánh tráo lẫy vuốt rùa rồi xin về phương Bắc thăm cha. Lúc chia tay, chàng hỏi nếu có binh đao thì lấy gì tìm nhau; Mỵ Châu hứa sẽ rắc lông ngỗng trên đường đi. **Nỏ thần mất thiêng.**
4. **Lông ngỗng** (thắng màn 31 lần đầu): Triệu Đà kéo quân sang. Vua cậy có nỏ thần, vẫn ung dung, tới khi giặc sát chân thành mới cầm nỏ, nhưng nỏ không còn thiêng. Cao Lỗ giữ cổng cho vua cùng Mỵ Châu lên ngựa chạy về phương Nam. Mỵ Châu rắc lông ngỗng dọc đường.
5. **Ngọc trai, giếng nước** (thắng màn 32 lần đầu): tới bờ biển Mộ Dạ, vua kêu Rùa Vàng. Rùa Vàng hiện lên: "Kẻ ngồi sau ngựa chính là giặc đó!" Mỵ Châu ngã xuống bên bờ biển. Trước khi chết nàng khấn: nếu một lòng trung hiếu mà bị lừa dối thì xin hóa thành ngọc châu. Vua cầm sừng tê bảy tấc, theo Rùa Vàng xuống biển. Máu Mỵ Châu hóa ngọc trai. Trọng Thủy lần theo lông ngỗng, đem xác vợ về táng ở Loa Thành, rồi nhảy xuống giếng mà chết. Lạc hầu kết: dân lập Đền Cuông thờ vua. Sau đoạn này hiện màn hình **Hết truyện**.

- Mỗi đoạn kể đúng một lần, theo thứ tự, sau các đoạn của chương 3. Người nói mới: Mỵ Châu, Trọng Thủy.
- **Màn hình Hết truyện**: bốn dòng tóm tắt bốn chương (Gióng đuổi giặc Ân, Sơn Tinh thắng Thủy Tinh, An Dương Vương xây thành Cổ Loa, nỏ thần mất và nước Âu Lạc mất), rồi một câu: "Hơn hai trăm năm sau, ở đất Mê Linh có hai chị em họ Trưng…". Nút **Chơi tiếp** đưa về kinh đô. Mở lại được từ bảng Lạc hầu.

### PR 1: Điện cấp 8, công trình cấp 8, lầu nỏ (chủ dự án đã duyệt, đã làm)

Giá cấp 8 khoảng gấp 2 cấp 7, sản lượng tăng khoảng 30% (cấp 6–7 tăng khoảng 35%). Bảng dưới là số cuối cùng.

**Điện**

| Cấp | Mở khi | Giá nâng | Đất | Sức chứa kho | Chỗ ở | Gạo, vỏ ốc /phút | Máu |
|---|---|---|---|---|---|---|---|
| 8 | vào chương 4 | 10400 gạo, 9200 vỏ ốc, 8000 đất đá, 1800 sắt | 45×45 (kinh đô lớn; trước kia giữ 26×26) | 32000 | 11 | 18, 9 | 2000 |

- Người đang ở chương 4 thì mở ngay. Vào chương 4 tức là nhận thưởng nhiệm vụ Đền Cổ Loa. PR 1 chưa có truyện chương 4, nên điều kiện này mở Điện 8 luôn.
- Ở Điện 8, số công trình tối đa của mọi loại giữ như Điện 7, kể cả lũy, bẫy, đê, thành và bốn công trình Hội Tết. Số bánh cần dâng ở Tết giữ 40 mỗi loại, vì bốn công trình làm bánh không lên cấp.

**Công trình lên cấp 8** (giá là giá nâng lên cấp 8)

| Công trình | Giá | Sản lượng hay công dụng (cấp 7 → 8) | Chỗ làm | Tối đa |
|---|---|---|---|---|
| Ruộng lúa | 3400 vỏ ốc, 2200 đất đá | gạo 200 → 260 | 5 (giữ) | 8 |
| Bến chợ thuyền | 4000 gạo, 2400 đất đá | vỏ ốc 200 → 260 | 4 (giữ) | 5 |
| Nhà sàn | 3000 vỏ ốc, 2600 đất đá | chỗ ở 16 → 18 | – | 7 |
| Bãi đất đá | 1900 gạo, 4000 vỏ ốc | đất đá 195 → 255 | 5 (giữ) | 5 |
| Lò rèn | 5200 vỏ ốc, 5600 đất đá | sắt 54 → 70 | 4 (giữ) | 3 |
| Kho thóc | 5200 vỏ ốc, 6400 đất đá | thêm sức chứa 9000 → 13000 | – | 4 |
| Chòi canh | 3800 vỏ ốc, 3800 đất đá, 640 sắt | sát thương 30 → 37 | – | 7 |

- Máu mỗi công trình tăng thêm khoảng 10%.
- Ở Điện 8, kho tối đa khoảng 32000 + 4 × 13000 = 84000 mỗi loại.
- Chỗ làm giữ nguyên để khỏi thiếu dân: lúc mọi công trình cũ đủ người, Điện 7 còn khoảng 25 dân rảnh.

**Nhịp** (test mô phỏng người biết dành dụm trong `balance.test.ts`, không tính thưởng phó bản):
- người chơi mô phỏng ở lại chương 3 chừng nửa giờ sau khi lên Điện 7 rồi mới vào chương 4, như các chương trước;
- với giá đề xuất ban đầu (13000 gạo, 11500 vỏ ốc, 10000 đất đá, 2200 sắt), Điện 8 mất 48 phút. Hạ 20% (mức tối đa đã cho) còn **44 phút**: lúc vào chương 4, người chơi mô phỏng còn đang dùng vỏ ốc nâng nốt công trình lên cấp 7, mà vỏ ốc chỉ làm ra khoảng 1000 mỗi phút;
- vì vậy đích của test nới từ 25–40 lên **25–45 phút**. Chơi thật nhanh hơn nhiều: mỗi màn 25–28 thưởng lần đầu 4500–6000 vỏ ốc;
- báo cáo kinh tế (`kinhTe.ts`) có thêm giai đoạn chương 4 (tới lúc lên Điện 8) và một giờ chơi thêm sau Điện 8.

**Lầu nỏ** (ghép chòi canh)

- Bảng chòi canh cấp 8 có nút **Ghép thành lầu nỏ**. Bấm rồi chạm vào một chòi canh cấp 8 khác còn nguyên. Lầu nỏ đứng ở chỗ chòi thứ nhất, chòi thứ hai biến mất, để trống ô ấy.
- Cần Điện cấp 8 và hai chòi canh cấp 8 còn nguyên. Giá ghép: 2000 vỏ ốc, 2000 đất đá, 500 sắt.
- Không tách lại được. Lầu nỏ không lên cấp.
- **Mỗi lầu nỏ tính là 2 chòi canh** trong số tối đa. Với 7 chòi canh tối đa thì có nhiều nhất 3 lầu nỏ và 1 chòi canh. Ghép không cho thêm công trình, chỉ dồn sức.
- Chỉ số: mỗi phát bắn **3 giặc khác nhau** (ít giặc hơn thì bắn chừng ấy), mỗi mũi 34 sát thương, tầm 5,5 ô, nghỉ 1,1 giây, máu 1400, móng 1×1 như chòi canh. Khi có từ 3 giặc trong tầm trở lên, lầu nỏ mạnh hơn hai chòi canh cấp 8 cộng lại khoảng 40%.
- Đền Cổ Loa còn nguyên thì lầu nỏ cũng bắn mạnh gấp rưỡi và xa thêm 1 ô như chòi canh.
- Ghép chỉ trống ra một ô mỗi lần. Đất không thiếu: kinh đô lớn theo mẫu Cổ Loa còn nhiều chỗ trống, đủ cho Đền Cuông 4×4 ở phía bắc, ngoài vòng thành ngoài.
- Áp mẫu kinh đô: lầu nỏ đứng vào chỗ chòi canh của mẫu và tính là hai chòi canh, chỗ còn lại dựng thêm chòi canh cho đủ số tối đa.
- Giao diện: bảng chòi canh cấp 8 có nút **🎯 Ghép thành lầu nỏ** kèm giá. Bấm thì thanh dưới chỉ còn nút Hủy và dòng gợi ý "Chạm vào một chòi canh cấp 8 khác còn nguyên để ghép". Chưa có chòi canh cấp 8 thứ hai thì nút mờ, có dòng báo. Bảng Điện cấp 8 ghi cỡ đất hiện có.

**Dáng mới** (móng giữ nguyên số ô; cỡ ban đầu giữ 105%, nay 120%, xem mục Phong cách)

| Công trình | Cấp 8 |
|---|---|
| Điện | thềm đá ba bậc, trên nóc có trống đồng lớn giữa hai tượng chim Lạc dang cánh |
| Điện | thềm đá ba bậc rộng hơn; trống đồng lớn trên nóc giữa đôi chim đồng; chim Lạc dang cánh trên đỉnh hai lầu trống; nền đá thứ hai viền đồng |
| Ruộng lúa | đập đá xếp cao chắn ngang bờ trái, cống tre lớn đổ nước xuống ao nước trong giữa ruộng; đàn cò trắng lội ao, một con đậu bờ |
| Bến chợ thuyền | kho hàng mái cong ở đầu cầu tàu, thêm thuyền buôn thứ hai neo giữa sông; chim đồng hai đầu mái cổng bến |
| Nhà sàn | nhà sàn dài mái thuyền vút cao hai đầu như nhà khắc trên trống đồng, chim đồng hai đầu nóc |
| Bãi đất đá | trâu kéo xe đá đứng cạnh xe; giàn cần vọt có đá đối trọng và thúng đá; chồng gạch cạnh lò cao gấp đôi |
| Lò rèn | sân đúc đồng thay ống bễ: khuôn đất, nồi đồng nghiêng rót nước đồng đỏ rực; trống đồng vừa đúc trên giá gỗ ở góc trước |
| Kho thóc | kho sàn dài mái cong thay hai vựa phía sau, chim đồng hai đầu nóc |
| Chòi canh | lầu canh đá thêm nỏ lớn thứ hai chĩa sang phải; chim đồng hai đầu nóc |
| Lầu nỏ | chân đất nện cao có đai đồng và ô cửa bắn, lầu gỗ hai tầng lan can đỏ, mái ngói ba tầng chồng nhau viền đồng vàng (mái cấp 8), chim Lạc dang cánh trên đỉnh; ba nỏ lớn chĩa ra trước, sang phải, sang trái, ba lính nỏ; hai cờ đỏ góc sau; mỗi phát bay ra ba mũi tên. Cao hơn chòi canh để nhìn là biết |

- Bản lưu lên **phiên bản 10** (công trình lên được cấp 8, thêm loại lầu nỏ; bản lưu 9 chỉ đổi số phiên bản).
- Nhiệm vụ: nối thêm nhiệm vụ 40, 41 (xem mục Nhiệm vụ). Xong nhiệm vụ 41 thì bảng Lạc hầu báo kinh đô đã có Điện cấp 8 và lầu nỏ, chờ phần sau.
- Test (`cap8.test.ts`): Điện cấp 8 cần chương 4; đất mở tới 45×45 (kinh đô lớn), kho 32000; bảy loại lên cấp 8 với số đã duyệt, số tối đa giữ như Điện 7; ghép lầu nỏ (Điện 8, hai chòi cấp 8 còn nguyên, không lúc có giặc, trả giá), không tách, không lên cấp, không dỡ; tính 2 chòi canh; mỗi phát bắn 3 giặc gần nhất, giặc thứ tư không trúng; áp mẫu; nâng bản lưu 9 lên 10. Nhịp lên Điện 8 ở `balance.test.ts`.

### PR 2: lính nỏ, ụ nỏ, thủy binh Triệu

**Lính nỏ** (mở khi vào chương 4, luyện ở nơi ở riêng như ba binh chủng kia; tên, giá và dáng nơi ở ghi vào đây cho chủ dự án duyệt trước khi làm PR 2)

| Binh chủng | Giá | Máu | Sát thương | Tầm | Nghỉ giữa hai phát | Tốc độ | Chỗ | Gạo ăn /phút |
|---|---|---|---|---|---|---|---|---|
| Lính nỏ | 50 gạo, 15 vỏ ốc, 10 sắt | 50 | 26 | 4,5 ô | 2,4 giây | 1,3 | 2 | 1,0 |

- Lính nỏ **đứng ngoài vòng khắc chế**: không có loại giặc nào được dành riêng cho lính nỏ. Lính nỏ đánh mạnh gấp đôi **quân nặng** (chiến xa, cá sấu, hổ tinh, kỵ binh, lính rìu) và **mọi trùm**.
- Bắn chậm, mỗi phát đau, ít máu, nên yếu khi bị áp sát. Mặc định đứng hậu quân cùng cung thủ.
- So với cung thủ: tính trên mỗi chỗ trong doanh trại thì đánh thường ngang nhau, nhưng gặp quân nặng và trùm thì lính nỏ gấp đôi.
- Rèn binh khí 2 bậc như ba binh chủng kia, cùng giá. Dáng: bậc 1 mũi tên sắt, bậc 2 nỏ cánh sừng và bao tên đồng.
- Dáng: mũ đồng, giáp da, cầm nỏ gỗ lớn có lẫy đồng. Khi bắn thì quỳ một gối.

**Ụ nỏ** (mở khi vào chương 4)

- Thẻ **Ụ nỏ** trong bảng Xây dựng: chạm vào một đoạn thành Cổ Loa còn nguyên để dựng ụ lên trên. Mỗi đoạn một ụ.
- Giá 150 vỏ ốc, 150 đất đá, 30 sắt. Tối đa 8 ụ ở Điện 7, 16 ụ ở Điện 8.
- Tự bắn một giặc trong tầm 4 ô, sát thương 14, nghỉ 1,4 giây.
- Ụ là một phần của đoạn thành: giặc không nhắm ụ làm đích. Đoạn thành bị phá thì ụ hư theo, sửa thành xong phải sửa ụ (30% giá). Dỡ đoạn thành thì mất ụ.
- Đền Cổ Loa còn nguyên thì ụ cũng bắn mạnh gấp rưỡi và xa thêm 1 ô.
- Dáng: ụ đất đắp cao trên mặt thành, mái tranh che nhỏ, một lính nỏ quỳ bắn.

**Thủy binh Triệu**

| Loại | Máu | Sát thương | Tầm | Ghi chú | Quân ta khắc chế |
|---|---|---|---|---|---|
| Lính thủy | 100 | 12 | 0,8 | cởi trần, khố đen viền đỏ, giáo ngắn; chạy nhanh | cung thủ |
| Cung thuyền | 60 | 12 | 3,8 | nón rộng vành đen, cung dài | voi chiến |
| Lính rìu giáp mây | 310 | 25 | 0,9 | giáp mây đan dày, rìu lớn; gấp đôi sát thương lên cung thủ ta | giáo binh, lính nỏ |
| Tướng thủy binh Triệu (trùm màn 28) | 1500 | 32 | 1,2 | giáp đen viền vàng, mũ lông chim đen, đao dài | lính nỏ |

- Thuyền giặc: thuyền đen mũi cong, buồm đỏ, khác hẳn thuyền trống đồng của ta.

**Giữ kinh đô ở chương 4**

- **Lịch đợt**:
  - từ khi vào chương 4 tới đoạn 3: **thủy binh và lũ thay phiên**. Đợt thủy binh đầu tới 3 phút sau đoạn "Cầu hôn";
  - từ đoạn 3 trở đi, kể cả sau Hết truyện: **ba đợt thay phiên**, thủy binh → quân Triệu trên bộ → lũ;
  - vẫn 15 phút một đợt, trinh sát báo trước 60 giây. Nút "Nghênh chiến ngay" gọi đợt kế tiếp.
- **Thủy binh** đợt thứ n: `9 + n` lính thủy (tối đa 18), `5 + n` cung thuyền (tối đa 12), `2 + ⌊(n + 1)/2⌋` lính rìu (tối đa 7), máu ×(2,0 + 0,12 × (n − 1)).
- **Thuyền**: mỗi thuyền chở 6 lính. Thuyền hiện ở mép sông phía nam hoặc phía đông, chèo vào bờ gần nhất, thả lính lên đất. Trinh sát báo hướng kèm dải đỏ trên mặt sông.
  - Lính lên bờ rồi tìm đường như giặc trên bộ: không lội sông, phải phá hay đi vòng đê, thành, lũy. Chúng nhắm kho rồi Điện như quân Triệu.
  - Thuyền không có máu, không bị bắn. Thuyền neo ở bờ tới hết trận rồi rút.
  - Mã sinh giặc hiện chọn mép gần hay xa theo cờ lũ (`battle.ts`), nên phải sửa để giặc trên bộ tới được từ phía sông.
- **Tướng giữ kinh đô**: thủy binh và quân Triệu có **An Dương Vương** tới khi xuống biển, sau đó là **Cao Lỗ**. Đang kiệt sức thì người kế tiếp ra thay: Cao Lỗ, rồi Sơn Tinh hiển linh, rồi Gióng. Mùa lũ vẫn có Sơn Tinh.
- **Từ đoạn 3, An Dương Vương không còn kỹ năng Nỏ thần khi giữ kinh đô.** Ô kỹ năng ghi "lẫy đã bị tráo". Ngài vẫn bắn nỏ thường, vẫn có Rùa Vàng. Ở phó bản, đánh lại màn 17–25 thì ngài vẫn đủ Nỏ thần, giống Gióng đã về trời vẫn đánh màn 5–8.
- Độ khó đo bằng test: đợt thủy binh đầu bị quân mẫu, tướng, 5 chòi canh và 8 ụ nỏ diệt hết.
- Bản lưu lên **phiên bản 11**: thêm số lính nỏ, bậc rèn của lính nỏ, các ụ nỏ, số đợt thủy binh đã đánh và đã giữ được, đã kể đoạn "Cầu hôn" chưa.
- Nhiệm vụ: nối thêm nhiệm vụ 42–44.
- Test: luyện và rèn lính nỏ; lính nỏ gấp đôi sát thương lên quân nặng và trùm; dựng ụ trên thành, ụ hư theo thành; thuyền cập bờ phía nam và phía đông; lịch thay phiên; mất Nỏ thần ở kinh đô sau đoạn 3 nhưng vẫn còn ở màn 17–25; nâng bản lưu 10 lên 11.

### PR 3: Cao Lỗ, màn 25–32, truyện, Đền Cuông, mẫu kinh đô, Hết truyện

**Cao Lỗ** (ra trận khi thắng màn 25)

- Tướng bắn xa thứ hai: 600 máu (ngoài bãi bền gấp 1,6), 18 sát thương, tầm 4,4 ô, nghỉ 1 giây. Mũi tên găm thêm nửa sát thương lên giặc quanh mục tiêu trong 1,3 ô như đòn các tướng khác. Ngoài bãi đứng giữa, lùi sau hàng đầu 1,8 ô như An Dương Vương.
- Hết máu thì kiệt sức, nghỉ 2 phút chơi.
- **Kỹ năng**:
  - **Nỏ liên châu** 🎯: một loạt tên rơi xuống chỗ giặc đứng đông nhất, mọi giặc trong 2,5 ô mất 75 máu. Hồi 16 giây. Theo truyền thuyết, nỏ của Cao Lỗ một lần bắn ra nhiều mũi;
  - **Lệnh bắn** 📯: có từ khi thắng màn 30. Trong 6 giây, mọi lính nỏ bắn nhanh gấp đôi; khi giữ kinh đô thì cả ụ nỏ và lầu nỏ cũng vậy. Hồi 22 giây;
  - ngoài bãi, sát thương kỹ năng nhân 1,6 như các tướng khác.
- Cân bằng: mạnh xấp xỉ An Dương Vương, đo bằng test.
- Dáng: tóc búi, râu đen, giáp da khảm đồng, đeo bao tên đồng, cầm nỏ lớn có hộp tên trên thân. Đứng trước Điện, cạnh An Dương Vương; vua xuống biển rồi thì Cao Lỗ đứng chỗ ấy.

**Phó bản chương 4: đường ra biển**

Bản đồ phó bản có thêm thẻ Chương 4, mở khi đã vào chương 4. Bản đồ vẽ sông từ Cổ Loa ra cửa biển, ba vòng thành Cổ Loa, dải lông ngỗng trắng chạy về phương Nam và núi Mộ Dạ bên bờ biển.

| Màn | Tên | Quân giặc | Máu (ước) | Tướng | Thưởng lần đầu |
|---|---|---|---|---|---|
| 25 | Bến sông Cổ Loa | 13 lính thủy, 8 cung thuyền, 4 lính rìu | ×2,0 | An Dương Vương | 5500 gạo, 4500 vỏ ốc, 4000 đất đá, 1000 sắt |
| 26 | Bãi ven sông | 14 lính thủy, 8 cung thuyền, 4 lính rìu | ×2,0 | cần Cao Lỗ | 6000, 5000, 4400, 1100 |
| 27 | Làng chài | 14 lính thủy, 9 cung thuyền, 5 lính rìu | ×2,0 | cần Cao Lỗ | 6500, 5400, 4800, 1200 |
| 28 | Cửa sông, trùm **tướng thủy binh Triệu** | 13 lính thủy, 8 cung thuyền, 4 lính rìu, tướng thủy binh | ×2,0 | cần Cao Lỗ | 7200, 6000, 5200, 1300 |
| 29 | Đồng trước Cổ Loa | 7 lính khiên, 7 lính thủy, 5 nỏ thủ Triệu, 4 cung thuyền, 3 kỵ binh, 2 lính rìu | ×2,1 | cần Cao Lỗ | 7600, 6300, 5500, 1350 |
| 30 | Rừng biên Cổ Loa | 7 lính khiên, 7 lính thủy, 5 nỏ thủ Triệu, 5 cung thuyền, 2 kỵ binh, 2 lính rìu | ×2,1 | cần Cao Lỗ, mở Lệnh bắn | 8000, 6600, 5800, 1400 |
| 31 | Cổng Cổ Loa: giữ cổng cho vua rút | 8 lính khiên, 7 lính thủy, 5 nỏ thủ Triệu, 4 cung thuyền, 2 kỵ binh, 2 lính rìu | ×2,2 | cần Cao Lỗ | 8500, 7000, 6200, 1500 |
| 32 | Đường ra biển Mộ Dạ: hộ giá | 3 đợt (xem dưới), Triệu Đà ở đợt cuối | ×2,0 | cần Cao Lỗ | 9000, 7500, 6500, 1600 |

- Mọi màn cần Điện cấp 5 như chương 2, 3. Mỗi màn tối đa 28 giặc, cộng quân mẫu và tướng không quá 60 người trên bãi. Đánh lại được 30%.
- Máu giặc ghi trên là mức khởi đầu; số cuối cùng đo bằng test theo Chuẩn cân bằng phó bản: lấy mức cao nhất mà người chơi thường vẫn thắng.
- **Quân mẫu chương 4**: 11 giáo, 10 cung, 3 voi, 4 lính nỏ, đúng 38 chỗ.
- Cao Lỗ đang kiệt sức thì màn 26–32 khóa, có dòng báo như với các tướng khác.
- **Màn 32 là cầm cự**:
  - giặc tới thành ba đợt, lúc 0, 30 và 60 giây: 10 tên, 10 tên, rồi 8 tên cùng Triệu Đà, trộn quân Triệu trên bộ và thủy binh;
  - thanh **"Vua tới biển"** chạy đầy trong 90 giây. Đầy thanh mà quân ta (kể cả Cao Lỗ) chưa chết hết thì **thắng**, không cần giết hết giặc hay hạ Triệu Đà;
  - quân ta chết hết trước khi đầy thanh thì thua;
  - ngựa của vua, chở An Dương Vương và Mỵ Châu ngồi sau, chạy dọc mép bãi về phía biển, xa dần theo thanh. Ngựa chỉ là cảnh, giặc không nhắm vào ngựa.
- **Bãi chiến mới**:
  - **Cửa sông** (màn 28): sông rộng chảy ngang sau lưng giặc, thuyền đen buồm đỏ neo ven bờ, bãi lau sậy;
  - **Mộ Dạ** (màn 32): bãi cát, một bên là núi Mộ Dạ, phía xa là biển xanh, lông ngỗng trắng rải trên cát.
  - Màn 25, 26 dùng bãi bến sông; 27 làng; 29 làng; 30 rừng; 31 thành Cổ Loa.
- Thắng màn 32: Rùa Vàng khổng lồ nổi lên ở mép biển trên bãi chiến, rồi tới đoạn truyện 5 và màn hình Hết truyện.
- Sau Hết truyện: An Dương Vương không còn đứng trước Điện, không giữ kinh đô nữa. Phó bản màn 17–25 ngài vẫn ra trận, hiện lên "hiển linh" như Gióng, Sơn Tinh.

**Đền Cuông**

- Mở khi thắng màn 32. Dựng một lần, 4×4, giá 4000 gạo, 4000 vỏ ốc, 4000 đất đá, 1100 sắt. Ngoài đời, Đền Cuông ở Diễn Châu, Nghệ An, thờ An Dương Vương, nơi truyền thuyết kể vua xuống biển.
- Đền còn nguyên thì **mỗi đợt thủy binh bớt 20% số thuyền** (làm tròn xuống, còn ít nhất 1 thuyền), tức bớt chừng ấy lính.
- Sức chịu nước lũ như các đền khác.
- Dáng: đền nền đá mái cong dưới chân một mỏm núi, sân có tượng Rùa Vàng quay mặt ra phía sông, bên cạnh là một giếng nhỏ thành đá.

**Mẫu kinh đô "Cổ Loa giữ sông"** (mở khi vào chương 4, vẽ cho Điện 8)

- Giữ ba vòng thành và đê bao của mẫu Cổ Loa.
- 16 ụ nỏ trên vòng thành ngoài, chia đều các phía bắc, tây và phía sông.
- 3 lầu nỏ và 1 chòi canh: hai lầu nỏ ở phía sông, một ở góc bắc tây.
- Đền Cuông ở chỗ 4×4 còn trống phía bắc, ngoài vòng thành ngoài.
- Test như các mẫu khác: không chồng nhau, không lấn sông, đủ chỗ cho số tối đa, giữ được lũ bậc 3, đủ 3 vòng thành.

- Bản lưu lên **phiên bản 12**: thêm Cao Lỗ (nghỉ tới lúc nào, đã có Lệnh bắn chưa), An Dương Vương đã xuống biển chưa, đã xem Hết truyện chưa.
- Nhiệm vụ: nối thêm nhiệm vụ 45–49.
- Test: độ khó màn 25–32 theo chuẩn (`chuong4.test.ts`); màn 32 thắng khi đầy thanh, thua khi hết quân; thứ tự năm đoạn truyện; Đền Cuông bớt thuyền; mẫu kinh đô; nâng bản lưu 11 lên 12.

### PR 4: thử thách phó bản và huân công

**Thử thách**

- Thắng màn nào ở chế độ thường thì màn đó mở **một thử thách**, ở chương nào cũng vậy. Thẻ màn có thêm nút **Thử thách**. Bảng xếp quân ghi luật thử thách.
- Ba kiểu:
  - **Không tướng**: trận không có tướng nào;
  - **Hai binh chủng**: chỉ được mang hai binh chủng đã chỉ định;
  - **Giặc dữ**: sát thương giặc ×1,25.
- Mỗi thử thách có hệ số máu giặc riêng, đo bằng test. Một thử thách đạt chuẩn khi:
  - **người chơi giỏi thắng** cả 3 hạt giống: bấm kỹ năng ngay khi hồi, có Đền của chương ấy, đã rèn đủ 2 bậc cho mọi binh chủng, quân mẫu 38 chỗ, không tính huân công và phúc lành;
  - **người chơi thường thua** ít nhất 2 trong 3 hạt giống (chuẩn của màn thường), để thử thách thật sự khó hơn màn thường.
- Thắng lần đầu thì được **huân công**: màn 1–8 được 1, màn 9–16 được 2, màn 17–24 được 3, màn 25–32 được 4. Cả 32 thử thách cho tổng 80 huân công. Thắng lại không có thêm. Thua thì chỉ mất lính tử trận như thường.
- Kiểu của từng màn:

  | Kiểu | Màn |
  |---|---|
  | Giặc dữ | 1, 3, 4, 8, 12, 16, 19, 24, 28, 32 (các màn có trùm, cùng màn 1 và 3 vốn chưa cần tướng) |
  | Không tướng | 5, 7, 9, 11, 14, 17, 20, 22, 25, 27, 30 |
  | Hai binh chủng | 2, 6, 10, 13, 15, 18, 21, 23, 26, 29, 31 |

  Ở màn Hai binh chủng, thường bỏ binh chủng khắc loại giặc đông nhất của màn. Màn 25 trở đi có thể chỉ định lính nỏ.
- Màn 32 thử thách vẫn là cầm cự 90 giây.

**Huân công**

- Bảng **Huân công** mở từ bản đồ phó bản. Có 5 nhánh: giáo binh, cung thủ, voi chiến, lính nỏ, tướng. Mỗi nhánh 3 bậc.
- Giá bậc 1, 2, 3 là 3, 5, 8 huân công. Một nhánh hết 16, cả 5 nhánh hết đúng 80, bằng số huân công của cả 32 thử thách.
- Mỗi bậc thêm **4% máu và sức đánh** cho binh chủng ấy. Nhánh tướng thì cho mọi tướng. Có tác dụng ở mọi trận, cộng thêm vào phần của rèn binh khí, Đền và phúc lành Tết.
- Chuẩn cân bằng của màn thường và của thử thách đều tính không có huân công.
- Dáng: chip 🎖 trên bản đồ phó bản ghi số huân công đang có. Thẻ màn có thử thách đã thắng thì có ngôi sao đồng.

- Bản lưu lên **phiên bản 13**: thêm thử thách đã thắng, huân công đang có, bậc huân công từng nhánh.
- Test: mở thử thách sau khi thắng màn; luật từng kiểu; huân công chỉ cho một lần; mua bậc; tăng sức vào trận; mọi thử thách đạt chuẩn; nâng bản lưu 12 lên 13.

### Nhiệm vụ Lạc hầu chương 4

10 nhiệm vụ nối sau 40 nhiệm vụ của ba chương trước. Nối vào cuối danh sách thì không làm xô lệch số thứ tự nhiệm vụ của người đang chơi. Mỗi PR nối thêm phần của mình, đúng thứ tự dưới đây.

| Số | Nhiệm vụ | Thưởng | PR |
|---|---|---|---|
| 40 | Lên Điện cấp 8 | 2000 gạo, 2000 vỏ ốc | 1 |
| 41 | Ghép một lầu nỏ | 1500 đất đá, 400 sắt | 1 |
| 42 | Dựng 4 ụ nỏ | 1200 vỏ ốc, 300 sắt | 2 |
| 43 | Luyện 4 lính nỏ | 1500 gạo, 300 sắt | 2 |
| 44 | Đánh lui một đợt thủy binh ở kinh đô | 1500 vỏ ốc, 450 sắt | 2 |
| 45 | Qua màn 25 | 1500 gạo, 1200 vỏ ốc | 3 |
| 46 | Qua màn 28 | 1800 gạo, 1200 đất đá | 3 |
| 47 | Qua màn 30 | 1500 vỏ ốc, 500 sắt | 3 |
| 48 | Hộ giá ra biển (qua màn 32) | 3000 gạo, 3000 vỏ ốc | 3 |
| 49 | Dựng Đền Cuông | 2200 đất đá, 700 sắt | 3 |

Thưởng khoảng gấp rưỡi nhiệm vụ chương 3. Nhận xong nhiệm vụ cuối của phần đã làm thì bảng Lạc hầu báo đã xong như hiện nay, chờ PR sau nối tiếp.

### Thứ tự làm chương 4

1. **Duyệt tài liệu này** (mọi con số và dáng ở trên). Chủ dự án đã duyệt.
2. **PR 1** (đã làm): Điện cấp 8, công trình cấp 8, lầu nỏ. Bản lưu v10.
3. **PR 2**: lính nỏ, ụ nỏ, thủy binh Triệu đánh kinh đô, đoạn truyện "Cầu hôn". Bản lưu v14.
4. **PR 3**: Cao Lỗ, màn 25–32, bốn đoạn truyện còn lại, Đền Cuông, mẫu kinh đô chương 4 (vẽ trên bản đồ mới), màn hình Hết truyện. Bản lưu v15.
5. **PR 4**: thử thách phó bản và huân công. Bản lưu v16.

PR 2–4 làm sau kế hoạch Kinh đô lớn (mục ngay dưới), vì thủy binh Triệu cập bờ và mẫu kinh đô chương 4 cần bản đồ mới. Bản đồ mới dùng bản lưu v11–v13.

Mỗi PR: chạy `npm test` và `npm run build`; sửa `src/render/` hay `src/ui/` thì chụp kiểm tra ở khổ điện thoại; sau đó ghi số cuối cùng vào tài liệu này.

## Kế hoạch: kinh đô lớn, công trình to, mở đất bằng khoảnh (chủ dự án đã duyệt, đang làm)

Chủ dự án thấy bản đồ kinh đô nhỏ, công trình sát nhau, bố cục xấu, và muốn công trình to hơn cho có tầm vóc. Chủ dự án nhờ tham khảo các game cùng thể loại rồi chọn qua hai lượt hỏi.

**Vì sao chật** (khảo sát code):
- Đất tối đa 26×26. Xây đủ giới hạn thì kín 104% đất ở Điện 7–8, phần lớn là lũy, đê, thành, bẫy.
- Nền mô hình phủ 92–100% ô móng, mái từ cấp 5 tràn qua mép, nên hai nhà cạnh nhau liền thành một mảng.
- Giữa các nhà không có cây cỏ, đá hay lối đi. Mẫu kinh đô và người chơi mô phỏng xếp liền khối.

**Học cơ chế từ game cùng thể loại:**
- Forge of Empires, Elvenar: đất chia khoảnh, mở theo tiến trình rồi trả tiền; người chơi chọn chỗ đặt, miễn sát đất cũ.
- Hay Day, Township: đất đã mở thỉnh thoảng mọc cây, đá để dọn lấy chút thưởng.
- Clash of Clans: quanh mô hình có viền cỏ, nên đặt sát nhau vẫn thoáng.

### Những điều đã chốt

- **Công trình to hơn một ô mỗi chiều**: 2×2 thành 3×3, 3×3 thành 4×4, Điện 4×4 thành 5×5. Công trình 1 ô giữ 1 ô: lũy, đê, thành, bẫy chông, chòi canh, lầu nỏ (chòi canh, lầu nỏ vẽ cao hơn cho cân).
- **Lưới 55×55**:
  - hai ô ngoài cùng phía bắc và phía tây luôn là rừng, làm chỗ giặc xuất phát;
  - đất chia **10×10 khoảnh 5×5**, phủ ô 2..51;
  - sông rộng 3 ô, từ ô 52.
- **Điện 5×5 ở ô (37, 37)**, đúng một khoảnh. Game mới mở sẵn 16 khoảnh ở góc sông (20×20 ô). Điện cách rìa rừng 5 ô, cách sông 10 ô.
- **Mở đất bằng khoảnh tự chọn**:
  - chạm khoảnh rừng sát đất đã mở (4 hướng), trả gạo và vỏ ốc, đất mở ngay;
  - số khoảnh được mở theo cấp Điện: 18, 24, 32, 38, 48, 60, 72, 80;
  - giá chừng 1–1,5% giá nâng Điện của bậc vừa cho lượt ấy, nhích dần trong cùng bậc; không tốn sắt hay đất đá;
  - không phát được khi có giặc hay lũ, kể cả lúc trinh sát báo;
  - khoảnh ven sông thêm chỗ đặt bến nhưng dễ ngập, khoảnh trên đồi an toàn lũ.
- **Độ thoáng ước tính** (xây đủ giới hạn):

  | Điện | Đất (ô) | Nhà cửa chiếm | Tính cả lũy, đê, thành |
  |---|---|---|---|
  | 1 | 450 | 23% | 29% |
  | 3 | 800 | 30% | 40% |
  | 5 | 1200 | 33% | 44% |
  | 6 | 1500 | 32% | 48% |
  | 7 | 1800 | 30% | 54% |
  | 8 | 2000 (≈45×45) | 27% | 48% |

- **Giới hạn số đoạn** lũy, đê, thành tăng chừng 40% vì vòng quanh kinh đô dài hơn; giá mỗi đoạn giữ nguyên.
- **Trận giữ kinh đô**: tầm bắn, tốc độ, bán kính kỹ năng tính bằng ô nhân một hệ số chừng 1,4. Trận ngoài bãi giữ nguyên.
- **Khoảng thở**:
  - mô hình phóng theo móng mới, nền chừng 85% ô móng, chừa viền cỏ; người làm giữ cỡ người thật;
  - trang trí ô trống (bụi cây, hoa, đá nhỏ) và lối đất nện từ cửa công trình về sân Điện, chỉ để nhìn;
  - cây, đá thỉnh thoảng mọc trên ô trống, chạm để dọn lấy chút gạo hay đất đá.
- **Bản lưu cũ** tự xếp lại theo mẫu kinh đô của chương đang chơi, miễn phí, giữ cấp và người làm. Đoạn lũy, đê, thành, bẫy không còn chỗ thì trả lại giá dựng; đất đã đắp trả lại đất đá.
- Tự chọn, chủ dự án có thể đổi:
  - rừng chưa mở giặc vẫn đi qua được;
  - không thêm nhiệm vụ Lạc hầu, chỉ hiện gợi ý lần đầu được phát rừng;
  - tiền trả lại khi nâng bản lưu được vượt sức chứa kho.

### Thứ tự làm

1. **PR 1: kinh đô lớn, công trình to** (đã làm, bản lưu v11): ô móng mới, lưới 55×55, địa hình giãn theo, giới hạn lũy/đê/thành, trận giữ kinh đô theo bản đồ mới, vẽ lại ba mẫu kinh đô có lối đi, mô hình phóng to có viền cỏ, camera, nâng bản lưu xếp theo mẫu. Đất tạm mở theo hình vuông ở góc sông, cạnh 20, 25, 25, 30, 35, 40, 40, 45 theo cấp Điện (khớp lưới khoảnh). Chi tiết đã làm:
   - **Địa hình**: ba ô sát sông là bãi bồi bậc 0 (vừa một bến 3×3), dốc vào đồi dài hơn; nhiễu tính bằng hàm băm nên không phụ thuộc cỡ lưới.
   - **Chọn chỗ dựng** (`findSpot` trong `game.ts`): người chơi mô phỏng và gợi ý chỗ đặt tỏa dần từ Điện ra (công trình một ô thì từ góc vùng đất phía rừng), ưu tiên chỗ có viền trống một ô quanh móng (lũy, đê, thành, bẫy, chòi canh không tính), hết chỗ thoáng mới đặt sát.
   - **Trận giữ kinh đô**: tầm bắn, tốc độ, bán kính kỹ năng nhân 1,4 (`RAID_SCALE`, cả hình vẽ kỹ năng); giặc trên bộ xuất phát ở dải cách sông như trước nhân 1,4, luôn ngoài vùng đã khai phá (`raidSpawnBand`); dải báo giặc, ma trơi, camera lướt tới đều theo dải ấy. Test độ khó chương 2, 3 vẫn đạt chuẩn mà không phải chỉnh thêm.
   - **Giới hạn**: lũy 40, 70, 100, 130, 150, 170, 180, 180; đê 130 tới cấp 5, rồi 140, 150; thành Cổ Loa 220 tới cấp 5, rồi 230, 240 (ba vòng của mẫu Cổ Loa cần 216 đoạn).
   - **Mô hình**: phóng cả mô hình theo tỉ lệ móng mới rồi thu còn chừng 88% (ruộng 95%, bến 92%), cùng một hệ số ở mọi cấp nên giữ tỉ lệ dáng cấp 6–8 đã duyệt; người làm giữ cỡ người thật; chòi canh to hơn 15%, lầu nỏ 12%.
   - **Camera**: mặc định thấy chừng 20 ô bề ngang, thu nhỏ được tới khi thấy trọn kinh đô 45×45; lần đầu mở game nhìn vào giữa vùng đất đã khai phá; kéo trong vùng đất ấy; bóng nắng theo chỗ đang nhìn, sương mù lùi xa khi thu nhỏ.
   - **Nâng bản lưu** (`xepLai.ts`): bản lưu còn ở kinh đô nhỏ (Điện ở ô 16, 16, độ cao 30×30) dựng lại theo mẫu của chương đang chơi (chương 4 dùng mẫu Cổ Loa), miễn phí, giữ cấp, người làm, hư hỏng; công trình không có chỗ trong mẫu thì vào chỗ trống gần Điện nhất. Lũy, đê đã có thì dựng đủ dải theo mẫu; thành Cổ Loa xếp từ vòng trong ra và dựng nốt cho đủ số vòng kinh đô cũ đã có. Đoạn thừa trả lại giá đã bỏ ra; đất đã đắp và nền đã đắp trả lại đất đá (tính theo địa hình cũ). Trận giữ kinh đô đang dở lùi về lúc trinh sát báo, trả lại của bị cướp. Vào game thì báo một lần kinh đô đã dựng lại và phần hoàn lại.
   - **Bảng mẫu kinh đô**: bản đồ thu nhỏ vẽ lên canvas một lần cho mỗi mẫu và cấp Điện.
2. **PR 2: khoảnh tự chọn** (bản lưu: phiên bản kế tiếp, vì v12 đã dành cho lưới qua sông): bảng Khoảnh rừng, phát rừng, người chơi mô phỏng phát rừng, chỉnh giá theo sổ kinh tế.
3. **PR 3: trang trí ô trống, lối đất** (chỉ hình vẽ).
4. **PR 4: cây, đá mọc trên ô trống** (bản lưu v13).

Sau đó mới làm tiếp chương 4, PR 2–4.

## Kế hoạch: vùng đất bên kia sông (chủ dự án đã duyệt, đang làm)

Chủ dự án yêu cầu: khám phá vùng đất mới bên kia sông để mở rộng lãnh thổ, có bắc cầu, điều quân. Mục này ban đầu là bản đề xuất gồm phương án khuyên dùng, số nháp và chín câu hỏi cần chốt (cuối mục). **Chủ dự án đồng ý mọi phương án khuyên dùng**, nên các câu hỏi đã chốt theo phương án ấy. Như các kế hoạch trước, số cho chỉnh ±20% theo test; làm xong phần nào thì ghi số cuối cùng của phần ấy.

**Hiện trạng** (khảo sát code):
- Lưới 55×55. Sông Thao (phía đông) và sông Đà (phía nam) chiếm ba ô 52–54 sát mép lưới (`map.ts`). Bờ bên kia chỉ là một mảng đất phẳng vẽ ngoài lưới (`staticTerrain` trong `world.ts`): không có ô, không xây được, mùa lũ thì phủ một lớp nước.
- Sông là hào tự nhiên: giặc trên bộ không lội qua (`costGrid` trong `battle.ts`), nên vòng thành Cổ Loa dựa vào bờ sông cũng tính là kín (`wallRings` trong `coLoa.ts`). Thủy quái, thuyền buôn và (sắp tới) thủy binh Triệu đi từ sông vào.
- Số công trình tối đa tính theo cấp Điện, không theo đất. Ở Điện 8, bên này còn 20 trên 100 khoảnh chưa mở, và kinh đô theo mẫu Cổ Loa còn nhiều chỗ trống. Vì vậy **đất bên kia phải cho thứ bên này không có**; thêm đất không thôi thì không ai cần.

**Học cơ chế** từ game cùng thể loại (chỉ học cơ chế, luật chơi và hình ảnh vẫn là của riêng game này):
- Northgard: bản đồ chia vùng; trinh sát đi dò sương mù; chiếm vùng tốn lương thực, vùng sau đắt hơn vùng trước; có vùng bị thú dữ, quái vật giữ, phải đem quân dẹp mới chiếm được; nhiều vùng có đặc điểm riêng (đất màu mỡ, mỏ đá, mỏ sắt) có lợi cho công trình hợp với nó. Từ đây có **khoảnh sương mù, trinh sát, đồn giặc giữ đất, đặc sản đất**.
- Rise of Kingdoms: trinh sát mở sương mù; đồn man di rải trên bản đồ để đánh lấy thưởng; cửa ải phải chiếm mới sang được vùng sau. Từ đây có **đồn giặc chia bậc theo chương**: bậc sau chỉ đánh được khi đã tới chương ấy.

### Đề xuất

**Bản đồ: bờ bên kia thành đất thật trong cùng lưới kinh đô**
- Lưới nới từ 55×55 lên **72×72**. Sông giữ ô 52–54, nay nằm giữa lưới. Mọi tọa độ cũ giữ nguyên, nên công trình, mẫu kinh đô và test theo mốc không phải dời.
- **Bờ nam sông Đà**: ô x 2–51, z 55–69. **Bờ đông sông Thao**: ô x 55–69, z 2–51. Mỗi bờ sâu 3 khoảnh, dài 10 khoảnh: 30 khoảnh mỗi bờ, cả hai bờ 60 khoảnh. Hai ô ngoài cùng (70–71) là rừng, chỗ giặc bên kia xuất phát.
- **Ngã ba sông** (sửa khi làm PR 1): bản đề xuất để cả góc đông nam là nước, nhưng chụp thử thì thành một hồ nước trống trải chiếm nửa màn hình khi thu nhỏ. Nay theo địa thế Bạch Hạc: **sông Thao đổ vào sông Đà ở ngã ba, sông Đà chảy tiếp về đông**. Góc đông nam (x 52–71, z từ 55) liền với bờ nam, là rừng không khai phá, như dải rừng ngoài cùng.

  ```
               x 0–1   2 … 51     52–54    55 … 69    70–71
    z 0–1      rừng    rừng       sông     rừng       rừng
    z 2–51     rừng    KINH ĐÔ    Thao     BỜ ĐÔNG    rừng
    z 52–54    ─────────────────── sông Đà ──────────────────
    z 55–69    rừng    BỜ NAM     rừng (góc đông nam)
    z 70–71    rừng    rừng       rừng
  ```

- Độ cao bờ bên kia theo cùng luật bên này, soi gương qua sông: ba ô sát sông là bãi bồi bậc 0, vào trong là đồng bằng có gò, sát rừng là đồi. Nhiễu đã tính bằng hàm băm theo tọa độ, nên độ cao bên này **giữ y như cũ** (test canh).
- Phương án khác: bờ bên kia là một bản đồ vùng riêng, cảnh riêng như bãi chiến. Ít đụng code kinh đô, nhẹ máy hơn, nhưng không thấy cầu và quân qua sông ngay trước mắt, mất cái hay chính của ý tưởng. Không khuyên dùng.

**Cầu**
- Thẻ **Cầu** trong bảng Xây dựng, mở ở Điện cấp 4. Cầu rộng 2 ô, vắt qua 3 ô sông; đầu bên này phải chạm đất đã khai phá. Tối đa một cầu qua sông Đà và một cầu qua sông Thao.
- Bắc cầu xong thì **khoảnh đầu cầu** (khoảnh bên kia mà đầu cầu chạm vào) được dò và mở luôn, không mất thêm, làm chỗ đặt chân. Khoảnh đầu cầu không bị đồn kề bên chặn, nhưng không bắc cầu thẳng vào khoảnh có đồn.

  | Cấp | Tên | Cần | Giá | Máu | Lũ |
  |---|---|---|---|---|---|
  | 1 | Cầu phao tre | Điện 4 | 400 gạo, 300 vỏ ốc, 200 đất đá | 600 | lũ từ bậc 2 thì cuốn trôi (hư) |
  | 2 | Cầu gỗ | Điện 6 | 1600 vỏ ốc, 1400 đất đá, 250 sắt | 1500 | chịu tới bậc 2, bậc 3 thì hư |
  | 3 | Cầu gỗ lớn có lầu đầu cầu | Điện 7 | 2800 vỏ ốc, 2600 đất đá, 500 sắt | 2600 | không sợ lũ |

- Quân ta, giặc trên bộ và người làm đi qua cầu như đi trên đất. Cầu hư thì không ai qua được (thủy quái vẫn bơi). Sửa cầu tốn 30% giá như công trình khác.
- Giặc không nhắm phá cầu. Thuyền buôn, thủy binh đi dưới gầm cầu, không bị chặn.
- Cầu bị lũ cuốn thì phải sửa, nhưng **không tính là để mất mùa lũ** (thêm khi làm PR 2): mùa lũ vẫn tính giữ được nếu không công trình nào khác bị ngập, để bắc cầu tre không làm hỏng nhiệm vụ giữ lũ.
- **Chỗ có cầu thì sông không còn là hào kín**: đếm vòng thành coi ô cầu là đi được, và coi bìa rừng bên kia là chỗ giặc xuất phát. Vòng thành dựa vào bờ sông mà hở ở đầu cầu thì không tính nữa. Mẫu Cổ Loa có vòng kín quanh Điện, không chạm sông, nên không đổi. Khi đặt cầu mà số vòng sẽ giảm thì dòng gợi ý báo trước.
- Áp mẫu kinh đô chừa ô đầu cầu bên này, không đặt công trình chắn lối lên cầu.

**Khám phá: sương mù và trinh sát**
- Mỗi khoảnh bên kia có ba trạng thái: **chưa dò** (mây phủ, chỉ thấy ngọn cây), **đã dò** (thấy địa hình và điểm lạ), **đã mở** (xây được).
- Chạm khoảnh chưa dò sát vùng đã dò (4 hướng) để **sai trinh sát**: 60 gạo, 20 vỏ ốc. Người trinh sát chạy từ sân Điện qua cầu tới đó; sau **40 giây chơi** thì khoảnh ấy và các khoảnh kề cạnh hiện ra. Một lúc một trinh sát, từ Điện 6 thì hai. Cầu phải còn nguyên.
- Trinh sát đi theo đồng hồ chơi như thuyền buôn, vẫn đi khi có giặc hay lũ (chỉ là dò đường).
- **Điểm lạ** cố định theo hạt giống, mọi máy như nhau. Mỗi bờ có:

  | Điểm lạ | Mỗi bờ | Là gì |
  |---|---|---|
  | Đồn giặc | 6 (bậc 1, 1, 2, 2, 3, 4) | quân giặc đóng giữ; dẹp xong mới mở được khoảnh có đồn và các khoảnh kề cạnh |
  | Bản làng | 2 | làng người Lạc Việt; mở đất tới nơi rồi dâng lễ thì làng về theo |
  | Đặc sản đất | 3 | bãi phù sa, núi đá hay mỏ sắt lộ thiên |
  | Của chôn | 2 | trống đồng, rìu đồng chôn dưới đất; mở khoảnh thì đào được |

  Bậc đồn tăng dần từ bờ sông vào bìa rừng: bậc 1 ở hàng sát sông, bậc 2 hàng giữa, bậc 3–4 ở hàng sát rừng. Làng và đặc sản tốt nằm sau đồn bậc 2–3, để có cái mà dẹp.

  **Bố cục đã làm** (PR 2, `LAYOUT` trong `benKia.ts`). Bờ chỉ sâu 3 khoảnh, nên đồn bậc 2 ở hàng giữa chặn kín cả bề ngang bờ (khoảnh của nó và hai khoảnh trên dưới), chia bờ thành ba quãng. Hai bờ chung khung đồn, khác làng và đặc sản. Khoảnh đếm `i` từ tây (bờ nam) hay từ bắc (bờ đông), `j` từ bờ sông:

  ```
  j\i  0      1      2      3      4      5      6      7      8      9
  2    .      .      cua    Đ4     .      .      đs3    Đ3     .      cua
  1    đs2    Đ2     .      .      làng   Đ2     .      .      đs1    .
  0    làng   .      .      Đ1     .      .      .      .      Đ1     .
  ```

  | Ô | Bờ nam sông Đà | Bờ đông sông Thao | Khai phá được khi (cầu bắc ở quãng gần ngã ba) |
  |---|---|---|---|
  | đs1 | bãi phù sa | núi đá | dẹp đồn bậc 1 bên cạnh (chương 1) |
  | làng (4, 1) | làng trồng lúa | làng thợ đá | dẹp đồn bậc 2 (chương 2) |
  | làng (0, 0) | làng chài | làng thợ rèn | dẹp đồn bậc 2 (chương 2) |
  | đs2 | bãi phù sa | mỏ sắt | dẹp đồn bậc 2 (chương 2) |
  | đs3 | núi đá | mỏ sắt | dẹp đồn bậc 3 (chương 3) |
  | cua (9, 2) | của chôn | của chôn | ngay (chương 1) |
  | cua (2, 2) | của chôn | của chôn | dẹp đồn bậc 4 (chương 4) |

  Cả hai bờ có hai bãi phù sa, hai núi đá, hai mỏ sắt. Đồn chỉ cần dò thấy là đánh được, không cần khai phá tới nơi.

**Điều quân dẹp đồn giặc**
- Chạm đồn đã dò: bảng đồn ghi quân giặc, bậc, cần chương nào, thưởng. Nút **Điều quân** mở bảng xếp quân như phó bản (chọn lính, xếp hàng, tướng).
- Bốn bậc theo bốn chương, mỗi bậc là giặc của chương ấy:

  | Bậc | Giặc | Cần | Tướng | Quân giặc khởi điểm | Thưởng lần đầu (nháp) |
  |---|---|---|---|---|---|
  | 1 | giặc Ân | Điện 4 | như trận chương 1 | như màn 4–6 | 400 gạo, 300 vỏ ốc, 250 đất đá, 60 sắt |
  | 2 | thủy quái ở đầm lau | vào chương 2 | như trận chương 2 | như màn 11–13 | 1300 gạo, 900 vỏ ốc, 700 đất đá, 180 sắt |
  | 3 | yêu tinh | vào chương 3 | như trận chương 3 | như màn 17–18 | 2400 gạo, 1700 vỏ ốc, 1500 đất đá, 400 sắt |
  | 4 | quân Triệu trên bộ | vào chương 4 | An Dương Vương, có Cao Lỗ thì Cao Lỗ | như màn 21–23 | 4200 gạo, 3500 vỏ ốc, 3100 đất đá, 800 sắt |

  Số giặc và máu cuối cùng đo bằng test theo **Chuẩn cân bằng phó bản**: bậc 1 như màn 1–4 (người chơi thường thắng với quân vừa doanh trại ở Điện 4), bậc 2–4 như màn chương 2, 3 (`testkit.ts`).
- **Đánh ngoài bãi chiến** như phó bản. Trước trận, lính (tối đa chừng 20 hình cho nhẹ máy) đi thành hàng từ doanh trại qua cầu tới đồn trong vài giây ngay trên kinh đô, rồi chuyển sang bãi chiến. Bãi chiến mới **bờ bên kia**: bãi sông có lau sậy, cầu tre sau lưng quân ta, đồn rào cọc sau lưng giặc.
- Luật như phó bản: lính chết thì mất; thua thì đồn còn đó, đánh lại được; đang đánh thì đồng hồ giặc đứng, không luyện quân được. Thắng thì đồn cháy rồi tan, cờ đỏ của ta cắm lên. Đồn đã dẹp thì hết, không đánh lại.
- Phương án khác: đánh ngay trên bản đồ kinh đô, quân đi thật từ doanh trại qua cầu tới đồn rồi đánh tại chỗ. Thấy rõ "điều quân" hơn, nhưng là một kiểu trận mới phải cân bằng lại từ đầu, đường hành quân dài, camera phải bám theo. Không khuyên dùng cho lần đầu; nếu cần thì làm sau PR 5.

**Mở đất bên kia và được gì**
- Dùng chung cách mở khoảnh của kế hoạch kinh đô lớn (PR 2): chạm khoảnh đã dò, sát đất đã mở cùng bờ (hay khoảnh đầu cầu), không bị đồn chặn, rồi trả gạo và vỏ ốc. Giá theo cùng công thức bên này, nhích dần theo số khoảnh bên kia đã mở. Không giới hạn số khoảnh theo cấp Điện: đồn bậc nào mở ở chương ấy đã giữ nhịp.
- Công trình bên kia vẫn tính vào số tối đa chung. Bên kia cho ba thứ bên này không có:
  - **Đặc sản đất**: công trình có móng nằm trọn trong khoảnh đặc sản làm ra thêm **30%**: ruộng lúa, ruộng nếp trên bãi phù sa; bãi đất đá trên núi đá; lò rèn trên mỏ sắt. Mỗi khoảnh vừa một công trình. Người chơi dời công trình sang (tốn 10% giá dựng như mọi lần dời);
  - **Bản làng**: dâng lễ kết thân (600 gạo, 400 vỏ ốc) thì làng về theo, từ đó làm ra tài nguyên theo nghề, **không cần dân**, bằng một công trình cùng nghề đủ người ở cấp bằng cấp Điện. Bốn làng, mỗi làng một nghề: bờ nam có làng lúa (gạo), làng chài (vỏ ốc); bờ đông có làng đá (đất đá), làng rèn (sắt). Đền và phúc lành Tết cộng thêm như với công trình khác;
  - **Của chôn**: mở khoảnh có của chôn thì đào được một lần, thưởng chừng 5% giá nâng Điện ở cấp hiện tại.
- Người làm phải qua sông: **cầu hư thì công trình bên kia không có người làm**. Làng vẫn làm ra, vì là dân bên ấy. Đây là lý do nâng cầu trước mùa lũ to.
- Áp mẫu kinh đô chỉ xếp bờ bên này. Công trình bên kia giữ nguyên chỗ và vẫn tính vào số tối đa, nên mẫu dựng thêm ít đi tương ứng.
- Người chơi mô phỏng (`moPhong.ts`) không sang sông, nên nhịp lên Điện ở `balance.test.ts` không đổi. Sổ kinh tế (`kinhTe.ts`) thêm một kịch bản có bốn làng và đặc sản; rà bằng skill `ra-kinh-te` trước khi chốt số làng và đặc sản.

**Phòng thủ hai bờ**
- Một bờ đã có công trình hay làng về theo thì giặc trên bộ (giặc Ân, yêu tinh, quân Triệu) cứ ba đợt có một đợt tới từ **bìa rừng bên kia**. Trinh sát báo hướng như cũ ("bên kia sông Đà", "bên kia sông Thao"), có dải đỏ ở bìa rừng bên ấy. Chương 2 chỉ có lũ, nên bên kia chỉ lo lũ.
- Giặc bên kia nhắm làng gần nhất trước (làng bị phá thì thôi làm ra, sửa tốn 30% lễ kết thân), rồi qua cầu tìm kho và Điện. Cầu hư thì chúng không sang được, phá bên kia tới hết giờ rồi rút.
- Lũ loang cả hai bờ theo cùng luật: bãi bồi bên kia ngập trước; đắp đê bên kia được.
- **Đồn biên** (công trình mới, 4×4, chỉ dựng bên kia, mỗi bờ một, cần Điện 5; giá nháp 800 gạo, 600 vỏ ốc, 600 đất đá, 100 sắt): bảng đồn biên chọn số lính **đóng ở đồn**, lấy từ quân đang có, không thêm chỗ quân. Khi giữ kinh đô, lính đóng ra trận từ đồn biên; phần còn lại và tướng ra từ doanh trại. Không có đồn biên thì cả quân ra từ doanh trại, phải đi vòng qua cầu.
- Thủy binh Triệu (PR 2 chương 4) cập bờ có công trình gần nhất, kể cả bờ bên kia. Chốt khi làm PR ấy.

**Hình ảnh** (mỗi PR chụp kiểm tra ở khổ điện thoại)
- Bờ bên kia là đất bậc thang như bên này, rừng phủ chỗ chưa mở. Mảng đất phẳng vẽ ngoài lưới chỉ còn ở ngoài ô 71.
- Sương mù: mây cuộn màu kem như giấy, viền mực, xoắn như hoa văn mây trên trống đồng, phủ khoảnh chưa dò; dò xong thì tan trong chừng 1 giây.
- Cầu phao tre: bè tre kết dây mây, nhấp nhô theo sóng. Cầu gỗ: cột gỗ, lan can. Cấp 3: cầu gỗ lớn có lầu canh mái ngói ở đầu cầu bên này (mái như cấp 7).
- Đồn giặc theo bậc, đều có rào cọc nhọn, lều, lửa trại và vài lính gác đứng yên (bản tĩnh, `bakeRig`): giặc Ân có cờ và mũ trụ đồng; thủy quái ở ổ lau sậy có xương cá; yêu tinh ở bãi đá tím có ma trơi; quân Triệu có lều đen viền đỏ.
- Bản làng: hai ba nhà sàn nhỏ, khói bếp, cờ trắng; về theo thì cắm cờ đỏ, có người đi lại. Đặc sản: phù sa đất nâu thẫm có lau, núi đá xám lộ, mỏ sắt đá đỏ gỉ. Của chôn: gò đất lóe ánh đồng.
- Trinh sát là người chạy cầm cờ lệnh nhỏ (lính đi bộ có khung xương). Camera kéo được sang bờ bên kia khi đã có cầu.
- **Nặng máy**: lưới 72×72 nhiều gấp chừng 1,7 lần số ô; tìm đường A* cũng rộng ra chừng ấy. Đo khung hình ở khổ `fold` ngay từ PR 1; nếu tụt thì gộp rừng bên kia thành ít mesh, tắt bóng đổ bên kia, chỉ tìm đường trong vùng có giặc.

**Giao diện**
- Bảng Xây dựng có thẻ Cầu, và (PR 5) Đồn biên.
- Chạm khoảnh bên kia: bảng **Đất bên kia sông** ghi trạng thái, điểm lạ và một nút theo trạng thái: Sai trinh sát, Mở đất, Điều quân hay Kết thân. Nút mờ thì ghi lý do (cầu hư, đồn chặn, chưa tới chương…).
- Trinh sát đang đi thì có chip 🧭 đếm ngược trên thanh trên.
- Bảng Điện ghi số khoảnh bên kia đã dò, đã mở, số đồn đã dẹp, số làng về theo.

**Truyện**
- Thêm đoạn **"Bên kia sông"**, kể khi Điện lên cấp 4 (người đã qua mốc ấy thì thấy ngay khi vào game): Lạc hầu tâu bên kia sông Đà, sông Thao còn nhiều làng Lạc Việt bị giặc Ân đóng đồn ức hiếp; bắc cầu tre, sai trinh sát dò đường, đem quân dẹp đồn thì đất ấy về với Văn Lang.
- Các đoạn mở chương ("Vua Hùng kén rể", "Cột đá thề", "Cầu hôn") thêm một câu báo bên kia sông có đồn giặc mới (thủy quái, yêu tinh, quân Triệu), như cách đã nhắc Điện cấp 6–8.
- Không thêm nhiệm vụ Lạc hầu, để khỏi dời số thứ tự nhiệm vụ của người đang chơi.

**Bản lưu** (PR 1 làm trước phần khoảnh tự chọn nên lấy **phiên bản 12**; khoảnh tự chọn, cây đá mọc và chương 4 lấy số kế tiếp khi làm)
- Mảng độ cao dàn lại từ 55×55 sang 72×72; ô bờ bên kia lấy độ cao tự nhiên. Bước nâng mới nhận ra bản lưu 55×55 theo độ dài mảng độ cao, nên bản lưu kinh đô nhỏ vừa dựng lại ở bước 10 → 11 (đã theo lưới mới) được để nguyên.
- Trận giữ kinh đô đang dở thì đổi đường đi của giặc (lưu theo chỉ số ô) sang chỉ số ô mới, đánh tiếp được.
- Các PR sau thêm: khoảnh bên kia đã dò, đã mở; trinh sát đang đi (tới khoảnh nào, lúc nào tới); đồn đã dẹp; làng đã về theo, làng bị phá; số lính đóng ở mỗi đồn biên. Cầu và đồn biên là công trình như mọi công trình khác.

**Test**
- Lưới (`benKia.test.ts`): sông Thao tới ngã ba rồi đổ vào sông Đà, sông Đà chảy suốt; độ cao bên này y như trước khi nới lưới (so dấu vân tay); khi chưa có cầu thì lũ, giặc, vòng thành, mẫu kinh đô ra y như cũ (mọi test cũ giữ nguyên số).
- Cầu: chỉ đặt vắt qua sông, đầu bên này trên đất đã mở; giặc và quân đi qua được, cầu hư thì không; lũ cuốn cầu tre ở bậc 2, cầu gỗ ở bậc 3; vòng thành dựa vào sông hở khi có cầu.
- Trinh sát: giá, 40 giây, mở khoảnh đích và các khoảnh kề; một lúc một (hai từ Điện 6).
- Đồn: chặn khoảnh kề tới khi dẹp; cần đúng chương; độ khó từng đồn theo chuẩn; thưởng một lần.
- Mở đất: sát đất đã mở cùng bờ, giá nhích dần; đặc sản thêm 30% khi móng nằm trọn trong khoảnh; làng làm ra như công trình cùng nghề ở cấp Điện, không cần dân; cầu hư thì công trình bên kia không có người làm.
- Phòng thủ: một trong ba đợt giặc trên bộ tới từ bên kia khi bên kia có công trình; giặc bên kia nhắm làng rồi qua cầu; lính đóng ra trận từ đồn biên.
- Nâng bản lưu cũ lên phiên bản mới.

### Thứ tự làm

1. **PR 1: lưới qua sông** (đã làm, bản lưu v12): nới lưới lên 72×72, đất thật ở hai bờ bên kia (toàn rừng, chưa mở được), độ cao, nâng bản lưu. Luật chơi chưa đổi gì. Chi tiết đã làm:
   - **Tọa độ cảnh** giữ gốc ở tâm lưới 55×55 cũ (`HALF` = 27,5 trong `world.ts`), nên camera, ánh nắng, bóng đổ và ảnh chụp thử không xê dịch. Camera vẫn kéo trong vùng đất bên này; sang PR 2 có cầu mới kéo được qua sông.
   - **Nước** chỉ phủ hai dòng sông (mùa lũ dâng lên mà không tràn lên đất). Bờ bên kia chưa khai phá nên không ngập, như rừng bên này; mảng nước lũ phủ kín bờ bên kia trước đây bỏ đi.
   - **Thủy quái bỏ chạy** lặn ở mép sông bên kia như trước (ô 55), không bơi băng qua bờ bên kia.
   - **Thuyền** xuôi sông Thao tới ngã ba thì rẽ sang sông Đà; thuyền trên sông Đà chạy suốt.
   - **Nặng máy**: rừng hai bờ bên kia thêm chừng 880 cây. Chia rừng thành nhiều mảng nhỏ để bỏ qua mảng ngoài khung nhìn thì số lệnh vẽ tăng từ 60 lên 263, nên thôi. Cuối cùng rừng bên kia thưa hơn bên này một chút và **không đổ bóng**, rừng ngoài lưới sau bờ bên kia chỉ một dải thưa 5 ô. Cảnh vừa vào game: 60 → 76 lệnh vẽ, 1,56 → 1,87 triệu tam giác (thêm 20%); cảnh Điện 8: 1059 → 1073 lệnh vẽ, 1,53 → 1,84 triệu tam giác.
2. **PR 2: cầu, sương mù, trinh sát, điểm lạ** (đã làm), đoạn truyện "Bên kia sông". Số như bảng trên (giá cầu, lũ cuốn cầu, trinh sát 60 gạo 20 vỏ ốc, 40 giây). Chi tiết đã làm:
   - **Luật** ở `src/game/benKia.ts`: khoảnh bên kia, điểm lạ cố định, khoảnh bị đồn chặn, cầu (`bridgeFit`, đầu cầu), trinh sát. Cầu là hai loại công trình `cauDa` (2×3 ô, nằm ở hàng sông đầu tiên) và `cauThao` (3×2 ô), mỗi loại một cái. Ô cầu còn nguyên đi được (tìm đường, đếm vòng thành); cầu không phải đích của giặc, không chắn đường.
   - **Chạm để đặt cầu**: cầu bám theo sông, chạm đâu thì cầu dịch dọc sông tới đó. Cầu không dời được.
   - **Mây mù** chỉ hiện từ Điện cấp 4 (lúc kể đoạn "Bên kia sông"), để đầu chương 1 nhìn như cũ. Mây cuộn màu kem viền mực, mỗi khoảnh bảy cụm, ngọn cây nhô lên; khoảnh vừa dò thì mây phình ra, bay lên, mờ dần trong một giây. Góc đông nam (sau ngã ba) không thuộc khoảnh nào nên không có mây. Mây thêm chừng 90 nghìn tam giác, hai lệnh vẽ.
   - **Điểm lạ đã dò**: khoảnh ấy phát trống cả khoảnh. Đồn bậc 1 và 4 có rào cọc, lều, cờ; bậc 2 vũng bùn lau sậy xương cá; bậc 3 đá tím, ma trơi; mỗi đồn hai lính gác đứng yên đúng loại giặc. Làng: ba nhà sàn nhỏ, cờ trắng. Bãi phù sa: đất bùn nâu thẫm, vũng nước, khóm lau; núi đá đá xám; mỏ sắt đá đỏ gỉ. Của chôn: gò đất lấp ló mặt trống đồng. Đồn đã dẹp: đất cháy sém, cọc đổ, cờ đỏ của ta (dùng từ PR 3).
   - **Người trinh sát** (giáo binh có khung xương) chạy từ sân Điện qua cầu tới khoảnh đang dò, đúng nhịp đồng hồ chơi. Có chip 🧭 đếm ngược trên thanh trên; về tới nơi thì báo một dòng.
   - **Bảng Đất bên kia sông**: chạm đất bên kia (không trúng công trình). Ghi bờ, khoảnh thứ mấy, đã dò chưa, điểm lạ, lý do chưa khai phá được, nút Sai trinh sát kèm giá.
   - **Bản lưu** vẫn phiên bản 12 (PR 1, PR 2 cùng một đợt): thêm phần bên kia (khoảnh đã dò, đã mở, trinh sát, đồn đã dẹp). Cầu nằm trọn trên sông là hợp lệ.
3. **PR 3: đồn giặc và điều quân**: 12 đồn bốn bậc, hành quân qua cầu, bãi chiến bờ bên kia, cân bằng theo chuẩn.
4. **PR 4: mở đất bên kia, đặc sản, bản làng, của chôn**; sổ kinh tế.
5. **PR 5: phòng thủ hai bờ**: giặc từ bìa rừng bên kia, đồn biên và lính đóng đồn, người làm cần cầu.

- PR 4 cần cách mở khoảnh (PR 2 của kế hoạch kinh đô lớn, chưa làm), nên làm PR ấy trước.
- Khuyên làm PR 1 trước PR 2–4 chương 4: thủy binh cập bờ và mẫu kinh đô chương 4 đều đụng bản đồ, làm sau khi nới lưới thì khỏi sửa hai lần. PR 5 làm cùng hay ngay sau PR 2 chương 4, vì cùng sửa chỗ giặc xuất phát.

### Câu hỏi cần chủ dự án chốt

1. Bờ bên kia là đất thật trong cùng lưới kinh đô (khuyên dùng), hay một bản đồ vùng riêng?
2. Mở từ Điện cấp 4 ở chương 1 (khuyên dùng), từ đầu chương 2, hay sau màn hình Hết truyện?
3. Mở cả hai bờ (khuyên dùng), hay chỉ bờ nam sông Đà trước?
4. Đánh đồn ngoài bãi chiến kèm cảnh hành quân qua cầu (khuyên dùng), hay đánh ngay trên bản đồ kinh đô?
5. Bên kia cho đặc sản đất, bản làng và của chôn (khuyên dùng). Có muốn thêm cả số công trình tối đa (ví dụ mỗi bờ thêm 1 ruộng, 1 bãi đất đá) không?
6. Có cho giặc tới từ bên kia sông, và có đồn biên để chia quân giữ hai bờ không (khuyên có, làm ở PR 5)?
7. Lũ cuốn cầu tre, cầu hư thì người làm không sang được: giữ (khuyên dùng) hay bỏ cho nhẹ?
8. Làm ngay sau PR 2 kinh đô lớn, chen trước chương 4 PR 2–4 (khuyên dùng), hay để sau khi xong chương 4?
9. Tên gọi: "bờ nam sông Đà", "bờ đông sông Thao", tên bốn làng. Chủ dự án có muốn đặt tên riêng không?

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
3. doanh trại → luyện 5 lính (dựng trại giáo trước) → **đánh màn 1** → chòi canh → đánh lui đợt giặc đầu tiên → **qua màn 4**;
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
8. **Hội Tết bánh chưng bánh giầy** (đã làm, xem mục PR 3): truyện Lang Liêu, ruộng nếp, vườn đậu lá dong, chuồng lợn, bếp gói bánh (3 cấp mỗi loại), Tết 20 phút một lần, phúc lành Đất và Trời, cảnh Tết trước Điện, bản lưu phiên bản 9.
9. **Sửa sau chơi thử Hội Tết**: Thủy Tinh có hai phép, Dời non vẽ rõ hơn, xoay cảnh 4 hướng, dời công trình, mẫu kinh đô mỗi chương.
10. **Chương 4: Mỵ Châu, Trọng Thủy** (đã duyệt, đang làm; PR 1 đã làm; xem Kế hoạch chương 4): Điện và 7 loại công trình lên cấp 8, lầu nỏ, ụ nỏ trên thành, lính nỏ, thủy binh Triệu đi thuyền, Cao Lỗ, phó bản màn 25–32, Đền Cuông, màn hình Hết truyện, thử thách phó bản và huân công.
11. **Doanh trại và nơi ở riêng** (đã làm, xem mục cùng tên): doanh trại là nơi tướng ở và điều binh; trại giáo, trại cung, chuồng voi để luyện từng binh chủng; tướng ra trận từ doanh trại.
12. **Kinh đô lớn, công trình to, mở đất bằng khoảnh** (đã duyệt, đang làm; xem mục Kế hoạch cùng tên): công trình to hơn một ô mỗi chiều, lưới 55×55, khoảnh 5×5 tự chọn, viền cỏ, trang trí ô trống, cây đá mọc. Làm trước chương 4 PR 2–4.
13. **Vùng đất bên kia sông** (đề xuất, chờ duyệt; xem mục Kế hoạch cùng tên): nới lưới qua sông, cầu ba cấp, sương mù và trinh sát, đồn giặc bốn bậc theo chương, điều quân dẹp đồn, mở đất bên kia với đặc sản đất, bản làng và của chôn, giặc tới từ hai bờ và đồn biên.
14. **Để sau**: chương 5 về Hai Bà Trưng (mới nhắc ở câu cuối chương 4); nhạc nền.
