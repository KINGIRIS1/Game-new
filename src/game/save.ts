// Lưu game vào localStorage và xuất/nhập mã lưu để sao lưu hoặc chuyển máy.
// Bản lưu cũ (phiên bản 1 của lát cắt 1, 2 của lát cắt 2a, 3 của lát cắt 2b, 4 của lát cắt 3a,
// 5 của lát cắt 3b, 6 của chương 2, 7 của chương 3, 8 của cấp 6–7, 9 của Hội Tết, 10 của cấp 8) được nâng lên
// phiên bản hiện tại khi nạp.

import { BUILDINGS, GEAR_IDS, GIFT_IDS, MERCHANT_FIRST_MS, QUEST_INSERTED_V4, RESOURCE_IDS, ROWS, UNIT_TYPES, type BuildingType } from './defs';
import { initialAdv } from './coLoa';
import { inChapter4 } from './chuong4';
import { autoAssign, housing, initialCampaign, initialGiong, initialRaid, scheduleThuyBinh, type GameState } from './game';
import { GRID, baseHeights } from './map';
import { initialSon } from './son';
import { initialTet } from './tet';
import { footprintTop, levelFootprint } from './terrain';

/** Giữ nguyên khóa cũ để người chơi lát cắt 1 không mất tiến trình. */
export const SAVE_KEY = 'thoi-dai-van-lang/save/v1';
const CODE_PREFIX = 'TDVL1:';

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

/** Đọc lại state từ JSON. Trả về undefined nếu dữ liệu hỏng hoặc sai phiên bản. */
export function deserialize(json: string): GameState | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return undefined;
  }
  const upgraded = migrate(raw);
  return isGameState(upgraded) ? upgraded : undefined;
}

type Raw = Record<string, unknown>;

const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Nâng dần bản lưu cũ lên phiên bản hiện tại. */
function migrate(raw: unknown): unknown {
  let v = raw;
  if (isObj(v) && v.version === 1 && Array.isArray(v.buildings)) v = migrate1to2(v);
  if (isObj(v) && v.version === 2) v = migrate2to3(v);
  if (isObj(v) && v.version === 3) v = migrate3to4(v);
  if (isObj(v) && v.version === 4) v = migrate4to5(v);
  if (isObj(v) && v.version === 5) v = migrate5to6(v);
  if (isObj(v) && v.version === 6) v = migrate6to7(v);
  if (isObj(v) && v.version === 7) v = migrate7to8(v);
  if (isObj(v) && v.version === 8) v = migrate8to9(v);
  if (isObj(v) && v.version === 9) v = migrate9to10(v);
  if (isObj(v) && v.version === 10) v = migrate10to11(v);
  return v;
}

/** Phiên bản 1 → 2 (lát cắt 2a): thêm dân, người làm, đồng hồ chơi và thuyền buôn. */
function migrate1to2(s: Raw): Raw {
  for (const b of s.buildings as Raw[]) b.workers = 0;
  s.version = 2;
  s.clock = 0;
  s.danProgress = 0;
  s.merchant = { nextAt: MERCHANT_FIRST_MS, visit: null, seq: 0 };
  if (!isValidBuildings(s.buildings)) return s;
  // Người chơi cũ đã có ruộng, bến đang làm ăn: cho đủ dân ở và chia vào làm ngay.
  // Phần quân đội thêm sớm ở đây để tính được gạo ăn; bước 2 → 3 đặt lại y như vậy.
  s.troops = { giao: 0, cung: 0, voi: 0 };
  const state = s as unknown as GameState;
  state.dan = housing(state);
  autoAssign(state);
  return s;
}

/** Phiên bản 2 → 3 (lát cắt 2b): thêm quân đội và lịch giặc. */
function migrate2to3(s: Raw): Raw {
  s.version = 3;
  s.troops = { giao: 0, cung: 0, voi: 0 };
  s.raid = initialRaid();
  return s;
}

