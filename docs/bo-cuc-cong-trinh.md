# Bố cục công trình trên móng mới (chủ dự án đã duyệt)

Bản vẽ đi kèm mục **Vẽ lại công trình trên móng** trong `docs/thiet-ke.md`. Công trình móng 1×1 giữ nguyên nên không có ở đây. Tiêu đề mỗi mục ghi móng trước khi có kinh đô lớn → móng bây giờ.

Cách đọc bản vẽ:
- Mỗi ký tự là một **ô con bằng nửa ô**: móng 3×3 vẽ thành 6×6 ký tự, 4×4 thành 8×8, 5×5 thành 10×10.
- Hàng trên là **phía sau** công trình, hàng dưới là **mặt trước**. Cột trái là bên trái khi nhìn từ trước. Camera mặc định nhìn từ góc dưới bên phải, nên phần cao đặt về góc trên bên trái.
- `.` là sân hay nền trống, `,` là lối đi. Mỗi chữ khác là một phần, ghi cấp nó xuất hiện; phần đổi dáng ở cấp sau ghi trong ngoặc.
- **mới** là phần chưa có ở dáng hiện tại, thêm vào vì móng rộng hơn.
- Người, thú, đồ vật giữ cỡ như bây giờ. Mỗi cấp vẫn thêm một phần lớn nhìn rõ; cấp thấp móng còn thưa, lên cấp thì lấp dần.
- Khi làm, bản vẽ này chép vào code như bản vẽ mẫu kinh đô ở `src/game/mau.ts`, rồi sửa ở code. Tệp này giữ bản đã duyệt; chỗ nào đổi khi vẽ thật thì sửa cả ở đây.

### Điện Vua Hùng: 4×4 → 5×5 → 10×10

Từ bản lưu 20 Điện móng 10×10 (chủ dự án yêu cầu; xem mục Điện Vua Hùng 10×10 trong `docs/thiet-ke.md`). Nửa sau là khối cung điện vẽ theo bản 5×5 đã duyệt (ở dưới) phóng 1,5 lần; nửa trước là sân chầu: Vua Hùng ngồi ngai vàng trên bệ trước thềm, các tướng đứng chầu hai bên lối giữa, lối đá thẳng ra cổng. Người, ngai, cờ, trống trong sân giữ cỡ thật.

```
. . . 7 . . . . . . . . . . . . 7 . . .
. . . . . H H H H H H H H H H . . . . .
. . . c c H H H H H H H H H H C C . . .
. . . c c H H H H H H H H H H C C . . .
. . . c c H H H H H H H H H H C C . . .
. . . c c H H H H H H H H H H C C . . .
. . . c c N N N N N N N N N N C C . . .
. . . . . N N N N T T N N N N . . . . .
. 2 . . . . . d T T T T d . . . . . 2 .
. v v . . . . . . . . . . . . . . v v .
. v v . . . . . V V V V . . . . . v v .
. . . t . t . . V V V V . . t . t . u .
. . . . . . . . V V V V . . . . . . . .
. u . t . t . . m , , . . . t . t . u .
. . . . . . . . . , , . . . . . . . . .
. D . t . t . . . , , . . . t . t . D .
. . . u . . . . . , , . . . . . . . . .
. L L . . t . . . , , . . . t . . L L .
. L L . e . . . l , , l . . . . . L L .
. . . . . . . G G G G G G . . . . . . .
```

- `7`, `H`, `c`, `C`, `N`, `T`, `d`: khối cung điện (cột chim Lạc, nhà chính, hai chái, nền, thềm, đôi đỉnh đồng), vẽ theo bản 5×5 ở dưới, phóng 1,5 lần; chỗ chữ trên đây chỉ là chỗ chừng của khối sau khi phóng.
- `V` cấp 1, bệ ngai: Vua Hùng ngồi ngai vàng ở mọi cấp. Cấp 1–3 ụ đất trải chiếu; cấp 4 bệ đá ba bậc, thảm đỏ; cấp 6 mép bậc viền vàng; cấp 9 mặt bậc chạm hoa văn. Ngai cấp 3 có lọng (cấp 6 lọng vàng), cấp 5 đôi quạt lông chim, cấp 7 chim Lạc trên tựa ngai.
- `t` cấp 1, 14 chỗ tướng đứng chầu, hai cột mỗi bên (cột trong cách lối giữa 2,25 ô, cột ngoài 3,25 ô). Lạc tướng, Gióng hai bên ngai; Sơn Tinh, An Dương Vương hàng hai, Hai Bà Trưng cột ngoài hàng hai; Cao Lỗ hàng ba bên phải; còn lại để dành cho các chương sau. Tướng đứng trong sân không cưỡi thú.
- `u` cấp 1, bốn chỗ đứng chầu nới thêm cho tướng dã ngoại, đánh số từ trên xuống, trái sang: 14 ngoài cùng hàng ngai bên phải, cạnh Bà Triệu (Lý Thường Kiệt); 15, 16 ngoài cùng hàng ba (Mai Thúc Loan trái, Triệu Quang Phục phải); 17 cột ngoài giữa hàng ba và hàng gần cổng bên trái (Ngô Quyền). Chỗ đối xứng với 17 bên phải nằm ngay sau lầu trống đồng (nhìn từ góc camera mặc định) nên không dùng.
- `,` cấp 1, lối đi từ bệ ngai ra cổng (cấp 4: lát đá; cấp 6: viền vàng).
- `m` cấp 1, chỗ bày mâm bánh ngày Tết, trước bệ ngai.
- `e` cấp 1, chỗ cây nêu ngày Tết, dây cờ căng tới hai cột cờ `2`.
- `l` cấp 1, chỗ Lạc hầu và lính gác (từ cấp 2) đứng trong cổng.
- `2` cấp 2, cờ đỏ ở sau sân, cạnh voi đá.
- `D` cấp 2, trống đồng trên giá cạnh lầu trống (cấp 2–4 một trống bên phải; cấp 5 hai trống lớn).
- `G` cấp 4, cổng Nghi Môn phóng 1,3 lần (cấp 6 hai tầng mái, cấp 8 chim đồng, cấp 10 cổng thành), rào cột quanh móng thay bốn cọc mốc tre.
- `v` cấp 5, đôi voi đá trên bệ (cấp 8 yên gấm vàng).
- `L` cấp 6, lầu trống đồng ở hai góc trước, phóng 1,25 lần.
- Cấp 1–3: bốn cọc mốc tre buộc vải đỏ ở bốn góc. Cấp 2: viền đá quanh sân.

Khối cung điện (bản 5×5 trước bản lưu 20; nay chỉ dùng các chữ `7`, `H`, `c`, `C`, `N`, `T`, phần sân của bản này đã dời sang sân chầu ở trên):

```
7 . H H H H H H . 7
c c H H H H H H C C
c c H H H H H H C C
c c H H H H H H C C
. . N N T T N N . .
L m m . , , . . . L
. 2 D . , , . D 2 .
. . . l , , l . . .
. e e . , , . a a .
. . . . G G . . . .
```

