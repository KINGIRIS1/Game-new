// Canh dân gánh hàng (ganhHang.ts): người đi gánh là người làm của chính công trình, thay phiên nên từ hai người trở
// lên công trình không bao giờ trống; tuyến vẽ đi đúng các ô của luật, không xuyên móng công trình nào, ra vào đúng lối;
// đi trên đường nhanh hơn; chỗ đứng theo giờ đi rồi về đúng chỗ cũ.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BUILDINGS } from '../game/defs';
import { createInitialState, occupancy, place, slotsOf, type Building, type GameState } from '../game/game';
import { GRID } from '../game/map';
import { DIEN, edge, setDien, size } from '../game/testmap';
import { duongGanh } from '../game/vanChuyen';
import { DO_HANG_S, HAI_LUOT, LAM_S, chuyenGanh, duongNguoi, loiRa, tuyenGanh, viTri, type TuyenGanh } from './ganhHang';
import type { Lot } from './lot';

// Bản vẽ ô con nằm trong tệp mô hình, mà phần vẽ tạo canvas khi nạp module: giả lập `document` như `duoc.test.ts`.
const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

let LOTS: Partial<Record<keyof typeof BUILDINGS, Lot>> = {};
let RUONG_LOT: Lot;
let BEN_LOT: Lot;
beforeAll(async () => {
  RUONG_LOT = (await import('./congTrinh/ruong')).RUONG_LOT;
  BEN_LOT = (await import('./congTrinh/ben')).BEN_LOT;
  const { KHO_LOT } = await import('./congTrinh/kho');
  const { DIEN_LOT } = await import('./congTrinh/dien');
  LOTS = { ruong: RUONG_LOT, kho: KHO_LOT, ben: BEN_LOT, dien: DIEN_LOT };
});

function capital(): GameState {
  const s = createInitialState(0);
  setDien(s, 5);
  s.resources = { gao: 50000, voOc: 50000, datDa: 50000, sat: 50000, go: 50000 };
  s.dan = 200;
  return s;
}

function put(s: GameState, type: keyof typeof BUILDINGS, x: number, z: number): Building {
  const r = place(s, type, x, z);
  if (!r.ok) throw new Error(`${type}: ${r.reason}`);
  r.value.workers = slotsOf(r.value);
  return r.value;
}

const LO = edge(5);
const ROW = DIEN + 2;

/** Ô (x, z) của điểm trên tuyến. */
const oOf = (p: { x: number; z: number }) => Math.floor(p.z) * GRID + Math.floor(p.x);

describe('lịch thay phiên', () => {
  it('một người: làm rồi gánh đi, lúc gánh công trình trống', () => {
    const D = 10;
    let empty = 0;
    let home = 0;
    for (let t = 0; t < 200; t += 0.5) {
      const ra = chuyenGanh(1, D, t, 0.3);
      expect(ra.length).toBeLessThanOrEqual(1);
      if (ra.length) {
        empty++;
        expect(ra[0].who).toBe(0);
        expect(ra[0].s).toBeGreaterThanOrEqual(0);
        expect(ra[0].s).toBeLessThan(2 * D);
      } else home++;
    }
    expect(empty).toBeGreaterThan(0);
    expect(home / (empty + home)).toBeCloseTo(LAM_S / (LAM_S + 2 * D), 1);
  });

  it(`từ hai người trở lên: mỗi lúc một người đi (từ ${HAI_LUOT} người thì hai), không bao giờ trống, ai cũng tới lượt`, () => {
    for (let n = 2; n <= 10; n++) {
      const lanes = n >= HAI_LUOT ? 2 : 1;
      const went = new Set<number>();
      for (let t = 0; t < 600; t += 0.37) {
        const ra = chuyenGanh(n, 7, t, 0.61);
        expect(ra.length).toBeLessThanOrEqual(lanes);
        expect(ra.length).toBeLessThan(n);
        expect(new Set(ra.map((r) => r.who)).size).toBe(ra.length);
        for (const r of ra) {
          expect(r.who).toBeGreaterThanOrEqual(0);
          expect(r.who).toBeLessThan(n);
          went.add(r.who);
        }
      }
      expect(went.size, `${n} người`).toBe(n);
    }
  });

  it('không có người hay không có đường thì không ai đi', () => {
    expect(chuyenGanh(0, 5, 3, 0)).toEqual([]);
    expect(chuyenGanh(3, 0, 3, 0)).toEqual([]);
  });
});

