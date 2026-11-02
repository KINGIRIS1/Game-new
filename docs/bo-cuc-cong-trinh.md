# Bố cục công trình trên móng mới (chủ dự án đã duyệt)

Bản vẽ đi kèm mục **Vẽ lại công trình trên móng** trong `docs/thiet-ke.md`. Công trình móng 1×1 giữ nguyên nên không có ở đây. Tiêu đề mỗi mục ghi móng trước khi có kinh đô lớn → móng bây giờ.

Cách đọc bản vẽ:
- Mỗi ký tự là một **ô con bằng nửa ô**: móng 3×3 vẽ thành 6×6 ký tự, 4×4 thành 8×8, 5×5 thành 10×10.
- Hàng trên là **phía sau** công trình, hàng dưới là **mặt trước**. Cột trái là bên trái khi nhìn từ trước. Camera mặc định nhìn từ góc dưới bên phải, nên phần cao đặt về góc trên bên trái.
- `.` là sân hay nền trống, `,` là lối đi. Mỗi chữ khác là một phần, ghi cấp nó xuất hiện; phần đổi dáng ở cấp sau ghi trong ngoặc.
- **mới** là phần chưa có ở dáng hiện tại, thêm vào vì móng rộng hơn.
- Người, thú, đồ vật giữ cỡ như bây giờ. Mỗi cấp vẫn thêm một phần lớn nhìn rõ; cấp thấp móng còn thưa, lên cấp thì lấp dần.
- Khi làm, bản vẽ này chép vào code như bản vẽ mẫu kinh đô ở `src/game/mau.ts`, rồi sửa ở code. Tệp này giữ bản đã duyệt; chỗ nào đổi khi vẽ thật thì sửa cả ở đây.

### Điện Vua Hùng: 4×4 → 5×5

Cung điện có sân chầu: nhà chính lùi về sau, sân chầu phía trước có lối đá thẳng từ cổng lên thềm. Lạc hầu, lính gác, cây nêu, mâm bánh và tướng đứng trong sân, không cần ô trống ngoài móng nữa.

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
- `m` cấp 1, chỗ bày mâm bánh ngày Tết.
- `,` cấp 1, lối đi giữa sân (cấp 4: lát đá).
- `l` cấp 1, chỗ Lạc hầu và lính gác đứng.
- `e` cấp 1, chỗ cây nêu và dây cờ ngày Tết.
- `a` cấp 1, chỗ tướng đứng (Sơn Tinh, An Dương Vương, cột đá thề).
- `2` cấp 2, cờ đỏ hai bên lối.
- `D` cấp 2, trống đồng trên giá (cấp 5: hai trống lớn).
- `C` cấp 3, chái nhà bên phải.
- `N` cấp 4, nền đất đắp viền đá dưới nhà (cấp 6: nền đá thứ hai, lan can đỏ; cấp 8: viền đồng).
- `T` cấp 4, thềm đá ba bậc (cấp 8: thềm rộng, viền đá sẫm).
- `G` cấp 4, cổng gỗ có mái nhỏ giữa rào, mái theo cấp (mới; cấp 8: mái ngói viền đồng, chim đồng).
- `L` cấp 6, lầu trống đồng ở hai góc trước.
- `7` cấp 7, cột chim Lạc đai đồng.
- `c` cấp 7, chái nhà bên trái, cho cân hai bên (mới).
- Cấp 1–3: bốn cọc mốc tre buộc vải đỏ ở bốn góc (mới). Cấp 4: hàng rào cột chạm đầu bọc đồng chạy quanh mép móng thay cọc mốc, chừa cổng giữa mặt trước. Nhà chính to hơn dáng cũ chừng 15%.

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

### Doanh trại: 3×3 → 4×4

Nhà dài để trống không vách chạy suốt phía sau, sân tập rộng ở giữa cho tướng đứng, chòi trống sau bên phải, đài tướng trước bên phải.

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

- `H` cấp 1, nhà dài để trống không vách, mái thẳng; sàn ván thấp, chiếu ngủ, chăn cuộn.
- `X` cấp 1, chỗ tướng đứng giữa sân tập (đất nện sẫm hơn sân).
- `g` cấp 1, giá giáo đồng chạy dọc mép trái.
- `,` cấp 1, cổng trại: hai cột, xà ngang, vải đỏ, cờ đuôi nheo.
- `2` cấp 2, đài tướng: nền đất đắp, sàn ván, chiếu cói, lan can đỏ, lọng đỏ.
- `h` cấp 4, nhà dài thứ hai quay dọc bên trái.
- `5` cấp 5, chòi trống trận có mái nhọn, thang tre.
- Đài tướng và chòi trống đổi chỗ so với bản đầu: chòi trống cao đứng trước tướng thì che tướng (camera nhìn từ trước bên phải), nên chòi lùi về sau cạnh nhà dài, đài tướng thấp ra trước.
- Cấp 3: rào cọc vót nhọn hai bên và mặt trước (phía sau đã có nhà dài), chừa cổng giữa mặt trước. Trại giáo, trại cung, chuồng voi dựng sát doanh trại dùng cùng kiểu rào.
- Hai lính gác: trong cổng bên trái, và giữa chòi trống với đài tướng; không ai đứng trước tướng.

