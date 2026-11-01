// Đường đi và đồ trang trí "Nét Đông Sơn": đường đất nện, rải sỏi, lát đá, lát gạch; cây đa, giếng nước, ao làng,
// khóm hoa, bãi cỏ, cây cau, đống rơm. Chỉ để nhìn.
// - Đường và đồ trang trí một ô có thể nhiều tới hàng trăm: vẽ theo lô bằng InstancedMesh (`buildRoads`,
//   `buildSmallDecor`), mỗi mẫu một lần vẽ. Ô đường lát kín ô nên các ô liền nhau thành một lối; mép ô không giáp
//   ô cùng loại thì có viền (bờ đất, bó vỉa đá, gạch dựng).
// - Cây đa, ao làng nhiều ô: mỗi cái một mô hình (`decorModel`), vẽ theo móng cũ như công trình (`footScale`).
// Gốc tọa độ là tâm chân móng, mặt trước hướng +z.

import * as THREE from 'three';
import { BUILDINGS, isDecor, isRoad, type BuildingType } from '../game/defs';
import { C } from './palette';
import { ShapeBuilder, instanceTemplates, seeded, type Placement } from './shapes';
import { ToonModel, inkThin, outlineOf, toon } from './toon';

const DIRT = 0xb48c5a;
const DIRT_DARK = 0x93704a;
const GRAVEL = 0xcdc2aa;
const PEBBLES = [0x9c9081, 0xb8ae9e, 0x7a6f62, 0xddd4c2];
const STONE = [0xbab09f, 0xa99f8d, 0xc6bdab];
const MORTAR = 0x7f7466;
const BRICK = [0xc8643a, 0xb4573a, 0xd47a4c];
const BRICK_MORTAR = 0xa08a72;
const LAWN = 0x8aa64a;
const GRASS = [0x6f9a3e, 0x7fa845, 0x5f8a36, 0x93b452];
const LATERITE = [0xa0583a, 0x8c4b32];
const ROM = 0xdcb860;
const ROM_LIGHT = 0xe9cb74;
const ROM_DARK = 0xb8923e;
const POND = 0x4f8f96;
const LOTUS_LEAF = [0x4f7f34, 0x5f9040, 0x46722e];
const LOTUS = 0xf0a0b8;
const LOTUS_LIGHT = 0xf8d0dc;
/** Hoa theo mẫu: dâm bụt đỏ, cúc vàng, mười giờ hồng tím. Mỗi mẫu: [cánh, nhụy]. */
const FLOWERS: [number, number][][] = [
  [[0xd8342a, 0xf2c230], [0xe8503a, 0xf2c230]],
  [[0xf2c230, 0x8a5a2a], [0xf6d860, 0x8a5a2a]],
  [[0xd8489a, 0xf6e27a], [0xf07ab8, 0xf6e27a], [0xf6f0e4, 0xf2c230]],
];

/** Một ô đường hay món trang trí một ô, tọa độ thế giới của tâm ô và mặt đất dưới chân. */
export interface DecorSpot {
  type: BuildingType;
  x: number;
  y: number;
  z: number;
  seed: number;
  /** Ô đường: mép +z, −z, +x, −x không giáp ô đường cùng loại thì có viền. */
  open?: [boolean, boolean, boolean, boolean];
}

/** Đường và đồ trang trí một ô vẽ theo lô; cây đa, ao làng mỗi cái một mô hình. */
export function isBatchedDecor(type: BuildingType): boolean {
  return isDecor(type) && BUILDINGS[type].w === 1;
}

// ---------- Đường ----------

type RoadType = 'duongDat' | 'duongSoi' | 'duongDa' | 'duongGach';
const ROADS: RoadType[] = ['duongDat', 'duongSoi', 'duongDa', 'duongGach'];

/** Nền ô đường (không viền mực, để các ô liền nhau không thành ô lưới). Đất nện có vết chân, vết bánh xe. */
function roadBase(b: ShapeBuilder, type: RoadType, v: number): void {
  const rand = seeded(v * 131 + ROADS.indexOf(type) * 7 + 3);
  const color = type === 'duongDat' ? DIRT : type === 'duongSoi' ? GRAVEL : type === 'duongDa' ? MORTAR : BRICK_MORTAR;
  b.box(1, 0.04, 1, color, 0, 0.02, 0);
  if (type === 'duongDat') {
    for (let i = 0; i < 7; i++) {
      const s = 0.04 + rand() * 0.06;
      b.box(s, 0.012, s * (0.6 + rand() * 0.6), i % 3 ? DIRT_DARK : 0xc9a272, (rand() - 0.5) * 0.8, 0.044, (rand() - 0.5) * 0.8, [0, rand() * 3, 0]);
    }
  }
}

