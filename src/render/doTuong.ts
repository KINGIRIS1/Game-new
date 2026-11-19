// Món trang bị của các bộ tướng (trangBi.ts), dựng bằng code theo nét Đông Sơn như mọi đồ trong game. Mỗi món có:
// - `rieng`: mô hình đứng riêng: ảnh món vẽ sẵn (anhDo.ts) dùng mô hình này; thú cưỡi, bảo vật cũng dùng nó trong hình
//   tướng mặc đồ (hinhTuong.ts);
// - `mac`: cách mặc lên thân người (tọa độ thân người thường `HUMAN` như mọi đồ mặc ở nanDo.ts): vũ khí cầm tay, giáp
//   ôm thân, miện trên đầu, áo choàng, bao tên sau lưng.
// Phần lớn món vẽ bằng chính hàm vẽ đồ của tướng mang bộ ấy (weapons.ts, heroes.ts, nanDo.ts), nên món trong túi đồ
// giống đúng đồ tướng mang ra trận. Thêm mới: sừng tê bảy tấc, ấn Trưng Vương, áo giáp vàng, áo choàng lá rừng, giá gỗ.

import * as THREE from 'three';
import { BO_DO, O_DO, type BoDo, type ODo } from '../game/defs';
import { bakeVoiTran } from './beasts';
import { GRIP_L, GRIP_R, HUMAN, type HumanRig } from './body';
import { CAO_QUIVER, MIEN, VOI_TRANG, aoBaoDen, aoLauSay, baoTenDong, bakeIronHorse, giapDaTrau, giapVayDong, giongWeapon, mongRong, sonStaff, type TheCamTuong } from './heroes';
import { armor, chestDisc, cloak, diadem, mien, pauldrons, shoulderRocks, skirtArmor, studs } from './nanDo';
import { C } from './palette';
import { RigBuilder, bakeRig } from './rig';
import { ToonModel, inkThin } from './toon';
import { IRON, IRON_DARK, LEATHER, arrow, bow, coLac, crossbowParts, daoVanAn, giaoDaTrach, guomDong, guomNuiNua, hornTrumpet, repeatingCrossbow, type Parts } from './weapons';

export type MonId = `${BoDo}-${ODo}`;
export const monId = (bo: BoDo, o: ODo): MonId => `${bo}-${o}`;
/** Mọi món, theo bộ rồi theo ô. */
export const MON_IDS: MonId[] = BO_DO.flatMap((bo) => O_DO.map((o) => monId(bo, o)));

/**
 * Món ở đâu trên hình tướng: cầm tay (`tay`), ôm thân (`than`), trên đầu (`dau`), sau lưng (`lung`), thú cưỡi đứng sau
 * tướng (`thu`), bảo vật lơ lửng bên vai (`bay`), cắm đất bên cạnh (`dat`: cờ, khóm tre). Món cầm tay, ôm thân, trên
 * đầu, sau lưng thay phần cùng chỗ của tướng (heroes.ts `ThayDo`).
 */
export type ChoMon = 'tay' | 'than' | 'dau' | 'lung' | 'thu' | 'bay' | 'dat';

/** Thế cầm vũ khí ở hình tướng (`TheCamTuong` ở heroes.ts): roi, gậy dựng bên phải; gươm trước vai; nỏ ngang hông; cung tay trái. */
export type TheCam = TheCamTuong;

export interface VeMon {
  cho: ChoMon;
  /** Vũ khí: thế cầm. */
  cam?: TheCam;
  /** Vẽ lên thân người (món cầm tay, ôm thân, trên đầu, sau lưng). `k`: cỡ thân người của tướng mặc (vũ khí giữ cỡ thật). */
  mac?: (h: HumanRig, k: number) => void;
  /** Mô hình đứng riêng. */
  rieng: () => THREE.Group;
  /** Xoay mô hình đứng riêng khi chụp ảnh (radian), cho món dài nằm chéo khung vuông, món mặc quay mặt đẹp. */
  xoay?: [number, number, number];
}

/** Màu ngà sừng tê: gốc ngà sáng, ngọn sẫm dần. */
const NGA = 0xe9dcb8;
const NGA_SAM = 0x6b4a2a;
const GO_GIA = 0x6e4a2c;
/** Da thuộc sẫm (viền giáp da Cao Lỗ). */
const DA_SAM = 0x5e3a20;

// ---------- Món mới ----------

/**
 * Sừng tê bảy tấc An Dương Vương cầm rẽ nước xuống biển: sừng thon cong vút về trước, ngà sáng ở gốc sẫm dần ra ngọn;
 * gốc bịt vàng hoa văn, dây thao đỏ quấn hai vòng, nút và hai tua đỏ buông. Gốc ở giữa đáy sừng, ngọn cong về +z.
 */
