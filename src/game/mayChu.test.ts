import { describe, expect, it } from 'vitest';
import { DAU_THANH, FIELD_CAP, SKILL_IDS } from './defs';
import { armySpace } from './doanhTrai';
import {
  beginPvp,
  botSnapshot,
  decodeSnapshot,
  encodeSnapshot,
  lootPvp,
  makeSnapshot,
  pushInput,
  scorePvp,
  stepPvp,
  trophyDelta,
  validateSnapshot,
} from './dauThanh';
import { skillReady } from './battle';
import { createInitialState, place } from './game';
import * as mayChu from './mayChu';
import { chonDoiThu, danhLai, kiemTen, kinhDoMay, nhanBanChup, quanDanh, truCua } from './mayChu';
import luatDts from '../../supabase/functions/dau-thanh/luat.d.ts?raw';
import { edge, setDien } from './testmap';

/** Kinh đô Điện 5 có doanh trại, quân (như test Đấu thành). */
function capital() {
  const s = createInitialState(0);
  setDien(s, 5);
  s.resources = { gao: 5000, voOc: 4000, datDa: 3000, sat: 800, go: 600 };
  s.dan = 40;
  const r = place(s, 'doanhTrai', edge(5, 1), edge(5, 1));
  if (!r.ok) throw new Error(r.reason);
  r.value.level = 5;
  s.troops = { giao: 30, cung: 20, voi: 6, no: 0 };
  return s;
}

describe('tên người chơi', () => {
  it('nhận tên tiếng Việt có dấu, chữ số; bỏ khoảng trắng thừa', () => {
    expect(kiemTen('  Lạc   Long  ')).toEqual({ ten: 'Lạc Long' });
    expect(kiemTen('Hùng Vương 18')).toEqual({ ten: 'Hùng Vương 18' });
    expect(kiemTen("An_Dương-Vương.'")).toEqual({ ten: "An_Dương-Vương.'" });
    // Chữ thường viết không dấu trùng mặt chữ với từ tục thì không bắt.
    for (const ok of ['Các Lạc Hầu', 'Lớn Mạnh', 'Dù Lượn', 'Đeo Cung', 'Ccc Lang']) expect(kiemTen(ok)).toEqual({ ten: ok });
  });

  it('từ chối tên ngắn, dài, ký tự lạ, từ tục', () => {
    expect(kiemTen('A')).toEqual({ loi: 'ngan' });
    expect(kiemTen(42)).toEqual({ loi: 'ngan' });
    expect(kiemTen('a'.repeat(DAU_THANH.nameMax + 1))).toEqual({ loi: 'dai' });
    expect(kiemTen('Thục '.repeat(3) + 'Phán')).toEqual({ loi: 'dai' });
    expect(kiemTen('<b>Vua</b>')).toEqual({ loi: 'kyTu' });
    expect(kiemTen('Lang 🐘')).toEqual({ loi: 'kyTu' });
    for (const bad of ['Đụ má', 'thằng DM', 'Vcl123', 'ditme ai', 'Fucking', 'đéo sợ', 'Lồn', 'địt mẹ', 'Vãi lồn']) expect(kiemTen(bad)).toEqual({ loi: 'tuc' });
  });
});

