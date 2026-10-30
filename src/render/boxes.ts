// Ghép nhiều khối hộp có màu thành một mesh duy nhất (một lần vẽ) để nhẹ máy.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const sharedMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpColor = new THREE.Color();

export interface PartOptions {
  /** Góc xoay (radian) quanh trục x, y, z. */
  rot?: [number, number, number];
}

export class BoxBuilder {
  private parts: THREE.BufferGeometry[] = [];

  /** Thêm khối hộp kích thước w×h×d, tâm tại (x, y, z). */
  box(w: number, h: number, d: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, opts: PartOptions = {}): this {
    return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, opts);
  }

  /** Thêm khối trụ nhiều cạnh (trống đồng, cột tròn). */
  cyl(r: number, h: number, sides: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, opts: PartOptions = {}): this {
    return this.add(new THREE.CylinderGeometry(r, r, h, sides), color, x, y, z, opts);
  }

  private add(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, x: number, y: number, z: number, opts: PartOptions): this {
    const [rx, ry, rz] = opts.rot ?? [0, 0, 0];
    tmpQuat.setFromEuler(tmpEuler.set(rx, ry, rz));
    tmpMatrix.compose(new THREE.Vector3(x, y, z), tmpQuat, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(tmpMatrix);
    tmpColor.set(color);
    const count = geo.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // Bỏ uv để mọi phần có cùng thuộc tính khi ghép.
    geo.deleteAttribute('uv');
    this.parts.push(geo);
    return this;
  }

  build(): THREE.Mesh {
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    const mesh = new THREE.Mesh(merged ?? new THREE.BufferGeometry(), sharedMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
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
