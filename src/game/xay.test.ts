// Thời gian xây và tốp thợ (`xay.ts`): dựng mới, nâng cấp, đắp cả mảng tường đều là việc giao cho một tốp thợ; công
// trình dựng dở chưa làm gì, công trình đang nâng làm ở cấp cũ; thợ xây tiếp lúc vắng đủ tốc độ; hủy việc hoàn của;
// câu đố sử bớt thời gian; áp mẫu giao một tốp; bản lưu 25.

import { describe, expect, it } from 'vitest';
import { canScout, bridgeheadCells, plotId, plotOf, plotOrigin, poiAt, FAR_ALONG, type Bank } from './benKia';
import { wallRings } from './coLoa';
import {
  BUILDINGS,
  CH3_QUEST_START,
  NEW_HINTS,
  OFFLINE_CAP_MS,
  QUIZ_TURNS,
  THO_TOC,
  XAY_O_MS,
  type BuildingType,
} from './defs';
import {
  applyOffline,
  canPlace,
  canUpgrade,
  countOf,
  createInitialState,
  dienLevel,
  findBuilding,
  housing,
  limitOf,
  nextHint,
  place,
  productionPerMinute,
  remove,
  SAVE_VERSION,
  storageCap,
  tick,
  usedOf,
  type Building,
  type GameState,
} from './game';
import { lineTiles, rectTiles, RIVER_START } from './map';
import { applyMau, canStartMau, startMau } from './mau';
import { deserialize, serialize } from './save';
import { DIEN, DIEN_END, edge, setDien } from './testmap';
import {
  cancelJob,
  conLai,
  danhSachTho,
  isBusy,
  jobOf,
  pendingBuildings,
  soTho,
  startBuild,
  startUpgrade,
  startWallUpgrade,
  startWalls,
  thoRanh,
  tongCong,
  traLoi,
  wallComponent,
  xayMs,
  type CongViec,
} from './xay';

/** Kinh đô giàu của, đủ dân, Điện cấp `dien`, chương `chapter`. */
function city(dien: number, chapter: 1 | 3 = 1): GameState {
  const s = createInitialState(0);
  setDien(s, dien);
  if (chapter === 3) s.questIndex = CH3_QUEST_START;
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  s.dan = 200;
  return s;
}

/** Bắt đầu một việc, phải được. */
function job(r: { ok: true; value: CongViec | null } | { ok: false; reason: string }): CongViec {
  if (!r.ok) throw new Error(r.reason);
  if (!r.value) throw new Error('xong ngay');
  return r.value;
}

/** Cho thời gian trôi tới khi xong việc `v` (thêm chút cho chắc). */
function finish(s: GameState, v: CongViec): void {
  tick(s, conLai(s, v) + 10);
}

describe('thời gian xây', () => {
  it('đường đi, đồ trang trí xong ngay; còn lại theo bảng, Điện chậm dần, tường tính theo ô', () => {
    expect(xayMs('duongDat', 1)).toBe(0);
    expect(xayMs('cayDa', 1)).toBe(0);
    expect(xayMs('ruong', 1)).toBe(15_000);
    expect(xayMs('dien', 2)).toBe(60_000);
    expect(xayMs('dien', 10)).toBe(180 * 60_000);
    expect(xayMs('luy', 1)).toBe(XAY_O_MS.luy![1]);
    for (const t of Object.keys(BUILDINGS) as BuildingType[]) {
      const def = BUILDINGS[t];
      if (!def.buildable || def.decor) continue;
      expect(xayMs(t, 1), t).toBeGreaterThan(0);
      for (let lv = 2; lv <= def.maxLevel; lv++) expect(xayMs(t, lv), `${t} ${lv}`).toBeGreaterThanOrEqual(xayMs(t, lv - 1));
    }
  });
});

