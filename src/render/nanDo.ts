// Đồ mặc nặn ôm theo thân, đầu nặn (nanNguoi.ts), thay hộp, cầu ghép cũ: mũ trụ ôm đầu (che gáy, che má, sống mũ,
// chóp, tua), khăn vấn, nón lá, nón rộng vành, búi tóc, dải buộc; giáp ngực tấm trơn hay lá nhiều hàng, giáp vai nhiều
// lớp, vạt giáp, tấm che đùi, hộ tâm, đinh tán, đai chéo, áo choàng buông sau lưng. Các món đo theo mặt thân, mặt đầu
// của người đang vẽ trên khung (`bodyOf`, `headBase`) nên ôm khít, mép tròn đều. Mỗi món dựng một lần cho mỗi bộ
// thông số, mỗi độ chi tiết (`figure`).

import * as THREE from 'three';
import type { HumanRig } from './body';
import { Clay, cone, decal, ellipsoid, hit, normalAt, radiusAt, ribbon, slab, sphere, wrap, type Sdf, type V3 } from './nan';
import { aPose, bodyOf, clayPiece, crownPieces, figure, headBase, lookOf, prim, rigid, segs, skirtOf, type CrownOpts, type Piece } from './nanNguoi';

const smooth = THREE.MathUtils.smoothstep;

/** Khóa cho kho hình: tên món, dáng thân, thông số. */
function keyOf(r: HumanRig, name: string, o: unknown, withBody = false): string {
  if (!withBody) return `${name}:${JSON.stringify(o)}`;
  const look = lookOf(r);
  return `${name}:${look?.build ?? ''}:${look?.long ? 1 : 0}:${JSON.stringify(o)}`;
}

