// Mẫu kinh đô: mỗi chương mở một mẫu bố trí công trình quanh Điện Vua Hùng. Mẫu không vẽ cứng mà dựng lại cho
// từng cấp Điện theo vùng đất đã khai phá, nên giãn theo đất: lũy, đê, bẫy chạy theo bìa đất, vòng thành Cổ Loa
// nới ra, công trình rải ra theo đất mới. Áp mẫu thì dời mọi công trình đang có vào chỗ trong mẫu và dựng thêm
// phần mẫu có mà mình chưa có (trong giới hạn theo cấp Điện). Phải đủ tài nguyên để dựng phần thiếu và trả phí
// dời thì mới áp được.

import { BUILDINGS, STAGES, U_NO, isDecor, type BuildingType, type Cost, RESOURCE_IDS } from './defs';
import { CH1_LAST } from './campaign';
import { inChapter4 } from './chuong4';
import { inChapter3 } from './coLoa';
import {
  barracksLevel,
  canAfford,
  dienLevel,
  fillWorkers,
  limitOf,
  usedOf,
  moveCost,
  pay,
  unlocked,
  uNoCount,
  uNoLimit,
  type Building,
  type GameState,
  type FailReason,
  type Result,
} from './game';
import { V11_AREA, isOpen, khoanhOf } from './khoanh';
import { DIEN_HOME, GRID, KHOANH, RIVER_START, inGrid, touchesRiver } from './map';

/**
 * Khung dựng mẫu ở cấp Điện `level`: hình vuông neo góc sông, cạnh như vùng đất của cấp ấy trước khi có khoảnh tự
 * chọn (`V11_AREA`). Mẫu giãn theo khung này; lúc áp mẫu, chỗ nào rơi vào khoảnh rừng chưa phát thì bỏ qua.
 * Trả về ô nhỏ nhất (cả x và z) của khung.
 */
export function frameStart(level: number): number {
  return RIVER_START - V11_AREA[Math.min(Math.max(level, 1), V11_AREA.length) - 1];
}

/** Các khoảnh phủ khung dựng mẫu ở cấp Điện `level` (phát đủ chừng này thì mọi chỗ của mẫu đều trên đất đã mở). */
export function frameKhoanh(level: number): number[] {
  const lo = frameStart(level);
  const out: number[] = [];
  for (let z = lo; z < RIVER_START; z += KHOANH) for (let x = lo; x < RIVER_START; x += KHOANH) out.push(khoanhOf(x, z));
  return out;
}

/** Ô (x, z) nằm trong khung dựng mẫu ở cấp Điện `level`. */
export function inFrame(x: number, z: number, level: number): boolean {
  const lo = frameStart(level);
  return x >= lo && z >= lo && x < RIVER_START && z < RIVER_START;
}
import { inChapter2 } from './son';
import { footprintTop, levelFootprint } from './terrain';

export type MauId = 'phongChau' | 'deBao' | 'coLoa' | 'coLoaSong';
export const MAU_IDS: MauId[] = ['phongChau', 'deBao', 'coLoa', 'coLoaSong'];

/** Một chỗ trong mẫu: loại công trình và góc móng (x, z). */
export interface Slot {
  type: BuildingType;
  x: number;
  z: number;
  /** Đoạn thành có ụ nỏ trên mặt thành (mẫu Cổ Loa giữ sông). */
  uNo?: boolean;
  /** Chỗ chòi canh dành cho lầu nỏ (mẫu Cổ Loa giữ sông): lầu nỏ đang có đứng vào đây trước. */
  lau?: boolean;
}

// ---------- Dựng mẫu theo vùng đất ----------

/** Ô đất cuối cùng trước sông (cả x và z). */
const LAST = RIVER_START - 1;
/** Ô cuối của móng Điện (cả x và z). */
const DIEN_END = DIEN_HOME + BUILDINGS.dien.w - 1;
/** Tâm móng Điện. */
const DIEN_C = DIEN_HOME + BUILDINGS.dien.w / 2;
/** Sân trước Điện (phía nam) và bên phải Điện (phía đông) rộng chừng này ô: chỗ cây nêu, mâm bánh, tướng đứng. */
const SAN = 2;
/** Đê bao chạy ở hàng (và cột) này: bãi bồi ngoài đê vừa một dải bến sát sông. */
const DE_AT = RIVER_START - 1 - BUILDINGS.ben.w;

/** Trạng thái ô trên bản nháp: còn trống, đã có công trình (hay ngoài vùng), chừa trống, bãi ngoài đê (chỉ cho bến). */
const FREE = 0;
const USED = 1;
const KEEP = 2;
const BANK = 3;

/** Phạt điểm chỗ dựng: sát tường (lũy, đê, thành, chòi, bẫy) thì nhẹ, sát công trình khác (không còn lối đi) thì rất nặng. */
const NEAR_WALL = 3;
const PACKED = 1000;
/** Phạt điểm chỗ dựng ngoài khu mẫu muốn (vòng thành Cổ Loa). */
const OFF_ZONE = 100;

/**
 * Loại có mốc mở theo truyện (đền, Hội Tết, đê, thành) chỉ dựng được sau kết chương 1, mà màn cuối chương 1
 * cần Điện cấp này: dưới cấp này mẫu không chừa chỗ cho chúng, đỡ chật đất.
 */
const storyDien = () => STAGES[CH1_LAST - 1].minDien;

/**
 * Số doanh trại mẫu chừa chỗ ở từng cấp Điện (chỉ số 0 là cấp 1): mỗi tướng thường đã có ở cấp ấy một trại.
 * Lạc tướng từ Điện 2; Gióng thành tráng sĩ khi rèn xong giáp sắt ở lò rèn cấp 3; Sơn Tinh ở chương 2 (Điện 6);
 * An Dương Vương ở chương 3 (Điện 7); Cao Lỗ ở chương 4 (Điện 8).
 */
export const MAU_BARRACKS = [0, 1, 2, 2, 2, 3, 4, 5];

/** Số chỗ mẫu chừa cho loại `type` ở cấp Điện `level`: đúng số tối đa theo cấp Điện (doanh trại: theo số tướng). */
function wantOf(type: BuildingType, level: number): number {
  const def = BUILDINGS[type];
  if (def.unlock && level < storyDien()) return 0;
  if (type === 'doanhTrai') return Math.min(MAU_BARRACKS[level - 1] ?? 0, def.limit[level - 1] ?? 0);
  return def.limit[level - 1] ?? 0;
}

