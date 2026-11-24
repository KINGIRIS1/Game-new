// Lôi đài Phong Châu (docs/thiet-ke.md mục Kế hoạch: Lôi đài Phong Châu): Vua Hùng mở hội tỉ võ trước sân chầu, tướng
// đấu theo lượt 3 đấu 3 với đội máy, leo 50 tầng. Luật riêng, không dính tới trận thời gian thực của `battle.ts`.
//
// - Thứ tự theo thanh hành động: ai tốc cao thì thanh đầy trước. Một vòng là thời gian người có tốc 1 đầy thanh.
// - Mỗi tướng ba chiêu: đánh thường và hai chiêu riêng, chiêu riêng dùng xong phải chờ vài lượt của mình.
// - Tám hiệu ứng trạng thái (`HieuUngLoi`), tính theo lượt của người mang.
// - Không có số ngẫu nhiên: cùng đội, cùng cách bấm thì ra cùng kết quả.
// - Thần thú đứng ngoài sân: không có máu, thanh đầy thì tự ra chiêu.
//
// Phần lưu `GameState.loiDai` là trường tùy chọn (như `thanThu`), không lên phiên bản lưu.

import { HERO_KINDS, type HeroKind } from './battle';
import { capBonus } from './daNgoaiTran';
import {
  BO_CHUONG,
  BO_CUA,
  BO_DA,
  LAC_TUONG_LOI,
  LOI_DAI,
  LOI_GIAC,
  LOI_HE,
  LOI_LINH,
  LOI_MOC,
  LOI_THU,
  THAN_THU_IDS,
  TUONG_DA_IDS,
  type BoDo,
  type Chapter,
  type ChieuGiac,
  type FighterStats,
  type LoiGiac,
  type LoiLinh,
  type ThanThuId,
} from './defs';
import { tuongJoined } from './doanhTrai';
import { gain, type FailReason, type GameState, type Result } from './game';
import { chapterOf } from './manVao';
import { capThu, heThu, thuCo } from './thanThu';
import { HERO_STATS, monDangMac, roiDo, tinhDo, type ChiSoDo, type RoiDo } from './trangBi';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

// ---------- Tướng, chiêu ----------

/** Tướng lên đài được: mười một tướng ra trận và Lạc tướng. */
export type LoiTuong = HeroKind | 'lacTuong';
export const LOI_TUONG: LoiTuong[] = ['lacTuong', ...HERO_KINDS];
/** Ai đứng trên sân: tướng, võ sĩ, tướng giặc. */
export type LoiKind = LoiTuong | LoiLinh | LoiGiac;
export const laLoiTuong = (k: string): k is LoiTuong => (LOI_TUONG as string[]).includes(k);

export type ChieuTuong =
  | 'trongTran' | 'coLenh'
  | 'phunLua' | 'nhoTre'
  | 'bocDoi' | 'doiNon'
  | 'noThan' | 'ruaVang'
  | 'lienChau' | 'lenhBan'
  | 'voiXung' | 'loiThe'
  | 'hieuTrieu' | 'tienPhong'
  | 'chemCaKinh' | 'dapSong'
  | 'ngayAn' | 'mongRong'
  | 'hacDe' | 'phaAch'
  | 'cocBachDang' | 'trieuRut'
  | 'namQuoc' | 'tienPhat';
export type ChieuId = 'danh' | ChieuTuong | ChieuGiac;

/** Chiêu nhắm vào đâu: một địch, cả ba địch, một đồng đội khác mình, cả đội ta. */
export type MucChieu = 'dich' | 'caDich' | 'dong' | 'caTa';

/**
 * Một chiêu: nhắm vào đâu, dùng xong chờ `cho` lượt của mình, đầu trận chờ `dau` lượt; `he` là sức đòn so với đòn
 * thường; `v` và `luot` là độ mạnh và số lượt của hiệu ứng đi kèm (ý nghĩa theo từng chiêu, xem `dungChieu`).
 */
export interface ChieuDef {
  muc: MucChieu;
  cho: number;
  dau: number;
  he?: number;
  v?: number;
  luot?: number;
}

