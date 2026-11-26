// Kho cất công trình (`docs/thiet-ke.md` mục Kho cất công trình; bản lưu 37): cất công trình chưa dùng tới khỏi kinh
// đô mà không mất: giữ cấp, hư hỏng, hướng xoay. Đồ cất không làm ra gì, không chiếm ô, vẫn tính vào số tối đa
// (`usedOf` ở `game.ts`), nên cất rồi cũng không dựng thêm quá số ấy. Cất không tốn gì; đặt lại lúc nào cũng được, tốn
// như dời (`moveCost`), xong ngay. Áp mẫu kinh đô (`mau.ts`) lấy đồ cất đặt vào chỗ trống của mẫu trước khi dựng mới,
// và cất công trình không có chỗ trong mẫu mà vướng mẫu.

import { BUILDINGS, BUILD_MENU, isBridge, isDecor, type BuildingType, type Cost } from './defs';
import { canAfford, canRotateType, choDat, fillWorkers, findBuilding, moveCost, pay, type Building, type FailReason, type GameState, type Result } from './game';
import { footprintTop, levelFootprint } from './terrain';
import { isBusy } from './xay';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

/**
 * Loại không cất được: Điện; doanh trại (tướng, quân giữ kinh đô, lịch giặc tới đều dựa vào nó); đồn biên (lính đóng);
 * nhà làng bên kia sông.
 */
const KHONG_CAT: BuildingType[] = ['dien', 'doanhTrai', 'donBien', 'banLang'];

/**
 * Loại cất vào kho được: công trình không dỡ được, trừ `KHONG_CAT`. Tường, bẫy, cổng, đường, đồ trang trí dỡ được nên
 * không cần cất; cầu vắt qua sông, không cất.
 */
export function catDuocLoai(type: BuildingType): boolean {
  const def = BUILDINGS[type];
  return !!def && !def.removable && !isDecor(type) && !isBridge(type) && !KHONG_CAT.includes(type);
}

/** Công trình mã `id` đang cất trong kho, nếu có. */
export function catOf(state: GameState, id: number): Building | undefined {
  return state.khoCat.find((b) => b.id === id);
}

export function canCat(state: GameState, id: number): Result {
  const b = findBuilding(state, id);
  if (!b) return fail('khongTimThay');
  if (!catDuocLoai(b.type)) return fail('khongCatDuoc');
  if (state.raid.phase !== 'idle') return fail('dangCoGiac');
  if (isBusy(state, id)) return fail('dangXay');
  return ok(undefined);
}

/**
 * Nhấc công trình `b` khỏi kinh đô vào kho cất, không xét điều kiện (áp mẫu đã xét): người làm về rảnh, ruộng mất phù sa
 * đã bồi (như dời). Nền đất dưới móng ở lại như cũ.
 */
export function vaoKho(state: GameState, b: Building): void {
  state.buildings = state.buildings.filter((o) => o.id !== b.id);
  b.workers = 0;
  delete b.boi;
  state.khoCat = [...state.khoCat, b];
}

/** Cất công trình `id` vào kho. Không tốn gì. */
export function catCongTrinh(state: GameState, id: number): Result<Building> {
  const check = canCat(state, id);
  if (!check.ok) return check;
  const b = findBuilding(state, id)!;
  vaoKho(state, b);
  return ok(b);
}

/** Đặt lại công trình `id` đang cất ở góc móng (x, z) được không; được thì trả giá (như dời). */
export function canDatLai(state: GameState, id: number, x: number, z: number): Result<Cost> {
  const b = catOf(state, id);
  if (!b) return fail('khongCoTrongKho');
  if (state.raid.phase !== 'idle') return fail('dangCoGiac');
  const why = choDat(state, b.type, x, z);
  if (why) return fail(why);
  const cost = moveCost(b);
  if (!canAfford(state, cost)) return fail('thieuTaiNguyen');
  return ok(cost);
}

/**
 * Đưa công trình `b` đang cất ra kinh đô ở góc móng (x, z), không xét điều kiện: giữ cấp, hư hỏng; dân đắp móng phẳng
 * như khi dựng mới, dân rảnh vào làm. Loại xoay được thì quay theo hướng `rot` (không có thì giữ hướng cũ).
 */
export function raKho(state: GameState, b: Building, x: number, z: number, rot?: number): void {
  state.khoCat = state.khoCat.filter((o) => o.id !== b.id);
  b.x = x;
  b.z = z;
  if (rot !== undefined && canRotateType(b.type)) {
    const r = ((Math.round(rot) % 4) + 4) % 4;
    if (r) b.rot = r;
    else delete b.rot;
  }
  state.buildings.push(b);
  levelFootprint(state, b, footprintTop(state, b.type, x, z));
  fillWorkers(state, b);
}

/** Đặt lại công trình `id` đang cất ở góc móng (x, z), hướng `rot`. Tốn như dời, xong ngay. */
export function datLai(state: GameState, id: number, x: number, z: number, rot?: number): Result<Building> {
  const check = canDatLai(state, id, x, z);
  if (!check.ok) return check;
  pay(state, check.value);
  const b = catOf(state, id)!;
  raKho(state, b, x, z, rot);
  return ok(b);
}

/** Một nhóm đồ cất cùng loại, cùng cấp, cùng hư hay lành, cho bảng kho: `ids` theo thứ tự cất. */
export interface NhomCat {
  type: BuildingType;
  level: number;
  damaged: boolean;
  ids: number[];
}

/** Đồ cất gộp nhóm, theo thứ tự thẻ Công trình, cấp cao trước, lành trước hư. */
export function nhomCat(state: GameState): NhomCat[] {
  const out: NhomCat[] = [];
  for (const b of state.khoCat) {
    const damaged = !!b.damaged;
    const g = out.find((n) => n.type === b.type && n.level === b.level && n.damaged === damaged);
    if (g) g.ids.push(b.id);
    else out.push({ type: b.type, level: b.level, damaged, ids: [b.id] });
  }
  const thu = (t: BuildingType) => {
    const i = BUILD_MENU.indexOf(t);
    return i < 0 ? BUILD_MENU.length : i;
  };
  return out.sort((a, b) => thu(a.type) - thu(b.type) || b.level - a.level || Number(a.damaged) - Number(b.damaged));
}
