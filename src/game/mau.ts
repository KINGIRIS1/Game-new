// Mẫu kinh đô: mỗi chương mở một mẫu bố trí công trình quanh Điện Vua Hùng. Mẫu không vẽ cứng mà dựng lại cho
// từng cấp Điện theo vùng đất đã khai phá, nên giãn theo đất: lũy, đê, bẫy chạy theo bìa đất, vòng thành Cổ Loa
// nới ra, công trình rải ra theo đất mới. Áp mẫu thì dời mọi công trình đang có vào chỗ trong mẫu và dựng thêm
// phần mẫu có mà mình chưa có (trong giới hạn theo cấp Điện). Phải đủ tài nguyên để dựng phần thiếu và trả phí
// dời thì mới áp được.

import { BUILDINGS, ROAD_LIMIT, STAGES, U_NO, isDecor, isRoad, type BuildingType, type Cost, RESOURCE_IDS } from './defs';
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
import { AREA, isOpen, khoanhOf } from './khoanh';
import { DIEN_HOME, GRID, KHOANH, RIVER_START, inGrid, isNearBank, touchesRiver } from './map';
import { bridgeheadCells } from './benKia';
import { isBusy, startBatch, thoRanh, xayMs, type PhanViec } from './xay';

/**
 * Khung dựng mẫu ở cấp Điện `level`: hình vuông neo góc sông, cạnh theo cấp Điện (`AREA`: vùng đất của cấp ấy trước
 * khi có khoảnh tự chọn, nới một khoảnh cho Điện 10×10). Mẫu giãn theo khung này; lúc áp mẫu, chỗ nào rơi vào khoảnh
 * rừng chưa phát thì bỏ qua. Trả về ô nhỏ nhất (cả x và z) của khung.
 */
export function frameStart(level: number): number {
  return RIVER_START - AREA[Math.min(Math.max(level, 1), AREA.length) - 1];
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
  /**
   * Đoạn lũy hay thành ở chỗ cổng thành: đã mở cổng thì áp mẫu dựng cổng ở đây thay đoạn tường (`planMau`), chưa mở
   * thì vẫn là tường, vòng tường không hở.
   */
  cong?: boolean;
}

// ---------- Dựng mẫu theo vùng đất ----------

/** Ô đất cuối cùng trước sông (cả x và z). */
const LAST = RIVER_START - 1;
/** Ô cuối của móng Điện (cả x và z). */
const DIEN_END = DIEN_HOME + BUILDINGS.dien.w - 1;
/** Tâm móng Điện. */
const DIEN_C = DIEN_HOME + BUILDINGS.dien.w / 2;
/** Đường quanh Điện chạy sát móng Điện: hàng (và cột) `RING_A` ở mặt bắc, mặt tây; `RING_B` ở mặt nam, mặt đông. */
const RING_A = DIEN_HOME - 1;
const RING_B = DIEN_END + 1;
/** Hai phố vòng cách nhau chừng này ô: một ô đường và một dãy lô sâu 4 ô. */
const PHO = 5;
/** Đê bao chạy ở hàng (và cột) này: bãi bồi ngoài đê vừa một dải bến sát sông. */
const DE_AT = RIVER_START - 1 - BUILDINGS.ben.w;

/**
 * Trạng thái ô trên bản nháp: còn trống, đã có công trình (hay ngoài vùng), chừa trống, bãi ngoài đê (chỉ cho loại
 * phải sát sông: bến, làng chài), ô đường.
 */
const FREE = 0;
const USED = 1;
const KEEP = 2;
const BANK = 3;
const PATH = 4;

/** Hạng ô đường: đường chính (quanh Điện, trục ra cổng) luôn giữ; phố thì tỉa đi khi không công trình nào dùng tới. */
const MAIN = 1;
const STREET = 2;

/** Phạt điểm chỗ dựng: sát tường (lũy, đê, thành, chòi, bẫy) thì nhẹ, sát công trình khác (không còn lối đi) thì rất nặng. */
const NEAR_WALL = 3;
const PACKED = 1000;
/** Phạt điểm chỗ dựng không có mặt nào giáp đường (phải trải thêm ngõ cụt tới). */
const NO_ROAD = 200;
/** Phạt điểm mỗi ô đường phải mở thêm để tới chỗ dựng: kinh đô lớn dần dọc các đường đã có nhà. */
const LANE = 1;
/** Phạt điểm mỗi ô phố bị công trình dựng đè lên (lượt cuối, khi đất đã kín). */
const RAZE = 60;
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

/** Một phố ngang ở nửa bắc: hàng `c`, từ cột `x0` tới cột `x1`. */
interface Street {
  c: number;
  x0: number;
  x1: number;
  /** Cổ Loa: số vòng thành bao quanh phố này (0 là ngoài vòng ngoài). */
  zone: number;
}

/** Một vòng thành Cổ Loa: hình vuông kín từ ô (a, a) tới ô (b, b). */
interface Ring {
  a: number;
  b: number;
}

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Bản nháp một mẫu ở một cấp Điện. */
class Draft {
  readonly lo: number;
  readonly cell = new Uint8Array(GRID * GRID);
  /** Ô là móng công trình nhiều ô: hai công trình nhiều ô nên cách nhau một ô làm lối đi. */
  readonly solid = new Uint8Array(GRID * GRID);
  /** Ô có công trình một ô (lũy, đê, thành, chòi canh, bẫy). */
  readonly wall = new Uint8Array(GRID * GRID);
  /** Ô có lũy hay thành: đường tới hai bên đoạn tường coi như nối nhau (qua cổng, hay trèo qua). */
  readonly fence = new Uint8Array(GRID * GRID);
  /** Hạng của ô đường (`MAIN`, `STREET`), 0 là không phải đường. */
  readonly road = new Uint8Array(GRID * GRID);
  /** Ô bãi ngoài đê (`BANK`), nhớ lại sau khi bến đã chiếm ô. */
  readonly bank = new Uint8Array(GRID * GRID);
  /** Ô chừa trống (`KEEP`) trước khi trải đường lên: tỉa đường thì trả lại. */
  readonly kept = new Uint8Array(GRID * GRID);
  /** Các ô đường quanh Điện: gốc của mạng đường. */
  readonly root: number[] = [];
  /** Đã trải khung đường: từ đây công trình nhiều ô phải có một mặt giáp đường. */
  paved = false;
  /** Xếp theo điểm chỉ nhận chỗ giáp đường, không sát công trình khác (lượt đầu); sau đó mới nhận chỗ nào cũng được. */
  strict = false;
  /** Lượt cuối, đất đã kín: công trình được dựng đè lên ô phố (không phải đường chính), phố ấy bỏ đi. */
  bulldoze = false;
  /** Ô đường đã có công trình dùng (đường chính, ô giáp mặt công trình, lối từ đó về đường quanh Điện). */
  readonly busy = new Uint8Array(GRID * GRID);
  /** Số ô đường phải mở thêm để nối từng ô đường với ô đường đang dùng gần nhất (-1: không nối được). */
  gap = new Int32Array(GRID * GRID).fill(-1);
  /** Ô đi trước trên lối ngắn nhất về đường quanh Điện (`reach`), tính một lần khi trải xong khung đường. */
  private back: Int32Array = new Int32Array(0);
  readonly slots: Slot[] = [];
  rings: Ring[] = [];
  /** Các phố ngang phía rừng ở nửa bắc (hàng `c`, từ cột `x0` tới `x1`), từ trong ra ngoài; nửa tây đối xứng. */
  readonly streets: Street[] = [];
  /** Lô đối xứng còn trống sau khi xếp một công trình lẻ: công trình lẻ sau cùng cỡ vào đây cho cân hai bên. */
  readonly vacant: { x: number; z: number; w: number }[] = [];

  /** Số công trình phải đứng sát công trình khác vì hết chỗ rời. */
  crowded = 0;