export const CHIEU: Record<ChieuId, ChieuDef> = {
  danh: { muc: 'dich', cho: 0, dau: 0, he: 1 },
  // Lạc tướng: Trống trận tăng sức đánh cả đội; Cờ lệnh cho một đồng đội ra lượt ngay.
  trongTran: { muc: 'caTa', cho: 4, dau: 0, v: 0.3, luot: 2 },
  coLenh: { muc: 'dong', cho: 3, dau: 1 },
  // Gióng: ngựa sắt phun lửa một địch, cháy dần; nhổ tre quét cả ba.
  phunLua: { muc: 'dich', cho: 3, dau: 0, he: 1.6, v: 0.8, luot: 2 },
  nhoTre: { muc: 'caDich', cho: 4, dau: 1, he: 1.05 },
  // Sơn Tinh: bốc đồi ném một địch; dời non giữ chân cả ba (chậm thanh hành động).
  bocDoi: { muc: 'dich', cho: 3, dau: 0, he: 2.3 },
  doiNon: { muc: 'caDich', cho: 4, dau: 1, he: 0.5, v: 0.4, luot: 2 },
  // An Dương Vương: nỏ thần bắn một địch; Rùa Vàng che cả đội.
  noThan: { muc: 'dich', cho: 3, dau: 0, he: 2.5 },
  ruaVang: { muc: 'caTa', cho: 4, dau: 1, v: 0.45, luot: 1 },
  // Cao Lỗ: nỏ liên châu bắn cả ba; Lệnh bắn cho mỗi người đội ta bắn một đòn vào một địch.
  lienChau: { muc: 'caDich', cho: 3, dau: 0, he: 1 },
  lenhBan: { muc: 'dich', cho: 4, dau: 1, he: 0.85 },
  // Trưng Trắc: voi xung trận làm choáng; lời thề Hát Môn xóa hiệu ứng xấu, tăng sức đánh.
  voiXung: { muc: 'dich', cho: 4, dau: 0, he: 1.7, luot: 1 },
  loiThe: { muc: 'caTa', cho: 4, dau: 1, v: 0.25, luot: 2 },
  // Trưng Nhị: hiệu triệu hồi máu cả đội; tiên phong phá khiên.
  hieuTrieu: { muc: 'caTa', cho: 4, dau: 1, v: 0.18 },
  tienPhong: { muc: 'dich', cho: 3, dau: 0, he: 2.1 },
  // Bà Triệu: chém cá kình; đạp sóng dữ đánh cả ba, đẩy lùi thanh hành động.
  chemCaKinh: { muc: 'dich', cho: 4, dau: 1, he: 3 },
  dapSong: { muc: 'caDich', cho: 3, dau: 0, he: 0.8, v: 0.3 },
  // Triệu Quang Phục: cả đội ẩn tới lượt mình, đòn đầu sau ẩn mạnh; móng rồng xuyên giáp, xuyên khiên.
  ngayAn: { muc: 'caTa', cho: 4, dau: 0, luot: 1 },
  mongRong: { muc: 'dich', cho: 3, dau: 1, he: 2 },
  // Mai Thúc Loan: Hắc Đế dấy binh tăng sức cả đội, kéo giặc đánh vào ông; phá ách hồi máu theo sát thương.
  hacDe: { muc: 'caTa', cho: 4, dau: 0, v: 0.3, luot: 2 },
  phaAch: { muc: 'dich', cho: 3, dau: 1, he: 1.8, v: 0.6 },
  // Ngô Quyền: bãi cọc làm cả ba chậm, mất máu dần; triều rút đánh cả ba, ai đang chậm hay mất máu chịu gấp đôi.
  cocBachDang: { muc: 'caDich', cho: 4, dau: 0, he: 0.5, v: 0.35, luot: 2 },
  trieuRut: { muc: 'caDich', cho: 3, dau: 1, he: 0.75 },
  // Lý Thường Kiệt: Nam quốc sơn hà hồi máu đội ta, làm địch yếu đòn; tiên phát chế nhân làm chậm một địch.
  namQuoc: { muc: 'caTa', cho: 4, dau: 1, v: 0.14, luot: 2 },
  tienPhat: { muc: 'dich', cho: 3, dau: 0, he: 2, v: 0.4, luot: 2 },
  // Giặc.
  giacChem: { muc: 'dich', cho: 3, dau: 1, he: 2 },
  giacQuet: { muc: 'caDich', cho: 4, dau: 1, he: 0.9 },
  giacChoang: { muc: 'dich', cho: 4, dau: 2, he: 1.3, luot: 1 },
  giacHo: { muc: 'caTa', cho: 5, dau: 2, v: 0.25, luot: 2 },
};

/** Phần sát thương mất máu dần của bãi cọc so với đòn thường, phần đòn yếu đi của Nam quốc sơn hà. */
const COC_CHAY = 0.5;
const NAM_QUOC_YEU = 0.3;

/** Hai chiêu riêng của mỗi tướng. */
export const CHIEU_TUONG: Record<LoiTuong, [ChieuTuong, ChieuTuong]> = {
  lacTuong: ['trongTran', 'coLenh'],
  giong: ['phunLua', 'nhoTre'],
  sonTinh: ['bocDoi', 'doiNon'],
  anDuong: ['noThan', 'ruaVang'],
  caoLo: ['lienChau', 'lenhBan'],
  trungTrac: ['voiXung', 'loiThe'],
  trungNhi: ['hieuTrieu', 'tienPhong'],
  baTrieu: ['chemCaKinh', 'dapSong'],
  trieuQuangPhuc: ['ngayAn', 'mongRong'],
  maiThucLoan: ['hacDe', 'phaAch'],
  ngoQuyen: ['cocBachDang', 'trieuRut'],
  lyThuongKiet: ['namQuoc', 'tienPhat'],
};

/** Tám chiêu chỉ có trên lôi đài (tướng một kỹ năng được thêm). */
export const CHIEU_MOI: ChieuTuong[] = ['coLenh', 'loiThe', 'tienPhong', 'dapSong', 'mongRong', 'phaAch', 'trieuRut', 'tienPhat'];

export const chieuCua = (kind: LoiKind): ChieuId[] =>
  laLoiTuong(kind) ? ['danh', ...CHIEU_TUONG[kind]] : kind in LOI_GIAC ? ['danh', ...LOI_GIAC[kind as LoiGiac].chieu] : ['danh'];

// ---------- Trận ----------

/** Tám hiệu ứng trạng thái: choáng, chậm, mất máu dần, yếu đòn, tăng sức đánh, ẩn, khiêu khích, khiên. */
export type HieuUngLoi = 'choang' | 'cham' | 'chayMau' | 'yeu' | 'hang' | 'an' | 'khieuKhich' | 'khien';
export const HIEU_UNG_LOI: HieuUngLoi[] = ['choang', 'cham', 'chayMau', 'yeu', 'hang', 'an', 'khieuKhich', 'khien'];
const XAU: HieuUngLoi[] = ['choang', 'cham', 'chayMau', 'yeu'];

