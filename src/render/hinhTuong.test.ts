// Canh hình tướng mặc đồ (hinhTuong.ts): mọi món mặc được lên tướng nam lẫn nữ, món thay đúng phần của tướng, thú
// cưỡi đứng sau lưng, bảo vật lơ lửng bên vai không đè lên thân. Chỉ dựng mô hình, không vẽ (vẽ cần WebGL).
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng.

import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { HERO_KINDS } from '../game/battle';
import { BO_CUA, BO_DO, O_DO } from '../game/defs';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

const box = (o: THREE.Object3D) => {
  o.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(o);
};

describe('hình tướng mặc đồ', () => {
  it('mọi món mặc được lên tướng nam (Cao Lỗ) và tướng nữ (Trưng Nhị)', async () => {
    const { MON_IDS, MON_VE } = await import('./doTuong');
    const { hinhTuongModel } = await import('./hinhTuong');
    const { kDung } = await import('./heroes');
    for (const hero of ['caoLo', 'trungNhi'] as const) {
      const k = kDung(hero);
      const tran = box(hinhTuongModel(hero, {}));
      for (const id of MON_IDS) {
        const o = id.split('-')[1] as (typeof O_DO)[number];
        const g = hinhTuongModel(hero, { [o]: id });
        const [nguoi, ...them] = g.children;
        const b = box(nguoi);
        // Tướng vẫn đứng ở gốc, cao chừng như khi không mặc gì (món không kéo lệch người).
        expect(Math.abs(b.min.y), id).toBeLessThan(0.15 * k);
        expect(b.max.y, id).toBeGreaterThan(tran.max.y * 0.8);
        const cho = MON_VE[id].cho;
        if (cho === 'thu') {
          // Thú cưỡi đứng sau lưng tướng.
          expect(them).toHaveLength(1);
          expect(box(them[0]).getCenter(new THREE.Vector3()).z, id).toBeLessThan(-0.3 * k);
        } else if (cho === 'bay') {
          // Bảo vật lơ lửng bên vai trái (phía −x), không đè lên thân, cao ngang vai.
          const bv = box(them[them.length - 1]);
          expect(bv.max.x, id).toBeLessThan(-0.2 * k);
          expect(bv.min.y, id).toBeGreaterThan(0.45 * k);
        } else if (cho === 'dat') {
          // Cờ, tre cắm đất phía sau bên trái.
          const d = box(them[0]);
          expect(d.min.y, id).toBeLessThan(0.05);
          expect(d.getCenter(new THREE.Vector3()).x, id).toBeLessThan(0);
        } else expect(them, id).toHaveLength(0);
      }
    }
  }, 120000);

  it('mặc đồ bộ khác thì hình đổi (thay phần riêng của tướng, hay thêm thú, bảo vật, cờ)', async () => {
    const { MON_VE, monId } = await import('./doTuong');
    const { hinhTuongModel } = await import('./hinhTuong');
    const { sceneHash } = await import('./anhCongTrinh');
    for (const hero of HERO_KINDS) {
      const goc = sceneHash(hinhTuongModel(hero, {}), 1);
      // Bộ của tướng kế tiếp (đồ của chính tướng thì trông y như đồ tướng mang ra trận).
      const own = BO_DO.findIndex((b) => BO_CUA[b] === hero);
      const bo = BO_DO[(own + 1) % BO_DO.length];
      for (const o of O_DO) {
        const id = monId(bo, o);
        const g = hinhTuongModel(hero, { [o]: id });
        expect(sceneHash(g, 1), `${hero} mặc ${id}`).not.toBe(goc);
        if (MON_VE[id].cho === 'thu' || MON_VE[id].cho === 'bay' || MON_VE[id].cho === 'dat') expect(g.children.length).toBeGreaterThan(1);
      }
    }
  }, 120000);

  it('khung hình đứng theo cỡ dáng tướng, giống nhau mọi món, ôm vừa mọi món mặc', async () => {
    const { MON_IDS } = await import('./doTuong');
    const { HINH_H, HINH_W, chieuDiem, chieuHinh, hinhTuongModel, khungDung } = await import('./hinhTuong');
    const { kDung } = await import('./heroes');
    const aspect = HINH_W / HINH_H;
    for (const hero of HERO_KINDS) {
      const k = kDung(hero);
      const kh = khungDung(hero);
      // Cùng một tỉ lệ với cỡ dáng: tướng nào cũng cao bằng nhau trong khung.
      expect(kh.half / k).toBeCloseTo(khungDung('caoLo').half / kDung('caoLo'), 6);
      const c = chieuDiem(new THREE.Vector3(kh.x ?? 0, kh.y, 0));
      for (const id of [null, ...MON_IDS]) {
        const mac = id ? { [id.split('-')[1]]: id } : {};
        const b = chieuHinh(hinhTuongModel(hero, mac));
        const ten = `${hero} ${id ?? 'trần'}`;
        expect(b.x0, ten).toBeGreaterThan(c.x - kh.half * aspect);
        expect(b.x1, ten).toBeLessThan(c.x + kh.half * aspect);
        expect(b.y0, ten).toBeGreaterThan(c.y - kh.half);
        expect(b.y1, ten).toBeLessThan(c.y + kh.half);
      }
    }
  }, 300000);
});
