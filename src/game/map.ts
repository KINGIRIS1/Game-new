// Bản đồ kinh đô Phong Châu: lưới vuông, rừng ở cạnh bắc và tây. Sông Thao (phía đông, x lớn) chảy từ bắc xuống,
// đổ vào sông Đà (phía nam, z lớn) ở ngã ba góc đông nam; sông Đà chảy tiếp về phía đông. Bên kia sông là hai bờ
// đất mới, cũng nằm trong lưới: bờ đông sông Thao, và bờ nam sông Đà (kéo dài qua cả ngã ba, phần ấy là rừng).

export const GRID = 76;
/** Sông rộng 7 ô: ô có x hoặc z từ mốc này tới trước `RIVER_END` là sông. */
export const RIVER_START = 52;
/**
 * Ô đầu tiên bên kia sông (bờ đất bên kia bắt đầu từ đây). Sông rộng 7 ô để bến cấp 8 cùng hai thuyền buôn neo gọn
 * giữa dòng, còn luồng cho thuyền qua lại sát bờ bên kia.
 */
export const RIVER_END = 59;
/**
 * Trong trận giữ kinh đô, thủy quái và thuyền giặc chỉ dùng ba ô sông sát bờ bên này (như khi sông trong lưới còn
 * rộng 3 ô): hiện ra, lặn xuống ở mốc này.
 */
export const RIVER_DIVE = RIVER_START + 3;
/** Dải rừng ngoài cùng bên kia sông (x hoặc z từ mốc này) không bao giờ khai phá: chỗ giặc bên kia xuất phát. */
export const FAR_FOREST = GRID - 2;
/** Dải rừng ngoài cùng phía bắc và phía tây (x hoặc z nhỏ hơn mốc này) không bao giờ khai phá: chỗ giặc xuất phát. */
export const FOREST_BAND = 2;
/** Cạnh một khoảnh đất (ô). Đất giữa dải rừng ngoài cùng và sông chia thành 10×10 khoảnh (`khoanh.ts`). */
export const KHOANH = 5;
/**
 * Góc móng Điện Vua Hùng (cả x và z) ở ván mới và trong mẫu kinh đô: Điện 10×10 phủ trọn bốn khoảnh thứ 7, 8 tính từ
 * dải rừng, mép đông nam ở ô 41 như Điện 5×5 cũ (bản lưu cũ nới Điện về phía rừng). Điện dời được, nên Điện của một
 * ván có thể ở chỗ khác.
 */
export const DIEN_HOME = 32;

export function inGrid(x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < GRID && z < GRID;
}

export function isRiver(x: number, z: number): boolean {
  if (!inGrid(x, z)) return false;
  // Sông Đà chảy suốt bề ngang; sông Thao chảy từ bắc xuống tới ngã ba thì đổ vào sông Đà.
  const da = z >= RIVER_START && z < RIVER_END;
  const thao = x >= RIVER_START && x < RIVER_END && z < RIVER_END;
  return da || thao;
}

/** Ô (x, z) bên này sông: phía kinh đô, không phải sông hay bên kia. */
export function isNearBank(x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < RIVER_START && z < RIVER_START;
}

/** Bờ bên kia sông: 'nam' là bờ nam sông Đà, 'dong' là bờ đông sông Thao, null là bên này hay dưới sông. */
export function farBankOf(x: number, z: number): 'nam' | 'dong' | null {
  if (!inGrid(x, z)) return null;
  if (z >= RIVER_END) return 'nam';
  if (x >= RIVER_END && z < RIVER_START) return 'dong';
  return null;
}

/**
 * Góc móng w × d khi người chơi chạm ô (tx, tz) lúc đặt công trình: móng lấy ô chạm làm tâm, rồi đẩy vào trọn một bờ
 * đất (bên này, bờ đông sông Thao hay bờ nam sông Đà), không chìa xuống sông. Chạm trên đất thì giữ đúng bờ ấy; chạm
 * xuống sông thì về bờ gần ô chạm nhất (cách đều thì về bên này).
 */
