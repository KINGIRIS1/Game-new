// Điện 10 điều quân ra đóng đảo (`docs/thiet-ke.md` mục Kế hoạch: Điện 10 điều quân ra đóng đảo). Mỗi bến thuyền khơi
// cấp 3 đóng được một thuyền chiến, chở quân ra đồn đảo của quần đảo bến ấy đánh cá (bến đầu ra Hoàng Sa, bến thứ
// hai ra Trường Sa). Đồn đảo đứng chỗ cố định giữa đảo chính, ba cấp, dựng và nâng như mọi việc xây (`xay.ts`).
//
// Đảo ở ngoài lưới 76×76, nên đồn không vào `state.buildings`: trạng thái đồn, lính đóng, thuyền nằm ở `state.dao`.
// Lính ra đảo rời khỏi `state.troops` (không giữ kinh đô, không ra phó bản), về tới bến thì vào lại. Người chơi đặt số
// lính muốn đóng (`muon`); thuyền tự chạy đủ chuyến, mỗi chuyến chở tối đa `THUYEN_CHIEN.cho` chỗ quân. Chuyến tính
// bằng thời gian còn lại nên lúc vắng thuyền vẫn chạy (`advanceDao` trong `tick` và `applyOffline`).
//
// Giặc đánh đảo (PR 3): từ khi Mã Viện sang, đồn có quân đóng lâu lâu gặp một đợt thủy quân Hán (`advanceGiacDao`
// trong `tick`, không chạy lúc vắng). Trận cầm cự ngoài bãi tự đánh trọn ngay khi giặc tới (`danhDao`); trận ghi đủ
// thứ để dựng lại y hệt (`TranDao`, `setupDao`) cho người chơi xem lại. Thua thì đồn hư (`suaDon`).

import { QUAN_DAO, pathLength, seaIndex, warRoute, type QuanDaoId } from './bien';
import { DAO_GIAC, DEFAULT_ROWS, DON_DAO, REPAIR_FRACTION, RESOURCE_IDS, THUYEN_CHIEN, UNITS, UNIT_TYPES, daoCua, daoForces, daoHpScale, type Cost, type UnitType } from './defs';
import { armySpace, type Army } from './doanhTrai';
import { BATTLE_STEP, canAfford, dienLevel, gain, pay, type Building, type FailReason, type GameState, type Result } from './game';
import { startFieldBattle, stepField, type Battle, type FieldSetup } from './battle';
import { baiOf } from './baiChien';
import { maVienCame } from './chuong5';
import { nuJoined } from './nuTuong';
import { viecOf } from './xay';

/** Một chuyến thuyền chiến: chở bao nhiêu lính, đang ra đảo hay đang về bến, còn bao lâu (ms) thì tới. */
export interface ChuyenThuyen {
  cho: Army;
  ve: boolean;
  con: number;
}

/**
 * Một trận giặc Hán đánh đảo: đủ để dựng lại trận y hệt (đợt, cấp đồn, lính, binh khí, Lê Chân) và kết quả (thắng hay
 * thua, lính mất, của được). `at`: đồng hồ chơi lúc đánh.
 */
export interface TranDao {
  dot: number;
  cap: number;
  linh: Army;
  arms: Army;
  leChan: boolean;
  thang: boolean;
  mat: Army;
  cua: Cost;
  at: number;
}

/** Đồn đảo của một quần đảo. */
export interface DonDao {
  /** Cấp đồn (0 là chưa dựng). */
  cap: number;
  /** Thuyền chiến của bến đánh cá ở quần đảo này đã đóng xong. */
  thuyen: boolean;
  /** Lính đang ở đảo. */
  linh: Army;
  /** Số lính người chơi muốn đóng ở đảo; thuyền chở ra hay chở về cho đủ. */
  muon: Army;
  /** Chuyến thuyền đang đi, hay không có (thuyền neo ở bến). */
  chuyen: ChuyenThuyen | null;
  /** Đồn hư (thua giặc): không giữ biển, không chở thêm lính ra, không có giặc tới tới khi sửa. */
  hu: boolean;
  /** Số đợt giặc đã tới đảo này. */
  dot: number;
  /** Số đợt quân đảo giữ được. */
  thang: number;
  /** Đồng hồ chơi lúc đợt giặc sau tới; null là chưa có lịch (chưa có Mã Viện, chưa có quân, đồn hư). */
  sau: number | null;
  /** Trận gần nhất. */
  tran: TranDao | null;
}

