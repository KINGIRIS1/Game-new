// Trận trên map dã ngoại (docs/thiet-ke.md mục Kế hoạch: dã ngoại): map mở kiểu Võ Lâm, không có thắng thua. Đội tối
// đa ba tướng đi theo tướng đầu; chạm đất thì đi tới, chạm quái thì đánh con ấy, bật Tự đánh thì tự tìm quái trong khu
// đang đứng (không nhắm boss) và tự dùng kỹ năng. Quái đứng ở chỗ mọc, thấy tướng tới gần hay bị đánh thì đuổi, đuổi
// xa khỏi chỗ mọc thì quay về hồi máu; chết thì một lúc sau mọc lại. Tướng ngã nằm chờ, yên một lúc thì đứng dậy; cả
// đội ngã thì về trại, không mất gì.
//
// Dùng chung đòn đánh, kỹ năng, sự kiện của trận ngoài bãi (`battle.ts`), nên phần vẽ (`battleView.ts`) vẽ như mọi
// trận. Phần thưởng (kinh nghiệm, của, đồ) không tính ở đây mà ở `daNgoai.ts` từ danh sách quái đã hạ (`DaTran.giet`).

import {
  addHero,
  advanceClock,
  bodyRadius,
  dist,
  isAlive,
  isHero,
  moveToward,
  newBattle,
  newFighter,
  skillOwner,
  skillReady,
  statsOf,
  strike,
  stunned,
  useSkill,
  type Battle,
  type Fighter,
  type HeroSetup,
} from './battle';
import { DA_CAP, DA_KHU, DA_MAP, DA_QUAI, DA_TUONG, ENEMIES, FIELD, type DaMapId, type EnemyType, type SkillId } from './defs';
import { boCuc, khuTai, timDuong, truotCan, type DaBoCuc, type Diem } from './daNgoaiMap';
import { roll } from './ngauNhien';

/** Quái dã ngoại: chỗ mọc, khu (−1 là boss), cấp, đang đứng chờ, đuổi hay về. */
export interface DaNha {
  x: number;
  z: number;
  khu: number;
  cap: number;
  trang: 'cho' | 'duoi' | 've';
  /** Người đang đuổi (id). */
  duoi: number | null;
  /** Đã tính vào danh sách quái hạ. */
  tinh?: boolean;
}

/** Một con quái vừa hạ, chờ tính thưởng. */
export interface DaGiet {
  kind: EnemyType;
  cap: number;
  khu: number;
  boss: boolean;
  x: number;
  z: number;
}

export interface DaTran {
  map: DaMapId;
  tuDanh: boolean;
  /** Đường đang đi theo lệnh chạm đất: các điểm rẽ của tướng đầu. */
  duong: Diem[] | null;
  /** Đi tới cổng: tới nơi thì sang map này (0 là về kinh đô). */
  cong: number | null;
  /** Quái người chơi chạm để đánh (cả boss). */
  muc: number | null;
  /** Quái Tự đánh đang nhắm. */
  tuMuc: number | null;
  /** Hàng chờ mọc lại: khu, lúc mọc (giây trận). */
  moc: { khu: number; at: number }[];
  /** Số con đã mọc ra (hạt giống chỗ mọc). */
  dem: number;
  /** Quái đã hạ, chờ `daNgoai.ts` tính thưởng. */
  giet: DaGiet[];
  /** Lúc cả đội ngã (giây trận), chờ về trại. */
  nga: number | null;
  /** Vừa qua cổng: map tới (0 là kinh đô), chờ `daNgoai.ts` xử lý. */
  sang: number | null;
  /** Người đã ngã (không phải tướng): lúc ngã, để dọn khỏi trận. */
  chet: Record<number, number>;
  /** Máu tướng lần trước và lần cuối bị đánh, theo id. */
  mau: Record<number, number>;
  biDanh: Record<number, number>;
  /** Lần cuối có quái đuổi đội (giây trận). */
  yenTu: number;
  /** Boss đang có trên map. */
  boss: boolean;
  /** Tự đánh đang dừng nghỉ hồi sức (máu đội thấp, không có quái đuổi). */
  nghi?: boolean;
}

