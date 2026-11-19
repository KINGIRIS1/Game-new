// Nhân vật làm bằng Meshy: tệp GLB đã gắn xương ở src/assets/mo-hinh/, đã thu gọn bằng scripts/mo-hinh.mjs.
// Nạp lúc chạy rồi tô như nhân vật dựng bằng code: chất liệu hoạt hình 3 dải sáng (`ramp`) và viền mực chạy theo
// xương. Tư thế không dùng đoạn động tác của Meshy mà chép từ bộ xương người dựng bằng code (`ganMoHinh`): hàm tư thế
// cũ của tướng (đi, đánh, kỹ năng, thắng, ngã, cưỡi ngựa) vẫn chạy trên bộ xương code, rồi góc từng xương được chép
// sang xương Meshy. Đồ cầm tay, thú cưỡi vẫn dựng bằng code. Lúc chưa nạp xong, hay nạp hỏng, thì hiện bản dựng bằng code.

import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneRig } from 'three/addons/utils/SkeletonUtils.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import giongUrl from '../assets/mo-hinh/giong.glb?url';
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
  hips: 'Hips',
  spine0: 'Spine02',
  spine1: 'Spine01',
  spine: 'Spine',
  head: 'Head',
  armL: 'LeftArm',
  foreL: 'LeftForeArm',
  handL: 'LeftHand',
  armR: 'RightArm',
  foreR: 'RightForeArm',
  handR: 'RightHand',
  legL: 'LeftUpLeg',
  kneeL: 'LeftLeg',
  footL: 'LeftFoot',
  legR: 'RightUpLeg',
  kneeR: 'RightLeg',
  footR: 'RightFoot',
} as const;

/** Nét viền mực như nhân vật dựng bằng code (`inkThin`), đơn vị ô. */
const INK = 0.016;
/** Lòng bàn tay cách cổ tay bao nhiêu phần cẳng tay, theo hướng cẳng tay. */
const PALM = 0.3;

export interface Loaded {
  gltf: GLTF;
  /** Hệ số phóng từ đơn vị tệp ra đơn vị ô. */
  scale: number;
  material: THREE.MeshToonMaterial;
  ink: THREE.Material;
  /** Hình viền mực của từng hình trong tệp: gộp đỉnh trùng, pháp tuyến mượt cho viền liền không nứt. */
  outline: Map<THREE.BufferGeometry, THREE.BufferGeometry>;
}

const cache = new Map<MoHinhId, Promise<Loaded | null>>();
/** Mô hình đã nạp xong (null: nạp hỏng), để dựng ngay khỏi qua bản dựng bằng code. */
const done = new Map<MoHinhId, Loaded | null>();

/** Có dùng mô hình Meshy không: chỉ ở luồng chính có trang (worker nặn sẵn và test dựng bản code). */
export const coMoHinh = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined' && !!document.body;

/** Mô hình đã nạp: `undefined` là chưa xong, `null` là hỏng. */
export function moHinhSan(id: MoHinhId): Loaded | null | undefined {
  return done.get(id);
}

