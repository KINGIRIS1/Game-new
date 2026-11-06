// Đo độ khó các trận ngoài bãi trên bố cục bãi chiến (`src/game/baiChien.ts`), theo đúng tiêu chí các test cân bằng,
// mỗi tiêu chí nhiều hạt giống. `node scripts/do-bai.mjs` nạp tệp này qua Vite.

import { BAI_THEO, baiById, baiOf, sdfCan, stageBai } from '../src/game/baiChien';
import { startFieldBattle, stepField, useSkill, type Battle, type FieldSetup, type HeroSetup } from '../src/game/battle';
import { CAMP1_ARMY, CAMPS } from '../src/game/benKia';
import { CHALLENGES, DEFAULT_ROWS, FIELD, STAGES, TEMPLE_BONUS, type SkillId } from '../src/game/defs';
import { HALF_ARMY, HALF_ARMY4, SAMPLE_ARMY, SAMPLE_ARMY4, fightChallenge, playOut, type Army } from '../src/game/testkit';

/** Một tiêu chí: tên, kết quả mong muốn, và cách đánh một trận với hạt giống `id`. */
interface TieuChi {
  tran: string;
  ten: string;
  muon: 'win' | 'lose';
  danh: (id: number) => Battle;
}

export interface Dong {
  tran: string;
  ten: string;
  muon: 'win' | 'lose';
  dat: number;
  so: number;
  /** Thời gian trận trung vị và lâu nhất (giây). */
  giuaS: number;
  lauS: number;
  /** Số lính kẹt: đang đi mà hơn 3 giây dời chưa tới 0,05 ô (kể cả bị đám đông chặn). */
  ket: number;
  /** Trong số ấy, số lính kẹt cách vật cản dưới 1 ô. */
  ketCan: number;
  /** Số trận thắng mà tướng ngã giữa trận (tướng sẽ phải nghỉ). */
  tuongNga: number;
}

const half = (a: Army): Army => ({ giao: Math.floor(a.giao / 2), cung: Math.floor(a.cung / 2), voi: Math.floor(a.voi / 2), no: Math.floor(a.no / 2) });

const SAMPLE1: Record<number, Army> = {
  1: { giao: 6, cung: 0, voi: 0, no: 0 },
  2: { giao: 8, cung: 3, voi: 0, no: 0 },
  3: { giao: 8, cung: 5, voi: 1, no: 0 },
  4: { giao: 8, cung: 6, voi: 2, no: 0 },
  5: { giao: 8, cung: 6, voi: 2, no: 0 },
  6: { giao: 10, cung: 9, voi: 3, no: 0 },
  7: { giao: 10, cung: 9, voi: 3, no: 0 },
  8: { giao: 14, cung: 12, voi: 4, no: 0 },
};
const GIONG_ORDER: SkillId[] = ['trongTran', 'phunLua', 'nhoTre'];

/** Theo dõi lính kẹt trong một trận. */
function dem(): { step: (b: Battle) => void; ket: () => number; ketCan: () => number } {
  const since = new Map<number, { x: number; z: number; t: number }>();
  const stuck = new Set<number>();
  const near = new Set<number>();
  return {
    step(b) {
      const bai = baiById(b.bai);
      for (const f of b.fighters) {
        if (f.state !== 'move') {
          since.delete(f.id);
          continue;
        }
        const s = since.get(f.id);
        if (!s || Math.hypot(f.x - s.x, f.z - s.z) >= 0.05) since.set(f.id, { x: f.x, z: f.z, t: b.t });
        else if (b.t - s.t > 3 && !((f.stun ?? 0) > 0)) {
          stuck.add(f.id);
          if (bai && sdfCan(bai, f.x, f.z) < 1) near.add(f.id);
        }
      }
    },
    ket: () => stuck.size,
    ketCan: () => near.size,
  };
}

/** Đánh tới khi xong, bấm kỹ năng Gióng như `giong.test.ts` (bấm hết sau giây 3). */
function danhGiong(setup: FieldSetup, skills: boolean, onStep: (b: Battle) => void): Battle {
  const b = startFieldBattle(setup);
  for (let i = 0; i < 20 * 120 && !stepField(b, 0.05); i++) {
    onStep(b);
    if (skills && b.t > 3) for (const k of GIONG_ORDER) useSkill(b, k);
  }
  return b;
}

