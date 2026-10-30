// Mô hình chibi ghép từ khối hộp. Gốc tọa độ của mỗi mô hình là tâm chân móng, mặt trước hướng +z.

import * as THREE from 'three';
import { BoxBuilder } from './boxes';
import { C } from './palette';

/** Mái nhà sàn Đông Sơn: hai mái dốc, hai đầu cong vút lên như mũi thuyền. */
function boatRoof(b: BoxBuilder, opts: { length: number; width: number; ridgeY: number; angle: number; color: number; ridgeColor: number }): void {
  const { length, width, ridgeY, angle, color, ridgeColor } = opts;
  const center = length * 0.6;
  const end = (length - center) / 2 + 0.25;
  const tilt = 0.35;
  for (const side of [1, -1]) {
    const z = side * (width / 2) * Math.cos(angle);
    const y = ridgeY - (width / 2) * Math.sin(angle);
    b.box(center, 0.1, width, color, 0, y, z, { rot: [side * angle, 0, 0] });
    for (const dir of [1, -1]) {
      b.box(end, 0.1, width, color, dir * (center / 2 + (end / 2) * Math.cos(tilt) - 0.05), y + (end / 2) * Math.sin(tilt), z, {
        rot: [side * angle, 0, dir * tilt],
      });
    }
  }
  b.box(center + 0.1, 0.14, 0.18, ridgeColor, 0, ridgeY + 0.02, 0);
  for (const dir of [1, -1]) {
    b.box(end + 0.15, 0.14, 0.18, ridgeColor, dir * (center / 2 + end / 2), ridgeY + 0.16, 0, { rot: [0, 0, dir * 0.45] });
  }
}

/** Chim đồng đậu ở hai đầu nóc, hoa văn quen thuộc trên trống đồng. */
function bronzeBird(b: BoxBuilder, x: number, y: number, z: number, dir: number): void {
  b.box(0.22, 0.12, 0.1, C.bronze, x, y, z);
  b.box(0.1, 0.1, 0.08, C.bronze, x + dir * 0.13, y + 0.07, z);
  b.box(0.12, 0.04, 0.04, C.bronzeLight, x + dir * 0.22, y + 0.06, z);
  b.box(0.1, 0.16, 0.04, C.bronze, x - dir * 0.14, y + 0.06, z, { rot: [0, 0, dir * 0.5] });
}

function bronzeDrum(b: BoxBuilder, x: number, z: number, scale = 1): void {
  b.cyl(0.32 * scale, 0.3 * scale, 10, C.bronze, x, 0.15 * scale + 0.06, z);
  b.cyl(0.34 * scale, 0.04 * scale, 10, C.bronzeLight, x, 0.32 * scale + 0.06, z);
  b.box(0.12 * scale, 0.02, 0.12 * scale, C.red, x, 0.35 * scale + 0.06, z);
}

