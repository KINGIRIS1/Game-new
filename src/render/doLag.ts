// Đo lag: ghi từng khung hình lúc chơi (khoảng cách giữa hai khung, thời gian JS từng phần việc, số lệnh vẽ) để
// `node scripts/do-lag.mjs` so nặng nhẹ giữa các bản. Chỉ ghi khi đang đo (`window.__debug.lag`); lúc chơi thường mỗi
// khung chỉ tốn vài phép so sánh.

/**
 * Phần việc trong một khung của vòng lặp ở main.ts: luật chơi (`tick`, trận Đấu thành; tốn theo thời gian chơi trôi
 * qua), cảnh (hoạt cảnh và gửi lệnh vẽ; tốn theo khung), khác (nhãn, theo dõi trận, lưu), nhịp (khối chạy 4 lần mỗi
 * giây: làm mới giao diện, đồng bộ cảnh theo state, nặn sẵn).
 */
export type PhanKhung = 'luat' | 'canh' | 'khac' | 'nhip';

/** Số liệu thô của một lần đo. */
export interface BanGhiLag {
  /** Khoảng cách giữa hai khung liền nhau (ms, theo dấu giờ của requestAnimationFrame). */
  khung: number[];
  /** Thời gian JS mỗi phần việc, mỗi khung một số; `nhip` chỉ có ở khung chạy khối nhịp. */
  luat: number[];
  canh: number[];
  khac: number[];
  nhip: number[];
  /** Tổng JS của khung (mọi phần việc). */
  js: number[];
  /** Thời gian chơi trôi trong khung (ms; đang đo ở máy chậm có thể cho trôi chậm lại, `tocDo` ở main.ts). */
  choi: number[];
  /** Số lệnh vẽ, số tam giác của khung (renderer.info.render). */
  lenh: number[];
  tamGiac: number[];
}

/** Tóm tắt một dãy số đo bằng ms. */
export interface PhanBo {
  tong: number;
  tb: number;
  p50: number;
  p95: number;
  max: number;
}

export interface TomLag {
  soKhung: number;
  /** Thời gian đo (ms) theo dấu giờ khung, từ khung đầu tới khung cuối. */
  ms: number;
  /** Thời gian chơi đã trôi lúc đo (ms). */
  choi: number;
  /** Khung mỗi giây, tính từ khoảng cách trung bình giữa hai khung. */
  fps: number;
  khung: PhanBo;
  /** Số khung cách khung trước quá 50 ms (người chơi thấy giật). */
  tren50: number;
  luat: PhanBo;
  canh: PhanBo;
  khac: PhanBo;
  nhip: PhanBo;
  js: PhanBo;
  /** Số khung có JS quá một khung 60 khung/giây (16,7 ms) và quá 50 ms: giật vì JS, bất kể GPU nhanh chậm. */
  jsTren16: number;
  jsTren50: number;
  lenh: { tb: number; max: number };
  tamGiac: { tb: number; max: number };
}

/** Một khung ở 60 khung mỗi giây (ms). */
export const KHUNG_60 = 1000 / 60;

const rong = (): BanGhiLag => ({ khung: [], luat: [], canh: [], khac: [], nhip: [], js: [], choi: [], lenh: [], tamGiac: [] });

const tron = (x: number, n = 2) => Math.round(x * 10 ** n) / 10 ** n;

/** Bách phân vị `p` (0 tới 1) của dãy đã sắp tăng dần, lấy phần tử gần nhất (không nội suy). */
function bachPhan(sx: readonly number[], p: number): number {
  return sx[Math.min(sx.length - 1, Math.max(0, Math.ceil(p * sx.length) - 1))];
}

export function phanBo(xs: readonly number[]): PhanBo {
  if (!xs.length) return { tong: 0, tb: 0, p50: 0, p95: 0, max: 0 };
  const sx = [...xs].sort((a, b) => a - b);
  const tong = xs.reduce((a, b) => a + b, 0);
  return { tong: tron(tong), tb: tron(tong / xs.length), p50: tron(bachPhan(sx, 0.5)), p95: tron(bachPhan(sx, 0.95)), max: tron(sx[sx.length - 1]) };
}

