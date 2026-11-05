// Nặn hình bằng trường khoảng cách có dấu (SDF): thân người liền một khối, tròn trịa như tượng nặn, thay cho trụ,
// cầu, hộp ghép lại. Các khối hòa vào nhau ở chỗ nối (smooth min), rồi chia thành lưới tam giác:
// - `surfaceNets` cho hình bất kỳ (thân, tay, chân);
// - `radialMesh` cho hình quanh một tâm (đầu, tóc), số mặt đều và ít hơn.
// Vùng màu (tóc, áo, quần) cắt theo đường biên của trường riêng nên mép màu sắc nét, không loang theo đỉnh.
// Mỗi đỉnh mang trọng số tới bốn xương, pha dần ở khớp (vai, háng, cổ, eo), nên khi xoay khớp thân uốn liền,
// không hở kẽ như khối gắn cứng. `wrap` dựng đồ ôm sát thân (vòng tay, xà cạp, đai, khố, băng đầu).

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export type V3 = [number, number, number];
/** Trường khoảng cách có dấu: âm ở trong, dương ở ngoài, gần bằng khoảng cách tới mặt. */
export type Sdf = (x: number, y: number, z: number) => number;

// ---------- Hình cơ bản ----------

/** Ma trận xoay ngược (3×3, theo hàng) của góc Euler như THREE.Euler; null nếu không xoay. */
function invRot(rot?: V3): number[] | null {
  if (!rot || (rot[0] === 0 && rot[1] === 0 && rot[2] === 0)) return null;
  const e = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)).invert().elements;
  return [e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]];
}

export function sphere(c: V3, r: number): Sdf {
  const [cx, cy, cz] = c;
  return (x, y, z) => Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) - r;
}

/** Bầu dục bán kính `r` theo ba trục, xoay `rot` quanh tâm (gần đúng kiểu Inigo Quilez). */
export function ellipsoid(c: V3, r: V3, rot?: V3): Sdf {
  const [cx, cy, cz] = c;
  const [a, b, d] = r;
  const a2 = a * a;
  const b2 = b * b;
  const d2 = d * d;
  const m = invRot(rot);
  const small = Math.min(a, b, d);
  return (x, y, z) => {
    let px = x - cx;
    let py = y - cy;
    let pz = z - cz;
    if (m) {
      const qx = m[0] * px + m[1] * py + m[2] * pz;
      const qy = m[3] * px + m[4] * py + m[5] * pz;
      pz = m[6] * px + m[7] * py + m[8] * pz;
      px = qx;
      py = qy;
    }
    const k0 = Math.sqrt((px / a) ** 2 + (py / b) ** 2 + (pz / d) ** 2);
    const k1 = Math.sqrt((px / a2) ** 2 + (py / b2) ** 2 + (pz / d2) ** 2);
    return k1 < 1e-9 ? -small : (k0 * (k0 - 1)) / k1;
  };
}

/** Viên nang thuôn: đầu `a` bán kính `ra`, đầu `b` bán kính `rb` (bắp tay, bắp chân, cổ). */
export function cone(a: V3, b: V3, ra: number, rb: number): Sdf {
  const [ax, ay, az] = a;
  const bax = b[0] - ax;
  const bay = b[1] - ay;
  const baz = b[2] - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = ra - rb;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  return (x, y, z) => {
    const pax = x - ax;
    const pay = y - ay;
    const paz = z - az;
    const yv = pax * bax + pay * bay + paz * baz;
    const zv = yv - l2;
    const qx = pax * l2 - bax * yv;
    const qy = pay * l2 - bay * yv;
    const qz = paz * l2 - baz * yv;
    const x2 = qx * qx + qy * qy + qz * qz;
    const y2 = yv * yv * l2;
    const z2 = zv * zv * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zv) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
    if (Math.sign(yv) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
    return (Math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - ra;
  };
}

/** Hộp bo góc: nửa cạnh `half`, bo `round`, xoay `rot` quanh tâm. */
export function roundBox(c: V3, half: V3, round: number, rot?: V3): Sdf {
  const [cx, cy, cz] = c;
  const m = invRot(rot);
  const hx = half[0] - round;
  const hy = half[1] - round;
  const hz = half[2] - round;
  return (x, y, z) => {
    let px = x - cx;
    let py = y - cy;
    let pz = z - cz;
    if (m) {
      const qx = m[0] * px + m[1] * py + m[2] * pz;
      const qy = m[3] * px + m[4] * py + m[5] * pz;
      pz = m[6] * px + m[7] * py + m[8] * pz;
      px = qx;
      py = qy;
    }
    const qx = Math.abs(px) - hx;
    const qy = Math.abs(py) - hy;
    const qz = Math.abs(pz) - hz;
    const out = Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2 + Math.max(qz, 0) ** 2);
    return out + Math.min(Math.max(qx, qy, qz), 0) - round;
  };
}

/** Hợp mềm hai khoảng cách: chỗ hai khối gần nhau trong `k` thì đắp thêm cho liền, như nặn đất. */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export const smax = (a: number, b: number, k: number): number => -smin(-a, -b, k);

/** Hợp mềm nhiều khối theo thứ tự. */
export function blend(k: number, ...fs: Sdf[]): Sdf {
  return (x, y, z) => {
    let d = fs[0](x, y, z);
    for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y, z), k);
    return d;
  };
}

/** Khối `f` bị cắt phẳng dưới mặt y = `y0` (đế bàn chân). */
export function flatBelow(f: Sdf, y0: number, k = 0.008): Sdf {
  return (x, y, z) => smax(f(x, y, z), y0 - y, k);
}

/** Khối `f` khoét bớt phần trong `g`. */
export function carve(f: Sdf, g: Sdf, k = 0.01): Sdf {
  return (x, y, z) => smax(f(x, y, z), -g(x, y, z), k);
}

// ---------- Đo trên mặt ----------

const EPS = 1e-4;

