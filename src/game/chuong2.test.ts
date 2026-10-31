import { describe, expect, it } from 'vitest';
import { heroOf, skillReady, startBattle, startFieldBattle, stepField, useSkill, type HeroSetup } from './battle';
import { canStartStage, startStage } from './campaign';
import {
  CH2_QUEST_START,
  DEFAULT_ROWS,
  FIELD,
  FIRST_FLOOD_MS,
  GIFT_IDS,
  HILL,
  MAX_HEIGHT,
  QUESTS,
  RAID_WARNING_MS,
  ROCKS,
  SKILL_IDS,
  UNITS,
  floodLevel,
  type UnitType,
} from './defs';
import {
  callRaidNow,
  canPlace,
  canRaiseTile,
  createInitialState,
  place,
  questProgress,
  raiseBuilding,
  raiseTile,
  tick,
  type GameState,
} from './game';
import { GRID, RIVER_START, baseHeights } from './map';
import { deserialize, serialize } from './save';
import { HALF_ARMY, SAMPLE_ARMY, SEEDS, fightStage } from './testkit';
import { canOffer, heroFor, offerGift, sonJoined } from './son';
import { markStory, pendingStory } from './story';
import { drowns, floodMap, groundOf, tileHeight } from './terrain';

type Army = Record<UnitType, number>;
const ARMY: Army = { giao: 14, cung: 12, voi: 4 };

/** Kinh đô vừa sang chương 2: Điện cấp 5, doanh trại cấp 5 đủ quân, Gióng đã bay về trời. */
function ch2(): GameState {
  const s = createInitialState(0);
  s.buildings[0].level = 5;
  s.resources = { gao: 8000, voOc: 8000, datDa: 8000, sat: 3000 };
  s.dan = 40;
  s.questIndex = CH2_QUEST_START;
  s.giong = { fed: 5, gear: { ngua: true, roi: true, giap: true }, whipBroken: true, restUntil: 0, ascended: true };
  s.campaign.cleared = 8;
  const barracks = place(s, 'doanhTrai', 6, 6);
  if (!barracks.ok) throw new Error(barracks.reason);
  barracks.value.level = 5;
  // Chương 1 kết thúc bằng việc dựng Đền Phù Đổng.
  if (!place(s, 'denPhuDong', 10, 6).ok) throw new Error('dựng đền thử thất bại');
  s.troops = { ...ARMY };
  return s;
}

/** Đã đủ năm lễ vật: Sơn Tinh rước Mị Nương. */
function wed(s = ch2()): GameState {
  for (const g of GIFT_IDS) s.son.gifts[g] = true;
  return s;
}

/** Chỗ móng `w`×`d` nằm gọn trên những ô cùng bậc `h`, trong vùng đã mở. */
function flatSpot(s: GameState, w: number, d: number, h: number, zMax = RIVER_START): { x: number; z: number } {
  for (let z = 3; z + d <= zMax; z++) {
    for (let x = 3; x + w <= RIVER_START; x++) {
      let flat = true;
      for (let dx = 0; dx < w && flat; dx++) for (let dz = 0; dz < d && flat; dz++) flat = tileHeight(s, x + dx, z + dz) === h;
      if (flat && canPlace(s, 'ruong', x, z).ok) return { x, z };
    }
  }
  throw new Error('không có chỗ phẳng');
}