- `H` cấp 1, nhà chính mái thuyền (cấp 5: mái hai tầng; cấp 7: mái ba tầng, đôi chim đồng lớn; cấp 8: trống đồng lớn trên nóc).
- `C` cấp 3, chái nhà bên phải.
- `N` cấp 4, nền đất đắp viền đá dưới nhà (cấp 6: nền đá thứ hai, lan can đỏ; cấp 8: viền đồng).
- `T` cấp 4, thềm đá ba bậc, đôi đỉnh đồng hai bên (cấp 8: thềm rộng, viền đá sẫm).
- `7` cấp 7, cột chim Lạc đai đồng.
- `c` cấp 7, chái nhà bên trái, cho cân hai bên.

### Ruộng lúa: 3×3 → 4×4

Giản lược kiểu 2, một mái chính (xem mục Giản lược công trình ở `docs/thiet-ke.md`). Bốn thửa vuông chia bằng bờ chữ thập, mỗi thửa ba luống lúa dài nổi khỏi nước, không viền mực; chòi canh trên gò góc sau bên trái.

```
C C a a b b b b
C C a a b b b b
a a a a b b b b
a a a a b b b b
c c c c d d d d
c c c c d d d d
c c c c d d d d
c c c c , , d d
```

- `a`, `b` cấp 1, hai thửa sau, ba luống mạ xanh.
- `c`, `d` cấp 2, hai thửa trước (cấp 1 mới cày, nước đục).
- `,` cấp 1, lối xuống ruộng: dốc đất cắt qua bờ trước.
- `C` cấp 3, chòi canh trên gò, mái nón theo cấp (cấp 6–8: chòi cao lên). Luống sau cùng của thửa sau bên trái ngắn lại chừa chỗ gò.
- Lúa cao dần theo cấp; cấp 3–4 lúa đứng cái, từ cấp 5 chín vàng; luống cạnh nhau đậm nhạt xen nhau. Bờ ngoài cấp 6 kè đá xám.
- Năm nông dân đứng trong khe nước giữa các luống, rải đủ bốn thửa.

### Ruộng nếp: 3×3 → 4×4

Khác ruộng lúa: ba thửa dài nằm ngang, thửa sau cao, thửa trước thấp dần như ruộng ven gò, bờ đất đỏ.

```
P P P P P P . .
a a a a a a a a
a a a a a a a a
b b b B b b b b
b b b b b b b b
c c c c c c c c
c c c c c c c c
. , , . . . . .
```

- `a` cấp 1, thửa trên, khóm nếp bông trĩu màu ngà.
- `b` cấp 1, thửa giữa.
- `,` cấp 1, lối lên bờ.
- `B` cấp 2, bù nhìn rơm đội nón.
- `c` cấp 2, thửa dưới (mới).
- `P` cấp 3, giàn tre phơi bó nếp dọc bờ sau.
- Bờ đất đỏ giữa các thửa, mỗi thửa thấp hơn thửa sau một chút.

### Bến chợ thuyền: 2×2 → 3×3

Giản lược kiểu 2 (một mái chính, `docs/thiet-ke.md` mục Giản lược công trình): nhà chợ mở suốt phía sau, sân trống có lối chợ lát ván chạy thẳng ra sàn bến và cầu tàu. Mặt trước quay ra sông.

```
K K K K K .
K K K K K .
. . , , . .
. . , , . .
. . , , . .
= = G G = =
```

- `K` cấp 1, nhà chợ mở (lán cột gỗ, `lanMo`), hai bàn hàng bày vải đỏ, vải chàm; dài dần tới cấp 5, cao dần cấp 6–8, mái theo cấp (`maiGon`).
- `,` cấp 1, lối chợ lát ván ra cầu tàu.
- `=` cấp 1, sàn bến gỗ dọc mép sông, cọc cắm xuống nước.
- `G` cấp 1, cầu tàu chìa ra sông (cấp 3: cầu tàu dài, có nhánh phụ chìa sang trái ở đầu cầu).
- Thuyền đậu dọc cầu tàu, phía bên phải cho camera thấy rõ: thuyền nhỏ sát cầu tàu (cấp 1); cấp 6 thuyền buôn lớn ghé sát cầu tàu, thuyền nhỏ dời ra ngoài; cấp 8 thuyền buôn thứ hai neo bên trái, ngoài nhánh phụ.
- Bốn người buôn: qua lại giữa sân, ở chân cầu tàu, sau nhà chợ, trước bàn hàng.

### Nhà sàn: 2×2 → 3×3

Giản lược kiểu 2, một mái chính (xem mục Giản lược công trình ở `docs/thiet-ke.md`). Một nhà sàn to lùi về sau bên trái, cây cau góc sau bên phải, sân trước để trống.

```
H H H H H Q
H H H H H .
H H H H H .
H H H H H .
. . E . . .
. . , . . .
```

- `H` cấp 1, nhà chính mái tròn hình mai rùa, to dần tới cấp 5 (chim đồng trên nóc ở cấp 5); cấp 7 thành nhà sàn dài mái thuyền, cấp 8 mái vút cao hai đầu, chim đồng hai đầu nóc (cấp 10: chim Lạc).
- `,` cấp 1, lối vào sân.
- `E` cấp 2, hiên trước, thang gỗ xuống sân.
- `Q` cấp 4, cây cau, cao dần theo cấp.
- Hai người ở sân trước: một bên phải thang, một góc trước bên trái.

### Bãi đất đá: 2×2 → 3×3

Giản lược kiểu 2, một mái chính (xem mục Giản lược công trình ở `docs/thiet-ke.md`). Mỏ đá bên gò: hố đá ba bậc góc sau bên trái, lán chứa đá góc sau bên phải, một chồng đá xẻ to trước bên phải, đường xe đá ra mặt trước.

```
P P P P T T
P P P P T T
P P P P T T
. . . . X X
. . . . X X
. . , , . .
```

- `P` cấp 1, hố đá lộ thiên khoét vào gò: ba bậc đá chữ L ôm góc sau bên trái, đáy hố sẫm, mép hố (cấp 6–8: bậc đá cao dần).
- `,` cấp 1, đường xe đá.
- `X` cấp 1, một chồng đá xẻ to, cao dần theo cấp.
- `T` cấp 3, lán chứa đá bốn cột, mái thuyền theo cấp, khối đá xẻ dưới lán (to dần tới cấp 5, cao dần ở cấp 6–8).
- Năm thợ đá: hai người dưới đáy hố, một bên trái bãi, một cạnh chồng đá, một giữa bãi.

### Lò rèn: 2×2 → 3×3

Giản lược kiểu 2, một mái chính (xem mục Giản lược công trình ở `docs/thiet-ke.md`). Lò nón lớn góc sau bên trái, lán đe mái một dốc góc sau bên phải, đe trước lán, sân trước để trống.

```
N N N W W W
N N N W W W
N N N . A .
. . . . . .
. . . . . .
. . , , . .
```