/** Mặt ô đường có viền mực: sỏi cuội, đá phiến, gạch. Đất nện không có. */
function roadTop(b: ShapeBuilder, type: RoadType, v: number): void {
  const rand = seeded(v * 977 + ROADS.indexOf(type) * 13 + 5);
  if (type === 'duongSoi') {
    for (let i = 0; i < 11; i++) {
      const r = 0.03 + rand() * 0.03;
      b.sphere(r, PEBBLES[i % 4], (rand() - 0.5) * 0.84, 0.045, (rand() - 0.5) * 0.84, [1.2, 0.45, 1], 6);
    }
  } else if (type === 'duongDa') {
    // Bốn phiến đá vuông, lệch nhau chút ít như đẽo tay.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const w = 0.43 + rand() * 0.03;
        const d = 0.43 + rand() * 0.03;
        b.box(w, 0.05, d, STONE[Math.floor(rand() * 3)], sx * 0.245 + (rand() - 0.5) * 0.02, 0.055, sz * 0.245 + (rand() - 0.5) * 0.02, [0, (rand() - 0.5) * 0.08, 0]);
      }
    }
  } else if (type === 'duongGach') {
    // Gạch xếp so le: bốn hàng, hàng chẵn hai viên, hàng lẻ một viên giữa và hai nửa viên ở mép.
    for (let row = 0; row < 4; row++) {
      const z = -0.375 + row * 0.25;
      const bricks: [number, number][] = row % 2 ? [[-0.375, 0.21], [0, 0.46], [0.375, 0.21]] : [[-0.25, 0.46], [0.25, 0.46]];
      bricks.forEach(([x, w], i) => b.box(w, 0.05, 0.215, BRICK[(row + i + v) % 3], x, 0.06, z));
    }
  }
}

/** Viền một mép ô đường (vẽ cho mép +z, xoay theo mép): bờ đất có cỏ, viền sỏi to, bó vỉa đá, gạch dựng nghiêng. */
function roadEdge(b: ShapeBuilder, type: RoadType): void {
  if (type === 'duongDat') {
    b.box(1, 0.05, 0.07, DIRT_DARK, 0, 0.025, 0.465);
    for (const x of [-0.3, 0.12, 0.38]) for (const dx of [-0.02, 0.02]) b.cone(0.022, 0.12, GRASS[1], x + dx, 0.08, 0.47, [0, 0, dx * 8], 4);
  } else if (type === 'duongSoi') {
    for (let i = 0; i < 5; i++) b.sphere(0.06, PEBBLES[(i * 3) % 4], -0.4 + i * 0.2, 0.05, 0.45, [1.3, 0.6, 1], 6);
  } else if (type === 'duongDa') {
    b.box(0.49, 0.09, 0.09, STONE[1], -0.25, 0.045, 0.455);
    b.box(0.49, 0.09, 0.09, STONE[0], 0.25, 0.045, 0.455);
  } else {
    for (let i = 0; i < 4; i++) b.box(0.235, 0.1, 0.07, BRICK[i % 3], -0.375 + i * 0.25, 0.05, 0.46);
  }
}

// ---------- Đồ trang trí một ô ----------

/** Phần phẳng sát đất, không viền mực (bãi cỏ liền nhau thành một thảm). */
function smallFlat(b: ShapeBuilder, type: BuildingType): boolean {
  if (type === 'co') {
    b.box(1, 0.025, 1, LAWN, 0, 0.0125, 0);
    return true;
  }
  return false;
}

/** Khóm hoa: luống đất vun, bụi lá, hoa theo mẫu `v`. */
function drawHoa(b: ShapeBuilder, v: number): void {
  const rand = seeded(v * 7919 + 13);
  b.cyl(0.36, 0.4, 0.07, C.soil, 0, 0.035, 0, undefined, 10);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rand() * 0.5;
    b.sphere(0.16 + rand() * 0.04, C.leaf[i % 4], Math.cos(a) * 0.15, 0.15, Math.sin(a) * 0.15, [1, 0.75, 1], 7);
  }
  b.sphere(0.16, C.leaf[1], 0, 0.22, 0, [1, 0.8, 1], 7);
  const colors = FLOWERS[v % FLOWERS.length];
  for (let k = 0; k < 9; k++) {
    const a = rand() * Math.PI * 2;
    const r = 0.05 + rand() * 0.22;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = 0.33 - r * 0.45;
    const [petal, heart] = colors[k % colors.length];
    b.sphere(0.058, petal, x, y, z, [1, 0.55, 1], 6);
    b.sphere(0.022, heart, x, y + 0.025, z, [1, 1, 1], 5);
  }
}

