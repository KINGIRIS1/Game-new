// Đồn đảo 8×8 trên đảo chính Hoàng Sa, Trường Sa (Điện 10 điều quân ra đóng đảo; mục Kế hoạch trong docs/thiet-ke.md).
// Bản vẽ ở docs/bo-cuc-cong-trinh.md. Đồn ở ngoài lưới kinh đô nên không vào `state.buildings`: World dựng theo
// `state.dao` (`syncDao`), đặt giữa khoảnh đồn (`donDaoSpot`), cổng quay về bến ván (`donDaoHuong`), cầu ván chạy thẳng
// từ cổng ra chỗ thuyền chiến cập (`daoBen`). Hai đồn đều quay cổng về phía bắc nên camera mặc định (từ đông nam) nhìn
// từ sau bên trái: phần cao (lầu canh, chòi lửa hiệu, cột cờ) đứng phía trước, phần thấp (giếng, miếu) phía sau.
// Gốc tọa độ là tâm móng, mặt trước (cổng) hướng +z, đơn vị là ô đất, mặt sân là y = 0.

import * as THREE from 'three';
import { boatRoof, lacBird, roofFor, stiltHall, type Roof } from '../buildings';
import { Lot } from '../lot';
import { C } from '../palette';
import { bakeSoldier, type SoldierKind } from '../soldier';
import { seeded, type ShapeBuilder } from '../shapes';
import { ToonModel } from '../toon';
import { rod, yard } from './chung';
import { GATE_HALF, congTre, gopHinh, inFrame, lauCong, raoCocNhon } from './trai';

export const DON_DAO_LOT = new Lot(8, [
  '################',
  '#gg.........MMM#',
  '#gg.........MMM#',
  '#...........MMM#',
  '#KK............#',
  '#KK.HHHHHHHH...#',
  '#KK.HHHHHHHH...#',
  '#...HHHHHHHH...#',
  '#...HHHHHHHH...#',
  '#.b............#',
  '#.b....,,..FF..#',
  '#......,,..FF..#',
  '#TT....,,....LL#',
  '#TT....,,....LL#',
  '#......,,......#',
  '#######CC#######',
]);

/** Rào, tường đứng ở chừng này ô tính từ tâm móng. */
const WALL = 3.8;
/** Mép móng phía cổng: cầu ván bắt đầu từ đây. */
const EDGE = 4;
/** Cát san hô trắng ngà của sân đồn. */
const SAND = 0xdccb9c;
/** Lối cát nện từ cổng vào. */
const PATH = 0xc8b07c;
/** Đá san hô: trắng xám, lỗ rỗ sẫm. */
const SAN_HO = 0xd9cfbd;
const SAN_HO_DARK = 0xaea290;
/** Mặt nước dưới cầu ván, so với mặt sân đồn (đồn ở bậc 2 của đảo, `DON_DAO_Y`). */
export const CAU_NUOC = -0.28 - 0.3;
/** Cầu ván chia quãng chừng này ô để lấy mặt đất dưới cầu. */
export const CAU_STEP = 0.5;
/** Mặt cầu ván ở đầu ngoài, cao hơn mặt nước chừng này. */
const CAU_DAU = 0.3;
/** Sàn lầu canh (cấp 3). */
const LAU_CANH_Y = 1.9;
/** Sàn chòi lửa hiệu (cấp 2). */
const CHOI_Y = 1.55;

/** Mái theo cấp đồn: cấp 1 tranh, cấp 2 tranh viền đỏ, cấp 3 ngói viền đồng vàng. */
const roofOf = (cap: number): Roof => roofFor(cap >= 3 ? 8 : cap >= 2 ? 6 : 1);

export interface DonDaoOpts {
  /** Số lính gác đứng trong đồn (0 tới `DON_GAC_MAX`), theo số lính đóng. */
  gac?: number;
  /** Bậc binh khí giáo binh, cung thủ: lính gác cầm đúng binh khí đã rèn. */
  tierGiao?: number;
  tierCung?: number;
  /** Lửa hiệu đang cháy (đồn giữ biển lúc thủy quân Hán sắp tới). */
  lit?: boolean;
  /**
   * Cầu ván từ cổng ra bến ván: dài (ô, tính từ mép móng) và mặt đất dưới cầu theo từng quãng `CAU_STEP` (so với mặt sân
   * đồn; null là nước). Bỏ trống thì không có cầu (ảnh chụp riêng đồn).
   */
  cau?: { len: number; mat: (number | null)[] };
}

