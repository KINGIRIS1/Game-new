// Phù sa: cống đê (chương 2). Cống đóng chặn nước như kè đá, mở thì nước lũ vào sau đê. Ruộng lúa, ruộng nếp chỉ dính
// nước vào qua cống đang mở (nước êm) thì không hư mà được bồi phù sa, làm ra thêm `PHU_SA_BONUS` tới hết mùa lũ sau;
// dính nước tràn qua đê vỡ, cống vỡ hay tràn bờ (nước dữ) thì hư như cũ. Công trình khác trong vùng nước êm hư theo
// sức chịu như lũ thường. Đóng mở cống được cả giữa mùa lũ.

import { describe, expect, it } from 'vitest';
import type { Battle } from './battle';
import { BUILDINGS, CH2_QUEST_START, CH3_QUEST_START, FLOOD_RISE_S, GIFT_IDS, PHU_SA_BONUS, RAID_WARNING_MS } from './defs';
import {
  BATTLE_STEP,
  callRaidNow,
  canPlace,
  createInitialState,
  markHinted,
  move,
  nextHint,
  outputIn,
  phuSaPreview,
  place,
  raiseBuilding,
  setCong,
  slotsOf,
  tick,
  upgrade,
  type Building,
  type GameState,
  type RaidResult,
  type Result,
} from './game';
import { GRID, RIVER_START } from './map';
import { applyMau, mauSlots } from './mau';
import { deserialize, serialize } from './save';
import { bakeRates } from './tet';
import { floodHits, floodMap, floodToleranceOf, groundOf } from './terrain';
import { DIEN, edge, setDien } from './testmap';

/** Hàng (z) và cột (x) đắp đê: cách sông 4 ô, trên đất bậc 1, ngoài là bãi bồi bậc 0. */
const LINE = RIVER_START - 4;
/** Chỗ cống trên dải đê. */
const GATE = { x: DIEN + 2, z: LINE };

function must<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.reason);
  return r.value;
}

const ids = (bs: Building[]) => bs.map((b) => b.id).sort((a, b) => a - b);

/** Kinh đô chương 2, Điện 5, của nhiều, mùa lũ tới được, doanh trại trên đất bậc 2. */
function ch2(): GameState {
  const s = createInitialState(0);
  setDien(s, 5);
  s.questIndex = CH2_QUEST_START;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  s.dan = 60;
  // Chương 1 đã xong (Gióng bay về trời, mở ruộng nếp); Sơn Tinh đủ lễ vật.
  s.giong.ascended = true;
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  const barracks = must(place(s, 'doanhTrai', edge(5, 2), edge(5, 4)));
  expect(groundOf(s, barracks)).toBe(2);
  return s;
}

/** Đê liền một dải dọc hàng và cột `LINE`, bọc kín vùng đất trong đê (như `chuong2.test.ts`). */
function dike(s: GameState): void {
  for (let x = edge(5); x <= LINE; x++) must(place(s, 'de', x, LINE));
  for (let z = edge(5); z < LINE; z++) must(place(s, 'de', LINE, z));
}

/** Ô trong đê bị ngập theo lưới `wet`. */
function inside(wet: Uint8Array): number {
  let n = 0;
  for (let z = edge(5); z < LINE; z++) for (let x = edge(5); x < LINE; x++) n += wet[z * GRID + x];
  return n;
}

/**
 * Kinh đô có đê bao, một cống (đang đóng) và mấy công trình trên đất bậc 1 sau cống: ruộng lúa, ruộng nếp, bãi đất đá,
 * lò rèn (không chịu được nước), nhà sàn (chịu được 1 bậc). Lũ bậc 2 mà nước vào qua cống thì ngập hết chỗ ấy.
 */
function town(s: GameState) {
  dike(s);
  const cong = must(place(s, 'congDe', GATE.x, GATE.z));
  const ruong = must(place(s, 'ruong', DIEN, LINE - 4));
  const baiDa = must(place(s, 'baiDa', DIEN + 5, LINE - 4));
  const loRen = must(place(s, 'loRen', DIEN + 9, LINE - 4));
  const nhaSan = must(place(s, 'nhaSan', DIEN + 13, LINE - 4));
  const nep = must(place(s, 'ruongNep', LINE - 5, DIEN + 4));
  for (const b of [ruong, baiDa, loRen, nhaSan, nep]) expect(groundOf(s, b), b.type).toBe(1);
  return { cong, ruong, baiDa, loRen, nhaSan, nep };
}

/** Số mùa lũ đã qua để mùa tới dâng tới bậc 1, 2, 3 (`floodLevel`: mùa 1–2 bậc 1, 3–4 bậc 2, từ mùa 5 bậc 3). */
const FLOODS_BEFORE = [0, 0, 2, 4];

