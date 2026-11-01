// Báo cáo kinh tế: ghi sổ từng khoản thu chi của người chơi mô phỏng (`moPhong.ts`) qua bốn chương rồi chơi thêm
// sau Điện 8. Chạy bằng `node scripts/kinh-te.mjs`; skill `ra-kinh-te` đọc báo cáo để phân tích nguồn vào, chỗ tiêu.
// Báo cáo chỉ đưa số đo, không kết luận cân bằng hay không. Không chạy trong game thật.

import { RESOURCE_IDS, STARVING_RATE, type ResourceId, type Resources } from './defs';
import {
  createInitialState,
  dienLevel,
  isStarving,
  netPerMinute,
  productionPerMinute,
  storageCap,
  upkeepPerMinute,
  type GameState,
} from './game';
import { ECONOMY, LUY_COUNT, playChapters, playSecond, type Lam, type Moc } from './moPhong';
import { inChapter4 } from './chuong4';
import { inChapter3 } from './coLoa';
import { inChapter2 } from './son';
import { vi } from '../text/vi';

/** Các khoản ghi sổ. Số dương là thu vào kho, số âm là chi ra hay mất đi. */
const KHOAN = {
  sanXuat: 'Sản xuất (công trình làm ra)',
  nhiemVu: 'Thưởng nhiệm vụ',
  doiHang: 'Đổi hàng thuyền buôn (vào trừ ra)',
  an: 'Dân và lính ăn',
  xay: 'Dựng công trình',
  nangDien: 'Nâng Điện',
  nangCap: 'Nâng cấp công trình khác',
  vaoChuong: 'Vào chương mới (coi như tiêu hết cho đền, lễ vật, quân)',
  tranKho: 'Tràn kho (làm ra mà kho hết chỗ)',
  doi: 'Thiếu ăn (gạo hết: phần ăn ở trên không có gạo để trừ, cộng trả lại)',
  khac: 'Khác trong lúc thời gian trôi (giặc cướp...)',
} as const;
type Khoan = keyof typeof KHOAN;

/** Sau Điện 8 người chơi mô phỏng chơi thêm chừng này phút (mặc định), chia sổ theo từng giờ, để xem tài nguyên
 * dồn lại ra sao khi hết đường lên cấp. */
export const SAU_DIEN8_PHUT = 180;

/** Bốn chương, theo thứ tự. Chương nào người chơi mô phỏng không tới thì báo cáo ghi CHƯA ĐO. */
const CHUONG = [
  ['chuong1', 'Chương 1 (từ đầu tới lúc vào chương 2)'],
  ['chuong2', 'Chương 2 (tới lúc vào chương 3)'],
  ['chuong3', 'Chương 3 (tới lúc vào chương 4)'],
  ['chuong4', 'Chương 4 (tới lúc lên Điện 8)'],
] as const;

const zero = (): Resources => ({ gao: 0, voOc: 0, datDa: 0, sat: 0 });

export interface SoGiaiDoan {
  ten: string;
  giay: number;
  khoan: Record<Khoan, Resources>;
  dau: Resources;
  cuoi: Resources;
  caoNhat: Resources;
  /** Số giây tài nguyên nằm sát sức chứa kho. */
  giayDay: Resources;
  khoCuoi: number;
  /** Thay đổi thật mỗi phút ở giây cuối giai đoạn (đã trừ ăn). */
  netCuoi: Resources;
  dienCuoi: number;
}

function soMoi(s: GameState, ten: string): SoGiaiDoan {
  const khoan = {} as Record<Khoan, Resources>;
  for (const k of Object.keys(KHOAN) as Khoan[]) khoan[k] = zero();
  return {
    ten,
    giay: 0,
    khoan,
    dau: { ...s.resources },
    cuoi: { ...s.resources },
    caoNhat: { ...s.resources },
    giayDay: zero(),
    khoCuoi: storageCap(s),
    netCuoi: netPerMinute(s),
    dienCuoi: dienLevel(s),
  };
}

export interface KetQuaKinhTe {
  moc: Moc;
  /** Giây chơi lúc lên từng cấp Điện (chỉ số là cấp), -1 nếu chưa tới. */
  lenDien: number[];
  /** Sổ từng giai đoạn, theo thứ tự: chuong1 tới chuong4, rồi sau8-1, sau8-2... mỗi giờ sau Điện 8. */
  so: Record<string, SoGiaiDoan>;
}

