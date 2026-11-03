// Trang trí ô trống "Nét Đông Sơn": khóm cỏ, hoa dại, đá nhỏ tự mọc trên đất trống đã mở. Chỉ để nhìn, không thuộc
// state: mỗi ô gieo theo hạt giống của chính ô ấy (`wildSpots`), nên dựng hay dỡ công trình chỗ khác không làm cỏ
// chỗ này đổi chỗ. Ô có công trình, đường hay đồ trang trí, ô chưa mở (rừng) và sông thì không mọc gì. Gần Điện người
// qua lại nhiều nên thưa cỏ hơn, càng ra xa càng rậm. Vẽ theo lô bằng InstancedMesh (`buildWild`), mỗi mẫu một lần
// vẽ; mọi món nằm trọn trong ô của nó, không lấn sang ô bên cạnh.

import * as THREE from 'three';
import { GRID, RIVER_START } from '../game/map';
import { C } from './palette';
import { ShapeBuilder, instanceTemplates, seeded, type Placement } from './shapes';
import { inkThin, outlineOf, toon } from './toon';

export type WildKind = 'co' | 'hoa' | 'da';

/** Một món mọc trên ô trống: tâm món (tọa độ ô, ô (x, z) phủ x..x+1), mẫu, góc xoay, cỡ. */
export interface WildSpot {
  kind: WildKind;
  /** Mẫu thứ mấy của loại ấy. */
  v: number;
  x: number;
  z: number;
  ry: number;
  s: number;
}

/** Số mẫu mỗi loại: cỏ ba dáng, hoa ba màu (cúc dại vàng, hoa trắng, trinh nữ hồng), đá hai dáng. */
export const WILD_VARIANTS: Record<WildKind, number> = { co: 3, hoa: 3, da: 2 };
/** Bán kính mỗi loại ở cỡ 1 (ô đơn vị): món đặt cách mép ô ít nhất chừng này nhân cỡ. */
export const WILD_RADIUS: Record<WildKind, number> = { co: 0.15, hoa: 0.14, da: 0.15 };
/** Cỡ nhỏ nhất, lớn nhất của một món. */
const S_MIN = 0.8;
const S_MAX = 1.15;
/** Hai món trong cùng ô cách nhau ít nhất chừng này (tâm tới tâm), để không chồng lên nhau. */
const GAP = 0.26;

/** Độ rậm theo khoảng cách tới tâm Điện: thưa nhất trong chừng 4 ô, rậm dần tới chừng 18 ô trở ra. */
function wildness(x: number, z: number, center: { x: number; z: number } | null): number {
  if (!center) return 0.6;
  const d = Math.hypot(x + 0.5 - center.x, z + 0.5 - center.z);
  return Math.min(Math.max((d - 4) / 14, 0), 1);
}

/**
 * Các món mọc trên ô trống: ô đã mở (`mask`), không có công trình (`occ`, id công trình chiếm ô hay 0), không phải sông.
 * `center` là tâm Điện (tọa độ ô) để ô gần Điện sạch hơn; `skip` là các ô (`z * GRID + x`) có cây dại, tảng đá
 * (`game/cayDa.ts`) nên để trống. Mỗi ô gieo bằng hạt giống riêng của ô.
 */
