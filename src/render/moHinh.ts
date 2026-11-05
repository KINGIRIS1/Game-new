// Nhân vật làm bằng Meshy: tệp GLB có xương và động tác ở src/assets/mo-hinh/, đã thu gọn bằng scripts/mo-hinh.mjs.
// Nạp lúc chạy rồi tô như nhân vật dựng bằng code: chất liệu hoạt hình 3 dải sáng (`ramp`) và viền mực chạy theo
// xương. Lúc chưa nạp xong, hay nạp hỏng, thì hiện bản dựng bằng code; nạp xong thì đổi sang mô hình Meshy.

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
  /** Chiều cao trong game (đơn vị ô, tính cả mũ), bằng bản dựng bằng code để thay vào không lệch cỡ. */
  height: number;
  /** Đoạn động tác đứng, chạy lặp. */
  idle: string;
  /** Xương bàn tay phải và đốt đầu ngón giữa: đồ cầm tay đặt ở giữa hai xương này. */
  hand: [string, string];
}

export const MO_HINH = {
  giong: { url: giongUrl, height: 1.69, idle: 'dung', hand: ['RightHand', 'RightHandMiddle1'] },
} satisfies Record<string, MoHinhDef>;
export type MoHinhId = keyof typeof MO_HINH;

/** Nét viền mực như nhân vật dựng bằng code (`inkThin`), đơn vị ô. */
const INK = 0.016;

interface Loaded {
  gltf: GLTF;
  /** Đoạn động tác đứng. */
  idle: THREE.AnimationClip;
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
  const idle = THREE.AnimationClip.findByName(gltf.animations, def.idle);
  if (!meshes.length || !idle) return null;
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
  return { gltf, idle, scale, material, ink: inkMaterial(INK / scale), outline };
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
  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(l.idle).play();
  // Mỗi khung World gọi pose với đồng hồ chơi (mỗi người lệch một nhịp): đặt thẳng giờ của đoạn động tác.
  const pose: Poser = (a) => {
    mixer.setTime(a.time ?? 0);
  };
  pose({ act: 'stand' });
  const bone = (name: string) => model.getObjectByName(name) as THREE.Bone | undefined;
  return { model, pose, bone };
}

/** Đặt đồ cầm tay vào tay phải mô hình. */
export interface Hold {
  /** Đồ cầm, gốc ở chỗ tay nắm, dựng theo trục +y. */
  item: THREE.Object3D;
  /** Hướng của đồ so với nhân vật, lúc tư thế đầu đoạn động tác đứng. */
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
    const def: MoHinhDef = MO_HINH[id];
    const inst = instance(l);
    g.remove(fallback);
    disposeModel(fallback);
    g.add(inst.model);
    pose = inst.pose;
    if (opts.hold) holdIn(g, inst, def, opts.hold);
    if (opts.dress) {
      // Chỗ một xương trong khung của nhóm, ở tư thế đầu đoạn động tác đứng.
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

/** Gắn đồ vào xương bàn tay sao cho ở tư thế đầu nó nằm giữa lòng bàn tay theo hướng `rot`; về sau theo tay mà đung đưa. */
function holdIn(g: THREE.Group, inst: Instance, def: MoHinhDef, h: Hold): void {
  const hand = inst.bone(def.hand[0]);
  const finger = inst.bone(def.hand[1]);
  if (!hand) return;
  g.updateMatrixWorld(true);
  const toG = g.matrixWorld.clone().invert();
  const at = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld);
  if (finger) at.lerp(new THREE.Vector3().setFromMatrixPosition(finger.matrixWorld), 0.5);
  at.applyMatrix4(toG);
  const want = new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromEuler(h.rot), new THREE.Vector3().setScalar(h.scale));
  const local = toG.multiply(hand.matrixWorld).invert().multiply(want);
  local.decompose(h.item.position, h.item.quaternion, h.item.scale);
  hand.add(h.item);
}
