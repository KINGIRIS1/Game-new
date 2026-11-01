import { describe, expect, it } from 'vitest';
import { createInitialState, place } from './game';
import { placeAnywhere } from './moPhong';
import { deserialize, fromCode, saveFileName, serialize, toCode } from './save';

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
    expect(s?.version).toBe(10);
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
    expect(s?.version).toBe(10);
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

/** Mã lưu đời đầu: JSON đổi thẳng sang base64, không nén. */
function maDoiDau(s: ReturnType<typeof createInitialState>): string {
  let bin = '';
  for (const byte of new TextEncoder().encode(serialize(s))) bin += String.fromCharCode(byte);
  return 'TDVL1:' + btoa(bin);
}
