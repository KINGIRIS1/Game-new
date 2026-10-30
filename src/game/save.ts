// Lưu game vào localStorage và xuất/nhập mã lưu để sao lưu hoặc chuyển máy.
// Bản lưu cũ (phiên bản 1, lát cắt 1) được nâng lên phiên bản 2 khi nạp.

import { BUILDINGS, MERCHANT_FIRST_MS, RESOURCE_IDS, type BuildingType } from './defs';
import { autoAssign, housing, type GameState } from './game';

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

/** Phiên bản 1 → 2: thêm dân, người làm, đồng hồ chơi và thuyền buôn. */
function migrate(raw: unknown): unknown {
  if (!isObj(raw) || raw.version !== 1 || !Array.isArray(raw.buildings)) return raw;
  const s = raw as unknown as GameState & Raw;
  for (const b of s.buildings as unknown as Raw[]) b.workers = 0;
  s.version = 2;
  s.clock = 0;
  s.danProgress = 0;
  s.merchant = { nextAt: MERCHANT_FIRST_MS, visit: null, seq: 0 };
  if (!isValidBuildings(s.buildings)) return s;
  // Người chơi cũ đã có ruộng, bến đang làm ăn: cho đủ dân ở và chia vào làm ngay.
  s.dan = housing(s);
  autoAssign(s);
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
  if (!isObj(v) || v.version !== 2) return false;
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
