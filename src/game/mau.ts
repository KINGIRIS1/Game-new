// Mẫu kinh đô: mỗi chương mở một mẫu bố trí công trình quanh Điện Vua Hùng. Mẫu không vẽ cứng mà dựng lại cho
// từng cấp Điện theo vùng đất đã khai phá, nên giãn theo đất: lũy, đê, bẫy chạy theo bìa đất, vòng thành Cổ Loa
// nới ra, công trình rải ra theo đất mới. Áp mẫu thì dời mọi công trình đang có vào chỗ trong mẫu và dựng thêm
// phần mẫu có mà mình chưa có (trong giới hạn theo cấp Điện). Phải đủ tài nguyên để dựng phần thiếu và trả phí
// dời thì mới áp được.

import { BUILDINGS, STAGES, U_NO, isDecor, isRoad, type BuildingType, type Cost, RESOURCE_IDS } from './defs';
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
  newBuilding,
  pay,
  unlocked,
  uNoCount,
  uNoLimit,
  type Building,
  type GameState,
  type FailReason,
  type Result,
} from './game';
import { isOpen, khoanhOf } from './khoanh';
import { DIEN_HOME, GRID, KHOANH, RIVER_START, inGrid, isNearBank, touchesRiver } from './map';
import { bridgeheadCells } from './benKia';
import { isBusy, startBatch, thoRanh, xayMs, type PhanViec } from './xay';

/**
 * Khung dựng mẫu theo cấp Điện: cạnh hình vuông neo góc sông (bội số của khoảnh 5 ô). Mẫu xếp đủ mọi công trình tới
 * số tối đa của cấp ấy, mỗi công trình giáp đường; khung phải đủ rộng cho chừng ấy công trình cùng đường đi và tường
 * (`docs/thiet-ke.md` mục Mẫu kinh đô: khung theo cấp). Lúc áp mẫu, chỗ nào rơi vào khoảnh rừng chưa phát thì bỏ qua.
 */
export const MAU_KHUNG: Record<MauId, number[]> = {
  phongChau: [25, 30, 30, 35, 40, 45, 45, 50, 50, 50],
  deBao: [25, 30, 30, 35, 40, 45, 45, 50, 50, 50],
  coLoa: [25, 30, 30, 35, 45, 45, 45, 50, 50, 50],
  coLoaSong: [25, 30, 30, 35, 45, 45, 50, 50, 50, 50],
};

/** Cạnh khung dựng mẫu `id` ở cấp Điện `level`. */
const khungOf = (id: MauId, level: number) => MAU_KHUNG[id][Math.min(Math.max(level, 1), MAU_KHUNG[id].length) - 1];

/** Ô nhỏ nhất (cả x và z) của khung dựng mẫu `id` ở cấp Điện `level`. */
export function frameStart(level: number, id: MauId): number {
  return RIVER_START - khungOf(id, level);
}

/** Các khoảnh phủ khung dựng mẫu `id` ở cấp Điện `level` (phát đủ chừng này thì mọi chỗ của mẫu đều trên đất đã mở). */
export function frameKhoanh(level: number, id: MauId): number[] {
  const lo = frameStart(level, id);
  const out: number[] = [];
  for (let z = lo; z < RIVER_START; z += KHOANH) for (let x = lo; x < RIVER_START; x += KHOANH) out.push(khoanhOf(x, z));
  return out;
}

/** Ô (x, z) nằm trong khung dựng mẫu `id` ở cấp Điện `level`. */
export function inFrame(x: number, z: number, level: number, id: MauId): boolean {
  const lo = frameStart(level, id);
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
  /**
   * Đoạn lũy hay thành ở chỗ cổng thành: đã mở cổng thì áp mẫu dựng cổng ở đây thay đoạn tường (`planMau`), chưa mở
   * thì vẫn là tường, vòng tường không hở.
   */
  cong?: boolean;
}

// ---------- Dựng mẫu theo vùng đất ----------
//
// Mẫu dựng theo khung đường trước: mọi đường là đoạn thẳng theo hàng hay cột (không đường xéo), gồm đường quanh Điện,
// các phố chữ L ôm Điện phía rừng (mỗi phố một hàng và một cột, đối xứng qua đường chéo), hai trục từ Điện ra bìa rừng
// (qua cổng), đường chân đê. Giữa hai phố là một dải lô sâu tới 8 ô: nhà sâu 3–4 ô xếp sát mép phố hai bên, nhà 8×8
// giáp cả hai phố. Rồi công trình xếp vào chỗ giáp đường (bắt buộc), sát nhau thành dãy; chòi canh, bẫy xếp sau.
// Mỗi mẫu thử vài cách chia dải lô (và cỡ vòng thành), chọn cách xếp đủ mọi công trình mà ít đường nhất.

/** Ô đất cuối cùng trước sông (cả x và z). */
const LAST = RIVER_START - 1;
/** Ô cuối của móng Điện (cả x và z). */
const DIEN_END = DIEN_HOME + BUILDINGS.dien.w - 1;
/** Tâm móng Điện. */
const DIEN_C = DIEN_HOME + BUILDINGS.dien.w / 2;
/** Đường quanh Điện: hàng (và cột) ngay trước mép bắc, mép tây của Điện, và ngay sau mép nam, mép đông. */
const PALACE_A = DIEN_HOME - 1;
const PALACE_B = DIEN_END + 1;
/** Đê bao chạy ở hàng (và cột) này: bãi bồi ngoài đê vừa một dải bến sát sông. */
const DE_AT = RIVER_START - 1 - BUILDINGS.ben.w;
/** Đường chân đê, ngay trong đê: người gánh từ bến ngoài đê qua đê vào đường này. */
const CHAN_DE = DE_AT - 1;
/** Cột (và hàng) giữa Điện: trục đường và cổng thành, đối xứng qua đường chéo. */
const GATE_AXIS = DIEN_HOME + Math.floor(BUILDINGS.dien.w / 2);
/** Dải lô giữa hai phố sâu nhất chừng này ô (hai dãy nhà sâu 4 ô, hay một nhà 8×8). */
const BAND = 8;

/**
 * Trạng thái ô trên bản nháp: còn trống, đã có công trình (hay ngoài vùng), chừa trống, bãi ngoài đê (chỉ cho loại
 * phải sát sông: bến, làng chài), đường.
 */
const FREE = 0;
const USED = 1;
const KEEP = 2;
const BANK = 3;
const ROAD = 4;

/** Phạt điểm chỗ dựng ngoài khu mẫu muốn (vòng thành Cổ Loa). */
const OFF_ZONE = 100;

/**
 * Loại có mốc mở theo truyện (đền, Hội Tết, đê, thành) chỉ dựng được sau kết chương 1, mà màn cuối chương 1
 * cần Điện cấp này: dưới cấp này mẫu không chừa chỗ cho chúng, đỡ chật đất.
 */
const storyDien = () => STAGES[CH1_LAST - 1].minDien;

/** Số chỗ mẫu chừa cho loại `type` ở cấp Điện `level`: đúng số tối đa theo cấp Điện. */
function wantOf(type: BuildingType, level: number): number {
  const def = BUILDINGS[type];
  if (def.unlock && level < storyDien()) return 0;
  return def.limit[level - 1] ?? 0;
}

/** Một vòng thành Cổ Loa: hình vuông kín từ ô (a, a) tới ô (b, b). */
interface Ring {
  a: number;
  b: number;
}

const STEP4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Bản nháp một mẫu ở một cấp Điện. */
class Draft {
  readonly lo: number;
  readonly cell = new Uint8Array(GRID * GRID);
  /** Chỗ (số thứ tự trong `slots`, cộng 1) đứng trên ô; 0 là ô không có công trình. */
  readonly owner = new Int16Array(GRID * GRID);
  readonly slots: Slot[] = [];
  rings: Ring[] = [];
  /** Bảng cộng dồn ô không trống (`busy`) và ô không trống mà không phải bãi ngoài đê (`hard`), tính lại khi đổi. */
  private busy: Int32Array | null = null;
  private hard: Int32Array | null = null;

