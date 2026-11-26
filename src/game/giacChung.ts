// Giặc chung của tỉnh (bản đồ Việt Nam PR 3; `docs/thiet-ke.md` mục Kế hoạch: bản đồ Việt Nam, 34 tỉnh, chức Bồ chính).
//
// Lịch đạo giặc tính thuần từ số tuần (máy khách, máy chủ ra y hệt, không cần lưu): mỗi tuần một nhóm tỉnh theo lượt
// (biên giới phía bắc, phía tây, giáp biển), chọn 3–5 tỉnh theo hạt giống của tuần, đánh từ thứ Sáu tới hết Chủ nhật.
// Máu đạo ở mỗi tỉnh máy chủ giữ (`giac_chung`). Mỗi trận là trận ngoài bãi tất định dựng từ bản chụp kinh đô của người
// đánh (quân, tướng, đồ, binh khí, huân công) và hạt giống máy chủ cấp; lần bấm ghi theo bước như Đấu thành, máy chủ
// đánh lại để tính sát thương (`danhGiac` ở `mayChu.ts`).

import { retreatField, rng, startFieldBattle, stepField, useSkill, type Battle, type FieldSetup } from './battle';
import { baiOf } from './baiChien';
import { cleanInputs, tuongChup, type PvpInput, type Snapshot } from './dauThanh';
import { DEFAULT_ROWS, FIELD_CAP, GIAC_CHUNG, STAGES, UNIT_TYPES, type Chapter, type Row, type Terrain, type UnitType } from './defs';
import { armySpace, type Army } from './doanhTrai';
import { BATTLE_STEP } from './game';
import { TUAN_MS, tuanCua } from './loiDai';
import { GIAP_BIEN, TINH_IDS, langGieng, laTinh, ngayCua, type ChucId, type TinhId } from './vietNam';

// ---------- Lịch đạo giặc ----------

/** Nhóm tỉnh giặc vào: biên giới phía bắc, biên giới phía tây (Lào, Campuchia), giáp biển. */
export type NhomGiac = 'bac' | 'tay' | 'bien';
export const NHOM_GIAC: readonly NhomGiac[] = ['bac', 'tay', 'bien'];

/** Tỉnh có biên giới phía bắc (Trung Quốc). Ghi tay như `GIAP_BIEN_GIOI`. */
export const BIEN_BAC: readonly TinhId[] = ['07', '11', '08', '09', '14', '13', '03'];
/** Tỉnh có biên giới phía tây (Lào, Campuchia). */
export const BIEN_TAY: readonly TinhId[] = ['13', '15', '16', '17', '18', '19', '20', '21', '22', '24', '25', '26', '28', '27', '31', '32'];

export const TINH_NHOM: Record<NhomGiac, readonly TinhId[]> = { bac: BIEN_BAC, tay: BIEN_TAY, bien: GIAP_BIEN };

/** Nền bãi chiến của trận giặc chung theo nhóm: núi biên giới phía bắc, rừng phía tây, bến sông giáp biển. */
export const NEN_GIAC: Record<NhomGiac, Terrain> = { bac: 'nui', tay: 'rung', bien: 'benSong' };

/** Lệch cho tuần bắt đầu 0 giờ thứ Hai giờ Việt Nam (như `tuanCua`). */
const TUAN_LECH = 7 * 3_600_000 + 3 * 86_400_000;
const NGAY_MS = 86_400_000;

/** Đạo giặc tuần `tuan`: nhóm theo lượt tuần, 3–5 tỉnh chọn theo hạt giống của tuần (xếp bắc vào nam). */
export function daoTuan(tuan: number): { nhom: NhomGiac; tinh: TinhId[] } {
  const nhom = NHOM_GIAC[((tuan % 3) + 3) % 3];
  const rand = rng(tuan * 2_654_435 + 97);
  const so = GIAC_CHUNG.tinhMin + Math.floor(rand() * (GIAC_CHUNG.tinhMax - GIAC_CHUNG.tinhMin + 1));
  const con = [...TINH_NHOM[nhom]];
  const chon: TinhId[] = [];
  while (chon.length < so && con.length) chon.push(con.splice(Math.floor(rand() * con.length), 1)[0]);
  return { nhom, tinh: TINH_IDS.filter((id) => chon.includes(id)) };
}

/** Thứ trong tuần giờ Việt Nam của `now`: 0 là thứ Hai, 6 là Chủ nhật. */
export const thuCua = (now: number): number => Math.floor((((now + TUAN_LECH) % TUAN_MS) + TUAN_MS) % TUAN_MS / NGAY_MS);

/** Lúc (mili giây) đạo giặc tuần `tuan` tới: 0 giờ thứ `tuNgay` giờ Việt Nam. */
export const giacToiLuc = (tuan: number): number => tuan * TUAN_MS - TUAN_LECH + GIAC_CHUNG.tuNgay * NGAY_MS;

