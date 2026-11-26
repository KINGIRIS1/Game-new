# Map ở các game tương tự: bài học cho Thời đại Văn Lang

Ghi chú nghiên cứu, 21/11/2026. Chỉ học cơ chế, không chép tên, nhân vật hay hình của game khác. Mọi đề xuất dưới đây là gợi ý cho chủ dự án duyệt, không đổi thiết kế đã chốt ở `docs/thiet-ke.md`.

**Về nguồn.** Phiên này không mở được trang ở supercell.com, clashofclans.fandom.com và oldschool.runescape.wiki (mạng không cho phép). Vì vậy phần lớn khẳng định về các game ấy lấy từ đoạn trích của công cụ tìm kiếm, chưa đọc trọn trang. Nguồn sơ cấp đã đọc trực tiếp: tài liệu và tệp quái của rAthena trên GitHub. Mỗi dòng đều ghi mức tin cậy: **[sơ cấp]**, **[wiki]** (wiki của người chơi, số thường lấy từ dữ liệu game) hay **[thứ cấp]** (bài hướng dẫn, diễn đàn).

## Tóm tắt: các bài học chính

- **Vật cản mọc lại có trần** (Clash of Clans: trần 45 cái, 8 giờ một cái [wiki]). Cây dại, tảng đá của ta (`CAY_DA_CAP` 8) đã làm đúng kiểu này. Có thể thêm một loại hiếm như "hộp đá quý" không tính vào trần, để người chơi có cớ quay lại.
- **Khoảng cách tới kho phải hiện ra trước mắt.** Banished, Anno, Pharaoh đều phạt chỗ làm xa kho bằng thời gian đi đường [wiki/thứ cấp]. Ta đã có hệ số gánh và tô vùng 100% (`vungGanh`). Nên báo thêm *ở đâu đang nghẽn*, đừng chỉ cho xem con số.
- **Đường giặc đi phải đoán được, không cần tối ưu.** Ở Clash of Clans, lính bộ đi lọt qua khe tường, còn tường liền thì phải phá. Một bài báo nhận xét game cố ý tránh tìm đường tối ưu toàn cục để người chơi xếp thành có chiến thuật [wiki, thứ cấp]. Ta tìm đường bằng lưới chi phí, nên cần cho người chơi *thấy trước* đường giặc định đi.
- **Bản đồ chọn màn có nhiều tầng sao.** Kingdom Rush cho 3 sao chế độ thường, rồi thêm 2 thử thách, mỗi thử thách 1 sao [wiki]. Ta đã có thử thách và ngôi sao đồng. Có thể thêm dấu sao theo chất lượng thắng (quân còn sống, thời gian).
- **Ải (pass) chia vùng mở dần.** Ở Rise of Kingdoms, phải chiếm ải nối với vùng ấy mới được sang vùng cấp cao hơn [wiki/thứ cấp]. Vùng đồn bên kia sông của ta giống ý này. Cầu chính là "ải" tự nhiên, nên cho mỗi cầu một vai trò gác cửa rõ ràng.
- **Boss mọc lại kèm "bia mộ".** Từ bản cập nhật chính thức tháng 11/2011, MVP của Ragnarok khi chết để lại bia ghi người hạ và giờ chết. Bia không ghi giờ mọc lại; người chơi tự tính [sơ cấp: tin của nhà phát hành, qua đoạn trích]. Thời gian mọc theo rAthena là hai số mili giây: số cố định cộng phần ngẫu nhiên [sơ cấp]. Boss dã ngoại của ta chờ cố định 30 phút (`DA_BOSS_MS`). Nên hiện "bia" và đồng hồ.
- **Có trần cho phần thưởng lúc vắng, và tính offline y như online.** AFK Arena mặc định trần 12 giờ [thứ cấp], Melvor Idle 24 giờ [thứ cấp]. Talk GDC 2016 của Kongregate khuyên tính tiến độ offline y như lúc đang chơi, đừng phạt người chơi vắng [sơ cấp: slide]. Treo máy của ta trần 8 giờ (`DA_TREO.tran`), hợp với kiểu chơi trên điện thoại.
- **Bậc nguy hiểm tăng theo khoảng cách, và hiện ra rõ ràng.** Wilderness của OSRS tăng từ cấp 1 ở hào biên lên 56 ở cực bắc, nên sâu vào thì luật gắt hơn [wiki, qua đoạn trích]. Năm khu quái theo cấp ở dã ngoại của ta cùng ý. Nên ghi cấp khu ngay trên bản đồ nhỏ.
- **Bãi có làn rõ ràng thì dễ đọc trên màn hình nhỏ.** Clash Royale chia sân bằng sông, chỉ hai cầu, nên thành hai làn [thứ cấp + trang hỗ trợ chính thức]. Bố cục bãi chiến của ta (khe ≥ 1,6 ô, lối 2,5 ô) đã tạo ra các lối đi. Dựng bãi theo "làn" có chủ đích sẽ làm vật cản thành lựa chọn chiến thuật.

