// Kho hình nặn trong trình duyệt (IndexedDB). Nặn một dáng tốn vài trăm mili giây, nên dáng đã nặn được gói gọn
// (nanGoi.ts) rồi cất lại; lần mở game sau lấy ra dùng, khỏi nặn lại: dân, tướng đứng chầu dựng ngay lúc dựng cảnh,
// worker nặn sẵn bỏ qua việc đã có đủ dáng trong kho.
// - Kho gắn với phiên bản mã nhân vật (`KHO_PHIEN_BAN` ở nanTruoc.ts: đường dẫn worker có dấu nội dung của bản
//   build). Mã nhân vật đổi thì kho cũ bị xóa, nặn lại từ đầu. Bản dev không dùng kho (mã đổi liên tục).
// - Lấy ra lười: lúc mở game chỉ đọc bản gói, dáng nào cần tới mới mở ra (`take`).
// - Lưu dần lúc chơi (`luuSau`): gói từng ít một rồi nhường luồng, cho khỏi khựng hình.
// - Trình duyệt không cho dùng kho (chế độ riêng tư, đầy chỗ) thì thôi, game vẫn chạy như không có kho.

import { packFigure, packedBytes, unpackFigure, type PackedFigure } from './nanGoi';
import { figureCount, newFigures, sculptStats, setFigureStore } from './nanNguoi';

const DB = 'vanLangNan';
const DANG = 'dang';
const META = 'meta';
/** Chờ kho tối đa chừng này lúc mở game; quá thì chơi không có kho. */
const CHO_MS = 2000;
/** Có dáng mới thì chờ chừng này rồi mới lưu, gom một lượt. */
const HEN_MS = 3000;
/** Gói liền một mạch tối đa chừng này mili giây rồi nhường luồng. */
const LUOT_MS = 8;

let db: IDBDatabase | null = null;
/** Bản gói đọc từ kho, chưa mở ra. */
const kept = new Map<string, PackedFigure>();
/** Mỗi việc nặn sẵn (nanTruoc.ts) cần những dáng nào, để lần sau thấy đủ thì bỏ qua việc ấy. */
let viec: Record<string, string[]> = {};
let viecDoi = false;
let luuDem = 0;
let hen: ReturnType<typeof setTimeout> | null = null;
let dangLuu = false;
const tk = { phienBan: '', napMs: 0, daCo: 0, cuMB: 0, daLuu: 0, moiMB: 0, loi: '', viecGiao: [] as string[], viecBoQua: 0 };

const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((ok, fail) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });

const xong = (tx: IDBTransaction) =>
  new Promise<void>((ok, fail) => {
    tx.oncomplete = () => ok();
    tx.onerror = tx.onabort = () => fail(tx.error ?? new Error('abort'));
  });

function open(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore(DANG, { keyPath: 'key' });
      r.result.createObjectStore(META);
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
    r.onblocked = () => fail(new Error('blocked'));
  });
}

async function nap(phienBan: string, huy: { v: boolean }): Promise<void> {
  const d = await open();
  const ver = await req(d.transaction(META, 'readonly').objectStore(META).get('phienBan'));
  if (ver !== phienBan) {
    // Mã nhân vật đã đổi (hay kho mới): xóa sạch, ghi phiên bản mới.
    const tx = d.transaction([DANG, META], 'readwrite');
    tx.objectStore(DANG).clear();
    tx.objectStore(META).clear();
    tx.objectStore(META).put(phienBan, 'phienBan');
    await xong(tx);
  } else {
    const tx = d.transaction([DANG, META], 'readonly');
    const [list, jobs] = await Promise.all([req(tx.objectStore(DANG).getAll() as IDBRequest<PackedFigure[]>), req(tx.objectStore(META).get('viec'))]);
    if (huy.v) return d.close();
    for (const f of list) kept.set(f.key, f);
    viec = (jobs as Record<string, string[]> | undefined) ?? {};
  }
  if (huy.v) return d.close();
  db = d;
}

