// Bảng Bản đồ Việt Nam (docs/thiet-ke.md mục Kế hoạch: bản đồ Việt Nam, 34 tỉnh, chức Bồ chính; PR 1): bản đồ SVG
// kiểu Đông Sơn (nền giấy dó, viền mực, hoa văn trống đồng ở góc), tô theo trạng thái tỉnh (đất Văn Lang, chưa quy
// về), tỉnh mình viền vàng; chạm tỉnh thì bảng bên hiện thẻ tỉnh; kéo, phóng bằng hai ngón (máy tính: lăn chuột).
// Hoàng Sa, Trường Sa luôn hiện: chấm đảo giữ cỡ khi phóng, tên quần đảo luôn ghi; phóng to mà hai quần đảo ra
// ngoài khung thì khung chèn ở góc vẽ lại hai quần đảo.
//
// Bản đồ là một phần tử dựng một lần (`BanDoVN`), mỗi lần bảng phó bản vẽ lại thì gắn lại vào chỗ (`gan`), nên kéo
// phóng không mất; tô màu theo state đổi lớp tại chỗ (`capNhat`).

import { dienTich, giaiTopo, type HinhTinh, type Topo, type Vong } from '../game/banDo';
import type { GameState } from '../game/game';
import {
  choDoiChuc, chucCo, doiTinhDuoc, giapBien, giapBienGioi, langGieng, laDatVanLang, laTinh, muaCon, QUAN_DAO_TINH,
  type TinhId,
} from '../game/vietNam';
import { vi } from '../text/vi';
import { VIET_NAM } from '../game/defs';
import { CHUC_GOP, TINH_IDS, capGop, diemToiDa, hangTinh, luongGop, type BangTinh } from '../game/vietNam';
import { daoTuan, giacRutLuc, giacToiLuc, heChuc, noiDanh, type GiacBang } from '../game/giacChung';
import { GIAC_CHUNG, UNIT_TYPES, type UnitType } from '../game/defs';
import { armySpace, fieldCap, fitArmy } from '../game/doanhTrai';
import { dauError } from './dauThanh';
import { fmt } from './format';

const T = vi.vietNam;
const NS = 'http://www.w3.org/2000/svg';

/** Khung bản đồ (kinh độ, vĩ độ): cả đất liền và hai quần đảo. */
const KHUNG = { x0: 101.9, x1: 117.9, y0: 6.9, y1: 23.6 };
/** Phép chiếu đơn giản: kinh độ co theo vĩ độ giữa (16°), 100 đơn vị mỗi độ vĩ. */
const CO = Math.cos((16 * Math.PI) / 180) * 100;
const px = (lon: number) => (lon - KHUNG.x0) * CO;
const py = (lat: number) => (KHUNG.y1 - lat) * 100;
const W = px(KHUNG.x1);
const H = py(KHUNG.y0);
/** Khung hai quần đảo (kinh, vĩ) cho khung chèn. */
const QD_KHUNG = { hoangSa: [110.9, 15.5, 113, 17.3], truongSa: [111.3, 6.8, 118, 12] } as const;
/** Phóng tối đa; tên tỉnh hiện khi phóng từ `TEN_TU`. */
const K_MAX = 14;
const TEN_TU = 1.7;

const d = (v: Vong) => {
  let s = '';
  for (let i = 0; i < v.length; i++) s += `${i ? 'L' : 'M'}${px(v[i][0]).toFixed(1)} ${py(v[i][1]).toFixed(1)}`;
  return `${s}Z`;
};

const laQuanDao = (v: Vong) =>
  Object.values(QD_KHUNG).some(([x0, y0, x1, y1]) => v.every(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1));

/** Trọng tâm vòng (đơn vị bản đồ). */
function tam(v: Vong): [number, number] {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const [x0, y0] = [px(v[j][0]), py(v[j][1])];
    const [x1, y1] = [px(v[i][0]), py(v[i][1])];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  return a ? [cx / (3 * a), cy / (3 * a)] : [px(v[0][0]), py(v[0][1])];
}

/** Chỗ ghi tên tỉnh dời khỏi trọng tâm cho khỏi đè nhau hay rơi ra ngoài tỉnh (đơn vị bản đồ). */
const DOI_TEN: Record<string, [number, number]> = {
  '21': [-30, -10], '23': [-28, 0], '79': [-6, 6], '03': [28, -12], '04': [-2, 6], '12': [-30, 10], '01': [8, -4], '02': [-6, -6], '05': [6, 6],
};

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/** Hoa văn trống đồng ở góc khung: vòng tròn đồng tâm, ngôi sao giữa, chim Lạc giản lược. */
function trongDong(cx: number, cy: number, r: number): string {
  const sao: string[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = i % 2 ? r * 0.12 : r * 0.34;
    sao.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  const vach: string[] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    vach.push(`M${(cx + r * 0.5 * Math.cos(a)).toFixed(1)} ${(cy + r * 0.5 * Math.sin(a)).toFixed(1)}L${(cx + r * 0.6 * Math.cos(a)).toFixed(1)} ${(cy + r * 0.6 * Math.sin(a)).toFixed(1)}`);
  }
  return `<g class="bdv-trong"><circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.88}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.62}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.48}"/><path d="${vach.join('')}"/><polygon points="${sao.join(' ')}"/></g>`;
}

