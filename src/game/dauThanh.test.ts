// Canh Đấu thành (PR 2, chưa có máy chủ): bản chụp kinh đô và mã bản chụp, kiểm bản chụp sửa tay, kinh đô máy, trận
// Đấu thành (quân ta đánh thành, lính giữ thành, tháp bắn quân ta), tất định và đánh lại từ đầu vào ghi sẵn, sao,
// của cướp, chiến công, và cân bằng: cùng cấp Điện, đủ quân mẫu thì được 1–2 sao, nửa quân thì 0 sao.

import { describe, expect, it } from 'vitest';
import { skillReady, type HeroSetup, type PvpAttack } from './battle';
import { BUILDINGS, DAU_THANH, GUARD_CAP, SKILL_IDS, UNITS, isDecor, type SkillId } from './defs';
import { armySpace, type Army } from './doanhTrai';
import {
  beginPvp,
  botSnapshot,
  canPractice,
  cleanInputs,
  decodeSnapshot,
  defenderState,
  encodeSnapshot,
  lootCap,
  lootPvp,
  makeSnapshot,
  pushInput,
  PVP_MAX_INPUTS,
  replayPvp,
  scorePvp,
  simulatePvp,
  stepPvp,
  trophyDelta,
  validateArmy,
  validateSnapshot,
  type PvpRun,
  type Snapshot,
} from './dauThanh';
import { createInitialState, dienLevel, place, storageCap, tick, type Building } from './game';
import { playChapters } from './moPhong';
import { nhanBanChup } from './mayChu';
import { HALF_ARMY, HALF_ARMY4, REACTION_S, SAMPLE_ARMY, SAMPLE_ARMY4, SEEDS } from './testkit';
import { GRID, RIVER_START, farBankOf, isRiver } from './map';
import { DIEN, edge, setDien } from './testmap';

/** Tướng của người đánh thành ở cấp Điện `dien`: Gióng có Nhổ tre ở Điện 5, Sơn Tinh ở Điện 6, An Dương Vương ở Điện 7, Cao Lỗ từ Điện 8. */
function heroAt(dien: number): HeroSetup[] {
  if (dien <= 5) return [{ kind: 'giong', bamboo: true, glow: true, non: false }];
  if (dien === 6) return [{ kind: 'sonTinh', bamboo: false, glow: true, non: true }];
  if (dien === 7) return [{ kind: 'anDuong', bamboo: false, glow: true, non: false, kimQuy: true }];
  return [{ kind: 'caoLo', bamboo: false, glow: false, non: false, lenhBan: true }];
}

/** Người đánh thành cùng cấp Điện với kinh đô máy: binh khí như kinh đô máy, không Đền, không huân công. */
function attackAt(snap: Snapshot, army: Army, seed: number, side: 'bac' | 'tay' = 'bac'): PvpAttack {
  return { army, heroes: heroAt(snap.dien), side, seed, bonus: 0, arms: { ...snap.arms }, huan: { giao: 0, cung: 0, voi: 0, no: 0, tuong: 0 } };
}

/** Đánh như người chơi thường: kỹ năng sẵn sàng 1,5 giây mới bấm. Chạy theo khung hình 1/60 giây (bước lẻ dồn lại). */
function fight(snap: Snapshot, attack: PvpAttack): PvpRun {
  const run = beginPvp(snap, attack);
  const readySince: Partial<Record<SkillId, number>> = {};
  while (!stepPvp(run, 1000 / 60)) {
    const b = run.battle;
    if (b.t <= 3) continue;
    for (const k of SKILL_IDS) {
      if (!skillReady(b, k)) {
        delete readySince[k];
        continue;
      }
      readySince[k] ??= b.t;
      if (b.t - readySince[k]! >= REACTION_S) {
        pushInput(run, k);
        delete readySince[k];
      }
    }
  }
  return run;
}

/** Kinh đô Điện 5 của người chơi, có doanh trại, quân, vài chòi canh. */
function capital() {
  const s = createInitialState(0);
  setDien(s, 5);
  s.resources = { gao: 5000, voOc: 4000, datDa: 3000, sat: 800, go: 600 };
  s.dan = 40;
  const r = place(s, 'doanhTrai', edge(5, 1), edge(5, 1));
  if (!r.ok) throw new Error(r.reason);
  r.value.level = 5;
  s.troops = { giao: 14, cung: 12, voi: 4, no: 0 };
  return s;
}