/** Khoảng cách góc (radian) giữa hai hướng. */
function angDist(a: number, b: number): number {
  const d = Math.abs(((a - b) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.min(d, 2 * Math.PI - d);
}

/** Một bó sợi (tua lông ngựa nhuộm, chòm tóc) mọc từ `base` theo hướng `dir`, xòe nhẹ, ngọn nhọn. */
function tuftPiece(base: V3, dir: V3, len: number, r0: number, color: number, detail: number, strands = 5): Piece {
  const clay = new Clay(color);
  const d = new THREE.Vector3(...dir).normalize();
  const side = new THREE.Vector3(1, 0, 0).addScaledVector(d, -d.x).normalize();
  const up = new THREE.Vector3().crossVectors(d, side).normalize();
  clay.add('head', sphere(base, r0 * 1.1), { k: 0 });
  for (let i = 0; i < strands; i++) {
    const a = (i / strands) * Math.PI * 2;
    const spread = new THREE.Vector3().addScaledVector(side, Math.cos(a)).addScaledVector(up, Math.sin(a)).multiplyScalar(0.28);
    const tipDir = d.clone().add(spread).normalize();
    const mid: V3 = [base[0] + d.x * len * 0.45, base[1] + d.y * len * 0.45, base[2] + d.z * len * 0.45];
    const tip: V3 = [base[0] + tipDir.x * len, base[1] + tipDir.y * len, base[2] + tipDir.z * len];
    clay.add('head', cone(mid, tip, r0 * 0.75, 0.003), { k: 0.012 });
    clay.add('head', cone(base, mid, r0, r0 * 0.75), { k: 0.012 });
  }
  const lo: V3 = [base[0] - len, base[1] - len, base[2] - len];
  const hi: V3 = [base[0] + len, base[1] + len, base[2] + len];
  return clayPiece(clay.build({ kind: 'nets', min: lo, max: hi, cell: Math.max(0.005, len / 28) / detail, target: Math.round(240 * detail) }));
}

// ---------- Mũ trụ, khăn ----------

export interface HelmetOpts {
  color: number;
  /** Mép dưới (mặc định 0,8: ngang trán, trên tai). */
  rim?: number;
  /** Chỏm cao thêm trên đỉnh tóc; nới ra quanh đầu. */
  lift?: number;
  puff?: number;
  /** Vành quanh mép: màu, bề cao, có hoa văn trống đồng. */
  band?: number;
  bandH?: number;
  bandPattern?: boolean;
  /** Che gáy, che má (màu, dài) và viền gấu của chúng. */
  guard?: number;
  neck?: number;
  cheek?: number;
  guardTrim?: number;
  /** Chóp: núm tròn, gai nhọn, ống cắm tua. */
  top?: { kind: 'knob' | 'spike' | 'tube'; color: number; h?: number };
  /** Sống mũ chạy dọc từ trán qua đỉnh ra sau gáy. */
  ridge?: number;
  /** Tấm trang trí trước trán. */
  brow?: number;
  /** Tua trên chóp: màu, dài, ngả ra sau bao nhiêu (radian). */
  tuft?: { color: number; len: number; lean?: number; r?: number };
  /** Khăn vải: nếp nhăn, mép mềm. */
  cloth?: boolean;
  /** Gắn vào xương này thay cho đầu (mũ rơi được). */
  bone?: string;
}

function helmetPieces(o: HelmetOpts, detail: number): Piece[] {
  const head = headBase(true).f;
  const bone = o.bone ?? 'head';
  const rim = o.rim ?? 0.8;
  const puff = o.puff ?? 0.018;
  const k = 1 + (o.lift ?? 0.02) / 0.14;
  // Đầu kéo cao chỏm: mũ ôm theo mặt này, nới ra `puff`.
  const tall: Sdf = (x, y, z) => head(x, y > 0.85 ? 0.85 + (y - 0.85) / k : y, z);
  const shell: Sdf = (x, y, z) => tall(x, y, z) - puff;
  const top = (hit(shell, [0, 1.6, -0.02], [0, -1, 0]) ?? [0, 1.0, 0])[1];
  const out: Piece[] = [];
  const seg = segs(28, detail, 16);
  const folds = (th: number, t: number) => (o.cloth ? 0.0045 * Math.sin(7 * th + 9 * t) * Math.sin(Math.PI * Math.min(1, t * 1.2)) : 0);
  // Chỏm: các vòng ôm từ mép lên tới đỉnh, mép dưới gấp vào thấy bề dày.
  out.push(
    rigid(
      wrap(
        tall,
        {
          a: [0, rim, -0.02],
          b: [0, top - puff + 0.004, -0.02],
          t0: 0,
          t1: 1,
          seg,
          rings: Math.max(5, Math.round(9 * detail)),
          rmax: 0.4,
          lip: 0.012,
          radius: (rs, th, t) => (rs > 0 ? rs + puff + folds(th, t) : puff * (1 - t) + 0.004),
          colorAt:
            o.ridge === undefined
              ? undefined
              : (th, u) => (u > 0.12 && (angDist(th, Math.PI / 2) < 0.12 || angDist(th, -Math.PI / 2) < 0.12 || u > 0.9) ? o.ridge : undefined),
        },
        o.color,
      ),
      bone,
    ),
  );
  // Đỉnh: núm, gai, ống cắm tua (luôn có một núm nhỏ bịt đỉnh).
  const tp = o.top ?? { kind: 'knob' as const, color: o.color };
  const h = tp.h ?? (tp.kind === 'spike' ? 0.16 : 0.05);
  const c0: V3 = [0, top - 0.012, -0.02];
  let g: THREE.BufferGeometry;
  if (tp.kind === 'knob') {
    g = new THREE.SphereGeometry(tp.h ? tp.h * 0.6 : 0.03, segs(12, detail, 8), segs(8, detail, 6));
    g.scale(1, 0.8, 1);
    g.translate(c0[0], c0[1] + 0.012, c0[2]);
  } else if (tp.kind === 'spike') {
    g = new THREE.ConeGeometry(0.04, h, segs(10, detail, 8));
    g.translate(c0[0], c0[1] + h / 2, c0[2]);
  } else {
    g = new THREE.CylinderGeometry(0.03, 0.024, h, segs(10, detail, 8));
    g.translate(c0[0], c0[1] + h / 2, c0[2]);
  }
  out.push(prim(g, tp.color, bone));
  if (tp.kind !== 'knob') {
    const collar = new THREE.TorusGeometry(0.034, 0.01, 6, segs(12, detail, 8));
    collar.rotateX(Math.PI / 2);
    collar.translate(c0[0], c0[1] + 0.008, c0[2]);
    out.push(prim(collar, o.band ?? tp.color, bone));
  }
  if (o.tuft) {
    const lean = o.tuft.lean ?? 0.4;
    const baseY = top - 0.01 + (tp.kind === 'tube' ? h : tp.kind === 'spike' ? h * 0.55 : 0.03);
    out.push(tuftPiece([0, baseY, -0.02 - (tp.kind === 'spike' ? 0.01 : 0)], [0, Math.cos(lean), -Math.sin(lean)], o.tuft.len, o.tuft.r ?? 0.03, o.tuft.color, detail));
  }
  // Vành quanh mép.
  if (o.band !== undefined) {
    const bh = o.bandH ?? 0.035;
    out.push(
      rigid(
        wrap(head, { a: [0, rim - 0.004, -0.02], b: [0, rim + bh, -0.02], t0: 0, t1: 1, seg, rings: 1, rmax: 0.4, lip: 0.007, uvRepeat: o.bandPattern ? 4 / 3 : undefined, radius: (rs) => rs + puff + 0.008 }, o.band),
        bone,
        o.bandPattern ? 'band' : 'plain',
      ),
    );
  }
  // Che gáy, che má: một vạt loe xuống từ mép mũ, dài sau gáy, ngắn hai bên, chừa mặt.
  const neck = o.neck ?? 0;
  const cheek = o.cheek ?? 0;
  if (neck > 0 || cheek > 0) {
    const SPAN = 0.22;
    const len = (th: number) => {
      const back = neck * smooth(-Math.sin(th), 0.15, 0.75);
      const sides = cheek * Math.max(Math.exp(-((angDist(th, 0.35) / 0.42) ** 2)), Math.exp(-((angDist(th, Math.PI - 0.35) / 0.42) ** 2)));
      return Math.max(0.006, back, sides) / SPAN;
    };
    out.push(
      rigid(
        wrap(
          head,
          {
            a: [0, rim + 0.01, -0.02],
            b: [0, rim + 0.01 - SPAN, -0.02],
            t0: 0,
            t1: len,
            seg,
            rings: Math.max(3, Math.round(4 * detail)),
            rmax: 0.4,
            lip: 0.01,
            radius: (rs, th, t) => Math.max(rs, 0.16) + puff + 0.004 + 0.05 * Math.max(0, t - 0.04) + folds(th, t),
            colorAt: o.guardTrim === undefined ? undefined : (_th, u) => (u > 0.78 ? o.guardTrim : undefined),
          },
          o.guard ?? o.color,
        ),
        bone,
      ),
    );
  }
  // Tấm trước trán.
  if (o.brow !== undefined) {
    const c = hit(shell, [0, rim + 0.06, 0.6], [0, 0, -1]);
    if (c) out.push(rigid(decal(shell, c, { r: 0.05, lift: 0.008, seg: segs(16, detail, 10), rings: 1 }, o.brow), bone));
  }
  return out;
}

/** Mũ trụ (hay mũ vải) ôm đầu. */
export function helmet(r: HumanRig, o: HelmetOpts): void {
  figure(r, keyOf(r, 'helmet', o), (d) => helmetPieces(o, d));
}

export interface KhanOpts {
  color: number;
  /** Màu lớp vấn ngoài (mặc định cùng màu). */
  roll?: number;
  /** Số lớp vấn quanh trán. */
  rolls?: number;
  /** Mối buộc sau gáy, hai đuôi khăn buông. */
  knot?: boolean;
  tails?: number;
}

/** Khăn vấn: trùm kín đỉnh đầu, quấn vòng quanh trán, mối buộc và đuôi khăn sau gáy. */
export function khan(r: HumanRig, o: KhanOpts): void {
  figure(r, keyOf(r, 'khan', o), (detail) => {
    const head = headBase(true).f;
    const out = helmetPieces({ color: o.color, rim: 0.79, lift: 0.0, puff: 0.02, cloth: true }, detail);
    const n = o.rolls ?? 2;
    for (let i = 0; i < n; i++) {
      const y0 = 0.79 + i * 0.034;
      // Lớp vấn: ống tròn mép, hơi chéo.
      out.push(
        rigid(
          wrap(
            head,
            {
              a: [0, y0, -0.02],
              b: [0, y0 + 0.036, -0.02],
              t0: 0,
              t1: (th) => 1 + 0.25 * Math.sin(th + i),
              seg: segs(24, detail, 16),
              rings: 2,
              rmax: 0.4,
              lip: 0.014,
              radius: (rs, _th, t) => rs + 0.03 + 0.012 * Math.sin(Math.PI * t) - 0.004 * i,
            },
            i % 2 ? (o.roll ?? o.color) : o.color,
          ),
          'head',
        ),
      );
    }
    if (o.knot) {
      const kc = hit(head, [0, 0.84, -0.6], [0, 0, 1]) ?? [0, 0.84, -0.22];
      const knot = new THREE.SphereGeometry(0.045, segs(10, detail, 8), segs(8, detail, 6));
      knot.scale(1.25, 0.9, 0.8);
      knot.translate(kc[0], kc[1], kc[2] - 0.035);
      out.push(prim(knot, o.roll ?? o.color, 'head'));
      for (const s of [-1, 1]) out.push(streamerPiece([s * 0.025, kc[1] - 0.01, kc[2] - 0.05], [s * 0.25, -1, -0.35], o.tails ?? 0.12, 0.034, o.color, detail));
    }
    return out;
  });
}

/** Một dải vải buông (đuôi khăn, dải buộc tóc): từ `from` theo hướng `dir`, cong dần, đầu dải xòe nhẹ. */
function streamerPiece(from: V3, dir: V3, len: number, width: number, color: number, detail: number, bone = 'head'): Piece {
  const d = new THREE.Vector3(...dir).normalize();
  const side = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 0, 1));
  if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
  side.normalize();
  const nrm = new THREE.Vector3().crossVectors(side, d).normalize();
  const P = (u: number, v: number): V3 => {
    const w = width * (0.8 + 0.4 * v) * (u - 0.5);
    const curl = 0.18 * len * v * v;
    return [from[0] + d.x * len * v + side.x * w - nrm.x * curl, from[1] + d.y * len * v + side.y * w - nrm.y * curl, from[2] + d.z * len * v + side.z * w - nrm.z * curl];
  };
  const inward = (): V3 => [nrm.x, nrm.y, nrm.z];
  return rigid(slab(P, inward, 2, Math.max(3, Math.round(5 * detail)), 0.008, color), bone);
}