/** Bãi cỏ: các khóm cỏ lá nhọn, vài bông hoa dại trắng, vàng. */
function drawCo(b: ShapeBuilder, v: number): void {
  const rand = seeded(v * 4241 + 7);
  for (let i = 0; i < 9; i++) {
    const cx = (rand() - 0.5) * 0.74;
    const cz = (rand() - 0.5) * 0.74;
    for (let k = 0; k < 3; k++) {
      const h = 0.16 + rand() * 0.14;
      const a = rand() * Math.PI * 2;
      b.cone(0.03, h, GRASS[(i + k) % 4], cx + Math.cos(a) * 0.035, 0.025 + h / 2, cz + Math.sin(a) * 0.035, [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3], 4);
    }
  }
  for (let i = 0; i < 4; i++) b.sphere(0.028, i % 2 ? 0xf6f0e4 : 0xf2d040, (rand() - 0.5) * 0.8, 0.1, (rand() - 0.5) * 0.8, [1, 0.6, 1], 5);
}

/** Cây cau: thân thẳng có đốt, tán lá xòe, buồng cau dưới tán. Mẫu 1 cao hơn. */
function drawCau(b: ShapeBuilder, v: number): void {
  const h = v ? 2.35 : 2.05;
  b.cyl(0.04, 0.062, h, C.palm, 0, h / 2, 0, undefined, 7);
  for (let i = 1; i <= 6; i++) b.cyl(0.062 - i * 0.003, 0.062 - i * 0.003, 0.018, C.trunk, 0, (h * i) / 7, 0, undefined, 7);
  // Bẹ cau xanh ôm ngọn.
  b.cyl(0.05, 0.045, 0.22, 0x7f9a48, 0, h + 0.05, 0, undefined, 7);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + v * 0.3;
    const up = i % 2 ? -0.35 : -0.6;
    b.box(0.6, 0.025, 0.13, C.leaf[i % 4], Math.cos(a) * 0.27, h + 0.12 + (i % 2) * 0.06, Math.sin(a) * 0.27, [0, -a, up]);
  }
  b.sphere(0.07, C.leaf[3], 0, h + 0.2, 0, [1, 1.4, 1], 6);
  // Buồng cau: quả xanh, vài quả chín vàng cam.
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    b.sphere(0.042, i % 3 ? 0x6f8f2f : 0xd8963a, 0.09 + Math.cos(a) * 0.04, h - 0.1 - (i % 3) * 0.05, 0.05 + Math.sin(a) * 0.04, [1, 1.2, 1], 6);
  }
}

/** Đống rơm vàng quấn quanh cây cột, đỉnh úp nồi đất, rơm vương dưới chân. */
function drawRom(b: ShapeBuilder, v: number): void {
  const rand = seeded(v * 313 + 11);
  b.cyl(0.42, 0.45, 0.04, ROM_DARK, 0, 0.02, 0, undefined, 12);
  b.cyl(0.34, 0.38, 0.46, ROM, 0, 0.27, 0, undefined, 12);
  b.cyl(0.355, 0.355, 0.05, ROM_DARK, 0, 0.47, 0, undefined, 12);
  b.cone(0.37, 0.52, ROM_LIGHT, 0, 0.75, 0, undefined, 12);
  b.cyl(0.024, 0.03, 1.3, C.woodDark, 0, 0.65, 0, undefined, 6);
  b.cone(0.075, 0.08, C.earthDark, 0, 1.27, 0, [Math.PI, 0, 0], 8);
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    b.box(0.24, 0.012, 0.025, ROM, Math.cos(a) * 0.42, 0.03, Math.sin(a) * 0.42, [0, a + 0.8, 0]);
  }
}