export function sungTe(m: Parts): void {
  const p = m.plain;
  const n = 10;
  const at = (t: number) => new THREE.Vector3(0, 0.44 * t - 0.1 * t * t * t, 0.3 * t * t);
  const rad = (t: number) => 0.062 * Math.pow(1 - t, 0.85) + 0.004;
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const ca = new THREE.Color(NGA);
  const cb = new THREE.Color(NGA_SAM);
  for (let i = 0; i < n; i++) {
    const a = at(i / n);
    const b = at((i + 1) / n);
    const dir = b.clone().sub(a);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    e.setFromQuaternion(q.setFromUnitVectors(up, dir.clone().normalize()));
    const col = ca.clone().lerp(cb, Math.pow((i + 0.5) / n, 1.8)).getHex();
    p.cyl(rad((i + 1) / n), rad(i / n), dir.length() * 1.08, col, mid.x, mid.y, mid.z, [e.x, e.y, e.z], 10);
  }
  // Bịt vàng hoa văn ở gốc, viền vàng sẫm hai mép.
  m.band.cyl(0.072, 0.07, 0.05, C.gold, 0, 0.005, 0, undefined, 14);
  p.cyl(0.076, 0.076, 0.012, C.goldDark, 0, 0.032, 0, undefined, 14);
  p.cyl(0.074, 0.074, 0.012, C.goldDark, 0, -0.02, 0, undefined, 14);
  // Dây thao đỏ quấn trên bịt vàng, nút và hai tua buông.
  for (const t of [0.13, 0.18]) {
    const c = at(t);
    p.add(new THREE.TorusGeometry(rad(t) + 0.004, 0.007, 5, 18), C.red, c.x, c.y, c.z, [Math.PI / 2 - 0.25 * t * 4, 0, 0]);
  }
  p.sphere(0.016, C.red, 0, 0.065, -0.06, [1, 1, 1], 6);
  p.cone(0.02, 0.11, C.red, 0.01, 0.0, -0.075, [Math.PI + 0.25, 0, 0.1], 6);
  p.cone(0.016, 0.09, C.red, -0.012, 0.01, -0.07, [Math.PI + 0.1, 0, -0.12], 6);
}

/**
 * Ấn Hắc Đế của Mai Thúc Loan: khối ngọc đen vuông, mặt dưới son đỏ, viền vàng quanh thân ấn; núm ấn hình con trâu
 * vàng nằm (ông thuở nhỏ chăn trâu); dây thao đỏ buộc ở núm, tua buông. Đáy ở y = 0, đầu trâu hướng +z.
 */
export function anHacDe(m: Parts): void {
  const p = m.plain;
  p.box(0.3, 0.03, 0.3, C.red, 0, 0.015, 0);
  p.box(0.28, 0.17, 0.28, C.hacDe, 0, 0.115, 0);
  m.band.box(0.29, 0.035, 0.29, C.gold, 0, 0.17, 0);
  p.box(0.25, 0.02, 0.25, C.hacDeLight, 0, 0.2, 0);
  // Núm trâu vàng nằm: mình dài, lưng gù, đầu nhô ra trước, sừng cong lưỡi liềm, chân xếp dưới bụng.
  const y = 0.25;
  p.sphere(0.065, C.gold, 0, y, -0.02, [0.85, 0.7, 1.45], 10);
  p.sphere(0.045, C.gold, 0, y + 0.035, -0.04, [0.9, 0.7, 1], 8);
  p.sphere(0.04, C.gold, 0, y + 0.005, 0.1, [0.85, 0.8, 1.05], 8);
  p.sphere(0.026, C.goldDark, 0, y - 0.012, 0.135, [1, 0.75, 0.8], 7);
  p.add(new THREE.TorusGeometry(0.048, 0.01, 5, 14, Math.PI), C.goldDark, 0, y + 0.03, 0.095, [-0.35, 0, 0]);
  for (const sd of [-1, 1]) {
    p.sphere(0.018, C.gold, sd * 0.05, y - 0.035, 0.05, [1, 0.6, 1.4], 6);
    p.sphere(0.018, C.gold, sd * 0.05, y - 0.035, -0.08, [1, 0.6, 1.4], 6);
  }
  p.cone(0.008, 0.06, C.goldDark, 0, y + 0.01, -0.12, [-2.2, 0, 0], 4);
  // Dây thao đỏ, tua buông xuống bên thân ấn.
  p.add(new THREE.TorusGeometry(0.03, 0.008, 5, 14), C.red, 0, y + 0.04, -0.08, [0, Math.PI / 2, 0]);
  p.cone(0.022, 0.12, C.red, 0.1, 0.18, -0.15, [Math.PI + 0.3, 0, 0.2], 6);
}