---

## 1. Kinh đô

| Game | Cách làm | Nguồn |
|---|---|---|
| Clash of Clans | Lưới 44×44, mở rộng từ 40×40 (tin xem trước của Supercell). Tường liền chặn lính bộ; khe tường thì lính đi lọt; nhà, đá, đồ trang trí không bịt được khe. | [thứ cấp] gamezone, ibtimes; [wiki] Walls |
| Clash of Clans | Vật cản (cây, đá) mọc 8 giờ một cái, trần 45 cái; hộp đá quý và vật cản ngày lễ không tính vào trần. | [wiki] Obstacles; [thứ cấp] alviran.net trích tệp game |
| Clash of Clans: Clan Capital | Kinh đô chung chia nhiều quận. Nâng Capital Peak thì mở quận mới. Kẻ đánh không được đánh Capital Peak ngay từ đầu. | [sơ cấp] blog Supercell (đoạn trích) |
| Township | Mở đất bằng cách chạm ô có dấu $; cần đinh, xẻng, rìu, xu, và dân tối thiểu cho mỗi lần mở. Giá có tăng dần không thì **chưa kiểm được**. | [sơ cấp] FAQ Playrix (đoạn trích) |
| Banished | Kho lương 6.000 đơn vị. Kho gần thì người làm quay lại việc nhanh hơn, làm ra nhiều hơn. | [wiki] banished-wiki |
| Anno 1800 | Xe hàng chỉ dùng kho có đường nối và nằm trong tầm. Mỗi lần dỡ hàng chiếm một bến dỡ: xe ngựa 20 giây, xe tải 2 giây; hết bến thì xe xếp hàng chờ. | [thứ cấp] diễn đàn, devtrackers |
| Pharaoh / Caesar III | Người đi tuần ngẫu nhiên có tầm đi; người đẩy xe đi tới nơi định sẵn và qua được rào chắn. Nông trại xa kho lúa thì mất hiệu suất. | [thứ cấp] sierrahelp FAQ, GOG |

**So với Thời đại Văn Lang hiện nay**
- Đã giống:
  - Cây dại, tảng đá mọc có trần (`cayDa.ts`), như vật cản của Clash of Clans.
  - Gánh hàng theo quãng đường đi thật (`vanChuyen.ts`, Dijkstra, quá `GANH.gan` 14 ô thì hệ số giảm), như kho ở Banished.
  - Lũy liền chặn đường, cổng thành là lối qua.
  - Mở đất theo khoảnh, giá tăng từng nấc (`KHOANH_COST_STEP` 1,06), như Township.
- Khác:
  - Ta không có giới hạn chỗ dỡ hàng ở kho (Anno). Như vậy cũng tốt: đỡ phải lo quản lý chi tiết trên điện thoại.
  - Ta không đòi điều kiện dân số để mở khoảnh.
  - Kinh đô là của một người, không có quận chung.

**Đề xuất**
1. **Loại cây đá hiếm không tính vào trần**: ví dụ "gốc trầm", dọn được thêm vỏ ốc. Thỉnh thoảng mới mọc. Hợp điện thoại: có, vì chỉ là một lần chạm. Công sức: nhỏ.
2. **Chỉ chỗ gánh nghẽn**: dòng tin hay huy hiệu trên công trình có hệ số gánh dưới 100%, kèm nút "tìm chỗ đặt kho" tô vùng có lợi nhất. Hợp điện thoại: có. Công sức: vừa.
3. **Mở khoảnh xa Điện cần thêm điều kiện mềm** (ví dụ phải có đường nối tới), thay vì chỉ trả của. Đường đi khi ấy có thêm giá trị. Hợp điện thoại: có. Công sức: nhỏ tới vừa. Cần chủ dự án duyệt vì đụng luật đã chốt.
4. **Xem trước đường giặc** ở chế độ sửa kinh đô: vẽ mờ đường giặc định đi từ mỗi hướng ra (`raidSpawnBand` dùng chung `costGrid` của trận). Người chơi thấy khe lũy trước khi bị đánh. Hợp điện thoại: có, nếu chỉ vẽ khi bật. Công sức: vừa.

