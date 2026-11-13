// Linh vật hộ thân của tướng, chỉ để nhìn: rồng cuốn quanh người tướng nam, ba chim Lạc bay vòng quanh tướng nữ.
// Không gắn vào xương: là một nhóm con của mô hình tướng, xoay và nhấp nhô theo `Act.time` (bọc `userData.pose`).
// Mỗi linh vật gộp một lưới mỗi chất liệu cho nhẹ máy; chim vỗ cánh bằng ba dáng cánh đổi nhau theo nhịp.

import * as THREE from 'three';
import { C } from './palette';
import type { Act, Poser } from './rig';
import type { ShapeBuilder } from './shapes';
import { ToonModel, inkThin } from './toon';

type V3 = [number, number, number];

export interface RongLook {
  /** Lưng, bụng, vây lửa (tự sáng), sừng và móng. */
  body: number;
  belly: number;
  fin: number;
  horn: number;
}

export interface RongOpts {
  /** Cỡ thân người rồng cuốn quanh (như cỡ tướng). */
  k: number;
  /** Chân tướng ở đâu trong mô hình (tướng cưỡi thú thì là chỗ ngồi). */
  at?: V3;
  /** Đuôi rồng bắt đầu ở độ cao này (đơn vị thân người cỡ 1; tướng cưỡi thú thì từ thắt lưng) và số vòng cuốn. */
  from?: number;
  turns?: number;
}

/** Bọc `userData.pose` của `group`: sau tư thế của tướng thì cho linh vật `part` cử động theo đồng hồ. */
function attach(group: THREE.Group, part: THREE.Object3D, animate: (t: number) => void): THREE.Group {
  group.add(part);
  const pose = group.userData.pose as Poser | undefined;
  group.userData.pose = (a: Act) => {
    pose?.(a);
    // Tướng ngã (kiệt sức) thì linh vật tan.
    part.visible = a.act !== 'dead';
    animate(a.time ?? 0);
  };
  animate(0);
  return group;
}

/** Vẽ trong khung `m` rồi trả khung cũ. */
function inFrame(parts: ShapeBuilder[], m: THREE.Matrix4, draw: () => void): void {
  const keep = parts.map((p) => p.frame);
  for (const p of parts) p.frame = m;
  draw();
  parts.forEach((p, i) => (p.frame = keep[i]));
}

// ---------- Rồng cuốn ----------

/** Một điểm trên sống lưng rồng: tâm thân, hướng đi `t`, hướng lưng `n` (quay ra ngoài), hướng sườn `b`, bán kính thân. */
interface Khuc {
  c: THREE.Vector3;
  t: THREE.Vector3;
  n: THREE.Vector3;
  b: THREE.Vector3;
  r: number;
}

/**
 * Đường thân rồng: xoắn quanh trục đứng từ đuôi (dưới) lên ngang ngực, rồi cổ vươn ra sau vai trái, ngóc lên ngang
 * đầu tướng, đầu rồng nhìn ra trước. Các vòng cuốn nằm dưới cằm, không che mặt tướng.
 */
function duongRong(from: number, turns: number, steps: number): Khuc[] {
  const END = Math.PI - 0.2;
  const at = (u: number): THREE.Vector3 => {
    const th = END + turns * Math.PI * 2 * (1 - u);
    const neck = THREE.MathUtils.smoothstep(u, 0.76, 1);
    const y = from + (0.44 - from) * Math.min(1, u / 0.78) + 0.58 * neck;
    const rad = 0.27 + 0.05 * Math.sin(Math.PI * Math.min(1, u / 0.78)) + 0.19 * neck;
    return new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad);
  };
  const out: Khuc[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const c = at(u);
    const t = at(Math.min(1, u + 0.004)).sub(at(Math.max(0, u - 0.004))).normalize();
    // Lưng quay ra ngoài (xa người tướng), bụng ôm vào trong; lên tới cổ thì lưng xoay dần lên trời cho đầu rồng ngay ngắn.
    const neck = THREE.MathUtils.smoothstep(u, 0.76, 0.97);
    const n = new THREE.Vector3(c.x, 0, c.z).normalize().multiplyScalar(1 - neck).add(new THREE.Vector3(0, neck, 0));
    n.addScaledVector(t, -n.dot(t)).normalize();
    const b = new THREE.Vector3().crossVectors(t, n).normalize();
    // Đuôi nhọn, thân to dần, cổ thon lại trước khi tới đầu.
    const r = 0.01 + 0.034 * THREE.MathUtils.smoothstep(u, 0, 0.3) - 0.008 * THREE.MathUtils.smoothstep(u, 0.8, 1);
    out.push({ c, t, n, b, r });
  }
  return out;
}

