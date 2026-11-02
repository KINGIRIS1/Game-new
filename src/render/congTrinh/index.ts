// Mọi công trình vẽ trên móng mới, theo loại, và mô hình đặt vừa móng của mọi loại công trình (`lotModel`).

import type * as THREE from 'three';
import { isBridge, type BuildingType } from '../../game/defs';
import { bridgeModel } from '../benKia';
import { buildingModel, footScale } from '../buildings';
import { BAI_DA } from './baiDa';
import { BEN } from './ben';
import { BEP } from './bep';
import type { CongTrinh } from './chung';
import { CHUONG_LON } from './chuongLon';
import { CHUONG_VOI } from './chuongVoi';
import { DIEN } from './dien';
import { DOANH_TRAI } from './doanhTrai';
import { KHO } from './kho';
import { LANG_CHAI } from './langChai';
import { LO_REN } from './loRen';
import { NHA_SAN } from './nhaSan';
import { RUONG } from './ruong';
import { TRAI_CUNG } from './traiCung';
import { TRAI_GIAO } from './traiGiao';
import { VUON } from './vuon';
import { XUONG_MOC } from './xuongMoc';

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
  vuon: VUON,
  chuongLon: CHUONG_LON,
  bep: BEP,
  xuongMoc: XUONG_MOC,
  langChai: LANG_CHAI,
};

/**
 * Mô hình công trình loại `type` ở cấp `level`, đặt vừa móng kinh đô lớn. Loại đã vẽ trên móng mới (`CONG_TRINH`)
 * thì dựng thẳng, không phóng. Loại còn vẽ theo móng cũ (bốn đền, ruộng nếp, chòi canh, lầu nỏ, đường
 * và đồ trang trí) thì phóng theo móng và chừa viền cỏ (`footScale`). `userData.foot` ghi hệ số đã phóng.
 */
export function lotModel(type: BuildingType, level: number): THREE.Group {
  // Cầu vẽ đúng cỡ móng: vắt vừa lòng sông, đầu cầu chạm hai bờ.
  if (isBridge(type)) {
    const g = bridgeModel(type, level);
    g.userData.foot = 1;
    return g;
  }
  const moi = CONG_TRINH[type];
  if (moi) {
    const g = moi.make(level);
    g.userData.foot = 1;
    return g;
  }
  const g = buildingModel(type, level);
  const k = footScale(type);
  g.scale.multiplyScalar(k);
  g.userData.foot = k;
  return g;
}
