// Doanh trại: nơi các tướng ở và điều binh. Mỗi doanh trại một tướng chỉ huy, có tướng mới giữ chỗ quân, nên càng
// nhiều tướng càng nhiều doanh trại, càng nhiều quân dự trữ. Ra phó bản mang tối đa `FIELD_CAP` chỗ. Giữ kinh đô thì
// người chơi tự bố trí lính ở từng doanh trại (cả kinh đô tối đa `GUARD_CAP` chỗ); chưa bố trí thì tự động.

import { advJoined } from './coLoa';
import { BUILDINGS, FIELD_CAP, GUARD_CAP, TUONG_IDS, UNITS, UNIT_TYPES, type TuongId, type UnitType } from './defs';
import { dienLevel, type Building, type FailReason, type GameState, type Result } from './game';
import { giongReady } from './giong';
import { sonJoined } from './son';

export type Army = Record<UnitType, number>;

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });
const zero = (): Army => ({ giao: 0, cung: 0, voi: 0, no: 0 });

/** Số chỗ một đạo quân chiếm (voi chiến chiếm nhiều chỗ). */
export const armySpace = (army: Army): number => UNIT_TYPES.reduce((n, k) => n + (army[k] ?? 0) * UNITS[k].space, 0);

// ---------- Tướng chỉ huy ----------

/** Tướng đã về với kinh đô, giao chỉ huy doanh trại được. Gióng về trời, Sơn Tinh về núi rồi vẫn chỉ huy (hiển linh). */
export function tuongJoined(s: GameState, id: TuongId): boolean {
  if (id === 'giong') return giongReady(s);
  if (id === 'sonTinh') return sonJoined(s);
  if (id === 'anDuong') return advJoined(s);
  return true;
}

/** Các tướng đã có, theo thứ tự Lạc tướng, Gióng, Sơn Tinh, An Dương Vương. */
export const generals = (s: GameState): TuongId[] => TUONG_IDS.filter((t) => tuongJoined(s, t));

/** Các doanh trại theo thứ tự dựng. */
export const barracksList = (s: GameState): Building[] => s.buildings.filter((b) => b.type === 'doanhTrai').sort((a, b) => a.id - b.id);

/**
 * Tướng chỉ huy từng doanh trại (theo mã công trình). Tướng người chơi đã giao giữ nguyên; doanh trại chưa giao thì
 * tướng rảnh nhận theo thứ tự dựng. Thiếu tướng thì doanh trại ấy không có ai chỉ huy.
 */
export function commanders(s: GameState): Map<number, TuongId> {
  const list = barracksList(s);
  const map = new Map<number, TuongId>();
  const used = new Set<TuongId>();
  for (const b of list) {
    if (b.tuong && tuongJoined(s, b.tuong) && !used.has(b.tuong)) {
      map.set(b.id, b.tuong);
      used.add(b.tuong);
    }
  }
  const free = generals(s).filter((t) => !used.has(t));
  for (const b of list) if (!map.has(b.id) && free.length) map.set(b.id, free.shift()!);
  return map;
}

export const commanderOf = (s: GameState, b: Building): TuongId | null => commanders(s).get(b.id) ?? null;

/** Doanh trại tướng này chỉ huy, nếu có. */
export function postOf(s: GameState, tuong: TuongId): Building | undefined {
  for (const [id, t] of commanders(s)) if (t === tuong) return s.buildings.find((b) => b.id === id);
  return undefined;
}

/** Chỗ quân doanh trại này giữ: theo cấp, khi có tướng chỉ huy. */
export function capOf(s: GameState, b: Building): number {
  if (b.type !== 'doanhTrai' || !commanderOf(s, b)) return 0;
  return BUILDINGS.doanhTrai.troopCap![b.level - 1] ?? 0;
}

/** Kiểm tra giao tướng `tuong` chỉ huy doanh trại `id` được không. */
export function canAssign(s: GameState, id: number, tuong: TuongId): Result {
  const b = s.buildings.find((x) => x.id === id);
  if (!b || b.type !== 'doanhTrai') return fail('khongTimThay');
  if (!tuongJoined(s, tuong)) return fail('tuongChuaCo');
  if (commanderOf(s, b) === tuong) return fail('daChiHuy');
  if (s.raid.phase === 'battle') return fail('dangCoGiac');
  return ok(undefined);
}

