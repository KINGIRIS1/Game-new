// Nút chức năng chạm nổi bộ Đồng thau trống đồng (docs/de-xuat/nut-chuc-nang.html, bộ 2): mỗi nút một hoa văn Đông
// Sơn đúc nổi màu đồng, viền nâu đồng cũ, nét khắc nâu sẫm. Mỗi hình là một SVG trọn vẹn (màu, bộ lọc nổi khối) dựng
// một lần thành ảnh data URI, nên trình duyệt chỉ vẽ bộ lọc một lần rồi dùng lại như ảnh thường.

export type NutNoi =
  | 'quan'
  | 'phoBan'
  | 'xayDung'
  | 'tuong'
  | 'lacHau'
  | 'xoay'
  | 'caiDat'
  // Cột nút bên phải màn hình chính.
  | 'daNgoai'
  | 'thanThu'
  | 'loiDai'
  | 'dauThanh'
  | 'vietNam'
  // Vòng nút quanh công trình (`ui/vongNut.ts`).
  | 'thongTin'
  | 'nangCap'
  | 'doi'
  | 'sua'
  | 'do'
  | 'doSu'
  | 'cong'
  | 'giu'
  | 'luyen'
  | 'ren'
  | 'tet'
  | 'uNo'
  | 'ghep'
  | 'dao'
  | 'cat'
  // Thẻ của bảng bản đồ Việt Nam (`ui/vietNam.ts`).
  | 'bia'
  | 'an'
  | 'bucThi';

/** Màu thân (dải đồng), nét khắc, vệt sáng nét khắc. */
const F = 'url(#g)';
const E = '#5a3b14';
const L = '#fff0b8';

/** Nét khắc chìm: một vệt sáng lệch xuống dưới phải, rồi nét sẫm đè lên. */
const khac = (d: string, w = 3) =>
  `<path d="${d}" fill="none" stroke="${L}" stroke-width="${w}" stroke-linecap="round" transform="translate(.8 1)"/>` +
  `<path d="${d}" fill="none" stroke="${E}" stroke-width="${w}" stroke-linecap="round"/>`;

/** Một ngọn giáo đồng mũi lá dựng đứng, xoay quanh tâm khung. */
const giao = (goc: number) => `<g transform="rotate(${goc} 50 50)">
  <path d="M50 4 C59 15 59 27 50 38 C41 27 41 15 50 4Z"/><rect x="46" y="37" width="8" height="7" rx="2"/>
  <rect x="47.5" y="43" width="5" height="52" rx="2.5"/></g>`;

/** Một chiếc lông chim của mũ lông chim, mọc từ chân mũ. */
const long = (goc: number, dai: number) =>
  `<path transform="rotate(${goc} 50 78)" d="M50 78 C43 ${78 - dai * 0.45} 45 ${78 - dai * 0.85} 50 ${78 - dai} C55 ${78 - dai * 0.85} 57 ${78 - dai * 0.45} 50 78Z"/>`;

/** Ngôi sao `n` cánh như giữa mặt trống. */
function sao(n: number, r1: number, r2: number, cx = 50, cy = 50): string {
  const p: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? r2 : r1;
    p.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return p.join(' ');
}

