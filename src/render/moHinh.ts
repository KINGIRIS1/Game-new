// Nhân vật làm bằng Meshy: tệp GLB đã gắn xương ở src/assets/mo-hinh/, đã thu gọn bằng scripts/mo-hinh.mjs.
// Nạp lúc chạy rồi tô như nhân vật dựng bằng code: chất liệu hoạt hình 3 dải sáng (`ramp`) và viền mực chạy theo
// xương. Tư thế làm bằng code trên bộ xương ấy (`MeshyRig`), không dùng đoạn động tác của Meshy (đoạn đứng của Meshy
// làm dáng chibi đầu to cúi gằm và xoay cả người). Lúc chưa nạp xong, hay nạp hỏng, thì hiện bản dựng bằng code.

import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneRig } from 'three/addons/utils/SkeletonUtils.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import giongUrl from '../assets/mo-hinh/giong.glb?url';
import type { Poser } from './rig';
import { disposeModel } from './shapes';
import { inkMaterial, ramp } from './toon';

export interface MoHinhDef {
  url: string;
  /** Chiều cao trong game (đơn vị ô, tính cả mũ), đo ở tư thế gốc; chọn cho đầu và thân to bằng bản dựng bằng code. */
  height: number;
}

export const MO_HINH = {
  // Cao hơn bản dựng bằng code (1,69) vì mào lông chim của mô hình Meshy thấp hơn: đầu và thân to bằng nhau.
  giong: { url: giongUrl, height: 1.95 },
} satisfies Record<string, MoHinhDef>;
export type MoHinhId = keyof typeof MO_HINH;

/** Tên xương người trong bộ xương Meshy gắn (cùng tên với Mixamo); `moHinh.test.ts` canh mọi tệp đều có. */
export const XUONG = {
  spine: 'Spine01',
  head: 'Head',
  armL: 'LeftArm',
  foreL: 'LeftForeArm',
  handL: 'LeftHand',
  armR: 'RightArm',
  foreR: 'RightForeArm',
  handR: 'RightHand',
} as const;

/** Nét viền mực như nhân vật dựng bằng code (`inkThin`), đơn vị ô. */
const INK = 0.016;
/** Lòng bàn tay cách cổ tay bao nhiêu phần cẳng tay, theo hướng cẳng tay. */
const PALM = 0.3;

interface Loaded {
  gltf: GLTF;
  /** Hệ số phóng từ đơn vị tệp ra đơn vị ô. */
  scale: number;
  material: THREE.MeshToonMaterial;
  ink: THREE.Material;
  /** Hình viền mực của từng hình trong tệp: gộp đỉnh trùng, pháp tuyến mượt cho viền liền không nứt. */
  outline: Map<THREE.BufferGeometry, THREE.BufferGeometry>;
}

const cache = new Map<MoHinhId, Promise<Loaded | null>>();

function load(id: MoHinhId): Promise<Loaded | null> {
  let p = cache.get(id);
  if (!p) {
    const def: MoHinhDef = MO_HINH[id];
    // Bộ nạp GLTF và bộ giải meshopt tách mảnh riêng, chỉ tải khi lần đầu cần một mô hình.
    p = Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')])
      .then(([{ GLTFLoader }, { MeshoptDecoder }]) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(def.url))
      .then((gltf) => prepare(gltf, def))
      .catch((e: unknown) => {
        console.warn(`Không nạp được mô hình ${id}, dùng bản dựng bằng code`, e);
        return null;
      });
    cache.set(id, p);
  }
  return p;
}

function skinnedIn(root: THREE.Object3D): THREE.SkinnedMesh[] {
  const out: THREE.SkinnedMesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) out.push(o as THREE.SkinnedMesh);
  });
  return out;
}

function prepare(gltf: GLTF, def: MoHinhDef): Loaded | null {
  const meshes = skinnedIn(gltf.scene);
  if (!meshes.length || Object.values(XUONG).some((n) => !gltf.scene.getObjectByName(n))) return null;
  // Đo chiều cao theo hình ở tư thế gốc (xương chưa xoay), gốc ở chân.
  const box = new THREE.Box3();
  for (const m of meshes) {
    m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox!);
  }
  const scale = def.height / (box.max.y - box.min.y);
  const first = meshes[0].material as THREE.MeshStandardMaterial;
  const material = new THREE.MeshToonMaterial({ map: first.map, gradientMap: ramp });
  const outline = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  for (const m of meshes) {
    const src = m.geometry;
    if (outline.has(src)) continue;
    const g = new THREE.BufferGeometry();
    for (const a of ['position', 'skinIndex', 'skinWeight']) g.setAttribute(a, src.getAttribute(a).clone());
    if (src.index) g.setIndex(src.index.clone());
    const merged = mergeVertices(g, 1e-4);
    g.dispose();
    merged.computeVertexNormals();
    outline.set(src, merged);
  }
  return { gltf, scale, material, ink: inkMaterial(INK / scale), outline };
}

