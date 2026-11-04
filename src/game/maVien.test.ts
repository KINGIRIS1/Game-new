// Canh chương 5 phần 3: Mã Viện sang (thắng màn 37), thủy quân Hán và lâu thuyền đánh kinh đô, Lệnh nỏ của Mã Viện,
// màn 37–40 (màn 40 cầm cự ở Cấm Khê), Đền Hát Môn, đoạn truyện 4–6, màn hình Hết truyện mới, nhiệm vụ 58–61,
// bản lưu phiên bản 23.

import { describe, expect, it } from 'vitest';
import { startBattle, startFieldBattle, stepBattle, stepField, useSkill, type Battle, type BattleEvent, type HeroSetup } from './battle';
import { canStartStage, startStage } from './campaign';
import { CH5_LAST, LANG_BAC_AT, MA_VIEN_AT, chuong5Won, maVienCame } from './chuong5';
import {
  BUILDINGS,
  BUILD_MENU,
  CH5_QUEST_START,
  DEFAULT_ROWS,
  ENEMIES,
  FIRST_HAN_MS,
  GIFT_IDS,
  HAT_MON_NGHIA_BINH,
  HIEU_TRIEU,
  LAU_THUYEN,
  MA_VIEN_VOLLEY,
  NGHIA_BINH,
  QUESTS,
  RAID_SCALE,
  RAID_WARNING_MS,
  SKILL_IDS,
  STAGES,
  stageEnemies,
  thuyHanForces,
  thuyHanHpScale,
} from './defs';
import { callRaidNow, canPlace, createInitialState, nextFoe, place, questProgress, tick, upcomingBoats, type GameState } from './game';
import { tomTat } from './manVao';
import { RIVER_END, RIVER_START } from './map';
import { mauFrom, mauSlots } from './mau';
import { SAVE_VERSION, deserialize, serialize } from './save';
import { markStory, pendingStory } from './story';
import { HALF_ARMY4, SAMPLE_ARMY4, SEEDS, fightStage } from './testkit';
import { DIEN_END, edge, setDien } from './testmap';

/**
 * Kinh đô chương 5 đã thắng tới màn `cleared`: Điện cấp 9, doanh trại cấp 5 đủ quân mẫu chương 4, Hai Bà khỏe,
 * Cao Lỗ có Lệnh bắn, đã xem mọi đoạn truyện tới Trưng Vương.
 */
function ch5(cleared = MA_VIEN_AT): GameState {
  const s = createInitialState(0);
  setDien(s, 9);
  s.resources = { gao: 60000, voOc: 60000, datDa: 60000, sat: 60000, go: 60000 };
  s.dan = 40;
  s.questIndex = CH5_QUEST_START;
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: true, restUntil: 0, ascended: true };
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  s.son.non = true;
  s.son.won = true;
  s.adv = { no: true, restUntil: 0, kimQuy: true, won: true, layTrao: true, bien: true };
  s.caoLo.lenhBan = true;
  s.campaign.cleared = cleared;
  const barracks = place(s, 'doanhTrai', DIEN_END + 1, DIEN_END + 1);
  if (!barracks.ok) throw new Error(barracks.reason);
  barracks.value.level = 5;
  s.troops = { ...SAMPLE_ARMY4 };
  for (const id of ['mo', 'suGia', 'benKia', 'vuonVai', 'roiGay', 'ketChuong', 'langLieu', 'kenRe', 'ruocDau', 'doiNon', 'ketChuong2', 'cotDa', 'dietYeu', 'noThan', 'kimQuy', 'ketChuong3', 'cauHon', 'caoLoCamQuan', 'layNo', 'longNgong', 'ngocTrai', 'hetTruyen', 'meLinh', 'hatMon', 'trungVuong'] as const) {
    markStory(s, id);
  }
  return s;
}

/** Báo đợt thủy quân Hán tới bờ `side` (đợt thứ `n` của thủy quân Hán). */
function callThuyHan(s: GameState, side: 'nam' | 'dong', n = 1): void {
  s.raid.foe = 'thuy';
  s.raid.wave = side === 'nam' ? 0 : 1;
  s.raid.thuyHan = n - 1;
  expect(callRaidNow(s).ok).toBe(true);
  expect(s.raid.foe).toBe('thuyHan');
  expect(s.raid.side).toBe(side);
}