describe('độ cao ô đất', () => {
  it('sông thấp nhất, hai ô sát sông là bãi bồi bậc 0, càng xa sông càng cao', () => {
    const h = baseHeights();
    expect(h[28 * GRID + 10]).toBe(-1);
    expect(h[26 * GRID + 10]).toBe(0);
    expect(h[25 * GRID + 10]).toBe(0);
    expect(h[10 * GRID + 26]).toBe(0);
    const avg = (z0: number, z1: number) => {
      let sum = 0;
      let n = 0;
      for (let z = z0; z < z1; z++) for (let x = 3; x < 24; x++) (sum += h[z * GRID + x]), n++;
      return sum / n;
    };
    expect(avg(3, 9)).toBeGreaterThan(avg(18, 25));
    expect(Math.max(...h)).toBeLessThanOrEqual(3);
  });

  it('dựng công trình thì móng được đắp phẳng bằng chỗ cao nhất', () => {
    const s = ch2();
    // Tìm chỗ 3×3 có cả bậc 1 lẫn bậc 2.
    let spot: { x: number; z: number } | null = null;
    for (let z = 3; z < 24 && !spot; z++) {
      for (let x = 3; x < 24 && !spot; x++) {
        const hs = new Set<number>();
        for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) hs.add(tileHeight(s, x + dx, z + dz));
        if (hs.has(1) && hs.has(2) && hs.size === 2 && canPlace(s, 'ruong', x, z).ok) spot = { x, z };
      }
    }
    expect(spot).not.toBeNull();
    const r = place(s, 'ruong', spot!.x, spot!.z);
    expect(r.ok).toBe(true);
    for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) expect(tileHeight(s, spot!.x + dx, spot!.z + dz)).toBe(2);
    // Điện có sẵn cũng đứng trên móng phẳng.
    const dien = s.buildings[0];
    expect(tileHeight(s, dien.x + 3, dien.z + 3)).toBe(groundOf(s, dien));
  });

  it('đắp đất: chỉ từ chương 2, ô trống đã khai phá, tốn đất đá, cao nhất bậc 4', () => {
    const s = ch2();
    const spot = flatSpot(s, 1, 1, 1);
    s.questIndex = CH2_QUEST_START - 1;
    expect(canRaiseTile(s, spot.x, spot.z)).toEqual({ ok: false, reason: 'canChuong2' });
    s.questIndex = CH2_QUEST_START;
    const before = s.resources.datDa;
    expect(raiseTile(s, spot.x, spot.z)).toEqual({ ok: true, value: 2 });
    expect(s.resources.datDa).toBe(before - 30);
    raiseTile(s, spot.x, spot.z);
    raiseTile(s, spot.x, spot.z);
    expect(tileHeight(s, spot.x, spot.z)).toBe(MAX_HEIGHT);
    expect(canRaiseTile(s, spot.x, spot.z)).toEqual({ ok: false, reason: 'datCaoNhat' });
    expect(canRaiseTile(s, 1, 1)).toEqual({ ok: false, reason: 'ngoaiVung' });
    const dien = s.buildings[0];
    expect(canRaiseTile(s, dien.x, dien.z)).toEqual({ ok: false, reason: 'datBiChiem' });
  });

  it('đắp nền: cả công trình cao thêm một bậc; lũy, bẫy, đê thì không', () => {
    const s = ch2();
    const spot = flatSpot(s, 3, 3, 1);
    const ruong = place(s, 'ruong', spot.x, spot.z);
    if (!ruong.ok) throw new Error(ruong.reason);
    expect(raiseBuilding(s, ruong.value.id).ok).toBe(true);
    expect(groundOf(s, ruong.value)).toBe(2);
    const wallSpot = flatSpot(s, 1, 1, 1);
    const de = place(s, 'de', wallSpot.x, wallSpot.z);
    if (!de.ok) throw new Error(de.reason);
    expect(raiseBuilding(s, de.value.id)).toEqual({ ok: false, reason: 'khongDapNen' });
  });

  it('đê chỉ đắp được từ chương 2', () => {
    const s = ch2();
    s.questIndex = 3;
    expect(canPlace(s, 'de', 10, 10)).toEqual({ ok: false, reason: 'canChuong2' });
  });
});

