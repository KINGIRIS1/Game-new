// Mọi con số cân bằng game nằm ở đây để dễ tinh chỉnh bằng test.

export const RESOURCE_IDS = ['gao', 'voOc', 'datDa', 'sat', 'go'] as const;
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
  | 'denTanVien'
  | 'thanh'
  | 'denCoLoa'
  | 'ruongNep'
  | 'vuon'
  | 'chuongLon'
  | 'bep'
  | 'lauNo'
  | 'traiGiao'
  | 'traiCung'
  | 'chuongVoi'
  // Đường đi: trải từng ô, chỉ để nhìn.
  | 'duongDat'
  | 'duongSoi'
  | 'duongDa'
  | 'duongGach'
  // Đồ trang trí: chỉ để nhìn.
  | 'cayDa'
  | 'gieng'
  | 'ao'
  | 'hoa'
  | 'co'
  | 'cau'
  | 'rom'
  // Nơi ở của lính nỏ (chương 4).
  | 'traiNo'
  // Đền thờ An Dương Vương (kết chương 4).
  | 'denCuong'
  // Xưởng mộc: ra gỗ (tài nguyên thứ năm).
  | 'xuongMoc'
  // Làng chài: ra cá, dân và lính ăn cá thay một phần gạo.
  | 'langChai'
  // Cổng thành: cửa trong vòng tường, hút giặc tới phá, lính trên lầu cổng bắn (chương 3).
  | 'congThanh'
  // Cầu qua sông Đà, qua sông Thao sang vùng đất bên kia (`benKia.ts`).
  | 'cauSongDa'
  | 'cauSongThao'
  // Nhà làng bên kia sông đã về theo, và đồn biên giữ bờ bên kia.
  | 'banLang'
  | 'donBien'
  // Hồ Kim Quy: nơi thần Kim Quy (Rùa Vàng) trú ngụ, mở khi Rùa Vàng hiện lên (chương 3).
  | 'hoKimQuy'
  // Bến thuyền khơi: thuyền đánh cá lớn ra biển Đông, mang về cá biển và vỏ ốc (từ Điện 8, `bien.ts`).
  | 'benKhoi'
  // Đền Hát Môn thờ Hai Bà Trưng (kết chương 5): đền còn nguyên thì mỗi trận giữ kinh đô có nghĩa binh ra đánh.
  | 'denHatMon'
  // Cống đê: đóng thì chặn lũ như kè đá, mở thì đón nước lũ vào bồi phù sa cho ruộng (chương 2).
  | 'congDe'
  // Bậc lên thành: lối cho cung thủ, lính nỏ lên mặt thành đất, thành Cổ Loa mà bắn xuống khi giữ kinh đô.
  | 'bacThanh';

/**
 * Mốc mở khóa theo cốt truyện: sau kết chương 1, khi vào chương 2, sau kết chương 2, khi vào chương 3, khi Rùa Vàng
 * hiện lên (thắng màn 19), sau kết chương 3, khi vào chương 4, sau kết chương 4 (vua xuống biển), sau kết chương 5
 * (thắng màn 40, giữ Cấm Khê).
 */
export type Unlock = 'ketChuong1' | 'chuong2' | 'ketChuong2' | 'chuong3' | 'ruaVang' | 'ketChuong3' | 'chuong4' | 'ketChuong4' | 'ketChuong5';

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
  /** Cần doanh trại ít nhất cấp này mới dựng được (nơi ở riêng của từng binh chủng). */
  barracksLevel?: number;
  /**
   * Đường đi hay đồ trang trí: chỉ để nhìn. Giặc không nhắm, đi qua được; lũ không làm hư; áp mẫu mà vướng thì dỡ.
   */
  decor?: 'duong' | 'trangTri';
}

/** Dời công trình sang chỗ khác tốn chừng này phần giá dựng (làm tròn lên). Điện Vua Hùng không có giá dựng nên dời không tốn của. */
export const MOVE_FRACTION = 0.1;

/**
 * Điện Vua Hùng lên cấp 6 khi đã vào chương 2, cấp 7 khi đã vào chương 3, cấp 8 khi đã vào chương 4, cấp 10 khi đã
 * vào chương 5 (chỉ số là cấp đích). Cấp 9 mở khi đã hộ giá vua ra biển Mộ Dạ (thắng màn 32, màn hình Hết truyện).
 */
export const DIEN_CHAPTER: Partial<Record<number, 2 | 3 | 4 | 5>> = { 6: 2, 7: 3, 8: 4, 10: 5 };

/** Tổng số ô đường (cả bốn loại) được trải, theo cấp Điện. */
export const ROAD_LIMIT = [60, 90, 120, 160, 200, 240, 280, 280, 295, 310];
export const ROAD_TYPES: BuildingType[] = ['duongDat', 'duongSoi', 'duongDa', 'duongGach'];
export const DECOR_TYPES: BuildingType[] = ['cayDa', 'gieng', 'ao', 'hoa', 'co', 'cau', 'rom'];
/**
 * Thẻ Công trình của bảng Xây dựng, theo thứ tự hiện. Mọi công trình dựng được mà không phải đường đi hay đồ trang trí
 * đều phải có ở đây (lầu nỏ không dựng mà ghép từ hai chòi canh).
 */
export const BUILD_MENU: BuildingType[] = [
  'luy',
  'ruong',
  'ben',
  'langChai',
  'benKhoi',
  'nhaSan',
  'baiDa',
  'kho',
  'loRen',
  'xuongMoc',
  'doanhTrai',
  'traiGiao',
  'traiCung',
  'chuongVoi',
  'traiNo',
  'choiCanh',
  'bayChong',
  'denPhuDong',
  'ruongNep',
  'vuon',
  'chuongLon',
  'bep',
  'de',
  'congDe',
  'denTanVien',
  'thanh',
  'congThanh',
  'bacThanh',
  'hoKimQuy',
  'denCoLoa',
  'denCuong',
  'denHatMon',
  'cauSongDa',
  'cauSongThao',
  'donBien',
];

/** Một ô đường: một cấp, dỡ được, giới hạn chung. */
function road(type: BuildingType, cost: Cost, minDien: number): BuildingDef {
  return { ...decorDef(type, 1, cost, ROAD_LIMIT, minDien), decor: 'duong' };
}

/** Một món trang trí móng `size`×`size`. */
function decor(type: BuildingType, size: number, cost: Cost, limit: number[], minDien: number): BuildingDef {
  return { ...decorDef(type, size, cost, limit, minDien), decor: 'trangTri' };
}

function decorDef(type: BuildingType, size: number, cost: Cost, limit: number[], minDien: number): BuildingDef {
  return {
    type,
    w: size,
    d: size,
    maxLevel: 1,
    buildCost: cost,
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [1],
    limit,
    minDien,
    buildable: true,
    removable: true,
  };
}

/**
 * Cầu qua sông: một cầu mỗi sông, có từ Điện cấp 4 (`BEN_KIA_DIEN`), vắt qua 7 ô sông. Cấp 1 cầu phao tre, cấp 2 cầu
 * gỗ (Điện 6), cấp 3 cầu gỗ lớn có lầu đầu cầu (Điện 7). Không dời, không dỡ được.
 */