const HINH: Record<NutNoi, () => string> = {
  // Quân: hai ngọn giáo đồng bắt chéo sau khiên tròn có sao tám cánh.
  quan: () =>
    `<g fill="${F}">${giao(42)}${giao(-42)}<circle cx="50" cy="52" r="24"/></g>` +
    khac('M50 33 A19 19 0 1 1 49.9 33') +
    `<polygon points="${sao(8, 9, 3.5, 50, 52)}" fill="${E}"/>`,
  // Phó bản: núi cắm cờ đuôi nheo.
  phoBan: () =>
    `<g fill="${F}"><path d="M4 88 L32 40 L45 60 L62 28 L96 88Z"/><rect x="60.5" y="6" width="3.5" height="26" rx="1.5"/>
    <path d="M64 7 L90 12 L83 18 L90 24 L64 22Z"/><rect x="2" y="84" width="96" height="9" rx="4.5"/></g>` +
    khac('M62 30 L55 50 L60 60 M32 42 L28 58') +
    khac('M66 14.5 L80 16', 2.5),
  // Xây dựng: nhà sàn mái cong hình thuyền như trên trống đồng, có hàng vòng tròn trên mái.
  xayDung: () =>
    `<g fill="${F}"><path d="M-2 12 Q50 52 102 12 L88 54 L12 54Z"/><rect x="24" y="52" width="52" height="12"/>
    <rect x="12" y="62" width="76" height="7" rx="3"/>${[18, 34, 61, 77].map((x) => `<rect x="${x}" y="68" width="6" height="26" rx="2"/>`).join('')}
    <path d="M-2 12 L-7 3 L5 10Z"/><path d="M102 12 L107 3 L95 10Z"/></g>` +
    [26, 38, 50, 62, 74].map((x) => `<circle cx="${x}" cy="${44 - Math.abs(50 - x) * 0.12}" r="3.6" fill="none" stroke="${E}" stroke-width="2.2"/>`).join('') +
    khac('M14 54 L86 54', 2.4) +
    khac('M42 54 L42 64 M58 54 L58 64', 2.4),
  // Tướng: mũ lông chim của người Lạc Việt.
  tuong: () =>
    `<g fill="${F}">${[-64, -42, -21, 0, 21, 42, 64].map((g) => long(g, 74 - Math.abs(g) * 0.35)).join('')}
    <path d="M18 74 Q50 60 82 74 L82 86 Q50 74 18 86Z"/></g>` +
    [-42, -21, 0, 21, 42].map((g) => `<path transform="rotate(${g} 50 78)" d="M50 72 L50 ${30 + Math.abs(g) * 0.3}" stroke="${E}" stroke-width="2" fill="none"/>`).join('') +
    `<circle cx="50" cy="74" r="7" fill="${F}" stroke="${E}" stroke-width="2.4"/>` +
    khac('M22 80 Q50 68 78 80', 2),
  // Lạc hầu: cuộn thư có dấu triện.
  lacHau: () =>
    `<g fill="${F}"><rect x="20" y="18" width="60" height="64"/><rect x="12" y="10" width="76" height="14" rx="7"/>
    <rect x="12" y="76" width="76" height="14" rx="7"/></g>` +
    khac('M29 36 L71 36 M29 46 L66 46 M29 56 L71 56 M29 66 L54 66', 2.6) +
    `<rect x="60" y="61" width="10" height="10" rx="1.5" fill="${E}"/>` +
    khac('M14 17 L86 17 M14 83 L86 83', 2),
  // Xoay góc nhìn: hai mũi tên vòng.
  xoay: () =>
    `<g fill="none" stroke="${F}" stroke-width="13" stroke-linecap="round"><path d="M22 42 A30 30 0 0 1 74 30"/><path d="M78 58 A30 30 0 0 1 26 70"/></g>
    <g fill="${F}"><polygon points="68,14 92,34 64,42"/><polygon points="32,86 8,66 36,58"/></g>` +
    khac('M26 41 A26 26 0 0 1 70 32', 2) +
    khac('M74 59 A26 26 0 0 1 30 68', 2),
  // Thông tin: mặt trống nhỏ, giữa khắc chữ i.
  thongTin: () =>
    `<g fill="${F}"><circle cx="50" cy="50" r="40"/></g>` +
    khac('M50 16 A34 34 0 1 1 49.9 16', 2.2) +
    `<circle cx="50" cy="31" r="6.5" fill="${E}"/><rect x="44" y="43" width="12" height="32" rx="4" fill="${E}"/>` +
    `<rect x="39" y="71" width="22" height="6" rx="3" fill="${E}"/>`,
  // Nâng cấp: mũi giáo đồng chỉ lên trên hai nấc chữ V.
  nangCap: () =>
    `<g fill="${F}"><path d="M50 4 C64 18 66 32 50 46 C34 32 36 18 50 4Z"/>
    <path d="M14 70 L50 44 L86 70 L86 84 L50 58 L14 84Z"/><path d="M22 92 L50 72 L78 92 L78 100 L50 82 L22 100Z"/></g>` +
    khac('M50 12 L50 38', 2.4),
  // Dời: mũi tên hai đầu nằm ngang trên một tấm ván.
  doi: () =>
    `<g fill="${F}"><polygon points="4,50 30,24 30,40 70,40 70,24 96,50 70,76 70,60 30,60 30,76"/></g>` +
    khac('M24 50 L76 50', 2.4) +
    khac('M40 46 L40 54 M50 46 L50 54 M60 46 L60 54', 2),
  // Cất vào kho: rương đồng nắp vồng, khóa giữa, đai hai bên.
  cat: () =>
    `<g fill="${F}"><path d="M12 42 Q50 16 88 42 L88 48 L12 48Z"/><rect x="12" y="51" width="76" height="36" rx="4"/>
    <rect x="43" y="40" width="14" height="22" rx="3"/></g>` +
    khac('M14 49.5 L86 49.5', 2.4) +
    khac('M24 56 L24 82 M76 56 L76 82', 2.2) +
    `<circle cx="50" cy="54" r="3.2" fill="${E}"/>`,
  // Sửa: búa đồng cán gỗ đặt chéo.
  sua: () =>
    `<g fill="${F}" transform="rotate(-40 50 50)"><rect x="44" y="34" width="12" height="62" rx="5"/>
    <path d="M18 16 L82 16 Q88 26 82 36 L18 36 Q10 26 18 16Z"/></g>` +
    `<g transform="rotate(-40 50 50)">${khac('M24 26 L76 26', 2.2)}${khac('M50 44 L50 88', 2)}</g>`,
  // Dỡ: rìu đồng lưỡi xòe như rìu Đông Sơn.
  do: () =>
    `<g fill="${F}" transform="rotate(30 50 50)"><rect x="46" y="10" width="9" height="86" rx="4"/>
    <path d="M52 16 L78 10 Q96 34 78 60 L52 52Z"/></g>` +
    `<g transform="rotate(30 50 50)">${khac('M60 22 Q74 34 62 48', 2.2)}</g>`,
  // Đố sử: cuộn thư mở, giữa khắc dấu hỏi.
  doSu: () =>
    `<g fill="${F}"><rect x="20" y="18" width="60" height="64"/><rect x="12" y="10" width="76" height="14" rx="7"/>
    <rect x="12" y="76" width="76" height="14" rx="7"/></g>` +
    khac('M38 38 Q38 28 50 28 Q62 28 62 38 Q62 46 50 50 L50 58', 4) +
    `<circle cx="50" cy="67" r="4" fill="${E}"/>`,
  // Cống đê: cửa cống có ván phai và sóng nước.
  cong: () =>
    `<g fill="${F}"><rect x="10" y="14" width="16" height="72" rx="3"/><rect x="74" y="14" width="16" height="72" rx="3"/>
    <rect x="6" y="8" width="88" height="12" rx="4"/><rect x="28" y="24" width="44" height="30" rx="2"/></g>` +
    khac('M30 34 L70 34 M30 44 L70 44', 2) +
    khac('M28 66 Q36 60 44 66 Q52 72 60 66 Q68 60 74 66 M28 78 Q36 72 44 78 Q52 84 60 78 Q68 72 74 78', 3),
  // Giữ thành: đoạn tường thành có răng cưa, lầu canh mái cong ở giữa.
  giu: () =>
    `<g fill="${F}"><rect x="6" y="56" width="88" height="34" rx="2"/>
    ${[6, 24, 64, 82].map((x) => `<rect x="${x}" y="46" width="12" height="12"/>`).join('')}
    <rect x="36" y="30" width="28" height="28"/><path d="M26 32 Q50 8 74 32 L66 34 Q50 20 34 34Z"/></g>` +
    khac('M42 90 L42 74 Q50 64 58 74 L58 90', 2.6) +
    khac('M10 68 L32 68 M68 68 L90 68', 2),
  // Luyện quân: bia tập tròn, ngọn giáo cắm chéo vào hồng tâm.
  luyen: () =>
    `<g fill="${F}"><circle cx="42" cy="58" r="34"/></g>` +
    khac('M42 32 A26 26 0 1 1 41.9 32', 2.2) +
    khac('M42 46 A12 12 0 1 1 41.9 46', 2.2) +
    `<g fill="${F}" transform="rotate(45 42 58)"><rect x="38.5" y="-6" width="7" height="58" rx="3"/>
    <path d="M42 -22 C50 -14 50 -6 42 0 C34 -6 34 -14 42 -22Z"/></g>`,
  // Rèn: búa đồng giơ trên cái đe.
  ren: () =>
    `<g fill="${F}"><path d="M10 62 L90 62 L90 70 Q74 72 70 80 L70 88 L84 88 L84 96 L16 96 L16 88 L30 88 L30 80 Q26 72 10 70Z"/>
    <g transform="rotate(-35 50 34)"><rect x="46" y="20" width="8" height="40" rx="3"/><rect x="30" y="8" width="40" height="16" rx="4"/></g></g>` +
    khac('M16 66 L84 66', 2) +
    `<g fill="${L}"><circle cx="70" cy="50" r="2.6"/><circle cx="78" cy="42" r="2"/><circle cx="64" cy="40" r="1.8"/></g>`,
  // Hội Tết: cây nêu cao, ngọn có tua lá, khánh đồng treo, đế bánh chưng vuông.
  tet: () =>
    `<g fill="${F}"><rect x="46" y="10" width="7" height="70" rx="3"/>
    <path d="M50 8 Q30 4 18 16 Q34 14 50 16Z"/><path d="M50 8 Q70 4 82 16 Q66 14 50 16Z"/>
    <path d="M38 40 L62 40 L56 50 L44 50Z"/><rect x="26" y="74" width="48" height="22" rx="2"/></g>` +
    khac('M50 50 L50 58', 2) +
    khac('M26 85 L74 85 M50 74 L50 96', 2.2),
  // Ụ nỏ: cây nỏ đồng nằm ngang, mũi tên đặt sẵn.
  uNo: () =>
    `<g fill="${F}"><path d="M8 40 Q50 6 92 40 L86 46 Q50 18 14 46Z"/><rect x="44" y="20" width="12" height="74" rx="4"/>
    <path d="M50 4 L58 18 L42 18Z"/></g>` +
    khac('M14 44 L50 60 L86 44', 2) +
    khac('M50 22 L50 88', 2),
  // Ghép: hai chòi canh nối nhau bằng một sàn.
  ghep: () =>
    `<g fill="${F}">${[22, 78].map((x) => `<rect x="${x - 9}" y="38" width="18" height="56" rx="2"/><path d="M${x - 17} 40 L${x} 18 L${x + 17} 40Z"/>`).join('')}
    <rect x="26" y="52" width="48" height="10" rx="2"/></g>` +
    khac('M36 57 L64 57', 2.2) +
    khac('M44 50 L50 57 L44 64 M56 50 L50 57 L56 64', 2),
  // Ra đảo: đảo cát có cây dừa, sóng quanh.
  dao: () =>
    `<g fill="${F}"><path d="M14 74 Q50 54 86 74Z"/><path d="M48 72 Q46 46 56 26 L60 28 Q52 48 54 72Z"/>
    <path d="M58 26 Q40 14 24 24 Q42 22 56 30Z"/><path d="M58 26 Q76 12 90 22 Q74 22 60 30Z"/><path d="M58 26 Q62 8 74 4 Q64 16 60 28Z"/></g>` +
    khac('M6 84 Q18 78 30 84 Q42 90 54 84 Q66 78 78 84 Q88 88 96 84', 3) +
    khac('M14 94 Q26 88 38 94 Q50 100 62 94 Q74 88 86 94', 2.4),
  // Dã ngoại: cây đa tán tròn trên gò, rễ phụ buông xuống.
  daNgoai: () =>
    `<g fill="${F}"><circle cx="50" cy="34" r="24"/><circle cx="26" cy="46" r="17"/><circle cx="74" cy="46" r="17"/>
    <path d="M44 50 L42 82 L58 82 L56 50Z"/><path d="M6 92 Q50 74 94 92Z"/></g>` +
    khac('M50 50 L50 80 M44 60 L36 54 M56 58 L66 52', 2.4) +
    khac('M24 58 L24 74 M76 58 L76 72', 2) +
    khac('M38 28 Q50 20 62 28', 2),
  // Thần thú: chim Lạc mỏ dài, mào cong, cánh xòe như trên mặt trống đồng.
  thanThu: () =>
    `<g fill="${F}"><path d="M6 30 L40 44 Q50 34 60 44 Q70 52 66 64 L92 92 L60 74 Q44 80 34 66 Q20 58 34 48Z"/>
    <path d="M40 44 Q36 22 54 8 Q50 24 52 38Z"/><path d="M44 58 Q24 76 6 74 Q22 62 34 52Z"/></g>` +
    `<circle cx="48" cy="44" r="3.4" fill="${E}"/>` +
    khac('M42 60 Q54 66 64 62 M44 66 Q56 72 66 70', 2.2) +
    khac('M18 66 L30 58', 2),
  // Lôi đài: trống đồng trên giá, hai dùi bắt chéo.
  loiDai: () =>
    `<g fill="${F}"><path d="M18 40 L82 40 L76 78 L24 78Z"/><ellipse cx="50" cy="40" rx="34" ry="11"/><rect x="14" y="78" width="72" height="9" rx="3"/>
    <path d="M22 87 L16 98 L26 98 L30 87Z"/><path d="M78 87 L84 98 L74 98 L70 87Z"/>
    <path d="M14 6 L20 2 L50 32 L45 36Z"/><circle cx="15" cy="5" r="6"/><path d="M86 6 L80 2 L50 32 L55 36Z"/><circle cx="85" cy="5" r="6"/></g>` +
    khac('M22 40 A28 8 0 0 0 78 40', 2.2) +
    khac('M24 54 L76 54 M26 66 L74 66', 2.2) +
    `<circle cx="50" cy="40" r="4" fill="${E}"/>`,
  // Bản đồ Việt Nam: dải đất hình chữ S, ngôi sao trống đồng ở giữa miền Bắc, chấm hai quần đảo ngoài biển.
  vietNam: () =>
    `<g fill="${F}"><polygon points="21.5,10.7 31.3,8.3 38.8,7.1 46.3,5.2 55.3,7.7 60.5,11.4 65,15.6 57.5,19.3 54.5,23.6 50,26.7 48.5,31.6 52.3,37.1 57.5,43.8 66.5,49.4 71,54.9 74,63.5 75.5,72.7 72.5,78.3 65,81.9 57.5,84.3 54.5,88.6 45.5,95.3 41,95.3 41.8,88 38.8,84.3 43.3,81.2 50,80.6 53,75.7 60.5,72.7 61.3,65.3 61.3,57.9 59,51.2 53.8,46.9 47,40.2 38,34 34.3,29.7 38.8,25.5 29,21.2 22.3,16.3"/><circle cx="84" cy="46" r="3.6"/><circle cx="90" cy="51" r="2.6"/><circle cx="86" cy="70" r="3"/><circle cx="92" cy="76" r="2.4"/><circle cx="83" cy="80" r="2.2"/></g>` +
    `<polygon points="${sao(8, 9, 3.6, 44, 17)}" fill="${E}"/>` +
    khac('M48 30 Q56 42 66 52 M62 60 L70 72', 2.2),
  // Đấu thành: cổng thành có lầu mái cong, răng cưa trên tường, cửa vòm.
  dauThanh: () =>
    `<g fill="${F}"><path d="M4 92 L4 48 L14 48 L14 54 L24 54 L24 48 L34 48 L34 92Z"/><path d="M66 92 L66 48 L76 48 L76 54 L86 54 L86 48 L96 48 L96 92Z"/>
    <rect x="30" y="40" width="40" height="52"/><path d="M18 40 Q50 52 82 40 L72 22 L28 22Z"/><path d="M18 40 L10 32 L22 36Z"/><path d="M82 40 L90 32 L78 36Z"/>
    <rect x="46" y="8" width="8" height="14" rx="2"/></g>` +
    `<path d="M40 92 L40 70 A10 10 0 0 1 60 70 L60 92Z" fill="${E}"/>` +
    khac('M30 50 L70 50', 2.2) +
    khac('M10 66 L28 66 M72 66 L90 66', 2),
  // Thẻ tỉnh: bia đá đầu tròn trên bệ, sao trống đồng trên trán bia, dòng chữ khắc.
  bia: () =>
    `<g fill="${F}"><path d="M24 84 L24 30 Q24 8 50 8 Q76 8 76 30 L76 84Z"/><rect x="12" y="82" width="76" height="12" rx="3"/></g>` +
    `<polygon points="${sao(8, 9, 3.6, 50, 28)}" fill="${E}"/>` +
    khac('M34 48 L66 48 M34 58 L66 58 M34 68 L58 68', 2.6) +
    khac('M18 88 L82 88', 2),
  // Bệ hạ: ấn triện vuông có núm hình nghê, mặt ấn khắc khung chữ.
  an: () =>
    `<g fill="${F}"><rect x="14" y="52" width="72" height="40" rx="4"/><path d="M30 54 Q30 34 42 30 Q40 18 52 14 Q66 14 66 28 Q72 32 70 54Z"/></g>` +
    `<circle cx="58" cy="24" r="3" fill="${E}"/>` +
    khac('M24 62 L76 62 L76 84 L24 84Z', 2.4) +
    khac('M38 68 L38 78 M50 68 L50 78 M62 68 L62 78', 2.2),
  // Thi đua: bục ba bậc, cờ đuôi nheo cắm trên bậc cao nhất.
  bucThi: () =>
    `<g fill="${F}"><rect x="36" y="46" width="28" height="48"/><rect x="6" y="62" width="30" height="32"/><rect x="64" y="72" width="30" height="22"/>
    <rect x="48" y="6" width="4" height="40" rx="1.5"/><path d="M52 7 L80 12 L72 19 L80 26 L52 23Z"/></g>` +
    khac('M50 58 L50 82 M44 64 L50 58', 2.6) +
    khac('M16 72 L26 72 M74 80 L84 80', 2.4),
  // Cài đặt: mặt trống đồng, sao mười bốn cánh giữa các vành.
  caiDat: () =>
    `<g fill="${F}"><circle cx="50" cy="50" r="42"/></g>` +
    khac('M50 14 A36 36 0 1 1 49.9 14', 2.4) +
    khac('M50 22 A28 28 0 1 1 49.9 22', 2) +
    Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2;
      return `<line x1="${(50 + 30 * Math.cos(a)).toFixed(1)}" y1="${(50 + 30 * Math.sin(a)).toFixed(1)}" x2="${(50 + 34 * Math.cos(a)).toFixed(1)}" y2="${(50 + 34 * Math.sin(a)).toFixed(1)}" stroke="${E}" stroke-width="1.6"/>`;
    }).join('') +
    `<polygon points="${sao(14, 24, 8)}" fill="${F}" stroke="${E}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="50" cy="50" r="5" fill="${E}"/>`,
};

