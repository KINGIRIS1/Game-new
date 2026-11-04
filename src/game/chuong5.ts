// Chương 5: Hai Bà Trưng.
// Vào chương 5 khi nhận thưởng nhiệm vụ "một công trình cấp 9" (đã có Điện 9, sau Hết truyện chương 4). Điện lên được
// cấp 10. Thủy binh và quân Triệu thôi tới; quân Hán trên bộ đánh kinh đô, xen với mùa lũ.

import { CH5_QUEST_START } from './defs';
import type { GameState } from './game';

/** Nhận xong thưởng nhiệm vụ "một công trình cấp 9" thì sang chương 5. */
export const inChapter5 = (s: GameState) => s.questIndex >= CH5_QUEST_START;