/**
 * Thuyền độc mộc của Triệu Quang Phục: thân khoét từ một khúc gỗ, hai đầu thon, mũi vểnh, lòng thuyền sẫm, mép gỗ sáng; mũi
 * chạm đầu chim Lạc, một mái chèo gác ngang, bó lau sậy dưới lòng. Đáy ở y = 0, mũi hướng +z.
 */
export function thuyenDocMoc(m: Parts): void {
  const p = m.plain;
  const L = 1.5;
  p.sphere(0.2, GO_GIA, 0, 0.13, 0, [1, 0.65, L / 0.4], 12);
  p.box(0.26, 0.03, L * 0.7, 0x3a2616, 0, 0.255, 0);
  for (const sd of [-1, 1]) p.box(0.03, 0.03, L * 0.72, 0x9a6b3e, sd * 0.14, 0.26, 0);
  // Mũi vểnh, đầu chim Lạc mỏ dài.
  p.cone(0.06, 0.28, GO_GIA, 0, 0.3, L / 2 - 0.05, [-0.9, 0, 0], 6);
  p.sphere(0.05, 0x9a6b3e, 0, 0.42, L / 2 + 0.06, [1, 1, 1.2], 7);
  p.cone(0.016, 0.14, C.goldDark, 0, 0.43, L / 2 + 0.16, [Math.PI / 2, 0, 0], 5);
  // Mái chèo gác ngang, bó lau sậy.
  p.box(0.7, 0.025, 0.025, C.woodLight, 0.08, 0.3, -0.1, [0, 0.35, 0]);
  p.box(0.06, 0.012, 0.2, C.woodLight, 0.42, 0.3, -0.23, [0, 0.35, 0]);
  for (let i = 0; i < 5; i++) p.cyl(0.012, 0.012, 0.7, C.lauSay, -0.06 + i * 0.025, 0.28, 0.2, [Math.PI / 2, 0, 0.05 * (i - 2)], 4);
  p.cyl(0.03, 0.03, 0.02, C.tqp, 0, 0.28, 0.2, [Math.PI / 2, 0, 0], 6);
}

/**
 * Trâm vàng Bà Triệu cài búi tóc: thân trâm vàng thon dài, đầu trâm chim Lạc dang cánh khảm ngọc xanh, hai chuỗi hạt
 * đỏ buông dưới cánh. Gốc ở mũi trâm, đầu trâm hướng +y.
 */
export function tramVang(m: Parts): void {
  const p = m.plain;
  p.cone(0.012, 0.42, C.gold, 0, 0.21, 0, [Math.PI, 0, 0], 6);
  p.cyl(0.014, 0.014, 0.03, C.goldDark, 0, 0.43, 0, undefined, 6);
  // Đầu trâm: chim Lạc dang cánh, mỏ dài, mào, ngọc xanh giữa ngực.
  const y = 0.49;
  p.sphere(0.04, C.gold, 0, y, 0, [0.8, 1.1, 0.7], 8);
  p.sphere(0.022, C.gold, 0, y + 0.06, 0.01, [1, 1, 1], 7);
  p.cone(0.008, 0.08, C.goldDark, 0, y + 0.06, 0.06, [Math.PI / 2 + 0.2, 0, 0], 5);
  p.cone(0.008, 0.04, C.goldDark, 0, y + 0.095, -0.005, [-0.4, 0, 0], 5);
  for (const sd of [-1, 1]) {
    m.band.box(0.11, 0.035, 0.012, C.gold, sd * 0.07, y + 0.01, 0, [0, 0, sd * 0.45]);
    p.box(0.06, 0.02, 0.01, C.goldDark, sd * 0.12, y + 0.04, 0, [0, 0, sd * 0.7]);
    for (let i = 0; i < 3; i++) p.sphere(0.011, C.red, sd * 0.1, y - 0.03 - i * 0.03, 0, [1, 1, 1], 5);
  }
  p.sphere(0.018, C.baTrieu, 0, y, 0.03, [1, 1, 0.6], 7);
}

/**
 * Ấn Trưng Vương: khối ấn vàng vuông hai tầng, thành ấn hoa văn trống đồng, núm chim Lạc đậu xếp cánh (mỏ dài, mào,
 * đuôi xòe), dây thao đỏ luồn qua núm, hai tua buông trước ấn. Đáy ấn ở y = 0.
 */