/** Lúc đạo giặc tuần `tuan` rút (hết Chủ nhật). */
export const giacRutLuc = (tuan: number): number => (tuan + 1) * TUAN_MS - TUAN_LECH;

/** Đạo giặc đang đánh lúc `now` (tuần ấy, từ thứ Sáu), không thì null. */
export function giacDangDanh(now: number): number | null {
  const tuan = tuanCua(now);
  return thuCua(now) >= GIAC_CHUNG.tuNgay ? tuan : null;
}

/** Khoảng ngày (`ngayCua`, `[tu, den)`) của tuần `tuan`: máy chủ đếm người đã góp tuần trước trong khoảng này. */
export function ngayTuan(tuan: number): { tu: number; den: number } {
  const tu = ngayCua(tuan * TUAN_MS - TUAN_LECH);
  return { tu, den: tu + 7 };
}

/** Máu đạo giặc ở một tỉnh theo số người đã góp ở tỉnh ấy tuần trước. */
export const mauDao = (nguoi: number): number => Math.max(GIAC_CHUNG.nguoiMin, Math.max(0, Math.floor(nguoi))) * GIAC_CHUNG.mauNguoi;

/**
 * Người ở tỉnh `ta` đánh được đạo giặc ở tỉnh nào lúc giặc đang đánh: tỉnh mình có giặc thì chỉ đánh ở tỉnh mình; không
 * thì gửi quân sang tỉnh láng giềng có giặc.
 */
export function noiDanh(ta: TinhId, tinhGiac: readonly TinhId[]): TinhId[] {
  if (tinhGiac.includes(ta)) return [ta];
  return langGieng(ta).filter((id) => tinhGiac.includes(id));
}

/** Hệ số sát thương theo chức: quân với mọi đạo, biên với giặc biên giới, hải với giặc biển. */
export function heChuc(chuc: ChucId | null, nhom: NhomGiac): number {
  if (chuc === 'quan') return GIAC_CHUNG.heChuc;
  if (chuc === 'bien' && nhom !== 'bien') return GIAC_CHUNG.heChuc;
  if (chuc === 'hai' && nhom === 'bien') return GIAC_CHUNG.heChuc;
  return 1;
}

/** Sát thương (cũng là điểm tỉnh) của một trận: phần trăm máu giặc đã hạ, nhân hệ số chức. */
export const satThuong = (pha: number, he: number): number => Math.round(Math.max(0, Math.min(1, pha)) * 100 * he);

/** Đánh giúp tỉnh láng giềng: điểm chia đôi, tỉnh mình phần lẻ xuống, tỉnh được giúp phần lẻ lên. */
export function chiaDiem(diem: number, ta: TinhId, giup: TinhId): { ta: number; giup: number } {
  if (ta === giup) return { ta: diem, giup: 0 };
  const nua = Math.floor(diem / 2);
  return { ta: nua, giup: diem - nua };
}

// ---------- Trận ----------

/** Quân mang đi đánh giặc chung: số lính từng binh chủng và hàng đứng. */
export interface QuanGiac {
  army: Army;
  rows: Record<UnitType, Row>;
}

/** Màn có quân giặc dùng cho người ở chương `ch`. */
export const manGiac = (ch: Chapter): number => GIAC_CHUNG.man[ch];

/**
 * Dựng trận giặc chung từ bản chụp người đánh, quân mang đi, nhóm đạo và hạt giống. Tướng là hai tướng đầu của bản
 * chụp (đồ tính lại từ món, `tuongChup`), Đền, binh khí, huân công cũng lấy từ bản chụp; không có nữ tướng.
 */
export function setupGiac(snap: Snapshot, quan: QuanGiac, nhom: NhomGiac, seed: number): FieldSetup {
  const man = STAGES[manGiac(snap.chapter) - 1];
  const tuong = tuongChup(snap);
  return {
    id: seed >>> 0,
    stage: 0,
    enemies: { ...man.enemies },
    hpScale: man.hpScale * GIAC_CHUNG.hpMul,
    army: { ...quan.army },
    rows: { ...quan.rows },
    hero: tuong[0] ?? null,
    hero2: tuong[1] ?? null,
    bonus: snap.bonus,
    arms: { ...snap.arms },
    huan: { ...snap.huan },
    bai: baiOf(NEN_GIAC[nhom], snap.chapter),
  };
}

/** Phần máu giặc đã hạ (0–1) trong trận. Giặc bỏ chạy khỏi bãi tính như đã hạ. */
export function phanHa(b: Battle): number {
  let tong = 0;
  let con = 0;
  for (const f of b.fighters) {
    if (f.side !== 'giac') continue;
    tong += f.maxHp;
    if (f.state !== 'gone') con += Math.max(0, f.hp);
  }
  return tong > 0 ? (tong - con) / tong : 0;
}

