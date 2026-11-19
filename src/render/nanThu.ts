// Thú nặn liền khối (nan.ts) thay cầu, trụ, hộp ghép: ngựa, voi. Mỗi khối gắn với một xương của khung xương thú
// (qBody, qFL, qFR, qBL, qBR, qNeck, qHead, qTail, ...), hòa vào nhau ở khớp (vai, háng, cổ) nên khi bước, gật đầu,
// vẫy đuôi thân uốn liền. Màu (móng, mắt, mõm, bờm) tô bằng lớp màu cắt sắc. Đồ thắng trên lưng (yên, bành, giáp)
// vẫn vẽ riêng ở beasts.ts. Mỗi dáng nặn một lần cho mỗi bộ thông số, mỗi độ chi tiết (`figure`).

import * as THREE from 'three';
import type { HumanRig } from './body';
import { Clay, cone, decal, ellipsoid, hit, radiusAt, slab, sphere, type Paint, type Sdf, type V3 } from './nan';
import { rigid } from './nanNguoi';
import { clayPiece, figure, type Piece } from './nanNguoi';
import { C } from './palette';
import type { RigBuilder } from './rig';

type Rig = RigBuilder<string>;

const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Khối `f` nén theo trục x quanh mặt phẳng x = 0 (cổ ngựa dẹt hai bên). */
function narrow(f: Sdf, k: number): Sdf {
  return (x, y, z) => f(x / k, y, z) * k;
}

/** Mắt tròn có đốm sáng, tô lên mặt `f` ở chỗ nhìn từ hướng `from` vào điểm `at`. */
function eyePaints(clay: Clay, bone: string, f: Sdf, at: V3, from: V3, r: number, white = true): Paint[] {
  const p = hit(f, add3(at, [from[0] * 0.5, from[1] * 0.5, from[2] * 0.5]), [-from[0], -from[1], -from[2]]) ?? at;
  const out = [clay.layer(bone, sphere(p, r), C.ink, 2)];
  if (white) out.push(clay.layer(bone, sphere(add3(p, [0, r * 0.35, r * 0.3]), r * 0.35), C.cream, 2));
  return out;
}

// ---------- Ngựa ----------

/** Chỗ các xương của một con ngựa (tọa độ mô hình lúc đứng): thân, chân, cổ, đầu, đuôi; `girth` to ngang. */
export interface HorseShape {
  y: number;
  legX: number;
  legZ: number;
  neck: V3;
  head: V3;
  tail: V3;
  girth: number;
  /** Chân to hơn bao nhiêu lần so với chân theo `girth` (mặc định 1; ngựa sắt chân to). */
  leg?: number;
}

export const HORSE_SHAPE: HorseShape = { y: 0.78, legX: 0.14, legZ: 0.32, neck: [0, 0.86, 0.34], head: [0, 1.24, 0.66], tail: [0, 0.9, -0.42], girth: 1 };

export interface HorseLook {
  coat: number;
  mane: number;
  /** Móng (mặc định mực), mõm (mặc định sẫm hơn lông một chút), ống chân dưới (mặc định như lông). */
  hoof?: number;
  muzzle?: number;
  sock?: number;
  /** Bỏ bờm, đuôi (ngựa sắt có bờm lửa riêng). */
  bare?: boolean;
}

function horsePieces(s: HorseShape, o: HorseLook, detail: number): Piece[] {
  const g = s.girth;
  const y = s.y;
  const clay = new Clay(o.coat);
  // Thân: ngực nở, bụng thon, mông tròn; u vai.
  clay.add('qBody', ellipsoid([0, y, -0.01], [0.225 * g, 0.235 * g, 0.4 * g]), { k: 0 });
  clay.add('qBody', ellipsoid([0, y + 0.02, 0.26], [0.205 * g, 0.235 * g, 0.21 * g]), { k: 0.08 });
  clay.add('qBody', ellipsoid([0, y + 0.04, -0.28], [0.215 * g, 0.235 * g, 0.22 * g]), { k: 0.08 });
  clay.add('qBody', ellipsoid([0, y + 0.17, 0.2], [0.07 * g, 0.07, 0.14]), { k: 0.06 });
  const legs: [string, number, number, boolean][] = [
    ['qFL', -s.legX, s.legZ, true],
    ['qFR', s.legX, s.legZ, true],
    ['qBL', -s.legX, -s.legZ, false],
    ['qBR', s.legX, -s.legZ, false],
  ];
  for (const [b, x, z, front] of legs) {
    const k = g * (s.leg ?? 1);
    if (front) {
      clay.add(b, cone([x, y - 0.02, z + 0.03], [x, 0.36, z + 0.015], 0.085 * k, 0.05 * k), { k: 0.05 });
      clay.add(b, ellipsoid([x, 0.345, z + 0.02], [0.048 * k, 0.045, 0.05 * k]), { k: 0.02 });
      clay.add(b, cone([x, 0.34, z + 0.015], [x, 0.09, z + 0.01], 0.042 * k, 0.036 * k), { k: 0.02 });
    } else {
      clay.add(b, ellipsoid([x * 1.04, y - 0.05, z - 0.03], [0.085 * k, 0.17, 0.13 * k]), { k: 0.06 });
      clay.add(b, cone([x, y - 0.14, z - 0.05], [x, 0.32, z - 0.085], 0.07 * k, 0.044 * k), { k: 0.03 });
      clay.add(b, ellipsoid([x, 0.31, z - 0.09], [0.042 * k, 0.05, 0.055 * k]), { k: 0.02 });
      clay.add(b, cone([x, 0.31, z - 0.085], [x, 0.09, z - 0.05], 0.04 * k, 0.036 * k), { k: 0.02 });
    }
    const fz = front ? z + 0.01 : z - 0.045;
    clay.add(b, ellipsoid([x, 0.085, fz], [0.044 * k, 0.04, 0.048 * k]), { k: 0.015 });
    clay.add(b, cone([x, 0.072, fz + 0.008], [x, 0.004, fz + 0.02], 0.046 * k, 0.057 * k), { k: 0.01 });
  }
  // Cổ dẹt hai bên, vươn cao ra trước; gờ bờm trên gáy.
  const n = s.neck;
  const h = s.head;
  clay.add('qNeck', narrow(cone(add3(n, [0, 0.04, -0.02]), add3(h, [0, -0.03, -0.05]), 0.16 * g, 0.09 * g), 0.72), { k: 0.08 });
  clay.add('qNeck', cone(add3(n, [0, 0.14, -0.09]), add3(h, [0, 0.06, -0.07]), 0.05 * g, 0.036 * g), { k: 0.05 });
  // Đầu: sọ, má, sống mũi thuôn chúc xuống, mõm, tai vểnh.
  clay.add('qHead', ellipsoid(add3(h, [0, 0.03, 0.02]), [0.082 * g, 0.092 * g, 0.105 * g]), { k: 0.04 });
  clay.add('qHead', ellipsoid(add3(h, [0, -0.035, 0.035]), [0.078 * g, 0.075 * g, 0.095 * g]), { k: 0.04 });
  clay.add('qHead', cone(add3(h, [0, 0.0, 0.08]), add3(h, [0, -0.1, 0.26]), 0.07 * g, 0.054 * g), { k: 0.04 });
  clay.add('qHead', ellipsoid(add3(h, [0, -0.11, 0.27]), [0.058 * g, 0.054 * g, 0.06 * g]), { k: 0.03 });
  for (const sd of [-1, 1]) {
    clay.add('qHead', cone(add3(h, [sd * 0.045, 0.1, -0.005]), add3(h, [sd * 0.065, 0.21, -0.03]), 0.03 * g, 0.004), { k: 0.012 });
    clay.sub('qHead', ellipsoid(add3(h, [sd * 0.032, -0.1, 0.325]), [0.012, 0.016, 0.014]), 0.006);
  }
  const f = clay.dist;
  const paints: Paint[] = [];
  // Mõm sẫm, móng, ống chân dưới (ngựa đi tất).
  const muzzle = o.muzzle ?? new THREE.Color(o.coat).multiplyScalar(0.72).getHex();
  paints.push(clay.layer('qHead', (_px, py, pz) => -(pz - (h[2] + 0.22) - 0.25 * (py - (h[1] - 0.1))), muzzle));
  if (o.sock !== undefined) for (const [b] of legs) paints.push(clay.layer(b, (_px, py) => py - 0.2, o.sock));
  for (const [b] of legs) paints.push(clay.layer(b, (_px, py) => py - 0.07, o.hoof ?? C.ink));
  for (const sd of [-1, 1]) paints.push(...eyePaints(clay, 'qHead', f, add3(h, [sd * 0.06, 0.03, 0.06]), [sd, 0.1, 0.4], 0.02));
  const lo: V3 = [-s.legX - 0.16 * g, -0.01, s.tail[2] - 0.12];
  const hi: V3 = [s.legX + 0.16 * g, h[1] + 0.26, h[2] + 0.36];
  const cell = 0.012 / detail;
  const out: Piece[] = [clayPiece(clay.build({ kind: 'nets', min: lo, max: hi, cell, target: Math.round(2400 * detail) }, paints))];
  if (o.bare) return out;
  // Bờm: các chòm lông dẹt rủ dọc gáy, lệch sang phải; chòm trán; đuôi lông dài buông rồi xòe.
  const mane = new Clay(o.mane);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const c = add3(n, [0.02, 0.16 + (h[1] - n[1] - 0.08) * t, -0.1 + (h[2] - n[2] - 0.0) * t * 0.95]);
    mane.add('qNeck', ellipsoid(c, [0.03, 0.05, 0.045], [0.6, 0, -0.35]), { k: 0.02 });
  }
  mane.add('qHead', cone(add3(h, [0, 0.11, 0.0]), add3(h, [0.01, 0.04, 0.1]), 0.032, 0.008), { k: 0.01 });
  const t = s.tail;
  const tail: V3[] = [add3(t, [0, 0, -0.02]), add3(t, [0, -0.06, -0.12]), add3(t, [0, -0.26, -0.18]), add3(t, [0, -0.48, -0.15])];
  const tr = [0.04, 0.055, 0.06, 0.018];
  for (let i = 0; i < 3; i++) mane.add('qTail', cone(tail[i], tail[i + 1], tr[i], tr[i + 1]), { k: 0.02 });
  const mlo: V3 = [-0.12, Math.min(t[1] - 0.6, n[1]), t[2] - 0.3];
  const mhi: V3 = [0.14, h[1] + 0.2, h[2] + 0.2];
  out.push(clayPiece(mane.build({ kind: 'nets', min: mlo, max: mhi, cell: 0.012 / detail, target: Math.round(700 * detail) })));
  return out;
}

