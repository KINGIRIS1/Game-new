import { describe, expect, it } from 'vitest';
import { isHero, startBattle } from './battle';
import { canStartStage, startStage } from './campaign';
import { BUILDINGS, DEFAULT_ROWS, FIELD_CAP, GIFT_IDS, GUARD_CAP, UNITS, type UnitType } from './defs';
import {
  armySpace,
  assignCommander,
  autoGuard,
  barracksList,
  canGuard,
  commanderOf,
  fieldCap,
  fitArmy,
  guardCap,
  guardManual,
  guardPlan,
  guardTotal,
  reserve,
  setGuard,
} from './doanhTrai';
import { canPlace, canTrain, createInitialState, limitOf, place, troopCap, type Building, type GameState } from './game';
import { deserialize, serialize } from './save';
import { edge, setDien } from './testmap';

type Army = Record<UnitType, number>;

/** Kinh đô Điện `level`, đủ tiền, đủ dân, có trại giáo. Chưa có doanh trại. */
function city(level = 5): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.resources = { gao: 50000, voOc: 50000, datDa: 50000, sat: 20000 };
  s.dan = 40;
  s.raid.nextAt = null;
  return s;
}

/** Gióng đã thành tráng sĩ. */
const giongReady = (s: GameState) => {
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: false, restUntil: 0, ascended: false };
};
/** Sơn Tinh đã rước Mị Nương. */
const sonJoined = (s: GameState) => {
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
};

/** Dựng doanh trại thứ `i` (0..3) ở hàng trên cùng của vùng đất, lên cấp `level`. */
function barracks(s: GameState, i: number, level = 5): Building {
  const r = place(s, 'doanhTrai', edge(dienOf(s), 1 + 6 * i), edge(dienOf(s), 1));
  if (!r.ok) throw new Error(r.reason);
  r.value.level = Math.min(level, dienOf(s));
  return r.value;
}
const dienOf = (s: GameState) => s.buildings.find((b) => b.type === 'dien')!.level;

/** Tâm sân doanh trại. */
const center = (b: Building) => ({ x: b.x + BUILDINGS.doanhTrai.w / 2, z: b.z + BUILDINGS.doanhTrai.d / 2 });
/** Lính ta trong trận đứng gần doanh trại nào nhất. */
function nearest(list: Building[], x: number, z: number): Building {
  return list.reduce((a, b) => (Math.hypot(center(b).x - x, center(b).z - z) < Math.hypot(center(a).x - x, center(a).z - z) ? b : a));
}