/** Một vòng thành Cổ Loa: hình vuông kín từ ô (a, a) tới ô (b, b). */
interface Ring {
  a: number;
  b: number;
}

/** Bản nháp một mẫu ở một cấp Điện. */
class Draft {
  readonly lo: number;
  readonly cell = new Uint8Array(GRID * GRID);
  /** Ô là móng công trình nhiều ô: hai công trình nhiều ô nên cách nhau một ô làm lối đi. */
  readonly solid = new Uint8Array(GRID * GRID);
  /** Ô có công trình một ô (lũy, đê, thành, chòi canh, bẫy). */
  readonly wall = new Uint8Array(GRID * GRID);
  readonly slots: Slot[] = [];
  rings: Ring[] = [];

  constructor(readonly level: number) {
    this.lo = frameStart(level);
    for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) if (!inFrame(x, z, level)) this.cell[z * GRID + x] = USED;
  }

  at(x: number, z: number): number {
    return inGrid(x, z) ? this.cell[z * GRID + x] : USED;
  }

  count(type: BuildingType): number {
    let n = 0;
    for (const s of this.slots) if (s.type === type) n++;
    return n;
  }

  put(type: BuildingType, x: number, z: number): void {
    const w = BUILDINGS[type].w;
    for (let dz = 0; dz < w; dz++) {
      for (let dx = 0; dx < w; dx++) {
        const i = (z + dz) * GRID + x + dx;
        this.cell[i] = USED;
        if (w > 1) this.solid[i] = 1;
        else this.wall[i] = 1;
      }
    }
    this.slots.push({ type, x, z });
  }

  /** Đặt công trình một ô nếu ô còn trống. */
  segment(type: BuildingType, x: number, z: number): boolean {
    if (this.at(x, z) !== FREE) return false;
    this.put(type, x, z);
    return true;
  }

  /** Đánh dấu `v` (chừa trống hay bãi ngoài đê) cho các ô còn trống trong hình chữ nhật (x0, z0)–(x1, z1). */
  mark(x0: number, z0: number, x1: number, z1: number, v: number): void {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (this.at(x, z) === FREE) this.cell[z * GRID + x] = v;
  }

  /**
   * Phạt điểm nếu dựng `type` ở (x, z): 0 khi quanh móng còn lối đi một ô, `NEAR_WALL` khi sát tường,
   * `PACKED` khi sát công trình nhiều ô khác; -1 khi không dựng được.
   */
  penalty(type: BuildingType, x: number, z: number): number {
    const def = BUILDINGS[type];
    const w = def.w;
    if (def.nearRiver && !touchesRiver(x, z, w, w)) return -1;
    for (let dz = 0; dz < w; dz++) {
      for (let dx = 0; dx < w; dx++) {
        const c = this.at(x + dx, z + dz);
        if (c === BANK ? type !== 'ben' : c !== FREE) return -1;
      }
    }
    let p = 0;
    for (let dz = -1; dz <= w; dz++) {
      for (let dx = -1; dx <= w; dx++) {
        if (dx >= 0 && dx < w && dz >= 0 && dz < w) {
          dx = w - 1;
          continue;
        }
        if (!inGrid(x + dx, z + dz)) continue;
        const i = (z + dz) * GRID + x + dx;
        if (this.solid[i]) return PACKED;
        if (this.wall[i]) p = NEAR_WALL;
      }
    }
    return p;
  }

  /**
   * Độ khít của móng (x, z, cạnh w): số ô cách móng đúng hai ô (ngoài lối đi một ô) là móng công trình hay tường.
   * Móng khít nép vào công trình khác, chừa đúng một ô lối đi, thành dãy thẳng hàng.
   */
  snug(x: number, z: number, w: number): number {
    let n = 0;
    const hit = (cx: number, cz: number) => {
      if (!inGrid(cx, cz)) return;
      const i = cz * GRID + cx;
      if (this.solid[i] || this.wall[i]) n++;
    };
    for (let k = -2; k <= w + 1; k++) {
      hit(x + k, z - 2);
      hit(x + k, z + w + 1);
    }
    for (let k = -1; k <= w; k++) {
      hit(x - 2, z + k);
      hit(x + w + 1, z + k);
    }
    return n;
  }

  /** Tâm móng công trình loại `type` đầu tiên đã xếp (hay tâm Điện nếu chưa có). */
  centerOf(type: BuildingType): { x: number; z: number } {
    const s = this.slots.find((o) => o.type === type) ?? this.slots[0];
    const w = BUILDINGS[s.type].w;
    return { x: s.x + w / 2, z: s.z + w / 2 };
  }

  /** Số vòng thành bao trọn móng (x, z, cạnh w): 3 là trong vòng trong cùng, 0 là ngoài vòng ngoài. */
  ringsAround(x: number, z: number, w: number): number {
    let n = 0;
    for (const r of this.rings) if (x > r.a && z > r.a && x + w - 1 < r.b && z + w - 1 < r.b) n++;
    return n;
  }
}

/** Một chỗ dựng đang xét: góc, cạnh, tâm và các khoảng cách để chấm điểm. */
interface Foot {
  x: number;
  z: number;
  w: number;
  cx: number;
  cz: number;
  /** Số ô từ móng tới bờ sông gần nhất (0 là sát sông). */
  river: number;
  /** Số ô từ móng tới bìa rừng gần nhất (0 là sát bìa). */
  forest: number;
  /** Khoảng cách từ tâm móng tới tâm Điện. */
  dien: number;
  /** Độ lệch khỏi đường chéo qua Điện (từ góc rừng tới ngã ba sông). */
  diag: number;
}

/** Điểm chỗ dựng: thấp là tốt. */
type Score = (f: Foot, d: Draft) => number;

const near = (d: Draft, type: BuildingType, f: Foot): number => {
  const c = d.centerOf(type);
  return Math.hypot(f.cx - c.x, f.cz - c.z);
};
/** Về phía rừng so với Điện (không về phía ngã ba sông). */
const forestSide = (f: Foot) => (f.cx + f.cz > 2 * DIEN_C ? 40 : 0);
/** Cổ Loa: phạt chỗ không nằm trong đúng số vòng thành `rings` (3 là vòng trong, 0 là ngoài vòng ngoài). */
const zone = (d: Draft, f: Foot, rings: number) => Math.abs(d.ringsAround(f.x, f.z, f.w) - rings) * OFF_ZONE;

