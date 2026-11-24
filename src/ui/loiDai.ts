// Giao diện Lôi đài Phong Châu (docs/thiet-ke.md mục Kế hoạch: Lôi đài Phong Châu).
//
// - Bảng Lôi đài (nút Lôi đài ở cột bên phải, bước `loiDai` của bản đồ phó bản): nửa trái là bản đồ 50 tầng
//   (`loiDaiMapHtml`), nửa phải là tầng đang chọn, đội giữ đài, thưởng, chọn ba tướng và thần thú, nút Lên đài
//   (`loiDaiHtml`).
// - Màn đánh (`LoiTranUi`): dải thứ tự lượt, thẻ máu nổi trên đầu từng người, ba nút chiêu, Tự đánh, tua nhanh, rời
//   đài, bảng kết quả. Lớp này chỉ vẽ; nhịp trận do `LoiDau` (`ui/loiDaiTran.ts`) lo.

import { LOI_DAI, LOI_LINH, PHAM_TRAN, SKILL_IDS, THAN_THU_IDS, type SkillId, type Chapter, type LoiGiac, type ThanThuId } from '../game/defs';
import type { GameState } from '../game/game';
import {
  CHIEU,
  HIEU_UNG_LOI,
  chieuDuoc,
  chuongTang,
  doiLoi,
  doiTang,
  laLoiTuong,
  laMoc,
  loiDaiMo,
  satTang,
  tangKe,
  tangMo,
  tangQua,
  thuLoi,
  thuTu,
  tuongLoi,
  vongNay,
  type LoiKind,
  type LoiThuong,
  type LoiTran,
  type LoiUnit,
} from '../game/loiDai';
import { chapterOf } from '../game/manVao';
import { capThu, thuCo } from '../game/thanThu';
import { vi } from '../text/vi';
import { skillIconUrl } from './format';
import { thuAnh } from './thanThu';
import { roiHtml } from './trangBi';

const T = () => vi.loiDai;

/** Tên người trên sân: tướng ta, bóng tướng (đội máy), võ sĩ, tướng giặc. */
export function tenLoi(kind: LoiKind, phe: 0 | 1 = 0): string {
  if (laLoiTuong(kind)) {
    const ten = kind === 'lacTuong' ? vi.ui.tuongNames[kind] : vi.ui.heroNames[kind];
    return phe ? T().bong(ten) : ten;
  }
  if (kind in LOI_LINH) return T().voSi[kind];
  return T().giac[kind];
}

export function iconLoi(kind: LoiKind): string {
  if (laLoiTuong(kind)) return vi.ui.tuongIcons[kind];
  if (kind in LOI_LINH) return vi.units[kind as keyof typeof LOI_LINH].icon;
  return vi.enemyIcons[kind as LoiGiac];
}

const THU_ICON: Record<ThanThuId, string> = { thuLac: '🕊️', thuNgua: '🐎', thuGa: '🐓', thuRua: '🐢', thuRong: '🐉' };

/** Tầng đang xem ở bảng: tầng đã chọn nếu còn hợp lệ, không thì tầng kế phải đánh (hay tầng cao nhất đã qua). */
export function tangXem(s: GameState, chon: number | null): number {
  const max = Math.min(tangMo(s), tangQua(s) + 1);
  if (chon && chon >= 1 && chon <= max) return chon;
  return tangKe(s) ?? Math.max(1, tangQua(s));
}

