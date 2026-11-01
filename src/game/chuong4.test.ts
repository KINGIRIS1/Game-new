// Canh chương 4 phần 2: lính nỏ và trại nỏ, ụ nỏ trên thành Cổ Loa, thủy binh Triệu đi thuyền đánh kinh đô,
// lịch đợt chương 4, đoạn truyện "Cầu hôn", nhiệm vụ 42–44, bản lưu phiên bản 11.

import { describe, expect, it } from 'vitest';
import { heroSkills, startBattle, stepBattle, useSkill, type Battle, type RaidSide } from './battle';
import { canForgeArms } from './binhKhi';
import { CH3_QUEST_START, CH4_QUEST_START, FIRST_THUY_BINH_MS, GIFT_IDS, QUESTS, RAID_WARNING_MS, SKILL_IDS, UNITS, U_NO, type UnitType } from './defs';
import {
  callRaidNow,
  canPlace,
  canPlaceUNo,
  canTrain,
  claimQuest,
  createInitialState,
  nextFoe,
  place,
  placeUNo,
  questProgress,
  remove,
  repair,
  repairAll,
  repairUNo,
  tick,
  train,
  troopSpace,
  uNoCount,
  uNoLimit,
  upkeepPerMinute,
  type Building,
  type GameState,
} from './game';
import { RIVER_START } from './map';
import { deserialize, serialize } from './save';
import { heroFor } from './son';
import { markStory, pendingStory } from './story';

type Army = Record<UnitType, number>;
/** Quân mẫu chương 4: đúng 38 chỗ doanh trại cấp 5. */
const ARMY: Army = { giao: 11, cung: 10, voi: 3, no: 4 };

/** Kinh đô vừa vào chương 4: Điện cấp 8, doanh trại cấp 5 trong thành gần sông, ba đền, An Dương Vương có nỏ thần. */
function ch4(): GameState {
  const s = createInitialState(0);
  s.buildings[0].level = 8;
  s.resources = { gao: 60000, voOc: 60000, datDa: 60000, sat: 60000 };
  s.dan = 40;
  s.questIndex = CH4_QUEST_START;
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: true, restUntil: 0, ascended: true };
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  s.son.non = true;
  s.son.won = true;
  s.adv = { no: true, restUntil: 0, kimQuy: true, won: true, layTrao: false };
  s.campaign.cleared = 24;
  const barracks = place(s, 'doanhTrai', 20, 20);
  if (!barracks.ok) throw new Error(barracks.reason);
  barracks.value.level = 5;
  for (const [type, x] of [['denPhuDong', 4], ['denTanVien', 8], ['denCoLoa', 12]] as const) if (!place(s, type, x, 4).ok) throw new Error(`dựng ${type} thử thất bại`);
  s.troops = { ...ARMY };
  for (const id of ['mo', 'suGia', 'vuonVai', 'roiGay', 'ketChuong', 'langLieu', 'kenRe', 'ruocDau', 'doiNon', 'ketChuong2', 'cotDa', 'dietYeu', 'noThan', 'kimQuy', 'ketChuong3'] as const) markStory(s, id);
  return s;
}

/** Đắp một dải thành Cổ Loa dọc hai bờ sông (hàng z = 24 và cột x = 24), trả về các đoạn đã đắp. */
function riverWall(s: GameState): Building[] {
  const out: Building[] = [];
  for (let x = 6; x <= 24; x++) {
    const r = place(s, 'thanh', x, 24);
    if (!r.ok) throw new Error(r.reason);
    out.push(r.value);
  }
  for (let z = 6; z <= 23; z++) {
    const r = place(s, 'thanh', 24, z);
    if (!r.ok) throw new Error(r.reason);
    out.push(r.value);
  }
  return out;
}

/** Chạy trận giữ kinh đô đang báo tới khi xong, bấm mọi kỹ năng khi đã hồi. */
function fightRaid(s: GameState): void {
  tick(s, RAID_WARNING_MS);
  for (let i = 0; i < 1600 && s.raid.phase === 'battle'; i++) {
    const battle = s.raid.battle!;
    if (battle.t > 2) for (const k of SKILL_IDS) useSkill(battle, k);
    tick(s, 125);
  }
}

/** Chạy một trận thủy binh dựng sẵn tới khi thuyền cập bờ hết. */
function landAll(s: GameState, side: RaidSide): Battle {
  const b = startBattle(s, 1, side, { land: { foe: 'thuyBinh', n: 1 } });
  for (let i = 0; i < 400 && b.boats.some((x) => !x.landed); i++) stepBattle(s, b, 0.05);
  return b;
}