## 2. Bản đồ phó bản và bản đồ thế giới

| Game | Cách làm | Nguồn |
|---|---|---|
| Rise of Kingdoms | Bản đồ phủ sương mù theo ô. Trinh sát khởi đầu có 1 người, tầm 5×5 ô sương; trại trinh sát nâng tối đa thì có 3 người, tầm 15×15. Trinh sát biết chỗ mọi ải từ trước khi sương tan. | [wiki] Scouting |
| Rise of Kingdoms | Vùng 1, 2, 3 nối nhau qua ải. Muốn sang vùng cấp cao phải chiếm ải nối với vùng ấy. Ải có quân trung lập giữ; liên minh phải có đất chạm ải rồi đánh quân giữ. | [wiki]/[thứ cấp] Kingdom, Holy Sites, Pocket Gamer |
| Rise of Kingdoms: Lost Kingdom | Chỉ dịch chuyển được vào đất liên minh. Cắm cờ là cách duy nhất mở rộng đất. | [wiki] Lost Kingdom |
| Kingdom Rush | Màn làm bằng tay. Thắng 3 sao mở thêm Heroic và Iron, mỗi chế độ 1 sao (một màn tối đa 5 sao). Ở các bản sau, thử thách mở ngay khi thắng màn. | [sơ cấp] phỏng vấn Ironhide; [wiki] Iron Challenge |
| AFK Arena | Qua mỗi màn thì tăng nhịp thưởng treo máy và có thưởng lần đầu. | [thứ cấp] appgamer, ludo.guide |

**So với Thời đại Văn Lang hiện nay**
- Đã giống:
  - Mây mù bên kia sông, trinh sát 40 giây (`sendScout`).
  - Dẹp đồn thì cả vùng về tay ta (`regionOf`): gần với ải và đất liên minh của Rise of Kingdoms.
  - Thử thách mở khi thắng màn, có ngôi sao đồng: giống Kingdom Rush bản sau.
- Khác:
  - Thắng màn chưa có nấc sao theo chất lượng.
  - Trinh sát chưa có tầm nâng cấp.
  - Thắng phó bản không tăng nhịp treo máy (treo máy chỉ có ở dã ngoại).

**Đề xuất**
1. **Sao theo chất lượng thắng** (1–3 sao theo phần quân còn sống), để thử thách đòi phải có 3 sao. Có trận tất định nên chấm được. Hợp điện thoại: có. Công sức: vừa (thêm bản lưu, giao diện bản đồ).
2. **Trinh sát có cấp** theo cấp Điện hay một công trình: dò rộng hơn, báo trước chỗ đồn và bản làng (điểm lạ) như trinh sát biết chỗ ải. Hợp điện thoại: có. Công sức: nhỏ.
3. **Cầu là ải**: bắc cầu thì chỉ mở được vùng đồn ở đầu cầu ấy; vùng sâu hơn cần dẹp đồn vùng kề trước. Như vậy thứ tự đánh đồn có hình rõ ràng trên bản đồ. Cần kiểm xem `regionOf` hiện có làm vậy chưa. Hợp điện thoại: có. Công sức: nhỏ tới vừa.

## 3. Bãi chiến

| Game | Cách làm | Nguồn |
|---|---|---|
| Clash Royale | Sông chia đôi sân, hai cầu tạo hai làn. Lính bộ qua sông bằng cầu; quân bay và vài loại khác qua chỗ nào cũng được. | [sơ cấp] trang hỗ trợ Supercell (chỉ nói "tới cầu"); [thứ cấp] twinfinite |
| Clash of Clans | Lính phá tường nhắm nhà gần nhất được tường che. Cần ít nhất 3 đoạn tường liền mới nhắm. Bản vá chính thức sửa AI cho nhắm đều hơn, đỡ đổi đoạn tường. | [wiki] Wall Breaker; [sơ cấp] tin vá Supercell (bản tiếng Indonesia, đoạn trích) |
| Clash of Clans | Phép nhảy cho lính bộ qua tường tạm thời, chỉ ở chỗ vòng phép chạm tường cả hai bên. | [thứ cấp] cocmap |
| Total War | Rừng, đầm làm chậm, nhất là kỵ và quân lớn. Hệ số trên bản đồ chiến dịch: rừng thưa 140%, đầm 240%, rừng rậm 300% điểm đi. Số trong trận **chưa kiểm được**. | [wiki] Total War Warhammer; [thứ cấp] gamepressure |
| Kingdom Rush | Màn làm tay theo từng đường đi của giặc, đặt chỗ dựng tháp quanh đường. | [sơ cấp] phỏng vấn Ironhide |