/** Trận giặc chung đang đánh (máy khách) hay đánh lại (máy chủ): các lần bấm ghi theo bước như Đấu thành. */
export interface GiacRun {
  battle: Battle;
  inputs: PvpInput[];
  step: number;
  /** Thời gian dồn lại chưa đủ một bước (giây). */
  acc: number;
  done: boolean;
}

export function beginGiac(setup: FieldSetup): GiacRun {
  return { battle: startFieldBattle(setup), inputs: [], step: 0, acc: 0, done: false };
}

/** Ghi một lần bấm (kỹ năng hay rút quân): áp ở đầu bước kế tiếp. */
export function pushGiac(run: GiacRun, k: PvpInput['k']): void {
  if (!run.done && run.inputs.length < 600) run.inputs.push({ s: run.step, k });
}

function buocGiac(run: GiacRun): void {
  for (const i of run.inputs) {
    if (i.s !== run.step) continue;
    if (i.k === 'rut') retreatField(run.battle);
    else useSkill(run.battle, i.k);
  }
  run.done = stepField(run.battle, BATTLE_STEP);
  run.step++;
}

/** Cho trận chạy thêm `ms` thời gian thật: chỉ chạy trọn bước, phần lẻ dồn sang lần sau. Trả về true khi xong. */
export function stepGiac(run: GiacRun, ms: number): boolean {
  run.acc += ms / 1000;
  while (!run.done && run.acc >= BATTLE_STEP) {
    run.acc -= BATTLE_STEP;
    buocGiac(run);
  }
  return run.done;
}

/** Số bước nhiều nhất một trận (quá `FIELD.maxS` giây thì trận tự xong). */
const MAX_BUOC = Math.ceil(95 / BATTLE_STEP);

/** Đánh lại cả trận một mạch với các lần bấm nhận từ ngoài (lọc như Đấu thành). */
export function simulateGiac(setup: FieldSetup, inputs: unknown): GiacRun {
  const run = beginGiac(setup);
  run.inputs = cleanInputs(inputs);
  while (!run.done && run.step < MAX_BUOC) buocGiac(run);
  return run;
}

/**
 * Kiểm quân mang đi: đúng dạng, không quá quân trong bản chụp, có quân, không quá số chỗ một trận theo cấp Điện; hàng
 * thiếu hay sai thì theo hàng mặc định.
 */
export function kiemQuanGiac(snap: Snapshot, army: unknown, rows: unknown): { quan: QuanGiac } | { loi: string } {
  const a = army as Record<string, unknown> | null;
  if (!a || typeof a !== 'object') return { loi: 'quân sai dạng' };
  const r = (rows && typeof rows === 'object' ? rows : {}) as Record<string, unknown>;
  const quan: QuanGiac = { army: { giao: 0, cung: 0, voi: 0, no: 0 }, rows: { ...DEFAULT_ROWS } };
  for (const k of UNIT_TYPES) {
    const n = a[k] ?? 0;
    if (!Number.isInteger(n) || (n as number) < 0) return { loi: 'quân sai dạng' };
    if ((n as number) > snap.troops[k]) return { loi: 'quân nhiều hơn quân đang có' };
    quan.army[k] = n as number;
    if (r[k] === 'tien' || r[k] === 'trung' || r[k] === 'hau') quan.rows[k] = r[k] as Row;
  }
  const space = armySpace(quan.army);
  if (space <= 0) return { loi: 'không có quân' };
  if (space > (FIELD_CAP[snap.dien - 1] ?? 0)) return { loi: 'quá số chỗ một trận' };
  return { quan };
}

/** Kiểm id tỉnh (máy chủ nhận từ ngoài). */
export const laTinhGiac = (id: unknown, tuan: number): id is TinhId => laTinh(id) && daoTuan(tuan).tinh.includes(id as TinhId);

// ---------- Dữ liệu máy chủ trả ----------

/** Đạo giặc ở một tỉnh tuần này: máu, máu còn, lúc bị diệt (null khi chưa). */
export interface GiacDao {
  tinh: TinhId;
  mau: number;
  con: number;
  diet: number | null;
}

/** Phần giặc chung trong bảng tỉnh máy chủ trả. */
export interface GiacBang {
  tuan: number;
  nhom: NhomGiac;
  /** Đạo đang đánh (từ thứ Sáu): máu từng tỉnh; trước thứ Sáu thì rỗng, máy khách biết tỉnh nào sắp bị đánh từ `daoTuan`. */
  dao: GiacDao[];
  /** Số trận hôm nay của mình (đăng nhập mới có). */
  tranNay: number;
  /** Đạo đã bị diệt mà mình có đánh (tuần, tỉnh) trong hai tuần gần đây, để nhận thưởng một lần. */
  thuong: { tuan: number; tinh: TinhId }[];
}

/** Khóa thưởng diệt đạo (ghi ở `VietNamState.nhan` để khỏi nhận hai lần). */
export const khoaThuong = (t: { tuan: number; tinh: string }): string => `${t.tuan}:${t.tinh}`;