/** Một dải thân quét dọc đường `path`, quanh thân từ góc `a0` tới `a1` (0 là sống lưng). */
function quetThan(path: Khuc[], a0: number, a1: number, seg: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (const k of path) {
    for (let j = 0; j <= seg; j++) {
      const a = a0 + ((a1 - a0) * j) / seg;
      const p = k.c.clone().addScaledVector(k.n, Math.cos(a) * k.r).addScaledVector(k.b, Math.sin(a) * k.r);
      pos.push(p.x, p.y, p.z);
    }
  }
  const w = seg + 1;
  for (let i = 0; i < path.length - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const p = i * w + j;
      idx.push(p, p + 1, p + w, p + 1, p + w + 1, p + w);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Khung riêng ở khúc `k`: +z theo hướng đi, +y theo lưng, gốc ở tâm thân. */
function khungKhuc(k: Khuc): THREE.Matrix4 {
  return new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(k.n, k.t), k.n, k.t).setPosition(k.c);
}

/** Góc xoay đưa trục +y về hướng `dir`. */
function huong(dir: V3): V3 {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return [e.x, e.y, e.z];
}

/** Gai nhọn (sừng, râu, nanh) mọc từ `from` theo hướng `dir`. */
function gai(p: ShapeBuilder, r: number, len: number, color: number, from: V3, dir: V3): void {
  const d = new THREE.Vector3(...dir).normalize().multiplyScalar(len / 2);
  p.cone(r, len, color, from[0] + d.x, from[1] + d.y, from[2] + d.z, huong(dir), 5);
}

/** Lưỡi lửa dẹt (vây lưng, bờm): gốc ở tâm, ngọn theo +y. */
function vay(r: number, len: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(r, len, 4);
  g.translate(0, len / 2, 0);
  g.scale(0.45, 1, 1);
  return g;
}

/** Đầu rồng to hơn thân cho dễ nhận ở cỡ trong game. */
const HEAD = 1.7;

/** Rồng cuốn (cỡ 1, quanh trục đứng qua gốc): thân, bụng, vây lưng lửa, bốn chân, đầu có sừng, bờm, râu. */
function rongCuon(look: RongLook, from: number, turns: number): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  const path = duongRong(from, turns, 72);
  p.add(quetThan(path, -2.0, 2.0, 6), look.body, 0, 0, 0);
  p.add(quetThan(path, 2.0, Math.PI * 2 - 2.0, 3), look.belly, 0, 0, 0);
  // Vây lửa dọc sống lưng, ngả về đuôi.
  for (let i = 6; i < path.length - 8; i += 4) {
    const k = path[i];
    inFrame([m.glow], khungKhuc(k), () => m.glow.add(vay(0.032, 0.035 + k.r), look.fin, 0, k.r * 0.8, 0, [-0.95, 0, 0]));
  }
  // Chóp đuôi lửa.
  inFrame([m.glow], khungKhuc(path[0]), () => {
    for (const rz of [-0.6, 0, 0.6]) m.glow.add(vay(0.03, 0.1), look.fin, 0, 0, 0, [-Math.PI / 2, 0, rz]);
  });
  // Bốn chân ngắn, ba móng.
  for (const u of [0.34, 0.72]) {
    const k = path[Math.round(u * (path.length - 1))];
    inFrame([p], khungKhuc(k), () => {
      for (const s of [-1, 1]) {
        p.cyl(0.014, 0.02, 0.075, look.body, s * (k.r + 0.02), -0.01, 0, [0, 0, s * 1.15], 5);
        for (const dz of [-0.02, 0, 0.02]) p.cone(0.008, 0.035, look.horn, s * (k.r + 0.065), -0.03, dz + 0.01, [0.9, 0, s * 2.3], 4);
      }
    });
  }
  // Đầu rồng: sọ, mõm dài hé, mắt lửa, hai sừng, bờm lửa, râu dài.
  const end = path[path.length - 1];
  inFrame([p, m.glow], khungKhuc(end).multiply(new THREE.Matrix4().makeScale(HEAD, HEAD, HEAD)), () => {
    // Sọ, mõm dài thuôn, chóp mũi (khung đầu: +z ra trước, +y lên trời).
    p.sphere(0.055, look.body, 0, 0.015, 0, [1, 0.9, 1.1], 9);
    p.add(new THREE.CylinderGeometry(0.027, 0.042, 0.14, 7), look.body, 0, 0.01, 0.105, [Math.PI / 2, 0, 0], [1, 1, 0.72]);
    p.sphere(0.02, look.body, 0, 0.024, 0.175, [1.25, 0.8, 1], 6);
    // Hàm dưới hé, lửa trong miệng.
    p.box(0.05, 0.014, 0.13, look.belly, 0, -0.034, 0.085, [0.22, 0, 0]);
    m.glow.box(0.03, 0.012, 0.08, C.fire, 0, -0.016, 0.1, [0.1, 0, 0]);
    for (const s of [-1, 1]) {
      // Gờ mày, mắt lửa, nanh.
      p.sphere(0.016, look.horn, s * 0.034, 0.052, 0.04, [1.3, 0.6, 1.7], 6);
      m.glow.sphere(0.013, C.ember, s * 0.047, 0.03, 0.045, [0.6, 1, 1.2], 6);
      gai(p, 0.007, 0.03, C.cream, [s * 0.02, -0.002, 0.155], [0, -1, 0]);
      // Sừng hai nhánh vuốt ra sau.
      gai(p, 0.012, 0.11, look.horn, [s * 0.03, 0.05, -0.02], [s * 0.3, 0.75, -0.6]);
      gai(p, 0.008, 0.045, look.horn, [s * 0.045, 0.09, -0.055], [s * 0.4, 0.9, 0.2]);
      // Râu rồng vuốt ra hai bên rồi về sau.
      gai(p, 0.006, 0.12, look.horn, [s * 0.03, 0.002, 0.16], [s * 0.8, 0.2, -0.55]);
      // Vây má.
      m.glow.add(vay(0.02, 0.07), look.fin, s * 0.045, 0, -0.02, huong([s * 0.5, 0.2, -0.85]));
    }
    // Bờm lửa sau gáy, râu cằm.
    m.glow.add(vay(0.022, 0.08), look.fin, 0, 0.05, -0.04, huong([0, 0.45, -0.9]));
    m.glow.add(vay(0.022, 0.09), look.fin, 0, 0.02, -0.06, huong([0, 0.15, -1]));
    m.glow.add(vay(0.014, 0.05), look.fin, 0, -0.045, 0.05, huong([0, -0.8, -0.6]));
  });
  return m.group();
}

