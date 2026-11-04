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
    - **Mái theo cấp** (nhìn mái để biết cấp, chung cho mọi công trình có mái): tới cấp 5 mái tranh; cấp 6 mái tranh có sống mái và diềm mái sơn đỏ; cấp 7 mái ngói đất nung đỏ cam như ngói thành Cổ Loa; cấp 8 mái ngói, sống mái và diềm mái bọc đồng vàng; cấp 9 thêm dải đồng hoa văn trống đồng (vòng tròn tiếp tuyến) rủ dưới diềm mái; cấp 10 thêm chim Lạc đồng dang cánh ở hai đầu nóc, đầu mái vút hơn. Mái nón, mái tròn thì viền là vành diềm mái và chóp mái (cấp 9 vành đồng hoa văn quanh diềm, cấp 10 chim Lạc trên chóp). Lầu nỏ mái như chòi canh cấp 8, lên cấp 2, 3 thì mái như cấp 9, 10. Đền và bốn công trình Hội Tết giữ mái tranh.
    - Cả bảng nằm ở `src/render/buildings.ts`.
  - **dân ăn mặc theo nơi làm việc**, mỗi nghề một dụng cụ và một động tác (`src/render/people.ts`):
    - nông dân quấn khăn, cầm cuốc, cúi cấy;
    - thương nhân mặc áo chàm, đội thúng, đi lại;
    - thợ đá vác đá, bổ cuốc chim;
    - thợ rèn đeo yếm da, quai búa;
    - thợ xẻ đeo yếm vải, kéo cưa xẻ; thợ mộc cầm rìu đẽo (xưởng mộc);
    - ngư dân đội nón lá, đeo giỏ cá, quăng chài (làng chài);
    - người giữ kho vác bao thóc;
    - phụ nữ mặc váy, đeo gùi;
    - Lạc hầu và lính gác đội mũ lông chim;
  - ruộng, bến, bãi đất đá, lò rèn, xưởng mộc, làng chài hiện **đúng số người đang làm**, tối đa bằng số chỗ đứng.
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
- **Khung giao diện ở kinh đô: dock dưới.** Chọn qua bản dùng thử so ba phương án trên chính màn hình chơi (A: góc màn hình, cột nút tròn hai bên; B: dock dưới; C: cột bên như thẻ tre, bảng mở từ bên phải). Cả bộ dùng thử cất ở PR #47 (commit `66ba2cd`, đóng không gộp). Khung cũ (thanh chip xuống ba hàng, băng báo và thẻ Lạc hầu xếp dưới) che gần một phần ba màn hình dọc; mở bảng thì gần như không còn thấy kinh đô.
  - **Dải tài nguyên** sát mép trên, trải hết bề ngang, viền răng cưa như hoa văn trống đồng: cấp Điện, các tài nguyên ghi số gọn (531, 6,1k, 48,6k, 1,2tr; số đỏ khi kho đầy), dân, nút cài đặt. Có người rảnh thì ô dân xanh, kèm số người rảnh; chạm ô dân để giao việc cho người rảnh như trước. Chạm phần tài nguyên thì thả bảng kho: số đúng, sức chứa, thu chi mỗi phút, dân, quân.
  - **Dock** năm thẻ ở đáy cho một tay bấm: **Quân** (mở bảng doanh trại, ghi số chỗ quân), **Phó bản**, **Xây dựng** nổi tròn ở giữa, **Tướng** (danh sách Gióng, Sơn Tinh, An Dương Vương, Cao Lỗ, mỗi tướng ghi tiến độ x/5, x/3 hay ⚔️ sẵn sàng, 💤 đang nghỉ; thẻ có dấu ⚔️ khi có tướng sẵn sàng), **Lạc hầu** (thẻ nhiệm vụ; thẻ dock ghi tiến độ, chấm đỏ "!" khi có thưởng chờ nhận). Quân, Phó bản mờ tới khi có doanh trại; Tướng mờ tới khi có tướng. Chạm lại thẻ đang sáng thì đóng bảng. Nút xoay cảnh nổi trên góc phải dock.
  - **Dòng tin** ngay trên dock gom mọi tin: giặc sắp tới, đang đánh, thiếu gạo, Tết, thuyền buôn, trinh sát đang đi. Tin gấp (giặc, đói) lên trước; nhiều tin thì nút "1/3 ›" lật từng tin; có tin mới thì về tin gấp nhất. Giặc đánh kinh đô thì nút kỹ năng hiện ngay trên dòng tin.
  - **Bảng trượt** mở ngay trên dock, cao tối đa 54% màn hình để còn thấy kinh đô (bảng Xây dựng, bảng doanh trại 62% cho khỏi cuộn). Màn rộng (cầm ngang, màn trong Fold5) thì bảng cao trọn mép phải, dock dồn sang phần còn lại bên trái.
  - Đang đặt, dời, trải, ghép công trình: dock và dòng tin ẩn, thanh dưới chỉ còn Hủy, Đặt và nút xoay cảnh; công trình xoay được thì thêm nút ↻ Xoay (xem mục Xoay công trình). Ngoài bãi chiến: dock và dòng tin ẩn, dải tài nguyên vẫn còn.
- **Màn hình vào game**: hiện mỗi lần mở game (tải trang), trước khi vào kinh đô.
  - Trên cùng là mặt trống đồng Đông Sơn làm biểu tượng: ngôi sao 14 cánh ở giữa, các vòng vạch, vòng tròn chấm giữa, răng cưa, và sáu chim Lạc bay ngược chiều kim đồng hồ (vòng chim xoay chậm). Dưới là tên game ("Thời đại" chữ nhỏ giãn, "Văn Lang" chữ to) và một dòng giới thiệu. Không có dòng tên các nhân vật.
  - Dưới cùng là thẻ tóm tắt bản lưu (chương đang chơi và tên truyện của chương, hay "Đã hết truyện"; cấp Điện; số dân; đã vắng bao lâu) và nút **Chơi tiếp**. Chưa xem đoạn truyện mở đầu thì coi là game mới: thẻ ghi "Kinh đô mới, chờ người dựng nước", nút là **Bắt đầu**. Góc trên có nút bật, tắt tiếng.
  - Màn hình hiện ngay khi trang tải, trong lúc dựng cảnh 3D; lúc ấy nút ghi "Đang dựng kinh đô…" và chưa bấm được. Dựng xong thì lớp phủ mờ đi, kinh đô của bản lưu hiện ra ở giữa màn hình (trên và dưới phủ màu giấy cho dễ đọc chữ), camera trôi chậm quanh chỗ nhìn ban đầu.
  - Luật chơi đứng yên ở màn hình này: thời gian nằm ở đây tính như lúc vắng mặt. Bấm nút thì nghe ba tiếng trống đồng, màn hình mờ đi, camera lướt về chỗ nhìn ban đầu, giao diện chính hiện ra, rồi mới tới bảng báo thu hoạch lúc vắng, kết quả trận và đoạn truyện đang chờ như trước.
  - Điện thoại cầm ngang: biểu tượng và tên bên trái, thẻ và nút bên phải.
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

- Lưới **76×76 ô** (từ bản lưu phiên bản 18; phiên bản 11–17 là 55×55, xem mục Kế hoạch: kinh đô lớn và Kế hoạch: vùng đất bên kia sông). Hai nhánh sông rộng 7 ô (ô 52–58) bao kinh đô ở phía nam và phía đông, gợi ngã ba Bạch Hạc: sông Thao phía đông chảy từ bắc xuống, đổ vào sông Đà ở góc đông nam; sông Đà chảy suốt về phía đông. Sông rộng 7 ô để bến chợ cấp 8 cùng hai thuyền buôn neo gọn giữa dòng, còn luồng cho thuyền qua lại sát bờ bên kia (trước bản lưu 18, sông trong lưới chỉ rộng 3 ô, nước vẽ lùi bờ bên kia ra ngoài lưới). Bên kia sông là bờ đông sông Thao và bờ nam sông Đà (từ ô 59, chưa khai phá). Hai cạnh bắc và tây là rừng; hai ô ngoài cùng luôn là rừng, chỗ giặc trên bộ xuất phát. Phía đông nam là biển Đông: bờ biển chạy chéo như bờ biển Bắc Bộ, góc đông nam sau ngã ba là cửa biển (xem mục Kế hoạch: biển Đông, bến thuyền khơi).
- Điện Vua Hùng (móng 5×5) ở ô (37, 37). Đất giữa dải rừng ngoài cùng và sông chia thành **10×10 khoảnh 5×5**. Lúc đầu mở sẵn 16 khoảnh ở góc sông (vùng **20×20**); muốn thêm đất thì **phát rừng** từng khoảnh, người chơi tự chọn, phát bao nhiêu tùy ý, giá tăng từng nấc (xem mục Khoảnh đất).
- Công trình nhiều ô: mười bốn loại (Điện, ruộng, bến, nhà sàn, bãi đất đá, lò rèn, kho, doanh trại, trại giáo, trại cung, chuồng voi, vườn đậu lá dong, chuồng lợn, bếp gói bánh) vẽ lại trên trọn móng, có sân, lối, rào theo bản vẽ (xem mục Vẽ lại công trình trên móng). Xưởng mộc, làng chài là công trình mới, vẽ thẳng trên móng theo bản vẽ. Các loại còn lại (bốn đền, ruộng nếp) vẫn là mô hình móng cũ phóng theo móng mới, chừa viền cỏ chừng 12% móng.
- Ô đất có **độ cao theo bậc** ngay từ đầu game (xem mục Độ cao ô đất ở chương 2). Chương 1 chỉ để nhìn; từ chương 2 độ cao quyết định ô nào ngập lũ.

### Khoảnh đất (bản lưu phiên bản 12, đã làm)

Học cơ chế mở đất của Forge of Empires, Elvenar: đất chia khoảnh, người chơi tự chọn khoảnh nào, trả tiền là mở ngay.

Lúc đầu mỗi cấp Điện chỉ cho phát tới một số khoảnh (lượt: 18, 24, 32, 38, 48, 60, 72, 80), giá 2–3% giá nâng Điện kế tiếp. Sau đó chủ dự án đổi: **đất bên này sông phát thoải mái, không giới hạn lượt, giá tăng từng nấc** theo số khoảnh đã phát; **đất bên kia sông không mua bằng của được, phải điều quân** dẹp đồn giặc mà chiếm (xem mục Kế hoạch: vùng đất bên kia sông).

- **Lưới khoảnh**: 10×10 khoảnh 5×5 phủ ô 2..51. Không khoảnh nào chạm sông hay dải rừng ngoài cùng (hai ô sát mép bắc, mép tây, chỗ giặc trên bộ ẩn nấp; chạm vào đó thì báo "Rừng thiêng ngoài cùng").
- **Lúc đầu** mở sẵn 16 khoảnh ở góc sông (vùng 20×20), Điện nằm giữa.
- **Không giới hạn lượt**: cấp Điện nào cũng phát được, đủ của thì phát được hết 84 khoảnh rừng bên này sông (cả 100 khoảnh, chừng 50×50 ô). Dải rừng ngoài cùng (hai ô sát mép bắc, mép tây) không thuộc khoảnh nào nên vẫn là rừng, giặc trên bộ vẫn có chỗ hiện ra. Số công trình tối đa vẫn theo cấp Điện, nên đất rộng chỉ cho kinh đô thoáng hơn chứ không thêm sản lượng.
- **Phát được** khi khoảnh chạm đất đã mở theo bốn hướng, không có giặc, lũ hay trinh sát báo, đủ của.
- **Giá tăng từng nấc** theo số khoảnh đã phát, không theo cấp Điện; chỉ gạo và vỏ ốc. Khoảnh thứ 17 (khoảnh phát đầu tiên) giá 20 gạo, 15 vỏ ốc (`KHOANH_COST_BASE`); mỗi khoảnh phát thêm thì khoảnh sau đắt hơn 6% (`KHOANH_COST_STEP`), cứ chừng 12 khoảnh giá gấp đôi. Làm tròn dưới 100 tới đơn vị, dưới 1000 tới 5, từ 1000 tới 10, nên nấc nào cũng đắt hơn nấc trước. Sức chứa kho theo cấp Điện tự chặn các nấc giá cao.

  | Khoảnh thứ | 17 | 18 | 19 | 25 | 33 | 41 | 49 | 61 | 73 | 81 | 91 | 100 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | Gạo | 20 | 21 | 22 | 32 | 51 | 81 | 130 | 260 | 525 | 835 | 1490 | 2520 |
  | Vỏ ốc | 15 | 16 | 17 | 24 | 38 | 61 | 97 | 195 | 390 | 625 | 1120 | 1890 |
  | Cộng dồn gạo | 20 | 41 | 63 | 229 | 564 | 1097 | 1945 | 4260 | 8915 | 14395 | 26025 | 44205 |

  Phát hết rừng tốn chừng 44 nghìn gạo, 33 nghìn vỏ ốc: chỗ tiêu cho cuối game khi gạo tràn kho. Người chơi mô phỏng chỉ phát khi hết chỗ thoáng và vẫn giữ được phần dành để nâng Điện: tới Điện 8 phát 16 khoảnh (32 khoảnh đất), tiêu chừng 510 gạo, 385 vỏ ốc, chưa tới 1% số chi; nhịp lên Điện gần như không đổi (lên Điện 8 sớm chừng 2 phút).
- **Gỗ khi phát rừng**: cây chặt được số gỗ bằng nửa số gạo của giá khoảnh, làm tròn 5, ít nhất 10 (`khoanhWood`; xem mục Kế hoạch: cổng thành, xưởng mộc, làng chài). Giá tăng từng nấc nên khoảnh đầu chỉ được 10 gỗ, khoảnh thứ 49 được 65 gỗ, khoảnh cuối được 1260 gỗ; người chơi mô phỏng tới Điện 8 được chừng 260 gỗ từ phát rừng (trước kia 610).
- **Chạm** vào rừng chưa phát thì mở bảng **Khoảnh rừng**: khoảnh tô vàng; bảng ghi số khoảnh đã mở trên 100, giá, giá khoảnh sau (nấc kế tiếp), nút Phát rừng, hay lý do chưa phát được (chưa sát đất, đang có giặc, thiếu của). Khoảnh ven sông có ghi chú: dựng được bến nhưng mùa lũ dễ ngập.
- **Hình ảnh**: rừng thưa dần ở bìa đất đã mở; khoảnh phát được (sát đất đã mở) thì cây thưa hơn và có **cọc mốc** tre buộc vải đỏ ở bốn góc.
- **Rừng nhẹ máy**: rừng có cả nghìn cây nên là phần nặng nhất của cảnh. Mật độ rừng 0,3 (trước 0,7), cây gỗ vẽ ở độ chi tiết 0,5, bụi tre rừng 5–6 thân (trước 9–10), lá tre 3 mặt. Cảnh kinh đô Điện 5 chừng 4 triệu tam giác (trước 10,7 triệu). Lũy tre giữ đủ thân.
- Bảng Điện ghi "Khoảnh đất đã mở n/100". Lên cấp Điện không tự mở đất, chỉ báo Điện lên cấp như thường.
- Rừng chưa phát giặc vẫn đi qua được; lũ không loang vào rừng chưa phát. Giặc trên bộ xuất phát ngoài mọi ô đã mở (dải giặc tính từ ô nhỏ nhất đã mở, `openStart`).
- Mẫu kinh đô: chỗ của mẫu nằm trong rừng chưa phát thì bỏ qua; bảng mẫu ghi mẫu còn mấy khoảnh chưa phát.
- Người chơi mô phỏng: hết chỗ thoáng để dựng thì phát khoảnh gần Điện nhất (bến thì khoảnh ven sông), miễn vẫn giữ được phần dành để nâng Điện.
- **Bản lưu phiên bản 11 → 12**: đất hình vuông theo cấp Điện (cạnh 20, 25, 25, 30, 35, 40, 40, 45) đổi thành đúng các khoảnh ấy, không công trình nào rơi ra ngoài. Phát tiếp thì giá tính theo số khoảnh đã có (Điện 6: 64 khoảnh, khoảnh sau 330 gạo, 245 vỏ ốc). Bỏ lượt không cần nâng bản lưu: danh sách khoảnh giữ nguyên.
- Code: `khoanh.ts` (`khoanhCost`, `khoanhCostAt`), bảng `src/ui/khoanh.ts`, test `khoanh.test.ts`.

## Kinh tế

- 5 tài nguyên: **gạo, vỏ ốc** (làm tiền, vì thời Văn Lang chưa có tiền xu), **đất đá, sắt**, và **gỗ** từ xưởng mộc (từ Điện 2, xem mục Kế hoạch: cổng thành, xưởng mộc, làng chài).
- **Dân làng** đến từ nhà sàn và được phân công vào ruộng, chợ, bãi đất đá, lò rèn, xưởng mộc, làng chài, bến thuyền khơi. Dân và lính ăn gạo theo thời gian; có làng chài (hay bến thuyền khơi) thì ăn cá trước, thiếu mới ăn gạo. Thiếu gạo thì mọi việc sản xuất chậm còn một nửa và không luyện thêm quân được. Không ai chết đói.
- **Chợ thuyền**: tự sinh vỏ ốc theo số dân làm ở chợ. Khoảng 5 phút có một thuyền buôn cập bến với 3 lời mời đổi hàng, thuyền rời bến thì lời mời hết hạn.
- Nâng cấp **xong ngay** khi đủ tài nguyên. Không có đồng hồ đếm ngược hàng giờ.
- **Điện Vua Hùng** lên tối đa cấp 5 trong chương 1. Không công trình nào được vượt cấp Điện Vua Hùng.

### Dân làng (đã làm ở lát cắt 2a)

- Bắt đầu có 4 dân. Điện Vua Hùng cho 4–8 chỗ ở theo cấp, mỗi nhà sàn cho 4–12 chỗ.
- Còn chỗ ở và không thiếu gạo thì cứ **30 giây có thêm một người dân**.
- Mỗi người dân ăn **0,4 gạo/phút**.
- Ruộng, bến chợ thuyền, bãi đất đá, lò rèn, xưởng mộc, làng chài có **số chỗ làm theo cấp**, và chỉ làm ra đủ sản lượng khi đủ người.
- Xây hay nâng cấp xong, dân rảnh tự vào làm. Người chơi chỉnh bằng nút − / + trong bảng công trình, hoặc chạm vào ô dân 👥 để chia đều dân rảnh.
- **Thiếu gạo** (hết gạo mà gạo làm ra không đủ ăn) thì mọi sản lượng còn một nửa và dân không về thêm.
- **Kho thóc** cộng thêm sức chứa cho mọi tài nguyên. **Lò rèn** cần Điện cấp 2.
- **Thành đất**: là lũy tre nâng lên cấp 2, tốn đất đá, cần Điện cấp 3.
- **Thuyền buôn**:
  - Chỉ đến khi có bến, lần đầu sau khoảng 2 phút chơi, sau đó 5 phút một lần, mỗi lần đậu 90 giây.
  - Mỗi chuyến có 3 lời mời đổi hàng, trả hơn giá trị khoảng 15%. Chưa có Điện cấp 2 thì chưa buôn sắt. Có xưởng mộc thì thêm lời mời thứ tư về gỗ.
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
| Xưởng mộc | 3×3 | Ra gỗ, cần Điện cấp 2 |
| Làng chài | 3×3 | Ra cá cho dân và lính ăn thay gạo. Phải sát bờ sông, cần Điện cấp 3 |
| Bến thuyền khơi | 3×3 | Thuyền đánh cá lớn ra biển Đông: cá biển (ăn thay gạo) và vỏ ốc. Phải sát bờ sông, cần Điện cấp 8 (xem mục Kế hoạch: biển Đông, bến thuyền khơi) |
| Kho thóc | 3×3 | Tăng sức chứa tài nguyên, cũng là mục tiêu của giặc |
| Doanh trại | 4×4 | Nơi các tướng ở và điều binh: giữ chỗ quân, quân và tướng ra trận từ đây. Mỗi doanh trại một tướng chỉ huy, tối đa 4 (xem mục Nhiều doanh trại). Cấp 1 cho dựng trại giáo, cấp 2 trại cung, cấp 3 chuồng voi |
| Trại giáo, trại cung, chuồng voi | 3×3 | Nơi ở riêng của giáo binh, cung thủ, voi chiến. Luyện mỗi binh chủng ở nơi ở của nó (xem mục Doanh trại và nơi ở riêng) |
| Lũy tre → Thành đất | 1×1 | Tường. Lũy tre rẻ, có từ đầu. Thành đất chắc hơn, tốn đất đá, mở khóa khi Điện lên cấp |
| Chòi canh | 1×1 | Cung thủ tự bắn giặc |
| Bẫy chông tre | 1×1 | Gây sát thương cho giặc giẫm vào |
| Đền Phù Đổng | 4×4 | Có sau khi kết chương. Thêm 10% sản lượng mọi tài nguyên, thêm 10% máu và sức đánh cho quân ta |
| Đê đất → Kè đá | 1×1 | Có từ chương 2. Chặn nước lũ tràn từ sông vào |
| Đền Tản Viên | 4×4 | Có sau khi kết chương 2. Lũ dâng thấp đi một bậc |
| Thành Cổ Loa | 1×1 | Có từ chương 3. Đoạn thành đất nện cao, chắc; đắp nhiều vòng quanh Điện |
| Cổng thành | 1×1 | Có từ chương 3, Điện 5. Cửa trong vòng tường: giặc dồn về cổng, lính trên lầu cổng bắn (xem mục Kế hoạch: cổng thành, xưởng mộc, làng chài) |
| Hồ Kim Quy | 8×8 | Có khi Rùa Vàng hiện lên (thắng màn 19). Lũy, thành đất, thành Cổ Loa, cổng thành thêm 30% máu (xem mục Hồ Kim Quy) |
| Đền Cổ Loa | 4×4 | Có sau khi kết chương 3. Chòi canh bắn mạnh gấp rưỡi, xa thêm 1 ô |
| Đường đi, đồ trang trí | 1×1 tới 3×3 | Chỉ để nhìn (xem mục Đường đi và đồ trang trí) |

Giá đắp nền tính theo lõi móng (bỏ viền cỏ một ô), nên giữ như trước khi móng to ra.

## Quân đội và trận đánh

- 3 binh chủng khắc chế vòng tròn, mỗi binh chủng ta khắc một loại giặc tương ứng:
  - **giáo binh** thắng quân nặng (chiến xa);
  - **voi chiến** thắng cung thủ Ân;
  - **cung thủ** thắng lính giáo Ân.
- Luyện quân tốn tiền tuyển và gạo ăn hằng phút. Lính tách riêng khỏi dân làng (xem mục Giữ kinh đô). Mỗi binh chủng luyện ở nơi ở riêng; doanh trại càng cao càng điều được nhiều quân. Luyện xong ngay.
- **Giặc Ân**: lính giáo (cung thủ ta khắc chế), cung thủ (voi chiến ta khắc chế), **chiến xa** (giáo binh ta khắc chế). Cuối mỗi phần có tướng giặc làm trùm.
- Trận đánh **tự động** trong 20–40 giây trên bãi chiến 3D, lính chibi có động tác đơn giản. Người chơi chỉ bấm kỹ năng của tướng.
- Trước trận phó bản: xem trước quân giặc, chọn số lính mỗi loại trong giới hạn chỗ mang ra phó bản (38 từ Điện 5), xếp vào 3 hàng (tiền quân, trung quân, hậu quân).
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

- **Doanh trại** cần Điện cấp 2. Sức chứa quân theo cấp: 8, 14, 20, 28, 38 chỗ. Có thêm tướng thì dựng thêm doanh trại, chỗ quân cộng dồn; mỗi trận giữ kinh đô chỉ ra số lính đã bố trí (xem mục Nhiều doanh trại).
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

- **Doanh trại** giữ nguyên giá, cấp và sức chứa (8, 14, 20, 28, 38 chỗ, tính chung mọi binh chủng). Không có doanh trại thì không luyện được, không đánh phó bản được. Nút "Nghênh chiến ngay" vẫn ở doanh trại. Về sau có nhiều doanh trại, mỗi trại một tướng chỉ huy (xem mục Nhiều doanh trại).
- **Nơi ở riêng**: móng 3×3, dựng một lần, không lên cấp (mái tranh), không dỡ được, dời được như công trình khác. Còn nguyên mới luyện được; hư thì phải sửa trước. Lính đã luyện vẫn ra trận dù nơi ở hư.

  | Nơi ở | Binh chủng | Cần | Giá dựng | Máu |
  |---|---|---|---|---|
  | Trại giáo | giáo binh | Điện cấp 2, doanh trại cấp 1 | 40 gạo, 30 vỏ ốc, 30 đất đá | 300 |
  | Trại cung | cung thủ | Điện cấp 2, doanh trại cấp 2 | 60 gạo, 50 vỏ ốc, 50 đất đá, 10 sắt | 300 |
  | Chuồng voi | voi chiến | Điện cấp 3, doanh trại cấp 3 | 120 gạo, 80 vỏ ốc, 100 đất đá, 20 sắt | 400 |

  Giá nhỏ hơn doanh trại để không làm chậm nhịp chương 1; người chơi mô phỏng ở `balance.test.ts` không luyện quân nên nhịp lên Điện không đổi.
- **Tướng ở doanh trại**:
  - Gióng đã thành tráng sĩ, Sơn Tinh đã rước Mị Nương thì đứng giữa sân doanh trại. Gióng lúc nhỏ vẫn ở trước Điện cho dân nuôi; Sơn Tinh lúc cầu hôn vẫn đứng trên mỏm đá trước Điện. An Dương Vương là vua, vẫn đứng trước Điện cạnh cột đá thề. Chưa có doanh trại thì tướng đứng trước Điện như cũ;
  - khi giữ kinh đô, tướng ra trận cùng quân từ sân trước doanh trại (chưa có doanh trại thì từ trước Điện). Có nhiều doanh trại thì tướng ở và ra trận từ trại mình chỉ huy. Vì thế nên đặt doanh trại gần chỗ giặc hay lũ tới: test mùa lũ bậc 3 đặt doanh trại trong đê, gần phía sông như mẫu Đê bao; doanh trại ở góc rừng xa sông thì thủy quái kịp phá đê.
- **Bảng doanh trại**: dòng số chỗ quân trên cùng, dưới là bốn thẻ (chủ dự án yêu cầu chia thẻ cho khỏi cuộn xuống mới bố trí được; bảng nhớ thẻ đang xem, cao 62% màn như bảng Xây dựng):
  - **Quân**: mỗi binh chủng số lính, nút tới nơi ở, hoặc nút dựng nơi ở kèm giá khi chưa có (nút xuống hàng dưới tên binh chủng); lịch đợt giặc và nút Nghênh chiến ngay;
  - **Giữ kinh đô**: bố trí giữ kinh đô (xem mục Nhiều doanh trại);
  - **Tướng**: tướng chỉ huy (Lạc tướng cầm quân mọi trận; Gióng, Sơn Tinh, An Dương Vương, Cao Lỗ khi đã cùng ra trận, kèm trạng thái sẵn sàng, kiệt sức bao lâu hay hiển linh, nút Giao trại này và nút Xem mở bảng tướng); thẻ có dấu đỏ "!" khi trại chưa có tướng chỉ huy;
  - **Trại**: lời tả, cấp, số chỗ trại này giữ, nút Dời, Xoay, Nâng cấp, Đắp nền; thẻ có dấu ⬆ khi nâng cấp được.
  Doanh trại hư thì báo và nút Sửa nằm trên các thẻ, thẻ nào cũng thấy.
- **Bảng nơi ở**: số chỗ quân trong doanh trại, dòng binh chủng ấy với số lính, binh khí đã rèn và nút Luyện kèm giá.
- **Dáng**: trại giáo có lều lính mái chữ A, giá giáo đồng, hai cọc rơm tập đâm và một giáo binh đâm thử; trại cung có lán một mái tựa vách phên, giá cung, bao tên, bia rơm tròn vòng đỏ trắng có tên găm và một cung thủ nhắm bia; chuồng voi có bốn cột lớn đỡ mái chóp bốn mặt, rào gỗ, máng nước, đống cỏ, cọc buộc voi và một voi chiến đang ăn cỏ. Doanh trại bỏ cọc rơm tập đâm ở cấp 2 (đã sang trại giáo), thay bằng đài tướng có chiếu và lọng đỏ; giữa sân để trống cho tướng đứng.
- **Mẫu kinh đô**: cả ba mẫu có chỗ cho ba nơi ở, sát doanh trại. Áp mẫu chỉ dựng nơi ở khi doanh trại đủ cấp; doanh trại dựng theo mẫu tính là cấp 1, nên trại giáo dựng được cùng lúc.
- **Nhiệm vụ** giữ nguyên thứ tự. Lời Lạc hầu ở nhiệm vụ doanh trại nói dựng cho Lạc tướng ở và điều binh; nhiệm vụ luyện 5 lính nhắc dựng trại giáo trước.
- **Bản lưu** không đổi phiên bản. Bản lưu cũ giữ nguyên lính đã luyện; muốn luyện thêm thì dựng nơi ở (bảng doanh trại có nút dựng).
- Lính nỏ ở chương 4 cũng sẽ có nơi ở riêng (xem PR 2 chương 4).

### Nhiều doanh trại, tướng chỉ huy, bố trí giữ kinh đô (chủ dự án yêu cầu, đã làm)

Chủ dự án muốn có nhiều quân dự trữ: dựng thêm doanh trại, mỗi doanh trại một tướng chỉ huy; phó bản vẫn chỉ mang tối đa 38 chỗ để không phá độ khó; giữ kinh đô thì người chơi tự bố trí lính, số lính bố trí được giới hạn theo cấp. Chủ dự án chọn "mỗi tướng một trại" (khuyên dùng) thay vì mở trại theo cấp Điện. Luật ở `src/game/doanhTrai.ts`, test ở `doanhTrai.test.ts`.

- **Tướng chỉ huy**: mỗi doanh trại một tướng; doanh trại có tướng chỉ huy mới giữ chỗ quân (8–38 theo cấp). Bốn tướng:

  | Tướng | Có khi |
  |---|---|
  | Lạc tướng | từ đầu |
  | Thánh Gióng | thành tráng sĩ (đủ 5 mốc gạo, 3 món đồ sắt); về trời rồi vẫn chỉ huy, hiển linh |
  | Sơn Tinh | rước Mị Nương (đủ 5 lễ vật); về núi rồi vẫn chỉ huy |
  | An Dương Vương | có nỏ thần; xuống biển rồi vẫn chỉ huy, hiển linh |
  | Cao Lỗ | thắng màn 25 (chương 4) |

  - Có bao nhiêu tướng thì dựng được bấy nhiêu doanh trại, tối đa 5 (cần Điện cấp 2 như trước). Cao Lỗ là tướng thứ năm, chỉ huy được doanh trại thứ năm theo đúng quy tắc mỗi tướng một trại (tự chọn khi làm chương 4 phần 3, chủ dự án đã duyệt). Hết tướng rảnh thì bảng Xây dựng báo "Mỗi doanh trại cần một tướng chỉ huy".
  - Doanh trại mới tự nhận tướng rảnh theo thứ tự trên. Trong bảng doanh trại, nút **Giao trại này** đổi tướng chỉ huy; tướng ấy đang chỉ huy trại khác thì hai tướng đổi chỗ cho nhau, nên không trại nào mất tướng. Đang có giặc thì không đổi được.
  - Tổng chỗ quân là chỗ của mọi doanh trại có tướng: bốn trại cấp 5 là 152 chỗ, năm trại là 190 chỗ. Luyện quân như cũ, ở nơi ở riêng của binh chủng; chỉ cần một trại giáo, một trại cung, một chuồng voi cho cả kinh đô.
  - Tướng đứng ở sân doanh trại mình chỉ huy (Gióng tráng sĩ, Sơn Tinh đã rước dâu). An Dương Vương vẫn đứng trước Điện, dù chỉ huy trại nào.
  - Khi giữ kinh đô, tướng của trận (như cũ: An Dương Vương, Sơn Tinh hay Gióng) ra từ trại mình chỉ huy; không chỉ huy trại nào thì ra từ trại của Lạc tướng. Mỗi trận vẫn một tướng.
- **Phó bản**: mỗi trận mang tối đa số chỗ theo cấp Điện, bằng sức chứa doanh trại cao nhất dựng được ở cấp ấy, không quá 38:

  | Điện | 2 | 3 | 4 | 5–8 |
  |---|---|---|---|---|
  | Chỗ mang ra phó bản | 14 | 20 | 28 | 38 |

  Nhờ vậy hai doanh trại cấp 3 (40 chỗ) ở chương 1 vẫn chỉ mang 20 chỗ như trước, quân mẫu các màn không đổi. Bảng xếp quân ghi "Mang theo: x/38 chỗ", nút + tắt khi đủ chỗ; mặc định mang hết, nhiều quá thì chọn bớt giữ tỉ lệ binh chủng. Xuất quân quá chỗ thì bị từ chối.
