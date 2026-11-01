# Bố cục công trình trên móng mới (chờ duyệt)

Bản vẽ đi kèm mục **Kế hoạch: công trình to hơn, kinh đô vẽ lại** trong `docs/thiet-ke.md`. Công trình móng 1×1 giữ nguyên nên không có ở đây.

Cách đọc bản vẽ:
- Mỗi ký tự là một **ô con bằng nửa ô**: móng 3×3 vẽ thành 6×6 ký tự, 4×4 thành 8×8, 5×5 thành 10×10.
- Hàng trên là **phía sau** công trình, hàng dưới là **mặt trước**. Cột trái là bên trái khi nhìn từ trước. Camera mặc định nhìn từ góc dưới bên phải, nên phần cao đặt về góc trên bên trái.
- `.` là sân hay nền trống, `,` là lối đi. Mỗi chữ khác là một phần, ghi cấp nó xuất hiện; phần đổi dáng ở cấp sau ghi trong ngoặc.
- **mới** là phần chưa có ở dáng hiện tại, thêm vào vì móng rộng hơn.
- Người, thú, đồ vật giữ cỡ như bây giờ. Mỗi cấp vẫn thêm một phần lớn nhìn rõ; cấp thấp móng còn thưa, lên cấp thì lấp dần.
- Khi làm, bản vẽ này chép vào code như bản vẽ mẫu kinh đô ở `src/game/mau.ts`, rồi sửa ở code. Tệp này chỉ để duyệt.

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
- `G` cấp 4, cổng gỗ giữa rào (mới; cấp 8: mái ngói viền đồng).
- `L` cấp 6, lầu trống đồng ở hai góc trước.
- `7` cấp 7, cột chim Lạc đai đồng.
- `c` cấp 7, chái nhà bên trái, cho cân hai bên (mới).
- Cấp 4: hàng rào cột chạm đầu bọc đồng chạy quanh mép móng, chừa cổng giữa mặt trước.

### Ruộng lúa: 3×3 → 4×4

Bốn thửa vuông chia bằng bờ chữ thập. Cấp 1 mới khai hai thửa sau, hai thửa trước còn là đất cày ngập nước. Chòi, trâu, guồng, miếu đứng ở bốn góc; ao cò ở chỗ bốn thửa gặp nhau.

```
C C a a b b M M
C C a a b b M M
a a a a b b b b
a a a O O b b b
c c c O O d d d
c c c c d d d d
G G c c d d T T
G G c c , , S S
```

- `a` cấp 1, thửa sau bên trái.
- `b` cấp 1, thửa sau bên phải.
- `,` cấp 1, lối xuống ruộng.
- `c` cấp 2, thửa trước bên trái.
- `d` cấp 2, thửa trước bên phải.
- `T` cấp 3, trâu đứng nghỉ trên bờ.
- `C` cấp 4, chòi canh ruộng (cấp 6: chòi cao có thang tre).
- `S` cấp 5, bó lúa đã gặt.
- `G` cấp 6, guồng nước tre quay, máng dẫn nước.
- `M` cấp 7, miếu thần lúa.
- `O` cấp 8, ao nước trong có đàn cò, cống tre từ guồng đổ vào.
- Bờ đất quanh móng và bờ chữ thập giữa bốn thửa; cấp 6 bờ ngoài kè đá xám.

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
- `,` cấp 1, lối chợ ra cầu tàu.
- `=` cấp 1, sàn bến gỗ dọc mép sông.
- `G` cấp 1, đầu cầu tàu chìa ra sông (cấp 3: cầu tàu dài, có nhánh phụ; cấp 6: cổng bến có mái, cờ đuôi nheo).
- `s` cấp 2, sạp chợ bạt chàm (cấp 7: lầu chợ hai tầng mái hình thuyền).
- `K` cấp 4, nhà kho ven sông.
- `F` cấp 5, cờ hai cột.
- `W` cấp 8, kho hàng mái cong, chim đồng hai đầu nóc.
- Thuyền nhỏ đậu cạnh cầu tàu (cấp 1), thuyền buôn lớn (cấp 6), thuyền thứ hai neo giữa sông (cấp 8).

### Nhà sàn: 2×2 → 3×3

Một nếp nhà có vườn: nhà chính lùi về góc sau bên trái, nhà phụ bên phải, sân trước có hiên và chum nước, vườn rau góc trước bên trái.

```
H H H H Q Q
H H H H h h
H H H H h h
. E E . k k
V V . . g J
V V , , P P
```

