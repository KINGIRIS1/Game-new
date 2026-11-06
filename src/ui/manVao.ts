// Màn hình vào game: mặt trống đồng có chim Lạc bay vòng, tên game, tóm tắt bản lưu, nút vào kinh đô.
// Hiện ngay khi mở trang, trong lúc dựng cảnh 3D; dựng xong thì cảnh kinh đô hiện ra sau lớp chữ và nút mới bấm được.

import type { TomTat } from '../game/manVao';
import { vi } from '../text/vi';
import { esc, fmt } from './format';

const MUC = '#5a3b14';
const SANG = '#f7ecd4';

const pt = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;

/** Vạch ngắn xếp vòng giữa bán kính `r1` và `r2`. */
function vachVong(n: number, r1: number, r2: number, width = 1): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    d += `M${pt(r1, a)}L${pt(r2, a)}`;
  }
  return `<path d="${d}" stroke="${MUC}" stroke-width="${width}"/>`;
}

/** Ngôi sao giữa mặt trống, mười bốn cánh như trống Ngọc Lũ. */
function ngoiSao(): string {
  const n = 14;
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) pts.push(pt(i % 2 ? 9 : 31, (i / (n * 2)) * Math.PI * 2 - Math.PI / 2));
  return `<polygon points="${pts.join(' ')}" fill="${SANG}" stroke="${MUC}" stroke-width="1.4" stroke-linejoin="round"/>`;
}

/** Vòng răng cưa giữa bán kính `r1` và `r2`. */
function rangCua(n: number, r1: number, r2: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= n * 2; i++) pts.push(pt(i % 2 ? r2 : r1, (i / (n * 2)) * Math.PI * 2));
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="${MUC}" stroke-width="1.1"/>`;
}

/** Vòng tròn có chấm giữa, hoa văn quen của trống đồng. */
function vongCham(n: number, r: number, size: number): string {
  let out = '';
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(r, (i / n) * Math.PI * 2).split(',');
    out += `<circle cx="${x}" cy="${y}" r="${size}" fill="none" stroke="${MUC}" stroke-width="0.9"/><circle cx="${x}" cy="${y}" r="${(size * 0.35).toFixed(2)}" fill="${MUC}"/>`;
  }
  return out;
}

/**
 * Một con chim Lạc bay về phía +x, lưng ở phía −y: mỏ dài, mào ngả ra sau, cánh xòe, đuôi dài.
 * Vẽ cỡ chừng 30 × 16 quanh gốc tọa độ.
 */
const CHIM = `<g fill="${MUC}">
  <path d="M5.5,-1.6 L16,0.2 L5.6,0.4 Z"/>
  <circle cx="4.2" cy="-0.8" r="2.1"/>
  <path d="M3.4,-2.6 Q1.2,-7.6 -3.6,-8.2 Q0.2,-6 2.2,-2.2 Z"/>
  <path d="M2.4,-0.6 Q-2,-11 -8.6,-12 Q-6,-6 -3.4,-0.6 Z"/>
  <ellipse cx="-1.6" cy="0.4" rx="6.4" ry="2.5"/>
  <path d="M-6.6,-0.4 L-15.5,-3.4 L-14.2,-1.2 L-16,0.6 L-14,1.4 L-15.2,3.6 L-6.4,1.6 Z"/>
  <path d="M-0.6,2.4 L0.8,5.6 M1.4,2.2 L2.8,5.2" stroke="${MUC}" stroke-width="0.9"/>
