// Nặn trước: hình nặn tốn vài trăm mili giây mỗi dáng, nặn ngay lúc cần (quân mới ra giữa trận) thì khung hình
// đứng lại. Lúc mở game, một worker nặn sẵn các nhân vật của chương đang chơi, gửi về cho nanNguoi.ts dùng lại.

import type { FighterKind } from '../game/battle';
import { NU_TUONG, STAGES, UNITS, type NuTuongId, type UnitType } from '../game/defs';
import { addFigures, type FigureData } from './nanNguoi';
import type { Job } from './nanSan';

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
      add(['danh', 'lauThuyen', 0]);
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

/**
 * Mở một worker nặn sẵn các việc trong `jobs` chưa giao lần nào (gọi lúc mở game, rồi mỗi khi sang chương, rèn binh
 * khí bậc mới). Worker xong việc thì đóng. Máy không có Worker thì thôi: luồng chính tự nặn lúc cần.
 */
export function nanTruoc(jobs: readonly Job[]): void {
  if (typeof Worker === 'undefined') return;
  const fresh = jobs.filter((j) => !given.has(j.join(':')));
  if (!fresh.length) return;
  let worker: Worker;
  try {
    worker = new Worker(new URL('./nanSan.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return;
  }
  for (const j of fresh) given.add(j.join(':'));
  worker.onmessage = (e: MessageEvent<FigureData[] | null>) => {
    if (e.data) addFigures(e.data);
    else worker.terminate();
  };
  worker.onerror = () => worker.terminate();
  worker.postMessage(fresh);
}
