// Thần thú (docs/thiet-ke.md mục Kế hoạch: nuôi thần thú): năm thú có khung xương, dùng chung cho trận dã ngoại
// (`battleView.ts`) và kinh đô (`world.ts`: thú đi lại, bay trong thành). Ngựa sắt, Rùa Vàng dùng dáng truyện sẵn có
// (`heroes.ts`, `beasts.ts`); gà chín cựa nặn từ đất nặn gà (`GA_CUU` ở `nanThu.ts`); chim Lạc (`lacBody` ở
// `nanThu.ts`) và rồng (`dragonBody` ở `nanQuai.ts`) nặn liền khối, khung xương và tư thế ở đây.
//
// Ba dáng theo cấp (`dangThu` ở `game/thanThu.ts`): non nhỏ, lớn, thần to hẳn và có hào quang (thú đi đất: quầng sáng
// dưới chân; thú bay: đốm sáng bay quanh mình). Gốc mô hình ở mặt đất dưới thú, đầu hướng +z. Thú bay
// (`THAN_THU[k].bay`) ghi `userData.bay` là độ cao bay (theo cỡ mô hình).

import * as THREE from 'three';
import { THAN_THU, type ThanThuId } from '../game/defs';
import { lerp, strikeCurve } from './body';
import { makeGaCuu, makeRuaThan } from './beasts';
import { makeNguaSat } from './heroes';
import { lacBody } from './nanThu';
import { RONG_MAU, dragonBody } from './nanQuai';
import { C } from './palette';
import { RigBuilder, resetBones, skinRig, type Act, type BoneDef, type Bones, type Poser } from './rig';

type Defs = Record<string, BoneDef<string>>;
type B = Bones<string>;
type V3 = [number, number, number];

/** Cỡ mỗi dáng (non, lớn, thần). */
export const DANG_CO = [0.85, 1.15, 1.5] as const;

/** Độ chi tiết như thú trong trận. */
const DETAIL = 0.75;

// ---------- Chim Lạc ----------

const LAC: Defs = {
  base: { parent: null, at: [0, 0, 0] },
  qBody: { parent: 'base', at: [0, 0.9, 0] },
  qNeck: { parent: 'qBody', at: [0, 1.0, 0.26] },
  qHead: { parent: 'qNeck', at: [0, 1.34, 0.54] },
  qWingL: { parent: 'qBody', at: [-0.14, 1.0, 0.04] },
  qWingR: { parent: 'qBody', at: [0.14, 1.0, 0.04] },
  qWingL2: { parent: 'qWingL', at: [-0.64, 1.0, 0.04] },
  qWingR2: { parent: 'qWingR', at: [0.64, 1.0, 0.04] },
  qTail: { parent: 'qBody', at: [0, 0.92, -0.32] },
};

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
  const amp = fly ? 0.7 : 0.35;
  const flap = Math.sin(ph);
  b.qWingL.rotation.z = -amp * flap;
  b.qWingR.rotation.z = amp * flap;
  // Cánh ngoài theo sau một nhịp, cong mềm như cánh thật.
  b.qWingL2.rotation.z = -0.5 * amp * Math.sin(ph - 0.9);
  b.qWingR2.rotation.z = 0.5 * amp * Math.sin(ph - 0.9);
  b.qBody.position.y -= 0.05 * flap;
  b.qTail.rotation.x = 0.08 * Math.sin(ph + 1);
  b.qNeck.rotation.x = 0.05 * Math.sin(t * 1.4) + 0.04 * flap;
  if (a.act === 'fight') {
    const e = strikeCurve(a.strike, 0.25, 0.45);
    b.qBody.rotation.x = 0.45 * e;
    b.qNeck.rotation.x = 0.35 * e;
    b.qWingL.rotation.z = lerp(b.qWingL.rotation.z, -1.0, e);
    b.qWingR.rotation.z = lerp(b.qWingR.rotation.z, 1.0, e);
  }
}

