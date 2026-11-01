// Mẫu kinh đô: mỗi chương mở một mẫu bố trí công trình quanh Điện Vua Hùng. Áp mẫu thì dời mọi công trình
// đang có vào chỗ trong mẫu và dựng thêm phần mẫu có mà mình chưa có (trong giới hạn theo cấp Điện, trong
// vùng đất đã khai phá). Phải đủ tài nguyên để dựng phần thiếu và trả phí dời thì mới áp được.

import { BUILDINGS, type BuildingType, type Cost, RESOURCE_IDS } from './defs';
import { inChapter3 } from './coLoa';
import {
  barracksLevel,
  canAfford,
  dienLevel,
  fillWorkers,
  limitOf,
  usedOf,
  moveCost,
  pay,
  unlocked,
  type Building,
  type GameState,
  type Result,
} from './game';
import { DIEN_HOME, GRID, inGrid, isUnlocked, touchesRiver } from './map';
import { inChapter2 } from './son';
import { footprintTop, levelFootprint } from './terrain';

export type MauId = 'phongChau' | 'deBao' | 'coLoa';
export const MAU_IDS: MauId[] = ['phongChau', 'deBao', 'coLoa'];

/** Chữ trong bản vẽ mẫu ứng với loại công trình. `H` là Điện Vua Hùng (đứng yên, mẫu vẽ quanh Điện). */
const CHAR_TYPE: Record<string, BuildingType> = {
  H: 'dien',
  R: 'ruong',
  B: 'ben',
  N: 'nhaSan',
  D: 'baiDa',
  L: 'loRen',
  K: 'kho',
  T: 'doanhTrai',
  G: 'traiGiao',
  U: 'traiCung',
  E: 'chuongVoi',
  C: 'choiCanh',
  X: 'bayChong',
  '#': 'luy',
  '=': 'de',
  O: 'thanh',
  P: 'denPhuDong',
  V: 'denTanVien',
  A: 'denCoLoa',
  n: 'ruongNep',
  v: 'vuon',
  l: 'chuongLon',
  b: 'bep',
};

/**
 * Bản vẽ ba mẫu, mỗi dòng là một hàng ô theo z, mỗi chữ một ô theo x, bắt đầu từ ô (origin, origin).
 * Sông ở x, z từ 52 trở lên. Điện Vua Hùng ở ô (37, 37). Giữa các khối nhà chừa lối đi một ô, trước Điện chừa sân.
 * - Phong Châu (chương 1, vẽ cho Điện cấp 5): lũy tre bao hai mặt rừng, bẫy chông trước lũy.
 * - Đê bao (chương 2, vẽ cho Điện cấp 6): đê liền dải dọc hai bờ sông (cách sông 3 ô), bến ngoài đê, chòi canh sát đê.
 * - Cổ Loa (chương 3, vẽ cho Điện cấp 7): ba vòng thành kín quanh Điện, đê bao ngoài cùng.
 */