describe('nước lũ', () => {
  it('lũ bậc 1 chỉ ngập bãi bồi ven sông, bậc 2 ngập cả đồng bằng; rừng chưa phát không ngập', () => {
    const s = ch2();
    const one = floodMap(s, 1, 5);
    const two = floodMap(s, 2, 5);
    let low = 0;
    let plain = 0;
    for (let z = 0; z < RIVER_START; z++) {
      for (let x = 0; x < RIVER_START; x++) {
        const i = z * GRID + x;
        const h = s.heights[i];
        if (one[i]) {
          expect(h).toBe(0);
          low++;
        }
        if (two[i] && h === 1) plain++;
        if (x < 3 || z < 3) expect(two[i]).toBe(0);
      }
    }
    expect(low).toBeGreaterThan(40);
    expect(plain).toBeGreaterThan(40);
  });

  it('đê liền một dải chặn được nước, hở một chỗ thì nước tràn vào', () => {
    const s = ch2();
    s.buildings[0].level = 1;
    // Vùng Điện cấp 1 là các ô 11..26: đắp đê dọc hàng z = 25 và cột x = 25.
    for (let x = 11; x <= 25; x++) expect(place(s, 'de', x, 25).ok).toBe(true);
    for (let z = 11; z <= 24; z++) expect(place(s, 'de', 25, z).ok).toBe(true);
    const sealed = floodMap(s, 2, 1);
    for (let z = 11; z <= 24; z++) for (let x = 11; x <= 24; x++) expect(sealed[z * GRID + x]).toBe(0);
    // Thủy quái phá vỡ một đoạn đê.
    s.buildings.find((b) => b.type === 'de' && b.x === 15)!.damaged = true;
    const breach = floodMap(s, 2, 1);
    let inside = 0;
    for (let z = 11; z <= 24; z++) for (let x = 11; x <= 24; x++) inside += breach[z * GRID + x];
    expect(inside).toBeGreaterThan(5);
  });

  it('công trình ngập thì hư; Điện, nhà sàn, kho chịu được 1 bậc; bến không sợ nước', () => {
    const s = ch2();
    const baiDa = place(s, 'baiDa', 8, 25);
    const nhaSan = place(s, 'nhaSan', 11, 25);
    const ben = place(s, 'ben', 14, 25);
    if (!baiDa.ok || !nhaSan.ok || !ben.ok) throw new Error('dựng thử thất bại');
    const wet1 = floodMap(s, 1, 5);
    expect(drowns(s, baiDa.value, wet1, 1)).toBe(true);
    expect(drowns(s, nhaSan.value, wet1, 1)).toBe(false);
    expect(drowns(s, ben.value, wet1, 1)).toBe(false);
    const wet2 = floodMap(s, 2, 5);
    expect(drowns(s, nhaSan.value, wet2, 2)).toBe(true);
    expect(drowns(s, ben.value, wet2, 3)).toBe(false);
    // Đắp nền lên bậc 1 thì bãi đất đá thoát lũ bậc 1.
    raiseBuilding(s, baiDa.value.id);
    expect(drowns(s, baiDa.value, floodMap(s, 1, 5), 1)).toBe(false);
  });

  it('lũ dâng cao dần qua các mùa; Đền Tản Viên làm lũ thấp đi một bậc', () => {
    expect([1, 2, 3, 4, 5, 9].map((n) => floodLevel(n, false))).toEqual([1, 1, 2, 2, 3, 3]);
    expect([1, 3, 5].map((n) => floodLevel(n, true))).toEqual([1, 1, 2]);
  });
});

