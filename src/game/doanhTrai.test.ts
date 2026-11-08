import { describe, expect, it } from 'vitest';
import { isHero, startBattle } from './battle';
import { canStartStage, startStage } from './campaign';
import { BUILDINGS, CH4_QUEST_START, CH5_QUEST_START, DEFAULT_ROWS, DOANH_MAX, FIELD_CAP, GIFT_IDS, GUARD_CAP, RESOURCE_IDS, UNITS, type UnitType } from './defs';
import {
  GATE_IN,
  armySpace,
  autoGuard,
  barracksOf,
  canGuard,
  doanhCount,
  fieldCap,
  fitArmy,
  gates,
  gateToward,
  generals,
  guardCap,
  guardManual,
  guardPlan,
  reserve,
  setGuard,
} from './doanhTrai';
import { canPlace, canTrain, createInitialState, limitOf, place, troopCap, type Building, type GameState } from './game';
import { deserialize, serialize } from './save';
import { edge, setDien } from './testmap';
import { investedCost } from './xepLai';

type Army = Record<UnitType, number>;

/** Kinh đô Điện `level`, đủ tiền, đủ dân. Chưa có doanh trại. */
function city(level = 5): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.resources = { gao: 50000, voOc: 50000, datDa: 50000, sat: 20000, go: 20000 };
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

/** Dựng doanh trại ở góc vùng đất (hay ở `at`), lên cấp `level` (không quá cấp Điện). */
function barracks(s: GameState, level = 5, at = { x: edge(dienOf(s), 1), z: edge(dienOf(s), 1) }): Building {
  const r = place(s, 'doanhTrai', at.x, at.z);
  if (!r.ok) throw new Error(r.reason);
  r.value.level = Math.min(level, dienOf(s));
  return r.value;
}
const dienOf = (s: GameState) => s.buildings.find((b) => b.type === 'dien')!.level;

/** Tâm sân doanh trại. */
const center = (b: Building) => ({ x: b.x + BUILDINGS.doanhTrai.w / 2, z: b.z + BUILDINGS.doanhTrai.d / 2 });

describe('một doanh trại, mỗi tướng một doanh', () => {
  it('cả kinh đô chỉ dựng một doanh trại 8×8, có thêm tướng cũng vậy', () => {
    expect(BUILDINGS.doanhTrai.w).toBe(8);
    expect(BUILDINGS.doanhTrai.d).toBe(8);
    const s = city();
    expect(limitOf(s, 'doanhTrai')).toBe(1);
    barracks(s);
    expect(canPlace(s, 'doanhTrai', edge(5, 10), edge(5, 1))).toEqual({ ok: false, reason: 'datGioiHan' });
    giongReady(s);
    sonJoined(s);
    expect(limitOf(s, 'doanhTrai')).toBe(1);
    expect(canPlace(s, 'doanhTrai', edge(5, 10), edge(5, 1))).toEqual({ ok: false, reason: 'datGioiHan' });
    expect(limitOf(city(1), 'doanhTrai')).toBe(0);
  });

  it('mỗi tướng đã về là một doanh, thêm chỗ quân theo cấp trại; tối đa năm doanh', () => {
    const s = city(8);
    const b = barracks(s);
    expect(doanhCount(s)).toBe(1);
    expect(troopCap(s)).toBe(38);
    giongReady(s);
    expect(troopCap(s)).toBe(76);
    sonJoined(s);
    s.adv.no = true;
    expect(troopCap(s)).toBe(152);
    // Thắng màn 25 ở chương 4: Cao Lỗ cầm quân, doanh thứ năm.
    s.questIndex = CH4_QUEST_START;
    s.campaign.cleared = 25;
    expect(doanhCount(s)).toBe(DOANH_MAX);
    expect(troopCap(s)).toBe(190);
    // Hai Bà ở chương 5 cũng ở trại, nhưng không quá năm doanh.
    s.questIndex = CH5_QUEST_START;
    expect(generals(s)).toHaveLength(7);
    expect(troopCap(s)).toBe(190);
    // Trại cấp thấp: chỗ mỗi doanh theo cấp.
    b.level = 2;
    expect(troopCap(s)).toBe(5 * 14);
  });

  it('Gióng về trời, Sơn Tinh về núi rồi vẫn là một doanh', () => {
    const s = city(6);
    giongReady(s);
    sonJoined(s);
    barracks(s);
    s.giong.ascended = true;
    s.son.won = true;
    expect(troopCap(s)).toBe(3 * 38);
  });

  it('luyện quân tới chỗ của cả trại', () => {
    const s = city();
    giongReady(s);
    barracks(s);
    expect(place(s, 'traiGiao', edge(5, 1), edge(5, 10)).ok).toBe(true);
    s.troops.giao = 75;
    expect(canTrain(s, 'giao').ok).toBe(true);
    s.troops.giao = 76;
    expect(canTrain(s, 'giao')).toEqual({ ok: false, reason: 'datGioiHanQuan' });
  });
});