/** Phạt điểm chỗ dựng một mình lệch khỏi đường chéo: mẫu đứng đối xứng qua đường chéo từ góc rừng tới ngã ba sông. */
const ASYM = 8;
/** Thưởng điểm cho mỗi ô khít (`Draft.snug`). */
const SNUG = 0.2;
/** Thưởng khít lớn nhất cho móng cạnh `w`: đủ mọi ô cách móng hai ô. Dùng để bỏ sớm chỗ chắc chắn kém hơn. */
const snugMax = (w: number) => SNUG * 4 * (w + 3);

function footAt(d: Draft, x: number, z: number, w: number): Foot {
  const cx = x + w / 2;
  const cz = z + w / 2;
  return {
    x,
    z,
    w,
    cx,
    cz,
    river: Math.min(LAST - (x + w - 1), LAST - (z + w - 1)),
    forest: Math.min(x - d.lo, z - d.lo),
    dien: Math.hypot(cx - DIEN_C, cz - DIEN_C),
    diag: Math.abs(cx - cz),
  };
}

/** Xếp một công trình `type` vào chỗ điểm thấp nhất, ưu tiên chỗ trên đường chéo. Hết chỗ thì trả về false. */
function placeSingle(d: Draft, type: BuildingType, score: Score): boolean {
  const w = BUILDINGS[type].w;
  let best: { x: number; z: number } | null = null;
  let bestScore = Infinity;
  for (let z = d.lo; z + w - 1 <= LAST; z++) {
    for (let x = d.lo; x + w - 1 <= LAST; x++) {
      const p = d.penalty(type, x, z);
      if (p < 0 || p - snugMax(w) >= bestScore) continue;
      const base = p + (x === z ? 0 : ASYM) + score(footAt(d, x, z, w), d);
      if (base - snugMax(w) >= bestScore) continue;
      const s = base - SNUG * d.snug(x, z, w);
      if (s < bestScore) {
        bestScore = s;
        best = { x, z };
      }
    }
  }
  if (!best) return false;
  d.put(type, best.x, best.z);
  return true;
}

/**
 * Xếp một cặp công trình cùng cỡ đối xứng nhau qua đường chéo: `a` ở (x, z) phía bắc đường chéo, `b` ở (z, x)
 * phía tây. Hết chỗ thì trả về false.
 */
function placePair(d: Draft, a: BuildingType, b: BuildingType, score: Score): boolean {
  const w = BUILDINGS[a].w;
  let best: { x: number; z: number } | null = null;
  let bestScore = Infinity;
  for (let z = d.lo; z + w - 1 <= LAST; z++) {
    for (let x = z + w; x + w - 1 <= LAST; x++) {
      const pa = d.penalty(a, x, z);
      if (pa < 0 || pa - snugMax(w) >= bestScore) continue;
      const pb = d.penalty(b, z, x);
      if (pb < 0) continue;
      // Hai móng sát nhau qua đường chéo thì không còn lối đi.
      const p = Math.max(pa, pb, x - z === w ? PACKED : 0);
      const base = p + (score(footAt(d, x, z, w), d) + score(footAt(d, z, x, w), d)) / 2;
      if (base - snugMax(w) >= bestScore) continue;
      const s = base - SNUG * d.snug(x, z, w);
      if (s < bestScore) {
        bestScore = s;
        best = { x, z };
      }
    }
  }
  if (!best) return false;
  d.put(a, best.x, best.z);
  d.put(b, best.z, best.x);
  return true;
}

/**
 * Một việc xếp: một loại, hay hai loại cùng cỡ đứng đối xứng nhau qua đường chéo; và cách chấm chỗ.
 * Xếp từng cặp đối xứng, số lẻ thì cái còn lại đứng trên đường chéo (hết chỗ đối xứng thì đứng lệch).
 */
type Job = [BuildingType | [BuildingType, BuildingType], Score];

function placeJob(d: Draft, [what, score]: Job): void {
  const [a, b] = Array.isArray(what) ? what : [what, what];
  const left = (t: BuildingType) => wantOf(t, d.level) - d.count(t);
  for (;;) {
    const pair = a === b ? left(a) >= 2 : left(a) >= 1 && left(b) >= 1;
    if (!pair || !placePair(d, a, b, score)) break;
  }
  for (const t of a === b ? [a] : [a, b]) while (left(t) > 0 && placeSingle(d, t, score));
}

/** `n` vị trí rải đều trong đoạn [from, to]. */
function spread(n: number, from: number, to: number): number[] {
  return Array.from({ length: n }, (_, i) => from + Math.floor(((i + 0.5) * (to - from + 1)) / n));
}

/** Đặt công trình một ô `type` ở ô gần (x, z) nhất còn trống trên cùng hàng (theo `alongX`) hay cùng cột. */
function segmentNear(d: Draft, type: BuildingType, x: number, z: number, alongX: boolean): boolean {
  for (let k = 0; k < 4; k++) {
    for (const s of k ? [k, -k] : [0]) {
      if (d.segment(type, alongX ? x + s : x, alongX ? z : z + s)) return true;
    }
  }
  return false;
}

/** Bẫy chông rải đều ở hàng ô ngoài cùng hai mặt rừng (bắc và tây), nửa mỗi mặt, tới ô `to`. */
function edgeTraps(d: Draft, to = LAST): void {
  const n = wantOf('bayChong', d.level);
  const north = Math.ceil(n / 2);
  for (const x of spread(north, d.lo + 1, to)) segmentNear(d, 'bayChong', x, d.lo, true);
  for (const z of spread(n - north, d.lo + 1, to)) segmentNear(d, 'bayChong', d.lo, z, false);
}

/**
 * Chòi canh dọc hai đường: hàng `at` (chạy theo x) và cột `at` (chạy theo z), trong đoạn [from, to], chia đôi
 * hai đường, rải đều. Số lẻ thì một chòi đứng trên đường chéo, ở ô (`odd`, `odd`).
 */
function towersAlong(d: Draft, at: number, from: number, to: number, odd = at): void {
  const n = wantOf('choiCanh', d.level);
  if (n <= 0) return;
  if (n % 2) segmentNear(d, 'choiCanh', odd, odd, true);
  const k = Math.floor(n / 2);
  for (const p of spread(k, from, to)) segmentNear(d, 'choiCanh', p, at, true);
  for (const p of spread(k, from, to)) segmentNear(d, 'choiCanh', at, p, false);
}

