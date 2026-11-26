// Vòng nút quanh công trình (docs/thiet-ke.md mục Giao diện: vòng nút): chạm một công trình thì các nút chức năng của
// nó hiện thành vòng tròn ngay tại chỗ công trình trên màn hình; nút ℹ️ mở bảng đầy đủ như cũ. Nút mang `data-act`,
// `data-id` như nút trong bảng, nên `Hud.onClick` và `main.ts` xử lý y như bấm trong bảng.

import { seaIndex, seaRoute } from '../game/bien';
import { caoLoJoined } from '../game/caoLo';
import { inChapter4, mergeCost, mergeable } from '../game/chuong4';
import { advLook } from '../game/coLoa';
import { BUILDINGS, DON_DAO, UNITS, UNIT_TYPES, U_NO, isDecor, type BuildingType } from '../game/defs';
import {
  canAfford,
  canPlaceUNo,
  canRotateType,
  dienLevel,
  dienNeededFor,
  findBuilding,
  moveCost,
  repairCost,
  uNoRepairCost,
  upgradeCostOf,
  type Building,
  type GameState,
} from '../game/game';
import { giongAppeared } from '../game/giong';
import { canCat, catDuocLoai } from '../game/khoCat';
import { farBankOf } from '../game/map';
import { inChapter2, sonLook } from '../game/son';
import { tetStarted } from '../game/tet';
import { canStartUpgrade, isBusy, jobOf, pendingBuilding, planWallUpgrade, wallComponent, xayMs } from '../game/xay';
import { formatXay, vi } from '../text/vi';
import { buildingName, costHtml, esc } from './format';
import { nutNoi, type NutNoi } from './nutNoi';
import { hetThoHtml, quizLeft, realMs } from './xay';

/** Một nút trên vòng. `the`: mở thẻ xác nhận thay vì làm ngay. `kem`: bấm được nhưng chưa làm được (thẻ nói lý do). */
export interface NutVong {
  act: string;
  id: number;
  hinh: NutNoi;
  nhan: string;
  khoa?: boolean;
  kem?: boolean;
  the?: TheVong;
  /** Thêm `data-*` cho nút: thẻ doanh trại (`tab`), quần đảo (`dao`), chỗ cuộn tới khi mở bảng (`cuon`). */
  data?: Record<string, string>;
}

/** Thẻ xác nhận cạnh vòng: nâng cấp, dỡ, đặt ụ nỏ, cất vào kho. */
export type TheVong = 'nang' | 'do' | 'uNo' | 'cat';

/** Bốn công trình làm nguyên liệu, bánh Tết. */
export const TET_TYPES: BuildingType[] = ['ruongNep', 'vuon', 'chuongLon', 'bep'];

/** Vòng có tối đa chừng này nút (cả ℹ️); nhiều hơn thì vòng chật, chữ đè nhau. */
export const VONG_MAX = 7;

/** Nâng cấp công trình `b`: nhãn, giá, thời gian, làm được không và vì sao; lũy, đê liền đoạn thì kèm nâng cả đoạn. */
export interface NangInfo {
  label: string;
  costHtml: string;
  time: string;
  ok: boolean;
  why: string;
  doan?: { label: string; ok: boolean; costHtml: string; time: string };
}

