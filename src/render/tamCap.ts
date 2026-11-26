import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BUILDINGS, type BuildingType } from '../game/defs';
import { GATES_LEVEL } from '../game/doanhTrai';
import type { KeKieu } from './ke';
import { CELL, type Lot } from './lot';
import { outlineOf, toon } from './toon';

/**
 * Bậc tam cấp trước cổng, lối vào công trình đứng cao hơn đất quanh (chủ dự án: chỗ tiếp giáp cổng làm bậc tam cấp
 * cho thấy công trình ở trên cao; rồi: bậc lẫn vào nền khi đắp cao; bậc đá đẽo có thành bậc không hợp thời Văn Lang).
 * Chỉ để nhìn: bậc đất nện đi từ mặt móng xuống tới chỗ gặp mặt đất phía ngoài, mỗi bậc cao chừng `BAC_CAO`, nên đắp
 * càng cao bậc càng nhiều, càng dài; mũi mỗi bậc là một khúc gỗ tròn nằm ngang giữ đất, hai đầu khúc gỗ đóng cọc. Người
 * đi qua lối ấy bước trên mặt bậc (`tamCapY`).
 */

/** Một chỗ cổng trên mép móng, tọa độ móng (tâm móng là gốc, mặt trước là +z): tâm cổng, bề rộng, hướng ra ngoài. */
export interface CongMong {
  x: number;
  z: number;
  w: number;
  ox: number;
  oz: number;
}

/** Đất cách mép móng một ô thấp hơn móng ít nhất chừng này thì mới có bậc. */
export const TAM_CAP_MIN = 0.15;
/** Mỗi bậc cao chừng này (đơn vị thế giới), sâu `BAC_SAU` ô. */
export const BAC_CAO = 0.17;
export const BAC_SAU = 0.28;
/** Ít nhất, nhiều nhất chừng này bậc. Lối xuống ngắn quá (gặp móng khác) thì bậc cao hơn `BAC_CAO`. */
export const BAC_IT = 3;
export const BAC_NHIEU = 12;
/**
 * Lối xuống bị chặn (gặp móng khác, tường) nên không đủ chỗ xuống tới đất thì bậc cao hơn, tới chừng này; vẫn chưa tới
 * đất thì bậc cuối đứng trên một khối đá xuống tới đất.
 */
const BAC_TRAN = 0.3;
/** Bậc cuối cao hơn mặt đất ở chân bậc quá chừng này thì không làm bậc. */
const BAC_HANG = 0.35;
/** Khúc gỗ mũi bậc: bán kính; cọc hai đầu: bán kính, nhô trên mặt bậc chừng này. */
const GO_R = 0.07;
const COC_R = 0.042;
const COC_NHO = 0.14;
/** Thân bậc cắm xuống dưới mặt đất thấp nhất chừng này. */
const CHAN = 0.2;

/**
 * Các chỗ cổng của một công trình: Điện là cổng lầu trước sân chầu, doanh trại theo số cổng của cấp, loại khác là chỗ
 * lối đi (`,`) của bản vẽ ô con chạm mép móng. Loại sát sông, ruộng, vườn, đường, đồ trang trí, tường không có.
 */