/** Lính gác nhiều nhất đứng trong đồn (cho nhẹ máy). */
export const DON_GAC_MAX = 6;

/** Số lính gác đứng trong đồn theo số chỗ quân đang đóng: cứ năm chỗ một người, tối đa `DON_GAC_MAX`. */
export const donGac = (space: number): number => Math.min(DON_GAC_MAX, Math.ceil(space / 5));

/** Chỗ lính gác đứng (tọa độ móng), theo thứ tự có người; cấp 3 người thứ năm đứng trên sàn lầu canh. */
function gacSpots(cap: number): { kind: 'giao' | 'cung'; x: number; z: number; y: number; ry: number }[] {
  const L = DON_DAO_LOT;
  const f = L.zone('F');
  const t = L.zone('T');
  const lau = L.zone('L');
  const h = L.zone('H');
  return [
    { kind: 'giao', x: -GATE_HALF - 0.28, z: WALL - 0.3, y: 0, ry: 0 },
    { kind: 'giao', x: GATE_HALF + 0.28, z: WALL - 0.3, y: 0, ry: 0 },
    { kind: 'cung', x: f.x - 0.45, z: f.z + 0.35, y: 0, ry: 0.3 },
    { kind: 'cung', x: t.x + 0.75, z: t.z - 0.1, y: 0, ry: -0.5 },
    cap >= 3 ? { kind: 'cung', x: lau.x - 0.12, z: lau.z + 0.12, y: LAU_CANH_Y + 0.04, ry: 0.4 } : { kind: 'cung', x: lau.x, z: lau.z, y: 0, ry: 0.4 },
    { kind: 'giao', x: h.x - 0.9, z: h.z + h.d / 2 + 0.1, y: 0, ry: 0.15 },
  ];
}

/**
 * Kè đá san hô thấp ôm chân rào (cấp 2): hàng đá xếp quanh mép móng ngoài rào, chừa cổng. Đá to nhỏ so le, tô hai màu
 * cho thấy đá rỗ.
 */
function keSanHo(p: ShapeBuilder): void {
  const rand = seeded(91);
  const half = WALL + 0.12;
  const side = (fixed: number, axis: 'x' | 'z', gate: boolean) => {
    for (let t = -half; t < half - 0.05; ) {
      const len = 0.22 + rand() * 0.16;
      const mid = t + len / 2;
      t += len + 0.02;
      if (gate && Math.abs(mid) < GATE_HALF + 0.15) continue;
      const h = 0.1 + rand() * 0.06;
      const c = rand() < 0.35 ? SAN_HO_DARK : SAN_HO;
      if (axis === 'x') p.box(len, h, 0.2, c, mid, h / 2, fixed);
      else p.box(0.2, h, len, c, fixed, h / 2, mid);
    }
  };
  side(-half, 'x', false);
  side(half, 'x', true);
  side(-half, 'z', false);
  side(half, 'z', false);
}

/**
 * Tường đá san hô (cấp 3) chạy dọc một mặt (trong khung mặt ấy: gốc giữa mặt, tường chạy theo x), chừa cửa giữa nếu
 * `gate`: chân kè đá sẫm, thân xếp từng khối đá san hô so le, đỉnh có hàng đá mũ nhô ra và lỗ châu mai.
 */
