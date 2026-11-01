// Mô hình "Nét Đông Sơn": người, lính, tướng, thuyền, cây cối, lũy, đê và thành Cổ Loa. Công trình nằm ở buildings.ts.
// Gốc tọa độ của mỗi mô hình là tâm chân móng, mặt trước hướng +z.

import * as THREE from 'three';
import type { FighterKind } from '../game/battle';
import { bakeBeast, isBeast } from './beasts';
import { bakeThuyTinh, makeAnDuong, makeGiong, makeSonTinh } from './heroes';
import { bakeMonster, isMonster } from './monsters';
import { makeRower } from './people';
import { C } from './palette';
import { ShapeBuilder, instanceTemplates, seeded, type Placement } from './shapes';
import { bakeSoldier, isSoldier } from './soldier';
import { ToonModel, inkThin, outlineOf, toon } from './toon';
import { crossbowParts } from './weapons';

/** Một chỗ mọc cây, tọa độ thế giới. `seed` giữ cho mỗi cây khác nhau nhưng không đổi giữa các lần vẽ. */
export interface TreeSpot {
  x: number;
  z: number;
  /** Độ cao mặt đất chỗ cây mọc, bỏ trống là mặt phẳng. */
  y?: number;
  kind: 'tree' | 'bamboo';
  seed: number;
}

/** Một đoạn lũy, tọa độ thế giới của tâm ô. Cấp 1 là lũy tre, cấp 2 là thành đất. */
export interface WallSpot {
  x: number;
  /** Mặt đất dưới chân. */
  y?: number;
  z: number;
  seed: number;
  level: number;
  /** Bị giặc phá, chỉ còn đống đổ nát. */
  damaged: boolean;
}

/**
 * Lính trong trận. Lính đi bộ (quân ta, giặc Ân, quân Triệu; soldier.ts), thú và người cưỡi (voi chiến, chiến xa,
 * kỵ binh, Triệu Đà, hổ tinh, gà trắng; beasts.ts) có khung xương: ở đây trả về bản tĩnh đứng nghỉ.
 * Thủy quái, quỷ núi, ma trơi (monsters.ts) và các tướng (heroes.ts) cũng có khung xương.
 * `tier`: bậc binh khí đã rèn ở lò rèn (0–2) của giáo binh, cung thủ, voi chiến:
 * - giáo binh: bậc 1 đầu giáo sắt, bậc 2 thêm tua đỏ và khiên viền sắt (soldier.ts);
 * - cung thủ: bậc 1 mũi tên sắt trong bao tên da, bậc 2 cung sừng và bao tên đồng (soldier.ts);
 * - voi chiến: bậc 1 giáp trán sắt, bậc 2 giáp ngà và bành có lọng.
 */
export function makeFighter(kind: FighterKind, tier = 0): THREE.Group {
  if (kind === 'giong') return makeGiong('trangSi');
  if (kind === 'sonTinh') return makeSonTinh();
  if (kind === 'anDuong') return makeAnDuong({ crossbow: true });
  if (isSoldier(kind)) return bakeSoldier(kind, tier);
  if (isBeast(kind)) return bakeBeast(kind, tier);
  if (isMonster(kind)) return bakeMonster(kind);
  if (kind === 'thuyTinh') return bakeThuyTinh();
  throw new Error(`Chưa có hình cho ${kind}`);
}

/** Thuyền buôn Lạc Việt cỡ lớn: thân thuyền Đông Sơn nẹp đồng, cột buồm có dây chằng, buồm cói căng gió nẹp nan tre, cờ hiệu và khoang hàng trù phú. Dài theo trục x. */
export function makeTradeBoat(): THREE.Group {
  const g = new THREE.Group();
  const hull = makeBoat();
  hull.scale.set(1.42, 1.2, 1.35);
  g.add(hull);

  const m = new ToonModel(inkThin);
  const p = m.plain;
  // Lan can tre dọc hai bên mạn thuyền buôn
  for (const sz of [-1, 1]) {
    p.cyl(0.016, 0.016, 1.45, C.bamboo, 0.02, 0.34, sz * 0.27, [0, 0, Math.PI / 2], 5);
    for (const x of [-0.62, -0.2, 0.22, 0.64]) p.cyl(0.014, 0.014, 0.14, C.woodDark, x, 0.27, sz * 0.27, undefined, 4);
  }
  // Bệ chân cột buồm bọc đồng & Cột buồm gỗ lim cao vút đặt trước mui thuyền (x = 0.28)
  const mx = 0.28;
  p.cyl(0.08, 0.095, 0.12, C.bronze, mx, 0.22, 0, undefined, 8);
  p.cyl(0.032, 0.046, 1.58, C.woodDark, mx, 0.99, 0, undefined, 7);
  p.cyl(0.048, 0.048, 0.05, C.bronze, mx, 1.74, 0, undefined, 7);
  p.cone(0.04, 0.11, C.gold, mx, 1.82, 0, undefined, 6);
  // Cờ đuôi nheo đỏ son viền vàng tung bay trên đỉnh cột buồm
  m.band.box(0.3, 0.1, 0.02, C.red, mx - 0.17, 1.74, 0, [0, 0, 0.06]);
  p.cone(0.05, 0.16, C.red, mx - 0.38, 1.73, 0, [0, 0, Math.PI / 2 + 0.06], 4);

  // Dây chằng cột buồm nối xuống hai bên mạn thuyền
  for (const sz of [-1, 1]) {
    p.cyl(0.008, 0.008, 1.38, C.thatchDark, mx - 0.08, 0.96, sz * 0.14, [sz * 0.19, 0, -0.08], 4);
  }

  // Cánh buồm cói liền mảnh căng gió xoay nhẹ đón gió (ry = 0.28), có trục buồm gỗ trên/dưới và 4 thanh nan tre ngang
  const sailYaw = 0.28;
  const cs = Math.cos(sailYaw);
  const sn = Math.sin(sailYaw);
  m.band.box(0.048, 0.94, 0.78, C.cream, mx + 0.05, 1.15, 0, [0, sailYaw, 0.06]);
  for (const s of [-1, 1]) {
    const edgeZ = s * 0.38;
    p.box(0.054, 0.94, 0.045, C.red, mx + 0.05 + sn * edgeZ, 1.15, cs * edgeZ, [0, sailYaw, 0.06]);
  }
  for (const [by, rBar, col] of [
    [0.67, 0.022, C.woodDark],
    [0.91, 0.014, C.bamboo],
    [1.15, 0.014, C.bamboo],
    [1.39, 0.014, C.bamboo],
    [1.63, 0.022, C.woodDark],
  ] as const) {
    const bar = new THREE.CylinderGeometry(rBar, rBar, 0.88, 6);
    bar.rotateX(Math.PI / 2);
    bar.rotateY(sailYaw);
    p.add(bar, col, mx + 0.065 + (by - 1.15) * -0.06, by, 0);
  }

  // Khoang hàng hóa trù phú: chum gốm đất nung bịt vải đỏ, bao tải thóc buộc miệng & rương gỗ nẹp đồng
  for (const [jx, jz, sc] of [
    [0.64, -0.09, 1.0],
    [0.6, 0.11, 0.88],
    [0.8, 0.01, 0.82],
  ] as const) {
    p.sphere(0.105 * sc, 0xa85834, jx, 0.25, jz, [0.95, 1.2, 0.95], 8);
    p.cyl(0.068 * sc, 0.058 * sc, 0.032, C.red, jx, 0.36 * sc + 0.04, jz, undefined, 8);
    p.cyl(0.072 * sc, 0.072 * sc, 0.015, C.gold, jx, 0.34 * sc + 0.04, jz, undefined, 8);
  }
  // Bao tải lương thực & rương gỗ nẹp đồng phía sau mui
  for (const [sx, sz, col] of [
    [-0.48, -0.08, C.ripe],
    [-0.5, 0.09, C.thatch],
    [-0.66, 0.0, 0xd8b868],
  ] as const) {
    p.sphere(0.105, col, sx, 0.26, sz, [1.22, 0.85, 0.95], 7);
    p.cyl(0.032, 0.048, 0.045, C.thatchDark, sx, 0.34, sz, undefined, 5);
  }
  m.band.box(0.22, 0.15, 0.2, C.wood, -0.32, 0.26, 0.02);
  p.box(0.23, 0.025, 0.21, C.bronze, -0.32, 0.33, 0.02);

  g.add(m.group());
  return g;
}