export function tamCapCho(type: BuildingType, level: number, lot?: Lot): CongMong[] {
  const def = BUILDINGS[type];
  // Ruộng, vườn là đất trũng, không có cổng.
  if (def.nearRiver || def.decor || def.w < 2 || type === 'ruong' || type === 'ruongNep' || type === 'vuon') return [];
  if (type === 'dien') return [{ x: 0, z: def.d / 2, w: 3, ox: 0, oz: 1 }];
  if (type === 'doanhTrai') {
    const sides: [number, number][] = level >= GATES_LEVEL ? [[0, 1], [0, -1], [-1, 0], [1, 0]] : [[0, 1]];
    return sides.map(([sx, sz]) => ({ x: (sx * def.w) / 2, z: (sz * def.d) / 2, w: 1.6, ox: sx, oz: sz }));
  }
  if (!lot) return [];
  const out: CongMong[] = [];
  const half = lot.tiles / 2;
  const at = (i: number) => -half + (i + 0.5) * CELL;
  // Bốn mép bản vẽ: gom từng dải ô lối đi liền nhau thành một cổng.
  const mep: { cell: (k: number) => string; make: (c: number, w: number) => CongMong }[] = [
    { cell: (k) => lot.rows[lot.n - 1][k], make: (c, w) => ({ x: c, z: half, w, ox: 0, oz: 1 }) },
    { cell: (k) => lot.rows[0][k], make: (c, w) => ({ x: c, z: -half, w, ox: 0, oz: -1 }) },
    { cell: (k) => lot.rows[k][0], make: (c, w) => ({ x: -half, z: c, w, ox: -1, oz: 0 }) },
    { cell: (k) => lot.rows[k][lot.n - 1], make: (c, w) => ({ x: half, z: c, w, ox: 1, oz: 0 }) },
  ];
  for (const m of mep) {
    let k = 0;
    while (k < lot.n) {
      if (m.cell(k) !== ',') {
        k++;
        continue;
      }
      let e = k;
      while (e + 1 < lot.n && m.cell(e + 1) === ',') e++;
      out.push(m.make((at(k) + at(e)) / 2, Math.max(0.9, (e - k + 1) * CELL + 0.2)));
      k = e + 1;
    }
  }
  return out;
}

/** Chỗ làm bậc: điểm giữa mép móng (mặt móng `y`), hướng ra ngoài (`dx`, `dz`, độ dài 1), bề rộng lối. */
export interface TamCapCho {
  x: number;
  y: number;
  z: number;
  dx: number;
  dz: number;
  w: number;
}

/** Bậc đã xếp: số bậc, mỗi bậc cao `cao`, sâu `sau` ô; đáy thân bậc `day`. */
export interface TamCap extends TamCapCho {
  n: number;
  cao: number;
  sau: number;
  day: number;
}

/**
 * Xếp bậc cho một chỗ cổng: `dat(d, s)` là mặt đất ở điểm cách mép móng d ô ra ngoài, lệch ngang s ô khỏi tâm lối;
 * `xa` là lối xuống dài được bao nhiêu ô (gặp móng khác, tường, sông thì dừng). Bậc đi xuống tới chỗ gặp mặt đất (lấy
 * chỗ đất cao nhất ngang lối, để bậc cuối không chìm); lối ngắn thì bậc cao hơn, tới `BAC_TRAN`. Không có chỗ (đất ngoài
 * cổng không thấp hơn móng, lối bị chặn sát mép, hay chật tới mức bậc cuối vẫn cao hơn đất quá `BAC_HANG`) thì `null`.
 */
export function xepTamCap(c: TamCapCho, dat: (d: number, s: number) => number, xa: number): TamCap | null {
  const ngang = [-c.w / 2, 0, c.w / 2];
  const cao = (d: number) => Math.max(...ngang.map((s) => dat(d, s)));
  if (c.y - cao(1) < TAM_CAP_MIN && c.y - cao(0.05) < TAM_CAP_MIN) return null;
  const nMax = Math.min(BAC_NHIEU, Math.floor(xa / BAC_SAU + 1e-6));
  if (nMax < 2) return null;
  // Ít bậc nhất mà mỗi bậc không cao quá `BAC_CAO` vẫn xuống tới đất ở chân bậc.
  let n = Math.min(BAC_IT, nMax);
  while (n < nMax && c.y - cao(n * BAC_SAU) > n * BAC_CAO) n++;
  const h = Math.min((c.y - cao(n * BAC_SAU)) / n, BAC_TRAN);
  // Lối chật quá, bậc cuối vẫn cao hơn đất nhiều (nhà đắp cao ngay sát nhà khác, ruộng): thôi không làm bậc, khỏi một
  // khối đất dựng đứng như cột.
  if (h <= 0.02 || c.y - n * h - cao(n * BAC_SAU) > BAC_HANG) return null;
  let low = Infinity;
  for (let k = 0; k <= 2 * n; k++) for (const s of ngang) low = Math.min(low, dat((k * BAC_SAU) / 2, s * 1.2));
  return { ...c, n, cao: h, sau: BAC_SAU, day: Math.min(low, c.y - n * h) - CHAN };
}

