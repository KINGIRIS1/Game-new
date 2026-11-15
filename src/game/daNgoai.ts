// Dã ngoại (docs/thiet-ke.md mục Kế hoạch: dã ngoại): năm map mở kiểu Võ Lâm nối nhau bằng cổng mở theo cấp chung;
// một cấp và một thanh kinh nghiệm cho mọi tướng (chỉ có tác dụng trên map dã ngoại); đánh quái được kinh nghiệm,
// của, đồ; boss mọc lại theo giờ, phải tự đánh; treo máy khi không xem map (đội đứng trong một khu quái, Tự đánh bật)
// tính bằng công thức, lúc tắt game tối đa 8 giờ. Không khóa tướng, không làm tướng kiệt sức.
//
// Trận trên map ở `daNgoaiTran.ts` (không nằm trong state, mở map thì dựng lại); bố cục map ở `daNgoaiMap.ts`.

import { HERO_KINDS, statsOf, type Battle, type HeroKind } from './battle';
import {
  DA_BOSS_MS,
  DA_CAP,
  DA_KHU,
  DA_MAP,
  DA_MAP_IDS,
  DA_QUAI,
  DA_TREO,
  DA_TUONG,
  ENEMIES,
  FIELD,
  HERO_CLEAVE,
  RESOURCE_IDS,
  type Chapter,
  type Cost,
  type DaMapId,
  type Resources,
} from './defs';
import { boCuc, khuTai, type Diem } from './daNgoaiMap';
import { capBonus, capKhu, choDoi, sucQuai, taoTranDa, type DaGiet } from './daNgoaiTran';
import { gain, type FailReason, type GameState, type Result } from './game';
import { chapterOf } from './manVao';
import { roll } from './ngauNhien';
import { tuongSetup } from './son';
import { doCua, doMo, roiDo, type Mon } from './trangBi';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (reason: FailReason): Result<never> => ({ ok: false, reason });

export interface DaNgoaiState {
  /** Cấp chung của mọi tướng và kinh nghiệm đã tích ở cấp ấy. */
  cap: number;
  exp: number;
  /** Map đội đang ở (hay ở lần cuối), chỗ đứng (null là ở trại). */
  map: DaMapId;
  cho: Diem | null;
  /** Đội đang ở dã ngoại (đã vào map, chưa về kinh đô): không xem map thì tính treo máy. */
  dangO: boolean;
  /** Các tướng trong đội, tối đa `DA_TUONG.max`. */
  doi: HeroKind[];
  tuDanh: boolean;
  /** Boss mỗi map (chỉ số map − 1) mọc lại lúc này (đồng hồ chơi); 0 là đang có. */
  boss: number[];
  /** Map xa nhất đã tới. */
  xa: number;
  /** Treo máy: phần thời gian chưa tính (ms) và phần quái lẻ đã tích. */
  tichMs: number;
  du: number;
  /** Tổng số quái đã hạ (để xem), số lần hạ boss. */
  giet: number;
  bossGiet: number;
}

export function initialDaNgoai(): DaNgoaiState {
  return { cap: 1, exp: 0, map: 1, cho: null, dangO: false, doi: [], tuDanh: true, boss: [0, 0, 0, 0, 0], xa: 1, tichMs: 0, du: 0, giet: 0, bossGiet: 0 };
}

/** Dã ngoại mở khi có tướng đầu tiên về (như trang bị). */
export const daMo = (s: GameState): boolean => doMo(s);

/** Các tướng đã về, chọn được vào đội. */
export const tuongCo = (s: GameState): HeroKind[] => HERO_KINDS.filter((k) => tuongSetup(s, k) !== null);

/** Kinh nghiệm cần để lên cấp sau (đã ở trần thì Infinity). */
export function canLen(cap: number): number {
  if (cap >= DA_CAP.tran) return Infinity;
  return Math.round(DA_CAP.len * cap ** DA_CAP.mu);
}

/** Kinh nghiệm của một con quái cấp `cap` ở khu `khu` (−1 boss), khi cấp chung là `capDoi`. */
export function expQuai(cap: number, khu: number, capDoi: number): number {
  const he = khu < 0 ? DA_QUAI.boss.exp : DA_KHU.he[khu];
  const goc = DA_QUAI.exp * (1 + DA_QUAI.expLen * (cap - 1)) * he;
  const thap = capDoi - cap - DA_CAP.thap;
  const giam = thap > 0 ? Math.max(DA_CAP.san, 1 - DA_CAP.giam * thap) : 1;
  return Math.max(1, Math.round(goc * giam));
}

