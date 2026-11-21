// Bảng tướng kiểu túi đồ game nhập vai: hàng tướng (ảnh bán thân), khung hình nhân (hình tướng mặc đúng đồ đang đeo ở
// giữa, bốn ô trang bị hai bên), túi đồ (lưới ảnh món vẽ sẵn, khung màu phẩm, lọc theo ô), thẻ món (mặc, tháo, cường
// hóa, khóa, phân giải), phân giải hàng loạt; thẻ Chỉ số (sáu chỉ số kèm phần của từng nguồn, Lực chiến, kỹ năng).
// Luật ở `game/trangBi.ts`. Ảnh món vẽ sẵn ở `public/anh-do/` (`render/anhDo.ts`); hình tướng vẽ lúc chơi
// (`render/hinhTuong.ts`), bảng nhận qua `AnhTuong`.

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
  lucChienManhNhat,
  lucChienVoi,
  monDangMac,
  monO,
  phuOf,
  satPhanGiai,
  type Mon,
} from '../game/trangBi';
import { ANH_DO_DAU } from '../render/anhDoDau';
import { vi } from '../text/vi';
import { capBarHtml } from './daNgoai';
import { costHtml, esc, skillIconImg } from './format';
import { pageCount } from './xayDung';

export type TuongTab = 'do' | 'chiSo';

/** Chỗ đang xem trong bảng tướng (không thuộc state, không lưu). */
export interface TuongUi {
  hero: HeroKind;
  tab: TuongTab;
  /** Túi đồ đang lọc theo ô nào (null: mọi ô). Chạm một ô trên khung hình nhân thì lọc theo ô ấy. */
  o: ODo | null;
  /** Món đang chọn. */
  mon: number | null;
  page: number;
  /** Chế độ túi đồ: chạm món để xem và mặc, để cường hóa, hay để đánh dấu phân giải. */
  che: TuiChe;
  /** Các món đang đánh dấu để phân giải (chế độ `phan`). */
  chon: number[];
  /** Nút phân giải đang chờ bấm lần nữa: `mon` cho món đang chọn, `chon` cho các món đã đánh dấu. */
  armed: 'mon' | 'chon' | null;
}

export type TuiChe = 'mac' | 'cuong' | 'phan';
export const TUI_CHE: TuiChe[] = ['mac', 'cuong', 'phan'];

export const newTuongUi = (hero: HeroKind): TuongUi => ({ hero, tab: 'do', o: null, mon: null, page: 0, che: 'mac', chon: [], armed: null });

/** Số món mỗi trang lưới đồ (ba hàng năm ô). */
export const DO_PER_PAGE = 15;
/** Màn máy tính (khớp `@media` bảng tướng màn rộng ở style.css): lưới rộng hơn, mỗi trang bốn hàng mười ô. */
const DO_PER_PAGE_PC = 40;
const PC_MEDIA = '(min-width: 1100px) and (min-height: 620px)';

/** Số món mỗi trang theo khổ màn hình đang mở. */
function doPerPage(): number {
  return typeof window !== 'undefined' && window.matchMedia?.(PC_MEDIA).matches ? DO_PER_PAGE_PC : DO_PER_PAGE;
}

/**
 * Ảnh tướng vẽ lúc chơi (main.ts dựng từ `render/hinhTuong.ts`): hình đứng mặc đồ cho khung hình nhân, ảnh bán thân
 * cho hàng tướng. Trả null khi đang vẽ (bảng hiện khung chờ, vẽ xong thì bảng dựng lại).
 */
export interface AnhTuong {
  hinh(hero: HeroKind): string | null;
  ban(hero: HeroKind): string | null;
}

/** Ảnh món vẽ sẵn (một ảnh mỗi món, phẩm vẽ bằng khung). */
export function monUrl(m: Pick<Mon, 'bo' | 'o'>): string {
  const key = `${m.bo}-${m.o}`;
  return `${import.meta.env.BASE_URL}anh-do/${key}.webp?v=${ANH_DO_DAU[key] ?? ''}`;
}

