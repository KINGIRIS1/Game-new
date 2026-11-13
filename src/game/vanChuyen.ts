/**
 * Dân gánh hàng về kho (`docs/thiet-ke.md` mục Dân gánh hàng về kho). Người làm ở mỗi công trình tự gánh của làm ra về
 * nơi nhận gần nhất: Điện hay kho thóc còn nguyên; nguyên liệu Tết (nếp, đậu lá dong, thịt lợn) gánh tới bếp gói bánh
 * hay về kho cho bếp lấy, nơi nào gần thì về đó.
 * Xa nơi nhận thì mất công đi lại, công trình làm ra ít hơn (`heSoGanh`). Của vẫn vào kho đều mỗi phút như cũ, không
 * có hàng nằm dọc đường, nên bản lưu không thêm gì và lúc vắng tính y như lúc chơi.
 *
 * Quãng đường đo bằng ô đất trống: ô có đường đi, ô cầu còn nguyên rẻ hơn (`GANH.duong`), vượt lũy, thành tốn
 * `GANH.tuong` ô, cổng thành, cống đê, đê, bẫy, đồ trang trí và công trình đang hư đi qua như đất; sông, rừng chưa phát
 * và móng công trình khác không đi qua được. Phần vẽ người gánh dùng chung tuyến ở đây (`duongGanh`).
 */
import { BUILDINGS, GANH, GANH_BEP, isBridge, isDecor, type BuildingType } from './defs';
import type { Building, GameState } from './game';
import { openMask } from './khoanh';
import { GRID, inGrid, isRiver } from './map';
import { pendingBuildings } from './xay';

/** Nơi nhận hàng: kho (Điện, kho thóc), hay bếp gói bánh cùng kho (nguyên liệu Tết). */
export type DichGanh = 'kho' | 'bep';

/** Bản đồ khoảng cách tới nơi nhận gần nhất. */
export interface TruongGanh {
  /** Chi phí đi từ ô tới nơi nhận gần nhất (Infinity: không tới được). */
  xa: Float32Array;
  /** Ô kế tiếp trên đường về nơi nhận (-1 ở ô của nơi nhận hay ô không tới được). */
  ve: Int32Array;
  /** Id nơi nhận gần nhất (0: không tới được). */
  noi: Int32Array;
}

export interface DuongGanh {
  /** Quãng đường (ô đất trống); Infinity khi không có lối. */
  d: number;
  heSo: number;
  /** Id nơi nhận; 0 khi không có lối. */
  noi: number;
  /** Các ô trên đường, từ ô sát công trình tới ô sát nơi nhận (chỉ số z * GRID + x). */
  tuyen: number[];
}

interface GanhInfo {
  key: number;
  n: number;
  mask: Uint8Array;
  cost: Float32Array;
  kho: TruongGanh;
  bep: TruongGanh | null;
  heSo: Map<number, number>;
}

const cache = new WeakMap<GameState, GanhInfo>();
const TYPE_INDEX = new Map(Object.keys(BUILDINGS).map((t, i) => [t, i + 1]));

/** Công trình này có người làm gánh hàng không: mọi nơi có chỗ làm, trừ bếp (bánh để ở gác bếp). */
export function ganhType(type: BuildingType): boolean {
  return !!BUILDINGS[type].workers && type !== 'bep';
}

/** Hàng của công trình loại này gánh về đâu. */
export function dichOf(type: BuildingType): DichGanh {
  return GANH_BEP.includes(type) ? 'bep' : 'kho';
}

/** Hệ số sản lượng theo quãng đường `d`. */
export function heSoTheo(d: number): number {
  if (d <= GANH.gan) return 1;
  if (!Number.isFinite(d)) return GANH.san;
  return Math.max(GANH.san, (GANH.k + GANH.gan) / (GANH.k + d));
}

/** Chi phí bước vào ô của công trình `b` (Infinity: không đi qua). */
function tileCost(b: Pick<Building, 'type' | 'damaged'>): number {
  if (isBridge(b.type)) return b.damaged ? Infinity : GANH.duong;
  if (isDecor(b.type)) return BUILDINGS[b.type].decor === 'duong' ? GANH.duong : 1;
  if (b.damaged) return 1;
  switch (b.type) {
    case 'luy':
    case 'thanh':
      return GANH.tuong;
    case 'congThanh':
    case 'congDe':
    case 'de':
    case 'bayChong':
    case 'bacThanh':
      return 1;
    default:
      return Infinity;
  }
}

function fill(cost: Float32Array, b: Pick<Building, 'type' | 'x' | 'z'>, c: number): void {
  const def = BUILDINGS[b.type];
  for (let dz = 0; dz < def.d; dz++) {
    for (let dx = 0; dx < def.w; dx++) {
      const x = b.x + dx;
      const z = b.z + dz;
      if (inGrid(x, z)) cost[z * GRID + x] = c;
    }
  }
}

