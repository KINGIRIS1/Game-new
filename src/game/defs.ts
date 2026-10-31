// Mọi con số cân bằng game nằm ở đây để dễ tinh chỉnh bằng test.

export const RESOURCE_IDS = ['gao', 'voOc', 'datDa', 'sat'] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];
export type Resources = Record<ResourceId, number>;
export type Cost = Partial<Resources>;

export type BuildingType =
  | 'dien'
  | 'ruong'
  | 'ben'
  | 'luy'
  | 'nhaSan'
  | 'baiDa'
  | 'loRen'
  | 'kho'
  | 'doanhTrai'
  | 'choiCanh'
  | 'bayChong'
  | 'denPhuDong'
  | 'de'
  | 'denTanVien';

/** Mốc mở khóa theo cốt truyện: sau kết chương 1, khi vào chương 2, sau kết chương 2. */
export type Unlock = 'ketChuong1' | 'chuong2' | 'ketChuong2';

export interface BuildingDef {
  type: BuildingType;
  w: number;
  d: number;
  maxLevel: number;
  /** Giá để có công trình ở cấp 1. */
  buildCost: Cost;
  /** Giá để nâng lên cấp `level`, chỉ số là cấp đích (phần tử 0 và 1 không dùng). */
  upgradeCost: Cost[];
  /** Sản lượng mỗi phút khi đủ người làm, chỉ số 0 là cấp 1. */
  production: Cost[];
  /** Số chỗ làm theo cấp. Không có nghĩa là công trình tự sản xuất, không cần người. */
  workers?: number[];
  /** Số dân công trình cho ở, theo cấp. */
  housing?: number[];
  /** Sức chứa cộng thêm cho mỗi loại tài nguyên, theo cấp. */
  storage?: number[];
  /** Sức chứa quân (tính theo chỗ, voi chiến chiếm nhiều chỗ), theo cấp. */
  troopCap?: number[];
  /** Máu khi giặc đánh, theo cấp. */
  hp: number[];
  /** Số công trình tối đa theo cấp Điện Vua Hùng, chỉ số 0 là cấp 1. */
  limit: number[];
  /** Cấp Điện tối thiểu để xây. */
  minDien: number;
  /** Cấp Điện tối thiểu để lên từng cấp (chỉ số là cấp đích), nếu khác quy tắc "không vượt cấp Điện". */
  levelMinDien?: number[];
  /** Phải có ít nhất một ô sát bờ sông. */
  nearRiver?: boolean;
  /** Người chơi được tự xây (Điện Vua Hùng có sẵn từ đầu). */
  buildable: boolean;
  removable: boolean;
  /** Chỉ xây được từ mốc truyện này. */
  unlock?: Unlock;
}

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  dien: {
    type: 'dien',
    w: 4,
    d: 4,
    maxLevel: 5,
    buildCost: {},
    upgradeCost: [
      {},
      {},
      { gao: 250, voOc: 150 },
      { gao: 450, voOc: 250, datDa: 150 },
      { gao: 800, voOc: 700, datDa: 400, sat: 60 },
      { gao: 1400, voOc: 1300, datDa: 800, sat: 160 },
    ],
    production: [
      { gao: 4, voOc: 2 },
      { gao: 6, voOc: 3 },
      { gao: 8, voOc: 4 },
      { gao: 10, voOc: 5 },
      { gao: 12, voOc: 6 },
    ],
    housing: [4, 5, 6, 7, 8],
    hp: [700, 850, 1000, 1200, 1400],
    limit: [1, 1, 1, 1, 1],
    minDien: 1,
    buildable: false,
    removable: false,
  },
  ruong: {
    type: 'ruong',
    w: 3,
    d: 3,
    maxLevel: 5,
    buildCost: { voOc: 30 },
    upgradeCost: [
      {},
      {},
      { voOc: 40 },
      { voOc: 90, datDa: 30 },
      { voOc: 200, datDa: 120 },
      { voOc: 420, datDa: 260 },
    ],
    production: [{ gao: 19 }, { gao: 32 }, { gao: 50 }, { gao: 75 }, { gao: 110 }],
    workers: [2, 3, 3, 4, 4],
    hp: [150, 170, 190, 210, 230],
    limit: [2, 3, 4, 5, 6],
    minDien: 1,
    buildable: true,
    removable: false,
  },
  ben: {
    type: 'ben',
    w: 2,
    d: 2,
    maxLevel: 5,
    buildCost: { gao: 50 },
    upgradeCost: [
      {},
      {},
      { gao: 60, datDa: 20 },
      { gao: 120, datDa: 60 },
      { gao: 250, datDa: 150 },
      { gao: 500, datDa: 300 },
    ],
    production: [{ voOc: 20 }, { voOc: 35 }, { voOc: 52 }, { voOc: 78 }, { voOc: 112 }],
    workers: [1, 2, 2, 3, 3],
    hp: [160, 180, 200, 220, 240],
    limit: [2, 2, 3, 3, 4],
    minDien: 1,
    nearRiver: true,
    buildable: true,
    removable: false,
  },
  luy: {
    type: 'luy',
    w: 1,
    d: 1,
    maxLevel: 2,
    buildCost: { voOc: 4 },
    // Cấp 2 là thành đất đắp, chắc hơn lũy tre nhiều.
    upgradeCost: [{}, {}, { datDa: 20 }],
    production: [{}, {}],
    hp: [120, 420],
    limit: [30, 50, 70, 90, 110],
    minDien: 1,
    levelMinDien: [0, 0, 3],
    buildable: true,
    removable: true,
  },
  nhaSan: {
    type: 'nhaSan',
    w: 2,
    d: 2,
    maxLevel: 5,
    buildCost: { gao: 30, voOc: 20 },
    upgradeCost: [
      {},
      {},
      { voOc: 50, datDa: 20 },
      { voOc: 100, datDa: 70 },
      { voOc: 200, datDa: 160 },
      { voOc: 380, datDa: 320 },
    ],
    production: [{}, {}, {}, {}, {}],
    housing: [4, 6, 8, 10, 12],
    hp: [160, 180, 200, 220, 240],
    limit: [1, 2, 3, 4, 5],
    minDien: 1,
    buildable: true,
    removable: false,
  },
  baiDa: {
    type: 'baiDa',
    w: 2,
    d: 2,
    maxLevel: 5,
    buildCost: { gao: 40, voOc: 30 },
    upgradeCost: [
      {},
      {},
      { gao: 30, voOc: 60 },
      { gao: 60, voOc: 120 },
      { gao: 120, voOc: 250 },
      { gao: 240, voOc: 500 },
    ],
    production: [{ datDa: 19 }, { datDa: 32 }, { datDa: 50 }, { datDa: 72 }, { datDa: 105 }],
    workers: [2, 2, 3, 3, 4],
    hp: [180, 200, 220, 240, 260],
    limit: [1, 2, 3, 3, 4],
    minDien: 1,
    buildable: true,
    removable: false,
  },
  loRen: {
    type: 'loRen',
    w: 2,
    d: 2,
    maxLevel: 5,
    buildCost: { voOc: 60, datDa: 60 },
    upgradeCost: [
      {},
      {},
      { voOc: 80, datDa: 80 },
      { voOc: 160, datDa: 180 },
      { voOc: 320, datDa: 350 },
      { voOc: 640, datDa: 700 },
    ],
    production: [{ sat: 5 }, { sat: 9 }, { sat: 14 }, { sat: 20 }, { sat: 29 }],
    workers: [1, 2, 2, 3, 3],
    hp: [200, 220, 240, 260, 280],
    limit: [0, 1, 1, 2, 2],
    minDien: 2,
    buildable: true,
    removable: false,
  },
  kho: {
    type: 'kho',
    w: 2,
    d: 2,
    maxLevel: 5,
    buildCost: { voOc: 40, datDa: 40 },
    upgradeCost: [
      {},
      {},
      { voOc: 80, datDa: 100 },
      { voOc: 160, datDa: 200 },
      { voOc: 320, datDa: 400 },
      { voOc: 640, datDa: 800 },
    ],
    production: [{}, {}, {}, {}, {}],
    storage: [500, 1000, 1500, 2500, 4000],
    hp: [300, 360, 420, 480, 540],
    limit: [1, 1, 2, 2, 3],
    minDien: 1,
    buildable: true,
    removable: false,
  },
  doanhTrai: {
    type: 'doanhTrai',
    w: 3,
    d: 3,
    maxLevel: 5,
    buildCost: { gao: 80, voOc: 60, datDa: 60 },
    upgradeCost: [
      {},
      {},
      { gao: 120, voOc: 100, datDa: 120, sat: 20 },
      { gao: 250, voOc: 200, datDa: 250, sat: 60 },
      { gao: 500, voOc: 400, datDa: 500, sat: 120 },
      { gao: 1000, voOc: 800, datDa: 1000, sat: 240 },
    ],
    production: [{}, {}, {}, {}, {}],
    troopCap: [8, 14, 20, 28, 38],
    hp: [400, 460, 520, 600, 700],
    limit: [0, 1, 1, 1, 1],
    minDien: 2,
    buildable: true,
    removable: false,
  },
  choiCanh: {
    type: 'choiCanh',
    w: 1,
    d: 1,
    maxLevel: 5,
    buildCost: { voOc: 40, datDa: 40 },
    upgradeCost: [
      {},
      {},
      { voOc: 60, datDa: 60 },
      { voOc: 120, datDa: 120, sat: 20 },
      { voOc: 240, datDa: 240, sat: 40 },
      { voOc: 480, datDa: 480, sat: 80 },
    ],
    production: [{}, {}, {}, {}, {}],
    hp: [180, 220, 270, 330, 400],
    limit: [0, 2, 3, 4, 5],
    minDien: 2,
    buildable: true,
    removable: false,
  },
  bayChong: {
    type: 'bayChong',
    w: 1,
    d: 1,
    maxLevel: 1,
    buildCost: { voOc: 10, datDa: 10 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [1],
    limit: [0, 4, 6, 8, 10],
    minDien: 2,
    buildable: true,
    removable: true,
  },
  denPhuDong: {
    type: 'denPhuDong',
    w: 3,
    d: 3,
    maxLevel: 1,
    buildCost: { gao: 600, voOc: 600, datDa: 500, sat: 150 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [700],
    limit: [1, 1, 1, 1, 1],
    minDien: 1,
    buildable: true,
    removable: false,
    unlock: 'ketChuong1',
  },
  de: {
    type: 'de',
    w: 1,
    d: 1,
    maxLevel: 2,
    buildCost: { datDa: 15 },
    // Cấp 2 là kè đá: cao hơn, chắc hơn.
    upgradeCost: [{}, {}, { datDa: 40, voOc: 20 }],
    production: [{}, {}],
    hp: [600, 1500],
    limit: [90, 90, 90, 90, 90],
    minDien: 1,
    buildable: true,
    removable: true,
    unlock: 'chuong2',
  },
  denTanVien: {
    type: 'denTanVien',
    w: 3,
    d: 3,
    maxLevel: 1,
    buildCost: { gao: 1500, voOc: 1500, datDa: 1500, sat: 400 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [900],
    limit: [1, 1, 1, 1, 1],
    minDien: 1,
    buildable: true,
    removable: false,
    unlock: 'ketChuong2',
  },
};

// ---------- Độ cao ô đất và lũ ----------

/** Ô đất cao nhất đắp được. Đất tự nhiên cao tới bậc 3. */
export const MAX_HEIGHT = 4;
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
/** Đắp một ô đất trống lên thêm một bậc, giá theo bậc hiện tại của ô. */
export const raiseTileCost = (h: number): Cost => ({ datDa: 20 + 10 * h });
/** Đắp nền cả một công trình lên thêm một bậc, giá theo diện tích móng và bậc hiện tại. */
export const raiseBuildingCost = (w: number, d: number, h: number): Cost => ({ datDa: round5(8 * w * d * (h + 1)) });
/** Đê cao hơn mặt đất dưới chân chừng này bậc: đê đất ở cấp 1, kè đá ở cấp 2. */
export const DIKE_RAISE = [2, 3];
/**
 * Công trình chịu được nước ngập bao nhiêu bậc mà không hư. Điện, nhà sàn, kho dựng trên cột,
 * đền xây trên nền đá: chịu được 1 bậc. Bến, lũy, bẫy, đê không sợ nước. Còn lại ngập là hư.
 */
export const FLOOD_TOLERANCE: Partial<Record<BuildingType, number>> = {
  dien: 1,
  nhaSan: 1,
  kho: 1,
  denPhuDong: 1,
  denTanVien: 1,
  ben: 99,
  luy: 99,
  bayChong: 99,
  de: 99,
};
/** Nước lũ dâng mỗi bậc trong chừng này giây. */
export const FLOOD_RISE_S = 6;
/** Xong trận thì nước rút hết trong chừng này giây (chỉ để vẽ, công trình không hư thêm). */
export const FLOOD_RECEDE_S = 8;
/** Mùa lũ đầu tiên tới sau đám cưới chừng này thời gian chơi. */
export const FIRST_FLOOD_MS = 3 * 60_000;

/** Mực lũ (bậc) của mùa lũ thứ `n`. Đền Tản Viên còn nguyên thì lũ dâng thấp đi một bậc. */
export function floodLevel(n: number, temple: boolean): number {
  const level = n <= 2 ? 1 : n <= 4 ? 2 : 3;
  return Math.max(1, level - (temple ? 1 : 0));
}

/** Thủy quái theo mùa lũ thứ `n` (bắt đầu từ 1). */
export function floodForces(n: number): Partial<Record<EnemyType, number>> {
  return {
    tomBinh: Math.min(6 + n, 16),
    caPhun: Math.min(1 + n, 10),
    caSau: Math.min(Math.floor((n + 1) / 2), 6),
  };
}

/** Thủy quái các mùa sau khỏe hơn. */
export const floodHpScale = (n: number) => 1.3 + 0.12 * (n - 1);

/** Đền Phù Đổng (còn nguyên) cộng thêm phần này vào sản lượng mọi tài nguyên, và vào máu, sát thương của quân ta. */
export const TEMPLE_BONUS = 0.1;

/** Sức chứa mỗi loại tài nguyên theo cấp Điện Vua Hùng, chỉ số 0 là cấp 1. Kho thóc cộng thêm. */
export const STORAGE_CAP = [500, 1000, 2000, 4000, 8000];

export const START_RESOURCES: Resources = { gao: 150, voOc: 120, datDa: 0, sat: 0 };
export const START_DAN = 4;

/** Mỗi người dân ăn chừng này gạo mỗi phút. */
export const GAO_PER_DAN = 0.4;
/** Cứ chừng này mili giây lại có thêm một người dân, nếu nhà còn chỗ và không thiếu gạo. */
export const DAN_GROW_MS = 30_000;
/** Thiếu gạo thì mọi việc sản xuất chậm còn chừng này. */
export const STARVING_RATE = 0.5;

/** Khi vắng mặt: sản xuất với tốc độ này, cộng dồn tối đa OFFLINE_CAP_MS. */
export const OFFLINE_RATE = 0.5;
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;

/** Thuyền buôn: lần đầu sau chừng này thời gian chơi, rồi định kỳ, mỗi lần đậu một lúc. */
export const MERCHANT_FIRST_MS = 2 * 60_000;
export const MERCHANT_EVERY_MS = 5 * 60_000;
export const MERCHANT_STAY_MS = 90_000;
/** Giá trị quy đổi giữa các tài nguyên khi thuyền buôn ra giá. */
export const TRADE_VALUE: Resources = { gao: 1, voOc: 1.4, datDa: 1.2, sat: 3 };
/** Thuyền buôn trả hơn giá trị thật chừng này để người chơi thấy đáng đổi. */
export const TRADE_BONUS = 1.15;

// ---------- Quân đội và giặc ----------

export type UnitType = 'giao' | 'cung' | 'voi';
export type EnemyType =
  | 'giaoAn'
  | 'cungAn'
  | 'chienXa'
  | 'phoTuong'
  | 'daiTuong'
  | 'tomBinh'
  | 'caPhun'
  | 'caSau'
  | 'thuongLuong'
  | 'thuyTinh';
export const UNIT_TYPES: UnitType[] = ['giao', 'cung', 'voi'];

export interface FighterStats {
  hp: number;
  dmg: number;
  /** Tầm đánh, tính bằng ô. */
  range: number;
  /** Tốc độ, ô mỗi giây. */
  speed: number;
  /** Thời gian giữa hai đòn, giây. */
  cooldown: number;
  /** Đánh mạnh gấp đôi những loại này (vòng khắc chế). */
  strongVs?: (UnitType | EnemyType)[];
}

export interface UnitDef extends FighterStats {
  cost: Cost;
  /** Cấp doanh trại cần có. */
  barracksLevel: number;
  /** Số chỗ chiếm trong doanh trại. Lính tuyển riêng, không lấy người từ dân. */
  space: number;
  /** Gạo ăn mỗi phút. */
  upkeep: number;
}

/**
 * Quân ta: giáo binh thắng quân nặng (chiến xa, cá sấu), cung thủ thắng lính bộ (lính giáo Ân, tôm binh),
 * voi chiến thắng quân bắn xa (cung thủ Ân, cá phun nước).
 */
export const UNITS: Record<UnitType, UnitDef> = {
  giao: { hp: 60, dmg: 8, range: 0.8, speed: 1.6, cooldown: 1.0, strongVs: ['chienXa', 'caSau'], cost: { gao: 20, voOc: 8 }, barracksLevel: 1, space: 1, upkeep: 0.6 },
  cung: { hp: 40, dmg: 7, range: 3.8, speed: 1.5, cooldown: 1.2, strongVs: ['giaoAn', 'tomBinh'], cost: { gao: 25, voOc: 8, sat: 4 }, barracksLevel: 2, space: 1, upkeep: 0.6 },
  voi: { hp: 200, dmg: 15, range: 0.9, speed: 1.1, cooldown: 1.5, strongVs: ['cungAn', 'caPhun'], cost: { gao: 60, voOc: 20, sat: 12 }, barracksLevel: 3, space: 3, upkeep: 1.5 },
};

/** Giặc Ân: lính giáo, cung thủ và chiến xa (xe ngựa chiến, quân nặng). Phó tướng làm trùm ở phó bản. */
export const ENEMIES: Record<EnemyType, FighterStats> = {
  giaoAn: { hp: 75, dmg: 9, range: 0.8, speed: 1.4, cooldown: 1.0 },
  cungAn: { hp: 45, dmg: 8, range: 3.5, speed: 1.3, cooldown: 1.3 },
  chienXa: { hp: 230, dmg: 20, range: 0.9, speed: 2.0, cooldown: 1.4, strongVs: ['cung'] },
  phoTuong: { hp: 600, dmg: 24, range: 1.0, speed: 1.2, cooldown: 1.3 },
  daiTuong: { hp: 1100, dmg: 30, range: 1.1, speed: 1.2, cooldown: 1.3 },
  // Thủy quái của Thủy Tinh: tôm binh cầm giáo, cá phun nước bắn xa, cá sấu lao nhanh.
  tomBinh: { hp: 85, dmg: 10, range: 0.8, speed: 1.5, cooldown: 1.0 },
  caPhun: { hp: 50, dmg: 9, range: 3.6, speed: 1.3, cooldown: 1.3 },
  caSau: { hp: 260, dmg: 22, range: 0.9, speed: 2.0, cooldown: 1.4, strongVs: ['cung'] },
  thuongLuong: { hp: 750, dmg: 26, range: 1.2, speed: 1.3, cooldown: 1.3 },
  thuyTinh: { hp: 1400, dmg: 32, range: 1.3, speed: 1.2, cooldown: 1.2 },
};

/** Trùm của phó bản: phó tướng ở màn 4, đại tướng ở chân núi Trâu, thuồng luồng ở màn 12, Thủy Tinh ở đỉnh Tản Viên. */
export const BOSSES: EnemyType[] = ['phoTuong', 'daiTuong', 'thuongLuong', 'thuyTinh'];
/** Thủy quái bơi được dưới sông và chỗ nước ngập. */
export const SWIMMERS: EnemyType[] = ['tomBinh', 'caPhun', 'caSau', 'thuongLuong', 'thuyTinh'];

// ---------- Thánh Gióng ----------

/** Gạo góp nuôi Gióng ở từng mốc (5 mốc). */
export const GIONG_FEED = [80, 150, 250, 400, 600];

export type GearId = 'ngua' | 'roi' | 'giap';
export const GEAR_IDS: GearId[] = ['ngua', 'roi', 'giap'];
/** Đồ sắt rèn cho Gióng ở lò rèn: giá và cấp lò rèn cần có. */
export const GEAR: Record<GearId, { cost: Cost; forgeLevel: number }> = {
  ngua: { cost: { sat: 40 }, forgeLevel: 1 },
  roi: { cost: { sat: 60 }, forgeLevel: 2 },
  giap: { cost: { sat: 90, datDa: 100 }, forgeLevel: 3 },
};

/** Gióng tráng sĩ cưỡi ngựa sắt: rất khỏe, mỗi đòn quét cả giặc đứng quanh. */
export const GIONG: FighterStats = { hp: 500, dmg: 22, range: 1.0, speed: 2.2, cooldown: 0.9 };
export const GIONG_CLEAVE = { radius: 1.3, share: 0.5 };
/** Gióng không chết, hết sức thì rút khỏi trận và nghỉ chừng này thời gian chơi. */
export const GIONG_REST_MS = 2 * 60_000;
/** Đòn thường của tướng (Gióng, Sơn Tinh) quét cả kẻ địch đứng quanh mục tiêu. */
export const HERO_CLEAVE = GIONG_CLEAVE;
/** Ngựa sắt phun lửa: lao thẳng `length` ô về phía giặc, đốt giặc trong dải rộng `width` ô. */
export const FIRE = { dmg: 60, length: 7, width: 1.5 };
/** Nhổ tre quật giặc: đòn diện rộng quanh Gióng, hất giặc lùi ra. */
export const SMASH = { dmg: 45, radius: 2.5, push: 1.2 };

// ---------- Sơn Tinh và lễ vật ----------

/** Sơn Tinh, chúa vùng non cao: khỏe như Gióng, cầm gậy thần, mỗi đòn làm rung đất quanh mục tiêu. */
export const SON: FighterStats = { hp: 560, dmg: 20, range: 1.1, speed: 1.9, cooldown: 1.0 };
export const SON_REST_MS = 2 * 60_000;
/** Bốc đồi: nhấc một quả đồi ném xuống chỗ giặc đứng đông nhất. */
export const HILL = { dmg: 70, radius: 2.2 };
/** Dời non: đá mọc lên dưới chân mọi kẻ địch quanh Sơn Tinh, giữ chân chúng vài giây. */
export const ROCKS = { dmg: 30, radius: 4, stun: 3 };

export type GiftId = 'comNep' | 'banhChung' | 'voi9Nga' | 'ga9Cua' | 'ngua9HongMao';
/** Lễ vật thách cưới, theo thứ tự trong truyện. */
export const GIFT_IDS: GiftId[] = ['comNep', 'banhChung', 'voi9Nga', 'ga9Cua', 'ngua9HongMao'];
/** Lễ vật làm ở kinh đô (có giá), hoặc giành được khi thắng lần đầu một màn phó bản chương 2. */
export const GIFTS: Record<GiftId, { cost?: Cost; stage?: number }> = {
  comNep: { cost: { gao: 900 } },
  banhChung: { cost: { gao: 700, voOc: 400 } },
  voi9Nga: { stage: 11 },
  ga9Cua: { stage: 9 },
  ngua9HongMao: { stage: 10 },
};

/** Chòi canh tự bắn giặc trong tầm. */
export const TOWER = { range: 4.5, cooldown: 1.1, dmg: [7, 9, 12, 15, 19] };
/** Bẫy chông: sát thương một lần mỗi đợt giặc. */
export const TRAP_DMG = 45;

/** Đợt giặc đầu tiên đến sau khi có doanh trại chừng này thời gian chơi, sau đó định kỳ. */
export const FIRST_RAID_MS = 4 * 60_000;
export const RAID_EVERY_MS = 15 * 60_000;
/** Trinh sát báo trước khi giặc tràn vào. */
export const RAID_WARNING_MS = 60_000;
/** Quá lâu chưa phân thắng bại thì giặc rút. */
export const RAID_MAX_MS = 180_000;
/** Giặc phá được kho hoặc Điện thì cướp đi phần này của mỗi tài nguyên rồi bỏ chạy. */
export const LOOT_FRACTION: Partial<Record<BuildingType, number>> = { kho: 0.15, dien: 0.08 };
/** Giá sửa công trình hư hỏng, tính theo giá xây. */
export const REPAIR_FRACTION = 0.3;

/** Quân số giặc của đợt thứ `wave` (bắt đầu từ 1). */
export function raidForces(wave: number): Partial<Record<EnemyType, number>> {
  return {
    giaoAn: Math.min(3 + wave, 16),
    cungAn: wave >= 2 ? Math.min(wave, 10) : 0,
    chienXa: wave >= 3 ? Math.min(wave - 2, 6) : 0,
  };
}

/** Giặc các đợt sau khỏe hơn. */
export const raidHpScale = (wave: number) => 1 + 0.12 * (wave - 1);

// ---------- Phó bản chương 1 ----------

/** Hàng quân trên bãi chiến: tiền quân đứng đầu, hậu quân đứng sau cùng. */
export type Row = 'tien' | 'trung' | 'hau';
export const ROWS: Row[] = ['tien', 'trung', 'hau'];
/** Hàng mặc định: giáo binh chặn đầu, voi ở giữa, cung thủ bắn từ sau. */
export const DEFAULT_ROWS: Record<UnitType, Row> = { giao: 'tien', voi: 'trung', cung: 'hau' };
export const ENEMY_ROWS: Record<EnemyType, Row> = {
  giaoAn: 'tien',
  chienXa: 'trung',
  cungAn: 'hau',
  phoTuong: 'hau',
  daiTuong: 'hau',
  tomBinh: 'tien',
  caSau: 'trung',
  caPhun: 'hau',
  thuongLuong: 'hau',
  thuyTinh: 'hau',
};

/**
 * Bãi chiến: rộng `w` ô, dài `d` ô; hàng đầu hai bên cách nhau `gap` ô.
 * Ngoài bãi mọi người đều bền hơn `hpMul` lần để trận kéo dài, kịp bấm kỹ năng.
 * Quá `maxS` giây chưa phá được giặc thì coi như thua.
 */
export const FIELD = { w: 9, d: 22, gap: 10, hpMul: 1.6, maxS: 90 };

export type Terrain = 'rung' | 'benSong' | 'lang' | 'don' | 'nui' | 'doi' | 'ngap' | 'tanVien';

export interface StageDef {
  chapter: 1 | 2;
  /** Cấp Điện cần có để đánh màn này. */
  minDien: number;
  /** Cần Thánh Gióng đã vươn vai thành tráng sĩ. */
  needsGiong: boolean;
  /** Cần Sơn Tinh đã rước Mị Nương, cùng ra trận. */
  needsSon?: boolean;
  enemies: Partial<Record<EnemyType, number>>;
  /** Hệ số máu giặc. */
  hpScale: number;
  /** Thưởng lần đầu thắng. Đánh lại được một phần (REPLAY_SHARE). */
  reward: Cost;
  terrain: Terrain;
}

/**
 * Chương 1: tám màn trên đường từ Phong Châu tới chân núi Trâu, màn 4 và màn 8 có trùm.
 * Chương 2: tám màn trên đường lên núi Tản Viên. Màn 9–11 giành lễ vật, màn 12 có thuồng luồng,
 * màn 16 là Thủy Tinh.
 */
export const STAGES: StageDef[] = [
  { chapter: 1, minDien: 2, needsGiong: false, enemies: { giaoAn: 4 }, hpScale: 1, reward: { gao: 150, voOc: 100 }, terrain: 'rung' },
  { chapter: 1, minDien: 2, needsGiong: false, enemies: { giaoAn: 5, cungAn: 2 }, hpScale: 1, reward: { gao: 200, voOc: 150, datDa: 80 }, terrain: 'benSong' },
  { chapter: 1, minDien: 3, needsGiong: false, enemies: { giaoAn: 5, cungAn: 3, chienXa: 1 }, hpScale: 1.1, reward: { gao: 300, voOc: 200, datDa: 150, sat: 40 }, terrain: 'lang' },
  { chapter: 1, minDien: 3, needsGiong: false, enemies: { giaoAn: 5, cungAn: 3, chienXa: 1, phoTuong: 1 }, hpScale: 1.1, reward: { gao: 500, voOc: 300, datDa: 250, sat: 80 }, terrain: 'don' },
  { chapter: 1, minDien: 3, needsGiong: true, enemies: { giaoAn: 9, cungAn: 5, chienXa: 3 }, hpScale: 1.35, reward: { gao: 600, voOc: 400, datDa: 300, sat: 100 }, terrain: 'rung' },
  { chapter: 1, minDien: 4, needsGiong: true, enemies: { giaoAn: 12, cungAn: 7, chienXa: 3 }, hpScale: 1.45, reward: { gao: 800, voOc: 500, datDa: 400, sat: 120 }, terrain: 'benSong' },
  { chapter: 1, minDien: 4, needsGiong: true, enemies: { giaoAn: 10, cungAn: 6, chienXa: 4 }, hpScale: 1.5, reward: { gao: 1000, voOc: 600, datDa: 500, sat: 150 }, terrain: 'lang' },
  { chapter: 1, minDien: 5, needsGiong: true, enemies: { giaoAn: 12, cungAn: 7, chienXa: 4, daiTuong: 1 }, hpScale: 1.6, reward: { gao: 1500, voOc: 1000, datDa: 800, sat: 250 }, terrain: 'nui' },
  { chapter: 2, minDien: 5, needsGiong: false, enemies: { tomBinh: 10, caPhun: 6, caSau: 2 }, hpScale: 2.9, reward: { gao: 1200, voOc: 800, datDa: 600, sat: 150 }, terrain: 'doi' },
  { chapter: 2, minDien: 5, needsGiong: false, enemies: { tomBinh: 11, caPhun: 7, caSau: 3 }, hpScale: 2.8, reward: { gao: 1300, voOc: 900, datDa: 700, sat: 180 }, terrain: 'benSong' },
  { chapter: 2, minDien: 5, needsGiong: false, enemies: { tomBinh: 12, caPhun: 8, caSau: 3 }, hpScale: 2.9, reward: { gao: 1400, voOc: 1000, datDa: 800, sat: 200 }, terrain: 'rung' },
  { chapter: 2, minDien: 5, needsGiong: false, needsSon: true, enemies: { tomBinh: 12, caPhun: 7, caSau: 3, thuongLuong: 1 }, hpScale: 2.4, reward: { gao: 1800, voOc: 1200, datDa: 1000, sat: 260 }, terrain: 'ngap' },
  { chapter: 2, minDien: 5, needsGiong: false, needsSon: true, enemies: { tomBinh: 14, caPhun: 8, caSau: 4 }, hpScale: 2.2, reward: { gao: 2000, voOc: 1300, datDa: 1100, sat: 280 }, terrain: 'lang' },
  { chapter: 2, minDien: 5, needsGiong: false, needsSon: true, enemies: { tomBinh: 14, caPhun: 8, caSau: 4 }, hpScale: 2.3, reward: { gao: 2200, voOc: 1500, datDa: 1200, sat: 300 }, terrain: 'benSong' },
  { chapter: 2, minDien: 5, needsGiong: false, needsSon: true, enemies: { tomBinh: 14, caPhun: 9, caSau: 4 }, hpScale: 2.6, reward: { gao: 2500, voOc: 1700, datDa: 1400, sat: 350 }, terrain: 'nui' },
  { chapter: 2, minDien: 5, needsGiong: false, needsSon: true, enemies: { tomBinh: 12, caPhun: 8, caSau: 3, thuyTinh: 1 }, hpScale: 2.5, reward: { gao: 3000, voOc: 2000, datDa: 2000, sat: 500 }, terrain: 'tanVien' },
];
/** Đánh lại màn đã qua được phần này của thưởng lần đầu. */
export const REPLAY_SHARE = 0.3;

/** Kỹ năng bấm tay trong trận: Trống trận của Lạc tướng, hai kỹ năng của Gióng, hai kỹ năng của Sơn Tinh. */
export type SkillId = 'trongTran' | 'phunLua' | 'nhoTre' | 'bocDoi' | 'doiNon';
export const SKILL_IDS: SkillId[] = ['trongTran', 'phunLua', 'nhoTre', 'bocDoi', 'doiNon'];
export const SKILLS: Record<SkillId, { cooldown: number; duration: number }> = {
  trongTran: { cooldown: 20, duration: 6 },
  phunLua: { cooldown: 15, duration: 0 },
  nhoTre: { cooldown: 20, duration: 0 },
  bocDoi: { cooldown: 16, duration: 0 },
  doiNon: { cooldown: 22, duration: 0 },
};
/** Trống trận thúc quân: quân ta đánh mạnh hơn và chạy nhanh hơn trong một lúc. */
export const RALLY = { dmg: 1.5, speed: 1.3 };
/** Nhịp trống khi Lạc tướng đánh Trống trận (giây một tiếng), để phần vẽ và tiếng trống khớp nhau. */
export const RALLY_BEAT = 0.5;

export type QuestGoal =
  | { kind: 'count'; building: BuildingType; amount: number }
  | { kind: 'dienLevel'; level: number }
  | { kind: 'workers'; building: BuildingType; amount: number }
  | { kind: 'troops'; amount: number }
  | { kind: 'raidsWon'; amount: number }
  | { kind: 'stage'; stage: number }
  | { kind: 'giongFed'; amount: number }
  | { kind: 'giongGear'; amount: number }
  | { kind: 'gift'; gift: GiftId }
  | { kind: 'gifts'; amount: number }
  | { kind: 'floodsHeld'; amount: number };

export interface QuestDef {
  id: string;
  goal: QuestGoal;
  reward: Cost;
}

/** Các nhiệm vụ của Lạc hầu, theo đúng thứ tự. */
export const QUESTS: QuestDef[] = [
  { id: 'luy', goal: { kind: 'count', building: 'luy', amount: 6 }, reward: { voOc: 40 } },
  { id: 'ruong', goal: { kind: 'count', building: 'ruong', amount: 1 }, reward: { gao: 60 } },
  { id: 'ben', goal: { kind: 'count', building: 'ben', amount: 1 }, reward: { voOc: 50 } },
  { id: 'dien2', goal: { kind: 'dienLevel', level: 2 }, reward: { gao: 100, voOc: 100 } },
  { id: 'nhaSan', goal: { kind: 'count', building: 'nhaSan', amount: 1 }, reward: { gao: 80 } },
  { id: 'baiDa', goal: { kind: 'workers', building: 'baiDa', amount: 2 }, reward: { voOc: 60 } },
  { id: 'kho', goal: { kind: 'count', building: 'kho', amount: 1 }, reward: { datDa: 60 } },
  { id: 'loRen', goal: { kind: 'count', building: 'loRen', amount: 1 }, reward: { datDa: 80 } },
  { id: 'dien3', goal: { kind: 'dienLevel', level: 3 }, reward: { gao: 200, voOc: 150, sat: 20 } },
  { id: 'doanhTrai', goal: { kind: 'count', building: 'doanhTrai', amount: 1 }, reward: { sat: 30 } },
  { id: 'luyenQuan', goal: { kind: 'troops', amount: 5 }, reward: { gao: 120 } },
  { id: 'danhMan1', goal: { kind: 'stage', stage: 1 }, reward: { gao: 100, voOc: 80 } },
  { id: 'choiCanh', goal: { kind: 'count', building: 'choiCanh', amount: 1 }, reward: { datDa: 80 } },
  { id: 'giuKinhDo', goal: { kind: 'raidsWon', amount: 1 }, reward: { voOc: 150, sat: 40 } },
  { id: 'quaMan4', goal: { kind: 'stage', stage: 4 }, reward: { datDa: 150, sat: 60 } },
  { id: 'nuoiGiong', goal: { kind: 'giongFed', amount: 5 }, reward: { voOc: 200 } },
  { id: 'renDo', goal: { kind: 'giongGear', amount: 3 }, reward: { gao: 300, datDa: 150 } },
  { id: 'quaMan6', goal: { kind: 'stage', stage: 6 }, reward: { datDa: 300, sat: 100 } },
  { id: 'nuiTrau', goal: { kind: 'stage', stage: 8 }, reward: { gao: 600, voOc: 600 } },
  { id: 'denPhuDong', goal: { kind: 'count', building: 'denPhuDong', amount: 1 }, reward: { voOc: 300, sat: 100 } },
  // Chương 2: Sơn Tinh, Thủy Tinh.
  { id: 'comNep', goal: { kind: 'gift', gift: 'comNep' }, reward: { voOc: 300 } },
  { id: 'banhChung', goal: { kind: 'gift', gift: 'banhChung' }, reward: { gao: 400 } },
  { id: 'deVenSong', goal: { kind: 'count', building: 'de', amount: 8 }, reward: { datDa: 300 } },
  { id: 'quaMan9', goal: { kind: 'stage', stage: 9 }, reward: { sat: 100 } },
  { id: 'duLeVat', goal: { kind: 'gifts', amount: 5 }, reward: { gao: 600, voOc: 600 } },
  { id: 'chongLu', goal: { kind: 'floodsHeld', amount: 1 }, reward: { datDa: 500, sat: 150 } },
  { id: 'quaMan12', goal: { kind: 'stage', stage: 12 }, reward: { gao: 800, datDa: 400 } },
  { id: 'quaMan14', goal: { kind: 'stage', stage: 14 }, reward: { voOc: 800, sat: 200 } },
  { id: 'tanVien', goal: { kind: 'stage', stage: 16 }, reward: { gao: 1500, voOc: 1500 } },
  { id: 'denTanVien', goal: { kind: 'count', building: 'denTanVien', amount: 1 }, reward: { datDa: 1000, sat: 300 } },
];
/** Nhận xong thưởng nhiệm vụ cuối chương 1 (Đền Phù Đổng) thì sang chương 2. */
export const CH2_QUEST_START = 20;
/** Bản lưu cũ (phiên bản 3) đã làm qua nhiệm vụ này thì chỉ số nhiệm vụ phải dời thêm một. */
export const QUEST_INSERTED_V4 = 11;
