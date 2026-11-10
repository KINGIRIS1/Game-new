// Đấu thành: người chơi cử quân đánh kinh đô người chơi khác, cướp của (xem docs/thiet-ke.md, Kế hoạch: Đấu thành).
// Kinh đô bị đánh là một bản chụp (`Snapshot`): công trình bờ bên này, lính giữ thành tính sẵn theo bố trí, tướng,
// Đền, binh khí, huân công, của trong kho. Từ bản chụp dựng một kinh đô dùng một lần (`defenderState`) để đánh và vẽ.
// Trận chỉ chạy trọn bước `BATTLE_STEP`, kỹ năng ghi theo bước (`PvpInput`), nên đánh lại từ đầu vào ghi sẵn
// (`simulatePvp`) ra y như lúc đánh: máy chủ sau này dùng để kiểm kết quả người chơi gửi lên.
// Chưa có máy chủ thì chỉ đánh thử (kinh đô của mình hay kinh đô máy `botSnapshot`), không mất quân, không được của.

import { deflateSync, inflateSync } from 'fflate';
import {
  HERO_KINDS,
  isScored,
  retreatField,
  startPvp,
  stepBattle,
  useSkill,
  type Battle,
  type HeroKind,
  type HeroSetup,
  type PvpAttack,
  type PvpDefense,
  type PvpGuard,
} from './battle';
import {
  ARMS,
  BUILDINGS,
  CH2_QUEST_START,
  CH3_QUEST_START,
  CH4_QUEST_START,
  CH5_QUEST_START,
  DAU_THANH,
  DIEN_CHAPTER,
  DOANH_MAX,
  GUARD_CAP,
  HUAN_BRANCHES,
  HUAN_COST,
  LAU_NO_TOWERS,
  RESOURCE_IDS,
  SKILL_IDS,
  TEMPLE_BONUS,
  TET_TROI_BONUS,
  UNITS,
  UNIT_TYPES,
  U_NO,
  isBridge,
  isDecor,
  type BuildingType,
  type Chapter,
  type HuanBranch,
  type Resources,
  type SkillId,
  type UnitType,
} from './defs';
import { armySpace, barracksOf, fieldCap, fitArmy, guardPlan, type Army } from './doanhTrai';
import {
  BATTLE_STEP,
  createInitialState,
  dienLevel,
  dienNeededFor,
  hasCoLoa,
  hasKimQuy,
  slotsOf,
  storageCap,
  troopBonus,
  type Building,
  type GameState,
} from './game';
import { chapterOf } from './manVao';
import { GRID, baseHeights, farBankOf, inGrid } from './map';
import { frameKhoanh, mauSlots, type MauId } from './mau';
import { nuForUnit } from './nuTuong';
import { fromBase64, toBase64 } from './save';
import { heroesFor } from './son';
import { huanTiers } from './thuThach';

// ---------- Bản chụp kinh đô ----------

/** Một công trình trong bản chụp (không có id, số người làm, hư hỏng: kinh đô bị đánh luôn còn nguyên). */
export interface SnapBuilding {
  type: BuildingType;
  x: number;
  z: number;
  level: number;
  rot?: number;
  uNo?: 'ok';
}

/** Bản chụp kinh đô để người khác đánh. */
export interface Snapshot {
  v: 1;
  dien: number;
  chapter: Chapter;
  buildings: SnapBuilding[];
  /** Độ cao ô khác độ cao tự nhiên: [chỉ số ô, độ cao, chỉ số ô, độ cao, …]. Chỉ để vẽ, trận không dùng. */
  heights: number[];
  khoanh: number[];
  resources: Resources;
  /** Sức chứa kho, để tính phần của giữ an toàn. */
  cap: number;
  /** Lính giữ thành, theo chỉ số công trình trong `buildings`. */
  guards: PvpGuard[];
  /**
   * Quân của người chơi (giữ kinh đô và dự trữ). Máy chủ dùng khi chính người này đi đánh thành: quân mang đi không
   * quá chừng này. Không có doanh trại thì không mang quân nào.
   */
  troops: Record<UnitType, number>;
  /** Tướng giữ thành (đứng trước Điện, không dùng kỹ năng). */
  heroes: HeroSetup[];
  bonus: number;
  arms: Record<UnitType, number>;
  huan: Record<HuanBranch, number>;
  crossbows: boolean;
  walls: boolean;
}

