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
  occupancy,
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
import { GRID, inGrid } from './map';
import { chiPhiO, duongGanh, duongTu, ganhPreview, ganhType, heSoGanh, heSoTheo, markGanhHinted, needsGanhHint, vungGanh } from './vanChuyen';
import { pendingBuildings, startBuild } from './xay';

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
    expect(duongGanh(s, far)!.tuyen).toContain(gap.z * GRID + gap.x);
  });

  it('lũy, thành chắn hẳn như móng: dân không trèo qua, chỉ qua cổng thành, chỗ hở hay đoạn đã hư; đê, bẫy đi qua được', () => {
    const s = capital();
    const far = put(s, 'ruong', LO + 2, ROW);
    const w = size('ruong');
    const ring: Building[] = [];
    for (let z = ROW - 1; z <= ROW + w; z++) {
      for (let x = LO + 1; x <= LO + 2 + w; x++) {
        if (x === LO + 1 || x === LO + 2 + w || z === ROW - 1 || z === ROW + w) ring.push(push(s, 'luy', x, z));
      }
    }
    const sealed = () => {
      const g = duongGanh(s, far)!;
      return g.d === Infinity && g.heSo === GANH.san && heSoGanh(s, far) === GANH.san;
    };
    // Lũy tre, thành đất (lũy cấp 2), thành Cổ Loa: vòng kín thì ở mức sàn.
    expect(sealed()).toBe(true);
    for (const b of ring) b.level = 2;
    expect(sealed()).toBe(true);
    for (const b of ring) Object.assign(b, { type: 'thanh', level: 1 });
    expect(sealed()).toBe(true);
    // Đê, bẫy chông không chắn.
    for (const b of ring) b.type = 'de';
    expect(sealed()).toBe(false);
    for (const b of ring) b.type = 'bayChong';
    expect(sealed()).toBe(false);
    // Một đoạn thành hư: đi qua chỗ vỡ.
    for (const b of ring) b.type = 'thanh';
    const gate = ring.find((b) => b.x === LO + 2 + w && b.z === ROW + 1)!;
    gate.damaged = true;
    expect(sealed()).toBe(false);
    gate.damaged = false;
    expect(sealed()).toBe(true);
    // Thay một đoạn bằng cổng thành: đi qua cổng, không qua ô tường nào.
    gate.type = 'congThanh';
    expect(sealed()).toBe(false);
    const tuyen = duongGanh(s, far)!.tuyen;
    expect(tuyen).toContain(gate.z * GRID + gate.x);
    const walls = new Set(ring.filter((b) => b.type === 'thanh').map((b) => b.z * GRID + b.x));
    expect(tuyen.some((i) => walls.has(i))).toBe(false);
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

/** Ô (z * GRID + x) dưới móng và quanh viền móng công trình loại `type` đặt ở (x, z). */
function moVaVien(type: BuildingType, x: number, z: number): { mong: number[]; vien: number[] } {
  const def = BUILDINGS[type];
  const mong: number[] = [];
  const vien: number[] = [];
  for (let zz = z - 1; zz <= z + def.d; zz++) {
    for (let xx = x - 1; xx <= x + def.w; xx++) {
      if (!inGrid(xx, zz)) continue;
      const inside = xx >= x && xx < x + def.w && zz >= z && zz < z + def.d;
      (inside ? mong : vien).push(zz * GRID + xx);
    }
  }
  return { mong, vien };
}

describe('tuyến từ móng bất kỳ, vùng đủ sản lượng', () => {
  it('công trình đang dựng ở xa có tuyến về kho không xuyên móng nào; nâng kho thì không phải đi; có tuyến riêng tới Điện', () => {
    const s = capital();
    const kho = put(s, 'kho', DIEN - size('kho') - 1, ROW);
    expect(startBuild(s, 'nhaSan', LO, LO).ok).toBe(true);
    const site = pendingBuildings(s).find((b) => b.type === 'nhaSan')!;
    const g = duongTu(s, site, 'kho')!;
    expect(g.tuyen.length).toBeGreaterThan(5);
    const occ = occupancy(s);
    for (const i of g.tuyen) expect(occ[i]).toBe(0);
    // Kho là nơi nhận: nâng kho thì vật liệu có sẵn ngay đó.
    expect(duongTu(s, kho, 'kho')).toBe(null);
    // Bếp ở bìa xa: tới kho gần nhất, hay riêng tới Điện.
    const bep = put(s, 'bep', LO, ROW);
    const tet = duongTu(s, bep, 'dien')!;
    expect(tet.noi).toBe(s.buildings[0].id);
    expect(duongTu(s, bep, 'kho')!.noi).toBe(kho.id);
  });

  it('móng đè lên hay chạm vùng tô thì gánh đủ; báo đủ thì móng chạm vùng tô hay chạm nơi nhận', () => {
    const s = capital();
    put(s, 'kho', LO + 4, LO + 4);
    const vung = vungGanh(s, { type: 'ruong' })!;
    expect(vung.some((v) => v === 1)).toBe(true);
    expect(vung.some((v) => v === 2)).toBe(false);
    const occ = occupancy(s);
    const nhan = new Set(s.buildings.filter((b) => b.type === 'dien' || b.type === 'kho').map((b) => b.id));
    let du = 0;
    let thieu = 0;
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) {
        const { mong, vien } = moVaVien('ruong', x, z);
        if (mong.length < size('ruong') ** 2 || mong.some((i) => chiPhiO(s, i) === Infinity)) continue;
        const k = ganhPreview(s, 'ruong', x, z)!;
        const cham = [...mong, ...vien].some((i) => vung[i] > 0);
        if (cham) expect(k, `${x},${z}`).toBe(1);
        if (k === 1) expect(cham || vien.some((i) => nhan.has(occ[i])), `${x},${z}`).toBe(true);
        if (k === 1) du++;
        else thieu++;
      }
    }
    expect(du).toBeGreaterThan(0);
    expect(thieu).toBeGreaterThan(0);
  });

  it('đặt kho: phần kho mới phủ thêm tô riêng, đúng bằng vùng sau khi dựng; dời kho thì vùng quanh chỗ cũ mất', () => {
    const s = capital();
    const truoc = vungGanh(s, { type: 'ruong' })!;
    const x = LO + 2;
    const z = LO + 2;
    const bong = vungGanh(s, { type: 'kho', x, z })!;
    let them = 0;
    for (let i = 0; i < bong.length; i++) {
      if (bong[i] === 2) {
        them++;
        expect(truoc[i]).toBe(0);
      } else expect(bong[i]).toBe(truoc[i]);
    }
    expect(them).toBeGreaterThan(20);
    // Chỗ đặt chưa hợp lệ: chỉ vùng có sẵn.
    expect([...vungGanh(s, { type: 'kho' })!]).toEqual([...truoc]);
    const kho = put(s, 'kho', x, z);
    const sau = vungGanh(s, { type: 'ruong' })!;
    for (let i = 0; i < sau.length; i++) expect(sau[i], `ô ${i % GRID},${Math.floor(i / GRID)}`).toBe(bong[i] ? 1 : 0);
    // Đang dời kho: móng cũ bỏ ra, vùng quanh chỗ cũ không còn.
    const doi = vungGanh(s, { type: 'kho', skip: kho.id })!;
    const sat = (z - 1) * GRID + x;
    expect(sau[sat]).toBe(1);
    expect(doi[sat]).toBe(0);
  });

  it('chạm chọn kho, Điện, bếp: vùng riêng của nơi ấy; kho hư, công trình khác không tô; nguyên liệu Tết chưa có bếp không tô', () => {
    const s = capital();
    const kho = put(s, 'kho', LO + 2, LO + 2);
    const chon = vungGanh(s, { id: kho.id })!;
    // Sát kho là vùng riêng; sát Điện mà xa kho là phần còn lại của vùng.
    expect(chon[(kho.z - 1) * GRID + kho.x]).toBe(2);
    expect(chon[(DIEN - 1) * GRID + DIEN + 4]).toBe(1);
    const dien = vungGanh(s, { id: s.buildings[0].id })!;
    expect(dien[(kho.z - 1) * GRID + kho.x]).toBe(1);
    expect(dien[(DIEN - 1) * GRID + DIEN + 4]).toBe(2);
    kho.damaged = true;
    expect(vungGanh(s, { id: kho.id })).toBe(null);
    expect(vungGanh(s, { type: 'ruongNep', x: LO, z: LO })).toBe(null);
    expect(vungGanh(s, { type: 'nhaSan', x: LO, z: LO })).toBe(null);
    const nha = put(s, 'nhaSan', LO, ROW);
    expect(vungGanh(s, { id: nha.id })).toBe(null);
    const bep = put(s, 'bep', LO, ROW + 6);
    expect(vungGanh(s, { type: 'ruongNep' })!.some((v) => v === 1)).toBe(true);
    expect(vungGanh(s, { id: bep.id })![(bep.z - 1) * GRID + bep.x]).toBe(2);
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
      // Mẫu Cổ Loa mở ở chương 3 (từ Điện 5), lúc ấy đã có cổng thành: chỗ cổng của mẫu là cổng, tới số tối đa.
      const coLoa = id === 'coLoa' || id === 'coLoaSong';
      for (let dien = coLoa ? BUILDINGS.congThanh.minDien : 1; dien <= 10; dien++) {
        const s = createInitialState(0);
        setDien(s, dien);
        let gates = coLoa ? BUILDINGS.congThanh.limit[dien - 1] : 0;
        s.buildings = mauSlots(id, dien).map(
          (x, i): Building => ({ id: i + 1, type: x.cong && gates-- > 0 ? 'congThanh' : x.type, x: x.x, z: x.z, level: 1, workers: 1 }),
        );
        const list = s.buildings.filter((b) => ganhType(b.type) && BUILDINGS[b.type].workers);
        if (!list.length) continue;
        const mean = list.reduce((n, b) => n + heSoGanh(s, b), 0) / list.length;
        expect(mean, `${id} Điện ${dien}`).toBeGreaterThanOrEqual(0.88);
      }
    }
  });

  it('mẫu Cổ Loa: cổng không bị công trình chắn, có cặp kho ngoài vòng ngoài; công trình trong thành có lối qua cổng', () => {
    for (const id of ['coLoa', 'coLoaSong'] as const) {
      for (let dien = BUILDINGS.congThanh.minDien; dien <= 10; dien++) {
        const s = createInitialState(0);
        setDien(s, dien);
        let gates = BUILDINGS.congThanh.limit[dien - 1];
        s.buildings = mauSlots(id, dien).map(
          (x, i): Building => ({ id: i + 1, type: x.cong && gates-- > 0 ? 'congThanh' : x.type, x: x.x, z: x.z, level: 1, workers: 1 }),
        );
        const occ = occupancy(s);
        // Ô ngay trước, ngay sau mỗi cổng (theo hướng xuyên tường) không có công trình nhiều ô (vòng thành đứng sát
        // nhau thì là cổng, đoạn thành vòng kề).
        const byId = new Map(s.buildings.map((b) => [b.id, b]));
        for (const g of s.buildings.filter((b) => b.type === 'congThanh')) {
          const across = occ[g.z * GRID + g.x - 1] && occ[g.z * GRID + g.x + 1] ? [GRID, -GRID] : [1, -1];
          for (const d of across) {
            const o = byId.get(occ[g.z * GRID + g.x + d]);
            expect(o ? BUILDINGS[o.type].w : 0, `${id} Điện ${dien} cổng ${g.x},${g.z}`).toBeLessThanOrEqual(1);
          }
        }
        // Từ Điện có hai vòng thành tách nhau (Điện 7), một cặp kho ngoài vòng ngoài; công trình trong thành có lối.
        if (dien < 7) continue;
        const thanh = s.buildings.filter((b) => b.type === 'thanh' || b.type === 'congThanh');
        const lo = Math.min(...thanh.map((b) => b.x));
        const outside = s.buildings.filter((b) => b.type === 'kho' && (b.x < lo || b.z < lo));
        expect(outside.length, `${id} Điện ${dien}`).toBe(2);
        for (const b of s.buildings.filter((o) => ganhType(o.type) && o.x > lo && o.z > lo)) {
          expect(Number.isFinite(duongGanh(s, b)!.d), `${id} Điện ${dien} ${b.type} ${b.x},${b.z}`).toBe(true);
        }
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
