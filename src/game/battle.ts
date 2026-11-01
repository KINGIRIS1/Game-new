// Mô phỏng trận đánh, thuần logic, không vẽ gì. Có hai loại trận:
// - giữ kinh đô (`raid`): giặc Ân từ bìa rừng tìm đường tới kho và Điện, gặp lũy thì phá,
//   quân ta từ doanh trại ra đánh, chòi canh bắn, bẫy chông đâm;
// - ngoài bãi (`field`, phó bản): hai bên dàn ba hàng đối mặt nhau rồi xông vào đánh.
// Mùa lũ là trận giữ kinh đô kèm nước dâng: thủy quái bơi từ sông lên, nước tràn vào ô thấp làm hư công trình.
// Chương 3: đêm yêu tinh kéo về phá thành Cổ Loa trước tiên; quân Triệu Đà đánh kinh đô như giặc Ân.

import {
  ADV,
  ARMS_BONUS,
  BUILDINGS,
  CO_LOA_TOWER,
  LAU_NO,
  ENEMIES,
  ENEMY_ROWS,
  FIELD,
  FIRE,
  FLOOD_RISE_S,
  GIONG,
  HERO_CLEAVE,
  HILL,
  KIM_QUY,
  LOOT_FRACTION,
  NO_THAN,
  RAID_MAX_MS,
  RALLY,
  RESOURCE_IDS,
  ROCKS,
  ROWS,
  SKILLS,
  SMASH,
  SON,
  SWIMMERS,
  TOWER,
  TRAP_DMG,
  TT_SUMMON,
  TT_WAVE,
  UNITS,
  UNIT_TYPES,
  floodForces,
  floodHpScale,
  raidForces,
  raidHpScale,
  trieuForces,
  trieuHpScale,
  yeuForces,
  yeuHpScale,
  type EnemyType,
  type FighterStats,
  type Foe,
  type Resources,
  type Row,
  type SkillId,
  type UnitType,
  RAID_SCALE,
} from './defs';
import { dienLevel, type Building, type GameState } from './game';
import { bridgeTo, garrisonPosts, isBridge } from './benKia';
import { FAR_FOREST, GRID, RIVER_END, RIVER_START, areaStart, farBankOf, inGrid, isRiver } from './map';
import { drowns, floodMap } from './terrain';

export type Side = 'ta' | 'giac';
/** Giặc Ân tới từ bìa rừng phía bắc hay tây; thủy quái tới từ sông phía nam hay đông. */
/**
 * Giặc tới từ đâu: bìa rừng phía bắc, phía tây (bên này); dưới sông phía nam, phía đông (thủy quái); bìa rừng bên kia
 * sông Đà (`namXa`), bên kia sông Thao (`dongXa`).
 */
export type RaidSide = 'bac' | 'tay' | 'nam' | 'dong' | 'namXa' | 'dongXa';

/** Giặc tới từ bìa rừng bên kia sông: bờ nào. */
export const farSideBank = (side: RaidSide): 'nam' | 'dong' | null => (side === 'namXa' ? 'nam' : side === 'dongXa' ? 'dong' : null);
/** Tướng ra trận cùng quân ta: Thánh Gióng, Sơn Tinh hoặc An Dương Vương. Mỗi trận một tướng. */
export type HeroKind = 'giong' | 'sonTinh' | 'anDuong';
/** Lính thường, giặc, hoặc tướng. */
export type FighterKind = UnitType | EnemyType | HeroKind;
export const HERO_KINDS: HeroKind[] = ['giong', 'sonTinh', 'anDuong'];
export const isHero = (k: FighterKind): k is HeroKind => k === 'giong' || k === 'sonTinh' || k === 'anDuong';

/**
 * Tướng ra trận. Gióng: đánh bằng roi sắt hay bằng tre (`bamboo`, roi đã gãy). Sơn Tinh: đã mở Dời non chưa (`non`).
 * An Dương Vương: đã có Rùa Vàng che chở chưa (`kimQuy`).
 * `glow`: đã kết chương (Gióng bay về trời, Sơn Tinh về núi), hiển linh giúp quân ta.
 */
export interface HeroSetup {
  kind: HeroKind;
  bamboo: boolean;
  glow: boolean;
  non: boolean;
  kimQuy?: boolean;
}

export interface Fighter {
  id: number;
  side: Side;
  kind: FighterKind;
  /** Tọa độ ô liên tục: tâm ô (i, j) là (i + 0.5, j + 0.5). */
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  /** Giây còn phải chờ tới đòn tiếp theo. */
  cd: number;
  targetUnit: number | null;
  targetBuilding: number | null;
  /** Đường đi: danh sách chỉ số ô (z * GRID + x). */
  path: number[] | null;
  pathAt: number;
  repathIn: number;
  /** Giặc đã cướp được của và đang bỏ chạy. */
  loot: boolean;
  state: 'move' | 'fight' | 'flee' | 'dead' | 'gone';
  /** Hướng nhìn (radian), để phần vẽ xoay lính. */
  face: number;
  /** Còn bao lâu nữa hết động tác ra đòn, để phần vẽ làm động tác. */
  swing: number;
  /** Bị đá Dời non giữ chân: còn bao nhiêu giây chưa đi, chưa đánh được. */
  stun?: number;
  /** Bị sóng Thủy Tinh quét: còn bao nhiêu giây đi chậm. */
  slow?: number;
  /** Thủy Tinh: còn bao lâu tới lần hô sóng, lần gọi thủy quái tiếp theo, và đã gọi mấy lần. */
  spell?: { wave: number; summon: number; summoned: number };
}

export interface BattleEvent {
  seq: number;
  kind: 'shot' | 'trap' | 'wreck' | 'loot' | 'die' | 'rally' | 'fire' | 'smash' | 'exhaust' | 'hill' | 'rocks' | 'drown' | 'volley' | 'shield' | 'wave' | 'summon';
  x: number;
  z: number;
  tx?: number;
  tz?: number;
  /** Ai bắn (để vẽ mũi tên hay tia nước). */
  by?: FighterKind;
}