/** Thông số dựng trận dã ngoại. */
export interface DaSetup {
  id: number;
  map: DaMapId;
  heroes: HeroSetup[];
  /** Cấp chung: mỗi cấp thêm máu, sức đánh, uy lực kỹ năng (`DA_CAP.moiCap`). */
  cap: number;
  /** Chỗ đội đứng; không có thì ở trại. */
  cho?: Diem | null;
  tuDanh: boolean;
  /** Boss đã mọc lại chưa. */
  boss: boolean;
}

/** Phần cộng máu, sức đánh của cấp chung. */
export const capBonus = (cap: number) => (Math.max(1, cap) - 1) * DA_CAP.moiCap;

/** Khoảng cấp của khu `k` (0–4) ở map: hai cấp liền nhau. */
export function capKhu(map: DaMapId, k: number): [number, number] {
  const lo = DA_MAP[map].cap[0] + 2 * k;
  return [lo, lo + 1];
}

/** Máu, sức đánh của quái loại `kind` cấp `cap` ở khu `khu` (−1 là boss). */
export function sucQuai(kind: EnemyType, cap: number, khu: number): { hp: number; dmg: number } {
  const st = ENEMIES[kind];
  // Dáng quái: lính bắn xa máu mỏng, quân nặng máu dày (so với lính giặc thường); kẹp cho khỏi chênh quá.
  const dangHp = Math.min(1.4, Math.max(0.65, Math.sqrt(st.hp / 100)));
  const dangDmg = Math.min(1.4, Math.max(0.85, Math.sqrt(st.dmg / 11)));
  const he = khu < 0 ? 1 : DA_KHU.he[khu];
  const boss = khu < 0 ? DA_QUAI.boss : { hp: 1, dmg: 1 };
  return {
    hp: DA_QUAI.hp * (1 + DA_QUAI.hpLen * (cap - 1)) * dangHp * he * boss.hp,
    dmg: DA_QUAI.dmg * (1 + DA_QUAI.dmgLen * (cap - 1)) * dangDmg * Math.sqrt(he) * boss.dmg,
  };
}

/** Chỗ tướng thứ `i` đứng quanh tướng đầu (sau lưng, hai bên), theo hướng nhìn của tướng đầu. */
function choDoiHinh(lead: Fighter, i: number): Diem {
  if (i === 0) return { x: lead.x, z: lead.z };
  const side = i % 2 ? -1 : 1;
  const fx = Math.sin(lead.face);
  const fz = Math.cos(lead.face);
  // Bên phải của hướng nhìn là (cos, −sin).
  return { x: lead.x + fz * side * 1.4 - fx * 1.2, z: lead.z - fx * side * 1.4 - fz * 1.2 };
}

/** Dựng trận dã ngoại: đội đứng ở chỗ cũ (hay ở trại), quái mọc đủ các khu, boss nếu đã mọc lại. */
export function taoTranDa(setup: DaSetup): Battle {
  const b = newBattle(setup.id, 'daNgoai', setup.map, 'bac');
  b.skills = [];
  b.hpMul = FIELD.hpMul;
  b.bonus = capBonus(setup.cap);
  const bc = boCuc(setup.map);
  b.da = {
    map: setup.map,
    tuDanh: setup.tuDanh,
    duong: null,
    cong: null,
    muc: null,
    tuMuc: null,
    moc: [],
    dem: 0,
    giet: [],
    nga: null,
    sang: null,
    chet: {},
    mau: {},
    biDanh: {},
    yenTu: 0,
    boss: setup.boss,
  };
  const at = setup.cho ?? bc.trai;
  const lead = { x: at.x, z: at.z, face: Math.PI } as Fighter;
  setup.heroes.slice(0, DA_TUONG.max).forEach((h, i) => {
    const p = choDoiHinh(lead, i);
    addHero(b, h, p.x, p.z, FIELD.hpMul);
  });
  for (const f of b.fighters) {
    f.face = Math.PI;
    truotCan(bc, bodyRadius(f.kind), f);
  }
  // Kỹ năng Lạc tướng (Trống trận) không có trên map; Lệnh bắn chỉ cho lính nỏ nên cũng bỏ.
  b.skills = b.skills.filter((k) => k !== 'trongTran');
  bc.khu.forEach((_, k) => {
    for (let i = 0; i < DA_KHU.n[k]; i++) mocQuai(b, bc, k);
  });
  if (setup.boss) mocBoss(b, bc);
  return b;
}