export function anTrungVuong(m: Parts): void {
  const p = m.plain;
  const w = 0.26;
  m.band.box(w, 0.12, w, C.gold, 0, 0.06, 0);
  p.box(w + 0.02, 0.022, w + 0.02, C.goldDark, 0, 0.012, 0);
  p.box(w + 0.012, 0.02, w + 0.012, C.goldDark, 0, 0.122, 0);
  p.box(w * 0.78, 0.05, w * 0.78, C.gold, 0, 0.155, 0);
  p.box(w * 0.6, 0.022, w * 0.6, C.goldDark, 0, 0.19, 0);
  // Chim Lạc đậu trên núm: thân, cổ vươn, đầu, mỏ dài, mào, cánh xếp, đuôi xòe.
  const by = 0.25;
  p.sphere(0.055, C.gold, 0, by, -0.01, [0.85, 0.75, 1.35], 10);
  p.cyl(0.02, 0.028, 0.1, C.gold, 0, by + 0.07, 0.055, [0.55, 0, 0], 8);
  p.sphere(0.03, C.gold, 0, by + 0.12, 0.08, [1, 1, 1.1], 8);
  p.cone(0.012, 0.13, C.goldDark, 0, by + 0.11, 0.16, [Math.PI / 2 + 0.25, 0, 0], 6);
  p.cone(0.012, 0.06, C.goldDark, 0, by + 0.16, 0.06, [-0.6, 0, 0], 5);
  for (const sd of [-1, 1]) {
    p.sphere(0.045, C.goldDark, sd * 0.042, by + 0.01, -0.02, [0.35, 0.6, 1.25], 8);
    p.sphere(0.007, C.ink, sd * 0.024, by + 0.128, 0.098, [1, 1, 1], 5);
  }
  p.box(0.11, 0.015, 0.09, C.goldDark, 0, by + 0.0, -0.11, [0.45, 0, 0]);
  p.box(0.05, 0.05, 0.05, C.gold, 0, 0.21, 0);
  // Dây thao đỏ luồn qua núm, nút đôi, hai tua buông trước ấn.
  p.add(new THREE.TorusGeometry(0.045, 0.008, 5, 16), C.red, 0, 0.215, 0.03, [0.2, 0, 0]);
  for (const sd of [-1, 1]) {
    p.box(0.012, 0.1, 0.012, C.red, sd * 0.035, 0.17, 0.11, [0.5, 0, sd * 0.25]);
    p.sphere(0.017, C.red, sd * 0.05, 0.13, 0.145, [1, 1, 1], 6);
    p.cone(0.022, 0.11, C.red, sd * 0.055, 0.065, 0.15, [Math.PI, 0, sd * 0.06], 6);
  }
}

/**
 * Đá thiêng Tản Viên: khối đá ba đỉnh núi như đầu gậy thần Sơn Tinh, mạch ngọc lục sáng, chồi lá rừng quanh chân, đặt
 * trên đế đồng hoa văn ba chân. Đáy đế ở y = 0.
 */
export function daThieng(m: Parts): void {
  const p = m.plain;
  // Đế đồng ba chân.
  m.band.cyl(0.16, 0.12, 0.08, C.bronze, 0, 0.08, 0, undefined, 14);
  p.cyl(0.17, 0.17, 0.022, C.gold, 0, 0.125, 0, undefined, 14);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    p.box(0.035, 0.07, 0.05, C.bronzeDark, Math.cos(a) * 0.11, 0.025, Math.sin(a) * 0.11, [0, -a, 0]);
  }
  // Khối đá ba đỉnh.
  p.sphere(0.17, C.rockDark, 0, 0.27, 0, [1.05, 0.95, 0.9], 10);
  p.cone(0.13, 0.32, C.rock, 0, 0.43, 0, undefined, 7);
  for (const s of [-1, 1]) p.cone(0.1, 0.25, C.rock, s * 0.12, 0.36, -0.01, [0, 0, -s * 0.38], 6);
  p.cone(0.035, 0.06, C.cream, 0, 0.58, 0, undefined, 6);
  // Mạch ngọc lục phát sáng ở mặt trước và chỏm đỉnh giữa.
  m.glow.sphere(0.055, 0x5fd89a, 0, 0.29, 0.14, [0.8, 1.25, 0.55], 8);
  m.glow.sphere(0.025, 0x9af0c0, 0.06, 0.37, 0.1, [1, 1, 0.6], 6);
  m.glow.sphere(0.02, 0x9af0c0, -0.07, 0.24, 0.12, [1, 1, 0.6], 6);
  // Chồi lá rừng mọc quanh chân đá.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    p.cone(0.04, 0.17, C.leaf[i % 4], Math.cos(a) * 0.15, 0.2, Math.sin(a) * 0.15, [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.9], 4);
  }
}

