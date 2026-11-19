// Thủy quái, yêu tinh nặn liền khối (nan.ts) thay cầu, trụ, hộp ghép: tôm binh, cá phun nước, cá sấu, thuồng luồng,
// quỷ núi, ma trơi. Khối gắn theo xương của khung quái (monsters.ts), hòa vào nhau ở khớp. Đồ cầm tay (giáo, chày),
// râu dài, răng nanh vẫn vẽ riêng ở monsters.ts.

import * as THREE from 'three';
import type { HumanRig } from './body';
import { Clay, cone, ellipsoid, hit, keepBound, sphere, type Paint, type Sdf, type V3 } from './nan';
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

// ---------- Rồng (thần thú) ----------

/** Mảnh dẹt theo bề ngang quanh mặt phẳng x = `cx` (vây lưng, lông bờm). */
function flatX(f: Sdf, cx: number, k: number): Sdf {
  return keepBound((x, y, z) => f(cx + (x - cx) / k, y, z) * k, f, 0.02);
}

/** Như `flatY` mà giữ cầu bao (túm lông khuỷu chân rồng). */
function flatYB(f: Sdf, cy: number, k: number): Sdf {
  return keepBound(flatY(f, cy, k), f, 0.02);
}

/**
 * Rồng vàng (theo ảnh mẫu chủ dự án gửi): mình vàng kim phủ vảy cá, bụng ngà có đốt, vây lưng và bờm vàng như lửa mút
 * cam, sừng hươu chẻ nhánh, miệng há đỏ, vuốt ngà.
 */
export const RONG_MAU = {
  body: 0xf3c04a,
  scale: 0xd99a2c,
  belly: 0xfaebc0,
  bellyLine: 0xd9b56a,
  fin: 0xfbe07a,
  finTip: 0xf07a2a,
  horn: 0xfbe39a,
  mouth: 0xb8302a,
};

const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit3 = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Rồng (giống Lạc Long Quân, thần thú): mình dài tròn như rắn, uốn nhiều khúc chữ S, thuôn dần về đuôi, từ ngực
 * (`body[0]`) ra đuôi (`body[n−1]`), mỗi đốt một xương `d{i}` pha sang đốt sau (`to`) cho mình uốn mềm; mình phủ vảy cá
 * xếp so le, bụng ngà có đốt ngang; đầu to, mõm dài, mũi cuộn, u mày, hàm dưới há, miệng đỏ, răng; sừng hươu chẻ nhánh;
 * bờm vàng bay ra sau, chòm râu cằm; vây lưng như lửa vàng mút cam; bốn chân khỏe, khuỷu có túm lông, năm vuốt ngà
 * xòe; đuôi có chùm lửa dài. `neck`, `head` là chỗ xương cổ và đầu; `legs` là chỗ bốn chân (trước trái, trước phải,
 * sau trái, sau phải).
 */
