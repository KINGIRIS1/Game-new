// Tướng của dã ngoại (`docs/thiet-ke.md` mục Kế hoạch: năm tướng mới): mỗi map 6–10 một tướng, về khi hạ boss map ấy
// lần đầu, chỉ đánh ở dã ngoại.

import { TUONG_DA_IDS, TUONG_DA_MAP, type TuongDaId } from './defs';
import type { GameState } from './game';

/**
 * Tướng dã ngoại `id` đã về chưa: boss map của tướng ấy đã bị hạ ít nhất một lần. Hạ boss thì giờ mọc lại
 * (`daNgoai.boss`) được hẹn sau đồng hồ chơi, không bao giờ về lại 0, nên không cần thêm trường lưu.
 */
/** `id` là tướng dã ngoại. */
export const laTuongDa = (id: string): id is TuongDaId => (TUONG_DA_IDS as string[]).includes(id);

export const tuongDaVe = (s: GameState, id: TuongDaId): boolean => (s.daNgoai.boss[TUONG_DA_MAP[id] - 1] ?? 0) > 0;