/** Thông tin nâng cấp, dùng chung cho bảng công trình và thẻ xác nhận của vòng. Không nâng được nữa thì `null`. */
export function nangInfo(state: GameState, b: Building): NangInfo | null {
  const cost = upgradeCostOf(b);
  if (!cost || isBusy(state, b.id)) return null;
  const check = canStartUpgrade(state, b.id);
  const label =
    b.type === 'luy' ? `🧱 Đắp ${vi.ui.wallEarth.toLowerCase()}` : b.type === 'de' ? `🪨 ${vi.ui.dikeStone}` : `⬆ ${vi.ui.upgradeTo(b.level + 1)}`;
  const ms = xayMs(b.type, b.level + 1);
  const time = ms > 0 ? vi.ui.xayTime(formatXay(realMs(state, ms))) : '';
  const why = check.ok
    ? ''
    : check.reason === 'chuaDuCapDien'
      ? `Cần Điện cấp ${dienNeededFor(b.type, b.level + 1)}`
      : check.reason === 'hetTho'
        ? hetThoHtml(state)
        : vi.reasons[check.reason];
  const info: NangInfo = { label, costHtml: costHtml(state, cost), time, ok: check.ok, why };
  // Lũy, đê: nâng cả đoạn liền cùng loại cùng cấp một lượt.
  const run = wallComponent(state, b.id).length;
  if (run > 1) {
    const plan = planWallUpgrade(state, b.id);
    info.doan = {
      label: vi.ui.wallUpgradeAll(label, plan.ok ? plan.value.ids.length : run),
      ok: plan.ok,
      costHtml: costHtml(state, plan.ok ? plan.value.cost : cost),
      time: plan.ok ? vi.ui.xayTime(formatXay(realMs(state, plan.value.ms))) : '',
    };
  }
  return info;
}

/** Chữ nút dỡ theo loại công trình. */
export function doLabel(b: Building): string {
  return isDecor(b.type)
    ? vi.ui.removeDecor
    : b.type === 'de'
      ? vi.ui.removeDike
      : b.type === 'thanh'
        ? vi.ui.removeCitadel
        : b.type === 'congThanh'
          ? vi.ui.removeGate
          : b.type === 'congDe'
            ? vi.ui.removeCong
            : vi.ui.remove;
}

/** Các nút trên vòng của công trình `id` (đã dựng hay đang dựng mới). Không có công trình thì rỗng. */
export function nutCua(state: GameState, id: number): NutVong[] {
  const t = vi.ui.vong;
  const info: NutVong = { act: 'openInfo', id, hinh: 'thongTin', nhan: t.info };
  const b = findBuilding(state, id);
  if (!b) {
    // Công trình đang dựng mới: chỉ có việc xây (bảng có thanh tiến độ, nút hủy) và đố sử.
    if (!pendingBuilding(state, id)) return [];
    return [info, ...quizNut(state, id)];
  }
  const def = BUILDINGS[b.type];
  const out: NutVong[] = [info];
  const battle = state.raid.phase === 'battle';
  if (b.damaged) out.push({ act: 'repair', id, hinh: 'sua', nhan: t.sua, khoa: battle || !canAfford(state, repairCost(b)) });
  const nang = nangInfo(state, b);
  if (nang) out.push({ act: 'vongThe', id, hinh: 'nangCap', nhan: t.nang, the: 'nang', kem: !nang.ok && !nang.doan?.ok });
  out.push(...quizNut(state, id));
  // Dời, Xoay, Dỡ luôn có chỗ; nút riêng của loại chỉ lấp phần còn trống (thừa thì vẫn có trong bảng ℹ️).
  const cuoi: NutVong[] = [{ act: 'startMove', id, hinh: 'doi', nhan: t.doi, khoa: state.raid.phase !== 'idle' || !canAfford(state, moveCost(b)) }];
  if (canRotateType(b.type)) cuoi.push({ act: 'rotateBuilding', id, hinh: 'xoay', nhan: t.xoay });
  if (def.removable) cuoi.push({ act: 'vongThe', id, hinh: 'do', nhan: t.do, the: 'do' });
  else if (catDuocLoai(b.type)) cuoi.push({ act: 'vongThe', id, hinh: 'cat', nhan: t.cat, the: 'cat', kem: !canCat(state, id).ok });
  const rieng = nutRieng(state, b).slice(0, Math.max(0, VONG_MAX - out.length - cuoi.length));
  return [...out, ...rieng, ...cuoi].slice(0, VONG_MAX);
}

