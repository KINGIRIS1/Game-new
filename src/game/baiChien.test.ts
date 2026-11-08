import { afterAll, describe, expect, it } from 'vitest';
import {
  BAI,
  BAI_THEO,
  NX,
  NZ,
  THAN_TO,
  baiById,
  baiOf,
  bao,
  dayRa,
  kiemBai,
  luoiDi,
  que,
  sdHinh,
  sdfCan,
  stageBai,
  thong,
  truot,
  type Bai,
} from './baiChien';
import { isHero, skillReady, startFieldBattle, stepField, useSkill, type Battle, type Fighter, type FieldSetup } from './battle';
import { CAMPS } from './benKia';
import { BAI_CHAM, DEFAULT_ROWS, FIELD, STAGES, SWIMMERS, UNITS, type Chapter, type EnemyType, type Terrain } from './defs';
import { SAMPLE_ARMY, SAMPLE_ARMY4, lateHeroes, playOut } from './testkit';

const W = FIELD.w;
const D = FIELD.d;
const bodyR = (f: Fighter) => (['voi', 'chienXa', 'phoTuong', 'daiTuong', 'caSau', 'thuongLuong', 'thuyTinh', 'hoTinh', 'gaTrang', 'kyBinh', 'trieuDa', 'toDinh'].includes(f.kind) || isHero(f.kind) ? 0.45 : 0.27);

/** Bố cục mẫu cho test, đăng ký tạm vào `BAI` (bỏ đi khi xong tệp). */
const MAU: Record<string, Bai> = {
  // Không có gì: phải đánh y như bãi phẳng.
  thuTrong: { id: 'thuTrong', terrain: 'rung', can: [], cham: [] },
  // Một bức tường ngang giữa bãi, chừa một lối bên trái rộng chừng 2,25 ô.
  thuTuong: { id: 'thuTuong', terrain: 'rung', can: [{ hinh: { k: 'doan', ax: 2.6, az: 11, bx: 9.6, bz: 11, half: 0.35 }, ve: 'luy' }], cham: [] },
  // Một tảng đá to giữa bãi.
  thuDa: { id: 'thuDa', terrain: 'rung', can: [{ hinh: { k: 'tron', x: 4.5, z: 11, r: 1 }, ve: 'da' }], cham: [] },
  // Một ao nước nông to giữa bãi.
  thuAo: { id: 'thuAo', terrain: 'rung', can: [], cham: [{ hinh: { k: 'tron', x: 4.5, z: 11, r: 3 }, loai: 'nuoc' }] },
  // Hai tảng đá so le, đúng luật bố cục.
  thuHopLe: {
    id: 'thuHopLe',
    terrain: 'rung',
    can: [
      { hinh: { k: 'tron', x: 2.5, z: 9, r: 0.9 }, ve: 'da' },
      { hinh: { k: 'tron', x: 6.4, z: 12.5, r: 1 }, ve: 'da' },
    ],
    cham: [{ hinh: { k: 'tron', x: 6, z: 8.5, r: 1 }, loai: 'bun' }],
  },
  // Khe quá hẹp giữa hai tảng đá (1 ô): sai luật bố cục.
  thuHep: {
    id: 'thuHep',
    terrain: 'rung',
    can: [
      { hinh: { k: 'tron', x: 2.5, z: 10.5, r: 1 }, ve: 'da' },
      { hinh: { k: 'tron', x: 5.5, z: 10.5, r: 1 }, ve: 'da' },
    ],
    cham: [],
  },
};
Object.assign(BAI, MAU);
afterAll(() => {
  for (const id of Object.keys(MAU)) delete BAI[id];
});

/** Trận ngoài bãi màn `n` (quân mẫu của chương), trên bố cục `bai`. */
function stageSetup(n: number, bai: string | null, id = 1): FieldSetup {
  const def = STAGES[n - 1];
  const [hero = null, hero2 = null] = lateHeroes(n);
  return {
    id,
    stage: n,
    enemies: def.enemies,
    waves: def.waves,
    holdS: def.holdS,
    hpScale: def.hpScale,
    army: def.chapter >= 4 ? SAMPLE_ARMY4 : SAMPLE_ARMY,
    rows: DEFAULT_ROWS,
    hero,
    hero2,
    nuTuong: def.chapter === 5 ? 'leChan' : null,
    bai,
  };
}

