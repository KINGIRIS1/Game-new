// Vùng đất bên kia sông: lưới nới qua sông (bờ nam sông Đà, bờ đông sông Thao, ngã ba sông), bản lưu 18; khoảnh,
// điểm lạ và vùng đồn bên kia; cầu (đặt, đầu cầu, đi qua, lũ cuốn, vòng thành hở), trinh sát, đoạn truyện.

import { describe, expect, it } from 'vitest';
import { findPath, startBattle, stepBattle } from './battle';
import {
  BANKS,
  CAMP1_ARMY,
  CAMPS,
  FAR_ALONG,
  FAR_PLOTS,
  bridgeheadPlots,
  bridgeSnap,
  campOf,
  campTier,
  canScout,
  canStartCamp,
  isBenKiaState,
  plotAt,
  plotHeld,
  plotId,
  plotNeighbors,
  plotOf,
  plotOrigin,
  poiAt,
  poiPlots,
  regionOf,
  sendScout,
  startCamp,
  type Bank,
} from './benKia';
import type { HeroSetup } from './battle';
import { wallRings } from './coLoa';
import { BRIDGE_FLOOD, BUILDINGS, CH2_QUEST_START, CH3_QUEST_START, FIELD, FIELD_CAP, SCOUT_COST, SCOUT_MS, UNITS, type UnitType } from './defs';
import { armySpace } from './doanhTrai';
import { canMove, canPlace, createInitialState, place, tick, type Building, type GameState } from './game';
import { FAR_FOREST, GRID, RIVER_DIVE, RIVER_END, RIVER_START, baseHeights, farBankOf, isNearBank, isRiver, riverDistance } from './map';
import { planMau } from './mau';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { pendingStory } from './story';
import { drowns, floodMap } from './terrain';
import { edge, setDien } from './testmap';
import { HALF_ARMY, HALF_ARMY4, SAMPLE_ARMY, SAMPLE_ARMY4, SEEDS, fightField } from './testkit';

/** Dấu vân tay độ cao tự nhiên của lưới 55×55 trước khi nới lưới (tính từ `map.ts` cũ). */
const OLD_FINGERPRINT = 3373663266;
const OLD_GRID = 55;

describe('lưới qua sông', () => {
  it('sông rộng 7 ô; sông Thao chảy tới ngã ba rồi đổ vào sông Đà, sông Đà chảy suốt bề ngang', () => {
    expect(GRID).toBe(76);
    expect(RIVER_END - RIVER_START).toBe(7);
    for (let x = RIVER_START; x < RIVER_END; x++) for (const z of [0, 20, 51, 52, 58]) expect(isRiver(x, z)).toBe(true);
    for (let z = RIVER_START; z < RIVER_END; z++) for (const x of [0, 20, 51, 60, GRID - 1]) expect(isRiver(x, z)).toBe(true);
    // Qua ngã ba, sông Thao không chảy tiếp: bờ nam liền một dải.
    expect(isRiver(55, RIVER_END)).toBe(false);
    expect(isRiver(65, 65)).toBe(false);
    expect(isRiver(51, 51)).toBe(false);
    expect(isRiver(RIVER_END, 10)).toBe(false);
    expect(isRiver(10, RIVER_END)).toBe(false);
    // Thủy quái, thuyền giặc chỉ dùng ba ô sông sát bờ bên này, như khi sông trong lưới còn rộng 3 ô.
    expect(RIVER_DIVE).toBe(55);
  });

  it('hai bờ bên kia: bờ nam sông Đà (cả góc sau ngã ba), bờ đông sông Thao', () => {
    expect(farBankOf(10, 65)).toBe('nam');
    expect(farBankOf(65, 65)).toBe('nam');
    expect(farBankOf(65, 10)).toBe('dong');
    expect(farBankOf(10, 10)).toBe(null);
    expect(farBankOf(55, 10)).toBe(null);
    expect(farBankOf(65, 55)).toBe(null);
    expect(isNearBank(51, 51)).toBe(true);
    expect(isNearBank(52, 10)).toBe(false);
    expect(isNearBank(65, 10)).toBe(false);
    // Mỗi bờ sâu 3 khoảnh 5×5, rồi hai ô rừng ngoài cùng.
    expect(FAR_FOREST - RIVER_END).toBe(15);
    expect(GRID - FAR_FOREST).toBe(2);
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
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) {
        if (isRiver(x, z)) expect(h[z * GRID + x]).toBe(-1);
        else expect(h[z * GRID + x]).toBeLessThanOrEqual(3);
      }
    }
    expect(riverDistance(10, RIVER_END)).toBe(0);
    expect(riverDistance(RIVER_END + 4, 10)).toBe(4);
    expect(riverDistance(RIVER_END + 8, RIVER_START - 2)).toBe(1);
  });

  it('bờ bên kia chưa khai phá: không xây được, lũ không tràn vào', () => {
    const s: GameState = createInitialState(0);
    s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
    expect(canPlace(s, 'nhaSan', 20, 65).ok).toBe(false);
    expect(canPlace(s, 'nhaSan', 65, 20).ok).toBe(false);
    expect(canPlace(s, 'nhaSan', 54, 20).ok).toBe(false);
    const wet = floodMap(s, 3);
    for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) if (farBankOf(x, z)) expect(wet[z * GRID + x]).toBe(0);
  });
});

