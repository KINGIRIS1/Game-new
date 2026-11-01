// Mọi công trình vẽ trên móng mới, theo loại.

import type { BuildingType } from '../../game/defs';
import { BAI_DA } from './baiDa';
import { BEN } from './ben';
import type { CongTrinh } from './chung';
import { CHUONG_VOI } from './chuongVoi';
import { DIEN } from './dien';
import { DOANH_TRAI } from './doanhTrai';
import { KHO } from './kho';
import { LO_REN } from './loRen';
import { NHA_SAN } from './nhaSan';
import { RUONG } from './ruong';
import { TRAI_CUNG } from './traiCung';
import { TRAI_GIAO } from './traiGiao';

export const CONG_TRINH: Partial<Record<BuildingType, CongTrinh>> = {
  dien: DIEN,
  ruong: RUONG,
  ben: BEN,
  nhaSan: NHA_SAN,
  baiDa: BAI_DA,
  loRen: LO_REN,
  kho: KHO,
  doanhTrai: DOANH_TRAI,
  traiGiao: TRAI_GIAO,
  traiCung: TRAI_CUNG,
  chuongVoi: CHUONG_VOI,
};
