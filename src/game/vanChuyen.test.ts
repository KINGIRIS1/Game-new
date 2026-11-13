// Canh dân gánh hàng về kho (`vanChuyen.ts`): gần Điện, kho thì đủ sản lượng, xa thì giảm dần tới mức sàn; đường đi,
// kho gần làm đường ngắn lại; kho hư không nhận; vây kín không lối thì ở mức sàn; nguyên liệu Tết gánh tới bếp hay
// kho; cá cũng phải gánh; Điện không gánh; lúc chơi, lúc vắng cùng một hệ số; bốn mẫu kinh đô ít mất vì đường xa;
// Lạc hầu gợi ý một lần; bản lưu không thêm gì.

import { describe, expect, it } from 'vitest';
import { BUILDINGS, GANH, OFFLINE_RATE, type BuildingType } from './defs';
import {
  applyOffline,
  createInitialState,
  fishOf,
  fishPerMinute,
  move,
  netPerMinute,
  newBuilding,
  outputIn,
  outputOf,
  place,
  productionPerMinute,
  slotsOf,
  tick,
  type Building,
  type GameState,
} from './game';
import { MAU_IDS, mauSlots } from './mau';
import { serialize } from './save';
import { bakeRates } from './tet';
import { DIEN, bank, edge, setDien, size } from './testmap';
import { duongGanh, ganhPreview, ganhType, heSoGanh, heSoTheo, markGanhHinted, needsGanhHint } from './vanChuyen';

/** Kinh đô Điện 5, đã qua kết chương 1 (có Hội Tết), giàu của, nhiều dân. */
function capital(): GameState {
  const s = createInitialState(0);
  setDien(s, 5);
  s.giong.ascended = true;
  s.resources = { gao: 50000, voOc: 50000, datDa: 50000, sat: 50000, go: 50000 };
  s.dan = 200;
  return s;
}

/** Đặt công trình `type` ở (x, z), đủ người làm. */
function put(s: GameState, type: BuildingType, x: number, z: number): Building {
  const r = place(s, type, x, z);
  if (!r.ok) throw new Error(`${type} ${x},${z}: ${r.reason}`);
  r.value.workers = slotsOf(r.value);
  return r.value;
}

/** Đưa thẳng công trình vào kinh đô, không xét giới hạn, mốc mở hay giá. */
function push(s: GameState, type: BuildingType, x: number, z: number): Building {
  const b = newBuilding(s, type, x, z);
  b.workers = slotsOf(b);
  s.buildings.push(b);
  return b;
}

// Bìa đất Điện 5; ruộng xa ở bìa phía tây, cùng hàng với Điện.
const LO = edge(5);
const ROW = DIEN + 2;