/** Dải màu đồng và bộ lọc nổi khối: ánh sáng chiếu chếch trên trái, viền nâu đồng cũ, bóng đổ dưới chân. */
const DEFS = `<defs>
  <linearGradient id="g" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0" stop-color="#fbe6a6"/><stop offset=".45" stop-color="#d9a84a"/><stop offset="1" stop-color="#8a5a14"/>
  </linearGradient>
  <filter id="f" x="-30%" y="-30%" width="160%" height="170%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="b"/>
    <feSpecularLighting in="b" surfaceScale="5" specularConstant="1.1" specularExponent="22" lighting-color="#fff2c4" result="s">
      <fePointLight x="-40" y="-60" z="130"/>
    </feSpecularLighting>
    <feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
    <feComposite in="SourceGraphic" in2="s2" operator="arithmetic" k2="1" k3=".7" result="lit"/>
    <feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="d"/>
    <feFlood flood-color="#4a2c08"/>
    <feComposite in2="d" operator="in" result="vien"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="sb"/>
    <feOffset in="sb" dx="1" dy="4" result="so"/>
    <feFlood flood-color="#1a0e04" flood-opacity=".6"/>
    <feComposite in2="so" operator="in" result="sh"/>
    <feMerge><feMergeNode in="sh"/><feMergeNode in="vien"/><feMergeNode in="lit"/></feMerge>
  </filter>
</defs>`;

/** SVG trọn vẹn của một nút (khung 112×112, chừa chỗ cho viền và bóng). */
export function nutNoiSvg(id: NutNoi): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -4 112 112" width="112" height="112">${DEFS}<g filter="url(#f)">${HINH[id]()}</g></svg>`;
}

const urls = new Map<NutNoi, string>();

/** Ảnh data URI của nút, dựng một lần. */
export function nutNoiUrl(id: NutNoi): string {
  let u = urls.get(id);
  if (!u) {
    u = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(nutNoiSvg(id))}`;
    urls.set(id, u);
  }
  return u;
}

/** Thẻ ảnh của nút (trang trí: chữ của nút nằm ở nhãn hay `aria-label` của nút chứa nó). */
export function nutNoi(id: NutNoi): string {
  return `<img class="nut-noi" src="${nutNoiUrl(id)}" alt="" draggable="false">`;
}
