// Hướng dẫn chỉ tay (docs/thiet-ke.md mục Lạc hầu và bản lưu: hướng dẫn chỉ tay): làm tối màn hình, khoanh sáng nút
// cần bấm, Lạc hầu nói một hai câu; bấm đúng nút thì sang bước sau. Mục nào tới lúc do luật lo (`game/huongDan.ts`).

import type { BuildingType } from '../game/defs';
import type { GameState } from '../game/game';
import type { HuongDanId } from '../game/huongDan';
import { vi } from '../text/vi';

/**
 * Một bước. `cho`: bộ chọn nút cần bấm (theo `data-act` sẵn có); `null` là bước chỉ có lời, khung nói nằm giữa màn
 * hình, bấm Tiếp. `xem`: chỉ khoanh cho thấy, bấm Tiếp mới sang bước sau (khoanh một vùng, hay nút bấm vào sẽ tiêu
 * của, đổi điều người chơi đã chọn). `chon`: trước bước, tự mở bảng công trình loại ấy (công trình trên cảnh 3D không
 * khoanh được); kinh đô chưa có loại ấy thì bỏ qua bước.
 */
export interface Buoc {
  cho: string | null | ((s: GameState) => string);
  xem?: boolean;
  chon?: BuildingType;
  /** Nút có thể không có (vd. bản game chưa nối máy chủ thì không có thẻ Đấu thật, Đánh thử): không thấy thì bỏ qua bước. */
  coThe?: boolean;
}

export const BUOC: Record<HuongDanId, Buoc[]> = {
  phoBan: [
    { cho: '[data-act=openCampaign]' },
    { cho: (s) => `[data-act=pickStage][data-id="${s.campaign.cleared + 1}"]` },
    { cho: '[data-act=prepareStage]' },
    { cho: '[data-act=march]' },
  ],
  trangBi: [{ cho: '[data-act=tabTuong]' }, { cho: '.tg [data-act=tuongO]', xem: true }, { cho: '[data-act=macManhNhat]' }],
  daNgoai: [
    { cho: '[data-act=goDaNgoai]' },
    { cho: '.da-heroes', xem: true },
    { cho: '[data-act=daVao]' },
  ],
  thuThach: [
    { cho: '[data-act=openCampaign]' },
    { cho: '[data-act=pickStage][data-id="1"]' },
    { cho: '[data-act=prepareChallenge]', xem: true },
    { cho: '[data-act=openHuan]' },
  ],
  thanThu: [
    { cho: '[data-act=goThanThu]' },
    { cho: '[data-act=thuAn]', xem: true },
    { cho: '[data-act=thuChon]', xem: true },
  ],
  dauThanh: [
    { cho: '[data-act=goDau]' },
    { cho: '[data-act=dauMode][data-mode=thu]', coThe: true },
    { cho: null },
  ],
  mauKinhDo: [{ cho: '[data-act=openBuild]' }, { cho: '[data-act=buildTab][data-tab=mau]' }, { cho: '[data-act=applyMau]', xem: true }],
  benKia: [{ cho: '[data-act=openBuild]' }, { cho: null }, { cho: null }],
  congDe: [{ cho: '[data-act=openBuild]' }, { cho: null }],
  tet: [{ cho: '[data-act=openTet]' }, { cho: '[data-act=offerBanh]', xem: true }],
  binhKhi: [{ cho: '[data-act=forgeArms]', xem: true, chon: 'loRen' }],
  // Chưa có thuyền thì bảng bến có nút đóng thuyền, có rồi thì nút mở quần đảo: khoanh nút nào đang có.
  dongDao: [{ cho: '[data-act=buildThuyen], [data-act=openQuanDao]', xem: true, chon: 'benKhoi' }, { cho: null }],
};

/** Chờ nút của bước hiện ra tối đa chừng này (bảng trượt mở có hoạt ảnh); quá thì thôi, không kẹt người chơi. */
const CHO_MS = 4000;
/** Bước `coThe`: chờ chừng này không thấy nút thì sang bước sau. */
const CHO_CO_THE_MS = 1200;

const HD_KEY = 'thoi-dai-van-lang/huong-dan';

/** Cài đặt Hướng dẫn chỉ tay, lưu từng máy; mặc định bật. */
export function huongDanBat(): boolean {
  try {
    return localStorage.getItem(HD_KEY) !== 'tat';
  } catch {
    return true;
  }
}

export function luuHuongDan(on: boolean): void {
  try {
    localStorage.setItem(HD_KEY, on ? 'bat' : 'tat');
  } catch {
    // Không lưu được thì lần sau hướng dẫn bật như mặc định.
  }
}

