// Canh thần thú (docs/thiet-ke.md mục Kế hoạch: nuôi thần thú): thú về đúng lúc, cho ăn trừ đúng của, bữa hồi theo
// giờ (cả lúc vắng), lên cấp, trần cấp, dáng theo cấp; thú đi theo đội dã ngoại, ngã thì đứng dậy, dùng kỹ năng; treo
// máy có tính thú; bản lưu giữ phần thú, sai dạng thì bỏ riêng phần ấy.

import { describe, expect, it } from 'vitest';
import { damageFighter, isThanThu, type Battle } from './battle';
import { THAN_THU, THAN_THU_IDS, THAN_THU_NUOI, type ThanThuId } from './defs';
import { capNhatDa, datDoi, moMap, nhipTreo } from './daNgoai';
import { boCuc } from './daNgoaiMap';
import { capKhu, stepDa } from './daNgoaiTran';
import { applyOffline, createInitialState, tick, type GameState } from './game';
import { deserialize, serialize } from './save';
import { buaCho, buaLen, capThu, choAn, chonThu, dangThu, giaBua, hoiBua, thuCo, thuDiTheo, thuNay, thuVe } from './thanThu';

const DT = 0.05;

/** Kinh đô có Gióng (dã ngoại mở), nhiều của. */
function base(): GameState {
  const s = createInitialState(0);
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: true, restUntil: 0, ascended: false };
  s.resources = { gao: 1e7, voOc: 1e7, datDa: 1e7, sat: 1e7, go: 1e7 };
  return s;
}

/** Đã hạ boss map 1–4: đủ năm thú. */
function duThu(s: GameState): void {
  for (let i = 0; i < 4; i++) s.daNgoai.boss[i] = 1;
}

function dungKhu(s: GameState, k: number): void {
  const bc = boCuc(s.daNgoai.map);
  const kh = bc.khu[k];
  const l = Math.hypot(bc.trai.x - kh.x, bc.trai.z - kh.z);
  s.daNgoai.cho = { x: kh.x + ((bc.trai.x - kh.x) / l) * kh.r * 0.4, z: kh.z + ((bc.trai.z - kh.z) / l) * kh.r * 0.4 };
}

const thuTrong = (b: Battle) => b.fighters.find((f) => f.side === 'ta' && isThanThu(f.kind));

describe('thú về', () => {
  it('chưa có tướng thì chưa có thú; dã ngoại mở thì có chim Lạc; hạ boss map 1–4 thì các con sau về', () => {
    expect(thuCo(createInitialState(0))).toEqual([]);
    const s = base();
    expect(thuCo(s)).toEqual(['thuLac']);
    expect(thuDiTheo(s)).toBe('thuLac');
    s.daNgoai.boss[0] = 1;
    expect(thuVe(s, 'thuNgua')).toBe(true);
    expect(thuVe(s, 'thuGa')).toBe(false);
    duThu(s);
    expect(thuCo(s)).toEqual([...THAN_THU_IDS]);
    expect(chonThu(s, 'thuRong').ok).toBe(true);
    expect(thuDiTheo(s)).toBe('thuRong');
    expect(chonThu(base(), 'thuRong').ok).toBe(false);
  });
});

