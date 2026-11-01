// Đường đi và đồ trang trí: dựng trong bảng Xây dựng, chỉ để nhìn. Canh giới hạn chung của đường, trải đè đổi
// vật liệu, giặc không nhắm và đi qua được, lũ không làm hư, áp mẫu thì dỡ món vướng chỗ, dọn bằng công cụ dọn.

import { describe, expect, it } from 'vitest';
import { findPath, startBattle, stepBattle } from './battle';
import { BUILDINGS, CH2_QUEST_START, CH3_QUEST_START, DECOR_TYPES, ROAD_LIMIT, ROAD_TYPES, isDecor, isRoad } from './defs';
import {
  buildingAt,
  canPlace,
  canRaiseTile,
  clearDecorAt,
  countOf,
  createInitialState,
  findSpot,
  limitOf,
  place,
  raiseTile,
  usedOf,
  type GameState,
} from './game';
import { applyMau, mauSlots, planMau } from './mau';
import { GRID } from './map';
import { DIEN, DIEN_END, edge } from './testmap';
import { drowns, floodMap, floodToleranceOf } from './terrain';

/** Kinh đô giàu của ở chương `chapter`, Điện cấp `dien`. */
function city(dien: number, chapter: 1 | 2 | 3 = 1): GameState {
  const s = createInitialState(0);
  s.buildings[0].level = dien;
  s.questIndex = chapter === 3 ? CH3_QUEST_START : chapter === 2 ? CH2_QUEST_START : 0;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 };
  s.dan = 200;
  return s;
}

describe('định nghĩa đường đi và đồ trang trí', () => {
  it('bốn loại đường một ô, chung giới hạn; đồ trang trí đủ mảng theo cấp Điện; tất cả dỡ được, một cấp', () => {
    expect(ROAD_TYPES).toEqual(['duongDat', 'duongSoi', 'duongDa', 'duongGach']);
    for (const t of ROAD_TYPES) {
      expect(isRoad(t)).toBe(true);
      expect(BUILDINGS[t].w).toBe(1);
      expect(BUILDINGS[t].limit).toBe(ROAD_LIMIT);
    }
    for (const t of [...ROAD_TYPES, ...DECOR_TYPES]) {
      const def = BUILDINGS[t];
      expect(isDecor(t), t).toBe(true);
      expect(def.removable && def.buildable, t).toBe(true);
      expect(def.maxLevel, t).toBe(1);
      expect(def.limit.length, t).toBe(8);
      expect(floodToleranceOf(t), t).toBeGreaterThan(10);
    }
    expect(BUILDINGS.cayDa.w).toBe(2);
    expect(BUILDINGS.ao.w).toBe(3);
    expect(isDecor('ruong')).toBe(false);
  });

  it('đường gạch mở ở chương 3; đường đá cần Điện cấp 3', () => {
    const s = city(5, 2);
    expect(canPlace(s, 'duongGach', edge(5, 2), edge(5, 2))).toEqual({ ok: false, reason: 'canChuong3' });
    const s3 = city(5, 3);
    expect(canPlace(s3, 'duongGach', edge(5, 2), edge(5, 2)).ok).toBe(true);
    const s1 = city(2);
    expect(canPlace(s1, 'duongDa', edge(2, 2), edge(2, 2))).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    expect(canPlace(s1, 'duongDat', edge(2, 2), edge(2, 2)).ok).toBe(true);
  });
});

