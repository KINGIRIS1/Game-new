// Canh đóng đảo (Điện 10, `dao.ts`): thuyền chiến đóng ở bến thuyền khơi cấp 3, bến nào chở quân ra quần đảo bến ấy
// đánh cá; đồn đảo ba cấp dựng bằng tốp thợ; lính đóng rời kinh đô theo từng chuyến thuyền (lúc vắng thuyền vẫn chạy),
// vẫn ăn gạo; đồn giữ biển thì ngư trường làm ra thêm, thủy quân Hán được báo sớm, lâu thuyền vào tới sông đã sứt máu;
// nhiệm vụ 63–66; Lạc hầu gợi ý; bản lưu 26 lên 27.

import { describe, expect, it } from 'vitest';
import { QUAN_DAO, daoBen, onDaoChinh, onIsland, quanDao, warRoute, isWater } from './bien';
import { CH5_QUEST_START, DON_DAO, ENEMIES, GIFT_IDS, QUESTS, THUYEN_CHIEN, UNITS, type UnitType } from './defs';
import { MA_VIEN_AT } from './chuong5';
import {
  benOf,
  canDon,
  canThuyen,
  chanThuyen,
  daoArmy,
  daoJobId,
  giuBien,
  luaHieu,
  markDaoHinted,
  nextDaoHint,
  nguTruongBonus,
  setDaoLinh,
  tripMs,
} from './dao';
import { armySpace } from './doanhTrai';
import {
  applyOffline,
  callRaidNow,
  createInitialState,
  fishPerMinute,
  foodPerMinute,
  place,
  productionPerMinute,
  questProgress,
  tick,
  type Building,
  type GameState,
} from './game';
import { RIVER_START } from './map';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { markStory } from './story';
import { DIEN, DIEN_END, bank, setDien } from './testmap';
import { advanceXay, cancelJob, jobOf, startDon, startThuyen } from './xay';

/** Kinh đô Điện 10, của nhiều, doanh trại đủ chỗ, có `troops` lính. */
function capital(troops: Partial<Record<UnitType, number>> = { giao: 20, cung: 20, voi: 4, no: 10 }): GameState {
  const s = createInitialState(0);
  setDien(s, 10);
  s.resources = { gao: 200000, voOc: 200000, datDa: 200000, sat: 200000, go: 200000 };
  s.dan = 60;
  const t = place(s, 'doanhTrai', DIEN_END + 1, DIEN_END + 1);
  if (!t.ok) throw new Error(t.reason);
  t.value.level = 5;
  s.troops = { giao: 0, cung: 0, voi: 0, no: 0, ...troops };
  return s;
}

/** Dựng bến thuyền khơi sát sông Đà ở cấp `level`, đủ người làm. */
function wharf(s: GameState, level = 3, x = DIEN): Building {
  const r = place(s, 'benKhoi', x, bank('benKhoi'));
  if (!r.ok) throw new Error(r.reason);
  r.value.level = level;
  r.value.workers = 5;
  return r.value;
}

/** Cho tốp thợ làm xong mọi việc. */
const xongHet = (s: GameState) => advanceXay(s, 1e9);

/** Kinh đô có thuyền chiến và đồn Hoàng Sa cấp `cap`. */
function withFort(cap = 1, troops?: Partial<Record<UnitType, number>>): GameState {
  const s = capital(troops);
  wharf(s);
  expect(startThuyen(s, 'hoangSa').ok).toBe(true);
  xongHet(s);
  for (let i = 0; i < cap; i++) {
    expect(startDon(s, 'hoangSa').ok).toBe(true);
    xongHet(s);
  }
  return s;
}

/** Cho thời gian chơi trôi tới khi thuyền chiến Hoàng Sa neo ở bến (chạy hết các chuyến). */
function settleBoats(s: GameState): void {
  for (let i = 0; i < 40 && s.dao.hoangSa.chuyen; i++) tick(s, 20_000);
}

