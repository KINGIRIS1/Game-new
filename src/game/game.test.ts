import { describe, expect, it } from 'vitest';
import { BUILDINGS, DAN_GROW_MS, MERCHANT_FIRST_MS, MERCHANT_STAY_MS, OFFLINE_CAP_MS, QUESTS, STORAGE_CAP } from './defs';
import {
  acceptOffer,
  applyOffline,
  autoAssign,
  buildingAt,
  canPlace,
  claimQuest,
  countOf,
  createInitialState,
  dienLevel,
  freeDan,
  housing,
  isStarving,
  makeOffers,
  netPerMinute,
  place,
  productionPerMinute,
  questDone,
  remove,
  setWorkers,
  storageCap,
  tick,
  upgrade,
  type GameState,
} from './game';
import { RIVER_START } from './map';
import { START_KHOANH, isOpen, khoanhLeft } from './khoanh';
import { bank, edge, setDien } from './testmap';

const T0 = 1_000_000;
/** Bìa vùng xây được ở Điện cấp 1 (phía rừng). */
const O = edge(1);

function rich(): GameState {
  const s = createInitialState(T0);
  s.resources = { gao: 400, voOc: 400, datDa: 400, sat: 100 };
  return s;
}

function placeOk(s: GameState, ...args: Parameters<typeof place> extends [GameState, ...infer R] ? R : never) {
  const r = place(s, ...args);
  if (!r.ok) throw new Error(`đặt ${args[0]} thất bại: ${r.reason}`);
  return r.value;
}

describe('trạng thái ban đầu', () => {
  it('có Điện Vua Hùng cấp 1 nằm trong vùng xây được và 4 người dân', () => {
    const s = createInitialState(T0);
    const dien = s.buildings[0];
    expect(dien.type).toBe('dien');
    expect(dienLevel(s)).toBe(1);
    expect(s.dan).toBe(4);
    expect(housing(s)).toBe(4);
    expect(s.khoanh).toEqual([...START_KHOANH]);
    for (let dx = 0; dx < BUILDINGS.dien.w; dx++) {
      expect(isOpen(s, dien.x + dx, dien.z)).toBe(true);
    }
  });
});

describe('đặt công trình', () => {
  it('đặt ruộng trừ đúng giá, chiếm đủ 4×4 ô và tự có người làm', () => {
    const s = rich();
    const r = placeOk(s, 'ruong', O + 1, O + 1);
    expect(s.resources.voOc).toBe(400 - 30);
    expect(buildingAt(s, O + 4, O + 4)?.type).toBe('ruong');
    expect(buildingAt(s, O + 5, O + 1)).toBeUndefined();
    expect(r.workers).toBe(2);
    expect(freeDan(s)).toBe(2);
  });

  it('không cho đặt chồng lên công trình khác', () => {
    expect(canPlace(rich(), 'ruong', O + 4, O + 4)).toEqual({ ok: false, reason: 'datBiChiem' });
  });

  it('không cho đặt ngoài vùng đã mở hoặc xuống sông', () => {
    const s = rich();
    const lo = edge(1);
    expect(canPlace(s, 'luy', lo - 1, O + 8)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canPlace(s, 'luy', RIVER_START, O + 8)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canPlace(s, 'ruong', RIVER_START - 2, O + 8)).toEqual({ ok: false, reason: 'ngoaiVung' });
  });

  it('bến chợ thuyền phải sát bờ sông', () => {
    const s = rich();
    expect(canPlace(s, 'ben', O + 1, O + 1)).toEqual({ ok: false, reason: 'phaiSatSong' });
    expect(canPlace(s, 'ben', bank('ben'), O + 1).ok).toBe(true);
    expect(canPlace(s, 'ben', O + 1, bank('ben')).ok).toBe(true);
  });

  it('báo thiếu tài nguyên', () => {
    const s = createInitialState(T0);
    s.resources.voOc = 3;
    expect(canPlace(s, 'luy', O + 1, O + 1)).toEqual({ ok: false, reason: 'thieuTaiNguyen' });
  });

  it('giới hạn số lượng theo cấp Điện', () => {
    const s = rich();
    s.resources.voOc = 10_000;
    placeOk(s, 'ruong', O, O);
    placeOk(s, 'ruong', O, O + 10);
    expect(canPlace(s, 'ruong', O + 10, O)).toEqual({ ok: false, reason: 'datGioiHan' });
  });

  it('lò rèn cần Điện cấp 2', () => {
    const s = rich();
    expect(canPlace(s, 'loRen', O + 1, O + 1)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 2);
    expect(canPlace(s, 'loRen', O + 1, O + 1).ok).toBe(true);
  });

  it('không tự xây thêm Điện Vua Hùng', () => {
    expect(canPlace(rich(), 'dien', O, O)).toEqual({ ok: false, reason: 'khongTheXay' });
  });

  it('chỉ phá được lũy tre', () => {
    const s = rich();
    const luy = placeOk(s, 'luy', O + 1, O + 1);
    expect(remove(s, luy.id).ok).toBe(true);
    expect(countOf(s, 'luy')).toBe(0);
    expect(remove(s, 1)).toEqual({ ok: false, reason: 'khongTheDo' });
  });
});

