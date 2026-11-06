// Chương 5: Hai Bà Trưng.
// Vào chương 5 khi nhận thưởng nhiệm vụ "một công trình cấp 9" (đã có Điện 9, sau Hết truyện chương 4). Điện lên được
// cấp 10. Thủy binh và quân Triệu thôi tới; quân Hán trên bộ đánh kinh đô, xen với mùa lũ.
// Hai Bà Trưng là hai tướng, mỗi bà một voi trận, cùng ra một trận: Trưng Trắc đánh gần (Voi xung trận), Trưng Nhị
// bắn cung (Hiệu triệu, mở khi thắng màn 33). Bà nào kiệt sức thì nghỉ, bà kia vẫn ra trận.

import type { HeroKind, HeroSetup } from './battle';
import { CH5_QUEST_START, HAI_BA_REST_MS } from './defs';
import type { GameState, HaiBaState } from './game';

/** Nhận xong thưởng nhiệm vụ "một công trình cấp 9" thì sang chương 5. */
export const inChapter5 = (s: GameState) => s.questIndex >= CH5_QUEST_START;

/** Màn đầu chương 5 (Mê Linh). Thắng lần đầu thì Lời thề Hát Môn, Trưng Nhị có Hiệu triệu. */
export const HIEU_TRIEU_AT = 33;
/** Thắng màn này lần đầu (thành Luy Lâu): Tô Định bỏ trốn, Trưng Trắc lên ngôi. */
export const LUY_LAU_AT = 36;
/** Thắng màn này lần đầu (bờ biển Hợp Phố): biết tin Mã Viện sang, từ đây thủy quân Hán có lâu thuyền đánh kinh đô. */
export const MA_VIEN_AT = 37;
/** Thắng màn này lần đầu (hồ Lãng Bạc, trùm Mã Viện): Hai Bà lui về giữ Cấm Khê. */
export const LANG_BAC_AT = 39;
/** Màn cuối chương 5 (Cấm Khê, cầm cự): thắng lần đầu thì kể đoạn Sông Hát rồi hiện màn hình Hết truyện mới. */
export const CH5_LAST = 40;

/** Mã Viện đã sang (thắng màn 37): thủy quân Hán đánh kinh đô. */
export const maVienCame = (s: GameState) => inChapter5(s) && s.campaign.cleared >= MA_VIEN_AT;
/** Đã giữ được Cấm Khê (thắng màn 40): hết truyện chương 5, mở Đền Hát Môn, Hai Bà hiển linh. */
export const chuong5Won = (s: GameState) => inChapter5(s) && s.campaign.cleared >= CH5_LAST;

export type HaiBaKind = 'trungTrac' | 'trungNhi';
export const HAI_BA_KINDS: HaiBaKind[] = ['trungTrac', 'trungNhi'];
export const isHaiBa = (k: HeroKind): k is HaiBaKind => k === 'trungTrac' || k === 'trungNhi';

export function initialHaiBa(): HaiBaState {
  return { trungTrac: 0, trungNhi: 0 };
}

/** Hai Bà ra trận từ khi vào chương 5 (đoạn truyện Đất Mê Linh). */
export const haiBaJoined = inChapter5;
export const haiBaResting = (s: GameState, k: HaiBaKind) => s.clock < s.haiBa[k];
/** Trưng Nhị đã có Hiệu triệu: thắng màn 33. */
export const hieuTrieuOpen = (s: GameState) => s.campaign.cleared >= HIEU_TRIEU_AT;

/** Các bà ra trận lần này (khỏe, đã về), Trưng Trắc trước. */
export function haiBaSetups(s: GameState): HeroSetup[] {
  if (!haiBaJoined(s)) return [];
  return HAI_BA_KINDS.filter((k) => !haiBaResting(s, k)).map((kind) => ({
    kind,
    bamboo: false,
    glow: chuong5Won(s),
    non: false,
    ...(kind === 'trungNhi' ? { hieuTrieu: hieuTrieuOpen(s) } : {}),
  }));
}

/** Bà kiệt sức trong trận thì nghỉ một lúc. */
export function restHaiBa(s: GameState, k: HaiBaKind): void {
  s.haiBa[k] = s.clock + HAI_BA_REST_MS;
}
