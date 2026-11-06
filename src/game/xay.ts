// Thời gian xây: mỗi lần dựng mới, nâng cấp hay đắp một mảng tường là một việc, giao cho một tốp thợ rảnh. Điện có
// sẵn một tốp; mỗi nhà thợ hồ thêm một tốp, nhà lên cấp thì tốp ấy làm nhanh hơn. Hết tốp rảnh thì phải chờ.
//
// Công trình đang dựng mới nằm trong việc (`PhanViec.moi`), chưa vào `state.buildings`: chưa làm ra gì, không cho sức
// chứa, chỗ ở, chỗ quân, không tính nhiệm vụ; giặc, lũ không đụng tới. Nó vẫn chiếm ô (`occupancy`) và tính vào số
// tối đa (`usedOf`). Công trình đang nâng cấp vẫn làm việc ở cấp cũ tới khi xong. Tiến độ tính bằng công đã làm
// (`lam`, ms ở tốc độ 1), cộng theo thời gian trôi nhân tốc độ tốp, cả lúc mở game lẫn lúc vắng (`applyOffline`).

import { openBridgehead } from './benKia';
import {
  BUILDINGS,
  DA_HOI_NHO,
  QUIZ_TURNS,
  RESOURCE_IDS,
  THO_DIEN_TOC,
  THO_TOC,
  XAY_HE_SO,
  XAY_MS,
  XAY_O_MS,
  XAY_RIENG,
  isDecor,
  type BuildingType,
  type Cost,
} from './defs';
import {
  canPlace,
  canUpgrade,
  fillWorkers,
  findBuilding,
  newBuilding,
  pay,
  place,
  planLine,
  replacedWall,
  upgrade,
  upgradeCostOf,
  type Building,
  type FailReason,
  type GameState,
  type Result,
} from './game';
import { GRID, inGrid } from './map';

/** Một phần của việc xây: một công trình dựng mới, đổi loại hay nâng một cấp. */
export interface PhanViec {
  /** Công trình của phần việc. Dựng mới thì là id của công trình chờ dựng `moi`. */
  id: number;
  /** Dựng mới: công trình chờ dựng, chưa vào `state.buildings` tới khi xong phần việc này. */
  moi?: Building;
  /** Nâng công trình `id` lên một cấp. */
  len?: true;
  /** Đổi đoạn tường `id` sang loại này (thành đắp đè lũy, cổng thay tường, cống thay đê); tường cũ đứng tới khi xong. */
  doi?: BuildingType;
  /** Xong thì gắn ụ nỏ lên đoạn thành (áp mẫu kinh đô). */
  uNo?: true;
  /** Công của phần việc: ms ở tốc độ 1. */
  ms: number;
  /** Của đã trả cho phần việc này, hoàn lại khi hủy lúc chưa xong. */
  gia: Cost;
}

/** Một việc xây giao cho một tốp thợ: các phần làm lần lượt theo thứ tự. */
export interface CongViec {
  id: number;
  /** Tốp thợ: id Điện (tốp có sẵn) hay id một nhà thợ hồ. */
  tho: number;
  o: PhanViec[];
  /** Số phần đã xong (đã đưa vào kinh đô). */
  xong: number;
  /** Công đã làm: ms ở tốc độ 1, cộng cả phần câu đố sử bớt. */
  lam: number;
  /** Số lượt đố sử đã dùng. */
  hoi: number;
  /** Câu đố đang hỏi, chưa trả lời: đóng bảng mở lại vẫn là câu ấy. */
  cau?: number;
}

export interface XayState {
  viec: CongViec[];
  nextId: number;
  /** Các câu đố vừa hỏi gần đây (mới nhất ở cuối), để khỏi hỏi lại sớm. */
  daHoi: number[];
  /** Đếm số phần việc đã xong: giao diện so số này để biết khi nào vẽ lại cảnh, báo xong. */
  seq: number;
}

export function initialXay(): XayState {
  return { viec: [], nextId: 1, daHoi: [], seq: 0 };
}

const okR = <T>(value: T): Result<T> => ({ ok: true, value });
const failR = (reason: FailReason): Result<never> => ({ ok: false, reason });

// ---------- Thời gian ----------

