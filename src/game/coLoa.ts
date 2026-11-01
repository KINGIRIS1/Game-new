// Chương 3: An Dương Vương, thành Cổ Loa và nỏ thần.
// Vua Hùng truyền ngôi cho Thục Phán. An Dương Vương cho đắp thành Cổ Loa nhiều vòng quanh Điện,
// nhưng yêu tinh núi Thất Diệu đêm đêm kéo về phá. Diệt được yêu tinh (màn 19) thì Rùa Vàng hiện lên giúp;
// thành đủ ba vòng thì Rùa Vàng tặng vuốt làm lẫy nỏ, Cao Lỗ chế nỏ thần, An Dương Vương cầm nỏ ra trận.

import type { HeroSetup } from './battle';
import { BUILDINGS, CH3_QUEST_START, NO_THAN_FORGE, RINGS_NEEDED } from './defs';
import { canAfford, pay, scheduleLandRaid, type AdvState, type FailReason, type GameState, type Result } from './game';
import { forgeLevel } from './giong';
import { GRID, isRiver } from './map';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

/** Thắng màn này lần đầu thì yêu tinh núi Thất Diệu tan, Rùa Vàng hiện lên. */
export const YEU_LAST = 19;
/** Thắng màn này lần đầu thì Rùa Vàng hứa hiện lên che chở quân ta (kỹ năng thứ hai). */
export const KIM_QUY_AT = 22;
/** Màn cuối chương 3: thắng lần đầu thì Triệu Đà thua chạy. */
export const CH3_LAST = 24;

export function initialAdv(): AdvState {
  return { no: false, restUntil: 0, kimQuy: false, won: false };
}

/** Nhận xong thưởng nhiệm vụ cuối chương 2 (Đền Tản Viên) thì sang chương 3. */
export const inChapter3 = (s: GameState) => s.questIndex >= CH3_QUEST_START;
/** Đã diệt yêu tinh núi Thất Diệu: Rùa Vàng đã hiện lên, thành thôi bị phá ban đêm. */
export const ruaVangCame = (s: GameState) => inChapter3(s) && s.campaign.cleared >= YEU_LAST;
/** Đã có nỏ thần: An Dương Vương cùng ra trận. */
export const advJoined = (s: GameState) => s.adv.no;
export const advResting = (s: GameState) => s.clock < s.adv.restUntil;

/** An Dương Vương có ra trận lần này không, đã có Rùa Vàng che chở chưa. */
export function advSetup(s: GameState): HeroSetup | null {
  if (!advJoined(s) || advResting(s)) return null;
  return { kind: 'anDuong', bamboo: false, glow: false, non: false, kimQuy: s.adv.kimQuy };
}

const tileIndex = (x: number, z: number) => z * GRID + x;

/**
 * Số vòng thành Cổ Loa quanh Điện: giặc đi từ bìa rừng tới Điện phải phá qua ít nhất bao nhiêu đoạn thành còn nguyên.
 * Giặc đi tám hướng như khi tìm đường thật, nên các đoạn thành phải nối liền theo cạnh ô (chéo góc là hở);
 * sông không lội qua được, nên vòng thành dựa vào bờ sông cũng kín.
 */
export function wallRings(s: GameState): number {
  const dien = s.buildings.find((b) => b.type === 'dien');
  if (!dien) return 0;
  // Ghi nhớ theo dấu vân tay các đoạn thành còn nguyên: nhiệm vụ và bảng hỏi số vòng mỗi giây, trên lưới lớn.
  let a = 0x811c9dc5;
  let h = (dien.x * 64 + dien.z) | 0;
  let n = 0;
  for (const b of s.buildings) {
    if (b.type !== 'thanh' || b.damaged) continue;
    const v = b.x * 64 + b.z;
    a = Math.imul(a ^ v, 0x01000193);
    h = Math.imul(h ^ v, 0x85ebca6b) ^ (h >>> 13);
    n++;
  }
  if (!n) return 0;
  const hit = ringsCache.get(s);
  if (hit && hit.a === a && hit.h === h && hit.n === n) return hit.rings;
  const rings = countRings(s, dien);
  ringsCache.set(s, { a, h, n, rings });
  return rings;
}

const ringsCache = new WeakMap<GameState, { a: number; h: number; n: number; rings: number }>();

function countRings(s: GameState, dien: { x: number; z: number }): number {
  const wall = new Uint8Array(GRID * GRID);
  for (const b of s.buildings) if (b.type === 'thanh' && !b.damaged) wall[tileIndex(b.x, b.z)] = 1;
  const dist = new Int32Array(GRID * GRID).fill(1 << 20);
  // Dò theo từng mức: bước vào ô có thành tốn 1, ô khác tốn 0. `buckets[d]` là các ô vừa tới được với chi phí d.
  const buckets: number[][] = [[], []];
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      if ((x !== 0 && z !== 0) || isRiver(x, z)) continue;
      const i = tileIndex(x, z);
      dist[i] = wall[i];
      buckets[wall[i]].push(i);
    }
  }
  for (let d = 0; d < buckets.length; d++) {
    const list = buckets[d];
    while (list.length) {
      const i = list.pop()!;
      if (dist[i] !== d) continue;
      const cx = i % GRID;
      const cz = Math.floor(i / GRID);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID || isRiver(nx, nz)) continue;
          // Không đi chéo cắt góc qua sông, như giặc khi tìm đường.
          if (dx && dz && (isRiver(cx + dx, cz) || isRiver(cx, cz + dz))) continue;
          const ni = tileIndex(nx, nz);
          const nd = d + wall[ni];
          if (nd >= dist[ni]) continue;
          dist[ni] = nd;
          (buckets[nd] ??= []).push(ni);
        }
      }
    }
  }
  const def = BUILDINGS.dien;
  let best = Infinity;
  for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) best = Math.min(best, dist[tileIndex(dien.x + dx, dien.z + dz)]);
  return best >= 1 << 20 ? 0 : best;
}

/** Các bước để có nỏ thần, theo thứ tự trong truyện. */
export function noThanSteps(s: GameState): { yeu: boolean; rings: number; forge: number } {
  return { yeu: ruaVangCame(s), rings: wallRings(s), forge: forgeLevel(s) };
}

export function canForgeNoThan(s: GameState): Result {
  if (!inChapter3(s)) return fail('canChuong3');
  if (s.adv.no) return fail('daRen');
  if (!ruaVangCame(s)) return fail('canRuaVang');
  if (wallRings(s) < RINGS_NEEDED) return fail('thieuVongThanh');
  if (forgeLevel(s) < NO_THAN_FORGE.forgeLevel) return fail('canLoRen');
  if (!canAfford(s, NO_THAN_FORGE.cost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/** Cao Lỗ lấy vuốt Rùa Vàng làm lẫy, chế xong nỏ thần: An Dương Vương cùng ra trận, quân Triệu Đà sắp kéo sang. */
export function forgeNoThan(s: GameState): Result {
  const check = canForgeNoThan(s);
  if (!check.ok) return check;
  pay(s, NO_THAN_FORGE.cost);
  s.adv.no = true;
  scheduleLandRaid(s);
  return ok(undefined);
}

export type AdvLook = 'vua' | 'noThan';

/** Dáng An Dương Vương đứng trước Điện ở chương 3: chưa có nỏ thần, rồi cầm nỏ thần. */
export function advLook(s: GameState): AdvLook | null {
  if (!inChapter3(s)) return null;
  return s.adv.no ? 'noThan' : 'vua';
}
