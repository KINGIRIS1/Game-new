// Canh dã ngoại (docs/thiet-ke.md mục Kế hoạch: dã ngoại): bố cục năm map (khu, boss, cổng, lối đi trống, tìm đường),
// đội ba tướng, tự đánh chỉ đánh trong khu và không nhắm boss, quái đuổi xa thì quay về hồi máu, mọc lại; cả đội ngã
// thì về trại; cổng theo cấp; cấp chung chỉ cộng trên map; kinh nghiệm, trần cấp, giảm khi quái thấp cấp; đồ rơi không
// vượt chương đang chơi; boss chờ 30 phút; treo máy dừng ở 8 giờ, ra gần bằng đánh thật; không khóa, không làm tướng
// kiệt sức; nâng bản lưu 28 lên 29.

import { describe, expect, it } from 'vitest';
import { heroSetups, isHero, startFieldBattle, type Battle, type HeroKind } from './battle';
import {
  CH3_QUEST_START,
  DA_BOSS_MS,
  DA_CAP,
  DA_KHU,
  DA_MAP,
  DA_MAP_IDS,
  DA_TREO,
  DEFAULT_ROWS,
  GIFT_IDS,
  STAGES,
  type DaMapId,
} from './defs';
import {
  bossCo,
  canLen,
  capNhatDa,
  chuongRoi,
  congExp,
  dangTreo,
  datDoi,
  doiNay,
  expQuai,
  isDaNgoaiState,
  moMap,
  nhipTreo,
  quaCong,
  tichTreo,
  treoVang,
  tuongCo,
  vaoDa,
} from './daNgoai';
import { boCuc, khuTai, sdCan, timDuong } from './daNgoaiMap';
import { capKhu, chamMap, stepDa, tuongDau } from './daNgoaiTran';
import { applyOffline, createInitialState, type GameState } from './game';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { heroesFor } from './son';
import { SAMPLE_ARMY } from './testkit';
import { kiemMon } from './trangBi';

const DT = 0.05;

/** Kinh đô có Gióng; `them` thêm Sơn Tinh, An Dương Vương cho đội ba tướng. */
function base(them = false): GameState {
  const s = createInitialState(0);
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: true, restUntil: 0, ascended: false };
  if (them) {
    for (const g of GIFT_IDS) s.son.gifts[g] = true;
    s.son.non = true;
    s.adv.no = true;
  }
  return s;
}

/** Đặt đội đứng trong khu `k` của map đang ở (gần mép phía trại). */
function dungKhu(s: GameState, k: number): void {
  const bc = boCuc(s.daNgoai.map);
  const kh = bc.khu[k];
  const l = Math.hypot(bc.trai.x - kh.x, bc.trai.z - kh.z);
  s.daNgoai.cho = { x: kh.x + ((bc.trai.x - kh.x) / l) * kh.r * 0.4, z: kh.z + ((bc.trai.z - kh.z) / l) * kh.r * 0.4 };
}

function chay(s: GameState, b: Battle, giay: number, moi?: () => void): number {
  let giet = 0;
  for (let t = 0; t < giay; t += DT) {
    stepDa(b, DT);
    giet += capNhatDa(s, b).thuong.giet;
    moi?.();
  }
  return giet;
}

describe('bố cục năm map', () => {
  it('mỗi map năm khu, ít nhất năm loại quái và một boss; cổng mở theo cấp', () => {
    for (const id of DA_MAP_IDS) {
      const def = DA_MAP[id];
      const bc = boCuc(id);
      expect(bc.khu).toHaveLength(5);
      expect(new Set(def.quai).size).toBe(5);
      expect(def.quai).not.toContain(def.boss);
      expect(bc.congSau === null).toBe(id === 5);
      expect(def.cong).toBe(id === 1 ? 0 : def.cap[0] - 1);
      expect(capKhu(id, 4)[1]).toBe(def.cap[1]);
    }
  });

  it('lối đi, giữa các khu, trại, cổng không có vật cản; có đường từ trại tới boss và cổng', () => {
    for (const id of DA_MAP_IDS) {
      const bc = boCuc(id);
      expect(bc.can.length).toBeGreaterThan(80);
      for (const p of [bc.trai, bc.congTruoc, bc.boss, ...bc.khu, ...(bc.congSau ? [bc.congSau] : [])]) expect(sdCan(bc, p.x, p.z)).toBeGreaterThan(1);
      for (const to of [bc.boss, bc.congSau ?? bc.congTruoc, ...bc.khu]) expect(timDuong(bc, bc.trai, to)).not.toBeNull();
      // Từ một góc map (sau vật cản) cũng tìm được đường về trại.
      expect(timDuong(bc, { x: 78, z: 78 }, bc.trai)).not.toBeNull();
    }
  });
});