  /** `tight`: đất chật, công trình nhiều ô xếp liền nhau thành dãy, không chừa ô lối đi giữa hai nhà. */
  constructor(
    readonly id: MauId,
    readonly level: number,
    readonly tight = false,
  ) {
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
        if (type === 'luy' || type === 'thanh') this.fence[i] = 1;
      }
    }
    this.slots.push({ type, x, z });
    if (!this.paved || w === 1) return;
    let razed = false;
    for (let dz = 0; dz < w; dz++) {
      for (let dx = 0; dx < w; dx++) {
        const i = (z + dz) * GRID + x + dx;
        if (!this.road[i]) continue;
        this.road[i] = 0;
        razed = true;
      }
    }
    if (razed) this.repave();
    else {
      this.claim(x, z, w);
      this.settle();
    }
  }

  /** Mạng đường vừa đổi (phố bị dựng đè): tính lại lối về đường quanh Điện và đường đang dùng của mọi công trình. */
  private repave(): void {
    this.busy.fill(0);
    this.pave();
  }

  /** Trải xong khung đường: đường chính là đường đang dùng; công trình xếp từ đây phải giáp đường. */
  pave(): void {
    this.paved = true;
    const { dist, from } = this.reach();
    this.back = from;
    for (let i = 0; i < this.road.length; i++) if (this.road[i] === MAIN && dist[i] >= 0) this.hold(i);
    this.settle();
    for (const s of this.slots) {
      if (BUILDINGS[s.type].w === 1) continue;
      this.claim(s.x, s.z, BUILDINGS[s.type].w);
      this.settle();
    }
  }

  /** Bỏ các ô phố chưa công trình nào dùng, trả đất cho công trình còn thiếu chỗ. */
  trim(): void {
    for (let i = 0; i < this.cell.length; i++) if (this.cell[i] === PATH && !this.busy[i]) this.unlay(i);
    this.back = this.reach().from;
    this.settle();
  }

  /** Vừa trải thêm ngõ `cells` tới móng (x, z, cạnh w): tính lại lối về đường quanh Điện, ngõ thành đường đang dùng. */
  alley(cells: number[]): void {
    this.back = this.reach().from;
    for (const i of cells) this.hold(i);
    this.settle();
  }

  /** Ô đường `i` và lối từ nó về đường quanh Điện thành đường đang dùng. */
  hold(i: number): void {
    for (let k = i; k >= 0 && !this.busy[k]; k = this.back[k]) this.busy[k] = 1;
  }

  /**
   * Các ô đường giáp mặt trước của móng (x, z, cạnh w): trong bốn mặt, mặt có đường mà phải mở thêm ít ô đường nhất
   * (`gap`); bằng nhau thì theo thứ tự nam, đông, bắc, tây (nửa tây đường chéo thì đông trước nam, tây trước bắc, cho
   * đối xứng). Công trình chỉ cần đường ở một mặt ấy.
   */
  frontage(x: number, z: number, w: number): number[] {
    const south: [number, number][] = [];
    const east: [number, number][] = [];
    const north: [number, number][] = [];
    const west: [number, number][] = [];
    for (let k = 0; k < w; k++) {
      south.push([x + k, z + w]);
      east.push([x + w, z + k]);
      north.push([x + k, z - 1]);
      west.push([x - 1, z + k]);
    }
    let best: number[] = [];
    let bestGap = Infinity;
    for (const side of x >= z ? [south, east, north, west] : [east, south, west, north]) {
      const out = side.filter(([cx, cz]) => this.at(cx, cz) === PATH).map(([cx, cz]) => cz * GRID + cx);
      const gap = Math.min(...out.map((i) => (this.gap[i] >= 0 ? this.gap[i] : Infinity)));
      if (gap < bestGap) {
        bestGap = gap;
        best = out;
      }
    }
    return best;
  }

  /** Các ô đường giáp mặt trước của móng (x, z, cạnh w) thành đường đang dùng. */
  private claim(x: number, z: number, w: number): void {
    for (const i of this.frontage(x, z, w)) this.hold(i);
  }

  /** Tính lại `gap` sau khi có thêm đường đang dùng. */
  private settle(): void {
    this.gap.fill(-1);
    const queue: number[] = [];
    for (let i = 0; i < this.busy.length; i++) {
      if (!this.busy[i] || this.cell[i] !== PATH) continue;
      this.gap[i] = 0;
      queue.push(i);
    }
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      for (const n of this.links(i)) {
        if (this.gap[n] >= 0) continue;
        this.gap[n] = this.gap[i] + 1;
        queue.push(n);
      }
    }
  }

  /** Số ô đường phải mở thêm nếu dựng móng (x, z, cạnh w): từ ô đường giáp móng gần đường đang dùng nhất (0 nếu không giáp đường nào). */
  extra(x: number, z: number, w: number): number {
    let best = Infinity;
    for (let k = 0; k < w; k++) {
      for (const [cx, cz] of [
        [x + k, z - 1],
        [x + k, z + w],
        [x - 1, z + k],
        [x + w, z + k],
      ]) {
        if (this.at(cx, cz) !== PATH) continue;
        const g = this.gap[cz * GRID + cx];
        if (g >= 0 && g < best) best = g;
      }
    }
    return best === Infinity ? 0 : best + 1;
  }

  /** Đặt công trình một ô nếu ô còn trống. */
  segment(type: BuildingType, x: number, z: number): boolean {
    if (this.at(x, z) !== FREE) return false;
    this.put(type, x, z);
    return true;
  }

  /** Đánh dấu `v` (chừa trống hay bãi ngoài đê) cho các ô còn trống trong hình chữ nhật (x0, z0)–(x1, z1). */
  mark(x0: number, z0: number, x1: number, z1: number, v: number): void {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (this.at(x, z) !== FREE) continue;
        this.cell[z * GRID + x] = v;
        if (v === BANK) this.bank[z * GRID + x] = 1;
      }
    }
  }

  /** Trải đường hạng `rank` lên các ô còn trống (hay chừa trống) trong hình chữ nhật (x0, z0)–(x1, z1). */
  lay(x0: number, z0: number, x1: number, z1: number, rank: number): void {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const c = this.at(x, z);
        if (c !== FREE && c !== KEEP && c !== PATH) continue;
        const i = z * GRID + x;
        if (c === KEEP) this.kept[i] = 1;
        this.cell[i] = PATH;
        if (!this.road[i] || rank < this.road[i]) this.road[i] = rank;
      }
    }
  }

  /** Bỏ ô đường `i`: ô trở lại trống (hay chừa trống như trước). */
  unlay(i: number): void {
    this.cell[i] = this.kept[i] ? KEEP : FREE;
    this.road[i] = 0;
  }

  /** Móng ở (x, z) nằm trên bãi ngoài đê. */
  onBank(x: number, z: number): boolean {
    return this.bank[z * GRID + x] === 1;
  }

  /** Móng (x, z, cạnh w) có mặt nào giáp ô đường. */
  fronts(x: number, z: number, w: number): boolean {
    for (let k = 0; k < w; k++) {
      if (this.at(x + k, z - 1) === PATH || this.at(x + k, z + w) === PATH || this.at(x - 1, z + k) === PATH || this.at(x + w, z + k) === PATH) return true;
    }
    return false;
  }

  /**
   * Phạt điểm nếu dựng `type` ở (x, z): 0 khi quanh móng còn lối đi một ô, `NEAR_WALL` khi sát tường,
   * `PACKED` khi sát công trình nhiều ô khác; đã trải khung đường mà không mặt nào giáp đường thì thêm `NO_ROAD`
   * (bến, làng chài ngoài đê thì không cần: lối của chúng là sông); -1 khi không dựng được.
   */
  penalty(type: BuildingType, x: number, z: number): number {
    const def = BUILDINGS[type];
    const w = def.w;
    if (def.nearRiver && !touchesRiver(x, z, w, w)) return -1;
    let bank = false;
    let razed = 0;
    for (let dz = 0; dz < w; dz++) {
      for (let dx = 0; dx < w; dx++) {
        const c = this.at(x + dx, z + dz);
        if (c === PATH && this.bulldoze && this.road[(z + dz) * GRID + x + dx] === STREET) {
          razed++;
          continue;
        }
        if (c === BANK ? !def.nearRiver : c !== FREE) return -1;
        if (c === BANK) bank = true;
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
        if (this.solid[i] && !this.tight) return PACKED;
        if (this.wall[i]) p = NEAR_WALL;
      }
    }
    if (this.paved && w > 1 && !bank) p += this.fronts(x, z, w) ? LANE * this.extra(x, z, w) : NO_ROAD;
    return p + razed * RAZE;
  }

  /** Dựng `type` ở lô (x, z) được: ô trống, không sát công trình nhiều ô khác, có mặt giáp đường (hay là bến ngoài đê). */
  fits(type: BuildingType, x: number, z: number): boolean {
    const p = this.penalty(type, x, z);
    return p >= 0 && p < NO_ROAD;
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

  /**
   * Các ô đường đi tiếp được từ ô đường `i`: bốn ô kề, và ô đường ngay bên kia một tới ba đoạn lũy, thành liền nhau
   * (đường tới chân tường rồi đi tiếp ở phía trong).
   */
  links(i: number): number[] {
    const x = i % GRID;
    const z = Math.floor(i / GRID);
    const out: number[] = [];
    for (const [dx, dz] of DIRS) {
      let k = 1;
      while (k <= 3 && inGrid(x + dx * k, z + dz * k) && this.fence[(z + dz * k) * GRID + x + dx * k]) k++;
      if (this.at(x + dx * k, z + dz * k) === PATH) out.push((z + dz * k) * GRID + x + dx * k);
    }
    return out;
  }

  /** Số bước theo đường từ đường quanh Điện tới từng ô đường (-1: không tới được), và ô đi trước nó trên lối ngắn nhất. */
  reach(): { dist: Int32Array; from: Int32Array } {
    const dist = new Int32Array(GRID * GRID).fill(-1);
    const from = new Int32Array(GRID * GRID).fill(-1);
    const queue: number[] = [];
    for (const i of this.root) {
      if (this.cell[i] !== PATH || dist[i] >= 0) continue;
      dist[i] = 0;
      queue.push(i);
    }
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      for (const n of this.links(i)) {
        if (dist[n] >= 0) continue;
        dist[n] = dist[i] + 1;
        from[n] = i;
        queue.push(n);
      }
    }
    return { dist, from };
  }

  /**
   * Lối ngắn nhất qua ô trống (hay chừa trống) từ một trong các ô `starts` tới một ô kề ô đường thỏa `goal`.
   * Trả về các ô của lối (kể cả ô đầu), hay `null` nếu không có lối.
   */
  trail(starts: number[], goal: (road: number) => boolean): number[] | null {
    const from = new Int32Array(GRID * GRID).fill(-2);
    const queue: number[] = [];
    for (const i of starts) {
      if (from[i] !== -2) continue;
      from[i] = -1;
      queue.push(i);
    }
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      const x = i % GRID;
      const z = Math.floor(i / GRID);
      for (const [dx, dz] of DIRS) {
        if (this.at(x + dx, z + dz) !== PATH || !goal((z + dz) * GRID + x + dx)) continue;
        const out: number[] = [];
        for (let k = i; k >= 0; k = from[k]) out.push(k);
        return out;
      }
      for (const [dx, dz] of DIRS) {
        const c = this.at(x + dx, z + dz);
        const n = (z + dz) * GRID + x + dx;
        if ((c !== FREE && c !== KEEP) || from[n] !== -2) continue;
        from[n] = i;
        queue.push(n);
      }
    }
    return null;
  }

  /**
   * Dựng `type` ở (x, z) thì còn tới được đường: đã giáp đường, hay còn lối qua ô trống ra đường (để `alleys` mở ngõ);
   * bến, làng chài ngoài bờ thì lối là sông. Chưa trải khung đường, hay đất đã hết tới mức phải dựng đè lên phố, thì không xét.
   */
  linked(type: BuildingType, x: number, z: number): boolean {
    const def = BUILDINGS[type];
    if (!this.paved || this.bulldoze || this.fronts(x, z, def.w) || (def.nearRiver && this.onBank(x, z))) return true;
    return this.trail(this.doorsteps(x, z, def.w), () => true) !== null;
  }

  /** Các ô trống (hay chừa trống) giáp mặt móng (x, z, cạnh w). */
  doorsteps(x: number, z: number, w: number): number[] {
    const out: number[] = [];
    const add = (cx: number, cz: number) => {
      const c = this.at(cx, cz);
      if (c === FREE || c === KEEP) out.push(cz * GRID + cx);
    };
    for (let k = 0; k < w; k++) {
      add(x + k, z + w);
      add(x + w, z + k);
      add(x + k, z - 1);
      add(x - 1, z + k);
    }
    return out;
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

/** Số chỗ bị vây kín bỏ qua tối đa trước khi đành nhận chỗ tốt nhất (`linked`). */
const BOXED_TRIES = 24;

/** Xếp một công trình `type` vào chỗ điểm thấp nhất, ưu tiên chỗ trên đường chéo. Hết chỗ thì trả về false. */
function placeSingle(d: Draft, type: BuildingType, score: Score): boolean {
  const w = BUILDINGS[type].w;
  const banned = new Set<number>();
  let first: { x: number; z: number; s: number } | null = null;
  for (let tries = 0; tries < BOXED_TRIES; tries++) {
    let best: { x: number; z: number } | null = null;
    let bestScore = Infinity;
    for (let z = d.lo; z + w - 1 <= LAST; z++) {
      for (let x = d.lo; x + w - 1 <= LAST; x++) {
        if (banned.has(z * GRID + x)) continue;
        const p = d.penalty(type, x, z);
        if (p < 0 || (d.strict && p >= NO_ROAD) || p - snugMax(w) >= bestScore) continue;
        const base = p + (x === z ? 0 : ASYM) + score(footAt(d, x, z, w), d);
        if (base - snugMax(w) >= bestScore) continue;
        const s = base - SNUG * d.snug(x, z, w);
        if (s < bestScore) {
          bestScore = s;
          best = { x, z };
        }
      }
    }
    if (!best) break;
    first ??= { ...best, s: bestScore };
    // Chỗ bị vây kín (không giáp đường, không còn lối ra đường) thì tìm chỗ khác; hết chỗ mới đành đứng đó.
    if (!d.linked(type, best.x, best.z)) {
      banned.add(best.z * GRID + best.x);
      continue;
    }
    first = { ...best, s: bestScore };
    break;
  }
  if (!first) return false;
  if (first.s >= PACKED - snugMax(w)) d.crowded++;
  d.put(type, first.x, first.z);
  return true;
}

/**
 * Xếp một cặp công trình cùng cỡ đối xứng nhau qua đường chéo: `a` ở (x, z) phía bắc đường chéo, `b` ở (z, x)
 * phía tây. Hết chỗ thì trả về false.
 */
function placePair(d: Draft, a: BuildingType, b: BuildingType, score: Score): boolean {
  const w = BUILDINGS[a].w;
  const banned = new Set<number>();
  let first: { x: number; z: number; s: number } | null = null;
  for (let tries = 0; tries < BOXED_TRIES; tries++) {
    let best: { x: number; z: number } | null = null;
    let bestScore = Infinity;
    for (let z = d.lo; z + w - 1 <= LAST; z++) {
      for (let x = z + w; x + w - 1 <= LAST; x++) {
        if (banned.has(z * GRID + x)) continue;
        const pa = d.penalty(a, x, z);
        if (pa < 0 || pa - snugMax(w) >= bestScore) continue;
        const pb = d.penalty(b, z, x);
        if (pb < 0 || (d.strict && Math.max(pa, pb) >= NO_ROAD)) continue;
        // Hai móng sát nhau qua đường chéo thì không còn lối đi.
        const p = Math.max(pa, pb, x - z === w && !d.tight ? PACKED : 0);
        const base = p + (score(footAt(d, x, z, w), d) + score(footAt(d, z, x, w), d)) / 2;
        if (base - snugMax(w) >= bestScore) continue;
        const s = base - SNUG * d.snug(x, z, w);
        if (s < bestScore) {
          bestScore = s;
          best = { x, z };
        }
      }
    }
    if (!best) break;
    first ??= { ...best, s: bestScore };
    if (!d.linked(a, best.x, best.z) || !d.linked(b, best.z, best.x)) {
      banned.add(best.z * GRID + best.x);
      continue;
    }
    first = { ...best, s: bestScore };
    break;
  }
  if (!first) return false;
  if (first.s >= PACKED - snugMax(w)) d.crowded += 2;
  d.put(a, first.x, first.z);
  d.put(b, first.z, first.x);
  return true;
}

/**
 * Một việc xếp: một loại, hay hai loại cùng cỡ đứng đối xứng nhau qua đường chéo; và cách chấm chỗ.
 * Xếp từng cặp đối xứng, số lẻ thì cái còn lại đứng trên đường chéo (hết chỗ đối xứng thì đứng lệch).
 * Số thứ ba (nếu có): mẫu chỉ chừa chỗ cho việc này từ cấp Điện ấy (đất cấp thấp không đủ chỗ).
 */
type Job = [BuildingType | [BuildingType, BuildingType], Score, number?];

function placeJob(d: Draft, [what, score, from = 0]: Job): void {
  const [a, b] = Array.isArray(what) ? what : [what, what];
  const left = (t: BuildingType) => (d.level < from ? 0 : wantOf(t, d.level)) - d.count(t);
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

/** Cột (và hàng) giữa Điện: trục đường chính và cổng thành, đối xứng qua đường chéo. */
const GATE_AXIS = DIEN_HOME + Math.floor(BUILDINGS.dien.w / 2);

// ---------- Khung đường ----------

/**
 * Phố vòng chữ L quanh Điện: hàng `c` và cột `c`, mỗi nhánh từ ô `from` tới ô `to`. Ghi lại nhánh hàng làm phố ngang
 * của nửa bắc, thuộc khu `zone` (Cổ Loa: số vòng thành bao quanh).
 */
function ell(d: Draft, c: number, from: number, to: number, zone = 0): void {
  d.lay(from, c, to, c, STREET);
  d.lay(c, from, c, to, STREET);
  d.streets.push({ c, x0: from, x1: to, zone });
}

/** Đường quanh Điện, sát bốn mặt móng: gốc của mạng đường. Đất phía rừng hẹp quá (`full` sai) thì chỉ mặt nam, mặt đông. */
function palaceRoad(d: Draft, full = true): void {
  d.lay(RING_A, RING_B, RING_B, RING_B, MAIN);
  d.lay(RING_B, RING_A, RING_B, RING_B, MAIN);
  if (full) {
    d.lay(RING_A, RING_A, RING_B, RING_A, MAIN);
    d.lay(RING_A, RING_A, RING_A, RING_B, MAIN);
  }
  for (let k = RING_A; k <= RING_B; k++) d.root.push(RING_B * GRID + k, k * GRID + RING_B, RING_A * GRID + k, k * GRID + RING_A);
}

/**
 * Hai trục đường thẳng giữa Điện: trục bắc (cột `GATE_AXIS`) từ ô `north` tới Điện và trục tây đối xứng, hạng `rank`;
 * trục nam và trục đông từ Điện ra tới ô `south` (đường ven sông), luôn là đường chính.
 */
function axes(d: Draft, north: number, south: number, rank = MAIN): void {
  // Đất phía rừng hẹp quá, đường quanh Điện không có mặt bắc, mặt tây: bỏ luôn trục bắc, trục tây.
  if (d.at(GATE_AXIS, RING_A) === PATH) {
    d.lay(GATE_AXIS, north, GATE_AXIS, RING_A - 1, rank);
    d.lay(north, GATE_AXIS, RING_A - 1, GATE_AXIS, rank);
  }
  d.lay(GATE_AXIS, RING_B + 1, GATE_AXIS, south, MAIN);
  d.lay(RING_B + 1, GATE_AXIS, south, GATE_AXIS, MAIN);
}

/**
 * Khung đường của mẫu không có vòng thành, kiểu bàn cờ: đường quanh Điện; phía rừng cứ `PHO` ô một phố vòng chữ L (giữa
 * hai phố là một dãy lô sâu 4 ô, giáp đường cả trước lẫn sau), từ hàng đất đầu tiên dựng được `f0`, chạy tới sát đường
 * ven sông `rv`; đường ven sông dọc hai bờ.
 */
function streets(d: Draft, f0: number, rv: number): void {
  const full = RING_A - 3 >= f0;
  palaceRoad(d, full);
  if (full) ell(d, RING_A, Math.max(f0, RING_A - 4), rv - 1);
  for (let c = RING_A - PHO; c - 3 >= f0; c -= PHO) ell(d, c, Math.max(f0, c - 4), rv - 1);
  d.lay(f0, rv, rv, rv, STREET);
  d.lay(rv, f0, rv, rv, STREET);
}

/**
 * Lũy tre bao hai mặt rừng (bắc và tây), bẫy chông ở hàng ngoài lũy, chòi canh và lối đi ngay trong lũy. Từ cấp Điện
 * có cổng thành: một cổng giữa lũy mặt bắc, một cổng giữa lũy mặt tây, thẳng trục Điện.
 */
function luyTre(d: Draft): void {
  const lo = d.lo;
  for (let x = lo + 1; x <= LAST; x++) d.segment('luy', x, lo + 1);
  for (let z = lo + 2; z <= LAST; z++) d.segment('luy', lo + 1, z);
  edgeTraps(d);
  towersAlong(d, lo + 2, lo + 3, LAST);
  d.mark(lo + 2, lo + 2, LAST, lo + 2, KEEP);
  d.mark(lo + 2, lo + 2, lo + 2, LAST, KEEP);
  if (wantOf('congThanh', d.level) > 0) {
    for (const s of [slotAt(d, GATE_AXIS, lo + 1), slotAt(d, lo + 1, GATE_AXIS)]) if (s?.type === 'luy') s.cong = true;
  }
}

/** Đường Phong Châu: đường ven sông ngay sau dải bến sát sông; hai trục từ Điện ra thẳng cổng lũy. */
function luyTreRoads(d: Draft): void {
  const lo = d.lo;
  streets(d, lo + 3, DE_AT);
  axes(d, lo + 2, DE_AT - 1);
}

/**
 * Cổng thành trên vòng thành ngoài (Điện có bốn cổng thì thêm vòng giữa): một cổng mặt bắc, một cổng mặt tây, đối
 * xứng qua đường chéo, gần trục Điện nhất mà không đè lên đoạn có ụ nỏ.
 */
function ringGates(d: Draft): void {
  const want = wantOf('congThanh', d.level);
  if (want <= 0 || !d.rings.length) return;
  const outer = d.rings.length - 1;
  const rings = want >= 4 && outer > 0 ? [outer, outer - 1] : [outer];
  for (const r of rings) {
    const { a, b } = d.rings[r];
    const xs: number[] = [];
    for (let x = a + 1; x < b; x++) xs.push(x);
    xs.sort((p, q) => Math.abs(p - GATE_AXIS) - Math.abs(q - GATE_AXIS) || p - q);
    for (const x of xs) {
      const north = slotAt(d, x, a);
      const west = slotAt(d, a, x);
      if (north?.type !== 'thanh' || west?.type !== 'thanh' || north.uNo || west.uNo) continue;
      north.cong = true;
      west.cong = true;
      break;
    }
  }
}

/**
 * Đê bao dọc hai bờ sông, cách sông 3 ô, chạy suốt tới bìa đất; bãi ngoài đê chỉ cho bến, làng chài. Chòi canh cách
 * đê một ô (ô sát đê là đường chân đê; số lẻ thì một chòi ở góc rừng), bẫy chông ở bìa rừng. `towers`: mẫu tự xếp chòi
 * canh ở chỗ khác thì bỏ.
 */
function deBao(d: Draft, towers = true): void {
  const lo = d.lo;
  for (let z = lo; z <= DE_AT; z++) d.segment('de', DE_AT, z);
  for (let x = lo; x < DE_AT; x++) d.segment('de', x, DE_AT);
  d.mark(DE_AT + 1, lo, LAST, LAST, BANK);
  d.mark(lo, DE_AT + 1, LAST, LAST, BANK);
  if (towers) towersAlong(d, DE_AT - 2, lo + 1, DE_AT - 3, lo + 1);
  edgeTraps(d, DE_AT - 2);
  d.mark(lo, lo, DE_AT - 1, lo, KEEP);
  d.mark(lo, lo, lo, DE_AT - 1, KEEP);
}

/** Đường Đê bao: đường chân đê sát trong đê; hai trục từ Điện ra chân đê là đường chính, ra bìa rừng là phố. */
function deBaoRoads(d: Draft): void {
  const rv = DE_AT - 1;
  streets(d, d.lo + 1, rv);
  axes(d, d.lo + 1, rv - 1, STREET);
}

/**
 * Ba vòng thành Cổ Loa quanh Điện. Phía sông (đông, nam) ba vòng đứng sát nhau, vòng trong sát đường quanh Điện.
 * Phía rừng (bắc, tây): vòng trong sát đường quanh Điện; vòng giữa cách vòng trong 4 ô (một ô đường và một dãy nhà
 * 3×3); vòng ngoài cách vòng giữa tới 7 ô (một phố giữa hai dãy nhà 3×3), chừa ngoài nó ít nhất 9 ô, trong số đoạn
 * thành tối đa. Không đủ đoạn thành cho khu giữa vòng giữa và vòng ngoài rộng 4 ô (Điện 5) thì ba vòng đứng sát nhau,
 * nhường đất ngoài thành cho công trình.
 */
function thanhRings(level: number, lo: number): Ring[] {
  const b = [1, 2, 3].map((k) => RING_B + k);
  const max = BUILDINGS.thanh.limit[level - 1];
  const a1 = RING_A - 1;
  const a2 = a1 - 5;
  const count = (a3: number) => 4 * (b[0] - a1 + b[1] - a2 + b[2] - a3);
  let a3 = Math.max(lo + 9, a2 - 8);
  while (count(a3) > max) a3++;
  if (a3 > a2 - 8) a3 = a2 - 1;
  const a = count(a3) <= max ? [a1, a2, a3] : [a1, a1 - 1, a1 - 2].map((v) => Math.max(v, lo + 1));
  return a.map((v, i) => ({ a: v, b: b[i] }));
}

/**
 * Đê bao như mẫu Đê bao, thêm ba vòng thành quanh Điện. `towers`: như ở `deBao`. `gates`: chừa chỗ cổng thành trên
 * vòng thành (`ringGates`); mẫu còn đánh dấu ụ nỏ thì tự chừa sau, cho ụ nỏ né cổng.
 */
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
  deBao(d, towers);
  ringGates(d);
}

/**
 * Đường Cổ Loa: đường quanh Điện trong vòng trong; giữa hai vòng thành một phố vòng (khu hẹp thì sát chân vòng phía
 * trong, khu rộng thì cách một dãy nhà 3×3, rồi cứ `PHO` ô một phố); ngoài vòng ngoài cứ `PHO` ô một phố vòng (mỗi dãy
 * lô giáp đường cả trước lẫn sau); đường chân đê; hai trục từ Điện qua cổng thành ra bìa rừng.
 */
function coLoaRoads(d: Draft): void {
  const lo = d.lo;
  const rv = DE_AT - 1;
  palaceRoad(d);
  for (let i = 0; i + 1 < d.rings.length; i++) {
    const inner = d.rings[i];
    const outer = d.rings[i + 1];
    const w = inner.a - outer.a - 1;
    if (w < 4) continue;
    if (w < 7) ell(d, inner.a - 1, outer.a + 1, outer.b - 1, 2 - i);
    else for (let c = inner.a - 4; c - outer.a >= 4; c -= PHO) ell(d, c, outer.a + 1, outer.b - 1, 2 - i);
  }
  const out = d.rings[d.rings.length - 1];
  for (let c = out.a - PHO; c - 3 >= lo + 1; c -= PHO) ell(d, c, Math.max(lo + 1, c - 4), rv - 1);
  d.lay(lo + 1, rv, rv, rv, STREET);
  d.lay(rv, lo + 1, rv, rv, STREET);
  axes(d, lo + 1, rv - 1, STREET);
  // Đoạn trục trong vòng thành ngoài là đường chính.
  d.lay(GATE_AXIS, out.a + 1, GATE_AXIS, RING_A - 1, MAIN);
  d.lay(out.a + 1, GATE_AXIS, RING_A - 1, GATE_AXIS, MAIN);
}

/** Chỗ trong mẫu ở ô (x, z), nếu có. */
const slotAt = (d: Draft, x: number, z: number) => d.slots.find((s) => s.x === x && s.z === z);

/**
 * Cổ Loa giữ sông: ba vòng thành và đê bao như mẫu Cổ Loa. Ụ nỏ trên vòng thành ngoài, chia đều bốn mặt: phía bắc,
 * phía tây (bìa rừng) và hai mặt phía sông, né chỗ cổng. Chòi canh: ba chỗ dành cho lầu nỏ (hai ở phía sông giữa vòng
 * ngoài và đường chân đê, một ở góc bắc tây), còn lại rải ở mặt bắc và mặt tây.
 */
function coLoaSongWalls(d: Draft): void {
  coLoaWalls(d, false);
  const outer = d.rings[d.rings.length - 1];
  const n = U_NO.limit[d.level - 1] ?? 0;
  const per = Math.ceil(n / 4);
  let left = n;
  const mark = (x: number, z: number, alongX: boolean) => {
    // Chỗ cổng thì lùi sang đoạn bên cạnh.
    for (const k of [0, 1, -1]) {
      const s = slotAt(d, alongX ? x + k : x, alongX ? z : z + k);
      if (left <= 0 || s?.type !== 'thanh' || s.uNo || s.cong) continue;
      s.uNo = true;
      left--;
      return;
    }
  };
  for (const p of spread(per, outer.a + 1, outer.b - 1)) {
    mark(p, outer.a, true);
    mark(outer.a, p, false);
    mark(p, outer.b, true);
    mark(outer.b, p, false);
  }
  const lo = d.lo;
  const want = wantOf('choiCanh', d.level);
  const lau: [number, number, boolean][] = [
    [DIEN_END - 2, DE_AT - 2, true],
    [DE_AT - 2, DIEN_END - 2, false],
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

// ---------- Nối và tỉa đường ----------

/** Khúc đường không nối được với đường quanh Điện (bị công trình lớn, tường cắt ngang): trải thêm lối vòng, không được thì bỏ. */
function joinRoads(d: Draft): void {
  for (;;) {
    const { dist } = d.reach();
    let seed = -1;
    for (let i = 0; i < dist.length && seed < 0; i++) if (d.cell[i] === PATH && dist[i] < 0) seed = i;
    if (seed < 0) return;
    const part = [seed];
    const seen = new Set(part);
    for (let q = 0; q < part.length; q++) {
      for (const n of d.links(part[q])) {
        if (seen.has(n)) continue;
        seen.add(n);
        part.push(n);
      }
    }
    const steps: number[] = [];
    for (const i of part) {
      const x = i % GRID;
      const z = Math.floor(i / GRID);
      for (const [dx, dz] of DIRS) {
        const c = d.at(x + dx, z + dz);
        if (c === FREE || c === KEEP) steps.push((z + dz) * GRID + x + dx);
      }
    }
    const way = d.trail(steps, (r) => dist[r] >= 0);
    if (way) for (const i of way) d.lay(i % GRID, Math.floor(i / GRID), i % GRID, Math.floor(i / GRID), STREET);
    else for (const i of part) d.unlay(i);
  }
}

/** Công trình nhiều ô chưa có mặt nào giáp đường (trừ bến, làng chài ngoài đê): trải một ngõ ngắn nhất tới đường. */
function alleys(d: Draft): void {
  for (const s of d.slots) {
    const def = BUILDINGS[s.type];
    if (def.w === 1 || d.fronts(s.x, s.z, def.w)) continue;
    if (def.nearRiver && d.onBank(s.x, s.z)) continue;
    const way = d.trail(d.doorsteps(s.x, s.z, def.w), () => true);
    if (!way) continue;
    for (const i of way) d.lay(i % GRID, Math.floor(i / GRID), i % GRID, Math.floor(i / GRID), STREET);
    d.alley(way);
  }
}

/**
 * Tỉa đường: giữ đường đang dùng (đường chính, các ô đường giáp mặt trước công trình nhiều ô, và lối ngắn nhất từ chúng
 * về đường quanh Điện); phố không ai dùng thì bỏ. Trả về các ô đường còn lại, gần Điện trước.
 */
function pruneRoads(d: Draft): number[] {
  const { dist } = d.reach();
  const out: number[] = [];
  for (let i = 0; i < d.cell.length; i++) {
    if (d.cell[i] !== PATH) continue;
    if (d.busy[i] && dist[i] >= 0) out.push(i);
    else d.unlay(i);
  }
  return out.sort((p, q) => dist[p] - dist[q] || p - q);
}

/** Số ô đường mẫu muốn trải ở từng cấp Điện, trước khi cắt theo giới hạn đường. */
const ROADS_WANTED = new Map<string, number>();

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
/** Quanh doanh trại. */
const byBarracks: Score = (f, d) => near(d, 'doanhTrai', f);
/** Quanh bếp gói bánh. */
const byKitchen: Score = (f, d) => near(d, 'bep', f);
/** Cổ Loa: trong đúng số vòng thành `rings` rồi mới tới cách chấm `score`. */
const inRings =
  (rings: number, score: Score): Score =>
  (f, d) =>
    zone(d, f, rings) + score(f, d);

// ---------- Chia lô dọc phố ----------

/**
 * Một dãy lô dọc một phố ngang: bắt đầu ở ô (x, z) sát mép đường, chạy theo cột (`ax` là 1 hay -1) được `len` ô, lô
 * ăn sâu về phía `sz` (-1 là phía bắc phố, 1 là phía nam). `t`: đã xếp tới ô thứ mấy.
 */
interface Rail {
  x: number;
  z: number;
  ax: number;
  sz: number;
  len: number;
  t: number;
}

/** Dãy lô phía `side` (-1 bắc, 1 nam) của phố ngang hàng `c`, từ cột `from` chạy về cột `to`. */
function rail(c: number, side: number, from: number, to: number): Rail {
  return { x: from, z: c + side, ax: to >= from ? 1 : -1, sz: side, len: Math.abs(to - from) + 1, t: 0 };
}

/**
 * Hai dãy lô phía `side` của phố ngang hàng `c` (từ cột `x0` tới `x1`), chạy từ trục giữa Điện ra hai đầu: dãy phía
 * đông trục trước, rồi dãy phía tây. Phố không qua trục thì một dãy từ đầu gần trục.
 */
function sides(c: number, x0: number, x1: number, side: number): Rail[] {
  if (x1 < GATE_AXIS) return [rail(c, side, x1, x0)];
  if (x0 > GATE_AXIS) return [rail(c, side, x0, x1)];
  const out: Rail[] = [];
  if (x1 > GATE_AXIS) out.push(rail(c, side, GATE_AXIS + 1, x1));
  if (x0 < GATE_AXIS) out.push(rail(c, side, GATE_AXIS - 1, x0));
  return out;
}

/** Góc móng của lô cạnh `w` ở đầu dãy `r` (chỗ `r.t`). */
function lotAt(r: Rail, w: number): { x: number; z: number } {
  return { x: r.ax > 0 ? r.x + r.t : r.x - r.t - w + 1, z: r.sz > 0 ? r.z : r.z - w + 1 };
}

/** Số công trình loại `type` mẫu còn thiếu ở cấp Điện này (theo số tối đa và cấp Điện mẫu bắt đầu chừa chỗ). */
function lack(d: Draft, type: BuildingType): number {
  const job = RECIPES[d.id].jobs.find(([what]) => what === type || (Array.isArray(what) && what.includes(type)));
  if (!job || d.level < (job[2] ?? 0)) return 0;
  return wantOf(type, d.level) - d.count(type);
}

/** Danh sách công trình còn thiếu của các loại `types`, theo thứ tự ấy. */
function wanted(d: Draft, ...types: BuildingType[]): BuildingType[] {
  return types.flatMap((t) => Array.from({ length: Math.max(0, lack(d, t)) }, () => t));
}

/** Từng cặp `a`, `b` còn thiếu xen kẽ nhau (`a` ở nửa bắc, `b` ở lô đối xứng nửa tây), rồi phần lẻ. */
function paired(d: Draft, a: BuildingType, b: BuildingType): BuildingType[] {
  const n = Math.max(0, Math.min(lack(d, a), lack(d, b)));
  const out: BuildingType[] = [];
  for (let i = 0; i < n; i++) out.push(a, b);
  return [...out, ...wanted(d, a, b).slice(2 * n)];
}

/**
 * Xếp các công trình `items` vào các dãy lô `rails`, lần lượt từng dãy: mỗi lần lấy hai công trình cùng cỡ, một vào
 * lô kế tiếp còn dựng được của dãy (nửa bắc), một vào lô đối xứng qua đường chéo (nửa tây), cách công trình trước một ô.
 * Công trình lẻ vào lô đối xứng còn trống của công trình lẻ trước (`Draft.vacant`), không có thì đứng một mình.
 * Hết lô thì thôi: phần còn thiếu để các việc xếp theo điểm (`Recipe.jobs`) lo.
 */
function fill(d: Draft, rails: Rail[], items: BuildingType[]): void {
  const queue = [...items];
  const gap = d.tight ? 0 : 1;
  while (queue.length) {
    const a = queue.shift()!;
    const w = BUILDINGS[a].w;
    const b = queue.length && BUILDINGS[queue[0]].w === w ? queue.shift() : undefined;
    if (!b) {
      const i = d.vacant.findIndex((v) => v.w === w && d.fits(a, v.x, v.z));
      if (i >= 0) {
        const v = d.vacant.splice(i, 1)[0];
        d.put(a, v.x, v.z);
        continue;
      }
    }
    let done = false;
    for (const r of rails) {
      while (!done && r.t + w <= r.len) {
        const p = lotAt(r, w);
        // Lô và lô đối xứng phải rời nhau ít nhất một ô (đất chật thì sát nhau được).
        if (Math.abs(p.x - p.z) >= w + gap && d.fits(a, p.x, p.z) && d.fits(b ?? a, p.z, p.x)) {
          d.put(a, p.x, p.z);
          if (b) d.put(b, p.z, p.x);
          else d.vacant.push({ x: p.z, z: p.x, w });
          r.t += w + gap;
          done = true;
        } else r.t++;
      }
      if (done) break;
    }
    if (!done) return;
  }
}

/** Đặt `type` vào chỗ đầu tiên dựng được trong `spots` (góc móng), nếu mẫu còn thiếu loại ấy. */
function seat(d: Draft, type: BuildingType, spots: [number, number][]): boolean {
  if (lack(d, type) <= 0) return false;
  for (const [x, z] of spots) {
    const p = d.penalty(type, x, z);
    if (p < 0 || p >= PACKED) continue;
    d.put(type, x, z);
    return true;
  }
  return false;
}

/** Các dãy lô phía bắc (`side` -1) hay phía nam (1) của phố ngang thứ `k` phía rừng (0 là phố sát Điện). */
function along(d: Draft, k: number, side = -1): Rail[] {
  const st = d.streets[k];
  return st ? sides(st.c, st.x0, st.x1, side) : [];
}

/** Dãy lô bến sát sông Đà (bờ sông Thao đối xứng), từ trục giữa Điện ra hai đầu. */
const bankRails = (d: Draft): Rail[] => sides(DE_AT, d.lo, DE_AT - 1, 1);

/** Góc lô 4×4 trên đường chéo, sát góc tây bắc đường quanh Điện: chỗ đền nhìn về Điện. */
const DEN_AT = RING_A - 4;
/** Góc móng doanh trại trên đường chéo: sau đền một ô đường (`CAMP_FAR`), hay sát góc đường quanh Điện khi chưa có đền. */
const CAMP_FAR = DEN_AT - 1 - BUILDINGS.doanhTrai.w;
const CAMP_NEAR = RING_A - BUILDINGS.doanhTrai.w;

/**
 * Công trình lớn của mẫu không có vòng thành, xếp trước khi trải đường, trên đường chéo từ Điện về góc rừng: đền Phù
 * Đổng sát góc đường quanh Điện, doanh trại ngay sau đền. Đất hẹp không vừa thì doanh trại xếp theo điểm (`score`).
 */
function villageBig(d: Draft, score: Score): void {
  const den = seat(d, 'denPhuDong', [[DEN_AT, DEN_AT]]);
  if (!seat(d, 'doanhTrai', den ? [[CAMP_FAR, CAMP_FAR]] : [[CAMP_NEAR, CAMP_NEAR]])) placeJob(d, ['doanhTrai', score]);
}

/**
 * Chia lô mẫu không có vòng thành (Phong Châu, Đê bao), `rv` là hàng đường ven sông:
 * - bến, làng chài, bến thuyền khơi sát sông, từ trục Điện ra hai đầu;
 * - ruộng, ruộng nếp dọc đường ven sông, trước mặt Điện;
 * - trại cung, chuồng voi, trại giáo ở dãy lô sát doanh trại; lò rèn kế bên;
 * - kho, bếp, vườn, chuồng lợn, nhà sàn, nhà thợ hồ ở các dãy lô từ Điện ra;
 * - bãi đá, xưởng mộc ở các dãy lô ngoài cùng phía rừng.
 */
function village(d: Draft, rv: number): void {
  const n = d.streets.length;
  fill(d, bankRails(d), wanted(d, 'ben', 'langChai', 'benKhoi'));
  fill(d, sides(rv, d.lo, rv - 1, -1), wanted(d, 'ruong', 'ruongNep'));
  // Doanh trại đứng sau đền thì dãy lô sát nó là dãy thứ hai; còn sát Điện thì là dãy đầu.
  const camp = d.slots.find((x) => x.type === 'doanhTrai');
  const k = camp && camp.x === CAMP_FAR ? 1 : 0;
  const quan = [...along(d, k).reverse(), ...along(d, k + 1).reverse()];
  fill(d, quan, [...paired(d, 'traiCung', 'chuongVoi'), ...wanted(d, 'traiGiao', 'loRen')]);
  // Không có đê thì dãy lô sát sông còn dư sau bến cũng dựng được: phố bến.
  const bank = rv === DE_AT ? bankRails(d) : [];
  const dan: Rail[] = [];
  for (let i = 0; i < n; i++) dan.push(...along(d, i));
  fill(d, [...dan, ...bank], [...wanted(d, 'kho', 'bep'), ...paired(d, 'vuon', 'chuongLon'), ...wanted(d, 'nhaSan', 'thoHo')]);
  const tho: Rail[] = [];
  for (let i = n - 1; i >= 0; i--) tho.push(...along(d, i));
  fill(d, [...tho, ...bank], wanted(d, 'baiDa', 'xuongMoc', 'loRen'));
}

/**
 * Công trình lớn của mẫu Cổ Loa, xếp trước khi trải đường: Đền Cổ Loa trên đường chéo giữa vòng giữa và vòng ngoài
 * (sát góc vòng giữa); doanh trại, Hồ Kim Quy, Đền Rồng Tiên ngoài vòng ngoài, trên đường chéo về góc rừng (không vừa
 * thì lệch sang bên).
 */
function coLoaBig(d: Draft): void {
  const mid = d.rings[1];
  const out = d.rings[2];
  if (mid.a - out.a - 1 >= 4) seat(d, 'denCoLoa', [[mid.a - 4, mid.a - 4]]);
  for (const t of ['doanhTrai', 'hoKimQuy', 'denRongTien'] as const) if (lack(d, t) > 0) placeJob(d, [t, inRings(0, byAxis)]);
}

/**
 * Chia lô mẫu Cổ Loa:
 * - bến ngoài đê;
 * - ngoài vòng ngoài: các đền hai bên trục cổng, sát chân thành; nơi ở của các binh chủng ở các phố ngoài cùng, phía
 *   doanh trại; ruộng dọc đường chân đê và các phố ngoài; bãi đá, xưởng mộc sát bìa rừng;
 * - giữa vòng trong và vòng giữa: kho, nhà sàn, nhà thợ hồ, bếp;
 * - giữa vòng giữa và vòng ngoài: vườn, chuồng lợn, lò rèn, rồi nhà sàn, kho còn dư.
 */
function citadel(d: Draft): void {
  const rv = DE_AT - 1;
  fill(d, bankRails(d), wanted(d, 'ben', 'langChai', 'benKhoi'));
  const zone = (z: number): Rail[] => {
    const out: Rail[] = [];
    d.streets.forEach((st, k) => {
      if (st.zone === z) out.push(...along(d, k, -1), ...along(d, k, 1));
    });
    return out;
  };
  const z2 = zone(2);
  const z1 = zone(1);
  const z0 = zone(0);
  // Công trình 4×4 ngoài vòng ngoài xếp trước, khi đất còn rộng. Đền sát chân vòng ngoài, hai bên trục cổng: dãy lô
  // phía nam của phố ngoài đầu tiên.
  const k0 = d.streets.findIndex((st) => st.zone === 0);
  const gate = k0 >= 0 ? along(d, k0, 1) : [];
  fill(d, [...gate, ...z0], [...paired(d, 'denPhuDong', 'denTanVien'), ...wanted(d, 'denCuong', 'denHatMon', 'denCoLoa')]);
  fill(d, [...z0].reverse(), [...paired(d, 'traiCung', 'chuongVoi'), ...wanted(d, 'traiGiao', 'traiNo')]);
  fill(d, [...sides(rv, d.lo, rv - 1, -1), ...z0], wanted(d, 'ruong', 'ruongNep'));
  fill(d, [...z2, ...z1, ...z0], wanted(d, 'kho', 'nhaSan', 'thoHo', 'bep'));
  fill(d, [...z1, ...z0], [...paired(d, 'vuon', 'chuongLon'), ...wanted(d, 'loRen')]);
  fill(d, [...z0].reverse(), wanted(d, 'baiDa', 'xuongMoc'));
}

/**
 * Mỗi mẫu: dựng tường và chòi canh theo vùng đất (`walls`), xếp công trình lớn (`big`), trải khung đường (`roads`), chia
 * lô dọc phố cho từng khu (`plan`), rồi xếp phần còn thiếu theo điểm, lần lượt từng việc (`jobs`).
 */
interface Recipe {
  walls: (d: Draft) => void;
  /** Công trình lớn xếp trước khi trải đường: đường chạy tới mép móng rồi dừng. */
  big: (d: Draft) => void;
  roads: (d: Draft) => void;
  plan: (d: Draft) => void;
  jobs: Job[];
}

const RECIPES: Record<MauId, Recipe> = {
  // Kinh đô Phong Châu: lũy tre bao hai mặt rừng, hai trục đường từ Điện ra cổng lũy; đền Phù Đổng, doanh trại trên
  // đường chéo về góc rừng; nhà sàn, kho quanh Điện; bãi đá, xưởng mộc phía rừng; ruộng dọc đường ven sông, bến sát sông.
  phongChau: {
    walls: luyTre,
    big: (d) => villageBig(d, byFront),
    roads: luyTreRoads,
    plan: (d) => village(d, DE_AT),
    jobs: [
      ['ben', byDien],
      ['langChai', byDien],
      ['benKhoi', byDien],
      ['doanhTrai', byFront],
      ['denPhuDong', byAxis],
      ['traiGiao', byBarracks],
      [['traiCung', 'chuongVoi'], byBarracks],
      ['loRen', byBarracks],
      ['ruong', byRiver],
      ['nhaSan', byDien],
      ['kho', byDien],
      ['thoHo', byDien],
      ['bep', byDien],
      [['vuon', 'chuongLon'], byKitchen],
      ['ruongNep', byRiver],
      ['baiDa', byHill],
      ['xuongMoc', byHill],
    ],
  },
  // Đê bao chống lũ: như Phong Châu nhưng không lũy; đê dọc hai bờ sông tới bìa đất, đường chân đê, bến ngoài đê,
  // chòi canh dọc đê; đền Tản Viên ở góc ngã ba sông.
  deBao: {
    walls: deBao,
    big: (d) => {
      villageBig(d, byAxis);
      seat(d, 'denTanVien', [[RING_B + 1, RING_B + 1]]);
    },
    roads: deBaoRoads,
    plan: (d) => village(d, DE_AT - 1),
    jobs: [
      ['ben', byDien],
      ['langChai', byDien],
      ['benKhoi', byDien],
      ['doanhTrai', byAxis],
      ['denPhuDong', byAxis],
      ['denTanVien', byAxis],
      ['traiGiao', byBarracks],
      [['traiCung', 'chuongVoi'], byBarracks],
      ['loRen', byBarracks],
      ['ruong', byRiver],
      ['nhaSan', byDien],
      ['kho', byDien],
      ['thoHo', byDien],
      ['bep', byDien],
      [['vuon', 'chuongLon'], byKitchen],
      ['ruongNep', byRiver],
      ['baiDa', byHill],
      ['xuongMoc', byHill],
    ],
  },
  // Thành Cổ Loa: ba vòng thành kín quanh Điện; vòng trong chỉ có Điện và đường quanh Điện; nhà sàn, kho, bếp giữa
  // vòng trong và vòng giữa; lò rèn, vườn, chuồng lợn, Đền Cổ Loa giữa vòng giữa và vòng ngoài; ruộng, đền, doanh trại,
  // Hồ Kim Quy ngoài vòng ngoài; đê bao ngoài cùng.
  coLoa: {
    walls: coLoaWalls,
    big: coLoaBig,
    roads: coLoaRoads,
    plan: citadel,
    jobs: [
      ['ben', byDien],
      ['langChai', byDien],
      ['benKhoi', byDien],
      ['doanhTrai', inRings(0, byAxis)],
      // Ở Điện 5 đất ngoài thành không đủ cho cả hồ lẫn ruộng: mẫu chừa chỗ hồ từ Điện 6.
      ['hoKimQuy', inRings(0, byAxis), 6],
      ['denCoLoa', inRings(1, byAxis)],
      ['nhaSan', inRings(2, byDien)],
      ['kho', inRings(2, byDien)],
      ['thoHo', inRings(2, byDien)],
      ['bep', inRings(2, byDien)],
      ['loRen', inRings(1, byDien)],
      [['vuon', 'chuongLon'], inRings(1, byKitchen)],
      ['ruongNep', inRings(0, byRiver)],
      [['denPhuDong', 'denTanVien'], inRings(0, byBarracks)],
      ['traiGiao', inRings(0, byBarracks)],
      [['traiCung', 'chuongVoi'], inRings(0, byBarracks)],
      ['ruong', inRings(0, byRiver)],
      ['baiDa', inRings(0, byHill)],
      ['xuongMoc', inRings(0, byHill)],
    ],
  },
  // Cổ Loa giữ sông (chương 4): như mẫu Cổ Loa, thêm ụ nỏ trên vòng thành ngoài, lầu nỏ giữ sông, trại nỏ cạnh
  // doanh trại, Đền Cuông, Đền Hát Môn sát chân vòng ngoài, Đền Rồng Tiên ngoài vòng ngoài.
  coLoaSong: {
    walls: coLoaSongWalls,
    big: coLoaBig,
    roads: coLoaRoads,
    plan: citadel,
    jobs: [
      ['ben', byDien],
      ['langChai', byDien],
      ['benKhoi', byDien],
      ['doanhTrai', inRings(0, byAxis)],
      // Ở Điện 5 hồ choán mất chỗ ruộng nếp: mẫu chừa chỗ hồ từ Điện 6.
      ['hoKimQuy', inRings(0, byAxis), 6],
      ['denRongTien', inRings(0, byAxis), 10],
      ['denCoLoa', inRings(1, byAxis)],
      ['nhaSan', inRings(2, byDien)],
      ['kho', inRings(2, byDien)],
      ['thoHo', inRings(2, byDien)],
      ['bep', inRings(2, byDien)],
      ['loRen', inRings(1, byDien)],
      [['vuon', 'chuongLon'], inRings(1, byKitchen)],
      [['denPhuDong', 'denTanVien'], inRings(0, byBarracks)],
      ['denCuong', inRings(0, byAxis)],
      // Đền Hát Môn (chương 5) cạnh Đền Cuông. Vào chương 5 thì đã có Điện 9; dưới Điện 9 đền choán mất chỗ ruộng,
      // nên mẫu chừa chỗ đền từ Điện 9.
      ['denHatMon', inRings(0, byAxis), 9],
      ['traiGiao', inRings(0, byBarracks)],
      [['traiCung', 'chuongVoi'], inRings(0, byBarracks)],
      ['traiNo', inRings(0, byBarracks)],
      ['ruong', inRings(0, byRiver)],
      ['ruongNep', inRings(0, byRiver)],
      ['baiDa', inRings(0, byHill)],
      // Đất Điện 5 (40×40) có ba vòng thành thì hết chỗ cho xưởng mộc: mẫu này chừa chỗ từ Điện 6.
      ['xuongMoc', inRings(0, byHill), 6],
    ],
  },
};

/** Vật liệu đường của từng mẫu, theo thứ tự mở: đất nện, rải sỏi, lát đá, lát gạch. */
export const MAU_ROAD: Record<MauId, BuildingType> = { phongChau: 'duongDat', deBao: 'duongSoi', coLoa: 'duongDa', coLoaSong: 'duongGach' };

/** Dựng thử mẫu `id` ở cấp Điện `level`. Trả về bản nháp và các ô đường còn lại sau khi tỉa. */
function attempt(id: MauId, level: number, tight: boolean): { d: Draft; roads: number[]; missing: number } {
  const recipe = RECIPES[id];
  const d = new Draft(id, level, tight);
  d.put('dien', DIEN_HOME, DIEN_HOME);
  recipe.walls(d);
  recipe.big(d);
  recipe.roads(d);
  joinRoads(d);
  d.pave();
  recipe.plan(d);
  // Phần còn thiếu: lượt đầu chỉ nhận chỗ giáp đường còn rời công trình khác; rồi bỏ phố chưa ai dùng, xếp nốt vào
  // đất trống (đất chật thì đứng sát nhau); vẫn không đủ đất thì dựng đè lên phố; cuối cùng mở ngõ tới đường.
  d.strict = true;
  for (const job of recipe.jobs) placeJob(d, job);
  d.strict = false;
  d.trim();
  for (const job of recipe.jobs) placeJob(d, job);
  d.bulldoze = true;
  for (const job of recipe.jobs) placeJob(d, job);
  alleys(d);
  let missing = 0;
  for (const [what] of recipe.jobs) for (const t of Array.isArray(what) ? what : [what]) missing += Math.max(0, lack(d, t));
  return { d, roads: pruneRoads(d), missing };
}

/**
 * Dựng mẫu `id` ở cấp Điện `level`. Thử trước cách thoáng (hai công trình nhiều ô cách nhau một ô lối đi); đất không đủ
 * (có công trình thiếu chỗ, hay quá một phần tư phải đứng sát nhau) thì dựng lại theo cách chật: nhà xếp liền nhau
 * thành dãy dọc phố.
 */
function draw(id: MauId, level: number): Slot[] {
  let best = attempt(id, level, false);
  if (best.missing || best.d.crowded * 4 > best.d.slots.filter((x) => BUILDINGS[x.type].w > 1).length) {
    const tight = attempt(id, level, true);
    if (tight.missing <= best.missing) best = tight;
  }
  const max = ROAD_LIMIT[level - 1] ?? 0;
  ROADS_WANTED.set(`${id}:${level}`, best.roads.length);
  const road = MAU_ROAD[id];
  return [...best.d.slots, ...best.roads.slice(0, max).map((i): Slot => ({ type: road, x: i % GRID, z: Math.floor(i / GRID) }))];
}

const DRAWN = new Map<string, Slot[]>();
/** Mẫu `id` chừa chỗ cho loại `type` từ cấp Điện này (0 nếu theo số tối đa ở mọi cấp, xem `Job`). */
export function mauFrom(id: MauId, type: BuildingType): number {
  for (const [what, , from = 0] of RECIPES[id].jobs) if (what === type || (Array.isArray(what) && what.includes(type))) return from;
  return 0;
}

/** Số ô đường mẫu `id` cần ở cấp Điện `level` để nối mọi công trình (mẫu trải không quá giới hạn đường của cấp ấy). */
export function mauRoadNeed(id: MauId, level: number): number {
  mauSlots(id, level);
  return ROADS_WANTED.get(`${id}:${Math.min(Math.max(Math.round(level), 1), BUILDINGS.dien.maxLevel)}`) ?? 0;
}

/** Mọi chỗ trong mẫu `id` ở cấp Điện `level` (cả Điện và các ô đường), đều trong vùng đất đã khai phá ở cấp ấy. */
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

  const plan: MauPlan = { moves: [], builds: [], removes: [], cost: {}, stuck: [], uNos: [], turnDien: !!dien.rot };
  if (dien.x !== DIEN_HOME || dien.z !== DIEN_HOME) {
    plan.moves.push({ id: dien.id, x: DIEN_HOME, z: DIEN_HOME });
    addCost(plan.cost, moveCost(dien));
  }
  // Cổng thành đã mở: chỗ cổng trong mẫu (đoạn tường có cờ `cong`) thành chỗ cổng, tới số cổng tối đa; chưa mở thì
  // vẫn là đoạn tường, vòng tường không hở.
  const gate = BUILDINGS.congThanh;
  let gates = unlocked(state, gate.unlock) && level >= gate.minDien ? limitOf(state, 'congThanh') : 0;
  const all = mauSlots(id, level).filter((s) => s.type !== 'dien' && fits(s.type, s.x, s.z));
  const slots: Slot[] = all.filter((s) => !isRoad(s.type)).map((s) => (s.cong && gates-- > 0 ? { type: 'congThanh' as const, x: s.x, z: s.z } : s));
  // Ô đường của mẫu xếp sau cùng: công trình ngoài mẫu đang đứng trên ô ấy thì đứng yên, đường bỏ ô ấy; công trình
  // phải tìm chỗ mới thì tránh các ô đường của mẫu.
  const roadSlots = all.filter((s) => isRoad(s.type));
  const onRoad = new Uint8Array(GRID * GRID);
  for (const s of roadSlots) onRoad[s.z * GRID + s.x] = 1;
  const offRoad = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (onRoad[(z + dz) * GRID + x + dx]) return false;
    return free(type, x, z);
  };
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
  // Đường đi bờ bên này để riêng, xếp vào các ô đường của mẫu ở dưới.
  const roads = state.buildings.filter((b) => isRoad(b.type) && isNearBank(b.x, b.z));
  for (const b of state.buildings) {
    if (
      b.type === 'dien' ||
      types.includes(b.type) ||
      roads.includes(b) ||
      (b.type === 'lauNo' && types.includes('choiCanh')) ||
      (b.type === 'congDe' && types.includes('de'))
    )
      continue;
    leftovers.push(b);
  }
  const inMau = new Set(types);
  const blocked: Building[] = [];
  for (const b of leftovers) {
    if (SEGMENTS.includes(b.type) && inMau.has(b.type)) plan.removes.push(b.id);
    else if (free(b.type, b.x, b.z)) mark(b.type, b.x, b.z);
    else if (dropIfBlocked(b.type)) plan.removes.push(b.id);
    else blocked.push(b);
  }
  for (const b of blocked) {
    const spot = nearestFree(b, fits, offRoad) ?? nearestFree(b, fits, free);
    if (!spot) {
      plan.stuck.push(b.id);
      continue;
    }
    plan.moves.push({ id: b.id, x: spot.x, z: spot.z });
    addCost(plan.cost, moveCost(b));
    mark(b.type, spot.x, spot.z);
  }
  // Đường: ô đường nào (vật liệu gì cũng được) đã nằm đúng ô đường của mẫu thì giữ; ô đường khác dời vào ô đường còn
  // trống gần nhất của mẫu, giữ vật liệu; hết ô thì đứng yên nếu không vướng, vướng thì dỡ. Ô còn trống của mẫu thì
  // trải thêm bằng vật liệu của mẫu, gần Điện trước, tới giới hạn đường theo cấp Điện.
  const openRoads = roadSlots.filter((s) => !used[s.z * GRID + s.x]);
  const strays: Building[] = [];
  for (const b of roads) {
    const i = openRoads.findIndex((s) => s.x === b.x && s.z === b.z);
    if (i >= 0) {
      openRoads.splice(i, 1);
      mark(b.type, b.x, b.z);
    } else strays.push(b);
  }
  let dropped = 0;
  for (const b of strays) {
    if (!openRoads.length) {
      if (free(b.type, b.x, b.z)) mark(b.type, b.x, b.z);
      else {
        plan.removes.push(b.id);
        dropped++;
      }
      continue;
    }
    let best = 0;
    for (let i = 1; i < openRoads.length; i++) {
      if (Math.abs(openRoads[i].x - b.x) + Math.abs(openRoads[i].z - b.z) < Math.abs(openRoads[best].x - b.x) + Math.abs(openRoads[best].z - b.z)) best = i;
    }
    const s = openRoads.splice(best, 1)[0];
    plan.moves.push({ id: b.id, x: s.x, z: s.z });
    addCost(plan.cost, moveCost(b));
    mark(b.type, s.x, s.z);
  }
  const road = MAU_ROAD[id];
  const roadDef = BUILDINGS[road];
  let roadRoom = roadDef.buildable && unlocked(state, roadDef.unlock) && level >= roadDef.minDien ? limitOf(state, road) - usedOf(state, road) + dropped : 0;
  for (const s of openRoads) {
    if (roadRoom-- <= 0) break;
    plan.builds.push(s);
    addCost(plan.cost, roadDef.buildCost);
    mark(road, s.x, s.z);
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
  // Đang có công trình dựng dở, đoạn tường đang đổi loại: chờ xong mới xếp lại kinh đô (mẫu chưa biết các chỗ ấy).
  if ((state.xay?.viec ?? []).some((v) => v.o.slice(v.xong).some((p) => p.moi || p.doi))) return { ok: false, reason: 'dangXay' };
  const plan = planMau(state, id);
  if (plan.removes.some((r) => isBusy(state, r))) return { ok: false, reason: 'dangXay' };
  if (plan.stuck.length) return { ok: false, reason: 'khongDuCho' };
  if (!plan.moves.length && !plan.builds.length && !plan.removes.length && !plan.uNos.length && !plan.turnDien) return { ok: false, reason: 'daTheoMau' };
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
  return check;
}

/** Đoạn tường loại `old` để nguyên chỗ, đổi sang loại `type` được (thành đắp đè lũy, cổng thay tường, cống thay đê). */
const canTurn = (type: BuildingType, old: BuildingType) =>
  (type === 'thanh' && old === 'luy') || (type === 'congThanh' && (old === 'luy' || old === 'thanh')) || (type === 'congDe' && old === 'de');

/** Áp mẫu có thời gian xây: như `canApplyMau`, thêm phải có tốp thợ rảnh khi mẫu dựng thêm. */
export function canStartMau(state: GameState, id: MauId): Result<MauPlan> {
  const check = canApplyMau(state, id);
  if (!check.ok) return check;
  if (check.value.builds.some((x) => !isRoad(x.type)) && !thoRanh(state)) return { ok: false, reason: 'hetTho' };
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
  // Đường đi trải xong ngay, như khi tự trải.
  for (const s of plan.builds) if (isRoad(s.type)) state.buildings.push(newBuilding(state, s.type, s.x, s.z));
  const houses = plan.builds.filter((s) => !turned.has(s) && BUILDINGS[s.type].w > 1).sort((a, b) => dist(a) - dist(b));
  const walls = plan.builds.filter((s) => !turned.has(s) && BUILDINGS[s.type].w === 1 && !isRoad(s.type));
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
    const want = b.type === 'lauNo' ? 'choiCanh' : b.type === 'congDe' ? 'de' : isRoad(b.type) ? MAU_ROAD[id] : b.type;
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