/** Dải vải buộc buông sau đầu (đuôi khăn, dải buộc tóc, giải mũ). */
export function streamer(r: HumanRig, o: { from: V3; dir: V3; len: number; width: number; color: number; bone?: string }): void {
  figure(r, keyOf(r, 'streamer', o), (d) => [streamerPiece(o.from, o.dir, o.len, o.width, o.color, d, o.bone)]);
}

/** Búi tóc tròn (đỉnh đầu hay sau gáy), có dây buộc. */
export function bun(r: HumanRig, o: { color: number; at: V3; size?: number; tie?: number }): void {
  figure(r, keyOf(r, 'bun', o), (detail) => {
    const s = o.size ?? 0.075;
    const clay = new Clay(o.color);
    clay.add('head', ellipsoid(o.at, [s, s * 0.85, s]), { k: 0 });
    clay.add('head', ellipsoid([o.at[0], o.at[1] - s * 0.6, o.at[2]], [s * 0.7, s * 0.5, s * 0.7]), { k: 0.02 });
    const out: Piece[] = [clayPiece(clay.build({ kind: 'radial', c: o.at, detail: Math.max(2, Math.round(3 * detail)), rmax: s * 2.2 }))];
    if (o.tie !== undefined) {
      const ring = new THREE.TorusGeometry(s * 0.72, 0.011, 6, segs(14, detail, 10));
      ring.rotateX(Math.PI / 2);
      ring.translate(o.at[0], o.at[1] - s * 0.45, o.at[2]);
      out.push(prim(ring, o.tie, 'head'));
    }
    return out;
  });
}