describe('phó bản mang tối đa 38 chỗ', () => {
  it('số chỗ mang theo theo cấp Điện, bằng sức chứa một doanh ở cấp trại cao nhất, không quá 38', () => {
    expect(FIELD_CAP.slice(1, 5)).toEqual(BUILDINGS.doanhTrai.troopCap!.slice(1, 5));
    expect(Math.max(...FIELD_CAP)).toBe(38);
  });

  it('nhiều doanh vẫn chỉ mang 38 chỗ ra một trận', () => {
    const s = city();
    giongReady(s);
    barracks(s);
    s.troops = { giao: 40, cung: 12, voi: 8, no: 0 };
    expect(fieldCap(s)).toBe(38);
    expect(canStartStage(s, 1).ok).toBe(true);
    expect(startStage(s, 1, { giao: 15, cung: 12, voi: 4, no: 0 }, DEFAULT_ROWS)).toEqual({ ok: false, reason: 'quaChoPhoBan' });
    expect(startStage(s, 1, { giao: 14, cung: 12, voi: 4, no: 0 }, DEFAULT_ROWS).ok).toBe(true);
  });

  it('chương 1: hai doanh ở trại cấp 3 vẫn chỉ mang 20 chỗ như một doanh', () => {
    const s = city(3);
    giongReady(s);
    barracks(s, 3);
    expect(troopCap(s)).toBe(40);
    s.troops = { giao: 40, cung: 0, voi: 0, no: 0 };
    expect(startStage(s, 1, { giao: 21, cung: 0, voi: 0, no: 0 }, DEFAULT_ROWS)).toEqual({ ok: false, reason: 'quaChoPhoBan' });
    expect(startStage(s, 1, { giao: 20, cung: 0, voi: 0, no: 0 }, DEFAULT_ROWS).ok).toBe(true);
  });

  it('chọn bớt quân cho vừa chỗ, giữ tỉ lệ binh chủng', () => {
    const pick = fitArmy({ giao: 40, cung: 20, voi: 10, no: 0 }, 38);
    expect(armySpace(pick)).toBeLessThanOrEqual(38);
    expect(armySpace(pick)).toBeGreaterThanOrEqual(36);
    expect(pick.giao).toBeGreaterThan(pick.cung);
    expect(pick.voi).toBeGreaterThan(0);
    expect(fitArmy({ giao: 5, cung: 2, voi: 1, no: 0 }, 38)).toEqual({ giao: 5, cung: 2, voi: 1, no: 0 });
  });
});

