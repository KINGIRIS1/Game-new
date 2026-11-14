// Trang bị tướng: đồ rơi ngẫu nhiên ở phó bản, thử thách, đồn, giữ kinh đô; kho đồ, mặc tháo giữa các tướng, cường
// hóa ở lò rèn, phân giải ra sắt; sáu chỉ số tướng và hiệu ứng bộ (docs/thiet-ke.md mục Kế hoạch: trang bị rơi ngẫu
// nhiên và sáu chỉ số tướng). Code gọi là `trangBi`, `Mon` cho khỏi lẫn với `GEAR` (đồ sắt của Gióng trong truyện).

import type { HeroKind, HeroSetup } from './battle';
import {
  ADV,
  BO_CHUONG,
  BO_CUA,
  BO_DO,
  BO_HAI,
  CAO_LO,
  CAP_DO_GIA,
  CAP_DO_HE,
  CHI_SO,
  CHI_SO_HE,
  CHI_SO_TRAN,
  CUONG_HOA_GIA,
  CUONG_HOA_NAC,
  CUONG_HOA_TRAN,
  GIONG,
  HUAN_BONUS,
  KHO_DO_MAX,
  O_CHINH,
  O_DO,
  PHAM_CHINH,
  PHAM_TRAN,
  PHAN_GIAI_HOAN,
  PHAN_GIAI_SAT,
  PHU_NAC,
  PHU_NAC_MAX,
  PHU_THAP,
  ROI_DO,
  SON,
  TRUNG_NHI,
  TRUNG_TRAC,
  type BoDo,
  type Chapter,
  type ChiSo,
  type Cost,
  type FighterStats,
  type NguonDo,
  type ODo,
  type PhamDo,
} from './defs';
import { tuongJoined } from './doanhTrai';
import { canAfford, gain, pay, troopBonus, type FailReason, type GameState, type Result } from './game';
import { forgeLevel } from './giong';
import { roll } from './ngauNhien';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

/** Một món đồ trong kho. */
export interface Mon {
  id: number;
  o: ODo;
  bo: BoDo;
  pham: PhamDo;
  /** Cấp đồ: chương của trận rơi ra món này. */
  cap: Chapter;
  chinh: ChiSo;
  /** Chỉ số phụ (phẩm − 1 cái, không trùng nhau, không trùng chỉ số chính): chỉ số và nấc rút (1 tới `PHU_NAC_MAX`). */
  phu: { k: ChiSo; nac: number }[];
  /** Nấc cường hóa, 0 tới `CUONG_HOA_TRAN[pham]`. */
  cuong: number;
  /** Đã khóa: không phân giải được. */
  khoa?: true;
  /** Tướng đang mặc. */
  tuong?: HeroKind;
}

export interface TrangBiState {
  /** Mọi món đồ, kể cả món đang mặc (tối đa `KHO_DO_MAX`). */
  kho: Mon[];
  /** Lần rút đồ kế tiếp: số ngẫu nhiên lặp lại được theo số này, nên tải lại bản lưu không rút lại được món khác. */
  seq: number;
  /** Mã cho món kế tiếp. */
  nextId: number;
}

export const initialTrangBi = (): TrangBiState => ({ kho: [], seq: 0, nextId: 1 });

/** Phần cộng thêm của đồ một tướng đang mặc (đã cộng hiệu ứng hai món, đã chặn trần); `bo4`: đủ bốn món bộ mình. */
export type ChiSoDo = Record<ChiSo, number> & { bo4?: true };

/** Chỉ số gốc của từng tướng. */
export const HERO_STATS: Record<HeroKind, FighterStats> = {
  giong: GIONG,
  sonTinh: SON,
  anDuong: ADV,
  caoLo: CAO_LO,
  trungTrac: TRUNG_TRAC,
  trungNhi: TRUNG_NHI,
};

const khongDo = (): ChiSoDo => ({ mau: 0, danh: 0, toc: 0, uy: 0, giap: 0, hoi: 0 });

// ---------- Chỉ số của món ----------

/** Chỉ số chính của món (phần cộng thêm, 0,05 là 5%). */
export const chinhOf = (m: Mon): number => PHAM_CHINH[m.pham] * CHI_SO_HE[m.chinh] * CAP_DO_HE[m.cap] * (1 + CUONG_HOA_NAC * m.cuong);