// ---------- Nón ----------

export interface HatOpts {
  /** `non`: nón lá chóp nhọn; `wide`: nón rộng vành đáy bằng, chỏm thấp. */
  kind: 'non' | 'wide';
  color: number;
  /** Màu viền vành. */
  trim?: number;
  /** Mép vành ở độ cao `y`, bán kính `r`; chóp cao `h`; nghiêng ra trước. */
  y?: number;
  r?: number;
  h?: number;
  tilt?: number;
}

/** Nón tròn tiện từ một đường viền: mặt trên, mép vành có bề dày, lòng nón. */
export function hat(r: HumanRig, o: HatOpts): void {
  figure(r, keyOf(r, 'hat', o), (detail) => {
    const R = o.r ?? (o.kind === 'non' ? 0.36 : 0.32);
    const y = o.y ?? (o.kind === 'non' ? 0.84 : 0.885);
    const H = o.h ?? (o.kind === 'non' ? 0.22 : 0.15);
    const pts: THREE.Vector2[] = [];
    if (o.kind === 'non') {
      const n = 8;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push(new THREE.Vector2(Math.max(1e-3, R * t), y + H * Math.pow(1 - t, 1.1)));
      }
      pts.push(new THREE.Vector2(R + 0.006, y - 0.006), new THREE.Vector2(R - 0.012, y - 0.016));
      for (let i = n - 1; i >= 0; i--) {
        const t = i / n;
        pts.push(new THREE.Vector2(Math.max(1e-3, R * t * 0.96), y - 0.014 + (H - 0.02) * Math.pow(1 - t, 1.1)));
      }
    } else {
      const crown = R * 0.6;
      pts.push(new THREE.Vector2(1e-3, y + H), new THREE.Vector2(crown * 0.5, y + H * 0.85), new THREE.Vector2(crown, y + 0.025), new THREE.Vector2(R * 0.85, y + 0.012));
      pts.push(new THREE.Vector2(R, y + 0.004), new THREE.Vector2(R + 0.004, y - 0.008), new THREE.Vector2(R - 0.01, y - 0.016), new THREE.Vector2(crown * 0.9, y - 0.006));
      pts.push(new THREE.Vector2(crown * 0.8, y + H * 0.55), new THREE.Vector2(1e-3, y + H * 0.7));
    }
    const g = new THREE.LatheGeometry(pts, segs(24, detail, 14));
    const nonIdx = g.toNonIndexed();
    g.dispose();
    nonIdx.deleteAttribute('uv');
    nonIdx.computeVertexNormals();
    const p = nonIdx.getAttribute('position');
    const col = new Float32Array(p.count * 3);
    const base = new THREE.Color(o.color);
    const trim = new THREE.Color(o.trim ?? o.color);
    const dark = base.clone().multiplyScalar(0.86);
    for (let i = 0; i < p.count; i++) {
      const rr = Math.hypot(p.getX(i), p.getZ(i));
      const a = Math.atan2(p.getZ(i), p.getX(i));
      // Nón lá: sọc nan chạy từ chóp ra; viền vành.
      const c = rr > R - 0.016 ? trim : o.kind === 'non' && Math.sin(a * 16) > 0.85 ? dark : base;
      c.toArray(col, i * 3);
    }
    nonIdx.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (o.tilt) {
      nonIdx.translate(0, -y, 0);
      nonIdx.rotateX(o.tilt);
      nonIdx.translate(0, y, 0);
    }
    return [rigid(nonIdx, 'head')];
  });
}

