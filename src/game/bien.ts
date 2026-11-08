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

/** Ô (x, z) là đất của đảo chính quần đảo `q` (không kể đảo nhỏ). */
export function onDaoChinh(q: QuanDao, x: number, z: number): boolean {
  const g = daoGoc(q);
  const i = Math.floor(x - g.x);
  const j = Math.floor(z - g.z);
  return i >= 0 && j >= 0 && i < DAO_CHINH && j < DAO_CHINH && daoData(q).land[j * DAO_CHINH + i] === 1;
}

/**
 * Ô (cột `i`, hàng `j` của đảo chính) nằm dưới cầu ván từ cổng đồn ra bến ván: hai ô hai bên đường giữa cổng, từ mép
 * khoảnh đồn ra tới bờ. Hình vẽ để trống cây đá ở đó.
 */
export function inDaoLoi(q: QuanDao, i: number, j: number): boolean {
  const g = daoGoc(q);
  const c = donDaoCong(q);
  const b = daoBen(q);
  const h = donDaoHuong(q);
  const x = g.x + i + 0.5;
  const z = g.z + j + 0.5;
  // Dọc theo hướng cổng: giữa mép đồn và bến ván; ngang: trong một ô quanh đường giữa cổng.
  const along = (x - c.x) * h.x + (z - c.z) * h.z;
  const across = Math.abs((x - c.x) * h.z - (z - c.z) * h.x);
  const far = (b.x - c.x) * h.x + (b.z - c.z) * h.z;
  return along > 0 && along < far && across < 1;
}

/** Đoạn thẳng từ `a` tới `b` không đi qua đất đảo chính, không sát đảo nhỏ nào của quần đảo `q` quá nửa ô. */
function thongThuyen(q: QuanDao, a: { x: number; z: number }, b: { x: number; z: number }): boolean {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.2);
  for (let k = 0; k <= n; k++) {
    const x = a.x + ((b.x - a.x) * k) / n;
    const z = a.z + ((b.z - a.z) * k) / n;
    if (onDaoChinh(q, x, z)) return false;
    for (const d of q.dao) if (Math.hypot(x - (q.x + d.dx), z - (q.z + d.dz)) < d.r + 0.5) return false;
  }
  return true;
}

const daoVaoCache = new Map<QuanDaoId, { x: number; z: number }>();

/**
 * Chỗ thuyền chiến rẽ vào bến ván quần đảo `q`: ngoài khơi trước bến ván (theo hướng cổng đồn), xê sang ngang ít nhất
 * có thể sao cho từ ngư trường tới đó rồi vào bến không đi qua đảo nào. Chọn chỗ cho cả đường ngắn nhất.
 */
export function daoVao(q: QuanDao): { x: number; z: number } {
  const hit = daoVaoCache.get(q.id);
  if (hit) return hit;
  const from = denNguTruong(q);
  const ben = daoBen(q);
  const h = donDaoHuong(q);
  let best = { x: ben.x + h.x * 3, z: ben.z + h.z * 3 };
  let bestLen = Infinity;
  for (let k = 2; k <= 6; k++) {
    for (let s = -4; s <= 4; s++) {
      const p = { x: ben.x + h.x * k - h.z * s, z: ben.z + h.z * k + h.x * s };
      if (!thongThuyen(q, from, p) || !thongThuyen(q, p, ben)) continue;
      const len = Math.hypot(p.x - from.x, p.z - from.z) + Math.hypot(ben.x - p.x, ben.z - p.z) + Math.abs(s) * 0.6;
      if (len < bestLen) {
        bestLen = len;
        best = p;
      }
    }
  }
  daoVaoCache.set(q.id, best);
  return best;
}

/**
 * Đường thuyền chiến của bến thuyền khơi `b` (bến thứ `index`): đường thuyền khơi ra tới ngư trường, rẽ ra trước bến
 * ván đồn (`daoVao`), rồi vào bến ván.
 */
export function warRoute(b: Pick<Building, 'x' | 'z' | 'type'>, index = 0): { quanDao: QuanDaoId; path: { x: number; z: number }[] } {
  const r = seaRoute(b, index);
  const q = quanDao(r.quanDao);
  return { quanDao: r.quanDao, path: [...r.path, daoVao(q), daoBen(q)] };
}

/** Dài một đường (ô). */
export function pathLength(path: readonly { x: number; z: number }[]): number {
  let n = 0;
  for (let i = 1; i < path.length; i++) n += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  return n;
}

/** Đồn đảo vuông chừng này ô mỗi cạnh, đứng trên đảo chính (`donDaoGoc`). */
export const DON_DAO_W = 8;

