// Mô phỏng trận đánh, thuần logic, không vẽ gì. Có hai loại trận:
// - giữ kinh đô (`raid`): giặc Ân từ bìa rừng tìm đường tới kho và Điện, gặp lũy thì phá,
//   quân ta từ doanh trại ra đánh, chòi canh bắn, bẫy chông đâm;
// - ngoài bãi (`field`, phó bản): hai bên dàn ba hàng đối mặt nhau rồi xông vào đánh.
// Mùa lũ là trận giữ kinh đô kèm nước dâng: thủy quái bơi từ sông lên, nước tràn vào ô thấp làm hư công trình.
// Chương 3: đêm yêu tinh kéo về phá thành Cổ Loa trước tiên; quân Triệu Đà đánh kinh đô như giặc Ân.
// Chương 4: thủy binh Triệu đi thuyền từ sông tới, cập bờ thả lính lên đất rồi đánh như giặc trên bộ;
// ụ nỏ trên thành Cổ Loa tự bắn. Cao Lỗ bắn nỏ liên châu, ra Lệnh bắn cho lính nỏ. Màn 32 là màn cầm cự: giặc
// kéo tới nhiều đợt, giữ đủ thời gian thì thắng.
// Đấu thành (`pvp`): người chơi đánh kinh đô người khác (bản chụp, `dauThanh.ts`). Quân người chơi vẫn là phe `ta`
// (kỹ năng, Trống trận, Đền, binh khí như mọi trận) nhưng đi như giặc: tìm đường, phá công trình (`stepEnemy`);
// quân giữ thành là phe `giac` đi như lính giữ kinh đô (`stepGuard`); chòi canh, lầu nỏ, bẫy bắn phe `ta`.

import {
  ADV,
  ARMS_BONUS,
  BOAT,
  CAO_LO,
  DEN_CUONG_BOATS,
  LENH_BAN,
  LIEN_CHAU,
  BUILDINGS,
  isBridge,
  isDecor,
  CO_LOA_TOWER,
  CONG_THANH,
  CONG_DE_PATH,
  DAU_THANH,
  LAU_NO,
  ENEMIES,
  ENEMY_ROWS,
  FIELD,
  FIRE,
  FLOOD_RISE_S,
  GIONG,
  HERO_CLEAVE,
  HIEU_TRIEU,
  HILL,
  HUAN_BONUS,
  KIM_QUY,
  KIM_QUY_WALLS,
  KIM_QUY_WALL_TYPES,
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
  NGHIA_BINH,
  NU_TUONG_BONUS,
  HAT_MON_NGHIA_BINH,
  TOWER,
  TO_DINH_FLEE,
  TRAP_DMG,
  TRUNG_NHI,
  TRUNG_TRAC,
  TT_SUMMON,
  TT_WAVE,
  UNITS,
  UNIT_TYPES,
  VOI_XUNG,
  floodForces,
  floodHpScale,
  hanForces,
  hanHpScale,
  LAU_THUYEN,
  MA_VIEN_VOLLEY,
  thuyHanForces,
  thuyHanHpScale,
  raidForces,
  raidHpScale,
  thuyBinhForces,
  thuyBinhHpScale,
  trieuForces,
  trieuHpScale,
  U_NO,
  yeuForces,
  yeuHpScale,
  type BuildingType,
  type ChallengeKind,
  type EnemyType,
  type FighterStats,
  type HuanBranch,
  type NuTuongId,
  type Foe,
  type Resources,
  type Row,
  type SkillId,
  type StageWave,
  type UnitType,
  RAID_SCALE,
} from './defs';
import { barracksList, guardPlan, heroPost } from './doanhTrai';
import { nuBoosts, nuPosts } from './nuTuong';
import type { Building, GameState } from './game';
import { openStart } from './khoanh';
import { FAR_FOREST, FOREST_BAND, GRID, RIVER_DIVE, RIVER_END, RIVER_START, farBankOf, inGrid, isRiver, turnLocal } from './map';
import { bridgeUp, farSideBank, garrisonPosts } from './benKia';
import { floodHits } from './terrain';
import { baiById, capNhatNav, chamAt, dayRa, huongTheo, kep, que, taoNav, truot, type Nav, type Toi } from './baiChien';

export type Side = 'ta' | 'giac';
/**
 * Giặc tới từ đâu: bìa rừng phía bắc, phía tây (bên này); dưới sông phía nam, phía đông (thủy quái, thủy binh); bên
 * kia sông Đà (`namXa`), bên kia sông Thao (`dongXa`): giặc trên bộ ra từ bìa rừng bên ấy, thủy binh cập bờ bên ấy.
 */
export type RaidSide = 'bac' | 'tay' | 'nam' | 'dong' | 'namXa' | 'dongXa';
/**
 * Tướng ra trận cùng quân ta: Thánh Gióng, Sơn Tinh, An Dương Vương, Cao Lỗ, hay Hai Bà Trưng (chương 5). Mỗi trận một
 * tướng, riêng Hai Bà: mỗi bà một voi, cùng ra một trận.
 */
export type HeroKind = 'giong' | 'sonTinh' | 'anDuong' | 'caoLo' | 'trungTrac' | 'trungNhi';
/** Lính thường, giặc, tướng, hoặc nghĩa binh (Hiệu triệu của Trưng Nhị gọi ra). */
export type FighterKind = UnitType | EnemyType | HeroKind | 'nghiaBinh';
export const HERO_KINDS: HeroKind[] = ['giong', 'sonTinh', 'anDuong', 'caoLo', 'trungTrac', 'trungNhi'];
export const isHero = (k: FighterKind): k is HeroKind => (HERO_KINDS as FighterKind[]).includes(k);
/** Hai Bà Trưng: hai tướng cùng ra một trận. */
export const HAI_BA: HeroKind[] = ['trungTrac', 'trungNhi'];
/** Tướng bắn xa: ngoài bãi đứng lùi sau hàng đầu quân ta. */
const ARCHER_HEROES: HeroKind[] = ['anDuong', 'caoLo', 'trungNhi'];

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
  /** An Dương Vương giữ kinh đô sau khi lẫy nỏ thần bị tráo: không còn kỹ năng Nỏ thần. */
  layTrao?: boolean;
  /** Cao Lỗ đã có Lệnh bắn (thắng màn 30). */
  lenhBan?: boolean;
  /** Trưng Nhị đã có Hiệu triệu (thắng màn 33). */
  hieuTrieu?: boolean;
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
  /** `aboard`: thủy binh còn ngồi trên thuyền, chưa cập bờ (chưa đánh, chưa bị bắn). */
  state: 'move' | 'fight' | 'flee' | 'dead' | 'gone' | 'aboard';
  /** Thủy binh: đi trên thuyền thứ mấy (chỉ số trong `Battle.boats`). */
  boat?: number;
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
  /**
   * Mã Viện: còn bao lâu tới lần Lệnh nỏ tiếp theo; `land` là giây còn lại tới lúc loạt tên đang bay rơi xuống
   * (tx, tz).
   */
  volley?: { next: number; land?: number; tx?: number; tz?: number };
  /**
   * Lâu thuyền Hán: hiện ở (ox, oz) giữa luồng sông, sau `delay` giây thì chèo tới chỗ neo (tx, tz) rồi đậu bắn lên
   * bờ; hết giờ thì chèo về (ox, oz) rồi rút đi.
   */
  ship?: { ox: number; oz: number; tx: number; tz: number; delay: number };
  /** Lính ta được nữ tướng cộng thêm máu và sức đánh (đúng binh chủng của phó tướng, hay của nữ tướng ở doanh trại). */
  nu?: boolean;
}

export interface BattleEvent {
  seq: number;
  kind:
    | 'shot'
    | 'trap'
    | 'wreck'
    | 'loot'
    | 'die'
    | 'rally'
    | 'fire'
    | 'smash'
    | 'exhaust'
    | 'hill'
    | 'rocks'
    | 'drown'
    | 'volley'
    | 'shield'
    | 'wave'
    | 'summon'
    /** Nỏ liên châu: loạt tên rơi xuống quanh (tx, tz). */
    | 'rain'
    /** Lệnh bắn: Cao Lỗ thổi tù và. */
    | 'order'
    /** Voi xung trận: voi Trưng Trắc lao từ (x, z) tới (tx, tz). */
    | 'charge'
    /** Hiệu triệu: Trưng Nhị phất cờ, nghĩa binh chạy ra, quân ta quanh voi hồi máu. */
    | 'call'
    /** Tô Định chạy thoát khỏi bãi. */
    | 'escape'
    /** Màn cầm cự: một đợt giặc mới kéo tới bãi. */
    | 'arrive'
    /** Lệnh nỏ: Mã Viện ở (x, z) phất cờ, loạt tên nỏ bay tới rơi quanh (tx, tz). */
    | 'barrage'
    /** Lệnh nỏ: loạt tên rơi xuống quanh (x, z). */
    | 'barrageHit'
    /** Lâu thuyền bị đánh chìm ở (x, z). */
    | 'sink';
  x: number;
  z: number;
  tx?: number;
  tz?: number;
  /** Ai bắn (để vẽ mũi tên hay tia nước). */
  by?: FighterKind;
}

/** Thuyền giặc của thủy binh Triệu: chèo từ (x0, z0) vào bờ ở (tx, tz), rời đi sau `delay` giây. */
export interface Boat {
  x: number;
  z: number;
  tx: number;
  tz: number;
  delay: number;
  landed: boolean;
}

export interface Battle {
  /** Mã riêng của trận, để phần vẽ biết đã sang trận mới. */
  id: number;
  mode: 'raid' | 'field' | 'pvp';
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
  /** Tướng trong trận; `down` khi tướng đã kiệt sức rút khỏi trận. */
  hero: (HeroSetup & { down: boolean }) | null;
  /** Tướng thứ hai cùng ra trận (Hai Bà: Trưng Trắc là `hero`, Trưng Nhị là `hero2`). Bản lưu cũ không có. */
  hero2?: (HeroSetup & { down: boolean }) | null;
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
  /** Trận cuối chương 4 vừa thắng: phần vẽ cho Rùa Vàng khổng lồ nổi lên ở mép biển. */
  seaWin?: boolean;
  /** Trận cuối chương 5 vừa thắng (giữ Cấm Khê): phần vẽ cho hai bà đứng trên voi nhìn về phía sông, camera lùi xa. */
  hatWin?: boolean;
  /** Màn cầm cự: các đợt giặc còn chưa tới bãi (theo thứ tự thời gian). */
  waves?: StageWave[];
  /** Màn cầm cự: giữ đủ chừng này giây mà quân ta chưa chết hết thì thắng. */
  holdS?: number;
  /** Màn cầm cự: tổng số đợt giặc, kể cả đợt đầu. */
  waveCount?: number;
  /** Giây còn lại của Lệnh bắn: lính nỏ (và khi giữ kinh đô cả ụ nỏ, lầu nỏ) bắn nhanh hơn. */
  lenh?: number;
  /** Ai đánh kinh đô (trận ngoài bãi để 'an'). Yêu tinh nhắm phá thành Cổ Loa trước tiên. */
  foe: Foe;
  /** Giây còn lại của Rùa Vàng che chở quân ta. */
  shield: number;
  /** Đền Cổ Loa còn nguyên: chòi canh bắn mạnh hơn, xa hơn. */
  crossbows: boolean;
  /** Hồ Kim Quy còn nguyên: tường thành thêm máu (`KIM_QUY_WALLS`). Bản lưu cũ không có thì coi như không. */
  walls?: boolean;
  /**
   * Hệ số hình học: tầm đánh, tốc độ, bán kính kỹ năng tính bằng ô nhân với số này. Ngoài bãi là 1, giữ kinh đô
   * là `RAID_SCALE` (kinh đô giãn rộng). Bản lưu cũ không có thì coi như 1.
   */
  geo?: number;
  /** Giữ kinh đô, giặc trên bộ: giặc bỏ chạy qua lại vạch này (tọa độ theo chiều sâu từ bìa rừng) là thoát. */
  exitAt?: number;
  /** Bậc binh khí đã rèn của từng binh chủng ta (0–2): thêm máu và sức đánh. */
  arms: Record<UnitType, number>;
  /** Bậc huân công của từng nhánh (0–4): thêm máu và sức đánh. Bản lưu cũ không có thì coi như 0. */
  huan?: Record<HuanBranch, number>;
  /** Trận thử thách phó bản: kiểu thử thách. */
  /** Trận ngoài bãi đánh đồn giặc bên kia sông (khoảnh có đồn) thay cho một màn phó bản; `wave` khi ấy là 0. */
  camp?: number;
  challenge?: ChallengeKind;
  /** Thử thách Giặc dữ: sát thương giặc gây cho quân ta nhân chừng này. */
  fury?: number;
  /** Mùa lũ thứ mấy (0 nếu không phải mùa lũ). */
  flood: number;
  /** Mực nước lũ sẽ dâng tới (bậc), 0 nếu không có lũ. */
  floodTo: number;
  /** Mực nước đang dâng (bậc). */
  water: number;
  /** Công trình bị nước lũ làm hư trong trận này. */
  drowned: number[];
  /** Ruộng được bồi phù sa trong trận này (nước vào qua cống đang mở). Bản lưu cũ đang dở trận thì chưa có. */
  boi?: number[];
  /** Giặc bơi được dưới sông (thủy quái). */
  swim: boolean;
  /** Thuyền chở lính của thủy binh Triệu hay thủy quân Hán (rỗng nếu không phải đợt đi thuyền). */
  boats: Boat[];
  /** Số lâu thuyền Hán đã bị đánh chìm trong trận này. Bản lưu cũ không có thì coi như 0. */
  sunk?: number;
  /** Giây còn phải chờ để dùng lại từng kỹ năng. */
  skillCd: Partial<Record<SkillId, number>>;
  /**
   * Trận ngoài bãi: nữ tướng đi theo làm phó tướng, đứng cầm cờ ở (x, z) sau hàng hậu; không đánh, giặc không nhắm.
   * Bản lưu cũ không có.
   */
  nuTuong?: { kind: NuTuongId; x: number; z: number };
  /**
   * Đấu thành: phần cộng thêm của người giữ thành (Đền, binh khí, huân công) cho quân giữ thành (phe `giac`). Phần
   * của người tấn công là `bonus`, `arms`, `huan` như mọi trận.
   */
  def?: { bonus: number; arms: Record<UnitType, number>; huan?: Record<HuanBranch, number> };
  /** Đấu thành: mọi người trong trận bền hơn chừng này lần (như `FIELD.hpMul` ngoài bãi), đòn kỹ năng mạnh lên theo. */
  hpMul?: number;
  /** Đấu thành: đòn quân đánh thành vào công trình mạnh gấp chừng này lần (công thành). */
  siege?: number;
  /**
   * Trận ngoài bãi: bố cục bãi chiến có vật cản (id trong `BAI` ở `baiChien.ts`). Không có (bản lưu cũ, trận thử) hay
   * id lạ thì đánh trên bãi phẳng.
   */
  bai?: string;
  /** Kết cục trận ngoài bãi; trận giữ kinh đô luôn để null; Đấu thành chỉ để 'retreat' khi rút quân. */
  outcome: 'win' | 'lose' | 'retreat' | null;
}

