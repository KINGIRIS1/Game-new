// Nặn trước: hình nặn tốn vài trăm mili giây mỗi dáng, nặn ngay lúc cần (quân mới ra giữa trận) thì khung hình
// đứng lại. Lúc mở game, một worker nặn sẵn các nhân vật của chương đang chơi, gửi về cho nanNguoi.ts dùng lại.

import type { FighterKind } from '../game/battle';
import { NU_TUONG, STAGES, UNITS, type NuTuongId, type UnitType } from '../game/defs';
import { demViec, ghiViec, luuSau, viecCan } from './nanKho';
import { addFigures, hasFigure } from './nanNguoi';
import type { Job, JobDone } from './nanSan';
import workerUrl from './nanSan.worker.ts?worker&url';

/**
 * Phiên bản kho hình nặn (nanKho.ts): tên tệp worker của bản build có dấu nội dung, đổi khi mã nhân vật đổi (mọi
 * tệp gọi `figure` đều nằm trong worker). Số đầu là phiên bản cách gói (nanGoi.ts). Bản dev không dùng kho.
 */
export const KHO_PHIEN_BAN: string | null = import.meta.env.DEV ? null : `1|${workerUrl.split('/').pop()}`;

/** Tướng theo chương. */
const HEROES: Record<number, FighterKind[]> = { 1: ['giong'], 2: ['sonTinh'], 3: ['anDuong'], 4: ['caoLo'], 5: ['trungTrac', 'trungNhi'] };

/**
 * Việc nặn sẵn theo thứ tự cần trước: quân ta (đúng bậc binh khí), giặc và tướng của chương đang chơi, rồi giặc các
 * chương trước (vẫn đánh kinh đô: lũ, đêm yêu tinh, quân Triệu), cá ngoài biển khi Điện đã ra tới biển.
 */
export function prewarmJobs(chapter: number, arms: Record<UnitType, number>, sea: boolean): Job[] {
  const jobs: Job[] = [];
  const seen = new Set<string>();
  const add = (j: Job) => {
    const k = j.join(':');
    if (seen.has(k)) return;
    seen.add(k);
    jobs.push(j);
  };
  for (const u of Object.keys(UNITS) as UnitType[]) if (u !== 'no' || chapter >= 4) add(['danh', u, arms[u] ?? 0]);
  for (let ch = chapter; ch >= 1; ch--) {
    for (const st of STAGES) if (st.chapter === ch) for (const k of Object.keys(st.enemies) as FighterKind[]) add(['danh', k, 0]);
    for (const h of HEROES[ch] ?? []) add(['danh', h, 0]);
    if (ch === 5) {
      add(['danh', 'nghiaBinh', 0]);
      for (const id of Object.keys(NU_TUONG) as NuTuongId[]) add(['nu', id]);
    }
  }
  if (sea) {
    add(['ca', 'whale']);
    add(['ca', 'dolphin']);
  }
  return jobs;
}

/** Việc đã giao cho worker (kể cả đang làm), để lần gọi sau chỉ giao việc mới. */
const given = new Set<string>();

/** Kho trình duyệt đã có đủ các dáng việc `id` cần (biết từ lần chơi trước), khỏi giao cho worker. */
function daCo(id: string): boolean {
  const keys = viecCan(id);
  return !!keys && keys.every(hasFigure);
}

const makeWorker = () =>
  // Bản dev: worker kiểu module; bản build (định dạng iife của Vite): kiểu thường.
  new Worker(workerUrl, { type: import.meta.env.DEV ? 'module' : 'classic' });

/** Worker mở sẵn lúc tải trang (`moSanWorker`), chờ việc. */
let san: Worker | null = null;
/** Số việc đã giao worker mà chưa xong (đo lag chờ về 0 rồi mới đo, khỏi bị worker giành máy). */
let conNan = 0;

export const nanConLai = (): number => conNan;

/**
 * Mở sẵn worker ngay khi tải trang, trước khi đọc kho và dựng cảnh: worker cần luồng chính rảnh một chút mới khởi động
 * được, mà dựng cảnh thì chiếm luồng chính liền mấy giây.
 */
export function moSanWorker(): void {
  if (san || typeof Worker === 'undefined') return;
  try {
    san = makeWorker();
  } catch {
    san = null;
  }
}

/**
 * Giao cho worker nặn sẵn các việc trong `jobs` chưa giao lần nào và kho trình duyệt chưa có đủ (gọi lúc mở game, rồi
 * mỗi khi sang chương, rèn binh khí bậc mới). Worker xong việc thì đóng. Máy không có Worker thì thôi: luồng chính tự
 * nặn lúc cần.
 */
export function nanTruoc(jobs: readonly Job[]): void {
  if (typeof Worker === 'undefined') return;
  const fresh = jobs.filter((j) => !given.has(j.join(':')));
  for (const j of fresh) given.add(j.join(':'));
  const todo = fresh.filter((j) => !daCo(j.join(':')));
  demViec(
    todo.map((j) => j.join(':')),
    fresh.length - todo.length,
  );
  let worker = san;
  san = null;
  if (!todo.length) {
    worker?.terminate();
    return;
  }
  try {
    worker ??= makeWorker();
  } catch {
    return;
  }
  const w = worker;
  let con = todo.length;
  conNan += con;
  const het = () => {
    conNan -= con;
    con = 0;
    w.terminate();
  };
  w.onmessage = (e: MessageEvent<JobDone | null>) => {
    if (!e.data) return het();
    con--;
    conNan--;
    addFigures(e.data.figs);
    ghiViec(e.data.job, e.data.keys);
    luuSau();
  };
  w.onerror = het;
  w.postMessage(todo);
}
