// Mọi công trình vẽ trên móng mới, theo loại, và mô hình đặt vừa móng của mọi loại công trình (`lotModel`).

import type * as THREE from 'three';
import { BUILDINGS, isBridge, type BuildingType } from '../../game/defs';
import { bridgeModel, makeBanLang, makeDonBien } from '../benKia';
import { buildingModel, footScale, makeBacThanh } from '../buildings';
import { BAI_DA } from './baiDa';
import { BEN } from './ben';
import { BEN_KHOI } from './benKhoi';
import { BEP } from './bep';
import type { CongTrinh, LotOpts } from './chung';
import { CHUONG_LON } from './chuongLon';
import { CHUONG_VOI } from './chuongVoi';
import { DEN_HAT_MON } from './denHatMon';
import { DEN_RONG_TIEN } from './denRongTien';
import { DIEN } from './dien';
import { DOANH_TRAI } from './doanhTrai';
import { HO_KIM_QUY } from './hoKimQuy';
import { KHO } from './kho';
import { LANG_CHAI } from './langChai';
import { LO_REN } from './loRen';
import { NHA_SAN } from './nhaSan';
import { NHA_THUOC } from './nhaThuoc';
import { RUONG } from './ruong';
import { SAN_TRONG } from './sanTrong';
import { TRAI_CUNG } from './traiCung';
import { THO_HO } from './thoHo';
import { TRAI_GIAO } from './traiGiao';
import { TRAI_NO } from './traiNo';
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
  traiNo: TRAI_NO,
  vuon: VUON,
  chuongLon: CHUONG_LON,
  bep: BEP,
  xuongMoc: XUONG_MOC,
  langChai: LANG_CHAI,
  hoKimQuy: HO_KIM_QUY,
  benKhoi: BEN_KHOI,
  denHatMon: DEN_HAT_MON,
  denRongTien: DEN_RONG_TIEN,
  sanTrong: SAN_TRONG,
  thoHo: THO_HO,
  nhaThuoc: NHA_THUOC,
};

/** Viền cỏ chừa quanh mô hình công trình vẽ trên móng mới, mỗi bên (ô đất): nhà kề nhau không liền thành một khối. */
export const VIEN_MONG = 0.2;

/**
 * Không co vào trong móng: bến, làng chài, bến thuyền khơi (cầu tàu, thuyền neo phải chạm sông); Điện, doanh trại
 * (móng lớn đã có tường, rào rõ ranh; chỗ tướng đứng chầu, đài tướng tính theo tọa độ móng ngoài mô hình); sân trống đồng.
 */
const KHONG_CO: ReadonlySet<BuildingType> = new Set<BuildingType>(['ben', 'langChai', 'benKhoi', 'dien', 'doanhTrai', 'sanTrong']);

/** Hệ số co mô hình công trình vẽ trên móng mới cho chừa `VIEN_MONG` mỗi bên (1 với loại không co). */
export function vienK(type: BuildingType): number {
  if (!CONG_TRINH[type] || KHONG_CO.has(type)) return 1;
  const w = BUILDINGS[type].w;
  return (w - 2 * VIEN_MONG) / w;
}

/**
 * Mô hình công trình loại `type` ở cấp `level`, đặt vừa móng kinh đô lớn. Loại đã vẽ trên móng mới (`CONG_TRINH`)
 * thì dựng thẳng, co vào trong chừa viền cỏ `VIEN_MONG` (trừ loại sát sông, Điện, doanh trại). Loại còn vẽ theo móng cũ (bốn đền đầu, ruộng nếp, chòi canh, lầu nỏ,
 * đường và đồ trang trí) thì phóng theo móng và chừa viền cỏ (`footScale`). `userData.foot` ghi hệ số đã phóng.
 * `opts`: dáng theo trạng thái (ruộng lúa, ruộng nếp đã bồi phù sa; doanh trại; bậc binh khí của nơi ở).
 */
export function lotModel(type: BuildingType, level: number, opts: LotOpts = {}): THREE.Group {
  // Cầu vẽ đúng cỡ móng: vắt vừa lòng sông, đầu cầu chạm hai bờ.
  if (isBridge(type)) {
    const g = bridgeModel(type, level, opts.banks);
    g.userData.foot = 1;
    return g;
  }
  // Bậc lên thành: vẽ thẳng trên một ô, cao tới mặt đoạn thành kề bên.
  if (type === 'bacThanh') {
    const g = makeBacThanh(opts.rise);
    g.userData.foot = 1;
    return g;
  }
  // Nhà làng, đồn biên bên kia sông: vẽ thẳng trên móng.
  if (type === 'banLang' || type === 'donBien') {
    const g = type === 'banLang' ? makeBanLang() : makeDonBien();
    g.userData.foot = 1;
    return g;
  }
  const moi = CONG_TRINH[type];
  if (moi) {
    const g = moi.make(level, opts);
    // Móng đã nới mà bản vẽ chưa vẽ lại thì tạm phóng bản vẽ cũ cho vừa móng mới (hiện mọi loại đã vẽ đúng móng).
    // Co vào trong móng chừa viền cỏ (`vienK`); người làm chia `foot` nên vẫn giữ cỡ thật.
    const k = (BUILDINGS[type].w / moi.tiles) * vienK(type);
    if (k !== 1) g.scale.multiplyScalar(k);
    g.userData.foot = k;
    return g;
  }
  const g = buildingModel(type, level, opts);
  const k = footScale(type);
  g.scale.multiplyScalar(k);
  g.userData.foot = k;
  return g;
}