describe('hệ số gánh theo quãng đường', () => {
  it(`trong ${GANH.gan} ô thì đủ; xa hơn giảm dần, không dưới ${GANH.san}; không có lối thì ở mức sàn`, () => {
    expect(heSoTheo(0)).toBe(1);
    expect(heSoTheo(GANH.gan)).toBe(1);
    expect(heSoTheo(GANH.gan + 6)).toBeCloseTo((GANH.k + GANH.gan) / (GANH.k + GANH.gan + 6));
    expect(heSoTheo(GANH.gan + 6)).toBeLessThan(1);
    expect(heSoTheo(GANH.gan + 6)).toBeGreaterThan(heSoTheo(GANH.gan + 12));
    expect(heSoTheo(1000)).toBe(GANH.san);
    expect(heSoTheo(Infinity)).toBe(GANH.san);
  });

  it('ruộng sát Điện đủ sản lượng; ruộng ở bìa xa làm ra ít hơn, đúng bằng hệ số gánh', () => {
    const s = capital();
    const near = put(s, 'ruong', DIEN - size('ruong') - 1, ROW);
    const far = put(s, 'ruong', LO, ROW);
    expect(heSoGanh(s, near)).toBe(1);
    const k = heSoGanh(s, far);
    expect(k).toBeLessThan(1);
    expect(k).toBeGreaterThan(GANH.san);
    expect(outputIn(s, far).gao).toBeCloseTo(outputOf(far).gao! * k);
    expect(outputIn(s, near).gao).toBeCloseTo(outputOf(near).gao!);
    // Đường gánh đi từ sát ruộng tới sát Điện, đúng quãng đường.
    const g = duongGanh(s, far)!;
    expect(g.noi).toBe(s.buildings[0].id);
    expect(g.heSo).toBe(k);
    expect(g.tuyen.length).toBeGreaterThan(DIEN - LO - size('ruong') - 2);
  });

  it('trải đường đi thì dân đi nhanh, đường xa ngắn lại', () => {
    const s = capital();
    const far = put(s, 'ruong', LO, ROW);
    const before = duongGanh(s, far)!;
    expect(before.heSo).toBeLessThan(1);
    for (let x = LO + size('ruong'); x < DIEN; x++) put(s, 'duongDat', x, ROW + 1);
    const after = duongGanh(s, far)!;
    expect(after.d).toBeLessThan(before.d * 0.6);
    expect(after.heSo).toBe(1);
  });

  it('dựng kho gần thì đủ sản lượng; kho hư không nhận hàng; dời ruộng đi thì tính lại', () => {
    const s = capital();
    const far = put(s, 'ruong', LO, ROW);
    const k = heSoGanh(s, far);
    const kho = put(s, 'kho', LO + size('ruong') + 1, ROW);
    expect(heSoGanh(s, far)).toBe(1);
    expect(duongGanh(s, far)!.noi).toBe(kho.id);
    kho.damaged = true;
    expect(heSoGanh(s, far)).toBeCloseTo(k);
    kho.damaged = false;
    expect(move(s, far.id, LO, LO).ok).toBe(true);
    expect(heSoGanh(s, far)).toBeLessThan(k);
  });

  it('bị vây kín không còn lối thì ở mức sàn; mở một chỗ thì có lối', () => {
    const s = capital();
    const far = put(s, 'ruong', LO + 2, ROW);
    const w = size('ruong');
    const ring: Building[] = [];
    for (let z = ROW - 1; z <= ROW + w; z++) {
      for (let x = LO + 1; x <= LO + 2 + w; x++) {
        if (x === LO + 1 || x === LO + 2 + w || z === ROW - 1 || z === ROW + w) ring.push(push(s, 'choiCanh', x, z));
      }
    }
    const g = duongGanh(s, far)!;
    expect(g.d).toBe(Infinity);
    expect(g.heSo).toBe(GANH.san);
    expect(heSoGanh(s, far)).toBe(GANH.san);
    const gap = ring.find((b) => b.x === LO + 2 + w && b.z === ROW + 1)!;
    s.buildings = s.buildings.filter((b) => b.id !== gap.id);
    expect(heSoGanh(s, far)).toBeGreaterThan(GANH.san);
    // Lũy không chắn hẳn: dân trèo qua, tốn thêm quãng đường.
    for (const b of ring) b.type = 'luy';
    expect(Number.isFinite(duongGanh(s, far)!.d)).toBe(true);
  });

  it('Điện, kho, nhà sàn không gánh hàng; chỗ định đặt cho biết trước hệ số', () => {
    const s = capital();
    expect(ganhType('dien')).toBe(false);
    expect(ganhType('kho')).toBe(false);
    expect(ganhType('nhaSan')).toBe(false);
    expect(ganhType('bep')).toBe(false);
    expect(heSoGanh(s, s.buildings[0])).toBe(1);
    expect(ganhPreview(s, 'kho', LO, LO)).toBe(null);
    const at = ganhPreview(s, 'ruong', LO, ROW)!;
    const b = put(s, 'ruong', LO, ROW);
    expect(heSoGanh(s, b)).toBeCloseTo(at);
    // Đang dời: móng cũ không chắn đường của chính nó.
    expect(ganhPreview(s, 'ruong', LO, ROW + 6, b.id)).toBeCloseTo(heSoTheo(duongGanh({ ...s, buildings: s.buildings.filter((o) => o.id !== b.id) }, { ...b, z: ROW + 6 })!.d));
  });
});

