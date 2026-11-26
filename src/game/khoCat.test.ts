// Kho cất công trình (`khoCat.ts`, `docs/thiet-ke.md` mục Kho cất công trình): cất, đặt lại, số tối đa, áp mẫu lấy
// đồ cất và cất công trình thừa, bản lưu 37.

import { describe, expect, it } from 'vitest';
import { BUILDINGS, CH2_QUEST_START, CH3_QUEST_START, CH4_QUEST_START, MOVE_FRACTION } from './defs';
import { canPlace, createInitialState, findBuilding, freeDan, limitOf, occupancy, place, productionPerMinute, usedOf, type Building, type GameState } from './game';
import { canCat, catCongTrinh, catDuocLoai, canDatLai, datLai, nhomCat } from './khoCat';
import { applyMau, mauSlots, planMau } from './mau';
import { playChapters } from './moPhong';
import { deserialize, serialize } from './save';
import { DIEN, DIEN_END, edge, setDien } from './testmap';
import { startUpgrade } from './xay';

/** Kinh đô giàu của, đã qua kết chương 1, ở chương `chapter`, Điện cấp `dien`. */
function city(dien: number, chapter: 1 | 2 | 3 | 4 = 1): GameState {
  const s = createInitialState(0);
  setDien(s, dien);
  s.giong.ascended = true;
  s.story.seen.push('langLieu');
  s.questIndex = [0, 0, CH2_QUEST_START, CH3_QUEST_START, CH4_QUEST_START][chapter];
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  s.dan = 200;
  return s;
}

function put(s: GameState, type: Building['type'], x: number, z: number): Building {
  const r = place(s, type, x, z);
  if (!r.ok) throw new Error(`${type} ${x},${z}: ${r.reason}`);
  return r.value;
}

