// Số ngẫu nhiên lặp lại được cho luật chơi (luật không dùng `Math.random`): cây đá mọc (`cayDa.ts`), rút đồ
// (`trangBi.ts`).

/** Số ngẫu nhiên 0..1 lặp lại được theo lần gieo `seq` và lượt bốc `i` (trộn kiểu murmur3 cho đều). */
export function roll(seq: number, i: number): number {
  let h = (Math.imul(seq + 1, 0x9e3779b1) ^ Math.imul(i + 1, 0x632be5ab)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
