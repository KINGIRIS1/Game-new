// Kinh đô máy Đấu thành chụp cố định (`docs/thiet-ke.md` mục Kế hoạch: Đấu thành, và mục Mẫu kinh đô: mẫu tự nhận
// công trình). Kinh đô máy từng dựng thẳng từ mẫu kinh đô (`mau.ts`) mỗi lần gọi, nên sửa mẫu là đổi luôn cân bằng
// Đấu thành và luật máy chủ. Nay chỗ từng công trình chụp sẵn ở `kinhDoMayMa.ts`: sửa mẫu không đổi kinh đô máy.
// Muốn kinh đô máy theo mẫu mới thì chạy `node scripts/kinh-do-may.mjs` rồi đo lại cân bằng Đấu thành
// (`dauThanh.test.ts`, `tatDinh.test.ts`).

import { BUILDINGS, type BuildingType } from './defs';
import { khoanhOf } from './khoanh';
import { KHOANH, RIVER_START } from './map';
import { KINH_DO_MAY_MA } from './kinhDoMayMa';

/** Một công trình của kinh đô máy: loại, góc móng; `uNo` là đoạn thành có ụ nỏ trên mặt thành. */
export interface CongTrinhMay {
  type: BuildingType;
  x: number;
  z: number;
  uNo?: true;
}

/** Kinh đô máy một cấp Điện: công trình theo đúng thứ tự (chỉ số công trình dùng cho lính giữ thành) và đất đã mở. */
export interface KinhDoMay {
  buildings: CongTrinhMay[];
  /** Ô nhỏ nhất (cả x và z) của khung đất đã mở: mở mọi khoảnh từ đây tới sông. */
  lo: number;
}

/** Một tọa độ là một ký tự (0–61). */
const KY = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const U_NO = '*';

/**
 * Mã hóa kinh đô máy: `lo` rồi `|`, rồi từng đoạn `loại:` theo sau là mỗi công trình hai ký tự tọa độ x, z (thêm `*`
 * nếu đoạn thành có ụ nỏ); sang loại khác thì `;`. Giữ đúng thứ tự công trình.
 */
export function maHoaKinhDo(k: KinhDoMay): string {
  const parts: string[] = [];
  let run = '';
  let type: BuildingType | null = null;
  for (const b of k.buildings) {
    if (b.x < 0 || b.z < 0 || b.x >= KY.length || b.z >= KY.length) throw new Error(`tọa độ ngoài mã: ${b.type} ${b.x},${b.z}`);
    if (b.type !== type) {
      if (type) parts.push(run);
      type = b.type;
      run = `${type}:`;
    }
    run += KY[b.x] + KY[b.z] + (b.uNo ? U_NO : '');
  }
  if (type) parts.push(run);
  return `${k.lo}|${parts.join(';')}`;
}

export function giaiMaKinhDo(ma: string): KinhDoMay {
  const [lo, body] = ma.split('|');
  const buildings: CongTrinhMay[] = [];
  for (const part of body ? body.split(';') : []) {
    const [type, cells] = part.split(':') as [BuildingType, string];
    if (!BUILDINGS[type]) throw new Error(`loại lạ trong kinh đô máy: ${type}`);
    for (let i = 0; i < cells.length; ) {
      const b: CongTrinhMay = { type, x: KY.indexOf(cells[i]), z: KY.indexOf(cells[i + 1]) };
      i += 2;
      if (cells[i] === U_NO) {
        b.uNo = true;
        i++;
      }
      buildings.push(b);
    }
  }
  return { buildings, lo: Number(lo) };
}

/** Các khoảnh phủ khung đất từ ô `lo` tới sông. */
export function khoanhTu(lo: number): number[] {
  const out: number[] = [];
  for (let z = lo; z < RIVER_START; z += KHOANH) for (let x = lo; x < RIVER_START; x += KHOANH) out.push(khoanhOf(x, z));
  return out;
}

const DA_GIAI = new Map<number, KinhDoMay>();

/** Kinh đô máy Điện `dien` (1–10) đã chụp cố định. */
export function kinhDoMayCoDinh(dien: number): KinhDoMay {
  const lv = Math.min(Math.max(Math.round(dien), 1), KINH_DO_MAY_MA.length);
  let k = DA_GIAI.get(lv);
  if (!k) {
    k = giaiMaKinhDo(KINH_DO_MAY_MA[lv - 1]);
    DA_GIAI.set(lv, k);
  }
  return k;
}
