/**
 * Dân gánh hàng về kho (`docs/thiet-ke.md` mục Dân gánh hàng về kho). Người làm ở mỗi công trình tự gánh của làm ra về
 * nơi nhận gần nhất: Điện hay kho thóc còn nguyên; nguyên liệu Tết (nếp, đậu lá dong, thịt lợn) gánh tới bếp gói bánh
 * hay về kho cho bếp lấy, nơi nào gần thì về đó.
 * Xa nơi nhận thì mất công đi lại, công trình làm ra ít hơn (`heSoGanh`). Của vẫn vào kho đều mỗi phút như cũ, không
 * có hàng nằm dọc đường, nên bản lưu không thêm gì và lúc vắng tính y như lúc chơi.
 *
 * Quãng đường đo bằng ô đất trống: ô có đường đi, ô cầu còn nguyên rẻ hơn (`GANH.duong`); cổng thành, cống đê, đê,
 * bẫy, bậc lên thành, đồ trang trí và công trình đang hư đi qua như đất; lũy, thành còn nguyên chắn hẳn như móng công
 * trình (dân không trèo qua, chỉ qua cổng thành hay chỗ hở); sông, rừng chưa phát cũng không đi qua được. Phần vẽ người
 * gánh dùng chung tuyến ở đây (`duongGanh`).
 */
import { BUILDINGS, GANH, GANH_BEP, isBridge, isDecor, type BuildingType } from './defs';
import type { Building, GameState } from './game';
import { openMask } from './khoanh';
import { GRID, inGrid, isRiver } from './map';
import { pendingBuildings } from './xay';

/** Nơi nhận hàng: kho (Điện, kho thóc), hay bếp gói bánh cùng kho (nguyên liệu Tết). */
export type DichGanh = 'kho' | 'bep';
/** Đích của một tuyến: nơi nhận hàng, hay riêng Điện (mùa Tết đội mâm bánh lên Điện). */
export type DichTuyen = DichGanh | 'dien';

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
  /** Trường chỉ tới Điện, tính khi cần (undefined: chưa tính). */
  dien?: TruongGanh | null;
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
 * nhận có chi phí 0 và chỉ là chỗ xuất phát. `tran`: chỉ loang tới chi phí ấy (ô xa hơn để Infinity), cho vùng của
 * một nơi nhận.
 */