function tuongSanHo(m: ToonModel, gate: boolean, seed: number): void {
  const p = m.plain;
  const rand = seeded(seed);
  const end = WALL + 0.16;
  const runs: [number, number][] = gate ? [[-end, -GATE_HALF - 0.08], [GATE_HALF + 0.08, end]] : [[-end, end]];
  const h = 0.62;
  for (const [a, b] of runs) {
    const len = b - a;
    const cx = (a + b) / 2;
    p.box(len, 0.1, 0.4, SAN_HO_DARK, cx, 0.05, 0);
    p.box(len, h - 0.1, 0.3, SAN_HO, cx, 0.1 + (h - 0.1) / 2, 0);
    // Mạch đá: hai hàng khối so le trên mặt ngoài và mặt trong.
    for (const row of [0, 1]) {
      const y = 0.26 + row * 0.2;
      for (let x = a + (row ? 0.18 : 0.05); x < b - 0.1; x += 0.36) {
        for (const s of [-1, 1]) p.box(0.02, 0.17, 0.012, SAN_HO_DARK, x, y, s * 0.152);
      }
      for (const s of [-1, 1]) p.box(len, 0.018, 0.012, SAN_HO_DARK, cx, y + 0.1, s * 0.152);
    }
    // Đá mũ đỉnh tường, lỗ châu mai cách quãng.
    p.box(len, 0.06, 0.36, SAN_HO_DARK, cx, h + 0.03, 0);
    for (let x = a + 0.2; x < b - 0.15; x += 0.5) {
      const w = 0.24 + rand() * 0.04;
      p.box(w, 0.13, 0.3, rand() < 0.3 ? SAN_HO_DARK : SAN_HO, x + 0.1, h + 0.12, 0);
    }
  }
}

/** Đuốc cắm trên cột tre (lửa là khối riêng: World cho lập lòe, ban đêm có quầng sáng). */
function duoc(m: ToonModel, extras: THREE.Object3D[], x: number, y: number, z: number, h = 1.05): void {
  const p = m.plain;
  p.cyl(0.025, 0.03, h, C.bamboo, x, y + h / 2, z, undefined, 5);
  p.cyl(0.05, 0.035, 0.1, C.woodDark, x, y + h + 0.03, z, undefined, 6);
  const lua = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), new THREE.MeshBasicMaterial({ color: C.fire }));
  lua.position.set(x, y + h + 0.16, z);
  lua.userData.flame = true;
  extras.push(lua);
}

/** Nhà sàn lính: nhà sàn mái thuyền dài, thang lên sàn, giá giáo dựa vách, lưới đánh cá phơi trên sào. */
function nhaSan(m: ToonModel, roof: Roof): void {
  const p = m.plain;
  const H = DON_DAO_LOT.zone('H');
  const postH = 0.62;
  // Nhỏ hơn khối chữ một chút cho sân quanh nhà còn rộng.
  const w = H.w - 0.9;
  const d = H.d - 0.7;
  stiltHall(m, { x: H.x, z: H.z, w, d, postH, roofL: w + 0.45, roofW: d + 0.4, lift: 0.3, roof });
  if (roof.lac) for (const s of [-1, 1]) lacBird(m, H.x + s * (w / 2 + 0.2), postH + 1.3, H.z, s > 0 ? 0 : Math.PI, 0.6);
  // Thang gỗ lên sàn ở giữa mặt trước.
  const front = H.z + d / 2;
  for (const dx of [-0.13, 0.13]) rod(p, [H.x + dx, 0, front + 0.4], [H.x + dx, postH, front], 0.02, C.woodDark, 4);
  for (let i = 1; i <= 3; i++) p.box(0.28, 0.025, 0.04, C.wood, H.x, (i * postH) / 4, front + 0.4 - (i * 0.4) / 4);
  // Giá giáo dựng bên phải trước nhà.
  const gx = H.x + w / 2 - 0.2;
  const gz = front + 0.45;
  p.box(0.62, 0.04, 0.04, C.woodDark, gx, 0.55, gz);
  for (let i = 0; i < 4; i++) {
    const sx = gx - 0.24 + i * 0.16;
    p.cyl(0.013, 0.013, 1.0, C.woodDark, sx, 0.5, gz + 0.05, [-0.12, 0, 0], 4);
    p.cone(0.04, 0.15, C.bronze, sx, 1.07, gz - 0.02, [-0.12, 0, 0], 4);
  }
}