/** Ngựa nặn: thân, chân, cổ, đầu, mắt, móng, bờm, đuôi gắn theo các xương của `shape`. */
export function horseBody(r: Rig, o: HorseLook, shape: HorseShape = HORSE_SHAPE): void {
  figure(r as unknown as HumanRig, `horse:${JSON.stringify([o, shape])}`, (d) => horsePieces(shape, o, d));
}

// ---------- Voi ----------

export interface ElephantLook {
  skin: number;
  /** Móng chân (mặc định kem), lòng tai (mặc định hồng nhạt pha da). */
  nail?: number;
  ear?: number;
}

/** Voi nặn theo khung `ELEPHANT` (beasts.ts): thân tròn lưng gù, chân cột, đầu trán dô, tai quạt, vòi ba khúc. */
function elephantPieces(o: ElephantLook, detail: number): Piece[] {
  const clay = new Clay(o.skin);
  clay.add('qBody', ellipsoid([0, 0.73, -0.02], [0.35, 0.33, 0.5]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.86, 0.12], [0.3, 0.24, 0.3]), { k: 0.1 });
  clay.add('qBody', ellipsoid([0, 0.62, 0.0], [0.3, 0.22, 0.4]), { k: 0.1 });
  const legs: [string, number, number][] = [
    ['qFL', -0.2, 0.28],
    ['qFR', 0.2, 0.28],
    ['qBL', -0.2, -0.28],
    ['qBR', 0.2, -0.28],
  ];
  for (const [b, x, z] of legs) {
    clay.add(b, cone([x, 0.6, z], [x, 0.07, z + 0.01], 0.13, 0.115), { k: 0.06 });
    clay.add(b, ellipsoid([x, 0.05, z + 0.015], [0.128, 0.055, 0.13]), { k: 0.03 });
  }
  // Đầu: trán dô hai bướu, má, miệng dưới gốc vòi.
  clay.add('qHead', ellipsoid([0, 0.93, 0.47], [0.25, 0.26, 0.24]), { k: 0.06 });
  for (const s of [-1, 1]) clay.add('qHead', ellipsoid([s * 0.08, 1.06, 0.53], [0.12, 0.13, 0.13]), { k: 0.06 });
  clay.add('qHead', cone([0, 0.9, 0.62], [0, 0.8, 0.7], 0.12, 0.095), { k: 0.06 });
  clay.add('qHead', ellipsoid([0, 0.76, 0.58], [0.08, 0.05, 0.06]), { k: 0.04 });
  clay.sub('qHead', ellipsoid([0, 0.73, 0.63], [0.06, 0.018, 0.04]), 0.01);
  // Vòi ba khúc thuôn dần, đầu vòi loe; nếp nhăn ngang.
  clay.add('qTrunk', cone([0, 0.8, 0.7], [0, 0.5, 0.75], 0.095, 0.07), { k: 0.03 });
  clay.add('qTrunk2', cone([0, 0.5, 0.75], [0, 0.27, 0.8], 0.07, 0.05), { k: 0.03 });
  clay.add('qTrunk2', ellipsoid([0, 0.25, 0.815], [0.055, 0.04, 0.055]), { k: 0.02 });
  for (const yy of [0.72, 0.64, 0.56, 0.47, 0.4, 0.33]) clay.sub(yy > 0.5 ? 'qTrunk' : 'qTrunk2', ellipsoid([0, yy, 0.73 + (0.8 - yy) * 0.12], [0.12, 0.005, 0.12]), 0.006);
  // Tai quạt: tấm dày tròn, gắn xương tai.
  for (const [b, s] of [
    ['qEarL', -1],
    ['qEarR', 1],
  ] as const) {
    clay.add(b, ellipsoid([s * 0.27, 0.93, 0.4], [0.045, 0.21, 0.19], [0, s * 0.25, s * 0.1]), { k: 0.03, apart: b });
  }
  // Đuôi mảnh, chùm lông đen ở chót.
  clay.add('qTail', cone([0, 0.82, -0.49], [0, 0.55, -0.55], 0.03, 0.018), { k: 0.03 });
  clay.add('qTail', ellipsoid([0, 0.52, -0.56], [0.03, 0.05, 0.03]), { k: 0.01 });
  const f = clay.dist;
  const paints: Paint[] = [];
  const nail = o.nail ?? C.cream;
  for (const [b, x, z] of legs) for (const dx of [-0.06, 0, 0.06]) paints.push(clay.layer(b, ellipsoid([x + dx, 0.035, z + 0.13], [0.03, 0.035, 0.03]), nail));
  const inner = o.ear ?? new THREE.Color(o.skin).lerp(new THREE.Color(0xd99a8a), 0.35).getHex();
  for (const [b, s] of [
    ['qEarL', -1],
    ['qEarR', 1],
  ] as const) {
    paints.push(clay.layer(b, ellipsoid([s * 0.27 + s * 0.035, 0.93, 0.42], [0.03, 0.17, 0.15], [0, s * 0.25, s * 0.1]), inner));
  }
  paints.push(clay.layer('qTail', ellipsoid([0, 0.52, -0.56], [0.04, 0.06, 0.04]), C.ink));
  for (const sd of [-1, 1]) paints.push(...eyePaints(clay, 'qHead', f, [sd * 0.17, 1.0, 0.62], [sd * 0.6, 0.1, 0.8], 0.026));
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.46, -0.01, -0.62], max: [0.46, 1.25, 0.92], cell: 0.016 / detail, target: Math.round(2600 * detail) }, paints))];
}

/** Voi nặn (thân, chân, đầu, tai, vòi, đuôi) theo khung voi chiến. */
export function elephantBody(r: Rig, o: ElephantLook): void {
  figure(r as unknown as HumanRig, `elephant:${JSON.stringify(o)}`, (d) => elephantPieces(o, d));
}

// ---------- Tấm phủ lưng ----------

/** Thân ngựa (không chân, cổ) để phủ đệm yên lên. */
function horseTorso(s: HorseShape): Sdf {
  const clay = new Clay(0);
  const g = s.girth;
  clay.add('qBody', ellipsoid([0, s.y, -0.01], [0.225 * g, 0.235 * g, 0.4 * g]), { k: 0 });
  clay.add('qBody', ellipsoid([0, s.y + 0.02, 0.26], [0.205 * g, 0.235 * g, 0.21 * g]), { k: 0.08 });
  clay.add('qBody', ellipsoid([0, s.y + 0.04, -0.28], [0.215 * g, 0.235 * g, 0.22 * g]), { k: 0.08 });
  clay.add('qBody', ellipsoid([0, s.y + 0.17, 0.2], [0.07 * g, 0.07, 0.14]), { k: 0.06 });
  return clay.dist;
}

function elephantTorso(): Sdf {
  const clay = new Clay(0);
  clay.add('qBody', ellipsoid([0, 0.73, -0.02], [0.35, 0.33, 0.5]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.86, 0.12], [0.3, 0.24, 0.3]), { k: 0.1 });
  clay.add('qBody', ellipsoid([0, 0.62, 0.0], [0.3, 0.22, 0.4]), { k: 0.1 });
  return clay.dist;
}

export interface DrapeOpts {
  color: number;
  /** Từ đuôi (`z0`) tới vai (`z1`); phủ xuống hai bên sườn tới góc `half` (radian, tính từ sống lưng). */
  z0: number;
  z1: number;
  half: number;
  /** Có dải hoa văn (chất liệu hoa văn). */
  pattern?: boolean;
  /** Viền quanh mép dưới (màu). */
  trim?: number;
  thick?: number;
}

/** Tấm vải (đệm yên, chăn phủ) vắt qua lưng thú, ôm theo lưng, mép dưới hơi loe ra. */
function drapePieces(torso: Sdf, axisY: number, o: DrapeOpts, detail: number): Piece[] {
  const thick = o.thick ?? 0.014;
  const memo = new Map<string, number>();
  const rad = (th: number, z: number) => {
    const k = `${th.toFixed(4)}:${z.toFixed(4)}`;
    let v = memo.get(k);
    if (v === undefined) {
      v = radiusAt(torso, [0, axisY, z], [Math.sin(th), Math.cos(th), 0], 0.8);
      memo.set(k, v);
    }
    return v;
  };
  const P = (u: number, v: number): V3 => {
    const th = (u - 0.5) * 2 * o.half;
    const z = o.z0 + (o.z1 - o.z0) * v;
    const edge = Math.abs(2 * u - 1);
    const rr = rad(th, z) + 0.01 + 0.02 * edge * edge;
    return [Math.sin(th) * rr, axisY + Math.cos(th) * rr, z];
  };
  const inward = (u: number): V3 => {
    const th = (u - 0.5) * 2 * o.half;
    return [-Math.sin(th), -Math.cos(th), 0];
  };
  const cols = Math.max(8, Math.round(14 * detail));
  const rows = Math.max(4, Math.round(7 * detail));
  const out: Piece[] = [rigid(slab(P, inward, cols, rows, thick, o.color, o.pattern), 'qBody', o.pattern ? 'band' : 'plain')];
  if (o.trim !== undefined) {
    for (const side of [0, 1]) {
      const T = (u: number, v: number): V3 => {
        const uu = side ? 1 - 0.06 * u : 0.06 * u;
        const p = P(uu, v);
        const n = inward(uu);
        return [p[0] - n[0] * 0.004, p[1] - n[1] * 0.004, p[2]];
      };
      out.push(rigid(slab(T, (u) => inward(side ? 1 - 0.06 * u : 0.06 * u), 1, rows, thick + 0.006, o.trim), 'qBody'));
    }
  }
  return out;
}

/** Đệm yên, tấm phủ lưng ngựa. */
export function horseDrape(r: Rig, o: DrapeOpts, shape: HorseShape = HORSE_SHAPE): void {
  figure(r as unknown as HumanRig, `horseDrape:${JSON.stringify([o, shape])}`, (d) => drapePieces(horseTorso(shape), shape.y, o, d));
}

/** Đệm, chăn phủ lưng voi. */
export function elephantDrape(r: Rig, o: DrapeOpts): void {
  figure(r as unknown as HumanRig, `elephantDrape:${JSON.stringify(o)}`, (d) => drapePieces(elephantTorso(), 0.72, o, d));
}

// ---------- Hổ tinh ----------

