// Người nặn liền khối (nan.ts) thay cho trụ, cầu ghép: thân, tay, chân một khối mượt, uốn ở khớp theo trọng số xương;
// đầu tròn có má, cằm, mũi, tai, tóc có bề dày và chân tóc; mắt, đốm sáng, má hồng, miệng vẽ sắc nét lên mặt; đồ
// mặc ôm theo thân (khố xếp nếp có vạt trước sau, đai, vòng tay, xà cạp, băng đầu, vành mũ đồng, dây chéo, gương
// đồng hộ tâm) và lông chim mũ thuôn như lá, có sống lông, cong ra sau. Khung xương và tư thế y như body.ts.
// Mỗi dáng nặn một lần rồi chép ra (`figure`), vì nặn tốn vài chục mili giây.

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

/** Một mảnh đã nặn: hình có trọng số, chất liệu, tên xương mà `skinIndex` trỏ tới. */
interface Piece {
  slot: RigSlot;
  geo: THREE.BufferGeometry;
  bones: string[];
}

const figures = new Map<string, Piece[]>();

/** Dựng (lần đầu) hay lấy lại các mảnh của dáng `key`, rồi gắn vào khung xương. */
function figure(r: HumanRig, key: string, make: (detail: number) => Piece[]): void {
  const k = `${key}@${r.detail}`;
  let pieces = figures.get(k);
  if (!pieces) {
    pieces = make(r.detail);
    figures.set(k, pieces);
  }
  for (const p of pieces) r.skinned(p.slot, p.geo, p.bones);
}

/** Hình gắn cứng vào một xương. */
function rigid(geo: THREE.BufferGeometry, bone: string, slot: RigSlot = 'plain'): Piece {
  const n = geo.getAttribute('position').count;
  const w = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) w[v * 4] = 1;
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(n * 4), 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(w, 4));
  return { slot, geo, bones: [bone] };
}

function clayPiece(mesh: ClayMesh, slot: RigSlot = 'plain'): Piece {
  return { slot, geo: clayGeometry(mesh), bones: mesh.bones };
}

/** Số mặt quanh theo độ chi tiết, chia hết cho 4 cho đối xứng trước sau, trái phải. */
const segs = (n: number, detail: number, min = 8) => Math.max(min, Math.round((n * detail) / 4) * 4);

function aPose(bone: 'armL' | 'armR'): THREE.Matrix4 {
  const at = new THREE.Vector3(...HUMAN[bone].at);
  const s = bone === 'armR' ? 1 : -1;
  return new THREE.Matrix4()
    .makeTranslation(at.x, at.y, at.z)
    .multiply(new THREE.Matrix4().makeRotationZ(s * A_POSE))
    .multiply(new THREE.Matrix4().makeTranslation(-at.x, -at.y, -at.z));
}

// ---------- Thân ----------

const SKIRT_TOP = 0.418;
const SKIRT_HEM = 0.19;

/**
 * Bán kính khố theo góc `theta` (0 sang phải, π/2 ra trước) và `u` (0 ở cạp, 1 ở gấu). Khố buông như vải: dò mặt hông,
 * đùi (`hip`, không gồm tay buông bên hông), ở mỗi góc lấy chỗ rộng nhất từ cạp xuống tới đó cho vải không bó vào giữa
 * hai đùi, nới ra một chút, nở nhẹ xuống gấu, xếp nếp.
 */
function skirtFit(hip: Sdf): (theta: number, u: number) => number {
  const STEPS = 16;
  const memo = new Map<number, number[]>();
  return (theta, u) => {
    let prof = memo.get(theta);
    if (!prof) {
      prof = [];
      let m = 0;
      for (let i = 0; i <= STEPS; i++) {
        const y = SKIRT_TOP + (SKIRT_HEM - SKIRT_TOP) * (i / STEPS);
        m = Math.max(m, radiusAt(hip, [0, y, 0], [Math.cos(theta), 0, Math.sin(theta)], 0.3));
        prof.push(m);
      }
      memo.set(theta, prof);
    }
    const k = THREE.MathUtils.clamp(u, 0, 1);
    return prof[Math.round(k * STEPS)] + 0.01 + 0.014 * k + 0.0035 * Math.sin(12 * theta) * k;
  };
}

interface NanBody {
  pieces: Piece[];
  /** Trường khoảng cách cả thân ở tư thế nặn (ngực, chân không xoay nên dùng thẳng). */
  f: Sdf;
}