export interface Battle {
  /** Mã riêng của trận, để phần vẽ biết đã sang trận mới. */
  id: number;
  mode: 'raid' | 'field';
  /** Trận giữ kinh đô: đợt giặc thứ mấy. Trận ngoài bãi: màn thứ mấy. */
  wave: number;
  side: RaidSide;
  /** Thời gian trận đã diễn ra, giây. */
  t: number;
  fighters: Fighter[];
  /** Máu công trình theo id, chỉ có những công trình đã bị đánh. */
  hp: Record<number, number>;
  towerCd: Record<number, number>;
  trapsUsed: number[];
  events: BattleEvent[];
  seq: number;
  nextId: number;
  stolen: Resources;
  killed: number;
  total: number;
  lost: Record<UnitType, number>;
  wrecked: number[];
  /** Giây còn lại của Trống trận. */
  rally: number;
  /** Kỹ năng bấm được trong trận này. */
  skills: SkillId[];
  /** Thánh Gióng trong trận; `down` khi Gióng đã kiệt sức rút khỏi trận. */
  hero: (HeroSetup & { down: boolean }) | null;
  /** Phần cộng thêm vào máu và sát thương quân ta (Đền Phù Đổng). */
  bonus: number;
  /** Trận ngoài bãi: giặc khỏe gấp mấy lần (để thủy quái Thủy Tinh gọi lên khỏe như giặc của màn). */
  hpScale?: number;
  /** Trận cuối chương 1 vừa thắng: phần vẽ cho Gióng bay về trời. */
  ascend?: boolean;
  /** Trận cuối chương 2 vừa thắng: phần vẽ cho núi Tản Viên dâng cao dưới chân Sơn Tinh. */
  sonWin?: boolean;
  /** Trận cuối chương 3 vừa thắng: phần vẽ cho Rùa Vàng nổi lên dưới chân An Dương Vương. */
  advWin?: boolean;
  /** Trận ngoài bãi đánh đồn giặc bên kia sông (khoảnh có đồn) thay cho một màn phó bản; `wave` khi ấy là 0. */
  camp?: number;
  /** Ai đánh kinh đô (trận ngoài bãi để 'an'). Yêu tinh nhắm phá thành Cổ Loa trước tiên. */
  foe: Foe;
  /** Giây còn lại của Rùa Vàng che chở quân ta. */
  shield: number;
  /** Đền Cổ Loa còn nguyên: chòi canh bắn mạnh hơn, xa hơn. */
  crossbows: boolean;
  /**
   * Hệ số hình học: tầm đánh, tốc độ, bán kính kỹ năng tính bằng ô nhân với số này. Ngoài bãi là 1, giữ kinh đô
   * là `RAID_SCALE` (kinh đô giãn rộng). Bản lưu cũ không có thì coi như 1.
   */
  geo?: number;
  /** Giữ kinh đô, giặc trên bộ: giặc bỏ chạy qua lại vạch này (tọa độ theo chiều sâu từ bìa rừng) là thoát. */
  exitAt?: number;
  /** Bậc binh khí đã rèn của từng binh chủng ta (0–2): thêm máu và sức đánh. */
  arms: Record<UnitType, number>;
  /** Mùa lũ thứ mấy (0 nếu không phải mùa lũ). */
  flood: number;
  /** Mực nước lũ sẽ dâng tới (bậc), 0 nếu không có lũ. */
  floodTo: number;
  /** Mực nước đang dâng (bậc). */
  water: number;
  /** Công trình bị nước lũ làm hư trong trận này. */
  drowned: number[];
  /** Giặc bơi được dưới sông (thủy quái). */
  swim: boolean;
  /** Giây còn phải chờ để dùng lại từng kỹ năng. */
  skillCd: Partial<Record<SkillId, number>>;
  /** Kết cục trận ngoài bãi; trận giữ kinh đô luôn để null. */
  outcome: 'win' | 'lose' | 'retreat' | null;
}

const statsOf = (k: FighterKind): FighterStats =>
  k === 'giong' ? GIONG : k === 'sonTinh' ? SON : k === 'anDuong' ? ADV : k in UNITS ? UNITS[k as UnitType] : ENEMIES[k as EnemyType];
const tileIndex = (x: number, z: number) => z * GRID + x;
/** Hệ số hình học của trận (xem `Battle.geo`). */
const geoOf = (battle: Pick<Battle, 'geo'>) => battle.geo ?? 1;

/** Số ngẫu nhiên lặp lại được theo hạt giống. */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Khoảng cách từ điểm tới hình chữ nhật móng công trình (đơn vị ô). */
export function rectDist(x: number, z: number, b: Building): number {
  const def = BUILDINGS[b.type];
  const dx = Math.max(b.x - x, 0, x - (b.x + def.w));
  const dz = Math.max(b.z - z, 0, z - (b.z + def.d));
  return Math.hypot(dx, dz);
}

function maxHpOf(b: Building): number {
  return BUILDINGS[b.type].hp[b.level - 1] ?? 100;
}

export function buildingHp(battle: Battle, b: Building): number {
  return battle.hp[b.id] ?? maxHpOf(b);
}

/** Công trình giặc có thể nhắm tới (không tính lũy, bẫy, đê, thành, không tính cái đã hư). */
function isTargetable(b: Building): boolean {
  return !b.damaged && b.type !== 'luy' && b.type !== 'bayChong' && b.type !== 'de' && b.type !== 'thanh' && !isBridge(b.type);
}

/** Yêu tinh nhắm phá thành Cổ Loa trước tiên, rồi mới tới kho và Điện. */
function targetableIn(battle: Battle, b: Building): boolean {
  return isTargetable(b) || (battle.foe === 'yeu' && b.type === 'thanh' && !b.damaged);
}

// ---------- Khởi đầu trận ----------

function newBattle(id: number, mode: Battle['mode'], wave: number, side: RaidSide): Battle {
  return {
    id,
    mode,
    wave,
    side,
    t: 0,
    fighters: [],
    hp: {},
    towerCd: {},
    trapsUsed: [],
    events: [],
    seq: 0,
    nextId: 1,
    stolen: { gao: 0, voOc: 0, datDa: 0, sat: 0 },
    killed: 0,
    total: 0,
    lost: { giao: 0, cung: 0, voi: 0 },
    wrecked: [],
    rally: 0,
    skills: ['trongTran'],
    hero: null,
    bonus: 0,
    skillCd: {},
    outcome: null,
    flood: 0,
    floodTo: 0,
    water: 0,
    drowned: [],
    swim: false,
    foe: 'an',
    shield: 0,
    crossbows: false,
    arms: { giao: 0, cung: 0, voi: 0 },
  };
}

/** Phần binh khí đã rèn cộng thêm vào máu và sức đánh của một lính ta (tướng và giặc không có). */
export function armsBonus(battle: Pick<Battle, 'arms'>, kind: FighterKind): number {
  return kind in UNITS ? (battle.arms[kind as UnitType] ?? 0) * ARMS_BONUS : 0;
}

/** Kỹ năng của từng tướng: kỹ năng đầu có ngay, kỹ năng sau mở giữa chương. */
export function heroSkills(hero: HeroSetup): SkillId[] {
  if (hero.kind === 'sonTinh') return hero.non ? ['bocDoi', 'doiNon'] : ['bocDoi'];
  if (hero.kind === 'anDuong') return hero.kimQuy ? ['noThan', 'ruaVang'] : ['noThan'];
  return hero.bamboo ? ['phunLua', 'nhoTre'] : ['phunLua'];
}

/** Cho tướng vào trận ở (x, z) và mở các kỹ năng của tướng. */
function addHero(battle: Battle, hero: HeroSetup, x: number, z: number, hpMul: number): void {
  battle.hero = { ...hero, down: false };
  battle.skills.push(...heroSkills(hero));
  const f = newFighter(battle, 'ta', hero.kind, x, z, statsOf(hero.kind).hp * hpMul * (1 + battle.bonus));
  battle.fighters.push(f);
}

export interface BattleOpts {
  hero?: HeroSetup | null;
  bonus?: number;
  /** Mùa lũ thứ `n`, nước dâng tới `level` bậc, thủy quái bơi từ sông lên. */
  flood?: { n: number; level: number } | null;
  /** Yêu tinh hay quân Triệu kéo tới lần thứ `n` (thay cho giặc Ân). */
  land?: { foe: 'yeu' | 'trieu'; n: number } | null;
  /** Đền Cổ Loa còn nguyên. */
  crossbows?: boolean;
  /** Bậc binh khí đã rèn của từng binh chủng. */
  arms?: Record<UnitType, number>;
}

/**
 * Dải giặc trên bộ xuất phát ở bìa rừng phía bắc (hay phía tây, đối xứng): dọc theo bìa từ `lo` tới bờ sông,
 * sâu từ `from` tới `to` ô tính từ mép lưới. Cách sông xa như ở kinh đô nhỏ trước kia nhân `RAID_SCALE`, nhưng luôn
 * ở ngoài vùng đã khai phá. Phần vẽ dùng để đặt dải báo giặc, ma trơi và hướng camera.
 */