describe('bản chụp kinh đô', () => {
  it('chụp kinh đô người chơi: hợp luật, mã hóa rồi giải mã y nguyên, dựng lại đúng công trình', () => {
    const s = capital();
    const snap = makeSnapshot(s);
    expect(validateSnapshot(snap)).toBeNull();
    expect(snap.guards.reduce((n, g) => n + g.n * UNITS[g.kind].space, 0)).toBeGreaterThan(0);
    const code = encodeSnapshot(snap);
    expect(code.startsWith('TDVS1:')).toBe(true);
    expect(decodeSnapshot(code)).toEqual(snap);
    expect(decodeSnapshot('TDVS1:hỏng')).toBeUndefined();
    const def = defenderState(snap);
    expect(def.buildings.map((b) => [b.type, b.x, b.z, b.level])).toEqual(
      s.buildings.map((b) => [b.type, b.x, b.z, b.level]),
    );
    expect(def.resources).toEqual(s.resources);
  });

  it('của vượt sức chứa (thưởng, hoàn của, dỡ kho) chỉ chụp tới sức chứa; kho bên kia sông không tính: máy chủ vẫn nhận', () => {
    const s = capital();
    const cap = storageCap(s);
    s.resources = { gao: cap * 3, voOc: cap + 1, datDa: cap, sat: 12.5, go: 0 };
    let snap = makeSnapshot(s);
    expect(validateSnapshot(snap)).toBeNull();
    expect(snap.resources).toEqual({ gao: cap, voOc: cap, datDa: cap, sat: 12.5, go: 0 });
    expect(nhanBanChup(encodeSnapshot(snap))).not.toHaveProperty('loi');
    // Kho bên kia sông: không vào bản chụp, sức chứa trong bản chụp không tính kho ấy.
    let far = -1;
    for (let i = 0; i < GRID * GRID && far < 0; i++) if (farBankOf(i % GRID, Math.floor(i / GRID)) !== null && !isRiver(i % GRID, Math.floor(i / GRID))) far = i;
    s.buildings.push({ id: s.nextId++, type: 'kho', x: far % GRID, z: Math.floor(far / GRID), level: 5, workers: 0 } as Building);
    expect(storageCap(s)).toBeGreaterThan(cap);
    s.resources.gao = storageCap(s);
    snap = makeSnapshot(s);
    expect([snap.cap, snap.resources.gao]).toEqual([cap, cap]);
    expect(validateSnapshot(snap)).toBeNull();
  });

  it('người chơi mô phỏng từ Điện 5 tới Điện 10: bản chụp lúc nào cũng hợp luật, kể cả khi của vượt sức chứa', () => {
    const s = createInitialState(0);
    const loi = new Set<string>();
    let lan = 0;
    playChapters({
      s,
      last: 10,
      maxSec: 20 * 3600,
      until: (_m, sec) => {
        if (sec % 300 !== 0 || dienLevel(s) < DAU_THANH.unlockDien) return false;
        lan++;
        const over = { ...s, resources: { gao: s.resources.gao * 3 + 1e5, voOc: s.resources.voOc * 3, datDa: 1e6, sat: 1e6, go: 1e6 } };
        for (const st of [s, over]) {
          const why = validateSnapshot(makeSnapshot(st));
          if (why) loi.add(`Điện ${dienLevel(s)}: ${why}`);
        }
        return false;
      },
    });
    expect(dienLevel(s)).toBe(10);
    expect(lan).toBeGreaterThan(50);
    expect([...loi]).toEqual([]);
  }, 120_000);

  it('bản chụp sửa tay bị từ chối: thừa công trình, cấp vượt Điện, chồng ô, quá lính giữ thành, quá binh khí, của quá kho', () => {
    const good = botSnapshot(6);
    expect(validateSnapshot(good)).toBeNull();
    const bad = (edit: (s: Snapshot) => void) => {
      const s: Snapshot = JSON.parse(JSON.stringify(good));
      edit(s);
      return validateSnapshot(s);
    };
    const kho = good.buildings.find((b) => b.type === 'kho')!;
    expect(bad((s) => s.buildings.push(...Array.from({ length: 20 }, (_, i) => ({ ...kho, x: 1 + (i % 10) * 3, z: 1 + Math.floor(i / 10) * 3 }))))).not.toBeNull();
    expect(bad((s) => (s.buildings.find((b) => b.type === 'kho')!.level = 9))).not.toBeNull();
    expect(bad((s) => s.buildings.push({ ...s.buildings[1] }))).not.toBeNull();
    expect(bad((s) => (s.guards[0].n = 999))).not.toBeNull();
    expect(bad((s) => (s.arms.giao = 9))).not.toBeNull();
    expect(bad((s) => (s.resources.gao = s.cap * 10))).not.toBeNull();
    expect(bad((s) => (s.bonus = 0.5))).not.toBeNull();
  });

  it('kinh đô máy Điện 5–10 hợp luật, đủ lính giữ thành, có tháp và kho', () => {
    for (let dien = 5; dien <= 10; dien++) {
      const snap = botSnapshot(dien);
      expect(validateSnapshot(snap), `Điện ${dien}`).toBeNull();
      const space = snap.guards.reduce((n, g) => n + g.n * UNITS[g.kind].space, 0);
      expect(space, `Điện ${dien}`).toBeGreaterThan(GUARD_CAP[dien - 1] - 3);
      expect(snap.buildings.some((b) => b.type === 'choiCanh'), `Điện ${dien}`).toBe(true);
      expect(snap.buildings.some((b) => b.type === 'kho'), `Điện ${dien}`).toBe(true);
      // Đường của mẫu kinh đô chỉ để nhìn: bản chụp không ghi.
      expect(snap.buildings.some((b) => isDecor(b.type)), `Điện ${dien}`).toBe(false);
    }
  });
});

