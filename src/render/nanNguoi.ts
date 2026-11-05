// Người nặn liền khối (nan.ts) cho mọi nhân vật hình người: lính, tướng, dân, người cưỡi. Thân, tay, chân một khối
// mượt, uốn ở khớp theo trọng số xương; đầu tròn có má, cằm, mũi, tai; tóc có bề dày và chân tóc; mắt, đốm sáng, má
// hồng, miệng, mày vẽ sắc nét lên mặt. Đồ mặc: áo, tay áo, quần, giày, hình xăm tô thẳng lên thân theo vùng xương;
// khố hay váy dài xếp nếp buông như vải, vạt trước sau, đai, vòng tay, xà cạp, băng đầu, vành mũ đồng, dây chéo, gương
// đồng hộ tâm ôm theo thân; lông chim mũ thuôn như lá, có sống lông; râu, ria nặn riêng. Khung xương và tư thế ở
// body.ts (`humanBody`, `humanHead`, `hairCap`, `headband`, `featherCrown` gọi vào đây).
// Thân gốc và đầu gốc nặn một lần mỗi độ chi tiết; mỗi cách ăn mặc chỉ tô màu lại và may đồ, rồi giữ lại (`figure`).

import * as THREE from 'three';
import { HUMAN, type BodyLook, type FaceLook, type HumanRig } from './body';
import {
  Clay,
  blend,
  clayGeometry,
  cone,
  decal,
  ellipsoid,
  flatBelow,
  hit,
  paintGeometry,
  radiusAt,
  ribbon,
  slab,
  smax,
  sphere,
  wrap,
  type ClayMesh,
  type MeshSpec,
  type Paint,
  type Sdf,
  type V3,
} from './nan';
import { C } from './palette';
import type { RigSlot } from './rig';

const CHEEK = 0xe58a6a;
const MOUTH = 0x8a3b2b;
const EAR = 0xc08458;
/** Tay dang ra chừng này khi đứng nghỉ (`beginPose`), nên nặn tay ở góc ấy cho khỏi dính vào sườn. */
const A_POSE = 0.2;
const smooth = THREE.MathUtils.smoothstep;

/** Một mảnh đã nặn: hình có trọng số, chất liệu, tên xương mà `skinIndex` trỏ tới. */
export interface Piece {
  slot: RigSlot;
  geo: THREE.BufferGeometry;
  bones: string[];
}

const figures = new Map<string, Piece[]>();

/** Một dáng đã nặn ở dạng gửi được qua `postMessage`: worker nặn sẵn (nanSan.ts) gửi về luồng chính. */
export interface FigureData {
  key: string;
  pieces: { slot: RigSlot; bones: string[]; attrs: Record<string, { array: THREE.TypedArray; size: number; normalized: boolean }>; index: Uint16Array | Uint32Array | null }[];
}

const sent = new Set<string>();

/** Các dáng đã nặn mà chưa gửi đi (worker gọi sau mỗi việc). Mảng được chép ra, bộ nhớ đệm của worker vẫn dùng tiếp. */
export function newFigures(): FigureData[] {
  const out: FigureData[] = [];
  for (const [key, pieces] of figures) {
    if (sent.has(key)) continue;
    sent.add(key);
    out.push({
      key,
      pieces: pieces.map((p) => ({
        slot: p.slot,
        bones: p.bones,
        attrs: Object.fromEntries(Object.entries(p.geo.attributes).map(([n, a]) => [n, { array: (a as THREE.BufferAttribute).array.slice(), size: a.itemSize, normalized: a.normalized }])),
        index: p.geo.index ? (p.geo.index.array.slice() as Uint16Array | Uint32Array) : null,
      })),
    });
  }
  return out;
}

/** Nhận các dáng worker đã nặn sẵn: dáng nào luồng chính chưa có thì cất vào bộ nhớ đệm, lúc cần khỏi nặn. */
export function addFigures(list: readonly FigureData[]): void {
  for (const f of list) {
    if (figures.has(f.key)) continue;
    figures.set(
      f.key,
      f.pieces.map((p) => {
        const geo = new THREE.BufferGeometry();
        for (const [n, a] of Object.entries(p.attrs)) geo.setAttribute(n, new THREE.BufferAttribute(a.array, a.size, a.normalized));
        if (p.index) geo.setIndex(new THREE.BufferAttribute(p.index, 1));
        return { slot: p.slot, geo, bones: p.bones };
      }),
    );
  }
}

/** Dựng (lần đầu) hay lấy lại các mảnh của dáng `key`, rồi gắn vào khung xương. */
export function figure(r: HumanRig, key: string, make: (detail: number) => Piece[]): void {
  const k = `${key}@${r.detail}`;
  let pieces = figures.get(k);
  if (!pieces) {
    pieces = make(r.detail);
    figures.set(k, pieces);
  }
  for (const p of pieces) r.skinned(p.slot, p.geo, p.bones);
}

/** Hình gắn cứng vào một xương. */
export function rigid(geo: THREE.BufferGeometry, bone: string, slot: RigSlot = 'plain'): Piece {
  const n = geo.getAttribute('position').count;
  const w = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) w[v * 4] = 1;
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(n * 4), 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(w, 4));
  return { slot, geo, bones: [bone] };
}

/** Khối hình học có sẵn (vòng, đĩa, cầu nhỏ) tô một màu, gắn cứng vào xương. */
export function prim(geo: THREE.BufferGeometry, color: number, bone: string, slot: RigSlot = 'plain'): Piece {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  paintGeometry(g, color);
  return rigid(g, bone, slot);
}

export function clayPiece(mesh: ClayMesh, slot: RigSlot = 'plain'): Piece {
  return { slot, geo: clayGeometry(mesh), bones: mesh.bones };
}

/** Số mặt quanh theo độ chi tiết, chia hết cho 4 cho đối xứng trước sau, trái phải. */
export const segs = (n: number, detail: number, min = 8) => Math.max(min, Math.round((n * detail) / 4) * 4);