  constructor(
    readonly level: number,
    side: number,
  ) {
    this.lo = RIVER_START - side;
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) if (x < this.lo || z < this.lo || x > LAST || z > LAST) this.cell[z * GRID + x] = USED;
    }
  }

  at(x: number, z: number): number {
    return inGrid(x, z) ? this.cell[z * GRID + x] : USED;
  }

  private set(i: number, v: number): void {
    this.cell[i] = v;
    this.busy = this.hard = null;
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
        this.set(i, USED);
        this.owner[i] = this.slots.length + 1;
      }
    }
    this.slots.push({ type, x, z });
  }

  slotOf(i: number): Slot | undefined {
    const o = this.owner[i];
    return o ? this.slots[o - 1] : undefined;
  }

  /** Đặt công trình một ô nếu ô còn trống. */
  segment(type: BuildingType, x: number, z: number): boolean {
    if (this.at(x, z) !== FREE) return false;
    this.put(type, x, z);
    return true;
  }

  /** Đánh dấu `v` (chừa trống hay bãi ngoài đê) cho các ô còn trống trong hình chữ nhật (x0, z0)–(x1, z1). */
  mark(x0: number, z0: number, x1: number, z1: number, v: number): void {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (this.at(x, z) === FREE) this.set(z * GRID + x, v);
  }

  /** Trải đường thẳng từ ô (x0, z0) tới ô (x1, z1) (cùng hàng hay cùng cột) trên các ô trống hay chừa trống. */
  road(x0: number, z0: number, x1: number, z1: number): void {
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        const c = this.at(x, z);
        if (c === FREE || c === KEEP) this.set(z * GRID + x, ROAD);
      }
    }
  }

  /** Phố chữ L ở `v`: hàng `v` và cột `v`, từ góc (v, v) tới ô `end`. */
  ell(v: number, end: number): void {
    this.road(v, v, end, v);
    this.road(v, v, v, end);
  }

  /** Hai trục giữa Điện (cột và hàng `GATE_AXIS`) từ ô `from` tới ô `to`. */
  axis(from: number, to: number): void {
    this.road(GATE_AXIS, from, GATE_AXIS, to);
    this.road(from, GATE_AXIS, to, GATE_AXIS);
  }

  private sums(): void {
    const n = GRID + 1;
    const busy = new Int32Array(n * n);
    const hard = new Int32Array(n * n);
    for (let z = 0; z < GRID; z++) {
      let rb = 0;
      let rh = 0;
      for (let x = 0; x < GRID; x++) {
        const c = this.cell[z * GRID + x];
        if (c !== FREE) rb++;
        if (c !== FREE && c !== BANK) rh++;
        busy[(z + 1) * n + x + 1] = busy[z * n + x + 1] + rb;
        hard[(z + 1) * n + x + 1] = hard[z * n + x + 1] + rh;
      }
    }
    this.busy = busy;
    this.hard = hard;
  }

  /** Móng cạnh `w` ở (x, z) toàn ô trống (`bank`: kể cả bãi ngoài đê). */
  open(x: number, z: number, w: number, bank: boolean): boolean {
    if (x < 0 || z < 0 || x + w > GRID || z + w > GRID) return false;
    if (!this.busy) this.sums();
    const t = bank ? this.hard! : this.busy!;
    const n = GRID + 1;
    return t[(z + w) * n + x + w] - t[z * n + x + w] - t[(z + w) * n + x] + t[z * n + x] === 0;
  }

  /** Ô `i` là lối vào công trình: ô đường, hay (với loại phải sát sông) ô đê có đường ngay sau. */
  private gate(i: number, river: boolean): boolean {
    const c = this.cell[i];
    if (c === ROAD) return true;
    if (!river || c !== USED || this.slotOf(i)?.type !== 'de') return false;
    const x = i % GRID;
    const z = (i - x) / GRID;
    return STEP4.some(([dx, dz]) => this.at(x + dx, z + dz) === ROAD);
  }

  /** Móng cạnh `w` ở (x, z) giáp đường ở ít nhất một ô viền (không tính góc chéo). */
  reaches(x: number, z: number, w: number, river: boolean): boolean {
    for (let k = 0; k < w; k++) {
      for (const [cx, cz] of [
        [x + k, z - 1],
        [x + k, z + w],
        [x - 1, z + k],
        [x + w, z + k],
      ]) {
        if (inGrid(cx, cz) && this.gate(cz * GRID + cx, river)) return true;
      }
    }
    return false;
  }

  /** Số ô viền (không tính góc chéo) không còn trống: móng sát nhà khác, đường, tường thì xếp thành dãy khít. */
  contact(x: number, z: number, w: number): number {
    let n = 0;
    for (let k = 0; k < w; k++) {
      if (this.at(x + k, z - 1) !== FREE) n++;
      if (this.at(x + k, z + w) !== FREE) n++;
      if (this.at(x - 1, z + k) !== FREE) n++;
      if (this.at(x + w, z + k) !== FREE) n++;
    }
    return n;
  }

  /** Dựng được `type` ở (x, z): móng trống, sát sông nếu phải sát sông, giáp đường nếu là công trình nhiều ô. */
  fits(type: BuildingType, x: number, z: number): boolean {
    const def = BUILDINGS[type];
    const w = def.w;
    const river = !!def.nearRiver;
    if (river && !touchesRiver(x, z, w, w)) return false;
    if (!this.open(x, z, w, river)) return false;
    return w === 1 || this.reaches(x, z, w, river);
  }

  /** Số vòng thành bao trọn móng (x, z, cạnh w): 3 là trong vòng trong cùng, 0 là ngoài vòng ngoài. */
  ringsAround(x: number, z: number, w: number): number {
    let n = 0;
    for (const r of this.rings) if (x > r.a && z > r.a && x + w - 1 < r.b && z + w - 1 < r.b) n++;
    return n;
  }

  /** Số ô đường trên bản nháp. */
  roads(): number {
    let n = 0;
    for (let i = 0; i < this.cell.length; i++) if (this.cell[i] === ROAD) n++;
    return n;
  }

  /** Ô đi được trên mạng đường: ô đường, ô đê (dân gánh qua đê), ô cổng thành. */
  private walk(i: number, off: Uint8Array): boolean {
    if (this.cell[i] === ROAD) return !off[i];
    const s = this.slotOf(i);
    return !!s && (s.type === 'de' || !!s.cong);
  }

  /**
   * Ô đường `i` chạy qua đất trống: hai ô kề ngang dòng đường đều trống, ngoài khung, hay chỉ có bẫy, chòi canh (không
   * nhà, không tường: đường dọc tường giữ liền).
   */
  private bare(i: number): boolean {
    const x = i % GRID;
    const z = (i - x) / GRID;
    const along = this.at(x - 1, z) === ROAD || this.at(x + 1, z) === ROAD;
    const side = along
      ? [
          [x, z - 1],
          [x, z + 1],
        ]
      : [
          [x - 1, z],
          [x + 1, z],
        ];
    return side.every(([sx, sz]) => {
      const c = this.at(sx, sz);
      if (c === FREE || c === KEEP) return true;
      if (c !== USED) return false;
      const o = inGrid(sx, sz) ? this.slotOf(sz * GRID + sx) : undefined;
      return !o || o.type === 'bayChong' || o.type === 'choiCanh';
    });
  }

  /** Số ô đường kề ô (x, z). */
  private roadNear(x: number, z: number): number {
    let n = 0;
    for (const [dx, dz] of STEP4) if (this.at(x + dx, z + dz) === ROAD) n++;
    return n;
  }

  /** Loang trên mạng đường (bỏ các ô `off`) từ các ô gốc; trả về khoảng cách (-1: không tới). */
  private spreadFrom(roots: number[], off: Uint8Array): Int32Array {
    const dist = new Int32Array(GRID * GRID).fill(-1);
    const q = new Int32Array(GRID * GRID);
    let h = 0;
    let t = 0;
    for (const i of roots) {
      if (dist[i] >= 0 || !this.walk(i, off)) continue;
      dist[i] = 0;
      q[t++] = i;
    }
    while (h < t) {
      const i = q[h++];
      const x = i % GRID;
      const z = (i - x) / GRID;
      for (const [dx, dz] of STEP4) {
        if (!inGrid(x + dx, z + dz)) continue;
        const j = (z + dz) * GRID + x + dx;
        if (dist[j] >= 0 || !this.walk(j, off)) continue;
        dist[j] = dist[i] + 1;
        q[t++] = j;
      }
    }
    return dist;
  }

  /** Các ô viền (không tính góc chéo) của móng chỗ `s`. */
  private rim(s: Slot): number[] {
    const w = BUILDINGS[s.type].w;
    const out: number[] = [];
    const add = (cx: number, cz: number) => inGrid(cx, cz) && out.push(cz * GRID + cx);
    for (let k = 0; k < w; k++) {
      add(s.x + k, s.z - 1);
      add(s.x + k, s.z + w);
      add(s.x - 1, s.z + k);
      add(s.x + w, s.z + k);
    }
    return out;
  }

  /**
   * Tỉa đường: ô đường sát móng công trình nhiều ô (bến ngoài đê thì ô đường ngay sau đê), ô đường hai bên cổng thành
   * là lối vào, giữ lại; rồi bỏ dần đoạn đường thẳng (từ 3 ô) giữa hai ngã ba chạy qua đất trống (hai bên không có gì,
   * mọi lối vào vẫn nối về Điện, kho), bỏ ô đường cụt, tới khi không bỏ được nữa. Đường chỉ bị cắt ở ngã ba hay đầu mút nên vẫn là
   * các đoạn thẳng.
   */
  prune(): void {
    const off = new Uint8Array(GRID * GRID);
    const roots: number[] = [];
    for (const s of this.slots) if (s.type === 'dien' || s.type === 'kho') for (const i of this.rim(s)) if (this.cell[i] === ROAD) roots.push(i);
    const base = this.spreadFrom(roots, off);
    const need = new Uint8Array(GRID * GRID);
    const doors: number[] = [];
    const door = (i: number) => {
      if (need[i]) return;
      need[i] = 1;
      doors.push(i);
    };
    for (const s of this.slots) {
      if (s.cong) {
        for (const [dx, dz] of STEP4) if (this.at(s.x + dx, s.z + dz) === ROAD) door((s.z + dz) * GRID + s.x + dx);
        continue;
      }
      if (BUILDINGS[s.type].w === 1) continue;
      // Mọi ô viền móng là đường (công trình đứng sát phố nào thì giữ phố ấy), và ô đường ngay sau đê (bến ngoài đê).
      for (const i of this.rim(s)) {
        if (this.cell[i] === ROAD) door(i);
        else if (this.slotOf(i)?.type === 'de') {
          const x = i % GRID;
          const z = (i - x) / GRID;
          for (const [dx, dz] of STEP4) if (this.at(x + dx, z + dz) === ROAD) door((z + dz) * GRID + x + dx);
        }
      }
    }
    // Lối vào nào lúc đầu đã nối về nơi nhận thì sau khi tỉa vẫn phải nối.
    const must = doors.filter((i) => base[i] >= 0);
    const ok = () => {
      const dist = this.spreadFrom(roots, off);
      return must.every((i) => dist[i] >= 0);
    };
    const dropEnds = () => {
      for (let changed = true; changed; ) {
        changed = false;
        for (let i = 0; i < this.cell.length; i++) {
          if (this.cell[i] !== ROAD || need[i]) continue;
          const x = i % GRID;
          if (this.roadNear(x, (i - x) / GRID) <= 1) {
            this.set(i, FREE);
            changed = true;
          }
        }
      }
    };
    dropEnds();
    for (let changed = true; changed; ) {
      changed = false;
      // Đoạn đường giữa hai ngã ba (hay lối vào): ô đường không phải lối vào, đúng hai ô đường kề, nối liền nhau.
      const seen = new Uint8Array(GRID * GRID);
      const runs: number[][] = [];
      for (let i = 0; i < this.cell.length; i++) {
        if (seen[i] || this.cell[i] !== ROAD || need[i]) continue;
        const x0 = i % GRID;
        if (this.roadNear(x0, (i - x0) / GRID) !== 2) continue;
        const run: number[] = [];
        const stack = [i];
        seen[i] = 1;
        while (stack.length) {
          const j = stack.pop()!;
          run.push(j);
          const x = j % GRID;
          const z = (j - x) / GRID;
          for (const [dx, dz] of STEP4) {
            if (!inGrid(x + dx, z + dz)) continue;
            const k = (z + dz) * GRID + x + dx;
            if (seen[k] || this.cell[k] !== ROAD || need[k] || this.roadNear(x + dx, z + dz) !== 2) continue;
            seen[k] = 1;
            stack.push(k);
          }
        }
        runs.push(run);
      }
      runs.sort((p, q) => q.length - p.length || p[0] - q[0]);
      for (const run of runs) {
        if (run.length < 3 || !run.every((j) => this.bare(j))) continue;
        for (const j of run) off[j] = 1;
        if (ok()) {
          for (const j of run) {
            off[j] = 0;
            this.set(j, FREE);
          }
          changed = true;
          dropEnds();
          break;
        }
        for (const j of run) off[j] = 0;
      }
    }
  }

  /** Các ô đường (chỉ số ô), gần Điện trước. */
  roadCells(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.cell.length; i++) if (this.cell[i] === ROAD) out.push(i);
    const d = (i: number) => Math.hypot((i % GRID) + 0.5 - DIEN_C, Math.floor(i / GRID) + 0.5 - DIEN_C);
    return out.sort((a, b) => d(a) - d(b) || a - b);
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
  const s = d.slots.find((o) => o.type === type) ?? d.slots[0];
  const w = BUILDINGS[s.type].w;
  return Math.hypot(f.cx - s.x - w / 2, f.cz - s.z - w / 2);
};
/** Về phía rừng so với Điện (không về phía ngã ba sông). */
const forestSide = (f: Foot) => (f.cx + f.cz > 2 * DIEN_C ? 40 : 0);
/** Cổ Loa: phạt chỗ không nằm trong đúng số vòng thành `rings` (3 là vòng trong, 0 là ngoài vòng ngoài). */
const zone = (d: Draft, f: Foot, rings: number) => Math.abs(d.ringsAround(f.x, f.z, f.w) - rings) * OFF_ZONE;