describe('kho cất công trình', () => {
  it('cất: công trình rời kinh đô giữ cấp, hướng, hư hỏng; người làm về rảnh; không làm ra gì; không tốn gì', () => {
    const s = city(5);
    const ruong = put(s, 'ruong', DIEN_END + 1, DIEN);
    ruong.level = 3;
    ruong.damaged = true;
    const nha = put(s, 'baiDa', DIEN, DIEN_END + 1);
    nha.rot = 2;
    const before = productionPerMinute(s).datDa;
    const dan = freeDan(s);
    const res = { ...s.resources };
    expect(nha.workers).toBeGreaterThan(0);
    const r = catCongTrinh(s, nha.id);
    expect(r.ok).toBe(true);
    expect(findBuilding(s, nha.id)).toBeUndefined();
    expect(s.khoCat.map((b) => b.id)).toEqual([nha.id]);
    expect(s.khoCat[0]).toMatchObject({ type: 'baiDa', level: 1, rot: 2, workers: 0 });
    expect(freeDan(s)).toBeGreaterThan(dan);
    expect(productionPerMinute(s).datDa).toBeLessThan(before);
    expect(s.resources).toEqual(res);
    // Ô cũ trống lại.
    expect(occupancy(s)[nha.z * 76 + nha.x]).toBe(0);
    expect(catCongTrinh(s, ruong.id).ok).toBe(true);
    expect(s.khoCat.find((b) => b.id === ruong.id)).toMatchObject({ level: 3, damaged: true });
  });

  it('không cất được Điện, doanh trại, tường, cầu, đường; không cất lúc có giặc hay đang nâng cấp', () => {
    const s = city(5);
    expect(catDuocLoai('dien')).toBe(false);
    expect(catDuocLoai('doanhTrai')).toBe(false);
    expect(catDuocLoai('luy')).toBe(false);
    expect(catDuocLoai('cauSongDa')).toBe(false);
    expect(catDuocLoai('duongDat')).toBe(false);
    expect(catDuocLoai('lauNo')).toBe(true);
    expect(catDuocLoai('choiCanh')).toBe(true);
    expect(canCat(s, s.buildings[0].id)).toEqual({ ok: false, reason: 'khongCatDuoc' });
    const kho = put(s, 'kho', DIEN_END + 1, DIEN);
    s.raid.phase = 'warning';
    expect(canCat(s, kho.id)).toEqual({ ok: false, reason: 'dangCoGiac' });
    s.raid.phase = 'idle';
    expect(startUpgrade(s, kho.id).ok).toBe(true);
    expect(canCat(s, kho.id)).toEqual({ ok: false, reason: 'dangXay' });
  });

  it('đồ cất vẫn tính vào số tối đa: cất rồi không dựng thêm quá số ấy; lầu nỏ cất tính hai chòi canh', () => {
    const s = city(5);
    const n = limitOf(s, 'kho');
    const list: Building[] = [];
    for (let i = 0; i < n; i++) list.push(put(s, 'kho', edge(5, 2 + i * 4), edge(5, 2)));
    expect(catCongTrinh(s, list[0].id).ok).toBe(true);
    expect(usedOf(s, 'kho')).toBe(n);
    expect(canPlace(s, 'kho', list[0].x, list[0].z)).toEqual({ ok: false, reason: 'datGioiHan' });
    s.khoCat.push({ id: s.nextId++, type: 'lauNo', x: 0, z: 0, level: 1, workers: 0 });
    expect(usedOf(s, 'choiCanh')).toBe(2);
  });

  it('đặt lại: tốn như dời, xong ngay, giữ cấp; chỗ phải trống, trong đất đã mở; đồ không có trong kho thì báo', () => {
    const s = city(5);
    const nha = put(s, 'nhaSan', DIEN_END + 1, DIEN);
    nha.level = 4;
    expect(catCongTrinh(s, nha.id).ok).toBe(true);
    const chan = put(s, 'kho', DIEN_END + 1, DIEN);
    expect(canDatLai(s, nha.id, chan.x, chan.z)).toEqual({ ok: false, reason: 'datBiChiem' });
    expect(canDatLai(s, nha.id, 0, 0)).toEqual({ ok: false, reason: 'ngoaiVung' });
    expect(canDatLai(s, 9999, DIEN, DIEN_END + 1)).toEqual({ ok: false, reason: 'khongCoTrongKho' });
    const voOc = s.resources.voOc;
    const r = datLai(s, nha.id, DIEN, DIEN_END + 1, 1);
    expect(r.ok).toBe(true);
    const b = findBuilding(s, nha.id)!;
    expect(b).toMatchObject({ x: DIEN, z: DIEN_END + 1, level: 4, rot: 1 });
    expect(s.khoCat).toEqual([]);
    expect(voOc - s.resources.voOc).toBe(Math.ceil((BUILDINGS.nhaSan.buildCost.voOc ?? 0) * MOVE_FRACTION));
  });

  it('bảng kho gộp đồ cùng loại, cùng cấp', () => {
    const s = city(5);
    const a = put(s, 'nhaSan', DIEN_END + 1, DIEN);
    const b = put(s, 'nhaSan', DIEN_END + 5, DIEN);
    const c = put(s, 'kho', DIEN, DIEN_END + 1);
    c.level = 2;
    for (const x of [a, b, c]) expect(catCongTrinh(s, x.id).ok).toBe(true);
    expect(nhomCat(s)).toEqual([
      { type: 'nhaSan', level: 1, damaged: false, ids: [a.id, b.id] },
      { type: 'kho', level: 2, damaged: false, ids: [c.id] },
    ]);
  });

  it('áp mẫu: đồ đang cất được đặt vào chỗ của mẫu trước khi dựng mới, giữ cấp, tốn như dời', () => {
    const s = city(5);
    const nha = put(s, 'nhaSan', DIEN_END + 1, DIEN);
    nha.level = 3;
    expect(catCongTrinh(s, nha.id).ok).toBe(true);
    const plan = planMau(s, 'phongChau');
    expect(plan.layRa.map((m) => m.id)).toEqual([nha.id]);
    const slot = plan.layRa[0];
    expect(mauSlots('phongChau', 5).some((x) => x.type === 'nhaSan' && x.x === slot.x && x.z === slot.z)).toBe(true);
    // Dựng thêm vừa đủ số tối đa: cái lấy từ kho đã chiếm một chỗ.
    expect(plan.builds.filter((x) => x.type === 'nhaSan').length).toBe(limitOf(s, 'nhaSan') - 1);
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    expect(s.khoCat).toEqual([]);
    expect(findBuilding(s, nha.id)).toMatchObject({ x: slot.x, z: slot.z, level: 3 });
  });

  it('áp mẫu: công trình không có chỗ trong mẫu mà vướng mẫu thì cất vào kho; tắt cất thì tìm chỗ trống gần nhất, hết chỗ mới cất', () => {
    const s = city(5);
    // Đền Cổ Loa, Hồ Kim Quy: mẫu Phong Châu chỉ chừa chỗ từ Điện 8. Đặt đè lên chỗ trại giáo, doanh trại của mẫu.
    const slot = (t: Building['type']) => mauSlots('phongChau', 5).find((x) => x.type === t)!;
    const den: Building = { id: s.nextId++, type: 'denCoLoa', x: slot('traiGiao').x, z: slot('traiGiao').z, level: 1, workers: 0 };
    const ho: Building = { id: s.nextId++, type: 'hoKimQuy', x: slot('doanhTrai').x, z: slot('doanhTrai').z, level: 2, workers: 0 };
    s.buildings.push(den, ho);
    const plan = planMau(s, 'phongChau');
    expect(plan.cat.sort()).toEqual([den.id, ho.id].sort());
    expect(plan.stuck).toEqual([]);
    // Tắt cất: đền 4×4 tìm được chỗ trống gần nhất; hồ 8×8 không còn chỗ nào thì vẫn cất (không chặn áp mẫu).
    const tat = planMau(s, 'phongChau', true, false);
    expect(tat.moves.some((m) => m.id === den.id)).toBe(true);
    expect(tat.cat).toEqual([ho.id]);
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    expect(s.khoCat.map((b) => b.id).sort()).toEqual([den.id, ho.id].sort());
    expect(s.khoCat.find((b) => b.id === ho.id)!.level).toBe(2);
    expect(s.buildings.some((b) => b.type === 'doanhTrai' && b.x === slot('doanhTrai').x && b.z === slot('doanhTrai').z)).toBe(true);
  });

  it('công trình có chỗ trong mẫu mà chỗ ấy còn trong rừng chưa phát thì không cất, dời tới chỗ trống như cũ', () => {
    // Kinh đô người chơi mô phỏng lúc lên Điện 5: đất đã mở nhỏ hơn khung mẫu.
    const s = createInitialState(0);
    playChapters({ s, until: (m) => m.at5 >= 0 });
    const plan = planMau(s, 'phongChau');
    expect(plan.stuck).toEqual([]);
    expect(plan.cat).toEqual([]);
    expect(plan.moves.length).toBeGreaterThan(0);
  });

  it('bản lưu 37: kho cất lưu rồi mở lại được; bản lưu 36 lên 37 có kho trống; kho sai thì bị từ chối', () => {
    const s = city(5);
    const nha = put(s, 'nhaSan', DIEN_END + 1, DIEN);
    nha.level = 2;
    expect(catCongTrinh(s, nha.id).ok).toBe(true);
    const back = deserialize(serialize(s))!;
    expect(back.khoCat).toEqual([{ ...nha }]);
    const old = JSON.parse(serialize(s)) as Record<string, unknown>;
    old.version = 36;
    delete old.khoCat;
    expect(deserialize(JSON.stringify(old))!.khoCat).toEqual([]);
    const trung = JSON.parse(serialize(s)) as { khoCat: Building[]; buildings: Building[] };
    trung.khoCat[0].id = trung.buildings[0].id;
    expect(deserialize(JSON.stringify(trung))).toBeUndefined();
    const tuong = JSON.parse(serialize(s)) as { khoCat: Building[] };
    tuong.khoCat[0].type = 'luy';
    expect(deserialize(JSON.stringify(tuong))).toBeUndefined();
  });
});