export interface LoiUnit {
  id: number;
  /** 0 đội người chơi, 1 đội máy. */
  phe: 0 | 1;
  kind: LoiKind;
  /** Chỗ đứng trong đội, 0–2. */
  cho: number;
  mau: number;
  mauMax: number;
  danh: number;
  /** Tốc: phần thanh hành động đầy thêm mỗi vòng. */
  toc: number;
  giap: number;
  /** Hệ số đòn chiêu riêng. */
  uy: number;
  /** Thanh hành động, 0–1. */
  tb: number;
  chieu: ChieuId[];
  /** Số lượt còn chờ của từng chiêu. */
  cd: number[];
  /** Phần thời gian chờ chiêu bớt đi (chỉ số hồi kỹ năng của đồ). */
  hoi: number;
  hu: Partial<Record<HieuUngLoi, { luot: number; v: number }>>;
  nga: boolean;
  /** Vừa ẩn: đòn đầu sau đó mạnh thêm. */
  phuc?: boolean;
  /** Mặc đủ bốn món bộ mình (vũ khí ánh lên). */
  bo4?: boolean;
  /** Tướng đã hiển linh (có hào quang). */
  glow?: boolean;
}

export interface LoiThuTran {
  kind: ThanThuId;
  cap: number;
  tb: number;
}

/** Việc vừa xảy ra, để cảnh và giao diện diễn lại theo thứ tự. `ai` âm là thần thú: −1 đội ta, −2 đội máy. */
export type LoiSk =
  | { t: 'chieu'; ai: number; chieu: ChieuId | ThanThuId; muc: number[] }
  | { t: 'mat'; id: number; n: number }
  | { t: 'hoi'; id: number; n: number }
  | { t: 'hu'; id: number; hu: HieuUngLoi; on: boolean }
  | { t: 'day'; id: number }
  | { t: 'boLuot'; id: number }
  | { t: 'nga'; id: number }
  | { t: 'het'; kq: 'thang' | 'thua' };

export interface LoiTran {
  tang: number;
  units: LoiUnit[];
  /** Thần thú đội ta, đội máy. */
  thu: [LoiThuTran | null, LoiThuTran | null];
  /** Thời gian đã qua, tính bằng vòng. */
  tg: number;
  /** Ai đang tới lượt: id người, hay −1, −2 là thần thú đội ta, đội máy; null là chưa tới ai. */
  dang: number | null;
  kq: 'thang' | 'thua' | null;
  sk: LoiSk[];
}

/** Một người vào trận: loại, chỉ số gốc, phần cộng đồ, phần cộng máu và sức đánh chung. */
export interface LoiSetup {
  kind: LoiKind;
  do?: ChiSoDo;
  /** Phần cộng máu, sức đánh (cấp chung của người chơi). */
  cong?: number;
  /** Hệ số máu, sức đánh (đội máy theo tầng). */
  he?: number;
  glow?: boolean;
}

export const loiStats = (kind: LoiKind): FighterStats =>
  kind === 'lacTuong' ? LAC_TUONG_LOI : laLoiTuong(kind) ? HERO_STATS[kind] : kind in LOI_GIAC ? LOI_GIAC[kind as LoiGiac] : LOI_LINH[kind as LoiLinh];

function taoUnit(id: number, phe: 0 | 1, cho: number, su: LoiSetup): LoiUnit {
  const st = loiStats(su.kind);
  const d = su.do;
  const he = su.he ?? 1;
  const cong = su.cong ?? 0;
  const mauMax = Math.round(st.hp * (1 + (d?.mau ?? 0) + cong) * he);
  const chieu = chieuCua(su.kind);
  const hoi = d?.hoi ?? 0;
  return {
    id,
    phe,
    kind: su.kind,
    cho,
    mau: mauMax,
    mauMax,
    danh: st.dmg * (1 + (d?.danh ?? 0) + cong) * he,
    toc: (1 / st.cooldown) * (1 + (d?.toc ?? 0)),
    giap: d?.giap ?? 0,
    uy: 1 + (d?.uy ?? 0) + (d?.bo4 ? LOI_DAI.bo4 : 0),
    tb: 0,
    chieu,
    cd: chieu.map((c) => CHIEU[c].dau),
    hoi,
    hu: {},
    nga: false,
    ...(d?.bo4 ? { bo4: true } : {}),
    ...(su.glow ? { glow: true } : {}),
  };
}

/** Dựng trận từ hai đội (mỗi đội tối đa ba người) và thần thú mỗi bên. */
export function taoTran(tang: number, ta: LoiSetup[], dich: LoiSetup[], thuTa: { kind: ThanThuId; cap: number } | null = null, thuDich: { kind: ThanThuId; cap: number } | null = null): LoiTran {
  const units: LoiUnit[] = [];
  ta.slice(0, LOI_DAI.doi).forEach((su, i) => units.push(taoUnit(units.length, 0, i, su)));
  dich.slice(0, LOI_DAI.doi).forEach((su, i) => units.push(taoUnit(units.length, 1, i, su)));
  return {
    tang,
    units,
    thu: [thuTa ? { ...thuTa, tb: 0 } : null, thuDich ? { ...thuDich, tb: 0 } : null],
    tg: 0,
    dang: null,
    kq: null,
    sk: [],
  };
}

export const conSong = (b: LoiTran, phe: 0 | 1): LoiUnit[] => b.units.filter((u) => u.phe === phe && !u.nga);
const doiKia = (phe: 0 | 1): 0 | 1 => (phe === 0 ? 1 : 0);

/** Số vòng đã qua (vòng đang đánh), từ 1. */
export const vongNay = (b: LoiTran): number => Math.min(LOI_DAI.vong, Math.max(1, Math.ceil(b.tg - 1e-9)));

/** Tốc đầy thanh lúc này (đang chậm thì bớt). */
const tocNay = (u: LoiUnit): number => u.toc * (1 - (u.hu.cham?.v ?? 0));
const tocThu = 1 / LOI_DAI.thuVong;

/**
 * Thứ tự ra lượt sắp tới (`n` lượt), tính trước mà không đổi trận: id người, hay −1, −2 là thần thú. Chỉ để giao diện
 * vẽ dải thứ tự; hiệu ứng làm chậm, đẩy lùi về sau sẽ làm lệch.
 */