/** Phạt điểm chỗ dựng một mình lệch khỏi đường chéo: mẫu đứng đối xứng qua đường chéo từ góc rừng tới ngã ba sông. */
const ASYM = 8;
/** Thưởng điểm cho mỗi ô viền không còn trống (`Draft.contact`): nhà xếp khít thành dãy, không chừa kẽ hở. */
const CONTACT = 0.6;

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
      if (!d.fits(type, x, z)) continue;
      const s = (x === z ? 0 : ASYM) + score(footAt(d, x, z, w), d) - CONTACT * d.contact(x, z, w);
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
      if (!d.fits(a, x, z) || !d.fits(b, z, x)) continue;
      const s =
        (score(footAt(d, x, z, w), d) + score(footAt(d, z, x, w), d)) / 2 - (CONTACT * (d.contact(x, z, w) + d.contact(z, x, w))) / 2;
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
 * Số thứ ba (nếu có): mẫu chỉ chừa chỗ cho việc này từ cấp Điện ấy (loại ấy chỉ mở khi Điện đã cao hơn).
 * Số thứ tư (nếu có): việc này xếp tối đa chừng ấy cái mỗi loại, số còn lại để việc sau xếp chỗ khác.
 */
type Job = [BuildingType | [BuildingType, BuildingType], Score, number?, number?];

function placeJob(d: Draft, [what, score, from = 0, max = Infinity]: Job): void {
  const [a, b] = Array.isArray(what) ? what : [what, what];
  const had = new Map([a, b].map((t) => [t, d.count(t)]));
  const left = (t: BuildingType) =>
    (d.level < from ? 0 : Math.min(wantOf(t, d.level), had.get(t)! + max)) - d.count(t);
  for (;;) {
    const pair = a === b ? left(a) >= 2 : left(a) >= 1 && left(b) >= 1;
    if (!pair || !placePair(d, a, b, score)) break;
  }
  for (const t of a === b ? [a] : [a, b]) while (left(t) > 0 && placeSingle(d, t, score));
}