- `N` cấp 1, lò nung hình nón, miệng lò quay chéo ra góc trước bên phải có lửa, to dần tới cấp 5 (cấp 6–8: lò cao dần, đai đất quấn thân, khói đen từ ống lò).
- `A` cấp 1, đe sắt trên gốc gỗ, thanh sắt nung đỏ (viền mảnh).
- `,` cấp 1, lối vào.
- `W` cấp 2, lán đe ba cặp cột, mái một dốc theo cấp, cao ở trước (cấp 6–8 cao dần; cấp 10 chim Lạc hai góc diềm trước).
- Bốn thợ rèn: quai búa bên đe dưới mép lán, canh miệng lò, hai người giữa sân.

### Kho thóc: 2×2 → 3×3

Giản lược kiểu 2, một mái chính (xem mục Giản lược công trình ở `docs/thiet-ke.md`). Một vựa to góc sau bên trái, sân phơi thóc trước bên phải, cót thóc thấp mái tranh góc sau bên phải.

```
V V V V 6 6
V V V V 6 6
V V V V . .
V V V . s s
. . , s s s
. . , s s s
```

- `V` cấp 1, vựa tròn trên cột cao, mái nón, trên nền đá, to dần tới cấp 5 (chóp đồng); cấp 6–8 cột cao dần; cấp 9 mái hai tầng (cấp 10: chim Lạc trên tầng trên).
- `,` cấp 1, lối vào.
- `s` cấp 2, sân phơi thóc vàng (cấp 7: lát gạch). Dân gánh hàng về kho đổ ở sân.
- `6` cấp 5, cót thóc thấp mái tranh trên vòng đá (cấp 6–8: cao dần).
- Người giữ kho đi qua lại trên dải sân giữa vựa và cót.

### Doanh trại: 3×3 → 4×4 → 8×8

Từ bản lưu 26 chỉ còn một doanh trại (đại doanh), móng 8×8 (chủ dự án yêu cầu; xem mục Kế hoạch: một doanh trại lớn trong `docs/thiet-ke.md`). Lấy bố cục của hình mẫu chủ dự án gửi (khuôn viên vuông có tường bao, lầu cổng, sân tập rộng có lính tập), giữ nét Đông Sơn. Nhà dài cao xếp dọc tường sau và tường trái, phải; phía trước chỉ có phần thấp cho khỏi che lính tập và tướng.

```
# # # # # # # C C # # # # # # #
# H H H H H . C C . I I I I I #
# H H H H H . , , . I I I I I #
# J J . D D D D D D D D . L L #
# J J . D D D D D D D D . L L #
# J J . D D D D D D D D . L L #
# J J . D D D D D D D D . L L #
C C . . . . . , , . . . . . C C
C C . . s . s , , s . s . . C C
# K K . . . . , , . . . . o . #
# K K . s . s , , s . s . o . #
# K K . . . . , , . . . . o . #
# K K . s . s , , s . s . . . #
# T T . . . . , , . . . b . b #
# T T g g f . C C . . . . . . #
# # # # # # # C C # # # # # # #
```

- `#` cấp 1, rào cọc vót nhọn quanh móng (như bốn nơi ở); cấp 3 tường đất nện thấp chân kè đá, đỉnh có mái tranh nhỏ hai mái.
- `C` cấp 1, cổng tre giữa mặt trước: hai cột đầu vót, xà ngang, vải đỏ. Cấp 2 thành lầu cổng: bốn cột chân, giằng chéo, sàn lầu lan can đỏ, chòi mái tranh cong, cờ đuôi nheo đỏ. Cấp 3 thêm lầu cổng sau, trái, phải. Chỗ cổng khớp `gates` (`src/game/doanhTrai.ts`): lính, tướng giữ kinh đô ra từ cổng gần giặc.
- `H I J K L` nhà dài để trống không vách, mái thẳng, sàn ván thấp, chiếu ngủ, chăn cuộn; mỗi doanh một nhà theo thứ tự doanh, có khi có tướng thứ ấy (không theo cấp). Góc nhà nhìn ra sân cắm cờ hiệu màu tướng.
- `D` cấp 2, đài tướng: nền đất đắp kè đá, sàn ván có mạch, chiếu cói viền đỏ mỗi chỗ tướng, lan can đỏ, bậc đá giữa, lọng đỏ giữa mép sau. Tướng ở trại đứng trên đài nhìn ra sân: Trưng Trắc (voi), Gióng (ngựa sắt), Sơn Tinh, Trưng Nhị (voi), từ trái qua phải.
- `s` cấp 1, lính tập: cấp 1 bốn người hàng giữa, mỗi cấp thêm hai, cấp 5 mười hai. Theo tỉ lệ binh chủng đã luyện, đổi hai tư thế theo nhịp.
- `,` cấp 1, lối từ cổng sau tới nhà dài và từ cổng trước tới bậc đài (cấp 4 lát đá có mạch). Sân tập đất nện sẫm hơn sân, cấp 4 kẻ ô vạch vôi.
- `g` cấp 1, giá giáo đồng (chương 4 thêm giá nỏ). `f` cấp 4, cột cờ lớn chân kè đá, cờ đỏ viền vàng.
- `o` cấp 3, ba cọc rơm tập đâm. `b` cấp 3, hai bia rơm tròn.
- `T` cấp 5, chòi trống trận: chân cột cao, sàn lan can đỏ, trống đồng, mái tranh nhọn, thang tre quay ra sân.
- Lính gác: cấp 1 một người trong cổng tre; có lầu cổng thì mỗi lầu một người đứng trên sàn lầu.

Bản 4×4 trước bản lưu 26 (nay không dùng):

```
H H H H H H H H
H H H H H H H H
h h . . . . 5 5
h h . . . . 5 5
h h . . X . . .
h h . . . . 2 2
g . . . . . 2 2
. . . , , . . .
```

Bốn nơi ở của binh chủng (bản lưu 26) cùng kiểu khuôn viên với doanh trại, vẽ chung ở `src/render/congTrinh/trai.ts` (`khuonVien`):
- `#` rào cọc vót nhọn quanh mép móng (chuồng voi cọc thưa, cao, có hai thanh ngang);
- `C` lầu cổng mái tranh giữa mặt trước, như lầu cổng doanh trại cấp 2 thu còn 85%, có một lính gác đứng trên sàn lầu;
- `,` lối đất từ cổng vào sân.

Mỗi nơi ở một nhà lính ở góc sau bên trái, sân tập ở giữa. Lính tập, voi cầm binh khí, mặc giáp đúng bậc đã rèn của binh chủng ấy (`LotOpts.tier`), gộp một lưới mỗi chất liệu (`gopHinh`). Nơi ở không đổi dáng theo cấp (một cấp). Người, thú cùng cỡ lính tập ở doanh trại.

### Trại giáo: 2×2 → 3×3 → 4×4

Một lều lính lớn, giá giáo, sân tập hai cọc rơm, mỗi cọc một giáo binh đâm.

```
A A A A A . g g
A A A A A . g g
A A A A A . . .
. . . . s . o .
. . . . . . . .
. . . . s . o .
. . . , , . . .
. . . C C . . .
```

