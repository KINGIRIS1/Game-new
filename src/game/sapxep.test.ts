import { describe, expect, it } from 'vitest';
import { wallRings } from './coLoa';
import { BUILDINGS, CH2_QUEST_START, CH3_QUEST_START, MOVE_FRACTION, type BuildingType } from './defs';
import { canMove, createInitialState, dienLevel, limitOf, move, moveCost, occupancy, place, type GameState } from './game';
import { applyMau, canApplyMau, mauSlots, mauUnlocked, planMau, MAU_IDS } from './mau';
import { GRID, RIVER_START, isRiver, isUnlocked, touchesRiver } from './map';
import { floodMap } from './terrain';

/** Kinh đô giàu của, đã qua kết chương 1, ở chương `chapter`, Điện cấp `dien`. */
function city(dien: number, chapter: 1 | 2 | 3 = 1): GameState {
  const s = createInitialState(0);
  s.buildings[0].level = dien;
  s.giong.ascended = true;
  s.story.seen.push('langLieu');
  s.questIndex = chapter === 3 ? CH3_QUEST_START : chapter === 2 ? CH2_QUEST_START : 0;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 };
  s.dan = 200;
  return s;
}

describe('dời công trình', () => {
  it('dời mất 10% giá dựng, giữ cấp và người làm; Điện không dời được', () => {
    const s = city(5);
    const r = place(s, 'ruong', 8, 8);
    if (!r.ok) throw new Error(r.reason);
    r.value.level = 4;
    r.value.workers = 3;
    expect(moveCost(r.value)).toEqual({ voOc: Math.ceil(BUILDINGS.ruong.buildCost.voOc! * MOVE_FRACTION) });
    const before = s.resources.voOc;
    const m = move(s, r.value.id, 4, 4);
    expect(m.ok).toBe(true);
    expect(r.value).toMatchObject({ x: 4, z: 4, level: 4, workers: 3 });
    expect(s.resources.voOc).toBe(before - 3);
    expect(canMove(s, s.buildings[0].id, 3, 3)).toEqual({ ok: false, reason: 'khongTheDoi' });
  });

  it('không dời vào chỗ bận, ra ngoài vùng, bến xa sông, đang có giặc, hay khi thiếu của', () => {
    const s = city(5);
    const a = place(s, 'nhaSan', 8, 8);
    const b = place(s, 'kho', 11, 8);
    const ben = place(s, 'ben', 8, 25);
    if (!a.ok || !b.ok || !ben.ok) throw new Error('đặt hỏng');
    expect(canMove(s, a.value.id, 8, 8)).toEqual({ ok: false, reason: 'trungCho' });
    expect(canMove(s, a.value.id, 10, 8)).toEqual({ ok: false, reason: 'datBiChiem' });
    // Dời lấn sang chính chỗ cũ của mình thì được.
    expect(canMove(s, a.value.id, 9, 9).ok).toBe(true);
    expect(canMove(s, a.value.id, 0, 0)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canMove(s, ben.value.id, 8, 20)).toEqual({ ok: false, reason: 'phaiSatSong' });
    expect(canMove(s, ben.value.id, 12, 25).ok).toBe(true);
    s.raid.phase = 'warning';
    expect(canMove(s, a.value.id, 4, 4)).toEqual({ ok: false, reason: 'dangCoGiac' });
    s.raid.phase = 'idle';
    s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
    expect(canMove(s, a.value.id, 4, 4)).toEqual({ ok: false, reason: 'thieuTaiNguyen' });
  });
});

