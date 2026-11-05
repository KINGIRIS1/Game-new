// Gói hình nặn cho kho trình duyệt: mở ra phải đúng hình (vị trí, màu, xương y nguyên; pháp tuyến, trọng số lệch rất ít)
// mà gọn hơn.

import { describe, expect, it } from 'vitest';
import { packFigure, packedBytes, unpackFigure } from './nanGoi';
import type { FigureData } from './nanNguoi';

/** Quạt `k` tam giác quanh tâm, mỗi tam giác ba đỉnh riêng như hình nặn; nửa đầu màu đỏ, nửa sau màu lam. */
function fan(k: number, uv = false): FigureData['pieces'][number] {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const skin: number[] = [];
  const wt: number[] = [];
  const tex: number[] = [];
  const rim = (i: number) => [Math.cos((i / k) * Math.PI * 2), 0.1 * i, Math.sin((i / k) * Math.PI * 2)];
  for (let t = 0; t < k; t++) {
    const color = t < k / 2 ? [0.8, 0.1, 0.05] : [0.1, 0.2, 0.7];
    for (const p of [[0, 0.5, 0], rim(t), rim(t + 1)]) {
      pos.push(...p);
      const l = Math.hypot(p[0], 1, p[2]);
      nor.push(p[0] / l, 1 / l, p[2] / l);
      col.push(...color);
      skin.push(0, 3, 0, 0);
      const w = 0.3 + 0.4 * (p[1] / (0.1 * k));
      wt.push(1 - w, w, 0, 0);
      tex.push(p[0], p[2]);
    }
  }
  const attrs: FigureData['pieces'][number]['attrs'] = {
    position: { array: new Float32Array(pos), size: 3, normalized: false },
    normal: { array: new Float32Array(nor), size: 3, normalized: false },
    color: { array: new Float32Array(col), size: 3, normalized: false },
    skinIndex: { array: new Uint16Array(skin), size: 4, normalized: false },
    skinWeight: { array: new Float32Array(wt), size: 4, normalized: false },
  };
  if (uv) attrs.uv = { array: new Float32Array(tex), size: 2, normalized: false };
  return { slot: 'plain', bones: ['hips', 'chest', 'head', 'legL'], attrs, index: null };
}

const rawBytes = (f: FigureData) => f.pieces.reduce((s, p) => s + Object.values(p.attrs).reduce((t, a) => t + a.array.byteLength, 0), 0);

describe('gói hình nặn', () => {
  const fig: FigureData = { key: 'thu@0.7', pieces: [fan(24), fan(10, true)] };
  const back = unpackFigure(packFigure(fig));

  it('mở ra đúng số tam giác, vị trí, màu, xương', () => {
    expect(back.key).toBe(fig.key);
    fig.pieces.forEach((p, i) => {
      const q = back.pieces[i];
      expect(q.slot).toBe(p.slot);
      expect(q.bones).toEqual(p.bones);
      expect(q.index).toBeNull();
      expect(Object.keys(q.attrs).sort()).toEqual(Object.keys(p.attrs).sort());
      for (const k of ['position', 'color', 'skinIndex', 'uv']) {
        if (!p.attrs[k]) continue;
        expect(q.attrs[k].array.constructor).toBe(p.attrs[k].array.constructor);
        expect(Array.from(q.attrs[k].array)).toEqual(Array.from(p.attrs[k].array));
      }
    });
  });

  it('pháp tuyến, trọng số lệch rất ít, trọng số cộng lại vẫn bằng 1', () => {
    fig.pieces.forEach((p, i) => {
      const q = back.pieces[i];
      const n0 = p.attrs.normal.array;
      const n1 = q.attrs.normal.array;
      for (let j = 0; j < n0.length; j++) expect(Math.abs(n0[j] - n1[j])).toBeLessThan(0.01);
      const w0 = p.attrs.skinWeight.array;
      const w1 = q.attrs.skinWeight.array;
      for (let v = 0; v < w0.length / 4; v++) {
        let s = 0;
        for (let c = 0; c < 4; c++) {
          expect(Math.abs(w0[v * 4 + c] - w1[v * 4 + c])).toBeLessThan(0.005);
          s += w1[v * 4 + c];
        }
        expect(s).toBeCloseTo(1, 5);
      }
    });
  });

  it('gọn hơn nhiều so với để nguyên', () => {
    const big: FigureData = { key: 'to', pieces: [fan(400)] };
    expect(packedBytes(packFigure(big))).toBeLessThan(rawBytes(big) * 0.4);
  });

  it('mảnh đã có chỉ số tam giác thì cất nguyên', () => {
    const p = fan(4);
    const indexed = { ...p, index: new Uint16Array([0, 1, 2]) };
    const f: FigureData = { key: 'x', pieces: [indexed] };
    expect(unpackFigure(packFigure(f)).pieces[0]).toBe(indexed);
  });
});
