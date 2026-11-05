// Gói hình nặn cho gọn để cất vào kho trình duyệt (nanKho.ts). Hình nặn là tam giác rời, mỗi tam giác ba đỉnh riêng,
// nên một dáng tốn vài trăm KB. Gói lại thì:
// - gộp các đỉnh trùng nhau (tam giác kề nhau cùng màu dùng chung đỉnh), tam giác trỏ vào đỉnh;
// - màu ghi theo bảng màu của từng mảnh (mỗi đỉnh một số thứ tự), mở ra đúng màu cũ;
// - pháp tuyến, trọng số xương mỗi số một byte (lệch dưới nửa độ, dưới 0,4%: nhìn không ra);
// - vị trí giữ nguyên số thực, hình không xê dịch, viền mực không hở.
// Mảnh khác thường (đã có chỉ số tam giác, thiếu thuộc tính) thì cất nguyên.

import type { FigureData } from './nanNguoi';

type RawPiece = FigureData['pieces'][number];
type Attr = RawPiece['attrs'][string];

export interface PackedPiece {
  slot: RawPiece['slot'];
  bones: string[];
  /** Số đỉnh sau khi gộp; `tri` trỏ vào các đỉnh ấy, ba số một tam giác. */
  n: number;
  tri: Uint16Array | Uint32Array;
  pos: Float32Array;
  nor: Int8Array;
  /** Bảng màu (mỗi màu `csize` số) và số thứ tự màu của từng đỉnh. */
  palette: Float32Array;
  csize: number;
  col: Uint8Array | Uint16Array;
  /** Chỉ số xương bốn số mỗi đỉnh; `skinType` là kiểu mảng gốc để mở ra đúng kiểu. */
  skin: Uint8Array | Uint16Array;
  skinType: 'u8' | 'u16';
  wt: Uint8Array;
  /** Thuộc tính khác (uv), đã gộp đỉnh theo cùng thứ tự. */
  extra: Record<string, Attr>;
}

export interface PackedFigure {
  key: string;
  pieces: (PackedPiece | RawPiece)[];
}

const isPacked = (p: PackedPiece | RawPiece): p is PackedPiece => 'tri' in p;

const MAIN = ['position', 'normal', 'color', 'skinIndex', 'skinWeight'];

