// Dân gánh hàng về kho (docs/thiet-ke.md mục Dân gánh hàng về kho, PR 2): người làm ở công trình thay phiên nhau
// gánh của làm ra theo đúng tuyến của luật (`duongGanh` ở game/vanChuyen.ts) tới nơi nhận, đứng đổ hàng rồi đi tay
// không về chỗ cũ. Không có người mới: người đi gánh là một trong số người đang làm, nên số người đứng làm cộng số người
// đang đi luôn bằng số người làm. Tệp này chỉ tính tuyến, lịch và chỗ đứng (không dùng Three.js); world.ts đưa người ra
// đường và vẽ.

import { BUILDINGS, GANH_BEP, type BuildingType, type Cost } from '../game/defs';
import type { Building, GameState } from '../game/game';
import { GRID, riverFacing, rotAngle } from '../game/map';
import { tetOpen } from '../game/tet';
import { chiPhiO, duongGanh, duongTu, ganhType, type DuongGanh } from '../game/vanChuyen';
import { CELL, type Lot } from './lot';

/**
 * Hàng gánh trên đòn, vác trên vai, gùi sau lưng hay đội trên đầu: của công trình làm ra (thóc… gỗ), vật liệu thợ vác
 * tới công trình đang xây (gỗ, đá, sắt, bó tre `tre`), nguyên liệu Tết người bếp gùi từ kho về (`gui`), mâm bánh mùa
 * Tết đội lên Điện (`mam`).
 */
export type Hang = 'thoc' | 'rau' | 'oc' | 'da' | 'sat' | 'ca' | 'la' | 'thit' | 'go' | 'tre' | 'gui' | 'mam';

/**
 * Chiều mang hàng: `di` gánh hàng tới nơi nhận rồi đi tay không về (của làm ra, mâm bánh); `ve` đi tay không tới nơi
 * nhận, lấy hàng rồi mang về (thợ vác vật liệu, người bếp gùi nguyên liệu).
 */
export type ChieuGanh = 'di' | 've';

/** Công trình làm ra gì thì gánh nấy: gỗ vác vai, còn lại gánh đòn hai thúng. */
export const HANG_OF: Partial<Record<BuildingType, Hang>> = {
  ruong: 'thoc',
  ruongNep: 'thoc',
  ben: 'oc',
  baiDa: 'da',
  loRen: 'sat',
  xuongMoc: 'go',
  langChai: 'ca',
  benKhoi: 'ca',
  vuon: 'la',
  chuongLon: 'thit',
};

/** Đi một ô có chi phí 1 (đất trống) mất chừng này giây; ô đường đi, cầu chi phí 0,5 nên đi nhanh gấp đôi. */
export const GIAY_MOI_O = 1.1;
/** Một người làm: làm chừng này giây rồi mới gánh đi (trong lúc gánh, công trình trống). */
export const LAM_S = 14;
/** Nhiều người làm: người trước về rồi chừng này giây người kế mới đi. */
export const NGHI_S = 3;
/** Đứng ở nơi nhận đổ hàng chừng này giây. */
export const DO_HANG_S = 1.6;
/** Từ chỗ đứng làm ra lối ra công trình tính tối đa chừng này ô (xa hơn thì đi tắt). */
const LEAD_O = 3;
/** Từ chừng này người làm thì hai người cùng gánh, so le nửa nhịp. */
export const HAI_LUOT = 6;

export interface Diem {
  x: number;
  z: number;
}

/** Tuyến gánh của một công trình, tọa độ lưới (tâm ô x là x + 0,5). */
export interface TuyenGanh {
  /** Từ lối ra công trình qua các ô đường gánh của luật tới mép nơi nhận. */
  pts: Diem[];
  /** Giây đi mỗi đoạn (theo chi phí ô của luật). */
  giay: number[];
  /** Giây một chiều theo lịch (cả phần từ chỗ đứng ra lối, chừa đổ hàng): mọi người làm cùng một nhịp. */
  D: number;
  /** Id nơi nhận. */
  noi: number;
}

/** Tâm ô thứ `i` (z * GRID + x). */
const tam = (i: number): Diem => ({ x: (i % GRID) + 0.5, z: Math.floor(i / GRID) + 0.5 });

