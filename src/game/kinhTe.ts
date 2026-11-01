// Báo cáo kinh tế: ghi sổ từng khoản thu chi của người chơi mô phỏng (`moPhong.ts`) qua bốn chương rồi thêm một giờ
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
import { playChapters, playSecond, type Lam, type Moc } from './moPhong';
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

const GIAI_DOAN = ['chuong1', 'chuong2', 'chuong3', 'chuong4', 'sauDien8'] as const;
type GiaiDoan = (typeof GIAI_DOAN)[number];
const TEN_GIAI_DOAN: Record<GiaiDoan, string> = {
  chuong1: 'Chương 1 (từ đầu tới lúc vào chương 2)',
  chuong2: 'Chương 2 (tới lúc vào chương 3)',
  chuong3: 'Chương 3 (tới lúc vào chương 4)',
  chuong4: 'Chương 4 (tới lúc lên Điện 8)',
  sauDien8: 'Sau Điện 8 (người chơi mô phỏng chơi thêm)',
};

/** Sau Điện 8 chơi thêm chừng này phút, để xem tài nguyên dồn lại ra sao khi hết đường lên cấp. */
export const SAU_DIEN8_PHUT = 60;

const zero = (): Resources => ({ gao: 0, voOc: 0, datDa: 0, sat: 0 });