/** Nửa trái: bản đồ tầng, mỗi chương một hàng mười ô; ô mốc có vương miện. */
export function loiDaiMapHtml(s: GameState, chon: number | null): string {
  if (!loiDaiMo(s)) return `<div class="thu-big"><em>🥁</em></div>`;
  const qua = tangQua(s);
  const mo = tangMo(s);
  const xem = tangXem(s, chon);
  let rows = '';
  for (let c = 5; c >= 1; c--) {
    let cells = '';
    for (let i = 1; i <= LOI_DAI.moiChuong; i++) {
      const t = (c - 1) * LOI_DAI.moiChuong + i;
      const cls = t <= qua ? 'qua' : t === qua + 1 && t <= mo ? 'ke' : 'khoa';
      const duoc = t <= mo && t <= qua + 1;
      cells += `<button class="loi-o ${cls} ${laMoc(t) ? 'moc' : ''} ${t === xem ? 'on' : ''}" data-act="loiTang" data-id="${t}" ${duoc ? '' : 'disabled'} aria-label="${T().tang(t)}">${laMoc(t) ? '👑' : t}</button>`;
    }
    rows += `<div class="loi-hang ${c * LOI_DAI.moiChuong <= mo ? '' : 'khoa'}"><small>${T().chuong(c)}</small><div>${cells}</div></div>`;
  }
  return `<div class="loi-map"><h3>🥁 ${T().ten}</h3><p class="muted small">${T().daQua(qua, LOI_DAI.tang)}</p>${rows}</div>`;
}

/** Nửa phải: tầng đang xem, đội giữ đài, thưởng, chọn đội và thú, nút Lên đài. */
export function loiDaiHtml(s: GameState, chon: number | null): string {
  const L = T();
  if (!loiDaiMo(s)) return `<h3>🥁 ${L.title}</h3><p>${L.locked}</p>`;
  const tang = tangXem(s, chon);
  const may = doiTang(tang);
  const qua = tangQua(s);
  const daQua = tang <= qua;
  const chuong = Math.min(chuongTang(tang), chapterOf(s)) as Chapter;
  const doiMay = may.doi.map((d) => `<span class="loi-chip dich"><em>${iconLoi(d.kind)}</em>${tenLoi(d.kind, 1)}</span>`).join('') +
    (may.thu ? `<span class="loi-chip dich"><em>${THU_ICON[may.thu.kind]}</em>${L.thuBong(vi.thanThu.ten[may.thu.kind], may.thu.cap)}</span>` : '');
  const pham = vi.trangBi.pham[Math.min(laMoc(tang) ? 3 : 2, PHAM_TRAN[chuong])];
  const thuong = daQua
    ? `<p class="muted small">${L.thuongDa}</p>`
    : `<div class="stat"><span>🎁 ${L.thuong}</span><b>${vi.resources.sat.icon} ${satTang(tang)} · ${L.thuongMon(pham)}</b></div>`;
  const doi = doiLoi(s);
  const chips = tuongLoi(s)
    .map((k) => {
      const i = doi.indexOf(k);
      const full = i < 0 && doi.length >= LOI_DAI.doi;
      return `<button class="da-hero ${i >= 0 ? 'on' : ''}" data-act="loiDoi" data-hero="${k}" ${full ? 'disabled' : ''}><em>${vi.ui.tuongIcons[k]}</em><span>${vi.ui.tuongNames[k]}</span><small>${i >= 0 ? i + 1 : ''}</small></button>`;
    })
    .join('');
  const co = thuCo(s);
  const theo = thuLoi(s);
  const thu = co.length
    ? `<div class="loi-thu">${THAN_THU_IDS.filter((k) => co.includes(k))
        .map((k) => `<button class="loi-thu-o ${k === theo ? 'on' : ''}" data-act="loiThu" data-thu="${k}" title="${L.thuKy[k]}">${thuAnh(k)}<small>${vi.thanThu.ten[k]} · ${vi.thanThu.cap(capThu(s, k))}</small></button>`)
        .join('')}</div>${theo ? `<p class="muted small">${L.thuKy[theo]}</p>` : ''}`
    : `<p class="muted small">🔒 ${L.thuKhoa}</p>`;
  const khoa = tangKe(s) === null && qua < LOI_DAI.tang ? `<p class="muted small">🔒 ${L.khoaChuong(chapterOf(s) + 1)}</p>` : '';
  return `<h3>🥁 ${laMoc(tang) ? L.tangMoc(tang) : L.tang(tang)}</h3>
    ${laMoc(tang) ? `<p class="muted">${L.moc[tang / LOI_DAI.moiChuong - 1]}</p>` : `<p class="muted small">${L.intro}</p>`}
    <h4>${L.doiMay}</h4><div class="loi-chips">${doiMay}</div>
    ${thuong}
    <h4>${L.doiTa}</h4><div class="da-heroes loi-doi">${chips}</div><p class="muted small">${L.doiNote}</p>
    <h4>${L.thuTitle}</h4>${thu}
    <div class="da-btns"><button class="btn bronze" data-act="loiVao" data-id="${tang}" ${doi.length < LOI_DAI.doi ? 'disabled' : ''}>${doi.length < LOI_DAI.doi ? L.canBa : daQua ? L.vaoLai : L.vao}</button></div>
    ${khoa}<p class="muted small">${L.note}</p>`;
}