/** Điểm gần `p` nhất trong hình chữ nhật móng của `b`, lùi vào trong chừng `inset` ô. */
function vaoMong(b: Pick<Building, 'type' | 'x' | 'z'>, p: Diem, inset: number): Diem {
  const def = BUILDINGS[b.type];
  return {
    x: Math.min(Math.max(p.x, b.x + inset), b.x + def.w - inset),
    z: Math.min(Math.max(p.z, b.z + inset), b.z + def.d - inset),
  };
}

/** Góc xoay mô hình công trình (như world.ts: loại sát sông quay mặt ra sông, còn lại theo hướng người chơi xoay). */
function gocOf(b: Pick<Building, 'type' | 'x' | 'z' | 'rot'>): number {
  const def = BUILDINGS[b.type];
  return def.nearRiver ? riverFacing(b.x, b.z, def.w, def.d) : rotAngle(b.rot);
}

/**
 * Lối ra của công trình về phía điểm `toi`: ô con lối đi (',') hay sân trống ('.') nằm ở viền bản vẽ, gần `toi` nhất
 * (bến, làng chài có khe sân ở hàng sau phía bờ). Không có bản vẽ thì mép móng gần `toi` nhất.
 */
export function loiRa(b: Pick<Building, 'type' | 'x' | 'z' | 'rot'>, toi: Diem, lot?: Lot): Diem {
  const def = BUILDINGS[b.type];
  const edge = vaoMong(b, toi, CELL / 2);
  if (!lot) return edge;
  const a = gocOf(b);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const cx = b.x + def.w / 2;
  const cz = b.z + def.d / 2;
  let best: Diem | null = null;
  let bd = Infinity;
  for (let j = 0; j < lot.n; j++) {
    for (let i = 0; i < lot.n; i++) {
      if (i > 0 && j > 0 && i < lot.n - 1 && j < lot.n - 1) continue;
      const ch = lot.rows[j][i];
      if (ch !== ',' && ch !== '.') continue;
      const lx = -lot.tiles / 2 + (i + 0.5) * CELL;
      const lz = -lot.tiles / 2 + (j + 0.5) * CELL;
      // Xoay quanh trục đứng như `Object3D.rotation.y`.
      const p = { x: cx + lx * cos + lz * sin, z: cz - lx * sin + lz * cos };
      // Lối đi được ưu tiên hơn sân trống chừng nửa ô.
      const d = Math.hypot(p.x - toi.x, p.z - toi.z) - (ch === ',' ? CELL : 0);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
  }
  return best ?? edge;
}

/**
 * Tuyến gánh của công trình `b` theo luật: null khi công trình không gánh hàng, không có lối, hay sát ngay nơi nhận
 * (không phải đi đường nào). `lots`: bản vẽ ô con theo loại công trình, để ra, vào đúng lối.
 */
export function tuyenGanh(state: GameState, b: Building, lots: Partial<Record<BuildingType, Lot>> = {}): TuyenGanh | null {
  if (!ganhType(b.type) || !HANG_OF[b.type]) return null;
  return tuyenTheo(state, b, duongGanh(state, b), lots[b.type], lots);
}

/**
 * Dựng tuyến vẽ từ đường `g` của luật: ra từ lối của `b` (bản vẽ `lot`; không có thì mép móng gần đường nhất), qua
 * các ô của luật, vào lối của nơi nhận (kho, Điện có bản vẽ ô con), đứng ngay trong mép móng.
 */
function tuyenTheo(state: GameState, b: Pick<Building, 'type' | 'x' | 'z' | 'rot'>, g: DuongGanh | null, lot: Lot | undefined, lots: Partial<Record<BuildingType, Lot>>): TuyenGanh | null {
  if (!g || !Number.isFinite(g.d) || !g.noi || !g.tuyen.length) return null;
  const noi = state.buildings.find((o) => o.id === g.noi);
  if (!noi) return null;
  const tiles = g.tuyen.map(tam);
  const pts: Diem[] = [loiRa(b, tiles[0], lot), ...tiles, loiRa(noi, tiles[tiles.length - 1], lots[noi.type])];
  const giay: number[] = [];
  for (let k = 0; k + 1 < pts.length; k++) {
    const len = Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].z - pts[k].z);
    // Bước vào ô trên tuyến tốn theo chi phí ô ấy; đoạn cuối vào mép nơi nhận tính như đất trống.
    const cost = k + 1 < pts.length - 1 ? chiPhiO(state, g.tuyen[k]) : 1;
    giay.push(len * (Number.isFinite(cost) ? cost : 1) * GIAY_MOI_O);
  }
  const di = giay.reduce((a, c) => a + c, 0);
  return { pts, giay, D: di + LEAD_O * GIAY_MOI_O + DO_HANG_S / 2, noi: g.noi };
}