/** Pháp tuyến (hướng ra ngoài) ở điểm gần mặt, tính bằng sai phân. */
export function normalAt(f: Sdf, x: number, y: number, z: number, e = 5e-4): V3 {
  const nx = f(x + e, y, z) - f(x - e, y, z);
  const ny = f(x, y + e, z) - f(x, y - e, z);
  const nz = f(x, y, z + e) - f(x, y, z - e);
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

/** Kéo điểm về mặt theo pháp tuyến (vài bước Newton). */
export function project(f: Sdf, p: V3, steps = 3): V3 {
  let [x, y, z] = p;
  for (let i = 0; i < steps; i++) {
    const d = f(x, y, z);
    if (Math.abs(d) < EPS * 0.1) break;
    const e = 5e-4;
    const gx = (f(x + e, y, z) - f(x - e, y, z)) / (2 * e);
    const gy = (f(x, y + e, z) - f(x, y - e, z)) / (2 * e);
    const gz = (f(x, y, z + e) - f(x, y, z - e)) / (2 * e);
    const g2 = gx * gx + gy * gy + gz * gz;
    if (g2 < 1e-12) break;
    x -= (d * gx) / g2;
    y -= (d * gy) / g2;
    z -= (d * gz) / g2;
  }
  return [x, y, z];
}

/**
 * Chỗ tia từ `o` theo hướng `d` (đã chuẩn hóa) chạm mặt lần đầu, đi tối đa `max`; không chạm thì null.
 * Dùng để đặt mắt, gương đồng hộ tâm đúng trên mặt cong.
 */
export function hit(f: Sdf, o: V3, d: V3, max = 2): V3 | null {
  let t = 0;
  for (let i = 0; i < 128 && t < max; i++) {
    const p: V3 = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
    const v = f(...p);
    if (v < EPS) return project(f, p, 2);
    t += Math.max(v * 0.9, EPS);
  }
  return null;
}

/**
 * Bán kính của mặt quanh trục: từ điểm `c` theo hướng `d` (vuông góc trục), đi từ `rmax` vào trong tới khi chạm mặt
 * ngoài cùng. Không chạm thì 0.
 */
export function radiusAt(f: Sdf, c: V3, d: V3, rmax: number): number {
  let t = rmax;
  for (let i = 0; i < 96 && t > 0; i++) {
    const v = f(c[0] + d[0] * t, c[1] + d[1] * t, c[2] + d[2] * t);
    if (v < EPS) return t;
    t -= Math.max(v * 0.9, EPS);
  }
  return 0;
}

// ---------- Chia lưới ----------

/** Lưới tam giác có chỉ mục, tọa độ phẳng [x, y, z, ...]. */
interface RawMesh {
  pos: number[];
  tri: number[];
}

/**
 * Surface nets: lấy mẫu trường trên lưới ô vuông cạnh `cell` trong hộp `min`..`max`, mỗi ô cắt mặt cho một đỉnh
 * (trung bình các điểm cắt trên cạnh ô, rồi kéo về mặt), mỗi cạnh lưới cắt mặt cho một tứ giác. Lưới đặt đối xứng
 * quanh tâm hộp, nên hình đối xứng trái phải ra lưới đối xứng.
 */
export function surfaceNets(f: Sdf, min: V3, max: V3, cell: number): RawMesh {
  const n = [0, 1, 2].map((a) => Math.ceil((max[a] - min[a]) / cell) + 1);
  const o = [0, 1, 2].map((a) => (min[a] + max[a]) / 2 - ((n[a] - 1) * cell) / 2);
  const [nx, ny, nz] = n;
  const val = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) val[i + nx * (j + ny * k)] = f(o[0] + i * cell, o[1] + j * cell, o[2] + k * cell);
  const cx = nx - 1;
  const cy = ny - 1;
  const cellVert = new Int32Array(cx * cy * (nz - 1)).fill(-1);
  const pos: number[] = [];
  // Tám góc ô: bit 0 là x, bit 1 là y, bit 2 là z. Mười hai cạnh ô.
  const EDGES = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const v = new Float64Array(8);
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const s = val[i + (c & 1) + nx * (j + ((c >> 1) & 1) + ny * (k + (c >> 2)))];
          v[c] = s;
          if (s < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let cnt = 0;
        for (const [a, b] of EDGES) {
          if ((v[a] < 0) === (v[b] < 0)) continue;
          const t = v[a] / (v[a] - v[b]);
          sx += (a & 1) + t * ((b & 1) - (a & 1));
          sy += ((a >> 1) & 1) + t * (((b >> 1) & 1) - ((a >> 1) & 1));
          sz += (a >> 2) + t * ((b >> 2) - (a >> 2));
          cnt++;
        }
        const p = project(f, [o[0] + (i + sx / cnt) * cell, o[1] + (j + sy / cnt) * cell, o[2] + (k + sz / cnt) * cell], 3);
        cellVert[i + cx * (j + cy * k)] = pos.length / 3;
        pos.push(...p);
      }
  const tri: number[] = [];
  const cv = (i: number, j: number, k: number) => cellVert[i + cx * (j + cy * k)];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) [b, d] = [d, b];
    // Chia theo đường chéo ngắn hơn cho tam giác đỡ méo.
    const d1 = dist2(pos, a, c);
    const d2 = dist2(pos, b, d);
    if (d1 <= d2) tri.push(a, b, c, a, c, d);
    else tri.push(a, b, d, b, c, d);
  };
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const inside = val[i + nx * (j + ny * k)] < 0;
        if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && inside !== val[i + 1 + nx * (j + ny * k)] < 0)
          quad(cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k), !inside);
        if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && inside !== val[i + nx * (j + 1 + ny * k)] < 0)
          quad(cv(i - 1, j, k - 1), cv(i - 1, j, k), cv(i, j, k), cv(i, j, k - 1), !inside);
        if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && inside !== val[i + nx * (j + ny * (k + 1))] < 0)
          quad(cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k), !inside);
      }
  return { pos, tri };
}