describe('tốp thợ, nhà thợ hồ', () => {
  it('Điện có sẵn một tốp; mỗi nhà thợ hồ thêm một tốp, tối đa 1, 2, 3, 4 nhà ở Điện 1, 3, 5, 8', () => {
    const s = city(1);
    expect(danhSachTho(s).map((t) => t.type)).toEqual(['dien']);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lv) => BUILDINGS.thoHo.limit[lv - 1])).toEqual([1, 1, 2, 2, 3, 3, 3, 4, 4, 4]);
    expect(BUILDINGS.thoHo.maxLevel).toBe(10);
    expect(NEW_HINTS[0]).toBe('thoHo');
    expect(nextHint(s)).toBe('thoHo');
  });

  it('nhà thợ hồ dựng xong mới có tốp; tốp nhanh theo cấp nhà, việc giao cho tốp rảnh nhanh nhất', () => {
    const s = city(5);
    const v = job(startBuild(s, 'thoHo', edge(5, 1), edge(5, 1)));
    expect(soTho(s)).toEqual({ ranh: 0, tong: 1 });
    finish(s, v);
    expect(soTho(s)).toEqual({ ranh: 2, tong: 2 });
    const nha = s.buildings.find((b) => b.type === 'thoHo')!;
    nha.level = 4;
    expect(thoRanh(s)!.id).toBe(nha.id);
    expect(thoRanh(s)!.toc).toBe(THO_TOC[3]);
    const r = job(startBuild(s, 'ruong', edge(5, 6), edge(5, 1)));
    expect(r.tho).toBe(nha.id);
    expect(conLai(s, r)).toBeCloseTo(15_000 / THO_TOC[3]);
  });

  it('hết tốp rảnh thì báo bận; xong việc thì tốp rảnh lại', () => {
    const s = city(1);
    const v = job(startBuild(s, 'ruong', edge(1, 1), edge(1, 1)));
    expect(startBuild(s, 'ben', RIVER_START - 3, edge(1, 8))).toEqual({ ok: false, reason: 'hetTho' });
    expect(startUpgrade(s, s.buildings[0].id)).toEqual({ ok: false, reason: 'hetTho' });
    finish(s, v);
    expect(startBuild(s, 'ben', RIVER_START - 3, edge(1, 8)).ok).toBe(true);
  });
});

describe('dựng mới', () => {
  it('công trình dựng dở chiếm ô, tính vào số tối đa nhưng chưa làm gì; xong thì vào kinh đô, dân vào làm', () => {
    const s = city(1);
    const gao = productionPerMinute(s).gao;
    const cap = storageCap(s);
    const room = housing(s);
    const v = job(startBuild(s, 'ruong', edge(1, 1), edge(1, 1)));
    expect(countOf(s, 'ruong')).toBe(0);
    expect(usedOf(s, 'ruong')).toBe(1);
    expect(pendingBuildings(s).map((b) => b.type)).toEqual(['ruong']);
    expect(canPlace(s, 'luy', edge(1, 2), edge(1, 2))).toEqual({ ok: false, reason: 'datBiChiem' });
    tick(s, 10_000);
    expect(productionPerMinute(s).gao).toBe(gao);
    expect(countOf(s, 'ruong')).toBe(0);
    tick(s, 5_100);
    expect(s.xay.viec).toEqual([]);
    expect(countOf(s, 'ruong')).toBe(1);
    const ruong = s.buildings.find((b) => b.type === 'ruong')!;
    expect(ruong.workers).toBeGreaterThan(0);
    expect(productionPerMinute(s).gao).toBeGreaterThan(gao);
    expect(storageCap(s)).toBe(cap);
    expect(housing(s)).toBe(room);
    expect(v.xong).toBe(1);
  });

  it('kho, nhà sàn dựng dở chưa cho sức chứa, chỗ ở; bến dựng dở chưa gọi thuyền buôn', () => {
    const s = city(3);
    const cap = storageCap(s);
    const room = housing(s);
    job(startBuild(s, 'kho', edge(3, 1), edge(3, 1)));
    expect(storageCap(s)).toBe(cap);
    s.buildings.push({ id: s.nextId++, type: 'thoHo', x: edge(3, 6), z: edge(3, 1), level: 1, workers: 0 });
    job(startBuild(s, 'nhaSan', edge(3, 10), edge(3, 1)));
    expect(housing(s)).toBe(room);
    expect(countOf(s, 'ben')).toBe(0);
  });

  it('hủy việc hoàn đủ của, bỏ công trình dựng dở', () => {
    const s = city(1);
    const before = { ...s.resources };
    const v = job(startBuild(s, 'ruong', edge(1, 1), edge(1, 1)));
    expect(s.resources.voOc).toBe(before.voOc - BUILDINGS.ruong.buildCost.voOc!);
    tick(s, 5_000);
    const r = cancelJob(s, v.id);
    expect(r).toEqual({ ok: true, value: BUILDINGS.ruong.buildCost });
    expect(s.resources.voOc).toBeCloseTo(before.voOc, 5);
    expect(pendingBuildings(s)).toEqual([]);
    expect(canPlace(s, 'ruong', edge(1, 1), edge(1, 1)).ok).toBe(true);
  });
});