export function thuTu(b: LoiTran, n: number): number[] {
  const ds: { id: number; tb: number; toc: number }[] = b.units.filter((u) => !u.nga).map((u) => ({ id: u.id, tb: u.tb, toc: tocNay(u) }));
  b.thu.forEach((t, i) => {
    if (t && conSong(b, i as 0 | 1).length) ds.push({ id: -1 - i, tb: t.tb, toc: tocThu });
  });
  const out: number[] = [];
  if (b.dang !== null) {
    out.push(b.dang);
    const d = ds.find((x) => x.id === b.dang);
    if (d) d.tb = 0;
  }
  while (out.length < n && ds.length) {
    let best = ds[0];
    let dtBest = Infinity;
    for (const x of ds) {
      const dt = (1 - x.tb) / x.toc;
      if (dt < dtBest - 1e-9) {
        best = x;
        dtBest = dt;
      }
    }
    for (const x of ds) x.tb += x.toc * dtBest;
    best.tb = 0;
    out.push(best.id);
  }
  return out;
}

function ketThuc(b: LoiTran): boolean {
  if (b.kq) return true;
  const ta = conSong(b, 0).length;
  const dich = conSong(b, 1).length;
  if (ta && dich) return false;
  // Hai bên cùng ngã hết (mất máu dần) thì tính thua.
  b.kq = ta && !dich ? 'thang' : 'thua';
  b.dang = null;
  b.sk.push({ t: 'het', kq: b.kq });
  return true;
}

function matMau(b: LoiTran, t: LoiUnit, n: number): number {
  if (t.nga) return 0;
  const mat = Math.max(1, Math.round(n));
  t.mau = Math.max(0, t.mau - mat);
  b.sk.push({ t: 'mat', id: t.id, n: mat });
  if (t.mau <= 0) {
    t.nga = true;
    t.hu = {};
    t.phuc = false;
    b.sk.push({ t: 'nga', id: t.id });
  }
  return mat;
}

function hoiMau(b: LoiTran, t: LoiUnit, n: number): void {
  if (t.nga) return;
  const hoi = Math.min(t.mauMax - t.mau, Math.round(n));
  if (hoi <= 0) return;
  t.mau += hoi;
  b.sk.push({ t: 'hoi', id: t.id, n: hoi });
}

/** Gắn hiệu ứng `hu` lên `t` trong `luot` lượt của `t`. Tự gắn cho mình giữa lượt thì cộng một lượt (lượt này sắp hết). */
function gan(b: LoiTran, t: LoiUnit, hu: HieuUngLoi, luot: number, v = 0): void {
  if (t.nga) return;
  const them = b.dang === t.id ? 1 : 0;
  const cu = t.hu[hu];
  t.hu[hu] = { luot: Math.max(cu?.luot ?? 0, luot + them), v: Math.max(cu?.v ?? 0, v) };
  if (!cu) b.sk.push({ t: 'hu', id: t.id, hu, on: true });
}

function go(b: LoiTran, t: LoiUnit, hu: HieuUngLoi): void {
  if (!t.hu[hu]) return;
  delete t.hu[hu];
  b.sk.push({ t: 'hu', id: t.id, hu, on: false });
}

/** Đẩy lùi thanh hành động của `t` một phần `v`. */
function dayLui(b: LoiTran, t: LoiUnit, v: number): void {
  if (t.nga) return;
  t.tb = Math.max(0, t.tb - v);
  b.sk.push({ t: 'day', id: t.id });
}

/**
 * `u` đánh `t` một đòn mạnh `he` lần đòn thường. `ky`: đòn chiêu riêng, nhân uy lực. `xuyen`: bỏ qua giáp và khiên.
 * Trả sát thương đã gây.
 */
function don(b: LoiTran, u: LoiUnit, t: LoiUnit, he: number, ky: boolean, xuyen = false): number {
  if (t.nga) return 0;
  let n = u.danh * LOI_DAI.don * he * (ky ? u.uy : 1);
  n *= 1 + (u.hu.hang?.v ?? 0);
  n *= 1 - (u.hu.yeu?.v ?? 0);
  if (u.phuc) n *= LOI_DAI.phuc;
  if (!xuyen) n *= (1 - t.giap) * (1 - (t.hu.khien?.v ?? 0));
  return matMau(b, t, n);
}

/**
 * Những địch `u` nhắm được bằng đòn đơn: có người khiêu khích thì chỉ người ấy; người đang ẩn không nhắm được, trừ khi
 * cả đội kia đều ẩn.
 */
export function mucDuoc(b: LoiTran, u: LoiUnit): LoiUnit[] {
  const dich = conSong(b, doiKia(u.phe));
  const keo = dich.filter((t) => t.hu.khieuKhich);
  if (keo.length) return keo;
  const lo = dich.filter((t) => !t.hu.an);
  return lo.length ? lo : dich;
}

/** Những người chiêu `ci` của `u` chọn được làm mục tiêu (chiêu đánh cả đội thì rỗng: không phải chọn). */
export function chonDuoc(b: LoiTran, u: LoiUnit, ci: number): LoiUnit[] {
  const def = CHIEU[u.chieu[ci]];
  if (def.muc === 'dich') return mucDuoc(b, u);
  if (def.muc === 'dong') return conSong(b, u.phe).filter((t) => t.id !== u.id);
  return [];
}

/** Số lượt chờ của chiêu `c` với người có phần hồi kỹ năng `hoi`. */
export const choCua = (c: ChieuId, hoi: number): number => (CHIEU[c].cho ? Math.max(1, Math.round(CHIEU[c].cho * (1 - hoi))) : 0);

/** Chiêu `ci` của `u` dùng được lúc này không. */
export function chieuDuoc(b: LoiTran, u: LoiUnit, ci: number): boolean {
  if (ci < 0 || ci >= u.chieu.length || u.cd[ci] > 0) return false;
  return CHIEU[u.chieu[ci]].muc !== 'dong' || chonDuoc(b, u, ci).length > 0;
}