describe('lính nỏ và trại nỏ', () => {
  it('trại nỏ chỉ dựng từ chương 4, cần doanh trại cấp 5; lính nỏ luyện ở trại nỏ', () => {
    const s = ch4();
    s.questIndex = CH4_QUEST_START - 1;
    expect(canPlace(s, 'traiNo', 6, 18)).toEqual({ ok: false, reason: 'canChuong4' });
    s.questIndex = CH4_QUEST_START;
    s.buildings.find((b) => b.type === 'doanhTrai')!.level = 4;
    expect(canPlace(s, 'traiNo', 6, 18)).toEqual({ ok: false, reason: 'canDoanhTrai' });
    s.buildings.find((b) => b.type === 'doanhTrai')!.level = 5;
    s.troops = { giao: 0, cung: 0, voi: 0, no: 0 };
    expect(canTrain(s, 'no')).toEqual({ ok: false, reason: 'canNoiO' });
    expect(place(s, 'traiNo', 6, 18).ok).toBe(true);
    expect(canPlace(s, 'traiNo', 9, 18)).toEqual({ ok: false, reason: 'datGioiHan' });
    expect(train(s, 'no').ok).toBe(true);
    expect(s.troops.no).toBe(1);
    // Lính nỏ chiếm 2 chỗ, ăn 1 gạo mỗi phút.
    expect(troopSpace(s)).toBe(2);
    expect(upkeepPerMinute(s) - s.dan * 0.4).toBeCloseTo(1.0, 5);
  });

  it('quân mẫu chương 4 vừa đúng 38 chỗ doanh trại cấp 5', () => {
    const s = ch4();
    expect(troopSpace(s)).toBe(38);
  });

  it('lính nỏ đứng ngoài vòng khắc chế: gấp đôi quân nặng và mọi trùm; tính trên mỗi chỗ đánh thường ngang cung thủ', () => {
    const no = UNITS.no;
    for (const k of ['chienXa', 'caSau', 'hoTinh', 'kyBinh', 'linhRiu', 'phoTuong', 'daiTuong', 'thuongLuong', 'thuyTinh', 'gaTrang', 'trieuDa'] as const) {
      expect(no.strongVs).toContain(k);
    }
    for (const k of ['giaoAn', 'cungAn', 'tomBinh', 'linhThuy', 'cungThuyen'] as const) expect(no.strongVs).not.toContain(k);
    const perSlot = (u: UnitType) => UNITS[u].dmg / UNITS[u].cooldown / UNITS[u].space;
    expect(perSlot('no') / perSlot('cung')).toBeGreaterThan(0.85);
    expect(perSlot('no') / perSlot('cung')).toBeLessThan(1.15);
    // Khắc chế thủy binh: cung thủ thắng lính thủy, voi thắng cung thuyền, giáo binh thắng lính rìu.
    expect(UNITS.cung.strongVs).toContain('linhThuy');
    expect(UNITS.voi.strongVs).toContain('cungThuyen');
    expect(UNITS.giao.strongVs).toContain('linhRiu');
  });

  it('rèn binh khí cho lính nỏ chỉ từ chương 4, cùng giá như ba binh chủng kia', () => {
    const s = ch4();
    const loRen = place(s, 'loRen', 4, 12);
    if (!loRen.ok) throw new Error(loRen.reason);
    loRen.value.level = 7;
    expect(canForgeArms(s, 'no').ok).toBe(true);
    s.questIndex = CH3_QUEST_START;
    expect(canForgeArms(s, 'no')).toEqual({ ok: false, reason: 'canChuong4' });
    expect(canForgeArms(s, 'cung').ok).toBe(true);
  });
});

