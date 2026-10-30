// Mọi con số cân bằng game nằm ở đây để dễ tinh chỉnh bằng test.

export const RESOURCE_IDS = ['gao', 'voOc', 'datDa', 'sat'] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];
export type Resources = Record<ResourceId, number>;
export type Cost = Partial<Resources>;

export type BuildingType = 'dien' | 'ruong' | 'ben' | 'luy' | 'nhaSan' | 'baiDa' | 'loRen' | 'kho';

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
    limit: [1, 1, 2, 2, 3],
    minDien: 1,
    buildable: true,
    removable: false,
  },
};

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

export type QuestGoal =
  | { kind: 'count'; building: BuildingType; amount: number }
  | { kind: 'dienLevel'; level: number }
  | { kind: 'workers'; building: BuildingType; amount: number };

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
];