/** Giếng làng: sân đá, thành giếng xây đá ong, nước trong lòng giếng, giá gỗ có ròng rọc và gàu, chum nước. */
function drawGieng(b: ShapeBuilder): void {
  b.box(0.94, 0.05, 0.94, C.rock, 0, 0.025, 0);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.box(0.17, 0.3, 0.09, LATERITE[i % 2], Math.cos(a) * 0.28, 0.2, Math.sin(a) * 0.28, [0, -a - Math.PI / 2, 0]);
    b.box(0.18, 0.04, 0.12, C.rockDark, Math.cos(a) * 0.285, 0.37, Math.sin(a) * 0.285, [0, -a - Math.PI / 2, 0]);
  }
  b.cyl(0.24, 0.24, 0.02, C.water[0], 0, 0.24, 0, undefined, 14);
  for (const x of [-0.37, 0.37]) b.cyl(0.03, 0.036, 0.82, C.woodDark, x, 0.46, 0, undefined, 6);
  b.cyl(0.024, 0.024, 0.8, C.wood, 0, 0.84, 0, [0, 0, Math.PI / 2], 6);
  b.cyl(0.05, 0.05, 0.22, C.woodLight, 0, 0.84, 0, [0, 0, Math.PI / 2], 8);
  b.cyl(0.008, 0.008, 0.3, 0xd8c8a0, 0.05, 0.67, 0, undefined, 4);
  b.cyl(0.062, 0.045, 0.09, C.woodLight, 0.05, 0.5, 0, undefined, 8);
  // Chum nước ở góc sân.
  b.sphere(0.1, C.earthDark, 0.36, 0.14, 0.36, [1, 1.1, 1], 8);
  b.cyl(0.055, 0.06, 0.05, C.earthDark, 0.36, 0.26, 0.36, undefined, 8);
}

function smallBody(b: ShapeBuilder, type: BuildingType, v: number): void {
  if (type === 'hoa') drawHoa(b, v);
  else if (type === 'co') drawCo(b, v);
  else if (type === 'cau') drawCau(b, v);
  else if (type === 'rom') drawRom(b, v);
  else if (type === 'gieng') drawGieng(b);
}

/** Số mẫu khác nhau của mỗi loại một ô (chọn theo ô để không đều tăm tắp). */
const VARIANTS: Partial<Record<BuildingType, number>> = {
  duongDat: 2,
  duongSoi: 2,
  duongDa: 2,
  duongGach: 2,
  hoa: 3,
  co: 2,
  cau: 2,
  rom: 2,
  gieng: 1,
};
const variantsOf = (type: BuildingType) => VARIANTS[type] ?? 1;

// ---------- Mẫu vẽ theo lô ----------

/** Viền mực của mỗi mẫu dựng một lần, dùng lại mỗi lần vẽ lại lô (trải đường thì mỗi lần chạm vẽ lại). */
const outlines = new WeakMap<THREE.BufferGeometry, THREE.Mesh>();
const thinOutline = (geo: THREE.BufferGeometry) => {
  let o = outlines.get(geo);
  if (!o) {
    o = outlineOf(geo, inkThin);
    outlines.set(geo, o);
  }
  return o;
};

/** Gỡ lô đã vẽ: trả bộ nhớ vị trí các bản sao, giữ lại mẫu và viền mực để dùng tiếp. */
export function disposeDecor(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) o.dispose();
  });
}

interface Templates {
  /** Không viền mực: nền đường, thảm cỏ. */
  flat: THREE.Mesh[];
  /** Có viền mực: mặt đường, viền đường, thân đồ trang trí. */
  body: THREE.Mesh[];
  /** Chỉ số mẫu theo khóa `loại:mẫu` (hay `loại:viền`), −1 là không có. */
  flatOf: Map<string, number>;
  bodyOf: Map<string, number>;
}

let cached: Templates | null = null;