describe('trải đường', () => {
  it('bốn loại đường chung một giới hạn số ô theo cấp Điện', () => {
    const s = city(2);
    // Trải xen kẽ đất và sỏi, mỗi hàng 12 ô, tới khi đầy giới hạn ở Điện cấp 2.
    for (let i = 0; i < ROAD_LIMIT[1]; i++) {
      const r = place(s, i % 2 ? 'duongSoi' : 'duongDat', edge(2, 1 + (i % 12)), edge(2, 1 + Math.floor(i / 12)));
      if (!r.ok) throw new Error(r.reason);
    }
    expect(countOf(s, 'duongSoi')).toBe(ROAD_LIMIT[1] / 2);
    expect(usedOf(s, 'duongDat')).toBe(ROAD_LIMIT[1]);
    expect(usedOf(s, 'duongDa')).toBe(ROAD_LIMIT[1]);
    expect(limitOf(s, 'duongGach')).toBe(ROAD_LIMIT[1]);
    expect(canPlace(s, 'duongDat', edge(2, 1), edge(2, 18))).toEqual({ ok: false, reason: 'datGioiHan' });
    expect(canPlace(s, 'duongSoi', edge(2, 1), edge(2, 18))).toEqual({ ok: false, reason: 'datGioiHan' });
    // Đồ trang trí có giới hạn riêng.
    expect(canPlace(s, 'hoa', edge(2, 1), edge(2, 18)).ok).toBe(true);
  });

  it('trải loại đường khác đè lên ô đường cũ thì đổi vật liệu, không thêm ô; cùng loại thì báo đã có', () => {
    const s = city(3);
    const x = edge(3, 2);
    const z = edge(3, 2);
    const a = place(s, 'duongDat', x, z);
    if (!a.ok) throw new Error(a.reason);
    expect(place(s, 'duongDat', x, z)).toEqual({ ok: false, reason: 'datBiChiem' });
    const before = s.resources.datDa;
    const b = place(s, 'duongDa', x, z);
    if (!b.ok) throw new Error(b.reason);
    expect(buildingAt(s, x, z)?.type).toBe('duongDa');
    expect(usedOf(s, 'duongDat')).toBe(1);
    expect(s.resources.datDa).toBe(before - BUILDINGS.duongDa.buildCost.datDa!);
    // Đổi vật liệu được cả khi đã đầy giới hạn.
    for (let i = 0; usedOf(s, 'duongDat') < limitOf(s, 'duongDat'); i++) place(s, 'duongDat', edge(3, 4 + (i % 12)), edge(3, 4 + Math.floor(i / 12)));
    expect(canPlace(s, 'duongDat', edge(3, 2), edge(3, 20))).toEqual({ ok: false, reason: 'datGioiHan' });
    expect(place(s, 'duongDat', x, z).ok).toBe(true);
    // Đường không đè được lên nhà, đồ trang trí không đè được lên đường.
    expect(place(s, 'hoa', x, z)).toEqual({ ok: false, reason: 'datBiChiem' });
  });

  it('nhà không dựng đè lên đường hay đồ trang trí; dọn đi rồi mới dựng được', () => {
    const s = city(3);
    const x = edge(3, 3);
    const z = edge(3, 3);
    if (!place(s, 'hoa', x + 1, z + 1).ok) throw new Error('đặt hoa hỏng');
    expect(canPlace(s, 'nhaSan', x, z)).toEqual({ ok: false, reason: 'datBiChiem' });
    const r = clearDecorAt(s, x + 1, z + 1);
    expect(r.ok && r.value.type).toBe('hoa');
    expect(canPlace(s, 'nhaSan', x, z).ok).toBe(true);
    // Công cụ dọn không dỡ nhà cửa.
    if (!place(s, 'nhaSan', x, z).ok) throw new Error('đặt nhà hỏng');
    expect(clearDecorAt(s, x, z)).toEqual({ ok: false, reason: 'khongPhaiTrangTri' });
    expect(clearDecorAt(s, edge(3, 20), edge(3, 20))).toEqual({ ok: false, reason: 'khongTimThay' });
  });

  it('đắp đất được ngay dưới ô đường, món trang trí một ô; không đắp một ô dưới cây đa', () => {
    const s = city(5, 2);
    const x = edge(5, 2);
    const z = edge(5, 2);
    if (!place(s, 'duongDat', x, z).ok) throw new Error('trải đường hỏng');
    const h = s.heights[z * GRID + x];
    const r = raiseTile(s, x, z);
    expect(r.ok && r.value).toBe(h + 1);
    if (!place(s, 'cayDa', x + 3, z).ok) throw new Error('trồng đa hỏng');
    expect(canRaiseTile(s, x + 3, z)).toEqual({ ok: false, reason: 'datBiChiem' });
  });

  it('nhà đặt cạnh đồ trang trí vẫn tính là chỗ thoáng', () => {
    const s = city(1);
    const spot = findSpot(s, 'nhaSan')!;
    // Rào quanh chỗ ấy bằng cỏ: chỗ gợi ý vẫn là chỗ ấy.
    for (let i = -1; i <= 3; i++) {
      for (const [x, z] of [[spot.x + i, spot.z - 1], [spot.x + i, spot.z + 3], [spot.x - 1, spot.z + i], [spot.x + 3, spot.z + i]]) place(s, 'co', x, z);
    }
    expect(findSpot(s, 'nhaSan')).toEqual(spot);
  });
});

