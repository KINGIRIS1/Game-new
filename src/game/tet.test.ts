import { describe, expect, it } from 'vitest';
import { edge, setDien } from './testmap';
import { startFieldBattle } from './battle';
import {
  BUILDINGS,
  DEFAULT_ROWS,
  FIELD,
  OFFLINE_RATE,
  TET_DAT_BONUS,
  TET_EVERY_MS,
  TET_FIRST_MS,
  TET_FIRST_NEED,
  TET_NEED,
  TET_OPEN_MS,
  TET_TROI_BONUS,
  TEMPLE_BONUS,
  UNITS,
  type BuildingType,
} from './defs';
import {
  applyOffline,
  canPlace,
  canUpgrade,
  createInitialState,
  place,
  productionPerMinute,
  slotsOf,
  tick,
  troopBonus,
  upgrade,
  type Building,
  type GameState,
} from './game';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { markStory, pendingStory } from './story';
import { bake, bakeRates, bakeStore, canOffer, offer, tetNeed, tetOpen } from './tet';

const MIN = 60_000;

/** Kinh đô đã qua kết chương 1, Điện ở cấp `dien`, giàu của. */
function city(dien = 7): GameState {
  const s = createInitialState(0);
  s.giong.ascended = true;
  s.resources = { gao: 50000, voOc: 50000, datDa: 50000, sat: 50000 };
  setDien(s, dien);
  return s;
}

/** Dựng một công trình Tết ở cấp `level`, đủ người làm (Điện tạm lên cấp 7 để có chỗ). */
function put(s: GameState, type: BuildingType, x: number, z: number, level = 1): Building {
  const dien = s.buildings[0].level;
  setDien(s, 7);
  const r = place(s, type, x, z);
  setDien(s, dien);
  if (!r.ok) throw new Error(`${type}: ${r.reason}`);
  r.value.level = level;
  r.value.workers = slotsOf(r.value);
  return r.value;
}

// Chỗ dựng bộ làm bánh trong vùng đất Điện 7, xa Điện.
const NEP1 = { x: edge(7, 1), z: edge(7, 1) };
const VUON1 = { x: edge(7, 6), z: edge(7, 1) };
const LON1 = { x: edge(7, 10), z: edge(7, 1) };
const BEP = { x: edge(7, 6), z: edge(7, 10) };
const NEP2 = { x: edge(7, 1), z: edge(7, 6) };
const VUON2 = { x: edge(7, 6), z: edge(7, 5) };
const LON2 = { x: edge(7, 10), z: edge(7, 5) };

/** Bộ làm bánh: mỗi loại một cái ở cấp `level`; `double` thì thêm ruộng nếp, vườn, chuồng thứ hai. */
function kitchen(s: GameState, level = 1, double = false): void {
  put(s, 'ruongNep', NEP1.x, NEP1.z, level);
  put(s, 'vuon', VUON1.x, VUON1.z, level);
  put(s, 'chuongLon', LON1.x, LON1.z, level);
  put(s, 'bep', BEP.x, BEP.z, level);
  if (double) {
    put(s, 'ruongNep', NEP2.x, NEP2.z, level);
    put(s, 'vuon', VUON2.x, VUON2.z, level);
    put(s, 'chuongLon', LON2.x, LON2.z, level);
  }
}

/** Kể truyện Lang Liêu, rồi chạy tới khi Tết đầu mở. */
function toFirstTet(s: GameState): void {
  markStory(s, 'langLieu');
  tick(s, 1);
  tick(s, TET_FIRST_MS);
}