function templates(): Templates {
  if (cached) return cached;
  const t: Templates = { flat: [], body: [], flatOf: new Map(), bodyOf: new Map() };
  const push = (list: THREE.Mesh[], map: Map<string, number>, key: string, draw: (b: ShapeBuilder) => boolean | void) => {
    const b = new ShapeBuilder(false, true);
    draw(b);
    if (b.empty) return;
    map.set(key, list.length);
    list.push(b.mesh(toon));
  };
  for (const type of ROADS) {
    for (let v = 0; v < variantsOf(type); v++) {
      push(t.flat, t.flatOf, `${type}:${v}`, (b) => roadBase(b, type, v));
      push(t.body, t.bodyOf, `${type}:${v}`, (b) => roadTop(b, type, v));
    }
    // Viền đất nện, sỏi không cần viền mực.
    if (type === 'duongDat' || type === 'duongSoi') push(t.flat, t.flatOf, `${type}:edge`, (b) => roadEdge(b, type));
    else push(t.body, t.bodyOf, `${type}:edge`, (b) => roadEdge(b, type));
  }
  for (const type of ['hoa', 'co', 'cau', 'rom', 'gieng'] as BuildingType[]) {
    for (let v = 0; v < variantsOf(type); v++) {
      push(t.flat, t.flatOf, `${type}:${v}`, (b) => smallFlat(b, type));
      push(t.body, t.bodyOf, `${type}:${v}`, (b) => smallBody(b, type, v));
    }
  }
  cached = t;
  return t;
}

/** Góc xoay của viền theo mép: +z, −z, +x, −x. */
const EDGE_RY = [0, Math.PI, Math.PI / 2, -Math.PI / 2];

/**
 * Vẽ mọi ô đường và đồ trang trí một ô thành một nhóm: mỗi mẫu một InstancedMesh (có viền mực nếu cần).
 * Đường xoay theo nấc 90° cho khớp ô; cây cau, hoa, rơm xoay tự do và to nhỏ chút ít.
 */
export function buildDecor(spots: DecorSpot[]): THREE.Object3D {
  const t = templates();
  const flat: Placement[] = [];
  const body: Placement[] = [];
  for (const s of spots) {
    const rand = seeded(s.seed);
    const v = Math.floor(rand() * variantsOf(s.type));
    const road = isRoad(s.type);
    const ry = road ? Math.floor(rand() * 4) * (Math.PI / 2) : s.type === 'gieng' || s.type === 'co' ? Math.floor(rand() * 4) * (Math.PI / 2) : rand() * Math.PI * 2;
    const k = road || s.type === 'gieng' || s.type === 'co' ? 1 : 0.88 + rand() * 0.2;
    const at = (list: Placement[], map: Map<string, number>, key: string, r = ry, sc = k) => {
      const i = map.get(key);
      if (i !== undefined) list.push({ t: i, x: s.x, y: s.y, z: s.z, s: sc, ry: r });
    };
    at(flat, t.flatOf, `${s.type}:${v}`);
    at(body, t.bodyOf, `${s.type}:${v}`);
    if (road && s.open) {
      s.open.forEach((open, side) => {
        if (!open) return;
        at(flat, t.flatOf, `${s.type}:edge`, EDGE_RY[side], 1);
        at(body, t.bodyOf, `${s.type}:edge`, EDGE_RY[side], 1);
      });
    }
  }
  const g = new THREE.Group();
  const flats = instanceTemplates(t.flat, flat);
  // Nền đường, thảm cỏ nằm sát đất: nhận bóng, không đổ bóng.
  flats.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = false;
  });
  g.add(flats, instanceTemplates(t.body, body, thinOutline));
  return g;
}

// ---------- Mô hình từng cái ----------