export function aPose(bone: 'armL' | 'armR'): THREE.Matrix4 {
  const at = new THREE.Vector3(...HUMAN[bone].at);
  const s = bone === 'armR' ? 1 : -1;
  return new THREE.Matrix4()
    .makeTranslation(at.x, at.y, at.z)
    .multiply(new THREE.Matrix4().makeRotationZ(s * A_POSE))
    .multiply(new THREE.Matrix4().makeTranslation(-at.x, -at.y, -at.z));
}

/** Độ cao một điểm (tư thế nặn) đo dọc cánh tay ở tư thế gốc: tay dang `A_POSE` quanh vai. */
export function armY(s: number, x: number, y: number): number {
  const [sx, sy] = [s * HUMAN.armR.at[0], HUMAN.armR.at[1]];
  const a = -s * A_POSE;
  return sy + Math.sin(a) * (x - sx) + Math.cos(a) * (y - sy);
}

// ---------- Thân gốc ----------

const SKIRT_TOP = 0.418;
const SKIRT_HEM = 0.19;
/** Gấu váy dài (quá gối, gần mắt cá). */
const ROBE_HEM = 0.085;

export type SkirtFit = (theta: number, u: number) => number;

/**
 * Bán kính khố (hay váy dài) theo góc `theta` (0 sang phải, π/2 ra trước) và `u` (0 ở cạp, 1 ở gấu). Vải buông: dò
 * mặt hông, đùi (`hip`, không gồm tay buông bên hông), ở mỗi góc lấy chỗ rộng nhất từ cạp xuống tới đó cho vải không
 * bó vào giữa hai đùi, nới ra một chút, nở dần (`flare`) xuống gấu, xếp nếp.
 */
function skirtFit(hip: Sdf, hem: number, flare: number): SkirtFit {
  const STEPS = 16;
  const memo = new Map<number, number[]>();
  return (theta, u) => {
    let prof = memo.get(theta);
    if (!prof) {
      prof = [];
      let m = 0;
      for (let i = 0; i <= STEPS; i++) {
        const y = SKIRT_TOP + (hem - SKIRT_TOP) * (i / STEPS);
        m = Math.max(m, radiusAt(hip, [0, y, 0], [Math.cos(theta), 0, Math.sin(theta)], 0.3));
        prof.push(m);
      }
      memo.set(theta, prof);
    }
    const k = THREE.MathUtils.clamp(u, 0, 1);
    return prof[Math.round(k * STEPS)] + 0.01 + flare * k + 0.0035 * Math.sin(12 * theta) * k;
  };
}

export interface BodyBase {
  clay: Clay;
  spec: MeshSpec;
  /** Cả thân, ở tư thế nặn. */
  f: Sdf;
  /** Ngực và hông (không tay): đo đai lưng, áo. */
  torso: Sdf;
  /** Khố ngắn, váy dài. */
  short: SkirtFit;
  long: SkirtFit;
  /** Vùng của từng phần thân (âm là phần ấy gần nhất): tô áo, tay áo, quần không lem sang phần bên cạnh. */
  zone: Record<'arms' | 'legs' | 'torso', Sdf>;
}

const bases = new Map<string, BodyBase>();
/** Dáng thân của người vẽ gần nhất trên mỗi khung (đồ mặc nặn sau đo theo thân ấy). */
const looks = new WeakMap<HumanRig, BodyLook>();

/** Thân gốc mà người trên khung `r` đang dùng (xem `nanBody`). */
export function bodyOf(r: HumanRig): BodyBase {
  return bodyBase(r.detail, looks.get(r)?.build);
}

/** Đồ mặc của người vẽ gần nhất trên khung `r`. */
export function lookOf(r: HumanRig): BodyLook | undefined {
  return looks.get(r);
}

/** Bán kính khố (hay váy dài) của người trên khung `r` (xem `skirtFit`), và gấu ở đâu. */
export function skirtOf(r: HumanRig): { fit: SkirtFit; top: number; hem: number } {
  const base = bodyOf(r);
  const long = !!looks.get(r)?.long;
  return { fit: long ? base.long : base.short, top: SKIRT_TOP, hem: long ? ROBE_HEM : SKIRT_HEM };
}

