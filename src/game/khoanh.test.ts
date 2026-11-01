// Khoảnh đất tự chọn: lượt phát theo cấp Điện, phải sát đất đã mở, giá nhích dần 2–3% giá nâng Điện kế tiếp,
// khóa khi có giặc, dải giặc luôn ngoài đất đã mở, nâng bản lưu phiên bản 11 (đất hình vuông) lên 12.

import { describe, expect, it } from 'vitest';
import { raidSpawnBand } from './battle';
import { BUILDINGS, KHOANH_COST_MIN, KHOANH_QUOTA } from './defs';
import { canPlace, createInitialState, place, type GameState } from './game';
import {
  KHOANH_N,
  START_KHOANH,
  V11_AREA,
  canOpenKhoanh,
  isOpen,
  khoanhCost,
  khoanhId,
  khoanhLeft,
  khoanhOf,
  khoanhOrigin,
  khoanhQuota,
  openKhoanh,
  openStart,
  openable,
  squareKhoanh,
} from './khoanh';
import { FOREST_BAND, GRID, KHOANH, RIVER_START } from './map';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { DIEN, setDien } from './testmap';

/** Kinh đô giàu, Điện cấp `level`, đất mới có 16 khoảnh mở sẵn. */
function rich(level = 1): GameState {
  const s = createInitialState(0);
  s.buildings[0].level = level;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 };
  return s;
}

/** Khoảnh rừng ngay phía bắc (z nhỏ hơn) vùng mở sẵn, cùng cột với Điện. */
const NORTH = khoanhId(7, 5);

describe('lưới khoảnh', () => {
  it('10×10 khoảnh 5×5 phủ đất giữa dải rừng ngoài cùng và sông', () => {
    expect(KHOANH_N).toBe(10);
    expect(khoanhOf(FOREST_BAND, FOREST_BAND)).toBe(0);
    expect(khoanhOf(RIVER_START - 1, RIVER_START - 1)).toBe(99);
    expect(khoanhOf(FOREST_BAND - 1, 20)).toBe(-1);
    expect(khoanhOf(20, RIVER_START)).toBe(-1);
    expect(khoanhOrigin(khoanhId(3, 4))).toEqual({ x: FOREST_BAND + 3 * KHOANH, z: FOREST_BAND + 4 * KHOANH });
    for (let id = 0; id < 100; id++) {
      const o = khoanhOrigin(id);
      expect(khoanhOf(o.x + KHOANH - 1, o.z + KHOANH - 1)).toBe(id);
    }
  });

  it('lúc đầu mở sẵn 16 khoảnh ở góc sông (vùng 20×20), Điện nằm gọn trong đó', () => {
    const s = createInitialState(0);
    expect(s.khoanh).toEqual([...START_KHOANH]);
    expect(START_KHOANH.length).toBe(16);
    expect(squareKhoanh(20)).toEqual([...START_KHOANH]);
    expect(isOpen(s, DIEN, DIEN)).toBe(true);
    expect(isOpen(s, RIVER_START - 20, RIVER_START - 1)).toBe(true);
    expect(isOpen(s, RIVER_START - 21, RIVER_START - 1)).toBe(false);
    expect(openStart(s)).toBe(RIVER_START - 20);
  });
});

