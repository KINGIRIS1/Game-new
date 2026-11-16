// Canh đóng đảo (Điện 10, `dao.ts`): thuyền chiến đóng ở bến thuyền khơi cấp 3, bến nào chở quân ra quần đảo bến ấy
// đánh cá; đồn đảo ba cấp dựng bằng tốp thợ; lính đóng rời kinh đô theo từng chuyến thuyền (lúc vắng thuyền vẫn chạy),
// vẫn ăn gạo; đồn giữ biển thì ngư trường làm ra thêm, thủy quân Hán được báo sớm, lâu thuyền vào tới sông đã sứt máu;
// nhiệm vụ 63–66; Lạc hầu gợi ý. Giặc đánh đảo (PR 3): lịch các đợt (đứng khi có trận, không có lúc vắng, hai đảo so
// le), trận cầm cự tự đánh, xem lại ra y hệt, đồn hư và sửa, Lê Chân đốc thủy quân, độ khó theo chuẩn, nhiệm vụ 67;
// bản lưu 28, 29.

import { describe, expect, it } from 'vitest';
import { DON_DAO_W, QUAN_DAO, daoBen, daoGoc, daoVao, donDaoCong, donDaoGoc, donDaoHuong, inDaoLoi, inDonDao, onDaoChinh, onIsland, quanDao, warRoute, isWater } from './bien';
import { CH5_QUEST_START, DAO_GIAC, DON_DAO, ENEMIES, GIFT_IDS, NU_TUONG_BONUS, QUESTS, THUYEN_CHIEN, UNITS, UNIT_TYPES, daoCua, type UnitType } from './defs';
import { startFieldBattle } from './battle';
import { MA_VIEN_AT } from './chuong5';
import {
  baoDao,
  benOf,
  canDon,
  canThuyen,
  chanThuyen,
  chayTranDao,
  daoArmy,
  daoJobId,
  giuBien,
  setupDao,
  suaDon,
  suaDonCost,
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

  it('cổng đồn quay về phía thuyền tới, bến ván thẳng trước cổng, cầu ván chạy trên đất ngoài khoảnh đồn', () => {
    for (const q of QUAN_DAO) {
      const h = donDaoHuong(q);
      expect(Math.abs(h.x) + Math.abs(h.z), q.id).toBe(1);
      const c = donDaoCong(q);
      const b = daoBen(q);
      // Bến ván thẳng trước cổng, cách cổng vài ô.
      expect((b.x - c.x) * h.z - (b.z - c.z) * h.x, q.id).toBeCloseTo(0, 6);
      const far = (b.x - c.x) * h.x + (b.z - c.z) * h.z;
      expect(far, q.id).toBeGreaterThan(1.5);
      expect(far, q.id).toBeLessThan(7);
      // Ô dưới cầu ván không lẫn vào khoảnh đồn, và có ô dưới cầu.
      const o = donDaoGoc(q);
      let loi = 0;
      for (let j = 0; j < 20; j++) {
        for (let i = 0; i < 20; i++) {
          if (!inDaoLoi(q, i, j)) continue;
          loi++;
          expect(inDonDao(q, i, j), `${q.id} ${i},${j}`).toBe(false);
        }
      }
      expect(loi, q.id).toBeGreaterThan(0);
      // Cổng ở giữa một cạnh khoảnh đồn.
      const g = daoGoc(q);
      const cx = g.x + o.i + DON_DAO_W / 2;
      const cz = g.z + o.j + DON_DAO_W / 2;
      expect(Math.hypot(c.x - cx, c.z - cz), q.id).toBeCloseTo(DON_DAO_W / 2, 6);
    }
  });

  it('thuyền chiến từ ngư trường rẽ ra trước bến ván rồi vào bến, không đi qua đảo nào', () => {
    for (const [k, q] of QUAN_DAO.entries()) {
      const path = warRoute({ x: 0, z: 49, type: 'benKhoi' }, k).path;
      expect(path.at(-2), q.id).toEqual(daoVao(q));
      for (let n = path.length - 3; n < path.length - 1; n++) {
        const a = path[n];
        const b = path[n + 1];
        for (let t = 0; t <= 1; t += 0.01) {
          const x = a.x + (b.x - a.x) * t;
          const z = a.z + (b.z - a.z) * t;
          expect(onIsland(x, z), `${q.id} đoạn ${n} ${x.toFixed(1)},${z.toFixed(1)}`).toBe(null);
        }
      }
    }
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

  it('bản lưu 29 giữ đồn, thuyền, lính đóng, chuyến đang đi và việc xây đồn; bản lưu 27 lên 29 chưa có gì ngoài đảo', () => {
    const s = withFort(1);
    setDaoLinh(s, 'hoangSa', 'giao', 12);
    startDon(s, 'hoangSa');
    const back = deserialize(serialize(s))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(29);
    expect(back.dao).toEqual(s.dao);
    expect(jobOf(back, daoJobId('hoangSa'))?.o[0].dao).toBe('hoangSa');
    const old = JSON.parse(serialize(createInitialState(0)));
    old.version = 27;
    delete old.dao;
    const up = deserialize(JSON.stringify(old))!;
    expect(up.version).toBe(SAVE_VERSION);
    const giac = { hu: false, dot: 0, thang: 0, sau: null, tran: null };
    expect(up.dao.hoangSa).toEqual({ cap: 0, thuyen: false, linh: { giao: 0, cung: 0, voi: 0, no: 0 }, muon: { giao: 0, cung: 0, voi: 0, no: 0 }, chuyen: null, ...giac });
    const bad = JSON.parse(serialize(s));
    bad.dao.hoangSa.cap = 9;
    expect(deserialize(JSON.stringify(bad))).toBe(undefined);
  });

  it('bến ván và đường đi không đụng tới lưới kinh đô', () => {
    for (const q of QUAN_DAO) expect(daoBen(q).x + daoBen(q).z).toBeGreaterThan(RIVER_START * 2);
    expect(quanDao('hoangSa').x).toBeGreaterThan(76);
  });
});

// ---------- Giặc đánh đảo (PR 3) ----------

const Z = { giao: 0, cung: 0, voi: 0, no: 0 };
/** Quân mẫu chương 5 thu nhỏ theo chỗ đồn: 12, 6, 30, 15 chỗ quân. */
const A12 = { giao: 4, cung: 3, voi: 1, no: 1 };
const A6 = { giao: 2, cung: 2, voi: 0, no: 1 };
const A30 = { giao: 9, cung: 8, voi: 3, no: 2 };
const A15 = { giao: 6, cung: 4, voi: 1, no: 1 };

/** Kinh đô có đồn Hoàng Sa cấp `cap`, lính `linh` đã ở đảo; giặc kinh đô không tới (để đo riêng giặc đảo). */
function island(cap: number, linh: typeof A12, maVien = true): GameState {
  const s = withFort(cap, Z);
  s.dao.hoangSa.linh = { ...linh };
  s.dao.hoangSa.muon = { ...linh };
  s.raid.nextAt = Number.MAX_SAFE_INTEGER;
  if (maVien) {
    s.questIndex = CH5_QUEST_START;
    s.campaign.cleared = MA_VIEN_AT;
  }
  return s;
}

/** Cho thời gian chơi trôi từng phút tới khi đảo Hoàng Sa gặp đợt giặc thứ `dot`. */
function toiDot(s: GameState, dot: number): void {
  for (let i = 0; i < 300 && s.dao.hoangSa.dot < dot; i++) tick(s, 60_000);
  expect(s.dao.hoangSa.dot).toBe(dot);
}

describe('Giặc đánh đảo: lịch các đợt', () => {
  it('chưa có Mã Viện thì đảo yên; có rồi thì đợt đầu sau 10 phút, báo trước 3 phút, rồi 40 phút một đợt', () => {
    const s = island(1, A12, false);
    tick(s, 30 * 60_000);
    expect(s.dao.hoangSa.sau).toBe(null);
    s.questIndex = CH5_QUEST_START;
    s.campaign.cleared = MA_VIEN_AT;
    tick(s, 1000);
    expect(s.dao.hoangSa.sau! - s.clock).toBe(DAO_GIAC.dauMs);
    expect(baoDao(s, 'hoangSa')).toBe(null);
    tick(s, DAO_GIAC.dauMs - DAO_GIAC.baoMs);
    expect(baoDao(s, 'hoangSa')).toBe(DAO_GIAC.baoMs);
    tick(s, DAO_GIAC.baoMs);
    expect(s.dao.hoangSa.dot).toBe(1);
    expect(s.dao.hoangSa.tran!.at).toBe(s.clock);
    expect(s.dao.hoangSa.sau! - s.clock).toBe(DAO_GIAC.cachMs);
  });

  it('đồng hồ giặc đảo đứng khi đang có trận; lúc vắng không có giặc; đảo không lính thì không có lịch', () => {
    const s = island(1, A12);
    tick(s, 1000);
    const con = s.dao.hoangSa.sau! - s.clock;
    tick(s, 5 * 60_000, true);
    expect(s.dao.hoangSa.sau! - s.clock).toBe(con);
    s.raid.phase = 'battle';
    tick(s, 60_000);
    s.raid.phase = 'idle';
    expect(s.dao.hoangSa.sau! - s.clock).toBe(con);
    applyOffline(s, 5 * 3600_000);
    expect(s.dao.hoangSa.dot).toBe(0);
    expect(s.dao.hoangSa.sau! - s.clock).toBe(con);
    s.dao.hoangSa.linh = { ...Z };
    tick(s, 1000);
    expect(s.dao.hoangSa.sau).toBe(null);
  });

  it('hai đảo có quân thì các đợt so le ít nhất 15 phút', () => {
    const s = island(1, A12);
    s.dao.truongSa = { ...s.dao.truongSa, cap: 1, thuyen: true, linh: { ...A12 }, muon: { ...A12 } };
    for (let i = 0; i < 180; i++) {
      tick(s, 60_000);
      const [a, b] = [s.dao.hoangSa.sau, s.dao.truongSa.sau];
      if (a !== null && b !== null) expect(Math.abs(a - b)).toBeGreaterThanOrEqual(DAO_GIAC.soLeMs);
    }
    expect(s.dao.hoangSa.dot + s.dao.truongSa.dot).toBeGreaterThanOrEqual(6);
  });
});

describe('Giặc đánh đảo: trận và kết quả', () => {
  it('giữ được đảo: lính tử trận mất hẳn, được gỗ sắt trên thuyền giặc; xem lại ra y hệt', () => {
    const s = island(1, A12);
    s.resources.go = 0;
    s.resources.sat = 0;
    toiDot(s, 1);
    const d = s.dao.hoangSa;
    const t = d.tran!;
    expect(t.thang).toBe(true);
    expect(d.thang).toBe(1);
    expect(d.hu).toBe(false);
    for (const k of UNIT_TYPES) expect(d.linh[k]).toBe(A12[k] - t.mat[k]);
    expect(t.cua).toEqual(daoCua(1));
    expect(s.resources.go).toBeGreaterThanOrEqual(daoCua(1).go!);
    expect(s.resources.sat).toBeGreaterThanOrEqual(daoCua(1).sat!);
    // Xem lại: dựng từ trận đã ghi thì ra y hệt.
    const b = chayTranDao(setupDao('hoangSa', t));
    expect(b.outcome).toBe('win');
    for (const k of UNIT_TYPES) expect(b.lost[k]).toBe(t.mat[k]);
    expect(b.dao).toBe('hoangSa');
    expect(b.holdS).toBe(DAO_GIAC.holdS);
  });

  it('thua thì đồn hư: không giữ biển, không chở lính, không có giặc; sửa tốn 30% giá đồn', () => {
    const s = island(1, A6);
    toiDot(s, 1);
    const d = s.dao.hoangSa;
    expect(d.tran!.thang).toBe(false);
    expect(d.hu).toBe(true);
    expect(armySpace(d.linh)).toBe(0);
    expect(d.tran!.mat).toEqual(A6);
    expect(d.sau).toBe(null);
    // Đồn hư: không giữ biển dù có lính, không chở lính ra, không nâng cấp.
    s.troops = { ...A12 };
    d.muon = { ...A12 };
    tick(s, 60_000);
    expect(d.chuyen).toBe(null);
    d.linh = { ...A12 };
    expect(giuBien(s, 'hoangSa')).toBe(0);
    expect(canDon(s, 'hoangSa')).toEqual({ ok: false, reason: 'donDaoHu' });
    tick(s, 60 * 60_000);
    expect(d.dot).toBe(1);
    // Sửa: 30% giá dựng đồn cấp 1.
    const cost = suaDonCost(s, 'hoangSa');
    expect(cost.gao).toBe(Math.round((DON_DAO.cost[0].gao! * 0.3) / 5) * 5);
    const gao = s.resources.gao;
    expect(suaDon(s, 'hoangSa').ok).toBe(true);
    expect(s.resources.gao).toBe(gao - cost.gao!);
    expect(d.hu).toBe(false);
    expect(giuBien(s, 'hoangSa')).toBe(1);
    expect(suaDon(s, 'hoangSa')).toEqual({ ok: false, reason: 'khongHuHong' });
    tick(s, 1000);
    expect(d.sau).not.toBe(null);
  });

  it('Lê Chân đốc thủy quân: lính đảo mọi binh chủng được cộng, lính nỏ không cộng hai lần, không cầm cờ trên bãi', () => {
    const base = { dot: 1, cap: 1, linh: { giao: 1, cung: 1, voi: 1, no: 1 }, arms: Z };
    const khong = startFieldBattle(setupDao('hoangSa', { ...base, leChan: false }));
    const co = startFieldBattle(setupDao('hoangSa', { ...base, leChan: true }));
    for (const k of UNIT_TYPES) {
      const hp = (b: typeof co) => b.fighters.find((f) => f.side === 'ta' && f.kind === k)!.maxHp;
      expect(hp(co) / hp(khong), k).toBeCloseTo(1 + NU_TUONG_BONUS, 6);
    }
    expect(co.fighters.filter((f) => f.side === 'ta').every((f) => f.nu)).toBe(true);
    expect(co.nuTuong).toBeUndefined();
    // Đồn cấp 3 cộng thêm 20% máu.
    const cap3 = startFieldBattle(setupDao('hoangSa', { ...base, cap: 3, leChan: false }));
    const giao = (b: typeof co) => b.fighters.find((f) => f.side === 'ta' && f.kind === 'giao')!.maxHp;
    expect(giao(cap3) / giao(khong)).toBeCloseTo(1 + DON_DAO.them[2], 6);
  });

  it('độ khó theo chuẩn (hạt giống 1, 2, 3, quân mẫu chương 5, không binh khí, không Lê Chân)', () => {
    const danh = (cap: number, linh: typeof A12, dot: number) =>
      [1, 2, 3].map((seed) => {
        const setup = setupDao('hoangSa', { dot, cap, linh, arms: Z, leChan: false });
        setup.id = seed;
        return chayTranDao(setup).outcome;
      });
    for (const dot of [1, 2, 3]) expect(danh(1, A12, dot), `cấp 1, 12 lính, đợt ${dot}`).toEqual(['win', 'win', 'win']);
    expect(danh(1, A6, 3), 'cấp 1, 6 lính, đợt 3').toEqual(['lose', 'lose', 'lose']);
    expect(danh(3, A30, DAO_GIAC.tran), 'cấp 3, 30 lính, đợt trần').toEqual(['win', 'win', 'win']);
    expect(danh(3, A15, DAO_GIAC.tran), 'cấp 3, 15 lính, đợt trần').toEqual(['lose', 'lose', 'lose']);
    expect(armySpace(A12)).toBe(12);
    expect(armySpace(A6)).toBe(6);
    expect(armySpace(A30)).toBe(30);
    expect(armySpace(A15)).toBe(15);
  });

  it('nhiệm vụ 67: giữ đảo qua một đợt giặc', () => {
    expect(QUESTS.findIndex((q) => q.id === 'giuDao')).toBe(67);
    const s = island(1, A12);
    s.questIndex = 67;
    expect(questProgress(s)).toEqual({ have: 0, need: 1 });
    toiDot(s, 1);
    expect(questProgress(s)).toEqual({ have: 1, need: 1 });
  });

  it('bản lưu giữ trận gần nhất; trận ghi sai dạng thì bản lưu hỏng', () => {
    const s = island(1, A12);
    toiDot(s, 1);
    const back = deserialize(serialize(s))!;
    expect(back.dao).toEqual(s.dao);
    const bad = JSON.parse(serialize(s));
    bad.dao.hoangSa.tran.cap = 0;
    expect(deserialize(JSON.stringify(bad))).toBe(undefined);
    const old = JSON.parse(serialize(s));
    old.version = 28;
    for (const id of ['hoangSa', 'truongSa']) for (const k of ['hu', 'dot', 'thang', 'sau', 'tran']) delete old.dao[id][k];
    const up = deserialize(JSON.stringify(old))!;
    expect(up.dao.hoangSa.linh).toEqual(s.dao.hoangSa.linh);
    expect(up.dao.hoangSa.dot).toBe(0);
    expect(up.dao.hoangSa.tran).toBe(null);
  });
});