- **Bố trí giữ kinh đô** (mục **Bố trí giữ kinh đô** trong bảng mỗi doanh trại):
  - mỗi doanh trại có số lính mỗi binh chủng ra giữ kinh đô từ trại ấy; lính chưa bố trí là **quân dự trữ**, ở lại khi giặc, lũ, yêu tinh, quân Triệu tới. Bảng ghi số quân dự trữ mỗi binh chủng;
  - số chỗ bố trí được, cả kinh đô, theo cấp Điện (tới Điện 5 bằng số trước đây một doanh trại giữ được, nên độ khó chương 1 không đổi; từ chương 2 thêm 6 chỗ mỗi cấp, giữ trận kinh đô không quá nặng máy):

    | Điện | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
    |---|---|---|---|---|---|---|---|
    | Chỗ giữ kinh đô | 14 | 20 | 28 | 38 | 44 | 50 | 56 |

  - mỗi trại bố trí không quá sức chứa của trại ấy;
  - **tự động** (mặc định, bản lưu cũ): mọi lính giữ kinh đô cho tới đủ chỗ, giữ tỉ lệ binh chủng, chia ra các doanh trại theo sức chứa. Một doanh trại và ít lính thì y như trước;
  - bấm − + ở một trại là **tự bố trí**: bố trí tự động lúc ấy được giữ nguyên làm gốc rồi đổi. Nút **Bố trí tự động** quay về tự động;
  - lính bố trí chết thì quân dự trữ bù vào ngay; hết dự trữ thì trại dựng trước được lính trước, dòng binh chủng ghi "thiếu n";
  - lính bố trí ở trại nào thì ra trận từ trại ấy, nên đặt doanh trại gần chỗ giặc hay lũ tới và dồn lính về đó.
- **Mẫu kinh đô**: mẫu nào cũng chừa mỗi tướng thường có ở cấp Điện ấy một doanh trại: 1 ở Điện 2, 2 ở Điện 3–5, 3 ở Điện 6, 4 ở Điện 7, 5 ở Điện 8 (mẫu giãn theo đất tự xếp các trại thêm như doanh trại đầu). Áp mẫu chỉ dựng thêm doanh trại khi có tướng rảnh; doanh trại giữ tướng và bố trí khi dời.
- **Bản lưu** không đổi phiên bản: doanh trại có thêm hai trường tùy chọn (tướng chỉ huy, bố trí). Bản lưu cũ chưa có thì tướng tự nhận, bố trí tự động.

### Phó bản (đã làm ở lát cắt 3a)

- Thẻ **🗺️ Phó bản** trên dock bấm được khi đã có doanh trại (trước đó mờ).
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
  - chọn số lính mỗi loại mang theo (mặc định mang hết, tối đa số chỗ mang ra phó bản theo cấp Điện, 38 từ Điện 5; xem mục Nhiều doanh trại);
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
- **Gióng ở kinh đô**: đứng trước Điện, đổi dáng theo mốc gạo: cậu bé lên ba ngồi bệt trên chiếu, thiếu niên đứng ôm bát cơm đầy cạnh chồng bát đã ăn (từ mốc 2), tráng sĩ cưỡi ngựa sắt. Thành tráng sĩ thì về ở doanh trại (xem mục Doanh trại và nơi ở riêng). Chạm vào Gióng, vào Gióng trong thẻ Tướng trên dock, hoặc nút trong bảng Điện, bảng lò rèn, để mở bảng Gióng.
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
- Cảnh 3D: mỗi bậc cao 0,3 đơn vị. Nền đất kiểu **bờ vát** (chủ dự án chọn qua bản dùng thử so ba kiểu: vách đất, bờ vát, lát ô; thay cho mỗi ô một khối hộp):
  - đất dựng liền một khối, giữa ô phẳng đúng mặt ô (nơi đặt công trình, cây, lính);
  - ô cạnh ô thấp hơn thì dải mép rộng 0,3 ô dốc thoai thoải xuống; giữa hai ô đất thường, dốc nằm trong ô cao, ô thấp phẳng trọn ô; mặt dốc lẫn cỏ và đất, mép trên sáng hơn chân dốc; góc dốc làm mượt cho bậc chạy chéo khỏi răng cưa;
  - ô dưới móng công trình (mọi loại, kể cả đường đi, đồ trang trí, lũy, thành, đê, bẫy) và ô đầu cầu hai bên sông giữ phẳng tới tận mép, để nền công trình, đầu cầu không chìa ra lơ lửng trên dốc. Móng cao hơn đất thường bên cạnh (đắp nền) thì đất bên cạnh dốc lên tới chân móng (dốc nằm trong ô thấp, như chân nền đắp); móng giáp sông, giáp móng khác thấp hơn thì dựng vách đất đứng (bờ kè dưới bến, làng chài, mố đầu cầu);
  - màu cỏ loang theo nhiễu, liền qua mép ô (không còn ô cờ ba màu); đất đã mở sáng hơn rừng, bậc cao sáng màu hơn chút;
  - lưới ô lúc đặt công trình, khóm cỏ, cọc mốc, lính và trinh sát đi theo đúng mặt dốc;
  - nền nới ra ngoài lưới 14 ô theo bậc của ô mép, xa hơn là dải đất nối liền dưới rừng bao ngoài.
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

- Chạm vào Sơn Tinh (lúc cầu hôn đứng trên mỏm đá trước Điện, rước Mị Nương rồi thì ở doanh trại), vào Sơn Tinh trong thẻ Tướng trên dock, hoặc nút trong bảng Điện, bảng doanh trại, để mở bảng Sơn Tinh.

  | Lễ vật | Lấy ở đâu |
  |---|---|
  | Trăm ván cơm nếp | dâng 900 gạo |
  | Trăm nệp bánh chưng | dâng 700 gạo, 400 vỏ ốc |
  | Gà chín cựa | thắng màn 9 lần đầu |
  | Ngựa chín hồng mao | thắng màn 10 lần đầu |
  | Voi chín ngà | thắng màn 11 lần đầu |

- Đủ năm lễ vật thì Sơn Tinh rước Mị Nương và **cùng ra trận**:
  - mỗi trận một tướng: trận chương 2 (phó bản chương 2, mùa lũ) có Sơn Tinh, các trận khác có Gióng hiển linh. Chưa rước Mị Nương, hay Sơn Tinh đang kiệt sức, thì trận chương 2 có Gióng hiển linh;
  - **chọn tướng ở bảng xếp quân** (chủ dự án yêu cầu): trận phó bản chương 2 (cả thử thách, trừ Không tướng) có hai thẻ Sơn Tinh và Phù Đổng Thiên Vương, chạm để chọn, mặc định Sơn Tinh. Mỗi thẻ ghi kỹ năng của tướng; tướng đang kiệt sức thì thẻ mờ đi, ghi "Đang kiệt sức" (không đếm ngược từng giây để bảng khỏi vẽ lại liên tục, nuốt mất lần chạm). Trận chương 1, 3, 4 không có thẻ chọn, tướng ra trận theo thứ tự chọn sẵn; mùa lũ không có bảng xếp quân nên vẫn lấy Sơn Tinh trước;
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
  | 16 | Đỉnh Tản Viên | 12 tôm, 8 cá phun, 3 cá sấu, Thủy Tinh | ×1,8 | chỉ Sơn Tinh; Thủy Tinh có hai phép |

  - Mọi màn cần Điện cấp 5. Thưởng lần đầu từ 1200 gạo, 800 vỏ ốc, 600 đất đá, 150 sắt (màn 9) tới 3000 gạo, 2000 vỏ ốc, 2000 đất đá, 500 sắt (màn 16). Đánh lại được 30%.
  - Máu của màn 9–11 cao hơn màn 12–16 vì màn 9–11 có Gióng hiển linh hai kỹ năng, còn màn 12–14 Sơn Tinh mới có một kỹ năng.
  - "Cần Sơn Tinh" nghĩa là phải rước Mị Nương rồi mới mở màn. Ở màn 12–15 người chơi chọn Gióng hiển linh đánh thay được; Sơn Tinh kiệt sức thì Gióng tự ra thay, cả hai kiệt sức thì phải chờ. **Màn 16 chỉ Sơn Tinh ra trận** ("Chỉ Sơn Tinh mới địch nổi Thủy Tinh", `sonOnly`), vì cảnh kết chương là núi Tản Viên dâng dưới chân Sơn Tinh.
  - Máu giặc các màn 9–24 được đặt lại theo chuẩn cân bằng mới (xem mục **Chuẩn cân bằng phó bản**).
- Bãi chiến mới:
  - **đồi sim**: đồi lượn cao, mảng hoa sim tím;
  - **đồng ngập**: bãi chiến là một gò nổi giữa biển nước lũ, nhà sàn chìm nửa, thuyền trôi giữa đồng, chỗ đất chìm thì không có cây;
  - **đỉnh Tản Viên**: ba ngọn núi Ba Vì sau lưng giặc, mây vờn lưng chừng núi, nước lũ dưới chân.
  - Màn 10, 14 dùng bến sông; màn 11 rừng; màn 13 làng; màn 15 chân núi.
- Cân bằng đo bằng test theo **Chuẩn cân bằng phó bản**, với quân mẫu chương 2: 14 giáo, 12 cung, 4 voi (vừa 38 chỗ doanh trại cấp 5). Tướng là Gióng hiển linh ở màn 9–11, Sơn Tinh ở màn 12–16. Thủy Tinh không bấm kỹ năng thì thua.
  - Gióng hiển linh đánh thay ở màn 12–15 thì khó hơn Sơn Tinh (đo với 6 hạt giống): người chơi giỏi thắng cả bốn màn (màn 15 năm trên sáu lần); người chơi thường thắng màn 12–14 chừng hai trên ba lần, thua màn 15. Ở màn 16 Gióng chơi giỏi cũng thua gần hết, nên màn này chỉ Sơn Tinh. `chuong2.test.ts` canh Gióng chơi giỏi thắng màn 12–15, người chơi thường thua màn 15, chơi giỏi thua màn 16.

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
- Thẻ Tướng trên dock ghi số vòng ở dòng An Dương Vương (x/3); bảng Điện, bảng một đoạn thành và bảng An Dương Vương cũng ghi. Khi đang đắp thành, dòng gợi ý báo số vòng hiện có.
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

- Chạm vào An Dương Vương đứng trước Điện, vào An Dương Vương trong thẻ Tướng trên dock, hoặc nút trong bảng Điện, để mở bảng An Dương Vương: số vòng thành, ba bước để có nỏ thần, nút chế nỏ, kỹ năng.
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
- Trong thẻ Tướng trên dock, tướng nghỉ thì ghi 💤, kể cả khi Gióng đã về trời hay Sơn Tinh đã về núi (lúc khỏe thì tướng đã đi không còn trong danh sách).

## Kế hoạch: kinh đô lớn tiếp và Hội Tết (đã chốt, đã làm)

Chủ dự án đã chốt qua một buổi hỏi đáp. Vấn đề: từ cuối chương 1 mọi công trình đã ở cấp 5, kinh đô hết việc để xây, kho chạm trần. Mục tiêu là để kinh đô tiếp tục lớn qua các chương. Làm thành ba PR theo thứ tự:

1. **Sửa lỗi và cân bằng lại** (mục Chuẩn cân bằng phó bản ở trên).
2. **Cấp 6–7 và rèn binh khí**:
   - Điện Vua Hùng lên cấp 6 khi vào chương 2, cấp 7 khi vào chương 3. Người đang ở chương sau thì mở ngay;
   - đất mở ra 25×25 ở cấp 6, 26×26 ở cấp 7, chừa một hàng rừng cho giặc trên bộ hiện ra (kinh đô lớn: đất mở bằng khoảnh 5×5, phát thoải mái, giá tăng từng nấc, xem mục Khoảnh đất);
   - ruộng, bến chợ thuyền, nhà sàn, bãi đất đá, lò rèn, kho thóc, chòi canh lên được cấp 6, 7. Lũy, đê, thành Cổ Loa giữ cấp riêng;
   - mỗi cấp mới vẫn đổi hẳn dáng: thêm một phần lớn nhìn rõ (ví dụ ruộng cấp 6 có guồng nước, cấp 7 có miếu thần lúa); ban đầu cỡ giữ 105%, sau chủ dự án yêu cầu to thêm (xem mục Phong cách);
   - **doanh trại giữ 38 chỗ**, không lên thêm cấp, vì bãi chiến tối đa khoảng 60 người (về sau có thêm doanh trại cho quân dự trữ, nhưng mỗi trận phó bản vẫn mang tối đa 38 chỗ; xem mục Nhiều doanh trại);
   - **rèn binh khí** ở bảng lò rèn: giáo, cung, voi mỗi loại 2 bậc (bậc 1 cần lò rèn cấp 6, bậc 2 cần cấp 7), mỗi bậc thêm 10% máu và sức đánh ở mọi trận, lính đổi dáng vũ khí;
   - nhịp: người biết dành dụm lên Điện 6 trước màn 12, Điện 7 trước màn 20; canh bằng test như `balance.test.ts`.
3. **Hội Tết bánh chưng bánh giầy**:
   - mở khi kết chương 1 (người đang ở chương 2, 3 mở ngay). Lạc hầu kể chuyện Lang Liêu như chuyện xưa, trước "Vua Hùng kén rể"; chỉ là truyện, không có trò thi tính điểm;
   - công trình mới, cần dân làm: **ruộng nếp** (4×4), **vườn** đậu xanh và lá dong (3×3), **chuồng lợn** (3×3, lợn không ăn gạo), **bếp gói bánh** (3×3);
   - bếp làm bánh chưng nhanh bằng nguồn chậm nhất trong ba nguồn, bánh giầy chỉ cần nếp. Nguyên liệu không tích trữ; bảng bếp báo nguồn nào đang thiếu;
   - bánh tích trữ được, chỉ hiện trong bảng bếp và bảng Tết, không thêm ô trên dải tài nguyên;
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
| 6 | vào chương 2 | 4000 gạo, 4000 vỏ ốc, 3000 đất đá, 600 sắt | phát rừng tùy ý (trước kia lượt 60 khoảnh) | 14000 | 9 | 14, 7 | 1600 |
| 7 | vào chương 3 | 7200 gạo, 6400 vỏ ốc, 5600 đất đá, 1200 sắt | phát rừng tùy ý (trước kia lượt 72 khoảnh) | 22000 | 10 | 16, 8 | 1800 |

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
| 3 | lò rèn cấp 9 (sau truyện), đã rèn bậc 2 | 2000 sắt, 2000 vỏ ốc | thêm +10% (cộng 30%); thêm sau, xem mục Kế hoạch: Điện cấp 9, 10 |

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
- Từ Điện cấp 6, tướng đứng trước Điện (Sơn Tinh lúc cầu hôn, An Dương Vương cùng cột đá thề) ra đứng hẳn bên phải nền Điện, để khỏi che lầu trống bên phải. (Nay Điện vẽ lại có sân chầu: tướng đứng trong sân, bên phải lối giữa, ở mọi cấp; xem mục Vẽ lại công trình trên móng.)
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
- Bánh để trên gác bếp, tích trữ được. **Gác bếp chứa tối đa 30 → 45 → 60 cái mỗi loại theo cấp bếp (mới)**. Bánh chỉ hiện trong bảng bếp và bảng Tết, không thêm ô trên dải tài nguyên.

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
- Tết mở thì dòng tin trên dock báo "Tết đến, dâng bánh trước Điện" kèm giờ còn lại và nút Dâng bánh; dâng đủ hai loại rồi thì dòng tin chỉ còn đếm giờ Hội Tết. Nút trong tin mở bảng Tết, có hai nút dâng bánh chưng, dâng bánh giầy.
- Bảng Điện ghi phúc lành đang có. Thu chi mỗi phút trong bảng kho (chạm dải tài nguyên) đã gồm phúc lành Đất.

**Dáng công trình** (cỡ không quá 105%)

| Công trình | Cấp 1 | Cấp 2 | Cấp 3 |
|---|---|---|---|
| Ruộng nếp | khóm lúa nếp bông trĩu màu ngà, khác hàng lúa nhọn vàng của ruộng lúa | lúa dày hơn, bù nhìn rơm đội nón giữa ruộng | giàn tre phơi bó nếp bên bờ |
| Vườn đậu xanh, lá dong | hai luống đậu xanh thấp, một khóm lá dong lá to bản | thêm giàn tre cho đậu leo, chum nước tưới | rào tre quanh vườn, lều nhỏ có nong đậu phơi |
| Chuồng lợn | rào tre thấp, hai con lợn ỉ đen bụng phệ, máng gỗ | chuồng có mái tranh, thêm đàn lợn con | chuồng sàn gỗ, vũng bùn, bốn con lợn |
| Bếp gói bánh | kiềng ba hòn đá, nồi đồng to luộc bánh, lửa củi, chồng lá dong | thêm mái tranh che bếp, chõng tre có khuôn gói bánh | thêm cối đá chày gỗ giã bánh giầy, nồi thứ hai, khói bếp |

- Người làm: ruộng nếp và chuồng lợn là nhà nông, vườn và bếp là phụ nữ.
- Cảnh Tết, chỉ lúc Tết mở:
  - cây nêu trong sân chầu Điện, bên trái lối giữa: cây tre cao, ngọn còn chùm lá, treo dải vải đỏ và khánh đất nung;
  - dây cờ hội nhiều màu căng từ cây nêu tới hai cột cờ hai bên lối (Điện cấp 1 chưa có cột cờ thì tới hai cọc mốc góc trước);
  - thêm một người ngồi xếp bằng trên chiếu gói bánh của bếp, trong móng bếp (bếp đã có 2–3 người làm, thêm nữa thì chật);
  - dâng rồi thì có mâm bánh chưng vuông, bánh giầy tròn bày trước thềm Điện, trong sân chầu, tới hết Tết;
  - cây nêu và mâm bánh nằm trong móng Điện nên luôn dựng được, không phụ thuộc ô quanh Điện;
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
- Đang dời công trình xoay được thì bấm ↻ Xoay để đổi hướng cùng lúc (xem Xoay công trình).

**Xoay công trình** (chủ dự án yêu cầu; cách làm tự chọn, chủ dự án có thể đổi)
- Công trình móng vuông nhiều ô xoay được từng nấc 90° (`canRotateType` ở `game.ts`). Móng vuông nên xoay không đổi ô nào bị chiếm, chỉ đổi hướng mặt trước: sân, lối, người làm, thuyền neo quay theo mô hình.
- Không xoay: Điện Vua Hùng (đứng yên như khi dời), bến và làng chài (luôn quay mặt ra sông), cầu (theo dòng sông), công trình một ô (lũy, đê, thành, cổng thành tự quay theo tường, chòi canh, lầu nỏ, bẫy, đường, đồ trang trí một ô).
- Khi dựng: thanh dưới có thêm nút **↻ Xoay** (cạnh Hủy, Đặt và nút ⟳ xoay cảnh); mỗi lần bấm, bóng công trình quay một nấc theo chiều kim đồng hồ trên màn hình. Dựng tiếp cùng loại thì giữ hướng vừa chọn.
- Công trình đã dựng: nút **↻ Xoay** cạnh nút Dời trong bảng công trình, xoay tại chỗ, không tốn của, lúc nào cũng xoay được. Đang dời mà chỉ xoay, không đổi chỗ, thì cũng không tốn phí dời.
- Doanh trại xoay thì tướng đứng giữa sân, ra trận và quân hành quân tới đồn bên kia sông đều đi từ mặt trước đã xoay. Bếp gói bánh xoay thì người gói bánh dịp Tết ngồi theo.
- Bản lưu không đổi phiên bản: công trình có thêm trường tùy chọn `rot` (1–3 nấc); không có là hướng gốc. Hướng lạ thì bản lưu bị từ chối. `xoay.test.ts` canh.

**Mẫu kinh đô** (`src/game/mau.ts`, dựng bằng code theo vùng đất của từng cấp Điện)
- Mỗi chương mở một mẫu:

  | Mẫu | Mở khi | Nét chính |
  |---|---|---|
  | Kinh đô Phong Châu | từ đầu | bến và ruộng dọc hai bờ sông; trục từ Điện về góc rừng có đền Phù Đổng, doanh trại (giữa Điện và góc rừng), trại giáo, hai bên doanh trại là trại cung, chuồng voi, lò rèn; nhà sàn, kho, bếp quanh Điện; bãi đá trên đồi sát lũy; lũy tre liền một hàng ngay trong bìa rừng cả mặt bắc và mặt tây, bẫy chông ở hàng ngoài lũy, chòi canh ngay trong lũy |
  | Đê bao chống lũ | vào chương 2 | đê liền dải dọc hai bờ sông, cách sông 3 ô, chạy suốt tới bìa đất; bến ngoài đê; chòi canh sát đê trong; doanh trại ở góc đê gần ngã ba sông (kịp ra chặn thủy quái từ cả hai bờ), ba nơi ở quanh đó; đền trên trục về góc rừng; ruộng, ruộng nếp dọc đê; bẫy chông ở bìa rừng |
  | Thành Cổ Loa | vào chương 3 | ba vòng thành kín quanh Điện; vòng trong chỉ có Điện và sân; nhà sàn, kho, bếp giữa vòng trong và vòng giữa; lò rèn, vườn, chuồng lợn, đền Cổ Loa giữa vòng giữa và vòng ngoài; ngoài vòng ngoài một dãy 4×4 (doanh trại ở góc rừng, đền Phù Đổng, đền Tản Viên, ruộng, ruộng nếp) và một dãy 3×3 (ba nơi ở, bãi đá); đê bao ngoài cùng như mẫu Đê bao |
  | Cổ Loa giữ sông | vào chương 4 | như mẫu Thành Cổ Loa; thêm 16 ụ nỏ trên vòng ngoài chia đều bốn mặt, ba chỗ dành cho lầu nỏ (hai ở phía sông, một ở góc bắc tây), trại nỏ sát doanh trại, Đền Cuông ngoài vòng ngoài (xem mục PR 3 chương 4) |

- **Mẫu giãn theo đất** (chủ dự án yêu cầu sau khi có kinh đô lớn): mẫu không vẽ cứng một lần mà dựng lại cho từng cấp Điện, vừa trọn vùng đất đã khai phá ở cấp ấy.
- **Mẫu và khoảnh tự chọn** (chủ dự án chọn khi gộp khoảnh tự chọn): đất mở theo khoảnh người chơi chọn nên có hình bất kỳ, còn mẫu vẫn dựng trên **khung vuông** neo góc sông theo cấp Điện (cạnh 20, 25, 25, 30, 35, 40, 40, 45; `frameStart`, `inFrame` ở `mau.ts`). Lúc áp mẫu, chỗ nào của mẫu rơi vào khoảnh rừng chưa phát thì bỏ qua (công trình ấy tìm chỗ trống gần nhất như công trình không có chỗ trong mẫu); bản đồ thu nhỏ tô mờ những chỗ ấy và bảng mẫu ghi số khoảnh mẫu còn trong rừng. Khoảnh đã phát ngoài khung thì mẫu không dùng tới.
  - Lũy, đê, bẫy, chòi canh chạy theo bìa đất: nâng Điện, đất rộng ra thì áp lại mẫu, lũy và bẫy dời ra bìa mới, đê nối dài tới bìa mới.
  - Số đoạn theo cấp Điện: lũy Phong Châu 37, 47, 47, 57, 67, 77, 77, 87; đê 63 ở Điện 5, 73 ở Điện 6–7, 83 ở Điện 8.
  - Vòng thành Cổ Loa: phía sông ba vòng đứng sát nhau giữa sân Điện và đê; phía rừng vòng trong cách Điện 2 ô, vòng giữa cách vòng trong 3 ô (vừa một dãy nhà 3×3), vòng ngoài chừa ngoài nó 9 ô (bẫy, một dãy 4×4, một dãy 3×3) rồi nới ra theo đất. Thành 180 đoạn ở Điện 5, 200 ở Điện 6–7, 220 ở Điện 8, trong số tối đa.
  - Mỗi cấp mẫu có đúng số chỗ tối đa của mỗi loại ở cấp ấy. Doanh trại thì mỗi tướng thường có ở cấp ấy một chỗ: 1 ở Điện 2, 2 ở Điện 3–5 (Gióng thành tráng sĩ khi rèn xong giáp ở lò rèn cấp 3), 3 ở Điện 6, 4 ở Điện 7–8 (`MAU_BARRACKS`). Đền và bốn công trình Hội Tết chỉ có chỗ từ Điện 5, vì chỉ dựng được sau kết chương 1, mà màn cuối chương 1 cần Điện 5. Mẫu Đê bao, Cổ Loa mở theo truyện nên chỉ dùng từ Điện 5; ở cấp thấp hơn mẫu vẫn dựng được nhưng không bảo đảm đủ chỗ.
- Cách xếp:
  - Mẫu đối xứng qua đường chéo từ góc rừng tới ngã ba sông, cũng là trục màn hình lúc mới mở game, nên nhìn cân hai bên. Mỗi loại xếp từng cặp đối xứng; số lẻ thì cái còn lại đứng trên đường chéo.
  - Mỗi loại một cách chấm chỗ: gần Điện, dọc sông, trên đồi sát bìa rừng, quanh doanh trại, trên trục chéo; Cổ Loa thêm khu theo số vòng thành bao quanh.
  - Giữa các công trình nhiều ô chừa lối đi một ô; sát tường được. Đất chật quá (Cổ Loa ở Điện 5) thì một vài khối đứng sát nhau.
  - Trước Điện (phía nam) và bên phải Điện (phía đông) chừa sân 2 ô. Trước kia để cây nêu, mâm bánh và tướng đứng; nay những thứ ấy ở trong sân chầu của Điện, sân 2 ô giữ làm lối ra.
- Vòng thành Cổ Loa trong mẫu là vòng kín quanh Điện, không chạm sông: thành không chặn nước như đê, nên vòng nào cắt ngang dải đê để chạm sông sẽ làm nước lọt vào.
- **Áp mẫu**:
  - mỗi công trình đang có dời vào chỗ cùng loại gần nhất trong mẫu; cái nào đã đứng đúng chỗ thì giữ nguyên;
  - chỗ còn trống trong mẫu thì dựng thêm, tới số tối đa theo cấp Điện hiện tại, nếu loại ấy đã mở;
  - mẫu dùng là mẫu của cấp Điện hiện tại, nên mọi chỗ đều trong vùng đã khai phá;
  - đoạn lũy, đê, thành, bẫy thừa so với mẫu, hay vướng chỗ của mẫu, thì dỡ đi, không trả lại của;
  - công trình không có chỗ trong mẫu mà vướng thì tìm chỗ trống gần nhất;
  - không còn chỗ nào thì không áp được.
- Giá áp mẫu bằng giá dựng phần thêm cộng 10% giá dựng mỗi công trình phải dời. Phải đủ tài nguyên mới áp được. Đang có giặc thì không áp được.
- Mẫu kinh đô là thẻ thứ tư trong bảng Xây dựng, bày như công trình (chủ dự án yêu cầu tách khỏi thẻ Công trình): ảnh lớn là bản đồ thu nhỏ của mẫu đang chọn, dưới là lưới bốn bản đồ nhỏ để chọn (mẫu chưa mở thì xám, ghi chương mở). Mẫu đang chọn có:
  - bản đồ thu nhỏ của mẫu ở cấp Điện hiện tại, vẽ từ bìa đất tới sông; rừng chưa phát vẽ mờ ở mép;
  - số công trình sẽ dời, dựng thêm, dỡ đi;
  - tổng giá;
  - nút Áp mẫu. Bấm hai lần mới áp, cho khỏi lỡ tay;
  - lời tả mẫu, số khoảnh rừng chưa phát mà mẫu có chỗ trong đó.
- Mở thẻ lần đầu thì chọn sẵn mẫu mới mở nhất. Lời giải thích cách áp mẫu nằm cuối thẻ.
- Test (`sapxep.test.ts`) canh các việc sau:
  - ở mọi cấp Điện, mẫu nằm trọn trong vùng đã khai phá, không chồng nhau, không lấn sông, bến sát sông, lũy/đê/thành/bẫy/chòi không quá số tối đa;
  - ở mọi cấp Điện mẫu mở được, mỗi loại đủ đúng số tối đa;
  - lũy, đê, bẫy chạy theo bìa đất ở từng cấp;
  - áp mẫu giữ cấp và người làm, trả đúng giá;
  - mẫu Đê bao và Cổ Loa giữ được lũ bậc 3 ở Điện 5–8;
  - mẫu Cổ Loa cho đủ 3 vòng thành ở Điện 5–8, vòng ngoài không co lại khi đất rộng ra;
  - nâng Điện rồi áp lại: lũy ra bìa mới, công trình giữ cấp;
  - đổi từ mẫu Phong Châu sang Cổ Loa vẫn xếp được.

## Đường đi và đồ trang trí (chủ dự án yêu cầu, đã làm)

Chủ dự án muốn thêm vật liệu trải đường (đất, đá...) và đồ trang trí (cây đa, giếng nước, ao làng, hoa, cỏ...) vào phần xây dựng. Các con số và luật dưới đây là tự chọn, chủ dự án có thể đổi.

**Bảng Xây dựng** có bốn thẻ chọn ở đầu bảng: Công trình, Đường đi, Trang trí, Mẫu kinh đô (xem mục Mẫu kinh đô). Mỗi lần chỉ hiện một nhóm, cho khỏi cuộn dài trên điện thoại; bảng nhớ thẻ đang xem.

Bảng Xây dựng bày theo kiểu trưng bày (chủ dự án chọn trong ba phương án thử, bỏ phần lật xem từng cấp): mỗi mục có ảnh vẽ từ chính mô hình công trình **cấp 1** thay cho icon. Trên là ảnh lớn của mục đang chọn, kèm tên, cỡ móng, số đã có, lời tả, giá và nút Xây (trải đường thì Trải đường, đồ trang trí thì Đặt); mục chưa xây được thì ghi lý do và nút mờ. Dưới là lưới ảnh nhỏ của cả nhóm, chạm để chọn; mục chưa xây được thì ảnh xám. Lưới **chia trang** (chủ dự án yêu cầu: trước phải cuộn xuống chọn rồi cuộn lên bấm Xây): điện thoại dọc mỗi trang 2 hàng × 5 cột (màn hẹp như màn ngoài Fold5 thì 4 cột), bảng bên phải màn rộng 4 cột, số hàng theo chiều cao màn; dưới lưới là nút ‹ › hai bên mép (giữa để trống chỗ nút Xây dựng tròn của dock), chấm trang và "Trang 1/3". Bảng cao 62% màn cho ảnh lớn, nút Xây và trọn một trang vừa bảng, khỏi cuộn; màn thấp phải cuộn thì ảnh lớn và nút Xây vẫn bám đầu bảng. Mở bảng, đổi thẻ thì về trang có mục đang chọn. Công cụ (Đắp đất, Dọn trang trí) giữ icon. Bảng nhớ mục đang chọn để xây tiếp cùng loại. Ảnh vẽ sẵn từ trước và đưa kèm game (chủ dự án thấy vẽ lúc chơi hiện chậm quá), vào game là tải sẵn, mở bảng là có ảnh ngay.

**Đường đi** (`ROAD_TYPES` ở `defs.ts`): móng 1×1, chạm từng ô để trải như lũy, hay **kéo thả** (chủ dự án yêu cầu: trải từng ô mất thời gian):
- Lúc trải đường, một ngón kéo trên cảnh là vẽ dải ô thẳng từ ô đặt ngón theo trục kéo dài hơn (ngang hay dọc lưới, kéo xiên vẫn ra đường thẳng; `lineTiles` ở `map.ts`); hai ngón vẫn kéo, phóng, xoay cảnh (thêm ngón thứ hai giữa chừng thì bỏ dải đang vẽ).
- Đang kéo: ô trải được tô xanh, ô không trải được tô đỏ; dòng gợi ý ghi "Thả tay để trải n ô" kèm giá cả dải.
- Thả tay thì trải từng ô theo thứ tự (`placeLine` ở `game.ts`): ô vướng công trình, ngoài vùng đất bỏ qua; ô đã có đúng loại đường ấy bỏ qua; ô đường loại khác thì đổi vật liệu như trải đè; hết của hay đủ giới hạn thì các ô sau không trải. Báo số ô đã trải, có ô hỏng thì báo lý do của ô hỏng đầu.
- Chỉ đường đi kéo thả được; lũy, đê, thành, đồ trang trí vẫn chạm từng ô.

| Loại | Giá mỗi ô | Mở khi |
|---|---|---|
| Đường đất nện | 🐚 2 | từ đầu |
| Đường rải sỏi | 🪨 3 | Điện cấp 2 |
| Đường lát đá | 🐚 2, 🪨 6 | Điện cấp 3 |
| Đường lát gạch (gạch nung cùng lò với ngói Cổ Loa) | 🐚 6, 🪨 8 | vào chương 3 |