/** Hổ vằn nặn theo khung `TIGER` (beasts.ts): vai u cao, thân dài, chân to, đầu tròn má bè, vằn đen tô theo mình. */
function tigerPieces(detail: number): Piece[] {
  const clay = new Clay(C.tiger);
  clay.add('qBody', ellipsoid([0, 0.67, -0.02], [0.27, 0.24, 0.5]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.75, 0.3], [0.26, 0.25, 0.24]), { k: 0.1 });
  clay.add('qBody', ellipsoid([0, 0.66, -0.32], [0.24, 0.23, 0.22]), { k: 0.1 });
  const legs: [string, number, boolean][] = [
    ['qFL', -0.17, true],
    ['qFR', 0.17, true],
    ['qBL', -0.17, false],
    ['qBR', 0.17, false],
  ];
  for (const [b, x, front] of legs) {
    if (front) {
      clay.add(b, cone([x, 0.66, 0.36], [x, 0.09, 0.43], 0.1, 0.072), { k: 0.06 });
      clay.add(b, ellipsoid([x, 0.05, 0.47], [0.082, 0.05, 0.1]), { k: 0.03 });
    } else {
      clay.add(b, ellipsoid([x * 1.04, 0.56, -0.36], [0.1, 0.18, 0.15]), { k: 0.06 });
      clay.add(b, cone([x, 0.45, -0.41], [x, 0.09, -0.33], 0.085, 0.066), { k: 0.04 });
      clay.add(b, ellipsoid([x, 0.05, -0.29], [0.08, 0.05, 0.1]), { k: 0.03 });
    }
  }
  clay.add('qHead', ellipsoid([0, 0.99, 0.6], [0.27, 0.25, 0.25]), { k: 0.06 });
  for (const s of [-1, 1]) {
    clay.add('qHead', ellipsoid([s * 0.15, 0.9, 0.66], [0.14, 0.11, 0.13]), { k: 0.06 });
    clay.add('qHead', ellipsoid([s * 0.19, 1.19, 0.54], [0.08, 0.08, 0.045]), { k: 0.03 });
  }
  clay.add('qHead', ellipsoid([0, 0.88, 0.8], [0.15, 0.1, 0.11]), { k: 0.05 });
  clay.add('qHead', ellipsoid([0, 0.94, 0.89], [0.05, 0.03, 0.03]), { k: 0.02 });
  clay.sub('qHead', ellipsoid([0, 0.82, 0.86], [0.1, 0.012, 0.06]), 0.01);
  clay.add('qTail', cone([0, 0.64, -0.48], [0, 0.66, -0.9], 0.05, 0.042), { k: 0.03 });
  clay.add('qTail2', cone([0, 0.66, -0.92], [0, 0.9, -1.05], 0.042, 0.036), { k: 0.02 });
  clay.add('qTail2', ellipsoid([0, 0.93, -1.06], [0.045, 0.06, 0.045]), { k: 0.02 });
  const f = clay.dist;
  const paints: Paint[] = [];
  const belly = C.tigerBelly;
  paints.push(clay.layer('qBody', ellipsoid([0, 0.5, 0.02], [0.2, 0.12, 0.46]), belly));
  paints.push(clay.layer('qHead', ellipsoid([0, 0.86, 0.82], [0.2, 0.1, 0.13]), belly));
  for (const s of [-1, 1]) paints.push(clay.layer('qHead', ellipsoid([s * 0.17, 0.86, 0.72], [0.1, 0.07, 0.1]), belly));
  // Vằn lưng: dải đen chạy từ sống lưng xuống sườn, hẹp dần.
  for (let i = 0; i < 7; i++) {
    const zc = -0.44 + i * 0.13;
    paints.push(
      clay.layer('qBody', (x, y, z) => {
        const w = 0.026 * THREE.MathUtils.clamp((y - 0.52) / 0.32, 0, 1);
        // Chỉ trên thân (bỏ phần chân dưới sườn).
        const leg = Math.abs(x) > 0.15 && y < 0.6 ? 1 : -1;
        return Math.max(Math.abs(z - zc) - w - 0.004 * Math.sin(x * 30), 0.55 - y, leg);
      }, C.ink),
    );
  }
  // Vằn chân, vằn trán, chóp đuôi đen, lòng tai đen.
  for (const yc of [0.2, 0.31, 0.42]) paints.push(clay.layer('qFL', (x, y, z) => Math.max(Math.abs(y - yc) - 0.014, 0.1 - Math.abs(x), (z < 0 ? 0.4 : 0.15) - Math.abs(z)), C.ink));
  for (const dx of [-0.06, 0, 0.06]) paints.push(clay.layer('qHead', (x, y, z) => Math.max(Math.abs(x - dx) - 0.012, Math.abs(y - 1.14) - 0.05, 0.7 - z), C.ink));
  for (const s of [-1, 1]) paints.push(clay.layer('qHead', (x, y, z) => Math.max(Math.abs(y - 0.98 - 0.15 * (Math.abs(x) - 0.2)) - 0.012, 0.2 - s * x, 0.55 - z), C.ink));
  paints.push(clay.layer('qTail2', ellipsoid([0, 0.94, -1.06], [0.06, 0.08, 0.06]), C.ink));
  for (const s of [-1, 1]) paints.push(clay.layer('qHead', ellipsoid([s * 0.19, 1.2, 0.58], [0.05, 0.05, 0.03]), C.ink));
  paints.push(clay.layer('qHead', ellipsoid([0, 0.945, 0.915], [0.05, 0.03, 0.03]), C.ink));
  for (const s of [-1, 1]) {
    const p = hit(f, [s * 0.1, 1.04, 1.2], [0, 0, -1]) ?? [s * 0.1, 1.04, 0.82];
    paints.push(clay.layer('qHead', ellipsoid(p, [0.045, 0.034, 0.03]), C.ember, 2));
    paints.push(clay.layer('qHead', ellipsoid(add3(p, [0, 0, 0.004]), [0.012, 0.03, 0.03]), C.ink, 2));
  }
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.38, -0.01, -1.14], max: [0.38, 1.3, 0.97], cell: 0.014 / detail, target: Math.round(2600 * detail) }, paints))];
}

export function tigerBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'tiger', tigerPieces);
}

// ---------- Báo gấm ----------

/**
 * Báo gấm: dáng hổ thon hơn, lông vàng sẫm, bụng kem, khắp mình đốm hoa (vòng mực có lõi sẫm), đuôi dài có khoang.
 * Nặn theo cùng khung `TIGER` của hổ tinh.
 */
function leopardPieces(detail: number): Piece[] {
  const clay = new Clay(C.leopard);
  clay.add('qBody', ellipsoid([0, 0.66, -0.02], [0.22, 0.2, 0.5]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.72, 0.3], [0.22, 0.21, 0.22]), { k: 0.1 });
  clay.add('qBody', ellipsoid([0, 0.64, -0.32], [0.2, 0.19, 0.2]), { k: 0.1 });
  for (const [b, x, front] of [
    ['qFL', -0.15, true],
    ['qFR', 0.15, true],
    ['qBL', -0.15, false],
    ['qBR', 0.15, false],
  ] as [string, number, boolean][]) {
    if (front) {
      clay.add(b, cone([x, 0.64, 0.36], [x, 0.09, 0.43], 0.085, 0.06), { k: 0.06 });
      clay.add(b, ellipsoid([x, 0.05, 0.47], [0.07, 0.045, 0.09]), { k: 0.03 });
    } else {
      clay.add(b, ellipsoid([x * 1.04, 0.55, -0.36], [0.085, 0.17, 0.14]), { k: 0.06 });
      clay.add(b, cone([x, 0.45, -0.41], [x, 0.09, -0.33], 0.075, 0.058), { k: 0.04 });
      clay.add(b, ellipsoid([x, 0.05, -0.29], [0.07, 0.045, 0.09]), { k: 0.03 });
    }
  }
  clay.add('qHead', ellipsoid([0, 0.96, 0.6], [0.21, 0.2, 0.21]), { k: 0.06 });
  for (const s of [-1, 1]) {
    clay.add('qHead', ellipsoid([s * 0.12, 0.88, 0.66], [0.11, 0.09, 0.11]), { k: 0.06 });
    clay.add('qHead', ellipsoid([s * 0.15, 1.13, 0.54], [0.06, 0.07, 0.04]), { k: 0.03 });
  }
  clay.add('qHead', ellipsoid([0, 0.87, 0.78], [0.12, 0.08, 0.09]), { k: 0.05 });
  clay.add('qHead', ellipsoid([0, 0.92, 0.86], [0.04, 0.025, 0.025]), { k: 0.02 });
  clay.add('qTail', cone([0, 0.62, -0.48], [0, 0.6, -0.95], 0.045, 0.035), { k: 0.03 });
  clay.add('qTail2', cone([0, 0.62, -0.95], [0, 0.85, -1.15], 0.035, 0.03), { k: 0.02 });
  const f = clay.dist;
  const paints: Paint[] = [];
  paints.push(clay.layer('qBody', ellipsoid([0, 0.5, 0.02], [0.17, 0.11, 0.46]), C.tigerBelly));
  paints.push(clay.layer('qHead', ellipsoid([0, 0.84, 0.8], [0.15, 0.08, 0.11]), C.tigerBelly));
  // Đốm hoa: vòng mực có lõi sẫm trên lưng, sườn, đùi; theo hàng nhưng lệch nhau cho khỏi thẳng như đường khâu.
  let n = 0;
  for (let i = 0; i < 8; i++) {
    for (const [ry, rx] of [
      [0.86, 0],
      [0.78, 1],
      [0.66, 1.25],
    ] as const) {
      for (const s of rx ? [-1, 1] : [0]) {
        n++;
        const jz = (((n * 37) % 11) / 11 - 0.5) * 0.09;
        const jy = (((n * 53) % 7) / 7 - 0.5) * 0.08;
        const z = -0.5 + i * 0.13 + (ry < 0.8 ? 0.06 : 0) + jz;
        const p = hit(f, [s * 0.6, ry + jy + 0.4 * (rx ? 0 : 1), z], rx ? [-s, -0.2, 0] : [0, -1, 0]);
        if (!p) continue;
        const r = 0.032 + ((n * 7) % 5) * 0.004;
        paints.push(clay.layer('qBody', sphere(p, r), C.ink, 2));
        paints.push(clay.layer('qBody', sphere(p, r * 0.55), C.goldDark, 2));
      }
    }
  }
  for (const yc of [0.25, 0.38]) for (const b of ['qFL', 'qFR']) paints.push(clay.layer(b, (x, y, z) => Math.max(Math.abs(y - yc) - 0.03, Math.abs(z - 0.42) - 0.06, 0.07 - Math.abs(x)), C.ink));
  for (const zc of [-0.7, -0.85, -1.0]) paints.push(clay.layer(zc < -0.9 ? 'qTail2' : 'qTail', (_x, _y, z) => Math.abs(z - zc) - 0.025, C.ink));
  for (const s of [-1, 1]) {
    const p = hit(f, [s * 0.09, 1.0, 1.1], [0, 0, -1]) ?? [s * 0.09, 1.0, 0.8];
    paints.push(clay.layer('qHead', ellipsoid(p, [0.035, 0.028, 0.03]), C.gold, 2));
    paints.push(clay.layer('qHead', ellipsoid(add3(p, [0, 0, 0.004]), [0.01, 0.024, 0.03]), C.ink, 2));
  }
  paints.push(clay.layer('qHead', ellipsoid([0, 0.925, 0.88], [0.04, 0.025, 0.025]), C.ink));
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.34, -0.01, -1.22], max: [0.34, 1.25, 0.95], cell: 0.014 / detail, target: Math.round(2400 * detail) }, paints))];
}

