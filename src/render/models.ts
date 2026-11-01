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
import { ToonModel, inkThick, inkThin, outlineOf, toon } from './toon';
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

/** Thuyền buôn lớn: thân thuyền trống đồng dài hơn, cột buồm, buồm cói, khoang chở hàng. Dài theo trục x. */
export function makeTradeBoat(): THREE.Group {
  const g = new THREE.Group();
  const hull = makeBoat();
  hull.scale.set(1.45, 1.2, 1.35);
  g.add(hull);
  const m = new ToonModel(inkThin);
  const p = m.plain;
  p.cyl(0.035, 0.04, 1.5, C.woodDark, 0.15, 0.95, 0, undefined, 6);
  m.band.box(0.06, 0.9, 0.7, C.cream, 0.18, 1.15, 0, [0, 0, 0.05]);
  p.box(0.04, 0.04, 0.8, C.woodDark, 0.16, 1.62, 0);
  for (const [x, c] of [[-0.45, C.ripe], [-0.75, C.thatch], [0.55, C.rock]] as const) p.box(0.26, 0.2, 0.26, c, x, 0.42, 0);
  g.add(m.group());
  return g;
}

/** Thuyền như trên trống đồng: mũi và đuôi cong vút, đầu chim, có người lái đò. */
export function makeBoat(): THREE.Object3D {
  const m = new ToonModel();
  const p = m.plain;
  m.band.box(1.3, 0.16, 0.38, C.woodDark, 0, 0.08, 0);
  for (const dir of [1, -1]) {
    p.box(0.42, 0.1, 0.3, C.woodDark, dir * 0.78, 0.2, 0, [0, 0, dir * 0.6]);
    p.box(0.12, 0.26, 0.12, C.woodDark, dir * 0.98, 0.42, 0);
    p.cone(0.04, 0.16, C.bronze, dir * 1.08, 0.5, 0, [0, 0, -dir * Math.PI / 2], 4);
  }
  p.box(0.5, 0.24, 0.42, C.thatch, -0.1, 0.28, 0);
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

// ---------- Cây cối ----------

function treeTemplates(): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  // 0: cây tán tầng cách điệu.
  let b = new ShapeBuilder();
  b.cyl(0.06, 0.1, 0.7, C.trunk, 0, 0.35, 0, undefined, 6);
  b.cone(0.55, 0.45, C.leaf[2], 0, 0.85, 0, undefined, 7);
  b.cone(0.42, 0.4, C.leaf[1], 0, 1.15, 0, undefined, 7);
  b.cone(0.28, 0.36, C.leaf[3], 0, 1.43, 0, undefined, 7);
  out.push(b.mesh(toon));
  // 1: cây tán dẹt.
  b = new ShapeBuilder();
  b.cyl(0.06, 0.1, 0.9, C.trunk, 0, 0.45, 0, undefined, 6);
  b.sphere(0.5, C.leaf[0], 0, 1.05, 0, [1.2, 0.55, 1.2], 9);
  b.sphere(0.34, C.leaf[3], 0.05, 1.32, 0, [1.1, 0.5, 1.1], 9);
  out.push(b.mesh(toon));
  // 2: cây cau.
  b = new ShapeBuilder();
  b.cyl(0.035, 0.055, 1.9, C.palm, 0, 0.95, 0, undefined, 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.box(0.6, 0.03, 0.12, C.leaf[i % 3], Math.cos(a) * 0.28, 1.84, Math.sin(a) * 0.28, [0, -a, -0.45]);
  }
  out.push(b.mesh(toon));
  // 3: bụi tre.
  out.push(bambooClump(5, 2.1, 4, false));
  return out;
}

function bambooClump(stalks: number, height: number, seed: number, mound: boolean): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  if (mound) b.box(0.96, 0.12, 0.96, C.soil, 0, 0.06, 0);
  for (let i = 0; i < stalks; i++) {
    const x = (rand() - 0.5) * 0.55;
    const z = (rand() - 0.5) * 0.55;
    const h = height * (0.8 + rand() * 0.3);
    b.cyl(0.035, 0.04, h, C.bamboo, x, h / 2, z, undefined, 5);
    for (let k = 1; k < 4; k++) b.cyl(0.045, 0.045, 0.03, C.bronzeDark, x, (h * k) / 4, z, undefined, 5);
    for (let l = 0; l < 4; l++) {
      const a = rand() * Math.PI * 2;
      b.box(0.36, 0.02, 0.08, C.leaf[(i + l) % 4], x + Math.cos(a) * 0.15, h - l * 0.2, z + Math.sin(a) * 0.15, [0, -a, -0.5]);
    }
  }
  return b.mesh(toon);
}

/** Thành đất đắp: các lớp đất nện thu nhỏ dần lên trên, cắm cọc tre vót nhọn. */
function earthWall(seed: number): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  b.box(1.0, 0.36, 1.0, C.earthDark, 0, 0.18, 0);
  b.box(0.9, 0.34, 0.9, C.earth, 0, 0.53, 0);
  b.box(0.78, 0.26, 0.78, C.earthDark, 0, 0.83, 0);
  for (let i = 0; i < 4; i++) {
    const x = (rand() - 0.5) * 0.5;
    const z = (rand() - 0.5) * 0.5;
    b.cone(0.04, 0.4, C.bamboo, x, 1.15, z, [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3], 4);
  }
  return b.mesh(toon);
}

/** Đoạn lũy bị phá: mô đất thấp, vài cây tre gãy nằm ngổn ngang. */
function wallRubble(): THREE.Mesh {
  const b = new ShapeBuilder(false, true);
  b.box(0.9, 0.12, 0.9, C.earthDark, 0, 0.06, 0);
  b.cyl(0.035, 0.04, 0.8, C.bamboo, -0.1, 0.18, 0, [0, 0.4, Math.PI / 2 - 0.15], 5);
  b.cyl(0.035, 0.04, 0.6, C.bamboo, 0.15, 0.16, 0.2, [0, -0.6, Math.PI / 2 + 0.1], 5);
  b.cone(0.04, 0.3, C.bamboo, -0.25, 0.25, -0.2, [0.4, 0, 0.3], 4);
  return b.mesh(toon);
}

let cachedTrees: THREE.Mesh[] | null = null;
let cachedWalls: THREE.Mesh[] | null = null;
const treeOutline = (geo: THREE.BufferGeometry) => outlineOf(geo, inkThick);

/** Dựng cả một khu rừng. Mỗi mẫu cây là một InstancedMesh có viền mực. */
export function buildForest(spots: TreeSpot[]): THREE.Object3D {
  cachedTrees ??= treeTemplates();
  const placements: Placement[] = spots.map((s) => {
    const r = seeded(s.seed);
    const pick = r();
    const t = s.kind === 'bamboo' ? 3 : pick < 0.45 ? 0 : pick < 0.75 ? 1 : 2;
    return { t, x: s.x, y: s.y, z: s.z, s: 0.85 + r() * 0.3, ry: r() * Math.PI * 2 };
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

/** Dựng toàn bộ lũy: lũy tre là bụi tre trên mô đất, thành đất là khối đất nện, xoay ngẫu nhiên. */
export function buildWalls(spots: WallSpot[]): THREE.Object3D {
  cachedWalls ??= [bambooClump(5, 1.7, 3, true), bambooClump(5, 1.8, 9, true), earthWall(5), earthWall(11), wallRubble()];
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