describe('đường đi, đồ trang trí trước giặc và lũ', () => {
  it('giặc đi thẳng qua đường và đồ trang trí, không phải phá', () => {
    const s = city(2);
    // Một vòng cỏ, đường, cây cau kín quanh móng Điện.
    const kinds = ['co', 'duongDat', 'cau', 'hoa'] as const;
    let k = 0;
    for (let i = DIEN - 1; i <= DIEN_END; i++) {
      for (const [x, z] of [[i, DIEN - 1], [i, DIEN_END], [DIEN - 1, i], [DIEN_END, i]]) if (place(s, kinds[k % 4], x, z).ok) k++;
    }
    expect(k).toBeGreaterThan(20);
    const path = findPath(s, DIEN + 0.5, 1.5, s.buildings[0])!;
    expect(path).not.toBeNull();
    const decor = new Set(s.buildings.filter((b) => isDecor(b.type)).map((b) => b.z * GRID + b.x));
    expect(path.some((i) => decor.has(i))).toBe(true);
  });

  it('giặc không nhắm phá đồ trang trí: đánh xong mọi món vẫn nguyên', () => {
    const s = city(2);
    s.resources = { gao: 900, voOc: 900, datDa: 900, sat: 400 };
    for (let x = edge(2, 2); x < edge(2, 14); x++) place(s, x % 2 ? 'hoa' : 'duongDat', x, DIEN - 3);
    place(s, 'cayDa', DIEN - 4, DIEN + 1);
    place(s, 'gieng', DIEN_END + 1, DIEN);
    const battle = startBattle(s, 1, 'bac');
    let done = false;
    for (let i = 0; i < 20 * 260 && !done; i++) done = stepBattle(s, battle, 0.05);
    const decor = s.buildings.filter((b) => isDecor(b.type));
    expect(decor.length).toBeGreaterThan(10);
    expect(decor.some((b) => b.damaged)).toBe(false);
    expect(s.buildings.find((b) => b.type === 'dien')!.damaged).toBe(true);
  });

  it('lũ ngập tới đâu cũng không làm hư đường, ao, hoa', () => {
    const s = city(6, 2);
    const near = 52 - 4;
    const placed = [place(s, 'duongDat', near, edge(6, 4)), place(s, 'ao', near - 4, edge(6, 4)), place(s, 'hoa', near, edge(6, 6))];
    for (const r of placed) if (!r.ok) throw new Error(r.reason);
    const wet = floodMap(s, 4, 6);
    for (const r of placed) if (r.ok) expect(drowns(s, r.value, wet, 4)).toBe(false);
  });
});

describe('áp mẫu với đường và đồ trang trí', () => {
  it('món vướng chỗ của mẫu thì dỡ đi, món không vướng thì giữ nguyên', () => {
    const s = city(5);
    const slots = mauSlots('phongChau', 5);
    const ruong = slots.find((x) => x.type === 'ruong')!;
    const inWay = place(s, 'hoa', ruong.x + 1, ruong.z + 1);
    // Một ô trống không thuộc mẫu, trong vùng đã khai phá.
    const covered = new Set<number>();
    for (const x of slots) for (let dx = 0; dx < BUILDINGS[x.type].w; dx++) for (let dz = 0; dz < BUILDINGS[x.type].d; dz++) covered.add((x.z + dz) * GRID + x.x + dx);
    let free: { x: number; z: number } | null = null;
    for (let z = edge(5); z < 52 && !free; z++) for (let x = edge(5); x < 52 && !free; x++) if (!covered.has(z * GRID + x) && canPlace(s, 'cau', x, z).ok) free = { x, z };
    const keep = place(s, 'cau', free!.x, free!.z);
    if (!inWay.ok || !keep.ok) throw new Error('đặt hỏng');
    const plan = planMau(s, 'phongChau');
    expect(plan.removes).toContain(inWay.value.id);
    expect(plan.removes).not.toContain(keep.value.id);
    expect(plan.moves.some((m) => m.id === keep.value.id)).toBe(false);
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    expect(s.buildings.some((b) => b.id === inWay.value.id)).toBe(false);
    expect(s.buildings.find((b) => b.id === keep.value.id)).toMatchObject({ x: free!.x, z: free!.z });
  });
});
