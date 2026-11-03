import * as THREE from 'three';

/**
 * Nền đất trong lưới, dựng thành một khối liền thay cho mỗi ô một khối hộp.
 *
 * Mỗi ô chia ba đoạn mỗi chiều ở 0, `ramp`, 1 − `ramp`: giữa ô phẳng đúng mặt đất của ô, dải mép rộng `ramp` dốc
 * xuống ô thấp hơn bên cạnh (dốc nằm trong ô cao, ô thấp giữ phẳng trọn ô). Độ cao mỗi đỉnh lấy theo một luật chung
 * cho cả lưới: đỉnh ở giữa ô là mặt ô; đỉnh trên mép là mặt thấp nhất trong các ô chung mép, chung góc ấy. Hai ô kề
 * nhau vì thế dùng chung đỉnh mép y hệt nhau, không hở kẽ. Ô phẳng trọn (không ô nào quanh thấp hơn) chỉ vẽ hai tam
 * giác.
 */

/** Kiểu nền đất: `hop` là khối hộp mỗi ô (như cũ), còn lại dựng bằng `buildNen`. */
export type KieuNen = 'hop' | 'vach' | 'vat' | 'o';
export const KIEU_NEN: readonly KieuNen[] = ['hop', 'vach', 'vat', 'o'];

export interface NenOpts {
  /** Bề rộng dải dốc ở mép ô cao (phần ô), dưới 0,5. */
  ramp: number;
  /** Mép mỗi ô đất đã mở lún xuống chừng này (đơn vị thế giới), lộ rãnh giữa các ô. */
  groove: number;
  /** Mặt dốc pha màu đất bao nhiêu (1: toàn đất, 0: toàn cỏ). */
  earth: number;
}

export const NEN_OPTS: Record<Exclude<KieuNen, 'hop'>, NenOpts> = {
  /** Vách đất: bậc dựng đứng như bờ ruộng bậc thang, vách màu đất. */
  vach: { ramp: 0.07, groove: 0, earth: 1 },
  /** Bờ vát: bậc thoai thoải phủ cỏ lẫn đất, như gò đồi. */
  vat: { ramp: 0.3, groove: 0, earth: 0.45 },
  /** Lát ô: ô đã mở vát mép, lộ rãnh mờ giữa các ô như ô cờ; bậc dốc vừa. */
  o: { ramp: 0.12, groove: 0.035, earth: 0.85 },
};

