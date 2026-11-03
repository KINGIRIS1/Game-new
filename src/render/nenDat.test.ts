import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { NenDat, RAMP, type NenInput } from './nenDat';

/** Lưới thử 8×8: hàng z = 7 là sông, gò bậc 2 ở giữa, một ô bậc 4 sát gò. */
const G = 8;
const LEVEL = 0.3;
const RIVER_Y = -0.4;
const level = (x: number, z: number): number | null => {
  if (z === 7) return null;
  if (x === 1 && z === 1) return 4;
  if (x >= 3 && x <= 4 && z >= 2 && z <= 3) return 2;
  return 1;
};

function input(flat: Set<string> = new Set(), top = level): NenInput {
  return {
    grid: G,
    top: (x, z) => {
      const h = top(x, z);
      return h === null ? null : h * LEVEL;
    },
    riverY: RIVER_Y,
    flat: (x, z) => flat.has(`${x},${z}`),
    colors: (_x, _z, out) => {
      out.lo.setHex(0x88aa44);
      out.hi.setHex(0x88aa44);
      out.earthTop.setHex(0xa77e4e);
      out.earthFoot.setHex(0x8a6440);
    },
    origin: 0,
    margin: 2,
  };
}

/** Dựng nền, gom mọi mảnh thành một hình để soi. */
function buildNen(inp: NenInput): { nen: NenDat; geometry: THREE.BufferGeometry; heightAt: (x: number, z: number) => number } {
  const nen = new NenDat(inp, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const geos = nen.parts.map((m) => m.geometry);
  const geometry = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const arrays = geos.map((g) => g.getAttribute(name).array as Float32Array);
    const all = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
    let o = 0;
    for (const a of arrays) {
      all.set(a, o);
      o += a.length;
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(all, 3));
  }
  return { nen, geometry, heightAt: (x, z) => nen.heightAt(x, z) };
}

interface Tri {
  p: THREE.Vector3[];
  n: THREE.Vector3;
}

function triangles(geo: THREE.BufferGeometry): Tri[] {
  const p = geo.getAttribute('position');
  const out: Tri[] = [];
  for (let i = 0; i < p.count; i += 3) {
    const v = [0, 1, 2].map((k) => new THREE.Vector3(p.getX(i + k), p.getY(i + k), p.getZ(i + k)));
    out.push({ p: v, n: new THREE.Vector3().subVectors(v[2], v[1]).cross(v[0].clone().sub(v[1])).normalize() });
  }
  return out;
}

/**
 * Mặt đất kín: lấy vài điểm trên mỗi cạnh tam giác (không kể cạnh đứng thẳng), mỗi điểm phải nằm trên cạnh của đúng hai
 * tam giác (cạnh ô phẳng hai tam giác giáp ô chia nhỏ thì nằm trên nhiều đoạn ngắn thẳng hàng). Trả các điểm hở.
 */
function openPoints(tris: Tri[], keep: (p: THREE.Vector3) => boolean): THREE.Vector3[] {
  const segs: [THREE.Vector3, THREE.Vector3][] = [];
  for (const t of tris) for (let k = 0; k < 3; k++) segs.push([t.p[k], t.p[(k + 1) % 3]]);
  const on = (q: THREE.Vector3, [a, b]: [THREE.Vector3, THREE.Vector3]) => {
    const ab = b.clone().sub(a);
    const len2 = ab.lengthSq();
    const t = q.clone().sub(a).dot(ab) / len2;
    if (t < -1e-6 || t > 1 + 1e-6) return false;
    return a.clone().addScaledVector(ab, t).distanceTo(q) < 1e-5;
  };
  const out: THREE.Vector3[] = [];
  for (const [a, b] of segs) {
    if (Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.z - b.z) < 1e-6) continue;
    for (const f of [0.25, 0.5, 0.75]) {
      const q = a.clone().lerp(b, f);
      if (!keep(q)) continue;
      let n = 0;
      for (const s of segs) {
        if (Math.min(s[0].x, s[1].x) > q.x + 1e-5 || Math.max(s[0].x, s[1].x) < q.x - 1e-5) continue;
        if (Math.min(s[0].z, s[1].z) > q.z + 1e-5 || Math.max(s[0].z, s[1].z) < q.z - 1e-5) continue;
        if (on(q, s)) n++;
      }
      if (n !== 2) out.push(q);
    }
  }
  return out;
}