function bridgeDef(type: 'cauSongDa' | 'cauSongThao', w: number, d: number): BuildingDef {
  return {
    type,
    w,
    d,
    maxLevel: 3,
    buildCost: { gao: 400, voOc: 300, datDa: 200 },
    upgradeCost: [{}, {}, { voOc: 1400, datDa: 1000, go: 800, sat: 250 }, { voOc: 2400, datDa: 2000, go: 1500, sat: 500 }],
    levelMinDien: [0, 0, 6, 7],
    production: [{}, {}, {}],
    hp: [600, 1500, 2600],
    limit: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    minDien: 4,
    buildable: true,
    removable: false,
  };
}

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  dien: {
    type: 'dien',
    w: 10,
    d: 10,
    maxLevel: 10,
    buildCost: {},
    upgradeCost: [
      {},
      {},
      { gao: 250, voOc: 150 },
      { gao: 450, voOc: 250, datDa: 150 },
      { gao: 800, voOc: 700, datDa: 400, sat: 60 },
      { gao: 1400, voOc: 1300, datDa: 800, sat: 160 },
      // Cấp 6 mở khi vào chương 2, cấp 7 khi vào chương 3, cấp 8 khi vào chương 4 (DIEN_CHAPTER).
      { gao: 4000, voOc: 4000, datDa: 3000, sat: 600 },
      { gao: 7200, voOc: 6400, datDa: 5600, sat: 1200 },
      { gao: 10400, voOc: 9200, datDa: 8000, sat: 1800 },
      { gao: 14100, voOc: 12300, datDa: 11000, sat: 2400 },
      { gao: 19200, voOc: 16800, datDa: 15200, sat: 3400 },
    ],
    production: [
      { gao: 4, voOc: 2 },
      { gao: 6, voOc: 3 },
      { gao: 8, voOc: 4 },
      { gao: 10, voOc: 5 },
      { gao: 12, voOc: 6 },
      { gao: 14, voOc: 7 },
      { gao: 16, voOc: 8 },
      { gao: 18, voOc: 9 },
      { gao: 20, voOc: 10 },
      { gao: 22, voOc: 11 },
    ],
    housing: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    hp: [700, 850, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400],
    limit: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    minDien: 1,
    buildable: false,
    removable: false,
  },
  ruong: {
    type: 'ruong',
    w: 4,
    d: 4,
    maxLevel: 10,
    buildCost: { voOc: 30 },
    upgradeCost: [
      {},
      {},
      { voOc: 40 },
      { voOc: 90, datDa: 30 },
      { voOc: 200, datDa: 120 },
      { voOc: 420, datDa: 260 },
      { voOc: 850, datDa: 550 },
      { voOc: 1700, datDa: 1100 },
      { voOc: 3400, datDa: 2200 },
      { voOc: 4300, datDa: 2800 },
      { voOc: 6900, datDa: 4500 },
    ],
    production: [{ gao: 19 }, { gao: 32 }, { gao: 50 }, { gao: 75 }, { gao: 110 }, { gao: 150 }, { gao: 200 }, { gao: 260 }, { gao: 320 }, { gao: 390 }],
    workers: [2, 3, 3, 4, 4, 5, 5, 5, 5, 6],
    hp: [150, 170, 190, 210, 230, 250, 270, 300, 330, 360],
    limit: [2, 3, 4, 5, 6, 7, 8, 8, 9, 10],
    minDien: 1,
    buildable: true,
    removable: false,
  },
  ben: {
    type: 'ben',
    w: 3,
    d: 3,
    maxLevel: 10,
    buildCost: { gao: 50 },
    upgradeCost: [
      {},
      {},
      { gao: 60, datDa: 20 },
      { gao: 120, datDa: 60 },
      { gao: 250, datDa: 150 },
      { gao: 500, datDa: 300 },
      { gao: 1000, datDa: 600 },
      { gao: 2000, datDa: 1200 },
      { gao: 4000, datDa: 2400 },
      { gao: 5100, datDa: 3000 },
      { gao: 8200, datDa: 4900 },
    ],
    production: [{ voOc: 20 }, { voOc: 35 }, { voOc: 52 }, { voOc: 78 }, { voOc: 112 }, { voOc: 150 }, { voOc: 200 }, { voOc: 260 }, { voOc: 385 }, { voOc: 470 }],
    workers: [1, 2, 2, 3, 3, 4, 4, 4, 4, 5],
    hp: [160, 180, 200, 220, 240, 260, 280, 310, 340, 375],
    limit: [2, 2, 3, 3, 4, 4, 5, 5, 5, 5],
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
    limit: [50, 70, 100, 130, 150, 170, 180, 180, 190, 200],
    minDien: 1,
    levelMinDien: [0, 0, 3],
    buildable: true,
    removable: true,
  },
  nhaSan: {
    type: 'nhaSan',
    w: 3,
    d: 3,
    maxLevel: 10,
    buildCost: { gao: 30, voOc: 20 },
    upgradeCost: [
      {},
      {},
      { voOc: 50, datDa: 20 },
      { voOc: 100, datDa: 70 },
      { voOc: 200, datDa: 160 },
      { voOc: 380, datDa: 320 },
      { voOc: 760, datDa: 640 },
      { voOc: 1500, datDa: 1300 },
      { voOc: 3000, datDa: 2600 },
      { voOc: 3800, datDa: 3400 },
      { voOc: 6200, datDa: 5400 },
    ],
    production: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
    housing: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
    hp: [160, 180, 200, 220, 240, 260, 280, 310, 340, 375],
    limit: [1, 2, 3, 4, 5, 6, 7, 7, 8, 9],
    minDien: 1,
    buildable: true,
    removable: false,
  },
  baiDa: {
    type: 'baiDa',
    w: 3,
    d: 3,
    maxLevel: 10,
    buildCost: { gao: 40, voOc: 30 },
    upgradeCost: [
      {},
      {},
      { gao: 30, voOc: 60 },
      { gao: 60, voOc: 120 },
      { gao: 120, voOc: 250 },
      { gao: 240, voOc: 500 },
      { gao: 480, voOc: 1000 },
      { gao: 960, voOc: 2000 },
      { gao: 1900, voOc: 4000 },
      { gao: 2400, voOc: 5100 },
      { gao: 3800, voOc: 8200 },
    ],
    production: [{ datDa: 19 }, { datDa: 32 }, { datDa: 50 }, { datDa: 72 }, { datDa: 105 }, { datDa: 145 }, { datDa: 195 }, { datDa: 255 }, { datDa: 310 }, { datDa: 380 }],
    workers: [2, 2, 3, 3, 4, 5, 5, 5, 5, 6],
    hp: [180, 200, 220, 240, 260, 280, 300, 330, 365, 400],
    limit: [1, 2, 3, 3, 4, 5, 5, 5, 5, 5],
    minDien: 1,
    buildable: true,
    removable: false,
  },
  // Cổng thành: một ô trong vòng tường (dựng trên ô trống hay thay một đoạn lũy, thành đất, thành Cổ Loa).
  congThanh: {
    type: 'congThanh',
    w: 1,
    d: 1,
    maxLevel: 3,
    buildCost: { datDa: 500, go: 400, sat: 100 },
    upgradeCost: [{}, {}, { datDa: 1200, go: 1000, sat: 250 }, { datDa: 2500, go: 2000, sat: 500 }],
    production: [{}, {}, {}],
    hp: [3000, 4500, 6000],
    limit: [0, 0, 0, 0, 2, 2, 2, 4, 4, 4],
    minDien: 5,
    levelMinDien: [0, 0, 7, 8],
    buildable: true,
    removable: true,
    unlock: 'chuong3',
  },
  // Bậc lên thành: một ô sát một đoạn thành đất (lũy cấp 2) hay thành Cổ Loa. Khi giữ kinh đô, cung thủ và lính nỏ
  // theo bậc lên mặt cả dải thành liền với bậc mà bắn xuống (`stepGuard` ở `battle.ts`).
  bacThanh: {
    type: 'bacThanh',
    w: 1,
    d: 1,
    maxLevel: 1,
    buildCost: { datDa: 150, go: 100 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [800],
    limit: [0, 0, 2, 2, 3, 3, 4, 4, 5, 5],
    minDien: 3,
    buildable: true,
    removable: true,
  },
  // Làng chài: ngư dân đánh cá ven sông. Cá không tích trữ: dân và lính ăn cá trước, thiếu mới ăn gạo (`CA_PER_MIN`).
  langChai: {
    type: 'langChai',
    w: 3,
    d: 3,
    maxLevel: 10,
    buildCost: { gao: 80, go: 60 },
    upgradeCost: [
      {},
      {},
      { gao: 60, go: 40 },
      { gao: 120, go: 80 },
      { gao: 250, go: 160 },
      { gao: 500, go: 320 },
      { gao: 1000, go: 640 },
      { gao: 2000, go: 1300 },
      { gao: 4000, go: 2600 },
      { gao: 5100, go: 3400 },
      { gao: 8200, go: 5400 },
    ],
    production: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
    workers: [1, 2, 2, 2, 3, 3, 3, 3, 3, 4],
    hp: [160, 180, 200, 220, 240, 260, 280, 310, 340, 375],
    limit: [0, 0, 1, 1, 2, 2, 3, 3, 3, 3],
    minDien: 3,
    nearRiver: true,
    buildable: true,
    removable: false,
  },
  // Bến thuyền khơi: đóng thuyền đánh cá lớn, xuôi sông ra biển Đông đánh cá quanh Hoàng Sa, Trường Sa. Mang về cá
  // biển (đỡ gạo ăn như cá làng chài, `CA_BIEN_PER_MIN`) và vỏ ốc. Mở ở Điện 8, cấp 2 ở Điện 9, cấp 3 ở Điện 10.
  benKhoi: {
    type: 'benKhoi',
    w: 3,
    d: 3,
    maxLevel: 3,
    buildCost: { gao: 3000, go: 3000, sat: 400 },
    upgradeCost: [{}, {}, { gao: 5000, go: 4500, sat: 700 }, { gao: 8000, go: 7000, sat: 1100 }],
    production: [{ voOc: 120 }, { voOc: 170 }, { voOc: 230 }],
    workers: [3, 4, 5],
    hp: [420, 480, 540],
    limit: [0, 0, 0, 0, 0, 0, 0, 1, 2, 2],
    minDien: 8,
    levelMinDien: [0, 0, 9, 10],
    nearRiver: true,
    buildable: true,
    removable: false,
  },
  // Xưởng mộc: thợ mộc xẻ gỗ. Gỗ dùng dựng, nâng làng chài, cổng thành; thừa thì đổi với thuyền buôn.
  xuongMoc: {
    type: 'xuongMoc',
    w: 3,
    d: 3,
    maxLevel: 10,
    buildCost: { gao: 60, voOc: 40 },
    upgradeCost: [
      {},
      {},
      { voOc: 60, datDa: 30 },
      { voOc: 120, datDa: 60 },
      { voOc: 250, datDa: 120 },
      { voOc: 500, datDa: 250 },
      { voOc: 1000, datDa: 500 },
      { voOc: 2000, datDa: 1000 },
      { voOc: 4000, datDa: 2000 },
      { voOc: 5100, datDa: 2600 },
      { voOc: 8200, datDa: 4100 },
    ],
    production: [{ go: 10 }, { go: 16 }, { go: 24 }, { go: 36 }, { go: 50 }, { go: 68 }, { go: 90 }, { go: 118 }, { go: 144 }, { go: 176 }],
    workers: [1, 2, 2, 3, 3, 4, 4, 4, 4, 5],
    hp: [180, 200, 220, 240, 260, 280, 300, 330, 365, 400],
    limit: [0, 1, 1, 2, 2, 2, 3, 3, 3, 3],
    minDien: 2,
    buildable: true,
    removable: false,
  },
  loRen: {
    type: 'loRen',
    w: 3,
    d: 3,
    maxLevel: 10,
    buildCost: { voOc: 60, datDa: 60 },
    upgradeCost: [
      {},
      {},
      { voOc: 80, datDa: 80 },
      { voOc: 160, datDa: 180 },
      { voOc: 320, datDa: 350 },
      { voOc: 640, datDa: 700 },
      { voOc: 1300, datDa: 1400 },
      { voOc: 2600, datDa: 2800 },
      { voOc: 5200, datDa: 5600 },
      { voOc: 6600, datDa: 7200 },
      { voOc: 10600, datDa: 11500 },
    ],
    production: [{ sat: 5 }, { sat: 9 }, { sat: 14 }, { sat: 20 }, { sat: 29 }, { sat: 40 }, { sat: 54 }, { sat: 70 }, { sat: 85 }, { sat: 104 }],
    workers: [1, 2, 2, 3, 3, 4, 4, 4, 4, 5],
    hp: [200, 220, 240, 260, 280, 300, 320, 350, 385, 425],
    limit: [0, 1, 1, 2, 2, 3, 3, 3, 3, 3],
    minDien: 2,
    buildable: true,
    removable: false,
  },
  kho: {
    type: 'kho',
    w: 3,
    d: 3,
    maxLevel: 10,
    buildCost: { voOc: 40, datDa: 40 },
    upgradeCost: [
      {},
      {},
      { voOc: 80, datDa: 100 },
      { voOc: 160, datDa: 200 },
      { voOc: 320, datDa: 400 },
      { voOc: 640, datDa: 800 },
      { voOc: 1300, datDa: 1600 },
      { voOc: 2600, datDa: 3200 },
      { voOc: 5200, datDa: 6400 },
      { voOc: 6600, datDa: 8200 },
      { voOc: 10600, datDa: 13100 },
    ],
    production: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
    storage: [500, 1000, 1500, 2500, 4000, 6000, 9000, 13000, 17000, 22000],
    hp: [300, 360, 420, 480, 540, 600, 660, 730, 800, 880],
    limit: [1, 1, 2, 2, 3, 3, 4, 4, 4, 4],
    minDien: 1,
    buildable: true,
    removable: false,
  },
  doanhTrai: {
    type: 'doanhTrai',
    w: 4,
    d: 4,
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
    // Mỗi doanh trại cần một tướng chỉ huy, nên số doanh trại còn tùy số tướng đã có (`limitOf`, `doanhTrai.ts`).
    limit: [0, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    minDien: 2,
    buildable: true,
    removable: false,
  },
  choiCanh: {
    type: 'choiCanh',
    w: 1,
    d: 1,
    maxLevel: 10,
    buildCost: { voOc: 40, datDa: 40 },
    upgradeCost: [
      {},
      {},
      { voOc: 60, datDa: 60 },
      { voOc: 120, datDa: 120, sat: 20 },
      { voOc: 240, datDa: 240, sat: 40 },
      { voOc: 480, datDa: 480, sat: 80 },
      { voOc: 960, datDa: 960, sat: 160 },
      { voOc: 1900, datDa: 1900, sat: 320 },
      { voOc: 3800, datDa: 3800, sat: 640 },
      { voOc: 4900, datDa: 4900, sat: 800 },
      { voOc: 7800, datDa: 7800, sat: 1300 },
    ],
    production: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
    hp: [180, 220, 270, 330, 400, 480, 560, 620, 680, 750],
    limit: [0, 2, 3, 4, 5, 6, 7, 7, 8, 9],
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
    limit: [0, 4, 6, 8, 10, 12, 14, 14, 14, 14],
    minDien: 2,
    buildable: true,
    removable: true,
  },
  denPhuDong: {
    type: 'denPhuDong',
    w: 4,
    d: 4,
    maxLevel: 1,
    buildCost: { gao: 600, voOc: 600, datDa: 500, sat: 150 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [700],
    limit: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
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
    limit: [130, 130, 130, 130, 130, 140, 150, 150, 160, 165],
    minDien: 1,
    buildable: true,
    removable: true,
    unlock: 'chuong2',
  },
  // Cống đê: một ô trong dải đê (dựng trên ô trống hay thay một đoạn đê). Đóng thì cao như kè đá, mở thì nước lũ
  // tràn vào sau đê; ruộng chỉ dính nước vào qua cống thì không hư mà được bồi phù sa (`floodHits` ở `terrain.ts`).
  congDe: {
    type: 'congDe',
    w: 1,
    d: 1,
    maxLevel: 1,
    buildCost: { datDa: 200, go: 120, voOc: 60 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [1500],
    limit: [2, 2, 2, 2, 2, 2, 2, 2, 3, 3],
    minDien: 1,
    buildable: true,
    removable: true,
    unlock: 'chuong2',
  },
  denTanVien: {
    type: 'denTanVien',
    w: 4,
    d: 4,
    maxLevel: 1,
    buildCost: { gao: 1500, voOc: 1500, datDa: 1500, sat: 400 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [900],
    limit: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    minDien: 1,
    buildable: true,
    removable: false,
    unlock: 'ketChuong2',
  },
  thanh: {
    type: 'thanh',
    w: 1,
    d: 1,
    maxLevel: 1,
    // Đoạn thành Cổ Loa: đất nện cao, chắc gấp mấy lần thành đất. Đắp đè lên lũy tre được.
    buildCost: { datDa: 30, voOc: 10 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [1000],
    limit: [220, 220, 220, 220, 220, 230, 240, 240, 250, 260],
    minDien: 1,
    buildable: true,
    removable: true,
    unlock: 'chuong3',
  },
  denCoLoa: {
    type: 'denCoLoa',
    w: 4,
    d: 4,
    maxLevel: 1,
    buildCost: { gao: 2500, voOc: 2500, datDa: 2500, sat: 700 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [1000],
    limit: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    minDien: 1,
    buildable: true,
    removable: false,
    unlock: 'ketChuong3',
  },
  // Hồ Kim Quy: hồ lớn nơi thần Kim Quy trú ngụ, giữa hồ có miếu trên gò. Hồ còn nguyên thì tường thành thêm máu
  // (`KIM_QUY_WALLS`), như truyện thần Kim Quy giúp An Dương Vương xây thành không đổ.
  hoKimQuy: {
    type: 'hoKimQuy',
    w: 8,
    d: 8,
    maxLevel: 1,
    buildCost: { gao: 2000, voOc: 2000, datDa: 2500, go: 500 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [1000],
    limit: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    minDien: 1,
    buildable: true,
    removable: false,
    unlock: 'ruaVang',
  },
  // Hội Tết bánh chưng bánh giầy: bốn công trình làm bánh, mở sau truyện Lang Liêu (kết chương 1).
  // Ba cấp: cấp 2 cần Điện cấp 5, cấp 3 cần Điện cấp 6. Làm ra nguyên liệu và bánh, không làm ra tài nguyên.
  ruongNep: {
    type: 'ruongNep',
    w: 4,
    d: 4,
    maxLevel: 3,
    buildCost: { voOc: 300, datDa: 150 },
    upgradeCost: [{}, {}, { voOc: 900, datDa: 500 }, { voOc: 2500, datDa: 1500 }],
    production: [{}, {}, {}],
    workers: [2, 3, 3],
    hp: [170, 200, 230],
    limit: [0, 0, 1, 1, 2, 2, 2, 2, 2, 2],
    minDien: 3,
    levelMinDien: [0, 0, 5, 6],
    buildable: true,
    removable: false,
    unlock: 'ketChuong1',
  },
  vuon: {
    type: 'vuon',
    w: 3,
    d: 3,
    maxLevel: 3,
    buildCost: { gao: 200, voOc: 150 },
    upgradeCost: [{}, {}, { gao: 600, voOc: 450 }, { gao: 1800, voOc: 1300 }],
    production: [{}, {}, {}],
    workers: [1, 2, 2],
    hp: [150, 170, 190],
    limit: [0, 0, 1, 1, 1, 2, 2, 2, 2, 2],
    minDien: 3,
    levelMinDien: [0, 0, 5, 6],
    buildable: true,
    removable: false,
    unlock: 'ketChuong1',
  },
  chuongLon: {
    type: 'chuongLon',
    w: 3,
    d: 3,
    maxLevel: 3,
    buildCost: { gao: 250, datDa: 200 },
    upgradeCost: [{}, {}, { gao: 750, datDa: 600 }, { gao: 2200, datDa: 1800 }],
    production: [{}, {}, {}],
    workers: [1, 1, 2],
    hp: [180, 200, 220],
    limit: [0, 0, 1, 1, 1, 2, 2, 2, 2, 2],
    minDien: 3,
    levelMinDien: [0, 0, 5, 6],
    buildable: true,
    removable: false,
    unlock: 'ketChuong1',
  },
  bep: {
    type: 'bep',
    w: 3,
    d: 3,
    maxLevel: 3,
    buildCost: { voOc: 200, datDa: 250, sat: 40 },
    upgradeCost: [{}, {}, { voOc: 600, datDa: 750, sat: 120 }, { voOc: 1800, datDa: 2200, sat: 350 }],
    production: [{}, {}, {}],
    workers: [2, 2, 3],
    hp: [200, 230, 260],
    limit: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    minDien: 3,
    levelMinDien: [0, 0, 5, 6],
    buildable: true,
    removable: false,
    unlock: 'ketChuong1',
  },
  // Lầu nỏ: ghép hai chòi canh cấp 8 thành một (`mergeTowers` ở chuong4.ts), không dựng thẳng được.
  // Giá dựng là giá ghép. Mỗi lầu nỏ tính là hai chòi canh trong số chòi canh tối đa.
  // Sau truyện lên cấp 2 ở Điện 9, cấp 3 ở Điện 10 (mỗi mũi `LAU_NO.dmg` theo cấp).
  lauNo: {
    type: 'lauNo',
    w: 1,
    d: 1,
    maxLevel: 3,
    buildCost: { voOc: 2000, datDa: 2000, sat: 500 },
    upgradeCost: [{}, {}, { voOc: 3200, datDa: 3200, sat: 800 }, { voOc: 5000, datDa: 5000, sat: 1300 }],
    production: [{}, {}, {}],
    hp: [1400, 1540, 1700],
    limit: [0, 0, 0, 0, 0, 0, 0, 3, 3, 3],
    minDien: 8,
    levelMinDien: [0, 0, 9, 10],
    buildable: false,
    removable: false,
  },
  // Nơi ở riêng của từng binh chủng: lính ở đó và luyện ở đó. Dựng một lần, không lên cấp.
  // Doanh trại là nơi các tướng ở, giữ tổng số chỗ quân và lo điều binh.
  traiGiao: {
    type: 'traiGiao',
    w: 3,
    d: 3,
    maxLevel: 1,
    buildCost: { gao: 40, voOc: 30, datDa: 30 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [300],
    limit: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    minDien: 2,
    barracksLevel: 1,
    buildable: true,
    removable: false,
  },
  traiCung: {
    type: 'traiCung',
    w: 3,
    d: 3,
    maxLevel: 1,
    buildCost: { gao: 60, voOc: 50, datDa: 50, sat: 10 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [300],
    limit: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    minDien: 2,
    barracksLevel: 2,
    buildable: true,
    removable: false,
  },
  chuongVoi: {
    type: 'chuongVoi',
    w: 3,
    d: 3,
    maxLevel: 1,
    buildCost: { gao: 120, voOc: 80, datDa: 100, sat: 20 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [400],
    limit: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    minDien: 3,
    barracksLevel: 3,
    buildable: true,
    removable: false,
  },
  // ---------- Đường đi ----------
  // Trải từng ô như lũy. Bốn loại chung một giới hạn số ô (ROAD_LIMIT). Trải loại khác đè lên ô đường cũ thì đổi vật liệu.
  duongDat: road('duongDat', { voOc: 2 }, 1),
  duongSoi: road('duongSoi', { datDa: 3 }, 2),
  duongDa: road('duongDa', { datDa: 6, voOc: 2 }, 3),
  duongGach: { ...road('duongGach', { datDa: 8, voOc: 6 }, 1), unlock: 'chuong3' },
  // ---------- Đồ trang trí ----------
  cayDa: decor('cayDa', 2, { gao: 80, voOc: 60 }, [1, 1, 2, 2, 3, 3, 4, 4, 4, 4], 2),
  gieng: decor('gieng', 1, { voOc: 20, datDa: 20 }, [1, 2, 2, 3, 3, 4, 5, 5, 5, 5], 2),
  ao: decor('ao', 3, { gao: 60, voOc: 60 }, [1, 1, 1, 2, 2, 2, 3, 3, 3, 3], 2),
  hoa: decor('hoa', 1, { voOc: 3 }, [10, 15, 20, 25, 30, 35, 40, 40, 40, 40], 1),
  co: decor('co', 1, { voOc: 1 }, [20, 30, 40, 50, 60, 70, 80, 80, 80, 80], 1),
  cau: decor('cau', 1, { gao: 10, voOc: 5 }, [4, 6, 8, 10, 12, 14, 16, 16, 16, 16], 1),
  rom: decor('rom', 1, { gao: 8 }, [2, 4, 6, 8, 10, 12, 14, 14, 14, 14], 1),
  // Lính nỏ (chương 4) cũng có nơi ở riêng: Cao Lỗ tâu vua cho dân luyện nỏ.
  traiNo: {
    type: 'traiNo',
    w: 3,
    d: 3,
    maxLevel: 1,
    buildCost: { gao: 600, voOc: 500, datDa: 500, sat: 120 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [500],
    limit: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    minDien: 2,
    barracksLevel: 5,
    buildable: true,
    removable: false,
    unlock: 'chuong4',
  },
  // Đền Cuông thờ An Dương Vương, nơi vua theo Rùa Vàng xuống biển: đền còn nguyên thì mỗi đợt thủy binh bớt thuyền.
  denCuong: {
    type: 'denCuong',
    w: 4,
    d: 4,
    maxLevel: 1,
    buildCost: { gao: 4000, voOc: 4000, datDa: 4000, sat: 1100 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [1000],
    limit: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    minDien: 1,
    buildable: true,
    removable: false,
    unlock: 'ketChuong4',
  },
  // Đền Hát Môn thờ Hai Bà, nơi Hai Bà tế cờ khởi nghĩa: đền còn nguyên thì mỗi trận giữ kinh đô có nghĩa binh ra đánh.
  denHatMon: {
    type: 'denHatMon',
    w: 4,
    d: 4,
    maxLevel: 1,
    buildCost: { gao: 5000, voOc: 5000, datDa: 5000, sat: 1400 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [1100],
    limit: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    minDien: 1,
    buildable: true,
    removable: false,
    unlock: 'ketChuong5',
  },
  // Cầu qua sông Đà nằm dọc (rộng 2 ô, vắt qua 7 ô sông), cầu qua sông Thao nằm ngang.
  cauSongDa: bridgeDef('cauSongDa', 2, 7),
  cauSongThao: bridgeDef('cauSongThao', 7, 2),
  // Bản làng bên kia sông đã về theo (`benKia.ts`): nhà làng giữa khoảnh làng, không dựng hay dỡ được. Giặc bên kia
  // đánh làng trước tiên; làng hư thì thôi làm ra, sửa tốn 30% lễ kết thân như công trình khác.
  banLang: {
    type: 'banLang',
    w: 3,
    d: 3,
    maxLevel: 1,
    buildCost: { gao: 600, voOc: 400 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [700],
    limit: [0, 0, 0, 4, 4, 4, 4, 4, 4, 4],
    minDien: 4,
    buildable: false,
    removable: false,
  },
  // Đồn biên: chỉ dựng bên kia sông, mỗi bờ một. Lính đóng ở đồn ra trận từ đây khi giữ kinh đô.
  donBien: {
    type: 'donBien',
    w: 4,
    d: 4,
    maxLevel: 1,
    buildCost: { gao: 800, voOc: 600, datDa: 600, sat: 100 },
    upgradeCost: [{}, {}],
    production: [{}],
    hp: [900],
    limit: [0, 0, 0, 0, 2, 2, 2, 2, 2, 2],
    minDien: 5,
    buildable: true,
    removable: false,
  },
};

/** Cầu qua sông (sông Đà hay sông Thao). */
export const isBridge = (type: BuildingType): type is 'cauSongDa' | 'cauSongThao' => type === 'cauSongDa' || type === 'cauSongThao';

// ---------- Bên kia sông ----------

/** Điện cấp này thì bắc được cầu sang bên kia sông, và Lạc hầu kể đoạn "Bên kia sông". */
export const BEN_KIA_DIEN = 4;
/**
 * Cầu bị lũ cuốn (hư) khi nước dâng tới bậc này, theo cấp cầu: cầu phao tre ở bậc 2, cầu gỗ ở bậc 3, cầu gỗ lớn
 * không sợ lũ.
 */
export const BRIDGE_FLOOD = [2, 3, Infinity];
/** Sai trinh sát dò một khoảnh bên kia sông: giá, thời gian đi (đồng hồ chơi). */
export const SCOUT_COST: Cost = { gao: 60, voOc: 20 };
export const SCOUT_MS = 40_000;
/** Số trinh sát đi cùng lúc: một, từ Điện cấp này thì hai. */
export const SCOUT_TWO_DIEN = 6;
/** Công trình có móng nằm trọn trên đất đặc sản hợp nghề làm ra thêm chừng này. */
export const DAC_SAN_BONUS = 0.3;
/** Dâng lễ kết thân thì bản làng về theo. */
export const VILLAGE_GIFT: Cost = { gao: 600, voOc: 400 };
/**
 * Bản làng đã về theo làm ra bằng chừng này phần một công trình cùng nghề, đủ người, ở cấp bằng cấp Điện (không cần
 * dân). Một làng trọn một công trình thì làng rèn thêm tới gần nửa số sắt ở Điện 6, nên lấy một nửa.
 */
export const VILLAGE_SHARE = 0.5;
/** Đào được của chôn: chừng này phần giá nâng Điện lên cấp kế tiếp, mọi loại tài nguyên trong giá ấy. */
export const TREASURE_SHARE = 0.05;
/** Một bờ bên kia có công trình thì cứ chừng này đợt giặc trên bộ (hay thủy binh) có một đợt tới bờ bên kia. */
export const FAR_RAID_EVERY = 3;

/** Đền Cuông còn nguyên: mỗi đợt thủy binh bớt chừng này phần số thuyền (làm tròn xuống, còn ít nhất một thuyền). */
export const DEN_CUONG_BOATS = 0.2;

// ---------- Ụ nỏ trên thành Cổ Loa (chương 4) ----------

/**
 * Ụ nỏ dựng trên một đoạn thành Cổ Loa còn nguyên, mỗi đoạn một ụ, không tốn thêm đất. Tự bắn một giặc trong tầm.
 * Là một phần của đoạn thành: giặc không nhắm ụ, thành bị phá thì ụ hư theo, sửa thành xong phải sửa ụ.
 * `limit` theo cấp Điện (chỉ số 0 là cấp 1).
 */
/** Đoạn tường có mặt cho lính đứng: thành đất (lũy cấp 2) và thành Cổ Loa. Cổng thành nối liền mặt hai bên. */
export function isWalkWall(b: { type: BuildingType; level: number }): boolean {
  return b.type === 'thanh' || (b.type === 'luy' && b.level >= 2);
}

/**
 * Lính lên mặt thành theo bậc lên thành (`bacThanh`): những binh chủng tự lên khi giữ kinh đô, chúng bắn xa thêm
 * `range` ô (trước khi nhân `RAID_SCALE`), giặc có tầm đánh không quá `melee` ô không với tới.
 */
export const TREN_THANH = {
  units: ['cung', 'no'] as UnitType[],
  range: 1,
  melee: 2,
};

export const U_NO = {
  cost: { voOc: 150, datDa: 150, sat: 30 } as Cost,
  limit: [0, 0, 0, 0, 0, 0, 8, 16, 16, 16],
  dmg: 14,
  range: 4,
  cooldown: 1.4,
};

/** Đường đi hay đồ trang trí: chỉ để nhìn, không chắn giặc, không sợ lũ. */
export const isDecor = (type: BuildingType): boolean => BUILDINGS[type].decor !== undefined;
export const isRoad = (type: BuildingType): boolean => BUILDINGS[type].decor === 'duong';

// ---------- Doanh trại, tướng chỉ huy, bố trí quân ----------

/**
 * Tướng chỉ huy doanh trại, mỗi doanh trại một tướng: Lạc tướng có từ đầu; Thánh Gióng khi thành tráng sĩ, Sơn Tinh khi
 * rước Mị Nương, An Dương Vương khi có nỏ thần, Cao Lỗ khi thắng màn 25 (về trời, về núi, xuống biển rồi vẫn chỉ huy).
 * Doanh trại có tướng mới giữ chỗ quân.
 */
export type TuongId = 'lacTuong' | 'giong' | 'sonTinh' | 'anDuong' | 'caoLo' | 'trungTrac' | 'trungNhi';
export const TUONG_IDS: TuongId[] = ['lacTuong', 'giong', 'sonTinh', 'anDuong', 'caoLo', 'trungTrac', 'trungNhi'];

/**
 * Bốn nữ tướng của Hai Bà Trưng (chương 5 PR 4), theo về khi thắng màn `stage` lần đầu, mỗi người lo một binh chủng
 * `unit`. Ở phó bản đi theo làm phó tướng (đứng cầm cờ sau hàng hậu, không đánh); ở kinh đô giao cho một doanh
 * trại. Binh chủng của nữ tướng được thêm `NU_TUONG_BONUS` máu và sức đánh.
 */
export type NuTuongId = 'leChan' | 'thanhThien' | 'batNan' | 'phungThiChinh';
export const NU_TUONG_IDS: NuTuongId[] = ['leChan', 'thanhThien', 'batNan', 'phungThiChinh'];
export const NU_TUONG: Record<NuTuongId, { stage: number; unit: UnitType }> = {
  leChan: { stage: 34, unit: 'no' },
  thanhThien: { stage: 35, unit: 'cung' },
  batNan: { stage: 37, unit: 'giao' },
  phungThiChinh: { stage: 39, unit: 'voi' },
};
export const NU_TUONG_BONUS = 0.12;
/**
 * Số chỗ quân tối đa mang ra một trận phó bản, theo cấp Điện (chỉ số 0 là cấp 1): bằng sức chứa doanh trại cao nhất
 * dựng được ở cấp Điện ấy, không quá 38, để nhiều doanh trại không làm phó bản dễ đi.
 */
export const FIELD_CAP = [0, 14, 20, 28, 38, 38, 38, 38, 38, 38];
/**
 * Số chỗ quân tối đa bố trí giữ kinh đô (giặc, lũ, yêu tinh, quân Triệu), theo cấp Điện. Tới Điện 5 bằng phó bản;
 * từ chương 2 nhích thêm 6 chỗ mỗi cấp. Lính còn lại là quân dự trữ.
 */
export const GUARD_CAP = [0, 14, 20, 28, 38, 44, 50, 56, 62, 68];

/** Chòi canh lên tới cấp này mới ghép được thành lầu nỏ; một lầu nỏ tính bằng chừng này chòi canh. */
export const LAU_NO_FROM_LEVEL = 8;
export const LAU_NO_TOWERS = 2;
/**
 * Lầu nỏ mỗi phát bắn `targets` giặc khác nhau, mỗi mũi `dmg[cấp − 1]` sát thương. Đền Cổ Loa cộng như với chòi canh.
 * Ghép hai chòi canh đã lên cấp 9, 10 thì lầu nỏ ra ngay cấp 2, 3 (theo chòi thấp hơn), để khỏi mất công nâng chòi.
 */
export const LAU_NO = { targets: 3, dmg: [34, 41, 49], range: 5.5, cooldown: 1.1 };

/**
 * Cổng thành: lính trên lầu cổng bắn giặc trong tầm (nhân `RAID_SCALE` khi giữ kinh đô như chòi canh), mỗi phát
 * `targets[cấp − 1]` giặc, sát thương theo cấp; Đền Cổ Loa cộng như với chòi canh. Khi tìm đường, giặc tính ô cổng
 * giá `pathCost` (lũy tre 12, thành đất 30, thành Cổ Loa 45), nên chịu đi vòng tới cổng thay vì phá thành.
 */
export const CONG_THANH = { dmg: [20, 26, 32], targets: [1, 1, 2], range: 4.5, cooldown: 1.2, pathCost: 8 };

// ---------- Hội Tết bánh chưng bánh giầy ----------

/**
 * Nguyên liệu mỗi phút khi đủ người làm, theo cấp (chỉ số 0 là cấp 1), tính bằng số cái bánh làm được:
 * ruộng nếp ra nếp (bánh chưng hay bánh giầy đều cần), vườn ra đậu xanh và lá dong, chuồng ra thịt lợn.
 * Nguyên liệu không tích trữ.
 */
export const NEP_PER_MIN = [2, 3, 4];
export const DAU_LA_PER_MIN = [1, 1.5, 2];
export const THIT_PER_MIN = [1, 1.5, 2];
/** Bếp gói tối đa chừng này bánh chưng, và giã tối đa chừng này bánh giầy, mỗi phút. */
export const BEP_PER_MIN = [2, 3, 4];
/** Gác bếp chứa tối đa chừng này bánh mỗi loại. */
export const BEP_STORE = [30, 45, 60];
/** Tết đầu tiên tới sau truyện Lang Liêu chừng này; về sau cứ chừng này lại có Tết (tính từ lúc Tết trước mở); mỗi Tết mở chừng này. */
export const TET_FIRST_MS = 2 * 60_000;
export const TET_EVERY_MS = 20 * 60_000;
export const TET_OPEN_MS = 3 * 60_000;
/** Số bánh mỗi loại cần dâng ở Tết đầu tiên, và về sau theo cấp Điện (chỉ số 0 là cấp 1). */
export const TET_FIRST_NEED = 3;
export const TET_NEED = [12, 12, 12, 12, 20, 30, 40, 40, 40, 40];
/** Phúc lành Đất: mọi tài nguyên làm ra thêm chừng này. Phúc lành Trời: quân ta thêm chừng này máu và sức đánh. */
export const TET_DAT_BONUS = 0.15;
export const TET_TROI_BONUS = 0.1;

// ---------- Độ cao ô đất và lũ ----------

/** Ô đất cao nhất đắp được. Đất tự nhiên cao tới bậc 3. */
export const MAX_HEIGHT = 4;
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
/** Đắp một ô đất trống lên thêm một bậc, giá theo bậc hiện tại của ô. */
export const raiseTileCost = (h: number): Cost => ({ datDa: 20 + 10 * h });
/**
 * Đắp nền cả một công trình lên thêm một bậc, giá theo diện tích lõi móng và bậc hiện tại. Lõi móng là móng bỏ
 * viền cỏ một ô (công trình nhiều ô to thêm một ô mỗi chiều cho thoáng, giá đắp nền vẫn như trước).
 */
export const raiseBuildingCost = (w: number, d: number, h: number): Cost => ({
  datDa: round5(8 * (w > 1 ? w - 1 : w) * (d > 1 ? d - 1 : d) * (h + 1)),
});
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
  denCoLoa: 1,
  denCuong: 1,
  denHatMon: 1,
  // Hồ không sợ nước: miếu đứng trên gò giữa hồ.
  hoKimQuy: 99,
  ben: 99,
  langChai: 99,
  benKhoi: 99,
  luy: 99,
  bayChong: 99,
  de: 99,
  thanh: 99,
  congThanh: 99,
  congDe: 99,
  bacThanh: 99,
};
/** Cống đê đóng cao như kè đá (cấp 2 của đê). */
export const CONG_DE_RAISE = DIKE_RAISE[1];
/** Giặc tìm đường coi cống đê như một đoạn kè đá. */
export const CONG_DE_PATH = 40;
/** Ruộng lúa, ruộng nếp được bồi phù sa làm ra thêm chừng này (giữ tới hết mùa lũ sau). */
export const PHU_SA_BONUS = 0.4;
/** Những loại được bồi phù sa khi nước lũ vào qua cống. */
export const PHU_SA_TYPES: BuildingType[] = ['ruong', 'ruongNep'];
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

// ---------- Rèn binh khí ----------

/**
 * Rèn binh khí ở lò rèn: mỗi binh chủng rèn riêng, ba bậc. Bậc 1 cần lò rèn cấp 6, bậc 2 cần lò rèn cấp 7, bậc 3
 * cần lò rèn cấp 9. Mỗi bậc thêm `ARMS_BONUS` vào máu và sức đánh của binh chủng ấy, ở mọi trận.
 */
export const ARMS: { cost: Cost; forgeLevel: number }[] = [
  { cost: { sat: 400, voOc: 400 }, forgeLevel: 6 },
  { cost: { sat: 900, voOc: 900 }, forgeLevel: 7 },
  // Bậc 3 sau truyện: lò rèn cấp 9 (cần Điện 9, tức đã hết truyện).
  { cost: { sat: 2000, voOc: 2000 }, forgeLevel: 9 },
];
export const ARMS_BONUS = 0.1;

/** Đền Phù Đổng (còn nguyên) cộng thêm phần này vào sản lượng mọi tài nguyên, và vào máu, sát thương của quân ta. */
export const TEMPLE_BONUS = 0.1;
/** Hồ Kim Quy còn nguyên: lũy (cả thành đất), thành Cổ Loa, cổng thành thêm chừng này phần máu khi giặc đánh. */
export const KIM_QUY_WALLS = 0.3;
/** Tường được Hồ Kim Quy thêm máu. */
export const KIM_QUY_WALL_TYPES: BuildingType[] = ['luy', 'thanh', 'congThanh'];

/** Sức chứa mỗi loại tài nguyên theo cấp Điện Vua Hùng, chỉ số 0 là cấp 1. Kho thóc cộng thêm. */
export const STORAGE_CAP = [500, 1000, 2000, 4000, 8000, 14000, 22000, 32000, 44000, 60000];

// ---------- Khoảnh đất ----------

/**
 * Giá phát khoảnh rừng đầu tiên (khoảnh thứ 26, sau 25 khoảnh mở sẵn lúc đầu): chỉ gạo và vỏ ốc. Đất bên này sông
 * phát thoải mái, không giới hạn lượt theo cấp Điện; giá tăng từng nấc theo số khoảnh đã phát (`KHOANH_COST_STEP`).
 * Trước khi Điện 10×10 chỉ mở sẵn 16 khoảnh, khoảnh thứ 17 giá 20 gạo, 15 vỏ ốc; khoảnh thứ 26 vẫn giá như nấc cũ,
 * nên phát hết rừng tốn ngần ấy như cũ.
 */
export const KHOANH_COST_BASE = { gao: 34, voOc: 25 };
/** Mỗi khoảnh đã phát thêm thì giá khoảnh sau nhân chừng này. Khoảnh cuối cùng (thứ 100) chừng 2500 gạo. */
export const KHOANH_COST_STEP = 1.06;

// ---------- Cây, đá mọc trên ô trống (kinh đô lớn PR 4) ----------

/** Cây dại (bụi chuối, bụi lá, cây con) dọn được gạo; tảng đá dọn được đất đá. */
export const CAY_DA_KINDS = ['cay', 'da'] as const;
export type CayDaKind = (typeof CAY_DA_KINDS)[number];
/** Số dáng mỗi loại: hình vẽ chọn theo `v`. */
export const CAY_DA_VARIANTS = 3;
/** Đồng hồ chơi chạy chừng này thì mọc thêm một cái, khi kinh đô còn ít hơn `CAY_DA_CAP` cái. */
export const CAY_DA_EVERY_MS = 4 * 60_000;
/** Cái đầu tiên mọc sau chừng này (game mới, hay bản lưu vừa nâng). */
export const CAY_DA_FIRST_MS = 3 * 60_000;
/** Đủ chừng này cái thì thôi mọc thêm (khoảnh vừa phát vẫn có sẵn cây, đá dù đã đủ). */
export const CAY_DA_CAP = 8;
/** Phần cây trong số mọc lên, còn lại là đá. */
export const CAY_DA_TREE_SHARE = 0.6;
/** Khoảnh vừa phát có sẵn chừng này cái: thấp nhất, cao nhất. */
export const CAY_DA_KHOANH: [number, number] = [1, 2];
/**
 * Của được khi dọn, theo cấp Điện (chỉ số 0 là cấp 1): từ Điện 5 trở lên bằng chừng 10–15 giây sản lượng của kinh đô;
 * các cấp đầu kinh đô còn làm ra ít nên dọn đáng hơn.
 */
export const CAY_DA_REWARD: Record<CayDaKind, Cost[]> = {
  cay: [20, 35, 60, 90, 130, 190, 270, 380, 530, 740].map((gao) => ({ gao })),
  da: [10, 18, 30, 45, 65, 95, 135, 190, 265, 370].map((datDa) => ({ datDa })),
};

export const START_RESOURCES: Resources = { gao: 150, voOc: 120, datDa: 0, sat: 0, go: 0 };
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
export const TRADE_VALUE: Resources = { gao: 1, voOc: 1.4, datDa: 1.2, sat: 3, go: 1.3 };
/** Thuyền buôn trả hơn giá trị thật chừng này để người chơi thấy đáng đổi. */
export const TRADE_BONUS = 1.15;

// ---------- Quân đội và giặc ----------

export type UnitType = 'giao' | 'cung' | 'voi' | 'no';
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
  | 'thuyTinh'
  | 'quyNui'
  | 'maTroi'
  | 'hoTinh'
  | 'gaTrang'
  | 'linhTrieu'
  | 'noTrieu'
  | 'kyBinh'
  | 'trieuDa'
  | 'linhThuy'
  | 'cungThuyen'
  | 'linhRiu'
  | 'tuongThuy'
  | 'linhHan'
  | 'noHan'
  | 'giapHan'
  | 'toDinh'
  | 'maVien'
  | 'lauThuyen';
export const UNIT_TYPES: UnitType[] = ['giao', 'cung', 'voi', 'no'];

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
  /** Nơi ở riêng của binh chủng: luyện ở đó (còn nguyên mới luyện được). */
  home: BuildingType;
  /** Số chỗ chiếm trong doanh trại. Lính tuyển riêng, không lấy người từ dân. */
  space: number;
  /** Gạo ăn mỗi phút. */
  upkeep: number;
}

/** Quân nặng của giặc: giáo binh và lính nỏ khắc chế. */
const HEAVY: EnemyType[] = ['chienXa', 'caSau', 'hoTinh', 'kyBinh', 'linhRiu', 'giapHan'];

/**
 * Quân ta: giáo binh thắng quân nặng (chiến xa, cá sấu, hổ tinh, kỵ binh, lính rìu, giáp sĩ Hán), cung thủ thắng
 * lính bộ (lính giáo Ân, tôm binh, quỷ núi, lính khiên Triệu, lính thủy, lính kích Hán), voi chiến thắng quân bắn xa
 * (cung thủ Ân, cá phun nước, ma trơi, nỏ thủ Triệu, cung thuyền, nỏ thủ Hán).
 * Lính nỏ (chương 4) đứng ngoài vòng khắc chế: đánh mạnh gấp đôi quân nặng và mọi trùm.
 */
export const UNITS: Record<UnitType, UnitDef> = {
  giao: { hp: 60, dmg: 8, range: 0.8, speed: 1.6, cooldown: 1.0, strongVs: HEAVY, cost: { gao: 20, voOc: 8 }, home: 'traiGiao', space: 1, upkeep: 0.6 },
  cung: { hp: 40, dmg: 7, range: 3.8, speed: 1.5, cooldown: 1.2, strongVs: ['giaoAn', 'tomBinh', 'quyNui', 'linhTrieu', 'linhThuy', 'linhHan'], cost: { gao: 25, voOc: 8, sat: 4 }, home: 'traiCung', space: 1, upkeep: 0.6 },
  voi: { hp: 200, dmg: 15, range: 0.9, speed: 1.1, cooldown: 1.5, strongVs: ['cungAn', 'caPhun', 'maTroi', 'noTrieu', 'cungThuyen', 'noHan'], cost: { gao: 60, voOc: 20, sat: 12 }, home: 'chuongVoi', space: 3, upkeep: 1.5 },
  no: {
    hp: 50,
    dmg: 26,
    range: 4.5,
    speed: 1.3,
    cooldown: 2.4,
    strongVs: [...HEAVY, 'phoTuong', 'daiTuong', 'thuongLuong', 'thuyTinh', 'gaTrang', 'trieuDa', 'tuongThuy', 'toDinh', 'maVien'],
    cost: { gao: 50, voOc: 15, sat: 10 },
    home: 'traiNo',
    space: 2,
    upkeep: 1.0,
  },
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
  // Yêu tinh núi Thất Diệu: quỷ núi cầm chày đá, ma trơi phun lửa xanh từ xa, hổ tinh vồ nhanh. Trùm là gà trắng nghìn năm.
  quyNui: { hp: 90, dmg: 11, range: 0.8, speed: 1.5, cooldown: 1.0 },
  maTroi: { hp: 55, dmg: 10, range: 3.6, speed: 1.4, cooldown: 1.3 },
  hoTinh: { hp: 280, dmg: 23, range: 0.9, speed: 2.1, cooldown: 1.4, strongVs: ['cung'] },
  gaTrang: { hp: 1300, dmg: 30, range: 1.2, speed: 1.4, cooldown: 1.2 },
  // Quân Triệu Đà (nước Nam Việt): lính khiên, nỏ thủ bắn xa, kỵ binh lao nhanh. Trùm là Triệu Đà cưỡi ngựa.
  linhTrieu: { hp: 95, dmg: 11, range: 0.8, speed: 1.4, cooldown: 1.0 },
  noTrieu: { hp: 55, dmg: 11, range: 3.8, speed: 1.3, cooldown: 1.4 },
  kyBinh: { hp: 290, dmg: 24, range: 0.9, speed: 2.2, cooldown: 1.4, strongVs: ['cung'] },
  trieuDa: { hp: 1700, dmg: 34, range: 1.3, speed: 1.3, cooldown: 1.2 },
  // Thủy binh Triệu đội lốt cướp sông, đi thuyền tới: lính thủy chạy nhanh, cung thuyền bắn xa,
  // lính rìu giáp mây là quân nặng.
  linhThuy: { hp: 100, dmg: 12, range: 0.8, speed: 1.7, cooldown: 1.0 },
  cungThuyen: { hp: 60, dmg: 12, range: 3.8, speed: 1.3, cooldown: 1.4 },
  linhRiu: { hp: 310, dmg: 25, range: 0.9, speed: 1.5, cooldown: 1.4, strongVs: ['cung'] },
  // Tướng thủy binh Triệu cầm đao dài, trùm màn 28 ở cửa sông.
  tuongThuy: { hp: 1500, dmg: 32, range: 1.2, speed: 1.3, cooldown: 1.2 },
  // Quân Hán (chương 5), mạnh hơn quân Triệu chừng 10%: lính kích, nỏ thủ bắn xa, giáp sĩ là quân nặng.
  linhHan: { hp: 105, dmg: 13, range: 1.0, speed: 1.4, cooldown: 1.0 },
  noHan: { hp: 60, dmg: 13, range: 4.2, speed: 1.3, cooldown: 1.5 },
  giapHan: { hp: 330, dmg: 26, range: 0.9, speed: 1.5, cooldown: 1.4, strongVs: ['cung'] },
  // Thái thú Tô Định, trùm màn 36: còn ít máu thì bỏ chạy (`TO_DINH_FLEE`).
  toDinh: { hp: 1600, dmg: 30, range: 1.2, speed: 1.3, cooldown: 1.2 },
  // Phục Ba tướng quân Mã Viện, trùm màn 39, 40: cưỡi ngựa trắng, có Lệnh nỏ (`MA_VIEN_VOLLEY`).
  maVien: { hp: 2000, dmg: 36, range: 1.3, speed: 1.3, cooldown: 1.2 },
  // Lâu thuyền Hán (thủy quân Hán ở kinh đô): đậu dưới sông, mỗi loạt 3 mũi nỏ (`LAU_THUYEN`). Chỉ quân bắn xa và
  // công trình phòng thủ bắn tới. Bắn xa hơn cung thủ, nên cung thủ đứng bờ sông hay ngã trước khi thuyền chìm:
  // máu, sát thương thấp hơn đề xuất (1800, 18) cho đợt đầu vừa sức quân mẫu (`chuong5.test.ts`).
  lauThuyen: { hp: 900, dmg: 12, range: 5, speed: 0.6, cooldown: 2 },
};

/**
 * Trùm của phó bản: phó tướng ở màn 4, đại tướng ở chân núi Trâu, thuồng luồng ở màn 12, Thủy Tinh ở đỉnh Tản Viên,
 * gà trắng nghìn năm ở đỉnh Thất Diệu, Triệu Đà dưới chân thành Cổ Loa (và trên đường ra biển), tướng thủy binh
 * Triệu ở cửa sông.
 */
export const BOSSES: EnemyType[] = ['phoTuong', 'daiTuong', 'thuongLuong', 'thuyTinh', 'gaTrang', 'trieuDa', 'tuongThuy', 'toDinh', 'maVien'];
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
/**
 * Thủy Tinh (trùm màn 16) có hai phép:
 * - Hô mưa gọi gió: cứ `cooldown` giây (lần đầu sau `first` giây) một con sóng lớn quét một dải dài `length`,
 *   rộng `width` từ Thủy Tinh về phía quân ta gần nhất (chỉ khi quân ta trong tầm `reach`). Ai trúng sóng mất
 *   `dmg` máu, bị đẩy lùi `push` ô, đi chậm còn `slow` tốc độ trong `slowS` giây.
 * - Gọi thủy quái: cứ `cooldown` giây (lần đầu sau `first` giây) gọi `count` tôm binh từ dưới nước lên quanh mình,
 *   tối đa `times` lần mỗi trận. Tôm binh gọi lên khỏe như tôm binh của màn.
 */
export const TT_WAVE = { first: 6, cooldown: 12, reach: 8, length: 6, width: 2.6, dmg: 30, push: 1.4, slow: 0.5, slowS: 3 };
export const TT_SUMMON = { first: 9, cooldown: 15, count: 3, times: 4 };
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

// ---------- An Dương Vương, thành Cổ Loa và nỏ thần ----------

/** An Dương Vương cầm nỏ: tướng bắn xa, mũi tên găm cả giặc đứng quanh mục tiêu như đòn của các tướng khác. */
export const ADV: FighterStats = { hp: 620, dmg: 19, range: 4.2, speed: 1.9, cooldown: 1.0 };
export const ADV_REST_MS = 2 * 60_000;
/** Nỏ thần: một phát tên bay ra hóa muôn mũi, trúng mọi kẻ địch còn đứng trên bãi. */
export const NO_THAN = { dmg: 80 };
/** Rùa Vàng nổi lên che chở: quân ta hồi một phần máu và chỉ chịu một phần sát thương trong một lúc. */
export const KIM_QUY = { heal: 0.3, reduce: 0.5 };
/** Cao Lỗ chế nỏ thần ở lò rèn: cần lò rèn cấp này, đủ vòng thành và đã có vuốt Rùa Vàng (thắng màn 19). */
export const NO_THAN_FORGE = { cost: { sat: 400, datDa: 600, voOc: 600 } as Cost, forgeLevel: 5 };
/** Thành Cổ Loa đủ chừng này vòng quanh Điện thì Rùa Vàng tặng vuốt làm lẫy nỏ. */
export const RINGS_NEEDED = 3;
/** Đền Cổ Loa còn nguyên: lính nỏ trên chòi canh bắn mạnh hơn, xa hơn. */
export const CO_LOA_TOWER = { dmg: 1.5, range: 1 };
// ---------- Cao Lỗ (chương 4) ----------

/** Cao Lỗ cầm nỏ lớn: tướng bắn xa thứ hai, mũi tên găm cả giặc đứng quanh mục tiêu như đòn của các tướng khác. */
export const CAO_LO: FighterStats = { hp: 700, dmg: 20, range: 4.4, speed: 1.9, cooldown: 1.0 };
export const CAO_LO_REST_MS = 2 * 60_000;
/** Nỏ liên châu: một loạt tên rơi xuống chỗ giặc đứng đông nhất, mọi giặc trong bán kính mất chừng này máu. */
export const LIEN_CHAU = { dmg: 120, radius: 3.5 };
/** Lệnh bắn: trong lúc có lệnh, lính nỏ (và khi giữ kinh đô cả ụ nỏ, lầu nỏ) bắn nhanh gấp chừng này lần. */
export const LENH_BAN = { rate: 2 };

// ---------- Hai Bà Trưng (chương 5) ----------

/** Trưng Trắc cưỡi voi trận đánh gần, đứng hàng đầu. */
export const TRUNG_TRAC: FighterStats = { hp: 650, dmg: 20, range: 1.2, speed: 1.6, cooldown: 1.1 };
/** Trưng Nhị bắn cung trên lưng voi trận, đứng lùi sau hàng đầu như An Dương Vương. */
export const TRUNG_NHI: FighterStats = { hp: 520, dmg: 17, range: 4.0, speed: 1.6, cooldown: 1.1 };
/** Bà nào kiệt sức thì nghỉ chừng này thời gian chơi; bà kia vẫn ra trận được. */
export const HAI_BA_REST_MS = 2 * 60_000;
/**
 * Voi xung trận (Trưng Trắc): voi lao thẳng `length` ô về phía giặc đứng đông nhất. Giặc trên đường (rộng `width` ô)
 * mất `dmg` máu, bị hất sang hai bên `push` ô và choáng `stun` giây.
 */
export const VOI_XUNG = { dmg: 90, length: 5, width: 1.6, push: 1, stun: 1.5 };
/**
 * Hiệu triệu (Trưng Nhị): `count` nghĩa binh chạy ra quanh voi, đánh tới hết trận (mỗi lúc nhiều nhất `count` người,
 * gọi lại thì bù chỗ người đã ngã); quân ta trong `radius` ô quanh voi hồi `heal` phần máu.
 */
export const HIEU_TRIEU = { count: 5, radius: 3, heal: 0.15 };
/**
 * Nghĩa binh: không luyện, không chiếm chỗ doanh trại, không ăn gạo, không chết thật. Không được cộng binh khí, huân
 * công, Đền; không thuộc vòng khắc chế.
 */
export const NGHIA_BINH: FighterStats = { hp: 55, dmg: 7, range: 0.8, speed: 1.6, cooldown: 1.0 };
/** Đền Hát Môn còn nguyên: mỗi trận giữ kinh đô có chừng này nghĩa binh từ đền ra đánh giặc. */
export const HAT_MON_NGHIA_BINH = 6;
/** Tô Định còn chừng này phần máu thì bỏ chạy về cuối bãi, nhanh gấp `speed` lần; chạy thoát thì tính như đã hạ. */
export const TO_DINH_FLEE = { at: 0.3, speed: 1.5 };
/**
 * Lệnh nỏ của Mã Viện: lần đầu sau `first` giây, rồi cứ `every` giây, một loạt tên nỏ rơi xuống chỗ quân ta đứng đông
 * nhất, `dmg` sát thương mỗi người trong `radius` ô. Tên rơi sau `delay` giây kể từ lúc phất cờ.
 */
export const MA_VIEN_VOLLEY = { first: 8, every: 14, dmg: 30, radius: 2, delay: 0.8 };
/**
 * Lâu thuyền Hán: đậu giữa ba ô sông sát bờ, không cập bờ. Cứ `cooldown` giây (ở `ENEMIES.lauThuyen`) bắn một loạt
 * `shots` mũi nỏ vào công trình hay lính gần nhất trong tầm, mỗi mũi `dmg` sát thương. Chỉ quân bắn xa và công trình
 * phòng thủ bắn tới. Đậu cách bờ `moor` ô, thuyền này cách thuyền kia `spacing` ô dọc bờ.
 */
export const LAU_THUYEN = { shots: 3, moor: 1.5, spacing: 5 };

/** Vào chương 3, hay khi An Dương Vương cầm nỏ thần: đợt giặc đầu tiên trên bộ tới sau chừng này thời gian chơi. */
export const FIRST_LAND_MS = 3 * 60_000;

/**
 * Ai đánh kinh đô: giặc Ân (chương 1), Thủy Tinh dâng nước kèm thủy quái, yêu tinh núi Thất Diệu, quân Triệu Đà
 * trên bộ, thủy binh Triệu đi thuyền (chương 4), hay quân Hán trên bộ (chương 5).
 */
export type Foe = 'an' | 'thuy' | 'yeu' | 'trieu' | 'thuyBinh' | 'han' | 'thuyHan';

/** Yêu tinh núi Thất Diệu đêm thứ `n` kéo về phá thành. */
export function yeuForces(n: number): Partial<Record<EnemyType, number>> {
  return {
    quyNui: Math.min(9 + n, 18),
    maTroi: Math.min(4 + n, 12),
    hoTinh: Math.min(2 + Math.floor(n / 2), 6),
  };
}
export const yeuHpScale = (n: number) => 1.6 + 0.12 * (n - 1);

/** Quân Triệu Đà đợt thứ `n` đánh kinh đô. */
export function trieuForces(n: number): Partial<Record<EnemyType, number>> {
  return {
    linhTrieu: Math.min(10 + n, 18),
    noTrieu: Math.min(5 + n, 12),
    kyBinh: Math.min(2 + Math.floor((n + 1) / 2), 7),
  };
}
export const trieuHpScale = (n: number) => 1.9 + 0.12 * (n - 1);

/** Thủy binh Triệu đợt thứ `n` đi thuyền đánh kinh đô. */
export function thuyBinhForces(n: number): Partial<Record<EnemyType, number>> {
  return {
    linhThuy: Math.min(9 + n, 18),
    cungThuyen: Math.min(5 + n, 12),
    linhRiu: Math.min(2 + Math.floor((n + 1) / 2), 7),
  };
}
export const thuyBinhHpScale = (n: number) => 2.0 + 0.12 * (n - 1);

/** Quân Hán trên bộ đợt thứ `n` đánh kinh đô (chương 5). */
export function hanForces(n: number): Partial<Record<EnemyType, number>> {
  return {
    linhHan: Math.min(10 + n, 20),
    noHan: Math.min(5 + Math.floor(n / 2), 12),
    giapHan: Math.min(2 + Math.floor(n / 3), 6),
  };
}
export const hanHpScale = (n: number) => 2.2 + 0.12 * (n - 1);

/**
 * Thủy quân Hán đợt thứ `n` (từ khi Mã Viện sang): lính kích và giáp sĩ đi thuyền chở lính cập bờ, kèm lâu thuyền
 * (1 chiếc ở đợt 1, 2; 2 chiếc từ đợt 3) đậu dưới sông bắn lên bờ.
 */
export function thuyHanForces(n: number): Partial<Record<EnemyType, number>> {
  return {
    linhHan: Math.min(10 + n, 20),
    giapHan: Math.min(3 + Math.floor(n / 2), 8),
    lauThuyen: n >= 3 ? 2 : 1,
  };
}
export const thuyHanHpScale = (n: number) => 2.2 + 0.12 * (n - 1);
/**
 * Thuyền giặc: mỗi thuyền chở `carry` lính, hiện ở mép sông xa rồi chèo vào bờ gần nhất với tốc độ `speed`
 * (ô mỗi giây), thuyền sau rời bến chậm hơn thuyền trước `stagger` giây. Thuyền không có máu, neo tới hết trận.
 */
export const BOAT = { carry: 6, speed: 0.6, stagger: 1.2 };
/** Vào chương 4: đợt thủy binh đầu tiên tới sau chừng này thời gian chơi. */
export const FIRST_THUY_BINH_MS = 3 * 60_000;
/** Vào chương 5: đợt quân Hán đầu tiên tới sau chừng này thời gian chơi. */
export const FIRST_HAN_MS = 3 * 60_000;

/**
 * Trận giữ kinh đô: kinh đô đã giãn rộng chừng này lần (công trình to hơn một ô mỗi chiều), nên mọi tầm bắn,
 * tốc độ, bán kính kỹ năng tính bằng ô đều nhân với hệ số này. Trận ngoài bãi giữ nguyên.
 */
export const RAID_SCALE = 1.4;

/** Chòi canh tự bắn giặc trong tầm (ô, trước khi nhân `RAID_SCALE`). */
export const TOWER = { range: 4.5, cooldown: 1.1, dmg: [7, 9, 12, 15, 19, 24, 30, 37, 44, 52] };
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
export const DEFAULT_ROWS: Record<UnitType, Row> = { giao: 'tien', voi: 'trung', cung: 'hau', no: 'hau' };
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
  quyNui: 'tien',
  hoTinh: 'trung',
  maTroi: 'hau',
  gaTrang: 'hau',
  linhTrieu: 'tien',
  kyBinh: 'trung',
  noTrieu: 'hau',
  trieuDa: 'hau',
  linhThuy: 'tien',
  linhRiu: 'trung',
  cungThuyen: 'hau',
  tuongThuy: 'hau',
  linhHan: 'tien',
  giapHan: 'trung',
  noHan: 'hau',
  toDinh: 'hau',
  maVien: 'hau',
  lauThuyen: 'hau',
};

/**
 * Bãi chiến: rộng `w` ô, dài `d` ô; hàng đầu hai bên cách nhau `gap` ô.
 * Ngoài bãi mọi người đều bền hơn `hpMul` lần để trận kéo dài, kịp bấm kỹ năng.
 * Quá `maxS` giây chưa phá được giặc thì coi như thua.
 */
export const FIELD = { w: 9, d: 22, gap: 10, hpMul: 1.6, maxS: 90 };

export type Terrain = 'rung' | 'benSong' | 'lang' | 'don' | 'nui' | 'doi' | 'ngap' | 'tanVien' | 'thatDieu' | 'coLoa' | 'cuaSong' | 'moDa' | 'benKia' | 'hatMon' | 'luyLau' | 'langBac' | 'camKhe';

export type Chapter = 1 | 2 | 3 | 4 | 5;

/** Một đợt giặc kéo tới bãi chiến lúc `at` giây (màn cầm cự). */
export interface StageWave {
  at: number;
  enemies: Partial<Record<EnemyType, number>>;
}

export interface StageDef {
  chapter: Chapter;
  /** Cấp Điện cần có để đánh màn này. */
  minDien: number;
  /** Cần Thánh Gióng đã vươn vai thành tráng sĩ. */
  needsGiong: boolean;
  /** Cần Sơn Tinh đã rước Mị Nương. Sơn Tinh kiệt sức thì Gióng hiển linh đánh thay được, trừ màn `sonOnly`. */
  needsSon?: boolean;
  /** Chỉ Sơn Tinh ra trận được, Gióng không đánh thay (màn 16: chỉ Sơn Tinh mới địch nổi Thủy Tinh). */
  sonOnly?: boolean;
  /** Cần An Dương Vương đã có nỏ thần, cùng ra trận. */
  needsAdv?: boolean;
  /** Cần Cao Lỗ đã cầm quân (thắng màn 25), cùng ra trận. */
  needsCaoLo?: boolean;
  /** Giặc đứng sẵn trên bãi lúc vào trận. Màn cầm cự thì là đợt đầu. */
  enemies: Partial<Record<EnemyType, number>>;
  /** Màn cầm cự: các đợt giặc kéo tới sau (ngoài đợt đầu `enemies`). */
  waves?: StageWave[];
  /** Màn cầm cự: giữ được chừng này giây mà quân ta chưa chết hết thì thắng, không cần diệt hết giặc. */
  holdS?: number;
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
 * Chương 3: màn 17–19 diệt yêu tinh núi Thất Diệu (trùm gà trắng nghìn năm), màn 20–24 đánh quân Triệu Đà
 * cùng An Dương Vương, màn 24 là Triệu Đà.
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
  { chapter: 2, minDien: 5, needsGiong: false, enemies: { tomBinh: 10, caPhun: 6, caSau: 2 }, hpScale: 3.2, reward: { gao: 1200, voOc: 800, datDa: 600, sat: 150 }, terrain: 'doi' },
  { chapter: 2, minDien: 5, needsGiong: false, enemies: { tomBinh: 11, caPhun: 7, caSau: 3 }, hpScale: 2.8, reward: { gao: 1300, voOc: 900, datDa: 700, sat: 180 }, terrain: 'benSong' },
  { chapter: 2, minDien: 5, needsGiong: false, enemies: { tomBinh: 12, caPhun: 8, caSau: 3 }, hpScale: 2.5, reward: { gao: 1400, voOc: 1000, datDa: 800, sat: 200 }, terrain: 'rung' },
  { chapter: 2, minDien: 5, needsGiong: false, needsSon: true, enemies: { tomBinh: 12, caPhun: 7, caSau: 3, thuongLuong: 1 }, hpScale: 2.1, reward: { gao: 1800, voOc: 1200, datDa: 1000, sat: 260 }, terrain: 'ngap' },
  { chapter: 2, minDien: 5, needsGiong: false, needsSon: true, enemies: { tomBinh: 14, caPhun: 8, caSau: 4 }, hpScale: 2.1, reward: { gao: 2000, voOc: 1300, datDa: 1100, sat: 280 }, terrain: 'lang' },
  { chapter: 2, minDien: 5, needsGiong: false, needsSon: true, enemies: { tomBinh: 14, caPhun: 8, caSau: 4 }, hpScale: 2.1, reward: { gao: 2200, voOc: 1500, datDa: 1200, sat: 300 }, terrain: 'benSong' },
  { chapter: 2, minDien: 5, needsGiong: false, needsSon: true, enemies: { tomBinh: 14, caPhun: 9, caSau: 4 }, hpScale: 2.5, reward: { gao: 2500, voOc: 1700, datDa: 1400, sat: 350 }, terrain: 'nui' },
  { chapter: 2, minDien: 5, needsGiong: false, needsSon: true, sonOnly: true, enemies: { tomBinh: 12, caPhun: 8, caSau: 3, thuyTinh: 1 }, hpScale: 1.8, reward: { gao: 3000, voOc: 2000, datDa: 2000, sat: 500 }, terrain: 'tanVien' },
  { chapter: 3, minDien: 5, needsGiong: false, enemies: { quyNui: 12, maTroi: 7, hoTinh: 3 }, hpScale: 2.6, reward: { gao: 2600, voOc: 1800, datDa: 1600, sat: 400 }, terrain: 'thatDieu' },
  { chapter: 3, minDien: 5, needsGiong: false, enemies: { quyNui: 13, maTroi: 8, hoTinh: 4 }, hpScale: 2.4, reward: { gao: 2800, voOc: 2000, datDa: 1800, sat: 450 }, terrain: 'rung' },
  { chapter: 3, minDien: 5, needsGiong: false, enemies: { quyNui: 12, maTroi: 7, hoTinh: 3, gaTrang: 1 }, hpScale: 2.4, reward: { gao: 3200, voOc: 2200, datDa: 2000, sat: 500 }, terrain: 'thatDieu' },
  { chapter: 3, minDien: 5, needsGiong: false, needsAdv: true, enemies: { linhTrieu: 14, noTrieu: 8, kyBinh: 4 }, hpScale: 1.9, reward: { gao: 3400, voOc: 2400, datDa: 2200, sat: 550 }, terrain: 'rung' },
  { chapter: 3, minDien: 5, needsGiong: false, needsAdv: true, enemies: { linhTrieu: 14, noTrieu: 9, kyBinh: 4 }, hpScale: 1.8, reward: { gao: 3600, voOc: 2600, datDa: 2400, sat: 600 }, terrain: 'benSong' },
  { chapter: 3, minDien: 5, needsGiong: false, needsAdv: true, enemies: { linhTrieu: 15, noTrieu: 9, kyBinh: 4 }, hpScale: 1.8, reward: { gao: 3800, voOc: 2800, datDa: 2600, sat: 650 }, terrain: 'nui' },
  { chapter: 3, minDien: 5, needsGiong: false, needsAdv: true, enemies: { linhTrieu: 14, noTrieu: 9, kyBinh: 5 }, hpScale: 2.1, reward: { gao: 4000, voOc: 3000, datDa: 2800, sat: 700 }, terrain: 'lang' },
  { chapter: 3, minDien: 5, needsGiong: false, needsAdv: true, enemies: { linhTrieu: 13, noTrieu: 9, kyBinh: 4, trieuDa: 1 }, hpScale: 1.9, reward: { gao: 5000, voOc: 4000, datDa: 3500, sat: 900 }, terrain: 'coLoa' },
  // Chương 4: màn 25–28 dẹp thủy binh Triệu đội lốt cướp sông (trùm tướng thủy binh ở cửa sông), màn 29–31 chặn
  // quân Triệu Đà trước thành Cổ Loa, màn 32 hộ giá vua ra biển Mộ Dạ (cầm cự 90 giây).
  { chapter: 4, minDien: 5, needsGiong: false, needsAdv: true, enemies: { linhThuy: 13, cungThuyen: 8, linhRiu: 4 }, hpScale: 2.3, reward: { gao: 5500, voOc: 4500, datDa: 4000, sat: 1000 }, terrain: 'benSong' },
  { chapter: 4, minDien: 5, needsGiong: false, needsCaoLo: true, enemies: { linhThuy: 14, cungThuyen: 8, linhRiu: 4 }, hpScale: 2.2, reward: { gao: 6000, voOc: 5000, datDa: 4400, sat: 1100 }, terrain: 'benSong' },
  { chapter: 4, minDien: 5, needsGiong: false, needsCaoLo: true, enemies: { linhThuy: 14, cungThuyen: 9, linhRiu: 5 }, hpScale: 2.0, reward: { gao: 6500, voOc: 5400, datDa: 4800, sat: 1200 }, terrain: 'lang' },
  { chapter: 4, minDien: 5, needsGiong: false, needsCaoLo: true, enemies: { linhThuy: 13, cungThuyen: 8, linhRiu: 4, tuongThuy: 1 }, hpScale: 2.0, reward: { gao: 7200, voOc: 6000, datDa: 5200, sat: 1300 }, terrain: 'cuaSong' },
  { chapter: 4, minDien: 5, needsGiong: false, needsCaoLo: true, enemies: { linhTrieu: 7, linhThuy: 7, noTrieu: 5, cungThuyen: 4, kyBinh: 3, linhRiu: 2 }, hpScale: 2.1, reward: { gao: 7600, voOc: 6300, datDa: 5500, sat: 1350 }, terrain: 'lang' },
  { chapter: 4, minDien: 5, needsGiong: false, needsCaoLo: true, enemies: { linhTrieu: 7, linhThuy: 7, noTrieu: 5, cungThuyen: 5, kyBinh: 2, linhRiu: 2 }, hpScale: 2.1, reward: { gao: 8000, voOc: 6600, datDa: 5800, sat: 1400 }, terrain: 'rung' },
  { chapter: 4, minDien: 5, needsGiong: false, needsCaoLo: true, enemies: { linhTrieu: 8, linhThuy: 7, noTrieu: 5, cungThuyen: 4, kyBinh: 2, linhRiu: 2 }, hpScale: 2.2, reward: { gao: 8500, voOc: 7000, datDa: 6200, sat: 1500 }, terrain: 'coLoa' },
  {
    chapter: 4,
    minDien: 5,
    needsGiong: false,
    needsCaoLo: true,
    enemies: { linhTrieu: 3, linhThuy: 3, noTrieu: 2, cungThuyen: 2 },
    waves: [
      { at: 30, enemies: { linhTrieu: 3, linhThuy: 2, noTrieu: 2, kyBinh: 2, linhRiu: 1 } },
      { at: 60, enemies: { linhTrieu: 2, linhThuy: 2, noTrieu: 1, cungThuyen: 1, kyBinh: 1, linhRiu: 1, trieuDa: 1 } },
    ],
    holdS: 90,
    hpScale: 3.0,
    reward: { gao: 9000, voOc: 7500, datDa: 6500, sat: 1600 },
    terrain: 'moDa',
  },
  // Chương 5: Hai Bà Trưng cùng ra trận (cần ít nhất một bà khỏe). Màn 36 là thái thú Tô Định ở thành Luy Lâu.
  { chapter: 5, minDien: 5, needsGiong: false, enemies: { linhHan: 13, noHan: 8, giapHan: 4 }, hpScale: 1.8, reward: { gao: 9500, voOc: 8000, datDa: 7000, sat: 1700 }, terrain: 'lang' },
  { chapter: 5, minDien: 5, needsGiong: false, enemies: { linhHan: 13, noHan: 8, giapHan: 4 }, hpScale: 2.0, reward: { gao: 10000, voOc: 8400, datDa: 7300, sat: 1800 }, terrain: 'hatMon' },
  { chapter: 5, minDien: 5, needsGiong: false, enemies: { linhHan: 12, noHan: 9, giapHan: 4 }, hpScale: 2.0, reward: { gao: 10500, voOc: 8800, datDa: 7700, sat: 1900 }, terrain: 'coLoa' },
  { chapter: 5, minDien: 5, needsGiong: false, enemies: { linhHan: 12, noHan: 8, giapHan: 4, toDinh: 1 }, hpScale: 1.85, reward: { gao: 11500, voOc: 9500, datDa: 8300, sat: 2000 }, terrain: 'luyLau' },
  // Màn 37–40: Mã Viện sang. Màn 39 là Mã Viện ở hồ Lãng Bạc, màn 40 giữ cửa rừng Cấm Khê cho dân rút về núi
  // (cầm cự 100 giây, Mã Viện tới ở đợt cuối).
  { chapter: 5, minDien: 5, needsGiong: false, enemies: { linhHan: 13, noHan: 8, giapHan: 4 }, hpScale: 2.1, reward: { gao: 12000, voOc: 10000, datDa: 8700, sat: 2100 }, terrain: 'cuaSong' },
  { chapter: 5, minDien: 5, needsGiong: false, enemies: { linhHan: 12, noHan: 9, giapHan: 4 }, hpScale: 2.0, reward: { gao: 12500, voOc: 10500, datDa: 9100, sat: 2200 }, terrain: 'langBac' },
  // Mã Viện không bỏ chạy như Tô Định và có Lệnh nỏ, nên máu giặc thấp hơn các màn trước.
  { chapter: 5, minDien: 5, needsGiong: false, enemies: { linhHan: 12, noHan: 8, giapHan: 4, maVien: 1 }, hpScale: 1.5, reward: { gao: 13500, voOc: 11200, datDa: 9800, sat: 2400 }, terrain: 'langBac' },
  {
    chapter: 5,
    minDien: 5,
    needsGiong: false,
    enemies: { linhHan: 5, noHan: 3, giapHan: 2 },
    waves: [
      { at: 35, enemies: { linhHan: 4, noHan: 3, giapHan: 3 } },
      { at: 70, enemies: { linhHan: 4, noHan: 2, giapHan: 2, maVien: 1 } },
    ],
    holdS: 100,
    hpScale: 2.8,
    reward: { gao: 14000, voOc: 12000, datDa: 10500, sat: 2500 },
    terrain: 'camKhe',
  },
];

/** Mọi giặc của màn, cả các đợt kéo tới sau (màn cầm cự). */
export function stageEnemies(def: StageDef): Partial<Record<EnemyType, number>> {
  const out: Partial<Record<EnemyType, number>> = { ...def.enemies };
  for (const w of def.waves ?? []) for (const k of Object.keys(w.enemies) as EnemyType[]) out[k] = (out[k] ?? 0) + (w.enemies[k] ?? 0);
  return out;
}
/** Đánh lại màn đã qua được phần này của thưởng lần đầu. */
export const REPLAY_SHARE = 0.3;

/**
 * Thử thách phó bản (chương 4 phần 4): thắng màn nào ở chế độ thường thì màn ấy mở một thử thách.
 * - `giacDu`: giặc dữ, sát thương giặc nhân `GIAC_DU_DMG`;
 * - `khongTuong`: trận không có tướng nào;
 * - `haiBinh`: chỉ được mang hai binh chủng `units`.
 */
export type ChallengeKind = 'giacDu' | 'khongTuong' | 'haiBinh';
export interface ChallengeDef {
  kind: ChallengeKind;
  /** Thử thách Hai binh chủng: hai binh chủng được mang. */
  units?: [UnitType, UnitType];
  /** Hệ số máu giặc của thử thách (thay cho hệ số của màn thường). */
  hpScale: number;
  /** Giặc kéo thêm tới, ngoài giặc của màn thường (màn 1–4 vốn ít giặc). */
  extra?: Partial<Record<EnemyType, number>>;
}
export const GIAC_DU_DMG = 1.25;
const du = (hpScale: number, extra?: Partial<Record<EnemyType, number>>): ChallengeDef => ({ kind: 'giacDu', hpScale, ...(extra ? { extra } : {}) });
const kt = (hpScale: number): ChallengeDef => ({ kind: 'khongTuong', hpScale });
const hai = (a: UnitType, b: UnitType, hpScale: number, extra?: Partial<Record<EnemyType, number>>): ChallengeDef => ({
  kind: 'haiBinh',
  units: [a, b],
  hpScale,
  ...(extra ? { extra } : {}),
});
/**
 * Thử thách của từng màn 1–40 (chỉ số 0 là màn 1). Giặc dữ ở các màn có trùm và màn 1, 3. Hai binh chủng thường bỏ
 * cung thủ, binh chủng khắc loại giặc đông nhất của màn (màn 13, 21 bỏ voi chiến); từ màn 26 có lính nỏ.
 * Màn 1–4 vốn ít giặc nên thử thách có thêm giặc (`extra`), cho đông ngang màn 5–8.
 * Hệ số máu giặc đo bằng test (`thuThach.test.ts`): người chơi giỏi thắng, người chơi thường thua.
 */
export const CHALLENGES: ChallengeDef[] = [
  du(3.2, { giaoAn: 10, cungAn: 7, chienXa: 3 }),
  hai('giao', 'voi', 3.95, { giaoAn: 7, cungAn: 5, chienXa: 2 }),
  du(3.8, { giaoAn: 7, cungAn: 4, chienXa: 2 }),
  du(2.6, { giaoAn: 7, cungAn: 4, chienXa: 2 }),
  kt(3.5),
  hai('giao', 'voi', 3.5),
  kt(2.4),
  du(2.2),
  kt(3.15),
  hai('giao', 'voi', 4),
  kt(1.9),
  du(2.9),
  hai('giao', 'cung', 4.1),
  kt(1.4),
  hai('giao', 'voi', 3),
  du(1.8),
  kt(1.7),
  hai('giao', 'voi', 3.2),
  du(2.8),
  kt(1.1),
  hai('giao', 'cung', 3.3),
  kt(0.95),
  hai('giao', 'voi', 2.6),
  du(2.05),
  kt(1.05),
  hai('giao', 'no', 3.15),
  kt(0.85),
  du(2.2),
  hai('voi', 'no', 2.6),
  kt(0.95),
  hai('giao', 'no', 3.1),
  du(3.3),
  // Chương 5: Không tướng ở màn 33, 35, 38; Hai binh chủng ở màn 34, 37 (lính Hán đông nhất, cung thủ khắc, nên bỏ
  // cung thủ); Giặc dữ ở màn 36 (Tô Định), 39 (Mã Viện), 40 (cầm cự ở Cấm Khê).
  kt(0.9),
  hai('giao', 'voi', 2.2),
  kt(0.95),
  du(1.9),
  hai('giao', 'no', 2.85),
  kt(0.95),
  du(1.5),
  du(2.7),
];
/** Huân công cho lần đầu thắng thử thách, theo chương của màn: màn 1–8 được 1, … màn 25–32 được 4, màn 33–40 được 5. */
export const HUAN_REWARD: Record<Chapter, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
/** Nhánh huân công: bốn binh chủng và tướng (cho mọi tướng). */
export type HuanBranch = UnitType | 'tuong';
export const HUAN_BRANCHES: HuanBranch[] = ['giao', 'cung', 'voi', 'no', 'tuong'];
/**
 * Giá bậc 1–4 của mỗi nhánh. Một nhánh hết 24, năm nhánh hết 120, bằng huân công của cả 40 thử thách (bậc 4 thêm ở
 * chương 5, vừa bằng 40 huân công của thử thách màn 33–40).
 */
export const HUAN_COST = [3, 5, 8, 8];
/** Mỗi bậc huân công thêm chừng này vào máu và sức đánh của nhánh ấy, ở mọi trận. */
export const HUAN_BONUS = 0.04;

/** Kỹ năng bấm tay trong trận: Trống trận của Lạc tướng, hai kỹ năng của mỗi tướng Gióng, Sơn Tinh, An Dương Vương, Cao Lỗ. */
export type SkillId = 'trongTran' | 'phunLua' | 'nhoTre' | 'bocDoi' | 'doiNon' | 'noThan' | 'ruaVang' | 'lienChau' | 'lenhBan' | 'voiXung' | 'hieuTrieu';
export const SKILL_IDS: SkillId[] = ['trongTran', 'phunLua', 'nhoTre', 'bocDoi', 'doiNon', 'noThan', 'ruaVang', 'lienChau', 'lenhBan', 'voiXung', 'hieuTrieu'];
export const SKILLS: Record<SkillId, { cooldown: number; duration: number }> = {
  trongTran: { cooldown: 20, duration: 6 },
  phunLua: { cooldown: 15, duration: 0 },
  nhoTre: { cooldown: 20, duration: 0 },
  bocDoi: { cooldown: 16, duration: 0 },
  doiNon: { cooldown: 22, duration: 0 },
  noThan: { cooldown: 18, duration: 0 },
  ruaVang: { cooldown: 24, duration: 6 },
  lienChau: { cooldown: 12, duration: 0 },
  lenhBan: { cooldown: 22, duration: 6 },
  voiXung: { cooldown: 12, duration: 0 },
  hieuTrieu: { cooldown: 25, duration: 0 },
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
  | { kind: 'floodsHeld'; amount: number }
  | { kind: 'rings'; amount: number }
  | { kind: 'noThan' }
  | { kind: 'trieuHeld'; amount: number }
  | { kind: 'uNo'; amount: number }
  | { kind: 'unitTroops'; unit: UnitType; amount: number }
  | { kind: 'thuyBinhHeld'; amount: number }
  | { kind: 'hanHeld'; amount: number }
  /** Đánh chìm được `amount` lâu thuyền Hán ở kinh đô (cộng dồn qua mọi đợt). */
  | { kind: 'lauSunk'; amount: number }
  /** Có ít nhất `amount` công trình (không kể Điện) ở cấp `level` trở lên. */
  | { kind: 'buildingLevel'; level: number; amount: number };

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
  // Chương 3: An Dương Vương, thành Cổ Loa, nỏ thần.
  { id: 'thanh1', goal: { kind: 'rings', amount: 1 }, reward: { datDa: 600, voOc: 300 } },
  { id: 'quaMan17', goal: { kind: 'stage', stage: 17 }, reward: { gao: 600, sat: 200 } },
  { id: 'thanh2', goal: { kind: 'rings', amount: 2 }, reward: { datDa: 800 } },
  { id: 'quaMan19', goal: { kind: 'stage', stage: 19 }, reward: { gao: 1000, voOc: 800 } },
  { id: 'thanh3', goal: { kind: 'rings', amount: 3 }, reward: { datDa: 1000, sat: 200 } },
  { id: 'noThan', goal: { kind: 'noThan' }, reward: { gao: 1000, sat: 300 } },
  { id: 'chongTrieu', goal: { kind: 'trieuHeld', amount: 1 }, reward: { voOc: 1000, sat: 300 } },
  { id: 'quaMan22', goal: { kind: 'stage', stage: 22 }, reward: { gao: 1200, datDa: 800 } },
  { id: 'coLoa', goal: { kind: 'stage', stage: 24 }, reward: { gao: 2000, voOc: 2000 } },
  { id: 'denCoLoa', goal: { kind: 'count', building: 'denCoLoa', amount: 1 }, reward: { datDa: 1500, sat: 500 } },
  // Chương 4: Mỵ Châu, Trọng Thủy. Mỗi phần làm xong thì nối thêm nhiệm vụ của phần ấy vào cuối.
  { id: 'dien8', goal: { kind: 'dienLevel', level: 8 }, reward: { gao: 2000, voOc: 2000 } },
  { id: 'lauNo', goal: { kind: 'count', building: 'lauNo', amount: 1 }, reward: { datDa: 1500, sat: 400 } },
  { id: 'uNo', goal: { kind: 'uNo', amount: 4 }, reward: { voOc: 1200, sat: 300 } },
  { id: 'luyenNo', goal: { kind: 'unitTroops', unit: 'no', amount: 4 }, reward: { gao: 1500, sat: 300 } },
  { id: 'chongThuyBinh', goal: { kind: 'thuyBinhHeld', amount: 1 }, reward: { voOc: 1500, sat: 450 } },
  { id: 'quaMan25', goal: { kind: 'stage', stage: 25 }, reward: { gao: 1500, voOc: 1200 } },
  { id: 'quaMan28', goal: { kind: 'stage', stage: 28 }, reward: { gao: 1800, datDa: 1200 } },
  { id: 'quaMan30', goal: { kind: 'stage', stage: 30 }, reward: { voOc: 1500, sat: 500 } },
  { id: 'hoGia', goal: { kind: 'stage', stage: 32 }, reward: { gao: 3000, voOc: 3000 } },
  { id: 'denCuong', goal: { kind: 'count', building: 'denCuong', amount: 1 }, reward: { datDa: 2200, sat: 700 } },
  // Sau truyện chương 4: Điện cấp 9.
  { id: 'dien9', goal: { kind: 'dienLevel', level: 9 }, reward: { gao: 3000, voOc: 3000 } },
  { id: 'cap9', goal: { kind: 'buildingLevel', level: 9, amount: 1 }, reward: { datDa: 2500, sat: 600 } },
  // Chương 5: Hai Bà Trưng. Mở đầu bằng Điện cấp 10. Mỗi phần làm xong thì nối thêm nhiệm vụ của phần ấy vào cuối.
  { id: 'dien10', goal: { kind: 'dienLevel', level: 10 }, reward: { gao: 4500, voOc: 4500 } },
  { id: 'cap10', goal: { kind: 'buildingLevel', level: 10, amount: 1 }, reward: { datDa: 3500, sat: 900 } },
  { id: 'chongHan', goal: { kind: 'hanHeld', amount: 1 }, reward: { voOc: 2500, sat: 700 } },
  { id: 'luyenVoi', goal: { kind: 'unitTroops', unit: 'voi', amount: 6 }, reward: { gao: 2500, sat: 600 } },
  { id: 'quaMan33', goal: { kind: 'stage', stage: 33 }, reward: { gao: 2500, voOc: 2000 } },
  { id: 'haLuyLau', goal: { kind: 'stage', stage: 36 }, reward: { gao: 3000, datDa: 2000 } },
  { id: 'chimLauThuyen', goal: { kind: 'lauSunk', amount: 1 }, reward: { voOc: 2500, sat: 800 } },
  { id: 'quaMan39', goal: { kind: 'stage', stage: 39 }, reward: { voOc: 3000, datDa: 2500 } },
  { id: 'camKhe', goal: { kind: 'stage', stage: 40 }, reward: { gao: 5000, voOc: 5000 } },
  { id: 'denHatMon', goal: { kind: 'count', building: 'denHatMon', amount: 1 }, reward: { datDa: 3500, sat: 1100 } },
];
/** Nhận xong thưởng nhiệm vụ cuối chương 1 (Đền Phù Đổng) thì sang chương 2. */
export const CH2_QUEST_START = 20;
/** Nhận xong thưởng nhiệm vụ cuối chương 2 (Đền Tản Viên) thì sang chương 3. */
export const CH3_QUEST_START = 30;
/** Nhận xong thưởng nhiệm vụ cuối chương 3 (Đền Cổ Loa) thì sang chương 4. */
export const CH4_QUEST_START = 40;
/** Nhận xong thưởng nhiệm vụ "một công trình cấp 9" (đã có Điện 9, sau Hết truyện chương 4) thì sang chương 5. */
export const CH5_QUEST_START = 52;
/** Bản lưu cũ (phiên bản 3) đã làm qua nhiệm vụ này thì chỉ số nhiệm vụ phải dời thêm một. */
export const QUEST_INSERTED_V4 = 11;

/**
 * Công trình mới thêm sau khi đã có người chơi: lần đầu mở được thì Lạc hầu nói một câu gợi ý (một lần, ghi ở
 * `GameState.hinted`). Thêm loại vào đây không phải nâng bản lưu.
 */
export const NEW_HINTS: BuildingType[] = ['xuongMoc', 'langChai', 'congThanh', 'hoKimQuy', 'benKhoi', 'congDe', 'bacThanh'];

/**
 * Cá mỗi phút của một làng chài đủ người, theo cấp (chỉ số 0 là cấp 1). Cá không tích trữ: dân và lính ăn cá trước,
 * phần còn thiếu mới ăn gạo; cá thừa bỏ phí.
 */
export const CA_PER_MIN = [6, 10, 15, 22, 30, 40, 52, 68, 83, 101];

/** Cá biển mỗi phút của một bến thuyền khơi đủ người, theo cấp. Đỡ gạo ăn như cá làng chài, thừa thì bỏ phí. */
export const CA_BIEN_PER_MIN = [50, 70, 90];
