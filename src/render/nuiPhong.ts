// Núi phông nền kinh đô (diorama bước 3; `docs/thiet-ke.md` mục Kế hoạch: địa hình diorama): dãy núi đá vôi xanh mờ
// kiểu Ba Vì, Tản Viên ở phía bắc và phía tây, sau rừng ngoài lưới (đông nam là biển), mây vắt ngang sườn núi; thác
// chính đổ từ núi xuống đầu nguồn sông Thao phía bắc, hai suối nhỏ có thác từ núi phía tây chảy vào rừng. Chỉ để nhìn.
// Thác dáng móng ngựa: vách đá ướt sau thác, dòng nước trên đỉnh chảy tới mép, nhiều dải nước đổ cong ra có mép mờ,
// màn bụi nước, bọt loang mặt sông, hơi nước bốc lên. Vẽ nhẹ: ít mặt, không đổ bóng, không viền mực; năm lệnh vẽ (núi
// và suối, mây, nước thác, màn bụi nước, hơi nước).

import * as THREE from 'three';
import { GRID, RIVER_END, RIVER_START } from '../game/map';
import { seeded } from './shapes';

/** Ô ngoài lưới bắt đầu có núi (rừng ngoài lưới sâu 10 ô, rồi đồng cỏ, rồi chân núi). */
const CHAN = 26;
/** Dải núi sâu chừng này ô. */
const SAU = 34;
/** Bờ bắc chỗ thác chính đổ xuống sông Thao (ô). */
const THAC_Z = -15;

export interface NuiPhong {
  group: THREE.Group;
  /** Cho nước thác chảy, hơi nước bốc lên (mảnh hơi nước quay về camera `cam`). */
  update(t: number, cam: THREE.Camera): void;
}

interface Dinh {
  x: number;
  z: number;
  r: number;
  h: number;
}

const DA = new THREE.Color(0x9fb5ae);
const DA_TOI = new THREE.Color(0x6f8a80);
const RUNG = new THREE.Color(0x56784c);
const RUNG_SANG = new THREE.Color(0x7c9c5c);
const NUOC = new THREE.Color(0x5f9fb3);

/** Màu xa: núi hàng sau pha dần về màu này cho ra xanh mờ. */
const MO = new THREE.Color(0xb7c9c2);

/**
 * Một ngọn núi đá vôi: thân tròn méo, vách dốc đứng, đỉnh bo tròn có cây phủ. `seg` mặt quanh, `ring` tầng; đỉnh dồn
 * về một điểm. Đẩy đỉnh vào `pos`, `col`, tam giác vào `idx` (chung đỉnh cho mặt mượt). `mo`: 0 hàng trước, 1 xa nhất.
 */
function ngon(d: Dinh, mo: number, rand: () => number, pos: number[], col: number[], idx: number[]): void {
  const seg = 10;
  const ring = 6;
  const jit = Array.from({ length: seg }, () => 0.82 + rand() * 0.36);
  const lean = (rand() - 0.5) * 0.2;
  const base = pos.length / 3;
  const c = new THREE.Color();
  const put = (x: number, y: number, z: number) => {
    const t = Math.max(0, y) / d.h;
    // Chân núi rừng xanh, giữa vách đá xám xanh, đỉnh có cây; xa thì mờ dần.
    if (t < 0.25) c.copy(RUNG).lerp(DA_TOI, t / 0.25);
    else if (t < 0.75) c.copy(DA_TOI).lerp(DA, (t - 0.25) / 0.5);
    else c.copy(DA).lerp(RUNG_SANG, Math.min(1, (t - 0.75) / 0.18));
    c.lerp(MO, 0.25 + 0.5 * mo);
    pos.push(x, y, z);
    col.push(c.r, c.g, c.b);
  };
  for (let k = 0; k < ring; k++) {
    const t = k / ring;
    // Vách dốc đứng ở giữa, vai bo tròn gần đỉnh như núi đá vôi.
    const rr = d.r * (1 - Math.pow(t, 2.4) * 0.8) * (k === 0 ? 1.12 : 1);
    const y = k === 0 ? -2 : d.h * Math.pow(t, 0.8);
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const j = jit[i] * (0.94 + rand() * 0.12);
      put(d.x + Math.cos(a) * rr * j + lean * y, y, d.z + Math.sin(a) * rr * j);
    }
  }
  put(d.x + lean * d.h, d.h, d.z);
  const top = base + ring * seg;
  for (let k = 0; k < ring - 1; k++) {
    for (let i = 0; i < seg; i++) {
      const i2 = (i + 1) % seg;
      const a = base + k * seg + i;
      const b = base + k * seg + i2;
      const e = a + seg;
      const f = b + seg;
      idx.push(a, e, b, b, e, f);
    }
  }
  for (let i = 0; i < seg; i++) idx.push(base + (ring - 1) * seg + i, top, base + (ring - 1) * seg + ((i + 1) % seg));
}

