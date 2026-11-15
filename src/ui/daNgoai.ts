// Giao diện dã ngoại (docs/thiet-ke.md mục Kế hoạch: dã ngoại): bảng ở bản đồ phó bản (chip 🌿: cấp chung, chọn đội,
// năm map, treo máy, ra map hay gọi đội về), bản đồ nhỏ của map (dùng ở bảng và góc màn hình khi đang trên map), dải
// cấp chung ở bảng tướng.

import type { Battle } from '../game/battle';
import { DA_MAP, DA_MAP_IDS, DA_TUONG, type DaMapId } from '../game/defs';
import { bossCho, canLen, daMo, dangTreo, doiNay, khuDangDung, nhipTreo, tuongCo } from '../game/daNgoai';
import { boCuc, khuTai } from '../game/daNgoaiMap';
import { capBonus, capKhu, tuongDau } from '../game/daNgoaiTran';
import type { GameState } from '../game/game';
import { chiSoTuong } from '../game/trangBi';
import { formatDuration, vi } from '../text/vi';

const t = () => vi.daNgoai;

/** Phần trăm thanh kinh nghiệm tới cấp sau. */
export function expPct(s: GameState): number {
  const need = canLen(s.daNgoai.cap);
  return Number.isFinite(need) ? Math.min(100, (100 * s.daNgoai.exp) / need) : 100;
}

/** Dải cấp chung: cấp, thanh kinh nghiệm, phần cộng. Dùng ở bảng dã ngoại và bảng tướng. */
export function capBarHtml(s: GameState): string {
  const d = s.daNgoai;
  const need = canLen(d.cap);
  return `<div class="da-cap"><b>⭐ ${t().cap(d.cap)}</b><span class="da-exp"><i style="width:${expPct(s).toFixed(1)}%"></i></span>
    <small>${t().expBar(Math.floor(d.exp), need)} · ${t().capNote(Math.round(capBonus(d.cap) * 100))}</small></div>`;
}

/** Tên boss của map. */
const bossTen = (map: DaMapId) => vi.enemies[DA_MAP[map].boss];

/** Màu nền bản đồ nhỏ theo nền map. */
const NEN: Record<DaMapId, string> = { 1: '#7f9b55', 2: '#7d9a7a', 3: '#5f6c74', 4: '#b4a57a', 5: '#6f8b5a' };

/**
 * Bản đồ nhỏ của map (SVG theo ô map, xoay cho khớp hướng camera): lối đi, năm khu có số, trại, cổng, khu boss (mờ
 * khi boss chưa mọc lại). `me` thêm chấm đội (giao diện dời chấm theo `.da-me`).
 */
export function miniSvg(s: GameState, map: DaMapId, me: boolean): string {
  const bc = boCuc(map);
  const W = 80;
  const loi = bc.loi.map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' ');
  const khu = bc.khu
    .map((k, i) => `<circle cx="${k.x}" cy="${k.z}" r="${k.r}" class="mk"/><text x="${k.x}" y="${k.z + 2.2}" class="mt">${i + 1}</text>`)
    .join('');
  const co = bossCho(s, map) === 0;
  const boss = `<circle cx="${bc.boss.x}" cy="${bc.boss.z}" r="${bc.boss.r}" class="mb ${co ? 'co' : ''}"/><text x="${bc.boss.x}" y="${bc.boss.z + 2.6}" class="mt">👑</text>`;
  const cong = (p: { x: number; z: number }, cls: string) => `<rect x="${p.x - 2.2}" y="${p.z - 2.2}" width="4.4" height="4.4" class="mc ${cls}" transform="rotate(45 ${p.x} ${p.z})"/>`;
  const congSau = bc.congSau ? cong(bc.congSau, map < 5 && s.daNgoai.cap < DA_MAP[(map + 1) as DaMapId].cong ? 'khoa' : '') : '';
  const trai = `<circle cx="${bc.trai.x}" cy="${bc.trai.z}" r="2.6" class="mtr"/><text x="${bc.trai.x}" y="${bc.trai.z + 2}" class="mt">⛺</text>`;
  const dot = me ? `<circle class="da-me" cx="${s.daNgoai.cho?.x ?? bc.trai.x}" cy="${s.daNgoai.cho?.z ?? bc.trai.z}" r="2.4"/>` : '';
  // Camera map nhìn thẳng theo trục: x sang phải, z xuống dưới màn hình, như trục SVG (không phải xoay).
  return `<svg class="da-map-svg" viewBox="-2 -2 ${W + 4} ${W + 4}" aria-hidden="true"><g>
    <rect x="0" y="0" width="${W}" height="${W}" rx="4" fill="${NEN[map]}" class="mbg"/>
    <polyline points="${loi}" class="ml"/>${khu}${boss}${cong(bc.congTruoc, '')}${congSau}${trai}${dot}</g></svg>`;
}