export function footOnLand(tx: number, tz: number, w: number, d: number): { x: number; z: number } {
  const x0 = tx - Math.floor((w - 1) / 2);
  const z0 = tz - Math.floor((d - 1) / 2);
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  // Ba bờ đất, mỗi bờ một khoảng góc móng: bên này, bờ đông sông Thao, bờ nam sông Đà.
  const banks = [
    { x: [0, RIVER_START - w], z: [0, RIVER_START - d] },
    { x: [RIVER_END, GRID - w], z: [0, RIVER_START - d] },
    { x: [0, GRID - w], z: [RIVER_END, GRID - d] },
  ];
  let best = { x: 0, z: 0 };
  let bestGap = Infinity;
  for (const b of banks) {
    const x = clamp(x0, b.x[0], b.x[1]);
    const z = clamp(z0, b.z[0], b.z[1]);
    // Ô chạm cách móng bao nhiêu ô (0 khi ô chạm nằm trong móng).
    const gx = Math.max(x - tx, tx - (x + w - 1), 0);
    const gz = Math.max(z - tz, tz - (z + d - 1), 0);
    const gap = Math.max(gx, gz);
    if (gap < bestGap) {
      best = { x, z };
      bestGap = gap;
    }
  }
  return best;
}

/** Móng (x, z, w, d) có cạnh sát bờ sông: bên này sông, hay bên kia sông (bờ đông sông Thao, bờ nam sông Đà). */
export function touchesRiver(x: number, z: number, w: number, d: number): boolean {
  return x + w === RIVER_START || z + d === RIVER_START || (x === RIVER_END && z < RIVER_START) || (z === RIVER_END && x < RIVER_START);
}

/**
 * Công trình sát sông ở (x, z) quay mặt trước ra sông hướng nào (góc quay quanh trục đứng, mô hình vẽ mặt trước hướng
 * +z): bên này sông Đà là 0, bên này sông Thao là π/2; bờ nam bên kia là π, bờ đông bên kia là −π/2.
 */
export function riverFacing(x: number, z: number, w: number, d: number): number {
  if (x + w === RIVER_START) return Math.PI / 2;
  if (z + d === RIVER_START) return 0;
  if (z === RIVER_END) return Math.PI;
  if (x === RIVER_END) return -Math.PI / 2;
  return 0;
}

/**
 * Góc quay quanh trục đứng của công trình xoay `rot` nấc (0–3, mỗi nấc 90°), cùng quy ước với `riverFacing`: mô hình
 * vẽ mặt trước hướng +z, góc π/2 quay mặt trước sang +x.
 */
export function rotAngle(rot = 0): number {
  return (((rot % 4) + 4) % 4) * (Math.PI / 2);
}

/**
 * Điểm (lx, lz) trên mô hình (gốc ở tâm móng) sau khi công trình xoay `rot` nấc, như `Object3D.rotation.y = rotAngle(rot)`.
 * Tính bằng số nguyên cho khỏi sai số khi so ô.
 */
export function turnLocal(rot: number | undefined, lx: number, lz: number): { x: number; z: number } {
  switch ((((rot ?? 0) % 4) + 4) % 4) {
    case 1:
      return { x: lz, z: -lx };
    case 2:
      return { x: -lx, z: -lz };
    case 3:
      return { x: -lz, z: lx };
    default:
      return { x: lx, z: lz };
  }
}

/**
 * Dải ô thẳng khi kéo thả trải đường từ ô `a` tới ô `b`: đi theo trục kéo dài hơn (ngang hay dọc lưới), từ `a` tới
 * ngang tầm `b`. Kéo xiên thì vẫn ra một đường thẳng; hai trục dài bằng nhau thì theo trục x.
 */
export function lineTiles(a: { x: number; z: number }, b: { x: number; z: number }): { x: number; z: number }[] {
  const alongX = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z);
  const n = alongX ? b.x - a.x : b.z - a.z;
  const step = Math.sign(n);
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i <= Math.abs(n); i++) out.push(alongX ? { x: a.x + i * step, z: a.z } : { x: a.x, z: a.z + i * step });
  return out;
}