/** Giáp sắt của Gióng: giáp lá vảy sắt ba hàng viền vàng, hộ tâm mặt trống đồng, giáp vai sắt, hai vạt giáp đùi. */
function giapSat(h: HumanRig): void {
  skirtArmor(h, { color: IRON, trim: C.gold, rows: 2, to: 0.24, panels: [0, Math.PI], half: 0.5 });
  armor(h, { color: IRON, trim: C.gold, rows: 3, scales: true, y0: 0.395, y1: 0.6 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.078, rim: C.bronze, thick: 0.024 });
  pauldrons(h, { color: IRON, trim: C.gold, layers: 1, size: 1.05 });
}

/** Giáp đồng hoa văn của Sơn Tinh: giáp ngực đồng chạm trống đồng, giáp vai đắp đá núi Ba Vì, vạt đá che hông. */
function giapDongHoaVan(h: HumanRig): void {
  skirtArmor(h, { color: C.rockDark, trim: C.gold, rows: 1, to: 0.23, panels: [0, Math.PI], half: 0.45 });
  armor(h, { color: C.bronze, trim: C.gold, pattern: true, y0: 0.395, y1: 0.6 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.072, rim: C.bronzeDark, thick: 0.02 });
  pauldrons(h, { color: C.rockDark, trim: C.gold, size: 1.05 });
  shoulderRocks(h, { color: C.rock, dark: C.rockDark, sprout: C.leaf[1], size: 1.05 });
}

/** Giáp đồng của An Dương Vương: giáp ngực hoàng gia, hộ tâm vàng ròng, giáp vai hai tầng có gai vàng, vạt giáp đùi. */
function giapDong(h: HumanRig): void {
  skirtArmor(h, { color: C.bronze, trim: C.gold, rows: 2, to: 0.2, panels: [0, Math.PI], half: 0.5 });
  armor(h, { color: C.bronze, trim: C.gold, pattern: true, y0: 0.395, y1: 0.6 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.078, rim: C.goldDark, thick: 0.02 });
  pauldrons(h, { color: C.bronzeLight, trim: C.gold, layers: 2, size: 1.15, spike: C.gold });
}

/** Giáp da khảm đồng của Cao Lỗ: giáp da viền đồng, hộ tâm mặt trống đồng, hai hàng đinh đồng trước sau, giáp vai da. */
function giapDa(h: HumanRig): void {
  skirtArmor(h, { color: LEATHER, trim: DA_SAM, rows: 2, to: 0.22, panels: [0, Math.PI], half: 0.45 });
  armor(h, { color: LEATHER, trim: C.bronze, y0: 0.39, y1: 0.6 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.066, rim: C.bronzeDark, thick: 0.02 });
  const row = (y: number, xs: number[]): [number, number][] => xs.map((x) => [x, y]);
  studs(h, { color: C.bronzeLight, at: [...row(0.44, [-0.12, -0.085, 0.085, 0.12]), ...row(0.54, [-0.12, -0.09, 0.09, 0.12])], thick: 0.02 });
  studs(h, { color: C.bronzeLight, at: [...row(0.44, [-0.07, 0, 0.07]), ...row(0.54, [-0.07, 0, 0.07])], back: true, thick: 0.02 });
  pauldrons(h, { color: LEATHER, trim: C.bronze, size: 1.05 });
}

/** Giáp ngực đồng của Trưng Trắc: giáp mỏng hoa văn viền vàng, hộ tâm mặt trống đồng, giáp vai đồng nhỏ. */
function giapNgucDong(h: HumanRig): void {
  armor(h, { color: C.bronze, trim: C.gold, pattern: true, y0: 0.392, y1: 0.59, thick: 0.012 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.058, thick: 0.016 });
  pauldrons(h, { color: C.bronzeLight, trim: C.gold, size: 0.9 });
}

/** Miện vàng của An Dương Vương: vòng sắt, vành vàng hoa văn ngọc đỏ, miện lá vàng khảm đỏ son có chóp và tai xoắn. */
function mienVang(h: HumanRig): void {
  diadem(h, { color: IRON_DARK, y: 0.8, h: 0.03, puff: 0.014 });
  diadem(h, { color: C.gold, pattern: true, y: 0.828, h: 0.07, puff: 0.01, edge: C.goldDark, gem: C.red });
  mien(h, { ...MIEN, color: C.gold, inlay: C.red, bar: C.ember, disc: C.gold, discRim: C.goldDark, finial: C.gold, curls: C.gold, h: 0.3, w: 0.085, y: 0.885, discR: 0.1 });
}

