// Đánh thử một màn phó bản cho các test cân bằng chương 2, 3, 4 và thử thách, theo cách chơi chuẩn đã chốt với chủ dự án.

import { skillReady, startFieldBattle, stepField, useSkill, type Battle, type HeroSetup } from './battle';
import { baiOf, stageBai } from './baiChien';
import { DEFAULT_ROWS, SKILL_IDS, STAGES, TEMPLE_BONUS, UNITS, type Chapter, type EnemyType, type SkillId, type Terrain, type UnitType } from './defs';
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

/** Đánh thử màn `stage`. `hero` là một tướng, hay hai tướng cùng ra trận (Hai Bà Trưng ở chương 5). */
export function fightStage(
  stage: number,
  army: Army,
  hero: HeroSetup | HeroSetup[] | null,
  play: Play,
  id = 1,
  hpScale = STAGES[stage - 1].hpScale,
  onStep?: (b: Battle) => void,
): Battle {
  const def = STAGES[stage - 1];
  const bonus = play === 'thuong' ? 0 : TEMPLE_BONUS;
  const [h1 = null, h2 = null] = Array.isArray(hero) ? hero : [hero];
  const b = startFieldBattle({ id, stage, enemies: def.enemies, waves: def.waves, holdS: def.holdS, hpScale, army, rows: DEFAULT_ROWS, hero: h1, hero2: h2, bonus, bai: stageBai(stage) });
  return playOut(b, play, onStep);
}

/**
 * Đánh thử một trận ngoài bãi với quân giặc `foe` (đồn giặc bên kia sông), theo cùng cách chơi như màn phó bản. Đồn
 * có nền và chương (`CAMPS`) thì đánh trên bố cục bãi chiến của đồn ấy.
 */
export function fightField(
  foe: { enemies: Partial<Record<EnemyType, number>>; hpScale: number; terrain?: Terrain; chapter?: Chapter },
  army: Army,
  hero: HeroSetup | null,
  play: Play,
  id = 1,
): Battle {
  const bonus = play === 'thuong' ? 0 : TEMPLE_BONUS;
  const bai = foe.terrain && foe.chapter ? baiOf(foe.terrain, foe.chapter) : null;
  const b = startFieldBattle({ id, stage: 0, enemies: foe.enemies, hpScale: foe.hpScale, army, rows: DEFAULT_ROWS, hero, bonus, bai });
  return playOut(b, play);
}

/** Đánh tới khi xong trận (hay hết giờ), bấm kỹ năng theo cách chơi `play`. `onStep` được gọi sau mỗi bước. */
export function playOut(b: Battle, play: Play, onStep?: (b: Battle) => void): Battle {
  const readySince: Partial<Record<SkillId, number>> = {};
  for (let i = 0; i < 20 * 120 && !stepField(b, 0.05); i++) {
    onStep?.(b);
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
 * Cao Lỗ có Lệnh bắn ở màn 26–32, Hai Bà hiển linh (Trưng Nhị có Hiệu triệu) ở chương 5. Đúng như `heroesFor` chọn
 * khi đã qua màn 40. `lateHero` là tướng đầu.
 */
export function lateHeroes(n: number): HeroSetup[] {
  const chapter = STAGES[n - 1].chapter;
  if (chapter === 1) return [{ kind: 'giong', bamboo: true, glow: true, non: false }];
  if (chapter === 2) return [{ kind: 'sonTinh', bamboo: false, glow: true, non: true }];
  if (chapter === 3 || n === 25) return [{ kind: 'anDuong', bamboo: false, glow: true, non: false, kimQuy: true }];
  if (chapter === 4) return [{ kind: 'caoLo', bamboo: false, glow: false, non: false, lenhBan: true }];
  return [
    { kind: 'trungTrac', bamboo: false, glow: true, non: false },
    { kind: 'trungNhi', bamboo: false, glow: true, non: false, hieuTrieu: true },
  ];
}

export const lateHero = (n: number): HeroSetup => lateHeroes(n)[0];

/**
 * Quân mẫu của thử thách màn `n`, 38 chỗ: quân mẫu chương (chương 4, 5 có lính nỏ). Thử thách Hai binh chủng thì chia
 * đôi số chỗ cho hai binh chủng được mang, phần lẻ cho binh chủng nhẹ hơn.
 */
export function challengeArmy(n: number): Army {
  const ch = challengeOf(n)!;
  if (ch.kind !== 'haiBinh') return { ...(STAGES[n - 1].chapter >= 4 ? SAMPLE_ARMY4 : SAMPLE_ARMY) };
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
 * Quân mẫu 38 chỗ (`challengeArmy`), tướng khi đã hết truyện (`lateHeroes`), trừ thử thách Không tướng.
 */
export function fightChallenge(n: number, play: 'thuong' | 'gioi', id = 1, army = challengeArmy(n), onStep?: (b: Battle) => void): Battle {
  const def = STAGES[n - 1];
  const [hero = null, hero2 = null] = challengeOf(n)!.kind === 'khongTuong' ? [] : lateHeroes(n);
  const gioi = play === 'gioi';
  const b = startFieldBattle({
    id,
    stage: n,
    waves: def.waves,
    holdS: def.holdS,
    army,
    rows: DEFAULT_ROWS,
    hero,
    hero2,
    bonus: gioi ? TEMPLE_BONUS : 0,
    arms: gioi ? FULL_ARMS : undefined,
    bai: stageBai(n),
    ...challengeField(n),
  });
  return playOut(b, play, onStep);
}