/** Thân, tay, chân nặn liền (da trần), mỗi độ chi tiết, mỗi dáng một lần. `belly`: bụng phệ (quan Hán). */
export function bodyBase(detail: number, build?: BodyLook['build']): BodyBase {
  const key = `${detail}:${build ?? ''}`;
  const got = bases.get(key);
  if (got) return got;
  const clay = new Clay(C.skin, { armL: aPose('armL'), armR: aPose('armR') });
  // Ngực nở, bụng thon, ngực trước hơi nổi.
  clay.add('chest', ellipsoid([0, 0.507, -0.004], [0.116, 0.078, 0.082]), { k: 0, apart: 'torso' });
  clay.add('chest', ellipsoid([0, 0.448, 0.002], [0.095, 0.068, 0.076]), { k: 0.05, apart: 'torso' });
  for (const s of [-1, 1]) clay.add('chest', ellipsoid([s * 0.047, 0.517, 0.04], [0.05, 0.036, 0.036], [0, 0, s * 0.25]), { k: 0.03, apart: 'torso' });
  // Cầu vai: trọng số pha dần từ ngực sang cánh tay.
  for (const [arm, s] of [
    ['armL', -1],
    ['armR', 1],
  ] as const) {
    clay.add('chest', cone([s * 0.03, 0.562, -0.006], [s * 0.118, 0.548, 0], 0.046, 0.046), {
      k: 0.04,
      to: { bone: arm, a: [s * 0.075, 0.555, 0], b: [s * 0.13, 0.545, 0] },
    });
  }
  // Cổ: pha sang đầu ở trên.
  clay.add('chest', cone([0, 0.545, -0.01], [0, 0.645, 0], 0.047, 0.041), { k: 0.035, to: { bone: 'head', a: [0, 0.585, 0], b: [0, 0.63, 0] } });
  // Eo pha sang ngực, hông, mông.
  clay.add('hips', ellipsoid([0, 0.392, 0], [0.093, 0.05, 0.072]), { k: 0.04, to: { bone: 'chest', a: [0, 0.4, 0], b: [0, 0.46, 0] } });
  if (build === 'belly') clay.add('hips', ellipsoid([0, 0.39, 0.04], [0.118, 0.1, 0.105]), { k: 0.05, to: { bone: 'chest', a: [0, 0.42, 0], b: [0, 0.48, 0] } });
  clay.add('hips', ellipsoid([0, 0.305, -0.004], [0.104, 0.085, 0.08]), { k: 0.04 });
  for (const s of [-1, 1]) clay.add('hips', ellipsoid([s * 0.045, 0.28, -0.04], [0.055, 0.055, 0.048]), { k: 0.03 });
  // Chân: đùi, gối, bắp chân, cổ chân, bàn chân bẹt có gót.
  for (const [leg, s] of [
    ['legL', -1],
    ['legR', 1],
  ] as const) {
    const x = s * 0.066;
    const o = { apart: leg };
    clay.add(leg, cone([s * 0.062, 0.275, 0], [x, 0.135, 0.006], 0.051, 0.039), { ...o, k: 0.035, near: { c: [x, 0.28, 0], r: 0.05, fade: 0.03 } });
    clay.add(leg, sphere([x, 0.128, 0.012], 0.036), { ...o, k: 0.025 });
    clay.add(leg, cone([x, 0.13, 0.004], [x, 0.045, -0.004], 0.037, 0.026), { ...o, k: 0.02 });
    clay.add(leg, ellipsoid([x, 0.098, -0.014], [0.032, 0.04, 0.03]), { ...o, k: 0.03 });
    const foot = blend(0.03, ellipsoid([x, 0.026, 0.022], [0.033, 0.028, 0.06]), ellipsoid([x, 0.02, 0.058], [0.036, 0.02, 0.034]), sphere([x, 0.028, -0.012], 0.026));
    clay.add(leg, flatBelow(foot, 0), { ...o, k: 0.025 });
  }
  // Tay (nặn ở tư thế dang): bắp vai, bắp tay, khuỷu, cẳng tay, nắm tay có ngón cái.
  for (const [arm, s] of [
    ['armL', -1],
    ['armR', 1],
  ] as const) {
    const x = s * 0.135;
    const shoulder = { c: [s * 0.12, 0.54, 0] as V3, r: 0.05, fade: 0.03 };
    const o = { apart: arm, w: 0.014 };
    clay.add(arm, ellipsoid([s * 0.142, 0.522, 0], [0.048, 0.058, 0.05]), { ...o, k: 0.03, near: shoulder, w: 0.02 });
    clay.add(arm, cone([s * 0.138, 0.515, 0], [x, 0.418, -0.006], 0.039, 0.031), { ...o, k: 0.025, near: shoulder });
    clay.add(arm, cone([x, 0.418, -0.006], [x, 0.335, 0.004], 0.033, 0.027), { ...o, k: 0.02 });
    clay.add(arm, ellipsoid([x, 0.392, 0], [0.034, 0.04, 0.033]), { ...o, k: 0.025 });
    clay.add(arm, ellipsoid([x, 0.3, 0.004], [0.035, 0.042, 0.039]), { ...o, k: 0.02 });
    clay.add(arm, ellipsoid([x - s * 0.017, 0.313, 0.03], [0.015, 0.021, 0.016]), { ...o, k: 0.012 });
  }
  // Phần hông khuất trong khố: bỏ cho nhẹ.
  clay.hide('hips', ellipsoid([0, 0.31, 0], [0.135, 0.085, 0.115]));
  const spec: MeshSpec = { kind: 'nets', min: [-0.25, -0.02, -0.12], max: [0.25, 0.67, 0.13], cell: 0.0145 / detail, target: Math.round(2000 * detail) };
  const hip = clay.only(['hips', 'legL', 'legR']);
  const zone = (mine: string[]) => {
    const own = clay.only(mine);
    const rest = clay.only(['chest', 'hips', 'legL', 'legR', 'armL', 'armR'].filter((b) => !mine.includes(b)));
    return (x: number, y: number, z: number) => own(x, y, z) - rest(x, y, z);
  };
  const base: BodyBase = {
    clay,
    spec,
    f: clay.dist,
    torso: clay.only(['chest', 'hips']),
    short: skirtFit(hip, SKIRT_HEM, 0.014),
    long: skirtFit(hip, ROBE_HEM, 0.05),
    zone: { arms: zone(['armL', 'armR']), legs: zone(['legL', 'legR']), torso: zone(['chest', 'hips']) },
  };
  bases.set(key, base);
  return base;
}