/** Đợt giặc tới kinh đô; giặc đứng yên (như còn ngồi trên thuyền) để chỉ còn nước làm việc. */
function startRaid(s: GameState): Battle {
  expect(callRaidNow(s).ok).toBe(true);
  tick(s, RAID_WARNING_MS);
  const battle = s.raid.battle!;
  for (const f of battle.fighters) if (f.side === 'giac') f.state = 'aboard';
  return battle;
}

/** Mùa lũ dâng tới bậc `level`. */
function startFlood(s: GameState, level: number): Battle {
  s.raid.floods = FLOODS_BEFORE[level];
  const battle = startRaid(s);
  expect(battle.floodTo).toBe(level);
  return battle;
}

/** Nước trong trận dâng tới mực `water` (bậc, có thể lẻ). */
function riseTo(s: GameState, water: number): void {
  s.raid.battle!.t = water * FLOOD_RISE_S;
  tick(s, BATTLE_STEP * 1000);
}

/** Diệt hết giặc: trận xong, trả về kết quả. */
function endRaid(s: GameState): RaidResult {
  const battle = s.raid.battle!;
  for (const f of battle.fighters) if (f.side === 'giac') f.state = 'dead';
  battle.killed = battle.total;
  tick(s, 100);
  expect(s.raid.phase).toBe('idle');
  return s.raid.lastResult!;
}

/** Cả mùa lũ: nước lên thẳng bậc `level`, rồi diệt hết thủy quái. */
function flood(s: GameState, level: number): RaidResult {
  startFlood(s, level);
  riseTo(s, level);
  return endRaid(s);
}

describe('cống đê', () => {
  it('dựng thay một đoạn đê hay trên ô trống, không đè lũy; mới dựng thì đóng; tối đa 2 cái, Điện 9 được 3', () => {
    const s = ch2();
    const de = must(place(s, 'de', GATE.x, GATE.z));
    const before = s.resources.datDa;
    const cong = must(place(s, 'congDe', GATE.x, GATE.z));
    expect(s.buildings.some((b) => b.id === de.id)).toBe(false);
    expect(s.resources.datDa).toBe(before - BUILDINGS.congDe.buildCost.datDa!);
    expect(cong.mo).toBeUndefined();
    must(place(s, 'luy', GATE.x + 2, LINE));
    expect(canPlace(s, 'congDe', GATE.x + 2, LINE).ok).toBe(false);
    must(place(s, 'congDe', GATE.x + 4, LINE));
    expect(canPlace(s, 'congDe', GATE.x + 6, LINE)).toEqual({ ok: false, reason: 'datGioiHan' });
    setDien(s, 9);
    expect(canPlace(s, 'congDe', GATE.x + 6, LINE).ok).toBe(true);
  });

  it('có từ chương 2 như đê; lũ không làm hư, không đắp nền được', () => {
    const s = ch2();
    s.questIndex = CH2_QUEST_START - 1;
    expect(canPlace(s, 'congDe', GATE.x, GATE.z)).toEqual({ ok: false, reason: 'canChuong2' });
    s.questIndex = CH2_QUEST_START;
    const cong = must(place(s, 'congDe', GATE.x, GATE.z));
    expect(floodToleranceOf('congDe')).toBeGreaterThanOrEqual(99);
    expect(raiseBuilding(s, cong.id)).toEqual({ ok: false, reason: 'khongDapNen' });
  });

  it('đóng thì chặn nước như kè đá, mở thì nước lũ vào sau đê; cống vỡ như đê vỡ', () => {
    const s = ch2();
    dike(s);
    const cong = must(place(s, 'congDe', GATE.x, GATE.z));
    expect(inside(floodMap(s, 3))).toBe(0);
    expect(setCong(s, cong.id, true).ok).toBe(true);
    expect(cong.mo).toBe(true);
    // Lũ bậc 1 chỉ ngập bãi bồi bậc 0, chưa tới ô bậc 1 sau cống.
    expect(inside(floodMap(s, 1))).toBe(0);
    expect(inside(floodMap(s, 2))).toBeGreaterThan(40);
    // Tính như mọi cống đều đóng: lại khô.
    expect(inside(floodMap(s, 2, true))).toBe(0);
    expect(setCong(s, cong.id, false).ok).toBe(true);
    expect(cong.mo).toBeUndefined();
    cong.damaged = true;
    expect(inside(floodMap(s, 2))).toBeGreaterThan(40);
    // Chỉ đóng mở được cống.
    expect(setCong(s, s.buildings[0].id, true)).toEqual({ ok: false, reason: 'khongTimThay' });
  });
});

