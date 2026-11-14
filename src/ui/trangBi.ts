// Bảng tướng: trang bị (bốn ô, chọn món mặc, cường hóa, khóa, phân giải), chỉ số (sáu chỉ số kèm phần của từng
// nguồn, Lực chiến, kỹ năng), kho đồ (lọc theo ô, phân giải hàng loạt). Luật ở `game/trangBi.ts`.

import { HERO_KINDS, type HeroKind } from '../game/battle';
import { BO_CHUONG, BO_CUA, BO_DO, BO_HAI, KHO_DO_MAX, O_DO, PHAM_TRAN, ROI_DO, SKILLS, type BoDo, type Chapter, type ChiSo, type ODo, type SkillId } from '../game/defs';
import { tuongJoined } from '../game/doanhTrai';
import type { GameState } from '../game/game';
import {
  boDem,
  canCuongHoa,
  chinhOf,
  chiSoTuong,
  doMo,
  giaCuongHoa,
  HERO_STATS,
  lucChienVoi,
  monDangMac,
  monO,
  phanGiaiDuoc,
  phuOf,
  satPhanGiai,
  type Mon,
} from '../game/trangBi';
import { vi } from '../text/vi';
import { costHtml, esc } from './format';
import { pageCount } from './xayDung';

export type TuongTab = 'do' | 'chiSo' | 'kho';

/** Chỗ đang xem trong bảng tướng (không thuộc state, không lưu). */
export interface TuongUi {
  hero: HeroKind;
  tab: TuongTab;
  /** Ô đang chọn ở thẻ Trang bị. */
  o: ODo | null;
  /** Món đang chọn. */
  mon: number | null;
  page: number;
  /** Lọc kho đồ theo ô. */
  loc: ODo | 'all';
  /** Nút phân giải đang chờ bấm lần nữa: `mon` cho món đang chọn, `loat` cho phân giải hàng loạt. */
  armed: 'mon' | 'loat' | null;
}

export const newTuongUi = (hero: HeroKind): TuongUi => ({ hero, tab: 'do', o: null, mon: null, page: 0, loc: 'all', armed: null });

/** Số món mỗi trang lưới đồ. */
export const DO_PER_PAGE = 12;

/** Kỹ năng của từng tướng (đã mở hết), để kể ở thẻ Chỉ số. */
const HERO_SKILLS: Record<HeroKind, SkillId[]> = {
  giong: ['phunLua', 'nhoTre'],
  sonTinh: ['bocDoi', 'doiNon'],
  anDuong: ['noThan', 'ruaVang'],
  caoLo: ['lienChau', 'lenhBan'],
  trungTrac: ['voiXung'],
  trungNhi: ['hieuTrieu'],
};

/** Bộ của tướng `kind`. */
const boCuaTuong = (kind: HeroKind): BoDo => BO_DO.find((b) => BO_CUA[b] === kind)!;

/** Các tướng đã về, mặc đồ được. */
export const tuongDo = (s: GameState): HeroKind[] => HERO_KINDS.filter((k) => tuongJoined(s, k));

export const monTen = (m: Pick<Mon, 'bo' | 'o'>): string => vi.trangBi.mon[m.bo][m.o];