/** Áo giáp vàng của Trưng Nhị: giáp lá vàng ba hàng vảy viền đỏ, hộ tâm mặt trống đồng viền đỏ, giáp vai vàng viền đỏ. */
function aoGiapVang(h: HumanRig): void {
  skirtArmor(h, { color: C.gold, trim: C.red, rows: 2, to: 0.23, panels: [0, Math.PI], half: 0.45 });
  armor(h, { color: C.gold, trim: C.red, rows: 3, scales: true, y0: 0.392, y1: 0.59, thick: 0.014 });
  chestDisc(h, { color: C.gold, drum: true, r: 0.062, rim: C.red, thick: 0.02 });
  pauldrons(h, { color: C.gold, trim: C.red, size: 0.95 });
}

/**
 * Áo choàng lá rừng của Sơn Tinh: áo choàng màu rừng già viền đồng, khuy vàng, phủ vai và lưng một lớp lá rừng như
 * cổ áo tơi lá.
 */
function aoChoangLa(h: HumanRig): void {
  cloak(h, { color: C.mountainCloak, trim: C.bronze, clasp: C.gold, hem: 0.14, flare: 0.12 });
  h.local('chest', [0, 0.585, 0], null, (s) => {
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let row = 0; row < 2; row++) {
      const n = row ? 9 : 7;
      for (let i = 0; i < n; i++) {
        // Lá phủ hai vai và lưng (từ vai này vòng ra sau tới vai kia): cuống ở cổ áo, ngọn chĩa xuống, ra ngoài.
        const a = Math.PI * (1 + (1.0 * i) / (n - 1)) + (row ? 0.05 : 0);
        const r = 0.1 + row * 0.035;
        const ox = Math.cos(a);
        const oz = Math.sin(a);
        const dir = new THREE.Vector3(ox * 0.75, -1, oz * 0.75).normalize();
        e.setFromQuaternion(q.setFromUnitVectors(up, dir));
        const len = 0.17 + 0.03 * row;
        s.plain.cone(0.05, len, C.leaf[(i + row) % 4], ox * r + (dir.x * len) / 2, -0.02 - row * 0.06 + (dir.y * len) / 2, oz * r - 0.02 + (dir.z * len) / 2, [e.x, e.y, e.z], 4);
      }
    }
  });
}

/** Giá gỗ treo giáp (ảnh món giáp, áo choàng): cọc gỗ trên chân chữ thập, xà vai, núm đầu tròn. */
function giaGo(r: HumanRig): void {
  const s = r.on('hips').plain;
  s.cyl(0.03, 0.034, 0.58, GO_GIA, 0, 0.29, 0, undefined, 8);
  for (const a of [0, Math.PI / 2]) s.box(0.34, 0.035, 0.05, GO_GIA, 0, 0.02, 0, [0, a + Math.PI / 4, 0]);
  s.box(0.34, 0.035, 0.04, GO_GIA, 0, 0.545, 0);
  s.cyl(0.024, 0.024, 0.07, GO_GIA, 0, 0.62, 0, undefined, 8);
  s.sphere(0.07, C.woodLight, 0, 0.71, 0, [1, 1.1, 1], 10);
}

/** Gối đỏ đặt miện (ảnh món miện): nệm vuông đỏ viền vàng, bốn tua vàng ở góc. Mặt nệm ở `y`. */
function goiDo(m: ToonModel, y: number): void {
  const p = m.plain;
  p.box(0.3, 0.07, 0.3, C.red, 0, y - 0.035, 0);
  p.sphere(0.15, C.red, 0, y - 0.01, 0, [1.05, 0.22, 1.05], 12);
  m.band.box(0.31, 0.018, 0.31, C.gold, 0, y - 0.06, 0);
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    p.sphere(0.018, C.gold, x * 0.15, y - 0.04, z * 0.15, [1, 1, 1], 6);
    p.cone(0.02, 0.08, C.gold, x * 0.16, y - 0.09, z * 0.16, [Math.PI, 0, 0], 5);
  }
}

// ---------- Dựng mô hình ----------

/** Mô hình từ một hàm vẽ kiểu `Parts` (vũ khí, bảo vật). */
function toon(draw: (m: ToonModel) => void): () => THREE.Group {
  return () => {
    const m = new ToonModel(inkThin);
    draw(m);
    return m.group();
  };
}