/** Mây trôi dẹt ở (x, y, z), cỡ `r`: vài khối cầu thấp mặt dẹt dồn lại. */
function may(x: number, y: number, z: number, r: number, rand: () => number, out: THREE.BufferGeometry[]): void {
  for (let k = 0; k < 4; k++) {
    const s = r * (0.6 + rand() * 0.5);
    const g = new THREE.SphereGeometry(1, 8, 5);
    g.scale(s * 1.7, s * 0.42, s);
    g.translate(x + (k - 1.5) * r * 0.9, y + rand() * 0.6, z + (rand() - 0.5) * r * 0.6);
    out.push(g);
  }
}

/**
 * Dựng núi phông nền. `wx`, `wz` đổi ô ra tọa độ cảnh; `mat` đất (Lambert, màu đỉnh). Rừng ngoài lưới bên này sâu
 * 10 ô, đất ngoài lưới kéo dài thêm 70 ô; núi đứng trên dải ấy.
 */
export function buildNuiPhong(wx: (x: number) => number, wz: (z: number) => number, groundY: (x: number, z: number) => number, mat: THREE.Material): NuiPhong {
  const rand = seeded(2026);
  const pos: number[] = [];
  const col: number[] = [];
  const dinh: (Dinh & { mo: number })[] = [];
  const thacX = (RIVER_START + RIVER_END) / 2;
  // Dãy phía bắc (từ ngoài góc tây tới quá sông Thao), chừa khe sông Thao trước khối núi có thác.
  for (let x = -CHAN - SAU; x < GRID + 24; x += 6 + rand() * 5) {
    for (let row = 0; row < 3; row++) {
      const z = -CHAN - 3 - row * 10 - rand() * 6;
      if (x > RIVER_START - 8 && x < RIVER_END + 8 && z > THAC_Z - 8) continue;
      dinh.push({ x: x + rand() * 3, z, r: 3.5 + rand() * 3, h: 10 + row * 6 + rand() * 10, mo: row / 2 });
    }
  }
  // Dãy phía tây, tới gần sông Đà.
  for (let z = -CHAN; z < RIVER_START - 4; z += 6 + rand() * 5) {
    for (let row = 0; row < 3; row++) {
      const x = -CHAN - 3 - row * 10 - rand() * 6;
      dinh.push({ x, z: z + rand() * 3, r: 3.5 + rand() * 3, h: 10 + row * 6 + rand() * 10, mo: row / 2 });
    }
  }
  // Khối núi có thác chính: vắt ngang đầu nguồn sông Thao, vách đứng quay về phía nam.
  const thacDinh = [
    { x: thacX - 9, z: THAC_Z - 11, r: 6, h: 17, mo: 0 },
    { x: thacX + 9, z: THAC_Z - 11.5, r: 6, h: 19, mo: 0 },
    { x: thacX, z: THAC_Z - 17, r: 8, h: 24, mo: 0.3 },
  ];
  const idx: number[] = [];
  for (const d of [...dinh, ...thacDinh]) ngon({ ...d, x: wx(d.x), z: wz(d.z) }, d.mo, rand, pos, col, idx);

  // Thác chính đổ vào đầu nguồn sông Thao; hai suối nhỏ phía tây có thác từ chân núi rồi chảy vào rừng.
  const thacs: ThacDef[] = [
    {
      cx: wx(thacX),
      cz: wz(THAC_Z),
      r: 4.6,
      giua: -Math.PI / 2,
      nua: 0.95,
      top: THAC_CAO,
      bottom: MAT_SONG,
      day: 1.1,
      dai: [
        [-0.95, -0.55],
        [-0.45, 0.32],
        [0.42, 0.92],
      ],
      hoi: 45,
    },
  ];
  const suoi = [12, 34];
  const ruoc = (x0: number, z0: number, x1: number, z1: number, w: number, y0: number, y1: number) => {
    // Dải nước phẳng nối (x0, z0) tới (x1, z1), rộng w.
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const nx = (-dz / len) * (w / 2);
    const nz = (dx / len) * (w / 2);
    const quad = [x0 + nx, z0 + nz, x0 - nx, z0 - nz, x1 + nx, z1 + nz, x1 - nx, z1 - nz];
    const b0 = pos.length / 3;
    for (let v = 0; v < 4; v++) {
      pos.push(quad[v * 2], v < 2 ? y0 : y1, quad[v * 2 + 1]);
      col.push(NUOC.r, NUOC.g, NUOC.b);
    }
    idx.push(b0, b0 + 2, b0 + 1, b0 + 1, b0 + 2, b0 + 3);
  };
  for (const z of suoi) {
    // Suối uốn hai khúc từ chân núi phía tây chảy vào rừng ngoài lưới (dừng trong rừng, cách bìa lưới vài ô).
    const xs = [-CHAN - 4, -16, -8, -4];
    const zs = [z, z + 2.5, z + 1, z + 2];
    const y = (k: number) => groundY(xs[k], zs[k]) + 0.04;
    for (let k = 0; k + 1 < xs.length; k++) ruoc(wx(xs[k]), wz(zs[k]), wx(xs[k + 1]), wz(zs[k + 1]), 0.9, y(k), y(k + 1));
    thacs.push({ cx: wx(xs[0] + 0.4), cz: wz(z), r: 1.3, giua: Math.PI, nua: 0.55, top: y(0) + 5, bottom: y(0), day: 0.35, dai: [[-0.85, 0.85]], hoi: 14 });
  }
  const nuoc = new LuoiNuoc();
  const man = new LuoiNuoc();
  const hoi: Hoi[] = [];
  for (const d of thacs) {
    vachUot(d, rand, pos, col, idx);
    thacNuoc(d, nuoc, man);
    for (let k = 0; k < d.hoi; k++) hoi.push({ d, a: d.giua + d.nua * (rand() * 2.2 - 1.1), pha: rand(), toc: 0.12 + rand() * 0.1, co: 0.7 + rand() * 0.6 });
  }

  const group = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const nui = new THREE.Mesh(geo, mat);
  // Mây vắt ngang sườn: dải mây ở chừng nửa núi, vài chỗ.
  const clouds: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 9; k++) {
    const d = dinh[Math.floor(rand() * dinh.length)];
    may(wx(d.x), d.h * (0.45 + rand() * 0.2), wz(d.z) + d.r * 0.6, 3 + rand() * 2, rand, clouds);
  }
  const mayGeo = mergeGeos(clouds);
  const mayMesh = new THREE.Mesh(mayGeo, new THREE.MeshLambertMaterial({ color: 0xf4f1e6, emissive: 0x4a4a46 }));
  // Nước thác hai lớp cùng ảnh, cuộn hai tốc độ khác nhau cho ra dòng nước chảy không đều: lớp chính (mặt thác, dòng
  // trên đỉnh, bọt loang mặt sông) và lớp màn bụi nước phồng ra ở nửa dưới.
  const tex = thacTexture();
  const tex2 = tex.clone();
  const nuocMat = (map: THREE.Texture, opacity: number) =>
    new THREE.MeshBasicMaterial({ map, vertexColors: true, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const thac = new THREE.Mesh(nuoc.geo(), nuocMat(tex, 1));
  const manMesh = new THREE.Mesh(man.geo(), nuocMat(tex2, 0.8));
  thac.renderOrder = 1;
  manMesh.renderOrder = 2;
  // Hơi nước bốc lên chân thác: mảnh ảnh mờ tròn luôn quay về camera, dựng lại mỗi khung.
  const hoiGeo = new THREE.BufferGeometry();
  const hp = new Float32Array(hoi.length * 12);
  const hc = new Float32Array(hoi.length * 16).fill(1);
  const huv = new Float32Array(hoi.length * 8);
  const hi: number[] = [];
  for (let k = 0; k < hoi.length; k++) {
    huv.set([0, 0, 1, 0, 1, 1, 0, 1], k * 8);
    hi.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3);
  }
  hoiGeo.setAttribute('position', new THREE.BufferAttribute(hp, 3));
  hoiGeo.setAttribute('color', new THREE.BufferAttribute(hc, 4));
  hoiGeo.setAttribute('uv', new THREE.BufferAttribute(huv, 2));
  hoiGeo.setIndex(hi);
  const hoiMesh = new THREE.Mesh(
    hoiGeo,
    new THREE.MeshBasicMaterial({ map: hoiTexture(), vertexColors: true, transparent: true, depthWrite: false }),
  );
  // Mảnh hơi nước đổi chỗ mỗi khung, khỏi tính lại khối bao: luôn vẽ (một lệnh vẽ nhỏ).
  hoiMesh.frustumCulled = false;
  hoiMesh.renderOrder = 3;
  for (const m of [nui, mayMesh, thac, manMesh, hoiMesh]) {
    m.castShadow = false;
    m.receiveShadow = false;
    m.matrixAutoUpdate = false;
    m.updateMatrix();
  }
  group.add(nui, mayMesh, thac, manMesh, hoiMesh);
  const phai = new THREE.Vector3();
  const len = new THREE.Vector3();
  return {
    group,
    update: (t, cam) => {
      tex.offset.y = t * 0.55;
      tex2.offset.y = t * 0.95;
      tex2.offset.x = Math.sin(t * 0.7) * 0.05;
      phai.set(1, 0, 0).applyQuaternion(cam.quaternion);
      len.set(0, 1, 0).applyQuaternion(cam.quaternion);
      for (let k = 0; k < hoi.length; k++) {
        const h = hoi[k];
        const d = h.d;
        const life = (t * h.toc + h.pha) % 1;
        const k1 = d.r / 4.6;
        const rad = d.r - d.day - 0.3 - life * 2.2 * k1;
        const x = d.cx + Math.cos(h.a) * rad;
        const z = d.cz + Math.sin(h.a) * rad;
        const y = d.bottom + 0.15 + life * (d.top - d.bottom) * 0.32;
        const s = (0.5 + life * 1.3) * h.co * Math.max(0.45, k1);
        for (let c = 0; c < 4; c++) {
          const sx = c === 0 || c === 3 ? -s : s;
          const sy = c < 2 ? -s : s;
          hp[k * 12 + c * 3] = x + phai.x * sx + len.x * sy;
          hp[k * 12 + c * 3 + 1] = y + phai.y * sx + len.y * sy;
          hp[k * 12 + c * 3 + 2] = z + phai.z * sx + len.z * sy;
          hc[k * 16 + c * 4 + 3] = Math.sin(Math.PI * life) * 0.26;
        }
      }
      hoiGeo.getAttribute('position').needsUpdate = true;
      hoiGeo.getAttribute('color').needsUpdate = true;
    },
  };
}