describe('mùa lũ ở kinh đô', () => {
  it('sang chương 2, giặc Ân thôi tới; đủ lễ vật thì ít phút sau mùa lũ đầu tiên tới', () => {
    const s = ch2();
    tick(s, 1000);
    const nextAt = s.raid.nextAt!;
    tick(s, 20 * 60_000);
    expect(s.raid.phase).toBe('idle');
    expect(s.raid.nextAt).toBeGreaterThan(nextAt);
    expect(callRaidNow(s)).toEqual({ ok: false, reason: 'canSonTinh' });
    for (const g of GIFT_IDS.slice(0, 4)) s.son.gifts[g] = true;
    expect(offerGift(s, 'ngua9HongMao')).toEqual({ ok: false, reason: 'leVatPhoBan' });
    s.son.gifts.banhChung = false;
    expect(offerGift(s, 'banhChung').ok).toBe(true);
    expect(sonJoined(s)).toBe(false);
    s.son.gifts.ngua9HongMao = false;
    // Lễ vật cuối cùng tới từ phó bản (màn 10): đám cưới đặt lịch lũ.
    s.campaign.cleared = 9;
    const r = startStage(s, 10, ARMY, DEFAULT_ROWS);
    expect(r.ok).toBe(true);
    for (let i = 0; i < 200 && !s.campaign.lastResult; i++) {
      for (const k of SKILL_IDS) if (s.campaign.battle!.t > 3) useSkill(s.campaign.battle!, k);
      tick(s, 250);
    }
    expect(s.campaign.lastResult?.outcome).toBe('win');
    expect(s.campaign.lastResult?.gift).toBe('ngua9HongMao');
    expect(sonJoined(s)).toBe(true);
    expect(s.raid.nextAt! - s.clock).toBeLessThanOrEqual(FIRST_FLOOD_MS + 1000);
    s.campaign.battle = null;
    s.campaign.lastResult = null;
    tick(s, FIRST_FLOOD_MS + 1000);
    expect(s.raid.phase).toBe('warning');
    expect(s.raid.foe).toBe('thuy');
    expect(['nam', 'dong']).toContain(s.raid.side);
  });

  it('thủy quái ngoi lên từ sông, nước dâng dần tới mực lũ, Sơn Tinh ra trận từ trước Điện', () => {
    const s = wed();
    expect(callRaidNow(s).ok).toBe(true);
    tick(s, RAID_WARNING_MS);
    const battle = s.raid.battle!;
    expect(battle.swim).toBe(true);
    expect(battle.floodTo).toBe(1);
    expect(battle.hero?.kind).toBe('sonTinh');
    for (const f of battle.fighters.filter((f) => f.side === 'giac')) expect(Math.max(f.x, f.z)).toBeGreaterThan(RIVER_START);
    tick(s, 3000);
    expect(s.raid.water).toBeGreaterThan(0.3);
    expect(s.raid.water).toBeLessThan(1);
    tick(s, 4000);
    expect(s.raid.battle?.water ?? s.raid.water).toBeCloseTo(1, 1);
  });

  it('giữ được mùa lũ: diệt hết thủy quái, không công trình nào ngập; công trình trên bãi bồi thì hư', () => {
    const s = wed();
    for (let i = 0; i < 5; i++) place(s, 'choiCanh', 14 + i * 2, 22);
    callRaidNow(s);
    tick(s, RAID_WARNING_MS);
    for (let i = 0; i < 400 && s.raid.phase === 'battle'; i++) tick(s, 500);
    const r = s.raid.lastResult!;
    expect(r.flood).toBeCloseTo(1, 1);
    expect(r.won).toBe(true);
    expect(r.drowned).toEqual([]);
    expect(s.raid.floodsHeld).toBe(1);
    expect(s.raid.floods).toBe(1);
    // Mùa sau: dựng bãi đất đá ngay trên bãi bồi thì bị nước làm hư.
    const baiDa = place(s, 'baiDa', 8, 25);
    if (!baiDa.ok) throw new Error(baiDa.reason);
    s.troops = { ...ARMY };
    callRaidNow(s);
    tick(s, RAID_WARNING_MS);
    for (let i = 0; i < 400 && s.raid.phase === 'battle'; i++) tick(s, 500);
    expect(s.raid.lastResult?.drowned).toContain(baiDa.value.id);
    expect(baiDa.value.damaged).toBe(true);
    expect(s.raid.floodsHeld).toBe(1);
  });

  it('đê liền một dải, chòi canh sát đê và Sơn Tinh chặn được lũ bậc 3, không công trình nào ngập', () => {
    const s = wed();
    for (let x = 3; x <= 24; x++) place(s, 'de', x, 24);
    for (let z = 3; z <= 23; z++) place(s, 'de', 24, z);
    for (const [x, z] of [[8, 22], [12, 22], [17, 22], [21, 22], [22, 15]]) place(s, 'choiCanh', x, z);
    s.raid.floods = 4;
    callRaidNow(s);
    tick(s, RAID_WARNING_MS);
    const battle = s.raid.battle!;
    expect(battle.floodTo).toBe(3);
    for (let i = 0; i < 1600 && s.raid.phase === 'battle'; i++) {
      if (battle.t > 2) for (const k of SKILL_IDS) useSkill(battle, k);
      tick(s, 125);
    }
    expect(s.raid.lastResult?.flood).toBeCloseTo(3, 1);
    expect(s.raid.lastResult?.drowned).toEqual([]);
    expect(s.buildings.filter((b) => b.type === 'de' && b.damaged)).toEqual([]);
  });

  it('nhiệm vụ đếm lễ vật và mùa lũ giữ được', () => {
    const s = ch2();
    s.questIndex = QUESTS.findIndex((q) => q.id === 'duLeVat');
    s.son.gifts.comNep = true;
    expect(questProgress(s)).toEqual({ have: 1, need: 5 });
    s.questIndex = QUESTS.findIndex((q) => q.id === 'chongLu');
    s.raid.floodsHeld = 1;
    expect(questProgress(s)).toEqual({ have: 1, need: 1 });
  });
});

