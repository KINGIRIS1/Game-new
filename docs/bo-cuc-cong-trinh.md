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
. . . t . t . . V V V V . . t . t . . .
. . . . . . . . V V V V . . . . . . . .
. . . t . t . . m , , . . . t . t . . .
. . . . . . . . . , , . . . . . . . . .
. D . t . t . . . , , . . . t . t . D .
. . . . . . . . . , , . . . . . . . . .
. L L . . t . . . , , . . . t . . L L .
. L L . e . . . l , , l . . . . . L L .
. . . . . . . G G G G G G . . . . . . .
```

- `7`, `H`, `c`, `C`, `N`, `T`, `d`: khối cung điện (cột chim Lạc, nhà chính, hai chái, nền, thềm, đôi đỉnh đồng), vẽ theo bản 5×5 ở dưới, phóng 1,5 lần; chỗ chữ trên đây chỉ là chỗ chừng của khối sau khi phóng.
- `V` cấp 1, bệ ngai: Vua Hùng ngồi ngai vàng ở mọi cấp. Cấp 1–3 ụ đất trải chiếu; cấp 4 bệ đá ba bậc, thảm đỏ; cấp 6 mép bậc viền vàng; cấp 9 mặt bậc chạm hoa văn. Ngai cấp 3 có lọng (cấp 6 lọng vàng), cấp 5 đôi quạt lông chim, cấp 7 chim Lạc trên tựa ngai.
- `t` cấp 1, 14 chỗ tướng đứng chầu, hai cột mỗi bên (cột trong cách lối giữa 2,25 ô, cột ngoài 3,25 ô). Lạc tướng, Gióng hai bên ngai; Sơn Tinh, An Dương Vương hàng hai, Hai Bà Trưng cột ngoài hàng hai; Cao Lỗ hàng ba bên phải; còn lại để dành cho các chương sau. Tướng đứng trong sân không cưỡi thú.
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

Bốn thửa vuông chia bằng bờ chữ thập. Cấp 1 mới khai hai thửa sau, hai thửa trước còn là đất cày ngập nước. Chòi, trâu, guồng, miếu đứng ở bốn góc; ao cò ở chỗ bốn thửa gặp nhau.

```
C C a a b b M M
C C a a b b M M
a a a a b b b b
a a a O O b b b
c c c O O d d d
c c c c d d d d
G G c c d d S S
G G c c , , T T
```

- `a` cấp 1, thửa sau bên trái.
- `b` cấp 1, thửa sau bên phải.
- `,` cấp 1, lối xuống ruộng: dốc đất cắt qua bờ trước, hai bậc xuống nước.
- `c` cấp 2, thửa trước bên trái.
- `d` cấp 2, thửa trước bên phải.
- `T` cấp 3, trâu đứng nghỉ trên bờ góc trước.
- `C` cấp 4, chòi canh ruộng trên gò, sàn có lan can tre, mái nón (cấp 6: chòi cao có thang tre).
- `S` cấp 5, bó lúa đã gặt và đụn rơm.
- `G` cấp 6, guồng nước tre quay trên mương, máng tre từ đỉnh guồng dẫn nước vào thửa trước bên trái.
- `M` cấp 7, miếu thần lúa trên nền đá, lư hương, chim đồng trên nóc.
- `O` cấp 8, ao nước trong bờ đá, lá sen, đàn cò; ống tre nối từ máng guồng đổ vào ao.
- Bờ đất quanh móng và bờ chữ thập giữa bốn thửa; cấp 6 bờ ngoài kè đá xám. Cấp 8 bờ chữ thập chừa giữa cho ao.
- Góc nào chưa tới cấp có phần thì vẫn cấy lúa; tới cấp thì góc ấy đắp gò dựng phần. Cấp 1–2 cấy thưa (3×3 khóm mỗi thửa), từ cấp 3 cấy dày (4×4); lúa cao và chín vàng dần theo cấp.
- Năm nông dân đứng giữa các khóm lúa, rải đủ bốn thửa; cấp 1 người thứ hai cày thửa trước.
- Đã đổi khi vẽ: `T` và `S` đổi hàng cho nhau, trâu thấp ra mép trước, bó lúa và đụn rơm cao lùi sau một hàng, để đụn rơm không che trâu.

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

Ba dải từ bờ ra sông: hàng sau là kho, hàng giữa là chợ hai dãy sạp có lối giữa, hàng trước là sàn bến dọc mép nước. Lối chợ chạy thẳng ra cầu tàu. Mặt trước quay ra sông.

```
K K K . W W
K K K . W W
S S , , s s
S S , , s s
F . , , . F
= = G G = =
```

- `S` cấp 1, sạp chợ bạt đỏ.
- `,` cấp 1, lối chợ lát ván ra cầu tàu.
- `=` cấp 1, sàn bến gỗ dọc mép sông, cọc cắm xuống nước.
- `G` cấp 1, đầu cầu tàu chìa ra sông (cấp 3: cầu tàu dài, có nhánh phụ chìa sang trái ở đầu cầu; cấp 6: cổng bến có mái, cờ đuôi nheo).
- `s` cấp 2, sạp chợ bạt chàm (cấp 7: lầu chợ hai tầng mái hình thuyền, chim đồng hai đầu nóc).
- `K` cấp 4, nhà kho ven sông trên cột thấp. Cấp 1–3 chỗ này là đống hàng chờ xuống thuyền (chum, bao, hòm).
- `F` cấp 5, cờ hai cột.
- `W` cấp 8, kho hàng mái cong, chim đồng hai đầu nóc.
- Thuyền đậu dọc cầu tàu, phía bên phải cho camera thấy rõ: thuyền nhỏ sát cầu tàu (cấp 1); cấp 6 thuyền buôn lớn ghé sát cầu tàu, thuyền nhỏ dời ra ngoài; cấp 8 thuyền buôn thứ hai neo bên trái, ngoài nhánh phụ (thay cho neo giữa sông: sông chỉ rộng 3 ô, neo giữa sông thì chạm các thuyền khác).
- Bốn người buôn: qua lại giữa hai dãy sạp, ở chân cầu tàu, sau chợ cạnh nhà kho, trước sạp đỏ.

### Nhà sàn: 2×2 → 3×3

Một nếp nhà có vườn: nhà chính lùi về góc sau bên trái, to hơn dáng cũ chừng 30%; nhà phụ bên phải, sân trước có hiên và chum nước, vườn rau góc trước bên trái.

```
H H H H Q Q
H H H H h h
H H H H h h
. E E . k k
V V . . g J
V V , , P P
```

- `H` cấp 1, nhà chính mái tròn hình mai rùa (cấp 7: nhà mái thuyền nối cầu tre sang nhà phụ; cấp 8: nhà sàn dài mái thuyền vút hai đầu, chim đồng).
- `,` cấp 1, lối vào sân.
- `E` cấp 2, hiên trước, thang tre.
- `J` cấp 2, chum nước.
- `h` cấp 3, nhà phụ mái tròn.
- `V` cấp 4, vườn rau rào tre.
- `k` cấp 5, nhà nhỏ thứ ba, chim đồng trên nóc.
- `Q` cấp 6, cây cau cao, buồng cau.
- `g` cấp 6, chuồng gà tre, hai con gà ra sân.
- `P` cấp 6, sàn phơi lúa.

### Bãi đất đá: 2×2 → 3×3

Mỏ đá bên gò: hố đá đào sâu ở góc sau, giữa là bãi xẻ đá, đường xe đá chạy ra mặt trước.

```
P P P P T T
P P P P T T
P P P P q q
r r . . X X
K K . . V V
K K , , V V
```

- `P` cấp 1, hố đá lộ thiên khoét vào gò: bậc đá chữ L ôm góc sau bên trái, đỉnh gò có đá tảng và cỏ, đáy hố đất (cấp 4: hố sâu ba bậc, mép hố cao, đáy sẫm, có bậc gỗ xuống; cấp 6–8: bậc đá cao dần).
- `r` cấp 1, tảng đá vỡ, nhiều dần theo cấp; từ cấp 3 có thêm đá rơi dưới đáy hố.
- `,` cấp 1, đường xe đá có hai vệt bánh xe.
- `X` cấp 2, hai chồng đá xẻ vuông (cấp 6: cao thêm một khối mỗi cấp).
- `T` cấp 3, tời gỗ chữ A: hai chân bên phải hố chụm đỉnh trên hố, tời quay tay (cấp 6: tời lớn, cột cái, cần với ra trên hố, lán mái theo cấp che bánh xe tời).
- `V` cấp 5, xe gỗ chở đá xẻ (cấp 8: trâu đứng cạnh xe, dây buộc vào càng).
- `K` cấp 7, lò nung gạch vòm có hoa văn, miệng lò đỏ lửa, ống khói bốc khói, chồng gạch bên cạnh (cấp 8: chồng gạch cao gấp đôi).
- `q` cấp 8, giàn cần vọt, đá đối trọng, thúng đá thả xuống hố.
- Năm thợ đá: hai người dưới đáy hố, một bên đá vỡ, một cạnh chồng đá xẻ, một giữa bãi.
- Đã đổi khi vẽ: lò nung gạch `K` cần cả một ô nên chiếm hai hàng góc trước bên trái; đá vỡ `r` và chồng đá `X` còn một hàng; xe đá `V` hai hàng để trâu đứng cạnh xe.

### Lò rèn: 2×2 → 3×3

Lò nón lớn ở góc sau bên trái cho khói bốc cao, lán đe phía sau, sân làm việc ở giữa; lò thứ hai và bễ bên trái, giá binh khí bên phải, đống than quặng và sân đúc đồng ra phía trước.

```
N N N W W W
N N N W W W
N N N . A .
7 7 B . . R
7 7 B . . R
q q , , 8 8
```

- `N` cấp 1, lò nung hình nón to hơn dáng cũ chừng 15%, chân lò có hoa văn, miệng lò quay chéo ra góc trước bên phải (cấp 6–8: lò cao dần, đai đất quấn thân, khói đen từ ống lò).
- `W` cấp 1, lán đe mái một dốc, cao ở trước, máng nước tôi sắt, giá treo kìm búa (cấp 4: lán dài sang phải, bàn gỗ; cấp 6: lán cao, giá treo binh khí sắt thay giá kìm búa).
- `A` cấp 1, đe sắt trên gốc gỗ, thanh sắt nung đỏ.
- `,` cấp 1, lối vào lát ba phiến đá.
- `B` cấp 2, bễ da, vòi thổi vào miệng lò lớn (cấp 6: ống bễ đôi bọc da).
- `q` cấp 2, đống than và quặng sắt (mới; cấp 4 thêm thúng than, cấp 6 đống to hơn).
- `7` cấp 3, lò nhỏ thứ hai (cấp 7: lò luyện cao đai sắt, lửa đỏ rực, máng sắt nóng chảy).
- `R` cấp 5, giá giáo, rìu đồng dựng nghiêng tựa xà, quay ra sân.
- `8` cấp 8, sân đúc đồng: khuôn trống, nồi đồng rót, trống vừa đúc trên giá.
- Bốn thợ rèn: quai búa bên đe dưới mép lán, kéo bễ, xúc than, giữa sân.
- Đã đổi khi vẽ: lò nón cần ô rưỡi nên `N` rộng 3×3 ô con, lán `W` còn ba ô con; lò thứ hai `7` sang bên trái vì lò luyện cao cấp 7 đứng giữa bên phải sẽ che đe và người; bễ `B` đứng giữa hai lò, sát miệng lò lớn; giá binh khí `R` sang bên phải.

### Kho thóc: 2×2 → 3×3

Vựa chính ở góc sau bên trái, vựa phụ và cót quây ba phía quanh một sân phơi thóc ở trước bên phải.

```
V V V 4 4 4
V V V 4 4 4
V V V . . .
. T . s s s
6 6 . s s s
6 6 , s s s
```

- `V` cấp 1, vựa tròn trên cột, mái nón, đứng trên nền đất đắp kè đá (cấp 5: vựa to, chóp đồng).
- `,` cấp 1, lối vào ba phiến đá kê.
- `T` cấp 2, thang tre dựa sàn vựa, thúng thóc (cấp 3: thêm thúng).
- `s` cấp 3, sân phơi thóc: thóc trải, luống cào, cào gỗ, đống thóc, nia (mới; cấp 7: lát gạch).
- `4` cấp 4, vựa phụ (cấp 8: kho sàn dài mái cong, chim đồng).
- `6` cấp 6, cót thóc lớn trên vòng đá (cấp 7: cót cao, thêm đai tre).
- Người giữ kho đi qua lại trên dải sân giữa vựa phụ và sân phơi.

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

Khóm lá dong lớn góc sau bên trái, hai luống đậu dài chạy ngang, lều nong đậu góc sau bên phải.

```
D D . L L L
D D . L L L
d d d d d d
. . . . . .
e e e e e e
J . , , . .
```

- `D` cấp 1, khóm lá dong lá to bản (cấp 2: khóm to hơn).
- `d` cấp 1, luống đậu xanh (cấp 2: giàn tre cho đậu leo).
- `e` cấp 1, luống đậu thứ hai (cấp 2: giàn tre cho đậu leo).
- `,` cấp 1, lối vào.
- `J` cấp 2, chum nước tưới.
- `L` cấp 3, lều nhỏ, nong đậu phơi.
- Cấp 3: rào tre quanh vườn.

### Chuồng lợn: 2×2 → 3×3

Chuồng ở góc sau bên trái, sân rào rộng cho lợn mẹ và đàn lợn con chạy, máng gỗ bên phải, vũng bùn góc trước.

```
C C C C . .
C C C C . .
. . . . m m
. . . . . .
b b b . . .
b b b , , .
```

- `C` cấp 1, ổ rơm (cấp 2: chuồng mái tranh; cấp 3: chuồng sàn gỗ).
- `m` cấp 1, máng gỗ.
- `,` cấp 1, cổng chuồng.
- `b` cấp 3, vũng bùn.
- Rào tre thấp quanh sân từ cấp 1. Hai lợn ỉ (cấp 1), thêm đàn lợn con (cấp 2), bốn lợn lớn (cấp 3).

### Bếp gói bánh: 2×2 → 3×3

Gian bếp mái cao phía sau, nồi bánh đặt ngay dưới mép trước mái cho dễ thấy, chiếu gói bánh trải rộng phía trước, cối giã bánh giầy bên phải.

```
M M M M l l
M K K M l l
M K K M . .
. . . . G G
c c c c . .
c c c c , ,
```

- `l` cấp 1, chồng lá dong.
- `K` cấp 1, kiềng ba hòn, nồi đồng luộc bánh, lửa củi (cấp 3: nồi thứ hai, khói bếp).
- `,` cấp 1, lối vào.
- `M` cấp 2, mái tranh che bếp dựng cao.
- `c` cấp 1, chiếu gói bánh nhỏ (cấp 2: chiếu rộng thêm, chõng tre có khuôn ở đầu chiếu). Khi vẽ thật đưa chiếu xuống cấp 1, vì bếp cấp 1 đã gói bánh.
- `G` cấp 3, cối đá, chày gỗ giã bánh giầy.
- Ngày Tết thêm người ngồi gói bánh trên chiếu, nay nằm trong móng.

## Công trình mới (chủ dự án đã duyệt, đã vẽ xưởng mộc, làng chài, nhà thợ hồ)

Bản vẽ đi kèm mục **Kế hoạch: cổng thành, xưởng mộc, làng chài** trong `docs/thiet-ke.md`. Cổng thành móng 1×1 nên không có ở đây. Cách đọc như trên; hai công trình này chưa có dáng cũ nên không có chữ **mới**.

### Xưởng mộc: 3×3

Lán thợ mộc góc sau bên trái, khung nhà dựng dở và đống gỗ tròn phía sau; giữa là chỗ cưa xẻ và đẽo thuyền; lối vào giữa mặt trước, hai bên là lán thứ hai và giá phơi ván.

```
L L L K K G
L L L K K G
X X , T T T
X X , T T T
S S , , P P
S S , , B B
```

- `L` cấp 1, lán thợ mộc mái một dốc, bàn gỗ, giá treo cưa, rìu, đục (cấp 6: cột hiên chạm hoa văn trống đồng).
- `G` cấp 1, đống gỗ tròn xếp dọc, cao thêm theo cấp.
- `X` cấp 1, giá cưa xẻ: cây gỗ gác chéo trên giá cao, lưỡi cưa dọc thân.
- `,` cấp 1, lối đất vào sân, mùn cưa vương hai bên.
- `T` cấp 2, thuyền độc mộc đang đẽo trên hai mễ gỗ, phoi gỗ dưới chân (cấp 8: thuyền lớn mũi cong trên giàn đà).
- `K` cấp 3, khung nhà sàn dựng dở: bốn cột, xà, kèo, chưa lợp mái.
- `P` cấp 4, giá phơi ván dựng nghiêng.
- `B` cấp 5, trâu kéo một cây gỗ vào sân.
- `S` cấp 7, lán thứ hai bày sập gỗ chạm, hòm gỗ.
- Bốn người làm: một thợ xẻ dưới giá cưa, một thợ xẻ đứng trên cây gỗ (hai người kéo cưa), một thợ mộc đẽo thuyền, một thợ mộc đẽo cột trước khung nhà.
- Đã vẽ (`src/render/congTrinh/xuongMoc.ts`). Đã đổi khi vẽ:
  - giá cưa `X`: cây gỗ gác dọc (từ sau ra trước) trên hai giá chữ A cao, tấm ván trên cây gỗ cho thợ xẻ đứng, lưỡi cưa sắt mài sáng đứng xuyên thân gỗ có tay cưa trên và dưới; thợ xẻ dưới đứng lệch sang trái, quay nghiêng cho thấy mặt;
  - thợ mộc đẽo thuyền đứng sau thuyền, quay mặt ra trước; người thứ tư đẽo một cây cột nằm trước khung nhà `K` (thay cho người vác ván, để mỗi người làm một việc tại chỗ);
  - lối `,` vẽ thành hai khối liền (dải giữa và mặt trước rộng gấp đôi) cho khỏi kẻ ô.

### Làng chài: 3×3

Mặt trước quay ra sông như bến. Lều chài góc sau bên trái, giàn phơi cá bên phải; lối giữa chạy ra bờ ván dọc mép nước; vó bè ở góc trước bên phải chìa cần ra sông.

```
N N N . Q Q
N N N . P P
G G , , P P
G G , , M F
L L , , V V
= = = = V V
```

- `N` cấp 1, lều chài mái tranh thấp, lưới treo dưới hiên (cấp 4: nhà sàn ngư dân mái thuyền, cột cao).
- `P` cấp 1, giàn phơi cá: sào tre, cá xâu treo thành hàng, nong cá dưới chân.
- `,` cấp 1, lối đất ra bờ.
- `=` cấp 1, bờ ván dọc mép sông, cọc cắm xuống nước.
- `V` cấp 2, vó bè: khung tre, cần vó chìa ra sông, lưới vó vuông.
- `L` cấp 3, giá phơi lưới.
- `M` cấp 5, chum mắm.
- `F` cấp 5, cờ đuôi nheo.
- `G` cấp 7, sạp chợ cá bày thúng cá, mái theo cấp.
- `Q` cấp 8, miếu thần sông nhỏ, bát hương, cây phướn.
- Thuyền ngoài móng, trên sông trước bờ ván:
  - thuyền nan có người quăng chài (cấp 1);
  - thuyền đánh cá thứ hai (cấp 3);
  - hàng đáy: một dãy cọc tre có lưới đáy chắn dòng (cấp 6);
  - thuyền lưới lớn có buồm neo ngoài cùng (cấp 8).
  - Thuyền bơi chậm quanh chỗ neo sát bờ, không ra tới luồng thuyền qua lại, không chạm bờ bên kia.
- Ba ngư dân: một người quăng chài ở đầu cầu ván, một người kéo vó trên bè vó, một người xếp cá lên giàn phơi.
- Đã vẽ (`src/render/congTrinh/langChai.ts`). Đã đổi khi vẽ:
  - thêm cầu ván ngắn chìa ra nước từ bờ ván `=`, chỗ ngư dân đứng quăng chài (thay cho người vá lưới trên bờ ván) và thuyền ghé;
  - vó `V` có bè tre ngồi kéo vó sát bờ, cần vó tre bắc qua cột chống chìa ra sông, khung vó bắt chéo, bốn dây xuống bốn góc lưới;
  - thuyền đánh cá bơi chậm một vòng quanh chỗ neo trước bờ ván, người lái đò chèo (không đứng quăng chài trên thuyền);
  - thuyền lưới lớn có buồm (cấp 8) dùng dáng thuyền buôn thu nhỏ.

### Bến thuyền khơi: 3×3

Đi kèm mục **Kế hoạch: biển Đông, bến thuyền khơi** trong `docs/thiet-ke.md`. Mặt trước quay ra sông như bến, làng chài. Kho hải sản góc sau bên trái, giàn phơi lưới vây bên trái, đụn vỏ ốc bên phải; lối giữa ra cầu tàu dọc mép nước, cầu ván chìa ra chỗ thuyền khơi neo. Ba cấp mở theo Điện 8, 9, 10 nên mái theo cấp Điện ấy.

```
K K K . Q Q
K K K . Q Q
L L , , O O
L L , , O O
D D , , M T
= = = = = =
```

- `K` cấp 1, kho hải sản: nhà sàn cao mái theo cấp, cá khô xâu treo dưới sàn, thang tre, thúng cá chân cột.
- `L` cấp 1, giàn phơi lưới vây: hai cột cao, tấm lưới buông có hàng phao, cuộn chão (cấp 2: tấm lưới thứ hai có chì đá).
- `O` cấp 1, đụn vỏ ốc biển kem, hồng trong nong lớn (cấp 2: thúng ốc; cấp 3: đụn thứ hai cao hơn).
- `,` cấp 1, lối đất ra cầu tàu.
- `M` cấp 1, chum mắm cá biển.
- `T` cấp 1, tời gỗ kéo thuyền, chão chạy ra mép nước.
- `=` cấp 1, cầu tàu ván trên cọc dọc mép sông; cầu ván chìa ra sông tới mạn thuyền khơi, cột neo bọc đồng; cờ đuôi nheo ở đầu cầu (chàm ở cấp 1, đỏ từ cấp 2).
- `D` cấp 1, đá neo thuyền và thúng cá; cấp 2: chòi lửa hiệu bốn chân tre, chậu đồng có lửa.
- `Q` cấp 1, 2: cột buồm dự phòng gác trên mễ, cuộn chão; cấp 3: miếu thờ cá Ông, nền đá, vòm xương sườn cá voi trước cửa, bát hương đồng.
- Thuyền khơi không thuộc mô hình móng: neo dọc cầu tàu, cách mép móng một ô (`benDock` ở `game/bien.ts`), rồi ra biển (World dựng, `makeThuyenKhoi`).
- Năm người làm: ngư dân vá lưới trước giàn `L`, người gánh cá đi dọc cầu tàu, người giữ kho trước `K`, ngư dân ở đầu cầu ván, người nhặt ốc bên `O`.
- Đã vẽ (`src/render/congTrinh/benKhoi.ts`).

### Nhà thợ hồ: 3×3

Đi kèm mục **Thời gian xây, tốp thợ** trong `docs/thiet-ke.md`: mỗi nhà một tốp thợ. Lán thợ góc sau bên trái, chồng gạch mộc và đống đất sét phía sau; sân đóng gạch giữa bên phải, hố nhào đất bên trái; phía trước là đoạn tường đất nện trong khuôn ván, cọc dây căng mốc và lò nung ngói; lối giữa mặt trước.

```
L L L G G D
L L L G G D
S S , N N N
S S , N N N
K K , , C C
K K , , T T
```

- `L` cấp 1, lán thợ mái theo cấp, vách phên treo vồ nện, bay, thước tre; bàn kê tấm ván vẽ mốc nhà và gạch mẫu (cấp 6: cột hiên quấn đai đồng; cấp 10: chim Lạc trên đầu hai cột trước).
- `G` cấp 1, chồng gạch mộc xếp so le, tấm ván che trên; cao thêm một lớp mỗi cấp tới sáu lớp (cấp 9: hai lớp trên là gạch nung đỏ).
- `D` cấp 1, đống đất sét, thuổng cắm, sọt đất.
- `N` cấp 1, sân đóng gạch: khuôn gỗ hai ngăn, cục đất nhào, hàng gạch mộc phơi trên sân, thêm một hàng mỗi cấp tới năm hàng.
- `C` cấp 1, cọc tre buộc vải đỏ căng dây mốc góc vuông, giá ba chân treo quả dọi.
- `,` cấp 1, lối đất vào sân.
- `S` cấp 2, hố nhào đất: bờ đất vuông, lòng đất sét lẫn nước và rơm, chum nước.
- `K` cấp 3, đầm nện: đoạn tường đất nện dựng dở giữa hai tấm ván khuôn kẹp cọc, chày nện, sọt đất; tường cao thêm theo cấp tới cấp 8.
- `T` cấp 5, lò nung ngói vòm đất, miệng lò đỏ lửa, ống khói, chồng ngói nung, củi.
- Người làm: thợ đóng gạch ở sân, thợ cả dưới lán; cấp 2 thêm người giẫm đất trong hố nhào, cấp 3 thêm thợ nện tường.
- Đã vẽ (`src/render/congTrinh/thoHo.ts`).

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

## Cấp 9, 10 (chủ dự án đã duyệt, đã vẽ)

Móng đã kín ở cấp 8, nên cấp 9, 10 không thêm ô con mới: mỗi loại đổi một phần sẵn có, đứng trong khối chữ của phần ấy. Mái theo cấp ghi ở mục Phong cách trong `docs/thiet-ke.md` (cấp 9 dải đồng hoa văn dưới diềm, cấp 10 chim Lạc hai đầu nóc).

| Công trình | Phần | Cấp 9 | Cấp 10 |
|---|---|---|---|
| Điện | `H`, `G`, `V` | `H`: tầng gác giữa vách và mái, cột cái sơn đỏ in hoa văn; `V`: mặt bậc bệ ngai chạm hoa văn | `G`: cổng thành hai trụ đất nện, vòm cửa, lầu cổng hai tầng mái; `H`: trống đồng trên nóc to gấp rưỡi, bốn tượng cóc đồng |
| Ruộng lúa | `O`, `M` | `O`: bờ ao lát đá, cầu tre cong qua ao | `M`: miếu thành đình nhỏ hai tầng mái, cây nêu |
| Bến chợ thuyền | `G` | cầu tàu lát đá trên trụ đá, cột neo đồng | thuyền buôn thứ hai thành thuyền buôn lớn hai buồm |
| Nhà sàn | `H`, `E`, `h` | `H`: lan can sàn chạm hoa văn; `E`: cầu thang gỗ to, má thang đỏ | `h`: nếp nhà sàn thứ hai mái thuyền, hiên có mái nối hai nếp |
| Bãi đất đá | `,`, `K`, `V` | `,`: đường ray gỗ, xe goòng chở đá | `V`: trâu thứ hai cùng kéo; `K`: lò nung ngói, chồng ngói, ống khói thứ hai |
| Lò rèn | `8`, `7` | `8`: khuôn đúc trống lớn in hoa văn, trống vừa đúc to hơn | `7`: lò luyện thành tháp lò cao, vành gạch, khói đỏ |
| Kho thóc | `V`, `6` | `V`: vựa chính mái hai tầng | `6`: cót thành vựa gỗ có mái; dải sân giữa lát gạch |
| Xưởng mộc | `T`, `S` | `T`: thuyền lớn có mui cói, mái chèo hai bên | `S`: lán thứ hai thành nhà sàn chạm, chim Lạc đầu cột |
| Làng chài | `V` | giàn vó lớn: cần dài, lưới rộng, cột chống đôi, đá đối trọng | thêm thuyền đánh cá có buồm cói ngoài xa |
| Nhà thợ hồ | `G`, `L` | `G`: hai lớp trên chồng gạch là gạch nung đỏ | `L`: chim Lạc trên đầu hai cột trước lán |

Chòi canh (móng 1×1, không có bản vẽ): cấp 9 ụ đá ốp bốn góc chân lầu; cấp 10 tầng giữa có mái hiên và hai nỏ lớn nữa.