const DRAWINGS: Record<MauId, { origin: number; rows: string[] }> = {
  phongChau: {
    origin: 17,
    rows: [
      '....X.....X.....X.....X.....X......',
      '.##################################',
      '.#C............C............C......',
      '.#.................................',
      'X#..DDD.DDD.DDD.....LLL.DDD........',
      '.#..DDD.DDD.DDD.....LLL.DDD........',
      '.#..DDD.DDD.DDD.....LLL.DDD........',
      '.#.................................',
      '.#..TTTT.GGG..PPPP.nnnn.nnnn.......',
      '.#..TTTT.GGG..PPPP.nnnn.nnnn.......',
      'X#..TTTT.GGG..PPPP.nnnn.nnnn.RRRR..',
      '.#..TTTT......PPPP.nnnn.nnnn.RRRR..',
      '.#.......UUU.................RRRR..',
      '.#..EEE..UUU.vvv.bbb.........RRRR..',
      '.#..EEE..UUU.vvv.bbb...............',
      '.#C.EEE......vvv.bbbNNN.NNN..RRRR..',
      'X#......LLL.........NNN.NNN..RRRR..',
      '.#......LLL..lll....NNN.NNN..RRRR..',
      '.#......LLL..lll.............RRRR..',
      '.#...........lll...................',
      '.#..............KKK.HHHHH.NNN......',
      '.#..NNN.NNN.KKK.KKK.HHHHH.NNN......',
      'X#..NNN.NNN.KKK.KKK.HHHHH.NNN......',
      '.#..NNN.NNN.KKK.....HHHHH..........',
      '.#..............KKK.HHHHH.......BBB',
      '.#..............KKK.............BBB',
      '.#..RRRR.RRRR...KKK.............BBB',
      '.#..RRRR.RRRR......................',
      'X#C.RRRR.RRRR...................BBB',
      '.#..RRRR.RRRR.RRRR.RRRR.........BBB',
      '.#............RRRR.RRRR.........BBB',
      '.#............RRRR.RRRR............',
      '.#....BBB.....RRRR.RRRR..BBB.......',
      '.#....BBB................BBB.......',
      '.#....BBB................BBB.......',
    ],
  },
  deBao: {
    origin: 12,
    rows: [
      '....X.....X.....X.....X.....X.....X.=...',
      '.C..................................=...',
      '..DDD.DDD.DDD.DDD.DDD.TTTT.GGG.RRRR.=...',
      '..DDD.DDD.DDD.DDD.DDD.TTTT.GGG.RRRR.=...',
      '..DDD.DDD.DDD.DDD.DDD.TTTT.GGG.RRRRC=...',
      'X.....................TTTT.....RRRR.=...',
      '..LLL.LLL.LLL..............UUU......=...',
      '..LLL.LLL.LLL.........EEE..UUU.RRRR.=...',
      '..LLL.LLL.LLL.........EEE..UUU.RRRR.=...',
      '......................EEE......RRRR.=...',
      '...............................RRRR.=...',
      'X.PPPP.nnnn.........................=...',
      '..PPPP.nnnn....................RRRR.=...',
      '..PPPP.nnnn....................RRRR.=...',
      '..PPPP.nnnn...NNN.NNN.NNN......RRRR.=...',
      '..............NNN.NNN.NNN......RRRR.=...',
      '..VVVV.nnnn...NNN.NNN.NNN..........C=...',
      'X.VVVV.nnnn....................RRRR.=...',
      '..VVVV.nnnn...NNN.NNN.NNN......RRRR.=BBB',
      '..VVVV.nnnn...NNN.NNN.NNN......RRRR.=BBB',
      '..............NNN.NNN.NNN.bbb..RRRR.=BBB',
      '..vvv.vvv.................bbb.......=...',
      '..vvv.vvv.................bbb..RRRR.=...',
      'X.vvv.vvv......................RRRR.=...',
      '...............................RRRR.=...',
      '..lll.lll........KKK.KKK.HHHHH.RRRR.=...',
      '..lll.lll........KKK.KKK.HHHHH......=...',
      '..lll.lll........KKK.KKK.HHHHH......=...',
      '.........................HHHHH.....C=...',
      'X....................KKK.HHHHH......=...',
      '.....................KKK............=...',
      '..RRRR.RRRR..........KKK............=...',
      '..RRRR.RRRR.........................=...',
      '..RRRR.RRRR.........................=...',
      'X.RRRR.RRRR.........................=...',
      '........C...........C...............=...',
      '=====================================...',
      '....BBB.......BBB.......BBB.............',
      '....BBB.......BBB.......BBB.............',
      '....BBB.......BBB.......BBB.............',
    ],
  },
  coLoa: {
    origin: 12,
    rows: [
      '......X....X....X....X....X....X...X=...',
      '.TTTT.RRRR.RRRR.RRRR.RRRR.RRRR.AAAA.=...',
      '.TTTT.RRRR.RRRR.RRRR.RRRR.RRRR.AAAA.=...',
      '.TTTT.RRRR.RRRR.RRRR.RRRR.RRRR.AAAA.=...',
      '.TTTT.RRRR.RRRR.RRRR.RRRR.RRRR.AAAA.=...',
      '..........DDD.DDD.DDD.DDD.DDD.......=...',
      'XRRRRGGG..DDD.DDD.DDD.DDD.DDD..LLL..=...',
      '.RRRRGGG..DDD.DDD.DDD.DDD.DDDC.LLL..=...',
      '.RRRRGGG.......................LLL..=...',
      '.RRRR....OOOOOOOOOOOOOOOOOOOOOOOOOO.=...',
      '.....UUU.Onnnn....................O.=...',
      'XRRRRUUU.Onnnn..NNN.NNN.LLL.lll...O.=...',
      '.RRRRUUU.Onnnn..NNN.NNN.LLL.lll..CO.=BBB',
      '.RRRR....Onnnn..NNN.NNN.LLL.lll...O.=BBB',
      '.RRRREEE.O........................O.=BBB',
      '.....EEE.O.bbb.OOOOOOOOOOOOOOOOOOOO.=...',
      'XRRRREEE.O.bbb.O.................OO.=...',
      '.RRRR....O.bbb.O.NNN.NNN.KKK.LLL.OO.=...',
      '.RRRR...CO.....O.NNN.NNN.KKK.LLL.OO.=...',
      '.RRRRKKK.O.vvv.O.NNN.NNN.KKK.LLL.OO.=...',
      '.....KKK.O.vvv.O.................OO.=...',
      'XPPPPKKK.O.vvv.O.NNN.OOOOOOOOOOOOOO.=...',
      '.PPPP....O.....O.NNN.O.........COOO.=...',
      '.PPPP..C.O.vvv.O.NNN.OC.........OOO.=...',
      '.PPPP....O.vvv.O.....O..........OOO.=...',
      '.........O.vvv.O.NNN.O...HHHHH..OOO.=...',
      'XVVVVNNN.O.....O.NNN.O...HHHHH..OOO.=...',
      '.VVVVNNN.O.lll.O.NNN.O...HHHHH..OOO.=...',
      '.VVVVNNN.O.lll.O.....O...HHHHH..OOO.=...',
      '.VVVV....O.lll.O.KKK.O...HHHHH..OOO.=...',
      '.........O.....O.KKK.O..........OOO.=...',
      'Xnnnn..C.O.KKK.O.KKK.O..........OOO.=...',
      '.nnnn....O.KKK.O.....OOOOOOOOOOOOOO.=...',
      '.nnnn....O.KKK.OOOOOOOOOOOOOOOOOOOO.=...',
      '.nnnn....OOOOOOOOOOOOOOOOOOOOOOOOOO.=...',
      'X...................................=...',
      '=====================================...',
      '..BBB.....BBB.....BBB.....BBB...........',
      '..BBB.....BBB.....BBB.....BBB...........',
      '..BBB.....BBB.....BBB.....BBB...........',
    ],
  },
};

