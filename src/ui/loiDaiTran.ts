// Nhịp một trận lôi đài (docs/thiet-ke.md mục Kế hoạch: Lôi đài Phong Châu): nối luật (`game/loiDai.ts`), cảnh
// (`render/loiDai.ts`) và màn đánh (`ui/loiDai.ts`). Mỗi khung hình `update` cho cảnh diễn; hết phần diễn của lượt
// trước thì đẩy trận tới lượt kế: thần thú, đội máy và đội ta khi bật Tự đánh thì máy chọn chiêu, còn lại chờ người chơi
// chọn chiêu rồi chạm mục tiêu (đòn thường được chọn sẵn: chạm thẳng một địch là đánh).

import type { GameState } from '../game/game';
import {
  CHIEU,
  chieuDuoc,
  chonDuoc,
  doiLoi,
  loiNay,
  moTran,
  ra,
  tangKe,
  toiLuot,
  tuChon,
  tuongLoi,
  xongTran,
  type LoiTran,
  type LoiUnit,
} from '../game/loiDai';
import { nuTuongList } from '../game/nuTuong';
import type { LoiDaiCanh } from '../render/loiDai';
import { vi } from '../text/vi';
import { LoiTranUi, loiKetQuaHtml } from './loiDai';

export interface LoiDeps {
  state: () => GameState;
  /** Điểm màn hình của người `id` trên sân, ở độ cao `cao` lần chiều cao người (1 là đỉnh đầu). */
  screenAt: (id: number, cao?: number) => { x: number; y: number } | null;
  play: (s: 'tap' | 'claim' | 'error') => void;
  /** Lưu và vẽ lại giao diện chung sau khi state đổi. */
  commit: () => void;
  /** Rời đài về kinh đô. */
  roi: () => void;
}

/** Số tướng đứng chầu nhiều nhất bên thềm. */
const CHAU_MAX = 6;

export class LoiDau {
  b!: LoiTran;
  private readonly ui: LoiTranUi;
  /** Còn chờ phần diễn của lượt trước (giây). */
  private cho = 0;
  private tg = 0;
  private hen: { luc: number; lam: () => void }[] = [];
  /** Chiêu người chơi đang chọn (chờ chạm mục tiêu). */
  private chon: number | null = null;
  private tuDanh = false;
  private nhanh = false;
  private roiHoi = 0;
  private ket: 'cho' | 'hien' | null = null;
  private ban = true;

  private canh!: LoiDaiCanh;

  constructor(
    root: HTMLElement,
    private readonly d: LoiDeps,
  ) {
    this.ui = new LoiTranUi(root, (act, el) => this.bam(act, el));
  }

  /** Cảnh sân chầu đang dùng (rời đài thì cảnh bị gỡ, lần sau dựng cảnh mới). */
  datCanh(canh: LoiDaiCanh): void {
    this.canh = canh;
  }

  /** Vào trận tầng `tang`. Trả false (kèm lý do đã báo) khi không vào được. */
  batDau(tang: number): boolean {
    const s = this.d.state();
    const r = moTran(s, tang);
    if (!r.ok) return false;
    this.b = r.value;
    const l = loiNay(s);
    this.tuDanh = l.tuDanh;
    this.nhanh = l.nhanh;
    const doi = doiLoi(s);
    this.canh.dat(this.b, tuongLoi(s).filter((k) => !doi.includes(k)).slice(0, CHAU_MAX), nuTuongList(s));
    this.ui.mo(this.b);
    this.cho = 0.6;
    this.tg = 0;
    this.hen = [];
    this.chon = null;
    this.ket = null;
    this.roiHoi = 0;
    this.ban = true;
    this.ui.veThe(this.b, []);
    return true;
  }

  dong(): void {
    this.ui.dong();
  }

  /** Người chơi đang cầm lượt: tướng đội ta, không bật Tự đánh, không còn phần diễn dở. */
  private cam(): LoiUnit | null {
    const b = this.b;
    if (b.kq || b.dang === null || b.dang < 0 || this.tuDanh || this.cho > 0) return null;
    const u = b.units[b.dang];
    return u.phe === 0 ? u : null;
  }

  private mucIds(): number[] {
    const u = this.cam();
    return u && this.chon !== null ? chonDuoc(this.b, u, this.chon).map((t) => t.id) : [];
  }

  /** Diễn các việc mới thêm từ vị trí `n` của sổ việc trận. */
  private dien(n: number): void {
    const b = this.b;
    const ev = b.sk.slice(n);
    if (!ev.length) return;
    const r = this.canh.dien(ev);
    this.cho = r.dur + 0.12;
    const chieu = ev.find((e) => e.t === 'chieu');
    if (chieu && chieu.t === 'chieu' && chieu.chieu !== 'danh') {
      const ten = chieu.ai < 0 ? vi.thanThu.ten[chieu.chieu] : vi.loiDai.chieu[chieu.chieu];
      this.ui.bao(ten, chieu.ai < 0 ? ((-1 - chieu.ai) as 0 | 1) : b.units[chieu.ai].phe);
    }
    this.hen.push({
      luc: this.tg + r.trung,
      lam: () => {
        for (const e of ev) {
          if (e.t === 'mat') this.ui.noiChu(`−${e.n}`, this.d.screenAt(e.id, 0.8), 'mat');
          else if (e.t === 'hoi') this.ui.noiChu(`+${e.n}`, this.d.screenAt(e.id, 0.8), 'hoi');
          else if (e.t === 'hu' && e.on) this.ui.noiChu(`${vi.loiDai.huIcon[e.hu]} ${vi.loiDai.huTen[e.hu]}`, this.d.screenAt(e.id, 1.15), 'hu');
          else if (e.t === 'boLuot') this.ui.noiChu(`💫 ${vi.loiDai.boLuot}`, this.d.screenAt(e.id, 1.15), 'hu');
        }
        this.ui.veThe(b, this.mucIds());
      },
    });
  }