/** Vật liệu thợ vác tới công trình đang xây theo giá phần việc: thứ nhiều nhất trong gỗ, đất đá, sắt; không có thì tre. */
export function vatLieu(cost: Cost | undefined): Hang {
  const c = cost ?? {};
  const list: [Hang, number][] = [
    ['go', c.go ?? 0],
    ['da', c.datDa ?? 0],
    ['sat', c.sat ?? 0],
  ];
  const [hang, n] = list.reduce((a, b) => (b[1] > a[1] ? b : a));
  return n > 0 ? hang : 'tre';
}

/**
 * Tuyến thợ vác vật liệu của công trình đang dựng hay đang nâng `b` (giàn giáo): từ mép móng gần đường nhất (giàn giáo
 * không có bản vẽ ô con) tới kho, Điện gần nhất. Null khi không có lối, sát ngay nơi nhận, hay chính `b` là nơi nhận
 * (nâng kho, nâng Điện: vật liệu có sẵn ngay đó).
 */
export function tuyenXay(state: GameState, b: Building, lots: Partial<Record<BuildingType, Lot>> = {}): TuyenGanh | null {
  return tuyenTheo(state, b, duongTu(state, b, 'kho'), undefined, lots);
}

/** Việc gánh của người bếp: tuyến, hàng, chiều. */
export interface ViecBep {
  tuyen: TuyenGanh;
  hang: Hang;
  chieu: ChieuGanh;
}

/**
 * Việc của người bếp gói bánh `bep`:
 * - Tết đang mở và có bánh (hay đã dâng): đội mâm bánh lên Điện (`mam`, chiều `di`).
 * - Không thì, khi có ruộng nếp, vườn đậu lá dong, chuồng lợn đang có người làm mà gánh nguyên liệu về kho, Điện (nơi
 *   ấy gần hơn bếp): gùi không tới kho, Điện gần bếp nhất lấy nguyên liệu về (`gui`, chiều `ve`).
 * - Còn lại: không đi đâu.
 */
export function viecBep(state: GameState, bep: Building, lots: Partial<Record<BuildingType, Lot>> = {}): ViecBep | null {
  if (bep.type !== 'bep' || bep.damaged) return null;
  const tet = state.tet;
  if (tetOpen(state) && (tet.banh.chung >= 1 || tet.banh.giay >= 1 || tet.offered.chung || tet.offered.giay)) {
    const tuyen = tuyenTheo(state, bep, duongTu(state, bep, 'dien'), lots.bep, lots);
    return tuyen ? { tuyen, hang: 'mam', chieu: 'di' } : null;
  }
  const veKho = state.buildings.some((b) => {
    if (!GANH_BEP.includes(b.type) || b.damaged || b.workers <= 0) return false;
    const g = duongGanh(state, b);
    const noi = g?.noi ? state.buildings.find((o) => o.id === g.noi) : undefined;
    return !!noi && noi.type !== 'bep';
  });
  if (!veKho) return null;
  const tuyen = tuyenTheo(state, bep, duongTu(state, bep, 'kho'), lots.bep, lots);
  return tuyen ? { tuyen, hang: 'gui', chieu: 've' } : null;
}

/** Đường riêng của một người: từ chỗ đứng làm `spot` ra lối rồi theo tuyến. */
export interface DuongNguoi {
  pts: Diem[];
  giay: number[];
  /** Giây đi một chiều của người này (không quá `TuyenGanh.D` trừ phần đổ hàng). */
  di: number;
}

