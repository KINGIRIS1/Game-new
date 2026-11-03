// Canh biển Đông và bến thuyền khơi: biển ngoài lưới phía đông, hai quần đảo Hoàng Sa, Trường Sa; bến thuyền khơi cần
// Điện 8, phải sát sông, lên cấp theo Điện 9, 10, làm ra vỏ ốc và cá biển (đỡ gạo ăn như cá làng chài), lũ không làm
// hư, Lạc hầu gợi ý một lần; đường thuyền khơi đi trên nước từ bến ra tới ngư trường quanh đảo.

import { describe, expect, it } from 'vitest';
import { BIEN_BO, BIEN_TU, CUA_BIEN, DAO_CHINH, QUAN_DAO, benDock, boatsAt, daoChinh, daoGoc, isSea, isWater, onIsland, seaIndex, seaRoute } from './bien';
import { BUILDINGS, CA_BIEN_PER_MIN, NEW_HINTS } from './defs';
import {
  canPlace,
  canUpgrade,
  createInitialState,
  fishOf,
  fishPerMinute,
  limitOf,
  markHinted,
  nextHint,
  place,
  productionPerMinute,
  upkeepPerMinute,
  type Building,
  type GameState,
} from './game';
import { GRID, RIVER_END, RIVER_START, isRiver } from './map';
import { floodToleranceOf } from './terrain';
import { DIEN, bank, setDien } from './testmap';

/** Kinh đô ở Điện `level`, của nhiều, `dan` dân. */
function capital(level: number, dan = 60): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.resources = { gao: 30000, voOc: 30000, datDa: 30000, sat: 5000, go: 30000 };
  s.dan = dan;
  return s;
}

/** Dựng bến thuyền khơi sát sông Đà (phía nam), ở cấp `level`, đủ người làm. */
function wharf(s: GameState, level = 1, x = DIEN): Building {
  const r = place(s, 'benKhoi', x, bank('benKhoi'));
  if (!r.ok) throw new Error(r.reason);
  r.value.level = level;
  r.value.workers = BUILDINGS.benKhoi.workers![level - 1];
  return r.value;
}

/** Lấy mẫu các điểm cách nhau chừng `step` ô dọc đường gấp khúc. */
function sample(path: { x: number; z: number }[], step = 0.25): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / step));
    for (let k = 0; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
  }
  return out;
}