/** Lớp màu đồ mặc tô lên thân: quần, giày, áo (cổ chữ V, vai áo che bắp vai), tay áo, hình xăm sông nước. */
function clothes(base: BodyBase, look: BodyLook): Paint[] {
  const { clay, zone } = base;
  const out: Paint[] = [];
  const layer = (f: Sdf, color: number, fine = 0) => out.push(clay.layer('hips', f, color, fine));
  const legs = look.legs ?? C.skin;
  if (legs !== C.skin) {
    layer(zone.legs, legs);
    // Giày vải đen.
    layer((x, y, z) => Math.max(zone.legs(x, y, z), y - 0.048), C.ink);
  }
  const armAbove = (y0: number): Sdf => (x, y, z) => Math.max(zone.arms(x, y, z), y0 - armY(Math.sign(x) || 1, x, y));
  if (look.top !== undefined) {
    const top = look.top;
    // Cổ áo: tròn sau gáy, khoét chữ V trước ngực.
    const neck = (x: number, z: number) => 0.566 - (z > 0 ? 0.055 * Math.max(0, 1 - Math.abs(x) / 0.05) * smooth(z, 0.02, 0.08) : 0);
    layer((x, y, z) => Math.max(zone.torso(x, y, z), y - neck(x, z), 0.36 - y), top);
    if (look.collar !== undefined) layer((x, y, z) => Math.max(zone.torso(x, y, z), Math.abs(y + 0.012 - neck(x, z)) - 0.013), look.collar, 1);
    // Vai áo phủ bắp vai.
    layer(armAbove(0.49), look.sleeves ?? top);
  }
  if (look.sleeves !== undefined) layer(armAbove(0.35), look.sleeves);
  if (look.tattoo) {
    // Hình xăm: sóng nước chạy quanh ngực, bắp tay, bắp chân.
    const wave = (y0: number, amp: number, freq: number, w: number): Sdf => (x, y, z) => Math.abs(y - y0 - amp * Math.sin(freq * Math.atan2(z, x))) - w;
    layer((x, y, z) => Math.max(zone.torso(x, y, z), Math.min(wave(0.5, 0.014, 6, 0.006)(x, y, z), wave(0.465, 0.012, 6, 0.005)(x, y, z))), C.ink, 1);
    layer((x, y, z) => Math.max(zone.arms(x, y, z), Math.abs(armY(Math.sign(x) || 1, x, y) - 0.47 - 0.01 * Math.sin(40 * z)) - 0.006), C.ink, 1);
    layer((x, y, z) => Math.max(zone.legs(x, y, z), Math.abs(y - 0.1 - 0.012 * Math.sin(50 * (z + Math.abs(x)))) - 0.006), C.ink, 1);
  }
  return out;
}