- `A` lều lính mái chữ A, nóc chạy ngang, mái tranh chạm đất trước và sau; hồi trái đan phên, hồi phải để ngỏ thấy chiếu ngủ; cột tre bắt chéo hai đầu nóc. To hơn lều 3×3 chừng 30% (hai lều cũ gộp một). Cờ đỏ cắm sau hồi trái, bay cao trên nóc.
- `g` giá giáo năm cây, mũi đồng lớn.
- `o` cọc rơm có thanh ngang làm vai, nắm rơm làm đầu, trên sân đất nện.
- `s` giáo binh đâm cọc rơm, mũi giáo chạm cọc: người trên thế thủ, người dưới đâm tới.

Bản 3×3 trước bản lưu 26:

```
A A A A g g
A A A A g g
a a a a . .
a a a a . .
. o . . o .
. . , , . .
```

### Trại cung: 2×2 → 3×3 → 4×4

Lán một mái góc sau bên trái, trường bắn chạy ngang sân: hai cung thủ đứng sau vạch bắn bên phải bắn sang hai bia ở mép trái.

```
L L L L L . f .
L L L L L . . .
. r . . . . . .
B . . . . v c .
. . . . . v . .
b . . . . v c .
. . . , , . . .
. . . C C . . .
```

- `L` lán một mái tựa vách phên sau, mái tranh dốc ra trước; giá cung đứng và bao tên dưới mép mái trước. Dài hơn lán 3×3 chừng 70%.
- `B b` hai bia rơm tròn quay mặt sang phải; mấy mũi tên trượt găm xuống đất quanh bia.
- `v` vạch bắn: khúc gỗ nằm dọc; `c` cung thủ đứng sau vạch, một người giương cung, một người vừa buông dây; bao tên bên cạnh.
- `r` đống bó rơm làm bia. `f` cờ đỏ cao.
- Sân đất nện chạy ngang từ bia tới chỗ cung thủ.

Bản 3×3 trước bản lưu 26:

```
r f . L L L
. . . L L L
B . . L L L
. . . . . c
b . . . . c
. . , , . .
```

### Chuồng voi: 2×2 → 3×3 → 4×4

Mái chóp bốn mặt trên cột gỗ lớn ở góc sau bên trái, một voi nghỉ dưới mái; sân voi rộng, một voi ra sân ăn cỏ.

```
M M M M M . m m
M M M M M . m m
M M M M M . c .
. . . . . . . .
. . . . . . . .
w w . . . . y y
w w . , , . y y
. . . C C . . .
```

- `M` mái chóp bốn mặt trên bốn cột lớn đai đồng, chóp đồng, rơm lót nền, vách phên thấp phía sau; cột cao đủ cho voi có người cưỡi đứng lọt. Một voi đứng ngang dưới mái.
- `c` cọc buộc voi đai đồng, cuộn thừng quấn quanh.
- `w` máng nước gỗ kê trên hai khúc gỗ. `y` đống cỏ. `m` đống thân chuối cắt khúc, đầu cắt quay ra trước; cờ đỏ cạnh đó.
- Sân voi đất nện; một voi (có người cưỡi) đứng giữa sân, quay về đống cỏ. Hai voi gộp một lưới, có bóng.

Bản 3×3 trước bản lưu 26:

```
M M M M m m
M M M M m m
M M M M c .
. . . . . .
w w . . y y
. . , , y y
```

### Trại nỏ: 2×2 → 4×4

Chương 4. Lán mái ngói đỏ cam như ngói thành Cổ Loa, trường bắn ngang sân có bia gỗ, ụ đất tập lên dây.

```
N N N N N . f .
N N N N N . . .
. . . . . . k .
B . . . . s . .
. . . . . . . .
. . . . . u u .
. . . , , u u .
. . . C C . . .
```

- `N` lán sáu cột, sàn đất nện, mái thuyền lợp ngói; dưới mái dọc vách sau là giá gác bốn cây nỏ, báng chúc xuống, cánh nỏ ngang.
- `B` bia gỗ vuông trên hai cột, mặt vẽ vòng tròn đỏ trắng quay sang phải, mấy mũi tên nỏ găm vào.
- `s` lính nỏ quỳ một gối nhắm bia; hòm tên nỏ cạnh đó.
- `k` nỏ lớn lẫy đồng trên giá (dáng giá nỏ, thu 55%), chĩa ra trước.
- `u` ụ đất tập lên dây: nền đắp viền đá thấp, mặt đất nện; một lính nỏ đứng trên ụ lên dây, quay ra sân.
- `f` cờ đỏ cao. Sân đất nện chạy ngang từ bia tới chỗ lính quỳ.

### Đền Phù Đổng: 3×3 → 4×4

Đền lùi về sau, tượng Gióng cưỡi ngựa sắt đứng giữa sân trên bệ, bụi tre đằng ngà góc sau, ao tròn như vết chân ngựa góc trước.

```
t t H H H H f .
t t H H H H . .
t . H H H H . .
d . . . . . . d
. . . G G . . .
. . . G G . o o
f . . , , . o o
. . . c c . . .
```

- `t` bụi tre đằng ngà (mới).
- `H` đền mái thuyền, chim đồng hai đầu nóc.
- `f` cờ đỏ.
- `d` lư hương đồng.
- `G` tượng Gióng cưỡi ngựa sắt trên bệ.
- `o` ao tròn vết chân ngựa (mới).
- `,` lối vào.
- `c` cổng nhỏ (mới).

### Đền Tản Viên: 3×3 → 4×4

Ba ngọn núi Ba Vì chắn suốt phía sau, đền nền đá ba bậc như sườn núi, tượng Sơn Tinh dưới thềm, suối nhỏ từ núi chảy dọc mép trái.

```
M M M M M M M M
M M M M M M M M
s . H H H H . .
s . H H H H . .
s d T T T T d .
s . . S S . . .
s f . , , . f .
s . . c c . . .
```

- `M` ba ngọn núi Ba Vì, ngọn giữa cao nhất.
- `s` suối nhỏ từ núi chảy xuống (mới).
- `H` đền mái thuyền.
- `d` lư hương đồng.
- `T` nền đá ba bậc như sườn núi.
- `S` tượng Sơn Tinh.
- `f` cờ xanh núi, cờ đỏ.
- `,` lối vào.
- `c` cổng nhỏ (mới).

### Đền Cổ Loa: 3×3 → 4×4

Đền mái thuyền hai tầng phía sau, sân có lan can đá ba phía, tượng Rùa Vàng và nỏ đồng lớn đứng hai bên lối, cổng đất nện như cổng thành Cổ Loa.

```
. H H H H H H .
. H H H H H H .
. . T T T T . .
l . . . . . . l
l . R R . N N l
l . R R . N N l
l f . , , . f l
. . . c c . . .
```

- `H` đền mái thuyền hai tầng.
- `T` nền đá hai bậc.
- `l` lan can đá.
- `R` tượng Rùa Vàng ngóc đầu.
- `N` nỏ đồng lớn trên giá.
- `f` cờ đỏ.
- `,` lối vào.
- `c` cổng đất nện kiểu cổng thành (mới).

### Vườn đậu xanh, lá dong: 2×2 → 3×3