/** Lưới chi phí bước vào mỗi ô khi gánh hàng. */
function luoiGanh(state: GameState, mask: Uint8Array): Float32Array {
  const cost = new Float32Array(GRID * GRID);
  for (let i = 0; i < cost.length; i++) {
    const x = i % GRID;
    const z = (i - x) / GRID;
    cost[i] = mask[i] && !isRiver(x, z) ? 1 : Infinity;
  }
  // Cầu nằm trên sông: dựng sau ô sông. Công trình đang dựng mới chiếm chỗ như công trình đã dựng.
  for (const b of pendingBuildings(state)) fill(cost, b, isDecor(b.type) || isBridge(b.type) ? cost[b.z * GRID + b.x] : Infinity);
  for (const b of state.buildings) fill(cost, b, tileCost(b));
  return cost;
}

/** Hàng đợi ưu tiên nhỏ nhất (khóa, chỉ số ô). */
class Heap {
  private k: number[] = [];
  private v: number[] = [];
  get size(): number {
    return this.v.length;
  }
  push(k: number, v: number): void {
    const K = this.k;
    const V = this.v;
    let i = V.length;
    K.push(k);
    V.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (K[p] <= k) break;
      K[i] = K[p];
      V[i] = V[p];
      i = p;
    }
    K[i] = k;
    V[i] = v;
  }
  pop(): number {
    const K = this.k;
    const V = this.v;
    const top = V[0];
    const k = K.pop()!;
    const v = V.pop()!;
    const n = V.length;
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && K[c + 1] < K[c]) c++;
        if (K[c] >= k) break;
        K[i] = K[c];
        V[i] = V[c];
        i = c;
      }
      K[i] = k;
      V[i] = v;
    }
    return top;
  }
}

/**
 * Dijkstra nhiều nguồn trên lưới 8 hướng (không cắt góc qua ô không đi được), từ mọi ô của các nơi nhận. Ô của nơi
 * nhận có chi phí 0 và chỉ là chỗ xuất phát.
 */
function truong(cost: Float32Array, nguon: Building[]): TruongGanh {
  const N = GRID * GRID;
  const xa = new Float32Array(N).fill(Infinity);
  const ve = new Int32Array(N).fill(-1);
  const noi = new Int32Array(N);
  const heap = new Heap();
  for (const b of nguon) {
    const def = BUILDINGS[b.type];
    for (let dz = 0; dz < def.d; dz++) {
      for (let dx = 0; dx < def.w; dx++) {
        const x = b.x + dx;
        const z = b.z + dz;
        if (!inGrid(x, z)) continue;
        const i = z * GRID + x;
        if (xa[i] === 0) continue;
        xa[i] = 0;
        noi[i] = b.id;
        heap.push(0, i);
      }
    }
  }
  const pass = (x: number, z: number) => inGrid(x, z) && cost[z * GRID + x] !== Infinity;
  while (heap.size) {
    const cur = heap.pop();
    const g = xa[cur];
    const cx = cur % GRID;
    const cz = (cur - cx) / GRID;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (!pass(nx, nz)) continue;
        if (dx && dz && (!pass(cx + dx, cz) || !pass(cx, cz + dz))) continue;
        const ni = nz * GRID + nx;
        const ng = g + cost[ni] * (dx && dz ? Math.SQRT2 : 1);
        if (ng < xa[ni]) {
          xa[ni] = ng;
          ve[ni] = cur;
          noi[ni] = noi[cur];
          heap.push(ng, ni);
        }
      }
    }
  }
  return { xa, ve, noi };
}

/** Ô sát quanh móng (cả bốn góc) của công trình `b`, trong lưới. */
function vienMong(b: Pick<Building, 'type' | 'x' | 'z'>): number[] {
  const def = BUILDINGS[b.type];
  const out: number[] = [];
  for (let z = b.z - 1; z <= b.z + def.d; z++) {
    for (let x = b.x - 1; x <= b.x + def.w; x++) {
      const inside = x >= b.x && x < b.x + def.w && z >= b.z && z < b.z + def.d;
      if (!inside && inGrid(x, z)) out.push(z * GRID + x);
    }
  }
  return out;
}

/** Ô sát móng gần nơi nhận nhất (-1: không có lối). */
function oGanNhat(t: TruongGanh, b: Pick<Building, 'type' | 'x' | 'z'>): number {
  let best = -1;
  for (const i of vienMong(b)) if (t.xa[i] !== Infinity && (best < 0 || t.xa[i] < t.xa[best])) best = i;
  return best;
}

function dauVet(state: GameState): { key: number; n: number } {
  let h = 0x811c9dc5;
  const mix = (v: number) => {
    h = Math.imul(h ^ v, 0x01000193);
  };
  const one = (b: Building, extra: number) => {
    mix(b.id);
    mix((((TYPE_INDEX.get(b.type) ?? 0) * 128 + b.x) * 128 + b.z) * 4 + extra);
  };
  for (const b of state.buildings) one(b, b.damaged ? 1 : 0);
  const pend = state.xay?.viec.length ? pendingBuildings(state) : [];
  for (const b of pend) one(b, 2);
  return { key: h, n: state.buildings.length * 1000 + pend.length };
}