/** Mở kho lúc mở game (trước khi dựng cảnh). `phienBan` null thì không dùng kho. Không bao giờ ném lỗi. */
export async function moKhoNan(phienBan: string | null): Promise<void> {
  if (!phienBan || typeof indexedDB === 'undefined') return;
  const t0 = performance.now();
  const huy = { v: false };
  try {
    await Promise.race([nap(phienBan, huy), new Promise((_, fail) => setTimeout(() => fail(new Error('quá lâu')), CHO_MS))]);
  } catch (e) {
    huy.v = true;
    db = null;
    kept.clear();
    viec = {};
    tk.loi = String(e);
    return;
  }
  tk.phienBan = phienBan;
  tk.napMs = Math.round(performance.now() - t0);
  tk.daCo = kept.size;
  for (const f of kept.values()) tk.cuMB += packedBytes(f) / 1e6;
  setFigureStore({
    has: (k) => kept.has(k),
    take: (k) => {
      const p = kept.get(k);
      if (!p) return undefined;
      kept.delete(k);
      return unpackFigure(p);
    },
  });
  luuDem = figureCount();
}

/** Đếm việc nặn sẵn đã giao cho worker và đã bỏ qua vì kho có đủ (số liệu chụp thử). */
export function demViec(giao: readonly string[], boQua: number): void {
  tk.viecGiao.push(...giao);
  tk.viecBoQua += boQua;
}

/** Các dáng việc nặn sẵn `id` cần, nếu đã biết từ lần trước. */
export function viecCan(id: string): string[] | undefined {
  return viec[id];
}

/** Ghi lại các dáng việc nặn sẵn `id` cần (lưu cùng lượt sau). Việc hỏng (`keys` null) thì không ghi. */
export function ghiViec(id: string, keys: string[] | null): void {
  if (!db || !keys) return;
  viec[id] = keys;
  viecDoi = true;
}

/** Gọi thường xuyên (mỗi lượt vẽ lại giao diện, mỗi lần worker gửi dáng về): có dáng mới thì hẹn một lượt lưu. */
export function luuSau(): void {
  if (!db || hen || dangLuu) return;
  if (figureCount() === luuDem && !viecDoi) return;
  hen = setTimeout(() => void luu(), HEN_MS);
}

async function luu(): Promise<void> {
  hen = null;
  if (!db) return;
  dangLuu = true;
  try {
    luuDem = figureCount();
    const moi = newFigures(false);
    const goi: PackedFigure[] = [];
    let t = performance.now();
    for (const f of moi) {
      goi.push(packFigure(f));
      if (performance.now() - t > LUOT_MS) {
        await new Promise((r) => setTimeout(r, 0));
        t = performance.now();
      }
    }
    if (goi.length || viecDoi) {
      const tx = db.transaction([DANG, META], 'readwrite');
      for (const g of goi) tx.objectStore(DANG).put(g);
      if (viecDoi) tx.objectStore(META).put(viec, 'viec');
      viecDoi = false;
      await xong(tx);
      tk.daLuu += goi.length;
      for (const g of goi) tk.moiMB += packedBytes(g) / 1e6;
    }
  } catch (e) {
    // Đầy chỗ hay trình duyệt chặn: thôi lưu, game vẫn chạy.
    tk.loi = String(e);
    db = null;
  } finally {
    dangLuu = false;
  }
}

/** Số liệu kho cho chụp thử (`window.__debug.khoNan()`). */
export function khoNanTk(): typeof tk & { conTrongKho: number; dangCo: number; luuDem: number; dangLuu: boolean; henLuu: boolean; moKho: boolean; viecDaBiet: number; nanLan: number; nanMs: number; nanTen: string[] } {
  return { ...tk, cuMB: Math.round(tk.cuMB * 10) / 10, moiMB: Math.round(tk.moiMB * 10) / 10, conTrongKho: kept.size, dangCo: figureCount(), luuDem, dangLuu, henLuu: !!hen, moKho: !!db, viecDaBiet: Object.keys(viec).length, nanLan: sculptStats.lan, nanMs: Math.round(sculptStats.ms), nanTen: [...sculptStats.ten] };
}
