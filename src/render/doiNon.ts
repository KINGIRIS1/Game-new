// Dời non (Sơn Tinh): núi đá trồi quanh Sơn Tinh, giặc trong vùng bị đá giữ chân. Ba kiểu vẽ để chủ dự án chọn
// (`KieuNon`):
//   1. Vòng núi thần: vòng núi phát sáng xanh lục trong suốt (như bóng núi Bốc đồi) mọc quanh Sơn Tinh, đất nứt rực
//      vàng tỏa ra; giặc bị giữ chân có chóp núi sáng nhỏ quanh chân.
//   2. Sóng đá: ba vòng phiến đá trồi lên nối nhau loang ra như sóng từ chân Sơn Tinh, vòng ngoài đứng lại một lúc;
//      giặc bị giữ chân có phiến đá nhọn quanh chân.
//   3. Vuốt đá trói giặc: không dựng vòng núi; vòng hoa văn vàng dưới chân Sơn Tinh, đường nứt vàng chạy tới từng tên
//      giặc, vuốt đá cong mọc lên khép lại giữ chân chúng.
// BattleView gọi `dungNon` lúc có sự kiện, `tick` mỗi khung tới khi trả false; `daGiu` cho đá trên người giặc.

import * as THREE from 'three';
import { dinh } from './bocDoi';
import type { HieuUng } from './hieuUng';
import { C } from './palette';
import { ShapeBuilder, disposeModel, seeded } from './shapes';
import { inkThin, outlineOf, toon } from './toon';

export type KieuNon = 1 | 2 | 3;
let kieu: KieuNon = 1;
/** Đổi kiểu (chụp thử so ba kiểu). */
export function datKieuNon(k: KieuNon): void {
  kieu = k;
}

export interface NonDung {
  group: THREE.Group;
  /** Mỗi khung; trả false khi đã xong (BattleView gỡ và gọi `drop`). */
  tick: (dt: number) => boolean;
  drop: () => void;
}

interface Chua {
  hu: HieuUng;
  /** Điểm (dx, dz) quanh chân Sơn Tinh, nhấc `dy` khỏi đất, ra tọa độ trong nhóm. */
  at: (dx: number, dz: number, dy?: number) => THREE.Vector3;
  /** Độ cao mặt đất ở (dx, dz) quanh chân Sơn Tinh. */
  cao: (dx: number, dz: number) => number;
  /** Bán kính vùng đánh (đã nhân độ giãn) và cỡ lính. */
  R: number;
  sc: number;
  seed: number;
  /** Giặc bị giữ chân: chỗ (so với chân Sơn Tinh). */
  dich: { dx: number; dz: number }[];
}

export function dungNon(c: Chua): NonDung {
  return kieu === 2 ? songDa(c) : kieu === 3 ? vuotDa(c) : vongThan(c);
}

/** Sóng vàng, lóe ở chân Sơn Tinh lúc dậm đất (chung ba kiểu). */
function dam(c: Chua): void {
  c.hu.loe(c.at(0, 0, 0.8 * c.sc), { mau: C.fxVang, size: 2.8 * c.sc, life: 0.4 });
  c.hu.soc(c.at(0, 0), { mau: C.fxVang, r: c.R * 1.1, life: 0.6 });
}

// ---------- Mô hình đá ----------