/** Góc kho: chum nước mưa có nắp (đảo xa không có suối), đống củi, chồng dừa khô. */
function kho(p: ShapeBuilder): void {
  const K = DON_DAO_LOT.zone('K');
  for (const [dx, dz, s] of [[-0.18, -0.45, 1], [0.2, -0.32, 0.85], [-0.12, -0.05, 0.9]] as const) {
    p.cyl(0.15 * s, 0.11 * s, 0.34 * s, C.soil, K.x + dx, 0.17 * s, K.z + dz, undefined, 9);
    p.cyl(0.1 * s, 0.13 * s, 0.04, C.earthDark, K.x + dx, 0.345 * s, K.z + dz, undefined, 9);
    p.cyl(0.13 * s, 0.13 * s, 0.025, C.thatchDark, K.x + dx, 0.37 * s, K.z + dz, undefined, 9);
  }
  // Đống củi xếp ngang.
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 4 - r; i++) {
      p.cyl(0.045, 0.045, 0.6, r % 2 ? C.wood : C.woodDark, K.x - 0.15 + (i + r * 0.5) * 0.1, 0.05 + r * 0.085, K.z + 0.35, [0, 0, Math.PI / 2], 5);
    }
  }
  // Dừa khô chất đống.
  for (let i = 0; i < 5; i++) p.sphere(0.07, C.palm, K.x + 0.25 + (i % 3) * 0.1 - 0.05, 0.07 + Math.floor(i / 3) * 0.1, K.z + 0.05 + (i % 2) * 0.08, [1, 0.9, 1], 6);
}

/** Cột cờ đồn: chân kè đá san hô, cột gỗ cao, cờ đỏ viền vàng, đầu cột bọc đồng. */
function cotCo(m: ToonModel): void {
  const p = m.plain;
  const F = DON_DAO_LOT.zone('F');
  const h = 3.4;
  p.cyl(0.24, 0.3, 0.14, SAN_HO_DARK, F.x, 0.07, F.z, undefined, 9);
  p.cyl(0.16, 0.2, 0.12, SAN_HO, F.x, 0.2, F.z, undefined, 9);
  p.cyl(0.04, 0.05, h, C.woodDark, F.x, h / 2, F.z, undefined, 6);
  p.sphere(0.07, C.bronzeLight, F.x, h + 0.04, F.z, [1, 1, 1], 6);
  m.band.box(0.78, 0.52, 0.03, C.red, F.x + 0.41, h - 0.32, F.z);
  p.box(0.8, 0.04, 0.035, C.gold, F.x + 0.41, h - 0.6, F.z);
}

/**
 * Lửa hiệu ở góc trước bên trái. Cấp 1: bếp đá kê đống củi chụm. Từ cấp 2: chòi lửa hiệu bốn chân tre cao, sàn ván,
 * chậu đồng đầy củi, thang tre. Đang cháy thì lửa bùng và khói bốc (khối riêng `extras`).
 */