function packPiece(p: RawPiece): PackedPiece | RawPiece {
  const a = p.attrs;
  if (p.index || MAIN.some((k) => !a[k])) return p;
  const pos = a.position.array;
  const nor = a.normal.array;
  const col = a.color.array;
  const skin = a.skinIndex.array;
  const wt = a.skinWeight.array;
  if (!(pos instanceof Float32Array) || a.position.size !== 3 || a.normal.size !== 3 || a.skinIndex.size !== 4 || a.skinWeight.size !== 4) return p;
  if (!(skin instanceof Uint16Array) && !(skin instanceof Uint8Array)) return p;
  const N = pos.length / 3;
  const csize = a.color.size;
  const extraNames = Object.keys(a).filter((k) => !MAIN.includes(k));
  const posBits = new Uint32Array(pos.buffer, pos.byteOffset, pos.length);

  // Lượng tử hóa trước, gộp đỉnh theo giá trị đã lượng tử hóa.
  const nq = new Int8Array(N * 3);
  for (let i = 0; i < N * 3; i++) nq[i] = Math.round(Math.max(-1, Math.min(1, nor[i])) * 127);
  const wq = new Uint8Array(N * 4);
  for (let i = 0; i < N * 4; i++) wq[i] = Math.round(Math.max(0, Math.min(1, wt[i])) * 255);
  const palette: number[] = [];
  const colIdx = new Uint32Array(N);
  const seen = new Map<string, number>();
  let last = '';
  let lastIdx = -1;
  for (let i = 0; i < N; i++) {
    let key = '';
    for (let c = 0; c < csize; c++) key += col[i * csize + c] + ',';
    if (key !== last) {
      let idx = seen.get(key);
      if (idx === undefined) {
        idx = palette.length / csize;
        seen.set(key, idx);
        for (let c = 0; c < csize; c++) palette.push(col[i * csize + c]);
      }
      last = key;
      lastIdx = idx;
    }
    colIdx[i] = lastIdx;
  }
  const extraBits = extraNames.map((k) => {
    const arr = a[k].array;
    return { size: a[k].size, bits: arr instanceof Float32Array ? new Uint32Array(arr.buffer, arr.byteOffset, arr.length) : Uint32Array.from(arr) };
  });

  // Bảng băm địa chỉ mở: đỉnh i trùng đỉnh j nếu mọi số đều bằng nhau.
  let size = 1;
  while (size < N * 2) size <<= 1;
  const table = new Int32Array(size).fill(-1);
  const remap = new Uint32Array(N);
  const firstOf: number[] = [];
  const same = (i: number, j: number): boolean => {
    for (let c = 0; c < 3; c++) if (posBits[i * 3 + c] !== posBits[j * 3 + c] || nq[i * 3 + c] !== nq[j * 3 + c]) return false;
    for (let c = 0; c < 4; c++) if (skin[i * 4 + c] !== skin[j * 4 + c] || wq[i * 4 + c] !== wq[j * 4 + c]) return false;
    if (colIdx[i] !== colIdx[j]) return false;
    for (const e of extraBits) for (let c = 0; c < e.size; c++) if (e.bits[i * e.size + c] !== e.bits[j * e.size + c]) return false;
    return true;
  };
  for (let i = 0; i < N; i++) {
    let h = 0x811c9dc5;
    const mix = (v: number) => {
      h = Math.imul(h ^ v, 0x01000193);
    };
    for (let c = 0; c < 3; c++) mix(posBits[i * 3 + c]);
    for (let c = 0; c < 3; c++) mix(nq[i * 3 + c]);
    mix(colIdx[i]);
    for (let c = 0; c < 4; c++) mix(skin[i * 4 + c] | (wq[i * 4 + c] << 16));
    let slot = (h >>> 0) & (size - 1);
    for (;;) {
      const j = table[slot];
      if (j < 0) {
        table[slot] = i;
        remap[i] = firstOf.length;
        firstOf.push(i);
        break;
      }
      if (same(i, j)) {
        remap[i] = remap[j];
        break;
      }
      slot = (slot + 1) & (size - 1);
    }
  }

  const n = firstOf.length;
  let maxBone = 0;
  for (let i = 0; i < skin.length; i++) if (skin[i] > maxBone) maxBone = skin[i];
  const out: PackedPiece = {
    slot: p.slot,
    bones: p.bones,
    n,
    tri: n < 65536 ? Uint16Array.from(remap) : Uint32Array.from(remap),
    pos: new Float32Array(n * 3),
    nor: new Int8Array(n * 3),
    palette: Float32Array.from(palette),
    csize,
    col: palette.length / csize < 256 ? new Uint8Array(n) : new Uint16Array(n),
    skin: maxBone < 256 ? new Uint8Array(n * 4) : new Uint16Array(n * 4),
    skinType: skin instanceof Uint8Array ? 'u8' : 'u16',
    wt: new Uint8Array(n * 4),
    extra: {},
  };
  firstOf.forEach((i, v) => {
    for (let c = 0; c < 3; c++) {
      out.pos[v * 3 + c] = pos[i * 3 + c];
      out.nor[v * 3 + c] = nq[i * 3 + c];
    }
    for (let c = 0; c < 4; c++) {
      out.skin[v * 4 + c] = skin[i * 4 + c];
      out.wt[v * 4 + c] = wq[i * 4 + c];
    }
    out.col[v] = colIdx[i];
  });
  for (const k of extraNames) {
    const src = a[k];
    const Ctor = src.array.constructor as new (n: number) => typeof src.array;
    const arr = new Ctor(n * src.size);
    firstOf.forEach((i, v) => {
      for (let c = 0; c < src.size; c++) arr[v * src.size + c] = src.array[i * src.size + c];
    });
    out.extra[k] = { array: arr, size: src.size, normalized: src.normalized };
  }
  return out;
}