export function leopardBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'baoGam', leopardPieces);
}

// ---------- Lợn rừng ----------

/**
 * Lợn rừng: mình nặng vai u, lưng có bờm lông cứng sẫm, chân ngắn, mõm dài đĩa mũi hồng xám, tai nhỏ, đuôi ngắn.
 * Nặn theo khung `BOAR` (cùng tên xương với hổ, thấp hơn). Nanh vẽ riêng ở beasts.ts.
 */
function boarPieces(detail: number): Piece[] {
  const clay = new Clay(C.boar);
  clay.add('qBody', ellipsoid([0, 0.5, 0], [0.25, 0.25, 0.44]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.58, 0.24], [0.26, 0.28, 0.24]), { k: 0.1 });
  for (const [b, x, z] of [
    ['qFL', -0.14, 0.26],
    ['qFR', 0.14, 0.26],
    ['qBL', -0.14, -0.26],
    ['qBR', 0.14, -0.26],
  ] as [string, number, number][]) {
    clay.add(b, cone([x, 0.4, z], [x, 0.06, z + 0.02], 0.075, 0.05), { k: 0.05 });
    clay.add(b, ellipsoid([x, 0.035, z + 0.04], [0.05, 0.035, 0.06]), { k: 0.02 });
  }
  clay.add('qHead', ellipsoid([0, 0.55, 0.52], [0.17, 0.18, 0.2]), { k: 0.08 });
  clay.add('qHead', cone([0, 0.5, 0.62], [0, 0.42, 0.86], 0.13, 0.085), { k: 0.06 });
  clay.add('qHead', ellipsoid([0, 0.42, 0.88], [0.09, 0.075, 0.03]), { k: 0.02 });
  for (const s of [-1, 1]) clay.add('qHead', cone([s * 0.1, 0.68, 0.48], [s * 0.15, 0.82, 0.42], 0.05, 0.02), { k: 0.02 });
  clay.add('qTail', cone([0, 0.56, -0.42], [0, 0.42, -0.56], 0.03, 0.02), { k: 0.02 });
  clay.add('qTail2', sphere([0, 0.4, -0.57], 0.025), { k: 0.01 });
  // Bờm lông cứng dọc sống lưng.
  for (let i = 0; i < 7; i++) clay.add('qBody', ellipsoid([0, 0.8 - 0.03 * i, 0.36 - i * 0.09], [0.035, 0.045 - 0.003 * i, 0.06]), { k: 0.03 });
  const f = clay.dist;
  const paints: Paint[] = [];
  paints.push(clay.layer('qBody', (x, y, z) => Math.max(0.68 - y, Math.abs(x) - 0.12, Math.abs(z) - 0.5), C.boarDark));
  paints.push(clay.layer('qHead', ellipsoid([0, 0.42, 0.9], [0.1, 0.085, 0.04]), C.boarSnout));
  for (const s of [-1, 1]) paints.push(clay.layer('qHead', sphere([s * 0.035, 0.42, 0.915], 0.018), C.ink, 2));
  for (const b of ['qFL', 'qFR', 'qBL', 'qBR']) paints.push(clay.layer(b, (_x, y) => y - 0.09, C.boarDark));
  for (const s of [-1, 1]) {
    const p = hit(f, [s * 0.3, 0.64, 0.66], [-s, -0.1, -0.3]) ?? [s * 0.12, 0.64, 0.62];
    paints.push(clay.layer('qHead', sphere(p, 0.025), C.ember, 2), clay.layer('qHead', sphere(p, 0.013), C.ink, 2));
  }
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.34, -0.01, -0.62], max: [0.34, 0.95, 0.96], cell: 0.013 / detail, target: Math.round(2000 * detail) }, paints))];
}

export function boarBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'lonRung', boarPieces);
}

// ---------- Gấu ngựa ----------

/**
 * Gấu ngựa: lông đen, thân bầu vai u, chân cột to, đầu tròn có bờm cổ, tai tròn, mõm ngắn nâu nhạt, yếm trắng hình
 * chữ V trước ngực. Nặn theo khung `BEAR` (beasts.ts; cùng tên xương với lợn rừng). Móng vẽ riêng ở beasts.ts.
 */
function bearPieces(detail: number): Piece[] {
  const clay = new Clay(C.bear);
  clay.add('qBody', ellipsoid([0, 0.56, -0.02], [0.27, 0.27, 0.42]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.64, 0.2], [0.28, 0.29, 0.24]), { k: 0.1 });
  clay.add('qBody', ellipsoid([0, 0.55, -0.3], [0.26, 0.26, 0.2]), { k: 0.1 });
  for (const [b, x, front] of [
    ['qFL', -0.15, true],
    ['qFR', 0.15, true],
    ['qBL', -0.15, false],
    ['qBR', 0.15, false],
  ] as [string, number, boolean][]) {
    if (front) {
      clay.add(b, cone([x, 0.5, 0.26], [x, 0.08, 0.3], 0.1, 0.085), { k: 0.05 });
      clay.add(b, ellipsoid([x, 0.05, 0.34], [0.09, 0.05, 0.1]), { k: 0.03 });
    } else {
      clay.add(b, ellipsoid([x * 1.05, 0.46, -0.28], [0.11, 0.17, 0.15]), { k: 0.06 });
      clay.add(b, cone([x, 0.4, -0.3], [x, 0.08, -0.26], 0.09, 0.08), { k: 0.04 });
      clay.add(b, ellipsoid([x, 0.05, -0.22], [0.085, 0.05, 0.1]), { k: 0.03 });
    }
  }
  // Bờm cổ xù, đầu tròn, mõm ngắn, mũi, hai tai tròn.
  clay.add('qHead', ellipsoid([0, 0.7, 0.42], [0.25, 0.23, 0.13]), { k: 0.08 });
  clay.add('qHead', ellipsoid([0, 0.74, 0.54], [0.19, 0.18, 0.17]), { k: 0.06 });
  clay.add('qHead', cone([0, 0.7, 0.62], [0, 0.66, 0.78], 0.1, 0.07), { k: 0.05 });
  clay.add('qHead', ellipsoid([0, 0.665, 0.8], [0.045, 0.032, 0.025]), { k: 0.02 });
  for (const s of [-1, 1]) clay.add('qHead', ellipsoid([s * 0.15, 0.9, 0.5], [0.065, 0.065, 0.04]), { k: 0.03 });
  clay.add('qTail', sphere([0, 0.6, -0.48], 0.045), { k: 0.02 });
  const f = clay.dist;
  const paints: Paint[] = [];
  // Yếm trắng chữ V trước ngực, vắt lên cả bờm cổ cho nhìn từ trên cao vẫn thấy.
  const yem: Sdf = (x, y, z) => Math.max(Math.abs(y - (0.56 + 0.6 * Math.abs(x))) - 0.036, Math.abs(x) - 0.2, 0.3 - z);
  paints.push(clay.layer('qBody', yem, C.cream), clay.layer('qHead', yem, C.cream));
  paints.push(clay.layer('qHead', ellipsoid([0, 0.68, 0.74], [0.115, 0.09, 0.1]), C.bearMuzzle));
  paints.push(clay.layer('qHead', ellipsoid([0, 0.67, 0.81], [0.05, 0.036, 0.03]), C.ink));
  for (const s of [-1, 1]) {
    paints.push(clay.layer('qHead', ellipsoid([s * 0.16, 0.9, 0.53], [0.035, 0.04, 0.03]), C.bearMuzzle));
    const p = hit(f, [s * 0.085, 0.79, 1.1], [0, 0, -1]) ?? [s * 0.085, 0.79, 0.68];
    paints.push(clay.layer('qHead', sphere(p, 0.024), C.ink, 2), clay.layer('qHead', sphere(add3(p, [s * 0.006, 0.008, 0.004]), 0.008), C.cream, 2));
  }
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.36, -0.01, -0.56], max: [0.36, 1.0, 0.86], cell: 0.013 / detail, target: Math.round(2200 * detail) }, paints))];
}

export function bearBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'gauNgua', bearPieces);
}

// ---------- Trâu rừng ----------

/**
 * Trâu rừng: mình to vai u, lông đen xám, chân cột móng sẫm, đầu dài mõm xám nhạt, tai ngang, đôi sừng màu ngà cong
 * lớn hình lưỡi liềm vươn ra hai bên rồi ngoặt lên, đuôi dài chùm lông. Nặn theo khung `BUFFALO` (beasts.ts).
 */
function buffaloPieces(detail: number): Piece[] {
  const clay = new Clay(C.buffalo);
  clay.add('qBody', ellipsoid([0, 0.66, -0.02], [0.28, 0.27, 0.48]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.74, 0.24], [0.27, 0.27, 0.24]), { k: 0.1 });
  clay.add('qBody', ellipsoid([0, 0.64, -0.32], [0.26, 0.26, 0.22]), { k: 0.1 });
  for (const [b, x, z] of [
    ['qFL', -0.17, 0.3],
    ['qFR', 0.17, 0.3],
    ['qBL', -0.17, -0.32],
    ['qBR', 0.17, -0.32],
  ] as [string, number, number][]) {
    clay.add(b, cone([x, 0.56, z], [x, 0.08, z + 0.02], 0.09, 0.062), { k: 0.05 });
    clay.add(b, ellipsoid([x, 0.045, z + 0.03], [0.065, 0.045, 0.075]), { k: 0.02 });
  }
  // Đầu dài, mõm to, tai ngang; sừng lưỡi liềm hai bên.
  clay.add('qHead', ellipsoid([0, 0.66, 0.58], [0.15, 0.15, 0.17]), { k: 0.06 });
  clay.add('qHead', cone([0, 0.62, 0.66], [0, 0.52, 0.8], 0.12, 0.1), { k: 0.05 });
  clay.add('qHead', ellipsoid([0, 0.51, 0.82], [0.11, 0.08, 0.06]), { k: 0.03 });
  for (const s of [-1, 1]) {
    clay.add('qHead', ellipsoid([s * 0.2, 0.66, 0.54], [0.08, 0.035, 0.05]), { k: 0.02 });
    const h0: V3 = [s * 0.11, 0.74, 0.56];
    const h1: V3 = [s * 0.32, 0.78, 0.5];
    const h2: V3 = [s * 0.44, 0.9, 0.4];
    const h3: V3 = [s * 0.38, 1.02, 0.32];
    clay.add('qHead', cone(h0, h1, 0.05, 0.04), { k: 0.02 });
    clay.add('qHead', cone(h1, h2, 0.04, 0.028), { k: 0.015 });
    clay.add('qHead', cone(h2, h3, 0.028, 0.008), { k: 0.01 });
  }
  clay.add('qTail', cone([0, 0.72, -0.5], [0, 0.36, -0.58], 0.03, 0.02), { k: 0.02 });
  clay.add('qTail2', ellipsoid([0, 0.33, -0.59], [0.035, 0.06, 0.035]), { k: 0.01 });
  const f = clay.dist;
  const paints: Paint[] = [];
  // Màu sừng: chỉ phần nhô ra hai bên đầu (trước vai u, hay xa quá thân).
  paints.push(clay.layer('qHead', (x, y, z) => Math.max(0.16 - Math.abs(x), 0.71 - y, Math.min(0.44 - z, 0.31 - Math.abs(x))), C.buffaloHorn));
  paints.push(clay.layer('qHead', ellipsoid([0, 0.52, 0.82], [0.12, 0.1, 0.08]), C.buffaloMuzzle));
  for (const s of [-1, 1]) paints.push(clay.layer('qHead', sphere([s * 0.04, 0.52, 0.875], 0.016), C.ink, 2));
  for (const b of ['qFL', 'qFR', 'qBL', 'qBR']) paints.push(clay.layer(b, (_x, y) => y - 0.08, C.ink));
  paints.push(clay.layer('qTail2', ellipsoid([0, 0.33, -0.59], [0.05, 0.07, 0.05]), C.ink));
  for (const s of [-1, 1]) paints.push(...eyePaints(clay, 'qHead', f, [s * 0.13, 0.68, 0.66], [s * 0.6, 0.1, 0.8], 0.022));
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.5, -0.01, -0.68], max: [0.5, 1.08, 0.92], cell: 0.013 / detail, target: Math.round(2400 * detail) }, paints))];
}