/** Một chỉ số phụ của món. */
export const phuOf = (m: Pick<Mon, 'cap'>, p: { k: ChiSo; nac: number }): number =>
  (PHU_THAP + PHU_NAC * (p.nac - 1)) * CHI_SO_HE[p.k] * CAP_DO_HE[m.cap];

/** Mọi chỉ số món này cộng thêm. */
export function chiSoMon(m: Mon): Record<ChiSo, number> {
  const out = khongDo();
  out[m.chinh] += chinhOf(m);
  for (const p of m.phu) out[p.k] += phuOf(m, p);
  return out;
}

/** Điểm món: tổng chỉ số quy về cùng thang (chia hệ số theo chỉ số), để xếp món. */
export function diemMon(m: Mon): number {
  const c = chiSoMon(m);
  return CHI_SO.reduce((sum, k) => sum + c[k] / CHI_SO_HE[k], 0);
}

// ---------- Chỉ số tướng ----------

/** Các món tướng `kind` đang mặc. */
export const monDangMac = (s: GameState, kind: HeroKind): Mon[] => s.trangBi.kho.filter((m) => m.tuong === kind);

/** Món tướng `kind` đang mặc ở ô `o`. */
export const monO = (s: GameState, kind: HeroKind, o: ODo): Mon | undefined => s.trangBi.kho.find((m) => m.tuong === kind && m.o === o);

/** Số món của bộ mình tướng `kind` đang mặc trong `worn`. */
export const boDem = (kind: HeroKind, worn: Mon[]): number => worn.filter((m) => BO_CUA[m.bo] === kind).length;

/** Phần cộng của bộ đồ `worn` trên tướng `kind`: cộng mọi món, hiệu ứng hai món (đúng tướng của bộ), chặn trần. */
export function tinhDo(kind: HeroKind, worn: Mon[]): ChiSoDo {
  const out = khongDo();
  for (const m of worn) {
    const c = chiSoMon(m);
    for (const k of CHI_SO) out[k] += c[k];
  }
  const own = boDem(kind, worn);
  const bo = BO_DO.find((b) => BO_CUA[b] === kind);
  if (bo && own >= 2) out[BO_HAI[bo].k] += BO_HAI[bo].v;
  for (const k of CHI_SO) out[k] = Math.min(out[k], CHI_SO_TRAN[k] ?? Infinity);
  if (own >= 4) out.bo4 = true;
  return out;
}

/** Phần cộng của đồ tướng `kind` đang mặc; không mặc gì thì undefined. */
export function doCua(s: GameState, kind: HeroKind): ChiSoDo | undefined {
  const worn = monDangMac(s, kind);
  return worn.length ? tinhDo(kind, worn) : undefined;
}

/**
 * Gắn chỉ số đồ vào tướng ra trận (bản sao lúc vào trận: mặc đồ giữa trận không đổi trận đang đánh). Không mặc gì thì
 * giữ nguyên tướng, không thêm trường nào.
 */
export function ganDo(s: GameState, hero: HeroSetup): HeroSetup {
  const d = doCua(s, hero.kind);
  return d ? { ...hero, trangBi: d } : hero;
}

/** Chỉ số tổng của một tướng ở kinh đô (ngoài bãi máu và đòn kỹ năng còn nhân `FIELD.hpMul`). */
export interface ChiSoTuong {
  /** Máu, sát thương mỗi đòn, giây nghỉ giữa hai đòn, hệ số đòn kỹ năng. */
  mau: number;
  danh: number;
  nghi: number;
  uy: number;
  /** Phần sát thương bớt đi, phần thời gian hồi kỹ năng bớt đi. */
  giap: number;
  hoi: number;
  tam: number;
  chay: number;
  /** Phần cộng của Đền và phúc lành, của huân công, của đồ. */
  den: number;
  huan: number;
  do: ChiSoDo;
  lucChien: number;
}

/** Chỉ số tổng của tướng `kind` khi mặc bộ có phần cộng `d`. */
export function chiSoTu(s: GameState, kind: HeroKind, d: ChiSoDo): ChiSoTuong {
  const st = HERO_STATS[kind];
  const den = troopBonus(s);
  const huan = s.thuThach.bac.tuong * HUAN_BONUS;
  const c = {
    mau: st.hp * (1 + den + huan + d.mau),
    danh: st.dmg * (1 + den + huan + d.danh),
    nghi: st.cooldown / (1 + d.toc),
    uy: 1 + den + huan + d.uy,
    giap: d.giap,
    hoi: d.hoi,
    tam: st.range,
    chay: st.speed,
    den,
    huan,
    do: d,
  };
  return { ...c, lucChien: lucChien(c) };
}