export function makeDien(level: number): THREE.Group {
  const b = new BoxBuilder();
  // Nền đất nện và hàng rào thấp.
  b.box(3.9, 0.12, 3.9, C.soil, 0, 0.06, 0);
  // Cột sàn.
  for (const x of [-1.25, 0, 1.25]) for (const z of [-0.95, 0, 0.95]) b.box(0.18, 1.0, 0.18, C.woodDark, x, 0.6, z);
  // Sàn và vách.
  b.box(3.1, 0.14, 2.5, C.wood, 0, 1.12, 0);
  b.box(2.6, 0.8, 1.9, C.woodLight, 0, 1.59, -0.1);
  b.box(0.6, 0.62, 0.06, C.woodDark, 0, 1.52, 0.86);
  b.box(2.64, 0.08, 0.06, C.red, 0, 1.96, 0.86);
  // Cầu thang trước cửa.
  for (let i = 0; i < 4; i++) b.box(0.62, 0.08, 0.22, C.woodDark, 0, 0.98 - i * 0.26, 1.3 + i * 0.2);
  boatRoof(b, { length: 3.2, width: 1.75, ridgeY: 2.75, angle: 0.72, color: C.thatch, ridgeColor: C.thatchDark });
  bronzeDrum(b, 1.35, 1.45);
  // Cột cờ đỏ.
  b.box(0.07, 2.4, 0.07, C.woodDark, -1.6, 1.26, 1.5);
  b.box(0.55, 0.32, 0.03, C.red, -1.32, 2.2, 1.5);
  if (level >= 2) {
    bronzeBird(b, 2.05, 3.3, 0, 1);
    bronzeBird(b, -2.05, 3.3, 0, -1);
  }
  if (level >= 3) {
    // Hiên bên trái và trống thứ hai.
    b.box(0.9, 0.12, 1.8, C.wood, -1.95, 0.9, 0);
    for (const z of [-0.7, 0.7]) b.box(0.12, 0.84, 0.12, C.woodDark, -2.25, 0.42, z);
    bronzeDrum(b, -1.0, 1.55, 0.8);
  }
  if (level >= 4) {
    // Cột lông chim hai bên lối vào.
    for (const x of [-0.6, 0.6]) {
      b.box(0.08, 1.4, 0.08, C.woodDark, x, 0.76, 1.85);
      b.box(0.08, 0.3, 0.04, C.white, x, 1.6, 1.85, { rot: [0, 0, 0.3] });
      b.box(0.08, 0.3, 0.04, C.red, x, 1.62, 1.85, { rot: [0, 0, -0.3] });
    }
  }
  if (level >= 5) {
    b.box(1.2, 0.06, 0.2, C.bronzeLight, 0, 2.86, 0);
    b.box(2.0, 0.1, 0.08, C.bronzeLight, 0, 1.2, 1.27);
  }
  const group = new THREE.Group();
  group.add(b.build());
  group.scale.setScalar(0.9 + 0.04 * level);
  return group;
}

export function makeRuong(level: number): THREE.Group {
  const b = new BoxBuilder();
  b.box(2.92, 0.12, 2.92, C.soil, 0, 0.06, 0);
  b.box(2.6, 0.06, 2.6, C.paddy, 0, 0.12, 0);
  b.box(2.6, 0.1, 0.12, C.soil, 0, 0.14, 0);
  const ripe = new THREE.Color(C.rice).lerp(new THREE.Color(C.riceRipe), (level - 1) / 4);
  const h = 0.22 + level * 0.05;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (j === 2) continue;
      const x = -1.0 + i * 0.5;
      const z = -1.0 + j * 0.5;
      b.box(0.14, h, 0.14, ripe, x, 0.12 + h / 2, z);
      b.box(0.2, 0.06, 0.2, ripe.clone().offsetHSL(0, 0, 0.05), x, 0.12 + h, z);
    }
  }
  const group = new THREE.Group();
  group.add(b.build());
  return group;
}

/** Bến chợ thuyền, cầu tàu chìa ra phía +z (phía sông). */
export function makeBen(level: number): THREE.Group {
  const b = new BoxBuilder();
  for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.2]) b.box(0.12, 0.4, 0.12, C.woodDark, x, 0.2, z);
  b.box(1.95, 0.12, 1.45, C.woodLight, 0, 0.42, -0.25);
  // Cầu tàu chìa ra sông.
  b.box(0.55, 0.1, 1.7, C.wood, 0.55, 0.32, 1.3);
  for (const z of [0.9, 1.6, 2.1]) b.box(0.1, 0.8, 0.1, C.woodDark, 0.55, -0.05, z);
  // Lều bán hàng.
  b.box(1.0, 0.55, 0.75, C.woodLight, -0.4, 0.76, -0.45);
  b.box(0.36, 0.4, 0.04, C.woodDark, -0.4, 0.7, -0.07);
  boatRoof(b, { length: 1.25, width: 0.62, ridgeY: 1.38, angle: 0.7, color: C.thatch, ridgeColor: C.thatchDark });
  // Hàng hóa: thúng, chum, cá.
  b.cyl(0.14, 0.18, 8, C.thatch, 0.45, 0.57, -0.6);
  b.cyl(0.13, 0.24, 8, C.soil, 0.75, 0.6, -0.25);
  b.box(0.26, 0.06, 0.1, C.white, 0.45, 0.68, -0.6);
  if (level >= 2) b.cyl(0.14, 0.18, 8, C.thatch, 0.15, 0.57, 0.15);
  if (level >= 3) {
    b.box(0.07, 1.2, 0.07, C.woodDark, 0.9, 1.0, 0.35);
    b.box(0.4, 0.24, 0.03, C.indigo, 0.69, 1.45, 0.35);
  }
  if (level >= 4) b.cyl(0.13, 0.24, 8, C.soil, -0.85, 0.6, 0.25);
  if (level >= 5) b.box(0.3, 0.22, 0.3, C.bronze, 0.1, 0.6, -0.15);
  const group = new THREE.Group();
  group.add(b.build());
  return group;
}