export function wildSpots(mask: Uint8Array, occ: Int32Array, center: { x: number; z: number } | null, skip?: Set<number>): WildSpot[] {
  const out: WildSpot[] = [];
  for (let z = 0; z < RIVER_START; z++) {
    for (let x = 0; x < RIVER_START; x++) {
      const i = z * GRID + x;
      if (!mask[i] || occ[i] || skip?.has(i)) continue;
      const rand = seeded(Math.imul(x + 1, 0x2c1b3c6d) ^ Math.imul(z + 1, 0x297a2d39) ^ 0x51ed27);
      const w = wildness(x, z, center);
      const kinds: WildKind[] = [];
      // Bốc số theo một thứ tự cố định để mỗi ô luôn ra cùng một kết quả.
      const grass = rand();
      const extra = rand();
      const flower = rand();
      const stone = rand();
      if (grass < 0.22 + 0.4 * w) kinds.push('co');
      if (grass < 0.08 + 0.3 * w && extra < 0.6) kinds.push('co');
      if (flower < 0.05 + 0.11 * w) kinds.push('hoa');
      if (stone < 0.04 + 0.05 * w) kinds.push('da');
      const placed: WildSpot[] = [];
      for (const kind of kinds) {
        const s = S_MIN + rand() * (S_MAX - S_MIN);
        const room = 0.5 - WILD_RADIUS[kind] * s;
        let spot: WildSpot | null = null;
        // Thử vài chỗ, chỗ nào không chồng lên món đã đặt thì lấy.
        for (let k = 0; k < 4 && !spot; k++) {
          const px = x + 0.5 + (rand() * 2 - 1) * room;
          const pz = z + 0.5 + (rand() * 2 - 1) * room;
          if (placed.every((o) => Math.hypot(o.x - px, o.z - pz) >= GAP)) {
            spot = { kind, v: Math.floor(rand() * WILD_VARIANTS[kind]), x: px, z: pz, ry: rand() * Math.PI * 2, s };
          }
        }
        if (spot) placed.push(spot);
      }
      out.push(...placed);
    }
  }
  return out;
}

// ---------- Mẫu ----------

/** Lá cỏ: xanh sẫm hơn mặt đất cho nổi lên trên nền cỏ nhạt. */
const BLADE = [0x86a44a, 0x779840, 0x98b658, 0x6a8c3a];
/** Hoa dại theo mẫu: [cánh, nhụy]. Cúc dại vàng, hoa trắng nhụy vàng, trinh nữ hồng tím (bông tròn như quả bông). */
const WILD_FLOWERS: [number, number][] = [
  [0xf2c230, 0xa8661e],
  [0xf6f0e4, 0xf2c230],
  [0xe07ab8, 0xf0a8d4],
];

/** Khóm cỏ: lá nhọn chụm gốc, ngả ra ngoài. Mẫu sau nhiều lá hơn, cao hơn. */
function drawTuft(b: ShapeBuilder, v: number): void {
  const rand = seeded(v * 6151 + 29);
  const n = 6 + v;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.6;
    const h = 0.16 + v * 0.03 + rand() * 0.1;
    const lean = 0.2 + rand() * 0.22;
    const r = 0.025 + rand() * 0.025;
    const out = r + h * lean * 0.45;
    b.cone(0.034, h, BLADE[(i + v) % 4], Math.cos(a) * out, h / 2, Math.sin(a) * out, [Math.sin(a) * lean, 0, -Math.cos(a) * lean], 4);
  }
}

/**
 * Hoa dại: vài lá sát đất, cuống mảnh, bông nhỏ theo màu mẫu `v`. Trinh nữ (mẫu 2) có lá kép mảnh, bông tròn xù.
 * Dựng bằng khối ít mặt (hộp, trụ sáu cạnh, khối hai mươi mặt) vì hoa được nhân lên hàng trăm lần.
 */
function drawWildFlower(b: ShapeBuilder, v: number): void {
  const rand = seeded(v * 3571 + 41);
  const [petal, heart] = WILD_FLOWERS[v];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rand() * 0.5;
    const len = v === 2 ? 0.15 : 0.12;
    b.box(len, 0.012, v === 2 ? 0.035 : 0.055, C.leaf[i % 4], Math.cos(a) * 0.06, 0.025, Math.sin(a) * 0.06, [0, -a, 0.12]);
  }
  const blooms = v === 2 ? 3 : 4;
  for (let k = 0; k < blooms; k++) {
    const a = (k / blooms) * Math.PI * 2 + rand() * 0.8;
    const r = 0.03 + rand() * 0.06;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 0.16 + rand() * 0.09;
    b.cyl(0.007, 0.009, h, C.leaf[2], x, h / 2, z, undefined, 4);
    if (v === 2) {
      b.add(new THREE.IcosahedronGeometry(0.048, 0), petal, x, h + 0.02, z, [rand(), rand(), 0]);
      b.add(new THREE.IcosahedronGeometry(0.03, 0), heart, x, h + 0.04, z, [rand(), rand(), 0]);
    } else {
      b.cyl(0.052, 0.046, 0.018, petal, x, h + 0.01, z, undefined, 6);
      b.box(0.026, 0.018, 0.026, heart, x, h + 0.022, z, [0, a, 0]);
    }
  }
}

