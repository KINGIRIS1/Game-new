// Thần thú (docs/thiet-ke.md mục Kế hoạch: nuôi thần thú): năm thú có khung xương, dùng chung cho trận dã ngoại
// (`battleView.ts`) và kinh đô (`world.ts`: thú đi lại, bay trong thành). Ngựa sắt, gà chín cựa, Rùa Vàng dựng từ dáng
// sẵn có (`heroes.ts`, `beasts.ts`); chim Lạc và rồng dựng ở đây bằng khối ghép gắn xương.
//
// Ba dáng theo cấp (`dangThu` ở `game/thanThu.ts`): non nhỏ, lớn, thần to hơn và có quầng hào quang. Gốc mô hình ở
// mặt đất dưới thú, đầu hướng +z. Thú bay (`THAN_THU[k].bay`) ghi `userData.bay` là độ cao bay (theo cỡ mô hình).

import * as THREE from 'three';
import { THAN_THU, type ThanThuId } from '../game/defs';
import { lerp, strikeCurve } from './body';
import { makeGaCuu, makeRuaThan } from './beasts';
import { makeNguaSat } from './heroes';
import { C } from './palette';
import { RigBuilder, resetBones, skinRig, type Act, type BoneDef, type Bones, type Poser } from './rig';

type Defs = Record<string, BoneDef<string>>;
type B = Bones<string>;

/** Cỡ mỗi dáng (non, lớn, thần). */
export const DANG_CO = [0.7, 0.88, 1.08] as const;

/** Độ chi tiết như thú trong trận. */
const DETAIL = 0.75;

// ---------- Chim Lạc ----------

const LAC: Defs = {
  base: { parent: null, at: [0, 0, 0] },
  qBody: { parent: 'base', at: [0, 0.9, 0] },
  qNeck: { parent: 'qBody', at: [0, 1.0, 0.26] },
  qHead: { parent: 'qNeck', at: [0, 1.34, 0.54] },
  qWingL: { parent: 'qBody', at: [-0.16, 1.0, 0.04] },
  qWingR: { parent: 'qBody', at: [0.16, 1.0, 0.04] },
  qWingL2: { parent: 'qWingL', at: [-0.68, 1.0, 0.0] },
  qWingR2: { parent: 'qWingR', at: [0.68, 1.0, 0.0] },
  qTail: { parent: 'qBody', at: [0, 0.92, -0.32] },
};

/**
 * Chim Lạc như trên mặt trống đồng: mình thon trắng ngà, cổ dài, mỏ dài thẳng, mào lông đỏ vắt ra sau, cánh đồng
 * sải rộng mút lông vàng, đuôi xòe lông đỏ vàng, chân dài thu về sau khi bay, mắt sáng.
 */