/**
 * Công (ms, tốc độ 1) để có công trình `type` ở cấp `level` (1 là dựng mới). Đường đi, đồ trang trí xong ngay (0).
 * Đọc bảng lúc gọi, nên `scripts/kinh-te.mjs --thu` đổi bảng được.
 */
export function xayMs(type: BuildingType, level: number): number {
  if (isDecor(type)) return 0;
  const table = XAY_O_MS[type] ?? XAY_RIENG[type];
  if (table) return table[level] ?? 0;
  return Math.round((XAY_MS[level] ?? 0) * (XAY_HE_SO[type] ?? 1));
}

// ---------- Tốp thợ ----------

export interface Tho {
  /** Id công trình có tốp: Điện hay nhà thợ hồ. */
  id: number;
  type: BuildingType;
  toc: number;
}

/** Các tốp thợ đang có: tốp của Điện và một tốp mỗi nhà thợ hồ đã dựng xong. */
export function danhSachTho(state: GameState): Tho[] {
  const out: Tho[] = [];
  for (const b of state.buildings) {
    if (b.type === 'dien') out.push({ id: b.id, type: b.type, toc: THO_DIEN_TOC });
    else if (b.type === 'thoHo') out.push({ id: b.id, type: b.type, toc: THO_TOC[b.level - 1] ?? 1 });
  }
  return out;
}

/** Tốc độ tốp thợ `id` (tốp không còn thì như tốc độ 1). */
export function tocDo(state: GameState, id: number): number {
  const b = findBuilding(state, id);
  if (b?.type === 'thoHo') return THO_TOC[b.level - 1] ?? 1;
  return THO_DIEN_TOC;
}

/** Tốp thợ rảnh nhanh nhất, hay không có. */
export function thoRanh(state: GameState): Tho | undefined {
  const busy = new Set(viecOf(state).map((v) => v.tho));
  let best: Tho | undefined;
  for (const t of danhSachTho(state)) {
    if (busy.has(t.id)) continue;
    if (!best || t.toc > best.toc) best = t;
  }
  return best;
}

/** Số tốp rảnh và tổng số tốp. */
export function soTho(state: GameState): { ranh: number; tong: number } {
  const all = danhSachTho(state);
  const busy = new Set(viecOf(state).map((v) => v.tho));
  return { ranh: all.filter((t) => !busy.has(t.id)).length, tong: all.length };
}

// ---------- Công trình đang có việc ----------

/** Phần việc còn chưa xong. */
const pending = (v: CongViec): PhanViec[] => v.o.slice(v.xong);

/** Các việc đang làm (bản lưu cũ đang nâng dở, chưa có `xay`, thì không có việc nào). */
export const viecOf = (state: GameState): CongViec[] => state.xay?.viec ?? [];

/** Công trình đang dựng mới (chưa xong), theo thứ tự việc. Chúng chiếm ô và tính vào số tối đa. */
export function pendingBuildings(state: GameState): Building[] {
  const out: Building[] = [];
  for (const v of viecOf(state)) for (const p of pending(v)) if (p.moi) out.push(p.moi);
  return out;
}

/** Số công trình loại `type` đang chờ: dựng mới, hay đoạn tường đang đổi sang loại ấy. */
export function pendingCount(state: GameState, type: BuildingType): number {
  let n = 0;
  for (const v of viecOf(state)) for (const p of pending(v)) if (p.moi?.type === type || p.doi === type) n++;
  return n;
}

/** Công trình dựng mới đang chờ có id `id`. */
export function pendingBuilding(state: GameState, id: number): Building | undefined {
  for (const v of viecOf(state)) for (const p of pending(v)) if (p.moi?.id === id) return p.moi;
  return undefined;
}

/** Việc đang làm (chưa xong) có công trình `id`: dựng mới, nâng cấp hay đổi loại. */
export function jobOf(state: GameState, id: number): CongViec | undefined {
  return viecOf(state).find((v) => pending(v).some((p) => p.id === id));
}

/** Công trình đã dựng `id` đang có thợ nâng cấp hay đổi loại: không nâng chồng, không dỡ, không ghép. */
export function isBusy(state: GameState, id: number): boolean {
  if (!viecOf(state).length) return false;
  return !!jobOf(state, id);
}

