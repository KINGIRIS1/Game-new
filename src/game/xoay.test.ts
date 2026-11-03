// Xoay công trình: loại nào xoay được, dựng và dời theo hướng chọn, xoay tại chỗ không tốn của, bản lưu giữ hướng,
// tướng ra trận từ mặt trước doanh trại đã xoay.

import { describe, expect, it } from 'vitest';
import { startBattle } from './battle';
import { BUILDINGS, type BuildingType } from './defs';
import { canRotateType, createInitialState, findBuilding, move, place, rotOf, rotateBuilding, type Building, type GameState } from './game';
import { rotAngle, turnLocal } from './map';
import { deserialize, serialize } from './save';
import { bank, edge, setDien } from './testmap';

function city(level = 5): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.resources = { gao: 50000, voOc: 50000, datDa: 50000, sat: 20000, go: 20000 };
  s.dan = 40;
  s.raid.nextAt = null;
  return s;
}

function placeOk(s: GameState, type: BuildingType, x: number, z: number, rot = 0): Building {
  const r = place(s, type, x, z, rot);
  if (!r.ok) throw new Error(`${type}: ${r.reason}`);
  return r.value;
}

describe('xoay công trình', () => {
  it('chỉ công trình móng vuông nhiều ô xoay được; Điện, bến, làng chài, cầu, công trình một ô thì không', () => {
    for (const t of ['ruong', 'nhaSan', 'doanhTrai', 'traiGiao', 'kho', 'loRen', 'denPhuDong', 'cayDa', 'ao', 'donBien'] as const) {
      expect(canRotateType(t), t).toBe(true);
    }
    for (const t of ['dien', 'ben', 'langChai', 'cauSongDa', 'luy', 'thanh', 'congThanh', 'choiCanh', 'duongDat', 'hoa'] as const) {
      expect(canRotateType(t), t).toBe(false);
    }
    // Mọi loại xoay được đều móng vuông: xoay không đổi ô nào bị chiếm.
    for (const t of Object.keys(BUILDINGS) as BuildingType[]) if (canRotateType(t)) expect(BUILDINGS[t].w, t).toBe(BUILDINGS[t].d);
  });

  it('dựng theo hướng chọn; hướng gốc không ghi vào công trình; loại không xoay được bỏ qua hướng', () => {
    const s = city();
    const a = placeOk(s, 'nhaSan', edge(5, 1), edge(5, 1), 1);
    expect(a.rot).toBe(1);
    const b = placeOk(s, 'nhaSan', edge(5, 6), edge(5, 1), 0);
    expect('rot' in b).toBe(false);
    const c = placeOk(s, 'nhaSan', edge(5, 11), edge(5, 1), 6);
    expect(rotOf(c)).toBe(2);
    const ben = placeOk(s, 'ben', bank('ben'), edge(5, 1), 1);
    expect(ben.rot).toBeUndefined();
  });

  it('xoay tại chỗ không tốn của, vòng lại sau bốn nấc; Điện, bến không xoay được', () => {
    const s = city();
    const a = placeOk(s, 'doanhTrai', edge(5, 1), edge(5, 1));
    const before = { ...s.resources };
    const at = { x: a.x, z: a.z };
    for (let i = 1; i <= 4; i++) {
      const r = rotateBuilding(s, a.id, rotOf(a) + 1);
      expect(r.ok).toBe(true);
      expect(rotOf(a)).toBe(i % 4);
    }
    expect('rot' in a).toBe(false);
    expect(s.resources).toEqual(before);
    expect({ x: a.x, z: a.z }).toEqual(at);
    const dien = s.buildings.find((b) => b.type === 'dien')!;
    expect(rotateBuilding(s, dien.id, 1)).toEqual({ ok: false, reason: 'khongXoayDuoc' });
    const ben = placeOk(s, 'ben', bank('ben'), edge(5, 1));
    expect(rotateBuilding(s, ben.id, 1)).toEqual({ ok: false, reason: 'khongXoayDuoc' });
    expect(rotateBuilding(s, 9999, 1)).toEqual({ ok: false, reason: 'khongTimThay' });
  });

  it('dời thì đổi được hướng cùng lúc; không truyền hướng thì giữ hướng cũ', () => {
    const s = city();
    const a = placeOk(s, 'kho', edge(5, 1), edge(5, 1), 3);
    expect(move(s, a.id, edge(5, 6), edge(5, 1)).ok).toBe(true);
    expect(rotOf(a)).toBe(3);
    expect(move(s, a.id, edge(5, 11), edge(5, 1), 1).ok).toBe(true);
    expect(rotOf(findBuilding(s, a.id)!)).toBe(1);
  });

  it('bản lưu giữ hướng xoay; hướng lạ thì bản lưu bị từ chối', () => {
    const s = city();
    const a = placeOk(s, 'ruong', edge(5, 1), edge(5, 1), 2);
    const back = deserialize(serialize(s))!;
    expect(back).toBeDefined();
    expect(findBuilding(back, a.id)!.rot).toBe(2);
    const bad = JSON.parse(serialize(s));
    bad.buildings.find((x: Building) => x.id === a.id).rot = 5;
    expect(deserialize(JSON.stringify(bad))).toBeUndefined();
  });

  it('xoay điểm trên mô hình khớp góc quay của mô hình (mặt trước +z quay sang +x ở nấc 1)', () => {
    for (let r = 0; r < 4; r++) {
      const p = turnLocal(r, 0.3, 1.7);
      const a = rotAngle(r);
      // Như Object3D.rotation.y = a: x' = x cos a + z sin a, z' = −x sin a + z cos a.
      expect(p.x).toBeCloseTo(0.3 * Math.cos(a) + 1.7 * Math.sin(a));
      expect(p.z).toBeCloseTo(-0.3 * Math.sin(a) + 1.7 * Math.cos(a));
    }
    expect(turnLocal(1, 0, 1)).toEqual({ x: 1, z: -0 });
  });

  it('tướng ra trận từ mặt trước doanh trại, theo hướng đã xoay', () => {
    const s = city();
    const a = placeOk(s, 'doanhTrai', edge(5, 6), edge(5, 6));
    const def = BUILDINGS.doanhTrai;
    const cx = a.x + def.w / 2;
    const cz = a.z + def.d / 2;
    const hero = { kind: 'giong' as const, bamboo: false, glow: false, non: false };
    const spawn = () => {
      const g = startBattle(s, 1, 'bac', { hero }).fighters.find((f) => f.kind === 'giong')!;
      return { x: g.x - cx, z: g.z - cz };
    };
    let g = spawn();
    expect(g.x).toBeCloseTo(0);
    expect(g.z).toBeCloseTo(def.d / 2);
    rotateBuilding(s, a.id, 1);
    g = spawn();
    expect(g.x).toBeCloseTo(def.d / 2);
    expect(g.z).toBeCloseTo(0);
    rotateBuilding(s, a.id, 3);
    g = spawn();
    expect(g.x).toBeCloseTo(-def.d / 2);
  });
});
