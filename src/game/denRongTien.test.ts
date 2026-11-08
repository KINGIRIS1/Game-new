// Canh Đền Rồng Tiên (thờ Lạc Long Quân và Âu Cơ): móng 8×8, dựng một lần, mở ở chương 5 khi Điện lên cấp 10; đền còn
// nguyên thì vỏ ốc, cá, đất đá, sắt, gỗ làm ra thêm `RONG_TIEN_BONUS` (gạo không), đền hư thì thôi; Lạc hầu gợi ý một
// lần; nhiệm vụ 62; mẫu Cổ Loa giữ sông chừa chỗ đền từ Điện 10.

import { describe, expect, it } from 'vitest';
import { BUILDINGS, BUILD_MENU, CH5_QUEST_START, NEW_HINTS, QUESTS, RONG_TIEN_BONUS, TEMPLE_BONUS } from './defs';
import {
  canPlace,
  createInitialState,
  findSpot,
  fishPerMinute,
  markHinted,
  nextHint,
  place,
  productionPerMinute,
  questProgress,
  remove,
  rongTienBonus,
  type Building,
  type GameState,
} from './game';
import { applyMau, mauSlots } from './mau';
import { floodToleranceOf } from './terrain';
import { bank, edge, setDien, DIEN } from './testmap';

/** Kinh đô chương 5, Điện `level`, của nhiều, đã gợi ý hết công trình mới trừ đền này. */
function ch5(level = 10): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.questIndex = CH5_QUEST_START;
  s.resources = { gao: 60000, voOc: 60000, datDa: 60000, sat: 60000, go: 60000 };
  s.dan = 200;
  for (const t of NEW_HINTS) if (t !== 'denRongTien') markHinted(s, t);
  return s;
}

/** Góc móng đền: sát bìa đất phía rừng, xa Điện. */
const DEN = edge(10, 1);

/** Dựng `type` ở chỗ tìm được (bến, làng chài sát sông), đủ người làm. */
function worked(s: GameState, type: 'ruong' | 'ben' | 'baiDa' | 'loRen' | 'xuongMoc' | 'langChai', x = DIEN): Building {
  const spot = type === 'ben' || type === 'langChai' ? { x, z: bank(type) } : findSpot(s, type);
  if (!spot) throw new Error(`không có chỗ ${type}`);
  const r = place(s, type, spot.x, spot.z);
  if (!r.ok) throw new Error(`${type}: ${r.reason}`);
  r.value.workers = BUILDINGS[type].workers?.[0] ?? 0;
  return r.value;
}

/** Kinh đô có đủ năm loại của làm ra và cá. */
function economy(): GameState {
  const s = ch5();
  for (const t of ['ruong', 'baiDa', 'loRen', 'xuongMoc'] as const) worked(s, t);
  worked(s, 'ben', DIEN);
  worked(s, 'langChai', DIEN + 4);
  return s;
}

