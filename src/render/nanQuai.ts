// Thủy quái, yêu tinh nặn liền khối (nan.ts) thay cầu, trụ, hộp ghép: tôm binh, cá phun nước, cá sấu, thuồng luồng,
// quỷ núi, ma trơi. Khối gắn theo xương của khung quái (monsters.ts), hòa vào nhau ở khớp. Đồ cầm tay (giáo, chày),
// râu dài, răng nanh vẫn vẽ riêng ở monsters.ts.

import * as THREE from 'three';
import type { HumanRig } from './body';
import { Clay, cone, ellipsoid, hit, sphere, type Paint, type Sdf, type V3 } from './nan';
import { clayPiece, figure, type Piece } from './nanNguoi';
import { C } from './palette';
import type { RigBuilder } from './rig';

type Rig = RigBuilder<string>;

const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Khối dẹt theo trục y quanh mặt phẳng y = `cy` (mõm cá sấu, vây). */
function flatY(f: Sdf, cy: number, k: number): Sdf {
  return (x, y, z) => f(x, cy + (y - cy) / k, z) * k;
}

/** Mắt tròn (tô `color`, con ngươi mực) ở chỗ tia từ `from` (cách điểm `at`) chạm mặt `f`. */
function eye(clay: Clay, bone: string, f: Sdf, at: V3, dir: V3, r: number, color: number = C.ink, pupil = true): Paint[] {
  const p = hit(f, add3(at, [dir[0] * 0.4, dir[1] * 0.4, dir[2] * 0.4]), [-dir[0], -dir[1], -dir[2]]) ?? at;
  const out = [clay.layer(bone, sphere(p, r), color, 2)];
  if (pupil && color !== C.ink) out.push(clay.layer(bone, sphere(add3(p, [dir[0] * r * 0.5, dir[1] * r * 0.5, dir[2] * r * 0.5]), r * 0.5), C.ink, 2));
  return out;
}

function build(clay: Clay, lo: V3, hi: V3, cell: number, target: number, detail: number, paints: Paint[] = [], slot: 'plain' | 'glow' = 'plain'): Piece {
  return clayPiece(clay.build({ kind: 'nets', min: lo, max: hi, cell: cell / detail, target: Math.round(target * detail) }, paints), slot);
}

// ---------- Tôm binh ----------

function shrimpPieces(detail: number): Piece[] {
  const clay = new Clay(C.shrimp);
  // Đuôi cong dựng đứng làm chân: bốn đốt vỏ nối nhau, rãnh giữa các đốt; quạt đuôi xòe dưới đất.
  const seg: V3[] = [0, 1, 2, 3].map((i) => [0, 0.12 + i * 0.17, -0.18 + i * 0.07]);
  seg.forEach((c, i) => clay.add(i < 2 ? 'tail0' : 'tail1', ellipsoid(c, [0.15 - i * 0.012, 0.1, 0.14 - i * 0.01]), { k: 0.03 }));
  for (let i = 0; i < 3; i++) {
    const m = lerp3(seg[i], seg[i + 1], 0.5);
    clay.sub(i < 1 ? 'tail0' : 'tail1', ellipsoid(add3(m, [0, 0.0, -0.02]), [0.2, 0.008, 0.2], [0.35, 0, 0]), 0.008);
  }
  for (const s of [-1, 0, 1]) clay.add('base', ellipsoid([s * 0.1, 0.03, -0.3], [0.06, 0.018, 0.13], [0, s * 0.45, 0]), { k: 0.02 });
  // Đầu ngực: vỏ giáp tròn, chủy nhọn chĩa lên trước, cuống mắt.
  clay.add('chest', ellipsoid([0, 0.78, 0.04], [0.17, 0.21, 0.19]), { k: 0.04 });
  clay.add('chest', cone([0, 0.88, 0.17], [0, 1.0, 0.42], 0.045, 0.004), { k: 0.02 });
  for (const s of [-1, 1]) {
    clay.add('chest', cone([s * 0.07, 0.93, 0.13], [s * 0.13, 1.0, 0.15], 0.016, 0.014), { k: 0.01 });
    clay.add('chest', sphere([s * 0.14, 1.01, 0.15], 0.042), { k: 0.008 });
  }
  // Càng trái co trước ngực.
  clay.add('chest', cone([-0.15, 0.74, 0.08], [-0.2, 0.6, 0.18], 0.032, 0.03), { k: 0.02 });
  clay.add('chest', ellipsoid([-0.2, 0.58, 0.22], [0.04, 0.03, 0.06], [0.5, 0, 0]), { k: 0.01 });
  // Càng phải (xương `arm`) cầm giáo.
  clay.add('arm', cone([0.16, 0.76, 0.1], [0.21, 0.6, 0.12], 0.034, 0.03), { k: 0.02 });
  clay.add('arm', ellipsoid([0.23, 0.6, 0.12], [0.04, 0.05, 0.04]), { k: 0.01 });
  const paints: Paint[] = [];
  seg.forEach((c, i) => {
    if (i % 2) paints.push(clay.layer(i < 2 ? 'tail0' : 'tail1', ellipsoid(c, [0.2, 0.07, 0.2]), C.shrimpLight));
  });
  paints.push(clay.layer('base', (_x, y) => y - 0.06, C.shrimpLight));
  paints.push(clay.layer('chest', ellipsoid([0, 0.7, 0.1], [0.12, 0.12, 0.14]), C.shrimpLight));
  for (const s of [-1, 1]) paints.push(clay.layer('chest', sphere([s * 0.14, 1.01, 0.15], 0.05), C.ink));
  return [build(clay, [-0.3, -0.01, -0.48], [0.32, 1.1, 0.48], 0.011, 1300, detail, paints)];
}