/** Cho một con quái của khu `k` mọc ở chỗ ngẫu nhiên trong khu. */
function mocQuai(b: Battle, bc: DaBoCuc, k: number): void {
  const da = b.da!;
  const seq = da.map * 100_003 + da.dem++;
  const khu = bc.khu[k];
  const a = roll(seq, 0) * Math.PI * 2;
  const r = Math.sqrt(roll(seq, 1)) * (khu.r - 0.8);
  const kind = DA_MAP[da.map].quai[k];
  const [lo, hi] = capKhu(da.map, k);
  const cap = roll(seq, 2) < 0.5 ? lo : hi;
  themQuai(b, bc, kind, khu.x + Math.cos(a) * r, khu.z + Math.sin(a) * r, cap, k, roll(seq, 3));
}

function mocBoss(b: Battle, bc: DaBoCuc): void {
  const da = b.da!;
  const def = DA_MAP[da.map];
  themQuai(b, bc, def.boss, bc.boss.x, bc.boss.z, def.cap[1] + DA_QUAI.boss.cap, -1, 0.5);
}

function themQuai(b: Battle, bc: DaBoCuc, kind: EnemyType, x: number, z: number, cap: number, khu: number, quay: number): void {
  const suc = sucQuai(kind, cap, khu);
  const f = newFighter(b, 'giac', kind, x, z, suc.hp);
  f.manh = suc.dmg / ENEMIES[kind].dmg;
  f.face = quay * Math.PI * 2;
  truotCan(bc, bodyRadius(kind), f);
  f.nha = { x: f.x, z: f.z, khu, cap, trang: 'cho', duoi: null };
  f.state = 'move';
  b.fighters.push(f);
}

// ---------- Lệnh của người chơi ----------

const quaiSong = (f: Fighter) => f.side === 'giac' && isAlive(f) && f.state !== 'dead';
const tuongCon = (b: Battle) => b.fighters.filter((f) => f.side === 'ta' && isHero(f.kind) && isAlive(f));

/** Tướng đầu còn đứng (dẫn đội). */
export function tuongDau(b: Battle): Fighter | undefined {
  return tuongCon(b)[0];
}

/**
 * Người chơi chạm (x, z) trên map: chạm quái (cả boss) thì đánh con ấy; chạm cổng thì đi tới cổng, tới nơi thì sang
 * map kề; chạm đất thì đi tới đó. Trả việc vừa nhận.
 */
export function chamMap(b: Battle, x: number, z: number): 'quai' | 'cong' | 'di' | null {
  const da = b.da;
  const lead = tuongDau(b);
  if (!da || !lead) return null;
  const bc = boCuc(da.map);
  let best: Fighter | null = null;
  let bestD = Infinity;
  for (const f of b.fighters) {
    if (!quaiSong(f)) continue;
    const d = dist(f.x - x, f.z - z);
    if (d < (f.nha?.khu === -1 ? 1.9 : 1.3) && d < bestD) {
      bestD = d;
      best = f;
    }
  }
  if (best) {
    da.muc = best.id;
    da.duong = null;
    da.cong = null;
    return 'quai';
  }
  const cong = [
    { p: bc.congTruoc, toi: da.map - 1 },
    ...(bc.congSau ? [{ p: bc.congSau, toi: da.map + 1 }] : []),
  ].find((c) => dist(c.p.x - x, c.p.z - z) < 2.5);
  const to = cong ? cong.p : { x, z };
  const duong = timDuong(bc, lead, to);
  if (!duong) return null;
  da.duong = duong;
  da.muc = null;
  da.tuMuc = null;
  da.cong = cong ? cong.toi : null;
  return cong ? 'cong' : 'di';
}