**So với Thời đại Văn Lang hiện nay**
- Đã giống:
  - Nước bùn làm chậm (`chamAt`), như địa hình làm chậm của Total War.
  - Vật cản chặn và có khe tối thiểu.
  - Chương 5 cố ý đặt vật cản cho voi vướng, như Total War phạt quân lớn.
  - Cầu là lối duy nhất qua sông khi giữ kinh đô (`guardPath`), như làn cầu của Clash Royale.
- Khác:
  - Bãi phó bản của ta không có làn cố định; người chơi không chọn làn mà chỉ bấm kỹ năng.
  - Không có vật cản phá được.

**Đề xuất**
1. **Dựng bố cục theo làn**: một số bãi có hai, ba lối rõ ràng, giặc chia đều các lối. Kỹ năng vùng (Bốc đồi, Cọc Bạch Đằng) khi ấy có chỗ dùng hiển nhiên. Dùng luật `kiemBai` sẵn có. Hợp điện thoại: có, dễ đọc trên màn nhỏ. Công sức: nhỏ (chỉ thêm bố cục, rồi chạy `do-bai`).
2. **Vật cản phá được** (rào, xe củi có máu): quân ta hay giặc đánh vỡ thì lối mở. Hợp điện thoại: có. Công sức: vừa tới lớn (đụng `Nav`, bản đồ khoảng cách phải tính lại giữa trận, cần giữ tất định).
3. **Hệ số chậm theo loại quân** (voi, ngựa lội bùn chậm hơn người): Total War làm vậy. Hợp điện thoại: có. Công sức: nhỏ (`BAI_CHAM` theo loại), nhưng phải cân lại độ khó chương 5.

## 4. Dã ngoại

| Game | Cách làm | Nguồn |
|---|---|---|
| Ragnarok Online (rAthena) | Mỗi map khai báo quái bằng một dòng: map, vùng, tên, mã, số con, delay1 (mọc lại cố định, ms), delay2 (phần ngẫu nhiên thêm, ms). Ví dụ `gefenia04 … Bloody Knight 1268,1,3600000,3000000` là 1 con, mọc lại sau 60 phút cộng tối đa 50 phút ngẫu nhiên. `boss_monster` cho boss hiện trên dụng cụ dò boss. | [sơ cấp] rAthena `doc/script_commands.txt`, `npc/re/mobs/dungeons/gefenia.txt` |
| Ragnarok Online (rAthena) | Cổng dịch chuyển là một dòng `warp`: chỗ đi, vùng chạm (spanx, spany), map và ô tới. | [sơ cấp] rAthena `script_commands.txt` |
| Ragnarok Online (chính thức) | MVP chết để lại bia ghi người hạ và giờ chết; không ghi giờ mọc lại. MVP mọc ở nhiều chỗ thì mỗi chỗ một đồng hồ riêng. | [sơ cấp] tin cập nhật 11/2011 của nhà phát hành (đoạn trích); [wiki] irowiki |
| Old School RuneScape | Wilderness cấp 1 ở hào biên, tăng lên 56 ở cực bắc. Tầm đánh người chơi theo cấp vùng. Quá cấp 20 thì không dịch chuyển được (một số đồ được tới 30). | [wiki] OSRS Wiki (đoạn trích) |
| Võ Lâm Truyền Kỳ 2 | Bãi luyện công theo cấp, đi lại bằng phu truyền tống. **Chưa kiểm được** chi tiết bằng nguồn tốt: tìm tiếng Việt chỉ ra trang ứng dụng và tài liệu không liên quan. | — |
| AFK Arena | Thưởng treo máy mặc định tối đa 12 giờ, VIP được nới. | [thứ cấp] |
| Melvor Idle | Tiến độ offline tối đa 24 giờ (có nguồn ghi 18 giờ, chắc là bản cũ). | [thứ cấp] diễn đàn Steam |
| Kongregate (GDC 2015, 2016) | Game treo máy: tài nguyên lớn theo nhịp, chơi tiếp cả lúc offline. Khuyên tính offline y như online, đừng phạt người chơi vắng. | [sơ cấp] GDC Vault, slide của Pecorella; [thứ cấp] Game Developer |