// ---------- Cá phun nước ----------

function fishPieces(detail: number): Piece[] {
  const clay = new Clay(C.fish);
  // Mình cá dựng đứng trên đuôi: thân thoi dẹt, cuống đuôi, vây đuôi xòe dưới đất.
  clay.add('body', ellipsoid([0, 0.62, 0], [0.19, 0.3, 0.17]), { k: 0 });
  clay.add('base', cone([0, 0.4, 0], [0, 0.14, 0], 0.1, 0.06), { k: 0.06 });
  for (const s of [-1, 1]) clay.add('base', ellipsoid([s * 0.12, 0.08, -0.02], [0.12, 0.025, 0.08], [0, 0, s * 0.5]), { k: 0.03 });
  // Mắt lồi hai bên đỉnh đầu.
  for (const s of [-1, 1]) clay.add('body', sphere([s * 0.12, 0.88, 0.1], 0.07), { k: 0.03 });
  // Miệng tròn há to (xương `mouth`): môi dày, lòng miệng khoét sâu.
  clay.add('mouth', ellipsoid([0, 0.72, 0.17], [0.085, 0.08, 0.06]), { k: 0.04 });
  clay.sub('mouth', ellipsoid([0, 0.72, 0.24], [0.05, 0.05, 0.08]), 0.012);
  const f = clay.dist;
  const paints: Paint[] = [];
  paints.push(clay.layer('body', ellipsoid([0, 0.56, 0.1], [0.14, 0.24, 0.12]), C.fishBelly));
  paints.push(clay.layer('mouth', ellipsoid([0, 0.72, 0.17], [0.1, 0.095, 0.075]), C.fishBelly));
  paints.push(clay.layer('mouth', ellipsoid([0, 0.72, 0.21], [0.05, 0.05, 0.06]), C.ink));
  paints.push(clay.layer('body', (_x, _y, z) => z + 0.05, new THREE.Color(C.fish).multiplyScalar(0.8).getHex()));
  for (const s of [-1, 1]) paints.push(...eye(clay, 'body', f, [s * 0.15, 0.9, 0.13], [s * 0.6, 0.1, 0.8], 0.04, C.cream));
  const out = [build(clay, [-0.3, -0.01, -0.25], [0.3, 0.98, 0.3], 0.011, 1400, detail, paints)];
  // Vây lưng, vây ngực đỏ: tấm dẹt có tia.
  const fin = new Clay(C.red);
  fin.add('body', ellipsoid([0, 0.8, -0.17], [0.012, 0.18, 0.085], [0.35, 0, 0]), { k: 0 });
  for (const [b, s] of [
    ['finL', -1],
    ['finR', 1],
  ] as const) {
    fin.add(b, ellipsoid([s * 0.22, 0.55, 0.05], [0.1, 0.018, 0.07], [0, 0, s * 0.6]), { k: 0, apart: b });
  }
  const rays = [fin.layer('body', (_x, y, z) => Math.abs(Math.sin((y - z) * 40)) - 0.25, C.ember)];
  out.push(build(fin, [-0.36, 0.42, -0.32], [0.36, 1.0, 0.16], 0.008, 400, detail, rays));
  return out;
}