describe('bố trí giữ kinh đô', () => {
  /** Kinh đô Điện 5, doanh trại cấp 5 có hai doanh (Lạc tướng, Gióng), nhiều lính. */
  function camp(troops: Army = { giao: 40, cung: 20, voi: 6, no: 0 }) {
    const s = city();
    giongReady(s);
    const b = barracks(s);
    s.troops = { ...troops };
    return { s, b };
  }

  it('số chỗ giữ kinh đô theo cấp Điện: tới Điện 5 như trước, rồi thêm dần', () => {
    expect(GUARD_CAP.slice(0, 5)).toEqual(FIELD_CAP.slice(0, 5));
    for (let i = 5; i < GUARD_CAP.length; i++) expect(GUARD_CAP[i]).toBeGreaterThan(GUARD_CAP[i - 1]);
  });

  it('bố trí tự động: giữ kinh đô tới đủ chỗ, giữ tỉ lệ binh chủng, còn lại là quân dự trữ', () => {
    const { s } = camp();
    expect(guardManual(s)).toBe(false);
    const plan = guardPlan(s);
    expect(armySpace(plan)).toBeLessThanOrEqual(guardCap(s));
    expect(armySpace(plan)).toBeGreaterThanOrEqual(guardCap(s) - 2);
    expect(plan.giao && plan.cung && plan.voi).toBeTruthy();
    const left = reserve(s);
    for (const k of ['giao', 'cung', 'voi'] as const) expect(left[k] + plan[k]).toBe(s.troops[k]);
    // Trận giữ kinh đô: đúng số lính bố trí ra trận.
    const battle = startBattle(s, 1, 'bac');
    const ours = battle.fighters.filter((f) => f.side === 'ta' && !isHero(f.kind));
    expect(ours.length).toBe(plan.giao + plan.cung + plan.voi);
  });

  it('ít lính: mọi lính giữ kinh đô như trước', () => {
    const s = city(2);
    barracks(s, 2);
    s.troops = { giao: 6, cung: 0, voi: 0, no: 0 };
    expect(guardPlan(s)).toEqual({ giao: 6, cung: 0, voi: 0, no: 0 });
    const battle = startBattle(s, 1, 'bac');
    expect(battle.fighters.filter((f) => f.side === 'ta').length).toBe(6);
  });

  it('tự bố trí: bấm − + giữ nguyên bố trí tự động rồi đổi; Bố trí tự động thì quay về', () => {
    const { s } = camp({ giao: 20, cung: 4, voi: 0, no: 0 });
    const before = guardPlan(s);
    expect(setGuard(s, 'giao', -1).ok).toBe(true);
    expect(guardManual(s)).toBe(true);
    expect(guardPlan(s)).toEqual({ ...before, giao: before.giao - 1 });
    while (canGuard(s, 'cung', -1).ok) setGuard(s, 'cung', -1);
    expect(canGuard(s, 'cung', -1)).toEqual({ ok: false, reason: 'khongDuQuan' });
    expect(reserve(s).cung).toBe(4);
    const battle = startBattle(s, 1, 'bac');
    expect(battle.fighters.filter((f) => f.side === 'ta' && f.kind === 'cung')).toEqual([]);
    autoGuard(s);
    expect(guardManual(s)).toBe(false);
    expect(guardPlan(s)).toEqual(before);
  });

  it('không bố trí quá số lính đang có, quá số chỗ giữ kinh đô', () => {
    const { s } = camp({ giao: 60, cung: 0, voi: 0, no: 0 });
    while (canGuard(s, 'giao', 1).ok) setGuard(s, 'giao', 1);
    expect(armySpace(guardPlan(s))).toBe(guardCap(s));
    expect(canGuard(s, 'giao', 1)).toEqual({ ok: false, reason: 'quaChoGiuThanh' });
    expect(reserve(s).giao).toBe(60 - guardCap(s));
    s.troops.giao = guardCap(s);
    expect(canGuard(s, 'giao', 1)).toEqual({ ok: false, reason: 'khongDuQuan' });
    expect(canGuard(city(), 'giao', 1)).toEqual({ ok: false, reason: 'canDoanhTrai' });
  });

  it('lính giữ kinh đô chết thì quân dự trữ bù vào; hết dự trữ thì ra số còn lại', () => {
    const { s } = camp({ giao: 30, cung: 0, voi: 0, no: 0 });
    setGuard(s, 'giao', -1);
    const want = barracksOf(s)!.guard!.giao;
    s.troops.giao = want + 5;
    expect(guardPlan(s).giao).toBe(want);
    s.troops.giao = 7;
    expect(guardPlan(s).giao).toBe(7);
  });
});