describe('phù sa', () => {
  it('mở cống đón lũ bậc 2: ruộng sau đê được bồi, không hư; bãi đất đá, lò rèn hư; nhà sàn chịu được', () => {
    const s = ch2();
    const t = town(s);
    setCong(s, t.cong.id, true);
    const r = flood(s, 2);
    expect(r.boi).toBe(2);
    for (const b of [t.ruong, t.nep]) {
      expect(b.boi, b.type).toBe(true);
      expect(b.damaged, b.type).toBeFalsy();
    }
    expect([...r.drowned].sort((a, b) => a - b)).toEqual(ids([t.baiDa, t.loRen]));
    expect(t.nhaSan.damaged).toBeFalsy();
    expect(s.raid.floodsHeld).toBe(0);
  });

  it('chỉ ruộng dính nước qua cống thì vẫn tính là giữ được mùa lũ', () => {
    const s = ch2();
    dike(s);
    const cong = must(place(s, 'congDe', GATE.x, GATE.z));
    const ruong = must(place(s, 'ruong', DIEN, LINE - 4));
    setCong(s, cong.id, true);
    const r = flood(s, 2);
    expect(r.won).toBe(true);
    expect(r.drowned).toEqual([]);
    expect(r.boi).toBe(1);
    expect(ruong.boi).toBe(true);
    expect(s.raid.floodsHeld).toBe(1);
  });

  it('đê vỡ hay cống vỡ: nước dữ tràn vào, ruộng hư như cũ, không được bồi', () => {
    const s = ch2();
    const t = town(s);
    setCong(s, t.cong.id, true);
    // Thủy quái phá một đoạn đê đứng trên đất bậc 1.
    const deVo = s.buildings.find((b) => b.type === 'de' && b.x === DIEN + 6 && b.z === LINE)!;
    deVo.damaged = true;
    let hits = floodHits(s, 2);
    expect(hits.boi).toEqual([]);
    expect(ids(hits.drown)).toEqual(ids([t.ruong, t.baiDa, t.loRen, t.nep]));
    // Cống vỡ thì dù đang mở cũng như đê vỡ: không còn cống nào giữ được nước.
    deVo.damaged = false;
    t.cong.damaged = true;
    hits = floodHits(s, 2);
    expect(hits.calm).toBeNull();
    expect(hits.boi).toEqual([]);
    expect(ids(hits.drown)).toEqual(ids([t.ruong, t.baiDa, t.loRen, t.nep]));
    const r = flood(s, 2);
    expect(r.boi).toBeUndefined();
    expect(t.ruong.damaged).toBe(true);
    expect(t.ruong.boi).toBeUndefined();
  });

  it('đóng cống giữa mùa lũ: nước sau cống rút, nhà sàn thoát; ruộng đã được bồi vẫn có phù sa', () => {
    const s = ch2();
    const t = town(s);
    setCong(s, t.cong.id, true);
    const battle = startFlood(s, 3);
    riseTo(s, 1.5);
    expect(battle.boi).toContain(t.ruong.id);
    expect(t.baiDa.damaged).toBe(true);
    expect(t.nhaSan.damaged).toBeFalsy();
    // Nước mà lên tới bậc 3 với cống mở thì nhà sàn trên đất bậc 1 cũng hư.
    expect(ids(floodHits(s, 3).drown)).toContain(t.nhaSan.id);
    expect(setCong(s, t.cong.id, false).ok).toBe(true);
    riseTo(s, 3);
    expect(inside(floodMap(s, battle.water))).toBe(0);
    expect(t.nhaSan.damaged).toBeFalsy();
    const r = endRaid(s);
    expect(r.boi).toBe(2);
    expect(t.ruong.boi).toBe(true);
    expect(t.nhaSan.damaged).toBeFalsy();
  });

  it('ruộng có phù sa làm ra thêm 40%: gạo của ruộng lúa, nếp của ruộng nếp; ruộng hư thì không', () => {
    expect(PHU_SA_BONUS).toBe(0.4);
    const s = ch2();
    const ruong = must(place(s, 'ruong', DIEN, LINE - 4));
    const nep = must(place(s, 'ruongNep', LINE - 5, DIEN + 4));
    for (const b of [ruong, nep]) b.workers = slotsOf(b);
    const gao = outputIn(s, ruong).gao!;
    const nepRate = bakeRates(s).nep;
    expect(gao).toBeGreaterThan(0);
    expect(nepRate).toBeGreaterThan(0);
    ruong.boi = true;
    nep.boi = true;
    expect(outputIn(s, ruong).gao).toBeCloseTo(gao * (1 + PHU_SA_BONUS));
    expect(bakeRates(s).nep).toBeCloseTo(nepRate * (1 + PHU_SA_BONUS));
    ruong.damaged = true;
    expect(outputIn(s, ruong).gao ?? 0).toBe(0);
  });

  it('phù sa giữ qua trận giặc khác, nâng cấp vẫn giữ; mất ở mùa lũ sau nếu không được bồi lại, mất khi dời ruộng', () => {
    const s = ch2();
    // Chương 3: yêu tinh và lũ xen nhau. Đợt trước coi như yêu tinh, nên đợt tới là lũ.
    s.questIndex = CH3_QUEST_START;
    s.raid.foe = 'yeu';
    const t = town(s);
    setCong(s, t.cong.id, true);
    expect(flood(s, 2).boi).toBe(2);
    expect(startRaid(s).foe).toBe('yeu');
    endRaid(s);
    expect(t.ruong.boi).toBe(true);
    expect(upgrade(s, t.ruong.id).ok).toBe(true);
    expect(t.ruong.boi).toBe(true);
    // Mùa lũ sau đóng cống: không ruộng nào được bồi, phù sa cũ hết.
    setCong(s, t.cong.id, false);
    s.raid.foe = 'yeu';
    expect(flood(s, 2).boi).toBeUndefined();
    expect(t.ruong.boi).toBeUndefined();
    expect(t.nep.boi).toBeUndefined();
    // Bồi lại rồi dời ruộng đi chỗ khác thì mất.
    setCong(s, t.cong.id, true);
    s.raid.foe = 'yeu';
    flood(s, 2);
    expect(t.ruong.boi).toBe(true);
    expect(move(s, t.ruong.id, DIEN - 6, LINE - 4).ok).toBe(true);
    expect(t.ruong.boi).toBeUndefined();
  });

  it('xem trước mùa lũ tới khớp với trận thật', () => {
    const s = ch2();
    const t = town(s);
    setCong(s, t.cong.id, true);
    s.raid.floods = FLOODS_BEFORE[2];
    const p = phuSaPreview(s);
    expect(p.level).toBe(2);
    expect(ids(p.boi)).toEqual(ids([t.ruong, t.nep]));
    expect(ids(p.drown)).toEqual(ids([t.baiDa, t.loRen]));
    expect(inside(p.calm!)).toBeGreaterThan(40);
    const r = flood(s, 2);
    expect(r.boi).toBe(p.boi.length);
    expect([...r.drowned].sort((a, b) => a - b)).toEqual(ids(p.drown));
  });
});