function dungChieu(b: LoiTran, u: LoiUnit, c: ChieuId, muc: LoiUnit | null): void {
  const def = CHIEU[c];
  const ta = conSong(b, u.phe);
  const dich = conSong(b, doiKia(u.phe));
  const ky = c !== 'danh';
  const he = def.he ?? 1;
  const v = def.v ?? 0;
  const luot = def.luot ?? 0;
  const trung = def.muc === 'caDich' ? dich : def.muc === 'caTa' ? ta : muc ? [muc] : [];
  b.sk.push({ t: 'chieu', ai: u.id, chieu: c, muc: trung.map((t) => t.id) });
  switch (c) {
    case 'trongTran':
    case 'giacHo':
      for (const t of ta) gan(b, t, 'hang', luot, v);
      break;
    case 'coLenh':
      if (muc) muc.tb = 1;
      break;
    case 'phunLua':
      if (muc && don(b, u, muc, he, ky) && !muc.nga) gan(b, muc, 'chayMau', luot, u.danh * LOI_DAI.don * v * u.uy);
      break;
    case 'doiNon':
      for (const t of dich) {
        don(b, u, t, he, ky);
        gan(b, t, 'cham', luot, v);
      }
      break;
    case 'ruaVang':
      for (const t of ta) gan(b, t, 'khien', luot, v);
      break;
    case 'lenhBan':
      // Cả đội cùng bắn: mỗi người một đòn thường vào mục tiêu.
      if (muc) for (const t of ta) don(b, t, muc, he, t.id === u.id);
      break;
    case 'voiXung':
    case 'giacChoang':
      if (muc && don(b, u, muc, he, ky) && !muc.nga) gan(b, muc, 'choang', luot);
      break;
    case 'loiThe':
      for (const t of ta) {
        for (const x of XAU) go(b, t, x);
        gan(b, t, 'hang', luot, v);
      }
      break;
    case 'hieuTrieu':
      for (const t of ta) hoiMau(b, t, t.mauMax * v * u.uy);
      break;
    case 'tienPhong':
      if (muc) {
        go(b, muc, 'khien');
        don(b, u, muc, he, ky);
      }
      break;
    case 'dapSong':
      for (const t of dich) {
        don(b, u, t, he, ky);
        dayLui(b, t, v);
      }
      break;
    case 'ngayAn':
      for (const t of ta) {
        gan(b, t, 'an', luot);
        t.phuc = true;
      }
      break;
    case 'mongRong':
      if (muc) don(b, u, muc, he, ky, true);
      break;
    case 'hacDe':
      for (const t of ta) gan(b, t, 'hang', luot, v);
      gan(b, u, 'khieuKhich', luot);
      break;
    case 'phaAch':
      if (muc) hoiMau(b, u, don(b, u, muc, he, ky) * v);
      break;
    case 'cocBachDang':
      for (const t of dich) {
        don(b, u, t, he, ky);
        gan(b, t, 'cham', luot, v);
        gan(b, t, 'chayMau', luot, u.danh * LOI_DAI.don * COC_CHAY * u.uy);
      }
      break;
    case 'trieuRut':
      for (const t of dich) don(b, u, t, he * (t.hu.cham || t.hu.chayMau ? 2 : 1), ky);
      break;
    case 'namQuoc':
      for (const t of ta) hoiMau(b, t, t.mauMax * v * u.uy);
      for (const t of dich) gan(b, t, 'yeu', luot, NAM_QUOC_YEU);
      break;
    case 'tienPhat':
      if (muc && don(b, u, muc, he, ky) && !muc.nga) gan(b, muc, 'cham', luot, v);
      break;
    default:
      // Đòn thường và các chiêu chỉ gây sát thương: một địch hay cả ba.
      for (const t of trung) don(b, u, t, he, ky);
  }
}

/** Hết lượt của `u`: chiêu bớt một lượt chờ, hiệu ứng bớt một lượt. */
function hetLuot(b: LoiTran, u: LoiUnit): void {
  for (let i = 0; i < u.cd.length; i++) if (u.cd[i] > 0) u.cd[i]--;
  for (const k of HIEU_UNG_LOI) {
    const h = u.hu[k];
    if (h && --h.luot <= 0) go(b, u, k);
  }
}

function thuRa(b: LoiTran, phe: 0 | 1): void {
  const thu = b.thu[phe]!;
  const he = heThu(thu.cap);
  const ta = conSong(b, phe);
  const dich = conSong(b, doiKia(phe));
  const k = thu.kind;
  const trung = k === 'thuRua' ? ta : k === 'thuGa' ? dich.slice().sort((a, c) => a.mau - c.mau || a.cho - c.cho).slice(0, 1) : dich;
  b.sk.push({ t: 'chieu', ai: -1 - phe, chieu: k, muc: trung.map((t) => t.id) });
  const giam = (t: LoiUnit, n: number) => n * (1 - t.giap) * (1 - (t.hu.khien?.v ?? 0));
  if (k === 'thuLac') for (const t of dich) matMau(b, t, giam(t, LOI_THU.thuLac.dmg * he));
  else if (k === 'thuNgua')
    for (const t of dich) {
      matMau(b, t, giam(t, LOI_THU.thuNgua.dmg * he));
      gan(b, t, 'chayMau', LOI_THU.thuNgua.luot, LOI_THU.thuNgua.chay * he);
    }
  else if (k === 'thuGa') for (let i = 0; i < LOI_THU.thuGa.don; i++) for (const t of trung) matMau(b, t, giam(t, LOI_THU.thuGa.dmg * he));
  else if (k === 'thuRua') {
    const v = Math.min(LOI_THU.thuRua.giamMax, LOI_THU.thuRua.giam + (he - 1) * 0.1);
    for (const t of ta) gan(b, t, 'khien', LOI_THU.thuRua.luot, v);
  } else
    for (const t of dich) {
      matMau(b, t, giam(t, LOI_THU.thuRong.dmg * he));
      dayLui(b, t, LOI_THU.thuRong.day);
    }
}