describe('Sơn Tinh', () => {
  const SON: HeroSetup = { kind: 'sonTinh', bamboo: false, glow: false, non: false };

  it('lễ vật làm ở kinh đô thì dâng bằng gạo; voi, gà, ngựa phải giành ở phó bản', () => {
    const s = ch2();
    s.questIndex = 5;
    expect(canOffer(s, 'comNep')).toEqual({ ok: false, reason: 'canChuong2' });
    s.questIndex = CH2_QUEST_START;
    const gao = s.resources.gao;
    expect(offerGift(s, 'comNep').ok).toBe(true);
    expect(s.resources.gao).toBe(gao - 900);
    expect(canOffer(s, 'comNep')).toEqual({ ok: false, reason: 'daCoLeVat' });
    expect(canOffer(s, 'voi9Nga')).toEqual({ ok: false, reason: 'leVatPhoBan' });
  });

  it('chưa rước Mị Nương thì trận chương 2 có Gióng hiển linh; rước rồi thì có Sơn Tinh', () => {
    const s = ch2();
    expect(heroFor(s, 2)?.kind).toBe('giong');
    s.campaign.cleared = 11;
    expect(canStartStage(s, 12)).toEqual({ ok: false, reason: 'canSonTinh' });
    wed(s);
    expect(heroFor(s, 2)).toEqual({ kind: 'sonTinh', bamboo: false, glow: false, non: false });
    expect(heroFor(s, 1)?.kind).toBe('giong');
    expect(canStartStage(s, 12).ok).toBe(true);
  });

  it('Bốc đồi ném xuống chỗ giặc đứng đông nhất', () => {
    const b = startFieldBattle({ id: 1, stage: 9, enemies: { tomBinh: 5 }, hpScale: 1, army: { giao: 0, cung: 0, voi: 0 }, rows: DEFAULT_ROWS, hero: SON });
    const foes = b.fighters.filter((f) => f.side === 'giac');
    // Bốn tên đứng chụm, một tên đứng lẻ gần Sơn Tinh hơn.
    foes.forEach((f, i) => {
      f.x = 2 + (i % 2) * 0.6;
      f.z = 3 + Math.floor(i / 2) * 0.6;
    });
    const hero = heroOf(b)!;
    foes[4].x = hero.x;
    foes[4].z = hero.z - 3;
    expect(b.skills).toEqual(['trongTran', 'bocDoi']);
    expect(useSkill(b, 'bocDoi')).toBe(true);
    for (const f of foes.slice(0, 4)) expect(f.hp).toBeLessThanOrEqual(f.maxHp - HILL.dmg * FIELD.hpMul + 1e-6);
    expect(foes[4].hp).toBe(foes[4].maxHp);
    expect(b.events.some((e) => e.kind === 'hill')).toBe(true);
  });

  it('Dời non giữ chân giặc quanh Sơn Tinh: đứng yên, không đánh được vài giây', () => {
    const b = startFieldBattle({ id: 1, stage: 9, enemies: { tomBinh: 2 }, hpScale: 3, army: { giao: 0, cung: 0, voi: 0 }, rows: DEFAULT_ROWS, hero: { ...SON, non: true } });
    const hero = heroOf(b)!;
    const [near, far] = b.fighters.filter((f) => f.side === 'giac');
    near.x = hero.x + 0.8;
    near.z = hero.z;
    far.x = hero.x;
    far.z = hero.z - 8;
    expect(skillReady(b, 'doiNon')).toBe(true);
    expect(useSkill(b, 'doiNon')).toBe(true);
    expect(near.stun).toBe(ROCKS.stun);
    expect(far.stun ?? 0).toBe(0);
    const pos = { x: near.x, z: near.z };
    const heroHp = hero.hp;
    hero.x += 3;
    stepField(b, 0.5);
    expect(near.x).toBeCloseTo(pos.x, 1);
    expect(hero.hp).toBe(heroHp);
  });

  it('thắng màn 9 lần đầu được gà chín cựa; thắng màn 14 thì Sơn Tinh dời được non; thắng màn 16 thì kết chương', () => {
    const s = wed();
    for (const g of GIFT_IDS) s.son.gifts[g] = g !== 'ga9Cua';
    const win = (n: number) => {
      s.campaign.cleared = n - 1;
      s.troops = { ...ARMY };
      const r = startStage(s, n, ARMY, DEFAULT_ROWS);
      if (!r.ok) throw new Error(r.reason);
      for (let i = 0; i < 400 && !s.campaign.lastResult; i++) {
        for (const k of SKILL_IDS) if (s.campaign.battle!.t > 3) useSkill(s.campaign.battle!, k);
        tick(s, 250);
      }
      const result = s.campaign.lastResult!;
      s.campaign.battle = null;
      s.campaign.lastResult = null;
      s.son.restUntil = 0;
      return result;
    };
    s.raid.nextAt = null;
    const r9 = win(9);
    expect(r9.outcome).toBe('win');
    expect(r9.gift).toBe('ga9Cua');
    expect(s.son.gifts.ga9Cua).toBe(true);
    s.raid.nextAt = null;
    expect(win(14).outcome).toBe('win');
    expect(s.son.non).toBe(true);
    expect(heroFor(s, 2)?.non).toBe(true);
    expect(canPlace(s, 'denTanVien', 3, 12)).toEqual({ ok: false, reason: 'canKetChuong2' });
    s.raid.nextAt = null;
    expect(win(16).outcome).toBe('win');
    expect(s.son.won).toBe(true);
    expect(canPlace(s, 'denTanVien', 3, 12).ok).toBe(true);
  });
});

