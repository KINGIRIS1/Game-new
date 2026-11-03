// Biển Đông phía đông kinh đô: sau bờ đông sông Thao là dải rừng, bãi cát rồi biển. Sông Đà chảy suốt về phía đông,
// đổ ra cửa biển. Ngoài khơi có hai quần đảo Hoàng Sa (phía bắc) và Trường Sa (phía nam). Biển nằm ngoài lưới kinh đô:
// không dựng công trình trên biển, giặc không tới từ biển; bến thuyền khơi (`benKhoi`, từ Điện 8) dựng sát sông, thuyền
// đánh cá lớn xuôi sông ra biển đánh cá quanh hai quần đảo rồi về. Sau này Điện 10 điều quân ra đóng giữ đảo.
// Mọi tọa độ tính bằng ô như lưới kinh đô (số thực, ô (x, z) phủ [x, x + 1) × [z, z + 1)).

import { BUILDINGS } from './defs';
import type { Building, GameState } from './game';
import { GRID, RIVER_END, RIVER_START, isRiver } from './map';

/** Cấp Điện mở biển: dựng được bến thuyền khơi, camera kéo ra tới biển. */
export const BIEN_DIEN = BUILDINGS.benKhoi.minDien;

/** Bãi cát ven biển bắt đầu từ cột này (sau dải rừng mỏng ngoài bờ đông). */
export const BIEN_BO = GRID + 3;
/** Biển bắt đầu từ cột này: mọi ô có x từ đây trở ra là nước biển. */
export const BIEN_TU = GRID + 6;
/** Biển trải ra phía đông tới cột này (chỗ camera kéo xa nhất còn thấy nước). */
export const BIEN_XA = BIEN_TU + 46;

/** Dòng giữa sông Đà, sông Thao: thuyền lớn chạy giữa dòng. */
export const RIVER_MID = (RIVER_START + RIVER_END) / 2;

/** Cửa sông Đà ra biển. */
export const CUA_BIEN = { x: BIEN_TU + 1, z: RIVER_MID };

export type QuanDaoId = 'hoangSa' | 'truongSa';

/** Một đảo: tâm lệch so với tâm quần đảo, bán kính bãi cát (ô). */
export interface Dao {
  dx: number;
  dz: number;
  r: number;
}

/**
 * Một quần đảo: tâm (ô), các đảo (đảo đầu tiên là đảo lớn nhất, chỗ sau này dựng đồn đóng quân), ngư trường quanh đảo
 * (vòng thuyền đánh cá chạy, bán kính `nguTruong`, ngoài mọi đảo và rạn san hô).
 */
export interface QuanDao {
  id: QuanDaoId;
  x: number;
  z: number;
  dao: Dao[];
  nguTruong: number;
}

/** Hai quần đảo, cố định ở mọi máy: Hoàng Sa ở phía bắc, Trường Sa ở phía nam, xa bờ hơn và rải rộng hơn. */
export const QUAN_DAO: readonly QuanDao[] = [
  {
    id: 'hoangSa',
    x: BIEN_TU + 16,
    z: 22,
    dao: [
      { dx: 0, dz: 0, r: 2.2 },
      { dx: -4.5, dz: -3, r: 1.0 },
      { dx: 3.5, dz: -4.5, r: 0.9 },
      { dx: 5, dz: 1.5, r: 1.2 },
      { dx: -3, dz: 4, r: 0.8 },
      { dx: 1.5, dz: 5, r: 1.0 },
      { dx: -6, dz: 0.5, r: 0.7 },
    ],
    nguTruong: 10,
  },
  {
    id: 'truongSa',
    x: BIEN_TU + 24,
    z: 70,
    dao: [
      { dx: 0, dz: 0, r: 2.0 },
      { dx: -6, dz: -4, r: 1.0 },
      { dx: 5, dz: -5.5, r: 0.9 },
      { dx: 7, dz: 2, r: 1.1 },
      { dx: -4.5, dz: 5, r: 0.8 },
      { dx: 2, dz: 7, r: 1.0 },
      { dx: -8.5, dz: 2, r: 0.7 },
      { dx: 9.5, dz: -1.5, r: 0.6 },
      { dx: -2, dz: -7.5, r: 0.8 },
    ],
    nguTruong: 13,
  },
];

export function quanDao(id: QuanDaoId): QuanDao {
  return QUAN_DAO.find((q) => q.id === id)!;
}

/** Ô (x, z) là biển: ngoài lưới về phía đông, từ `BIEN_TU`. */
export function isSea(x: number, z: number): boolean {
  void z;
  return x >= BIEN_TU;
}

/** Điểm (x, z) nằm trên một đảo (kể cả bãi cát quanh đảo, nới thêm `pad` ô). */
export function onIsland(x: number, z: number, pad = 0): QuanDaoId | null {
  for (const q of QUAN_DAO) {
    for (const d of q.dao) if (Math.hypot(x - (q.x + d.dx), z - (q.z + d.dz)) < d.r + pad) return q.id;
  }
  return null;
}

