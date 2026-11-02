// Khung xương dựng bằng code. Mỗi khối hình gắn cứng vào một xương ("rigid skinning"): cả người vẫn gộp thành
// một mesh cho mỗi chất liệu như ToonModel, nên số lệnh vẽ không tăng, mà đầu, tay, chân, vũ khí xoay được quanh khớp.
// Viền mực cũng là SkinnedMesh dùng chung bộ xương, nên chạy theo động tác.

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ShapeBuilder } from './shapes';
import { glowMaterial, inkThin, outlineOf, toon, toonBand, toonDrum } from './toon';

type V3 = [number, number, number];

/** Một xương: xương cha và khớp (tọa độ mô hình ở tư thế gốc). */
export interface BoneDef<B extends string> {
  parent: B | null;
  at: V3;
}

/** Bốn phần chất liệu như ToonModel: màu trơn, dải hoa văn, mặt trống, tự phát sáng. */
export interface RigSlots {
  plain: ShapeBuilder;
  band: ShapeBuilder;
  drum: ShapeBuilder;
  glow: ShapeBuilder;
}

const SLOTS = ['plain', 'band', 'drum', 'glow'] as const;
const MATERIAL: Record<(typeof SLOTS)[number], THREE.Material> = { plain: toon, band: toonBand, drum: toonDrum, glow: glowMaterial };

/** Hình đã gộp: một geometry cho mỗi chất liệu, mỗi đỉnh mang chỉ số xương của khối chứa nó (`skinIndex`). */
export interface RigShape<B extends string> {
  defs: Record<B, BoneDef<B>>;
  names: B[];
  parts: { geo: THREE.BufferGeometry; mat: THREE.Material }[];
}

export type Bones<B extends string> = Record<B, THREE.Bone>;

/**
 * Nhân vật có xương đang làm gì, để đặt tư thế mỗi khung hình. Mỗi nhân vật có xương giữ một hàm
 * `userData.pose(a: Act)`; tư thế chỉ phụ thuộc `a`, không phụ thuộc khung trước.
 */
export interface Act {
  /** Đứng, đi (hay chạy), đánh (giữa hai đòn, có thể đang ra đòn), ngã. */
  act: 'stand' | 'walk' | 'fight' | 'dead';
  /** Pha bước chân (radian), tăng đều khi đi. */
  phase?: number;
  /** Góc vung chân khi đi (radian). Đi thường 0,5. */
  stride?: number;
  /** Tiến trình đòn đánh: 0 lúc vừa ra đòn tới 1 lúc thu về. Bỏ trống là không ra đòn. */
  strike?: number;
  /** Đồng hồ (giây), cho nhịp thở, lửa bập bùng... */
  time?: number;
  /** Ngã được bao nhiêu, 0..1. */
  fall?: number;
  /** Tướng đang làm kỹ năng riêng (quét tre, dời non, hô mưa, nỏ thần): tiến trình 0..1. */
  skill?: number;
  /** Tướng thắng trận (giơ gậy, chĩa nỏ lên trời): 0..1. */
  win?: number;
  /** Tướng thổi tù và hiệu lệnh (Lệnh bắn của Cao Lỗ): tiến trình 0..1, nâng tù và lên miệng, thổi, rồi hạ xuống. */
  horn?: number;
}

export type Poser = (a: Act) => void;

/** Gom khối hình theo xương, rồi gộp thành `RigShape`. */
export class RigBuilder<B extends string> {
  private readonly slots = new Map<B, RigSlots>();
  /** Khung đang đặt bằng `place` (dời, đổi cỡ cả một nhóm khối); null là tọa độ mô hình. */
  private base: THREE.Matrix4 | null = null;
  /** `detail`: độ chi tiết của mọi khối (xem `ShapeBuilder.detail`). */
  constructor(
    private readonly defs: Record<B, BoneDef<B>>,
    private readonly detail = 1,
  ) {}

