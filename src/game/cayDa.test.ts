// Canh cây, đá mọc trên ô trống (kinh đô lớn PR 4, `cayDa.ts`): mọc theo đồng hồ chơi tới đủ số, chỉ trên ô trống
// đã mở, không mọc khi có giặc hay lúc vắng mặt, khoảnh vừa phát có sẵn 1–2 cái, chạm dọn được gạo hay đất đá theo
// cấp Điện, dựng đè thì dọn luôn, bản lưu 17.

import { describe, expect, it } from 'vitest';
import { clearCayDa, cayDaAt, cayDaReward, initialCayDa, isCayDaState, pruneCayDa, sowKhoanh, updateCayDa } from './cayDa';
import { CAY_DA_CAP, CAY_DA_EVERY_MS, CAY_DA_FIRST_MS, CAY_DA_KHOANH, CAY_DA_REWARD, type CayDaKind } from './defs';
import { applyOffline, createInitialState, occupancy, place, storageCap, tick, type GameState } from './game';
import { khoanhOf, openKhoanh, openMask, openable } from './khoanh';
import { GRID, RIVER_START } from './map';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { setDien } from './testmap';

/** Kinh đô Điện `level`, không có giặc kéo tới (để đồng hồ chạy mà không vướng trận). */
function capital(level = 3): GameState {
  const s = createInitialState(0);
  setDien(s, level);
  s.raid.nextAt = null;
  s.resources = { gao: 5000, voOc: 5000, datDa: 5000, sat: 500, go: 500 };
  return s;
}

/** Cho đồng hồ chơi chạy `ms`, mỗi nhịp một phút. */
function run(s: GameState, ms: number): void {
  for (let t = 0; t < ms; t += 60_000) {
    s.raid.nextAt = null;
    tick(s, Math.min(60_000, ms - t));
  }
}