function luaHieu(m: ToonModel, cap: number, lit: boolean, extras: THREE.Object3D[]): void {
  const p = m.plain;
  const T = DON_DAO_LOT.zone('T');
  let y = 0;
  if (cap < 2) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      p.sphere(0.08, i % 2 ? SAN_HO_DARK : SAN_HO, T.x + Math.cos(a) * 0.28, 0.05, T.z + Math.sin(a) * 0.28, [1.2, 0.7, 1], 6);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      rod(p, [T.x + Math.cos(a) * 0.24, 0.02, T.z + Math.sin(a) * 0.24], [T.x + Math.cos(a) * 0.03, 0.46, T.z + Math.sin(a) * 0.03], 0.028, i % 2 ? C.wood : C.woodDark, 4);
    }
    y = 0.12;
  } else {
    for (const dx of [-0.2, 0.2]) for (const dz of [-0.2, 0.2]) rod(p, [T.x + dx * 1.5, 0, T.z + dz * 1.5], [T.x + dx, CHOI_Y, T.z + dz], 0.03, C.bamboo, 5);
    // Giằng ngang hai tầng.
    for (const k of [0.35, 0.7]) {
      const s = 1.5 - 0.5 * k;
      for (const v of [-1, 1]) {
        p.box(0.4 * s, 0.025, 0.025, C.bamboo, T.x, CHOI_Y * k, T.z + v * 0.2 * s);
        p.box(0.025, 0.025, 0.4 * s, C.bamboo, T.x + v * 0.2 * s, CHOI_Y * k, T.z);
      }
    }
    p.box(0.6, 0.06, 0.6, C.wood, T.x, CHOI_Y, T.z);
    p.cyl(0.2, 0.13, 0.16, C.bronze, T.x, CHOI_Y + 0.11, T.z, undefined, 10);
    m.band.cyl(0.205, 0.205, 0.05, C.bronzeLight, T.x, CHOI_Y + 0.17, T.z, undefined, 10);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      rod(p, [T.x + Math.cos(a) * 0.15, CHOI_Y + 0.16, T.z + Math.sin(a) * 0.15], [T.x + Math.cos(a) * 0.02, CHOI_Y + 0.38, T.z + Math.sin(a) * 0.02], 0.022, i % 2 ? C.wood : C.woodDark, 4);
    }
    // Thang tre dựa mặt trước.
    for (const dx of [-0.1, 0.1]) rod(p, [T.x + dx, 0, T.z + 0.6], [T.x + dx, CHOI_Y, T.z + 0.3], 0.016, C.bamboo, 4);
    for (let i = 1; i <= 5; i++) p.box(0.22, 0.02, 0.03, C.bamboo, T.x, (i * CHOI_Y) / 6, T.z + 0.6 - (i * 0.3) / 6);
    y = CHOI_Y + 0.2;
  }
  if (!lit) return;
  const big = cap >= 2 ? 1.3 : 1;
  for (const [s, c, dy] of [[1, C.fire, 0.24], [0.6, C.ember, 0.2]] as const) {
    const lua = new THREE.Mesh(new THREE.ConeGeometry(0.17 * s * big, 0.5 * s * big, 7), new THREE.MeshBasicMaterial({ color: c }));
    lua.position.set(T.x, y + dy * big, T.z);
    lua.userData.flame = true;
    if (c === C.fire) lua.userData.flameDat = cap >= 2 ? CHOI_Y : 0.02;
    extras.push(lua);
  }
  // Khói lửa hiệu bốc cao: cột khói đen dày.
  const smoke = new THREE.Group();
  smoke.userData.smoke = true;
  const mat = new THREE.MeshBasicMaterial({ color: 0x55504a, transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), mat);
    puff.userData.phase = i / 5;
    smoke.add(puff);
  }
  smoke.position.set(T.x, y + 0.5, T.z);
  smoke.scale.setScalar(1.4);
  extras.push(smoke);
}

/** Giếng nước (cấp 2): thành giếng đá san hô tròn, cần tre có gàu, gàu múc đặt trên thành. */
function gieng(p: ShapeBuilder): void {
  const g = DON_DAO_LOT.zone('g');
  p.cyl(0.36, 0.38, 0.28, SAN_HO, g.x, 0.14, g.z, undefined, 12);
  p.cyl(0.38, 0.38, 0.05, SAN_HO_DARK, g.x, 0.3, g.z, undefined, 12);
  p.cyl(0.27, 0.27, 0.02, C.sea, g.x, 0.24, g.z, undefined, 12);
  // Cần vọt: cột chạc, cần tre dài, đá đối trọng một đầu, gàu đầu kia.
  const px = g.x + 0.5;
  p.cyl(0.035, 0.04, 0.8, C.woodDark, px, 0.4, g.z, undefined, 5);
  rod(p, [px + 0.55, 0.45, g.z], [g.x - 0.05, 1.05, g.z], 0.02, C.bamboo, 4);
  p.sphere(0.09, C.rockDark, px + 0.55, 0.42, g.z, [1, 0.8, 1], 6);
  rod(p, [g.x - 0.05, 1.03, g.z], [g.x - 0.05, 0.42, g.z], 0.007, C.thatchDark, 3);
  p.cyl(0.07, 0.055, 0.1, C.wood, g.x - 0.05, 0.38, g.z, undefined, 7);
}

/**
 * Lầu canh (cấp 3) ở góc trước bên phải: bốn cột gỗ chân kê đá, giằng chéo, sàn cao lan can đỏ, mái ngói theo cấp,
 * thang gỗ; trống đồng nhỏ treo trên sàn để đánh hiệu.
 */