/** Lũy tre bao hai mặt rừng (bắc và tây), bẫy chông ở hàng ngoài lũy, chòi canh và lối đi ngay trong lũy. */
function luyTre(d: Draft): void {
  const lo = d.lo;
  for (let x = lo + 1; x <= LAST; x++) d.segment('luy', x, lo + 1);
  for (let z = lo + 2; z <= LAST; z++) d.segment('luy', lo + 1, z);
  edgeTraps(d);
  towersAlong(d, lo + 2, lo + 3, LAST);
  d.mark(lo + 2, lo + 2, LAST, lo + 2, KEEP);
  d.mark(lo + 2, lo + 2, lo + 2, LAST, KEEP);
}

/**
 * Đê bao dọc hai bờ sông, cách sông 3 ô, chạy suốt tới bìa đất; bãi ngoài đê chỉ cho bến. Chòi canh ngay trong
 * đê (số lẻ thì một chòi ở góc rừng), bẫy chông ở bìa rừng. `towers`: mẫu tự xếp chòi canh ở chỗ khác thì bỏ.
 */
function deBao(d: Draft, towers = true): void {
  const lo = d.lo;
  for (let z = lo; z <= DE_AT; z++) d.segment('de', DE_AT, z);
  for (let x = lo; x < DE_AT; x++) d.segment('de', x, DE_AT);
  d.mark(DE_AT + 1, lo, LAST, LAST, BANK);
  d.mark(lo, DE_AT + 1, LAST, LAST, BANK);
  if (towers) towersAlong(d, DE_AT - 1, lo + 1, DE_AT - 2, lo + 1);
  edgeTraps(d, DE_AT - 2);
  d.mark(lo, lo, DE_AT - 1, lo, KEEP);
  d.mark(lo, lo, lo, DE_AT - 1, KEEP);
}

/**
 * Ba vòng thành Cổ Loa quanh Điện. Phía sông (đông, nam) ba vòng đứng sát nhau giữa sân Điện và đê. Phía rừng
 * (bắc, tây): vòng trong cách Điện 2 ô như sân; vòng giữa cách vòng trong 3 ô, vừa một dãy nhà 3×3; vòng ngoài
 * chừa ngoài nó 9 ô (bẫy, một dãy 4×4 và một dãy 3×3) rồi nới ra theo đất, nên lòng thành rộng dần theo cấp Điện.
 * Đất hẹp quá (Điện thấp) thì ba vòng đứng sát nhau. Không quá số đoạn thành tối đa.
 */
function thanhRings(level: number, lo: number): Ring[] {
  const b = [1, 2, 3].map((k) => DIEN_END + SAN + k);
  const max = BUILDINGS.thanh.limit[level - 1];
  const a1 = DIEN_HOME - SAN - 1;
  const a2 = a1 - 4;
  let a3 = lo + 9;
  while (4 * (b[0] - a1 + b[1] - a2 + b[2] - a3) > max) a3++;
  if (a3 <= a2 - 4) return [a1, a2, a3].map((a, i) => ({ a, b: b[i] }));
  const t = Math.max(lo + 1, a1 - 2);
  return [t + 2, t + 1, t].map((a, i) => ({ a, b: b[i] }));
}

/** Đê bao như mẫu Đê bao, thêm ba vòng thành quanh Điện. `towers`: như ở `deBao`. */
function coLoaWalls(d: Draft, towers = true): void {
  d.rings = thanhRings(d.level, d.lo);
  for (const { a, b } of d.rings) {
    for (let k = a; k <= b; k++) {
      d.segment('thanh', k, a);
      d.segment('thanh', k, b);
      d.segment('thanh', a, k);
      d.segment('thanh', b, k);
    }
  }
  // Vòng trong chỉ có Điện và sân.
  const inner = d.rings[0];
  d.mark(inner.a + 1, inner.a + 1, inner.b - 1, inner.b - 1, KEEP);
  deBao(d, towers);
}

/** Chỗ trong mẫu ở ô (x, z), nếu có. */
const slotAt = (d: Draft, x: number, z: number) => d.slots.find((s) => s.x === x && s.z === z);

/**
 * Cổ Loa giữ sông: ba vòng thành và đê bao như mẫu Cổ Loa. Ụ nỏ trên vòng thành ngoài, chia đều bốn mặt: phía bắc,
 * phía tây (bìa rừng) và hai mặt phía sông. Chòi canh ngay trong đê: ba chỗ dành cho lầu nỏ (hai ở phía sông, một
 * ở góc bắc tây), còn lại rải ở mặt bắc và mặt tây.
 */
function coLoaSongWalls(d: Draft): void {
  coLoaWalls(d, false);
  const outer = d.rings[d.rings.length - 1];
  const n = U_NO.limit[d.level - 1] ?? 0;
  const per = Math.ceil(n / 4);
  let left = n;
  const mark = (x: number, z: number) => {
    const s = slotAt(d, x, z);
    if (left > 0 && s?.type === 'thanh' && !s.uNo) {
      s.uNo = true;
      left--;
    }
  };
  for (const p of spread(per, outer.a + 1, outer.b - 1)) {
    mark(p, outer.a);
    mark(outer.a, p);
    mark(p, outer.b);
    mark(outer.b, p);
  }
  const lo = d.lo;
  const want = wantOf('choiCanh', d.level);
  const lau: [number, number, boolean][] = [
    [DIEN_HOME + 2, DE_AT - 1, true],
    [DE_AT - 1, DIEN_HOME + 2, false],
    [lo + 1, lo + 1, true],
  ];
  for (const [x, z, alongX] of lau.slice(0, Math.min(3, want))) {
    const before = d.slots.length;
    if (segmentNear(d, 'choiCanh', x, z, alongX)) d.slots[before].lau = true;
  }
  const rest = want - d.count('choiCanh');
  const north = Math.ceil(rest / 2);
  for (const p of spread(north, lo + 4, outer.b)) segmentNear(d, 'choiCanh', p, lo + 1, true);
  for (const p of spread(rest - north, lo + 4, outer.b)) segmentNear(d, 'choiCanh', lo + 1, p, false);
}

/** Mỗi mẫu: dựng tường và chòi canh theo vùng đất, rồi xếp công trình theo thứ tự việc. */
interface Recipe {
  walls: (d: Draft) => void;
  jobs: Job[];
}

