// Ghềnh đá lô nhô giữa lòng sông (diorama bước 4; `docs/thiet-ke.md` mục Kế hoạch: địa hình diorama). Chỉ ở khúc
// thượng nguồn ngoài lưới (sông Thao phía bắc, sông Đà phía tây): thuyền khơi, thuyền chiến đi giữa dòng trong lưới,
// thủy quái và thuyền giặc đi ba ô sát bờ, nên ghềnh chỉ ở ô giữa lòng sông, nơi không thuyền nào qua. Chỉ để nhìn:
// một lệnh vẽ (đá và bọt nước chung chất liệu đất, màu đỉnh), không đổ bóng.

import * as THREE from 'three';
import { RIVER_END, RIVER_START } from '../game/map';
import { seeded } from './shapes';

const DA = new THREE.Color(0x857d70);
const DA_SANG = new THREE.Color(0xaaa293);
const BOT = new THREE.Color(0xeef6f4);

/** Từ ô này ra tới ô kia (ngoài lưới, ô âm) có ghềnh. */
const TU = -1;
const TOI = -14;

/**
 * Dựng ghềnh: mỗi khúc sông vài cụm đá nhô khỏi mặt nước `waterY`, bọt trắng quanh chân đá. `wx`, `wz` đổi ô ra tọa độ
 * cảnh.
 */
export function buildGhenh(wx: (x: number) => number, wz: (z: number) => number, waterY: number, mat: THREE.Material): THREE.Mesh {
  const rand = seeded(55);
  const mid = (RIVER_START + RIVER_END) / 2;
  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  const add = (g: THREE.BufferGeometry, color: (y: number) => THREE.Color) => {
    const p = (g.index ? g.toNonIndexed() : g).getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      const cc = color(p.getY(i));
      col.push(cc.r, cc.g, cc.b);
    }
    g.dispose();
  };
  const cum = (x: number, z: number) => {
    const n = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const r = 0.22 + rand() * 0.3;
      const g = new THREE.IcosahedronGeometry(r, 0);
      g.scale(1 + rand() * 0.6, 0.7 + rand() * 0.6, 1 + rand() * 0.4);
      g.rotateY(rand() * Math.PI);
      const px = x + (rand() - 0.5) * 1.2;
      const pz = z + (rand() - 0.5) * 1.2;
      g.translate(px, waterY + r * 0.15, pz);
      add(g, (y) => c.copy(DA).lerp(DA_SANG, Math.min(1, Math.max(0, (y - waterY) / (r * 0.8)))));
      // Bọt nước dẹt quanh chân đá.
      const f = new THREE.CylinderGeometry(r * 1.5, r * 1.7, 0.02, 7);
      f.translate(px, waterY + 0.01, pz);
      add(f, () => BOT);
    }
  };
  for (let t = TU; t > TOI; t -= 2.2 + rand() * 1.6) {
    // Sông Thao (chảy dọc z) và sông Đà (chảy dọc x): lệch quanh giữa dòng chưa tới một ô.
    cum(wx(mid + (rand() - 0.5) * 1.4), wz(t));
    cum(wx(t), wz(mid + (rand() - 0.5) * 1.4));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false;
  return mesh;
}
