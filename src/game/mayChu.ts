// Luật cho máy chủ Đấu thành (docs/thiet-ke.md, Kế hoạch: Đấu thành, mục Server).
// `node scripts/luat.mjs` đóng gói tệp này cùng mọi luật nó dùng thành một tệp JS cho Edge Function
// (supabase/functions/dau-thanh/luat.js, kiểu ở luat.d.ts). Máy chủ chỉ gọi các hàm ở đây; dữ liệu vào ra đều là
// JSON, bản chụp đi dưới dạng mã `TDVS1:` nên máy chủ không cần biết bên trong bản chụp có gì.
// Máy khách cũng dùng được (kiểm tên trước khi gửi, dựng trận từ quân máy chủ trả về).

import { type PvpAttack } from './battle';
import { DAU_THANH, FIELD_CAP, RESOURCE_IDS, SKILL_IDS, UNIT_TYPES, type Resources, type UnitType } from './defs';
import { armySpace, type Army } from './doanhTrai';
import {
  botSnapshot,
  cleanInputs,
  decodeSnapshot,
  encodeSnapshot,
  lootPvp,
  scorePvp,
  simulatePvp,
  trophyDelta,
  tuongCoDo,
  validateSnapshot,
  type MonChup,
  type PvpInput,
  type Snapshot,
} from './dauThanh';

/** Số liệu máy chủ dùng (khóa, khiên, giới hạn lượt gọi, ghép trận, giữ dữ liệu). */
export const CAU_HINH = {
  unlockDien: DAU_THANH.unlockDien,
  lockS: DAU_THANH.lockS,
  shieldH: DAU_THANH.shieldH,
  rematchH: DAU_THANH.rematchH,
  matchDien: DAU_THANH.matchDien,
  matchDienWide: DAU_THANH.matchDienWide,
  findPerH: DAU_THANH.findPerH,
  attackPerH: DAU_THANH.attackPerH,
  snapPerH: DAU_THANH.snapPerH,
  keepDays: DAU_THANH.keepDays,
  rankTop: DAU_THANH.rankTop,
  rankPerH: DAU_THANH.rankPerH,
  replayPerH: DAU_THANH.replayPerH,
  savePerH: DAU_THANH.savePerH,
  saveMax: DAU_THANH.saveMax,
} as const;

// ---------- Tên người chơi ----------

export type TenLoi = 'ngan' | 'dai' | 'kyTu' | 'tuc';

/** Bỏ dấu tiếng Việt (để bắt từ tục viết không dấu). */
const boDau = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');

/** Từ tục đứng riêng một chữ: viết có dấu, hay viết tắt không dấu (chữ không dấu dễ trùng chữ thường nên không xét). */
const TU_TUC = new Set([
  'địt', 'đụ', 'đéo', 'lồn', 'cặc', 'buồi', 'đĩ', 'cứt',
  'dm', 'dmm', 'dcm', 'dkm', 'đm', 'đmm', 'đcm', 'vcl', 'vkl', 'vl', 'cl', 'clm', 'cmm', 'cc', 'dmcs',
  'fuck', 'fck', 'shit', 'bitch', 'dick',
]);
/** Từ tục ghép nằm đâu cũng bắt, xét trên tên bỏ khoảng trắng (còn dấu: bỏ dấu thì "lớn mạnh" thành "lonmanh"). */
const TUC_GHEP = ['địtmẹ', 'địtcon', 'đụmá', 'đụmẹ', 'lồnmá', 'lồnmẹ', 'vãilồn', 'cặclồn'];
/** Từ tục viết không dấu ít khi trùng tên thật, xét trên tên đã bỏ dấu, bỏ khoảng trắng. */
const TUC_GHEP_KHONG_DAU = ['fuck', 'shit', 'bitch', 'ditme', 'ditcon', 'dume', 'duma', 'vcl', 'vkl', 'dmm', 'dcm'];

/**
 * Kiểm tên người chơi Đấu thành: bỏ khoảng trắng thừa, `nameMin`–`nameMax` chữ, chỉ chữ cái (có dấu), chữ số,
 * khoảng trắng và `_ . - '`, không có từ tục. Trả về tên đã chuẩn hóa hay lý do sai.
 */