/** Mặt bậc dưới chân người ở (px, pz) (cùng hệ tọa độ với chỗ bậc), hay `null` nếu không đứng trên bậc nào. */
export function tamCapY(list: readonly TamCap[], px: number, pz: number): number | null {
  for (const s of list) {
    const ox = px - s.x;
    const oz = pz - s.z;
    const d = ox * s.dx + oz * s.dz;
    const ngang = ox * s.dz - oz * s.dx;
    if (d < 0 || d >= s.n * s.sau || Math.abs(ngang) > s.w / 2) continue;
    return s.y - (Math.floor(d / s.sau) + 1) * s.cao;
  }
  return null;
}

/**
 * Màu bậc theo kiểu kè (`ke.ts`): mặt bậc đất nện, mặt đứng, khúc gỗ, cọc. Đất nện cọc tre, đá hộc: gỗ mộc; đá xanh
 * (Điện 7 trở lên): gỗ sẫm như gỗ lim; diềm đồng (Điện 9, 10) thì đầu cọc bịt đồng.
 */
const MAU_BAC: Record<KeKieu, [number, number, number, number]> = {
  0: [0xe2c48f, 0x8a6440, 0x7a4e2c, 0x5a3720],
  1: [0xe2c48f, 0x8a6440, 0x7a4e2c, 0x5a3720],
  2: [0xdcbb86, 0x86623e, 0x5e3b22, 0x4a2d18],
  3: [0xdcbb86, 0x86623e, 0x5e3b22, 0x4a2d18],
};

/** Tô màu khối: mặt hướng lên một màu, mặt đứng một màu. */
function toMau(g: THREE.BufferGeometry, tren: THREE.Color, dung: THREE.Color): void {
  const nor = g.getAttribute('normal');
  const n = nor.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = nor.getY(i) > 0.5 ? tren : dung;
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/** Khúc gỗ tròn ít mặt nằm dọc trục x, dài `dai`, tâm ở (0, y, z). */
function khucGo(dai: number, r: number, y: number, z: number, mau: THREE.Color): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, dai, 7, 1);
  g.rotateZ(Math.PI / 2);
  g.translate(0, y, z);
  toMau(g, mau, mau);
  return g;
}

/** Lối đất nối chân bậc ra đường: tìm trong chừng này ô quanh chân bậc; lối rộng chừng này, nổi trên mặt đất chừng này. */
export const LOI_XA = 8;
export const LOI_RONG = 0.7;
const LOI_DAY = 0.04;
/** Không có đường gần: lối mòn thẳng ra trước dài nhất chừng này, thu nhọn dần ở đầu cuối. */
export const LOI_MON = 1.2;
/** Sân đất nện ở chân bậc: dài ra trước chừng này, rộng hơn bậc mỗi bên chừng này. */
export const SAN_DAI = 0.4;
const SAN_LE = 0.08;
/** Màu lối: đúng màu đường đất (`decor.ts`), mép sẫm như viền đường đất. */
const LOI_LONG = 0xb48c5a;
const LOI_MEP = 0x93704a;

/** Lối đất của một bậc: sân chân bậc và lối tới đường (hay lối mòn ngắn). */
export interface LoiTamCap {
  bac: TamCap;
  /** Sân chân bậc: dài ra trước, nửa bề ngang (0 là không có sân). */
  san: number;
  sanNua: number;
  /** Tâm lối (tọa độ cảnh) từ chân bậc tới trong ô đường, đã bo góc; rỗng nếu không có lối. */
  pts: [number, number][];
  /** Lối không tới đường (lối mòn ngắn): đầu cuối thu nhọn. */
  mon: boolean;
  /** Các ô lối, sân đi qua (tọa độ ô), trừ ô đường. */
  o: [number, number][];
}