/** Phiên bản 3 → 4 (lát cắt 3a): thêm phó bản, mã trận, và nhiệm vụ "Đánh màn 1" chèn vào giữa chuỗi. */
function migrate3to4(s: Raw): Raw {
  s.version = 4;
  s.campaign = initialCampaign();
  s.nextBattleId = 1;
  if (isNum(s.questIndex) && s.questIndex >= QUEST_INSERTED_V4) s.questIndex += 1;
  // Trận giữ kinh đô đang dở trong bản lưu cũ chưa có mã và kỹ năng.
  const raid = s.raid;
  if (isObj(raid) && isObj(raid.battle)) {
    Object.assign(raid.battle, { id: 0, mode: 'raid', rally: 0, skillCd: {}, outcome: null });
  }
  return s;
}

/** Phiên bản 4 → 5 (lát cắt 3b): thêm Thánh Gióng và các đoạn truyện. */
function migrate4to5(s: Raw): Raw {
  s.version = 5;
  s.giong = initialGiong();
  // Người chơi cũ đã qua đầu game thì không kể lại đoạn mở đầu, các đoạn về Gióng vẫn kể.
  s.story = { seen: isNum(s.questIndex) && s.questIndex > 0 ? ['mo'] : [] };
  // Trận đang dở trong bản lưu cũ chưa có Gióng và danh sách kỹ năng.
  for (const holder of [s.raid, s.campaign]) {
    if (isObj(holder) && isObj(holder.battle)) Object.assign(holder.battle, { skills: ['trongTran'], hero: null, bonus: 0 });
  }
  return s;
}

/** Phiên bản 5 → 6 (chương 2): thêm độ cao ô đất, Sơn Tinh, mùa lũ. */
function migrate5to6(s: Raw): Raw {
  s.version = 6;
  s.son = initialSon();
  s.heights = baseHeights();
  // Công trình cũ được đắp móng phẳng bằng chỗ cao nhất dưới móng, như khi dựng mới.
  if (isValidBuildings(s.buildings)) {
    const state = s as unknown as GameState;
    for (const b of state.buildings) levelFootprint(state, b, footprintTop(state, b.type, b.x, b.z));
  }
  const raid = s.raid;
  if (isObj(raid)) {
    Object.assign(raid, { foe: 'an', floods: 0, floodsHeld: 0, water: 0 });
    if (isObj(raid.lastResult)) Object.assign(raid.lastResult, { flood: 0, drowned: [] });
  }
  // Trận đang dở trong bản lưu cũ chưa có lũ, và tướng chưa ghi là ai.
  for (const holder of [s.raid, s.campaign]) {
    if (!isObj(holder) || !isObj(holder.battle)) continue;
    const battle = holder.battle;
    Object.assign(battle, { flood: 0, floodTo: 0, water: 0, drowned: [], swim: false });
    if (isObj(battle.hero)) Object.assign(battle.hero, { kind: 'giong', non: false });
  }
  return s;
}

/** Phiên bản 6 → 7 (chương 3): thêm An Dương Vương, đếm đêm yêu tinh và đợt quân Triệu. */
function migrate6to7(s: Raw): Raw {
  s.version = 7;
  s.adv = initialAdv();
  const raid = s.raid;
  if (isObj(raid)) {
    Object.assign(raid, { nights: 0, nightsHeld: 0, trieu: 0, trieuHeld: 0 });
    if (isObj(raid.lastResult)) raid.lastResult.foe = isNum(raid.lastResult.flood) && raid.lastResult.flood > 0 ? 'thuy' : 'an';
  }
  // Trận đang dở trong bản lưu cũ chưa ghi ai đánh, chưa có Rùa Vàng, chưa có Đền Cổ Loa.
  for (const holder of [s.raid, s.campaign]) {
    if (!isObj(holder) || !isObj(holder.battle)) continue;
    const battle = holder.battle;
    Object.assign(battle, { foe: isNum(battle.floodTo) && battle.floodTo > 0 ? 'thuy' : 'an', shield: 0, crossbows: false });
  }
  return s;
}

