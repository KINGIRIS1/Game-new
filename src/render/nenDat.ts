import * as THREE from 'three';

/**
 * Nền đất dựng liền một khối, kiểu "bờ vát" (chủ dự án chọn qua bản dùng thử so ba kiểu vách đất, bờ vát, lát ô).
 *
 * Mỗi ô chia ba đoạn mỗi chiều ở 0, `RAMP`, 1 − `RAMP`: giữa ô phẳng đúng mặt đất của ô, dải mép rộng `RAMP` dốc
 * thoai thoải xuống ô thấp hơn bên cạnh (dốc nằm trong ô cao, ô thấp giữ phẳng trọn ô). Độ cao mỗi đỉnh lấy theo
 * một luật chung cho cả lưới: đỉnh giữa ô là mặt ô; đỉnh trên mép là mặt thấp nhất trong các ô chung mép, chung góc
 * ấy. Hai ô kề nhau vì thế dùng chung đỉnh mép y hệt, không hở kẽ.
 *
 * Ô giữ phẳng (`flat`: ô có đồ một ô phủ kín ô như đường đi, lũy, đê) không có dốc: phẳng tới mép, ô bên cạnh thấp
 * hơn thì dựng vách đất đứng xuống mặt ô ấy, để đồ trên ô không chìa ra lơ lửng trên dốc.
 *
 * Nền chia mảnh `CHUNK` × `CHUNK` ô, mỗi mảnh một mesh: đổi vài ô (đặt đường, đắp đất) chỉ dựng lại mảnh chứa ô ấy,
 * mảnh ngoài khung nhìn không vẽ.
 */

/** Bề rộng dải dốc ở mép ô cao (phần ô). */
export const RAMP = 0.3;
/** Mặt dốc pha màu đất bao nhiêu (1: toàn đất, 0: toàn cỏ); vách đứng của ô giữ phẳng thì toàn đất. */
export const EARTH = 0.45;
/** Nền dựng nới ra ngoài lưới chừng này ô mỗi phía (ô ngoài lưới mang bậc của ô mép gần nhất). */
export const NEN_MARGIN = 14;
/** Cạnh mỗi mảnh nền (ô). */
const CHUNK = 26;

/** Màu một ô: cỏ loang giữa `lo` và `hi` theo nhiễu (`grassNoise`), dốc pha đất từ `earthFoot` (chân) tới `earthTop`. */
export interface TileColors {
  lo: THREE.Color;
  hi: THREE.Color;
  earthTop: THREE.Color;
  earthFoot: THREE.Color;
}

export interface NenInput {
  grid: number;
  /** Mặt đất của ô trong lưới (tọa độ thế giới), `null` nếu là sông. Ô ngoài lưới lấy theo ô mép gần nhất. */
  top: (x: number, z: number) => number | null;
  /** Đáy sông: mép đất giáp sông dốc xuống tới đây (dưới mặt nước). */
  riverY: number;
  /** Ô giữ phẳng trọn ô, mép dựng vách đứng (chỉ hỏi ô trong lưới). */
  flat: (x: number, z: number) => boolean;
  /** Màu của ô (x, z) (có thể ngoài lưới). */
  colors: (x: number, z: number, out: TileColors) => void;
  /** Tọa độ thế giới của điểm lưới 0 (ô 0 bắt đầu ở đây). */
  origin: number;
  /** Số ô nới ra ngoài lưới mỗi phía (mặc định `NEN_MARGIN`). */
  margin?: number;
}

