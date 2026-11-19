// Bảng quần đảo ngoài biển Đông: chạm vào đảo thì hiện tên, lời tả, số đảo, thuyền khơi nào đánh cá ở đây; từ Điện 10
// thêm đồn đảo (dựng, nâng), thuyền chiến, lính đóng, phần giữ biển và phần giặc đánh đảo (đếm ngược đợt sau, sửa đồn
// hư, trận gần nhất có nút Xem lại; `dao.ts`). Chỉ dựng chuỗi HTML; Hud lo việc gắn vào trang và bắt sự kiện.

import { BIEN_DIEN, DAO_CHINH, boatsAt, quanDao, type QuanDaoId } from '../game/bien';
import { DAO_GIAC, DON_DAO, THUYEN_CHIEN, UNIT_TYPES, UNITS } from '../game/defs';
import { armySpace } from '../game/doanhTrai';
import { benOf, buildingDon, canDon, daoJobId, donCho, donCost, donMs, giacToi, giuBien, outbound, suaDonCost } from '../game/dao';
import { maVienCame } from '../game/chuong5';
import { canAfford, dienLevel, fishIn, type GameState } from '../game/game';
import { formatClock, formatXay, vi } from '../text/vi';
import { costHtml, fmt } from './format';
import { jobHtml, realMs } from './xay';

/** `armed`: việc vừa bấm Hủy lần đầu; `hetTho`: dòng báo hết tốp thợ (Hud dựng, đếm ngược thay tại chỗ). */
export function quanDaoHtml(state: GameState, id: QuanDaoId, armed: number | null, hetTho: string): string {
  const q = quanDao(id);
  const rows = [
    `<div class="stat"><span>${vi.bien.daoChinh}</span><span>${vi.bien.daoSize(DAO_CHINH)}</span></div>`,
    `<div class="stat"><span>${vi.bien.daoCount}</span><span>${vi.bien.daoNho(q.dao.length)}</span></div>`,
  ];
  const boats = boatsAt(state, id);
  if (boats.length) {
    const fish = boats.reduce((n, b) => n + fishIn(state, b), 0);
    rows.push(`<div class="stat"><span>${vi.bien.boats}</span><span>${vi.buildings.benKhoi.icon} ${boats.length} · 🐟 ${fmt(fish)}${vi.ui.perMinute}</span></div>`);
  } else {
    rows.push(`<p class="muted">${dienLevel(state) >= BIEN_DIEN ? vi.bien.noBoats : vi.bien.noBoatsYet}</p>`);
  }
  return `<div class="info"><p>${vi.bien.quanDao[id].desc}</p>${rows.join('')}${donHtml(state, id, armed, hetTho)}</div>`;
}

/** Phần đồn đảo: chưa mở thì cần gì; có thì cấp, nút dựng hay nâng (hay việc đang xây), thuyền, lính đóng, giữ biển. */
function donHtml(state: GameState, id: QuanDaoId, armed: number | null, hetTho: string): string {
  if (dienLevel(state) < BIEN_DIEN) return '';
  const d = state.dao[id];
  const out = [`<h3>🏯 ${vi.bien.donName(id)}</h3>`, `<p class="muted">${vi.bien.donDesc}</p>`];
  if (dienLevel(state) < DON_DAO.minDien) return out.concat(`<p class="why">${vi.bien.donNeedDien}</p>`).join('');
  const ben = benOf(state, id);
  if (!ben || (ben.level < DON_DAO.benCap && !d.thuyen)) return out.concat(`<p class="why">${vi.bien.donNeedBen}</p>`).join('');
  out.push(`<div class="stat"><span>${vi.ui.level}</span><span>${d.cap || vi.bien.donNone}</span></div>`);
  if (d.cap) out.push(`<div class="stat"><span>${vi.bien.donCho}</span><span>${donCho(state, id)}</span></div>`);
  if (buildingDon(state, id)) out.push(jobHtml(state, daoJobId(id), armed));
  else if (!d.thuyen) out.push(`<p class="why">${vi.bien.donNeedThuyen}</p>`);
  else {
    const cost = donCost(state, id);
    if (!cost) out.push(`<p class="muted">${vi.bien.donMax}</p>`);
    else {
      const check = canDon(state, id);
      // Hud truyền chuỗi rỗng khi có tốp thợ rảnh.
      const free = check.ok && !hetTho;
      const label = d.cap ? `⬆ ${vi.bien.donUp(d.cap + 1)}` : `🏯 ${vi.bien.donBuild}`;
      const time = ` · ${vi.ui.xayTime(formatXay(realMs(state, donMs(state, id))))}`;
      out.push(`<div class="actions"><button class="btn" data-act="buildDon" data-dao="${id}" ${free ? '' : 'disabled'}>${label} · ${costHtml(state, cost)}${time}</button></div>`);
      if (!check.ok) out.push(`<div class="why">${vi.reasons[check.reason]}</div>`);
      else if (!free) out.push(`<div class="why">${hetTho}</div>`);
    }
  }
  if (d.cap) out.push(boatHtml(state, id), linhHtml(state, id), giuHtml(state, id), giacHtml(state, id));
  return out.join('');
}

/** Thuyền chiến đang ở đâu (không ghi số giây: bảng khỏi dựng lại mỗi giây; dòng tin có đếm ngược). */
function boatHtml(state: GameState, id: QuanDaoId): string {
  const c = state.dao[id].chuyen;
  const count = c ? UNIT_TYPES.reduce((n, k) => n + c.cho[k], 0) : 0;
  const text = !c ? vi.bien.thuyenDock : c.ve ? vi.bien.thuyenBack(count) : vi.bien.thuyenOut(count);
  return `<div class="stat"><span>⛵ ${vi.bien.thuyen}</span><span>${text}</span></div>`;
}

