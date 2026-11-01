// Vùng đất bên kia sông: lưới nới qua sông (bờ nam sông Đà, bờ đông sông Thao, ngã ba sông).

import { describe, expect, it } from 'vitest';
import { findPath, startBattle, stepBattle, type HeroSetup } from './battle';
import {
  BANKS,
  FAR_ALONG,
  FAR_PLOTS,
  CAMP1_ARMY,
  CAMPS,
  canJoinVillage,
  canOpenPlot,
  fortOf,
  landRaidSide,
  setGarrison,
  villageHall,
  villagesOutput,
  dacSanOf,
  joinVillage,
  openPlot,
  plotCost,
  villageOutput,
  bridgeheadPlots,
  campTier,
  canScout,
  canStartCamp,
  startCamp,
  plotAt,
  plotBlocked,
  plotId,
  plotNeighbors,
  plotOf,
  plotOrigin,
  poiAt,
  poiPlots,
  sendScout,
  type Bank,
  type Poi,
} from './benKia';
import { wallRings } from './coLoa';
import { BRIDGE_FLOOD, BUILDINGS, CH2_QUEST_START, CH3_QUEST_START, DAC_SAN_BONUS, FIELD, SCOUT_COST, SCOUT_MS, UNITS, VILLAGE_GIFT, VILLAGE_SHARE, type UnitType } from './defs';
import { canMove, canPlace, createInitialState, outputIn, place, productionPerMinute, repair, tick, type Building, type GameState } from './game';
import { planMau } from './mau';
import { FAR_FOREST, GRID, RIVER_END, RIVER_START, areaStart, baseHeights, farBankOf, isRiver, isUnlocked, riverDistance } from './map';
import { deserialize, serialize } from './save';
import { pendingStory } from './story';
import { drowns, floodMap } from './terrain';
import { setDien } from './testmap';
import { HALF_ARMY, SAMPLE_ARMY, SEEDS, fightField } from './testkit';

/** Dấu vân tay độ cao tự nhiên của lưới 55×55 trước khi nới lưới (tính từ `map.ts` cũ). */
const OLD_FINGERPRINT = 3373663266;
const OLD_GRID = 55;

describe('lưới qua sông', () => {
  it('sông Thao chảy tới ngã ba rồi đổ vào sông Đà, sông Đà chảy suốt bề ngang', () => {
    expect(GRID).toBe(72);
    for (let x = RIVER_START; x < RIVER_END; x++) for (const z of [0, 20, 51, 52, 54]) expect(isRiver(x, z)).toBe(true);
    for (let z = RIVER_START; z < RIVER_END; z++) for (const x of [0, 20, 51, 60, 71]) expect(isRiver(x, z)).toBe(true);
    // Qua ngã ba, sông Thao không chảy tiếp: bờ nam liền một dải.
    expect(isRiver(53, 60)).toBe(false);
    expect(isRiver(60, 60)).toBe(false);
    expect(isRiver(51, 51)).toBe(false);
    expect(isRiver(RIVER_END, 10)).toBe(false);
    expect(isRiver(10, RIVER_END)).toBe(false);
  });

  it('hai bờ bên kia: bờ nam sông Đà, bờ đông sông Thao', () => {
    expect(farBankOf(10, 60)).toBe('nam');
    expect(farBankOf(60, 60)).toBe('nam');
    expect(farBankOf(60, 10)).toBe('dong');
    expect(farBankOf(10, 10)).toBe(null);
    expect(farBankOf(53, 10)).toBe(null);
    expect(farBankOf(60, 53)).toBe(null);
  });

  it('độ cao bên này giữ y như trước khi nới lưới', () => {
    const h = baseHeights();
    expect(h.length).toBe(GRID * GRID);
    let fp = 0x811c9dc5;
    for (let z = 0; z < OLD_GRID; z++) for (let x = 0; x < OLD_GRID; x++) fp = Math.imul(fp ^ (h[z * GRID + x] + 2), 0x01000193) >>> 0;
    expect(fp).toBe(OLD_FINGERPRINT);
  });

  it('bờ bên kia có bãi bồi sát sông, vào trong là đồng bằng và đồi', () => {
    const h = baseHeights();
    for (const x of [5, 20, 40]) {
      for (let z = RIVER_END; z < RIVER_END + 3; z++) expect(h[z * GRID + x]).toBe(0);
      expect(h[(RIVER_END + 6) * GRID + x]).toBeGreaterThanOrEqual(1);
    }
    for (const z of [5, 20, 40]) for (let x = RIVER_END; x < RIVER_END + 3; x++) expect(h[z * GRID + x]).toBe(0);
    for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) if (!isRiver(x, z)) expect(h[z * GRID + x]).toBeLessThanOrEqual(3);
    expect(riverDistance(10, RIVER_END)).toBe(0);
    expect(riverDistance(RIVER_END + 4, 10)).toBe(4);
    expect(FAR_FOREST).toBe(70);
  });

  it('bờ bên kia chưa khai phá: không xây được, lũ không tràn vào', () => {
    const s: GameState = createInitialState(0);
    expect(isUnlocked(20, 60, 8)).toBe(false);
    expect(isUnlocked(60, 20, 8)).toBe(false);
    s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 };
    expect(canPlace(s, 'luy', 20, 60)).toEqual({ ok: false, reason: 'ngoaiVung' });
    const wet = floodMap(s, 3, 8);
    for (let z = RIVER_END; z < GRID; z++) for (let x = 0; x < RIVER_START; x++) expect(wet[z * GRID + x]).toBe(0);
  });
});

