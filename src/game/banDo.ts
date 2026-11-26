// Giải hình tỉnh TopoJSON (`public/ban-do/34-tinh.json`, do `scripts/ban-do.mjs` rút gọn) ra các vòng kinh độ, vĩ độ.
// Viết tay vài dòng thay thư viện topojson-client (chỉ cần cung đã lượng tử, chỉ số cung âm là đi ngược).

export interface Topo {
  type: 'Topology';
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: [number, number][][];
  objects: { tinh: { type: 'GeometryCollection'; geometries: TopoGeom[] } };
  nguon?: string;
}
interface TopoGeom {
  type: 'Polygon' | 'MultiPolygon';
  arcs: number[][] | number[][][];
  properties: { id: string; ten: string };
}

/** Một vòng: dãy điểm [kinh độ, vĩ độ]. Một mảnh: vòng ngoài rồi các lỗ. */
export type Vong = [number, number][];
export interface HinhTinh {
  id: string;
  ten: string;
  manh: Vong[][];
}

/** Giải cả tệp ra hình từng tỉnh. */
export function giaiTopo(t: Topo): HinhTinh[] {
  const [sx, sy] = t.transform.scale;
  const [tx, ty] = t.transform.translate;
  const cung = t.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]): [number, number] => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });
  const vong = (ids: number[]): Vong => {
    const out: Vong = [];
    for (const i of ids) {
      const a = i < 0 ? cung[~i].slice().reverse() : cung[i];
      // Điểm đầu mỗi cung trùng điểm cuối cung trước.
      out.push(...(out.length ? a.slice(1) : a));
    }
    return out;
  };
  return t.objects.tinh.geometries.map((g) => {
    const polys = (g.type === 'Polygon' ? [g.arcs] : g.arcs) as number[][][];
    return { id: g.properties.id, ten: g.properties.ten, manh: polys.map((p) => p.map(vong)) };
  });
}

/** Điểm (x, y) có nằm trong vòng không (đếm cắt tia). */
export function trongVong(v: Vong, x: number, y: number): boolean {
  let o = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const [xi, yi] = v[i];
    const [xj, yj] = v[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) o = !o;
  }
  return o;
}

/** Diện tích vòng theo độ vuông (giá trị tuyệt đối). */
export function dienTich(v: Vong): number {
  let s = 0;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) s += (v[j][0] - v[i][0]) * (v[j][1] + v[i][1]);
  return Math.abs(s / 2);
}