describe('mẫu kinh đô', () => {
  it('ba mẫu vẽ đúng: Điện ở (16, 16), không chồng, không lấn sông, bến sát sông, đủ chỗ cho giới hạn của chương', () => {
    const top: Record<string, number> = { phongChau: 5, deBao: 6, coLoa: 7 };
    for (const id of MAU_IDS) {
      const slots = mauSlots(id);
      expect(slots.find((s) => s.type === 'dien')).toMatchObject({ x: 16, z: 16 });
      const seen = new Set<number>();
      for (const s of slots) {
        const def = BUILDINGS[s.type];
        if (def.nearRiver) expect(touchesRiver(s.x, s.z, def.w, def.d)).toBe(true);
        for (let dx = 0; dx < def.w; dx++) {
          for (let dz = 0; dz < def.d; dz++) {
            expect(isRiver(s.x + dx, s.z + dz)).toBe(false);
            const i = (s.z + dz) * GRID + s.x + dx;
            expect(seen.has(i)).toBe(false);
            seen.add(i);
          }
        }
      }
      // Ở cấp Điện cao nhất của chương, mỗi loại có trong mẫu đủ chỗ (trong vùng) cho số tối đa.
      const s = city(top[id], id === 'coLoa' ? 3 : id === 'deBao' ? 2 : 1);
      const types = [...new Set(slots.map((x) => x.type))].filter((t) => t !== 'dien' && !['luy', 'de', 'thanh', 'bayChong'].includes(t));
      for (const t of types) {
        const inside = slots.filter((x) => x.type === t && isUnlocked(x.x, x.z, top[id])).length;
        expect(inside, `${id}: ${t}`).toBeGreaterThanOrEqual(limitOf(s, t as BuildingType));
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
    const r1 = place(s, 'ruong', 3, 3);
    const r2 = place(s, 'nhaSan', 21, 21);
    const luy = place(s, 'luy', 10, 10);
    if (!r1.ok || !r2.ok || !luy.ok) throw new Error('đặt hỏng');
    r1.value.level = 5;
    r1.value.workers = 4;
    const plan = planMau(s, 'phongChau');
    const before = { ...s.resources };
    const res = applyMau(s, 'phongChau');
    expect(res.ok).toBe(true);
    for (const r of ['gao', 'voOc', 'datDa', 'sat'] as const) expect(s.resources[r]).toBeCloseTo(before[r] - (plan.cost[r] ?? 0), 5);
    // Ruộng cấp 5 vẫn cấp 5, vẫn 4 người làm, giờ đứng ở một chỗ ruộng của mẫu.
    const slots = mauSlots('phongChau');
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

  it('Điện cấp thấp: chỉ xếp vào chỗ trong vùng đã khai phá, dựng tới giới hạn theo cấp Điện', () => {
    const s = city(3);
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    for (const b of s.buildings) {
      const def = BUILDINGS[b.type];
      for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) expect(isUnlocked(b.x + dx, b.z + dz, dienLevel(s))).toBe(true);
    }
    expect(s.buildings.filter((b) => b.type === 'ruong').length).toBe(limitOf(s, 'ruong'));
    expect(s.buildings.filter((b) => b.type === 'luy').length).toBeLessThanOrEqual(limitOf(s, 'luy'));
  });

  it('mẫu Đê bao: đê liền dải, lũ bậc 3 không ngập công trình nào ngoài bến', () => {
    for (const dien of [6, 7]) {
      const s = city(dien, dien === 7 ? 3 : 2);
      expect(applyMau(s, 'deBao').ok).toBe(true);
      const wet = floodMap(s, 3, dien);
      for (const b of s.buildings) {
        if (b.type === 'ben' || b.type === 'de') continue;
        const def = BUILDINGS[b.type];
        for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) expect(wet[(b.z + dz) * GRID + b.x + dx], `Điện ${dien}: ${b.type} ${b.x},${b.z}`).toBe(0);
      }
    }
  });

  it('mẫu Cổ Loa: ba vòng thành kín quanh Điện, đê bao ngoài cũng giữ được lũ bậc 3', () => {
    const s = city(7, 3);
    expect(applyMau(s, 'coLoa').ok).toBe(true);
    expect(wallRings(s)).toBe(3);
    const wet = floodMap(s, 3, 7);
    for (const b of s.buildings) {
      if (b.type === 'ben' || b.type === 'de') continue;
      expect(wet[b.z * GRID + b.x], `${b.type} ${b.x},${b.z}`).toBe(0);
    }
    expect(RIVER_START).toBe(27);
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
