// Việc nặn sẵn: dựng một nhân vật để các dáng nặn (figure ở nanNguoi.ts) của nó vào bộ nhớ đệm. Chạy trong worker
// (nanSan.worker.ts) nên chỉ nạp mã nhân vật, không nạp cảnh hay luật chơi; danh sách việc lập ở nanTruoc.ts.

import type { FighterKind } from '../game/battle';
import type { NuTuongId } from '../game/defs';
import { isBeast, makeBeast, makeRoyalHorse, makeRuaVang } from './beasts';
import { makeDolphin, makeWhale } from './caBien';
import { makeDrummer, makeNuTuong } from './heroes';
import type { FigureData } from './nanNguoi';
import { makeFighter } from './models';
import { isMonster, makeMonster } from './monsters';
import { DAN_RUT, makeRower, makeWorker } from './people';
import { isSoldier, makeSoldier } from './soldier';

/**
 * Nhân vật trong cảnh bãi chiến mà không đánh trận (battlefield.ts): không phải người đánh nên việc `danh` không nặn
 * tới, mà dựng ngay lúc vào trận. `nanTruoc.test.ts` canh không sót nhân vật nào.
 */
const CANH = {
  /** Mọi bãi chiến: Lạc tướng đánh trống đồng sau hàng quân ta; bến sông, đồng ngập: người lái đò trên thuyền. */
  baiChien: () => {
    makeDrummer();
    makeRower();
  },
  /** Mộ Dạ (màn 32): ngựa vua chở An Dương Vương và Mỵ Châu, Rùa Vàng nổi lên khi vua tới biển. */
  moDa: () => {
    makeRoyalHorse();
    makeRuaVang();
  },
  /** Cấm Khê (màn 40): đoàn dân gồng gánh rút về núi (trâu không nặn). */
  camKhe: () => {
    for (const w of new Set(DAN_RUT.flatMap((w) => (w === 'trau' ? [] : [w.job])))) makeWorker(w);
  },
};

export type CanhId = keyof typeof CANH;

/** Một người đánh (loại, bậc binh khí), một nữ tướng cầm cờ, cá ngoài biển, hay nhân vật cảnh bãi chiến. */
export type Job =
  | readonly ['danh', FighterKind, number]
  | readonly ['nu', NuTuongId]
  | readonly ['ca', 'whale' | 'dolphin']
  | readonly ['canh', CanhId];

/**
 * Worker làm xong một việc: các dáng mới nặn, và mọi dáng việc ấy cần (kể cả dáng đã nặn ở việc trước; null nếu việc
 * hỏng giữa chừng).
 */
export interface JobDone {
  job: string;
  keys: string[] | null;
  figs: FigureData[];
}

export function runJob(j: Job): void {
  if (j[0] === 'nu') makeNuTuong(j[1]);
  else if (j[0] === 'ca') (j[1] === 'whale' ? makeWhale : makeDolphin)();
  else if (j[0] === 'canh') CANH[j[1]]();
  else {
    const [, k, tier] = j;
    if (isSoldier(k)) makeSoldier(k, tier);
    else if (isBeast(k)) makeBeast(k, tier);
    else if (isMonster(k)) makeMonster(k);
    else makeFighter(k, tier);
  }
}
