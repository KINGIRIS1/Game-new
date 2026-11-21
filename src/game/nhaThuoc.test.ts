// Canh nhà thuốc nam: mở ở Điện 4, cứu 30% → 55% quân ngã theo cấp, giường đầy thì phần thừa mất, chữa dần theo giờ
// (cả lúc vắng), doanh trại hết chỗ thì nằm chờ, nhà hư thì đồng hồ đứng, thương binh vẫn ăn gạo, mọi trận trừ đảo
// (giữ kinh đô, phó bản, đánh đồn, Đấu thành đánh thật), nâng bản lưu 35 lên 36.

import { describe, expect, it } from 'vitest';
import { startStage } from './campaign';
import { BUILDINGS, DEFAULT_ROWS, NHA_THUOC, UNITS } from './defs';
import { newDauThanh, nhanKetQua } from './dauThat';
import { applyOffline, canPlace, createInitialState, findSpot, foodPerMinute, limitOf, place, tick, train, troopCap, troopSpace, type Building, type GameState } from './game';
import { chuaMs, choKhoi, giuongDung, hoiThuong, nhanThuong, soGiuong, tiLeCuu, truQuanNga } from './nhaThuoc';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { DIEN, DIEN_END, setDien } from './testmap';

/** Kinh đô ở Điện `level`, của nhiều, có doanh trại cấp 3 và trại giáo. */
function capital(level = 4): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.resources = { gao: 50_000, voOc: 50_000, datDa: 50_000, sat: 10_000, go: 10_000 };
  const barracks = place(s, 'doanhTrai', DIEN - 10, DIEN_END + 2);
  if (!barracks.ok) throw new Error('dựng doanh trại thử thất bại');
  barracks.value.level = 3;
  if (!place(s, 'traiGiao', DIEN - 1, DIEN_END + 2).ok) throw new Error('dựng trại giáo thử thất bại');
  return s;
}

function nhaThuoc(s: GameState, level = 1): Building {
  const spot = findSpot(s, 'nhaThuoc');
  if (!spot) throw new Error('không có chỗ dựng nhà thuốc');
  const r = place(s, 'nhaThuoc', spot.x, spot.z);
  if (!r.ok) throw new Error(r.reason);
  r.value.level = level;
  return r.value;
}

const army = (giao = 0, cung = 0, voi = 0, no = 0) => ({ giao, cung, voi, no });