describe('ụ nỏ trên thành Cổ Loa', () => {
  it('chỉ dựng trên đoạn thành còn nguyên, mỗi đoạn một ụ, tối đa 8 ở Điện 7 và 16 ở Điện 8', () => {
    const s = ch4();
    const wall = riverWall(s);
    expect(canPlaceUNo(s, 10, 10)).toEqual({ ok: false, reason: 'canThanh' });
    const before = s.resources.voOc;
    expect(placeUNo(s, wall[0].x, wall[0].z).ok).toBe(true);
    expect(s.resources.voOc).toBe(before - U_NO.cost.voOc!);
    expect(wall[0].uNo).toBe('ok');
    expect(canPlaceUNo(s, wall[0].x, wall[0].z)).toEqual({ ok: false, reason: 'daCoUNo' });
    wall[1].damaged = true;
    expect(canPlaceUNo(s, wall[1].x, wall[1].z)).toEqual({ ok: false, reason: 'canThanh' });
    expect(uNoLimit(s)).toBe(16);
    s.buildings[0].level = 7;
    expect(uNoLimit(s)).toBe(8);
    for (let i = 2; uNoCount(s) < 8; i++) expect(placeUNo(s, wall[i].x, wall[i].z).ok).toBe(true);
    expect(canPlaceUNo(s, wall[20].x, wall[20].z)).toEqual({ ok: false, reason: 'datGioiHan' });
    s.questIndex = CH4_QUEST_START - 1;
    expect(canPlaceUNo(s, wall[20].x, wall[20].z)).toEqual({ ok: false, reason: 'canChuong4' });
  });

  it('ụ tự bắn giặc trong tầm; thành bị phá thì ụ hư theo; sửa thành xong phải sửa ụ; dỡ thành thì mất ụ', () => {
    const s = ch4();
    s.troops = { giao: 0, cung: 0, voi: 0, no: 0 };
    const wall = riverWall(s);
    const seg = wall[8];
    expect(placeUNo(s, seg.x, seg.z).ok).toBe(true);
    const b = landAll(s, 'nam');
    for (let i = 0; i < 200; i++) stepBattle(s, b, 0.05);
    expect(b.events.some((e) => e.kind === 'shot' && e.by === 'no' && Math.abs(e.x - (seg.x + 0.5)) < 0.01)).toBe(true);
    // Thành bị phá: ụ hư theo, không bắn nữa.
    seg.damaged = true;
    seg.uNo = 'hu';
    expect(repairUNo(s, seg.id)).toEqual({ ok: false, reason: 'canThanh' });
    expect(repair(s, seg.id).ok).toBe(true);
    expect(seg.uNo).toBe('hu');
    const before = s.resources.sat;
    expect(repairUNo(s, seg.id).ok).toBe(true);
    expect(seg.uNo).toBe('ok');
    expect(s.resources.sat).toBe(before - Math.round((U_NO.cost.sat! * 0.3) / 5) * 5);
    // Sửa hết: sửa cả thành lẫn ụ.
    seg.damaged = true;
    seg.uNo = 'hu';
    repairAll(s);
    expect(seg.damaged).toBe(false);
    expect(seg.uNo).toBe('ok');
    // Dỡ đoạn thành thì mất ụ.
    expect(remove(s, seg.id).ok).toBe(true);
    expect(uNoCount(s)).toBe(0);
  });

  it('giặc phá đoạn thành có ụ thì ụ hư theo', () => {
    const s = ch4();
    s.troops = { giao: 0, cung: 0, voi: 0, no: 0 };
    // Vòng thành kín quanh Điện, không chạm sông: thủy binh lên bờ phải phá thành mới vào được.
    s.buildings = s.buildings.filter((b) => b.type !== 'doanhTrai');
    const wall: Building[] = [];
    for (let i = 13; i <= 22; i++) {
      for (const [x, z] of [[i, 22], [22, i], [i, 13], [13, i]]) {
        const r = place(s, 'thanh', x, z);
        if (r.ok) wall.push(r.value);
      }
    }
    // Ụ trên mặt nam và mặt đông, phía sông.
    for (const seg of wall) if ((seg.z === 22 || seg.x === 22) && uNoCount(s) < 16) placeUNo(s, seg.x, seg.z);
    const b = startBattle(s, 1, 'nam', { land: { foe: 'thuyBinh', n: 6 } });
    for (let i = 0; i < 20 * 180 && wall.every((w) => !w.damaged); i++) stepBattle(s, b, 0.05);
    const broken = wall.filter((w) => w.damaged && w.uNo);
    expect(broken.length).toBeGreaterThan(0);
    for (const w of broken) expect(w.uNo).toBe('hu');
  });
});

