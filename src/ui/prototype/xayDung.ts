// PROTOTYPE, dùng xong bỏ: các phương án hiển thị bảng Xây dựng với ảnh thật của công trình thay cho icon.
// Ba phương án khác nhau về bố cục, chuyển bằng `?variant=` và thanh nổi ở cuối màn hình (chỉ hiện khi bảng
// Xây dựng đang mở). Bản build thật không có thanh này, luôn dùng bảng gốc, trừ khi build với VITE_PROTOTYPE=1.
//
//   A  Thẻ ảnh    lưới ba cột, ảnh chiếm phần lớn thẻ, số đã có và khóa ghi trên ảnh
//   B  Dải ngang  bảng thấp, một dải thẻ ảnh to vuốt ngang, kinh đô vẫn lộ phía trên
//   C  Trưng bày  ảnh lớn của công trình đang chọn (lật xem từng cấp), lời tả, giá, nút Xây; dưới là lưới ảnh nhỏ để chọn
//   goc           bảng icon hiện tại, để so
//
// Chữ hiển thị viết thẳng ở đây (chưa đưa vào vi.ts) vì là bản thử.

import './xayDung.css';
import type { BuildingType } from '../../game/defs';
import { cachedThumb, thumb, thumbKey, type ThumbKind } from '../../render/prototype/anhCongTrinh';

export type Variant = 'A' | 'B' | 'C' | 'goc';
export const VARIANTS: { key: Variant; name: string }[] = [
  { key: 'A', name: 'Thẻ ảnh' },
  { key: 'B', name: 'Dải ngang' },
  { key: 'C', name: 'Trưng bày' },
  { key: 'goc', name: 'Icon hiện tại' },
];

/** Thanh chuyển phương án chỉ có ở bản dev, hay bản build riêng để chủ dự án xem thử. */
export const PROTO_ON = import.meta.env.DEV || import.meta.env.VITE_PROTOTYPE === '1';

/** Một mục trong bảng Xây dựng: công trình, hay công cụ (mẫu kinh đô, đắp đất, dọn trang trí). */
export interface BuildItem {
  key: string;
  act: string;
  type?: BuildingType;
  /** Ảnh vẽ từ mô hình; null là công cụ, chỉ có icon. */
  thumb: ThumbKind | null;
  icon: string;
  name: string;
  /** Dòng phụ của thẻ gốc (cỡ móng · đã có). */
  meta: string;
  /** Cỡ móng, vd "4×4 ô". */
  size?: string;
  /** Đã có / tối đa, vd "5/6". */
  have?: string;
  cost?: string;
  why?: string;
  desc?: string;
  maxLevel?: number;
}

export interface BuildMenuData {
  tabs: string;
  note: string;
  items: BuildItem[];
}

export function currentVariant(): Variant {
  if (!PROTO_ON) return 'goc';
  const v = new URLSearchParams(location.search).get('variant');
  return VARIANTS.some((x) => x.key === v) ? (v as Variant) : 'A';
}

function setVariant(v: Variant): void {
  const url = new URL(location.href);
  url.searchParams.set('variant', v);
  history.replaceState(history.state, '', url);
}

// ---------- Phương án C: mục đang chọn và cấp đang xem ----------

let pick: string | null = null;
let lvl = 1;

/** Bấm trong phương án C: chọn mục, lật cấp. Trả true khi đã xử lý. */
export function protoClick(act: string, el: HTMLElement, items: BuildItem[]): boolean {
  if (act === 'protoPick') {
    pick = el.dataset.key ?? null;
    lvl = 1;
    return true;
  }
  if (act === 'protoLevel') {
    const it = items.find((i) => i.key === pick);
    const max = it?.maxLevel ?? 1;
    lvl = ((lvl - 1 + Number(el.dataset.delta) + max) % max) + 1;
    return true;
  }
  return false;
}

/** Đổi nhóm thì chọn lại từ đầu. */
export function protoResetPick(): void {
  pick = null;
  lvl = 1;
}

const img = (it: BuildItem, px: number, level = 1) => {
  const url = it.thumb ? thumb(it.thumb, level, px) : null;
  if (url) return `<img src="${url}" alt="" draggable="false">`;
  // Ảnh chưa vẽ xong: icon tạm, `patchThumbs` thay tại chỗ khi ảnh về (không vẽ lại cả bảng cho khỏi nháy).
  return it.thumb
    ? `<span class="pp-emoji loading" data-thumb="${thumbKey(it.thumb, level, px)}">${it.icon}</span>`
    : `<span class="pp-emoji">${it.icon}</span>`;
};

/** Thay các icon tạm bằng ảnh đã vẽ xong. */
export function patchThumbs(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-thumb]')) {
    const url = cachedThumb(el.dataset.thumb!);
    if (!url) continue;
    const im = document.createElement('img');
    im.src = url;
    im.alt = '';
    im.draggable = false;
    el.replaceWith(im);
  }
}

const dataAttrs = (it: BuildItem) => `data-act="${it.act}"${it.type ? ` data-type="${it.type}"` : ''}`;

// ---------- A: Thẻ ảnh ----------