// ---------- Thác ----------

/** Mặt nước sông kinh đô (khớp `WATER_Y` ở world.ts). */
const MAT_SONG = -0.28;
/** Mép thác chính cao chừng này. */
const THAC_CAO = 12;
/** Vách đá ướt sau thác: sẫm, rêu xanh ở mép trên. */
const DA_UOT = new THREE.Color(0x5a6a62);
const DA_UOT_SANG = new THREE.Color(0x7d8d83);
const REU = new THREE.Color(0x4f7346);

/**
 * Một thác dáng móng ngựa: mép thác là cung tròn tâm (`cx`, `cz`) bán kính `r` (tọa độ cảnh) quanh góc `giua`, rộng
 * `nua` radian mỗi bên; nước từ ngoài cung chảy tới mép rồi đổ vào trong, xuống vũng ở giữa. `top`, `bottom`: độ cao
 * mép và mặt nước dưới; `day`: nước văng ra xa mép chừng này ở chân thác; `dai`: các dải nước (phần của cung, từ -1 tới
 * 1), giữa hai dải lộ vách đá; `hoi`: số mảnh hơi nước.
 */
interface ThacDef {
  cx: number;
  cz: number;
  r: number;
  giua: number;
  nua: number;
  top: number;
  bottom: number;
  day: number;
  dai: [number, number][];
  hoi: number;
}