describe('nâng bản lưu 11 lên 12', () => {
  /** Đưa state hiện tại về dạng bản lưu 11: mảng độ cao 55×55. */
  function asV11(s: GameState): Record<string, unknown> {
    const raw = JSON.parse(serialize(s));
    raw.version = 11;
    const old: number[] = [];
    for (let z = 0; z < OLD_GRID; z++) for (let x = 0; x < OLD_GRID; x++) old.push(s.heights[z * GRID + x]);
    raw.heights = old;
    return raw;
  }

  it('dàn lại độ cao, giữ đất đã đắp bên này, bờ bên kia lấy độ cao tự nhiên', () => {
    const s = createInitialState(0);
    s.heights[40 * GRID + 30] = 4;
    const back = deserialize(JSON.stringify(asV11(s)))!;
    expect(back).toBeDefined();
    expect(back.version).toBe(12);
    expect(back.heights.length).toBe(GRID * GRID);
    expect(back.heights[40 * GRID + 30]).toBe(4);
    expect(back.heights).toEqual(s.heights);
  });

  it('đường đi của giặc trong trận đang dở đổi theo chỉ số ô mới', () => {
    const s = createInitialState(0);
    const raw = asV11(s);
    const path = [10 * OLD_GRID + 20, 11 * OLD_GRID + 21];
    raw.raid = {
      ...(raw.raid as object),
      phase: 'battle',
      battle: { fighters: [{ path }] },
    };
    const json = JSON.stringify(raw);
    // Bản lưu này thiếu nhiều phần của một trận thật; chỉ xem bước nâng đổi đường đi đúng chưa.
    const migrated = JSON.parse(json);
    const back = deserialize(json);
    const fighters = (back?.raid.battle as unknown as { fighters: { path: number[] }[] } | undefined)?.fighters;
    expect(migrated.raid.battle.fighters[0].path).toEqual(path);
    expect(fighters?.[0].path).toEqual([10 * GRID + 20, 11 * GRID + 21]);
  });
});

/** Kinh đô ở Điện `level`, kho đầy, đã nghe mọi đoạn truyện trước đó. */
function rich(level = 4): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 };
  return s;
}

/** Hàng khoảnh bên kia sát sông, đối diện vùng đất bên này đã khai phá ở Điện `level`, không có đồn. */
function freeRiverPlot(bank: Bank, level: number): number {
  const lo = areaStart(level);
  for (let i = FAR_ALONG - 1; i >= 0; i--) {
    const id = plotId(bank, i, 0);
    const o = plotOrigin(id);
    const along = bank === 'nam' ? o.x : o.z;
    if (along >= lo && poiAt(id)?.kind !== 'don') return id;
  }
  throw new Error('không có khoảnh trống');
}

/** Bắc cầu sang khoảnh sát sông `id` (đầu cầu vào giữa khoảnh). */
function bridgeTo(s: GameState, id: number): Building {
  const { bank } = plotOf(id);
  const o = plotOrigin(id);
  const r = bank === 'nam' ? place(s, 'cauDa', o.x + 1, RIVER_START) : place(s, 'cauThao', RIVER_START, o.z + 1);
  if (!r.ok) throw new Error(r.reason);
  return r.value;
}