/** Cộng kinh nghiệm cho cấp chung; trả số cấp vừa lên. */
export function congExp(s: GameState, n: number): number {
  const d = s.daNgoai;
  let len = 0;
  d.exp += n;
  while (d.exp >= canLen(d.cap)) {
    d.exp -= canLen(d.cap);
    d.cap++;
    len++;
  }
  if (d.cap >= DA_CAP.tran) d.exp = 0;
  return len;
}

/** Chương rơi đồ ở map `map`: chương của map nhưng không vượt chương đang chơi (máy chủ Đấu thành kiểm). */
export const chuongRoi = (s: GameState, map: DaMapId): Chapter => Math.min(DA_MAP[map].chuong, chapterOf(s)) as Chapter;

/** Phần thưởng gộp của một lần đánh hay một quãng treo máy. */
export interface DaThuong {
  giet: number;
  boss: number;
  exp: number;
  /** Số cấp vừa lên. */
  len: number;
  cua: Resources;
  mon: Mon[];
  /** Kho đồ đầy: món tự phân giải ra chừng này sắt. */
  satDo: number;
}

const thuongRong = (): DaThuong => ({ giet: 0, boss: 0, exp: 0, len: 0, cua: { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 }, mon: [], satDo: 0 });

/** Thưởng một con quái vừa hạ ở map `map`: kinh nghiệm, của, đồ (boss chắc rơi). Cộng vào `out`. */
function thuongMot(s: GameState, map: DaMapId, g: Pick<DaGiet, 'cap' | 'khu' | 'boss'>, out: DaThuong): void {
  const exp = expQuai(g.cap, g.khu, s.daNgoai.cap);
  out.exp += exp;
  out.len += congExp(s, exp);
  const cua: Cost = {};
  const he = g.boss ? DA_QUAI.boss.exp / 2 : 1;
  for (const r of RESOURCE_IDS) {
    const n = Math.round((DA_MAP[map].thuong[r] ?? 0) * he);
    if (!n) continue;
    cua[r] = n;
    out.cua[r] += n;
  }
  gain(s, cua);
  const roi = roiDo(s, g.boss ? 'daBoss' : 'daQuai', chuongRoi(s, map));
  if (roi) {
    if (roi.sat) out.satDo += roi.sat;
    else out.mon.push(roi.mon);
  }
  s.daNgoai.giet++;
  out.giet++;
  if (g.boss) {
    out.boss++;
    s.daNgoai.bossGiet++;
  }
}

// ---------- Đội, vào map, cổng ----------

/** Chọn đội (tối đa `DA_TUONG.max` tướng đã về, không trùng). */
export function datDoi(s: GameState, doi: HeroKind[]): Result<void> {
  const co = tuongCo(s);
  const list = doi.filter((k, i) => co.includes(k) && doi.indexOf(k) === i);
  if (!list.length || list.length > DA_TUONG.max || list.length !== doi.length) return fail('daDoiSai');
  s.daNgoai.doi = list;
  return ok(undefined);
}

/** Đội lúc này: đội đã chọn (bỏ tướng chưa về); chưa chọn thì các tướng đã về đầu tiên. */
export function doiNay(s: GameState): HeroKind[] {
  const co = tuongCo(s);
  const doi = s.daNgoai.doi.filter((k) => co.includes(k));
  return doi.length ? doi : co.slice(0, DA_TUONG.max);
}

/** Vào dã ngoại (ra trại của map đang ở). */
export function vaoDa(s: GameState): Result<void> {
  if (!daMo(s)) return fail('daChuaMo');
  if (!doiNay(s).length) return fail('daDoiSai');
  s.daNgoai.dangO = true;
  return ok(undefined);
}

/** Về kinh đô: đội rời map, thôi treo máy. */
export function veKinhDo(s: GameState): void {
  s.daNgoai.dangO = false;
  s.daNgoai.cho = null;
  s.daNgoai.tichMs = 0;
}

/** Boss map `map` đang có (đã mọc lại). */
export const bossCo = (s: GameState, map: DaMapId): boolean => s.clock >= s.daNgoai.boss[map - 1];

/** Giây còn lại tới khi boss map `map` mọc lại (0 là đang có). */
export const bossCho = (s: GameState, map: DaMapId): number => Math.max(0, Math.ceil((s.daNgoai.boss[map - 1] - s.clock) / 1000));