export function raidSpawnBand(state: GameState): { lo: number; from: number; to: number } {
  const open = areaStart(dienLevel(state));
  const at = (r: number) => spawnDepth(open, r);
  return { lo: Math.min(open, fromRiver(24)), from: at(0), to: at(1) };
}

/** Ô cách sông như ô cách sông `old` ô ở kinh đô nhỏ, giãn theo `RAID_SCALE`. */
const fromRiver = (old: number) => RIVER_START - RAID_SCALE * old;
/** Chiều sâu chỗ giặc trên bộ xuất phát (số ngẫu nhiên `r` 0..1), vùng đã khai phá bắt đầu từ ô `open`. */
const spawnDepth = (open: number, r: number) => Math.max(0.6, Math.min(fromRiver(26.4 - 1.4 * r), open - 2 + 1.4 * r));

export function startBattle(state: GameState, wave: number, side: RaidSide, opts: BattleOpts = {}): Battle {
  const battle = newBattle(state.nextBattleId++, 'raid', wave, side);
  battle.bonus = opts.bonus ?? 0;
  battle.crossbows = opts.crossbows ?? false;
  if (opts.arms) battle.arms = { ...opts.arms };
  const land = opts.land ?? null;
  battle.geo = RAID_SCALE;
  const rand = rng(wave * 7919 + ['bac', 'tay', 'nam', 'dong', 'namXa', 'dongXa'].indexOf(side) + 1);
  const far = farSideBank(side);
  // Giặc trên bộ ra từ dải ở bìa rừng (`raidSpawnBand`).
  const open = areaStart(dienLevel(state));
  const lo = Math.min(open, fromRiver(24));
  let exitAt = Infinity;
  const flood = opts.flood ?? null;
  if (flood) {
    battle.flood = flood.n;
    battle.floodTo = flood.level;
    battle.swim = true;
    battle.foe = 'thuy';
  } else if (land) {
    battle.foe = land.foe;
  }
  const forces = flood
    ? floodForces(flood.n)
    : land?.foe === 'yeu'
      ? yeuForces(land.n)
      : land?.foe === 'trieu'
        ? trieuForces(land.n)
        : raidForces(wave);
  const scale = flood
    ? floodHpScale(flood.n)
    : land?.foe === 'yeu'
      ? yeuHpScale(land.n)
      : land?.foe === 'trieu'
        ? trieuHpScale(land.n)
        : raidHpScale(wave);
  for (const kind of Object.keys(forces) as EnemyType[]) {
    for (let i = 0; i < (forces[kind] ?? 0); i++) {
      // Giặc Ân ra từ bìa rừng: cạnh bắc (z nhỏ) hoặc cạnh tây (x nhỏ).
      // Thủy quái ngoi lên từ sông: phía nam (z lớn) hoặc phía đông (x lớn).
      // Bên kia sông: ra từ dải rừng ngoài cùng của bờ ấy, dọc suốt bờ.
      const along = far ? 2 + rand() * (RIVER_START - 3) : lo + rand() * (RIVER_START - lo - 1);
      const r = rand();
      const depth = far ? FAR_FOREST + 0.3 + r * 1.4 : flood ? RIVER_START + 0.4 + r * 1.4 : spawnDepth(open, r);
      if (!flood && !far) exitAt = Math.min(exitAt, depth - 0.6 * RAID_SCALE);
      const hp = ENEMIES[kind].hp * scale;
      const alongX = side === 'bac' || side === 'nam' || side === 'namXa';
      battle.fighters.push(newFighter(battle, 'giac', kind, alongX ? along : depth, alongX ? depth : along, hp));
      battle.total++;
    }
  }
  if (!flood && !far) battle.exitAt = Math.max(exitAt, -0.5);
  const barracks = state.buildings.find((b) => b.type === 'doanhTrai');
  // Lính đóng ở đồn biên (còn nguyên) ra trận từ đồn ấy, còn lại ra từ doanh trại.
  const spawnAt = (home: Building, kind: UnitType, n: number) => {
    const def = BUILDINGS[home.type];
    for (let i = 0; i < n; i++) {
      const x = home.x + def.w / 2 + (rand() - 0.5) * def.w;
      const z = home.z + def.d / 2 + (rand() - 0.5) * def.d;
      battle.fighters.push(newFighter(battle, 'ta', kind, x, z, UNITS[kind].hp * (1 + battle.bonus + armsBonus(battle, kind))));
    }
  };
  for (const kind of Object.keys(state.troops) as UnitType[]) {
    let left = state.troops[kind];
    for (const { fort, n } of garrisonPosts(state, kind)) {
      const k = Math.min(n, left);
      spawnAt(fort, kind, k);
      left -= k;
    }
    if (barracks) spawnAt(barracks, kind, left);
  }
  // Tướng ở doanh trại, ra trận cùng quân từ sân doanh trại. Chưa có doanh trại thì ra từ trước Điện.
  if (opts.hero) {
    const dien = state.buildings.find((b) => b.type === 'dien');
    if (barracks) addHero(battle, opts.hero, barracks.x + BUILDINGS.doanhTrai.w / 2, barracks.z + BUILDINGS.doanhTrai.d, 1);
    else if (dien) addHero(battle, opts.hero, dien.x + BUILDINGS.dien.w / 2, dien.z + BUILDINGS.dien.d + 0.6, 1);
  }
  return battle;
}

function newFighter(battle: Battle, side: Side, kind: FighterKind, x: number, z: number, hp: number): Fighter {
  return {
    id: battle.nextId++,
    side,
    kind,
    x,
    z,
    hp,
    maxHp: hp,
    cd: 0,
    targetUnit: null,
    targetBuilding: null,
    path: null,
    pathAt: 0,
    repathIn: 0,
    loot: false,
    state: 'move',
    face: 0,
    swing: 0,
  };
}

export interface FieldSetup {
  id: number;
  stage: number;
  enemies: Partial<Record<EnemyType, number>>;
  hpScale: number;
  army: Record<UnitType, number>;
  rows: Record<UnitType, Row>;
  hero?: HeroSetup | null;
  bonus?: number;
  arms?: Record<UnitType, number>;
  /** Đánh đồn giặc bên kia sông (khoảnh có đồn) thay cho màn phó bản. */
  camp?: number;
}

/** An Dương Vương bắn nỏ: đứng lùi sau hàng đầu của quân ta chừng này ô. */
const ADV_BACK = 1.8;

/** Số lính đứng trên một hàng ngang. Đông hơn thì xếp thêm hàng phía sau. */
const PER_LINE = 8;

/**
 * Trận ngoài bãi: quân ta dàn ở phía z lớn, giặc ở phía z nhỏ, mỗi bên ba hàng
 * (tiền quân đứng gần đối phương nhất). Lính đứng giãn đều theo bề ngang bãi.
 */
export function startFieldBattle(setup: FieldSetup): Battle {
  const battle = newBattle(setup.id, 'field', setup.stage, 'bac');
  battle.bonus = setup.bonus ?? 0;
  battle.hpScale = setup.hpScale;
  if (setup.arms) battle.arms = { ...setup.arms };
  if (setup.camp !== undefined) battle.camp = setup.camp;
  const rand = rng(setup.id * 7919 + setup.stage);
  const ours: Record<Row, FighterKind[]> = { tien: [], trung: [], hau: [] };
  for (const k of UNIT_TYPES) for (let i = 0; i < (setup.army[k] ?? 0); i++) ours[setup.rows[k]].push(k);
  const theirs: Record<Row, FighterKind[]> = { tien: [], trung: [], hau: [] };
  for (const k of Object.keys(setup.enemies) as EnemyType[]) for (let i = 0; i < (setup.enemies[k] ?? 0); i++) theirs[ENEMY_ROWS[k]].push(k);
  const front = (FIELD.d - FIELD.gap) / 2;
  deploy(battle, 'ta', ours, FIELD.d - front, 1, rand, (k) => UNITS[k as UnitType].hp * FIELD.hpMul * (1 + battle.bonus + armsBonus(battle, k)));
  deploy(battle, 'giac', theirs, front, -1, rand, (k) => ENEMIES[k as EnemyType].hp * setup.hpScale * FIELD.hpMul);
  battle.total = battle.fighters.filter((f) => f.side === 'giac').length;
  // Tướng đứng giữa, trước tiền quân. An Dương Vương bắn nỏ thì đứng sau tiền quân.
  if (setup.hero) addHero(battle, setup.hero, FIELD.w / 2, FIELD.d - front + (setup.hero.kind === 'anDuong' ? ADV_BACK : -0.8), FIELD.hpMul);
  return battle;
}

