import { describe, expect, it } from 'vitest';
import { BUILDINGS, RELAYOUT_GRACE_MS, type BuildingType } from './defs';
import { createInitialState, occupancy, place, type GameState } from './game';
import { applyMau, planMau } from './mau';
import { DIEN_START, GRID, LEGACY_GRID, isUnlocked, legacyBaseHeights, touchesRiver } from './map';
import { placeAnywhere } from './moPhong';
import { deserialize, fromCode, saveFileName, serialize, toCode } from './save';
import { pendingStory } from './story';

describe('lưu game', () => {
  it('nâng bản lưu của lát cắt 1 lên bản mới, có đủ dân và người làm', () => {
    const v1 = {
      version: 1,
      resources: { gao: 300, voOc: 200, datDa: 0, sat: 0 },
      buildings: [
        { id: 1, type: 'dien', x: 16, z: 16, level: 2 },
        { id: 2, type: 'ruong', x: 12, z: 12, level: 1 },
        { id: 3, type: 'ben', x: 25, z: 12, level: 1 },
        { id: 4, type: 'luy', x: 13, z: 10, level: 1 },
      ],
      nextId: 5,
      questIndex: 4,
      lastSeen: 123,
      settings: { muted: true },
    };
    const s = deserialize(JSON.stringify(v1));
    expect(s?.version).toBe(11);
    expect(s?.campaign.cleared).toBe(0);
    expect(s?.giong.fed).toBe(0);
    expect(s?.story.seen).toEqual(['mo']);
    expect(s?.dan).toBe(5);
    expect(s?.buildings.find((b) => b.type === 'ruong')?.workers).toBe(2);
    expect(s?.buildings.find((b) => b.type === 'ben')?.workers).toBe(1);
    expect(s?.settings.muted).toBe(true);
  });

  it('nâng bản lưu lát cắt 2b: thêm phó bản, dời nhiệm vụ vì có nhiệm vụ mới chèn vào', () => {
    const s3 = createInitialState(5) as unknown as Record<string, unknown>;
    s3.version = 3;
    delete s3.campaign;
    delete s3.nextBattleId;
    delete s3.giong;
    delete s3.story;
    delete s3.son;
    delete s3.heights;
    s3.questIndex = 12;
    const s = deserialize(JSON.stringify(s3));
    expect(s?.version).toBe(11);
    expect(s?.questIndex).toBe(13);
    expect(s?.campaign.battle).toBeNull();
    expect(s?.nextBattleId).toBe(1);
    // Nhiệm vụ trước chỗ chèn giữ nguyên.
    s3.questIndex = 10;
    expect(deserialize(JSON.stringify(s3))?.questIndex).toBe(10);
  });

  it('xuất rồi nhập mã lưu ra đúng state cũ', () => {
    const s = createInitialState(123);
    place(s, 'luy', 12, 12);
    const code = toCode(s);
    expect(code.startsWith('TDVL2:')).toBe(true);
    expect(fromCode(code)).toEqual(s);
  });

  it('mã lưu được nén, ngắn hơn nhiều so với mã đời đầu', () => {
    const s = createInitialState(0);
    s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 };
    for (let i = 0; i < 20; i++) placeAnywhere(s, 'luy');
    expect(s.buildings.length).toBeGreaterThan(15);
    expect(toCode(s).length).toBeLessThan(maDoiDau(s).length / 4);
  });

  it('vẫn nhập được mã lưu đời đầu (TDVL1)', () => {
    const s = createInitialState(7);
    place(s, 'luy', 12, 12);
    expect(fromCode(maDoiDau(s))).toEqual(s);
  });

  it('bỏ qua dấu cách, xuống dòng do ứng dụng nhắn tin chèn vào mã', () => {
    const s = createInitialState(9);
    const code = toCode(s);
    const broken = `  ${code.slice(0, 40)}\n${code.slice(40, 90)} \r\n${code.slice(90)}\n`;
    expect(fromCode(broken)).toEqual(s);
  });

  it('từ chối mã lưu hỏng hoặc sai định dạng', () => {
    expect(fromCode('xin chào')).toBeUndefined();
    expect(fromCode('TDVL1:!!!')).toBeUndefined();
    expect(fromCode('TDVL2:!!!')).toBeUndefined();
    expect(fromCode('TDVL2:' + btoa('khong phai du lieu nen'))).toBeUndefined();
    const code = toCode(createInitialState(1));
    expect(fromCode(code.slice(0, code.length / 2))).toBeUndefined();
    expect(deserialize('{"version":2}')).toBeUndefined();
  });

  it('tên tệp lưu theo ngày giờ máy, đuôi .txt', () => {
    expect(saveFileName(new Date(2026, 10, 1, 9, 5))).toBe('thoi-dai-van-lang-2026-11-01-0905.txt');
  });

  it('từ chối công trình lạ hoặc vượt cấp tối đa', () => {
    const s = createInitialState(0);
    const bad = JSON.parse(serialize(s));
    bad.buildings.push({ id: 9, type: 'thap', x: 1, z: 1, level: 1 });
    expect(deserialize(JSON.stringify(bad))).toBeUndefined();
    const tooHigh = JSON.parse(serialize(s));
    tooHigh.buildings[0].level = 99;
    expect(deserialize(JSON.stringify(tooHigh))).toBeUndefined();
  });
});