describe('nâng cấp', () => {
  it('công trình đang nâng làm việc ở cấp cũ, không nâng chồng; xong thì lên cấp', () => {
    const s = city(5);
    const ruong = place(s, 'ruong', edge(5, 1), edge(5, 1));
    if (!ruong.ok) throw new Error(ruong.reason);
    const gao = productionPerMinute(s).gao;
    const v = job(startUpgrade(s, ruong.value.id));
    expect(ruong.value.level).toBe(1);
    expect(isBusy(s, ruong.value.id)).toBe(true);
    expect(canUpgrade(s, ruong.value.id)).toEqual({ ok: false, reason: 'dangXay' });
    tick(s, xayMs('ruong', 2) / 2);
    expect(productionPerMinute(s).gao).toBe(gao);
    finish(s, v);
    expect(ruong.value.level).toBe(2);
    expect(isBusy(s, ruong.value.id)).toBe(false);
  });

  it('Điện đang nâng thì giới hạn vẫn theo cấp cũ tới khi xong', () => {
    const s = city(2);
    const dien = s.buildings.find((b) => b.type === 'dien')!;
    const limit = limitOf(s, 'ruong');
    const v = job(startUpgrade(s, dien.id));
    expect(dienLevel(s)).toBe(2);
    expect(limitOf(s, 'ruong')).toBe(limit);
    finish(s, v);
    expect(dienLevel(s)).toBe(3);
    expect(limitOf(s, 'ruong')).toBeGreaterThan(limit);
  });

  it('đoạn tường đang có thợ thì không dỡ được, không đắp đè được', () => {
    const s = city(3, 3);
    const luy = place(s, 'luy', DIEN - 3, DIEN - 3);
    if (!luy.ok) throw new Error(luy.reason);
    job(startUpgrade(s, luy.value.id));
    expect(remove(s, luy.value.id)).toEqual({ ok: false, reason: 'dangXay' });
    expect(canPlace(s, 'thanh', DIEN - 3, DIEN - 3)).toEqual({ ok: false, reason: 'datBiChiem' });
  });
});