/** Thân mặc đồ: thân nặn tô áo quần; khố hay váy dài, vạt khố, đai, vòng tay, cổ tay áo, xà cạp, dây chéo, gương đồng. */
function sculptBody(look: BodyLook, detail: number): Piece[] {
  const base = bodyBase(detail, look.build);
  const { f } = base;
  const pieces: Piece[] = [clayPiece(base.clay.build(base.spec, clothes(base, look)))];

  // Khố (hay váy dài) có dải hoa văn, xếp nếp, nở dần xuống gấu; vạt trước, vạt sau buông dài.
  const fit = look.long ? base.long : base.short;
  const hem = look.long ? ROBE_HEM : SKIRT_HEM;
  const cloth = look.cloth;
  const skirt = wrap(
    f,
    {
      a: [0, SKIRT_TOP, 0],
      b: [0, hem, 0],
      t0: 0,
      t1: 1,
      seg: segs(32, detail),
      rings: Math.max(2, Math.round((look.long ? 4 : 3) * detail)),
      rmax: 0.3,
      lip: 0.01,
      uvRepeat: look.pattern === false ? undefined : 1,
      // Váy dài: hoa văn chỉ ở dải trên, phần dưới trơn.
      vEnd: look.long ? 0.55 : undefined,
      radius: (_rs, th, t) => fit(th, t),
      colorAt: look.hem === undefined ? undefined : (_th, u) => (u > 0.86 ? look.hem : undefined),
    },
    cloth,
  );
  pieces.push(rigid(skirt, 'hips', look.pattern === false ? 'plain' : 'band'));
  if (look.flaps ?? !look.long) {
    // Vạt khố: tấm vải có bề dày buông từ trong gấu xuống, hơi chếch ra cho chân bước không xuyên qua.
    for (const [front, len] of [
      [1, look.long ? 0.06 : 0.115],
      [-1, look.long ? 0.05 : 0.095],
    ] as const) {
      const mid = front > 0 ? Math.PI / 2 : -Math.PI / 2;
      const half = 0.06 / 0.14;
      const P = (u: number, v: number): V3 => {
        const th = mid + (u - 0.5) * 2 * half;
        const y = hem + 0.03 - v * len;
        const r = fit(th, 1) - 0.004 + v * 0.02 + 0.006 * Math.sin(u * Math.PI);
        // Gấu vạt hơi tròn.
        const yy = y + v * v * 0.012 * (1 - Math.sin(u * Math.PI));
        return [Math.cos(th) * r, yy, Math.sin(th) * r];
      };
      const inward = (u: number): V3 => {
        const th = mid + (u - 0.5) * 2 * half;
        return [-Math.cos(th), 0, -Math.sin(th)];
      };
      pieces.push(rigid(slab(P, inward, Math.max(2, Math.round(4 * detail)), 3, 0.01, cloth), 'hips'));
    }
  }
  // Đai lưng ôm eo, đè lên cạp khố; đo trên thân, không tính tay buông bên hông.
  pieces.push(
    rigid(
      wrap(
        base.torso,
        { a: [0, 0.432, 0], b: [0, 0.382, 0], t0: 0, t1: 1, seg: segs(24, detail), rings: 1, rmax: 0.25, lip: 0.008, radius: (rs, th) => Math.max(rs, fit(th, 0)) + 0.009 },
        look.belt ?? C.bronze,
      ),
      'hips',
    ),
  );
  // Vòng tay ở bắp tay, bao cổ tay; cổ tay áo loe.
  for (const [arm, s] of [
    ['armL', -1],
    ['armR', 1],
  ] as const) {
    const x = s * 0.135;
    const fa = base.clay.field(arm);
    const ring = (y0: number, y1: number, color: number, grow = 0.006, lip = 0.006) =>
      rigid(wrap(fa, { a: [x, y0, 0], b: [x, y1, 0], t0: 0, t1: 1, seg: segs(12, detail), rings: 1, rmax: 0.06, lip, radius: (rs, _th, t) => rs + grow + (y1 < y0 ? 0 : 0.004 * t) }, color), arm);
    if (look.sleeves !== undefined && look.wideSleeves) {
      // Tay áo rộng loe dần xuống cổ tay.
      pieces.push(
        rigid(
          wrap(
            fa,
            {
              a: [x, 0.5, 0],
              b: [x, 0.33, 0],
              t0: 0,
              t1: 1,
              seg: segs(14, detail),
              rings: Math.max(3, Math.round(4 * detail)),
              rmax: 0.08,
              lip: 0.008,
              radius: (rs, _th, t) => rs + 0.004 + 0.045 * t * t,
              colorAt: look.cuff === undefined ? undefined : (_th, u) => (u > 0.8 ? look.cuff : undefined),
            },
            look.sleeves,
          ),
          arm,
        ),
      );
    } else if (look.sleeves !== undefined) pieces.push(ring(0.375, 0.345, look.cuff ?? look.sleeves, 0.005, 0.005));
    if (look.bracer) {
      // Hộ uyển: ống giáp ôm cẳng tay, hai đầu viền.
      pieces.push(ring(0.425, 0.335, look.bracer, 0.009));
      if (look.bracerTrim) for (const y of [0.425, 0.345]) pieces.push(ring(y, y - 0.016, look.bracerTrim, 0.013));
    }
    if (look.armband) pieces.push(ring(0.488, 0.458, look.armband));
    if (look.wristband) pieces.push(ring(0.372, 0.33, look.wristband, 0.007));
  }
  // Hộ gối: chỏm tròn trước gối.
  if (look.knee !== undefined) {
    for (const [leg, s] of [
      ['legL', -1],
      ['legR', 1],
    ] as const) {
      const c = hit(f, [s * 0.066, 0.165, 0.4], [0, 0, -1]) ?? [s * 0.066, 0.165, 0.04];
      const g = new THREE.SphereGeometry(0.04, segs(10, detail, 8), segs(8, detail, 6));
      g.scale(1, 0.95, 0.6);
      g.translate(c[0], c[1], c[2] + 0.006);
      pieces.push(prim(g, look.knee, leg));
    }
  }
  // Xà cạp: ôm ống chân, loe ở trên, có dải hoa văn dưới gối.
  if (look.greaves) {
    for (const [leg, s] of [
      ['legL', -1],
      ['legR', 1],
    ] as const) {
      const x = s * 0.066;
      pieces.push(
        rigid(
          wrap(f, { a: [x, 0.048, 0], b: [x, 0.13, 0.004], t0: 0, t1: 1, seg: segs(14, detail), rings: 3, rmax: 0.07, lip: 0.006, radius: (rs, _th, t) => rs + 0.006 + 0.006 * t }, look.greaves),
          leg,
        ),
      );
      pieces.push(
        rigid(
          wrap(f, { a: [x, 0.112, 0.002], b: [x, 0.136, 0.004], t0: 0, t1: 1, seg: segs(14, detail), rings: 1, rmax: 0.07, lip: 0.005, uvRepeat: 1, radius: (rs) => rs + 0.014 }, look.greaves),
          leg,
          'band',
        ),
      );
      if (look.greavesTrim !== undefined)
        pieces.push(rigid(wrap(f, { a: [x, 0.044, -0.002], b: [x, 0.07, 0], t0: 0, t1: 1, seg: segs(14, detail), rings: 1, rmax: 0.07, lip: 0.005, radius: (rs) => rs + 0.014 }, look.greavesTrim), leg));
    }
  }
  // Dây da bắt chéo trước ngực, vắt qua vai ra sau lưng.
  if (look.crossStrap) {
    for (const s of [-1, 1]) {
      const path: V3[] = [
        [s * 0.08, 0.55, -0.08],
        [s * 0.072, 0.592, -0.01],
        [s * 0.05, 0.565, 0.07],
        [0, 0.495, 0.1],
        [-s * 0.055, 0.432, 0.08],
        [-s * 0.085, 0.41, 0.04],
      ];
      pieces.push(rigid(ribbon(f, path, 0.024, 0.005, look.crossStrap, segs(14, detail)), 'chest'));
    }
  }
  // Gương đồng hộ tâm: mặt trống đồng ôm theo ngực, vành sẫm, núm giữa.
  if (look.drumPlate || look.plate) {
    const c = hit(f, [0, 0.495, 0.4], [0, 0, -1]) ?? [0, 0.495, 0.1];
    const seg = segs(20, detail, 12);
    if (look.drumPlate) {
      pieces.push(rigid(decal(f, c, { r: 0.062, lift: 0.012, seg, rings: detail >= 1 ? 2 : 1 }, C.bronzeLight), 'chest', 'drum'));
      pieces.push(rigid(decal(f, c, { r: 0.074, r0: 0.06, lift: 0.009, seg, rings: 1 }, C.bronzeDark), 'chest'));
      const boss = new THREE.SphereGeometry(0.02, 8, 4);
      boss.scale(1, 1, 0.55);
      boss.translate(c[0], c[1], c[2] + 0.014);
      pieces.push(prim(boss, C.bronzeLight, 'chest'));
    } else if (look.plate) {
      pieces.push(rigid(decal(f, c, { r: 0.05, lift: 0.01, seg, rings: 2 }, look.plate), 'chest'));
    }
  }
  return pieces;
}

/** Thân người nặn mặc đồ `look` (thay khối trụ, cầu ghép cũ của `humanBody`). */
export function nanBody(r: HumanRig, look: BodyLook): void {
  looks.set(r, look);
  figure(r, `body:${JSON.stringify(look)}`, (detail) => sculptBody(look, detail));
}

// ---------- Đầu ----------

/** Chân tóc theo góc quanh đầu (0 ở trước mặt): trán cao, vòng trên tai, thấp dần xuống gáy. */
function hairline(x: number, z: number): number {
  const a = Math.abs(Math.atan2(x, z));
  return 0.842 - 0.05 * smooth(a, 0.35, 1.45) - 0.16 * smooth(a, 1.85, 2.9);
}