// ---------- Cá sấu ----------

function crocPieces(detail: number): Piece[] {
  const clay = new Clay(C.croc);
  clay.add('body', ellipsoid([0, 0.29, 0], [0.26, 0.17, 0.46]), { k: 0 });
  // Mõm trên dài dẹt, u mắt, lỗ mũi; hàm dưới (xương `jaw`).
  clay.add('head', flatY(cone([0, 0.35, 0.38], [0, 0.33, 0.98], 0.15, 0.08), 0.34, 0.55), { k: 0.06 });
  for (const s of [-1, 1]) {
    clay.add('head', sphere([s * 0.1, 0.43, 0.45], 0.06), { k: 0.03 });
    clay.add('head', sphere([s * 0.04, 0.37, 0.95], 0.03), { k: 0.02 });
  }
  clay.add('jaw', flatY(cone([0, 0.26, 0.42], [0, 0.24, 0.96], 0.13, 0.07), 0.25, 0.4), { k: 0.03 });
  // Chân ngắn chìa ra hai bên, bàn chân bè.
  for (const [b, x, z] of [
    ['qFL', -0.2, 0.3],
    ['qFR', 0.2, 0.3],
    ['qBL', -0.2, -0.25],
    ['qBR', 0.2, -0.25],
  ] as const) {
    clay.add(b, cone([x * 0.9, 0.24, z], [x * 1.45, 0.06, z + 0.04], 0.065, 0.05), { k: 0.04 });
    clay.add(b, ellipsoid([x * 1.5, 0.03, z + 0.07], [0.07, 0.025, 0.08]), { k: 0.02 });
  }
  // Đuôi dài vuốt nhọn, dẹt hai bên.
  clay.add('tail', cone([0, 0.28, -0.38], [0, 0.25, -0.86], 0.16, 0.1), { k: 0.06 });
  clay.add('tail2', cone([0, 0.25, -0.86], [0, 0.21, -1.38], 0.1, 0.012), { k: 0.03 });
  // Gai vảy dọc sống lưng, sống đuôi.
  const ridge: [string, V3][] = [];
  for (let i = 0; i < 4; i++) ridge.push(['body', [0, 0.45 - i * 0.012, 0.3 - i * 0.2]]);
  for (let i = 0; i < 3; i++) ridge.push(['tail', [0, 0.41 - i * 0.03, -0.48 - i * 0.14]]);
  for (let i = 0; i < 3; i++) ridge.push(['tail2', [0, 0.33 - i * 0.03, -0.94 - i * 0.13]]);
  for (const [b, c] of ridge) clay.add(b, ellipsoid(c, [0.03, 0.045, 0.04]), { k: 0.02 });
  const f = clay.dist;
  const paints: Paint[] = [];
  paints.push(clay.layer('body', (_x, y) => y - 0.2, C.crocBelly));
  paints.push(clay.layer('jaw', (_x, y) => y - 0.24, C.crocBelly));
  for (const [b, c] of ridge) paints.push(clay.layer(b, ellipsoid(c, [0.045, 0.06, 0.055]), C.serpent));
  for (const s of [-1, 1]) paints.push(...eye(clay, 'head', f, [s * 0.11, 0.46, 0.48], [s * 0.4, 0.5, 0.75], 0.03, C.ember));
  return [build(clay, [-0.42, -0.01, -1.45], [0.42, 0.52, 1.06], 0.013, 2000, detail, paints)];
}

// ---------- Thuồng luồng ----------