describe('cây, đá mọc trên ô trống', () => {
  it('game mới chưa có; cái đầu mọc sau CAY_DA_FIRST_MS, rồi mỗi CAY_DA_EVERY_MS một cái, đủ CAY_DA_CAP thì thôi', () => {
    const s = capital();
    expect(s.cayDa.list).toEqual([]);
    run(s, CAY_DA_FIRST_MS - 60_000);
    expect(s.cayDa.list.length).toBe(0);
    run(s, 60_000);
    expect(s.cayDa.list.length).toBe(1);
    run(s, CAY_DA_EVERY_MS);
    expect(s.cayDa.list.length).toBe(2);
    run(s, CAY_DA_EVERY_MS * (CAY_DA_CAP + 4));
    expect(s.cayDa.list.length).toBe(CAY_DA_CAP);
    // Có cả cây lẫn đá.
    const kinds = new Set(s.cayDa.list.map((c) => c.kind));
    expect(kinds.size).toBe(2);
  });

  it('chỉ mọc trên ô đã mở, không có công trình, đường hay đồ trang trí; không hai cái chung một ô', () => {
    const s = capital();
    const grown = new Map<string, { kind: CayDaKind; v: number }>();
    for (let i = 0; i < 60; i++) {
      run(s, CAY_DA_EVERY_MS);
      for (const c of s.cayDa.list) grown.set(`${c.x}:${c.z}:${c.kind}:${c.v}`, c);
      // Dọn bớt để cây đá mọc tiếp, nhiều chỗ khác nhau.
      if (s.cayDa.list.length >= CAY_DA_CAP) clearCayDa(s, s.cayDa.list[0].x, s.cayDa.list[0].z);
      const mask = openMask(s);
      const occ = occupancy(s);
      const seen = new Set<number>();
      for (const c of s.cayDa.list) {
        const t = c.z * GRID + c.x;
        expect(mask[t], `ô ${c.x}, ${c.z}`).toBe(1);
        expect(occ[t], `ô ${c.x}, ${c.z}`).toBe(0);
        expect(c.x < RIVER_START && c.z < RIVER_START).toBe(true);
        expect(seen.has(t)).toBe(false);
        seen.add(t);
      }
    }
    // Chừng 60% là cây, còn lại là đá; đủ cả ba dáng.
    const all = [...grown.values()];
    expect(all.length).toBeGreaterThan(50);
    const trees = all.filter((c) => c.kind === 'cay').length / all.length;
    expect(trees).toBeGreaterThan(0.45);
    expect(trees).toBeLessThan(0.75);
    expect(new Set(all.map((c) => c.v)).size).toBe(3);
  });

  it('không mọc khi đang có giặc (cả lúc trinh sát báo), giặc đi rồi mới mọc; không mọc lúc vắng mặt', () => {
    const s = capital();
    s.clock = CAY_DA_FIRST_MS + 1;
    for (const phase of ['warning', 'battle'] as const) {
      s.raid.phase = phase;
      updateCayDa(s);
      expect(s.cayDa.list.length).toBe(0);
    }
    s.raid.phase = 'idle';
    updateCayDa(s);
    expect(s.cayDa.list.length).toBe(1);

    const away = capital();
    away.lastSeen = 0;
    applyOffline(away, 3 * 3_600_000);
    expect(away.clock).toBe(0);
    expect(away.cayDa.list.length).toBe(0);
  });

  it('khoảnh vừa phát có sẵn 1–2 cây đá trong khoảnh, kể cả khi kinh đô đã đủ số', () => {
    const counts = new Set<number>();
    for (let n = 0; n < 12; n++) {
      const s = capital();
      s.cayDa.seq = n * 5;
      run(s, CAY_DA_FIRST_MS + CAY_DA_EVERY_MS * (CAY_DA_CAP + 1));
      expect(s.cayDa.list.length).toBe(CAY_DA_CAP);
      const id = openable(s)[n % openable(s).length];
      const before = s.cayDa.list.length;
      expect(openKhoanh(s, id).ok).toBe(true);
      const fresh = s.cayDa.list.slice(before);
      expect(fresh.length).toBeGreaterThanOrEqual(CAY_DA_KHOANH[0]);
      expect(fresh.length).toBeLessThanOrEqual(CAY_DA_KHOANH[1]);
      for (const c of fresh) expect(khoanhOf(c.x, c.z)).toBe(id);
      counts.add(fresh.length);
    }
    // Lúc 1 cái, lúc 2 cái.
    expect([...counts].sort()).toEqual([1, 2]);
  });

  it('chạm dọn: cây được gạo, đá được đất đá theo cấp Điện; không vượt sức chứa kho; ô không có thì báo không thấy', () => {
    for (const level of [1, 4, 8]) {
      for (const kind of ['cay', 'da'] as CayDaKind[]) {
        const s = capital(level);
        s.resources = { gao: 100, voOc: 100, datDa: 100, sat: 0, go: 0 };
        s.cayDa.list.push({ x: 50, z: 47, kind, v: 0 });
        const r = clearCayDa(s, 50, 47);
        expect(r.ok).toBe(true);
        if (!r.ok) continue;
        const want = CAY_DA_REWARD[kind][level - 1];
        expect(r.value.gained).toEqual(want);
        expect(cayDaReward(s, kind)).toEqual(want);
        if (kind === 'cay') expect(s.resources.gao).toBe(100 + want.gao!);
        else expect(s.resources.datDa).toBe(100 + want.datDa!);
        expect(cayDaAt(s, 50, 47)).toBeUndefined();
      }
    }
    const s = capital(2);
    expect(clearCayDa(s, 50, 47)).toEqual({ ok: false, reason: 'khongTimThay' });
    // Kho đầy: không được thêm.
    s.resources.gao = storageCap(s);
    s.cayDa.list.push({ x: 50, z: 47, kind: 'cay', v: 1 });
    const full = clearCayDa(s, 50, 47);
    expect(full.ok && full.value.gained.gao).toBe(0);
    expect(s.resources.gao).toBe(storageCap(s));
  });

  it('thưởng tăng theo cấp Điện, cây được gạo nhiều hơn đá được đất đá', () => {
    for (const kind of ['cay', 'da'] as CayDaKind[]) {
      const amounts = CAY_DA_REWARD[kind].map((c) => c.gao ?? c.datDa ?? 0);
      expect(amounts.length).toBe(8);
      for (let i = 1; i < amounts.length; i++) expect(amounts[i]).toBeGreaterThan(amounts[i - 1]);
    }
    CAY_DA_REWARD.cay.forEach((c, i) => expect(c.gao!).toBeGreaterThan(CAY_DA_REWARD.da[i].datDa!));
  });

  it('dựng công trình hay trải đường đè lên thì dân dọn luôn, không được của', () => {
    const s = capital(3);
    s.cayDa.list.push({ x: 50, z: 47, kind: 'cay', v: 0 }, { x: 45, z: 45, kind: 'da', v: 2 });
    const before = { ...s.resources };
    expect(place(s, 'duongDat', 50, 47).ok).toBe(true);
    const paid = { ...s.resources };
    pruneCayDa(s);
    expect(cayDaAt(s, 50, 47)).toBeUndefined();
    expect(cayDaAt(s, 45, 45)).toBeDefined();
    expect(s.resources).toEqual(paid);
    expect(s.resources.gao).toBeLessThanOrEqual(before.gao);
    // Nhịp sau cũng dọn (giao diện đặt công trình xong là đồng hồ chạy).
    expect(place(s, 'nhaSan', 44, 44).ok).toBe(true);
    tick(s, 100);
    expect(cayDaAt(s, 45, 45)).toBeUndefined();
  });

  it('lặp lại được: hai kinh đô giống nhau mọc cây đá giống nhau', () => {
    const a = capital();
    const b = capital();
    run(a, CAY_DA_FIRST_MS + 5 * CAY_DA_EVERY_MS);
    run(b, CAY_DA_FIRST_MS + 5 * CAY_DA_EVERY_MS);
    expect(a.cayDa).toEqual(b.cayDa);
    expect(sowKhoanh(a, openable(a)[0])).toEqual(sowKhoanh(b, openable(b)[0]));
  });

  it('bản lưu 17: giữ cây đá; nâng bản lưu 16 thì chưa có cây đá, cái đầu mọc sau CAY_DA_FIRST_MS; dữ liệu hỏng thì bỏ', () => {
    expect(SAVE_VERSION).toBe(17);
    const s = capital();
    run(s, CAY_DA_FIRST_MS + 2 * CAY_DA_EVERY_MS);
    const back = deserialize(serialize(s))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.cayDa).toEqual(s.cayDa);

    const old = JSON.parse(serialize(s)) as Record<string, any>;
    old.version = 16;
    delete old.cayDa;
    const up = deserialize(JSON.stringify(old))!;
    expect(up.version).toBe(17);
    expect(up.cayDa).toEqual(initialCayDa(s.clock));
    expect(up.cayDa.nextAt).toBe(s.clock + CAY_DA_FIRST_MS);

    for (const bad of [
      { ...s.cayDa, list: [{ x: 50, z: 47, kind: 'cay', v: 0 }, { x: 50, z: 47, kind: 'da', v: 1 }] },
      { ...s.cayDa, list: [{ x: 50, z: 47, kind: 'nam', v: 0 }] },
      { ...s.cayDa, list: [{ x: RIVER_START, z: 47, kind: 'da', v: 0 }] },
      { ...s.cayDa, list: [{ x: 50, z: 47, kind: 'da', v: 9 }] },
      { list: [], seq: 0 },
    ]) {
      expect(isCayDaState(bad)).toBe(false);
      const raw = JSON.parse(serialize(s)) as Record<string, any>;
      raw.cayDa = bad;
      expect(deserialize(JSON.stringify(raw))).toBeUndefined();
    }
  });
});