/** Một mỏm đá: phiến chính nhiều mặt sườn sẫm chóp sáng, rêu một vòng, hai phiến phụ chĩa xiên, đá vụn ở chân. */
export function cragSpike(h: number, r: number, rand: () => number): THREE.Group {
  const b = new ShapeBuilder(false, true);
  const seg = 5;
  b.cyl(r * 0.42, r, h * 0.6, C.rockDark, 0, h * 0.3, 0, undefined, seg);
  b.cyl(r * 0.1, r * 0.42, h * 0.4, C.rock, 0, h * 0.8, 0, undefined, seg);
  b.cone(r * 0.1, h * 0.08, 0xd8d0c0, 0, h * 1.04, 0, undefined, seg);
  b.cyl(r * 0.5, r * 0.78, h * 0.12, C.mountainCloak, 0, h * 0.42, 0, undefined, seg);
  for (const side of [-1, 1]) {
    const hh = h * (0.4 + rand() * 0.2);
    const tilt = 0.35 + rand() * 0.2;
    b.cyl(r * 0.08, r * 0.5, hh, rand() < 0.5 ? C.rock : C.rockDark, side * r * 0.75, hh * 0.45, (rand() - 0.5) * r * 0.6, [0, 0, -side * tilt], seg);
  }
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const rr = r * (0.22 + rand() * 0.18);
    b.sphere(rr, i % 2 ? C.rock : C.rockDark, Math.cos(a) * r * 1.15, rr * 0.5, Math.sin(a) * r * 1.15, [1, 0.7, 1], 5);
  }
  const g = new THREE.Group();
  const mesh = b.mesh(toon);
  g.add(mesh, outlineOf(mesh.geometry, inkThin));
  return g;
}

/** Trồi vụt lên, vượt đà một chút rồi đứng lại (0..1 → hệ số độ cao). */
const troi = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2);
const smooth = THREE.MathUtils.smoothstep;

/** Chất liệu cộng sáng tô theo màu đỉnh (chân trong suốt) cho núi thần. */
function sangMat(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
}

// ---------- Kiểu 1: vòng núi thần ----------

function vongThan(c: Chua): NonDung {
  const rand = seeded(c.seed * 131 + 17);
  const group = new THREE.Group();
  const matX = sangMat(C.fxXanh);
  const matV = sangMat(C.fxVang);
  const line = new THREE.LineBasicMaterial({ color: 0xe8ffe0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const peaks: { obj: THREE.Group; delay: number; y: number }[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.25;
    const h = (1.3 + rand() * 0.6) * c.sc;
    const r = (0.45 + rand() * 0.15) * c.sc;
    const px = Math.cos(a) * c.R;
    const pz = Math.sin(a) * c.R;
    const obj = new THREE.Group();
    const geo = dinh(r, h, 0, 0, 0.06);
    const core = dinh(r * 0.4, h * 0.75, 0, 0, 0);
    const m1 = new THREE.Mesh(geo, matX);
    const m2 = new THREE.Mesh(core, matV);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), line);
    m1.renderOrder = m2.renderOrder = 6;
    e.renderOrder = 7;
    obj.add(m1, m2, e);
    const y = c.cao(px, pz);
    obj.position.set(px, y, pz);
    group.add(obj);
    peaks.push({ obj, delay: 0.04 + (i / n) * 0.15, y });
  }
  dam(c);
  c.hu.vong(c.at(0, 0), { mau: C.fxXanh, r: c.R * 1.05, delay: 0.05, life: 1.6 });
  // Đất nứt rực vàng từ chân Sơn Tinh ra tới vòng núi.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
    c.hu.vet(c.at((Math.cos(a) * c.R) / 2, (-Math.sin(a) * c.R) / 2), { mau: C.fxVang, dai: c.R, yaw: a, delay: 0.05, life: 1.4 });
  }
  for (const p of peaks) c.hu.tia(c.at(p.obj.position.x, p.obj.position.z, 0.4), { mau: C.fxXanh, n: 5, toc: 6, len: 0.35, up: 1.3, delay: p.delay, life: 0.5 });
  let age = 0;
  const LIFE = 1.7;
  return {
    group,
    tick: (dt) => {
      age += dt;
      for (const p of peaks) {
        const k = (age - p.delay) / 0.2;
        p.obj.scale.set(1, Math.max(0.01, troi(k)), 1);
      }
      const f = 1 - smooth(age, 1.1, LIFE);
      const pulse = 0.9 + 0.1 * Math.sin(age * 25);
      matX.opacity = 0.5 * f * pulse;
      matV.opacity = 0.6 * f * pulse;
      line.opacity = 0.6 * f;
      return age < LIFE;
    },
    drop: () => {
      disposeModel(group);
      [matX, matV, line].forEach((m) => m.dispose());
    },
  };
}

// ---------- Kiểu 2: sóng đá ----------