function dist2(pos: number[], a: number, b: number): number {
  return (pos[a * 3] - pos[b * 3]) ** 2 + (pos[a * 3 + 1] - pos[b * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[b * 3 + 2]) ** 2;
}

/**
 * Giảm số tam giác bằng gộp cạnh theo sai số bậc hai (Garland–Heckbert) tới khi còn chừng `target` tam giác: chỗ
 * phẳng gộp thưa, chỗ cong (khớp, ngón, mép) giữ dày. Không gộp cạnh làm lật mặt hay làm méo tam giác quá. Lưới
 * surface nets mịn đều khắp nơi, nên gộp bớt cho nhẹ mà dáng không đổi.
 */
export function simplify(mesh: RawMesh, target: number): RawMesh {
  const nv = mesh.pos.length / 3;
  const pos = mesh.pos.slice();
  const faces: number[][] = [];
  for (let i = 0; i < mesh.tri.length; i += 3) faces.push([mesh.tri[i], mesh.tri[i + 1], mesh.tri[i + 2]]);
  const alive = faces.map(() => true);
  let count = faces.length;
  if (count <= target) return mesh;
  const vf: Set<number>[] = Array.from({ length: nv }, () => new Set());
  faces.forEach((f, i) => f.forEach((v) => vf[v].add(i)));
  const Q = Array.from({ length: nv }, () => new Float64Array(10));
  const P = (v: number): V3 => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
  const plane = (f: number[]) => {
    const n = faceNormal(P(f[0]), P(f[1]), P(f[2]));
    const l = Math.hypot(...n);
    if (l < 1e-12) return null;
    const a = n[0] / l;
    const b = n[1] / l;
    const c = n[2] / l;
    const p = P(f[0]);
    return [a, b, c, -(a * p[0] + b * p[1] + c * p[2]), l / 2] as const;
  };
  let areaSum = 0;
  faces.forEach((f) => {
    const pl = plane(f);
    if (!pl) return;
    areaSum += pl[4];
    const [a, b, c, d, area] = pl;
    const q = [a * a, a * b, a * c, a * d, b * b, b * c, b * d, c * c, c * d, d * d];
    for (const v of f) for (let k = 0; k < 10; k++) Q[v][k] += q[k] * area;
  });
  const err = (q: Float64Array, x: number, y: number, z: number) =>
    q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x + q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y + q[7] * z * z + 2 * q[8] * z + q[9];
  const meanArea = areaSum / faces.length;
  const version = new Int32Array(nv);
  const gone = new Uint8Array(nv);
  // Đống nhỏ nhất: [chi phí, u, v, x, y, z, phiên bản u, phiên bản v].
  const heap: number[][] = [];
  const push = (e: number[]) => {
    heap.push(e);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const consider = (u: number, v: number) => {
    const q = new Float64Array(10);
    for (let k = 0; k < 10; k++) q[k] = Q[u][k] + Q[v][k];
    const a = P(u);
    const b = P(v);
    let best: V3 = a;
    let cost = Infinity;
    for (const p of [a, b, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] as V3]) {
      const e = err(q, ...p);
      if (e < cost) {
        cost = e;
        best = p;
      }
    }
    // Ưu tiên gộp cạnh ngắn khi sai số ngang nhau, để tam giác đều.
    cost += 0.02 * meanArea * dist2v(a, b);
    push([cost, u, v, ...best, version[u], version[v]]);
  };
  const seen = new Set<string>();
  faces.forEach((f) => {
    for (let k = 0; k < 3; k++) {
      const u = Math.min(f[k], f[(k + 1) % 3]);
      const v = Math.max(f[k], f[(k + 1) % 3]);
      const key = `${u},${v}`;
      if (seen.has(key)) continue;
      seen.add(key);
      consider(u, v);
    }
  });
  const quality = (a: V3, b: V3, c: V3) => {
    const n = Math.hypot(...faceNormal(a, b, c));
    const l = dist2v(a, b) + dist2v(b, c) + dist2v(c, a);
    return l > 0 ? (n * 3.4641) / l : 0;
  };
  while (count > target && heap.length) {
    const [, u, v, x, y, z, vu, vv] = pop();
    if (gone[u] || gone[v] || version[u] !== vu || version[v] !== vv) continue;
    // Đỉnh chung của hai đầu cạnh chỉ được là hai đỉnh của hai mặt kề cạnh (giữ lưới đa tạp).
    const nu = new Set<number>();
    for (const fi of vf[u]) for (const w of faces[fi]) if (w !== u) nu.add(w);
    let shared = 0;
    for (const fi of vf[v]) for (const w of faces[fi]) if (w !== v && nu.has(w)) shared++;
    let common = 0;
    for (const fi of vf[u]) if (faces[fi].includes(v)) common++;
    if (shared / 2 > common) continue;
    // Không lật mặt, không ra tam giác quá méo.
    let ok = true;
    for (const w of [u, v]) {
      for (const fi of vf[w]) {
        const f = faces[fi];
        if (f.includes(u) && f.includes(v)) continue;
        const before = f.map(P) as [V3, V3, V3];
        const after = f.map((t) => (t === u || t === v ? ([x, y, z] as V3) : P(t))) as [V3, V3, V3];
        const n0 = faceNormal(...before);
        const n1 = faceNormal(...after);
        const l0 = Math.hypot(...n0);
        const l1 = Math.hypot(...n1);
        if (l1 < 1e-12 || (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]) / (l0 * l1) < 0.5 || quality(...after) < 0.2) {
          ok = false;
          break;
        }
      }
      if (!ok) break;
    }
    if (!ok) continue;
    // Gộp v vào u.
    pos[u * 3] = x;
    pos[u * 3 + 1] = y;
    pos[u * 3 + 2] = z;
    for (let k = 0; k < 10; k++) Q[u][k] += Q[v][k];
    gone[v] = 1;
    for (const fi of vf[v]) {
      const f = faces[fi];
      if (f.includes(u)) {
        alive[fi] = false;
        count--;
        for (const w of f) if (w !== v) vf[w].delete(fi);
      } else {
        f[f.indexOf(v)] = u;
        vf[u].add(fi);
      }
    }
    vf[v].clear();
    version[u]++;
    const near = new Set<number>();
    for (const fi of vf[u]) for (const w of faces[fi]) if (w !== u) near.add(w);
    for (const w of near) consider(Math.min(u, w), Math.max(u, w));
    // Phiên bản của đỉnh lân cận đổi theo u, nên tính lại cạnh của chúng với u ở trên là đủ.
  }
  const remap = new Int32Array(nv).fill(-1);
  const outPos: number[] = [];
  const outTri: number[] = [];
  faces.forEach((f, i) => {
    if (!alive[i]) return;
    for (const v of f) {
      if (remap[v] < 0) {
        remap[v] = outPos.length / 3;
        outPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
      }
      outTri.push(remap[v]);
    }
  });
  return { pos: outPos, tri: outTri };
}

/**
 * Lưới tỏa từ tâm `c`: mỗi đỉnh của khối hai mươi mặt chia `detail` lần đi từ `rmax` vào tâm tới khi chạm mặt
 * ngoài cùng. Hợp cho hình quanh một tâm (đầu, tóc, búi): số mặt đều, ít hơn surface nets cùng độ mịn.
 * `front` dồn đỉnh về phía +z (mặt) cho mắt, mũi, má rõ hơn.
 */