/** Phiên bản 7 → 8 (cấp 6–7): thêm bậc binh khí đã rèn, mọi binh chủng chưa rèn. */
function migrate7to8(s: Raw): Raw {
  s.version = 8;
  s.arms = { giao: 0, cung: 0, voi: 0 };
  for (const holder of [s.raid, s.campaign]) {
    if (isObj(holder) && isObj(holder.battle)) holder.battle.arms = { giao: 0, cung: 0, voi: 0 };
  }
  return s;
}

/** Phiên bản 8 → 9 (Hội Tết): thêm phần Tết. Người đã qua kết chương 1 sẽ được kể truyện Lang Liêu rồi tới Tết đầu. */
function migrate8to9(s: Raw): Raw {
  s.version = 9;
  s.tet = initialTet();
  return s;
}

/** Phiên bản 9 → 10 (cấp 8, lầu nỏ): không thêm gì vào state; công trình được lên cấp 8, có thêm loại lầu nỏ. */
function migrate9to10(s: Raw): Raw {
  s.version = 10;
  return s;
}

/**
 * Phiên bản 10 → 11 (lính nỏ, ụ nỏ, thủy binh Triệu): thêm số lính nỏ, bậc rèn của lính nỏ, hàng đứng của lính nỏ,
 * số đợt thủy binh, lẫy nỏ thần chưa bị tráo. Người đang ở chương 4 thì thủy binh tới sau ít phút.
 */
function migrate10to11(s: Raw): Raw {
  s.version = 11;
  if (isObj(s.troops)) s.troops.no = 0;
  if (isObj(s.arms)) s.arms.no = 0;
  if (isObj(s.adv)) s.adv.layTrao = false;
  const camp = s.campaign;
  if (isObj(camp) && isObj(camp.rows)) camp.rows.no = 'hau';
  const raid = s.raid;
  if (isObj(raid)) {
    Object.assign(raid, { thuyBinh: 0, thuyBinhHeld: 0 });
    if (isObj(raid.lastResult) && isObj(raid.lastResult.lost)) raid.lastResult.lost.no = 0;
  }
  // Trận đang dở trong bản lưu cũ chưa có lính nỏ và thuyền.
  for (const holder of [s.raid, s.campaign]) {
    if (!isObj(holder)) continue;
    if (isObj(holder.battle)) {
      const b = holder.battle;
      if (isObj(b.arms)) b.arms.no = 0;
      if (isObj(b.lost)) b.lost.no = 0;
      b.boats = [];
    }
    if (isObj(holder.lastResult) && isObj(holder.lastResult.lost)) holder.lastResult.lost.no = 0;
  }
  if (isObj(raid) && raid.phase === 'idle' && isNum(s.questIndex)) {
    const state = s as unknown as GameState;
    if (inChapter4(state)) scheduleThuyBinh(state);
  }
  return s;
}

const isBanh = (v: unknown, test: (x: unknown) => boolean): boolean => isObj(v) && test(v.chung) && test(v.giay);
const isBool = (x: unknown) => typeof x === 'boolean';

function isValidBuildings(list: unknown): boolean {
  if (!Array.isArray(list)) return false;
  const ok = list.every((b: unknown) => {
    if (!isObj(b)) return false;
    return (
      isNum(b.id) &&
      isNum(b.x) &&
      isNum(b.z) &&
      isNum(b.level) &&
      isNum(b.workers) &&
      b.workers >= 0 &&
      typeof b.type === 'string' &&
      b.type in BUILDINGS &&
      b.level >= 1 &&
      b.level <= BUILDINGS[b.type as BuildingType].maxLevel &&
      (b.uNo === undefined || ((b.uNo === 'ok' || b.uNo === 'hu') && b.type === 'thanh'))
    );
  });
  return ok && list.some((b: Raw) => b.type === 'dien');
}

