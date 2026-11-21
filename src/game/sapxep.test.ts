import { describe, expect, it } from 'vitest';
import { wallRings } from './coLoa';
import { CH1_LAST } from './campaign';
import { BUILDINGS, CH2_QUEST_START, raiseBuildingCost, CH3_QUEST_START, CH4_QUEST_START, GIFT_IDS, MOVE_FRACTION, ROAD_LIMIT, STAGES, U_NO, canHem, isRoad, type BuildingType } from './defs';
import { NO_RAISE, canMove, createInitialState, dienLevel, limitOf, move, moveCost, occupancy, place, rotOf, rotateBuilding, satNha, uNoCount, usedOf, type GameState } from './game';
import { BAC_NGHIA_LINH, BAC_THANG, applyMau, bacNghiaLinh, bacThangMo, doiNghiaLinh, canApplyMau, inFrame, mauDuong, mauFrom, mauSlots, mauUnlocked, planMau, MAU_IDS, type MauId } from './mau';
import { isOpen, khoanhOf } from './khoanh';
import { DIEN_HOME, GRID, RIVER_END, RIVER_START, isNearBank, touchesRiver } from './map';
import { DIEN_END, bank, edge, setDien } from './testmap';
import { floodHits, floodMap, groundOf } from './terrain';

/** Kinh đô giàu của, đã qua kết chương 1, ở chương `chapter`, Điện cấp `dien`. */
function city(dien: number, chapter: 1 | 2 | 3 | 4 = 1): GameState {
  const s = createInitialState(0);
  setDien(s, dien);
  s.giong.ascended = true;
  s.story.seen.push('langLieu');
  s.questIndex = [0, 0, CH2_QUEST_START, CH3_QUEST_START, CH4_QUEST_START][chapter];
  // Chương 4 đã hộ giá vua ra biển: mở Đền Cuông.
  if (chapter === 4) s.adv.bien = true;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  s.dan = 200;
  return s;
}

/** Có đủ tướng thường có ở cấp Điện `dien`: Gióng từ Điện 3, Sơn Tinh ở chương 2, An Dương Vương ở chương 3, Cao Lỗ ở chương 4. */
function withGenerals(s: GameState, dien = dienLevel(s)): GameState {
  if (dien >= 3) {
    s.giong.fed = 5;
    s.giong.gear = { ngua: true, roi: true, giap: true };
  }
  if (s.questIndex >= CH2_QUEST_START && dien >= 6) for (const g of GIFT_IDS) s.son.gifts[g] = true;
  if (s.questIndex >= CH3_QUEST_START && dien >= 7) s.adv.no = true;
  if (s.questIndex >= CH4_QUEST_START && dien >= 8) s.campaign.cleared = 25;
  return s;
}

describe('dời công trình', () => {
  it('dời mất 10% giá dựng, giữ cấp và người làm', () => {
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
  });

  it('Điện dời được trong đất bên này sông, không tốn của, giữ cấp; không sang bên kia sông', () => {
    const s = city(5);
    const dien = s.buildings[0];
    expect(dien.type).toBe('dien');
    expect(moveCost(dien)).toEqual({});
    const before = { ...s.resources };
    expect(move(s, dien.id, edge(5, 1), edge(5, 1)).ok).toBe(true);
    expect(dien).toMatchObject({ x: edge(5, 1), z: edge(5, 1), level: 5 });
    expect(s.resources).toEqual(before);
    expect(canMove(s, dien.id, RIVER_END, edge(5, 1))).toEqual({ ok: false, reason: 'khongTheDoi' });
    expect(canMove(s, dien.id, edge(5, 1), RIVER_START - 5)).toEqual({ ok: false, reason: 'khongTheDoi' });
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
    s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 };
    expect(canMove(s, a.value.id, edge(5), edge(5))).toEqual({ ok: false, reason: 'thieuTaiNguyen' });
  });
});

/**
 * Chương có ở cấp Điện `dien` để dùng mẫu `id`: Đê bao từ chương 2, Cổ Loa từ chương 3, Cổ Loa giữ sông từ chương 4;
 * Điện 7 cần chương 3, Điện 8 cần chương 4.
 */
const chapterFor = (id: MauId, dien: number): 1 | 2 | 3 | 4 =>
  id === 'coLoaSong' || dien >= 8 ? 4 : id === 'coLoa' || dien >= 7 ? 3 : id === 'deBao' || id === 'nghiaLinh' || dien >= 6 ? 2 : 1;