describe('trận trên map', () => {
  it('đội ba tướng: ba thanh máu, đủ kỹ năng của cả ba; không có Trống trận', () => {
    const s = base(true);
    expect(datDoi(s, ['giong', 'sonTinh', 'anDuong']).ok).toBe(true);
    const b = moMap(s);
    expect(heroSetups(b).map((h) => h.kind)).toEqual(['giong', 'sonTinh', 'anDuong']);
    expect(b.fighters.filter((f) => isHero(f.kind))).toHaveLength(3);
    expect(b.skills).toEqual(expect.arrayContaining(['phunLua', 'nhoTre', 'bocDoi', 'doiNon', 'noThan']));
    expect(b.skills).not.toContain('trongTran');
    // Đội tối đa ba tướng, tướng chưa về thì không chọn được.
    expect(datDoi(s, ['giong', 'sonTinh', 'anDuong', 'giong']).ok).toBe(false);
    expect(datDoi(base(), ['sonTinh']).ok).toBe(false);
  });

  it('quái đứng đủ các khu, boss ở khu boss; tự đánh chỉ đánh quái trong khu, không nhắm boss; quái mọc lại', () => {
    const s = base();
    dungKhu(s, 0);
    const b = moMap(s);
    const quai = () => b.fighters.filter((f) => f.side === 'giac' && f.state !== 'dead');
    expect(quai()).toHaveLength(DA_KHU.n.reduce((a, n) => a + n, 0) + 1);
    expect(quai().filter((f) => f.nha!.khu < 0).map((f) => f.kind)).toEqual([DA_MAP[1].boss]);
    const khu: number[] = [];
    chay(s, b, 90, () => {
      for (const g of b.da!.giet) khu.push(g.khu);
    });
    expect(s.daNgoai.giet).toBeGreaterThan(8);
    expect(s.daNgoai.bossGiet).toBe(0);
    expect(s.daNgoai.exp + s.daNgoai.cap).toBeGreaterThan(1);
    // Sau khi hạ, quái của khu mọc lại đủ (20 giây).
    chay(s, b, 0);
    const truoc = quai().filter((f) => f.nha!.khu === 0).length;
    datTuDanhTat(b);
    chay(s, b, 45);
    expect(quai().filter((f) => f.nha!.khu === 0).length).toBeGreaterThanOrEqual(truoc);
    expect(quai().filter((f) => f.nha!.khu === 0).length).toBe(DA_KHU.n[0]);
  });

  it('quái đuổi xa khỏi khu thì quay về chỗ mọc, hồi đủ máu', () => {
    const s = base();
    s.daNgoai.cap = 20;
    s.daNgoai.tuDanh = false;
    dungKhu(s, 0);
    const b = moMap(s);
    const lead = tuongDau(b)!;
    const q = b.fighters.find((f) => f.nha?.khu === 0)!;
    // Đánh trúng một đòn rồi chạy ra xa.
    q.hp -= 10;
    const bc = boCuc(1);
    chamMap(b, bc.congTruoc.x + 2, bc.congTruoc.z - 2);
    let ve = false;
    chay(s, b, 40, () => {
      if (q.nha!.trang === 've') ve = true;
    });
    expect(ve).toBe(true);
    expect(q.nha!.trang).toBe('cho');
    expect(q.hp).toBe(q.maxHp);
    expect(Math.hypot(lead.x - bc.congTruoc.x - 2, lead.z - bc.congTruoc.z + 2)).toBeLessThan(3);
  });

  it('chạm boss thì đánh boss; cả đội ngã thì về trại, đủ máu, không mất kinh nghiệm', () => {
    const s = base();
    s.daNgoai.tuDanh = false;
    const bc = boCuc(1);
    s.daNgoai.cho = { x: bc.boss.x, z: bc.boss.z + bc.boss.r + 2 };
    s.daNgoai.exp = 50;
    const b = moMap(s);
    const boss = b.fighters.find((f) => f.nha?.khu === -1)!;
    expect(chamMap(b, boss.x, boss.z)).toBe('quai');
    let nga = false;
    chay(s, b, 120, () => {
      if (b.da!.nga !== null) nga = true;
    });
    expect(nga).toBe(true);
    const lead = tuongDau(b)!;
    expect(Math.hypot(lead.x - bc.trai.x, lead.z - bc.trai.z)).toBeLessThan(4);
    expect(lead.hp).toBeGreaterThan(lead.maxHp * 0.95);
    expect(s.daNgoai.exp).toBeGreaterThanOrEqual(50);
  });

  it('chạm cổng: đi tới cổng rồi sang map kề khi đủ cấp; chưa đủ thì báo cấp cần', () => {
    const s = base();
    s.daNgoai.tuDanh = false;
    const bc = boCuc(1);
    s.daNgoai.cho = { x: bc.congSau!.x - 4, z: bc.congSau!.z + 4 };
    const b = moMap(s);
    expect(chamMap(b, bc.congSau!.x, bc.congSau!.z)).toBe('cong');
    let r: ReturnType<typeof capNhatDa> | null = null;
    for (let t = 0; t < 20 && !r?.chuaDuCap; t += DT) {
      stepDa(b, DT);
      r = capNhatDa(s, b);
    }
    expect(r!.chuaDuCap).toBe(DA_MAP[2].cong);
    expect(quaCong(s, 2).ok).toBe(false);
    s.daNgoai.cap = DA_MAP[2].cong;
    expect(quaCong(s, 2)).toEqual({ ok: true, value: 2 });
    expect(s.daNgoai.map).toBe(2);
    expect(s.daNgoai.xa).toBe(2);
    expect(quaCong(s, 1).ok).toBe(true);
    expect(quaCong(s, 0)).toEqual({ ok: true, value: 'kinhDo' });
    expect(s.daNgoai.dangO).toBe(false);
  });
});

