// Bảng Xây dựng kiểu trưng bày: ảnh lớn của mục đang chọn, lời tả, giá, nút Xây; dưới là lưới ảnh nhỏ để chọn.
// Ảnh vẽ từ mô hình công trình cấp 1 (`render/anhCongTrinh.ts`); ảnh chưa vẽ xong thì hiện icon tạm, `patchThumbs`
// thay tại chỗ khi ảnh về để khỏi vẽ lại cả bảng.

import type { BuildingType } from '../game/defs';
import { cachedThumb, thumb, thumbKey, type ThumbKind } from '../render/anhCongTrinh';
import { vi } from '../text/vi';

/** Ảnh nhỏ trong lưới và ảnh lớn ở trên, rộng chừng này điểm ảnh (khổ 4:3). */
const MINI_PX = 256;
const BIG_PX = 512;

/** Một mục trong bảng Xây dựng: công trình, hay công cụ (mẫu kinh đô, đắp đất, dọn trang trí). */
export interface BuildItem {
  key: string;
  /** `data-act` của nút Xây: chooseBuild, chooseUNo, chooseRaise, chooseClear, openMau. */
  act: 'chooseBuild' | 'chooseUNo' | 'chooseRaise' | 'chooseClear' | 'openMau';
  type?: BuildingType;
  /** Ảnh vẽ từ mô hình; null là công cụ, chỉ có icon. */
  thumb: ThumbKind | null;
  icon: string;
  name: string;
  /** Dòng phụ: cỡ móng · đã có. */
  meta: string;
  desc?: string;
  cost?: string;
  /** Lý do chưa xây được; có thì ảnh xám, nút Xây mờ. */
  why?: string;
  /** Chữ trên nút Xây. */
  go: string;
}

/** Mục đang chọn: giữ mục cũ nếu còn trong nhóm, không thì mục đầu tiên xây được, rồi mục đầu tiên có ảnh. */
export function pickOf(items: BuildItem[], key: string | null): string | null {
  if (items.some((i) => i.key === key)) return key;
  return (items.find((i) => i.thumb && !i.why) ?? items.find((i) => i.thumb) ?? items[0])?.key ?? null;
}

function pic(it: BuildItem, px: number): string {
  const url = it.thumb ? thumb(it.thumb, px) : null;
  if (url) return `<img src="${url}" alt="" draggable="false">`;
  return it.thumb
    ? `<span class="xd-icon loading" data-thumb="${thumbKey(it.thumb, px)}">${it.icon}</span>`
    : `<span class="xd-icon">${it.icon}</span>`;
}

/** Ảnh lớn và thông tin của mục `pick`, rồi lưới ảnh nhỏ của cả nhóm. */
export function xayDungHtml(items: BuildItem[], pick: string | null): string {
  const it = items.find((i) => i.key === pick);
  const stage = it
    ? `<div class="xd-stage">
      <div class="xd-pic">${pic(it, BIG_PX)}</div>
      <div class="xd-info">
        <h3>${it.name}</h3>
        <p class="xd-meta">${it.meta}</p>
        ${it.desc ? `<p class="xd-desc">${it.desc}</p>` : ''}
        ${it.cost ?? ''}
        ${it.why ? `<p class="xd-why">${it.why}</p>` : ''}
        <button class="btn" data-act="${it.act}"${it.type ? ` data-type="${it.type}"` : ''} ${it.why ? 'disabled' : ''}>${it.go}</button>
      </div>
    </div>`
    : '';
  const minis = items
    .map(
      (m) => `<button class="xd-mini ${m.key === pick ? 'on' : ''} ${m.why ? 'locked' : ''}" data-act="pickBuild" data-key="${m.key}" aria-label="${m.name}">
        ${pic(m, MINI_PX)}<span class="xd-name">${m.name}</span></button>`,
    )
    .join('');
  return `${stage}<div class="xd-grid">${minis}</div>`;
}

/** Thay các icon tạm bằng ảnh đã vẽ xong. */
export function patchThumbs(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-thumb]')) {
    const url = cachedThumb(el.dataset.thumb!);
    if (!url) continue;
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.draggable = false;
    el.replaceWith(img);
  }
}

/** Chữ trên nút Xây theo việc của mục. */
export function goLabel(act: BuildItem['act'], road: boolean, decor: boolean): string {
  const g = vi.ui.buildGo;
  if (act === 'chooseBuild') return road ? g.road : decor ? g.decor : g.build;
  return g[act];
}