/**
 * Bộ xương Meshy, làm tư thế bằng code như nhân vật dựng bằng code: mỗi xương xoay một góc tính trong khung mô hình
 * (mặt nhìn +z, trên là +y) so với tư thế gốc chữ T, không phụ thuộc trục riêng của từng xương trong tệp. Xương không
 * đặt góc thì theo xương cha.
 */
class MeshyRig {
  private readonly order: THREE.Bone[] = [];
  private readonly rest = new Map<THREE.Bone, { local: THREE.Quaternion; world: THREE.Quaternion; inv: THREE.Quaternion; at: THREE.Vector3 }>();
  private readonly want = new Map<THREE.Bone, THREE.Quaternion>();
  private readonly turn = new Map<THREE.Bone, THREE.Quaternion>();

  constructor(private readonly model: THREE.Object3D) {
    model.updateMatrixWorld(true);
    const toModel = model.matrixWorld.clone().invert();
    const m = new THREE.Matrix4();
    // Duyệt cây thì xương cha đứng trước xương con.
    model.traverse((o) => {
      if (!(o as THREE.Bone).isBone) return;
      const b = o as THREE.Bone;
      const at = new THREE.Vector3();
      const world = new THREE.Quaternion();
      m.multiplyMatrices(toModel, b.matrixWorld).decompose(at, world, new THREE.Vector3());
      this.order.push(b);
      this.rest.set(b, { local: b.quaternion.clone(), world, inv: world.clone().invert(), at });
    });
  }

  bone(name: string): THREE.Bone | undefined {
    return this.model.getObjectByName(name) as THREE.Bone | undefined;
  }

  /** Chỗ khớp ở tư thế gốc, trong khung mô hình. */
  at(name: string): THREE.Vector3 {
    return this.rest.get(this.bone(name)!)!.at.clone();
  }

  /** Xoay xương `name` (cùng cả cành con) một góc `q` trong khung mô hình, so với tư thế gốc. */
  set(name: string, q: THREE.Quaternion): void {
    this.want.set(this.bone(name)!, q);
  }

  /** Đổi các góc đã đặt ra góc riêng của từng xương. */
  apply(): void {
    const id = new THREE.Quaternion();
    const rel = new THREE.Quaternion();
    for (const b of this.order) {
      const r = this.rest.get(b)!;
      const up = this.turn.get(b.parent as THREE.Bone) ?? id;
      const q = this.want.get(b) ?? up;
      this.turn.set(b, q);
      // Góc thế giới của xương = q · góc gốc, nên góc riêng = gốc riêng · gốc⁻¹ · (cha⁻¹ · q) · gốc.
      rel.copy(up).invert().multiply(q);
      b.quaternion.copy(r.local).multiply(r.inv).multiply(rel).multiply(r.world);
    }
    this.want.clear();
    this.turn.clear();
  }
}

const X = new THREE.Vector3(1, 0, 0);

/**
 * Đứng chầu: hai tay buông chếch ra ngoài, khuỷu hơi co, tay phải đưa ra trước cầm đồ; ngực khẽ phồng xẹp theo nhịp
 * thở, đầu gật nhẹ, như tướng dựng bằng code đứng trong sân Điện.
 */
function standPose(r: MeshyRig, t: number): void {
  const breath = Math.sin(t * 1.2);
  const chest = new THREE.Quaternion().setFromAxisAngle(X, 0.02 * breath);
  r.set(XUONG.spine, chest);
  r.set(XUONG.head, chest.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X, 0.03 * Math.sin(t * 1.2 + 0.6))));
  for (const [arm, fore, hand, out, fwd, bend] of [
    [XUONG.armL, XUONG.foreL, XUONG.handL, 0.25, 0.06, 0.25],
    // Tay phải dang rộng hơn cho đồ cầm dựng ngoài đầu (dáng chibi đầu to), khỏi che mặt.
    [XUONG.armR, XUONG.foreR, XUONG.handR, 0.45, 0.12, 0.45],
  ] as const) {
    const shoulder = r.at(arm);
    const elbow = r.at(fore);
    const wrist = r.at(hand);
    const d0 = elbow.clone().sub(shoulder).normalize();
    const d1 = wrist.clone().sub(elbow).normalize();
    const side = Math.sign(d0.x);
    const o = out + 0.015 * breath;
    const upper = new THREE.Vector3(side * Math.sin(o), -Math.cos(o), fwd).normalize();
    const lower = upper.clone().add(new THREE.Vector3(0, 0, bend)).normalize();
    r.set(arm, chest.clone().multiply(new THREE.Quaternion().setFromUnitVectors(d0, upper)));
    r.set(fore, chest.clone().multiply(new THREE.Quaternion().setFromUnitVectors(d1, lower)));
  }
  r.apply();
}

