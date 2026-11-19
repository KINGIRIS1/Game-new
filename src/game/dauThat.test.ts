import { describe, expect, it } from 'vitest';
import { scorePvp, stepPvp } from './dauThanh';
import { NHO_TRU, chayXemLai, isDauThanhState, newDauThanh, nhanKetQua, nhanTranCu, truBiDanh, type KetQuaMay, type TranTom } from './dauThat';
import { bamThu, banChupThu, danhLai, kinhDoMay, quanDanh } from './mayChu';
import { createInitialState, storageCap } from './game';
import { deserialize, serialize } from './save';

const ket = (over: Partial<KetQuaMay> = {}): KetQuaMay => ({
  sao: 2,
  pct: 0.7,
  dien: true,
  kho: 1,
  khoTotal: 2,
  cuop: { gao: 300, voOc: 200, datDa: 0, sat: 50, go: 0 },
  chienCong: { atk: 20, def: -20 },
  mat: { giao: 3, cung: 2, voi: 0, no: 0 },
  buoc: 1800,
  bam: 4,
  ms: 900,
  ...over,
});

const tran = (id: string, batDau: number, over: Partial<TranTom> = {}): TranTom => ({
  id,
  may: false,
  tenDanh: 'Âu Cơ',
  tenGiu: 'Lạc Long',
  dienDanh: 6,
  dienGiu: 6,
  batDau,
  xong: true,
  ketQua: ket(),
  ...over,
});

const hoSo = { ten: 'Lạc Long', chienCong: 40, dien: 6, khienDen: null };

function joined() {
  const s = createInitialState(0);
  s.resources = { gao: 1000, voOc: 100, datDa: 500, sat: 20, go: 0 };
  s.troops = { giao: 10, cung: 1, voi: 2, no: 0 };
  s.dauThanh = newDauThanh('u1', hoSo, [], []);
  return s;
}

describe('Đấu thành thật: áp kết quả máy chủ', () => {
  it('vừa tham gia thì trận máy chủ đã có coi như đã áp (người dùng cũ chơi game mới)', () => {
    const d = newDauThanh('u1', hoSo, [tran('b2', 2), tran('b1', 1)], [tran('a1', 1)]);
    expect([d.daTru, d.daNhan, d.chienCong]).toEqual([['b1', 'b2'], ['a1'], 40]);
    const s = joined();
    s.dauThanh = d;
    expect(truBiDanh(s, [tran('b1', 1), tran('b2', 2)])).toEqual([]);
    expect(s.resources.gao).toBe(1000);
  });

  it('bị đánh: mỗi loại mất min(của bị cướp, của đang có), mỗi trận một lần, bỏ qua trận chưa xong', () => {
    const s = joined();
    const list = [tran('t2', 20, { ketQua: ket({ cuop: { gao: 500, voOc: 0, datDa: 0, sat: 0, go: 0 } }) }), tran('t1', 10), tran('t3', 30, { xong: false, ketQua: null })];
    const done = truBiDanh(s, list);
    expect(done.map((x) => x.tran.id)).toEqual(['t1', 't2']);
    expect(done[0].mat).toEqual({ gao: 300, voOc: 100, datDa: 0, sat: 20, go: 0 });
    expect(s.resources).toEqual({ gao: 200, voOc: 0, datDa: 500, sat: 0, go: 0 });
    expect(truBiDanh(s, list)).toEqual([]);
    expect(s.dauThanh!.daTru).toEqual(['t1', 't2']);
  });

  it('nhớ có hạn số trận đã trừ', () => {
    const s = joined();
    s.resources.gao = 1e9;
    truBiDanh(s, Array.from({ length: NHO_TRU + 5 }, (_, i) => tran(`t${i}`, i)));
    expect(s.dauThanh!.daTru.length).toBe(NHO_TRU);
    expect(s.dauThanh!.daTru.at(-1)).toBe(`t${NHO_TRU + 4}`);
  });

  it('đánh: quân ngã mất thật, của cướp vào kho không quá sức chứa, mỗi trận một lần; xóa trận đang chờ gửi', () => {
    const s = joined();
    const cap = storageCap(s);
    s.resources.gao = cap - 100;
    s.dauThanh!.dangDanh = { tran: 'a1', bam: [{ s: 10, k: 'trongTran' }] };
    const got = nhanKetQua(s, 'a1', ket({ mat: { giao: 3, cung: 5, voi: 0, no: 0 } }));
    expect(got).toEqual({ duoc: { gao: 100, voOc: 200, datDa: 0, sat: 50, go: 0 }, mat: { giao: 3, cung: 1, voi: 0, no: 0 } });
    expect(s.troops).toEqual({ giao: 7, cung: 0, voi: 2, no: 0 });
    expect(s.resources.gao).toBe(cap);
    expect(s.dauThanh!.dangDanh).toBeUndefined();
    expect(nhanKetQua(s, 'a1', ket())).toBeNull();
    expect(s.troops.giao).toBe(7);
  });

  it('trận cũ đã xong mà chưa nhận (thoát giữa trận) thì nhận khi đồng bộ; trận còn đang đánh thì chờ', () => {
    const s = joined();
    const out = nhanTranCu(s, [tran('a2', 2, { xong: false, ketQua: null }), tran('a1', 1)]);
    expect(out.map((x) => x.tran.id)).toEqual(['a1']);
    expect(s.troops.giao).toBe(7);
    expect(nhanTranCu(s, [tran('a1', 1)])).toEqual([]);
  });

  it('bản lưu giữ phần Đấu thành; sai dạng thì bỏ phần ấy, giữ bản lưu', () => {
    const s = joined();
    s.dauThanh!.daTru = ['x'];
    s.dauThanh!.dangDanh = { tran: 'a9', bam: [{ s: 3, k: 'rut' }] };
    expect(deserialize(serialize(s))!.dauThanh).toEqual(s.dauThanh);
    const bad = JSON.parse(serialize(s));
    bad.dauThanh.daTru = 'x';
    const back = deserialize(JSON.stringify(bad))!;
    expect(back).toBeDefined();
    expect(back.dauThanh).toBeUndefined();
    expect(isDauThanhState({ ...s.dauThanh, khienDen: 'mai' })).toBe(false);
    expect(deserialize(serialize(createInitialState(0)))!.dauThanh).toBeUndefined();
  });
});