/** Bảng kết quả trận. */
export function loiKetQuaHtml(s: GameState, b: LoiTran, thuong: LoiThuong | null): string {
  const L = T();
  const thang = b.kq === 'thang';
  const ke = tangKe(s);
  const body = thang
    ? thuong
      ? `<p class="loi-ban">👑 ${L.vuaBan}</p><div class="stat"><span>${vi.resources.sat.icon} ${vi.resources.sat.name}</span><b>+${thuong.sat}</b></div>${roiHtml(thuong.roi ?? undefined)}`
      : `<p class="muted">${L.khongThuong}</p>`
    : `<p class="muted">${b.tg >= LOI_DAI.vong ? `${L.thuaHet}. ` : ''}${L.thuaNote}</p>`;
  const nut =
    (thang && ke && ke === b.tang + 1 ? `<button class="btn bronze" data-act="loiTiep">${L.tiep} · ${L.tang(ke)}</button>` : '') +
    `<button class="btn ${thang ? 'ghost' : 'bronze'}" data-act="loiLai">${L.lai}</button><button class="btn ghost" data-act="loiVe">${L.ve}</button>`;
  return `<div class="loi-kq-the ${thang ? 'thang' : 'thua'}"><h2>${thang ? `🏆 ${L.thang}` : `🏳️ ${L.thua}`}</h2><p><b>${laMoc(b.tang) ? L.tangMoc(b.tang) : L.tang(b.tang)}</b></p>${body}<div class="loi-kq-nut">${nut}</div></div>`;
}

/** Biểu tượng chiêu: ảnh kỹ năng vẽ sẵn của tướng; chiêu chỉ có trên lôi đài và đòn thường thì ô cùng khung có hình chữ. */
function chieuIcon(c: string): string {
  return (SKILL_IDS as string[]).includes(c)
    ? `<img class="loi-ic" src="${skillIconUrl(c as SkillId)}" alt="" draggable="false" decoding="async">`
    : `<span class="loi-ic emo">${T().chieuIcon[c]}</span>`;
}

const tenAi = (b: LoiTran, id: number): string => (id < 0 ? vi.thanThu.ten[b.thu[-1 - id]!.kind] : tenLoi(b.units[id].kind, b.units[id].phe));
const pheAi = (b: LoiTran, id: number): 0 | 1 => (id < 0 ? ((-1 - id) as 0 | 1) : b.units[id].phe);

/** Màn đánh: dựng một lần khi vào trận, sau đó chỉ thay phần đổi. */
export class LoiTranUi {
  readonly el: HTMLElement;
  private readonly top: HTMLElement;
  private readonly the: HTMLElement;
  private readonly noi: HTMLElement;
  private readonly luot: HTMLElement;
  private readonly chieu: HTMLElement;
  private readonly nut: HTMLElement;
  private readonly kq: HTMLElement;
  private theEls = new Map<number, HTMLElement>();
  private topHtml = '';
  private chieuHtml = '';
  private nutHtml = '';
  /** Ảnh đại diện của người trên sân (main.ts vẽ từ mô hình); null là chưa vẽ xong, tạm hiện biểu tượng chữ. */
  anh: ((kind: LoiKind) => string | null) | null = null;

