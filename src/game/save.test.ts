import { describe, expect, it } from 'vitest';
import { createInitialState, place } from './game';
import { deserialize, fromCode, serialize, toCode } from './save';

describe('lưu game', () => {
  it('xuất rồi nhập mã lưu ra đúng state cũ', () => {
    const s = createInitialState(123);
    place(s, 'luy', 12, 12);
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