/** Cây đa cổ thụ đầu làng: gốc đại thụ nhiều thân xoắn quyện, rễ bạnh bò rộng khắp gò đất, hàng chục rễ phụ buông rủ & hóa cột, tán lá nhiều tầng xòe rộng gấp đôi, am thờ dưới gốc. */
function makeCayDa(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  const rand = seeded(2027);
  const BARK = [C.trunk, 0x5c3b22, 0x7a5232, 0x4e321c] as const;
  const LEAF = [C.leaf[0], C.leaf[1], C.leaf[2], C.leaf[3], 0x466629, 0x92b055] as const;

  // 1. Gò đất cổ thụ rộng kín móng & vòng đá tảng rêu phong kè quanh gốc đa
  p.cyl(0.53, 0.56, 0.055, C.earthDark, 0, 0.027, 0, undefined, 16);
  p.cyl(0.44, 0.49, 0.065, C.soil, 0, 0.06, 0, undefined, 14);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.1;
    const r = 0.44 + (i % 2) * 0.03;
    p.sphere(0.055 + (i % 3) * 0.012, i % 2 ? C.rock : C.rockDark, Math.cos(a) * r, 0.065, Math.sin(a) * r, [1.35, 0.7, 1.15], 6);
  }

  // 2. Thân chính đại thụ & 8 thân phụ cổ thụ xoắn quyện vào nhau
  p.cyl(0.17, 0.25, 0.94, C.trunk, 0, 0.52, 0, undefined, 10);
  const subTrunks: [number, number, number, number, number, number, number][] = [
    [0.13, 0.07, 0.07, 0.11, 0.88, 0.18, -0.2],
    [-0.12, 0.08, 0.065, 0.105, 0.86, -0.16, 0.18],
    [0.08, -0.12, 0.07, 0.11, 0.9, -0.2, -0.15],
    [-0.11, -0.1, 0.062, 0.1, 0.84, 0.16, 0.19],
    [0.16, -0.02, 0.055, 0.09, 0.8, 0.06, -0.25],
    [-0.16, 0.01, 0.058, 0.092, 0.82, -0.05, 0.24],
    [0.02, -0.16, 0.055, 0.09, 0.82, -0.24, 0.04],
    [-0.03, 0.14, 0.05, 0.082, 0.78, 0.22, -0.05],
  ];
  subTrunks.forEach(([x, z, rt, rb, h, rx, rz], i) => {
    p.cyl(rt, rb, h, BARK[i % BARK.length], x, h / 2 + 0.06, z, [rx, 0, rz], 7);
  });

  // 3. Hệ rễ bạnh nổi u cục & bò lan ngoằn ngoèo ra khắp mặt gò đất (16 rễ lớn 2 đoạn)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.15;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const col = BARK[i % BARK.length];
    // Đoạn rễ bạnh vồng cao từ thân xuống gốc
    p.cyl(0.036, 0.075, 0.38, col, ca * 0.22, 0.2, sa * 0.22, [sa * 0.95, 0, -ca * 0.95], 6);
    // Đoạn rễ bò lan ngoằn ngoèo ra tận mép gò đất
    p.cyl(0.02, 0.046, 0.34, col, ca * 0.4, 0.07, sa * 0.4, [sa * 1.4, 0, -ca * 1.4], 5);
  }

  // Dải lụa đỏ & viền kim tuyến buộc quanh gốc đa thần
  m.band.cyl(0.24, 0.25, 0.05, C.red, 0, 0.43, 0, undefined, 14);
  p.cyl(0.252, 0.252, 0.015, C.gold, 0, 0.456, 0, undefined, 14);

  // 4. 10 cành cái cổ thụ vươn dài đỡ tán rộng + 10 nhánh phụ vươn xa ra vành tán ngoài
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.25;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const col = BARK[i % BARK.length];
    // Cành cái tầng trong vươn rộng
    p.cyl(0.048, 0.082, 0.68, col, ca * 0.28, 0.98, sa * 0.28, [sa * 1.15, 0, -ca * 1.15], 6);
    // Nhánh phụ vươn xa ra đỡ vành tán ngoài
    const a2 = a + (i % 2 ? 0.14 : -0.14);
    p.cyl(0.028, 0.048, 0.54, col, Math.cos(a2) * 0.62, 1.12, Math.sin(a2) * 0.62, [Math.sin(a2) * 1.28, 0, -Math.cos(a2) * 1.28], 5);
  }

  // 5. Tán lá đa cổ thụ 4 tầng xòe rộng gấp đôi (bán kính ngang ~1.06, khi phóng theo móng vươn rộng 3,7×3,7 ô)
  // Tầng lõi chính giữa rộng và dẹt như ô dù khổng lồ
  p.sphere(0.56, C.leaf[2], 0, 1.26, 0, [1.65, 0.52, 1.65], 12);
  // Tầng vành ngoài cùng: 12 cụm tán lá lớn vươn xa tạo bóng mát rộng quanh gốc
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + (rand() - 0.5) * 0.1;
    const dist = 0.72 + (i % 2) * 0.05;
    const r = 0.24 + (i % 3) * 0.02;
    const y = 1.1 + (i % 3) * 0.05;
    p.sphere(r, LEAF[i % LEAF.length], Math.cos(a) * dist, y, Math.sin(a) * dist, [1.3, 0.52, 1.3], 9);
  }
  // Tầng đệm giữa: 10 vòm lá dày nối liền tâm và vành ngoài
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const dist = 0.46 + (i % 2) * 0.06;
    const r = 0.28 + (i % 3) * 0.025;
    p.sphere(r, LEAF[(i + 2) % LEAF.length], Math.cos(a) * dist, 1.32 + (i % 2) * 0.06, Math.sin(a) * dist, [1.35, 0.56, 1.35], 9);
  }
  // Tầng vòm trên & chóp lá non đón nắng: 7 cụm vòm tạo dáng cổ thụ hùng vĩ
  for (const [x, y, z, r, c] of [
    [0.0, 1.52, 0.0, 0.38, C.leaf[1]],
    [-0.28, 1.44, 0.2, 0.28, C.leaf[3]],
    [0.3, 1.43, 0.18, 0.27, 0x92b055],
    [-0.22, 1.42, -0.28, 0.27, C.leaf[0]],
    [0.24, 1.44, -0.24, 0.26, C.leaf[1]],
    [0.04, 1.62, -0.02, 0.26, 0x92b055],
    [-0.12, 1.56, 0.08, 0.22, C.leaf[3]],
  ] as const) {
    p.sphere(r, c, x, y, z, [1.35, 0.58, 1.35], 9);
  }

  // 6. Rễ phụ (rễ khí sinh): 14 rễ cột lớn chạm đất hóa thân phụ + 32 rễ khí sinh buông rủ thành từng chùm dày đặc
  for (let i = 0; i < 14; i++) {
    // Chừa khoảng trống nhỏ phía trước (a ~ PI/2) cho am thờ
    const a = -Math.PI * 0.36 + (i / 13) * Math.PI * 1.72;
    const r = 0.3 + (i % 3) * 0.08 + rand() * 0.04;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const topH = 1.08 + (i % 2) * 0.07;
    const col = BARK[(i + 1) % BARK.length];
    const thick = i % 2 === 0 ? 0.025 : 0.019;
    p.cyl(thick * 0.75, thick * 1.3, topH, col, x, topH / 2 + 0.02, z, [(rand() - 0.5) * 0.08, 0, (rand() - 0.5) * 0.08], 5);
    // Chạc rễ phụ tách đôi bám chặt xuống đất ở chân mỗi rễ cột
    for (const s of [-1, 1]) {
      const fa = a + s * 0.45;
      p.cyl(thick * 0.45, thick * 0.9, 0.2, col, x + Math.cos(fa) * 0.032, 0.09, z + Math.sin(fa) * 0.032, [Math.sin(fa) * 0.65, 0, -Math.cos(fa) * 0.65], 4);
    }
  }
  // 32 rễ khí sinh buông rủ dày đặc từ cả vòng cành trong lẫn vành tán rộng bên ngoài
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2 + rand() * 0.18;
    const r = 0.24 + (i % 4) * 0.14 + rand() * 0.08;
    const len = 0.4 + rand() * 0.56;
    const yTop = 1.06 + (i % 3) * 0.06;
    const col = i % 3 === 0 ? 0x855b38 : i % 2 === 0 ? 0x6f4a2c : 0x5c3b22;
    p.cyl(
      0.01,
      0.005,
      len,
      col,
      Math.cos(a) * r,
      yTop - len / 2,
      Math.sin(a) * r,
      [(rand() - 0.5) * 0.1, 0, (rand() - 0.5) * 0.1],
      4,
    );
  }

  // 7. Am thờ cổ dưới gốc đa, quay ra mặt trước (+z): bệ đá xanh, miếu tường vôi, cột son, bát hương đồng & mái ngói 2 tầng
  p.box(0.14, 0.1, 0.11, C.rockDark, 0, 0.05, 0.42);
  p.box(0.12, 0.03, 0.1, C.rock, 0, 0.11, 0.42);
  p.box(0.1, 0.085, 0.08, C.cream, 0, 0.165, 0.415);
  for (const sx of [-1, 1]) p.cyl(0.009, 0.009, 0.085, C.red, sx * 0.046, 0.165, 0.455, undefined, 5);
  p.box(0.044, 0.052, 0.012, C.red, 0, 0.155, 0.456);
  p.cyl(0.016, 0.012, 0.022, C.bronze, 0, 0.135, 0.472, undefined, 6);
  p.cone(0.105, 0.055, 0xc8643a, 0, 0.225, 0.42, [0, Math.PI / 4, 0], 4);
  p.cone(0.075, 0.048, 0xb4573a, 0, 0.26, 0.42, [0, Math.PI / 4, 0], 4);
  return m.group();
}