describe('trận Đấu thành', () => {
  it('tất định: đánh lại từ đầu vào ghi sẵn ra y hệt, dù lúc đánh chạy theo khung hình lẻ', () => {
    const snap = botSnapshot(5);
    const attack = attackAt(snap, SAMPLE_ARMY, 7);
    const live = fight(snap, attack);
    const replay = simulatePvp(snap, attack, JSON.parse(JSON.stringify(live.inputs)));
    expect(live.inputs.length).toBeGreaterThan(0);
    expect(JSON.stringify(replay.battle)).toBe(JSON.stringify(live.battle));
    expect(JSON.stringify(replay.def.buildings)).toBe(JSON.stringify(live.def.buildings));
  }, 30000);

  it('xem lại (PR 6): chạy theo khung hình với các lần bấm đã ghi ra y hệt trận gốc, không ghi thêm lần bấm', () => {
    const snap = botSnapshot(5);
    const attack = attackAt(snap, SAMPLE_ARMY, 11);
    const live = fight(snap, attack);
    const saved = JSON.parse(JSON.stringify(live.inputs));
    // Máy chủ trả các lần bấm kèm rác người đánh gửi lên: lọc như lúc đánh lại.
    const replay = replayPvp(snap, attack, [...saved, null, 'x', { s: -1, k: 'trongTran' }, { s: 5, k: 'bay' }, { s: 1.5, k: 'rut' }]);
    expect(replay.inputs).toEqual(saved);
    let frames = 0;
    // Khung hình lẻ, lúc nhanh gấp bốn: vẫn chỉ chạy trọn bước.
    while (!stepPvp(replay, frames++ % 3 ? 1000 / 60 : 4000 / 60)) {
      pushInput(replay, 'trongTran');
      if (frames > 200_000) throw new Error('trận xem lại không xong');
    }
    expect(replay.inputs).toEqual(saved);
    expect(replay.step).toBe(live.step);
    expect(JSON.stringify(replay.battle)).toBe(JSON.stringify(live.battle));
    expect(JSON.stringify(replay.def.buildings)).toBe(JSON.stringify(live.def.buildings));
    expect(cleanInputs('x')).toEqual([]);
    expect(cleanInputs(Array.from({ length: PVP_MAX_INPUTS + 50 }, (_, s) => ({ s, k: 'rut' }))).length).toBe(PVP_MAX_INPUTS);
  }, 30000);

  it('tháp bắn quân ta, lính giữ thành đánh quân ta, quân ta phá công trình; không cướp của trong trận', () => {
    const snap = botSnapshot(5);
    const run = fight(snap, attackAt(snap, SAMPLE_ARMY, 1));
    const b = run.battle;
    expect(b.mode).toBe('pvp');
    expect(Object.values(b.lost).reduce((n, v) => n + v, 0)).toBeGreaterThan(0);
    expect(b.killed).toBeGreaterThan(0);
    expect(b.wrecked.length).toBeGreaterThan(0);
    expect(b.stolen).toEqual({ gao: 0, voOc: 0, datDa: 0, sat: 0, go: 0 });
    expect(run.def.resources).toEqual(snap.resources);
    expect(b.t).toBeLessThanOrEqual(DAU_THANH.holdS + 0.1);
  }, 30000);

  it('bậc lên thành: cung thủ giữ thành lên mặt thành, mỗi người một ô; quân đánh thành không lên', () => {
    // Kinh đô có vòng thành đất (lũy cấp 2) quanh Điện, dựa vào hai bờ sông, bậc lên thành phía bắc; chỉ giữ bằng cung thủ.
    const s = capital();
    const at = DIEN - 4;
    for (let z = at; z < RIVER_START; z++) expect(place(s, 'luy', at, z).ok).toBe(true);
    for (let x = at + 1; x < RIVER_START; x++) expect(place(s, 'luy', x, at).ok).toBe(true);
    for (const b of s.buildings) if (b.type === 'luy') b.level = 2;
    s.buildings = s.buildings.filter((b) => b.type !== 'doanhTrai');
    const camp = place(s, 'doanhTrai', DIEN + BUILDINGS.dien.w + 1, DIEN + 2);
    if (!camp.ok) throw new Error(camp.reason);
    camp.value.level = 5;
    s.troops = { giao: 0, cung: 12, voi: 0, no: 0 };
    expect(place(s, 'bacThanh', DIEN + 4, at + 1).ok).toBe(true);
    const snap = makeSnapshot(s);
    expect(validateSnapshot(snap)).toBeNull();
    const run = beginPvp(snap, attackAt(snap, SAMPLE_ARMY, 3));
    let most = 0;
    while (!stepPvp(run, 50)) {
      const up = run.battle.fighters.filter((f) => f.wall && f.state === 'fight');
      for (const f of up) expect(f.side).toBe('giac');
      // Đứng bắn trên mặt thành thì mỗi người một ô (như lính ta khi giữ kinh đô).
      expect(new Set(up.map((f) => `${Math.floor(f.x)},${Math.floor(f.z)}`)).size).toBe(up.length);
      most = Math.max(most, up.length);
    }
    expect(most).toBeGreaterThanOrEqual(2);
  }, 30000);

  it('rút quân: trận xong ngay ở bước sau', () => {
    const snap = botSnapshot(5);
    const run = beginPvp(snap, attackAt(snap, SAMPLE_ARMY, 1));
    stepPvp(run, 2000);
    pushInput(run, 'rut');
    expect(stepPvp(run, 50)).toBe(true);
    expect(run.battle.t).toBeLessThan(2.2);
  });

  it('sao: từ nửa số công trình 1 sao, phá Điện thêm 1, phá hết 3', () => {
    const def = defenderState(botSnapshot(5));
    expect(scorePvp(def).stars).toBe(0);
    const scored = def.buildings.filter((b) => !['luy', 'thanh', 'de', 'congThanh', 'bayChong', 'congDe'].includes(b.type));
    for (const b of scored.filter((b) => b.type !== 'dien').slice(0, Math.ceil(scored.length / 2))) b.damaged = true;
    expect(scorePvp(def).stars).toBe(1);
    def.buildings.find((b) => b.type === 'dien')!.damaged = true;
    expect(scorePvp(def).stars).toBe(2);
    for (const b of scored) b.damaged = true;
    expect(scorePvp(def)).toMatchObject({ stars: 3, pct: 1 });
  });

  it('của cướp: giữ an toàn một phần kho, tối đa 20% phần còn lại, giảm một nửa mỗi cấp đánh người kém cấp', () => {
    const snap = botSnapshot(6);
    const cap = lootCap(snap);
    for (const r of ['gao', 'voOc'] as const) expect(cap[r]).toBe(Math.floor(0.2 * (snap.resources[r] - 0.25 * snap.cap)));
    const all = { pct: 1, stars: 3, dien: true, kho: 2, khoTotal: 2 };
    expect(lootPvp(snap, all, 6)).toEqual(cap);
    const half = lootPvp(snap, all, 7);
    expect(half.gao).toBe(Math.floor(cap.gao * 0.5));
    const none = lootPvp(snap, { pct: 0, stars: 0, dien: false, kho: 0, khoTotal: 2 }, 6);
    expect(none.gao).toBe(0);
    // Của dưới phần giữ an toàn thì không mất gì.
    expect(lootCap({ resources: { gao: 100, voOc: 0, datDa: 0, sat: 0, go: 0 }, cap: 1000 }).gao).toBe(0);
  });

  it('chiến công: thắng được 10–40 tùy chênh lệch, người giữ thành mất bấy nhiêu; thua thì ngược lại; không âm', () => {
    expect(trophyDelta(500, 500, 2)).toEqual({ atk: 25, def: -25 });
    expect(trophyDelta(500, 1500, 1).atk).toBe(40);
    expect(trophyDelta(1500, 500, 1).atk).toBe(10);
    expect(trophyDelta(500, 500, 0)).toEqual({ atk: -25, def: 25 });
    expect(trophyDelta(5, 500, 0).atk).toBe(-5);
    expect(trophyDelta(500, 3, 3).def).toBe(-3);
  });

  it('điều kiện: từ Điện 5, có doanh trại, không có giặc; quân không quá quân có và số chỗ một trận', () => {
    const s = capital();
    expect(canPractice(s)).toBeNull();
    setDien(s, 4);
    expect(canPractice(s)).toBe('canDien5');
    setDien(s, 5);
    expect(validateArmy(s, { giao: 14, cung: 12, voi: 4, no: 0 })).toBeNull();
    expect(validateArmy(s, { giao: 15, cung: 12, voi: 4, no: 0 })).toBe('quaQuan');
    expect(validateArmy(s, { giao: 0, cung: 0, voi: 0, no: 0 })).toBe('khongCoQuan');
  });

  it('đang đánh thử thì giặc không tới', () => {
    const s = capital();
    s.raid.nextAt = s.clock + 1000;
    tick(s, 60_000, true);
    expect(s.raid.phase).toBe('idle');
    tick(s, 60_000);
    expect(s.raid.phase).not.toBe('idle');
  });
});

