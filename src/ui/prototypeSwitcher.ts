// PROTOTYPE, DÙNG XONG BỎ. Thanh nổi ở đáy màn hình để lật qua các biến thể giao diện (`?variant=`),
// kèm nút dựng nhanh kinh đô mẫu để xem giao diện lúc đông công trình, nhiều tướng.
// Chỉ lắp khi PROTOTYPE_HUD (bản dev, hay bản dựng có VITE_PROTOTYPE_HUD=1).

import { countOf, createInitialState, type GameState } from '../game/game';
import { saveToStorage } from '../game/save';
import { markStory, pendingStory } from '../game/story';
import type { HudAction } from './hud';

interface Opts {
  variants: { key: string; name: string }[];
  current: string;
  onChange: (key: string) => void;
  getState: () => GameState;
  handle: (a: HudAction) => void;
}

/** Thay toàn bộ state đang chơi bằng kinh đô do người chơi mô phỏng dựng, lưu rồi tải lại trang. */
async function loadDemo(kind: 'd5' | 'd8' | 'fresh', getState: () => GameState): Promise<void> {
  const M = await import('../game/moPhong');
  const s = createInitialState(Date.now());
  if (kind === 'd5') M.playChapters({ s, until: (m) => m.at5 >= 0 });
  else if (kind === 'd8') M.playChapters({ s, last: 8 });
  if (kind !== 'fresh') {
    // Người chơi mô phỏng không dựng doanh trại; thêm một cái để thấy nút Quân, Phó bản.
    if (countOf(s, 'doanhTrai') === 0) {
      for (const r of ['gao', 'voOc', 'datDa', 'sat', 'go'] as const) s.resources[r] += 2000;
      M.placeAnywhere(s, 'doanhTrai');
    }
    for (let id; (id = pendingStory(s)); ) markStory(s, id);
  }
  s.lastSeen = Date.now();
  // Thay ruột state đang chạy để lần lưu khi rời trang (pagehide) cũng lưu đúng kinh đô mẫu.
  const cur = getState() as unknown as Record<string, unknown>;
  for (const k of Object.keys(cur)) delete cur[k];
  Object.assign(cur, s);
  saveToStorage(localStorage, s);
  location.reload();
}

export function mountPrototypeSwitcher(opts: Opts): { set(key: string, name: string): void } {
  const el = document.createElement('div');
  el.className = 'proto-switcher';
  el.innerHTML = `<button class="ps-arrow" data-ps="prev" aria-label="Biến thể trước">‹</button>
    <span class="ps-label"><small>PROTOTYPE</small><b></b></span>
    <button class="ps-arrow" data-ps="next" aria-label="Biến thể sau">›</button>
    <button class="ps-demo" data-ps="menu" aria-label="Dựng cảnh thử">🏯</button>
    <div class="ps-menu" hidden>
      <button data-ps="d5">Kinh đô chương 1 (Điện 5)</button>
      <button data-ps="d8">Kinh đô chương 4 (Điện 8)</button>
      <button data-ps="raid">Gọi giặc ngay</button>
      <button data-ps="fresh">Game mới</button>
    </div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('proto-switcher-on');
  const label = el.querySelector('b')!;
  const menu = el.querySelector<HTMLElement>('.ps-menu')!;
  let key = opts.current;

  const step = (d: number) => {
    const i = opts.variants.findIndex((v) => v.key === key);
    const n = opts.variants.length;
    opts.onChange(opts.variants[(i + d + n) % n].key);
  };

  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-ps]');
    if (!b) return;
    const act = b.dataset.ps!;
    if (act === 'prev') return step(-1);
    if (act === 'next') return step(1);
    if (act === 'menu') {
      menu.hidden = !menu.hidden;
      return;
    }
    menu.hidden = true;
    if (act === 'raid') return opts.handle({ kind: 'callRaid' });
    label.textContent = 'Đang dựng kinh đô…';
    // Chờ một khung cho chữ kịp hiện rồi mới chạy người chơi mô phỏng (vài giây, chạy liền một mạch).
    requestAnimationFrame(() => setTimeout(() => void loadDemo(act as 'd5' | 'd8' | 'fresh', opts.getState), 30));
  });

  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.closest('input, textarea, [contenteditable]') || t.isContentEditable)) return;
    if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  return {
    set(k, name) {
      key = k;
      label.textContent = `${k} · ${name}`;
    },
  };
}