/**
 * Đẩy trận tới lượt kế: thanh hành động chạy tới khi có người đầy; đầu lượt người mất máu dần thì mất máu, người
 * choáng thì mất lượt. Trả id người (hay −1, −2 là thần thú) đang chờ ra chiêu (`ra`), hay null khi trận đã xong.
 */
export function toiLuot(b: LoiTran): number | null {
  if (b.dang !== null) return b.dang;
  for (;;) {
    if (ketThuc(b)) return null;
    type Ung = { toc: number; lay: () => number; dat: (x: number) => void; id: number };
    const ds: Ung[] = b.units.filter((u) => !u.nga).map((u) => ({ id: u.id, toc: tocNay(u), lay: () => u.tb, dat: (x) => (u.tb = x) }));
    b.thu.forEach((t, i) => {
      if (t && conSong(b, i as 0 | 1).length) ds.push({ id: -1 - i, toc: tocThu, lay: () => t.tb, dat: (x) => (t.tb = x) });
    });
    let best = ds[0];
    let dtBest = Infinity;
    for (const x of ds) {
      const dt = Math.max(0, 1 - x.lay()) / x.toc;
      if (dt < dtBest - 1e-9) {
        best = x;
        dtBest = dt;
      }
    }
    for (const x of ds) x.dat(Math.min(1, x.lay() + x.toc * dtBest));
    b.tg += dtBest;
    if (b.tg >= LOI_DAI.vong) {
      b.kq = 'thua';
      b.sk.push({ t: 'het', kq: 'thua' });
      return null;
    }
    best.dat(0);
    if (best.id < 0) {
      b.dang = best.id;
      return b.dang;
    }
    const u = b.units[best.id];
    b.dang = u.id;
    const chay = u.hu.chayMau;
    if (chay) matMau(b, u, chay.v);
    if (u.nga) {
      b.dang = null;
      continue;
    }
    if (u.hu.choang) {
      b.sk.push({ t: 'boLuot', id: u.id });
      hetLuot(b, u);
      b.dang = null;
      continue;
    }
    return b.dang;
  }
}

/**
 * Người đang tới lượt ra chiêu thứ `ci` vào mục tiêu `mucId` (chiêu đánh cả đội thì không cần). Thần thú tới lượt thì
 * gọi không tham số. Sai (chiêu còn chờ, mục tiêu không hợp) thì trả false, trận không đổi.
 */
export function ra(b: LoiTran, ci = 0, mucId?: number): boolean {
  if (b.kq || b.dang === null) return false;
  if (b.dang < 0) {
    thuRa(b, (-1 - b.dang) as 0 | 1);
    b.dang = null;
    ketThuc(b);
    return true;
  }
  const u = b.units[b.dang];
  if (!chieuDuoc(b, u, ci)) return false;
  const c = u.chieu[ci];
  const chon = chonDuoc(b, u, ci);
  const muc = chon.length ? (chon.find((t) => t.id === mucId) ?? null) : null;
  if (chon.length && !muc) return false;
  const anTruoc = !!u.phuc;
  dungChieu(b, u, c, muc);
  // Ra đòn thì lộ diện; đòn mạnh sau ẩn chỉ một lần.
  if (anTruoc && (CHIEU[c].muc === 'dich' || CHIEU[c].muc === 'caDich')) {
    u.phuc = false;
    go(b, u, 'an');
  }
  u.cd[ci] = choCua(c, u.hoi) + (CHIEU[c].cho ? 1 : 0);
  hetLuot(b, u);
  b.dang = null;
  ketThuc(b);
  return true;
}

// ---------- Máy tự đánh ----------

const itMau = (ds: LoiUnit[]): LoiUnit | undefined => ds.slice().sort((a, c) => a.mau - c.mau || a.cho - c.cho)[0];

/** Chiêu `ci` có đáng dùng lúc này không; đáng thì trả mục tiêu (null với chiêu cả đội), không thì undefined. */
function nenDung(b: LoiTran, u: LoiUnit, ci: number): LoiUnit | null | undefined {
  if (!chieuDuoc(b, u, ci)) return undefined;
  const c = u.chieu[ci];
  const ta = conSong(b, u.phe);
  const dich = conSong(b, doiKia(u.phe));
  const chon = chonDuoc(b, u, ci);
  switch (c) {
    case 'trongTran':
    case 'giacHo':
    case 'hacDe':
      return ta.some((t) => !t.hu.hang) ? null : undefined;
    case 'loiThe':
      return ta.some((t) => !t.hu.hang || XAU.some((x) => t.hu[x])) ? null : undefined;
    case 'ruaVang':
      return ta.some((t) => !t.hu.khien) ? null : undefined;
    case 'ngayAn':
      return !u.phuc ? null : undefined;
    case 'hieuTrieu':
    case 'namQuoc':
      return ta.some((t) => t.mau < t.mauMax * 0.65) ? null : undefined;
    case 'coLenh':
      return chon.slice().sort((a, x) => x.danh - a.danh || a.cho - x.cho)[0];
    case 'tienPhong':
    case 'mongRong':
      return chon.find((t) => t.hu.khien) ?? itMau(chon);
    case 'trieuRut':
      // Chờ bãi cọc làm giặc chậm đã; bãi cọc còn lâu mới dùng lại được thì cứ đánh.
      return dich.some((t) => t.hu.cham || t.hu.chayMau) || u.cd[1] > 1 ? null : undefined;
    default:
      return CHIEU[c].muc === 'dich' ? itMau(chon) : null;
  }
}