// ---------- Giáp ----------

export interface ArmorOpts {
  color: number;
  /** Màu viền gấu mỗi hàng lá (giáp lá) hay viền trên, dưới (giáp tấm). */
  trim?: number;
  /** Số hàng lá; 0 là giáp tấm trơn. */
  rows?: number;
  /** Từ thắt lưng (`y0`) lên tới vai (`y1`). */
  y0?: number;
  y1?: number;
  /** Dày bao nhiêu (mặc định 0,016). */
  thick?: number;
  /** Lá giáp có răng (vảy cá) ở gấu mỗi hàng. */
  scales?: boolean;
  /** Dải hoa văn (chất liệu hoa văn trống đồng). */
  pattern?: boolean;
}

/** Giáp ngực ôm thân (không gồm tay): tấm trơn hay lá nhiều hàng chồng mí, hàng trên phủ hàng dưới. */
export function armor(r: HumanRig, o: ArmorOpts): void {
  figure(r, keyOf(r, 'armor', o, true), (detail) => armorPieces(r, o, detail));
}

function armorPieces(r: HumanRig, o: ArmorOpts, detail: number): Piece[] {
  const torso = bodyOf(r).torso;
  const { fit } = skirtOf(r);
  const y0 = o.y0 ?? 0.395;
  const y1 = o.y1 ?? 0.6;
  const thick = o.thick ?? 0.016;
  const rows = o.rows ?? 0;
  const seg = segs(28, detail, 16);
  const out: Piece[] = [];
  // Bán kính đáy giáp phủ ngoài đai lưng, cạp khố.
  const floor = (th: number, y: number) => (y < 0.44 ? fit(th, 0) + 0.012 + thick * 0.5 : 0);
  const n = Math.max(1, rows);
  for (let i = 0; i < n; i++) {
    // Hàng trên cùng ở vai; mỗi hàng phủ xuống mí hàng dưới.
    const top = y1 - ((y1 - y0) * i) / n;
    const bot = y1 - ((y1 - y0) * (i + 1)) / n - (rows ? 0.012 : 0);
    out.push(
      rigid(
        wrap(
          torso,
          {
            a: [0, top, 0],
            b: [0, bot, 0],
            t0: 0,
            t1: 1,
            seg,
            rings: rows ? 2 : Math.max(3, Math.round(5 * detail)),
            rmax: 0.3,
            lip: rows ? 0.01 : 0.008,
            uvRepeat: o.pattern ? 2 : undefined,
            radius: (rs, th, t) => {
              const y = top + (bot - top) * t;
              const scal = o.scales ? 0.004 * Math.abs(Math.sin(th * 11)) * t : 0;
              return Math.max(rs + thick + (rows ? 0.008 * t : 0) + scal, floor(th, y));
            },
            colorAt: o.trim === undefined ? undefined : (_th, u) => ((rows ? u > 0.66 : u < 0.08 || u > 0.92) ? o.trim : undefined),
          },
          o.color,
        ),
        'chest',
        o.pattern ? 'band' : 'plain',
      ),
    );
  }
  return out;
}