describe('tuyến gánh', () => {
  /** Ruộng ở bìa tây, xa Điện. */
  function farField(): { s: GameState; b: Building; t: TuyenGanh } {
    const s = capital();
    const b = put(s, 'ruong', LO, ROW);
    const t = tuyenGanh(s, b, LOTS)!;
    return { s, b, t };
  }

  it('đi đúng các ô của luật, không xuyên móng công trình nào; ra từ lối của ruộng, vào mép Điện', () => {
    const { s, b, t } = farField();
    const g = duongGanh(s, b)!;
    expect(t.noi).toBe(g.noi);
    // Giữa hai đầu là đúng các ô của luật, theo thứ tự.
    expect(t.pts.slice(1, -1).map(oOf)).toEqual(g.tuyen);
    const occ = occupancy(s);
    for (const i of g.tuyen) expect(occ[i], `ô ${i % GRID},${Math.floor(i / GRID)}`).toBe(0);
    // Điểm đầu trong móng ruộng, gần mép; điểm cuối trong móng Điện.
    const def = BUILDINGS.ruong;
    const a = t.pts[0];
    expect(a.x).toBeGreaterThan(b.x);
    expect(a.x).toBeLessThan(b.x + def.w);
    expect(a.z).toBeGreaterThan(b.z);
    expect(a.z).toBeLessThan(b.z + def.d);
    const end = t.pts[t.pts.length - 1];
    const dien = s.buildings[0];
    expect(end.x).toBeGreaterThan(dien.x);
    expect(end.x).toBeLessThan(dien.x + BUILDINGS.dien.w);
    // Mỗi bước giữa hai ô liền nhau dài không quá một đường chéo.
    for (let k = 1; k + 2 < t.pts.length; k++) expect(Math.hypot(t.pts[k + 1].x - t.pts[k].x, t.pts[k + 1].z - t.pts[k].z)).toBeLessThanOrEqual(Math.SQRT2 + 1e-9);
  });

  it('trải đường thì đi nhanh hơn', () => {
    const { s, b, t } = farField();
    for (let x = LO + size('ruong'); x < DIEN; x++) put(s, 'duongDat', x, ROW + 1);
    const t2 = tuyenGanh(s, b, LOTS)!;
    expect(t2.D).toBeLessThan(t.D * 0.75);
  });

  it('sát ngay nơi nhận, hay loại không gánh hàng thì không có tuyến', () => {
    const s = capital();
    const near = put(s, 'ruong', DIEN - size('ruong'), ROW);
    expect(tuyenGanh(s, near, LOTS)).toBe(null);
    const kho = put(s, 'kho', LO, LO);
    expect(tuyenGanh(s, kho, LOTS)).toBe(null);
  });

  it('lối ra là ô lối đi hay sân trống ở viền bản vẽ: bến quay mặt ra sông thì ra phía bờ', () => {
    const s = capital();
    const toi = { x: DIEN, z: DIEN };
    const p = loiRa({ type: 'ruong', x: LO, z: ROW }, toi, RUONG_LOT);
    // Ô lối ',' của ruộng ở hàng trước (mặt +z).
    expect(p.z).toBeGreaterThan(ROW + size('ruong') - 0.5);
    const ben = put(s, 'ben', DIEN, 52 - size('ben'));
    const q = loiRa(ben, toi, BEN_LOT);
    // Bến ở bờ nam quay mặt ra sông: lối ra phía đất là phía bắc móng.
    expect(q.z).toBeLessThan(ben.z + 0.5);
  });

  it('người đi từ chỗ đứng làm, tới nơi nhận đứng đổ hàng, đi tay không về đúng chỗ cũ', () => {
    const { t } = farField();
    const spot = { x: t.pts[0].x - 0.8, z: t.pts[0].z - 0.4 };
    const p = duongNguoi(t, spot);
    expect(p.di).toBeLessThanOrEqual(t.D - DO_HANG_S / 2 + 1e-9);
    const at0 = viTri(p, 0, t.D);
    expect(at0.x).toBeCloseTo(spot.x);
    expect(at0.z).toBeCloseTo(spot.z);
    expect(at0.mang).toBe(true);
    const mid = viTri(p, t.D, t.D);
    const end = t.pts[t.pts.length - 1];
    expect(mid.dung).toBe(true);
    expect(mid.x).toBeCloseTo(end.x);
    expect(mid.z).toBeCloseTo(end.z);
    const back = viTri(p, 2 * t.D - 1e-6, t.D);
    expect(back.mang).toBe(false);
    expect(back.x).toBeCloseTo(spot.x, 3);
    expect(back.z).toBeCloseTo(spot.z, 3);
    // Quãng chân bước tăng dần cả lượt đi lẫn lượt về.
    let last = -1;
    for (let k = 0; k <= 40; k++) {
      const q = viTri(p, (k / 40) * 2 * t.D * 0.999, t.D).quang;
      expect(q).toBeGreaterThanOrEqual(last - 1e-9);
      last = q;
    }
  });
});