/** Nút riêng của từng loại công trình, theo đúng điều kiện hiện nút ấy trong bảng công trình (`Hud.buildingHtml`). */
export function nutRieng(state: GameState, b: Building): NutVong[] {
  const t = vi.ui.vong;
  const id = b.id;
  const out: NutVong[] = [];
  const info = (hinh: NutNoi, nhan: string, data?: Record<string, string>): NutVong => ({ act: 'openInfo', id, hinh, nhan, data });
  if (b.type === 'congDe' && !b.damaged) out.push({ act: 'toggleCong', id, hinh: 'cong', nhan: b.mo ? t.congDong : t.congMo });
  if (b.type === 'doanhTrai') {
    out.push(info('quan', t.quan, { tab: 'quan' }), info('giu', t.giu, { tab: 'giu' }), info('tuong', t.tuong, { tab: 'tuong' }));
  }
  if (UNIT_TYPES.some((k) => UNITS[k].home === b.type)) out.push(info('luyen', t.luyen, { cuon: '[data-act=train]' }));
  if (b.type === 'loRen' && inChapter2(state)) out.push(info('ren', t.ren, { cuon: '[data-act=forgeArms]' }));
  if (b.type === 'dien' && tetStarted(state)) out.push({ act: 'openTet', id, hinh: 'tet', nhan: t.tet });
  if ((b.type === 'loRen' || b.type === 'dien') && giongAppeared(state) && !state.giong.ascended) {
    out.push({ act: 'openGiong', id, hinh: 'tuong', nhan: t.giong });
  }
  if (b.type === 'dien') {
    if (sonLook(state)) out.push({ act: 'openSon', id, hinh: 'tuong', nhan: t.son });
    if (advLook(state)) out.push({ act: 'openAdv', id, hinh: 'tuong', nhan: t.adv });
    if (caoLoJoined(state)) out.push({ act: 'openCaoLo', id, hinh: 'tuong', nhan: t.caoLo });
  }
  if (TET_TYPES.includes(b.type)) out.push({ act: 'openTet', id, hinh: 'tet', nhan: t.tet });
  if (b.type === 'thanh' && b.uNo === 'hu') {
    // Sửa thành trước rồi mới sửa được ụ trên mặt thành.
    const khoa = !!b.damaged || state.raid.phase === 'battle' || !canAfford(state, uNoRepairCost());
    out.push({ act: 'repairUNo', id, hinh: 'uNo', nhan: t.uNoSua, khoa });
  }
  if (b.type === 'thanh' && !b.uNo && inChapter4(state)) {
    out.push({ act: 'vongThe', id, hinh: 'uNo', nhan: t.uNo, the: 'uNo', kem: !canPlaceUNo(state, b.x, b.z).ok });
  }
  if (mergeable(b) && dienLevel(state) >= BUILDINGS.lauNo.minDien) {
    const pair = state.buildings.some((o) => o.id !== b.id && mergeable(o));
    out.push({ act: 'startMerge', id, hinh: 'ghep', nhan: t.ghep, khoa: !pair || state.raid.phase !== 'idle' || !canAfford(state, mergeCost()) });
  }
  if (b.type === 'benKhoi') {
    const dao = seaRoute(b, seaIndex(state, b)).quanDao;
    out.push({ act: 'seeIsland', id, hinh: 'dao', nhan: t.dao, data: { dao } });
    if (dienLevel(state) >= DON_DAO.minDien) out.push({ act: 'openQuanDao', id, hinh: 'phoBan', nhan: t.donDao, data: { dao } });
  }
  if (b.type === 'donBien' && farBankOf(b.x, b.z)) out.push(info('quan', t.linhDong));
  return out;
}

/** Nút đố sử khi công trình đang có việc xây còn lượt hỏi. */
function quizNut(state: GameState, id: number): NutVong[] {
  const v = jobOf(state, id);
  if (!v || !quizLeft(v)) return [];
  return [{ act: 'askQuiz', id: v.id, hinh: 'doSu', nhan: v.cau !== undefined ? vi.ui.vong.doSuCho : vi.ui.vong.doSu }];
}

