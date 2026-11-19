// Công cụ dựng hình: ghép nhiều khối có màu thành một mesh (một lần vẽ),
// mái nhà sàn hình thuyền, nhân bản cây cối bằng InstancedMesh.

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const tmpColor = new THREE.Color();

type Rot = [number, number, number];

/** Ghép nhiều hình (hộp, cầu, trụ, nón, viên nang...) có màu thành một geometry. */
export class ShapeBuilder {
  private parts: THREE.BufferGeometry[] = [];
  /**
   * Thu tâm mỗi hình theo x, z về gốc (giữ nguyên cỡ hình). Công trình cấp cao phóng to cả khối nhưng thu tâm
   * các phần lại, nên mỗi phần to ra tại chỗ cũ mà không tràn ô móng.
   */
  spread = 1;
  /**
   * Khung tọa độ riêng: có thì mỗi hình vẽ sau đó tính từ khung này (vd. vũ khí dựng với gốc ở chỗ tay nắm),
   * rồi mới đặt vào mô hình. Không có thì vẽ thẳng trong tọa độ mô hình.
   */
  frame: THREE.Matrix4 | null = null;
  /**
   * Độ chi tiết: nhân số mặt quanh của khối cầu, trụ, nón (giữ tối thiểu để không méo). Nhân vật đông và nhỏ
   * trên màn hình (dân làng) dùng số nhỏ cho nhẹ máy.
   */
  detail = 1;

  /** `lowPoly`: ít mặt hơn, dùng cho cây cối được nhân lên hàng trăm lần. */
  constructor(
    private readonly keepUv = false,
    private readonly lowPoly = false,
  ) {}

  add(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, x: number, y: number, z: number, rot: Rot = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]): this {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x * this.spread, y, z * this.spread),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(...scale),
    );
    if (this.frame) m.premultiply(this.frame);
    g.applyMatrix4(m);
    tmpColor.set(color);
    const n = g.getAttribute('position').count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) colors.set([tmpColor.r, tmpColor.g, tmpColor.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    if (!this.keepUv) g.deleteAttribute('uv');
    else if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'color', 'uv'].includes(name)) g.deleteAttribute(name);
    }
    this.parts.push(g);
    return this;
  }

  box(w: number, h: number, d: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, rot?: Rot): this {
    return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rot);
  }

  sphere(r: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, scale: [number, number, number] = [1, 1, 1], seg = this.lowPoly ? 7 : 12): this {
    const n = this.seg(seg, 5);
    return this.add(new THREE.SphereGeometry(r, n, Math.max(this.detail < 1 ? 4 : 6, Math.round(n * 0.75))), color, x, y, z, [0, 0, 0], scale);
  }

  cyl(rTop: number, rBottom: number, h: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, rot?: Rot, seg = this.lowPoly ? 6 : 12): this {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, this.seg(seg, 5)), color, x, y, z, rot);
  }

  cone(r: number, h: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, rot?: Rot, seg = this.lowPoly ? 6 : 10): this {
    return this.add(new THREE.ConeGeometry(r, h, this.seg(seg, 4)), color, x, y, z, rot);
  }

  /** Số mặt quanh theo độ chi tiết, không ít hơn `min` (và không nhiều hơn số đã cho). */
  private seg(seg: number, min: number): number {
    return this.detail === 1 ? seg : Math.min(seg, Math.max(min, Math.round(seg * this.detail)));
  }

  capsule(r: number, len: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, rot?: Rot, scale?: [number, number, number]): this {
    return this.add(new THREE.CapsuleGeometry(r, len, this.lowPoly ? 1 : 4, this.lowPoly ? 5 : 10), color, x, y, z, rot, scale);
  }

  geometry(): THREE.BufferGeometry {
    const merged = mergeGeometries(this.parts, false) ?? new THREE.BufferGeometry();
    for (const p of this.parts) p.dispose();
    this.parts = [];
    return merged;
  }

  mesh(material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry(), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  get empty(): boolean {
    return this.parts.length === 0;
  }
}

/**
 * Mái nhà sàn hình thuyền: sống mái cong vút lên hai đầu, hai mái dốc.
 * Trả về geometry không chỉ mục, có pháp tuyến mượt và uv (u dọc nóc, v theo dốc).
 */