export function duongNguoi(t: TuyenGanh, spot: Diem): DuongNguoi {
  const lead = Math.hypot(t.pts[0].x - spot.x, t.pts[0].z - spot.z);
  const giay = [Math.min(lead, LEAD_O) * GIAY_MOI_O, ...t.giay];
  return { pts: [spot, ...t.pts], giay, di: giay.reduce((a, c) => a + c, 0) };
}

/** Người đang đi gánh: người thứ `who` trong số người làm, đã rời chỗ được `s` giây (0 tới 2D). */
export interface Ra {
  who: number;
  s: number;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * Ai đang đi gánh lúc `t` (giây, đồng hồ cảnh). `n` người làm, mỗi chuyến đi rồi về mất 2D giây, `seed` (0..1) lệch
 * nhịp theo công trình. Một người: làm `LAM_S` giây rồi gánh đi, công trình trống lúc ấy. Nhiều người: thay phiên, mỗi
 * lúc một người đi (từ `HAI_LUOT` người thì hai người so le), người còn lại vẫn đứng làm.
 */
export function chuyenGanh(n: number, D: number, t: number, seed: number): Ra[] {
  if (n <= 0 || D <= 0) return [];
  const trip = 2 * D;
  if (n === 1) {
    const period = LAM_S + trip;
    const k = mod(t + seed * period, period);
    return k >= LAM_S ? [{ who: 0, s: k - LAM_S }] : [];
  }
  const lanes = n >= HAI_LUOT ? 2 : 1;
  const period = trip + NGHI_S;
  const out: Ra[] = [];
  for (let l = 0; l < lanes; l++) {
    const tt = t + seed * period + (l * period) / lanes;
    const k = Math.floor(tt / period);
    const r = tt - k * period;
    if (r < trip) out.push({ who: mod(k * lanes + l, n), s: r });
  }
  return out;
}

/** Chỗ người gánh lúc đã đi `s` giây: tọa độ lưới, hướng mặt, quãng đường đã bước (cho nhịp chân). */
export interface ViTri {
  x: number;
  z: number;
  ry: number;
  quang: number;
  /** Đang gánh hàng tới nơi nhận (chưa đổ). */
  mang: boolean;
  /** Đứng đổ hàng ở nơi nhận. */
  dung: boolean;
}

/** Lúc người đi ở chỗ `at` có đang mang hàng không: chiều `di` mang lượt đi, chiều `ve` mang từ lúc tới nơi nhận. */
export function coHang(chieu: ChieuGanh, at: Pick<ViTri, 'mang'>): boolean {
  return chieu === 'di' ? at.mang : !at.mang;
}

/** Điểm trên đường `p` sau `sec` giây đi theo chiều xuôi. */
function theoGiay(p: DuongNguoi, sec: number): { x: number; z: number; ry: number; quang: number } {
  let left = Math.max(0, sec);
  let quang = 0;
  for (let k = 0; k < p.giay.length; k++) {
    const a = p.pts[k];
    const b = p.pts[k + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const ry = Math.atan2(b.x - a.x, b.z - a.z);
    if (left <= p.giay[k] || k === p.giay.length - 1) {
      const u = p.giay[k] > 0 ? Math.min(left / p.giay[k], 1) : 1;
      return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, ry, quang: quang + len * u };
    }
    left -= p.giay[k];
    quang += len;
  }
  const last = p.pts[p.pts.length - 1];
  return { x: last.x, z: last.z, ry: 0, quang };
}

/**
 * Chỗ người gánh theo đường `p` sau `s` giây của chuyến dài 2D: đi xuôi `p.di` giây, đứng đổ hàng ở nơi nhận tới
 * `2D − p.di`, rồi đi ngược về chỗ đứng làm.
 */
export function viTri(p: DuongNguoi, s: number, D: number): ViTri {
  const di = Math.min(p.di, D - DO_HANG_S / 2);
  if (s < di) return { ...theoGiay(p, (s * p.di) / di), mang: true, dung: false };
  const back = 2 * D - di;
  const end = theoGiay(p, p.di);
  if (s < back) return { ...end, mang: s < D, dung: true };
  const u = Math.min((s - back) / di, 1);
  const at = theoGiay(p, p.di * (1 - u));
  return { x: at.x, z: at.z, ry: at.ry + Math.PI, quang: end.quang * 2 - at.quang, mang: false, dung: false };
}