/** Thuyền Lạc Việt như trên trống đồng Đông Sơn: thân độc mộc be ván uốn thon 2 đầu, mũi chạm Đầu Chim Lạc bằng đồng, đuôi vây cá, mui vòm cói nan tre & người lái đò. */
export function makeBoat(): THREE.Object3D {
  const m = new ToonModel();
  const p = m.plain;

  // 1. Đáy thuyền & Thân thuyền uốn thon về mũi (+x) và lái (-x)
  p.box(1.16, 0.08, 0.28, C.woodDark, 0, 0.04, 0);
  // Hai bên be mạn thuyền chạm hoa văn Đông Sơn
  for (const sz of [-1, 1]) {
    m.band.box(1.18, 0.13, 0.055, C.wood, 0, 0.12, sz * 0.175, [sz * 0.14, 0, 0]);
    p.box(1.2, 0.03, 0.045, C.woodDark, 0, 0.19, sz * 0.19);
    // Đoạn be thuyền vuốt thon về mũi (+x) và lái (-x)
    for (const dir of [1, -1]) {
      p.box(0.36, 0.12, 0.05, C.wood, dir * 0.72, 0.16, sz * 0.1, [0, -dir * sz * 0.42, dir * 0.32]);
    }
  }
  // Sàn ván gỗ lòng thuyền & 4 thanh thang thuyền (giằng ngang)
  p.box(1.12, 0.03, 0.3, C.woodLight, 0, 0.085, 0);
  for (const x of [-0.48, -0.22, 0.22, 0.48]) {
    p.box(0.06, 0.035, 0.36, C.woodDark, x, 0.155, 0);
  }

  // 2. Sống mũi (+x) & Sống đuôi (-x) cong vút kiểu thuyền trống đồng Ngọc Lũ
  for (const dir of [1, -1]) {
    p.box(0.36, 0.1, 0.18, C.woodDark, dir * 0.72, 0.16, 0, [0, 0, dir * 0.46]);
    p.box(0.24, 0.09, 0.11, C.woodDark, dir * 0.9, 0.29, 0, [0, 0, dir * 0.85]);
    p.cyl(0.038, 0.052, 0.22, C.woodDark, dir * 0.98, 0.42, 0, [0, 0, -dir * 0.22], 6);
    p.cyl(0.048, 0.048, 0.04, C.bronze, dir * 0.95, 0.34, 0, [0, 0, -dir * 0.35], 6);
  }
  // Đầu mũi thuyền (+x): Đầu Chim Lạc bằng đồng có mào lông vũ & mỏ dài
  p.sphere(0.058, C.bronze, 1.0, 0.51, 0, [1.15, 0.95, 0.85], 7);
  p.cone(0.038, 0.16, C.gold, 1.07, 0.51, 0, [0, 0, -Math.PI / 2 + 0.08], 5);
  for (const s of [-1, 1]) p.sphere(0.016, C.gold, 1.01, 0.525, s * 0.045, [1, 1, 0.6], 5);
  // Mào lông vũ đồng uốn ra sau trên đỉnh đầu chim Lạc
  for (let k = 0; k < 3; k++) {
    p.cone(0.018, 0.11, k === 0 ? C.gold : C.bronze, 0.95 - k * 0.028, 0.56 - k * 0.015, 0, [0, 0, 0.68 + k * 0.18], 4);
  }
  // Đuôi thuyền (-x): Vây đuôi cá chạm đồng & cọc chèo lái
  p.cone(0.065, 0.16, C.bronze, -1.03, 0.52, 0, [0, 0, Math.PI * 0.35], 4);
  p.cone(0.045, 0.12, C.gold, -1.05, 0.45, 0, [0, 0, Math.PI * 0.58], 4);

  // 3. Mui thuyền vòm cói đan có khung cạp tre & vật dụng trong thuyền
  p.add(
    new THREE.CylinderGeometry(0.21, 0.21, 0.52, 10, 1, false, -Math.PI * 0.48, Math.PI * 0.96),
    C.thatch,
    -0.06,
    0.18,
    0,
    [0, 0, Math.PI / 2],
    [1.1, 1, 1.02],
  );
  // 4 vành khung nan tre uốn quanh vòm mui & đòn nóc tre
  for (const x of [-0.3, -0.14, 0.02, 0.18]) {
    p.add(
      new THREE.CylinderGeometry(0.218, 0.218, 0.024, 10, 1, false, -Math.PI * 0.48, Math.PI * 0.96),
      C.bamboo,
      x,
      0.18,
      0,
      [0, 0, Math.PI / 2],
      [1.1, 1, 1.02],
    );
  }
  p.cyl(0.015, 0.015, 0.56, C.bamboo, -0.06, 0.415, 0, [0, 0, Math.PI / 2], 5);
  // Giỏ cá tre & vò gốm đặt ở khoang mũi trước mui
  p.sphere(0.065, C.thatchDark, 0.33, 0.15, -0.06, [1, 1.15, 1], 7);
  p.cyl(0.038, 0.045, 0.03, C.bamboo, 0.33, 0.22, -0.06, undefined, 6);
  p.sphere(0.055, 0xa85834, 0.36, 0.14, 0.07, [1, 1.2, 1], 7);

  const g = m.group();
  const rower = makeRower();
  rower.scale.setScalar(0.75);
  rower.position.set(-0.55, 0.12, 0);
  rower.rotation.y = Math.PI / 2;
  g.add(rower);
  // Người lái đò chèo khi thuyền đi (world.ts gọi).
  g.userData.pose = rower.userData.pose;
  return g;
}

