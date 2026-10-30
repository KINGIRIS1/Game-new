// Lưu game vào localStorage và xuất/nhập mã lưu để sao lưu hoặc chuyển máy.

import { BUILDINGS, RESOURCE_IDS, type BuildingType } from './defs';
import type { GameState } from './game';

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
  return isGameState(raw) ? raw : undefined;
}

function isGameState(v: unknown): v is GameState {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  if (s.version !== 1) return false;
  const res = s.resources as Record<string, unknown> | undefined;
  if (!res || !RESOURCE_IDS.every((r) => typeof res[r] === 'number' && Number.isFinite(res[r]))) return false;
  if (!Array.isArray(s.buildings)) return false;
  const buildingsOk = s.buildings.every((b: unknown) => {
    if (!b || typeof b !== 'object') return false;
    const o = b as Record<string, unknown>;
    return (
      typeof o.id === 'number' &&
      typeof o.x === 'number' &&
      typeof o.z === 'number' &&
      typeof o.level === 'number' &&
      typeof o.type === 'string' &&
      o.type in BUILDINGS &&
      o.level >= 1 &&
      o.level <= BUILDINGS[o.type as BuildingType].maxLevel
    );
  });
  if (!buildingsOk || !s.buildings.some((b: { type: string }) => b.type === 'dien')) return false;
  const settings = s.settings as Record<string, unknown> | undefined;
  return (
    typeof s.nextId === 'number' &&
    typeof s.questIndex === 'number' &&
    typeof s.lastSeen === 'number' &&
    !!settings &&
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