export const chiSoTuong = (s: GameState, kind: HeroKind): ChiSoTuong => chiSoTu(s, kind, tinhDo(kind, monDangMac(s, kind)));

/**
 * Lực chiến: một con số tóm tắt, chỉ để xem (luật không đọc). Trung bình nhân của độ bền (máu chia phần sát thương
 * phải chịu) và sát thương mỗi giây, nhân uy lực kỹ năng và độ nhanh hồi kỹ năng.
 */
export function lucChien(c: Pick<ChiSoTuong, 'mau' | 'danh' | 'nghi' | 'uy' | 'giap' | 'hoi'>): number {
  const ben = c.mau / (1 - c.giap);
  const dps = c.danh / c.nghi;
  return Math.round(Math.sqrt(ben * dps * 20) * c.uy * (1 + c.hoi / (1 - c.hoi) / 2));
}

/** Lực chiến của tướng `kind` nếu mặc món `m` (thay món cùng ô đang mặc). */
export function lucChienVoi(s: GameState, kind: HeroKind, m: Mon): number {
  const worn = monDangMac(s, kind).filter((x) => x.o !== m.o && x.id !== m.id);
  return chiSoTu(s, kind, tinhDo(kind, [...worn, m])).lucChien;
}

// ---------- Rút đồ ----------

export interface RoiDo {
  mon: Mon;
  /** Kho đầy: món tự phân giải ra chừng này sắt, không vào kho. */
  sat?: number;
}

/** Đồ đã mở chưa: có tướng đầu tiên về với kinh đô (chơi thường là Gióng thành tráng sĩ) thì trận thắng mới rơi đồ. */
export const doMo = (s: GameState): boolean => BO_DO.some((b) => tuongJoined(s, BO_CUA[b]));

/** Bộ rơi ra ở nơi `nguon`: phó bản, thử thách theo chương của màn; đồn, giữ kinh đô theo các tướng đã về. */
export function boRoi(s: GameState, nguon: NguonDo, chuong: Chapter): BoDo[] {
  if (nguon === 'don' || nguon === 'giu') {
    const joined = BO_DO.filter((b) => tuongJoined(s, BO_CUA[b]));
    return joined.length ? joined : BO_CHUONG[chuong];
  }
  return BO_CHUONG[chuong];
}

/** Chọn chỉ số theo trọng số `w` bằng số ngẫu nhiên `r` (0..1). */
function chonTheo(w: readonly number[], r: number): number {
  const sum = w.reduce((a, b) => a + b, 0);
  let x = r * sum;
  for (let i = 0; i < w.length; i++) {
    x -= w[i];
    if (x < 0 && w[i] > 0) return i;
  }
  return w.reduce((best, v, i) => (v > 0 ? i : best), 0);
}

const pick = <T>(list: readonly T[], r: number): T => list[Math.min(list.length - 1, Math.floor(r * list.length))];

/** Rút một món ở lần rút `seq` (chưa gán mã, chưa vào kho). Null khi lần này không rơi. */
export function rutMon(seq: number, nguon: NguonDo, chuong: Chapter, bo: BoDo[]): Omit<Mon, 'id'> | null {
  const r = (i: number) => roll(seq, i);
  const def = ROI_DO[nguon];
  if (r(0) >= def.p) return null;
  const pham = Math.min(chonTheo(def.w, r(1)) + 1, PHAM_TRAN[chuong]) as PhamDo;
  const o = pick(O_DO, r(2));
  const chinh = pick(O_CHINH[o], r(3));
  const pool = CHI_SO.filter((k) => k !== chinh);
  const phu: Mon['phu'] = [];
  for (let i = 0; i < pham - 1; i++) {
    const k = pool.splice(Math.min(pool.length - 1, Math.floor(r(5 + 2 * i) * pool.length)), 1)[0];
    phu.push({ k, nac: 1 + Math.min(PHU_NAC_MAX - 1, Math.floor(r(6 + 2 * i) * PHU_NAC_MAX)) });
  }
  return { o, bo: pick(bo, r(4)), pham, cap: chuong, chinh, phu, cuong: 0 };
}