export function radialMesh(f: Sdf, c: V3, detail: number, rmax: number, front = 0): RawMesh {
  const ico = new THREE.IcosahedronGeometry(1, detail);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  const g = mergeVertices(ico, 1e-6);
  ico.dispose();
  const p = g.getAttribute('position');
  const pos: number[] = [];
  const d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i);
    if (front) d.z += front * (1 - d.z * d.z) * 0.5;
    d.normalize();
    const r = radiusAt(f, c, [d.x, d.y, d.z], rmax);
    pos.push(c[0] + d.x * r, c[1] + d.y * r, c[2] + d.z * r);
  }
  const tri = Array.from(g.index!.array);
  g.dispose();
  return { pos, tri };
}

// ---------- Đất nặn: hình, vùng màu, xương ----------

interface Part {
  bone: string;
  f: Sdf;
  /** Độ hòa với các khối trước. */
  k: number;
  /** Khoét bớt thay vì đắp thêm. */
  sub: boolean;
  /** Chỉ hòa mềm trong vùng quanh điểm này (ngoài vùng thì nối cứng), để tay không dính vào sườn. */
  near?: { c: V3; r: number; fade: number };
  /** Trọng số pha dọc đoạn `a`→`b` từ xương của khối sang xương `bone`. */
  to?: { bone: string; a: V3; b: V3 };
  /** Bề rộng vùng pha trọng số với khối kề. */
  w: number;
  /** Nhóm riêng: khối khác nhóm (cũng có nhóm) không góp trọng số vào đây (đùi trái, đùi phải sát nhau). */
  apart?: string;
  /** Ma trận xoay ngược từ tư thế nặn về tư thế gốc (3×4, theo hàng), null nếu xương không xoay. */
  inv: number[] | null;
}

/** Hòa các khối theo thứ tự đắp, khoét: khoảng cách tại một điểm ở tư thế nặn. */
function blendParts(parts: readonly Part[], x: number, y: number, z: number): number {
  let d = Infinity;
  for (const p of parts) {
    const di = evalAt(p.f, p.inv, x, y, z);
    let k = p.k;
    if (p.near) {
      const r = Math.hypot(x - p.near.c[0], y - p.near.c[1], z - p.near.c[2]);
      k *= 1 - THREE.MathUtils.smoothstep(r, p.near.r, p.near.r + p.near.fade);
    }
    d = p.sub ? smax(d, -di, k) : d === Infinity ? di : smin(d, di, k);
  }
  return d;
}

/** Một lớp màu tô lên đất nặn (`Clay.layer`). */
export interface Paint {
  f: Sdf;
  color: number;
  inv: number[] | null;
  /** Số lần chia nhỏ tam giác quanh biên trước khi cắt, cho nét nhỏ (mắt, đốm sáng) tròn trịa. */
  fine: number;
}

export interface PartOpts {
  k?: number;
  near?: { c: V3; r: number; fade?: number };
  to?: { bone: string; a: V3; b: V3 };
  w?: number;
  apart?: string;
}

/** Hình đã nặn xong, ở tư thế gốc: tam giác rời, mỗi đỉnh màu, pháp tuyến và tới bốn xương. */
export interface ClayMesh {
  pos: Float32Array;
  nor: Float32Array;
  col: Float32Array;
  /** Tên xương mà `skin` trỏ tới. */
  bones: string[];
  skin: Uint16Array;
  weight: Float32Array;
}

export type MeshSpec = { kind: 'nets'; min: V3; max: V3; cell: number; /** Gộp bớt còn chừng này tam giác. */ target?: number } | { kind: 'radial'; c: V3; detail: number; rmax: number; front?: number };

function mat34(m: THREE.Matrix4): number[] {
  const e = m.elements;
  return [e[0], e[4], e[8], e[12], e[1], e[5], e[9], e[13], e[2], e[6], e[10], e[14]];
}

/**
 * Một khối đất nặn: các khối đắp (gắn với xương) hòa vào nhau, các lớp màu tô lên. Khối của xương có trong `pose` được
 * nặn ở tư thế khác tư thế gốc (vd. tay dang ra cho khỏi dính vào sườn), rồi đổi về tư thế gốc theo trọng số.
 */
export class Clay {
  private readonly parts: Part[] = [];
  private readonly paints: Paint[] = [];
  private readonly hides: { f: Sdf; inv: number[] | null }[] = [];
  private readonly fwd = new Map<string, THREE.Matrix4>();
  private readonly back = new Map<string, number[]>();
  /** Hình đã dựng (trước khi tô) theo cách dựng, và đỉnh đã tính (pháp tuyến, trọng số): tô màu khác thì dùng lại. */
  private readonly shaped = new Map<string, Tri[]>();
  private readonly verts = new Map<string, Vert>();

  /** `base`: màu da; `pose`: ma trận từ tư thế gốc sang tư thế nặn của từng xương. */
  constructor(
    private readonly base: number,
    pose: Record<string, THREE.Matrix4> = {},
  ) {
    for (const [b, m] of Object.entries(pose)) {
      this.fwd.set(b, m.clone());
      this.back.set(b, mat34(m.clone().invert()));
    }
  }

  /** Đắp khối `f` (tọa độ tư thế gốc) gắn với xương `bone`. */
  add(bone: string, f: Sdf, o: PartOpts = {}): this {
    const k = o.k ?? 0.02;
    this.parts.push({
      bone,
      f,
      k,
      sub: false,
      near: o.near && { c: this.toSculpt(bone, o.near.c), r: o.near.r, fade: o.near.fade ?? 0.03 },
      to: o.to,
      w: o.w ?? Math.max(k, 0.015),
      apart: o.apart,
      inv: this.back.get(bone) ?? null,
    });
    return this;
  }

  /** Bỏ tam giác nằm trọn trong `f` (phần thân bị áo, khố che kín), cho nhẹ máy. */
  hide(bone: string, f: Sdf): this {
    this.hides.push({ f, inv: this.back.get(bone) ?? null });
    return this;
  }

  /** Khoét bớt khối `f` (hốc mắt, kẽ ngón). */
  sub(bone: string, f: Sdf, k = 0.01): this {
    this.parts.push({ bone, f, k, sub: true, w: 0, inv: this.back.get(bone) ?? null });
    return this;
  }

  /** Tô màu `color` lên phần mặt nằm trong `f` (tọa độ tư thế gốc của xương `bone`). Lớp sau đè lớp trước. */
  paint(bone: string, f: Sdf, color: number, fine = 0): this {
    this.paints.push(this.layer(bone, f, color, fine));
    return this;
  }