/** Công trình đưa vào bản chụp: bờ bên này, không phải đường đi, trang trí hay cầu. */
const snapped = (b: Pick<Building, 'type' | 'x' | 'z'>) => !isDecor(b.type) && !isBridge(b.type) && farBankOf(b.x, b.z) === null;

/** Nhiệm vụ đầu của từng chương (để kinh đô dựng lại ở đúng chương). */
const QUEST_OF: Record<Chapter, number> = { 1: 0, 2: CH2_QUEST_START, 3: CH3_QUEST_START, 4: CH4_QUEST_START, 5: CH5_QUEST_START };

/** Tướng giữ thành: như tướng ra trận giữ kinh đô ở chương hiện tại, kể cả tướng đang nghỉ (bản chụp dùng lâu). */
function defendHeroes(state: GameState): HeroSetup[] {
  const rested = { ...state, clock: Number.MAX_SAFE_INTEGER };
  return heroesFor(rested, chapterOf(state)).map((h) => ({ ...h }));
}

/** Chụp kinh đô của người chơi. */
export function makeSnapshot(state: GameState): Snapshot {
  const keep = state.buildings.filter(snapped);
  // Lính giữ thành là lính bố trí giữ kinh đô của doanh trại (một trại từ bản lưu 26); nữ tướng ở trại lo binh
  // chủng nào thì lính binh chủng ấy được cộng.
  const plan = guardPlan(state);
  const barracks = barracksOf(state);
  const at = barracks ? keep.indexOf(barracks) : -1;
  const guards: PvpGuard[] = [];
  if (at >= 0) {
    for (const kind of UNIT_TYPES) {
      if (plan[kind] <= 0) continue;
      const g: PvpGuard = { at, kind, n: plan[kind] };
      if (nuForUnit(state, kind)) g.nu = true;
      guards.push(g);
    }
  }
  const base = baseHeights();
  const heights: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if (state.heights[i] !== base[i] && farBankOf(i % GRID, Math.floor(i / GRID)) === null) heights.push(i, state.heights[i]);
  }
  // Sức chứa tính theo công trình bờ bên này, đúng như máy chủ tính lại từ bản chụp (kho bên kia sông không chụp).
  // Của trong kho được phép vượt sức chứa (thưởng nhiệm vụ, hoàn của khi hủy việc xây, dỡ kho): chỉ chụp tới sức
  // chứa, phần vượt không ai cướp được.
  const cap = storageCap({ ...state, buildings: keep });
  const resources = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
  for (const r of RESOURCE_IDS) resources[r] = Math.max(0, Math.min(cap, state.resources[r]));
  return {
    v: 1,
    dien: dienLevel(state),
    chapter: chapterOf(state),
    buildings: keep.map((b) => ({
      type: b.type,
      x: b.x,
      z: b.z,
      level: b.level,
      ...(b.rot ? { rot: b.rot } : {}),
      ...(b.uNo ? { uNo: 'ok' as const } : {}),
    })),
    heights,
    khoanh: [...state.khoanh],
    resources,
    cap,
    guards,
    troops: barracks ? { ...state.troops } : { giao: 0, cung: 0, voi: 0, no: 0 },
    heroes: defendHeroes(state),
    bonus: troopBonus(state),
    arms: { ...state.arms },
    huan: huanTiers(state) as Record<HuanBranch, number>,
    crossbows: hasCoLoa(state),
    walls: hasKimQuy(state),
  };
}