Giản lược kiểu 2, một mái chính (xem mục Giản lược công trình ở `docs/thiet-ke.md`). Khóm lá dong lớn góc sau bên trái, hai luống đậu dài chạy ngang móng, lối giữa hai luống; cấp 3 lều phơi đậu mái tranh góc sau bên phải.

```
D D . L L L
D D . L L L
d d d d d d
. . . . . .
e e e e e e
. . , , . .
```

- `D` cấp 1, hai khóm lá dong, to dần theo cấp.
- `d`, `e` cấp 1, hai luống đậu xanh: đất vun, dải đậu liền phía trên, không viền mực, cao dần theo cấp.
- `,` cấp 1, lối vào.
- `L` cấp 3, lều phơi bốn cột mái tranh, giá tre với hai nong đậu.
- Hai người làm vườn: một người giữa hai luống, một người cắt lá dong.

### Chuồng lợn: 2×2 → 3×3

Giản lược kiểu 2, một mái chính (xem mục Giản lược công trình ở `docs/thiet-ke.md`). Chuồng mái tranh góc sau bên trái, máng gỗ bên phải, sân trống cho lợn chạy, vũng bùn phẳng góc trước (cấp 3).

```
C C C C . .
C C C C . .
. . . . m m
. . . . . .
b b b . . .
b b b , , .
```

- `C` cấp 1, chuồng bốn cột mái tranh, ổ rơm (cấp 2 mái cao hơn; cấp 3 sàn gỗ, vách ván sau, cầu dốc xuống sân).
- `m` cấp 1, máng gỗ, một lợn chúi mõm ăn.
- `,` cấp 1, lối vào.
- `b` cấp 3, vũng bùn phẳng, một lợn đằm bùn.
- Lợn lớn: cấp 1 hai con, mỗi cấp thêm một. Hai người chăn lợn: một người đổ cám bên máng, một người ở sân trước.

### Bếp gói bánh: 2×2 → 3×3

Giản lược kiểu 2, một mái chính (xem mục Giản lược công trình ở `docs/thiet-ke.md`). Gian bếp mái tranh phía sau, nồi bánh đặt ngay dưới mép trước mái cho dễ thấy, chiếu gói bánh trải rộng phía trước.

```
M M M M l l
M K K M l l
M K K M . .
. . . . G G
c c c c . .
c c c c , ,
```

- `M` cấp 1, gian bếp bốn cột mái tranh (cấp 2: dựng cao hơn).
- `K` cấp 1, kiềng ba hòn, nồi đồng luộc bánh, lửa củi (cấp 3: nồi thứ hai, khói bếp).
- `c` cấp 1, chiếu gói bánh có lá dong, bánh đã gói (cấp 2: chiếu rộng thêm; bánh nhiều dần theo cấp).
- `,` cấp 1, lối vào.
- `l`, `G`: chỗ người xếp lá dong, người giã bánh giầy đứng (không vẽ gì).
- Ngày Tết thêm người ngồi gói bánh trên chiếu, nay nằm trong móng.

## Công trình mới (chủ dự án đã duyệt, đã vẽ xưởng mộc, làng chài, nhà thợ hồ)

Bản vẽ đi kèm mục **Kế hoạch: cổng thành, xưởng mộc, làng chài** trong `docs/thiet-ke.md`. Cổng thành móng 1×1 nên không có ở đây. Cách đọc như trên; hai công trình này chưa có dáng cũ nên không có chữ **mới**.

### Xưởng mộc: 3×3

Giản lược kiểu 2, một mái chính (xem mục Giản lược công trình ở `docs/thiet-ke.md`). Lán thợ mộc dài suốt phía sau, gỗ tròn chất dưới nửa phải lán, giá cưa xẻ bên trái, sân trước để trống.

```
L L L L L L
L L L L L L
X X , . . .
X X , . . .
. . , , . .
. . , , . .
```

- `L` cấp 1, lán thợ mộc mở, ba cặp cột, mái thuyền theo cấp (cấp 6–8 cao dần); gỗ tròn dưới lán, nhiều dần tới cấp 5.
- `X` cấp 1, giá cưa xẻ: cây gỗ gác dọc trên hai giá chữ A, tấm ván cho thợ đứng, lưỡi cưa đứng (viền mảnh).
- `,` cấp 1, lối đất nện.
- Bốn chỗ đứng: thợ xẻ dưới giá cưa, thợ xẻ đứng trên cây gỗ, thợ mộc trước lán, thợ mộc dưới lán.

### Làng chài: 3×3

Giản lược kiểu 2: lều chài góc sau bên trái, lối giữa ra bờ ván dọc mép nước, vó bè góc trước bên phải chìa cần ra sông. Mặt trước quay ra sông như bến.

```
N N N . . .
N N N . . .
. . , , . .
. . , , . .
. . , , V V
= = = = V V
```

- `N` cấp 1, lều chài mái tranh thấp (cấp 4: nhà sàn ngư dân mái thuyền, cột cao dần cấp 6–8).
- `,` cấp 1, lối đất ra bờ.
- `=` cấp 1, bờ ván dọc mép sông, cọc cắm xuống nước, cầu ván ngắn chìa ra nước chỗ ngư dân quăng chài.
- `V` cấp 2, vó bè: bè tre sát bờ, cần vó chìa ra sông qua cột chống, khung vó bắt chéo, lưới vuông, bốn dây.
- Thuyền ngoài móng, trên sông trước bờ ván: thuyền đánh cá bơi chậm quanh chỗ neo (cấp 1), chiếc thứ hai (cấp 3), thuyền lưới lớn có buồm (cấp 8). Không ra tới luồng thuyền qua lại, không chạm bờ bên kia.
- Ba ngư dân: một người quăng chài ở đầu cầu ván, một người kéo vó trên bè vó, một người ở sân.
- Đã vẽ (`src/render/congTrinh/langChai.ts`).

### Bến thuyền khơi: 3×3

Đi kèm mục **Kế hoạch: biển Đông, bến thuyền khơi** trong `docs/thiet-ke.md`. Giản lược kiểu 2: kho hải sản sàn cao góc sau bên trái, đụn vỏ ốc bên phải, lối giữa ra cầu tàu dọc mép nước, cầu ván chìa ra chỗ thuyền khơi neo. Mặt trước quay ra sông như bến, làng chài. Ba cấp mở theo Điện 8, 9, 10 nên mái theo cấp Điện ấy (bỏ dải đồng cấp 9).

```
K K K K . .
K K K K . .
. . , , O O
. . , , O O
. . , , . .
= = = = = =
```

- `K` cấp 1, kho hải sản: nhà sàn cao mái theo cấp, cột cao dần theo cấp.
- `O` cấp 1, đụn vỏ ốc biển kem, hồng trong nong lớn (cấp 2: thúng ốc; cấp 3: đụn thứ hai cao hơn).
- `,` cấp 1, lối đất ra cầu tàu.
- `=` cấp 1, cầu tàu ván trên cọc dọc mép sông; cầu ván chìa ra sông tới mạn thuyền khơi, cột neo bọc đồng.
- Thuyền khơi không thuộc mô hình móng: neo dọc cầu tàu, cách mép móng một ô (`benDock` ở `game/bien.ts`), rồi ra biển (World dựng, `makeThuyenKhoi`).
- Năm người làm: ở sân trước kho, dọc cầu tàu, đầu cầu ván, bên đụn ốc.
- Đã vẽ (`src/render/congTrinh/benKhoi.ts`).