/** Bốn hướng trên lưới ô. */
const HUONG: readonly [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

/** Bo góc đường gấp khúc (cắt góc Chaikin), giữ hai đầu. */
function boGoc(p: [number, number][], lan = 2): [number, number][] {
  for (let l = 0; l < lan && p.length > 2; l++) {
    const q: [number, number][] = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i];
      const [bx, bz] = p[i + 1];
      q.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}

/** Hàng đợi ưu tiên nhỏ (đống nhị phân) cho tìm lối. */
class Dong {
  private a: [number, number][] = [];
  get size(): number {
    return this.a.length;
  }
  day(c: number, v: number): void {
    const a = this.a;
    a.push([c, v]);
    for (let i = a.length - 1; i > 0; ) {
      const cha = (i - 1) >> 1;
      if (a[cha][0] <= a[i][0]) break;
      [a[cha], a[i]] = [a[i], a[cha]];
      i = cha;
    }
  }
  lay(): [number, number] {
    const a = this.a;
    const top = a[0];
    const cuoi = a.pop()!;
    if (a.length) {
      a[0] = cuoi;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (l + 1 < a.length && a[l + 1][0] < a[m][0]) m = l + 1;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Lối đất từ chân bậc `s` ra ô đường gần nhất (chủ dự án: bậc nối thẳng vào nền đất, không có đường nối vào bậc). Chỉ
 * để nhìn. Tìm trên lưới ô (`goc` đổi tọa độ cảnh ra ô): `qua(tx, tz)` là ô đi qua được (đất trống đã mở), `duong(tx,
 * tz)` là ô đường. Ô có tâm nằm dưới thân bậc không tính là đường (bậc che mất); lối chỉ chui dưới bậc khi chân bậc
 * chạm ngay móng khác, tường (lối ra từ hông bậc). Lối đi thẳng ra trước, ít rẽ, xa nhất `LOI_XA` ô; không có đường gần
 * thì lối mòn ngắn thẳng ra trước. Chân bậc có sân đất nện nếu đủ chỗ. Chân bậc đã ở trên đường, hay không có lối lẫn
 * sân, thì `null`.
 */
export function loiTamCap(
  s: TamCap,
  goc: number,
  qua: (tx: number, tz: number) => boolean,
  duong: (tx: number, tz: number) => boolean,
): LoiTamCap | null {
  const L = s.n * s.sau;
  const fx = s.x + s.dx * L;
  const fz = s.z + s.dz * L;
  const oCua = (x: number, z: number): [number, number] => [Math.floor(x + goc), Math.floor(z + goc)];
  // Điểm cách chân bậc d ra trước, lệch ngang k (cùng chiều với `xepTamCap`).
  const diem = (d: number, k: number): [number, number] => [fx + s.dx * d + s.dz * k, fz + s.dz * d - s.dx * k];
  const duoiBac = (tx: number, tz: number) => {
    const ox = tx + 0.5 - goc - s.x;
    const oz = tz + 0.5 - goc - s.z;
    const d = ox * s.dx + oz * s.dz;
    return d >= 0 && d <= L && Math.abs(ox * s.dz - oz * s.dx) <= s.w / 2;
  };
  const truoc = oCua(...diem(0.1, 0));
  if (duong(...truoc)) return null;
  // Chân bậc chạm ngay móng, tường: lối bắt đầu từ ô dưới bậc cuối, ra từ hông bậc.
  const ket = !qua(...truoc);
  const [ax, az] = ket ? oCua(...diem(-0.1, 0)) : truoc;
  if (ket && (duong(ax, az) || !qua(ax, az))) return null;
  const diDuoc = (x: number, z: number) => {
    const [tx, tz] = oCua(x, z);
    return qua(tx, tz) || duong(tx, tz);
  };
  const o = new Map<string, [number, number]>();
  const them = (t: [number, number]) => {
    if (!duong(...t)) o.set(t.join(','), t);
  };
  // Sân chân bậc: dài nhất, rộng nhất mà các góc còn trên đất trống hay đường.
  let san = 0;
  let sanNua = 0;
  if (!ket) {
    timSan: for (const nua of [s.w / 2 + SAN_LE, Math.min(s.w / 2, LOI_RONG / 2 + 0.1)]) {
      for (const dai of [SAN_DAI, SAN_DAI / 2]) {
        const goc4 = [diem(0.1, 0), diem(0, -nua), diem(0, nua), diem(dai, -nua), diem(dai, nua), diem(dai, 0)];
        if (goc4.every((p) => diDuoc(...p))) {
          san = dai;
          sanNua = nua;
          for (const p of goc4) them(oCua(...p));
          break timSan;
        }
      }
    }
  }
  // Tìm đường ngắn nhất tới ô đường (Dijkstra trên ô và hướng đi tới, rẽ thì tốn thêm), bắt đầu theo hướng cổng.
  const r = LOI_XA;
  const W = 2 * r + 1;
  const so = (tx: number, tz: number, h: number) => ((tz - az + r) * W + (tx - ax + r)) * 4 + h;
  const xa = new Float64Array(W * W * 4).fill(Infinity);
  const sau = new Int32Array(W * W * 4).fill(-1);
  let h0 = 0;
  for (let h = 1; h < 4; h++) if (HUONG[h][0] * s.dx + HUONG[h][1] * s.dz > HUONG[h0][0] * s.dx + HUONG[h0][1] * s.dz) h0 = h;
  const toaDo = (st: number): [number, number, number] => {
    const cell = st >> 2;
    return [(cell % W) + ax - r, Math.floor(cell / W) + az - r, st & 3];
  };
  const dong = new Dong();
  xa[so(ax, az, h0)] = 0;
  dong.day(0, so(ax, az, h0));
  let dich = -1;
  while (dong.size) {
    const [c, st] = dong.lay();
    if (c > xa[st]) continue;
    const [tx, tz, h] = toaDo(st);
    if (duong(tx, tz)) {
      dich = st;
      break;
    }
    for (let h2 = 0; h2 < 4; h2++) {
      const nx = tx + HUONG[h2][0];
      const nz = tz + HUONG[h2][1];
      if (Math.abs(nx - ax) + Math.abs(nz - az) > r) continue;
      // Dưới thân bậc: không phải đường; chỉ đi qua (khuất dưới bậc) khi chân bậc bị chặn.
      const ok = duoiBac(nx, nz) ? ket && qua(nx, nz) : qua(nx, nz) || duong(nx, nz);
      if (!ok) continue;
      const nc = c + 1 + (h2 === h ? 0 : 0.4);
      const ns = so(nx, nz, h2);
      if (nc < xa[ns]) {
        xa[ns] = nc;
        sau[ns] = st;
        dong.day(nc, ns);
      }
    }
  }
  const tam = (t: [number, number]): [number, number] => [t[0] + 0.5 - goc, t[1] + 0.5 - goc];
  let pts: [number, number][] = [];
  let mon = false;
  if (dich >= 0) {
    const tiles: [number, number][] = [];
    for (let st = dich; st >= 0; st = sau[st]) tiles.unshift(toaDo(st).slice(0, 2) as [number, number]);
    const [c0x, c0z] = tam(tiles[0]);
    const toi = (c0x - fx) * s.dx + (c0z - fz) * s.dz;
    // Từ dưới bậc cuối ra tới ngang tâm ô đầu (bị chặn thì lùi vào dưới bậc), qua tâm các ô, vào trong ô đường một
    // đoạn (đường đè lên).
    pts = [diem(-0.08, 0), diem(ket ? Math.min(-0.1, toi) : Math.max(0.12, toi), 0)];
    for (let i = 1; i < tiles.length - 1; i++) pts.push(tam(tiles[i]));
    const [px, pz] = tam(tiles[tiles.length - 2]);
    const [kx, kz] = tiles[tiles.length - 1];
    const [bx, bz] = tiles[tiles.length - 2];
    pts.push([px + (kx - bx) * 0.8, pz + (kz - bz) * 0.8]);
    pts = boGoc(pts);
    for (const t of tiles) if (!duoiBac(...t)) them(t);
  } else if (!ket) {
    // Không có đường gần: lối mòn thẳng ra trước tới chừng `LOI_MON`, dừng trước ô không đi được.
    const nua = LOI_RONG / 2;
    let dai = 0;
    while (dai < LOI_MON && [-nua, 0, nua].every((k) => diDuoc(...diem(dai + 0.1, k)))) dai += 0.1;
    if (dai > SAN_DAI + 0.2) {
      pts = [diem(-0.08, 0), diem(dai, 0)];
      mon = true;
      for (let d = 0; d <= dai; d += 0.25) for (const k of [-nua, 0, nua]) them(oCua(...diem(d, k)));
    }
  }
  if (!pts.length && !san) return null;
  return { bac: s, san, sanNua, pts, mon, o: [...o.values()] };
}

/** Số giả ngẫu nhiên 0..1 cố định theo điểm (mép lối so le). */
function nhieu(x: number, z: number): number {
  const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Lối đất nện vẽ ôm theo mặt đất, gộp một lưới không viền mực (như mặt đường trên dốc): sân chân bậc và lối tới đường.
 * `y(x, z)` là mặt đất; điểm rơi vào ô bị chặn (`chan`: móng, tường) thì lấy độ cao giữa lối, khỏi leo lên bệ móng.
 */
export function buildLoiTamCap(list: readonly LoiTamCap[], y: (x: number, z: number) => number, chan: (x: number, z: number) => boolean = () => false): THREE.Mesh | null {
  if (!list.length) return null;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const long = new THREE.Color(LOI_LONG);
  const mep = new THREE.Color(LOI_MEP);
  const pha = (t: number) => mep.clone().lerp(long, t);
  /** Một dải lưới: mỗi hàng là các điểm ngang (x, z) kèm màu; hàng nối hàng thành tam giác. */
  const dai = (hang: { p: [number, number][]; c: THREE.Color[] }[]) => {
    const goc0 = pos.length / 3;
    const m = hang[0].p.length;
    for (const h of hang) {
      const yg = y(...h.p[(m - 1) >> 1]);
      h.p.forEach(([x, z], i) => {
        pos.push(x, (chan(x, z) ? yg : y(x, z)) + LOI_DAY, z);
        col.push(h.c[i].r, h.c[i].g, h.c[i].b);
      });
    }
    for (let j = 0; j < hang.length - 1; j++) {
      for (let i = 0; i < m - 1; i++) {
        const a = goc0 + j * m + i;
        const b = a + m;
        idx.push(a, b, b + 1, a, b + 1, a + 1);
      }
    }
  };
  const CAT = [-1, -0.5, 0, 0.5, 1];
  const MAU = [0, 1, 1, 1, 0];
  for (const l of list) {
    const s = l.bac;
    const L = s.n * s.sau;
    const fx = s.x + s.dx * L;
    const fz = s.z + s.dz * L;
    if (l.san) {
      // Sân chân bậc: từ dưới bậc cuối ra trước `san`, mép hai bên sẫm; không có lối thì mép trước cũng sẫm.
      const hang = [-0.06, l.san / 2, l.san].map((d, j) => ({
        p: CAT.map((k): [number, number] => [fx + s.dx * d + s.dz * k * l.sanNua, fz + s.dz * d - s.dx * k * l.sanNua]),
        c: MAU.map((t) => pha(j === 2 && !l.pts.length ? 0.35 * t : t)),
      }));
      dai(hang);
    }
    if (l.pts.length > 1) {
      // Lấy mẫu dọc lối mỗi 0,15, mép so le chút ít cho ra lối mòn; lối mòn thu nhọn ở đoạn cuối.
      const p = l.pts;
      const dd: number[] = [0];
      for (let i = 1; i < p.length; i++) dd.push(dd[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
      const tong = dd[dd.length - 1];
      const buoc = Math.max(2, Math.ceil(tong / 0.15));
      const tai = (t: number): [number, number] => {
        let i = 1;
        while (i < p.length - 1 && dd[i] < t) i++;
        const k = (t - dd[i - 1]) / Math.max(1e-9, dd[i] - dd[i - 1]);
        return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k];
      };
      const hang: { p: [number, number][]; c: THREE.Color[] }[] = [];
      for (let j = 0; j <= buoc; j++) {
        const t = (tong * j) / buoc;
        const [x, z] = tai(t);
        const [x0, z0] = tai(Math.max(0, t - 0.08));
        const [x1, z1] = tai(Math.min(tong, t + 0.08));
        const dl = Math.hypot(x1 - x0, z1 - z0) || 1;
        const nx = (z1 - z0) / dl;
        const nz = -(x1 - x0) / dl;
        const nhon = l.mon ? Math.min(1, (tong - t) / (tong * 0.6)) : 1;
        const nua = (LOI_RONG / 2) * (0.88 + 0.24 * nhieu(x, z)) * Math.max(0.05, nhon);
        hang.push({ p: CAT.map((k): [number, number] => [x + nx * k * nua, z + nz * k * nua]), c: MAU.map(pha) });
      }
      dai(hang);
    }
  }
  if (!idx.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon);
  mesh.receiveShadow = true;
  return mesh;
}

/** Hình các bậc tam cấp gộp một lưới (kèm viền mực); không có bậc nào thì `null`. */
export function buildTamCap(list: readonly TamCap[], kieu: KeKieu = 1): THREE.Group | null {
  if (!list.length) return null;
  const geos: THREE.BufferGeometry[] = [];
  const [hTren, hDung, hGo, hCoc] = MAU_BAC[kieu];
  const tren = new THREE.Color(hTren);
  const dung = new THREE.Color(hDung);
  const go = new THREE.Color(hGo);
  const coc = new THREE.Color(hCoc);
  const dong = new THREE.Color(0xb88a3a);
  const m = new THREE.Matrix4();
  for (const s of list) {
    const goc = Math.atan2(s.dx, s.dz);
    m.makeRotationY(goc).setPosition(s.x, 0, s.z);
    for (let k = 0; k < s.n; k++) {
      // Bậc k: mặt đất nện thấp hơn mặt móng (k + 1) bậc, thân cắm xuống tới đáy chung.
      const top = s.y - (k + 1) * s.cao;
      const g = new THREE.BoxGeometry(s.w, top - s.day, s.sau);
      g.translate(0, (top + s.day) / 2, (k + 0.5) * s.sau);
      toMau(g, tren, dung);
      geos.push(g.applyMatrix4(m));
      // Mũi bậc: khúc gỗ tròn nằm ngang, nửa chìm trong đất nện; hai đầu đóng cọc giữ.
      const zMui = (k + 1) * s.sau - GO_R * 0.8;
      geos.push(khucGo(s.w + 0.06, GO_R, top - GO_R * 0.35, zMui, go).applyMatrix4(m));
      for (const ben of [-1, 1]) {
        const yDinh = top + COC_NHO;
        const c = new THREE.CylinderGeometry(COC_R, COC_R * 0.85, yDinh - s.day, 6, 1);
        c.translate(ben * (s.w / 2 + COC_R * 0.6), (yDinh + s.day) / 2, zMui + GO_R * 0.3);
        toMau(c, coc, coc);
        geos.push(c.applyMatrix4(m));
        if (kieu === 3) {
          // Điện 9, 10: đầu cọc bịt đồng.
          const bit = new THREE.CylinderGeometry(COC_R * 1.25, COC_R * 1.25, 0.035, 6, 1);
          bit.translate(ben * (s.w / 2 + COC_R * 0.6), yDinh, zMui + GO_R * 0.3);
          toMau(bit, dong, dong);
          geos.push(bit.applyMatrix4(m));
        }
      }
    }
  }
  const geo = mergeGeometries(geos, false)!;
  for (const g of geos) g.dispose();
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geo, toon);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh, outlineOf(geo));
  return group;
}