function info(state: GameState): GanhInfo {
  const { key, n } = dauVet(state);
  const mask = openMask(state);
  const hit = cache.get(state);
  if (hit && hit.key === key && hit.n === n && hit.mask === mask) return hit;
  const cost = luoiGanh(state, mask);
  const khos = state.buildings.filter((b) => b.type === 'dien' || (b.type === 'kho' && !b.damaged));
  const kho = truong(cost, khos);
  // Nguyên liệu Tết gánh tới bếp, hay về kho cho bếp lấy: nơi nào gần thì về đó.
  const beps = state.buildings.filter((b) => b.type === 'bep' && !b.damaged);
  const bep = beps.length ? truong(cost, [...khos, ...beps]) : null;
  const heSo = new Map<number, number>();
  for (const b of state.buildings) {
    if (!ganhType(b.type)) continue;
    const t = dichOf(b.type) === 'bep' ? bep : kho;
    const i = t ? oGanNhat(t, b) : -1;
    heSo.set(b.id, heSoTheo(i < 0 ? Infinity : t!.xa[i]));
  }
  const fresh: GanhInfo = { key, n, mask, cost, kho, bep, heSo };
  cache.set(state, fresh);
  return fresh;
}

/**
 * Hệ số sản lượng của công trình `b` vì quãng đường gánh: 1 khi gần nơi nhận (và với công trình không gánh hàng),
 * thấp nhất `GANH.san`. Nguyên liệu Tết mà chưa có bếp thì 1 (chưa gánh đi đâu).
 */
export function heSoGanh(state: GameState, b: Pick<Building, 'id' | 'type'>): number {
  if (!ganhType(b.type)) return 1;
  const g = info(state);
  if (dichOf(b.type) === 'bep' && !g.bep) return 1;
  return g.heSo.get(b.id) ?? 1;
}

/** Hệ số gánh của mọi công trình (id → hệ số), tính một lần cho cả kinh đô. */
export function heSoMap(state: GameState): (b: Pick<Building, 'id' | 'type'>) => number {
  const g = info(state);
  return (b) => {
    if (!ganhType(b.type)) return 1;
    if (dichOf(b.type) === 'bep' && !g.bep) return 1;
    return g.heSo.get(b.id) ?? 1;
  };
}

/** Khóa trong `hinted`: Lạc hầu đã báo một lần việc gánh hàng về kho. */
export const GANH_HINT = 'ganh';

/** Lạc hầu nên báo việc gánh hàng: lần đầu có công trình đang có người làm mà làm ra chưa đủ vì xa nơi nhận. */
export function needsGanhHint(state: GameState): boolean {
  if (state.hinted.includes(GANH_HINT)) return false;
  const ganh = heSoMap(state);
  return state.buildings.some((b) => b.workers > 0 && ganh(b) < 1);
}

export function markGanhHinted(state: GameState): void {
  if (!state.hinted.includes(GANH_HINT)) state.hinted = [...state.hinted, GANH_HINT];
}

/** Bản đồ khoảng cách tới nơi nhận (cho phần vẽ, tô vùng). Null khi chưa có bếp. */
export function truongKho(state: GameState, dich: DichGanh): TruongGanh | null {
  const g = info(state);
  return dich === 'bep' ? g.bep : g.kho;
}

/** Đường gánh của công trình `b`: quãng đường, hệ số, nơi nhận và các ô trên đường. */
export function duongGanh(state: GameState, b: Pick<Building, 'id' | 'type' | 'x' | 'z'>): DuongGanh | null {
  if (!ganhType(b.type)) return null;
  const t = truongKho(state, dichOf(b.type));
  if (!t) return null;
  const i = oGanNhat(t, b);
  if (i < 0) return { d: Infinity, heSo: GANH.san, noi: 0, tuyen: [] };
  const tuyen: number[] = [];
  for (let c = i, guard = 0; c >= 0 && guard < GRID * GRID; c = t.ve[c], guard++) {
    if (t.xa[c] === 0) break;
    tuyen.push(c);
  }
  return { d: t.xa[i], heSo: heSoTheo(t.xa[i]), noi: t.noi[i], tuyen };
}

/**
 * Hệ số gánh nếu đặt (hay dời) công trình loại `type` tới (x, z): đo trên lưới hiện có, coi như móng chưa chắn gì
 * (công trình đang dời thì bỏ móng cũ ra trước, `skip`). Null với loại không gánh hàng hay nguyên liệu Tết chưa có bếp.
 */
export function ganhPreview(state: GameState, type: BuildingType, x: number, z: number, skip?: number): number | null {
  if (!ganhType(type)) return null;
  let t = truongKho(state, dichOf(type));
  if (!t) return null;
  if (skip !== undefined) {
    const s = { ...state, buildings: state.buildings.filter((b) => b.id !== skip) } as GameState;
    t = truongKho(s, dichOf(type));
    if (!t) return null;
  }
  const i = oGanNhat(t, { type, x, z });
  return heSoTheo(i < 0 ? Infinity : t.xa[i]);
}