/** Ao làng (vẽ theo móng cũ 2×2): bờ đất, mặt nước, lá sen và hoa sen, lau sậy, đá kè, cầu ao bằng gỗ ở mặt trước. */
function makeAo(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  const rand = seeded(1945);
  p.add(new THREE.CylinderGeometry(0.97, 0.99, 0.04, 28), LAWN, 0, 0.02, 0, [0, 0, 0], [1, 1, 0.92]);
  p.add(new THREE.CylinderGeometry(0.9, 0.93, 0.05, 28), C.soil, 0, 0.035, 0, [0, 0, 0], [1, 1, 0.9]);
  p.add(new THREE.CylinderGeometry(0.8, 0.8, 0.03, 28), POND, 0, 0.055, 0, [0, 0, 0], [1, 1, 0.88]);
  // Lá sen nổi trên mặt nước.
  const leaves: [number, number][] = [];
  for (let i = 0; i < 11; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.2 + rand() * 0.45;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r * 0.85;
    leaves.push([x, z]);
    p.cyl(0.08 + rand() * 0.05, 0.08 + rand() * 0.05, 0.012, LOTUS_LEAF[i % 3], x, 0.076, z, undefined, 10);
  }
  // Hoa sen nở và nụ sen trên cuống.
  for (const [x, z] of leaves.slice(0, 3)) {
    p.cyl(0.006, 0.006, 0.08, LOTUS_LEAF[0], x + 0.04, 0.11, z, undefined, 4);
    p.cone(0.055, 0.07, LOTUS, x + 0.04, 0.17, z, undefined, 7);
    p.cone(0.03, 0.06, LOTUS_LIGHT, x + 0.04, 0.19, z, undefined, 6);
  }
  for (const [x, z] of leaves.slice(3, 5)) {
    p.cyl(0.006, 0.006, 0.12, LOTUS_LEAF[2], x - 0.03, 0.13, z, undefined, 4);
    p.sphere(0.03, LOTUS, x - 0.03, 0.2, z, [1, 1.5, 1], 6);
  }
  // Lau sậy ở bờ sau, đá kè rải quanh bờ.
  for (let i = 0; i < 8; i++) {
    const a = Math.PI + 0.3 + (i / 8) * 1.6;
    const h = 0.22 + rand() * 0.14;
    p.cone(0.014, h, i % 2 ? C.bamboo : GRASS[2], Math.cos(a) * 0.84, 0.06 + h / 2, Math.sin(a) * 0.78, [0, 0, (rand() - 0.5) * 0.3], 4);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    p.sphere(0.05 + rand() * 0.03, i % 2 ? C.rock : C.rockDark, Math.cos(a) * 0.86, 0.06, Math.sin(a) * 0.79, [1.3, 0.6, 1], 6);
  }
  // Cầu ao: ba tấm ván gỗ chìa từ bờ trước ra nước, bốn cọc đỡ.
  for (let i = 0; i < 3; i++) p.box(0.3, 0.025, 0.12, i % 2 ? C.woodLight : C.wood, 0.25, 0.1, 0.82 - i * 0.13);
  for (const dx of [-0.13, 0.13]) for (const z of [0.86, 0.58]) p.cyl(0.016, 0.016, 0.12, C.woodDark, 0.25 + dx, 0.06, z, undefined, 5);
  return m.group();
}

/** Mô hình một ô đường hay món trang trí một ô (bóng khi đặt, ảnh kiểm tra): như vẽ theo lô, ô đường có viền đủ bốn mép. */
function singleModel(type: BuildingType): THREE.Group {
  const g = new THREE.Group();
  const flat = new ShapeBuilder();
  const body = new ToonModel(inkThin);
  if (isRoad(type)) {
    const road = type as RoadType;
    roadBase(flat, road, 0);
    roadTop(body.plain, road, 0);
    for (const ry of EDGE_RY) {
      const e = road === 'duongDat' || road === 'duongSoi' ? flat : body.plain;
      e.frame = new THREE.Matrix4().makeRotationY(ry);
      roadEdge(e, road);
      e.frame = null;
    }
  } else {
    smallFlat(flat, type);
    smallBody(body.plain, type, 0);
  }
  if (!flat.empty) g.add(flat.mesh(toon));
  g.add(...body.group().children);
  return g;
}

/** Mô hình đường hay đồ trang trí loại `type`, theo móng cũ như công trình (xem `footScale`). */
export function decorModel(type: BuildingType): THREE.Group {
  if (type === 'cayDa') return makeCayDa();
  if (type === 'ao') return makeAo();
  return singleModel(type);
}