/** Gần sông (trong đê nếu có đê), gần Điện trước. */
const byRiver: Score = (f) => f.river * 2 + f.dien * 0.3;
/** Gần Điện. */
const byDien: Score = (f) => f.dien;
/** Trên đồi phía rừng, gần bìa đất. */
const byHill: Score = (f) => f.forest * 2 + f.dien * 0.2;
/** Trên đường chéo từ Điện về góc rừng, gần Điện trước: trục đền, doanh trại. */
const byAxis: Score = (f) => f.diag * 4 + f.dien + forestSide(f);
/** Trên đường chéo, giữa Điện và góc rừng: doanh trại đứng giữa hai mặt giặc tới. */
const byFront: Score = (f, d) => f.diag * 4 + Math.abs((f.cx + f.cz) / 2 - (DIEN_HOME + d.lo) / 2) + forestSide(f);
/** Trên đường chéo, gần ngã ba sông: doanh trại trong đê, kịp ra chặn thủy quái từ hai bờ sông. */
const byBank: Score = (f) => f.diag * 4 + f.river * 2;
/** Quanh doanh trại. */
const byBarracks: Score = (f, d) => near(d, 'doanhTrai', f);
/** Quanh bếp gói bánh. */
const byKitchen: Score = (f, d) => near(d, 'bep', f);
/** Phạt điểm mỗi ô lệch khỏi dãy mẫu muốn (`row`). */
const ROW = 6;
/** Cổ Loa: dãy ngoài vòng ngoài, `k` ô tính từ bìa rừng (bỏ hàng bẫy): 1 là dãy 4×4 sát hàng bẫy, 2 là dãy 3×3 sát vòng ngoài. */
const row =
  (k: 1 | 2, score: Score): Score =>
  (f, d) =>
    Math.abs(f.forest - (k === 1 ? 1 : d.rings[2].a - d.lo - 3)) * ROW + score(f, d);
/** Cổ Loa: trong đúng số vòng thành `rings` rồi mới tới cách chấm `score`. */
const inRings =
  (rings: number, score: Score): Score =>
  (f, d) =>
    zone(d, f, rings) + score(f, d);

const RECIPES: Record<MauId, Recipe> = {
  // Kinh đô Phong Châu: bến và ruộng dọc sông; trục đền, doanh trại, trại giáo từ Điện về góc rừng, trại cung và
  // chuồng voi hai bên doanh trại; nhà sàn, kho, bếp quanh Điện; bãi đá trên đồi phía rừng; lũy tre bao hai mặt rừng.
  phongChau: {
    walls: luyTre,
    jobs: [
      ['ben', byDien],
      ['doanhTrai', byFront],
      ['denPhuDong', byAxis],
      ['traiGiao', byBarracks],
      [['traiCung', 'chuongVoi'], byBarracks],
      ['loRen', byBarracks],
      ['ruong', byRiver],
      ['nhaSan', byDien],
      ['kho', byDien],
      ['bep', byDien],
      [['vuon', 'chuongLon'], byKitchen],
      ['ruongNep', byRiver],
      ['baiDa', byHill],
    ],
  },
  // Đê bao chống lũ: đê dọc hai bờ sông tới bìa đất, bến ngoài đê, chòi canh sát đê; ruộng, đền, ruộng nếp trong đê.
  deBao: {
    walls: deBao,
    jobs: [
      ['ben', byDien],
      ['doanhTrai', byBank],
      ['denPhuDong', byAxis],
      ['denTanVien', byAxis],
      ['traiGiao', byBarracks],
      [['traiCung', 'chuongVoi'], byBarracks],
      ['loRen', byBarracks],
      ['ruong', byRiver],
      ['nhaSan', byDien],
      ['kho', byDien],
      ['bep', byDien],
      [['vuon', 'chuongLon'], byKitchen],
      ['ruongNep', byRiver],
      ['baiDa', byHill],
    ],
  },
  // Thành Cổ Loa: ba vòng thành kín quanh Điện; vòng trong chỉ có Điện và sân; nhà sàn, kho, lò rèn, bếp giữa các
  // vòng; ruộng, đền, doanh trại ngoài vòng ngoài; đê bao ngoài cùng.
  coLoa: {
    walls: coLoaWalls,
    jobs: [
      ['ben', byDien],
      ['doanhTrai', inRings(0, row(1, byAxis))],
      ['denCoLoa', inRings(1, byAxis)],
      ['nhaSan', inRings(2, byDien)],
      ['kho', inRings(2, byDien)],
      ['bep', inRings(2, byDien)],
      ['loRen', inRings(1, byDien)],
      [['vuon', 'chuongLon'], inRings(1, byKitchen)],
      [['denPhuDong', 'denTanVien'], inRings(0, row(1, byBarracks))],
      ['traiGiao', inRings(0, row(2, byBarracks))],
      [['traiCung', 'chuongVoi'], inRings(0, row(2, byBarracks))],
      ['ruong', inRings(0, row(1, byRiver))],
      ['ruongNep', inRings(0, row(1, byRiver))],
      ['baiDa', inRings(0, row(2, byHill))],
    ],
  },
  // Cổ Loa giữ sông (chương 4): như mẫu Cổ Loa, thêm ụ nỏ trên vòng thành ngoài, lầu nỏ giữ sông, trại nỏ cạnh
  // doanh trại, Đền Cuông phía bắc ngoài vòng ngoài.
  coLoaSong: {
    walls: coLoaSongWalls,
    jobs: [
      ['ben', byDien],
      ['doanhTrai', inRings(0, row(1, byAxis))],
      ['denCoLoa', inRings(1, byAxis)],
      ['nhaSan', inRings(2, byDien)],
      ['kho', inRings(2, byDien)],
      ['bep', inRings(2, byDien)],
      ['loRen', inRings(1, byDien)],
      [['vuon', 'chuongLon'], inRings(1, byKitchen)],
      [['denPhuDong', 'denTanVien'], inRings(0, row(1, byBarracks))],
      ['denCuong', inRings(0, row(1, byAxis))],
      ['traiGiao', inRings(0, row(2, byBarracks))],
      [['traiCung', 'chuongVoi'], inRings(0, row(2, byBarracks))],
      ['traiNo', inRings(0, row(2, byBarracks))],
      ['ruong', inRings(0, row(1, byRiver))],
      ['ruongNep', inRings(0, row(1, byRiver))],
      ['baiDa', inRings(0, row(2, byHill))],
    ],
  },
};

/** Sân trước Điện và bên phải Điện: chừa trống. */
function keepYard(d: Draft): void {
  d.mark(DIEN_HOME, DIEN_END + 1, DIEN_END + SAN, DIEN_END + SAN, KEEP);
  d.mark(DIEN_END + 1, DIEN_HOME, DIEN_END + SAN, DIEN_END, KEEP);
}

