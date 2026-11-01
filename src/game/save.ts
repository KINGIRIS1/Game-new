// Lưu game vào localStorage và xuất/nhập mã lưu (hay tệp lưu, cũng chứa đúng mã đó) để sao lưu hoặc chuyển máy.
// Bản lưu cũ (phiên bản 1 của lát cắt 1, 2 của lát cắt 2a, 3 của lát cắt 2b, 4 của lát cắt 3a,
// 5 của lát cắt 3b, 6 của chương 2, 7 của chương 3, 8 của cấp 6–7, 9 của Hội Tết, 10 của cấp 8) được nâng lên phiên bản
// hiện tại khi nạp. Từ phiên bản 11 bản đồ rộng 38×38 và công trình to hơn: kinh đô cũ được dựng lại (`migrate10to11`).

import { deflateSync, inflateSync } from 'fflate';
import { BUILDINGS, GEAR_IDS, GIFT_IDS, MERCHANT_FIRST_MS, QUEST_INSERTED_V4, RELAYOUT_GRACE_MS, RESOURCE_IDS, ROWS, type BuildingType, type Cost } from './defs';
import { initialAdv } from './coLoa';
import { autoAssign, housing, initialCampaign, initialGiong, initialRaid, type Building, type GameState } from './game';
import { GRID, LEGACY_GRID, LEGACY_RIVER, RIVER_START, baseHeights, inGrid, isRiver, isUnlocked, legacyBaseHeights, touchesRiver } from './map';
import { initialSon } from './son';
import { initialTet } from './tet';
import { footprintTop, levelFootprint } from './terrain';

/** Giữ nguyên khóa cũ để người chơi lát cắt 1 không mất tiến trình. */
export const SAVE_KEY = 'thoi-dai-van-lang/save/v1';
/** Mã lưu đời đầu: JSON đổi thẳng sang base64. Vẫn nhập được. */
const CODE_PREFIX_V1 = 'TDVL1:';
/** Mã lưu hiện tại: JSON được nén (deflate) rồi mới đổi sang base64, ngắn hơn chừng 4–8 lần. */
const CODE_PREFIX = 'TDVL2:';
/** Mã hay tệp lưu dài hơn chừng này chắc chắn không phải mã lưu. */
const CODE_MAX_LENGTH = 1_000_000;

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
  // Độ cao của bản đồ cũ 30×30. Móng công trình được đắp phẳng ở bước 10 → 11, khi dựng lại kinh đô trên bản đồ mới.
  s.heights = legacyBaseHeights();
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

// ---------- Phiên bản 10 → 11: công trình to hơn, bản đồ 38×38 ----------

/** Bản đồ mới rộng thêm chừng này ô về phía rừng; mọi thứ dịch theo để giữ khoảng cách tới sông. */
const SHIFT = RIVER_START - LEGACY_RIVER;
/** Đoạn tường, đê, bẫy: gắn với ô đất, vướng nền nhà mới thì dỡ (hoàn của). */
const SEGMENTS: BuildingType[] = ['luy', 'de', 'thanh', 'bayChong'];
/** Công trình móng to nở thêm 1 ô; giữ góc phía sông, thử nở về phía rừng trước rồi tới các hướng khác. */
const GROW: [number, number][] = [
  [-1, -1],
  [0, -1],
  [-1, 0],
  [0, 0],
];

/** Của đã bỏ ra để có công trình này ở cấp hiện tại: giá dựng và mọi lần nâng cấp. */
function spentOn(b: Building): Cost {
  const def = BUILDINGS[b.type];
  const out: Cost = {};
  for (const c of [def.buildCost, ...def.upgradeCost.slice(2, b.level + 1)]) for (const r of RESOURCE_IDS) if (c[r]) out[r] = (out[r] ?? 0) + c[r]!;
  return out;
}

/**
 * Phiên bản 10 → 11: bản đồ 30×30 thành 38×38, công trình móng to rộng thêm 1 ô mỗi cạnh. Kinh đô cũ được dựng lại:
 * - mọi tọa độ dịch theo sông, đất mới mở thêm về phía rừng; độ cao cũ (kể cả chỗ đã đắp) dịch theo;
 * - công trình to giữ góc phía sông, nở về phía rừng; vướng thì thử nở hướng khác, rồi dời tới chỗ trống gần nhất
 *   (ưu tiên chỗ không đè lũy, đê, thành); bến luôn sát sông; móng ở chỗ mới đắp phẳng như khi dựng;
 * - đoạn lũy, đê, thành, bẫy nằm dưới nền nhà mới thì dỡ, hoàn đủ của đã bỏ ra;
 * - trận giữ kinh đô đang dở được hoãn; giặc, lũ kế tiếp chờ ít nhất `RELAYOUT_GRACE_MS`;
 * - được áp mẫu kinh đô một lần không mất phí dời; Lạc hầu kể đoạn "Kinh đô dựng lại rộng hơn".
 */