type OldBuilding = { type: BuildingType; x: number; z: number; level?: number; workers?: number };

/** Bản lưu phiên bản 10: bản đồ cũ 30×30 (sông từ ô 27), móng cũ, Điện ở (16, 16). Tọa độ công trình theo bản đồ cũ. */
function oldSave(list: OldBuilding[], dien = 5): Record<string, unknown> {
  const s = createInitialState(0) as unknown as Record<string, unknown>;
  s.version = 10;
  delete s.relayout;
  s.heights = legacyBaseHeights();
  s.resources = { gao: 100, voOc: 100, datDa: 100, sat: 100 };
  s.buildings = [{ id: 1, type: 'dien', x: 16, z: 16, level: dien, workers: 0 }, ...list.map((b, i) => ({ id: i + 2, level: 1, workers: 0, ...b }))];
  s.nextId = list.length + 2;
  return s;
}

/** Không có hai công trình nào chồng nhau, mọi ô móng trong vùng đã khai phá. */
function expectTidy(s: GameState): void {
  let cells = 0;
  for (const b of s.buildings) {
    const def = BUILDINGS[b.type];
    cells += def.w * def.d;
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) expect(isUnlocked(b.x + dx, b.z + dz, s.buildings[0].level), `${b.type} ${b.x},${b.z}`).toBe(true);
  }
  expect(occupancy(s).filter((v) => v > 0).length).toBe(cells);
}

