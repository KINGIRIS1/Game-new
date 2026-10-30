// PROTOTYPE, DÙNG XONG BỎ: công cụ dùng chung cho các bộ hình thử nghiệm.
// Xem docs/thiet-ke.md và thanh chuyển ?variant= trong game.

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const tmpColor = new THREE.Color();

type Rot = [number, number, number];

/** Ghép nhiều hình (hộp bo góc, cầu, trụ, nón, viên nang...) có màu thành một geometry. */
export class ShapeBuilder {
  private parts: THREE.BufferGeometry[] = [];

  /** `lowPoly`: ít mặt hơn, dùng cho cây cối được nhân lên hàng trăm lần. */
  constructor(
    private readonly keepUv = false,
    private readonly lowPoly = false,
  ) {}

  add(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, x: number, y: number, z: number, rot: Rot = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]): this {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(...scale),
    );
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

  rbox(w: number, h: number, d: number, r: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, rot?: Rot): this {
    const radius = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    return this.add(new RoundedBoxGeometry(w, h, d, 2, Math.max(radius, 0.001)), color, x, y, z, rot);
  }

  sphere(r: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, scale: [number, number, number] = [1, 1, 1], seg = this.lowPoly ? 7 : 12): this {
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.75))), color, x, y, z, [0, 0, 0], scale);
  }

  cyl(rTop: number, rBottom: number, h: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, rot?: Rot, seg = this.lowPoly ? 6 : 12): this {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, seg), color, x, y, z, rot);
  }

  cone(r: number, h: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, rot?: Rot, seg = this.lowPoly ? 6 : 10): this {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y, z, rot);
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

/** Vẽ nhiều bản sao của vài mẫu (cây, bụi tre) bằng InstancedMesh, mỗi mẫu một lần vẽ. */
export function instanceTemplates(templates: THREE.Mesh[], placements: Placement[], outline?: (geo: THREE.BufferGeometry) => THREE.Mesh): THREE.Group {
  const group = new THREE.Group();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  templates.forEach((tpl, ti) => {
    const mine = placements.filter((p) => p.t === ti);
    if (!mine.length) return;
    const inst = new THREE.InstancedMesh(tpl.geometry, tpl.material, mine.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    mine.forEach((p, i) => {
      q.setFromAxisAngle(up, p.ry);
      m.compose(new THREE.Vector3(p.x, p.y ?? 0, p.z), q, new THREE.Vector3(p.s, p.s, p.s));
      inst.setMatrixAt(i, m);
    });
    inst.computeBoundingSphere();
    group.add(inst);
    if (outline) {
      const o = outline(tpl.geometry);
      const oi = new THREE.InstancedMesh(o.geometry, o.material, mine.length);
      for (let i = 0; i < mine.length; i++) {
        inst.getMatrixAt(i, m);
        oi.setMatrixAt(i, m);
      }
      oi.computeBoundingSphere();
      group.add(oi);
    }
  });
  return group;
}

/** Geometry chỉ còn vị trí, gộp đỉnh trùng và có pháp tuyến mượt, dùng để đẩy viền mực ra ngoài. */
export function smoothForOutline(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.getAttribute('position').clone());
  const merged = mergeVertices(g, 1e-3);
  merged.computeVertexNormals();
  return merged;
}
