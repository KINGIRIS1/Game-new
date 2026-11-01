// Bản vẽ ô con của một công trình: mỗi ký tự là nửa ô đất, hàng đầu là phía sau (−z), hàng cuối là mặt trước (+z),
// cột đầu là bên trái (−x). '.' là sân hay nền trống, ',' là lối đi, mỗi chữ khác là một phần của công trình.
// Mô hình đặt từng phần vào khối chữ của nó, nên bản vẽ ở docs/bo-cuc-cong-trinh.md và code là một.
// Gốc tọa độ là tâm móng, như mọi mô hình công trình.

/** Một ô con rộng chừng này ô đất. */
export const CELL = 0.5;

/** Khối chữ: tâm (x, z) và cỡ (w theo x, d theo z), đơn vị ô đất. */
export interface Zone {
  x: number;
  z: number;
  w: number;
  d: number;
}

export class Lot {
  /** Số ô con mỗi cạnh. */
  readonly n: number;
  private readonly zones = new Map<string, Zone>();
  private readonly spots = new Map<string, { x: number; z: number }[]>();

  /** `tiles`: cạnh móng (ô đất). `rows`: bản vẽ, đúng `tiles * 2` hàng, mỗi hàng `tiles * 2` ký tự. */
  constructor(
    readonly tiles: number,
    readonly rows: readonly string[],
  ) {
    this.n = tiles * 2;
    if (rows.length !== this.n || rows.some((r) => r.length !== this.n)) throw new Error(`Bản vẽ móng ${tiles}×${tiles} phải là ${this.n}×${this.n} ký tự`);
    const box = new Map<string, [number, number, number, number]>();
    for (let j = 0; j < this.n; j++) {
      for (let i = 0; i < this.n; i++) {
        const ch = rows[j][i];
        if (ch === '.') continue;
        const b = box.get(ch);
        if (b) box.set(ch, [Math.min(b[0], i), Math.min(b[1], j), Math.max(b[2], i), Math.max(b[3], j)]);
        else box.set(ch, [i, j, i, j]);
        const list = this.spots.get(ch) ?? [];
        list.push({ x: this.cx(i), z: this.cz(j) });
        this.spots.set(ch, list);
      }
    }
    for (const [ch, [i0, j0, i1, j1]] of box) {
      this.zones.set(ch, { x: (this.cx(i0) + this.cx(i1)) / 2, z: (this.cz(j0) + this.cz(j1)) / 2, w: (i1 - i0 + 1) * CELL, d: (j1 - j0 + 1) * CELL });
    }
  }

  /** Tâm ô con cột `i`, hàng `j`. */
  private cx(i: number): number {
    return -this.tiles / 2 + (i + 0.5) * CELL;
  }
  private cz(j: number): number {
    return -this.tiles / 2 + (j + 0.5) * CELL;
  }

  /** Hình chữ nhật bao mọi ô con mang chữ `ch`. */
  zone(ch: string): Zone {
    const z = this.zones.get(ch);
    if (!z) throw new Error(`Bản vẽ không có chữ '${ch}'`);
    return z;
  }

  /** Tâm từng ô con mang chữ `ch`, từ trên xuống, trái sang (dùng cho phần đứng rời như cờ hai bên lối). */
  cells(ch: string): { x: number; z: number }[] {
    return this.spots.get(ch) ?? [];
  }

  /** Các khối chữ liền nhau mang chữ `ch` (cờ hai bên, lầu hai góc...), mỗi khối một hình chữ nhật. */
  groups(ch: string): Zone[] {
    const cells = this.cells(ch);
    const seen = new Set<number>();
    const out: Zone[] = [];
    const key = (c: { x: number; z: number }) => cells.indexOf(c);
    for (const start of cells) {
      if (seen.has(key(start))) continue;
      const stack = [start];
      seen.add(key(start));
      let [x0, z0, x1, z1] = [start.x, start.z, start.x, start.z];
      while (stack.length) {
        const c = stack.pop()!;
        x0 = Math.min(x0, c.x);
        z0 = Math.min(z0, c.z);
        x1 = Math.max(x1, c.x);
        z1 = Math.max(z1, c.z);
        for (const o of cells) {
          if (seen.has(key(o))) continue;
          if (Math.abs(o.x - c.x) + Math.abs(o.z - c.z) <= CELL + 1e-6) {
            seen.add(key(o));
            stack.push(o);
          }
        }
      }
      out.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0 + CELL, d: z1 - z0 + CELL });
    }
    return out;
  }
}