const statsOf = (k: FighterKind): FighterStats =>
  k === 'giong'
    ? GIONG
    : k === 'sonTinh'
      ? SON
      : k === 'anDuong'
        ? ADV
        : k === 'caoLo'
          ? CAO_LO
          : k === 'trungTrac'
            ? TRUNG_TRAC
            : k === 'trungNhi'
              ? TRUNG_NHI
              : k === 'nghiaBinh'
                ? NGHIA_BINH
                : k in UNITS
            ? UNITS[k as UnitType]
            : ENEMIES[k as EnemyType];
/** Lệnh bắn đang có: lính nỏ, ụ nỏ, lầu nỏ nghỉ giữa hai phát ngắn đi chừng này lần. */
const fireRate = (battle: Pick<Battle, 'lenh'>) => ((battle.lenh ?? 0) > 0 ? LENH_BAN.rate : 1);
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

/**
 * Độ dài vectơ (dx, dz). Trận đánh chỉ dùng căn bậc hai và bốn phép tính, vì mọi trình duyệt tính ra đúng một kết
 * quả (chuẩn IEEE làm tròn đúng); `Math.hypot`, `Math.sin`, `Math.cos` thì mỗi trình duyệt có thể lệch ở chữ số cuối,
 * mà Đấu thành cần máy chủ đánh lại trận ra y như máy người chơi.
 */
export const dist = (dx: number, dz: number): number => Math.sqrt(dx * dx + dz * dz);

const TWO_PI = 6.283185307179586;
const PI = 3.141592653589793;
const HALF_PI = 1.5707963267948966;
/** Hệ số Taylor của sin tới bậc 15 (1/3!, 1/5!, …), sai số dưới 1e-11 trên [−π/2, π/2]. */
const SIN_C = [
  -0.16666666666666666, 0.008333333333333333, -0.0001984126984126984, 2.7557319223985893e-6, -2.505210838544172e-8,
  1.6059043836821613e-10, -7.647163731819816e-13,
];

/** Sin tất định (xem `dist`): đưa góc về [−π/2, π/2] rồi tính đa thức. */
export function dsin(a: number): number {
  let r = a - Math.round(a / TWO_PI) * TWO_PI;
  if (r > HALF_PI) r = PI - r;
  else if (r < -HALF_PI) r = -PI - r;
  const r2 = r * r;
  let p = SIN_C[6];
  for (let i = 5; i >= 0; i--) p = p * r2 + SIN_C[i];
  return r + r * r2 * p;
}

/** Cos tất định (xem `dist`). */
export const dcos = (a: number): number => dsin(a + HALF_PI);

/** Khoảng cách từ điểm tới hình chữ nhật móng công trình (đơn vị ô). */
export function rectDist(x: number, z: number, b: Building): number {
  const def = BUILDINGS[b.type];
  const dx = Math.max(b.x - x, 0, x - (b.x + def.w));
  const dz = Math.max(b.z - z, 0, z - (b.z + def.d));
  return dist(dx, dz);
}

/** Máu đầy của công trình trong trận: Hồ Kim Quy còn nguyên thì tường thành thêm máu. */
export function maxHpOf(battle: Pick<Battle, 'walls'>, b: Building): number {
  const hp = BUILDINGS[b.type].hp[b.level - 1] ?? 100;
  return battle.walls && KIM_QUY_WALL_TYPES.includes(b.type) ? hp * (1 + KIM_QUY_WALLS) : hp;
}

export function buildingHp(battle: Battle, b: Building): number {
  return battle.hp[b.id] ?? maxHpOf(battle, b);
}

/**
 * Công trình giặc có thể nhắm tới (không tính lũy, bẫy, đê, cống đê, thành, cổng thành, đường đi, đồ trang trí, không tính cái
 * đã hư). Cổng thành như tường: giặc chỉ phá khi đường đi qua cổng.
 */
function isTargetable(b: Building): boolean {
  return !b.damaged && !UNTARGETED.includes(b.type) && !isDecor(b.type) && !isBridge(b.type);
}
const UNTARGETED: BuildingType[] = ['luy', 'bayChong', 'de', 'thanh', 'congThanh', 'congDe'];

/** Thành Cổ Loa và cổng thành: yêu tinh nhắm phá trước tiên. */
const isCitadel = (b: Building) => (b.type === 'thanh' || b.type === 'congThanh') && !b.damaged;

/** Yêu tinh nhắm phá thành Cổ Loa (cả cổng thành) trước tiên, rồi mới tới kho và Điện. */
function targetableIn(battle: Battle, b: Building): boolean {
  return isTargetable(b) || (battle.foe === 'yeu' && isCitadel(b));
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
    stolen: { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 },
    killed: 0,
    total: 0,
    lost: { giao: 0, cung: 0, voi: 0, no: 0 },
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
    arms: { giao: 0, cung: 0, voi: 0, no: 0 },
    boats: [],
  };
}

/** Phần binh khí đã rèn cộng thêm vào máu và sức đánh của một lính ta (tướng và giặc không có). */
export function armsBonus(battle: Pick<Battle, 'arms'>, kind: FighterKind): number {
  return kind in UNITS ? (battle.arms[kind as UnitType] ?? 0) * ARMS_BONUS : 0;
}

/** Phần huân công cộng thêm vào máu và sức đánh: lính theo nhánh binh chủng, tướng theo nhánh tướng (giặc không có). */
export function huanBonus(battle: Pick<Battle, 'huan'>, kind: FighterKind): number {
  const branch: HuanBranch | null = kind in UNITS ? (kind as UnitType) : isHero(kind) ? 'tuong' : null;
  return branch ? (battle.huan?.[branch] ?? 0) * HUAN_BONUS : 0;
}

/**
 * Hệ số máu và sức đánh của một người bên ta: Đền, phúc lành, binh khí đã rèn, huân công, nữ tướng (`nu`: lính đúng
 * binh chủng của nữ tướng). Nghĩa binh không được cộng.
 */
const ownMult = (battle: Battle, kind: FighterKind, nu = false) => multOf(battle, kind, nu);

/** Như `ownMult`, theo phần cộng thêm `mods` (của người tấn công hay người giữ thành trong Đấu thành). */
const multOf = (mods: Pick<Battle, 'bonus' | 'arms' | 'huan'>, kind: FighterKind, nu = false) =>
  kind === 'nghiaBinh' ? 1 : 1 + mods.bonus + armsBonus(mods, kind) + huanBonus(mods, kind) + (nu ? NU_TUONG_BONUS : 0);

/** Hệ số máu và sức đánh của `f`: quân ta theo `ownMult`; quân giữ thành trong Đấu thành theo người giữ thành. */
const sideMult = (battle: Battle, f: Fighter) =>
  f.side === 'ta' ? ownMult(battle, f.kind, f.nu) : battle.def ? multOf(battle.def, f.kind, f.nu) : 1;

/** Kỹ năng của từng tướng: kỹ năng đầu có ngay, kỹ năng sau mở giữa chương. */
export function heroSkills(hero: HeroSetup): SkillId[] {
  if (hero.kind === 'sonTinh') return hero.non ? ['bocDoi', 'doiNon'] : ['bocDoi'];
  if (hero.kind === 'anDuong') {
    const list: SkillId[] = hero.layTrao ? [] : ['noThan'];
    return hero.kimQuy ? [...list, 'ruaVang'] : list;
  }
  if (hero.kind === 'caoLo') return hero.lenhBan ? ['lienChau', 'lenhBan'] : ['lienChau'];
  if (hero.kind === 'trungTrac') return ['voiXung'];
  if (hero.kind === 'trungNhi') return hero.hieuTrieu ? ['hieuTrieu'] : [];
  return hero.bamboo ? ['phunLua', 'nhoTre'] : ['phunLua'];
}

/** Các tướng trong trận (một, hay hai với Hai Bà). */
export function heroSetups(battle: Pick<Battle, 'hero' | 'hero2'>): (HeroSetup & { down: boolean })[] {
  return [battle.hero, battle.hero2].filter((h): h is HeroSetup & { down: boolean } => !!h);
}

/** Cho tướng vào trận ở (x, z) và mở các kỹ năng của tướng. Đã có một tướng thì đây là tướng thứ hai. */
function addHero(battle: Battle, hero: HeroSetup, x: number, z: number, hpMul: number): void {
  if (battle.hero) battle.hero2 = { ...hero, down: false };
  else battle.hero = { ...hero, down: false };
  battle.skills.push(...heroSkills(hero));
  const f = newFighter(battle, 'ta', hero.kind, x, z, statsOf(hero.kind).hp * hpMul * ownMult(battle, hero.kind));
  const nav = navOf(battle);
  if (nav) dayRa(nav.bai, bodyRadius(hero.kind), f);
  battle.fighters.push(f);
}

/** Giặc đánh kinh đô thay cho giặc Ân: quân mỗi đợt và hệ số máu theo số lần đã tới. */
type LandFoe = 'yeu' | 'trieu' | 'thuyBinh' | 'han' | 'thuyHan';
const LAND_FORCES: Record<LandFoe, { forces: (n: number) => Partial<Record<EnemyType, number>>; hpScale: (n: number) => number }> = {
  yeu: { forces: yeuForces, hpScale: yeuHpScale },
  trieu: { forces: trieuForces, hpScale: trieuHpScale },
  thuyBinh: { forces: thuyBinhForces, hpScale: thuyBinhHpScale },
  han: { forces: hanForces, hpScale: hanHpScale },
  thuyHan: { forces: thuyHanForces, hpScale: thuyHanHpScale },
};
/** Giặc đi thuyền tới: thủy binh Triệu, thủy quân Hán (thuyền chở lính cập bờ; thủy quân Hán có thêm lâu thuyền). */
const BY_BOAT: LandFoe[] = ['thuyBinh', 'thuyHan'];

/** Chỉ quân bắn xa (cung thủ, lính nỏ, Cao Lỗ, An Dương Vương) và công trình phòng thủ bắn tới lâu thuyền. */
const SHIP_HITTERS: FighterKind[] = ['cung', 'no', 'caoLo', 'anDuong'];
/** `by` đánh được `o` không: lâu thuyền đậu dưới sông, quân cận chiến và tướng trên bờ không đánh tới. */
const reaches = (by: FighterKind | undefined, o: Fighter) => o.kind !== 'lauThuyen' || by === undefined || SHIP_HITTERS.includes(by);


export interface BattleOpts {
  hero?: HeroSetup | null;
  /** Tướng thứ hai (Hai Bà cùng ra trận). */
  hero2?: HeroSetup | null;
  bonus?: number;
  /** Mùa lũ thứ `n`, nước dâng tới `level` bậc, thủy quái bơi từ sông lên. */
  flood?: { n: number; level: number } | null;
  /** Yêu tinh, quân Triệu, thủy binh Triệu hay quân Hán kéo tới lần thứ `n` (thay cho giặc Ân). */
  land?: { foe: LandFoe; n: number } | null;
  /** Đền Cổ Loa còn nguyên. */
  crossbows?: boolean;
  /** Hồ Kim Quy còn nguyên. */
  walls?: boolean;
  /** Đền Cuông còn nguyên: thủy binh tới ít thuyền hơn. */
  fewerBoats?: boolean;
  /** Bậc binh khí đã rèn của từng binh chủng. */
  arms?: Record<UnitType, number>;
  /** Bậc huân công của từng nhánh. */
  huan?: Record<HuanBranch, number>;
}

/**
 * Dải giặc trên bộ xuất phát ở bìa rừng phía bắc (hay phía tây, đối xứng): dọc theo bìa từ `lo` tới bờ sông,
 * sâu từ `from` tới `to` ô tính từ mép lưới. Cách sông xa như ở kinh đô nhỏ trước kia nhân `RAID_SCALE`, nhưng luôn
 * ở ngoài vùng đã khai phá. Phần vẽ dùng để đặt dải báo giặc, ma trơi và hướng camera.
 */