// ---------- Cây cối & Lũy tre ----------

const BAMBOO_SHADES = [C.bamboo, 0x6b8a38, 0x8cab4e, 0x5d7a2f] as const;
const LEAF_SHADES = [C.leaf[0], C.leaf[1], C.leaf[2], C.leaf[3], 0x466629, 0x92b055] as const;

function addTreeRoot(
  b: ShapeBuilder,
  pts: readonly (readonly [number, number, number])[],
  rStart: number,
  rEnd: number,
  color: number,
  segs = 5,
): void {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const samples = curve.getPoints(segs);
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < segs; i++) {
    const a = samples[i];
    const c = samples[i + 1];
    const d = c.clone().sub(a);
    const len = d.length();
    const mid = a.clone().addScaledVector(d, 0.5);
    q.setFromUnitVectors(up, d.normalize());
    e.setFromQuaternion(q);
    const r0 = rStart + (rEnd - rStart) * (i / segs);
    const r1 = rStart + (rEnd - rStart) * ((i + 1) / segs);
    b.cyl(r1, r0, len * 1.1, color, mid.x, mid.y, mid.z, [e.x, e.y, e.z], 5);
  }
}

/**
 * Độ chi tiết của cây rừng (như dân 0,6): rừng có cả nghìn cây, mỗi cây vài nghìn tam giác ở độ chi tiết đủ, nên
 * bớt mặt cầu, mặt trụ cho nhẹ máy điện thoại; dáng và màu giữ nguyên.
 */
const FOREST_DETAIL = 0.5;
const forestBuilder = () => {
  const b = new ShapeBuilder(false, true);
  b.detail = FOREST_DETAIL;
  return b;
};