describe('thủy binh Triệu', () => {
  it('thuyền hiện ở mép sông xa, chèo vào bờ phía nam hay phía đông, thả lính lên đất; mỗi thuyền chở 6 lính', () => {
    for (const side of ['nam', 'dong'] as const) {
      const s = ch4();
      s.troops = { giao: 0, cung: 0, voi: 0, no: 0 };
      const b = startBattle(s, 1, side, { land: { foe: 'thuyBinh', n: 1 } });
      expect(b.foe).toBe('thuyBinh');
      // Đợt 1: 10 lính thủy, 6 cung thuyền, 3 lính rìu = 19 lính, 4 thuyền.
      expect(b.total).toBe(19);
      expect(b.boats.length).toBe(4);
      const enemies = b.fighters.filter((f) => f.side === 'giac');
      expect(enemies.every((f) => f.state === 'aboard')).toBe(true);
      for (const boat of b.boats) expect(side === 'nam' ? boat.z : boat.x).toBeGreaterThan(RIVER_START + 2);
      // Lính trên thuyền chưa bị bắn, chưa đánh: trận chưa xong.
      stepBattle(s, b, 0.05);
      expect(b.killed).toBe(0);
      for (let i = 0; i < 400 && b.boats.some((x) => !x.landed); i++) stepBattle(s, b, 0.05);
      expect(b.boats.every((x) => x.landed)).toBe(true);
      for (const boat of b.boats) expect(side === 'nam' ? boat.z : boat.x).toBeLessThan(RIVER_START + 1);
      // Lên bờ hết, đi bộ vào đất liền (không lội sông).
      for (let i = 0; i < 60; i++) stepBattle(s, b, 0.05);
      const landed = b.fighters.filter((f) => f.side === 'giac' && f.state !== 'dead');
      expect(landed.every((f) => f.state !== 'aboard')).toBe(true);
      expect(landed.some((f) => (side === 'nam' ? f.z : f.x) < RIVER_START)).toBe(true);
    }
  });

  it('quân số và máu tăng dần theo đợt', () => {
    const s = ch4();
    const one = startBattle(s, 1, 'nam', { land: { foe: 'thuyBinh', n: 1 } });
    const nine = startBattle(s, 9, 'nam', { land: { foe: 'thuyBinh', n: 9 } });
    expect(nine.total).toBeGreaterThan(one.total);
    const hp = (b: Battle) => b.fighters.find((f) => f.kind === 'linhThuy')!.maxHp;
    expect(hp(nine) / hp(one)).toBeCloseTo((2.0 + 0.12 * 8) / 2.0, 5);
  });

  it('đợt thủy binh đầu: quân mẫu, An Dương Vương, 5 chòi canh và 8 ụ nỏ diệt hết; tính cho nhiệm vụ', () => {
    for (const side of ['nam', 'dong'] as const) {
      const s = ch4();
      s.buildings[0].level = 7;
      const wall = riverWall(s);
      // 8 ụ nỏ chia đều hai dải thành ven sông.
      for (const i of [2, 6, 10, 14, 21, 25, 29, 33]) expect(placeUNo(s, wall[i].x, wall[i].z).ok).toBe(true);
      for (const [x, z] of [[10, 22], [16, 22], [22, 16], [22, 10], [20, 23]]) expect(place(s, 'choiCanh', x, z).ok).toBe(true);
      s.raid.foe = 'thuy';
      s.raid.wave = side === 'nam' ? 0 : 1;
      expect(callRaidNow(s).ok).toBe(true);
      expect(s.raid.foe).toBe('thuyBinh');
      expect(s.raid.side).toBe(side);
      tick(s, RAID_WARNING_MS);
      expect(s.raid.battle?.hero?.kind).toBe('anDuong');
      fightRaid(s);
      const r = s.raid.lastResult!;
      expect(r.foe).toBe('thuyBinh');
      expect(r.killed, side).toBe(r.total);
      expect(r.won, side).toBe(true);
      expect(s.raid.thuyBinhHeld).toBe(1);
      s.questIndex = QUESTS.findIndex((q) => q.id === 'chongThuyBinh');
      expect(questProgress(s)).toEqual({ have: 1, need: 1 });
    }
  });
});