/**
 * Điểm (x, z) là mặt nước thuyền đi được: sông trong lưới, sông Đà chảy tiếp ngoài lưới về phía đông (và sông Thao từ
 * phía bắc), hay biển ngoài các đảo.
 */
export function isWater(x: number, z: number): boolean {
  const tx = Math.floor(x);
  const tz = Math.floor(z);
  if (tx >= 0 && tz >= 0 && tx < GRID && tz < GRID) return isRiver(tx, tz);
  if (isSea(x, z)) return onIsland(x, z) === null;
  const da = z >= RIVER_START && z < RIVER_END;
  const thao = tz < 0 && x >= RIVER_START && x < RIVER_END;
  return (tx >= GRID && da) || thao;
}

/** Bến ở sông nào: sông Thao (phía đông kinh đô, chảy từ bắc xuống) hay sông Đà (phía nam, chảy ra biển). */
export function riverOf(b: Pick<Building, 'x' | 'z' | 'type'>): 'thao' | 'da' {
  const def = BUILDINGS[b.type];
  // Cùng thứ tự với `riverFacing` (map.ts): sát sông Thao bên này trước.
  if (b.x + def.w === RIVER_START) return 'thao';
  if (b.z + def.d === RIVER_START) return 'da';
  if (b.z === RIVER_END) return 'da';
  return 'thao';
}

/** Chỗ thuyền lớn neo trước bến (ô), cách mép móng chừng một ô ra phía sông. */
export function benDock(b: Pick<Building, 'x' | 'z' | 'type'>): { x: number; z: number } {
  const def = BUILDINGS[b.type];
  const cx = b.x + def.w / 2;
  const cz = b.z + def.d / 2;
  if (b.x + def.w === RIVER_START) return { x: RIVER_START + 1, z: cz };
  if (b.z + def.d === RIVER_START) return { x: cx, z: RIVER_START + 1 };
  if (b.z === RIVER_END) return { x: cx, z: RIVER_END - 1 };
  return { x: RIVER_END - 1, z: cz };
}

/** Đường thuyền khơi: các điểm từ chỗ neo ra tới ngư trường, và vòng đánh cá quanh quần đảo. */
export interface SeaRoute {
  quanDao: QuanDaoId;
  /** Từ chỗ neo trước bến, ra giữa dòng, xuôi sông, qua cửa biển, tới mép ngư trường. Về thì đi ngược lại. */
  path: { x: number; z: number }[];
  /** Vòng đánh cá: tâm và bán kính. */
  loop: { x: number; z: number; r: number };
}

/**
 * Thuyền của bến thuyền khơi `b` ra biển theo đường nào. Bến thứ `index` (theo thứ tự dựng): bến chẵn ra Hoàng Sa,
 * bến lẻ ra Trường Sa, để hai thuyền đánh cá hai ngư trường.
 */
export function seaRoute(b: Pick<Building, 'x' | 'z' | 'type'>, index = 0): SeaRoute {
  const q = QUAN_DAO[index % QUAN_DAO.length];
  const dock = benDock(b);
  const path = [dock];
  if (riverOf(b) === 'thao') {
    path.push({ x: RIVER_MID, z: dock.z });
    // Sông Thao đổ vào sông Đà ở ngã ba.
    path.push({ x: RIVER_MID, z: RIVER_MID });
  } else {
    path.push({ x: dock.x, z: RIVER_MID });
  }
  path.push(CUA_BIEN);
  // Ra khơi một quãng rồi rẽ về phía quần đảo, tới mép ngư trường gần bờ nhất.
  const off = { x: CUA_BIEN.x + 4, z: RIVER_MID };
  path.push(off);
  const a = Math.atan2(off.z - q.z, off.x - q.x);
  path.push({ x: q.x + Math.cos(a) * q.nguTruong, z: q.z + Math.sin(a) * q.nguTruong });
  return { quanDao: q.id, path, loop: { x: q.x, z: q.z, r: q.nguTruong } };
}

/** Bến thuyền khơi `b` là bến thứ mấy (theo thứ tự dựng, 0 là bến đầu): chọn quần đảo cho thuyền (`seaRoute`). */
export function seaIndex(state: Pick<GameState, 'buildings'>, b: Pick<Building, 'id'>): number {
  return Math.max(0, state.buildings.filter((o) => o.type === 'benKhoi').sort((p, q) => p.id - q.id).findIndex((o) => o.id === b.id));
}

/** Các bến thuyền khơi có thuyền ra đánh cá quanh quần đảo `id`. */
export function boatsAt(state: Pick<GameState, 'buildings'>, id: QuanDaoId): Building[] {
  return state.buildings.filter((b) => b.type === 'benKhoi' && seaRoute(b, seaIndex(state, b)).quanDao === id);
}
