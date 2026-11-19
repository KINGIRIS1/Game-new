// Dời non (Sơn Tinh): vòng phiến đá linh màu hổ phách trồi quanh Sơn Tinh. Mỗi chỗ một cụm phiến nhọn sắc ít mặt như
// tinh thể (phiến chính cao, hai phiến phụ thấp), chĩa xiên ra ngoài, cộng sáng nên chân mờ, ngọn rực; viền sáng mảnh
// theo cạnh phiến. Đất nứt hổ phách tỏa ra, đá vụn bắn lên lúc phiến trồi. Giặc bị giữ chân có phiến nhỏ quanh chân.
// Khác bóng núi xanh tròn của Bốc đồi (`bocDoi.ts`). BattleView gọi `dungNon` lúc có sự kiện, `tick` mỗi khung tới
// khi trả false; `daGiu` cho đá trên người giặc.

import * as THREE from 'three';
import type { HieuUng } from './hieuUng';
import { C } from './palette';
import { disposeModel, seeded } from './shapes';

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
}

/** Trồi vụt lên, vượt đà một chút rồi đứng lại (0..1 → hệ số độ cao). */
const troi = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2);
const smooth = THREE.MathUtils.smoothstep;
const LIFE = 1.7;

/**
 * Một phiến đá linh: chóp bốn mặt hơi dẹt (như tinh thể), màu đỉnh theo độ cao để chân mờ ngọn rực khi cộng sáng.
 * Gốc ở chân.
 */
function phien(r: number, h: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(r, h, 4, 3, true).translate(0, h / 2, 0).scale(1, 1, 0.65);
  const pos = g.getAttribute('position');
  const col: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const v = 0.1 + 0.9 * (pos.getY(i) / h) ** 1.2;
    col.push(v, v, v);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g.toNonIndexed();
}

function sangMat(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
}
const vienMat = () => new THREE.LineBasicMaterial({ color: 0xfff0c8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

/** Cụm phiến (chính và hai phụ) thêm vào `g`, chĩa xiên theo hướng `a` ra ngoài. */
function cum(g: THREE.Group, h: number, r: number, a: number, rand: () => number, mat: THREE.Material, core: THREE.Material, line: THREE.Material): void {
  const shard = (hh: number, rr: number, x: number, z: number, tilt: number, spin: number) => {
    const geo = phien(rr, hh);
    const o = new THREE.Group();
    const m = new THREE.Mesh(geo, mat);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), line);
    m.renderOrder = 6;
    e.renderOrder = 7;
    o.add(m, e);
    o.position.set(x, 0, z);
    o.rotation.set(0, spin, 0);
    // Nghiêng ra ngoài vòng.
    const wrap = new THREE.Group();
    wrap.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    wrap.add(o);
    g.add(wrap);
  };
  shard(h, r, 0, 0, 0.18, rand() * Math.PI);
  const lo = new THREE.Mesh(phien(r * 0.35, h * 0.7), core);
  lo.renderOrder = 6;
  g.add(lo);
  for (const side of [-1, 1]) {
    const b = a + (side * Math.PI) / 2;
    shard(h * (0.45 + rand() * 0.2), r * 0.6, Math.cos(b) * r * 0.8, Math.sin(b) * r * 0.8, 0.45 + rand() * 0.2, rand() * Math.PI);
  }
}

export function dungNon(c: Chua): NonDung {
  const rand = seeded(c.seed * 131 + 17);
  const group = new THREE.Group();
  const mat = sangMat(C.fxHo);
  const core = sangMat(C.fxVang);
  const line = vienMat();
  const shards: { obj: THREE.Group; delay: number }[] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.25;
    const px = Math.cos(a) * c.R;
    const pz = Math.sin(a) * c.R;
    const obj = new THREE.Group();
    cum(obj, (1.3 + rand() * 0.6) * c.sc, (0.34 + rand() * 0.1) * c.sc, a, rand, mat, core, line);
    obj.position.set(px, c.cao(px, pz), pz);
    group.add(obj);
    shards.push({ obj, delay: 0.04 + (i / n) * 0.15 });
  }
  // Sơn Tinh dậm đất: lóe, sóng hổ phách, hoa văn hổ phách; đất nứt hổ phách tỏa ra tới vòng đá.
  c.hu.loe(c.at(0, 0, 0.8 * c.sc), { mau: C.fxVang, size: 2.8 * c.sc, life: 0.4 });
  c.hu.soc(c.at(0, 0), { mau: C.fxHo, r: c.R * 1.1, life: 0.6 });
  c.hu.vong(c.at(0, 0), { mau: C.fxHo, r: c.R * 1.05, delay: 0.05, life: 1.6 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
    c.hu.vet(c.at((Math.cos(a) * c.R) / 2, (-Math.sin(a) * c.R) / 2), { mau: C.fxHo, dai: c.R, yaw: a, delay: 0.05, life: 1.4 });
  }
  // Đá vụn và tia sáng bắn lên ở chân từng cụm phiến lúc trồi.
  for (const s of shards) {
    const { x, z } = s.obj.position;
    c.hu.tia(c.at(x, z, 0.3), { mau: C.fxVang, n: 5, toc: 6, len: 0.35, up: 1.4, delay: s.delay, life: 0.5 });
    c.hu.bui(c.at(x, z, 0.25), { mau: C.fxBui, size: 0.9 * c.sc, delay: s.delay, life: 0.7 });
  }
  let age = 0;
  return {
    group,
    tick: (dt) => {
      age += dt;
      for (const s of shards) s.obj.scale.set(1, Math.max(0.01, troi((age - s.delay) / 0.18)), 1);
      // Bừng sáng lúc trồi, dịu xuống, chập chờn, rồi tan.
      const f = (1 - smooth(age, 1.1, LIFE)) * (1 + 0.6 * (1 - smooth(age, 0.1, 0.4)));
      const pulse = 0.9 + 0.1 * Math.sin(age * 25);
      mat.opacity = Math.min(1, 0.55 * f * pulse);
      core.opacity = Math.min(1, 0.7 * f * pulse);
      line.opacity = Math.min(1, 0.75 * f);
      return age < LIFE;
    },
    drop: () => {
      disposeModel(group);
      [mat, core, line].forEach((m) => m.dispose());
    },
  };
}

/**
 * Phiến đá linh giữ chân một tên giặc đang bị Dời non choáng, gắn vào mô hình người ấy. `tick(age, stun)` mỗi khung:
 * mọc lên lúc đầu, lún dần khi sắp hết choáng.
 */
export function daGiu(seed: number): { group: THREE.Group; tick: (age: number, stun: number) => void; drop: () => void } {
  const rand = seeded(seed);
  const group = new THREE.Group();
  const mat = sangMat(C.fxHo);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rand();
    const h = 0.6 + rand() * 0.3;
    const m = new THREE.Mesh(phien(0.15, h), mat);
    m.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
    m.rotation.set(Math.sin(a) * 0.3, rand() * Math.PI, -Math.cos(a) * 0.3);
    m.renderOrder = 6;
    group.add(m);
  }
  return {
    group,
    tick: (age, stun) => {
      group.scale.set(1, Math.max(0.01, Math.min(age / 0.2, 1) * Math.min(1, stun / 0.3)), 1);
      mat.opacity = 0.6 + 0.15 * Math.sin(age * 8);
    },
    drop: () => {
      disposeModel(group);
      mat.dispose();
    },
  };
}