/** Thân, tay, chân nặn liền; khố, đai, vòng tay, xà cạp, dây chéo, gương đồng. */
function sculptBody(look: BodyLook, detail: number): NanBody {
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
  const cell = 0.0145 / detail;
  const mesh = clay.build({ kind: 'nets', min: [-0.25, -0.02, -0.12], max: [0.25, 0.67, 0.13], cell, target: Math.round(2000 * detail) });
  const f = clay.dist;
  const pieces: Piece[] = [clayPiece(mesh)];

  // Khố có dải hoa văn, xếp nếp, nở dần xuống gấu; vạt trước, vạt sau buông dài.
  const skirtR = skirtFit(clay.only(['hips', 'legL', 'legR']));
  const cloth = look.cloth;
  const skirt = wrap(
    f,
    {
      a: [0, SKIRT_TOP, 0],
      b: [0, SKIRT_HEM, 0],
      t0: 0,
      t1: 1,
      seg: segs(32, detail),
      rings: Math.max(2, Math.round(3 * detail)),
      rmax: 0.3,
      lip: 0.01,
      uvRepeat: look.pattern === false ? undefined : 1,
      radius: (_rs, th, t) => skirtR(th, t),
    },
    cloth,
  );
  pieces.push(rigid(skirt, 'hips', look.pattern === false ? 'plain' : 'band'));
  if (look.flaps ?? !look.long) {
    // Vạt khố: tấm vải có bề dày buông từ trong gấu xuống, hơi chếch ra cho chân bước không xuyên qua.
    for (const [front, len] of [
      [1, 0.115],
      [-1, 0.095],
    ] as const) {
      const mid = front > 0 ? Math.PI / 2 : -Math.PI / 2;
      const half = 0.06 / 0.14;
      const P = (u: number, v: number): V3 => {
        const th = mid + (u - 0.5) * 2 * half;
        const y = SKIRT_HEM + 0.03 - v * len;
        const r = skirtR(th, 1) - 0.004 + v * 0.02 + 0.006 * Math.sin(u * Math.PI);
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
        clay.only(['chest', 'hips']),
        {
          a: [0, 0.432, 0],
          b: [0, 0.382, 0],
          t0: 0,
          t1: 1,
          seg: segs(24, detail),
          rings: 1,
          rmax: 0.25,
          lip: 0.008,
          radius: (rs, th) => Math.max(rs, skirtR(th, 0)) + 0.009,
        },
        look.belt ?? C.bronze,
      ),
      'hips',
    ),
  );
  // Vòng tay ở bắp tay, bao cổ tay.
  for (const [arm, s] of [
    ['armL', -1],
    ['armR', 1],
  ] as const) {
    const x = s * 0.135;
    const fa = clay.field(arm);
    const ring = (y0: number, y1: number, color: number, grow = 0.006) =>
      rigid(wrap(fa, { a: [x, y0, 0], b: [x, y1, 0], t0: 0, t1: 1, seg: segs(12, detail), rings: 1, rmax: 0.06, lip: 0.006, radius: (rs) => rs + grow }, color), arm);
    if (look.armband) pieces.push(ring(0.488, 0.458, look.armband));
    if (look.wristband) pieces.push(ring(0.372, 0.33, look.wristband, 0.007));
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
      const n = new THREE.Vector3(0, 0, 1);
      const boss = new THREE.SphereGeometry(0.02, 8, 4);
      boss.scale(1, 1, 0.55);
      boss.translate(c[0] + n.x * 0.014, c[1] + n.y * 0.014, c[2] + n.z * 0.014);
      const b = boss.toNonIndexed();
      boss.dispose();
      b.deleteAttribute('uv');
      paintGeometry(b, C.bronzeLight);
      pieces.push(rigid(b, 'chest'));
    } else if (look.plate) {
      pieces.push(rigid(decal(f, c, { r: 0.05, lift: 0.01, seg, rings: 2 }, look.plate), 'chest'));
    }
  }
  return { pieces, f };
}

// ---------- Đầu ----------

/** Chân tóc theo góc quanh đầu (0 ở trước mặt): trán cao, vòng trên tai, thấp dần xuống gáy. */
function hairline(x: number, z: number): number {
  const a = Math.abs(Math.atan2(x, z));
  const s = THREE.MathUtils.smoothstep;
  return 0.842 - 0.05 * s(a, 0.35, 1.45) - 0.16 * s(a, 1.85, 2.9);
}

interface NanHead {
  pieces: Piece[];
  f: Sdf;
}