/** Chạy người chơi mô phỏng và ghi sổ. Tất định: cùng con số trong defs.ts thì lần nào chạy cũng ra cùng sổ. */
export function doKinhTe(sauDien8Phut = SAU_DIEN8_PHUT): KetQuaKinhTe {
  const s = createInitialState(0);
  const so: Record<string, SoGiaiDoan> = {};
  const lenDien = [-1, 0, -1, -1, -1, -1, -1, -1, -1];
  let giayChoi = 0;
  let sau8: { key: string; ten: string } | null = null;
  const giaiDoan = (): { key: string; ten: string } => {
    if (sau8) return sau8;
    const [key, ten] = CHUONG[inChapter4(s) ? 3 : inChapter3(s) ? 2 : inChapter2(s) ? 1 : 0];
    return { key, ten };
  };

  const lam: Lam = (viec, run) => {
    // Ghi vào giai đoạn lúc việc bắt đầu: tiêu hết khi vào chương mới tính cho chương cũ.
    const g = giaiDoan();
    const sg = (so[g.key] ??= soMoi(s, g.ten));
    const truoc = { ...s.resources };
    if (viec !== 'thoiGian') {
      run();
      for (const r of RESOURCE_IDS) sg.khoan[viec][r] += s.resources[r] - truoc[r];
      return;
    }
    // Một giây trôi: tách phần làm ra, phần ăn, phần tràn kho như `produce` trong game.ts, còn lại là khoản khác.
    const k = isStarving(s) ? STARVING_RATE : 1;
    const prod = productionPerMinute(s);
    const an = upkeepPerMinute(s);
    const net = netPerMinute(s);
    const cap = storageCap(s);
    run();
    for (const r of RESOURCE_IDS) {
      const raw = truoc[r] + net[r] / 60;
      const sau = net[r] >= 0 ? Math.max(truoc[r], Math.min(cap, raw)) : Math.max(0, raw);
      sg.khoan.sanXuat[r] += (prod[r] * k) / 60;
      if (r === 'gao') sg.khoan.an[r] -= an / 60;
      // raw > sau: làm ra mà kho hết chỗ. raw < sau: gạo hết, phần ăn không có để trừ.
      if (raw > sau) sg.khoan.tranKho[r] += sau - raw;
      if (raw < sau) sg.khoan.doi[r] += sau - raw;
      sg.khoan.khac[r] += s.resources[r] - sau;
    }
    giayChoi += 1;
    sg.giay += 1;
    const level = dienLevel(s);
    if (lenDien[level] < 0) lenDien[level] = giayChoi;
    const capSau = storageCap(s);
    for (const r of RESOURCE_IDS) {
      sg.caoNhat[r] = Math.max(sg.caoNhat[r], s.resources[r]);
      if (s.resources[r] >= capSau - 1e-6) sg.giayDay[r] += 1;
    }
    sg.cuoi = { ...s.resources };
    sg.khoCuoi = capSau;
    sg.netCuoi = netPerMinute(s);
    sg.dienCuoi = level;
  };

  const moc = playChapters({ lam, s, last: 8 });
  if (moc.at8 >= 0) {
    for (let sec = 0; sec < sauDien8Phut * 60; sec++) {
      const h = Math.floor(sec / 3600);
      const ten = `Sau Điện 8, phút ${h * 60}–${Math.min((h + 1) * 60, sauDien8Phut)}`;
      sau8 = { key: `sau8-${h + 1}`, ten };
      playSecond(s, lam);
    }
  }
  return { moc, lenDien, so };
}

// ---------- In báo cáo ----------

const so0 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const so1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const n = (x: number) => (Math.abs(x) < 0.5 ? '0' : so0.format(x));
const phut = (giay: number) => (giay < 0 ? 'chưa tới' : `${so1.format(giay / 60)} phút`);
const tenTN = (r: ResourceId) => vi.resources[r].name;

function bang(dau: string[], hang: string[][]): string {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [line(dau), line(dau.map((_, i) => (i ? '---:' : '---'))), ...hang.map(line)].join('\n');
}