### Nhà thợ hồ: 3×3

Giản lược kiểu 2, một mái chính (xem mục Giản lược công trình ở `docs/thiet-ke.md`). Nhà tường gạch mái thuyền suốt phía sau, đoạn tường đất nện dựng dở trong khuôn ván góc trước bên trái, sân đóng gạch để trống.

```
L L L L L L
L L L L L L
S S , N N N
S S , N N N
K K , , . .
K K , , . .
```

- `L` cấp 1, nhà gạch trên nền đá: tường gạch mộc vàng đất (cấp 9: gạch nung đỏ), cửa trước, mái thuyền theo cấp (cấp 6–8 tường cao dần).
- `,` cấp 1, lối đất nện.
- `N`, `S` sân đóng gạch, chỗ thợ đứng (không vẽ gì).
- `K` cấp 3, đoạn tường đất nện giữa hai tấm ván khuôn, cao thêm theo cấp tới cấp 8.
- Chỗ đứng theo thứ tự có người: thợ đóng gạch ở sân, thợ cả trước cửa nhà, người giẫm đất bên trái sân (cấp 2), thợ nện tường bên khuôn ván (cấp 3).

### Nhà thuốc nam: 4×4

Giản lược kiểu 2, một mái chính (xem mục Giản lược công trình ở `docs/thiet-ke.md`). Nhà sàn lang y mái thuyền suốt phía sau; giữa là lán chõng tre mái tranh cho thương binh nằm và cối giã thuốc; trước bên trái là luống thuốc nam phẳng.

```
L L L L L L L L
L L L L L L L L
L L L L L L L L
C C C C , , G G
C C C C , , G G
V V V . , , . .
V V V . , , . .
V V V . , , . .
```

- `L` cấp 1, nhà sàn lang y dài, mái thuyền theo cấp, thang gỗ xuống sân (cấp 6–8 cột cao dần).
- `C` cấp 1, lán chõng: cột tre, mái tranh một mái, chõng tre hai hàng (cấp 1 hai chõng, thêm dần tới sáu); chõng đầu có thương binh nằm theo số thương binh.
- `G` cấp 1, cối giã thuốc, chày, mẹt lá (viền mảnh); lang y đứng bên cối.
- `V` cấp 1, ba luống thuốc nam phẳng trên bờ đất, không viền mực; hai người hái thuốc làm ở đây rồi thay phiên lên rừng.
- `,` cấp 1, lối giữa.

## Hồ Kim Quy: 8×8 (chủ dự án yêu cầu, đã vẽ)

Bản vẽ đi kèm mục **Hồ Kim Quy** trong `docs/thiet-ke.md`. Một cấp, chưa có dáng cũ. Móng 8×8 vẽ thành 16×16 ký tự. Mặt trước (cổng, cầu) quay về +z; cây cao đứng góc sau.

```
T T T T . L L L L L L L . B B B
T T T T ~ ~ ~ ~ ~ ~ ~ ~ ~ B B B
T T T T ~ ~ ~ ~ ~ ~ ~ S S ~ . .
T T T T ~ ~ ~ ~ ~ ~ ~ S S ~ ~ .
. ~ ~ ~ ~ G G G G G G ~ ~ ~ ~ .
. ~ ~ ~ ~ G M M M M G ~ ~ ~ ~ .
. ~ ~ ~ ~ G M M M M G ~ ~ S S .
. ~ ~ ~ ~ G M M M M G ~ ~ S S .
. ~ ~ ~ ~ G G G G G G ~ ~ S S .
. S S ~ ~ G G G G G G ~ ~ ~ ~ .
. S S ~ ~ ~ ~ C C ~ ~ ~ ~ ~ ~ .
. . ~ ~ ~ ~ ~ C C ~ ~ ~ ~ ~ . .
. . . ~ ~ ~ ~ C C ~ ~ ~ ~ . . .
. F . . . . . , , . . . . . F .
. D D . . 7 . , , . 7 . . D D .
. D D . . 7 . , , . 7 . . D D .
```

- `~` mặt hồ. Bờ hồ vẽ theo đúng viền ngoài các ô con `~ G M S C` (`lakeOutline`), làm mượt bậc thang và bo góc; kè đá viền quanh, đá kè rải dọc bờ; lòng hồ sâu sẫm màu hơn, vài vòng gợn sóng.
- `G` gò giữa hồ: chân gò đất bầu dục viền đá, mặt cỏ; `M` miếu thờ thần Kim Quy trên nền đá viền đồng: bốn cột son, vách gỗ có dải hoa văn, cửa giữa có mặt trống đồng trên trán, mái thuyền lợp ngói viền đồng vàng, chim Lạc hai đầu nóc; đỉnh đồng ba chân và hai cờ nhỏ trước cửa; bậc đá xuống phía cầu.
- `C` cầu gỗ son cong vồng từ chân gò ra bờ trước, cột chống xuống nước, lan can son.
- `,` lối lát đá từ chân cầu ra cổng.
- `7` cổng hai cột gỗ đai đồng, chim Lạc dang cánh trên đầu cột, xà son, biển gỗ có mặt trống đồng.
- `D` trống đồng trên giá gỗ thấp; `F` cờ đỏ (trái), cờ vàng (phải).
- `S` đám sen: lá nổi, hoa hồng nở, nụ trên cuống.
- `L` lau sậy dọc bờ sau. `T` cây đa cổ thụ (mô hình cây đa trang trí), tán xòe xuống mặt hồ. `B` bụi tre.
- Một thầy cúng (Lạc hầu) đứng khấn trước miếu. Rùa Vàng bơi vòng bầu dục quanh gò (`userData.swim`, World cho bơi ở `swimTurtle`).

## Đền Hát Môn: 4×4 (chương 5, đã vẽ)

Bản vẽ đi kèm mục **Đền Hát Môn** trong `docs/thiet-ke.md`. Một cấp, chưa có dáng cũ. Đền thờ Hai Bà lùi về sau, sân lát đá trước đền có đàn tế đắp đất nơi Hai Bà tế cờ; cây đa cao đứng góc sau bên trái cho khỏi che sân.

```
T T H H H H . B
T T H H H H . B
T T H H H H . .
. . N N N N . .
. . . L L . . .
V V . D D . V V
V V . D D . V V
. . . , , . . .
```

