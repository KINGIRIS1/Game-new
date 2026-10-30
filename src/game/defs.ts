// Mọi con số cân bằng game nằm ở đây để dễ tinh chỉnh bằng test.

export const RESOURCE_IDS = ['gao', 'voOc', 'datDa', 'sat'] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];
export type Resources = Record<ResourceId, number>;
export type Cost = Partial<Resources>;

export type BuildingType = 'dien' | 'ruong' | 'ben' | 'luy';

export interface BuildingDef {
  type: BuildingType;
  w: number;
  d: number;
  maxLevel: number;
  /** Giá để có công trình ở cấp 1. */
  buildCost: Cost;
  /** Giá để nâng lên cấp `level`, chỉ số là cấp đích (phần tử 0 và 1 không dùng). */
  upgradeCost: Cost[];
  /** Sản lượng mỗi phút theo cấp, chỉ số 0 là cấp 1. */
  production: Cost[];
  /** Số công trình tối đa theo cấp Điện Vua Hùng, chỉ số 0 là cấp 1. */
  limit: number[];
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
      { gao: 300, voOc: 200 },
      { gao: 500, voOc: 300 },
      { gao: 1100, voOc: 600 },
      { gao: 2000, voOc: 1100 },
    ],
    production: [
      { gao: 4, voOc: 2 },
      { gao: 6, voOc: 3 },
      { gao: 8, voOc: 4 },
      { gao: 10, voOc: 5 },
      { gao: 12, voOc: 6 },
    ],
    limit: [1, 1, 1, 1, 1],
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
      { gao: 40, voOc: 40 },
      { gao: 120, voOc: 100 },
      { gao: 300, voOc: 250 },
      { gao: 700, voOc: 550 },
    ],
    production: [{ gao: 12 }, { gao: 20 }, { gao: 32 }, { gao: 50 }, { gao: 75 }],
    limit: [2, 3, 4, 5, 6],
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
      { gao: 100 },
      { gao: 240, voOc: 40 },
      { gao: 560, voOc: 100 },
      { gao: 1200, voOc: 240 },
    ],
    production: [{ voOc: 12 }, { voOc: 20 }, { voOc: 30 }, { voOc: 45 }, { voOc: 65 }],
    limit: [1, 2, 2, 3, 3],
    nearRiver: true,
    buildable: true,
    removable: false,
  },
  luy: {
    type: 'luy',
    w: 1,
    d: 1,
    maxLevel: 1,
    buildCost: { voOc: 4 },
    upgradeCost: [{}, {}],
    production: [{}],
    limit: [30, 50, 70, 90, 110],
    buildable: true,
    removable: true,
  },
};

/** Sức chứa mỗi loại tài nguyên theo cấp Điện Vua Hùng, chỉ số 0 là cấp 1. */
export const STORAGE_CAP = [500, 1000, 2000, 4000, 8000];

export const START_RESOURCES: Resources = { gao: 150, voOc: 120, datDa: 0, sat: 0 };

/** Khi vắng mặt: sản xuất với tốc độ này, cộng dồn tối đa OFFLINE_CAP_MS. */
export const OFFLINE_RATE = 0.5;
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;

export type QuestGoal =
  | { kind: 'count'; building: BuildingType; amount: number }
  | { kind: 'dienLevel'; level: number };

export interface QuestDef {
  id: string;
  goal: QuestGoal;
  reward: Cost;
}

/** Các nhiệm vụ đầu của Lạc hầu, theo đúng thứ tự. */
export const QUESTS: QuestDef[] = [
  { id: 'luy', goal: { kind: 'count', building: 'luy', amount: 6 }, reward: { voOc: 40 } },
  { id: 'ruong', goal: { kind: 'count', building: 'ruong', amount: 1 }, reward: { gao: 60 } },
  { id: 'ben', goal: { kind: 'count', building: 'ben', amount: 1 }, reward: { voOc: 50 } },
  { id: 'dien2', goal: { kind: 'dienLevel', level: 2 }, reward: { gao: 100, voOc: 100 } },
];