/** Tải sẵn ảnh 24 món lúc rảnh, để mở túi đồ lần đầu là có ảnh ngay. */
export function preloadMon(): void {
  const load = () => {
    for (const bo of BO_DO)
      for (const o of O_DO) {
        const img = new Image();
        img.decoding = 'async';
        img.src = monUrl({ bo, o });
      }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 2000);
}

const monImg = (m: Pick<Mon, 'bo' | 'o'>, cls = '') => `<img class="${cls}" src="${monUrl(m)}" alt="" draggable="false" decoding="async">`;

/** Hình bóng nét mực của ô trống (không dùng biểu tượng chữ): gươm, áo giáp, miện lá, ngọc quý. */
const O_SVG: Record<ODo, string> = {
  vuKhi: '<path d="M44 6 L54 10 L26 38 L22 34 Z"/><path d="M14 34 L30 50"/><path d="M20 44 L12 52 M10 50 L14 54"/>',
  giap: '<path d="M20 12 Q32 18 44 12 L54 20 L48 30 L46 52 Q32 58 18 52 L16 30 L10 20 Z"/><circle cx="32" cy="34" r="7"/><path d="M26 24 Q32 27 38 24"/>',
  phucSuc: '<path d="M14 44 Q32 50 50 44"/><path d="M14 44 L10 22 L22 34 L26 14 L32 30 L38 14 L42 34 L54 22 L50 44"/><path d="M26 44 A6 6 0 0 1 38 44"/>',
  baoVat: '<path d="M20 22 L32 10 L44 22 L32 54 Z"/><path d="M20 22 L44 22 M26 22 L32 54 L38 22 M26 22 L32 10 L38 22"/><path d="M50 10 L50 18 M46 14 L54 14"/>',
};

export function oSvg(o: ODo, cls = 'do-sil'): string {
  return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">${O_SVG[o]}</svg>`;
}

/** Mặt trời trống đồng làm nền khung hình nhân: ngôi sao 14 cánh, các vòng hoa văn. */
const MAT_TROI = (() => {
  const rays = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const b = a + Math.PI / 14;
    const c = a - Math.PI / 14;
    const p = (r: number, t: number) => `${(50 + r * Math.sin(t)).toFixed(1)},${(50 - r * Math.cos(t)).toFixed(1)}`;
    return `${p(11, c)} ${p(30, a)} ${p(11, b)}`;
  }).join(' ');
  return `<svg class="do-sun" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="11"/><polygon points="${rays}"/><circle cx="50" cy="50" r="34" class="r"/><circle cx="50" cy="50" r="38" class="r d"/><circle cx="50" cy="50" r="45" class="r"/><circle cx="50" cy="50" r="49" class="r d"/></svg>`;
})();