/** Các khúc mình rắn từ đuôi lên cổ: x, y, z, bán kính (như monsters.ts). */
function serpentPieces(body: readonly (readonly [number, number, number, number])[], detail: number): Piece[] {
  const clay = new Clay(C.serpent);
  const pts = body.map(([x, y, z]) => [x, y, z] as V3);
  const rs = body.map((b) => b[3]);
  // Đuôi thuôn ra sau từ khúc đầu.
  const tip: V3 = [pts[0][0] - 0.12, 0.1, pts[0][2] - 0.55];
  clay.add('s0', cone(tip, pts[0], 0.02, rs[0]), { k: 0.04 });
  for (let i = 0; i < pts.length - 1; i++) clay.add(`s${i}`, cone(pts[i], pts[i + 1], rs[i] * 0.95, rs[i + 1] * 0.95), { k: 0.06 });
  // Đầu rồng: sọ, mõm dài, hàm, u mày.
  const h: V3 = [0.05, 1.42, 0.42];
  const last = pts[pts.length - 1];
  clay.add('head', cone(last, add3(h, [0, -0.02, -0.1]), rs[rs.length - 1] * 0.9, 0.16), { k: 0.06 });
  clay.add('head', ellipsoid(h, [0.17, 0.12, 0.2]), { k: 0.05 });
  clay.add('head', ellipsoid(add3(h, [0, -0.02, 0.18]), [0.13, 0.085, 0.14]), { k: 0.05 });
  clay.add('head', ellipsoid(add3(h, [0, -0.11, 0.12]), [0.12, 0.05, 0.15]), { k: 0.03 });
  for (const s of [-1, 1]) clay.add('head', ellipsoid(add3(h, [s * 0.11, 0.09, 0.14]), [0.06, 0.035, 0.06]), { k: 0.03 });
  const f = clay.dist;
  const paints: Paint[] = [];
  body.forEach(([x, y, z, rr], i) => paints.push(clay.layer(`s${i}`, ellipsoid([x, y - rr * 0.15, z + rr * 0.5], [rr * 0.72, rr * 0.75, rr * 0.5]), C.serpentBelly)));
  paints.push(clay.layer('head', ellipsoid(add3(h, [0, -0.11, 0.14]), [0.13, 0.055, 0.17]), C.serpentBelly));
  for (const s of [-1, 1]) paints.push(...eye(clay, 'head', f, add3(h, [s * 0.12, 0.07, 0.17]), [s * 0.5, 0.3, 0.8], 0.04, C.ember));
  return [build(clay, [-0.42, -0.01, -1.55], [0.6, 1.68, 0.78], 0.016, 2200, detail, paints)];
}

// ---------- Quỷ núi ----------

/** Quỷ núi: mình to vai u, bụng phệ, tay dài nắm đấm to, chân ngắn, đầu to trán gồ, khố da. Tay nặn dang ra. */
function demonPieces(detail: number): Piece[] {
  const spread = (bone: 'armL' | 'armR', at: V3) => {
    const s = bone === 'armR' ? 1 : -1;
    return new THREE.Matrix4()
      .makeTranslation(...at)
      .multiply(new THREE.Matrix4().makeRotationZ(s * 0.5))
      .multiply(new THREE.Matrix4().makeTranslation(-at[0], -at[1], -at[2]));
  };
  const L: V3 = [-0.25, 0.68, 0.03];
  const R: V3 = [0.25, 0.68, 0.03];
  const pose = { armL: spread('armL', L), handL: spread('armL', L), armR: spread('armR', R), hand: spread('armR', R) };
  const clay = new Clay(C.demon, pose);
  clay.add('chest', ellipsoid([0, 0.58, 0], [0.24, 0.22, 0.2]), { k: 0 });
  clay.add('chest', ellipsoid([0, 0.46, 0.05], [0.21, 0.16, 0.19]), { k: 0.08 });
  for (const s of [-1, 1]) clay.add('chest', ellipsoid([s * 0.17, 0.7, -0.01], [0.11, 0.08, 0.1]), { k: 0.06 });
  clay.add('hips', ellipsoid([0, 0.36, 0], [0.2, 0.1, 0.16]), { k: 0.06 });
  for (const [b, x] of [
    ['legL', -0.1],
    ['legR', 0.1],
  ] as const) {
    clay.add(b, cone([x, 0.32, 0], [x, 0.06, 0.01], 0.085, 0.07), { k: 0.05 });
    clay.add(b, ellipsoid([x, 0.035, 0.05], [0.075, 0.04, 0.11]), { k: 0.03 });
  }
  for (const [b, hb, s] of [
    ['armL', 'handL', -1],
    ['armR', 'hand', 1],
  ] as const) {
    clay.add(b, cone([s * 0.25, 0.68, 0.03], [s * 0.25, 0.36, 0.03], 0.075, 0.06), { k: 0.06 });
    clay.add(hb, ellipsoid([s * 0.25, 0.31, 0.03], [0.075, 0.07, 0.075]), { k: 0.03 });
  }
  // Đầu to: sọ, trán gồ, mũi tẹt, hàm bạnh.
  clay.add('head', ellipsoid([0, 0.94, 0.03], [0.25, 0.23, 0.23]), { k: 0.06 });
  clay.add('head', ellipsoid([0, 1.02, 0.15], [0.19, 0.06, 0.1]), { k: 0.05 });
  clay.add('head', ellipsoid([0, 0.94, 0.24], [0.045, 0.04, 0.04]), { k: 0.03 });
  clay.add('head', ellipsoid([0, 0.83, 0.12], [0.18, 0.08, 0.13]), { k: 0.06 });
  clay.sub('head', ellipsoid([0, 0.84, 0.25], [0.09, 0.012, 0.05]), 0.01);
  const f = clay.dist;
  const paints: Paint[] = [];
  // Khố da, cẳng chân, nắm tay sẫm; mắt đỏ, mày đen.
  paints.push(clay.layer('hips', (_x, y) => Math.max(y - 0.43, 0.24 - y), C.earthDark));
  for (const b of ['legL', 'legR']) paints.push(clay.layer(b, (_x, y) => y - 0.2, C.demonDark));
  for (const [b, s] of [
    ['handL', -1],
    ['hand', 1],
  ] as const)
    paints.push(clay.layer(b, ellipsoid([s * 0.25, 0.31, 0.03], [0.09, 0.085, 0.09]), C.demonDark));
  for (const s of [-1, 1]) {
    paints.push(...eye(clay, 'head', f, [s * 0.09, 0.97, 0.2], [s * 0.2, 0.05, 1], 0.045, C.ember));
    const b = hit(f, [s * 0.09, 1.05, 0.6], [0, 0, -1]) ?? [s * 0.09, 1.05, 0.22];
    paints.push(clay.layer('head', ellipsoid(b, [0.06, 0.014, 0.04], [0, 0, -s * 0.35]), C.ink, 1));
  }
  return [build(clay, [-0.55, -0.01, -0.3], [0.55, 1.22, 0.36], 0.012, 2000, detail, paints)];
}