describe('Đường thuyền chiến, bến ván đồn đảo', () => {
  it('bến ván nằm trên nước, sát bờ đảo chính; đường đi trên nước, Trường Sa xa hơn Hoàng Sa', () => {
    for (const q of QUAN_DAO) {
      const p = daoBen(q);
      expect(isWater(p.x, p.z), q.id).toBe(true);
      expect(onIsland(p.x, p.z), q.id).toBe(null);
      // Cách bờ chừng một ô: lùi thêm nửa ô về tâm đảo là tới đất.
      const len = Math.hypot(q.x - p.x, q.z - p.z);
      const near = { x: p.x + ((q.x - p.x) / len) * 1.2, z: p.z + ((q.z - p.z) / len) * 1.2 };
      expect(onDaoChinh(q, near.x, near.z), q.id).toBe(true);
    }
    const s = capital();
    wharf(s);
    wharf(s, 3, 10);
    const hs = tripMs(s, 'hoangSa');
    const ts = tripMs(s, 'truongSa');
    // Thuyền đi đều như thuyền khơi trên cảnh: Hoàng Sa chừng nửa phút tới bốn mươi lăm giây một lượt, Trường Sa xa hơn.
    expect(hs).toBeGreaterThan(25_000);
    expect(hs).toBeLessThan(60_000);
    expect(ts).toBeGreaterThan(hs);
    expect(warRoute(benOf(s, 'truongSa')!, 1).quanDao).toBe('truongSa');
  });
});

describe('Thuyền chiến', () => {
  it('cần Điện 10 và bến thuyền khơi cấp 3 của quần đảo ấy; bến đầu ra Hoàng Sa, bến thứ hai ra Trường Sa', () => {
    const s = capital();
    expect(canThuyen(s, 'hoangSa')).toEqual({ ok: false, reason: 'canBenKhoi' });
    const ben = wharf(s, 2);
    expect(canThuyen(s, 'hoangSa')).toEqual({ ok: false, reason: 'canBenKhoi3' });
    ben.level = 3;
    expect(canThuyen(s, 'hoangSa').ok).toBe(true);
    expect(canThuyen(s, 'truongSa')).toEqual({ ok: false, reason: 'canBenKhoi' });
    wharf(s, 3, 10);
    expect(benOf(s, 'truongSa')?.x).toBe(10);
    expect(canThuyen(s, 'truongSa').ok).toBe(true);
    setDien(s, 9);
    expect(canThuyen(s, 'hoangSa')).toEqual({ ok: false, reason: 'chuaDuCapDien' });
  });

  it('đóng thuyền trả của ngay, tốp thợ làm 20 phút, xong thì có thuyền; không đóng hai chiếc', () => {
    const s = capital();
    const ben = wharf(s);
    const before = { ...s.resources };
    const r = startThuyen(s, 'hoangSa');
    expect(r.ok).toBe(true);
    expect(s.resources.go).toBe(before.go - THUYEN_CHIEN.cost.go!);
    expect(s.resources.sat).toBe(before.sat - THUYEN_CHIEN.cost.sat!);
    expect(jobOf(s, ben.id)?.o[0].thuyen).toBe('hoangSa');
    expect(canThuyen(s, 'hoangSa')).toEqual({ ok: false, reason: 'daCoThuyen' });
    advanceXay(s, THUYEN_CHIEN.xayMs - 1000);
    expect(s.dao.hoangSa.thuyen).toBe(false);
    advanceXay(s, 1000);
    expect(s.dao.hoangSa.thuyen).toBe(true);
    expect(canThuyen(s, 'hoangSa')).toEqual({ ok: false, reason: 'daCoThuyen' });
  });

  it('hủy việc đóng thuyền thì hoàn đủ của', () => {
    const s = capital();
    wharf(s);
    const before = { ...s.resources };
    const r = startThuyen(s, 'hoangSa');
    if (!r.ok) throw new Error(r.reason);
    expect(cancelJob(s, r.value.id).ok).toBe(true);
    expect(s.resources).toEqual(before);
    expect(s.dao.hoangSa.thuyen).toBe(false);
  });
});

describe('Đồn đảo', () => {
  it('cần thuyền chiến; dựng, nâng cấp 2, 3 theo giá và thời gian; không quá cấp 3', () => {
    const s = capital();
    wharf(s);
    expect(canDon(s, 'hoangSa')).toEqual({ ok: false, reason: 'canThuyenChien' });
    expect(startThuyen(s, 'hoangSa').ok).toBe(true);
    xongHet(s);
    for (let cap = 0; cap < 3; cap++) {
      const before = { ...s.resources };
      const r = startDon(s, 'hoangSa');
      if (!r.ok) throw new Error(r.reason);
      expect(r.value.o[0].id).toBe(daoJobId('hoangSa'));
      expect(s.resources.go).toBe(before.go - DON_DAO.cost[cap].go!);
      expect(s.resources.gao).toBe(before.gao - DON_DAO.cost[cap].gao!);
      expect(canDon(s, 'hoangSa')).toEqual({ ok: false, reason: 'dangXay' });
      advanceXay(s, DON_DAO.xayMs[cap] - 1000);
      expect(s.dao.hoangSa.cap).toBe(cap);
      advanceXay(s, 1000);
      expect(s.dao.hoangSa.cap).toBe(cap + 1);
    }
    expect(canDon(s, 'hoangSa')).toEqual({ ok: false, reason: 'capToiDa' });
  });
});

