// Biển Đông phía đông nam kinh đô, như bờ biển Bắc Bộ (chủ dự án chọn phương án "cửa biển đông nam"): bờ biển chạy
// chéo từ đông bắc xuống tây nam, đi sát góc ngoài của hai bờ bên kia sông. Góc đông nam sau ngã ba (rừng không khai
// phá) là cửa sông, bãi cát rồi biển: sông Thao đổ vào sông Đà ở ngã ba, sông Đà chảy tiếp ra cửa biển ngay đó. Ngoài
// khơi có hai quần đảo theo hướng ngoài đời: Hoàng Sa ở đông nam, Trường Sa xa hơn về nam đông nam. Biển không dựng
// công trình, giặc không tới từ biển; bến thuyền khơi (`benKhoi`, từ Điện 8) dựng sát sông, thuyền đánh cá lớn xuôi sông
// ra biển đánh cá quanh hai quần đảo rồi về. Sau này Điện 10 điều quân ra đóng giữ đảo.
// Mọi tọa độ tính bằng ô như lưới kinh đô (số thực, ô (x, z) phủ [x, x + 1) × [z, z + 1)).

import { BUILDINGS } from './defs';
import type { Building, GameState } from './game';
import { GRID, RIVER_END, RIVER_START, isRiver } from './map';

/** Cấp Điện mở biển: dựng được bến thuyền khơi, camera kéo ra tới biển. */
export const BIEN_DIEN = BUILDINGS.benKhoi.minDien;

/**
 * Mép bãi cát phía đất liền nằm quanh đường x + z = `BIEN_CHEO` (lệch theo nhiễu dọc bờ, `bienNhieu`). Chọn sao cho bãi
 * cát không chạm khoảnh nào bên kia sông: góc ngoài khoảnh bờ đông, bờ nam (ô 73, 51 và 51, 73) còn cách bãi hơn một ô.
 */
export const BIEN_CHEO = 128;
/** Bãi cát rộng chừng này ô (đo vuông góc với bờ); ra quá bãi là biển. */
export const BAI_CAT = 3;

/** Bờ biển lồi lõm: lệch (ô, vuông góc với bờ) theo vị trí dọc bờ `t` = x − z. */
export function bienNhieu(t: number): number {
  return 0.7 * Math.sin(t * 0.11) + 0.3 * Math.sin(t * 0.27 + 1);
}

/**
 * Điểm (x, z) cách mép bãi cát bao nhiêu ô, đo vuông góc với bờ: âm là đất liền, 0 tới `BAI_CAT` là bãi cát, từ `BAI_CAT`
 * là biển (càng lớn càng xa bờ).
 */
export function bienDo(x: number, z: number): number {
  return (x + z - BIEN_CHEO) / Math.SQRT2 - bienNhieu(x - z);
}

/** Điểm cách mép bãi cát `c` ô (như `bienDo`) ở vị trí dọc bờ `t` = x − z: dựng bãi cát, mặt biển theo bờ. */
export function bienDiem(t: number, c: number): { x: number; z: number } {
  const s = BIEN_CHEO + Math.SQRT2 * (c + bienNhieu(t));
  return { x: (s + t) / 2, z: (s - t) / 2 };
}

/** Dòng giữa sông Đà, sông Thao: thuyền lớn chạy giữa dòng. */
export const RIVER_MID = (RIVER_START + RIVER_END) / 2;

/** Cửa sông Đà ra biển: giữa dòng sông Đà, chỗ đầu tiên ra quá bãi cát một ô. */
export const CUA_BIEN = (() => {
  let x = RIVER_END;
  while (bienDo(x, RIVER_MID) < BAI_CAT + 1) x += 0.25;
  return { x, z: RIVER_MID };
})();

export type QuanDaoId = 'hoangSa' | 'truongSa';

/**
 * Đảo chính của mỗi quần đảo vuông chừng này ô mỗi cạnh (chủ dự án yêu cầu 20 × 20): đất theo ô như kinh đô, chỗ sau
 * này dựng đồn đóng quân.
 */
export const DAO_CHINH = 20;

/** Một đảo nhỏ quanh đảo chính: tâm lệch so với tâm quần đảo, bán kính bãi cát (ô). */
export interface Dao {
  dx: number;
  dz: number;
  r: number;
}

