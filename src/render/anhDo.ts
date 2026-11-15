// Ảnh món trang bị cho túi đồ, vẽ sẵn từ mô hình món (doTuong.ts) như ảnh công trình (anhCongTrinh.ts): ảnh vuông nền
// trong, món nằm giữa khung, nhìn hơi chéo từ trên. Phẩm không vẽ vào ảnh: khung, nền, ánh theo phẩm do giao diện vẽ.
// `node scripts/anh-do.mjs` vẽ ra `public/anh-do/<bộ>-<ô>.webp` và ghi dấu vân tay mô hình (`monHash`) vào `anhDoDau.ts`;
// `anhDo.test.ts` so dấu với mô hình hiện tại: đổi dáng món mà chưa vẽ lại ảnh thì test hỏng.

import * as THREE from 'three';
import { sceneHash } from './anhCongTrinh';
import { monModel, type MonId } from './doTuong';
import { addSunLights } from './lights';

/** Khổ ảnh: ô món trong túi chừng 56 điểm CSS, ảnh lớn ở thẻ chi tiết chừng 110, nhân mật độ điểm ảnh điện thoại. */
export const MON_PX = 256;

/** Tăng số này khi đổi cách dựng cảnh ảnh (góc nhìn, khung) để test đòi vẽ lại mọi ảnh. */
const MON_VERSION = 1;

const AZ = 0.42;
const EL = THREE.MathUtils.degToRad(24);

/** Cảnh ảnh của món: mô hình đứng riêng, xoay theo góc chụp của món. */
export function monScene(id: MonId): THREE.Group {
  return monModel(id);
}

/** Dấu vân tay mô hình của ảnh món. */
export function monHash(id: MonId): string {
  return sceneHash(monScene(id), MON_VERSION);
}

/** Vẽ ảnh món `id` lên canvas của `renderer` (vuông `MON_PX`, nền trong). Chỉ `scripts/anh-do.mjs` gọi. */
export function renderMon(renderer: THREE.WebGLRenderer, id: MonId): void {
  const scene = new THREE.Scene();
  const root = monScene(id);
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
  });
  scene.add(root);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const { sun } = addSunLights(scene, Math.max(size.x, size.y, size.z) * 0.8 + 1, 2048);
  // Nắng chiếu từ trước bên trái, cao: mặt trước món sáng, bóng đổ ra sau.
  sun.position.copy(center).add(new THREE.Vector3(-6, 14, 16));
  sun.target.position.copy(center);

  const dir = new THREE.Vector3(Math.cos(EL) * Math.sin(AZ), Math.sin(EL), Math.cos(EL) * Math.cos(AZ));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  cam.position.copy(center).addScaledVector(dir, 100);
  cam.lookAt(center);
  cam.updateMatrixWorld(true);
  // Khung ôm sát mọi đỉnh (không ôm khối bao: món nằm chéo thì khối bao thừa nhiều góc).
  const inv = cam.matrixWorldInverse;
  const p = new THREE.Vector3();
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    const pos = m.geometry?.getAttribute('position');
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y);
      y1 = Math.max(y1, p.y);
    }
  });
  const half = (Math.max(x1 - x0, y1 - y0) / 2) * 1.1;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  cam.left = cx - half;
  cam.right = cx + half;
  cam.top = cy + half;
  cam.bottom = cy - half;
  cam.updateProjectionMatrix();

  renderer.setClearColor(0x000000, 0);
  renderer.setSize(MON_PX, MON_PX, false);
  renderer.render(scene, cam);
}