describe('nhà thuốc nam', () => {
  it('mở ở Điện 4, mỗi kinh đô một nhà; cấp 1 → 10 cứu 30% → 55%', () => {
    const s = capital(3);
    expect(canPlace(s, 'nhaThuoc', 10, 10)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    setDien(s, 4);
    expect(limitOf(s, 'nhaThuoc')).toBe(1);
    expect(BUILDINGS.nhaThuoc.maxLevel).toBe(10);
    expect(NHA_THUOC.cuu[0]).toBe(0.3);
    expect(NHA_THUOC.cuu[9]).toBe(0.55);
    for (let i = 1; i < 10; i++) {
      expect(NHA_THUOC.cuu[i]).toBeGreaterThan(NHA_THUOC.cuu[i - 1]);
      expect(NHA_THUOC.giuong[i]).toBeGreaterThan(NHA_THUOC.giuong[i - 1]);
      expect(NHA_THUOC.chuaMs[i]).toBeLessThan(NHA_THUOC.chuaMs[i - 1]);
    }
  });

  it('không có nhà thuốc thì quân ngã mất hẳn như cũ', () => {
    const s = capital();
    s.troops = army(10);
    expect(truQuanNga(s, army(10))).toBeUndefined();
    expect(s.troops.giao).toBe(0);
    expect(giuongDung(s)).toBe(0);
  });

  it('cứu floor(ngã × tỉ lệ) mỗi binh chủng, giường tính bằng chỗ quân, phần thừa mất', () => {
    const s = capital();
    nhaThuoc(s, 1);
    expect(tiLeCuu(s)).toBe(0.3);
    expect(soGiuong(s)).toBe(8);
    s.troops = army(10, 10, 3);
    // 10 giáo × 0,3 = 3; 10 cung × 0,3 = 3; 3 voi × 0,3 = 0.
    expect(truQuanNga(s, army(10, 10, 3))).toEqual(army(3, 3, 0));
    expect(s.troops).toEqual(army());
    expect(s.thuong.linh).toEqual(army(3, 3, 0));
    expect(giuongDung(s)).toBe(6);
    // Còn 2 giường: 20 giáo ngã lẽ ra cứu 6, chỉ còn chỗ cho 2.
    expect(nhanThuong(s, army(20))).toEqual(army(2));
    expect(giuongDung(s)).toBe(8);
    expect(nhanThuong(s, army(20))).toEqual(army());
  });

  it('chữa dần theo giờ, khỏi thì về doanh trại; voi chiến lâu gấp ba', () => {
    const s = capital();
    nhaThuoc(s, 1);
    s.thuong.linh = army(2, 0, 1);
    const ms = NHA_THUOC.chuaMs[0];
    expect(chuaMs(s, 'giao')).toBe(ms);
    expect(chuaMs(s, 'voi')).toBe(ms * UNITS.voi.space);
    tick(s, ms - 1);
    expect(s.troops.giao).toBe(0);
    expect(choKhoi(s)).toEqual({ k: 'giao', ms: 1, cho: false });
    tick(s, 1);
    expect(s.troops.giao).toBe(1);
    // Còn một giáo binh rồi tới voi.
    expect(hoiThuong(s, ms + 3 * ms)).toEqual(army(1, 0, 1));
    expect(s.thuong.linh).toEqual(army());
    expect(s.thuong.ms).toBe(0);
    expect(choKhoi(s)).toBeNull();
  });

  it('doanh trại hết chỗ thì thương binh nằm chờ, có chỗ thì về ngay', () => {
    const s = capital();
    nhaThuoc(s, 1);
    const cap = troopCap(s);
    s.troops = army(cap);
    s.thuong.linh = army(1);
    hoiThuong(s, 10 * NHA_THUOC.chuaMs[0]);
    expect(s.thuong.linh.giao).toBe(1);
    expect(choKhoi(s)).toEqual({ k: 'giao', ms: 0, cho: true });
    s.troops.giao -= 1;
    expect(hoiThuong(s, 1)).toEqual(army(1));
    expect(troopSpace(s)).toBe(cap);
  });

  it('nhà thuốc hư thì không cứu, không chữa', () => {
    const s = capital();
    const b = nhaThuoc(s, 5);
    s.thuong.linh = army(3);
    b.damaged = true;
    expect(tiLeCuu(s)).toBe(0);
    expect(nhanThuong(s, army(10))).toEqual(army());
    tick(s, 60_000);
    expect(s.thuong.linh.giao).toBe(3);
    expect(choKhoi(s)).toBeNull();
  });

  it('thương binh vẫn ăn gạo, không tính chỗ quân', () => {
    const s = capital();
    nhaThuoc(s, 1);
    const an = foodPerMinute(s);
    s.thuong.linh = army(4);
    expect(foodPerMinute(s)).toBeCloseTo(an + 4 * UNITS.giao.upkeep);
    expect(troopSpace(s)).toBe(0);
  });

  it('lúc vắng lang y chữa suốt quãng vắng', () => {
    const s = capital();
    nhaThuoc(s, 1);
    s.thuong.linh = army(5);
    s.lastSeen = 0;
    const r = applyOffline(s, 3 * NHA_THUOC.chuaMs[0]);
    expect(r.chua).toEqual(army(3));
    expect(s.thuong.linh.giao).toBe(2);
    expect(s.troops.giao).toBe(3);
  });

  it('phó bản: thua trận thì một phần lính ngã nằm ở nhà thuốc, kết quả ghi lại', () => {
    const s = capital();
    nhaThuoc(s, 10);
    for (let i = 0; i < 3; i++) if (!train(s, 'giao').ok) throw new Error('không luyện được');
    expect(startStage(s, 1, army(3), DEFAULT_ROWS).ok).toBe(true);
    // Thương binh chỉ vào nhà thuốc lúc trận xong, nên trong lúc đánh chưa ai được chữa.
    for (let i = 0; i < 200 && s.campaign.battle && !s.campaign.battle.outcome; i++) tick(s, 1000);
    const r = s.campaign.lastResult!;
    const nga = r.lost.giao;
    expect(nga).toBeGreaterThan(0);
    const cuu = Math.floor(nga * 0.55);
    expect(r.thuong?.giao ?? 0).toBe(cuu);
    expect(s.thuong.linh.giao + s.troops.giao).toBe(3 - nga + cuu);
  });

  it('Đấu thành đánh thật: quân ngã máy chủ báo cũng được khiêng về một phần', () => {
    const s = capital();
    nhaThuoc(s, 1);
    s.troops = army(10);
    s.dauThanh = newDauThanh('u', { ten: 'A', chienCong: 0, dien: 4, khienDen: null }, [], []);
    const nhan = nhanKetQua(s, 't1', { mat: army(10), cuop: {}, ms: 1 } as never)!;
    expect(nhan.mat.giao).toBe(10);
    expect(nhan.thuong).toEqual(army(3));
    expect(s.troops.giao).toBe(0);
    expect(s.thuong.linh.giao).toBe(3);
  });

  it('bản lưu 35 lên 36: chưa có thương binh; lưu rồi đọc lại giữ thương binh', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(36);
    const s = capital();
    s.thuong.linh = army(2, 1);
    s.thuong.ms = 500;
    const back = deserialize(serialize(s))!;
    expect(back.thuong).toEqual(s.thuong);
    const raw = JSON.parse(serialize(s));
    raw.version = 35;
    delete raw.thuong;
    const old = deserialize(JSON.stringify(raw))!;
    expect(old).toBeDefined();
    expect(old.thuong).toEqual({ linh: army(), ms: 0 });
  });
});
