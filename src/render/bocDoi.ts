// Bốc đồi (Sơn Tinh): quả đồi rơi xuống vùng đánh. Ba kiểu vẽ để chủ dự án chọn (`KieuDoi`):
//   1. Tảng đá bay: tảng đá núi lởm chởm xoay tít rơi như thiên thạch, kéo vệt bụi lửa, đập xuống nứt đất rực vàng.
//   2. Bóng núi thần: hình núi phát sáng xanh vàng trong suốt, đập xuống lóe sáng, hoa văn trống đồng nở rồi tan.
//   3. Núi Tản Viên ba đỉnh: núi ba đỉnh có mây quấn lưng, rơi thẳng đứng, chạm đất thì mây bung ra, bụi tung.
// Mô hình dựng ở cỡ vùng đánh gốc (`HILL.radius`); BattleView phóng theo vùng đánh của luật, cho rơi rồi lún hay tan.

import * as THREE from 'three';
import { HILL } from '../game/defs';
import type { HieuUng } from './hieuUng';
import { C } from './palette';
import { seeded } from './shapes';
import { ToonModel, inkThin } from './toon';

export type KieuDoi = 1 | 2 | 3;

/** Kiểu đang dùng; đổi bằng `datKieuDoi` (chụp thử so ba kiểu). */
let kieu: KieuDoi = 1;
export function datKieuDoi(k: KieuDoi): void {
  kieu = k;
}

/** Một quả đồi đang rơi. */
export interface DoiRoi {
  group: THREE.Group;
  /** Gốc mô hình ở dưới mặt đất chừng này (theo cỡ gốc) khi đã đập xuống. */
  bury: number;
  /** Tan đi tại chỗ thay vì lún xuống đất (bóng núi thần). */
  tan: boolean;
  /** Mỗi khung: `age` giây từ lúc ném, `roi` là đang rơi. */
  tick: (age: number, dt: number, roi: boolean) => void;
  /** Trả chất liệu riêng khi gỡ (hình thì BattleView trả bằng `disposeModel`). */
  drop?: () => void;
  /** Hiệu ứng lúc ném (vòng ngắm) và lúc chạm đất, đặt lịch theo `fall` giây rơi. */
  noRa: (fall: number) => void;
}

interface Chua {
  hu: HieuUng;
  /** Điểm (dx, dz) quanh chỗ rơi, nhấc lên `dy` khỏi đất, ra tọa độ trong nhóm. */
  at: (dx: number, dz: number, dy?: number) => THREE.Vector3;
  /** Bán kính vùng đánh (đã nhân độ giãn), và cỡ lính. */
  R: number;
  sc: number;
  seed: number;
}

export function taoDoi(c: Chua): DoiRoi {
  return kieu === 2 ? bongNui(c) : kieu === 3 ? tanVien(c) : tangDa(c);
}

/** Vòng ngắm đỏ co lại chỗ đồi sắp rơi (chung ba kiểu). */
function ngam(c: Chua, fall: number): void {
  c.hu.soc(c.at(0, 0), { mau: C.red, r: c.R * 1.1, thu: true, life: fall, loi: false });
}

// ---------- Kiểu 1: tảng đá bay ----------