/** Một chỗ trong mẫu: loại công trình và góc móng (x, z). */
export interface Slot {
  type: BuildingType;
  x: number;
  z: number;
}

/** Đọc bản vẽ: mỗi khối chữ liền nhau đúng cỡ móng là một công trình, đọc từ trên xuống, trái sang phải. */
function parse({ origin, rows }: { origin: number; rows: string[] }): Slot[] {
  const taken = rows.map((r) => Array.from(r, () => false));
  const slots: Slot[] = [];
  for (let z = 0; z < rows.length; z++) {
    for (let x = 0; x < rows[z].length; x++) {
      const ch = rows[z][x];
      if (ch === '.' || taken[z][x]) continue;
      const type = CHAR_TYPE[ch];
      if (!type) throw new Error(`Chữ lạ '${ch}' trong mẫu ở (${x + origin}, ${z + origin})`);
      const { w, d } = BUILDINGS[type];
      for (let dz = 0; dz < d; dz++) {
        for (let dx = 0; dx < w; dx++) {
          if (rows[z + dz]?.[x + dx] !== ch || taken[z + dz][x + dx]) throw new Error(`Móng ${type} ở (${x + origin}, ${z + origin}) không đủ ô`);
          taken[z + dz][x + dx] = true;
        }
      }
      slots.push({ type, x: x + origin, z: z + origin });
    }
  }
  return slots;
}

