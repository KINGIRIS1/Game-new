import { describe, expect, it } from 'vitest';
import { wallRings } from './coLoa';
import { CH1_LAST } from './campaign';
import { BUILDINGS, CH2_QUEST_START, CH3_QUEST_START, GIFT_IDS, MOVE_FRACTION, STAGES, type BuildingType } from './defs';
import { canMove, createInitialState, dienLevel, limitOf, move, moveCost, occupancy, place, type GameState } from './game';
import { MAU_BARRACKS, applyMau, canApplyMau, inFrame, mauSlots, mauUnlocked, planMau, MAU_IDS, type MauId } from './mau';
import { isOpen, khoanhOf } from './khoanh';
import { DIEN_HOME, GRID, RIVER_START, touchesRiver } from './map';
import { DIEN_END, bank, edge, setDien } from './testmap';
import { floodMap } from './terrain';

/** Kinh đô giàu của, đã qua kết chương 1, ở chương `chapter`, Điện cấp `dien`. */
function city(dien: number, chapter: 1 | 2 | 3 = 1): GameState {
  const s = createInitialState(0);
  setDien(s, dien);
  s.giong.ascended = true;
  s.story.seen.push('langLieu');
  s.questIndex = chapter === 3 ? CH3_QUEST_START : chapter === 2 ? CH2_QUEST_START : 0;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 };
  s.dan = 200;
  return s;
}

/** Có đủ tướng thường có ở cấp Điện `dien`: Gióng từ Điện 3, Sơn Tinh ở chương 2, An Dương Vương ở chương 3. */
function withGenerals(s: GameState, dien = dienLevel(s)): GameState {
  if (dien >= 3) {
    s.giong.fed = 5;
    s.giong.gear = { ngua: true, roi: true, giap: true };
  }
  if (s.questIndex >= CH2_QUEST_START && dien >= 6) for (const g of GIFT_IDS) s.son.gifts[g] = true;
  if (s.questIndex >= CH3_QUEST_START && dien >= 7) s.adv.no = true;
  return s;
}

describe('dời công trình', () => {
  it('dời mất 10% giá dựng, giữ cấp và người làm; Điện không dời được', () => {
    const s = city(5);
    const r = place(s, 'ruong', edge(5, 3), edge(5, 3));
    if (!r.ok) throw new Error(r.reason);
    r.value.level = 4;
    r.value.workers = 3;
    expect(moveCost(r.value)).toEqual({ voOc: Math.ceil(BUILDINGS.ruong.buildCost.voOc! * MOVE_FRACTION) });
    const before = s.resources.voOc;
    const m = move(s, r.value.id, edge(5, 8), edge(5, 8));
    expect(m.ok).toBe(true);
    expect(r.value).toMatchObject({ x: edge(5, 8), z: edge(5, 8), level: 4, workers: 3 });
    expect(s.resources.voOc).toBe(before - 3);
    expect(canMove(s, s.buildings[0].id, edge(5), edge(5))).toEqual({ ok: false, reason: 'khongTheDoi' });
  });

  it('không dời vào chỗ bận, ra ngoài vùng, bến xa sông, đang có giặc, hay khi thiếu của', () => {
    const s = city(5);
    const x0 = edge(5, 3);
    const a = place(s, 'nhaSan', x0, x0);
    const b = place(s, 'kho', x0 + 4, x0);
    const ben = place(s, 'ben', x0, bank('ben'));
    if (!a.ok || !b.ok || !ben.ok) throw new Error('đặt hỏng');
    expect(canMove(s, a.value.id, x0, x0)).toEqual({ ok: false, reason: 'trungCho' });
    expect(canMove(s, a.value.id, x0 + 2, x0)).toEqual({ ok: false, reason: 'datBiChiem' });
    // Dời lấn sang chính chỗ cũ của mình thì được.
    expect(canMove(s, a.value.id, x0 + 1, x0 + 1).ok).toBe(true);
    expect(canMove(s, a.value.id, 0, 0)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canMove(s, ben.value.id, x0, bank('ben', 5))).toEqual({ ok: false, reason: 'phaiSatSong' });
    expect(canMove(s, ben.value.id, x0 + 5, bank('ben')).ok).toBe(true);
    s.raid.phase = 'warning';
    expect(canMove(s, a.value.id, edge(5), edge(5))).toEqual({ ok: false, reason: 'dangCoGiac' });
    s.raid.phase = 'idle';
    s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
    expect(canMove(s, a.value.id, edge(5), edge(5))).toEqual({ ok: false, reason: 'thieuTaiNguyen' });
  });
});

