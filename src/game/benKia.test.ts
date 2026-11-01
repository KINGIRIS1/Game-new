// Vùng đất bên kia sông: lưới nới qua sông (bờ nam sông Đà, bờ đông sông Thao, ngã ba sông).

import { describe, expect, it } from 'vitest';
import { findPath } from './battle';
import {
  BANKS,
  FAR_ALONG,
  FAR_PLOTS,
  bridgeheadPlots,
  canScout,
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
import { BRIDGE_FLOOD, BUILDINGS, SCOUT_COST, SCOUT_MS } from './defs';
import { canMove, canPlace, createInitialState, place, tick, type Building, type GameState } from './game';
import { planMau } from './mau';
import { FAR_FOREST, GRID, RIVER_END, RIVER_START, areaStart, baseHeights, farBankOf, isRiver, isUnlocked, riverDistance } from './map';
import { deserialize, serialize } from './save';
import { pendingStory } from './story';
import { drowns, floodMap } from './terrain';
import { setDien } from './testmap';

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