function migrate10to11(s: Raw): Raw {
  s.version = 11;
  s.relayout = { freeMau: true };
  if (!isValidBuildings(s.buildings)) return s;
  const state = s as unknown as GameState;
  const oldHeights = Array.isArray(s.heights) && s.heights.length === LEGACY_GRID * LEGACY_GRID ? (s.heights as number[]) : legacyBaseHeights();
  const heights = baseHeights();
  for (let z = 0; z < LEGACY_RIVER; z++) for (let x = 0; x < LEGACY_RIVER; x++) heights[(z + SHIFT) * GRID + x + SHIFT] = oldHeights[z * LEGACY_GRID + x];
  state.heights = heights;
  const dien = state.buildings.find((b) => b.type === 'dien')!;
  const level = dien.level;
  const used = new Int32Array(GRID * GRID);
  const segment = new Uint8Array(GRID * GRID);
  const tile = (x: number, z: number) => z * GRID + x;
  for (const b of state.buildings) if (SEGMENTS.includes(b.type)) segment[tile(b.x + SHIFT, b.z + SHIFT)] = 1;
  /** Đặt được công trình `b` ở góc (x, z) không; `walls`: được đè lên đoạn tường, đê. */
  const fits = (b: Building, x: number, z: number, walls: boolean) => {
    const def = BUILDINGS[b.type];
    if (def.nearRiver && !touchesRiver(x, z, def.w, def.d)) return false;
    for (let dx = 0; dx < def.w; dx++) {
      for (let dz = 0; dz < def.d; dz++) {
        const X = x + dx;
        const Z = z + dz;
        if (!inGrid(X, Z) || isRiver(X, Z) || !isUnlocked(X, Z, level) || used[tile(X, Z)]) return false;
        if (!walls && segment[tile(X, Z)]) return false;
      }
    }
    return true;
  };
  const take = (b: Building, x: number, z: number) => {
    const def = BUILDINGS[b.type];
    b.x = x;
    b.z = z;
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) used[tile(x + dx, z + dz)] = b.id;
  };
  /** Chỗ trống gần (x, z) nhất theo khoảng cách ô. */
  const nearest = (b: Building, x0: number, z0: number, walls: boolean): [number, number] | null => {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) {
        const d = Math.abs(x - x0) + Math.abs(z - z0);
        if (d < bestD && fits(b, x, z, walls)) {
          best = [x, z];
          bestD = d;
        }
      }
    }
    return best;
  };
  const refund: Cost = {};
  const gone: number[] = [];
  const giveBack = (b: Building) => {
    gone.push(b.id);
    const c = spentOn(b);
    for (const r of RESOURCE_IDS) if (c[r]) refund[r] = (refund[r] ?? 0) + c[r]!;
  };
  const dx0 = dien.x + 2;
  const dz0 = dien.z + 2;
  const big = state.buildings
    .filter((b) => !SEGMENTS.includes(b.type))
    .sort((a, b) => Number(b.type === 'dien') - Number(a.type === 'dien') || BUILDINGS[b.type].w - BUILDINGS[a.type].w || Math.hypot(a.x - dx0, a.z - dz0) - Math.hypot(b.x - dx0, b.z - dz0));
  for (const b of big) {
    const grows = BUILDINGS[b.type].w > 1;
    const x = b.x + SHIFT;
    const z = b.z + SHIFT;
    const tries: [number, number][] = grows ? GROW.map(([gx, gz]) => [x + gx, z + gz]) : [[x, z]];
    // Điện không dời được: luôn đứng ở góc cũ dịch theo sông, nở về phía rừng; đoạn tường dưới nền Điện thì dỡ.
    if (b.type === 'dien' && fits(b, tries[0][0], tries[0][1], true)) {
      take(b, tries[0][0], tries[0][1]);
      continue;
    }
    const spot =
      tries.find(([tx, tz]) => fits(b, tx, tz, false)) ??
      nearest(b, tries[0][0], tries[0][1], false) ??
      tries.find(([tx, tz]) => fits(b, tx, tz, true)) ??
      nearest(b, tries[0][0], tries[0][1], true);
    if (spot) take(b, spot[0], spot[1]);
    else giveBack(b);
  }
  for (const b of state.buildings) {
    if (!SEGMENTS.includes(b.type)) continue;
    const x = b.x + SHIFT;
    const z = b.z + SHIFT;
    if (used[tile(x, z)]) giveBack(b);
    else take(b, x, z);
  }
  state.buildings = state.buildings.filter((b) => !gone.includes(b.id));
  for (const b of state.buildings) if (!SEGMENTS.includes(b.type)) levelFootprint(state, b, footprintTop(state, b.type, b.x, b.z));
  for (const r of RESOURCE_IDS) state.resources[r] += refund[r] ?? 0;
  // Trận giữ kinh đô đang dở (giặc đứng theo tọa độ cũ) được hoãn; giặc, lũ kế tiếp chờ thêm.
  const raid = state.raid;
  if (raid.phase !== 'idle') {
    Object.assign(raid, { phase: 'idle', battle: null, water: 0, nextAt: state.clock + RELAYOUT_GRACE_MS });
  } else if (raid.nextAt !== null) {
    raid.nextAt = Math.max(raid.nextAt, state.clock + RELAYOUT_GRACE_MS);
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
      b.level <= BUILDINGS[b.type as BuildingType].maxLevel
    );
  });
  return ok && list.some((b: Raw) => b.type === 'dien');
}