/** Lính đóng đảo: mỗi binh chủng một hàng, bớt, thêm (số muốn đóng; thuyền tự chở cho đủ). */
function linhHtml(state: GameState, id: QuanDaoId): string {
  const d = state.dao[id];
  const ra = outbound(d);
  const max = donCho(state, id);
  const used = armySpace(d.muon);
  const owned = UNIT_TYPES.filter((k) => state.troops[k] > 0 || d.muon[k] > 0 || d.linh[k] > 0 || ra[k] > 0);
  const rows = owned.map((k) => {
    const have = d.linh[k] + ra[k] + state.troops[k];
    const more = d.muon[k] < have && used + UNITS[k].space <= max;
    return `<div class="unit-row army">
        <span class="unit-icon">${vi.units[k].icon}</span>
        <span class="unit-info"><b>${vi.units[k].name}</b><small>${vi.bien.linhHere(d.linh[k], ra[k] + (d.chuyen?.ve ? d.chuyen.cho[k] : 0))}</small></span>
        <button class="step" data-act="daoLinh" data-dao="${id}" data-unit="${k}" data-delta="-1" ${d.muon[k] > 0 ? '' : 'disabled'} aria-label="Bớt một lính đóng đảo">−</button>
        <b class="count">${d.muon[k]}</b>
        <button class="step" data-act="daoLinh" data-dao="${id}" data-unit="${k}" data-delta="1" ${more ? '' : 'disabled'} aria-label="Thêm một lính đóng đảo">+</button>
      </div>`;
  });
  const body = owned.length ? `<div class="units">${rows.join('')}</div>` : `<p class="why">${vi.bien.linhNone}</p>`;
  return `<h3>🛡️ ${vi.bien.linhTitle}</h3><p class="muted">${vi.bien.linhHint(used, max, THUYEN_CHIEN.cho)}</p>${body}`;
}

/** Đồn đang giữ biển được gì, hay cần đóng thêm bao nhiêu quân. */
function giuHtml(state: GameState, id: QuanDaoId): string {
  const cap = giuBien(state, id);
  const head = `<h3>🌊 ${vi.bien.giuTitle}</h3>`;
  if (!cap) return `${head}<p class="why">${vi.bien.giuOff(DON_DAO.giuCho)}</p>`;
  const pct = (n: number) => Math.round(n * 100);
  return `${head}<ul class="giu-bien">
      <li>${vi.bien.giuNguTruong(pct(DON_DAO.nguTruong[cap - 1]))}</li>
      <li>${vi.bien.giuLuaHieu(DON_DAO.baoSom / 60_000)}</li>
      <li>${vi.bien.giuChan(pct(DON_DAO.chan[cap - 1]))}</li>
    </ul>`;
}

/**
 * Giặc đánh đảo: đảo còn yên (chưa có Mã Viện), đồn hư (nút Sửa), đếm ngược tới đợt sau (thay tại chỗ: `fillDao`), trận
 * gần nhất (thắng hay thua, lính mất, của được, nút Xem lại trận).
 */
function giacHtml(state: GameState, id: QuanDaoId): string {
  const d = state.dao[id];
  const out = [`<h3>⚔️ ${vi.bien.giacTitle}</h3>`];
  if (!maVienCame(state)) return out.concat(`<p class="muted">${vi.bien.giacYen}</p>`).join('');
  if (d.hu) {
    const cost = suaDonCost(state, id);
    out.push(`<p class="why">${vi.bien.huNote}</p>`);
    out.push(`<div class="actions"><button class="btn" data-act="suaDon" data-dao="${id}" ${canAfford(state, cost) ? '' : 'disabled'}>🔧 ${vi.bien.suaBtn} · ${costHtml(state, cost)}</button></div>`);
  } else if (!giacToi(state, id)) out.push(`<p class="muted">${vi.bien.giacKhongLinh}</p>`);
  else {
    out.push(`<p class="muted">${vi.bien.giacHint(DAO_GIAC.holdS)}</p>`);
    out.push(`<div class="stat"><span>${vi.bien.giacSau}</span><span data-dao-sau="${id}"></span></div>`);
  }
  if (d.dot) out.push(`<div class="stat"><span>${vi.bien.giacDot(d.dot)}</span><span>🏆 ${d.thang}</span></div>`);
  const t = d.tran;
  if (t) {
    const mat = UNIT_TYPES.reduce((n, k) => n + t.mat[k], 0);
    out.push(`<h3>📜 ${vi.bien.tranTitle(t.dot)}</h3>`);
    out.push(`<div class="stat"><span>${t.thang ? `🏆 ${vi.bien.tranThang}` : `💥 ${vi.bien.tranThua}`}</span><span>${vi.bien.tranMat(mat)}</span></div>`);
    if (t.thang) out.push(`<div class="stat"><span>${vi.bien.tranCua}</span><span>${costHtml(state, t.cua)}</span></div>`);
    out.push(`<div class="actions"><button class="btn bronze" data-act="xemDao" data-dao="${id}">🎬 ${vi.bien.xemLai}</button></div>`);
  }
  return out.join('');
}

/**
 * Đếm ngược tới đợt giặc đảo sau, thay tại chỗ. Chuỗi HTML của bảng để trống chỗ này: có số đổi mỗi giây thì
 * bảng dựng lại mỗi khung và cuộn về đầu.
 */
export function fillDao(root: HTMLElement, state: GameState): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-dao-sau]')) {
    const sau = state.dao[el.dataset.daoSau as QuanDaoId]?.sau;
    if (sau !== null && sau !== undefined) el.textContent = formatClock(Math.max(0, sau - state.clock));
  }
}