export function buffaloBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'trauRung', buffaloPieces);
}

// ---------- Sói đỏ ----------

/**
 * Sói đỏ: mình thon chân cao, lông đỏ gạch, cổ họng và bụng kem, tai to tròn dựng, mõm ngắn sẫm, đuôi xù chóp đen.
 * Nặn theo khung `DHOLE` (beasts.ts; cùng tên xương với hổ).
 */
function dholePieces(detail: number): Piece[] {
  const clay = new Clay(C.dhole);
  clay.add('qBody', ellipsoid([0, 0.52, -0.02], [0.15, 0.15, 0.34]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.56, 0.2], [0.15, 0.16, 0.16]), { k: 0.08 });
  for (const [b, x, z] of [
    ['qFL', -0.1, 0.24],
    ['qFR', 0.1, 0.24],
    ['qBL', -0.1, -0.26],
    ['qBR', 0.1, -0.26],
  ] as [string, number, number][]) {
    clay.add(b, cone([x, 0.46, z], [x, 0.06, z + 0.02], 0.055, 0.035), { k: 0.04 });
    clay.add(b, ellipsoid([x, 0.035, z + 0.04], [0.04, 0.03, 0.055]), { k: 0.02 });
  }
  clay.add('qHead', ellipsoid([0, 0.66, 0.4], [0.12, 0.11, 0.12]), { k: 0.05 });
  clay.add('qHead', cone([0, 0.63, 0.46], [0, 0.6, 0.6], 0.07, 0.04), { k: 0.04 });
  for (const s of [-1, 1]) clay.add('qHead', ellipsoid([s * 0.07, 0.8, 0.36], [0.045, 0.07, 0.025], [0, 0, s * -0.25]), { k: 0.02 });
  clay.add('qTail', cone([0, 0.56, -0.34], [0, 0.42, -0.52], 0.045, 0.06), { k: 0.03 });
  clay.add('qTail2', cone([0, 0.42, -0.52], [0, 0.32, -0.66], 0.06, 0.03), { k: 0.03 });
  const f = clay.dist;
  const paints: Paint[] = [];
  paints.push(clay.layer('qBody', ellipsoid([0, 0.4, 0.04], [0.11, 0.08, 0.3]), C.cream));
  paints.push(clay.layer('qBody', ellipsoid([0, 0.5, 0.33], [0.1, 0.12, 0.06]), C.cream));
  paints.push(clay.layer('qHead', ellipsoid([0, 0.58, 0.5], [0.07, 0.05, 0.1]), C.cream));
  paints.push(clay.layer('qHead', ellipsoid([0, 0.61, 0.6], [0.045, 0.035, 0.03]), C.ink));
  for (const s of [-1, 1]) paints.push(clay.layer('qHead', ellipsoid([s * 0.072, 0.8, 0.38], [0.03, 0.05, 0.02], [0, 0, s * -0.25]), C.dholeDark));
  for (const b of ['qFL', 'qFR', 'qBL', 'qBR']) paints.push(clay.layer(b, (_x, y) => y - 0.14, C.dholeDark));
  paints.push(clay.layer('qTail2', (_x, _y, z) => z + 0.56, C.ink));
  for (const s of [-1, 1]) paints.push(...eyePaints(clay, 'qHead', f, [s * 0.07, 0.69, 0.48], [s * 0.6, 0.15, 0.8], 0.018));
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.24, -0.01, -0.72], max: [0.24, 0.9, 0.66], cell: 0.011 / detail, target: Math.round(1800 * detail) }, paints))];
}

export function dholeBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'soiDo', dholePieces);
}

// ---------- Nai rừng ----------

/**
 * Nai rừng: chân dài mảnh, lông nâu vàng, bụng, mông, đuôi trắng, cổ dài, tai to, gạc phân nhánh màu sừng. Nặn theo
 * khung `DEER` (beasts.ts; cùng tên xương với trâu rừng, dùng chung tư thế húc).
 */
function deerPieces(detail: number): Piece[] {
  const clay = new Clay(C.deer);
  clay.add('qBody', ellipsoid([0, 0.8, -0.02], [0.15, 0.16, 0.34]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.85, 0.2], [0.14, 0.17, 0.15]), { k: 0.08 });
  for (const [b, x, z] of [
    ['qFL', -0.09, 0.24],
    ['qFR', 0.09, 0.24],
    ['qBL', -0.09, -0.26],
    ['qBR', 0.09, -0.26],
  ] as [string, number, number][]) {
    clay.add(b, cone([x, 0.74, z], [x, 0.06, z + 0.02], 0.05, 0.026), { k: 0.04 });
    clay.add(b, ellipsoid([x, 0.03, z + 0.02], [0.03, 0.03, 0.04]), { k: 0.01 });
  }
  clay.add('qHead', cone([0, 0.9, 0.28], [0, 1.12, 0.44], 0.085, 0.065), { k: 0.05 });
  clay.add('qHead', ellipsoid([0, 1.16, 0.48], [0.08, 0.08, 0.11]), { k: 0.04 });
  clay.add('qHead', cone([0, 1.13, 0.54], [0, 1.08, 0.66], 0.06, 0.035), { k: 0.03 });
  for (const s of [-1, 1]) clay.add('qHead', ellipsoid([s * 0.1, 1.23, 0.44], [0.055, 0.025, 0.03], [0, 0, s * -0.4]), { k: 0.015 });
  // Gạc: cành chính vươn lên rồi ngả sau, một nhánh chĩa trước, đầu chẻ đôi.
  const gac: Sdf[] = [];
  for (const s of [-1, 1]) {
    gac.push(cone([s * 0.04, 1.22, 0.47], [s * 0.13, 1.42, 0.42], 0.028, 0.022));
    gac.push(cone([s * 0.13, 1.42, 0.42], [s * 0.17, 1.6, 0.34], 0.022, 0.01));
    gac.push(cone([s * 0.09, 1.33, 0.45], [s * 0.08, 1.44, 0.56], 0.018, 0.008));
    gac.push(cone([s * 0.15, 1.5, 0.39], [s * 0.24, 1.58, 0.42], 0.017, 0.007));
  }
  for (const g of gac) clay.add('qHead', g, { k: 0.008 });
  clay.add('qTail', ellipsoid([0, 0.85, -0.38], [0.04, 0.07, 0.04]), { k: 0.02 });
  clay.add('qTail2', ellipsoid([0, 0.8, -0.41], [0.03, 0.04, 0.03]), { k: 0.01 });
  const f = clay.dist;
  const paints: Paint[] = [];
  paints.push(clay.layer('qBody', ellipsoid([0, 0.66, 0.0], [0.12, 0.07, 0.3]), C.cream));
  paints.push(clay.layer('qBody', ellipsoid([0, 0.82, -0.36], [0.1, 0.1, 0.06]), C.cream));
  paints.push(clay.layer('qHead', ellipsoid([0, 1.0, 0.38], [0.07, 0.06, 0.07]), C.cream));
  paints.push(clay.layer('qTail', ellipsoid([0, 0.84, -0.4], [0.05, 0.08, 0.05]), C.cream));
  paints.push(clay.layer('qTail2', ellipsoid([0, 0.8, -0.41], [0.04, 0.05, 0.04]), C.cream));
  paints.push(clay.layer('qHead', (x, y, z) => Math.min(...gac.map((g) => g(x, y, z))) - 0.004, C.deerAntler));
  paints.push(clay.layer('qHead', sphere([0, 1.09, 0.665], 0.022), C.ink));
  for (const b of ['qFL', 'qFR', 'qBL', 'qBR']) paints.push(clay.layer(b, (_x, y) => y - 0.06, C.ink));
  for (const s of [-1, 1]) paints.push(...eyePaints(clay, 'qHead', f, [s * 0.06, 1.18, 0.54], [s * 0.6, 0.15, 0.8], 0.018));
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.3, -0.01, -0.5], max: [0.3, 1.66, 0.74], cell: 0.011 / detail, target: Math.round(2000 * detail) }, paints))];
}

export function deerBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'naiRung', deerPieces);
}

// ---------- Bò tót ----------

/**
 * Bò tót: mình to đen nâu, u vai gồ cao, bốn chân trắng như đi vớ, trán xám nhạt, sừng ngắn cong lên màu ngà đầu
 * sẫm. Nặn theo khung trâu rừng `BUFFALO` (beasts.ts), húc như trâu.
 */