/** Phần việc đang chờ của công trình `id`, nếu có. */
export function pendingOf(state: GameState, id: number): PhanViec | undefined {
  for (const v of viecOf(state)) for (const p of pending(v)) if (p.id === id) return p;
  return undefined;
}

// ---------- Tiến độ ----------

/** Tổng công của việc (ms ở tốc độ 1). */
export const tongCong = (v: CongViec): number => v.o.reduce((n, p) => n + p.ms, 0);

/** Công cần để xong tới hết phần thứ `i` (tính cả phần ấy). */
function upTo(v: CongViec, i: number): number {
  let n = 0;
  for (let k = 0; k <= i && k < v.o.length; k++) n += v.o[k].ms;
  return n;
}

/** Thời gian thật còn lại (ms) tới khi xong cả việc. */
export function conLai(state: GameState, v: CongViec): number {
  return Math.max(0, tongCong(v) - v.lam) / tocDo(state, v.tho);
}

/** Thời gian thật còn lại (ms) tới khi xong phần việc của công trình `id`. */
export function conLaiCua(state: GameState, v: CongViec, id: number): number {
  const i = v.o.findIndex((p) => p.id === id);
  if (i < 0) return 0;
  return Math.max(0, upTo(v, i) - v.lam) / tocDo(state, v.tho);
}

/** Thời gian thật (ms) tới khi có tốp thợ rảnh: việc sớm xong nhất (vô cùng nếu không có việc nào). */
export function thoRanhSau(state: GameState): number {
  let best = Infinity;
  for (const v of viecOf(state)) best = Math.min(best, conLai(state, v));
  return best;
}

/** Phần đã làm của cả việc (0–1). */
export function tienDo(v: CongViec): number {
  const all = tongCong(v);
  return all > 0 ? Math.min(1, v.lam / all) : 1;
}

/** Phần đã làm (0–1) của phần việc chưa xong của công trình `id`, hay null nếu công trình ấy không có việc. */
export function itemProgress(state: GameState, id: number): number | null {
  for (const v of viecOf(state)) {
    let start = 0;
    for (let i = 0; i < v.o.length; i++) {
      const p = v.o[i];
      if (i >= v.xong && p.id === id) return p.ms > 0 ? Math.max(0, Math.min(1, (v.lam - start) / p.ms)) : 1;
      start += p.ms;
    }
  }
  return null;
}

/** Thời gian thật (ms) tới khi một phần việc nào đó xong, hay vô cùng nếu không có việc. */
export function nextXayEvent(state: GameState): number {
  let best = Infinity;
  for (const v of viecOf(state)) {
    if (v.xong >= v.o.length) return 0;
    best = Math.min(best, Math.max(0, upTo(v, v.xong) - v.lam) / tocDo(state, v.tho));
  }
  return best;
}

/** Chừng này công coi như đã đủ (sai số cộng dồn số thực). */
const EPS = 1e-6;

/** Đưa phần việc vừa xong vào kinh đô. */
function finishItem(state: GameState, p: PhanViec): void {
  if (p.moi) {
    const b = p.moi;
    state.buildings.push(b);
    fillWorkers(state, b);
    openBridgehead(state, b);
  } else {
    const b = findBuilding(state, p.id);
    if (b && p.len) {
      b.level = Math.min(b.level + 1, BUILDINGS[b.type].maxLevel);
      fillWorkers(state, b);
    } else if (b && p.doi) {
      b.type = p.doi;
      b.level = 1;
      delete b.uNo;
      delete b.mo;
      delete b.damaged;
      // Đoạn tường mới: máu đầy như vừa dựng, không mang máu đoạn cũ.
      if (state.raid.battle) delete state.raid.battle.hp[b.id];
    }
  }
  if (p.uNo) {
    const b = findBuilding(state, p.id);
    if (b?.type === 'thanh') b.uNo = 'ok';
  }
  state.xay.seq++;
}

/** Đưa các phần việc đã đủ công vào kinh đô, bỏ các việc đã xong hết. */
function settle(state: GameState): void {
  let done = false;
  for (const v of state.xay.viec) {
    while (v.xong < v.o.length && v.lam + EPS >= upTo(v, v.xong)) {
      finishItem(state, v.o[v.xong]);
      v.xong++;
    }
    if (v.xong >= v.o.length) done = true;
  }
  if (done) state.xay.viec = state.xay.viec.filter((v) => v.xong < v.o.length);
}