export function raidSpawnBand(state: GameState): { lo: number; from: number; to: number } {
  const open = openStart(state);
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
  if (opts.walls) battle.walls = true;
  if (opts.arms) battle.arms = { ...opts.arms };
  if (opts.huan) battle.huan = { ...opts.huan };
  const land = opts.land ?? null;
  battle.geo = RAID_SCALE;
  const rand = rng(battleSeed(wave, side));
  const far = farSideBank(side);
  // Giặc trên bộ ra từ dải ở bìa rừng (`raidSpawnBand`).
  const open = openStart(state);
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
  const forces = flood ? floodForces(flood.n) : land ? LAND_FORCES[land.foe].forces(land.n) : raidForces(wave);
  const scale = flood ? floodHpScale(flood.n) : land ? LAND_FORCES[land.foe].hpScale(land.n) : raidHpScale(wave);
  if (land && BY_BOAT.includes(land.foe)) {
    // Lâu thuyền không chở lính: thuyền chở lính rút số trước, lâu thuyền rút sau (như `plannedBoats`).
    const { lauThuyen: ships = 0, ...crew } = forces;
    boardBoats(battle, crew, scale, side, lo, rand, opts.fewerBoats ?? false);
    for (const ship of shipLayout(ships, side, lo, rand)) {
      const f = newFighter(battle, 'giac', 'lauThuyen', ship.ox, ship.oz, ENEMIES.lauThuyen.hp * scale);
      f.ship = ship;
      f.face = shipFace(side);
      battle.fighters.push(f);
      battle.total++;
    }
  } else for (const kind of Object.keys(forces) as EnemyType[]) {
    for (let i = 0; i < (forces[kind] ?? 0); i++) {
      // Giặc Ân ra từ bìa rừng: cạnh bắc (z nhỏ) hoặc cạnh tây (x nhỏ).
      // Thủy quái ngoi lên từ sông: phía nam (z lớn) hoặc phía đông (x lớn).
      // Bên kia sông: ra từ dải rừng ngoài cùng của bờ ấy, dọc suốt bờ.
      const along = far ? FOREST_BAND + rand() * (RIVER_START - FOREST_BAND - 1) : lo + rand() * (RIVER_START - lo - 1);
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
  // Lính người chơi bố trí giữ kinh đô ra trận từ doanh trại của mình; lính dự trữ ở lại. Lính đóng ở đồn biên còn
  // nguyên ra trận từ đồn ấy, bớt đi từ phần giữ kinh đô của các doanh trại (không thêm quân).
  const def = BUILDINGS.doanhTrai;
  const plan = guardPlan(state);
  // Lính của doanh trại có nữ tướng cùng binh chủng thì được nữ tướng cộng thêm.
  const nus = nuPosts(state);
  const spawnAt = (home: Building, kind: UnitType, n: number) => {
    const hd = BUILDINGS[home.type];
    const nu = nuBoosts(nus.get(home.id), kind);
    for (let i = 0; i < n; i++) {
      const x = home.x + hd.w / 2 + (rand() - 0.5) * hd.w;
      const z = home.z + hd.d / 2 + (rand() - 0.5) * hd.d;
      const f = newFighter(battle, 'ta', kind, x, z, UNITS[kind].hp * ownMult(battle, kind, nu));
      if (nu) f.nu = true;
      battle.fighters.push(f);
    }
  };
  const guarding = zeroArmy();
  for (const g of plan.values()) for (const k of UNIT_TYPES) guarding[k] += g[k];
  const posted = zeroArmy();
  for (const { fort, army } of garrisonPosts(state)) {
    for (const kind of UNIT_TYPES) {
      const n = Math.min(army[kind], guarding[kind] - posted[kind]);
      if (n <= 0) continue;
      spawnAt(fort, kind, n);
      posted[kind] += n;
    }
  }
  for (const barracks of barracksList(state)) {
    const guard = plan.get(barracks.id);
    if (!guard) continue;
    for (const kind of UNIT_TYPES) {
      // Phần đã ra từ đồn biên thì bớt dần ở các doanh trại.
      const n = Math.max(0, guard[kind] - posted[kind]);
      posted[kind] = Math.max(0, posted[kind] - guard[kind]);
      spawnAt(barracks, kind, n);
    }
  }
  // Đền Hát Môn còn nguyên: nghĩa binh từ sân đền ra đánh giặc (ngã thì không mất lính thật).
  const den = state.buildings.find((b) => b.type === 'denHatMon' && !b.damaged);
  if (den) {
    const hd = BUILDINGS.denHatMon;
    for (let i = 0; i < HAT_MON_NGHIA_BINH; i++) {
      const a = (i / HAT_MON_NGHIA_BINH) * Math.PI * 2;
      const x = den.x + hd.w / 2 + dsin(a) * 0.8;
      const z = den.z + hd.d + 0.4 + dcos(a) * 0.5;
      battle.fighters.push(newFighter(battle, 'ta', 'nghiaBinh', x, z, NGHIA_BINH.hp));
    }
  }
  // Tướng ra trận từ sân doanh trại mình chỉ huy (không chỉ huy trại nào thì từ trại của Lạc tướng; Hai Bà thì từ
  // trước Điện, mỗi bà một bên lối vào). Chưa có doanh trại thì ra từ trước Điện.
  const dien = state.buildings.find((b) => b.type === 'dien');
  for (const [hero, i] of [[opts.hero, 0], [opts.hero2, 1]] as const) {
    if (!hero) continue;
    const post = heroPost(state, hero.kind, !HAI_BA.includes(hero.kind));
    if (post) {
      // Mặt trước doanh trại (đã xoay thì theo hướng xoay).
      const f = turnLocal(post.rot, 0, def.d / 2);
      addHero(battle, hero, post.x + def.w / 2 + f.x, post.z + def.d / 2 + f.z, 1);
    } else if (dien) {
      // Trước sân Điện (đã xoay thì theo hướng xoay); Hai Bà mỗi bà một bên lối vào.
      const side = HAI_BA.includes(hero.kind) ? (hero.kind === 'trungTrac' ? -1.2 : 1.2) : i * 1.2;
      const f = turnLocal(dien.rot, side, BUILDINGS.dien.d / 2 + 0.6);
      addHero(battle, hero, dien.x + BUILDINGS.dien.w / 2 + f.x, dien.z + BUILDINGS.dien.d / 2 + f.z, 1);
    }
  }
  return battle;
}

const zeroArmy = (): Record<UnitType, number> => ({ giao: 0, cung: 0, voi: 0, no: 0 });

/**
 * Thủy binh Triệu xuống thuyền: mỗi thuyền chở BOAT.carry lính, thuyền dàn đều dọc mép sông xa ở phía nam
 * (hay đông), chèo thẳng vào bờ gần nhất. Lính trộn đều các loại trên mỗi thuyền.
 */
/** Hạt giống số ngẫu nhiên của trận giữ kinh đô đợt `wave` tới từ phía `side`. */
export function battleSeed(wave: number, side: RaidSide): number {
  return wave * 7919 + ['bac', 'tay', 'nam', 'dong', 'namXa', 'dongXa'].indexOf(side) + 1;
}

/** Số thuyền chở `crew` lính thủy binh; Đền Cuông còn nguyên (`fewer`) thì bớt thuyền, còn ít nhất một thuyền. */
export function boatCount(crew: number, fewer: boolean): number {
  const count = Math.ceil(crew / BOAT.carry);
  return fewer ? Math.max(1, Math.floor(count * (1 - DEN_CUONG_BOATS))) : count;
}

/**
 * Chỗ `count` thuyền thủy binh hiện ra lúc trận mở (mép luồng sông phía `side`), chỗ cập bờ, giờ chèo. Dùng chung cho
 * `startBattle` và đoàn thuyền từ biển vào trong lúc trinh sát báo (`upcomingBoats` ở `game.ts`), nên `rand` phải là
 * dòng số của trận ấy chưa rút số nào (`battleSeed`).
 */
export function boatLayout(count: number, side: RaidSide, lo: number, rand: () => number): Boat[] {
  const alongX = side === 'nam' || side === 'namXa';
  const farSide = farSideBank(side) !== null;
  // Cập bờ bên kia: thuyền dàn dọc suốt bờ ấy.
  const from = farSide ? FOREST_BAND : lo;
  const span = RIVER_START - 1 - from;
  const boats: Boat[] = [];
  for (let i = 0; i < count; i++) {
    const along = from + 0.5 + (span * (i + 0.5)) / count + (rand() - 0.5) * 0.8;
    // Thuyền hiện ở mép luồng sông (`RIVER_DIVE`), chèo sang bờ mình (hay bờ bên kia).
    const far = farSide ? RIVER_DIVE + 0.6 : RIVER_DIVE - 0.6;
    const bank = farSide ? RIVER_END - 0.45 : RIVER_START + 0.45;
    boats.push({
      x: alongX ? along : far,
      z: alongX ? far : along,
      tx: alongX ? along : bank,
      tz: alongX ? bank : along,
      delay: i * BOAT.stagger * (0.6 + rand() * 0.8),
      landed: false,
    });
  }
  return boats;
}

/**
 * Chỗ các thuyền thủy binh đợt `wave` (đợt thủy binh thứ `n`) tới từ phía `side` sẽ hiện ra khi trận mở, y như
 * `startBattle` đặt: cảnh vẽ đoàn thuyền từ biển vào cửa sông tới đúng chỗ ấy trong lúc trinh sát báo.
 */
export function plannedBoats(
  state: GameState,
  wave: number,
  side: RaidSide,
  foe: 'thuyBinh' | 'thuyHan',
  n: number,
  fewer: boolean,
): { x: number; z: number; big?: boolean }[] {
  const { lauThuyen: ships = 0, ...crew } = LAND_FORCES[foe].forces(n);
  const lo = raidSpawnBand(state).lo;
  const rand = rng(battleSeed(wave, side));
  const boats = boatLayout(boatCount(forceSize(crew), fewer), side, lo, rand).map((b) => ({ x: b.x, z: b.z }));
  return [...boats, ...shipLayout(ships, side, lo, rand).map((s) => ({ x: s.ox, z: s.oz, big: true }))];
}

/**
 * Chỗ `count` lâu thuyền hiện ra (giữa luồng sông, xa bờ hơn thuyền chở lính), chỗ đậu (giữa ba ô sông sát bờ,
 * `LAU_THUYEN.moor`) và giờ chèo. Các chiếc cách nhau `LAU_THUYEN.spacing` ô dọc bờ, quanh giữa đoạn thuyền chở lính
 * cập bờ. `rand` là dòng số của trận sau khi đã rút số cho thuyền chở lính.
 */
function shipLayout(count: number, side: RaidSide, lo: number, rand: () => number): NonNullable<Fighter['ship']>[] {
  const alongX = side === 'nam' || side === 'namXa';
  const farSide = farSideBank(side) !== null;
  const from = farSide ? FOREST_BAND : lo;
  const mid = (from + RIVER_START - 1) / 2;
  const out = farSide ? RIVER_DIVE - 1 : RIVER_DIVE + 1;
  const moor = farSide ? RIVER_END - LAU_THUYEN.moor : RIVER_START + LAU_THUYEN.moor;
  const ships: NonNullable<Fighter['ship']>[] = [];
  for (let i = 0; i < count; i++) {
    const along = mid + (i - (count - 1) / 2) * LAU_THUYEN.spacing + (rand() - 0.5);
    ships.push({
      ox: alongX ? along : out,
      oz: alongX ? out : along,
      tx: alongX ? along : moor,
      tz: alongX ? moor : along,
      delay: 0.5 + rand() * 1.5,
    });
  }
  return ships;
}

/** Lâu thuyền quay mũi xuôi dòng (dọc bờ), mạn hướng lên bờ. */
const shipFace = (side: RaidSide) => (side === 'nam' || side === 'namXa' ? Math.PI / 2 : 0);

/**
 * Lâu thuyền: chèo từ giữa sông tới chỗ đậu, đậu rồi cứ `cooldown` giây bắn một loạt `LAU_THUYEN.shots` mũi nỏ vào
 * công trình hay lính ta gần nhất trong tầm (mỗi mũi một mục tiêu, ít mục tiêu thì bắn dồn). Hết giờ (bỏ chạy) thì
 * chèo về chỗ hiện ra rồi rút đi.
 */
function stepShip(state: GameState, battle: Battle, f: Fighter, dt: number): void {
  const ship = f.ship!;
  const st = statsOf(f.kind);
  const speed = BOAT.speed * dt;
  const row = (tx: number, tz: number) => {
    const dx = tx - f.x;
    const dz = tz - f.z;
    const d = dist(dx, dz);
    if (d <= speed) {
      f.x = tx;
      f.z = tz;
      return true;
    }
    f.x += (dx / d) * speed;
    f.z += (dz / d) * speed;
    return false;
  };
  if (f.state === 'flee') {
    if (row(ship.ox, ship.oz)) f.state = 'gone';
    return;
  }
  if (battle.t < ship.delay) return;
  if (f.x !== ship.tx || f.z !== ship.tz) {
    f.state = 'move';
    row(ship.tx, ship.tz);
    return;
  }
  f.state = 'fight';
  if (f.cd > 0) return;
  const reach = st.range * geoOf(battle);
  const marks: { d: number; x: number; z: number; hit: () => void }[] = [];
  for (const o of battle.fighters) {
    if (o.side !== 'ta' || !isAlive(o)) continue;
    const d = dist(o.x - f.x, o.z - f.z);
    if (d <= reach) marks.push({ d, x: o.x, z: o.z, hit: () => damageFighter(battle, { kind: f.kind, dmg: st.dmg }, o) });
  }
  for (const b of state.buildings) {
    if (!targetableIn(battle, b)) continue;
    const d = rectDist(f.x, f.z, b);
    if (d > reach) continue;
    const def = BUILDINGS[b.type];
    marks.push({ d, x: b.x + def.w / 2, z: b.z + def.d / 2, hit: () => damageBuilding(state, battle, f, b, st.dmg) });
  }
  if (!marks.length) return;
  marks.sort((p, q) => p.d - q.d);
  for (let i = 0; i < LAU_THUYEN.shots; i++) {
    const m = marks[i % Math.min(marks.length, LAU_THUYEN.shots)];
    emit(battle, { kind: 'shot', x: f.x, z: f.z, tx: m.x, tz: m.z, by: 'noHan' });
    m.hit();
  }
  f.cd = st.cooldown;
  f.swing = 0.3;
}

/** Tổng số lính của một đợt (mọi loại cộng lại). */
export const forceSize = (forces: Partial<Record<EnemyType, number>>): number => Object.values(forces).reduce((a, n) => a + (n ?? 0), 0);

function boardBoats(
  battle: Battle,
  forces: Partial<Record<EnemyType, number>>,
  scale: number,
  side: RaidSide,
  lo: number,
  rand: () => number,
  fewer: boolean,
): void {
  let crew: EnemyType[] = [];
  const kinds = Object.keys(forces) as EnemyType[];
  // Xếp xen kẽ các loại để thuyền nào cũng có đủ lính thủy, cung thuyền, lính rìu.
  const left = kinds.map((k) => forces[k] ?? 0);
  while (left.some((n) => n > 0)) kinds.forEach((k, i) => left[i]-- > 0 && crew.push(k));
  // Đền Cuông còn nguyên: bớt thuyền (làm tròn xuống, còn ít nhất một thuyền), bớt chừng ấy lính.
  const count = boatCount(crew.length, fewer);
  crew = crew.slice(0, count * BOAT.carry);
  const alongX = side === 'nam' || side === 'namXa';
  const farSide = farSideBank(side) !== null;
  battle.boats.push(...boatLayout(count, side, lo, rand));
  crew.forEach((kind, i) => {
    const b = i % count;
    const boat = battle.boats[b];
    const f = newFighter(battle, 'giac', kind, boat.x, boat.z, ENEMIES[kind].hp * scale);
    f.state = 'aboard';
    f.boat = b;
    f.face = farSide ? (alongX ? 0 : Math.PI / 2) : alongX ? Math.PI : -Math.PI / 2;
    battle.fighters.push(f);
    battle.total++;
  });
}

/** Thuyền chèo vào bờ; cập bờ thì thả lính lên đất, rải dọc bờ. Lính còn trên thuyền đi theo thuyền. */
function stepBoats(battle: Battle, dt: number): void {
  if (!battle.boats.length) return;
  battle.boats.forEach((boat, b) => {
    if (!boat.landed && battle.t >= boat.delay) {
      const dx = boat.tx - boat.x;
      const dz = boat.tz - boat.z;
      const d = dist(dx, dz);
      const step = BOAT.speed * dt;
      if (d <= step) {
        boat.x = boat.tx;
        boat.z = boat.tz;
        boat.landed = true;
      } else {
        boat.x += (dx / d) * step;
        boat.z += (dz / d) * step;
      }
    }
    const crew = battle.fighters.filter((f) => f.boat === b && f.state === 'aboard');
    const alongX = battle.side === 'nam' || battle.side === 'namXa';
    // Cập bờ bên này thì đất ở phía x, z nhỏ; cập bờ bên kia thì đất ở phía x, z lớn.
    const shore = farSideBank(battle.side) ? 0.3 : -0.3;
    crew.forEach((f, i) => {
      // Lính ngồi dọc thân thuyền; cập bờ thì nhảy lên mép đất, mỗi người một chỗ.
      const off = (i - (crew.length - 1) / 2) * 0.28;
      if (boat.landed) {
        f.state = 'move';
        f.x = alongX ? boat.x + off * 1.4 : boat.x + shore;
        f.z = alongX ? boat.z + shore : boat.z + off * 1.4;
      } else {
        f.x = alongX ? boat.x + off : boat.x;
        f.z = alongX ? boat.z : boat.z + off;
      }
    });
  });
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

// ---------- Đấu thành ----------

/** Phần cộng thêm vào máu và sức đánh của một bên trong Đấu thành: Đền và phúc lành, binh khí, huân công. */
export interface PvpMods {
  bonus: number;
  arms: Record<UnitType, number>;
  huan?: Record<HuanBranch, number>;
}

/** Một tốp lính giữ thành ra từ công trình thứ `at` (chỉ số trong `state.buildings` của kinh đô bị đánh). */
export interface PvpGuard {
  at: number;
  kind: UnitType;
  n: number;
  /** Được nữ tướng ở doanh trại ấy cộng thêm. */
  nu?: boolean;
}

/** Bên giữ thành: lính giữ thành, tướng (không có kỹ năng), Đền Cổ Loa, Hồ Kim Quy. */
export interface PvpDefense extends PvpMods {
  /** Mọi người trong trận bền hơn chừng này lần (`Battle.hpMul`), theo cấp Điện kinh đô bị đánh. */
  hpMul?: number;
  /** Đòn quân đánh thành vào công trình mạnh gấp chừng này lần (`Battle.siege`), theo cấp Điện kinh đô bị đánh. */
  siege?: number;
  guards: PvpGuard[];
  heroes: HeroSetup[];
  crossbows: boolean;
  walls: boolean;
}

/** Bên đánh thành: quân mang theo, tướng, hướng tràn vào, hạt giống số ngẫu nhiên của trận. */
export interface PvpAttack extends PvpMods {
  army: Record<UnitType, number>;
  heroes: HeroSetup[];
  side: 'bac' | 'tay';
  seed: number;
}

/** Công trình tính điểm phá trong Đấu thành: như công trình giặc nhắm tới (không tính tường, lũy, đê, cổng, bẫy, đường, trang trí, cầu). */
export const isScored = (b: Pick<Building, 'type'>): boolean => !UNTARGETED.includes(b.type) && !isDecor(b.type) && !isBridge(b.type);

/**
 * Trận Đấu thành trên kinh đô bị đánh `state` (bản dùng một lần, dựng từ bản chụp). Quân đánh thành (phe `ta`) ra
 * từ dải bìa rừng phía bắc hay tây như giặc trên bộ, tướng ở giữa dải; lính giữ thành (phe `giac`) ra từ doanh trại
 * như khi giữ kinh đô; Đền Hát Môn còn thì có nghĩa binh; tướng giữ thành đứng trước Điện.
 */
export function startPvp(state: GameState, defense: PvpDefense, attack: PvpAttack): Battle {
  const battle = newBattle(state.nextBattleId++, 'pvp', 0, attack.side);
  battle.bonus = attack.bonus;
  battle.arms = { ...attack.arms };
  if (attack.huan) battle.huan = { ...attack.huan };
  battle.def = { bonus: defense.bonus, arms: { ...defense.arms }, ...(defense.huan ? { huan: { ...defense.huan } } : {}) };
  battle.crossbows = defense.crossbows;
  if (defense.walls) battle.walls = true;
  battle.geo = RAID_SCALE;
  const hpMul = defense.hpMul ?? 1;
  battle.hpMul = hpMul;
  battle.siege = defense.siege ?? 1;
  const rand = rng(attack.seed);
  const open = openStart(state);
  const lo = Math.min(open, fromRiver(24));
  const alongX = attack.side === 'bac';
  const put = (along: number, depth: number) => (alongX ? { x: along, z: depth } : { x: depth, z: along });
  for (const kind of UNIT_TYPES) {
    for (let i = 0; i < attack.army[kind]; i++) {
      const p = put(lo + rand() * (RIVER_START - lo - 1), spawnDepth(open, rand()));
      battle.fighters.push(newFighter(battle, 'ta', kind, p.x, p.z, UNITS[kind].hp * hpMul * ownMult(battle, kind)));
    }
  }
  attack.heroes.forEach((hero, i) => {
    const p = put((lo + RIVER_START - 1) / 2 + (i ? 1.2 : 0), spawnDepth(open, 0.5));
    addHero(battle, hero, p.x, p.z, hpMul);
  });
  const mods = battle.def;
  const push = (kind: FighterKind, x: number, z: number, hp: number, nu = false) => {
    const f = newFighter(battle, 'giac', kind, x, z, hp * hpMul);
    if (nu) f.nu = true;
    battle.fighters.push(f);
    battle.total++;
  };
  for (const g of defense.guards) {
    const home = state.buildings[g.at];
    if (!home) continue;
    const hd = BUILDINGS[home.type];
    for (let i = 0; i < g.n; i++) {
      const x = home.x + hd.w / 2 + (rand() - 0.5) * hd.w;
      const z = home.z + hd.d / 2 + (rand() - 0.5) * hd.d;
      push(g.kind, x, z, UNITS[g.kind].hp * multOf(mods, g.kind, !!g.nu), !!g.nu);
    }
  }
  const den = state.buildings.find((b) => b.type === 'denHatMon' && !b.damaged);
  if (den) {
    const hd = BUILDINGS.denHatMon;
    for (let i = 0; i < HAT_MON_NGHIA_BINH; i++) {
      const a = (i / HAT_MON_NGHIA_BINH) * Math.PI * 2;
      push('nghiaBinh', den.x + hd.w / 2 + dsin(a) * 0.8, den.z + hd.d + 0.4 + dcos(a) * 0.5, NGHIA_BINH.hp);
    }
  }
  const dien = state.buildings.find((b) => b.type === 'dien');
  if (dien) {
    defense.heroes.forEach((hero, i) => {
      const f = turnLocal(dien.rot, (i ? 1 : -1) * 1.2, BUILDINGS.dien.d / 2 + 0.6);
      push(hero.kind, dien.x + BUILDINGS.dien.w / 2 + f.x, dien.z + BUILDINGS.dien.d / 2 + f.z, statsOf(hero.kind).hp * multOf(mods, hero.kind));
    });
  }
  return battle;
}

/**
 * Trận Đấu thành đã xong chưa: đã rút quân, hết giờ (`DAU_THANH.holdS`), quân đánh thành không còn ai, hay đã phá
 * hết công trình tính điểm.
 */
export function pvpOver(state: GameState, battle: Battle): boolean {
  if (battle.outcome === 'retreat' || battle.t >= DAU_THANH.holdS || alliesLeft(battle) === 0) return true;
  return !state.buildings.some((b) => isScored(b) && !b.damaged);
}

export interface FieldSetup {
  id: number;
  stage: number;
  enemies: Partial<Record<EnemyType, number>>;
  /** Màn cầm cự: các đợt giặc kéo tới sau, và số giây phải giữ. */
  waves?: StageWave[];
  holdS?: number;
  hpScale: number;
  army: Record<UnitType, number>;
  rows: Record<UnitType, Row>;
  hero?: HeroSetup | null;
  /** Tướng thứ hai (Hai Bà cùng ra trận). */
  hero2?: HeroSetup | null;
  bonus?: number;
  arms?: Record<UnitType, number>;
  huan?: Record<HuanBranch, number>;
  /** Trận thử thách: kiểu thử thách; Giặc dữ thì sát thương giặc nhân `fury`. */
  /** Đánh đồn giặc bên kia sông (khoảnh có đồn) thay cho màn phó bản. */
  camp?: number;
  challenge?: ChallengeKind;
  fury?: number;
  /** Nữ tướng đi theo làm phó tướng: binh chủng của người ấy được cộng thêm. */
  nuTuong?: NuTuongId | null;
  /** Bố cục bãi chiến có vật cản (`stageBai`, `baiOf` ở `baiChien.ts`); bỏ trống là bãi phẳng. */
  bai?: string | null;
}

/** An Dương Vương, Cao Lỗ bắn nỏ: đứng lùi sau hàng đầu của quân ta chừng này ô. */
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
  if (setup.huan) battle.huan = { ...setup.huan };
  if (setup.challenge) battle.challenge = setup.challenge;
  if (setup.camp !== undefined) battle.camp = setup.camp;
  if (setup.fury) battle.fury = setup.fury;
  if (baiById(setup.bai)) battle.bai = setup.bai!;
  const rand = rng(setup.id * 7919 + setup.stage);
  const ours: Record<Row, FighterKind[]> = { tien: [], trung: [], hau: [] };
  for (const k of UNIT_TYPES) for (let i = 0; i < (setup.army[k] ?? 0); i++) ours[setup.rows[k]].push(k);
  const theirs: Record<Row, FighterKind[]> = { tien: [], trung: [], hau: [] };
  for (const k of Object.keys(setup.enemies) as EnemyType[]) for (let i = 0; i < (setup.enemies[k] ?? 0); i++) theirs[ENEMY_ROWS[k]].push(k);
  const front = (FIELD.d - FIELD.gap) / 2;
  const nu = setup.nuTuong ?? null;
  deploy(battle, 'ta', ours, FIELD.d - front, 1, rand, (k) => UNITS[k as UnitType].hp * FIELD.hpMul * ownMult(battle, k, nuBoosts(nu, k)));
  if (nu) {
    for (const f of battle.fighters) if (nuBoosts(nu, f.kind)) f.nu = true;
    battle.nuTuong = { kind: nu, x: FIELD.w / 2, z: nuRestZ(battle) };
  }
  deploy(battle, 'giac', theirs, front, -1, rand, (k) => ENEMIES[k as EnemyType].hp * setup.hpScale * FIELD.hpMul);
  battle.total = battle.fighters.filter((f) => f.side === 'giac').length;
  // Màn cầm cự: các đợt sau chưa tới bãi, nhưng vẫn tính vào tổng số giặc.
  if (setup.waves?.length) {
    battle.waves = setup.waves.map((w) => ({ at: w.at, enemies: { ...w.enemies } })).sort((a, b) => a.at - b.at);
    battle.waveCount = battle.waves.length + 1;
    for (const w of battle.waves) for (const k of Object.keys(w.enemies) as EnemyType[]) battle.total += w.enemies[k] ?? 0;
  }
  if (setup.holdS) battle.holdS = setup.holdS;
  // Tướng đứng giữa, trước tiền quân. Tướng bắn xa (An Dương Vương, Cao Lỗ, Trưng Nhị) thì đứng sau tiền quân.
  for (const hero of [setup.hero, setup.hero2]) {
    if (hero) addHero(battle, hero, FIELD.w / 2, FIELD.d - front + (ARCHER_HEROES.includes(hero.kind) ? ADV_BACK : -0.8), FIELD.hpMul);
  }
  return battle;
}

/** Màn cầm cự: đợt giặc tới giờ thì kéo vào từ cuối bãi phía giặc, dàn hàng như lúc vào trận rồi xông lên. */
function arriveWaves(battle: Battle): void {
  const waves = battle.waves;
  if (!waves?.length || battle.t < waves[0].at) return;
  const wave = waves.shift()!;
  const rows: Record<Row, FighterKind[]> = { tien: [], trung: [], hau: [] };
  for (const k of Object.keys(wave.enemies) as EnemyType[]) for (let i = 0; i < (wave.enemies[k] ?? 0); i++) rows[ENEMY_ROWS[k]].push(k);
  const rand = rng(battle.id * 7919 + battle.wave + Math.round(wave.at));
  deploy(battle, 'giac', rows, 2.6, -1, rand, (k) => ENEMIES[k as EnemyType].hp * (battle.hpScale ?? 1) * FIELD.hpMul);
  emit(battle, { kind: 'arrive', x: FIELD.w / 2, z: 1.5 });
}

/** Dàn quân từ hàng đầu `front` lùi dần về phía `dir` (+1: về z lớn, −1: về z nhỏ). */
function deploy(battle: Battle, side: Side, rows: Record<Row, FighterKind[]>, front: number, dir: number, rand: () => number, hpOf: (k: FighterKind) => number): void {
  const nav = navOf(battle);
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
        // Dải dàn quân để trống theo luật bố cục; vẫn đưa ra chỗ trống cho chắc.
        if (nav) dayRa(nav.bai, bodyRadius(kind), f);
        battle.fighters.push(f);
      });
      z += dir * 0.9;
    }
    z += dir * 0.6;
  }
}