function treeTemplates(): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];

  // 0: Cây gỗ lớn rừng Phong Châu (Chò chỉ / Lim cổ thụ): thân cao vút có rễ bạnh, 4 cành cái vươn xa nâng 5 tầng tán mây tách bạch.
  let b = forestBuilder();
  b.cyl(0.08, 0.16, 0.96, C.trunk, 0, 0.48, 0, [0.03, 0, -0.03], 7);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    addTreeRoot(
      b,
      [
        [ca * 0.08, 0.32, sa * 0.08],
        [ca * 0.2, 0.12, sa * 0.2],
        [ca * 0.36, 0.02, sa * 0.36],
      ],
      0.062,
      0.018,
      0x5a3a20,
      4,
    );
  }
  // Bốn cành cái vươn xa ở các độ cao lệch nhau, đỡ 4 tán lá tầng dưới & tầng giữa tách rời để lộ rõ chạc cây
  for (const [a, yBranch, len, tilt, distPad, yPad, rPad, c1, c2] of [
    [0.35, 0.82, 0.62, 1.02, 0.48, 0.98, 0.25, C.leaf[2], C.leaf[0]],
    [2.1, 0.92, 0.58, 0.98, 0.46, 1.1, 0.24, 0x466629, C.leaf[1]],
    [3.75, 1.02, 0.56, 0.95, 0.44, 1.2, 0.24, C.leaf[0], C.leaf[3]],
    [5.15, 1.12, 0.52, 0.9, 0.4, 1.3, 0.23, C.leaf[2], 0x92b055],
  ] as const) {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    b.cyl(0.028, 0.055, len, 0x5a3a20, ca * 0.22, yBranch, sa * 0.22, [sa * tilt, 0, -ca * tilt], 5);
    const px = ca * distPad;
    const pz = sa * distPad;
    b.sphere(rPad, c1, px, yPad, pz, [1.38, 0.46, 1.38], 7);
    b.sphere(rPad * 0.75, c2, px * 0.86, yPad + 0.09, pz * 0.86, [1.25, 0.5, 1.25], 7);
  }
  // Thân ngọn vươn cao đỡ tán đỉnh rừng nhiệt đới
  b.cyl(0.042, 0.078, 0.72, C.trunk, -0.02, 1.24, 0.02, [-0.04, 0, 0.05], 6);
  b.sphere(0.34, C.leaf[1], -0.03, 1.58, 0.02, [1.42, 0.48, 1.42], 8);
  b.sphere(0.26, C.leaf[3], 0.12, 1.68, -0.06, [1.3, 0.5, 1.3], 7);
  b.sphere(0.22, 0x92b055, -0.06, 1.76, 0.04, [1.22, 0.5, 1.22], 7);
  out.push(b.mesh(toon));

  // 1: Cây Đa rừng / Muỗm cổ thụ tán rộng: gốc nhiều thân xoắn và đại rễ bạnh bò rộng, 5 cành lớn vươn ngang buông rễ phụ, vòm lá nhiều tầng rộng rợp.
  b = forestBuilder();
  b.cyl(0.115, 0.195, 0.78, 0x5c3b22, 0, 0.39, 0, [-0.03, 0, 0.04], 7);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    addTreeRoot(
      b,
      [
        [ca * 0.09, 0.36, sa * 0.09],
        [ca * 0.24, 0.14, sa * 0.24],
        [ca * 0.44, 0.02, sa * 0.44],
      ],
      0.074,
      0.02,
      i % 2 === 0 ? C.trunk : 0x5a3a20,
      5,
    );
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    b.cyl(0.036, 0.065, 0.62, C.trunk, ca * 0.24, 0.82 + (i % 2) * 0.05, sa * 0.24, [sa * 1.08, 0, -ca * 1.08], 5);
    // Rễ phụ buông từ cành ngang xuống đất, có chạc rễ bám ở chân
    b.cyl(0.012, 0.02, 0.86, 0x6f4a2c, ca * 0.38, 0.44, sa * 0.38, undefined, 4);
    b.cyl(0.012, 0.028, 0.18, 0x6f4a2c, ca * 0.43, 0.06, sa * 0.43, [sa * 1.1, 0, -ca * 1.1], 4);
    b.sphere(0.26, LEAF_SHADES[i % 4], ca * 0.48, 0.98 + (i % 2) * 0.06, sa * 0.48, [1.35, 0.48, 1.35], 7);
  }
  b.sphere(0.42, C.leaf[2], 0, 1.16, 0, [1.48, 0.5, 1.48], 8);
  for (const [x, y, z, r, c] of [
    [-0.22, 1.3, 0.16, 0.26, C.leaf[1]],
    [0.24, 1.32, -0.14, 0.25, C.leaf[3]],
    [0.02, 1.42, 0.02, 0.3, C.leaf[1]],
    [-0.06, 1.54, -0.02, 0.21, 0x92b055],
  ] as const) {
    b.sphere(r, c, x, y, z, [1.32, 0.52, 1.32], 7);
  }
  out.push(b.mesh(toon));

  // 2: Cây Tùng / Sa Mộc núi đá: thân gỗ cao vút, cành ngang lộ dưới 4 tầng tán lá xếp bậc tự nhiên.
  b = forestBuilder();
  b.cyl(0.05, 0.12, 1.35, 0x5a3720, 0, 0.675, 0, undefined, 6);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.5;
    b.cyl(0.022, 0.048, 0.24, 0x5a3720, Math.cos(a) * 0.09, 0.11, Math.sin(a) * 0.09, [Math.sin(a) * 0.78, 0, -Math.cos(a) * 0.78], 4);
  }
  for (const [y, r, h, c, dx, dz] of [
    [0.74, 0.52, 0.34, 0x466629, 0.0, 0.0],
    [1.04, 0.43, 0.32, C.leaf[2], 0.02, -0.02],
    [1.32, 0.33, 0.3, C.leaf[1], -0.02, 0.02],
    [1.58, 0.22, 0.28, C.leaf[3], 0.0, 0.0],
  ] as const) {
    b.cone(r, h, c, dx, y, dz, undefined, 7);
    for (let k = 0; k < 4; k++) {
      const ka = (k / 4) * Math.PI * 2 + y;
      b.cone(r * 0.52, h * 0.75, c, dx + Math.cos(ka) * r * 0.45, y - 0.04, dz + Math.sin(ka) * r * 0.45, [Math.sin(ka) * 0.35, 0, -Math.cos(ka) * 0.35], 5);
    }
  }
  out.push(b.mesh(toon));

  // 3: Khóm Cau rừng / Cọ núi (2 thân mẹ-con uốn cong, có buồng quả và 9 tàu lá uốn cong 2 nhịp mềm mại).
  b = forestBuilder();
  for (const [ox, oz, h, tiltX, tiltZ, sc] of [
    [0, 0, 1.92, 0.04, -0.03, 1],
    [0.18, 0.12, 1.18, 0.15, 0.11, 0.76],
  ] as const) {
    const topX = ox + Math.sin(tiltZ) * -h * 0.45;
    const topZ = oz + Math.sin(tiltX) * h * 0.45;
    b.cyl(0.034 * sc, 0.06 * sc, h, C.palm, (ox + topX) * 0.5, h * 0.5, (oz + topZ) * 0.5, [tiltX, 0, tiltZ], 6);
    for (let k = 1; k <= 5; k++) {
      const t = k / 6;
      b.cyl(0.052 * sc, 0.052 * sc, 0.018, C.trunk, ox + (topX - ox) * t, h * t, oz + (topZ - oz) * t, [tiltX, 0, tiltZ], 6);
    }
    b.cyl(0.046 * sc, 0.038 * sc, 0.2 * sc, 0x6f8f44, topX, h + 0.04 * sc, topZ, undefined, 6);
    for (let q = 0; q < 4; q++) {
      const qa = (q / 4) * Math.PI * 2;
      b.sphere(0.036 * sc, q % 2 ? 0xd8963a : 0x6f8f2f, topX + Math.cos(qa) * 0.055 * sc, h - 0.06 * sc, topZ + Math.sin(qa) * 0.055 * sc, [1, 1.2, 1], 5);
    }
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + sc;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const col = LEAF_SHADES[(i + (sc < 1 ? 1 : 0)) % 4];
      b.box(0.32 * sc, 0.022 * sc, 0.1 * sc, col, topX + ca * 0.16 * sc, h + 0.12 * sc, topZ + sa * 0.16 * sc, [0, -a, -0.2]);
      b.box(0.32 * sc, 0.018 * sc, 0.082 * sc, col, topX + ca * 0.41 * sc, h + 0.01 * sc, topZ + sa * 0.41 * sc, [0, -a, -0.72]);
    }
  }
  out.push(b.mesh(toon));

  // 4 & 5: Hai mẫu bụi tre rừng tự nhiên (nhiều thân uốn cong 2 đoạn, có măng tre và tán lá mọc dọc nửa trên thân).
  out.push(bambooClump(5, 2.15, 4, false));
  out.push(bambooClump(6, 2.0, 19, false));
  return out;
}

/** Một chiếc lá tre nhỏ, dẹt, đầu nhọn hoắt như mũi mác, mọc từ gốc cuống `(x, y, z)` hướng ra theo góc `yaw` và độ rủ `pitch`. */
function addBambooLeaf(b: ShapeBuilder, x: number, y: number, z: number, yaw: number, pitch: number, len: number, w: number, color: number): void {
  const g = new THREE.ConeGeometry(w, len, 3);
  g.translate(0, len * 0.5, 0);
  g.scale(1, 1, 0.22);
  g.rotateX(pitch);
  g.rotateY(yaw);
  b.add(g, color, x, y, z);
}