/** Bật, tắt Tự đánh. */
export function datTuDanh(b: Battle, on: boolean): void {
  if (b.da) b.da.tuDanh = on;
}

// ---------- Bước trận ----------

/** Tầm tự dùng kỹ năng: có quái trong chừng này ô quanh tướng làm kỹ năng. */
const TAM_KY: Partial<Record<SkillId, number>> = { phunLua: 5, nhoTre: 2.5, bocDoi: 7, doiNon: 3, noThan: 7, lienChau: 8, voiXung: 5, hieuTrieu: 5 };

/** Chạy trận dã ngoại thêm `dt` giây (không có thắng thua). */
export function stepDa(b: Battle, dt: number): void {
  const da = b.da;
  if (!da) return;
  advanceClock(b, dt);
  const bc = boCuc(da.map);
  for (const f of b.fighters) {
    if (!isAlive(f)) continue;
    f.cd -= dt;
    f.swing = Math.max(0, f.swing - dt);
    if (f.slow) f.slow = Math.max(0, f.slow - dt);
  }
  hoiSinh(b, bc);
  const heroes = tuongCon(b);
  const lead = heroes[0];
  if (lead) {
    buocDoi(b, bc, heroes, dt);
    if (da.tuDanh && !da.duong) tuKyNang(b);
  }
  for (const f of b.fighters) {
    if (!isAlive(f) || f.state === 'dead') continue;
    if (f.side === 'giac' && f.nha) buocQuai(b, bc, f, dt);
    else if (f.side === 'ta' && !isHero(f.kind)) buocQuan(b, bc, f, dt, lead);
  }
  tachRa(b, bc);
  donChet(b, bc);
  hoiMau(b, dt);
}

/** Mục tiêu của đội lúc này: quái người chơi chạm, hay (Tự đánh) quái gần nhất trong khu đang đứng. */
function mucTieu(b: Battle, lead: Fighter): Fighter | null {
  const da = b.da!;
  const byId = (id: number | null) => (id === null ? null : (b.fighters.find((f) => f.id === id && quaiSong(f)) ?? null));
  const muc = byId(da.muc);
  if (muc) return muc;
  da.muc = null;
  if (!da.tuDanh) return null;
  // Máu đội thấp mà không có quái đuổi thì đứng nghỉ hồi sức, hồi gần đủ mới đánh tiếp.
  const team = tuongCon(b);
  const mau = team.reduce((a, f) => a + f.hp / f.maxHp, 0) / Math.max(1, team.length);
  const biDuoi = b.fighters.some((f) => quaiSong(f) && f.nha?.trang === 'duoi');
  if (mau < DA_TUONG.nghi[0] && !biDuoi) da.nghi = true;
  if (da.nghi && (mau >= DA_TUONG.nghi[1] || biDuoi)) da.nghi = false;
  if (da.nghi) return null;
  const cu = byId(da.tuMuc);
  if (cu && cu.nha?.trang !== 've') return cu;
  // Quái đang đuổi đội đánh trước; rồi tới quái gần nhất trong khu tướng đầu đang đứng (không nhắm boss).
  const bc = boCuc(da.map);
  const khu = khuTai(bc, lead.x, lead.z, 3);
  let best: Fighter | null = null;
  let bestD = Infinity;
  for (const f of b.fighters) {
    if (!quaiSong(f) || !f.nha || f.nha.khu < 0 || f.nha.trang === 've') continue;
    const duoi = f.nha.trang === 'duoi';
    if (!duoi && khu >= 0 && f.nha.khu !== khu) continue;
    const d = dist(f.x - lead.x, f.z - lead.z) - (duoi ? 100 : 0);
    if (d < bestD && (duoi || khu >= 0 || d < 14)) {
      bestD = d;
      best = f;
    }
  }
  da.tuMuc = best?.id ?? null;
  return best;
}