/**
 * Viền chữ nhật khi kéo thả đắp tường từ góc `a` tới góc `b`: đi một vòng quanh chu vi bắt đầu từ `a` (dọc x tới
 * ngang `b`, dọc z tới `b`, về ngang `a`, rồi về gần `a`), mỗi ô một lần, ô sau liền cạnh ô trước và ô cuối liền
 * cạnh ô đầu, nên đắp đủ là một vòng kín. Hai góc cùng hàng hay cùng cột thì là dải thẳng.
 */
export function rectTiles(a: { x: number; z: number }, b: { x: number; z: number }): { x: number; z: number }[] {
  if (a.x === b.x || a.z === b.z) {
    const out: { x: number; z: number }[] = [];
    const sx = Math.sign(b.x - a.x);
    const sz = Math.sign(b.z - a.z);
    const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.z - a.z));
    for (let i = 0; i <= n; i++) out.push({ x: a.x + i * sx, z: a.z + i * sz });
    return out;
  }
  const sx = Math.sign(b.x - a.x);
  const sz = Math.sign(b.z - a.z);
  const out: { x: number; z: number }[] = [];
  for (let x = a.x; x !== b.x; x += sx) out.push({ x, z: a.z });
  for (let z = a.z; z !== b.z; z += sz) out.push({ x: b.x, z });
  for (let x = b.x; x !== a.x; x -= sx) out.push({ x, z: b.z });
  for (let z = b.z; z !== a.z; z -= sz) out.push({ x: a.x, z });
  return out;
}

// ---------- Độ cao ô đất ----------

/** Ô sông có độ cao này; ô đất từ 0 (bãi bồi ven sông) tới 3 (đồi phía rừng), đắp thêm được tới MAX_HEIGHT. */
export const RIVER_HEIGHT = -1;

/** Số ô từ ô (x, z) tới bờ sông gần nhất: 0 là ô sát sông. Âm khi ô nằm dưới sông. */
export function riverDistance(x: number, z: number): number {
  if (isRiver(x, z)) return -1;
  const bank = farBankOf(x, z);
  // Bên kia sông soi gương qua sông: cách bờ sông bên ấy.
  if (bank === 'nam') return z - RIVER_END;
  if (bank === 'dong') return Math.min(x - RIVER_END, RIVER_START - 1 - z);
  return Math.min(RIVER_START - 1 - x, RIVER_START - 1 - z);
}

/** Số ngẫu nhiên 0..1 lặp lại được cho mỗi nút (i, j) theo hạt giống, không phụ thuộc cỡ lưới. */
function hash01(seed: number, i: number, j: number): number {
  let t = (Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Value noise trên lưới thô `cell` ô, nội suy mượt, kết quả 0..1. */
function valueNoise(seed: number, cell: number): (x: number, z: number) => number {
  const at = (i: number, j: number) => hash01(seed, i, j);
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x, z) => {
    const fx = x / cell;
    const fz = z / cell;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fade(fx - i);
    const v = fade(fz - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * v;
  };
}

/**
 * Độ cao tự nhiên của mọi ô, lặp lại y hệt ở mọi máy: ba ô sát sông là bãi bồi (bậc 0, vừa một bến),
 * vào trong là đồng bằng (bậc 1) có gò (bậc 2), càng xa sông về phía rừng càng nhiều đồi (bậc 2–3).
 * Bờ bên kia theo cùng luật, tính từ bờ sông bên ấy. Nhiễu tính theo tọa độ ô, nên nới lưới qua sông
 * không làm đổi độ cao bên này.
 */
export function baseHeights(): number[] {
  const coarse = valueNoise(20260, 7);
  const fine = valueNoise(731, 3.5);
  const out: number[] = [];
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const d = riverDistance(x, z);
      if (d < 0) {
        out.push(RIVER_HEIGHT);
        continue;
      }
      if (d <= 2) {
        out.push(0);
        continue;
      }
      const inland = Math.min(Math.max((d - 4) / 18, 0), 1);
      const n = coarse(x, z) * 0.75 + fine(x, z) * 0.25;
      const h = 1 + Math.floor(inland * 1.4 + Math.max(0, n - 0.42) * 2.6);
      out.push(Math.min(Math.max(h, 1), 3));
    }
  }
  return out;
}