/**
 * Khóm tre rừng (`mound = false`) hoặc đoạn Lũy Tre Làng kiên cố (`mound = true`):
 * - Thân tre thon dần từ gốc lên ngọn nhọn, uốn cong 3 nhịp tự nhiên, có đốt tre rõ ràng.
 * - Từ giữa thân (`~42%` chiều cao) lên tới đỉnh, tại mỗi mắt tre mọc ra các cành tre mảnh (tay tre) đối xứng so le,
 *   trên cành mang từng chùm 3–4 lá tre nhỏ nhọn hình mũi mác xòe rủ — hoàn toàn không có khối tán tròn như cây gỗ.
 * - Khi là lũy tre (`mound = true`): có bờ đất đắp 2 bậc phủ cỏ, thanh tre đan ngang buộc lũy, hàng cọc chông tre vót nhọn và măng tre ở gốc.
 */
function bambooClump(stalks: number, height: number, seed: number, mound: boolean): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  const yBase = mound ? 0.16 : 0;

  if (mound) {
    // Bờ đất đắp lũy 2 bậc + thảm cỏ mặt lũy
    b.box(0.98, 0.12, 0.98, C.earthDark, 0, 0.06, 0);
    b.box(0.88, 0.08, 0.88, C.soil, 0, 0.14, 0);
    b.box(0.8, 0.03, 0.8, C.grass[1], 0, 0.185, 0);
    // Hai thanh tre đan ngang buộc chặt hàng tre thành lũy phòng thủ
    for (const yRail of [0.42, 0.74]) {
      b.cyl(0.022, 0.022, 0.92, 0x8cab4e, 0, yRail, 0.17, [0, 0, Math.PI / 2], 5);
      b.cyl(0.02, 0.02, 0.92, C.bamboo, 0, yRail - 0.03, -0.17, [0, 0, Math.PI / 2], 5);
    }
    // Hàng cọc chông tre vót nhọn cắm chếch ở chân lũy
    for (let i = 0; i < 4; i++) {
      const sx = -0.33 + i * 0.22;
      const dir = i % 2 ? 1 : -1;
      b.cone(0.026, 0.34, 0x8cab4e, sx, 0.28, dir * 0.33, [dir * 0.48, 0, (rand() - 0.5) * 0.15], 4);
    }
  } else {
    // Mô đất nhỏ dưới chân bụi tre rừng
    b.cyl(0.3, 0.36, 0.045, C.earthDark, 0, 0.022, 0, undefined, 8);
  }

  // Măng tre non mọc ở gốc bụi tre
  for (let i = 0; i < 4; i++) {
    const ma = (i / 4) * Math.PI * 2 + rand() * 0.5;
    const mr = 0.14 + rand() * 0.18;
    b.cone(0.032, 0.2 + rand() * 0.08, 0x6b8a38, Math.cos(ma) * mr, yBase + 0.1, Math.sin(ma) * mr, [(rand() - 0.5) * 0.2, 0, (rand() - 0.5) * 0.2], 5);
  }

  // Các thân tre thon dần từ gốc lên ngọn, uốn cong 3 đoạn, cành và lá nhọn mọc từ giữa cây lên đỉnh
  for (let i = 0; i < stalks; i++) {
    const ringA = (i / stalks) * Math.PI * 2 + (rand() - 0.5) * 0.28;
    const ca = Math.cos(ringA);
    const sa = Math.sin(ringA);
    const dist = (i < 3 ? 0.06 : 0.2) + rand() * 0.12;
    const x0 = ca * dist;
    const z0 = sa * dist;
    const h = height * (0.82 + rand() * 0.28);
    const baseLean = (i < 3 ? 0.04 : 0.08) + rand() * 0.05;
    const rBase = 0.028 + (i % 3) * 0.004;
    const stalkCol = BAMBOO_SHADES[i % BAMBOO_SHADES.length];

    // Chia thân tre làm 6 lóng (nodes = 0..6) uốn cong dần ra ngoài và thon nhỏ dần lên đỉnh
    const pts: { x: number; y: number; z: number; r: number; lean: number }[] = [];
    let px = x0;
    let py = yBase;
    let pz = z0;
    const segs = 6;
    const segLen = h / segs;
    for (let s = 0; s <= segs; s++) {
      const f = s / segs;
      const lean = baseLean * (0.5 + f * f * 1.9);
      const r = rBase * (1.08 - f * 0.78);
      pts.push({ x: px, y: py, z: pz, r, lean });
      px += ca * Math.sin(lean) * segLen;
      py += Math.cos(lean) * segLen;
      pz += sa * Math.sin(lean) * segLen;
    }

    for (let s = 0; s < segs; s++) {
      const p0 = pts[s];
      const p1 = pts[s + 1];
      const mx = (p0.x + p1.x) * 0.5;
      const my = (p0.y + p1.y) * 0.5;
      const mz = (p0.z + p1.z) * 0.5;
      const lean = (p0.lean + p1.lean) * 0.5;
      const rx = sa * lean;
      const rz = -ca * lean;
      b.cyl(p1.r, p0.r, segLen * 1.02, stalkCol, mx, my, mz, [rx, 0, rz], 5);
      // Vòng đốt tre tại mỗi mắt
      if (s > 0) {
        b.cyl(p0.r + 0.0045, p0.r + 0.0045, 0.018, C.bronzeDark, p0.x, p0.y, p0.z, [rx, 0, rz], 5);
      }
    }

    // Từ giữa cây (mắt s = 2, tức ~33%–40% chiều cao) lên tới ngọn (s = 6): mọc cành tre mảnh và chùm lá tre nhỏ nhọn
    for (let s = 2; s <= segs; s++) {
      const pt = pts[s];
      const f = s / segs;
      // Mỗi mắt có 2 cành tre nhỏ mọc lệch hai bên
      const branchCount = s === segs ? 1 : 2;
      for (let br = 0; br < branchCount; br++) {
        const side = (s + br) % 2 ? 1 : -1;
        const bYaw = ringA + side * (0.55 + br * 0.45) + (rand() - 0.5) * 0.25;
        const bLen = (0.24 - f * 0.07) * (br === 0 ? 1 : 0.72);
        const bTilt = 0.72 + f * 0.22;
        const bSin = Math.sin(bTilt);
        const bCos = Math.cos(bTilt);
        const bxDir = Math.sin(bYaw) * bSin;
        const bzDir = Math.cos(bYaw) * bSin;
        const endX = pt.x + bxDir * bLen;
        const endY = pt.y + bCos * bLen;
        const endZ = pt.z + bzDir * bLen;

        if (s < segs) {
          // Cành tre mảnh mọc vươn từ đốt tre
          b.cyl(
            0.0035,
            0.0065,
            bLen,
            stalkCol,
            (pt.x + endX) * 0.5,
            (pt.y + endY) * 0.5,
            (pt.z + endZ) * 0.5,
            [bzDir * bTilt, 0, -bxDir * bTilt],
            4,
          );
        }

        // Chùm 3–4 lá tre nhỏ nhọn xòe hình chân vịt ở đầu cành và lưng cành
        const leaves = s === segs ? 4 : br === 0 ? 4 : 3;
        for (let l = 0; l < leaves; l++) {
          const spread = (l - (leaves - 1) * 0.5) * 0.42;
          const lYaw = bYaw + spread;
          const along = l === 0 || l === leaves - 1 ? 0.65 : 0.95;
          const lx = pt.x + bxDir * bLen * along;
          const ly = pt.y + bCos * bLen * along;
          const lz = pt.z + bzDir * bLen * along;
          const lPitch = 1.25 + (l % 2) * 0.28 + f * 0.15;
          const lLen = (0.16 + (l % 2) * 0.035) * (1.05 - f * 0.15);
          const lWidth = 0.02 + (l % 2) * 0.004;
          const lCol = LEAF_SHADES[(i + s + l) % LEAF_SHADES.length];
          addBambooLeaf(b, lx, ly, lz, lYaw, lPitch, lLen, lWidth, lCol);
        }
      }
    }
  }
  return b.mesh(toon);
}