describe('phát rừng', () => {
  it('lượt phát theo cấp Điện: 18, 24, 32, 38, 48, 60, 72, 80 khoảnh', () => {
    expect(KHOANH_QUOTA).toEqual([18, 24, 32, 38, 48, 60, 72, 80]);
    for (let l = 2; l <= 8; l++) expect(khoanhQuota(l)).toBeGreaterThan(khoanhQuota(l - 1));
    expect(khoanhQuota(8)).toBeLessThan(100);
    const s = rich(1);
    expect(khoanhLeft(s)).toBe(2);
    expect(openKhoanh(s, NORTH).ok).toBe(true);
    expect(openKhoanh(s, NORTH - KHOANH_N).ok).toBe(true);
    expect(khoanhLeft(s)).toBe(0);
    expect(canOpenKhoanh(s, NORTH - 2 * KHOANH_N)).toEqual({ ok: false, reason: 'hetLuotKhoanh' });
    expect(openable(s)).toEqual([]);
    s.buildings[0].level = 2;
    expect(khoanhLeft(s)).toBe(6);
  });

  it('phải sát đất đã mở theo bốn hướng; đã mở thì thôi', () => {
    const s = rich(3);
    expect(canOpenKhoanh(s, khoanhId(0, 0))).toEqual({ ok: false, reason: 'khoanhChuaSat' });
    // Chéo góc với vùng mở sẵn: chưa sát.
    expect(canOpenKhoanh(s, khoanhId(5, 5))).toEqual({ ok: false, reason: 'khoanhChuaSat' });
    expect(canOpenKhoanh(s, khoanhId(7, 7))).toEqual({ ok: false, reason: 'khoanhDaMo' });
    expect(canOpenKhoanh(s, 100)).toEqual({ ok: false, reason: 'khongTimThay' });
    expect(openable(s)).toContain(NORTH);
    expect(openable(s)).not.toContain(khoanhId(5, 5));
    expect(openable(s).length).toBe(8);
  });

  it('phát xong thì đất mở ngay: dựng được công trình trên khoảnh mới', () => {
    const s = rich(2);
    const o = khoanhOrigin(NORTH);
    expect(canPlace(s, 'nhaSan', o.x + 1, o.z + 1)).toEqual({ ok: false, reason: 'ngoaiVung' });
    const before = { ...s.resources };
    const r = openKhoanh(s, NORTH);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(s.resources.gao).toBe(before.gao - r.value.gao!);
    expect(s.resources.voOc).toBe(before.voOc - r.value.voOc!);
    expect(s.resources.datDa).toBe(before.datDa);
    expect(s.resources.sat).toBe(before.sat);
    expect(s.khoanh).toContain(NORTH);
    expect(place(s, 'nhaSan', o.x + 1, o.z + 1).ok).toBe(true);
  });

  it('giá: sàn 20 gạo, 10 vỏ ốc; nhích dần trong lượt; ở Điện 6 chừng 2–3% giá lên Điện 7', () => {
    const s = rich(1);
    expect(khoanhCost(s)).toEqual(KHOANH_COST_MIN);
    const six = rich(6);
    six.khoanh = squareKhoanh(35);
    const up = BUILDINGS.dien.upgradeCost[7];
    // Vùng 35×35 có 49 khoảnh: bỏ một khoảnh ở góc rừng cho đúng 48 (hết lượt Điện 5), khoảnh tiếp theo là đầu lượt Điện 6.
    six.khoanh = six.khoanh.slice(1);
    expect(six.khoanh.length).toBe(KHOANH_QUOTA[4]);
    const first = khoanhCost(six);
    expect(Math.abs(first.gao! - 0.02 * up.gao!)).toBeLessThanOrEqual(5);
    expect(Math.abs(first.voOc! - 0.02 * up.voOc!)).toBeLessThanOrEqual(5);
    expect(first.datDa ?? 0).toBe(0);
    expect(first.sat ?? 0).toBe(0);
    // Mở tới khoảnh cuối của lượt Điện 6.
    const all = Array.from({ length: 100 }, (_, i) => i).filter((id) => !six.khoanh.includes(id));
    six.khoanh = [...six.khoanh, ...all.slice(0, KHOANH_QUOTA[5] - 1 - six.khoanh.length)];
    const last = khoanhCost(six);
    expect(Math.abs(last.gao! - 0.03 * up.gao!)).toBeLessThanOrEqual(5);
    expect(last.gao!).toBeGreaterThan(first.gao!);
  });

  it('đang có giặc, lũ hay trinh sát vừa báo thì không phát rừng', () => {
    const s = rich(2);
    s.raid.phase = 'warning';
    expect(canOpenKhoanh(s, NORTH)).toEqual({ ok: false, reason: 'dangCoGiac' });
    s.raid.phase = 'battle';
    expect(canOpenKhoanh(s, NORTH)).toEqual({ ok: false, reason: 'dangCoGiac' });
    s.raid.phase = 'idle';
    s.resources = { gao: 0, voOc: 0, datDa: 0, sat: 0 };
    expect(canOpenKhoanh(s, NORTH)).toEqual({ ok: false, reason: 'thieuTaiNguyen' });
  });

  it('mở một dải lồi ra phía rừng: dải giặc xuất phát vẫn ở ngoài đất đã mở', () => {
    const s = rich(8);
    for (let cz = 5; cz >= 0; cz--) expect(openKhoanh(s, khoanhId(7, cz)).ok).toBe(true);
    expect(openStart(s)).toBe(FOREST_BAND);
    const band = raidSpawnBand(s);
    expect(band.to).toBeLessThanOrEqual(FOREST_BAND);
    expect(band.from).toBeGreaterThan(0);
    // Không ô đã mở nào nằm trong dải ấy.
    for (let z = 0; z < Math.ceil(band.to); z++) for (let x = 0; x < GRID; x++) expect(isOpen(s, x, z)).toBe(false);
  });
});

describe('nâng bản lưu phiên bản 11 lên 12', () => {
  for (const level of [1, 5, 8]) {
    it(`Điện cấp ${level}: đất hình vuông đổi thành danh sách khoảnh, công trình giữ nguyên`, () => {
      const s = createInitialState(0);
      setDien(s, level);
      s.resources = { gao: 1e5, voOc: 1e5, datDa: 1e5, sat: 1e5 };
      const lo = RIVER_START - V11_AREA[level - 1];
      expect(place(s, 'luy', lo, lo).ok).toBe(true);
      const raw = JSON.parse(serialize(s));
      raw.version = 11;
      delete raw.khoanh;
      const back = deserialize(JSON.stringify(raw))!;
      expect(back).toBeDefined();
      expect(back.version).toBe(SAVE_VERSION);
      expect(back.khoanh).toEqual(squareKhoanh(V11_AREA[level - 1]));
      expect(back.buildings).toEqual(s.buildings);
      expect(isOpen(back, lo, lo)).toBe(true);
      expect(isOpen(back, lo - 1, lo)).toBe(false);
    });
  }

  it('đã mở nhiều hơn lượt của cấp (Điện 6: 64 khoảnh, lượt 60) thì giữ đất, chưa phát thêm được', () => {
    const s = createInitialState(0);
    setDien(s, 6);
    expect(s.khoanh.length).toBe(64);
    expect(khoanhLeft(s)).toBe(0);
    expect(canOpenKhoanh(s, khoanhId(1, 9))).toEqual({ ok: false, reason: 'hetLuotKhoanh' });
  });

  it('từ chối bản lưu có danh sách khoảnh hỏng', () => {
    const s = createInitialState(0);
    const raw = JSON.parse(serialize(s));
    raw.khoanh = [1, 1];
    expect(deserialize(JSON.stringify(raw))).toBeUndefined();
    raw.khoanh = [100];
    expect(deserialize(JSON.stringify(raw))).toBeUndefined();
  });
});
