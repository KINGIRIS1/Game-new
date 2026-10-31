// Ánh sáng dùng chung cho cảnh kinh đô và bãi chiến.

import * as THREE from 'three';

/**
 * Ánh sáng bầu trời dịu cộng nắng mạnh, để tô màu hoạt hình tách rõ 3 dải sáng.
 * Bóng đổ phủ một vùng vuông cạnh `2 * extent` quanh gốc tọa độ.
 */
export function addSunLights(scene: THREE.Scene, extent: number, mapSize: number): void {
  scene.add(new THREE.HemisphereLight(0xfff3dc, 0x6d6a45, 0.9));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
  sun.position.set(-10, 24, 14);
  sun.castShadow = true;
  const cam = sun.shadow.camera;
  cam.left = -extent;
  cam.right = extent;
  cam.top = extent;
  cam.bottom = -extent;
  cam.near = 1;
  cam.far = 70;
  sun.shadow.mapSize.set(mapSize, mapSize);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
}