/** Thời gian trôi `ms` (lúc mở game hay lúc vắng, đủ tốc độ): mỗi tốp làm thêm công theo tốc độ của mình. */
export function advanceXay(state: GameState, ms: number): void {
  if (!viecOf(state).length) return;
  for (const v of state.xay.viec) v.lam = Math.min(tongCong(v), v.lam + ms * tocDo(state, v.tho));
  settle(state);
}

// ---------- Bắt đầu việc ----------

function newJob(state: GameState, tho: number, o: PhanViec[]): CongViec {
  const v: CongViec = { id: state.xay.nextId++, tho, o, xong: 0, lam: 0, hoi: 0 };
  state.xay.viec.push(v);
  // Phần không tốn công (hiếm) xong ngay.
  settle(state);
  return v;
}

/** Dựng `type` ở (x, z) được không: như `canPlace`, thêm phải có tốp thợ rảnh (trừ đường, đồ trang trí xong ngay). */
export function canStartBuild(state: GameState, type: BuildingType, x: number, z: number): Result {
  const check = canPlace(state, type, x, z);
  if (!check.ok) return check;
  if (xayMs(type, 1) > 0 && !thoRanh(state)) return failR('hetTho');
  return okR(undefined);
}

/**
 * Giao một tốp dựng `type` ở (x, z), hướng `rot`: trả của ngay, dân đắp móng ngay, công trình vào kinh đô khi xong.
 * Đắp đè lên đoạn tường (thành đè lũy, cổng thay tường, cống thay đê) thì đoạn cũ đứng tới khi xong. Đường đi, đồ
 * trang trí xong ngay như `place`. Trả về việc mới (hay `null` khi xong ngay).
 */
export function startBuild(state: GameState, type: BuildingType, x: number, z: number, rot = 0): Result<CongViec | null> {
  const ms = xayMs(type, 1);
  if (ms <= 0) {
    const r = place(state, type, x, z, rot);
    return r.ok ? okR(null) : r;
  }
  const check = canStartBuild(state, type, x, z);
  if (!check.ok) return check;
  return okR(newJob(state, thoRanh(state)!.id, [startItem(state, type, x, z, rot, ms)]));
}

/** Trả của và lập phần việc dựng `type` ở (x, z) (đã xét `canPlace`). */
function startItem(state: GameState, type: BuildingType, x: number, z: number, rot: number, ms: number): PhanViec {
  const gia = { ...BUILDINGS[type].buildCost };
  pay(state, gia);
  const over = replacedWall(state, type, x, z);
  if (over) return { id: over.id, doi: type, ms, gia };
  const b = newBuilding(state, type, x, z, rot);
  return { id: b.id, moi: b, ms, gia };
}

/** Nâng công trình `id` được không: như `canUpgrade`, thêm phải có tốp thợ rảnh. */
export function canStartUpgrade(state: GameState, id: number): Result {
  const check = canUpgrade(state, id);
  if (!check.ok) return check;
  const b = findBuilding(state, id)!;
  if (xayMs(b.type, b.level + 1) > 0 && !thoRanh(state)) return failR('hetTho');
  return okR(undefined);
}

/** Giao một tốp nâng công trình `id` lên một cấp: trả của ngay, công trình làm ở cấp cũ tới khi xong. */
export function startUpgrade(state: GameState, id: number): Result<CongViec | null> {
  const check = canStartUpgrade(state, id);
  if (!check.ok) return check;
  const b = findBuilding(state, id)!;
  const ms = xayMs(b.type, b.level + 1);
  if (ms <= 0) {
    const r = upgrade(state, id);
    return r.ok ? okR(null) : r;
  }
  const gia = { ...upgradeCostOf(b)! };
  pay(state, gia);
  return okR(newJob(state, thoRanh(state)!.id, [{ id, len: true, ms, gia }]));
}

/**
 * Giao một tốp đắp cả dải `tiles` loại `type` (kéo dải, khung): xét như `planLine` (cộng dồn giá, số tối đa), ô đắp
 * được thì trả của ngay, tốp đắp lần lượt theo thứ tự, ô nào xong là thành tường ngay. Đường đi, đồ trang trí xong
 * ngay (`placeLine`). Trả việc mới (hay `null`), số ô sẽ đắp và lý do của ô hỏng đầu tiên.
 */
