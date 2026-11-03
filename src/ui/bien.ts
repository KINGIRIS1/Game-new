// Bảng quần đảo ngoài biển Đông: chạm vào đảo thì hiện tên, lời tả, số đảo, thuyền khơi nào đánh cá ở đây. Chỉ dựng
// chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { BIEN_DIEN, boatsAt, quanDao, type QuanDaoId } from '../game/bien';
import { dienLevel, fishOf, type GameState } from '../game/game';
import { vi } from '../text/vi';
import { fmt } from './format';

export function quanDaoHtml(state: GameState, id: QuanDaoId): string {
  const q = quanDao(id);
  const rows = [`<div class="stat"><span>${vi.bien.daoCount}</span><span>${q.dao.length}</span></div>`];
  const boats = boatsAt(state, id);
  if (boats.length) {
    const fish = boats.reduce((n, b) => n + fishOf(b), 0);
    rows.push(`<div class="stat"><span>${vi.bien.boats}</span><span>${vi.buildings.benKhoi.icon} ${boats.length} · 🐟 ${fmt(fish)}${vi.ui.perMinute}</span></div>`);
  } else {
    rows.push(`<p class="muted">${dienLevel(state) >= BIEN_DIEN ? vi.bien.noBoats : vi.bien.noBoatsYet}</p>`);
  }
  rows.push(`<p class="muted">${vi.bien.garrisonLater}</p>`);
  return `<div class="info"><p>${vi.bien.quanDao[id].desc}</p>${rows.join('')}</div>`;
}
