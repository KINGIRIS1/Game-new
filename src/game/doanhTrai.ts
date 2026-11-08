// Doanh trại (đại doanh): một trại cho cả kinh đô, nơi các tướng ở và điều binh. Mỗi tướng đã về là một doanh trong
// trại, thêm chỗ quân theo cấp trại, tối đa `DOANH_MAX` doanh. Ra phó bản mang tối đa `FIELD_CAP` chỗ. Giữ kinh đô
// thì người chơi tự bố trí số lính mỗi binh chủng (cả kinh đô tối đa `GUARD_CAP` chỗ); chưa bố trí thì tự động.
// Lính và tướng giữ kinh đô ra từ cổng trại gần giặc nhất (`gates`, `gateToward`).

import { caoLoJoined } from './caoLo';
import { inChapter5 } from './chuong5';
import { advJoined } from './coLoa';
import { BUILDINGS, DOANH_MAX, FIELD_CAP, GUARD_CAP, TUONG_IDS, UNITS, UNIT_TYPES, type TuongId, type UnitType } from './defs';
import { dienLevel, type Building, type FailReason, type GameState, type Result } from './game';
import { giongReady } from './giong';
import { turnLocal } from './map';
import { sonJoined } from './son';

export type Army = Record<UnitType, number>;

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });
const zero = (): Army => ({ giao: 0, cung: 0, voi: 0, no: 0 });

/** Số chỗ một đạo quân chiếm (voi chiến chiếm nhiều chỗ). */
export const armySpace = (army: Army): number => UNIT_TYPES.reduce((n, k) => n + (army[k] ?? 0) * UNITS[k].space, 0);

// ---------- Tướng và doanh ----------

/**
 * Tướng đã về với kinh đô, ở doanh trại. Gióng về trời, Sơn Tinh về núi, An Dương Vương xuống biển rồi vẫn tính
 * (hiển linh).
 */
export function tuongJoined(s: GameState, id: TuongId): boolean {
  if (id === 'giong') return giongReady(s);
  if (id === 'sonTinh') return sonJoined(s);
  if (id === 'anDuong') return advJoined(s);
  if (id === 'caoLo') return caoLoJoined(s);
  if (id === 'trungTrac' || id === 'trungNhi') return inChapter5(s);
  return true;
}

/** Các tướng đã có, theo thứ tự Lạc tướng, Gióng, Sơn Tinh, An Dương Vương, Cao Lỗ, Trưng Trắc, Trưng Nhị. */
export const generals = (s: GameState): TuongId[] => TUONG_IDS.filter((t) => tuongJoined(s, t));

/** Doanh trại của kinh đô (chỉ dựng được một), nếu đã có. */
export const barracksOf = (s: GameState): Building | undefined => s.buildings.find((b) => b.type === 'doanhTrai');

/** Số doanh trong trại: mỗi tướng đã về một doanh, tối đa `DOANH_MAX`. */
export const doanhCount = (s: GameState): number => Math.min(generals(s).length, DOANH_MAX);

/** Chỗ quân doanh trại này giữ: chỗ mỗi doanh theo cấp trại nhân số doanh. */
export function capOf(s: GameState, b: Building): number {
  if (b.type !== 'doanhTrai') return 0;
  return (BUILDINGS.doanhTrai.troopCap![b.level - 1] ?? 0) * doanhCount(s);
}

/** Doanh trại tướng ra trận cùng quân khi giữ kinh đô. Chưa có doanh trại thì tướng ra từ trước Điện. */
export const heroPost = (s: GameState): Building | undefined => barracksOf(s);

// ---------- Cổng trại ----------

/** Cấp doanh trại có đủ bốn lầu cổng; dưới cấp này chỉ có cổng trước. */
export const GATES_LEVEL = 3;
/** Chỗ cổng lùi vào trong mép móng chừng này ô. */
export const GATE_IN = 0.4;

/**
 * Chỗ ngay trong từng cổng của doanh trại `b` (tọa độ ô liên tục), theo hướng xoay: cổng trước, rồi (từ cấp
 * `GATES_LEVEL`) cổng sau, trái, phải. `out` là hướng ra ngoài của cổng (vector đơn vị theo trục). Lấy chỗ trong cổng
 * (còn trên móng trại) cho khỏi rơi xuống sông hay vào công trình bên cạnh khi trại sát sông, sát nhà khác.
 */