describe('nâng bản lưu 17 lên 18', () => {
  /** Đưa state hiện tại về dạng bản lưu 17: mảng độ cao 55×55, ô 52–54 là sông. */
  function asV17(s: GameState): Record<string, any> {
    const raw = JSON.parse(serialize(s));
    raw.version = 17;
    const old: number[] = [];
    for (let z = 0; z < OLD_GRID; z++) for (let x = 0; x < OLD_GRID; x++) old.push(s.heights[z * GRID + x]);
    raw.heights = old;
    return raw;
  }

  it('dàn lại độ cao, giữ đất đã đắp bên này, sông và bờ bên kia lấy độ cao tự nhiên', () => {
    const s = createInitialState(0);
    s.heights[40 * GRID + 30] = 4;
    const back = deserialize(JSON.stringify(asV17(s)))!;
    expect(back).toBeDefined();
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.heights.length).toBe(GRID * GRID);
    expect(back.heights[40 * GRID + 30]).toBe(4);
    expect(back.heights).toEqual(s.heights);
  });

  it('trận giữ kinh đô đang dở: đường đi của giặc đổi theo chỉ số ô mới, đánh tiếp được', () => {
    const s = createInitialState(0);
    const battle = startBattle(s, 1, 'bac');
    for (let i = 0; i < 40; i++) stepBattle(s, battle, 0.05);
    s.raid.phase = 'battle';
    s.raid.battle = battle;
    const walking = battle.fighters.filter((f) => f.path && f.path.length > 1);
    expect(walking.length).toBeGreaterThan(0);
    const raw = asV17(s);
    const toOld = (i: number) => Math.floor(i / GRID) * OLD_GRID + (i % GRID);
    for (const f of raw.raid.battle.fighters) if (f.path) f.path = f.path.map(toOld);
    const back = deserialize(JSON.stringify(raw))!;
    expect(back).toBeDefined();
    expect(back.raid.battle!.fighters.map((f) => f.path)).toEqual(battle.fighters.map((f) => f.path));
    for (let i = 0; i < 20; i++) stepBattle(back, back.raid.battle!, 0.05);
  });

  it('bản lưu mới giữ nguyên qua lưu rồi nạp', () => {
    const s = createInitialState(0);
    const back = deserialize(serialize(s))!;
    expect(back.heights).toEqual(s.heights);
  });
});

/** Kinh đô ở Điện `level`, kho đầy. */
function rich(level = 4): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  return s;
}

/** Khoảnh bên kia sát sông, đối diện vùng đất bên này đã khai phá ở Điện `level`, không có đồn, gần ngã ba nhất. */
function freeRiverPlot(bank: Bank, level: number): number {
  for (let i = FAR_ALONG - 1; i >= 0; i--) {
    const id = plotId(bank, i, 0);
    const o = plotOrigin(id);
    const along = bank === 'nam' ? o.x : o.z;
    if (along >= edge(level) && poiAt(id)?.kind !== 'don') return id;
  }
  throw new Error('không có khoảnh trống');
}

/** Bắc cầu sang khoảnh sát sông `id` (đầu cầu vào giữa khoảnh). */
function bridgeTo(s: GameState, id: number): Building {
  const { bank } = plotOf(id);
  const o = plotOrigin(id);
  const r = bank === 'nam' ? place(s, 'cauSongDa', o.x + 1, RIVER_START) : place(s, 'cauSongThao', RIVER_START, o.z + 1);
  if (!r.ok) throw new Error(r.reason);
  return r.value;
}