- `H` đền thờ Hai Bà: tám cột son trên chân đá, vách gỗ dải hoa văn, cửa giữa có mặt trống đồng trên trán, xà son; mái cong hai tầng lợp ngói viền đồng vàng, tầng trên đặt trên gác lửng có hàng ô cửa, chim Lạc đồng hai đầu nóc.
- `N` thềm đền: nền đá hai bậc phủ cả `H` và `N`, ba bậc đá lên giữa thềm.
- `L` lư hương đồng ba chân trên trụ đá: nắp chóp có núm, hai quai, nén hương đỏ lửa.
- `D` đàn tế đắp đất hai tầng, bậc đất mặt trước: cột cờ son cao giữa đàn, cờ đỏ thắm lớn viền vàng; trống đồng nhỏ và mâm lễ trên đàn; phướn đỏ, phướn vàng hai góc sau.
- `V` hai voi đá quỳ trên bệ đá hai bên sân, quay chếch vào lối giữa: chân trước duỗi, chân sau xếp, tai lớn, vòi cuộn chạm bệ, ngà ngắn, vải bành chạm nổi trên lưng.
- `,` lối vào; sân lát đá hai màu so le từ thềm ra lối, viền đá hai bên; ngoài sân là cỏ.
- `T` cây đa cổ thụ: gốc to bành rễ, vòng đá kè, dải vải đỏ buộc thân, rễ phụ buông, tán xòe nhiều vòm (tràn ra ngoài móng chưa tới nửa ô).
- `B` bụi tre góc sau bên phải.
- Thầy cúng (Lạc hầu) đứng khấn bên trái lư hương, quay vào đền; chỗ thứ hai là người dâng lễ bên đàn tế.
- Đã vẽ (`src/render/congTrinh/denHatMon.ts`). Đã đổi khi vẽ: bỏ hai cờ đứng hai bên thềm (đâm vào diềm mái, lẫn với cờ đàn tế), thay bằng phướn đỏ, vàng trên đàn tế.

## Đền Rồng Tiên: 8×8 (chủ dự án yêu cầu, đã vẽ)

Bản vẽ đi kèm mục **Đền Rồng Tiên** trong `docs/thiet-ke.md`. Một cấp, chưa có dáng cũ. Móng 8×8 vẽ thành 16×16 ký tự. Một đền, hai nửa: đền chính lùi về sau giữa móng; nửa trái là hồ có rồng (cha xuống biển), nửa phải là núi có chim tiên (mẹ lên núi). Camera nhìn từ góc dưới bên phải, nên núi cao đứng sau bên phải, nửa trước bên phải chỉ có hoa cỏ thấp.

```
B B ~ ~ . H H H H H H . M M M M
B B ~ ~ . H H H H H H . M M M M
~ R R ~ . H H H H H H . M P P M
~ R R ~ . H H H H H H . M P P M
~ R R ~ . N N N N N N . M M M M
~ R R ~ . N N N N N N . . M M M
~ R R ~ Q Q . . . . A A . . M M
S S ~ ~ Q Q . . . . A A . . h h
S S ~ . . . . L L . . . . h h h
~ ~ ~ . . . . . . . . . . h h .
~ ~ . . . . . O O . . . . . . .
. . . . . . . O O . . . . . . .
. F . . . . . , , . . . . . F .
D D . . . 7 . , , . 7 . . . D D
D D . . . 7 . , , . 7 . . . D D
. . . . . . . , , . . . . . . .
```

- `H` đền chính: mười cột son trên chân đá, vách gỗ dải hoa văn, cửa giữa có mặt trống đồng trên trán, hai ô cửa sổ song gỗ, xà son; mái cong hai tầng lợp ngói viền đồng vàng, tầng trên trên gác lửng có hàng ô cửa, chim Lạc đồng hai đầu nóc.
- `N` thềm: nền đá hai bậc phủ cả `H` và `N`, ba bậc đá lên giữa thềm, hai lan can đá có đầu rồng xanh ở chân.
- `Q` tượng Lạc Long Quân trên bệ đá hai bậc, bên hồ: mũ đồng vành vàng có hai sừng rồng và chùm lông chim, áo dài xanh biển, giáp vảy rồng xanh lục, hộ tâm mặt trống đồng, áo choàng xanh rêu viền bọt sóng, râu đen, gươm đồng dựng trước vai (`bakeLacLongQuan` ở `heroes.ts`).
- `A` tượng Âu Cơ trên bệ đá hai bậc, bên núi: áo hồng phấn, váy dài trắng ngà, áo choàng lông chim trắng, tóc dài búi cài trâm, mũ lông chim hai tầng trắng hồng vành vàng, hai tay chắp trước ngực (`bakeAuCo`). Hai tượng hơi chếch vào lối giữa.
- `L` lư hương đồng ba chân trên trụ đá trước thềm.
- `O` bọc trăm trứng: bệ đá tròn, chậu đá hoa sen hai vòng cánh, trứng trắng ngà chất bốn tầng thành ụ.
- `,` lối vào; sân lát đá hai màu từ thềm tới hết bọc trứng, ngang từ bệ tượng này sang bệ tượng kia; lối đá từ sân ra cổng.
- `7` cổng hai cột chim Lạc như cổng Hồ Kim Quy.
- `~` mặt hồ, bờ kè đá theo ô con `~ R S` (`lakeOutline` của Hồ Kim Quy, chọn ký tự mặt hồ); `S` đám sen.
- `R` rồng xanh: mình uốn ba khúc nhô khỏi mặt nước, thuôn dần ra đuôi vút lên ở sau, bụng vàng nhạt, vây đỏ trên sống lưng, hai chân trước vuốt vàng; đầu ngẩng nhìn ra trước, sừng vàng, bờm đỏ, râu dài, ngọc sáng trước miệng; vòng gợn sóng chỗ mình rồng chạm nước.
- `M` ba ngọn núi đá đa diện, sườn rừng xanh, cây thông nhỏ trên sườn trước, mây trắng từng cụm vờn quanh; `P` ngọn cao nhất, chim tiên trắng dang cánh đậu trên đỉnh (mỏ dài vàng, mào đỏ, đầu cánh và lông đuôi giữa vàng).
- `h` chân núi: khóm hoa dại hồng, trắng, vàng trên bụi lá thấp, đá núi lăn xuống.
- `D` trống đồng trên giá gỗ thấp; `F` cờ xanh nước (trái, bên hồ), cờ vàng núi (phải, bên núi).
- `B` bụi tre góc sau bên trái.
- Thầy cúng (Lạc hầu) đứng khấn bên trái lư hương, quay vào đền; chỗ thứ hai là người dâng lễ bên bọc trứng.
- Đã vẽ (`src/render/congTrinh/denRongTien.ts`).

## Sân trống đồng: 3×3 (đồ trang trí, đã vẽ)

Bản vẽ đi kèm mục đồ trang trí trong `docs/thiet-ke.md`. Một cấp, không có người đứng.

```
C . . . . C
. . B B . .
. B T T B .
. B T T B .
L . d B . L
. . , , . .
```

- `T` trống đồng lớn dáng Đông Sơn: chân loe, lưng thắt, tang phình, mặt rộng chìa ra, bốn đôi quai, bốn tượng cóc đồng trên mặt trống.
- `B` bệ đá tròn hai bậc, mặt bệ dát dải hoa văn quanh chân trống; ngoài bệ là sân lát đá tròn có viền đá, ngoài sân là cỏ.
- `d` giá dùi trống trên bệ: hai cọc gỗ gác đôi dùi đầu bọc vải đỏ.
- `C` hai cột chim Lạc góc sau: chân đá, cột gỗ đai đồng, dải hoa văn son, chim Lạc dang cánh.
- `L` hai bát lửa đồng ba chân hai bên lối.
- `,` bậc đá lên bệ ở mặt trước.
- Đã vẽ (`src/render/congTrinh/sanTrong.ts`).