  /** Các khối vẽ sau đây gắn vào xương `b`. Tọa độ vẫn là tọa độ mô hình ở tư thế gốc, như ToonModel. */
  on(b: B): RigSlots {
    let s = this.slots.get(b);
    if (!s) {
      s = { plain: new ShapeBuilder(), band: new ShapeBuilder(true), drum: new ShapeBuilder(true), glow: new ShapeBuilder() };
      for (const k of SLOTS) s[k].detail = this.detail;
      this.slots.set(b, s);
    }
    for (const k of SLOTS) s[k].frame = this.base;
    return s;
  }

  /**
   * Vẽ cả một nhóm khối dời tới `offset`, cỡ nhân `scale`: vd. một thân người (vẽ như đứng ở gốc) đặt lên lưng voi,
   * hay một con ngựa nhỏ kéo xe. Khớp của nhóm đó phải dời và đổi cỡ theo (xem `moveBones`).
   */
  place(offset: V3, scale: number, draw: () => void): void {
    const prev = this.base;
    const m = new THREE.Matrix4().makeTranslation(...offset).multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
    this.base = prev ? prev.clone().multiply(m) : m;
    draw();
    this.base = prev;
    for (const s of this.slots.values()) for (const k of SLOTS) s[k].frame = prev;
  }

  /**
   * Vẽ các khối của xương `b` trong khung riêng: gốc ở `origin`, xoay `rot` (tọa độ mô hình ở tư thế gốc).
   * Dùng cho vũ khí, đồ đeo: dựng quanh chỗ tay nắm hay chỗ đeo cho dễ, rồi đặt vào người.
   */
  local(b: B, origin: V3, rot: V3 | null, draw: (s: RigSlots) => void): void {
    const s = this.on(b);
    const own = new THREE.Matrix4().compose(
      new THREE.Vector3(...origin),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot ?? [0, 0, 0]))),
      new THREE.Vector3(1, 1, 1),
    );
    const frame = this.base ? this.base.clone().multiply(own) : own;
    for (const k of SLOTS) s[k].frame = frame;
    draw(s);
    for (const k of SLOTS) s[k].frame = this.base;
  }

  build(): RigShape<B> {
    const names = Object.keys(this.defs) as B[];
    const parts: RigShape<B>['parts'] = [];
    for (const k of SLOTS) {
      const geos: THREE.BufferGeometry[] = [];
      names.forEach((b, i) => {
        const s = this.slots.get(b);
        if (!s || s[k].empty) return;
        const g = s[k].geometry();
        const n = g.getAttribute('position').count;
        const index = new Uint16Array(n * 4);
        const weight = new Float32Array(n * 4);
        for (let v = 0; v < n; v++) {
          index[v * 4] = i;
          weight[v * 4] = 1;
        }
        g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(index, 4));
        g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weight, 4));
        geos.push(g);
      });
      if (!geos.length) continue;
      const geo = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (geo) parts.push({ geo, mat: MATERIAL[k] });
    }
    return { defs: this.defs, names, parts };
  }
}

function makeBones<B extends string>(shape: RigShape<B>): { root: THREE.Bone; bones: Bones<B>; list: THREE.Bone[] } {
  const bones = {} as Bones<B>;
  const list = shape.names.map((b) => {
    const bone = new THREE.Bone();
    bone.name = b;
    bones[b] = bone;
    return bone;
  });
  let root: THREE.Bone | undefined;
  for (const b of shape.names) {
    const { parent, at } = shape.defs[b];
    const from = parent ? shape.defs[parent].at : [0, 0, 0];
    const bone = bones[b];
    bone.position.set(at[0] - from[0], at[1] - from[1], at[2] - from[2]);
    bone.userData.rest = bone.position.clone();
    if (parent) bones[parent].add(bone);
    else root = bone;
  }
  if (!root) throw new Error('Khung xương thiếu xương gốc');
  return { root, bones, list };
}

/**
 * Khớp của một nhóm xương dời tới `offset`, cỡ nhân `scale`; xương gốc của nhóm (không có cha) nhận cha `parent`.
 * Đi cùng `RigBuilder.place` khi ghép nhiều khung xương (người cưỡi trên ngựa, ngựa kéo xe).
 */