/** `thu`: mô tả phương án đổi số đang thử (nếu có), in ở đầu báo cáo. */
export function inBaoCao(kq: KetQuaKinhTe, thu?: string): string {
  const { moc, lenDien, so } = kq;
  const out: string[] = [];
  out.push('# Báo cáo kinh tế (người chơi mô phỏng)', '');
  if (thu) out.push(`**Đang thử phương án, số trong defs.ts đã đổi tạm:** \`${thu}\``, '');
  out.push(
    'Người chơi mô phỏng ở `src/game/moPhong.ts`, cùng người chơi với `balance.test.ts`. Mọi số là tổng cả giai đoạn, ' +
      'làm tròn tới đơn vị. Số dương là thu vào kho, số âm là chi ra hay mất đi.',
    '',
  );
  const sau = (a: number, b: number) => (a < 0 || b < 0 ? 'chưa tới' : phut(a - b));
  out.push('## Mốc thời gian', '');
  out.push(
    bang(
      ['Mốc', 'Lúc'],
      [
        ...[2, 3, 4, 5].map((lv) => [`Lên Điện ${lv}`, phut(lenDien[lv])]),
        ['Vào chương 2', phut(moc.enter2)],
        ['Lên Điện 6', `${phut(lenDien[6])} (${sau(lenDien[6], moc.enter2)} sau khi vào chương 2)`],
        ['Vào chương 3', phut(moc.enter3)],
        ['Lên Điện 7', `${phut(lenDien[7])} (${sau(lenDien[7], moc.enter3)} sau khi vào chương 3)`],
        ['Vào chương 4', phut(moc.enter4)],
        ['Lên Điện 8', `${phut(lenDien[8])} (${sau(lenDien[8], moc.enter4)} sau khi vào chương 4)`],
      ],
    ),
    '',
  );

  for (const [key, ten] of CHUONG) {
    if (!so[key]) out.push(`## ${ten}`, '', 'CHƯA ĐO: người chơi mô phỏng không tới giai đoạn này.', '');
  }
  for (const sg of Object.values(so)) {
    out.push(`## ${sg.ten}: ${phut(sg.giay)}, cuối giai đoạn Điện cấp ${sg.dienCuoi}`, '');
    const hang: string[][] = [];
    for (const k of Object.keys(KHOAN) as Khoan[]) {
      const v = sg.khoan[k];
      if (RESOURCE_IDS.every((r) => Math.abs(v[r]) < 0.5)) continue;
      hang.push([KHOAN[k], ...RESOURCE_IDS.map((r) => n(v[r]))]);
    }
    out.push(bang(['Khoản', ...RESOURCE_IDS.map(tenTN)], hang), '');
    const thuVao = (r: ResourceId) => sg.khoan.sanXuat[r] + Math.max(0, sg.khoan.nhiemVu[r]);
    const tran = (r: ResourceId) => Math.max(0, -sg.khoan.tranKho[r]);
    out.push(
      bang(
        ['Tồn kho', ...RESOURCE_IDS.map(tenTN)],
        [
          ['Đầu giai đoạn', ...RESOURCE_IDS.map((r) => n(sg.dau[r]))],
          ['Cuối giai đoạn', ...RESOURCE_IDS.map((r) => n(sg.cuoi[r]))],
          ['Cao nhất', ...RESOURCE_IDS.map((r) => n(sg.caoNhat[r]))],
          ['Thời gian kho đầy', ...RESOURCE_IDS.map((r) => `${so1.format((100 * sg.giayDay[r]) / Math.max(1, sg.giay))}%`)],
          ['Tràn kho / sản xuất và thưởng', ...RESOURCE_IDS.map((r) => (thuVao(r) > 0 ? `${so1.format((100 * tran(r)) / thuVao(r))}%` : '-'))],
          ['Thay đổi mỗi phút lúc cuối (đã trừ ăn)', ...RESOURCE_IDS.map((r) => n(sg.netCuoi[r]))],
        ],
      ),
      '',
      `Sức chứa kho lúc cuối: ${n(sg.khoCuoi)} mỗi loại.`,
      '',
    );
  }

  const ten = (t: string) => vi.buildings[t as keyof typeof vi.buildings]?.name ?? t;
  out.push(
    '## Người chơi mô phỏng làm gì',
    '',
    `- Dựng ${LUY_COUNT} đoạn ${ten('luy').toLowerCase()}; dựng và nâng cấp: ${ECONOMY.map(ten).join(', ')}; nâng Điện.`,
    '- Tự chia dân rảnh vào làm, đổi thứ dư nhiều nhất với thuyền buôn, nhận thưởng nhiệm vụ khi nhiệm vụ đã xong.',
    '- Giữ lại 60% giá nâng Điện cấp sau trước khi chi cho việc khác.',
    '- Vào chương 2 sau Điện 5 nửa giờ, chương 3 sau Điện 6 nửa giờ, chương 4 sau Điện 7 nửa giờ. Lúc vào chương, của dành dụm coi như tiêu hết.',
    '',
    '**Mọi khoản thu chi khác đều CHƯA ĐO**, gồm: các công trình khác (doanh trại, chòi canh, bẫy chông, đê, đền, thành, ' +
      'công trình Tết...), nhiệm vụ cần những công trình đó nên không xong, quân (huấn luyện, lính ăn, quân chết), giặc đánh ' +
      'kinh đô, sửa công trình hư, thưởng phó bản, Thánh Gióng, lễ vật Sơn Tinh, binh khí, nỏ thần, Hội Tết, mẫu kinh đô, ' +
      'dời công trình, đắp đất, phần cộng sản lượng của đền và phúc lành, chơi khi vắng mặt.',
    '',
  );
  return out.join('\n');
}