const PARSED = new Map<MauId, Slot[]>();
/** Mọi chỗ trong mẫu (cả Điện). */
export function mauSlots(id: MauId): Slot[] {
  let list = PARSED.get(id);
  if (!list) {
    list = parse(DRAWINGS[id]);
    PARSED.set(id, list);
  }
  return list;
}

/** Mỗi chương mở một mẫu: Phong Châu từ đầu, Đê bao khi vào chương 2, Cổ Loa khi vào chương 3. */
export function mauUnlocked(state: GameState, id: MauId): boolean {
  if (id === 'deBao') return inChapter2(state);
  if (id === 'coLoa') return inChapter3(state);
  return true;
}

/** Công trình một ô gắn với đất (lũy, đê, thành, bẫy): áp mẫu thì đoạn thừa bị dỡ đi, không dời. */
const SEGMENTS: BuildingType[] = ['luy', 'de', 'thanh', 'bayChong'];

export interface MauPlan {
  /** Công trình đang có sẽ dời tới chỗ mới. */
  moves: { id: number; x: number; z: number }[];
  /** Công trình sẽ dựng thêm. */
  builds: Slot[];
  /** Đoạn lũy, đê, thành, bẫy sẽ dỡ đi (thừa so với mẫu, hay vướng chỗ của mẫu). */
  removes: number[];
  /** Tổng giá: dựng phần thiếu và phí dời. */
  cost: Cost;
  /** Công trình không còn chỗ nào để xếp (mẫu không áp được). */
  stuck: number[];
}

const addCost = (a: Cost, b: Cost) => {
  for (const r of RESOURCE_IDS) if (b[r]) a[r] = (a[r] ?? 0) + b[r]!;
};