function variantA(d: BuildMenuData): string {
  const cards = d.items
    .map(
      (it) => `<button class="pa-card ${it.why ? 'locked' : ''}" ${dataAttrs(it)}>
        <span class="pa-pic">${img(it, 256)}
          ${it.have ? `<span class="pa-have">${it.have}</span>` : ''}
          ${it.size ? `<span class="pa-size">${it.size}</span>` : ''}
          ${it.why ? '<span class="pa-lock">🔒</span>' : ''}
        </span>
        <span class="pa-name">${it.name}</span>
        ${it.cost ? `<span class="pa-cost">${it.cost}</span>` : `<span class="pa-meta">${it.meta}</span>`}
        ${it.why ? `<span class="pa-why">${it.why}</span>` : ''}
      </button>`,
    )
    .join('');
  return `${d.tabs}${d.note}<div class="pa-grid">${cards}</div>`;
}

// ---------- B: Dải ngang ----------

function variantB(d: BuildMenuData): string {
  const cards = d.items
    .map(
      (it) => `<button class="pb-card ${it.why ? 'locked' : ''}" ${dataAttrs(it)}>
        <span class="pb-pic">${img(it, 256)}${it.have ? `<span class="pb-have">${it.have}</span>` : ''}</span>
        <span class="pb-name">${it.name}</span>
        <span class="pb-meta">${it.size ?? it.meta}</span>
        ${it.cost ?? ''}
        ${it.why ? `<span class="pb-why">${it.why}</span>` : ''}
      </button>`,
    )
    .join('');
  return `${d.tabs}${d.note}<div class="pb-shelf" data-keep-scroll="x">${cards}</div>
    <p class="pb-hint">Vuốt ngang để xem thêm · ${d.items.length} mục</p>`;
}

// ---------- C: Trưng bày ----------

function variantC(d: BuildMenuData): string {
  if (!d.items.some((i) => i.key === pick)) {
    pick = (d.items.find((i) => i.thumb && !i.why) ?? d.items.find((i) => i.thumb) ?? d.items[0])?.key ?? null;
    lvl = 1;
  }
  const it = d.items.find((i) => i.key === pick);
  let stage = '';
  if (it) {
    const max = it.maxLevel ?? 1;
    const levels =
      it.thumb && max > 1
        ? `<button class="pc-arrow l" data-act="protoLevel" data-delta="-1" aria-label="Cấp trước">‹</button>
           <button class="pc-arrow r" data-act="protoLevel" data-delta="1" aria-label="Cấp sau">›</button>
           <span class="pc-lv">Cấp ${lvl}/${max}${lvl > 1 ? ' · khi nâng' : ''}</span>`
        : '';
    const go = it.act === 'chooseBuild' || it.act === 'chooseUNo' ? '🔨 Xây' : 'Mở';
    stage = `<div class="pc-stage">
      <div class="pc-pic">${img(it, 512, lvl)}${levels}</div>
      <div class="pc-info">
        <h3>${it.name}</h3>
        <p class="pc-meta">${it.meta}</p>
        ${it.desc ? `<p class="pc-desc">${it.desc}</p>` : ''}
        ${it.cost ?? ''}
        ${it.why ? `<p class="pc-why">${it.why}</p>` : ''}
        <button class="btn ${it.why ? 'ghost' : ''}" ${dataAttrs(it)} ${it.why ? 'disabled' : ''}>${go}</button>
      </div>
    </div>`;
  }
  const minis = d.items
    .map(
      (m) => `<button class="pc-mini ${m.key === pick ? 'on' : ''} ${m.why ? 'locked' : ''}" data-act="protoPick" data-key="${m.key}">
        ${img(m, 256)}<span>${m.name}</span></button>`,
    )
    .join('');
  return `${d.tabs}${d.note}${stage}<div class="pc-grid">${minis}</div>`;
}

export function protoBuildHtml(v: Variant, d: BuildMenuData): string {
  if (v === 'A') return variantA(d);
  if (v === 'B') return variantB(d);
  return variantC(d);
}

// ---------- Thanh chuyển phương án ----------

/** Thanh nổi giữa cạnh dưới: ‹ nhãn ›, phím ← → cũng chuyển. `onChange` vẽ lại bảng. */
export function mountSwitcher(root: HTMLElement, onChange: () => void): void {
  if (!PROTO_ON) return;
  const bar = document.createElement('div');
  bar.className = 'proto-switcher';
  bar.innerHTML = `<button data-dir="-1" aria-label="Phương án trước">◀</button><span class="lbl"></span><button data-dir="1" aria-label="Phương án sau">▶</button>`;
  const label = bar.querySelector<HTMLElement>('.lbl')!;
  const show = () => {
    const v = currentVariant();
    const name = VARIANTS.find((x) => x.key === v)!.name;
    label.textContent = `PROTOTYPE · ${v === 'goc' ? 'Gốc' : v} (${name})`;
  };
  const step = (dir: number) => {
    const i = VARIANTS.findIndex((x) => x.key === currentVariant());
    setVariant(VARIANTS[(i + dir + VARIANTS.length) % VARIANTS.length].key);
    show();
    onChange();
  };
  bar.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-dir]');
    if (b) step(Number(b.dataset.dir));
  });
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, [contenteditable]')) return;
    if (!root.classList.contains('proto-build')) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  show();
  root.appendChild(bar);
}