/** Qua cổng sang map `toi` (0 là về kinh đô). Map sau cần đủ cấp chung (`DA_MAP[toi].cong`). */
export function quaCong(s: GameState, toi: number): Result<'kinhDo' | DaMapId> {
  const d = s.daNgoai;
  if (toi <= 0) {
    veKinhDo(s);
    return ok('kinhDo');
  }
  if (!DA_MAP_IDS.includes(toi as DaMapId)) return fail('daDoiSai');
  const id = toi as DaMapId;
  if (d.cap < DA_MAP[id].cong) return fail('daChuaDuCap');
  const tu = d.map;
  d.map = id;
  d.xa = Math.max(d.xa, id);
  // Sang map sau thì hiện ra cạnh cổng vào (gần trại); lùi về map trước thì hiện ra cạnh cổng sang map sau.
  const bc = boCuc(id);
  const cong = id > tu ? bc.congTruoc : (bc.congSau ?? bc.trai);
  const huong = { x: bc.trai.x - cong.x, z: bc.trai.z - cong.z };
  const l = Math.hypot(huong.x, huong.z) || 1;
  d.cho = id > tu ? { x: cong.x + (huong.x / l) * 3, z: cong.z + (huong.z / l) * 3 } : { x: cong.x - 2.5, z: cong.z + 2.5 };
  return ok(id);
}

/** Dựng trận trên map đội đang ở, cho phần vẽ. */
export function moMap(s: GameState): Battle {
  const d = s.daNgoai;
  const heroes = doiNay(s)
    .map((k) => tuongSetup(s, k))
    .filter((h) => h !== null);
  return taoTranDa({ id: s.nextBattleId++, map: d.map, heroes, cap: d.cap, cho: d.cho, tuDanh: d.tuDanh, boss: bossCo(s, d.map) });
}

/**
 * Sau mỗi bước trận dã ngoại: tính thưởng các quái vừa hạ, ghi chỗ đội đứng, boss vừa hạ thì hẹn giờ mọc lại. Đội vừa
 * tới cổng thì trả map tới (0 là kinh đô; chưa đủ cấp thì `chuaDuCap` với cấp cần).
 */
export function capNhatDa(s: GameState, b: Battle): { thuong: DaThuong; sang: number | null; chuaDuCap?: number } {
  const da = b.da!;
  const out = thuongRong();
  for (const g of da.giet) {
    thuongMot(s, da.map, g, out);
    if (g.boss) s.daNgoai.boss[da.map - 1] = s.clock + DA_BOSS_MS;
  }
  da.giet.length = 0;
  const cho = choDoi(b);
  if (cho) s.daNgoai.cho = cho;
  s.daNgoai.tuDanh = da.tuDanh;
  // Cấp lên giữa trận: tướng mạnh lên ngay (máu tối đa và sức đánh theo cấp mới).
  if (out.len) {
    const cu = b.bonus;
    b.bonus = capBonus(s.daNgoai.cap);
    for (const f of b.fighters) if (f.side === 'ta' && f.kind !== 'nghiaBinh') {
      const k = (1 + b.bonus) / (1 + cu);
      f.maxHp *= k;
      f.hp *= k;
    }
  }
  let sang: number | null = null;
  let chuaDuCap: number | undefined;
  if (da.sang !== null) {
    const toi = da.sang;
    da.sang = null;
    if (toi > 0 && s.daNgoai.cap < DA_MAP[toi as DaMapId].cong) chuaDuCap = DA_MAP[toi as DaMapId].cong;
    else sang = toi;
  }
  return { thuong: out, sang, ...(chuaDuCap ? { chuaDuCap } : {}) };
}

// ---------- Treo máy ----------

/** Khu đội đang đứng (để treo máy), không đứng trong khu nào thì −1. */
export function khuDangDung(s: GameState): number {
  const d = s.daNgoai;
  if (!d.cho) return -1;
  return khuTai(boCuc(d.map), d.cho.x, d.cho.z, 3);
}

/** Đang treo máy được: đội ở dã ngoại, Tự đánh bật, đứng trong một khu quái. */
export const dangTreo = (s: GameState): boolean => s.daNgoai.dangO && s.daNgoai.tuDanh && khuDangDung(s) >= 0 && doiNay(s).length > 0;