/**
 * Rồng cuốn quanh người tướng nam: thân xoắn từ chân lên ngực, cổ vươn sau vai trái, đầu ngóc ngang đầu tướng nhìn
 * ra trước; cả con lắc lư quanh người và nhấp nhô. Gọi sau khi `group` đã có `userData.pose`.
 */
export function addRong(group: THREE.Group, look: RongLook, o: RongOpts): THREE.Group {
  const rong = rongCuon(look, o.from ?? 0.1, o.turns ?? 1.75);
  const at = o.at ?? [0, 0, 0];
  rong.scale.setScalar(o.k);
  return attach(group, rong, (t) => {
    // Lắc lư quanh người, nhấp nhô như đang trườn; đầu rồng luôn ở sau vai trái nên không che mặt tướng.
    rong.rotation.y = 0.3 * Math.sin(t * 0.8);
    rong.position.set(at[0], at[1] + 0.025 * o.k * Math.sin(t * 1.9), at[2]);
  });
}

// ---------- Chim Lạc bay quanh ----------

/** Ba dáng cánh: giơ lên, ngang, vỗ xuống (góc cánh so với mặt ngang). */
const CANH = [0.8, 0.15, -0.5];
/** Thứ tự dáng cánh trong một nhịp vỗ, và số dáng mỗi giây. */
const NHIP = [0, 1, 2, 1];
const NHIP_GIAY = 9;
/** Ba con chim: góc trên vòng bay, bán kính, độ cao (đơn vị thân người cỡ 1). */
const DAN: V3[] = [
  [0, 0.62, 0.42],
  [(Math.PI * 2) / 3, 0.56, 1.15],
  [(Math.PI * 4) / 3, 0.64, 1.45],
];
/** Chim to hơn bản vẽ gốc bao nhiêu. */
const CHIM = 1.2;

/** Khung của con chim thứ `i`: mỏ hướng theo chiều bay, nghiêng cánh vào trong vòng. */
function khungChim(i: number): THREE.Matrix4 {
  const [a, rad, y] = DAN[i];
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, Math.atan2(Math.sin(a), -Math.cos(a)), 0.3, 'YXZ'));
  return new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad), q, new THREE.Vector3(CHIM, CHIM, CHIM));
}