/** Chỗ đứng, máu của mọi người sau trận, để so hai trận. */
const snapshot = (b: Battle) => ({
  t: b.t,
  outcome: b.outcome,
  killed: b.killed,
  lost: b.lost,
  fighters: b.fighters.map((f) => [f.kind, f.x, f.z, f.hp, f.state]),
  nu: b.nuTuong,
});

/** Sau mỗi bước, không ai lọt vào vật cản, không ai ra khỏi bãi. */
function expectClear(b: Battle, bai: Bai): void {
  for (const f of b.fighters) {
    if (f.state === 'dead' || f.state === 'gone') continue;
    const r = bodyR(f);
    if (sdfCan(bai, f.x, f.z) < r - 0.02) throw new Error(`${f.kind} lọt vào vật cản ở (${f.x.toFixed(2)}, ${f.z.toFixed(2)}) lúc ${b.t.toFixed(2)}`);
    if (f.x < 0.29 || f.x > W - 0.29 || f.z < 0.29 || f.z > D - 0.29) throw new Error(`${f.kind} ra ngoài bãi`);
  }
  if (b.nuTuong && sdfCan(bai, b.nuTuong.x, b.nuTuong.z) < 0.27 - 0.02) throw new Error('nữ tướng lọt vào vật cản');
}

describe('hình vật cản', () => {
  it('khoảng cách có dấu: tròn, đoạn đầu tròn, khối vuông, đa giác', () => {
    expect(sdHinh({ k: 'tron', x: 1, z: 1, r: 0.5 }, 2, 1)).toBeCloseTo(0.5);
    expect(sdHinh({ k: 'tron', x: 1, z: 1, r: 0.5 }, 1, 1)).toBeCloseTo(-0.5);
    const doan = { k: 'doan', ax: 0, az: 0, bx: 4, bz: 0, half: 0.5 } as const;
    expect(sdHinh(doan, 2, 1)).toBeCloseTo(0.5);
    expect(sdHinh(doan, 5, 0)).toBeCloseTo(0.5);
    const vuong = { ...doan, vuong: true };
    expect(sdHinh(vuong, 2, 1)).toBeCloseTo(0.5);
    expect(sdHinh(vuong, 5, 0)).toBeCloseTo(1);
    expect(sdHinh(vuong, 5, 1.5)).toBeCloseTo(Math.hypot(1, 1));
    expect(sdHinh(vuong, 2, 0)).toBeCloseTo(-0.5);
    const da = { k: 'da', pts: [[0, 0], [2, 0], [2, 2], [0, 2]] } as const;
    expect(sdHinh(da, 1, 1)).toBeCloseTo(-1);
    expect(sdHinh(da, 3, 1)).toBeCloseTo(1);
    // Vòng bao chứa trọn hình.
    for (const h of [doan, vuong, da, { k: 'tron', x: 1, z: 1, r: 0.5 } as const]) {
      const b = bao(h);
      for (let a = 0; a < 6.3; a += 0.1) expect(sdHinh(h, b.x + Math.sin(a) * (b.r + 0.01), b.z + Math.cos(a) * (b.r + 0.01))).toBeGreaterThan(0);
    }
  });

  it('đường thẳng thông: vướng tường, tới gần đích trong tầm thì thôi xét', () => {
    const bai = MAU.thuTuong;
    expect(thong(bai, 5, 15, 5, 6, 0, 0.27, false)).toBe(false);
    expect(thong(bai, 1, 15, 1, 6, 0, 0.27, false)).toBe(true);
    // Đích ngay sau tường, trong tầm bắn: không cần đi qua tường.
    expect(thong(bai, 5, 15, 5, 9, 4.5, 0.27, false)).toBe(true);
    // Lội ao: người không bơi thì tính là vướng (để xét đường vòng), thủy quái thì không.
    expect(thong(MAU.thuAo, 4.5, 15, 4.5, 6, 0, 0.27, false)).toBe(false);
    expect(thong(MAU.thuAo, 4.5, 15, 4.5, 6, 0, 0.27, true)).toBe(true);
    // Đã đứng trong nước thì đi thẳng.
    expect(thong(MAU.thuAo, 4.5, 11, 4.5, 6, 0, 0.27, false)).toBe(true);
  });

  it('trượt dọc vật cản, hất dừng ở mép, đẩy ra chỗ trống', () => {
    const bai = MAU.thuTuong;
    // Đi chéo vào tường thì trượt dọc tường.
    const p = { x: 5.3, z: 11.5 };
    truot(bai, 0.27, p, 5, 11.75);
    expect(p).toEqual({ x: 5.3, z: 11.75 });
    // Bị đẩy xuyên qua tường thì đứng lại chỗ cũ.
    const q = { x: 5, z: 10 };
    truot(bai, 0.27, q, 5, 12);
    expect(q).toEqual({ x: 5, z: 12 });
    // Hất về phía tường: dừng trước tường.
    const h = { x: 5, z: 13 };
    que(bai, 0.45, h, 5, 8);
    expect(h.z).toBeGreaterThan(11 + 0.35 + 0.45 - 1e-6);
    expect(h.z).toBeLessThan(11 + 0.35 + 0.45 + 0.11);
    // Hất không vướng gì: tới đúng chỗ.
    const k = { x: 1, z: 13 };
    que(bai, 0.45, k, 1, 8);
    expect(k).toEqual({ x: 1, z: 8 });
    // Kẹt trong tường thì ra chỗ trống gần nhất.
    const s = { x: 6, z: 11.1 };
    dayRa(bai, 0.45, s);
    expect(sdfCan(bai, s.x, s.z)).toBeGreaterThanOrEqual(0.45);
    expect(Math.abs(s.x - 6)).toBeLessThan(0.2);
  });

  it('lưới đi phồng vật cản theo thân', () => {
    const big = luoiDi(MAU.thuDa, THAN_TO);
    const small = luoiDi(MAU.thuDa, 0.27);
    const freeCount = (f: Uint8Array) => f.reduce((a, v) => a + v, 0);
    expect(freeCount(big.free)).toBeLessThan(freeCount(small.free));
    expect(freeCount(small.free)).toBeLessThan(NX * NZ);
    expect(luoiDi(MAU.thuAo, 0.27).cham.some((v) => Math.abs(v - BAI_CHAM.nuoc) < 1e-6)).toBe(true);
  });
});