describe('khoảnh và điểm lạ bên kia sông', () => {
  it('mỗi bờ 10 × 3 khoảnh 5×5 ô, từ bờ sông tới dải rừng ngoài cùng', () => {
    expect(FAR_PLOTS).toBe(60);
    for (let id = 0; id < FAR_PLOTS; id++) {
      const o = plotOrigin(id);
      for (let dx = 0; dx < 5; dx++) for (let dz = 0; dz < 5; dz++) expect(plotAt(o.x + dx, o.z + dz)).toBe(id);
      expect(farBankOf(o.x, o.z)).toBe(plotOf(id).bank);
    }
    expect(plotAt(10, RIVER_END - 1)).toBe(null);
    expect(plotAt(10, FAR_FOREST)).toBe(null);
    expect(plotAt(RIVER_END, 1)).toBe(null);
    expect(plotNeighbors(plotId('nam', 0, 0)).sort()).toEqual([plotId('nam', 1, 0), plotId('nam', 0, 1)].sort());
  });

  it('mỗi bờ sáu đồn (bậc 1, 1, 2, 2, 3, 4), hai làng, ba đặc sản, hai của chôn', () => {
    for (const bank of BANKS) {
      const pois = poiPlots()
        .filter((id) => plotOf(id).bank === bank)
        .map((id) => poiAt(id)!);
      const tiers = pois.flatMap((p) => (p.kind === 'don' ? [p.tier] : [])).sort();
      expect(tiers).toEqual([1, 1, 2, 2, 3, 4]);
      expect(pois.filter((p) => p.kind === 'lang').length).toBe(2);
      expect(pois.filter((p) => p.kind === 'dacSan').length).toBe(3);
      expect(pois.filter((p) => p.kind === 'cua').length).toBe(2);
    }
  });

  it('đồn bậc thấp sát sông; làng chỉ khai phá được sau khi dẹp đồn bậc 2; mỗi bờ có đặc sản khai phá được từ chương 1', () => {
    /** Bậc đồn thấp nhất phải dẹp (mọi đồn tới bậc ấy) để khai phá được khoảnh `target`, từ đầu cầu đối diện kinh đô ở Điện 4. */
    function tierToReach(bank: Bank, target: number): number {
      for (let tier = 0; tier <= 4; tier++) {
        const s = createInitialState(0);
        s.benKia.cleared = poiPlots().filter((id) => {
          const p = poiAt(id)!;
          return p.kind === 'don' && p.tier <= tier;
        });
        const start = plotId(bank, freeRiverPlot(bank, 4) % FAR_ALONG, 0);
        const seen = new Set([start]);
        const queue = [start];
        while (queue.length) {
          const id = queue.pop()!;
          for (const n of plotNeighbors(id)) {
            if (seen.has(n) || plotBlocked(s, n)) continue;
            seen.add(n);
            queue.push(n);
          }
        }
        if (seen.has(target)) return tier;
      }
      return 99;
    }
    for (const bank of BANKS) {
      const mine = poiPlots().filter((id) => plotOf(id).bank === bank);
      for (const id of mine) {
        const p: Poi = poiAt(id)!;
        if (p.kind === 'don') {
          expect(plotOf(id).j, `đồn bậc ${p.tier}`).toBe(p.tier === 1 ? 0 : p.tier === 2 ? 1 : 2);
          continue;
        }
        const need = tierToReach(bank, id);
        expect(need, `${bank} ${p.kind} khoảnh ${id}`).toBeLessThanOrEqual(4);
        if (p.kind === 'lang') expect(need, `${bank} làng ${p.nghe}`).toBeGreaterThanOrEqual(2);
      }
      expect(mine.some((id) => poiAt(id)!.kind === 'dacSan' && tierToReach(bank, id) <= 1)).toBe(true);
    }
  });
});