export function gates(b: Building): { x: number; z: number; out: { x: number; z: number } }[] {
  const def = BUILDINGS[b.type];
  const cx = b.x + def.w / 2;
  const cz = b.z + def.d / 2;
  const sides: [number, number][] = b.level >= GATES_LEVEL ? [[0, 1], [0, -1], [-1, 0], [1, 0]] : [[0, 1]];
  return sides.map(([sx, sz]) => {
    const out = turnLocal(b.rot, sx, sz);
    const at = turnLocal(b.rot, sx * (def.w / 2 - GATE_IN), sz * (def.d / 2 - GATE_IN));
    return { x: cx + at.x, z: cz + at.z, out };
  });
}

/** Cổng gần điểm `to` nhất (giặc tới, cầu cần qua). */
export function gateToward(b: Building, to: { x: number; z: number }): { x: number; z: number; out: { x: number; z: number } } {
  const list = gates(b);
  let best = list[0];
  for (const g of list) if (Math.hypot(g.x - to.x, g.z - to.z) < Math.hypot(best.x - to.x, best.z - to.z) - 1e-9) best = g;
  return best;
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

/** Người chơi đã tự bố trí. Chưa thì bố trí tự động. */
export const guardManual = (s: GameState): boolean => !!barracksOf(s)?.guard;

/** Số lính người chơi muốn bố trí giữ kinh đô (bố trí tự động: mọi lính tới đủ chỗ, giữ tỉ lệ binh chủng). */
export function guardTargets(s: GameState): Army {
  const b = barracksOf(s);
  if (!b) return zero();
  if (!b.guard) return fitArmy(s.troops, guardCap(s));
  return { ...zero(), ...b.guard };
}

/**
 * Lính thật sự ra giữ kinh đô. Tự bố trí thì lấy theo bố trí, thiếu lính (đã chết, chưa luyện bù) thì chỉ ra số còn;
 * lính chết được quân dự trữ bù vào ngay. Không quá số chỗ giữ kinh đô. Chưa có doanh trại thì không ai ra.
 */
export function guardPlan(s: GameState): Army {
  const b = barracksOf(s);
  if (!b) return zero();
  if (!b.guard) return fitArmy(s.troops, guardCap(s));
  let room = guardCap(s);
  const got = zero();
  for (const k of UNIT_TYPES) {
    const n = Math.max(0, Math.min(b.guard[k] ?? 0, s.troops[k], Math.floor(room / UNITS[k].space)));
    got[k] = n;
    room -= n * UNITS[k].space;
  }
  return got;
}

/** Quân dự trữ: lính không bố trí giữ kinh đô. */
export function reserve(s: GameState): Army {
  const used = guardPlan(s);
  const out = zero();
  for (const k of UNIT_TYPES) out[k] = Math.max(0, s.troops[k] - used[k]);
  return out;
}

/** Kiểm tra thêm (`delta` = 1) hay bớt (`delta` = −1) một lính binh chủng `kind` giữ kinh đô. */
export function canGuard(s: GameState, kind: UnitType, delta: 1 | -1): Result {
  if (!barracksOf(s)) return fail('canDoanhTrai');
  if (s.raid.phase === 'battle') return fail('dangCoGiac');
  const here = guardTargets(s);
  if (delta < 0) return here[kind] > 0 ? ok(undefined) : fail('khongDuQuan');
  if (here[kind] >= s.troops[kind]) return fail('khongDuQuan');
  if (armySpace(here) + UNITS[kind].space > guardCap(s)) return fail('quaChoGiuThanh');
  return ok(undefined);
}

/** Thêm hay bớt một lính giữ kinh đô. Đang bố trí tự động thì giữ nguyên bố trí ấy rồi mới đổi. */
export function setGuard(s: GameState, kind: UnitType, delta: 1 | -1): Result<number> {
  const check = canGuard(s, kind, delta);
  if (!check.ok) return check;
  const b = barracksOf(s)!;
  b.guard = guardTargets(s);
  b.guard[kind] += delta;
  return ok(b.guard[kind]);
}

/** Bỏ bố trí riêng, quay về bố trí tự động. */
export function autoGuard(s: GameState): void {
  const b = barracksOf(s);
  if (b) delete b.guard;
}
