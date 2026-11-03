import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { NEN_OPTS, buildNen, type NenInput } from './nenDat';

/** Lưới thử 6×6: hàng z = 5 là sông, có gò bậc 2 ở giữa và một ô bậc 4 sát gò. */
const G = 6;
const level = (x: number, z: number): number | null => {
  if (z === 5) return null;
  if (x === 1 && z === 1) return 4;
  if (x >= 2 && x <= 3 && z >= 1 && z <= 2) return 2;
  return 1;
};
const LEVEL = 0.3;

function input(top: (x: number, z: number) => number | null): NenInput {
  return {
    grid: G,
    top: (x, z) => {
      const h = top(x, z);
      return h === null ? null : h * LEVEL;
    },
    riverY: -0.4,
    open: () => true,
    grass: (_x, _z, _px, _pz, out) => out.setHex(0x88aa44),
    earth: (_x, _z, out) => {
      out.top.setHex(0xa77e4e);
      out.foot.setHex(0x8a6440);
    },
    toWorld: (p) => p,
  };
}

function vertices(geo: THREE.BufferGeometry): { x: number; y: number; z: number }[] {
  const p = geo.getAttribute('position');
  const out = [];
  for (let i = 0; i < p.count; i++) out.push({ x: p.getX(i), y: p.getY(i), z: p.getZ(i) });
  return out;
}

describe('nền đất liền khối', () => {
  for (const kieu of ['vach', 'vat', 'o'] as const) {
    const opts = NEN_OPTS[kieu];
    const geo = buildNen(input(level), opts);
    const vs = vertices(geo);

    it(`${kieu}: không hở kẽ, mọi đỉnh trùng chỗ thì trùng độ cao`, () => {
      const at = new Map<string, number>();
      for (const v of vs) {
        const key = `${v.x.toFixed(4)},${v.z.toFixed(4)}`;
        const y = at.get(key);
        if (y === undefined) at.set(key, v.y);
        else expect(v.y).toBeCloseTo(y, 5);
      }
    });

    it(`${kieu}: giữa ô phẳng đúng mặt đất của ô, sông không vẽ`, () => {
      for (const v of vs) {
        const tx = Math.floor(v.x);
        const tz = Math.floor(v.z);
        const fx = v.x - tx;
        const fz = v.z - tz;
        const inner = (f: number) => f > opts.ramp - 1e-4 && f < 1 - opts.ramp + 1e-4;
        if (tx >= G || tz >= G || !inner(fx) || !inner(fz)) continue;
        const h = level(tx, tz);
        expect(h).not.toBeNull();
        expect(v.y).toBeCloseTo(h! * LEVEL, 5);
      }
    });

    it(`${kieu}: dốc nằm trong ô cao, ô thấp giữ phẳng trọn ô`, () => {
      // Ô (0, 0) bậc 1 chạm góc ô bậc 4 (1, 1): mọi đỉnh trong ô (0, 0) nằm đúng mặt ô (trừ rãnh mép ô).
      for (const v of vs) {
        if (v.x < 0 || v.x > 1 || v.z < 0 || v.z > 1) continue;
        expect(v.y).toBeGreaterThanOrEqual(LEVEL - opts.groove - 1e-5);
        expect(v.y).toBeLessThanOrEqual(LEVEL + 1e-5);
      }
    });
  }

  it('ô phẳng trọn chỉ vẽ hai tam giác', () => {
    const geo = buildNen(input(() => 1), NEN_OPTS.vach);
    expect(geo.getAttribute('position').count).toBe(G * G * 6);
  });

  it('mặt phẳng tô màu cỏ, vách tô màu đất', () => {
    const geo = buildNen(input(level), NEN_OPTS.vach);
    const p = geo.getAttribute('position');
    const n = geo.getAttribute('normal');
    const c = geo.getAttribute('color');
    const grass = new THREE.Color(0x88aa44);
    let walls = 0;
    for (let i = 0; i < p.count; i++) {
      if (n.getY(i) > 0.999) {
        expect(c.getX(i)).toBeCloseTo(grass.r, 5);
        expect(c.getY(i)).toBeCloseTo(grass.g, 5);
      } else if (Math.abs(n.getY(i)) < 0.3) {
        walls++;
        // Vách đứng toàn màu đất: đỏ trội hơn xanh lá.
        expect(c.getX(i)).toBeGreaterThan(c.getY(i));
      }
    }
    expect(walls).toBeGreaterThan(0);
  });
});