function dragonPieces(o: { body: readonly (readonly [number, number, number, number])[]; neck: V3; head: V3; legs: readonly V3[] }, detail: number): Piece[] {
  const M = RONG_MAU;
  const pts = o.body.map(([x, y, z]) => [x, y, z] as V3);
  const rs = o.body.map((b) => b[3]);
  const n = pts.length;
  const clay = new Clay(M.body);
  for (let i = 0; i < n - 1; i++) {
    const to = i + 1 < n - 1 ? { bone: `d${i + 1}`, a: pts[i], b: pts[i + 1] } : undefined;
    clay.add(`d${i}`, cone(pts[i], pts[i + 1], rs[i], rs[i + 1]), { k: 0.05, ...(to ? { to } : {}) });
  }
  const h = o.head;
  // Đầu to hơn mình: mọi chỗ trên đầu nhân `K`.
  const K = 1.25;
  const at = (d: V3): V3 => add3(h, [d[0] * K, d[1] * K, d[2] * K]);
  // Cổ cong ngửa lên tới đầu.
  clay.add('qNeck', cone(pts[0], o.neck, rs[0], rs[0] * 0.8), { k: 0.05 });
  clay.add('qNeck', cone(o.neck, at([0, -0.03, -0.08]), rs[0] * 0.8, rs[0] * 0.7), { k: 0.05 });
  // Đầu to: sọ, mõm dài, mũi cuộn, u mày, hàm dưới há.
  clay.add('qHead', ellipsoid(h, [0.14, 0.125, 0.16]), { k: 0.05 });
  clay.add('qHead', ellipsoid(at([0, -0.005, 0.2]), [0.094, 0.075, 0.21], [0.1, 0, 0]), { k: 0.05 });
  clay.add('qHead', sphere(at([0, 0.02, 0.36]), 0.07), { k: 0.04 });
  for (const s of [-1, 1]) {
    clay.add('qHead', ellipsoid(at([s * 0.065, 0.08, 0.06]), [0.062, 0.037, 0.087]), { k: 0.025 });
    clay.add('qHead', sphere(at([s * 0.035, 0.05, 0.38]), 0.035), { k: 0.02 });
    // Má phồng.
    clay.add('qHead', ellipsoid(at([s * 0.08, -0.03, 0.02]), [0.062, 0.075, 0.087]), { k: 0.04 });
  }
  clay.add('qHead', cone(at([0, -0.06, 0.0]), at([0, -0.13, 0.3]), 0.075, 0.037), { k: 0.03 });
  clay.sub('qHead', ellipsoid(at([0, -0.07, 0.26]), [0.087, 0.037, 0.19], [-0.12, 0, 0]), 0.01);
  // Bốn chân khỏe vươn như đang vồ: chân trước vươn tới, chân sau duỗi ra sau.
  const chan = o.legs.map((l, i) => {
    const s = i % 2 ? 1 : -1;
    const dz = i < 2 ? 1 : -1;
    const elbow = add3(l, [s * 0.17, -0.06, dz * 0.04]);
    const wrist = add3(elbow, [s * 0.04, -0.13, dz * 0.14]);
    return { b: ['qFL', 'qFR', 'qBL', 'qBR'][i], s, dz, l, elbow, wrist };
  });
  for (const c of chan) {
    clay.add(c.b, cone(c.l, c.elbow, 0.06, 0.036), { k: 0.03 });
    clay.add(c.b, cone(c.elbow, c.wrist, 0.034, 0.026), { k: 0.015 });
    clay.add(c.b, ellipsoid(c.wrist, [0.035, 0.022, 0.035]), { k: 0.012 });
  }
  const f = clay.dist;
  const paints: Paint[] = [];
  // Vảy cá: mỗi đốt một khung (dọc mình, ngang, lên), vảy xếp so le, mép vảy lượn về đuôi; chừa bụng.
  const S = 0.1;
  for (let i = 0; i < n - 1; i++) {
    const a0 = pts[i];
    const d = sub3(pts[i + 1], a0);
    const L = Math.hypot(d[0], d[1], d[2]);
    const ax = unit3(d);
    const side = unit3(cross3(ax, [0, 1, 0]));
    const up = cross3(side, ax);
    const rr = Math.max(rs[i], rs[i + 1]);
    paints.push(
      clay.layer(`d${i}`, (x, y, z) => {
        const w: V3 = [x - a0[0], y - a0[1], z - a0[2]];
        const al = dot3(w, ax);
        const px = dot3(w, side);
        const py = dot3(w, up);
        const v = Math.atan2(px, py) * rr;
        const row = Math.floor(al / S);
        const off = row % 2 ? S / 2 : 0;
        const cx = Math.round((v - off) / S) * S + off;
        const cy = (row + 1) * S;
        const dd = Math.hypot(v - cx, al - cy);
        return Math.max(Math.abs(dd - 0.62 * S) - 0.008, -al, al - L, -py - rr * 0.25, Math.hypot(px, py) - rr * 1.5);
      }, M.scale),
    );
  }
  // Bụng ngà có đốt ngang, lên tới cổ và hàm dưới.
  for (let i = 0; i < n; i++) {
    const [x, y, z] = pts[i];
    paints.push(clay.layer(`d${Math.min(i, n - 2)}`, ellipsoid([x, y - rs[i] * 0.62, z], [rs[i] * 0.8, rs[i] * 0.55, 0.19]), M.belly));
  }
  for (let i = 0; i < n - 1; i++) {
    for (const t of [0.25, 0.75]) {
      const m = lerp3(pts[i], pts[i + 1], t);
      const rr = rs[i] + (rs[i + 1] - rs[i]) * t;
      const ax = unit3(sub3(pts[i + 1], pts[i]));
      paints.push(clay.layer(`d${i}`, (x, y, z) => Math.max(Math.abs(dot3([x - m[0], y - m[1], z - m[2]], ax)) - 0.006, y - (m[1] - rr * 0.35), Math.hypot(x - m[0], y - m[1], z - m[2]) - rr * 1.4), M.bellyLine));
    }
  }
  paints.push(clay.layer('qNeck', ellipsoid(add3(o.neck, [0, -0.05, 0.04]), [0.1, 0.1, 0.22], [-0.7, 0, 0]), M.belly));
  paints.push(clay.layer('qHead', ellipsoid(at([0, -0.13, 0.14]), [0.06, 0.03, 0.17], [-0.2, 0, 0]), M.belly));
  // Miệng đỏ, mắt lửa có viền sẫm.
  paints.push(clay.layer('qHead', ellipsoid(at([0, -0.075, 0.24]), [0.094, 0.044, 0.19], [-0.12, 0, 0]), M.mouth));
  for (const s of [-1, 1]) {
    paints.push(clay.layer('qHead', ellipsoid(at([s * 0.075, 0.07, 0.07]), [0.04, 0.014, 0.06]), M.scale));
    paints.push(...eye(clay, 'qHead', f, at([s * 0.08, 0.045, 0.09]), [s * 0.7, 0.3, 0.6], 0.034, C.ember));
  }
  const out: Piece[] = [build(clay, [-0.8, 0.1, -4.6], [0.8, 2.2, 1.5], 0.013, 6000, detail, paints)];

  // Vây lưng như lửa vàng mút cam, bờm vàng bay ra sau, chòm râu cằm, túm lông khuỷu, chùm lửa đuôi.
  const fin = new Clay(M.fin);
  const finPaint: Paint[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (const t of [0.15, 0.6]) {
      const p = lerp3(pts[i], pts[i + 1], t);
      const rr = rs[i] + (rs[i + 1] - rs[i]) * t;
      const tip: V3 = [p[0], p[1] + rr + 0.06 + rr * 0.9, p[2] - 0.12];
      fin.add(`d${i}`, flatX(cone([p[0], p[1] + rr * 0.6, p[2] + 0.04], tip, rr * 0.5, 0.004), p[0], 0.3), { k: 0.012 });
      finPaint.push(fin.layer(`d${i}`, sphere(tip, 0.04 + rr * 0.4), M.finTip));
    }
  }
  const mane = new Clay(M.fin);
  const manePaint: Paint[] = [];
  // Bờm: chín dải vàng từ sau đầu, hai má vắt ra sau dọc cổ.
  for (let i = 0; i < 9; i++) {
    const s = (i - 4) / 4;
    const root = at([s * 0.09, 0.05 - Math.abs(s) * 0.08, -0.06]);
    const mid = add3(root, [s * 0.12, 0.07 - Math.abs(s) * 0.05, -0.25]);
    const tip = add3(mid, [s * 0.12, -0.04 + 0.05 * Math.sin(i * 1.7), -0.3]);
    mane.add('qHead', cone(root, mid, 0.042, 0.026), { k: 0.012 });
    mane.add('qHead', cone(mid, tip, 0.022, 0.003), { k: 0.01 });
    manePaint.push(mane.layer('qHead', sphere(tip, 0.1), M.finTip));
  }
  // Chòm râu cằm.
  for (const s of [-1, 0, 1]) {
    const root = at([s * 0.025, -0.14, 0.18]);
    const tip = add3(root, [s * 0.03, -0.14, -0.06]);
    mane.add('qHead', cone(root, tip, 0.02, 0.003), { k: 0.008 });
  }
  out.push(build(mane, at([-0.45, -0.45, -0.8]), at([0.45, 0.45, 0.2]), 0.009, 1400, detail, manePaint));
  for (const c of chan) {
    const tuft = new Clay(M.fin);
    const tp: Paint[] = [];
    for (const [dy, dl] of [
      [0.04, 0.22],
      [-0.02, 0.17],
    ] as const) {
      const tip = add3(c.elbow, [c.s * 0.05, dy + 0.03, -0.06 - dl]);
      tuft.add(c.b, flatYB(cone(c.elbow, tip, 0.04, 0.003), c.elbow[1] + dy * 0.5, 0.4), { k: 0.01 });
      tp.push(tuft.layer(c.b, sphere(tip, 0.06), M.finTip));
    }
    out.push(build(tuft, add3(c.elbow, [-0.2, -0.15, -0.4]), add3(c.elbow, [0.2, 0.2, 0.1]), 0.008, 300, detail, tp));
  }
  const tail = pts[n - 1];
  for (const [dx, dy, l] of [
    [0, 0.2, 0.75],
    [-0.12, 0.08, 0.6],
    [0.12, 0.08, 0.6],
    [-0.07, -0.06, 0.5],
    [0.07, -0.06, 0.5],
  ] as const) {
    const mid = add3(tail, [dx * 0.6, dy * 0.4 + 0.06, -l * 0.5]);
    const tip = add3(tail, [dx * 1.4, dy + 0.12, -l]);
    fin.add(`d${n - 2}`, flatX(cone(tail, mid, 0.07, 0.04), tail[0] + dx * 0.3, 0.35), { k: 0.015 });
    fin.add(`d${n - 2}`, flatX(cone(mid, tip, 0.04, 0.003), mid[0], 0.35), { k: 0.012 });
    finPaint.push(fin.layer(`d${n - 2}`, sphere(tip, 0.18), M.finTip));
  }
  out.push(build(fin, [-0.9, 0.0, -5.5], [0.9, 2.5, 1.0], 0.015, 2000, detail, finPaint));

  // Sừng hươu chẻ nhánh, răng, vuốt ngà.
  const horn = new Clay(M.horn);
  for (const s of [-1, 1]) {
    const root = at([s * 0.05, 0.09, -0.02]);
    const mid = add3(root, [s * 0.05, 0.17, -0.12]);
    const tip = add3(mid, [s * 0.03, 0.08, -0.16]);
    horn.add('qHead', cone(root, mid, 0.022, 0.015), { k: 0.008 });
    horn.add('qHead', cone(mid, tip, 0.015, 0.003), { k: 0.006 });
    for (const [t, d] of [
      [0.5, [s * 0.02, 0.09, 0.05]],
      [1, [s * 0.03, 0.1, 0.02]],
    ] as const) {
      const b0 = lerp3(root, mid, t);
      horn.add('qHead', cone(b0, add3(b0, d as V3), 0.011, 0.002), { k: 0.005 });
    }
    for (const z of [0.18, 0.26]) horn.add('qHead', cone(at([s * 0.045, -0.05, z]), at([s * 0.045, -0.09, z]), 0.01, 0.002), { k: 0.004 });
  }
  // Râu: hai sợi dài từ mép mũi lượn ra hai bên, vắt ra sau.
  for (const s of [-1, 1]) {
    let p = at([s * 0.05, 0.03, 0.37]);
    for (const [dx, dy, dz] of [
      [0.035, -0.01, -0.03],
      [0.04, -0.04, -0.1],
      [0.03, -0.07, -0.16],
      [0.02, -0.05, -0.2],
      [0.02, 0.0, -0.2],
      [0.01, 0.04, -0.16],
      [0.0, 0.05, -0.1],
    ] as const) {
      const q = add3(p, [s * dx * K, dy * K, dz * K]);
      horn.add('qHead', cone(p, q, 0.009, 0.007), { k: 0.003 });
      p = q;
    }
  }
  for (const c of chan) {
    const claw = new Clay(M.horn);
    for (const a of [-0.85, -0.3, 0.3, 0.85]) {
      const k1 = add3(c.wrist, [Math.sin(a) * 0.08, -0.005, c.dz * Math.cos(a) * 0.08]);
      const k2 = add3(k1, [Math.sin(a) * 0.04, -0.06, c.dz * Math.cos(a) * 0.03]);
      claw.add(c.b, cone(c.wrist, k1, 0.016, 0.011), { k: 0.004 });
      claw.add(c.b, cone(k1, k2, 0.011, 0.002), { k: 0.003 });
    }
    claw.add(c.b, cone(c.wrist, add3(c.wrist, [-c.s * 0.04, -0.03, -c.dz * 0.04]), 0.011, 0.002), { k: 0.003 });
    out.push(build(claw, add3(c.wrist, [-0.18, -0.15, -0.18]), add3(c.wrist, [0.18, 0.06, 0.18]), 0.006, 300, detail));
  }
  out.push(build(horn, at([-0.4, -0.4, -0.9]), at([0.4, 0.5, 0.5]), 0.006, 1000, detail));
  return out;
}