describe('cầu qua sông', () => {
  it('có từ Điện cấp 4, mỗi sông một cầu', () => {
    const s = rich(3);
    const id = freeRiverPlot('nam', 3);
    const o = plotOrigin(id);
    expect(canPlace(s, 'cauDa', o.x + 1, RIVER_START)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 4);
    expect(canPlace(s, 'cauDa', o.x + 1, RIVER_START).ok).toBe(true);
    bridgeTo(s, id);
    expect(canPlace(s, 'cauDa', o.x - 3, RIVER_START)).toEqual({ ok: false, reason: 'datGioiHan' });
    bridgeTo(s, freeRiverPlot('dong', 4));
    expect(s.buildings.filter((b) => b.type === 'cauDa' || b.type === 'cauThao').length).toBe(2);
  });

  it('vắt qua đúng ba ô sông, đầu bên này trên đất đã khai phá, không bắc thẳng vào đồn giặc', () => {
    const s = rich();
    const id = freeRiverPlot('nam', 4);
    const o = plotOrigin(id);
    expect(canPlace(s, 'cauDa', o.x + 1, RIVER_START - 1)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canPlace(s, 'cauDa', o.x + 1, RIVER_START + 1)).toEqual({ ok: false, reason: 'ngoaiVung' });
    // Đầu bên này trong rừng chưa phát.
    expect(canPlace(s, 'cauDa', 3, RIVER_START)).toEqual({ ok: false, reason: 'ngoaiVung' });
    const camp = poiPlots().find((p) => plotOf(p).bank === 'nam' && plotOf(p).j === 0 && poiAt(p)!.kind === 'don' && plotOrigin(p).x >= areaStart(4))!;
    expect(canPlace(s, 'cauDa', plotOrigin(camp).x + 1, RIVER_START)).toEqual({ ok: false, reason: 'dauCauCoDon' });
    expect(canPlace(s, 'cauThao', RIVER_START, 30).ok).toBe(true);
    expect(canPlace(s, 'cauThao', RIVER_START + 1, 30)).toEqual({ ok: false, reason: 'ngoaiVung' });
  });

  it('bắc xong thì khoảnh đầu cầu được dò và mở, dựng được công trình bên kia; cầu không dời được', () => {
    const s = rich();
    const id = freeRiverPlot('nam', 4);
    const b = bridgeTo(s, id);
    expect(bridgeheadPlots('cauDa', b.x, b.z)).toEqual([id]);
    expect(s.benKia.known).toEqual([id]);
    expect(s.benKia.open).toEqual([id]);
    const o = plotOrigin(id);
    expect(place(s, 'ruong', o.x, o.z + 1).ok).toBe(true);
    // Khoảnh bên cạnh chưa mở.
    expect(canPlace(s, 'luy', o.x + 5, o.z + 1)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canMove(s, b.id, b.x + 5, b.z)).toEqual({ ok: false, reason: 'cauKhongDoi' });
  });

  it('giặc và quân đi qua cầu còn nguyên, cầu hư thì không qua được', () => {
    const s = rich();
    const id = freeRiverPlot('nam', 4);
    const o = plotOrigin(id);
    const kho = (place(s, 'kho', 40, 30) as { value: Building }).value;
    const from = { x: o.x + 2, z: o.z + 8 };
    expect(findPath(s, from.x, from.z, kho)).toBeNull();
    const b = bridgeTo(s, id);
    const path = findPath(s, from.x, from.z, kho)!;
    expect(path).not.toBeNull();
    expect(path.some((i) => isRiver(i % GRID, Math.floor(i / GRID)))).toBe(true);
    b.damaged = true;
    expect(findPath(s, from.x, from.z, kho)).toBeNull();
  });

  it('lũ cuốn cầu phao tre ở bậc 2, cầu gỗ ở bậc 3, cầu gỗ lớn không sợ lũ', () => {
    const s = rich(7);
    const b = bridgeTo(s, freeRiverPlot('nam', 7));
    const wet = floodMap(s, 3, 7);
    expect(BRIDGE_FLOOD).toEqual([2, 3, Infinity]);
    expect(drowns(s, b, wet, 1.9)).toBe(false);
    expect(drowns(s, b, wet, 2)).toBe(true);
    b.level = 2;
    expect(drowns(s, b, wet, 2.9)).toBe(false);
    expect(drowns(s, b, wet, 3)).toBe(true);
    b.level = 3;
    expect(drowns(s, b, wet, 3)).toBe(false);
  });

  it('lũ loang vào khoảnh đã mở bên kia sông, rừng bên kia không ngập', () => {
    const s = rich();
    const id = freeRiverPlot('nam', 4);
    bridgeTo(s, id);
    const o = plotOrigin(id);
    const wet = floodMap(s, 1, 4);
    // Bãi bồi bậc 0 sát sông ngập ở bậc 1.
    expect(wet[o.z * GRID + o.x]).toBe(1);
    expect(wet[o.z * GRID + o.x + 5]).toBe(0);
  });

  it('có cầu thì vòng thành dựa vào bờ sông bị hở ở đầu cầu', () => {
    const s = rich();
    let next = 1000;
    const wall = (x: number, z: number) => s.buildings.push({ id: next++, type: 'thanh', x, z, level: 1, workers: 0 });
    // Một vòng thành chữ L: chắn phía bắc và phía tây, dựa vào hai bờ sông.
    const line = 25;
    for (let x = 0; x < RIVER_START; x++) wall(x, line);
    for (let z = line + 1; z < RIVER_START; z++) wall(0, z);
    expect(wallRings(s)).toBe(1);
    bridgeTo(s, freeRiverPlot('nam', 4));
    expect(wallRings(s)).toBe(0);
  });
});

describe('trinh sát', () => {
  it('dò khoảnh sát vùng đã dò: tốn gạo, vỏ ốc, đi 40 giây chơi rồi khoảnh ấy và các khoảnh kề hiện ra', () => {
    const s = rich();
    const id = freeRiverPlot('nam', 4);
    expect(canScout(s, plotNeighbors(id)[0])).toEqual({ ok: false, reason: 'canCau' });
    const b = bridgeTo(s, id);
    const far = plotId('nam', plotOf(id).i, 2);
    expect(canScout(s, far)).toEqual({ ok: false, reason: 'xaQua' });
    expect(canScout(s, id)).toEqual({ ok: false, reason: 'daDo' });
    const target = plotId('nam', plotOf(id).i, 1);
    const before = { ...s.resources };
    expect(sendScout(s, target).ok).toBe(true);
    expect(before.gao - s.resources.gao).toBe(SCOUT_COST.gao);
    expect(before.voOc - s.resources.voOc).toBe(SCOUT_COST.voOc);
    expect(canScout(s, target)).toEqual({ ok: false, reason: 'dangDo' });
    // Điện 4: một trinh sát một lúc.
    const other = plotNeighbors(id).find((n) => n !== target)!;
    expect(canScout(s, other)).toEqual({ ok: false, reason: 'trinhSatBan' });
    tick(s, SCOUT_MS - 1000);
    expect(s.benKia.known).not.toContain(target);
    tick(s, 1000);
    expect(s.benKia.known).toContain(target);
    for (const n of plotNeighbors(target)) expect(s.benKia.known).toContain(n);
    expect(s.benKia.scouts).toEqual([]);
    // Dò chưa phải là mở.
    expect(s.benKia.open).toEqual([id]);
    b.damaged = true;
    const unknown = plotNeighbors(far).find((n) => !s.benKia.known.includes(n))!;
    expect(canScout(s, unknown)).toEqual({ ok: false, reason: 'cauHu' });
  });

  it('từ Điện cấp 6 đi được hai trinh sát cùng lúc', () => {
    const s = rich(6);
    const id = freeRiverPlot('nam', 6);
    bridgeTo(s, id);
    const [a, b] = plotNeighbors(id);
    expect(sendScout(s, a).ok).toBe(true);
    expect(sendScout(s, b).ok).toBe(true);
  });
});