/** Thành đất đắp (Lũy cấp 2): bờ đất nện 3 tầng vát kiên cố, mặt thành phủ cỏ, kè cọc gỗ và hàng chông tre vót nhọn. */
function earthWall(seed: number): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  b.box(1.0, 0.36, 1.0, C.earthDark, 0, 0.18, 0);
  b.box(0.9, 0.34, 0.9, C.earth, 0, 0.53, 0);
  b.box(0.8, 0.26, 0.8, C.earthDark, 0, 0.83, 0);
  b.box(0.74, 0.04, 0.74, C.grass[1], 0, 0.97, 0);
  // Cọc gỗ gia cố sườn thành đất
  for (const s of [-1, 1]) {
    for (const x of [-0.28, 0, 0.28]) {
      b.cyl(0.026, 0.03, 0.52, C.woodDark, x, 0.62, s * 0.42, [s * 0.08, 0, 0], 5);
    }
  }
  // Hàng chông tre vót nhọn cắm trên mặt thành và chĩa ra sườn
  for (let i = 0; i < 7; i++) {
    const x = (rand() - 0.5) * 0.56;
    const z = (rand() - 0.5) * 0.56;
    b.cone(0.038, 0.42, i % 2 ? C.bamboo : 0x8cab4e, x, 1.16, z, [(rand() - 0.5) * 0.32, 0, (rand() - 0.5) * 0.32], 4);
  }
  return b.mesh(toon);
}

/** Đoạn lũy bị phá: mô đất vỡ sạt, các thân tre có đốt và cọc chông gãy đổ ngổn ngang. */
function wallRubble(): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  b.box(0.92, 0.12, 0.92, C.earthDark, 0, 0.06, 0);
  b.box(0.52, 0.1, 0.46, C.soil, -0.12, 0.14, 0.08, [0, 0.35, 0.12]);
  b.cyl(0.035, 0.04, 0.82, C.bamboo, -0.1, 0.19, 0, [0, 0.4, Math.PI / 2 - 0.15], 5);
  b.cyl(0.032, 0.038, 0.68, 0x6b8a38, 0.15, 0.17, 0.2, [0, -0.6, Math.PI / 2 + 0.1], 5);
  b.cyl(0.03, 0.035, 0.58, 0x8cab4e, 0.05, 0.2, -0.22, [0.3, 0.8, Math.PI / 2 - 0.2], 5);
  b.cone(0.04, 0.32, C.bamboo, -0.25, 0.25, -0.2, [0.4, 0, 0.3], 4);
  b.cone(0.036, 0.28, 0x6b8a38, 0.24, 0.22, 0.12, [-0.35, 0, -0.4], 4);
  return b.mesh(toon);
}

let cachedTrees: THREE.Mesh[] | null = null;
let cachedWalls: THREE.Mesh[] | null = null;
const treeOutline = (geo: THREE.BufferGeometry) => outlineOf(geo, inkThin);

/** Dựng cả một khu rừng. Mỗi mẫu cây là một InstancedMesh có viền mực thanh thoát. */
export function buildForest(spots: TreeSpot[]): THREE.Object3D {
  cachedTrees ??= treeTemplates();
  const placements: Placement[] = spots.map((s) => {
    const r = seeded(s.seed);
    const pick = r();
    const t = s.kind === 'bamboo' ? (s.seed % 2 ? 5 : 4) : pick < 0.34 ? 0 : pick < 0.64 ? 1 : pick < 0.84 ? 2 : 3;
    return { t, x: s.x, y: s.y, z: s.z, s: 0.86 + r() * 0.32, ry: r() * Math.PI * 2 };
  });
  return instanceTemplates(cachedTrees, placements, treeOutline);
}

/** Cọc mốc ở góc khoảnh rừng phát được: cọc tre vót nhọn, buộc dải vải đỏ bay một bên. */
function stakeTemplate(): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  b.box(0.26, 0.08, 0.26, C.soil, 0, 0.04, 0);
  b.cyl(0.05, 0.065, 1.5, C.bamboo, 0, 0.75, 0, undefined, 5);
  b.cone(0.06, 0.18, C.bamboo, 0, 1.59, 0, undefined, 5);
  for (const y of [0.5, 1.0]) b.cyl(0.07, 0.07, 0.03, C.bronzeDark, 0, y, 0, undefined, 5);
  // Dải vải đỏ buộc gần đầu cọc, bay ngang như cờ.
  b.cyl(0.08, 0.08, 0.08, C.red, 0, 1.34, 0, undefined, 6);
  b.box(0.5, 0.16, 0.02, C.red, 0.28, 1.27, 0, [0, 0, -0.2]);
  b.box(0.36, 0.1, 0.02, C.red, 0.22, 1.12, 0.03, [0, 0.25, -0.45]);
  return b.mesh(toon);
}

let cachedStakes: THREE.Mesh[] | null = null;

/** Dựng các cọc mốc khoảnh rừng (tọa độ thế giới, mặt đất dưới chân). */
export function buildStakes(spots: { x: number; y: number; z: number; seed: number }[]): THREE.Object3D {
  cachedStakes ??= [stakeTemplate()];
  return instanceTemplates(
    cachedStakes,
    spots.map((s) => ({ t: 0, x: s.x, y: s.y, z: s.z, s: 1, ry: (s.seed % 8) * (Math.PI / 4) })),
    treeOutline,
  );
}