const clampField = kep;

/** Tìm đường của từng trận ngoài bãi có vật cản: dẫn xuất từ bố cục, không lưu (mở lại bản lưu thì dựng lại). */
const navs = new WeakMap<Battle, Nav>();

/** Trận ngoài bãi có bố cục vật cản thì cho trạng thái tìm đường; bãi phẳng hay trận giữ kinh đô thì null. */
function navOf(battle: Battle): Nav | null {
  if (battle.mode !== 'field') return null;
  const bai = baiById(battle.bai);
  if (!bai) return null;
  let nav = navs.get(battle);
  if (!nav || nav.bai !== bai) navs.set(battle, (nav = taoNav(bai)));
  return nav;
}

/** Đi chậm khi lội nước, bùn (thủy quái bơi như đi thường). */
const swims = (k: FighterKind) => SWIMMERS.includes(k as EnemyType);

/** Ai còn đánh được, ai còn là đích cho phe kia nhắm tới (như `nearestEnemyOf`). */
const targetable = (o: Fighter) => o.state === 'move' || o.state === 'fight' || o.state === 'flee';

/** Dựng lại bản đồ khoảng cách của hai phe khi tới lượt (mỗi `NAV_S` giây trận). */
function navTick(battle: Battle): void {
  const nav = navOf(battle);
  if (!nav) return;
  capNhatNav(nav, battle.t, () => {
    const giac = battle.fighters.filter((o) => o.side === 'giac' && targetable(o));
    const ta = battle.fighters.filter((o) => o.side === 'ta' && targetable(o));
    return { giac, ta, giacBoi: giac.length > 0 && giac.every((o) => swims(o.kind)) };
  });
}

/**
 * Bước về phía (tx, tz) trên bãi có vật cản: đường thẳng thông thì đi thẳng, vướng thì lần theo bản đồ khoảng cách
 * tới `toi` (khóa đi vòng `VONG_KHOA` giây cho khỏi đổi qua đổi lại); lội nước, bùn thì chậm; đi xong thì trượt dọc vật cản.
 */
function walkField(nav: Nav, f: Fighter, toi: Toi, tx: number, tz: number, reach: number, dt: number, mult: number): void {
  const r = bodyRadius(f.kind);
  const boi = swims(f.kind);
  f.repathIn = Math.max(0, f.repathIn - dt);
  const go = huongTheo(nav, toi, f.x, f.z, r, tx, tz, reach, boi, f.repathIn > 0);
  if (go.vong && f.repathIn <= 0) f.repathIn = VONG_KHOA;
  const ox = f.x;
  const oz = f.z;
  moveToward(f, go.x, go.z, dt, mult * (boi ? 1 : chamAt(nav.bai, f.x, f.z)));
  truot(nav.bai, r, f, ox, oz);
}
/** Đã phải đi vòng thì cứ lần theo bản đồ khoảng cách chừng này giây rồi mới xét lại đường thẳng. */
const VONG_KHOA = 0.5;