- `H` cấp 1, nhà chính mái tròn hình mai rùa (cấp 8: nhà sàn dài mái thuyền vút hai đầu).
- `,` cấp 1, lối vào sân.
- `E` cấp 2, hiên trước, thang tre.
- `J` cấp 2, chum nước.
- `h` cấp 3, nhà phụ mái tròn (cấp 7: nhà mái thuyền nối cầu tre sang nhà chính).
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
r r . . X X
K K , , V V
```

- `P` cấp 1, hố đá đào lộ thiên (cấp 4: hố sâu, có bậc gỗ xuống).
- `r` cấp 1, tảng đá vỡ, nhiều dần theo cấp.
- `,` cấp 1, đường xe đá.
- `X` cấp 2, chồng đá xẻ vuông (cấp 6: cao thêm một khối mỗi cấp).
- `T` cấp 3, tời gỗ chữ A (cấp 6: tời lớn, lán che bánh xe tời).
- `V` cấp 5, xe gỗ chở đá (cấp 8: trâu kéo xe).
- `K` cấp 7, lò nung gạch đất bốc khói (cấp 8: chồng gạch cao gấp đôi).
- `q` cấp 8, giàn cần vọt, đá đối trọng, thúng đá.

### Lò rèn: 2×2 → 3×3

Lò nón lớn ở góc sau bên trái cho khói bốc cao, lán đe phía sau, sân làm việc ở giữa, đống than quặng và giá binh khí ra phía trước.

```
N N W W W W
N N W W W W
. . A . 7 7
B B . . 7 7
q q . . R R
q q , , 8 8
```

- `N` cấp 1, lò nung hình nón (cấp 6: lò to hơn, khói đen từ ống lò).
- `W` cấp 1, lán đe mái một dốc (cấp 4: lán dài hơn; cấp 6: lán cao, giá treo binh khí sắt).
- `A` cấp 1, đe sắt.
- `,` cấp 1, lối vào.
- `B` cấp 2, bễ thổi lửa (cấp 6: ống bễ đôi bọc da).
- `q` cấp 2, đống than và quặng sắt (mới).
- `7` cấp 3, lò nhỏ thứ hai (cấp 7: lò luyện cao đai sắt, lửa đỏ rực).
- `R` cấp 5, giá giáo, rìu đồng.
- `8` cấp 8, sân đúc đồng: khuôn trống, nồi đồng rót.

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

- `V` cấp 1, vựa tròn trên cột, mái nón (cấp 5: vựa to, chóp đồng).
- `,` cấp 1, lối vào.
- `T` cấp 2, thang tre, thúng thóc.
- `s` cấp 3, sân phơi thóc (mới; cấp 7: lát gạch).
- `4` cấp 4, vựa phụ (cấp 8: kho sàn dài mái cong, chim đồng).
- `6` cấp 6, cót thóc lớn trên vòng đá (cấp 7: cót cao, thêm đai tre).

### Doanh trại: 3×3 → 4×4

Nhà dài để trống không vách chạy suốt phía sau, sân tập rộng ở giữa cho tướng đứng, đài tướng và chòi trống bên phải.

```
H H H H H H H H
H H H H H H H H
h h . . . . 2 2
h h . . . . 2 2
h h . . X . . .
h h . . . . 5 5
g . . . . . 5 5
. . . , , . . .
```

- `H` cấp 1, nhà dài để trống không vách, mái thẳng.
- `X` cấp 1, chỗ tướng đứng giữa sân.
- `g` cấp 1, giá giáo đồng.
- `,` cấp 1, cổng trại.
- `2` cấp 2, đài tướng có chiếu cói, lọng đỏ.
- `h` cấp 4, nhà dài thứ hai quay dọc bên trái.
- `5` cấp 5, chòi trống trận.
- Cấp 3: rào cọc vót nhọn quanh móng, chừa cổng giữa mặt trước. Trại giáo, trại cung, chuồng voi dựng sát doanh trại dùng cùng kiểu rào.

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

- `A` lều lính mái chữ A.
- `g` giá giáo, mũi đồng lớn.
- `a` lều chữ A thứ hai (mới).
- `o` cọc rơm, giáo binh đâm thử.
- `,` lối vào.

### Trại cung: 2×2 → 3×3

Lán một mái góc sau bên phải, trường bắn chạy ngang hết móng: cung thủ đứng bên phải bắn sang hai bia ở mép trái.

```
. . . L L L
. . . L L L
B . . L L L
. . . . . c
b . . . . c
. . , , . .
```

- `L` lán một mái, giá cung, bao tên.
- `B` bia rơm tròn ở xa (mới).
- `c` chỗ cung thủ đứng bắn.
- `b` bia rơm tròn ở gần.
- `,` lối vào.

### Chuồng voi: 2×2 → 3×3

Mái chóp bốn mặt trên cột gỗ lớn ở góc sau, sân voi rộng có rào gỗ, máng nước và đống cỏ phía trước.

```
M M M M . .
M M M M . .
M M M M c .
. . . . . .
w w . . y y
. . , , y y
```

- `M` mái chóp bốn mặt trên bốn cột lớn.
- `c` cọc buộc voi đai đồng.
- `w` máng nước gỗ.
- `y` đống cỏ.
- `,` cổng sân voi.
- Rào gỗ ngang ba phía, chừa cổng trước. Voi đứng giữa sân.

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