describe('cân bằng phó bản chương 2', () => {
  const GIONG: HeroSetup = { kind: 'giong', bamboo: true, glow: true, non: false };
  const sonFor = (n: number): HeroSetup => ({ kind: 'sonTinh', bamboo: false, glow: false, non: n > 14 });

  it('quân mẫu chương 2 vừa doanh trại cấp 5', () => {
    const space = (Object.keys(ARMY) as UnitType[]).reduce((n, k) => n + ARMY[k] * UNITS[k].space, 0);
    expect(space).toBeLessThanOrEqual(38);
  });

  for (const n of [9, 10, 11, 12, 13, 14, 15, 16]) {
    const hero = n <= 11 ? GIONG : sonFor(n);
    it(`màn ${n}: người chơi thường có ${n <= 11 ? 'Gióng hiển linh' : 'Sơn Tinh'} thì thắng; không tướng, hay nửa quân, chơi giỏi cũng thua`, () => {
      for (const id of SEEDS) {
        const won = fightStage(n, SAMPLE_ARMY, hero, 'thuong', id);
        expect(won.outcome).toBe('win');
        expect(won.t).toBeLessThan(FIELD.maxS);
        expect(fightStage(n, SAMPLE_ARMY, null, 'gioi', id).outcome).toBe('lose');
        expect(fightStage(n, HALF_ARMY, hero, 'gioi', id).outcome).toBe('lose');
      }
    });
  }
  it('Thủy Tinh cần bấm kỹ năng mới thắng', () => {
    for (const id of SEEDS) expect(fightStage(16, SAMPLE_ARMY, sonFor(16), 'khongBam', id).outcome).toBe('lose');
  });
  it('mùa lũ thứ 4 (nước bậc 2): quân mẫu cùng Sơn Tinh và 5 chòi canh giữ được', () => {
    const s = wed();
    s.raid.floods = 3;
    for (let i = 0; i < 5; i++) place(s, 'choiCanh', 14 + i * 2, 22);
    const battle = startBattle(s, 10, 'nam', { hero: heroFor(s, 2), bonus: 0.1, flood: { n: 4, level: 2 } });
    s.raid.phase = 'battle';
    s.raid.battle = battle;
    for (let i = 0; i < 400 && s.raid.phase === 'battle'; i++) {
      if (battle.t > 3) for (const k of SKILL_IDS) useSkill(battle, k);
      tick(s, 500);
    }
    expect(s.raid.lastResult?.killed).toBe(s.raid.lastResult?.total);
  });
});

