import { describe, expect, it } from 'vitest';
import { wallRings } from './coLoa';
import { BUILDINGS, CH3_QUEST_START, raiseTileCost, type BuildingType } from './defs';
import { createInitialState, dienLevel, limitOf, occupancy, place, type Building, type GameState } from './game';
import { DIEN_HOME, GRID, isUnlocked, touchesRiver } from './map';
import { mauSlots } from './mau';
import { legacyBaseHeights, levelLegacyFootprints } from './xepLai';
import { SAVE_VERSION, deserialize, fromCode, serialize, toCode } from './save';

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
    expect(s?.version).toBe(SAVE_VERSION);
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
    expect(s?.version).toBe(SAVE_VERSION);
    expect(s?.questIndex).toBe(13);
    expect(s?.campaign.battle).toBeNull();
    expect(s?.nextBattleId).toBe(1);
    // Nhiệm vụ trước chỗ chèn giữ nguyên.
    s3.questIndex = 10;
    expect(deserialize(JSON.stringify(s3))?.questIndex).toBe(10);
  });

  it('xuất rồi nhập mã lưu ra đúng state cũ', () => {
    const s = createInitialState(123);
    expect(place(s, 'luy', DIEN_HOME - 3, DIEN_HOME).ok).toBe(true);
    const back = fromCode(toCode(s));
    expect(back).toEqual(s);
  });

  it('từ chối mã lưu hỏng hoặc sai định dạng', () => {
    expect(fromCode('xin chào')).toBeUndefined();
    expect(fromCode('TDVL1:!!!')).toBeUndefined();
    expect(deserialize('{"version":2}')).toBeUndefined();
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

describe('nâng bản lưu kinh đô nhỏ lên kinh đô lớn (phiên bản 10 → 11)', () => {
  type Spec = [BuildingType, number, number, number?];
  /** Bản lưu phiên bản 10 ở kinh đô nhỏ: lưới 30×30, Điện ở (16, 16), móng nhỏ hơn một ô. */
  function legacy(dienLevel: number, specs: Spec[], questIndex = 0): Record<string, unknown> {
    const s = createInitialState(0) as unknown as Record<string, unknown>;
    s.version = 10;
    const heights = legacyBaseHeights();
    const list = [
      { id: 1, type: 'dien' as BuildingType, x: 16, z: 16, level: dienLevel, workers: 0 },
      ...specs.map(([type, x, z, level = 1], i) => ({ id: i + 2, type, x, z, level, workers: type === 'ruong' ? 2 : 0 })),
    ];
    levelLegacyFootprints(heights, list);
    s.heights = heights;
    s.buildings = list;
    s.nextId = list.length + 1;
    s.questIndex = questIndex;
    s.resources = { gao: 1000, voOc: 1000, datDa: 1000, sat: 100 };
    s.dan = 40;
    return s;
  }

  /** Mọi công trình nằm gọn trong vùng đã khai phá, không chồng nhau, bến sát sông. */
  function laidOut(s: GameState): void {
    let cells = 0;
    for (const b of s.buildings) {
      const def = BUILDINGS[b.type];
      cells += def.w * def.d;
      for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) expect(isUnlocked(b.x + dx, b.z + dz, dienLevel(s)), `${b.type} ${b.x},${b.z}`).toBe(true);
      if (def.nearRiver) expect(touchesRiver(b.x, b.z, def.w, def.d)).toBe(true);
    }
    expect(occupancy(s).filter((v) => v > 0).length).toBe(cells);
  }

  const wall = (from: number, to: number, at: number): Spec[] => Array.from({ length: to - from + 1 }, (_, i) => ['luy', from + i, at] as Spec);

  it('chương 1: dựng lại theo mẫu Phong Châu, giữ cấp và người làm, trả lại đất đã đắp', () => {
    const raw = legacy(5, [
      ['ruong', 12, 12, 3],
      ['ruong', 7, 12],
      ['ben', 25, 12, 2],
      ['ben', 25, 16],
      ['nhaSan', 12, 16, 2],
      ['nhaSan', 12, 19],
      ['baiDa', 7, 7],
      ['kho', 21, 20],
      ['doanhTrai', 9, 20, 3],
      ['traiGiao', 13, 22],
      ['choiCanh', 20, 14],
      ...wall(4, 26, 4),
    ]);
    // Một ô đất trống đã đắp thêm hai bậc.
    const heights = raw.heights as number[];
    const tile = 5 * 30 + 20;
    const h0 = heights[tile];
    heights[tile] = h0 + 2;
    const before = JSON.parse(JSON.stringify(raw.buildings)) as Building[];
    const s = deserialize(JSON.stringify(raw))!;
    expect(s).toBeDefined();
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.heights.length).toBe(GRID * GRID);
    expect(s.buildings[0]).toMatchObject({ type: 'dien', x: DIEN_HOME, z: DIEN_HOME, level: 5 });
    laidOut(s);
    // Không mất công trình nào ngoài đoạn lũy; giữ cấp, người làm.
    for (const b of before.filter((x) => x.type !== 'luy')) expect(s.buildings.find((x) => x.id === b.id), b.type).toMatchObject({ type: b.type, level: b.level, workers: b.workers });
    // Lũy đã có thì dựng đủ dải theo mẫu.
    expect(s.buildings.filter((b) => b.type === 'luy').length).toBeGreaterThanOrEqual(23);
    expect(s.relaid?.refund.datDa ?? 0).toBeGreaterThanOrEqual(raiseTileCost(h0).datDa! + raiseTileCost(h0 + 1).datDa!);
    // Mỗi chỗ đứng là một chỗ trong mẫu Phong Châu.
    const slots = mauSlots('phongChau');
    for (const b of s.buildings) expect(slots.some((x) => x.type === b.type && x.x === b.x && x.z === b.z), `${b.type} ${b.x},${b.z}`).toBe(true);
  });

  it('chương 3: giữ đủ số vòng thành Cổ Loa, đê dựng đủ dải', () => {
    const rings: Spec[] = [];
    for (const d of [2, 3, 4]) {
      const at = 16 - d;
      for (let z = at; z <= 26; z++) rings.push(['thanh', at, z]);
      for (let x = at + 1; x <= 26; x++) rings.push(['thanh', x, at]);
    }
    const dikes: Spec[] = [...Array.from({ length: 10 }, (_, i) => ['de', 3 + i, 24] as Spec)];
    const raw = legacy(5, [['ruong', 4, 4], ['nhaSan', 8, 4], ...rings, ...dikes], CH3_QUEST_START);
    const s = deserialize(JSON.stringify(raw))!;
    expect(s.version).toBe(SAVE_VERSION);
    laidOut(s);
    expect(wallRings(s)).toBeGreaterThanOrEqual(3);
    expect(s.buildings.filter((b) => b.type === 'thanh').length).toBeLessThanOrEqual(limitOf(s, 'thanh'));
    expect(s.buildings.filter((b) => b.type === 'de').length).toBeGreaterThan(10);
  });

  it('trận giữ kinh đô đang dở: giặc lùi lại, trinh sát báo lại từ đầu, trả lại của bị cướp', () => {
    const raw = legacy(2, [['kho', 21, 20]]);
    const raid = raw.raid as Record<string, unknown>;
    raid.phase = 'battle';
    raid.battle = { stolen: { gao: 50, voOc: 0, datDa: 0, sat: 0 }, fighters: [] };
    const s = deserialize(JSON.stringify(raw))!;
    expect(s.raid.phase).toBe('warning');
    expect(s.raid.battle).toBeNull();
    expect(s.resources.gao).toBe(1050);
  });

  it('bản lưu đã ở kinh đô lớn thì giữ nguyên chỗ đứng', () => {
    const s = createInitialState(0);
    place(s, 'luy', DIEN_HOME - 3, DIEN_HOME);
    const raw = JSON.parse(serialize(s));
    raw.version = 10;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.buildings).toEqual(s.buildings);
    expect(back.relaid).toBeUndefined();
  });
});