/** Dựng toàn bộ lũy: lũy tre là bụi tre dày đan cọc trên mô đất, thành đất là khối đất nện cắm chông, xoay ngẫu nhiên. */
export function buildWalls(spots: WallSpot[]): THREE.Object3D {
  cachedWalls ??= [bambooClump(11, 1.85, 3, true), bambooClump(12, 1.95, 9, true), earthWall(5), earthWall(11), wallRubble()];
  return instanceTemplates(
    cachedWalls,
    spots.map((s) => ({
      t: s.damaged ? 4 : (s.level >= 2 ? 2 : 0) + (s.seed % 2),
      x: s.x,
      y: s.y,
      z: s.z,
      s: 1,
      ry: (s.seed % 4) * (Math.PI / 2),
    })),
    treeOutline,
  );
}

/** Lều trại giặc Ân: mái vải sẫm căng trên cột, viền đỏ. */
export function makeTent(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  p.cone(0.9, 1.1, C.enemyCloth, 0, 0.55, 0, undefined, 6);
  m.band.cyl(0.92, 0.92, 0.12, C.enemyRed, 0, 0.08, 0, undefined, 6);
  p.cyl(0.03, 0.03, 0.4, C.woodDark, 0, 1.25, 0, undefined, 5);
  p.box(0.36, 0.22, 0.02, C.enemyRed, 0.18, 1.35, 0);
  return m.group();
}

/** Cờ lớn của giặc Ân cắm trên cột. */
export function makeEnemyFlag(h = 2.4): THREE.Group {
  const m = new ToonModel(inkThin);
  m.plain.cyl(0.04, 0.05, h, C.woodDark, 0, h / 2, 0, undefined, 6);
  m.band.box(0.7, 0.5, 0.03, C.enemyRed, 0.36, h - 0.3, 0);
  m.plain.cone(0.06, 0.16, C.bronze, 0, h + 0.08, 0, undefined, 5);
  return m.group();
}

/** Ngọn núi xa, đỉnh có mỏm đá. */
export function makeMountain(r: number, h: number, color: number): THREE.Group {
  const m = new ToonModel();
  m.plain.cone(r, h, color, 0, h / 2, 0, undefined, 9);
  m.plain.cone(r * 0.35, h * 0.3, C.rock, 0, h * 0.87, 0, undefined, 7);
  return m.group();
}

// ---------- Đê ----------

/** Một đoạn đê, tọa độ thế giới của tâm ô và mặt đất dưới chân. Cấp 1 là đê đất, cấp 2 là kè đá. */
export interface DikeSpot {
  x: number;
  y: number;
  z: number;
  level: number;
  damaged: boolean;
}

/** Đê đất: mô đất đắp thoai thoải, mặt đê phủ cỏ. Rộng trọn ô để các đoạn liền nhau thành một dải. */
function earthDike(): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  b.box(1.02, 0.22, 1.02, C.earthDark, 0, 0.11, 0);
  b.box(0.9, 0.22, 0.9, C.earth, 0, 0.33, 0);
  b.box(0.78, 0.1, 0.78, C.grass[1], 0, 0.49, 0);
  return b.mesh(toon);
}

/** Kè đá: đê cao hơn, mái đê lát đá hộc, mặt đê có lối đi lát đá. */
function stoneDike(): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(41);
  b.box(1.02, 0.3, 1.02, C.rockDark, 0, 0.15, 0);
  b.box(0.92, 0.3, 0.92, C.rock, 0, 0.45, 0);
  for (let i = 0; i < 6; i++) b.box(0.22, 0.12, 0.05, C.rockDark, -0.35 + (i % 3) * 0.35, 0.22 + Math.floor(i / 3) * 0.3, 0.5 + rand() * 0.02);
  b.box(0.8, 0.14, 0.8, C.grass[0], 0, 0.67, 0);
  b.box(0.3, 0.03, 0.82, C.rock, 0, 0.75, 0);
  return b.mesh(toon);
}

/** Đoạn đê vỡ: mô đất thấp sạt lở. */
function brokenDike(): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  b.box(0.95, 0.14, 0.95, C.earthDark, 0, 0.07, 0);
  b.box(0.4, 0.12, 0.5, C.earth, -0.2, 0.18, 0.1, [0, 0.4, 0.2]);
  b.box(0.3, 0.1, 0.3, C.rock, 0.25, 0.16, -0.2, [0.2, 0.5, 0]);
  return b.mesh(toon);
}

let cachedDikes: THREE.Mesh[] | null = null;

/** Dựng toàn bộ đê trong kinh đô. */
export function buildDikes(spots: DikeSpot[]): THREE.Object3D {
  cachedDikes ??= [earthDike(), stoneDike(), brokenDike()];
  return instanceTemplates(
    cachedDikes,
    spots.map((s) => ({ t: s.damaged ? 2 : s.level >= 2 ? 1 : 0, x: s.x, y: s.y, z: s.z, s: 1, ry: 0 })),
    treeOutline,
  );
}

// ---------- Thành Cổ Loa ----------

/** Một đoạn thành Cổ Loa, tọa độ thế giới của tâm ô và mặt đất dưới chân. */
export interface CitadelSpot {
  x: number;
  y: number;
  z: number;
  seed: number;
  damaged: boolean;
}

/**
 * Đoạn thành Cổ Loa: đất nện ba lớp cao gần gấp rưỡi thành đất của lũy, chân rộng trọn ô, mặt thành thu nhỏ;
 * bốn góc có ụ đất, giữa có cọc gỗ. `post`: có thêm chòi canh nhỏ lợp tranh trên mặt thành.
 */
function citadelWall(post: boolean): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  b.box(1.02, 0.5, 1.02, C.earthDark, 0, 0.25, 0);
  b.box(0.92, 0.5, 0.92, C.earth, 0, 0.75, 0);
  b.box(0.82, 0.36, 0.82, C.earthDark, 0, 1.18, 0);
  b.box(0.74, 0.04, 0.74, C.grass[1], 0, 1.37, 0);
  for (const x of [-0.32, 0.32]) for (const z of [-0.32, 0.32]) b.box(0.16, 0.2, 0.16, C.earth, x, 1.46, z);
  if (post) {
    for (const x of [-0.2, 0.2]) for (const z of [-0.2, 0.2]) b.cyl(0.03, 0.03, 0.55, C.woodDark, x, 1.65, z, undefined, 5);
    b.box(0.5, 0.05, 0.5, C.wood, 0, 1.6, 0);
    b.cone(0.42, 0.34, C.thatch, 0, 2.07, 0, undefined, 4);
  } else {
    for (const x of [-0.12, 0.12]) b.cone(0.04, 0.42, C.woodLight, x, 1.58, 0, undefined, 4);
  }
  return b.mesh(toon);
}

