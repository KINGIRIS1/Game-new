// Canh mô hình công trình vừa móng ở kinh đô lớn (`lotModel`). Công trình vẽ trên móng mới (`congTrinh/`) dựng thẳng
// trên móng; công trình còn vẽ theo móng cũ thì phóng theo móng mới và chừa viền cỏ (`footScale`). Dù mái cấp 6–8
// có chìa ra, hai công trình cách nhau lối đi một ô vẫn còn khe hở.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

/** Số ô mô hình được tràn ra ngoài móng mỗi phía. Bến có cầu tàu chìa xuống sông; chòi canh, lầu nỏ có mái chìa; cây đa cổ thụ tán xòe rộng. */
const ALLOW: Record<string, number> = { ben: Infinity, choiCanh: 0.8, lauNo: 0.8, cayDa: 0.95 };

describe('mô hình vừa móng kinh đô lớn', () => {
  it('mọi loại, mọi cấp: không tràn quá nửa ô ra ngoài móng (trừ cầu tàu bến, mái chòi canh)', async () => {
    const { BUILDINGS } = await import('../game/defs');
    const { lotModel } = await import('./congTrinh/index');
    for (const type of Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[]) {
      // Lũy, đê, thành, bẫy vẽ liền mạch theo ô ở chỗ khác.
      if (['luy', 'de', 'thanh', 'bayChong'].includes(type)) continue;
      const def = BUILDINGS[type];
      for (let level = 1; level <= def.maxLevel; level++) {
        const g = lotModel(type, level);
        g.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(g);
        const over = Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z) - def.w / 2;
        expect(over, `${type} cấp ${level}`).toBeLessThanOrEqual(ALLOW[type] ?? 0.5);
      }
    }
  }, 30000);

  it('công trình vẽ trên móng mới: bản vẽ đúng cỡ móng, mô hình không phóng', async () => {
    const { BUILDINGS } = await import('../game/defs');
    const { CONG_TRINH, lotModel } = await import('./congTrinh/index');
    for (const [type, ct] of Object.entries(CONG_TRINH) as [keyof typeof BUILDINGS, NonNullable<(typeof CONG_TRINH)[keyof typeof BUILDINGS]>][]) {
      expect(ct.tiles, type).toBe(BUILDINGS[type].w);
      expect(ct.tiles, type).toBe(BUILDINGS[type].d);
      expect(lotModel(type, 1).scale.x, type).toBe(1);
    }
  });

  it('công trình nhiều ô còn vẽ theo móng cũ: phóng theo móng mới và chừa viền cỏ', async () => {
    const { BUILDINGS } = await import('../game/defs');
    const { footScale } = await import('./buildings');
    const { CONG_TRINH } = await import('./congTrinh/index');
    for (const type of Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[]) {
      const w = BUILDINGS[type].w;
      if (w <= 1 || CONG_TRINH[type]) continue;
      const k = footScale(type);
      expect(k, type).toBeGreaterThan(1);
      expect(k, type).toBeLessThan(w / (w - 1));
    }
  });

  it('bến mọi cấp: cầu tàu và thuyền neo nằm gọn trong sông, chừa luồng thuyền qua lại sát bờ bên kia', async () => {
    const { BUILDINGS } = await import('../game/defs');
    const { FAR_BANK, RIVER_START } = await import('../game/map');
    const { makeBoat, makeTradeBoat } = await import('./models');
    const { CONG_TRINH, lotModel } = await import('./congTrinh/index');
    const def = BUILDINGS.ben;
    for (let level = 1; level <= def.maxLevel; level++) {
      const g = lotModel('ben', level);
      for (const d of CONG_TRINH.ben!.docks!(level)) {
        const boat = d.kind === 'trader' ? makeTradeBoat() : makeBoat();
        boat.position.set(d.x, 0, d.z);
        boat.rotation.y = d.ry;
        if (d.scale) boat.scale.setScalar(d.scale);
        g.add(boat);
      }
      g.updateMatrixWorld(true);
      // Mô hình bến chìa ra sông theo +z, bờ sông ở mép móng.
      const reach = new THREE.Box3().setFromObject(g).max.z - def.d / 2;
      expect(reach, `bến cấp ${level}`).toBeLessThanOrEqual(FAR_BANK - RIVER_START - 1.5);
    }
  });
});