/** Đầu to tròn: sọ, mặt bầu, má phúng phính, cằm, mũi nhỏ, tai; tóc dày có chân tóc; mặt vẽ sắc nét. */
function sculptHead(face: FaceLook, detail: number, hairColor: number = C.hair): NanHead {
  const clay = new Clay(C.skin);
  clay.add('head', ellipsoid([0, 0.776, -0.012], [0.2, 0.188, 0.19]), { k: 0 });
  clay.add('head', ellipsoid([0, 0.704, 0.028], [0.162, 0.122, 0.15]), { k: 0.08 });
  clay.add('head', ellipsoid([0, 0.645, 0.08], [0.07, 0.045, 0.06]), { k: 0.05 });
  for (const s of [-1, 1]) clay.add('head', ellipsoid([s * 0.092, 0.698, 0.1], [0.062, 0.05, 0.05]), { k: 0.05 });
  clay.add('head', ellipsoid([0, 0.718, 0.19], [0.02, 0.022, 0.018]), { k: 0.03 });
  // Tóc: lớp dày phủ sọ, cắt theo chân tóc.
  const cap = ellipsoid([0, 0.8, -0.028], [0.214, 0.19, 0.214]);
  const hair: Sdf = (x, y, z) => smax(cap(x, y, z), hairline(x, z) - y, 0.014);
  clay.add('head', hair, { k: 0.012 });
  clay.paint('head', (x, y, z) => hair(x, y, z) - 0.004, hairColor);
  // Mặt: vẽ lên đúng chỗ trên mặt cong.
  const f = clay.dist;
  const on = (x: number, y: number): V3 => hit(f, [x, y, 0.5], [0, 0, -1]) ?? [x, y, 0.18];
  const blush = face.blush ?? !face.brows;
  // Nét nhỏ chia tam giác mịn hơn cho tròn; lính đông thì bớt một bậc.
  const fine = detail >= 1 ? 2 : 1;
  for (const s of [-1, 1]) {
    clay.paint('head', ellipsoid(on(s * 0.072, 0.744), [0.03, 0.043, 0.03]), C.ink, fine);
    if (blush) {
      clay.paint('head', sphere(on(s * 0.062, 0.764), 0.0125), C.cream, fine);
      clay.paint('head', ellipsoid(on(s * 0.114, 0.697), [0.031, 0.017, 0.03]), CHEEK, fine - 1);
    }
    if (face.brows) clay.paint('head', ellipsoid(on(s * 0.078, 0.8), [0.04, 0.011, 0.03], [0, 0, -s * 0.32]), C.ink, fine);
  }
  clay.paint('head', ellipsoid(on(0, 0.663), [0.019, 0.006, 0.03]), MOUTH, fine);
  const mesh = clay.build({ kind: 'radial', c: [0, 0.75, 0], detail: Math.max(3, Math.round(5 * detail)), rmax: 0.34, front: 0.35 });
  return { pieces: [clayPiece(mesh), ...[-1, 1].map((side) => rigid(earGeometry(side, detail), 'head'))], f };
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
    const t = THREE.MathUtils.smoothstep(side * p.getX(i), 0.55, 0.9) * (1 - THREE.MathUtils.smoothstep(Math.hypot(p.getY(i), p.getZ(i)), 0.35, 0.6));
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

/** Băng vải buộc đầu (ngay trên tai). */
function headbandPiece(f: Sdf, color: number, detail: number, y0 = 0.792, y1 = 0.818): Piece {
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
function feather(o: V3, d: THREE.Vector3, w: THREE.Vector3, n: THREE.Vector3, len: number, width: number, color: number, detail: number): THREE.BufferGeometry {
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

interface CrownOpts {
  count?: number;
  len?: number;
  spread?: number;
  bronzeRim?: boolean;
  rim?: number;
  tier2?: boolean;
}

/** Mũ lông chim xòe quạt ngả ra sau, cắm vào vành mũ đồng có hoa văn (như `featherCrown` ở body.ts). */
function crownPieces(f: Sdf, colors: readonly number[], opts: CrownOpts, detail: number): Piece[] {
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
  row(n, opts.len ?? 0.36, -0.2, [0, 0.925, -0.1], 0.08, 0);
  if (opts.tier2) row(Math.max(3, n - 2), (opts.len ?? 0.36) * 0.62, -0.06, [0, 0.935, -0.07], 0.068, 1);
  return out;
}

// ---------- Các dáng ----------

/** Quân ta nặn: như `lacViet` ở soldier.ts (khố đỏ hoa văn, đai đồng, mũ lông chim, gương đồng hộ tâm). */
export function nanLacViet(r: HumanRig, plate: boolean, tier: number): void {
  figure(r, `lacViet:${plate ? 1 : 0}:${tier}`, (detail) => {
    const body = sculptBody(
      {
        cloth: C.red,
        pattern: true,
        drumPlate: plate,
        crossStrap: plate ? C.woodDark : undefined,
        armband: C.bronze,
        greaves: plate || tier >= 1 ? C.bronze : undefined,
        wristband: tier >= 1 ? C.bronze : undefined,
      },
      detail,
    );
    const head = sculptHead({}, detail);
    return [
      ...body.pieces,
      ...head.pieces,
      headbandPiece(head.f, C.red, detail),
      ...crownPieces(
        head.f,
        tier >= 3 ? [C.red, C.gold, C.cream] : [C.red, C.cream],
        {
          count: tier >= 2 ? 9 : 7,
          len: tier >= 3 ? 0.47 : tier >= 2 ? 0.42 : 0.36,
          bronzeRim: true,
          rim: tier >= 3 ? C.gold : undefined,
          tier2: tier >= 2,
        },
        detail,
      ),
    ];
  });
}