describe('nguyên liệu Tết, cá', () => {
  it('nguyên liệu Tết gánh tới bếp hay về kho, nơi nào gần; chưa có bếp thì chưa mất gì', () => {
    const s = capital();
    const nep = put(s, 'ruongNep', LO, LO);
    expect(heSoGanh(s, nep)).toBe(1);
    const bep = put(s, 'bep', DIEN - size('bep') - 1, DIEN);
    const k = heSoGanh(s, nep);
    expect(k).toBeLessThan(1);
    const rate = bakeRates(s).nep;
    bep.x = LO + size('ruongNep') + 1;
    bep.z = LO;
    expect(heSoGanh(s, nep)).toBe(1);
    expect(bakeRates(s).nep).toBeCloseTo(rate / k);
  });

  it('cá làng chài ở xa cũng mất phần vì đường gánh', () => {
    const s = capital();
    const lang = put(s, 'langChai', LO, bank('langChai'));
    const k = heSoGanh(s, lang);
    expect(k).toBeLessThan(1);
    expect(fishPerMinute(s)).toBeCloseTo(fishOf(lang) * k);
  });
});

describe('dòng thời gian, mẫu, Lạc hầu, bản lưu', () => {
  it('lúc chơi và lúc vắng cùng một hệ số gánh', () => {
    const s = capital();
    put(s, 'ruong', LO, ROW);
    put(s, 'baiDa', LO, LO);
    s.resources = { gao: 100, voOc: 100, datDa: 100, sat: 100, go: 100 };
    const net = netPerMinute(s);
    const a = structuredClone(s);
    const got = tick(a, 60_000);
    expect(got.datDa).toBeCloseTo(net.datDa, 6);
    const b = structuredClone(s);
    b.lastSeen = 0;
    const off = applyOffline(b, 60_000);
    expect(off.gained.datDa).toBeCloseTo(net.datDa * OFFLINE_RATE, 6);
    expect(productionPerMinute(s).datDa).toBeGreaterThan(0);
  });

  it('bốn mẫu kinh đô ít mất vì đường xa: mỗi cấp Điện trung bình từ 88% trở lên', () => {
    for (const id of MAU_IDS) {
      for (let dien = 1; dien <= 10; dien++) {
        const s = createInitialState(0);
        setDien(s, dien);
        s.buildings = mauSlots(id, dien).map((x, i): Building => ({ id: i + 1, type: x.type, x: x.x, z: x.z, level: 1, workers: 1 }));
        const list = s.buildings.filter((b) => ganhType(b.type) && BUILDINGS[b.type].workers);
        if (!list.length) continue;
        const mean = list.reduce((n, b) => n + heSoGanh(s, b), 0) / list.length;
        expect(mean, `${id} Điện ${dien}`).toBeGreaterThanOrEqual(0.88);
      }
    }
  });

  it('Lạc hầu báo một lần khi lần đầu có công trình làm ra chưa đủ vì xa kho', () => {
    const s = capital();
    put(s, 'ruong', DIEN - size('ruong') - 1, ROW);
    expect(needsGanhHint(s)).toBe(false);
    put(s, 'ruong', LO, ROW);
    expect(needsGanhHint(s)).toBe(true);
    markGanhHinted(s);
    expect(needsGanhHint(s)).toBe(false);
  });

  it('bản lưu không thêm trường nào', () => {
    const s = capital();
    put(s, 'ruong', LO, ROW);
    const before = serialize(s);
    productionPerMinute(s);
    duongGanh(s, s.buildings[1]);
    expect(serialize(s)).toBe(before);
  });
});
