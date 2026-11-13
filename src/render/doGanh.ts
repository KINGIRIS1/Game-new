// Đồ gánh của dân: đòn gánh tre hai đầu hai thúng (thóc, rau, vỏ ốc, đá, sắt, cá, lá dong, thịt) và bó gỗ vác vai.
// Gắn vào xương ngực của người (`makeWorker`), nên đi theo dáng người. Dùng cho dân gánh hàng về kho (world.ts,
// ganhHang.ts) và đoàn dân rút ở Cấm Khê (battlefield.ts).

import * as THREE from 'three';
import { gripHands, type Human } from './body';
import { rod } from './congTrinh/chung';
import type { Hang } from './ganhHang';
import { C } from './palette';
import { ToonModel, inkThin } from './toon';

/** Màu hàng vun trên miệng thúng. */
const MAU: Record<Exclude<Hang, 'go'>, number> = {
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
function hangTrongThung(m: ToonModel, hang: Exclude<Hang, 'go'>, z: number): void {
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
export function donGanh(hang: Exclude<Hang, 'go'> | [Exclude<Hang, 'go'>, Exclude<Hang, 'go'>]): THREE.Group {
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

/** Đồ gánh của hàng `hang`, gắn sẵn vào xương ngực của người `bones`. */
export function ganhLen(bones: Human, hang: Hang): THREE.Group {
  const load = hang === 'go' ? boGo() : donGanh(hang);
  load.position.copy(hang === 'go' ? VAC_AT : GANH_AT);
  load.userData.hang = hang;
  // Dân không đổ bóng cho nhẹ máy (`makeWorker`): đồ gánh trên vai cũng vậy.
  load.traverse((o) => (o.castShadow = false));
  bones.chest.add(load);
  return load;
}

/** Tay giữ đồ gánh, đặt sau tư thế đi: tay phải vịn đòn trên vai, hay tay trái giữ bó gỗ trên vai. */
export function tayGanh(bones: Human, hang: Hang): void {
  if (hang === 'go') bones.armL.rotation.set(0, 0, -2.6);
  else bones.armR.rotation.set(-1.75, 0, 0.3);
  gripHands(bones);
}