  private lam(fn: () => boolean): void {
    const n = this.b.sk.length;
    if (!fn()) return;
    this.chon = null;
    this.dien(n);
    this.ban = true;
  }

  update(dt: number): void {
    const b = this.b;
    const k = this.nhanh ? 2 : 1;
    this.canh.update(dt * k);
    this.ui.datThe(b, (id) => this.d.screenAt(id, 1.06));
    this.tg += dt * k;
    if (this.hen.length) {
      const toi = this.hen.filter((h) => h.luc <= this.tg);
      this.hen = this.hen.filter((h) => h.luc > this.tg);
      for (const h of toi) h.lam();
    }
    if (this.roiHoi > 0 && (this.roiHoi -= dt) <= 0) this.ban = true;
    if (this.ket !== 'hien') {
      const truoc = this.cho;
      this.cho -= dt * k;
      if (this.cho <= 0) {
        if (truoc > 0) this.ban = true;
        this.tien();
      }
    }
    if (this.ban) this.ve();
  }

  /** Hết phần diễn: kết trận, hay đẩy tới lượt kế và cho máy đánh nếu là lượt của máy. */
  private tien(): void {
    const b = this.b;
    if (b.kq) {
      if (this.ket === null) {
        this.ket = 'cho';
        this.cho = 1.3;
        return;
      }
      this.ket = 'hien';
      const s = this.d.state();
      const thuong = xongTran(s, b);
      this.d.play(b.kq === 'thang' ? 'claim' : 'error');
      this.d.commit();
      this.ui.ketQua(loiKetQuaHtml(s, b, thuong));
      this.ban = true;
      return;
    }
    if (b.dang === null) {
      const n = b.sk.length;
      toiLuot(b);
      this.dien(n);
      this.ban = true;
      if (this.cho <= 0 && b.dang !== null) this.cho = 0.18;
      return;
    }
    if (b.dang < 0) return this.lam(() => ra(b));
    const u = b.units[b.dang];
    if (u.phe === 1 || this.tuDanh) {
      const c = tuChon(b);
      return this.lam(() => ra(b, c.chieu, c.muc));
    }
    // Chờ người chơi: đòn thường được chọn sẵn.
    if (this.chon === null || !chieuDuoc(b, u, this.chon)) {
      this.chon = 0;
      this.ban = true;
    }
  }

  private ve(): void {
    this.ban = false;
    const b = this.b;
    const u = this.cam();
    const muc = this.mucIds();
    this.ui.veTop(b);
    this.ui.veBar(b, { cam: u, chon: this.chon, tuDanh: this.tuDanh, nhanh: this.nhanh, roiHoi: this.roiHoi > 0 });
    this.canh.chi(b.kq ? null : b.dang, muc);
    if (this.cho <= 0) this.ui.veThe(b, muc);
  }

  /** Chạm vào cảnh: chọn người gần chỗ chạm nhất trong những người đang chọn được. */
  tap(x: number, y: number): void {
    let best: number | null = null;
    let d2 = 80 * 80;
    for (const id of this.mucIds()) {
      const p = this.d.screenAt(id, 0.5);
      if (!p) continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < d2) {
        d2 = d;
        best = id;
      }
    }
    if (best !== null) this.chonMuc(best);
  }

  private chonMuc(id: number): void {
    const u = this.cam();
    if (!u || this.chon === null) return;
    const ci = this.chon;
    if (!chonDuoc(this.b, u, ci).some((t) => t.id === id)) return;
    this.d.play('tap');
    this.lam(() => ra(this.b, ci, id));
  }

  private bam(act: string, el: HTMLElement): void {
    const s = this.d.state();
    const b = this.b;
    const id = Number(el.dataset.id);
    switch (act) {
      case 'loiChieu': {
        const u = this.cam();
        if (!u || !chieuDuoc(b, u, id)) return;
        this.d.play('tap');
        const muc = CHIEU[u.chieu[id]].muc;
        if (muc === 'caDich' || muc === 'caTa') return this.lam(() => ra(b, id));
        this.chon = id;
        this.ban = true;
        return;
      }
      case 'loiMuc':
        return this.chonMuc(id);
      case 'loiTuDanh':
        this.tuDanh = loiNay(s).tuDanh = !this.tuDanh;
        this.d.play('tap');
        this.ban = true;
        return;
      case 'loiNhanh':
        this.nhanh = loiNay(s).nhanh = !this.nhanh;
        this.d.play('tap');
        this.ban = true;
        return;
      case 'loiRoi':
        if (this.roiHoi <= 0) {
          this.roiHoi = 3;
          this.ban = true;
          return;
        }
        return this.d.roi();
      case 'loiTiep': {
        const ke = tangKe(s);
        if (ke) this.batDau(ke);
        return;
      }
      case 'loiLai':
        this.batDau(b.tang);
        return;
      case 'loiVe':
        return this.d.roi();
    }
  }
}