  /** Một lớp màu như `paint` mà không giữ lại: truyền vào `build` để tô riêng cho một dáng. */
  layer(bone: string, f: Sdf, color: number, fine = 0): Paint {
    return { f, color, inv: this.back.get(bone) ?? null, fine };
  }

  private toSculpt(bone: string, p: V3): V3 {
    const m = this.fwd.get(bone);
    if (!m) return p;
    const v = new THREE.Vector3(...p).applyMatrix4(m);
    return [v.x, v.y, v.z];
  }

  /** Khoảng cách ở tư thế nặn. */
  readonly dist: Sdf = (x, y, z) => blendParts(this.parts, x, y, z);

  /** Trường khoảng cách chỉ gồm các khối của những xương này (vd. hông và chân để may khố, không chạm tay buông bên hông). */
  only(bones: readonly string[]): Sdf {
    const parts = this.parts.filter((p) => bones.includes(p.bone));
    return (x, y, z) => blendParts(parts, x, y, z);
  }

  /** Trường khoảng cách nhìn từ tư thế gốc của xương `bone`: dựng đồ gắn cứng vào xương ấy (vòng tay, xà cạp). */
  field(bone: string): Sdf {
    const m = this.fwd.get(bone);
    if (!m) return this.dist;
    const e = mat34(m);
    return (x, y, z) => this.dist(e[0] * x + e[1] * y + e[2] * z + e[3], e[4] * x + e[5] * y + e[6] * z + e[7], e[8] * x + e[9] * y + e[10] * z + e[11]);
  }

  /** Trọng số xương ở điểm (tư thế nặn): khối gần nhất nặng nhất, khối kề trong vùng pha `w` góp phần. */
  private weights(x: number, y: number, z: number): Map<string, number> {
    const ds: number[] = [];
    let dmin = Infinity;
    for (const p of this.parts) {
      const d = p.sub ? Infinity : evalAt(p.f, p.inv, x, y, z);
      ds.push(d);
      if (d < dmin) dmin = d;
    }
    const out = new Map<string, number>();
    const put = (b: string, w: number) => out.set(b, (out.get(b) ?? 0) + w);
    const own = this.parts[ds.indexOf(dmin)]?.apart;
    this.parts.forEach((p, i) => {
      if (p.sub) return;
      if (own && p.apart && p.apart !== own) return;
      const s = Math.max(0, 1 - (ds[i] - dmin) / p.w) ** 2;
      if (s <= 0) return;
      if (!p.to) return put(p.bone, s);
      // Điểm ở tư thế gốc của xương khối, chiếu lên đoạn a→b.
      const [bx, by, bz] = p.inv ? apply34(p.inv, x, y, z) : [x, y, z];
      const { a, b } = p.to;
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const t = ((bx - a[0]) * ab[0] + (by - a[1]) * ab[1] + (bz - a[2]) * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2);
      const u = THREE.MathUtils.smoothstep(t, 0, 1);
      put(p.bone, s * (1 - u));
      put(p.to.bone, s * u);
    });
    return out;
  }

  /** Lưới mặt (trước khi tô), dựng một lần cho mỗi cách dựng. */
  private shape(spec: MeshSpec): Tri[] {
    const key = JSON.stringify(spec);
    const done = this.shaped.get(key);
    if (done) return done;
    const f = this.dist;
    let raw = spec.kind === 'nets' ? surfaceNets(f, spec.min, spec.max, spec.cell) : radialMesh(f, spec.c, spec.detail, spec.rmax, spec.front);
    if (spec.kind === 'nets' && spec.target) {
      raw = simplify(raw, spec.target);
      // Đỉnh đã gộp kéo lại về mặt.
      for (let i = 0; i < raw.pos.length; i += 3) raw.pos.splice(i, 3, ...project(f, [raw.pos[i], raw.pos[i + 1], raw.pos[i + 2]], 2));
    }
    // Tam giác rời, mỗi tam giác một màu; lật tam giác quay vào trong.
    let tris: Tri[] = [];
    for (let i = 0; i < raw.tri.length; i += 3) {
      const [a, b, c] = [raw.tri[i], raw.tri[i + 1], raw.tri[i + 2]].map((v): V3 => [raw.pos[v * 3], raw.pos[v * 3 + 1], raw.pos[v * 3 + 2]]);
      const n = faceNormal(a, b, c);
      const m: V3 = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      const g = normalAt(f, ...m);
      tris.push(n[0] * g[0] + n[1] * g[1] + n[2] * g[2] < 0 ? { p: [a, c, b], color: this.base } : { p: [a, b, c], color: this.base });
    }
    if (this.hides.length) {
      const hidden = (p: V3) => this.hides.some((h) => evalAt(h.f, h.inv, ...p) < 0);
      tris = tris.filter((t) => !t.p.every(hidden));
    }
    this.shaped.set(key, tris);
    return tris;
  }