describe('khoảnh, điểm lạ và vùng đồn bên kia sông', () => {
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
    expect(plotAt(60, 60)).toBe(null);
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

  it('mỗi khoảnh thuộc vùng một đồn; vùng liền một dải, có chính khoảnh của đồn; đồn bậc thấp sát sông', () => {
    for (const bank of BANKS) {
      const camps = poiPlots().filter((id) => plotOf(id).bank === bank && poiAt(id)!.kind === 'don');
      let total = 0;
      for (const camp of camps) {
        const tier = (poiAt(camp) as { tier: number }).tier;
        expect(plotOf(camp).j, `đồn bậc ${tier}`).toBe(tier === 1 ? 0 : tier === 2 ? 1 : 2);
        const region = regionOf(camp);
        expect(region).toContain(camp);
        expect(region.every((id) => campOf(id) === camp)).toBe(true);
        // Liền một dải (đi theo bốn hướng trong vùng).
        const seen = new Set([camp]);
        const queue = [camp];
        while (queue.length) for (const n of plotNeighbors(queue.pop()!)) if (!seen.has(n) && campOf(n) === camp) seen.add(n), queue.push(n);
        expect(seen.size).toBe(region.length);
        total += region.length;
      }
      expect(total).toBe(30);
    }
  });

  it('làng nằm trong vùng đồn bậc 2 trở lên; vùng đồn bậc 1 gần ngã ba có một đặc sản và một của chôn', () => {
    for (const bank of BANKS) {
      for (const id of poiPlots().filter((p) => plotOf(p).bank === bank)) {
        const p = poiAt(id)!;
        const tier = (poiAt(campOf(id)) as { tier: number }).tier;
        if (p.kind === 'lang') expect(tier, `${bank} làng ${p.nghe}`).toBeGreaterThanOrEqual(2);
      }
      const near = regionOf(plotId(bank, 8, 0)).map((id) => poiAt(id)?.kind);
      expect(near).toContain('dacSan');
      expect(near).toContain('cua');
    }
  });
});