function truong(cost: Float32Array, nguon: Pick<Building, 'id' | 'type' | 'x' | 'z'>[], tran = Infinity): TruongGanh {
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
        if (ng < xa[ni] && ng <= tran) {
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

/** Chi phí bước vào ô `i` (z * GRID + x) khi gánh hàng: 1 là ô đất trống, đường đi, cầu nửa ô, Infinity là không qua. */
export function chiPhiO(state: GameState, i: number): number {
  return info(state).cost[i] ?? Infinity;
}

/** Bản đồ khoảng cách tới nơi nhận (cho phần vẽ, tô vùng). Null khi chưa có bếp. */
export function truongKho(state: GameState, dich: DichGanh): TruongGanh | null {
  const g = info(state);
  return dich === 'bep' ? g.bep : g.kho;
}

/** Dò tuyến theo trường `t` từ ô sát móng `b` gần nơi nhận nhất về tới sát nơi nhận. */
function doTuyen(t: TruongGanh, b: Pick<Building, 'type' | 'x' | 'z'>): DuongGanh {
  const i = oGanNhat(t, b);
  if (i < 0) return { d: Infinity, heSo: GANH.san, noi: 0, tuyen: [] };
  const tuyen: number[] = [];
  for (let c = i, guard = 0; c >= 0 && guard < GRID * GRID; c = t.ve[c], guard++) {
    if (t.xa[c] === 0) break;
    tuyen.push(c);
  }
  return { d: t.xa[i], heSo: heSoTheo(t.xa[i]), noi: t.noi[i], tuyen };
}

/** Đường gánh của công trình `b`: quãng đường, hệ số, nơi nhận và các ô trên đường. */
export function duongGanh(state: GameState, b: Pick<Building, 'id' | 'type' | 'x' | 'z'>): DuongGanh | null {
  if (!ganhType(b.type)) return null;
  const t = truongKho(state, dichOf(b.type));
  return t ? doTuyen(t, b) : null;
}

/** Trường chỉ tới Điện (null khi không có Điện), tính một lần cho mỗi lần dựng lưới. */
function truongDien(g: GanhInfo, state: GameState): TruongGanh | null {
  if (g.dien === undefined) {
    const dien = state.buildings.find((b) => b.type === 'dien');
    g.dien = dien ? truong(g.cost, [dien]) : null;
  }
  return g.dien;
}

/**
 * Tuyến từ móng bất kỳ `foot` (công trình đang dựng, đang nâng, bếp) tới nơi nhận gần nhất của `dich`, không xét loại
 * công trình có gánh hàng không: thợ vác vật liệu từ kho tới công trình đang xây, người bếp gùi nguyên liệu từ kho,
 * đội mâm bánh lên Điện. Null khi chưa có nơi nhận, không có lối, hay nơi nhận gần nhất chính là `foot` (nâng kho).
 */
export function duongTu(state: GameState, foot: Pick<Building, 'type' | 'x' | 'z'> & { id?: number }, dich: DichTuyen): DuongGanh | null {
  const g = info(state);
  const t = dich === 'dien' ? truongDien(g, state) : dich === 'bep' ? g.bep : g.kho;
  if (!t) return null;
  const r = doTuyen(t, foot);
  if (!r.noi || r.noi === foot.id) return null;
  return r;
}

/**
 * Kinh đô y như `state` nhưng bỏ công trình `skip` (đang dời): móng cũ không chắn đường. Ghi nhớ một mục, cho bóng
 * công trình nhích từng ô khi dời khỏi phải dựng lại lưới mỗi lần.
 */
let boNho: { state: GameState; key: number; n: number; mask: Uint8Array; skip: number; s: GameState } | null = null;
function stateBo(state: GameState, skip: number): GameState {
  const { key, n } = dauVet(state);
  const mask = openMask(state);
  const m = boNho;
  if (m && m.state === state && m.key === key && m.n === n && m.mask === mask && m.skip === skip) return m.s;
  const s = { ...state, buildings: state.buildings.filter((b) => b.id !== skip) } as GameState;
  boNho = { state, key, n, mask, skip, s };
  return s;
}

/**
 * Hệ số gánh nếu đặt (hay dời) công trình loại `type` tới (x, z): đo trên lưới hiện có, coi như móng chưa chắn gì
 * (công trình đang dời thì bỏ móng cũ ra trước, `skip`). Null với loại không gánh hàng hay nguyên liệu Tết chưa có bếp.
 */
export function ganhPreview(state: GameState, type: BuildingType, x: number, z: number, skip?: number): number | null {
  if (!ganhType(type)) return null;
  const t = truongKho(skip !== undefined ? stateBo(state, skip) : state, dichOf(type));
  if (!t) return null;
  const i = oGanNhat(t, { type, x, z });
  return heSoTheo(i < 0 ? Infinity : t.xa[i]);
}

/** Loại công trình là nơi nhận hàng (Điện, kho thóc, bếp gói bánh). */
export function nhanType(type: BuildingType): boolean {
  return type === 'dien' || type === 'kho' || type === 'bep';
}

/**
 * Hỏi vùng đủ sản lượng: đang đặt, dời công trình loại `type` (chỗ `x`, `z` bỏ trống khi chỗ chưa đặt được; `skip`:
 * công trình đang dời), hay đang chọn công trình `id`.
 */
export type VungHoi = { type: BuildingType; x?: number; z?: number; skip?: number } | { id: number };

/**
 * Vùng gánh hàng đủ 100% để tô trên đất (mỗi ô: 0 không tô, 1 vùng có sẵn, 2 vùng của nơi đang đặt hay đang chọn).
 * Chỉ tô ô đi qua được, trong `GANH.gan` của nơi nhận. Móng công trình đè lên hay chạm ô tô thì gánh đủ (khớp
 * `ganhPreview`: dò từ ô trong móng theo đường về luôn ra một ô viền gần nơi nhận hơn).
 * - Đặt, dời công trình có người gánh hàng: vùng của nơi nhận nó gánh về (1). Nguyên liệu Tết chưa có bếp: null.
 * - Đặt, dời kho, bếp, Điện: vùng có sẵn (1), phần nơi mới phủ thêm (2).
 * - Chọn kho, Điện, bếp còn nguyên: vùng riêng của nơi ấy (2), phần còn lại của vùng (1). Kho hư, loại khác: null.
 */
export function vungGanh(state: GameState, hoi: VungHoi): Uint8Array | null {
  if ('id' in hoi) {
    const b = state.buildings.find((o) => o.id === hoi.id);
    if (!b || b.damaged || !nhanType(b.type)) return null;
    const g = info(state);
    const t = b.type === 'bep' ? g.bep : g.kho;
    return t ? toVung(g.cost, t, truong(g.cost, [b], GANH.gan), false) : null;
  }
  const s = hoi.skip !== undefined ? stateBo(state, hoi.skip) : state;
  const g = info(s);
  if (ganhType(hoi.type)) {
    const t = dichOf(hoi.type) === 'bep' ? g.bep : g.kho;
    return t ? toVung(g.cost, t, null, true) : null;
  }
  if (!nhanType(hoi.type)) return null;
  // Bếp đầu tiên: nguyên liệu Tết gánh về kho hay bếp mới, nên vùng có sẵn là vùng của kho.
  const base = hoi.type === 'bep' ? (g.bep ?? g.kho) : g.kho;
  if (hoi.x === undefined || hoi.z === undefined) return toVung(g.cost, base, null, true);
  const moi = truong(g.cost, [{ id: -1, type: hoi.type, x: hoi.x, z: hoi.z }], GANH.gan);
  return toVung(g.cost, base, moi, true);
}

/** Gộp trường có sẵn `base` và vùng riêng `rieng` thành mặt nạ tô; `them`: chỉ tô phần riêng chưa thuộc vùng có sẵn. */
function toVung(cost: Float32Array, base: TruongGanh, rieng: TruongGanh | null, them: boolean): Uint8Array {
  const out = new Uint8Array(GRID * GRID);
  for (let i = 0; i < out.length; i++) {
    if (cost[i] === Infinity) continue;
    const co = base.xa[i] <= GANH.gan;
    // Ô dưới móng nơi mới (chi phí 0) do mô hình bóng che, không tô.
    const r = !!rieng && rieng.xa[i] > 0 && rieng.xa[i] <= GANH.gan;
    if (r && (!them || !co)) out[i] = 2;
    else if (co) out[i] = 1;
  }
  return out;
}
