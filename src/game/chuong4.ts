// Chương 4: Mỵ Châu, Trọng Thủy.
// Vào chương 4 khi nhận thưởng nhiệm vụ Đền Cổ Loa. Điện lên được cấp 8 (không thêm đất), và hai chòi canh
// cấp 8 ghép được thành một lầu nỏ bắn ba giặc một lúc.

import { BUILDINGS, CH4_QUEST_START, LAU_NO_FROM_LEVEL } from './defs';
import { canAfford, dienLevel, findBuilding, pay, type Building, type FailReason, type GameState, type Result } from './game';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

/** Nhận xong thưởng nhiệm vụ cuối chương 3 (Đền Cổ Loa) thì sang chương 4. */
export const inChapter4 = (s: GameState) => s.questIndex >= CH4_QUEST_START;

/** Chòi canh này đủ điều kiện để ghép (cấp 8, còn nguyên). */
export const mergeable = (b: Building | undefined): b is Building =>
  !!b && b.type === 'choiCanh' && b.level >= LAU_NO_FROM_LEVEL && !b.damaged;

/** Giá ghép hai chòi canh thành lầu nỏ. */
export const mergeCost = () => BUILDINGS.lauNo.buildCost;

/** Ghép được chòi canh `id` với chòi canh `otherId` thành lầu nỏ không. */
export function canMergeTowers(state: GameState, id: number, otherId: number): Result {
  const a = findBuilding(state, id);
  const b = findBuilding(state, otherId);
  if (!a || !b) return fail('khongTimThay');
  if (dienLevel(state) < BUILDINGS.lauNo.minDien) return fail('chuaDuCapDien');
  if (id === otherId || !mergeable(a) || !mergeable(b)) return fail('khongGhepDuoc');
  if (state.raid.phase !== 'idle') return fail('dangCoGiac');
  if (!canAfford(state, mergeCost())) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/**
 * Ghép hai chòi canh cấp 8 thành lầu nỏ. Lầu nỏ đứng ở chỗ chòi canh thứ nhất, chòi thứ hai biến mất để trống ô ấy.
 * Không tách lại được. Một lầu nỏ tính là hai chòi canh trong số chòi canh tối đa.
 */
export function mergeTowers(state: GameState, id: number, otherId: number): Result<Building> {
  const check = canMergeTowers(state, id, otherId);
  if (!check.ok) return check;
  pay(state, mergeCost());
  state.buildings = state.buildings.filter((b) => b.id !== otherId);
  const a = findBuilding(state, id)!;
  a.type = 'lauNo';
  a.level = 1;
  a.workers = 0;
  return ok(a);
}