/** Món mặc lên thân vẽ trên khung người vô hình rồi nướng tĩnh, kèm giá gỗ (giáp, áo choàng) hay không. */
function tren(draw: (h: HumanRig) => void, stand: boolean): () => THREE.Group {
  return () => {
    const r = new RigBuilder(HUMAN);
    if (stand) giaGo(r);
    draw(r);
    return bakeRig(r.build());
  };
}

/** Mô hình `rieng` xoay quanh trục đứng một góc. */
function quay(rieng: () => THREE.Group, y: number): () => THREE.Group {
  return () => {
    const g = rieng();
    g.rotation.y = y;
    const root = new THREE.Group();
    root.add(g);
    return root;
  };
}

/** Cầm tay phải (thân người cỡ `k`), dựng như vũ khí của tướng (`r.local('hand', GRIP_R, …)`). */
function tayPhai(draw: (s: Parts, k: number) => void): (h: HumanRig, k: number) => void {
  return (h, k) => h.local('hand', GRIP_R, null, (s) => draw(s, k));
}

/** Sáu bộ, mỗi bộ bốn món. */
export const MON_VE: Record<MonId, VeMon> = {
  // Bộ Phù Đổng (Gióng).
  'phuDong-vuKhi': {
    cho: 'tay',
    cam: 'dung',
    mac: tayPhai((s) => giongWeapon(s, false)),
    rieng: toon((m) => giongWeapon(m, false)),
    xoay: [0, 0, -Math.PI / 4],
  },
  'phuDong-giap': { cho: 'than', mac: giapSat, rieng: tren(giapSat, true), xoay: [0, 0.45, 0] },

  'phuDong-phucSuc': { cho: 'thu', rieng: bakeIronHorse, xoay: [0, 0.9, 0] },
  'phuDong-baoVat': { cho: 'dat', rieng: toon((m) => giongWeapon(m, true)), xoay: [0, 0, -0.35] },

  // Bộ Tản Viên (Sơn Tinh).
  'tanVien-vuKhi': { cho: 'tay', cam: 'dung', mac: tayPhai(sonStaff), rieng: toon(sonStaff), xoay: [0, 0, -Math.PI / 4] },
  'tanVien-giap': { cho: 'than', mac: giapDongHoaVan, rieng: tren(giapDongHoaVan, true), xoay: [0, 0.45, 0] },

  'tanVien-phucSuc': { cho: 'lung', mac: aoChoangLa, rieng: tren(aoChoangLa, true), xoay: [0, Math.PI - 0.6, 0] },
  'tanVien-baoVat': { cho: 'bay', rieng: toon(daThieng), xoay: [0, 0.3, 0] },

  // Bộ Cổ Loa (An Dương Vương).
  'coLoa-vuKhi': {
    cho: 'tay',
    cam: 'no',
    mac: tayPhai((s, k) => crossbowParts(s, true, 1.15 / k)),
    rieng: toon((m) => crossbowParts(m, true, 1)),
    xoay: [0.35, -0.7, 0],
  },
  'coLoa-giap': { cho: 'than', mac: giapDong, rieng: tren(giapDong, true), xoay: [0, 0.45, 0] },

  'coLoa-phucSuc': {
    cho: 'dau',
    mac: mienVang,
    rieng: () => {
      // Miện đặt trên gối đỏ: chân miện (vòng sắt) ngang mặt gối.
      const crown = tren(mienVang, false)();
      const m = new ToonModel(inkThin);
      goiDo(m, 0.79);
      crown.add(m.group());
      return crown;
    },
    xoay: [0.12, 0.35, 0],
  },

  'coLoa-baoVat': { cho: 'bay', rieng: toon(sungTe), xoay: [0, 1.75, 0] },

  // Bộ Cao Lỗ.
  'caoLo-vuKhi': {
    cho: 'tay',
    cam: 'no',
    mac: tayPhai((s, k) => repeatingCrossbow(s, 1.05 / k)),
    rieng: toon((m) => repeatingCrossbow(m, 1)),
    xoay: [0.35, -0.7, 0],
  },
  'caoLo-giap': { cho: 'than', mac: giapDa, rieng: tren(giapDa, true), xoay: [0, 0.45, 0] },

  'caoLo-phucSuc': {
    cho: 'lung',
    mac: (h) => h.local('chest', CAO_QUIVER[0], CAO_QUIVER[1], baoTenDong),
    rieng: toon(baoTenDong),
    xoay: [0.2, 0.5, -0.75],
  },
  'caoLo-baoVat': { cho: 'bay', rieng: toon((m) => hornTrumpet(m, 1)), xoay: [0, -1.1, 0] },

  // Bộ Trưng Trắc.
  'trungTrac-vuKhi': { cho: 'tay', cam: 'kiem', mac: tayPhai(guomDong), rieng: toon(guomDong), xoay: [0, 1.2, -Math.PI / 4] },
  'trungTrac-giap': { cho: 'than', mac: giapNgucDong, rieng: tren(giapNgucDong, true), xoay: [0, 0.45, 0] },

  'trungTrac-phucSuc': { cho: 'thu', rieng: () => bakeVoiTran({ pad: C.red, trim: C.gold, drum: true }), xoay: [0, 1.25, 0] },
  'trungTrac-baoVat': { cho: 'bay', rieng: toon(anTrungVuong), xoay: [0, 0.35, 0] },

  // Bộ Trưng Nhị.
  'trungNhi-vuKhi': {
    cho: 'tay',
    cam: 'cung',
    mac: (h) => {
      h.local('handL', GRIP_L, null, (s) => bow(s, true, true));
      h.local('hand', GRIP_R, null, (s) => arrow(s));
    },
    rieng: toon((m) => bow(m, true, true)),
    xoay: [0, -1.1, -0.5],
  },
  'trungNhi-giap': { cho: 'than', mac: aoGiapVang, rieng: tren(aoGiapVang, true), xoay: [0, 0.45, 0] },
  'trungNhi-phucSuc': { cho: 'thu', rieng: () => bakeVoiTran({ pad: C.trungYellow, trim: C.red }), xoay: [0, 1.25, 0] },
  'trungNhi-baoVat': { cho: 'dat', rieng: toon(coLac), xoay: [0, 1.45, -0.12] },

  // Bộ Núi Nưa (Bà Triệu, tướng dã ngoại map 6).
  'nuiNua-vuKhi': { cho: 'tay', cam: 'kiem', mac: tayPhai(guomNuiNua), rieng: toon(guomNuiNua), xoay: [0, 1.2, -Math.PI / 4] },
  'nuiNua-giap': { cho: 'than', mac: giapVayDong, rieng: tren(giapVayDong, true), xoay: [0, 0.45, 0] },
  'nuiNua-phucSuc': { cho: 'thu', rieng: () => bakeVoiTran(VOI_TRANG), xoay: [0, 1.25, 0] },
  'nuiNua-baoVat': { cho: 'bay', rieng: toon(tramVang), xoay: [0.5, 0.4, -0.9] },

  // Bộ Dạ Trạch (Triệu Quang Phục, tướng dã ngoại map 7).
  // Giáo cầm ở hình tướng ngắn hơn chút cho vừa khung tướng cao (Gióng).
  'daTrach-vuKhi': { cho: 'tay', cam: 'dung', mac: tayPhai((s) => giaoDaTrach(s, 1.2)), rieng: toon((m) => giaoDaTrach(m)), xoay: [0, 0, -Math.PI / 4] },
  'daTrach-giap': { cho: 'than', mac: aoLauSay, rieng: tren(aoLauSay, true), xoay: [0, 0.45, 0] },
  'daTrach-phucSuc': { cho: 'thu', rieng: toon(thuyenDocMoc), xoay: [0.35, 0.95, 0] },
  // Móng rồng xòe ngón theo chiều trước sau cho gọn bên vai ở hình tướng.
  'daTrach-baoVat': { cho: 'bay', rieng: quay(toon((m) => mongRong(m, 2, 0.12)), Math.PI / 2), xoay: [0.2, 0.6 - Math.PI / 2, 0] },

  // Bộ Vạn An (Mai Thúc Loan, tướng dã ngoại map 8).
  'vanAn-vuKhi': { cho: 'tay', cam: 'dung', mac: tayPhai((s) => daoVanAn(s, 1.2)), rieng: toon((m) => daoVanAn(m)), xoay: [0, 1.2, -Math.PI / 4] },
  'vanAn-giap': { cho: 'than', mac: giapDaTrau, rieng: tren(giapDaTrau, true), xoay: [0, 0.45, 0] },
  'vanAn-phucSuc': { cho: 'lung', mac: aoBaoDen, rieng: tren(aoBaoDen, true), xoay: [0, Math.PI - 0.6, 0] },
  'vanAn-baoVat': { cho: 'bay', rieng: toon(anHacDe), xoay: [0.35, 1.15, 0] },
};

/** Mô hình đứng riêng của món, đặt theo góc chụp ảnh (`xoay`). */
export function monModel(id: MonId): THREE.Group {
  const ve = MON_VE[id];
  const root = new THREE.Group();
  const g = ve.rieng();
  if (ve.xoay) g.rotation.set(...ve.xoay);
  root.add(g);
  return root;
}
