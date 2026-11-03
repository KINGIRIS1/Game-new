// Bảng Xây dựng kiểu trưng bày: ảnh lớn của mục đang chọn, lời tả, giá, nút chính; dưới là lưới ảnh nhỏ để chọn.
// Dùng chung cho các thẻ công trình, đường đi, trang trí và mẫu kinh đô. Ảnh công trình vẽ sẵn
// (`scripts/anh-cong-trinh.mjs`, public/anh-cong-trinh/), game chỉ tải như ảnh thường.

import { ANH_DAU } from '../render/anhCongTrinhDau';
import { vi } from '../text/vi';

/** Một mục trong bảng Xây dựng: công trình, công cụ (đắp đất, dọn trang trí) hay mẫu kinh đô. */
export interface BuildItem {
  key: string;
  /** `data-act` của nút chính dưới ảnh lớn. */
  act: 'chooseBuild' | 'chooseUNo' | 'chooseRaise' | 'chooseClear' | 'applyMau';
  /** Thuộc tính thêm cho nút chính, vd `data-type="ruong"`. */
  attrs?: string;
  /** Địa chỉ ảnh; null thì hiện icon. */
  pic: string | null;
  /** Ảnh vuông (bản đồ mẫu) thay vì 4:3. */
  square?: boolean;
  icon: string;
  name: string;
  /** Dòng phụ: cỡ móng · đã có, hay việc mẫu sẽ làm. */
  meta: string;
  desc?: string;
  cost?: string;
  /** Lý do chưa làm được; có thì ảnh nhỏ xám, nút chính mờ. */
  why?: string;
  /** Chữ trên nút chính. */
  go: string;
  /** Nút chính màu đồng (đang chờ bấm lần nữa). */
  armed?: boolean;
  /** Ghi chú dài dưới ảnh lớn, trọn bề ngang (lời tả mẫu kinh đô). */
  note?: string;
}

/** Địa chỉ ảnh vẽ sẵn của loại công trình (hay ụ nỏ); null khi chưa có ảnh. `?v=` đổi khi ảnh vẽ lại. */
export function thumbUrl(kind: string): string | null {
  const v = ANH_DAU[kind];
  return v ? `${import.meta.env.BASE_URL}anh-cong-trinh/${kind}.webp?v=${v}` : null;
}

/** Tải sẵn mọi ảnh công trình lúc rảnh, để mở bảng Xây dựng lần đầu là có ảnh ngay. */
export function preloadThumbs(): void {
  const load = () => {
    for (const kind of Object.keys(ANH_DAU)) {
      const img = new Image();
      img.decoding = 'async';
      img.src = thumbUrl(kind)!;
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 3000 });
  else setTimeout(load, 1500);
}

/**
 * Mục đang chọn: giữ mục cũ nếu còn trong nhóm, không thì `prefer`, rồi mục đầu tiên làm được, rồi mục đầu tiên có ảnh.
 */
export function pickOf(items: BuildItem[], key: string | null, prefer?: string): string | null {
  if (items.some((i) => i.key === key)) return key;
  if (prefer && items.some((i) => i.key === prefer)) return prefer;
  return (items.find((i) => i.pic && !i.why) ?? items.find((i) => i.pic) ?? items[0])?.key ?? null;
}

function pic(it: BuildItem): string {
  return it.pic ? `<img src="${it.pic}" alt="" draggable="false" decoding="async">` : `<span class="xd-icon">${it.icon}</span>`;
}

/** Ảnh lớn và thông tin của mục `pick`, lưới ảnh nhỏ của cả nhóm, rồi `foot` (ghi chú cuối bảng). */
export function xayDungHtml(items: BuildItem[], pick: string | null, foot = ''): string {
  const it = items.find((i) => i.key === pick);
  const stage = it
    ? `<div class="xd-stage ${it.square ? 'square' : ''}">
      <div class="xd-pic">${pic(it)}</div>
      <div class="xd-info">
        <h3>${it.name}</h3>
        <p class="xd-meta">${it.meta}</p>
        ${it.desc ? `<p class="xd-desc">${it.desc}</p>` : ''}
        ${it.cost ?? ''}
        ${it.why ? `<p class="xd-why">${it.why}</p>` : ''}
        <button class="btn ${it.armed ? 'bronze' : ''}" data-act="${it.act}" ${it.attrs ?? ''} ${it.why ? 'disabled' : ''}>${it.go}</button>
      </div>
      ${it.note ? `<p class="xd-note">${it.note}</p>` : ''}
    </div>`
    : '';
  const minis = items
    .map(
      (m) => `<button class="xd-mini ${m.square ? 'square' : ''} ${m.key === pick ? 'on' : ''} ${m.why ? 'locked' : ''}" data-act="pickBuild" data-key="${m.key}" aria-label="${m.name}">
        ${pic(m)}<span class="xd-name">${m.name}</span></button>`,
    )
    .join('');
  // Nhóm toàn ảnh vuông (bốn mẫu kinh đô) thì lưới bốn cột cho ảnh to hơn.
  const square = items.length > 0 && items.every((i) => i.square);
  return `${stage}<div class="xd-grid ${square ? 'square' : ''}">${minis}</div>${foot}`;
}

/** Chữ trên nút Xây theo việc của mục. */
export function goLabel(act: Exclude<BuildItem['act'], 'applyMau'>, road: boolean, decor: boolean): string {
  const g = vi.ui.buildGo;
  if (act === 'chooseBuild') return road ? g.road : decor ? g.decor : g.build;
  return g[act];
}