export function saddleRoof(opts: { length: number; width: number; lift: number; drop: number; thickness: number; segU?: number; segV?: number }): THREE.BufferGeometry {
  const { length, width, lift, drop, thickness } = opts;
  const segU = opts.segU ?? 24;
  const segV = opts.segV ?? 6;
  const top = (u: number, v: number) => {
    // u, v trong [-1, 1]: u dọc nóc, v từ mái này sang mái kia.
    const x = (u * length) / 2;
    const z = (v * width) / 2;
    const y = lift * Math.pow(Math.abs(u), 2.2) - drop * Math.abs(v) * (1 - 0.25 * Math.abs(u));
    return new THREE.Vector3(x, y, z);
  };
  const surface = (offsetY: number, flip: boolean) => {
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= segU; i++) {
      for (let j = 0; j <= segV; j++) {
        const u = -1 + (2 * i) / segU;
        const v = -1 + (2 * j) / segV;
        const p = top(u, v);
        pos.push(p.x, p.y + offsetY, p.z);
        uv.push(i / segU, j / segV);
      }
    }
    for (let i = 0; i < segU; i++) {
      for (let j = 0; j < segV; j++) {
        const a = i * (segV + 1) + j;
        const b = a + segV + 1;
        if (flip) idx.push(a, a + 1, b, b, a + 1, b + 1);
        else idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g.toNonIndexed();
  };
  // Viền mái: dải nối mặt trên và mặt dưới ở bốn cạnh.
  const rim = () => {
    const pos: number[] = [];
    const ring: THREE.Vector3[] = [];
    for (let i = 0; i <= segU; i++) ring.push(top(-1 + (2 * i) / segU, -1));
    for (let j = 0; j <= segV; j++) ring.push(top(1, -1 + (2 * j) / segV));
    for (let i = segU; i >= 0; i--) ring.push(top(-1 + (2 * i) / segU, 1));
    for (let j = segV; j >= 0; j--) ring.push(top(-1, -1 + (2 * j) / segV));
    for (let k = 0; k < ring.length - 1; k++) {
      const a = ring[k];
      const b = ring[k + 1];
      const a2 = a.clone().setY(a.y - thickness);
      const b2 = b.clone().setY(b.y - thickness);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, a2.x, a2.y, a2.z, b.x, b.y, b.z, b2.x, b2.y, b2.z, a2.x, a2.y, a2.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    g.computeVertexNormals();
    return g;
  };
  // Mặt trên quay pháp tuyến lên trời, mặt dưới quay xuống đất.
  return mergeGeometries([surface(0, true), surface(-thickness, false), rim()], false)!;
}

export interface Placement {
  t: number;
  x: number;
  y?: number;
  z: number;
  s: number;
  ry: number;
}

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpAt = new THREE.Vector3();
const tmpSize = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** Ma trận đặt một bản sao: dời tới chỗ, xoay quanh trục đứng, phóng đều. */
function placementMatrix(p: Placement): THREE.Matrix4 {
  tmpQuat.setFromAxisAngle(UP, p.ry);
  return tmpMatrix.compose(tmpAt.set(p.x, p.y ?? 0, p.z), tmpQuat, tmpSize.setScalar(p.s));
}

/** Vẽ nhiều bản sao của vài mẫu (cây, bụi tre) bằng InstancedMesh, mỗi mẫu một lần vẽ. */
export function instanceTemplates(templates: THREE.Mesh[], placements: Placement[], outline?: (geo: THREE.BufferGeometry) => THREE.Mesh): THREE.Group {
  const group = new THREE.Group();
  templates.forEach((tpl, ti) => {
    const mine = placements.filter((p) => p.t === ti);
    if (!mine.length) return;
    const inst = new THREE.InstancedMesh(tpl.geometry, tpl.material, mine.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    mine.forEach((p, i) => inst.setMatrixAt(i, placementMatrix(p)));
    inst.computeBoundingSphere();
    group.add(inst);
    if (outline) {
      const o = outline(tpl.geometry);
      const oi = new THREE.InstancedMesh(o.geometry, o.material, mine.length);
      oi.instanceMatrix.copyArray(inst.instanceMatrix.array);
      oi.computeBoundingSphere();
      group.add(oi);
    }
  });
  return group;
}

/**
 * Như `instanceTemplates`, nhưng gộp mọi mẫu cùng chất liệu vào một BatchedMesh (viền mực một BatchedMesh nữa).
 *
 * Mỗi mẫu một InstancedMesh thì khối bao của lô trùm cả bản đồ: three.js không bỏ được bản sao nào nằm ngoài khung
 * nhìn hay ngoài vùng bóng nắng, rừng cả nghìn cây vẽ trọn mọi khung hình. BatchedMesh xét từng bản sao, chỉ vẽ cái
 * thấy được, mà cả lô vẫn một lệnh vẽ mỗi lượt. Cần WEBGL_multi_draw: thiếu thì three.js vẽ từng bản sao một, nên
 * máy không có thì dùng `instanceTemplates`.
 */
export function batchTemplates(templates: THREE.Mesh[], placements: Placement[], outline?: (geo: THREE.BufferGeometry) => THREE.Mesh): THREE.Group {
  const group = new THREE.Group();
  const batch = (material: THREE.Material, geos: Map<number, THREE.BufferGeometry>, mine: Placement[]) => {
    let vertices = 0;
    let indices = 0;
    for (const g of geos.values()) {
      vertices += g.getAttribute('position').count;
      indices += g.index?.count ?? 0;
    }
    const bm = new THREE.BatchedMesh(mine.length, vertices, indices, material);
    // Chất liệu đặc, không cần xếp xa gần: bỏ bước xếp cho nhẹ mỗi khung.
    bm.sortObjects = false;
    const ids = new Map<number, number>();
    for (const [t, g] of geos) ids.set(t, bm.addGeometry(g));
    for (const p of mine) bm.setMatrixAt(bm.addInstance(ids.get(p.t)!), placementMatrix(p));
    group.add(bm);
    return bm;
  };
  // Chia theo chất liệu (mẫu cây hiện đều một chất liệu, nên thường chỉ một nhóm).
  const byMaterial = new Map<THREE.Material, number[]>();
  templates.forEach((tpl, t) => {
    if (!placements.some((p) => p.t === t)) return;
    const mat = tpl.material as THREE.Material;
    byMaterial.set(mat, [...(byMaterial.get(mat) ?? []), t]);
  });
  for (const [material, ts] of byMaterial) {
    const mine = placements.filter((p) => ts.includes(p.t));
    const fill = batch(material, new Map(ts.map((t) => [t, templates[t].geometry])), mine);
    fill.castShadow = true;
    fill.receiveShadow = true;
    if (!outline) continue;
    const inks = ts.map((t) => outline(templates[t].geometry));
    const ink = batch(inks[0].material as THREE.Material, new Map(ts.map((t, i) => [t, inks[i].geometry])), mine);
    ink.castShadow = false;
  }
  return group;
}

/**
 * Gỡ lô bản sao đã vẽ (rừng, lũy, đê...): trả bộ nhớ vị trí các bản sao trên GPU, giữ lại hình mẫu và viền mực
 * dùng chung để vẽ lô sau.
 */
export function disposeInstances(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    // BatchedMesh giữ bản sao chép riêng của các mẫu: trả luôn, mẫu gốc vẫn còn.
    if (o instanceof THREE.InstancedMesh || o instanceof THREE.BatchedMesh) o.dispose();
  });
}

/**
 * Gỡ một mô hình dựng riêng (công trình, người làm, lính): trả hình và khung xương (ảnh xương trên GPU) của nó.
 * Chất liệu dùng chung giữa mọi mô hình nên giữ lại. Hình dùng chung (nếu có) bị trả thì lần vẽ sau tự nạp lại.
 */
export function disposeModel(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
    // Lô bản sao trong mô hình dùng hình mẫu chung: chỉ trả vị trí các bản sao.
    if (o instanceof THREE.InstancedMesh || o instanceof THREE.BatchedMesh) o.dispose();
    else if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}

/**
 * Gộp đỉnh trùng y như `mergeVertices` của three.js (cùng cách làm tròn theo `tolerance`, cùng thứ tự đỉnh, cùng chỉ
 * số), mà nhanh hơn nhiều lần: khóa mỗi đỉnh là dãy số nguyên băm thành số, không ghép chuỗi. Hình có thuộc tính đan
 * xen, chuẩn hóa hay morph thì để three.js làm. `shapes.test.ts` canh ra y hệt.
 */
export function weld(geometry: THREE.BufferGeometry, tolerance = 1e-4): THREE.BufferGeometry {
  const names = Object.keys(geometry.attributes);
  const attrs = names.map((n) => geometry.getAttribute(n));
  if (Object.keys(geometry.morphAttributes).length || attrs.some((a) => !(a instanceof THREE.BufferAttribute) || a.normalized)) {
    return mergeVertices(geometry, tolerance);
  }
  // Cùng công thức với three.js để số làm tròn ra y hệt.
  tolerance = Math.max(tolerance, Number.EPSILON);
  const exponent = Math.log10(1 / tolerance);
  const hashMultiplier = Math.pow(10, exponent);
  const hashAdditive = tolerance * 0.5 * hashMultiplier;
  const index = geometry.getIndex();
  const count = index ? index.count : geometry.getAttribute('position').count;
  const sizes = attrs.map((a) => a.itemSize);
  const width = sizes.reduce((s, n) => s + n, 0);
  const arrays = attrs.map((a) => a.array as ArrayLike<number>);
  const key = new Float64Array(width);
  let keys = new Float64Array(Math.max(16, count) * width);
  /** Đỉnh mới đầu tiên của mỗi giá trị băm; đỉnh mới cùng băm nối nhau qua `next`. */
  const first = new Map<number, number>();
  let next = new Int32Array(Math.max(16, count));
  const source: number[] = [];
  const out = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    const v = index ? index.getX(i) : i;
    let h = 0;
    let c = 0;
    for (let a = 0; a < arrays.length; a++) {
      const arr = arrays[a];
      const n = sizes[a];
      for (let k = 0; k < n; k++) {
        const q = Math.trunc(arr[v * n + k] * hashMultiplier + hashAdditive);
        key[c++] = q;
        h = (Math.imul(h, 0x01000193) ^ (q | 0)) | 0;
      }
    }
    let found = -1;
    for (let j = first.get(h) ?? -1; j >= 0; j = next[j]) {
      let same = true;
      for (let k = 0, o = j * width; k < width; k++) {
        if (keys[o + k] !== key[k]) {
          same = false;
          break;
        }
      }
      if (same) {
        found = j;
        break;
      }
    }
    if (found < 0) {
      found = source.length;
      if ((found + 1) * width > keys.length) {
        const grown = new Float64Array(keys.length * 2);
        grown.set(keys);
        keys = grown;
        const grownNext = new Int32Array(next.length * 2);
        grownNext.set(next);
        next = grownNext;
      }
      keys.set(key, found * width);
      next[found] = first.get(h) ?? -1;
      first.set(h, found);
      source.push(v);
    }
    out[i] = found;
  }
  const result = new THREE.BufferGeometry();
  attrs.forEach((a, n) => {
    const size = sizes[n];
    const src = arrays[n];
    const dst = new (a.array.constructor as new (n: number) => THREE.TypedArray)(source.length * size);
    for (let i = 0; i < source.length; i++) for (let k = 0; k < size; k++) dst[i * size + k] = src[source[i] * size + k];
    result.setAttribute(names[n], new THREE.BufferAttribute(dst, size, a.normalized));
  });
  result.setIndex(new THREE.BufferAttribute(source.length - 1 >= 65535 ? out : new Uint16Array(out), 1));
  for (const g of geometry.groups) result.addGroup(g.start, g.count, g.materialIndex);
  return result;
}

/** Geometry chỉ còn vị trí, gộp đỉnh trùng và có pháp tuyến mượt, dùng để đẩy viền mực ra ngoài. */
export function smoothForOutline(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.getAttribute('position').clone());
  const merged = weld(g, 1e-3);
  merged.computeVertexNormals();
  return merged;
}

/** Số ngẫu nhiên lặp lại được theo hạt giống, để cây cối không đổi chỗ mỗi lần vẽ. */
export function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