/** Cấp Điện mẫu mở được trong game: Phong Châu từ đầu; Đê bao, Cổ Loa mở theo truyện, khi Điện đã cấp 5 (màn 8 cần Điện 5). */
const levelsOf = (id: MauId): number[] => {
  const from = id === 'phongChau' ? 1 : STAGES[CH1_LAST - 1].minDien;
  return Array.from({ length: 11 - from }, (_, i) => from + i);
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
              expect(inFrame(x.x + dx, x.z + dz, dien, id), `${id} Điện ${dien}: ${x.type} ${x.x},${x.z}`).toBe(true);
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
  }, 30000);

  it('ở mọi cấp Điện mẫu mở được, mỗi loại trong mẫu đủ chỗ cho số tối đa (kể cả đền, Hội Tết, ba nơi ở)', () => {
    for (const id of MAU_IDS) {
      const types = [...new Set(mauSlots(id, 8).map((x) => x.type))].filter((t) => t !== 'dien' && !SEGMENT_TYPES.includes(t));
      expect(types).toEqual(expect.arrayContaining(['doanhTrai', 'traiGiao', 'traiCung', 'chuongVoi', 'ruongNep', 'vuon', 'chuongLon', 'bep', 'denPhuDong']));
      for (const dien of levelsOf(id)) {
        const s = city(dien, chapterFor(id, dien));
        const slots = mauSlots(id, dien);
        for (const t of types) {
          // Đền, Hội Tết mở sau kết chương 1, mà màn cuối chương 1 cần Điện 5: dưới Điện 5 mẫu không chừa chỗ.
          // Hồ Kim Quy (8×8): mẫu Cổ Loa giữ sông chỉ chừa chỗ từ Điện 6 (`mauFrom`).
          const want = (BUILDINGS[t].unlock && dien < STAGES[CH1_LAST - 1].minDien) || dien < mauFrom(id, t) ? 0 : limitOf(s, t);
          expect(slots.filter((x) => x.type === t).length, `${id} Điện ${dien}: ${t}`).toBe(want);
        }
      }
    }
  });

  it('một doanh trại: mẫu nào cũng chừa đúng một chỗ 8×8 từ Điện 2, dù có bao nhiêu tướng', () => {
    for (const id of MAU_IDS) {
      for (const dien of levelsOf(id)) {
        const s = withGenerals(city(dien, chapterFor(id, dien)), dien);
        expect(limitOf(s, 'doanhTrai')).toBe(dien >= 2 ? 1 : 0);
        expect(mauSlots(id, dien).filter((x) => x.type === 'doanhTrai').length, `${id} Điện ${dien}`).toBe(limitOf(s, 'doanhTrai'));
      }
    }
  });

  it('áp mẫu dời doanh trại về chỗ của mẫu, giữ cấp và bố trí giữ kinh đô', () => {
    const s = withGenerals(city(7, 3), 7);
    const first = place(s, 'doanhTrai', edge(7, 1), edge(7, 1));
    if (!first.ok) throw new Error(first.reason);
    first.value.level = 4;
    first.value.guard = { giao: 3, cung: 0, voi: 0, no: 0 };
    for (const id of ['coLoa', 'deBao', 'phongChau'] as const) {
      expect(applyMau(s, id).ok, id).toBe(true);
      const camps = s.buildings.filter((b) => b.type === 'doanhTrai');
      expect(camps).toEqual([first.value]);
      const slots = mauSlots(id, 7);
      expect(slots.some((x) => x.type === 'doanhTrai' && x.x === first.value.x && x.z === first.value.z), `${id}: ${first.value.x},${first.value.z}`).toBe(true);
      expect(first.value).toMatchObject({ level: 4, guard: { giao: 3, cung: 0, voi: 0, no: 0 } });
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
    for (const id of ['deBao', 'coLoa', 'coLoaSong'] as const) {
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
    expect(MAU_IDS.filter((id) => mauUnlocked(s, id))).toEqual(['phongChau', 'deBao', 'nghiaLinh', 'coLoa']);
    expect(canApplyMau(s, 'coLoaSong')).toEqual({ ok: false, reason: 'canChuong4' });
    s.questIndex = CH4_QUEST_START;
    expect(MAU_IDS.filter((id) => mauUnlocked(s, id))).toEqual(MAU_IDS);
  });

  it('áp mẫu: dời mọi công trình vào chỗ trong mẫu, dựng thêm phần thiếu, trả đủ giá, giữ cấp và người làm', () => {
    const s = city(5);
    const r1 = place(s, 'ruong', edge(5), edge(5));
    const r2 = place(s, 'nhaSan', edge(5, 33), edge(5, 33));
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
    // Mọi công trình đứng đúng chỗ mẫu (trừ đường gánh hàng mẫu trải thêm), không chồng nhau, số mỗi loại không quá
    // giới hạn.
    for (const b of s.buildings) {
      if (!isRoad(b.type)) expect(slots.some((x) => x.type === b.type && x.x === b.x && x.z === b.z), `${b.type} ${b.x},${b.z}`).toBe(true);
    }
    expect(s.buildings.filter((b) => isRoad(b.type)).map((b) => ({ x: b.x, z: b.z }))).toEqual(plan.duong);
    const grid = occupancy(s);
    let cells = 0;
    for (const b of s.buildings) cells += BUILDINGS[b.type].w * BUILDINGS[b.type].d;
    expect(grid.filter((v) => v > 0).length).toBe(cells);
    for (const t of Object.keys(BUILDINGS) as BuildingType[]) expect(s.buildings.filter((b) => b.type === t).length).toBeLessThanOrEqual(Math.max(limitOf(s, t), 1));
    expect(s.buildings.filter((b) => b.type === 'ruong').length).toBe(limitOf(s, 'ruong'));
    // Áp lần nữa thì không còn gì để làm.
    expect(canApplyMau(s, 'phongChau')).toEqual({ ok: false, reason: 'daTheoMau' });
  });

  it('đường của mẫu: mọi công trình nhiều ô giáp đường, đường nối về Điện, kho (qua cổng, qua đê), chỉ đi ngang dọc, không chồng chỗ, trong giới hạn', () => {
    for (const id of MAU_IDS) {
      for (const dien of levelsOf(id)) {
        const at = `${id} Điện ${dien}`;
        const slots = mauSlots(id, dien);
        const duong = mauDuong(id, dien);
        expect(duong.length, at).toBeLessThanOrEqual(ROAD_LIMIT[dien - 1]);
        const road = new Uint8Array(GRID * GRID);
        for (const r of duong) {
          expect(inFrame(r.x, r.z, dien, id), `${at}: đường ${r.x},${r.z}`).toBe(true);
          road[r.z * GRID + r.x] = 1;
        }
        const owner = new Map<number, (typeof slots)[number]>();
        for (const x of slots) {
          const def = BUILDINGS[x.type];
          for (let dz = 0; dz < def.d; dz++) {
            for (let dx = 0; dx < def.w; dx++) {
              const i = (x.z + dz) * GRID + x.x + dx;
              expect(road[i], `${at}: ${x.type} ${x.x},${x.z} đè đường`).toBe(0);
              owner.set(i, x);
            }
          }
        }
        const isRoadAt = (x: number, z: number) => x >= 0 && z >= 0 && x < GRID && z < GRID && road[z * GRID + x] === 1;
        // Không có đường xéo: hai ô đường chéo góc nhau thì phải có ô đường chung cạnh nối chúng.
        for (const r of duong) {
          for (const [dx, dz] of [
            [1, 1],
            [1, -1],
          ]) {
            if (isRoadAt(r.x + dx, r.z + dz)) {
              expect(isRoadAt(r.x + dx, r.z) || isRoadAt(r.x, r.z + dz), `${at}: đường xéo ở ${r.x},${r.z}`).toBe(true);
            }
          }
          const n = [isRoadAt(r.x + 1, r.z), isRoadAt(r.x - 1, r.z), isRoadAt(r.x, r.z + 1), isRoadAt(r.x, r.z - 1)].filter(Boolean).length;
          expect(n, `${at}: ô đường lẻ ${r.x},${r.z}`).toBeGreaterThan(0);
        }
        // Mạng đi được: ô đường, ô đê (dân gánh qua đê), ô cổng thành; loang từ viền Điện, kho.
        const walk = (i: number) => road[i] === 1 || owner.get(i)?.type === 'de' || !!owner.get(i)?.cong;
        const rim = (x: (typeof slots)[number]) => {
          const w = BUILDINGS[x.type].w;
          const out: number[] = [];
          for (let k = 0; k < w; k++) out.push((x.z - 1) * GRID + x.x + k, (x.z + w) * GRID + x.x + k, (x.z + k) * GRID + x.x - 1, (x.z + k) * GRID + x.x + w);
          return out.filter((i) => i >= 0 && i < GRID * GRID);
        };
        const seen = new Uint8Array(GRID * GRID);
        const queue = slots.filter((x) => x.type === 'dien' || x.type === 'kho').flatMap(rim).filter((i) => road[i]);
        for (const i of queue) seen[i] = 1;
        while (queue.length) {
          const i = queue.pop()!;
          for (const j of [i + 1, i - 1, i + GRID, i - GRID]) {
            if (j < 0 || j >= GRID * GRID || seen[j] || !walk(j)) continue;
            seen[j] = 1;
            queue.push(j);
          }
        }
        for (const x of slots) {
          if (BUILDINGS[x.type].w === 1) continue;
          const doors = rim(x).filter((i) => road[i] || (BUILDINGS[x.type].nearRiver && owner.get(i)?.type === 'de' && seen[i]));
          // Điện trong vòng thành trong cùng của Cổ Loa: vòng không có cổng, chỉ có đường quanh Điện; Điện 5–6 không đủ
          // đoạn thành cho vòng trong chừa đường, vòng ôm sát Điện.
          if (x.type === 'dien') {
            if (!doors.length) expect(rim(x).every((i) => owner.get(i)?.type === 'thanh'), at).toBe(true);
            continue;
          }
          expect(doors.length, `${at}: ${x.type} ${x.x},${x.z} không giáp đường`).toBeGreaterThan(0);
          expect(doors.some((i) => seen[i]), `${at}: ${x.type} ${x.x},${x.z} không có đường về kho, Điện`).toBe(true);
        }
      }
    }
  });

  it('áp mẫu trải đường của mẫu (đường đất, xong ngay), giữ đường đang có trên đường mẫu, áp lần hai không còn gì', () => {
    const cases: [MauId, 1 | 2 | 3 | 4, number][] = [
      ['phongChau', 1, 3],
      ['phongChau', 1, 5],
      ['deBao', 2, 6],
      ['coLoa', 3, 7],
      ['coLoaSong', 4, 8],
      ['coLoaSong', 4, 10],
    ];
    for (const [id, chapter, dien] of cases) {
      const s = withGenerals(city(dien, chapter));
      // Một ô đường lát đá đang nằm đúng đường mẫu: giữ nguyên, không trải đè.
      const keep = mauDuong(id, dien)[0];
      expect(place(s, 'duongDa', keep.x, keep.z).ok, `${id} Điện ${dien}`).toBe(true);
      const plan = planMau(s, id);
      expect(applyMau(s, id).ok, `${id} Điện ${dien}`).toBe(true);
      const roads = s.buildings.filter((b) => isRoad(b.type));
      expect(roads.length).toBe(plan.duong.length + 1);
      expect(roads.find((b) => b.x === keep.x && b.z === keep.z)?.type).toBe('duongDa');
      expect(roads.length).toBeLessThanOrEqual(ROAD_LIMIT[dien - 1]);
      for (const b of roads) expect(isOpen(s, b.x, b.z)).toBe(true);
      // Đường mẫu trên đất đã mở đều đã trải.
      const want = mauDuong(id, dien).filter((r) => isOpen(s, r.x, r.z));
      const have = new Set(roads.map((b) => b.z * GRID + b.x));
      expect(want.every((r) => have.has(r.z * GRID + r.x)), `${id} Điện ${dien}`).toBe(true);
      expect(canApplyMau(s, id), `${id} Điện ${dien} lần hai`).toEqual({ ok: false, reason: 'daTheoMau' });
    }
  });

  it('áp mẫu đưa Điện đã dời, đã xoay về chỗ của mẫu, mặt trước quay ra sông; dời Điện không tốn của', () => {
    const s = city(5);
    const dien = s.buildings[0];
    expect(move(s, dien.id, edge(5, 1), edge(5, 1), 2).ok).toBe(true);
    expect(rotOf(dien)).toBe(2);
    const plan = planMau(s, 'phongChau');
    expect(plan.turnDien).toBe(true);
    expect(plan.moves).toContainEqual({ id: dien.id, x: DIEN_HOME, z: DIEN_HOME });
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    expect(dien).toMatchObject({ x: DIEN_HOME, z: DIEN_HOME, level: 5 });
    expect('rot' in dien).toBe(false);
    expect(canApplyMau(s, 'phongChau')).toEqual({ ok: false, reason: 'daTheoMau' });
    // Chỉ xoay Điện tại chỗ thì áp mẫu cũng quay Điện lại.
    expect(rotateBuilding(s, dien.id, 1).ok).toBe(true);
    expect(planMau(s, 'phongChau')).toMatchObject({ turnDien: true, moves: [] });
    expect(canApplyMau(s, 'phongChau').ok).toBe(true);
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
    s.resources = { gao: 100, voOc: 100, datDa: 100, sat: 0, go: 0 };
    const snapshot = JSON.stringify(s.buildings);
    expect(canApplyMau(s, 'phongChau')).toEqual({ ok: false, reason: 'thieuTaiNguyen' });
    expect(applyMau(s, 'phongChau').ok).toBe(false);
    expect(JSON.stringify(s.buildings)).toBe(snapshot);
  });

  it('đất mở theo khoảnh không vuông: áp mẫu bỏ qua chỗ của mẫu nằm trong khoảnh rừng chưa phát', () => {
    for (const id of MAU_IDS) {
      const s = city(7, chapterFor(id, 7));
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

  it('mẫu Đê bao: đê liền dải, lũ bậc 3 không ngập công trình nào ngoài bến, làng chài, ở mọi cấp Điện từ 5', () => {
    for (const dien of levelsOf('deBao')) {
      const s = city(dien, chapterFor('deBao', dien));
      expect(applyMau(s, 'deBao').ok).toBe(true);
      const wet = floodMap(s, 3);
      for (const b of s.buildings) {
        if (BUILDINGS[b.type].nearRiver || b.type === 'de') continue;
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
        if (BUILDINGS[b.type].nearRiver || b.type === 'de') continue;
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

  it('mẫu Cổ Loa giữ sông: ba vòng thành và đê bao giữ lũ bậc 3; 16 ụ nỏ trên vòng ngoài chia đều bốn mặt; lầu nỏ vào chỗ dành riêng; có trại nỏ, Đền Cuông', () => {
    const slots = mauSlots('coLoaSong', 8);
    const thanh = slots.filter((x) => x.type === 'thanh');
    const outer = Math.min(...thanh.map((x) => x.x));
    const far = Math.max(...thanh.map((x) => x.x));
    const u = slots.filter((x) => x.uNo);
    expect(u.length).toBe(U_NO.limit[7]);
    expect(u.every((x) => x.type === 'thanh' && (x.x === outer || x.z === outer || x.x === far || x.z === far))).toBe(true);
    for (const side of [(x: { x: number; z: number }) => x.z === outer, (x: { x: number; z: number }) => x.x === outer, (x: { x: number; z: number }) => x.z === far, (x: { x: number; z: number }) => x.x === far]) {
      expect(u.filter(side).length).toBeGreaterThanOrEqual(3);
    }
    expect(slots.filter((x) => x.lau).length).toBe(3);
    for (const t of ['traiNo', 'denCuong'] as const) expect(slots.filter((x) => x.type === t).length, t).toBe(1);
    // Áp mẫu ở Điện 8: đủ ba vòng, lũ bậc 3 không ngập công trình nào, dựng đủ 16 ụ nỏ.
    const s = withGenerals(city(8, 4), 8);
    // Có sẵn một lầu nỏ: áp mẫu thì lầu nỏ đứng vào chỗ dành cho lầu nỏ.
    const lau = place(s, 'choiCanh', edge(8, 3), edge(8, 3));
    if (!lau.ok) throw new Error(lau.reason);
    lau.value.type = 'lauNo';
    const plan = planMau(s, 'coLoaSong');
    expect(plan.stuck).toEqual([]);
    expect(applyMau(s, 'coLoaSong').ok).toBe(true);
    expect(wallRings(s)).toBe(3);
    expect(uNoCount(s)).toBe(U_NO.limit[7]);
    expect(slots.some((x) => x.lau && x.x === lau.value.x && x.z === lau.value.z)).toBe(true);
    expect(usedOf(s, 'choiCanh')).toBe(limitOf(s, 'choiCanh'));
    const wet = floodMap(s, 3);
    for (const b of s.buildings) {
      if (BUILDINGS[b.type].nearRiver || b.type === 'de') continue;
      const def = BUILDINGS[b.type];
      for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) expect(wet[(b.z + dz) * GRID + b.x + dx], `${b.type} ${b.x},${b.z}`).toBe(0);
    }
    expect(canApplyMau(s, 'coLoaSong')).toEqual({ ok: false, reason: 'daTheoMau' });
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

/** Số cặp công trình nhiều ô kề cạnh nhau mà phải chừa hẻm (`canHem`; kề góc chéo không tính). */
function capSat(slots: { type: BuildingType; x: number; z: number }[]): number {
  const sl = slots.filter((s) => BUILDINGS[s.type].w > 1);
  let n = 0;
  for (let i = 0; i < sl.length; i++) {
    for (let j = i + 1; j < sl.length; j++) {
      const a = sl[i];
      const b = sl[j];
      const wa = BUILDINGS[a.type].w;
      const wb = BUILDINGS[b.type].w;
      const ox = a.x < b.x + wb && b.x < a.x + wa;
      const oz = a.z < b.z + wb && b.z < a.z + wa;
      const ke = (ox && (a.z + wa === b.z || b.z + wb === a.z)) || (oz && (a.x + wa === b.x || b.x + wb === a.x));
      if (ke && canHem(a.type, b.type)) n++;
    }
  }
  return n;
}

describe('hẻm giữa các nhà', () => {
  it('canHem: nhà nhiều ô với nhau phải chừa hẻm; ruộng, vườn liền bờ được; công trình một ô, đường, đồ trang trí không tính', () => {
    expect(canHem('nhaSan', 'kho')).toBe(true);
    expect(canHem('ruong', 'nhaSan')).toBe(true);
    expect(canHem('ruong', 'ruongNep')).toBe(false);
    expect(canHem('vuon', 'ruong')).toBe(false);
    expect(canHem('nhaSan', 'luy')).toBe(false);
    expect(canHem('nhaSan', 'duongDat')).toBe(false);
  });

  it('đặt tay: satNha nhắc khi móng kề cạnh nhà khác (không chặn), kề góc chéo, chừa hẻm, ruộng liền ruộng, hay dời chính nó thì không', () => {
    const s = city(5);
    const x = edge(5, 6);
    const r = place(s, 'nhaSan', x, x);
    expect(r.ok).toBe(true);
    const id = r.ok ? r.value.id : -1;
    expect(satNha(s, 'kho', x + 3, x)).toBe(true);
    expect(satNha(s, 'kho', x, x + 3)).toBe(true);
    expect(satNha(s, 'kho', x + 3, x + 3)).toBe(false);
    expect(satNha(s, 'kho', x + 4, x)).toBe(false);
    expect(satNha(s, 'nhaSan', x + 3, x, id)).toBe(false);
    expect(place(s, 'kho', x + 3, x).ok).toBe(true);
    const f = place(s, 'ruong', x, x + 8);
    expect(f.ok).toBe(true);
    expect(satNha(s, 'ruongNep', x + 4, x + 8)).toBe(false);
    expect(satNha(s, 'nhaSan', x + 4, x + 8)).toBe(true);
  });

  it('mẫu Phong Châu, Đê bao từ Điện 4 chừa hẻm giữa mọi nhà; mẫu nào, cấp nào cũng ít cặp nhà sát nhau hơn cách xếp khít cũ', () => {
    for (const id of MAU_IDS) {
      for (const dien of levelsOf(id)) {
        const hem = capSat(mauSlots(id, dien));
        if ((id === 'phongChau' || id === 'deBao') && dien >= 4) expect(hem, `${id} Điện ${dien}`).toBe(0);
        expect(hem, `${id} Điện ${dien}`).toBeLessThanOrEqual(capSat(mauSlots(id, dien, true)));
      }
    }
  });
});

describe('mẫu kinh đô đắp bậc thang', () => {
  const laRuong = (t: BuildingType) => t === 'ruong' || t === 'ruongNep';
  /** Ô từ móng tới sông bờ bên này. */
  const toSong = (b: { type: BuildingType; x: number; z: number }) => Math.min(RIVER_START - (b.x + BUILDINGS[b.type].w), RIVER_START - (b.z + BUILDINGS[b.type].d));
  /** Áp mẫu `id` hai lần trên hai bản sao: tắt và bật đắp bậc thang. */
  const both = (id: MauId, dien: number) => {
    const off = city(dien, chapterFor(id, dien));
    const on = structuredClone(off);
    const plan = planMau(on, id);
    const before = on.resources.datDa;
    expect(applyMau(off, id, false).ok).toBe(true);
    expect(applyMau(on, id).ok, `${id} Điện ${dien}`).toBe(true);
    return { off, on, plan, spent: before - on.resources.datDa };
  };

  it('chương 1 chưa đắp đất: áp mẫu không đắp, độ cao như tắt đắp', () => {
    const s = city(5, 1);
    expect(bacThangMo(s)).toBe(false);
    const plan = planMau(s, 'phongChau');
    expect(plan.dap).toEqual([]);
    expect(plan.dapCost).toEqual({});
    const off = structuredClone(s);
    applyMau(s, 'phongChau');
    applyMau(off, 'phongChau', false);
    expect(s.heights).toEqual(off.heights);
  });

  it('từ chương 2 tắt đắp thì không tốn thêm, độ cao như cũ', () => {
    const s = city(6, 2);
    expect(bacThangMo(s)).toBe(true);
    const on = planMau(s, 'phongChau');
    const off = planMau(s, 'phongChau', false);
    expect(on.dap.length).toBeGreaterThan(0);
    expect(off.dap).toEqual([]);
    expect((on.cost.datDa ?? 0) - (off.cost.datDa ?? 0)).toBe(on.dapCost.datDa);
  });

  it('mẫu Nghĩa Lĩnh là đồi liền khối: Điện cao nhất, đất và công trình thấp dần ra xa và xuống sông, ruộng giữ nguyên đất', () => {
    for (const lv of [6, 8, 10]) {
      const { off, on, plan, spent } = both('nghiaLinh', lv);
      const dien = on.buildings.find((b) => b.type === 'dien')!;
      const top = groundOf(on, dien);
      expect(top).toBe(BAC_NGHIA_LINH.dien);
      let dap = 0;
      for (const b of on.buildings) {
        const a = off.buildings.find((o) => o.id === b.id)!;
        const def = BUILDINGS[b.type];
        const ha = groundOf(off, a);
        const hb = groundOf(on, b);
        const tang = !NO_RAISE.includes(b.type) && !def.nearRiver && !isRoad(b.type) && def.w > 1 && !def.decor;
        if (tang) for (let k = ha; k < hb; k++) dap += raiseBuildingCost(def.w, def.d, k).datDa ?? 0;
        if (b.type === 'dien') continue;
        if (tang) expect(hb, `${lv}: ${b.type} ${b.x},${b.z}`).toBeGreaterThanOrEqual(bacNghiaLinh(b.type, b.x, b.z));
        // Không công trình nào cao hơn Điện (đất tự nhiên sẵn cao thì bằng, mẫu không hạ đất); ruộng không đắp.
        if (tang) expect(hb, `${lv}: ${b.type}`).toBeLessThanOrEqual(top);
        if (tang && hb > ha) expect(hb, `${lv}: ${b.type} đắp`).toBeLessThan(top);
        if (laRuong(b.type)) expect(hb, `${lv}: ruộng ${b.x},${b.z}`).toBe(ha);
      }
      // Ô trống, ô đường trong vùng đắp lên đúng bậc đồi, giá bằng một phần giá đắp ô thường.
      expect(plan.doi.length).toBeGreaterThan(0);
      let doi = 0;
      for (const d of plan.doi) {
        expect(d.h).toBe(doiNghiaLinh(d.x, d.z));
        expect(on.heights[d.z * GRID + d.x]).toBe(d.h);
        const h0 = Math.max(off.heights[d.z * GRID + d.x] ?? 0, 0);
        expect(h0).toBeLessThan(d.h);
        for (let k = h0; k < d.h; k++) doi += (20 + 10 * k) * BAC_NGHIA_LINH.gia;
      }
      expect(plan.dapCost.datDa).toBe(dap + Math.round(doi / 5) * 5);
      expect(spent).toBe(plan.cost.datDa);
      // Đồi thoải: hai ô trống kề nhau trong vùng đắp chênh nhau không quá một bậc; quanh Điện là bậc cao nhất, sát sông
      // giữ nguyên đất.
      for (const d of plan.doi) {
        for (const [dx, dz] of [[1, 0], [0, 1]]) expect(Math.abs(doiNghiaLinh(d.x + dx, d.z + dz) - doiNghiaLinh(d.x, d.z))).toBeLessThanOrEqual(1);
      }
      expect(doiNghiaLinh(DIEN_HOME - 1, DIEN_HOME + 2)).toBe(BAC_NGHIA_LINH.dien);
      expect(doiNghiaLinh(RIVER_START - 1, DIEN_HOME)).toBe(0);
      // Ruộng sát sông: có ruộng cách sông không quá một đê và một dải bến.
      const toSong = (b: { type: BuildingType; x: number; z: number }) =>
        Math.min(RIVER_START - (b.x + BUILDINGS[b.type].w), RIVER_START - (b.z + BUILDINGS[b.type].d));
      const ruong = on.buildings.filter((b) => laRuong(b.type) && isNearBank(b.x, b.z));
      expect(ruong.length).toBeGreaterThan(0);
      expect(Math.min(...ruong.map(toSong)), String(lv)).toBeLessThanOrEqual(BUILDINGS.ben.w + 2);
      const again = planMau(on, 'nghiaLinh');
      expect(again.dap).toEqual([]);
      expect(again.doi).toEqual([]);
    }
  });

  it('bốn mẫu đủ ba tầng: Điện bậc 3, công trình quanh Điện bậc 2, ruộng thấp hơn; giá đắp khớp tổng đắp nền từng công trình', () => {
    for (const id of MAU_IDS.filter((m) => m !== 'nghiaLinh')) {
      const { off, on, plan, spent } = both(id, 8);
      const dien = on.buildings.find((b) => b.type === 'dien')!;
      expect(groundOf(on, dien)).toBeGreaterThanOrEqual(BAC_THANG.dien);
      let dap = 0;
      for (const b of on.buildings) {
        const a = off.buildings.find((o) => o.id === b.id)!;
        const def = BUILDINGS[b.type];
        const ha = groundOf(off, a);
        const hb = groundOf(on, b);
        // Cùng chỗ như khi tắt đắp; chỉ đắp lên, không hạ.
        expect({ x: b.x, z: b.z }).toEqual({ x: a.x, z: a.z });
        expect(hb).toBeGreaterThanOrEqual(ha);
        for (let k = ha; k < hb; k++) dap += raiseBuildingCost(def.w, def.d, k).datDa ?? 0;
        const tang = !NO_RAISE.includes(b.type) && !def.nearRiver && !isRoad(b.type) && def.w > 1 && !def.decor;
        if (tang && b.type !== 'dien' && !laRuong(b.type)) expect(hb, `${id}: ${b.type} ${b.x},${b.z}`).toBeGreaterThanOrEqual(BAC_THANG.quanh);
        if (laRuong(b.type)) expect(hb).toBeLessThanOrEqual(Math.max(ha, BAC_THANG.ruong));
      }
      expect(plan.dapCost.datDa).toBe(dap);
      expect(spent).toBe(plan.cost.datDa);
      // Ruộng thấp hơn công trình quanh Điện: có ruộng dưới bậc 2.
      const ruong = on.buildings.filter((b) => laRuong(b.type));
      expect(ruong.length, id).toBeGreaterThan(0);
      expect(Math.min(...ruong.map((b) => groundOf(on, b))), id).toBeLessThan(BAC_THANG.quanh);
      // Áp lần nữa thì không còn gì phải đắp.
      expect(planMau(on, id).dap).toEqual([]);
    }
  });

  it('dãy ruộng gần sông nhất không đắp, vẫn được nước êm qua cống bồi phù sa', () => {
    for (const id of MAU_IDS) {
      for (const dien of levelsOf(id).filter((d) => d >= 6)) {
        const { off, on } = both(id, dien);
        const ruong = on.buildings.filter((b) => laRuong(b.type));
        if (!ruong.length) continue;
        const gan = Math.min(...ruong.map(toSong));
        for (const b of ruong.filter((r) => toSong(r) === gan)) expect(groundOf(on, b), `${id} Điện ${dien}`).toBe(groundOf(off, off.buildings.find((o) => o.id === b.id)!));
      }
    }
    // Đê bao: mở một cống trên dải đê, lũ bậc 2 vào qua cống bồi dãy ruộng gần sông.
    const { on } = both('deBao', 6);
    const de = on.buildings.filter((b) => b.type === 'de');
    const ruong = on.buildings.filter((b) => laRuong(b.type));
    const gan = Math.min(...ruong.map(toSong));
    const cong = de.map((d) => place(on, 'congDe', d.x, d.z)).find((r) => r.ok);
    if (!cong?.ok) throw new Error('không đặt được cống');
    cong.value.mo = true;
    const boi = floodHits(on, 2).boi;
    expect(boi.some((b) => toSong(b) === gan)).toBe(true);
  });
});