  /**
   * Dựng hình ở tư thế gốc, tô các lớp màu đã `paint` rồi tới `extra`. Gọi lại với lớp màu khác thì dùng lại lưới và
   * các đỉnh đã tính, chỉ cắt màu lại (một thân nặn, nhiều cách ăn mặc).
   */
  build(spec: MeshSpec, extra: readonly Paint[] = []): ClayMesh {
    const f = this.dist;
    let tris = this.shape(spec);
    for (const paint of [...this.paints, ...extra]) {
      const g: Sdf = (x, y, z) => evalAt(paint.f, paint.inv, x, y, z);
      for (let i = 0; i < paint.fine; i++) tris = refine(tris, g);
      tris = cutPaint(tris, g, paint.color);
    }
    // Đỉnh: pháp tuyến theo trường, trọng số xương, rồi đổi về tư thế gốc.
    const boneNames: string[] = [];
    const boneIndex = (b: string) => {
      let i = boneNames.indexOf(b);
      if (i < 0) i = boneNames.push(b) - 1;
      return i;
    };
    const nv = tris.length * 3;
    const pos = new Float32Array(nv * 3);
    const nor = new Float32Array(nv * 3);
    const col = new Float32Array(nv * 3);
    const skin = new Uint16Array(nv * 4);
    const weight = new Float32Array(nv * 4);
    const cache = this.verts;
    const color = new THREE.Color();
    let v = 0;
    for (const t of tris) {
      color.set(t.color);
      for (const p of t.p) {
        const key = `${p[0].toFixed(6)},${p[1].toFixed(6)},${p[2].toFixed(6)}`;
        let vert = cache.get(key);
        if (!vert) {
          const n = normalAt(f, ...p);
          const ws = [...this.weights(...p)].sort((a, b) => b[1] - a[1]).slice(0, 4);
          const sum = ws.reduce((s, [, w]) => s + w, 0) || 1;
          // Đổi về tư thế gốc: trung bình có trọng số các phép ngược của từng xương.
          const bp: V3 = [0, 0, 0];
          const bn: V3 = [0, 0, 0];
          for (const [b, w0] of ws) {
            const w = w0 / sum;
            const m = this.back.get(b);
            const q = m ? apply34(m, ...p) : p;
            const r = m ? rot34(m, ...n) : n;
            for (let a = 0; a < 3; a++) {
              bp[a] += q[a] * w;
              bn[a] += r[a] * w;
            }
          }
          const l = Math.hypot(...bn) || 1;
          vert = { p: bp, n: [bn[0] / l, bn[1] / l, bn[2] / l], s: ws.map(([b]) => b), w: ws.map(([, w]) => w / sum) };
          cache.set(key, vert);
        }
        pos.set(vert.p, v * 3);
        nor.set(vert.n, v * 3);
        col.set([color.r, color.g, color.b], v * 3);
        for (let a = 0; a < vert.s.length; a++) {
          skin[v * 4 + a] = boneIndex(vert.s[a]);
          weight[v * 4 + a] = vert.w[a];
        }
        v++;
      }
    }
    return { pos, nor, col, bones: boneNames, skin, weight };
  }
}

interface Tri {
  p: [V3, V3, V3];
  color: number;
}

/** Một đỉnh đã tính: chỗ và pháp tuyến ở tư thế gốc, tên xương và trọng số. */
interface Vert {
  p: V3;
  n: V3;
  s: string[];
  w: number[];
}

function evalAt(f: Sdf, m: number[] | null, x: number, y: number, z: number): number {
  if (!m) return f(x, y, z);
  return f(m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]);
}

function apply34(m: number[], x: number, y: number, z: number): V3 {
  return [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]];
}

function rot34(m: number[], x: number, y: number, z: number): V3 {
  return [m[0] * x + m[1] * y + m[2] * z, m[4] * x + m[5] * y + m[6] * z, m[8] * x + m[9] * y + m[10] * z];
}

function faceNormal(a: V3, b: V3, c: V3): V3 {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
}

function edgeKey(a: V3, b: V3): [string, boolean] {
  const flip = a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])));
  return [flip ? `${b.join()}|${a.join()}` : `${a.join()}|${b.join()}`, flip];
}

/**
 * Chia bốn các tam giác vắt qua hay nằm sát biên vùng `g` (trung điểm nằm trên cạnh, nên không hở kẽ với tam giác
 * bên cạnh chưa chia), để nét nhỏ hơn tam giác (đốm sáng trong mắt) vẫn hiện và mép tròn.
 */
function refine(tris: Tri[], g: Sdf): Tri[] {
  const out: Tri[] = [];
  const memo = new Map<string, V3>();
  const mid = (a: V3, b: V3): V3 => {
    const [key] = edgeKey(a, b);
    let m = memo.get(key);
    if (!m) {
      m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      memo.set(key, m);
    }
    return m;
  };
  for (const t of tris) {
    const [a, b, c] = t.p;
    const gs = t.p.map((p) => g(...p));
    const m: V3 = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    const size = Math.sqrt(Math.max(dist2v(a, b), dist2v(b, c), dist2v(c, a)));
    const straddle = gs.some((x) => x < 0) && gs.some((x) => x >= 0);
    if (!straddle && Math.abs(g(...m)) > size * 0.6) {
      out.push(t);
      continue;
    }
    const ab = mid(a, b);
    const bc = mid(b, c);
    const ca = mid(c, a);
    out.push({ p: [a, ab, ca], color: t.color }, { p: [ab, b, bc], color: t.color }, { p: [ca, bc, c], color: t.color }, { p: [ab, bc, ca], color: t.color });
  }
  return out;
}

const dist2v = (a: V3, b: V3) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/**
 * Tô một lớp màu: tam giác nằm trọn trong vùng (`g` < 0) đổi màu, tam giác vắt qua biên thì cắt đôi đúng chỗ `g` = 0,
 * nên mép màu chạy mượt theo biên chứ không răng cưa theo tam giác. Điểm cắt nằm trên cạnh, không hở kẽ.
 */
function cutPaint(tris: Tri[], g: Sdf, color: number): Tri[] {
  const out: Tri[] = [];
  const memo = new Map<string, V3>();
  const cross = (a: V3, b: V3, ga: number, gb: number): V3 => {
    // Cùng một cạnh thì cùng một điểm cắt, dù tam giác nào hỏi trước.
    const [key, flip] = edgeKey(a, b);
    const [p, q, gp, gq] = flip ? [b, a, gb, ga] : [a, b, ga, gb];
    let r = memo.get(key);
    if (!r) {
      const t = gp / (gp - gq);
      r = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
      memo.set(key, r);
    }
    return r;
  };
  for (const t of tris) {
    const gs = t.p.map((p) => g(...p));
    const ins = gs.map((x) => x < 0);
    const n = ins.filter(Boolean).length;
    if (n === 0) {
      out.push(t);
      continue;
    }
    if (n === 3) {
      out.push({ p: t.p, color });
      continue;
    }
    // Đỉnh lẻ loi (khác phía hai đỉnh kia) đưa lên đầu, giữ chiều quay.
    const lone = n === 1 ? ins.indexOf(true) : ins.indexOf(false);
    const a = t.p[lone];
    const b = t.p[(lone + 1) % 3];
    const c = t.p[(lone + 2) % 3];
    const ga = gs[lone];
    const gb = gs[(lone + 1) % 3];
    const gc = gs[(lone + 2) % 3];
    const ab = cross(a, b, ga, gb);
    const ac = cross(a, c, ga, gc);
    const loneColor = ins[lone] ? color : t.color;
    const restColor = ins[lone] ? t.color : color;
    out.push({ p: [a, ab, ac], color: loneColor }, { p: [ab, b, c], color: restColor }, { p: [ab, c, ac], color: restColor });
  }
  return out;
}