/** Dàn quân từ hàng đầu `front` lùi dần về phía `dir` (+1: về z lớn, −1: về z nhỏ). */
function deploy(battle: Battle, side: Side, rows: Record<Row, FighterKind[]>, front: number, dir: number, rand: () => number, hpOf: (k: FighterKind) => number): void {
  let z = front;
  for (const row of ROWS) {
    const list = rows[row];
    if (!list.length) continue;
    for (let start = 0; start < list.length; start += PER_LINE) {
      const line = list.slice(start, start + PER_LINE);
      line.forEach((kind, i) => {
        const x = (FIELD.w * (i + 1)) / (line.length + 1) + (rand() - 0.5) * 0.3;
        const f = newFighter(battle, side, kind, x, clampField(z + (rand() - 0.5) * 0.2, FIELD.d), hpOf(kind));
        f.face = dir > 0 ? Math.PI : 0;
        battle.fighters.push(f);
      });
      z += dir * 0.9;
    }
    z += dir * 0.6;
  }
}

const clampField = (v: number, max: number) => Math.min(max - 0.3, Math.max(0.3, v));

function emit(battle: Battle, e: Omit<BattleEvent, 'seq'>): void {
  battle.events.push({ ...e, seq: ++battle.seq });
  if (battle.events.length > 80) battle.events.splice(0, battle.events.length - 80);
}

// ---------- Tìm đường ----------

/**
 * Chi phí đi qua mỗi ô: sông không đi được (thủy quái thì bơi được) trừ chỗ có cầu còn nguyên, công trình còn nguyên
 * phải phá mới qua (chi phí cao).
 */
function costGrid(state: GameState, targetId: number | null, swim: boolean): Float32Array {
  const cost = new Float32Array(GRID * GRID).fill(1);
  if (!swim) for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) if (isRiver(x, z)) cost[tileIndex(x, z)] = Infinity;
  for (const b of state.buildings) {
    if (b.damaged || b.type === 'bayChong') continue;
    if (isBridge(b.type)) {
      // Cầu là lối đi, không phải chướng ngại.
      const def = BUILDINGS[b.type];
      for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) cost[tileIndex(b.x + dx, b.z + dz)] = 1;
      continue;
    }
    const def = BUILDINGS[b.type];
    const c =
      b.id === targetId
        ? 1
        : b.type === 'luy'
          ? b.level >= 2
            ? 30
            : 12
          : b.type === 'de'
            ? b.level >= 2
              ? 40
              : 18
            : b.type === 'thanh'
              ? 45
              : 25;
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) cost[tileIndex(b.x + dx, b.z + dz)] = c;
  }
  return cost;
}

/** Hàng đợi ưu tiên nhỏ nhất cho A*: khóa (f, thứ tự), giá trị là chỉ số ô. */
class OpenHeap {
  private f: number[] = [];
  private q: number[] = [];
  private v: number[] = [];
  get size(): number {
    return this.v.length;
  }
  private less(i: number, j: number): boolean {
    return this.f[i] < this.f[j] || (this.f[i] === this.f[j] && this.q[i] < this.q[j]);
  }
  private swap(i: number, j: number): void {
    [this.f[i], this.f[j]] = [this.f[j], this.f[i]];
    [this.q[i], this.q[j]] = [this.q[j], this.q[i]];
    [this.v[i], this.v[j]] = [this.v[j], this.v[i]];
  }
  push(f: number, q: number, v: number): void {
    this.f.push(f);
    this.q.push(q);
    this.v.push(v);
    let i = this.v.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): number {
    const top = this.v[0];
    const last = this.v.length - 1;
    this.swap(0, last);
    this.f.pop();
    this.q.pop();
    this.v.pop();
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < this.v.length && this.less(l, m)) m = l;
      if (r < this.v.length && this.less(r, m)) m = r;
      if (m === i) break;
      this.swap(i, m);
      i = m;
    }
    return top;
  }
}

/** A* trên lưới 8 hướng, tới bất kỳ ô nào thuộc móng công trình đích. `swim`: bơi được qua sông. */
export function findPath(state: GameState, fromX: number, fromZ: number, target: Building, swim = false): number[] | null {
  const cost = costGrid(state, target.id, swim);
  const def = BUILDINGS[target.type];
  const sx = Math.min(GRID - 1, Math.max(0, Math.floor(fromX)));
  const sz = Math.min(GRID - 1, Math.max(0, Math.floor(fromZ)));
  const start = tileIndex(sx, sz);
  const isGoal = (i: number) => {
    const x = i % GRID;
    const z = Math.floor(i / GRID);
    return x >= target.x && x < target.x + def.w && z >= target.z && z < target.z + def.d;
  };
  const tx = target.x + def.w / 2;
  const tz = target.z + def.d / 2;
  const h = (i: number) => Math.hypot((i % GRID) + 0.5 - tx, Math.floor(i / GRID) + 0.5 - tz);
  const g = new Float32Array(GRID * GRID).fill(Infinity);
  const came = new Int32Array(GRID * GRID).fill(-1);
  const closed = new Uint8Array(GRID * GRID);
  // Hàng đợi ưu tiên theo f = g + h; hòa thì ô thêm vào trước được xét trước (như cách dò tuần tự cũ).
  // Ô có g tốt hơn thì thêm lại một mục mới, mục cũ bỏ qua khi lấy ra.
  const seqOf = new Int32Array(GRID * GRID);
  const heap = new OpenHeap();
  let seq = 0;
  g[start] = 0;
  seqOf[start] = seq++;
  heap.push(h(start), seqOf[start], start);
  while (heap.size) {
    const cur = heap.pop();
    if (closed[cur]) continue;
    if (isGoal(cur)) {
      const path = [cur];
      let c = cur;
      while (came[c] !== -1) {
        c = came[c];
        path.unshift(c);
      }
      return path;
    }
    closed[cur] = 1;
    const cx = cur % GRID;
    const cz = Math.floor(cur / GRID);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (!inGrid(nx, nz)) continue;
        const ni = tileIndex(nx, nz);
        if (closed[ni] || cost[ni] === Infinity) continue;
        // Không đi chéo cắt góc qua ô không đi được.
        if (dx && dz && (cost[tileIndex(cx + dx, cz)] === Infinity || cost[tileIndex(cx, cz + dz)] === Infinity)) continue;
        const ng = g[cur] + cost[ni] * (dx && dz ? Math.SQRT2 : 1);
        if (ng < g[ni]) {
          if (g[ni] === Infinity) seqOf[ni] = seq++;
          g[ni] = ng;
          came[ni] = cur;
          heap.push(g[ni] + h(ni), seqOf[ni], ni);
        }
      }
    }
  }
  return null;
}

// ---------- Từng bước của trận ----------