function lauCanh(m: ToonModel, roof: Roof): void {
  const p = m.plain;
  const L = DON_DAO_LOT.zone('L');
  const y = LAU_CANH_Y;
  for (const dx of [-0.32, 0.32]) {
    for (const dz of [-0.32, 0.32]) {
      p.box(0.14, 0.08, 0.14, SAN_HO_DARK, L.x + dx, 0.04, L.z + dz);
      p.cyl(0.05, 0.06, y, C.woodDark, L.x + dx, y / 2, L.z + dz, undefined, 6);
    }
    rod(p, [L.x + dx, 0.15, L.z - 0.32], [L.x + dx, y - 0.2, L.z + 0.32], 0.02, C.wood, 4);
  }
  rod(p, [L.x - 0.32, 0.15, L.z + 0.32], [L.x + 0.32, y - 0.2, L.z + 0.32], 0.02, C.wood, 4);
  p.box(0.86, 0.07, 0.86, C.wood, L.x, y, L.z);
  for (const s of [-1, 1]) {
    m.band.box(0.86, 0.13, 0.04, C.red, L.x, y + 0.1, L.z + s * 0.41);
    m.band.box(0.04, 0.13, 0.86, C.red, L.x + s * 0.41, y + 0.1, L.z);
  }
  for (const dx of [-0.38, 0.38]) for (const dz of [-0.38, 0.38]) p.cyl(0.025, 0.025, 0.6, C.woodDark, L.x + dx, y + 0.33, L.z + dz, undefined, 5);
  boatRoof(m, roof, { length: 1.15, width: 1.0, lift: 0.2, drop: 0.4, thickness: 0.06 }, L.x, y + 1.03, L.z);
  if (roof.lac) for (const s of [-1, 1]) lacBird(m, L.x + s * 0.55, y + 1.25, L.z, s > 0 ? 0 : Math.PI, 0.5);
  // Trống đồng nhỏ treo góc sàn.
  m.drum.cyl(0.11, 0.11, 0.08, C.bronze, L.x - 0.2, y + 0.3, L.z - 0.2, [Math.PI / 2, 0, 0], 12);
  // Thang gỗ dựa mặt sau, lên từ trong sân.
  for (const dx of [-0.11, 0.11]) rod(p, [L.x + dx - 0.15, 0, L.z - 0.85], [L.x + dx - 0.15, y, L.z - 0.4], 0.018, C.woodDark, 4);
  for (let i = 1; i <= 6; i++) p.box(0.24, 0.022, 0.03, C.wood, L.x - 0.15, (i * y) / 7, L.z - 0.85 + (i * 0.45) / 7);
}

/** Bia đá (cấp 3): rùa đá đội bia, mặt bia khắc hàng chữ, đầu bia tròn có hoa văn mặt trời. */
function biaDa(m: ToonModel): void {
  const p = m.plain;
  const b = DON_DAO_LOT.zone('b');
  const x = b.x;
  const z = b.z;
  // Rùa đá: mai dẹt, đầu ngẩng nhìn ra cổng, bốn chân.
  p.sphere(0.3, C.rock, x, 0.1, z, [1, 0.45, 1.25], 10);
  p.sphere(0.08, C.rock, x, 0.14, z + 0.4, [1, 0.85, 1.2], 7);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.sphere(0.07, C.rockDark, x + sx * 0.24, 0.04, z + sz * 0.26, [1.2, 0.6, 1], 6);
  // Bia.
  p.box(0.42, 0.62, 0.1, C.rock, x, 0.5, z);
  p.cyl(0.21, 0.21, 0.1, C.rock, x, 0.81, z, [Math.PI / 2, 0, 0], 12);
  m.drum.cyl(0.1, 0.1, 0.012, C.rockDark, x, 0.82, z + 0.052, [Math.PI / 2, 0, 0], 12);
  for (let i = 0; i < 4; i++) p.box(0.022, 0.38, 0.012, C.rockDark, x - 0.12 + i * 0.08, 0.5, z + 0.053);
}

/**
 * Miếu thờ cá Ông (cấp 3) ở góc sau bên phải: nền đá san hô hai bậc, gian miếu mái theo cấp, cửa son, vòm xương sườn
 * cá voi trước cửa, bát hương đồng; ngư dân, lính đảo cầu cá Ông phù hộ người đi biển.
 */
