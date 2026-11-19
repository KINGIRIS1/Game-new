// Canh vũ khí ánh lên khi tướng mặc đủ bốn món bộ mình (anhVuKhi.ts): sáu tướng dựng với `anh` có hai lớp vỏ sáng
// gắn chung khung xương của tướng, chỉ quanh vũ khí (mọi đỉnh gắn vào xương tay cầm), có đốm lấp lánh; không có `anh`
// thì không thêm gì và thân tướng y như dựng có `anh`; ngã thì tắt. Hình tướng ở túi đồ: đủ bộ mới có vỏ sáng.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng.

import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { HERO_KINDS, type HeroKind } from '../game/battle';
import { BO_CUA, BO_DO, O_DO } from '../game/defs';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

/** Tướng ở bãi chiến (như battleView dựng). */
async function dung(kind: HeroKind, anh: boolean): Promise<THREE.Group> {
  const h = await import('./heroes');
  if (kind === 'giong') return h.makeGiong('trangSi', { anh });
  if (kind === 'sonTinh') return h.makeSonTinh({ anh });
  if (kind === 'anDuong') return h.makeAnDuong({ crossbow: true, anh });
  if (kind === 'caoLo') return h.makeCaoLo({ anh });
  if (kind === 'trungTrac') return h.makeTrungTrac({ anh });
  if (kind === 'baTrieu') return h.makeBaTrieu({ anh });
  if (kind === 'trieuQuangPhuc') return h.makeTrieuQuangPhuc({ anh });
  if (kind === 'maiThucLoan') return h.makeMaiThucLoan({ anh });
  if (kind === 'ngoQuyen') return h.makeNgoQuyen({ anh });
  return h.makeTrungNhi({ anh });
}

const vo = (g: THREE.Object3D) => g.children.filter((c): c is THREE.SkinnedMesh => !!c.userData.anh);
const doms = (g: THREE.Object3D) => {
  const out: THREE.Sprite[] = [];
  g.traverse((o) => (o as THREE.Sprite).isSprite && out.push(o as THREE.Sprite));
  return out;
};

describe('vũ khí ánh lên', () => {
  it('mọi tướng: hai lớp vỏ sáng chung khung xương, chỉ quanh vũ khí, có đốm lấp lánh; ngã thì tắt', async () => {
    for (const kind of HERO_KINDS) {
      const g = await dung(kind, true);
      const body = g.children.find((c): c is THREE.SkinnedMesh => (c as THREE.SkinnedMesh).isSkinnedMesh && !c.userData.anh)!;
      const lop = vo(g);
      expect(lop, kind).toHaveLength(2);
      for (const m of lop) {
        expect(m.skeleton, kind).toBe(body.skeleton);
        const idx = m.geometry.getAttribute('skinIndex');
        expect(idx.count, kind).toBeGreaterThan(30);
        const bones = new Set<string>();
        for (let i = 0; i < idx.count; i++) bones.add(m.skeleton.bones[idx.getX(i)].name);
        // Vũ khí cầm tay phải; Trưng Nhị cầm cung tay trái, tên tay phải.
        expect([...bones].sort(), kind).toEqual(kind === 'trungNhi' ? ['hand', 'handL'] : ['hand']);
      }
      const sao = doms(g);
      expect(sao.length, kind).toBeGreaterThanOrEqual(4);
      for (const s of sao) expect(['hand', 'handL'], kind).toContain(s.parent!.name);
      // Chập chờn theo giờ; ngã thì tắt.
      const pose = g.userData.pose as (a: object) => void;
      pose({ act: 'stand', time: 0.5 });
      const a = (lop[1].material as THREE.MeshBasicMaterial).opacity;
      pose({ act: 'stand', time: 1.5 });
      expect((lop[1].material as THREE.MeshBasicMaterial).opacity, kind).not.toBeCloseTo(a, 3);
      pose({ act: 'dead', fall: 1 });
      expect(lop.every((m) => !m.visible) && sao.every((s) => !s.visible), kind).toBe(true);
    }
  }, 120000);

  it('không có `anh` thì không thêm gì; thân tướng y như dựng có `anh`', async () => {
    const { sceneHash } = await import('./anhCongTrinh');
    for (const kind of HERO_KINDS) {
      const thuong = await dung(kind, false);
      expect(vo(thuong), kind).toHaveLength(0);
      expect(doms(thuong), kind).toHaveLength(0);
      const co = await dung(kind, true);
      for (const m of vo(co)) co.remove(m);
      for (const s of doms(co)) s.removeFromParent();
      expect(sceneHash(co, 1), kind).toBe(sceneHash(thuong, 1));
    }
  }, 120000);

  it('hình tướng ở túi đồ: đủ bốn món bộ mình mới có vỏ sáng', async () => {
    const { hinhTuongModel, duBo } = await import('./hinhTuong');
    const { monId } = await import('./doTuong');
    const coAnh = (g: THREE.Object3D) => {
      let n = 0;
      g.traverse((o) => o.userData.anh && n++);
      return n > 0;
    };
    for (const kind of HERO_KINDS) {
      const bo = BO_DO.find((b) => BO_CUA[b] === kind)!;
      const du = Object.fromEntries(O_DO.map((o) => [o, monId(bo, o)]));
      expect(duBo(kind, du), kind).toBe(true);
      expect(coAnh(hinhTuongModel(kind, du)), kind).toBe(true);
      // Thiếu một món, hay một món bộ khác: không ánh.
      const thieu = { ...du, baoVat: undefined };
      const khac = { ...du, giap: monId(BO_DO[(BO_DO.indexOf(bo) + 1) % BO_DO.length], 'giap') };
      for (const mac of [thieu, khac, {}]) {
        expect(duBo(kind, mac), kind).toBe(false);
        expect(coAnh(hinhTuongModel(kind, mac)), kind).toBe(false);
      }
    }
  }, 120000);
});