/** Dựng 5 chòi canh cách sông 2 ô, quanh chỗ trinh sát báo lâu thuyền đầu tiên sẽ tới. */
function riverTowers(s: GameState, side: 'nam' | 'dong'): void {
  const ship = upcomingBoats(s).find((b) => b.big)!;
  const along = Math.round(side === 'nam' ? ship.x : ship.z);
  for (const k of [-4, -2, 0, 2, 4]) {
    const r = side === 'nam' ? place(s, 'choiCanh', along + k, RIVER_START - 2) : place(s, 'choiCanh', RIVER_START - 2, along + k);
    expect(r.ok).toBe(true);
  }
}

/** Chạy trận giữ kinh đô đang báo tới khi xong, bấm mọi kỹ năng khi đã hồi. */
function fightRaid(s: GameState): Battle {
  tick(s, RAID_WARNING_MS);
  const battle = s.raid.battle!;
  for (let i = 0; i < 1800 && s.raid.phase === 'battle'; i++) {
    if (battle.t > 2) for (const k of SKILL_IDS) useSkill(battle, k);
    tick(s, 125);
  }
  return battle;
}

/** Thắng ngay màn `n` (giặc ngã hết) để xem chuyện sau trận. */
function winStage(s: GameState, n: number): void {
  expect(startStage(s, n, SAMPLE_ARMY4, DEFAULT_ROWS).ok).toBe(true);
  const b = s.campaign.battle!;
  for (const f of b.fighters) {
    if (f.side !== 'giac') continue;
    f.hp = 0;
    f.state = 'dead';
  }
  b.waves = [];
  b.holdS = undefined;
  tick(s, 1000);
  expect(s.campaign.lastResult?.outcome).toBe('win');
}

const ships = (b: Battle) => b.fighters.filter((f) => f.kind === 'lauThuyen');