/** Hình đã nặn thành BufferGeometry (tam giác rời) có `skinIndex` trỏ vào `mesh.bones`. */
export function clayGeometry(mesh: ClayMesh): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(mesh.pos.slice(), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(mesh.nor.slice(), 3));
  g.setAttribute('color', new THREE.BufferAttribute(mesh.col.slice(), 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(mesh.skin.slice(), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(mesh.weight.slice(), 4));
  return g;
}

// ---------- Đồ ôm sát thân ----------

export interface WrapOpts {
  /** Trục: từ `a` tới `b` (tọa độ mô hình). */
  a: V3;
  b: V3;
  /** Đoạn trên trục, 0..1 (t1 có thể đổi theo góc: vạt khố buông dài trước sau). */
  t0: number;
  t1: number | ((theta: number) => number);
  /** Số mặt quanh và số vòng dọc trục. */
  seg: number;
  rings: number;
  /** Bán kính ở mỗi chỗ, từ bán kính mặt thân `rs` (0 nếu trục không chạm thân). Mặc định ôm sát thêm 0,006. */
  radius?: (rs: number, theta: number, t: number) => number;
  /** Bán kính dò mặt tối đa. */
  rmax?: number;
  /** Lặp hoa văn quanh vòng (cho chất liệu có dải hoa văn); bỏ trống là không có uv. */
  uvRepeat?: number;
  /** Hoa văn trải dọc từ `t0` tới chỗ này (mặc định tới cuối); quá đó thì lấy hàng cuối của hoa văn. */
  vEnd?: number;
  /** Mép gấp vào trong ở hai đầu cho thấy bề dày. */
  lip?: number;
  /** Góc 0 hướng theo đâu (mặc định +x với trục đứng). */
  side?: V3;
}

/**
 * Ống ôm theo mặt `f` quanh trục a→b: vòng tay, xà cạp, đai lưng, băng đầu, khố. Mỗi vòng dò bán kính mặt thân ở
 * từng góc rồi nới ra, nên ôm theo bắp tay, bắp chân, eo thật chứ không tròn đều như trụ.
 */
export function wrap(f: Sdf, o: WrapOpts, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const axis = new THREE.Vector3(o.b[0] - o.a[0], o.b[1] - o.a[1], o.b[2] - o.a[2]);
  const len = axis.length();
  axis.normalize();
  const side = new THREE.Vector3(...(o.side ?? [1, 0, 0]));
  side.addScaledVector(axis, -side.dot(axis)).normalize();
  const up = new THREE.Vector3().crossVectors(axis, side).normalize();
  const radius = o.radius ?? ((rs: number) => rs + 0.006);
  const rmax = o.rmax ?? 0.5;
  const t1 = typeof o.t1 === 'number' ? () => o.t1 as number : o.t1;
  const lip = o.lip ?? 0.008;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const cols = o.seg + 1;
  // Hàng 0 và hàng cuối là mép gấp vào trong.
  const rows = o.rings + 3;
  const dir = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let r = 0; r < rows; r++) {
    for (let s = 0; s < cols; s++) {
      const th = (s / o.seg) * Math.PI * 2;
      const tEnd = t1(th);
      const ring = THREE.MathUtils.clamp(r - 1, 0, o.rings);
      const t = o.t0 + ((tEnd - o.t0) * ring) / o.rings;
      c.set(o.a[0], o.a[1], o.a[2]).addScaledVector(axis, t * len);
      dir.copy(side).multiplyScalar(Math.cos(th)).addScaledVector(up, Math.sin(th));
      const rs = radiusAt(f, [c.x, c.y, c.z], [dir.x, dir.y, dir.z], rmax);
      let rr = radius(rs, th, t);
      if (r === 0 || r === rows - 1) rr = Math.max(rr - lip, rs - 0.004, 0.002);
      pos.push(c.x + dir.x * rr, c.y + dir.y * rr, c.z + dir.z * rr);
      const vEnd = o.vEnd ?? tEnd;
      uv.push((s / o.seg) * (o.uvRepeat ?? 1), THREE.MathUtils.clamp(1 - (t - o.t0) / (vEnd - o.t0), 0.004, 1));
    }
  }
  for (let r = 0; r < rows - 1; r++)
    for (let s = 0; s < o.seg; s++) {
      const a = r * cols + s;
      const b = a + cols;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (o.uvRepeat) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Mặt quay ra ngoài trục.
  const n = g.getAttribute('normal');
  const p0 = new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), cols + 1);
  const c0 = new THREE.Vector3(...o.a).addScaledVector(axis, axis.dot(p0.clone().sub(new THREE.Vector3(...o.a))));
  if (new THREE.Vector3().fromBufferAttribute(n, cols + 1).dot(p0.sub(c0)) < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  const out = g.toNonIndexed();
  g.dispose();
  paintGeometry(out, color);
  return out;
}