describe('luật bố cục', () => {
  it('bố cục mẫu đúng luật thì không có lỗi; khe hẹp, tường chắn gần kín thì báo', () => {
    expect(kiemBai(MAU.thuHopLe)).toEqual([]);
    expect(kiemBai(MAU.thuHep).some((s) => s.startsWith('khe hẹp'))).toBe(true);
    const tuong = kiemBai(MAU.thuTuong);
    expect(tuong).toContain('không có lối rộng 2,5 ô nối hai dải dàn quân');
    expect(tuong.some((s) => s.includes('ô trống'))).toBe(true);
  });

  it('mọi bố cục thật đúng luật', () => {
    const loi = Object.values(BAI)
      .filter((bai) => !(bai.id in MAU))
      .map((bai) => [bai.id, ...kiemBai(bai)])
      .filter((l) => l.length > 1);
    expect(loi).toEqual([]);
  });

  it('mỗi nền chỉ dùng bố cục của chính nền ấy, id đúng tên', () => {
    for (const [t, list] of Object.entries(BAI_THEO) as [Terrain, readonly (readonly [number, string | null])[]][])
      for (const [, id] of list) {
        if (id === null) continue;
        expect(baiById(id)?.terrain).toBe(t);
        expect(BAI[id].id).toBe(id);
      }
  });

  it('bật bố cục cho mọi màn và mọi đồn; rừng, bến sông, làng mỗi chương một biến thể', () => {
    for (let n = 1; n <= STAGES.length; n++) expect([n, baiById(stageBai(n))?.terrain]).toEqual([n, STAGES[n - 1].terrain]);
    for (const def of Object.values(CAMPS)) expect(baiById(baiOf(def.terrain, def.chapter))?.terrain).toBe(def.terrain);
    // Rừng, bến sông có màn tới chương 4; làng tới chương 5.
    const variants = (t: Terrain, last: Chapter) => new Set(Array.from({ length: last }, (_, i) => baiOf(t, (i + 1) as Chapter))).size;
    expect(variants('rung', 4)).toBe(4);
    expect(variants('benSong', 4)).toBe(4);
    expect(variants('lang', 5)).toBe(5);
  });

  it('id lạ thì đánh trên bãi phẳng', () => {
    expect(startFieldBattle({ ...stageSetup(1, 'khongCo') }).bai).toBeUndefined();
    expect(startFieldBattle({ ...stageSetup(1, 'thuTuong') }).bai).toBe('thuTuong');
  });
});

