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
  lucChienVoi,
  monDangMac,
  monO,
  phanGiaiDuoc,
  phuOf,
  satPhanGiai,
  type Mon,
} from '../game/trangBi';
import { ANH_DO_DAU } from '../render/anhDoDau';
import { vi } from '../text/vi';
import { capBarHtml } from './daNgoai';
import { costHtml, esc } from './format';
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
  /** Nút phân giải đang chờ bấm lần nữa: `mon` cho món đang chọn, `loat` cho phân giải hàng loạt. */
  armed: 'mon' | 'loat' | null;
}

export const newTuongUi = (hero: HeroKind): TuongUi => ({ hero, tab: 'do', o: null, mon: null, page: 0, armed: null });

/** Số món mỗi trang lưới đồ (ba hàng năm ô trên điện thoại). */
export const DO_PER_PAGE = 15;

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

/** Ô vuông một món: ảnh món, khung màu phẩm, nấc cường hóa, tướng đang mặc, đã khóa. */
function monTile(m: Mon, on: boolean): string {
  return `<button class="do-tile pham-${m.pham} ${on ? 'on' : ''}" data-act="pickMon" data-id="${m.id}" aria-label="${esc(monTen(m))}">
    ${monImg(m)}
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

/** Khung hình nhân: nền đồng có mặt trời trống đồng, hình tướng mặc đồ giữa, Vũ khí, Phục sức trái, Giáp, Bảo vật phải. */
function dollHtml(s: GameState, ui: TuongUi, anh: AnhTuong | null): string {
  const t = vi.trangBi;
  const src = anh?.hinh(ui.hero) ?? null;
  const fig = src ? `<img class="do-fig" src="${src}" alt="${vi.ui.heroNames[ui.hero]}" draggable="false">` : `<div class="do-fig wait"><span>${t.dangVe}</span></div>`;
  return `<div class="do-doll">
    ${MAT_TROI}
    <div class="do-col">${dollSlot(s, ui, 'vuKhi')}${dollSlot(s, ui, 'phucSuc')}</div>
    <div class="do-mid">${fig}</div>
    <div class="do-col">${dollSlot(s, ui, 'giap')}${dollSlot(s, ui, 'baoVat')}</div>
    <div class="do-plate"><span>${vi.ui.heroNames[ui.hero]}</span><span>${t.lucChien} <b>${chiSoTuong(s, ui.hero).lucChien}</b></span></div>
  </div>`;
}

/** Túi đồ: lọc theo ô, lưới ảnh món, thẻ món đang chọn, phân giải hàng loạt. */
function tuiHtml(s: GameState, ui: TuongUi): string {
  const t = vi.trangBi;
  const kind = ui.hero;
  const chips = ([null, ...O_DO] as const)
    .map(
      (o) =>
        `<button class="do-chip ${ui.o === o ? 'on' : ''}" data-act="khoLoc" data-o="${o ?? 'all'}" aria-label="${o ? t.o[o].name : t.tatCa}">${o ? oSvg(o, 'do-sil sm') : t.tatCa}</button>`,
    )
    .join('');
  let list: Mon[];
  if (ui.o) {
    // Lọc một ô: món tướng này đang mặc đứng đầu, rồi theo Lực chiến khi mặc.
    list = s.trangBi.kho
      .filter((m) => m.o === ui.o)
      .map((m) => ({ m, lc: m.tuong === kind ? Infinity : lucChienVoi(s, kind, m) }))
      .sort((a, b) => b.lc - a.lc || b.m.id - a.m.id)
      .map((x) => x.m);
  } else list = [...s.trangBi.kho].sort((a, b) => b.pham - a.pham || b.cap - a.cap || b.cuong - a.cuong || b.id - a.id);
  const sel = list.find((m) => m.id === ui.mon) ?? (ui.o ? (monO(s, kind, ui.o) ?? list[0]) : undefined);
  const loat = phanGiaiDuoc(s, 2);
  const loatSat = loat.reduce((sum, m) => sum + satPhanGiai(m), 0);
  const bulk = loat.length
    ? `<div class="actions"><button class="btn small ${ui.armed === 'loat' ? 'red' : 'ghost'}" data-act="phanGiaiLoat">${
        ui.armed === 'loat' ? t.loatHoi(loat.length) : `${t.loat(loat.length)} · ${vi.resources.sat.icon} ${loatSat}`
      }</button></div><p class="muted">${t.loatNote}</p>`
    : '';
  const empty = ui.o ? `${t.khongCoMon} ${t.nguon}` : `${t.khoRong} ${t.nguon}`;
  return `<div class="do-tui-head"><b>${t.tui}</b><span class="muted">${t.khoCount(s.trangBi.kho.length, KHO_DO_MAX)}</span></div>
    <div class="do-chips">${chips}</div>
    ${list.length ? `${monGrid(list, { ...ui, mon: sel?.id ?? null })}${sel ? monDetail(s, sel, ui) : `<p class="muted">${t.chamMon}</p>`}` : `<p class="muted">${empty}</p>`}
    ${bulk}`;
}

function doTab(s: GameState, ui: TuongUi, anh: AnhTuong | null): string {
  return `${dollHtml(s, ui, anh)}${boLine(s, ui.hero)}${tuiHtml(s, ui)}`;
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

/** Ảnh bán thân trên chip tướng: ảnh vẽ lúc chơi, chưa có thì biểu tượng tướng. */
function banHtml(kind: HeroKind, anh: AnhTuong | null): string {
  const src = anh?.ban(kind) ?? null;
  return src ? `<img class="do-ban" src="${src}" alt="" draggable="false">` : `<span class="do-ban ic">${vi.ui.tuongIcons[kind]}</span>`;
}

/** Nội dung bảng tướng. */
export function tuongHtml(s: GameState, ui: TuongUi, anh: AnhTuong | null = null): string {
  const t = vi.trangBi;
  if (!doMo(s)) return `<p>${t.chuaMo}</p><p class="muted">${t.nguon}</p>`;
  const heroes = tuongDo(s);
  const chips = heroes
    .map(
      (k) =>
        `<button class="do-hero ${k === ui.hero ? 'on' : ''}" data-act="tuongHero" data-hero="${k}">${banHtml(k, anh)}<span class="nm">${vi.ui.heroNames[k]}</span><small>${chiSoTuong(s, k).lucChien}</small></button>`,
    )
    .join('');
  const tabs = (Object.keys(t.tabs) as TuongTab[])
    .map((k) => `<button class="tab ${k === ui.tab ? 'on' : ''}" data-act="tuongTab" data-tab="${k}">${t.tabs[k]}${k === 'do' ? `<i class="tab-mark">${s.trangBi.kho.length}</i>` : ''}</button>`)
    .join('');
  const body = ui.tab === 'chiSo' ? chiSoTab(s, ui.hero) : doTab(s, ui, anh);
  // Cấp chung dã ngoại (chỉ có tác dụng ở dã ngoại): dải mỏng dưới hàng chip tướng.
  return `<div class="do-heroes">${chips}</div>${capBarHtml(s)}
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