describe('bên kia sông và các phần khác', () => {
  it('Điện cấp 4 thì Lạc hầu kể đoạn "Bên kia sông"', () => {
    const s = createInitialState(0);
    s.story.seen = ['mo', 'suGia'];
    setDien(s, 3);
    expect(pendingStory(s)).not.toBe('benKia');
    setDien(s, 4);
    expect(pendingStory(s)).toBe('benKia');
  });

  it('áp mẫu kinh đô không đụng công trình bên kia sông và chừa ô đầu cầu', () => {
    const s = rich(5);
    const id = freeRiverPlot('nam', 5);
    const b = bridgeTo(s, id);
    const o = plotOrigin(id);
    const ruong = (place(s, 'ruong', o.x, o.z + 1) as { value: Building }).value;
    const plan = planMau(s, 'phongChau');
    expect(plan.moves.some((m) => m.id === ruong.id || m.id === b.id)).toBe(false);
    expect(plan.removes).not.toContain(b.id);
    const def = BUILDINGS.cauDa;
    for (const slot of plan.builds) {
      const sd = BUILDINGS[slot.type];
      for (let x = b.x; x < b.x + def.w; x++) {
        const inside = x >= slot.x && x < slot.x + sd.w && RIVER_START - 1 >= slot.z && RIVER_START - 1 < slot.z + sd.d;
        expect(inside, `${slot.type} ${slot.x},${slot.z}`).toBe(false);
      }
    }
  });

  it('lưu rồi nạp lại giữ khoảnh đã dò, đã mở, trinh sát đang đi', () => {
    const s = rich();
    const id = freeRiverPlot('dong', 4);
    bridgeTo(s, id);
    sendScout(s, plotNeighbors(id)[0]);
    const back = deserialize(serialize(s))!;
    expect(back.benKia).toEqual(s.benKia);
  });
});