describe('biển Đông', () => {
  it('biển ở phía đông, ngoài lưới, sau bờ đông sông Thao và bãi cát; sông Đà đổ ra cửa biển', () => {
    expect(BIEN_BO).toBeGreaterThan(GRID);
    expect(BIEN_TU).toBeGreaterThan(BIEN_BO);
    expect(isSea(BIEN_TU, 0)).toBe(true);
    expect(isSea(GRID - 1, 0)).toBe(false);
    // Cửa sông nằm giữa dòng sông Đà, ở mép biển; sông chảy liền từ lưới ra tới cửa.
    expect(CUA_BIEN.z).toBeGreaterThan(RIVER_START);
    expect(CUA_BIEN.z).toBeLessThan(RIVER_END);
    for (let x = GRID - 1; x <= CUA_BIEN.x; x += 0.5) expect(isWater(x, CUA_BIEN.z)).toBe(true);
    // Ngoài lưới mà không phải sông, không phải biển thì là đất (rừng, bãi cát).
    expect(isWater(GRID + 1, 20)).toBe(false);
  });

  it('hai quần đảo: Hoàng Sa phía bắc, Trường Sa phía nam, xa bờ hơn; đảo nằm giữa biển, không chồng nhau', () => {
    expect(QUAN_DAO.map((q) => q.id)).toEqual(['hoangSa', 'truongSa']);
    const [hs, ts] = QUAN_DAO;
    expect(hs.z).toBeLessThan(ts.z);
    expect(ts.x).toBeGreaterThan(hs.x);
    for (const q of QUAN_DAO) {
      // Đảo chính và mọi đảo nhỏ nằm ngoài bãi cát ven biển, chừa nước cho thuyền đi.
      expect(q.x - DAO_CHINH / 2).toBeGreaterThan(BIEN_TU + 8);
      for (const [i, d] of q.dao.entries()) {
        expect(q.x + d.dx - d.r).toBeGreaterThan(BIEN_TU + 3);
        expect(onIsland(q.x + d.dx, q.z + d.dz)).toBe(q.id);
        // Đảo nhỏ không chạm đảo chính (chừa một ô nước), không chạm nhau.
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          const x = q.x + d.dx + Math.cos(a) * d.r;
          const z = q.z + d.dz + Math.sin(a) * d.r;
          expect(Math.abs((x - q.x) / (DAO_CHINH / 2 + 1)) ** 4 + Math.abs((z - q.z) / (DAO_CHINH / 2 + 1)) ** 4, `${q.id} đảo nhỏ ${i}`).toBeGreaterThan(1);
        }
        for (const e of q.dao.slice(i + 1)) expect(Math.hypot(d.dx - e.dx, d.dz - e.dz)).toBeGreaterThan(d.r + e.r + 0.8);
        // Ngư trường bao ngoài mọi đảo, chừa rạn san hô.
        expect(q.nguTruong - Math.hypot(d.dx, d.dz) - d.r).toBeGreaterThan(1.5);
      }
      expect(q.nguTruong - (DAO_CHINH / 2) * Math.SQRT2).toBeGreaterThan(1.5);
    }
  });

  it('đảo chính mỗi quần đảo cỡ 20 × 20 ô: hình vuông bo góc, bờ lồi lõm, bãi cát sát nước, giữa đảo xa bờ', () => {
    expect(DAO_CHINH).toBe(20);
    for (const q of QUAN_DAO) {
      const tiles = daoChinh(q);
      const is = tiles.map((o) => o.i);
      const js = tiles.map((o) => o.j);
      // Trải trọn 20 ô mỗi chiều, góc bo tròn nên không kín cả 400 ô.
      expect(Math.max(...is) - Math.min(...is) + 1).toBe(20);
      expect(Math.max(...js) - Math.min(...js) + 1).toBe(20);
      expect(tiles.length).toBeGreaterThan(320);
      expect(tiles.length).toBeLessThan(390);
      // Ô sát nước là bờ (cách bờ 0); giữa đảo cách bờ ít nhất 8 ô.
      expect(tiles.filter((o) => o.bo === 0).length).toBeGreaterThan(60);
      expect(Math.max(...tiles.map((o) => o.bo))).toBeGreaterThanOrEqual(8);
      // Tâm quần đảo nằm trên đảo chính; ngoài góc đảo là nước.
      const g = daoGoc(q);
      expect(onIsland(q.x, q.z)).toBe(q.id);
      expect(onIsland(g.x + 0.3, g.z + 0.3)).toBeNull();
      expect(isWater(g.x + 0.3, g.z + 0.3)).toBe(true);
    }
    // Bờ hai đảo chính khác nhau (mỗi quần đảo một hạt giống).
    const key = (q: (typeof QUAN_DAO)[number]) => daoChinh(q).map((o) => `${o.i},${o.j}`).join(';');
    expect(key(QUAN_DAO[0])).not.toBe(key(QUAN_DAO[1]));
  });
});

