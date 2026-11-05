// Việc nặn sẵn: dựng một nhân vật để các dáng nặn (figure ở nanNguoi.ts) của nó vào bộ nhớ đệm. Chạy trong worker
// (nanSan.worker.ts) nên chỉ nạp mã nhân vật, không nạp cảnh hay luật chơi; danh sách việc lập ở nanTruoc.ts.

import type { FighterKind } from '../game/battle';
import type { NuTuongId } from '../game/defs';
import { isBeast, makeBeast } from './beasts';
import { makeDolphin, makeWhale } from './caBien';
import { makeNuTuong } from './heroes';
import { makeFighter } from './models';
import { isMonster, makeMonster } from './monsters';
import { isSoldier, makeSoldier } from './soldier';

/** Một người đánh (loại, bậc binh khí), một nữ tướng cầm cờ, hay cá ngoài biển. */
export type Job = readonly ['danh', FighterKind, number] | readonly ['nu', NuTuongId] | readonly ['ca', 'whale' | 'dolphin'];

export function runJob(j: Job): void {
  if (j[0] === 'nu') makeNuTuong(j[1]);
  else if (j[0] === 'ca') (j[1] === 'whale' ? makeWhale : makeDolphin)();
  else {
    const [, k, tier] = j;
    if (isSoldier(k)) makeSoldier(k, tier);
    else if (isBeast(k)) makeBeast(k, tier);
    else if (isMonster(k)) makeMonster(k);
    else makeFighter(k, tier);
  }
}