/**
 * Giao tướng chỉ huy doanh trại `id`. Tướng ấy đang chỉ huy doanh trại khác thì hai tướng đổi chỗ cho nhau, để không
 * doanh trại nào mất tướng. Mọi doanh trại ghi lại tướng đang chỉ huy để thứ tự không tự đổi về sau.
 */
export function assignCommander(s: GameState, id: number, tuong: TuongId): Result<TuongId> {
  const check = canAssign(s, id, tuong);
  if (!check.ok) return check;
  const map = commanders(s);
  const prev = map.get(id);
  for (const [other, t] of map) if (t === tuong) prev ? map.set(other, prev) : map.delete(other);
  map.set(id, tuong);
  for (const b of barracksList(s)) {
    const t = map.get(b.id);
    if (t) b.tuong = t;
    else delete b.tuong;
  }
  return ok(tuong);
}

/** Doanh trại tướng ra trận cùng quân khi giữ kinh đô: trại tướng ấy chỉ huy, không thì trại của Lạc tướng. */
export function heroPost(s: GameState, tuong: TuongId): Building | undefined {
  return postOf(s, tuong) ?? postOf(s, 'lacTuong') ?? barracksList(s)[0];
}

// ---------- Giới hạn quân ra trận ----------

/** Số chỗ quân mang ra một trận phó bản. */
export const fieldCap = (s: GameState): number => FIELD_CAP[dienLevel(s) - 1] ?? 0;
/** Số chỗ quân bố trí giữ kinh đô được, cả kinh đô. */
export const guardCap = (s: GameState): number => GUARD_CAP[dienLevel(s) - 1] ?? 0;

/** Chọn bớt quân cho vừa `cap` chỗ, giữ tỉ lệ các binh chủng. Vừa sẵn thì lấy hết. */
export function fitArmy(troops: Army, cap: number): Army {
  const total = armySpace(troops);
  if (total <= cap) return { ...troops };
  const share = (k: UnitType) => (troops[k] * cap) / total;
  const out = zero();
  for (const k of UNIT_TYPES) out[k] = Math.floor(share(k));
  // Còn chỗ thì thêm từng người, binh chủng nào thiếu phần nhiều nhất trước.
  for (;;) {
    const room = cap - armySpace(out);
    const next = UNIT_TYPES.filter((k) => out[k] < troops[k] && UNITS[k].space <= room).sort((a, b) => share(b) - out[b] - (share(a) - out[a]))[0];
    if (!next) return out;
    out[next] += 1;
  }
}

// ---------- Bố trí giữ kinh đô ----------

/** Người chơi đã tự bố trí (ít nhất một doanh trại có bố trí). Chưa thì bố trí tự động. */
export const guardManual = (s: GameState): boolean => barracksList(s).some((b) => !!b.guard);

/**
 * Bố trí tự động: mọi lính giữ kinh đô cho tới đủ chỗ, giữ tỉ lệ binh chủng; chia ra các doanh trại theo sức chứa,
 * mỗi trại có đủ các binh chủng.
 */
function autoPlan(s: GameState): Map<number, Army> {
  const plan = new Map<number, Army>();
  const list = barracksList(s);
  if (!list.length) return plan;
  const army = fitArmy(s.troops, guardCap(s));
  const caps = list.map((b) => capOf(s, b));
  const weight = caps.some((c) => c > 0) ? caps : list.map(() => 1);
  const load = list.map(() => 0);
  for (const b of list) plan.set(b.id, zero());
  // Xếp lính các binh chủng xen nhau rồi cho từng người vào trại còn vơi nhất (so với sức chứa).
  const queue: { k: UnitType; at: number }[] = [];
  for (const k of UNIT_TYPES) for (let i = 0; i < army[k]; i++) queue.push({ k, at: (i + 0.5) / army[k] });
  queue.sort((a, b) => a.at - b.at || UNIT_TYPES.indexOf(a.k) - UNIT_TYPES.indexOf(b.k));
  for (const { k } of queue) {
    const space = UNITS[k].space;
    let best = -1;
    for (let i = 0; i < list.length; i++) {
      if (!weight[i]) continue;
      if (best < 0 || (load[i] + space) / weight[i] < (load[best] + space) / weight[best] - 1e-9) best = i;
    }
    load[best] += space;
    plan.get(list[best].id)![k] += 1;
  }
  return plan;
}