export type DaoState = Record<QuanDaoId, DonDao>;

export const DAO_IDS: readonly QuanDaoId[] = QUAN_DAO.map((q) => q.id);

const zero = (): Army => ({ giao: 0, cung: 0, voi: 0, no: 0 });

function newDon(): DonDao {
  return { cap: 0, thuyen: false, linh: zero(), muon: zero(), chuyen: null, ...giacMoi() };
}

/** Phần giặc đảo của một đồn lúc chưa có đợt nào (bản lưu 28 lên 29 cũng thêm đúng phần này). */
export function giacMoi(): Pick<DonDao, 'hu' | 'dot' | 'thang' | 'sau' | 'tran'> {
  return { hu: false, dot: 0, thang: 0, sau: null, tran: null };
}

export function initialDao(): DaoState {
  return { hoangSa: newDon(), truongSa: newDon() };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isArmy = (v: unknown): boolean => isObj(v) && UNIT_TYPES.every((k) => isNum(v[k]) && (v[k] as number) >= 0);
const isCost = (v: unknown): boolean => isObj(v) && Object.entries(v).every(([k, n]) => (RESOURCE_IDS as readonly string[]).includes(k) && isNum(n) && n >= 0);

function isTranDao(t: unknown): boolean {
  if (!isObj(t)) return false;
  if (!isNum(t.dot) || t.dot < 1 || !isNum(t.cap) || t.cap < 1 || t.cap > DON_DAO.cho.length || !isNum(t.at)) return false;
  return isArmy(t.linh) && isArmy(t.arms) && isArmy(t.mat) && isCost(t.cua) && typeof t.leChan === 'boolean' && typeof t.thang === 'boolean';
}

/** Trạng thái đóng đảo đọc từ bản lưu hợp lệ. */
export function isDaoState(v: unknown): v is DaoState {
  if (!isObj(v)) return false;
  return DAO_IDS.every((id) => {
    const d = v[id];
    if (!isObj(d) || !isNum(d.cap) || d.cap < 0 || d.cap > DON_DAO.cho.length || typeof d.thuyen !== 'boolean') return false;
    if (!isArmy(d.linh) || !isArmy(d.muon)) return false;
    if (typeof d.hu !== 'boolean' || !isNum(d.dot) || d.dot < 0 || !isNum(d.thang) || d.thang < 0 || d.thang > d.dot) return false;
    if (d.sau !== null && !isNum(d.sau)) return false;
    if (d.tran !== null && !isTranDao(d.tran)) return false;
    const c = d.chuyen;
    return c === null || (isObj(c) && isArmy(c.cho) && typeof c.ve === 'boolean' && isNum(c.con) && c.con >= 0);
  });
}

/** Mã phần việc xây đồn đảo trong `xay.ts` (đồn không phải công trình trong lưới nên không có id công trình). */
export const daoJobId = (id: QuanDaoId): number => -1 - DAO_IDS.indexOf(id);
/** Quần đảo của mã phần việc `n`, nếu là mã đồn đảo. */
export const daoOfJob = (n: number): QuanDaoId | null => (n < 0 ? (DAO_IDS[-1 - n] ?? null) : null);

// ---------- Bến, thuyền, đồn ----------

/** Bến thuyền khơi đánh cá ở quần đảo `id` (bến thứ nhất ra Hoàng Sa, thứ hai ra Trường Sa), nếu có. */
export function benOf(state: GameState, id: QuanDaoId): Building | undefined {
  return state.buildings.find((b) => b.type === 'benKhoi' && warRoute(b, seaIndex(state, b)).quanDao === id);
}

/** Quần đảo bến thuyền khơi `b` đánh cá. */
export function daoOfBen(state: GameState, b: Building): QuanDaoId {
  return warRoute(b, seaIndex(state, b)).quanDao;
}

/** Đồn đảo của quần đảo `id`. */
export const donOf = (state: GameState, id: QuanDaoId): DonDao => state.dao[id];

/** Đang có thợ đóng thuyền chiến cho quần đảo `id`. */
export function buildingThuyen(state: GameState, id: QuanDaoId): boolean {
  return viecOf(state).some((v) => v.o.slice(v.xong).some((p) => p.thuyen === id));
}

/** Đang có thợ dựng hay nâng đồn đảo `id`. */
export function buildingDon(state: GameState, id: QuanDaoId): boolean {
  return viecOf(state).some((v) => v.o.slice(v.xong).some((p) => p.dao === id));
}

/**
 * Đóng thuyền chiến cho quần đảo `id` được không (chưa xét tốp thợ rảnh): cần Điện 10, bến thuyền khơi của quần đảo ấy
 * ở cấp 3, chưa có thuyền, không đang đóng, đủ của.
 */
export function canThuyen(state: GameState, id: QuanDaoId): Result {
  if (dienLevel(state) < DON_DAO.minDien) return fail('chuaDuCapDien');
  const ben = benOf(state, id);
  if (!ben) return fail('canBenKhoi');
  if (ben.level < DON_DAO.benCap) return fail('canBenKhoi3');
  if (state.dao[id].thuyen || buildingThuyen(state, id)) return fail('daCoThuyen');
  if (!canAfford(state, THUYEN_CHIEN.cost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/** Giá dựng (đồn chưa có) hay nâng đồn đảo `id` lên cấp sau; đồn đã cấp cao nhất thì không có. */
export function donCost(state: GameState, id: QuanDaoId): Cost | null {
  return DON_DAO.cost[state.dao[id].cap] ?? null;
}

/** Công xây đồn đảo `id` lên cấp sau (ms ở tốc độ 1). */
export const donMs = (state: GameState, id: QuanDaoId): number => DON_DAO.xayMs[state.dao[id].cap] ?? 0;

/**
 * Dựng hay nâng đồn đảo `id` được không (chưa xét tốp thợ rảnh): cần Điện 10, thuyền chiến của quần đảo ấy (thợ đi
 * thuyền ra đảo), chưa cấp cao nhất, không đang xây, đủ của.
 */
export function canDon(state: GameState, id: QuanDaoId): Result {
  if (dienLevel(state) < DON_DAO.minDien) return fail('chuaDuCapDien');
  if (state.dao[id].hu) return fail('donDaoHu');
  const cost = donCost(state, id);
  if (!cost) return fail('capToiDa');
  if (!state.dao[id].thuyen) return fail('canThuyenChien');
  if (buildingDon(state, id)) return fail('dangXay');
  if (!canAfford(state, cost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/** Phần việc đồn đảo `id` vừa xong: đồn lên một cấp. */
export function finishDon(state: GameState, id: QuanDaoId): void {
  const d = state.dao[id];
  d.cap = Math.min(d.cap + 1, DON_DAO.cho.length);
}

/** Phần việc thuyền chiến của quần đảo `id` vừa xong. */
export function finishThuyen(state: GameState, id: QuanDaoId): void {
  state.dao[id].thuyen = true;
}

// ---------- Lính đóng ----------

/** Chỗ quân lính đóng tối đa của đồn đảo `id` (0 khi chưa dựng). */
export const donCho = (state: GameState, id: QuanDaoId): number => DON_DAO.cho[state.dao[id].cap - 1] ?? 0;

/** Lính đang ra đảo `id` trên thuyền (chưa tới đảo). */
export function outbound(d: DonDao): Army {
  return d.chuyen && !d.chuyen.ve ? { ...d.chuyen.cho } : zero();
}

/** Lính không ở kinh đô: ở hai đảo và trên thuyền (đi hay về). Vẫn ăn gạo như mọi lính. */
export function daoArmy(state: GameState): Army {
  const out = zero();
  for (const id of DAO_IDS) {
    const d = state.dao[id];
    for (const k of UNIT_TYPES) out[k] += d.linh[k] + (d.chuyen?.cho[k] ?? 0);
  }
  return out;
}

/**
 * Đặt số lính `kind` muốn đóng ở đảo `id`: không quá chỗ của đồn (tính cả các binh chủng khác), không quá số lính
 * đang ở đảo, đang ra đảo và còn ở kinh đô. Thuyền rảnh thì đi ngay. Trả số đã đặt.
 */
export function setDaoLinh(state: GameState, id: QuanDaoId, kind: UnitType, n: number): Result<number> {
  const d = state.dao[id];
  if (d.cap < 1) return fail('canDonDao');
  if (!d.thuyen) return fail('canThuyenChien');
  const others = armySpace({ ...d.muon, [kind]: 0 });
  const room = Math.floor(Math.max(0, donCho(state, id) - others) / UNITS[kind].space);
  const have = d.linh[kind] + outbound(d)[kind] + state.troops[kind];
  const v = Math.max(0, Math.min(Math.round(n), room, have));
  d.muon[kind] = v;
  dispatch(state, id);
  return ok(v);
}

/** Lấy từ `pool` tối đa `cap` chỗ quân, giữ thứ tự binh chủng (giáo, cung, voi, nỏ). */
function take(pool: Army, cap: number): Army {
  const out = zero();
  let room = cap;
  for (const k of UNIT_TYPES) {
    const n = Math.min(pool[k], Math.floor(room / UNITS[k].space));
    out[k] = Math.max(0, n);
    room -= out[k] * UNITS[k].space;
  }
  return out;
}

const empty = (a: Army): boolean => UNIT_TYPES.every((k) => a[k] <= 0);

/** Một lượt đi (ms chơi) của thuyền chiến quần đảo `id`: theo đường thuyền khơi rồi vào bến ván đồn. */
export function tripMs(state: GameState, id: QuanDaoId): number {
  const ben = benOf(state, id);
  const path = ben ? warRoute(ben, seaIndex(state, ben)).path : warRoute({ x: 0, z: 0, type: 'benKhoi' }, DAO_IDS.indexOf(id)).path;
  return Math.round((pathLength(path) / THUYEN_CHIEN.toc) * 1000);
}

/**
 * Thuyền chiến đảo `id` đang neo ở bến thì xét xem có phải đi không: thiếu lính so với số muốn đóng thì chở ra (lấy
 * lính ở kinh đô), thừa thì đi không ra đảo để chở về. Không đi khi bến hư, hay khi đang có trận (`busy`: lính đang ở
 * trận giữ kinh đô, phó bản, Đấu thành không được rời kinh đô giữa chừng).
 */
function dispatch(state: GameState, id: QuanDaoId, busy = false): void {
  const d = state.dao[id];
  if (d.chuyen || !d.thuyen || d.cap < 1 || d.hu) return;
  if (busy || state.raid.phase === 'battle' || state.campaign.battle) return;
  const ben = benOf(state, id);
  if (!ben || ben.damaged) return;
  const need = zero();
  const excess = zero();
  for (const k of UNIT_TYPES) {
    need[k] = Math.min(Math.max(0, d.muon[k] - d.linh[k]), state.troops[k]);
    excess[k] = Math.max(0, d.linh[k] - d.muon[k]);
  }
  const cho = take(need, THUYEN_CHIEN.cho);
  if (empty(cho) && empty(excess)) return;
  for (const k of UNIT_TYPES) state.troops[k] -= cho[k];
  d.chuyen = { cho, ve: false, con: tripMs(state, id) };
}

/** Thuyền chiến đảo `id` vừa tới nơi: tới đảo thì đổ quân, chở lính thừa về; về tới bến thì lính vào doanh trại. */
function arrive(state: GameState, id: QuanDaoId): void {
  const d = state.dao[id];
  const c = d.chuyen!;
  if (!c.ve) {
    for (const k of UNIT_TYPES) d.linh[k] += c.cho[k];
    const excess = zero();
    for (const k of UNIT_TYPES) excess[k] = Math.max(0, d.linh[k] - d.muon[k]);
    const back = take(excess, THUYEN_CHIEN.cho);
    for (const k of UNIT_TYPES) d.linh[k] -= back[k];
    d.chuyen = { cho: back, ve: true, con: tripMs(state, id) };
  } else {
    for (const k of UNIT_TYPES) state.troops[k] += c.cho[k];
    d.chuyen = null;
  }
}

/**
 * Thời gian trôi `ms` (lúc chơi hay lúc vắng): thuyền chiến chạy, tới nơi thì đổ quân, rồi đi chuyến sau nếu còn phải
 * chở. `busy`: đang có trận nên thuyền neo ở bến không rời đi.
 */
export function advanceDao(state: GameState, ms: number, busy = false): void {
  for (const id of DAO_IDS) {
    let left = ms;
    // Mỗi vòng xong một lượt đi; chặn trên cho chắc.
    for (let guard = 0; guard < 1000; guard++) {
      dispatch(state, id, busy);
      const c = state.dao[id].chuyen;
      if (!c) break;
      if (c.con > left) {
        c.con -= left;
        break;
      }
      left -= c.con;
      arrive(state, id);
    }
  }
}

// ---------- Giữ biển ----------

/** Cấp đồn đảo `id` đang giữ biển (đồn còn nguyên, đủ `DON_DAO.giuCho` chỗ quân đóng), không thì 0. */
export function giuBien(state: GameState, id: QuanDaoId): number {
  const d = state.dao[id];
  if (d.cap < 1 || d.hu || armySpace(d.linh) < DON_DAO.giuCho) return 0;
  return d.cap;
}

/** Thuyền khơi của bến `b` làm ra thêm chừng này phần vỏ ốc và cá: ngư trường có đồn đảo giữ biển. */
export function nguTruongBonus(state: GameState, b: Building): number {
  if (b.type !== 'benKhoi' || !state.dao) return 0;
  const cap = giuBien(state, daoOfBen(state, b));
  return cap ? DON_DAO.nguTruong[cap - 1] : 0;
}

/** Có đồn đảo giữ biển đốt lửa hiệu: đợt thủy quân Hán đánh kinh đô được báo sớm (`DON_DAO.baoSom`). */
export function luaHieu(state: GameState): boolean {
  return !!state.dao && DAO_IDS.some((id) => giuBien(state, id) > 0);
}

/** Phần máu mỗi lâu thuyền đã mất khi vào tới sông: quân các đồn đảo giữ biển chặn đánh ngoài khơi. */
export function chanThuyen(state: GameState): number {
  if (!state.dao) return 0;
  let n = 0;
  for (const id of DAO_IDS) {
    const cap = giuBien(state, id);
    if (cap) n += DON_DAO.chan[cap - 1];
  }
  return Math.min(DON_DAO.chanMax, n);
}

/** Quần đảo có đồn giữ biển (để dòng báo ghi tên). */
export const daoGiuBien = (state: GameState): QuanDaoId[] => (state.dao ? DAO_IDS.filter((id) => giuBien(state, id) > 0) : []);

/** Lê Chân đã theo về: lính đóng đảo mọi binh chủng được cộng như binh chủng của nữ tướng. */
export const leChanDoc = (state: GameState): boolean => nuJoined(state, 'leChan');

// ---------- Giặc đánh đảo ----------

/** Đảo `id` có giặc tới không: Mã Viện đã sang, đồn còn nguyên và có lính trên đảo. */
export function giacToi(state: GameState, id: QuanDaoId): boolean {
  const d = state.dao[id];
  return maVienCame(state) && d.cap >= 1 && !d.hu && armySpace(d.linh) > 0;
}

/** Đồng hồ giặc đảo đứng: đang có trận (phó bản, giữ kinh đô, Đấu thành hay đang xem lại trận đảo: `busy`). */
const dungGiac = (state: GameState, busy: boolean): boolean => busy || !!state.campaign.battle || state.raid.phase === 'battle';

/** Đợt sau của đảo `id` cách đợt đã định của đảo kia ít nhất `DAO_GIAC.soLeMs`: gần quá thì lùi lại. */
function soLe(state: GameState, id: QuanDaoId): void {
  const d = state.dao[id];
  for (const o of DAO_IDS) {
    const other = state.dao[o].sau;
    if (o === id || other === null || d.sau === null) continue;
    if (Math.abs(d.sau - other) < DAO_GIAC.soLeMs) d.sau = other + DAO_GIAC.soLeMs;
  }
}

/**
 * Thời gian chơi trôi `ms` (chỉ lúc chơi; lúc vắng không có giặc đánh đảo): đảo có giặc tới mà chưa có lịch thì đợt
 * đầu tới sau `DAO_GIAC.dauMs`; đang có trận thì đồng hồ giặc đảo đứng; tới giờ thì đánh trọn trận (`danhDao`).
 */
export function advanceGiacDao(state: GameState, ms: number, busy = false): void {
  const dung = dungGiac(state, busy);
  for (const id of DAO_IDS) {
    const d = state.dao[id];
    if (!giacToi(state, id)) {
      d.sau = null;
      continue;
    }
    if (d.sau === null) {
      d.sau = state.clock + DAO_GIAC.dauMs;
      soLe(state, id);
    }
    if (dung) d.sau += ms;
    else if (state.clock >= d.sau) danhDao(state, id);
  }
}

/** Giặc sắp tới đảo `id`: còn không quá `DAO_GIAC.baoMs` (đếm ngược ở dòng tin, bảng quần đảo; lửa hiệu cháy). */
export function baoDao(state: GameState, id: QuanDaoId): number | null {
  const d = state.dao[id];
  if (d.sau === null || !giacToi(state, id)) return null;
  const con = d.sau - state.clock;
  return con <= DAO_GIAC.baoMs ? Math.max(0, con) : null;
}

/** Mã trận của một trận đảo (hạt giống): theo quần đảo và đợt. */
const tranId = (id: QuanDaoId, dot: number): number => (DAO_IDS.indexOf(id) + 1) * 1000 + dot;

/**
 * Trận đảo `id` dựng từ `t` (đợt, cấp đồn, lính, binh khí, Lê Chân): cầm cự `DAO_GIAC.holdS` giây trên nền `dao`,
 * không có tướng, lính được cộng theo cấp đồn (`DON_DAO.them`), không huân công. Cùng `t` thì trận ra y hệt.
 */
export function setupDao(id: QuanDaoId, t: Pick<TranDao, 'dot' | 'cap' | 'linh' | 'arms' | 'leChan'>): FieldSetup {
  const f = daoForces(t.dot);
  return {
    id: tranId(id, t.dot),
    stage: 0,
    enemies: f.enemies,
    waves: f.waves,
    holdS: DAO_GIAC.holdS,
    hpScale: daoHpScale(t.dot),
    army: { ...t.linh },
    rows: DEFAULT_ROWS,
    hero: null,
    bonus: DON_DAO.them[t.cap - 1] ?? 0,
    arms: { ...t.arms },
    nuMoi: t.leChan,
    dao: id,
    bai: baiOf('dao', 5),
  };
}

/** Dựng trận đảo từ `setup` rồi cho chạy trọn (tất định, bước `BATTLE_STEP` như mọi trận). */
export function chayTranDao(setup: FieldSetup): Battle {
  const b = startFieldBattle(setup);
  while (!stepField(b, BATTLE_STEP));
  return b;
}

/**
 * Giặc tới đảo `id`: đánh trọn trận cầm cự với lính đang đóng. Lính tử trận mất hẳn. Giữ được thì được của trên thuyền
 * giặc (`daoCua`); thua thì đồn hư. Đợt sau tới sau `DAO_GIAC.cachMs` nếu đảo còn có giặc tới. Trả trận vừa đánh.
 */
export function danhDao(state: GameState, id: QuanDaoId): TranDao {
  const d = state.dao[id];
  const dot = d.dot + 1;
  const t: TranDao = { dot, cap: d.cap, linh: { ...d.linh }, arms: { ...state.arms }, leChan: leChanDoc(state), thang: false, mat: zero(), cua: {}, at: state.clock };
  const b = chayTranDao(setupDao(id, t));
  t.thang = b.outcome === 'win';
  for (const k of UNIT_TYPES) {
    t.mat[k] = t.thang ? Math.min(d.linh[k], b.lost[k]) : d.linh[k];
    d.linh[k] -= t.mat[k];
  }
  if (t.thang) {
    t.cua = daoCua(dot);
    gain(state, t.cua);
    d.thang += 1;
  } else d.hu = true;
  d.dot = dot;
  d.tran = t;
  d.sau = giacToi(state, id) ? state.clock + DAO_GIAC.cachMs : null;
  soLe(state, id);
  return t;
}

/** Giá sửa đồn đảo `id` đã hư: `REPAIR_FRACTION` giá dựng hay nâng lên cấp đang có, như mọi công trình. */
export function suaDonCost(state: GameState, id: QuanDaoId): Cost {
  const base = DON_DAO.cost[state.dao[id].cap - 1] ?? {};
  const cost: Cost = {};
  for (const r of RESOURCE_IDS) if (base[r]) cost[r] = Math.max(5, Math.round((base[r]! * REPAIR_FRACTION) / 5) * 5);
  return cost;
}

/** Sửa đồn đảo `id` đã hư: trả của, đồn còn nguyên lại; thuyền chở tiếp lính ra cho đủ số muốn đóng. */
export function suaDon(state: GameState, id: QuanDaoId): Result<undefined> {
  const d = state.dao[id];
  if (!d.hu) return fail('khongHuHong');
  const cost = suaDonCost(state, id);
  if (!canAfford(state, cost)) return fail('thieuTaiNguyen');
  pay(state, cost);
  d.hu = false;
  dispatch(state, id);
  return ok(undefined);
}

/** Số đợt giặc quân hai đảo đã giữ được (nhiệm vụ 67). */
export const daoGiuDuoc = (state: GameState): number => (state.dao ? DAO_IDS.reduce((n, id) => n + state.dao[id].thang, 0) : 0);

/** Đảo `id` mở chưa: Điện 10 và có bến thuyền khơi đánh cá ở quần đảo ấy. */
export function daoMo(state: GameState, id: QuanDaoId): boolean {
  return dienLevel(state) >= DON_DAO.minDien && !!benOf(state, id);
}

// ---------- Lạc hầu gợi ý ----------

export type DaoHint = 'mo' | 'maVien';
const hintKey = (k: DaoHint) => `dao:${k}`;

/**
 * Lời Lạc hầu về đóng đảo chưa nói (mỗi lời một lần, ghi vào `hinted`): `mo` khi có bến thuyền khơi cấp 3 ở Điện 10
 * (xin đóng thuyền chiến, đưa quân ra giữ đảo); `maVien` khi Mã Viện sang mà đã đóng được quân ra đảo (đồn đảo chặn
 * được lâu thuyền Hán theo đường biển xuống).
 */
export function nextDaoHint(s: GameState): DaoHint | null {
  if (!s.hinted.includes(hintKey('mo')) && DAO_IDS.some((id) => daoMo(s, id) && benOf(s, id)!.level >= DON_DAO.benCap)) return 'mo';
  if (!s.hinted.includes(hintKey('maVien')) && maVienCame(s) && DAO_IDS.some((id) => s.dao[id].cap > 0)) return 'maVien';
  return null;
}

export function markDaoHinted(s: GameState, k: DaoHint): void {
  if (!s.hinted.includes(hintKey(k))) s.hinted = [...s.hinted, hintKey(k)];
}

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function fail(reason: FailReason): Result<never> {
  return { ok: false, reason };
}