export interface NenInput {
  grid: number;
  /** Mặt đất của ô (tọa độ thế giới), `null` nếu là sông. Ô ngoài lưới lấy theo ô mép gần nhất. */
  top: (x: number, z: number) => number | null;
  /** Đáy sông: mép đất giáp sông dốc xuống tới đây (dưới mặt nước). */
  riverY: number;
  /** Ô đất đã mở (rãnh chỉ có ở đất đã mở). */
  open: (x: number, z: number) => boolean;
  /** Màu cỏ của ô (x, z) ở điểm (px, pz) tính theo ô (liên tục), ghi vào `out`. */
  grass: (x: number, z: number, px: number, pz: number, out: THREE.Color) => void;
  /** Màu vách đất của ô (sáng ở mép trên, tối ở chân vách). */
  earth: (x: number, z: number, out: { top: THREE.Color; foot: THREE.Color }) => void;
  /** Tọa độ thế giới của điểm lưới p (ô 0 bắt đầu ở 0). */
  toWorld: (p: number) => number;
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

/** Dựng nền đất. Trả hình không chỉ mục (mỗi tam giác ba đỉnh riêng) để mặt dốc tô màu đất, mặt phẳng tô màu cỏ. */
export function buildNen(input: NenInput, opts: NenOpts): THREE.BufferGeometry {
  const { grid: G, riverY } = input;
  const r = Math.min(Math.max(opts.ramp, 0.01), 0.45);
  const OFF = [0, r, 1 - r];
  const N = 3 * G + 1;
  const tileY = (x: number, z: number): number => {
    const t = input.top(Math.min(Math.max(x, 0), G - 1), Math.min(Math.max(z, 0), G - 1));
    return t === null ? riverY : t;
  };
  const tileOpen = (x: number, z: number) => x >= 0 && z >= 0 && x < G && z < G && input.open(x, z);
  // Độ cao từng đỉnh lưới con: đỉnh (a, b) ở điểm (⌊a/3⌋ + OFF[a % 3], ⌊b/3⌋ + OFF[b % 3]).
  const H = new Float32Array(N * N);
  for (let b = 0; b < N; b++) {
    const j = Math.floor(b / 3);
    const zs = b % 3 === 0 ? [j - 1, j] : [j];
    for (let a = 0; a < N; a++) {
      const i = Math.floor(a / 3);
      const xs = a % 3 === 0 ? [i - 1, i] : [i];
      let h = Infinity;
      let open = false;
      for (const x of xs) {
        for (const z of zs) {
          h = Math.min(h, tileY(x, z));
          open ||= tileOpen(x, z);
        }
      }
      // Rãnh giữa các ô đã mở: đỉnh nằm trên mép ô thì lún xuống.
      if (opts.groove > 0 && open && (a % 3 === 0 || b % 3 === 0)) h -= opts.groove;
      H[b * N + a] = h;
    }
  }

  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  const earth = { top: new THREE.Color(), foot: new THREE.Color() };
  const e = new THREE.Color();
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const n = new THREE.Vector3();

  const tri = (tx: number, tz: number, p: [number, number, number][]) => {
    v0.set(p[0][0], p[0][1], p[0][2]);
    v1.set(p[1][0], p[1][1], p[1][2]);
    v2.set(p[2][0], p[2][1], p[2][2]);
    n.subVectors(v2, v1).cross(v0.clone().sub(v1)).normalize();
    // Mặt dốc: pha màu đất, đỉnh trên sáng hơn chân vách; mặt phẳng: màu cỏ theo nhiễu, liền qua mép ô.
    const slope = 1 - Math.abs(n.y);
    const lo = Math.min(p[0][1], p[1][1], p[2][1]);
    const hi = Math.max(p[0][1], p[1][1], p[2][1]);
    if (slope > 0.02) input.earth(tx, tz, earth);
    for (const [px, py, pz] of p) {
      input.grass(tx, tz, px, pz, c);
      if (slope > 0.02) {
        const k = hi > lo ? (py - lo) / (hi - lo) : 1;
        e.copy(earth.foot).lerp(earth.top, k);
        // Dốc nhẹ (mép rãnh, gò thoai thoải) vẫn nhiều cỏ; dốc đứng là đất.
        const mix = opts.earth * Math.min(1, slope * 2.2);
        c.lerp(e, mix);
      }
      pos.push(input.toWorld(px), py, input.toWorld(pz));
      col.push(c.r, c.g, c.b);
    }
  };

  const P = (a: number, b: number): [number, number, number] => [Math.floor(a / 3) + OFF[a % 3], H[b * N + a], Math.floor(b / 3) + OFF[b % 3]];

  for (let tz = 0; tz < G; tz++) {
    for (let tx = 0; tx < G; tx++) {
      if (input.top(tx, tz) === null) continue;
      // So bằng số thực 32 bit như trong `H`.
      const y = Math.fround(tileY(tx, tz));
      const a0 = 3 * tx;
      const b0 = 3 * tz;
      let flat = true;
      for (let db = 0; db <= 3 && flat; db++) for (let da = 0; da <= 3; da++) if (H[(b0 + db) * N + a0 + da] !== y) flat = false;
      if (flat) {
        const p00 = P(a0, b0);
        const p10 = P(a0 + 3, b0);
        const p01 = P(a0, b0 + 3);
        const p11 = P(a0 + 3, b0 + 3);
        tri(tx, tz, [p00, p01, p10]);
        tri(tx, tz, [p10, p01, p11]);
        continue;
      }
      for (let db = 0; db < 3; db++) {
        for (let da = 0; da < 3; da++) {
          const p00 = P(a0 + da, b0 + db);
          const p10 = P(a0 + da + 1, b0 + db);
          const p01 = P(a0 + da, b0 + db + 1);
          const p11 = P(a0 + da + 1, b0 + db + 1);
          // Chéo theo cặp đỉnh gần cao bằng nhau hơn: góc lồi thành góc vát, góc lõm chỉ lõm một chút.
          if (Math.abs(p00[1] - p11[1]) <= Math.abs(p10[1] - p01[1])) {
            tri(tx, tz, [p00, p01, p11]);
            tri(tx, tz, [p00, p11, p10]);
          } else {
            tri(tx, tz, [p00, p01, p10]);
            tri(tx, tz, [p10, p01, p11]);
          }
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}