/** Bản đồ ở nửa trái bảng (chỗ bản đồ phó bản): map đội đang ở hay ở lần cuối. */
export function daMapHtml(s: GameState): string {
  const d = s.daNgoai;
  return `<div class="da-map"><h3>${vi.daNgoai.maps[d.map]}</h3>${miniSvg(s, d.map, d.dangO)}</div>`;
}

/** Bảng dã ngoại: cấp chung, đội, năm map, treo máy, nút ra map. */
export function daNgoaiHtml(s: GameState): string {
  const T = t();
  if (!daMo(s)) return `<h3>🌿 ${T.title}</h3><p>${T.locked}</p>`;
  const d = s.daNgoai;
  const doi = doiNay(s);
  const chips = tuongCo(s)
    .map((k) => {
      const on = doi.includes(k);
      const full = !on && doi.length >= DA_TUONG.max;
      return `<button class="da-hero ${on ? 'on' : ''}" data-act="daDoi" data-hero="${k}" ${full ? 'disabled' : ''}><em>${vi.ui.tuongIcons[k]}</em><span>${vi.ui.heroNames[k]}</span><small>${chiSoTuong(s, k).lucChien}</small></button>`;
    })
    .join('');
  const maps = DA_MAP_IDS.map((id) => {
    const m = DA_MAP[id];
    const toi = id <= d.xa && d.cap >= m.cong;
    const cho = bossCho(s, id);
    const here = id === d.map;
    const boss = cho ? T.bossCho(bossTen(id), formatDuration(cho * 1000)) : T.bossCo(bossTen(id));
    const sub = d.cap < m.cong ? T.mapCong(m.cong) : `${T.mapCap(m.cap[0], m.cap[1])} · ${boss}`;
    return `<button class="da-mapi ${here ? 'on' : ''}" data-act="daMap" data-id="${id}" ${toi ? '' : 'disabled'}>
      <b>${id}. ${T.maps[id]}${here ? ` <small>· ${T.mapHere}</small>` : ''}</b><small>${sub}</small></button>`;
  }).join('');
  const khu = khuDangDung(s);
  const treo = !d.dangO ? T.treoNone : dangTreo(s) ? T.treoOn(khu + 1, Math.round(nhipTreo(s) * 10) / 10) : T.treoOff;
  const btns = d.dangO
    ? `<button class="btn bronze" data-act="daVao">${T.xem}</button><button class="btn ghost" data-act="daVe">${T.ve}</button>`
    : `<button class="btn bronze" data-act="daVao">${T.vao}</button>`;
  return `<h3>🌿 ${T.title}</h3>
    <p class="muted">${T.intro}</p>
    ${capBarHtml(s)}
    <h4>${T.doiTitle}</h4><div class="da-heroes">${chips}</div><p class="muted small">${T.doiNote}</p>
    <div class="da-btns">${btns}<button class="btn small ${d.tuDanh ? 'bronze' : 'ghost'}" data-act="daTuDanh" title="${T.tuDanhTitle}">${T.tuDanh}${d.tuDanh ? ' ✓' : ''}</button></div>
    <div class="stat"><span>⏳ ${T.treoTitle}</span><b>${treo}</b></div>
    <h4>${T.mapsTitle}</h4><div class="da-maps">${maps}</div>
    <p class="muted small">${T.note}</p>`;
}

/** Tên chỗ tướng đầu đang đứng: khu mấy (cấp quái), khu boss, trại, đường đi. */
export function choTen(b: Battle): string {
  const da = b.da!;
  const lead = tuongDau(b);
  const bc = boCuc(da.map);
  if (!lead) return t().trai;
  const k = khuTai(bc, lead.x, lead.z, 1);
  if (k >= 0) {
    const [lo, hi] = capKhu(da.map, k);
    return t().khu(k + 1, lo, hi);
  }
  if (Math.hypot(lead.x - bc.boss.x, lead.z - bc.boss.z) <= bc.boss.r + 1) return t().khuBoss;
  if (Math.hypot(lead.x - bc.trai.x, lead.z - bc.trai.z) <= 6) return t().trai;
  return t().duong;
}