- Bốn loại chung một giới hạn số ô theo cấp Điện: 60, 90, 120, 160, 200, 240, 280, 280 (`ROAD_LIMIT`).
- Trải loại khác đè lên ô đường cũ thì đổi vật liệu, trả giá loại mới, không thêm ô (đầy giới hạn vẫn đổi được).
- Ô đường lát kín ô nên các ô liền nhau thành một lối. Mép ô không giáp ô cùng loại thì có viền: bờ đất có cỏ, viền sỏi to, bó vỉa đá, gạch dựng.

**Đồ trang trí** (`DECOR_TYPES`):

| Món | Móng | Giá | Mở khi | Số tối đa theo cấp Điện 1–8 |
|---|---|---|---|---|
| Cây đa (gốc to, rễ phụ buông, am thờ dưới gốc) | 2×2 | 🌾 80, 🐚 60 | Điện cấp 2 | 1, 1, 2, 2, 3, 3, 4, 4 |
| Giếng nước (thành đá ong, giá gàu, chum) | 1×1 | 🐚 20, 🪨 20 | Điện cấp 2 | 1, 2, 2, 3, 3, 4, 5, 5 |
| Ao làng (sen, lau sậy, cầu ao) | 3×3 | 🌾 60, 🐚 60 | Điện cấp 2 | 1, 1, 1, 2, 2, 2, 3, 3 |
| Khóm hoa (dâm bụt, cúc, mười giờ) | 1×1 | 🐚 3 | từ đầu | 10, 15, 20, 25, 30, 35, 40, 40 |
| Bãi cỏ (thảm cỏ điểm hoa dại, liền nhau thành thảm) | 1×1 | 🐚 1 | từ đầu | 20, 30, 40, 50, 60, 70, 80, 80 |
| Cây cau | 1×1 | 🌾 10, 🐚 5 | từ đầu | 4, 6, 8, 10, 12, 14, 16, 16 |
| Đống rơm | 1×1 | 🌾 8 | từ đầu | 2, 4, 6, 8, 10, 12, 14, 14 |

- Món một ô chạm từng ô để đặt như đường; cây đa, ao làng đặt như công trình (chọn chỗ rồi bấm Đặt).
- Cây đa, ao làng vẽ theo móng cũ rồi phóng theo móng mới, chừa viền cỏ như công trình (`footScale`); tán đa chìa ra quá móng một chút như đa thật.

**Luật chung** của đường và đồ trang trí (`isDecor` ở `defs.ts`):
- Chỉ để nhìn, không cho thêm tài nguyên hay sức mạnh gì.
- Giặc không nhắm phá, đi thẳng qua như đất trống. Lũ ngập tới đâu cũng không làm hư.
- Chiếm ô như công trình: nhà không dựng đè lên được, phải dọn đi trước. Nhà đứng cạnh đồ trang trí vẫn tính là chỗ thoáng khi gợi ý chỗ dựng.
- Dời được như công trình (10% giá dựng). Dọn đi không hoàn của, như dỡ lũy: bấm Dọn đi trong bảng của món ấy, hoặc dùng thẻ **Dọn trang trí** (🧹) trong nhóm Trang trí rồi chạm từng ô.
- Từ chương 2, đắp đất được ngay dưới ô đường hay món một ô (món nằm trên mặt đất mới); cây đa, ao làng thì đắp nền như công trình.
- Áp mẫu kinh đô: món vướng chỗ của mẫu thì dỡ đi (tính vào số dỡ đi), món không vướng thì giữ nguyên chỗ.
- Bản lưu không đổi phiên bản: chỉ thêm loại công trình mới.
- Vẽ theo lô cho nhẹ máy: đường và món một ô dù nhiều tới hàng trăm vẫn chỉ vài lệnh vẽ (`src/render/decor.ts`).
- Test: `trangTri.test.ts`.

## Kế hoạch chương 4: Mỵ Châu, Trọng Thủy (chủ dự án đã duyệt, đã làm)

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
- **Kinh đô lớn tiếp nhưng không thêm đất**: Điện cấp 8 và 7 loại công trình lên cấp 8. Số công trình tối đa giữ như Điện 7. Ở Điện 7, đất 26×26 đã ra sát mép, chỉ chừa một hàng rừng cho giặc trên bộ hiện ra. (Kinh đô lớn đổi lại: Điện 8 được phát rừng tới 80 khoảnh, chừng 45×45; sau đó bỏ lượt, phát rừng tùy ý, giá tăng từng nấc.)
- **Lầu nỏ**: hai chòi canh cấp 8 ghép thành một, không tách lại được.
- **Ụ nỏ** dựng trên đoạn thành Cổ Loa, không tốn thêm đất. Đây là cơ chế mới ở kinh đô; nhờ nó ba vòng thành mới có tác dụng trong trận.
- **Thủy binh Triệu** đi thuyền từ phía sông tới đánh kinh đô. Đây là lần đầu bờ sông phải lo giặc chứ không chỉ lo lũ.
- **Lính nỏ** là binh chủng thứ tư, đứng ngoài vòng khắc chế, chuyên hạ trùm và quân nặng.
- **Cao Lỗ** là tướng thứ tư. An Dương Vương giữ kinh đô tới khi xuống biển.
- **Màn 25–32**, **Đền Cuông**, mẫu kinh đô chương 4, 10 nhiệm vụ Lạc hầu (số 40–49).
- **Thử thách phó bản** cho mọi màn 1–32, thưởng **huân công** đổi lấy tăng sức nhỏ, giữ mãi.
- **Cách làm**: chủ dự án duyệt tài liệu này một lần, rồi làm 4 PR theo thứ tự ở mục cuối.

**Một chỗ đổi so với buổi hỏi đáp, chủ dự án đã duyệt**: buổi hỏi đáp chốt lính nỏ mở khi thắng màn 25 (đoạn 2). Nhưng lính nỏ làm ở PR 2, còn màn 25 tới PR 3 mới có. Nên **mở lính nỏ ngay khi vào chương 4 (đoạn 1)**, để người chơi có lính nỏ chống thủy binh ở kinh đô và có nhiệm vụ luyện lính nỏ trước màn 25. Đoạn 2 đổi tên thành "Cao Lỗ cầm quân": thắng màn 25 thì Cao Lỗ ra trận.

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
| 8 | vào chương 4 | 10400 gạo, 9200 vỏ ốc, 8000 đất đá, 1800 sắt | phát rừng tùy ý, tới 100 khoảnh, chừng 50×50 (kinh đô lớn; trước kia giữ 26×26, rồi lượt 80 khoảnh) | 32000 | 11 | 18, 9 | 2000 |

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
- Không tách lại được. Lúc đầu lầu nỏ không lên cấp; sau truyện lên được cấp 2, 3 (xem mục Kế hoạch: Điện cấp 9, 10).
- **Mỗi lầu nỏ tính là 2 chòi canh** trong số tối đa. Với 7 chòi canh tối đa thì có nhiều nhất 3 lầu nỏ và 1 chòi canh. Ghép không cho thêm công trình, chỉ dồn sức.
- Chỉ số: mỗi phát bắn **3 giặc khác nhau** (ít giặc hơn thì bắn chừng ấy), mỗi mũi 34 sát thương, tầm 5,5 ô, nghỉ 1,1 giây, máu 1400, móng 1×1 như chòi canh. Khi có từ 3 giặc trong tầm trở lên, lầu nỏ mạnh hơn hai chòi canh cấp 8 cộng lại khoảng 40%.
- Đền Cổ Loa còn nguyên thì lầu nỏ cũng bắn mạnh gấp rưỡi và xa thêm 1 ô như chòi canh.
- Ghép chỉ trống ra một ô mỗi lần. Đất không thiếu: kinh đô lớn theo mẫu Cổ Loa còn nhiều chỗ trống, đủ cho Đền Cuông 4×4 ở phía bắc, ngoài vòng thành ngoài.
- Áp mẫu kinh đô: lầu nỏ đứng vào chỗ chòi canh của mẫu và tính là hai chòi canh, chỗ còn lại dựng thêm chòi canh cho đủ số tối đa.
- Giao diện: bảng chòi canh cấp 8 có nút **🎯 Ghép thành lầu nỏ** kèm giá. Bấm thì thanh dưới chỉ còn nút Hủy và dòng gợi ý "Chạm vào một chòi canh cấp 8 khác còn nguyên để ghép". Chưa có chòi canh cấp 8 thứ hai thì nút mờ, có dòng báo. Bảng Điện cấp 8 ghi cỡ đất hiện có.

**Dáng mới** (móng giữ nguyên số ô; cỡ ban đầu giữ 105%, nay 120%, xem mục Phong cách)

| Công trình | Cấp 8 |
|---|---|
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
- Test (`cap8.test.ts`): Điện cấp 8 cần chương 4; kho 32000; bảy loại lên cấp 8 với số đã duyệt, số tối đa giữ như Điện 7; ghép lầu nỏ (Điện 8, hai chòi cấp 8 còn nguyên, không lúc có giặc, trả giá), không tách, không lên cấp, không dỡ; tính 2 chòi canh; mỗi phát bắn 3 giặc gần nhất, giặc thứ tư không trúng; áp mẫu; nâng bản lưu 9 lên 10. Nhịp lên Điện 8 ở `balance.test.ts`.

### PR 2: lính nỏ, ụ nỏ, thủy binh Triệu (chủ dự án đã duyệt, đã làm)

**Lính nỏ** (mở khi vào chương 4, luyện ở **trại nỏ**; số dưới đây là số cuối cùng)

| Binh chủng | Giá | Máu | Sát thương | Tầm | Nghỉ giữa hai phát | Tốc độ | Chỗ | Gạo ăn /phút |
|---|---|---|---|---|---|---|---|---|
| Lính nỏ | 50 gạo, 15 vỏ ốc, 10 sắt | 50 | 26 | 4,5 ô | 2,4 giây | 1,3 | 2 | 1,0 |

- Lính nỏ **đứng ngoài vòng khắc chế**: không có loại giặc nào được dành riêng cho lính nỏ. Lính nỏ đánh mạnh gấp đôi **quân nặng** (chiến xa, cá sấu, hổ tinh, kỵ binh, lính rìu) và **mọi trùm**.
- Bắn chậm, mỗi phát đau, ít máu, nên yếu khi bị áp sát. Mặc định đứng hậu quân cùng cung thủ.
- So với cung thủ: tính trên mỗi chỗ trong doanh trại thì đánh thường ngang nhau, nhưng gặp quân nặng và trùm thì lính nỏ gấp đôi.
- Rèn binh khí 2 bậc như ba binh chủng kia, cùng giá (sau truyện thêm bậc 3 cho cả bốn binh chủng). Dáng: bậc 1 mũi tên sắt, bậc 2 nỏ cánh sừng và bao tên đồng.
- Dáng: mũ đồng, giáp da, cầm nỏ gỗ lớn có lẫy đồng. Khi bắn thì quỳ một gối.
- Lính nỏ đứng ngoài vòng khắc chế, còn ba binh chủng kia nhận thêm thủy binh vào vòng: cung thủ thắng lính thủy, voi thắng cung thuyền, giáo binh thắng lính rìu.
- Rèn binh khí và dòng lính nỏ trong bảng doanh trại, bảng lò rèn chỉ hiện từ chương 4.

**Trại nỏ** (chủ dự án chọn trại nỏ riêng theo quy tắc mỗi binh chủng một nơi ở)

- Móng 3×3 như ba nơi ở kia (kinh đô lớn), dựng một lần, không lên cấp; vẽ theo móng cũ phóng theo móng mới, chưa vẽ lại trên móng như trại giáo, trại cung, chuồng voi. Mở khi vào chương 4, cần doanh trại cấp 5. Giá 600 gạo, 500 vỏ ốc, 500 đất đá, 120 sắt; máu 500.
- Dáng: lán mái ngói đỏ cam như ngói thành Cổ Loa, giá treo nỏ dưới lán, một cây nỏ lớn lẫy đồng trên giá gỗ chĩa ra trước, bia gỗ vuông vẽ vòng đỏ trắng, một lính nỏ quỳ một gối nhắm bia, cờ đỏ góc sau.
- Ba mẫu kinh đô chương 1–3 không có chỗ cho trại nỏ; mẫu "Cổ Loa giữ sông" (PR 3) có. Áp mẫu cũ thì trại nỏ đứng yên, vướng thì dời ra chỗ trống gần nhất.

**Ụ nỏ** (mở khi vào chương 4)

- Thẻ **Ụ nỏ** trong bảng Xây dựng: chạm vào một đoạn thành Cổ Loa còn nguyên để dựng ụ lên trên. Mỗi đoạn một ụ.
- Giá 150 vỏ ốc, 150 đất đá, 30 sắt. Tối đa 8 ụ ở Điện 7, 16 ụ ở Điện 8.
- Tự bắn một giặc trong tầm 4 ô, sát thương 14, nghỉ 1,4 giây.
- Ụ là một phần của đoạn thành: giặc không nhắm ụ làm đích. Đoạn thành bị phá thì ụ hư theo, sửa thành xong phải sửa ụ (30% giá). Dỡ đoạn thành thì mất ụ.
- Đền Cổ Loa còn nguyên thì ụ cũng bắn mạnh gấp rưỡi và xa thêm 1 ô.
- Dáng: ụ đất đắp cao trên mặt thành, mái tranh che nhỏ, một lính nỏ quỳ bắn quay mặt ra ngoài thành. Ụ hư (thành đã sửa mà ụ chưa sửa): ụ đất sạt, cột gãy, không người.
- Giao diện: thẻ **Ụ nỏ** trong bảng Xây dựng ghi số ụ đã có trên số tối đa; chọn thẻ rồi chạm từng đoạn thành. Bảng một đoạn thành có nút dựng ụ ngay trên đoạn ấy, ghi ụ đang bắn hay đang hư, và nút **Sửa ụ nỏ** (mờ khi thành còn hư). Nút "Sửa hết" sau trận sửa cả thành lẫn ụ.

**Thủy binh Triệu**

| Loại | Máu | Sát thương | Tầm | Ghi chú | Quân ta khắc chế |
|---|---|---|---|---|---|
| Lính thủy | 100 | 12 | 0,8 | cởi trần, khố đen viền đỏ, giáo ngắn; chạy nhanh | cung thủ |
| Cung thuyền | 60 | 12 | 3,8 | nón rộng vành đen, cung dài | voi chiến |
| Lính rìu giáp mây | 310 | 25 | 0,9 | giáp mây đan dày, rìu lớn; gấp đôi sát thương lên cung thủ ta | giáo binh, lính nỏ |
| Tướng thủy binh Triệu (trùm màn 28) | 1500 | 32 | 1,2 | giáp đen viền vàng, mũ lông chim đen, đao dài | lính nỏ |

- Thuyền giặc: thuyền đen mũi cong vểnh như móc câu, viền mạn đỏ, buồm đỏ có nẹp tre, mái chèo hai bên, khác hẳn thuyền trống đồng của ta.
- Dáng lính (có khung xương, `soldier.ts`): lính thủy cởi trần, khố đen viền đỏ, khăn đỏ buộc đầu, giáo ngắn; cung thuyền áo đen, nón lá rộng vành sơn đen, cung dài cao quá đầu; lính rìu khoác giáp mây phồng có đai đan ngang, rìu lưỡi sắt cán dài.

**Giữ kinh đô ở chương 4**

- **Lịch đợt**:
  - từ khi vào chương 4 tới đoạn 3: **thủy binh và lũ thay phiên**. Đợt thủy binh đầu tới 3 phút sau đoạn "Cầu hôn" (tính từ lúc nhận thưởng nhiệm vụ Đền Cổ Loa, cũng là lúc kể đoạn ấy);
  - từ đoạn 3 trở đi, kể cả sau Hết truyện: **ba đợt thay phiên**, thủy binh → quân Triệu trên bộ → lũ;
  - vẫn 15 phút một đợt, trinh sát báo trước 60 giây. Nút "Nghênh chiến ngay" gọi đợt kế tiếp.
- **Thủy binh** đợt thứ n: `9 + n` lính thủy (tối đa 18), `5 + n` cung thuyền (tối đa 12), `2 + ⌊(n + 1)/2⌋` lính rìu (tối đa 7), máu ×(2,0 + 0,12 × (n − 1)).
- **Thuyền**: mỗi thuyền chở 6 lính. Thuyền hiện ở mép sông phía nam hoặc phía đông, chèo vào bờ gần nhất, thả lính lên đất. Trinh sát báo hướng kèm dải đỏ trên mặt sông. Từ khi có biển Đông, trong lúc báo đoàn thuyền từ khơi vào cửa biển, ngược sông tới đúng chỗ ấy (xem Kế hoạch: biển Đông, bến thuyền khơi); trận không đổi.
  - Số cuối cùng (`BOAT`): thuyền hiện sát bờ bên kia, chèo 0,6 ô mỗi giây, các thuyền dàn đều dọc bờ, rời đi lệch nhau chừng 1,2 giây; lính xếp xen kẽ các loại để thuyền nào cũng đủ lính thủy, cung thuyền, lính rìu. Đợt 1 có 19 lính trên 4 thuyền.
  - Lính còn trên thuyền chưa bị bắn, chưa đánh, nhưng vẫn tính là giặc còn lại.
  - Lính lên bờ rồi tìm đường như giặc trên bộ: không lội sông, phải phá hay đi vòng đê, thành, lũy. Chúng nhắm kho rồi Điện như quân Triệu.
  - Thuyền không có máu, không bị bắn. Thuyền neo ở bờ tới hết trận rồi rút.
  - Mã sinh giặc hiện chọn mép gần hay xa theo cờ lũ (`battle.ts`), nên phải sửa để giặc trên bộ tới được từ phía sông.
- **Tướng giữ kinh đô**: thủy binh và quân Triệu có **An Dương Vương** tới khi xuống biển, sau đó là **Cao Lỗ**. Đang kiệt sức thì người kế tiếp ra thay: Cao Lỗ, rồi Sơn Tinh hiển linh, rồi Gióng. Mùa lũ vẫn có Sơn Tinh.
- **Từ đoạn 3, An Dương Vương không còn kỹ năng Nỏ thần khi giữ kinh đô.** Ô kỹ năng ghi "lẫy đã bị tráo". Ngài vẫn bắn nỏ thường, vẫn có Rùa Vàng. Ở phó bản, đánh lại màn 17–25 thì ngài vẫn đủ Nỏ thần, giống Gióng đã về trời vẫn đánh màn 5–8.
- Độ khó đo bằng test: đợt thủy binh đầu bị quân mẫu, tướng, 5 chòi canh và 8 ụ nỏ diệt hết, ở cả phía nam lẫn phía đông. Đo thêm: đợt đầu không ụ nỏ hay không tướng vẫn diệt hết; đợt 5 diệt hết nhưng mất chừng 11 lính; đợt 7 thì giặc phá được công trình và cướp của. Máu giặc giữ ×2,0 như đề xuất.
- Cờ "lẫy đã bị tráo" (`adv.layTrao`): bật lên thì lịch thành ba đợt thay phiên và An Dương Vương mất Nỏ thần khi giữ kinh đô. PR 3 bật cờ này khi thắng màn 28 lần đầu, cũng là lúc kể đoạn 3.
- Bản lưu lên **phiên bản 13** (sau kinh đô lớn v11 và khoảnh tự chọn v12): thêm số lính nỏ, bậc rèn, hàng đứng và chỗ bố trí giữ kinh đô của lính nỏ, các ụ nỏ (ghi trên đoạn thành), số đợt thủy binh đã đánh và đã giữ được, cờ lẫy đã bị tráo; đoạn "Cầu hôn" ghi vào danh sách truyện đã kể như các đoạn khác. Người đang ở chương 4 thì thủy binh tới sau 3 phút kể từ lúc nạp.
- Nhiệm vụ: nối thêm nhiệm vụ 42–44. Xong nhiệm vụ 44 thì bảng Lạc hầu báo kinh đô đã có lầu nỏ, ụ nỏ và lính nỏ, chờ phần sau.
- Test (`chuong4.test.ts`): luyện và rèn lính nỏ; lính nỏ gấp đôi sát thương lên quân nặng và trùm; dựng ụ trên thành, ụ hư theo thành; thuyền cập bờ phía nam và phía đông; lịch thay phiên; mất Nỏ thần ở kinh đô sau đoạn 3 nhưng vẫn còn ở màn 17–25; nâng bản lưu 12 lên 13.

### PR 3: Cao Lỗ, màn 25–32, truyện, Đền Cuông, mẫu kinh đô, Hết truyện (chủ dự án đã duyệt, đã làm)

Số dưới đây là số cuối cùng. Luật ở `src/game/caoLo.ts` (mốc màn, Cao Lỗ), `son.ts` (chọn tướng), `battle.ts` (kỹ năng, màn cầm cự), `campaign.ts`; test ở `caoLo.test.ts`.

**Cao Lỗ** (ra trận khi thắng màn 25)

- Tướng bắn xa thứ hai: 700 máu (ngoài bãi bền gấp 1,6), 20 sát thương, tầm 4,4 ô, nghỉ 1 giây. Mũi tên găm thêm nửa sát thương lên giặc quanh mục tiêu trong 1,3 ô như đòn các tướng khác. Ngoài bãi đứng giữa, lùi sau hàng đầu 1,8 ô như An Dương Vương.
- Hết máu thì kiệt sức, nghỉ 2 phút chơi.
- **Kỹ năng**:
  - **Nỏ liên châu** 🎯: một loạt tên rơi xuống chỗ giặc đứng đông nhất, mọi giặc trong 3,5 ô mất 120 máu. Hồi 12 giây. Theo truyền thuyết, nỏ của Cao Lỗ một lần bắn ra nhiều mũi;
  - **Lệnh bắn** 📯: có từ khi thắng màn 30. Trong 6 giây, mọi lính nỏ bắn nhanh gấp đôi; khi giữ kinh đô thì cả ụ nỏ và lầu nỏ cũng vậy. Hồi 22 giây;
  - ngoài bãi, sát thương kỹ năng nhân 1,6 như các tướng khác.
- Cân bằng: mạnh xấp xỉ An Dương Vương, đo bằng test. Với số ban đầu (600 máu, 18 sát thương; Nỏ liên châu 75 máu, 2,5 ô, hồi 16 giây) Cao Lỗ yếu hơn hẳn: cùng màn 24, người chơi thường có An Dương Vương chịu được máu giặc ×2,0, có Cao Lỗ chỉ ×1,2, kém cả Sơn Tinh hiển linh (×1,5). Nên tăng như trên (giống lần tăng Nỏ thần ở chương 3): màn 24 Cao Lỗ chịu được ×2,0, màn 26 ×2,2 (An Dương Vương ×2,3). Chủ dự án đã duyệt số đã tăng.
- Giữ kinh đô (thủy binh, quân Triệu ở chương 4): An Dương Vương tới khi xuống biển, rồi Cao Lỗ. Cao Lỗ chỉ huy được một doanh trại như các tướng khác (xem mục Nhiều doanh trại).
- Dáng (`makeCaoLo` trong `src/render/heroes.ts`, nhỏ hơn An Dương Vương một chút): tóc búi, râu đen, giáp da khảm đồng, đeo bao tên đồng, cầm nỏ liên châu có hộp tên trên thân (`repeatingCrossbow` ở `weapons.ts`), tù và đeo bên hông. Nỏ liên châu: ngẩng nỏ chếch lên trời bắn liền năm phát, rồi loạt tên đồng rơi xuống vùng trúng, vòng sóng đồng loang ra. Lệnh bắn: tay trái đưa tù và lên môi thổi (`Act.horn`), vòng sóng đỏ loang ra, dưới chân lính nỏ có hình thoi đỏ đồng nhấp nháy trong lúc có lệnh. Thắng trận thì giơ nỏ quá đầu. Đứng trước Điện, cạnh An Dương Vương, lùi sang trái một bước theo hướng nhìn; vua xuống biển rồi thì Cao Lỗ đứng chỗ ấy.
- **Tướng thủy binh Triệu** (`makeSoldier('tuongThuy')`): giáp lá đen viền vàng, giáp vai hai tầng, dải lụa đỏ chéo ngực, áo choàng đỏ, mũ đen viền vàng có chùm lông chim đen, râu đen, đao dài lưỡi trăng khuyết giơ cao bổ xuống; to hơn lính của hắn.

**Phó bản chương 4: đường ra biển**

Bản đồ phó bản có thêm thẻ Chương 4, mở khi đã vào chương 4. Bản đồ vẽ sông từ Cổ Loa ra cửa biển, ba vòng thành Cổ Loa, dải lông ngỗng trắng chạy về phương Nam và núi Mộ Dạ bên bờ biển.

| Màn | Tên | Quân giặc | Máu | Tướng | Thưởng lần đầu |
|---|---|---|---|---|---|
| 25 | Bến sông Cổ Loa | 13 lính thủy, 8 cung thuyền, 4 lính rìu | ×2,3 | An Dương Vương | 5500 gạo, 4500 vỏ ốc, 4000 đất đá, 1000 sắt |
| 26 | Bãi ven sông | 14 lính thủy, 8 cung thuyền, 4 lính rìu | ×2,2 | cần Cao Lỗ | 6000, 5000, 4400, 1100 |
| 27 | Làng chài | 14 lính thủy, 9 cung thuyền, 5 lính rìu | ×2,0 | cần Cao Lỗ | 6500, 5400, 4800, 1200 |
| 28 | Cửa sông, trùm **tướng thủy binh Triệu** | 13 lính thủy, 8 cung thuyền, 4 lính rìu, tướng thủy binh | ×2,0 | cần Cao Lỗ | 7200, 6000, 5200, 1300 |
| 29 | Đồng trước Cổ Loa | 7 lính khiên, 7 lính thủy, 5 nỏ thủ Triệu, 4 cung thuyền, 3 kỵ binh, 2 lính rìu | ×2,1 | cần Cao Lỗ | 7600, 6300, 5500, 1350 |
| 30 | Rừng biên Cổ Loa | 7 lính khiên, 7 lính thủy, 5 nỏ thủ Triệu, 5 cung thuyền, 2 kỵ binh, 2 lính rìu | ×2,1 | cần Cao Lỗ, mở Lệnh bắn | 8000, 6600, 5800, 1400 |
| 31 | Cổng Cổ Loa: giữ cổng cho vua rút | 8 lính khiên, 7 lính thủy, 5 nỏ thủ Triệu, 4 cung thuyền, 2 kỵ binh, 2 lính rìu | ×2,2 | cần Cao Lỗ | 8500, 7000, 6200, 1500 |
| 32 | Đường ra biển Mộ Dạ: hộ giá | 3 đợt (xem dưới), Triệu Đà ở đợt cuối | ×3,0 | cần Cao Lỗ | 9000, 7500, 6500, 1600 |

- Mọi màn cần Điện cấp 5 như chương 2, 3. Mỗi màn tối đa 28 giặc, cộng quân mẫu và tướng không quá 60 người trên bãi. Đánh lại được 30%.
- Máu giặc đo bằng test theo Chuẩn cân bằng phó bản (mức khởi đầu ước ×2,0–2,2): lấy mức cao nhất mà người chơi thường thắng cả 10 hạt giống thử, còn không tướng hay nửa quân (6 giáo, 5 cung, 1 voi, 2 lính nỏ) chơi giỏi vẫn thua. Màn 32 cầm cự nên giặc khỏe hơn hẳn (×3,0): chỉ cần giữ đủ 90 giây. Tướng thủy binh (màn 28) và Triệu Đà (màn 32) không bấm kỹ năng thì thua.
- **Quân mẫu chương 4**: 11 giáo, 10 cung, 3 voi, 4 lính nỏ, đúng 38 chỗ.
- Cao Lỗ đang kiệt sức thì màn 26–32 khóa, có dòng báo như với các tướng khác.
- **Màn 32 là cầm cự**:
  - giặc tới thành ba đợt, lúc 0, 30 và 60 giây: 10 tên (3 lính khiên, 3 lính thủy, 2 nỏ thủ, 2 cung thuyền), 10 tên (3 lính khiên, 2 lính thủy, 2 nỏ thủ, 2 kỵ binh, 1 lính rìu), rồi 8 tên (2 lính khiên, 2 lính thủy, 1 nỏ thủ, 1 cung thuyền, 1 kỵ binh, 1 lính rìu) cùng Triệu Đà. Đợt sau kéo vào từ cuối bãi phía giặc (`StageDef.waves`, `holdS` ở `defs.ts`);
  - thanh **"Vua tới biển"** chạy đầy trong 90 giây. Đầy thanh mà quân ta (kể cả Cao Lỗ) chưa chết hết thì **thắng**, không cần giết hết giặc hay hạ Triệu Đà;
  - quân ta chết hết trước khi đầy thanh thì thua; diệt hết cả ba đợt trước khi đầy thanh thì cũng thắng;
  - thanh trên bãi chiến ghi còn bao nhiêu giây vua tới biển và đợt giặc thứ mấy; ngựa nhỏ chạy theo thanh;
  - ngựa của vua, chở An Dương Vương và Mỵ Châu ngồi sau, chạy dọc mép bãi về phía biển, xa dần theo thanh. Ngựa chỉ là cảnh, giặc không nhắm vào ngựa. Ngựa vua (`makeRoyalHorse` trong `beasts.ts`): ngựa hồng to hơn ngựa kỵ binh, đệm đỏ có mặt trống đồng, vua áo đỏ đội miện vàng cầm cương, Mỵ Châu áo đỏ hồng, tóc dài, khoác áo lông ngỗng trắng bay ra sau. Đường ngựa chạy ở mép phải bãi (`MO_DA` ở `battlefield.ts`), nên ở màn này camera nhìn rộng sang phải hơn để thấy cả đường và biển;
- **Bãi chiến mới**:
  - **Cửa sông** (màn 28): sông rộng chảy ngang sau lưng giặc, thuyền đen buồm đỏ neo ven bờ, bãi lau sậy;
  - **Mộ Dạ** (màn 32): bãi cát, một bên là núi Mộ Dạ, phía xa là biển xanh, lông ngỗng trắng rải trên cát.
  - Màn 25, 26 dùng bãi bến sông; 27 làng; 29 làng; 30 rừng; 31 thành Cổ Loa.
  - Đã vẽ: cửa sông có bãi bồi giữa dòng, năm thuyền đen neo mũi vào bờ, ba chiếc thả neo giữa dòng, lau sậy hai bờ; Mộ Dạ có núi bên trái (một ngọn chìa ra biển), biển và bọt sóng bên phải, lông ngỗng rải trên cát dọc mép bãi, dải cát trống cho ngựa chạy. `battlefield.test.ts` canh dải cát trống và góc biển. `node scripts/chup-bai-chien.mjs <nền>` chụp bãi chiến theo nền.
- Thắng màn 32: ngựa vua dừng ở cuối đường, camera lướt ra biển và lùi xa, Rùa Vàng khổng lồ nổi lên ở góc biển (bảng kết quả chờ 3,5 giây như các màn kết chương), rồi tới đoạn truyện 5 và màn hình Hết truyện.
- Sau Hết truyện: An Dương Vương không còn đứng trước Điện, không giữ kinh đô nữa. Phó bản màn 17–25 ngài vẫn ra trận, hiện lên "hiển linh" như Gióng, Sơn Tinh.

**Đền Cuông**

- Mở khi thắng màn 32. Dựng một lần, 4×4, giá 4000 gạo, 4000 vỏ ốc, 4000 đất đá, 1100 sắt. Ngoài đời, Đền Cuông ở Diễn Châu, Nghệ An, thờ An Dương Vương, nơi truyền thuyết kể vua xuống biển.
- Đền còn nguyên thì **mỗi đợt thủy binh bớt 20% số thuyền**: còn lại `max(1, ⌊số thuyền × 0,8⌋)` thuyền, tức bớt chừng ấy lính (đợt 1: 4 thuyền 19 lính còn 3 thuyền 18 lính).
- Sức chịu nước lũ như các đền khác.
- Dáng (`makeDenCuong` trong `buildings.ts`, vẽ theo móng cũ phóng theo móng như các đền khác): đền nền đá mái tranh cong có chim đồng, sau lưng là mỏm núi đá có rêu và cây thông nhỏ, sân có tượng Rùa Vàng trên bệ đá quay mặt ra phía sông, bên cạnh là giếng nhỏ thành đá có giá gàu, chum nước; lư hương đồng, cờ đỏ.

**Mẫu kinh đô "Cổ Loa giữ sông"** (mở khi vào chương 4, vẽ cho Điện 8; giãn theo đất như ba mẫu kia)

