// Hình vẽ vùng đất bên kia sông: cầu qua sông ba cấp, mây mù phủ khoảnh chưa dò, dấu điểm lạ (đồn giặc, bản làng,
// đặc sản đất, của chôn) trên khoảnh đã dò. World gọi ở `createView` (cầu, qua `lotModel`), `syncFog`, `syncPois`.

import * as THREE from 'three';
import { RIVER_END, RIVER_START } from '../game/map';
import type { Poi } from '../game/benKia';
import { boatRoof, buildingModel, roofFor } from './buildings';
import { makeEnemyFlag, makeFighter, makeTent } from './models';
import { C } from './palette';
import { ShapeBuilder, seeded } from './shapes';
import { ToonModel } from './toon';

/** Mặt nước sông so với mặt bãi bậc 0 (gốc mô hình cầu). */
const RIVER_Y = -0.28;
/** Cầu vắt qua cả lòng sông. */
const SPAN = RIVER_END - RIVER_START;

/**
 * Cầu qua sông, vẽ dọc theo trục z (dài 7 ô vắt qua sông, rộng 2 ô), đầu bên này ở −z. Cấp 1 cầu phao tre: bảy bè tre
 * kết dây mây nổi trên mặt nước, nhấp nhô theo sóng, ván dốc lên hai bờ, cọc buộc dây. Cấp 2 cầu gỗ: mặt ván gỗ vồng
 * nhẹ trên hàng cột, lan can hai bên. Cấp 3 cầu gỗ lớn: vồng cao hơn, lan can sơn đỏ, lầu canh mái ngói ở đầu cầu bên này.
 */
export function makeBridge(level: number): THREE.Group {
  const out = new THREE.Group();
  const len = SPAN;
  const half = len / 2;
  if (level <= 1) {
    const raft = new ToonModel();
    const p = raft.plain;
    // Mỗi ô sông một bè tre, cây tre nằm ngang, hai đòn tre dọc ghìm bè.
    for (let k = 0; k < len; k++) {
      const z0 = -half + 0.5 + k;
      for (let i = 0; i < 9; i++) p.cyl(0.05, 0.05, 1.5, i % 2 ? C.bamboo : 0x8fae55, 0, 0, z0 - 0.4 + i * 0.1, [0, 0, Math.PI / 2], 6);
      for (const x of [-0.5, 0.5]) p.cyl(0.04, 0.04, 0.92, C.thatchDark, x, 0.05, z0, [Math.PI / 2, 0, 0], 5);
    }
    // Dây mây làm tay vịn, buộc vào cọc trên bè.
    for (const x of [-0.72, 0.72]) {
      for (let k = 0; k <= len; k++) p.cyl(0.03, 0.035, 0.45, C.woodDark, x, 0.2, -half + 0.1 + (k * (len - 0.2)) / len, undefined, 5);
      p.cyl(0.015, 0.015, len - 0.1, C.thatchDark, x, 0.38, 0, [Math.PI / 2, 0, 0], 4);
    }
    const g = raft.group();
    g.position.y = RIVER_Y + 0.08;
    // World cho các phần có `dock` nhấp nhô theo sóng.
    g.userData.dock = g.position.y;
    out.add(g);
    // Ván dốc từ hai bờ xuống bè, cọc buộc trên bờ.
    const banks = new ToonModel();
    for (const s of [-1, 1]) {
      banks.plain.box(1.2, 0.05, 0.5, C.woodLight, 0, -0.08, s * (half - 0.05), [s * 0.35, 0, 0]);
      for (const x of [-0.75, 0.75]) banks.plain.cyl(0.05, 0.06, 0.5, C.woodDark, x, 0.15, s * (half + 0.15), undefined, 6);
    }
    out.add(banks.group());
    return out;
  }
  const big = level >= 3;
  const m = new ToonModel();
  const p = m.plain;
  const width = big ? 1.55 : 1.35;
  const rise = big ? 0.5 : 0.28;
  /** Mặt cầu vồng lên giữa sông. */
  const deckY = (z: number) => 0.06 + rise * (1 - (z / half) ** 2);
  // Mặt ván ghép từng tấm, xen hai màu gỗ.
  const planks = len * 4;
  for (let i = 0; i < planks; i++) {
    const z = -half + (i + 0.5) * (len / planks);
    const slope = Math.atan((-2 * rise * z) / (half * half));
    p.box(width, 0.07, len / planks + 0.01, i % 2 ? C.wood : C.woodLight, 0, deckY(z), z, [slope, 0, 0]);
  }
  // Hàng cột gỗ cắm xuống lòng sông, có xà ngang đỡ mặt cầu.
  for (let k = 1; k < len; k++) {
    const z = -half + k;
    for (const x of [-width / 2 + 0.08, width / 2 - 0.08]) p.cyl(0.06, 0.07, deckY(z) - RIVER_Y + 0.25, C.woodDark, x, (deckY(z) + RIVER_Y - 0.25) / 2, z, undefined, 6);
    p.box(width + 0.1, 0.08, 0.1, C.woodDark, 0, deckY(z) - 0.08, z);
  }
  // Lan can hai bên: cột lan can và tay vịn; cầu lớn sơn đỏ.
  const rail = big ? C.red : C.woodDark;
  const posts = len * 2;
  for (const s of [-1, 1]) {
    const x = s * (width / 2 - 0.04);
    for (let i = 0; i <= posts; i++) {
      const z = -half + 0.1 + (i * (len - 0.2)) / posts;
      p.cyl(0.03, 0.03, 0.34, rail, x, deckY(z) + 0.2, z, undefined, 5);
    }
    for (let i = 0; i < posts; i++) {
      const z0 = -half + 0.1 + (i * (len - 0.2)) / posts;
      const z1 = -half + 0.1 + ((i + 1) * (len - 0.2)) / posts;
      const zm = (z0 + z1) / 2;
      const slope = Math.atan((deckY(z0) - deckY(z1)) / (z1 - z0));
      m.band.box(0.06, 0.05, z1 - z0 + 0.02, rail, x, deckY(zm) + 0.37, zm, [slope, 0, 0]);
    }
  }
  if (big) {
    // Lầu canh đầu cầu bên này: bốn cột đỏ, mái ngói như công trình cấp 7, mặt cầu chạy qua dưới lầu.
    const z0 = -half + 0.45;
    const y0 = deckY(z0);
    for (const dx of [-1, 1]) for (const dz of [-0.3, 0.3]) p.cyl(0.05, 0.06, 0.95, C.red, dx * (width / 2 - 0.02), y0 + 0.47, z0 + dz, undefined, 6);
    p.box(width + 0.12, 0.1, 0.75, C.woodDark, 0, y0 + 0.97, z0);
    boatRoof(m, roofFor(7), { length: width + 0.6, width: 1.0, lift: 0.22, drop: 0.3, thickness: 0.06 }, 0, y0 + 1.25, z0);
    m.band.box(0.5, 0.18, 0.04, C.gold, 0, y0 + 0.82, z0 - 0.38);
  }
  out.add(m.group());
  return out;
}