describe('Lính đóng đảo', () => {
  it('đặt số lính không quá chỗ của đồn (voi 3 chỗ, nỏ 2) và số lính đang có', () => {
    const s = withFort(1);
    expect(setDaoLinh(s, 'truongSa', 'giao', 5)).toEqual({ ok: false, reason: 'canDonDao' });
    expect(setDaoLinh(s, 'hoangSa', 'giao', 50)).toEqual({ ok: true, value: DON_DAO.cho[0] });
    expect(setDaoLinh(s, 'hoangSa', 'giao', 6)).toEqual({ ok: true, value: 6 });
    expect(setDaoLinh(s, 'hoangSa', 'voi', 9)).toEqual({ ok: true, value: 2 });
    expect(armySpace(s.dao.hoangSa.muon)).toBe(12);
    const t = withFort(1, { giao: 3, cung: 0, voi: 0, no: 0 });
    expect(setDaoLinh(t, 'hoangSa', 'giao', 10)).toEqual({ ok: true, value: 3 });
  });

  it('thuyền chở mỗi chuyến tối đa 10 chỗ: lính rời kinh đô lúc đi, tới đảo sau một lượt, thuyền về rồi đi tiếp cho đủ', () => {
    const s = withFort(1);
    const giao = s.troops.giao;
    expect(setDaoLinh(s, 'hoangSa', 'giao', 12).ok).toBe(true);
    // Chuyến đầu: 10 lính lên thuyền ngay.
    expect(s.dao.hoangSa.chuyen?.cho.giao).toBe(THUYEN_CHIEN.cho);
    expect(s.troops.giao).toBe(giao - 10);
    expect(daoArmy(s).giao).toBe(10);
    const trip = tripMs(s, 'hoangSa');
    tick(s, trip - 1000);
    expect(s.dao.hoangSa.linh.giao).toBe(0);
    tick(s, 1000);
    expect(s.dao.hoangSa.linh.giao).toBe(10);
    expect(s.dao.hoangSa.chuyen?.ve).toBe(true);
    // Về tới bến thì chở nốt 2 lính.
    tick(s, trip);
    expect(s.dao.hoangSa.chuyen).toEqual({ cho: { giao: 2, cung: 0, voi: 0, no: 0 }, ve: false, con: trip });
    expect(s.troops.giao).toBe(giao - 12);
    settleBoats(s);
    expect(s.dao.hoangSa.linh.giao).toBe(12);
    expect(s.dao.hoangSa.chuyen).toBe(null);
    expect(daoArmy(s).giao).toBe(12);
  });

  it('bớt số lính muốn đóng thì thuyền ra đảo chở lính thừa về doanh trại', () => {
    const s = withFort(1);
    const giao = s.troops.giao;
    setDaoLinh(s, 'hoangSa', 'giao', 8);
    settleBoats(s);
    expect(s.dao.hoangSa.linh.giao).toBe(8);
    setDaoLinh(s, 'hoangSa', 'giao', 3);
    expect(s.dao.hoangSa.chuyen?.cho.giao).toBe(0);
    settleBoats(s);
    expect(s.dao.hoangSa.linh.giao).toBe(3);
    expect(s.troops.giao).toBe(giao - 3);
  });

  it('lúc vắng thuyền vẫn chạy đủ chuyến', () => {
    const s = withFort(2);
    setDaoLinh(s, 'hoangSa', 'giao', 20);
    s.lastSeen = 0;
    applyOffline(s, 60 * 60_000);
    expect(s.dao.hoangSa.linh.giao).toBe(20);
    expect(s.dao.hoangSa.chuyen).toBe(null);
  });

  it('đang có trận giữ kinh đô thì thuyền neo ở bến không rời đi; bến hư cũng không đi', () => {
    const s = withFort(1);
    s.raid.phase = 'battle';
    setDaoLinh(s, 'hoangSa', 'giao', 6);
    expect(s.dao.hoangSa.chuyen).toBe(null);
    s.raid.phase = 'idle';
    benOf(s, 'hoangSa')!.damaged = true;
    tick(s, 1000);
    expect(s.dao.hoangSa.chuyen).toBe(null);
    benOf(s, 'hoangSa')!.damaged = false;
    tick(s, 1000);
    expect(s.dao.hoangSa.chuyen?.cho.giao).toBe(6);
  });

  it('lính đóng đảo và trên thuyền vẫn ăn gạo', () => {
    const s = withFort(1);
    const food = foodPerMinute(s);
    setDaoLinh(s, 'hoangSa', 'giao', 10);
    expect(foodPerMinute(s)).toBeCloseTo(food, 9);
    settleBoats(s);
    expect(foodPerMinute(s)).toBeCloseTo(food, 9);
    expect(daoArmy(s).giao * UNITS.giao.upkeep).toBeGreaterThan(0);
  });
});