/** Kỹ năng hất, lướt dời `f` tới (x, z) (đã giữ trong bãi): bãi có vật cản thì dừng ở mép vật cản. */
function pushTo(battle: Battle, f: Fighter, x: number, z: number): void {
  const nav = navOf(battle);
  if (nav) que(nav.bai, bodyRadius(f.kind), f, x, z);
  else {
    f.x = x;
    f.z = z;
  }
}

/** Người vừa hiện ra giữa trận (quân gọi thêm): bãi có vật cản thì đưa ra chỗ trống gần nhất. */
function placeFree(battle: Battle, f: Fighter): void {
  const nav = navOf(battle);
  if (nav) dayRa(nav.bai, bodyRadius(f.kind), f);
}

function emit(battle: Battle, e: Omit<BattleEvent, 'seq'>): void {
  battle.events.push({ ...e, seq: ++battle.seq });
  if (battle.events.length > 80) battle.events.splice(0, battle.events.length - 80);
}

// ---------- Tìm đường ----------

/**
 * Chi phí đi qua mỗi ô: sông không đi được (thủy quái thì bơi được), công trình còn nguyên phải phá mới qua
 * (chi phí cao).
 */
function costGrid(state: GameState, targetId: number | null, swim: boolean): Float32Array {
  const cost = new Float32Array(GRID * GRID).fill(1);
  if (!swim) for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) if (isRiver(x, z)) cost[tileIndex(x, z)] = Infinity;
  for (const b of state.buildings) {
    // Bẫy, đường đi, đồ trang trí không chắn đường: giặc đi thẳng qua.
    if (b.damaged || b.type === 'bayChong' || isDecor(b.type)) continue;
    const def = BUILDINGS[b.type];
    if (isBridge(b.type)) {
      // Cầu còn nguyên là lối đi qua sông, không phải chướng ngại.
      for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) cost[tileIndex(b.x + dx, b.z + dz)] = 1;
      continue;
    }
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
              : b.type === 'congThanh'
                ? CONG_THANH.pathCost
                : b.type === 'congDe'
                  ? CONG_DE_PATH
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
  // Dời "lỗ" thay vì tráo từng cặp: cùng thứ tự với cách tráo, nhanh hơn và không sinh rác.
  push(f: number, q: number, v: number): void {
    const F = this.f;
    const Q = this.q;
    const V = this.v;
    let i = V.length;
    F.push(f);
    Q.push(q);
    V.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!(f < F[p] || (f === F[p] && q < Q[p]))) break;
      F[i] = F[p];
      Q[i] = Q[p];
      V[i] = V[p];
      i = p;
    }
    F[i] = f;
    Q[i] = q;
    V[i] = v;
  }
  pop(): number {
    const F = this.f;
    const Q = this.q;
    const V = this.v;
    const top = V[0];
    const f = F.pop()!;
    const q = Q.pop()!;
    const v = V.pop()!;
    const n = V.length;
    if (!n) return top;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      // Con nhỏ nhất (so với phần tử đang dời xuống), như `less` của cách tráo.
      let mf = f;
      let mq = q;
      let m = i;
      if (l < n && (F[l] < mf || (F[l] === mf && Q[l] < mq))) {
        m = l;
        mf = F[l];
        mq = Q[l];
      }
      if (r < n && (F[r] < mf || (F[r] === mf && Q[r] < mq))) m = r;
      if (m === i) break;
      F[i] = F[m];
      Q[i] = Q[m];
      V[i] = V[m];
      i = m;
    }
    F[i] = f;
    Q[i] = q;
    V[i] = v;
    return top;
  }
}

/** Ô trong lưới gần chỗ (x, z) nhất (chỗ ngoài lưới thì lấy ô ở mép). */
const tileAt = (x: number, z: number) =>
  tileIndex(Math.min(GRID - 1, Math.max(0, Math.floor(x))), Math.min(GRID - 1, Math.max(0, Math.floor(z))));

/**
 * Dấu vân của dãy công trình: đổi khi công trình được dựng, dỡ, dời, nâng cấp, bị phá hay được sửa (người chơi vẫn
 * dựng, sửa được trong lúc giặc đánh). Dùng để biết lưới chi phí lưu sẵn còn đúng không.
 */
function buildingsKey(state: GameState): number {
  let h = state.buildings.length | 0;
  for (const b of state.buildings) {
    h = Math.imul(h ^ b.id, 0x9e3779b1);
    h = (h ^ (b.x * 131 + b.z * 7919 + b.level * 31 + (b.damaged ? 17 : 0) + b.type.length * 3)) | 0;
  }
  return h;
}

/** Lưới chi phí (không tính đích) lưu sẵn theo trận và theo `swim`. */
const COST_CACHE = new WeakMap<Battle, { key: number; grids: (Float32Array | undefined)[] }>();

function cachedCost(state: GameState, battle: Battle, swim: boolean): Float32Array {
  const key = buildingsKey(state);
  let entry = COST_CACHE.get(battle);
  if (!entry || entry.key !== key) {
    entry = { key, grids: [] };
    COST_CACHE.set(battle, entry);
  }
  const slot = swim ? 1 : 0;
  return (entry.grids[slot] ??= costGrid(state, null, swim));
}

/** Công trình này có ghi chi phí riêng lên lưới không (bẫy, đường đi, trang trí, cầu, công trình đã hư thì không). */
const blocksPath = (b: Building) => !b.damaged && b.type !== 'bayChong' && !isDecor(b.type) && !isBridge(b.type);

/**
 * A* trên lưới 8 hướng, tới bất kỳ ô nào thuộc móng công trình đích. `swim`: bơi được qua sông. Có `battle` thì dùng
 * lưới chi phí lưu sẵn của trận (cho đúng đường như dựng lại lưới mỗi lần), chỉ tạm đổi ô móng đích thành dễ đi.
 */
export function findPath(state: GameState, fromX: number, fromZ: number, target: Building, swim = false, battle?: Battle): number[] | null {
  const cost = battle ? cachedCost(state, battle, swim) : costGrid(state, target.id, swim);
  const def = BUILDINGS[target.type];
  // Ô móng đích đi được như đất trống (như `costGrid` khi có đích); xong thì trả lại chi phí cũ.
  const patched: number[] = [];
  if (battle && blocksPath(target)) {
    for (let dx = 0; dx < def.w; dx++)
      for (let dz = 0; dz < def.d; dz++) {
        const i = tileIndex(target.x + dx, target.z + dz);
        patched.push(i, cost[i]);
        cost[i] = 1;
      }
  }
  const isGoal = (i: number) => {
    const x = i % GRID;
    const z = Math.floor(i / GRID);
    return x >= target.x && x < target.x + def.w && z >= target.z && z < target.z + def.d;
  };
  const tx = target.x + def.w / 2;
  const tz = target.z + def.d / 2;
  const h = (i: number) => dist((i % GRID) + 0.5 - tx, Math.floor(i / GRID) + 0.5 - tz);
  const path = searchPath(cost, tileAt(fromX, fromZ), isGoal, h);
  for (let k = 0; k < patched.length; k += 2) cost[patched[k]] = patched[k + 1];
  return path;
}

// Mảng nháp của A*, dùng lại giữa các lần tìm đường. Ô có `seen` (hay `shut`) bằng số lượt hiện tại mới có g, came,
// thứ tự (hay đã đóng) của lượt này; ô khác coi như chưa xét, khỏi phải xóa cả lưới mỗi lần.
const S_G = new Float32Array(GRID * GRID);
const S_CAME = new Int32Array(GRID * GRID);
const S_SEQ = new Int32Array(GRID * GRID);
const S_SEEN = new Uint32Array(GRID * GRID);
const S_SHUT = new Uint32Array(GRID * GRID);
let searchRun = 0;

