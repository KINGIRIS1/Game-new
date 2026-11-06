// Canh biển Đông và bến thuyền khơi: biển phía đông nam, bờ chéo đi sát góc ngoài hai bờ bên kia, góc đông nam sau ngã ba
// là cửa biển; hai quần đảo Hoàng Sa, Trường Sa theo hướng ngoài đời; bến thuyền khơi cần
// Điện 8, phải sát sông, lên cấp theo Điện 9, 10, làm ra vỏ ốc và cá biển (đỡ gạo ăn như cá làng chài), lũ không làm
// hư, Lạc hầu gợi ý một lần; đường thuyền khơi đi trên nước từ bến ra tới ngư trường quanh đảo.

import { describe, expect, it } from 'vitest';
import { BAI_CAT, CUA_BIEN, DAO_CHINH, QUAN_DAO, benDock, bienDiem, bienDo, boatsAt, daoChinh, daoGoc, isSea, isWater, onIsland, seaIndex, seaRoute } from './bien';
import { plotAt } from './benKia';
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
import { GRID, RIVER_END, RIVER_START, isNearBank, isRiver } from './map';
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
  it('bờ biển chạy chéo ở đông nam, bãi cát không chạm đất bên này hay khoảnh bên kia nào; góc đông nam là cửa biển', () => {
    // Mọi góc ô đất bên này và mọi khoảnh bên kia cách mép bãi cát hơn một ô: không khoảnh nào mất đất.
    let nearest = -Infinity;
    for (let x = 0; x < GRID; x++) {
      for (let z = 0; z < GRID; z++) {
        if (!isNearBank(x, z) && plotAt(x, z) === null) continue;
        for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) nearest = Math.max(nearest, bienDo(x + dx, z + dz));
      }
    }
    expect(nearest).toBeLessThan(-1);
    // Góc đông nam sau ngã ba (rừng không khai phá) thành biển; từ ngã ba đi chừng mười ô về đông nam là tới bãi cát.
    expect(isSea(GRID - 0.5, GRID - 0.5)).toBe(true);
    expect(isWater(GRID - 0.5, GRID - 0.5)).toBe(true);
    const mid = (RIVER_START + RIVER_END) / 2;
    let k = 0;
    while (bienDo(mid + k, mid + k) < 0) k += 0.5;
    expect(k * Math.SQRT2).toBeGreaterThan(8);
    expect(k * Math.SQRT2).toBeLessThan(16);
    // Bờ chạy chéo: phía đông bắc, tây nam ngoài lưới còn đất liền.
    expect(isWater(GRID + 1, 20)).toBe(false);
    expect(isWater(20, GRID + 1)).toBe(false);
    expect(isSea(GRID + 40, 0)).toBe(false);
    expect(isSea(GRID + 40, 40)).toBe(true);
    // Bãi cát rộng `BAI_CAT` ô rồi tới biển; điểm dựng theo bờ nằm đúng khoảng cách đã hỏi.
    for (const t of [-60, -13, 0, 7, 22, 90]) {
      for (const c of [-2, 0, 1.5, BAI_CAT, 10]) {
        const p = bienDiem(t, c);
        expect(p.x - p.z).toBeCloseTo(t);
        expect(bienDo(p.x, p.z)).toBeCloseTo(c);
      }
    }
    // Cửa sông nằm giữa dòng sông Đà, ra quá bãi cát; sông chảy liền từ ngã ba ra tới cửa.
    expect(CUA_BIEN.z).toBeGreaterThan(RIVER_START);
    expect(CUA_BIEN.z).toBeLessThan(RIVER_END);
    expect(isSea(CUA_BIEN.x, CUA_BIEN.z)).toBe(true);
    expect(CUA_BIEN.x).toBeLessThan(GRID + 6);
    for (let x = RIVER_START; x <= CUA_BIEN.x + 6; x += 0.5) expect(isWater(x, CUA_BIEN.z), `x ${x}`).toBe(true);
  });

  it('hai quần đảo theo hướng ngoài đời: Hoàng Sa đông nam, Trường Sa nam đông nam và xa hơn; đảo giữa biển, không chồng nhau', () => {
    expect(QUAN_DAO.map((q) => q.id)).toEqual(['hoangSa', 'truongSa']);
    const [hs, ts] = QUAN_DAO;
    // Hướng như la bàn nhìn từ tâm Điện (0° bắc, 90° đông): ngoài đời Hoàng Sa 128°, Trường Sa 144°.
    const tam = DIEN + BUILDINGS.dien.w / 2;
    const huong = (q: (typeof QUAN_DAO)[number]) => (Math.atan2(q.x - tam, -(q.z - tam)) * 180) / Math.PI;
    const xa = (q: (typeof QUAN_DAO)[number]) => Math.hypot(q.x - tam, q.z - tam);
    expect(huong(hs)).toBeGreaterThan(110);
    expect(huong(hs)).toBeLessThan(135);
    expect(huong(ts)).toBeGreaterThan(135);
    expect(huong(ts)).toBeLessThan(160);
    expect(xa(ts)).toBeGreaterThan(1.3 * xa(hs));
    // Hai ngư trường không chồng lên nhau.
    expect(Math.hypot(hs.x - ts.x, hs.z - ts.z)).toBeGreaterThan(hs.nguTruong + ts.nguTruong + 4);
    for (const q of QUAN_DAO) {
      // Đảo chính, mọi đảo nhỏ và cả ngư trường nằm xa bãi cát, chừa nước cho thuyền đi.
      expect(bienDo(q.x, q.z) - q.nguTruong).toBeGreaterThan(BAI_CAT + 8);
      for (const [i, d] of q.dao.entries()) {
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