function gaurPieces(detail: number): Piece[] {
  const clay = new Clay(C.gaur);
  clay.add('qBody', ellipsoid([0, 0.66, -0.02], [0.28, 0.28, 0.48]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.74, 0.24], [0.27, 0.28, 0.24]), { k: 0.1 });
  clay.add('qBody', ellipsoid([0, 0.94, 0.16], [0.17, 0.16, 0.24]), { k: 0.12 });
  clay.add('qBody', ellipsoid([0, 0.64, -0.32], [0.26, 0.26, 0.22]), { k: 0.1 });
  for (const [b, x, z] of [
    ['qFL', -0.17, 0.3],
    ['qFR', 0.17, 0.3],
    ['qBL', -0.17, -0.32],
    ['qBR', 0.17, -0.32],
  ] as [string, number, number][]) {
    clay.add(b, cone([x, 0.56, z], [x, 0.08, z + 0.02], 0.09, 0.06), { k: 0.05 });
    clay.add(b, ellipsoid([x, 0.045, z + 0.03], [0.065, 0.045, 0.075]), { k: 0.02 });
  }
  clay.add('qHead', ellipsoid([0, 0.66, 0.58], [0.15, 0.15, 0.17]), { k: 0.06 });
  clay.add('qHead', cone([0, 0.62, 0.66], [0, 0.52, 0.8], 0.12, 0.1), { k: 0.05 });
  clay.add('qHead', ellipsoid([0, 0.51, 0.82], [0.11, 0.08, 0.06]), { k: 0.03 });
  const sung: Sdf[] = [];
  for (const s of [-1, 1]) {
    clay.add('qHead', ellipsoid([s * 0.2, 0.66, 0.54], [0.08, 0.035, 0.05]), { k: 0.02 });
    sung.push(cone([s * 0.1, 0.76, 0.56], [s * 0.25, 0.82, 0.55], 0.05, 0.038));
    sung.push(cone([s * 0.25, 0.82, 0.55], [s * 0.28, 0.97, 0.5], 0.038, 0.01));
  }
  for (const g of sung) clay.add('qHead', g, { k: 0.015 });
  clay.add('qTail', cone([0, 0.72, -0.5], [0, 0.36, -0.58], 0.03, 0.02), { k: 0.02 });
  clay.add('qTail2', ellipsoid([0, 0.33, -0.59], [0.035, 0.06, 0.035]), { k: 0.01 });
  const f = clay.dist;
  const paints: Paint[] = [];
  // Màu sừng chỉ trên phần nhô khỏi đầu, chóp sẫm.
  const sungF = (x: number, y: number, z: number) => Math.min(...sung.map((g) => g(x, y, z)));
  paints.push(clay.layer('qHead', (x, y, z) => Math.max(sungF(x, y, z) - 0.006, 0.15 - Math.abs(x)), C.buffaloHorn));
  paints.push(clay.layer('qHead', (x, y, z) => Math.max(sungF(x, y, z) - 0.006, 0.9 - y), C.ink));
  paints.push(clay.layer('qHead', ellipsoid([0, 0.76, 0.6], [0.11, 0.06, 0.1]), C.gaurBrow));
  paints.push(clay.layer('qHead', ellipsoid([0, 0.52, 0.82], [0.12, 0.1, 0.08]), C.gaurBrow));
  for (const s of [-1, 1]) paints.push(clay.layer('qHead', sphere([s * 0.04, 0.52, 0.875], 0.016), C.ink, 2));
  for (const b of ['qFL', 'qFR', 'qBL', 'qBR']) {
    paints.push(clay.layer(b, (_x, y) => y - 0.3, C.gaurSock));
    paints.push(clay.layer(b, (_x, y) => y - 0.07, C.ink));
  }
  paints.push(clay.layer('qTail2', ellipsoid([0, 0.33, -0.59], [0.05, 0.07, 0.05]), C.ink));
  for (const s of [-1, 1]) paints.push(...eyePaints(clay, 'qHead', f, [s * 0.13, 0.68, 0.66], [s * 0.6, 0.1, 0.8], 0.022));
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.42, -0.01, -0.68], max: [0.42, 1.12, 0.92], cell: 0.013 / detail, target: Math.round(2400 * detail) }, paints))];
}

export function gaurBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'boTot', gaurPieces);
}

// ---------- Rái cá ----------

/**
 * Rái cá: mình dài thấp uốn như con chồn, lông nâu bóng, má, cằm, cổ họng màu kem, đầu tròn dẹt mõm ngắn, tai nhỏ, chân
 * ngắn bàn sẫm, đuôi to gốc thuôn dần. Nặn theo khung `OTTER` (beasts.ts; cùng tên xương với sói đỏ).
 */
function otterPieces(detail: number): Piece[] {
  const clay = new Clay(C.otter);
  clay.add('qBody', ellipsoid([0, 0.32, -0.04], [0.13, 0.12, 0.36]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.34, 0.2], [0.12, 0.12, 0.15]), { k: 0.08 });
  for (const [b, x, z] of [
    ['qFL', -0.09, 0.22],
    ['qFR', 0.09, 0.22],
    ['qBL', -0.09, -0.26],
    ['qBR', 0.09, -0.26],
  ] as [string, number, number][]) {
    clay.add(b, cone([x, 0.28, z], [x, 0.05, z + 0.02], 0.05, 0.035), { k: 0.04 });
    clay.add(b, ellipsoid([x, 0.03, z + 0.035], [0.045, 0.028, 0.06]), { k: 0.02 });
  }
  clay.add('qHead', ellipsoid([0, 0.4, 0.4], [0.1, 0.085, 0.11]), { k: 0.06 });
  clay.add('qHead', ellipsoid([0, 0.37, 0.5], [0.075, 0.055, 0.065]), { k: 0.04 });
  for (const s of [-1, 1]) clay.add('qHead', sphere([s * 0.075, 0.46, 0.36], 0.024), { k: 0.015 });
  clay.add('qTail', cone([0, 0.31, -0.36], [0, 0.22, -0.56], 0.08, 0.052), { k: 0.04 });
  clay.add('qTail2', cone([0, 0.22, -0.56], [0, 0.13, -0.78], 0.052, 0.012), { k: 0.03 });
  const f = clay.dist;
  const paints: Paint[] = [];
  // Má, cằm, cổ họng kem; mũi đen; bàn chân sẫm.
  paints.push(clay.layer('qHead', ellipsoid([0, 0.35, 0.48], [0.11, 0.05, 0.12]), C.cream));
  paints.push(clay.layer('qBody', ellipsoid([0, 0.3, 0.3], [0.085, 0.08, 0.09]), C.cream));
  paints.push(clay.layer('qHead', sphere([0, 0.385, 0.565], 0.022), C.ink));
  for (const b of ['qFL', 'qFR', 'qBL', 'qBR']) paints.push(clay.layer(b, (_x, y) => y - 0.07, C.otterDark));
  paints.push(clay.layer('qTail2', (_x, _y, z) => z + 0.66, C.otterDark));
  for (const s of [-1, 1]) paints.push(...eyePaints(clay, 'qHead', f, [s * 0.06, 0.425, 0.48], [s * 0.6, 0.15, 0.8], 0.016));
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.2, -0.01, -0.84], max: [0.2, 0.56, 0.62], cell: 0.01 / detail, target: Math.round(1600 * detail) }, paints))];
}

export function otterBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'raiCa', otterPieces);
}

// ---------- Tê giác ----------

/**
 * Tê giác: mình to thấp, da xám nâu có nếp gấp sẫm ở vai và hông như giáp, chân cột ngắn, đầu dài cúi thấp, hai sừng
 * trên mõm (sừng trước to), tai ống nhỏ, đuôi ngắn. Nặn theo khung `RHINO` (beasts.ts; cùng tên xương với trâu rừng).
 */
function rhinoPieces(detail: number): Piece[] {
  const clay = new Clay(C.rhino);
  clay.add('qBody', ellipsoid([0, 0.6, -0.02], [0.3, 0.28, 0.5]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.66, 0.24], [0.28, 0.28, 0.24]), { k: 0.1 });
  clay.add('qBody', ellipsoid([0, 0.6, -0.32], [0.28, 0.27, 0.22]), { k: 0.1 });
  for (const [b, x, z] of [
    ['qFL', -0.18, 0.3],
    ['qFR', 0.18, 0.3],
    ['qBL', -0.18, -0.32],
    ['qBR', 0.18, -0.32],
  ] as [string, number, number][]) {
    clay.add(b, cone([x, 0.5, z], [x, 0.07, z + 0.02], 0.11, 0.085), { k: 0.05 });
    clay.add(b, ellipsoid([x, 0.045, z + 0.03], [0.09, 0.045, 0.09]), { k: 0.02 });
  }
  clay.add('qHead', ellipsoid([0, 0.56, 0.58], [0.15, 0.16, 0.2]), { k: 0.06 });
  clay.add('qHead', cone([0, 0.52, 0.68], [0, 0.47, 0.82], 0.13, 0.1), { k: 0.05 });
  // Hai sừng trên mõm: sừng trước to dựng lên, sừng sau nhỏ.
  const sungTruoc = cone([0, 0.54, 0.8], [0, 0.86, 0.9], 0.07, 0.008);
  const sungSau = cone([0, 0.6, 0.68], [0, 0.76, 0.7], 0.045, 0.006);
  clay.add('qHead', sungTruoc, { k: 0.015 });
  clay.add('qHead', sungSau, { k: 0.012 });
  for (const s of [-1, 1]) clay.add('qHead', cone([s * 0.1, 0.68, 0.48], [s * 0.13, 0.8, 0.44], 0.035, 0.025), { k: 0.02 });
  clay.add('qTail', cone([0, 0.66, -0.52], [0, 0.42, -0.6], 0.03, 0.02), { k: 0.02 });
  clay.add('qTail2', ellipsoid([0, 0.4, -0.6], [0.025, 0.04, 0.025]), { k: 0.01 });
  const f = clay.dist;
  const paints: Paint[] = [];
  // Nếp da sẫm như giáp: vòng quanh vai và trước hông.
  for (const zc of [0.12, -0.24]) paints.push(clay.layer('qBody', (_x, y, z) => Math.max(Math.abs(z - zc) - 0.018, 0.42 - y), C.rhinoDark));
  // Màu sừng: chỉ trên hai sừng, từ chỗ nhô khỏi mõm trở lên.
  paints.push(clay.layer('qHead', (x, y, z) => Math.max(Math.min(sungTruoc(x, y, z), sungSau(x, y, z)) - 0.008, 0.6 - y), C.buffaloHorn));
  for (const s of [-1, 1]) paints.push(clay.layer('qHead', sphere([s * 0.05, 0.46, 0.86], 0.016), C.ink, 2));
  for (const b of ['qFL', 'qFR', 'qBL', 'qBR']) paints.push(clay.layer(b, (_x, y) => y - 0.07, C.rhinoDark));
  for (const s of [-1, 1]) paints.push(...eyePaints(clay, 'qHead', f, [s * 0.13, 0.6, 0.66], [s * 0.6, 0.1, 0.8], 0.016));
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.42, -0.01, -0.68], max: [0.42, 0.98, 0.98], cell: 0.013 / detail, target: Math.round(2400 * detail) }, paints))];
}

export function rhinoBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'teGiac', rhinoPieces);
}