/** Chương có ở cấp Điện `dien` để dùng mẫu `id`: Đê bao từ chương 2, Cổ Loa từ chương 3; Điện 7, 8 cần chương 3. */
const chapterFor = (id: MauId, dien: number): 1 | 2 | 3 => (id === 'coLoa' || dien >= 7 ? 3 : id === 'deBao' || dien >= 6 ? 2 : 1);
/** Cấp Điện mẫu mở được trong game: Phong Châu từ đầu; Đê bao, Cổ Loa mở theo truyện, khi Điện đã cấp 5 (màn 8 cần Điện 5). */
const levelsOf = (id: MauId): number[] => {
  const from = id === 'phongChau' ? 1 : STAGES[CH1_LAST - 1].minDien;
  return Array.from({ length: 9 - from }, (_, i) => from + i);
};
const SEGMENT_TYPES: BuildingType[] = ['luy', 'de', 'thanh', 'bayChong'];

describe('mẫu kinh đô', () => {
  it('ba mẫu giãn theo đất: ở mọi cấp Điện, chỗ nào cũng trong vùng đã khai phá, không chồng, không lấn sông, bến sát sông', () => {
    for (const id of MAU_IDS) {
      for (let dien = 1; dien <= 8; dien++) {
        const slots = mauSlots(id, dien);
        expect(slots.find((x) => x.type === 'dien'), `${id} Điện ${dien}`).toMatchObject({ x: DIEN_HOME, z: DIEN_HOME });
        const seen = new Set<number>();
        for (const x of slots) {
          const def = BUILDINGS[x.type];
          if (def.nearRiver) expect(touchesRiver(x.x, x.z, def.w, def.d)).toBe(true);
          for (let dx = 0; dx < def.w; dx++) {
            for (let dz = 0; dz < def.d; dz++) {
              expect(inFrame(x.x + dx, x.z + dz, dien), `${id} Điện ${dien}: ${x.type} ${x.x},${x.z}`).toBe(true);
              const i = (x.z + dz) * GRID + x.x + dx;
              expect(seen.has(i)).toBe(false);
              seen.add(i);
            }
          }
        }
        // Lũy, đê, thành, bẫy, chòi canh không quá số tối đa ở cấp Điện ấy.
        const s = city(dien, chapterFor(id, dien));
        for (const t of [...SEGMENT_TYPES, 'choiCanh'] as BuildingType[]) {
          expect(slots.filter((x) => x.type === t).length, `${id} Điện ${dien}: ${t}`).toBeLessThanOrEqual(limitOf(s, t));
        }
      }
    }
  });

  it('ở mọi cấp Điện mẫu mở được, mỗi loại trong mẫu đủ chỗ cho số tối đa (kể cả đền, Hội Tết, ba nơi ở)', () => {
    for (const id of MAU_IDS) {
      const types = [...new Set(mauSlots(id, 8).map((x) => x.type))].filter((t) => t !== 'dien' && !SEGMENT_TYPES.includes(t));
      expect(types).toEqual(expect.arrayContaining(['doanhTrai', 'traiGiao', 'traiCung', 'chuongVoi', 'ruongNep', 'vuon', 'chuongLon', 'bep', 'denPhuDong']));
      for (const dien of levelsOf(id)) {
        const s = city(dien, chapterFor(id, dien));
        const slots = mauSlots(id, dien);
        for (const t of types) {
          // Đền, Hội Tết mở sau kết chương 1, mà màn cuối chương 1 cần Điện 5: dưới Điện 5 mẫu không chừa chỗ.
          // Doanh trại: mỗi tướng thường có ở cấp Điện ấy một chỗ.
          const want = t === 'doanhTrai' ? MAU_BARRACKS[dien - 1] : BUILDINGS[t].unlock && dien < STAGES[CH1_LAST - 1].minDien ? 0 : limitOf(s, t);
          expect(slots.filter((x) => x.type === t).length, `${id} Điện ${dien}: ${t}`).toBe(want);
        }
      }
    }
  });

  it('mỗi tướng một doanh trại: mẫu chừa đủ chỗ cho các tướng thường có ở từng cấp Điện', () => {
    expect(MAU_BARRACKS.slice(1)).toEqual([1, 2, 2, 2, 3, 4, 4]);
    for (const id of MAU_IDS) {
      for (const dien of levelsOf(id)) {
        const s = withGenerals(city(dien, chapterFor(id, dien)), dien);
        expect(mauSlots(id, dien).filter((x) => x.type === 'doanhTrai').length, `${id} Điện ${dien}`).toBeGreaterThanOrEqual(limitOf(s, 'doanhTrai'));
      }
    }
  });

  it('áp mẫu dựng thêm doanh trại cho tướng rảnh, giữ tướng và bố trí của trại cũ', () => {
    const s = withGenerals(city(7, 3), 7);
    const first = place(s, 'doanhTrai', edge(7, 1), edge(7, 1));
    if (!first.ok) throw new Error(first.reason);
    first.value.tuong = 'anDuong';
    first.value.guard = { giao: 3, cung: 0, voi: 0 };
    for (const id of ['coLoa', 'deBao', 'phongChau'] as const) {
      expect(applyMau(s, id).ok, id).toBe(true);
      const camps = s.buildings.filter((b) => b.type === 'doanhTrai');
      expect(camps.length).toBe(4);
      const slots = mauSlots(id, 7);
      for (const b of camps) expect(slots.some((x) => x.type === 'doanhTrai' && x.x === b.x && x.z === b.z), `${id}: ${b.x},${b.z}`).toBe(true);
      expect(first.value).toMatchObject({ tuong: 'anDuong', guard: { giao: 3, cung: 0, voi: 0 } });
    }
  });

  it('lũy, đê, bẫy chạy theo bìa đất ở từng cấp Điện', () => {
    const at = (slots: { type: BuildingType; x: number; z: number }[], t: BuildingType, x: number, z: number) =>
      slots.some((o) => o.type === t && o.x === x && o.z === z);
    // Phong Châu: lũy tre liền một hàng ngay trong bìa rừng, cả mặt bắc và mặt tây, từ góc rừng tới sông; bẫy ở hàng ngoài lũy.
    for (const dien of levelsOf('phongChau')) {
      const slots = mauSlots('phongChau', dien);
      for (let k = edge(dien, 1); k < RIVER_START; k++) {
        expect(at(slots, 'luy', k, edge(dien, 1)) && at(slots, 'luy', edge(dien, 1), k), `Điện ${dien}: lũy ở ${k}`).toBe(true);
      }
      for (const b of slots.filter((x) => x.type === 'bayChong')) expect(Math.min(b.x, b.z)).toBe(edge(dien));
    }
    // Đê bao, Cổ Loa: đê liền dải cách sông 3 ô, chạy suốt tới bìa đất ở cả hai bờ.
    for (const id of ['deBao', 'coLoa'] as const) {
      for (const dien of levelsOf(id)) {
        const slots = mauSlots(id, dien);
        for (let k = edge(dien); k <= bank('ben', 1); k++) {
          expect(at(slots, 'de', bank('ben', 1), k) && at(slots, 'de', k, bank('ben', 1)), `${id} Điện ${dien}: đê ở ${k}`).toBe(true);
        }
      }
    }
  });

  it('mỗi chương mở một mẫu', () => {
    const s = city(5);
    expect(MAU_IDS.filter((id) => mauUnlocked(s, id))).toEqual(['phongChau']);
    expect(canApplyMau(s, 'deBao')).toEqual({ ok: false, reason: 'canChuong2' });
    s.questIndex = CH3_QUEST_START;
    expect(MAU_IDS.filter((id) => mauUnlocked(s, id))).toEqual(MAU_IDS);
  });

  it('áp mẫu: dời mọi công trình vào chỗ trong mẫu, dựng thêm phần thiếu, trả đủ giá, giữ cấp và người làm', () => {
    const s = city(5);
    const r1 = place(s, 'ruong', edge(5), edge(5));
    const r2 = place(s, 'nhaSan', edge(5, 28), edge(5, 28));
    const luy = place(s, 'luy', edge(5, 13), edge(5, 13));
    if (!r1.ok || !r2.ok || !luy.ok) throw new Error('đặt hỏng');
    r1.value.level = 5;
    r1.value.workers = 4;
    const plan = planMau(s, 'phongChau');
    const before = { ...s.resources };
    const res = applyMau(s, 'phongChau');
    expect(res.ok).toBe(true);
    for (const r of ['gao', 'voOc', 'datDa', 'sat'] as const) expect(s.resources[r]).toBeCloseTo(before[r] - (plan.cost[r] ?? 0), 5);
    // Ruộng cấp 5 vẫn cấp 5, vẫn 4 người làm, giờ đứng ở một chỗ ruộng của mẫu.
    const slots = mauSlots('phongChau', 5);
    expect(slots.some((x) => x.type === 'ruong' && x.x === r1.value.x && x.z === r1.value.z)).toBe(true);
    expect(r1.value).toMatchObject({ level: 5, workers: 4 });
    // Mọi công trình đứng đúng chỗ mẫu, không chồng nhau, số mỗi loại không quá giới hạn.
    for (const b of s.buildings) expect(slots.some((x) => x.type === b.type && x.x === b.x && x.z === b.z), `${b.type} ${b.x},${b.z}`).toBe(true);
    const grid = occupancy(s);
    let cells = 0;
    for (const b of s.buildings) cells += BUILDINGS[b.type].w * BUILDINGS[b.type].d;
    expect(grid.filter((v) => v > 0).length).toBe(cells);
    for (const t of Object.keys(BUILDINGS) as BuildingType[]) expect(s.buildings.filter((b) => b.type === t).length).toBeLessThanOrEqual(Math.max(limitOf(s, t), 1));
    expect(s.buildings.filter((b) => b.type === 'ruong').length).toBe(limitOf(s, 'ruong'));
    // Áp lần nữa thì không còn gì để làm.
    expect(canApplyMau(s, 'phongChau')).toEqual({ ok: false, reason: 'daTheoMau' });
  });

  it('áp mẫu dựng nơi ở riêng của binh chủng theo cấp doanh trại: cấp 1 trại giáo, cấp 3 thêm trại cung, chuồng voi', () => {
    const s = city(5);
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    const count = (t: BuildingType) => s.buildings.filter((b) => b.type === t).length;
    // Doanh trại dựng theo mẫu ở cấp 1: trại giáo dựng cùng lúc, trại cung và chuồng voi thì chưa.
    expect(count('doanhTrai')).toBe(1);
    expect(count('traiGiao')).toBe(1);
    expect(count('traiCung')).toBe(0);
    expect(count('chuongVoi')).toBe(0);
    s.buildings.find((b) => b.type === 'doanhTrai')!.level = 3;
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    expect(count('traiCung')).toBe(1);
    expect(count('chuongVoi')).toBe(1);
  });

  it('thiếu của thì không áp được, kinh đô giữ nguyên', () => {
    const s = city(5);
    s.resources = { gao: 100, voOc: 100, datDa: 100, sat: 0 };
    const snapshot = JSON.stringify(s.buildings);
    expect(canApplyMau(s, 'phongChau')).toEqual({ ok: false, reason: 'thieuTaiNguyen' });
    expect(applyMau(s, 'phongChau').ok).toBe(false);
    expect(JSON.stringify(s.buildings)).toBe(snapshot);
  });

  it('đất mở theo khoảnh không vuông: áp mẫu bỏ qua chỗ của mẫu nằm trong khoảnh rừng chưa phát', () => {
    for (const id of MAU_IDS) {
      const s = city(7, 3);
      // Bỏ hai khoảnh ở góc rừng của khung mẫu: đất đã mở không còn vuông.
      const lo = edge(7);
      const drop = [khoanhOf(lo, lo), khoanhOf(lo + 5, lo)];
      s.khoanh = s.khoanh.filter((k) => !drop.includes(k));
      const wild = mauSlots(id, 7).filter((x) => !isOpen(s, x.x, x.z));
      expect(wild.length, id).toBeGreaterThan(0);
      expect(applyMau(s, id).ok, id).toBe(true);
      for (const b of s.buildings) {
        const def = BUILDINGS[b.type];
        for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) expect(isOpen(s, b.x + dx, b.z + dz), `${id}: ${b.type} ${b.x},${b.z}`).toBe(true);
      }
    }
  });

  it('Điện cấp thấp: chỉ xếp vào chỗ trong vùng đã khai phá, dựng tới giới hạn theo cấp Điện', () => {
    const s = city(3);
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    for (const b of s.buildings) {
      const def = BUILDINGS[b.type];
      for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) expect(isOpen(s, b.x + dx, b.z + dz)).toBe(true);
    }
    expect(s.buildings.filter((b) => b.type === 'ruong').length).toBe(limitOf(s, 'ruong'));
    expect(s.buildings.filter((b) => b.type === 'luy').length).toBeLessThanOrEqual(limitOf(s, 'luy'));
  });

  it('mẫu Đê bao: đê liền dải, lũ bậc 3 không ngập công trình nào ngoài bến, ở mọi cấp Điện từ 5', () => {
    for (const dien of levelsOf('deBao')) {
      const s = city(dien, chapterFor('deBao', dien));
      expect(applyMau(s, 'deBao').ok).toBe(true);
      const wet = floodMap(s, 3);
      for (const b of s.buildings) {
        if (b.type === 'ben' || b.type === 'de') continue;
        const def = BUILDINGS[b.type];
        for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) expect(wet[(b.z + dz) * GRID + b.x + dx], `Điện ${dien}: ${b.type} ${b.x},${b.z}`).toBe(0);
      }
    }
  });

  it('mẫu Cổ Loa: ba vòng thành kín quanh Điện ở mọi cấp Điện từ 5, vòng ngoài nới ra theo đất; đê bao giữ được lũ bậc 3', () => {
    let outer = Infinity;
    for (const dien of levelsOf('coLoa')) {
      const s = city(dien, 3);
      expect(applyMau(s, 'coLoa').ok).toBe(true);
      expect(wallRings(s), `Điện ${dien}`).toBe(3);
      const wet = floodMap(s, 3);
      for (const b of s.buildings) {
        if (b.type === 'ben' || b.type === 'de') continue;
        const def = BUILDINGS[b.type];
        for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) expect(wet[(b.z + dz) * GRID + b.x + dx], `Điện ${dien}: ${b.type} ${b.x},${b.z}`).toBe(0);
      }
      // Vòng ngoài không co lại khi đất rộng ra, và tới Điện 8 thì đã nới ra.
      const west = Math.min(...mauSlots('coLoa', dien).filter((x) => x.type === 'thanh').map((x) => x.x));
      expect(west, `Điện ${dien}`).toBeLessThanOrEqual(outer);
      outer = west;
    }
    expect(outer).toBeLessThan(Math.min(...mauSlots('coLoa', 5).filter((x) => x.type === 'thanh').map((x) => x.x)));
    // Vòng trong chỉ có Điện và sân.
    const slots = mauSlots('coLoa', 8);
    const inner = Math.max(...slots.filter((x) => x.type === 'thanh' && x.z < DIEN_HOME && x.x > DIEN_HOME).map((x) => x.z));
    for (const x of slots) if (x.type !== 'dien' && x.type !== 'thanh') expect(x.x > inner && x.z > inner && x.x < DIEN_END + 2 && x.z < DIEN_END + 2, `${x.type} ${x.x},${x.z}`).toBe(false);
  });

  it('nâng Điện rồi áp lại: lũy ra tới bìa đất mới, công trình cũ giữ cấp, dựng thêm cho đủ số tối đa mới', () => {
    const s = city(3);
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    const ruong = s.buildings.find((b) => b.type === 'ruong')!;
    ruong.level = 3;
    setDien(s, 4);
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    expect(ruong.level).toBe(3);
    const luy = s.buildings.filter((b) => b.type === 'luy');
    expect(luy.length).toBeGreaterThan(0);
    for (const b of luy) expect(Math.min(b.x, b.z)).toBe(edge(4, 1));
    expect(s.buildings.filter((b) => b.type === 'ruong').length).toBe(limitOf(s, 'ruong'));
    for (const b of s.buildings) {
      const def = BUILDINGS[b.type];
      for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) expect(isOpen(s, b.x + dx, b.z + dz)).toBe(true);
    }
    expect(canApplyMau(s, 'phongChau')).toEqual({ ok: false, reason: 'daTheoMau' });
  });

  it('đổi mẫu: đoạn lũy cũ vướng thành Cổ Loa bị dỡ, công trình không có chỗ trong mẫu tìm chỗ trống gần nhất', () => {
    const s = city(7, 3);
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    const luyBefore = s.buildings.filter((b) => b.type === 'luy').length;
    expect(luyBefore).toBeGreaterThan(0);
    const plan = planMau(s, 'coLoa');
    expect(plan.stuck).toEqual([]);
    expect(applyMau(s, 'coLoa').ok).toBe(true);
    expect(wallRings(s)).toBe(3);
    // Không còn hai công trình nào chồng lên nhau.
    let cells = 0;
    for (const b of s.buildings) cells += BUILDINGS[b.type].w * BUILDINGS[b.type].d;
    expect(occupancy(s).filter((v) => v > 0).length).toBe(cells);
  });
});