function tangDa(c: Chua): DoiRoi {
  const R = HILL.radius;
  const rand = seeded(c.seed * 37 + 5);
  const m = new ToonModel(inkThin);
  m.plain.sphere(R * 0.62, C.rockDark, 0, 0, 0, [1, 0.85, 1], 7);
  m.plain.sphere(R * 0.5, C.rock, R * 0.18, R * 0.12, -R * 0.1, [1, 0.8, 1], 6);
  // Mỏm đá nhọn chĩa ra mọi phía.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
    const up = (rand() - 0.35) * 1.4;
    const dir = new THREE.Vector3(Math.cos(a), up, Math.sin(a)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    const h = R * (0.45 + rand() * 0.35);
    const p = dir.clone().multiplyScalar(R * 0.5 + h * 0.4);
    m.plain.cone(R * (0.18 + rand() * 0.1), h, i % 3 ? C.rock : C.rockDark, p.x, p.y, p.z, [e.x, e.y, e.z], 5);
  }
  // Mảng cỏ và hai cây nhỏ trên đỉnh: đồi bứt khỏi núi.
  m.plain.sphere(R * 0.42, 0x7fa048, 0, R * 0.45, 0, [1, 0.35, 1], 8);
  for (const [x, z, k] of [
    [0.1, 0.05, 1],
    [-0.2, -0.15, 0.75],
  ]) {
    m.plain.cyl(0.06 * k, 0.09 * k, 0.4 * k, 0x6b4a2a, x * R, R * 0.55 + 0.2 * k, z * R, undefined, 5);
    m.plain.sphere(0.3 * k, C.leaf[k === 1 ? 0 : 3], x * R, R * 0.55 + 0.5 * k, z * R, [1, 0.9, 1], 7);
  }
  const group = new THREE.Group();
  const inner = m.group();
  group.add(inner);
  let trail = 0;
  return {
    group,
    bury: R * 0.18,
    tan: false,
    tick: (_age, dt, roi) => {
      if (!roi) {
        inner.rotation.set(0, inner.rotation.y, 0);
        return;
      }
      inner.rotation.x += dt * 5;
      inner.rotation.z += dt * 3;
      // Vệt bụi lửa kéo theo đường rơi.
      trail += dt;
      for (; trail >= 0.05; trail -= 0.05) {
        // Vệt bám phía trên tảng đá (đá rơi xuống, vệt ở lại sau).
        const p = group.position.clone();
        p.y += R * 0.9 * group.scale.y;
        c.hu.bui(p, { mau: 0x8a7a68, size: 1.3 * c.sc, life: 0.5 });
        c.hu.loe(p, { mau: C.fxLua, size: 1.1 * c.sc, life: 0.2 });
      }
    },
    noRa: (fall) => {
      ngam(c, fall);
      const { hu, at, R: r, sc } = c;
      hu.soc(at(0, 0), { mau: C.fxLua, r: r * 1.5, delay: fall, life: 0.6 });
      hu.loe(at(0, 0, 0.6 * sc), { mau: C.fxVang, size: 3.6 * sc, delay: fall, life: 0.35 });
      hu.tia(at(0, 0, 0.5), { mau: C.fxVang, n: 26, toc: 10, len: 0.5, up: 1.1, delay: fall, life: 0.65 });
      // Đất nứt rực vàng tỏa ra từ hố.
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.3;
        hu.vet(at(Math.cos(a) * r * 0.75, -Math.sin(a) * r * 0.75), { mau: C.fxLua, dai: r * 1.1, yaw: a, delay: fall, life: 1.6 });
      }
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        hu.bui(at(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, 0.3), { mau: C.fxBui, size: 1.4 * sc, delay: fall, life: 1, bay: new THREE.Vector3(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6) });
      }
    },
  };
}

// ---------- Kiểu 2: bóng núi thần ----------

function bongNui(c: Chua): DoiRoi {
  const R = HILL.radius;
  const lop = (color: number, opacity: number) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  const parts: [THREE.BufferGeometry, THREE.MeshBasicMaterial, number][] = [
    [new THREE.ConeGeometry(R * 0.95, R * 1.9, 7, 1, true).translate(0, R * 0.95, 0), lop(C.fxXanh, 0.35), 0.35],
    [new THREE.ConeGeometry(R * 0.6, R * 1.3, 7, 1, true).translate(R * 0.55, R * 0.65, 0.2), lop(C.fxXanh, 0.3), 0.3],
    [new THREE.ConeGeometry(R * 0.55, R * 1.2, 7, 1, true).translate(-R * 0.5, R * 0.6, -0.2), lop(C.fxXanh, 0.3), 0.3],
    [new THREE.ConeGeometry(R * 0.45, R * 1.35, 7, 1, true).translate(0, R * 0.68, 0), lop(C.fxVang, 0.55), 0.55],
  ];
  const group = new THREE.Group();
  const mats: [THREE.Material, number][] = [];
  for (const [geo, mat, op] of parts) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 6;
    // Viền sáng theo cạnh núi.
    group.add(mesh);
    mats.push([mat, op]);
    const line = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), line);
    edges.renderOrder = 7;
    group.add(edges);
    mats.push([line, Math.min(1, op * 1.6)]);
  }
  let hit = -1;
  let trail = 0;
  return {
    group,
    bury: 0,
    tan: true,
    drop: () => mats.forEach(([m]) => m.dispose()),
    tick: (age, dt, roi) => {
      if (roi) {
        trail += dt;
        for (; trail >= 0.05; trail -= 0.05) c.hu.loe(group.position.clone().setY(group.position.y + R * 0.6 * group.scale.y), { mau: C.fxXanh, size: 2.6 * c.sc, life: 0.3 });
        const pulse = 0.85 + 0.15 * Math.sin(age * 30);
        for (const [m, op] of mats) m.opacity = op * pulse;
        return;
      }
      if (hit < 0) hit = age;
      // Đập xuống: bừng sáng, nở rộng, tan dần.
      const k = Math.min(1, (age - hit) / 0.8);
      const s = 1 + 0.25 * k;
      group.children.forEach((o) => o.scale.set(s, 1 - 0.3 * k, s));
      const f = k < 0.1 ? 1 + k * 8 : (1 - k) * 1.9;
      for (const [m, op] of mats) m.opacity = Math.min(1, op * f);
    },
    noRa: (fall) => {
      ngam(c, fall);
      const { hu, at, R: r, sc } = c;
      hu.vong(at(0, 0), { mau: C.fxXanh, r: r * 1.4, delay: fall, life: 1.4 });
      hu.soc(at(0, 0), { mau: C.fxTrang, r: r * 1.6, delay: fall, life: 0.55 });
      hu.soc(at(0, 0), { mau: C.fxXanh, r: r * 1.1, delay: fall + 0.08, life: 0.5, loi: false });
      hu.loe(at(0, 0, 0.8 * sc), { mau: C.fxTrang, size: 4 * sc, delay: fall, life: 0.35 });
      hu.cot(at(0, 0), { mau: C.fxXanh, r: r * 0.5, h: 4 * sc, delay: fall, life: 0.7, sang: 0.6 });
      hu.tia(at(0, 0, 0.5), { mau: C.fxXanh, n: 24, toc: 9, len: 0.5, up: 1, delay: fall, life: 0.6 });
      hu.hat(at(0, 0), { mau: C.fxVang, n: 18, r: r, h: 2.2 * sc, delay: fall + 0.1, life: 1.2 });
    },
  };
}