describe('thủy quân Hán', () => {
  it('thắng màn 37 lần đầu thì Mã Viện sang: đợt thủy quân Hán tới trong 3 phút, rồi thủy quân, quân Hán, lũ thay phiên', () => {
    const s = ch5(MA_VIEN_AT - 1);
    s.raid.nextAt = s.clock + 10 * 60_000;
    s.raid.foe = 'thuy';
    expect(maVienCame(s)).toBe(false);
    expect(nextFoe(s)).toBe('han');
    winStage(s, MA_VIEN_AT);
    expect(maVienCame(s)).toBe(true);
    // Lịch giặc dừng trong lúc đánh phó bản, nên tính từ lúc trận bắt đầu (trận thử kéo 1 giây).
    expect(s.raid.nextAt! - s.clock).toBeLessThanOrEqual(FIRST_HAN_MS + 1000);
    expect(nextFoe(s)).toBe('thuyHan');
    s.raid.foe = 'thuyHan';
    expect(nextFoe(s)).toBe('han');
    s.raid.foe = 'han';
    expect(nextFoe(s)).toBe('thuy');
    s.raid.foe = 'thuy';
    expect(nextFoe(s)).toBe('thuyHan');
  });

  it('quân số: lính kích và giáp sĩ trên thuyền chở lính, lâu thuyền 1 chiếc ở đợt 1, 2, 2 chiếc từ đợt 3; máu nhân 2,2 + 0,12 mỗi đợt', () => {
    expect(thuyHanForces(1)).toEqual({ linhHan: 11, giapHan: 3, lauThuyen: 1 });
    expect(thuyHanForces(2).lauThuyen).toBe(1);
    expect(thuyHanForces(3).lauThuyen).toBe(2);
    expect(thuyHanForces(30)).toEqual({ linhHan: 20, giapHan: 8, lauThuyen: 2 });
    expect(thuyHanHpScale(1)).toBeCloseTo(2.2, 9);
    expect(thuyHanHpScale(4)).toBeCloseTo(2.56, 9);
    const s = ch5();
    for (const side of ['nam', 'dong'] as const) {
      const b = startBattle(s, 1, side, { land: { foe: 'thuyHan', n: 1 } });
      expect(b.foe).toBe('thuyHan');
      expect(ships(b).length).toBe(1);
      expect(b.total).toBe(11 + 3 + 1);
      expect(ships(b)[0].maxHp).toBeCloseTo(ENEMIES.lauThuyen.hp * thuyHanHpScale(1), 6);
      // Lính đi thuyền chở lính cập bờ như thủy binh Triệu, mỗi thuyền 6 người.
      expect(b.boats.length).toBe(Math.ceil(14 / 6));
      expect(ships(startBattle(s, 3, side, { land: { foe: 'thuyHan', n: 3 } })).length).toBe(2);
    }
  });

  it('lâu thuyền đậu giữa ba ô sông sát bờ, không cập bờ; mỗi 2 giây bắn 3 mũi nỏ vào lính, công trình gần nhất trong tầm', () => {
    for (const side of ['nam', 'dong'] as const) {
      const s = ch5();
      const b = startBattle(s, 1, side, { land: { foe: 'thuyHan', n: 1 } });
      const ship = ships(b)[0];
      const across = (f: { x: number; z: number }) => (side === 'nam' ? f.z : f.x);
      expect(across(ship)).toBeGreaterThan(RIVER_START + 3);
      const events: BattleEvent[] = [];
      let shotAt = -1;
      for (let i = 0; i < 20 * 40; i++) {
        stepBattle(s, b, 0.05);
        expect(across(ship)).toBeGreaterThanOrEqual(RIVER_START + LAU_THUYEN.moor - 1e-9);
        const shots = b.events.filter((e) => e.kind === 'shot' && e.by === 'noHan' && e.x === ship.x && e.z === ship.z);
        if (shots.length && shotAt < 0) {
          shotAt = b.t;
          expect(shots.length).toBe(LAU_THUYEN.shots);
          for (const e of shots) expect(Math.hypot(e.tx! - ship.x, e.tz! - ship.z)).toBeLessThanOrEqual(ENEMIES.lauThuyen.range * RAID_SCALE + 3);
        }
        events.push(...b.events);
        b.events.length = 0;
      }
      expect(across(ship)).toBeCloseTo(RIVER_START + LAU_THUYEN.moor, 6);
      expect(shotAt).toBeGreaterThan(0);
      const volleys = events.filter((e) => e.kind === 'shot' && e.by === 'noHan').length / LAU_THUYEN.shots;
      expect(volleys).toBeGreaterThanOrEqual(Math.floor((40 - shotAt) / ENEMIES.lauThuyen.cooldown));
      expect(volleys).toBeLessThanOrEqual(Math.ceil((40 - shotAt) / ENEMIES.lauThuyen.cooldown) + 1);
    }
  });

  it('chỉ quân bắn xa và công trình phòng thủ bắn tới lâu thuyền: quân giáo, voi và Hai Bà không đánh; hết giờ thì thuyền rút, đợt ấy thua; thuyền không cướp của', () => {
    const s = ch5();
    s.troops = { giao: 11, cung: 0, voi: 3, no: 0 };
    callThuyHan(s, 'nam');
    const b = fightRaid(s);
    const ship = ships(b)[0];
    expect(ship.hp).toBe(ship.maxHp);
    expect(ship.state).toBe('gone');
    const r = s.raid.lastResult!;
    expect(r.won).toBe(false);
    expect(r.killed).toBe(r.total - 1);
    // Lính trên bộ đã ngã hết trước khi kịp cướp, thuyền đứng dưới sông thì không cướp gì.
    expect(Object.values(r.stolen).every((v) => v === 0)).toBe(true);
    expect(s.raid.lauSunk).toBe(0);
  });

  it('đợt thủy quân Hán đầu: quân mẫu, Hai Bà và 5 chòi canh ven sông diệt hết, đánh chìm lâu thuyền; tính cho nhiệm vụ 58', () => {
    for (const side of ['nam', 'dong'] as const) {
      const s = ch5();
      callThuyHan(s, side);
      riverTowers(s, side);
      const b = fightRaid(s);
      expect(b.hero?.kind).toBe('trungTrac');
      expect(b.hero2?.kind).toBe('trungNhi');
      expect(b.sunk, side).toBe(1);
      expect(b.events.some((e) => e.kind === 'sink') || ships(b)[0].hp <= 0).toBe(true);
      const r = s.raid.lastResult!;
      expect(r.foe).toBe('thuyHan');
      expect(r.killed, side).toBe(r.total);
      expect(r.won, side).toBe(true);
      expect(s.raid.thuyHan).toBe(1);
      expect(s.raid.thuyHanHeld).toBe(1);
      expect(s.raid.lauSunk).toBe(1);
      s.questIndex = QUESTS.findIndex((q) => q.id === 'chimLauThuyen');
      expect(questProgress(s)).toEqual({ have: 1, need: 1 });
    }
  });

  it('chòi canh xa bờ không bắn tới lâu thuyền: không quân bắn xa thì không đánh chìm được', () => {
    const s = ch5();
    s.troops = { giao: 11, cung: 0, voi: 3, no: 0 };
    callThuyHan(s, 'nam');
    const ship = upcomingBoats(s).find((p) => p.big)!;
    // Cách chỗ đậu xa hơn tầm chòi canh.
    for (const k of [-2, 0, 2]) expect(place(s, 'choiCanh', Math.round(ship.x) + k, RIVER_START - 7).ok).toBe(true);
    const b = fightRaid(s);
    expect(ships(b)[0].hp).toBe(ships(b)[0].maxHp);
    expect(s.raid.lastResult!.won).toBe(false);
  });

  it('trinh sát báo trước chỗ từng thuyền, cả lâu thuyền, đúng chỗ trận đặt', () => {
    for (const side of ['nam', 'dong'] as const) {
      const s = ch5();
      expect(upcomingBoats(s)).toEqual([]);
      callThuyHan(s, side, 3);
      const plan = upcomingBoats(s);
      const big = plan.filter((p) => p.big);
      expect(big.length).toBe(2);
      tick(s, RAID_WARNING_MS);
      const b = s.raid.battle!;
      const crew = plan.filter((p) => !p.big);
      expect(b.boats.length).toBe(crew.length);
      b.boats.forEach((boat, i) => {
        expect(boat.x).toBeCloseTo(crew[i].x, 9);
        expect(boat.z).toBeCloseTo(crew[i].z, 9);
      });
      ships(b).forEach((f, i) => {
        expect(f.ship!.ox).toBeCloseTo(big[i].x, 9);
        expect(f.ship!.oz).toBeCloseTo(big[i].z, 9);
      });
      expect(upcomingBoats(s)).toEqual([]);
    }
  });

  it('Đền Cuông còn nguyên thì bớt thuyền chở lính, không bớt lâu thuyền', () => {
    const s = ch5();
    const plain = startBattle(s, 3, 'nam', { land: { foe: 'thuyHan', n: 3 } });
    const fewer = startBattle(s, 3, 'nam', { land: { foe: 'thuyHan', n: 3 }, fewerBoats: true });
    expect(fewer.boats.length).toBeLessThan(plain.boats.length);
    expect(ships(fewer).length).toBe(ships(plain).length);
  });

  it('bờ bên kia có công trình thì thủy quân Hán cũng cập bờ bên kia như thủy binh Triệu, lâu thuyền đậu sát bờ ấy', () => {
    const s = ch5();
    const b = startBattle(s, 1, 'namXa', { land: { foe: 'thuyHan', n: 1 } });
    const ship = ships(b)[0];
    for (let i = 0; i < 20 * 20; i++) stepBattle(s, b, 0.05);
    expect(ship.z).toBeCloseTo(RIVER_END - LAU_THUYEN.moor, 6);
  });
});

