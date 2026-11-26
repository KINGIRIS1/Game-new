import { describe, expect, it, vi } from 'vitest';

// Chất liệu tô hoạt hình tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.
vi.hoisted(() => {
  const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
  (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
});

import { BAC_CAO, BAC_IT, BAC_SAU, TAM_CAP_MIN, buildTamCap, tamCapY, xepTamCap, type TamCapCho } from './tamCap';

/** Cổng ở gốc, mặt móng cao 2, lối đi ra phía +z, rộng 1 ô. */
const CHO: TamCapCho = { x: 0, y: 2, z: 0, dx: 0, dz: 1, w: 1 };
/** Đất như quanh móng đắp cao có bệ: dưới mặt móng một bệ `be` ở mép, dốc xuống `doc` mỗi ô tới mặt `day`. */
const dat = (be: number, doc: number, day: number) => (d: number) => Math.max(day, CHO.y - be - doc * d);

describe('bậc tam cấp', () => {
  it('đi xuống tới chỗ gặp đất: bậc cuối ngang mặt đất ở chân bậc, bậc nào cũng nhô khỏi đất', () => {
    const g = dat(0.4, 0.5, 0.4);
    const s = xepTamCap(CHO, g, 4)!;
    expect(s).not.toBeNull();
    expect(s.cao).toBeLessThanOrEqual(BAC_CAO + 1e-9);
    expect(CHO.y - s.n * s.cao).toBeCloseTo(g(s.n * s.sau), 5);
    for (let k = 0; k < s.n; k++) expect(CHO.y - (k + 1) * s.cao).toBeGreaterThanOrEqual(g((k + 1) * s.sau) - 1e-9);
    // Thân bậc cắm xuống dưới đất ở mọi chỗ dọc lối.
    for (let d = 0; d <= s.n * s.sau; d += 0.05) expect(s.day).toBeLessThan(g(d));
  });

  it('đắp càng cao bậc càng nhiều', () => {
    const thap = xepTamCap(CHO, dat(0.3, 0.3, 1.5), 4)!;
    const cao = xepTamCap({ ...CHO, y: 3 }, (d) => Math.max(0.6, 3 - 0.6 - 0.6 * d), 4)!;
    expect(thap.n).toBeGreaterThanOrEqual(BAC_IT);
    expect(cao.n).toBeGreaterThan(thap.n);
  });

  it('lối ngắn (gặp móng khác) thì ít bậc hơn, bậc cao hơn nhưng có trần', () => {
    const g = dat(0.4, 0.5, 0.4);
    const dai = xepTamCap(CHO, g, 4)!;
    const ngan = xepTamCap(CHO, g, 1)!;
    expect(ngan.n * ngan.sau).toBeLessThanOrEqual(1 + 1e-9);
    expect(ngan.n).toBeLessThan(dai.n);
    expect(ngan.cao).toBeGreaterThan(dai.cao);
    expect(ngan.cao).toBeLessThanOrEqual(0.3 + 1e-9);
  });

  it('không làm bậc khi đất ngoài cổng ngang móng, hay lối bị chặn sát mép', () => {
    expect(xepTamCap(CHO, () => CHO.y - TAM_CAP_MIN / 2, 4)).toBeNull();
    expect(xepTamCap(CHO, dat(0.4, 0.5, 0.4), BAC_SAU * 1.5)).toBeNull();
  });

  it('người đi trên lối bước trên mặt bậc, ngoài lối thì không', () => {
    const s = xepTamCap(CHO, dat(0.4, 0.5, 0.4), 4)!;
    expect(tamCapY([s], 0, 0.01)).toBeCloseTo(CHO.y - s.cao, 5);
    expect(tamCapY([s], 0.3, s.sau * 2.5)).toBeCloseTo(CHO.y - 3 * s.cao, 5);
    expect(tamCapY([s], 0, -0.1)).toBeNull();
    expect(tamCapY([s], 0.8, 0.5)).toBeNull();
    expect(tamCapY([s], 0, s.n * s.sau + 0.01)).toBeNull();
  });

  it('xoay theo hướng cổng: lối ra phía +x', () => {
    const cho = { ...CHO, dx: 1, dz: 0 };
    const s = xepTamCap(cho, dat(0.4, 0.5, 0.4), 4)!;
    expect(tamCapY([s], 0.1, 0)).toBeCloseTo(CHO.y - s.cao, 5);
    expect(tamCapY([s], -0.1, 0)).toBeNull();
    expect(tamCapY([s], 0.5, 0.8)).toBeNull();
  });

  it('dựng hình gộp một lưới kèm viền mực, mặt bậc sáng hơn mặt đứng', () => {
    const s = xepTamCap(CHO, dat(0.4, 0.5, 0.4), 4)!;
    const g = buildTamCap([s])!;
    expect(g.children.length).toBe(2);
    expect(buildTamCap([])).toBeNull();
  });
});