function stageSetup(n: number, army: Army, id: number, hero: HeroSetup | null = null): FieldSetup {
  const def = STAGES[n - 1];
  return { id, stage: n, enemies: def.enemies, hpScale: def.hpScale, army, rows: DEFAULT_ROWS, hero, bai: stageBai(n) };
}

function tieuChi(cac: string[]): TieuChi[] {
  const out: TieuChi[] = [];
  const want = (k: string) => !cac.length || cac.includes(k);
  let step: (b: Battle) => void = () => {};
  const on = (b: Battle) => step(b);
  for (let n = 1; n <= 4; n++) {
    if (!want(`m${n}`)) continue;
    const a = SAMPLE1[n];
    out.push({ tran: `màn ${n}`, ten: 'quân mẫu thắng', muon: 'win', danh: (id) => danhGiong(stageSetup(n, a, id), false, on) });
    out.push({ tran: `màn ${n}`, ten: 'nửa quân thua', muon: 'lose', danh: (id) => danhGiong(stageSetup(n, half(a), id), false, on) });
  }
  for (let n = 5; n <= 8; n++) {
    if (!want(`m${n}`)) continue;
    const a = SAMPLE1[n];
    const g: HeroSetup = { kind: 'giong', bamboo: n > 6, glow: false, non: false };
    out.push({ tran: `màn ${n}`, ten: 'có Gióng, bấm kỹ năng thắng', muon: 'win', danh: (id) => danhGiong(stageSetup(n, a, id, g), true, on) });
    out.push({ tran: `màn ${n}`, ten: 'không Gióng thua', muon: 'lose', danh: (id) => danhGiong(stageSetup(n, a, id), true, on) });
    out.push({ tran: `màn ${n}`, ten: 'nửa quân thua', muon: 'lose', danh: (id) => danhGiong(stageSetup(n, half(a), id, g), true, on) });
    if (n === 8) out.push({ tran: 'màn 8', ten: 'không bấm kỹ năng thua', muon: 'lose', danh: (id) => danhGiong(stageSetup(n, a, id, g), false, on) });
  }
  const camp = (tier: 1 | 2 | 3 | 4, army: Army, hero: HeroSetup | null, play: 'thuong' | 'gioi', id: number) => {
    const def = CAMPS[tier];
    const b = startFieldBattle({ id, stage: 0, enemies: def.enemies, hpScale: def.hpScale, army, rows: DEFAULT_ROWS, hero, bonus: play === 'thuong' ? 0 : TEMPLE_BONUS, bai: baiOf(def.terrain, def.chapter) });
    return playOut(b, play, on);
  };
  if (want('d1')) {
    out.push({ tran: 'đồn 1', ten: 'quân mẫu thắng', muon: 'win', danh: (id) => camp(1, CAMP1_ARMY, null, 'thuong', id) });
    out.push({ tran: 'đồn 1', ten: 'nửa quân, chơi giỏi thua', muon: 'lose', danh: (id) => camp(1, { giao: 5, cung: 3, voi: 1, no: 0 }, null, 'gioi', id) });
  }
  const HEROES: [2 | 4, HeroSetup][] = [
    [2, { kind: 'giong', bamboo: true, glow: true, non: false }],
    [4, { kind: 'anDuong', bamboo: false, glow: false, non: false, kimQuy: true }],
  ];
  for (const [tier, hero] of HEROES) {
    if (!want(`d${tier}`)) continue;
    const army = tier === 4 ? SAMPLE_ARMY4 : SAMPLE_ARMY;
    const halfA = tier === 4 ? HALF_ARMY4 : HALF_ARMY;
    out.push({ tran: `đồn ${tier}`, ten: 'có tướng, chơi thường thắng', muon: 'win', danh: (id) => camp(tier, army, hero, 'thuong', id) });
    out.push({ tran: `đồn ${tier}`, ten: 'không tướng, chơi giỏi thua', muon: 'lose', danh: (id) => camp(tier, army, null, 'gioi', id) });
    out.push({ tran: `đồn ${tier}`, ten: 'nửa quân, chơi giỏi thua', muon: 'lose', danh: (id) => camp(tier, halfA, hero, 'gioi', id) });
  }
  for (let n = 1; n <= 8; n++) {
    if (!want(`t${n}`)) continue;
    const kind = CHALLENGES[n - 1].kind;
    // Thử thách đánh hết trong `fightChallenge`, không đếm lính kẹt.
    out.push({ tran: `thử thách ${n}`, ten: `${kind}: chơi giỏi thắng`, muon: 'win', danh: (id) => fightChallenge(n, 'gioi', id) });
    out.push({ tran: `thử thách ${n}`, ten: `${kind}: chơi thường thua`, muon: 'lose', danh: (id) => fightChallenge(n, 'thuong', id) });
  }
  // Gắn bộ đếm kẹt cho trận đang đánh.
  return out.map((c) => ({
    ...c,
    danh: (id: number) => {
      const d = dem();
      step = d.step;
      const b = c.danh(id);
      Object.assign(b, { _ket: d.ket(), _ketCan: d.ketCan() });
      return b;
    },
  }));
}

