// Canh chương 4 phần 1: Điện và 7 loại công trình lên cấp 8, ghép hai chòi canh cấp 8 thành lầu nỏ.

import { describe, expect, it } from 'vitest';
import { startBattle, stepBattle } from './battle';
import { canMergeTowers, inChapter4, mergeTowers } from './chuong4';
import { BUILDINGS, CH3_QUEST_START, CH4_QUEST_START, LAU_NO, QUESTS, STORAGE_CAP, TOWER, type BuildingType } from './defs';
import {
  canPlace,
  canUpgrade,
  claimQuest,
  createInitialState,
  currentQuest,
  limitOf,
  place,
  remove,
  storageCap,
  upgrade,
  usedOf,
  type Building,
  type GameState,
} from './game';
import { AREA_SIZE, areaStart } from './map';
import { edge } from './testmap';
import { mauSlots, planMau } from './mau';
import { deserialize, serialize } from './save';

/** Kinh đô đã vào chương 4, Điện cấp 8, của nhiều. */
function capital8(): GameState {
  const s = createInitialState(0);
  s.questIndex = CH4_QUEST_START;
  s.buildings[0].level = 8;
  s.resources = { gao: 60000, voOc: 60000, datDa: 60000, sat: 60000 };
  s.dan = 40;
  return s;
}

/** Dựng chòi canh ở (x, z) rồi đặt thẳng lên cấp `level`. */
function tower(s: GameState, x: number, z: number, level = 8): Building {
  const r = place(s, 'choiCanh', x, z);
  if (!r.ok) throw new Error(r.reason);
  r.value.level = level;
  return r.value;
}