/** Máy chọn chiêu cho người đang tới lượt: chiêu riêng nào đáng dùng thì dùng, không thì đánh thường người ít máu nhất. */
export function tuChon(b: LoiTran): { chieu: number; muc?: number } {
  const u = b.dang !== null && b.dang >= 0 ? b.units[b.dang] : null;
  if (!u) return { chieu: 0 };
  for (let ci = 1; ci < u.chieu.length; ci++) {
    const m = nenDung(b, u, ci);
    if (m !== undefined) return { chieu: ci, ...(m ? { muc: m.id } : {}) };
  }
  return { chieu: 0, muc: itMau(mucDuoc(b, u))?.id };
}

/** Cho máy đánh trọn trận (cả hai đội). Trả kết quả. */
export function tuDanhHet(b: LoiTran): 'thang' | 'thua' {
  for (let i = 0; i < 5000 && !b.kq; i++) {
    const ai = toiLuot(b);
    if (ai === null) break;
    if (ai < 0) ra(b);
    else {
      const c = tuChon(b);
      ra(b, c.chieu, c.muc);
    }
  }
  return b.kq ?? 'thua';
}

// ---------- Tầng ----------

export const laMoc = (tang: number): boolean => tang % LOI_DAI.moiChuong === 0;
export const chuongTang = (tang: number): Chapter => Math.min(5, Math.ceil(tang / LOI_DAI.moiChuong)) as Chapter;

/** Tướng truyện đã có ở mỗi chương (cộng dồn). */
const BONG: Record<Chapter, LoiTuong[]> = {
  1: ['lacTuong', 'giong'],
  2: ['lacTuong', 'giong', 'sonTinh'],
  3: ['giong', 'sonTinh', 'anDuong', 'lacTuong'],
  4: ['sonTinh', 'anDuong', 'caoLo', 'giong', 'lacTuong'],
  5: ['trungTrac', 'trungNhi', 'caoLo', 'anDuong', 'sonTinh', 'giong', 'lacTuong', ...TUONG_DA_IDS],
};
const VO_SI: Record<Chapter, LoiLinh[]> = { 1: ['giao', 'cung'], 2: ['giao', 'cung'], 3: ['cung', 'giao'], 4: ['no', 'giao'], 5: ['no', 'cung'] };

/**
 * Đội máy của tầng `tang`. Tầng mốc: tướng giặc xưa (`LOI_MOC`), từ tầng 20 có thú bóng. Tầng thường: bóng các tướng
 * ta của chương ấy trở về trước (bóng tướng dã ngoại chỉ ở tầng 41–50), tầng đầu mỗi chương có võ sĩ đứng thay.
 */
export function doiTang(tang: number): { doi: LoiSetup[]; thu: { kind: ThanThuId; cap: number } | null } {
  const c = chuongTang(tang);
  const he = LOI_HE[tang - 1] ?? 1;
  if (laMoc(tang)) {
    const m = LOI_MOC[c - 1];
    return { doi: m.doi.map((kind) => ({ kind, he })), thu: m.thu ? { kind: m.thu, cap: Math.round(tang / 2) } : null };
  }
  const i = (tang - 1) % LOI_DAI.moiChuong;
  const pool = BONG[c];
  const soTuong = Math.min(pool.length, c === 1 ? (i < 3 ? 1 : 2) : i < 2 ? 2 : 3);
  const doi: LoiSetup[] = [];
  for (let k = 0; k < soTuong; k++) doi.push({ kind: pool[(i + k) % pool.length], he, glow: true });
  for (let k = 0; doi.length < LOI_DAI.doi; k++) doi.push({ kind: VO_SI[c][(i + k) % 2], he });
  // Tướng đứng giữa.
  if (soTuong === 1) doi.unshift(doi.pop()!);
  return { doi, thu: null };
}

// ---------- Phần lưu, vào trận, thưởng ----------

export interface LoiDaiState {
  /** Tầng cao nhất đã qua (0 là chưa qua tầng nào). */
  tang: number;
  /** Đội chọn lần trước. */
  doi: LoiTuong[];
  /** Thần thú chọn mang theo; null là chưa chọn (lấy con đầu đã về). */
  thu: ThanThuId | null;
  tuDanh: boolean;
  nhanh: boolean;
}

export const initialLoiDai = (): LoiDaiState => ({ tang: 0, doi: [], thu: null, tuDanh: false, nhanh: false });

/** Phần lôi đài của bản lưu (chưa có thì tạo). */
export function loiNay(s: GameState): LoiDaiState {
  if (!s.loiDai) s.loiDai = initialLoiDai();
  return s.loiDai;
}

/** Các tướng đã về, lên đài được. */
export const tuongLoi = (s: GameState): LoiTuong[] => LOI_TUONG.filter((k) => tuongJoined(s, k));

/** Lôi đài mở khi tướng thứ ba về. */
export const loiDaiMo = (s: GameState): boolean => tuongLoi(s).length >= LOI_DAI.doi;

/** Tầng cao nhất đã mở theo chương đang chơi. */
export const tangMo = (s: GameState): number => Math.min(LOI_DAI.tang, chapterOf(s) * LOI_DAI.moiChuong);

/** Tầng cao nhất đã qua. */
export const tangQua = (s: GameState): number => s.loiDai?.tang ?? 0;

/** Tầng kế phải đánh; null khi đã qua hết tầng đang mở. */
export function tangKe(s: GameState): number | null {
  const t = tangQua(s) + 1;
  return t <= tangMo(s) ? t : null;
}

/** Đội lên đài lúc này: đội người chơi đã chọn (bỏ người chưa về; có thể chưa đủ ba); chưa chọn thì đội gợi ý. */
export function doiLoi(s: GameState): LoiTuong[] {
  const co = tuongLoi(s);
  const doi = (s.loiDai?.doi ?? []).filter((k, i, a) => co.includes(k) && a.indexOf(k) === i).slice(0, LOI_DAI.doi);
  return doi.length ? doi : doiGoiY(s);
}

