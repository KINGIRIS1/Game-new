// Đồ gánh của dân: đòn gánh tre hai đầu hai thúng (thóc, rau, vỏ ốc, đá, sắt, cá, lá dong, thịt), bó gỗ, bó tre vác
// vai, nguyên liệu Tết vun trên miệng gùi, mâm bánh đội đầu. Gắn vào xương ngực hay xương đầu của người
// (`makeWorker`), nên đi theo dáng người. Dùng cho dân gánh hàng về kho, thợ vác vật liệu, người bếp (world.ts,
// ganhHang.ts) và đoàn dân rút ở Cấm Khê (battlefield.ts).

import * as THREE from 'three';
import { gripHands, type Human } from './body';
import { banhChung, banhGiay } from './buildings';
import { rod } from './congTrinh/chung';
import type { Hang } from './ganhHang';
import { C } from './palette';
import { ToonModel, inkThin } from './toon';

/** Hàng gánh đòn hai thúng. */
type Thung = Exclude<Hang, 'go' | 'tre' | 'gui' | 'mam'>;

/** Màu hàng vun trên miệng thúng. */
const MAU: Record<Thung, number> = {
  thoc: 0xd9bf78,
  rau: C.leaf[3],
  oc: 0xeee0c8,
  da: C.rock,
  sat: C.iron,
  ca: C.fish,
  la: 0x4f7f38,
  thit: 0xc77d68,
};

/** Hàng trong thúng ở đầu đòn `z`: vun tròn, thêm đá cục, thỏi sắt, đuôi cá, lá dong cho dễ nhận. */
function hangTrongThung(m: ToonModel, hang: Thung, z: number): void {
  const p = m.plain;
  p.sphere(0.1, MAU[hang], 0, -0.33, z, [1, 0.55, 1], 7);
  if (hang === 'da') {
    p.box(0.08, 0.06, 0.07, C.rockDark, -0.03, -0.29, z + 0.02, [0.2, 0.4, 0.1]);
    p.box(0.07, 0.05, 0.06, C.rock, 0.04, -0.28, z - 0.03, [0.1, -0.3, 0.2]);
  }
  if (hang === 'sat') {
    for (const dx of [-0.04, 0.04]) p.box(0.05, 0.035, 0.14, 0x2f2c2a, dx, -0.28, z, [0, dx * 4, 0]);
  }
  if (hang === 'ca') p.cone(0.035, 0.09, C.fish, 0.02, -0.25, z, [0, 0, 0.3], 4);
  if (hang === 'la') p.box(0.16, 0.012, 0.07, 0x3d6828, 0, -0.27, z, [0.3, 0.5, 0]);
  if (hang === 'oc') for (const dx of [-0.04, 0.04]) p.cone(0.03, 0.06, 0xd8c8a8, dx, -0.26, z + dx, [0.4, 0, 0], 5);
}

/**
 * Đòn gánh tre dài dọc trục z, hai quang dây, hai thúng: `hang` ở cả hai đầu, hay cặp hàng hai đầu. Gốc ở giữa đòn;
 * gắn vào xương ngực ở `GANH_AT` cho đòn tì vai phải.
 */
export function donGanh(hang: Thung | [Thung, Thung]): THREE.Group {
  const [a, b] = Array.isArray(hang) ? hang : [hang, hang];
  const m = new ToonModel(inkThin);
  const p = m.plain;
  p.cyl(0.016, 0.016, 1.04, C.bamboo, 0, 0, 0, [Math.PI / 2, 0, 0], 5);
  for (const [s, load] of [
    [1, a],
    [-1, b],
  ] as const) {
    const z = s * 0.46;
    for (const ang of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) rod(p, [0, 0, z], [Math.cos(ang) * 0.1, -0.33, z + Math.sin(ang) * 0.1], 0.005, C.woodDark, 3);
    p.cyl(0.12, 0.09, 0.14, C.thatch, 0, -0.41, z, undefined, 8);
    p.cyl(0.125, 0.125, 0.02, C.thatchDark, 0, -0.34, z, undefined, 8);
    hangTrongThung(m, load, z);
  }
  return m.group();
}

/** Chỗ gắn đòn gánh trên xương ngực: cao ngang vai phải (ngực ở 0,4, vai ở chừng 0,6 so với chân). */
export const GANH_AT = new THREE.Vector3(0.12, 0.2, 0);

/** Bó ba khúc gỗ buộc lạt, vác trên vai trái, dọc trục z. Gắn vào xương ngực ở `VAC_AT`. */
export function boGo(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  for (const [dx, dy] of [
    [-0.045, 0],
    [0.045, 0],
    [0, 0.07],
  ]) {
    p.cyl(0.045, 0.045, 0.78, C.wood, dx, dy, 0, [Math.PI / 2, 0, 0], 6);
    for (const z of [-0.39, 0.39]) p.cyl(0.035, 0.035, 0.01, C.woodLight, dx, dy, z, [Math.PI / 2, 0, 0], 6);
  }
  for (const z of [-0.2, 0.2]) p.cyl(0.1, 0.1, 0.03, C.bamboo, 0, 0.03, z, [Math.PI / 2, 0, 0], 8);
  return m.group();
}