/** Dựng mẫu `id` ở cấp Điện `level`. */
function draw(id: MauId, level: number): Slot[] {
  const recipe = RECIPES[id];
  const d = new Draft(level);
  d.put('dien', DIEN_HOME, DIEN_HOME);
  recipe.walls(d);
  keepYard(d);
  for (const job of recipe.jobs) placeJob(d, job);
  return d.slots;
}

const DRAWN = new Map<string, Slot[]>();
/** Mọi chỗ trong mẫu `id` ở cấp Điện `level` (cả Điện), đều trong vùng đất đã khai phá ở cấp ấy. */
export function mauSlots(id: MauId, level: number): Slot[] {
  const lv = Math.min(Math.max(Math.round(level), 1), BUILDINGS.dien.maxLevel);
  const key = `${id}:${lv}`;
  let list = DRAWN.get(key);
  if (!list) {
    list = draw(id, lv);
    DRAWN.set(key, list);
  }
  return list;
}

/** Mỗi chương mở một mẫu: Phong Châu từ đầu, Đê bao khi vào chương 2, Cổ Loa khi vào chương 3, Cổ Loa giữ sông khi vào chương 4. */
export function mauUnlocked(state: GameState, id: MauId): boolean {
  if (id === 'deBao') return inChapter2(state);
  if (id === 'coLoa') return inChapter3(state);
  if (id === 'coLoaSong') return inChapter4(state);
  return true;
}

/** Lý do mẫu `id` chưa mở. */
const LOCK_REASON: Record<MauId, FailReason> = { phongChau: 'khongTimThay', deBao: 'canChuong2', coLoa: 'canChuong3', coLoaSong: 'canChuong4' };

/** Công trình một ô gắn với đất (lũy, đê, thành, bẫy): áp mẫu thì đoạn thừa bị dỡ đi, không dời. */
const SEGMENTS: BuildingType[] = ['luy', 'de', 'thanh', 'bayChong'];

export interface MauPlan {
  /** Công trình đang có sẽ dời tới chỗ mới. */
  moves: { id: number; x: number; z: number }[];
  /** Công trình sẽ dựng thêm. */
  builds: Slot[];
  /** Đoạn lũy, đê, thành, bẫy sẽ dỡ đi (thừa so với mẫu, hay vướng chỗ của mẫu); đường đi, đồ trang trí vướng mẫu. */
  removes: number[];
  /** Tổng giá: dựng phần thiếu và phí dời. */
  cost: Cost;
  /** Công trình không còn chỗ nào để xếp (mẫu không áp được). */
  stuck: number[];
  /** Ụ nỏ sẽ dựng thêm trên đoạn thành ở các ô này (mẫu Cổ Loa giữ sông), trong giới hạn theo cấp Điện. */
  uNos: { x: number; z: number }[];
}

const addCost = (a: Cost, b: Cost) => {
  for (const r of RESOURCE_IDS) if (b[r]) a[r] = (a[r] ?? 0) + b[r]!;
};

/** Lên kế hoạch áp mẫu `id` cho kinh đô hiện tại, chưa đổi gì. */
export function planMau(state: GameState, id: MauId): MauPlan {
  const level = dienLevel(state);
  const dien = state.buildings.find((b) => b.type === 'dien')!;
  // Mẫu vẽ cho Điện ở (DIEN_HOME, DIEN_HOME); Điện ở chỗ khác thì dịch cả mẫu theo.
  const ox = dien.x - DIEN_HOME;
  const oz = dien.z - DIEN_HOME;
  const fits = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    // Chỉ đặt trên đất đã mở: chỗ của mẫu rơi vào khoảnh rừng chưa phát thì bỏ qua.
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (!isOpen(state, x + dx, z + dz)) return false;
    return !def.nearRiver || touchesRiver(x, z, def.w, def.d);
  };
  const used = new Uint8Array(GRID * GRID);
  const mark = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) used[(z + dz) * GRID + x + dx] = 1;
  };
  const free = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (used[(z + dz) * GRID + x + dx]) return false;
    return true;
  };
  mark('dien', dien.x, dien.z);

  const plan: MauPlan = { moves: [], builds: [], removes: [], cost: {}, stuck: [], uNos: [] };
  const slots = mauSlots(id, level)
    .filter((s) => s.type !== 'dien')
    .map((s) => ({ ...s, x: s.x + ox, z: s.z + oz }))
    .filter((s) => fits(s.type, s.x, s.z));
  // Doanh trại xếp trước nơi ở riêng của các binh chủng, vì nơi ở cần doanh trại.
  const types = [...new Set(slots.map((s) => s.type))].sort((a, b) => Number(b === 'doanhTrai') - Number(a === 'doanhTrai'));
  let barracks = barracksLevel(state);
  const leftovers: Building[] = [];
  const cx = dien.x + BUILDINGS.dien.w / 2;
  const cz = dien.z + BUILDINGS.dien.d / 2;
  for (const type of types) {
    const def = BUILDINGS[type];
    // Chỗ gần Điện xếp trước.
    const open = slots
      .filter((s) => s.type === type)
      .sort((a, b) => Math.hypot(a.x + def.w / 2 - cx, a.z + def.d / 2 - cz) - Math.hypot(b.x + def.w / 2 - cx, b.z + def.d / 2 - cz));
    // Lầu nỏ một ô như chòi canh, đứng vào chỗ chòi canh của mẫu và tính là hai chòi canh trong giới hạn.
    // Mẫu có chỗ dành cho lầu nỏ thì lầu nỏ xếp trước, vào đúng những chỗ ấy.
    const sameSlot = (b: Building) => b.type === type || (type === 'choiCanh' && b.type === 'lauNo');
    const have = state.buildings
      .filter(sameSlot)
      .sort((a, b) => Number(b.type === 'lauNo') - Number(a.type === 'lauNo') || b.level - a.level || a.id - b.id);
    // Công trình đã đứng đúng một chỗ trong mẫu thì giữ nguyên.
    const rest: Building[] = [];
    for (const b of have) {
      const i = open.findIndex((s) => s.x === b.x && s.z === b.z);
      if (i >= 0) {
        open.splice(i, 1);
        mark(type, b.x, b.z);
      } else rest.push(b);
    }
    // Còn lại: dời tới chỗ trống gần nhất của mẫu.
    for (const b of rest) {
      if (!open.length) {
        leftovers.push(b);
        continue;
      }
      // Lầu nỏ vào chỗ dành cho lầu nỏ nếu còn; chòi canh để dành chỗ ấy cho lầu nỏ ghép về sau.
      const pool = open.map((s, i) => ({ s, i })).filter(({ s }) => (b.type === 'lauNo' ? s.lau : !s.lau));
      const list = pool.length ? pool : open.map((s, i) => ({ s, i }));
      let best = list[0].i;
      for (const { s, i } of list) {
        if (Math.hypot(s.x - b.x, s.z - b.z) < Math.hypot(open[best].x - b.x, open[best].z - b.z)) best = i;
      }
      const s = open.splice(best, 1)[0];
      plan.moves.push({ id: b.id, x: s.x, z: s.z });
      addCost(plan.cost, moveCost(b));
      mark(type, s.x, s.z);
    }
    // Chỗ trống còn lại: dựng thêm cho tới giới hạn theo cấp Điện, nếu loại này đã mở.
    const canBuild = def.buildable && unlocked(state, def.unlock) && level >= def.minDien && barracks >= (def.barracksLevel ?? 0);
    let room = canBuild ? limitOf(state, type) - usedOf(state, type) : 0;
    for (const s of open) {
      if (room <= 0) break;
      plan.builds.push(s);
      addCost(plan.cost, def.buildCost);
      mark(type, s.x, s.z);
      room--;
      // Doanh trại dựng thêm theo mẫu ở cấp 1: đủ để dựng trại giáo cùng lúc.
      if (type === 'doanhTrai') barracks = Math.max(barracks, 1);
    }
  }
  // Công trình thừa hay không có trong mẫu: đứng yên nếu không vướng chỗ của mẫu; đoạn lũy, đê, thành, bẫy
  // thừa thì dỡ; đường đi, đồ trang trí vướng thì dỡ; công trình khác vướng thì tìm chỗ trống gần nhất.
  for (const b of state.buildings) {
    if (b.type === 'dien' || types.includes(b.type) || (b.type === 'lauNo' && types.includes('choiCanh'))) continue;
    leftovers.push(b);
  }
  const inMau = new Set(types);
  const blocked: Building[] = [];
  for (const b of leftovers) {
    if (SEGMENTS.includes(b.type) && inMau.has(b.type)) plan.removes.push(b.id);
    else if (free(b.type, b.x, b.z)) mark(b.type, b.x, b.z);
    else if (SEGMENTS.includes(b.type) || isDecor(b.type)) plan.removes.push(b.id);
    else blocked.push(b);
  }
  for (const b of blocked) {
    const spot = nearestFree(b, fits, free);
    if (!spot) {
      plan.stuck.push(b.id);
      continue;
    }
    plan.moves.push({ id: b.id, x: spot.x, z: spot.z });
    addCost(plan.cost, moveCost(b));
    mark(b.type, spot.x, spot.z);
  }
  // Ụ nỏ trên các đoạn thành mẫu đánh dấu: dựng thêm khi đoạn thành ấy có (hay sắp dựng), chưa có ụ, còn trong
  // giới hạn theo cấp Điện (ụ trên đoạn thành bị dỡ thì mất theo).
  if (inChapter4(state)) {
    const removed = new Set(plan.removes);
    let room = uNoLimit(state) - (uNoCount(state) - state.buildings.filter((b) => b.uNo && removed.has(b.id)).length);
    for (const s of slots) {
      if (room <= 0) break;
      if (!s.uNo) continue;
      const wall = state.buildings.find((b) => b.type === 'thanh' && b.x === s.x && b.z === s.z && !removed.has(b.id));
      const built = plan.builds.some((x) => x.type === 'thanh' && x.x === s.x && x.z === s.z);
      if (wall ? wall.uNo || wall.damaged : !built) continue;
      plan.uNos.push({ x: s.x, z: s.z });
      addCost(plan.cost, U_NO.cost);
      room--;
    }
  }
  return plan;
}

