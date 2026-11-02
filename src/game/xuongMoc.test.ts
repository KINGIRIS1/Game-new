// Canh gỗ (tài nguyên thứ năm) và xưởng mộc: mở ở Điện 2, gỗ mỗi phút theo cấp và người làm, chung sức chứa kho,
// phát rừng được gỗ, thuyền buôn buôn gỗ khi kinh đô có xưởng mộc, Lạc hầu gợi ý một lần, nâng bản lưu 13 lên 14.

import { describe, expect, it } from 'vitest';
import { BUILDINGS, MERCHANT_FIRST_MS, TEMPLE_BONUS } from './defs';
import {
  canPlace,
  createInitialState,
  findSpot,
  limitOf,
  makeOffers,
  markHinted,
  nextHint,
  outputOf,
  place,
  productionPerMinute,
  storageCap,
  tick,
  type Building,
  type GameState,
} from './game';
import { khoanhCost, khoanhWood, openKhoanh, openable } from './khoanh';
import { SAVE_VERSION, deserialize } from './save';
import { setDien } from './testmap';

/** Kinh đô ở Điện `level`, của nhiều, dân đông. */
function capital(level: number): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.resources = { gao: 5000, voOc: 5000, datDa: 5000, sat: 1000, go: 0 };
  s.dan = 30;
  return s;
}

/** Dựng `type` ở chỗ gợi ý gần Điện. */
function build(s: GameState, type: Building['type']): Building {
  const spot = findSpot(s, type);
  if (!spot) throw new Error(`không có chỗ dựng ${type}`);
  const r = place(s, type, spot.x, spot.z);
  if (!r.ok) throw new Error(r.reason);
  return r.value;
}

describe('xưởng mộc', () => {
  it('cần Điện cấp 2; số tối đa 0, 1, 1, 2, 2, 2, 3, 3 theo cấp Điện', () => {
    const s = capital(1);
    expect(canPlace(s, 'xuongMoc', 30, 30)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    const limits = [1, 2, 3, 4, 5, 6, 7, 8].map((level) => {
      setDien(s, level);
      return limitOf(s, 'xuongMoc');
    });
    expect(limits).toEqual([0, 1, 1, 2, 2, 2, 3, 3]);
    setDien(s, 2);
    build(s, 'xuongMoc');
    const spot = findSpot(s, 'baiDa')!;
    expect(canPlace(s, 'xuongMoc', spot.x, spot.z)).toEqual({ ok: false, reason: 'datGioiHan' });
  });

  it('ra 10 → 118 gỗ mỗi phút theo cấp khi đủ người, thiếu người thì ít đi theo tỉ lệ', () => {
    const s = capital(8);
    const b = build(s, 'xuongMoc');
    const perLevel = [1, 2, 3, 4, 5, 6, 7, 8].map((level) => {
      b.level = level;
      b.workers = BUILDINGS.xuongMoc.workers![level - 1];
      return outputOf(b).go;
    });
    expect(perLevel).toEqual([10, 16, 24, 36, 50, 68, 90, 118]);
    b.level = 5;
    b.workers = 1;
    expect(outputOf(b).go).toBeCloseTo(50 / 3);
  });

  it('Đền Phù Đổng cộng thêm vào gỗ như mọi sản lượng', () => {
    const s = capital(5);
    const b = build(s, 'xuongMoc');
    b.level = 5;
    b.workers = 3;
    expect(productionPerMinute(s).go).toBeCloseTo(50);
    s.giong.ascended = true;
    build(s, 'denPhuDong');
    expect(productionPerMinute(s).go).toBeCloseTo(50 * (1 + TEMPLE_BONUS));
  });

  it('gỗ tích trong kho, không vượt sức chứa chung', () => {
    const s = capital(2);
    const b = build(s, 'xuongMoc');
    b.workers = 1;
    tick(s, 60_000);
    expect(s.resources.go).toBeCloseTo(10, 0);
    s.resources.go = storageCap(s) - 1;
    tick(s, 60_000);
    expect(s.resources.go).toBe(storageCap(s));
  });
});

describe('gỗ', () => {
  it('phát rừng được gỗ bằng nửa số gạo của giá khoảnh, ít nhất 10', () => {
    expect(khoanhWood({ gao: 20, voOc: 10 })).toBe(10);
    expect(khoanhWood({ gao: 400, voOc: 300 })).toBe(200);
    const s = createInitialState(0);
    s.resources = { gao: 5000, voOc: 5000, datDa: 0, sat: 0, go: 0 };
    const cost = khoanhCost(s);
    expect(openKhoanh(s, openable(s)[0]).ok).toBe(true);
    expect(s.resources.go).toBe(khoanhWood(cost));
  });

  it('thuyền buôn chỉ buôn gỗ khi kinh đô đã có xưởng mộc', () => {
    for (let seq = 1; seq < 60; seq++) {
      for (const o of makeOffers(seq, 3)) expect([o.give.r, o.get.r]).not.toContain('go');
    }
    const withGo = Array.from({ length: 60 }, (_, i) => makeOffers(i + 1, 3, true)).flat();
    expect(withGo.some((o) => o.give.r === 'go')).toBe(true);
    expect(withGo.some((o) => o.get.r === 'go')).toBe(true);

    // Kinh đô có bến và xưởng mộc: thuyền tới mang lời mời có thể có gỗ.
    const s = capital(3);
    build(s, 'ben');
    build(s, 'xuongMoc');
    tick(s, MERCHANT_FIRST_MS + 1000);
    expect(s.merchant.visit?.offers).toEqual(makeOffers(s.merchant.seq, 3, true));
  });

  it('Lạc hầu gợi ý xưởng mộc một lần, khi Điện lên cấp 2', () => {
    const s = capital(1);
    expect(nextHint(s)).toBeNull();
    setDien(s, 2);
    expect(nextHint(s)).toBe('xuongMoc');
    markHinted(s, 'xuongMoc');
    expect(nextHint(s)).toBeNull();
    expect(s.hinted).toEqual(['xuongMoc']);
  });

  it('nâng bản lưu 13 lên 14: kho có 0 gỗ, chưa gợi ý gì, trận vừa xong chưa bị cướp gỗ', () => {
    const raw = createInitialState(0) as unknown as Record<string, any>;
    raw.version = 13;
    delete raw.resources.go;
    delete raw.hinted;
    raw.raid.lastResult = { won: true, stolen: { gao: 30, voOc: 0, datDa: 0, sat: 0 }, lost: {}, wrecked: 0 };
    const s = deserialize(JSON.stringify(raw))!;
    expect(s.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(14);
    expect(s.resources.go).toBe(0);
    expect(s.hinted).toEqual([]);
    expect(s.raid.lastResult?.stolen.go).toBe(0);

    // Bản lưu 14 thiếu danh sách gợi ý là hỏng.
    const bad = createInitialState(0) as unknown as Record<string, unknown>;
    delete bad.hinted;
    expect(deserialize(JSON.stringify(bad))).toBeUndefined();
  });
});