/** Số ngẫu nhiên 0..1 lặp lại được cho mỗi nút (i, j) theo hạt giống. */
function hash01(seed: number, i: number, j: number): number {
  let t = (Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function valueNoise(seed: number, cell: number): (x: number, z: number) => number {
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x, z) => {
    const fx = x / cell;
    const fz = z / cell;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fade(fx - i);
    const v = fade(fz - j);
    const a = hash01(seed, i, j) + (hash01(seed, i + 1, j) - hash01(seed, i, j)) * u;
    const b = hash01(seed, i, j + 1) + (hash01(seed, i + 1, j + 1) - hash01(seed, i, j + 1)) * u;
    return a + (b - a) * v;
  };
}

const broad = valueNoise(911, 6);
const fine = valueNoise(377, 1.6);

/** Nhiễu màu cỏ 0..1 tại điểm (px, pz) tính theo ô: loang mảng to, lấm tấm mảng nhỏ, liền qua mép ô. */
export function grassNoise(px: number, pz: number): number {
  return broad(px, pz) * 0.7 + fine(px, pz) * 0.3;
}

/** Vị trí bốn đỉnh mỗi chiều trong một ô. */
const OFF = [0, RAMP, 1 - RAMP, 1];

/** Chéo ô con theo cặp đỉnh gần cao bằng nhau hơn: góc lồi thành góc vát, góc lõm chỉ lõm một chút. */
const mainDiagonal = (h00: number, h10: number, h01: number, h11: number) => Math.abs(h00 - h11) <= Math.abs(h10 - h01);

/** Bốn cạnh ô bên cạnh: [dx, dz], kèm cách lấy đỉnh t (0..3) dọc mép chung theo ô này (i, j) và theo ô bên cạnh. */
const SIDES: [number, number, (t: number) => [number, number, number, number]][] = [
  [1, 0, (t) => [3, t, 0, t]],
  [-1, 0, (t) => [0, t, 3, t]],
  [0, 1, (t) => [t, 3, t, 0]],
  [0, -1, (t) => [t, 0, t, 3]],
];

type P3 = [number, number, number];

export class NenDat {
  /** Các mảnh nền. */
  readonly root = new THREE.Group();
  private readonly G: number;
  private readonly LO: number;
  /** Số ô mỗi chiều của khung (cả dải ngoài lưới). */
  private readonly T: number;
  /** Số đỉnh lưới con mỗi chiều. */
  private readonly N: number;
  private readonly chunks: number;
  /** Từng ô trong khung, chỉ số fz · T + fx: mặt đất, sông, giữ phẳng, màu (12 số), màu đã hỏi chưa. */
  private readonly ty: Float32Array;
  private readonly river: Uint8Array;
  private readonly flat: Uint8Array;
  private readonly col: Float32Array;
  private readonly colDone: Uint8Array;
  /** Độ cao chung từng đỉnh lưới con, chỉ số b · N + a. */
  private readonly H: Float32Array;
  /** Nhiễu cỏ từng đỉnh lưới con, tính một lần. */
  private readonly noise: Float32Array;
  private readonly meshes: (THREE.Mesh | null)[];
  private readonly tc: TileColors = { lo: new THREE.Color(), hi: new THREE.Color(), earthTop: new THREE.Color(), earthFoot: new THREE.Color() };
  private readonly sample = new Float32Array(16);

  constructor(
    private readonly input: NenInput,
    private readonly material: THREE.Material,
  ) {
    const M = input.margin ?? NEN_MARGIN;
    this.G = input.grid;
    this.LO = -M;
    this.T = this.G + 2 * M;
    this.N = 3 * this.T + 1;
    this.chunks = Math.ceil(this.T / CHUNK);
    const TT = this.T * this.T;
    this.ty = new Float32Array(TT);
    this.river = new Uint8Array(TT);
    this.flat = new Uint8Array(TT);
    this.col = new Float32Array(TT * 12);
    this.colDone = new Uint8Array(TT);
    this.H = new Float32Array(this.N * this.N);
    this.noise = new Float32Array(this.N * this.N).fill(NaN);
    this.meshes = new Array<THREE.Mesh | null>(this.chunks * this.chunks).fill(null);
    for (let f = 0; f < TT; f++) this.readTile(f);
    this.computeH(0, 0, this.N - 1, this.N - 1);
    for (let c = 0; c < this.meshes.length; c++) this.buildChunk(c);
  }

  /** Các mảnh nền đang có (để chạm chọn ô, để test). */
  get parts(): THREE.Mesh[] {
    return this.meshes.filter((m): m is THREE.Mesh => m !== null);
  }

  /** Báo các ô trong lưới (chỉ số z · grid + x) đã đổi độ cao, đất mở hay giữ phẳng: dựng lại các mảnh quanh đó. */
  update(tiles: Iterable<number>): void {
    const { G, LO, T, N } = this;
    const dirty = new Set<number>();
    let a0 = N;
    let b0 = N;
    let a1 = -1;
    let b1 = -1;
    for (const i of tiles) {
      const x = i % G;
      const z = Math.floor(i / G);
      // Ô mép lưới mang bậc, màu cho cả dải ô ngoài lưới phía ấy.
      const xs = x === 0 ? [LO, 0] : x === G - 1 ? [G - 1, G - 1 - LO] : [x, x];
      const zs = z === 0 ? [LO, 0] : z === G - 1 ? [G - 1, G - 1 - LO] : [z, z];
      for (let fz = zs[0] - LO; fz <= zs[1] - LO && fz < T; fz++) {
        for (let fx = xs[0] - LO; fx <= xs[1] - LO && fx < T; fx++) {
          this.readTile(fz * T + fx);
          a0 = Math.min(a0, 3 * fx);
          b0 = Math.min(b0, 3 * fz);
          a1 = Math.max(a1, 3 * fx + 3);
          b1 = Math.max(b1, 3 * fz + 3);
          // Đỉnh của ô này thuộc cả các ô quanh nó: mảnh chứa các ô ấy đều dựng lại.
          for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ex = fx + dx;
              const ez = fz + dz;
              if (ex >= 0 && ez >= 0 && ex < T && ez < T) dirty.add(Math.floor(ez / CHUNK) * this.chunks + Math.floor(ex / CHUNK));
            }
          }
        }
      }
    }
    if (a1 < 0) return;
    this.computeH(a0, b0, a1, b1);
    for (const c of dirty) this.buildChunk(c);
  }

  /** Mặt đất đúng như đã vẽ ở điểm (px, pz) tính theo ô (trong ô sông là đáy sông). */
  heightAt(px: number, pz: number): number {
    const { LO, T } = this;
    const fx = Math.min(Math.max(Math.floor(px) - LO, 0), T - 1);
    const fz = Math.min(Math.max(Math.floor(pz) - LO, 0), T - 1);
    const h = this.local(fx, fz, this.sample);
    const u = Math.min(Math.max(px - (LO + fx), 0), 1);
    const v = Math.min(Math.max(pz - (LO + fz), 0), 1);
    const i = u < RAMP ? 0 : u < 1 - RAMP ? 1 : 2;
    const j = v < RAMP ? 0 : v < 1 - RAMP ? 1 : 2;
    const fu = (u - OFF[i]) / (OFF[i + 1] - OFF[i]);
    const fv = (v - OFF[j]) / (OFF[j + 1] - OFF[j]);
    const h00 = h[j * 4 + i];
    const h10 = h[j * 4 + i + 1];
    const h01 = h[(j + 1) * 4 + i];
    const h11 = h[(j + 1) * 4 + i + 1];
    if (mainDiagonal(h00, h10, h01, h11)) {
      return fv >= fu ? h00 + fu * (h11 - h01) + fv * (h01 - h00) : h00 + fu * (h10 - h00) + fv * (h11 - h10);
    }
    return fu + fv <= 1 ? h00 + fu * (h10 - h00) + fv * (h01 - h00) : h11 + (1 - fu) * (h01 - h11) + (1 - fv) * (h10 - h11);
  }

  dispose(): void {
    for (const m of this.meshes) m?.geometry.dispose();
    this.root.clear();
  }

  /** Đọc lại mặt đất, sông, giữ phẳng của ô khung f; màu hỏi lại khi dựng. */
  private readTile(f: number): void {
    const { G, LO, T, input } = this;
    const x = LO + (f % T);
    const z = LO + Math.floor(f / T);
    const top = input.top(Math.min(Math.max(x, 0), G - 1), Math.min(Math.max(z, 0), G - 1));
    this.river[f] = top === null ? 1 : 0;
    this.ty[f] = top ?? input.riverY;
    this.flat[f] = top !== null && x >= 0 && z >= 0 && x < G && z < G && input.flat(x, z) ? 1 : 0;
    this.colDone[f] = 0;
  }

  /** Độ cao chung các đỉnh lưới con trong khoảng [a0, a1] × [b0, b1]: mặt thấp nhất trong các ô chứa đỉnh ấy. */
  private computeH(a0: number, b0: number, a1: number, b1: number): void {
    const { T, N, ty, H } = this;
    for (let b = b0; b <= b1; b++) {
      const j = Math.min(Math.floor(b / 3), T - 1);
      const j2 = b % 3 === 0 && b > 0 && b < N - 1 ? j - 1 : j;
      for (let a = a0; a <= a1; a++) {
        const i = Math.min(Math.floor(a / 3), T - 1);
        const i2 = a % 3 === 0 && a > 0 && a < N - 1 ? i - 1 : i;
        H[b * N + a] = Math.min(ty[j * T + i], ty[j * T + i2], ty[j2 * T + i], ty[j2 * T + i2]);
      }
    }
  }

  /** Độ cao 4×4 đỉnh của ô khung (fx, fz) như ô ấy vẽ: ô giữ phẳng thì phẳng trọn ô. */
  private local(fx: number, fz: number, out: Float32Array): Float32Array {
    const { T, N, H } = this;
    const f = fz * T + fx;
    if (this.flat[f]) return out.fill(this.ty[f]);
    const a0 = 3 * fx;
    const b0 = 3 * fz;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) out[j * 4 + i] = H[(b0 + j) * N + a0 + i];
    return out;
  }

  /** Màu ô khung f (12 số: cỏ lo, cỏ hi, đất trên, đất chân), hỏi một lần; trả chỗ bắt đầu trong `col`. */
  private colors(f: number): number {
    if (!this.colDone[f]) {
      const { tc, T, LO } = this;
      this.input.colors(LO + (f % T), LO + Math.floor(f / T), tc);
      const o = f * 12;
      const c = this.col;
      c[o] = tc.lo.r;
      c[o + 1] = tc.lo.g;
      c[o + 2] = tc.lo.b;
      c[o + 3] = tc.hi.r;
      c[o + 4] = tc.hi.g;
      c[o + 5] = tc.hi.b;
      c[o + 6] = tc.earthTop.r;
      c[o + 7] = tc.earthTop.g;
      c[o + 8] = tc.earthTop.b;
      c[o + 9] = tc.earthFoot.r;
      c[o + 10] = tc.earthFoot.g;
      c[o + 11] = tc.earthFoot.b;
      this.colDone[f] = 1;
    }
    return f * 12;
  }

  /** Nhiễu cỏ ở đỉnh lưới con l (điểm px, pz tính theo ô). */
  private noiseAt(l: number, px: number, pz: number): number {
    let n = this.noise[l];
    if (Number.isNaN(n)) n = this.noise[l] = grassNoise(px, pz) * 1.25 - 0.1;
    return n;
  }

  /** Điểm của đỉnh lưới con (a, b) theo độ cao chung. */
  private point(a: number, b: number): P3 {
    return [this.LO + Math.floor(a / 3) + OFF[a % 3], this.H[b * this.N + a], this.LO + Math.floor(b / 3) + OFF[b % 3]];
  }

  /**
   * Pháp tuyến mượt ở đỉnh lưới con (a, b): cộng pháp tuyến các mặt dốc chung đỉnh ấy (trong bốn ô con quanh đỉnh),
   * để góc lồi, góc lõm bớt gãy khúc như răng cưa. Ô giữ phẳng, ô sông không có mặt dốc.
   */
  private smoothAt(a: number, b: number, out: THREE.Vector3): THREE.Vector3 {
    const { T, N } = this;
    out.set(0, 0, 0);
    for (let cb = b - 1; cb <= b; cb++) {
      for (let ca = a - 1; ca <= a; ca++) {
        if (ca < 0 || cb < 0 || ca >= N - 1 || cb >= N - 1) continue;
        const f = Math.floor(cb / 3) * T + Math.floor(ca / 3);
        if (this.river[f] || this.flat[f]) continue;
        const p00 = this.point(ca, cb);
        const p10 = this.point(ca + 1, cb);
        const p01 = this.point(ca, cb + 1);
        const p11 = this.point(ca + 1, cb + 1);
        const corner = (ca === a ? 0 : 1) + (cb === b ? 0 : 2);
        // Hai tam giác của ô con như khi dựng; chỉ lấy tam giác có đỉnh (a, b).
        const tris: [P3, P3, P3, number[]][] = mainDiagonal(p00[1], p10[1], p01[1], p11[1])
          ? [
              [p00, p01, p11, [0, 2, 3]],
              [p00, p11, p10, [0, 3, 1]],
            ]
          : [
              [p00, p01, p10, [0, 2, 1]],
              [p10, p01, p11, [1, 2, 3]],
            ];
        for (const [v0, v1, v2, has] of tris) {
          if (!has.includes(corner)) continue;
          const ux = v0[0] - v1[0];
          const uy = v0[1] - v1[1];
          const uz = v0[2] - v1[2];
          const vx = v2[0] - v1[0];
          const vy = v2[1] - v1[1];
          const vz = v2[2] - v1[2];
          const nx = vy * uz - vz * uy;
          const ny = vz * ux - vx * uz;
          const nz = vx * uy - vy * ux;
          if (ny >= Math.hypot(nx, ny, nz) * 0.999) continue;
          out.x += nx;
          out.y += ny;
          out.z += nz;
        }
      }
    }
    return out.lengthSq() > 0 ? out.normalize() : out.set(0, 1, 0);
  }

  /** Dựng lại mảnh c. */
  private buildChunk(c: number): void {
    const { T, N, LO, input } = this;
    const old = this.meshes[c];
    if (old) {
      this.root.remove(old);
      old.geometry.dispose();
      this.meshes[c] = null;
    }
    const fx0 = (c % this.chunks) * CHUNK;
    const fz0 = Math.floor(c / this.chunks) * CHUNK;
    // Tam giác: chín số tọa độ (theo ô), loại (0 mặt đất, 1 vách đứng), ô khung và đỉnh lưới con (vách: −1).
    const pos: number[] = [];
    const kind: number[] = [];
    const tile: number[] = [];
    const lat: number[] = [];
    const mine = new Float32Array(16);
    const theirs = new Float32Array(16);
    let h: Float32Array = mine;
    let cx = 0;
    let cz = 0;
    let ct = 0;
    let a0 = 0;
    let b0 = 0;
    const tri = (k: number, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
      pos.push(x0, y0, z0, x1, y1, z1, x2, y2, z2);
      kind.push(k);
      tile.push(ct);
    };
    const surf = (i0: number, j0: number, i1: number, j1: number, i2: number, j2: number) => {
      tri(0, cx + OFF[i0], h[j0 * 4 + i0], cz + OFF[j0], cx + OFF[i1], h[j1 * 4 + i1], cz + OFF[j1], cx + OFF[i2], h[j2 * 4 + i2], cz + OFF[j2]);
      lat.push((b0 + j0) * N + a0 + i0, (b0 + j1) * N + a0 + i1, (b0 + j2) * N + a0 + i2);
    };
    for (let fz = fz0; fz < Math.min(fz0 + CHUNK, T); fz++) {
      for (let fx = fx0; fx < Math.min(fx0 + CHUNK, T); fx++) {
        const t = fz * T + fx;
        if (this.river[t]) continue;
        h = this.local(fx, fz, mine);
        const y = this.ty[t];
        cx = LO + fx;
        cz = LO + fz;
        ct = t;
        a0 = 3 * fx;
        b0 = 3 * fz;
        let level = true;
        for (let q = 0; q < 16 && level; q++) level = h[q] === y;
        if (level) {
          // Ô phẳng trọn: hai tam giác. Đỉnh mép của ô bên cạnh nằm thẳng hàng trên mép này (cùng độ cao y).
          surf(0, 0, 0, 3, 3, 0);
          surf(3, 0, 0, 3, 3, 3);
        } else {
          for (let j = 0; j < 3; j++) {
            for (let i = 0; i < 3; i++) {
              if (mainDiagonal(h[j * 4 + i], h[j * 4 + i + 1], h[(j + 1) * 4 + i], h[(j + 1) * 4 + i + 1])) {
                surf(i, j, i, j + 1, i + 1, j + 1);
                surf(i, j, i + 1, j + 1, i + 1, j);
              } else {
                surf(i, j, i, j + 1, i + 1, j);
                surf(i + 1, j, i, j + 1, i + 1, j + 1);
              }
            }
          }
        }
        // Vách đứng: mép ô giữ phẳng cao hơn mép ô bên cạnh (ô thấp hơn, hay sông) thì dựng vách xuống mép ấy.
        if (!this.flat[t]) continue;
        for (const [dx, dz, pick] of SIDES) {
          const nx = fx + dx;
          const nz = fz + dz;
          if (nx < 0 || nz < 0 || nx >= T || nz >= T) continue;
          const wet = this.river[nz * T + nx] === 1;
          if (!wet) this.local(nx, nz, theirs);
          // Mặt vách quay ra phía ô bên cạnh (đỉnh s → s + 1 chạy theo chiều tăng của trục dọc mép).
          const outward = dx === -1 || dz === 1;
          for (let s = 0; s < 3; s++) {
            const [i0, j0, ni0, nj0] = pick(s);
            const [i1, j1, ni1, nj1] = pick(s + 1);
            const top0 = mine[j0 * 4 + i0];
            const top1 = mine[j1 * 4 + i1];
            const bot0 = Math.min(top0, wet ? input.riverY : theirs[nj0 * 4 + ni0]);
            const bot1 = Math.min(top1, wet ? input.riverY : theirs[nj1 * 4 + ni1]);
            const x0 = cx + OFF[i0];
            const z0 = cz + OFF[j0];
            const x1 = cx + OFF[i1];
            const z1 = cz + OFF[j1];
            // Đầu nào vách không cao hơn ô bên cạnh thì vách ở đoạn ấy chỉ là một tam giác.
            if (top0 - bot0 > 1e-6) {
              if (outward) tri(1, x0, top0, z0, x0, bot0, z0, x1, bot1, z1);
              else tri(1, x0, top0, z0, x1, bot1, z1, x0, bot0, z0);
              lat.push(-1, -1, -1);
            }
            if (top1 - bot1 > 1e-6) {
              if (outward) tri(1, x0, top0, z0, x1, bot1, z1, x1, top1, z1);
              else tri(1, x0, top0, z0, x1, top1, z1, x1, bot1, z1);
              lat.push(-1, -1, -1);
            }
          }
        }
      }
    }

    const count = kind.length;
    if (!count) return;
    const position = new Float32Array(count * 9);
    const normal = new Float32Array(count * 9);
    const color = new Float32Array(count * 9);
    const smooth = new Map<number, THREE.Vector3>();
    const col = this.col;
    const origin = input.origin;
    for (let f = 0; f < count; f++) {
      const o = f * 9;
      // Pháp tuyến mặt: (v2 − v1) × (v0 − v1), như three.js tính mặt trước.
      const ux = pos[o] - pos[o + 3];
      const uy = pos[o + 1] - pos[o + 4];
      const uz = pos[o + 2] - pos[o + 5];
      const vx = pos[o + 6] - pos[o + 3];
      const vy = pos[o + 7] - pos[o + 4];
      const vz = pos[o + 8] - pos[o + 5];
      const cxn = vy * uz - vz * uy;
      const cyn = vz * ux - vx * uz;
      const czn = vx * uy - vy * ux;
      const len = Math.hypot(cxn, cyn, czn) || 1;
      const wall = kind[f] === 1;
      const sloped = wall || cyn / len < 0.999;
      const tcO = this.colors(tile[f]);
      const lo = Math.min(pos[o + 1], pos[o + 4], pos[o + 7]);
      const hi = Math.max(pos[o + 1], pos[o + 4], pos[o + 7]);
      for (let k = 0; k < 3; k++) {
        const v = o + k * 3;
        const px = pos[v];
        const py = pos[v + 1];
        const pz = pos[v + 2];
        position[v] = px + origin;
        position[v + 1] = py;
        position[v + 2] = pz + origin;
        const l = lat[f * 3 + k];
        let nx = cxn / len;
        let ny = cyn / len;
        let nz = czn / len;
        if (sloped && !wall) {
          let s = smooth.get(l);
          if (!s) smooth.set(l, (s = this.smoothAt(l % N, Math.floor(l / N), new THREE.Vector3())));
          nx = s.x;
          ny = s.y;
          nz = s.z;
        }
        normal[v] = nx;
        normal[v + 1] = ny;
        normal[v + 2] = nz;
        // Cỏ loang giữa hai sắc theo nhiễu, liền qua mép ô.
        let r = 0;
        let g = 0;
        let bl = 0;
        if (!wall) {
          const t = this.noiseAt(l, px, pz);
          r = col[tcO] + (col[tcO + 3] - col[tcO]) * t;
          g = col[tcO + 1] + (col[tcO + 4] - col[tcO + 1]) * t;
          bl = col[tcO + 2] + (col[tcO + 5] - col[tcO + 2]) * t;
        }
        if (sloped) {
          // Mép trên dốc sáng hơn chân dốc; dốc vừa lẫn cỏ, vách đứng của ô giữ phẳng toàn đất.
          const u = hi > lo ? (py - lo) / (hi - lo) : 1;
          const er = col[tcO + 9] + (col[tcO + 6] - col[tcO + 9]) * u;
          const eg = col[tcO + 10] + (col[tcO + 7] - col[tcO + 10]) * u;
          const eb = col[tcO + 11] + (col[tcO + 8] - col[tcO + 11]) * u;
          const mix = wall ? 1 : EARTH * Math.min(1, (1 - ny) * 2.2);
          r += (er - r) * mix;
          g += (eg - g) * mix;
          bl += (eb - bl) * mix;
        }
        color[v] = r;
        color[v + 1] = g;
        color[v + 2] = bl;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    this.meshes[c] = mesh;
    this.root.add(mesh);
  }
}
