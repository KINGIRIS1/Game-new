// Rút gọn hình 34 tỉnh, thành Việt Nam (từ 2025) ra `public/ban-do/34-tinh.json` (TopoJSON) cho bảng Bản đồ Việt Nam,
// và tính láng giềng (chung cạnh), phần viền ngoài (bờ biển hay biên giới), đảo, ghi vào `src/game/vietNamHinh.ts`.
//
// Nguồn: Free-GIS-Data của nguyenduy1133 (https://github.com/nguyenduy1133/Free-GIS-Data), tệp
// `Vietnam Administrative Divisions (Post-2025) - Đơn vị hành chính Việt Nam (Từ 2025)/Provinces.geojson`.
// Repo nguồn không có tệp giấy phép, chỉ yêu cầu ghi nguồn: giữ dòng nguồn trong tệp ra và ở Cài đặt (`vi.vietNam.nguon`).
//
// Tệp nguồn thiếu Côn Đảo (đặc khu của TP. Hồ Chí Minh từ khi Bà Rịa - Vũng Tàu nhập vào): lấy các đảo của Bà Rịa -
// Vũng Tàu nằm dưới 9,5° Bắc trong tệp 63 tỉnh cùng repo
// (`Vietnam Administrative Divisions (Pre-2025) - Đơn vị hành chính Việt Nam (Trước 2025)/Provinces_included_Paracel_SpratlyIslands.geojson`).
//
// Chạy: node scripts/ban-do.mjs <đường tới Provinces.geojson> <đường tới Provinces_included_Paracel_SpratlyIslands.geojson>
//   (lấy tệp: GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --sparse https://github.com/nguyenduy1133/free-gis-data
//    rồi `git sparse-checkout set --no-cone "/Vietnam Administrative Divisions (Post-2025) - Đơn vị hành chính Việt Nam (Từ 2025)/Provinces.geojson"`)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { neighbors, quantize } from 'topojson-client';

const [src, cu] = process.argv.slice(2);
if (!src || !cu) {
  console.error('Cần đường tới Provinces.geojson. Xem đầu tệp scripts/ban-do.mjs.');
  process.exit(1);
}
const g = JSON.parse(readFileSync(src, 'utf8'));
if (g.features.length !== 34) throw new Error(`Cần 34 tỉnh, tệp có ${g.features.length}`);

/** Khung bao của một hình (kinh, vĩ). */
function bbox(coords) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      b[0] = Math.min(b[0], c[0]);
      b[1] = Math.min(b[1], c[1]);
      b[2] = Math.max(b[2], c[0]);
      b[3] = Math.max(b[3], c[1]);
    } else c.forEach(walk);
  };
  walk(coords);
  return b;
}

// Tệp nguồn ghi nhầm đối tượng mã 31 là "Lạng Sơn" (Lạng Sơn thật là mã 11, ở biên giới phía bắc). Khung bao của nó
// ở đồng bằng sông Cửu Long, 105,2–106,8° Đông, 10,1–11,0° Bắc: đó là Đồng Tháp (Đồng Tháp và Tiền Giang hợp nhất).
for (const f of g.features) {
  if (f.properties.Ma !== '31') continue;
  const b = bbox(f.geometry.coordinates);
  if (!(b[0] > 105 && b[2] < 107 && b[1] > 10 && b[3] < 11.1)) throw new Error('Mã 31 không còn nằm ở chỗ Đồng Tháp: xem lại tệp nguồn');
  f.properties.TinhThanh = 'Đồng Tháp';
}
// Côn Đảo: thêm vào TP. Hồ Chí Minh (mã 79), chỉ khi tệp nguồn chưa có.
{
  const hcm = g.features.find((f) => f.properties.Ma === '79');
  if (bbox(hcm.geometry.coordinates)[1] > 9.5) {
    const brvt = JSON.parse(readFileSync(cu, 'utf8')).features.find((f) => /^B(à|a) R(ị|i)a/.test(f.properties.Name ?? ''));
    if (!brvt) throw new Error('Tệp 63 tỉnh không có Bà Rịa - Vũng Tàu');
    const polys = brvt.geometry.type === 'MultiPolygon' ? brvt.geometry.coordinates : [brvt.geometry.coordinates];
    const conDao = polys.filter((p) => bbox(p)[3] < 9.5);
    if (!conDao.length) throw new Error('Không thấy Côn Đảo');
    hcm.geometry = { type: 'MultiPolygon', coordinates: [...(hcm.geometry.type === 'MultiPolygon' ? hcm.geometry.coordinates : [hcm.geometry.coordinates]), ...conDao] };
  }
}
const ten = new Map(g.features.map((f) => [f.properties.Ma, f.properties.TinhThanh]));
if (new Set(ten.values()).size !== 34) throw new Error('Tên tỉnh trùng nhau');

/** Hai quần đảo (kinh độ, vĩ độ): mọi đảo nhỏ trong khung này giữ lại dù bé mấy. */
const QUAN_DAO = {
  hoangSa: { box: [110.9, 15.5, 113, 17.3], tinh: '21' },
  truongSa: { box: [111.3, 6.8, 118, 12], tinh: '23' },
};
const inBox = (b, box) => b[0] >= box[0] && b[2] <= box[2] && b[1] >= box[1] && b[3] <= box[3];

/** Diện tích gần đúng (km²) của một vòng theo kinh vĩ. */
function areaKm2(ring) {
  let s = 0;
  const lat = ring[0][1];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return Math.abs(s / 2) * 111.32 * 111.32 * Math.cos((lat * Math.PI) / 180);
}