export interface HeadBase {
  clay: Clay;
  /** Vùng tóc (âm là tóc), để tô màu tóc. */
  hair: Sdf | null;
  f: Sdf;
}

const heads = new Map<string, HeadBase>();

/** Đầu to tròn: sọ, mặt bầu, má phúng phính, cằm, mũi nhỏ; có tóc thì tóc dày có chân tóc. Mỗi kiểu một lần. */
export function headBase(withHair: boolean): HeadBase {
  const key = withHair ? 'hair' : 'bald';
  const got = heads.get(key);
  if (got) return got;
  const clay = new Clay(C.skin);
  clay.add('head', ellipsoid([0, 0.776, -0.012], [0.2, 0.188, 0.19]), { k: 0 });
  clay.add('head', ellipsoid([0, 0.704, 0.028], [0.162, 0.122, 0.15]), { k: 0.08 });
  clay.add('head', ellipsoid([0, 0.645, 0.08], [0.07, 0.045, 0.06]), { k: 0.05 });
  for (const s of [-1, 1]) clay.add('head', ellipsoid([s * 0.092, 0.698, 0.1], [0.062, 0.05, 0.05]), { k: 0.05 });
  clay.add('head', ellipsoid([0, 0.718, 0.19], [0.02, 0.022, 0.018]), { k: 0.03 });
  let hair: Sdf | null = null;
  if (withHair) {
    // Tóc: lớp dày phủ sọ, cắt theo chân tóc.
    const cap = ellipsoid([0, 0.8, -0.028], [0.214, 0.19, 0.214]);
    const h: Sdf = (x, y, z) => smax(cap(x, y, z), hairline(x, z) - y, 0.014);
    clay.add('head', h, { k: 0.012 });
    hair = (x, y, z) => h(x, y, z) - 0.004;
  }
  const base: HeadBase = { clay, hair, f: clay.dist };
  heads.set(key, base);
  return base;
}

/** Mặt vẽ lên đúng chỗ trên mặt cong: mắt có đốm sáng, má hồng, mày, miệng. */
function facePaints(base: HeadBase, face: FaceLook, detail: number): Paint[] {
  const { clay, f } = base;
  const out: Paint[] = [];
  const on = (x: number, y: number): V3 => hit(f, [x, y, 0.5], [0, 0, -1]) ?? [x, y, 0.18];
  const blush = face.blush ?? !face.brows;
  // Nét nhỏ chia tam giác mịn hơn cho tròn; lính đông thì bớt một bậc.
  const fine = detail >= 1 ? 2 : 1;
  for (const s of [-1, 1]) {
    out.push(clay.layer('head', ellipsoid(on(s * 0.072, 0.744), [0.03, 0.043, 0.03]), C.ink, fine));
    if (blush) {
      out.push(clay.layer('head', sphere(on(s * 0.062, 0.764), 0.0125), C.cream, fine));
      out.push(clay.layer('head', ellipsoid(on(s * 0.114, 0.697), [0.031, 0.017, 0.03]), CHEEK, fine - 1));
    }
    if (face.brows) out.push(clay.layer('head', ellipsoid(on(s * 0.078, 0.8), [0.042, 0.012, 0.03], [0, 0, -s * 0.32]), face.browColor ?? C.ink, fine));
    if (face.femBrows) {
      // Mày cong mảnh: vành cung trên mắt.
      const c = on(s * 0.074, 0.79);
      out.push(clay.layer('head', (x, y, z) => Math.max(Math.abs(Math.hypot(x - c[0], (y - c[1] + 0.03) * 1.6) - 0.05) - 0.0055, Math.abs(z - c[2]) - 0.04, c[1] - 0.012 - y), face.browColor ?? C.ink, fine));
    }
  }
  if (face.lips !== undefined) out.push(clay.layer('head', ellipsoid(on(0, 0.664), [0.024, 0.009, 0.03]), face.lips, fine));
  else out.push(clay.layer('head', ellipsoid(on(0, 0.663), [0.019, 0.006, 0.03]), MOUTH, fine));
  return out;
}

/**
 * Tai: vành tròn dẹt áp vào bên đầu, lòng tai sẫm hơn. Làm mảnh riêng có viền mực, vì nặn liền vào đầu thì tai chìm
 * mất khi nhìn nghiêng (lưới quanh đầu thưa).
 */
function earGeometry(side: number, detail: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, segs(10, detail, 8), segs(8, detail, 6));
  g.deleteAttribute('uv');
  const p = g.getAttribute('position');
  const col = new Float32Array(p.count * 3);
  const skin = new THREE.Color(C.skin);
  const inner = new THREE.Color(EAR);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    // Lòng tai: phần ngoài cùng, quanh giữa.
    const t = smooth(side * p.getX(i), 0.55, 0.9) * (1 - smooth(Math.hypot(p.getY(i), p.getZ(i)), 0.35, 0.6));
    c.copy(skin).lerp(inner, t).toArray(col, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.scale(0.02, 0.042, 0.03);
  g.rotateY(side * 0.35);
  g.translate(side * 0.196, 0.733, -0.012);
  const out = g.toNonIndexed();
  g.dispose();
  return out;
}

/** Ria mép: hai túm thuôn từ dưới mũi rủ xuống hai bên khóe miệng. */
function mustachePiece(color: number, detail: number): Piece {
  const clay = new Clay(color);
  for (const s of [-1, 1]) {
    clay.add('head', cone([s * 0.008, 0.684, 0.19], [s * 0.062, 0.664, 0.168], 0.016, 0.007), { k: 0.01 });
    clay.add('head', cone([s * 0.062, 0.664, 0.168], [s * 0.078, 0.636, 0.15], 0.007, 0.003), { k: 0.008 });
  }
  return clayPiece(clay.build({ kind: 'nets', min: [-0.1, 0.62, 0.13], max: [0.1, 0.71, 0.215], cell: 0.006 / detail, target: Math.round(160 * detail) }));
}