/** Chỗ trống gần công trình `b` nhất (theo khoảng cách ô) mà vẫn trong vùng và không vướng mẫu. */
function nearestFree(
  b: Building,
  fits: (type: BuildingType, x: number, z: number) => boolean,
  free: (type: BuildingType, x: number, z: number) => boolean,
): { x: number; z: number } | null {
  let best: { x: number; z: number; d: number } | null = null;
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      const d = Math.abs(x - b.x) + Math.abs(z - b.z);
      if (best && d >= best.d) continue;
      if (fits(b.type, x, z) && free(b.type, x, z)) best = { x, z, d };
    }
  }
  return best ? { x: best.x, z: best.z } : null;
}

export function canApplyMau(state: GameState, id: MauId): Result<MauPlan> {
  if (!mauUnlocked(state, id)) return { ok: false, reason: LOCK_REASON[id] };
  if (state.raid.phase !== 'idle') return { ok: false, reason: 'dangCoGiac' };
  const plan = planMau(state, id);
  if (plan.stuck.length) return { ok: false, reason: 'khongDuCho' };
  if (!plan.moves.length && !plan.builds.length && !plan.removes.length && !plan.uNos.length) return { ok: false, reason: 'daTheoMau' };
  if (!canAfford(state, plan.cost)) return { ok: false, reason: 'thieuTaiNguyen' };
  return { ok: true, value: plan };
}

/**
 * Áp mẫu: dỡ đoạn thừa, nhấc mọi công trình phải dời ra rồi đặt vào chỗ mới, dựng thêm phần thiếu.
 * Công trình dời giữ cấp, người làm; nền đất cũ ở lại chỗ cũ, chỗ mới đắp móng phẳng như khi dựng mới.
 */
export function applyMau(state: GameState, id: MauId): Result<MauPlan> {
  const check = canApplyMau(state, id);
  if (!check.ok) return check;
  const plan = check.value;
  pay(state, plan.cost);
  state.buildings = state.buildings.filter((b) => !plan.removes.includes(b.id));
  for (const m of plan.moves) {
    const b = state.buildings.find((o) => o.id === m.id)!;
    b.x = m.x;
    b.z = m.z;
  }
  for (const m of plan.moves) {
    const b = state.buildings.find((o) => o.id === m.id)!;
    levelFootprint(state, b, footprintTop(state, b.type, b.x, b.z));
  }
  for (const s of plan.builds) {
    const b: Building = { id: state.nextId++, type: s.type, x: s.x, z: s.z, level: 1, workers: 0 };
    levelFootprint(state, b, footprintTop(state, s.type, s.x, s.z));
    state.buildings.push(b);
    fillWorkers(state, b);
  }
  for (const u of plan.uNos) {
    const wall = state.buildings.find((b) => b.type === 'thanh' && b.x === u.x && b.z === u.z);
    if (wall) wall.uNo = 'ok';
  }
  return check;
}

// ---------- Xếp kinh đô cũ vào mẫu (nâng bản lưu) ----------