describe('đồn giặc và điều quân', () => {
  /** Đồn bậc `tier` gần cầu nhất trên bờ nam, đã dò. */
  function campOf(s: GameState, tier: number): number {
    const id = poiPlots().find((p) => plotOf(p).bank === 'nam' && campTier(p) === tier)!;
    if (!s.benKia.known.includes(id)) s.benKia.known.push(id);
    return id;
  }
  /** Kinh đô có doanh trại, cầu sang bờ nam, lính đủ đánh. */
  function ready(level = 4): GameState {
    const s = rich(level);
    s.buildings.push({ id: 900, type: 'doanhTrai', x: 30, z: 30, level: 4, workers: 0 });
    bridgeTo(s, freeRiverPlot('nam', level));
    s.troops = { giao: 20, cung: 12, voi: 4 };
    return s;
  }

  it('đánh được khi đã dò thấy đồn, có doanh trại, có cầu còn nguyên, tới đúng chương', () => {
    const s = ready();
    const t1 = campOf(s, 1);
    expect(canStartCamp(s, t1).ok).toBe(true);
    const t2 = campOf(s, 2);
    expect(canStartCamp(s, t2)).toEqual({ ok: false, reason: 'canChuong2' });
    s.questIndex = CH2_QUEST_START;
    expect(canStartCamp(s, t2).ok).toBe(true);
    expect(canStartCamp(s, campOf(s, 3))).toEqual({ ok: false, reason: 'canChuong3' });
    s.questIndex = CH3_QUEST_START;
    expect(canStartCamp(s, campOf(s, 3)).ok).toBe(true);
    expect(canStartCamp(s, campOf(s, 4))).toEqual({ ok: false, reason: 'canChuong4' });
    const bridge = s.buildings.find((b) => b.type === 'cauDa')!;
    bridge.damaged = true;
    expect(canStartCamp(s, t1)).toEqual({ ok: false, reason: 'cauHu' });
    s.buildings = s.buildings.filter((b) => b.id !== 900);
    bridge.damaged = false;
    expect(canStartCamp(s, t1)).toEqual({ ok: false, reason: 'canDoanhTrai' });
    s.benKia.known = s.benKia.known.filter((id) => id !== t1);
    expect(canStartCamp(s, t1)).toEqual({ ok: false, reason: 'khongTimThay' });
  });

  it('thắng thì dẹp đồn, nhận thưởng một lần, đất quanh đồn hết bị chặn; lính tử trận mất hẳn', () => {
    const s = ready();
    const id = campOf(s, 1);
    expect(plotBlocked(s, id)).toBe(true);
    expect(startCamp(s, id, { giao: 20, cung: 12, voi: 4 }, { giao: 'tien', cung: 'hau', voi: 'trung' }).ok).toBe(true);
    expect(s.campaign.battle?.camp).toBe(id);
    for (let i = 0; i < 200 && s.campaign.battle && !s.campaign.battle.outcome; i++) tick(s, 1000);
    expect(s.campaign.battle?.outcome).toBe('win');
    const r = s.campaign.lastResult!;
    expect(r.camp).toBe(id);
    expect(r.reward).toEqual(CAMPS[1].reward);
    expect(s.benKia.cleared).toEqual([id]);
    expect(canStartCamp(s, id)).toEqual({ ok: false, reason: 'donDaDep' });
    // Thắng đồn không phải thắng màn phó bản.
    expect(s.campaign.cleared).toBe(0);
    for (const k of ['giao', 'cung', 'voi'] as const) expect(s.troops[k]).toBe([20, 12, 4][['giao', 'cung', 'voi'].indexOf(k)] - r.lost[k]);
  });

  it('quân mẫu bậc 1 vừa doanh trại cấp 4; mỗi đồn không quá 28 giặc', () => {
    const space = (Object.keys(CAMP1_ARMY) as UnitType[]).reduce((n, k) => n + CAMP1_ARMY[k] * UNITS[k].space, 0);
    expect(space).toBeLessThanOrEqual(28);
    for (const def of Object.values(CAMPS)) expect(Object.values(def.enemies).reduce((a, b) => a + (b ?? 0), 0)).toBeLessThanOrEqual(28);
  });

  // Chuẩn cân bằng phó bản: người chơi thường thắng; không tướng hay nửa quân thì chơi giỏi cũng thua.
  // Đồn bậc 1 như màn chương 1: quân mẫu thắng không cần tướng, nửa quân thua.
  it('đồn bậc 1: quân mẫu thắng không cần tướng, nửa quân thua', () => {
    const half = { giao: 5, cung: 3, voi: 1 };
    for (const id of SEEDS) {
      const won = fightField(CAMPS[1], CAMP1_ARMY, null, 'thuong', id);
      expect(won.outcome).toBe('win');
      expect(won.t).toBeLessThan(FIELD.maxS);
      expect(fightField(CAMPS[1], half, null, 'gioi', id).outcome).toBe('lose');
    }
  });
  const HEROES: [number, string, HeroSetup][] = [
    [2, 'Gióng hiển linh', { kind: 'giong', bamboo: true, glow: true, non: false }],
    [3, 'Sơn Tinh hiển linh', { kind: 'sonTinh', bamboo: false, glow: true, non: true }],
    [4, 'An Dương Vương', { kind: 'anDuong', bamboo: false, glow: false, non: false, kimQuy: true }],
  ];
  for (const [tier, name, hero] of HEROES) {
    it(`đồn bậc ${tier}: người chơi thường có ${name} thì thắng; không tướng, hay nửa quân, chơi giỏi cũng thua`, () => {
      const def = CAMPS[tier as 2 | 3 | 4];
      for (const id of SEEDS) {
        const won = fightField(def, SAMPLE_ARMY, hero, 'thuong', id);
        expect(won.outcome).toBe('win');
        expect(won.t).toBeLessThan(FIELD.maxS);
        expect(fightField(def, SAMPLE_ARMY, null, 'gioi', id).outcome).toBe('lose');
        expect(fightField(def, HALF_ARMY, hero, 'gioi', id).outcome).toBe('lose');
      }
    });
  }
});

