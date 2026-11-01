// Đánh thử một màn phó bản cho các test cân bằng chương 2, 3, 4, theo cách chơi chuẩn đã chốt với chủ dự án.

import { skillReady, startFieldBattle, stepField, useSkill, type Battle, type HeroSetup } from './battle';
import { DEFAULT_ROWS, SKILL_IDS, STAGES, TEMPLE_BONUS, type SkillId, type UnitType } from './defs';

export type Army = Record<UnitType, number>;
/** Quân mẫu chương 2, 3: vừa đúng 38 chỗ doanh trại cấp 5. */
export const SAMPLE_ARMY: Army = { giao: 14, cung: 12, voi: 4, no: 0 };
export const HALF_ARMY: Army = { giao: 7, cung: 6, voi: 2, no: 0 };
/** Quân mẫu chương 4: thêm lính nỏ, vẫn đúng 38 chỗ. */
export const SAMPLE_ARMY4: Army = { giao: 11, cung: 10, voi: 3, no: 4 };
export const HALF_ARMY4: Army = { giao: 6, cung: 5, voi: 1, no: 2 };

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