export function tomLag(g: BanGhiLag): TomLag {
  const khung = phanBo(g.khung);
  const tbMax = (xs: readonly number[]) => ({
    tb: xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0,
    max: xs.length ? Math.max(...xs) : 0,
  });
  return {
    soKhung: g.khung.length,
    ms: khung.tong,
    choi: tron(g.choi.reduce((a, b) => a + b, 0)),
    fps: khung.tb > 0 ? tron(1000 / khung.tb, 1) : 0,
    khung,
    tren50: g.khung.filter((x) => x > 50).length,
    luat: phanBo(g.luat),
    canh: phanBo(g.canh),
    khac: phanBo(g.khac),
    nhip: phanBo(g.nhip),
    js: phanBo(g.js),
    jsTren16: g.js.filter((x) => x > KHUNG_60).length,
    jsTren50: g.js.filter((x) => x > 50).length,
    lenh: tbMax(g.lenh),
    tamGiac: tbMax(g.tamGiac),
  };
}

/** Thời gian luật chơi (ms) cho mỗi giây chơi trôi qua. */
export function luatMoiGiay(t: TomLag): number {
  return t.choi > 0 ? tron(t.luat.tong / (t.choi / 1000)) : 0;
}

/**
 * JS ước mỗi khung khi máy chạy được 60 khung mỗi giây, từ số đo ở máy chậm hơn (máy vẽ bằng phần mềm chỉ được vài
 * khung mỗi giây): cảnh và khác tốn theo khung; luật chơi tốn theo thời gian chơi nên chia đều 60 khung mỗi giây chơi;
 * khối nhịp chạy 4 lần mỗi giây.
 */
export function uoc60(t: TomLag): number {
  return tron(t.canh.tb + t.khac.tb + luatMoiGiay(t) / 60 + (t.nhip.tb * 4) / 60);
}

/**
 * Bộ ghi khung hình. Vòng lặp khung gọi `dau` đầu khung, `cat` sau mỗi phần việc, `xong` cuối khung; chưa `bat` thì
 * các hàm này về ngay.
 */
export class DoLag {
  private on = false;
  private truoc = 0;
  private moc = 0;
  private dang: Record<PhanKhung, number> = { luat: 0, canh: 0, khac: 0, nhip: 0 };
  private choi = 0;
  private coNhip = false;
  private ghi = rong();

  bat(): void {
    this.ghi = rong();
    this.truoc = 0;
    this.on = true;
  }

  /** Số khung đã ghi từ lúc bật. */
  get soKhung(): number {
    return this.ghi.js.length;
  }

  /** Thôi đo, trả số liệu thô đã ghi. */
  tat(): BanGhiLag {
    this.on = false;
    return this.ghi;
  }

  /** Đầu khung: `now` là dấu giờ requestAnimationFrame truyền vào. */
  dau(now: number): void {
    if (!this.on) return;
    if (this.truoc) this.ghi.khung.push(now - this.truoc);
    this.truoc = now;
    this.dang = { luat: 0, canh: 0, khac: 0, nhip: 0 };
    this.choi = 0;
    this.coNhip = false;
    this.moc = performance.now();
  }

  /** Cộng thời gian từ mốc trước tới giờ vào phần `phan`. */
  cat(phan: PhanKhung): void {
    if (!this.on) return;
    const t = performance.now();
    this.dang[phan] += t - this.moc;
    this.moc = t;
    if (phan === 'nhip') this.coNhip = true;
  }

  /** Thời gian chơi trôi trong khung này (ms). */
  troi(ms: number): void {
    if (this.on) this.choi += ms;
  }

  /** Cuối khung: phần còn lại tính vào `khac`, ghi các phần việc và số lệnh vẽ của khung. */
  xong(ve: { calls: number; triangles: number }): void {
    if (!this.on || !this.truoc) return;
    this.cat('khac');
    const d = this.dang;
    this.ghi.luat.push(d.luat);
    this.ghi.canh.push(d.canh);
    this.ghi.khac.push(d.khac);
    if (this.coNhip) this.ghi.nhip.push(d.nhip);
    this.ghi.js.push(d.luat + d.canh + d.khac + d.nhip);
    this.ghi.choi.push(this.choi);
    this.ghi.lenh.push(ve.calls);
    this.ghi.tamGiac.push(ve.triangles);
  }
}