export const VAC_AT = new THREE.Vector3(-0.15, 0.28, -0.02);

/** Bó ba cây tre dài có đốt, buộc lạt hai chỗ, vác trên vai trái dọc trục z (thợ vác vật liệu). Gắn ở `VAC_AT`. */
export function boTre(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  const L = 1.15;
  for (const [dx, dy, dz] of [
    [-0.03, 0, 0.04],
    [0.03, 0, -0.03],
    [0, 0.05, 0.08],
  ]) {
    p.cyl(0.026, 0.026, L, C.bamboo, dx, dy, dz, [Math.PI / 2, 0, 0], 6);
    for (const z of [-0.36, 0, 0.36]) p.cyl(0.03, 0.03, 0.02, C.thatchDark, dx, dy, dz + z, [Math.PI / 2, 0, 0], 6);
  }
  for (const z of [-0.22, 0.22]) p.cyl(0.075, 0.075, 0.025, C.woodDark, 0, 0.02, z, [Math.PI / 2, 0, 0], 8);
  return m.group();
}

/**
 * Nguyên liệu Tết vun trên miệng gùi sau lưng người bếp (gùi có sẵn trên dáng `phuNu` đứng): nếp trắng ngà, bó lá dong
 * dựng, miếng thịt. Gắn xương ngực ở `GUI_AT`.
 */
export function guiDay(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  p.sphere(0.13, 0xeee3c4, 0, 0, 0, [1, 0.5, 1], 8);
  // Bó lá dong dựng sau, xòe lên khỏi vai cho dễ thấy từ mọi phía.
  for (const [x, z, a] of [
    [-0.07, -0.05, -0.45],
    [-0.035, -0.06, -0.2],
    [0.0, -0.07, 0.02],
    [0.035, -0.06, 0.22],
    [0.07, -0.05, 0.45],
  ]) {
    p.box(0.075, 0.26, 0.012, x === 0 ? 0x4f7f38 : 0x3d6828, x, 0.12, z, [-0.25, 0, a]);
  }
  p.box(0.1, 0.06, 0.07, 0xc77d68, 0.06, 0.05, 0.05, [0, 0.4, 0.2]);
  p.box(0.1, 0.012, 0.07, 0xf1e0c8, 0.06, 0.081, 0.05, [0, 0.4, 0.2]);
  return m.group();
}

/** Chỗ gắn nguyên liệu trên xương ngực: ngay miệng gùi sau lưng. */
export const GUI_AT = new THREE.Vector3(0, 0.32, -0.22);

/** Mâm gỗ tròn đội đầu, bày bánh chưng, bánh giầy (mùa Tết đem lên Điện). Gắn xương đầu ở `MAM_AT`. */
export function mamDoi(): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  p.cyl(0.2, 0.17, 0.035, C.woodDark, 0, 0, 0, undefined, 14);
  p.add(new THREE.TorusGeometry(0.195, 0.012, 4, 16), C.bronze, 0, 0.02, 0, [Math.PI / 2, 0, 0]);
  banhChung(p, -0.07, 0.018, 0.02, 0.8);
  banhChung(p, 0.03, 0.018, -0.08, 0.8, 0.3);
  banhGiay(p, 0.08, 0.018, 0.06, 0.9);
  banhGiay(p, -0.02, 0.018, 0.1, 0.8);
  return m.group();
}

/** Chỗ gắn mâm trên xương đầu: đỉnh đầu. */
export const MAM_AT = new THREE.Vector3(0, 0.44, 0);

/** Đồ gánh của hàng `hang`, gắn sẵn vào xương của người `bones` (mâm trên đầu, còn lại ở ngực). */
export function ganhLen(bones: Human, hang: Hang): THREE.Group {
  let load: THREE.Group;
  if (hang === 'go' || hang === 'tre') {
    load = hang === 'go' ? boGo() : boTre();
    load.position.copy(VAC_AT);
  } else if (hang === 'gui') {
    load = guiDay();
    load.position.copy(GUI_AT);
  } else if (hang === 'mam') {
    load = mamDoi();
    load.position.copy(MAM_AT);
  } else {
    load = donGanh(hang);
    load.position.copy(GANH_AT);
  }
  load.userData.hang = hang;
  // Dân không đổ bóng cho nhẹ máy (`makeWorker`): đồ gánh trên vai cũng vậy.
  load.traverse((o) => (o.castShadow = false));
  (hang === 'mam' ? bones.head : bones.chest).add(load);
  return load;
}

/**
 * Tay giữ đồ gánh, đặt sau tư thế đi: tay phải vịn đòn trên vai, tay trái giữ bó gỗ, bó tre trên vai, tay phải đỡ mâm
 * trên đầu. Gùi thì không đổi: dáng người bếp vốn nắm quai gùi.
 */
export function tayGanh(bones: Human, hang: Hang): void {
  if (hang === 'gui') return;
  if (hang === 'go' || hang === 'tre') bones.armL.rotation.set(0, 0, -2.6);
  else if (hang === 'mam') bones.armR.rotation.set(0, 0, 2.75);
  else bones.armR.rotation.set(-1.75, 0, 0.3);
  gripHands(bones);
}