**So với Thời đại Văn Lang hiện nay**
- Đã giống:
  - Map, khu quái theo cấp, khu boss, cổng sang map khác, A*: rất gần cấu trúc map, cổng dịch chuyển của Ragnarok và Võ Lâm.
  - Boss chờ mọc lại (`DA_BOSS_MS` 30 phút).
  - Treo máy có trần 8 giờ, tính bằng công thức (`tichTreo`, `treoVang`): đúng lời khuyên của Kongregate về trần và tính offline nhất quán.
- Khác:
  - Thời gian mọc lại cố định, không có phần ngẫu nhiên (đúng ý: luật của ta tất định, không dùng `Math.random`).
  - Không có bia boss hay đồng hồ công khai.
  - Treo máy dùng công thức riêng chứ không mô phỏng trận. Kongregate khuyên offline khớp online, nên cần canh để hai nhịp không lệch xa.

**Đề xuất**
1. **"Bia" boss trên map và ở bản đồ nhỏ**: ghi lần hạ gần nhất, đồng hồ mọc lại. Ragnarok giấu giờ mọc để người chơi tự canh; với game điện thoại thì nên hiện thẳng giờ. Hợp điện thoại: có. Công sức: nhỏ.
2. **Ghi cấp khu trên bản đồ nhỏ và ở cổng** (ví dụ "Khu 3: cấp 24–28"), tô màu theo chênh lệch với cấp chung, như Wilderness hiện cấp vùng. Hợp điện thoại: có. Công sức: nhỏ.
3. **Test canh treo máy khớp đánh thật**: so `nhipTreo` với kết quả `stepDa` tự đánh trong N phút ở mỗi map, sai lệch không quá một ngưỡng. Hợp điện thoại: không ảnh hưởng (chỉ là test). Công sức: nhỏ tới vừa.
4. **Phần chờ boss dao động theo hạt giống tất định** (như delay2 của rAthena nhưng tính từ `roll`), để nhiều người chơi không canh đúng một giờ. Ít giá trị vì game chơi một mình, chỉ làm khi có lý do. Công sức: nhỏ.

---

## Nguồn

Sơ cấp (đã đọc trực tiếp):
- rAthena, `doc/script_commands.txt`: https://raw.githubusercontent.com/rathena/rathena/master/doc/script_commands.txt
- rAthena, `npc/re/mobs/dungeons/gefenia.txt`: https://raw.githubusercontent.com/rathena/rathena/master/npc/re/mobs/dungeons/gefenia.txt

Sơ cấp (chỉ qua đoạn trích tìm kiếm, chưa mở được trang):
- Supercell, Clan Capital Raids: https://supercell.com/en/games/clashofclans/blog/game-updates/clan-capital-raids
- Supercell, Capital Forge: https://supercell.com/en/games/clashofclans/blog/game-updates/capital-forge
- Supercell, tin vá AI lính phá tường (tiếng Indonesia): https://supercell.com/en/games/clashofclans/id/blog/news/pembaruan-penyeimbangan-mendatang/
- Supercell, trang hỗ trợ Clash Royale 1v1: https://support.clashroyale.com/hc/en-us/articles/49484904683803-1v1-Battle
- Playrix, FAQ Township về mở đất: https://playrix.helpshift.com/hc/en/3-township/faq/3337-what-is-an-expansion/
- Ragnarok Online, tin cập nhật (bia MVP): https://renewal.playragnarok.com/news/updatedetail.aspx?id=183
- GDC Vault, Idle Games (Pecorella, 2015): https://gdcvault.com/play/1022066/Idle-Games-The-Mechanics-and
- Slide Idle Chatter, GDC 2016: https://pt.slideshare.net/AnthonyPecorella/idle-chatter-gdc-2016-59734260
- Phỏng vấn Ironhide (Kodeco): https://www.kodeco.com/30636/top-developer-interviews-ironhide-game-studio