function drawLac(r: RigBuilder<string>): void {
  const body = r.on('qBody');
  body.plain.sphere(0.24, C.cream, 0, 0.92, 0.02, [1, 0.82, 1.65], 12);
  body.plain.sphere(0.15, C.gold, 0, 0.86, 0.2, [1, 0.8, 1.1], 10);
  // Vạch hoa văn đồng dọc lưng.
  for (let i = 0; i < 4; i++) body.band.box(0.03, 0.03, 0.09, C.bronze, 0, 1.11, 0.16 - i * 0.12);
  // Chân dài thu về sau.
  for (const s of [-1, 1]) {
    body.plain.cyl(0.018, 0.018, 0.55, C.bronzeDark, s * 0.07, 0.8, -0.42, [Math.PI / 2 - 0.25, 0, 0], 5);
    body.plain.cone(0.03, 0.08, C.bronzeDark, s * 0.07, 0.73, -0.72, [-Math.PI / 2, 0, 0], 5);
  }
  r.on('qNeck').plain.cyl(0.06, 0.09, 0.44, C.cream, 0, 1.15, 0.39, [0.67, 0, 0], 8);
  const head = r.on('qHead');
  head.plain.sphere(0.1, C.cream, 0, 1.36, 0.57, [1, 1, 1.1], 10);
  head.plain.cone(0.035, 0.44, C.bronzeDark, 0, 1.34, 0.88, [Math.PI / 2, 0, 0], 6);
  for (const s of [-1, 1]) head.glow.sphere(0.022, C.ember, s * 0.07, 1.39, 0.62, [1, 1, 1], 6);
  // Mào: ba lông dài vắt ra sau, mút vàng.
  for (const [a, x] of [
    [0, 0],
    [0.25, -0.04],
    [-0.25, 0.04],
  ] as const) {
    head.plain.box(0.022, 0.022, 0.22, C.red, x, 1.47, 0.47, [0.7, a, 0]);
    head.glow.sphere(0.022, C.gold, x - Math.sin(a) * 0.1, 1.53, 0.38, [1, 1, 1.4], 6);
  }
  // Cánh: phần trong đồng, phần ngoài lông sải dài vàng xen đồng sáng.
  for (const [b, b2, s] of [
    ['qWingL', 'qWingL2', -1],
    ['qWingR', 'qWingR2', 1],
  ] as const) {
    const w = r.on(b);
    w.plain.box(0.56, 0.045, 0.34, C.bronze, s * 0.44, 1.0, 0.02);
    w.band.box(0.5, 0.05, 0.08, C.cream, s * 0.44, 1.015, 0.15);
    const w2 = r.on(b2);
    for (let i = 0; i < 5; i++) w2.plain.box(0.56, 0.03, 0.085, i % 2 ? C.gold : C.bronzeLight, s * (0.96 + i * 0.02), 1.0, 0.13 - i * 0.075, [0, s * -0.12 * i, 0]);
  }
  // Đuôi xòe năm lông dài.
  const tail = r.on('qTail');
  for (let i = -2; i <= 2; i++) tail.plain.box(0.065, 0.022, 0.5, i % 2 ? C.red : C.gold, i * 0.05, 0.9, -0.58, [-0.05, i * 0.22, 0]);
}

/** Chim Lạc luôn bay: đi thì vỗ cánh mạnh, đứng thì liệng chậm; đánh thì chúc đầu bổ xuống, cánh vút lên. */
function poseLac(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  if (a.act === 'dead') {
    const f = a.fall ?? 1;
    b.qWingL.rotation.z = 0.6 * f;
    b.qWingR.rotation.z = -0.6 * f;
    b.qNeck.rotation.x = 0.6 * f;
    return;
  }
  const fly = a.act === 'walk';
  const ph = fly ? (a.phase ?? 0) * 0.9 : t * 3.2;
  const amp = fly ? 0.75 : 0.4;
  const flap = Math.sin(ph);
  b.qWingL.rotation.z = -amp * flap;
  b.qWingR.rotation.z = amp * flap;
  b.qWingL2.rotation.z = -0.45 * amp * Math.sin(ph - 0.8);
  b.qWingR2.rotation.z = 0.45 * amp * Math.sin(ph - 0.8);
  b.qBody.position.y -= 0.05 * flap;
  b.qTail.rotation.x = 0.08 * Math.sin(ph + 1);
  b.qNeck.rotation.x = 0.05 * Math.sin(t * 1.4);
  if (a.act === 'fight') {
    const e = strikeCurve(a.strike, 0.25, 0.45);
    b.qBody.rotation.x = 0.45 * e;
    b.qNeck.rotation.x = 0.35 * e;
    b.qWingL.rotation.z = lerp(b.qWingL.rotation.z, -1.0, e);
    b.qWingR.rotation.z = lerp(b.qWingR.rotation.z, 1.0, e);
  }
}

// ---------- Rồng ----------

/** Số đốt mình rồng (sau ngực), mỗi đốt một xương. */
const DOT = 6;
const RONG: Defs = (() => {
  const d: Defs = {
    base: { parent: null, at: [0, 0, 0] },
    qBody: { parent: 'base', at: [0, 0.9, 0.35] },
    qNeck: { parent: 'qBody', at: [0, 1.0, 0.55] },
    qHead: { parent: 'qNeck', at: [0, 1.25, 0.85] },
    qFL: { parent: 'qBody', at: [-0.16, 0.82, 0.38] },
    qFR: { parent: 'qBody', at: [0.16, 0.82, 0.38] },
  };
  for (let i = 0; i < DOT; i++) d[`s${i}`] = { parent: i ? `s${i - 1}` : 'qBody', at: [0, 0.9, 0.15 - i * 0.36] };
  d.qBL = { parent: 's1', at: [-0.13, 0.82, -0.2] };
  d.qBR = { parent: 's1', at: [0.13, 0.82, -0.2] };
  return d;
})();