describe('nâng cấp', () => {
  it('công trình không được vượt cấp Điện', () => {
    const s = rich();
    const r = placeOk(s, 'ruong', O + 1, O + 1);
    expect(upgrade(s, r.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    s.resources = { gao: 1000, voOc: 1000, datDa: 1000, sat: 100 };
    expect(upgrade(s, 1).ok).toBe(true);
    expect(upgrade(s, r.id).ok).toBe(true);
    expect(r.level).toBe(2);
  });

  it('lũy tre lên thành đất cần Điện cấp 3', () => {
    const s = rich();
    const luy = placeOk(s, 'luy', O + 1, O + 1);
    setDien(s, 2);
    expect(upgrade(s, luy.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 3);
    expect(upgrade(s, luy.id).ok).toBe(true);
    expect(luy.level).toBe(2);
  });

  it('nâng Điện thì được phát thêm khoảnh rừng (đất chưa tự mở)', () => {
    const s = rich();
    const lo1 = edge(1);
    const left = khoanhLeft(s);
    s.resources = { gao: 1000, voOc: 1000, datDa: 1000, sat: 100 };
    upgrade(s, 1);
    expect(canPlace(s, 'luy', lo1 - 1, lo1)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(khoanhLeft(s)).toBeGreaterThan(left);
  });

  it('dừng ở cấp tối đa', () => {
    const s = rich();
    setDien(s, BUILDINGS.dien.maxLevel);
    expect(upgrade(s, 1)).toEqual({ ok: false, reason: 'capToiDa' });
  });

  it('giá nâng Điện luôn vừa sức chứa của cấp hiện tại', () => {
    for (let level = 1; level < BUILDINGS.dien.maxLevel; level++) {
      const cost = BUILDINGS.dien.upgradeCost[level + 1];
      expect(Math.max(...Object.values(cost))).toBeLessThanOrEqual(STORAGE_CAP[level - 1]);
    }
  });

  it('kho thóc tăng sức chứa', () => {
    const s = rich();
    const before = storageCap(s);
    placeOk(s, 'kho', O + 1, O + 1);
    expect(storageCap(s)).toBe(before + BUILDINGS.kho.storage![0]);
  });
});

describe('dân làng', () => {
  it('ruộng thiếu người thì làm ra ít gạo hơn', () => {
    const s = rich();
    const r = placeOk(s, 'ruong', O + 1, O + 1);
    const full = productionPerMinute(s).gao;
    expect(setWorkers(s, r.id, 1).ok).toBe(true);
    expect(productionPerMinute(s).gao).toBeCloseTo(full - BUILDINGS.ruong.production[0].gao! / 2);
    expect(setWorkers(s, r.id, 0).ok).toBe(true);
    expect(productionPerMinute(s).gao).toBe(BUILDINGS.dien.production[0].gao);
  });

  it('không phân công quá số dân rảnh', () => {
    const s = rich();
    s.dan = 1;
    const r = placeOk(s, 'ruong', O + 1, O + 1);
    expect(r.workers).toBe(1);
    expect(setWorkers(s, r.id, 2)).toEqual({ ok: false, reason: 'thieuDan' });
  });

  it('tự phân công chia đều, ưu tiên ruộng', () => {
    const s = rich();
    s.dan = 0;
    const a = placeOk(s, 'ruong', O, O);
    const b = placeOk(s, 'ben', bank('ben'), O + 1);
    s.dan = 2;
    expect(autoAssign(s)).toBe(2);
    expect(a.workers).toBe(1);
    expect(b.workers).toBe(1);
  });

  it('nhà sàn cho thêm chỗ ở, dân tới dần theo thời gian', () => {
    const s = rich();
    placeOk(s, 'nhaSan', O + 1, O + 1);
    expect(housing(s)).toBe(8);
    tick(s, DAN_GROW_MS * 2 + 1);
    expect(s.dan).toBe(6);
    tick(s, DAN_GROW_MS * 10);
    expect(s.dan).toBe(8);
  });

  it('hết gạo thì thiếu ăn: sản xuất chậm một nửa, không sinh thêm dân', () => {
    const s = rich();
    placeOk(s, 'nhaSan', O + 1, O + 1);
    s.resources.gao = 0;
    s.dan = 20;
    expect(isStarving(s)).toBe(true);
    const net = netPerMinute(s);
    expect(net.voOc).toBeCloseTo(BUILDINGS.dien.production[0].voOc! * 0.5);
    tick(s, 60_000);
    expect(s.resources.gao).toBe(0);
    expect(s.dan).toBe(20);
  });
});

describe('dòng thời gian', () => {
  it('sản xuất theo phút (đã trừ gạo ăn) và dừng ở sức chứa', () => {
    const s = createInitialState(T0);
    const net = netPerMinute(s);
    tick(s, 60_000);
    expect(s.resources.gao).toBeCloseTo(150 + net.gao);
    tick(s, 10 * 60 * 60_000);
    expect(s.resources.gao).toBe(STORAGE_CAP[0]);
  });

  it('khi vắng mặt chỉ được một nửa, tối đa 8 giờ, và đồng hồ chơi đứng yên', () => {
    const s = createInitialState(T0);
    s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
    s.resources.gao = 100;
    const net = netPerMinute(s).voOc;
    const r = applyOffline(s, T0 + 10 * 60_000);
    expect(r.gained.voOc).toBeCloseTo(net * 10 * 0.5);
    expect(s.lastSeen).toBe(T0 + 10 * 60_000);
    expect(s.clock).toBe(0);

    const t = createInitialState(T0);
    expect(applyOffline(t, T0 + 3 * OFFLINE_CAP_MS).ms).toBe(OFFLINE_CAP_MS);
  });

  it('không tính thời gian âm khi đồng hồ máy bị lùi', () => {
    const s = createInitialState(T0);
    expect(applyOffline(s, T0 - 5000).ms).toBe(0);
    expect(s.resources.gao).toBe(150);
  });
});

describe('thuyền buôn', () => {
  it('chỉ đến khi đã có bến, đậu một lúc rồi đi', () => {
    const s = rich();
    tick(s, MERCHANT_FIRST_MS + 1000);
    expect(s.merchant.visit).toBeNull();
    placeOk(s, 'ben', bank('ben'), O + 1);
    tick(s, 31_000);
    expect(s.merchant.visit?.offers).toHaveLength(3);
    tick(s, MERCHANT_STAY_MS + 1000);
    expect(s.merchant.visit).toBeNull();
  });

  it('đổi hàng trừ thứ đưa, cộng thứ nhận, mỗi lời mời một lần', () => {
    const s = rich();
    placeOk(s, 'ben', bank('ben'), O + 1);
    tick(s, MERCHANT_FIRST_MS + 1000);
    const offer = s.merchant.visit!.offers[0];
    const give = s.resources[offer.give.r];
    const get = s.resources[offer.get.r];
    expect(acceptOffer(s, 0).ok).toBe(true);
    expect(s.resources[offer.give.r]).toBe(give - offer.give.n);
    expect(s.resources[offer.get.r]).toBe(Math.min(storageCap(s), get + offer.get.n));
    expect(acceptOffer(s, 0)).toEqual({ ok: false, reason: 'daDoi' });
  });

  it('lời mời luôn có lời cho người chơi và không đổi một thứ lấy chính nó', () => {
    for (let seq = 1; seq < 50; seq++) {
      for (const o of makeOffers(seq, 3)) {
        expect(o.give.r).not.toBe(o.get.r);
        expect(o.give.n).toBeGreaterThan(0);
        expect(o.get.n).toBeGreaterThan(0);
      }
    }
    expect(makeOffers(1, 1).every((o) => o.give.r !== 'sat' && o.get.r !== 'sat')).toBe(true);
  });
});

describe('nhiệm vụ Lạc hầu', () => {
  it('đi lần lượt và phát thưởng', () => {
    const s = rich();
    expect(claimQuest(s)).toEqual({ ok: false, reason: 'chuaXong' });
    for (let i = 0; i < 6; i++) place(s, 'luy', O + 1 + i, O + 1);
    expect(questDone(s)).toBe(true);
    const before = s.resources.voOc;
    expect(claimQuest(s).ok).toBe(true);
    expect(s.resources.voOc).toBe(before + (QUESTS[0].reward.voOc ?? 0));
    expect(s.questIndex).toBe(1);
  });
});