  /** Hình đại diện của người hay thần thú `id`: ảnh bán thân tướng, ảnh động thần thú. */
  private av(b: LoiTran, id: number): string {
    if (id < 0) return thuAnh(b.thu[-1 - id]!.kind);
    const kind = b.units[id].kind;
    const src = this.anh?.(kind) ?? null;
    return src ? `<img src="${src}" alt="" draggable="false">` : iconLoi(kind);
  }

  constructor(root: HTMLElement, onAct: (act: string, el: HTMLElement) => void) {
    this.el = document.createElement('section');
    this.el.className = 'loi-tran';
    this.el.hidden = true;
    this.el.innerHTML = `<div class="loi-top"></div><div class="loi-the"></div><div class="loi-noi"></div>
      <footer class="loi-bar"><div class="loi-luot"></div><div class="loi-chieu"></div><div class="loi-nut"></div></footer>
      <div class="loi-kq" hidden></div>`;
    root.appendChild(this.el);
    this.top = this.el.querySelector('.loi-top')!;
    this.the = this.el.querySelector('.loi-the')!;
    this.noi = this.el.querySelector('.loi-noi')!;
    this.luot = this.el.querySelector('.loi-luot')!;
    this.chieu = this.el.querySelector('.loi-chieu')!;
    this.nut = this.el.querySelector('.loi-nut')!;
    this.kq = this.el.querySelector('.loi-kq')!;
    this.el.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!el || (el as HTMLButtonElement).disabled) return;
      e.stopPropagation();
      onAct(el.dataset.act!, el);
    });
  }

  mo(b: LoiTran): void {
    this.el.hidden = false;
    this.kq.hidden = true;
    this.kq.innerHTML = '';
    this.noi.innerHTML = '';
    this.topHtml = this.chieuHtml = this.nutHtml = '';
    this.theEls.clear();
    this.the.innerHTML = b.units
      .map((u) => `<button class="loi-the-o p${u.phe}" data-act="loiMuc" data-id="${u.id}"><b>${tenLoi(u.kind, u.phe)}</b><i><u></u></i><span class="hu"></span></button>`)
      .join('');
    this.the.querySelectorAll<HTMLElement>('.loi-the-o').forEach((el) => this.theEls.set(Number(el.dataset.id), el));
  }

  dong(): void {
    this.el.hidden = true;
    this.kq.hidden = true;
  }

  /** Dải trên: tầng, vòng, thứ tự lượt sắp tới. */
  veTop(b: LoiTran): void {
    const L = T();
    const tt = thuTu(b, 8)
      .map((id, i) => `<span class="loi-tt-o p${pheAi(b, id)} ${i === 0 && b.dang === id ? 'on' : ''}" title="${tenAi(b, id)}">${this.av(b, id)}</span>`)
      .join('');
    const html = `<b>${laMoc(b.tang) ? `👑 ${L.tang(b.tang)}` : L.tang(b.tang)}</b><span>${L.vong(vongNay(b), LOI_DAI.vong)}</span><div class="loi-tt">${tt}</div>`;
    if (html !== this.topHtml) {
      this.topHtml = html;
      this.top.innerHTML = html;
    }
  }

  /** Thẻ máu: máu, hiệu ứng, người ngã, người chọn được làm mục tiêu. */
  veThe(b: LoiTran, muc: number[]): void {
    for (const u of b.units) {
      const el = this.theEls.get(u.id);
      if (!el) continue;
      el.classList.toggle('nga', u.nga);
      el.classList.toggle('muc', muc.includes(u.id));
      el.classList.toggle('luot', b.dang === u.id);
      (el.querySelector('u') as HTMLElement).style.width = `${Math.max(0, (100 * u.mau) / u.mauMax).toFixed(1)}%`;
      const hu = HIEU_UNG_LOI.filter((k) => u.hu[k])
        .map((k) => `<em title="${T().huTen[k]}">${T().huIcon[k]}<sub>${u.hu[k]!.luot}</sub></em>`)
        .join('');
      const span = el.querySelector('.hu') as HTMLElement;
      if (span.innerHTML !== hu) span.innerHTML = hu;
    }
  }

  /** Đặt thẻ máu theo chỗ người trên màn hình. */
  datThe(b: LoiTran, at: (id: number) => { x: number; y: number } | null): void {
    const r = this.el.getBoundingClientRect();
    for (const u of b.units) {
      const el = this.theEls.get(u.id);
      const p = at(u.id);
      if (!el || !p) continue;
      el.style.transform = `translate(${(p.x - r.left).toFixed(1)}px, ${(p.y - r.top).toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  /** Thanh dưới: lượt của ai, ba nút chiêu của người ấy (người chơi cầm), nút Tự đánh, tua, rời đài. */
  veBar(b: LoiTran, o: { cam: LoiUnit | null; chon: number | null; tuDanh: boolean; nhanh: boolean; roiHoi: boolean }): void {
    const L = T();
    const u = o.cam;
    let luot = '';
    let chieu = '';
    if (b.dang !== null && !b.kq) {
      const def = u && o.chon !== null ? CHIEU[u.chieu[o.chon]] : null;
      const goi = u && def ? (def.muc === 'dich' ? ` · ${L.chonMuc}` : def.muc === 'dong' ? ` · ${L.chonDong}` : '') : '';
      luot = `<b class="p${pheAi(b, b.dang)}">${L.luotCua(tenAi(b, b.dang))}</b>${goi}`;
    }
    if (u) {
      chieu = u.chieu
        .map((c, i) => {
          const duoc = chieuDuoc(b, u, i);
          const cho = u.cd[i] > 0 ? `<i class="cho">${L.choLuot(u.cd[i])}</i>` : '';
          return `<button class="loi-chieu-o ${o.chon === i ? 'on' : ''} ${i ? 'ky' : ''}" data-act="loiChieu" data-id="${i}" title="${L.chieuTa[c]}" ${duoc ? '' : 'disabled'}>
            ${chieuIcon(c)}<b>${L.chieu[c]}</b>${cho}</button>`;
        })
        .join('');
    }
    if (this.luot.innerHTML !== luot) this.luot.innerHTML = luot;
    if (chieu !== this.chieuHtml) {
      this.chieuHtml = chieu;
      this.chieu.innerHTML = chieu;
    }
    const nut = `<button class="btn small ${o.tuDanh ? 'bronze' : 'ghost'}" data-act="loiTuDanh">${L.tuDanh}${o.tuDanh ? ' ✓' : ''}</button>
      <button class="btn small ${o.nhanh ? 'bronze' : 'ghost'}" data-act="loiNhanh">${L.nhanh(o.nhanh ? 2 : 1)}</button>
      <button class="btn small ghost ${o.roiHoi ? 'hoi' : ''}" data-act="loiRoi" title="${L.roi}">${o.roiHoi ? `🏳️ ${L.roi}?` : '🏳️'}</button>`;
    if (nut !== this.nutHtml) {
      this.nutHtml = nut;
      this.nut.innerHTML = nut;
    }
  }

  /** Chữ nổi (số máu mất, hồi, hiệu ứng) ở điểm màn hình `p`. */
  noiChu(text: string, p: { x: number; y: number } | null, tone: 'mat' | 'hoi' | 'hu'): void {
    if (!p) return;
    const r = this.el.getBoundingClientRect();
    const el = document.createElement('span');
    el.className = `loi-noi-o ${tone}`;
    el.textContent = text;
    el.style.left = `${p.x - r.left + (Math.random() - 0.5) * 24}px`;
    el.style.top = `${p.y - r.top - 26}px`;
    this.noi.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  /** Tên chiêu hiện giữa màn hình khi có người ra chiêu riêng. */
  bao(text: string, phe: 0 | 1): void {
    const el = document.createElement('span');
    el.className = `loi-bao p${phe}`;
    el.textContent = text;
    this.noi.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  ketQua(html: string): void {
    this.kq.innerHTML = html;
    this.kq.hidden = false;
  }
}