describe('cấp chung, kinh nghiệm, đồ', () => {
  it('lên cấp theo kinh nghiệm, dừng ở trần; quái thấp cấp cho ít kinh nghiệm', () => {
    const s = base();
    expect(canLen(1)).toBe(DA_CAP.len);
    expect(congExp(s, canLen(1) + canLen(2))).toBe(2);
    expect(s.daNgoai.cap).toBe(3);
    congExp(s, 1e12);
    expect(s.daNgoai.cap).toBe(DA_CAP.tran);
    expect(s.daNgoai.exp).toBe(0);
    expect(expQuai(10, 0, 15)).toBe(expQuai(10, 0, 10));
    expect(expQuai(10, 0, 20)).toBeLessThan(expQuai(10, 0, 15));
    expect(expQuai(1, 0, 50)).toBeGreaterThanOrEqual(1);
    expect(expQuai(10, -1, 10)).toBeGreaterThan(expQuai(10, 4, 10) * 10);
  });

  it('cấp chung chỉ cộng trên map: phó bản, tướng ra trận không đổi', () => {
    const a = base(true);
    const b = base(true);
    b.daNgoai.cap = 40;
    expect(heroesFor(b, 1, 1)).toEqual(heroesFor(a, 1, 1));
    const setup = (s: GameState) =>
      startFieldBattle({ id: 1, stage: 1, enemies: STAGES[0].enemies, hpScale: 1, army: SAMPLE_ARMY, rows: DEFAULT_ROWS, hero: heroesFor(s, 1, 1)[0] });
    expect(setup(b).fighters.map((f) => f.maxHp)).toEqual(setup(a).fighters.map((f) => f.maxHp));
    // Trên map thì tướng cấp cao bền hơn.
    const hp = (s: GameState) => tuongDau(moMap(s))!.maxHp;
    expect(hp(b)).toBeGreaterThan(hp(a) * 2);
  });

  it('đồ rơi ở map xa không vượt chương đang chơi (máy chủ Đấu thành nhận được)', () => {
    const s = base(true);
    expect(chuongRoi(s, 5)).toBe(1);
    s.questIndex = CH3_QUEST_START;
    expect(chuongRoi(s, 5)).toBe(3);
    expect(chuongRoi(s, 2)).toBe(2);
    // Treo lâu ở map 5 khi đang chương 3: mọi món rơi đều hợp luật của chương 3.
    s.daNgoai.map = 5;
    s.daNgoai.cap = 50;
    s.daNgoai.dangO = true;
    dungKhu(s, 0);
    const r = tichTreo(s, 6 * 3_600_000);
    expect(r.mon.length).toBeGreaterThan(5);
    for (const m of r.mon) {
      expect(m.cap).toBeLessThanOrEqual(3);
      expect(kiemMon(m, 3)).toBeNull();
    }
  });

  it('hạ boss: chắc rơi đồ, boss chờ 30 phút chơi mới mọc lại', () => {
    const s = base(true);
    s.daNgoai.cap = 30;
    s.daNgoai.tuDanh = false;
    datDoi(s, ['giong', 'sonTinh', 'anDuong']);
    const bc = boCuc(1);
    s.daNgoai.cho = { x: bc.boss.x, z: bc.boss.z + bc.boss.r + 1.5 };
    const b = moMap(s);
    const boss = b.fighters.find((f) => f.nha?.khu === -1)!;
    chamMap(b, boss.x, boss.z);
    let mon = 0;
    for (let t = 0; t < 120 && !s.daNgoai.bossGiet; t += DT) {
      stepDa(b, DT);
      mon += capNhatDa(s, b).thuong.mon.length;
    }
    expect(s.daNgoai.bossGiet).toBe(1);
    expect(mon + s.trangBi.kho.length).toBeGreaterThan(0);
    expect(bossCo(s, 1)).toBe(false);
    expect(moMap(s).fighters.some((f) => f.nha?.khu === -1)).toBe(false);
    s.clock += DA_BOSS_MS;
    expect(bossCo(s, 1)).toBe(true);
    expect(moMap(s).fighters.some((f) => f.nha?.khu === -1)).toBe(true);
  });
});