/** Lên kế hoạch áp mẫu `id` cho kinh đô hiện tại, chưa đổi gì. */
export function planMau(state: GameState, id: MauId): MauPlan {
  const level = dienLevel(state);
  const dien = state.buildings.find((b) => b.type === 'dien')!;
  // Mẫu vẽ cho Điện ở (DIEN_HOME, DIEN_HOME); Điện ở chỗ khác thì dịch cả mẫu theo.
  const ox = dien.x - DIEN_HOME;
  const oz = dien.z - DIEN_HOME;
  const fits = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (!inGrid(x + dx, z + dz) || !isUnlocked(x + dx, z + dz, level)) return false;
    return !def.nearRiver || touchesRiver(x, z, def.w, def.d);
  };
  const used = new Uint8Array(GRID * GRID);
  const mark = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) used[(z + dz) * GRID + x + dx] = 1;
  };
  const free = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (used[(z + dz) * GRID + x + dx]) return false;
    return true;
  };
  mark('dien', dien.x, dien.z);

  const plan: MauPlan = { moves: [], builds: [], removes: [], cost: {}, stuck: [] };
  const slots = mauSlots(id)
    .filter((s) => s.type !== 'dien')
    .map((s) => ({ ...s, x: s.x + ox, z: s.z + oz }))
    .filter((s) => fits(s.type, s.x, s.z));
  // Doanh trại xếp trước nơi ở riêng của các binh chủng, vì nơi ở cần doanh trại.
  const types = [...new Set(slots.map((s) => s.type))].sort((a, b) => Number(b === 'doanhTrai') - Number(a === 'doanhTrai'));
  let barracks = barracksLevel(state);
  const leftovers: Building[] = [];
  const cx = dien.x + BUILDINGS.dien.w / 2;
  const cz = dien.z + BUILDINGS.dien.d / 2;
  for (const type of types) {
    const def = BUILDINGS[type];
    // Chỗ gần Điện xếp trước.
    const open = slots
      .filter((s) => s.type === type)
      .sort((a, b) => Math.hypot(a.x + def.w / 2 - cx, a.z + def.d / 2 - cz) - Math.hypot(b.x + def.w / 2 - cx, b.z + def.d / 2 - cz));
    // Lầu nỏ một ô như chòi canh, đứng vào chỗ chòi canh của mẫu và tính là hai chòi canh trong giới hạn.
    const sameSlot = (b: Building) => b.type === type || (type === 'choiCanh' && b.type === 'lauNo');
    const have = state.buildings.filter(sameSlot).sort((a, b) => b.level - a.level || a.id - b.id);
    // Công trình đã đứng đúng một chỗ trong mẫu thì giữ nguyên.
    const rest: Building[] = [];
    for (const b of have) {
      const i = open.findIndex((s) => s.x === b.x && s.z === b.z);
      if (i >= 0) {
        open.splice(i, 1);
        mark(type, b.x, b.z);
      } else rest.push(b);
    }
    // Còn lại: dời tới chỗ trống gần nhất của mẫu.
    for (const b of rest) {
      if (!open.length) {
        leftovers.push(b);
        continue;
      }
      let best = 0;
      for (let i = 1; i < open.length; i++) {
        if (Math.hypot(open[i].x - b.x, open[i].z - b.z) < Math.hypot(open[best].x - b.x, open[best].z - b.z)) best = i;
      }
      const s = open.splice(best, 1)[0];
      plan.moves.push({ id: b.id, x: s.x, z: s.z });
      addCost(plan.cost, moveCost(b));
      mark(type, s.x, s.z);
    }
    // Chỗ trống còn lại: dựng thêm cho tới giới hạn theo cấp Điện, nếu loại này đã mở.
    const canBuild = def.buildable && unlocked(state, def.unlock) && level >= def.minDien && barracks >= (def.barracksLevel ?? 0);
    let room = canBuild ? limitOf(state, type) - usedOf(state, type) : 0;
    for (const s of open) {
      if (room <= 0) break;
      plan.builds.push(s);
      addCost(plan.cost, def.buildCost);
      mark(type, s.x, s.z);
      room--;
      // Doanh trại dựng thêm theo mẫu ở cấp 1: đủ để dựng trại giáo cùng lúc.
      if (type === 'doanhTrai') barracks = Math.max(barracks, 1);
    }
  }
  // Công trình thừa hay không có trong mẫu: đứng yên nếu không vướng chỗ của mẫu; đoạn lũy, đê, thành, bẫy
  // thừa thì dỡ; công trình khác vướng thì tìm chỗ trống gần nhất.
  for (const b of state.buildings) {
    if (b.type === 'dien' || types.includes(b.type) || (b.type === 'lauNo' && types.includes('choiCanh'))) continue;
    leftovers.push(b);
  }
  const inMau = new Set(types);
  const blocked: Building[] = [];
  for (const b of leftovers) {
    if (SEGMENTS.includes(b.type) && inMau.has(b.type)) plan.removes.push(b.id);
    else if (free(b.type, b.x, b.z)) mark(b.type, b.x, b.z);
    else if (SEGMENTS.includes(b.type)) plan.removes.push(b.id);
    else blocked.push(b);
  }
  for (const b of blocked) {
    const spot = nearestFree(b, fits, free);
    if (!spot) {
      plan.stuck.push(b.id);
      continue;
    }
    plan.moves.push({ id: b.id, x: spot.x, z: spot.z });
    addCost(plan.cost, moveCost(b));
    mark(b.type, spot.x, spot.z);
  }
  return plan;
}

/** Chỗ trống gần công trình `b` nhất (theo khoảng cách ô) mà vẫn trong vùng và không vướng mẫu. */
function nearestFree(
  b: Building,
  fits: (type: BuildingType, x: number, z: number) => boolean,
  free: (type: BuildingType, x: number, z: number) => boolean,
): { x: number; z: number } | null {
  let best: { x: number; z: number; d: number } | null = null;
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      const d = Math.abs(x - b.x) + Math.abs(z - b.z);
      if (best && d >= best.d) continue;
      if (fits(b.type, x, z) && free(b.type, x, z)) best = { x, z, d };
    }
  }
  return best ? { x: best.x, z: best.z } : null;
}