describe('cân bằng Đấu thành với kinh đô máy', () => {
  // Trận Đấu thành rung theo chỗ đứng ban đầu (hạt giống) và phía tràn vào, nên chấm theo trung bình sáu trận (ba hạt
  // giống, hai phía): đủ 38 chỗ quân mẫu, bấm như người chơi thường, trung bình 1–2 sao; nửa quân dưới nửa sao.
  for (const dien of [5, 7, 8]) {
    it(`Điện ${dien}: đủ quân mẫu trung bình 1–2 sao, nửa quân trung bình dưới nửa sao`, () => {
      const snap = botSnapshot(dien);
      const full = dien >= 8 ? SAMPLE_ARMY4 : SAMPLE_ARMY;
      const half = dien >= 8 ? HALF_ARMY4 : HALF_ARMY;
      expect(armySpace(full)).toBe(38);
      const won: number[] = [];
      const lost: number[] = [];
      for (const side of ['bac', 'tay'] as const) {
        for (const seed of SEEDS) {
          won.push(scorePvp(fight(snap, attackAt(snap, full, seed, side)).def).stars);
          lost.push(scorePvp(fight(snap, attackAt(snap, half, seed, side)).def).stars);
        }
      }
      const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
      const note = `đủ quân [${won.join('')}], nửa quân [${lost.join('')}]`;
      expect(mean(won), note).toBeGreaterThanOrEqual(1);
      expect(mean(won), note).toBeLessThanOrEqual(2);
      expect(mean(lost), note).toBeLessThan(0.5);
    }, 120000);
  }
});