Wiki (qua đoạn trích):
- Clash of Clans Wiki, Obstacles: https://clashofclans.fandom.com/wiki/Obstacles/Home_Village
- Clash of Clans Wiki, Wall Breaker: https://clashofclans.fandom.com/wiki/Wall_Breaker
- Clash of Clans Wiki (bản sao), Walls: https://clashofclansbackup.fandom.com/wiki/Walls
- Rise of Kingdoms Wiki, Scouting: https://riseofkingdoms.fandom.com/wiki/Scouting
- Rise of Kingdoms Wiki, Kingdom: https://riseofkingdoms.fandom.com/wiki/Kingdom
- Rise of Kingdoms Wiki, Lost Kingdom: https://riseofkingdoms.fandom.com/wiki/Lost_Kingdom
- Rise of Kingdoms Wiki, Holy Sites: https://riseofkingdoms.fandom.com/wiki/Holy_Sites
- Kingdom Rush Wiki, Iron Challenge: https://kingdomrushtd.fandom.com/wiki/Iron_Challenge
- Banished Wiki, Storage Barn: https://banished-wiki.com/wiki/Storage_Barn
- Total War Wiki, Terrain: https://totalwar.fandom.com/wiki/Terrain_(Total_War:_Three_Kingdoms)
- OSRS Wiki, Wilderness level: https://oldschool.runescape.wiki/w/Wilderness_level
- iRO Wiki (Dracula, Geffen Dungeon): https://irowiki.org/wiki/Illusion_of_Vampire

Thứ cấp:
- GameZone, CoC lưới 44×44: https://gamezone.com/news/clash-of-clans-update-sneak-peek-5-larger-village-map-3430340
- IBTimes, CoC 40×40 lên 44×44: https://ibtimes.com.au/clash-clans-sneak-peek-new-44x44-village-map-extended-attack-times-1487700
- Alviran (vật cản CoC, trích tệp game): https://alviran.net/blog/clash-of-clans-rarest-obstacles-by-year-2026/
- Bài báo chưa bình duyệt về tìm đường kiểu CoC: https://www.preprints.org/manuscript/202601.2386
- cocmap, phép nhảy: https://cocmap.com/read/jump-spells-navigating-walls-for-maximum-impact
- Pocket Gamer, KvK RoK: https://www.pocketgamer.com/rise-of-kingdoms/kvk-guide/
- Twinfinite, sân Clash Royale: https://twinfinite.net/guides/clash-royale-tips-tricks-beginners/2/
- AppGamer, Township mở đất: https://www.appgamer.com/township/strategy-guide/land-expansion
- AppGamer, AFK Arena: https://www.appgamer.com/afk-arena/strategy-guide/afk-rewards
- Ludo.guide, AFK Arena: https://www.ludo.guide/guide/afk-arena/core-game-mechanics-afk-rewards-progression
- Steam, Melvor Idle offline: https://steamcommunity.com/app/1267910/discussions/0/591762563949134719
- Devtrackers, Anno 1800 xe hàng: https://devtrackers.gg/anno-1800/p/56fb1339-tractors-and-farm-storage-we-ve-hit-a-wall-and-it-needs-a-fix-with-the-next-patch
- Sierra Help, Pharaoh FAQ: https://sierrahelp.com/Hints/PharaohFAQ.html
- GOG, cơ chế Caesar III: https://gog.com/forum/caesar_series/caesar_3_understanding_the_game_mechanics_experiments_and_general_infolinks
- GamePressure, Total War Warhammer: https://www.gamepressure.com/totalwarwarhammer/general-information/z18a4d
- Game Developer, game treo máy: https://gamedeveloper.com/design/the-rise-of-games-you-mostly-don-t-play

Chưa kiểm được:
- Võ Lâm Truyền Kỳ 2: chi tiết map, phu truyền tống, cấp bãi luyện công (không thấy nguồn tốt).
- Township: giá mở đất có tăng theo số lần mở không.
- Clash of Clans: lưới 44×44 hiện còn đúng không (nguồn là tin năm cũ).
- Total War: hệ số làm chậm trong trận (chỉ có số của bản đồ chiến dịch).
- Anno 1800: tầm kho tính bằng ô.
- Chưa so: Hay Day, Age of Empires Mobile, Kingdom Two Crowns, Lords Mobile, Civilization, MU Online, Diablo Immortal.