describe('truyện và lưu game chương 2', () => {
  it('kể các đoạn chương 2 đúng thứ tự sau chương 1', () => {
    const s = ch2();
    for (const id of ['mo', 'suGia', 'vuonVai', 'roiGay', 'ketChuong'] as const) markStory(s, id);
    // Chuyện Lang Liêu (Hội Tết) kể ngay sau kết chương 1, trước "Vua Hùng kén rể".
    expect(pendingStory(s)).toBe('langLieu');
    markStory(s, 'langLieu');
    expect(pendingStory(s)).toBe('kenRe');
    markStory(s, 'kenRe');
    expect(pendingStory(s)).toBeNull();
    wed(s);
    expect(pendingStory(s)).toBe('ruocDau');
    markStory(s, 'ruocDau');
    s.son.non = true;
    s.son.won = true;
    expect(pendingStory(s)).toBe('doiNon');
    markStory(s, 'doiNon');
    expect(pendingStory(s)).toBe('ketChuong2');
  });

  it('lưu và nạp lại giữ nguyên độ cao, đê, Sơn Tinh', () => {
    const s = wed();
    raiseTile(s, 10, 20);
    place(s, 'de', 12, 24);
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('nâng bản lưu lát cắt 3b: thêm độ cao ô đất, đắp móng công trình cũ, thêm Sơn Tinh', () => {
    const s5 = createInitialState(5) as unknown as Record<string, unknown>;
    s5.version = 5;
    delete s5.heights;
    delete s5.son;
    const raid = s5.raid as Record<string, unknown>;
    for (const k of ['foe', 'floods', 'floodsHeld', 'water']) delete raid[k];
    const back = deserialize(JSON.stringify(s5))!;
    expect(back.version).toBe(9);
    expect(back.heights.length).toBe(GRID * GRID);
    expect(back.son.gifts.comNep).toBe(false);
    expect(back.raid.foe).toBe('an');
    const dien = back.buildings[0];
    expect(tileHeight(back, dien.x, dien.z)).toBe(tileHeight(back, dien.x + 3, dien.z + 3));
  });
});