describe('nâng bản lưu 10 lên 11: kinh đô dựng lại trên bản đồ 38×38', () => {
  it('dịch theo sông, công trình nở về phía rừng, giữ cấp và người làm, bến vẫn sát sông', () => {
    const old = oldSave([
      { type: 'ruong', x: 12, z: 12, level: 3, workers: 2 },
      { type: 'nhaSan', x: 20, z: 16, level: 4 },
      { type: 'ben', x: 25, z: 20, level: 2, workers: 1 },
      { type: 'choiCanh', x: 14, z: 20, level: 3 },
    ]);
    const heights = old.heights as number[];
    heights[10 * LEGACY_GRID + 5] = 4;
    const s = deserialize(JSON.stringify(old))!;
    expect(s.version).toBe(11);
    expect(s.heights.length).toBe(GRID * GRID);
    expect(s.heights[18 * GRID + 13]).toBe(4);
    expect(s.buildings[0]).toMatchObject({ type: 'dien', ...DIEN_START, level: 5 });
    expect(s.buildings.find((b) => b.type === 'ruong')).toMatchObject({ x: 19, z: 19, level: 3, workers: 2 });
    // Nhà sàn sát cạnh đông của Điện: nở về phía rừng thì đè Điện mới, nên nở sang hướng khác.
    expect(s.buildings.find((b) => b.type === 'nhaSan')).toMatchObject({ x: 28, z: 23, level: 4 });
    const ben = s.buildings.find((b) => b.type === 'ben')!;
    expect(touchesRiver(ben.x, ben.z, 3, 3)).toBe(true);
    expect(ben).toMatchObject({ level: 2, workers: 1 });
    expect(s.buildings.find((b) => b.type === 'choiCanh')).toMatchObject({ x: 22, z: 28, level: 3 });
    expectTidy(s);
    // Móng ở chỗ mới được đắp phẳng.
    const r = s.buildings.find((b) => b.type === 'ruong')!;
    expect(new Set([0, 1, 2, 3].flatMap((dx) => [0, 1, 2, 3].map((dz) => s.heights[(r.z + dz) * GRID + r.x + dx]))).size).toBe(1);
  });

  it('đoạn lũy dưới nền Điện mới thì dỡ, hoàn đủ giá; đoạn khác giữ nguyên', () => {
    // Vòng lũy sát Điện cũ (ô 16–19): ô 15 và 20.
    const ring: OldBuilding[] = [];
    for (let i = 15; i <= 20; i++) for (const [x, z] of [[i, 15], [i, 20], [15, i], [20, i]]) if (!ring.some((b) => b.x === x && b.z === z)) ring.push({ type: 'luy', x, z });
    const s = deserialize(JSON.stringify(oldSave(ring)))!;
    // Điện mới ở các ô 23–27 đè lên hàng 23 và cột 23 của vòng lũy (đã dịch 8 ô): 9 đoạn.
    expect(s.buildings.filter((b) => b.type === 'luy').length).toBe(ring.length - 9);
    expect(s.resources.voOc).toBe(100 + 9 * BUILDINGS.luy.buildCost.voOc!);
    for (const b of s.buildings.filter((b) => b.type === 'luy')) expect(b.x === 28 || b.z === 28).toBe(true);
    expectTidy(s);
  });

  it('khu nhà sàn xếp khít vẫn đủ chỗ: không mất công trình nào, không chồng nhau', () => {
    const list: OldBuilding[] = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) list.push({ type: 'nhaSan', x: 3 + i * 2, z: 3 + j * 2, level: 7 });
    const s = deserialize(JSON.stringify(oldSave(list, 7)))!;
    expect(s.buildings.filter((b) => b.type === 'nhaSan').length).toBe(30);
    expectTidy(s);
  });

  it('trận đang dở được hoãn, giặc và lũ chờ thêm; Lạc hầu báo; lần áp mẫu đầu không mất phí dời', () => {
    const old = oldSave([{ type: 'ruong', x: 12, z: 12 }]);
    const raid = old.raid as Record<string, unknown>;
    Object.assign(raid, { phase: 'battle', battle: { id: 3 }, water: 0.5 });
    (old as { clock: number }).clock = 60_000;
    const s = deserialize(JSON.stringify(old))!;
    expect(s.raid).toMatchObject({ phase: 'idle', battle: null, water: 0, nextAt: 60_000 + RELAYOUT_GRACE_MS });
    expect(s.relayout).toEqual({ freeMau: true });
    expect(pendingStory(s)).toBe('moRong');
    s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6 };
    const plan = planMau(s, 'phongChau');
    expect(plan.freeMoves).toBe(true);
    expect(plan.moves.length).toBeGreaterThan(0);
    expect(applyMau(s, 'phongChau').ok).toBe(true);
    expect(s.relayout).toEqual({ freeMau: false });
    // Ván mới không có lời báo, áp mẫu tính phí dời như thường.
    const fresh = createInitialState(0);
    expect(fresh.relayout).toBeNull();
    expect(pendingStory(fresh)).toBe('mo');
  });

  it('bản lưu nâng xong lưu lại rồi nạp vẫn y nguyên', () => {
    const s = deserialize(JSON.stringify(oldSave([{ type: 'kho', x: 10, z: 10, level: 2 }])))!;
    expect(deserialize(serialize(s))).toEqual(s);
  });
});

/** Mã lưu đời đầu: JSON đổi thẳng sang base64, không nén. */
function maDoiDau(s: ReturnType<typeof createInitialState>): string {
  let bin = '';
  for (const byte of new TextEncoder().encode(serialize(s))) bin += String.fromCharCode(byte);
  return 'TDVL1:' + btoa(bin);
}