/**
 * Một quần đảo: tâm đảo chính (ô; đảo chính phủ `DAO_CHINH` ô quanh tâm), các đảo nhỏ quanh đảo chính, ngư trường
 * quanh quần đảo (vòng thuyền đánh cá chạy, bán kính `nguTruong`, ngoài mọi đảo và rạn san hô), hạt giống bờ đảo.
 */
export interface QuanDao {
  id: QuanDaoId;
  x: number;
  z: number;
  dao: Dao[];
  nguTruong: number;
  seed: number;
}

/**
 * Hai quần đảo, cố định ở mọi máy, gần đúng hướng ngoài đời nhìn từ Phong Châu: Hoàng Sa hướng đông nam (chừng 122°,
 * ngoài đời 128°), Trường Sa hướng nam đông nam (chừng 149°, ngoài đời 144°), xa hơn và rải rộng hơn.
 */
export const QUAN_DAO: readonly QuanDao[] = [
  {
    id: 'hoangSa',
    x: 108,
    z: 82,
    dao: [
      { dx: -15, dz: -6, r: 1.4 },
      { dx: 13, dz: -12, r: 1.2 },
      { dx: 16, dz: 4, r: 1.8 },
      { dx: -12, dz: 13, r: 1.0 },
      { dx: 4, dz: 16, r: 1.5 },
      { dx: -17, dz: 5, r: 0.9 },
      { dx: 11, dz: 14, r: 0.8 },
    ],
    nguTruong: 22,
    seed: 1974,
  },
  {
    id: 'truongSa',
    x: 102,
    z: 142,
    dao: [
      { dx: -16, dz: -9, r: 1.3 },
      { dx: 14, dz: -14, r: 1.1 },
      { dx: 19, dz: 3, r: 1.6 },
      { dx: -14, dz: 15, r: 1.0 },
      { dx: 5, dz: 18, r: 1.4 },
      { dx: -20, dz: 3, r: 0.9 },
      { dx: 21, dz: -7, r: 0.8 },
      { dx: -4, dz: -18, r: 1.2 },
      { dx: 13, dz: 16, r: 0.9 },
      { dx: -10, dz: -17, r: 0.8 },
    ],
    nguTruong: 26,
    seed: 1988,
  },
];

export function quanDao(id: QuanDaoId): QuanDao {
  return QUAN_DAO.find((q) => q.id === id)!;
}

/** Điểm (x, z) là biển: ra quá bãi cát (`bienDo` từ `BAI_CAT`). */
export function isSea(x: number, z: number): boolean {
  return bienDo(x, z) >= BAI_CAT;
}