/** Đội gợi ý: ba tướng truyện mới về nhất (chưa đủ thì lấy cả tướng dã ngoại). */
export function doiGoiY(s: GameState): LoiTuong[] {
  const co = tuongLoi(s);
  const truyen = co.filter((k) => !(TUONG_DA_IDS as string[]).includes(k));
  return [...truyen.slice(-LOI_DAI.doi), ...co.filter((k) => !truyen.includes(k))].slice(0, LOI_DAI.doi);
}

/** Chọn đội: một tới ba tướng đã về, không trùng. */
export function datDoiLoi(s: GameState, doi: LoiTuong[]): Result<void> {
  const co = tuongLoi(s);
  if (!doi.length || doi.length > LOI_DAI.doi || doi.some((k, i) => !co.includes(k) || doi.indexOf(k) !== i)) return fail('loiDoiSai');
  loiNay(s).doi = [...doi];
  return ok(undefined);
}

/** Thần thú mang lên đài: con đã chọn (nếu đã về), không thì con đầu đã về; chưa có thì null. */
export function thuLoi(s: GameState): ThanThuId | null {
  const co = thuCo(s);
  const chon = s.loiDai?.thu;
  return chon && co.includes(chon) ? chon : (co[0] ?? null);
}

export function chonThuLoi(s: GameState, id: ThanThuId): Result<void> {
  if (!thuCo(s).includes(id)) return fail('thuChuaVe');
  loiNay(s).thu = id;
  return ok(undefined);
}

/** Tướng `kind` của người chơi vào trận: chỉ số gốc, đồ đang mặc, cấp chung. Không tính huân công, phúc lành, nữ tướng. */
export function tuongVao(s: GameState, kind: LoiTuong): LoiSetup {
  const worn = kind === 'lacTuong' ? [] : monDangMac(s, kind);
  const glow =
    kind === 'giong' ? s.giong.ascended : kind === 'sonTinh' ? s.son.won : kind === 'anDuong' ? s.adv.bien : false;
  return { kind, ...(worn.length && kind !== 'lacTuong' ? { do: tinhDo(kind, worn) } : {}), cong: capBonus(s.daNgoai.cap), ...(glow ? { glow } : {}) };
}

/** Đánh tầng `tang` được không: lôi đài đã mở, tầng đã mở theo chương, và đã qua tầng trước. */
export function canDanhTang(s: GameState, tang: number): Result {
  if (!loiDaiMo(s)) return fail('loiChuaMo');
  if (!Number.isInteger(tang) || tang < 1 || tang > tangMo(s)) return fail('loiTangKhoa');
  if (tang > tangQua(s) + 1) return fail('loiTangKhoa');
  return ok(undefined);
}

/** Mở trận tầng `tang` với đội và thần thú đang chọn. */
export function moTran(s: GameState, tang: number): Result<LoiTran> {
  const check = canDanhTang(s, tang);
  if (!check.ok) return check;
  const doi = doiLoi(s);
  if (doi.length < LOI_DAI.doi) return fail('loiDoiSai');
  loiNay(s).doi = doi;
  const thu = thuLoi(s);
  const may = doiTang(tang);
  return ok(taoTran(tang, doi.map((k) => tuongVao(s, k)), may.doi, thu ? { kind: thu, cap: capThu(s, thu) } : null, may.thu));
}

export interface LoiThuong {
  sat: number;
  roi: RoiDo | null;
}

/** Sắt thưởng của tầng `tang`. */
export const satTang = (tang: number): number => (LOI_DAI.sat[0] + LOI_DAI.sat[1] * tang) * (laMoc(tang) ? LOI_DAI.satMoc : 1);

/** Bộ đồ rơi ở tầng `tang`: bộ của chương; tầng 41–50 thêm bộ của tướng dã ngoại đã về. */
function boTang(s: GameState, tang: number, chuong: Chapter): BoDo[] {
  const bo = [...BO_CHUONG[chuong]];
  if (tang > 40) for (const b of BO_DA) if (tuongJoined(s, BO_CUA[b])) bo.push(b);
  return bo;
}

/**
 * Trận xong: thắng tầng chưa qua thì ghi tầng và thưởng (sắt, một món đồ theo luật rơi đồ; cấp đồ không vượt chương đang
 * chơi). Đánh lại tầng đã qua hay thua thì không có gì.
 */
export function xongTran(s: GameState, b: LoiTran): LoiThuong | null {
  if (b.kq !== 'thang' || b.tang !== tangQua(s) + 1 || !canDanhTang(s, b.tang).ok) return null;
  loiNay(s).tang = b.tang;
  const sat = satTang(b.tang);
  gain(s, { sat });
  const chuong = Math.min(chuongTang(b.tang), chapterOf(s)) as Chapter;
  const roi = roiDo(s, laMoc(b.tang) ? 'thuDau' : 'manDau', chuong, undefined, boTang(s, b.tang, chuong));
  return { sat, roi };
}

/** Bản lưu: phần lôi đài đúng dạng. */
export function isLoiDaiState(v: unknown): v is LoiDaiState {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  if (typeof t.tang !== 'number' || !Number.isInteger(t.tang) || t.tang < 0 || t.tang > LOI_DAI.tang) return false;
  if (!Array.isArray(t.doi) || t.doi.length > LOI_DAI.doi || !t.doi.every((k) => typeof k === 'string' && laLoiTuong(k))) return false;
  if (typeof t.tuDanh !== 'boolean' || typeof t.nhanh !== 'boolean') return false;
  return t.thu === null || THAN_THU_IDS.includes(t.thu as ThanThuId);
}
