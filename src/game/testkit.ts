// Đánh thử một màn phó bản cho các test cân bằng chương 2, 3, 4 và thử thách, theo cách chơi chuẩn đã chốt với chủ dự án.

import { skillReady, startFieldBattle, stepField, useSkill, type Battle, type HeroSetup } from './battle';
import { DEFAULT_ROWS, SKILL_IDS, STAGES, TEMPLE_BONUS, UNITS, type SkillId, type UnitType } from './defs';
import { challengeField, challengeOf } from './thuThach';

export type Army = Record<UnitType, number>;
/** Quân mẫu chương 2, 3: vừa đúng 38 chỗ doanh trại cấp 5. */
export const SAMPLE_ARMY: Army = { giao: 14, cung: 12, voi: 4, no: 0 };
export const HALF_ARMY: Army = { giao: 7, cung: 6, voi: 2, no: 0 };
/** Quân mẫu chương 4: thêm lính nỏ, vẫn đúng 38 chỗ. */
export const SAMPLE_ARMY4: Army = { giao: 11, cung: 10, voi: 3, no: 4 };
export const HALF_ARMY4: Army = { giao: 6, cung: 5, voi: 1, no: 2 };
/** Số chỗ một trận phó bản mang theo từ Điện 5. */
export const FIELD_SLOTS = 38;

/**
 * Cách chơi khi đánh thử:
 * - `thuong`: người chơi thường. Kỹ năng sẵn sàng 1,5 giây mới bấm; Đền Phù Đổng chưa dựng hay đang hư.
 * - `gioi`: bấm ngay khi kỹ năng vừa hồi, có Đền Phù Đổng.
 * - `khongBam`: có Đền nhưng không bấm kỹ năng nào.
 * Màn nào cũng phải để người chơi thường thắng, còn nửa quân hay không có tướng thì chơi giỏi cũng thua.
 */
export type Play = 'thuong' | 'gioi' | 'khongBam';
export const REACTION_S = 1.5;
/** Mỗi màn đánh thử với vài hạt giống, vì chỗ đứng ban đầu của lính có ngẫu nhiên. */
export const SEEDS = [1, 2, 3];

export function fightStage(stage: number, army: Army, hero: HeroSetup | null, play: Play, id = 1): Battle {
  const def = STAGES[stage - 1];
  const bonus = play === 'thuong' ? 0 : TEMPLE_BONUS;
  const b = startFieldBattle({ id, stage, enemies: def.enemies, waves: def.waves, holdS: def.holdS, hpScale: def.hpScale, army, rows: DEFAULT_ROWS, hero, bonus });
  return playOut(b, play);
}

/** Đánh tới khi xong trận (hay hết giờ), bấm kỹ năng theo cách chơi `play`. */
function playOut(b: Battle, play: Play): Battle {
  const readySince: Partial<Record<SkillId, number>> = {};
  for (let i = 0; i < 20 * 120 && !stepField(b, 0.05); i++) {
    if (play === 'khongBam' || b.t <= 3) continue;
    for (const k of SKILL_IDS) {
      if (!skillReady(b, k)) {
        delete readySince[k];
        continue;
      }
      readySince[k] ??= b.t;
      if (play === 'gioi' || b.t - readySince[k]! >= REACTION_S) {
        useSkill(b, k);
        delete readySince[k];
      }
    }
  }
  return b;
}

/**
 * Tướng ra trận màn `n` khi đã hết truyện (thử thách là để đánh lại các màn đã qua): Gióng hiển linh có Nhổ tre ở
 * chương 1, Sơn Tinh hiển linh dời được non ở chương 2, An Dương Vương hiển linh có Rùa Vàng ở chương 3 và màn 25,
 * Cao Lỗ có Lệnh bắn ở màn 26–32. Đúng như `heroFor` chọn khi đã qua màn 32.
 */
export function lateHero(n: number): HeroSetup {
  const chapter = STAGES[n - 1].chapter;
  if (chapter === 1) return { kind: 'giong', bamboo: true, glow: true, non: false };
  if (chapter === 2) return { kind: 'sonTinh', bamboo: false, glow: true, non: true };
  if (chapter === 3 || n === 25) return { kind: 'anDuong', bamboo: false, glow: true, non: false, kimQuy: true };
  return { kind: 'caoLo', bamboo: false, glow: false, non: false, lenhBan: true };
}

/**
 * Quân mẫu của thử thách màn `n`, 38 chỗ: quân mẫu chương (chương 4 có lính nỏ). Thử thách Hai binh chủng thì chia
 * đôi số chỗ cho hai binh chủng được mang, phần lẻ cho binh chủng nhẹ hơn.
 */
export function challengeArmy(n: number): Army {
  const ch = challengeOf(n)!;
  if (ch.kind !== 'haiBinh') return { ...(STAGES[n - 1].chapter === 4 ? SAMPLE_ARMY4 : SAMPLE_ARMY) };
  const [a, b] = [...ch.units!].sort((x, y) => UNITS[y].space - UNITS[x].space);
  const army: Army = { giao: 0, cung: 0, voi: 0, no: 0 };
  army[a] = Math.floor(FIELD_SLOTS / 2 / UNITS[a].space);
  army[b] = Math.floor((FIELD_SLOTS - army[a] * UNITS[a].space) / UNITS[b].space);
  return army;
}

/** Binh khí đã rèn đủ 2 bậc cho mọi binh chủng (người chơi giỏi khi đánh thử thách). */
export const FULL_ARMS: Army = { giao: 2, cung: 2, voi: 2, no: 2 };

/**
 * Đánh thử thử thách màn `n` theo chuẩn đã chốt, không tính huân công và phúc lành:
 * - `gioi`: bấm kỹ năng ngay khi hồi, có Đền Phù Đổng, đã rèn đủ 2 bậc cho mọi binh chủng;
 * - `thuong`: như người chơi thường của màn thường (bấm chậm, không Đền, chưa rèn).
 * Quân mẫu 38 chỗ (`challengeArmy`), tướng khi đã hết truyện (`lateHero`), trừ thử thách Không tướng.
 */
export function fightChallenge(n: number, play: 'thuong' | 'gioi', id = 1, army = challengeArmy(n)): Battle {
  const def = STAGES[n - 1];
  const hero = challengeOf(n)!.kind === 'khongTuong' ? null : lateHero(n);
  const gioi = play === 'gioi';
  const b = startFieldBattle({
    id,
    stage: n,
    enemies: def.enemies,
    waves: def.waves,
    holdS: def.holdS,
    army,
    rows: DEFAULT_ROWS,
    hero,
    bonus: gioi ? TEMPLE_BONUS : 0,
    arms: gioi ? FULL_ARMS : undefined,
    ...challengeField(n),
  });
  return playOut(b, play);
}