/** Kinh đô dùng một lần dựng từ bản chụp: để đánh và để vẽ. Không đụng tới kinh đô của người chơi. */
export function defenderState(snap: Snapshot): GameState {
  const s = createInitialState(0);
  s.questIndex = QUEST_OF[snap.chapter];
  s.buildings = snap.buildings.map((b, i) => {
    const out: Building = { id: i + 1, type: b.type, x: b.x, z: b.z, level: b.level, workers: 0 };
    if (b.rot) out.rot = b.rot;
    if (b.uNo) out.uNo = 'ok';
    out.workers = slotsOf(out);
    return out;
  });
  s.nextId = s.buildings.length + 1;
  const heights = baseHeights();
  for (let k = 0; k + 1 < snap.heights.length; k += 2) heights[snap.heights[k]] = snap.heights[k + 1];
  s.heights = heights;
  s.khoanh = [...snap.khoanh];
  s.resources = { ...snap.resources };
  return s;
}

/** Bên giữ thành của trận, lấy từ bản chụp. */
export function defenseOf(snap: Snapshot): PvpDefense {
  return {
    hpMul: DAU_THANH.hpMul[snap.dien - 1],
    siege: DAU_THANH.siege[snap.dien - 1],
    guards: snap.guards.map((g) => ({ ...g })),
    heroes: snap.heroes.map((h) => ({ ...h })),
    bonus: snap.bonus,
    arms: { ...snap.arms },
    huan: { ...snap.huan },
    crossbows: snap.crossbows,
    walls: snap.walls,
  };
}

// ---------- Mã bản chụp ----------

const SNAP_PREFIX = 'TDVS1:';
/** Mã bản chụp dài nhất nhận (kinh đô xây kín chừng vài nghìn ký tự). */
const SNAP_MAX = 64_000;

export function encodeSnapshot(snap: Snapshot): string {
  return SNAP_PREFIX + toBase64(deflateSync(new TextEncoder().encode(JSON.stringify(snap)), { level: 9 }));
}