describe('mỗi tướng chỉ huy một doanh trại', () => {
  it('chỉ có Lạc tướng thì dựng một doanh trại; Gióng thành tráng sĩ thì dựng thêm một', () => {
    const s = city();
    expect(limitOf(s, 'doanhTrai')).toBe(1);
    const a = barracks(s, 0);
    expect(commanderOf(s, a)).toBe('lacTuong');
    expect(canPlace(s, 'doanhTrai', edge(5, 7), edge(5, 1))).toEqual({ ok: false, reason: 'canTuongChiHuy' });
    giongReady(s);
    expect(limitOf(s, 'doanhTrai')).toBe(2);
    const b = barracks(s, 1);
    expect(commanderOf(s, b)).toBe('giong');
    // Hai doanh trại cấp 5: 76 chỗ quân.
    expect(troopCap(s)).toBe(76);
  });

  it('đủ bốn tướng thì bốn doanh trại, 152 chỗ quân; không quá bốn', () => {
    const s = city(7);
    giongReady(s);
    sonJoined(s);
    s.adv.no = true;
    for (let i = 0; i < 4; i++) barracks(s, i);
    expect(barracksList(s).map((b) => commanderOf(s, b))).toEqual(['lacTuong', 'giong', 'sonTinh', 'anDuong']);
    expect(troopCap(s)).toBe(152);
    expect(canPlace(s, 'doanhTrai', edge(7, 1), edge(7, 8))).toEqual({ ok: false, reason: 'datGioiHan' });
  });

  it('Gióng về trời, Sơn Tinh về núi rồi vẫn chỉ huy doanh trại', () => {
    const s = city(6);
    giongReady(s);
    sonJoined(s);
    for (let i = 0; i < 3; i++) barracks(s, i);
    s.giong.ascended = true;
    s.son.won = true;
    expect(troopCap(s)).toBe(3 * 38);
  });

  it('giao tướng: tướng đang chỉ huy trại khác thì hai tướng đổi chỗ, sức chứa giữ nguyên', () => {
    const s = city();
    giongReady(s);
    const a = barracks(s, 0);
    const b = barracks(s, 1, 2);
    expect(troopCap(s)).toBe(38 + 14);
    expect(assignCommander(s, a.id, 'giong').ok).toBe(true);
    expect(commanderOf(s, a)).toBe('giong');
    expect(commanderOf(s, b)).toBe('lacTuong');
    expect(troopCap(s)).toBe(38 + 14);
    expect(assignCommander(s, a.id, 'giong')).toEqual({ ok: false, reason: 'daChiHuy' });
    expect(assignCommander(s, a.id, 'sonTinh')).toEqual({ ok: false, reason: 'tuongChuaCo' });
    // Sơn Tinh tới, chưa chỉ huy trại nào: giao cho trại b thì Lạc tướng rảnh, dựng được thêm trại cho Lạc tướng.
    sonJoined(s);
    expect(assignCommander(s, b.id, 'sonTinh').ok).toBe(true);
    expect(commanderOf(s, b)).toBe('sonTinh');
    expect(barracks(s, 2) && commanderOf(s, barracksList(s)[2])).toBe('lacTuong');
  });

  it('luyện quân tới tổng chỗ của mọi doanh trại', () => {
    const s = city();
    giongReady(s);
    barracks(s, 0);
    barracks(s, 1);
    expect(place(s, 'traiGiao', edge(5, 1), edge(5, 7)).ok).toBe(true);
    s.troops.giao = 75;
    expect(canTrain(s, 'giao').ok).toBe(true);
    s.troops.giao = 76;
    expect(canTrain(s, 'giao')).toEqual({ ok: false, reason: 'datGioiHanQuan' });
  });
});

describe('phó bản mang tối đa 38 chỗ', () => {
  it('số chỗ mang theo theo cấp Điện, bằng doanh trại cao nhất dựng được, không quá 38', () => {
    expect(FIELD_CAP.slice(1, 5)).toEqual(BUILDINGS.doanhTrai.troopCap!.slice(1, 5));
    expect(Math.max(...FIELD_CAP)).toBe(38);
  });

  it('nhiều doanh trại vẫn chỉ mang 38 chỗ ra một trận', () => {
    const s = city();
    giongReady(s);
    barracks(s, 0);
    barracks(s, 1);
    s.troops = { giao: 40, cung: 12, voi: 8 };
    expect(fieldCap(s)).toBe(38);
    expect(canStartStage(s, 1).ok).toBe(true);
    expect(startStage(s, 1, { giao: 15, cung: 12, voi: 4 }, DEFAULT_ROWS)).toEqual({ ok: false, reason: 'quaChoPhoBan' });
    expect(startStage(s, 1, { giao: 14, cung: 12, voi: 4 }, DEFAULT_ROWS).ok).toBe(true);
  });

  it('chương 1: hai doanh trại cấp 3 vẫn chỉ mang 20 chỗ như một doanh trại', () => {
    const s = city(3);
    giongReady(s);
    barracks(s, 0, 3);
    barracks(s, 1, 3);
    expect(troopCap(s)).toBe(40);
    s.troops = { giao: 40, cung: 0, voi: 0 };
    expect(startStage(s, 1, { giao: 21, cung: 0, voi: 0 }, DEFAULT_ROWS)).toEqual({ ok: false, reason: 'quaChoPhoBan' });
    expect(startStage(s, 1, { giao: 20, cung: 0, voi: 0 }, DEFAULT_ROWS).ok).toBe(true);
  });

  it('chọn bớt quân cho vừa chỗ, giữ tỉ lệ binh chủng', () => {
    const pick = fitArmy({ giao: 40, cung: 20, voi: 10 }, 38);
    expect(armySpace(pick)).toBeLessThanOrEqual(38);
    expect(armySpace(pick)).toBeGreaterThanOrEqual(36);
    expect(pick.giao).toBeGreaterThan(pick.cung);
    expect(pick.voi).toBeGreaterThan(0);
    expect(fitArmy({ giao: 5, cung: 2, voi: 1 }, 38)).toEqual({ giao: 5, cung: 2, voi: 1 });
  });
});