- Giữ ba vòng thành và đê bao của mẫu Cổ Loa.
- 16 ụ nỏ trên vòng thành ngoài, chia đều bốn mặt: bắc, tây và hai mặt phía sông (mỗi mặt 4). Áp mẫu thì dựng ụ trên các đoạn thành ấy, trong giới hạn ụ theo cấp Điện, mỗi ụ trả giá dựng như dựng tay.
- 7 chỗ chòi canh ngay trong đê: 3 chỗ dành cho lầu nỏ (hai ở phía sông, một ở góc bắc tây), 4 chỗ ở mặt bắc và mặt tây. Áp mẫu thì lầu nỏ đang có vào chỗ dành cho lầu nỏ trước; chòi canh để dành chỗ ấy cho lầu nỏ ghép về sau. 3 lầu nỏ và 1 chòi canh là vừa đủ số chòi canh tối đa.
- Đền Cuông ở chỗ 4×4 còn trống phía bắc, ngoài vòng thành ngoài.
- Có chỗ cho trại nỏ (3×3), sát doanh trại; 5 doanh trại ở Điện 8 (mỗi tướng một trại, kể cả Cao Lỗ).
- Test như các mẫu khác: không chồng nhau, không lấn sông, đủ chỗ cho số tối đa, giữ được lũ bậc 3, đủ 3 vòng thành.

- Bản lưu lên **phiên bản 14**: thêm Cao Lỗ (nghỉ tới lúc nào, đã có Lệnh bắn chưa), An Dương Vương đã xuống biển chưa (`adv.bien`). Đã xem Hết truyện chưa ghi như một đoạn truyện (`hetTruyen` trong danh sách truyện đã kể).
- **Màn hình Hết truyện** là một hộp riêng: bốn dòng tóm tắt bốn chương, câu nhắc chuyện Hai Bà Trưng, nút Chơi tiếp. Hiện ngay sau đoạn "Ngọc trai, giếng nước". Nhận xong mọi nhiệm vụ thì bảng Lạc hầu có nút Xem lại Hết truyện.
- Nhiệm vụ: nối thêm nhiệm vụ 45–49. Xong nhiệm vụ 49 thì bảng Lạc hầu báo truyện đã hết, kinh đô vẫn giữ (có nút Xem lại Hết truyện).
- Test (`caoLo.test.ts`, mẫu ở `sapxep.test.ts`): độ khó màn 25–32 theo chuẩn; màn 32 thắng khi đầy thanh, thua khi hết quân; Nỏ liên châu, Lệnh bắn; chọn tướng phó bản và giữ kinh đô; thứ tự các đoạn truyện và Hết truyện; vua xuống biển, mở Đền Cuông; Đền Cuông bớt thuyền; mẫu kinh đô; nâng bản lưu 13 lên 14.

### PR 4: thử thách phó bản và huân công (chủ dự án đã duyệt, đã làm)

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

**Số cuối cùng** (`CHALLENGES` ở `defs.ts`, đo bằng `thuThach.test.ts`). Mỗi màn dò hai ngưỡng với 6 hạt giống: hệ số cao nhất mà người chơi giỏi còn thắng hết, hệ số thấp nhất mà người chơi thường đã thua phần lớn; rồi lấy khoảng giữa hai ngưỡng cho có khoảng an toàn cả hai phía.

| Màn | Kiểu | Máu giặc | Màn | Kiểu | Máu giặc |
|---|---|---|---|---|---|
| 1 | Giặc dữ, thêm giặc | ×3,2 | 17 | Không tướng | ×1,7 |
| 2 | Giáo binh + voi chiến, thêm giặc | ×3,95 | 18 | Giáo binh + voi chiến | ×3,2 |
| 3 | Giặc dữ, thêm giặc | ×3,8 | 19 | Giặc dữ | ×2,8 |
| 4 | Giặc dữ, thêm giặc | ×2,6 | 20 | Không tướng | ×1,1 |
| 5 | Không tướng | ×3,5 | 21 | Giáo binh + cung thủ | ×3,3 |
| 6 | Giáo binh + voi chiến | ×3,5 | 22 | Không tướng | ×0,95 |
| 7 | Không tướng | ×2,4 | 23 | Giáo binh + voi chiến | ×2,6 |
| 8 | Giặc dữ | ×2,2 | 24 | Giặc dữ | ×2,05 |
| 9 | Không tướng | ×3,15 | 25 | Không tướng | ×1,05 |
| 10 | Giáo binh + voi chiến | ×4 | 26 | Giáo binh + lính nỏ | ×3,15 |
| 11 | Không tướng | ×1,9 | 27 | Không tướng | ×0,85 |
| 12 | Giặc dữ | ×2,9 | 28 | Giặc dữ | ×2,2 |
| 13 | Giáo binh + cung thủ | ×4,1 | 29 | Voi chiến + lính nỏ | ×2,6 |
| 14 | Không tướng | ×1,4 | 30 | Không tướng | ×0,95 |
| 15 | Giáo binh + voi chiến | ×3 | 31 | Giáo binh + lính nỏ | ×3,1 |
| 16 | Giặc dữ | ×1,8 | 32 | Giặc dữ | ×3,3 |

- Giặc đông nhất ở mọi màn đều là loại cung thủ khắc (lính giáo Ân, tôm binh, quỷ núi, lính Triệu, lính thủy). Nên màn Hai binh chủng bỏ cung thủ là chính; màn 13 và 21 bỏ voi chiến cho đỡ lặp.
- **Màn 1–4 thêm giặc** (chủ dự án chọn): màn thường ít giặc (màn 1 chỉ có 4 lính giáo Ân), quân mẫu 38 chỗ lại có Gióng hiển linh, nên nếu chỉ tăng máu thì phải tăng rất lớn (màn 1 tới ×58). Thử thách màn 1–4 có thêm giặc (`extra`), đông ngang màn 5–8; thẻ màn ghi quân giặc của thử thách:

  | Màn | Giặc của thử thách |
  |---|---|
  | 1 | 14 lính giáo, 7 cung thủ, 3 chiến xa (thêm 10 lính giáo, 7 cung thủ, 3 chiến xa) |
  | 2 | 12 lính giáo, 7 cung thủ, 2 chiến xa (thêm 7 lính giáo, 5 cung thủ, 2 chiến xa) |
  | 3 | 12 lính giáo, 7 cung thủ, 3 chiến xa (thêm 7 lính giáo, 4 cung thủ, 2 chiến xa) |
  | 4 | 12 lính giáo, 7 cung thủ, 3 chiến xa, phó tướng (thêm 7 lính giáo, 4 cung thủ, 2 chiến xa) |

- Thử thách Không tướng ở chương 3, 4 có hệ số thấp hơn màn thường, có màn dưới ×1: mất tướng là thiệt lớn nhất, vì màn thường đã cân theo tướng.

**Những chỗ làm thêm, chủ dự án đã duyệt** (tài liệu trước chưa nói rõ):
- Tướng khi đánh thử là tướng người chơi có **khi đã hết truyện**: chương 1 Gióng hiển linh có Nhổ tre, chương 2 Sơn Tinh hiển linh dời được non, chương 3 và màn 25 An Dương Vương hiển linh có Rùa Vàng, màn 26–32 Cao Lỗ có Lệnh bắn. Chuẩn đã tính binh khí rèn đủ 2 bậc (cuối chương 3), nên thử thách là việc chơi về sau. `thuThach.test.ts` canh tướng này đúng là tướng `heroFor` chọn khi đã qua màn 32.
- Thắng thử thách chỉ có huân công: không có của cải, không mở màn, không kể truyện, không có lễ vật.
- Thử thách Không tướng không cần tướng của màn: tướng đang nghỉ vẫn đánh được.
- Quân mẫu Hai binh chủng chia đôi 38 chỗ cho hai binh chủng (vd. 20 giáo binh và 6 voi chiến).
- Huân công cộng cả vào đòn kỹ năng của tướng (nhánh tướng), như Đền Phù Đổng.
- Chip 🎖 có từ khi thắng màn đầu tiên. Thanh trên trong trận ghi kiểu thử thách; bảng nơi ở (nút Luyện) ghi bậc huân công của binh chủng, cạnh bậc binh khí.

**Huân công**

- Bảng **Huân công** mở từ bản đồ phó bản. Có 5 nhánh: giáo binh, cung thủ, voi chiến, lính nỏ, tướng. Mỗi nhánh 3 bậc.
- Giá bậc 1, 2, 3 là 3, 5, 8 huân công. Một nhánh hết 16, cả 5 nhánh hết đúng 80, bằng số huân công của cả 32 thử thách.
- Mỗi bậc thêm **4% máu và sức đánh** cho binh chủng ấy. Nhánh tướng thì cho mọi tướng. Có tác dụng ở mọi trận, cộng thêm vào phần của rèn binh khí, Đền và phúc lành Tết.
- Chuẩn cân bằng của màn thường và của thử thách đều tính không có huân công.
- Dáng: chip 🎖 trên bản đồ phó bản ghi số huân công đang có. Thẻ màn có thử thách đã thắng thì có ngôi sao đồng.

- Bản lưu lên **phiên bản 15**: thêm thử thách đã thắng, huân công đang có, bậc huân công từng nhánh (`thuThach`).
- Test: mở thử thách sau khi thắng màn; luật từng kiểu; huân công chỉ cho một lần; mua bậc; tăng sức vào trận; mọi thử thách đạt chuẩn; nâng bản lưu cũ lên.

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
3. **PR 2** (đã làm, trên bản đồ mới): lính nỏ và trại nỏ, ụ nỏ, thủy binh Triệu đánh kinh đô, đoạn truyện "Cầu hôn". Bản lưu v13.
4. **PR 3** (đã làm): Cao Lỗ, màn 25–32, bốn đoạn truyện còn lại, Đền Cuông, mẫu kinh đô chương 4 (vẽ trên bản đồ mới), màn hình Hết truyện. Bản lưu v14.
5. **PR 4** (đã làm): thử thách phó bản và huân công. Bản lưu v15.

PR 2 làm sau kế hoạch Kinh đô lớn PR 1–2 (lưới 55×55 bản lưu v11, khoảnh tự chọn v12), vì thủy binh Triệu cập bờ cần bản đồ mới. Kinh đô lớn PR 4 (cây, đá mọc) làm sau cùng, lấy bản lưu v17.

Mỗi PR: chạy `npm test` và `npm run build`; sửa `src/render/` hay `src/ui/` thì chụp kiểm tra ở khổ điện thoại; sau đó ghi số cuối cùng vào tài liệu này.

## Kế hoạch: kinh đô lớn, công trình to, mở đất bằng khoảnh (chủ dự án đã duyệt, đã làm)

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
  - sông rộng 3 ô, từ ô 52; nước vẽ rộng 7 ô, bờ bên kia từ ô 59 (chỉ để vẽ, cho bến cấp 8 và thuyền neo vừa giữa dòng; từ bản lưu 18 sông trong lưới rộng 7 ô, bờ bên kia là đất thật, xem Kế hoạch: vùng đất bên kia sông).
- **Điện 5×5 ở ô (37, 37)**, đúng một khoảnh. Game mới mở sẵn 16 khoảnh ở góc sông (20×20 ô). Điện cách rìa rừng 5 ô, cách sông 10 ô.
- **Mở đất bằng khoảnh tự chọn**:
  - chạm khoảnh rừng sát đất đã mở (4 hướng), trả gạo và vỏ ốc, đất mở ngay;
  - số khoảnh được mở theo cấp Điện: 18, 24, 32, 38, 48, 60, 72, 80 (sau chủ dự án bỏ lượt: phát thoải mái, xem mục Khoảnh đất);
  - giá 2–3% giá lần nâng Điện kế tiếp, nhích dần trong cùng cấp (chủ dự án chọn khi làm PR 2; kế hoạch đầu ghi 1–1,5%, tính ra rẻ như cho không; sau đổi thành giá tăng từng nấc theo số khoảnh đã phát); không tốn sắt hay đất đá;
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
  - mô hình phóng theo móng mới, nền chừng 85% ô móng, chừa viền cỏ; người làm giữ cỡ người thật (sau đó mười một loại vẽ lại trên trọn móng, xem mục Vẽ lại công trình trên móng);
  - trang trí ô trống (khóm cỏ, hoa dại, đá nhỏ), chỉ để nhìn; không tự vẽ lối đất nữa vì người chơi đã tự trải đường được (xem mục Đường đi và đồ trang trí);
  - cây, đá thỉnh thoảng mọc trên ô trống, chạm để dọn lấy chút gạo hay đất đá.
- **Bản lưu cũ** tự xếp lại theo mẫu kinh đô của chương đang chơi, miễn phí, giữ cấp và người làm. Đoạn lũy, đê, thành, bẫy không còn chỗ thì trả lại giá dựng; đất đã đắp trả lại đất đá.
- Tự chọn, chủ dự án có thể đổi:
  - rừng chưa mở giặc vẫn đi qua được;
  - không thêm nhiệm vụ Lạc hầu, chỉ hiện gợi ý lần đầu được phát rừng;
  - tiền trả lại khi nâng bản lưu được vượt sức chứa kho.

### Thứ tự làm

1. **PR 1: kinh đô lớn, công trình to** (đã làm, bản lưu v11): ô móng mới, lưới 55×55, địa hình giãn theo, giới hạn lũy/đê/thành, trận giữ kinh đô theo bản đồ mới, vẽ lại ba mẫu kinh đô có lối đi (sau đó làm lại cho giãn theo đất từng cấp Điện, xem mục Mẫu kinh đô), mô hình phóng to có viền cỏ, camera, nâng bản lưu xếp theo mẫu. Đất tạm mở theo hình vuông ở góc sông, cạnh 20, 25, 25, 30, 35, 40, 40, 45 theo cấp Điện (khớp lưới khoảnh). Chi tiết đã làm:
   - **Địa hình**: ba ô sát sông là bãi bồi bậc 0 (vừa một bến 3×3), dốc vào đồi dài hơn; nhiễu tính bằng hàm băm nên không phụ thuộc cỡ lưới.
   - **Chọn chỗ dựng** (`findSpot` trong `game.ts`): người chơi mô phỏng và gợi ý chỗ đặt tỏa dần từ Điện ra (công trình một ô thì từ góc vùng đất phía rừng), ưu tiên chỗ có viền trống một ô quanh móng (lũy, đê, thành, bẫy, chòi canh không tính), hết chỗ thoáng mới đặt sát.
   - **Trận giữ kinh đô**: tầm bắn, tốc độ, bán kính kỹ năng nhân 1,4 (`RAID_SCALE`, cả hình vẽ kỹ năng); giặc trên bộ xuất phát ở dải cách sông như trước nhân 1,4, luôn ngoài vùng đã khai phá (`raidSpawnBand`); dải báo giặc, ma trơi, camera lướt tới đều theo dải ấy. Test độ khó chương 2, 3 vẫn đạt chuẩn mà không phải chỉnh thêm.
   - **Giới hạn**: lũy 40, 70, 100, 130, 150, 170, 180, 180; đê 130 tới cấp 5, rồi 140, 150; thành Cổ Loa 220 tới cấp 5, rồi 230, 240 (ba vòng của mẫu Cổ Loa lúc đầu cần 216 đoạn; mẫu giãn theo đất cần 180 ở Điện 5, 200 ở Điện 6–7, 220 ở Điện 8).
   - **Mô hình**: phóng cả mô hình theo tỉ lệ móng mới rồi thu còn chừng 88% (ruộng 95%, bến 92%), cùng một hệ số ở mọi cấp nên giữ tỉ lệ dáng cấp 6–8 đã duyệt; người làm giữ cỡ người thật; chòi canh to hơn 15%, lầu nỏ 12%. Sau đó mười một loại vẽ lại trên trọn móng thay cho cách phóng (xem mục Vẽ lại công trình trên móng).
   - **Camera**: mặc định thấy chừng 20 ô bề ngang, thu nhỏ được tới khi thấy trọn kinh đô 45×45; lần đầu mở game nhìn vào giữa vùng đất đã khai phá; kéo trong vùng đất ấy; bóng nắng theo chỗ đang nhìn, sương mù lùi xa khi thu nhỏ.
   - **Nâng bản lưu** (`xepLai.ts`): bản lưu còn ở kinh đô nhỏ (Điện ở ô 16, 16, độ cao 30×30) dựng lại theo mẫu của chương đang chơi (chương 4 dùng mẫu Cổ Loa), miễn phí, giữ cấp, người làm, hư hỏng; công trình không có chỗ trong mẫu thì vào chỗ trống gần Điện nhất. Lũy, đê đã có thì dựng đủ dải theo mẫu; thành Cổ Loa xếp từ vòng trong ra và dựng nốt cho đủ số vòng kinh đô cũ đã có. Đoạn thừa trả lại giá đã bỏ ra; đất đã đắp và nền đã đắp trả lại đất đá (tính theo địa hình cũ). Trận giữ kinh đô đang dở lùi về lúc trinh sát báo, trả lại của bị cướp. Vào game thì báo một lần kinh đô đã dựng lại và phần hoàn lại.
   - **Bảng mẫu kinh đô**: bản đồ thu nhỏ vẽ lên canvas một lần cho mỗi mẫu và cấp Điện.
2. **PR 2: khoảnh tự chọn** (đã làm, bản lưu v12): xem mục Khoảnh đất. Bảng Khoảnh rừng, cọc mốc, phát rừng, người chơi mô phỏng phát rừng khi hết chỗ thoáng, giá 2–3% giá nâng Điện kế tiếp (sau đổi: bỏ lượt, giá tăng từng nấc).
3. **PR 3: trang trí ô trống** (đã làm, chỉ hình vẽ, không nâng bản lưu): khóm cỏ, hoa dại, đá nhỏ theo hạt giống từng ô, trên ô trống đã mở không có công trình, đường hay đồ trang trí; vẽ theo lô. Không tự vẽ lối đất: người chơi tự trải đường (xem mục Đường đi và đồ trang trí). Chi tiết đã làm:
   - **Ba loại, mỗi loại vài mẫu**: khóm cỏ lá nhọn ba dáng, xanh sẫm hơn nền cỏ; hoa dại ba màu (cúc dại vàng, hoa trắng nhụy vàng, trinh nữ bông tròn hồng tím); đá nhỏ hai dáng (một mẫu có rêu), chân đá có vài lá cỏ.
   - **Mật độ**: gần Điện người qua lại nhiều nên thưa, càng xa càng rậm. Trong chừng 4 ô quanh tâm Điện chỉ chừng 22% ô trống có cỏ, 5% có hoa, 4% có đá; rậm dần tới chừng 18 ô. Ở chỗ rậm nhất, mỗi ô trống có chừng 62% cơ hội mọc một khóm cỏ (một phần ba số ấy có thêm khóm thứ hai), 16% có khóm hoa, 9% có đá. Một ô không quá 4 món.
   - **Theo hạt giống từng ô**: dựng hay dỡ công trình chỗ khác không làm cỏ chỗ này đổi chỗ; mọi món nằm trọn trong ô, hai món cùng ô không chồng nhau. Món đứng trên mặt ô, kể cả ô đã đắp cao.
   - **Nhẹ máy**: mỗi mẫu một lần vẽ (InstancedMesh có viền mực mảnh), không đổ bóng; khóm cỏ 48–64 tam giác, hoa 216–256, đá 132–156. Cảnh Điện 8 thêm chừng 16 lệnh vẽ, 0,7% số tam giác. Chỉ vẽ lại khi đất mở thêm, bậc đất đổi hay công trình thêm, bớt, dời.
4. **PR 4: cây, đá mọc trên ô trống** (đã làm, bản lưu v17; số và các mục tự chọn dưới đây chờ chủ dự án duyệt): không mọc trên ô có đường hay đồ trang trí; khoảnh vừa phát có sẵn 1–2 cái. Luật ở `cayDa.ts`, số ở `defs.ts` (`CAY_DA_*`). Chi tiết đã làm:
   - **Hai loại, mỗi loại ba dáng**: cây dại (bụi chuối có buồng chuối xanh và bắp chuối, bụi sim chín tím lẫn hoa sim, cây sung con sai quả) dọn được gạo; tảng đá (tảng to có rêu, ba hòn chụm nhau, tảng dẹt có dương xỉ) dọn được đất đá. 60% số mọc là cây.
   - **Nhịp mọc**: theo đồng hồ chơi, cái đầu sau 3 phút (game mới hay bản lưu vừa nâng), rồi cứ 4 phút một cái, tới khi kinh đô có 8 cái thì thôi. Mọc trên một ô trống bất kỳ đã mở. Không mọc lúc vắng mặt; đang có giặc (cả lúc trinh sát báo) thì chờ giặc đi.
   - **Khoảnh vừa phát** có sẵn 1–2 cái trên các ô trong khoảnh, kể cả khi kinh đô đã đủ 8 cái.
   - **Chạm để dọn**: được của theo cấp Điện, không vượt sức chứa kho. Từ Điện 5 trở lên bằng chừng 10–15 giây sản lượng của kinh đô (Điện 5 làm ra chừng 670 gạo, 420 đất đá mỗi phút); ở các cấp đầu kinh đô còn làm ra ít nên dọn đáng hơn:

     | Điện | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
     |---|---|---|---|---|---|---|---|---|---|---|
     | Cây dại (gạo) | 20 | 35 | 60 | 90 | 130 | 190 | 270 | 380 | 530 | 740 |
     | Tảng đá (đất đá) | 10 | 18 | 30 | 45 | 65 | 95 | 135 | 190 | 265 | 370 |

   - **Không chặn gì**: dựng công trình, trải đường, đặt đồ trang trí, áp mẫu kinh đô đè lên thì dân dọn luôn, không được của; giặc đi qua được. Trang trí ô trống (khóm cỏ, hoa, đá nhỏ) né ô có cây đá.
   - **Lạc hầu gợi ý một lần** khi cái đầu tiên mọc: chạm vào để dọn. Dọn xong thì báo của được.
   - **Hình vẽ** ở `render/cayDa.ts`: to hơn trang trí ô trống cho dễ thấy, dễ chạm, gọn trong một ô. Cái đã lớn gộp một lô (một lần vẽ); cái mới mọc vẽ riêng, lớn dần lên rồi vào lô. Cảnh Điện 8 có 8 cái thêm 3 lệnh vẽ, chừng 0,4% số tam giác.
   - **Người chơi mô phỏng** không dọn cây đá, nên nhịp lên Điện và sổ thu chi giữ nguyên. Người chơi thật dọn hết thì mỗi giờ được chừng 9 cây, 6 đá; ở Điện 5 là chừng 3% gạo, 1,5% đất đá làm ra trong giờ ấy.
   - **Tự chọn, chủ dự án có thể đổi**: nhịp mọc (4 phút) và số tối đa (8); bảng của được; cây chỉ cho gạo (không cho gỗ); dựng đè thì mất của chứ không được; chỉ mọc khi yên giặc.

Chương 4 PR 2, PR 3 đã làm trước PR 3–4 của kế hoạch này (chỉ cần bản đồ mới của PR 1–2).

## Vẽ lại công trình trên móng (chủ dự án đã duyệt, đã làm)