/** Xanh ngọc của mình rồng, sẫm của vảy. */
const RONG_XANH = 0x2f9a72;
const RONG_SAM = 0x1d6b4f;

/**
 * Rồng Lạc Long Quân: mình dài uốn khúc xanh ngọc, bụng vàng, vây lưng đỏ, đầu có sừng vàng, râu vàng dài, bờm đỏ,
 * mắt sáng; bốn chân ngắn vuốt vàng.
 */
function drawRong(r: RigBuilder<string>): void {
  const chest = r.on('qBody');
  chest.plain.sphere(0.22, RONG_XANH, 0, 0.92, 0.35, [1, 0.95, 1.3], 12);
  chest.plain.sphere(0.15, C.gold, 0, 0.82, 0.42, [1, 0.7, 1.1], 10);
  for (let i = 0; i < DOT; i++) {
    const z = 0.15 - i * 0.36;
    const rr = 0.2 * (1 - i / (DOT + 1.5));
    const p = r.on(`s${i}`);
    p.plain.sphere(rr, i % 2 ? RONG_SAM : RONG_XANH, 0, 0.9, z, [1, 0.92, 1.5], 10);
    p.plain.sphere(rr * 0.72, C.gold, 0, 0.9 - rr * 0.45, z, [1, 0.6, 1.4], 8);
    p.plain.cone(rr * 0.5, rr * 1.3, C.red, 0, 0.9 + rr * 1.1, z, [-0.4, 0, 0], 5);
    // Ống mình nối sang đốt trước, cho mình rồng liền một dải.
    p.plain.cyl(rr * 0.9, rr * 0.95, 0.36, RONG_XANH, 0, 0.9, z + 0.18, [Math.PI / 2, 0, 0], 9);
    if (i === DOT - 1) {
      // Chùm đuôi lửa vàng đỏ.
      p.plain.cone(0.07, 0.42, C.red, 0, 0.92, z - 0.3, [-Math.PI / 2, 0, 0], 6);
      p.glow.cone(0.05, 0.3, C.ember, 0, 0.96, z - 0.26, [-Math.PI / 2 - 0.3, 0, 0], 5);
    }
  }
  r.on('qNeck').plain.cyl(0.11, 0.16, 0.4, RONG_XANH, 0, 1.08, 0.66, [0.85, 0, 0], 10);
  const head = r.on('qHead');
  const h = head.plain;
  h.sphere(0.16, RONG_XANH, 0, 1.28, 0.9, [1, 0.85, 1.2], 12);
  h.box(0.2, 0.1, 0.3, RONG_XANH, 0, 1.22, 1.1);
  h.box(0.17, 0.05, 0.26, C.gold, 0, 1.15, 1.1);
  h.sphere(0.04, RONG_SAM, 0, 1.25, 1.26, [1.4, 0.8, 1], 6);
  for (const s of [-1, 1]) {
    head.glow.sphere(0.035, C.ember, s * 0.1, 1.35, 1.0, [1, 0.8, 1], 6);
    // Sừng vàng vút ra sau.
    h.cone(0.035, 0.36, C.gold, s * 0.08, 1.48, 0.78, [-1.0, 0, s * 0.3], 6);
    // Râu vàng dài.
    h.cyl(0.012, 0.012, 0.55, C.gold, s * 0.12, 1.18, 1.05, [1.2, 0, s * 0.6], 4);
    // Bờm đỏ.
    for (let i = 0; i < 3; i++) h.cone(0.05, 0.22, C.red, s * 0.1, 1.32 - i * 0.05, 0.76 - i * 0.07, [-1.6, 0, s * 0.7], 5);
  }
  for (const k of ['qFL', 'qFR', 'qBL', 'qBR'] as const) {
    const s = k.endsWith('L') ? -1 : 1;
    const at = RONG[k].at;
    const p = r.on(k).plain;
    p.cyl(0.05, 0.04, 0.3, RONG_SAM, at[0] + s * 0.05, at[1] - 0.13, at[2], [0, 0, s * 0.4], 6);
    for (const dz of [-0.04, 0, 0.04]) p.cone(0.018, 0.08, C.gold, at[0] + s * 0.11, at[1] - 0.28, at[2] + dz + 0.04, [Math.PI / 2, 0, 0], 4);
  }
}

