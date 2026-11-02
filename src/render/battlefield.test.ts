// Canh bãi chiến Mộ Dạ (màn 32): đường ngựa của vua là dải cát phẳng, trống, luôn trên mặt nước; góc xa bên phải,
// chỗ Rùa Vàng nổi lên, là biển. Cửa sông (màn 28): thuyền giặc nổi trên mặt nước.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx }) });

describe('bãi chiến chương 4', () => {
  it('Mộ Dạ: đường ngựa trên cát khô, phẳng, không vướng cây đá lông ngỗng; chỗ Rùa Vàng là biển', async () => {
    const { FIELD } = await import('../game/defs');
    const { Battlefield, MO_DA } = await import('./battlefield');
    const bf = new Battlefield();
    bf.setTerrain('moDa');
    const strip = { x0: FIELD.w + 0.8, x1: FIELD.w + 3, z0: -4, z1: FIELD.d + 2 };
    for (let x = strip.x0; x <= strip.x1 + 1e-6; x += 0.2) {
      for (let z = strip.z0; z <= strip.z1 + 1e-6; z += 0.25) {
        const h = bf.groundAt(x, z);
        expect(h, `cát ở (${x.toFixed(1)}, ${z.toFixed(1)})`).toBeGreaterThan(MO_DA.waterY + 0.15);
        expect(Math.abs(h), `phẳng ở (${x.toFixed(1)}, ${z.toFixed(1)})`).toBeLessThan(0.2);
      }
    }
    expect(MO_DA.roadX).toBeGreaterThanOrEqual(strip.x0);
    expect(MO_DA.roadX).toBeLessThanOrEqual(strip.x1);
    // Góc xa bên phải là biển; Rùa Vàng nổi lên ở chỗ nước sâu, cách bờ.
    expect(bf.groundAt(FIELD.w + 4, -4)).toBeLessThan(MO_DA.waterY);
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      expect(bf.groundAt(MO_DA.turtle.x + dx, MO_DA.turtle.z + dz)).toBeLessThan(MO_DA.waterY - 0.3);
    }

    // Không vật gì (cây, đá, lông ngỗng, núi) đứng trên dải cát: xét từng bản sao và từng khối không phải mặt đất, mặt nước.
    const inStrip = (p: THREE.Vector3) => p.x > strip.x0 && p.x < strip.x1 && p.z > strip.z0 && p.z < strip.z1;
    const decor = bf.scene.getObjectByName('decor')!;
    bf.scene.updateMatrixWorld(true);
    const toField = new THREE.Matrix4().copy(decor.matrixWorld).invert();
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    let copies = 0;
    decor.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) {
        copies += o.count;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m);
          p.setFromMatrixPosition(m.premultiply(o.matrixWorld).premultiply(toField));
          expect(inStrip(p), `bản sao ở (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`).toBe(false);
        }
      } else if (o instanceof THREE.Mesh && !o.userData.ground) {
        const box = new THREE.Box3().setFromObject(o).applyMatrix4(toField);
        const hit = box.max.x > strip.x0 && box.min.x < strip.x1 && box.max.z > strip.z0 && box.min.z < strip.z1;
        expect(hit, `khối ${o.name || o.type} từ (${box.min.x.toFixed(1)}, ${box.min.z.toFixed(1)}) tới (${box.max.x.toFixed(1)}, ${box.max.z.toFixed(1)})`).toBe(false);
      }
    });
    // Có cây và lông ngỗng thật (mỗi bản sao tính cả viền mực), chứ không phải cảnh trống.
    expect(copies).toBeGreaterThan(200);
  });

  it('cửa sông: thuyền giặc neo trên mặt nước, không trên bãi chiến', async () => {
    const { FIELD } = await import('../game/defs');
    const { Battlefield, MO_DA } = await import('./battlefield');
    const bf = new Battlefield();
    bf.setTerrain('cuaSong');
    const decor = bf.scene.getObjectByName('decor')!;
    const boats = decor.children.filter((o) => o.userData.boat);
    expect(boats.length).toBeGreaterThanOrEqual(5);
    for (const b of boats) {
      expect(b.position.z, 'thuyền sau lưng giặc').toBeLessThan(-1.5);
      // Thân thuyền (dài chừng 1,6 ô theo trục thuyền) nằm trên nước, không mắc cạn quá nửa.
      expect(bf.groundAt(b.position.x, b.position.z), `nước dưới thuyền ở x = ${b.position.x.toFixed(1)}`).toBeLessThan(MO_DA.waterY);
      expect(b.position.x).toBeGreaterThan(-FIELD.w * 3);
    }
  });
});