describe('cầu qua sông', () => {
  it('có từ Điện cấp 4, mỗi sông một cầu; cầu bám theo sông khi chạm', () => {
    const s = rich(3);
    const id = freeRiverPlot('nam', 3);
    const o = plotOrigin(id);
    expect(canPlace(s, 'cauSongDa', o.x + 1, RIVER_START)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 4);
    expect(canPlace(s, 'cauSongDa', o.x + 1, RIVER_START).ok).toBe(true);
    bridgeTo(s, id);
    expect(canPlace(s, 'cauSongDa', o.x - 3, RIVER_START)).toEqual({ ok: false, reason: 'datGioiHan' });
    bridgeTo(s, freeRiverPlot('dong', 4));
    expect(s.buildings.filter((b) => b.type === 'cauSongDa' || b.type === 'cauSongThao').length).toBe(2);
    expect(bridgeSnap('cauSongDa', 30.4, 20)).toEqual({ x: 30, z: RIVER_START });
    expect(bridgeSnap('cauSongThao', 10, 70)).toEqual({ x: RIVER_START, z: RIVER_START - BUILDINGS.cauSongThao.d });
  });

  it('vắt qua đúng 7 ô sông, đầu bên này trên đất đã khai phá, không bắc thẳng vào đồn giặc', () => {
    const s = rich();
    expect(BUILDINGS.cauSongDa.d).toBe(RIVER_END - RIVER_START);
    expect(BUILDINGS.cauSongThao.w).toBe(RIVER_END - RIVER_START);
    const id = freeRiverPlot('nam', 4);
    const o = plotOrigin(id);
    expect(canPlace(s, 'cauSongDa', o.x + 1, RIVER_START - 1)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canPlace(s, 'cauSongDa', o.x + 1, RIVER_START + 1)).toEqual({ ok: false, reason: 'ngoaiVung' });
    // Đầu bên này trong rừng chưa phát.
    expect(canPlace(s, 'cauSongDa', 3, RIVER_START)).toEqual({ ok: false, reason: 'ngoaiVung' });
    const camp = poiPlots().find((p) => plotOf(p).bank === 'nam' && plotOf(p).j === 0 && poiAt(p)!.kind === 'don' && plotOrigin(p).x >= edge(4))!;
    expect(canPlace(s, 'cauSongDa', plotOrigin(camp).x + 1, RIVER_START)).toEqual({ ok: false, reason: 'dauCauCoDon' });
    expect(canPlace(s, 'cauSongThao', RIVER_START, 30).ok).toBe(true);
    expect(canPlace(s, 'cauSongThao', RIVER_START + 1, 30)).toEqual({ ok: false, reason: 'ngoaiVung' });
  });

  it('bắc xong thì khoảnh đầu cầu được dò và mở, dựng được công trình bên kia; cầu không dời được', () => {
    const s = rich();
    const id = freeRiverPlot('nam', 4);
    const b = bridgeTo(s, id);
    expect(bridgeheadPlots('cauSongDa', b.x, b.z)).toEqual([id]);
    expect(s.benKia.known).toEqual([id]);
    expect(s.benKia.open).toEqual([id]);
    // Đầu cầu mở dù vùng ấy còn đồn giặc giữ.
    expect(plotHeld(s, id)).toBe(true);
    const o = plotOrigin(id);
    expect(place(s, 'nhaSan', o.x, o.z + 1).ok).toBe(true);
    // Khoảnh bên cạnh chưa mở.
    expect(canPlace(s, 'luy', o.x + 5, o.z + 1)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canMove(s, b.id, b.x + 5, b.z)).toEqual({ ok: false, reason: 'cauKhongDoi' });
    // Ô đầu cầu hai bờ chừa làm lối lên cầu; đường đi thì trải được.
    expect(canPlace(s, 'nhaSan', b.x, o.z)).toEqual({ ok: false, reason: 'chanLoiCau' });
    expect(canPlace(s, 'nhaSan', b.x, RIVER_START - 3)).toEqual({ ok: false, reason: 'chanLoiCau' });
    expect(canPlace(s, 'duongDat', b.x, RIVER_START - 1).ok).toBe(true);
    expect(canPlace(s, 'duongDat', b.x + 1, o.z).ok).toBe(true);
  });

  it('giặc và quân đi qua cầu còn nguyên, cầu hư thì không qua được', () => {
    const s = rich();
    const id = freeRiverPlot('nam', 4);
    const o = plotOrigin(id);
    const kho = place(s, 'kho', 40, 30);
    if (!kho.ok) throw new Error(kho.reason);
    const from = { x: o.x + 2, z: o.z + 8 };
    expect(findPath(s, from.x, from.z, kho.value)).toBeNull();
    const b = bridgeTo(s, id);
    const path = findPath(s, from.x, from.z, kho.value)!;
    expect(path).not.toBeNull();
    expect(path.some((i) => isRiver(i % GRID, Math.floor(i / GRID)))).toBe(true);
    b.damaged = true;
    expect(findPath(s, from.x, from.z, kho.value)).toBeNull();
  });

  it('lũ cuốn cầu phao tre ở bậc 2, cầu gỗ ở bậc 3, cầu gỗ lớn không sợ lũ', () => {
    const s = rich(7);
    const b = bridgeTo(s, freeRiverPlot('nam', 7));
    const wet = floodMap(s, 3);
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
    const wet = floodMap(s, 1);
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
    s.raid.nextAt = null;
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
    const nha = place(s, 'nhaSan', o.x, o.z + 1);
    if (!nha.ok) throw new Error(nha.reason);
    const plan = planMau(s, 'phongChau');
    expect(plan.moves.some((m) => m.id === nha.value.id || m.id === b.id)).toBe(false);
    expect(plan.removes).not.toContain(b.id);
    const def = BUILDINGS.cauSongDa;
    for (const slot of [...plan.builds, ...plan.moves.map((m) => ({ ...m, type: s.buildings.find((x) => x.id === m.id)!.type }))]) {
      const sd = BUILDINGS[slot.type];
      for (let x = b.x; x < b.x + def.w; x++) {
        const inside = x >= slot.x && x < slot.x + sd.w && RIVER_START - 1 >= slot.z && RIVER_START - 1 < slot.z + sd.d;
        expect(inside, `${slot.type} ${slot.x},${slot.z}`).toBe(false);
      }
    }
  });

  it('lưu rồi nạp lại giữ khoảnh đã dò, đã mở, trinh sát đang đi; dữ liệu hỏng thì bỏ', () => {
    const s = rich();
    const id = freeRiverPlot('dong', 4);
    bridgeTo(s, id);
    sendScout(s, plotNeighbors(id)[0]);
    const back = deserialize(serialize(s))!;
    expect(back.benKia).toEqual(s.benKia);
    expect(back.buildings).toEqual(s.buildings);
    for (const bad of [{ ...s.benKia, known: [60] }, { ...s.benKia, open: [3, 3] }, { ...s.benKia, scouts: [{ plot: 1 }] }, { known: [], open: [] }]) {
      expect(isBenKiaState(bad)).toBe(false);
      const raw = JSON.parse(serialize(s));
      raw.benKia = bad;
      expect(deserialize(JSON.stringify(raw))).toBeUndefined();
    }
    // Bản lưu 18 chưa có phần bên kia (lưu từ bản dựng dở): thêm vào.
    const raw = JSON.parse(serialize(createInitialState(0)));
    delete raw.benKia;
    expect(deserialize(JSON.stringify(raw))!.benKia).toEqual({ known: [], open: [], scouts: [], cleared: [] });
  });
});