/** Kỹ năng của từng tướng (đã mở hết), để kể ở thẻ Chỉ số. */
const HERO_SKILLS: Record<HeroKind, SkillId[]> = {
  giong: ['phunLua', 'nhoTre'],
  sonTinh: ['bocDoi', 'doiNon'],
  anDuong: ['noThan', 'ruaVang'],
  caoLo: ['lienChau', 'lenhBan'],
  trungTrac: ['voiXung'],
  trungNhi: ['hieuTrieu'],
  baTrieu: ['chemCaKinh'],
  trieuQuangPhuc: ['ngayAn'],
  maiThucLoan: ['hacDe'],
  ngoQuyen: ['cocBachDang'],
  lyThuongKiet: ['namQuoc'],
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

/**
 * Ô vuông một món: ảnh món, khung màu phẩm, nấc cường hóa, tướng đang mặc, đã khóa. Chế độ phân giải: chạm để đánh
 * dấu, món khóa hay đang mặc thì mờ; chế độ cường hóa: dấu ▲ khi cường hóa được ngay.
 */
function monTile(s: GameState, m: Mon, ui: TuongUi): string {
  const phan = ui.che === 'phan';
  const khongPhan = phan && (!!m.khoa || !!m.tuong);
  const danhDau = phan && ui.chon.includes(m.id);
  const on = !phan && m.id === ui.mon;
  const len = ui.che === 'cuong' && canCuongHoa(s, m.id).ok;
  return `<button class="do-tile pham-${m.pham} ${on ? 'on' : ''} ${danhDau ? 'chon' : ''} ${khongPhan ? 'mo' : ''}" data-act="${phan ? 'chonMon' : 'pickMon'}" data-id="${m.id}" aria-label="${esc(monTen(m))}" ${khongPhan ? 'disabled' : ''} ${phan ? `aria-pressed="${danhDau}"` : ''}>
    ${monImg(m)}
    ${m.cuong ? `<i class="cuong">+${m.cuong}</i>` : ''}
    ${m.tuong ? `<i class="who">${vi.ui.tuongIcons[m.tuong]}</i>` : ''}
    ${m.khoa ? '<i class="lock">🔒</i>' : ''}
    ${len ? '<i class="len">▲</i>' : ''}
    ${danhDau ? '<i class="ck">✓</i>' : ''}
  </button>`;
}

/** Lưới món, chia trang. */
function monGrid(s: GameState, list: Mon[], ui: TuongUi): string {
  const per = doPerPage();
  const pages = pageCount(list.length, per);
  const page = Math.min(Math.max(0, ui.page), pages - 1);
  const tiles = list
    .slice(page * per, page * per + per)
    .map((m) => monTile(s, m, ui))
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
      <span class="do-big do-frame pham-${m.pham}">${monImg(m)}</span>
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

/** Một ô trang bị trên khung hình nhân: ảnh món đang mặc (khung màu phẩm) hay hình bóng ô trống. */
function dollSlot(s: GameState, ui: TuongUi, o: ODo): string {
  const t = vi.trangBi;
  const m = monO(s, ui.hero, o);
  const on = ui.o === o;
  return `<button class="do-slot do-frame ${m ? `pham-${m.pham}` : 'empty'} ${on ? 'on' : ''}" data-act="tuongO" data-o="${o}" aria-label="${t.o[o].name}${m ? `: ${esc(monTen(m))}` : ''}">
    ${m ? monImg(m) : oSvg(o)}
    ${m?.cuong ? `<i class="cuong">+${m.cuong}</i>` : ''}
    <span class="nm">${t.o[o].name}</span>
  </button>`;
}

/** Các món trong túi theo ô đang lọc: lọc một ô thì món tướng này mặc đứng đầu rồi theo Lực chiến khi mặc. */
function tuiList(s: GameState, ui: TuongUi): Mon[] {
  const kind = ui.hero;
  if (ui.o)
    return s.trangBi.kho
      .filter((m) => m.o === ui.o)
      .map((m) => ({ m, lc: m.tuong === kind ? Infinity : lucChienVoi(s, kind, m) }))
      .sort((a, b) => b.lc - a.lc || b.m.id - a.m.id)
      .map((x) => x.m);
  return [...s.trangBi.kho].sort((a, b) => b.pham - a.pham || b.cap - a.cap || b.cuong - a.cuong || b.id - a.id);
}

/** Món đang chọn (chế độ mặc, cường hóa): món người chơi chạm, hay món đang mặc ở ô đang lọc. */
function monChon(s: GameState, ui: TuongUi, list: Mon[]): Mon | undefined {
  return list.find((m) => m.id === ui.mon) ?? (ui.o ? (monO(s, ui.hero, ui.o) ?? list[0]) : undefined);
}

/** Thẻ tướng: hình tướng mặc đồ trên nền mặt trời trống đồng, tên, Lực chiến dưới chân. */
function cardHtml(s: GameState, ui: TuongUi, anh: AnhTuong | null): string {
  const t = vi.trangBi;
  const src = anh?.hinh(ui.hero) ?? null;
  const fig = src ? `<img class="do-fig" src="${src}" alt="${vi.ui.heroNames[ui.hero]}" draggable="false">` : `<div class="do-fig wait"><span>${t.dangVe}</span></div>`;
  return `<div class="tg-card">${MAT_TROI}${fig}<div class="tg-ten"><b>${vi.ui.heroNames[ui.hero]}</b><small>${t.lucChien} <span>${chiSoTuong(s, ui.hero).lucChien}</span></small></div></div>`;
}

/** Cạnh thẻ tướng: sáu chỉ số gọn, kỹ năng, nút xem chi tiết chỉ số (hay quay về túi đồ). */
function sideHtml(s: GameState, ui: TuongUi): string {
  const t = vi.trangBi;
  const c = chiSoTuong(s, ui.hero);
  const val: Record<ChiSo, string> = {
    mau: `${Math.round(c.mau)}`,
    danh: so(c.danh),
    toc: pct(c.do.toc),
    uy: `×${so(c.uy, 2)}`,
    giap: pct(c.giap, false),
    hoi: pct(c.hoi, false),
  };
  const rows = (Object.keys(val) as ChiSo[]).map((k) => `<div title="${t.chiSo[k].name}"><span>${t.chiSo[k].icon}</span><b>${val[k]}</b></div>`).join('');
  const sk = HERO_SKILLS[ui.hero].map((k) => `<span class="tg-sk">${skillIconImg(k)}<small>${vi.skills[k].name}</small></span>`).join('');
  const cs = ui.tab === 'chiSo';
  return `<div class="tg-side">
    <div class="tg-stats">${rows}</div>
    <div class="tg-sks">${sk}</div>
    <button class="btn small ghost" data-act="tuongTab" data-tab="${cs ? 'do' : 'chiSo'}">${cs ? t.veTui : t.chiTiet}</button>
  </div>`;
}

/** Bốn ô đồ đang mặc (chạm để lọc túi theo ô) và dòng bộ gọn. */
function eqHtml(s: GameState, ui: TuongUi): string {
  const t = vi.trangBi;
  const bo = boCuaTuong(ui.hero);
  const n = boDem(ui.hero, monDangMac(s, ui.hero));
  return `<div class="tg-eq">${O_DO.map((o) => dollSlot(s, ui, o)).join('')}</div>
    <div class="tg-bo ${n >= 2 ? 'on' : ''}">${n >= 4 ? '✓' : n >= 2 ? '◐' : '○'} ${t.boOf(t.bo[bo])} ${t.boDem(n)}</div>`;
}

/** Thẻ chế độ túi và chip lọc ô. */
function tuiHead(s: GameState, ui: TuongUi): string {
  const t = vi.trangBi;
  const che = TUI_CHE.map(
    (k) => `<button class="tg-che ${k} ${ui.che === k ? 'on' : ''}" data-act="tuongChe" data-che="${k}" aria-pressed="${ui.che === k}">${t.che[k]}</button>`,
  ).join('');
  const chips = ([null, ...O_DO] as const)
    .map(
      (o) =>
        `<button class="do-chip ${ui.o === o ? 'on' : ''}" data-act="khoLoc" data-o="${o ?? 'all'}" aria-label="${o ? t.o[o].name : t.tatCa}">${o ? oSvg(o, 'do-sil sm') : t.tatCa}</button>`,
    )
    .join('');
  return `<div class="tg-ches">${che}</div><div class="do-chips">${chips}<span class="tg-dem">${t.khoCount(s.trangBi.kho.length, KHO_DO_MAX)}</span></div>`;
}

/** Chọn nhanh theo phẩm ở chế độ phân giải: chạm một phẩm thì đánh dấu (hay bỏ dấu) mọi món phẩm ấy phân giải được. */
function chonNhanh(ui: TuongUi, list: Mon[]): string {
  const t = vi.trangBi;
  const phams = [1, 2, 3, 4].filter((p) => list.some((m) => m.pham === p && !m.khoa && !m.tuong));
  if (!phams.length) return '';
  const het = (p: number) => list.filter((m) => m.pham === p && !m.khoa && !m.tuong).every((m) => ui.chon.includes(m.id));
  return `<div class="tg-nhanh"><span>${t.chonNhanh}</span>${phams
    .map((p) => `<button class="do-chip pham-txt-${p} ${het(p) ? 'on' : ''}" data-act="chonPham" data-pham="${p}">${t.pham[p]}</button>`)
    .join('')}${ui.chon.length ? `<button class="do-chip" data-act="boChon">${t.boChon}</button>` : ''}</div>`;
}

/** Túi đồ theo chế độ: lưới món, và ở chế độ mặc là thẻ món đang chọn. */
function tuiHtml(s: GameState, ui: TuongUi): string {
  const t = vi.trangBi;
  const list = tuiList(s, ui);
  if (!list.length) return `${tuiHead(s, ui)}<p class="muted">${ui.o ? t.khongCoMon : t.khoRong} ${t.nguon}</p>`;
  const sel = ui.che === 'phan' ? undefined : monChon(s, ui, list);
  const grid = monGrid(s, list, { ...ui, mon: sel?.id ?? null });
  const nhanh = ui.che === 'phan' ? chonNhanh(ui, list) : '';
  const note = ui.che === 'mac' ? (sel ? monDetail(s, sel, ui) : `<p class="muted">${t.chamMon}</p>`) : `<p class="muted">${t.cheNote[ui.che]}</p>`;
  return `${tuiHead(s, ui)}${nhanh}${grid}${note}`;
}

/** Thanh dưới: nút Mặc mạnh nhất, và theo chế độ là nút cường hóa món đang chọn hay phân giải các món đã đánh dấu. */
function trayHtml(s: GameState, ui: TuongUi): string {
  const t = vi.trangBi;
  const lc = lucChienManhNhat(s, ui.hero);
  const tang = lc.best - lc.now;
  const manh = `<button class="btn tg-manh" data-act="macManhNhat" ${tang > 0 ? '' : 'disabled'}>⚡ ${t.macManhNhat}<small>${tang > 0 ? t.lcTang(tang) : t.daManhNhat}</small></button>`;
  let them = '';
  let dong = '';
  if (ui.che === 'cuong') {
    const m = ui.mon !== null ? s.trangBi.kho.find((x) => x.id === ui.mon) : ui.o ? monO(s, ui.hero, ui.o) : undefined;
    const cost = m ? giaCuongHoa(m) : null;
    const check = m ? canCuongHoa(s, m.id) : null;
    if (!m) dong = `<span>${t.chamCuong}</span>`;
    else {
      dong = `<span><b class="pham-txt-${m.pham}">${esc(monTen(m))}</b> +${m.cuong}${cost ? ` → +${m.cuong + 1}` : ''}</span>${
        cost ? `<span class="tg-gia">${costHtml(s, cost)}</span>` : `<span>✓ ${t.cuongToiDa}</span>`
      }`;
      if (cost)
        them = `<button class="btn bronze" data-act="cuongHoa" data-id="${m.id}" ${check?.ok ? '' : 'disabled'}>🔨 ${t.cuongHoa} +${m.cuong + 1}${
          check && !check.ok && check.reason !== 'thieuTaiNguyen' ? `<small>${vi.reasons[check.reason]}</small>` : ''
        }</button>`;
    }
  } else if (ui.che === 'phan') {
    const list = s.trangBi.kho.filter((m) => ui.chon.includes(m.id) && !m.khoa && !m.tuong);
    const sat = list.reduce((sum, m) => sum + satPhanGiai(m), 0);
    dong = `<span>${list.length ? t.daChon(list.length) : t.chamPhan}</span>${list.length ? `<b class="tg-sat">${vi.resources.sat.icon} +${sat}</b>` : ''}`;
    them = `<button class="btn ${ui.armed === 'chon' ? 'red' : 'ghost'} tg-phan" data-act="phanGiaiChon" ${list.length ? '' : 'disabled'}>♻ ${
      ui.armed === 'chon' ? t.chonHoi(list.length) : t.phanGiaiN(list.length)
    }</button>`;
  }
  return `<div class="tg-tray ${them ? 'hai' : ''}">${dong ? `<div class="tg-dong">${dong}</div>` : ''}${manh}${them}</div>`;
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
      return `<div class="unit-row"><span class="unit-icon">${skillIconImg(k, 'sk-ic-lg')}</span><span class="unit-info"><b>${vi.skills[k].name}</b><small>${hoi}</small></span></div>`;
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

/** Ảnh bán thân trên chip tướng: ảnh vẽ lúc chơi, chưa có thì biểu tượng tướng. */
function banHtml(kind: HeroKind, anh: AnhTuong | null): string {
  const src = anh?.ban(kind) ?? null;
  return src ? `<img class="do-ban" src="${src}" alt="" draggable="false">` : `<span class="do-ban ic">${vi.ui.tuongIcons[kind]}</span>`;
}

/**
 * Nội dung bảng tướng (bảng phủ cả màn hình): hàng tướng, thẻ tướng và chỉ số, bốn ô đồ, túi đồ ba chế độ (mặc,
 * cường hóa, phân giải) hay chi tiết chỉ số, thanh nút dưới. Màn dọc xếp chồng; màn ngang ba cột (CSS `.tg`).
 * `them`: phần hud thêm (lối sang bảng truyện từng tướng), nằm cuối phần chi tiết chỉ số.
 */
export function tuongHtml(s: GameState, ui: TuongUi, anh: AnhTuong | null = null, them = ''): string {
  const t = vi.trangBi;
  if (!doMo(s)) return `<p>${t.chuaMo}</p><p class="muted">${t.nguon}</p>${them}`;
  const heroes = tuongDo(s);
  const chips = heroes
    .map(
      (k) =>
        `<button class="do-hero ${k === ui.hero ? 'on' : ''}" data-act="tuongHero" data-hero="${k}">${banHtml(k, anh)}<span class="nm">${vi.ui.heroNames[k]}</span><small>${chiSoTuong(s, k).lucChien}</small></button>`,
    )
    .join('');
  const main =
    ui.tab === 'chiSo'
      ? `<div class="tg-cs">${chiSoTab(s, ui.hero)}${boLine(s, ui.hero)}${capBarHtml(s)}${them}</div>`
      : tuiHtml(s, ui);
  return `<div class="tg">
    <div class="do-heroes tg-heroes">${chips}</div>
    <div class="tg-hero">${cardHtml(s, ui, anh)}${sideHtml(s, ui)}</div>
    <div class="tg-eqs">${eqHtml(s, ui)}</div>
    <div class="tg-tui">${main}</div>
    ${trayHtml(s, ui)}
  </div>`;
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
  const name = `<b class="pham-txt-${m.pham}">${esc(monTen(m))}</b> (${vi.trangBi.pham[m.pham]}, ${vi.trangBi.capNho(m.cap)})`;
  return `<div class="do-roi"><span class="do-mini do-frame pham-${m.pham}">${monImg(m)}</span><span>${vi.trangBi.roi}: ${name}${r.sat ? ` · ${vi.trangBi.tuPhanGiai(`${vi.resources.sat.icon} ${r.sat}`)}` : ''}</span></div>`;
}

/**
 * Nhiều món rơi một lúc (treo máy dã ngoại lúc vắng): gộp món cùng tên, cùng phẩm, cùng cấp làm một ô kèm số lượng,
 * phẩm cao trước, thay vì kể từng món.
 */
export function gomRoiHtml(mons: Mon[]): string {
  if (!mons.length) return '';
  const nhom = new Map<string, { m: Mon; n: number }>();
  for (const m of mons) {
    const k = `${m.bo}-${m.o}-${m.pham}-${m.cap}`;
    const g = nhom.get(k);
    if (g) g.n++;
    else nhom.set(k, { m, n: 1 });
  }
  const list = [...nhom.values()].sort((a, b) => b.m.pham - a.m.pham || b.n - a.n || monTen(a.m).localeCompare(monTen(b.m), 'vi'));
  return `<div class="do-gom">${list
    .map(
      ({ m, n }) =>
        `<div class="do-gom-o" title="${esc(`${monTen(m)} (${vi.trangBi.pham[m.pham]}, ${vi.trangBi.capNho(m.cap)})`)}"><span class="do-mini do-frame pham-${m.pham}">${monImg(m)}${n > 1 ? `<i class="do-sl">×${n}</i>` : ''}</span><small class="pham-txt-${m.pham}">${esc(monTen(m))}</small></div>`,
    )
    .join('')}</div>`;
}

/** Tướng đầu tiên nên mở bảng: tướng được chọn nếu đã về, không thì tướng đầu đã về. */
export function tuongMo(s: GameState, hero?: HeroKind): HeroKind {
  const list = tuongDo(s);
  return hero && list.includes(hero) ? hero : (list[0] ?? 'giong');
}