function mieu(m: ToonModel, roof: Roof): void {
  const p = m.plain;
  const M = DON_DAO_LOT.zone('M');
  const x = M.x;
  const z = M.z - 0.2;
  p.box(1.15, 0.12, 0.95, SAN_HO_DARK, x, 0.06, z);
  p.box(0.95, 0.12, 0.78, SAN_HO, x, 0.18, z);
  m.band.box(0.7, 0.48, 0.52, C.woodLight, x, 0.48, z);
  p.box(0.2, 0.3, 0.02, C.red, x, 0.4, z + 0.265);
  boatRoof(m, roof, { length: 1.1, width: 0.82, lift: 0.2, drop: 0.24, thickness: 0.05 }, x, 0.92, z);
  if (roof.lac) for (const s of [-1, 1]) lacBird(m, x + s * 0.5, 1.12, z, s > 0 ? 0 : Math.PI, 0.6);
  p.cyl(0.06, 0.05, 0.08, C.bronze, x, 0.28, z + 0.5, undefined, 8);
  for (const dx of [-0.02, 0.02]) p.cyl(0.006, 0.006, 0.14, C.red, x + dx, 0.38, z + 0.5, undefined, 3);
  for (let i = 0; i < 4; i++) {
    const zz = z + 0.62 + i * 0.13;
    const s = 1 - i * 0.12;
    for (const sx of [-1, 1]) {
      rod(p, [x + sx * 0.42 * s, 0.02, zz], [x + sx * 0.35 * s, 0.45 * s, zz], 0.024, C.cream, 4);
      rod(p, [x + sx * 0.35 * s, 0.45 * s, zz], [x + sx * 0.06, 0.64 * s, zz], 0.021, C.cream, 4);
    }
  }
}

/**
 * Cầu ván từ cổng ra bến ván: mặt ván phẳng ngang sân tới hết đất bậc 2, rồi dốc dần xuống tới đầu cầu cao hơn mặt
 * nước `CAU_DAU`; cọc hai bên chôn xuống đất hay xuống nước; lan can dây hai bên; đầu cầu nới rộng có cột neo bọc đồng
 * và đuốc.
 */
function cauVan(m: ToonModel, cau: NonNullable<DonDaoOpts['cau']>, extras: THREE.Object3D[]): void {
  const p = m.plain;
  const { len, mat } = cau;
  const ground = (t: number) => mat[Math.min(mat.length - 1, Math.max(0, Math.floor(t / CAU_STEP)))];
  // Hết đất bậc 2 (mặt bằng sân) ở đâu: tới đó mặt cầu phẳng.
  let flat = 0;
  for (let k = 0; k < mat.length; k++) if ((mat[k] ?? -1) > -0.05) flat = (k + 1) * CAU_STEP;
  flat = Math.min(flat, len - 1);
  const top = 0.06;
  const end = CAU_NUOC + CAU_DAU;
  const deckY = (t: number) => {
    const y = t <= flat ? top : top + ((end - top) * (t - flat)) / Math.max(0.01, len - flat);
    const g = ground(t);
    return Math.max(y, g === null ? y : g + 0.1);
  };
  const z0 = EDGE - 0.25;
  const n = Math.ceil((len + 0.25) / 0.25);
  for (let i = 0; i < n; i++) {
    const ta = -0.25 + i * 0.25;
    const tb = Math.min(len, ta + 0.25);
    const ya = deckY(Math.max(0, ta));
    const yb = deckY(Math.max(0, tb));
    const l = Math.hypot(tb - ta, yb - ya);
    p.box(0.72, 0.05, l + 0.01, i % 2 ? C.woodLight : C.wood, 0, (ya + yb) / 2 - 0.025, z0 + 0.25 + (ta + tb) / 2, [Math.atan2(ya - yb, tb - ta), 0, 0]);
  }
  // Cọc hai bên mỗi nửa ô, lan can dây trên cọc mỗi một ô.
  for (let t = 0.25; t <= len - 0.2; t += 0.5) {
    const y = deckY(t);
    const g = ground(t);
    const foot = g === null ? CAU_NUOC - 0.35 : g;
    for (const sx of [-1, 1]) {
      p.cyl(0.035, 0.04, y - foot, C.woodDark, sx * 0.34, (y + foot) / 2, EDGE + t, undefined, 5);
      p.cyl(0.025, 0.025, 0.36, C.woodDark, sx * 0.34, y + 0.18, EDGE + t, undefined, 5);
    }
  }
  for (const sx of [-1, 1]) {
    for (let t = 0.25; t + 0.5 <= len - 0.2; t += 0.5) rod(p, [sx * 0.34, deckY(t) + 0.3, EDGE + t], [sx * 0.34, deckY(t + 0.5) + 0.3, EDGE + t + 0.5], 0.01, C.thatchDark, 3);
  }
  // Đầu cầu: sàn rộng, hai cột neo bọc đồng, đuốc ở góc.
  const ye = deckY(len);
  const ze = EDGE + len - 0.3;
  p.box(1.5, 0.07, 0.7, C.wood, 0, ye - 0.035, ze);
  for (const sx of [-0.62, 0, 0.62]) for (const dz of [-0.28, 0.28]) p.cyl(0.04, 0.045, ye - CAU_NUOC + 0.35, C.woodDark, sx, (ye + CAU_NUOC - 0.35) / 2, ze + dz, undefined, 5);
  for (const sx of [-0.62, 0.62]) {
    p.cyl(0.05, 0.055, 0.22, C.woodDark, sx, ye + 0.11, ze + 0.25, undefined, 6);
    p.sphere(0.06, C.bronze, sx, ye + 0.24, ze + 0.25, [1, 0.8, 1], 6);
  }
  duoc(m, extras, -0.66, ye, ze - 0.25, 0.85);
}