</g>`;

/**
 * Sáu chim Lạc bay ngược chiều kim đồng hồ quanh vòng bán kính `r`, lưng quay ra vành trống.
 * Cả vòng xoay chậm theo hướng chim bay (CSS).
 */
function vongChim(r: number): string {
  const n = 6;
  let out = '';
  for (let i = 0; i < n; i++) {
    const deg = (i / n) * 360;
    const [x, y] = pt(r, (deg * Math.PI) / 180).split(',');
    out += `<g transform="translate(${x} ${y}) rotate(${deg - 90}) scale(1 -1)">${CHIM}</g>`;
  }
  return `<g class="mv-chim">${out}</g>`;
}

/** Mặt trống đồng Đông Sơn làm biểu tượng game. */
export function trongDongSvg(): string {
  return `<svg class="mv-trong" viewBox="-100 -100 200 200" aria-hidden="true">
    <defs>
      <radialGradient id="mv-dong" cx="42%" cy="36%" r="70%">
        <stop offset="0" stop-color="#f2cd7a"/>
        <stop offset="0.55" stop-color="#c8963a"/>
        <stop offset="1" stop-color="#8a6420"/>
      </radialGradient>
    </defs>
    <circle r="97" fill="url(#mv-dong)" stroke="${MUC}" stroke-width="2.4"/>
    ${vachVong(90, 89, 94.5)}
    <circle r="87" fill="none" stroke="${MUC}" stroke-width="1.2"/>
    ${vongCham(26, 81.5, 3.3)}
    <circle r="76" fill="none" stroke="${MUC}" stroke-width="1.2"/>
    ${vongChim(62)}
    <circle r="47" fill="none" stroke="${MUC}" stroke-width="1.2"/>
    ${vachVong(56, 41.5, 46)}
    <circle r="40.5" fill="none" stroke="${MUC}" stroke-width="1"/>
    ${rangCua(22, 34, 39.5)}
    <circle r="33" fill="rgba(90,59,20,0.18)" stroke="${MUC}" stroke-width="1"/>
    ${ngoiSao()}
    <circle r="4.5" fill="${MUC}"/>
  </svg>`;
}

function soundIcon(muted: boolean): string {
  return muted ? '🔇' : '🔊';
}

/** Thẻ tóm tắt bản lưu; `null` khi còn đang dựng cảnh. */
function cardHtml(t: TomTat | null): string {
  if (!t) return '';
  const m = vi.manVao;
  if (t.moi) return `<div class="mv-card new">${esc(m.newGame)}</div>`;
  const chap = t.hetTruyen
    ? `🥁 ${esc(m.hetTruyen)}`
    : `${esc(m.chapter(t.chapter))} · <b>${esc(m.chapterNames[t.chapter])}</b>`;
  return `<div class="mv-card">
    <div class="mv-chap">${chap}</div>
    <div class="mv-stats">
      <span>${vi.buildings.dien.icon} ${esc(m.dien(t.dien))}</span>
      <span>👥 ${esc(m.dan(fmt(t.dan)))}</span>
      <span>🕰️ ${esc(m.vang(t.vang))}</span>
    </div>
  </div>`;
}

export function manVaoHtml(t: TomTat | null, muted: boolean): string {
  const m = vi.manVao;
  const label = t ? (t.moi ? m.start : m.continue) : m.loading;
  return `<div class="mv-veil"></div>
    <button class="mv-sound" data-act="mute" aria-label="${esc(muted ? m.soundOff : m.soundOn)}">${soundIcon(muted)}</button>
    <div class="mv-head">
      <div class="mv-logo">${trongDongSvg()}</div>
      <h1 class="mv-title"><small>${esc(m.titleSmall)}</small><span>${esc(m.titleBig)}</span></h1>
      <p class="mv-tagline">${esc(m.tagline)}</p>
    </div>
    <div class="mv-foot">
      <div class="mv-card-slot">${cardHtml(t)}</div>
      <button class="btn bronze mv-play" data-act="enter" ${t ? '' : 'disabled'}>${esc(label)}</button>
    </div>`;
}

/** Thời gian mờ dần khi vào game (ms), khớp với `transition` ở style.css. */
const FADE_MS = 550;

/**
 * Gắn màn hình vào game lên trang. Trong lúc nó còn hiện, khung giao diện chính (#hud) ẩn đi (lớp `man-vao-on` ở body).
 */
export class ManVao {
  private readonly el: HTMLElement;
  private muted: boolean;
  private tomTat: TomTat | null = null;
  private closed = false;

  constructor(
    parent: HTMLElement,
    muted: boolean,
    private readonly on: { enter: () => void; mute: () => boolean },
  ) {
    this.muted = muted;
    this.el = document.createElement('div');
    this.el.className = 'man-vao';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', vi.gameTitle);
    this.render();
    this.el.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!btn || this.closed) return;
      if (btn.dataset.act === 'mute') {
        this.muted = this.on.mute();
        btn.textContent = soundIcon(this.muted);
        btn.setAttribute('aria-label', this.muted ? vi.manVao.soundOff : vi.manVao.soundOn);
      } else if (btn.dataset.act === 'enter' && this.tomTat) {
        this.on.enter();
      }
    });
    document.body.classList.add('man-vao-on');
    parent.appendChild(this.el);
  }

  get open(): boolean {
    return !this.closed;
  }

  private render(): void {
    this.el.innerHTML = manVaoHtml(this.tomTat, this.muted);
  }

  /** Cảnh đã dựng xong: vén lớp phủ cho thấy kinh đô, hiện tóm tắt bản lưu, cho bấm nút. */
  ready(t: TomTat): void {
    this.tomTat = t;
    this.render();
    // Để trình duyệt vẽ lớp phủ đặc một khung rồi mới mờ đi, cho kinh đô hiện ra từ từ.
    requestAnimationFrame(() => this.el.classList.add('ready'));
  }

  /** Mờ dần rồi gỡ khỏi trang; khung giao diện chính hiện lại cùng lúc. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.el.classList.add('out');
    document.body.classList.remove('man-vao-on');
    window.setTimeout(() => this.el.remove(), FADE_MS);
  }
}