export function startWalls(
  state: GameState,
  type: BuildingType,
  tiles: { x: number; z: number }[],
): { job: CongViec | null; n: number; reason: FailReason | null } {
  const plan = planLine(state, type, tiles);
  let reason: FailReason | null = plan.cells.find((c) => !c.ok)?.reason ?? null;
  const ms = xayMs(type, 1);
  const cells = plan.cells.filter((c) => c.ok && !c.has);
  if (!cells.length) return { job: null, n: 0, reason };
  if (ms <= 0) {
    let n = 0;
    for (const c of cells) {
      const r = place(state, type, c.x, c.z);
      if (r.ok) n++;
      else reason ??= r.reason;
    }
    return { job: null, n, reason };
  }
  const tho = thoRanh(state);
  if (!tho) return { job: null, n: 0, reason: 'hetTho' };
  const o: PhanViec[] = [];
  for (const c of cells) {
    const check = canPlace(state, type, c.x, c.z);
    if (!check.ok) {
      reason ??= check.reason;
      continue;
    }
    o.push(startItem(state, type, c.x, c.z, 0, ms));
  }
  if (!o.length) return { job: null, n: 0, reason };
  return { job: newJob(state, tho.id, o), n: o.length, reason };
}

/**
 * Đoạn tường liền với đoạn `id`: các ô cùng loại, cùng cấp nối nhau theo cạnh, không có thợ đang làm, theo thứ tự lan
 * ra từ đoạn `id` (để nâng cả đoạn liền một lượt).
 */
export function wallComponent(state: GameState, id: number): Building[] {
  const start = findBuilding(state, id);
  if (!start || BUILDINGS[start.type].w !== 1 || !XAY_O_MS[start.type]) return [];
  const at = new Map<number, Building>();
  for (const b of state.buildings) if (b.type === start.type && b.level === start.level) at.set(b.z * GRID + b.x, b);
  const seen = new Set<number>([start.id]);
  const out: Building[] = [start];
  for (let i = 0; i < out.length; i++) {
    const b = out[i];
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = b.x + dx;
      const nz = b.z + dz;
      if (!inGrid(nx, nz)) continue;
      const n = at.get(nz * GRID + nx);
      if (!n || seen.has(n.id) || isBusy(state, n.id)) continue;
      seen.add(n.id);
      out.push(n);
    }
  }
  return out;
}

/**
 * Nâng cả đoạn liền với đoạn tường `id` (lũy lên thành đất, đê lên kè đá) được bao nhiêu đoạn: các đoạn lấy theo thứ
 * tự lan ra, tới khi hết của. Trả số đoạn và giá, hay lý do không nâng được.
 */
export function planWallUpgrade(state: GameState, id: number): Result<{ ids: number[]; cost: Cost; ms: number }> {
  const check = canUpgrade(state, id);
  if (!check.ok && check.reason !== 'thieuTaiNguyen') return check;
  const list = wallComponent(state, id);
  if (!list.length) return failR('khongTimThay');
  const left = { ...state.resources };
  const cost: Cost = {};
  const ids: number[] = [];
  let ms = 0;
  for (const b of list) {
    const c = upgradeCostOf(b);
    if (!c || RESOURCE_IDS.some((r) => (c[r] ?? 0) > left[r])) break;
    for (const r of RESOURCE_IDS) {
      if (!c[r]) continue;
      left[r] -= c[r]!;
      cost[r] = (cost[r] ?? 0) + c[r]!;
    }
    ids.push(b.id);
    ms += xayMs(b.type, b.level + 1);
  }
  if (!ids.length) return failR('thieuTaiNguyen');
  if (!thoRanh(state)) return failR('hetTho');
  return okR({ ids, cost, ms });
}

/** Giao một tốp nâng cả đoạn liền với đoạn tường `id`, phần đủ của (`planWallUpgrade`). */
export function startWallUpgrade(state: GameState, id: number): Result<CongViec> {
  const plan = planWallUpgrade(state, id);
  if (!plan.ok) return plan;
  const o: PhanViec[] = [];
  for (const wid of plan.value.ids) {
    const b = findBuilding(state, wid)!;
    const gia = { ...upgradeCostOf(b)! };
    pay(state, gia);
    o.push({ id: wid, len: true, ms: xayMs(b.type, b.level + 1), gia });
  }
  return okR(newJob(state, thoRanh(state)!.id, o));
}