/**
 * Đồn đảo cấp `cap` (1–3). Cấp 1: rào cọc, cổng tre, nhà sàn lính, cột cờ, góc kho, bếp lửa hiệu, cầu ván. Cấp 2 thêm chòi
 * lửa hiệu, giếng nước, kè đá san hô quanh rào. Cấp 3 thay rào bằng tường đá san hô, cổng thành lầu cổng, thêm lầu canh,
 * bia đá, miếu thờ cá Ông. Lính gác (`gac`) đứng theo số lính đóng, gộp một lưới mỗi chất liệu.
 */
export function makeDonDao(cap: number, o: DonDaoOpts = {}): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  const L = DON_DAO_LOT;
  const roof = roofOf(cap);
  const extras: THREE.Object3D[] = [];

  yard(m, 8, SAND);
  for (const lane of L.groups(',')) p.box(lane.w - 0.04, 0.02, lane.d + 0.2, PATH, lane.x, 0.055, lane.z + 0.1);

  if (cap >= 3) {
    [0, Math.PI, -Math.PI / 2, Math.PI / 2].forEach((ry, i) => inFrame(m, Math.sin(ry) * WALL, Math.cos(ry) * WALL, ry, () => tuongSanHo(m, i === 0, 31 + i)));
    inFrame(m, 0, WALL, 0, () => lauCong(m, roof));
  } else {
    raoCocNhon(m, WALL, 2 * GATE_HALF);
    if (cap >= 2) keSanHo(p);
    inFrame(m, 0, WALL, 0, () => congTre(m));
  }
  // Hai đuốc hai bên cổng, ngoài rào.
  for (const sx of [-1, 1]) duoc(m, extras, sx * (GATE_HALF + 0.35), 0, EDGE - 0.02);

  nhaSan(m, roof);
  kho(p);
  cotCo(m);
  luaHieu(m, cap, !!o.lit, extras);
  if (cap >= 2) gieng(p);
  if (cap >= 3) {
    lauCanh(m, roof);
    biaDa(m);
    mieu(m, roof);
  }
  if (o.cau) cauVan(m, o.cau, extras);

  const out = m.group();
  for (const e of extras) out.add(e);
  const gac = Math.min(o.gac ?? 0, DON_GAC_MAX);
  if (gac > 0) {
    const tier = (k: 'giao' | 'cung') => (k === 'giao' ? (o.tierGiao ?? 0) : (o.tierCung ?? 0));
    const list = gacSpots(cap)
      .slice(0, gac)
      .map((s) => ({ g: bakeSoldier(s.kind as SoldierKind, tier(s.kind)), x: s.x, z: s.z, ry: s.ry, y: s.y }));
    out.add(gopHinh(list));
  }
  return out;
}