describe('nền đất bờ vát', () => {
  const nen = buildNen(input());
  const tris = triangles(nen.geometry);

  it('mặt đất không hở kẽ: đỉnh trùng chỗ thì trùng độ cao', () => {
    const at = new Map<string, number>();
    for (const t of tris) {
      for (const v of t.p) {
        const k = `${v.x.toFixed(4)},${v.z.toFixed(4)}`;
        const y = at.get(k);
        if (y === undefined) at.set(k, v.y);
        else expect(v.y).toBeCloseTo(y, 5);
      }
    }
  });

  it('giữa ô phẳng đúng mặt đất của ô, ô sông không vẽ', () => {
    for (const t of tris) {
      for (const v of t.p) {
        const tx = Math.floor(v.x);
        const tz = Math.floor(v.z);
        const inner = (f: number) => f > RAMP - 1e-4 && f < 1 - RAMP + 1e-4;
        if (tx < 0 || tz < 0 || tx >= G || tz >= G || !inner(v.x - tx) || !inner(v.z - tz)) continue;
        const h = level(tx, tz);
        expect(h).not.toBeNull();
        expect(v.y).toBeCloseTo(h! * LEVEL, 5);
      }
    }
  });

  it('dốc nằm trong ô cao, ô thấp giữ phẳng trọn ô', () => {
    // Ô (0, 0) bậc 1 chạm góc ô bậc 4 (1, 1): mọi đỉnh trong ô (0, 0) nằm đúng mặt ô.
    for (const t of tris) for (const v of t.p) if (v.x >= 0 && v.x <= 1 && v.z >= 0 && v.z <= 1) expect(v.y).toBeCloseTo(LEVEL, 5);
  });

  it('mép đất giáp sông dốc xuống đáy sông', () => {
    expect(nen.heightAt(2.5, 6.5)).toBeCloseTo(LEVEL, 5);
    expect(nen.heightAt(2.5, 7)).toBeCloseTo(RIVER_Y, 5);
  });

  it('nền nới ra ngoài lưới, mang bậc của ô mép', () => {
    expect(nen.heightAt(-1.5, 3.5)).toBeCloseTo(LEVEL, 5);
    expect(tris.some((t) => t.p.some((v) => v.x < -1.5))).toBe(true);
  });

  it('ô phẳng trọn chỉ vẽ hai tam giác', () => {
    const plain = buildNen({ ...input(new Set(), () => 1), margin: 0 });
    expect(plain.geometry.getAttribute('position').count).toBe(G * G * 6);
  });

  it('heightAt khớp đúng hình đã vẽ', () => {
    const ray = new THREE.Raycaster();
    const mesh = new THREE.Mesh(nen.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    for (let i = 0; i < 400; i++) {
      const px = 0.05 + ((i * 37) % 97) / 97 * 6.9;
      const pz = 0.05 + ((i * 61) % 89) / 89 * 6.8;
      ray.set(new THREE.Vector3(px, 10, pz), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(mesh)[0];
      expect(hit).toBeDefined();
      expect(nen.heightAt(px, pz)).toBeCloseTo(hit.point.y, 4);
    }
  });

  it('mặt phẳng màu cỏ, mặt dốc pha màu đất, pháp tuyến dốc làm mượt mà mặt phẳng vẫn hướng thẳng lên', () => {
    const geo = nen.geometry;
    const n = geo.getAttribute('normal');
    const c = geo.getAttribute('color');
    const grass = new THREE.Color(0x88aa44);
    let slopes = 0;
    tris.forEach((t, i) => {
      for (let k = 0; k < 3; k++) {
        const o = i * 3 + k;
        if (t.n.y > 0.999) {
          expect(n.getY(o)).toBeCloseTo(1, 5);
          expect(c.getX(o)).toBeCloseTo(grass.r, 5);
          expect(c.getY(o)).toBeCloseTo(grass.g, 5);
        } else {
          slopes++;
          expect(c.getX(o)).toBeGreaterThan(grass.r);
        }
      }
    });
    expect(slopes).toBeGreaterThan(0);
  });

  describe('ô giữ phẳng', () => {
    // Ô (3, 2) thuộc gò bậc 2, kề ô bậc 1 (2, 2) ở phía tây; ô (2, 6) kề sông ở phía nam; ô (5, 5) giữa đất phẳng.
    const flat = new Set(['3,2', '2,6', '5,5']);
    const fn = buildNen(input(flat));
    const ft = triangles(fn.geometry);

    it('phẳng trọn ô tới tận mép', () => {
      for (const [x, z] of [
        [3, 2],
        [2, 6],
        [5, 5],
      ]) {
        for (const [u, v] of [
          [0.01, 0.01],
          [0.5, 0.01],
          [0.99, 0.5],
          [0.15, 0.85],
        ]) {
          expect(fn.heightAt(x + u, z + v)).toBeCloseTo(level(x, z)! * LEVEL, 5);
        }
      }
    });

    it('mép cao hơn ô bên cạnh thì có vách đứng màu đất quay ra ngoài, mặt đất vẫn kín', () => {
      const walls = ft.filter((t) => Math.abs(t.n.y) < 1e-4);
      // Vách phía tây ô (3, 2) xuống ô bậc 1, vách phía nam ô (2, 6) xuống đáy sông.
      expect(walls.some((t) => t.p.every((v) => Math.abs(v.x - 3) < 1e-6) && t.n.x < -0.99)).toBe(true);
      expect(walls.some((t) => t.p.every((v) => Math.abs(v.z - 7) < 1e-6) && t.n.z > 0.99)).toBe(true);
      // Mặt đất kín, trừ bìa ngoài cùng của nền và mép sông (chân dốc, chân vách xuống đáy sông).
      const inside = (q: THREE.Vector3) => q.x > -2 + 1e-4 && q.x < G + 2 - 1e-4 && q.z > -2 + 1e-4 && q.z < 7 - 1e-4;
      expect(openPoints(ft, inside)).toEqual([]);
      expect(openPoints(tris, inside)).toEqual([]);
    });

    it('ô bên cạnh không đổi: ô không giữ phẳng vẽ y như khi chưa có ô giữ phẳng', () => {
      expect(fn.heightAt(2.9, 2.5)).toBeCloseTo(nen.heightAt(2.9, 2.5), 5);
      expect(fn.heightAt(4.1, 2.1)).toBeCloseTo(nen.heightAt(4.1, 2.1), 5);
    });
  });

  it('đổi vài ô rồi dựng lại từng phần thì y như dựng mới từ đầu, kể cả ô sát mép mảnh và mép lưới', () => {
    // Lưới 60×60, dải ngoài 2 ô: khung 64 ô, chia mảnh 26 ô (ô khung 24..27 nằm sát mép hai mảnh).
    const W = 60;
    const heights: number[] = Array.from({ length: W * W }, (_, i) => ((i * 7) % 5 === 0 ? 2 : 1));
    for (let x = 0; x < W; x++) heights[(W - 1) * W + x] = -1;
    const flats = new Set<number>([5 * W + 5]);
    const inp = (): NenInput => ({
      grid: W,
      top: (x, z) => (heights[z * W + x] < 0 ? null : heights[z * W + x] * LEVEL),
      riverY: RIVER_Y,
      flat: (x, z) => flats.has(z * W + x),
      colors: (_x, _z, out) => {
        out.lo.setHex(0x88aa44);
        out.hi.setHex(0x99bb55);
        out.earthTop.setHex(0xa77e4e);
        out.earthFoot.setHex(0x8a6440);
      },
      origin: 0,
      margin: 2,
    });
    const live = new NenDat(inp(), new THREE.MeshBasicMaterial());
    const changed = [22 * W + 22, 23 * W + 24, 24 * W + 23, 0, 3 * W, W * 30 - 1, 40 * W + 41];
    heights[22 * W + 22] = 4;
    heights[3 * W] = 3;
    heights[W * 30 - 1] = 0;
    flats.add(23 * W + 24).add(24 * W + 23).add(0).add(40 * W + 41);
    flats.delete(5 * W + 5);
    changed.push(5 * W + 5);
    live.update(changed);
    const fresh = new NenDat(inp(), new THREE.MeshBasicMaterial());
    const dump = (n: NenDat) => {
      const out: string[] = [];
      for (const m of n.parts) {
        const p = m.geometry.getAttribute('position');
        const nn = m.geometry.getAttribute('normal');
        const c = m.geometry.getAttribute('color');
        for (let i = 0; i < p.count; i += 3) {
          const row: string[] = [];
          for (let k = i; k < i + 3; k++) row.push([p.getX(k), p.getY(k), p.getZ(k), nn.getX(k), nn.getY(k), nn.getZ(k), c.getX(k), c.getY(k), c.getZ(k)].map((v) => v.toFixed(4)).join(','));
          out.push(row.join('|'));
        }
      }
      return out.sort();
    };
    expect(dump(live)).toEqual(dump(fresh));
    for (let i = 0; i < 300; i++) {
      const px = -2 + ((i * 37) % 997) / 997 * 64;
      const pz = -2 + ((i * 61) % 991) / 991 * 61;
      expect(live.heightAt(px, pz)).toBeCloseTo(fresh.heightAt(px, pz), 6);
    }
  });
});