describe('bốn công trình Hội Tết', () => {
  it('mở sau kết chương 1, cần Điện cấp 3; cấp 2 cần Điện 5, cấp 3 cần Điện 6', () => {
    const s = city(3);
    s.giong.ascended = false;
    expect(canPlace(s, 'bep', edge(3, 1), edge(3, 1))).toEqual({ ok: false, reason: 'canKetChuong' });
    s.giong.ascended = true;
    setDien(s, 2);
    expect(canPlace(s, 'bep', edge(3, 1), edge(3, 1))).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 3);
    const bep = place(s, 'bep', edge(3, 1), edge(3, 1));
    if (!bep.ok) throw new Error(bep.reason);
    expect(canUpgrade(s, bep.value.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 5);
    expect(upgrade(s, bep.value.id).ok).toBe(true);
    expect(canUpgrade(s, bep.value.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 6);
    expect(upgrade(s, bep.value.id).ok).toBe(true);
    expect(canUpgrade(s, bep.value.id)).toEqual({ ok: false, reason: 'capToiDa' });
    // Số tối đa: ruộng nếp thứ hai ở Điện 5, vườn và chuồng thứ hai ở Điện 6, bếp chỉ một.
    expect(BUILDINGS.ruongNep.limit.slice(2)).toEqual([1, 1, 2, 2, 2, 2]);
    expect(BUILDINGS.vuon.limit.slice(2)).toEqual([1, 1, 1, 2, 2, 2]);
    expect(BUILDINGS.bep.limit.slice(2)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('bánh chưng nhanh bằng nguồn chậm nhất, nếp thừa thì giã bánh giầy, không quá sức bếp', () => {
    const s = city(7);
    expect(bakeRates(s)).toMatchObject({ chung: 0, giay: 0, short: null });
    kitchen(s, 1);
    // Cấp 1: nếp 2, đậu lá 1, thịt 1, bếp 2.
    expect(bakeRates(s)).toMatchObject({ nep: 2, dauLa: 1, thit: 1, bep: 2, chung: 1, giay: 1 });
    // Thiếu người chuồng lợn: thịt chỉ còn nửa.
    const lon = s.buildings.find((b) => b.type === 'chuongLon')!;
    lon.level = 3;
    lon.workers = 1;
    expect(bakeRates(s)).toMatchObject({ thit: 1, chung: 1, short: 'dauLa' });
    lon.workers = 0;
    expect(bakeRates(s)).toMatchObject({ chung: 0, giay: 2, short: 'thit' });
    // Chuồng hư cũng như không có người làm.
    lon.workers = 2;
    lon.damaged = true;
    expect(bakeRates(s).chung).toBe(0);
    lon.damaged = false;
    // Nếp nhiều mà bếp yếu: mỗi loại không quá sức bếp.
    put(s, 'ruongNep', NEP2.x, NEP2.z, 3);
    const vuon = s.buildings.find((b) => b.type === 'vuon')!;
    vuon.level = 3;
    vuon.workers = slotsOf(vuon);
    expect(bakeRates(s)).toMatchObject({ nep: 6, dauLa: 2, thit: 2, bep: 2, chung: 2, giay: 2 });
    s.buildings.find((b) => b.type === 'chuongLon')!.level = 3;
    vuon.level = 3;
    put(s, 'vuon', VUON2.x, VUON2.z, 3);
    put(s, 'chuongLon', LON2.x, LON2.z, 3);
    expect(bakeRates(s)).toMatchObject({ dauLa: 4, chung: 2, giay: 2, short: 'bep' });
  });

  it('bánh tích trên gác bếp, không quá sức chứa theo cấp bếp', () => {
    const s = city(7);
    expect(bakeStore(s)).toBe(0);
    kitchen(s, 1);
    expect(bakeStore(s)).toBe(30);
    bake(s, 10 * MIN, 1);
    expect(s.tet.banh.chung).toBeCloseTo(10, 5);
    expect(s.tet.banh.giay).toBeCloseTo(10, 5);
    bake(s, 60 * MIN, 1);
    expect(s.tet.banh).toEqual({ chung: 30, giay: 30 });
    s.buildings.find((b) => b.type === 'bep')!.level = 3;
    expect(bakeStore(s)).toBe(60);
  });

  it('vắng mặt thì bếp làm chậm như mọi công trình, Tết không trôi', () => {
    const s = city(7);
    kitchen(s, 1);
    markStory(s, 'langLieu');
    tick(s, 1);
    const at = s.tet.nextAt;
    const before = s.tet.banh.chung;
    applyOffline(s, s.lastSeen + 10 * MIN);
    expect(s.tet.banh.chung - before).toBeCloseTo(10 * OFFLINE_RATE, 5);
    expect(s.tet.nextAt).toBe(at);
    expect(tetOpen(s)).toBe(false);
  });
});

describe('Tết', () => {
  it('kể truyện Lang Liêu ngay sau kết chương 1, Tết đầu tới sau 2 phút, mở 3 phút, 20 phút sau lại có Tết', () => {
    const s = city(5);
    for (const id of ['mo', 'suGia', 'vuonVai', 'roiGay', 'ketChuong'] as const) markStory(s, id);
    expect(pendingStory(s)).toBe('langLieu');
    tick(s, 5 * MIN);
    expect(s.tet.nextAt).toBeNull();
    markStory(s, 'langLieu');
    tick(s, 1000);
    expect(s.tet.nextAt).toBe(s.clock + TET_FIRST_MS);
    tick(s, TET_FIRST_MS);
    expect(tetOpen(s)).toBe(true);
    expect(s.tet.seq).toBe(1);
    const opened = s.clock;
    tick(s, TET_OPEN_MS);
    expect(tetOpen(s)).toBe(false);
    expect(s.tet.nextAt).toBe(opened + TET_EVERY_MS);
    tick(s, TET_EVERY_MS - TET_OPEN_MS);
    expect(tetOpen(s)).toBe(true);
    expect(s.tet.seq).toBe(2);
  });

  it('đang có giặc hay đang đánh phó bản thì Tết lùi tới khi xong trận', () => {
    const s = city(5);
    markStory(s, 'langLieu');
    tick(s, 1);
    s.raid.phase = 'warning';
    s.raid.startsAt = Infinity;
    tick(s, TET_FIRST_MS + MIN);
    expect(tetOpen(s)).toBe(false);
    s.raid.phase = 'idle';
    s.campaign.battle = startFieldBattle({ id: 1, stage: 1, enemies: { giaoAn: 1 }, hpScale: 1, army: { giao: 1, cung: 0, voi: 0 }, rows: DEFAULT_ROWS });
    s.campaign.battle.outcome = null;
    const t = s.clock;
    // Phó bản tự đánh tiếp theo tick, nên chỉ chạy một chút để trận chưa xong.
    tick(s, 10);
    if (s.campaign.battle) expect(tetOpen(s)).toBe(false);
    s.campaign.battle = null;
    tick(s, 10);
    expect(tetOpen(s)).toBe(true);
    expect(s.tet.nextAt).toBe(s.clock + TET_EVERY_MS);
    expect(s.clock).toBeGreaterThan(t);
  });

  it('Tết đầu cần 3 mỗi loại, về sau theo cấp Điện', () => {
    const s = city(5);
    expect(tetNeed(s)).toBe(TET_FIRST_NEED);
    toFirstTet(s);
    expect(tetNeed(s)).toBe(TET_FIRST_NEED);
    tick(s, TET_OPEN_MS);
    expect(tetNeed(s)).toBe(20);
    expect(TET_NEED.slice(2)).toEqual([12, 12, 20, 30, 40, 40]);
    setDien(s, 7);
    expect(tetNeed(s)).toBe(40);
  });

  it('dâng bánh: trừ đúng số cần dâng, có phúc lành ngay, giữ tới khi Tết sau đóng, lỡ Tết thì mất', () => {
    const s = city(5);
    expect(canOffer(s, 'chung')).toEqual({ ok: false, reason: 'chuaToiTet' });
    toFirstTet(s);
    expect(canOffer(s, 'chung')).toEqual({ ok: false, reason: 'thieuBanh' });
    s.tet.banh = { chung: 5, giay: 2 };
    expect(offer(s, 'chung').ok).toBe(true);
    expect(s.tet.banh.chung).toBe(5 - TET_FIRST_NEED);
    expect(canOffer(s, 'chung')).toEqual({ ok: false, reason: 'daDang' });
    expect(canOffer(s, 'giay')).toEqual({ ok: false, reason: 'thieuBanh' });
    expect(s.tet.blessing).toEqual({ chung: true, giay: false });
    // Hết Tết đầu: phúc lành Đất vẫn còn tới hết Tết sau.
    tick(s, TET_OPEN_MS);
    expect(s.tet.blessing).toEqual({ chung: true, giay: false });
    expect(s.tet.offered).toEqual({ chung: false, giay: false });
    tick(s, TET_EVERY_MS - TET_OPEN_MS);
    expect(tetOpen(s)).toBe(true);
    expect(s.tet.blessing.chung).toBe(true);
    // Tết thứ hai: chỉ dâng bánh giầy. Hết Tết thì mất phúc lành Đất, giữ phúc lành Trời.
    s.tet.banh.giay = 25;
    expect(offer(s, 'giay').ok).toBe(true);
    expect(s.tet.banh.giay).toBe(5);
    tick(s, TET_OPEN_MS);
    expect(s.tet.blessing).toEqual({ chung: false, giay: true });
    // Lỡ Tết thứ ba: hết cả.
    tick(s, TET_EVERY_MS);
    expect(tetOpen(s)).toBe(true);
    tick(s, TET_OPEN_MS);
    expect(s.tet.blessing).toEqual({ chung: false, giay: false });
    expect(s.tet.banh.giay).toBe(5);
  });

  it('phúc lành Đất thêm 15% tài nguyên, phúc lành Trời thêm 10% máu và sức đánh, cộng với Đền Phù Đổng', () => {
    const s = city(5);
    const r = place(s, 'ruong', edge(5, 1), edge(5, 3));
    if (!r.ok) throw new Error(r.reason);
    r.value.workers = slotsOf(r.value);
    const base = productionPerMinute(s).gao;
    s.tet.blessing.chung = true;
    expect(productionPerMinute(s).gao).toBeCloseTo(base * (1 + TET_DAT_BONUS), 5);
    const den = place(s, 'denPhuDong', edge(5, 1), edge(5, 8));
    if (!den.ok) throw new Error(den.reason);
    expect(productionPerMinute(s).gao).toBeCloseTo(base * (1 + TEMPLE_BONUS + TET_DAT_BONUS), 5);
    expect(troopBonus(s)).toBeCloseTo(TEMPLE_BONUS, 5);
    s.tet.blessing.giay = true;
    expect(troopBonus(s)).toBeCloseTo(TEMPLE_BONUS + TET_TROI_BONUS, 5);
    const b = startFieldBattle({ id: 1, stage: 1, enemies: { giaoAn: 1 }, hpScale: 1, army: { giao: 1, cung: 0, voi: 0 }, rows: DEFAULT_ROWS, bonus: troopBonus(s) });
    expect(b.fighters.find((f) => f.kind === 'giao')!.maxHp).toBeCloseTo(UNITS.giao.hp * FIELD.hpMul * (1 + TEMPLE_BONUS + TET_TROI_BONUS), 5);
  });
});

describe('nhịp Hội Tết', () => {
  /** Số phút để bộ làm bánh làm đủ số bánh cần dâng mỗi loại. */
  function minutesFor(s: GameState): number {
    const r = bakeRates(s);
    const need = tetNeed(s);
    return Math.max(need / r.chung, need / r.giay);
  }
  const after = (s: GameState) => {
    s.tet.seq = 2;
    return s;
  };

  it('bộ nên có ở mỗi mức Điện làm đủ bánh trong khoảng 15 phút, chừa thời gian cho trận', () => {
    const d4 = after(city(4));
    kitchen(d4, 1);
    expect(minutesFor(d4)).toBeCloseTo(12, 5);

    const d5 = after(city(5));
    kitchen(d5, 2);
    put(d5, 'ruongNep', NEP2.x, NEP2.z, 2);
    expect(minutesFor(d5)).toBeCloseTo(20 / 1.5, 5);

    const d6 = after(city(6));
    kitchen(d6, 3);
    expect(minutesFor(d6)).toBeCloseTo(15, 5);

    const d7 = after(city(7));
    kitchen(d7, 3, true);
    expect(minutesFor(d7)).toBeCloseTo(10, 5);
    // Ở Điện 7 mà chỉ có một bộ cấp 3 thì làm vừa khít 20 phút: phải dựng thêm.
    const thin = after(city(7));
    kitchen(thin, 3);
    expect(minutesFor(thin)).toBeCloseTo(20, 5);
  });

  it('Tết đầu: dựng đủ bộ cấp 1 ngay sau truyện thì kịp làm đủ 3 bánh mỗi loại trước khi hết Tết', () => {
    const s = city(4);
    markStory(s, 'langLieu');
    tick(s, 1);
    kitchen(s, 1);
    tick(s, TET_FIRST_MS);
    expect(tetOpen(s)).toBe(true);
    tick(s, MIN);
    expect(canOffer(s, 'chung').ok).toBe(true);
    expect(canOffer(s, 'giay').ok).toBe(true);
  });
});

describe('bản lưu phiên bản 9', () => {
  it('lưu và nạp lại giữ phần Tết; bản lưu phiên bản 8 được thêm phần Tết trống', () => {
    const s = city(7);
    kitchen(s, 2);
    toFirstTet(s);
    s.tet.banh = { chung: 7.5, giay: 3 };
    offer(s, 'chung');
    expect(deserialize(serialize(s))).toEqual(s);
    const old = JSON.parse(serialize(s)) as Record<string, unknown>;
    old.version = 8;
    delete old.tet;
    old.buildings = (old.buildings as { type: string }[]).filter((b) => !['ruongNep', 'vuon', 'chuongLon', 'bep'].includes(b.type));
    const back = deserialize(JSON.stringify(old))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.tet).toEqual({
      seq: 0,
      nextAt: null,
      openUntil: 0,
      banh: { chung: 0, giay: 0 },
      offered: { chung: false, giay: false },
      blessing: { chung: false, giay: false },
    });
    // Tết đầu hẹn lại sau 2 phút kể từ lúc nạp (truyện đã kể rồi).
    tick(back, 1);
    expect(back.tet.nextAt).toBe(back.clock + TET_FIRST_MS);
  });
});
