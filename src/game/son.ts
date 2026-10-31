// Chương 2: Sơn Tinh, Thủy Tinh. Vua Hùng thứ mười tám kén rể cho Mị Nương, thách cưới năm lễ vật.
// Đủ lễ vật thì Sơn Tinh đến trước rước Mị Nương, cùng ra trận; Thủy Tinh nổi giận dâng nước đánh kinh đô.
// Kèm việc chọn tướng cho từng trận: mỗi trận một tướng, Gióng, Sơn Tinh hay An Dương Vương.

import type { Battle, HeroKind, HeroSetup } from './battle';
import { advJoined, advSetup } from './coLoa';
import { ADV_REST_MS, CH2_QUEST_START, GIFTS, GIFT_IDS, GIONG_REST_MS, SON_REST_MS, type Chapter, type GiftId } from './defs';
import { canAfford, pay, scheduleFirstFlood, type FailReason, type GameState, type Result, type SonState } from './game';
import { giongReady, heroSetup } from './giong';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

export function initialSon(): SonState {
  return { gifts: { comNep: false, banhChung: false, voi9Nga: false, ga9Cua: false, ngua9HongMao: false }, restUntil: 0, non: false, won: false };
}

/** Nhận xong thưởng nhiệm vụ cuối chương 1 thì sang chương 2. */
export const inChapter2 = (s: GameState) => s.questIndex >= CH2_QUEST_START;
export const giftCount = (s: GameState) => GIFT_IDS.filter((g) => s.son.gifts[g]).length;
/** Đủ năm lễ vật: Sơn Tinh đã rước Mị Nương, cùng ra trận. */
export const sonJoined = (s: GameState) => giftCount(s) === GIFT_IDS.length;
export const sonResting = (s: GameState) => s.clock < s.son.restUntil;

/** Sơn Tinh có ra trận lần này không, đã mở Dời non chưa. */
export function sonSetup(s: GameState): HeroSetup | null {
  if (!sonJoined(s) || sonResting(s)) return null;
  return { kind: 'sonTinh', bamboo: false, glow: s.son.won, non: s.son.non };
}

/**
 * Tướng ra trận. Trận chương 3 (phó bản chương 3, yêu tinh, quân Triệu) có An Dương Vương khi đã có nỏ thần
 * và không kiệt sức. Trận chương 2 (phó bản chương 2, mùa lũ), hay trận chương 3 chưa có An Dương Vương,
 * có Sơn Tinh khi Sơn Tinh đã rước Mị Nương và không kiệt sức. Còn lại có Gióng nếu Gióng đã thành tráng sĩ
 * và không kiệt sức.
 */
export function heroFor(s: GameState, chapter: Chapter): HeroSetup | null {
  if (chapter === 3) {
    const adv = advSetup(s);
    if (adv) return adv;
  }
  if (chapter >= 2) {
    const son = sonSetup(s);
    if (son) return son;
  }
  return heroSetup(s);
}

/**
 * Tướng lẽ ra cùng ra trận chương này mà đang kiệt sức: ai, còn nghỉ bao nhiêu giây.
 * Null khi tướng đứng đầu đang khỏe, hay chưa có tướng nào. Để giao diện báo trước khi xuất quân.
 */
export function restingHero(s: GameState, chapter: Chapter): { kind: HeroKind; secs: number } | null {
  const order: { kind: HeroKind; joined: boolean; until: number }[] = [];
  if (chapter === 3) order.push({ kind: 'anDuong', joined: advJoined(s), until: s.adv.restUntil });
  if (chapter >= 2) order.push({ kind: 'sonTinh', joined: sonJoined(s), until: s.son.restUntil });
  order.push({ kind: 'giong', joined: giongReady(s), until: s.giong.restUntil });
  const first = order.find((h) => h.joined);
  if (!first || s.clock >= first.until) return null;
  return { kind: first.kind, secs: Math.ceil((first.until - s.clock) / 1000) };
}

/** Sau trận: tướng đã kiệt sức thì phải nghỉ một lúc mới ra trận lại được. */
export function restAfter(s: GameState, battle: Battle): void {
  if (!battle.hero?.down) return;
  if (battle.hero.kind === 'anDuong') s.adv.restUntil = s.clock + ADV_REST_MS;
  else if (battle.hero.kind === 'sonTinh') s.son.restUntil = s.clock + SON_REST_MS;
  else s.giong.restUntil = s.clock + GIONG_REST_MS;
}

/** Lễ vật này dâng được ở kinh đô chưa (cơm nếp, bánh chưng). Voi, gà, ngựa phải giành ở phó bản. */
export function canOffer(s: GameState, id: GiftId): Result {
  if (!inChapter2(s)) return fail('canChuong2');
  if (s.son.gifts[id]) return fail('daCoLeVat');
  const cost = GIFTS[id].cost;
  if (!cost) return fail('leVatPhoBan');
  if (!canAfford(s, cost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/** Đã có thêm lễ vật: đủ cả năm thì Sơn Tinh rước Mị Nương, Thủy Tinh nổi giận. */
function gotGift(s: GameState, id: GiftId): void {
  s.son.gifts[id] = true;
  if (sonJoined(s)) scheduleFirstFlood(s);
}

/** Dâng một lễ vật làm ở kinh đô. */
export function offerGift(s: GameState, id: GiftId): Result<GiftId> {
  const check = canOffer(s, id);
  if (!check.ok) return check;
  pay(s, GIFTS[id].cost!);
  gotGift(s, id);
  return ok(id);
}

/** Lễ vật giành được khi thắng lần đầu màn `stage`, nếu có. */
export function giftOfStage(stage: number): GiftId | undefined {
  return GIFT_IDS.find((g) => GIFTS[g].stage === stage);
}

/** Thắng lần đầu một màn có lễ vật: mang lễ vật về. */
export function winGift(s: GameState, stage: number): GiftId | undefined {
  const id = giftOfStage(stage);
  if (!id || s.son.gifts[id]) return undefined;
  gotGift(s, id);
  return id;
}

export type SonLook = 'cauHon' | 'trangSi';

/** Dáng Sơn Tinh đứng trước Điện: đến cầu hôn (chờ lễ vật), rồi cầm gậy thần ra trận. Kết chương thì về núi. */
export function sonLook(s: GameState): SonLook | null {
  if (!inChapter2(s) || s.son.won) return null;
  return sonJoined(s) ? 'trangSi' : 'cauHon';
}