export function napMoHinh(id: MoHinhId): Promise<Loaded | null> {
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
      })
      .then((l) => {
        done.set(id, l);
        return l;
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
  // Đo chiều cao theo hình đã qua xương ở tư thế gốc (tệp Meshy có nút Armature thu nhỏ, nên không đo thẳng hình).
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltf.scene, true);
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


/** Xương người dựng bằng code (`HUMAN` ở `body.ts`) mà mô hình Meshy chép góc theo. */
export interface NguoiCode {
  hips: THREE.Bone;
  chest: THREE.Bone;
  head: THREE.Bone;
  armL: THREE.Bone;
  armR: THREE.Bone;
  legL: THREE.Bone;
  legR: THREE.Bone;
  /** Đồ cầm tay phải (con của ngực): dời tới lòng bàn tay mô hình sau mỗi lần đặt tư thế. */
  hand: THREE.Bone;
  handL: THREE.Bone;
}

const I = new THREE.Quaternion();
const DOWN = new THREE.Vector3(0, -1, 0);

/**
 * Gắn mô hình đã nạp `l` vào thân người dựng bằng code (mô hình là con của xương hông nên theo hông nhún, xoay, ngã),
 * trả hàm chép tư thế: gọi sau mỗi lần hàm tư thế cũ đặt góc các xương code.
 * - Thân, đầu, tay, chân Meshy xoay đúng góc xương code tương ứng so với hông (xương code ở tư thế gốc không xoay:
 *   tay buông thẳng, chân thẳng; nên tay Meshy chữ T được hạ xuống trước rồi mới xoay theo).
 * - Cánh tay, cẳng tay xoay cùng một góc (tay thẳng như thân người code); chân cũng vậy, khỏi lộ khớp gối lệch của
 *   bộ xương tự gắn.
 * - Tay và chân bên +x của code (code gọi là phải) ứng với tay, chân bên +x của mô hình (Meshy gọi là trái).
 * - `ngoi`: cưỡi thú, hông mô hình đặt đúng chỗ hông code; không thì chân mô hình chạm đất như chân code.
 */
export function ganMoHinh(l: Loaded, b: NguoiCode, ngoi: boolean): () => void {
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
  const hipsRest = b.hips.userData.rest as THREE.Vector3;
  // Gốc mô hình trong khung xương hông code.
  if (ngoi) model.position.copy(rig.at(XUONG.hips).multiplyScalar(-l.scale));
  else model.position.set(0, -hipsRest.y, 0);
  b.hips.add(model);

  // Hạ tay chữ T xuống buông thẳng, chân về thẳng đứng: góc gốc để chồng góc xương code lên.
  const ha = (from: string, to: string): THREE.Quaternion =>
    new THREE.Quaternion().setFromUnitVectors(rig.at(to).sub(rig.at(from)).normalize(), DOWN);
  const armP = ha(XUONG.armL, XUONG.handL);
  const armM = ha(XUONG.armR, XUONG.handR);
  const legP = ha(XUONG.legL, XUONG.footL);
  const legM = ha(XUONG.legR, XUONG.footR);
  const forePalm = rig.at(XUONG.handL).sub(rig.at(XUONG.foreL)).multiplyScalar(PALM);
  const forePalmM = rig.at(XUONG.handR).sub(rig.at(XUONG.foreR)).multiplyScalar(PALM);
  const handP = rig.bone(XUONG.handL)!;
  const handM = rig.bone(XUONG.handR)!;

  const q = new THREE.Quaternion();
  const chest = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const palm = (hand: THREE.Bone, off: THREE.Vector3, arm: THREE.Quaternion, grip: THREE.Bone) => {
    // Lòng bàn tay: quá cổ tay một đoạn theo hướng cẳng tay (đã xoay), đổi ra khung ngực code.
    model.worldToLocal(hand.getWorldPosition(v));
    v.add(off.clone().applyQuaternion(arm));
    grip.position.copy(b.chest.worldToLocal(model.localToWorld(v)));
  };
  return () => {
    chest.copy(b.chest.quaternion);
    rig.set(XUONG.spine0, new THREE.Quaternion().slerpQuaternions(I, chest, 0.34));
    rig.set(XUONG.spine1, new THREE.Quaternion().slerpQuaternions(I, chest, 0.67));
    rig.set(XUONG.spine, chest.clone());
    rig.set(XUONG.head, chest.clone().multiply(b.head.quaternion));
    const aP = chest.clone().multiply(b.armR.quaternion).multiply(armP);
    const aM = chest.clone().multiply(b.armL.quaternion).multiply(armM);
    rig.set(XUONG.armL, aP);
    rig.set(XUONG.foreL, aP);
    rig.set(XUONG.armR, aM);
    rig.set(XUONG.foreR, aM);
    q.copy(b.legR.quaternion).multiply(legP);
    rig.set(XUONG.legL, q.clone());
    rig.set(XUONG.kneeL, q.clone());
    q.copy(b.legL.quaternion).multiply(legM);
    rig.set(XUONG.legR, q.clone());
    rig.set(XUONG.kneeR, q.clone());
    rig.apply();
    b.hips.updateMatrixWorld(true);
    palm(handP, forePalm, aP, b.hand);
    palm(handM, forePalmM, aM, b.handL);
  };
}