/** Một mảnh hơi nước: thác, góc trên cung, pha, tốc bốc lên, cỡ. */
interface Hoi {
  d: ThacDef;
  a: number;
  pha: number;
  toc: number;
  co: number;
}

/** Lưới nước: đỉnh, tọa độ ảnh, màu có độ trong. */
class LuoiNuoc {
  pos: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];

  /** Dựng lưới (cols + 1) × (rows + 1) đỉnh; `f(s, t)` (0 tới 1) cho [x, y, z, u, v, độ sáng, độ trong]. */
  grid(cols: number, rows: number, f: (s: number, t: number) => number[]): void {
    const b = this.pos.length / 3;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const [x, y, z, u, v, l, a] = f(i / cols, j / rows);
        this.pos.push(x, y, z);
        this.uv.push(u, v);
        this.col.push(l, l, l, a);
      }
    }
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = b + j * (cols + 1) + i;
        this.idx.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
      }
    }
  }

  geo(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 4));
    g.setIndex(this.idx);
    return g;
  }
}

/** Mép mờ dần trong `w` phần đầu và cuối (0 ở mép, 1 ở giữa). */
const mep = (s: number, w: number) => {
  const k = Math.min(1, Math.min(s, 1 - s) / w);
  return k * k * (3 - 2 * k);
};

