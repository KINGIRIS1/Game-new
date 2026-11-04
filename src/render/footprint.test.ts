// Canh mô hình công trình vừa móng ở kinh đô lớn (`lotModel`). Công trình vẽ trên móng mới (`congTrinh/`) dựng thẳng
// trên móng; công trình còn vẽ theo móng cũ thì phóng theo móng mới và chừa viền cỏ (`footScale`). Dù mái cấp 6–8
// có chìa ra, hai công trình cách nhau lối đi một ô vẫn còn khe hở.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

/** Số ô mô hình được tràn ra ngoài móng mỗi phía. Bến có cầu tàu chìa xuống sông; chòi canh, lầu nỏ có mái chìa; cây đa cổ thụ tán xòe rộng. */
const ALLOW: Record<string, number> = { ben: Infinity, langChai: Infinity, benKhoi: Infinity, choiCanh: 0.8, lauNo: 0.8, cayDa: 0.95 };

describe('mô hình vừa móng kinh đô lớn', () => {
  it('mọi loại, mọi cấp: không tràn quá nửa ô ra ngoài móng (trừ cầu tàu bến, vó và đáy làng chài, mái chòi canh)', async () => {
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
        const over = Math.max(Math.max(-box.min.x, box.max.x) - def.w / 2, Math.max(-box.min.z, box.max.z) - def.d / 2);
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

  it('vẽ trong khung riêng (khối nhà chính Điện phóng 1,5 lần): mái cấp 10 có chim Lạc trả lại khung, phần vẽ sau vẫn trong khung', async () => {
    const { boatRoof, coneRoof, roofFor } = await import('./buildings');
    const { ToonModel } = await import('./toon');
    const m = new ToonModel();
    const frame = new THREE.Matrix4().makeScale(1.5, 1.5, 1.5);
    m.plain.frame = m.band.frame = frame;
    boatRoof(m, roofFor(10), { length: 2, width: 1, lift: 0.5, drop: 0.3, thickness: 0.08 }, 0, 1, 0);
    coneRoof(m, roofFor(10), 0.5, 0.4, 0, 1, 0);
    expect(m.plain.frame).toBe(frame);
    expect(m.band.frame).toBe(frame);
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

  it('bến, làng chài, bến thuyền khơi mọi cấp: cầu tàu, vó, đáy và thuyền nằm gọn trong sông, chừa luồng thuyền qua lại sát bờ bên kia', async () => {
    const { BUILDINGS } = await import('../game/defs');
    const { RIVER_END, RIVER_START } = await import('../game/map');
    const { SEA_BOAT_SCALE, makeBoat, makeSailBoat, makeThuyenKhoi, makeTradeBoat } = await import('./models');
    const { CONG_TRINH, lotModel } = await import('./congTrinh/index');
    for (const type of ['ben', 'langChai', 'benKhoi'] as const) {
      const def = BUILDINGS[type];
      for (let level = 1; level <= def.maxLevel; level++) {
        const g = lotModel(type, level);
        if (type === 'benKhoi') {
          // Thuyền khơi neo dọc cầu tàu, cách mép móng một ô (`benDock`).
          const boat = makeThuyenKhoi(level);
          boat.position.set(0, 0, def.d / 2 + 1);
          boat.scale.setScalar(SEA_BOAT_SCALE);
          g.add(boat);
        }
        for (const d of CONG_TRINH[type]!.docks?.(level) ?? []) {
          const boat = d.kind === 'trader' ? makeTradeBoat(d.big) : d.big ? makeSailBoat() : makeBoat();
          // Thuyền đánh cá bơi vòng quanh chỗ neo: xa bờ nhất khi ở đỉnh vòng, mũi xuôi theo bờ.
          const fishing = d.kind === 'fishing';
          boat.position.set(d.x, 0, d.z + (fishing ? 0.22 : 0));
          boat.rotation.y = fishing ? 0 : d.ry;
          if (d.scale) boat.scale.setScalar(d.scale);
          g.add(boat);
        }
        g.updateMatrixWorld(true);
        // Mô hình chìa ra sông theo +z, bờ sông ở mép móng.
        const reach = new THREE.Box3().setFromObject(g).max.z - def.d / 2;
        expect(reach, `${type} cấp ${level}`).toBeLessThanOrEqual(RIVER_END - RIVER_START - 1.5);
      }
    }
  });
});

describe('cây dại, tảng đá mọc trên ô trống', () => {
  it('mọi dáng nằm gọn trong một ô (kể cả lệch tâm 0,06 ô), cao vừa phải', async () => {
    const { CAY_DA_KINDS, CAY_DA_VARIANTS } = await import('../game/defs');
    const { makeCayDa } = await import('./cayDa');
    for (const kind of CAY_DA_KINDS) {
      for (let v = 0; v < CAY_DA_VARIANTS; v++) {
        const g = makeCayDa(kind, v);
        g.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(g);
        const over = Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z) + 0.06;
        expect(over, `${kind} dáng ${v}`).toBeLessThanOrEqual(0.62);
        expect(box.max.y, `${kind} dáng ${v}`).toBeLessThan(kind === 'cay' ? 1.8 : 0.8);
        // Đá lún chân xuống đất một chút cho tự nhiên.
        expect(box.min.y, `${kind} dáng ${v}`).toBeGreaterThan(-0.2);
      }
    }
  });
});