// ---------- Kiểu 3: núi Tản Viên ba đỉnh ----------

function tanVien(c: Chua): DoiRoi {
  const R = HILL.radius;
  const m = new ToonModel(inkThin);
  const peak = (x: number, z: number, r: number, h: number) => {
    m.plain.cone(r, h, 0x4f7a3a, x, h / 2, z, undefined, 8);
    m.plain.cone(r * 0.55, h * 0.48, 0x6f9a4a, x, h * 0.74, z, undefined, 8);
    m.plain.cone(r * 0.24, h * 0.2, C.rock, x, h * 0.9, z, undefined, 6);
  };
  peak(0, 0, R * 0.78, R * 1.75);
  peak(R * 0.62, R * 0.15, R * 0.5, R * 1.1);
  peak(-R * 0.58, -R * 0.12, R * 0.46, R * 1.0);
  // Mây quấn lưng núi.
  const rand = seeded(c.seed * 13 + 1);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    // Dải mây mỏng ôm sát sườn núi (sườn ở độ cao y thì bán kính còn chừng R·0,78·(1 − y/1,75R)).
    const y = R * (0.62 + rand() * 0.14);
    const r = R * 0.78 * (1 - y / (R * 1.75)) + R * 0.08;
    m.plain.sphere(R * (0.1 + rand() * 0.05), 0xf6f3ea, Math.cos(a) * r, y, Math.sin(a) * r, [1.6, 0.6, 1.1], 7);
  }
  const group = m.group();
  let trail = 0;
  return {
    group,
    bury: R * 0.12,
    tan: false,
    tick: (_age, dt, roi) => {
      if (!roi) return;
      trail += dt;
      for (; trail >= 0.05; trail -= 0.05) c.hu.bui(group.position.clone().setY(group.position.y + R * 0.6 * group.scale.y), { mau: 0xf6f3ea, size: 1.6 * c.sc, life: 0.5 });
    },
    noRa: (fall) => {
      ngam(c, fall);
      const { hu, at, R: r, sc } = c;
      hu.soc(at(0, 0), { mau: C.fxVang, r: r * 1.6, delay: fall, life: 0.6 });
      hu.loe(at(0, 0, 0.5 * sc), { mau: C.fxVang, size: 3 * sc, delay: fall, life: 0.3 });
      hu.tia(at(0, 0, 0.4), { mau: C.fxVang, n: 20, toc: 9, len: 0.45, up: 0.8, delay: fall, life: 0.6 });
      // Mây bung ra, bụi đất tung theo.
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        hu.bui(at(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, 0.8 * sc), { mau: 0xf6f3ea, size: 1.6 * sc, delay: fall, life: 1.2, bay: new THREE.Vector3(Math.cos(a) * 2, 0.3, Math.sin(a) * 2) });
        if (i % 2) hu.bui(at(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, 0.3), { mau: C.fxBui, size: 1.2 * sc, delay: fall, life: 0.9, bay: new THREE.Vector3(Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2) });
      }
    },
  };
}