function isGameState(v: unknown): v is GameState {
  if (!isObj(v) || v.version !== 11) return false;
  if (!Array.isArray(v.heights) || v.heights.length !== GRID * GRID || !v.heights.every(isNum)) return false;
  const son = v.son;
  if (!isObj(son) || !isObj(son.gifts) || !isNum(son.restUntil) || typeof son.non !== 'boolean' || typeof son.won !== 'boolean') return false;
  if (!GIFT_IDS.every((k) => typeof (son.gifts as Raw)[k] === 'boolean')) return false;
  const adv = v.adv;
  if (!isObj(adv) || typeof adv.no !== 'boolean' || !isNum(adv.restUntil) || typeof adv.kimQuy !== 'boolean' || typeof adv.won !== 'boolean') return false;
  if (typeof adv.layTrao !== 'boolean') return false;
  const g = v.giong;
  if (!isObj(g) || !isNum(g.fed) || !isNum(g.restUntil) || !isObj(g.gear)) return false;
  if (!GEAR_IDS.every((k) => typeof (g.gear as Raw)[k] === 'boolean')) return false;
  if (typeof g.whipBroken !== 'boolean' || typeof g.ascended !== 'boolean') return false;
  if (!isObj(v.story) || !Array.isArray(v.story.seen)) return false;
  const tet = v.tet;
  if (!isObj(tet) || !isNum(tet.seq) || !(tet.nextAt === null || isNum(tet.nextAt)) || !isNum(tet.openUntil)) return false;
  if (!isBanh(tet.banh, isNum) || !isBanh(tet.offered, isBool) || !isBanh(tet.blessing, isBool)) return false;
  const troops = v.troops;
  if (!isObj(troops) || !UNIT_TYPES.every((k) => isNum(troops[k]) && troops[k] >= 0)) return false;
  const arms = v.arms;
  if (!isObj(arms) || !UNIT_TYPES.every((k) => isNum(arms[k]) && arms[k] >= 0 && arms[k] <= 2)) return false;
  const raid = v.raid;
  if (!isObj(raid) || !isNum(raid.wave) || !isNum(raid.won) || !(raid.nextAt === null || isNum(raid.nextAt))) return false;
  if (!['idle', 'warning', 'battle'].includes(raid.phase as string)) return false;
  if (!['an', 'thuy', 'yeu', 'trieu', 'thuyBinh'].includes(raid.foe as string) || !isNum(raid.floods) || !isNum(raid.floodsHeld) || !isNum(raid.water)) return false;
  if (![raid.nights, raid.nightsHeld, raid.trieu, raid.trieuHeld, raid.thuyBinh, raid.thuyBinhHeld].every(isNum)) return false;
  const camp = v.campaign;
  if (!isObj(camp) || !isNum(camp.cleared) || !isObj(camp.rows)) return false;
  if (!UNIT_TYPES.every((k) => ROWS.includes((camp.rows as Raw)[k] as never))) return false;
  if (!(camp.battle === null || isObj(camp.battle)) || !(camp.lastResult === null || isObj(camp.lastResult))) return false;
  const res = v.resources;
  if (!isObj(res) || !RESOURCE_IDS.every((r) => isNum(res[r]))) return false;
  if (!isValidBuildings(v.buildings)) return false;
  const m = v.merchant;
  if (!isObj(m) || !isNum(m.nextAt) || !isNum(m.seq) || !(m.visit === null || isObj(m.visit))) return false;
  const settings = v.settings;
  return (
    isNum(v.dan) &&
    isNum(v.danProgress) &&
    isNum(v.clock) &&
    isNum(v.nextId) &&
    isNum(v.nextBattleId) &&
    isNum(v.questIndex) &&
    isNum(v.lastSeen) &&
    isObj(settings) &&
    typeof settings.muted === 'boolean'
  );
}

export function toCode(state: GameState): string {
  const bytes = new TextEncoder().encode(serialize(state));
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return CODE_PREFIX + btoa(bin);
}

export function fromCode(code: string): GameState | undefined {
  const trimmed = code.trim();
  if (!trimmed.startsWith(CODE_PREFIX)) return undefined;
  try {
    const bin = atob(trimmed.slice(CODE_PREFIX.length));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return deserialize(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

export function loadFromStorage(storage: Storage): GameState | undefined {
  try {
    const json = storage.getItem(SAVE_KEY);
    return json ? deserialize(json) : undefined;
  } catch {
    return undefined;
  }
}

export function saveToStorage(storage: Storage, state: GameState): boolean {
  try {
    storage.setItem(SAVE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}