/** Rồng luôn bay, mình uốn sóng (đi thì uốn nhanh); đánh thì vươn cổ phun; chân bơi trong mây. */
function poseRong(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  if (a.act === 'dead') {
    const f = a.fall ?? 1;
    b.qNeck.rotation.x = 0.5 * f;
    for (let i = 0; i < DOT; i++) b[`s${i}`].rotation.x = -0.08 * f;
    return;
  }
  const fly = a.act === 'walk';
  const ph = fly ? (a.phase ?? 0) * 0.55 : t * 2;
  const amp = fly ? 0.2 : 0.12;
  for (let i = 0; i < DOT; i++) {
    b[`s${i}`].rotation.y = amp * Math.sin(ph - i * 0.9);
    b[`s${i}`].rotation.x = 0.25 * amp * Math.cos(ph - i * 0.9);
  }
  b.qNeck.rotation.y = -0.5 * amp * Math.sin(ph + 0.9);
  b.qBody.position.y += 0.05 * Math.sin(ph);
  for (const [k, d] of [
    ['qFL', 0],
    ['qFR', Math.PI],
    ['qBL', Math.PI],
    ['qBR', 0],
  ] as const)
    b[k].rotation.x = 0.4 * Math.sin(ph * 1.5 + d);
  if (a.act === 'fight') {
    const e = strikeCurve(a.strike, 0.25, 0.45);
    b.qNeck.rotation.x = -0.35 * e;
    b.qHead.rotation.x = 0.25 * e;
    b.qBody.position.z += 0.1 * e;
  }
}

function rig(defs: Defs, draw: (r: RigBuilder<string>) => void, pose: (b: B, a: Act) => void): THREE.Group {
  const r = new RigBuilder(defs, DETAIL);
  draw(r);
  const { group, bones } = skinRig(r.build());
  const poser: Poser = (a) => pose(bones, a);
  poser({ act: 'stand' });
  group.userData.pose = poser;
  group.userData.fall = 'side';
  return group;
}

/** Độ cao bay của thú bay (ở cỡ mô hình 1). */
const BAY: Partial<Record<ThanThuId, number>> = { thuLac: 1.1, thuRong: 0.9 };

/** Quầng hào quang dáng thần: vòng sáng vàng dưới chân (hay dưới bụng thú bay). */
function haoQuang(): THREE.Mesh {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.78, 28),
    new THREE.MeshBasicMaterial({ color: C.ember, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.renderOrder = 3;
  ring.userData.hao = true;
  return ring;
}

/**
 * Thần thú loại `kind` ở dáng `dang` (0 non, 1 lớn, 2 thần): nhóm ngoài mang tư thế (`userData.pose`), cách ngã
 * (`userData.fall`), độ cao bay (`userData.bay`); mô hình trong phóng theo dáng.
 */
export function makeThanThu(kind: ThanThuId, dang: 0 | 1 | 2): THREE.Group {
  const inner =
    kind === 'thuNgua'
      ? makeNguaSat()
      : kind === 'thuGa'
        ? makeGaCuu()
        : kind === 'thuRua'
          ? makeRuaThan()
          : kind === 'thuLac'
            ? rig(LAC, drawLac, poseLac)
            : rig(RONG, drawRong, poseRong);
  const k = DANG_CO[dang] * (kind === 'thuGa' ? 0.7 : kind === 'thuRua' ? 0.75 : 1);
  inner.scale.setScalar(k);
  const g = new THREE.Group();
  g.add(inner);
  g.userData.pose = inner.userData.pose;
  g.userData.fall = inner.userData.fall;
  if (THAN_THU[kind].bay) g.userData.bay = (BAY[kind] ?? 1) * k;
  if (dang === 2) {
    const hao = haoQuang();
    hao.scale.setScalar(k * (kind === 'thuRong' ? 1.25 : 1.1));
    g.add(hao);
  }
  return g;
}

/** Xoay quầng hào quang dáng thần theo thời gian. */
export function quayHao(g: THREE.Object3D, time: number): void {
  for (const c of g.children) if (c.userData.hao) c.rotation.z = time * 0.8;
}