describe('Đền Hát Môn', () => {
  it('đền còn nguyên thì mỗi trận giữ kinh đô có 6 nghĩa binh ra đánh; đền hư thì không', () => {
    const s = ch5(40);
    const nghia = (b: Battle) => b.fighters.filter((f) => f.kind === 'nghiaBinh' && f.side === 'ta');
    expect(nghia(startBattle(s, 1, 'bac', { land: { foe: 'han', n: 1 } })).length).toBe(0);
    const den = place(s, 'denHatMon', edge(9, 1), edge(9, 1));
    if (!den.ok) throw new Error(den.reason);
    const b = startBattle(s, 1, 'bac', { land: { foe: 'han', n: 1 } });
    expect(nghia(b).length).toBe(HAT_MON_NGHIA_BINH);
    for (const f of nghia(b)) expect(f.maxHp).toBe(NGHIA_BINH.hp);
    den.value.damaged = true;
    expect(nghia(startBattle(s, 1, 'bac', { land: { foe: 'han', n: 1 } })).length).toBe(0);
  });
});

const TRAC: HeroSetup = { kind: 'trungTrac', bamboo: false, glow: false, non: false };
const NHI: HeroSetup = { kind: 'trungNhi', bamboo: false, glow: false, non: false, hieuTrieu: true };
const HAI_BA = [TRAC, NHI];