/** A* trên lưới 8 hướng theo bảng chi phí `cost` (Infinity là không đi được), từ ô `start` tới ô đầu tiên `isGoal`. */
function searchPath(cost: Float32Array, start: number, isGoal: (i: number) => boolean, h: (i: number) => number): number[] | null {
  const run = (searchRun = (searchRun + 1) >>> 0 || 1);
  const g = S_G;
  const came = S_CAME;
  const seen = S_SEEN;
  const closed = S_SHUT;
  // Hàng đợi ưu tiên theo f = g + h; hòa thì ô thêm vào trước được xét trước (như cách dò tuần tự cũ).
  // Ô có g tốt hơn thì thêm lại một mục mới, mục cũ bỏ qua khi lấy ra.
  const seqOf = S_SEQ;
  const heap = new OpenHeap();
  let seq = 0;
  seen[start] = run;
  g[start] = 0;
  came[start] = -1;
  seqOf[start] = seq++;
  heap.push(h(start), seqOf[start], start);
  while (heap.size) {
    const cur = heap.pop();
    if (closed[cur] === run) continue;
    if (isGoal(cur)) {
      const path = [cur];
      let c = cur;
      while (came[c] !== -1) {
        c = came[c];
        path.unshift(c);
      }
      return path;
    }
    closed[cur] = run;
    const cx = cur % GRID;
    const cz = Math.floor(cur / GRID);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (!inGrid(nx, nz)) continue;
        const ni = tileIndex(nx, nz);
        if (closed[ni] === run || cost[ni] === Infinity) continue;
        // Không đi chéo cắt góc qua ô không đi được.
        if (dx && dz && (cost[tileIndex(cx + dx, cz)] === Infinity || cost[tileIndex(cx, cz + dz)] === Infinity)) continue;
        const ng = g[cur] + cost[ni] * (dx && dz ? Math.SQRT2 : 1);
        const old = seen[ni] === run ? g[ni] : Infinity;
        if (ng < old) {
          if (old === Infinity) seqOf[ni] = seq++;
          seen[ni] = run;
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
    if (o.side === f.side || (o.state !== 'move' && o.state !== 'fight' && o.state !== 'flee') || !reaches(f.kind, o)) continue;
    const d = dist(o.x - f.x, o.z - f.z);
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
  // Yêu tinh núi Thất Diệu phá thành Cổ Loa (cả cổng thành) trước tiên.
  if (battle.foe === 'yeu') {
    const wall = pick(state.buildings.filter(isCitadel));
    if (wall) return wall;
  }
  const live = state.buildings.filter(isTargetable);
  const bank = farSideBank(battle.side);
  if (bank) {
    // Giặc bên kia sông đánh làng gần nhất trước; còn cầu thì qua cầu tìm kho, Điện; không thì phá công trình bên ấy.
    const mine = live.filter((b) => farBankOf(b.x, b.z) === bank);
    const across = bridgeUp(state, bank) ? live.filter((b) => farBankOf(b.x, b.z) === null) : [];
    return (
      pick(mine.filter((b) => b.type === 'banLang')) ??
      pick(across.filter((b) => b.type === 'kho')) ??
      pick(across.filter((b) => b.type === 'dien')) ??
      pick(mine) ??
      pick(across)
    );
  }
  return pick(live.filter((b) => b.type === 'kho')) ?? pick(live.filter((b) => b.type === 'dien')) ?? pick(live);
}

function moveToward(f: Fighter, tx: number, tz: number, dt: number, mult = 1, geo = 1): boolean {
  const dx = tx - f.x;
  const dz = tz - f.z;
  const d = dist(dx, dz);
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
  if (!reaches(attacker.kind, target)) return;
  const bonus = attacker.kind && statsOf(attacker.kind).strongVs?.includes(target.kind as UnitType | EnemyType) ? 2 : 1;
  // Rùa Vàng che chở: quân ta chỉ chịu một phần sát thương. Thử thách Giặc dữ: giặc đánh đau hơn.
  const shield = target.side === 'ta' && battle.shield > 0 ? KIM_QUY.reduce : 1;
  const fury = target.side === 'ta' ? (battle.fury ?? 1) : 1;
  target.hp -= attacker.dmg * bonus * shield * fury;
  if (isHero(target.kind)) {
    // Tướng không chết: hết sức thì rút khỏi trận, nghỉ một lúc.
    if (target.hp <= 0 && target.state !== 'gone') {
      target.hp = 0;
      target.state = 'gone';
      const setup = target.side === 'ta' ? heroSetups(battle).find((h) => h.kind === target.kind) : undefined;
      if (setup) setup.down = true;
      emit(battle, { kind: 'exhaust', x: target.x, z: target.z });
    }
    return;
  }
  if (target.hp <= 0 && target.state !== 'dead') {
    target.state = 'dead';
    target.hp = 0;
    if (target.ship) {
      // Lâu thuyền bị đánh chìm: nghiêng, chìm dần (phần vẽ lo).
      battle.sunk = (battle.sunk ?? 0) + 1;
      emit(battle, { kind: 'sink', x: target.x, z: target.z });
    } else emit(battle, { kind: 'die', x: target.x, z: target.z });
    if (target.side === 'giac') battle.killed++;
    else if (target.kind in battle.lost) battle.lost[target.kind as UnitType]++;
  }
}

/** Một đòn của `f` vào `foe`: bắn tên nếu đánh xa, quân ta mạnh hơn khi đang có Trống trận. */
function strike(battle: Battle, f: Fighter, foe: Fighter): void {
  const st = statsOf(f.kind);
  if (st.range > 2) emit(battle, { kind: 'shot', x: f.x, z: f.z, tx: foe.x, tz: foe.z, by: f.kind });
  const mult = sideMult(battle, f) * (f.side === 'ta' && battle.rally > 0 ? RALLY.dmg : 1);
  const dmg = st.dmg * mult;
  damageFighter(battle, { kind: f.kind, dmg }, foe);
  if (isHero(f.kind)) {
    // Đòn của tướng quét cả giặc đứng quanh.
    for (const o of battle.fighters) {
      if (o === foe || o.side === f.side || !isAlive(o) || !reaches(f.kind, o)) continue;
      if (dist(o.x - foe.x, o.z - foe.z) <= HERO_CLEAVE.radius * geoOf(battle)) damageFighter(battle, { dmg: dmg * HERO_CLEAVE.share }, o);
    }
  }
  // Lệnh bắn: lính nỏ ta lên dây nhanh hơn.
  f.cd = f.kind === 'no' && f.side === 'ta' ? st.cooldown / fireRate(battle) : st.cooldown;
  f.swing = 0.3;
}

function damageBuilding(state: GameState, battle: Battle, attacker: Fighter, b: Building, dmg: number): void {
  const hp = buildingHp(battle, b) - dmg;
  battle.hp[b.id] = hp;
  if (hp > 0 || b.damaged) return;
  b.damaged = true;
  // Ụ nỏ là một phần của đoạn thành: thành bị phá thì ụ hư theo.
  if (b.uNo) b.uNo = 'hu';
  battle.wrecked.push(b.id);
  const def = BUILDINGS[b.type];
  emit(battle, { kind: 'wreck', x: b.x + def.w / 2, z: b.z + def.d / 2 });
  const share = LOOT_FRACTION[b.type];
  // Lâu thuyền bắn từ dưới sông: phá được mà không cướp được của.
  if (share && attacker.side === 'giac' && !attacker.ship && battle.mode !== 'pvp') {
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

/** Chỗ giặc bỏ chạy về: bìa rừng phía đã kéo tới, hay lặn xuống sông (bơi ra mép luồng sông rồi lặn). */
function exitPoint(battle: Battle, f: Fighter): { x: number; z: number } {
  // Bên kia sông: về bìa rừng ngoài cùng bên ấy.
  if (battle.side === 'namXa') return { x: f.x, z: GRID + 0.5 };
  if (battle.side === 'dongXa') return { x: GRID + 0.5, z: f.z };
  if (battle.side === 'nam') return { x: f.x, z: RIVER_DIVE + 0.5 };
  if (battle.side === 'dong') return { x: RIVER_DIVE + 0.5, z: f.z };
  const out = (battle.exitAt ?? -0.5) - 1;
  return battle.side === 'bac' ? { x: f.x, z: out } : { x: out, z: f.z };
}

/** Giặc bỏ chạy đã thoát chưa: lặn xuống sông, hay lùi qua vạch xuất phát ở bìa rừng. */
function escaped(battle: Battle, f: Fighter): boolean {
  if (battle.side === 'namXa') return f.z > GRID - 0.3;
  if (battle.side === 'dongXa') return f.x > GRID - 0.3;
  if (f.x < 0 || f.z < 0 || f.x > RIVER_DIVE || f.z > RIVER_DIVE) return true;
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
  // Đấu thành: quân ta đánh thành được Trống trận cho đi nhanh, đánh mạnh; đòn vào công trình cũng tính Đền, binh khí.
  const ours = f.side === 'ta';
  const speed = ours && battle.rally > 0 ? RALLY.speed : 1;
  const hit = ours ? st.dmg * ownMult(battle, f.kind, f.nu) * (battle.rally > 0 ? RALLY.dmg : 1) * (battle.siege ?? 1) : st.dmg;
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
    // Hết công trình để phá: giặc rút; quân ta đánh thành thì đứng lại (trận Đấu thành tự kết thúc).
    f.state = ours ? 'move' : 'flee';
    return;
  }
  if (rectDist(f.x, f.z, target) <= reach + 0.1) {
    f.state = 'fight';
    if (f.cd <= 0) {
      const def = BUILDINGS[target.type];
      if (st.range > 2) emit(battle, { kind: 'shot', x: f.x, z: f.z, tx: target.x + def.w / 2, tz: target.z + def.d / 2 });
      f.face = Math.atan2(target.x + def.w / 2 - f.x, target.z + def.d / 2 - f.z);
      damageBuilding(state, battle, f, target, hit);
      f.cd = st.cooldown;
      f.swing = 0.3;
    }
    return;
  }
  f.repathIn -= dt;
  if (!f.path || f.repathIn <= 0) {
    f.path = findPath(state, f.x, f.z, target, battle.swim && SWIMMERS.includes(f.kind as EnemyType), battle);
    f.pathAt = 1;
    f.repathIn = 2;
  }
  if (!f.path || f.pathAt >= f.path.length) {
    f.state = 'move';
    moveToward(f, target.x + BUILDINGS[target.type].w / 2, target.z + BUILDINGS[target.type].d / 2, dt, speed, geoOf(battle));
    return;
  }
  const next = f.path[f.pathAt];
  const nx = next % GRID;
  const nz = Math.floor(next / GRID);
  // Ô tiếp theo có lũy hay công trình chắn đường: phá nó trước.
  const blocker = state.buildings.find((b) => {
    if (b.damaged || b.id === target!.id || b.type === 'bayChong' || isDecor(b.type) || isBridge(b.type)) return false;
    const def = BUILDINGS[b.type];
    return nx >= b.x && nx < b.x + def.w && nz >= b.z && nz < b.z + def.d;
  });
  if (blocker) {
    if (rectDist(f.x, f.z, blocker) <= reach + 0.15) {
      f.state = 'fight';
      f.face = Math.atan2(nx + 0.5 - f.x, nz + 0.5 - f.z);
      if (f.cd <= 0) {
        damageBuilding(state, battle, f, blocker, hit);
        f.cd = st.cooldown;
        f.swing = 0.3;
      }
      return;
    }
  }
  f.state = 'move';
  if (moveToward(f, nx + 0.5, nz + 0.5, dt, speed, geoOf(battle)) && !blocker) f.pathAt++;
}

/** Xông tới kẻ địch gần nhất rồi đánh: quân hai bên ngoài bãi (trận giữ kinh đô thì lính ta đi theo `stepGuard`). */
function stepChase(battle: Battle, f: Fighter, dt: number): void {
  if (stunned(f, dt)) return;
  const st = statsOf(f.kind);
  const foe = nearestEnemyOf(battle, f);
  if (!foe) {
    f.state = 'move';
    return;
  }
  const d = dist(foe.x - f.x, foe.z - f.z);
  const reach = st.range * geoOf(battle) + 0.3;
  if (d <= reach) {
    f.state = 'fight';
    f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
    if (f.cd <= 0) strike(battle, f, foe);
    return;
  }
  f.state = 'move';
  const mult = f.side === 'ta' && battle.rally > 0 ? RALLY.speed : 1;
  const nav = navOf(battle);
  if (nav) walkField(nav, f, f.side === 'ta' ? 'giac' : 'ta', foe.x, foe.z, reach, dt, mult);
  else moveToward(f, foe.x, foe.z, dt, mult, geoOf(battle));
}

// ---------- Lính ta đi trên đất (trận giữ kinh đô) ----------

/**
 * Sông là hào: lính ta không lội qua, chỉ qua bằng cầu còn nguyên. Ô sông sát bờ (cạnh ô đất) thì lội ra được để đánh
 * thủy quái, thuyền giặc ven bờ, nhưng đi chậm hơn đất nên tìm đường thì tránh.
 */
const WADE_COST = 4;
/** Ô sông sát bờ đất (8 hướng): không đổi theo trận nên tính một lần. */
let wadeMask: Uint8Array | null = null;
function wading(): Uint8Array {
  if (wadeMask) return wadeMask;
  const m = new Uint8Array(GRID * GRID);
  for (let z = 0; z < GRID; z++)
    for (let x = 0; x < GRID; x++) {
      if (!isRiver(x, z)) continue;
      for (let dz = -1; dz <= 1 && !m[tileIndex(x, z)]; dz++)
        for (let dx = -1; dx <= 1; dx++) if (inGrid(x + dx, z + dz) && !isRiver(x + dx, z + dz)) m[tileIndex(x, z)] = 1;
    }
  return (wadeMask = m);
}

/** Bản đồ đi lại của lính ta: chi phí từng ô và vùng liền nhau (`comp`, -1 là nước sâu) theo cầu còn nguyên. */
interface LandMap {
  key: string;
  cost: Float32Array;
  comp: Int16Array;
  comps: number;
}
const landMaps = new WeakMap<Battle, LandMap>();

function landMap(state: GameState, battle: Battle): LandMap {
  const bridges = state.buildings.filter((b) => isBridge(b.type));
  const key = bridges.map((b) => `${b.type}${b.x},${b.z}${b.damaged ? 'x' : ''}`).join(';');
  const old = landMaps.get(battle);
  if (old && old.key === key) return old;
  const wade = wading();
  const cost = new Float32Array(GRID * GRID);
  for (let i = 0; i < GRID * GRID; i++) cost[i] = !isRiver(i % GRID, Math.floor(i / GRID)) ? 1 : wade[i] ? WADE_COST : Infinity;
  for (const b of bridges) {
    if (b.damaged) continue;
    const def = BUILDINGS[b.type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) if (inGrid(b.x + dx, b.z + dz)) cost[tileIndex(b.x + dx, b.z + dz)] = 1;
  }
  // Vùng liền nhau theo 4 hướng (A* không cắt góc qua ô không đi được nên cũng chỉ nối được như vậy).
  const comp = new Int16Array(GRID * GRID).fill(-1);
  let comps = 0;
  const stack: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if (comp[i] !== -1 || cost[i] === Infinity) continue;
    comp[i] = comps;
    stack.push(i);
    while (stack.length) {
      const c = stack.pop()!;
      const cx = c % GRID;
      const cz = Math.floor(c / GRID);
      for (const [nx, nz] of [
        [cx + 1, cz],
        [cx - 1, cz],
        [cx, cz + 1],
        [cx, cz - 1],
      ]) {
        if (!inGrid(nx, nz)) continue;
        const n = tileIndex(nx, nz);
        if (comp[n] !== -1 || cost[n] === Infinity) continue;
        comp[n] = comps;
        stack.push(n);
      }
    }
    comps++;
  }
  const map = { key, cost, comp, comps };
  landMaps.set(battle, map);
  return map;
}

const passable = (map: LandMap, x: number, z: number) => map.cost[tileAt(x, z)] !== Infinity;

/** Vùng lính ta đang đứng; lỡ đứng giữa nước sâu thì lấy vùng gần nhất để còn lên bờ. */
function compOf(map: LandMap, x: number, z: number): number {
  const here = map.comp[tileAt(x, z)];
  if (here !== -1) return here;
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  for (let r = 1; r < GRID; r++)
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !inGrid(cx + dx, cz + dz)) continue;
        const c = map.comp[tileIndex(cx + dx, cz + dz)];
        if (c !== -1) return c;
      }
  return -1;
}

/** Dò quanh giặc dưới nước chừng này ô: hơn tầm bắn xa nhất của lính ta, tướng ta khi giữ kinh đô. */
const WATER_SCAN = 8;

/** Mỗi bước trận: khoảng cách từ mỗi tên giặc dưới nước sâu tới đất gần nhất của từng vùng (dò một lần mỗi tên). */
interface GuardCtx {
  map: LandMap;
  shore: Map<number, Float32Array>;
}

/** Khoảng cách gần nhất từ giặc ở nước sâu (x, z) tới ô đi được của từng vùng, chỉ dò trong `WATER_SCAN` ô. */
function shoreDist(ctx: GuardCtx, o: Fighter): Float32Array {
  const cached = ctx.shore.get(o.id);
  if (cached) return cached;
  const { map } = ctx;
  const out = new Float32Array(map.comps).fill(Infinity);
  const x0 = Math.max(0, Math.floor(o.x - WATER_SCAN));
  const x1 = Math.min(GRID - 1, Math.floor(o.x + WATER_SCAN));
  const z0 = Math.max(0, Math.floor(o.z - WATER_SCAN));
  const z1 = Math.min(GRID - 1, Math.floor(o.z + WATER_SCAN));
  for (let z = z0; z <= z1; z++)
    for (let x = x0; x <= x1; x++) {
      const c = map.comp[tileIndex(x, z)];
      if (c === -1) continue;
      const d = dist(Math.max(x - o.x, 0, o.x - x - 1), Math.max(z - o.z, 0, o.z - z - 1));
      if (d < out[c]) out[c] = d;
    }
  ctx.shore.set(o.id, out);
  return out;
}

/**
 * Giặc gần nhất mà lính ta đánh tới được: đang trong tầm (bắn qua sông cũng được), đứng trên đất cùng vùng (qua cầu
 * cũng là cùng vùng), hay ở dưới nước mà từ bờ vùng mình vươn tới.
 */
function reachableFoeOf(battle: Battle, f: Fighter, ctx: GuardCtx, reach: number): Fighter | null {
  const mine = compOf(ctx.map, f.x, f.z);
  let best: Fighter | null = null;
  let bestD = Infinity;
  for (const o of battle.fighters) {
    if (o.side === f.side || (o.state !== 'move' && o.state !== 'fight' && o.state !== 'flee') || !reaches(f.kind, o)) continue;
    const d = dist(o.x - f.x, o.z - f.z);
    if (d >= bestD) continue;
    if (d > reach && mine !== -1) {
      const theirs = ctx.map.comp[tileAt(o.x, o.z)];
      if (theirs === -1 ? shoreDist(ctx, o)[mine] > reach : theirs !== mine) continue;
    }
    bestD = d;
    best = o;
  }
  return best;
}