describe('treo máy', () => {
  function treo(map: DaMapId, khu: number): GameState {
    const s = base(true);
    s.daNgoai.map = map;
    s.daNgoai.cap = capKhu(map, khu)[0];
    s.daNgoai.dangO = true;
    datDoi(s, ['giong', 'sonTinh', 'anDuong']);
    dungKhu(s, khu);
    return s;
  }

  it('chỉ treo khi đội ở dã ngoại, Tự đánh bật, đứng trong khu quái', () => {
    const s = treo(1, 0);
    expect(dangTreo(s)).toBe(true);
    s.daNgoai.tuDanh = false;
    expect(dangTreo(s)).toBe(false);
    s.daNgoai.tuDanh = true;
    s.daNgoai.cho = { ...boCuc(1).trai };
    expect(dangTreo(s)).toBe(false);
    expect(tichTreo(s, 3_600_000).giet).toBe(0);
    expect(vaoDa(base()).ok).toBe(true);
  });

  it('tích lúc chơi bằng tích một lần; lúc tắt game dừng ở 8 giờ', () => {
    const a = treo(2, 1);
    const b = treo(2, 1);
    for (let i = 0; i < 720; i++) tichTreo(a, 5000);
    tichTreo(b, 3_600_000);
    expect(a.daNgoai.giet).toBe(b.daNgoai.giet);
    expect(a.daNgoai.cap).toBe(b.daNgoai.cap);
    const c = treo(2, 1);
    const d = treo(2, 1);
    expect(treoVang(c, DA_TREO.tran + 5 * 3_600_000).giet).toBe(treoVang(d, DA_TREO.tran).giet);
    // Qua `applyOffline`: lúc tắt game cũng đánh tiếp, có báo phần dã ngoại.
    const e = treo(2, 1);
    e.lastSeen = 0;
    const off = applyOffline(e, 2 * 3_600_000);
    expect(off.da.giet).toBeGreaterThan(100);
    expect(off.da.exp).toBeGreaterThan(0);
  });

  it('treo ra gần bằng đánh thật cùng khu (đội vừa sức khu)', () => {
    for (const [map, khu] of [
      [1, 1],
      [3, 2],
      [5, 0],
    ] as const) {
      const s = treo(map, khu);
      const b = moMap(s);
      let giet = 0;
      const T = 240;
      for (let t = 0; t < T; t += DT) {
        stepDa(b, DT);
        giet += b.da!.giet.filter((g) => g.khu === khu).length;
        capNhatDa(s, b);
        s.daNgoai.cap = capKhu(map, khu)[0];
      }
      const that = (giet / T) * 60;
      const treo1 = nhipTreo(s, khu);
      expect(treo1).toBeGreaterThan(that * 0.5);
      expect(treo1).toBeLessThan(that * 1.3);
    }
  });
});