/** Đảo nhỏ hơn chừng này (km²) bỏ đi, trừ đảo trong hai quần đảo. Còn lại đảo lớn như Phú Quốc, Cát Bà, Côn Đảo, Lý Sơn, Phú Quý, và Bạch Long Vĩ, Cồn Cỏ (chừng 2–3 km²). */
const DAO_MIN = 2;
const daoCua = {};
let bo = 0;
for (const f of g.features) {
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  const ma = f.properties.Ma;
  const giu = [];
  let lon = 0;
  for (const p of polys) {
    const b = bbox(p);
    const qd = Object.entries(QUAN_DAO).find(([, q]) => inBox(b, q.box));
    if (qd) {
      if (qd[1].tinh !== ma) throw new Error(`Đảo ở ${qd[0]} lại thuộc tỉnh ${ma}`);
      // Đảo trong quần đảo bé hơn một nét vẽ: chỉ cần một vòng nhỏ đúng chỗ (bỏ lỗ).
      giu.push([p[0]]);
      continue;
    }
    const a = areaKm2(p[0]);
    if (a >= DAO_MIN) {
      giu.push(p);
      if (a > lon) lon = a;
    } else bo++;
  }
  // Đếm đảo: các mảnh không phải mảnh lớn nhất.
  daoCua[ma] = giu.length - 1;
  f.geometry = { type: 'MultiPolygon', coordinates: giu };
  f.properties = { id: ma, ten: f.properties.TinhThanh };
}

// Topology trên dữ liệu đầy đủ (trước khi rút gọn) để biết cạnh chung giữa các tỉnh.
let topo = topology({ tinh: g }, 1e6);
const geoms = topo.objects.tinh.geometries;
const ke = neighbors(geoms);

/** Độ dài (km) mỗi cung của topology đã lượng tử. */
const [sx, sy] = topo.transform.scale;
const arcLen = topo.arcs.map((arc) => {
  let x = 0, y = 0, L = 0;
  for (let i = 0; i < arc.length; i++) {
    const dx = arc[i][0] * sx, dy = arc[i][1] * sy;
    x += arc[i][0];
    y += arc[i][1];
    if (i) L += Math.hypot(dx * 111.32 * Math.cos(((y * sy + topo.transform.translate[1]) * Math.PI) / 180), dy * 111.32);
  }
  return L;
});
/** Mỗi cung thuộc mấy tỉnh. */
const dung = new Map();
const cungCua = (geom) => {
  const set = new Set();
  const walk = (a) => (typeof a === 'number' ? set.add(a < 0 ? ~a : a) : a.forEach(walk));
  walk(geom.arcs);
  return set;
};
const cungTinh = geoms.map(cungCua);
for (const set of cungTinh) for (const a of set) dung.set(a, (dung.get(a) ?? 0) + 1);

/** Láng giềng chung cạnh: bỏ cặp chỉ chạm nhau ở một điểm hay một đoạn rất ngắn (dưới 1 km). */
const langGieng = {};
const vien = {};
geoms.forEach((geom, i) => {
  const ma = geom.properties.id;
  langGieng[ma] = ke[i]
    .filter((j) => {
      let L = 0;
      for (const a of cungTinh[i]) if (cungTinh[j].has(a)) L += arcLen[a];
      return L >= 1;
    })
    .map((j) => geoms[j].properties.id)
    .sort();
  let L = 0;
  for (const a of cungTinh[i]) if (dung.get(a) === 1) L += arcLen[a];
  vien[ma] = Math.round(L);
});
for (const [a, list] of Object.entries(langGieng)) for (const b of list) if (!langGieng[b].includes(a)) throw new Error(`Láng giềng lệch ${a}–${b}`);

// Rút gọn cho bản đồ điện thoại: giữ chừng 8% điểm (cạnh chung rút gọn một lần nên hai tỉnh vẫn khít nhau).
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.08));
topo = quantize(topo, 2e4);
// Tính lại khung bao mọi điểm đã rút gọn để ghi kèm.
const out = {
  ...topo,
  nguon: 'Free-GIS-Data (nguyenduy1133), Vietnam Administrative Divisions (Post-2025)/Provinces.geojson; sửa mã 31 thành Đồng Tháp; rút gọn bằng scripts/ban-do.mjs',
};
mkdirSync('public/ban-do', { recursive: true });
const json = JSON.stringify(out);
writeFileSync('public/ban-do/34-tinh.json', json);

const ts = `// Do \`node scripts/ban-do.mjs\` sinh ra từ hình tỉnh (Free-GIS-Data, xem đầu script). Đừng sửa tay.

/** Tỉnh chung cạnh (mã tỉnh), tính từ cạnh chung dài từ 1 km. */
export const LANG_GIENG_HINH: Readonly<Record<string, readonly string[]>> = ${JSON.stringify(langGieng)};

/** Độ dài (km, gần đúng) viền ngoài của mỗi tỉnh: bờ biển và biên giới quốc gia, kể cả bờ các đảo. */
export const VIEN_NGOAI_KM: Readonly<Record<string, number>> = ${JSON.stringify(vien)};

/** Số đảo (mảnh đất ngoài mảnh chính) còn giữ trên bản đồ của mỗi tỉnh. */
export const SO_DAO: Readonly<Record<string, number>> = ${JSON.stringify(daoCua)};
`;
writeFileSync('src/game/vietNamHinh.ts', ts);

console.log(`Bỏ ${bo} đảo nhỏ dưới ${DAO_MIN} km². Tệp ra ${(json.length / 1024).toFixed(0)} KB.`);
for (const geom of geoms) {
  const ma = geom.properties.id;
  console.log(ma, ten.get(ma).padEnd(16), 'viền', String(vien[ma]).padStart(5), 'km, đảo', String(daoCua[ma]).padStart(3), '·', langGieng[ma].map((m) => ten.get(m)).join(', '));
}