/** Mặt ngoài giáp ngực (để gắn hộ tâm, đinh tán lên đó). */
function armorSurface(r: HumanRig, thick: number): Sdf {
  const torso = bodyOf(r).torso;
  return (x, y, z) => torso(x, y, z) - thick;
}

/** Hộ tâm tròn giữa ngực (gương đồng, mặt trống đồng), có vành và núm, nằm trên giáp dày `thick` (0 là trên da). */
export function chestDisc(r: HumanRig, o: { color: number; r?: number; y?: number; rim?: number; drum?: boolean; boss?: number; thick?: number }): void {
  figure(r, keyOf(r, 'disc', o, true), (detail) => {
    const f = armorSurface(r, (o.thick ?? 0.016) + 0.004);
    const y = o.y ?? 0.495;
    const c = hit(f, [0, y, 0.5], [0, 0, -1]) ?? [0, y, 0.13];
    const rad = o.r ?? 0.062;
    const seg = segs(20, detail, 12);
    const out: Piece[] = [rigid(decal(f, c, { r: rad, lift: 0.01, seg, rings: detail >= 1 ? 2 : 1 }, o.color), 'chest', o.drum ? 'drum' : 'plain')];
    if (o.rim !== undefined) out.push(rigid(decal(f, c, { r: rad + 0.013, r0: rad - 0.002, lift: 0.008, seg, rings: 1 }, o.rim), 'chest'));
    if (o.boss !== undefined) {
      const n = normalAt(f, ...c);
      const b = new THREE.SphereGeometry(rad * 0.32, 8, 6);
      b.scale(1, 1, 0.55);
      b.lookAt(new THREE.Vector3(...n));
      b.translate(c[0] + n[0] * 0.014, c[1] + n[1] * 0.014, c[2] + n[2] * 0.014);
      out.push(prim(b, o.boss, 'chest'));
    }
    return out;
  });
}

/** Đinh tán (núm tròn nhỏ) trên giáp ngực ở các chỗ (x, y) nhìn từ trước (`back` thì sau lưng). */
export function studs(r: HumanRig, o: { color: number; at: [number, number][]; back?: boolean; size?: number; thick?: number }): void {
  figure(r, keyOf(r, 'studs', o, true), () => {
    const f = armorSurface(r, (o.thick ?? 0.016) + 0.002);
    return o.at.flatMap(([x, y]) => {
      const c = hit(f, [x, y, o.back ? -0.5 : 0.5], [0, 0, o.back ? 1 : -1]);
      if (!c) return [];
      const g = new THREE.SphereGeometry(o.size ?? 0.012, 6, 4);
      g.translate(...c);
      return [prim(g, o.color, 'chest')];
    });
  });
}

export interface PauldronOpts {
  color: number;
  /** Viền gấu mỗi lớp. */
  trim?: number;
  /** Số lớp chồng (mặc định 1). */
  layers?: number;
  /** Cỡ (mặc định 1). */
  size?: number;
  /** Gai nhọn trên đỉnh vai (màu). */
  spike?: number;
}