/** Phần trăm gọn: 0,044 → "+4,4%". */
export function pct(v: number, sign = true): string {
  const n = Math.round(v * 1000) / 10;
  const t = (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace('.', ',');
  return `${sign ? '+' : ''}${t}%`;
}

const so = (v: number, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');

function chiSoLine(k: ChiSo, v: number, main = false): string {
  const c = vi.trangBi.chiSo[k];
  return `<div class="do-stat ${main ? 'main' : ''}"><span>${c.icon} ${c.name}</span><b>${pct(v)}</b></div>`;
}

/** Ô vuông một món: biểu tượng theo ô, khung màu phẩm, nấc cường hóa, ai đang mặc, đã khóa. */
function monTile(m: Mon, on: boolean): string {
  return `<button class="do-tile pham-${m.pham} ${on ? 'on' : ''}" data-act="pickMon" data-id="${m.id}" aria-label="${esc(monTen(m))}">
    <span class="ic">${vi.trangBi.o[m.o].icon}</span>
    ${m.cuong ? `<i class="cuong">+${m.cuong}</i>` : ''}
    ${m.tuong ? `<i class="who">${vi.ui.tuongIcons[m.tuong]}</i>` : ''}
    ${m.khoa ? '<i class="lock">🔒</i>' : ''}
  </button>`;
}

/** Lưới món, chia trang. */
function monGrid(list: Mon[], ui: TuongUi): string {
  const pages = pageCount(list.length, DO_PER_PAGE);
  const page = Math.min(Math.max(0, ui.page), pages - 1);
  const tiles = list
    .slice(page * DO_PER_PAGE, page * DO_PER_PAGE + DO_PER_PAGE)
    .map((m) => monTile(m, m.id === ui.mon))
    .join('');
  const pager =
    pages > 1
      ? `<div class="xd-pager">
        <button class="xd-pg" data-act="doPage" data-page="${page - 1}" ${page > 0 ? '' : 'disabled'} aria-label="${vi.ui.pagePrev}">‹</button>
        <span class="xd-dots">${Array.from({ length: pages }, (_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}</span>
        <span class="xd-gap"></span>
        <span class="xd-count">${vi.ui.pageOf(page + 1, pages)}</span>
        <button class="xd-pg" data-act="doPage" data-page="${page + 1}" ${page < pages - 1 ? '' : 'disabled'} aria-label="${vi.ui.pageNext}">›</button>
      </div>`
      : '';
  return `<div class="do-grid">${tiles}</div>${pager}`;
}

/** Thông tin một món và các nút: mặc hay tháo (cho tướng đang xem), cường hóa, khóa, phân giải. */
function monDetail(s: GameState, m: Mon, ui: TuongUi): string {
  const t = vi.trangBi;
  const kind = ui.hero;
  const stats = [chiSoLine(m.chinh, chinhOf(m), true), ...m.phu.map((p) => chiSoLine(p.k, phuOf(m, p)))].join('');
  const boOwner = vi.ui.heroNames[BO_CUA[m.bo]];
  const wearing = m.tuong === kind;
  const lcNow = chiSoTuong(s, kind).lucChien;
  const lcWith = wearing ? lcNow : lucChienVoi(s, kind, m);
  const delta = lcWith - lcNow;
  const compare = wearing
    ? ''
    : `<p class="do-compare">${t.lucChien}: ${lcNow} → <b class="${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${lcWith} ${delta > 0 ? '▲' : delta < 0 ? '▼' : ''}</b></p>`;
  const cost = giaCuongHoa(m);
  const check = canCuongHoa(s, m.id);
  const cuong = cost
    ? `<button class="btn small bronze" data-act="cuongHoa" data-id="${m.id}" ${check.ok ? '' : 'disabled'}>${t.cuongHoa} +${m.cuong + 1} · ${costHtml(s, cost)}</button>${
        !check.ok && check.reason !== 'thieuTaiNguyen' ? `<small class="lack">${vi.reasons[check.reason]}</small>` : ''
      }`
    : `<small class="muted">✓ ${t.cuongToiDa}</small>`;
  const sat = `${vi.resources.sat.icon} ${satPhanGiai(m)}`;
  const canBreak = !m.khoa && !m.tuong;
  const armed = ui.armed === 'mon';
  const wear = wearing
    ? `<button class="btn small ghost" data-act="thaoDo" data-id="${m.id}">${t.thao}</button>`
    : `<button class="btn small bronze" data-act="macDo" data-id="${m.id}" data-hero="${kind}">${t.macCho(vi.ui.heroNames[kind])}</button>`;
  return `<div class="do-detail pham-${m.pham}">
    <div class="do-head">
      <span class="do-big pham-${m.pham}">${vi.trangBi.o[m.o].icon}</span>
      <div><h3>${esc(monTen(m))}${m.cuong ? ` +${m.cuong}` : ''}</h3>
      <p class="muted">${t.pham[m.pham]} · ${t.boCua(t.bo[m.bo], boOwner)} · ${t.cap(m.cap)}</p>
      ${m.tuong ? `<p class="muted">${t.dangMac(vi.ui.heroNames[m.tuong])}</p>` : ''}</div>
    </div>
    <div class="do-stats">${stats}</div>
    ${compare}
    <div class="do-actions">
      ${wear}
      <button class="btn small ghost" data-act="khoaDo" data-id="${m.id}">${m.khoa ? t.moKhoa : t.khoa}</button>
      <button class="btn small ${armed ? 'red' : 'ghost'}" data-act="phanGiai" data-id="${m.id}" ${canBreak ? '' : 'disabled'}>${armed ? t.phanGiaiHoi : `${t.phanGiai} · ${sat}`}</button>
    </div>
    <div class="do-actions">${cuong}</div>
  </div>`;
}

/** Dòng hiệu ứng bộ của tướng `kind`: đang có mấy món bộ mình, hai món, bốn món. */
function boLine(s: GameState, kind: HeroKind): string {
  const t = vi.trangBi;
  const bo = boCuaTuong(kind);
  const n = boDem(kind, monDangMac(s, kind));
  const hai = BO_HAI[bo];
  return `<div class="do-bo">
    <b>${t.boOf(t.bo[bo])}</b> <span class="muted">${t.boDem(n)}</span>
    <div class="${n >= 2 ? 'on' : 'off'}">${n >= 2 ? '✓' : '○'} ${t.boHai(`${vi.trangBi.chiSo[hai.k].icon} ${vi.trangBi.chiSo[hai.k].name} ${pct(hai.v)}`)}</div>
    <div class="${n >= 4 ? 'on' : 'off'}">${n >= 4 ? '✓' : '○'} ${t.boBonLine(t.boBon[bo])}</div>
  </div>`;
}

function doTab(s: GameState, ui: TuongUi): string {
  const t = vi.trangBi;
  const kind = ui.hero;
  const slots = O_DO.map((o) => {
    const m = monO(s, kind, o);
    const on = ui.o === o;
    return `<button class="do-slot ${m ? `pham-${m.pham}` : 'empty'} ${on ? 'on' : ''}" data-act="tuongO" data-o="${o}">
      <span class="ic">${t.o[o].icon}</span>
      <span class="nm">${m ? esc(monTen(m)) : t.oTrong}</span>
      <small>${m ? `${t.pham[m.pham]}${m.cuong ? ` +${m.cuong}` : ''}` : t.o[o].name}</small>
    </button>`;
  }).join('');
  let pick = `<p class="muted">${t.chonO}</p>`;
  if (ui.o) {
    const list = s.trangBi.kho
      .filter((m) => m.o === ui.o)
      .map((m) => ({ m, lc: m.tuong === kind ? Infinity : lucChienVoi(s, kind, m) }))
      .sort((a, b) => b.lc - a.lc || b.m.id - a.m.id)
      .map((x) => x.m);
    const sel = list.find((m) => m.id === ui.mon) ?? monO(s, kind, ui.o) ?? list[0];
    pick = list.length
      ? `${monGrid(list, { ...ui, mon: sel?.id ?? null })}${sel ? monDetail(s, sel, ui) : ''}`
      : `<p class="muted">${t.khongCoMon} ${t.nguon}</p>`;
  }
  return `<div class="do-slots">${slots}</div>${boLine(s, kind)}${pick}`;
}

function chiSoTab(s: GameState, kind: HeroKind): string {
  const t = vi.trangBi;
  const c = chiSoTuong(s, kind);
  const st = HERO_STATS[kind];
  const src = (goc: number, d: number) =>
    `<small>${t.goc} ${so(goc)} · ${t.den} ${pct(c.den)} · ${t.huan} ${pct(c.huan)} · ${t.do} ${pct(d)}</small>`;
  const row = (k: ChiSo, value: string, note: string) =>
    `<div class="unit-row"><span class="unit-icon">${t.chiSo[k].icon}</span><span class="unit-info"><b>${t.chiSo[k].name}: ${value}</b>${note}</span></div>`;
  const rows = [
    row('mau', `${Math.round(c.mau)}`, src(st.hp, c.do.mau)),
    row('danh', `${so(c.danh)}`, src(st.dmg, c.do.danh)),
    row('toc', pct(c.do.toc), `<small>${t.nghi(so(c.nghi, 2))}</small>`),
    row('uy', `×${so(c.uy, 2)}`, src(1, c.do.uy)),
    row('giap', pct(c.giap, false), ''),
    row('hoi', pct(c.hoi, false), ''),
  ].join('');
  const bo = boCuaTuong(kind);
  const bo4 = !!c.do.bo4;
  const skills = HERO_SKILLS[kind]
    .map((k) => {
      const cd = SKILLS[k].cooldown;
      const now = cd * (1 - c.hoi);
      const hoi = c.hoi > 0 ? t.hoiGiay(so(cd), so(now)) : t.hoiGoc(so(cd));
      return `<div class="unit-row"><span class="unit-icon">${vi.skills[k].icon}</span><span class="unit-info"><b>${vi.skills[k].name}</b><small>${hoi}</small></span></div>`;
    })
    .join('');
  return `<div class="do-lc">${t.lucChien} <b>${c.lucChien}</b></div>
    <div class="units">${rows}</div>
    <p class="muted">${t.tam}: ${t.o_(c.tam)} · ${t.chay}: ${t.oGiay(c.chay)}</p>
    <h4>${t.kyNang}</h4>
    <div class="units">${skills}</div>
    <p class="muted">${bo4 ? '✓' : '○'} ${t.boBonLine(t.boBon[bo])}</p>
    <p class="muted">${t.fieldNote}</p>`;
}

function khoTab(s: GameState, ui: TuongUi): string {
  const t = vi.trangBi;
  const chips = (['all', ...O_DO] as const)
    .map((o) => `<button class="tab ${ui.loc === o ? 'on' : ''}" data-act="khoLoc" data-o="${o}">${o === 'all' ? t.tatCa : t.o[o].icon}</button>`)
    .join('');
  const list = s.trangBi.kho.filter((m) => ui.loc === 'all' || m.o === ui.loc).sort((a, b) => b.pham - a.pham || b.cap - a.cap || b.cuong - a.cuong || b.id - a.id);
  const sel = list.find((m) => m.id === ui.mon) ?? list[0];
  const loat = phanGiaiDuoc(s, 2);
  const loatSat = loat.reduce((sum, m) => sum + satPhanGiai(m), 0);
  const bulk = loat.length
    ? `<div class="actions"><button class="btn small ${ui.armed === 'loat' ? 'red' : 'ghost'}" data-act="phanGiaiLoat">${
        ui.armed === 'loat' ? t.loatHoi(loat.length) : `${t.loat(loat.length)} · ${vi.resources.sat.icon} ${loatSat}`
      }</button></div><p class="muted">${t.loatNote}</p>`
    : '';
  return `<p class="muted">${t.khoCount(s.trangBi.kho.length, KHO_DO_MAX)} · ${t.nguon}</p>
    <div class="build-tabs do-loc">${chips}</div>
    ${list.length ? `${monGrid(list, { ...ui, mon: sel?.id ?? null })}${sel ? monDetail(s, sel, ui) : ''}` : `<p class="muted">${t.khoRong}</p>`}
    ${bulk}`;
}

/** Nội dung bảng tướng. */
export function tuongHtml(s: GameState, ui: TuongUi): string {
  const t = vi.trangBi;
  if (!doMo(s)) return `<p>${t.chuaMo}</p><p class="muted">${t.nguon}</p>`;
  const heroes = tuongDo(s);
  const chips = heroes
    .map(
      (k) =>
        `<button class="do-hero ${k === ui.hero ? 'on' : ''}" data-act="tuongHero" data-hero="${k}"><span class="ic">${vi.ui.tuongIcons[k]}</span><span class="nm">${vi.ui.heroNames[k]}</span><small>${chiSoTuong(s, k).lucChien}</small></button>`,
    )
    .join('');
  const tabs = (Object.keys(t.tabs) as TuongTab[])
    .map((k) => `<button class="tab ${k === ui.tab ? 'on' : ''}" data-act="tuongTab" data-tab="${k}">${t.tabs[k]}${k === 'kho' ? `<i class="tab-mark">${s.trangBi.kho.length}</i>` : ''}</button>`)
    .join('');
  const body = ui.tab === 'chiSo' ? chiSoTab(s, ui.hero) : ui.tab === 'kho' ? khoTab(s, ui) : doTab(s, ui);
  return `<div class="do-heroes">${chips}</div>
    <div class="build-tabs barracks-tabs">${tabs}</div>
    <div class="do-body">${body}</div>`;
}

/** Dòng ở thẻ màn phó bản: thắng màn này rơi đồ bộ nào, phẩm cao nhất, chắc rơi hay có khi rơi. */
export function roiNoteHtml(s: GameState, chuong: Chapter, first: boolean): string {
  if (!doMo(s)) return '';
  const t = vi.trangBi;
  const bo = BO_CHUONG[chuong].map((b) => t.bo[b]).join(', ');
  const def = ROI_DO[first ? 'manDau' : 'manLai'];
  return `<div class="stat"><span>⚜️ ${t.roi}</span><b>${t.roiNote(bo, t.pham[PHAM_TRAN[chuong]], Math.round(def.p * 100))}</b></div>`;
}

/** Dòng báo món rơi ở bảng kết quả trận. */
export function roiHtml(r: { mon: Mon; sat?: number } | undefined): string {
  if (!r) return '';
  const m = r.mon;
  const name = `<b class="pham-txt-${m.pham}">${vi.trangBi.o[m.o].icon} ${esc(monTen(m))}</b> (${vi.trangBi.pham[m.pham]}, ${vi.trangBi.capNho(m.cap)})`;
  return `<div>${vi.trangBi.roi}: ${name}${r.sat ? ` · ${vi.trangBi.tuPhanGiai(`${vi.resources.sat.icon} ${r.sat}`)}` : ''}</div>`;
}

/** Tướng đầu tiên nên mở bảng: tướng được chọn nếu đã về, không thì tướng đầu đã về. */
export function tuongMo(s: GameState, hero?: HeroKind): HeroKind {
  const list = tuongDo(s);
  return hero && list.includes(hero) ? hero : (list[0] ?? 'giong');
}
