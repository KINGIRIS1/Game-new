// Canh mô hình công trình vừa móng ở kinh đô lớn: mô hình (vẽ theo móng cũ) được phóng theo móng mới và chừa viền cỏ
// (`footScale`), nên dù mái cấp 6–8 có chìa ra, hai công trình cách nhau lối đi một ô vẫn còn khe hở.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

/** Số ô mô hình được tràn ra ngoài móng mỗi phía. Điện có bậc thềm chìa ra sân; bến có cầu tàu chìa xuống sông. */
const ALLOW: Record<string, number> = { dien: 1, ben: Infinity, choiCanh: 0.8, lauNo: 0.8 };

describe('mô hình vừa móng kinh đô lớn', () => {
  it('mọi loại, mọi cấp: không tràn quá nửa ô ra ngoài móng (trừ bậc thềm Điện, cầu tàu bến, mái chòi canh)', async () => {
    const { BUILDINGS } = await import('../game/defs');
    const { buildingModel, footScale } = await import('./buildings');
    for (const type of Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[]) {
      // Lũy, đê, thành, bẫy vẽ liền mạch theo ô ở chỗ khác.
      if (['luy', 'de', 'thanh', 'bayChong'].includes(type)) continue;
      const def = BUILDINGS[type];
      for (let level = 1; level <= def.maxLevel; level++) {
        const g = buildingModel(type, level);
        g.scale.multiplyScalar(footScale(type));
        g.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(g);
        const over = Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z) - def.w / 2;
        expect(over, `${type} cấp ${level}`).toBeLessThanOrEqual(ALLOW[type] ?? 0.5);
      }
    }
  });

  it('công trình nhiều ô phóng theo móng mới và chừa viền cỏ', async () => {
    const { BUILDINGS } = await import('../game/defs');
    const { footScale } = await import('./buildings');
    for (const type of Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[]) {
      const w = BUILDINGS[type].w;
      if (w <= 1) continue;
      const k = footScale(type);
      expect(k, type).toBeGreaterThan(1);
      expect(k, type).toBeLessThan(w / (w - 1));
    }
  });

  it('bến mọi cấp: cầu tàu và thuyền neo nằm gọn trong sông, chừa luồng thuyền qua lại sát bờ bên kia', async () => {
    const { BUILDINGS } = await import('../game/defs');
    const { FAR_BANK, RIVER_START } = await import('../game/map');
    const { benBoats, buildingModel, footScale } = await import('./buildings');
    const def = BUILDINGS.ben;
    for (let level = 1; level <= def.maxLevel; level++) {
      const g = buildingModel('ben', level);
      g.scale.multiplyScalar(footScale('ben'));
      for (const boat of benBoats(level, g.userData.spread as number)) g.add(boat);
      g.updateMatrixWorld(true);
      // Mô hình bến chìa ra sông theo +z, bờ sông ở mép móng.
      const reach = new THREE.Box3().setFromObject(g).max.z - def.d / 2;
      expect(reach, `bến cấp ${level}`).toBeLessThanOrEqual(FAR_BANK - RIVER_START - 1.5);
    }
  });
});