// ---------- Gà trắng ----------

/** Gà trống trắng khổng lồ nặn theo khung `ROOSTER`: ức phồng, cổ cao, đầu mào đỏ, cánh, đuôi lông cong, chân vàng. */
/** Màu gà: thân, cánh, lông đuôi xen, chân; `cuu` là gà chín cựa (thêm cựa, đủ chín cái). */
export interface RoosterLook {
  body: number;
  wing: number;
  tail: number;
  tailAlt: number;
  leg: number;
  cuu?: boolean;
}

/** Gà trắng nghìn năm. */
const GA_TRANG: RoosterLook = { body: C.rooster, wing: C.cream, tail: C.rooster, tailAlt: C.cream, leg: C.bronzeLight };

/** Gà chín cựa (lễ vật Sơn Tinh): lông đỏ son, cánh vàng, đuôi xanh đen xen vàng, chân vàng chín cựa. */
export const GA_CUU: RoosterLook = { body: 0xc4462b, wing: C.gold, tail: 0x1f3d34, tailAlt: C.gold, leg: C.gold, cuu: true };

function roosterPieces(detail: number, look: RoosterLook = GA_TRANG): Piece[] {
  const out: Piece[] = [];
  const clay = new Clay(look.body);
  clay.add('qBody', ellipsoid([0, 0.88, -0.04], [0.38, 0.37, 0.5]), { k: 0 });
  clay.add('qBody', ellipsoid([0, 0.94, 0.24], [0.32, 0.33, 0.3]), { k: 0.1 });
  clay.add('qNeck', cone([0, 1.1, 0.24], [0, 1.5, 0.4], 0.22, 0.16), { k: 0.08 });
  clay.add('qHead', ellipsoid([0, 1.6, 0.42], [0.19, 0.19, 0.21]), { k: 0.06 });
  clay.add('qHead', cone([0, 1.585, 0.58], [0, 1.53, 0.76], 0.06, 0.008), { k: 0.015 });
  clay.add('qHead', ellipsoid([0, 1.42, 0.6], [0.05, 0.1, 0.04]), { k: 0.03 });
  for (const [b, s] of [
    ['qWingL', -1],
    ['qWingR', 1],
  ] as const) {
    clay.add(b, ellipsoid([s * 0.33, 0.9, -0.06], [0.1, 0.22, 0.34], [0.25, 0, s * 0.08]), { k: 0.03, apart: b });
    // Mép lông cánh lượn sóng.
    for (let i = 0; i < 4; i++) clay.sub(b, sphere([s * 0.34, 0.66 + i * 0.02, -0.34 + i * 0.12], 0.07), 0.02);
  }
  const f = clay.dist;
  const paints: Paint[] = [];
  paints.push(clay.layer('qHead', (_x, y, z) => Math.max(0.56 - z + 0.4 * (y - 1.58), 1.5 - y), C.bronzeLight));
  paints.push(clay.layer('qHead', ellipsoid([0, 1.42, 0.6], [0.06, 0.11, 0.05]), C.comb));
  for (const [b, s] of [
    ['qWingL', -1],
    ['qWingR', 1],
  ] as const) {
    paints.push(clay.layer(b, ellipsoid([s * 0.36, 0.92, -0.06], [0.08, 0.2, 0.31], [0.25, 0, s * 0.08]), look.wing));
  }
  for (const s of [-1, 1]) {
    const p = hit(f, [s * 0.5, 1.64, 0.5], [-s, 0, -0.2]) ?? [s * 0.15, 1.64, 0.52];
    paints.push(clay.layer('qHead', sphere(p, 0.04), C.comb, 2), clay.layer('qHead', sphere(p, 0.022), C.ink, 2));
  }
  out.push(clayPiece(clay.build({ kind: 'nets', min: [-0.5, 0.42, -0.6], max: [0.5, 1.85, 0.8], cell: 0.015 / detail, target: Math.round(2400 * detail) }, paints)));
  // Mào đỏ răng cưa trên đỉnh đầu.
  const comb = new Clay(C.comb);
  for (let i = 0; i < 5; i++) comb.add('qHead', ellipsoid([0, 1.8 + Math.sin((i / 4) * Math.PI) * 0.08, 0.27 + i * 0.075], [0.04, 0.09 + (i === 2 ? 0.03 : 0), 0.06]), { k: 0.03 });
  out.push(clayPiece(comb.build({ kind: 'nets', min: [-0.08, 1.66, 0.14], max: [0.08, 2.05, 0.66], cell: 0.012 / detail, target: Math.round(300 * detail) })));
  // Đuôi: các lông liềm cong vồng ra sau, trắng xen kem.
  const tail = new Clay(look.tail);
  const tailPaint: Paint[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -0.6 + i * 0.24;
    const sx = Math.sin(a) * 0.2;
    const pts: V3[] = [
      [sx * 0.4, 1.0, -0.42],
      [sx * 0.9, 1.35 + 0.05 * Math.cos(a), -0.55],
      [sx * 1.3, 1.5 + 0.08 * Math.cos(a), -0.8],
      [sx * 1.5, 1.32, -1.0],
    ];
    const rs = [0.07, 0.065, 0.05, 0.015];
    const parts: Sdf[] = [];
    for (let k = 0; k < 3; k++) {
      // Lông dẹt theo bề ngang (quanh mặt phẳng x = sx).
      const seg = cone(pts[k], pts[k + 1], rs[k], rs[k + 1]);
      const flat: Sdf = (x, y, z) => seg(sx + (x - sx) / 0.5, y, z) * 0.5;
      parts.push(flat);
      tail.add('qTail', flat, { k: 0.02 });
    }
    if (i % 2) tailPaint.push(tail.layer('qTail', (x, y, z) => Math.min(...parts.map((q) => q(x, y, z))) - 0.006, look.tailAlt));
  }
  out.push(clayPiece(tail.build({ kind: 'nets', min: [-0.42, 0.85, -1.12], max: [0.42, 1.68, -0.3], cell: 0.014 / detail, target: Math.round(900 * detail) }, tailPaint)));
  // Chân vàng: cẳng, ba ngón trước, ngón sau, cựa.
  const legs = new Clay(look.leg);
  for (const [b, s] of [
    ['qBL', -1],
    ['qBR', 1],
  ] as const) {
    const x = s * 0.14;
    legs.add(b, cone([x, 0.55, 0], [x, 0.05, 0], 0.06, 0.04), { k: 0 });
    for (const a of [-0.5, 0, 0.5]) legs.add(b, cone([x, 0.03, 0.0], [x + Math.sin(a) * 0.17, 0.015, Math.cos(a) * 0.17], 0.03, 0.012), { k: 0.015 });
    legs.add(b, cone([x, 0.03, 0], [x, 0.015, -0.1], 0.025, 0.01), { k: 0.015 });
    legs.add(b, cone([x, 0.18, -0.03], [x, 0.14, -0.14], 0.026, 0.004), { k: 0.012 });
    // Gà chín cựa: chân trái năm cựa, chân phải bốn cựa, xếp dọc cẳng.
    if (look.cuu) for (let i = 1; i < (s < 0 ? 5 : 4); i++) legs.add(b, cone([x, 0.18 + i * 0.075, -0.035], [x + s * 0.03, 0.15 + i * 0.075, -0.13], 0.022, 0.004), { k: 0.01 });
  }
  out.push(clayPiece(legs.build({ kind: 'nets', min: [-0.36, -0.01, -0.2], max: [0.36, 0.6, 0.22], cell: 0.01 / detail, target: Math.round(500 * detail) })));
  return out;
}

export function roosterBody(r: Rig, look?: RoosterLook): void {
  if (look?.cuu) figure(r as unknown as HumanRig, 'gaCuu', (d) => roosterPieces(d, look));
  else figure(r as unknown as HumanRig, 'rooster', roosterPieces);
}

// ---------- Rùa Vàng ----------

/** Mai rùa (vòm vàng có vành bè), để phủ mặt trống đồng lên. */
export function turtleShell(): Sdf {
  const dome = ellipsoid([0, 0.06, 0], [0.62, 0.39, 0.72]);
  const rim = ellipsoid([0, 0.07, 0], [0.68, 0.08, 0.78]);
  return (x, y, z) => {
    const d = Math.min(dome(x, y, z), rim(x, y, z));
    return Math.max(d, 0.0 - y);
  };
}