/**
 * Sau một trận thắng ở nơi `nguon` (trận của chương `chuong`): rút đồ. Đồ chưa mở thì không rút. Kho đầy thì món
 * mới tự phân giải ra sắt. Trả về món rơi (null khi không rơi).
 */
export function roiDo(s: GameState, nguon: NguonDo, chuong: Chapter): RoiDo | null {
  if (!doMo(s)) return null;
  const seq = s.trangBi.seq++;
  const rut = rutMon(seq, nguon, chuong, boRoi(s, nguon, chuong));
  if (!rut) return null;
  if (s.trangBi.kho.length >= KHO_DO_MAX) {
    const mon: Mon = { ...rut, id: 0 };
    const sat = satPhanGiai(mon);
    gain(s, { sat });
    return { mon, sat };
  }
  const mon: Mon = { ...rut, id: s.trangBi.nextId++ };
  s.trangBi.kho.push(mon);
  return { mon };
}

// ---------- Cường hóa, phân giải, mặc tháo ----------

const monById = (s: GameState, id: number) => s.trangBi.kho.find((m) => m.id === id);

/** Giá nấc cường hóa kế tiếp; null khi đã tới trần của phẩm. */
export function giaCuongHoa(m: Mon): Cost | null {
  const n = m.cuong + 1;
  if (n > CUONG_HOA_TRAN[m.pham]) return null;
  const k = CAP_DO_GIA[m.cap];
  const g = CUONG_HOA_GIA;
  const cost: Cost = { gao: g.gao * n * k, sat: g.sat * n * k };
  cost[m.o === 'vuKhi' || m.o === 'phucSuc' ? 'voOc' : 'datDa'] = g.voOcDatDa * n * k;
  if (n >= g.goTu) cost.go = g.go * n * k;
  return cost;
}

export function canCuongHoa(s: GameState, id: number): Result {
  const m = monById(s, id);
  if (!m) return fail('khongCoDo');
  const cost = giaCuongHoa(m);
  if (!cost) return fail('capToiDa');
  if (forgeLevel(s) < 1) return fail('canLoRenNguyen');
  if (!canAfford(s, cost)) return fail('thieuTaiNguyen');
  return ok(undefined);
}

/** Thợ rèn cường hóa món `id` thêm một nấc, xong ngay. Trả về nấc mới. */
export function cuongHoa(s: GameState, id: number): Result<number> {
  const check = canCuongHoa(s, id);
  if (!check.ok) return check;
  const m = monById(s, id)!;
  pay(s, giaCuongHoa(m)!);
  m.cuong += 1;
  return ok(m.cuong);
}

/** Sắt được khi phân giải món `m`: theo phẩm và cấp đồ, cộng lại một phần sắt đã tốn cường hóa. */
export function satPhanGiai(m: Mon): number {
  const k = CAP_DO_GIA[m.cap];
  const daCuong = (CUONG_HOA_GIA.sat * k * m.cuong * (m.cuong + 1)) / 2;
  return Math.round(PHAN_GIAI_SAT[m.pham] * k + PHAN_GIAI_HOAN * daCuong);
}

export function canPhanGiai(s: GameState, id: number): Result {
  const m = monById(s, id);
  if (!m) return fail('khongCoDo');
  if (m.khoa) return fail('doDaKhoa');
  if (m.tuong) return fail('doDangMac');
  return ok(undefined);
}

/** Phân giải món `id` ra sắt. Trả về số sắt được. */
export function phanGiai(s: GameState, id: number): Result<number> {
  const check = canPhanGiai(s, id);
  if (!check.ok) return check;
  const m = monById(s, id)!;
  s.trangBi.kho = s.trangBi.kho.filter((x) => x !== m);
  const sat = satPhanGiai(m);
  gain(s, { sat });
  return ok(sat);
}

/** Các món phân giải hàng loạt được: phẩm tới `phamMax`, chưa khóa, chưa mặc. */
export const phanGiaiDuoc = (s: GameState, phamMax: PhamDo): Mon[] =>
  s.trangBi.kho.filter((m) => m.pham <= phamMax && !m.khoa && !m.tuong);

