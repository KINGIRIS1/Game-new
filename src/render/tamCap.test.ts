import { describe, expect, it, vi } from 'vitest';

// Chất liệu tô hoạt hình tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.
vi.hoisted(() => {
  const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
  (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
});

import { BAC_CAO, BAC_IT, BAC_SAU, LOI_MON, LOI_XA, SAN_DAI, TAM_CAP_MIN, buildLoiTamCap, buildTamCap, loiTamCap, tamCapY, xepTamCap, type TamCap, type TamCapCho } from './tamCap';

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
    // Đắp rất cao mà lối chỉ dài một ô: bậc cuối còn treo cao trên đất, thôi không làm bậc.
    expect(xepTamCap({ ...CHO, y: 3 }, (d) => Math.max(0.4, 3 - 0.6 - 1.4 * d), 1)).toBeNull();
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

describe('lối đất nối chân bậc ra đường', () => {
  /** Bậc ở cổng giữa ô (5, 2), đi xuống phía +z, `n` bậc; tọa độ cảnh trùng tọa độ ô (`goc` 0). */
  const bac = (n: number): TamCap => ({ x: 5.5, y: 2, z: 3, dx: 0, dz: 1, w: 1, n, cao: 0.3, sau: BAC_SAU, day: 0 });
  const o = (p: [number, number]) => `${Math.floor(p[0])},${Math.floor(p[1])}`;
  /** Lưới thử: ô đường, ô bị chặn; ô khác là đất trống. */
  const luoi = (duong: string[], chan: string[] = []) => ({
    qua: (x: number, z: number) => x >= 0 && z >= 0 && x < 20 && z < 20 && !duong.includes(`${x},${z}`) && !chan.includes(`${x},${z}`),
    duong: (x: number, z: number) => duong.includes(`${x},${z}`),
  });
  const hang = (z: number) => Array.from({ length: 20 }, (_, x) => `${x},${z}`);

  it('đi từ chân bậc qua đất trống, vòng qua ô bị chặn, tới ô đường gần nhất', () => {
    const g = luoi(hang(8), ['5,5', '4,5']);
    const l = loiTamCap(bac(3), 0, g.qua, g.duong)!;
    expect(l).not.toBeNull();
    const chan = 3 * BAC_SAU + 3;
    // Đầu lối nằm dưới bậc cuối, giữa lối; cuối lối nằm trong ô đường.
    expect(l.pts[0][0]).toBeCloseTo(5.5, 5);
    expect(l.pts[0][1]).toBeLessThan(chan);
    expect(l.pts[0][1]).toBeGreaterThan(chan - 0.2);
    expect(g.duong(...(o(l.pts[l.pts.length - 1]).split(',').map(Number) as [number, number]))).toBe(true);
    // Mọi điểm tâm lối ở trên đất trống hay đường, không qua ô bị chặn.
    for (const p of l.pts) expect(['5,5', '4,5']).not.toContain(o(p));
    expect(l.o.map((t) => t.join(','))).not.toContain('5,8');
    expect(l.san).toBeCloseTo(SAN_DAI, 9);
  });

  it('đường nằm dưới thân bậc không tính: lối vòng ra ô đường bên cạnh, không chui lại dưới bậc', () => {
    // Sáu bậc dài 1,68 ô: chân bậc ở ô (5, 4), ô đường (5, 3) nằm dưới thân bậc.
    const g = luoi(hang(3));
    const l = loiTamCap(bac(6), 0, g.qua, g.duong)!;
    expect(l.pts.length).toBeGreaterThan(1);
    const cuoi = o(l.pts[l.pts.length - 1]);
    expect(cuoi).not.toBe('5,3');
    expect(g.duong(...(cuoi.split(',').map(Number) as [number, number]))).toBe(true);
    for (const p of l.pts) expect(o(p)).not.toBe('5,3');
  });

  it('chân bậc đã ở trên đường thì không có lối', () => {
    const g = luoi(hang(3));
    expect(loiTamCap(bac(3), 0, g.qua, g.duong)).toBeNull();
  });

  it(`không có đường trong ${LOI_XA} ô thì lối mòn ngắn thẳng ra trước, thu nhọn`, () => {
    const g = luoi(hang(3 + LOI_XA + 2));
    const l = loiTamCap(bac(3), 0, g.qua, g.duong)!;
    expect(l.mon).toBe(true);
    expect(l.pts.length).toBe(2);
    expect(l.pts[1][0]).toBeCloseTo(5.5, 5);
    expect(l.pts[1][1] - (3 + 3 * BAC_SAU)).toBeLessThanOrEqual(LOI_MON + 1e-9);
    expect(l.san).toBeCloseTo(SAN_DAI, 9);
    expect(l.o.map((t) => t.join(','))).toContain('5,3');
    // Đầu cuối lối mòn thu nhọn: hàng điểm cuối gần như dồn về một chỗ.
    const pos = buildLoiTamCap([l], () => 0)!.geometry.getAttribute('position');
    const xs = Array.from({ length: 5 }, (_, i) => pos.getX(pos.count - 1 - i));
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.1);
  });

  it('sân lấn sang ô bị chặn thì thu hẹp hay bỏ sân, vẫn có lối; không lối không sân thì thôi', () => {
    const g = luoi(hang(8), ['6,4', '6,3']);
    const l = loiTamCap(bac(3), 0, g.qua, g.duong)!;
    expect(l.sanNua).toBeLessThan(0.5);
    expect(l.pts.length).toBeGreaterThan(1);
    const kin = luoi([], ['4,3', '6,3', '5,4']);
    expect(loiTamCap(bac(3), 0, kin.qua, kin.duong)).toBeNull();
  });

  it('chân bậc chạm ngay tường: lối ra từ hông bậc tới đường, không qua tường', () => {
    const tuong = Array.from({ length: 20 }, (_, x) => `${x},4`);
    const g = luoi(['8,3'], tuong);
    const l = loiTamCap(bac(3), 0, g.qua, g.duong)!;
    expect(l.san).toBe(0);
    expect(l.pts.length).toBeGreaterThan(1);
    expect(o(l.pts[l.pts.length - 1])).toBe('8,3');
    for (const p of l.pts) expect(Math.floor(p[1])).toBeLessThan(4);
    // Ô dưới thân bậc không tính vào ô lối (không cần bỏ cỏ dưới bậc).
    expect(l.o.map((t) => t.join(','))).not.toContain('5,3');
  });

  it('vẽ ôm mặt đất, điểm rơi vào ô bị chặn lấy độ cao giữa lối', () => {
    const g = luoi(hang(8));
    const l = loiTamCap(bac(3), 0, g.qua, g.duong)!;
    const mat = (x: number, z: number) => 0.1 * x + 0.05 * z;
    const mesh = buildLoiTamCap([l], mat)!;
    const pos = mesh.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) expect(pos.getY(i)).toBeCloseTo(mat(pos.getX(i), pos.getZ(i)) + 0.04, 5);
    // Mặt quay lên trời.
    const nor = mesh.geometry.getAttribute('normal');
    for (let i = 0; i < nor.count; i++) expect(nor.getY(i)).toBeGreaterThan(0.9);
    // Ô x < 5 coi như móng cao: mép lối bên ấy không leo lên mà lấy độ cao giữa lối.
    const cao = (x: number) => (x < 5.3 ? 5 : 0);
    const m2 = buildLoiTamCap([l], cao, (x) => x < 5.3)!;
    const p2 = m2.geometry.getAttribute('position');
    for (let i = 0; i < p2.count; i++) expect(p2.getY(i)).toBeLessThan(1);
    expect(buildLoiTamCap([], mat)).toBeNull();
  });
});