/**
 * Lớp vòng thành của từng chỗ thành trong mẫu: đi từ Điện ra bìa rừng phải qua mấy lớp thành mới tới chỗ ấy
 * (1 là vòng trong cùng). Đi tám hướng như giặc, chéo góc giữa hai đoạn thành là hở.
 */
function thanhLayers(id: MauId, level: number): Map<number, number> {
  const wall = new Uint8Array(GRID * GRID);
  for (const s of mauSlots(id, level)) if (s.type === 'thanh') wall[s.z * GRID + s.x] = 1;
  const dist = new Int32Array(GRID * GRID).fill(1 << 20);
  const buckets: number[][] = [[]];
  for (const s of mauSlots(id, level)) {
    if (s.type !== 'dien') continue;
    const def = BUILDINGS.dien;
    for (let dx = 0; dx < def.w; dx++) {
      for (let dz = 0; dz < def.d; dz++) {
        const i = (s.z + dz) * GRID + s.x + dx;
        dist[i] = 0;
        buckets[0].push(i);
      }
    }
  }
  for (let d = 0; d < buckets.length; d++) {
    const list = buckets[d];
    while (list.length) {
      const i = list.pop()!;
      if (dist[i] !== d) continue;
      const cx = i % GRID;
      const cz = Math.floor(i / GRID);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dz) || !inGrid(cx + dx, cz + dz)) continue;
          const ni = (cz + dz) * GRID + cx + dx;
          const nd = d + wall[ni];
          if (nd >= dist[ni]) continue;
          dist[ni] = nd;
          (buckets[nd] ??= []).push(ni);
        }
      }
    }
  }
  const layers = new Map<number, number>();
  for (let i = 0; i < wall.length; i++) if (wall[i]) layers.set(i, dist[i]);
  return layers;
}

/** Đoạn lũy, đê đã có thì dựng đủ cả dải theo mẫu; thành thì dựng nốt vòng đang dở. */
const TOP_UP: BuildingType[] = ['luy', 'de', 'thanh'];

/**
 * Xếp các công trình `list` (chưa có trong state, trừ Điện) vào mẫu `id`, trong vùng đã khai phá, rồi thêm vào state.
 * - Mỗi loại vào chỗ cùng loại gần Điện trước, cấp cao trước; lầu nỏ vào chỗ chòi canh; thành xếp từ vòng trong ra.
 * - Công trình không có chỗ trong mẫu thì vào chỗ trống gần Điện nhất.
 * - Lũy, đê đã có thì dựng đủ cả dải theo mẫu; thành thì dựng nốt vòng đang dở, và đủ ít nhất `rings` vòng
 *   (số vòng kinh đô cũ đã có), miễn phí, trong giới hạn theo cấp Điện.
 * Giữ cấp, người làm, hư hỏng. Trả về các đoạn lũy, đê, thành, bẫy không còn chỗ (để hoàn của) và các đoạn dựng thêm.
 */
export function seatInMau(state: GameState, id: MauId, list: Building[], rings = 0): { dropped: Building[]; added: Building[] } {
  const level = dienLevel(state);
  const dien = state.buildings.find((b) => b.type === 'dien')!;
  const ox = dien.x - DIEN_HOME;
  const oz = dien.z - DIEN_HOME;
  const fits = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    // Chỉ đặt trên đất đã mở: chỗ của mẫu rơi vào khoảnh rừng chưa phát thì bỏ qua.
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (!isOpen(state, x + dx, z + dz)) return false;
    return !def.nearRiver || touchesRiver(x, z, def.w, def.d);
  };
  const used = new Uint8Array(GRID * GRID);
  const mark = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) used[(z + dz) * GRID + x + dx] = 1;
  };
  const free = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (used[(z + dz) * GRID + x + dx]) return false;
    return true;
  };
  for (const b of state.buildings) mark(b.type, b.x, b.z);
  const cx = dien.x + BUILDINGS.dien.w / 2;
  const cz = dien.z + BUILDINGS.dien.d / 2;
  const layers = thanhLayers(id, level);
  const layerOf = (s: Slot) => (s.type === 'thanh' ? (layers.get((s.z - oz) * GRID + s.x - ox) ?? 99) : 0);
  const slots = mauSlots(id, level)
    .filter((s) => s.type !== 'dien')
    .map((s) => ({ ...s, x: s.x + ox, z: s.z + oz }))
    .filter((s) => fits(s.type, s.x, s.z))
    .sort((a, b) => layerOf(a) - layerOf(b) || Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
  const dropped: Building[] = [];
  const homeless: Building[] = [];
  const order = [...list].sort((a, b) => BUILDINGS[b.type].w - BUILDINGS[a.type].w || b.level - a.level || a.id - b.id);
  for (const b of order) {
    const want = b.type === 'lauNo' ? 'choiCanh' : b.type;
    const i = slots.findIndex((s) => s.type === want && free(s.type, s.x, s.z));
    if (i >= 0) {
      const s = slots.splice(i, 1)[0];
      b.x = s.x;
      b.z = s.z;
      mark(b.type, b.x, b.z);
      state.buildings.push(b);
    } else if (SEGMENTS.includes(b.type) || isDecor(b.type)) dropped.push(b);
    else homeless.push(b);
  }
  for (const b of homeless) {
    b.x = Math.floor(cx);
    b.z = Math.floor(cz);
    const spot = nearestFree(b, fits, free);
    if (!spot) {
      dropped.push(b);
      continue;
    }
    b.x = spot.x;
    b.z = spot.z;
    mark(b.type, b.x, b.z);
    state.buildings.push(b);
  }
  // Dựng đủ lũy, đê theo mẫu; thành thì dựng nốt vòng đang dở.
  const added: Building[] = [];
  for (const type of TOP_UP) {
    const had = list.filter((b) => b.type === type && state.buildings.includes(b));
    if (!had.length) continue;
    const top = type === 'thanh' ? Math.max(rings, ...had.map((b) => layers.get((b.z - oz) * GRID + b.x - ox) ?? 0)) : Infinity;
    for (const s of slots.filter((x) => x.type === type && layerOf(x) <= top)) {
      if (usedOf(state, type) >= limitOf(state, type) || !free(type, s.x, s.z)) continue;
      const nb: Building = { id: state.nextId++, type, x: s.x, z: s.z, level: Math.min(...had.map((b) => b.level)), workers: 0 };
      mark(type, s.x, s.z);
      state.buildings.push(nb);
      added.push(nb);
    }
  }
  return { dropped, added };
}
