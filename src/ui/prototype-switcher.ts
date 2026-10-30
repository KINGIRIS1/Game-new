// PROTOTYPE, DÙNG XONG BỎ: thanh nổi để lật qua các biến thể phong cách hình ảnh (?variant=).
// Chỉ hiện khi URL có ?variant=, nên người chơi bình thường không bao giờ thấy.

export function mountPrototypeSwitcher(variants: { key: string; name: string }[], current: string): void {
  const index = Math.max(
    variants.findIndex((v) => v.key === current),
    0,
  );
  const go = (delta: number) => {
    const next = variants[(index + delta + variants.length) % variants.length];
    const url = new URL(window.location.href);
    url.searchParams.set('variant', next.key);
    window.location.replace(url.toString());
  };

  const bar = document.createElement('div');
  bar.setAttribute('data-prototype-switcher', '');
  bar.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:calc(84px + env(safe-area-inset-bottom, 0px))',
    'transform:translateX(-50%)',
    'display:flex',
    'align-items:center',
    'gap:4px',
    'padding:4px',
    'border-radius:999px',
    'background:#111',
    'color:#fff',
    'box-shadow:0 4px 14px rgba(0,0,0,.35)',
    'font:600 14px system-ui,sans-serif',
    'z-index:1000',
    'white-space:nowrap',
  ].join(';');

  const arrow = (text: string, delta: number, label: string) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.setAttribute('aria-label', label);
    b.style.cssText = 'width:40px;height:40px;border:0;border-radius:50%;background:#333;color:#fff;font-size:18px;cursor:pointer';
    b.addEventListener('click', () => go(delta));
    return b;
  };

  const label = document.createElement('span');
  const v = variants[index];
  label.textContent = `${v.key} (${v.name})`;
  label.style.cssText = 'padding:0 10px';

  bar.append(arrow('←', -1, 'Biến thể trước'), label, arrow('→', 1, 'Biến thể sau'));
  document.body.appendChild(bar);

  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.closest('input, textarea') || t.isContentEditable)) return;
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  });
}