/** Dải mỏng chạy trên mặt qua các điểm `path` (dây đai chéo ngực, dải lưng): bề ngang `width`, nổi `lift`. */
export function ribbon(f: Sdf, path: V3[], width: number, lift: number, color: THREE.ColorRepresentation, steps = 8): THREE.BufferGeometry {
  // Nội suy đường đi rồi đặt lên mặt.
  const pts: V3[] = [];
  const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
  const n = Math.max(steps, path.length * 2);
  for (let i = 0; i <= n; i++) {
    const p = curve.getPoint(i / n);
    pts.push(project(f, [p.x, p.y, p.z], 3));
  }
  const pos: number[] = [];
  const idx: number[] = [];
  const tan = new THREE.Vector3();
  const nor = new THREE.Vector3();
  const sideV = new THREE.Vector3();
  pts.forEach((p, i) => {
    const q = pts[Math.min(i + 1, pts.length - 1)];
    const r = pts[Math.max(i - 1, 0)];
    tan.set(q[0] - r[0], q[1] - r[1], q[2] - r[2]).normalize();
    nor.set(...normalAt(f, ...p));
    sideV.crossVectors(nor, tan).normalize();
    for (const [s, l] of [
      [-1, -0.004],
      [-1, lift],
      [1, lift],
      [1, -0.004],
    ] as const) {
      pos.push(p[0] + sideV.x * s * width * 0.5 + nor.x * l, p[1] + sideV.y * s * width * 0.5 + nor.y * l, p[2] + sideV.z * s * width * 0.5 + nor.z * l);
    }
  });
  for (let i = 0; i < pts.length - 1; i++)
    for (let k = 0; k < 3; k++) {
      const a = i * 4 + k;
      const b = a + 4;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const out = g.toNonIndexed();
  g.dispose();
  paintGeometry(out, color);
  return out;
}

/** Tô một màu cho mọi đỉnh. */
export function paintGeometry(g: THREE.BufferGeometry, color: THREE.ColorRepresentation): void {
  const c = new THREE.Color(color);
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}

/** Kho hình đã nặn: dựng một lần cho mỗi dáng, lần sau chép ra (nặn tốn vài chục mili giây). */
const store = new Map<string, ClayMesh>();
export function cachedClay(key: string, make: () => ClayMesh): ClayMesh {
  let m = store.get(key);
  if (!m) {
    m = make();
    store.set(key, m);
  }
  return m;
}

/**
 * Tấm mỏng ôm theo mặt quanh điểm `c` (đã nằm trên mặt): đĩa bán kính `r` (hay vành từ `r0` tới `r`), nổi `lift`,
 * có mép dày xuống sát mặt. `uv` phẳng theo đĩa (mặt trống đồng), `up` là hướng lên của hoa văn.
 */
export function decal(
  f: Sdf,
  c: V3,
  o: { r: number; r0?: number; lift: number; seg: number; rings: number; up?: V3 },
  color: THREE.ColorRepresentation,
): THREE.BufferGeometry {
  const n = new THREE.Vector3(...normalAt(f, ...c));
  const up = new THREE.Vector3(...(o.up ?? [0, 1, 0]));
  up.addScaledVector(n, -up.dot(n)).normalize();
  const side = new THREE.Vector3().crossVectors(up, n).normalize();
  const r0 = o.r0 ?? 0;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const cols = o.seg;
  const put = (rho: number, phi: number, lift: number) => {
    const x = Math.cos(phi) * rho;
    const y = Math.sin(phi) * rho;
    const p = project(f, [c[0] + side.x * x + up.x * y, c[1] + side.y * x + up.y * y, c[2] + side.z * x + up.z * y], 3);
    const m = normalAt(f, ...p);
    pos.push(p[0] + m[0] * lift, p[1] + m[1] * lift, p[2] + m[2] * lift);
    uv.push(0.5 + (0.5 * x) / o.r, 0.5 + (0.5 * y) / o.r);
    return pos.length / 3 - 1;
  };
  // Các vòng mặt trên (từ trong ra), rồi vòng mép sát mặt.
  const rings: number[][] = [];
  let center = -1;
  if (r0 === 0) center = put(0, 0, o.lift);
  for (let k = r0 === 0 ? 1 : 0; k <= o.rings; k++) {
    const rho = r0 + ((o.r - r0) * k) / o.rings;
    rings.push(Array.from({ length: cols }, (_, s) => put(rho, (s / cols) * Math.PI * 2, o.lift)));
  }
  const outer = Array.from({ length: cols }, (_, s) => put(o.r, (s / cols) * Math.PI * 2, -0.002));
  const inner = r0 > 0 ? Array.from({ length: cols }, (_, s) => put(r0, (s / cols) * Math.PI * 2, -0.002)) : null;
  const strip = (a: number[], b: number[]) => {
    for (let s = 0; s < cols; s++) {
      const s1 = (s + 1) % cols;
      idx.push(a[s], b[s], a[s1], a[s1], b[s], b[s1]);
    }
  };
  if (center >= 0) for (let s = 0; s < cols; s++) idx.push(center, rings[0][s], rings[0][(s + 1) % cols]);
  for (let k = 0; k < rings.length - 1; k++) strip(rings[k], rings[k + 1]);
  strip(rings[rings.length - 1], outer);
  if (inner) strip(inner, rings[0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // Mặt quay ra ngoài theo pháp tuyến của mặt thân.
  const a = new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), idx[0]);
  const b = new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), idx[1]);
  const d = new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), idx[2]);
  if (b.sub(a).cross(d.sub(a)).dot(n) < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
  }
  g.computeVertexNormals();
  const out = g.toNonIndexed();
  g.dispose();
  paintGeometry(out, color);
  return out;
}

/**
 * Tấm có bề dày theo lưới `P(u, v)` (u ngang 0..1, v dọc 0..1), dày `thick` về phía `inward(u, v)`: vạt khố, lá
 * cờ, vạt áo. Mặt ngoài quay theo chiều ngược `inward`.
 */
export function slab(
  P: (u: number, v: number) => V3,
  inward: (u: number, v: number) => V3,
  nu: number,
  nv: number,
  thick: number,
  color: THREE.ColorRepresentation,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const grid = (off: number) => {
    const start = pos.length / 3;
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        const p = P(i / nu, j / nv);
        const d = inward(i / nu, j / nv);
        pos.push(p[0] + d[0] * off, p[1] + d[1] * off, p[2] + d[2] * off);
      }
    return start;
  };
  const front = grid(0);
  const back = grid(thick);
  const at = (base: number, i: number, j: number) => base + j * (nu + 1) + i;
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const [a, b, c, d] = [at(front, i, j), at(front, i + 1, j), at(front, i + 1, j + 1), at(front, i, j + 1)];
      idx.push(a, b, c, a, c, d);
      const [e, f2, g2, h] = [at(back, i, j), at(back, i + 1, j), at(back, i + 1, j + 1), at(back, i, j + 1)];
      idx.push(e, g2, f2, e, h, g2);
    }
  // Mép bốn cạnh.
  const edge = (pts: [number, number][]) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [i0, j0] = pts[k];
      const [i1, j1] = pts[k + 1];
      const a = at(front, i0, j0);
      const b = at(front, i1, j1);
      const c = at(back, i1, j1);
      const d = at(back, i0, j0);
      idx.push(a, d, c, a, c, b);
    }
  };
  const ring: [number, number][] = [];
  for (let i = 0; i <= nu; i++) ring.push([i, 0]);
  for (let j = 1; j <= nv; j++) ring.push([nu, j]);
  for (let i = nu - 1; i >= 0; i--) ring.push([i, nv]);
  for (let j = nv - 1; j >= 0; j--) ring.push([0, j]);
  edge(ring);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  // Mặt ngoài phải quay ngược hướng `inward`.
  const pa = new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), idx[0]);
  const pb = new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), idx[1]);
  const pc = new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), idx[2]);
  const n = pb.sub(pa).cross(pc.sub(pa));
  if (n.dot(new THREE.Vector3(...inward(0, 0))) > 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
  }
  g.computeVertexNormals();
  const out = g.toNonIndexed();
  g.dispose();
  paintGeometry(out, color);
  return out;
}