export function moveBones<B extends string, P extends string>(
  defs: Record<B, BoneDef<B>>,
  parent: P,
  offset: V3,
  scale = 1,
): Record<B, BoneDef<B | P>> {
  const out = {} as Record<B, BoneDef<B | P>>;
  for (const b of Object.keys(defs) as B[]) {
    const d = defs[b];
    out[b] = { parent: d.parent ?? parent, at: [offset[0] + d.at[0] * scale, offset[1] + d.at[1] * scale, offset[2] + d.at[2] * scale] };
  }
  return out;
}

/** Đưa mọi xương về tư thế gốc: khớp về chỗ cũ, không xoay, đủ cỡ. */
export function resetBones<B extends string>(bones: Bones<B>): void {
  for (const b of Object.values<THREE.Bone>(bones)) {
    b.position.copy(b.userData.rest as THREE.Vector3);
    b.rotation.set(0, 0, 0);
    b.scale.setScalar(1);
  }
}

/** Viền mực cho cả người: gộp mọi chất liệu, gộp đỉnh trùng để pháp tuyến mượt, giữ chỉ số xương. */
function skinnedOutline(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = geos.map((src) => {
    const g = new THREE.BufferGeometry();
    for (const a of ['position', 'skinIndex', 'skinWeight']) g.setAttribute(a, src.getAttribute(a).clone());
    return g;
  });
  const merged = mergeVertices(mergeGeometries(parts, false) ?? new THREE.BufferGeometry(), 1e-3);
  for (const g of parts) g.dispose();
  merged.computeVertexNormals();
  return merged;
}

/** Nhân vật có xương, sẵn sàng làm động tác: xoay `bones` mỗi khung hình. Nhóm trả về cũng giữ `userData.bones`. */
export function skinRig<B extends string>(shape: RigShape<B>, ink = inkThin): { group: THREE.Group; bones: Bones<B> } {
  const group = new THREE.Group();
  const { root, bones, list } = makeBones(shape);
  group.add(root);
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list);
  const bind = new THREE.Matrix4();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, shadow: boolean) => {
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.bind(skeleton, bind);
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    // Vũ khí vung xa khỏi khối bao lúc dựng, nên không cắt theo khung nhìn.
    mesh.frustumCulled = false;
    group.add(mesh);
  };
  for (const p of shape.parts) add(p.geo, p.mat, true);
  add(skinnedOutline(shape.parts.map((p) => p.geo)), ink, false);
  group.userData.bones = bones;
  return { group, bones };
}

/** Bản tĩnh (không xương) ở tư thế `pose`, cho chỗ nhân vật đứng yên như trong công trình. */
export function bakeRig<B extends string>(shape: RigShape<B>, pose?: (bones: Bones<B>) => void, ink = inkThin): THREE.Group {
  const { root, bones, list } = makeBones(shape);
  root.updateMatrixWorld(true);
  const inverse = list.map((b) => b.matrixWorld.clone().invert());
  pose?.(bones);
  root.updateMatrixWorld(true);
  const mats = list.map((b, i) => b.matrixWorld.clone().multiply(inverse[i]));
  const normals = mats.map((m) => new THREE.Matrix3().getNormalMatrix(m));
  const out = new THREE.Group();
  const v3 = new THREE.Vector3();
  for (const part of shape.parts) {
    const g = part.geo.clone();
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const bone = g.getAttribute('skinIndex');
    for (let v = 0; v < pos.count; v++) {
      const k = bone.getX(v);
      v3.fromBufferAttribute(pos, v).applyMatrix4(mats[k]);
      pos.setXYZ(v, v3.x, v3.y, v3.z);
      v3.fromBufferAttribute(nor, v).applyNormalMatrix(normals[k]);
      nor.setXYZ(v, v3.x, v3.y, v3.z);
    }
    g.deleteAttribute('skinIndex');
    g.deleteAttribute('skinWeight');
    const mesh = new THREE.Mesh(g, part.mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    out.add(mesh, outlineOf(g, ink));
  }
  return out;
}