export function dragonBody(r: Rig, o: Parameters<typeof dragonPieces>[0]): void {
  figure(r as unknown as HumanRig, 'thanThu:rongVang', (d) => dragonPieces(o, d));
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

// ---------- Rắn hổ mang chúa ----------

/**
 * Rắn hổ mang chúa: mình dài màu ô liu sẫm có khoang vàng nhạt, nửa trước dựng đứng, cổ bạnh mang rộng dẹt (mặt trước
 * mang vàng nhạt có hoa văn mực), đầu nhỏ, mắt vàng. Nặn theo các khúc `body` như thuồng luồng.
 */
function cobraPieces(body: readonly (readonly [number, number, number, number])[], detail: number): Piece[] {
  const clay = new Clay(C.cobra);
  const pts = body.map(([x, y, z]) => [x, y, z] as V3);
  const rs = body.map((b) => b[3]);
  const tip: V3 = [pts[0][0] + 0.3, 0.06, pts[0][2] - 0.2];
  clay.add('s0', cone(tip, pts[0], 0.015, rs[0]), { k: 0.03 });
  for (let i = 0; i < pts.length - 1; i++) clay.add(`s${i}`, cone(pts[i], pts[i + 1], rs[i] * 0.95, rs[i + 1] * 0.95), { k: 0.05 });
  const last = pts[pts.length - 1];
  // Mang bạnh: khối dẹt rộng quanh cổ, ngay dưới đầu.
  const hood: V3 = add3(last, [0, 0.12, 0.02]);
  const hoodSdf: Sdf = (x, y, z) => ellipsoid(hood, [0.2, 0.22, 0.2])(x, y, hood[2] + (z - hood[2]) / 0.3) * 0.3;
  clay.add('head', hoodSdf, { k: 0.04 });
  const h: V3 = add3(last, [0, 0.32, 0.1]);
  clay.add('head', ellipsoid(h, [0.085, 0.065, 0.11]), { k: 0.04 });
  clay.add('head', ellipsoid(add3(h, [0, -0.015, 0.09]), [0.065, 0.045, 0.07]), { k: 0.03 });
  const f = clay.dist;
  const paints: Paint[] = [];
  body.forEach(([x, y, z], i) => paints.push(clay.layer(`s${i}`, sphere([x, y, z], rs[i] * 1.05), C.cobraBand)));
  body.forEach(([x, y, z, rr], i) => {
    if (i % 2) return;
    paints.push(clay.layer(`s${i}`, (px, py, pz) => Math.max(Math.abs(py - y) - rr * 0.18, Math.hypot(px - x, pz - z) - rr * 1.2), C.cobra));
  });
  paints.push(clay.layer('head', (x, y, z) => Math.max(hoodSdf(x, y, z) - 0.01, hood[2] + 0.01 - z), C.cobraBand));
  // Hoa văn mực trên mặt trước mang: hai vệt cong và một chấm giữa.
  for (const s of [-1, 1]) paints.push(clay.layer('head', (x, y, z) => Math.max(Math.abs(Math.hypot(x - s * 0.08, y - hood[1]) - 0.06) - 0.012, hood[2] + 0.02 - z), C.ink, 2));
  for (const s of [-1, 1]) paints.push(...eye(clay, 'head', f, add3(h, [s * 0.06, 0.03, 0.06]), [s * 0.6, 0.3, 0.7], 0.022, C.gold));
  return [build(clay, [-0.5, -0.01, -1.3], [0.7, 1.45, 0.6], 0.012, 2000, detail, paints)];
}

export function cobraBody(r: Rig, body: readonly (readonly [number, number, number, number])[]): void {
  figure(r as unknown as HumanRig, 'quai:ranHo', (d) => cobraPieces(body, d));
}

// ---------- Trăn gấm ----------

/**
 * Trăn gấm: mình to, dài, bò sát đất thành hình chữ S, da vàng nâu có hoa gấm nâu sẫm viền mực dọc lưng, bụng kem, đầu
 * dẹt hình nêm ngóc lên một chút, mắt vàng. Nặn theo các khúc `body` như thuồng luồng.
 */
function pythonPieces(body: readonly (readonly [number, number, number, number])[], detail: number): Piece[] {
  const clay = new Clay(C.python);
  const pts = body.map(([x, y, z]) => [x, y, z] as V3);
  const rs = body.map((b) => b[3]);
  const tip: V3 = [pts[0][0] + 0.15, 0.04, pts[0][2] - 0.3];
  clay.add('s0', cone(tip, pts[0], 0.015, rs[0]), { k: 0.03 });
  for (let i = 0; i < pts.length - 1; i++) clay.add(`s${i}`, cone(pts[i], pts[i + 1], rs[i] * 0.95, rs[i + 1] * 0.95), { k: 0.05 });
  const last = pts[pts.length - 1];
  const h: V3 = add3(last, [0, 0.04, 0.16]);
  clay.add('head', cone(last, h, rs[rs.length - 1] * 0.9, 0.07), { k: 0.04 });
  clay.add('head', ellipsoid(h, [0.09, 0.055, 0.12]), { k: 0.04 });
  clay.add('head', ellipsoid(add3(h, [0, -0.01, 0.1]), [0.065, 0.04, 0.07]), { k: 0.03 });
  const f = clay.dist;
  const paints: Paint[] = [];
  body.forEach(([x, y, z, rr], i) => paints.push(clay.layer(`s${i}`, ellipsoid([x, y - rr * 0.7, z], [rr * 0.85, rr * 0.45, rr * 1.4]), C.cream)));
  // Hoa gấm: đốm nâu sẫm viền mực dọc lưng, xen hai bên sườn.
  for (let i = 0; i < pts.length - 1; i++) {
    for (const t of [0.25, 0.75]) {
      const a = pts[i];
      const b = pts[i + 1];
      const c: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      const r = (rs[i] + (rs[i + 1] - rs[i]) * t) * 0.55;
      const side = t < 0.5 ? 1 : -1;
      const p = hit(f, [c[0] + side * 0.25, c[1] + 0.35, c[2]], [-side * 0.5, -1, 0]) ?? c;
      paints.push(clay.layer(`s${i}`, sphere(p, r), C.ink, 2), clay.layer(`s${i}`, sphere(p, r * 0.75), C.pythonSpot, 2));
    }
  }
  paints.push(clay.layer('head', (x, y, z) => Math.max(Math.abs(x - h[0]) - 0.025, h[1] + 0.02 - y, h[2] - 0.08 - z), C.pythonSpot));
  for (const s of [-1, 1]) paints.push(...eye(clay, 'head', f, add3(h, [s * 0.065, 0.02, 0.06]), [s * 0.6, 0.3, 0.7], 0.018, C.gold));
  return [build(clay, [-0.6, -0.01, -1.15], [0.6, 0.5, 1.0], 0.011, 2000, detail, paints)];
}

export function pythonBody(r: Rig, body: readonly (readonly [number, number, number, number])[]): void {
  figure(r as unknown as HumanRig, 'quai:tranGam', (d) => pythonPieces(body, d));
}

// ---------- Cua đá ----------

/**
 * Cua đá: mai rộng dẹt nâu đá, mép mai có răng cưa, hai càng to (một càng to hơn) đầu càng sẫm, tám chân nhọn, hai mắt
 * trên cuống. Xương: thân `qBody`, hai càng `clawL`, `clawR`, chân hai bên `legL`, `legR`.
 */
function crabPieces(detail: number): Piece[] {
  const clay = new Clay(C.crab);
  clay.add('qBody', flatY(ellipsoid([0, 0.38, 0], [0.42, 0.3, 0.32]), 0.38, 0.45), { k: 0 });
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) clay.add('qBody', sphere([s * (0.16 + i * 0.05), 0.42, 0.26 - i * 0.02], 0.035), { k: 0.02 });
  for (const s of [-1, 1]) {
    clay.add('qBody', cone([s * 0.07, 0.46, 0.24], [s * 0.09, 0.58, 0.3], 0.02, 0.018), { k: 0.01 });
    clay.add('qBody', sphere([s * 0.09, 0.6, 0.31], 0.035), { k: 0.01 });
  }
  for (const [b, s, big] of [
    ['clawL', -1, 1],
    ['clawR', 1, 1.25],
  ] as [string, number, number][]) {
    clay.add(b, cone([s * 0.3, 0.36, 0.2], [s * 0.42, 0.42, 0.42], 0.05, 0.06 * big), { k: 0.03, apart: b });
    clay.add(b, ellipsoid([s * 0.45, 0.45, 0.55], [0.09 * big, 0.08 * big, 0.13 * big]), { k: 0.03, apart: b });
    clay.add(b, cone([s * 0.45, 0.47, 0.62], [s * 0.43, 0.5, 0.78], 0.04 * big, 0.01), { k: 0.01, apart: b });
    clay.add(b, cone([s * 0.47, 0.41, 0.62], [s * 0.47, 0.4, 0.74], 0.035 * big, 0.01), { k: 0.01, apart: b });
  }
  for (const [b, s] of [
    ['legL', -1],
    ['legR', 1],
  ] as [string, number][]) {
    for (let i = 0; i < 4; i++) {
      const z = 0.12 - i * 0.12;
      const knee: V3 = [s * 0.55, 0.42, z - 0.02];
      clay.add(b, cone([s * 0.3, 0.36, z], knee, 0.035, 0.03), { k: 0.015, apart: b });
      clay.add(b, cone(knee, [s * 0.66, 0.02, z - 0.06], 0.028, 0.008), { k: 0.015, apart: b });
    }
  }
  const f = clay.dist;
  const paints: Paint[] = [];
  paints.push(clay.layer('qBody', (x, y, z) => Math.max(0.36 - y, Math.hypot(x / 0.36, z / 0.26) - 1), C.crabDark));
  for (const b of ['clawL', 'clawR']) paints.push(clay.layer(b, (_x, _y, z) => 0.6 - z, C.crabDark));
  for (const s of [-1, 1]) paints.push(clay.layer('qBody', sphere([s * 0.09, 0.6, 0.31], 0.038), C.ink, 2));
  void f;
  return [build(clay, [-0.8, -0.01, -0.45], [0.8, 0.7, 0.9], 0.012, 2200, detail, paints)];
}

export function crabBody(r: Rig): void {
  figure(r as unknown as HumanRig, 'quai:cuaDa', crabPieces);
}