describe('cổng doanh trại', () => {
  it('cấp 1–2 chỉ có cổng trước; từ cấp 3 bốn cổng giữa bốn mặt, theo hướng xoay, ngay trong mép móng', () => {
    const s = city();
    const b = barracks(s, 2);
    const c = center(b);
    const half = BUILDINGS.doanhTrai.d / 2 - GATE_IN;
    const round = (v: number) => Math.round(v * 1000) / 1000 + 0;
    const local = () => gates(b).map((g) => ({ x: round(g.x - c.x), z: round(g.z - c.z), out: { x: g.out.x + 0, z: g.out.z + 0 } }));
    expect(local()).toEqual([{ x: 0, z: half, out: { x: 0, z: 1 } }]);
    b.level = 3;
    expect(local()).toEqual([
      { x: 0, z: half, out: { x: 0, z: 1 } },
      { x: 0, z: -half, out: { x: 0, z: -1 } },
      { x: -half, z: 0, out: { x: -1, z: 0 } },
      { x: half, z: 0, out: { x: 1, z: 0 } },
    ]);
    // Xoay một nấc: cổng trước quay sang +x.
    b.rot = 1;
    expect(gates(b)[0].x - c.x).toBeCloseTo(half);
    expect(gates(b)[0].z - c.z).toBeCloseTo(0);
    expect(gates(b)[0].out.x).toBe(1);
    expect(gates(b)[0].out.z).toBeCloseTo(0);
  });

  it('cổng gần điểm cần tới nhất; trại chưa có lầu cổng thì luôn ra cổng trước', () => {
    const s = city();
    const b = barracks(s, 5);
    const c = center(b);
    const [front, back, left, right] = gates(b);
    expect(gateToward(b, { x: c.x + 1, z: c.z - 20 })).toEqual(back);
    expect(gateToward(b, { x: c.x - 20, z: c.z + 2 })).toEqual(left);
    expect(gateToward(b, { x: c.x + 20, z: c.z })).toEqual(right);
    expect(gateToward(b, { x: c.x, z: c.z + 20 })).toEqual(front);
    b.level = 2;
    expect(gateToward(b, { x: c.x, z: c.z - 20 })).toEqual(gates(b)[0]);
  });

  it('giữ kinh đô: lính và tướng ra từ cổng gần giặc nhất (tâm các toán giặc lúc trận mở), dàn trong cổng', () => {
    const s = city();
    giongReady(s);
    const b = barracks(s, 5, { x: 28, z: edge(5, 1) });
    s.troops = { giao: 20, cung: 10, voi: 0, no: 0 };
    const hero = { kind: 'giong' as const, bamboo: false, glow: false, non: false };
    for (const side of ['bac', 'tay'] as const) {
      const battle = startBattle(s, 6, side, { hero });
      const foes = battle.fighters.filter((f) => f.side === 'giac');
      const gate = gateToward(b, { x: foes.reduce((n, f) => n + f.x, 0) / foes.length, z: foes.reduce((n, f) => n + f.z, 0) / foes.length });
      const ours = battle.fighters.filter((f) => f.side === 'ta');
      expect(ours.length, side).toBe(31);
      for (const f of ours) {
        expect(Math.hypot(f.x - gate.x, f.z - gate.z), `${side} ${f.kind}`).toBeLessThan(1.8);
        // Còn trên móng trại (không rơi ra ngoài tường).
        expect(f.x >= b.x && f.x <= b.x + 8 && f.z >= b.z && f.z <= b.z + 8, `${side} ${f.kind}`).toBe(true);
      }
      const giong = ours.find((f) => f.kind === 'giong')!;
      expect(giong.x).toBeCloseTo(gate.x);
      expect(giong.z).toBeCloseTo(gate.z);
    }
  });

  it('chưa có doanh trại thì không lính nào ra giữ kinh đô, tướng ra từ trước Điện', () => {
    const s = city();
    s.troops = { giao: 10, cung: 0, voi: 0, no: 0 };
    const hero = { kind: 'giong' as const, bamboo: false, glow: false, non: false };
    const battle = startBattle(s, 1, 'bac', { hero });
    expect(battle.fighters.filter((f) => f.side === 'ta').map((f) => f.kind)).toEqual(['giong']);
    expect(reserve(s).giao).toBe(10);
  });
});