describe('bến thuyền khơi', () => {
  it('cần Điện cấp 8, phải sát bờ sông; số tối đa 1 ở Điện 8, 2 ở Điện 9 và 10', () => {
    const s = capital(7);
    expect(canPlace(s, 'benKhoi', DIEN, bank('benKhoi'))).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    const limits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
      setDien(s, level);
      return limitOf(s, 'benKhoi');
    });
    expect(limits).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 2, 2]);
    setDien(s, 8);
    expect(canPlace(s, 'benKhoi', DIEN, bank('benKhoi', 2))).toEqual({ ok: false, reason: 'phaiSatSong' });
    expect(canPlace(s, 'benKhoi', DIEN, bank('benKhoi')).ok).toBe(true);
  });

  it('dựng tốn gạo, gỗ (đóng thuyền lớn), sắt; cấp 2 cần Điện 9, cấp 3 cần Điện 10', () => {
    expect(BUILDINGS.benKhoi.buildCost).toEqual({ gao: 3000, go: 3000, sat: 400 });
    const s = capital(8);
    const b = wharf(s);
    expect(canUpgrade(s, b.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 9);
    expect(canUpgrade(s, b.id).ok).toBe(true);
    b.level = 2;
    expect(canUpgrade(s, b.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 10);
    expect(canUpgrade(s, b.id).ok).toBe(true);
    b.level = 3;
    expect(canUpgrade(s, b.id)).toEqual({ ok: false, reason: 'capToiDa' });
  });

  it('làm ra vỏ ốc và cá biển theo cấp khi đủ người, thiếu người thì ít đi; cá biển đỡ gạo ăn', () => {
    const s = capital(10, 120);
    s.dan = 120;
    const voOcBefore = productionPerMinute(s).voOc;
    const fishBefore = fishPerMinute(s);
    const upkeepBefore = upkeepPerMinute(s);
    const b = wharf(s);
    const perLevel = [1, 2, 3].map((level) => {
      b.level = level;
      b.workers = BUILDINGS.benKhoi.workers![level - 1];
      return { fish: fishOf(b), voOc: productionPerMinute(s).voOc - voOcBefore };
    });
    expect(perLevel.map((p) => p.fish)).toEqual(CA_BIEN_PER_MIN);
    expect(perLevel.map((p) => Math.round(p.voOc))).toEqual([120, 170, 230]);
    expect(fishPerMinute(s)).toBeCloseTo(fishBefore + 90);
    expect(upkeepPerMinute(s)).toBeCloseTo(Math.max(0, upkeepBefore - 90));
    b.workers = 2;
    expect(fishOf(b)).toBeCloseTo((90 * 2) / 5);
    b.damaged = true;
    expect(fishOf(b)).toBe(0);
  });

  it('lũ không làm hư (nhà trên cọc như bến, làng chài)', () => {
    expect(floodToleranceOf('benKhoi')).toBeGreaterThanOrEqual(9);
  });

  it('Lạc hầu gợi ý một lần khi lên Điện 8', () => {
    expect(NEW_HINTS).toContain('benKhoi');
    const s = capital(7);
    for (const t of NEW_HINTS) if (t !== 'benKhoi') markHinted(s, t);
    expect(nextHint(s)).toBeNull();
    setDien(s, 8);
    expect(nextHint(s)).toBe('benKhoi');
    markHinted(s, 'benKhoi');
    expect(nextHint(s)).toBeNull();
  });
});

describe('đường thuyền khơi', () => {
  // Bến sát sông Đà bên này, sát sông Thao bên này, bờ nam sông Đà và bờ đông sông Thao bên kia.
  const W = BUILDINGS.benKhoi.w;
  const spots: Pick<Building, 'type' | 'x' | 'z'>[] = [
    { type: 'benKhoi', x: DIEN, z: RIVER_START - W },
    { type: 'benKhoi', x: 10, z: RIVER_START - W },
    { type: 'benKhoi', x: RIVER_START - W, z: DIEN },
    { type: 'benKhoi', x: RIVER_START - W, z: 8 },
    { type: 'benKhoi', x: 20, z: RIVER_END },
    { type: 'benKhoi', x: RIVER_END, z: 30 },
  ];

  it('chỗ neo trước bến nằm trên sông, sát mép móng', () => {
    for (const b of spots) {
      const d = benDock(b);
      expect(isRiver(Math.floor(d.x), Math.floor(d.z))).toBe(true);
    }
  });

  it('từ chỗ neo xuôi sông qua cửa biển tới ngư trường đều trên mặt nước; vòng đánh cá không chạm đảo', () => {
    for (const b of spots) {
      for (const index of [0, 1]) {
        const r = seaRoute(b, index);
        for (const p of sample(r.path)) expect(isWater(p.x, p.z), `${b.x},${b.z} → ${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBe(true);
        const last = r.path[r.path.length - 1];
        expect(Math.hypot(last.x - r.loop.x, last.z - r.loop.z)).toBeCloseTo(r.loop.r);
        for (let k = 0; k < 64; k++) {
          const a = (k / 64) * Math.PI * 2;
          const x = r.loop.x + Math.cos(a) * r.loop.r;
          const z = r.loop.z + Math.sin(a) * r.loop.r;
          expect(isWater(x, z)).toBe(true);
          expect(onIsland(x, z, 1)).toBeNull();
        }
      }
    }
  });

  it('bến đầu ra Hoàng Sa, bến thứ hai ra Trường Sa', () => {
    const s = capital(9);
    const a = wharf(s);
    const b = wharf(s, 1, DIEN - 12);
    expect([seaIndex(s, a), seaIndex(s, b)]).toEqual([0, 1]);
    expect(seaRoute(a, seaIndex(s, a)).quanDao).toBe('hoangSa');
    expect(seaRoute(b, seaIndex(s, b)).quanDao).toBe('truongSa');
    expect(boatsAt(s, 'hoangSa').map((o) => o.id)).toEqual([a.id]);
    expect(boatsAt(s, 'truongSa').map((o) => o.id)).toEqual([b.id]);
  });
});