/** Giáp vai: các lớp mũ chụp tròn ôm bắp vai, lớp dưới loe rộng hơn, gắn theo cánh tay. */
export function pauldrons(r: HumanRig, o: PauldronOpts): void {
  figure(r, keyOf(r, 'pauldron', o), (detail) => {
    const base = bodyOf(r);
    const out: Piece[] = [];
    const k = o.size ?? 1;
    const n = o.layers ?? 1;
    for (const [arm, s] of [
      ['armL', -1],
      ['armR', 1],
    ] as const) {
      // Mặt bắp vai nhìn từ tư thế gốc của cánh tay.
      const only = base.clay.only([arm]);
      const m = aPose(arm).elements;
      const f: Sdf = (x, y, z) => only(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
      const cx = s * 0.142;
      for (let i = 0; i < n; i++) {
        const top = 0.6 + 0.006 * k - i * 0.035;
        const outer = (0.135 + 0.03 * i) * k;
        out.push(
          rigid(
            wrap(
              f,
              {
                a: [cx, top, 0],
                b: [cx, top - 0.22, 0],
                t0: 0,
                // Phía ngoài dài xuống bắp tay, phía trong (cổ) ngắn.
                t1: (th) => (0.05 + (outer - 0.05) * smooth(s * Math.cos(th), -0.7, 0.7)) / 0.22,
                seg: segs(16, detail, 12),
                rings: Math.max(3, Math.round(4 * detail)),
                rmax: 0.12,
                lip: 0.01,
                radius: (rs, _th, t) => (rs > 0 ? rs : 0.004) + (0.016 + 0.012 * i) * k + 0.03 * k * t,
                colorAt: o.trim === undefined ? undefined : (_th, u) => (u > 0.8 ? o.trim : undefined),
              },
              o.color,
            ),
            arm,
          ),
        );
      }
      if (o.spike !== undefined) {
        const g = new THREE.ConeGeometry(0.032 * k, 0.13 * k, 8);
        g.rotateZ(-s * 0.7);
        g.translate(cx + s * 0.045 * k, 0.64 * (1 + 0 * k), 0);
        out.push(prim(g, o.spike, arm));
      }
    }
    return out;
  });
}

export interface SkirtArmorOpts {
  color: number;
  trim?: number;
  /** Số hàng lá. */
  rows: number;
  /** Từ cạp xuống tới độ cao `to`. */
  to: number;
  /** Chỉ những tấm ở các góc này (radian, π/2 là trước) với nửa bề ngang `half` thay vì cả vòng. */
  panels?: number[];
  half?: number;
}

/** Vạt giáp che đùi: cả vòng lá chồng mí phủ ngoài khố (hay váy), hay vài tấm riêng (trước, hai bên). */
export function skirtArmor(r: HumanRig, o: SkirtArmorOpts): void {
  figure(r, keyOf(r, 'skirtArmor', o, true), (detail) => {
    const { fit, top, hem } = skirtOf(r);
    const out: Piece[] = [];
    const y0 = 0.425;
    for (let i = 0; i < o.rows; i++) {
      const a = y0 - ((y0 - o.to) * i) / o.rows;
      const b = y0 - ((y0 - o.to) * (i + 1)) / o.rows - 0.01;
      const radius = (th: number, y: number) => fit(th, THREE.MathUtils.clamp((top - y) / (top - hem), 0, 1)) + 0.016 + 0.006 * i;
      if (!o.panels) {
        out.push(
          rigid(
            wrap(
              (x, y, z) => Math.hypot(x, z) - radius(Math.atan2(z, x), y),
              {
                a: [0, a, 0],
                b: [0, b, 0],
                t0: 0,
                t1: 1,
                seg: segs(28, detail, 16),
                rings: 2,
                rmax: 0.35,
                lip: 0.01,
                radius: (rs, _th, t) => rs + 0.004 + 0.012 * t,
                colorAt: o.trim === undefined ? undefined : (_th, u) => (u > 0.66 ? o.trim : undefined),
              },
              o.color,
            ),
            'hips',
          ),
        );
        continue;
      }
      for (const mid of o.panels) {
        const half = o.half ?? 0.45;
        const P = (u: number, v: number): V3 => {
          const th = mid + (u - 0.5) * 2 * half;
          const y = a + (b - a) * v;
          const rr = radius(th, y) + 0.012 * v;
          return [Math.cos(th) * rr, y, Math.sin(th) * rr];
        };
        const inward = (u: number): V3 => {
          const th = mid + (u - 0.5) * 2 * half;
          return [-Math.cos(th), 0, -Math.sin(th)];
        };
        out.push(rigid(slab(P, inward, Math.max(3, Math.round(5 * detail)), 2, 0.012, i === o.rows - 1 && o.trim !== undefined ? o.trim : o.color), 'hips'));
      }
    }
    return out;
  });
}

/** Đai (dải vải, đai da) chéo trước ngực từ vai `side` (1 phải, -1 trái) xuống hông bên kia, vòng ra sau lưng. */
export function sash(r: HumanRig, o: { color: number; side?: number; width?: number; thick?: number }): void {
  figure(r, keyOf(r, 'sash', o, true), (detail) => {
    const s = o.side ?? 1;
    const f = armorSurface(r, o.thick ?? 0);
    const path: V3[] = [
      [s * 0.1, 0.57, -0.06],
      [s * 0.08, 0.6, 0.0],
      [s * 0.05, 0.56, 0.08],
      [0, 0.49, 0.12],
      [-s * 0.07, 0.42, 0.1],
      [-s * 0.115, 0.39, 0.0],
      [-s * 0.06, 0.42, -0.1],
      [s * 0.05, 0.5, -0.11],
      [s * 0.1, 0.57, -0.06],
    ];
    return [rigid(ribbon(f, path, o.width ?? 0.05, 0.007, o.color, segs(24, detail)), 'chest')];
  });
}

export interface CloakOpts {
  color: number;
  /** Viền gấu (màu). */
  trim?: number;
  /** Gấu ở độ cao `hem`; xòe ra sau bao nhiêu. */
  hem?: number;
  flare?: number;
  /** Nửa bề ngang ở vai (radian quanh thân). */
  half?: number;
  /** Khuy cài hai bên vai (màu). */
  clasp?: number;
}

/** Áo choàng buông từ vai sau lưng, xòe dần xuống gấu, có nếp gấp dọc, gắn theo ngực. */
export function cloak(r: HumanRig, o: CloakOpts): void {
  figure(r, keyOf(r, 'cloak', o, true), (detail) => {
    const torso = bodyOf(r).torso;
    const { fit } = skirtOf(r);
    const hem = o.hem ?? 0.13;
    const half = o.half ?? 0.95;
    const flare = o.flare ?? 0.1;
    const top = 0.585;
    // Bán kính lưng (lấy chỗ rộng nhất từ vai xuống tới đó cho áo buông thẳng, không bó vào eo).
    const STEPS = 12;
    const memo = new Map<number, number[]>();
    const back = (th: number, v: number) => {
      let prof = memo.get(th);
      if (!prof) {
        prof = [];
        let m = 0;
        for (let i = 0; i <= STEPS; i++) {
          const y = top + (hem - top) * (i / STEPS);
          const rs = y > 0.4 ? radiusAt(torso, [0, y, 0], [Math.cos(th), 0, Math.sin(th)], 0.3) : fit(th, THREE.MathUtils.clamp((0.418 - y) / 0.23, 0, 1)) + 0.012;
          m = Math.max(m, rs);
          prof.push(m);
        }
        memo.set(th, prof);
      }
      return prof[Math.round(v * STEPS)];
    };
    const mid = -Math.PI / 2;
    const P = (u: number, v: number): V3 => {
      const w = half * (1 + 0.35 * v);
      const th = mid + (u - 0.5) * 2 * w;
      const y = top + (hem - top) * v - 0.02 * v * v * Math.cos((u - 0.5) * Math.PI);
      const fold = 0.012 * Math.sin((u - 0.5) * Math.PI * 7) * smooth(v, 0.1, 0.6);
      const rr = back(th, v) + 0.016 + flare * v * v + fold;
      return [Math.cos(th) * rr, y, Math.sin(th) * rr];
    };
    const inward = (u: number, v: number): V3 => {
      const th = mid + (u - 0.5) * 2 * half * (1 + 0.35 * v);
      return [-Math.cos(th), 0, -Math.sin(th)];
    };
    const cols = Math.max(6, Math.round(12 * detail));
    const rowsN = Math.max(4, Math.round(8 * detail));
    const out: Piece[] = [rigid(slab(P, inward, cols, rowsN, 0.012, o.color), 'chest')];
    if (o.trim !== undefined) {
      // Viền gấu: dải nổi nhẹ ngoài mép dưới.
      const T = (u: number, v: number): V3 => {
        const p = P(u, 0.93 + 0.07 * v);
        const n = inward(u, 1);
        return [p[0] - n[0] * 0.006, p[1], p[2] - n[2] * 0.006];
      };
      out.push(rigid(slab(T, (u) => inward(u, 1), cols, 1, 0.014, o.trim), 'chest'));
    }
    if (o.clasp !== undefined) {
      for (const s of [-1, 1]) {
        const c = hit(torso, [s * 0.085, 0.565, 0.5], [0, 0, -1]) ?? [s * 0.085, 0.565, 0.08];
        const g = new THREE.SphereGeometry(0.022, 8, 6);
        g.scale(1, 1, 0.6);
        g.translate(c[0], c[1], c[2] + 0.01);
        out.push(prim(g, o.clasp, 'chest'));
      }
    }
    return out;
  });
}

/** Chùm lông chim cắm trên mũ (như `featherCrown` nhưng gốc đặt tùy ý, vd. trên chóp mũ trụ). */
export function plumes(r: HumanRig, colors: readonly number[], o: CrownOpts): void {
  figure(r, keyOf(r, 'plumes', { colors, o }), (detail) => crownPieces(headBase(true).f, colors, o, detail));
}
