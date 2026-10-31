// Lưu game vào localStorage và xuất/nhập mã lưu để sao lưu hoặc chuyển máy.
// Bản lưu cũ (phiên bản 1 của lát cắt 1, 2 của lát cắt 2a, 3 của lát cắt 2b, 4 của lát cắt 3a,
// 5 của lát cắt 3b) được nâng lên phiên bản hiện tại khi nạp.

import { BUILDINGS, GEAR_IDS, GIFT_IDS, MERCHANT_FIRST_MS, QUEST_INSERTED_V4, RESOURCE_IDS, ROWS, type BuildingType } from './defs';
import { autoAssign, housing, initialCampaign, initialGiong, initialRaid, type GameState } from './game';
import { GRID, baseHeights } from './map';
import { initialSon } from './son';
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
      b.level <= BUILDINGS[b.type as BuildingType].maxLevel
    );
  });
  return ok && list.some((b: Raw) => b.type === 'dien');
}

function isGameState(v: unknown): v is GameState {
  if (!isObj(v) || v.version !== 6) return false;
  if (!Array.isArray(v.heights) || v.heights.length !== GRID * GRID || !v.heights.every(isNum)) return false;
  const son = v.son;
  if (!isObj(son) || !isObj(son.gifts) || !isNum(son.restUntil) || typeof son.non !== 'boolean' || typeof son.won !== 'boolean') return false;
  if (!GIFT_IDS.every((k) => typeof (son.gifts as Raw)[k] === 'boolean')) return false;
  const g = v.giong;
  if (!isObj(g) || !isNum(g.fed) || !isNum(g.restUntil) || !isObj(g.gear)) return false;
  if (!GEAR_IDS.every((k) => typeof (g.gear as Raw)[k] === 'boolean')) return false;
  if (typeof g.whipBroken !== 'boolean' || typeof g.ascended !== 'boolean') return false;
  if (!isObj(v.story) || !Array.isArray(v.story.seen)) return false;
  const troops = v.troops;
  if (!isObj(troops) || !['giao', 'cung', 'voi'].every((k) => isNum(troops[k]) && troops[k] >= 0)) return false;
  const raid = v.raid;
  if (!isObj(raid) || !isNum(raid.wave) || !isNum(raid.won) || !(raid.nextAt === null || isNum(raid.nextAt))) return false;
  if (!['idle', 'warning', 'battle'].includes(raid.phase as string)) return false;
  if (!['an', 'thuy'].includes(raid.foe as string) || !isNum(raid.floods) || !isNum(raid.floodsHeld) || !isNum(raid.water)) return false;
  const camp = v.campaign;
  if (!isObj(camp) || !isNum(camp.cleared) || !isObj(camp.rows)) return false;
  if (!['giao', 'cung', 'voi'].every((k) => ROWS.includes((camp.rows as Raw)[k] as never))) return false;
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