describe('lịch đợt chương 4', () => {
  it('vào chương 4 thì đợt thủy binh đầu tới sau 3 phút; thủy binh và lũ thay phiên nhau', () => {
    const s = ch4();
    s.questIndex = CH4_QUEST_START - 1;
    s.buildings.push({ id: s.nextId++, type: 'denCoLoa', x: 0, z: 0, level: 1, workers: 0 });
    s.raid.nextAt = s.clock + 10 * 60_000;
    s.raid.foe = 'trieu';
    expect(claimQuest(s).ok).toBe(true);
    expect(s.raid.nextAt! - s.clock).toBe(FIRST_THUY_BINH_MS);
    expect(nextFoe(s)).toBe('thuyBinh');
    s.raid.foe = 'thuyBinh';
    expect(nextFoe(s)).toBe('thuy');
    s.raid.foe = 'thuy';
    expect(nextFoe(s)).toBe('thuyBinh');
  });

  it('lẫy nỏ thần bị tráo: ba đợt thay phiên thủy binh → quân Triệu trên bộ → lũ; quân Triệu tới từ bìa rừng', () => {
    const s = ch4();
    s.adv.layTrao = true;
    s.raid.foe = 'thuy';
    expect(nextFoe(s)).toBe('thuyBinh');
    s.raid.foe = 'thuyBinh';
    expect(nextFoe(s)).toBe('trieu');
    s.raid.foe = 'trieu';
    expect(nextFoe(s)).toBe('thuy');
    s.raid.foe = 'thuyBinh';
    s.raid.wave = 0;
    expect(callRaidNow(s).ok).toBe(true);
    expect(s.raid.foe).toBe('trieu');
    expect(['bac', 'tay']).toContain(s.raid.side);
  });

  it('lẫy bị tráo thì giữ kinh đô An Dương Vương không còn Nỏ thần, phó bản màn 17–25 vẫn còn', () => {
    const s = ch4();
    s.adv.layTrao = true;
    s.raid.foe = 'thuy';
    expect(callRaidNow(s).ok).toBe(true);
    tick(s, RAID_WARNING_MS);
    const battle = s.raid.battle!;
    expect(battle.hero?.kind).toBe('anDuong');
    expect(battle.hero?.layTrao).toBe(true);
    expect(battle.skills).not.toContain('noThan');
    expect(battle.skills).toContain('ruaVang');
    // Phó bản dùng tướng như chương 3: đủ Nỏ thần.
    expect(heroSkills(heroFor(s, 3)!)).toContain('noThan');
  });
});

describe('truyện, nhiệm vụ và bản lưu chương 4', () => {
  it('đoạn "Cầu hôn" kể khi vào chương 4, sau "Triệu Đà thua chạy"', () => {
    const s = ch4();
    s.questIndex = CH4_QUEST_START - 1;
    expect(pendingStory(s)).toBeNull();
    s.questIndex = CH4_QUEST_START;
    expect(pendingStory(s)).toBe('cauHon');
  });

  it('nhiệm vụ 42–44: dựng 4 ụ nỏ, luyện 4 lính nỏ, đánh lui một đợt thủy binh', () => {
    const ids = QUESTS.map((q) => q.id);
    expect(ids.slice(CH4_QUEST_START, CH4_QUEST_START + 5)).toEqual(['dien8', 'lauNo', 'uNo', 'luyenNo', 'chongThuyBinh']);
    const s = ch4();
    s.questIndex = ids.indexOf('uNo');
    const wall = riverWall(s);
    for (let i = 0; i < 4; i++) placeUNo(s, wall[i].x, wall[i].z);
    expect(questProgress(s)).toEqual({ have: 4, need: 4 });
    s.questIndex = ids.indexOf('luyenNo');
    s.troops.no = 3;
    expect(questProgress(s)).toEqual({ have: 3, need: 4 });
    s.troops.no = 4;
    expect(questProgress(s)).toEqual({ have: 4, need: 4 });
  });

  it('nâng bản lưu 10 lên 11: thêm lính nỏ, bậc rèn, hàng đứng, đếm đợt thủy binh; ở chương 4 thì hẹn thủy binh', () => {
    const s = ch4();
    const wall = riverWall(s);
    placeUNo(s, wall[0].x, wall[0].z);
    expect(deserialize(serialize(s))).toEqual(s);
    const old = JSON.parse(serialize(s)) as Record<string, any>;
    old.version = 10;
    delete old.troops.no;
    delete old.arms.no;
    delete old.campaign.rows.no;
    delete old.adv.layTrao;
    delete old.raid.thuyBinh;
    delete old.raid.thuyBinhHeld;
    for (const b of old.buildings) delete b.uNo;
    old.raid.nextAt = old.clock + 10 * 60_000;
    const back = deserialize(JSON.stringify(old))!;
    expect(back.version).toBe(11);
    expect(back.troops.no).toBe(0);
    expect(back.arms.no).toBe(0);
    expect(back.campaign.rows.no).toBe('hau');
    expect(back.adv.layTrao).toBe(false);
    expect(back.raid.thuyBinh).toBe(0);
    expect(back.raid.nextAt! - back.clock).toBe(FIRST_THUY_BINH_MS);
    expect(nextFoe(back)).toBe('thuyBinh');
  });
});