function songDa(c: Chua): NonDung {
  const rand = seeded(c.seed * 131 + 17);
  const group = new THREE.Group();
  const rings = [
    { r: 0.38, n: 7, h: 0.6, size: 0.26, delay: 0, hold: 0.25 },
    { r: 0.7, n: 10, h: 0.85, size: 0.32, delay: 0.12, hold: 0.3 },
    { r: 1, n: 13, h: 1.25, size: 0.4, delay: 0.24, hold: 1.0 },
  ];
  const spikes: { obj: THREE.Group; h: number; y: number; up: number; down: number }[] = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * Math.PI * 2 + rand() * 0.3 + ring.r;
      const px = Math.cos(a) * ring.r * c.R;
      const pz = Math.sin(a) * ring.r * c.R;
      const h = ring.h * (0.85 + rand() * 0.35) * c.sc;
      const obj = cragSpike(h, ring.size * c.sc * (0.85 + rand() * 0.3), rand);
      const y = c.cao(px, pz);
      obj.position.set(px, y - h, pz);
      obj.rotation.set(Math.sin(a) * 0.2, rand() * Math.PI, -Math.cos(a) * 0.2);
      group.add(obj);
      const up = ring.delay + (i / ring.n) * 0.06;
      spikes.push({ obj, h, y, up, down: up + 0.18 + ring.hold });
    }
    // Mỗi vòng một đợt bụi và sóng đất.
    c.hu.soc(c.at(0, 0), { mau: C.fxBui, r: ring.r * c.R * 1.15, delay: ring.delay, life: 0.4, loi: false });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + ring.r * 2;
      c.hu.bui(c.at(Math.cos(a) * ring.r * c.R, Math.sin(a) * ring.r * c.R, 0.25), { mau: C.fxBui, size: (0.8 + ring.r * 0.6) * c.sc, delay: ring.delay + 0.03, life: 0.8, bay: new THREE.Vector3(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8) });
    }
  }
  dam(c);
  c.hu.tia(c.at(0, 0, 0.4), { mau: C.fxVang, n: 20, toc: 9, len: 0.4, up: 1.2, delay: 0.24, life: 0.6 });
  let age = 0;
  const LIFE = 1.9;
  return {
    group,
    tick: (dt) => {
      age += dt;
      for (const s of spikes) {
        const k = troi((age - s.up) / 0.16);
        const sink = smooth(age, s.down, s.down + 0.35);
        s.obj.position.y = s.y - s.h + s.h * k - s.h * 1.1 * sink;
      }
      return age < LIFE;
    },
    drop: () => disposeModel(group),
  };
}

// ---------- Kiểu 3: vuốt đá trói giặc ----------

function vuotDa(c: Chua): NonDung {
  dam(c);
  c.hu.vong(c.at(0, 0), { mau: C.fxVang, r: c.R * 0.55, life: 1.6 });
  c.hu.cot(c.at(0, 0), { mau: C.fxVang, r: 0.5 * c.sc, h: 3 * c.sc, life: 0.7, sang: 0.6 });
  // Đường nứt vàng chạy từ chân Sơn Tinh tới từng tên giặc (xa thì tới muộn hơn).
  for (const d of c.dich) {
    const len = Math.hypot(d.dx, d.dz);
    if (len < 0.3) continue;
    const yaw = Math.atan2(-d.dz, d.dx);
    c.hu.vet(c.at(d.dx / 2, d.dz / 2), { mau: C.fxVang, dai: len, yaw, delay: 0.05, life: 1.2 });
    const t = VUOT_TRE * Math.min(1, len / c.R);
    c.hu.tia(c.at(d.dx, d.dz, 0.3), { mau: C.fxVang, n: 6, toc: 6, len: 0.3, up: 1.4, delay: t, life: 0.45 });
    c.hu.bui(c.at(d.dx, d.dz, 0.25), { mau: C.fxBui, size: 1 * c.sc, delay: t, life: 0.7 });
    c.hu.soc(c.at(d.dx, d.dz), { mau: C.fxVang, r: 0.9 * c.sc, delay: t, life: 0.5 });
    c.hu.loe(c.at(d.dx, d.dz, 0.4 * c.sc), { mau: C.fxVang, size: 1.4 * c.sc, delay: t, life: 0.3 });
  }
  const group = new THREE.Group();
  let age = 0;
  return { group, tick: (dt) => (age += dt) < 0.1, drop: () => undefined };
}
/** Vuốt đá trên người giặc xa nhất mọc lên sau chừng này giây (đường nứt chạy tới). */
const VUOT_TRE = 0.22;