/** Quái gần `f` nhất đang đuổi đội trong chừng `r` ô (để tướng tự vệ khi không có mục tiêu). */
function quaiDuoiGan(b: Battle, f: Fighter, r: number): Fighter | null {
  let best: Fighter | null = null;
  let bestD = r;
  for (const o of b.fighters) {
    if (!quaiSong(o) || o.nha?.trang !== 'duoi') continue;
    const d = dist(o.x - f.x, o.z - f.z);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

/** Đi về (tx, tz), trượt dọc vật cản. */
function diToi(bc: DaBoCuc, f: Fighter, tx: number, tz: number, dt: number, mult = 1): boolean {
  const done = moveToward(f, tx, tz, dt, mult);
  truotCan(bc, bodyRadius(f.kind), f);
  return done;
}

/** Đánh `foe` nếu tới tầm, không thì chạy tới. */
function danh(bc: DaBoCuc, b: Battle, f: Fighter, foe: Fighter, dt: number): void {
  const reach = statsOf(f.kind).range + 0.3 + bodyRadius(foe.kind) * 0.5;
  const d = dist(foe.x - f.x, foe.z - f.z);
  if (d <= reach) {
    f.state = 'fight';
    f.face = Math.atan2(foe.x - f.x, foe.z - f.z);
    if (f.cd <= 0) strike(b, f, foe);
    return;
  }
  f.state = 'move';
  diToi(bc, f, foe.x, foe.z, dt);
}

function buocDoi(b: Battle, bc: DaBoCuc, heroes: Fighter[], dt: number): void {
  const da = b.da!;
  const lead = heroes[0];
  if (da.duong) {
    // Đi theo lệnh: tướng đầu theo đường, các tướng sau giữ đội hình; không dừng lại đánh.
    for (const f of heroes) if (stunned(f, dt)) return;
    const p = da.duong[0];
    lead.state = 'move';
    if (diToi(bc, lead, p.x, p.z, dt) || dist(p.x - lead.x, p.z - lead.z) < 0.25) da.duong.shift();
    if (!da.duong.length) {
      da.duong = null;
      if (da.cong !== null) {
        da.sang = da.cong;
        da.cong = null;
      }
    }
    heroes.forEach((f, i) => {
      if (i === 0) return;
      const q = choDoiHinh(lead, i);
      f.state = dist(q.x - f.x, q.z - f.z) > 0.3 ? 'move' : 'fight';
      if (f.state === 'move') diToi(bc, f, q.x, q.z, dt, 1.15);
      else f.face = lead.face;
    });
    return;
  }
  const muc = mucTieu(b, lead);
  heroes.forEach((f, i) => {
    if (stunned(f, dt)) return;
    const foe = muc ?? quaiDuoiGan(b, f, 6);
    if (foe) {
      danh(bc, b, f, foe, dt);
      return;
    }
    const q = choDoiHinh(lead, i);
    if (i > 0 && dist(q.x - f.x, q.z - f.z) > 0.4) {
      f.state = 'move';
      diToi(bc, f, q.x, q.z, dt, 1.1);
    } else {
      f.state = 'fight';
      if (i > 0) f.face = lead.face;
    }
  });
}

/** Tự đánh: kỹ năng hồi xong, có quái trong tầm thì tướng tự dùng. */
function tuKyNang(b: Battle): void {
  for (const skill of b.skills) {
    if (skill === 'lenhBan' || skill === 'trongTran' || !skillReady(b, skill)) continue;
    const owner = skillOwner(b, skill);
    if (!owner) continue;
    if (skill === 'ruaVang') {
      if (tuongCon(b).some((f) => f.hp < f.maxHp * 0.6)) useSkill(b, skill);
      continue;
    }
    const tam = TAM_KY[skill] ?? 5;
    const gan = b.fighters.some((f) => quaiSong(f) && f.nha?.trang !== 've' && dist(f.x - owner.x, f.z - owner.z) <= tam);
    if (gan) useSkill(b, skill);
  }
}

/** Nghĩa binh (Hiệu triệu): đánh quái gần, không có thì theo tướng đầu. */
function buocQuan(b: Battle, bc: DaBoCuc, f: Fighter, dt: number, lead: Fighter | undefined): void {
  if (stunned(f, dt)) return;
  let foe: Fighter | null = null;
  let bestD = 6;
  for (const o of b.fighters) {
    if (!quaiSong(o) || o.nha?.trang === 've') continue;
    const d = dist(o.x - f.x, o.z - f.z);
    if (d < bestD) {
      bestD = d;
      foe = o;
    }
  }
  if (foe) danh(bc, b, f, foe, dt);
  else if (lead && dist(lead.x - f.x, lead.z - f.z) > 1.8) {
    f.state = 'move';
    diToi(bc, f, lead.x, lead.z, dt);
  } else f.state = 'fight';
}

/** Người bên ta gần `f` nhất còn đánh được, trong chừng `r` ô. */
function taGan(b: Battle, f: Fighter, r: number): Fighter | null {
  let best: Fighter | null = null;
  let bestD = r;
  for (const o of b.fighters) {
    if (o.side !== 'ta' || !isAlive(o) || o.state === 'dead') continue;
    const d = dist(o.x - f.x, o.z - f.z);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

function buocQuai(b: Battle, bc: DaBoCuc, f: Fighter, dt: number): void {
  const nha = f.nha!;
  const boss = nha.khu < 0;
  if (nha.trang === 've') {
    f.state = 'move';
    if (diToi(bc, f, nha.x, nha.z, dt, 1.5) || dist(nha.x - f.x, nha.z - f.z) < 0.3) {
      nha.trang = 'cho';
      nha.duoi = null;
      f.hp = f.maxHp;
      f.state = 'move';
    }
    return;
  }
  if (stunned(f, dt)) return;
  const vung = boss ? bc.boss : bc.khu[nha.khu];
  const xich = vung.r + (boss ? 4 : DA_QUAI.xich);
  const phat = boss ? DA_QUAI.phatBoss : DA_QUAI.phat;
  if (nha.trang === 'cho') {
    // Bị đánh thì đuổi người gần nhất; không thì thấy người tới gần mới đuổi.
    const ai = taGan(b, f, f.hp < f.maxHp ? 30 : phat);
    if (!ai) {
      f.state = 'move';
      return;
    }
    nha.trang = 'duoi';
    nha.duoi = ai.id;
  }
  if (dist(f.x - vung.x, f.z - vung.z) > xich) {
    nha.trang = 've';
    nha.duoi = null;
    return;
  }
  let foe = b.fighters.find((o) => o.id === nha.duoi && o.side === 'ta' && isAlive(o) && o.state !== 'dead');
  if (!foe) {
    const ai = taGan(b, f, phat * 2);
    if (!ai) {
      nha.trang = 've';
      nha.duoi = null;
      return;
    }
    nha.duoi = ai.id;
    foe = ai;
  }
  b.da!.yenTu = b.t;
  danh(bc, b, f, foe, dt);
}

/** Đẩy người đứng chồng lên nhau ra, rồi trượt dọc vật cản, giữ trong map. */
function tachRa(b: Battle, bc: DaBoCuc): void {
  const live = b.fighters.filter((f) => isAlive(f) && f.state !== 'dead');
  for (let i = 0; i < live.length; i++) {
    const a = live[i];
    for (let j = i + 1; j < live.length; j++) {
      const c = live[j];
      const min = bodyRadius(a.kind) + bodyRadius(c.kind);
      const dx = c.x - a.x;
      const dz = c.z - a.z;
      if (Math.abs(dx) >= min || Math.abs(dz) >= min) continue;
      const d = dist(dx, dz);
      if (d >= min) continue;
      const nx = d > 1e-6 ? dx / d : 1;
      const nz = d > 1e-6 ? dz / d : 0;
      const push = (min - d) / 2;
      a.x -= nx * push;
      a.z -= nz * push;
      c.x += nx * push;
      c.z += nz * push;
    }
  }
  for (const f of live) truotCan(bc, bodyRadius(f.kind), f);
}

/** Quái vừa ngã vào danh sách thưởng, chờ mọc lại; người ngã lâu thì dọn khỏi trận. */
function donChet(b: Battle, bc: DaBoCuc): void {
  const da = b.da!;
  for (const f of b.fighters) {
    if (f.state !== 'dead') continue;
    da.chet[f.id] ??= b.t;
    const nha = f.nha;
    if (nha && !nha.tinh && f.side === 'giac') {
      nha.tinh = true;
      const boss = nha.khu < 0;
      da.giet.push({ kind: f.kind as EnemyType, cap: nha.cap, khu: nha.khu, boss, x: f.x, z: f.z });
      if (boss) da.boss = false;
      else da.moc.push({ khu: nha.khu, at: b.t + DA_QUAI.moc });
      if (da.muc === f.id) da.muc = null;
      if (da.tuMuc === f.id) da.tuMuc = null;
    }
  }
  b.fighters = b.fighters.filter((f) => f.state !== 'dead' || b.t - (da.chet[f.id] ?? b.t) < 3);
  for (const id of Object.keys(da.chet)) if (!b.fighters.some((f) => f.id === +id)) delete da.chet[+id];
  const due = da.moc.filter((m) => m.at <= b.t);
  if (due.length) {
    da.moc = da.moc.filter((m) => m.at > b.t);
    for (const m of due) mocQuai(b, bc, m.khu);
  }
}

/** Tướng ngã: yên một lúc thì đứng dậy nửa máu cạnh tướng đầu; cả đội ngã thì một lúc sau về trại, đủ máu. */
function hoiSinh(b: Battle, bc: DaBoCuc): void {
  const da = b.da!;
  const all = b.fighters.filter((f) => f.side === 'ta' && isHero(f.kind));
  if (!all.length) return;
  const up = all.filter((f) => f.state !== 'gone');
  if (!up.length) {
    da.nga ??= b.t;
    if (b.t - da.nga < DA_TUONG.day) return;
    da.nga = null;
    da.duong = null;
    da.muc = null;
    da.tuMuc = null;
    da.cong = null;
    for (const f of b.fighters) if (f.nha && f.nha.trang === 'duoi') (f.nha.trang = 've'), (f.nha.duoi = null);
    const lead = { x: bc.trai.x, z: bc.trai.z, face: Math.PI } as Fighter;
    all.forEach((f, i) => dungDay(b, bc, f, choDoiHinh(lead, i), 1));
    return;
  }
  if (b.t - da.yenTu < DA_TUONG.day) return;
  const lead = up[0];
  all.forEach((f, i) => {
    if (f.state === 'gone') dungDay(b, bc, f, choDoiHinh(lead, i), 0.5);
  });
}

function dungDay(b: Battle, bc: DaBoCuc, f: Fighter, at: Diem, mau: number): void {
  f.state = 'move';
  f.hp = f.maxHp * mau;
  f.x = at.x;
  f.z = at.z;
  f.stun = 0;
  truotCan(bc, bodyRadius(f.kind), f);
  const setup = [b.hero, b.hero2, ...(b.heroThem ?? [])].find((h) => h?.kind === f.kind);
  if (setup) setup.down = false;
  b.da!.mau[f.id] = f.hp;
}

/** Tướng không bị đánh một lúc thì hồi máu dần. */
function hoiMau(b: Battle, dt: number): void {
  const da = b.da!;
  for (const f of b.fighters) {
    if (f.side !== 'ta' || !isHero(f.kind) || f.state === 'gone') continue;
    const cu = da.mau[f.id] ?? f.hp;
    if (f.hp < cu - 1e-6) da.biDanh[f.id] = b.t;
    if (b.t - (da.biDanh[f.id] ?? -Infinity) >= DA_TUONG.yen) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * DA_TUONG.hoi * dt);
    da.mau[f.id] = f.hp;
  }
}

/** Chỗ đội đang đứng (tướng đầu còn đứng, không thì người đầu đội), để lưu. */
export function choDoi(b: Battle): Diem | null {
  const f = tuongDau(b) ?? b.fighters.find((o) => o.side === 'ta' && isHero(o.kind));
  return f ? { x: f.x, z: f.z } : null;
}