/** Số lính người chơi muốn bố trí ở từng doanh trại (bố trí tự động thì chính là phần tự động). */
export function guardTargets(s: GameState): Map<number, Army> {
  if (!guardManual(s)) return autoPlan(s);
  const out = new Map<number, Army>();
  for (const b of barracksList(s)) out.set(b.id, { ...zero(), ...b.guard });
  return out;
}

/**
 * Lính thật sự ra giữ kinh đô ở từng doanh trại. Tự bố trí thì lấy theo bố trí, thiếu lính (đã chết, chưa luyện bù)
 * thì doanh trại dựng trước được lính trước; lính chết được quân dự trữ bù vào ngay. Không quá số chỗ giữ kinh đô.
 */
export function guardPlan(s: GameState): Map<number, Army> {
  if (!guardManual(s)) return autoPlan(s);
  const left = { ...s.troops };
  let room = guardCap(s);
  const plan = new Map<number, Army>();
  for (const b of barracksList(s)) {
    const want = b.guard ?? zero();
    const got = zero();
    for (const k of UNIT_TYPES) {
      const n = Math.max(0, Math.min(want[k] ?? 0, left[k], Math.floor(room / UNITS[k].space)));
      got[k] = n;
      left[k] -= n;
      room -= n * UNITS[k].space;
    }
    plan.set(b.id, got);
  }
  return plan;
}

/** Tổng lính giữ kinh đô (cả kinh đô). */
export function guardTotal(s: GameState, plan = guardPlan(s)): Army {
  const out = zero();
  for (const g of plan.values()) for (const k of UNIT_TYPES) out[k] += g[k];
  return out;
}

/** Quân dự trữ: lính không bố trí giữ kinh đô. */
export function reserve(s: GameState): Army {
  const used = guardTotal(s);
  const out = zero();
  for (const k of UNIT_TYPES) out[k] = Math.max(0, s.troops[k] - used[k]);
  return out;
}

/** Kiểm tra thêm (`delta` = 1) hay bớt (`delta` = −1) một lính binh chủng `kind` giữ kinh đô ở doanh trại `id`. */
export function canGuard(s: GameState, id: number, kind: UnitType, delta: 1 | -1): Result {
  const b = s.buildings.find((x) => x.id === id);
  if (!b || b.type !== 'doanhTrai') return fail('khongTimThay');
  if (s.raid.phase === 'battle') return fail('dangCoGiac');
  const targets = guardTargets(s);
  const here = targets.get(id) ?? zero();
  if (delta < 0) return here[kind] > 0 ? ok(undefined) : fail('khongDuQuan');
  let total = 0;
  let wanted = 0;
  for (const g of targets.values()) {
    total += armySpace(g);
    wanted += g[kind];
  }
  if (wanted >= s.troops[kind]) return fail('khongDuQuan');
  if (armySpace(here) + UNITS[kind].space > capOf(s, b)) return fail('traiDay');
  if (total + UNITS[kind].space > guardCap(s)) return fail('quaChoGiuThanh');
  return ok(undefined);
}

/** Thêm hay bớt một lính giữ kinh đô ở doanh trại `id`. Đang bố trí tự động thì giữ nguyên bố trí ấy rồi mới đổi. */
export function setGuard(s: GameState, id: number, kind: UnitType, delta: 1 | -1): Result<number> {
  const check = canGuard(s, id, kind, delta);
  if (!check.ok) return check;
  const targets = guardTargets(s);
  for (const b of barracksList(s)) b.guard = { ...(targets.get(b.id) ?? zero()) };
  const b = s.buildings.find((x) => x.id === id)!;
  b.guard![kind] += delta;
  return ok(b.guard![kind]);
}

/** Bỏ bố trí riêng, quay về bố trí tự động. */
export function autoGuard(s: GameState): void {
  for (const b of barracksList(s)) delete b.guard;
}