describe('bản lưu', () => {
  it('lưu rồi đọc lại giữ bố trí; bố trí hỏng thì từ chối', () => {
    const s = city();
    barracks(s);
    s.troops = { giao: 30, cung: 6, voi: 0, no: 0 };
    setGuard(s, 'cung', -1);
    const back = deserialize(serialize(s))!;
    expect(back).toBeDefined();
    expect(guardPlan(back)).toEqual(guardPlan(s));
    const bad = JSON.parse(serialize(s));
    bad.buildings.find((x: Building) => x.type === 'doanhTrai').guard.giao = -3;
    expect(deserialize(JSON.stringify(bad))).toBeUndefined();
    expect(UNITS.voi.space).toBe(3);
  });

  it('nâng bản lưu 25: các trại nhập làm một trại cấp cao nhất, nới móng 8×8 giữ mép trước; trại thừa, tường vướng hoàn của; công trình vướng dời đi; nơi ở 4×4', () => {
    const s = city();
    const raw = JSON.parse(serialize(s));
    raw.version = 25;
    let id = raw.nextId;
    const add = (type: string, x: number, z: number, level = 1, extra: object = {}) => {
      const b = { id: id++, type, x, z, level, workers: 0, ...extra };
      raw.buildings.push(b);
      return b;
    };
    // Trại cũ 4×4: A cấp 5 dựng trước, B cấp 5, C cấp 3; tướng, nữ tướng đã giao; A và C có bố trí tay.
    const a = add('doanhTrai', 20, 20, 5, { tuong: 'giong', guard: { giao: 3, cung: 0, voi: 0, no: 0 } });
    add('doanhTrai', 26, 20, 5, { tuong: 'lacTuong', nuTuong: 'leChan' });
    add('doanhTrai', 14, 26, 3, { guard: { giao: 2, cung: 1, voi: 0, no: 0 } });
    // Kho, đoạn lũy sau trại A (chỗ móng mới lấn tới), trại giáo 3×3 ở góc.
    const kho = add('kho', 20, 17, 2);
    add('luy', 23, 17);
    const giao = add('traiGiao', 14, 14);
    raw.nextId = id;
    const before = { ...raw.resources };
    const back = deserialize(JSON.stringify(raw))!;
    expect(back).toBeDefined();
    const camps = back.buildings.filter((b) => b.type === 'doanhTrai');
    expect(camps).toHaveLength(1);
    // Giữ trại A: mép trước (z + 4) như cũ, nới hai ô mỗi bên và bốn ô về phía sau.
    expect(camps[0]).toMatchObject({ id: a.id, level: 5, x: 18, z: 16, guard: { giao: 5, cung: 1, voi: 0, no: 0 } });
    expect(camps[0]).not.toHaveProperty('tuong');
    expect(back.buildings.some((b) => 'nuTuong' in b || 'tuong' in b)).toBe(false);
    // Trại giáo 3×3 nới 4×4, giữ mép trước.
    expect(back.buildings.find((b) => b.id === giao.id)).toMatchObject({ type: 'traiGiao', x: 14, z: 13 });
    // Kho bị móng mới đè: dời sang chỗ trống, giữ cấp.
    const k = back.buildings.find((b) => b.id === kho.id)!;
    expect(k.level).toBe(2);
    const over = (p: Building, q: Building) =>
      p.x < q.x + BUILDINGS[q.type].w && p.x + BUILDINGS[p.type].w > q.x && p.z < q.z + BUILDINGS[q.type].d && p.z + BUILDINGS[p.type].d > q.z;
    expect(over(k, camps[0])).toBe(false);
    // Đoạn lũy vướng thì dỡ; hai trại thừa và đoạn lũy được hoàn đủ của.
    expect(back.buildings.some((b) => b.type === 'luy')).toBe(false);
    const want: Record<string, number> = {};
    for (const c of [investedCost({ type: 'doanhTrai', level: 5 }), investedCost({ type: 'doanhTrai', level: 3 }), BUILDINGS.luy.buildCost]) {
      for (const r of RESOURCE_IDS) want[r] = (want[r] ?? 0) + (c[r] ?? 0);
    }
    for (const r of RESOURCE_IDS) expect(back.resources[r] - before[r], r).toBe(want[r]);
    expect(back.relaid).toMatchObject({ dropped: 3, trai: true });
  });
});