describe('Giữ biển', () => {
  it('đồn cần đủ 6 chỗ quân đóng mới giữ biển; ngư trường làm ra thêm 10%, 20%, 30% vỏ ốc và cá', () => {
    const s = withFort(1);
    const ben = benOf(s, 'hoangSa')!;
    const voOc = productionPerMinute(s).voOc;
    const fish = fishPerMinute(s);
    setDaoLinh(s, 'hoangSa', 'giao', 5);
    settleBoats(s);
    expect(giuBien(s, 'hoangSa')).toBe(0);
    expect(nguTruongBonus(s, ben)).toBe(0);
    setDaoLinh(s, 'hoangSa', 'giao', 6);
    settleBoats(s);
    expect(giuBien(s, 'hoangSa')).toBe(1);
    expect(nguTruongBonus(s, ben)).toBeCloseTo(0.1, 9);
    const bonus = (n: number) => n * 0.1;
    expect(fishPerMinute(s)).toBeGreaterThan(fish);
    expect(productionPerMinute(s).voOc).toBeGreaterThan(voOc);
    for (const cap of [2, 3]) {
      expect(startDon(s, 'hoangSa').ok).toBe(true);
      xongHet(s);
      expect(nguTruongBonus(s, ben)).toBeCloseTo(bonus(cap), 9);
    }
  });

  it('lửa hiệu: đợt thủy quân Hán được báo trước 2 phút; lâu thuyền vào tới sông đã mất máu theo cấp đồn', () => {
    const s = withFort(1);
    s.questIndex = CH5_QUEST_START;
    s.campaign.cleared = MA_VIEN_AT;
    for (const id of ['hetTruyen', 'meLinh', 'hatMon', 'trungVuong'] as const) markStory(s, id);
    for (const g of GIFT_IDS) s.son.gifts[g] = true;
    const call = () => {
      s.raid.foe = 'thuy';
      s.raid.phase = 'idle';
      s.raid.battle = null;
      expect(callRaidNow(s).ok).toBe(true);
      expect(s.raid.foe).toBe('thuyHan');
    };
    call();
    expect(s.raid.startsAt - s.clock).toBe(60_000);
    expect(luaHieu(s)).toBe(false);
    setDaoLinh(s, 'hoangSa', 'giao', 6);
    settleBoats(s);
    expect(luaHieu(s)).toBe(true);
    expect(chanThuyen(s)).toBeCloseTo(0.1, 9);
    call();
    expect(s.raid.startsAt - s.clock).toBe(DON_DAO.baoSom);
    tick(s, DON_DAO.baoSom);
    const ships = s.raid.battle!.fighters.filter((f) => f.kind === 'lauThuyen');
    expect(ships.length).toBeGreaterThan(0);
    for (const f of ships) {
      expect(f.hp).toBeCloseTo(f.maxHp * 0.9, 6);
      expect(f.maxHp).toBeGreaterThan(ENEMIES.lauThuyen.hp);
    }
  });

  it('hai đồn cộng phần chặn đánh, tối đa 40%', () => {
    const s = withFort(3);
    wharf(s, 3, 10);
    expect(startThuyen(s, 'truongSa').ok).toBe(true);
    xongHet(s);
    for (let i = 0; i < 3; i++) {
      expect(startDon(s, 'truongSa').ok).toBe(true);
      xongHet(s);
    }
    setDaoLinh(s, 'hoangSa', 'cung', 10);
    setDaoLinh(s, 'truongSa', 'giao', 10);
    for (let i = 0; i < 60 && (s.dao.hoangSa.chuyen || s.dao.truongSa.chuyen); i++) tick(s, 20_000);
    expect(giuBien(s, 'hoangSa')).toBe(3);
    expect(giuBien(s, 'truongSa')).toBe(3);
    expect(chanThuyen(s)).toBeCloseTo(DON_DAO.chanMax, 9);
  });
});