function isGameState(v: unknown): v is GameState {
  if (!isObj(v) || v.version !== 11) return false;
  if (!(v.relayout === null || (isObj(v.relayout) && typeof v.relayout.freeMau === 'boolean'))) return false;
  if (!Array.isArray(v.heights) || v.heights.length !== GRID * GRID || !v.heights.every(isNum)) return false;
  const son = v.son;
  if (!isObj(son) || !isObj(son.gifts) || !isNum(son.restUntil) || typeof son.non !== 'boolean' || typeof son.won !== 'boolean') return false;
  if (!GIFT_IDS.every((k) => typeof (son.gifts as Raw)[k] === 'boolean')) return false;
  const adv = v.adv;
  if (!isObj(adv) || typeof adv.no !== 'boolean' || !isNum(adv.restUntil) || typeof adv.kimQuy !== 'boolean' || typeof adv.won !== 'boolean') return false;
  const g = v.giong;
  if (!isObj(g) || !isNum(g.fed) || !isNum(g.restUntil) || !isObj(g.gear)) return false;
  if (!GEAR_IDS.every((k) => typeof (g.gear as Raw)[k] === 'boolean')) return false;
  if (typeof g.whipBroken !== 'boolean' || typeof g.ascended !== 'boolean') return false;
  if (!isObj(v.story) || !Array.isArray(v.story.seen)) return false;
  const tet = v.tet;
  if (!isObj(tet) || !isNum(tet.seq) || !(tet.nextAt === null || isNum(tet.nextAt)) || !isNum(tet.openUntil)) return false;
  if (!isBanh(tet.banh, isNum) || !isBanh(tet.offered, isBool) || !isBanh(tet.blessing, isBool)) return false;
  const troops = v.troops;
  if (!isObj(troops) || !['giao', 'cung', 'voi'].every((k) => isNum(troops[k]) && troops[k] >= 0)) return false;
  const arms = v.arms;
  if (!isObj(arms) || !['giao', 'cung', 'voi'].every((k) => isNum(arms[k]) && arms[k] >= 0 && arms[k] <= 2)) return false;
  const raid = v.raid;
  if (!isObj(raid) || !isNum(raid.wave) || !isNum(raid.won) || !(raid.nextAt === null || isNum(raid.nextAt))) return false;
  if (!['idle', 'warning', 'battle'].includes(raid.phase as string)) return false;
  if (!['an', 'thuy', 'yeu', 'trieu'].includes(raid.foe as string) || !isNum(raid.floods) || !isNum(raid.floodsHeld) || !isNum(raid.water)) return false;
  if (![raid.nights, raid.nightsHeld, raid.trieu, raid.trieuHeld].every(isNum)) return false;
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

/** Mã lưu để chép hay cất vào tệp lưu. Nén đồng bộ để nút Chép, Gửi chạy ngay trong lúc bấm (Safari đòi vậy). */
export function toCode(state: GameState): string {
  return CODE_PREFIX + toBase64(deflateSync(new TextEncoder().encode(serialize(state)), { level: 9 }));
}

/** Đọc mã lưu (mới hay đời đầu). Bỏ qua dấu cách và xuống dòng do ứng dụng nhắn tin chèn vào. */
export function fromCode(code: string): GameState | undefined {
  const text = code.length > CODE_MAX_LENGTH ? '' : code.replace(/\s+/g, '');
  try {
    let bytes: Uint8Array;
    if (text.startsWith(CODE_PREFIX)) bytes = inflateSync(fromBase64(text.slice(CODE_PREFIX.length)));
    else if (text.startsWith(CODE_PREFIX_V1)) bytes = fromBase64(text.slice(CODE_PREFIX_V1.length));
    else return undefined;
    return deserialize(new TextDecoder().decode(bytes));
  } catch {
    // Mã hỏng: base64 sai hay dữ liệu nén sai.
    return undefined;
  }
}

/** Tên tệp lưu, theo giờ máy: thoi-dai-van-lang-2026-11-01-1430.txt. Đuôi .txt để ứng dụng nhắn tin nào cũng gửi được. */
export function saveFileName(now: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  const day = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
  return `thoi-dai-van-lang-${day}-${two(now.getHours())}${two(now.getMinutes())}.txt`;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
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