/** Một nút của vòng (chỗ đứng do `VongNut.update` đặt). */
function nutHtml(n: NutVong, mo: TheVong | null): string {
  const the = (n.the ? ` data-the="${n.the}"` : '') + Object.entries(n.data ?? {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  const cls = `vn-nut${n.kem ? ' kem' : ''}${n.the && n.the === mo ? ' on' : ''}`;
  return `<button class="${cls}" data-act="${n.act}" data-id="${n.id}"${the} aria-label="${esc(n.nhan)}" ${n.khoa ? 'disabled' : ''}>
    <span class="vn-hinh">${nutNoi(n.hinh)}</span><span class="vn-nhan">${esc(n.nhan)}</span></button>`;
}

/** Thẻ xác nhận nâng cấp, dỡ của công trình `b`. */
export function theHtml(state: GameState, b: Building, the: TheVong): string {
  const t = vi.ui.vong;
  const thoi = `<button class="btn ghost small" data-act="vongThe" data-id="${b.id}">${t.thoi}</button>`;
  if (the === 'uNo') {
    const check = canPlaceUNo(state, b.x, b.z);
    const why = check.ok ? '' : `<div class="why">${vi.reasons[check.reason]}</div>`;
    return `<b>${esc(buildingName(b))} · 🎯 ${vi.ui.uNo}</b><div>${costHtml(state, U_NO.cost)}</div><p class="muted">${vi.ui.uNoDesc}</p>${why}
      <div class="btn-pair">${thoi}<button class="btn small" data-act="placeUNo" data-id="${b.id}" ${check.ok ? '' : 'disabled'}>${t.dongY}</button></div>`;
  }
  if (the === 'cat') {
    const check = canCat(state, b.id);
    const why = check.ok ? '' : `<div class="why">${vi.reasons[check.reason]}</div>`;
    return `<b>${esc(buildingName(b))}</b><p class="muted">${t.catHoi}</p>${why}
      <div class="btn-pair">${thoi}<button class="btn small" data-act="catCongTrinh" data-id="${b.id}" ${check.ok ? '' : 'disabled'}>${vi.ui.catBtn}</button></div>`;
  }
  if (the === 'do') {
    return `<b>${esc(buildingName(b))}</b><p class="muted">${t.doHoi}</p>
      <div class="btn-pair">${thoi}<button class="btn small" data-act="removeWall" data-id="${b.id}">${doLabel(b)}</button></div>`;
  }
  const n = nangInfo(state, b);
  if (!n) return '';
  const time = n.time ? `<div class="muted">${n.time}</div>` : '';
  const why = n.why ? `<div class="why">${n.why}</div>` : '';
  const doan = n.doan
    ? `<button class="btn ghost small" data-act="wallUpgradeAll" data-id="${b.id}" ${n.doan.ok ? '' : 'disabled'}>${n.doan.label} · ${n.doan.costHtml}</button>`
    : '';
  return `<b>${esc(buildingName(b))} · ${n.label}</b><div>${n.costHtml}</div>${time}${why}
    <div class="btn-pair">${thoi}<button class="btn small" data-act="upgrade" data-id="${b.id}" ${n.ok ? '' : 'disabled'}>${t.dongY}</button></div>${doan}`;
}

/** Chiếu điểm trên mặt đất (ô, độ cao) ra điểm màn hình, `null` khi không thấy. */
export type Project = (x: number, z: number, lift: number) => { x: number; y: number } | null;

/** Cỡ nút (px, cả vòng ánh) và bán kính vòng nhỏ nhất, lớn nhất. */
const NUT = 54;
const R_MIN = 66;
const R_MAX = 120;

/** Lớp DOM của vòng nút: dựng nút khi danh sách đổi, mỗi khung đặt lại theo chỗ công trình trên màn hình. */
export class VongNut {
  /** Công trình đang có vòng, thẻ xác nhận đang mở. */
  id: number | null = null;
  the: TheVong | null = null;
  private html = '';
  private r = 0;
  private n = 0;
  private readonly ring: HTMLElement;
  private readonly card: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = '<div class="vn-ring"></div><div class="vn-the" hidden></div>';
    this.ring = root.querySelector('.vn-ring')!;
    this.card = root.querySelector('.vn-the')!;
    root.hidden = true;
  }

  show(state: GameState, id: number): void {
    this.id = id;
    this.the = null;
    this.html = '';
    this.refresh(state);
  }

  hide(): void {
    this.id = null;
    this.the = null;
    this.html = '';
    this.root.hidden = true;
  }

  /** Mở thẻ `the` (bấm lại nút đang mở hay nút Thôi thì đóng). */
  toggle(state: GameState, the: TheVong | null): void {
    this.the = the && the !== this.the ? the : null;
    this.refresh(state);
  }

  /** Dựng lại nút và thẻ theo state; chỉ thay DOM khi đổi, để không mất lần chạm. Công trình mất rồi thì tắt vòng. */
  refresh(state: GameState): void {
    if (this.id === null) return;
    const nut = nutCua(state, this.id);
    if (!nut.length) return this.hide();
    const b = findBuilding(state, this.id);
    if (this.the && (!b || !nut.some((n) => n.the === this.the))) this.the = null;
    const card = this.the && b ? theHtml(state, b, this.the) : '';
    const ring = nut.map((n) => nutHtml(n, this.the)).join('');
    const html = ring + '\u0000' + card;
    if (html === this.html) return;
    this.html = html;
    this.ring.innerHTML = ring;
    this.card.innerHTML = card;
    this.card.hidden = !card;
    this.n = 0;
  }

  /**
   * Đặt vòng quanh công trình theo chỗ trên màn hình (mỗi khung). `vung`: phần màn hình không bị dải tài nguyên, dock
   * che; vòng kẹp trong đó. `null`: đang có bảng, ô bật lên, đang đặt công trình thì ẩn (bãi chiến: `project` trả `null`).
   */
  update(state: GameState, project: Project, vung: { left: number; top: number; right: number; bottom: number } | null): void {
    if (this.id === null) return;
    const b = findBuilding(state, this.id) ?? pendingBuilding(state, this.id);
    const def = b && BUILDINGS[b.type];
    const at = b && def ? project(b.x + def.w / 2, b.z + def.d / 2, Math.min(0.4 + 0.15 * Math.max(def.w, def.d), 1.6)) : null;
    // Công trình đã ra ngoài màn hình (kéo cảnh đi, hay camera tới chỗ khác) thì ẩn, không kẹp vòng ở mép.
    const ngoai = !at || at.x < 0 || at.y < 0 || at.x > window.innerWidth || at.y > window.innerHeight;
    if (!vung || !b || !def || !at || ngoai) {
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;
    // Bán kính theo cỡ móng trên màn hình: vòng ôm sát công trình, không nhỏ quá cho nút khỏi chồng lên nhau.
    const a = project(b.x, b.z, 0);
    const c = project(b.x + def.w, b.z + def.d, 0);
    const span = a && c ? Math.hypot(c.x - a.x, c.y - a.y) / 2 : 0;
    const nut = this.ring.children.length;
    const need = nut > 1 ? (NUT + 10) / (2 * Math.sin(Math.PI / nut)) : 0;
    const r = Math.round(Math.min(Math.max(span * 0.8, R_MIN, need), R_MAX));
    const { left, top, right, bottom } = vung;
    const pad = r + NUT / 2 + 6;
    const x = Math.min(Math.max(at.x, left + pad), right - pad);
    const y = Math.min(Math.max(at.y, top + pad), bottom - pad - 14);
    this.ring.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    if (r !== this.r || nut !== this.n) {
      this.r = r;
      this.n = nut;
      // Nút đầu (ℹ️) ở đỉnh vòng, các nút sau xếp đều theo chiều kim đồng hồ.
      [...this.ring.children].forEach((el, i) => {
        const g = (i / nut) * Math.PI * 2 - Math.PI / 2;
        (el as HTMLElement).style.transform = `translate(${(r * Math.cos(g)).toFixed(1)}px, ${(r * Math.sin(g)).toFixed(1)}px) translate(-50%, -50%)`;
      });
    }
    if (!this.card.hidden) {
      // Thẻ xác nhận dưới vòng; không đủ chỗ thì lên trên.
      const cw = this.card.offsetWidth;
      const ch = this.card.offsetHeight;
      const cx = Math.min(Math.max(x - cw / 2, left + 8), right - cw - 8);
      let cy = y + pad + 4;
      if (cy + ch > bottom - 4) cy = Math.max(top + 4, y - pad - ch - 4);
      this.card.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
    }
  }
}