describe('bản chụp ở máy chủ', () => {
  it('nhận bản chụp hợp luật, mã lại gọn; từ chối mã hỏng, sửa tay, Điện chưa đủ cấp', () => {
    const snap = makeSnapshot(capital());
    expect(snap.troops).toEqual({ giao: 30, cung: 20, voi: 6, no: 0 });
    const got = nhanBanChup(encodeSnapshot(snap).replace(/(.{40})/g, '$1\n'));
    expect(got).toEqual({ ma: encodeSnapshot(snap), dien: 5 });
    expect(nhanBanChup('TDVS1:hỏng')).toHaveProperty('loi');
    expect(nhanBanChup(12)).toHaveProperty('loi');
    expect(nhanBanChup(encodeSnapshot({ ...snap, troops: { ...snap.troops, voi: 400 } }))).toEqual({ loi: 'quá sức chứa doanh trại' });
    const small = createInitialState(0);
    setDien(small, 4);
    expect(nhanBanChup(encodeSnapshot(makeSnapshot(small)))).toEqual({ loi: 'Điện cấp 4 chưa mở Đấu thành' });
  });

  it('lính giữ thành không nhiều hơn quân đang có; không doanh trại thì không mang quân', () => {
    const snap = makeSnapshot(capital());
    expect(validateSnapshot({ ...snap, troops: { giao: 0, cung: 0, voi: 0, no: 0 } })).toBe('lính giữ thành nhiều hơn quân đang có');
    const bare = createInitialState(0);
    setDien(bare, 5);
    bare.troops = { giao: 9, cung: 0, voi: 0, no: 0 };
    expect(makeSnapshot(bare).troops).toEqual({ giao: 0, cung: 0, voi: 0, no: 0 });
  });

  it('kinh đô máy: Điện kẹp trong 5–10, mã dùng lại, quân bằng lính giữ thành', () => {
    expect(kinhDoMay(3).dien).toBe(5);
    expect(kinhDoMay(12).dien).toBe(10);
    expect(kinhDoMay(7)).toBe(kinhDoMay(7));
    const snap = decodeSnapshot(kinhDoMay(8).ma)!;
    expect(validateSnapshot(snap)).toBeNull();
    expect(snap.troops).toEqual(botSnapshot(8).troops);
  });

  it('bị cướp thì kho trong bản chụp trừ đi của bị cướp, không xuống dưới 0; còn lại giữ nguyên', () => {
    const ma = kinhDoMay(6).ma;
    const before = decodeSnapshot(ma)!;
    const after = decodeSnapshot(truCua(ma, { gao: 1000.7, voOc: 1e9, datDa: -5, sat: 'x', go: 0 }))!;
    expect(after.resources).toEqual({ gao: before.resources.gao - 1000, voOc: 0, datDa: before.resources.datDa, sat: before.resources.sat, go: before.resources.go });
    expect({ ...after, resources: before.resources }).toEqual(before);
    expect(validateSnapshot(after)).toBeNull();
    expect(truCua('TDVS1:hỏng', { gao: 1 })).toBe('TDVS1:hỏng');
    expect(decodeSnapshot(truCua(ma, null))).toEqual(before);
  });
});