describe('Đấu thành thật: xem lại trận (PR 6)', () => {
  it('dựng trận từ dữ liệu máy chủ trả, chạy theo khung hình ra đúng kết quả máy chủ đã ghi', () => {
    const thu = banChupThu(5);
    const def = kinhDoMay(5).ma;
    const q = quanDanh(thu.ma, thu.quan, 'tay', 4321);
    if (!('quan' in q)) throw new Error(q.loi);
    const bam = bamThu();
    const kq = danhLai(def, q.quan, bam, { atkDien: 5, atkTrophies: 0, defTrophies: 0, bot: false });
    const t = tran('x', 1, { ketQua: { ...kq, ms: 100 }, xemLai: true });
    // Qua JSON như máy chủ trả.
    const run = chayXemLai(JSON.parse(JSON.stringify({ tran: t, vai: 'giu', banChup: def, quan: q.quan, bam })))!;
    expect(run.replay).toBe(true);
    while (!stepPvp(run, 50)) if (run.step > 10_000) throw new Error('không xong');
    const score = scorePvp(run.def);
    expect([score.stars, score.pct, run.step, run.battle.lost]).toEqual([kq.sao, kq.pct, kq.buoc, kq.mat]);
  }, 30000);

  it('bản chụp hay quân hỏng thì không dựng trận', () => {
    const thu = banChupThu(5);
    const q = quanDanh(thu.ma, thu.quan, 'bac', 1);
    if (!('quan' in q)) throw new Error(q.loi);
    const t = tran('y', 1);
    expect(chayXemLai({ tran: t, vai: 'danh', banChup: 'TDVS1:hỏng', quan: q.quan, bam: [] })).toBeNull();
    expect(chayXemLai({ tran: t, vai: 'danh', banChup: thu.ma, quan: null as never, bam: [] })).toBeNull();
    expect(chayXemLai({ tran: t, vai: 'danh', banChup: thu.ma, quan: { ...q.quan, side: 'nam' as never }, bam: [] })).toBeNull();
    expect(chayXemLai({ tran: t, vai: 'danh', banChup: thu.ma, quan: q.quan, bam: 'rác' })?.inputs).toEqual([]);
  });
});