/** Số ngẫu nhiên 0..1 lặp lại được cho ô (i, j) theo hạt giống. */
function hash01(seed: number, i: number, j: number): number {
  let t = (Math.imul(i + 1, 0x27d4eb2d) ^ Math.imul(j + 1, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Độ "vuông" của bờ đảo chính: hình vuông bo tròn góc (siêu elip bậc 4). */
const SQUARE = 4;

/** Điểm lệch (u, v) so với tâm đảo chính, tính theo nửa cạnh `half`: ≤ 1 là trong hình vuông bo góc. */
function squircle(u: number, v: number, half: number): number {
  return Math.abs(u / half) ** SQUARE + Math.abs(v / half) ** SQUARE;
}

/** Một ô đất của đảo chính: cột `i`, hàng `j` (0 tới `DAO_CHINH` − 1, từ góc tây bắc), cách bờ `bo` ô (0 là ô sát nước). */
export interface DaoO {
  i: number;
  j: number;
  bo: number;
}

const daoCache = new Map<QuanDaoId, { tiles: DaoO[]; land: Uint8Array }>();

/**
 * Các ô đất của đảo chính quần đảo `q`: hình vuông bo góc 20 × 20, mép bờ lồi lõm theo hạt giống (bờ thật không thẳng
 * tắp), mỗi ô biết cách bờ mấy ô (bãi cát sát nước, vào trong là đất cỏ, giữa đảo có gò).
 */
export function daoChinh(q: QuanDao): DaoO[] {
  return daoData(q).tiles;
}

function daoData(q: QuanDao): { tiles: DaoO[]; land: Uint8Array } {
  const hit = daoCache.get(q.id);
  if (hit) return hit;
  const n = DAO_CHINH;
  const half = n / 2;
  const land = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) land[j * n + i] = squircle(i + 0.5 - half, j + 0.5 - half, half) + 0.14 * hash01(q.seed, i, j) <= 1 ? 1 : 0;
  }
  // Cách bờ: loang từ mọi ô nước (kể cả ngoài khung đảo) vào đất theo bốn hướng.
  const bo = new Int16Array(n * n).fill(-1);
  let edge: number[] = [];
  for (let k = 0; k < n * n; k++) {
    if (!land[k]) continue;
    const i = k % n;
    const j = Math.floor(k / n);
    const wet = [
      [i - 1, j],
      [i + 1, j],
      [i, j - 1],
      [i, j + 1],
    ].some(([a, b]) => a < 0 || b < 0 || a >= n || b >= n || !land[b * n + a]);
    if (wet) {
      bo[k] = 0;
      edge.push(k);
    }
  }
  for (let d = 1; edge.length; d++) {
    const next: number[] = [];
    for (const k of edge) {
      const i = k % n;
      const j = Math.floor(k / n);
      for (const [a, b] of [
        [i - 1, j],
        [i + 1, j],
        [i, j - 1],
        [i, j + 1],
      ]) {
        if (a < 0 || b < 0 || a >= n || b >= n) continue;
        const o = b * n + a;
        if (land[o] && bo[o] < 0) {
          bo[o] = d;
          next.push(o);
        }
      }
    }
    edge = next;
  }
  const out: DaoO[] = [];
  for (let k = 0; k < n * n; k++) if (land[k]) out.push({ i: k % n, j: Math.floor(k / n), bo: bo[k] });
  const data = { tiles: out, land };
  daoCache.set(q.id, data);
  return data;
}

/** Góc tây bắc (ô) của đảo chính quần đảo `q`. */
export function daoGoc(q: QuanDao): { x: number; z: number } {
  return { x: q.x - DAO_CHINH / 2, z: q.z - DAO_CHINH / 2 };
}

/** Điểm (x, z) nằm trên một đảo (kể cả bãi cát quanh đảo, nới thêm `pad` ô). */
export function onIsland(x: number, z: number, pad = 0): QuanDaoId | null {
  for (const q of QUAN_DAO) {
    // Đảo chính: đúng ô đất khi không nới; nới thì tính theo hình vuông bo góc to thêm `pad`.
    if (pad > 0) {
      if (squircle(x - q.x, z - q.z, DAO_CHINH / 2 + pad) <= 1) return q.id;
    } else {
      const g = daoGoc(q);
      const i = Math.floor(x - g.x);
      const j = Math.floor(z - g.z);
      if (i >= 0 && j >= 0 && i < DAO_CHINH && j < DAO_CHINH && daoData(q).land[j * DAO_CHINH + i]) return q.id;
    }
    for (const d of q.dao) if (Math.hypot(x - (q.x + d.dx), z - (q.z + d.dz)) < d.r + pad) return q.id;
  }
  return null;
}

/**
 * Điểm (x, z) là mặt nước thuyền đi được: sông trong lưới, sông Đà chảy tiếp qua bãi cát ra biển (và từ phía tây), sông
 * Thao từ phía bắc, hay biển ngoài các đảo (cả góc đông nam trong lưới).
 */
export function isWater(x: number, z: number): boolean {
  const tx = Math.floor(x);
  const tz = Math.floor(z);
  if (tx >= 0 && tz >= 0 && tx < GRID && tz < GRID && isRiver(tx, tz)) return true;
  if (isSea(x, z)) return onIsland(x, z) === null;
  if (tx >= 0 && tz >= 0 && tx < GRID && tz < GRID) return false;
  const da = z >= RIVER_START && z < RIVER_END;
  const thao = tz < 0 && x >= RIVER_START && x < RIVER_END;
  return da || thao;
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
  // Ra khơi một quãng về phía đông nam (vuông góc với bờ) rồi rẽ về phía quần đảo, tới mép ngư trường gần bờ nhất.
  const off = { x: CUA_BIEN.x + 3, z: RIVER_MID + 3 };
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