## Đồn đảo: 8×8 (Điện 10, đã vẽ)

Bản vẽ đi kèm mục **Kế hoạch: Điện 10 điều quân ra đóng đảo** trong `docs/thiet-ke.md`. Đồn đứng trên đảo chính Hoàng Sa, Trường Sa (ngoài lưới kinh đô, không vào `state.buildings`), trên khoảnh 8 × 8 ô đã san bằng (`donDaoGoc`). Cổng (mặt trước) quay về phía thuyền từ đất liền tới (`donDaoHuong`); cả hai đồn đều quay cổng về phía bắc, nên camera mặc định nhìn từ sau bên trái của bản vẽ: phần cao đứng phía trước (lầu canh, chòi lửa hiệu, cột cờ), phần thấp phía sau (giếng, miếu, kho). Ba cấp; mái cấp 1 tranh, cấp 2 tranh viền đỏ, cấp 3 ngói viền đồng vàng.

```
# # # # # # # # # # # # # # # #
# g g . . . . . . . . . M M M #
# g g . . . . . . . . . M M M #
# . . . . . . . . . . . M M M #
# K K . . . . . . . . . . . . #
# K K . H H H H H H H H . . . #
# K K . H H H H H H H H . . . #
# . . . H H H H H H H H . . . #
# . . . H H H H H H H H . . . #
# . b . . . . . . . . . . . . #
# . b . . . . , , . . F F . . #
# . . . . . . , , . . F F . . #
# T T . . . . , , . . . . L L #
# T T . . . . , , . . . . L L #
# . . . . . . , , . . . . . . #
# # # # # # # C C # # # # # # #
```

- Sân cát san hô trắng ngà; `,` lối cát nện từ cổng vào.
- `#` cấp 1 rào cọc vót nhọn (như doanh trại); cấp 2 thêm kè đá san hô thấp ôm chân rào; cấp 3 tường đá san hô: chân kè đá sẫm, khối đá xếp so le có mạch, đá mũ và lỗ châu mai trên đỉnh.
- `C` cấp 1, 2 cổng tre; cấp 3 lầu cổng mái ngói. Hai đuốc cột tre hai bên cổng.
- `H` cấp 1, nhà sàn lính mái thuyền dài, thang gỗ lên sàn, giá giáo dựa vách.
- `K` cấp 1, góc kho: chum nước mưa có nắp (đảo xa không có suối), đống củi, dừa khô.
- `F` cấp 1, cột cờ: chân kè đá san hô, cờ đỏ viền vàng.
- `T` lửa hiệu: cấp 1 bếp đá kê đống củi chụm; từ cấp 2 chòi lửa hiệu bốn chân tre cao, sàn ván, chậu đồng đầy củi, thang tre. Đồn giữ biển lúc thủy quân Hán sắp tới (lửa hiệu báo sớm) thì lửa bùng, khói đen bốc cao.
- `g` cấp 2, giếng: thành đá san hô tròn, cần vọt tre có đá đối trọng, gàu.
- `L` cấp 3, lầu canh: bốn cột chân kê đá, giằng chéo, sàn cao lan can đỏ, mái chóp, trống đồng nhỏ treo trên sàn, thang gỗ lên từ trong sân.
- `b` cấp 3, bia đá trên lưng rùa đá, đầu bia tròn, mặt bia khắc hàng chữ.
- `M` cấp 3, miếu thờ cá Ông: nền đá san hô hai bậc, gian miếu cửa son, vòm xương sườn cá voi trước cửa, bát hương đồng.
- Cầu ván (cấp 1, ngoài móng): chạy thẳng từ cổng ra bến ván (`daoBen`), phẳng ngang sân tới hết đất bậc 2 rồi dốc dần xuống gần mặt nước; cọc hai bên chôn xuống đất hay xuống nước, lan can dây; đầu cầu nới rộng, cột neo bọc đồng, đuốc. Ô dưới cầu không có cây đá (`inDaoLoi`).
- Lính gác (giáo binh, cung thủ cầm đúng bậc binh khí đã rèn): cứ năm chỗ quân đang đóng một người, tối đa sáu (`donGac`): hai người trong cổng, một bên cột cờ, một bên lửa hiệu, một trên sàn lầu canh (cấp 3; cấp dưới đứng chỗ lầu canh), một trước nhà sàn.
- Ban đêm đuốc, lửa hiệu có quầng sáng (`syncDuoc`). Đồn hư bốc khói thêm ở PR 3.
- Đã vẽ (`src/render/congTrinh/donDao.ts`).

## Cấp 9, 10 (chủ dự án đã duyệt, đã vẽ)

Móng đã kín ở cấp 8, nên cấp 9, 10 không thêm ô con mới: mỗi loại đổi một phần sẵn có, đứng trong khối chữ của phần ấy. Mái theo cấp ghi ở mục Phong cách trong `docs/thiet-ke.md` (cấp 9 dải đồng hoa văn dưới diềm, cấp 10 chim Lạc hai đầu nóc).

| Công trình | Phần | Cấp 9 | Cấp 10 |
|---|---|---|---|
| Điện | `H`, `G`, `V` | `H`: tầng gác giữa vách và mái, cột cái sơn đỏ in hoa văn; `V`: mặt bậc bệ ngai chạm hoa văn | `G`: cổng thành hai trụ đất nện, vòm cửa, lầu cổng hai tầng mái; `H`: trống đồng trên nóc to gấp rưỡi, bốn tượng cóc đồng |
| Ruộng lúa | (giản lược) | chỉ mái chòi canh đổi theo cấp | chim Lạc trên chóp chòi |
| Bến chợ thuyền | `G` (giản lược) | cầu tàu lát đá trên trụ đá, cột neo đồng | thuyền buôn thứ hai thành thuyền buôn lớn hai buồm |
| Nhà sàn | (giản lược) | không thêm phần | chim Lạc hai đầu nóc |
| Bãi đất đá | (giản lược) | không thêm phần | chim Lạc trên lán |
| Lò rèn | (giản lược) | không thêm phần | chim Lạc hai góc diềm lán |
| Kho thóc | `V` | `V`: vựa chính mái hai tầng | chim Lạc trên tầng mái trên |
| Xưởng mộc | (giản lược) | không thêm phần | chim Lạc hai đầu nóc lán |
| Làng chài | `V` (giản lược) | giàn vó lớn: cần dài, lưới rộng, cột chống đôi, đá đối trọng | thêm thuyền đánh cá có buồm cói ngoài xa |
| Nhà thợ hồ | `L` | `L`: tường gạch nung đỏ | chim Lạc hai đầu nóc |

Chòi canh (móng 1×1, không có bản vẽ): cấp 9 ụ đá ốp bốn góc chân lầu; cấp 10 tầng giữa có mái hiên và hai nỏ lớn nữa.