/** Rùa Vàng nặn theo khung `TURTLE`: mai vàng có rãnh chia múi, cổ, đầu Long Quy, bốn chân chèo, đuôi. */
function turtlePieces(o: { shell: number; groove: number; skin: number; cap: number; beak: number }, detail: number): Piece[] {
  const out: Piece[] = [];
  const shell = new Clay(o.shell);
  shell.add('qBody', turtleShell(), { k: 0 });
  shell.add('qBody', ellipsoid([0, 0.03, 0], [0.6, 0.05, 0.7]), { k: 0.02 });
  const paints: Paint[] = [];
  // Rãnh chia múi: vòng trong, các tia ra vành, vạch vành mai.
  const rho = (x: number, z: number) => Math.hypot(x / 0.62, z / 0.72);
  paints.push(shell.layer('qBody', (x, y, z) => Math.max(Math.abs(rho(x, z) - 0.6) - 0.018, 0.12 - y), o.groove));
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    paints.push(shell.layer('qBody', (x, y, z) => Math.max(Math.abs(Math.cos(a) * x - Math.sin(a) * z) - 0.012, 0.6 - rho(x, z), -(Math.sin(a) * x + Math.cos(a) * z), 0.04 - y), o.groove));
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    paints.push(shell.layer('qBody', (x, y, z) => Math.max(Math.abs(Math.cos(a) * x - Math.sin(a) * z) - 0.01, 0.88 - rho(x, z), -(Math.sin(a) * x + Math.cos(a) * z), y - 0.2), o.groove));
  }
  paints.push(shell.layer('qBody', (_x, y) => y - 0.06, o.groove));
  out.push(clayPiece(shell.build({ kind: 'nets', min: [-0.72, -0.02, -0.82], max: [0.72, 0.5, 0.82], cell: 0.016 / detail, target: Math.round(2200 * detail) }, paints)));
  const clay = new Clay(o.skin);
  clay.add('qNeck', cone([0, 0.18, 0.58], [0, 0.56, 0.93], 0.15, 0.12), { k: 0 });
  clay.add('qHead', ellipsoid([0, 0.64, 1.0], [0.19, 0.16, 0.22]), { k: 0.05 });
  clay.add('qHead', ellipsoid([0, 0.61, 1.13], [0.11, 0.085, 0.14]), { k: 0.05 });
  clay.add('qHead', cone([0, 0.6, 1.2], [0, 0.56, 1.29], 0.05, 0.012), { k: 0.02 });
  clay.add('qHead', ellipsoid([0, 0.555, 1.1], [0.09, 0.05, 0.11]), { k: 0.03 });
  for (const [b, s, front] of [
    ['qFL', -1, true],
    ['qFR', 1, true],
    ['qBL', -1, false],
    ['qBR', 1, false],
  ] as const) {
    const z = front ? 0.46 : -0.47;
    clay.add(b, cone([s * 0.45, 0.07, z * 0.95], [s * (front ? 0.66 : 0.6), 0.06, z * 1.03], front ? 0.1 : 0.085, front ? 0.07 : 0.06), { k: 0.03 });
    clay.add(b, ellipsoid([s * (front ? 0.78 : 0.66), 0.045, z * 1.08], front ? [0.21, 0.028, 0.1] : [0.16, 0.026, 0.085], [0, front ? -s * 0.45 : s * 0.5, 0]), { k: 0.04 });
  }
  clay.add('qTail', cone([0, 0.07, -0.64], [0, 0.06, -0.93], 0.07, 0.01), { k: 0.02 });
  const sp: Paint[] = [];
  sp.push(clay.layer('qHead', (_x, y, z) => Math.max(0.7 - y, 0.86 - z), o.cap));
  sp.push(clay.layer('qHead', (_x, y, z) => Math.max(1.2 - z, y - 0.62), o.beak));
  sp.push(clay.layer('qHead', ellipsoid([0, 0.55, 1.1], [0.095, 0.05, 0.12]), new THREE.Color(o.skin).multiplyScalar(0.78).getHex()));
  for (let i = 0; i < 4; i++) {
    const t = -0.15 + (i / 3) * 0.3;
    const c: V3 = [0, 0.37 + t * Math.cos(0.68) - 0.11 * Math.sin(0.68), 0.75 + t * Math.sin(0.68) + 0.11 * Math.cos(0.68)];
    sp.push(clay.layer('qNeck', ellipsoid(c, [0.11, 0.03, 0.06], [0.68, 0, 0]), o.shell));
  }
  for (const [b, s, front] of [
    ['qFL', -1, true],
    ['qFR', 1, true],
  ] as const) {
    for (let k = 0; k < 3; k++) sp.push(clay.layer(b, (x, y, z) => Math.max(Math.abs(x - s * (0.64 + k * 0.1)) - 0.035, 0.055 - y, Math.abs(z - (front ? 0.49 : -0.5)) - 0.08), k % 2 ? o.groove : o.shell));
  }
  out.push(clayPiece(clay.build({ kind: 'nets', min: [-1.0, -0.01, -1.0], max: [1.0, 0.85, 1.36], cell: 0.016 / detail, target: Math.round(2000 * detail) }, sp)));
  return out;
}

export function turtleBody(r: Rig, o: { shell: number; groove: number; skin: number; cap: number; beak: number }): void {
  figure(r as unknown as HumanRig, `turtle:${JSON.stringify(o)}`, (d) => turtlePieces(o, d));
}

/** Mặt trống đồng phủ đỉnh mai rùa, viền vàng sẫm. */
export function turtleDrum(r: Rig, o: { color: number; rim: number }): void {
  figure(r as unknown as HumanRig, `turtleDrum:${JSON.stringify(o)}`, (detail) => {
    const f = turtleShell();
    const c = hit(f, [0, 1, 0], [0, -1, 0]) ?? [0, 0.45, 0];
    const seg = Math.max(20, Math.round(32 * detail));
    return [
      rigid(decal(f, c, { r: 0.34, lift: 0.012, seg, rings: 3, up: [0, 0, 1] }, o.color), 'qBody', 'drum'),
      rigid(decal(f, c, { r: 0.39, r0: 0.335, lift: 0.01, seg, rings: 1, up: [0, 0, 1] }, o.rim), 'qBody'),
    ];
  });
}

// ---------- Cá voi, cá heo (bien.ts) ----------

/** Cá voi theo khung `WHALE`: đầu to tròn, mình thon dần về cuống đuôi dẹt, bụng sáng có rãnh họng, vây ngực dài. */
function whalePieces(detail: number): Piece[] {
  const clay = new Clay(C.whale);
  // Mình liền một khối từ đầu tới cuống đuôi, uốn theo ba khúc xương (`to` pha dần sang khúc sau).
  clay.add('base', ellipsoid([0, 0, 0.3], [0.6, 0.47, 1.15]), { k: 0, to: { bone: 'tail1', a: [0, 0, -0.45], b: [0, 0, -1.05] } });
  clay.add('base', ellipsoid([0, -0.03, 0.9], [0.54, 0.42, 0.58]), { k: 0.14 });
  clay.add('tail1', cone([0, 0.02, -0.45], [0, 0.05, -1.3], 0.42, 0.23), { k: 0.2, to: { bone: 'tail2', a: [0, 0, -1.3], b: [0, 0, -1.7] } });
  clay.add('tail2', narrow(cone([0, 0.05, -1.3], [0, 0.05, -1.97], 0.23, 0.06), 0.75), { k: 0.12, to: { bone: 'fluke', a: [0, 0, -1.85], b: [0, 0, -2.02] } });
  // Vây lưng nhỏ cong về sau, gờ trước lỗ phun nước.
  clay.add('tail1', narrow(cone([0, 0.3, -0.62], [0, 0.48, -0.9], 0.12, 0.02), 0.35), { k: 0.08 });
  clay.add('base', ellipsoid([0, 0.45, 0.68], [0.09, 0.04, 0.07]), { k: 0.05 });
  for (const s of [-1, 1]) clay.sub('base', ellipsoid([s * 0.045, 0.47, 0.58], [0.028, 0.03, 0.05]), 0.01);
  // Đuôi xòe hai thùy vuốt ra sau, khuyết ở giữa.
  for (const s of [-1, 1]) clay.add('fluke', ellipsoid([s * 0.34, 0.05, -2.1], [0.38, 0.045, 0.15], [0, s * 0.5, 0]), { k: 0.06 });
  clay.sub('fluke', sphere([0, 0.05, -2.29], 0.09), 0.03);
  // Vây ngực dài, chúc xuống, vuốt về sau.
  for (const [b, s] of [
    ['finL', -1],
    ['finR', 1],
  ] as const) {
    clay.add(b, ellipsoid([s * 0.82, -0.29, 0.28], [0.38, 0.05, 0.13], [0, s * 0.5, -s * 0.35]), { k: 0.06 });
  }
  const f = clay.dist;
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const paints: Paint[] = [];
  // Bụng sáng, rãnh họng chạy dọc từ cằm tới rốn.
  // Vây ngực giữ màu lưng.
  paints.push(clay.layer('base', (x, y, z) => Math.max(y - (-0.17 + 0.09 * clamp01(-z / 1.5)), Math.abs(x) - 0.5), C.whaleBelly));
  for (let i = -3; i <= 3; i++) {
    const dx = i * 0.085;
    paints.push(clay.layer('base', (x, y, z) => Math.max(Math.abs(x - dx) - 0.011, y + 0.27, 0.15 - z, z - 1.3), 0x93a6b4));
  }
  // Đường miệng cong lên tới dưới mắt.
  const mouthY = (z: number) => -0.13 + 0.14 * Math.pow(clamp01((1.48 - z) / 0.72), 1.5);
  paints.push(clay.layer('base', (_x, y, z) => Math.max(Math.abs(y - mouthY(z)) - 0.013, 0.74 - z), C.ink));
  for (const s of [-1, 1]) {
    paints.push(clay.layer('base', ellipsoid([s * 0.045, 0.47, 0.58], [0.04, 0.04, 0.06]), C.ink));
    paints.push(...eyePaints(clay, 'base', f, [s * 0.55, 0.08, 0.8], [s, 0.1, 0.25], 0.065));
  }
  return [clayPiece(clay.build({ kind: 'nets', min: [-1.28, -0.7, -2.42], max: [1.28, 0.64, 1.56], cell: 0.022 / detail, target: Math.round(2600 * detail) }, paints))];
}

export function whaleBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'whale', whalePieces);
}

/** Cá heo theo khung `DOLPHIN`: mình thon, trán gồ, mõm dài, vây lưng cong, bụng sáng, miệng cười. */
function dolphinPieces(detail: number): Piece[] {
  const clay = new Clay(C.dolphin);
  clay.add('base', ellipsoid([0, 0, 0.05], [0.16, 0.17, 0.45]), { k: 0, to: { bone: 'tail', a: [0, 0, -0.16], b: [0, 0, -0.38] } });
  clay.add('base', ellipsoid([0, 0.02, 0.36], [0.115, 0.115, 0.15]), { k: 0.06 });
  clay.add('base', cone([0, -0.045, 0.44], [0, -0.055, 0.66], 0.06, 0.034), { k: 0.04 });
  clay.add('tail', narrow(cone([0, 0.0, -0.24], [0, 0.02, -0.64], 0.12, 0.028), 0.8), { k: 0.08, to: { bone: 'fluke', a: [0, 0, -0.56], b: [0, 0, -0.64] } });
  // Vây lưng cong ngả ra sau.
  clay.add('base', narrow(cone([0, 0.13, 0.02], [0, 0.3, -0.13], 0.075, 0.012), 0.3), { k: 0.03 });
  for (const s of [-1, 1]) clay.add('fluke', ellipsoid([s * 0.11, 0.02, -0.69], [0.13, 0.017, 0.05], [0, s * 0.5, 0]), { k: 0.02 });
  for (const [b, s] of [
    ['finL', -1],
    ['finR', 1],
  ] as const) {
    clay.add(b, ellipsoid([s * 0.21, -0.1, 0.15], [0.095, 0.017, 0.042], [0, s * 0.5, -s * 0.4]), { k: 0.03 });
  }
  const f = clay.dist;
  const paints: Paint[] = [];
  paints.push(clay.layer('base', (x, y, z) => Math.max(y + 0.035 - 0.03 * Math.max(0, z - 0.3), Math.abs(x) - 0.15), C.dolphinBelly));
  // Miệng cười dọc mõm.
  const mouthY = (z: number) => -0.058 + 0.035 * THREE.MathUtils.smoothstep(0.52 - z, 0, 0.07);
  paints.push(clay.layer('base', (_x, y, z) => Math.max(Math.abs(y - mouthY(z)) - 0.006, 0.45 - z), C.ink, 1));
  for (const s of [-1, 1]) paints.push(...eyePaints(clay, 'base', f, [s * 0.1, 0.01, 0.35], [s, 0.25, 0.2], 0.022));
  return [clayPiece(clay.build({ kind: 'nets', min: [-0.36, -0.22, -0.8], max: [0.36, 0.34, 0.7], cell: 0.008 / detail, target: Math.round(1500 * detail) }, paints))];
}

export function dolphinBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'dolphin', dolphinPieces);
}