/** Râu cằm: chòm dày ôm cằm, thuôn nhọn rủ xuống trước ngực (`len` dài bao nhiêu, `split` chẻ hai chòm). */
function beardPiece(color: number, detail: number, len: number, split: boolean): Piece {
  const clay = new Clay(color);
  clay.add('head', ellipsoid([0, 0.636, 0.12], [0.085, 0.045, 0.06]), { k: 0 });
  for (const s of split ? [-1, 1] : [0]) {
    const tip: V3 = [s * 0.04, 0.636 - len, 0.17 + len * 0.18];
    clay.add('head', cone([s * 0.02, 0.63, 0.14], tip, 0.06, 0.008), { k: 0.03 });
  }
  // Chừa chỗ miệng.
  clay.sub('head', ellipsoid([0, 0.664, 0.19], [0.035, 0.016, 0.04]), 0.008);
  const lo = 0.6 - len;
  return clayPiece(clay.build({ kind: 'nets', min: [-0.12, lo, 0.04], max: [0.12, 0.7, 0.23 + len * 0.2], cell: 0.008 / detail, target: Math.round(260 * detail) }));
}

/** Băng vải buộc đầu (ngay trên tai). */
function headbandPiece(f: Sdf, color: number, detail: number, h: number): Piece {
  const y0 = 0.805 - 0.325 * h;
  const y1 = 0.805 + 0.325 * h;
  return rigid(
    wrap(f, { a: [0, 0.76, -0.02], b: [0, 0.9, -0.02], t0: (y0 - 0.76) / 0.14, t1: (y1 - 0.76) / 0.14, seg: segs(24, detail), rings: 1, rmax: 0.34, lip: 0.007, radius: (rs) => rs + 0.007 }, color),
    'head',
  );
}

// ---------- Mũ lông chim ----------

/**
 * Một chiếc lông: thuôn như lá, gốc nhỏ, phình ở hai phần ba rồi tròn về ngọn, có sống nổi hai mặt, cong ra sau.
 * `o` gốc, `d` hướng mọc, `w` hướng bề ngang, `n` hướng mặt trước.
 */
export function feather(o: V3, d: THREE.Vector3, w: THREE.Vector3, n: THREE.Vector3, len: number, width: number, color: number, detail: number): THREE.BufferGeometry {
  const rows = Math.max(4, Math.round(7 * detail));
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const base = new THREE.Color(color);
  const rib = base.clone().multiplyScalar(0.82);
  const p = new THREE.Vector3();
  for (const face of [1, -1]) {
    const start = pos.length / 3;
    for (let i = 0; i <= rows; i++) {
      const s = i / rows;
      const half = (width / 2) * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(s, 1.15))), 0.35);
      const th = (0.01 * (1 - s) + 0.004) * face;
      // Sống lông cong nhẹ ra sau (ngược mặt trước); cong nhiều thì nhìn từ sau lưng chỉ thấy cạnh lông.
      const bend = -0.08 * len * s * s;
      for (const c of [-1, 0, 1]) {
        p.set(...o)
          .addScaledVector(d, len * s)
          .addScaledVector(n, bend + (c === 0 ? th : 0))
          .addScaledVector(w, c * half);
        pos.push(p.x, p.y, p.z);
        const k = c === 0 ? rib : base;
        col.push(k.r, k.g, k.b);
      }
    }
    for (let i = 0; i < rows; i++)
      for (let c = 0; c < 2; c++) {
        const a = start + i * 3 + c;
        const b = a + 3;
        if (face > 0) idx.push(a, a + 1, b + 1, a, b + 1, b);
        else idx.push(a, b + 1, a + 1, a, b, b + 1);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  // Chiều quay: mặt trước theo `n`.
  const pa = new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), idx[0]);
  const pb = new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), idx[1]);
  const pc = new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), idx[2]);
  if (pb.sub(pa).cross(pc.sub(pa)).dot(n) < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
  }
  g.computeVertexNormals();
  const out = g.toNonIndexed();
  g.dispose();
  return out;
}

export interface CrownOpts {
  count?: number;
  len?: number;
  spread?: number;
  bronzeRim?: boolean;
  rim?: number;
  tier2?: boolean;
  /** Gốc lông (mặc định cắm trên đỉnh tóc, hơi lùi sau) và độ ngả ra sau, bề ngang lá lông. */
  y?: number;
  z?: number;
  tilt?: number;
  width?: number;
}