/** Phần tử đang hiện trên màn (có kích thước) khớp bộ chọn. */
function timNut(sel: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export class ChiTay {
  private el: HTMLDivElement;
  private lo: HTMLDivElement;
  private noi: HTMLDivElement;
  private id: HuongDanId | null = null;
  private buoc = 0;
  private nut: HTMLElement | null = null;
  private tu = 0;
  private raf = 0;
  /** Đang có hộp thoại (vắng mặt, kết quả trận, truyện) đè lên: tạm ẩn, cho chạm qua, đóng hộp thoại thì chỉ tiếp. */
  private nhuong = false;

  /**
   * `chon`: mở bảng công trình đầu tiên loại `type`, trả về có mở được không (main.ts lo, vì phải đóng chế độ đang
   * dở và chọn trên cảnh).
   */
  constructor(
    root: HTMLElement,
    private getState: () => GameState,
    private chon: (type: BuildingType) => boolean,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'chi-tay';
    this.el.hidden = true;
    this.el.innerHTML = '<div class="chi-lo"></div><div class="chi-noi"></div>';
    this.lo = this.el.querySelector('.chi-lo')!;
    this.noi = this.el.querySelector('.chi-noi')!;
    root.appendChild(this.el);
    this.noi.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-chi]')?.dataset.chi;
      if (act === 'bo') this.stop();
      else if (act === 'tiep') this.next();
    });
    // Bắt chạm trước mọi phần khác: chạm trúng nút đang khoanh hay khung nói thì cho qua, chỗ khác thì chặn (kể cả kéo
    // cảnh 3D), để người chơi không lạc khỏi bước đang chỉ.
    for (const ev of ['pointerdown', 'pointerup', 'click', 'touchstart', 'wheel'] as const) {
      window.addEventListener(ev, this.chan, { capture: true, passive: false });
    }
  }

  get dangChi(): boolean {
    return this.id !== null;
  }

  /** Bắt đầu chỉ mục `id` từ bước đầu. */
  start(id: HuongDanId): void {
    this.id = id;
    this.buoc = 0;
    this.el.hidden = false;
    this.batDau();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.id = null;
    this.nhuong = false;
    this.nut = null;
    this.el.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  private batDau(): void {
    this.nut = null;
    this.tu = performance.now();
    this.lo.hidden = true;
    this.noi.hidden = true;
    this.noi.classList.remove('giua');
    const b = BUOC[this.id!][this.buoc];
    // Bảng công trình mở chậm một nhịp sau khi bấm bước trước: mở ngay, không có công trình thì sang bước sau.
    if (b.chon && !this.chon(b.chon)) return this.next();
    if (b.cho === null) this.veLoi();
  }

  /** Bước chỉ có lời: khung nói giữa màn hình, không khoanh nút nào. */
  private veLoi(): void {
    this.veNoi(null);
    this.noi.classList.add('giua');
    this.noi.style.top = '';
    this.noi.style.bottom = '';
    this.noi.hidden = false;
  }

  private next(): void {
    if (!this.id) return;
    this.buoc++;
    if (this.buoc >= BUOC[this.id].length) return this.stop();
    this.batDau();
  }

  private sel(): string | null {
    const b = BUOC[this.id!][this.buoc];
    return typeof b.cho === 'function' ? b.cho(this.getState()) : b.cho;
  }

  private chan = (e: Event): void => {
    if (!this.id || this.nhuong) return;
    const t = e.target as Node | null;
    if (t && this.noi.contains(t)) return;
    const b = BUOC[this.id][this.buoc];
    if (this.nut && t && this.nut.contains(t) && !b.xem) {
      // Bấm trúng: để nút làm việc của nó, xong mới sang bước sau (bảng mới dựng lại thì tìm nút bước sau).
      if (e.type === 'click') setTimeout(() => this.next(), 0);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  /** Mỗi khung đo lại chỗ nút (bảng trượt, đổi khổ màn), đặt khung sáng và khung nói. */
  private loop = (): void => {
    if (!this.id) return;
    this.raf = requestAnimationFrame(this.loop);
    this.nhuong = !!document.querySelector('.modal-back');
    this.el.hidden = this.nhuong;
    if (this.nhuong) {
      this.tu = performance.now();
      return;
    }
    const sel = this.sel();
    if (sel === null) return;
    const nut = timNut(sel);
    if (!nut) {
      this.nut = null;
      this.lo.hidden = true;
      this.noi.hidden = true;
      const coThe = BUOC[this.id][this.buoc].coThe;
      if (performance.now() - this.tu > (coThe ? CHO_CO_THE_MS : CHO_MS)) {
        if (coThe) this.next();
        else this.stop();
      }
      return;
    }
    this.tu = performance.now();
    if (nut !== this.nut) {
      this.nut = nut;
      this.veNoi(nut);
      // Nút nằm ngoài chỗ đang cuộn của bảng thì cuộn tới.
      nut.scrollIntoView({ block: 'nearest' });
    }
    const r = nut.getBoundingClientRect();
    const pad = 6;
    Object.assign(this.lo.style, {
      left: `${r.left - pad}px`,
      top: `${r.top - pad}px`,
      width: `${r.width + pad * 2}px`,
      height: `${r.height + pad * 2}px`,
    });
    this.lo.hidden = false;
    this.noi.hidden = false;
    // Nút ở nửa trên màn thì khung nói nằm dưới nút, không thì nằm trên.
    const vh = window.innerHeight;
    const duoi = r.top + r.height / 2 < vh / 2;
    this.noi.style.top = duoi ? `${Math.min(r.bottom + 14, vh - this.noi.offsetHeight - 8)}px` : '';
    this.noi.style.bottom = duoi ? '' : `${Math.min(vh - r.top + 14, vh - this.noi.offsetHeight - 8)}px`;
  };

  private veNoi(nut: HTMLElement | null): void {
    const id = this.id!;
    const T = vi.huongDan;
    const n = BUOC[id].length;
    const b = BUOC[id][this.buoc];
    // Nút đang khóa thì không bấm được: cho bấm Tiếp thay.
    const tiep = !nut || b.xem || (nut as HTMLButtonElement).disabled;
    this.noi.innerHTML = `<p><b>📜 ${T.lacHau}</b> ${T.buoc[id][this.buoc]}</p>
      <div class="chi-foot"><small>${T.soBuoc(this.buoc + 1, n)}</small>
        <button class="btn small ghost" data-chi="bo">${T.boQua}</button>
        ${tiep ? `<button class="btn small bronze" data-chi="tiep">${this.buoc + 1 < n ? T.tiep : T.xong}</button>` : ''}</div>`;
  }
}