describe('khai phá đất bên kia, đặc sản, bản làng, của chôn', () => {
  /** Kinh đô có cầu sang bờ nam ở khoảnh đối diện, mọi đồn đã dẹp, mọi khoảnh bờ nam đã dò. */
  function explored(level = 6): { s: GameState; head: number } {
    const s = rich(level);
    const head = freeRiverPlot('nam', level);
    bridgeTo(s, head);
    s.benKia.cleared = poiPlots().filter((id) => poiAt(id)!.kind === 'don');
    for (let id = 0; id < 30; id++) if (!s.benKia.known.includes(id)) s.benKia.known.push(id);
    return { s, head };
  }
  /** Khai phá dần từ đầu cầu tới khoảnh `target` (theo hàng rồi theo cột). */
  function openTo(s: GameState, target: number): void {
    const from = plotOf(s.benKia.open[0]);
    const to = plotOf(target);
    let { i, j } = from;
    const step = (ni: number, nj: number) => {
      const id = plotId('nam', ni, nj);
      if (!s.benKia.open.includes(id)) {
        const r = openPlot(s, id);
        if (!r.ok) throw new Error(`${ni},${nj}: ${r.reason}`);
      }
      i = ni;
      j = nj;
    };
    while (j !== to.j) step(i, j + Math.sign(to.j - j));
    while (i !== to.i) step(i + Math.sign(to.i - i), j);
  }

  it('khai phá khoảnh đã dò, sát đất đã mở, không bị đồn chặn; giá nhích dần', () => {
    const s = rich(4);
    const head = freeRiverPlot('nam', 4);
    bridgeTo(s, head);
    const next = plotId('nam', plotOf(head).i, 1);
    expect(canOpenPlot(s, next)).toEqual({ ok: false, reason: 'khongTimThay' });
    s.benKia.known.push(next, plotId('nam', plotOf(head).i, 2));
    expect(canOpenPlot(s, plotId('nam', plotOf(head).i, 2))).toEqual({ ok: false, reason: 'xaQua' });
    const cost = plotCost(s);
    const before = { ...s.resources };
    const r = openPlot(s, next);
    expect(r.ok).toBe(true);
    expect(before.gao - s.resources.gao).toBe(cost.gao);
    expect(cost.datDa ?? 0).toBe(0);
    expect(plotCost(s).gao!).toBeGreaterThanOrEqual(cost.gao!);
    const many = { ...s, benKia: { ...s.benKia, open: [...s.benKia.open, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49] } };
    expect(plotCost(many).gao!).toBeGreaterThan(cost.gao!);
    // Khai phá rồi thì dựng được công trình trên khoảnh ấy.
    const o = plotOrigin(next);
    expect(canPlace(s, 'luy', o.x + 2, o.z + 2).ok).toBe(true);
    // Đồn bậc 1 sát sông chặn khoảnh kề.
    const camp = poiPlots().find((id) => plotOf(id).bank === 'nam' && campTier(id) === 1 && plotOf(id).i === plotOf(head).i - 1);
    if (camp !== undefined) {
      s.benKia.known.push(camp);
      expect(canOpenPlot(s, camp)).toEqual({ ok: false, reason: 'donChan' });
    }
  });

  it('khai phá khoảnh có của chôn thì đào được một lần', () => {
    const { s } = explored(6);
    const cua = poiPlots().find((id) => plotOf(id).bank === 'nam' && poiAt(id)!.kind === 'cua' && plotOf(id).i === 9)!;
    s.resources = { gao: 5000, voOc: 5000, datDa: 0, sat: 0 };
    openTo(s, cua);
    expect(s.benKia.dug).toEqual([cua]);
    expect(s.resources.datDa).toBeGreaterThan(0);
    expect(s.resources.sat).toBeGreaterThan(0);
  });

  it('đặc sản: công trình hợp nghề có móng nằm trọn trong khoảnh làm ra thêm 30%', () => {
    const { s } = explored(6);
    const phuSa = poiPlots().find((id) => plotOf(id).bank === 'nam' && poiAt(id)!.kind === 'dacSan' && plotOf(id).i === 8)!;
    openTo(s, phuSa);
    const o = plotOrigin(phuSa);
    const ruong = (place(s, 'ruong', o.x, o.z) as { value: Building }).value;
    ruong.workers = 4;
    expect(dacSanOf(ruong)).toBe('phuSa');
    const base = BUILDINGS.ruong.production[0].gao!;
    expect(outputIn(s, ruong).gao).toBeCloseTo(base * (1 + DAC_SAN_BONUS));
    // Lò rèn trên bãi phù sa thì không được gì thêm.
    expect(dacSanOf({ type: 'loRen', x: o.x, z: o.z })).toBe(null);
    // Móng chìa ra ngoài khoảnh thì không tính.
    expect(dacSanOf({ type: 'ruong', x: o.x + 2, z: o.z })).toBe(null);
  });

  it('cầu hư thì công trình bên kia không làm ra gì (dân không sang làm được)', () => {
    const { s, head } = explored(6);
    const o = plotOrigin(head);
    const ruong = (place(s, 'ruong', o.x, o.z) as { value: Building }).value;
    ruong.workers = 4;
    expect(outputIn(s, ruong).gao).toBeGreaterThan(0);
    s.buildings.find((b) => b.type === 'cauDa')!.damaged = true;
    expect(outputIn(s, ruong).gao ?? 0).toBe(0);
  });

  it('bản làng: khai phá tới nơi, dâng lễ thì về theo, làm ra bằng nửa công trình cùng nghề ở cấp Điện, không cần dân', () => {
    const { s } = explored(6);
    const lang = poiPlots().find((id) => plotOf(id).bank === 'nam' && poiAt(id)!.kind === 'lang' && plotOf(id).i === 4)!;
    expect(canJoinVillage(s, lang)).toEqual({ ok: false, reason: 'chuaKhaiPha' });
    openTo(s, lang);
    // Giữa làng là nhà làng, không dựng công trình được.
    const o = plotOrigin(lang);
    expect(canPlace(s, 'luy', o.x + 2, o.z + 2)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canPlace(s, 'luy', o.x, o.z).ok).toBe(true);
    const before = productionPerMinute(s).gao;
    const gao = s.resources.gao;
    expect(joinVillage(s, lang).ok).toBe(true);
    expect(gao - s.resources.gao).toBe(VILLAGE_GIFT.gao);
    expect(villageOutput(s, lang).gao).toBe(BUILDINGS.ruong.production[5].gao! * VILLAGE_SHARE);
    expect(productionPerMinute(s).gao - before).toBeCloseTo(BUILDINGS.ruong.production[5].gao! * VILLAGE_SHARE);
    expect(canJoinVillage(s, lang)).toEqual({ ok: false, reason: 'daVeTheo' });
  });

  it('bến dựng được sát sông ở bờ bên kia', () => {
    const { s, head } = explored(6);
    const o = plotOrigin(head);
    expect(canPlace(s, 'ben', o.x, o.z).ok).toBe(true);
    expect(canPlace(s, 'ben', o.x, o.z + 1)).toEqual({ ok: false, reason: 'phaiSatSong' });
  });

  it('lưu rồi nạp lại giữ làng đã về theo, của đã đào', () => {
    const { s } = explored(6);
    s.benKia.villages.push(14);
    s.benKia.dug.push(29);
    expect(deserialize(serialize(s))!.benKia).toEqual(s.benKia);
  });
});