/** Mũ lông chim xòe quạt ngả ra sau, cắm vào vành mũ đồng có hoa văn. */
export function crownPieces(f: Sdf, colors: readonly number[], opts: CrownOpts, detail: number): Piece[] {
  const out: Piece[] = [];
  if (opts.bronzeRim) {
    const seg = segs(28, detail, 16);
    // Vành sẫm sát dưới, vành đồng hoa văn loe dần lên trên.
    out.push(rigid(wrap(f, { a: [0, 0.76, -0.025], b: [0, 0.9, -0.025], t0: (0.814 - 0.76) / 0.14, t1: (0.826 - 0.76) / 0.14, seg, rings: 1, rmax: 0.34, lip: 0.006, radius: (rs) => rs + 0.014 }, C.bronzeDark), 'head'));
    out.push(
      rigid(
        wrap(
          f,
          {
            a: [0, 0.76, -0.025],
            b: [0, 0.9, -0.025],
            t0: (0.822 - 0.76) / 0.14,
            t1: (0.868 - 0.76) / 0.14,
            seg,
            rings: 2,
            rmax: 0.34,
            lip: 0.01,
            uvRepeat: 4 / 3,
            radius: (rs, _th, t) => rs + 0.011 + 0.03 * Math.max(0, t - (0.822 - 0.76) / 0.14),
          },
          opts.rim ?? C.bronze,
        ),
        'head',
        'band',
      ),
    );
  }
  const row = (n: number, len0: number, tilt: number, origin: V3, width: number, shift: number) => {
    const half = (n - 1) / 2;
    for (let k = 0; k < n; k++) {
      const i = k - half;
      const a = i * (opts.spread ?? 0.27);
      const len = len0 - Math.abs(i) * 0.02;
      const d = new THREE.Vector3(Math.sin(a), Math.cos(a) * Math.cos(tilt), Math.cos(a) * Math.sin(tilt));
      const w = new THREE.Vector3(Math.cos(a), -Math.sin(a) * Math.cos(tilt), -Math.sin(a) * Math.sin(tilt));
      const nrm = new THREE.Vector3().crossVectors(w, d).normalize();
      if (nrm.z < 0) nrm.negate();
      const o: V3 = [origin[0] + d.x * 0.05, origin[1] + d.y * 0.05, origin[2] + d.z * 0.05];
      const color = colors[(Math.abs(Math.round(i)) + shift) % colors.length];
      out.push(rigid(feather(o, d, w, nrm, len, width, color, detail), 'head'));
    }
  };
  const n = opts.count ?? 7;
  // Ngả ra sau vừa phải: ngả nhiều thì quân đi lên (camera sau lưng) chỉ thấy lông ngắn cũn.
  const tilt = opts.tilt ?? -0.2;
  const y = opts.y ?? 0.925;
  const z = opts.z ?? -0.1;
  const width = opts.width ?? 0.08;
  row(n, opts.len ?? 0.36, tilt, [0, y, z], width, 0);
  if (opts.tier2) row(Math.max(3, n - 2), (opts.len ?? 0.36) * 0.62, tilt + 0.14, [0, y + 0.01, z + 0.03], width * 0.85, 1);
  return out;
}

// ---------- Ghép đầu ----------

/** Những gì vẽ trên đầu một người, gom lại rồi nặn một lần lúc dựng xong khung (`RigBuilder.defer`). */
interface HeadPlan {
  face: FaceLook;
  hair?: number;
  bands: { color: number; h: number }[];
  crowns: { colors: readonly number[]; opts: CrownOpts }[];
}

const plans = new WeakMap<HumanRig, HeadPlan>();

function sculptHead(plan: HeadPlan, detail: number): Piece[] {
  const base = headBase(plan.hair !== undefined);
  const paints = facePaints(base, plan.face, detail);
  if (base.hair && plan.hair !== undefined) paints.unshift(base.clay.layer('head', base.hair, plan.hair));
  const mesh = base.clay.build({ kind: 'radial', c: [0, 0.75, 0], detail: Math.max(3, Math.round(5 * detail)), rmax: 0.34, front: 0.35 }, paints);
  const out: Piece[] = [clayPiece(mesh), ...[-1, 1].map((side) => rigid(earGeometry(side, detail), 'head'))];
  const { face } = plan;
  if (face.mustache !== undefined) out.push(mustachePiece(face.mustache, detail));
  if (face.beard !== undefined) out.push(beardPiece(face.beard, detail, face.beardLen ?? 0.17, !!face.beardSplit));
  if (face.earrings !== undefined) {
    for (const s of [-1, 1]) {
      // Hoa tai đồng tròn xoắn ốc đeo ở dái tai.
      const ring = new THREE.TorusGeometry(0.026, 0.008, 6, segs(14, detail, 10));
      ring.rotateY(Math.PI / 2);
      ring.translate(s * 0.205, 0.685, -0.005);
      out.push(prim(ring, face.earrings, 'head'));
      const bead = new THREE.SphereGeometry(0.012, 8, 6);
      bead.translate(s * 0.208, 0.66, -0.005);
      out.push(prim(bead, C.bronzeLight, 'head'));
    }
  }
  if (face.hairPin !== undefined) {
    // Trâm cài ngang búi tóc.
    const pin = new THREE.CylinderGeometry(0.008, 0.008, 0.32, 6);
    pin.rotateZ(Math.PI / 2);
    pin.translate(0, 0.99, -0.05);
    out.push(prim(pin, face.hairPin, 'head'));
    for (const s of [-1, 1]) {
      const end = new THREE.SphereGeometry(0.02, 8, 6);
      end.translate(s * 0.16, 0.99, -0.05);
      out.push(prim(end, face.hairPin, 'head'));
    }
  }
  for (const b of plan.bands) out.push(headbandPiece(base.f, b.color, detail, b.h));
  for (const c of plan.crowns) out.push(...crownPieces(base.f, c.colors, c.opts, detail));
  return out;
}

/** Đầu nặn (thay `humanHead`): mặt theo `face`; tóc, băng đầu, mũ lông chim gọi sau vẫn gộp vào lúc dựng. */
export function nanHead(r: HumanRig, face: FaceLook): void {
  const plan: HeadPlan = { face, bands: [], crowns: [] };
  plans.set(r, plan);
  r.defer(() => figure(r, `head:${JSON.stringify(plan)}`, (detail) => sculptHead(plan, detail)));
}

/** Kế hoạch đầu đang vẽ dở (người vẽ gần nhất trên khung này). */
function planOf(r: HumanRig): HeadPlan {
  let plan = plans.get(r);
  if (!plan) {
    nanHead(r, {});
    plan = plans.get(r)!;
  }
  return plan;
}

/** Tóc (thay `hairCap`). */
export function nanHair(r: HumanRig, color: number): void {
  planOf(r).hair = color;
}

/** Băng buộc đầu (thay `headband`). */
export function nanHeadband(r: HumanRig, color: number, h: number): void {
  planOf(r).bands.push({ color, h });
}

/** Mũ lông chim (thay `featherCrown`). */
export function nanCrown(r: HumanRig, colors: readonly number[], opts: CrownOpts): void {
  planOf(r).crowns.push({ colors, opts });
}