describe('trận ở máy chủ', () => {
  const atk = encodeSnapshot(makeSnapshot(capital()));

  it('quân đánh: không quá quân có, không quá số chỗ một trận; tướng, binh khí lấy từ bản chụp người đánh', () => {
    expect(quanDanh(atk, { giao: 31 }, 'bac', 1)).toEqual({ loi: 'quân nhiều hơn quân đang có' });
    expect(quanDanh(atk, { giao: 30, cung: 20 }, 'bac', 1)).toEqual({ loi: 'quá số chỗ một trận' });
    expect(quanDanh(atk, {}, 'bac', 1)).toEqual({ loi: 'không có quân' });
    expect(quanDanh(atk, { giao: 1.5 }, 'bac', 1)).toEqual({ loi: 'quân sai dạng' });
    expect(quanDanh(atk, { giao: 4 }, 'nam', 1)).toEqual({ loi: 'hướng tràn vào sai' });
    const ok = quanDanh(atk, { giao: 20, cung: 10, voi: 2 }, 'tay', -5);
    if (!('quan' in ok)) throw new Error(ok.loi);
    const snap = decodeSnapshot(atk)!;
    expect(armySpace(ok.quan.army)).toBeLessThanOrEqual(FIELD_CAP[4]);
    expect(ok.quan).toEqual({ army: { giao: 20, cung: 10, voi: 2, no: 0 }, heroes: snap.heroes, side: 'tay', seed: -5 >>> 0, bonus: snap.bonus, arms: snap.arms, huan: snap.huan });
  });

  it('đánh lại ra đúng như máy khách đánh theo khung hình; quân ngã không quá quân mang đi', () => {
    const def = kinhDoMay(5).ma;
    const r = quanDanh(atk, { giao: 18, cung: 12, voi: 2 }, 'bac', 99);
    if (!('quan' in r)) throw new Error(r.loi);
    const live = beginPvp(decodeSnapshot(def)!, r.quan);
    while (!stepPvp(live, 1000 / 60)) for (const k of SKILL_IDS) if (live.battle.t > 3 && skillReady(live.battle, k)) pushInput(live, k);
    const score = scorePvp(live.def);
    const res = danhLai(def, r.quan, JSON.parse(JSON.stringify(live.inputs)), { atkDien: 5, atkTrophies: 100, defTrophies: 120, bot: false });
    expect([res.sao, res.pct, res.dien, res.kho, res.khoTotal]).toEqual([score.stars, score.pct, score.dien, score.kho, score.khoTotal]);
    expect(res.mat).toEqual(live.battle.lost);
    expect(res.buoc).toBe(live.step);
    expect(res.bam).toBe(live.inputs.length);
    expect(res.cuop).toEqual(lootPvp(decodeSnapshot(def)!, score, 5));
    expect(res.chienCong).toEqual(trophyDelta(100, 120, score.stars));
    for (const k of ['giao', 'cung', 'voi', 'no'] as const) expect(res.mat[k]).toBeLessThanOrEqual(r.quan.army[k]);
  });

  it('lần bấm sai dạng bị bỏ; rút quân ngay thì trận xong ở bước đầu, không mất ai', () => {
    const def = kinhDoMay(6).ma;
    const r = quanDanh(atk, { giao: 10 }, 'bac', 3);
    if (!('quan' in r)) throw new Error(r.loi);
    const res = danhLai(def, r.quan, [{ s: 0, k: 'rut' }, { s: -1, k: 'trongTran' }, { s: 2, k: 'bayLen' }, 'x', null], { atkDien: 5, atkTrophies: 0, defTrophies: 0, bot: false });
    expect(res.bam).toBe(1);
    expect(res.buoc).toBe(1);
    expect(res.sao).toBe(0);
    expect(res.mat).toEqual({ giao: 0, cung: 0, voi: 0, no: 0 });
    // Không sao: người giữ thành được chiến công, người đánh không có gì để mất.
    expect(res.chienCong).toEqual({ atk: 0, def: DAU_THANH.trophyBase });
  });

  it('kinh đô máy: không cướp của thật, chiến công ít, thua thì mất ít', () => {
    const def = kinhDoMay(5).ma;
    const r = quanDanh(atk, { giao: 10 }, 'bac', 3);
    if (!('quan' in r)) throw new Error(r.loi);
    const lose = danhLai(def, r.quan, [{ s: 0, k: 'rut' }], { atkDien: 5, atkTrophies: 300, defTrophies: 0, bot: true });
    expect(lose.cuop).toEqual({ gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 });
    expect(lose.chienCong).toEqual({ atk: -Math.round(DAU_THANH.trophyBase * DAU_THANH.botTrophy), def: 0 });
    const poor = danhLai(def, r.quan, [{ s: 0, k: 'rut' }], { atkDien: 5, atkTrophies: 2, defTrophies: 0, bot: true });
    expect(poor.chienCong.atk).toBe(-2);
  });
});

describe('ghép trận', () => {
  const list = [
    { id: 'a', dien: 5, trophies: 100 },
    { id: 'b', dien: 6, trophies: 300 },
    { id: 'c', dien: 7, trophies: 120 },
    { id: 'd', dien: 9, trophies: 110 },
  ];

  it('ưu tiên Điện chênh 1, chiến công gần; thiếu người thì nới ra chênh 2; không ai thì null', () => {
    expect(chonDoiThu({ dien: 5, trophies: 120 }, list, 0)).toBe('a');
    expect(chonDoiThu({ dien: 5, trophies: 290 }, list, 0)).toBe('b');
    expect(chonDoiThu({ dien: 7, trophies: 100 }, list.filter((u) => u.id !== 'b' && u.id !== 'c'), 0)).toBe('a');
    expect(chonDoiThu({ dien: 10, trophies: 0 }, list.slice(0, 3), 0.5)).toBeNull();
  });

  it('chọn ngẫu nhiên trong vài người chiến công gần nhất', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, dien: 8, trophies: i * 10 }));
    const picked = new Set([0, 0.2, 0.4, 0.6, 0.8, 0.99].map((r) => chonDoiThu({ dien: 8, trophies: 0 }, many, r)));
    expect([...picked].sort()).toEqual(['n0', 'n1', 'n2', 'n3', 'n4'].slice(0, DAU_THANH.matchPick));
  });
});

describe('đóng gói cho máy chủ', () => {
  it('luat.d.ts (kiểu của luat.js) khai đúng các tên mayChu.ts xuất ra', () => {
    const declared = [...luatDts.matchAll(/export declare (?:const|function) (\w+)/g)].map((m) => m[1]).filter((n) => n !== 'LUAT_MA');
    expect(declared.sort()).toEqual(Object.keys(mayChu).sort());
  });
});