export type PersonKind = 'nong' | 'linh' | 'buon' | 'laiDo';

export function makePerson(kind: PersonKind): THREE.Mesh {
  const b = new BoxBuilder();
  const cloth = kind === 'buon' ? C.indigo : C.red;
  for (const x of [-0.06, 0.06]) b.box(0.09, 0.16, 0.1, C.skin, x, 0.08, 0);
  b.box(0.26, 0.16, 0.18, cloth, 0, 0.24, 0);
  b.box(0.24, 0.14, 0.16, C.skin, 0, 0.39, 0);
  for (const x of [-0.16, 0.16]) b.box(0.07, 0.2, 0.08, C.skin, x, 0.36, 0);
  b.box(0.34, 0.3, 0.3, C.skin, 0, 0.6, 0);
  b.box(0.36, 0.1, 0.32, C.hair, 0, 0.77, -0.01);
  b.box(0.36, 0.2, 0.06, C.hair, 0, 0.66, -0.15);
  b.box(0.14, 0.12, 0.14, C.hair, 0, 0.87, -0.07);
  for (const x of [-0.08, 0.08]) b.box(0.05, 0.06, 0.01, C.hair, x, 0.6, 0.155);
  if (kind === 'linh') {
    b.box(0.04, 1.0, 0.04, C.wood, 0.22, 0.5, 0.06);
    b.box(0.07, 0.16, 0.04, C.bronze, 0.22, 1.06, 0.06);
    b.box(0.05, 0.28, 0.04, C.white, 0, 1.0, -0.08, { rot: [0, 0, 0.25] });
  }
  if (kind === 'buon') b.box(0.3, 0.1, 0.3, C.thatch, 0, 0.95, 0);
  if (kind === 'nong') b.box(0.04, 0.6, 0.04, C.woodDark, -0.2, 0.32, 0.08, { rot: [0.4, 0, 0] });
  if (kind === 'laiDo') b.box(0.04, 0.7, 0.04, C.woodDark, 0.18, 0.4, 0.1, { rot: [0.9, 0, 0] });
  return b.build();
}

/** Thuyền độc mộc có mui, mũi hướng +x. */
export function makeBoat(): THREE.Group {
  const b = new BoxBuilder();
  b.box(1.4, 0.18, 0.42, C.woodDark, 0, 0.09, 0);
  b.box(1.3, 0.04, 0.34, C.wood, 0, 0.19, 0);
  for (const dir of [1, -1]) b.box(0.34, 0.14, 0.32, C.woodDark, dir * 0.78, 0.2, 0, { rot: [0, 0, dir * 0.45] });
  b.box(0.55, 0.26, 0.44, C.thatch, -0.1, 0.34, 0);
  b.box(0.18, 0.12, 0.18, C.thatch, 0.35, 0.26, 0.05);
  const group = new THREE.Group();
  group.add(b.build());
  const rower = makePerson('laiDo');
  rower.scale.setScalar(0.8);
  rower.position.set(-0.55, 0.18, 0);
  rower.rotation.y = Math.PI / 2;
  group.add(rower);
  return group;
}