/**
 * Sức đội so với sức một con quái khu `khu` (sát thương mỗi giây × máu, cộng đòn quét của tướng) ở map đội đang ở.
 * Đội vừa sức khu thì chừng `DA_TREO.moc`.
 */
export function tiSuc(s: GameState, khu: number): number {
  const d = s.daNgoai;
  const bonus = capBonus(d.cap);
  let dps = 0;
  let hp = 0;
  for (const k of doiNay(s)) {
    const st = statsOf(k);
    const g = doCua(s, k);
    dps += (st.dmg * (1 + bonus + (g?.danh ?? 0)) * (1 + (g?.toc ?? 0)) * (1 + HERO_CLEAVE.share * 0.6)) / st.cooldown;
    hp += (st.hp * FIELD.hpMul * (1 + bonus + (g?.mau ?? 0))) / (1 - (g?.giap ?? 0));
  }
  const kind = DA_MAP[d.map].quai[khu];
  const [lo, hi] = capKhu(d.map, khu);
  const q = sucQuai(kind, (lo + hi) / 2, khu);
  return (dps * hp) / ((q.dmg / ENEMIES[kind].cooldown) * q.hp);
}

/**
 * Số quái đội hạ mỗi phút khi treo ở khu `khu` của map đội đang ở: `DA_TREO.goc` khi đội vừa sức khu (`tiSuc` tới
 * mốc `DA_TREO.moc`); yếu hơn thì chậm theo căn bậc hai, chậm nhất `DA_TREO.san` phần; mạnh hơn cũng không nhanh hơn
 * (quái mọc lại có giờ).
 */
export function nhipTreo(s: GameState, khu = khuDangDung(s)): number {
  if (khu < 0 || !doiNay(s).length) return 0;
  return DA_TREO.goc * Math.max(DA_TREO.san, Math.min(1, Math.sqrt(tiSuc(s, khu) / DA_TREO.moc)));
}

/** Tính treo máy thêm `ms` (lúc chơi mà không xem map, hay lúc tắt game). Gom thời gian, mỗi 5 giây tính một lần. */
export function tichTreo(s: GameState, ms: number, out = thuongRong()): DaThuong {
  if (!dangTreo(s) || ms <= 0) return out;
  const d = s.daNgoai;
  d.tichMs += ms;
  if (d.tichMs < 5000) return out;
  const khu = khuDangDung(s);
  // Chia khúc từng phút, để cấp lên giữa chừng thì đội hạ quái nhanh hơn từ khúc sau.
  while (d.tichMs >= 5000) {
    const khuc = Math.min(d.tichMs, 60_000);
    d.tichMs -= khuc;
    d.du += (nhipTreo(s, khu) * khuc) / 60_000;
    const [lo, hi] = capKhu(d.map, khu);
    for (; d.du >= 1; d.du--) thuongMot(s, d.map, { cap: roll(d.giet, 7) < 0.5 ? lo : hi, khu, boss: false }, out);
  }
  return out;
}

/** Lúc tắt game: treo máy tối đa `DA_TREO.tran`. */
export function treoVang(s: GameState, away: number): DaThuong {
  const out = tichTreo(s, Math.min(away, DA_TREO.tran));
  // Phần lẻ dưới 5 giây chưa tính thì để sau; quãng vắng quá trần thì bỏ.
  return out;
}

/** Bản lưu: phần dã ngoại đúng dạng. */
export function isDaNgoaiState(v: unknown): v is DaNgoaiState {
  if (!v || typeof v !== 'object') return false;
  const d = v as Record<string, unknown>;
  const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
  if (!num(d.cap) || (d.cap as number) < 1 || (d.cap as number) > DA_CAP.tran || !num(d.exp) || (d.exp as number) < 0) return false;
  if (!DA_MAP_IDS.includes(d.map as DaMapId) || !num(d.xa)) return false;
  if (d.cho !== null && !(d.cho && typeof d.cho === 'object' && num((d.cho as Diem).x) && num((d.cho as Diem).z))) return false;
  if (typeof d.dangO !== 'boolean' || typeof d.tuDanh !== 'boolean') return false;
  if (!Array.isArray(d.doi) || d.doi.length > DA_TUONG.max || !d.doi.every((k) => HERO_KINDS.includes(k as HeroKind))) return false;
  if (!Array.isArray(d.boss) || d.boss.length !== DA_MAP_IDS.length || !d.boss.every(num)) return false;
  return num(d.tichMs) && num(d.du) && num(d.giet) && num(d.bossGiet);
}