interface Instance {
  model: THREE.Group;
  pose: Poser;
  bone: (name: string) => THREE.Bone | undefined;
}

function instance(l: Loaded): Instance {
  const model = cloneRig(l.gltf.scene) as THREE.Group;
  model.scale.setScalar(l.scale);
  for (const m of skinnedIn(model)) {
    m.material = l.material;
    m.castShadow = true;
    m.receiveShadow = true;
    // Xương đưa tay chân ra khỏi khối bao lúc dựng, nên không cắt theo khung nhìn (như nhân vật dựng bằng code).
    m.frustumCulled = false;
    const ink = new THREE.SkinnedMesh(l.outline.get(m.geometry)!, l.ink);
    ink.position.copy(m.position);
    ink.quaternion.copy(m.quaternion);
    ink.scale.copy(m.scale);
    ink.frustumCulled = false;
    m.parent!.add(ink);
    ink.bind(m.skeleton, m.bindMatrix);
  }
  const rig = new MeshyRig(model);
  // Mỗi khung World gọi pose với đồng hồ chơi (mỗi người lệch một nhịp).
  const pose: Poser = (a) => standPose(rig, a.time ?? 0);
  pose({ act: 'stand' });
  return { model, pose, bone: (name) => rig.bone(name) };
}

/** Đặt đồ cầm tay vào tay phải mô hình. */
export interface Hold {
  /** Đồ cầm, gốc ở chỗ tay nắm, dựng theo trục +y. */
  item: THREE.Object3D;
  /** Hướng của đồ so với nhân vật, ở tư thế đứng lúc đầu. */
  rot: THREE.Euler;
  /** Cỡ của đồ, theo đơn vị của nhân vật. */
  scale: number;
}

/**
 * Nhân vật Meshy `id` trong một nhóm: lúc đầu hiện `fallback` (bản dựng bằng code), nạp xong thì thay bằng mô hình
 * Meshy đã tô, đặt đồ `hold` vào tay phải và gọi `dress` để gắn thêm đồ theo người (vd. hào quang; `at` cho chỗ một
 * xương). `userData.pose` của nhóm luôn làm động tác cho bản đang hiện.
 */
export function moHinh(
  id: MoHinhId,
  fallback: THREE.Group,
  opts: { hold?: Hold; dress?: (g: THREE.Group, at: (bone: string) => THREE.Vector3 | null) => void } = {},
): THREE.Group {
  const g = new THREE.Group();
  g.add(fallback);
  let pose = fallback.userData.pose as Poser | undefined;
  g.userData.pose = ((a) => pose?.(a)) satisfies Poser;
  void load(id).then((l) => {
    // Đã gỡ khỏi cảnh trước khi nạp xong thì thôi.
    if (!l || !g.parent) return;
    const inst = instance(l);
    g.remove(fallback);
    disposeModel(fallback);
    g.add(inst.model);
    pose = inst.pose;
    if (opts.hold) holdIn(g, inst, opts.hold);
    if (opts.dress) {
      // Chỗ một xương trong khung của nhóm, ở tư thế đứng lúc đầu.
      g.updateMatrixWorld(true);
      const toG = g.matrixWorld.clone().invert();
      opts.dress(g, (name) => {
        const b = inst.bone(name);
        return b ? new THREE.Vector3().setFromMatrixPosition(b.matrixWorld).applyMatrix4(toG) : null;
      });
    }
    g.userData.meshy = id;
  });
  return g;
}

/** Gắn đồ vào xương bàn tay sao cho ở tư thế đầu nó nằm ở lòng bàn tay theo hướng `rot`; về sau theo tay mà đung đưa. */
function holdIn(g: THREE.Group, inst: Instance, h: Hold): void {
  const hand = inst.bone(XUONG.handR);
  const arm = inst.bone(XUONG.foreR);
  if (!hand) return;
  g.updateMatrixWorld(true);
  const toG = g.matrixWorld.clone().invert();
  const at = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld);
  if (arm) at.lerp(new THREE.Vector3().setFromMatrixPosition(arm.matrixWorld), -PALM);
  at.applyMatrix4(toG);
  const want = new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromEuler(h.rot), new THREE.Vector3().setScalar(h.scale));
  const local = toG.multiply(hand.matrixWorld).invert().multiply(want);
  local.decompose(h.item.position, h.item.quaternion, h.item.scale);
  hand.add(h.item);
}