/** Đi thẳng từ (x0, z0) tới khi cách (x1, z1) trong `reach` mà không bước vào nước sâu. */
function clearLine(map: LandMap, x0: number, z0: number, x1: number, z1: number, reach: number): boolean {
  const d = dist(x1 - x0, z1 - z0);
  const n = Math.ceil(Math.max(0, d - reach) / 0.5);
  for (let k = 1; k <= n; k++) {
    const t = Math.min(1, (k * 0.5) / d);
    if (!passable(map, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false;
  }
  return true;
}

/** Bước thẳng tới (tx, tz) nhưng không bước xuống nước sâu: vướng thì trượt dọc bờ, không được thì đứng lại. */
function walkOnLand(map: LandMap, f: Fighter, tx: number, tz: number, dt: number, mult: number, geo: number): boolean {
  const ox = f.x;
  const oz = f.z;
  const done = moveToward(f, tx, tz, dt, mult, geo);
  if (passable(map, f.x, f.z) || !passable(map, ox, oz)) return done;
  if (passable(map, f.x, oz)) f.z = oz;
  else if (passable(map, ox, f.z)) f.x = ox;
  else {
    f.x = ox;
    f.z = oz;
  }
  return false;
}

/** Đường trên đất (qua cầu) tới chỗ đứng đánh được `foe`. */
function guardPath(map: LandMap, f: Fighter, foe: Fighter, reach: number, mine: number): number[] | null {
  const near = (i: number) => dist((i % GRID) + 0.5 - foe.x, Math.floor(i / GRID) + 0.5 - foe.z);
  const foeTile = tileAt(foe.x, foe.z);
  const isGoal = (i: number) => map.comp[i] === mine && (i === foeTile || near(i) <= reach + 0.75);
  return searchPath(map.cost, tileAt(f.x, f.z), isGoal, (i) => Math.max(0, near(i) - reach - 0.75));
}

/**
 * Lính ta trong trận giữ kinh đô: như `stepChase` nhưng sông là hào. Giặc bên kia sông thì đi vòng qua cầu, không có
 * cầu thì chỉ bắn với tới được; giặc dưới nước thì lội ra ô sát bờ mà đánh.
 */
function stepGuard(battle: Battle, f: Fighter, dt: number, ctx: GuardCtx): void {
  if (stunned(f, dt)) return;
  const st = statsOf(f.kind);
  const geo = geoOf(battle);
  const reach = st.range * geo + 0.3;
  const foe = reachableFoeOf(battle, f, ctx, reach);
  if (!foe) {
    f.state = 'move';
    f.path = null;
    return;
  }
  const d = dist(foe.x - f.x, foe.z - f.z);
  if (d <= reach) {
    f.state = 'fight';
    f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
    if (f.cd <= 0) strike(battle, f, foe);
    return;
  }
  f.state = 'move';
  const mult = f.side === 'ta' && battle.rally > 0 ? RALLY.speed : 1;
  const { map } = ctx;
  if (clearLine(map, f.x, f.z, foe.x, foe.z, reach)) {
    f.path = null;
    walkOnLand(map, f, foe.x, foe.z, dt, mult, geo);
    return;
  }
  f.repathIn -= dt;
  if (f.targetUnit !== foe.id || !f.path || f.repathIn <= 0) {
    f.targetUnit = foe.id;
    f.path = guardPath(map, f, foe, reach, compOf(map, f.x, f.z));
    f.pathAt = 1;
    f.repathIn = 1;
  }
  if (!f.path || f.pathAt >= f.path.length) {
    walkOnLand(map, f, foe.x, foe.z, dt, mult, geo);
    return;
  }
  const next = f.path[f.pathAt];
  if (walkOnLand(map, f, (next % GRID) + 0.5, Math.floor(next / GRID) + 0.5, dt, mult, geo)) f.pathAt++;
}

function stepDefenses(state: GameState, battle: Battle, dt: number): void {
  // Công trình bắn phe đánh kinh đô: giặc, hay quân ta khi Đấu thành. Lệnh bắn là của tướng ta, không giúp thành người.
  const foeSide: Side = battle.mode === 'pvp' ? 'ta' : 'giac';
  const rate = battle.mode === 'pvp' ? 1 : fireRate(battle);
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
        if (o.side !== foeSide || (o.state !== 'move' && o.state !== 'fight' && o.state !== 'flee')) continue;
        const d = dist(o.x - tower.x, o.z - tower.z);
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
        .filter((o) => o.side === foeSide && (o.state === 'move' || o.state === 'fight' || o.state === 'flee'))
        .map((o) => ({ o, d: dist(o.x - tower.x, o.z - tower.z) }))
        .filter((t) => t.d < range)
        .sort((p, q) => p.d - q.d)
        .slice(0, LAU_NO.targets);
      if (targets.length) {
        for (const { o } of targets) {
          emit(battle, { kind: 'shot', x: tower.x, z: tower.z, tx: o.x, tz: o.z });
          damageFighter(battle, { dmg: LAU_NO.dmg[b.level - 1] * (battle.crossbows ? CO_LOA_TOWER.dmg : 1) }, o);
        }
        battle.towerCd[b.id] = LAU_NO.cooldown / rate;
      }
    }
    if (b.type === 'congThanh') {
      const cd = (battle.towerCd[b.id] ?? 0) - dt;
      battle.towerCd[b.id] = cd;
      if (cd > 0) continue;
      // Lính trên lầu cổng: mỗi phát bắn giặc gần nhất trong tầm (cổng cấp 3 hai lính nỏ, hai giặc).
      const gate = { x: b.x + 0.5, z: b.z + 0.5 };
      const range = (CONG_THANH.range + (battle.crossbows ? CO_LOA_TOWER.range : 0)) * geoOf(battle);
      const targets = battle.fighters
        .filter((o) => o.side === foeSide && (o.state === 'move' || o.state === 'fight' || o.state === 'flee'))
        .map((o) => ({ o, d: dist(o.x - gate.x, o.z - gate.z) }))
        .filter((t) => t.d < range)
        .sort((p, q) => p.d - q.d)
        .slice(0, CONG_THANH.targets[b.level - 1] ?? 1);
      if (targets.length) {
        for (const { o } of targets) {
          emit(battle, { kind: 'shot', x: gate.x, z: gate.z, tx: o.x, tz: o.z, by: 'no' });
          damageFighter(battle, { dmg: CONG_THANH.dmg[b.level - 1] * (battle.crossbows ? CO_LOA_TOWER.dmg : 1) }, o);
        }
        battle.towerCd[b.id] = CONG_THANH.cooldown;
      }
    }
    if (b.type === 'thanh' && b.uNo === 'ok') {
      const cd = (battle.towerCd[b.id] ?? 0) - dt;
      battle.towerCd[b.id] = cd;
      if (cd > 0) continue;
      // Ụ nỏ trên mặt thành: một lính nỏ quỳ bắn giặc gần nhất trong tầm.
      const at = { x: b.x + 0.5, z: b.z + 0.5 };
      let best: Fighter | null = null;
      let bestD = U_NO.range + (battle.crossbows ? CO_LOA_TOWER.range : 0);
      for (const o of battle.fighters) {
        if (o.side !== foeSide || (o.state !== 'move' && o.state !== 'fight' && o.state !== 'flee')) continue;
        const d = dist(o.x - at.x, o.z - at.z);
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
      if (best) {
        emit(battle, { kind: 'shot', x: at.x, z: at.z, tx: best.x, tz: best.z, by: 'no' });
        damageFighter(battle, { dmg: U_NO.dmg * (battle.crossbows ? CO_LOA_TOWER.dmg : 1) }, best);
        battle.towerCd[b.id] = U_NO.cooldown / rate;
      }
    }
    if (b.type === 'bayChong' && !battle.trapsUsed.includes(b.id)) {
      const victims = battle.fighters.filter(
        (o) => o.side === foeSide && (o.state === 'move' || o.state === 'fight') && dist(o.x - b.x - 0.5, o.z - b.z - 0.5) < 0.7,
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
  if (battle.lenh) battle.lenh = Math.max(0, battle.lenh - dt);
  for (const k of Object.keys(battle.skillCd) as SkillId[]) battle.skillCd[k] = Math.max(0, (battle.skillCd[k] ?? 0) - dt);
}

/**
 * Mùa lũ: nước dâng dần mỗi bậc FLOOD_RISE_S giây tới mực lũ, loang từ sông vào ô thấp.
 * Công trình bị ngập quá sức chịu của nền thì hư. Đê bị thủy quái phá thì nước tràn qua chỗ vỡ.
 * Cống đê đang mở cho nước vào sau đê: ruộng chỉ dính nước ấy thì được bồi phù sa thay vì hư.
 */
function stepFlood(state: GameState, battle: Battle): void {
  if (battle.floodTo <= 0) return;
  battle.water = Math.min(battle.floodTo, battle.t / FLOOD_RISE_S);
  const hits = floodHits(state, battle.water);
  for (const b of hits.boi) {
    battle.boi ??= [];
    if (!battle.boi.includes(b.id)) battle.boi.push(b.id);
  }
  for (const b of hits.drown) {
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
  stepBoats(battle, dt);
  if (battle.mode !== 'pvp' && battle.t * 1000 > RAID_MAX_MS) {
    // Quá lâu thì giặc rút; quá lâu nữa thì coi như đã rút hết.
    for (const f of battle.fighters) if (f.side === 'giac' && (f.state === 'move' || f.state === 'fight')) f.state = 'flee';
    if (battle.t * 1000 > RAID_MAX_MS + 30_000) for (const f of battle.fighters) if (f.state === 'flee') f.state = 'gone';
  }
  let ctx: GuardCtx | null = null;
  for (const f of battle.fighters) {
    if (f.state === 'dead' || f.state === 'gone' || f.state === 'aboard') continue;
    f.cd -= dt;
    f.swing = Math.max(0, f.swing - dt);
    if (f.ship) stepShip(state, battle, f, dt);
    else if (f.side === (battle.mode === 'pvp' ? 'ta' : 'giac')) stepEnemy(state, battle, f, dt);
    else stepGuard(battle, f, dt, (ctx ??= { map: landMap(state, battle), shore: new Map() }));
  }
  stepDefenses(state, battle, dt);
  return battle.mode === 'pvp' ? pvpOver(state, battle) : enemiesLeft(battle) === 0;
}

/** Còn đứng trên bãi: chưa chết, chưa chạy thoát, không còn ngồi trên thuyền. */
function isAlive(f: Fighter): boolean {
  return f.state !== 'dead' && f.state !== 'gone' && f.state !== 'aboard';
}
const BIG: FighterKind[] = [
  'voi',
  'chienXa',
  'phoTuong',
  'daiTuong',
  'giong',
  'sonTinh',
  'anDuong',
  'caoLo',
  'caSau',
  'thuongLuong',
  'thuyTinh',
  'hoTinh',
  'gaTrang',
  'kyBinh',
  'trieuDa',
  'trungTrac',
  'trungNhi',
  'toDinh',
];
const BIG_SET = new Set<FighterKind>(BIG);
const bodyRadius = (k: FighterKind) => (BIG_SET.has(k) ? 0.45 : 0.27);

/** Đẩy lính đứng chồng lên nhau ra, và giữ mọi người trong bãi. */
function separate(battle: Battle): void {
  const live = battle.fighters.filter(isAlive);
  // Bãi có vật cản: nhớ chỗ trước khi đẩy, để đẩy xong thì trượt dọc vật cản chứ không bị đẩy xuyên qua.
  const nav = navOf(battle);
  const before = nav ? live.map((f) => [f.x, f.z] as const) : null;
  for (let i = 0; i < live.length; i++) {
    const a = live[i];
    for (let j = i + 1; j < live.length; j++) {
      const b = live[j];
      const min = bodyRadius(a.kind) + bodyRadius(b.kind);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = dist(dx, dz);
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
  live.forEach((f, i) => {
    f.x = clampField(f.x, FIELD.w);
    f.z = clampField(f.z, FIELD.d);
    if (nav) truot(nav.bai, bodyRadius(f.kind), f, before![i][0], before![i][1]);
  });
}

/** Chạy trận ngoài bãi thêm `dt` giây. Trả về true khi đã phân thắng bại (xem `outcome`). */
export function stepField(battle: Battle, dt: number): boolean {
  if (battle.outcome) return true;
  advanceClock(battle, dt);
  arriveWaves(battle);
  navTick(battle);
  for (const f of battle.fighters) {
    if (!isAlive(f)) continue;
    f.cd -= dt;
    f.swing = Math.max(0, f.swing - dt);
    if (f.slow) f.slow = Math.max(0, f.slow - dt);
    if (f.kind === 'thuyTinh') stepThuyTinh(battle, f, dt);
    if (f.kind === 'toDinh' && stepToDinh(battle, f, dt)) continue;
    if (f.kind === 'maVien') stepMaVien(battle, f, dt);
    stepChase(battle, f, dt);
  }
  separate(battle);
  stepNuTuong(battle, dt);
  const pending = battle.waves?.length ?? 0;
  if (alliesLeft(battle) === 0) battle.outcome = 'lose';
  // Màn cầm cự: giữ đủ thời gian thì thắng, không cần diệt hết giặc; diệt hết mọi đợt sớm hơn cũng thắng.
  else if (battle.holdS !== undefined && battle.t >= battle.holdS) battle.outcome = 'win';
  else if (enemiesLeft(battle) === 0 && !pending) battle.outcome = 'win';
  else if (battle.holdS === undefined && battle.t > FIELD.maxS) battle.outcome = 'lose';
  return battle.outcome !== null;
}

/** Phó tướng đứng lùi sau người ta ở cuối hàng chừng này ô, đi theo chậm rãi. */
const NU_BACK = 1.2;
const NU_SPEED = 0.8;

/** Chỗ phó tướng đứng: sau người ta ở cuối hàng hậu (quân ta ở phía z lớn), không ra khỏi bãi. */
function nuRestZ(battle: Battle): number {
  let rear = -Infinity;
  for (const f of battle.fighters) if (f.side === 'ta' && isAlive(f)) rear = Math.max(rear, f.z);
  return Math.min(FIELD.d - 0.4, (Number.isFinite(rear) ? rear : FIELD.d - 1) + NU_BACK);
}

/**
 * Phó tướng đi chậm theo sau quân ta, giữ chỗ sau người cuối hàng và lệch theo chỗ quân ta đông. Giặc không nhắm
 * nên không cần tránh.
 */
function stepNuTuong(battle: Battle, dt: number): void {
  const nu = battle.nuTuong;
  if (!nu) return;
  let sx = 0;
  let n = 0;
  for (const f of battle.fighters) if (f.side === 'ta' && isAlive(f)) (sx += f.x), n++;
  // Bãi có vật cản: chỗ đứng đưa ra chỗ trống, đi thì trượt dọc vật cản (không cần tìm đường, chỉ là người cầm cờ).
  const nav = navOf(battle);
  const at = { x: n ? Math.min(FIELD.w - 1, Math.max(1, sx / n)) : nu.x, z: nuRestZ(battle) };
  if (nav) dayRa(nav.bai, NU_R, at);
  const tx = at.x;
  const tz = at.z;
  const ox = nu.x;
  const oz = nu.z;
  const dx = tx - nu.x;
  const dz = tz - nu.z;
  const d = dist(dx, dz);
  const step = NU_SPEED * dt;
  if (d <= step) {
    nu.x = tx;
    nu.z = tz;
  } else if (d > 0.15) {
    nu.x += (dx / d) * step;
    nu.z += (dz / d) * step;
  }
  if (nav) truot(nav.bai, NU_R, nu, ox, oz);
}
/** Thân nữ tướng khi tránh vật cản (như lính thường). */
const NU_R = 0.27;

/** Màn cầm cự: đã giữ được bao nhiêu phần thời gian (0..1), để vẽ thanh "Vua tới biển". */
export function holdProgress(battle: Battle): number {
  return battle.holdS ? Math.min(1, battle.t / battle.holdS) : 0;
}

/** Màn cầm cự: đợt giặc thứ mấy đã tới bãi (1 là đợt đầu). */
export function wavesArrived(battle: Battle): number {
  return (battle.waveCount ?? 1) - (battle.waves?.length ?? 0);
}

/**
 * Tô Định còn ít máu thì bỏ chạy về cuối bãi phía giặc, nhanh hơn thường; chạy thoát thì tính như đã hạ. Trả về true
 * khi hắn đang chạy (không đánh nữa).
 */
function stepToDinh(battle: Battle, f: Fighter, dt: number): boolean {
  if (f.state !== 'flee' && f.hp > f.maxHp * TO_DINH_FLEE.at) return false;
  f.state = 'flee';
  if (stunned(f, dt)) return true;
  // Bãi có vật cản: đường thẳng về cuối bãi vướng thì lần theo bản đồ đường rút.
  const nav = navOf(battle);
  if (nav) walkField(nav, f, 'rut', f.x, 0, 0, dt, TO_DINH_FLEE.speed);
  else moveToward(f, f.x, 0, dt, TO_DINH_FLEE.speed, geoOf(battle));
  if (f.z <= 0.4) {
    f.state = 'gone';
    battle.killed++;
    emit(battle, { kind: 'escape', x: f.x, z: f.z });
  }
  return true;
}

/**
 * Mã Viện ra Lệnh nỏ: lần đầu sau `first` giây, rồi cứ `every` giây, một loạt tên nỏ bay tới chỗ quân ta đứng đông
 * nhất, `delay` giây sau thì rơi xuống: mỗi người ta trong `radius` ô chịu `dmg` sát thương.
 */
function stepMaVien(battle: Battle, f: Fighter, dt: number): void {
  const v = (f.volley ??= { next: MA_VIEN_VOLLEY.first });
  const g = geoOf(battle);
  if (v.land !== undefined) {
    v.land -= dt;
    if (v.land <= 0) {
      const tx = v.tx!;
      const tz = v.tz!;
      for (const o of battle.fighters) {
        if (o.side !== 'ta' || !isAlive(o)) continue;
        if (dist(o.x - tx, o.z - tz) <= MA_VIEN_VOLLEY.radius * g) damageFighter(battle, { kind: f.kind, dmg: MA_VIEN_VOLLEY.dmg }, o);
      }
      emit(battle, { kind: 'barrageHit', x: tx, z: tz });
      v.land = undefined;
    }
  }
  v.next -= dt;
  if (v.next > 0 || (f.stun ?? 0) > 0) return;
  const at = densest(battle, MA_VIEN_VOLLEY.radius * g, 'ta');
  if (!at) return;
  v.next = MA_VIEN_VOLLEY.every;
  v.land = MA_VIEN_VOLLEY.delay;
  v.tx = at.x;
  v.tz = at.z;
  f.face = Math.atan2(at.x - f.x, at.z - f.z);
  f.swing = 0.3;
  emit(battle, { kind: 'barrage', x: f.x, z: f.z, tx: at.x, tz: at.z });
}

/** Thủy Tinh làm phép: hô mưa gọi gió (sóng quét đẩy lùi quân ta) và gọi thủy quái lên đánh tiếp. */
function stepThuyTinh(battle: Battle, f: Fighter, dt: number): void {
  const spell = (f.spell ??= { wave: TT_WAVE.first, summon: TT_SUMMON.first, summoned: 0 });
  if (f.stun && f.stun > 0) return;
  spell.wave -= dt;
  spell.summon -= dt;
  const foe = nearestEnemyOf(battle, f);
  if (spell.wave <= 0 && foe) {
    const d = dist(foe.x - f.x, foe.z - f.z);
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
        pushTo(battle, o, clampField(o.x + dx * TT_WAVE.push, FIELD.w), clampField(o.z + dz * TT_WAVE.push, FIELD.d));
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
      const t = newFighter(battle, 'giac', 'tomBinh', clampField(f.x + dsin(a) * 1.1, FIELD.w), clampField(f.z + dcos(a) * 1.1, FIELD.d), hp);
      placeFree(battle, t);
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
  if ((battle.mode === 'field' || battle.mode === 'pvp') && !battle.outcome) battle.outcome = 'retreat';
}

/** Tướng đang đứng trong trận (chưa kiệt sức). */
export function heroOf(battle: Battle): Fighter | undefined {
  return battle.fighters.find((f) => f.side === 'ta' && isHero(f.kind) && isAlive(f));
}

/**
 * Chỗ đứng đông nhất của phe `side` (mặc định là giặc): người có nhiều đồng đội quanh mình trong bán kính `r` nhất.
 * Lâu thuyền dưới sông không tính.
 */
function densest(battle: Battle, r: number, side: Side = 'giac'): Fighter | null {
  let best: Fighter | null = null;
  let bestN = -1;
  for (const f of battle.fighters) {
    if (f.side !== side || !isAlive(f) || f.kind === 'lauThuyen') continue;
    let n = 0;
    for (const o of battle.fighters) if (o.side === side && isAlive(o) && dist(o.x - f.x, o.z - f.z) <= r) n++;
    if (n > bestN) {
      bestN = n;
      best = f;
    }
  }
  return best;
}

/** Mọi kỹ năng tướng loại này có thể có (đã mở hết). */
const allSkillsOf = (kind: HeroKind) =>
  heroSkills({ kind, bamboo: true, glow: false, non: true, kimQuy: true, lenhBan: true, hieuTrieu: true });

/** Tướng đang đứng trong trận làm được kỹ năng này (Hai Bà mỗi bà một kỹ năng). */
export function skillOwner(battle: Battle, skill: SkillId): Fighter | undefined {
  return battle.fighters.find((f) => f.side === 'ta' && isHero(f.kind) && isAlive(f) && allSkillsOf(f.kind).includes(skill));
}

export function skillReady(battle: Battle, skill: SkillId): boolean {
  if (battle.outcome || !battle.skills.includes(skill) || (battle.skillCd[skill] ?? 0) > 0) return false;
  if (skill === 'trongTran') return alliesLeft(battle) > 0;
  // Kỹ năng nhắm giặc trên bờ: chỉ còn lâu thuyền dưới sông thì chưa bấm được.
  return !!skillOwner(battle, skill) && battle.fighters.some((f) => f.side === 'giac' && isAlive(f) && f.kind !== 'lauThuyen');
}

/** Bấm kỹ năng. Trả về false khi kỹ năng chưa hồi, không có trong trận này, hoặc trận đã xong. */
export function useSkill(battle: Battle, skill: SkillId): boolean {
  if (!skillReady(battle, skill)) return false;
  const def = SKILLS[skill];
  battle.skillCd[skill] = def.cooldown;
  // Ngoài bãi mọi người bền hơn, nên đòn kỹ năng cũng mạnh lên tương ứng.
  const scale = (battle.mode === 'field' ? FIELD.hpMul : (battle.hpMul ?? 1)) * (1 + battle.bonus + (battle.huan?.tuong ?? 0) * HUAN_BONUS);
  const g = geoOf(battle);
  // Tướng làm kỹ năng (Trống trận là của Lạc tướng, không cần tướng đứng trên bãi).
  const hero = skillOwner(battle, skill)!;
  if (skill === 'trongTran') {
    battle.rally = def.duration;
    const allies = battle.fighters.filter((f) => f.side === 'ta' && isAlive(f));
    const x = allies.reduce((s, f) => s + f.x, 0) / allies.length;
    const z = allies.reduce((s, f) => s + f.z, 0) / allies.length;
    emit(battle, { kind: 'rally', x, z });
  } else if (skill === 'phunLua') {
    // Ngựa sắt phun lửa: lao về phía giặc gần nhất, đốt mọi tên giặc trong dải lửa.
    const target = nearestEnemyOf(battle, hero)!;
    const d = dist(target.x - hero.x, target.z - hero.z) || 1;
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
    // Bãi có vật cản: ngựa sắt lao tới mép vật cản thì dừng, dải lửa vẫn cháy đủ dài.
    pushTo(
      battle,
      hero,
      clampField(hero.x + dx * FIRE.length * g * 0.8, battle.mode === 'field' ? FIELD.w : RIVER_START),
      clampField(hero.z + dz * FIRE.length * g * 0.8, battle.mode === 'field' ? FIELD.d : RIVER_START),
    );
    hero.face = Math.atan2(dx, dz);
    emit(battle, { kind: 'fire', x: fromX, z: fromZ, tx: hero.x, tz: hero.z });
  } else if (skill === 'nhoTre') {
    // Nhổ tre quật giặc: đòn diện rộng quanh Gióng, giặc bị hất lùi ra.
    for (const o of battle.fighters) {
      if (o.side === 'ta' || !isAlive(o) || !reaches('giong', o)) continue;
      const d = dist(o.x - hero.x, o.z - hero.z);
      if (d > SMASH.radius * g) continue;
      damageFighter(battle, { kind: 'giong', dmg: SMASH.dmg * scale }, o);
      if (d > 1e-6 && isAlive(o)) {
        const nx = o.x + ((o.x - hero.x) / d) * SMASH.push * g;
        const nz = o.z + ((o.z - hero.z) / d) * SMASH.push * g;
        // Bãi phẳng giữ như cũ (bước sau mới kẹp vào bãi); bãi có vật cản thì hất tới mép vật cản.
        if (navOf(battle)) pushTo(battle, o, clampField(nx, FIELD.w), clampField(nz, FIELD.d));
        else {
          o.x = nx;
          o.z = nz;
        }
      }
    }
    hero.swing = 0.3;
    emit(battle, { kind: 'smash', x: hero.x, z: hero.z });
  } else if (skill === 'bocDoi') {
    // Bốc đồi: Sơn Tinh nhấc một quả đồi ném xuống chỗ giặc đứng đông nhất.
    const at = densest(battle, HILL.radius * g)!;
    const cx = at.x;
    const cz = at.z;
    for (const o of battle.fighters) {
      if (o.side === 'ta' || !isAlive(o)) continue;
      if (dist(o.x - cx, o.z - cz) <= HILL.radius * g) damageFighter(battle, { kind: 'sonTinh', dmg: HILL.dmg * scale }, o);
    }
    hero.face = Math.atan2(cx - hero.x, cz - hero.z);
    hero.swing = 0.3;
    emit(battle, { kind: 'hill', x: hero.x, z: hero.z, tx: cx, tz: cz });
  } else if (skill === 'noThan') {
    // Nỏ thần: một phát tên bay ra hóa muôn mũi, trúng mọi kẻ địch còn đứng trên bãi.
    for (const o of battle.fighters) {
      if (o.side === 'ta' || !isAlive(o)) continue;
      damageFighter(battle, { kind: 'anDuong', dmg: NO_THAN.dmg * scale }, o);
    }
    const foe = nearestEnemyOf(battle, hero);
    if (foe) hero.face = Math.atan2(foe.x - hero.x, foe.z - hero.z);
    hero.swing = 0.3;
    emit(battle, { kind: 'volley', x: hero.x, z: hero.z });
  } else if (skill === 'lienChau') {
    // Nỏ liên châu: Cao Lỗ bắn một loạt tên rơi xuống chỗ giặc đứng đông nhất.
    const at = densest(battle, LIEN_CHAU.radius * g)!;
    const cx = at.x;
    const cz = at.z;
    for (const o of battle.fighters) {
      if (o.side === 'ta' || !isAlive(o)) continue;
      if (dist(o.x - cx, o.z - cz) <= LIEN_CHAU.radius * g) damageFighter(battle, { kind: 'caoLo', dmg: LIEN_CHAU.dmg * scale }, o);
    }
    hero.face = Math.atan2(cx - hero.x, cz - hero.z);
    hero.swing = 0.3;
    emit(battle, { kind: 'rain', x: hero.x, z: hero.z, tx: cx, tz: cz });
  } else if (skill === 'lenhBan') {
    // Lệnh bắn: Cao Lỗ thổi tù và, lính nỏ (giữ kinh đô thì cả ụ nỏ, lầu nỏ) bắn nhanh hơn trong một lúc.
    battle.lenh = def.duration;
    hero.swing = 0.3;
    emit(battle, { kind: 'order', x: hero.x, z: hero.z });
  } else if (skill === 'ruaVang') {
    // Rùa Vàng nổi lên che chở: quân ta hồi máu, chỉ chịu một phần sát thương trong một lúc.
    battle.shield = def.duration;
    for (const o of battle.fighters) {
      if (o.side !== 'ta' || !isAlive(o)) continue;
      o.hp = Math.min(o.maxHp, o.hp + o.maxHp * KIM_QUY.heal);
    }
    hero.swing = 0.3;
    emit(battle, { kind: 'shield', x: hero.x, z: hero.z });
  } else if (skill === 'voiXung') {
    // Voi xung trận: voi Trưng Trắc lao thẳng về phía giặc đứng đông nhất, húc dạt giặc trên đường sang hai bên.
    const at = densest(battle, 2 * g)!;
    const d = dist(at.x - hero.x, at.z - hero.z) || 1;
    const dx = (at.x - hero.x) / d;
    const dz = (at.z - hero.z) / d;
    const len = VOI_XUNG.length * g;
    for (const o of battle.fighters) {
      if (o.side === 'ta' || !isAlive(o) || !reaches('trungTrac', o)) continue;
      const along = (o.x - hero.x) * dx + (o.z - hero.z) * dz;
      const across = (o.x - hero.x) * dz - (o.z - hero.z) * dx;
      if (along < -0.3 || along > len || Math.abs(across) > (VOI_XUNG.width * g) / 2) continue;
      damageFighter(battle, { kind: 'trungTrac', dmg: VOI_XUNG.dmg * scale }, o);
      if (!isAlive(o)) continue;
      const side = across >= 0 ? 1 : -1;
      const nx = o.x + dz * side * VOI_XUNG.push * g;
      const nz = o.z - dx * side * VOI_XUNG.push * g;
      if (navOf(battle)) pushTo(battle, o, clampField(nx, FIELD.w), clampField(nz, FIELD.d));
      else {
        o.x = nx;
        o.z = nz;
      }
      o.stun = Math.max(o.stun ?? 0, VOI_XUNG.stun);
    }
    const fromX = hero.x;
    const fromZ = hero.z;
    const maxX = battle.mode === 'field' ? FIELD.w : RIVER_START;
    const maxZ = battle.mode === 'field' ? FIELD.d : RIVER_START;
    pushTo(battle, hero, clampField(hero.x + dx * len, maxX), clampField(hero.z + dz * len, maxZ));
    hero.face = Math.atan2(dx, dz);
    hero.swing = 0.3;
    emit(battle, { kind: 'charge', x: fromX, z: fromZ, tx: hero.x, tz: hero.z });
  } else if (skill === 'hieuTrieu') {
    // Hiệu triệu: nghĩa binh chạy ra quanh voi Trưng Nhị (bù cho đủ số người), quân ta quanh voi hồi máu.
    const alive = battle.fighters.filter((f) => f.kind === 'nghiaBinh' && isAlive(f)).length;
    const n = Math.max(0, HIEU_TRIEU.count - alive);
    const hpMul = battle.mode === 'field' ? FIELD.hpMul : (battle.hpMul ?? 1);
    const maxX = battle.mode === 'field' ? FIELD.w : RIVER_START;
    const maxZ = battle.mode === 'field' ? FIELD.d : RIVER_START;
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + battle.t;
      const x = clampField(hero.x + dsin(a) * 0.9 * g, maxX);
      const z = clampField(hero.z + dcos(a) * 0.9 * g, maxZ);
      const f = newFighter(battle, 'ta', 'nghiaBinh', x, z, NGHIA_BINH.hp * hpMul);
      f.face = hero.face;
      placeFree(battle, f);
      battle.fighters.push(f);
    }
    for (const o of battle.fighters) {
      if (o.side !== 'ta' || !isAlive(o)) continue;
      if (dist(o.x - hero.x, o.z - hero.z) <= HIEU_TRIEU.radius * g) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * HIEU_TRIEU.heal);
    }
    hero.swing = 0.3;
    emit(battle, { kind: 'call', x: hero.x, z: hero.z });
  } else {
    // Dời non: đá mọc lên dưới chân mọi kẻ địch quanh Sơn Tinh, giữ chân chúng vài giây.
    for (const o of battle.fighters) {
      if (o.side === 'ta' || !isAlive(o) || !reaches('sonTinh', o)) continue;
      if (dist(o.x - hero.x, o.z - hero.z) > ROCKS.radius * g) continue;
      damageFighter(battle, { kind: 'sonTinh', dmg: ROCKS.dmg * scale }, o);
      if (isAlive(o)) o.stun = ROCKS.stun;
    }
    hero.swing = 0.3;
    emit(battle, { kind: 'rocks', x: hero.x, z: hero.z });
  }
  return true;
}