// ---------- Rồng ----------

/** Các đốt mình rồng từ ngực ra đuôi: (x, y, z, bán kính), uốn sóng lên xuống và hơi ngoằn ngoèo hai bên. */
const RONG_MINH: [number, number, number, number][] = Array.from({ length: 11 }, (_, i) => [
  0.12 * Math.sin(i * 0.7 + 1),
  1.0 + 0.2 * Math.sin(i * 0.9),
  0.3 - i * 0.33,
  0.19 * (1 - i / 12) + 0.025,
]);
const RONG_CO: V3 = [0, 1.25, 0.62];
const RONG_DAU: V3 = [0, 1.42, 0.88];
const RONG_CHAN: V3[] = (() => {
  const [fx, fy, fz] = RONG_MINH[0];
  const [bx, by, bz] = RONG_MINH[3];
  return [
    [fx - 0.13, fy - 0.1, fz + 0.05],
    [fx + 0.13, fy - 0.1, fz + 0.05],
    [bx - 0.11, by - 0.08, bz],
    [bx + 0.11, by - 0.08, bz],
  ];
})();

const RONG: Defs = (() => {
  const d: Defs = { base: { parent: null, at: [0, 0, 0] } };
  RONG_MINH.slice(0, -1).forEach(([x, y, z], i) => (d[`d${i}`] = { parent: i ? `d${i - 1}` : 'base', at: [x, y, z] }));
  d.qNeck = { parent: 'd0', at: [RONG_MINH[0][0], RONG_MINH[0][1] + 0.05, RONG_MINH[0][2] + 0.1] };
  d.qHead = { parent: 'qNeck', at: RONG_CO };
  d.qFL = { parent: 'd0', at: RONG_CHAN[0] };
  d.qFR = { parent: 'd0', at: RONG_CHAN[1] };
  d.qBL = { parent: 'd3', at: RONG_CHAN[2] };
  d.qBR = { parent: 'd3', at: RONG_CHAN[3] };
  return d;
})();

/** Rồng nặn liền khối (`dragonBody`), thêm hai sợi râu vàng dài uốn ra sau và ngọc lửa trên trán. */
function drawRong(r: RigBuilder<string>): void {
  dragonBody(r, { body: RONG_MINH, neck: RONG_CO, head: RONG_DAU, legs: RONG_CHAN });
  const head = r.on('qHead');
  const [hx, hy, hz] = RONG_DAU;
  for (const s of [-1, 1]) {
    // Râu: ba đoạn cong từ mép mõm ra sau.
    let p: V3 = [hx + s * 0.06, hy + 0.0, hz + 0.33];
    for (const [dx, dy, dz] of [
      [0.08, 0.05, -0.06],
      [0.07, 0.08, -0.18],
      [0.03, 0.06, -0.26],
      [0.0, 0.02, -0.24],
    ] as const) {
      const q: V3 = [p[0] + s * dx, p[1] + dy, p[2] + dz];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      const mid: V3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
      const dir = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]).normalize();
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
      head.plain.cyl(0.007, 0.01, len, RONG_MAU.horn, mid[0], mid[1], mid[2], [e.x, e.y, e.z], 4);
      p = q;
    }
  }
  head.glow.sphere(0.035, C.ember, hx, hy + 0.14, hz + 0.12, [1, 1, 1], 8);
}