/** Cầu sông Đà nằm dọc (đầu bên này phía bắc); cầu sông Thao xoay một góc vuông, đầu bên này thành phía tây. */
export function bridgeModel(type: 'cauSongDa' | 'cauSongThao', level: number): THREE.Group {
  const g = makeBridge(level);
  if (type === 'cauSongThao') g.rotation.y = Math.PI / 2;
  return g;
}

/**
 * Mây cuộn màu kem phủ một khoảnh 5×5 chưa dò (góc khoảnh ở `x0`, `z0` theo tọa độ cảnh), ngọn cây nhô lên khỏi mây.
 * Mỗi khoảnh một dáng theo số khoảnh.
 */
export function cloudPuffs(b: ShapeBuilder, id: number, x0: number, z0: number, y: number): void {
  const rand = seeded(id * 7919 + 13);
  for (let k = 0; k < 7; k++) {
    const x = x0 + 0.6 + rand() * 3.8;
    const z = z0 + 0.6 + rand() * 3.8;
    const r = 0.8 + rand() * 0.45;
    b.sphere(r, k % 3 ? C.cream : 0xe8d9b0, x, y + 1.15 + rand() * 0.35, z, [1.35, 0.5, 1.35], 9);
  }
}

/** Dấu của một điểm lạ, gốc ở giữa khoảnh. Đồn đã dẹp thì thành đất cháy sém, cờ đỏ của ta. */
export function poiMarker(poi: Poi, cleared: boolean, seed: number): THREE.Group {
  const g = new THREE.Group();
  const m = new ToonModel();
  const p = m.plain;
  const rand = seeded(seed);
  if (poi.kind === 'don') {
    if (cleared) {
      // Đồn đã dẹp: đất cháy sém, cọc rào đổ, cờ đỏ của ta.
      p.cyl(1.3, 1.3, 0.03, 0x4a3a2a, 0, 0.02, 0, undefined, 12);
      for (let k = 0; k < 6; k++) p.box(0.08, 0.08, 0.7, C.woodDark, -0.8 + rand() * 1.6, 0.06, -0.8 + rand() * 1.6, [0, rand() * 3, Math.PI / 2]);
      p.cyl(0.03, 0.03, 1.8, C.woodDark, 0, 0.9, 0, undefined, 5);
      m.band.box(0.55, 0.36, 0.03, C.red, 0.29, 1.6, 0);
      g.add(m.group());
      return g;
    }
    // Rào cọc nhọn vòng quanh.
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      p.cone(0.07, 0.6, C.woodDark, Math.cos(a) * 1.35, 0.3, Math.sin(a) * 1.35, undefined, 5);
    }
    if (poi.tier === 2) {
      // Ổ thủy quái: vũng bùn nước giữa lau sậy, xương cá.
      p.cyl(0.9, 0.9, 0.05, C.paddyWater, 0, 0.03, 0, undefined, 12);
      for (let k = 0; k < 12; k++) p.cyl(0.02, 0.02, 0.8 + rand() * 0.4, C.bamboo, -1 + rand() * 2, 0.45, -1 + rand() * 2, undefined, 4);
      p.box(0.5, 0.04, 0.06, C.cream, 0.6, 0.06, -0.5, [0, 0.6, 0]);
      for (let k = 0; k < 4; k++) p.box(0.04, 0.03, 0.22, C.cream, 0.45 + k * 0.1, 0.06, -0.5 + (k - 1.5) * 0.06, [0, 0.6 + Math.PI / 2, 0]);
    } else if (poi.tier === 3) {
      // Hang yêu tinh: đá tím nhọn, đốm ma trơi.
      for (let k = 0; k < 5; k++) p.cone(0.25 + rand() * 0.2, 0.7 + rand() * 0.6, C.demonDark, -0.8 + rand() * 1.6, 0.4, -0.8 + rand() * 1.6, undefined, 5);
      m.glow.sphere(0.13, C.ghost, 0.3, 1.2, 0.2, [1, 1, 1], 8);
      m.glow.sphere(0.1, C.ghostDeep, -0.4, 1.0, -0.3, [1, 1, 1], 8);
    } else {
      // Lửa trại.
      for (let k = 0; k < 3; k++) p.box(0.4, 0.06, 0.08, C.woodDark, 0.5, 0.05, 0.5, [0, k, 0]);
      m.glow.cone(0.14, 0.32, C.fire, 0.5, 0.2, 0.5, undefined, 6);
    }
    g.add(m.group());
    if (poi.tier === 1 || poi.tier === 4) {
      for (const [x, z] of [
        [-0.5, -0.4],
        [0.2, -0.7],
      ]) {
        const tent = makeTent();
        tent.position.set(x, 0, z);
        tent.scale.setScalar(0.8);
        g.add(tent);
      }
      const flag = makeEnemyFlag(2);
      flag.position.set(-0.9, 0, 0.4);
      g.add(flag);
    }
    const kind = poi.tier === 1 ? 'giaoAn' : poi.tier === 2 ? 'tomBinh' : poi.tier === 3 ? 'quyNui' : 'linhTrieu';
    for (const [x, z] of [
      [0.9, 0.9],
      [-0.2, 1.0],
    ]) {
      const guard = makeFighter(kind);
      guard.position.set(x, 0, z);
      guard.scale.setScalar(0.75);
      g.add(guard);
    }
    return g;
  }
  if (poi.kind === 'lang') {
    for (const [x, z, ry] of [
      [-0.8, -0.6, 0.3],
      [0.7, -0.4, -0.4],
      [0, 0.7, 0.1],
    ]) {
      const house = buildingModel('nhaSan', 1);
      house.scale.setScalar(0.5);
      house.position.set(x, 0, z);
      house.rotation.y = ry;
      g.add(house);
    }
    // Cờ trắng: làng chưa về theo.
    p.cyl(0.025, 0.025, 1.5, C.woodDark, 1.0, 0.75, 0.9, undefined, 5);
    m.band.box(0.45, 0.3, 0.03, C.cream, 1.24, 1.32, 0.9);
    g.add(m.group());
    return g;
  }
  if (poi.kind === 'dacSan') {
    if (poi.dat === 'phuSa') {
      // Bãi phù sa: đất bùn nâu thẫm loang vũng nước, khóm lau xanh vàng.
      for (let k = 0; k < 5; k++) p.cyl(0.55 + rand() * 0.35, 0.6 + rand() * 0.35, 0.03, 0x5e4128, -0.9 + rand() * 1.8, 0.015, -0.9 + rand() * 1.8, undefined, 10);
      for (let k = 0; k < 3; k++) p.cyl(0.22 + rand() * 0.12, 0.22, 0.02, C.paddyWater, -0.8 + rand() * 1.6, 0.035, -0.8 + rand() * 1.6, undefined, 10);
      for (let k = 0; k < 6; k++) {
        const cx = -1.1 + rand() * 2.2;
        const cz = -1.1 + rand() * 2.2;
        for (let r = 0; r < 4; r++) p.cone(0.03, 0.55 + rand() * 0.25, r % 2 ? C.bamboo : C.ripe, cx + (rand() - 0.5) * 0.2, 0.3, cz + (rand() - 0.5) * 0.2, [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3], 4);
      }
    } else {
      // Núi đá xám, mỏ sắt đá đỏ gỉ.
      const color = poi.dat === 'nuiDa' ? C.rock : 0x9a4a2a;
      const dark = poi.dat === 'nuiDa' ? C.rockDark : 0x6e2f1c;
      for (let k = 0; k < 6; k++) p.cone(0.3 + rand() * 0.3, 0.5 + rand() * 0.9, k % 2 ? color : dark, -0.9 + rand() * 1.8, 0.35, -0.9 + rand() * 1.8, undefined, 5);
    }
    g.add(m.group());
    return g;
  }
  // Của chôn: gò đất, mặt trống đồng lấp ló.
  p.sphere(0.6, C.earth, 0, 0, 0, [1.2, 0.45, 1.0], 9);
  m.drum.cyl(0.28, 0.28, 0.06, C.bronze, 0.1, 0.2, 0.05, [0.3, 0, 0.2], 12);
  g.add(m.group());
  return g;
}