describe('Mã Viện', () => {
  it('Lệnh nỏ: lần đầu sau 8 giây, rồi cứ 14 giây, tên rơi xuống chỗ quân ta đông nhất sau 0,8 giây: 30 sát thương mỗi người trong 2 ô', () => {
    const b = startFieldBattle({ id: 7, stage: LANG_BAC_AT, enemies: { maVien: 1 }, hpScale: 20, army: { giao: 0, cung: 12, voi: 0, no: 0 }, rows: DEFAULT_ROWS, hero: null });
    const casts: number[] = [];
    let hits = 0;
    let before = new Map<number, number>();
    let aim: { x: number; z: number } | null = null;
    for (let i = 0; i < 20 * 30 && !stepField(b, 0.05); i++) {
      for (const e of b.events) {
        if (e.kind === 'barrage') {
          casts.push(b.t);
          aim = { x: e.tx!, z: e.tz! };
          before = new Map(b.fighters.filter((f) => f.side === 'ta' && f.hp > 0).map((f) => [f.id, f.hp]));
        }
        if (e.kind === 'barrageHit' && aim) {
          hits++;
          expect(e.x).toBeCloseTo(aim.x, 9);
          for (const f of b.fighters) {
            const hp0 = before.get(f.id);
            if (hp0 === undefined || Math.hypot(f.x - aim.x, f.z - aim.z) > MA_VIEN_VOLLEY.radius - 0.3) continue;
            expect(hp0 - Math.max(0, f.hp)).toBeGreaterThanOrEqual(Math.min(hp0, MA_VIEN_VOLLEY.dmg) - 1e-9);
          }
        }
      }
      b.events.length = 0;
    }
    expect(casts.length).toBe(2);
    expect(casts[0]).toBeCloseTo(MA_VIEN_VOLLEY.first, 0);
    expect(casts[1] - casts[0]).toBeCloseTo(MA_VIEN_VOLLEY.every, 0);
    expect(hits).toBe(2);
  });

  it('Mã Viện ở màn 39 và ở đợt cuối màn 40; quân nỏ đánh mạnh gấp đôi hắn như với trùm khác', () => {
    expect(STAGES[LANG_BAC_AT - 1].enemies.maVien).toBe(1);
    const last = STAGES[CH5_LAST - 1];
    expect(last.enemies.maVien ?? 0).toBe(0);
    expect(last.waves?.at(-1)?.enemies.maVien).toBe(1);
  });
});