describe('Đền Rồng Tiên', () => {
  it('móng 8×8, dựng một lần, không dỡ được, có trong bảng Xây dựng', () => {
    const def = BUILDINGS.denRongTien;
    expect([def.w, def.d, def.maxLevel]).toEqual([8, 8, 1]);
    expect(def.limit.every((n) => n === 1)).toBe(true);
    expect(BUILD_MENU).toContain('denRongTien');
    const s = ch5();
    const r = place(s, 'denRongTien', DEN, DEN);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(canPlace(s, 'denRongTien', DEN + 10, DEN)).toEqual({ ok: false, reason: 'datGioiHan' });
    expect(remove(s, r.value.id).ok).toBe(false);
  });

  it('chỉ dựng được ở chương 5, khi Điện đã lên cấp 10', () => {
    const s = ch5(9);
    expect(canPlace(s, 'denRongTien', DEN, DEN)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    s.questIndex = CH5_QUEST_START - 1;
    setDien(s, 10);
    expect(canPlace(s, 'denRongTien', DEN, DEN)).toEqual({ ok: false, reason: 'canChuong5' });
    s.questIndex = CH5_QUEST_START;
    expect(canPlace(s, 'denRongTien', DEN, DEN).ok).toBe(true);
  });

  it('Lạc hầu gợi ý một lần khi Điện lên cấp 10', () => {
    const s = ch5(9);
    expect(nextHint(s)).toBeNull();
    setDien(s, 10);
    expect(nextHint(s)).toBe('denRongTien');
    markHinted(s, 'denRongTien');
    expect(nextHint(s)).toBeNull();
  });

  it('đền còn nguyên: vỏ ốc, đất đá, sắt, gỗ và cá làm ra thêm 20%, gạo giữ nguyên; đền hư thì thôi', () => {
    const s = economy();
    const before = productionPerMinute(s);
    const fish = fishPerMinute(s);
    for (const r of ['gao', 'voOc', 'datDa', 'sat', 'go'] as const) expect(before[r], r).toBeGreaterThan(0);
    expect(fish).toBeGreaterThan(0);
    const den = place(s, 'denRongTien', DEN, DEN);
    if (!den.ok) throw new Error(den.reason);
    expect(rongTienBonus(s)).toBe(RONG_TIEN_BONUS);
    expect(RONG_TIEN_BONUS).toBe(0.2);
    const after = productionPerMinute(s);
    expect(after.gao).toBeCloseTo(before.gao);
    for (const r of ['voOc', 'datDa', 'sat', 'go'] as const) expect(after[r], r).toBeCloseTo(before[r] * 1.2);
    expect(fishPerMinute(s)).toBeCloseTo(fish * 1.2);
    den.value.damaged = true;
    expect(rongTienBonus(s)).toBe(0);
    expect(productionPerMinute(s).voOc).toBeCloseTo(before.voOc);
    expect(fishPerMinute(s)).toBeCloseTo(fish);
  });

  it('cộng dồn với Đền Phù Đổng: vỏ ốc gấp 1 + 0,1 + 0,2, gạo gấp 1 + 0,1', () => {
    const s = economy();
    const plain = productionPerMinute(s);
    s.giong.ascended = true;
    expect(place(s, 'denPhuDong', DEN + 9, DEN).ok).toBe(true);
    expect(place(s, 'denRongTien', DEN, DEN).ok).toBe(true);
    const both = productionPerMinute(s);
    expect(both.gao).toBeCloseTo(plain.gao * (1 + TEMPLE_BONUS));
    expect(both.voOc).toBeCloseTo(plain.voOc * (1 + TEMPLE_BONUS + RONG_TIEN_BONUS));
  });

  it('nhiệm vụ 62: dựng Đền Rồng Tiên, nối sau nhiệm vụ Đền Hát Môn; người đã xong hết nhiệm vụ cũng nhận được', () => {
    const at = QUESTS.findIndex((q) => q.id === 'denRongTien');
    expect(at).toBe(QUESTS.length - 1);
    expect(QUESTS[at - 1].id).toBe('denHatMon');
    expect(QUESTS[at].reward).toEqual({ datDa: 4500, sat: 1400 });
    const s = ch5();
    // Bản lưu cũ đã xong cả 62 nhiệm vụ cũ: chỉ số nay chỉ vào nhiệm vụ mới.
    s.questIndex = at;
    expect(questProgress(s)).toEqual({ have: 0, need: 1 });
    expect(place(s, 'denRongTien', DEN, DEN).ok).toBe(true);
    expect(questProgress(s)).toEqual({ have: 1, need: 1 });
  });

  it('chịu nước ngập một bậc như các đền', () => {
    expect(floodToleranceOf('denRongTien')).toBe(floodToleranceOf('denHatMon'));
  });

  it('mẫu Cổ Loa giữ sông chừa chỗ đền từ Điện 10; áp mẫu thì dựng đền khi đã mở', () => {
    const dens = [7, 8, 9, 10].map((l) => mauSlots('coLoaSong', l).filter((x) => x.type === 'denRongTien').length);
    expect(dens).toEqual([0, 0, 0, 1]);
    const before = ch5(10);
    before.questIndex = CH5_QUEST_START - 1;
    before.adv.bien = true;
    expect(applyMau(before, 'coLoaSong').ok).toBe(true);
    expect(before.buildings.some((b) => b.type === 'denRongTien')).toBe(false);
    const s = ch5();
    expect(applyMau(s, 'coLoaSong').ok).toBe(true);
    const den = s.buildings.find((b) => b.type === 'denRongTien');
    expect(den).toBeDefined();
    expect(mauSlots('coLoaSong', 10).some((x) => x.type === 'denRongTien' && x.x === den!.x && x.z === den!.z)).toBe(true);
  });
});