// ---------- Ma trơi ----------

/** Ma trơi: đốm lửa giọt nước có lõi sáng, lưỡi lửa vuốt nhọn (ba xương lửa bập bùng), mắt, miệng đen. Tự sáng. */
function ghostPieces(detail: number): Piece[] {
  const clay = new Clay(C.ghost);
  clay.add('core', ellipsoid([0, 0.62, 0], [0.24, 0.25, 0.24]), { k: 0 });
  clay.add('flame', cone([0, 0.75, -0.03], [0, 1.22, -0.13], 0.18, 0.01), { k: 0.08 });
  for (const s of [-1, 1]) clay.add(s > 0 ? 'flameL' : 'flameR', cone([s * 0.12, 0.8, 0.02], [s * 0.24, 1.04, -0.01], 0.09, 0.008), { k: 0.06 });
  const paints: Paint[] = [];
  paints.push(clay.layer('flame', (_x, y) => 0.95 - y, C.ghostDeep));
  paints.push(clay.layer('core', ellipsoid([0, 0.58, 0.12], [0.15, 0.15, 0.14]), 0xe8fbff));
  const f = clay.dist;
  for (const s of [-1, 1]) {
    const p = hit(f, [s * 0.08, 0.66, 0.6], [0, 0, -1]) ?? [s * 0.08, 0.66, 0.22];
    paints.push(clay.layer('core', ellipsoid(p, [0.035, 0.05, 0.03]), C.ink, 2));
  }
  const m = hit(f, [0, 0.55, 0.6], [0, 0, -1]) ?? [0, 0.55, 0.23];
  paints.push(clay.layer('core', ellipsoid(m, [0.035, 0.024, 0.03]), C.ink, 2));
  return [build(clay, [-0.36, 0.3, -0.32], [0.36, 1.3, 0.3], 0.012, 1100, detail, paints, 'glow')];
}

const MAKERS = {
  tomBinh: shrimpPieces,
  caPhun: fishPieces,
  caSau: crocPieces,
  quyNui: demonPieces,
  maTroi: ghostPieces,
} as const;

/** Thân nặn của quái `kind` (thuồng luồng dùng `serpentBody`). */
export function monsterBody(r: Rig, kind: keyof typeof MAKERS): void {
  figure(r as unknown as HumanRig, `quai:${kind}`, MAKERS[kind]);
}

export function serpentBody(r: Rig, body: readonly (readonly [number, number, number, number])[]): void {
  figure(r as unknown as HumanRig, 'quai:thuongLuong', (d) => serpentPieces(body, d));
}