/**
 * Vách đá ướt sau thác (vào lưới núi, chất liệu đất): vách gần dựng đứng theo cung mép thác, rộng hơn thác mỗi bên,
 * mép trên có rêu, rồi mặt đất trên đỉnh lùi ra sau lên dần vào chân núi. Lòng dòng nước trên đỉnh trũng xuống để nước
 * chảy tới mép.
 */
function vachUot(d: ThacDef, rand: () => number, pos: number[], col: number[], idx: number[]): void {
  const k = d.r / 4.6;
  const h = d.top - d.bottom;
  // Mặt cắt từ chân vách ra sau: [bán kính thêm, độ cao thêm so với mép, màu].
  const mat: [number, number, THREE.Color][] = [
    [-0.2, -h - 1.2, DA_UOT],
    [-0.1, -h * 0.55, DA_UOT_SANG],
    [0.02, -h * 0.2, DA_UOT],
    [0.05, -0.25, REU],
    [0.5 * k, -0.04, REU],
    [3.2 * k, 0.0, RUNG],
    [7 * k, 2.5 * k, RUNG_SANG],
    [11 * k, 6 * k, DA],
  ];
  const cols = 22;
  const span = d.nua + 0.4;
  const base = pos.length / 3;
  const c = new THREE.Color();
  const jit = Array.from({ length: cols + 1 }, () => (rand() - 0.5) * 0.25 * k);
  for (let j = 0; j < mat.length; j++) {
    const [dr, dy, cc] = mat[j];
    for (let i = 0; i <= cols; i++) {
      const s = i / cols;
      const a = d.giua + span * (s * 2 - 1);
      // Trong lòng dòng nước thì mặt đỉnh trũng xuống dưới mặt nước chảy tới mép.
      const f = (a - d.giua) / d.nua;
      const long = j >= 4 && j <= 5 && Math.abs(f) < 1 ? -0.12 : 0;
      // Hai đầu vách thấp dần cho khỏi cụt, vách đá lồi lõm theo cột.
      const vai = 1 - Math.pow(Math.abs(s * 2 - 1), 6) * 0.35;
      const rr = d.r + dr + (j < 4 ? jit[i] : jit[i] * 0.5);
      const y = d.top + (dy + long) * (j < 4 ? 1 : vai) - (j >= 4 ? (1 - vai) * h * 0.5 : 0);
      pos.push(d.cx + Math.cos(a) * rr, y, d.cz + Math.sin(a) * rr);
      c.copy(cc);
      // Vách đá có vệt sáng tối theo cột như đá xếp lớp.
      if (j < 3) c.multiplyScalar(0.8 + ((i * 7) % 5) * 0.08 + rand() * 0.1);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j + 1 < mat.length; j++) {
    for (let i = 0; i < cols; i++) {
      const a = base + j * (cols + 1) + i;
      idx.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
    }
  }
}

/**
 * Nước thác: dòng trên đỉnh chảy tới mép, các dải nước đổ cong ra (văng xa dần theo căn bậc hai của độ rơi, tỏa rộng
 * ra), bọt loang trên mặt nước dưới chân; tọa độ ảnh nối liền ba phần để nước chảy một mạch. Lớp màn bụi nước (`man`)
 * phồng ra trước nửa dưới mỗi dải.
 */
function thacNuoc(d: ThacDef, nuoc: LuoiNuoc, man: LuoiNuoc): void {
  const V = 3.5;
  const U = 1.8;
  const lo = Math.min(...d.dai.map((x) => x[0]));
  const hi = Math.max(...d.dai.map((x) => x[1]));
  const wy = d.top + 0.02;
  // Dòng trên đỉnh: từ sau ra mép, mờ dần ở phía sau.
  const sau = 2.2 * (d.r / 4.6);
  nuoc.grid(16, 4, (s, t) => {
    const a = d.giua + d.nua * (lo + (hi - lo) * s);
    const rr = d.r + sau * (1 - t);
    return [d.cx + Math.cos(a) * rr, wy, d.cz + Math.sin(a) * rr, (a * d.r) / U, (wy + (rr - d.r)) / V, 0.8, 0.6 * mep(s, 0.12) * Math.min(1, t * 2.5)];
  });
  for (const [f0, f1] of d.dai) {
    const at = (s: number, t: number, them: number) => {
      const fan = 1 + 0.14 * t;
      const a = d.giua + d.nua * ((f0 + (f1 - f0) * s) * fan);
      const roi = Math.pow(t, 1.15);
      const rr = d.r - 0.06 - d.day * Math.sqrt(t) - them + 0.05 * Math.sin(s * 11 + t * 6);
      return { a, x: d.cx + Math.cos(a) * rr, y: wy - (wy - d.bottom) * roi, z: d.cz + Math.sin(a) * rr };
    };
    nuoc.grid(8, 14, (s, t) => {
      const p = at(s, t, 0);
      // Đầu thác nước trong, xanh, chân thác trắng xóa.
      return [p.x, p.y, p.z, (p.a * d.r) / U, p.y / V, 0.75 + 0.5 * t, mep(s, 0.2) * (0.78 + 0.22 * t)];
    });
    man.grid(8, 8, (s, t) => {
      const tt = 0.35 + 0.65 * t;
      const p = at(s, tt, 0.12 + 0.3 * t * (d.r / 4.6));
      return [p.x, p.y, p.z, (p.a * d.r) / U * 1.7 + 0.31, (p.y / V) * 1.3, 1.25, mep(s, 0.3) * Math.min(1, t * 3) * 0.6];
    });
  }
  // Bọt loang trên mặt nước dưới chân thác, trôi vào giữa vũng rồi tan.
  const xa = 3.2 * (d.r / 4.6);
  const r0 = d.r - d.day - 0.1;
  nuoc.grid(20, 5, (s, t) => {
    const a = d.giua + (d.nua + 0.2) * (s * 2 - 1);
    const rr = r0 - xa * t;
    return [d.cx + Math.cos(a) * rr, d.bottom + 0.03, d.cz + Math.sin(a) * rr, (a * d.r) / U, (d.bottom - (r0 - rr)) / V, 1.3, mep(s, 0.15) * Math.pow(1 - t, 1.4) * 0.95];
  });
}

/** Ảnh nước thác: nền xanh trong, vệt trắng dọc dài ngắn, đậm nhạt khác nhau; lặp hai chiều. */
function thacTexture(): THREE.CanvasTexture {
  const W = 128;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(120,186,200,0.55)';
  g.fillRect(0, 0, W, H);
  const rand = seeded(41);
  const vet = (x: number, y: number, w: number, len: number, rgb: string, a: number) => {
    for (const dx of [0, -W, W]) {
      for (const dy of [0, -H, H]) {
        const gr = g.createLinearGradient(0, y + dy, 0, y + dy + len);
        gr.addColorStop(0, `rgba(${rgb},0)`);
        gr.addColorStop(0.3, `rgba(${rgb},${a})`);
        gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr;
        g.fillRect(x + dx, y + dy, w, len);
      }
    }
  };
  for (let i = 0; i < 26; i++) vet(rand() * W, rand() * H, 2 + rand() * 5, 40 + rand() * 120, '70,130,150', 0.5);
  for (let i = 0; i < 90; i++) vet(rand() * W, rand() * H, 1 + rand() * 3.5, 20 + rand() * 110, '240,252,255', 0.35 + rand() * 0.6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Ảnh hơi nước: đốm trắng tròn mờ dần ra mép. */
function hoiTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(0.5, 'rgba(240,248,250,0.45)');
  gr.addColorStop(1, 'rgba(240,248,250,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Gộp các hình chỉ có position, normal, uv (cùng dạng) thành một. */
function mergeGeos(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const size = parts[0].getAttribute(name).itemSize;
    const all = new Float32Array(parts.reduce((n, g) => n + g.getAttribute(name).count * size, 0));
    let o = 0;
    for (const g of parts) {
      const a = g.getAttribute(name).array as Float32Array;
      all.set(a, o);
      o += a.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(all, size));
  }
  for (const g of list) g.dispose();
  return out;
}