/** Một cánh chim Lạc: bản dẹt thuôn nhọn ra đầu cánh, gốc ở vai chim, sải theo +x (`side` 1) hay -x (-1). */
function canh(side: number): THREE.BufferGeometry {
  const pts: [number, number][] = [
    [0, 0.05],
    [0.12, 0.085],
    [0.24, 0.06],
    [0.31, -0.01],
    [0.24, -0.02],
    [0.2, -0.055],
    [0.14, -0.04],
    [0.1, -0.075],
    [0.05, -0.055],
    [0, -0.065],
  ];
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(side * x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: false });
  g.translate(0, 0, -0.005);
  // Bản vẽ trong mặt (x, y): quay nằm xuống mặt (x, z), mép trước về phía mỏ.
  g.rotateX(Math.PI / 2);
  return g;
}

/**
 * Ba chim Lạc bay vòng quanh tướng nữ ở ba tầng cao: thân trắng ngà, mỏ dài và chân đỏ, mào và dải cánh màu `accent`.
 * Cả đàn xoay quanh người, nhấp nhô; cánh vỗ bằng ba dáng đổi nhau. Gọi sau khi `group` đã có `userData.pose`.
 */
export function addChimLac(group: THREE.Group, accent: number, o: { k: number; at?: V3 }): THREE.Group {
  const dan = new THREE.Group();
  const than = new ToonModel(inkThin);
  const dang = CANH.map(() => new ToonModel(inkThin));
  for (let i = 0; i < DAN.length; i++) {
    const f = khungChim(i);
    const p = than.plain;
    inFrame([p], f, () => {
      p.sphere(0.045, C.cream, 0, 0, 0, [0.85, 0.8, 1.9], 8);
      p.cyl(0.014, 0.022, 0.13, C.cream, 0, 0.026, 0.115, [1.2, 0, 0], 6);
      p.sphere(0.029, C.cream, 0, 0.052, 0.185, [1, 1, 1.15], 7);
      p.sphere(0.007, C.ink, 0.022, 0.058, 0.2, [1, 1, 1], 5);
      p.sphere(0.007, C.ink, -0.022, 0.058, 0.2, [1, 1, 1], 5);
      p.cone(0.012, 0.15, C.red, 0, 0.046, 0.28, [Math.PI / 2, 0, 0], 5);
      // Mào dài vuốt ra sau gáy.
      p.cone(0.011, 0.13, accent, 0, 0.09, 0.13, [-1.15, 0, 0], 4);
      p.cone(0.008, 0.09, accent, 0, 0.07, 0.125, [-1.45, 0, 0], 4);
      // Đuôi dài ba lông xòe, hai chân duỗi ra sau.
      for (const ry of [-0.28, 0, 0.28]) p.box(0.026, 0.008, 0.17, ry ? C.cream : accent, Math.sin(ry) * -0.08, 0, -0.15, [0.05, ry, 0]);
      for (const s of [-1, 1]) p.box(0.006, 0.006, 0.1, C.red, s * 0.012, -0.028, -0.1, [0.1, 0, 0]);
    });
    CANH.forEach((goc, d) => {
      const q = dang[d].plain;
      for (const s of [-1, 1]) {
        const vai = new THREE.Matrix4().compose(new THREE.Vector3(s * 0.028, 0.012, 0.01), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, s * goc)), new THREE.Vector3(1, 1, 1));
        inFrame([q], f.clone().multiply(vai), () => {
          q.add(canh(s), C.cream, 0, 0, 0);
          // Dải màu ngang cánh.
          q.box(0.016, 0.014, 0.1, accent, s * 0.19, 0, 0.012, [0, s * 0.25, 0]);
        });
      }
    });
  }
  dan.add(than.group());
  const canhs = dang.map((d) => d.group());
  dan.add(...canhs);
  const at = o.at ?? [0, 0, 0];
  dan.scale.setScalar(o.k);
  return attach(group, dan, (t) => {
    dan.rotation.y = t * 0.9;
    dan.position.set(at[0], at[1] + 0.03 * o.k * Math.sin(t * 2.3), at[2]);
    const d = NHIP[Math.floor(t * NHIP_GIAY) % NHIP.length];
    canhs.forEach((g, i) => (g.visible = i === d));
  });
}
