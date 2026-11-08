// Bốn nữ tướng của Hai Bà Trưng (chương 5 PR 4): Lê Chân, Thánh Thiên, Bát Nàn, Phùng Thị Chính theo về khi thắng
// màn 34, 35, 37, 39 lần đầu, mỗi người lo một binh chủng (`NU_TUONG` ở `defs.ts`). Ở phó bản một nữ tướng đi theo
// làm phó tướng: đứng cầm cờ sau hàng hậu, không đánh, giặc không nhắm (`Battle.nuTuong`). Ở kinh đô cả bốn ở doanh
// trại. Binh chủng của nữ tướng được thêm `NU_TUONG_BONUS` máu và sức đánh (`battle.ts`).

import type { FighterKind } from './battle';
import { NU_TUONG, NU_TUONG_IDS, type NuTuongId } from './defs';
import { barracksOf } from './doanhTrai';
import type { FailReason, GameState, Result } from './game';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

/** Nữ tướng đã theo về: đã thắng màn của người ấy (màn đánh lại vẫn tính). */
export const nuJoined = (s: GameState, id: NuTuongId): boolean => s.campaign.cleared >= NU_TUONG[id].stage;

/** Các nữ tướng đã theo về, theo thứ tự Lê Chân, Thánh Thiên, Bát Nàn, Phùng Thị Chính. */
export const nuTuongList = (s: GameState): NuTuongId[] => NU_TUONG_IDS.filter((id) => nuJoined(s, id));

/** Lính loại `kind` có được nữ tướng `id` cộng thêm không (đúng binh chủng của nữ tướng). */
export const nuBoosts = (id: NuTuongId | null | undefined, kind: FighterKind): boolean => !!id && NU_TUONG[id].unit === kind;

// ---------- Ở kinh đô: cả bốn nữ tướng ở doanh trại ----------

/** Các nữ tướng đang ở doanh trại: mọi nữ tướng đã theo về, khi kinh đô đã có doanh trại. */
export const nuAtCamp = (s: GameState): NuTuongId[] => (barracksOf(s) ? nuTuongList(s) : []);

/** Nữ tướng ở doanh trại lo binh chủng `kind`, nếu có: lính giữ kinh đô đúng binh chủng ấy được cộng. */
export const nuForUnit = (s: GameState, kind: FighterKind): NuTuongId | null => nuAtCamp(s).find((id) => nuBoosts(id, kind)) ?? null;

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