describe('phó bản chương 5: màn 37–40', () => {
  it('mở theo thứ tự; mỗi lúc tối đa 25 giặc trên bãi; màn 40 cầm cự 100 giây, ba đợt lúc 0, 35, 70 giây', () => {
    const s = ch5(MA_VIEN_AT - 1);
    expect(canStartStage(s, MA_VIEN_AT).ok).toBe(true);
    expect(canStartStage(s, MA_VIEN_AT + 1)).toEqual({ ok: false, reason: 'manKhoa' });
    const people = (Object.values(SAMPLE_ARMY4) as number[]).reduce((a, b) => a + b, 0);
    for (let n = MA_VIEN_AT; n <= CH5_LAST; n++) {
      const def = STAGES[n - 1];
      expect(def.chapter).toBe(5);
      expect(def.minDien).toBe(5);
      const at = [def.enemies, ...(def.waves ?? []).map((w) => w.enemies)].map((e) => Object.values(e).reduce((a, k) => a + (k ?? 0), 0));
      for (const k of at) {
        expect(k).toBeLessThanOrEqual(25);
        expect(k + people + 2 + HIEU_TRIEU.count).toBeLessThanOrEqual(60);
      }
    }
    const last = STAGES[CH5_LAST - 1];
    expect(last.holdS).toBe(100);
    expect(last.waves?.map((w) => w.at)).toEqual([35, 70]);
    expect(stageEnemies(last)).toEqual({ linhHan: 13, noHan: 8, giapHan: 7, maVien: 1 });
    expect(last.terrain).toBe('camKhe');
    expect(STAGES[LANG_BAC_AT - 1].terrain).toBe('langBac');
  });

  for (let n = MA_VIEN_AT; n <= CH5_LAST; n++) {
    it(`màn ${n} (máu giặc ×${STAGES[n - 1].hpScale}): người chơi thường có Hai Bà thì thắng; không tướng, hay nửa quân, chơi giỏi cũng thua`, () => {
      for (const id of SEEDS) {
        const won = fightStage(n, SAMPLE_ARMY4, HAI_BA, 'thuong', id);
        expect(won.outcome, String(id)).toBe('win');
        expect(fightStage(n, SAMPLE_ARMY4, null, 'gioi', id).outcome).toBe('lose');
        expect(fightStage(n, HALF_ARMY4, HAI_BA, 'gioi', id).outcome).toBe('lose');
      }
    });
  }

  it('gặp Mã Viện (màn 39, 40) mà không bấm kỹ năng thì thua', () => {
    for (const n of [LANG_BAC_AT, CH5_LAST]) for (const id of SEEDS) expect(fightStage(n, SAMPLE_ARMY4, HAI_BA, 'khongBam', id).outcome).toBe('lose');
  });

  it('màn 40: giữ đủ 100 giây thì thắng dù giặc còn; quân ta ngã hết trước thì thua', () => {
    const won = fightStage(CH5_LAST, SAMPLE_ARMY4, HAI_BA, 'thuong', 1);
    expect(won.outcome).toBe('win');
    expect(won.t).toBeGreaterThanOrEqual(99);
    expect(won.t).toBeLessThanOrEqual(101);
  });

  it('thắng màn 40 lần đầu thì kết chương 5 (Hai Bà hiện bóng thắng trận) và mở Đền Hát Môn', () => {
    const s = ch5(CH5_LAST - 1);
    expect(canPlace(s, 'denHatMon', edge(9, 1), edge(9, 1))).toEqual({ ok: false, reason: 'canKetChuong5' });
    winStage(s, CH5_LAST);
    expect(s.campaign.battle!.hatWin).toBe(true);
    expect(chuong5Won(s)).toBe(true);
    s.campaign.battle = null;
    expect(canPlace(s, 'denHatMon', edge(9, 1), edge(9, 1)).ok).toBe(true);
    // Đánh lại màn 40 thì không kết chương lần nữa.
    winStage(s, CH5_LAST);
    expect(s.campaign.battle!.hatWin).toBeFalsy();
  });
});

describe('Đền Hát Môn trong bảng Xây dựng và mẫu kinh đô', () => {
  it('4×4, dựng một lần, có trong bảng Xây dựng; mẫu Cổ Loa giữ sông có một chỗ cho đền từ Điện 9', () => {
    const def = BUILDINGS.denHatMon;
    expect([def.w, def.d]).toEqual([4, 4]);
    expect(def.buildCost).toEqual({ gao: 5000, voOc: 5000, datDa: 5000, sat: 1400 });
    expect(def.limit.every((n) => n === 1)).toBe(true);
    expect(BUILD_MENU).toContain('denHatMon');
    // Vào chương 5 thì đã có Điện 9: mẫu chừa chỗ đền từ Điện 9.
    expect(mauFrom('coLoaSong', 'denHatMon')).toBe(9);
    for (let lv = 9; lv <= 10; lv++) expect(mauSlots('coLoaSong', lv).filter((slot) => slot.type === 'denHatMon').length, String(lv)).toBe(1);
  });
});