/** Bản đồ 34 tỉnh: dựng một lần khi tải xong tệp hình. */
export class BanDoVN {
  private hinh: HinhTinh[] | null = null;
  private dangTai = false;
  readonly goc: HTMLDivElement;
  private svg!: SVGSVGElement;
  private nhom!: SVGGElement;
  private tenNhom!: SVGGElement;
  private chen!: HTMLDivElement;
  private tinh = new Map<string, SVGGElement>();
  /** Phóng và dịch của nhóm bản đồ (đơn vị bản đồ). */
  private k = 1;
  private tx = 0;
  private ty = 0;
  private ngon = new Map<number, { x: number; y: number }>();
  private keo: { x: number; y: number; dai: number } | null = null;
  private veLai = 0;
  private lop = '';
  /** Chạm vào tỉnh (không phải kéo). */
  onChon: (id: TinhId) => void = () => {};

  constructor() {
    this.goc = document.createElement('div');
    this.goc.className = 'bdv-ban-do';
    this.goc.innerHTML = `<p class="muted bdv-cho">⏳</p>`;
  }

  /** Tải tệp hình (một lần). */
  private tai(): void {
    if (this.hinh || this.dangTai) return;
    this.dangTai = true;
    fetch(`${import.meta.env.BASE_URL}ban-do/34-tinh.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((t: Topo) => {
        this.hinh = giaiTopo(t);
        this.dung();
        this.lop = '';
        this.capNhatCuoi?.();
      })
      .catch(() => {
        this.goc.innerHTML = `<p class="muted bdv-cho">${T.taiLoi}</p>`;
      })
      .finally(() => (this.dangTai = false));
  }

  private capNhatCuoi: (() => void) | null = null;

  /** Gắn bản đồ vào chỗ trống trong bảng (bảng vừa vẽ lại). */
  gan(cho: Element | null): void {
    if (!cho) return;
    if (this.goc.parentElement !== cho) cho.appendChild(this.goc);
    this.tai();
  }

  private dung(): void {
    const hinh = this.hinh!;
    this.goc.innerHTML = '';
    const svg = el('svg', { viewBox: `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`, class: 'bdv-svg', role: 'img', 'aria-label': T.title });
    svg.innerHTML = `<defs>
        <pattern id="bdv-soc" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" class="bdv-soc-nen"/><path d="M0 0V9" class="bdv-soc-net"/></pattern>
        <pattern id="bdv-song" width="60" height="24" patternUnits="userSpaceOnUse"><path d="M0 12 Q15 4 30 12 T60 12" class="bdv-song"/></pattern>
      </defs>
      <rect class="bdv-bien" x="-4000" y="-4000" width="${W + 8000}" height="${H + 8000}"/>`;
    const nhom = el('g');
    const nen = el('g', { class: 'bdv-dat' });
    const dao = el('g', { class: 'bdv-dao' });
    const ten = el('g', { class: 'bdv-ten' });
    const qd = el('g', { class: 'bdv-qd' });
    // Mặt biển có sóng nhẹ trong khung.
    nhom.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#bdv-song)', class: 'bdv-song-nen' }));
    for (const h of hinh) {
      const g = el('g', { class: 'bdv-tinh', 'data-tinh': h.id });
      const dat: string[] = [];
      const cham: string[] = [];
      let lon = h.manh[0];
      for (const m of h.manh) {
        if (laQuanDao(m[0])) {
          // Đảo nhỏ trong quần đảo: chấm giữ cỡ khi phóng (nét tròn không co giãn).
          const [x, y] = tam(m[0]);
          cham.push(`M${x.toFixed(1)} ${y.toFixed(1)}h0.01`);
          dat.push(m.map(d).join(''));
          continue;
        }
        if (dienTich(m[0]) > dienTich(lon[0]) || laQuanDao(lon[0])) lon = m;
        dat.push(m.map(d).join(''));
      }
      g.appendChild(el('path', { d: dat.join(''), class: 'bdv-mat', 'fill-rule': 'evenodd' }));
      nen.appendChild(g);
      if (cham.length) {
        const c = el('path', { d: cham.join(''), class: 'bdv-cham', 'data-tinh': h.id });
        dao.appendChild(c);
      }
      this.tinh.set(h.id, g);
      const [cx, cy] = tam(lon[0]);
      const [dx, dy] = DOI_TEN[h.id] ?? [0, 0];
      const t = el('text', { x: (cx + dx).toFixed(1), y: (cy + dy).toFixed(1), 'data-tinh': h.id });
      t.textContent = T.tinh[h.id] ?? h.ten;
      ten.appendChild(t);
    }
    // Tên hai quần đảo và Biển Đông: luôn ghi.
    const ghi = (x: number, y: number, chu: string, lop: string) => {
      const t = el('text', { x: x.toFixed(1), y: y.toFixed(1), class: lop });
      t.textContent = chu;
      qd.appendChild(t);
    };
    ghi(px(112), py(17.55), T.hoangSa, 'bdv-qd-ten');
    ghi(px(114.3), py(12.3), T.truongSa, 'bdv-qd-ten');
    ghi(px(113.2), py(14.3), T.bien, 'bdv-bien-ten');
    nhom.append(nen, dao, ten, qd);
    svg.appendChild(nhom);
    this.svg = svg;
    this.nhom = nhom;
    this.tenNhom = ten;
    this.goc.appendChild(svg);
    // Hoa văn trống đồng ở góc, chú thích màu, khung chèn hai quần đảo (không phóng theo bản đồ).
    this.goc.insertAdjacentHTML(
      'beforeend',
      `<svg class="bdv-goc" viewBox="0 0 100 100" aria-hidden="true">${trongDong(0, 100, 92)}</svg>
      <div class="bdv-chu-thich"><span><i class="bdv-o van-lang"></i>${T.chuThich.vanLang}</span><span><i class="bdv-o chua-ve"></i>${T.chuThich.chuaVe}</span><span><i class="bdv-o cua-ta"></i>${T.chuThich.cuaTa}</span></div>`,
    );
    this.chen = document.createElement('div');
    this.chen.className = 'bdv-chen';
    this.chen.hidden = true;
    this.chen.innerHTML = this.chenHtml(hinh);
    this.goc.appendChild(this.chen);
    this.chen.addEventListener('click', () => this.datView(1, 0, 0));
    this.nghe();
    this.datView(1, 0, 0);
    if (this.choPhong) this.phongToi(...this.choPhong);
    this.choPhong = null;
  }

  private choPhong: [string, number] | null = null;

  /** Khung chèn: hai quần đảo vẽ nhỏ ở góc (khi phóng to mà quần đảo ra ngoài khung). */
  private chenHtml(hinh: HinhTinh[]): string {
    const x0 = px(110.6), x1 = px(117.9), y0 = py(17.8), y1 = py(6.9);
    const cham = (id: string) =>
      hinh
        .find((h) => h.id === id)!
        .manh.filter((m) => laQuanDao(m[0]))
        .map((m) => tam(m[0]))
        .map(([x, y]) => `M${x.toFixed(0)} ${y.toFixed(0)}h0.01`)
        .join('');
    return `<svg viewBox="${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}">
      <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" class="bdv-chen-nen"/>
      <path d="${cham(QUAN_DAO_TINH.hoangSa)}${cham(QUAN_DAO_TINH.truongSa)}" class="bdv-cham"/>
      <text x="${px(112).toFixed(0)}" y="${py(17.45).toFixed(0)}" class="bdv-qd-ten">${T.hoangSa}</text>
      <text x="${px(114.4).toFixed(0)}" y="${py(12.2).toFixed(0)}" class="bdv-qd-ten">${T.truongSa}</text></svg>`;
  }

  /** Đặt phóng, dịch; giữ bản đồ không trôi hẳn ra ngoài khung. */
  private datView(k: number, tx: number, ty: number): void {
    k = Math.min(K_MAX, Math.max(1, k));
    const lề = 0.25;
    tx = Math.min(W * lề, Math.max(W * (1 - lề) - W * k, tx));
    ty = Math.min(H * lề, Math.max(H * (1 - lề) - H * k, ty));
    if (k === 1) (tx = 0), (ty = 0);
    this.k = k;
    this.tx = tx;
    this.ty = ty;
    if (this.veLai) return;
    this.veLai = requestAnimationFrame(() => {
      this.veLai = 0;
      this.nhom.setAttribute('transform', `translate(${this.tx.toFixed(1)} ${this.ty.toFixed(1)}) scale(${this.k.toFixed(3)})`);
      // Chữ giữ cỡ trên màn hình: đơn vị bản đồ mỗi điểm ảnh, chia cho độ phóng.
      this.svg.style.setProperty('--bdv-z', String(this.khungNhin().s / this.k));
      this.goc.classList.toggle('bdv-gan', this.k >= TEN_TU);
      this.chen.hidden = !this.quanDaoKhuat();
    });
  }

  /** Một trong hai quần đảo ra ngoài khung đang nhìn. */
  private quanDaoKhuat(): boolean {
    const r = this.khungNhin();
    return Object.values(QD_KHUNG).some(([x0, y0, x1, y1]) => {
      const a = px(x0) * this.k + this.tx, b = px(x1) * this.k + this.tx;
      const c = py(y1) * this.k + this.ty, e = py(y0) * this.k + this.ty;
      return b < r.x0 || a > r.x1 || e < r.y0 || c > r.y1;
    });
  }

  /** Khung đang thấy trên màn hình, theo đơn vị viewBox (tính cả phần thừa khi khung khác tỉ lệ). */
  private khungNhin(): { x0: number; x1: number; y0: number; y1: number; s: number } {
    const b = this.svg.getBoundingClientRect();
    const s = Math.max(W / Math.max(1, b.width), H / Math.max(1, b.height));
    const vw = b.width * s, vh = b.height * s;
    return { x0: (W - vw) / 2, x1: (W + vw) / 2, y0: (H - vh) / 2, y1: (H + vh) / 2, s };
  }

  /** Kéo một ngón, phóng hai ngón, lăn chuột; chạm không kéo thì chọn tỉnh. */
  private nghe(): void {
    const svg = this.svg;
    const giua = () => {
      const p = [...this.ngon.values()];
      return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, dai: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) };
    };
    /** Điểm màn hình ra đơn vị viewBox. */
    const vb = (cx: number, cy: number) => {
      const b = svg.getBoundingClientRect();
      const s = this.khungNhin().s;
      return { x: (cx - b.left - b.width / 2) * s + W / 2, y: (cy - b.top - b.height / 2) * s + H / 2 };
    };
    const phongQuanh = (cx: number, cy: number, k2: number) => {
      const p = vb(cx, cy);
      k2 = Math.min(K_MAX, Math.max(1, k2));
      const f = k2 / this.k;
      this.datView(k2, p.x - (p.x - this.tx) * f, p.y - (p.y - this.ty) * f);
    };
    let tap: { x: number; y: number; id: string | null } | null = null;
    svg.addEventListener('pointerdown', (e) => {
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        // Lần chạm giả (chụp thử) không bắt được con trỏ: vẫn kéo, chọn như thường.
      }
      this.ngon.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.ngon.size === 1) {
        const t = (e.target as Element).closest('[data-tinh]');
        tap = { x: e.clientX, y: e.clientY, id: t?.getAttribute('data-tinh') ?? null };
        this.keo = null;
      } else {
        tap = null;
        this.keo = giua();
      }
    });
    svg.addEventListener('pointermove', (e) => {
      const cu = this.ngon.get(e.pointerId);
      if (!cu) return;
      const s = this.khungNhin().s;
      if (this.ngon.size === 1) {
        if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 8) tap = null;
        if (!tap) this.datView(this.k, this.tx + (e.clientX - cu.x) * s, this.ty + (e.clientY - cu.y) * s);
        this.ngon.set(e.pointerId, { x: e.clientX, y: e.clientY });
        return;
      }
      this.ngon.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = giua();
      if (this.keo) {
        // Dịch theo điểm giữa hai ngón, phóng quanh điểm ấy.
        this.tx += (g.x - this.keo.x) * s;
        this.ty += (g.y - this.keo.y) * s;
        phongQuanh(g.x, g.y, this.k * (g.dai / Math.max(1, this.keo.dai)));
      }
      this.keo = g;
    });
    const tha = (e: PointerEvent) => {
      if (!this.ngon.delete(e.pointerId)) return;
      if (this.ngon.size === 1) {
        this.keo = null;
      }
      if (e.type === 'pointerup' && tap && this.ngon.size === 0 && tap.id && laTinh(tap.id)) this.onChon(tap.id);
      if (this.ngon.size === 0) tap = null;
    };
    svg.addEventListener('pointerup', tha);
    svg.addEventListener('pointercancel', tha);
    svg.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        phongQuanh(e.clientX, e.clientY, this.k * Math.exp(-e.deltaY * 0.0015));
      },
      { passive: false },
    );
  }

  /** Tô theo state: đất Văn Lang, chưa quy về, tỉnh của ta, tỉnh đang xem. Chỉ đổi lớp khi có gì đổi. */
  capNhat(state: GameState, chon: string | null, giac: readonly string[] = []): void {
    this.capNhatCuoi = () => this.capNhat(state, chon, giac);
    if (!this.hinh) return;
    const ta = state.vietNam?.tinh ?? null;
    const key = `${ta}|${chon}|${giac.join(',')}`;
    if (key === this.lop) return;
    this.lop = key;
    for (const [id, g] of this.tinh) {
      g.classList.toggle('van-lang', laTinh(id) && laDatVanLang(id));
      g.classList.toggle('chua-ve', laTinh(id) && !laDatVanLang(id));
      g.classList.toggle('cua-ta', id === ta);
      g.classList.toggle('chon', id === chon);
      g.classList.toggle('co-giac', giac.includes(id));
      // Tỉnh đang xem, tỉnh của ta vẽ sau cùng cho viền không bị tỉnh bên cạnh đè.
      if (id === chon || id === ta) g.parentElement?.appendChild(g);
    }
    const ga = ta ? this.tinh.get(ta) : undefined;
    if (ga && chon !== ta) ga.parentElement?.appendChild(ga);
    for (const t of this.tenNhom.children) t.classList.toggle('chon', t.getAttribute('data-tinh') === chon);
  }

  /** Về khung cả nước (để chụp thử). */
  veCaNuoc(): void {
    if (this.hinh) this.datView(1, 0, 0);
  }

  /** Phóng tới tỉnh `id` (để chụp thử); bản đồ chưa tải xong thì phóng khi tải xong. */
  phongToi(id: string, k = 3): void {
    if (!this.hinh) {
      this.choPhong = [id, k];
      return;
    }
    const h = this.hinh.find((x) => x.id === id);
    if (!h) return;
    const lon = h.manh.filter((m) => !laQuanDao(m[0])).reduce((a, m) => (dienTich(m[0]) > dienTich(a[0]) ? m : a));
    const [cx, cy] = tam(lon[0]);
    this.datView(k, W / 2 - cx * k, H / 2 - cy * k);
  }
}

/**
 * Máy chủ điểm tỉnh (PR 2) cho bảng: bảng tỉnh mùa này máy chủ trả, đang hỏi, lỗi lần hỏi gần nhất, đang góp. `co`:
 * bản game này có nối máy chủ (không có thì chỉ chọn tỉnh, chức ở máy này như PR 1).
 */
export interface VnMay {
  co: boolean;
  bang: BangTinh | null;
  dangTai: boolean;
  loi: { ma: string; chiTiet?: string } | null;
  dangGop: boolean;
  /** PR 3: đang hỏi máy chủ bắt đầu trận giặc chung. */
  dangDanh?: boolean;
}

/** Lỗi máy chủ điểm tỉnh ra một dòng: mã riêng của tỉnh trước, còn lại như lỗi Đấu thành. */
export function vnLoi(loi: { ma: string; chiTiet?: string }): string {
  const t = T.loiMay[loi.ma];
  if (t) return t;
  return dauError(loi);
}

/** Bảng bên: tỉnh của ta, phần góp, thẻ tỉnh đang xem, chức Bồ chính, bảng tỉnh mùa này. */
export function vietNamHtml(state: GameState, chon: string | null, now: number, may: VnMay): string {
  const v = state.vietNam;
  const ta = v?.tinh ?? null;
  const ten = (id: string) => T.tinh[id] ?? id;
  let html = `<p class="muted">${T.intro}</p>`;
  html += `<p class="bdv-ta">${ta ? `🏯 ${T.tinhCuaTa(`<b>${ten(ta)}</b>`)}${v?.chuc ? ` · ${T.chuc[v.chuc].icon} ${T.chuc[v.chuc].ten}` : ''}` : T.chuaChon}</p>`;
  html += mayHtml(state, may, now);
  if (may.bang?.giac) html += giacHtml(state, may.bang.giac, now, !!may.dangDanh);
  const xem = chon && laTinh(chon) ? chon : ta;
  if (xem) html += theTinh(state, xem, now, may);
  if (ta) html += chucHtml(state, ta, now);
  if (may.bang) html += bangHtml(may.bang, ta);
  html += `<p class="muted bdv-sap"><small>${T.sapCo}</small></p>`;
  html += `<p class="muted bdv-nguon"><small>${T.nguonTitle}: ${T.nguon}</small></p>`;
  return html;
}

/** Trạng thái máy chủ và phần góp của mình (chức có của để góp). */
function mayHtml(state: GameState, may: VnMay, now: number): string {
  if (!may.co) return `<p class="muted bdv-sap">${T.khongMay}</p>`;
  if (may.loi && !may.bang) return `<p class="bdv-loi">⚠️ ${vnLoi(may.loi)} <button class="btn small ghost" data-act="vnTai">${T.thuLai}</button></p>`;
  if (!may.bang) return `<p class="muted">⏳ ${T.dangTai}</p>`;
  const v = state.vietNam;
  const toi = may.bang.toi;
  const loi = may.loi ? `<p class="bdv-loi">⚠️ ${vnLoi(may.loi)}</p>` : '';
  const mua = `<p class="muted bdv-mua"><small>${T.muaNay(may.bang.mua, Math.ceil(muaCon(now) / 86_400_000))}</small></p>`;
  if (!v?.tinh || !v.chuc || !toi || toi.tinh !== v.tinh) return loi + mua;
  const res = CHUC_GOP[v.chuc];
  if (!res.length) return `${loi}<div class="bdv-gop"><h4>${T.gopTitle}</h4><p class="muted">${T.quanChuaGop}</p></div>${mua}`;
  const con = Math.max(0, VIET_NAM.gopNgay - toi.diemNgay);
  const cap = capGop(state);
  const dong = res
    .map((r) => {
      const R = vi.resources[r];
      const toiDa = diemToiDa(state, r, con);
      const nut = [...new Set([10, 25, toiDa])]
        .filter((d) => d >= 1)
        .sort((a, b) => a - b)
        .map((d) => {
          const du = d <= toiDa;
          return `<button class="btn small ${d === toiDa ? 'bronze' : 'ghost'}" data-act="vnGop" data-res="${r}" data-diem="${d}" ${du && !may.dangGop ? '' : 'disabled'}>
            ${d === toiDa && d !== 10 && d !== 25 ? T.gopHet(d) : T.gopDiem(d)}<small>${R.icon} ${fmt(luongGop(d, cap))}</small></button>`;
        })
        .join('');
      return `<div class="bdv-gop-dong"><span class="bdv-gop-res">${R.icon} ${R.name}</span><span class="bdv-gop-nut">${nut || `<small class="muted">${con ? T.thieuCua : T.hetNgay}</small>`}</span></div>`;
    })
    .join('');
  return `${loi}<div class="bdv-gop"><h4>${T.gopTitle}</h4>
    <p class="bdv-gop-so">${T.gopSo(con, VIET_NAM.gopNgay, toi.diemMua)}</p>
    ${dong}
    <p class="muted"><small>${T.gopLuat}</small></p></div>${mua}`;
}

/** Bảng tỉnh mùa này: tỉnh đã quy về xếp theo điểm, 10 tỉnh đầu và tỉnh của mình. */
function bangHtml(bang: BangTinh, ta: string | null): string {
  const xep = hangTinh(bang.bang);
  const dong = TINH_IDS.filter(laDatVanLang).map((id) => xep.find((d) => d.tinh === id) ?? { tinh: id, diem: 0, nguoi: 0, gop: 0 });
  const day = [...xep, ...dong.filter((d) => !xep.includes(d))];
  const hien = day.slice(0, 10);
  const hangTa = ta ? day.findIndex((d) => d.tinh === ta) : -1;
  if (hangTa >= 10) hien.push(day[hangTa]);
  const li = hien
    .map((d) => {
      const hang = day.indexOf(d) + 1;
      return `<li class="${d.tinh === ta ? 'ta' : ''}"><span class="hang">${hang}</span><button class="bdv-bang-ten" data-act="vnXem" data-tinh="${d.tinh}">${T.tinh[d.tinh]}</button><span class="bdv-bang-so">⭐ ${fmt(d.diem)}<small>👥 ${d.nguoi}</small></span></li>`;
    })
    .join('');
  return `<div class="bdv-bang"><h4>${T.bangTitle}</h4><ol>${li}</ol><p class="muted"><small>${T.bangLuat}</small></p></div>`;
}

function theTinh(state: GameState, id: TinhId, now: number, may: VnMay): string {
  const v = state.vietNam;
  const xua = T.xuaCua[id];
  const lg = langGieng(id)
    .map((b) => `<button class="chip bdv-lg" data-act="vnXem" data-tinh="${b}">${T.tinh[b]}</button>`)
    .join('');
  const tags = [laDatVanLang(id) ? T.trangThai.vanLang : T.trangThai.chuaVe, giapBien(id) ? T.giapBien : '', giapBienGioi(id) ? T.bienGioi : '']
    .filter(Boolean)
    .map((t) => `<span class="bdv-tag">${t}</span>`)
    .join('');
  const qd = id === QUAN_DAO_TINH.hoangSa ? T.hoangSaThuoc : id === QUAN_DAO_TINH.truongSa ? T.truongSaThuoc : '';
  let nut: string;
  if (v?.tinh === id) nut = `<p class="bdv-dang">${T.dangO}</p>`;
  else if (doiTinhDuoc(state, now)) nut = `<button class="btn bronze" data-act="vnChonTinh" data-tinh="${id}">${T.chon}</button>`;
  else nut = `<p class="muted">${T.doiTinhSau(Math.ceil(muaCon(now) / 86_400_000))}</p>`;
  return `<div class="bdv-the ${laDatVanLang(id) ? 'van-lang' : 'chua-ve'}">
    <h3>${T.tinh[id]}</h3>
    <p class="bdv-xua"><b>${T.xua}:</b> ${xua ? `${xua.ten}${xua.dia ? ` · ${xua.dia}` : ''}` : T.khongXua}</p>
    ${xua ? `<p class="muted bdv-ghi"><small>${T.xuaGhi[xua.loai]}</small></p>` : ''}
    <div class="bdv-tags">${tags}</div>
    ${soTinh(id, may)}
    ${giacThe(id, may)}
    ${qd ? `<p class="bdv-qd-the">🏝️ ${qd}</p>` : ''}
    <p class="bdv-lg-dong"><b>${T.langGieng}:</b> ${lg}</p>
    ${nut}
    <p class="muted"><small>${T.doiTinhLuat}</small></p>
  </div>`;
}

/** Tỉnh có giặc tuần này (đang đánh, chưa diệt; trước thứ Sáu là tỉnh sắp bị đánh), để tô trên bản đồ. */
export function tinhCoGiac(may: VnMay): string[] {
  const g = may.bang?.giac;
  if (!g) return [];
  if (g.dao.length) return g.dao.filter((d) => d.con > 0).map((d) => d.tinh);
  return [...daoTuan(g.tuan).tinh];
}

/** Dòng giặc trên thẻ tỉnh: đang đánh (máu còn), đã diệt, hay sắp tới. */
function giacThe(id: TinhId, may: VnMay): string {
  const g = may.bang?.giac;
  if (!g) return '';
  const d = g.dao.find((x) => x.tinh === id);
  if (d) return `<p class="bdv-giac-the">${d.con > 0 ? T.giacTheTinh(d.con, d.mau) : T.giacTheDiet}</p>`;
  if (!g.dao.length && daoTuan(g.tuan).tinh.includes(id)) return `<p class="bdv-giac-the">${T.giacTheSap}</p>`;
  return '';
}

/**
 * Phần giặc chung: đạo tuần này (nhóm, tỉnh), trước thứ Sáu là lời báo sắp tới; khi đang đánh thì máu từng tỉnh và nút
 * xuất quân ở tỉnh mình (hay tỉnh láng giềng khi tỉnh mình không có giặc), số trận còn hôm nay.
 */
function giacHtml(state: GameState, g: GiacBang, now: number, dangDanh: boolean): string {
  const lich = daoTuan(g.tuan);
  const nhom = T.nhom[lich.nhom];
  const ten = (id: string) => T.tinh[id] ?? id;
  let html = `<div class="bdv-giac"><h4>${T.giacTitle}</h4>`;
  if (!g.dao.length) {
    const ngay = Math.max(0, Math.ceil((giacToiLuc(g.tuan) - now) / 86_400_000));
    html += `<p>${T.giacSap(nhom, lich.tinh.map(ten).join(', '), ngay)}</p>`;
  } else {
    html += `<p>${T.giacDang(nhom, Math.max(0, Math.ceil((giacRutLuc(g.tuan) - now) / 3_600_000)))}</p><ul class="bdv-giac-list">`;
    for (const d of g.dao) {
      const pct = d.mau > 0 ? Math.round((100 * d.con) / d.mau) : 0;
      html += `<li class="${d.con > 0 ? '' : 'diet'}"><button class="bdv-bang-ten" data-act="vnXem" data-tinh="${d.tinh}">${ten(d.tinh)}</button>
        <span class="bdv-giac-mau"><i style="width:${pct}%"></i></span><small>${d.con > 0 ? T.giacMau(d.con, d.mau) : T.giacDiet}</small></li>`;
    }
    html += '</ul>';
    const ta = state.vietNam?.tinh ?? null;
    if (!ta) html += `<p class="muted">${T.chuaTinhGiac}</p>`;
    else {
      const noi = noiDanh(ta, lich.tinh).filter((id) => (g.dao.find((d) => d.tinh === id)?.con ?? 0) > 0);
      const con = Math.max(0, GIAC_CHUNG.tranNgay - g.tranNay);
      const coQuan = armySpace(fitArmy(state.troops, fieldCap(state))) > 0;
      if (!noi.length) html += `<p class="muted">${T.khongNoi}</p>`;
      else {
        const he = heChuc(state.vietNam?.chuc ?? null, lich.nhom) > 1 ? ` <span class="bdv-tag">${T.heChuc}</span>` : '';
        html += `<p class="bdv-giac-so">${con ? T.tranNay(con, GIAC_CHUNG.tranNgay) : T.hetTran}${he}</p><div class="bdv-giac-nut">`;
        html += noi
          .map((id) => `<button class="btn ${id === ta ? 'bronze' : 'ghost'}" data-act="vnGiac" data-tinh="${id}" ${con && coQuan && !dangDanh ? '' : 'disabled'}>${id === ta ? T.danhO(ten(id)) : T.giupO(ten(id))}</button>`)
          .join('');
        html += '</div>';
        if (!coQuan) html += `<p class="muted">${T.khongQuan}</p>`;
      }
    }
  }
  return `${html}<p class="muted"><small>${T.giacLuat}</small></p></div>`;
}

/** Bảng kết quả trận giặc chung (máy chủ đã đánh lại; `kq` null là chưa gửi được). */
export function giacKetQuaHtml(
  tinh: string,
  pha: number,
  lost: Partial<Record<UnitType, number>>,
  kq: { sat: number; diemTa: number; diemGiup: number; con: number; diet: boolean } | null,
  he: number,
  ta: string,
): string {
  const ten = (id: string) => T.tinh[id] ?? id;
  const mat = UNIT_TYPES.filter((k) => (lost[k] ?? 0) > 0)
    .map((k) => `${vi.units[k].icon} ${lost[k]}`)
    .join(' · ');
  const rows = [`<div>${T.kqPha(Math.round(pha * 100))}</div>`];
  if (kq) {
    rows.push(`<div>${T.kqSat(kq.sat, he > 1)}</div>`);
    if (kq.diemTa > 0) rows.push(`<div>${T.kqDiem(kq.diemTa, ten(ta))}</div>`);
    if (kq.diemGiup > 0) rows.push(`<div>${T.kqGiup(kq.diemGiup, ten(tinh))}</div>`);
    rows.push(`<div>${kq.diet ? T.kqDiet : T.kqCon(kq.con)}</div>`);
  }
  rows.push(`<div>${mat ? T.kqMat(mat) : T.kqKhongMat}</div>`);
  return `<div class="modal dau-result"><h2>${T.kqTitle(ten(tinh))}</h2>
    <div class="result-rows">${rows.join('')}</div>
    ${kq ? '' : `<p class="why">${T.kqChuaGui}</p>`}
    <div class="actions"><button class="btn bronze" data-act="vnGiacDong">${T.kqDong}</button></div></div>`;
}

/** Bảng chờ máy chủ đánh lại trận giặc chung. */
export const giacChoHtml = (tinh: string): string =>
  `<div class="modal dau-result"><h2>${T.kqTitle(T.tinh[tinh] ?? tinh)}</h2><p class="muted">⏳ ${T.dangGui}</p></div>`;

/** Số của tỉnh mùa này trên thẻ: điểm (tỉnh chưa quy về: điểm kết giao), số người chọn, số người đã góp. */
function soTinh(id: TinhId, may: VnMay): string {
  if (!may.bang) return '';
  const d = may.bang.bang.find((x) => x.tinh === id) ?? { diem: 0, nguoi: 0, gop: 0 };
  return `<p class="bdv-so">${laDatVanLang(id) ? T.diemTinh(d.diem) : T.diemKetGiao(d.diem)} · ${T.nguoiTinh(d.nguoi, d.gop)}</p>`;
}

function chucHtml(state: GameState, tinh: TinhId, now: number): string {
  const v = state.vietNam!;
  const cho = choDoiChuc(state, now);
  const nut = chucCo(tinh)
    .map((c) => {
      const C = T.chuc[c];
      const dang = v.chuc === c;
      return `<button class="bdv-chuc ${dang ? 'on' : ''}" data-act="vnChonChuc" data-chuc="${c}" ${!dang && cho > 0 ? 'disabled' : ''}>
        <span class="ic">${C.icon}</span><span><b>${C.ten}</b><small>${C.viec}</small></span>${dang ? `<em>${T.dangGiu}</em>` : ''}</button>`;
    })
    .join('');
  const gio = Math.floor(cho / 3_600_000);
  const phut = Math.ceil((cho % 3_600_000) / 60_000);
  return `<div class="bdv-chuc-khoi"><h4>${T.chucTitle}</h4><p class="muted"><small>${T.chucLuat}</small></p>
    <div class="bdv-chuc-list">${nut}</div>
    ${cho > 0 ? `<p class="muted">⏳ ${T.chucCho(gio, phut === 60 ? 59 : phut)}</p>` : ''}
    <p class="muted"><small>${T.chucSu}</small></p></div>`;
}