/** Số chỗ còn thiếu so với số mẫu muốn (`wantOf`, `from` của từng việc) sau khi xếp. */
function shortfall(d: Draft, jobs: Job[]): number {
  const want = new Map<BuildingType, number>();
  for (const [what, , from = 0] of jobs) {
    for (const t of Array.isArray(what) ? what : [what]) {
      if (d.level >= from) want.set(t, wantOf(t, d.level));
      else if (!want.has(t)) want.set(t, 0);
    }
  }
  let n = 0;
  for (const [t, w] of want) n += Math.max(0, w - d.count(t));
  return n;
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

/** Ô trống gần ô (x, z) nhất (trong bán kính 10), không ra ngoài ô `inner` (cả x và z), ưu tiên ô giáp đường; -1 nếu không có. */
function freeNear(d: Draft, x: number, z: number, inner = d.lo + 1): number {
  let best = -1;
  let bestScore = Infinity;
  for (let dz = -10; dz <= 10; dz++) {
    for (let dx = -10; dx <= 10; dx++) {
      if (x + dx < inner || z + dz < inner || d.at(x + dx, z + dz) !== FREE) continue;
      const byRoad = STEP4.some(([ex, ez]) => d.at(x + dx + ex, z + dz + ez) === ROAD) ? 0 : 0.5;
      const s = Math.abs(dx) + Math.abs(dz) + byRoad;
      if (s < bestScore) {
        bestScore = s;
        best = (z + dz) * GRID + x + dx;
      }
    }
  }
  return best;
}

/**
 * Chòi canh dọc hai mặt: hàng `at` (chạy theo x) và cột `at` (chạy theo z), trong đoạn [from, to], chia đôi, rải
 * đều, mỗi chòi vào ô trống gần chỗ định nhất (xếp sau công trình, vào kẽ trống; không ra ngoài ô `inner`). Số lẻ
 * thì một chòi gần ô (`odd`, `odd`) trên đường chéo.
 */
function towersAlong(d: Draft, n: number, at: number, from: number, to: number, odd = at, inner = d.lo + 1): void {
  if (n <= 0) return;
  const put = (x: number, z: number) => {
    const i = freeNear(d, x, z, inner);
    if (i >= 0) d.put('choiCanh', i % GRID, Math.floor(i / GRID));
  };
  if (n % 2) put(odd, odd);
  const k = Math.floor(n / 2);
  for (const p of spread(k, from, to)) {
    const i = freeNear(d, p, at, inner);
    if (i < 0) continue;
    const x = i % GRID;
    const z = Math.floor(i / GRID);
    d.put('choiCanh', x, z);
    if (d.at(z, x) === FREE) d.put('choiCanh', z, x);
    else put(at, p);
  }
}

/** Bẫy chông rải đều ở hàng ô ngoài cùng hai mặt rừng (bắc và tây), nửa mỗi mặt, tới ô `to`. */
function edgeTraps(d: Draft, to = LAST): void {
  const n = wantOf('bayChong', d.level);
  const north = Math.ceil(n / 2);
  for (const x of spread(north, d.lo + 1, to)) segmentNear(d, 'bayChong', x, d.lo, true);
  for (const z of spread(n - north, d.lo + 1, to)) segmentNear(d, 'bayChong', d.lo, z, false);
}

/**
 * Cách chia một quãng đất giữa hai phố thành các dải lô: dải 8 ô từ phía Điện ra (lõi kinh đô dày, dải mỏng ra phía
 * rừng; thử trước), từ phía rừng vào, chia đều, hay ít phố nhất (dải sâu tới 10 ô: chừa một hai hàng trống nhưng chứa
 * được nhà 8×8 khi quãng chỉ 9–10 ô).
 */
type Split = 'in' | 'out' | 'even' | 'wide';

/**
 * Chia quãng `t` ô giữa hai phố thành các dải lô sâu 3–8 ô, giữa hai dải là một phố (mỗi dải giáp phố cả hai mặt).
 * Trả về độ sâu từng dải, từ phía Điện ra; quãng dưới 3 ô thì không có dải nào.
 */
function splitSpan(t: number, mode: Split): number[] {
  if (t < 3) return [];
  const n = Math.ceil((t + 1) / (BAND + (mode === 'wide' ? 3 : 1)));
  let sizes: number[];
  if (mode === 'even' || mode === 'wide') {
    const body = t - (n - 1);
    sizes = Array.from({ length: n }, (_, i) => Math.floor(body / n) + (i < body % n ? 1 : 0));
  } else {
    sizes = Array.from({ length: n - 1 }, () => BAND);
    const rest = t - (BAND + 1) * (n - 1);
    if (rest < 3 && n > 1) {
      const tot = sizes.pop()! + rest;
      const a = Math.ceil(tot / 2);
      sizes.push(a, tot - a);
    } else sizes.push(rest);
    if (mode === 'out') sizes.reverse();
  }
  return sizes;
}

/**
 * Các phố chữ L chia quãng giữa phố `inner` (phía Điện) và phố `outer` (phía rừng) thành dải lô theo `mode`, mỗi phố
 * chạy tới ô `end`. Trả về hàng các phố đã trải (kể cả hai phố biên nếu `edges`).
 */
function streets(d: Draft, inner: number, outer: number, end: number, mode: Split): number[] {
  const out: number[] = [];
  let v = inner;
  for (const s of splitSpan(inner - outer - 1, mode).slice(0, -1)) {
    v -= s + 1;
    d.ell(v, end);
    out.push(v);
  }
  return out;
}

/** Đường quanh Điện: vòng vuông kín sát bốn mặt Điện. */
function palaceRing(d: Draft): void {
  d.road(PALACE_A, PALACE_A, PALACE_B, PALACE_A);
  d.road(PALACE_A, PALACE_B, PALACE_B, PALACE_B);
  d.road(PALACE_A, PALACE_A, PALACE_A, PALACE_B);
  d.road(PALACE_B, PALACE_A, PALACE_B, PALACE_B);
}

/** Đường quanh Điện nối ra tới ô `end` (sông hay đường chân đê): bốn mặt kéo dài về phía sông. */
function palaceRoads(d: Draft, end: number): void {
  palaceRing(d);
  d.ell(PALACE_A, end);
  d.road(PALACE_A, PALACE_B, end, PALACE_B);
  d.road(PALACE_B, PALACE_A, PALACE_B, end);
}

/**
 * Chừa ô ngay trước và ngay sau cặp cổng ở (x, at) mặt bắc và (at, x) mặt tây: dân gánh hàng chỉ qua tường ở cổng
 * (tường chắn hẳn), công trình đứng sát cổng thì cổng thành vô dụng.
 */
function keepGate(d: Draft, x: number, at: number): void {
  d.mark(x, at - 1, x, at - 1, KEEP);
  d.mark(x, at + 1, x, at + 1, KEEP);
  d.mark(at - 1, x, at - 1, x, KEEP);
  d.mark(at + 1, x, at + 1, x, KEEP);
}

/** Chỗ trong mẫu ở ô (x, z), nếu có. */
const slotAt = (d: Draft, x: number, z: number) => d.slotOf(z * GRID + x);

/** Một cách dựng khung: cách chia dải lô, và (mẫu Cổ Loa) cỡ vòng thành. */
interface Variant {
  split: Split;
  /** Cổ Loa: vòng trong ôm sát Điện (`tight`) hay chừa đường quanh Điện; bề dày khu giữa vòng trong và vòng giữa, giữa vòng giữa và vòng ngoài. */
  tight?: boolean;
  t1?: number;
  t2?: number;
}

/**
 * Phong Châu: lũy tre bao hai mặt rừng (bắc và tây), bẫy chông ở hàng ngoài lũy, phố trong lũy; đường quanh Điện;
 * các phố chữ L giữa hai đường ấy chạy tới sông; hai trục giữa Điện ra cổng lũy (từ cấp Điện có cổng thành).
 */
function luyTre(d: Draft, v: Variant): void {
  const lo = d.lo;
  for (let x = lo + 1; x <= LAST; x++) d.segment('luy', x, lo + 1);
  for (let z = lo + 2; z <= LAST; z++) d.segment('luy', lo + 1, z);
  edgeTraps(d);
  if (wantOf('congThanh', d.level) > 0) {
    for (const s of [slotAt(d, GATE_AXIS, lo + 1), slotAt(d, lo + 1, GATE_AXIS)]) if (s?.type === 'luy') s.cong = true;
    keepGate(d, GATE_AXIS, lo + 1);
  }
  palaceRoads(d, LAST);
  // Phố trong lũy, nếu giữa lũy và đường quanh Điện còn đủ chỗ cho một dải lô.
  const outer = lo + 2;
  if (PALACE_A - outer - 1 >= 3) {
    d.ell(outer, LAST);
    streets(d, PALACE_A, outer, LAST, v.split);
    d.axis(outer, PALACE_A);
  }
}

/**
 * Đê bao dọc hai bờ sông, cách sông 3 ô, chạy suốt tới bìa đất; bãi ngoài đê chỉ cho bến, làng chài. Đường chân đê
 * ngay trong đê, bẫy chông ở bìa rừng, phố bìa rừng ngay trong hàng bẫy.
 */
function deBaoWalls(d: Draft): void {
  const lo = d.lo;
  for (let z = lo; z <= DE_AT; z++) d.segment('de', DE_AT, z);
  for (let x = lo; x < DE_AT; x++) d.segment('de', x, DE_AT);
  d.mark(DE_AT + 1, lo, LAST, LAST, BANK);
  d.mark(lo, DE_AT + 1, LAST, LAST, BANK);
  edgeTraps(d, DE_AT - 1);
  d.road(CHAN_DE, lo + 1, CHAN_DE, CHAN_DE);
  d.road(lo + 1, CHAN_DE, CHAN_DE, CHAN_DE);
  d.ell(lo + 1, CHAN_DE);
}

/** Đê bao: đê, đường quanh Điện nối ra đường chân đê, các phố chữ L giữa Điện và bìa rừng. */
function deBao(d: Draft, v: Variant): void {
  deBaoWalls(d);
  palaceRoads(d, CHAN_DE);
  streets(d, PALACE_A, d.lo + 1, CHAN_DE, v.split);
}

/**
 * Ba vòng thành Cổ Loa quanh Điện theo cách dựng `v`. Phía sông (đông, nam) ba vòng đứng sát nhau. Vòng trong ôm sát
 * Điện, hay chừa đường quanh Điện; phía rừng, khu giữa vòng trong và vòng giữa dày `t1` ô, khu giữa vòng giữa và vòng
 * ngoài dày `t2` ô (5: một dãy nhà và một phố; 9: hai dãy nhà và một phố giữa).
 */
function ringsOf(v: Variant): Ring[] {
  const a1 = v.tight ? DIEN_HOME - 1 : DIEN_HOME - 2;
  const b1 = v.tight ? DIEN_END + 1 : DIEN_END + 2;
  const a2 = a1 - v.t1! - 1;
  const a3 = a2 - v.t2! - 1;
  return [
    { a: a1, b: b1 },
    { a: a2, b: b1 + 1 },
    { a: a3, b: b1 + 2 },
  ];
}

/** Số đoạn thành của các vòng. */
const ringCost = (rings: Ring[]) => rings.reduce((n, r) => n + 4 * (r.b - r.a), 0);

/** Phố trong khu dày `t` ô giữa vòng thành `wall` (phía Điện) và vòng ngoài nó: sát vòng ngoài (5) hay giữa khu (9). */
const bandRoad = (wall: number, t: number) => (t >= 9 ? wall - 5 : wall - t);

/**
 * Cổ Loa: đê bao như mẫu Đê bao; ba vòng thành kín quanh Điện (`ringsOf`); cổng trên vòng ngoài và vòng giữa ở hai
 * trục giữa Điện, đoạn trục nối cổng với phố trong khu; phố trong từng khu giữa hai vòng; ngoài vòng ngoài một phố sát
 * chân thành (cổng ngoài mở ra phố này), các phố chữ L ra tới bìa rừng, tới đường chân đê.
 */
function coLoaWalls(d: Draft, v: Variant): void {
  d.rings = ringsOf(v);
  for (const { a, b } of d.rings) {
    for (let k = a; k <= b; k++) {
      d.segment('thanh', k, a);
      d.segment('thanh', k, b);
      d.segment('thanh', a, k);
      d.segment('thanh', b, k);
    }
  }
  const [r1, r2, r3] = d.rings;
  // Cổng thành: trên vòng ngoài và (đủ bốn cổng) vòng giữa, ở trục giữa Điện.
  const want = wantOf('congThanh', d.level);
  for (const r of want >= 4 ? [r3, r2] : want > 0 ? [r3] : []) {
    for (const s of [slotAt(d, GATE_AXIS, r.a), slotAt(d, r.a, GATE_AXIS)]) if (s) s.cong = true;
    keepGate(d, GATE_AXIS, r.a);
  }
  deBaoWalls(d);
  // Trong vòng trong: Điện và đường quanh Điện (nếu vòng trong chừa chỗ).
  if (!v.tight) palaceRing(d);
  d.mark(r1.a + 1, r1.a + 1, r1.b - 1, r1.b - 1, KEEP);
  // Khu giữa vòng trong và vòng giữa, giữa vòng giữa và vòng ngoài.
  const p1 = bandRoad(r1.a, v.t1!);
  d.ell(p1, r1.b);
  d.road(GATE_AXIS, r2.a + 1, GATE_AXIS, r1.a - 1);
  d.road(r2.a + 1, GATE_AXIS, r1.a - 1, GATE_AXIS);
  const p2 = bandRoad(r2.a, v.t2!);
  d.ell(p2, r2.b);
  d.road(GATE_AXIS, r3.a + 1, GATE_AXIS, r2.a - 1);
  d.road(r3.a + 1, GATE_AXIS, r2.a - 1, GATE_AXIS);
  // Ngoài vòng ngoài.
  const outer = r3.a - 1;
  d.ell(outer, CHAN_DE);
  streets(d, outer, d.lo + 1, CHAN_DE, v.split);
}

/** Chòi canh mẫu Đê bao, Cổ Loa: ngay trong đê dọc hai bờ (số lẻ thì một chòi ở góc rừng). */
function deTowers(d: Draft): void {
  towersAlong(d, wantOf('choiCanh', d.level), CHAN_DE - 1, d.lo + 2, CHAN_DE - 2, d.lo + 2);
}

/** Chòi canh mẫu Phong Châu: ngay trong lũy, rải hai mặt rừng. */
function luyTowers(d: Draft): void {
  towersAlong(d, wantOf('choiCanh', d.level), d.lo + 3, d.lo + 4, LAST, d.lo + 3, d.lo + 2);
}

/**
 * Cổ Loa giữ sông: ụ nỏ trên vòng thành ngoài, chia đều bốn mặt (bắc, tây phía rừng; hai mặt phía sông), né cổng.
 * Chòi canh: ba chỗ dành cho lầu nỏ (hai ở phía sông giữa vòng ngoài và đường chân đê, một ở góc bắc tây), còn lại
 * rải ở mặt bắc và mặt tây gần bìa rừng.
 */
function coLoaSongMarks(d: Draft): void {
  const outer = d.rings[d.rings.length - 1];
  const n = U_NO.limit[d.level - 1] ?? 0;
  const per = Math.ceil(n / 4);
  let left = n;
  const mark = (x: number, z: number) => {
    const s = slotAt(d, x, z);
    if (left > 0 && s?.type === 'thanh' && !s.uNo && !s.cong) {
      s.uNo = true;
      left--;
    }
  };
  for (const p of spread(per, outer.a + 2, outer.b - 1)) {
    const q = p === GATE_AXIS ? p + 1 : p;
    mark(q, outer.a);
    mark(outer.a, q);
    mark(q, outer.b);
    mark(outer.b, q);
  }
}

function coLoaSongTowers(d: Draft): void {
  const lo = d.lo;
  const want = wantOf('choiCanh', d.level);
  const outer = d.rings[d.rings.length - 1];
  const lau: [number, number][] = [
    [DIEN_END - 2, outer.b + 1],
    [outer.b + 1, DIEN_END - 2],
    [lo + 2, lo + 2],
  ];
  for (const [x, z] of lau.slice(0, Math.min(3, want))) {
    const i = freeNear(d, x, z);
    if (i < 0) continue;
    d.put('choiCanh', i % GRID, Math.floor(i / GRID));
    d.slots[d.slots.length - 1].lau = true;
  }
  towersAlong(d, want - d.count('choiCanh'), lo + 2, lo + 5, outer.b, lo + 2);
}

/** Mỗi mẫu: dựng tường và khung đường theo vùng đất và cách dựng, rồi xếp công trình, rồi chòi canh. */
interface Recipe {
  walls: (d: Draft, v: Variant) => void;
  jobs: Job[];
  towers: (d: Draft) => void;
  /** Các cách dựng khung để thử, theo thứ tự ưu tiên (chia nhóm theo cỡ vòng thành). */
  variants: (level: number) => Variant[][];
}

/** Gần sông (trong đê nếu có đê), gần Điện trước. */
const byRiver: Score = (f) => f.river * 2 + f.dien * 0.3;
/** Gần Điện. */
const byDien: Score = (f) => f.dien;
/** Kho cách kho khác chừng này ô trở lên thì không bị phạt điểm. */
const KHO_XA = 14;
/**
 * Kho: gần Điện, nhưng rải ra, xa các kho đã xếp (người gánh khắp kinh đô có kho gần; giặc phá một kho xong còn phải
 * đi xa mới tới kho sau).
 */
const byKho: Score = (f, d) => {
  let p = 0;
  for (const s of d.slots) if (s.type === 'kho') p += Math.max(0, KHO_XA - Math.hypot(f.cx - s.x - 1.5, f.cz - s.z - 1.5)) * 3;
  return f.dien + p;
};
/** Trên đồi phía rừng, gần bìa đất. */
const byHill: Score = (f) => f.forest * 2 + f.dien * 0.2;
/** Trên đường chéo từ Điện về góc rừng, gần Điện trước: trục đền, doanh trại. */
const byAxis: Score = (f) => f.diag * 4 + f.dien + forestSide(f);
/** Trên đường chéo, gần ngã ba sông: doanh trại trong đê, kịp ra chặn thủy quái từ hai bờ sông. */
const byBank: Score = (f) => f.diag * 4 + f.river * 2;
/** Quanh doanh trại. */
const byBarracks: Score = (f, d) => near(d, 'doanhTrai', f);
/** Quanh bếp gói bánh. */
const byKitchen: Score = (f, d) => near(d, 'bep', f);
/** Gần các bến: kho ngoài thành Cổ Loa cho bến, ruộng khỏi đi vòng tới cổng (tường chắn hẳn dân gánh hàng). */
const byBen: Score = (f, d) => near(d, 'ben', f);
/** Cổ Loa: trong đúng số vòng thành `rings` rồi mới tới cách chấm `score`. */
const inRings =
  (rings: number, score: Score): Score =>
  (f, d) =>
    zone(d, f, rings) + score(f, d);

const SPLITS: Split[] = ['in', 'out', 'even', 'wide'];
const plain = () => [SPLITS.map((split): Variant => ({ split }))];

/**
 * Cách dựng vòng thành Cổ Loa ở cấp Điện `level`, trong số đoạn thành tối đa: chừa đường quanh Điện trước, khu giữa
 * các vòng hẹp trước (đất ngoài thành rộng cho nhà 8×8, ruộng).
 */
function coLoaVariants(level: number): Variant[][] {
  const max = BUILDINGS.thanh.limit[level - 1] ?? 0;
  const out: Variant[][] = [];
  for (const [t1, t2] of [
    [5, 5],
    [9, 5],
    [5, 9],
    [9, 9],
  ]) {
    for (const tight of [false, true]) {
      const v = { tight, t1, t2 };
      if (ringCost(ringsOf({ split: 'in', ...v })) > max) continue;
      out.push(SPLITS.map((split) => ({ split, ...v })));
    }
  }
  return out;
}

const RECIPES: Record<MauId, Recipe> = {
  // Kinh đô Phong Châu: bến và ruộng dọc sông; doanh trại, đền Phù Đổng trên trục từ Điện về góc rừng, nơi ở của binh
  // chủng, lò rèn quanh doanh trại; nhà sàn, kho, bếp quanh Điện; bãi đá, xưởng mộc trên đồi phía rừng; lũy tre bao
  // hai mặt rừng.
  phongChau: {
    walls: luyTre,
    towers: luyTowers,
    variants: plain,
    jobs: [
      ['doanhTrai', byAxis],
      ['ben', byDien],
      ['langChai', byDien],
      ['benKhoi', byDien],
      ['denPhuDong', byAxis],
      ['traiGiao', byBarracks],
      [['traiCung', 'chuongVoi'], byBarracks],
      ['ruong', byRiver],
      ['ruongNep', byRiver],
      ['loRen', byBarracks],
      ['nhaSan', byDien],
      ['kho', byKho],
      ['bep', byDien],
      [['vuon', 'chuongLon'], byKitchen],
      ['thoHo', byDien],
      ['baiDa', byHill],
      ['xuongMoc', byHill],
    ],
  },
  // Đê bao chống lũ: đê dọc hai bờ sông tới bìa đất, bến ngoài đê, chòi canh sát đê; ruộng, đền, ruộng nếp trong đê.
  deBao: {
    walls: deBao,
    towers: deTowers,
    variants: plain,
    jobs: [
      ['doanhTrai', byBank],
      ['ben', byDien],
      ['langChai', byDien],
      ['benKhoi', byDien],
      [['denPhuDong', 'denTanVien'], byAxis],
      ['traiGiao', byBarracks],
      [['traiCung', 'chuongVoi'], byBarracks],
      ['ruong', byRiver],
      ['ruongNep', byRiver],
      ['loRen', byBarracks],
      ['nhaSan', byDien],
      ['kho', byKho],
      ['bep', byDien],
      [['vuon', 'chuongLon'], byKitchen],
      ['thoHo', byDien],
      ['baiDa', byHill],
      ['xuongMoc', byHill],
    ],
  },
  // Thành Cổ Loa: ba vòng thành kín quanh Điện; vòng trong chỉ có Điện; nhà sàn, kho, bếp, lò rèn, vườn, chuồng lợn,
  // đền Cổ Loa giữa các vòng; doanh trại, Hồ Kim Quy, đền, ruộng, nơi ở, bãi đá ngoài vòng ngoài; đê bao ngoài cùng.
  coLoa: {
    walls: coLoaWalls,
    towers: deTowers,
    variants: coLoaVariants,
    jobs: [
      ['doanhTrai', inRings(0, byAxis)],
      ['hoKimQuy', inRings(0, byHill)],
      ['ben', byDien],
      ['langChai', byDien],
      ['benKhoi', byDien],
      // Một cặp kho ngoài vòng ngoài, gần bến: bến, ruộng ngoài thành khỏi đi vòng tới cổng (tường chắn dân gánh).
      ['kho', inRings(0, byBen), 5, 2],
      ['denCoLoa', inRings(1, byAxis)],
      ['nhaSan', inRings(2, byDien)],
      ['kho', inRings(2, byKho)],
      ['bep', inRings(2, byDien)],
      ['loRen', inRings(1, byDien)],
      [['vuon', 'chuongLon'], inRings(1, byKitchen)],
      ['thoHo', inRings(1, byDien)],
      [['denPhuDong', 'denTanVien'], inRings(0, byBarracks)],
      ['traiGiao', inRings(0, byBarracks)],
      [['traiCung', 'chuongVoi'], inRings(0, byBarracks)],
      ['ruongNep', inRings(0, byRiver)],
      ['ruong', inRings(0, byRiver)],
      ['baiDa', inRings(0, byHill)],
      ['xuongMoc', inRings(0, byHill)],
    ],
  },
  // Cổ Loa giữ sông (chương 4): như mẫu Cổ Loa, thêm ụ nỏ trên vòng thành ngoài, lầu nỏ giữ sông, trại nỏ cạnh
  // doanh trại, Đền Cuông, Đền Hát Môn, Đền Rồng Tiên ngoài vòng ngoài.
  coLoaSong: {
    walls: (d, v) => {
      coLoaWalls(d, v);
      coLoaSongMarks(d);
    },
    towers: coLoaSongTowers,
    variants: coLoaVariants,
    jobs: [
      ['doanhTrai', inRings(0, byAxis)],
      ['hoKimQuy', inRings(0, byAxis), 6],
      ['denRongTien', inRings(0, byAxis), 10],
      ['ben', byDien],
      ['langChai', byDien],
      ['benKhoi', byDien],
      ['kho', inRings(0, byBen), 5, 2],
      ['denCoLoa', inRings(1, byAxis)],
      ['nhaSan', inRings(2, byDien)],
      ['kho', inRings(2, byKho)],
      ['bep', inRings(2, byDien)],
      ['loRen', inRings(1, byDien)],
      [['vuon', 'chuongLon'], inRings(1, byKitchen)],
      ['thoHo', inRings(1, byDien)],
      [['denPhuDong', 'denTanVien'], inRings(0, byBarracks)],
      ['denCuong', inRings(0, byAxis)],
      ['denHatMon', inRings(0, byAxis), 9],
      ['traiGiao', inRings(0, byBarracks)],
      [['traiCung', 'chuongVoi'], inRings(0, byBarracks)],
      ['traiNo', inRings(0, byBarracks)],
      ['ruong', inRings(0, byRiver)],
      ['ruongNep', inRings(0, byRiver)],
      ['baiDa', inRings(0, byHill)],
      ['xuongMoc', inRings(0, byHill)],
    ],
  },
};

/** Một mẫu đã dựng: chỗ công trình (cả Điện) và ô đường; `thieu` là số chỗ còn thiếu so với số tối đa. */
export interface MauVe {
  slots: Slot[];
  duong: { x: number; z: number }[];
  thieu: number;
}

/** Dựng mẫu `id` ở cấp Điện `level` trên khung cạnh `side` theo cách `v`. */
function drawWith(id: MauId, level: number, side: number, v: Variant): { d: Draft; thieu: number } {
  const recipe = RECIPES[id];
  const d = new Draft(level, side);
  d.put('dien', DIEN_HOME, DIEN_HOME);
  recipe.walls(d, v);
  for (const job of recipe.jobs) placeJob(d, job);
  recipe.towers(d);
  d.prune();
  return { d, thieu: shortfall(d, recipe.jobs) };
}

/**
 * Dựng mẫu `id` ở cấp Điện `level` trên khung cạnh `side` (mặc định `MAU_KHUNG`): thử các cách dựng khung theo thứ
 * tự ưu tiên, lấy cách đầu tiên xếp đủ mọi công trình (không có thì cách thiếu ít nhất).
 */
export function veMau(id: MauId, level: number, side = khungOf(id, level)): MauVe {
  let best: { d: Draft; thieu: number } | null = null;
  search: for (const group of RECIPES[id].variants(level)) {
    for (const v of group) {
      const r = drawWith(id, level, side, v);
      if (!best || r.thieu < best.thieu) best = r;
      if (!best.thieu) break search;
    }
  }
  const d = best!.d;
  return { slots: d.slots, duong: d.roadCells().map((i) => ({ x: i % GRID, z: Math.floor(i / GRID) })), thieu: best!.thieu };
}

const DRAWN = new Map<string, MauVe>();

/** Mẫu `id` chừa chỗ cho loại `type` từ cấp Điện này (0 nếu theo số tối đa ở mọi cấp, xem `Job`). */
export function mauFrom(id: MauId, type: BuildingType): number {
  for (const [what, , from = 0] of RECIPES[id].jobs) if (what === type || (Array.isArray(what) && what.includes(type))) return from;
  return 0;
}

function drawn(id: MauId, level: number): MauVe {
  const lv = Math.min(Math.max(Math.round(level), 1), BUILDINGS.dien.maxLevel);
  const key = `${id}:${lv}`;
  let ve = DRAWN.get(key);
  if (!ve) {
    ve = veMau(id, lv);
    DRAWN.set(key, ve);
  }
  return ve;
}

/** Mọi chỗ trong mẫu `id` ở cấp Điện `level` (cả Điện), đều trong khung dựng mẫu ở cấp ấy. */
export function mauSlots(id: MauId, level: number): Slot[] {
  return drawn(id, level).slots;
}

/** Ô đường của mẫu `id` ở cấp Điện `level`: đoạn thẳng theo hàng, cột nối mọi công trình nhiều ô, gần Điện trước. */
export function mauDuong(id: MauId, level: number): { x: number; z: number }[] {
  return drawn(id, level).duong;
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
/**
 * Không có chỗ trong mẫu mà vướng chỗ của mẫu thì dỡ, không dời: lũy, đê, thành, bẫy, đường đi, đồ trang trí, bậc lên
 * thành (dời ra xa thành thì vô dụng).
 */
const dropIfBlocked = (type: BuildingType) => SEGMENTS.includes(type) || isDecor(type) || type === 'bacThanh';

export interface MauPlan {
  /** Công trình đang có sẽ dời tới chỗ mới. */
  moves: { id: number; x: number; z: number }[];
  /** Công trình sẽ dựng thêm. */
  builds: Slot[];
  /**
   * Đoạn lũy, đê, thành, bẫy sẽ dỡ đi (thừa so với mẫu, hay vướng chỗ của mẫu); đường đi, đồ trang trí, bậc lên thành
   * vướng mẫu.
   */
  removes: number[];
  /** Tổng giá: dựng phần thiếu và phí dời. */
  cost: Cost;
  /** Công trình không còn chỗ nào để xếp (mẫu không áp được). */
  stuck: number[];
  /** Ụ nỏ sẽ dựng thêm trên đoạn thành ở các ô này (mẫu Cổ Loa giữ sông), trong giới hạn theo cấp Điện. */
  uNos: { x: number; z: number }[];
  /** Điện đang xoay: áp mẫu quay Điện về hướng của mẫu (mặt trước ra sông). */
  turnDien: boolean;
  /**
   * Ô sẽ trải đường đất nối công trình làm ra hàng ở xa với kho, Điện (`traiDuong`), cho người gánh đi nhanh. Đường xong
   * ngay như khi tự trải, không vào việc của tốp thợ.
   */
  duong: { x: number; z: number }[];
}

const addCost = (a: Cost, b: Cost) => {
  for (const r of RESOURCE_IDS) if (b[r]) a[r] = (a[r] ?? 0) + b[r]!;
};

/** Lên kế hoạch áp mẫu `id` cho kinh đô hiện tại, chưa đổi gì. */
export function planMau(state: GameState, id: MauId): MauPlan {
  const level = dienLevel(state);
  const dien = state.buildings.find((b) => b.type === 'dien')!;
  // Mẫu vẽ cho Điện ở (DIEN_HOME, DIEN_HOME), mặt trước quay ra sông: Điện đã dời hay xoay thì áp mẫu đưa về chỗ ấy.
  // Mẫu chỉ xếp bờ bên này, chừa ô đầu cầu cho lối lên cầu.
  const heads = bridgeheadCells(state);
  const fits = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    // Chỉ đặt trên đất đã mở: chỗ của mẫu rơi vào khoảnh rừng chưa phát thì bỏ qua.
    for (let dx = 0; dx < def.w; dx++) {
      for (let dz = 0; dz < def.d; dz++) {
        const tx = x + dx;
        const tz = z + dz;
        if (!isNearBank(tx, tz) || !isOpen(state, tx, tz) || heads.has(tz * GRID + tx)) return false;
      }
    }
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
  mark('dien', DIEN_HOME, DIEN_HOME);

  const plan: MauPlan = { moves: [], builds: [], removes: [], cost: {}, stuck: [], uNos: [], turnDien: !!dien.rot, duong: [] };
  if (dien.x !== DIEN_HOME || dien.z !== DIEN_HOME) {
    plan.moves.push({ id: dien.id, x: DIEN_HOME, z: DIEN_HOME });
    addCost(plan.cost, moveCost(dien));
  }
  // Cổng thành đã mở: chỗ cổng trong mẫu (đoạn tường có cờ `cong`) thành chỗ cổng, tới số cổng tối đa; chưa mở thì
  // vẫn là đoạn tường, vòng tường không hở.
  const gate = BUILDINGS.congThanh;
  let gates = unlocked(state, gate.unlock) && level >= gate.minDien ? limitOf(state, 'congThanh') : 0;
  const slots: Slot[] = mauSlots(id, level)
    .filter((s) => s.type !== 'dien' && fits(s.type, s.x, s.z))
    .map((s) => (s.cong && gates-- > 0 ? { type: 'congThanh' as const, x: s.x, z: s.z } : s));
  // Doanh trại xếp trước nơi ở riêng của các binh chủng, vì nơi ở cần doanh trại.
  const types = [...new Set(slots.map((s) => s.type))].sort((a, b) => Number(b === 'doanhTrai') - Number(a === 'doanhTrai'));
  let barracks = barracksLevel(state);
  const leftovers: Building[] = [];
  const cx = DIEN_HOME + BUILDINGS.dien.w / 2;
  const cz = DIEN_HOME + BUILDINGS.dien.d / 2;
  for (const type of types) {
    const def = BUILDINGS[type];
    // Chỗ gần Điện xếp trước.
    const open = slots
      .filter((s) => s.type === type)
      .sort((a, b) => Math.hypot(a.x + def.w / 2 - cx, a.z + def.d / 2 - cz) - Math.hypot(b.x + def.w / 2 - cx, b.z + def.d / 2 - cz));
    // Lầu nỏ một ô như chòi canh, đứng vào chỗ chòi canh của mẫu và tính là hai chòi canh trong giới hạn.
    // Mẫu có chỗ dành cho lầu nỏ thì lầu nỏ xếp trước, vào đúng những chỗ ấy.
    // Công trình bên kia sông đứng yên, không vào chỗ của mẫu (vẫn tính vào số tối đa).
    // Cống đê đứng vào chỗ đê của mẫu, vẫn là cống (xếp trước các đoạn đê để khỏi bị dỡ khi thừa).
    const sameSlot = (b: Building) =>
      (b.type === type || (type === 'choiCanh' && b.type === 'lauNo') || (type === 'de' && b.type === 'congDe')) && isNearBank(b.x, b.z);
    const have = state.buildings
      .filter(sameSlot)
      .sort(
        (a, b) =>
          Number(b.type === 'lauNo') - Number(a.type === 'lauNo') ||
          Number(b.type === 'congDe') - Number(a.type === 'congDe') ||
          b.level - a.level ||
          a.id - b.id,
      );
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
    if (
      b.type === 'dien' ||
      types.includes(b.type) ||
      (b.type === 'lauNo' && types.includes('choiCanh')) ||
      (b.type === 'congDe' && types.includes('de'))
    )
      continue;
    leftovers.push(b);
  }
  const inMau = new Set(types);
  // Ô đường của mẫu (trên đất đã mở, ngoài đầu cầu): công trình không có chỗ trong mẫu không đứng đè lên; ô đường đang có
  // trên đó thì giữ (loại đường nào cũng được).
  const lane = new Uint8Array(GRID * GRID);
  for (const r of mauDuong(id, level)) if (isNearBank(r.x, r.z) && isOpen(state, r.x, r.z) && !heads.has(r.z * GRID + r.x)) lane[r.z * GRID + r.x] = 1;
  const clear = (type: BuildingType, x: number, z: number) => {
    if (!free(type, x, z)) return false;
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (lane[(z + dz) * GRID + x + dx]) return false;
    return true;
  };
  const paved = new Set<number>();
  const blocked: Building[] = [];
  for (const b of leftovers) {
    if (SEGMENTS.includes(b.type) && inMau.has(b.type)) plan.removes.push(b.id);
    else if (isRoad(b.type) && lane[b.z * GRID + b.x] && free(b.type, b.x, b.z)) {
      mark(b.type, b.x, b.z);
      paved.add(b.z * GRID + b.x);
    } else if (clear(b.type, b.x, b.z)) mark(b.type, b.x, b.z);
    else if (dropIfBlocked(b.type)) plan.removes.push(b.id);
    else blocked.push(b);
  }
  for (const b of blocked) {
    const spot = nearestFree(b, fits, clear);
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
  if (!plan.stuck.length) {
    plan.duong = laneRoads(state, lane, paved, used);
    for (let i = 0; i < plan.duong.length; i++) addCost(plan.cost, BUILDINGS[DUONG_MAU].buildCost);
  }
  return plan;
}

/** Loại đường mẫu trải: đường đất, rẻ nhất, mở từ Điện 1. */
const DUONG_MAU: BuildingType = 'duongDat';

/**
 * Đường mẫu sẽ trải: các ô đường của mẫu (`lane`) chưa có đường (`paved`), chưa có gì đứng (`used`, sau khi áp), gần
 * Điện trước, không quá giới hạn đường theo cấp Điện.
 */
function laneRoads(state: GameState, lane: Uint8Array, paved: Set<number>, used: Uint8Array): { x: number; z: number }[] {
  const def = BUILDINGS[DUONG_MAU];
  if (!def.buildable || !unlocked(state, def.unlock) || dienLevel(state) < def.minDien) return [];
  const room = limitOf(state, DUONG_MAU) - usedOf(state, DUONG_MAU);
  if (room <= 0) return [];
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < lane.length; i++) if (lane[i] && !paved.has(i) && !used[i]) out.push({ x: i % GRID, z: Math.floor(i / GRID) });
  const d = (r: { x: number; z: number }) => Math.hypot(r.x + 0.5 - DIEN_C, r.z + 0.5 - DIEN_C);
  return out.sort((p, q) => d(p) - d(q) || p.z - q.z || p.x - q.x).slice(0, room);
}

/** Trải các ô đường của kế hoạch áp mẫu (của đã trả cùng kế hoạch). */
function layDuong(state: GameState, plan: MauPlan): void {
  for (const d of plan.duong) state.buildings.push(newBuilding(state, DUONG_MAU, d.x, d.z));
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
  // Đang có công trình dựng dở, đoạn tường đang đổi loại: chờ xong mới xếp lại kinh đô (mẫu chưa biết các chỗ ấy).
  if ((state.xay?.viec ?? []).some((v) => v.o.slice(v.xong).some((p) => p.moi || p.doi))) return { ok: false, reason: 'dangXay' };
  const plan = planMau(state, id);
  if (plan.removes.some((r) => isBusy(state, r))) return { ok: false, reason: 'dangXay' };
  if (plan.stuck.length) return { ok: false, reason: 'khongDuCho' };
  if (!plan.moves.length && !plan.builds.length && !plan.removes.length && !plan.uNos.length && !plan.turnDien && !plan.duong.length) return { ok: false, reason: 'daTheoMau' };
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
  if (plan.turnDien) delete state.buildings.find((b) => b.type === 'dien')!.rot;
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
  layDuong(state, plan);
  return check;
}

/** Đoạn tường loại `old` để nguyên chỗ, đổi sang loại `type` được (thành đắp đè lũy, cổng thay tường, cống thay đê). */
const canTurn = (type: BuildingType, old: BuildingType) =>
  (type === 'thanh' && old === 'luy') || (type === 'congThanh' && (old === 'luy' || old === 'thanh')) || (type === 'congDe' && old === 'de');

/** Áp mẫu có thời gian xây: như `canApplyMau`, thêm phải có tốp thợ rảnh khi mẫu dựng thêm. */
export function canStartMau(state: GameState, id: MauId): Result<MauPlan> {
  const check = canApplyMau(state, id);
  if (!check.ok) return check;
  if (check.value.builds.length && !thoRanh(state)) return { ok: false, reason: 'hetTho' };
  return check;
}

/**
 * Áp mẫu như người chơi bấm (có thời gian xây): trả của, dỡ đoạn thừa, dời công trình ngay như `applyMau`; phần dựng
 * thêm giao cả cho một tốp thợ làm lần lượt (nhà gần Điện trước, rồi tường theo mẫu). Chỗ tường mẫu trùng đoạn tường
 * cũ sẽ dỡ mà đổi loại tại chỗ được (thành đè lũy, cổng thay tường, cống thay đê) thì đoạn cũ đứng tới khi đắp xong, để
 * vòng thành không hở lúc đang đắp. Ụ nỏ trên đoạn thành đang có gắn ngay; trên đoạn thành sắp đắp thì gắn khi đắp xong.
 */
export function startMau(state: GameState, id: MauId): Result<MauPlan> {
  const check = canStartMau(state, id);
  if (!check.ok) return check;
  const plan = check.value;
  pay(state, plan.cost);
  const removes = new Set(plan.removes);
  // Chỗ dựng thêm trùng đoạn tường sắp dỡ mà đổi loại tại chỗ được: giữ đoạn ấy, đổi loại khi đắp xong.
  const turned = new Map<Slot, Building>();
  for (const s of plan.builds) {
    const old = state.buildings.find((b) => removes.has(b.id) && b.x === s.x && b.z === s.z && canTurn(s.type, b.type));
    if (old) {
      turned.set(s, old);
      removes.delete(old.id);
    }
  }
  state.buildings = state.buildings.filter((b) => !removes.has(b.id));
  for (const m of plan.moves) {
    const b = state.buildings.find((o) => o.id === m.id)!;
    b.x = m.x;
    b.z = m.z;
  }
  for (const m of plan.moves) {
    const b = state.buildings.find((o) => o.id === m.id)!;
    levelFootprint(state, b, footprintTop(state, b.type, b.x, b.z));
  }
  if (plan.turnDien) delete state.buildings.find((b) => b.type === 'dien')!.rot;
  const uNoAt = new Set(plan.uNos.map((u) => u.z * GRID + u.x));
  // Ụ nỏ trên đoạn thành đang có: gắn ngay như khi tự gắn.
  for (const b of state.buildings) {
    if (b.type === 'thanh' && uNoAt.delete(b.z * GRID + b.x)) b.uNo = 'ok';
  }
  const cx = DIEN_HOME + BUILDINGS.dien.w / 2;
  const cz = DIEN_HOME + BUILDINGS.dien.d / 2;
  const dist = (s: Slot) => Math.hypot(s.x + BUILDINGS[s.type].w / 2 - cx, s.z + BUILDINGS[s.type].d / 2 - cz);
  const houses = plan.builds.filter((s) => !turned.has(s) && BUILDINGS[s.type].w > 1).sort((a, b) => dist(a) - dist(b));
  const walls = plan.builds.filter((s) => !turned.has(s) && BUILDINGS[s.type].w === 1);
  const o: PhanViec[] = [];
  const item = (s: Slot, p: Omit<PhanViec, 'ms' | 'gia'>): PhanViec => {
    const gia: Cost = { ...BUILDINGS[s.type].buildCost };
    const it: PhanViec = { ...p, ms: xayMs(s.type, 1), gia };
    if (s.type === 'thanh' && uNoAt.delete(s.z * GRID + s.x)) {
      it.uNo = true;
      for (const r of RESOURCE_IDS) if (U_NO.cost[r]) gia[r] = (gia[r] ?? 0) + U_NO.cost[r]!;
    }
    return it;
  };
  for (const s of [...houses, ...walls]) {
    const b = newBuilding(state, s.type, s.x, s.z);
    o.push(item(s, { id: b.id, moi: b }));
  }
  for (const [s, old] of turned) o.push(item(s, { id: old.id, doi: s.type }));
  // Đường xong ngay như khi tự trải (chỗ đường không vướng chỗ dựng thêm nào, kể cả đang chờ thợ).
  layDuong(state, plan);
  const r = startBatch(state, o);
  if (!r.ok) return r;
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
    const want = b.type === 'lauNo' ? 'choiCanh' : b.type === 'congDe' ? 'de' : b.type;
    const i = slots.findIndex((s) => s.type === want && free(s.type, s.x, s.z));
    if (i >= 0) {
      const s = slots.splice(i, 1)[0];
      b.x = s.x;
      b.z = s.z;
      mark(b.type, b.x, b.z);
      state.buildings.push(b);
    } else if (dropIfBlocked(b.type)) dropped.push(b);
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
