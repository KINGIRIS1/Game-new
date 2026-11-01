// Giao diện mẫu kinh đô: mỗi mẫu một thẻ có bản đồ thu nhỏ, số công trình sẽ dời, dựng thêm, dỡ đi,
// tổng giá và nút áp mẫu (bấm hai lần cho chắc). Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { BUILDINGS, type BuildingType } from '../game/defs';
import { dienLevel, type GameState } from '../game/game';
import { canApplyMau, mauSlots, mauUnlocked, planMau, MAU_IDS, type MauId } from '../game/mau';
import { RIVER_START, isUnlocked } from '../game/map';
import { vi } from '../text/vi';
import { costHtml } from './format';

/** Màu ô trên bản đồ thu nhỏ theo loại công trình. */
const TILE: Partial<Record<BuildingType, string>> = {
  dien: '#b0392b',
  ruong: '#c9b04a',
  ruongNep: '#e4d7a0',
  ben: '#3f7f9a',
  nhaSan: '#a8743c',
  baiDa: '#8d877d',
  loRen: '#4f4038',
  kho: '#d29a3c',
  doanhTrai: '#7a2f25',
  choiCanh: '#5a3b20',
  bayChong: '#9fbf5a',
  luy: '#6b8f3a',
  de: '#6d5a40',
  thanh: '#5c4630',
  denPhuDong: '#e0703a',
  denTanVien: '#2f8a6a',
  denCoLoa: '#c8a020',
  vuon: '#4f9a42',
  chuongLon: '#3a3330',
  bep: '#c45a2a',
};

/** Bản đồ thu nhỏ 27×27 ô của mẫu: ô ngoài vùng đã khai phá thì mờ, sông xanh ở hai cạnh. */
function miniMap(state: GameState, id: MauId): string {
  const n = RIVER_START + 1;
  const cells: string[] = Array.from({ length: n * n }, (_, i) => {
    const x = i % n;
    const z = Math.floor(i / n);
    if (x >= RIVER_START || z >= RIVER_START) return 'river';
    return isUnlocked(x, z, dienLevel(state)) ? '' : 'wild';
  });
  const color: (string | undefined)[] = new Array(n * n);
  for (const s of mauSlots(id)) {
    const def = BUILDINGS[s.type];
    for (let dx = 0; dx < def.w; dx++) for (let dz = 0; dz < def.d; dz++) color[(s.z + dz) * n + s.x + dx] = TILE[s.type];
  }
  const html = cells.map((c, i) => `<i class="${c}"${color[i] ? ` style="background:${color[i]}"` : ''}></i>`).join('');
  return `<div class="mini-map" style="--n:${n}">${html}</div>`;
}

/** Bảng mẫu kinh đô. `armed` là mẫu vừa bấm Áp lần đầu, chờ bấm lần nữa. */
export function mauHtml(state: GameState, armed: MauId | null): string {
  const cards = MAU_IDS.map((id) => {
    const t = vi.ui.mau[id];
    if (!mauUnlocked(state, id)) {
      return `<div class="mau locked"><h3>${t.icon} ${t.name}</h3><p class="muted">${t.lock}</p></div>`;
    }
    const plan = planMau(state, id);
    const check = canApplyMau(state, id);
    const summary = vi.ui.mauPlan(plan.moves.length, plan.builds.length, plan.removes.length);
    const label = armed === id ? vi.ui.mauConfirm : vi.ui.mauApply;
    const why = check.ok ? '' : `<div class="why">${vi.reasons[check.reason]}</div>`;
    return `<div class="mau"><h3>${t.icon} ${t.name}</h3><p class="muted">${t.desc}</p>${miniMap(state, id)}
      <p>${summary}</p>
      <div class="actions"><button class="btn ${armed === id ? 'bronze' : ''}" data-act="applyMau" data-mau="${id}" ${check.ok ? '' : 'disabled'}>
        ${label}${Object.keys(plan.cost).length ? ` · ${costHtml(state, plan.cost)}` : ''}</button></div>${why}</div>`;
  }).join('');
  return `<p class="muted">${vi.ui.mauHint}</p>${cards}`;
}