describe('đi quanh vật cản', () => {
  it('bố cục rỗng đánh y như bãi phẳng', () => {
    for (const n of [1, 8, 16, 24, 32, 36, 39, 40]) {
      const flat = playOut(startFieldBattle(stageSetup(n, null)), 'khongBam');
      const empty = playOut(startFieldBattle(stageSetup(n, 'thuTrong')), 'khongBam');
      expect(snapshot(empty)).toEqual(snapshot(flat));
    }
    // Có kỹ năng (trừ hất ngang của Nhổ tre, Voi xung trận: bãi phẳng để bước sau mới kẹp vào bãi).
    for (const n of [12, 19, 22, 28]) {
      const flat = playOut(startFieldBattle(stageSetup(n, null)), 'gioi');
      const empty = playOut(startFieldBattle(stageSetup(n, 'thuTrong')), 'gioi');
      expect(snapshot(empty)).toEqual(snapshot(flat));
    }
  });

  it('đánh lại ra y hệt trên bãi có vật cản', () => {
    for (const bai of ['thuTuong', 'thuAo']) {
      const a = playOut(startFieldBattle(stageSetup(24, bai)), 'gioi');
      const b = playOut(startFieldBattle(stageSetup(24, bai)), 'gioi');
      expect(snapshot(a)).toEqual(snapshot(b));
    }
  });

  it('cả trận không ai lọt vào vật cản, kể cả bị đẩy, bị hất, quân gọi thêm, Tô Định bỏ chạy', () => {
    for (const bai of ['thuTuong', 'thuDa']) {
      for (const n of [8, 16, 36, 37, 40]) {
        const b = startFieldBattle(stageSetup(n, bai, n));
        playOut(b, 'gioi', (x) => expectClear(x, MAU[bai]));
        expectClear(b, MAU[bai]);
        expect(b.outcome).not.toBeNull();
      }
    }
  });

  it('đám đông dồn vào tường không ai bị đẩy xuyên qua; lối trống bên trái thì đi qua được', () => {
    const b = startFieldBattle({ ...stageSetup(1, 'thuTuong'), army: { giao: 20, cung: 0, voi: 0, no: 0 }, hero: null, hero2: null, nuTuong: null });
    // Giặc đứng sau tường, ngay trước mặt quân ta.
    for (const f of b.fighters) if (f.side === 'giac') (f.x = 6), (f.z = 8);
    const was = new Map(b.fighters.map((f) => [f, f.z > 11]));
    let crossed = 0;
    for (let i = 0; i < 20 * 30 && !stepField(b, 0.05); i++) {
      expectClear(b, MAU.thuTuong);
      for (const f of b.fighters) {
        if (f.state === 'dead') continue;
        const below = f.z > 11;
        if (below !== was.get(f)) {
          expect(f.x).toBeLessThan(2.6);
          crossed++;
          was.set(f, below);
        }
      }
    }
    expect(crossed).toBeGreaterThan(0);
    expect(b.outcome).toBe('win');
  });

  it('mỗi bố cục thật: trận người chơi giỏi ở màn của nó không ai lọt vào vật cản, thắng trước 90 giây (màn cầm cự: giữ đủ giờ); voi đi lọt tới giặc', () => {
    const real = Object.values(BAI).filter((b) => !(b.id in MAU));
    expect(real.length).toBeGreaterThan(0);
    for (const bai of real) {
      // Màn đầu tiên dùng bố cục này; bố cục của đồn thì mượn quân giặc màn 4.
      let n = 1;
      while (n <= STAGES.length && stageBai(n) !== bai.id) n++;
      if (n > STAGES.length) n = 4;
      const b = startFieldBattle(stageSetup(n, bai.id, n));
      playOut(b, 'gioi', (x) => expectClear(x, bai));
      expect([bai.id, b.outcome]).toEqual([bai.id, 'win']);
      expect(b.t).toBeLessThan((STAGES[n - 1].holdS ?? FIELD.maxS - 0.1) + 0.1);
      const voi = startFieldBattle({ ...stageSetup(1, bai.id), army: { giao: 0, cung: 0, voi: 4, no: 0 }, hero: null, hero2: null, nuTuong: null });
      for (let i = 0; i < 20 * 60 && !stepField(voi, 0.05); i++) expectClear(voi, bai);
      expect([bai.id, voi.outcome]).toEqual([bai.id, 'win']);
    }
  });

  it('voi lọt qua lối trống để tới giặc sau tường', () => {
    const b = startFieldBattle({ ...stageSetup(1, 'thuTuong'), army: { giao: 0, cung: 0, voi: 4, no: 0 }, hero: null, hero2: null, nuTuong: null });
    for (let i = 0; i < 20 * 60 && !stepField(b, 0.05); i++) expectClear(b, MAU.thuTuong);
    expect(b.outcome).toBe('win');
  });

  it('cung thủ sau tường vẫn bắn qua tường', () => {
    const b = startFieldBattle({ ...stageSetup(1, 'thuTuong'), army: { giao: 0, cung: 1, voi: 0, no: 0 }, hero: null, hero2: null, nuTuong: null });
    const cung = b.fighters.find((f) => f.kind === 'cung')!;
    cung.x = 6;
    cung.z = 12.3;
    const foes = b.fighters.filter((f) => f.side === 'giac');
    foes.forEach((f, i) => ((f.x = 5.5 + i * 0.6), (f.z = 9.2)));
    // Giặc đứng yên (bị giữ chân), cung thủ đứng yên mà bắn.
    for (const f of foes) f.stun = 5;
    const hp = foes.reduce((a, f) => a + f.hp, 0);
    for (let i = 0; i < 20 * 3; i++) stepField(b, 0.05);
    expect(b.events.some((e) => e.kind === 'shot')).toBe(true);
    expect(foes.reduce((a, f) => a + f.hp, 0)).toBeLessThan(hp);
    expect(cung.z).toBeGreaterThan(11);
  });

  it('lội ao đi chậm, thủy quái bơi như thường', () => {
    const b = startFieldBattle({ ...stageSetup(9, 'thuAo'), army: { giao: 1, cung: 0, voi: 0, no: 0 }, hero: null, hero2: null, nuTuong: null });
    const giao = b.fighters.find((f) => f.kind === 'giao')!;
    const tom = b.fighters.find((f) => f.kind === 'tomBinh')!;
    for (const f of b.fighters) if (f !== giao && f !== tom) f.state = 'dead';
    // Cả hai đứng trong ao, cách xa nhau.
    giao.x = tom.x = 4.5;
    giao.z = 12.5;
    tom.z = 9.5;
    // Một bước: giáo binh đi bằng `BAI_CHAM.nuoc` phần tốc độ, tôm binh đi đủ.
    const gz = giao.z;
    const tz = tom.z;
    stepField(b, 0.05);
    expect(gz - giao.z).toBeCloseTo(UNITS.giao.speed * BAI_CHAM.nuoc * 0.05, 5);
    expect(SWIMMERS).toContain('tomBinh' as EnemyType);
    expect(tom.z - tz).toBeGreaterThan(0.05 * 0.9);
  });

  it('Phun lửa: ngựa sắt dừng trước đá, lửa vẫn cháy giặc sau đá', () => {
    const b = startFieldBattle({ ...stageSetup(8, 'thuDa'), army: { giao: 0, cung: 0, voi: 0, no: 0 }, hero: { kind: 'giong', bamboo: true, glow: false, non: false }, hero2: null });
    const giong = b.fighters.find((f) => f.kind === 'giong')!;
    giong.x = 4.5;
    giong.z = 13;
    const foes = b.fighters.filter((f) => f.side === 'giac');
    for (const f of foes) f.state = 'dead';
    const foe = foes[0];
    foe.state = 'move';
    foe.x = 4.5;
    foe.z = 8.5;
    const hp = foe.hp;
    b.t = 4;
    expect(skillReady(b, 'phunLua')).toBe(true);
    useSkill(b, 'phunLua');
    expect(foe.hp).toBeLessThan(hp);
    expect(sdfCan(MAU.thuDa, giong.x, giong.z)).toBeGreaterThanOrEqual(0.45 - 1e-6);
    expect(giong.z).toBeGreaterThan(11);
  });

  it('Nhổ tre hất giặc dừng ở mép tường, không văng qua', () => {
    const b = startFieldBattle({ ...stageSetup(8, 'thuTuong'), army: { giao: 0, cung: 0, voi: 0, no: 0 }, hero: { kind: 'giong', bamboo: true, glow: false, non: false }, hero2: null });
    const giong = b.fighters.find((f) => f.kind === 'giong')!;
    giong.x = 5;
    giong.z = 13;
    const foes = b.fighters.filter((f) => f.side === 'giac');
    foes.forEach((f, i) => ((f.x = 4 + (i % 5) * 0.5), (f.z = 12)));
    b.t = 4;
    useSkill(b, 'nhoTre');
    for (const f of foes) if (f.state !== 'dead') expect(f.z).toBeGreaterThan(11);
    expectClear(b, MAU.thuTuong);
  });

  it('Tô Định bỏ chạy vòng qua tường rồi thoát', () => {
    const b = startFieldBattle({ ...stageSetup(36, 'thuTuong'), army: { giao: 0, cung: 0, voi: 0, no: 0 }, hero: null, hero2: null, nuTuong: null });
    const to = b.fighters.find((f) => f.kind === 'toDinh')!;
    for (const f of b.fighters) if (f !== to) f.state = 'dead';
    // Một lính ta để trận chưa xong.
    const giao = startFieldBattle({ ...stageSetup(1, null), army: { giao: 1, cung: 0, voi: 0, no: 0 } }).fighters.find((f) => f.kind === 'giao')!;
    b.fighters.push({ ...giao, id: 999, x: 8, z: 21 });
    to.x = 6;
    to.z = 13;
    to.hp = to.maxHp * 0.2;
    const killed = b.killed;
    for (let i = 0; i < 20 * 30 && to.state !== 'gone'; i++) {
      stepField(b, 0.05);
      expectClear(b, MAU.thuTuong);
    }
    expect(to.state).toBe('gone');
    expect(b.killed).toBe(killed + 1);
  });

  it('mở lại bản lưu giữa trận vẫn đánh trên bố cục ấy', () => {
    const b = startFieldBattle(stageSetup(24, 'thuTuong'));
    for (let i = 0; i < 60; i++) stepField(b, 0.05);
    const again = JSON.parse(JSON.stringify(b)) as Battle;
    expect(again.bai).toBe('thuTuong');
    playOut(again, 'thuong', (x) => expectClear(x, MAU.thuTuong));
    expect(again.outcome).not.toBeNull();
  });

  it('tướng, nghĩa binh, nữ tướng hiện ra ở chỗ trống', () => {
    // Bố cục đặt đá ngay chỗ tướng đứng lúc vào trận (sai luật, chỉ để thử): tướng được đưa ra chỗ trống.
    BAI.thuChan = { id: 'thuChan', terrain: 'rung', can: [{ hinh: { k: 'tron', x: W / 2, z: 15.5, r: 0.8 }, ve: 'da' }], cham: [] };
    try {
      const b = startFieldBattle(stageSetup(34, 'thuChan'));
      expectClear(b, BAI.thuChan);
      expect(b.fighters.filter((f) => isHero(f.kind)).length).toBe(2);
      b.t = 4;
      useSkill(b, 'hieuTrieu');
      expectClear(b, BAI.thuChan);
    } finally {
      delete BAI.thuChan;
    }
  });
});