describe('Điện và công trình cấp 8', () => {
  it('Điện lên cấp 8 khi đã vào chương 4, rồi hết cấp', () => {
    const s = createInitialState(0);
    s.buildings[0].level = 7;
    s.resources = { gao: 60000, voOc: 60000, datDa: 60000, sat: 60000 };
    s.questIndex = CH3_QUEST_START;
    expect(inChapter4(s)).toBe(false);
    expect(canUpgrade(s, 1)).toEqual({ ok: false, reason: 'canChuong4' });
    s.questIndex = CH4_QUEST_START;
    expect(upgrade(s, 1).ok).toBe(true);
    expect(s.buildings[0].level).toBe(8);
    expect(canUpgrade(s, 1)).toEqual({ ok: false, reason: 'capToiDa' });
  });

  it('Điện cấp 8 mở thêm đất tới 45×45, kho rộng hơn', () => {
    expect(AREA_SIZE[7]).toBe(45);
    expect(areaStart(8)).toBeLessThan(areaStart(7));
    const s = capital8();
    expect(storageCap(s)).toBe(STORAGE_CAP[7]);
    expect(STORAGE_CAP[7]).toBe(32000);
  });

  it('bảy loại công trình lên được cấp 8 khi Điện đã cấp 8; số tối đa giữ như Điện 7', () => {
    const eight: BuildingType[] = ['ruong', 'ben', 'nhaSan', 'baiDa', 'loRen', 'kho', 'choiCanh'];
    for (const t of eight) expect(BUILDINGS[t].maxLevel, t).toBe(8);
    // Lầu nỏ chỉ có từ Điện 8 (ghép từ chòi canh), còn lại giữ như Điện 7.
    for (const def of Object.values(BUILDINGS)) if (def.type !== 'lauNo') expect(def.limit[7], def.type).toBe(def.limit[6]);
    const s = capital8();
    s.buildings[0].level = 7;
    const ruong = place(s, 'ruong', edge(7, 1), edge(7, 1));
    if (!ruong.ok) throw new Error(ruong.reason);
    ruong.value.level = 7;
    expect(canUpgrade(s, ruong.value.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    s.buildings[0].level = 8;
    expect(upgrade(s, ruong.value.id).ok).toBe(true);
    expect(ruong.value.level).toBe(8);
    // Số liệu đã duyệt.
    expect(BUILDINGS.ruong.production[7]).toEqual({ gao: 260 });
    expect(BUILDINGS.ben.production[7]).toEqual({ voOc: 260 });
    expect(BUILDINGS.baiDa.production[7]).toEqual({ datDa: 255 });
    expect(BUILDINGS.loRen.production[7]).toEqual({ sat: 70 });
    expect(BUILDINGS.nhaSan.housing![7]).toBe(18);
    expect(BUILDINGS.kho.storage![7]).toBe(13000);
    expect(TOWER.dmg[7]).toBe(37);
    // Ở Điện 8, kho tối đa khoảng 84000 mỗi loại.
    expect(STORAGE_CAP[7] + 4 * BUILDINGS.kho.storage![7]).toBe(84000);
  });

  it('nhiệm vụ 40, 41: lên Điện 8 rồi ghép một lầu nỏ', () => {
    expect(QUESTS[CH4_QUEST_START].id).toBe('dien8');
    expect(QUESTS[CH4_QUEST_START + 1].id).toBe('lauNo');
    const s = capital8();
    s.buildings[0].level = 7;
    expect(currentQuest(s)?.id).toBe('dien8');
    expect(claimQuest(s).ok).toBe(false);
    upgrade(s, 1);
    expect(claimQuest(s).ok).toBe(true);
    expect(currentQuest(s)?.id).toBe('lauNo');
    const a = tower(s, 10, 10);
    const b = tower(s, 12, 10);
    expect(mergeTowers(s, a.id, b.id).ok).toBe(true);
    expect(claimQuest(s).ok).toBe(true);
  });
});

describe('lầu nỏ', () => {
  it('ghép hai chòi canh cấp 8 còn nguyên, ở Điện 8, trả giá ghép', () => {
    const s = capital8();
    const a = tower(s, 10, 10);
    const b = tower(s, 12, 10);
    const low = tower(s, 14, 10, 7);
    expect(canMergeTowers(s, a.id, a.id)).toEqual({ ok: false, reason: 'khongGhepDuoc' });
    expect(canMergeTowers(s, a.id, low.id)).toEqual({ ok: false, reason: 'khongGhepDuoc' });
    b.damaged = true;
    expect(canMergeTowers(s, a.id, b.id)).toEqual({ ok: false, reason: 'khongGhepDuoc' });
    b.damaged = false;
    s.raid.phase = 'warning';
    expect(canMergeTowers(s, a.id, b.id)).toEqual({ ok: false, reason: 'dangCoGiac' });
    s.raid.phase = 'idle';
    s.buildings[0].level = 7;
    expect(canMergeTowers(s, a.id, b.id)).toEqual({ ok: false, reason: 'chuaDuCapDien' });
    s.buildings[0].level = 8;
    const before = { ...s.resources };
    const r = mergeTowers(s, a.id, b.id);
    expect(r.ok).toBe(true);
    // Lầu nỏ đứng ở chỗ chòi thứ nhất, chòi thứ hai biến mất.
    const lau = s.buildings.find((o) => o.id === a.id)!;
    expect(lau).toMatchObject({ type: 'lauNo', x: 10, z: 10, level: 1 });
    expect(s.buildings.some((o) => o.id === b.id)).toBe(false);
    const cost = BUILDINGS.lauNo.buildCost;
    expect(s.resources.voOc).toBe(before.voOc - cost.voOc!);
    expect(s.resources.sat).toBe(before.sat - cost.sat!);
    // Không tách lại, không lên cấp, không dỡ được.
    expect(canUpgrade(s, lau.id)).toEqual({ ok: false, reason: 'capToiDa' });
    expect(remove(s, lau.id).ok).toBe(false);
    expect(canPlace(s, 'lauNo', 20, 20).ok).toBe(false);
  });

  it('mỗi lầu nỏ tính là hai chòi canh trong số tối đa', () => {
    const s = capital8();
    const max = limitOf(s, 'choiCanh');
    expect(max).toBe(7);
    const towers = Array.from({ length: max }, (_, i) => tower(s, edge(8, 1) + 2 * i, edge(8, 3)));
    expect(usedOf(s, 'choiCanh')).toBe(7);
    mergeTowers(s, towers[0].id, towers[1].id);
    mergeTowers(s, towers[2].id, towers[3].id);
    mergeTowers(s, towers[4].id, towers[5].id);
    // Ba lầu nỏ và một chòi canh: đã đủ bảy, không dựng thêm chòi canh được.
    expect(usedOf(s, 'choiCanh')).toBe(7);
    expect(canPlace(s, 'choiCanh', 20, 20)).toEqual({ ok: false, reason: 'datGioiHan' });
  });

  it('mỗi phát bắn ba giặc gần nhất trong tầm, mỗi mũi một tên', () => {
    const s = capital8();
    const a = tower(s, 14, 10);
    const b = tower(s, 16, 10);
    mergeTowers(s, a.id, b.id);
    const battle = startBattle(s, 4, 'bac');
    const foes = battle.fighters.filter((f) => f.side === 'giac').slice(0, 4);
    expect(foes.length).toBe(4);
    // Bốn giặc đứng trong tầm lầu nỏ (ở ô 14, 10), đứng yên, chưa tới lượt đánh.
    foes.forEach((f, i) => {
      f.x = 14.5 + 1 + i * 0.3;
      f.z = 10.5;
      f.state = 'move';
      f.cd = 99;
    });
    for (const f of battle.fighters) if (f.side === 'giac' && !foes.includes(f)) f.state = 'gone';
    const hp = foes.map((f) => f.hp);
    stepBattle(s, battle, 0.01);
    const lost = foes.map((f, i) => hp[i] - f.hp);
    expect(lost.slice(0, 3).every((d) => Math.abs(d - LAU_NO.dmg) < 1e-6)).toBe(true);
    expect(lost[3]).toBe(0);
  });

  it('áp mẫu: lầu nỏ đứng vào chỗ chòi canh của mẫu, chỗ còn lại dựng thêm chòi canh tới đủ bảy', () => {
    const s = capital8();
    s.questIndex = CH4_QUEST_START;
    const a = tower(s, edge(8, 1), edge(8, 1));
    const b = tower(s, edge(8, 3), edge(8, 1));
    mergeTowers(s, a.id, b.id);
    const plan = planMau(s, 'coLoa');
    expect(plan.stuck).toEqual([]);
    const builds = plan.builds.filter((x) => x.type === 'choiCanh').length;
    expect(builds).toBe(limitOf(s, 'choiCanh') - 2);
    const move = plan.moves.find((m) => m.id === a.id)!;
    expect(move).toBeDefined();
    const slots = mauSlots('coLoa').filter((x) => x.type === 'choiCanh');
    expect(slots.some((x) => x.x === move.x && x.z === move.z)).toBe(true);
  });

  it('bản lưu phiên bản 9 được nâng lên 10; lưu và nạp lại giữ lầu nỏ', () => {
    const s = capital8();
    const a = tower(s, 10, 10);
    const b = tower(s, 12, 10);
    mergeTowers(s, a.id, b.id);
    expect(deserialize(serialize(s))).toEqual(s);
    const old = createInitialState(0) as unknown as Record<string, unknown>;
    old.version = 9;
    const back = deserialize(JSON.stringify(old))!;
    expect(back.version).toBe(10);
  });
});
