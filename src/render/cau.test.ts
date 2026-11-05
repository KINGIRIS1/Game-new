// Canh cầu qua sông (`makeBridge` ở benKia.ts): hai đầu cầu gác lên mặt bờ, kể cả bờ đắp đất cao, không lơ lửng ở mép
// sông; mặt cầu cho người đi (`bridgeDeckY`) khớp với hình vẽ.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

/** Mọi đỉnh của mô hình theo tọa độ gốc mô hình. */
function vertices(g: THREE.Object3D): THREE.Vector3[] {
  g.updateMatrixWorld(true);
  const out: THREE.Vector3[] = [];
  g.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const pos = o.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
  });
  return out;
}

/** Cầu dài 7 ô sông, đầu bên này ở −z. */
const HALF = 3.5;
/** Mặt bờ: bờ bậc 0, hai bờ đắp cao lệch nhau (đơn vị thế giới, mỗi bậc 0,3). */
const BANKS = [
  { near: 0, far: 0 },
  { near: 0.6, far: 0.3 },
  { near: 0, far: 1.2 },
];

describe('cầu qua sông gác lên bờ', () => {
  it('mọi cấp, mọi độ cao bờ: mỗi đầu cầu có phần nằm sát mặt bờ, không phần nào trên bờ lơ lửng', async () => {
    const { makeBridge } = await import('./benKia');
    for (let level = 1; level <= 3; level++) {
      for (const banks of BANKS) {
        const pts = vertices(makeBridge(level, banks));
        for (const [s, bank] of [
          [-1, banks.near],
          [1, banks.far],
        ] as const) {
          const name = `cấp ${level}, bờ ${banks.near}/${banks.far}, đầu ${s < 0 ? 'bên này' : 'bên kia'}`;
          // Phần nằm trên đất bờ (quá mép sông): ván gác, xà, cọc. Đáy thấp nhất chạm mặt bờ (cọc cắm xuống đất).
          const onBank = pts.filter((p) => s * p.z > HALF + 0.05);
          expect(onBank.length, name).toBeGreaterThan(0);
          const low = Math.min(...onBank.map((p) => p.y));
          expect(low, name).toBeLessThanOrEqual(bank + 0.01);
          expect(low, name).toBeGreaterThan(bank - 0.15);
          // Gác vào bờ đủ sâu, không dừng đúng mép sông.
          expect(Math.max(...onBank.map((p) => s * p.z)), name).toBeGreaterThan(HALF + 0.25);
        }
      }
    }
  });

  it('mặt cầu cho người đi khớp hình vẽ: trên bè, trên ván gác bờ, trên mặt cầu gỗ', async () => {
    const { bridgeDeckY } = await import('./benKia');
    const banks = { near: 0.6, far: 0.3 };
    // Cầu phao: giữa sông đi trên bè (mặt nước −0,28), hai đầu lên tới mặt bờ.
    expect(bridgeDeckY(1, 0, banks)).toBeCloseTo(-0.15, 2);
    expect(bridgeDeckY(1, -HALF - 0.1, banks)).toBeCloseTo(0.65, 2);
    expect(bridgeDeckY(1, HALF + 0.1, banks)).toBeCloseTo(0.35, 2);
    // Cầu gỗ: hai đầu ngang mặt bờ, giữa vồng lên cao hơn cả hai bờ.
    for (const level of [2, 3]) {
      expect(bridgeDeckY(level, -HALF + 0.01, banks)).toBeCloseTo(0.67, 1);
      expect(bridgeDeckY(level, HALF - 0.01, banks)).toBeCloseTo(0.37, 1);
      expect(bridgeDeckY(level, 0, banks)).toBeGreaterThan(0.6);
    }
    // Đi liền một mạch từ bờ này sang bờ kia, không bậc hụt.
    for (let level = 1; level <= 3; level++) {
      for (let z = -HALF - 0.6; z < HALF + 0.6; z += 0.05) {
        expect(Math.abs(bridgeDeckY(level, z + 0.05, banks) - bridgeDeckY(level, z, banks)), `cấp ${level} ở ${z.toFixed(2)}`).toBeLessThan(0.1);
      }
    }
  });
});