/** Rồng luôn bay, mình uốn sóng chạy dọc từ ngực ra đuôi (đi thì uốn nhanh); đánh thì vươn cổ phun; chân bơi trong mây. */
function poseRong(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  const n = RONG_MINH.length - 1;
  if (a.act === 'dead') {
    const f = a.fall ?? 1;
    b.qNeck.rotation.x = 0.5 * f;
    for (let i = 0; i < n; i++) b[`d${i}`].rotation.x = 0.05 * f;
    return;
  }
  const fly = a.act === 'walk';
  const ph = fly ? (a.phase ?? 0) * 0.5 : t * 1.8;
  const amp = fly ? 1 : 0.6;
  for (let i = 0; i < n; i++) {
    b[`d${i}`].rotation.x = 0.07 * amp * Math.sin(ph - i * 0.75);
    b[`d${i}`].rotation.y = 0.06 * amp * Math.sin(ph * 0.7 - i * 0.6);
  }
  b.qNeck.rotation.x = -0.12 * amp * Math.sin(ph + 0.6);
  b.qHead.rotation.x = 0.06 * Math.sin(t * 1.3);
  b.d0.position.y += 0.05 * Math.sin(ph);
  for (const [k, d] of [
    ['qFL', 0],
    ['qFR', Math.PI],
    ['qBL', Math.PI],
    ['qBR', 0],
  ] as const)
    b[k].rotation.x = 0.45 * Math.sin(ph * 1.5 + d);
  if (a.act === 'fight') {
    const e = strikeCurve(a.strike, 0.25, 0.45);
    b.qNeck.rotation.x = lerp(b.qNeck.rotation.x, -0.4, e);
    b.qHead.rotation.x = 0.3 * e;
    b.d0.position.z += 0.12 * e;
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

/** Độ cao bay của thú bay (ở cỡ mô hình 1): cao hơn đầu tướng cưỡi voi. */
const BAY: Partial<Record<ThanThuId, number>> = { thuLac: 1.7, thuRong: 1.5 };

/** Cỡ riêng mỗi thú so với dáng (gà, rùa vốn nặn to theo quái nên thu bớt). */
const CO: Record<ThanThuId, number> = { thuLac: 1, thuNgua: 1, thuGa: 0.7, thuRua: 0.85, thuRong: 1 };

/** Màu hào quang dáng thần mỗi thú. */
const HAO: Record<ThanThuId, number> = { thuLac: C.ember, thuNgua: C.fire, thuGa: C.ember, thuRua: C.gold, thuRong: 0x9fe8d0 };

/** Quầng sáng mờ dưới chân thú đi đất dáng thần. */
function quangChan(color: number, r: number): THREE.Mesh {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r * 0.55, r, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.renderOrder = 3;
  ring.userData.hao = 'quang';
  return ring;
}

/** Đốm sáng bay quanh mình thú bay dáng thần. */
function domSang(color: number, r: number, y: number): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.045, 6, 4);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false });
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(geo, mat);
    const a = (i / 7) * Math.PI * 2;
    m.position.set(Math.cos(a) * r, y + 0.25 * Math.sin(a * 3), Math.sin(a) * r);
    m.scale.setScalar(0.6 + 0.4 * ((i * 37) % 5) / 4);
    g.add(m);
  }
  g.userData.hao = 'dom';
  return g;
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
            ? rig(LAC, (r) => lacBody(r), poseLac)
            : rig(RONG, drawRong, poseRong);
  const k = DANG_CO[dang] * CO[kind];
  inner.scale.setScalar(k);
  const g = new THREE.Group();
  g.add(inner);
  g.userData.pose = inner.userData.pose;
  g.userData.fall = inner.userData.fall;
  const bay = THAN_THU[kind].bay;
  if (bay) g.userData.bay = (BAY[kind] ?? 1) * k;
  if (dang === 2) {
    if (bay) g.add(domSang(HAO[kind], (kind === 'thuRong' ? 1.0 : 0.8) * k, 1.0 * k));
    else g.add(quangChan(HAO[kind], 0.9 * k));
  }
  return g;
}

/** Hào quang dáng thần chuyển động theo thời gian: quầng chân xoay, đốm sáng bay vòng. */
export function quayHao(g: THREE.Object3D, time: number): void {
  for (const c of g.children) {
    if (c.userData.hao === 'quang') c.rotation.z = time * 0.8;
    else if (c.userData.hao === 'dom') {
      c.rotation.y = time * 1.4;
      c.position.y = 0.08 * Math.sin(time * 2);
    }
  }
}