interface SoGiaiDoan {
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

function soMoi(s: GameState): SoGiaiDoan {
  const khoan = {} as Record<Khoan, Resources>;
  for (const k of Object.keys(KHOAN) as Khoan[]) khoan[k] = zero();
  return {
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
  so: Partial<Record<GiaiDoan, SoGiaiDoan>>;
}

/** Chạy người chơi mô phỏng và ghi sổ. Tất định: lần nào chạy cũng ra cùng số. */
export function doKinhTe(): KetQuaKinhTe {
  const s = createInitialState(0);
  const so: Partial<Record<GiaiDoan, SoGiaiDoan>> = {};
  let sauDien8 = false;
  const giaiDoan = (): GiaiDoan =>
    sauDien8 ? 'sauDien8' : inChapter4(s) ? 'chuong4' : inChapter3(s) ? 'chuong3' : inChapter2(s) ? 'chuong2' : 'chuong1';
  const soCua = (g: GiaiDoan) => (so[g] ??= soMoi(s));

  const cong = (sg: SoGiaiDoan, k: Khoan, r: ResourceId, n: number) => {
    sg.khoan[k][r] += n;
  };

  const lam: Lam = (viec, run) => {
    // Ghi vào giai đoạn lúc việc bắt đầu: tiêu hết khi vào chương mới tính cho chương cũ.
    const sg = soCua(giaiDoan());
    const truoc = { ...s.resources };
    if (viec !== 'thoiGian') {
      run();
      for (const r of RESOURCE_IDS) cong(sg, viec, r, s.resources[r] - truoc[r]);
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
      cong(sg, 'sanXuat', r, (prod[r] * k) / 60);
      if (r === 'gao') cong(sg, 'an', r, -an / 60);
      // raw > sau: làm ra mà kho hết chỗ. raw < sau: gạo hết, phần ăn không có để trừ.
      if (raw > sau) cong(sg, 'tranKho', r, sau - raw);
      if (raw < sau) cong(sg, 'doi', r, sau - raw);
      cong(sg, 'khac', r, s.resources[r] - sau);
    }
    sg.giay += 1;
    const capSau = storageCap(s);
    for (const r of RESOURCE_IDS) {
      sg.caoNhat[r] = Math.max(sg.caoNhat[r], s.resources[r]);
      if (s.resources[r] >= capSau - 1e-6) sg.giayDay[r] += 1;
    }
    sg.cuoi = { ...s.resources };
    sg.khoCuoi = capSau;
    sg.netCuoi = netPerMinute(s);
    sg.dienCuoi = dienLevel(s);
  };

  const moc = playChapters({ lam, s, last: 8 });
  if (moc.at8 >= 0) {
    sauDien8 = true;
    for (let sec = 0; sec < SAU_DIEN8_PHUT * 60; sec++) playSecond(s, lam);
  }
  return { moc, so };
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

/** Những việc người chơi mô phỏng không làm: các khoản thu chi này không có trong số đo. */
const CHUA_DO = [
  'Phó bản: thưởng màn (`campaign.ts`), quân chết, huấn luyện quân',
  'Doanh trại, giặc đánh kinh đô, giặc cướp, sửa công trình hư',
  'Thánh Gióng: cho ăn, rèn đồ (`giong.ts`)',
  'Lễ vật Sơn Tinh (`son.ts`), binh khí (`binhKhi.ts`), nỏ thần và thành Cổ Loa (`coLoa.ts`)',
  'Hội Tết (`tet.ts`), mẫu kinh đô (`mau.ts`), dời công trình, đắp đất',
  'Chơi khi vắng mặt (`applyOffline`, sản lượng giảm theo OFFLINE_RATE)',
];

export function inBaoCao(kq: KetQuaKinhTe): string {
  const { moc, so } = kq;
  const out: string[] = [];
  out.push('# Báo cáo kinh tế (người chơi mô phỏng)', '');
  out.push(
    'Người chơi mô phỏng ở `src/game/moPhong.ts`, cùng người chơi với `balance.test.ts`. Mọi số là tổng cả giai đoạn, ' +
      'làm tròn tới đơn vị. Số dương là thu vào kho, số âm là chi ra hay mất đi.',
    '',
  );
  out.push('## Mốc thời gian', '');
  out.push(
    bang(
      ['Mốc', 'Lúc'],
      [
        ['Lên Điện 5', phut(moc.at5)],
        ['Vào chương 2', phut(moc.enter2)],
        ['Lên Điện 6', phut(moc.at6)],
        ['Vào chương 3', phut(moc.enter3)],
        ['Lên Điện 7', phut(moc.at7)],
        ['Vào chương 4', phut(moc.enter4)],
        ['Lên Điện 8', phut(moc.at8)],
      ],
    ),
    '',
  );

  for (const g of GIAI_DOAN) {
    const sg = so[g];
    if (!sg) {
      out.push(`## ${TEN_GIAI_DOAN[g]}`, '', 'CHƯA ĐO: người chơi mô phỏng không tới giai đoạn này.', '');
      continue;
    }
    out.push(`## ${TEN_GIAI_DOAN[g]}: ${phut(sg.giay)}, cuối giai đoạn Điện cấp ${sg.dienCuoi}`, '');
    const hang: string[][] = [];
    for (const k of Object.keys(KHOAN) as Khoan[]) {
      const v = sg.khoan[k];
      if (RESOURCE_IDS.every((r) => Math.abs(v[r]) < 0.5)) continue;
      hang.push([KHOAN[k], ...RESOURCE_IDS.map((r) => n(v[r]))]);
    }
    out.push(bang(['Khoản', ...RESOURCE_IDS.map(tenTN)], hang), '');
    const thu = (r: ResourceId) => sg.khoan.sanXuat[r] + Math.max(0, sg.khoan.nhiemVu[r]);
    const tran = (r: ResourceId) => Math.max(0, -sg.khoan.tranKho[r]);
    out.push(
      bang(
        ['Tồn kho', ...RESOURCE_IDS.map(tenTN)],
        [
          ['Đầu giai đoạn', ...RESOURCE_IDS.map((r) => n(sg.dau[r]))],
          ['Cuối giai đoạn', ...RESOURCE_IDS.map((r) => n(sg.cuoi[r]))],
          ['Cao nhất', ...RESOURCE_IDS.map((r) => n(sg.caoNhat[r]))],
          ['Thời gian kho đầy', ...RESOURCE_IDS.map((r) => `${so1.format((100 * sg.giayDay[r]) / Math.max(1, sg.giay))}%`)],
          ['Tràn kho / sản xuất và thưởng', ...RESOURCE_IDS.map((r) => (thu(r) > 0 ? `${so1.format((100 * tran(r)) / thu(r))}%` : '-'))],
          ['Thay đổi mỗi phút lúc cuối (đã trừ ăn)', ...RESOURCE_IDS.map((r) => n(sg.netCuoi[r]))],
        ],
      ),
      '',
      `Sức chứa kho lúc cuối: ${n(sg.khoCuoi)} mỗi loại.`,
      '',
    );
  }

  out.push('## Chưa đo', '', 'Người chơi mô phỏng không làm những việc sau, nên các khoản thu chi của chúng không có trong số trên:', '');
  for (const c of CHUA_DO) out.push(`- ${c}`);
  out.push('');
  return out.join('\n');
}