// ---------- Đá giữ chân trên người giặc ----------

/**
 * Đá giữ chân một tên giặc đang bị Dời non choáng, gắn vào mô hình người ấy. `tick(age, stun)` mỗi khung: mọc lên
 * lúc đầu, lún dần khi sắp hết choáng.
 */
export function daGiu(seed: number): { group: THREE.Group; tick: (age: number, stun: number) => void; drop: () => void } {
  const rand = seeded(seed);
  if (kieu === 1) {
    const group = new THREE.Group();
    const mat = sangMat(C.fxXanh);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + rand();
      const h = 0.6 + rand() * 0.3;
      const m = new THREE.Mesh(dinh(0.16, h, 0, 0, 0.1), mat);
      m.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
      m.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
      m.renderOrder = 6;
      group.add(m);
    }
    return {
      group,
      tick: (age, stun) => {
        group.scale.set(1, Math.max(0.01, Math.min(age / 0.2, 1) * Math.min(1, stun / 0.3)), 1);
        mat.opacity = 0.55 + 0.15 * Math.sin(age * 8);
      },
      drop: () => {
        disposeModel(group);
        mat.dispose();
      },
    };
  }
  if (kieu === 3) {
    // Năm vuốt đá cong mọc lên quanh chân rồi khép ngọn vào trong.
    const group = new THREE.Group();
    const claws: THREE.Group[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rand() * 0.3;
      const pivot = new THREE.Group();
      pivot.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
      pivot.rotation.y = -a;
      const b = new ShapeBuilder(false, true);
      const h = 1.05 + rand() * 0.3;
      b.cyl(0.15, 0.24, h * 0.55, i % 2 ? C.rock : C.rockDark, 0, h * 0.27, 0, undefined, 5);
      b.cyl(0.03, 0.15, h * 0.5, C.rock, -0.08, h * 0.72, 0, [0, 0, 0.35], 5);
      // Mạch vàng ở chân vuốt.
      b.cyl(0.2, 0.25, 0.08, C.fxVang, 0, h * 0.12, 0, undefined, 5);
      const mesh = b.mesh(toon);
      const claw = new THREE.Group();
      claw.add(mesh, outlineOf(mesh.geometry, inkThin));
      pivot.add(claw);
      group.add(pivot);
      claws.push(claw);
    }
    return {
      group,
      tick: (age, stun) => {
        const t = age - VUOT_TRE * 0.5;
        const up = troi(t / 0.18) * Math.min(1, stun / 0.3);
        const close = smooth(t, 0.12, 0.4);
        for (const cl of claws) {
          cl.scale.set(1, Math.max(0.01, up), 1);
          // Ngửa ra ngoài lúc trồi, rồi khép ngọn vào ôm lấy chân.
          cl.rotation.z = 0.5 - 0.85 * close;
        }
      },
      drop: () => disposeModel(group),
    };
  }
  const b = new ShapeBuilder(false, true);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rand();
    const h = 0.55 + rand() * 0.35;
    b.cyl(0.03, 0.17, h, i % 2 ? C.rock : C.rockDark, Math.cos(a) * 0.32, h / 2, Math.sin(a) * 0.32, [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25], 5);
  }
  const group = new THREE.Group();
  const mesh = b.mesh(toon);
  group.add(mesh, outlineOf(mesh.geometry, inkThin));
  return {
    group,
    tick: (age, stun) => group.scale.set(1, Math.max(0.01, Math.min(age / 0.2, 1) * Math.min(1, stun / 0.3)), 1),
    drop: () => disposeModel(group),
  };
}