describe('nuôi', () => {
  it('cho ăn trừ đúng món ăn ưa theo cấp, trừ một bữa; hết bữa, thiếu của thì không cho được', () => {
    const s = base();
    const truoc = { ...s.resources };
    expect(giaBua(s, 'thuLac')).toEqual({ gao: 15, voOc: 15 });
    expect(choAn(s, 'thuLac').ok).toBe(true);
    expect(s.resources.gao).toBe(truoc.gao - 15);
    expect(s.resources.voOc).toBe(truoc.voOc - 15);
    expect(s.resources.sat).toBe(truoc.sat);
    expect(thuNay(s).bua).toBe(THAN_THU_NUOI.buaMax - 1);
    for (let i = 1; i < THAN_THU_NUOI.buaMax; i++) expect(choAn(s, 'thuLac').ok).toBe(true);
    const het = choAn(s, 'thuLac');
    expect(het.ok || het.reason).toBe('thuHetBua');
    const ngheo = base();
    ngheo.resources.gao = 0;
    const r = choAn(ngheo, 'thuLac');
    expect(r.ok || r.reason).toBe('thieuTaiNguyen');
    expect(thuNay(ngheo).bua).toBe(THAN_THU_NUOI.buaMax);
    const c = choAn(base(), 'thuNgua');
    expect(c.ok || c.reason).toBe('thuChuaVe');
  });

  it('đủ bữa thì lên cấp; giá tăng theo cấp; dừng ở trần cấp; đổi dáng ở cấp 10, 30', () => {
    const s = base();
    duThu(s);
    expect(buaLen(1)).toBe(1);
    expect(buaLen(10)).toBe(3);
    let bua = 0;
    while (capThu(s, 'thuNgua') < THAN_THU_NUOI.tran) {
      thuNay(s).bua = THAN_THU_NUOI.buaMax;
      expect(choAn(s, 'thuNgua').ok).toBe(true);
      bua++;
      expect(bua).toBeLessThan(400);
    }
    // Lên tới trần cần chừng ba trăm bữa: một bữa mười lăm phút, nhiều ngày nuôi.
    expect(bua).toBeGreaterThan(200);
    expect(giaBua(s, 'thuNgua')).toEqual({ sat: THAN_THU.thuNgua.an.sat! * THAN_THU_NUOI.tran });
    thuNay(s).bua = THAN_THU_NUOI.buaMax;
    const tran = choAn(s, 'thuNgua');
    expect(tran.ok || tran.reason).toBe('thuDaTran');
    expect([dangThu(1), dangThu(9), dangThu(10), dangThu(29), dangThu(30), dangThu(50)]).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it('bữa hồi mười lăm phút một bữa, tối đa bốn; lúc chơi và lúc vắng đều hồi', () => {
    const s = base();
    thuNay(s).bua = 0;
    expect(buaCho(s)).toBe(THAN_THU_NUOI.buaMs / 1000);
    tick(s, THAN_THU_NUOI.buaMs - 1000);
    expect(thuNay(s).bua).toBe(0);
    tick(s, 1000);
    expect(thuNay(s).bua).toBe(1);
    s.lastSeen = 0;
    applyOffline(s, 10 * THAN_THU_NUOI.buaMs);
    expect(thuNay(s).bua).toBe(THAN_THU_NUOI.buaMax);
    expect(buaCho(s)).toBe(0);
    // Đầy bữa thì không tích dồn: ăn một bữa, mười lăm phút sau lại đầy.
    expect(choAn(s, 'thuLac').ok).toBe(true);
    hoiBua(s, THAN_THU_NUOI.buaMs);
    expect(thuNay(s).bua).toBe(THAN_THU_NUOI.buaMax);
  });
});

describe('thú trên map dã ngoại', () => {
  it('thú đi theo đội, không chiếm chỗ tướng; cấp thú làm thú bền hơn, mạnh hơn', () => {
    const s = base();
    const b = moMap(s);
    expect(b.fighters.filter((f) => f.side === 'ta').map((f) => f.kind)).toEqual(['giong', 'thuLac']);
    expect(b.thu).toEqual({ kind: 'thuLac', cap: 1 });
    const hp1 = thuTrong(b)!.maxHp;
    thuNay(s).cap.thuLac = 21;
    const b2 = moMap(s);
    expect(thuTrong(b2)!.maxHp).toBeCloseTo(hp1 * 1.8, 5);
    expect(thuTrong(b2)!.manh).toBeCloseTo(1.8, 5);
  });

  it('thú ngã thì nằm chờ, yên một lúc thì đứng dậy, không chết hẳn', () => {
    const s = base();
    s.daNgoai.tuDanh = false;
    const b = moMap(s);
    const f = thuTrong(b)!;
    damageFighter(b, { dmg: f.hp + 1 }, f);
    expect(f.state).toBe('gone');
    let nga = false;
    for (let t = 0; t < 30; t += DT) {
      stepDa(b, DT);
      capNhatDa(s, b);
      if (f.state === 'gone') nga = true;
    }
    expect(nga).toBe(true);
    expect(b.fighters.includes(f)).toBe(true);
    expect(f.state).not.toBe('gone');
    expect(f.hp).toBeGreaterThan(0);
  });

  it('mỗi thú dùng được kỹ năng của mình khi Tự đánh', () => {
    const ky: Record<ThanThuId, string> = { thuLac: 'smash', thuNgua: 'fire', thuGa: 'smash', thuRua: 'shield', thuRong: 'wave' };
    for (const id of THAN_THU_IDS) {
      const s = base();
      duThu(s);
      chonThu(s, id);
      thuNay(s).cap[id] = 20;
      dungKhu(s, 0);
      const b = moMap(s);
      // Đội đang sứt máu (Rùa Vàng chỉ che đội khi có người yếu).
      for (const f of b.fighters) if (f.side === 'ta') f.hp = f.maxHp * 0.5;
      let dung = false;
      for (let t = 0; t < 60 && !dung; t += DT) {
        stepDa(b, DT);
        capNhatDa(s, b);
        dung = b.events.some((e) => e.by === id && e.kind === ky[id]);
      }
      expect(dung, id).toBe(true);
    }
  });

  it('treo máy tính cả sức thú: thú cấp cao hạ quái nhanh hơn', () => {
    const s = base();
    s.daNgoai.map = 1;
    s.daNgoai.cap = capKhu(1, 4)[0] - 4;
    s.daNgoai.dangO = true;
    datDoi(s, ['giong']);
    dungKhu(s, 4);
    const thap = nhipTreo(s, 4);
    thuNay(s).cap.thuLac = 40;
    expect(nhipTreo(s, 4)).toBeGreaterThan(thap);
  });
});

describe('bản lưu', () => {
  it('giữ cấp, bữa, thú chọn; phần thú sai dạng thì bỏ riêng phần ấy', () => {
    const s = base();
    duThu(s);
    chonThu(s, 'thuRua');
    thuNay(s).cap.thuRua = 12;
    thuNay(s).bua = 2;
    const t = deserialize(serialize(s))!;
    expect(t.thanThu).toEqual(s.thanThu);
    const hong = JSON.parse(serialize(s));
    hong.thanThu.cap.thuRua = 999;
    const u = deserialize(JSON.stringify(hong))!;
    expect(u).toBeDefined();
    expect(u.thanThu).toBeUndefined();
    expect(capThu(u, 'thuRua')).toBe(1);
  });
});