/**
 * Đo các tiêu chí `cac` (rỗng là tất cả: `m1`…`m8` màn, `d1`, `d2`, `d4` đồn, `t1`…`t8` thử thách) với `seeds` hạt
 * giống. `phang`: bỏ mọi bố cục, đo trên bãi phẳng để có mức gốc.
 */
export function doBai(opts: { cac?: string[]; seeds?: number; phang?: boolean }): Dong[] {
  const saved = { ...BAI_THEO };
  if (opts.phang) for (const k of Object.keys(BAI_THEO)) delete (BAI_THEO as Record<string, unknown>)[k];
  try {
    const n = opts.seeds ?? 10;
    const rows: Dong[] = [];
    for (const c of tieuChi(opts.cac ?? [])) {
      const ts: number[] = [];
      let dat = 0;
      let ket = 0;
      let ketCan = 0;
      let tuongNga = 0;
      for (let id = 1; id <= n; id++) {
        const b = c.danh(id);
        const outcome = b.outcome ?? 'lose';
        if (outcome === c.muon && (c.muon === 'lose' || b.t < FIELD.maxS)) dat++;
        ts.push(b.t);
        const k = b as Battle & { _ket?: number; _ketCan?: number };
        ket += k._ket ?? 0;
        ketCan += k._ketCan ?? 0;
        if (outcome === 'win' && b.hero?.down) tuongNga++;
      }
      ts.sort((a, b) => a - b);
      rows.push({ tran: c.tran, ten: c.ten, muon: c.muon, dat, so: n, giuaS: ts[Math.floor(ts.length / 2)], lauS: ts[ts.length - 1], ket, ketCan, tuongNga });
    }
    return rows;
  } finally {
    Object.assign(BAI_THEO, saved);
  }
}

/** Bảng Markdown của kết quả đo. */
export function inBang(rows: Dong[], phang: boolean): string {
  const lines = [
    `Bãi ${phang ? 'phẳng (mức gốc)' : 'có vật cản'}. Đạt: số hạt giống ra đúng kết quả mong muốn (thắng thì phải xong trước ${FIELD.maxS} giây).`,
    '',
    'Lính kẹt: đang đi mà hơn 3 giây dời chưa tới 0,05 ô (kể cả bị đám đông chặn); cạnh vật cản: kẹt cách vật cản dưới 1 ô. Thử thách không đếm kẹt.',
    '',
    '| Trận | Tiêu chí | Đạt | Giữa (s) | Lâu nhất (s) | Lính kẹt | Kẹt cạnh vật cản | Thắng mà tướng ngã |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    const flag = r.dat < r.so * 0.9 ? ' ⚠' : '';
    lines.push(`| ${r.tran} | ${r.ten} | ${r.dat}/${r.so}${flag} | ${r.giuaS.toFixed(1)} | ${r.lauS.toFixed(1)} | ${r.ket} | ${r.ketCan} | ${r.tuongNga} |`);
  }
  return lines.join('\n');
}