export function canApplyMau(state: GameState, id: MauId): Result<MauPlan> {
  if (!mauUnlocked(state, id)) return { ok: false, reason: id === 'coLoa' ? 'canChuong3' : 'canChuong2' };
  if (state.raid.phase !== 'idle') return { ok: false, reason: 'dangCoGiac' };
  const plan = planMau(state, id);
  if (plan.stuck.length) return { ok: false, reason: 'khongDuCho' };
  if (!plan.moves.length && !plan.builds.length && !plan.removes.length) return { ok: false, reason: 'daTheoMau' };
  if (!canAfford(state, plan.cost)) return { ok: false, reason: 'thieuTaiNguyen' };
  return { ok: true, value: plan };
}

/**
 * Áp mẫu: dỡ đoạn thừa, nhấc mọi công trình phải dời ra rồi đặt vào chỗ mới, dựng thêm phần thiếu.
 * Công trình dời giữ cấp, người làm; nền đất cũ ở lại chỗ cũ, chỗ mới đắp móng phẳng như khi dựng mới.
 */
export function applyMau(state: GameState, id: MauId): Result<MauPlan> {
  const check = canApplyMau(state, id);
  if (!check.ok) return check;
  const plan = check.value;
  pay(state, plan.cost);
  state.buildings = state.buildings.filter((b) => !plan.removes.includes(b.id));
  for (const m of plan.moves) {
    const b = state.buildings.find((o) => o.id === m.id)!;
    b.x = m.x;
    b.z = m.z;
  }
  for (const m of plan.moves) {
    const b = state.buildings.find((o) => o.id === m.id)!;
    levelFootprint(state, b, footprintTop(state, b.type, b.x, b.z));
  }
  for (const s of plan.builds) {
    const b: Building = { id: state.nextId++, type: s.type, x: s.x, z: s.z, level: 1, workers: 0 };
    levelFootprint(state, b, footprintTop(state, s.type, s.x, s.z));
    state.buildings.push(b);
    fillWorkers(state, b);
  }
  return check;
}

// ---------- Xếp kinh đô cũ vào mẫu (nâng bản lưu) ----------

/**
 * Lớp vòng thành của từng chỗ thành trong mẫu: đi từ Điện ra bìa rừng phải qua mấy lớp thành mới tới chỗ ấy
 * (1 là vòng trong cùng). Đi tám hướng như giặc, chéo góc giữa hai đoạn thành là hở.
 */
function thanhLayers(id: MauId): Map<number, number> {
  const wall = new Uint8Array(GRID * GRID);
  for (const s of mauSlots(id)) if (s.type === 'thanh') wall[s.z * GRID + s.x] = 1;
  const dist = new Int32Array(GRID * GRID).fill(1 << 20);
  const buckets: number[][] = [[]];
  for (const s of mauSlots(id)) {
    if (s.type !== 'dien') continue;
    const def = BUILDINGS.dien;
    for (let dx = 0; dx < def.w; dx++) {
      for (let dz = 0; dz < def.d; dz++) {
        const i = (s.z + dz) * GRID + s.x + dx;
        dist[i] = 0;
        buckets[0].push(i);
      }
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
          if ((!dx && !dz) || !inGrid(cx + dx, cz + dz)) continue;
          const ni = (cz + dz) * GRID + cx + dx;
          const nd = d + wall[ni];
          if (nd >= dist[ni]) continue;
          dist[ni] = nd;
          (buckets[nd] ??= []).push(ni);
        }
      }
    }
  }
  const layers = new Map<number, number>();
  for (let i = 0; i < wall.length; i++) if (wall[i]) layers.set(i, dist[i]);
  return layers;
}

/** Đoạn lũy, đê đã có thì dựng đủ cả dải theo mẫu; thành thì dựng nốt vòng đang dở. */
const TOP_UP: BuildingType[] = ['luy', 'de', 'thanh'];