describe('Nhiệm vụ, Lạc hầu, bản lưu', () => {
  it('nhiệm vụ 63–66: thuyền chiến, đồn Hoàng Sa, đồn Trường Sa, một đồn đảo cấp 3', () => {
    const ids = ['thuyenChien', 'donHoangSa', 'donTruongSa', 'donDao3'];
    expect(ids.map((id) => QUESTS.findIndex((q) => q.id === id))).toEqual([63, 64, 65, 66]);
    const s = capital();
    wharf(s);
    const at = (id: string) => {
      s.questIndex = QUESTS.findIndex((q) => q.id === id);
      return questProgress(s);
    };
    expect(at('thuyenChien')).toEqual({ have: 0, need: 1 });
    startThuyen(s, 'hoangSa');
    xongHet(s);
    expect(at('thuyenChien')).toEqual({ have: 1, need: 1 });
    expect(at('donHoangSa')).toEqual({ have: 0, need: 1 });
    startDon(s, 'hoangSa');
    xongHet(s);
    expect(at('donHoangSa')).toEqual({ have: 1, need: 1 });
    expect(at('donTruongSa')).toEqual({ have: 0, need: 1 });
    expect(at('donDao3')).toEqual({ have: 1, need: 3 });
  });

  it('Lạc hầu gợi ý một lần khi có bến thuyền khơi cấp 3, một lần khi Mã Viện sang mà đã có đồn đảo', () => {
    const s = capital();
    const ben = wharf(s, 2);
    expect(nextDaoHint(s)).toBe(null);
    ben.level = 3;
    expect(nextDaoHint(s)).toBe('mo');
    markDaoHinted(s, 'mo');
    expect(nextDaoHint(s)).toBe(null);
    startThuyen(s, 'hoangSa');
    xongHet(s);
    startDon(s, 'hoangSa');
    xongHet(s);
    expect(nextDaoHint(s)).toBe(null);
    s.questIndex = CH5_QUEST_START;
    s.campaign.cleared = MA_VIEN_AT;
    expect(nextDaoHint(s)).toBe('maVien');
    markDaoHinted(s, 'maVien');
    expect(nextDaoHint(s)).toBe(null);
  });

  it('bản lưu 27 giữ đồn, thuyền, lính đóng, chuyến đang đi và việc xây đồn; bản lưu 26 lên 27 chưa có gì ngoài đảo', () => {
    const s = withFort(1);
    setDaoLinh(s, 'hoangSa', 'giao', 12);
    startDon(s, 'hoangSa');
    const back = deserialize(serialize(s))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(27);
    expect(back.dao).toEqual(s.dao);
    expect(jobOf(back, daoJobId('hoangSa'))?.o[0].dao).toBe('hoangSa');
    const old = JSON.parse(serialize(createInitialState(0)));
    old.version = 26;
    delete old.dao;
    const up = deserialize(JSON.stringify(old))!;
    expect(up.version).toBe(27);
    expect(up.dao.hoangSa).toEqual({ cap: 0, thuyen: false, linh: { giao: 0, cung: 0, voi: 0, no: 0 }, muon: { giao: 0, cung: 0, voi: 0, no: 0 }, chuyen: null });
    const bad = JSON.parse(serialize(s));
    bad.dao.hoangSa.cap = 9;
    expect(deserialize(JSON.stringify(bad))).toBe(undefined);
  });

  it('bến ván và đường đi không đụng tới lưới kinh đô', () => {
    for (const q of QUAN_DAO) expect(daoBen(q).x + daoBen(q).z).toBeGreaterThan(RIVER_START * 2);
    expect(quanDao('hoangSa').x).toBeGreaterThan(76);
  });
});