/**
 * Giao một tốp cả loạt phần việc đã trả của (áp mẫu kinh đô): công trình chờ dựng `moi`, đoạn tường đổi loại `doi`.
 * Không có tốp rảnh thì không giao.
 */
export function startBatch(state: GameState, o: PhanViec[]): Result<CongViec | null> {
  if (!o.length) return okR(null);
  const tho = thoRanh(state);
  if (!tho) return failR('hetTho');
  return okR(newJob(state, tho.id, o));
}

// ---------- Hủy việc ----------

/**
 * Hủy việc `id`: phần chưa xong bỏ đi (công trình chờ dựng không dựng nữa, đoạn tường giữ loại cũ, công trình giữ cấp
 * cũ), hoàn đủ của phần chưa xong. Phần đã xong giữ nguyên. Trả số của đã hoàn.
 */
export function cancelJob(state: GameState, id: number): Result<Cost> {
  const v = state.xay.viec.find((j) => j.id === id);
  if (!v) return failR('khongTimThay');
  const back: Cost = {};
  for (const p of pending(v)) {
    for (const r of RESOURCE_IDS) {
      const n = p.gia[r] ?? 0;
      if (!n) continue;
      state.resources[r] += n;
      back[r] = (back[r] ?? 0) + n;
    }
  }
  state.xay.viec = state.xay.viec.filter((j) => j.id !== id);
  return okR(back);
}

// ---------- Đố sử ----------

/**
 * Trả lời một câu đố sử cho việc `id` (`dung`: đúng hay sai). Mỗi việc `QUIZ_TURNS` lượt; câu đúng bớt một phần
 * `QUIZ_TURNS` tổng công của việc (đúng cả ba là xong ngay), câu sai mất lượt ấy.
 */
export function traLoi(state: GameState, id: number, dung: boolean): Result<CongViec> {
  const v = state.xay.viec.find((j) => j.id === id);
  if (!v) return failR('khongTimThay');
  if (v.hoi >= QUIZ_TURNS) return failR('daHoiDu');
  v.hoi++;
  delete v.cau;
  if (dung) v.lam = Math.min(tongCong(v), v.lam + tongCong(v) / QUIZ_TURNS);
  settle(state);
  return okR(v);
}

/**
 * Hỏi một câu đố sử cho việc `id`: câu đang hỏi dở (`cau`) thì hỏi lại câu ấy, đóng bảng mở lại vẫn là câu cũ; chưa có
 * thì bốc một câu trong `ids` (ngân hàng câu đố ở `text/cauDo.ts`), tránh các câu vừa hỏi gần đây (`daHoi`), rồi ghi
 * vào việc. Hết lượt thì `daHoiDu`.
 */
export function askQuiz(state: GameState, id: number, ids: readonly number[]): Result<number> {
  const v = state.xay.viec.find((j) => j.id === id);
  if (!v) return failR('khongTimThay');
  if (v.hoi >= QUIZ_TURNS) return failR('daHoiDu');
  if (v.cau !== undefined) return okR(v.cau);
  if (!ids.length) return failR('khongTimThay');
  const recent = new Set(state.xay.daHoi);
  const fresh = ids.filter((c) => !recent.has(c));
  const pool = fresh.length ? fresh : ids;
  // Bốc theo hạt giống từ việc, lượt hỏi và đồng hồ chơi: khác nhau giữa các việc, các lượt.
  let h = (v.id * 2654435761 + v.hoi * 40503 + Math.floor(state.clock / 1000) * 97 + state.xay.daHoi.length * 7919) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  h = Math.imul(h, 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  const cau = pool[h % pool.length];
  v.cau = cau;
  nhoCau(state, cau);
  return okR(cau);
}

/** Ghi câu đố vừa hỏi vào danh sách câu gần đây (giữ `DA_HOI_NHO` câu mới nhất). */
export function nhoCau(state: GameState, cau: number): void {
  const list = state.xay.daHoi.filter((c) => c !== cau);
  list.push(cau);
  state.xay.daHoi = list.slice(-DA_HOI_NHO);
}