/** Phân giải hàng loạt mọi món phẩm tới `phamMax` chưa khóa, chưa mặc. Trả về số món và số sắt. */
export function phanGiaiLoat(s: GameState, phamMax: PhamDo): { n: number; sat: number } {
  const list = phanGiaiDuoc(s, phamMax);
  const sat = list.reduce((sum, m) => sum + satPhanGiai(m), 0);
  s.trangBi.kho = s.trangBi.kho.filter((m) => !list.includes(m));
  if (sat > 0) gain(s, { sat });
  return { n: list.length, sat };
}

/** Khóa hay mở khóa món `id`. Trả về đã khóa chưa. */
export function khoaDo(s: GameState, id: number): Result<boolean> {
  const m = monById(s, id);
  if (!m) return fail('khongCoDo');
  if (m.khoa) delete m.khoa;
  else m.khoa = true;
  return ok(!!m.khoa);
}

/**
 * Tướng `kind` mặc món `id`: món cùng ô tướng đang mặc thì tháo ra; món đang ở tướng khác thì tự tháo khỏi tướng ấy.
 * Trả về tướng vừa bị tháo món này (nếu có).
 */
export function macDo(s: GameState, id: number, kind: HeroKind): Result<HeroKind | undefined> {
  const m = monById(s, id);
  if (!m) return fail('khongCoDo');
  if (!tuongJoined(s, kind)) return fail('tuongChuaCo');
  const truoc = m.tuong === kind ? undefined : m.tuong;
  for (const x of s.trangBi.kho) if (x !== m && x.tuong === kind && x.o === m.o) delete x.tuong;
  m.tuong = kind;
  return ok(truoc);
}

/** Tháo món `id` khỏi tướng đang mặc. */
export function thaoDo(s: GameState, id: number): Result {
  const m = monById(s, id);
  if (!m) return fail('khongCoDo');
  delete m.tuong;
  return ok(undefined);
}

// ---------- Kiểm bản lưu ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
const HERO_KINDS: HeroKind[] = ['giong', 'sonTinh', 'anDuong', 'caoLo', 'trungTrac', 'trungNhi'];

/** Một món đồ đúng dạng và đúng luật (phẩm, cấp đồ, chỉ số, nấc rút, nấc cường hóa trong khoảng). */
export function isMon(v: unknown): v is Mon {
  if (!isObj(v) || !isInt(v.id, 1, Number.MAX_SAFE_INTEGER)) return false;
  if (!O_DO.includes(v.o as ODo) || !BO_DO.includes(v.bo as BoDo)) return false;
  if (!isInt(v.pham, 1, 4) || !isInt(v.cap, 1, 5)) return false;
  if (!O_CHINH[v.o as ODo].includes(v.chinh as ChiSo)) return false;
  if (!Array.isArray(v.phu) || v.phu.length !== (v.pham as number) - 1) return false;
  const seen = new Set<unknown>([v.chinh]);
  for (const p of v.phu) {
    if (!isObj(p) || !CHI_SO.includes(p.k as ChiSo) || seen.has(p.k) || !isInt(p.nac, 1, PHU_NAC_MAX)) return false;
    seen.add(p.k);
  }
  if (!isInt(v.cuong, 0, CUONG_HOA_TRAN[v.pham as number])) return false;
  if (v.khoa !== undefined && v.khoa !== true) return false;
  return v.tuong === undefined || HERO_KINDS.includes(v.tuong as HeroKind);
}

/** Phần trang bị của bản lưu: món đúng luật, mã không trùng, mỗi tướng một món mỗi ô. */
export function isTrangBiState(v: unknown): v is TrangBiState {
  if (!isObj(v) || !isInt(v.seq, 0, Number.MAX_SAFE_INTEGER) || !isInt(v.nextId, 1, Number.MAX_SAFE_INTEGER)) return false;
  if (!Array.isArray(v.kho) || v.kho.length > KHO_DO_MAX || !v.kho.every(isMon)) return false;
  const kho = v.kho as Mon[];
  if (new Set(kho.map((m) => m.id)).size !== kho.length || kho.some((m) => m.id >= (v.nextId as number))) return false;
  const worn = kho.filter((m) => m.tuong).map((m) => `${m.tuong}:${m.o}`);
  return new Set(worn).size === worn.length;
}