describe('đắp cả mảng tường', () => {
  it('một tốp đắp lần lượt từng ô, ô xong là thành tường ngay; khung thành chỉ kín khi đắp đủ', () => {
    const s = city(8, 3);
    const tiles = rectTiles({ x: DIEN - 2, z: DIEN - 2 }, { x: DIEN_END + 1, z: DIEN_END + 1 });
    const r = startWalls(s, 'thanh', tiles);
    expect(r.n).toBe(tiles.length);
    const v = r.job!;
    expect(tongCong(v)).toBe(tiles.length * XAY_O_MS.thanh![1]);
    expect(soTho(s).ranh).toBe(0);
    tick(s, XAY_O_MS.thanh![1] * 3 + 10);
    expect(countOf(s, 'thanh')).toBe(3);
    expect(usedOf(s, 'thanh')).toBe(tiles.length);
    expect(wallRings(s)).toBe(0);
    finish(s, v);
    expect(countOf(s, 'thanh')).toBe(tiles.length);
    expect(wallRings(s)).toBe(1);
  });

  it('thành đắp đè lên lũy: lũy cũ đứng tới khi đoạn ấy đắp xong', () => {
    const s = city(8, 3);
    const z = DIEN - 3;
    for (let x = DIEN; x < DIEN + 3; x++) expect(place(s, 'luy', x, z).ok).toBe(true);
    const r = startWalls(s, 'thanh', lineTiles({ x: DIEN, z }, { x: DIEN + 2, z }));
    expect(r.n).toBe(3);
    expect(countOf(s, 'luy')).toBe(3);
    expect(usedOf(s, 'thanh')).toBe(3);
    tick(s, XAY_O_MS.thanh![1] + 10);
    expect(countOf(s, 'luy')).toBe(2);
    expect(countOf(s, 'thanh')).toBe(1);
    finish(s, r.job!);
    expect(countOf(s, 'luy')).toBe(0);
    expect(countOf(s, 'thanh')).toBe(3);
  });

  it('hủy giữa chừng: ô đã đắp giữ lại, ô chưa đắp hoàn của', () => {
    const s = city(5);
    const voOc = s.resources.voOc;
    const r = startWalls(s, 'luy', lineTiles({ x: DIEN - 8, z: DIEN - 3 }, { x: DIEN - 8, z: DIEN - 12 }));
    expect(r.n).toBe(10);
    tick(s, XAY_O_MS.luy![1] * 4 + 10);
    expect(countOf(s, 'luy')).toBe(4);
    cancelJob(s, r.job!.id);
    expect(countOf(s, 'luy')).toBe(4);
    expect(s.resources.voOc).toBeCloseTo(voOc - 4 * BUILDINGS.luy.buildCost.voOc!, 5);
  });

  it('nâng cả đoạn liền: các ô cùng loại cùng cấp nối cạnh, một việc', () => {
    const s = city(5);
    for (let x = DIEN; x < DIEN + 5; x++) expect(place(s, 'luy', x, DIEN - 3).ok).toBe(true);
    expect(place(s, 'luy', DIEN + 7, DIEN - 3).ok).toBe(true);
    const first = s.buildings.find((b) => b.type === 'luy' && b.x === DIEN + 2)!;
    expect(wallComponent(s, first.id).length).toBe(5);
    const v = job(startWallUpgrade(s, first.id));
    expect(v.o.length).toBe(5);
    finish(s, v);
    expect(s.buildings.filter((b) => b.type === 'luy' && b.level === 2).length).toBe(5);
  });
});

describe('lúc vắng', () => {
  it('thợ xây tiếp đủ tốc độ, không giới hạn giờ; sản xuất vẫn chỉ tính 8 giờ đầu', () => {
    const s = city(8);
    s.adv.bien = true;
    const dien = s.buildings.find((b) => b.type === 'dien')!;
    const v = job(startUpgrade(s, dien.id));
    // Việc dài hơn hẳn 8 giờ vắng mà sản xuất được tính.
    v.o[0].ms = 10 * 3_600_000;
    s.lastSeen = 0;
    const early = applyOffline(s, 9 * 3_600_000);
    expect(early.ms).toBe(OFFLINE_CAP_MS);
    expect(early.built).toBe(0);
    expect(v.lam).toBeCloseTo(9 * 3_600_000);
    const off = applyOffline(s, 11 * 3_600_000);
    expect(off.built).toBe(1);
    expect(dienLevel(s)).toBe(9);
  });

  it('công trình xong giữa lúc vắng làm ra từ lúc xong', () => {
    const run = (cancel: boolean) => {
      const s = city(1);
      s.resources = { gao: 0, voOc: 1000, datDa: 0, sat: 0, go: 0 };
      s.dan = 10;
      const v = job(startBuild(s, 'ruong', edge(1, 1), edge(1, 1)));
      if (cancel) cancelJob(s, v.id);
      s.lastSeen = 0;
      return applyOffline(s, 10 * 60_000);
    };
    const built = run(false);
    const none = run(true);
    expect(built.built).toBe(1);
    expect(none.built).toBe(0);
    expect(built.gained.gao).toBeGreaterThan(none.gained.gao);
  });
});

