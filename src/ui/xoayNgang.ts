// Game chỉ chơi màn hình ngang (`docs/thiet-ke.md` mục Hình ảnh, âm thanh, công nghệ): cầm dọc thì lớp này phủ kín
// màn, nhắc xoay ngang. Máy cho thì có nút mở toàn màn hình rồi khóa màn ngang (Chrome Android); iPhone không cho
// khóa, chỉ nhắc xoay.
// Lớp chỉ hiện khi màn đứng dọc (CSS `.xoay-ngang` trong `@media (orientation: portrait)`).
import { vi } from '../text/vi';

/** Bản `ScreenOrientation` có `lock` (lib.dom của TypeScript không phải bản nào cũng khai báo). */
type HuongMan = { lock?: (huong: 'landscape') => Promise<void> };

const huongMan = (): HuongMan | undefined => (typeof screen === 'undefined' ? undefined : (screen.orientation as HuongMan | undefined));

/** Máy cho mở toàn màn hình và khóa hướng màn. */
export function khoaNgangDuoc(): boolean {
  return typeof document.documentElement.requestFullscreen === 'function' && typeof huongMan()?.lock === 'function';
}

/** Mở toàn màn hình rồi khóa màn ngang; máy không cho thì thôi, lớp phủ còn nhắc xoay. Phải gọi từ một lần chạm. */
export async function moManNgang(): Promise<void> {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await huongMan()?.lock?.('landscape');
  } catch {
    // Máy, trình duyệt không cho: người chơi tự xoay máy.
  }
}

/** Điện thoại vẽ nét đồng, xoay từ dọc sang ngang (CSS `.xn-may`). */
const MAY = `<svg class="xn-may" viewBox="0 0 120 120" aria-hidden="true">
  <path class="xn-mui" d="M 92 30 A 44 44 0 0 1 100 70" />
  <path class="xn-mui" d="M 94 62 L 100 72 L 106 61" />
  <g class="xn-than">
    <rect x="38" y="22" width="44" height="76" rx="8" />
    <circle cx="60" cy="88" r="3" />
  </g>
</svg>`;

/** Dựng lớp phủ nhắc xoay ngang vào `body`. */
export function dungXoayNgang(): HTMLElement {
  const t = vi.ui.xoayNgang;
  const el = document.createElement('div');
  el.className = 'xoay-ngang';
  el.setAttribute('role', 'alert');
  el.innerHTML = `${MAY}<p>${t.loi}</p>${khoaNgangDuoc() ? `<button class="btn" type="button">${t.nut}</button>` : `<small>${t.ghi}</small>`}`;
  el.querySelector('button')?.addEventListener('click', () => void moManNgang());
  document.body.appendChild(el);
  return el;
}
