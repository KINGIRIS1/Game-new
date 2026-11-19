// Giao diện thần thú (docs/thiet-ke.md mục Kế hoạch: nuôi thần thú): bảng ở bản đồ phó bản (chip 🐉, hay chạm thú
// đang đi lại trong kinh đô): mỗi thú một thẻ (cấp, dáng, thanh bữa, giá bữa, nút Cho ăn, Mang theo); nửa trái là thú
// đang mang theo và số bữa.

import { THAN_THU, THAN_THU_IDS, THAN_THU_NUOI, type ThanThuId } from '../game/defs';
import { canAfford, type GameState } from '../game/game';
import { buaCho, buaLen, capThu, dangThu, giaBua, heThu, thuDiTheo, thuNay, thuVe } from '../game/thanThu';
import { formatDuration, vi } from '../text/vi';
import { costHtml } from './format';

const t = () => vi.thanThu;

/** Thẻ một thú. */
function theThu(s: GameState, id: ThanThuId, theo: ThanThuId | null): string {
  const T = t();
  if (!thuVe(s, id)) {
    return `<div class="thu-card khoa"><em>${T.icon[id]}</em><div><b>${T.ten[id]}</b><small>${T.khoa(THAN_THU[id].ve)}</small></div></div>`;
  }
  const cap = capThu(s, id);
  const tran = cap >= THAN_THU_NUOI.tran;
  const can = buaLen(cap);
  const da = s.thanThu?.exp[id] ?? 0;
  const pct = tran ? 100 : Math.min(100, (100 * da) / can);
  const gia = giaBua(s, id);
  const bua = s.thanThu?.bua ?? THAN_THU_NUOI.buaMax;
  const an = tran
    ? `<button class="btn small ghost" disabled>${T.tran}</button>`
    : `<button class="btn small bronze" data-act="thuAn" data-thu="${id}" ${bua < 1 || !canAfford(s, gia) ? 'disabled' : ''}>${T.choAn} ${costHtml(s, gia)}</button>`;
  const mang = id === theo ? `<span class="thu-theo">${T.dangTheo}</span>` : `<button class="btn small ghost" data-act="thuChon" data-thu="${id}">${T.mangTheo}</button>`;
  return `<div class="thu-card ${id === theo ? 'on' : ''}"><em>${T.icon[id]}</em><div>
    <b>${T.ten[id]} <small>· ${T.cap(cap)} · ${T.dang[dangThu(cap)]}</small></b>
    <small>${T.vai[id]} · ${T.suc(Math.round((heThu(cap) - 1) * 100))}</small>
    <span class="da-exp"><i style="width:${pct.toFixed(1)}%"></i></span><small>${tran ? T.tran : T.buaLen(da, can)}</small>
    <div class="thu-btns">${an}${mang}</div></div></div>`;
}

/** Bảng thần thú. */
export function thanThuHtml(s: GameState): string {
  const T = t();
  const theo = thuDiTheo(s);
  if (!theo) return `<h3>🐉 ${T.title}</h3><p>${T.locked}</p>`;
  const bua = thuNay(s).bua;
  const cho = buaCho(s);
  return `<h3>🐉 ${T.title}</h3>
    <p class="muted">${T.intro}</p>
    <div class="stat"><span>🍚 ${T.buaTitle}</span><b>${T.bua(bua, THAN_THU_NUOI.buaMax)}${cho ? ` · ${T.buaSau(formatDuration(cho * 1000))}` : ''}</b></div>
    <div class="thu-list">${THAN_THU_IDS.map((id) => theThu(s, id, theo)).join('')}</div>
    <p class="muted small">${T.note}</p>`;
}

/** Nửa trái bảng: thú đang mang theo. */
export function thanThuMapHtml(s: GameState): string {
  const T = t();
  const theo = thuDiTheo(s);
  if (!theo) return `<div class="thu-big"><em>🐉</em></div>`;
  const cap = capThu(s, theo);
  return `<div class="thu-big d${dangThu(cap)}"><em>${T.icon[theo]}</em><b>${T.ten[theo]}</b><small>${T.cap(cap)} · ${T.dang[dangThu(cap)]}</small><p class="muted small">${T.ky[theo]}</p></div>`;
}