describe('bố trí giữ kinh đô', () => {
  /** Kinh đô Điện 5, hai doanh trại cấp 5 (Lạc tướng, Gióng), nhiều lính. */
  function twoCamps(troops: Army = { giao: 40, cung: 20, voi: 6 }) {
    const s = city();
    giongReady(s);
    const a = barracks(s, 0);
    const b = barracks(s, 1);
    s.troops = { ...troops };
    return { s, a, b };
  }

  it('số chỗ giữ kinh đô theo cấp Điện: tới Điện 5 như trước, rồi thêm dần', () => {
    expect(GUARD_CAP.slice(0, 5)).toEqual(FIELD_CAP.slice(0, 5));
    for (let i = 5; i < GUARD_CAP.length; i++) expect(GUARD_CAP[i]).toBeGreaterThan(GUARD_CAP[i - 1]);
  });

  it('bố trí tự động: giữ kinh đô tới đủ chỗ, chia ra các doanh trại, còn lại là quân dự trữ', () => {
    const { s, a, b } = twoCamps();
    expect(guardManual(s)).toBe(false);
    const plan = guardPlan(s);
    const total = guardTotal(s, plan);
    expect(armySpace(total)).toBeLessThanOrEqual(guardCap(s));
    expect(armySpace(total)).toBeGreaterThanOrEqual(guardCap(s) - 2);
    // Hai trại bằng sức chứa nên chia gần đều, trại nào cũng có đủ binh chủng.
    for (const id of [a.id, b.id]) {
      const g = plan.get(id)!;
      expect(Math.abs(armySpace(g) - guardCap(s) / 2)).toBeLessThanOrEqual(3);
      expect(g.giao && g.cung && g.voi).toBeTruthy();
    }
    const left = reserve(s);
    for (const k of ['giao', 'cung', 'voi'] as const) expect(left[k] + total[k]).toBe(s.troops[k]);
    // Trận giữ kinh đô: đúng số lính bố trí ra trận, mỗi người ra từ doanh trại của mình.
    const battle = startBattle(s, 1, 'bac');
    const ours = battle.fighters.filter((f) => f.side === 'ta' && !isHero(f.kind));
    expect(ours.length).toBe(total.giao + total.cung + total.voi);
    const fromA = ours.filter((f) => nearest([a, b], f.x, f.z) === a).length;
    expect(fromA).toBe(plan.get(a.id)!.giao + plan.get(a.id)!.cung + plan.get(a.id)!.voi);
  });

  it('một doanh trại, ít lính: mọi lính giữ kinh đô như trước', () => {
    const s = city(2);
    barracks(s, 0, 2);
    s.troops = { giao: 6, cung: 0, voi: 0 };
    expect(guardTotal(s)).toEqual({ giao: 6, cung: 0, voi: 0 });
    const battle = startBattle(s, 1, 'bac');
    expect(battle.fighters.filter((f) => f.side === 'ta').length).toBe(6);
  });

  it('tự bố trí: bấm − + giữ nguyên bố trí tự động rồi đổi; lính ra trận từ trại được bố trí', () => {
    const { s, a, b } = twoCamps({ giao: 20, cung: 0, voi: 0 });
    const before = guardPlan(s);
    expect(setGuard(s, a.id, 'giao', -1).ok).toBe(true);
    expect(guardManual(s)).toBe(true);
    expect(guardPlan(s).get(a.id)!.giao).toBe(before.get(a.id)!.giao - 1);
    expect(guardPlan(s).get(b.id)!.giao).toBe(before.get(b.id)!.giao);
    // Dồn hết về trại b.
    while (canGuard(s, a.id, 'giao', -1).ok) setGuard(s, a.id, 'giao', -1);
    while (canGuard(s, b.id, 'giao', 1).ok) setGuard(s, b.id, 'giao', 1);
    expect(guardPlan(s).get(b.id)!.giao).toBe(20);
    expect(canGuard(s, b.id, 'giao', 1)).toEqual({ ok: false, reason: 'khongDuQuan' });
    const battle = startBattle(s, 1, 'bac');
    const ours = battle.fighters.filter((f) => f.side === 'ta' && !isHero(f.kind));
    expect(ours.length).toBe(20);
    expect(ours.every((f) => nearest([a, b], f.x, f.z) === b)).toBe(true);
    autoGuard(s);
    expect(guardManual(s)).toBe(false);
  });

  it('không bố trí quá sức chứa từng trại, quá số chỗ giữ kinh đô', () => {
    const { s, a, b } = twoCamps({ giao: 60, cung: 0, voi: 0 });
    a.level = 2;
    autoGuard(s);
    while (canGuard(s, b.id, 'giao', -1).ok) setGuard(s, b.id, 'giao', -1);
    while (canGuard(s, a.id, 'giao', 1).ok) setGuard(s, a.id, 'giao', 1);
    expect(guardPlan(s).get(a.id)!.giao).toBe(14);
    expect(canGuard(s, a.id, 'giao', 1)).toEqual({ ok: false, reason: 'traiDay' });
    while (canGuard(s, b.id, 'giao', 1).ok) setGuard(s, b.id, 'giao', 1);
    expect(armySpace(guardTotal(s))).toBe(guardCap(s));
    expect(canGuard(s, b.id, 'giao', 1)).toEqual({ ok: false, reason: 'quaChoGiuThanh' });
    expect(reserve(s).giao).toBe(60 - guardCap(s));
  });

  it('lính giữ kinh đô chết thì quân dự trữ bù vào; hết dự trữ thì trại dựng trước được lính trước', () => {
    const { s, a, b } = twoCamps({ giao: 30, cung: 0, voi: 0 });
    setGuard(s, a.id, 'giao', -1);
    const want = (id: number) => barracksList(s).find((x) => x.id === id)!.guard!.giao;
    const wantA = want(a.id);
    const wantB = want(b.id);
    s.troops.giao = wantA + wantB;
    expect(guardPlan(s).get(a.id)!.giao).toBe(wantA);
    expect(guardPlan(s).get(b.id)!.giao).toBe(wantB);
    s.troops.giao = wantA + 2;
    expect(guardPlan(s).get(a.id)!.giao).toBe(wantA);
    expect(guardPlan(s).get(b.id)!.giao).toBe(2);
  });

  it('tướng ra trận từ doanh trại mình chỉ huy', () => {
    const { s, a, b } = twoCamps();
    const hero = { kind: 'giong' as const, bamboo: false, glow: false, non: false };
    const find = () => startBattle(s, 1, 'bac', { hero }).fighters.find((f) => f.kind === 'giong')!;
    let g = find();
    expect(nearest([a, b], g.x, g.z)).toBe(b);
    assignCommander(s, a.id, 'giong');
    g = find();
    expect(nearest([a, b], g.x, g.z)).toBe(a);
  });

  it('bản lưu giữ tướng chỉ huy và bố trí', () => {
    const { s, a, b } = twoCamps();
    assignCommander(s, a.id, 'giong');
    setGuard(s, b.id, 'voi', -1);
    const back = deserialize(serialize(s))!;
    expect(back).toBeDefined();
    expect(barracksList(back).map((x) => commanderOf(back, x))).toEqual(['giong', 'lacTuong']);
    expect(guardPlan(back)).toEqual(guardPlan(s));
    // Tướng lạ hay bố trí hỏng thì bản lưu bị từ chối.
    const bad = JSON.parse(serialize(s));
    bad.buildings.find((x: Building) => x.id === a.id).tuong = 'trongThuy';
    expect(deserialize(JSON.stringify(bad))).toBeUndefined();
    const bad2 = JSON.parse(serialize(s));
    bad2.buildings.find((x: Building) => x.id === b.id).guard.giao = -3;
    expect(deserialize(JSON.stringify(bad2))).toBeUndefined();
    expect(UNITS.voi.space).toBe(3);
  });
});