function nearestEnemyOf(battle: Battle, f: Fighter, within = Infinity): Fighter | null {
  let best: Fighter | null = null;
  let bestD = within;
  for (const o of battle.fighters) {
    if (o.side === f.side || (o.state !== 'move' && o.state !== 'fight' && o.state !== 'flee')) continue;
    const d = Math.hypot(o.x - f.x, o.z - f.z);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

function chooseTarget(state: GameState, battle: Battle, f: Fighter): Building | null {
  const pick = (list: Building[]) =>
    list.reduce<Building | null>((best, b) => (!best || rectDist(f.x, f.z, b) < rectDist(f.x, f.z, best) ? b : best), null);
  // Yêu tinh núi Thất Diệu phá thành Cổ Loa trước tiên.
  if (battle.foe === 'yeu') {
    const wall = pick(state.buildings.filter((b) => b.type === 'thanh' && !b.damaged));
    if (wall) return wall;
  }
  const live = state.buildings.filter(isTargetable);
  const bank = farSideBank(battle.side);
  if (bank) {
    // Giặc bên kia sông đánh làng gần nhất trước; còn cầu thì qua cầu tìm kho, Điện; không thì phá công trình bên ấy.
    const mine = live.filter((b) => farBankOf(b.x, b.z) === bank);
    const bridge = bridgeTo(state, bank);
    const across = bridge && !bridge.damaged ? live.filter((b) => farBankOf(b.x, b.z) === null) : [];
    return pick(mine.filter((b) => b.type === 'lang')) ?? pick(across.filter((b) => b.type === 'kho')) ?? pick(across.filter((b) => b.type === 'dien')) ?? pick(mine) ?? pick(across);
  }
  return pick(live.filter((b) => b.type === 'kho')) ?? pick(live.filter((b) => b.type === 'dien')) ?? pick(live);
}

function moveToward(f: Fighter, tx: number, tz: number, dt: number, mult = 1, geo = 1): boolean {
  const dx = tx - f.x;
  const dz = tz - f.z;
  const d = Math.hypot(dx, dz);
  const step = statsOf(f.kind).speed * geo * mult * (f.slow && f.slow > 0 ? TT_WAVE.slow : 1) * dt;
  if (d > 1e-6) f.face = Math.atan2(dx, dz);
  if (d <= step) {
    f.x = tx;
    f.z = tz;
    return true;
  }
  f.x += (dx / d) * step;
  f.z += (dz / d) * step;
  return false;
}

function damageFighter(battle: Battle, attacker: { kind?: FighterKind; dmg: number }, target: Fighter): void {
  const bonus = attacker.kind && statsOf(attacker.kind).strongVs?.includes(target.kind as UnitType | EnemyType) ? 2 : 1;
  // Rùa Vàng che chở: quân ta chỉ chịu một phần sát thương.
  const shield = target.side === 'ta' && battle.shield > 0 ? KIM_QUY.reduce : 1;
  target.hp -= attacker.dmg * bonus * shield;
  if (isHero(target.kind)) {
    // Tướng không chết: hết sức thì rút khỏi trận, nghỉ một lúc.
    if (target.hp <= 0 && target.state !== 'gone') {
      target.hp = 0;
      target.state = 'gone';
      if (battle.hero) battle.hero.down = true;
      emit(battle, { kind: 'exhaust', x: target.x, z: target.z });
    }
    return;
  }
  if (target.hp <= 0 && target.state !== 'dead') {
    target.state = 'dead';
    target.hp = 0;
    emit(battle, { kind: 'die', x: target.x, z: target.z });
    if (target.side === 'giac') battle.killed++;
    else if (target.kind in battle.lost) battle.lost[target.kind as UnitType]++;
  }
}

/** Một đòn của `f` vào `foe`: bắn tên nếu đánh xa, quân ta mạnh hơn khi đang có Trống trận. */
function strike(battle: Battle, f: Fighter, foe: Fighter): void {
  const st = statsOf(f.kind);
  if (st.range > 2) emit(battle, { kind: 'shot', x: f.x, z: f.z, tx: foe.x, tz: foe.z, by: f.kind });
  const mult = f.side === 'ta' ? (1 + battle.bonus + armsBonus(battle, f.kind)) * (battle.rally > 0 ? RALLY.dmg : 1) : 1;
  const dmg = st.dmg * mult;
  damageFighter(battle, { kind: f.kind, dmg }, foe);
  if (isHero(f.kind)) {
    // Đòn của tướng quét cả giặc đứng quanh.
    for (const o of battle.fighters) {
      if (o === foe || o.side === f.side || !isAlive(o)) continue;
      if (Math.hypot(o.x - foe.x, o.z - foe.z) <= HERO_CLEAVE.radius * geoOf(battle)) damageFighter(battle, { dmg: dmg * HERO_CLEAVE.share }, o);
    }
  }
  f.cd = st.cooldown;
  f.swing = 0.3;
}

function damageBuilding(state: GameState, battle: Battle, attacker: Fighter, b: Building, dmg: number): void {
  const hp = buildingHp(battle, b) - dmg;
  battle.hp[b.id] = hp;
  if (hp > 0 || b.damaged) return;
  b.damaged = true;
  battle.wrecked.push(b.id);
  const def = BUILDINGS[b.type];
  emit(battle, { kind: 'wreck', x: b.x + def.w / 2, z: b.z + def.d / 2 });
  const share = LOOT_FRACTION[b.type];
  if (share && attacker.side === 'giac') {
    for (const r of RESOURCE_IDS) {
      const take = Math.floor(state.resources[r] * share);
      state.resources[r] -= take;
      battle.stolen[r] += take;
    }
    attacker.loot = true;
    attacker.state = 'flee';
    emit(battle, { kind: 'loot', x: attacker.x, z: attacker.z });
  }
}

/** Chỗ giặc bỏ chạy về: bìa rừng phía đã kéo tới, hay lặn xuống sông (bơi tới mép sông bên kia rồi lặn). */
function exitPoint(battle: Battle, f: Fighter): { x: number; z: number } {
  if (battle.side === 'nam') return { x: f.x, z: RIVER_END + 0.5 };
  if (battle.side === 'dong') return { x: RIVER_END + 0.5, z: f.z };
  // Bên kia sông: về bìa rừng ngoài cùng bên ấy (qua cầu nếu đang ở bên này; không có đường thì đi thẳng).
  if (battle.side === 'namXa') return { x: f.x, z: GRID + 0.5 };
  if (battle.side === 'dongXa') return { x: GRID + 0.5, z: f.z };
  const out = (battle.exitAt ?? -0.5) - 1;
  return battle.side === 'bac' ? { x: f.x, z: out } : { x: out, z: f.z };
}

/** Giặc bỏ chạy đã thoát chưa: lặn xuống sông, hay lùi qua vạch xuất phát ở bìa rừng. */
function escaped(battle: Battle, f: Fighter): boolean {
  if (battle.side === 'namXa') return f.z > GRID - 0.3;
  if (battle.side === 'dongXa') return f.x > GRID - 0.3;
  if (f.x < 0 || f.z < 0 || f.x > RIVER_END || f.z > RIVER_END) return true;
  const line = battle.exitAt ?? -0.5;
  if (battle.side === 'bac') return f.z < line;
  if (battle.side === 'tay') return f.x < line;
  return false;
}

/** Đang bị đá giữ chân thì đứng yên, không đánh. */
function stunned(f: Fighter, dt: number): boolean {
  if (!f.stun || f.stun <= 0) return false;
  f.stun = Math.max(0, f.stun - dt);
  return true;
}

function stepEnemy(state: GameState, battle: Battle, f: Fighter, dt: number): void {
  const st = statsOf(f.kind);
  const reach = st.range * geoOf(battle);
  if (f.state === 'flee') {
    const out = exitPoint(battle, f);
    moveToward(f, out.x, out.z, dt, 1, geoOf(battle));
    if (escaped(battle, f)) f.state = 'gone';
    return;
  }
  if (stunned(f, dt)) return;
  // Gặp quân ta ở gần thì đánh.
  const foe = nearestEnemyOf(battle, f, reach + 0.5);
  if (foe) {
    f.state = 'fight';
    f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
    if (f.cd <= 0) strike(battle, f, foe);
    return;
  }
  // Nhắm kho, rồi tới Điện, rồi công trình gần nhất.
  let target = f.targetBuilding !== null ? state.buildings.find((b) => b.id === f.targetBuilding) : undefined;
  if (!target || !targetableIn(battle, target)) {
    target = chooseTarget(state, battle, f) ?? undefined;
    f.targetBuilding = target ? target.id : null;
    f.path = null;
  }
  if (!target) {
    f.state = 'flee';
    return;
  }
  if (rectDist(f.x, f.z, target) <= reach + 0.1) {
    f.state = 'fight';
    if (f.cd <= 0) {
      const def = BUILDINGS[target.type];
      if (st.range > 2) emit(battle, { kind: 'shot', x: f.x, z: f.z, tx: target.x + def.w / 2, tz: target.z + def.d / 2 });
      f.face = Math.atan2(target.x + def.w / 2 - f.x, target.z + def.d / 2 - f.z);
      damageBuilding(state, battle, f, target, st.dmg);
      f.cd = st.cooldown;
      f.swing = 0.3;
    }
    return;
  }
  f.repathIn -= dt;
  if (!f.path || f.repathIn <= 0) {
    f.path = findPath(state, f.x, f.z, target, battle.swim && SWIMMERS.includes(f.kind as EnemyType));
    f.pathAt = 1;
    f.repathIn = 2;
  }
  if (!f.path || f.pathAt >= f.path.length) {
    f.state = 'move';
    moveToward(f, target.x + BUILDINGS[target.type].w / 2, target.z + BUILDINGS[target.type].d / 2, dt, 1, geoOf(battle));
    return;
  }
  const next = f.path[f.pathAt];
  const nx = next % GRID;
  const nz = Math.floor(next / GRID);
  // Ô tiếp theo có lũy hay công trình chắn đường: phá nó trước.
  const blocker = state.buildings.find((b) => {
    if (b.damaged || b.id === target!.id || b.type === 'bayChong' || isBridge(b.type)) return false;
    const def = BUILDINGS[b.type];
    return nx >= b.x && nx < b.x + def.w && nz >= b.z && nz < b.z + def.d;
  });
  if (blocker) {
    if (rectDist(f.x, f.z, blocker) <= reach + 0.15) {
      f.state = 'fight';
      f.face = Math.atan2(nx + 0.5 - f.x, nz + 0.5 - f.z);
      if (f.cd <= 0) {
        damageBuilding(state, battle, f, blocker, st.dmg);
        f.cd = st.cooldown;
        f.swing = 0.3;
      }
      return;
    }
  }
  f.state = 'move';
  if (moveToward(f, nx + 0.5, nz + 0.5, dt, 1, geoOf(battle)) && !blocker) f.pathAt++;
}

/** Xông tới kẻ địch gần nhất rồi đánh. Quân ta làm vậy trong mọi trận, giặc làm vậy khi đánh ngoài bãi. */
function stepChase(battle: Battle, f: Fighter, dt: number): void {
  if (stunned(f, dt)) return;
  const st = statsOf(f.kind);
  const foe = nearestEnemyOf(battle, f);
  if (!foe) {
    f.state = 'move';
    return;
  }
  const d = Math.hypot(foe.x - f.x, foe.z - f.z);
  if (d <= st.range * geoOf(battle) + 0.3) {
    f.state = 'fight';
    f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
    if (f.cd <= 0) strike(battle, f, foe);
    return;
  }
  f.state = 'move';
  moveToward(f, foe.x, foe.z, dt, f.side === 'ta' && battle.rally > 0 ? RALLY.speed : 1, geoOf(battle));
}

function stepDefenses(state: GameState, battle: Battle, dt: number): void {
  for (const b of state.buildings) {
    if (b.damaged) continue;
    if (b.type === 'choiCanh') {
      const cd = (battle.towerCd[b.id] ?? 0) - dt;
      battle.towerCd[b.id] = cd;
      if (cd > 0) continue;
      const tower = { x: b.x + 0.5, z: b.z + 0.5 };
      let best: Fighter | null = null;
      let bestD = (TOWER.range + (battle.crossbows ? CO_LOA_TOWER.range : 0)) * geoOf(battle);
      for (const o of battle.fighters) {
        if (o.side !== 'giac' || (o.state !== 'move' && o.state !== 'fight' && o.state !== 'flee')) continue;
        const d = Math.hypot(o.x - tower.x, o.z - tower.z);
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
      if (best) {
        emit(battle, { kind: 'shot', x: tower.x, z: tower.z, tx: best.x, tz: best.z });
        damageFighter(battle, { dmg: TOWER.dmg[b.level - 1] * (battle.crossbows ? CO_LOA_TOWER.dmg : 1) }, best);
        battle.towerCd[b.id] = TOWER.cooldown;
      }
    }
    if (b.type === 'lauNo') {
      const cd = (battle.towerCd[b.id] ?? 0) - dt;
      battle.towerCd[b.id] = cd;
      if (cd > 0) continue;
      // Lầu nỏ: mỗi phát bắn ba giặc gần nhất trong tầm, mỗi mũi một tên.
      const tower = { x: b.x + 0.5, z: b.z + 0.5 };
      const range = (LAU_NO.range + (battle.crossbows ? CO_LOA_TOWER.range : 0)) * geoOf(battle);
      const targets = battle.fighters
        .filter((o) => o.side === 'giac' && (o.state === 'move' || o.state === 'fight' || o.state === 'flee'))
        .map((o) => ({ o, d: Math.hypot(o.x - tower.x, o.z - tower.z) }))
        .filter((t) => t.d < range)
        .sort((p, q) => p.d - q.d)
        .slice(0, LAU_NO.targets);
      if (targets.length) {
        for (const { o } of targets) {
          emit(battle, { kind: 'shot', x: tower.x, z: tower.z, tx: o.x, tz: o.z });
          damageFighter(battle, { dmg: LAU_NO.dmg * (battle.crossbows ? CO_LOA_TOWER.dmg : 1) }, o);
        }
        battle.towerCd[b.id] = LAU_NO.cooldown;
      }
    }
    if (b.type === 'bayChong' && !battle.trapsUsed.includes(b.id)) {
      const victims = battle.fighters.filter(
        (o) => o.side === 'giac' && (o.state === 'move' || o.state === 'fight') && Math.hypot(o.x - b.x - 0.5, o.z - b.z - 0.5) < 0.7,
      );
      if (victims.length) {
        battle.trapsUsed.push(b.id);
        emit(battle, { kind: 'trap', x: b.x + 0.5, z: b.z + 0.5 });
        for (const v of victims) damageFighter(battle, { dmg: TRAP_DMG }, v);
      }
    }
  }
}

/** Giặc còn trên bản đồ (chưa chết, chưa chạy thoát). */
export function enemiesLeft(battle: Battle): number {
  return battle.fighters.filter((f) => f.side === 'giac' && f.state !== 'dead' && f.state !== 'gone').length;
}

export function alliesLeft(battle: Battle): number {
  return battle.fighters.filter((f) => f.side === 'ta' && f.state !== 'dead' && f.state !== 'gone').length;
}

/** Đồng hồ chung của mọi trận: thời gian, Trống trận, hồi kỹ năng. */
function advanceClock(battle: Battle, dt: number): void {
  battle.t += dt;
  battle.rally = Math.max(0, battle.rally - dt);
  battle.shield = Math.max(0, battle.shield - dt);
  for (const k of Object.keys(battle.skillCd) as SkillId[]) battle.skillCd[k] = Math.max(0, (battle.skillCd[k] ?? 0) - dt);
}

/**
 * Mùa lũ: nước dâng dần mỗi bậc FLOOD_RISE_S giây tới mực lũ, loang từ sông vào ô thấp.
 * Công trình bị ngập quá sức chịu của nền thì hư. Đê bị thủy quái phá thì nước tràn qua chỗ vỡ.
 */
function stepFlood(state: GameState, battle: Battle): void {
  if (battle.floodTo <= 0) return;
  battle.water = Math.min(battle.floodTo, battle.t / FLOOD_RISE_S);
  const wet = floodMap(state, battle.water, dienLevel(state));
  for (const b of state.buildings) {
    if (!drowns(state, b, wet, battle.water)) continue;
    b.damaged = true;
    battle.drowned.push(b.id);
    const def = BUILDINGS[b.type];
    emit(battle, { kind: 'drown', x: b.x + def.w / 2, z: b.z + def.d / 2 });
  }
}

/** Chạy trận giữ kinh đô thêm `dt` giây. Trả về true khi trận đã xong. */
export function stepBattle(state: GameState, battle: Battle, dt: number): boolean {
  advanceClock(battle, dt);
  stepFlood(state, battle);
  if (battle.t * 1000 > RAID_MAX_MS) {
    // Quá lâu thì giặc rút; quá lâu nữa thì coi như đã rút hết.
    for (const f of battle.fighters) if (f.side === 'giac' && (f.state === 'move' || f.state === 'fight')) f.state = 'flee';
    if (battle.t * 1000 > RAID_MAX_MS + 30_000) for (const f of battle.fighters) if (f.state === 'flee') f.state = 'gone';
  }
  for (const f of battle.fighters) {
    if (f.state === 'dead' || f.state === 'gone') continue;
    f.cd -= dt;
    f.swing = Math.max(0, f.swing - dt);
    if (f.side === 'giac') stepEnemy(state, battle, f, dt);
    else stepChase(battle, f, dt);
  }
  stepDefenses(state, battle, dt);
  return enemiesLeft(battle) === 0;
}

function isAlive(f: Fighter): boolean {
  return f.state !== 'dead' && f.state !== 'gone';
}
const BIG: FighterKind[] = [
  'voi',
  'chienXa',
  'phoTuong',
  'daiTuong',
  'giong',
  'sonTinh',
  'anDuong',
  'caSau',
  'thuongLuong',
  'thuyTinh',
  'hoTinh',
  'gaTrang',
  'kyBinh',
  'trieuDa',
];
const bodyRadius = (k: FighterKind) => (BIG.includes(k) ? 0.45 : 0.27);

/** Đẩy lính đứng chồng lên nhau ra, và giữ mọi người trong bãi. */
function separate(battle: Battle): void {
  const live = battle.fighters.filter(isAlive);
  for (let i = 0; i < live.length; i++) {
    const a = live[i];
    for (let j = i + 1; j < live.length; j++) {
      const b = live[j];
      const min = bodyRadius(a.kind) + bodyRadius(b.kind);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d >= min) continue;
      const nx = d > 1e-6 ? dx / d : 1;
      const nz = d > 1e-6 ? dz / d : 0;
      const push = (min - d) / 2;
      a.x -= nx * push;
      a.z -= nz * push;
      b.x += nx * push;
      b.z += nz * push;
    }
  }
  for (const f of live) {
    f.x = clampField(f.x, FIELD.w);
    f.z = clampField(f.z, FIELD.d);
  }
}

/** Chạy trận ngoài bãi thêm `dt` giây. Trả về true khi đã phân thắng bại (xem `outcome`). */
export function stepField(battle: Battle, dt: number): boolean {
  if (battle.outcome) return true;
  advanceClock(battle, dt);
  for (const f of battle.fighters) {
    if (!isAlive(f)) continue;
    f.cd -= dt;
    f.swing = Math.max(0, f.swing - dt);
    if (f.slow) f.slow = Math.max(0, f.slow - dt);
    if (f.kind === 'thuyTinh') stepThuyTinh(battle, f, dt);
    stepChase(battle, f, dt);
  }
  separate(battle);
  if (enemiesLeft(battle) === 0) battle.outcome = 'win';
  else if (alliesLeft(battle) === 0 || battle.t > FIELD.maxS) battle.outcome = 'lose';
  return battle.outcome !== null;
}

/** Thủy Tinh làm phép: hô mưa gọi gió (sóng quét đẩy lùi quân ta) và gọi thủy quái lên đánh tiếp. */
function stepThuyTinh(battle: Battle, f: Fighter, dt: number): void {
  const spell = (f.spell ??= { wave: TT_WAVE.first, summon: TT_SUMMON.first, summoned: 0 });
  if (f.stun && f.stun > 0) return;
  spell.wave -= dt;
  spell.summon -= dt;
  const foe = nearestEnemyOf(battle, f);
  if (spell.wave <= 0 && foe) {
    const d = Math.hypot(foe.x - f.x, foe.z - f.z);
    if (d > TT_WAVE.reach) spell.wave = 0.5;
    else {
      const dx = d > 1e-6 ? (foe.x - f.x) / d : 0;
      const dz = d > 1e-6 ? (foe.z - f.z) / d : 1;
      for (const o of battle.fighters) {
        if (o.side !== 'ta' || !isAlive(o)) continue;
        const along = (o.x - f.x) * dx + (o.z - f.z) * dz;
        const across = Math.abs((o.x - f.x) * dz - (o.z - f.z) * dx);
        if (along < -0.3 || along > TT_WAVE.length || across > TT_WAVE.width / 2) continue;
        damageFighter(battle, { kind: 'thuyTinh', dmg: TT_WAVE.dmg }, o);
        if (!isAlive(o)) continue;
        o.x = clampField(o.x + dx * TT_WAVE.push, FIELD.w);
        o.z = clampField(o.z + dz * TT_WAVE.push, FIELD.d);
        o.slow = TT_WAVE.slowS;
      }
      f.face = Math.atan2(dx, dz);
      f.swing = 0.4;
      spell.wave = TT_WAVE.cooldown;
      emit(battle, { kind: 'wave', x: f.x, z: f.z, tx: f.x + dx * TT_WAVE.length, tz: f.z + dz * TT_WAVE.length });
    }
  }
  if (spell.summon <= 0 && spell.summoned < TT_SUMMON.times) {
    const hp = ENEMIES.tomBinh.hp * (battle.hpScale ?? 1) * FIELD.hpMul;
    for (let i = 0; i < TT_SUMMON.count; i++) {
      const a = (i / TT_SUMMON.count) * Math.PI * 2 + spell.summoned;
      const t = newFighter(battle, 'giac', 'tomBinh', clampField(f.x + Math.sin(a) * 1.1, FIELD.w), clampField(f.z + Math.cos(a) * 1.1, FIELD.d), hp);
      battle.fighters.push(t);
      battle.total += 1;
    }
    spell.summoned += 1;
    spell.summon = TT_SUMMON.cooldown;
    f.swing = 0.4;
    emit(battle, { kind: 'summon', x: f.x, z: f.z });
  }
}

/** Rút quân khỏi trận ngoài bãi: lính còn sống được giữ lại, không có thưởng. */
export function retreatField(battle: Battle): void {
  if (battle.mode === 'field' && !battle.outcome) battle.outcome = 'retreat';
}

/** Tướng đang đứng trong trận (chưa kiệt sức). */
export function heroOf(battle: Battle): Fighter | undefined {
  return battle.fighters.find((f) => isHero(f.kind) && isAlive(f));
}

/** Chỗ giặc đứng đông nhất: tên giặc có nhiều đồng bọn quanh mình trong bán kính `r` nhất. */
function densest(battle: Battle, r: number): Fighter | null {
  let best: Fighter | null = null;
  let bestN = -1;
  for (const f of battle.fighters) {
    if (f.side !== 'giac' || !isAlive(f)) continue;
    let n = 0;
    for (const o of battle.fighters) if (o.side === 'giac' && isAlive(o) && Math.hypot(o.x - f.x, o.z - f.z) <= r) n++;
    if (n > bestN) {
      bestN = n;
      best = f;
    }
  }
  return best;
}

export function skillReady(battle: Battle, skill: SkillId): boolean {
  if (battle.outcome || !battle.skills.includes(skill) || (battle.skillCd[skill] ?? 0) > 0) return false;
  if (skill === 'trongTran') return alliesLeft(battle) > 0;
  const hero = heroOf(battle);
  return !!hero && heroSkills({ kind: hero.kind as HeroKind, bamboo: true, glow: false, non: true, kimQuy: true }).includes(skill) && enemiesLeft(battle) > 0;
}

/** Bấm kỹ năng. Trả về false khi kỹ năng chưa hồi, không có trong trận này, hoặc trận đã xong. */
export function useSkill(battle: Battle, skill: SkillId): boolean {
  if (!skillReady(battle, skill)) return false;
  const def = SKILLS[skill];
  battle.skillCd[skill] = def.cooldown;
  // Ngoài bãi mọi người bền hơn, nên đòn kỹ năng cũng mạnh lên tương ứng.
  const scale = (battle.mode === 'field' ? FIELD.hpMul : 1) * (1 + battle.bonus);
  const g = geoOf(battle);
  if (skill === 'trongTran') {
    battle.rally = def.duration;
    const allies = battle.fighters.filter((f) => f.side === 'ta' && isAlive(f));
    const x = allies.reduce((s, f) => s + f.x, 0) / allies.length;
    const z = allies.reduce((s, f) => s + f.z, 0) / allies.length;
    emit(battle, { kind: 'rally', x, z });
  } else if (skill === 'phunLua') {
    // Ngựa sắt phun lửa: lao về phía giặc gần nhất, đốt mọi tên giặc trong dải lửa.
    const hero = heroOf(battle)!;
    const target = nearestEnemyOf(battle, hero)!;
    const d = Math.hypot(target.x - hero.x, target.z - hero.z) || 1;
    const dx = (target.x - hero.x) / d;
    const dz = (target.z - hero.z) / d;
    for (const o of battle.fighters) {
      if (o.side === 'ta' || !isAlive(o)) continue;
      const along = (o.x - hero.x) * dx + (o.z - hero.z) * dz;
      const across = Math.abs((o.x - hero.x) * dz - (o.z - hero.z) * dx);
      if (along >= -0.3 && along <= FIRE.length * g && across <= (FIRE.width * g) / 2) damageFighter(battle, { kind: 'giong', dmg: FIRE.dmg * scale }, o);
    }
    const fromX = hero.x;
    const fromZ = hero.z;
    hero.x = clampField(hero.x + dx * FIRE.length * g * 0.8, battle.mode === 'field' ? FIELD.w : RIVER_START);
    hero.z = clampField(hero.z + dz * FIRE.length * g * 0.8, battle.mode === 'field' ? FIELD.d : RIVER_START);
    hero.face = Math.atan2(dx, dz);
    emit(battle, { kind: 'fire', x: fromX, z: fromZ, tx: hero.x, tz: hero.z });
  } else if (skill === 'nhoTre') {
    // Nhổ tre quật giặc: đòn diện rộng quanh Gióng, giặc bị hất lùi ra.
    const hero = heroOf(battle)!;
    for (const o of battle.fighters) {
      if (o.side === 'ta' || !isAlive(o)) continue;
      const d = Math.hypot(o.x - hero.x, o.z - hero.z);
      if (d > SMASH.radius * g) continue;
      damageFighter(battle, { kind: 'giong', dmg: SMASH.dmg * scale }, o);
      if (d > 1e-6 && isAlive(o)) {
        o.x += ((o.x - hero.x) / d) * SMASH.push * g;
        o.z += ((o.z - hero.z) / d) * SMASH.push * g;
      }
    }
    hero.swing = 0.3;
    emit(battle, { kind: 'smash', x: hero.x, z: hero.z });
  } else if (skill === 'bocDoi') {
    // Bốc đồi: Sơn Tinh nhấc một quả đồi ném xuống chỗ giặc đứng đông nhất.
    const hero = heroOf(battle)!;
    const at = densest(battle, HILL.radius * g)!;
    const cx = at.x;
    const cz = at.z;
    for (const o of battle.fighters) {
      if (o.side === 'ta' || !isAlive(o)) continue;
      if (Math.hypot(o.x - cx, o.z - cz) <= HILL.radius * g) damageFighter(battle, { kind: 'sonTinh', dmg: HILL.dmg * scale }, o);
    }
    hero.face = Math.atan2(cx - hero.x, cz - hero.z);
    hero.swing = 0.3;
    emit(battle, { kind: 'hill', x: hero.x, z: hero.z, tx: cx, tz: cz });
  } else if (skill === 'noThan') {
    // Nỏ thần: một phát tên bay ra hóa muôn mũi, trúng mọi kẻ địch còn đứng trên bãi.
    const hero = heroOf(battle)!;
    for (const o of battle.fighters) {
      if (o.side === 'ta' || !isAlive(o)) continue;
      damageFighter(battle, { kind: 'anDuong', dmg: NO_THAN.dmg * scale }, o);
    }
    const foe = nearestEnemyOf(battle, hero);
    if (foe) hero.face = Math.atan2(foe.x - hero.x, foe.z - hero.z);
    hero.swing = 0.3;
    emit(battle, { kind: 'volley', x: hero.x, z: hero.z });
  } else if (skill === 'ruaVang') {
    // Rùa Vàng nổi lên che chở: quân ta hồi máu, chỉ chịu một phần sát thương trong một lúc.
    const hero = heroOf(battle)!;
    battle.shield = def.duration;
    for (const o of battle.fighters) {
      if (o.side !== 'ta' || !isAlive(o)) continue;
      o.hp = Math.min(o.maxHp, o.hp + o.maxHp * KIM_QUY.heal);
    }
    hero.swing = 0.3;
    emit(battle, { kind: 'shield', x: hero.x, z: hero.z });
  } else {
    // Dời non: đá mọc lên dưới chân mọi kẻ địch quanh Sơn Tinh, giữ chân chúng vài giây.
    const hero = heroOf(battle)!;
    for (const o of battle.fighters) {
      if (o.side === 'ta' || !isAlive(o)) continue;
      if (Math.hypot(o.x - hero.x, o.z - hero.z) > ROCKS.radius * g) continue;
      damageFighter(battle, { kind: 'sonTinh', dmg: ROCKS.dmg * scale }, o);
      if (isAlive(o)) o.stun = ROCKS.stun;
    }
    hero.swing = 0.3;
    emit(battle, { kind: 'rocks', x: hero.x, z: hero.z });
  }
  return true;
}