describe('phòng thủ hai bờ', () => {
  /** Kinh đô có cầu sang bờ nam, làng lúa đã về theo, một kho, doanh trại; mọi đồn bờ nam đã dẹp. */
  function frontier(): { s: GameState; lang: number } {
    const s = rich(6);
    const head = freeRiverPlot('nam', 6);
    bridgeTo(s, head);
    s.benKia.cleared = poiPlots().filter((id) => poiAt(id)!.kind === 'don');
    s.benKia.known = [...Array(30).keys()];
    const lang = poiPlots().find((id) => plotOf(id).bank === 'nam' && poiAt(id)!.kind === 'lang' && plotOf(id).i === 4)!;
    const from = plotOf(head);
    for (let j = 1; j <= plotOf(lang).j; j++) openPlot(s, plotId('nam', from.i, j));
    for (let i = from.i - 1; i >= plotOf(lang).i; i--) openPlot(s, plotId('nam', i, plotOf(lang).j));
    expect(joinVillage(s, lang).ok).toBe(true);
    place(s, 'kho', 40, 30);
    s.buildings.push({ id: 950, type: 'doanhTrai', x: 30, z: 30, level: 5, workers: 0 });
    return { s, lang };
  }

  it('bờ bên kia có công trình thì cứ ba đợt giặc trên bộ có một đợt tới từ bìa rừng bên kia', () => {
    const s = rich(6);
    expect([0, 1, 2, 3, 4, 5].map((w) => landRaidSide(s, w, true))).toEqual(['bac', 'bac', 'bac', 'bac', 'bac', 'bac']);
    const { s: t } = frontier();
    expect([0, 1, 2, 3, 4, 5].map((w) => landRaidSide(t, w, false))).toEqual(['tay', 'tay', 'namXa', 'tay', 'tay', 'namXa']);
  });

  it('giặc bên kia ra từ bìa rừng bên kia, đánh làng trước tiên; làng hư thì thôi làm ra, sửa lại được', () => {
    const { s, lang } = frontier();
    const hall = villageHall(s, lang)!;
    const b = startBattle(s, 3, 'namXa', {});
    const foes = b.fighters.filter((f) => f.side === 'giac');
    expect(foes.every((f) => f.z >= 70)).toBe(true);
    for (let i = 0; i < 40; i++) stepBattle(s, b, 0.05);
    const targets = new Set(foes.map((f) => f.targetBuilding));
    expect(targets.has(hall.id)).toBe(true);
    hall.damaged = true;
    expect(villagesOutput(s).gao).toBe(0);
    expect(repair(s, hall.id).ok).toBe(true);
    expect(villagesOutput(s).gao).toBeGreaterThan(0);
  });

  it('cầu hư thì giặc bên kia không sang được: chỉ đánh công trình bên ấy', () => {
    const { s, lang } = frontier();
    s.buildings.find((b) => b.type === 'cauDa')!.damaged = true;
    villageHall(s, lang)!.damaged = true;
    const b = startBattle(s, 3, 'namXa', {});
    for (let i = 0; i < 40; i++) stepBattle(s, b, 0.05);
    const near = new Set(s.buildings.filter((x) => farBankOf(x.x, x.z) === null).map((x) => x.id));
    for (const f of b.fighters.filter((x) => x.side === 'giac')) expect(f.targetBuilding === null || !near.has(f.targetBuilding)).toBe(true);
  });

  it('đồn biên: chỉ dựng bên kia sông, mỗi bờ một; lính đóng ở đồn ra trận từ đồn', () => {
    const { s, lang } = frontier();
    const o = plotOrigin(lang);
    expect(canPlace(s, 'donBien', 20, 30)).toEqual({ ok: false, reason: 'phaiBenKia' });
    const spot = { x: o.x + 5, z: o.z };
    expect(place(s, 'donBien', spot.x, spot.z).ok).toBe(true);
    expect(canPlace(s, 'donBien', spot.x + 5, spot.z)).not.toEqual({ ok: true, value: undefined });
    s.troops = { giao: 10, cung: 4, voi: 0 };
    expect(setGarrison(s, 'nam', 'giao', 99)).toEqual({ ok: true, value: 10 });
    expect(setGarrison(s, 'nam', 'giao', 6)).toEqual({ ok: true, value: 6 });
    const fort = fortOf(s, 'nam')!;
    const b = startBattle(s, 1, 'bac', {});
    const ours = b.fighters.filter((f) => f.side === 'ta' && f.kind === 'giao');
    expect(ours.length).toBe(10);
    const atFort = ours.filter((f) => Math.abs(f.x - (fort.x + 2)) <= 2.5 && Math.abs(f.z - (fort.z + 2)) <= 2.5);
    expect(atFort.length).toBe(6);
  });
});