/** Đọc mã bản chụp. Mã hỏng hay sai dạng thì trả undefined (chưa kiểm luật: xem `validateSnapshot`). */
export function decodeSnapshot(code: string): Snapshot | undefined {
  const text = code.length > SNAP_MAX ? '' : code.replace(/\s+/g, '');
  if (!text.startsWith(SNAP_PREFIX)) return undefined;
  try {
    const raw: unknown = JSON.parse(new TextDecoder().decode(inflateSync(fromBase64(text.slice(SNAP_PREFIX.length)))));
    return isSnapshotShape(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isInt = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
const isNum = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const isRecordOf = (v: unknown, keys: readonly string[], test: (x: unknown) => boolean) => isObj(v) && keys.every((k) => test(v[k]));

/** Bản chụp đúng dạng (kiểu dữ liệu), chưa xét luật. */
function isSnapshotShape(v: unknown): v is Snapshot {
  if (!isObj(v) || v.v !== 1 || !isInt(v.dien, 1, BUILDINGS.dien.maxLevel) || !isInt(v.chapter, 1, 5)) return false;
  if (!Array.isArray(v.buildings) || v.buildings.length > 2000) return false;
  for (const b of v.buildings) {
    if (!isObj(b) || typeof b.type !== 'string' || !(b.type in BUILDINGS)) return false;
    if (!isInt(b.x, 0, GRID - 1) || !isInt(b.z, 0, GRID - 1) || !isInt(b.level, 1, 99)) return false;
    if (b.rot !== undefined && !isInt(b.rot, 1, 3)) return false;
    if (b.uNo !== undefined && b.uNo !== 'ok') return false;
  }
  if (!Array.isArray(v.heights) || v.heights.length % 2 || !v.heights.every((h) => isInt(h, 0, GRID * GRID))) return false;
  if (!Array.isArray(v.khoanh) || !v.khoanh.every((k) => isInt(k, 0, 999))) return false;
  if (!isRecordOf(v.resources, RESOURCE_IDS, (x) => isNum(x, 0, 1e9)) || !isNum(v.cap, 0, 1e9)) return false;
  if (!Array.isArray(v.guards)) return false;
  for (const g of v.guards) {
    if (!isObj(g) || !isInt(g.at, 0, 1999) || !UNIT_TYPES.includes(g.kind as UnitType) || !isInt(g.n, 0, 999)) return false;
    if (g.nu !== undefined && g.nu !== true) return false;
  }
  if (!isRecordOf(v.troops, UNIT_TYPES, (x) => isInt(x, 0, 9999))) return false;
  if (!Array.isArray(v.heroes) || v.heroes.length > 2 || !v.heroes.every((h) => isObj(h) && HERO_KINDS.includes(h.kind as HeroKind))) return false;
  if (!isNum(v.bonus, 0, 1) || typeof v.crossbows !== 'boolean' || typeof v.walls !== 'boolean') return false;
  return isRecordOf(v.arms, UNIT_TYPES, (x) => isInt(x, 0, 9)) && isRecordOf(v.huan, HUAN_BRANCHES, (x) => isInt(x, 0, 9));
}

/**
 * Bản chụp có hợp luật không (chống bản chụp sửa tay): số công trình mỗi loại, cấp so với cấp Điện, chỗ đặt không
 * chồng nhau, đúng một Điện, ụ nỏ, lính giữ thành, binh khí, huân công, Đền, của so với sức chứa kho.
 * Trả về lý do sai đầu tiên (để test và nhật ký), hay null nếu hợp luật.
 */
export function validateSnapshot(snap: Snapshot): string | null {
  if (!isSnapshotShape(snap)) return 'sai dạng';
  const lv = snap.dien - 1;
  const count = new Map<BuildingType, number>();
  const grid = new Uint8Array(GRID * GRID);
  for (const b of snap.buildings) {
    const def = BUILDINGS[b.type];
    if (!snapped(b)) return `${b.type}: không chụp loại hay chỗ này`;
    if (b.level > def.maxLevel || dienNeededFor(b.type, b.level) > snap.dien) return `${b.type} cấp ${b.level} vượt Điện ${snap.dien}`;
    if (b.uNo && b.type !== 'thanh') return `${b.type}: ụ nỏ chỉ ở trên thành`;
    for (let dx = 0; dx < def.w; dx++)
      for (let dz = 0; dz < def.d; dz++) {
        if (!inGrid(b.x + dx, b.z + dz)) return `${b.type} ra ngoài lưới`;
        const i = (b.z + dz) * GRID + b.x + dx;
        if (grid[i]) return `${b.type} chồng lên công trình khác ở (${b.x + dx}, ${b.z + dz})`;
        grid[i] = 1;
      }
    count.set(b.type, (count.get(b.type) ?? 0) + 1);
  }
  if (count.get('dien') !== 1) return 'phải có đúng một Điện';
  if (snap.buildings.find((b) => b.type === 'dien')!.level !== snap.dien) return 'cấp Điện không khớp';
  for (const [type, n] of count) if (n > (BUILDINGS[type].limit[lv] ?? 0)) return `${type}: ${n} cái, quá giới hạn`;
  if ((count.get('choiCanh') ?? 0) + LAU_NO_TOWERS * (count.get('lauNo') ?? 0) > (BUILDINGS.choiCanh.limit[lv] ?? 0)) return 'quá số chòi canh';
  if (snap.buildings.filter((b) => b.uNo).length > (U_NO.limit[lv] ?? 0)) return 'quá số ụ nỏ';
  let space = 0;
  const guarded = { giao: 0, cung: 0, voi: 0, no: 0 };
  for (const g of snap.guards) {
    if (snap.buildings[g.at]?.type !== 'doanhTrai') return 'lính giữ thành không ở doanh trại';
    space += g.n * UNITS[g.kind].space;
    guarded[g.kind] += g.n;
  }
  if (space > (GUARD_CAP[lv] ?? 0)) return 'quá số lính giữ thành';
  if (UNIT_TYPES.some((k) => guarded[k] > snap.troops[k])) return 'lính giữ thành nhiều hơn quân đang có';
  // Sức chứa doanh trại nhân số doanh nhiều nhất (`capOf`): bản chụp không biết bao nhiêu tướng đã về.
  const room = snap.buildings.reduce((n, b) => n + (b.type === 'doanhTrai' ? (BUILDINGS.doanhTrai.troopCap![b.level - 1] ?? 0) * DOANH_MAX : 0), 0);
  if (armySpace(snap.troops) > room) return 'quá sức chứa doanh trại';
  if (UNIT_TYPES.some((k) => snap.arms[k] > ARMS.length)) return 'binh khí quá bậc';
  if (HUAN_BRANCHES.some((k) => snap.huan[k] > HUAN_COST.length)) return 'huân công quá bậc';
  if (snap.bonus > TEMPLE_BONUS + TET_TROI_BONUS + 1e-9) return 'Đền cộng quá mức';
  if (snap.crossbows && !count.get('denCoLoa')) return 'không có Đền Cổ Loa';
  if (snap.walls && !count.get('hoKimQuy')) return 'không có Hồ Kim Quy';
  const cap = storageCap(defenderState(snap));
  if (snap.cap > cap + 1e-9 || RESOURCE_IDS.some((r) => snap.resources[r] > cap + 1e-9)) return 'của quá sức chứa kho';
  return null;
}

// ---------- Kinh đô máy ----------

/** Tỉ lệ binh chủng lính giữ kinh đô máy (như quân mẫu phó bản; có lính nỏ từ Điện 8, chương 4). */
const BOT_MIX: Army = { giao: 14, cung: 12, voi: 4, no: 0 };
const BOT_MIX8: Army = { giao: 11, cung: 10, voi: 3, no: 4 };

/** Mẫu kinh đô máy theo cấp Điện. */
const botMau = (dien: number): MauId => (dien <= 5 ? 'phongChau' : dien === 6 ? 'deBao' : dien === 7 ? 'coLoa' : 'coLoaSong');

/** Chương ứng với cấp Điện (Điện 6 mở ở chương 2, Điện 7 chương 3, Điện 8 chương 4, Điện 10 chương 5). */
function chapterAt(dien: number): Chapter {
  let ch: Chapter = 1;
  for (let lv = 1; lv <= dien; lv++) ch = (DIEN_CHAPTER[lv] ?? ch) as Chapter;
  return ch;
}

/** Cấp cao nhất của loại `type` dựng được ở Điện `dien`. */
function topLevel(type: BuildingType, dien: number): number {
  let lv = 1;
  while (lv < BUILDINGS[type].maxLevel && dienNeededFor(type, lv + 1) <= dien) lv++;
  return lv;
}

/**
 * Kinh đô máy Điện `dien`: dựng theo mẫu kinh đô của chương ứng cấp ấy (`mauSlots`), mọi công trình ở cấp cao nhất
 * cấp Điện cho, cổng thành ở chỗ cổng của mẫu (từ chương 3), ụ nỏ trên thành (từ Điện 8), lính giữ thành đủ
 * `GUARD_CAP` chia đều các doanh trại, binh khí theo cấp lò rèn, của bằng `DAU_THANH.botStock` sức chứa kho.
 */
export function botSnapshot(dien: number): Snapshot {
  const chapter = chapterAt(dien);
  const lv = dien - 1;
  const buildings: SnapBuilding[] = [];
  let gates = 0;
  let uNo = 0;
  for (const slot of mauSlots(botMau(dien), dien)) {
    let type = slot.type;
    if (slot.cong && chapter >= 3 && gates < (BUILDINGS.congThanh.limit[lv] ?? 0)) {
      type = 'congThanh';
      gates++;
    }
    const b: SnapBuilding = { type, x: slot.x, z: slot.z, level: type === 'dien' ? dien : topLevel(type, dien) };
    if (slot.uNo && type === 'thanh' && dien >= 8 && uNo < (U_NO.limit[lv] ?? 0)) {
      b.uNo = 'ok';
      uNo++;
    }
    buildings.push(b);
  }
  const barracks = buildings.flatMap((b, i) => (b.type === 'doanhTrai' ? [i] : []));
  const mix = dien >= 8 ? BOT_MIX8 : BOT_MIX;
  const army = fitArmy({ giao: mix.giao * 4, cung: mix.cung * 4, voi: mix.voi * 4, no: mix.no * 4 }, GUARD_CAP[lv] ?? 0);
  const guards: PvpGuard[] = [];
  barracks.forEach((at, i) => {
    for (const kind of UNIT_TYPES) {
      const n = Math.floor(army[kind] / barracks.length) + (i < army[kind] % barracks.length ? 1 : 0);
      if (n > 0) guards.push({ at, kind, n });
    }
  });
  const has = (t: BuildingType) => buildings.some((b) => b.type === t);
  const arms = dien >= 9 ? 3 : dien >= 7 ? 2 : dien >= 6 ? 1 : 0;
  const snap: Snapshot = {
    v: 1,
    dien,
    chapter,
    buildings,
    heights: [],
    khoanh: frameKhoanh(dien),
    resources: { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 },
    cap: 0,
    guards,
    troops: { ...army },
    heroes: [],
    bonus: has('denPhuDong') ? TEMPLE_BONUS : 0,
    arms: { giao: arms, cung: arms, voi: arms, no: arms },
    huan: { giao: 0, cung: 0, voi: 0, no: 0, tuong: 0 },
    crossbows: has('denCoLoa'),
    walls: has('hoKimQuy'),
  };
  const cap = storageCap(defenderState(snap));
  snap.cap = cap;
  for (const r of RESOURCE_IDS) snap.resources[r] = Math.floor(cap * DAU_THANH.botStock);
  return snap;
}

// ---------- Trận ----------

/** Một lần bấm trong trận, ghi theo bước (`s`: áp ở đầu bước thứ mấy): kỹ năng, hay rút quân. */
export interface PvpInput {
  s: number;
  k: SkillId | 'rut';
}

/** Trận Đấu thành đang đánh: kinh đô bị đánh (dùng một lần), trận, các lần bấm, bước kế tiếp. */
export interface PvpRun {
  snap: Snapshot;
  attack: PvpAttack;
  def: GameState;
  battle: Battle;
  inputs: PvpInput[];
  step: number;
  /** Thời gian dồn lại chưa đủ một bước (giây). */
  acc: number;
  done: boolean;
  /** Trận xem lại (PR 6): các lần bấm đã có sẵn, không ghi thêm. */
  replay?: true;
}

/** Quân đánh thành của người chơi: quân chọn, tướng, Đền, binh khí, huân công như phó bản. */
export function attackFrom(state: GameState, army: Army, side: 'bac' | 'tay', seed: number): PvpAttack {
  return {
    army: { ...army },
    heroes: heroesFor(state, chapterOf(state)),
    side,
    seed,
    bonus: troopBonus(state),
    arms: { ...state.arms },
    huan: huanTiers(state),
  };
}

export function beginPvp(snap: Snapshot, attack: PvpAttack): PvpRun {
  const def = defenderState(snap);
  const battle = startPvp(def, defenseOf(snap), attack);
  return { snap, attack, def, battle, inputs: [], step: 0, acc: 0, done: false };
}

/** Số lần bấm nhiều nhất một trận (máy chủ bỏ phần thừa, nên máy khách cũng không ghi quá). */
export const PVP_MAX_INPUTS = 600;

/** Ghi một lần bấm: áp ở đầu bước kế tiếp. */
export function pushInput(run: PvpRun, k: PvpInput['k']): void {
  if (!run.done && !run.replay && run.inputs.length < PVP_MAX_INPUTS) run.inputs.push({ s: run.step, k });
}

/** Bước lớn nhất một lần bấm được ghi (trận dài nhất chừng 3600 bước). */
const INPUT_MAX_STEP = 10_000;

/**
 * Lọc các lần bấm nhận từ ngoài (máy khách gửi lên máy chủ, hay máy chủ trả về để xem lại): đúng dạng, đúng kỹ năng,
 * bước không quá giới hạn, không quá `PVP_MAX_INPUTS` lần. Máy chủ đánh lại và máy khách xem lại cùng lọc như nhau.
 */
export function cleanInputs(raw: unknown): PvpInput[] {
  if (!Array.isArray(raw)) return [];
  const out: PvpInput[] = [];
  for (const i of raw.slice(0, PVP_MAX_INPUTS)) {
    if (!i || typeof i !== 'object') continue;
    const { s, k } = i as Record<string, unknown>;
    if (!Number.isInteger(s) || (s as number) < 0 || (s as number) > INPUT_MAX_STEP) continue;
    if (k !== 'rut' && !(SKILL_IDS as unknown[]).includes(k)) continue;
    out.push({ s: s as number, k: k as PvpInput['k'] });
  }
  return out;
}

/** Chạy đúng một bước: áp các lần bấm của bước này rồi chạy trận thêm `BATTLE_STEP`. */
function stepOnce(run: PvpRun): void {
  for (const input of run.inputs) {
    if (input.s !== run.step) continue;
    if (input.k === 'rut') retreatField(run.battle);
    else useSkill(run.battle, input.k);
  }
  run.done = stepBattle(run.def, run.battle, BATTLE_STEP);
  run.step++;
}

/** Cho trận chạy thêm `ms` (thời gian thật trôi): chỉ chạy trọn bước, phần lẻ dồn sang lần sau. Trả về true khi xong. */
export function stepPvp(run: PvpRun, ms: number): boolean {
  run.acc += ms / 1000;
  while (!run.done && run.acc >= BATTLE_STEP) {
    run.acc -= BATTLE_STEP;
    stepOnce(run);
  }
  return run.done;
}

/** Số bước tối đa một trận (đủ giờ thì trận tự xong). */
const MAX_STEPS = Math.ceil(DAU_THANH.holdS / BATTLE_STEP) + 2;

/** Đánh lại cả trận một mạch từ bản chụp, quân đánh thành và các lần bấm đã ghi. */
export function simulatePvp(snap: Snapshot, attack: PvpAttack, inputs: PvpInput[]): PvpRun {
  const run = beginPvp(snap, attack);
  run.inputs = inputs.map((i) => ({ ...i })).filter((i) => i.k === 'rut' || SKILL_IDS.includes(i.k));
  while (!run.done && run.step < MAX_STEPS) stepOnce(run);
  return run;
}

/**
 * Trận xem lại (PR 6): cùng bản chụp, quân đánh thành và các lần bấm đã ghi như `simulatePvp`, nhưng chạy theo thời
 * gian thật bằng `stepPvp` để người chơi nhìn; tới bước nào thì lần bấm của bước ấy tự áp. Ra y hệt trận gốc.
 */
export function replayPvp(snap: Snapshot, attack: PvpAttack, inputs: unknown): PvpRun {
  const run = beginPvp(snap, attack);
  run.inputs = cleanInputs(inputs);
  run.replay = true;
  return run;
}

// ---------- Kết quả ----------

export interface PvpScore {
  /** Phần công trình tính điểm đã phá (0–1). */
  pct: number;
  stars: number;
  dien: boolean;
  /** Số kho bị phá và tổng số kho. */
  kho: number;
  khoTotal: number;
}

/** Sao, phần trăm phá của trận trên kinh đô `def`. */
export function scorePvp(def: GameState): PvpScore {
  const scored = def.buildings.filter(isScored);
  const down = scored.filter((b) => b.damaged).length;
  const pct = scored.length ? down / scored.length : 0;
  const dien = def.buildings.some((b) => b.type === 'dien' && b.damaged);
  const kho = def.buildings.filter((b) => b.type === 'kho');
  const stars = (pct >= DAU_THANH.star1 ? 1 : 0) + (dien ? 1 : 0) + (pct >= 1 ? 1 : 0);
  return { pct, stars, dien, kho: kho.filter((b) => b.damaged).length, khoTotal: kho.length };
}

/** Phần của mỗi loại người giữ thành có thể bị cướp tối đa (chưa tính phá được bao nhiêu). */
export function lootCap(snap: Pick<Snapshot, 'resources' | 'cap'>): Resources {
  const out = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
  for (const r of RESOURCE_IDS) out[r] = Math.floor(DAU_THANH.maxLoot * Math.max(0, snap.resources[r] - DAU_THANH.protect * snap.cap));
  return out;
}

/**
 * Của cướp được: trong mức tối đa (`lootCap`), tính `khoW` theo số kho bị phá (không có kho thì theo phần trăm
 * phá), `dienW` nếu phá Điện, `pctW` theo phần trăm phá; đánh người kém cấp Điện hơn mình thì mỗi cấp giảm một nửa.
 */
export function lootPvp(snap: Snapshot, score: PvpScore, atkDien: number): Resources {
  const khoFrac = score.khoTotal ? score.kho / score.khoTotal : score.pct;
  const share = DAU_THANH.khoW * khoFrac + DAU_THANH.dienW * (score.dien ? 1 : 0) + DAU_THANH.pctW * score.pct;
  const factor = 0.5 ** Math.max(0, atkDien - snap.dien);
  const cap = lootCap(snap);
  const out = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
  for (const r of RESOURCE_IDS) out[r] = Math.floor(cap[r] * share * factor);
  return out;
}

/**
 * Chiến công sau trận: từ một sao thì người đánh được `trophyBase` cộng chênh lệch (người giữ thành nhiều chiến công
 * hơn thì được nhiều hơn), kẹp trong `trophyMin`–`trophyMax`, người giữ thành mất bấy nhiêu; không sao thì ngược lại.
 * Không ai xuống dưới 0.
 */
export function trophyDelta(atk: number, def: number, stars: number): { atk: number; def: number } {
  const win = stars >= 1;
  const gap = win ? def - atk : atk - def;
  const d = Math.min(DAU_THANH.trophyMax, Math.max(DAU_THANH.trophyMin, Math.round(DAU_THANH.trophyBase + gap / DAU_THANH.trophySpread)));
  return win ? { atk: d, def: -Math.min(d, def) } : { atk: -Math.min(d, atk), def: d };
}

// ---------- Điều kiện ----------

export type PvpFail = 'canDien5' | 'canDoanhTrai' | 'dangCoGiac' | 'dangDanhPhoBan' | 'khongCoQuan' | 'quaQuan';

/** Đánh thử Đấu thành được không: từ Điện 5, có doanh trại, không có giặc tới hay đang đánh phó bản. */
export function canPractice(state: GameState): PvpFail | null {
  if (dienLevel(state) < DAU_THANH.unlockDien) return 'canDien5';
  if (!barracksOf(state)) return 'canDoanhTrai';
  if (state.raid.phase !== 'idle') return 'dangCoGiac';
  if (state.campaign.battle) return 'dangDanhPhoBan';
  return null;
}

/** Quân mang đi được không: không quá quân đang có, không quá số chỗ một trận (`fieldCap`), có ít nhất một người. */
export function validateArmy(state: GameState, army: Army): PvpFail | null {
  if (UNIT_TYPES.some((k) => !Number.isInteger(army[k]) || army[k] < 0 || army[k] > state.troops[k]) || armySpace(army) > fieldCap(state)) return 'quaQuan';
  if (armySpace(army) <= 0) return 'khongCoQuan';
  return null;
}