describe('lưu game, gợi ý, mẫu kinh đô', () => {
  it('lưu rồi nạp lại giữ cống mở và ruộng có phù sa; giá trị sai thì không nạp', () => {
    const s = ch2();
    const cong = must(place(s, 'congDe', GATE.x, GATE.z));
    const ruong = must(place(s, 'ruong', DIEN, LINE - 4));
    const kho = must(place(s, 'kho', DIEN + 5, LINE - 4));
    setCong(s, cong.id, true);
    ruong.boi = true;
    const back = deserialize(serialize(s))!;
    expect(back.buildings.find((b) => b.id === cong.id)?.mo).toBe(true);
    expect(back.buildings.find((b) => b.id === ruong.id)?.boi).toBe(true);
    const bad = (id: number, key: string, value: unknown) => {
      const raw = JSON.parse(serialize(s));
      raw.buildings.find((b: { id: number }) => b.id === id)[key] = value;
      return deserialize(JSON.stringify(raw));
    };
    expect(bad(cong.id, 'mo', 1)).toBeUndefined();
    expect(bad(kho.id, 'mo', true)).toBeUndefined();
    expect(bad(kho.id, 'boi', true)).toBeUndefined();
    expect(bad(ruong.id, 'boi', false)).toBeUndefined();
  });

  it('Lạc hầu gợi ý cống đê một lần từ chương 2', () => {
    const s = ch2();
    for (const t of ['thoHo', 'xuongMoc', 'langChai'] as const) markHinted(s, t);
    expect(nextHint(s)).toBe('congDe');
    markHinted(s, 'congDe');
    expect(nextHint(s)).toBeNull();
  });

  it('áp mẫu Đê bao: cống đứng ở chỗ đê của mẫu vẫn là cống, không thêm đoạn đê đè lên', () => {
    const s = ch2();
    const slot = mauSlots('deBao', 5).find((x) => x.type === 'de')!;
    const cong = must(place(s, 'congDe', slot.x, slot.z));
    setCong(s, cong.id, true);
    expect(applyMau(s, 'deBao').ok).toBe(true);
    const here = s.buildings.filter((b) => b.x === slot.x && b.z === slot.z);
    expect(here.map((b) => b.type)).toEqual(['congDe']);
    expect(here[0].mo).toBe(true);
    expect(s.buildings.filter((b) => b.type === 'congDe')).toHaveLength(1);
  });
});