Kinh đô lớn lúc đầu chỉ phóng mô hình cũ theo móng mới (`footScale`). Chủ dự án muốn công trình to hơn bằng cách **vẽ lại bố cục**, không chỉ phóng to, và đã duyệt bản vẽ bố cục từng công trình ở `docs/bo-cuc-cong-trinh.md`. Phần vẽ này làm song song với kinh đô lớn trên một bản đồ 38×38 (PR #27); `main` đã chọn lưới 55×55 của kinh đô lớn nên chỉ lấy phần vẽ sang. Cỡ móng hai bên trùng nhau (Điện 5×5; ruộng, ruộng nếp, doanh trại, đền 4×4; còn lại 3×3), nên bản vẽ dùng nguyên.

### Nguyên tắc

- **Không phóng to mô hình cũ.** Người, thú, đồ vật giữ cỡ. Móng rộng hơn để bày sân, lối, rào và cảnh phụ.
- **Bản vẽ ô con**: mỗi móng chia thành ô con bằng nửa ô (3×3 thành 6×6 ô con). Bản vẽ viết ngay trong code (`Lot` ở `src/render/lot.ts`); mỗi phần đứng vào khối chữ của nó, nên bản vẽ trong tài liệu và code là một.
- **Cao ở sau, thấp ở trước**: nhà chính, lò, núi, chòi về phía sau bên trái; sân, ruộng, chiếu, ao về phía trước bên phải, vì camera mặc định nhìn từ góc trước bên phải.
- **Mặt trước rõ**: lối đi, cổng hay chỗ hở ở giữa cạnh trước.
- **Lên cấp thì móng lấp dần**: cấp thấp móng còn thưa, mỗi cấp thêm một phần lớn đứng ở chỗ riêng của nó thay vì chen vào giữa. Không thu tâm ở cấp 6–8 như dáng cũ (`setSpread`, `edgeOf`): nhà chính chừa lề trong khối của nó để to dần tại chỗ.
- Mái theo cấp, viền mực, hoa văn giữ nguyên. Chỗ đứng của người làm vẽ lại theo bản vẽ, rải khắp móng; số người giữ như cũ.
- Sân đất nện phủ trọn móng, sáng hơn đất trồng để thấy ranh móng giữa cỏ.

### Bố cục

| Công trình | Bố cục | |
|---|---|---|
| Điện Vua Hùng | cung điện có sân chầu: nhà chính lùi về sau, lối đá từ cổng lên thềm, lầu trống hai góc trước; thêm cổng (cấp 4) và chái trái (cấp 7) | đã vẽ |
| Ruộng lúa | bốn thửa vuông, bờ chữ thập; cấp 1 mới khai hai thửa sau; chòi, trâu, guồng, miếu ở bốn góc; ao cò giữa bốn thửa | đã vẽ |
| Bến chợ thuyền | ba dải ra sông: kho, chợ hai dãy sạp có lối giữa, sàn bến; lối chợ thẳng ra cầu tàu; thuyền nhỏ, thuyền buôn (cấp 6) và thuyền buôn thứ hai (cấp 8) neo theo cầu tàu | đã vẽ |
| Nhà sàn | nếp nhà có vườn: nhà chính góc sau, nhà phụ, hiên, chum nước, vườn rau góc trước | đã vẽ |
| Bãi đất đá | mỏ đá bên gò: hố đá bậc thang góc sau, tời, xe đá, lò gạch, cần vọt | đã vẽ |
| Lò rèn | lò nón góc sau, lán đe phía sau, sân làm việc giữa, lò luyện thứ hai, giá binh khí, sân đúc đồng | đã vẽ |
| Kho thóc | vựa chính, vựa phụ, cót quây ba phía quanh sân phơi thóc | đã vẽ |
| Doanh trại | nhà dài suốt phía sau, sân tập rộng giữa cho tướng đứng, đài tướng và chòi trống bên phải, rào cọc nhọn từ cấp 3; thêm nhà dài thứ hai (cấp 4) | đã vẽ |
| Trại giáo, trại cung, chuồng voi | hai lều chữ A và sân cọc rơm; lán một mái và trường bắn ngang hai bia; mái chóp và sân voi có máng, đống cỏ | đã vẽ |
| Ba đền | đền lùi về sau, sân có tượng, cổng nhỏ; Phù Đổng thêm bụi tre đằng ngà, ao vết chân ngựa; Tản Viên thêm suối từ núi; Cổ Loa có cổng đất nện kiểu cổng thành | chủ dự án đã vẽ lại theo sự tích (Võ miếu lửa sắt và tre đằng ngà; đền đá Tam Sơn Ba Vì và suối thác; Loa thành xoắn ốc và điện vòm mai Rùa Vàng), vẫn vẽ theo móng cũ rồi phóng theo móng |
| Ruộng nếp | ba thửa dài thấp dần ra trước | chủ dự án đã làm lại chi tiết bông nếp, vẫn vẽ theo móng cũ rồi phóng theo móng |
| Vườn, chuồng lợn, bếp | khóm lá dong và hai luống đậu dài; chuồng góc sau và sân lợn chạy, vũng bùn; gian bếp mái cao, nồi thò ra trước, chiếu gói bánh rộng | đã vẽ |

- Lạc hầu, lính gác, tướng (Gióng lúc nhỏ, Sơn Tinh lúc cầu hôn, An Dương Vương cùng cột đá thề), cây nêu, dây cờ và mâm bánh ngày Tết nay ở trong sân chầu của Điện. Bỏ luật "ô trước Điện có công trình khác thì không dựng cây nêu".
- Tướng ở doanh trại đứng giữa sân tập.
- Thuyền buôn ghé đậu dọc dòng, cách bờ 3,5 ô, ngoài các thuyền neo của bến (chìa ra chừng 2,8 ô), còn chừa luồng thuyền sát bờ bên kia.
- Đo ở khổ điện thoại (trước → sau): ván mới 56 lệnh vẽ, 1,57 triệu tam giác (không đổi); kinh đô chương 1 Điện 5: 505 → 511 lệnh vẽ, 1,48 → 1,51 triệu tam giác; Điện 8: 1055 → 1042 lệnh vẽ, 1,54 → 1,61 triệu; mẫu Cổ Loa Điện 7: 1020 → 1021 lệnh vẽ, 1,72 → 1,78 triệu.

### Code

- `src/render/congTrinh/`: mỗi công trình đã vẽ lại một tệp (bản vẽ, mô hình, chỗ đứng người, khung chụp; bến thêm thuyền neo `benDocks`), phần dùng chung ở `chung.ts`, bảng tra `CONG_TRINH` và `lotModel` ở `index.ts`. `lotModel` dựng mô hình đặt vừa móng cho mọi loại: loại đã vẽ lại thì dựng thẳng, loại khác thì phóng dáng cũ theo móng.
- Dáng cũ của mười bốn loại đã vẽ lại (`makeDien`...) còn ở `buildings.ts` chỉ để `node scripts/chup-cong-trinh.mjs` chụp so dáng cũ phóng theo móng với dáng vẽ lại, ở cả 8 cấp; game không dùng.
- `footprint.test.ts` canh mô hình không tràn quá nửa ô ra ngoài móng, bản vẽ đúng cỡ móng, và bến cùng thuyền neo không chạm bờ bên kia.

### Thứ tự làm

1. **Mười một loại** (đã làm): Điện, ruộng, bến, nhà sàn, bãi đất đá, lò rèn, kho, doanh trại, trại giáo, trại cung, chuồng voi; cảnh Tết, tướng, thuyền buôn theo bố cục mới.
2. **Ba đền, bốn công trình Hội Tết** (đã làm):
   - ba đền và ruộng nếp: chủ dự án đã vẽ lại dáng (ba đền theo sự tích, ruộng nếp chi tiết bông nếp), vẫn vẽ theo móng cũ rồi phóng theo móng;
   - vườn đậu lá dong, chuồng lợn, bếp gói bánh: vẽ lại trên trọn móng ở `congTrinh/` theo bản vẽ. Người ngồi gói bánh ngày Tết nay ngồi trên chiếu trong móng bếp (`BEP_TET_SEAT`).
   - Dáng cũ còn trong `buildings.ts` để chụp so; bỏ khi không cần so nữa.

## Kế hoạch: cổng thành, xưởng mộc, làng chài (chủ dự án đã duyệt, đã làm)

Chủ dự án muốn thêm ba công trình: cổng thành, xưởng mộc (thợ mộc, gỗ), làng chài (thuyền đánh cá, ngư dân, cá). Chủ dự án đã chốt hướng qua năm câu hỏi:

- **Gỗ là tài nguyên thứ năm**: tích trong kho, có ô trên dải tài nguyên, dùng cho các công trình mới. Giá công trình cũ giữ nguyên.
- **Cá là thức ăn thay gạo**: không tích trữ, không có chip. Dân và lính ăn cá trước, thiếu mới ăn gạo.
- **Cổng thành là cửa trong vòng tường**, trên lầu cổng có lính bắn.
- **Mở rải theo chương**: xưởng mộc, làng chài có từ chương 1; cổng thành có từ chương 3.
- **Cổng hút giặc**: khi giữ kinh đô, quân ta vẫn đi thẳng xuyên tường như bây giờ, nên độ khó các đợt giặc cũ giữ nguyên. Giặc tìm đường thấy qua cổng dễ hơn phá tường, nên dồn về cổng.

Chủ dự án đã duyệt mọi con số và dáng dưới đây trước khi viết code. Như các lần trước, khi làm được chỉnh trong khoảng ±20% để khớp nhịp đo bằng test, làm xong thì ghi số cuối cùng. Cả ba phần đã làm: gỗ và xưởng mộc (PR 1), làng chài (PR 2), cổng thành (PR 3); số giữ như đề xuất.

### Gỗ 🪵

- Tài nguyên thứ năm, dùng chung sức chứa kho với bốn loại kia. Ô gỗ trên dải tài nguyên chỉ hiện từ khi mở xưởng mộc (Điện 2), hay khi đã có gỗ (phát rừng ở Điện 1).
  - Dải tài nguyên ghi số gọn nên năm tài nguyên, dân và nút cài đặt vừa một hàng cả ở màn ngoài Fold5 (344 điểm).
- **Nguồn vào**:
  - xưởng mộc;
  - phát rừng: mỗi khoảnh phát xong cho số gỗ bằng nửa số gạo của giá khoảnh ấy (Điện 1–3: 10 gỗ, Điện 5: 40–60, Điện 7: 105–155);
  - thuyền buôn: kinh đô đã có xưởng mộc thì có **thêm một lời mời thứ tư** về gỗ (mua gỗ hay bán gỗ lấy một thứ khác); ba lời mời kia giữ nguyên như trước. Giá trị quy đổi 1 gỗ bằng 1,3 gạo. (Đổi khi làm: lúc đầu gỗ chen vào ba lời mời sẵn có, bớt lời mời có ích, người chơi mô phỏng lên Điện 8 chậm thêm hơn một phút; nay làm đúng chữ "có thêm lời mời".)
- **Chỗ tiêu**:
  - dựng và nâng làng chài (đóng thuyền);
  - dựng và nâng cổng thành;
  - thuyền buôn mua gỗ, để gỗ không ứ khi mọi công trình dùng gỗ đã lên hết cấp.
- Đền Phù Đổng và phúc lành Đất cũng cộng vào gỗ. Giặc cướp gỗ như các tài nguyên khác. Thưởng phó bản và thưởng nhiệm vụ giữ bốn loại cũ.

### Xưởng mộc

Móng 3×3, 8 cấp, cần Điện 2, có từ chương 1. Cần thợ mộc làm, dân rảnh tự vào làm như ruộng, bến, bãi đất đá, lò rèn.

| Cấp | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Gỗ mỗi phút | 10 | 16 | 24 | 36 | 50 | 68 | 90 | 118 |
| Chỗ làm | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 4 |
| Giá dựng, giá nâng lên cấp ấy | 60 gạo, 40 vỏ ốc | 60 vỏ ốc, 30 đất đá | 120 vỏ ốc, 60 đất đá | 250, 120 | 500, 250 | 1000, 500 | 2000, 1000 | 4000, 2000 |

- Số tối đa theo cấp Điện 1–8: 0, 1, 1, 2, 2, 2, 3, 3. Máu như bãi đất đá.
- **Dáng** (bản vẽ ở `docs/bo-cuc-cong-trinh.md`):

  | Cấp | Thêm |
  |---|---|
  | 1 | lán thợ mộc góc sau, giá cưa xẻ hai người (cây gỗ gác trên giá cao, một người đứng trên, một người dưới), đống gỗ tròn |
  | 2 | thuyền độc mộc đang đẽo trên hai mễ gỗ |
  | 3 | khung nhà sàn dựng dở, cột và xà chưa lợp mái |
  | 4 | giá phơi ván |
  | 5 | trâu kéo một cây gỗ vào sân |
  | 6 | cột hiên lán chạm hoa văn trống đồng |
  | 7 | lán thứ hai bày sập gỗ chạm, hòm gỗ |
  | 8 | thuyền độc mộc thành thuyền lớn mũi cong trên giàn đà |

  Mái theo cấp như các công trình khác.
- **Thợ xẻ, thợ mộc** (đổi khi vẽ: tách hai nghề cho mỗi người một động tác): quấn khăn thợ, đeo yếm vải thô. Thợ xẻ tay không, kéo cưa xẻ của xưởng, hai tay đưa lên kéo xuống; thợ mộc cầm rìu lưỡi đồng xòe lệch, giơ quá vai rồi bổ xuống. Thợ mộc đeo ống mực bên hông, thợ xẻ đeo túi đinh tre.
- **Người chơi mô phỏng dựng xưởng mộc từ PR 2** (cùng làng chài, xem mục Làng chài). Ở PR 1 chưa dựng: gỗ chưa dựng được gì ngoài đổi với thuyền buôn, dựng thì lên Điện 5 mất 70 phút, Điện 8 mất 52 phút.

### Làng chài

Móng 3×3, 8 cấp, phải sát bờ sông như bến, cần Điện 3, có từ chương 1. Cần ngư dân làm, dân rảnh tự vào làm.

| Cấp | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Cá mỗi phút | 6 | 10 | 15 | 22 | 30 | 40 | 52 | 68 |
| Chỗ làm | 1 | 2 | 2 | 2 | 3 | 3 | 3 | 3 |
| Giá dựng, giá nâng lên cấp ấy | 80 gạo, 60 gỗ | 60 gạo, 40 gỗ | 120 gạo, 80 gỗ | 250, 160 | 500, 320 | 1000, 640 | 2000, 1300 | 4000, 2600 |

Đã làm (PR 2), số giữ như đề xuất.

- Số tối đa theo cấp Điện 1–8: 0, 0, 1, 1, 2, 2, 3, 3. Máu như bến. Lũ không làm hư (nhà trên cọc), như bến.
- **Cá đỡ gạo ăn**:
  - mỗi phút, dân và lính ăn cá trước, phần còn thiếu mới ăn gạo. Cá thừa thì bỏ phí, không tích trữ;
  - có đủ cá thì không bị thiếu gạo;
  - Đền Phù Đổng và phúc lành Đất cũng cộng vào cá như các sản lượng khác;
  - ví dụ ở Điện 5: dân và lính ăn chừng 75 gạo mỗi phút, hai làng chài cấp 5 đỡ được 60.
  - Code: `foodPerMinute` (phần ăn), `fishPerMinute` (cá), `upkeepPerMinute` (gạo phải ăn, đã trừ cá) ở `game.ts`; thiếu gạo, bảng kho và sổ kinh tế dùng số gạo phải ăn. Sổ kinh tế ghi riêng khoản "Cá đỡ gạo ăn".
- Bảng làng chài ghi: cá mỗi phút của làng ấy và của cấp sau, cá của cả kinh đô, dân và lính ăn bao nhiêu mỗi phút, số gạo cá đỡ được. Cá đã đủ cho cả kinh đô ăn thì báo dựng thêm hay nâng thêm chưa có ích, trừ khi thêm dân, thêm lính.
- Áp mẫu kinh đô: làng chài đứng ngay sau bến, dọc sông, ngoài đê như bến (bãi ngoài đê nay dành cho mọi loại phải sát sông).
- Lạc hầu gợi ý một lần khi lên Điện 3: dân ven sông xin lập làng chài, đóng thuyền bằng gỗ của xưởng mộc.
- **Người chơi mô phỏng** (đổi khi làm, chủ dự án đã duyệt nới mốc):
  - dựng xưởng mộc và làng chài như người chơi thật, nhưng biết dừng: xưởng mộc thứ hai trở đi và mọi lần nâng xưởng mộc chỉ khi gỗ còn thiếu cho việc sắp làm; làng chài thôi dựng, thôi nâng, và rút bớt ngư dân khi cá đã đủ ăn; gỗ thừa thì đem đổi với thuyền buôn;
  - người chơi mô phỏng không nuôi lính nên chỉ ăn chừng 20–50 gạo mỗi phút; cá đỡ gần hết phần ấy từ Điện 4;
  - nhịp đo được: lên Điện 5 mất 68 phút (đích 45–70); Điện 6, 7, 8 mất 16,2, 34,7, 45,3 phút sau khi vào chương. Điện 8 vượt đích cũ 25–45 phút: đã thử chỉnh giá ±20% và đổi giá nâng xưởng mộc sang gạo, đều ra 44,1–45,8 phút, vì thời điểm nâng cấp xê dịch chứ không do hai công trình tốn của. Chủ dự án cho nới đích Điện 8 lên **25–47 phút** (`balance.test.ts`).
- **Dáng** (bản vẽ ở `docs/bo-cuc-cong-trinh.md`; mặt trước quay ra sông):

  | Cấp | Thêm |
  |---|---|
  | 1 | lều chài góc sau, giàn phơi cá, bờ ván ra nước, một thuyền nan neo sát bờ |
  | 2 | vó bè ven bờ, cần tre chìa ra nước |
  | 3 | thuyền đánh cá thứ hai, giá phơi lưới |
  | 4 | lều chài thành nhà sàn ngư dân |
  | 5 | chum mắm, cờ |
  | 6 | hàng đáy cắm cọc dưới sông |
  | 7 | sạp chợ cá bày thúng cá |
  | 8 | thuyền lưới lớn có buồm neo ngoài, miếu thần sông góc sau |

  Thuyền đánh cá bơi chậm một vòng bầu dục quanh chỗ neo trước bờ ván, mũi theo hướng đi, người lái đò chèo theo nhịp. Thuyền không ra tới luồng thuyền qua lại, không chạm bờ bên kia (`footprint.test.ts` canh).
  - Đã vẽ (`src/render/congTrinh/langChai.ts`). Đã đổi khi vẽ: thêm cầu ván ngắn ra nước giữa bờ ván, ngư dân quăng chài đứng ở đầu cầu (thay cho người trên thuyền quăng chài); thuyền lưới lớn có buồm dùng dáng thuyền buôn thu nhỏ.
  - Làng chài, bến quay mặt trước ra sông, cả khi đặt bên sông phía đông (`world.ts` xoay mọi loại phải sát sông).
- **Ngư dân**: đội nón lá, đóng khố chàm bạc màu nước sông, cầm chài, đeo giỏ cá bên hông. Động tác quăng chài: vặn người lấy đà, vung tay từ sau ra trước lên cao rồi buông.

### Cổng thành

Móng 1×1, 3 cấp, cần Điện 5, có từ chương 3 (cùng thành Cổ Loa).

| Cấp | Cần | Giá dựng, giá nâng | Máu | Lính trên lầu |
|---|---|---|---|---|
| 1 | chương 3, Điện 5 | 500 đất đá, 400 gỗ, 100 sắt | 3000 | sát thương 20 |
| 2 | Điện 7 | 1200 đất đá, 1000 gỗ, 250 sắt | 4500 | sát thương 26 |
| 3 | Điện 8 | 2500 đất đá, 2000 gỗ, 500 sắt | 6000 | sát thương 32, mỗi phát bắn 2 giặc |

- Số tối đa: 2 ở Điện 5–7, 4 ở Điện 8.
- **Đặt**: trên ô trống, hoặc chạm vào một đoạn lũy, thành đất, thành Cổ Loa để thay đoạn ấy (như thành Cổ Loa thay lũy). Không đặt được trên đê, vì cổng không chặn nước lũ.
- **Hút giặc**: khi tìm đường, giặc tính ô cổng dễ qua hơn tường (giá ô 8, so với lũy tre 12, thành đất 30, thành Cổ Loa 45). Nên giặc chịu đi vòng chừng 35 ô tới cổng thay vì phá thành. Tới cổng thì phải phá cổng mới qua. Người chơi bày chòi canh, lầu nỏ, bẫy chông quanh cổng thành chỗ đón đánh.
- **Lính trên lầu cổng** tự bắn giặc trong tầm 4,5 ô, nghỉ 1,2 giây giữa hai phát. Như mọi tầm bắn khi giữ kinh đô, tầm nhân 1,4. Đền Cổ Loa còn nguyên thì bắn mạnh gấp rưỡi và xa thêm 1 ô, như chòi canh.
- Cổng tính là thành khi đếm vòng thành Cổ Loa, nên đặt cổng trong vòng thành không làm hở vòng. Yêu tinh nhắm phá cổng như phá thành. Cổng hư thì giặc đi qua được, sửa như mọi công trình.
- **Mẫu kinh đô**:
  - Phong Châu: một cổng giữa cạnh lũy phía bắc, một cổng giữa cạnh phía tây, đối xứng qua đường chéo;
  - Cổ Loa và Cổ Loa giữ sông: hai cổng trên vòng thành ngoài, phía bắc và phía tây; Điện 8 thêm hai cổng trên vòng giữa;
  - Đê bao không có chỗ cho cổng. Áp mẫu này thì cổng đứng yên; vướng chỗ của mẫu thì dời ra chỗ trống gần nhất, như trại nỏ với các mẫu cũ.
- **Dáng**:

  | Cấp | Dáng |
  |---|---|
  | 1 | hai trụ gỗ, cánh cửa gỗ, lầu tre mái tranh trên cửa |
  | 2 | hai trụ đất nện, lầu gỗ hai tầng lan can đỏ |
  | 3 | vọng lâu mái ngói viền đồng vàng, chim Lạc trên nóc, hai cờ đỏ, hai lính nỏ trên lầu |

  - Mái theo cấp. Cổng cao hơn đoạn tường hai bên để nhìn là biết.
  - Cổng xoay theo đoạn tường hai bên, cửa nhìn ra phía ngoài.
  - Lúc yên thì cánh cửa mở; có giặc thì đóng.
- **Đã làm** (PR 3, số giữ như bảng trên; không nâng bản lưu vì cổng chỉ là một loại công trình mới):
  - Lính trên lầu nhắm giặc gần nhất trong tầm (kể cả giặc đang chạy), cấp 3 mỗi phát bắn hai giặc. Mũi tên bay ra từ giữa cổng.
  - Mẫu kinh đô đánh dấu chỗ cổng trên đoạn tường (`Slot.cong`). Chỗ cổng đứng giữa trục Điện khi được (Phong Châu, Cổ Loa vòng ngoài), tránh đoạn có ụ nỏ (Cổ Loa giữ sông). Chưa mở cổng (trước chương 3, hay Điện dưới 5) thì áp mẫu vẫn dựng tường liền ở chỗ ấy, vòng không hở; đã mở thì dựng cổng thay đoạn tường, bao nhiêu cổng là tùy số tối đa. Bản đồ thu nhỏ của mẫu tô chỗ cổng màu đỏ khi đã mở cổng.
  - Cổng không có chỗ trong mẫu (Đê bao) thì đứng yên, vướng thì dời ra chỗ trống gần nhất.
  - Dáng ở `buildings.ts` (`makeCongThanh`), móng một ô như chòi canh, to hơn chút (112%) cho trụ cổng liền với đoạn tường hai bên. Lòng cổng tối có khung cửa gỗ hai mặt nên nhìn từ trong hay ngoài thành đều thấy lối qua. Cánh cửa ở mặt trong cổng (phía Điện, nơi camera thường nhìn); mở thì áp sát mặt trong hai trụ, có giặc (từ lúc trinh sát báo tới hết trận) thì khép lại. Cấp 1 có một lính cung, cấp 2 một lính nỏ, cấp 3 hai lính nỏ trên tầng trên cùng.
  - Bảng cổng có dòng Lính trên lầu (sát thương, số giặc mỗi phát) và cấp sau; nút Dỡ cổng.
  - **Đo độ khó** (`congThanh.test.ts`): kinh đô Điện 5 có một vòng thành Cổ Loa dựa sông, năm chòi canh phía bắc, không tướng; đợt Triệu thứ 4 và thứ 6, đánh từ phía bắc và phía tây; có hay không hai cổng giữa trục.
    - Không quân: có cổng hay không, giặc đều phá 8 công trình rồi rút.
    - Đủ quân mẫu chương 3 (30 lính), số lính ta mất khi không cổng → có hai cổng: đợt 4 phía bắc 14 → 27, phía tây 18 → 21; đợt 6 phía bắc 18 → 23, phía tây 30 → 30.
    - Đợt đầu của quân Triệu có An Dương Vương như cũ: thắng, mất 2 lính, có cổng hay không như nhau.
    - Vậy cổng không làm trận dễ đi: giặc dồn cục ở cổng nên đánh tập trung hơn. Cổng có lợi khi người chơi bày quân và chòi canh đón ở cổng, và đỡ phải sửa tường (có cổng thì giặc ít phá đoạn thành hơn). Đo thêm với cổng đặt lệch trục thấy kết quả thay đổi theo chỗ đặt (đợt 5–6 có chỗ đặt mất ít hơn hẳn khi không cổng), nên chưa chỉnh số.

### Lạc hầu và bản lưu

- Không thêm nhiệm vụ Lạc hầu, để khỏi dời số thứ tự nhiệm vụ của người đang chơi. Lần đầu mở mỗi công trình, Lạc hầu nói một câu gợi ý, như gợi ý lần đầu được phát rừng.
  - Đã làm: dòng báo "📜 Lạc hầu: …" hiện 8 giây (dòng báo thường 2,6 giây), bo góc vừa phải cho lời nhiều dòng. Công trình đã gợi ý ghi trong bản lưu (`hinted`); danh sách công trình cần gợi ý là `NEW_HINTS` ở `defs.ts`, làng chài và cổng thành nối thêm vào đó mà không phải nâng bản lưu.
  - Người đã qua Điện 2 thì thấy lời gợi ý xưởng mộc ngay khi mở game.
- **Bản lưu phiên bản 16** (đã làm): bản lưu cũ có 0 gỗ, chưa gợi ý gì; trận đang dở hay vừa xong chưa bị cướp gỗ. Chương 4 phần 3 và phần 4 gộp trước, lấy phiên bản 14, 15, nên gỗ lấy 16.

### Thứ tự làm

Mỗi PR làm trên một nhánh từ `main` mới nhất.

1. **Duyệt tài liệu này**: mọi con số và dáng ở trên, cùng bản vẽ xưởng mộc, làng chài ở `docs/bo-cuc-cong-trinh.md`.
2. **PR 1: gỗ và xưởng mộc** (đã làm, bản lưu v16). Thêm gỗ vào kho, thanh trên, thuyền buôn, phát rừng, giặc cướp; xưởng mộc, thợ xẻ, thợ mộc; lời gợi ý của Lạc hầu; báo cáo kinh tế có sổ gỗ; mẫu kinh đô có chỗ cho xưởng mộc (gần rừng như bãi đá). Test `xuongMoc.test.ts`: sản lượng, giá, số tối đa, Đền cộng vào gỗ, sức chứa, gỗ khi phát rừng, thuyền buôn, gợi ý một lần, nâng bản lưu; nhịp lên Điện giữ như trước.
3. **PR 2: làng chài và cá** (đã làm). Luật cá đỡ gạo ăn, thuyền đánh cá, ngư dân, chỗ trong mẫu kinh đô dọc sông; người chơi mô phỏng dựng xưởng mộc và làng chài. Test `langChai.test.ts`: cá theo cấp và người làm, cá đỡ gạo, cá thừa, hết thiếu gạo khi đủ cá, phải sát sông, Đền cộng vào cá, lũ không làm hư, gợi ý của Lạc hầu; `sapxep.test.ts` canh mẫu kinh đô đủ chỗ; nhịp lên Điện trong đích (Điện 8 nới lên 47 phút).
4. **PR 3: cổng thành** (đã làm). Đặt thay đoạn tường, giặc tìm đường qua cổng, lính trên lầu bắn, đếm vòng thành, chỗ trong mẫu kinh đô. Test: giặc dồn về cổng khi vòng tường kín, lính trên lầu bắn và Đền Cổ Loa cộng thêm, cổng giữ vòng thành, mẫu kinh đô có cổng; các trận giữ kinh đô chương 3, 4 vẫn đạt chuẩn khi không có cổng, và một đợt có cổng không quá dễ.

Mỗi PR: chạy `npm test` và `npm run build`; chụp kiểm tra ở khổ điện thoại (thanh trên đủ chỗ cho năm chip ở khổ `fold`); ghi số cuối cùng vào tài liệu này; sửa các mục chung (bốn tài nguyên thành năm, bảng Công trình) khi phần ấy đã làm.

## Kế hoạch: Điện cấp 9, 10 (chủ dự án đã duyệt, đã làm)

Chủ dự án yêu cầu lập kế hoạch cho cấp 9, 10 rồi **duyệt theo đúng đề xuất**: mốc mở A, đất 88 và 94 khoảnh (sau bỏ, xem điều 2), lầu nỏ lên cấp 2, 3, có rèn binh khí bậc 3, cùng mọi con số và dáng dưới đây. Như lúc làm cấp 6–8, sau khi duyệt cho chỉnh ±20% để khớp nhịp đo bằng test; làm xong phần nào thì ghi số cuối cùng của phần ấy.

**Hiện trạng** (khảo sát code):
- Điện và 9 loại (ruộng, bến, nhà sàn, bãi đất đá, lò rèn, kho, chòi canh, xưởng mộc, làng chài) dừng ở cấp 8 (`maxLevel: 8`). Cổng thành giữ 3 cấp riêng. Doanh trại giữ cấp 5, nơi ở của binh chủng cấp 3, bốn công trình Hội Tết cấp 3, lầu nỏ không lên cấp.
- Mọi mảng theo cấp Điện có 8 phần tử: `limit` của từng loại, `STORAGE_CAP`, `KHOANH_QUOTA`, `ROAD_LIMIT`, `FIELD_CAP`, `GUARD_CAP`, `TET_NEED`, `DIEN_CHAPTER`; mẫu kinh đô (`mau.ts`), `testmap.ts` (`setDien`, `edge`), người chơi mô phỏng (`moPhong.ts`) cũng tính tới cấp 8.
- Hình: `roofFor` có bốn bậc mái (tranh, viền đỏ, ngói, ngói viền đồng vàng); các loại vẽ trên móng (`congTrinh/`, nay có cả xưởng mộc, làng chài, bếp, vườn, chuồng lợn) có bản vẽ ô con tới cấp 8, cỡ đã 110–120%.
- Chương 4 đã làm trọn (Cao Lỗ, màn 25–32, Hết truyện, thử thách và huân công), nên mốc mở cấp 9, 10 dựa được vào Hết truyện và số thử thách đã thắng (`thuThach.ts`). Lúc lập kế hoạch bản lưu ở phiên bản 17; sau đó vùng đất bên kia sông lấy phiên bản 18.

### Bốn điều đã chốt (theo đề xuất)

1. **Mốc mở**. Đề xuất (A): **Điện 9 mở khi xem màn hình Hết truyện** (thắng màn 32), **Điện 10 mở khi đã có Điện 9 và qua 16 thử thách phó bản** (huân công ở PR 4 chương 4). Lý do: sau Hết truyện người chơi "chơi tiếp trên kinh đô" nhưng hết việc xây; cấp 9, 10 cho phần chơi sau truyện có đích, như Clash of Clans thêm cấp Tòa thị chính mà không thêm truyện. Phương án khác:
   - (B) cả hai mở cùng lúc khi Hết truyện;
   - (C) cấp 9 khi Hết truyện, cấp 10 để dành cho chương 5 Hai Bà Trưng;
   - (D) làm ngay, không chờ chương 4: cấp 9 mở khi vào chương 4 + thắng màn 28 (đoạn "Lẫy nỏ bị tráo"), cấp 10 khi Hết truyện.
2. **Đất**. Đề xuất phát rừng tới **88 khoảnh ở Điện 9, 94 ở Điện 10**, chừa 6 khoảnh rừng (các khoảnh góc tây bắc) để viền kinh đô vẫn lượn. Phương án khác: 90 và 100 (phát hết rừng, đất vuông 50×50). **Lưu ý**: PR #36 (Phát rừng thoải mái, giá tăng từng nấc) đang mở, bỏ hẳn lượt phát theo cấp Điện. **PR #36 đã gộp trước PR luật cấp 9, 10, nên điều này bỏ**: đất bên này sông phát thoải mái ở mọi cấp Điện, cấp 9, 10 không thêm lượt khoảnh, chỉ thêm sức chứa kho (tự nới các nấc giá cao của phát rừng).
3. **Lầu nỏ**. Đề xuất lầu nỏ **lên cấp 2, 3** cùng Điện 9, 10 (đổi quyết định "lầu nỏ không lên cấp"), vì nếu không thì chòi canh cấp 9, 10 không còn lý do ghép. Phương án khác: giữ lầu nỏ một cấp, chỉ chòi canh lên cấp.
4. **Rèn binh khí bậc 3** ở lò rèn cấp 9 (+10% máu và sức đánh như hai bậc trước) cho cả bốn binh chủng. Có làm không?

### Điện

| Cấp | Mở khi | Giá nâng | Sức chứa kho | Chỗ ở | Gạo, vỏ ốc /phút | Máu |
|---|---|---|---|---|---|---|
| 8 (đã có) | vào chương 4 | 10400 gạo, 9200 vỏ ốc, 8000 đất đá, 1800 sắt | 32000 | 11 | 18, 9 | 2000 |
| 9 | Hết truyện | 14100 gạo, 12300 vỏ ốc, 11000 đất đá, 2400 sắt | 44000 | 12 | 20, 10 | 2200 |
| 10 | Điện 9 + 16 thử thách | 19200 gạo, 16800 vỏ ốc, 15200 đất đá, 3400 sắt | 60000 | 13 | 22, 11 | 2400 |

- Bảng trên là số cuối cùng (PR luật đã làm). Đề xuất ban đầu: Điện 9 giá 16000 gạo, 14000 vỏ ốc, 12500 đất đá, 2800 sắt; Điện 10 giá 24000, 21000, 19000, 4200 (gấp chừng 1,5 cấp trước). Đo bằng người chơi mô phỏng thì quá chậm (xem mục Nhịp), nên hạ: Điện 9 bớt 12%, Điện 10 bớt 20% (mức tối đa đã cho).
- Mốc mở: Điện 9 cần vua đã ra biển Mộ Dạ (`adv.bien`, thắng màn 32), báo "Mở sau khi hộ giá vua ra biển Mộ Dạ"; Điện 10 cần đã thắng `DIEN10_CHALLENGES` = 16 thử thách, báo "Cần thắng 16 thử thách phó bản".
- Số công trình tối đa: **thêm 1 ruộng, 1 nhà sàn, 1 chòi canh mỗi cấp**; các loại khác giữ như Điện 8. Lũy, đê, thành, đường mỗi cấp thêm chừng 5% vì đất rộng thêm. `FIELD_CAP` giữ 38 (bãi chiến tối đa chừng 60 người). `GUARD_CAP` 62, 68. `TET_NEED` giữ 40.

### Chín loại công trình lên cấp 9, 10

Số cuối cùng (PR luật đã làm): giá chừng gấp 1,3 cấp trước, tức đề xuất ban đầu (gấp 1,6) hạ 20%; sản lượng thêm chừng 22% mỗi cấp (cấp 8 thêm 30%), riêng bến thêm 48% rồi 22% (đề xuất 320, 390 nâng 20%). Chỗ làm thêm 1 ở cấp 10 (dân Điện 10 có chỗ ở thêm từ nhà sàn).

| Công trình | Giá lên 9 | Giá lên 10 | Cấp 8 → 9 → 10 | Chỗ làm |
|---|---|---|---|---|
| Ruộng lúa | 4300 vỏ ốc, 2800 đất đá | 6900 vỏ ốc, 4500 đất đá | gạo 260 → 320 → 390 | 5, 6 |
| Bến chợ thuyền | 5100 gạo, 3000 đất đá | 8200 gạo, 4900 đất đá | vỏ ốc 260 → 385 → 470 | 4, 5 |
| Nhà sàn | 3800 vỏ ốc, 3400 đất đá | 6200 vỏ ốc, 5400 đất đá | chỗ ở 18 → 20 → 22 | – |
| Bãi đất đá | 2400 gạo, 5100 vỏ ốc | 3800 gạo, 8200 vỏ ốc | đất đá 255 → 310 → 380 | 5, 6 |
| Lò rèn | 6600 vỏ ốc, 7200 đất đá | 10600 vỏ ốc, 11500 đất đá | sắt 70 → 85 → 104 | 4, 5 |
| Kho thóc | 6600 vỏ ốc, 8200 đất đá | 10600 vỏ ốc, 13100 đất đá | thêm sức chứa 13000 → 17000 → 22000 | – |
| Chòi canh | 4900 vỏ ốc, 4900 đất đá, 800 sắt | 7800 vỏ ốc, 7800 đất đá, 1300 sắt | sát thương 37 → 44 → 52 | – |
| Xưởng mộc | 5100 vỏ ốc, 2600 đất đá | 8200 vỏ ốc, 4100 đất đá | gỗ 118 → 144 → 176 | 4, 5 |
| Làng chài | 5100 gạo, 3400 gỗ | 8200 gạo, 5400 gỗ | cá 68 → 83 → 101 | 3, 4 |

- Xưởng mộc, làng chài thêm vào sau khi duyệt (hai loại này có trên `main` sau lúc lập kế hoạch), theo cùng quy tắc với các loại kia. Giá các loại cũ không dùng gỗ, giữ như quyết định lúc thêm gỗ. Cổng thành giữ 3 cấp.

- Máu mỗi công trình thêm chừng 10% mỗi cấp.
- Lầu nỏ (nếu chủ dự án chọn cho lên cấp): cấp 2 cần Điện 9, giá 3200 vỏ ốc, 3200 đất đá, 800 sắt, mỗi mũi 34 → 41; cấp 3 cần Điện 10, giá 5000, 5000, 1300, mỗi mũi 49. Ba mũi mỗi phát giữ nguyên.

### Nhịp (đo bằng `balance.test.ts`, không tính thưởng phó bản)

- Người chơi mô phỏng lên Điện 8 rồi ở lại chương 4 chừng nửa giờ thì hết truyện (`playChapters({ last: 10 })`, mốc `hetTruyen`): coi như đã thắng màn 32 và đủ 16 thử thách, của dành dụm coi như đã tiêu hết, như lúc vào mỗi chương.
- Đích: từ lúc hết truyện tới Điện 9 **35–50 phút**; từ Điện 9 tới Điện 10 **45–65 phút**.
- Với giá đề xuất ban đầu: Điện 9 mất 68 phút, Điện 10 mất 131 phút. Vỏ ốc nghẽn: chín loại công trình cùng lên cấp tiêu gần 270 nghìn vỏ ốc, trong khi gạo tràn kho 61%.
- Đã sửa (đo lại: **Điện 9 mất 37,5 phút, Điện 10 mất 64,7 phút**; sau khi gộp phát rừng thoải mái và vùng bên kia sông: 37,8 và 64,0 phút):
  - giá lên cấp 9, 10 của chín loại hạ 20%, Điện 10 hạ 20%, Điện 9 hạ 12%;
  - bến cấp 9, 10 làm ra 385, 470 vỏ ốc mỗi phút (đề xuất 320, 390, nâng 20%);
  - người chơi mô phỏng thôi nâng ruộng khi kho gạo đã đầy 95%, như người chơi hợp lý (nâng thêm chỉ thêm gạo tràn kho). Luật này gần như không đổi nhịp chương 1–4 (Điện 8: 45,3 → 45,0 phút; sau khi gộp `main` mới: 44,1 phút).
- Nhịp rất nhạy: chỉ hạ giá công trình mà không hạ giá Điện thì Điện 10 lại chậm hơn, vì người chơi mô phỏng tiêu vỏ ốc vào công trình trước. Đổi giá cấp 9, 10 thì chạy lại `balance.test.ts`.
- Báo cáo kinh tế (`kinhTe.ts`, `node scripts/kinh-te.mjs`) có thêm giai đoạn "Sau truyện" (tới lúc lên Điện 10) và mỗi giờ sau Điện 10 (`--sau-dien10`, thay `--sau-dien8`).
- Giữ kinh đô: các đợt giặc không tính theo cấp Điện, nên Điện 9, 10 không đổi độ khó giữ kinh đô.

### Hình

Đã làm (PR hình). Dáng xưởng mộc, làng chài cấp 9, 10 chủ dự án đã duyệt cùng PR luật. Móng các công trình đã kín ở cấp 8, nên cấp 9, 10 không thêm ô con mới trong bản vẽ, chỉ đổi phần sẵn có (ghi ở cuối `docs/bo-cuc-cong-trinh.md`).

- **Mái** (`roofFor`, `boatRoof`, `coneRoof` ở `buildings.ts`): cấp 9 có dải đồng sáng rủ dưới hai diềm mái thuyền, in hàng vòng tròn tiếp tuyến của texture hoa văn (`patternStrip`); mái nón có vành đồng hoa văn quanh diềm (`patternSkirt`); mái một dốc của lán lò rèn có dải dưới diềm trước. Cấp 10 đầu mái thuyền vút cao thêm 25%, mỗi đầu nóc một chim Lạc đồng dang cánh ngoảnh ra ngoài (`lacBird`, dáng như chim trên cột biểu nhưng ít mặt); mái nón có chim Lạc trên chóp. Chim đồng nhỏ ở hai đầu nóc (cấp 8) thôi vẽ khi mái đã có chim Lạc.
- Đã đổi so với bảng khi vẽ:
  - Điện cấp 9: tầng gác có ô cửa và lan can son thếp vàng giữa vách và mái, các mái phía trên đẩy lên theo; cột cái sơn đỏ in hoa văn. Cấp 10: cổng thành có hai trụ đất nện ốp đá, vòm cửa, lầu cổng son và hai tầng mái; trống đồng trên nóc to gấp rưỡi với bốn tượng cóc đồng (thay cột vàng và quầng sáng);
  - ruộng cấp 9: bờ ao lát phiến đá, cầu tre cong bắc qua ao nối hai nhánh bờ chữ thập. Cấp 10: miếu thành đình nhỏ có nền cao thêm một bậc, tầng mái trên, cây nêu tre treo dải đỏ và khánh đồng;
  - bến cấp 9: thêm cột neo đồng giữa cầu tàu, nẹp đồng hai mép cầu tàu, trụ đá thay cọc gỗ;
  - nhà sàn cấp 10: nhà phụ thành nếp nhà sàn mái thuyền, hiên có mái thay cầu tre;
  - bãi đất đá cấp 9: đường ray có xe goòng gỗ chở đá. Cấp 10: lò thêm ống khói thứ hai và giá phơi ngói mộc;
  - lò rèn cấp 9: trống vừa đúc trên giá cũng to hơn;
  - kho cấp 10: dải sân giữa vựa phụ và sân phơi lát gạch (sân phơi đã lát gạch từ cấp 7); vựa gỗ trên bốn chân thấp có cửa nhỏ và mái thuyền;
  - chòi canh cấp 10: tầng giữa có mái hiên theo cấp và hai nỏ lớn;
  - xưởng mộc cấp 10: lán sàn cao có bậc lên, vách sau chạm, hai chim Lạc trên đầu hai cột trước;
  - làng chài cấp 9: thêm cột chống thứ hai và hòn đá đối trọng ở gốc cần vó. Cấp 10: thuyền đánh cá có buồm cói (`makeSailBoat`) bơi ngoài xa, sau thuyền đánh cá thứ hai.
- **Độ nặng** (cảnh Điện 8 người chơi mô phỏng, khổ điện thoại; cảnh Điện 10 là cảnh ấy đặt mọi công trình lên cấp 10): Điện 8 không đổi (6,56 → 6,58 triệu tam giác); Điện 10: 1250 → 1338 lệnh vẽ, 6,81 → 7,08 triệu tam giác (chim Lạc vẽ ít mặt; với chim như cột biểu là 7,24 triệu).
- `node scripts/chup-cong-trinh.mjs <loại> --cap 8,9,10` chụp từng công trình ở các cấp chọn; loại còn vẽ theo móng cũ (chòi canh) có khung vừa chiều cao.

- **Mái theo cấp**: thêm hai bậc vào `roofFor`.
  - Cấp 9: mái ngói, sống mái và diềm bọc đồng vàng như cấp 8, **thêm dải hoa văn trống đồng** (vòng tròn tiếp tuyến) chạy dọc diềm mái.
  - Cấp 10: như cấp 9, **hai đầu nóc có chim Lạc đồng dang cánh** và đầu mái uốn cong vút hơn; mái nón, mái tròn thì chóp mái là chim Lạc.
- **Cỡ**: giữ 120% như cấp 8 (đã sát mép móng). Không chen thêm phần mới lớn vào móng đã kín; mỗi cấp đổi một phần sẵn có cho thấy rõ:

  | Công trình | Cấp 9 | Cấp 10 |
  |---|---|---|
  | Điện | nhà chính thêm tầng gác, cột sơn đỏ chạm hoa văn | cổng thành hai tầng thay cổng gỗ; trống đồng lớn trên nóc to gấp rưỡi, có tượng cóc đồng |
  | Ruộng | ao cò lát đá, cầu tre qua ao | miếu thần lúa mái ngói thành đình nhỏ có cây nêu |
  | Bến | cầu tàu lát đá, cột neo đồng | thuyền buôn lớn hai buồm thay thuyền thứ hai |
  | Nhà sàn | lan can sàn chạm khắc, cầu thang gỗ to | nhà sàn hai nếp nối hiên |
  | Bãi đất đá | đường ray gỗ cho xe đá | hai trâu kéo, lò gạch thành lò nung ngói |
  | Lò rèn | khuôn đúc trống đồng lớn | tháp lò cao có khói đỏ |
  | Kho thóc | vựa chính lên mái ngói hai tầng | thêm sân phơi lát gạch, cót thành vựa gỗ |
  | Chòi canh | lầu canh thêm ụ đá chân chòi | chòi canh hai tầng, nỏ trên cả hai tầng |
  | Xưởng mộc | thuyền lớn trên giàn đà có mui và mái chèo | lán thứ hai thành nhà sàn chạm, cột khắc chim Lạc |
  | Làng chài | giàn vó lớn ven bờ | thêm thuyền đánh cá thứ hai có buồm cói |

- Bản vẽ ô con trong `docs/bo-cuc-cong-trinh.md` ghi thêm cấp 9, 10 cho Điện và chín loại lên cấp; `footprint.test.ts` canh không tràn móng ở cả 10 cấp; chụp bằng `chup-cong-trinh.mjs` ở cấp 8, 9, 10 cạnh nhau để chủ dự án duyệt dáng.

### Code (PR luật, đã làm)

- `defs.ts`: `maxLevel` 10 cho Điện và chín loại; mọi mảng theo cấp Điện đủ 10 phần tử (số tối đa, `STORAGE_CAP`, `ROAD_LIMIT` 295, 310, `FIELD_CAP`, `GUARD_CAP`, `TET_NEED`, ụ nỏ, đồ trang trí, thưởng dọn cây đá 530, 740 gạo và 265, 370 đất đá); `TOWER.dmg`, `CA_PER_MIN` thêm hai cấp; `DIEN10_CHALLENGES`. Các loại khác giữ số tối đa như Điện 8.
- `game.ts` (`canUpgrade`): lý do mới `canHetTruyen`, `canThuThach`. Nhiệm vụ mới kiểu `buildingLevel` (có công trình ở cấp ấy trở lên).
- `khoanh.ts` (`V11_AREA` giữ 45 ở Điện 9, 10: khung mẫu giữ như Điện 8), `mau.ts` (`MAU_BARRACKS` giữ 5). Cầu qua sông, bản làng, đồn biên (vùng bên kia sông) giữ số tối đa như Điện 8; làng bên kia làm ra theo cấp Điện nên Điện 9, 10 làng làm ra nhiều hơn. Mẫu kinh đô dựng được ở Điện 9, 10 cho cả bốn mẫu, đủ ruộng và chòi canh mới.
- Bản lưu **phiên bản 19** (chỉ đổi số; phiên bản 18 là vùng đất bên kia sông).
- Nhiệm vụ Lạc hầu 50–53: lên Điện 9, một công trình cấp 9, lên Điện 10, một công trình cấp 10.
- Bảng Điện, bảng công trình không phải sửa: đã đọc `maxLevel` và các mảng theo cấp.
- Test: `cap910.test.ts` (mốc mở, giá, sản lượng, số tối đa, khoảnh, kho, nhiệm vụ, mẫu, bản lưu), `balance.test.ts` (nhịp Điện 9, 10), `kinhTe.test.ts` (giai đoạn sau truyện); các test cũ ghi cứng 8 cấp nay ghi 10.

### Binh khí bậc 3 và lầu nỏ lên cấp (PR 3, đã làm)

Số cuối cùng. Kế hoạch đã duyệt có số của lầu nỏ; giá binh khí bậc 3, luật ghép chòi cao và dáng chưa có trong kế hoạch, được đề xuất khi làm PR này; chủ dự án cho gộp theo đề xuất.

**Lầu nỏ lên cấp** (`lauNo` ở `defs.ts`: `maxLevel` 3, `levelMinDien` [0, 0, 9, 10]; `LAU_NO.dmg` theo cấp)

| Cấp | Cần | Giá nâng | Mỗi mũi (3 mũi mỗi phát) | Máu |
|---|---|---|---|---|
| 1 | ghép hai chòi canh cấp 8, Điện 8 | 2000 vỏ ốc, 2000 đất đá, 500 sắt (giá ghép) | 34 | 1400 |
| 2 | Điện 9 | 3200 vỏ ốc, 3200 đất đá, 800 sắt | 41 | 1540 |
| 3 | Điện 10 | 5000 vỏ ốc, 5000 đất đá, 1300 sắt | 49 | 1700 |

- Tầm, nghỉ giữa hai phát, số tối đa (3 lầu nỏ, mỗi lầu tính hai chòi canh), Đền Cổ Loa và Lệnh bắn giữ như cấp 1.
- **Ghép chòi canh đã lên cấp 9, 10** (`mergedLevel` ở `chuong4.ts`): lầu nỏ ra ngay cấp 2, 3 theo chòi thấp hơn trong hai chòi (cấp 8 và cấp 10 ghép ra cấp 1). Nâng hai chòi lên cấp 9 tốn hơn nâng một lầu nỏ lên cấp 2, nên luật này chỉ để người chơi khỏi mất công nâng chòi, không thành đường tắt. Bảng chòi canh cấp 9, 10 có thêm một dòng báo lầu nỏ sẽ ra cấp mấy.
- Bảng lầu nỏ ghi sức bắn (mỗi mũi, số giặc mỗi phát) và sức bắn cấp sau, như bảng cổng thành.
- Dáng (`makeLauNo(level)` ở `buildings.ts`, mỗi cấp cao thêm một chút, mái theo cấp: cấp 1 như cấp 8, cấp 2 như cấp 9, cấp 3 như cấp 10):
  - cấp 2: lớp chân dưới cùng ốp đá hộc, bốn khiên đồng mặt trống treo giữa bốn mặt lan can tầng dưới (dưới diềm mái nên nhìn từ xa thấy rõ);
  - cấp 3: cả ba lớp chân ốp đá, đai đồng vàng giữa các lớp, viền khiên vàng; ba nỏ lớn thành ba nỏ liên châu có hộp tên (dáng nỏ của Cao Lỗ); chim đồng trên đỉnh to hơn.

**Rèn binh khí bậc 3** (`ARMS[2]` ở `defs.ts`)

- Cần lò rèn cấp 9 (lò rèn cấp 9 cần Điện 9, tức đã hết truyện), đã rèn bậc 2. Giá **2000 sắt, 2000 vỏ ốc** mỗi binh chủng (bậc 2 là 900, 900; gấp chừng 2,2 lần như từ bậc 1 lên bậc 2). Thêm 10% máu và sức đánh như hai bậc trước (cộng 30%), ở mọi trận.
- Cả bốn binh chủng. Bảng lò rèn ghi "Bậc n/3"; chưa có lò rèn cấp 9 thì nút Rèn bậc 3 mờ, có dòng "Cần lò rèn cấp 9".
- Chuẩn cân bằng phó bản và thử thách không đổi: người chơi giỏi vẫn tính rèn đủ 2 bậc (`FULL_ARMS` ở `testkit.ts`), vì bậc 3 chỉ có sau truyện. Người chơi mô phỏng không rèn binh khí, nên nhịp Điện 9, 10 không đổi.
- Dáng bậc 3 (chung một dấu hiệu: đồng vàng):

  | Binh chủng | Rèn bậc 3 |
  |---|---|
  | Giáo binh | lông chim vàng xen giữa mũ lông, cao hơn, vành mũ đồng vàng; lưỡi giáo sắt to hơn, họng, đai và gờ sống bọc đồng vàng; khiên to hơn, viền đồng vàng, núm vàng, hai tua đỏ |
  | Cung thủ | mũ lông như giáo binh; giáp ngực đồng có núm vàng thay giáp da; cung sừng đầu bịt vàng, chuôi quấn đai vàng; bao tên đồng vàng |
  | Lính nỏ | mũ đồng năm chóp lông (hai chóp ngoài lông vàng), vành mũ vàng; đầu cánh nỏ bịt vàng, đai vàng quấn cổ nỏ; bao tên đồng vàng |
  | Voi chiến | giáp trán đồng vàng có núm mặt trời; hai chuông đồng vàng đeo cổ; lọng hai tầng, viền tầng dưới vàng, chóp vàng |

- Test: `cap910.test.ts` (lầu nỏ lên cấp, giá, máu, ghép chòi cao, sát thương theo cấp trong trận; rèn bậc 3, giá, máu, lưu và nạp lại). Bản lưu giữ phiên bản 19 (bậc rèn và cấp lầu nỏ chỉ nới giới hạn, không đổi cấu trúc).

### Thứ tự làm

0. **Duyệt tài liệu này**: chủ dự án đã duyệt theo đề xuất.
1. **PR cấp 9–10 phần luật** (đã làm): mảng theo cấp lên 10, Điện 9–10, chín loại, kho, mẫu, nhiệm vụ, bản lưu 19, test và nhịp. Hình tạm dùng dáng cấp 8; mái mới để sang PR hình.
2. **PR cấp 9–10 phần hình** (đã làm): mái cấp 9, 10 và dáng cấp 9, 10 cho Điện và chín loại (cả chòi canh), chụp kiểm tra. Lầu nỏ đổi dáng cùng PR lầu nỏ lên cấp.
3. **PR binh khí bậc 3 và lầu nỏ lên cấp** (đã làm): xem mục Binh khí bậc 3 và lầu nỏ lên cấp ở trên.

## Kế hoạch: vùng đất bên kia sông (chủ dự án đã duyệt, đã làm)

Chủ dự án yêu cầu: khám phá vùng đất mới bên kia sông để mở rộng lãnh thổ, có bắc cầu, điều quân. Kế hoạch này làm lần đầu trên một nhánh riêng (cả năm PR) khi `main` còn cũ, nhưng nhánh ấy không kịp gộp. Sau đó `main` đi trước 72 commit (sông rộng 7 ô, khoảnh tự chọn, gỗ, làng chài, cổng thành, chương 4, cây đá), nên làm lại từ đầu trên `main` mới, theo đúng các phương án chủ dự án đã đồng ý, trừ những chỗ đổi ghi ở dưới. Như các kế hoạch trước, số cho chỉnh ±20% theo test; làm xong phần nào thì ghi số cuối cùng của phần ấy.

**Đã chốt** (chủ dự án đồng ý mọi phương án khuyên dùng của bản đề xuất):
1. Bờ bên kia là đất thật trong cùng lưới kinh đô, không phải bản đồ vùng riêng: thấy cầu và quân qua sông ngay trước mắt.
2. Mở từ Điện cấp 4 ở chương 1.
3. Mở cả hai bờ: bờ nam sông Đà, bờ đông sông Thao.
4. Đánh đồn ngoài bãi chiến như phó bản, có cảnh hành quân qua cầu trên kinh đô trước trận.
5. Bên kia cho đặc sản đất, bản làng và của chôn; không thêm số công trình tối đa.
6. Giặc tới từ bên kia sông, có đồn biên để chia quân giữ hai bờ.
7. Lũ cuốn cầu tre; cầu hư thì người làm không sang được.
8. Tên gọi: "bờ nam sông Đà", "bờ đông sông Thao".

**Đổi khi làm lại trên `main` mới**:
- **Sông rộng 7 ô** (bến cấp 8 cùng hai thuyền buôn neo giữa dòng): bờ bên kia bắt đầu từ ô 59 chứ không phải ô 55, lưới **76×76** chứ không phải 72×72, cầu vắt qua 7 ô sông.
- **Đất bên kia không mua bằng của** (chủ dự án dặn khi bỏ lượt phát rừng, rồi chọn lại khi làm lại): mỗi khoảnh bên kia thuộc **vùng của một đồn giặc**; **dẹp đồn thì cả vùng ấy về tay ta**, không trả gạo, vỏ ốc. Bản đề xuất cũ cho trả gạo, vỏ ốc mở từng khoảnh sau khi dẹp đồn; nay bỏ.
- **Gỗ** đã là tài nguyên thứ năm: cầu gỗ tốn gỗ.
- **Làng chài** đã là công trình bên này: làng bên kia làm ra vỏ ốc gọi là **làng mò ốc**.
- **Cao Lỗ** đã có: đồn bậc 4 có tướng như trận chương 4 (`heroFor`).
- **Thủy binh Triệu** đã có: bờ bên kia có công trình thì thuyền giặc cũng có thể cập bờ ấy (PR 5).

**Học cơ chế** từ game cùng thể loại (chỉ học cơ chế, luật chơi và hình ảnh vẫn là của riêng game này):
- Northgard: bản đồ chia vùng; trinh sát đi dò sương mù; có vùng bị thú dữ, quái vật giữ, phải đem quân dẹp mới chiếm được; nhiều vùng có đặc điểm riêng có lợi cho công trình hợp với nó.
- Rise of Kingdoms: trinh sát mở sương mù; đồn man di rải trên bản đồ để đánh lấy thưởng; cửa ải phải chiếm mới sang được vùng sau.

### Bản đồ

```
             x 0–1   2 … 51     52–58      59 … 73    74–75
  z 0–1      rừng    rừng       sông Thao  rừng       rừng
  z 2–51     rừng    KINH ĐÔ    sông Thao  BỜ ĐÔNG    rừng
  z 52–58    ─────────────────── sông Đà ──────────────────
  z 59–73    rừng    BỜ NAM     rừng (góc đông nam)
  z 74–75    rừng    rừng       rừng
```

- Lưới 76×76. Sông Thao (x 52–58) chảy từ bắc xuống, đổ vào sông Đà ở ngã ba; sông Đà (z 52–58) chảy suốt bề ngang về phía đông. Mọi tọa độ bên này giữ nguyên.
- **Bờ nam sông Đà**: ô x 2–51, z 59–73. **Bờ đông sông Thao**: ô x 59–73, z 2–51. Mỗi bờ sâu 3 khoảnh, dài 10 khoảnh: 30 khoảnh mỗi bờ. Hai ô ngoài cùng (74–75) là rừng, chỗ giặc bên kia xuất phát. Góc đông nam sau ngã ba là rừng không khai phá.
- Độ cao bờ bên kia theo cùng luật bên này, soi gương qua sông: ba ô sát sông là bãi bồi bậc 0, vào trong là đồng bằng có gò, sát rừng là đồi. Nhiễu tính theo tọa độ ô, nên độ cao bên này **giữ y như cũ** (test so dấu vân tay).
- Trong trận giữ kinh đô, thủy quái và thuyền giặc vẫn chỉ dùng ba ô sông sát bờ bên này (`RIVER_DIVE`, ô 55), như khi sông trong lưới còn rộng 3 ô, nên độ khó mọi trận giữ nguyên.

### Cầu

- Thẻ **Cầu** trong bảng Xây dựng, mở ở Điện cấp 4. Cầu rộng 2 ô, vắt qua 7 ô sông; đầu bên này chạm đất đã khai phá. Tối đa một cầu qua sông Đà, một cầu qua sông Thao. Chạm đâu thì cầu bám theo sông, dịch tới đó.
- Bắc cầu xong thì **khoảnh đầu cầu** (khoảnh bên kia mà đầu cầu chạm vào) được dò và mở luôn, làm chỗ đặt chân. Không bắc cầu thẳng vào khoảnh có đồn.

  | Cấp | Tên | Cần | Giá (nháp) | Máu | Lũ |
  |---|---|---|---|---|---|
  | 1 | Cầu phao tre | Điện 4 | 400 gạo, 300 vỏ ốc, 200 đất đá | 600 | lũ từ bậc 2 thì cuốn trôi (hư) |
  | 2 | Cầu gỗ | Điện 6 | 1400 vỏ ốc, 1000 đất đá, 800 gỗ, 250 sắt | 1500 | chịu tới bậc 2, bậc 3 thì hư |
  | 3 | Cầu gỗ lớn có lầu đầu cầu | Điện 7 | 2400 vỏ ốc, 2000 đất đá, 1500 gỗ, 500 sắt | 2600 | không sợ lũ |

- Quân ta, giặc trên bộ và người làm đi qua cầu như đi trên đất. Cầu hư thì không ai qua được. Sửa cầu tốn 30% giá như công trình khác. Giặc không nhắm phá cầu. Thuyền đi dưới gầm cầu.
- Cầu bị lũ cuốn thì phải sửa, nhưng không tính là để mất mùa lũ.
- **Chỗ có cầu thì sông không còn là hào kín**: đếm vòng thành coi ô cầu là đi được. Vòng thành dựa vào bờ sông mà hở ở đầu cầu thì không tính nữa. Mẫu Cổ Loa có vòng kín quanh Điện, không chạm sông, nên không đổi.
- Áp mẫu kinh đô chừa ô đầu cầu bên này.

### Sương mù và trinh sát

- Mỗi khoảnh bên kia có ba trạng thái: **chưa dò** (mây phủ, chỉ thấy ngọn cây), **đã dò** (thấy địa hình và điểm lạ), **đã mở** (xây được).
- Chạm khoảnh chưa dò sát vùng đã dò (4 hướng) để **sai trinh sát**: 60 gạo, 20 vỏ ốc. Người trinh sát chạy từ sân Điện qua cầu tới đó; sau **40 giây chơi** thì khoảnh ấy và các khoảnh kề cạnh hiện ra. Một lúc một trinh sát, từ Điện 6 thì hai. Cầu sang bờ ấy phải còn nguyên.
- Trinh sát đi theo đồng hồ chơi như thuyền buôn, vẫn đi khi có giặc hay lũ (chỉ là dò đường).

### Đồn giặc, vùng đồn, điểm lạ

Điểm lạ cố định, mọi máy như nhau, hai bờ chung khung đồn. Khoảnh đếm `i` từ tây (bờ nam) hay từ bắc (bờ đông), `j` từ bờ sông; ngã ba ở phía `i` = 9, gần kinh đô:

```
j\i  0      1      2      3      4      5      6      7      8      9
2    .      .      cua    Đ4     .      .      đs3    Đ3     .      cua
1    đs2    Đ2     .      .      làng   Đ2     .      .      đs1    .
0    làng   .      .      Đ1     .      .      .      .      Đ1     .
```

Mỗi khoảnh thuộc vùng của một đồn (chữ cái là đồn, hoa là chỗ đồn đóng):

```
j\i  0  1  2  3  4  5  6  7  8  9
2    c  c  e  E  e  d  f  F  f  b
1    c  C  c  a  d  D  d  f  b  b
0    c  c  a  A  a  d  b  b  B  b
```

| Đồn | Bậc | Vùng | Trong vùng |
|---|---|---|---|
| A (3, 0) | 1 | 4 khoảnh | đất trống |
| B (8, 0) | 1 | 7 khoảnh | đặc sản đs1, của chôn (9, 2) |
| C (1, 1) | 2 | 7 khoảnh | làng (0, 0), đặc sản đs2 |
| D (5, 1) | 2 | 5 khoảnh | làng (4, 1) |
| E (3, 2) | 4 | 3 khoảnh | của chôn (2, 2) |
| F (7, 2) | 3 | 4 khoảnh | đặc sản đs3 |

| Ô | Bờ nam sông Đà | Bờ đông sông Thao |
|---|---|---|
| đs1 | bãi phù sa | núi đá |
| đs2 | bãi phù sa | mỏ sắt |
| đs3 | núi đá | mỏ sắt |
| làng (4, 1) | làng trồng lúa (gạo) | làng thợ đá (đất đá) |
| làng (0, 0) | làng mò ốc (vỏ ốc) | làng thợ rèn (sắt) |

- Đồn chỉ cần dò thấy là đánh được, không cần mở đất tới nơi. Dẹp đồn thì đồn cháy rồi tan, cờ đỏ của ta cắm lên, **cả vùng của đồn được mở**, kể cả khoảnh chưa dò (dò luôn). Đồn đã dẹp thì hết, không đánh lại.
- Khoảnh đầu cầu mở khi bắc cầu dù nằm trong vùng đồn chưa dẹp; các khoảnh khác của vùng ấy vẫn chờ dẹp đồn.

### Điều quân dẹp đồn

- Chạm đồn đã dò: bảng đồn ghi quân giặc, bậc, cần chương nào, thưởng, vùng sẽ mở. Nút **Điều quân** mở bảng xếp quân như phó bản.
- Bốn bậc theo bốn chương, mỗi bậc là giặc của chương ấy: bậc 1 giặc Ân (Điện 4), bậc 2 thủy quái ở đầm lau (vào chương 2), bậc 3 yêu tinh (vào chương 3), bậc 4 quân Triệu trên bộ (vào chương 4). Tướng ra trận như trận của chương ứng với bậc.
- Thưởng lần đầu (nháp): bậc 1: 400 gạo, 300 vỏ ốc, 250 đất đá, 60 sắt; bậc 2: 1300, 900, 700, 180; bậc 3: 2400, 1700, 1500, 400; bậc 4: 4200, 3500, 3100, 800. Số giặc và máu đo bằng test theo **Chuẩn cân bằng phó bản**.
- Đánh ngoài bãi chiến như phó bản: lính chết thì mất; thua thì đồn còn đó, đánh lại được; đang đánh thì đồng hồ giặc đứng. Trước trận, quân đi thành hàng từ doanh trại qua cầu tới đồn vài giây ngay trên kinh đô. Bãi chiến mới **bờ bên kia**: bãi sông có lau sậy, cầu tre sau lưng quân ta, đồn rào cọc sau lưng giặc.

### Đất bên kia được gì

- Công trình bên kia vẫn tính vào số tối đa chung. Bên kia cho ba thứ bên này không có:
  - **Đặc sản đất**: công trình có móng nằm trọn trong khoảnh đặc sản hợp nghề làm ra thêm **30%** (bãi phù sa: ruộng lúa, ruộng nếp; núi đá: bãi đất đá; mỏ sắt: lò rèn);
  - **Bản làng**: dâng lễ kết thân (600 gạo, 400 vỏ ốc) khi làng đã về vùng ta thì làng về theo, làm ra bằng nửa một công trình cùng nghề đủ người ở cấp bằng cấp Điện, không cần dân;
  - **Của chôn**: khoảnh có của chôn được mở thì đào được một lần, thưởng 5% giá nâng Điện lên cấp kế tiếp.
- Cầu hư thì công trình bên kia không có người làm (dân bên này không sang được); làng vẫn làm ra.
- Áp mẫu kinh đô chỉ xếp bờ bên này. Người chơi mô phỏng không sang sông, nên nhịp lên Điện ở `balance.test.ts` không đổi.

### Phòng thủ hai bờ

- Bờ bên kia đã có công trình hay làng về theo thì cứ ba đợt giặc trên bộ có một đợt tới từ **bìa rừng bên kia**; trinh sát báo hướng ("bên kia sông Đà", "bên kia sông Thao").
- Giặc bên kia nhắm làng gần nhất trước, rồi qua cầu tìm kho và Điện; cầu hư thì chỉ phá bên kia rồi rút.
- **Đồn biên** (4×4, chỉ dựng bên kia, mỗi bờ một, cần Điện 5): chọn số lính đóng ở đồn; khi giữ kinh đô, lính đóng ra trận từ đồn biên.
- Thủy binh Triệu: bờ bên kia có công trình thì thuyền cũng có thể cập bờ ấy.

### Hình ảnh

- Bờ bên kia là đất bậc thang như bên này, rừng phủ chỗ chưa mở, thưa hơn bên này một chút và không đổ bóng cho nhẹ máy.
- Sương mù: mây cuộn màu kem như giấy, viền mực, xoắn như hoa văn mây trên trống đồng; dò xong thì tan trong chừng 1 giây.
- Cầu phao tre: bè tre kết dây mây. Cầu gỗ: cột gỗ, lan can. Cấp 3: có lầu canh mái ngói ở đầu cầu bên này.
- Đồn giặc theo bậc, rào cọc nhọn, lều, lửa trại, vài lính gác đứng yên. Bản làng: hai ba nhà sàn nhỏ, cờ trắng; về theo thì cắm cờ đỏ. Đặc sản: phù sa đất nâu thẫm có lau, núi đá xám lộ, mỏ sắt đá đỏ gỉ. Của chôn: gò đất lóe ánh đồng.

### Bản lưu

- **Phiên bản 18** (PR 1): mảng độ cao dàn lại từ 55×55 sang 76×76; ô sông và bờ bên kia lấy độ cao tự nhiên. Trận giữ kinh đô đang dở thì đổi đường đi của giặc (lưu theo chỉ số ô) sang chỉ số ô mới, đánh tiếp được.
- Các PR sau thêm phần bên kia: khoảnh đã dò, đã mở, trinh sát đang đi, đồn đã dẹp, làng đã về theo, lính đóng ở đồn biên. Cầu và đồn biên là công trình như mọi công trình khác.

### Thứ tự làm

1. **PR 1: lưới qua sông** (đã làm, bản lưu v18): nới lưới lên 76×76, đất thật ở hai bờ bên kia (toàn rừng, chưa mở được), độ cao, nâng bản lưu. Luật chơi chưa đổi gì. Chi tiết đã làm:
   - **Tọa độ cảnh** giữ gốc ở tâm lưới 55×55 cũ (`HALF` = 27,5 trong `world.ts`), nên camera, ánh nắng, bóng đổ và ảnh chụp thử không xê dịch. Camera vẫn kéo trong vùng đất bên này.
   - **Nước** chỉ phủ hai dòng sông; mảng nước lũ phủ kín bờ bên kia trước đây bỏ đi (bờ bên kia chưa khai phá nên không ngập, như rừng bên này).
   - **Thủy quái bỏ chạy** lặn ở ô 55 như trước, thuyền giặc Triệu hiện ra ở đó (`RIVER_DIVE`).
   - **Thuyền** xuôi sông Thao tới ngã ba thì rẽ sang sông Đà; thuyền sông Đà chạy suốt. Trước đây sông Thao chảy suốt, sông Đà đổ vào sông Thao.
   - **Nặng máy**: rừng hai bờ bên kia dựng riêng một lần (bên này dựng lại mỗi lần phát rừng), mật độ 0,4 (bãi bồi 0,22) so với 0,65 bên này, không đổ bóng; rừng ngoài lưới sau bờ bên kia chỉ một dải thưa 5 ô.
2. **PR 2: cầu, sương mù, trinh sát, điểm lạ** (đã làm, cùng bản lưu v18), đoạn truyện "Bên kia sông". Số như bảng trên (giá cầu, lũ cuốn cầu, trinh sát 60 gạo 20 vỏ ốc, 40 giây). Chi tiết đã làm:
   - **Luật** ở `src/game/benKia.ts`: khoảnh bên kia, điểm lạ cố định, vùng đồn (`campOf`, `regionOf`), cầu (`bridgeFit`, `bridgeSnap`, đầu cầu), trinh sát. Cầu là hai loại công trình `cauSongDa` (2×7 ô, nằm trên sông Đà) và `cauSongThao` (7×2 ô), mỗi loại một cái. Ô cầu còn nguyên đi được (tìm đường, đếm vòng thành); cầu không phải đích của giặc, không chắn đường.
   - **Đất đã mở bên kia** dùng chung mặt nạ đất đã mở với bên này (`openMask`): dựng công trình, đắp đất, lũ loang như bên này. Khoảnh đầu cầu mở dù vùng ấy còn đồn giữ.
   - **Chạm để đặt cầu**: cầu bám theo sông, chạm đâu thì cầu dịch dọc sông tới đó. Cầu không dời được. Có cầu thì camera kéo được sang bờ bên kia.
   - **Mây mù** chỉ hiện từ Điện cấp 4 (lúc kể đoạn "Bên kia sông"), để đầu chương 1 nhìn như cũ. Mây cuộn màu kem viền mực, mỗi khoảnh bảy cụm, ngọn cây nhô lên; khoảnh vừa dò thì mây phình ra, bay lên, mờ dần trong một giây. Góc đông nam sau ngã ba không thuộc khoảnh nào nên không có mây.
   - **Điểm lạ đã dò**: khoảnh ấy phát trống cả khoảnh. Đồn bậc 1 và 4 có rào cọc, lều, cờ, lửa trại; bậc 2 vũng bùn lau sậy xương cá; bậc 3 đá tím, ma trơi; mỗi đồn hai lính gác đứng yên đúng loại giặc. Làng: ba nhà sàn nhỏ, cờ trắng. Bãi phù sa: đất bùn nâu thẫm, vũng nước, khóm lau; núi đá đá xám; mỏ sắt đá đỏ gỉ. Của chôn: gò đất lấp ló mặt trống đồng. Đồn đã dẹp: đất cháy sém, cọc đổ, cờ đỏ của ta (dùng từ PR 3). Hình vẽ ở `src/render/benKia.ts`.
   - **Cầu**: cấp 1 bảy bè tre kết dây mây nhấp nhô theo sóng; cấp 2 cầu gỗ vồng nhẹ, lan can gỗ; cấp 3 vồng cao, lan can đỏ, lầu canh mái ngói ở đầu cầu bên này. Bảng cầu ghi sức chịu lũ của cấp này và cấp sau, và nhắc vòng thành dựa sông bị hở ở đầu cầu. Cầu bị lũ cuốn không tính là để mất mùa lũ.
   - **Người trinh sát** (giáo binh có khung xương) chạy từ sân Điện qua cầu tới khoảnh đang dò, đúng nhịp đồng hồ chơi. Dòng tin trên dock báo trinh sát đang đi, đếm ngược; về tới nơi thì báo một dòng.
   - **Bảng Đất bên kia sông**: chạm đất bên kia chưa mở (không trúng công trình). Ghi bờ, khoảnh thứ mấy, đã dò chưa, điểm lạ, đồn nào giữ vùng ấy, nút Sai trinh sát kèm giá hay lý do chưa sai được.
   - **Nặng máy**: mây cả 60 khoảnh là một lệnh vẽ (thêm viền mực một lệnh). Cảnh kinh đô Điện 5 có hai cầu, mây phủ gần hết: chừng 480–560 lệnh vẽ, 5,2–5,5 triệu tam giác.
3. **PR 3: đồn giặc và điều quân** (đã làm): 12 đồn bốn bậc, dẹp đồn chiếm vùng, hành quân qua cầu, bãi chiến bờ bên kia, cân bằng theo chuẩn. Số cuối cùng:

   | Bậc | Quân giặc | Máu | Tướng khi đo | Quân mẫu | Thưởng (một lần) |
   |---|---|---|---|---|---|
   | 1 | 7 lính giáo, 4 cung, 2 chiến xa | ×1,9 | không tướng | 10 giáo, 6 cung, 3 voi (25 chỗ, vừa 28 chỗ một trận ở Điện 4) | 400 gạo, 300 vỏ ốc, 250 đất đá, 60 sắt |
   | 2 | 11 tôm binh, 7 cá phun nước, 3 cá sấu | ×2,95 | Gióng hiển linh | 14 giáo, 12 cung, 4 voi | 1300 gạo, 900 vỏ ốc, 700 đất đá, 180 sắt |
   | 3 | 12 quỷ núi, 7 ma trơi, 3 hổ tinh | ×3,05 | Sơn Tinh hiển linh | như trên | 2400 gạo, 1700 vỏ ốc, 1500 đất đá, 400 sắt |
   | 4 | 14 lính khiên, 8 nỏ thủ, 4 kỵ binh Triệu | ×2,6 | An Dương Vương | 11 giáo, 10 cung, 3 voi, 4 nỏ (quân mẫu chương 4) | 4200 gạo, 3500 vỏ ốc, 3100 đất đá, 800 sắt |

   - Máu là mức cao nhất mà người chơi thường (bấm chậm 1,5 giây, không có Đền) vẫn thắng cả 10 hạt giống thử, đo lại trên bộ máy trận hiện tại (ra đúng như lần đo trên nhánh cũ). Ở mức ấy, không tướng hay nửa quân thì chơi giỏi cũng thua cả 10 lần (bậc 1: nửa quân thua). Test giữ chuẩn với 3 hạt giống (`benKia.test.ts`, `fightField` ở `testkit.ts`).
   - Tướng ra trận như trận của chương ứng với bậc (`campHero`, `heroFor` không theo màn): bậc 4 là An Dương Vương, vua đã xuống biển thì Cao Lỗ. Đánh được khi: đã dò thấy đồn, tới đúng chương (bậc 1 cần Điện cấp 4), có doanh trại, cầu sang bờ ấy còn nguyên, không đang có giặc hay đang đánh phó bản; mang tối đa số chỗ một trận phó bản (`FIELD_CAP`). Huân công, binh khí, phúc lành cộng như phó bản.
   - **Dẹp đồn**: nhận thưởng một lần, cả vùng của đồn được dò và mở (`finishCamp`). Đồn đã dẹp thì hết. Thắng đồn không tính là thắng màn phó bản.
   - **Bảng đồn** nằm trong bảng Đất bên kia sông: quân giặc, thưởng một lần, số khoảnh sẽ về tay ta, tướng ra trận, lời báo đỏ như thẻ màn, nút ⚔️ Điều quân mở bảng xếp quân (dùng chung với phó bản).
   - **Hành quân**: bấm Xuất quân thì đóng bảng, quân ta (tối đa chừng 18 người theo đúng tỉ lệ binh chủng) đi thành hàng từ sân doanh trại tới đầu cầu, qua cầu, tới đồn trong 3,2 giây, camera đi theo đầu hàng; rồi sang bãi chiến.
   - **Bãi chiến bờ bên kia** (nền `benKia` trong `battlefield.ts`): sông chảy ngang sau lưng quân ta có cầu phao tre, lau sậy hai bờ (chừa chỗ Lạc tướng đánh trống và đầu cầu), giặc đóng đồn rào cọc có lều và cờ. Đồn bậc 3 (yêu tinh) dùng bãi núi Thất Diệu.
   - **Kết quả**: hộp kết quả như phó bản, tiêu đề "Dẹp xong đồn giặc", chỉ có nút về kinh đô. Ở kinh đô, đồn đã dẹp thành đất cháy sém có cờ đỏ của ta.
   - **Ô đầu cầu** (hai bờ) chừa làm lối lên cầu: không dựng hay dời công trình đè lên (đường đi thì trải được), như áp mẫu đã chừa.
4. **PR 4: đặc sản, bản làng, của chôn** (đã làm). Số cuối cùng và những chỗ đổi so với nhánh cũ:
   - **Không có bước khai phá trả của**: đất bên kia mở khi bắc cầu (khoảnh đầu cầu) hay khi dẹp đồn (cả vùng). Nhánh cũ có `openPlot` trả 5% giá nâng Điện; nay bỏ theo quyết định "dẹp đồn chiếm cả vùng".
   - **Đặc sản**: móng nằm trọn trong khoảnh đặc sản hợp nghề thì làm ra thêm 30% (bãi phù sa: ruộng lúa, ruộng nếp; núi đá: bãi đất đá; mỏ sắt: lò rèn). Đất đặc sản đã về tay ta pha màu (nâu thẫm, xám, đỏ gỉ) thay cho dấu đặc sản, để biết dựng vào đâu. Bảng công trình ghi "Bãi phù sa: làm ra thêm 30%".
   - **Bản làng**: dâng lễ kết thân 600 gạo, 400 vỏ ốc khi đất làng đã về tay ta. Làng về theo làm ra bằng **nửa** một công trình cùng nghề đủ người ở cấp bằng cấp Điện (làng lúa như ruộng, làng mò ốc như bến, làng thợ đá như bãi đất đá, làng thợ rèn như lò rèn), không cần dân, có đền và phúc lành cộng thêm. Ở Điện 6 bốn làng thêm 75 gạo, 75 vỏ ốc, 72,5 đất đá, 20 sắt mỗi phút: chừng 10%, 15%, 15%, 30% số làm ra bình quân của người chơi mô phỏng trong chương 2 (sắt là thứ được nhiều nhất, vì sắt hiếm; số này cho chỉnh khi chơi thử). Ba ô giữa khoảnh làng là nhà làng, không dựng công trình đè lên được; làng về theo thì cắm cờ đỏ, có dân làm việc theo nghề.
   - **Của chôn**: khoảnh có của chôn về tay ta (dẹp đồn giữ vùng ấy) thì đào được một lần, thưởng 5% giá nâng Điện lên cấp kế tiếp, mọi loại tài nguyên trong giá ấy; ghi chung vào phần thưởng của trận dẹp đồn.
   - **Cầu hư** (hay chưa có) thì công trình bên kia không làm ra gì, kể cả làng chài bên kia không đánh cá; bảng công trình báo đỏ. Làng vẫn làm ra.
   - **Bến, làng chài** dựng được sát sông ở bờ bên kia, quay mặt ra sông (`riverFacing`), thuyền neo đúng phía. Thuyền buôn ghé bến bên này trước.
   - Người chơi mô phỏng không sang sông, nên nhịp lên Điện ở `balance.test.ts` và sổ kinh tế không đổi.
5. **PR 5: phòng thủ hai bờ** (đã làm): giặc từ bìa rừng bên kia, đồn biên, thủy binh Triệu cập bờ bên kia. Chi tiết đã làm:
   - **Lịch**: bờ bên kia đã có công trình (kể cả nhà làng, đồn biên; cầu thì không tính) thì đợt giặc thứ 3, 6, 9… tới bờ bên kia (`farRaidBank`); hai bờ đều có thì thay phiên. Giặc trên bộ (giặc Ân, yêu tinh, quân Triệu) ra từ bìa rừng ngoài cùng bên ấy (`namXa`, `dongXa`); thủy binh Triệu cập bờ bên ấy. Lũ vẫn từ sông như cũ. Chưa có gì bên kia thì lịch như cũ. Trinh sát báo "bên kia sông Đà / bên kia sông Thao", dải đỏ ở bìa rừng bên ấy, nút xem lướt camera tới đó.
   - **Bản làng thành công trình** (`banLang`, 3×3 giữa khoảnh làng, dựng khi làng về theo): giặc đánh được, máu 700. Làng hư thì thôi làm ra; sửa tốn 30% lễ kết thân như công trình khác.
   - **Giặc bên kia** nhắm làng gần nhất trước; còn cầu sang bờ ấy thì qua cầu tìm kho rồi Điện; không có cầu (hay cầu hư) thì chỉ phá công trình bên ấy, hết thì rút về rừng.
   - **Đồn biên** (`donBien`, 4×4, mỗi bờ một, cần Điện 5, 800 gạo, 600 vỏ ốc, 600 đất đá, 100 sắt, máu 900): rào cọc, chòi canh, hai lán lính, cờ đỏ. Bảng đồn biên chọn số lính mỗi binh chủng đóng ở đồn (không quá quân đang có, trừ phần đóng ở bờ kia). Khi giữ kinh đô, lính đóng ra trận từ đồn biên còn nguyên, lấy bớt từ phần lính giữ kinh đô của các doanh trại (không thêm quân); đồn hư thì lại ra từ doanh trại. Dời đồn biên cũng chỉ trong bờ bên kia.
   - **Quân ta** vẫn đánh giặc gần nhất như cũ, đi thẳng tới giặc kể cả lội qua sông (như lúc đánh thủy quái mùa lũ); có đồn biên thì lính đóng đồn tới nơi sớm hơn hẳn.

## Hồ Kim Quy (chủ dự án yêu cầu, đã làm)

Chủ dự án yêu cầu một công trình lớn tên Hồ Kim Quy, nơi thần Kim Quy trú ngụ, móng 8×8. Chủ dự án chọn tác dụng và lúc mở; các số còn lại tự chọn, chủ dự án có thể đổi.

**Chủ dự án đã chọn**

- **Tác dụng**: hồ còn nguyên thì **lũy (cả thành đất), thành Cổ Loa, cổng thành thêm 30% máu** khi giặc đánh (`KIM_QUY_WALLS`, `KIM_QUY_WALL_TYPES` ở `defs.ts`), như truyện thần Kim Quy giúp An Dương Vương xây thành không đổ. Đê không được thêm. Hồ hư thì thôi.
- **Mở khi Rùa Vàng hiện lên**: thắng màn 19 lần đầu ở chương 3 (mốc mở mới `ruaVang`, chưa tới thì báo "Phải diệt yêu tinh núi Thất Diệu (màn 19) để Rùa Vàng hiện lên"). Bảng Xây dựng chỉ hiện hồ từ chương 3.

**Tự chọn, chủ dự án có thể đổi**

- Dựng một lần, một cấp, không dỡ được, như các đền. Giá 2000 gạo, 2000 vỏ ốc, 2500 đất đá (đào hồ, kè bờ), 500 gỗ (miếu, cầu); chừng một lần thưởng màn 19. Máu 1000 như Đền Cổ Loa, giặc nhắm phá được.
- Không sợ nước lũ (miếu đứng trên gò giữa hồ).
- Trận giữ kinh đô ghi hồ còn nguyên lúc trận bắt đầu (`Battle.walls`, `hasKimQuy` ở `game.ts`); máu đầy của tường tính ở `maxHpOf` (`battle.ts`). Bản lưu giữ phiên bản 19: trận cũ không có cờ ấy thì coi như không có hồ.
- Lạc hầu gợi ý một lần khi mở (`NEW_HINTS`).
- **Mẫu kinh đô**: mẫu Cổ Loa chừa chỗ hồ ngoài vòng thành ngoài ở mọi cấp Điện; mẫu Cổ Loa giữ sông chừa chỗ từ Điện 6 (Điện 5 không đủ đất, hồ choán chỗ ruộng nếp; `Job` có thêm cấp Điện bắt đầu chừa chỗ, `mauFrom`). Mẫu Phong Châu, Đê bao không có chỗ hồ: áp hai mẫu ấy thì hồ đứng yên nếu không vướng, vướng thì dời ra chỗ trống gần nhất, không còn chỗ thì báo không đủ chỗ như mọi công trình (phát thêm rừng là được).
- Người chơi mô phỏng không dựng hồ, nên nhịp lên Điện và sổ thu chi giữ nguyên.
- **Dáng** (`src/render/congTrinh/hoKimQuy.ts`, bản vẽ ở `docs/bo-cuc-cong-trinh.md`): hồ bờ kè đá, sen nở ven bờ, lau sậy bờ sau; gò giữa hồ, miếu thờ thần mái thuyền lợp ngói viền đồng vàng, chim Lạc hai đầu nóc, đỉnh đồng ba chân trước cửa; cầu gỗ son cong vồng ra bờ trước; lối đá ra cổng hai cột chim Lạc; hai trống đồng trên giá, cờ đỏ cờ vàng; cây đa cổ thụ góc sau trái, bụi tre góc sau phải. Một thầy cúng đứng khấn trước miếu. **Rùa Vàng bơi** vòng quanh gò, có lúc lặn nửa mai; có hồ thì Rùa Vàng thôi bơi trên sông. Hồ hư thì miếu bốc khói, Rùa Vàng lặn mất (mặt hồ không nghiêng như công trình khác).
- Test ở `hoKimQuy.test.ts`: móng, giới hạn, mốc mở, gợi ý, máu tường có và không có hồ, cờ của trận giữ kinh đô, yêu tinh phá thành chậm hơn, lũ, mẫu kinh đô.

## Kế hoạch: biển Đông, bến thuyền khơi (chủ dự án yêu cầu, đã làm)

Chủ dự án yêu cầu: "Thêm biển, thuyền đánh cá cỡ lớn lên lv 8 mở", rồi dặn thêm: đặt biển ở **phía Đông**; có hai quần đảo **Hoàng Sa, Trường Sa**; sau này sẽ có cơ chế **điều quân ra đóng ở đảo ở Điện 10**; ngoài biển **lâu lâu có cá voi, cá heo bơi lội, nhảy lên**.

**Đã chốt** (chủ dự án chọn cả ba phương án khuyên dùng):
1. **Biển ngoài lưới, sau bờ đông**: sông Đà đổ ra cửa biển ngay sau mép đông của lưới. Biển, bãi cát và hai quần đảo vẽ ngoài lưới; lưới kinh đô giữ 76×76, không nâng bản lưu. (Sau đổi: bờ biển chéo ở đông nam, cửa biển ở góc đông nam trong lưới; xem Bố trí lại bản đồ.) Phương án bỏ: nới lưới sang đông (biển thật trong lưới, chạm mọi phần), bản đồ Biển Đông riêng (không thấy từ kinh đô).
2. **Thuyền đánh cá cỡ lớn là công trình mới**: **bến thuyền khơi**, dựng sát sông như bến, làng chài, mở ở Điện 8. Phương án bỏ: làng chài từ cấp 8 có thuyền ra biển (không có công trình riêng).
3. **Thuyền mang về cá biển và vỏ ốc**, đều mỗi phút như mọi công trình. Cá đỡ gạo ăn như cá làng chài; vỏ ốc vào kho (vỏ ốc tiền thời Văn Lang vốn là ốc biển). Lý do: sổ kinh tế cho thấy từ chương 2 cá làng chài đã đỡ hết gạo ăn của người chơi mô phỏng, thêm cá thuần thì gần như vô ích. Phương án bỏ: chuyến khơi theo đợt mang một mẻ lớn; chỉ cá.

### Bố trí lại bản đồ (chủ dự án chọn phương án C, đã làm)

Bản đầu đặt biển thẳng dọc mép đông, sau bờ đông sông Thao và một dải rừng 5 ô; Hoàng Sa ở đông bắc kinh đô. Chủ dự án yêu cầu "lập phương án bố trí lại map cho phù hợp vì vừa thêm phần biển". Bản dùng thử (bản đồ vẽ từ trên xuống, lật qua bốn bố cục, có số đo; giữ ở commit "Prototype bố trí bản đồ khi có biển Đông" của nhánh PR) so:

| Bố cục | Ý chính | Biển cách ngã ba | Hướng Hoàng Sa, Trường Sa (ngoài đời 128°, 144°) | Đổi luật | Việc |
|---|---|---|---|---|---|
| Gốc | biển sau bờ đông, bờ thẳng bắc–nam | 24 ô | 72°, 116° | không | không |
| B · Sát bờ đông | kéo biển vào sát lưng bờ đông, cửa sông có cồn | 20 ô | 92°, 128° | không | nhỏ |
| **C · Cửa biển đông nam** (chọn) | bờ chéo như Bắc Bộ, góc đông nam sau ngã ba thành cửa biển | 12 ô | 122°, 149° | không | vừa |
| D · Miền duyên hải | hàng khoảnh sát rừng của bờ đông thành bãi biển dựng được bến, giặc đổ bộ từ biển | 13 ô | 102°, 133° | có | lớn |

Chủ dự án chọn **C**, rồi trả lời ba câu hỏi kèm theo: hai quần đảo đặt **theo hướng ngoài đời**; thuyền giặc Triệu **vào từ biển**; biển **thấy từ Điện 1 nhưng mây che mờ** (xem hai mục dưới).

```
                 x 52–58     59 … 73     74–75   76 …
  z 2–51        sông Thao   BỜ ĐÔNG     rừng    đất liền ngoài lưới ╲ bãi cát ╲ BIỂN
  z 52–58       ───────── sông Đà ─────────► cửa biển (chừng x 72–79)
  z 59 … 75     BỜ NAM … │ góc đông nam: đất thấp dần, bãi cát, biển
                                        ╲  Hoàng Sa (108, 82)
                                          ╲      Trường Sa (102, 142)
```

- **Bờ biển chạy chéo** từ đông bắc xuống tây nam: mép bãi cát quanh đường x + z = 128 (`BIEN_CHEO`), lồi lõm theo nhiễu dọc bờ (`bienNhieu`). `bienDo(x, z)` là khoảng cách (ô, đo vuông góc với bờ) tới mép bãi cát: âm là đất liền, 0 tới 3 (`BAI_CAT`) là bãi cát, từ 3 là biển (`isSea`). Bãi cát cách mọi khoảnh bên kia và đất bên này hơn một ô (`bien.test.ts` canh): **không mất khoảnh nào**, không đổi luật đánh bờ bên kia.
- **Góc đông nam sau ngã ba** (rừng không khai phá, không thuộc khoảnh nào, giặc không ra từ đó) thành đất thấp dần, bãi cát rồi biển. **Cửa biển** ở cuối sông Đà chừng 12 ô sau ngã ba (`CUA_BIEN`, ô 79,25; 55,5). Từ Điện nhìn về ngã ba đã thấy bãi cát cửa biển ở mép màn hình.
- **Hai quần đảo theo hướng ngoài đời** nhìn từ Phong Châu: **Hoàng Sa** tâm ô (108, 82), hướng 122°, cách Điện 81 ô; **Trường Sa** tâm ô (102, 142), hướng 149°, cách 120 ô (xa gấp 1,5 lần). Ngư trường không chồng nhau, cách bãi cát xa.
- Mặt nước thuyền đi được (`isWater`): sông trong lưới, sông Đà qua bãi cát ra cửa biển, sông Thao từ phía bắc, biển ngoài các đảo (cả góc đông nam trong lưới). Đường thuyền khơi: xuôi sông Đà ra cửa biển, ra khơi ba ô về đông nam rồi rẽ về ngư trường. Một chuyến ra Hoàng Sa từ bến sát ngã ba chừng 2 phút 46 giây (trước 3 phút 4 giây).
- Đất ngoài lưới phía đông bắc (sau bờ đông) và tây nam (sau bờ nam) kéo dài tới bờ biển chéo, gần bờ thấp dần (chỉ để nhìn). Độ cao trong state không đổi: chỉ hình vẽ thấp xuống (`shoreCap` ở `render/bien.ts`).
- Mỗi quần đảo có một **đảo chính 20 × 20 ô** (chủ dự án yêu cầu sau khi xem bản đầu, lúc ấy đảo lớn nhất chỉ chừng 4 ô) và các đảo nhỏ quanh đó (Hoàng Sa 7, Trường Sa 10, rải rộng hơn). Đảo chính đất theo ô như kinh đô (`DAO_CHINH`, `daoChinh`, `daoGoc`): hình vuông bo góc, bờ lồi lõm theo hạt giống mỗi quần đảo (chừng 365 ô đất), mỗi ô biết cách bờ mấy ô. Đây là chỗ sau này dựng đồn đóng quân.
- Mỗi quần đảo có **ngư trường**: vòng tròn quanh quần đảo (bán kính 22 và 26 ô), ngoài mọi đảo và rạn san hô, chỗ thuyền kéo lưới.
- Không dựng công trình trên biển; lũ không lan ra biển (lũ không loang vào góc rừng không khai phá). Thủy binh Triệu tới từ biển (dưới đây); giặc khác không tới từ biển.
- **Thủy binh Triệu vào từ biển**: trong 60 giây trinh sát báo đợt thủy binh, đoàn thuyền đen buồm đỏ hiện ngoài khơi, vào cửa biển, ngược sông Đà (đánh phía sông Thao thì rẽ lên ở ngã ba), mỗi thuyền tới đúng chỗ nó hiện ra khi trận mở (`upcomingBoats` ở `game.ts`, `plannedBoats`, `boatLayout` ở `battle.ts`, cùng dòng số ngẫu nhiên của trận `battleSeed`). Trận đánh y như cũ (chỗ thuyền, giờ chèo, quân số), nên độ khó mọi đợt thủy binh giữ nguyên. Dòng báo ghi "thuyền đen buồm đỏ từ biển vào cửa sông, kéo tới sông phía …". Thuyền đi đều 2 ô mỗi giây, thuyền đi xa thì ra khơi sớm hơn, nên đoàn giãn thành hàng dọc sông.
- **Biển thấy từ Điện 1, mây che mờ**: từ đầu game camera đã kéo được ra biển tới hai quần đảo (như Điện 8 trước kia). Dưới Điện 8 biển còn **mây mù**: màn sương kem mờ dần từ mép bãi ra khơi thì đặc lại (thấy mặt biển mờ mờ bên dưới), dải mây dày dọc bờ, mây trùm kín hai quần đảo (tên quần đảo vẫn nổi trên mây); chưa có cá voi, cá heo. Lên Điện 8 (biển mở, dựng được bến thuyền khơi) thì mây bay lên, tan trong chừng ba giây. Chạm vào đảo khi còn mây vẫn mở bảng quần đảo, ghi "Mây mù còn phủ kín biển. Lên Điện cấp 8 thì mây tan…".
- Không nâng bản lưu.

### Bến thuyền khơi

Móng 3×3, phải sát bờ sông (bên này hay bên kia, sông Thao hay sông Đà; sông Thao đổ vào sông Đà nên bến nào cũng ra được biển), cần Điện 8. Cần ngư dân làm, dân rảnh tự vào làm như làng chài.

| Cấp | 1 | 2 | 3 |
|---|---|---|---|
| Cần | Điện 8 | Điện 9 | Điện 10 |
| Vỏ ốc mỗi phút | 120 | 170 | 230 |
| Cá biển mỗi phút (`CA_BIEN_PER_MIN`) | 50 | 70 | 90 |
| Chỗ làm | 3 | 4 | 5 |
| Giá dựng, giá nâng lên cấp ấy | 3000 gạo, 3000 gỗ, 400 sắt | 5000 gạo, 4500 gỗ, 700 sắt | 8000 gạo, 7000 gỗ, 1100 sắt |
| Máu | 420 | 480 | 540 |

- Số tối đa theo cấp Điện 1–10: 0 tới Điện 7, **1 ở Điện 8, 2 ở Điện 9, 10**. Bến đầu (theo thứ tự dựng) ra Hoàng Sa, bến thứ hai ra Trường Sa (`seaRoute`, `seaIndex`).
- Cá biển cộng vào cá cả kinh đô (`fishOf`, `fishPerMinute`), Đền Phù Đổng và phúc lành Đất cộng vào như mọi sản lượng; cá thừa bỏ phí. Vỏ ốc là sản lượng thường (`production`). Lũ không làm hư (nhà trên cọc). Không dỡ được.
- Giá tốn **gỗ** nhiều (đóng thuyền lớn): chỗ tiêu gỗ mới cuối game, khi xưởng mộc cấp 8–10 làm ra nhiều gỗ mà làng chài, cổng thành đã lên hết cấp.
- Lạc hầu gợi ý một lần khi lên Điện 8 (`NEW_HINTS`): sông Đà chảy ra biển Đông, ngoài khơi có Hoàng Sa, Trường Sa, xin dựng bến thuyền khơi.
- Bảng bến thuyền khơi: vỏ ốc, cá biển của bến và cấp sau, thuyền ra ngư trường quần đảo nào, nút **Ra xem đảo** (camera lướt ra quần đảo ấy), cá cả kinh đô, dân và lính ăn, gạo cá đỡ được; cá đã đủ ăn thì báo cá thừa bỏ phí nhưng vỏ ốc vẫn vào kho.
- **Bảng quần đảo**: chạm vào đảo (hay vũng nông quanh đảo) thì hiện tên, lời tả, cỡ đảo chính (20 × 20 ô), số đảo nhỏ, số thuyền khơi đánh cá ở đó và cá mỗi phút của chúng, dòng "Mai sau, Điện cấp 10 sẽ điều quân ra đóng giữ đảo."
- Mẫu kinh đô: bến thuyền khơi đứng sau bến, làng chài, dọc sông.
- **Người chơi mô phỏng** dựng bến thuyền khơi như người chơi thật (thêm vào `ECONOMY`). Nhịp đo được: Điện 8 giữ 44,1 phút sau khi vào chương 4; **Điện 9: 37,8 → 44,2 phút** sau Hết truyện (dồn gỗ đóng thuyền, nâng xưởng mộc); **Điện 10: 64,0 → 58,3 phút** sau Điện 9 (vỏ ốc của hai thuyền). Cả hai vẫn trong đích của `balance.test.ts` (35–50 và 45–65 phút); tổng hai mốc gần như không đổi (101,8 → 102,5 phút).
- Không nâng bản lưu: bến thuyền khơi chỉ là một loại công trình mới, biển và đảo cố định.

### Hình ảnh

- **Bến thuyền khơi** (`src/render/congTrinh/benKhoi.ts`, bản vẽ ở `docs/bo-cuc-cong-trinh.md`): kho hải sản sàn cao có cá khô treo dưới sàn, giàn phơi lưới vây, đụn vỏ ốc biển trong nong lớn, chum mắm, tời kéo thuyền, cầu tàu dọc mép sông và cầu ván chìa ra chỗ thuyền khơi neo; cấp 2 thêm chòi lửa hiệu và tấm lưới thứ hai, cờ đỏ; cấp 3 thêm miếu thờ cá Ông (vòm xương sườn cá voi trước cửa) và đụn ốc thứ hai. Mái theo cấp Điện mở cấp ấy (8, 9, 10). Năm người làm: ngư dân vá lưới, người gánh cá đi dọc cầu tàu, người giữ kho, ngư dân ở đầu cầu ván, người nhặt ốc.
- **Thuyền khơi** (`makeThuyenKhoi` ở `models.ts`): thân thuyền trống đồng phóng to (dài chừng 3,1 ô), **mắt thuyền** vẽ hai bên mũi, **buồm cánh dơi** nâu có nan tre xòe (hai cột buồm ở cấp 1, 2; ba cột, buồm viền son, trống đồng nhỏ ở mũi ở cấp 3), lưới vây chất ở đuôi, thúng cá, người lái chèo lái, hai ngư dân trên sàn.
- **Chuyến khơi** (chỉ để nhìn, World theo đồng hồ cảnh): neo trước bến 24 giây, ra giữa dòng, xuôi sông (sông Thao thì rẽ ở ngã ba), qua cửa biển, ra ngư trường, kéo lưới một vòng quanh quần đảo, rồi đi ngược đường cũ về bến. Ra biển thì chòng chành mạnh hơn. Bến hư thì thuyền nằm neo.
- **Biển** (`src/render/bien.ts`): mặt biển, bãi cát dựng theo dải dọc bờ chéo (`coastBand`, `bienDiem`): nước nông ngọc sát bãi sẫm dần ra khơi như bãi biển Mộ Dạ, bãi cát khô phủ mép nền đất rồi cát ướt thoải xuống nước, hai bên cửa sông bãi thoải xuống lòng sông thành doi cát, sông Đà dừng đúng mép biển; dải sóng trắng vỗ bờ trôi ra vào theo hướng vào bờ, vòng sóng quanh đảo. Vũng san hô màu ngọc quanh mỗi đảo (quanh đảo chính cũng vuông bo góc).
- **Đảo chính** vẽ theo ô như đất kinh đô: viền bãi cát sát nước, cát lẫn cỏ, đất cỏ bậc 1, gò bậc 2 và đỉnh đồi bậc 3 giữa đảo (cỏ thẫm dần, đá tảng lộ), dừa ven bờ ngả ra biển, cây phong ba và dừa trong đảo, bụi cỏ lau, đá rải bãi cát; vành sóng vuông bo góc quanh đảo. **Đảo nhỏ**: bãi cát tròn, đảo khá lớn có thảm cỏ, dừa, bụi cây, đá. **Tên quần đảo** trên nền kem viền đồng, giữ cỡ trên màn hình dù phóng to hay thu nhỏ.
- **Cá voi, cá heo** có khung xương (`makeWhale`, `makeDolphin`): lâu lâu (8–18 giây) một lần, gần chỗ camera nhìn ngoài biển (camera ở xa biển thì quanh một quần đảo). Cá voi xanh xám bụng trắng nổi lên, phun nước từ lỗ thở, bơi chậm, rồi chúi đầu, khúc đuôi cong vồng, vây đuôi dựng khỏi mặt nước, lặn mất, tóe nước. Đàn bốn cá heo nhảy vòng cung nối đuôi nhau, mỗi con ba lần, tóe nước khi lên khi xuống.
- **Camera**: từ Điện 1 kéo được ra biển đông nam tới hết đảo chính Trường Sa (dưới Điện 8 biển còn mây mù); ra khỏi vùng đất về phía biển thì chỉ đi trong dải chéo dọc hai quần đảo (x − z, thu dần trong chừng 10 ô, `CamBounds.sea` ở `camera.ts`), khỏi lạc vào đất trống ngoài lưới. Gần bãi cát không có cây.

### Sau này (chưa làm)

- **Điện 10 điều quân ra đóng giữ đảo** (chủ dự án đã nói sẽ có): mỗi quần đảo đã có đảo chính 20 × 20 ô đất theo ô (`daoChinh`), làm chỗ dựng đồn. Cần chốt với chủ dự án: đóng quân được gì, có giặc biển đánh đảo không, quân ra đảo bằng thuyền nào.

## Kế hoạch chương 5: Hai Bà Trưng (đề xuất, chờ chủ dự án duyệt)

Chủ dự án yêu cầu bắt đầu chương 5. Câu cuối màn hình Hết truyện đã dẫn sang: "Hơn hai trăm năm sau, ở đất Mê Linh có hai chị em họ Trưng…". Kế hoạch theo khung của chương 4: một truyện, một tướng mới, một thứ giặc mới, tám màn phó bản, một đền, nhiệm vụ Lạc hầu, chia 4 PR. Mọi con số dưới đây là đề xuất ban đầu. Sau khi duyệt, như các lần trước, cho chỉnh ±20% để khớp nhịp và độ khó đo bằng test; làm xong phần nào thì ghi số cuối cùng của phần ấy. **Chưa viết code chương 5 cho tới khi chủ dự án duyệt.**

Như chương 4, chỉ học cơ chế của các game cùng thể loại, còn luật chơi, nội dung và hình ảnh là của riêng game này:
- **Rise of Kingdoms**: tướng chính đi kèm một phó tướng, phó tướng cộng sức cho một loại quân. Từ đây có **nữ tướng** (PR 4).
- **Kingdom Rush**: có phép gọi quân tiếp viện ra giữa bãi. Từ đây có kỹ năng **Hiệu triệu** gọi nghĩa binh.
- **Age of Empires II**: thuyền chiến đứng dưới nước bắn lên bờ, chỉ quân bắn xa và công trình phòng thủ chống được. Từ đây có **lâu thuyền** đánh kinh đô.

### Hiện trạng (khảo sát code)

- Có 54 nhiệm vụ (số 0–53): 50 nhiệm vụ của bốn chương, rồi 4 nhiệm vụ sau truyện (lên Điện 9, một công trình cấp 9, lên Điện 10, một công trình cấp 10).
- Điện 9 mở khi xem Hết truyện. Điện 10 cần thêm 16 thử thách (`DIEN10_CHALLENGES`). Điện cao nhất là cấp 10.
- `Chapter` là 1–4. `chapterOf` tính chương theo số nhiệm vụ đã nhận thưởng (`CH2_QUEST_START` … `CH4_QUEST_START`).
- Mỗi trận chỉ có một tướng (`Battle.hero`). Quân ta chưa có cách gọi thêm người giữa trận; giặc thì có (Thủy Tinh gọi thủy quái, `TT_SUMMON`).
- Kinh đô chương 4: thủy binh Triệu, quân Triệu trên bộ và lũ thay phiên nhau (`nextFoe`). Thuyền giặc chỉ chở lính cập bờ, không tự đánh.
- Bản lưu đang ở phiên bản 19.

### Tám điều cần chủ dự án chốt

1. **Mốc vào chương 5 và Điện 10**. Đề xuất (A): vào chương 5 khi nhận thưởng nhiệm vụ "một công trình cấp 9" (số 51), tức đã có Điện 9. **Điện 10 mở khi vào chương 5**, bỏ mốc 16 thử thách. Hai nhiệm vụ sẵn có (lên Điện 10, một công trình cấp 10) thành hai nhiệm vụ đầu chương 5, như "Lên Điện cấp 8" mở đầu chương 4. Cách này không dời số thứ tự nhiệm vụ của ai. Phương án khác:
   - (B) giữ mốc 16 thử thách cho Điện 10, vào chương 5 khi đã lên Điện 10. Chương 5 tới muộn, người chơi phải đánh xong 16 thử thách trước;
   - (C) vào chương 5 ngay khi Hết truyện. Phải chèn nhiệm vụ chương 5 lên trước nhiệm vụ Điện 9, dời số nhiệm vụ của người đang chơi (nâng bản lưu như lần chèn nhiệm vụ ở bản lưu 4).
2. **Người chơi là ai**. Đề xuất: kinh đô gọi là **Mê Linh**. Trước khi đuổi được Tô Định, đây là đất của Lạc tướng Mê Linh; thắng màn 36 thì Trưng Trắc lên ngôi, người chơi trị vì tiếp trên cùng kinh đô với tư cách **Trưng Vương**. Lạc hầu vẫn hướng dẫn (Lạc hầu là chức, không phải một người).
3. **Hai Bà ra trận thế nào**. Đề xuất (A): **hai bà cùng cưỡi một voi chiến**, tính là một tướng có hai kỹ năng, mỗi bà một kỹ năng. Mỗi trận vẫn một tướng như cũ. Phương án (B): mỗi bà một voi, hai tướng cùng ra một trận. Đẹp hơn, nhưng là lần đầu một trận có hai tướng, phải sửa mọi chỗ đang chỉ biết một tướng: thanh máu tướng, kiệt sức, nút kỹ năng, tướng chỉ huy doanh trại, chỗ đứng trước Điện.
4. **Kết**. Đề xuất: kể trọn như chương 4. Mã Viện sang, Hai Bà lui về Cấm Khê, rồi gieo mình xuống sông Hát; chỉ kể nhẹ một câu, không vẽ. Màn 40 là màn cầm cự. Phương án khác: chương 5 dừng ở lúc Trưng Trắc lên ngôi (màn 36), phần Mã Viện để sau.
5. **Lâu thuyền** đánh kinh đô từ khi Mã Viện sang: thuyền lớn đậu dưới sông bắn lên bờ, giáo binh và voi không đánh tới, phải có quân bắn xa và công trình phòng thủ. Có làm không?
6. **Nữ tướng** (PR 4): bốn nữ tướng theo về theo mốc màn, đi theo làm phó tướng. Có làm không, hay để sau?
7. **Thử thách màn 33–40** và nhánh huân công thêm bậc 4 (PR 4). Có làm không?
8. **Câu cuối màn hình Hết truyện chương 5**. Đề xuất: nhắc trước Bà Triệu, để ngỏ chương 6: "Hơn hai trăm năm sau, ở núi Nưa đất Cửu Chân, có một người con gái cưỡi voi trắng một ngà…". Phương án khác: một câu khép lại, không nhắc chương sau.

### Truyện chương 5

Sáu đoạn, mỗi đoạn kể đúng một lần, theo thứ tự, sau các đoạn của chương 4. Người nói mới: Trưng Trắc, Trưng Nhị.

1. **Đất Mê Linh** (vào chương 5): Hơn hai trăm năm sau, nước ta bị nhà Hán đô hộ. Thái thú Tô Định tham lam, tàn bạo, bắt dân lên rừng săn voi lấy ngà, xuống biển mò ngọc trai. Lạc tướng Mê Linh có hai con gái là Trưng Trắc, Trưng Nhị, được mẹ là bà Man Thiện dạy võ nghệ, giỏi cưỡi voi. Trưng Trắc lấy Thi Sách, con Lạc tướng Chu Diên; hai nhà ngầm lo việc lớn. Hai Bà ra trận từ đoạn này. Lạc hầu nhắc Điện lên được cấp 10 (nếu chọn A ở điều 1).
2. **Lời thề Hát Môn** (thắng màn 33 lần đầu): Tô Định giết Thi Sách. Trưng Trắc gác tang, mặc giáp, cùng em tế cờ ở cửa sông Hát, đọc lời thề:
   > Một xin rửa sạch nước thù,
   > Hai xin đem lại nghiệp xưa họ Hùng,
   > Ba kẻo oan ức lòng chồng,
   > Bốn xin vẻn vẹn sở công lênh này.

   Dân các nơi nổi dậy theo Hai Bà. Mở kỹ năng **Hiệu triệu**.
3. **Trưng Vương** (thắng màn 36 lần đầu): nghĩa quân hạ Mê Linh, Cổ Loa, rồi Luy Lâu. Tô Định cắt tóc, cạo râu, bỏ trốn về Nam Hải. Sáu mươi lăm thành ở Lĩnh Nam theo về. Trưng Trắc lên ngôi vua, đóng đô ở Mê Linh, tha thuế hai năm cho dân.
4. **Phục Ba tướng quân** (thắng màn 37 lần đầu): bắt được lính Hán, mới biết vua Hán sai lão tướng Mã Viện, hiệu Phục Ba tướng quân, đem hai vạn quân, hai nghìn xe thuyền men theo biển sang. Từ đây lâu thuyền Hán tới đánh kinh đô.
5. **Lãng Bạc** (thắng màn 39 lần đầu): Hai Bà đánh lớn với Mã Viện ở Lãng Bạc. Nữ tướng Phùng Thị Chính sinh con ngay giữa trận, địu con sau lưng vẫn cầm gươm đánh giặc. Quân Hán quá đông, Hai Bà lui về giữ Cấm Khê.
6. **Sông Hát** (thắng màn 40 lần đầu): nghĩa quân giữ cửa rừng Cấm Khê cho dân rút về núi. Hai Bà chống giữ tới cùng, rồi gieo mình xuống dòng sông Hát. Dân lập đền thờ Hai Bà ở Hát Môn và nhiều nơi khác. Lạc hầu kết: kinh đô vẫn còn, Hai Bà hiển linh giữ đất. Sau đoạn này hiện màn hình **Hết truyện** mới.

- Màn hình Hết truyện cũ (sau chương 4) giữ nguyên, nay thành đoạn chuyển sang chương 5, vì câu cuối đã dẫn sang Mê Linh. Điện 9 vẫn mở khi xem màn hình ấy.
- Màn hình Hết truyện mới: năm dòng tóm tắt năm chương (thêm một dòng: "Hai Bà Trưng thề ở Hát Môn, đuổi Tô Định, giữ nước tới hơi thở cuối cùng"), rồi câu cuối (điều 8). Nút Chơi tiếp. Mở lại được từ bảng Lạc hầu. Màn hình vào game ghi "Chương 5" và "đã hết truyện" theo màn hình mới.

### Hai Bà Trưng (tướng thứ năm)

- Ra trận từ khi vào chương 5. Cưỡi voi chiến lớn: **850 máu** (ngoài bãi bền gấp 1,6), **22 sát thương**, tầm 1,2 ô, nghỉ 1,1 giây, đi 1,6 ô mỗi giây. Đòn đánh găm thêm nửa sát thương lên giặc quanh mục tiêu trong 1,3 ô như các tướng khác. Máu cao hơn các tướng trước vì voi to, đứng hàng đầu chịu đòn.
- Hết máu thì kiệt sức, nghỉ 2 phút chơi. Màn 33–40 cần Hai Bà; Hai Bà kiệt sức thì các màn ấy khóa, có dòng báo như với các tướng khác.
- **Kỹ năng**:
  - **Voi xung trận** 🐘 (Trưng Trắc thúc voi, có từ đầu): voi lao thẳng 5 ô về phía giặc đứng đông nhất. Giặc trên đường đi (rộng 1,6 ô) mất 90 máu, bị hất sang hai bên 1 ô và choáng 1,5 giây. Hồi 12 giây. Khác Phun lửa của Gióng ở chỗ đường ngắn hơn nhưng có hất và choáng;
  - **Hiệu triệu** 📣 (Trưng Nhị phất cờ, có từ khi thắng màn 33): 5 nghĩa binh chạy ra quanh voi, đánh tới hết trận; quân ta trong 3 ô quanh voi hồi 15% máu. Hồi 25 giây. Mỗi lúc có nhiều nhất 5 nghĩa binh; gọi lại thì chỉ bù chỗ người đã ngã;
  - ngoài bãi, sát thương kỹ năng nhân 1,6 như các tướng khác.
- **Nghĩa binh**: 55 máu, 7 sát thương, tầm 0,8 ô, đi 1,6 ô mỗi giây, nghỉ 1 giây. Không luyện, không chiếm chỗ doanh trại, không ăn gạo, hết trận thì về làng, không chết thật. Không được cộng binh khí, huân công. Không thuộc vòng khắc chế.
- Giữ kinh đô từ khi vào chương 5: đứng trước Điện ở chỗ Cao Lỗ đang đứng, Cao Lỗ lùi sang một bước. Chỉ huy được một doanh trại như các tướng khác (`TuongId` thêm `haiBa`).
- Sau Hết truyện chương 5: Hai Bà hiển linh, vẫn giữ kinh đô và ra trận màn 33–40. Khác An Dương Vương (thôi giữ kinh đô khi xuống biển), vì chương 5 không còn tướng nào thay.
- **Dáng** (`makeHaiBa` ở `heroes.ts`, có xương): voi lớn hơn voi chiến thường một phần ba, ngà bọc đồng, đệm đỏ có mặt trống đồng, bành voi có lọng vàng. Trưng Trắc ngồi trước: áo đỏ thắm, giáp ngực đồng, mũ lông chim cao kiểu Đông Sơn, cầm gươm đồng. Trưng Nhị ngồi sau: áo vàng, cầm cờ đỏ có hình chim Lạc. Voi xung trận: voi giơ vòi rống, lao tới, bụi tung theo đường. Hiệu triệu: Trưng Nhị phất cờ, tiếng trống, nghĩa binh chạy ra từ hai bên, vòng sáng xanh loang dưới chân quân ta được hồi máu. Thắng trận: Trưng Trắc giơ gươm, Trưng Nhị phất cờ, voi giơ vòi.
- **Nghĩa binh** (`soldier.ts`): áo nâu, khăn vấn, chân đất, không giáp, cầm giáo tre hay gậy tầm vông.

### Quân Hán

Ba loại lính theo đúng vòng khắc chế như giặc các chương trước, mạnh hơn quân Triệu chừng 10%. Hai trùm. Lâu thuyền chỉ đánh kinh đô.

| Loại | Vai | Máu | Sát thương | Tầm (ô) | Đi (ô/giây) | Nghỉ (giây) |
|---|---|---|---|---|---|---|
| Lính kích Hán `linhHan` | lính bộ, cung thủ khắc | 105 | 13 | 1,0 | 1,4 | 1,0 |
| Nỏ thủ Hán `noHan` | bắn xa, voi chiến khắc | 60 | 13 | 4,2 | 1,3 | 1,5 |
| Giáp sĩ Hán `giapHan` | quân nặng, giáo binh và lính nỏ khắc; khắc cung thủ | 330 | 26 | 0,9 | 1,5 | 1,4 |
| Tô Định `toDinh` | trùm màn 36 | 1600 | 30 | 1,2 | 1,3 | 1,2 |
| Mã Viện `maVien` | trùm màn 39, 40 | 2000 | 36 | 1,3 | 1,3 | 1,2 |

- Lính nỏ đánh mạnh gấp đôi giáp sĩ, Tô Định, Mã Viện như với quân nặng và trùm các chương trước.
- **Tô Định bỏ chạy**: còn 30% máu thì quay đầu chạy về cuối bãi, nhanh gấp rưỡi. Chạy thoát khỏi bãi thì tính như đã hạ, đúng như truyện kể hắn bỏ trốn về Nam Hải. Phải diệt hết quân của hắn mới thắng màn.
- **Mã Viện có Lệnh nỏ**: lần đầu sau 8 giây, rồi cứ 14 giây, một loạt tên nỏ rơi xuống chỗ quân ta đứng đông nhất: 40 sát thương mỗi người trong 3 ô. Đây là trùm đầu tiên bắn vào chỗ quân ta dồn cục, người chơi phải đánh nhanh hay xếp hàng thưa.
- **Dáng** (`soldier.ts`, `beasts.ts`): quân Hán mặc áo đỏ son để khác quân Triệu áo đen.
  - Lính kích: áo đỏ son ngắn, giáp lá xám sắt, khăn đen, cầm kích (giáo có thêm lưỡi trăng khuyết một bên).
  - Nỏ thủ: áo đỏ, giáp da nâu, nỏ lớn lẫy đồng, đứng bắn.
  - Giáp sĩ: giáp lá sắt phủ tới gối, mũ sắt, khiên chữ nhật lớn sơn đỏ, đao vòng.
  - Tô Định: quan phục đen dài, mũ quan cao, ấn đeo ở đai, bụng phệ, cầm kiếm; lúc bỏ chạy thì rơi mũ, ôm ấn chạy.
  - Mã Viện: râu tóc bạc, giáp đồng đỏ, áo choàng đỏ, mũ trụ có chùm lông đỏ, cưỡi ngựa trắng, cầm đại đao; Lệnh nỏ thì giơ đao chỉ, cờ lệnh đen phất.

### Giữ kinh đô ở chương 5

- Vào chương 5 thì thủy binh và quân Triệu thôi tới (đã hơn hai trăm năm). Đợt giặc: **quân Hán trên bộ** và lũ xen nhau như chương 3. Từ đoạn 4 (Mã Viện sang), ba đợt thay phiên: **thủy quân Hán → quân Hán trên bộ → lũ**.
- **Quân Hán trên bộ** đợt thứ n (`hanForces(n)`): 10 + n lính kích (tối đa 20), 5 + ⌊n/2⌋ nỏ thủ (tối đa 12), 2 + ⌊n/3⌋ giáp sĩ (tối đa 6); máu nhân 2,2 + 0,12 × (n − 1). Ra từ bìa rừng như quân Triệu; bờ bên kia có công trình thì cứ ba đợt có một đợt tới bờ ấy, như luật phòng thủ hai bờ.
- **Thủy quân Hán** đợt thứ n: thuyền chở lính cập bờ như thủy binh Triệu (6 người một thuyền, lính kích và giáp sĩ), kèm **lâu thuyền**: 1 chiếc ở đợt 1, 2; 2 chiếc từ đợt 3. Vào từ biển, trinh sát báo trước chỗ từng thuyền như thủy binh Triệu. Đền Cuông còn nguyên thì bớt 20% thuyền chở lính như với thủy binh Triệu, không bớt lâu thuyền.
- **Lâu thuyền** (`lauThuyen`): thuyền lớn ba tầng, đậu giữa ba ô sông sát bờ, không cập bờ. 1800 máu, nhân hệ số máu của đợt. Cứ 2 giây bắn một loạt 3 mũi nỏ vào công trình hay lính gần nhất trong 5 ô (nhân `RAID_SCALE`), mỗi mũi 18 sát thương.
  - Chỉ quân bắn xa (cung thủ, lính nỏ, Cao Lỗ), chòi canh, lầu nỏ, ụ nỏ, lính trên lầu cổng thành bắn tới được. Giáo binh, voi chiến và Hai Bà trên bờ không đánh tới.
  - Đánh chìm thì thuyền nghiêng, chìm dần. Hết giờ trận mà lâu thuyền còn thì rút đi như giặc còn sống lúc hết giờ.
  - Dáng (`makeLauThuyen` ở `models.ts`): thân thuyền dài chừng 4 ô, hai hàng mái chèo, lầu gỗ ba tầng mái ngói đen, lan can đỏ, cờ đen lớn trên nóc, lính nỏ Hán đứng ở từng tầng.
- Hai Bà giữ kinh đô. Trước PR 2 (chưa có Hai Bà) thì Cao Lỗ giữ.

### Phó bản chương 5: từ Hát Môn tới Cấm Khê

Bản đồ phó bản có thêm thẻ Chương 5, mở khi vào chương 5. Bản đồ vẽ đất Mê Linh, cửa sông Hát, thành Cổ Loa, thành Luy Lâu, bờ biển Hợp Phố, hồ Lãng Bạc và núi rừng Cấm Khê.

| Màn | Tên | Quân giặc | Máu (ước) | Thưởng lần đầu |
|---|---|---|---|---|
| 33 | Mê Linh: đuổi lính thu cống | 13 lính kích, 8 nỏ thủ, 4 giáp sĩ | ×2,3 | 9500 gạo, 8000 vỏ ốc, 7000 đất đá, 1700 sắt |
| 34 | Cửa sông Hát | 14 lính kích, 8 nỏ thủ, 4 giáp sĩ | ×2,3 | 10000, 8400, 7300, 1800 |
| 35 | Lấy lại thành Cổ Loa | 13 lính kích, 9 nỏ thủ, 4 giáp sĩ | ×2,3 | 10500, 8800, 7700, 1900 |
| 36 | Thành Luy Lâu, trùm **Tô Định** | 12 lính kích, 8 nỏ thủ, 4 giáp sĩ, Tô Định | ×2,2 | 11500, 9500, 8300, 2000 |
| 37 | Bờ biển Hợp Phố | 14 lính kích, 8 nỏ thủ, 4 giáp sĩ | ×2,4 | 12000, 10000, 8700, 2100 |
| 38 | Đường vào Lãng Bạc | 13 lính kích, 9 nỏ thủ, 4 giáp sĩ | ×2,4 | 12500, 10500, 9100, 2200 |
| 39 | Hồ Lãng Bạc, trùm **Mã Viện** | 12 lính kích, 8 nỏ thủ, 4 giáp sĩ, Mã Viện | ×2,3 | 13500, 11200, 9800, 2400 |
| 40 | Cấm Khê: giữ đường cho dân rút | 3 đợt (xem dưới), Mã Viện ở đợt cuối | ×3,1 | 14000, 12000, 10500, 2500 |

- Mọi màn cần Điện cấp 5 như chương 2–4 và cần Hai Bà. Đánh lại được 30%.
- Mỗi màn tối đa **26 giặc** (chương 4 là 28), vì nghĩa binh thêm tới 5 người: 28 lính quân mẫu, Hai Bà, 5 nghĩa binh và 26 giặc là vừa 60 người trên bãi.
- **Quân mẫu chương 5** như chương 4: 11 giáo, 10 cung, 3 voi, 4 lính nỏ, đúng 38 chỗ.
- Máu giặc đo bằng test theo Chuẩn cân bằng phó bản: lấy mức cao nhất mà người chơi thường thắng cả 10 hạt giống thử, còn không tướng hay nửa quân thì chơi giỏi vẫn thua. Gặp Tô Định, Mã Viện mà không bấm kỹ năng thì thua.
- **Màn 40 là cầm cự**, như màn 32:
  - giặc tới ba đợt, lúc 0, 35 và 70 giây: 10 tên (5 lính kích, 3 nỏ thủ, 2 giáp sĩ), 10 tên (4 lính kích, 3 nỏ thủ, 3 giáp sĩ), rồi 8 tên (4 lính kích, 2 nỏ thủ, 2 giáp sĩ) cùng Mã Viện;
  - thanh **"Dân rút về núi"** chạy đầy trong 100 giây. Đầy thanh mà quân ta chưa chết hết thì thắng; diệt hết cả ba đợt trước đó cũng thắng; quân ta chết hết trước thì thua;
  - dân làng gồng gánh, dắt trâu đi dọc mép bãi vào rừng, xa dần theo thanh. Chỉ là cảnh, giặc không nhắm.
  - ba đợt cộng lại 29 tên, nhưng không cùng lúc trên bãi, như màn 32.
- **Bãi chiến mới**:
  - **Hát Môn** (màn 34): ngã ba sông sau lưng quân ta, đàn tế đắp đất có cột cờ đỏ, bãi ngô ven sông, thuyền nan;
  - **Luy Lâu** (màn 36): sau lưng giặc là tường thành đất nện, cổng lầu mái ngói đen, cờ đen, hào nước trước thành;
  - **Lãng Bạc** (màn 38, 39): một bên là đầm hồ rộng có lau sậy, gò đất giữa bãi, lâu thuyền Hán đậu xa trên hồ (chỉ là cảnh);
  - **Cấm Khê** (màn 40): khe núi, suối chảy dọc bãi, rừng rậm hai bên, đường mòn cho dân rút vào núi;
  - màn 33 dùng bãi làng, 35 bãi thành Cổ Loa, 37 bãi cửa sông.
- Thắng màn 40: Hai Bà đứng trên voi nhìn về phía sông, camera lùi xa (bảng kết quả chờ 3,5 giây như các màn kết chương), rồi tới đoạn 6 và màn hình Hết truyện mới. Không vẽ cảnh gieo mình xuống sông.

### Đền Hát Môn

- Mở khi thắng màn 40. Dựng một lần, 4×4, giá 5000 gạo, 5000 vỏ ốc, 5000 đất đá, 1400 sắt. Ngoài đời, đền Hát Môn ở Phúc Thọ, Hà Nội, thờ Hai Bà, ở nơi Hai Bà tế cờ khởi nghĩa.
- Đền còn nguyên thì mỗi trận giữ kinh đô có **6 nghĩa binh** từ đền ra đánh giặc (chỉ số nghĩa binh ở trên).
- Sức chịu nước lũ như các đền khác.
- Dáng: đền nền đá mái cong hai tầng có chim đồng; sân trước có đàn tế đắp đất với cột cờ đỏ; hai voi đá quỳ hai bên sân; lư hương đồng; cây đa bên cạnh.
- Không làm mẫu kinh đô mới, vì chương 5 không thêm đất hay công trình phòng thủ. Mẫu "Cổ Loa giữ sông" thêm một chỗ 4×4 cho Đền Hát Môn.

### PR 4: nữ tướng, thử thách màn 33–40

**Nữ tướng**

- Bốn nữ tướng theo về theo mốc màn, mỗi người lo một binh chủng:

  | Nữ tướng | Theo về khi | Binh chủng |
  |---|---|---|
  | Lê Chân (lập trang An Biên ven biển) | thắng màn 34 | lính nỏ |
  | Thánh Thiên | thắng màn 35 | cung thủ |
  | Bát Nàn | thắng màn 37 | giáo binh |
  | Phùng Thị Chính | thắng màn 39 | voi chiến |

- **Phó tướng ở phó bản**: bảng xếp quân có thêm thẻ chọn một nữ tướng đi theo, ở mọi màn của mọi chương, cả thử thách và đánh đồn. Nữ tướng đứng cầm cờ sau hàng hậu, không đánh, giặc không nhắm. Binh chủng của nữ tướng được thêm **12% máu và sức đánh** trong trận.
- **Giữ kinh đô**: giao mỗi nữ tướng cho một doanh trại, mỗi trại một nữ tướng (thẻ Tướng chỉ huy trong bảng doanh trại). Lính giữ kinh đô của trại ấy, thuộc binh chủng của nữ tướng, được thêm 12%.
- Chuẩn cân bằng của mọi màn và mọi thử thách tính không có nữ tướng, như huân công.
- Mỗi nữ tướng theo về thì Lạc hầu báo hai câu ngắn (như gợi ý công trình mới), không thêm đoạn truyện.
- Dáng: bốn nữ tướng có xương, mỗi người một màu áo, mũ lông chim, cầm cờ. Lê Chân đeo nỏ, Thánh Thiên đeo cung, Bát Nàn cầm giáo, Phùng Thị Chính địu con sau lưng, cầm gươm.

**Thử thách màn 33–40 và huân công bậc 4**

- Mỗi màn 33–40 có một thử thách như màn 1–32. Giặc dữ ở màn 36, 39, 40 (các màn có trùm); Không tướng ở màn 33, 35, 38; Hai binh chủng ở màn 34, 37. Hệ số máu đo theo chuẩn thử thách đã có.
- Thắng lần đầu được **5 huân công** mỗi màn, cả 8 màn là 40.
- Mỗi nhánh huân công thêm **bậc 4**, giá 8 huân công, thêm 4% như các bậc trước. Năm nhánh hết đúng 40, vừa bằng số huân công mới; tổng cả 40 thử thách là 120.

### Nhiệm vụ Lạc hầu chương 5

Theo phương án A ở điều 1: hai nhiệm vụ sẵn có số 52, 53 thành hai nhiệm vụ đầu chương 5, rồi nối thêm 8 nhiệm vụ vào cuối danh sách (không xô lệch số thứ tự nhiệm vụ của người đang chơi). Mỗi PR nối phần của mình.

| Số | Nhiệm vụ | Thưởng | PR |
|---|---|---|---|
| 52 | Lên Điện cấp 10 (sẵn có) | 4500 gạo, 4500 vỏ ốc | 1 |
| 53 | Một công trình lên cấp 10 (sẵn có) | 3500 đất đá, 900 sắt | 1 |
| 54 | Đánh lui một đợt quân Hán ở kinh đô | 2500 vỏ ốc, 700 sắt | 1 |
| 55 | Luyện 6 voi chiến (Hai Bà cần tượng binh) | 2500 gạo, 600 sắt | 2 |
| 56 | Qua màn 33 | 2500 gạo, 2000 vỏ ốc | 2 |
| 57 | Hạ thành Luy Lâu (qua màn 36) | 3000 gạo, 2000 đất đá | 2 |
| 58 | Đánh chìm một lâu thuyền ở kinh đô | 2500 vỏ ốc, 800 sắt | 3 |
| 59 | Qua màn 39 | 3000 vỏ ốc, 2500 đất đá | 3 |
| 60 | Giữ Cấm Khê (qua màn 40) | 5000 gạo, 5000 vỏ ốc | 3 |
| 61 | Dựng Đền Hát Môn | 3500 đất đá, 1100 sắt | 3 |

Thưởng khoảng gấp rưỡi nhiệm vụ chương 4.

### Không làm ở chương 5

- Không thêm cấp Điện, không thêm đất, không thêm công trình làm ra của; Điện 10 vẫn là cấp cao nhất.
- Không thêm binh chủng: nghĩa binh chỉ do kỹ năng Hiệu triệu và Đền Hát Môn gọi ra.
- Để sau: đồn giặc bậc 5 bên kia sông, điều quân ra đóng đảo, nhạc nền.

### Thứ tự làm chương 5

1. **Duyệt tài liệu này**: tám điều ở trên, mọi con số và dáng.
2. **PR 1**: vào chương 5, Điện 10 mở theo chương, quân Hán (ba loại lính) đánh kinh đô xen với lũ, nhiệm vụ 54, bản lưu v20. Chưa có truyện; Lạc hầu báo đã sang chương 5, chờ phần sau.
3. **PR 2**: Hai Bà (tướng, hai kỹ năng, giữ kinh đô, chỉ huy doanh trại), nghĩa binh, màn 33–36 và Tô Định, bãi Hát Môn và Luy Lâu, thẻ Chương 5 trên bản đồ phó bản, đoạn truyện 1–3, nhiệm vụ 55–57.
4. **PR 3**: lâu thuyền và thủy quân Hán ở kinh đô, Mã Viện, màn 37–40 (màn 40 cầm cự), bãi Lãng Bạc và Cấm Khê, đoạn truyện 4–6, màn hình Hết truyện mới, Đền Hát Môn, nhiệm vụ 58–61.
5. **PR 4**: nữ tướng, thử thách màn 33–40, huân công bậc 4.

Mỗi PR nào thêm trường lưu mới thì nâng bản lưu một bậc (dự kiến v20 tới v23), có test nâng bản lưu cũ. Mỗi PR: chạy `npm test` và `npm run build`; sửa `src/render/` hay `src/ui/` thì chụp kiểm tra ở khổ điện thoại; sau đó ghi số cuối cùng vào tài liệu này.

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
7. **Cấp 6–7 và rèn binh khí** (đã làm, xem mục Kế hoạch): Điện và 7 loại công trình lên cấp 6, 7, đất 25×25 rồi 26×26 (kinh đô lớn: 40×40), rèn binh khí hai bậc ở lò rèn, bản lưu phiên bản 8.
8. **Hội Tết bánh chưng bánh giầy** (đã làm, xem mục PR 3): truyện Lang Liêu, ruộng nếp, vườn đậu lá dong, chuồng lợn, bếp gói bánh (3 cấp mỗi loại), Tết 20 phút một lần, phúc lành Đất và Trời, cảnh Tết trước Điện, bản lưu phiên bản 9.
9. **Sửa sau chơi thử Hội Tết**: Thủy Tinh có hai phép, Dời non vẽ rõ hơn, xoay cảnh 4 hướng, dời công trình, mẫu kinh đô mỗi chương.
10. **Chương 4: Mỵ Châu, Trọng Thủy** (đã làm cả 4 PR; xem Kế hoạch chương 4): Điện và 7 loại công trình lên cấp 8, lầu nỏ, ụ nỏ trên thành, lính nỏ, thủy binh Triệu đi thuyền, Cao Lỗ, phó bản màn 25–32, Đền Cuông, màn hình Hết truyện, thử thách phó bản và huân công.
11. **Doanh trại và nơi ở riêng** (đã làm, xem mục cùng tên): doanh trại là nơi tướng ở và điều binh; trại giáo, trại cung, chuồng voi để luyện từng binh chủng; tướng ra trận từ doanh trại.
    **Nhiều doanh trại** (đã làm, xem mục Nhiều doanh trại, tướng chỉ huy, bố trí giữ kinh đô): mỗi tướng chỉ huy một doanh trại, tới 152 chỗ quân; phó bản mang tối đa 38 chỗ; người chơi tự bố trí lính giữ kinh đô ở từng trại.
12. **Kinh đô lớn, công trình to, mở đất bằng khoảnh** (đã duyệt, đã làm cả 4 PR; xem mục Kế hoạch cùng tên): công trình to hơn một ô mỗi chiều, lưới 55×55 (PR 1), khoảnh 5×5 tự chọn (PR 2; sau bỏ lượt, phát thoải mái, giá tăng từng nấc), viền cỏ, trang trí ô trống (PR 3), cây đá mọc (PR 4, bản lưu v17).
    **Vẽ lại công trình trên móng** (đã làm; xem mục cùng tên): mười bốn loại vẽ lại trên trọn móng; ba đền và ruộng nếp chủ dự án vẽ lại dáng, vẫn phóng theo móng.
13. **Đường đi và đồ trang trí** (đã làm, xem mục cùng tên): bốn loại đường, bảy món trang trí, ba thẻ chọn trong bảng Xây dựng, thẻ Dọn trang trí.
14. **Cổng thành, xưởng mộc, làng chài** (chủ dự án đã duyệt, đã làm; xem mục Kế hoạch cùng tên): gỗ là tài nguyên thứ năm, cá đỡ gạo ăn, cổng hút giặc trong vòng tường. Ba PR: gỗ và xưởng mộc, làng chài, cổng thành.
15. **Vùng đất bên kia sông** (chủ dự án đã duyệt, đã làm cả 5 PR, bản lưu v18; xem mục Kế hoạch cùng tên): lưới qua sông, cầu ba cấp, sương mù và trinh sát, đồn giặc bốn bậc theo chương, dẹp đồn chiếm vùng, đặc sản đất, bản làng, của chôn, giặc tới từ hai bờ và đồn biên.
16. **Điện cấp 9, 10** (đã duyệt, đã làm cả 3 PR: luật, hình, binh khí bậc 3 và lầu nỏ lên cấp; xem Kế hoạch cùng tên).
    **Hồ Kim Quy** (chủ dự án yêu cầu, đã làm; xem mục cùng tên): hồ 8×8 mở khi Rùa Vàng hiện lên, tường thành thêm 30% máu.
17. **Chương 5: Hai Bà Trưng** (đề xuất, chờ chủ dự án duyệt; xem Kế hoạch chương 5): Hai Bà cưỡi voi ra trận với Voi xung trận và Hiệu triệu gọi nghĩa binh, quân Hán và lâu thuyền đánh kinh đô, phó bản màn 33–40 với Tô Định và Mã Viện, Đền Hát Môn, nữ tướng, thử thách màn 33–40.
18. **Để sau**: nhạc nền.