describe('đồn giặc và điều quân', () => {
  /** Đồn bậc `tier` trên bờ nam, đã dò. */
  function campAt(s: GameState, tier: number): number {
    const id = poiPlots().find((p) => plotOf(p).bank === 'nam' && campTier(p) === tier)!;
    if (!s.benKia.known.includes(id)) s.benKia.known = [...s.benKia.known, id];
    return id;
  }
  /** Kinh đô có doanh trại, cầu sang bờ nam, lính đủ đánh. */
  function ready(level = 4): GameState {
    const s = rich(level);
    s.buildings.push({ id: 900, type: 'doanhTrai', x: 30, z: 30, level: 4, workers: 0 });
    bridgeTo(s, freeRiverPlot('nam', level));
    s.troops = { giao: 14, cung: 8, voi: 2, no: 0 };
    return s;
  }

  it('đánh được khi đã dò thấy đồn, có doanh trại, có cầu còn nguyên, tới đúng chương', () => {
    const s = ready();
    const t1 = campAt(s, 1);
    expect(canStartCamp(s, t1).ok).toBe(true);
    const t2 = campAt(s, 2);
    expect(canStartCamp(s, t2)).toEqual({ ok: false, reason: 'canChuong2' });
    s.questIndex = CH2_QUEST_START;
    expect(canStartCamp(s, t2).ok).toBe(true);
    expect(canStartCamp(s, campAt(s, 3))).toEqual({ ok: false, reason: 'canChuong3' });
    s.questIndex = CH3_QUEST_START;
    expect(canStartCamp(s, campAt(s, 3)).ok).toBe(true);
    expect(canStartCamp(s, campAt(s, 4))).toEqual({ ok: false, reason: 'canChuong4' });
    const bridge = s.buildings.find((b) => b.type === 'cauSongDa')!;
    bridge.damaged = true;
    expect(canStartCamp(s, t1)).toEqual({ ok: false, reason: 'cauHu' });
    s.buildings = s.buildings.filter((b) => b.id !== 900);
    bridge.damaged = false;
    expect(canStartCamp(s, t1)).toEqual({ ok: false, reason: 'canDoanhTrai' });
    s.benKia.known = s.benKia.known.filter((id) => id !== t1);
    expect(canStartCamp(s, t1)).toEqual({ ok: false, reason: 'khongTimThay' });
  });

  it('thắng thì dẹp đồn, nhận thưởng một lần, cả vùng của đồn được dò và mở; lính tử trận mất hẳn', () => {
    const s = ready();
    s.raid.nextAt = null;
    const id = campAt(s, 1);
    const region = regionOf(id);
    for (const p of region) if (p !== id) expect(plotHeld(s, p)).toBe(true);
    const army = { ...s.troops };
    const before = { ...s.resources };
    expect(startCamp(s, id, army, { giao: 'tien', cung: 'hau', voi: 'trung', no: 'hau' }).ok).toBe(true);
    expect(s.campaign.battle?.camp).toBe(id);
    for (let i = 0; i < 200 && s.campaign.battle && !s.campaign.battle.outcome; i++) tick(s, 1000);
    expect(s.campaign.battle?.outcome).toBe('win');
    const r = s.campaign.lastResult!;
    expect(r.camp).toBe(id);
    expect(r.reward).toEqual(CAMPS[1].reward);
    expect(s.resources.sat).toBeGreaterThanOrEqual(before.sat);
    expect(s.benKia.cleared).toEqual([id]);
    for (const p of region) {
      expect(s.benKia.known).toContain(p);
      expect(s.benKia.open).toContain(p);
      expect(plotHeld(s, p)).toBe(false);
    }
    // Vùng đồn khác chưa mở: chỉ có thêm khoảnh đầu cầu.
    const head = freeRiverPlot('nam', 4);
    expect(s.benKia.open.every((p) => campOf(p) === id || p === head)).toBe(true);
    expect(canStartCamp(s, id)).toEqual({ ok: false, reason: 'donDaDep' });
    // Thắng đồn không phải thắng màn phó bản.
    expect(s.campaign.cleared).toBe(0);
    for (const k of ['giao', 'cung', 'voi'] as const) expect(s.troops[k]).toBe(army[k] - r.lost[k]);
    // Dựng được công trình trên vùng vừa chiếm.
    const far = region.find((p) => p !== id && !poiAt(p))!;
    const o = plotOrigin(far);
    expect(canPlace(s, 'nhaSan', o.x + 1, o.z + 1).ok).toBe(true);
  });

  it('quân mẫu bậc 1 vừa số chỗ một trận ở Điện 4; không mang quá số chỗ; mỗi đồn không quá 30 giặc', () => {
    expect(armySpace(CAMP1_ARMY)).toBeLessThanOrEqual(FIELD_CAP[3]);
    const s = ready();
    const id = campAt(s, 1);
    s.troops = { giao: 40, cung: 0, voi: 0, no: 0 };
    expect(startCamp(s, id, { giao: 40, cung: 0, voi: 0, no: 0 }, { giao: 'tien', cung: 'hau', voi: 'trung', no: 'hau' })).toEqual({ ok: false, reason: 'quaChoPhoBan' });
    for (const def of Object.values(CAMPS)) expect(Object.values(def.enemies).reduce((a, b) => a + (b ?? 0), 0)).toBeLessThanOrEqual(30);
    expect(UNITS.voi.space).toBeGreaterThan(1);
  });

  // Chuẩn cân bằng phó bản: người chơi thường thắng; không tướng hay nửa quân thì chơi giỏi cũng thua.
  // Đồn bậc 1 như màn chương 1: quân mẫu thắng không cần tướng, nửa quân thua.
  it('đồn bậc 1: quân mẫu thắng không cần tướng, nửa quân thua', () => {
    const half: Record<UnitType, number> = { giao: 5, cung: 3, voi: 1, no: 0 };
    for (const id of SEEDS) {
      const won = fightField(CAMPS[1], CAMP1_ARMY, null, 'thuong', id);
      expect(won.outcome).toBe('win');
      expect(won.t).toBeLessThan(FIELD.maxS);
      expect(fightField(CAMPS[1], half, null, 'gioi', id).outcome).toBe('lose');
    }
  });
  const HEROES: [2 | 3 | 4, string, HeroSetup][] = [
    [2, 'Gióng hiển linh', { kind: 'giong', bamboo: true, glow: true, non: false }],
    [3, 'Sơn Tinh hiển linh', { kind: 'sonTinh', bamboo: false, glow: true, non: true }],
    [4, 'An Dương Vương', { kind: 'anDuong', bamboo: false, glow: false, non: false, kimQuy: true }],
  ];
  for (const [tier, name, hero] of HEROES) {
    it(`đồn bậc ${tier}: người chơi thường có ${name} thì thắng; không tướng, hay nửa quân, chơi giỏi cũng thua`, () => {
      const def = CAMPS[tier];
      const army = tier === 4 ? SAMPLE_ARMY4 : SAMPLE_ARMY;
      const half = tier === 4 ? HALF_ARMY4 : HALF_ARMY;
      for (const id of SEEDS) {
        const won = fightField(def, army, hero, 'thuong', id);
        expect(won.outcome).toBe('win');
        expect(won.t).toBeLessThan(FIELD.maxS);
        expect(fightField(def, army, null, 'gioi', id).outcome).toBe('lose');
        expect(fightField(def, half, hero, 'gioi', id).outcome).toBe('lose');
      }
    });
  }
});