function unpackPiece(p: PackedPiece | RawPiece): RawPiece {
  if (!isPacked(p)) return p;
  const N = p.tri.length;
  const pos = new Float32Array(N * 3);
  const nor = new Float32Array(N * 3);
  const col = new Float32Array(N * p.csize);
  const skin = p.skinType === 'u8' ? new Uint8Array(N * 4) : new Uint16Array(N * 4);
  const wt = new Float32Array(N * 4);
  // Pháp tuyến, trọng số mở ra một lần mỗi đỉnh gộp, rồi chép theo tam giác.
  const nv = new Float32Array(p.n * 3);
  const wv = new Float32Array(p.n * 4);
  for (let v = 0; v < p.n; v++) {
    const x = p.nor[v * 3] / 127;
    const y = p.nor[v * 3 + 1] / 127;
    const z = p.nor[v * 3 + 2] / 127;
    const l = Math.hypot(x, y, z) || 1;
    nv[v * 3] = x / l;
    nv[v * 3 + 1] = y / l;
    nv[v * 3 + 2] = z / l;
    let s = 0;
    for (let c = 0; c < 4; c++) s += p.wt[v * 4 + c];
    for (let c = 0; c < 4; c++) wv[v * 4 + c] = s > 0 ? p.wt[v * 4 + c] / s : c === 0 ? 1 : 0;
  }
  const cs = p.csize;
  for (let i = 0; i < N; i++) {
    const v = p.tri[i];
    for (let c = 0; c < 3; c++) {
      pos[i * 3 + c] = p.pos[v * 3 + c];
      nor[i * 3 + c] = nv[v * 3 + c];
    }
    const k = p.col[v] * cs;
    for (let c = 0; c < cs; c++) col[i * cs + c] = p.palette[k + c];
    for (let c = 0; c < 4; c++) {
      skin[i * 4 + c] = p.skin[v * 4 + c];
      wt[i * 4 + c] = wv[v * 4 + c];
    }
  }
  const attrs: Record<string, Attr> = {
    position: { array: pos, size: 3, normalized: false },
    normal: { array: nor, size: 3, normalized: false },
    color: { array: col, size: cs, normalized: false },
    skinIndex: { array: skin, size: 4, normalized: false },
    skinWeight: { array: wt, size: 4, normalized: false },
  };
  for (const [k, e] of Object.entries(p.extra)) {
    const Ctor = e.array.constructor as new (n: number) => typeof e.array;
    const arr = new Ctor(N * e.size);
    for (let i = 0; i < N; i++) for (let c = 0; c < e.size; c++) arr[i * e.size + c] = e.array[p.tri[i] * e.size + c];
    attrs[k] = { array: arr, size: e.size, normalized: e.normalized };
  }
  return { slot: p.slot, bones: p.bones, attrs, index: null };
}

export function packFigure(f: FigureData): PackedFigure {
  return { key: f.key, pieces: f.pieces.map(packPiece) };
}

export function unpackFigure(f: PackedFigure): FigureData {
  return { key: f.key, pieces: f.pieces.map(unpackPiece) };
}

/** Số byte một dáng đã gói chiếm (đo cỡ kho). */
export function packedBytes(f: PackedFigure): number {
  let b = 0;
  for (const p of f.pieces) {
    const arrays = isPacked(p) ? [p.tri, p.pos, p.nor, p.palette, p.col, p.skin, p.wt, ...Object.values(p.extra).map((e) => e.array)] : Object.values(p.attrs).map((e) => e.array);
    for (const a of arrays) b += a.byteLength;
  }
  return b;
}