export function kiemTen(raw: unknown): { ten: string } | { loi: TenLoi } {
  const ten = (typeof raw === 'string' ? raw : '').normalize('NFC').replace(/\s+/g, ' ').trim();
  const n = [...ten].length;
  if (n < DAU_THANH.nameMin) return { loi: 'ngan' };
  if (n > DAU_THANH.nameMax) return { loi: 'dai' };
  if (!/^[\p{L}\p{M}\p{N} _.\-']+$/u.test(ten)) return { loi: 'kyTu' };
  const thuong = ten.toLowerCase();
  const chu = thuong.split(/[\s_.\-']+/);
  if (chu.some((c) => TU_TUC.has(c) || TU_TUC.has(boDau(c)))) return { loi: 'tuc' };
  const lien = chu.join('');
  if (TUC_GHEP.some((t) => lien.includes(t)) || TUC_GHEP_KHONG_DAU.some((t) => boDau(lien).includes(t))) return { loi: 'tuc' };
  return { ten };
}

// ---------- Bản chụp ----------

/** Nhận mã bản chụp người chơi tải lên: đọc được, hợp luật, Điện đủ cấp mở Đấu thành. */
export function nhanBanChup(ma: unknown): { ma: string; dien: number } | { loi: string } {
  const snap = typeof ma === 'string' ? decodeSnapshot(ma) : undefined;
  if (!snap) return { loi: 'mã bản chụp hỏng' };
  const why = validateSnapshot(snap);
  if (why) return { loi: why };
  if (snap.dien < DAU_THANH.unlockDien) return { loi: `Điện cấp ${snap.dien} chưa mở Đấu thành` };
  // Mã lại từ bản đã đọc: bỏ khoảng trắng, trường lạ.
  return { ma: encodeSnapshot(snap), dien: snap.dien };
}

const botCache = new Map<number, { ma: string; dien: number }>();

/** Kinh đô máy Điện `dien` (5–10) để đánh khi chưa đủ người chơi. */
export function kinhDoMay(dien: number): { ma: string; dien: number } {
  const lv = Math.min(10, Math.max(DAU_THANH.unlockDien, Math.round(dien)));
  let hit = botCache.get(lv);
  if (!hit) {
    hit = { ma: encodeSnapshot(botSnapshot(lv)), dien: lv };
    botCache.set(lv, hit);
  }
  return hit;
}

/**
 * Bản chụp người giữ thành sau khi bị cướp: kho trong bản chụp trừ đi của bị cướp (không xuống dưới 0), để người đánh
 * sau không cướp lại phần đã mất khi người giữ thành chưa mở game tải bản chụp mới. Mã hỏng thì trả nguyên mã.
 */
export function truCua(ma: string, cuop: unknown): string {
  const snap = decodeSnapshot(ma);
  if (!snap) return ma;
  const c = (cuop && typeof cuop === 'object' ? cuop : {}) as Record<string, unknown>;
  for (const r of RESOURCE_IDS) {
    const n = c[r];
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) snap.resources[r] = Math.max(0, snap.resources[r] - Math.floor(n));
  }
  return encodeSnapshot(snap);
}

/** Đọc mã bản chụp đã lưu ở máy chủ (đã kiểm khi nhận). */
function docMa(ma: string): Snapshot {
  const snap = decodeSnapshot(ma);
  if (!snap) throw new Error('mã bản chụp hỏng');
  return snap;
}

// ---------- Trận ----------

/**
 * Quân đánh thành, máy chủ dựng khi bắt đầu trận. Quân chọn không quá quân trong bản chụp của chính người đánh, không
 * quá số chỗ một trận theo cấp Điện (`FIELD_CAP`); tướng, Đền, binh khí, huân công lấy từ bản chụp ấy (tướng như
 * tướng giữ thành trong bản chụp, kể cả đang nghỉ; số đồ máy chủ tự tính từ món đang mặc trong bản chụp, `tuongCoDo`). Máy khách đánh bằng đúng quân này để đánh lại ra y hệt.
 */
export function quanDanh(atkMa: string, army: unknown, side: unknown, seed: number): { quan: PvpAttack } | { loi: string } {
  const atk = docMa(atkMa);
  if (side !== 'bac' && side !== 'tay') return { loi: 'hướng tràn vào sai' };
  const a = army as Record<string, unknown> | null;
  if (!a || typeof a !== 'object') return { loi: 'quân sai dạng' };
  const chon = { giao: 0, cung: 0, voi: 0, no: 0 } as Army;
  for (const k of UNIT_TYPES) {
    const n = a[k] ?? 0;
    if (!Number.isInteger(n) || (n as number) < 0) return { loi: 'quân sai dạng' };
    if ((n as number) > atk.troops[k]) return { loi: 'quân nhiều hơn quân đang có' };
    chon[k] = n as number;
  }
  const space = armySpace(chon);
  if (space <= 0) return { loi: 'không có quân' };
  if (space > (FIELD_CAP[atk.dien - 1] ?? 0)) return { loi: 'quá số chỗ một trận' };
  return {
    quan: {
      army: chon,
      heroes: tuongCoDo(atk.heroes, atk.mon),
      side,
      seed: seed >>> 0,
      bonus: atk.bonus,
      arms: { ...atk.arms },
      huan: { ...atk.huan },
    },
  };
}

export interface KetQua {
  sao: number;
  /** Phần công trình tính điểm đã phá (0–1). */
  pct: number;
  dien: boolean;
  kho: number;
  khoTotal: number;
  /** Của người đánh cướp được (người giữ thành mất bấy nhiêu; kinh đô máy thì không cướp của thật). */
  cuop: Resources;
  chienCong: { atk: number; def: number };
  /** Quân người đánh ngã trong trận (mất thật). */
  mat: Record<UnitType, number>;
  buoc: number;
  /** Số lần bấm đã nhận. */
  bam: number;
}

/**
 * Đánh lại trận từ bản chụp người giữ thành, quân máy chủ đã dựng lúc bắt đầu và các lần bấm máy khách gửi: ra sao,
 * phần trăm phá, của cướp, chiến công hai bên, quân người đánh ngã. Kết quả này là kết quả cuối.
 * Kinh đô máy (`bot`): không cướp của thật, chiến công nhân `botTrophy`, người giữ thành không có chiến công.
 */
export function danhLai(
  defMa: string,
  quan: PvpAttack,
  inputs: unknown,
  opts: { atkDien: number; atkTrophies: number; defTrophies: number; bot: boolean },
): KetQua {
  const def = docMa(defMa);
  const bam = cleanInputs(inputs);
  const run = simulatePvp(def, quan, bam);
  const score = scorePvp(run.def);
  let cuop = lootPvp(def, score, opts.atkDien);
  let chienCong = trophyDelta(opts.atkTrophies, opts.defTrophies, score.stars);
  if (opts.bot) {
    // Kinh đô máy coi như ngang chiến công người đánh: được hay mất `trophyBase` nhân `botTrophy`.
    cuop = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
    const d = Math.round(DAU_THANH.trophyBase * DAU_THANH.botTrophy);
    chienCong = { atk: score.stars >= 1 ? d : -Math.min(d, opts.atkTrophies), def: 0 };
  }
  // Không để -0 lọt ra JSON.
  chienCong = { atk: chienCong.atk || 0, def: chienCong.def || 0 };
  for (const r of RESOURCE_IDS) cuop[r] = Math.max(0, cuop[r]);
  return {
    sao: score.stars,
    pct: score.pct,
    dien: score.dien,
    kho: score.kho,
    khoTotal: score.khoTotal,
    cuop,
    chienCong,
    mat: { ...run.battle.lost },
    buoc: run.step,
    bam: bam.length,
  };
}

// ---------- Ghép trận ----------

export interface UngVien {
  id: string;
  dien: number;
  trophies: number;
}

/**
 * Chọn đối thủ trong các người chơi máy chủ đã lọc (không phải mình, hết khiên, không bị khóa, chưa đánh trong
 * `rematchH` giờ, Điện chênh không quá `matchDienWide`): ưu tiên Điện chênh không quá `matchDien`, rồi ngẫu nhiên
 * (`r` trong [0, 1)) trong `matchPick` người chiến công gần mình nhất. Không ai thì null (máy chủ cho kinh đô máy).
 */
export function chonDoiThu(me: { dien: number; trophies: number }, list: UngVien[], r: number): string | null {
  const near = list.filter((u) => Math.abs(u.dien - me.dien) <= DAU_THANH.matchDien);
  const pool = near.length ? near : list.filter((u) => Math.abs(u.dien - me.dien) <= DAU_THANH.matchDienWide);
  if (!pool.length) return null;
  const top = [...pool].sort((a, b) => Math.abs(a.trophies - me.trophies) - Math.abs(b.trophies - me.trophies) || (a.id < b.id ? -1 : 1)).slice(0, DAU_THANH.matchPick);
  return top[Math.min(top.length - 1, Math.floor(Math.max(0, r) * top.length))].id;
}

// ---------- Đối chiếu tất định ----------

/** FNV-1a 32 bit của một chuỗi. */
function bam32(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Tướng của người đánh thử ở Điện `dien` (như test cân bằng Đấu thành): Gióng, Sơn Tinh, An Dương Vương, Cao Lỗ, Hai Bà. */
function tuongThu(dien: number): PvpAttack['heroes'] {
  if (dien <= 5) return [{ kind: 'giong', bamboo: true, glow: true, non: false }];
  if (dien === 6) return [{ kind: 'sonTinh', bamboo: false, glow: true, non: true }];
  if (dien === 7) return [{ kind: 'anDuong', bamboo: false, glow: true, non: false, kimQuy: true }];
  if (dien === 10)
    return [
      { kind: 'trungTrac', bamboo: false, glow: true, non: false },
      { kind: 'trungNhi', bamboo: false, glow: true, non: false, hieuTrieu: true },
    ];
  return [{ kind: 'caoLo', bamboo: false, glow: false, non: false, lenhBan: true }];
}

/** Đồ của trận đối chiếu: bốn ô, đủ sáu chỉ số, có cường hóa. */
const DO_THU: Omit<MonChup, 'tuong'>[] = [
  { o: 'vuKhi', bo: 'phuDong', pham: 4, cap: 3, chinh: 'danh', phu: [{ k: 'toc', nac: 3 }, { k: 'mau', nac: 1 }, { k: 'giap', nac: 5 }], cuong: 7 },
  { o: 'giap', bo: 'phuDong', pham: 3, cap: 3, chinh: 'giap', phu: [{ k: 'hoi', nac: 2 }, { k: 'uy', nac: 4 }], cuong: 4 },
  { o: 'phucSuc', bo: 'coLoa', pham: 2, cap: 2, chinh: 'toc', phu: [{ k: 'danh', nac: 5 }], cuong: 6 },
  { o: 'baoVat', bo: 'phuDong', pham: 4, cap: 3, chinh: 'uy', phu: [{ k: 'hoi', nac: 1 }, { k: 'mau', nac: 2 }, { k: 'danh', nac: 3 }], cuong: 10 },
];

/** Quân mẫu một trận (38 chỗ; có lính nỏ từ Điện 8). */
const quanMau = (dien: number): Army => (dien >= 8 ? { giao: 11, cung: 10, voi: 3, no: 4 } : { giao: 14, cung: 12, voi: 4, no: 0 });

/**
 * Bản chụp để thử máy chủ thật (scripts/thu-may-chu.mjs): kinh đô máy Điện `dien` kèm tướng của cấp ấy, để người
 * thử đánh trận nặng như người chơi thật. Hợp luật như bản chụp người chơi.
 */
export function banChupThu(dien: number): { ma: string; quan: Army } {
  const snap = botSnapshot(dien);
  snap.heroes = tuongThu(dien);
  return { ma: encodeSnapshot(snap), quan: quanMau(dien) };
}

/** Lịch bấm của trận thử: cứ 150 bước bấm mọi kỹ năng (chưa sẵn sàng thì trận bỏ qua). */
export function bamThu(): PvpInput[] {
  const inputs: PvpInput[] = [];
  for (let s = 80; s < 3600; s += 150) for (const k of SKILL_IDS) inputs.push({ s, k });
  return inputs;
}

/**
 * Đánh vài trận cố định trên kinh đô máy Điện 5–10 (có tướng, bấm kỹ năng theo lịch) và ghi dấu trạng thái cuối:
 * chỗ đứng, máu từng người, máu từng công trình. Chạy trên Node, Deno (Edge Function) hay trình duyệt phải ra y
 * hệt (`scripts/doi-chieu-deno.mjs`).
 */
export function doiChieu(): string[] {
  const out: string[] = [];
  for (let dien = 5; dien <= 10; dien++) {
    const def = botSnapshot(dien);
    // Điện chẵn: hai bên tướng mặc đồ (tướng giữ thành là Gióng đứng trước Điện), để so cả phần đồ của trận.
    const coDo = dien % 2 === 0;
    if (coDo) {
      def.heroes = [{ kind: 'giong', bamboo: true, glow: true, non: false }];
      def.mon = DO_THU.map((m) => ({ ...m, tuong: 'giong' as const }));
    }
    const heroes = coDo ? tuongCoDo(tuongThu(dien), tuongThu(dien).flatMap((h) => DO_THU.map((m) => ({ ...m, tuong: h.kind })))) : tuongThu(dien);
    const quan: PvpAttack = { army: quanMau(dien), heroes, side: dien % 2 ? 'bac' : 'tay', seed: 1000 + dien, bonus: 0, arms: { ...def.arms } };
    const run = simulatePvp(def, quan, bamThu());
    const score = scorePvp(run.def);
    const people = run.battle.fighters.map((f) => [f.kind, f.side, f.state, f.x, f.z, f.hp]);
    const houses = run.def.buildings.map((b) => [b.type, run.battle.hp[b.id] ?? null, b.damaged ?? false]);
    out.push(`Điện ${dien} ${quan.side}: ${score.stars} sao, ${Math.round(score.pct * 100)}%, ${run.step} bước, ngã ${JSON.stringify(run.battle.lost)}, dấu ${bam32(JSON.stringify([people, houses]))}`);
  }
  return out;
}
