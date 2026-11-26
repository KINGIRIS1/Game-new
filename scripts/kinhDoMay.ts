// Dựng kinh đô máy Đấu thành từ mẫu kinh đô (`src/game/mau.ts`) rồi mã hóa cho `src/game/kinhDoMayMa.ts`.
// `node scripts/kinh-do-may.mjs` nạp tệp này qua Vite. Chỉ chạy khi cố ý cho kinh đô máy theo mẫu mới: chạy xong thì
// đo lại cân bằng Đấu thành (`dauThanh.test.ts`, `tatDinh.test.ts`).

import { BUILDINGS, U_NO } from '../src/game/defs';
import { chapterAt } from '../src/game/dauThanh';
import { maHoaKinhDo, type CongTrinhMay, type KinhDoMay } from '../src/game/kinhDoMay';
import { frameStart, mauSlots, type MauId } from '../src/game/mau';

/** Mẫu của kinh đô máy theo cấp Điện: Phong Châu tới Điện 5, Đê bao Điện 6, Cổ Loa Điện 7, Cổ Loa giữ sông từ Điện 8. */
export const botMau = (dien: number): MauId => (dien <= 5 ? 'phongChau' : dien === 6 ? 'deBao' : dien === 7 ? 'coLoa' : 'coLoaSong');

/**
 * Kinh đô máy Điện `dien` theo mẫu (xếp khít như cũ, `mauSlots(..., true)`): cổng thành ở chỗ cổng của mẫu (từ
 * chương 3), ụ nỏ trên các đoạn thành mẫu đánh dấu (từ Điện 8), trong số tối đa.
 */
export function kinhDoTuMau(dien: number): KinhDoMay {
  const chapter = chapterAt(dien);
  const lv = dien - 1;
  const buildings: CongTrinhMay[] = [];
  let gates = 0;
  let uNo = 0;
  for (const slot of mauSlots(botMau(dien), dien, true)) {
    let type = slot.type;
    if (slot.cong && chapter >= 3 && gates < (BUILDINGS.congThanh.limit[lv] ?? 0)) {
      type = 'congThanh';
      gates++;
    }
    const b: CongTrinhMay = { type, x: slot.x, z: slot.z };
    if (slot.uNo && type === 'thanh' && dien >= 8 && uNo < (U_NO.limit[lv] ?? 0)) {
      b.uNo = true;
      uNo++;
    }
    buildings.push(b);
  }
  return { buildings, lo: frameStart(dien, botMau(dien)) };
}

/** Nội dung tệp `src/game/kinhDoMayMa.ts`. */
export function tepMa(): string {
  const ma = Array.from({ length: 10 }, (_, i) => maHoaKinhDo(kinhDoTuMau(i + 1)));
  return `// Sinh ra bởi \`node scripts/kinh-do-may.mjs\` từ mẫu kinh đô. Đừng sửa tay (xem \`kinhDoMay.ts\`).

/** Kinh đô máy Đấu thành Điện 1–10 đã chụp (chỉ số 0 là Điện 1), mã ở \`maHoaKinhDo\`. */
export const KINH_DO_MAY_MA: readonly string[] = [
${ma.map((m) => `  ${JSON.stringify(m)},`).join('\n')}
];
`;
}