### Trại giáo: 2×2 → 3×3

Hai lều chữ A song song phía sau, giá giáo bên phải, sân tập phía trước có hai cọc rơm.

```
A A A A g g
A A A A g g
a a a a . .
a a a a . .
. o . . o .
. . , , . .
```

- `A` lều lính mái chữ A, nóc chạy ngang, mái tranh chạm đất trước và sau; hồi trái đan phên, hồi phải để ngỏ thấy chiếu ngủ; cột tre bắt chéo hai đầu nóc. Cờ đỏ cắm sau hồi trái, bay cao trên nóc.
- `g` giá giáo, mũi đồng lớn.
- `a` lều chữ A thứ hai, thấp hơn (mới).
- `o` cọc rơm có thanh ngang làm vai, nắm rơm làm đầu; giáo binh đứng thế thủ đâm giáo vào cọc bên phải.
- `,` lối vào.
- Rào cọc vót nhọn quanh mép móng như doanh trại, chừa cổng giữa mặt trước; hai cọc cổng to buộc vải đỏ. Lều to hơn lều cũ chừng 20%.

### Trại cung: 2×2 → 3×3

Lán một mái góc sau bên phải, trường bắn chạy ngang hết móng: cung thủ đứng bên phải bắn sang hai bia ở mép trái.

```
r f . L L L
. . . L L L
B . . L L L
. . . . . c
b . . . . c
. . , , . .
```

- `L` lán một mái tựa vách phên sau, mái tranh dốc ra trước; giá cung đứng và bao tên đặt ngay dưới mép mái trước (vách sau khuất dưới mái). Cao hơn lán cũ chừng 30%, sâu gấp rưỡi, hẹp lại cho vừa khối `L`.
- `B` bia rơm tròn ở xa (mới).
- `c` chỗ cung thủ đứng bắn, khúc gỗ nằm làm vạch bắn trước mặt, bao tên bên cạnh.
- `b` bia rơm tròn ở gần. Mấy mũi tên trượt găm xuống đất quanh hai bia.
- `,` lối vào.
- `r` đống bó rơm làm bia (mới).
- `f` cờ đỏ cao (mới).
- Rào cọc vót nhọn quanh mép móng như trại giáo, chừa cổng giữa mặt trước.

### Chuồng voi: 2×2 → 3×3

Mái chóp bốn mặt trên cột gỗ lớn ở góc sau, sân voi rộng có rào gỗ, máng nước và đống cỏ phía trước.

```
M M M M m m
M M M M m m
M M M M c .
. . . . . .
w w . . y y
. . , , y y
```

- `M` mái chóp bốn mặt trên bốn cột lớn đai đồng, chóp đồng, rơm lót nền. Mái rộng hơn mái cũ chừng 35% theo bề ngang, 15% theo bề sâu, cao hơn chừng 30%; cột cao đủ cho voi có người cưỡi đứng lọt.
- `c` cọc buộc voi đai đồng, cuộn thừng quấn quanh.
- `w` máng nước gỗ kê trên hai khúc gỗ.
- `y` đống cỏ cao, nhô lên trên thanh rào.
- `,` cổng sân voi.
- `m` đống thân chuối cắt khúc cho voi ăn, đầu cắt quay ra trước (mới).
- Rào cọc vót nhọn thưa, cao hơn rào trại giáo, có hai thanh gỗ ngang, chạy quanh mép móng, chừa cổng trước; hai cọc cổng to buộc vải đỏ. Voi (có người cưỡi) đứng giữa sân, quay về đống cỏ.

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
- `c` cấp 2, chiếu gói bánh, chõng tre có khuôn.
- `G` cấp 3, cối đá, chày gỗ giã bánh giầy.
- Ngày Tết thêm người ngồi gói bánh trên chiếu, nay nằm trong móng.

## Công trình mới (chủ dự án đã duyệt)

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
- Ba ngư dân: một người vá lưới trên bờ ván, một người kéo vó, một người xếp cá lên giàn phơi.
