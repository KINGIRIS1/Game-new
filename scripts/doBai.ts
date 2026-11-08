// Đo độ khó các trận ngoài bãi trên bố cục bãi chiến (`src/game/baiChien.ts`), theo đúng tiêu chí các test cân bằng,
// mỗi tiêu chí nhiều hạt giống. `node scripts/do-bai.mjs` nạp tệp này qua Vite.

import { BAI_THEO, baiById, baiOf, sdfCan, stageBai } from '../src/game/baiChien';
import { startFieldBattle, stepField, useSkill, type Battle, type FieldSetup, type HeroSetup } from '../src/game/battle';
import { CAMP1_ARMY, CAMPS } from '../src/game/benKia';
import { CHALLENGES, DEFAULT_ROWS, FIELD, STAGES, TEMPLE_BONUS, type SkillId } from '../src/game/defs';
import { HALF_ARMY, HALF_ARMY4, SAMPLE_ARMY, SAMPLE_ARMY4, fightChallenge, fightStage, playOut, type Army } from '../src/game/testkit';

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
  // `c1`…`c5`: mọi màn, thử thách, đồn của chương ấy (đồn bậc 1, 2, 4 tính vào chương 1, bậc 3 vào chương 3).
  const chuong = (k: string) => {
    const n = Number(k.slice(1));
    if (k[0] === 'd') return n === 3 ? 3 : 1;
    return STAGES[n - 1]?.chapter ?? 0;
  };
  const want = (k: string) => !cac.length || cac.includes(k) || cac.includes(`c${chuong(k)}`);
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
  // Chương 2, 3 (`chuong2.test.ts`, `chuong3.test.ts`): người chơi thường có tướng thì thắng; không tướng, hay nửa quân,
  // chơi giỏi cũng thua.
  const GIONG: HeroSetup = { kind: 'giong', bamboo: true, glow: true, non: false };
  const SON: HeroSetup = { kind: 'sonTinh', bamboo: false, glow: true, non: true };
  const tuong = (n: number): HeroSetup =>
    n <= 11 ? GIONG : n <= 16 ? { kind: 'sonTinh', bamboo: false, glow: false, non: n > 14 } : n <= 19 ? SON : { kind: 'anDuong', bamboo: false, glow: false, non: false, kimQuy: n > 22 };
  for (let n = 9; n <= 24; n++) {
    if (!want(`m${n}`)) continue;
    const h = tuong(n);
    const ten = `màn ${n}`;
    out.push({ tran: ten, ten: 'có tướng, chơi thường thắng', muon: 'win', danh: (id) => fightStage(n, SAMPLE_ARMY, h, 'thuong', id, undefined, on) });
    out.push({ tran: ten, ten: 'không tướng, chơi giỏi thua', muon: 'lose', danh: (id) => fightStage(n, SAMPLE_ARMY, null, 'gioi', id, undefined, on) });
    out.push({ tran: ten, ten: 'nửa quân, chơi giỏi thua', muon: 'lose', danh: (id) => fightStage(n, HALF_ARMY, h, 'gioi', id, undefined, on) });
    if (n >= 12 && n <= 15) out.push({ tran: ten, ten: 'Gióng thay Sơn Tinh, chơi giỏi thắng', muon: 'win', danh: (id) => fightStage(n, SAMPLE_ARMY, GIONG, 'gioi', id, undefined, on) });
    if (n === 15) out.push({ tran: ten, ten: 'Gióng thay Sơn Tinh, chơi thường thua', muon: 'lose', danh: (id) => fightStage(n, SAMPLE_ARMY, GIONG, 'thuong', id, undefined, on) });
    if (n === 16) out.push({ tran: ten, ten: 'Gióng thay Sơn Tinh, chơi giỏi thua', muon: 'lose', danh: (id) => fightStage(n, SAMPLE_ARMY, GIONG, 'gioi', id, undefined, on) });
    if (n === 16 || n === 24) out.push({ tran: ten, ten: 'không bấm kỹ năng thua', muon: 'lose', danh: (id) => fightStage(n, SAMPLE_ARMY, h, 'khongBam', id, undefined, on) });
  }
  // Chương 4 (`caoLo.test.ts`): màn 25 An Dương Vương, từ màn 26 Cao Lỗ (Lệnh bắn sau màn 30). Chương 5 (`chuong5.test.ts`,
  // `maVien.test.ts`): Hai Bà, Trưng Nhị có Hiệu triệu sau màn 33. Quân mẫu chương 4 có lính nỏ.
  const cao = (n: number): HeroSetup =>
    n === 25 ? { kind: 'anDuong', bamboo: false, glow: false, non: false, kimQuy: true } : { kind: 'caoLo', bamboo: false, glow: false, non: false, lenhBan: n > 30 };
  const haiBa = (n: number): HeroSetup[] => [
    { kind: 'trungTrac', bamboo: false, glow: false, non: false },
    { kind: 'trungNhi', bamboo: false, glow: false, non: false, hieuTrieu: n > 33 },
  ];
  for (let n = 25; n <= STAGES.length; n++) {
    if (!want(`m${n}`)) continue;
    const h = n <= 32 ? cao(n) : haiBa(n);
    const ten = `màn ${n}`;
    out.push({ tran: ten, ten: 'có tướng, chơi thường thắng', muon: 'win', danh: (id) => fightStage(n, SAMPLE_ARMY4, h, 'thuong', id, undefined, on) });
    out.push({ tran: ten, ten: 'không tướng, chơi giỏi thua', muon: 'lose', danh: (id) => fightStage(n, SAMPLE_ARMY4, null, 'gioi', id, undefined, on) });
    out.push({ tran: ten, ten: 'nửa quân, chơi giỏi thua', muon: 'lose', danh: (id) => fightStage(n, HALF_ARMY4, h, 'gioi', id, undefined, on) });
    if ([28, 32, 36, 39, 40].includes(n)) out.push({ tran: ten, ten: 'không bấm kỹ năng thua', muon: 'lose', danh: (id) => fightStage(n, SAMPLE_ARMY4, h, 'khongBam', id, undefined, on) });
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
  const HEROES: [2 | 3 | 4, HeroSetup][] = [
    [2, GIONG],
    [3, SON],
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
  for (let n = 1; n <= CHALLENGES.length; n++) {
    if (!want(`t${n}`)) continue;
    const kind = CHALLENGES[n - 1].kind;
    out.push({ tran: `thử thách ${n}`, ten: `${kind}: chơi giỏi thắng`, muon: 'win', danh: (id) => fightChallenge(n, 'gioi', id, undefined, on) });
    out.push({ tran: `thử thách ${n}`, ten: `${kind}: chơi thường thua`, muon: 'lose', danh: (id) => fightChallenge(n, 'thuong', id, undefined, on) });
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
 * Đo các tiêu chí `cac` (rỗng là tất cả: `m1`…`m40` màn, `d1`…`d4` đồn, `t1`…`t40` thử thách, `c1`…`c5` cả chương)
 * với `seeds` hạt giống. `phang`: bỏ mọi bố cục, đo trên bãi phẳng để có mức gốc.
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
        // Màn cầm cự thắng khi giữ đủ giờ, có khi quá thời hạn trận thường.
        if (outcome === c.muon && (c.muon === 'lose' || b.holdS !== undefined || b.t < FIELD.maxS)) dat++;
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
    'Lính kẹt: đang đi mà hơn 3 giây dời chưa tới 0,05 ô (kể cả bị đám đông chặn); cạnh vật cản: kẹt cách vật cản dưới 1 ô.',
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
