// Ảnh động thần thú cho giao diện (bảng Thần thú, thẻ thú trên map dã ngoại, thanh máu): vẽ sẵn từ chính mô hình có
// xương của thú (`makeThanThu` ở `thanThu.ts`, dáng lớn), mỗi thú một dải `THU_KHUNG` khung vuông xếp ngang, giao diện
// lật khung bằng CSS (`steps`) nên không tốn gì lúc chơi. Thú đi đất, chim Lạc thì một vòng bước chân hay vỗ cánh
// (khung cuối nối liền khung đầu); rồng uốn mình theo nhiều nhịp lệch nhau nên đi tới rồi lùi lại (`lai`).
// `node scripts/anh-thu.mjs` vẽ ra `public/anh-thu/<thú>.webp` và ghi dấu vân tay mô hình (`thuHash`) vào
// `anhThuDau.ts`; `anhThu.test.ts` so dấu với mô hình hiện tại: đổi dáng thú mà chưa vẽ lại thì test hỏng.

import * as THREE from 'three';
import type { ThanThuId } from '../game/defs';
import { sceneHash } from './anhCongTrinh';
import { addSunLights } from './lights';
import type { Act } from './rig';
import { makeThanThu } from './thanThu';

/** Cạnh mỗi khung: ảnh lớn ở bảng chừng 96 điểm CSS, nhân mật độ điểm ảnh điện thoại. */
export const THU_PX = 192;
/** Số khung mỗi dải. */
export const THU_KHUNG = 16;

/** Tăng số này khi đổi cách dựng ảnh (góc nhìn, khung, nhịp) để test đòi vẽ lại mọi ảnh. */
const THU_VERSION = 1;

/** Cách động của mỗi thú: tư thế, quãng nhịp (pha bước hay giây), đi tới rồi lùi (`lai`), thời gian một vòng ở giao diện. */
interface CachDong {
  act: 'walk' | 'stand';
  quang: number;
  lai?: boolean;
  /** Giây một vòng dải khung (giao diện dùng làm `animation-duration`). */
  giay: number;
  /** Góc nhìn quanh thú (0 là chính diện, đầu hướng +z) và góc nhìn xuống (độ); thú dài nhìn chếch trước cho gọn khung. */
  az?: number;
  el?: number;
}

export const THU_DONG: Record<ThanThuId, CachDong> = {
  // Chim Lạc vỗ cánh: pha nhân 0,9 trong `poseLac`.
  thuLac: { act: 'walk', quang: (2 * Math.PI) / 0.9, giay: 1.1 },
  thuNgua: { act: 'walk', quang: 2 * Math.PI, giay: 0.9 },
  thuGa: { act: 'walk', quang: (2 * Math.PI) / 0.9, giay: 0.9 },
  thuRua: { act: 'walk', quang: (2 * Math.PI) / 0.7, giay: 1.8, az: 0.6, el: 30 },
  // Rồng lượn: nửa nhịp uốn chính (t × 1,8 trong `poseRong`), đi tới rồi lùi.
  thuRong: { act: 'stand', quang: Math.PI / 1.8, lai: true, giay: 2.6, az: 0.6, el: 40 },
};

/** Tư thế ở khung `i`. */
export function thuAct(kind: ThanThuId, i: number): Act {
  const d = THU_DONG[kind];
  // Đi tới rồi lùi thì chạy theo hình sin cho mềm ở hai đầu.
  const u = d.lai ? (1 - Math.cos((2 * Math.PI * i) / THU_KHUNG)) / 2 : i / THU_KHUNG;
  const p = u * d.quang;
  return d.act === 'walk' ? { act: 'walk', phase: p, time: 0, stride: 0.5 } : { act: 'stand', time: p };
}

/** Mô hình thú dáng lớn (dáng thần chỉ thêm hào quang, giao diện tự tô quầng sáng). */
export function thuScene(kind: ThanThuId): THREE.Group {
  return makeThanThu(kind, 1);
}

/** Dấu vân tay mô hình của ảnh thú. */
export function thuHash(kind: ThanThuId): string {
  // Cách động, góc nhìn cũng vào dấu: đổi `THU_DONG` thì test đòi vẽ lại.
  let h = THU_VERSION;
  for (const c of JSON.stringify(THU_DONG[kind])) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return sceneHash(thuScene(kind), h);
}


/** Cảnh vẽ ảnh thú: `frame(i)` đặt tư thế khung `i`; camera ôm sát thú qua mọi khung để thú không xê dịch. */
export function thuCanh(kind: ThanThuId): { scene: THREE.Scene; cam: THREE.OrthographicCamera; frame: (i: number) => void } {
  const scene = new THREE.Scene();
  const root = thuScene(kind);
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
  });
  scene.add(root);
  const pose = root.userData.pose as (a: Act) => void;
  const frame = (i: number) => {
    pose(thuAct(kind, i));
    root.updateMatrixWorld(true);
  };
  frame(0);
  const box = new THREE.Box3().setFromObject(root, true);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const { sun } = addSunLights(scene, Math.max(size.x, size.y, size.z) * 0.8 + 1, 2048);
  sun.position.copy(center).add(new THREE.Vector3(-6, 14, 16));
  sun.target.position.copy(center);

  const d = THU_DONG[kind];
  const AZ = d.az ?? 0.85;
  const EL = THREE.MathUtils.degToRad(d.el ?? 12);
  const dir = new THREE.Vector3(Math.cos(EL) * Math.sin(AZ), Math.sin(EL), Math.cos(EL) * Math.cos(AZ));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  cam.position.copy(center).addScaledVector(dir, 100);
  cam.lookAt(center);
  cam.updateMatrixWorld(true);
  // Khung ôm mọi đỉnh đã qua xương ở mọi khung.
  const inv = cam.matrixWorldInverse;
  const p = new THREE.Vector3();
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < THU_KHUNG; i++) {
    frame(i);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      const pos = m.geometry?.getAttribute('position');
      if (!pos || !m.visible) return;
      for (let j = 0; j < pos.count; j++) {
        m.getVertexPosition(j, p);
        p.applyMatrix4(m.matrixWorld).applyMatrix4(inv);
        x0 = Math.min(x0, p.x);
        x1 = Math.max(x1, p.x);
        y0 = Math.min(y0, p.y);
        y1 = Math.max(y1, p.y);
      }
    });
  }
  const half = (Math.max(x1 - x0, y1 - y0) / 2) * 1.06;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  cam.left = cx - half;
  cam.right = cx + half;
  cam.top = cy + half;
  cam.bottom = cy - half;
  cam.updateProjectionMatrix();
  return { scene, cam, frame };
}