/** Chỗ thuyền từ đất liền ra tới ngư trường quần đảo `q` (điểm cuối đường thuyền khơi, bến nào cũng vậy). */
function denNguTruong(q: QuanDao): { x: number; z: number } {
  return seaRoute({ x: 0, z: RIVER_START - 3, type: 'benKhoi' }, QUAN_DAO.indexOf(q)).path.at(-1)!;
}

const donCache = new Map<QuanDaoId, { i: number; j: number }>();

/**
 * Chỗ đồn đảo trên đảo chính quần đảo `q`: góc tây bắc (cột `i`, hàng `j` của đảo chính) của khoảnh `DON_DAO_W` ô
 * vuông nằm trọn trên đất cách bờ từ hai ô trở vào, gần chỗ thuyền từ đất liền tới (`denNguTruong`) nhất. Hình vẽ để
 * trống cây đá ở đó và san bằng (gò giữa đảo nếu lấn vào thì hạ xuống).
 */
export function donDaoGoc(q: QuanDao): { i: number; j: number } {
  const hit = donCache.get(q.id);
  if (hit) return hit;
  const n = DAO_CHINH;
  const bo = new Int16Array(n * n).fill(-1);
  for (const o of daoChinh(q)) bo[o.j * n + o.i] = o.bo;
  const g = daoGoc(q);
  const to = denNguTruong(q);
  let best = { i: (n - DON_DAO_W) / 2, j: (n - DON_DAO_W) / 2 };
  let bestD = Infinity;
  for (let j = 0; j + DON_DAO_W <= n; j++) {
    for (let i = 0; i + DON_DAO_W <= n; i++) {
      let fits = true;
      for (let b = 0; b < DON_DAO_W && fits; b++) for (let a = 0; a < DON_DAO_W && fits; a++) if (bo[(j + b) * n + i + a] < 2) fits = false;
      if (!fits) continue;
      const d = Math.hypot(g.x + i + DON_DAO_W / 2 - to.x, g.z + j + DON_DAO_W / 2 - to.z);
      if (d < bestD) {
        bestD = d;
        best = { i, j };
      }
    }
  }
  donCache.set(q.id, best);
  return best;
}

/**
 * Hướng cổng đồn đảo quần đảo `q`: một trong bốn hướng theo trục lưới (x, z là −1, 0, 1), về phía thuyền từ đất liền
 * tới. Cổng ở giữa cạnh ấy, cầu ván chạy thẳng từ cổng ra bến ván (`daoBen`).
 */
export function donDaoHuong(q: QuanDao): { x: number; z: number } {
  const g = daoGoc(q);
  const o = donDaoGoc(q);
  const to = denNguTruong(q);
  const dx = to.x - (g.x + o.i + DON_DAO_W / 2);
  const dz = to.z - (g.z + o.j + DON_DAO_W / 2);
  return Math.abs(dx) > Math.abs(dz) ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) };
}

/** Giữa cổng đồn đảo (ô, trên mép khoảnh đồn). */
export function donDaoCong(q: QuanDao): { x: number; z: number } {
  const g = daoGoc(q);
  const o = donDaoGoc(q);
  const h = donDaoHuong(q);
  const half = DON_DAO_W / 2;
  return { x: g.x + o.i + half + h.x * half, z: g.z + o.j + half + h.z * half };
}

const daoBenCache = new Map<QuanDaoId, { x: number; z: number }>();

/**
 * Bến ván của đồn đảo quần đảo `q` (ô): chỗ thuyền chiến cập, thẳng trước cổng đồn (`donDaoCong`), cách bờ đảo chính
 * chừng một ô. Cầu ván chạy từ cổng ra tới đây.
 */
export function daoBen(q: QuanDao): { x: number; z: number } {
  const hit = daoBenCache.get(q.id);
  if (hit) return hit;
  const c = donDaoCong(q);
  const h = donDaoHuong(q);
  let t = 0;
  while (t < DAO_CHINH && onDaoChinh(q, c.x + h.x * t, c.z + h.z * t)) t += 0.1;
  const at = { x: c.x + h.x * (t + 0.9), z: c.z + h.z * (t + 0.9) };
  daoBenCache.set(q.id, at);
  return at;
}

/** Ô (cột `i`, hàng `j` của đảo chính) nằm trong chỗ đồn đảo. */
export function inDonDao(q: QuanDao, i: number, j: number): boolean {
  const o = donDaoGoc(q);
  return i >= o.i && j >= o.j && i < o.i + DON_DAO_W && j < o.j + DON_DAO_W;
}
