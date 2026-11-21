// Núi phông nền kinh đô (diorama bước 3; `docs/thiet-ke.md` mục Kế hoạch: địa hình diorama): dãy núi đá vôi xanh mờ
// kiểu Ba Vì, Tản Viên ở phía bắc và phía tây, sau rừng ngoài lưới (đông nam là biển), mây vắt ngang sườn núi; thác
// chính đổ từ núi xuống đầu nguồn sông Thao phía bắc, hai suối nhỏ có thác từ núi phía tây chảy vào rừng. Chỉ để nhìn.
// Vẽ nhẹ: ít mặt, không đổ bóng, không viền mực; ba lệnh vẽ (núi và suối, mây và bọt nước, thác).

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
  /** Cho nước thác chảy. */
  update(t: number): void;
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

/** Ảnh nước thác: vệt trắng xanh dọc, lặp theo chiều dọc để cuộn xuống. */
function thacTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8fd0e0';
  g.fillRect(0, 0, 64, 128);
  const rand = seeded(41);
  for (let i = 0; i < 40; i++) {
    const x = rand() * 64;
    const y = rand() * 128;
    const len = 20 + rand() * 50;
    g.fillStyle = rand() < 0.6 ? 'rgba(255,255,255,0.85)' : 'rgba(200,236,244,0.9)';
    for (const dy of [0, -128, 128]) g.fillRect(x, y + dy, 2 + rand() * 3, len);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

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
    { x: thacX - 6, z: THAC_Z - 6, r: 7, h: 17, mo: 0 },
    { x: thacX + 6, z: THAC_Z - 6.5, r: 7, h: 19, mo: 0 },
    { x: thacX, z: THAC_Z - 10, r: 8, h: 24, mo: 0.3 },
  ];
  const idx: number[] = [];
  for (const d of [...dinh, ...thacDinh]) ngon({ ...d, x: wx(d.x), z: wz(d.z) }, d.mo, rand, pos, col, idx);

  // Thác: vách nước từ khe núi đổ xuống mặt sông; hai suối nhỏ phía tây đổ từ chân núi rồi chảy vào rừng.
  const thacGeo: THREE.BufferGeometry[] = [];
  const bot: THREE.BufferGeometry[] = [];
  const fall = (x: number, z: number, w: number, top: number, bottom: number, ry: number) => {
    const g = new THREE.PlaneGeometry(w, top - bottom, 1, 1);
    g.translate(0, (top + bottom) / 2, 0);
    g.rotateY(ry);
    g.translate(x, 0, z);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 3), uv.getY(i) * ((top - bottom) / 4));
    thacGeo.push(g);
    // Bọt nước chân thác.
    may(x, bottom + 0.1, z + 0.5 * Math.cos(ry), w * 0.35, rand, bot);
  };
  // Mặt sông ở -0.28: thác đổ từ khe cao 13 xuống.
  fall(wx(thacX), wz(THAC_Z - 1.2), (RIVER_END - RIVER_START) * 0.7, 13, -0.3, 0);
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
    fall(wx(-CHAN - 4.6), wz(z), 1.2, y(0) + 6, y(0) - 0.05, -Math.PI / 2);
  }

  const group = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const nui = new THREE.Mesh(geo, mat);
  // Mây vắt ngang sườn: dải mây ở chừng nửa núi, vài chỗ.
  const clouds: THREE.BufferGeometry[] = [...bot];
  for (let k = 0; k < 9; k++) {
    const d = dinh[Math.floor(rand() * dinh.length)];
    may(wx(d.x), d.h * (0.45 + rand() * 0.2), wz(d.z) + d.r * 0.6, 3 + rand() * 2, rand, clouds);
  }
  const mayGeo = mergeGeos(clouds);
  const mayMesh = new THREE.Mesh(mayGeo, new THREE.MeshLambertMaterial({ color: 0xf4f1e6, emissive: 0x4a4a46 }));
  const tex = thacTexture();
  const thac = new THREE.Mesh(mergeGeos(thacGeo), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide }));
  thac.renderOrder = 1;
  for (const m of [nui, mayMesh, thac]) {
    m.castShadow = false;
    m.receiveShadow = false;
    m.matrixAutoUpdate = false;
    m.updateMatrix();
  }
  group.add(nui, mayMesh, thac);
  return {
    group,
    update: (t) => {
      tex.offset.y = t * 0.9;
    },
  };
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
