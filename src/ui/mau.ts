// Thẻ Mẫu kinh đô trong bảng Xây dựng: mỗi mẫu một mục (bản đồ thu nhỏ làm ảnh, số công trình sẽ dời, dựng thêm,
// dỡ đi, tổng giá, nút áp mẫu bấm hai lần cho chắc), bày như công trình (`xayDung.ts`).

import { BUILDINGS, type BuildingType } from '../game/defs';
import { dienLevel, unlocked, type GameState } from '../game/game';
import { canApplyMau, frameStart, mauSlots, mauUnlocked, planMau, MAU_IDS, type MauId } from '../game/mau';
import { isOpen, khoanhOf, openStart } from '../game/khoanh';
import { RIVER_START } from '../game/map';
import { vi } from '../text/vi';
import { costHtml } from './format';
import type { BuildItem } from './xayDung';

/** Màu nền bản đồ thu nhỏ: đất đã khai phá, rừng chưa phát (mờ), sông. */
const MINI = { land: '#b9c47e', wild: '#93a165', river: '#3f7f9a' };

/** Màu ô trên bản đồ thu nhỏ theo loại công trình. */
const TILE: Partial<Record<BuildingType, string>> = {
  dien: '#b0392b',
  ruong: '#c9b04a',
  ruongNep: '#e4d7a0',
  ben: '#3f7f9a',
  langChai: '#5f9fb0',
  nhaSan: '#a8743c',
  baiDa: '#8d877d',
  loRen: '#4f4038',
  xuongMoc: '#9a6a3a',
  kho: '#d29a3c',
  doanhTrai: '#7a2f25',
  traiGiao: '#94443a',
  traiCung: '#a35a3a',
  chuongVoi: '#6e5a4e',
  traiNo: '#b3553a',
  choiCanh: '#5a3b20',
  bayChong: '#9fbf5a',
  luy: '#6b8f3a',
  de: '#6d5a40',
  thanh: '#5c4630',
  congThanh: '#c0392b',
  denPhuDong: '#e0703a',
  denTanVien: '#2f8a6a',
  denCoLoa: '#c8a020',
  hoKimQuy: '#2f9ab8',
  vuon: '#4f9a42',
  chuongLon: '#3a3330',
  bep: '#c45a2a',
};

const miniCache = new Map<string, string>();

/**
 * Bản đồ thu nhỏ của mẫu ở cấp Điện hiện tại, từ bìa khung mẫu hay đất đã mở (xa hơn thì lấy) tới sông: ô rừng chưa
 * phát vẽ mờ, chỗ của mẫu nằm trong rừng cũng mờ, sông xanh ở hai cạnh. Vẽ lên canvas một lần cho mỗi mẫu, mỗi cấp
 * Điện và mỗi bộ khoảnh đã mở.
 */
function miniMap(state: GameState, id: MauId): string {
  const level = dienLevel(state);
  const x0 = Math.max(0, Math.min(frameStart(level), openStart(state)) - 1);
  // Cổng thành đã mở thì chỗ cổng trong mẫu tô màu cổng, chưa mở thì vẫn là tường.
  const gate = unlocked(state, BUILDINGS.congThanh.unlock) && level >= BUILDINGS.congThanh.minDien;
  const key = `${id}:${level}:${gate ? 1 : 0}:${state.khoanh.join(',')}`;
  let url = miniCache.get(key);
  if (!url) {
    const n = RIVER_START + 1 - x0;
    const px = 4;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = n * px;
    const g = canvas.getContext('2d')!;
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const tx = x + x0;
        const tz = z + x0;
        g.fillStyle = tx >= RIVER_START || tz >= RIVER_START ? MINI.river : isOpen(state, tx, tz) ? MINI.land : MINI.wild;
        g.fillRect(x * px, z * px, px, px);
      }
    }
    for (const s of mauSlots(id, level)) {
      const def = BUILDINGS[s.type];
      g.globalAlpha = isOpen(state, s.x, s.z) ? 1 : 0.45;
      g.fillStyle = (gate && s.cong ? TILE.congThanh : TILE[s.type]) ?? MINI.land;
      g.fillRect((s.x - x0) * px, (s.z - x0) * px, def.w * px, def.d * px);
    }
    g.globalAlpha = 1;
    url = canvas.toDataURL();
    miniCache.set(key, url);
  }
  return url;
}

/** Số khoảnh rừng chưa phát mà mẫu ở cấp Điện hiện tại có chỗ đặt công trình trong đó. */
function wildKhoanh(state: GameState, id: MauId): number {
  const wild = new Set<number>();
  for (const s of mauSlots(id, dienLevel(state))) {
    const def = BUILDINGS[s.type];
    for (let dx = 0; dx < def.w; dx++) {
      for (let dz = 0; dz < def.d; dz++) {
        const k = khoanhOf(s.x + dx, s.z + dz);
        if (k >= 0 && !isOpen(state, s.x + dx, s.z + dz)) wild.add(k);
      }
    }
  }
  return wild.size;
}

/** Các mục của thẻ Mẫu kinh đô và mẫu nên chọn sẵn (mẫu mới mở nhất). `armed`: mẫu vừa bấm Áp lần đầu. */
export function mauItems(state: GameState, armed: MauId | null): { items: BuildItem[]; prefer: MauId } {
  let prefer: MauId = 'phongChau';
  const items = MAU_IDS.map((id): BuildItem => {
    const t = vi.ui.mau[id];
    const base = { key: id, act: 'applyMau' as const, attrs: `data-mau="${id}"`, pic: miniMap(state, id), square: true, icon: t.icon, name: t.name };
    if (!mauUnlocked(state, id)) return { ...base, meta: '', why: t.lock, go: vi.ui.mauApply, note: t.desc };
    prefer = id;
    const plan = planMau(state, id);
    const check = canApplyMau(state, id);
    const wild = wildKhoanh(state, id);
    return {
      ...base,
      meta: vi.ui.mauPlan(plan.moves.length, plan.builds.length, plan.removes.length, plan.uNos.length),
      cost: Object.keys(plan.cost).length ? costHtml(state, plan.cost) : '',
      why: check.ok ? '' : vi.reasons[check.reason],
      go: armed === id ? vi.ui.mauConfirm : vi.ui.mauApply,
      armed: armed === id,
      note: wild ? `${t.desc} ${vi.ui.mauKhoanh(wild)}` : t.desc,
    };
  });
  return { items, prefer };
}