describe('không khóa tướng, bản lưu', () => {
  it('tướng đang kiệt sức vẫn đi dã ngoại; ngã ở dã ngoại không phải nghỉ', () => {
    const s = base();
    s.giong.restUntil = s.clock + 60_000;
    expect(heroesFor(s, 1, 1)).toEqual([]);
    expect(tuongCo(s)).toEqual(['giong'] as HeroKind[]);
    expect(doiNay(s)).toEqual(['giong']);
    const b = moMap(s);
    expect(tuongDau(b)?.kind).toBe('giong');
    s.giong.restUntil = 0;
    const bc = boCuc(1);
    s.daNgoai.cho = { x: bc.boss.x, z: bc.boss.z + bc.boss.r + 2 };
    s.daNgoai.tuDanh = false;
    const c = moMap(s);
    const boss = c.fighters.find((f) => f.nha?.khu === -1)!;
    chamMap(c, boss.x, boss.z);
    chay(s, c, 60);
    expect(s.giong.restUntil).toBe(0);
  });

  it('bản lưu 28 lên 29: cấp 1, chưa ra dã ngoại; bản lưu 29 giữ cấp, chỗ đứng, đội, giờ boss', () => {
    const s = base(true);
    s.daNgoai.cap = 12;
    s.daNgoai.exp = 345;
    s.daNgoai.map = 2;
    s.daNgoai.dangO = true;
    s.daNgoai.doi = ['sonTinh', 'giong'];
    s.daNgoai.cho = { x: 30.5, z: 40.25 };
    s.daNgoai.boss[1] = 123456;
    const back = deserialize(serialize(s))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.daNgoai).toEqual(s.daNgoai);
    expect(isDaNgoaiState(back.daNgoai)).toBe(true);
    const old = JSON.parse(serialize(createInitialState(0)));
    old.version = 28;
    delete old.daNgoai;
    const up = deserialize(JSON.stringify(old))!;
    expect(up.version).toBe(SAVE_VERSION);
    expect(up.daNgoai.cap).toBe(1);
    expect(up.daNgoai.dangO).toBe(false);
    const bad = JSON.parse(serialize(s));
    bad.daNgoai.doi = ['giong', 'giong', 'giong', 'giong'];
    expect(deserialize(JSON.stringify(bad))).toBeFalsy();
  });

  it('khu đội đứng tính rộng thêm 3 ô quanh khu', () => {
    const bc = boCuc(1);
    const k = bc.khu[2];
    expect(khuTai(bc, k.x + k.r + 2, k.z, 3)).toBe(2);
    expect(khuTai(bc, bc.trai.x, bc.trai.z, 3)).toBe(-1);
  });
});

function datTuDanhTat(b: Battle): void {
  b.da!.tuDanh = false;
  b.da!.tuMuc = null;
}