/** Đá nhỏ: một hòn to, một hai hòn nhỏ, đẽo góc cạnh, chân lẫn vào cỏ. Mẫu 1 có rêu trên lưng. */
function drawStones(b: ShapeBuilder, v: number): void {
  const rand = seeded(v * 2087 + 3);
  const stones: [number, number, number][] = v ? [[0, 0, 0.1], [0.09, -0.05, 0.05]] : [[-0.03, 0.01, 0.085], [0.08, 0.05, 0.055], [-0.06, -0.08, 0.04]];
  stones.forEach(([x, z, r], i) => {
    const color = i % 2 ? C.rockDark : C.rock;
    b.add(new THREE.DodecahedronGeometry(r, 0), color, x, r * 0.35, z, [rand() * 3, rand() * 3, rand() * 3], [1.2, 0.7, 1]);
  });
  if (v) b.sphere(0.05, C.leaf[2], -0.02, 0.1, 0.01, [1.3, 0.3, 1], 6);
  // Vài lá cỏ mọc ở chân đá.
  for (let i = 0; i < 3; i++) {
    const a = 1 + i * 2.1;
    b.cone(0.02, 0.1, BLADE[i], Math.cos(a) * 0.11, 0.05, Math.sin(a) * 0.11, [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], 4);
  }
}

interface Templates {
  meshes: THREE.Mesh[];
  /** Chỉ số mẫu theo khóa `loại:mẫu`. */
  of: Map<string, number>;
}

let cached: Templates | null = null;

/** Mẫu của mọi loại, dựng một lần. */
export function wildTemplates(): Templates {
  if (cached) return cached;
  const t: Templates = { meshes: [], of: new Map() };
  const draw: Record<WildKind, (b: ShapeBuilder, v: number) => void> = { co: drawTuft, hoa: drawWildFlower, da: drawStones };
  for (const kind of Object.keys(WILD_VARIANTS) as WildKind[]) {
    for (let v = 0; v < WILD_VARIANTS[kind]; v++) {
      const b = new ShapeBuilder(false, true);
      draw[kind](b, v);
      t.of.set(`${kind}:${v}`, t.meshes.length);
      t.meshes.push(b.mesh(toon));
    }
  }
  cached = t;
  return t;
}

/** Viền mực dựng một lần cho mỗi mẫu, dùng lại mỗi lần vẽ lại lô. */
const outlines = new WeakMap<THREE.BufferGeometry, THREE.Mesh>();
const thinOutline = (geo: THREE.BufferGeometry) => {
  let o = outlines.get(geo);
  if (!o) {
    o = outlineOf(geo, inkThin);
    outlines.set(geo, o);
  }
  return o;
};

/**
 * Vẽ mọi món trên ô trống thành một nhóm, mỗi mẫu một InstancedMesh có viền mực. `ground(x, z)` cho mặt đất (tọa độ
 * thế giới) ở điểm (x, z) tính theo ô; `wx`, `wz` đổi tọa độ ô sang tọa độ thế giới. Món nhỏ sát đất: nhận bóng mà không đổ bóng.
 */
export function buildWild(spots: WildSpot[], ground: (x: number, z: number) => number, toWorld: (v: number) => number): THREE.Object3D {
  const t = wildTemplates();
  const list: Placement[] = [];
  for (const s of spots) {
    const i = t.of.get(`${s.kind}:${s.v}`);
    if (i === undefined) continue;
    list.push({ t: i, x: toWorld(s.x), y: ground(s.x, s.z), z: toWorld(s.z), s: s.s, ry: s.ry });
  }
  const g = instanceTemplates(t.meshes, list, thinOutline);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = false;
  });
  return g;
}

/** Gỡ lô đã vẽ: trả bộ nhớ vị trí các bản sao, giữ lại mẫu và viền mực để dùng tiếp. */
export function disposeWild(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) o.dispose();
  });
}