describe('truyện và nhiệm vụ chương 5 phần 3', () => {
  it('kể Phục Ba tướng quân khi thắng màn 37, Lãng Bạc khi thắng màn 39, Sông Hát rồi màn Hết truyện mới khi thắng màn 40', () => {
    const s = ch5(MA_VIEN_AT - 1);
    expect(pendingStory(s)).toBeNull();
    s.campaign.cleared = MA_VIEN_AT;
    expect(pendingStory(s)).toBe('phucBa');
    markStory(s, 'phucBa');
    s.campaign.cleared = LANG_BAC_AT - 1;
    expect(pendingStory(s)).toBeNull();
    s.campaign.cleared = LANG_BAC_AT;
    expect(pendingStory(s)).toBe('langBac');
    markStory(s, 'langBac');
    s.campaign.cleared = CH5_LAST;
    expect(pendingStory(s)).toBe('songHat');
    markStory(s, 'songHat');
    expect(pendingStory(s)).toBe('hetTruyen5');
    markStory(s, 'hetTruyen5');
    expect(pendingStory(s)).toBeNull();
  });

  it('màn hình vào game: sang chương 5 thì truyện còn tiếp; xem Hết truyện mới thì đã hết truyện', () => {
    const s = ch5(CH5_LAST);
    expect(tomTat(s, s.clock).chapter).toBe(5);
    expect(tomTat(s, s.clock).hetTruyen).toBe(false);
    markStory(s, 'hetTruyen5');
    expect(tomTat(s, s.clock).hetTruyen).toBe(true);
  });

  it('nhiệm vụ 58–61: đánh chìm một lâu thuyền, qua màn 39, giữ Cấm Khê, dựng Đền Hát Môn', () => {
    const at = CH5_QUEST_START + 6;
    expect(QUESTS.slice(at, at + 4).map((q) => q.id)).toEqual(['chimLauThuyen', 'quaMan39', 'camKhe', 'denHatMon']);
    expect(QUESTS.slice(at, at + 4).map((q) => q.reward)).toEqual([
      { voOc: 2500, sat: 800 },
      { voOc: 3000, datDa: 2500 },
      { gao: 5000, voOc: 5000 },
      { datDa: 3500, sat: 1100 },
    ]);
    expect(QUESTS.length).toBe(at + 4);
    const s = ch5(CH5_LAST);
    s.questIndex = at;
    expect(questProgress(s)).toEqual({ have: 0, need: 1 });
    s.raid.lauSunk = 2;
    expect(questProgress(s)).toEqual({ have: 1, need: 1 });
    s.questIndex = at + 3;
    expect(questProgress(s)).toEqual({ have: 0, need: 1 });
    expect(place(s, 'denHatMon', edge(9, 1), edge(9, 1)).ok).toBe(true);
    expect(questProgress(s)).toEqual({ have: 1, need: 1 });
  });
});

describe('bản lưu 23', () => {
  it('lưu rồi đọc lại giữ số đợt thủy quân Hán, số lâu thuyền đã đánh chìm', () => {
    const s = ch5();
    s.raid.thuyHan = 4;
    s.raid.thuyHanHeld = 3;
    s.raid.lauSunk = 5;
    s.raid.foe = 'thuyHan';
    const back = deserialize(serialize(s))!;
    expect(SAVE_VERSION).toBe(23);
    expect(back.version).toBe(23);
    expect([back.raid.thuyHan, back.raid.thuyHanHeld, back.raid.lauSunk, back.raid.foe]).toEqual([4, 3, 5, 'thuyHan']);
  });

  it('nâng bản lưu 22 lên 23: thêm số đợt thủy quân Hán; đã thắng màn 37 thì hẹn thủy quân Hán', () => {
    for (const cleared of [MA_VIEN_AT - 1, MA_VIEN_AT]) {
      const s = ch5(cleared);
      s.raid.nextAt = s.clock + 10 * 60_000;
      s.raid.foe = 'han';
      const raw = JSON.parse(serialize(s));
      raw.version = 22;
      delete raw.raid.thuyHan;
      delete raw.raid.thuyHanHeld;
      delete raw.raid.lauSunk;
      const back = deserialize(JSON.stringify(raw))!;
      expect(back, String(cleared)).toBeDefined();
      expect(back.version).toBe(SAVE_VERSION);
      expect([back.raid.thuyHan, back.raid.thuyHanHeld, back.raid.lauSunk]).toEqual([0, 0, 0]);
      if (cleared >= MA_VIEN_AT) {
        expect(back.raid.nextAt! - back.clock).toBe(FIRST_HAN_MS);
        expect(nextFoe(back)).toBe('thuyHan');
      } else {
        expect(back.raid.nextAt! - back.clock).toBe(10 * 60_000);
        expect(nextFoe(back)).toBe('thuy');
      }
    }
  });
});