/**
 * Xếp các công trình `list` (chưa có trong state, trừ Điện) vào mẫu `id`, trong vùng đã khai phá, rồi thêm vào state.
 * - Mỗi loại vào chỗ cùng loại gần Điện trước, cấp cao trước; lầu nỏ vào chỗ chòi canh; thành xếp từ vòng trong ra.
 * - Công trình không có chỗ trong mẫu thì vào chỗ trống gần Điện nhất.
 * - Lũy, đê đã có thì dựng đủ cả dải theo mẫu; thành thì dựng nốt vòng đang dở, và đủ ít nhất `rings` vòng
 *   (số vòng kinh đô cũ đã có), miễn phí, trong giới hạn theo cấp Điện.
 * Giữ cấp, người làm, hư hỏng. Trả về các đoạn lũy, đê, thành, bẫy không còn chỗ (để hoàn của) và các đoạn dựng thêm.
 */
export function seatInMau(state: GameState, id: MauId, list: Building[], rings = 0): { dropped: Building[]; added: Building[] } {
  const level = dienLevel(state);
  const dien = state.buildings.find((b) => b.type === 'dien')!;
  const ox = dien.x - DIEN_HOME;
  const oz = dien.z - DIEN_HOME;
  const fits = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (!inGrid(x + dx, z + dz) || !isUnlocked(x + dx, z + dz, level)) return false;
    return !def.nearRiver || touchesRiver(x, z, def.w, def.d);
  };
  const used = new Uint8Array(GRID * GRID);
  const mark = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) used[(z + dz) * GRID + x + dx] = 1;
  };
  const free = (type: BuildingType, x: number, z: number) => {
    const def = BUILDINGS[type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (used[(z + dz) * GRID + x + dx]) return false;
    return true;
  };
  for (const b of state.buildings) mark(b.type, b.x, b.z);
  const cx = dien.x + BUILDINGS.dien.w / 2;
  const cz = dien.z + BUILDINGS.dien.d / 2;
  const layers = thanhLayers(id);
  const layerOf = (s: Slot) => (s.type === 'thanh' ? (layers.get((s.z - oz) * GRID + s.x - ox) ?? 99) : 0);
  const slots = mauSlots(id)
    .filter((s) => s.type !== 'dien')
    .map((s) => ({ ...s, x: s.x + ox, z: s.z + oz }))
    .filter((s) => fits(s.type, s.x, s.z))
    .sort((a, b) => layerOf(a) - layerOf(b) || Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
  const dropped: Building[] = [];
  const homeless: Building[] = [];
  const order = [...list].sort((a, b) => BUILDINGS[b.type].w - BUILDINGS[a.type].w || b.level - a.level || a.id - b.id);
  for (const b of order) {
    const want = b.type === 'lauNo' ? 'choiCanh' : b.type;
    const i = slots.findIndex((s) => s.type === want && free(s.type, s.x, s.z));
    if (i >= 0) {
      const s = slots.splice(i, 1)[0];
      b.x = s.x;
      b.z = s.z;
      mark(b.type, b.x, b.z);
      state.buildings.push(b);
    } else if (SEGMENTS.includes(b.type)) dropped.push(b);
    else homeless.push(b);
  }
  for (const b of homeless) {
    b.x = Math.floor(cx);
    b.z = Math.floor(cz);
    const spot = nearestFree(b, fits, free);
    if (!spot) {
      dropped.push(b);
      continue;
    }
    b.x = spot.x;
    b.z = spot.z;
    mark(b.type, b.x, b.z);
    state.buildings.push(b);
  }
  // Dựng đủ lũy, đê theo mẫu; thành thì dựng nốt vòng đang dở.
  const added: Building[] = [];
  for (const type of TOP_UP) {
    const had = list.filter((b) => b.type === type && state.buildings.includes(b));
    if (!had.length) continue;
    const top = type === 'thanh' ? Math.max(rings, ...had.map((b) => layers.get((b.z - oz) * GRID + b.x - ox) ?? 0)) : Infinity;
    for (const s of slots.filter((x) => x.type === type && layerOf(x) <= top)) {
      if (usedOf(state, type) >= limitOf(state, type) || !free(type, s.x, s.z)) continue;
      const nb: Building = { id: state.nextId++, type, x: s.x, z: s.z, level: Math.min(...had.map((b) => b.level)), workers: 0 };
      mark(type, s.x, s.z);
      state.buildings.push(nb);
      added.push(nb);
    }
  }
  return { dropped, added };
}