describe('đố sử', () => {
  it('mỗi câu đúng bớt một phần ba công; đúng cả ba là xong; sai thì mất lượt; tối đa ba lượt', () => {
    const s = city(5);
    const dien = s.buildings.find((b) => b.type === 'dien')!;
    s.questIndex = CH3_QUEST_START;
    const v = job(startUpgrade(s, dien.id));
    const all = tongCong(v);
    expect(traLoi(s, v.id, true).ok).toBe(true);
    expect(v.lam).toBeCloseTo(all / 3);
    expect(traLoi(s, v.id, false).ok).toBe(true);
    expect(v.lam).toBeCloseTo(all / 3);
    expect(v.hoi).toBe(2);
    expect(traLoi(s, v.id, true).ok).toBe(true);
    expect(v.hoi).toBe(QUIZ_TURNS);
    expect(traLoi(s, v.id, true)).toEqual({ ok: false, reason: 'daHoiDu' });
    expect(dienLevel(s)).toBe(5);
    expect(conLai(s, v)).toBeCloseTo(all / 3);
    finish(s, v);
    const w = job(startUpgrade(s, s.buildings.find((b) => b.type === 'dien')!.id));
    for (let i = 0; i < QUIZ_TURNS; i++) traLoi(s, w.id, true);
    expect(dienLevel(s)).toBe(7);
    expect(s.xay.viec).toEqual([]);
  });
});

describe('cầu, áp mẫu', () => {
  it('cầu dựng dở giữ đầu cầu nhưng chưa sang được; xong mới mở đầu cầu', () => {
    const s = city(4);
    let id = -1;
    for (let i = FAR_ALONG - 1; i >= 0 && id < 0; i--) {
      const p = plotId('nam' as Bank, i, 0);
      if (plotOrigin(p).x >= edge(4) && poiAt(p)?.kind !== 'don') id = p;
    }
    const o = plotOrigin(id);
    const v = job(startBuild(s, 'cauSongDa', o.x + 1, RIVER_START));
    expect(plotOf(id).bank).toBe('nam');
    expect(bridgeheadCells(s).size).toBeGreaterThan(0);
    expect(canScout(s, id)).toEqual({ ok: false, reason: 'canCau' });
    expect(s.benKia.open).not.toContain(id);
    finish(s, v);
    expect(s.benKia.open).toContain(id);
  });

  it('áp mẫu: dời ngay, phần dựng thêm giao một tốp; xong thì như áp mẫu ngay', () => {
    const a = city(5);
    const b = city(5);
    expect(applyMau(a, 'phongChau').ok).toBe(true);
    const check = canStartMau(b, 'phongChau');
    expect(check.ok).toBe(true);
    expect(startMau(b, 'phongChau').ok).toBe(true);
    expect(b.xay.viec.length).toBe(1);
    expect(countOf(b, 'luy')).toBe(0);
    expect(canStartMau(b, 'phongChau')).toEqual({ ok: false, reason: 'dangXay' });
    finish(b, b.xay.viec[0]);
    const kinds = (s: GameState) =>
      s.buildings
        .map((x) => `${x.type}:${x.x},${x.z}`)
        .sort()
        .join(' ');
    expect(kinds(b)).toBe(kinds(a));
  });
});

describe('bản lưu 25', () => {
  it('lưu rồi nạp lại giữ việc đang làm; nạp xong làm tiếp', () => {
    const s = city(5);
    const v = job(startBuild(s, 'ruong', edge(5, 1), edge(5, 1)));
    tick(s, 5_000);
    const back = deserialize(serialize(s))!;
    expect(back.xay.viec.length).toBe(1);
    expect(back.xay.viec[0].lam).toBeCloseTo(v.lam);
    expect(jobOf(back, v.o[0].id)).toBeDefined();
    tick(back, 10_100);
    expect(countOf(back, 'ruong')).toBe(1);
    expect(findBuilding(back, v.o[0].id)?.type).toBe('ruong');
  });

  it('bản lưu 24 nâng lên chưa có việc nào', () => {
    const s = city(3);
    const raw = JSON.parse(serialize(s));
    raw.version = 24;
    delete raw.xay;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.xay).toEqual({ viec: [], nextId: 1, daHoi: [], seq: 0 });
  });

  it('việc trỏ tới công trình không còn thì bỏ khi nạp', () => {
    const s = city(5);
    const ruong = place(s, 'ruong', edge(5, 1), edge(5, 1));
    if (!ruong.ok) throw new Error(ruong.reason);
    job(startUpgrade(s, ruong.value.id));
    const raw = JSON.parse(serialize(s));
    raw.buildings = raw.buildings.filter((b: Building) => b.id !== ruong.value.id);
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.xay.viec).toEqual([]);
  });
});
