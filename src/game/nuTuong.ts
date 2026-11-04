// Bốn nữ tướng của Hai Bà Trưng (chương 5 PR 4): Lê Chân, Thánh Thiên, Bát Nàn, Phùng Thị Chính theo về khi thắng
// màn 34, 35, 37, 39 lần đầu, mỗi người lo một binh chủng (`NU_TUONG` ở `defs.ts`). Ở phó bản một nữ tướng đi theo
// làm phó tướng: đứng cầm cờ sau hàng hậu, không đánh, giặc không nhắm (`Battle.nuTuong`). Ở kinh đô mỗi nữ tướng ở
// một doanh trại. Binh chủng của nữ tướng được thêm `NU_TUONG_BONUS` máu và sức đánh (`battle.ts`).

import type { FighterKind } from './battle';
import { NU_TUONG, NU_TUONG_IDS, type NuTuongId } from './defs';
import { barracksList } from './doanhTrai';
import type { Building, FailReason, GameState, Result } from './game';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

/** Nữ tướng đã theo về: đã thắng màn của người ấy (màn đánh lại vẫn tính). */
export const nuJoined = (s: GameState, id: NuTuongId): boolean => s.campaign.cleared >= NU_TUONG[id].stage;

/** Các nữ tướng đã theo về, theo thứ tự Lê Chân, Thánh Thiên, Bát Nàn, Phùng Thị Chính. */
export const nuTuongList = (s: GameState): NuTuongId[] => NU_TUONG_IDS.filter((id) => nuJoined(s, id));

/** Lính loại `kind` có được nữ tướng `id` cộng thêm không (đúng binh chủng của nữ tướng). */
export const nuBoosts = (id: NuTuongId | null | undefined, kind: FighterKind): boolean => !!id && NU_TUONG[id].unit === kind;

// ---------- Ở kinh đô: mỗi doanh trại một nữ tướng ----------

/**
 * Nữ tướng ở từng doanh trại (theo mã công trình), như tướng chỉ huy: nữ tướng người chơi đã giao giữ nguyên; doanh
 * trại chưa có thì nữ tướng rảnh về theo thứ tự dựng. Ít doanh trại hơn nữ tướng thì có người chưa ở trại nào.
 */
export function nuPosts(s: GameState): Map<number, NuTuongId> {
  const list = barracksList(s);
  const map = new Map<number, NuTuongId>();
  const used = new Set<NuTuongId>();
  for (const b of list) {
    if (b.nuTuong && nuJoined(s, b.nuTuong) && !used.has(b.nuTuong)) {
      map.set(b.id, b.nuTuong);
      used.add(b.nuTuong);
    }
  }
  const free = nuTuongList(s).filter((id) => !used.has(id));
  for (const b of list) if (!map.has(b.id) && free.length) map.set(b.id, free.shift()!);
  return map;
}

/** Nữ tướng ở doanh trại `b`, nếu có. */
export const nuOf = (s: GameState, b: Building): NuTuongId | null => (b.type === 'doanhTrai' ? (nuPosts(s).get(b.id) ?? null) : null);

/** Doanh trại nữ tướng `id` đang ở, nếu có. */
export function nuPostOf(s: GameState, id: NuTuongId): Building | undefined {
  for (const [bid, n] of nuPosts(s)) if (n === id) return s.buildings.find((b) => b.id === bid);
  return undefined;
}

/** Kiểm tra giao nữ tướng `id` về doanh trại `barracks` được không. */
export function canAssignNu(s: GameState, barracks: number, id: NuTuongId): Result {
  const b = s.buildings.find((x) => x.id === barracks);
  if (!b || b.type !== 'doanhTrai') return fail('khongTimThay');
  if (!nuJoined(s, id)) return fail('tuongChuaCo');
  if (nuOf(s, b) === id) return fail('nuDaO');
  if (s.raid.phase === 'battle') return fail('dangCoGiac');
  return ok(undefined);
}

/**
 * Giao nữ tướng `id` về doanh trại `barracks`. Nữ tướng ấy đang ở trại khác thì hai nữ tướng đổi chỗ cho nhau. Mọi
 * doanh trại ghi lại nữ tướng đang ở để thứ tự không tự đổi về sau.
 */
export function assignNu(s: GameState, barracks: number, id: NuTuongId): Result<NuTuongId> {
  const check = canAssignNu(s, barracks, id);
  if (!check.ok) return check;
  const map = nuPosts(s);
  const prev = map.get(barracks);
  for (const [other, n] of map) if (n === id) prev ? map.set(other, prev) : map.delete(other);
  map.set(barracks, id);
  for (const b of barracksList(s)) {
    const n = map.get(b.id);
    if (n) b.nuTuong = n;
    else delete b.nuTuong;
  }
  return ok(id);
}

// ---------- Ở phó bản: phó tướng ----------

/** Phó tướng người chơi chọn lần trước (còn theo về), để bảng xếp quân chọn sẵn. */
export function phoTuongOf(s: GameState): NuTuongId | null {
  const id = s.campaign.phoTuong;
  return id && nuJoined(s, id) ? id : null;
}

/**
 * Kiểm tra phó tướng `id` đi theo trận phó bản hay đánh đồn được không; `null` là không mang ai. Nữ tướng không
 * đánh, nên thử thách Không tướng vẫn mang được.
 */
export function phoTuongCheck(s: GameState, id: NuTuongId | null | undefined): Result {
  if (id && !nuJoined(s, id)) return fail('tuongChuaCo');
  return ok(undefined);
}

/** Ghi phó tướng vừa chọn (cho lần xuất quân sau). `undefined`: không đổi. */
export function rememberPhoTuong(s: GameState, id: NuTuongId | null | undefined): void {
  if (id === undefined) return;
  if (id) s.campaign.phoTuong = id;
  else delete s.campaign.phoTuong;
}

// ---------- Lạc hầu báo nữ tướng theo về ----------

const hintKey = (id: NuTuongId) => `nu:${id}`;

/** Nữ tướng vừa theo về mà Lạc hầu chưa báo (mỗi người một lần, ghi vào `hinted`). */
export function nextNuHint(s: GameState): NuTuongId | null {
  return nuTuongList(s).find((id) => !s.hinted.includes(hintKey(id))) ?? null;
}

export function markNuHinted(s: GameState, id: NuTuongId): void {
  if (!s.hinted.includes(hintKey(id))) s.hinted = [...s.hinted, hintKey(id)];
}