/** Đoạn thành bị phá: đống đất sạt thấp, vài tảng đất lăn ra. */
function citadelRubble(): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  b.box(1.0, 0.24, 1.0, C.earthDark, 0, 0.12, 0);
  b.box(0.7, 0.2, 0.6, C.earth, -0.1, 0.32, 0.05, [0, 0.3, 0.15]);
  b.box(0.3, 0.2, 0.3, C.earthDark, 0.3, 0.28, -0.25, [0.3, 0.6, 0]);
  b.cyl(0.03, 0.03, 0.5, C.woodLight, -0.2, 0.36, -0.2, [0, 0.5, Math.PI / 2 - 0.3], 4);
  return b.mesh(toon);
}

let cachedCitadel: THREE.Mesh[] | null = null;

/** Dựng toàn bộ thành Cổ Loa trong kinh đô. Mọi đoạn cùng hướng để ụ góc thẳng hàng thành răng cưa. */
export function buildCitadel(spots: CitadelSpot[]): THREE.Object3D {
  cachedCitadel ??= [citadelWall(false), citadelWall(true), citadelRubble()];
  return instanceTemplates(
    cachedCitadel,
    spots.map((s) => ({ t: s.damaged ? 2 : s.seed % 7 === 0 ? 1 : 0, x: s.x, y: s.y, z: s.z, s: 1, ry: 0 })),
    treeOutline,
  );
}

/** Cây nỏ đồng lớn đặt trên giá gỗ, như ở sân Đền Cổ Loa. Gốc ở chân giá. */
export function makeCrossbowStand(): THREE.Group {
  const m = new ToonModel(inkThin);
  for (const s of [-1, 1]) m.plain.cyl(0.04, 0.05, 0.55, C.woodDark, s * 0.18, 0.27, 0, [0, 0, s * 0.25], 5);
  m.plain.box(0.5, 0.06, 0.08, C.wood, 0, 0.52, 0);
  const g = m.group();
  const bow = new ToonModel(inkThin);
  crossbowParts(bow, true, 1.4);
  const b = bow.group();
  b.position.set(0, 0.62, 0.1);
  b.rotation.x = -0.25;
  g.add(b);
  return g;
}

// ---------- Chương 4: lính nỏ, thủy binh Triệu, thuyền giặc, ụ nỏ ----------

/** Thuyền giặc Triệu: thân đen dài, mũi cong vểnh lên như móc câu, cột buồm và buồm đỏ. Dài theo trục z (mũi ra trước). */
export function makeEnemyBoat(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  p.box(0.5, 0.22, 1.6, C.trieuCloth, 0, 0.11, 0);
  // Sàn gỗ sẫm, viền mạn đỏ chạy dọc hai bên.
  p.box(0.4, 0.02, 1.5, C.woodDark, 0, 0.225, 0);
  for (const sx of [-1, 1]) p.box(0.05, 0.06, 1.62, C.trieuRed, sx * 0.25, 0.24, 0);
  // Mũi cong vểnh như móc câu, đuôi vát lên.
  p.box(0.36, 0.12, 0.5, C.trieuCloth, 0, 0.28, 0.95, [-0.6, 0, 0]);
  p.cone(0.08, 0.34, C.trieuCloth, 0, 0.6, 1.16, [-0.2, 0, 0], 5);
  p.box(0.36, 0.12, 0.4, C.trieuCloth, 0, 0.24, -0.92, [0.5, 0, 0]);
  // Cột buồm và buồm đỏ hình chữ nhật có nẹp tre.
  p.cyl(0.03, 0.035, 1.5, C.woodDark, 0, 0.95, 0.15, undefined, 6);
  m.band.box(0.86, 0.8, 0.03, C.trieuRed, 0, 1.15, 0.12);
  for (const y of [0.85, 1.15, 1.45]) p.box(0.9, 0.025, 0.04, C.woodDark, 0, y, 0.12);
  // Mái chèo hai bên mạn.
  for (const s of [-1, 1]) for (const z of [-0.4, 0.3]) p.box(0.04, 0.04, 0.6, C.woodDark, s * 0.4, 0.12, z, [0, s * 0.9, s * 0.4]);
  return m.group();
}

/** Mặt thành Cổ Loa cao chừng này trên mặt đất (chỗ đặt ụ nỏ). */
export const CITADEL_TOP = 1.39;

/**
 * Ụ nỏ trên mặt thành Cổ Loa: ụ đất đắp cao, mái tranh che nhỏ, một lính nỏ quỳ bắn ra ngoài. Gốc ở mặt thành.
 * `broken`: ụ hư (thành đã sửa mà ụ chưa sửa): ụ đất sạt, cột gãy, không người.
 */
export function makeUNo(broken = false): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  p.box(0.62, 0.18, 0.62, C.earthDark, 0, 0.09, 0);
  if (broken) {
    p.box(0.42, 0.12, 0.36, C.earth, -0.05, 0.2, 0.04, [0, 0.4, 0.15]);
    p.cyl(0.025, 0.025, 0.4, C.woodDark, 0.12, 0.25, -0.1, [0, 0.6, Math.PI / 2 - 0.4], 5);
    p.cyl(0.025, 0.025, 0.3, C.woodDark, -0.18, 0.3, 0.15, undefined, 5);
    return m.group();
  }
  p.box(0.5, 0.14, 0.5, C.earth, 0, 0.25, 0);
  for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) p.cyl(0.025, 0.025, 0.5, C.woodDark, x, 0.55, z, undefined, 5);
  m.band.cone(0.4, 0.26, C.thatch, 0, 0.9, 0, [0, Math.PI / 4, 0], 4);
  const g = m.group();
  // Lính nỏ quỳ một gối nhắm ra ngoài thành (bản tĩnh của lính có xương).
  const man = bakeSoldier('no', 0, { act: 'fight', strike: 0.9 });
  man.scale.setScalar(0.5);
  man.position.set(0, 0.32, 0.05);
  g.add(man);
  return g;
}

