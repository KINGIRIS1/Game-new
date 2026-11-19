// Bốc đồi (Sơn Tinh): bóng núi thần. Hình núi Tản Viên ba đỉnh phát sáng xanh lục trong suốt (sáng ở đỉnh, mờ dần
// xuống chân cho khỏi che lính), viền sáng mảnh theo sống núi, lõi vàng ở đỉnh giữa. Núi lao xuống vùng đánh kéo vệt
// sáng, chạm đất thì dập xuống, bừng sáng, hoa văn trống đồng xanh nở ra rồi núi tan đi.
// Mô hình dựng ở cỡ vùng đánh gốc (`HILL.radius`); BattleView phóng theo vùng đánh của luật và cho rơi.

import * as THREE from 'three';
import { HILL } from '../game/defs';
import type { HieuUng } from './hieuUng';
import { C } from './palette';

/** Một quả đồi đang rơi. */
export interface DoiRoi {
  group: THREE.Group;
  /** Gốc mô hình ở dưới mặt đất chừng này (theo cỡ gốc) khi đã đập xuống. */
  bury: number;
  /** Tan đi tại chỗ thay vì lún xuống đất. */
  tan: boolean;
  /** Đời từ lúc chạm đất tới lúc gỡ hẳn (giây). */
  tanSau: number;
  /** Mỗi khung: `age` giây từ lúc ném, `roi` là đang rơi. */
  tick: (age: number, dt: number, roi: boolean) => void;
  /** Trả chất liệu riêng khi gỡ (hình thì BattleView trả bằng `disposeModel`). */
  drop?: () => void;
  /** Hiệu ứng lúc ném (vòng ngắm) và lúc chạm đất, đặt lịch theo `fall` giây rơi. */
  noRa: (fall: number) => void;
}

interface Chua {
  hu: HieuUng;
  /** Điểm (dx, dz) quanh chỗ rơi, nhấc lên `dy` khỏi đất, ra tọa độ trong nhóm. */
  at: (dx: number, dz: number, dy?: number) => THREE.Vector3;
  /** Bán kính vùng đánh (đã nhân độ giãn), và cỡ lính. */
  R: number;
  sc: number;
  seed: number;
}

/** Chạm đất rồi tan trong chừng này giây. */
const TAN = 0.6;

/** Hình nón một đỉnh núi, có màu đỉnh theo độ cao: chân gần như tắt (cộng sáng nên màu đen là trong suốt). */
function dinh(r: number, h: number, x: number, z: number, chan: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(r, h, 7, 4, true).translate(x, h / 2, z);
  const pos = g.getAttribute('position');
  const col: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const k = pos.getY(i) / h;
    const v = chan + (1 - chan) * k ** 1.3;
    col.push(v, v, v);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export function taoDoi(c: Chua): DoiRoi {
  const R = HILL.radius;
  const lop = (color: number) =>
    new THREE.MeshBasicMaterial({
      color,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  // Ba đỉnh Tản Viên (giữa cao, hai bên thấp) và lõi vàng trong đỉnh giữa.
  const parts: [THREE.BufferGeometry, number, number][] = [
    [dinh(R * 0.72, R * 1.6, 0, 0, 0.08), C.fxXanh, 0.42],
    [dinh(R * 0.48, R * 1.05, R * 0.55, R * 0.12, 0.08), C.fxXanh, 0.36],
    [dinh(R * 0.44, R * 0.95, -R * 0.52, -R * 0.1, 0.08), C.fxXanh, 0.36],
    [dinh(R * 0.32, R * 1.15, 0, 0, 0), C.fxVang, 0.55],
  ];
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const mats: [THREE.Material, number][] = [];
  for (const [geo, color, op] of parts) {
    const mat = lop(color);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 6;
    body.add(mesh);
    mats.push([mat, op]);
  }
  // Viền sáng mảnh theo sống núi (đường từ chân lên đỉnh và vành chân), chỉ cho ba đỉnh ngoài.
  for (const [geo, , op] of parts.slice(0, 3)) {
    const line = new THREE.LineBasicMaterial({ color: 0xe8ffe0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), line);
    edges.renderOrder = 7;
    body.add(edges);
    mats.push([line, op * 1.3]);
  }
  let hit = -1;
  let trail = 0;
  return {
    group,
    bury: 0,
    tan: true,
    tanSau: TAN,
    drop: () => mats.forEach(([m]) => m.dispose()),
    tick: (age, dt, roi) => {
      if (roi) {
        // Vệt sáng xanh ở lại trên đường lao xuống.
        trail += dt;
        for (; trail >= 0.04; trail -= 0.04) {
          const p = group.position.clone();
          p.y += R * 0.9 * group.scale.y;
          c.hu.loe(p, { mau: C.fxXanh, size: 1.6 * c.sc, life: 0.25 });
        }
        const pulse = 0.9 + 0.1 * Math.sin(age * 30);
        for (const [m, op] of mats) m.opacity = op * pulse;
        // Kéo dài theo chiều rơi.
        body.scale.set(0.9, 1.15, 0.9);
        return;
      }
      if (hit < 0) hit = age;
      // Dập xuống (bẹt ra, nảy lại), bừng sáng rồi tan.
      const k = Math.min(1, (age - hit) / TAN);
      const squash = k < 0.25 ? 1 - 0.35 * Math.sin((k / 0.25) * Math.PI) : 1;
      const wide = 1 + 0.2 * k;
      body.scale.set(wide * (2 - squash), squash * (1 - 0.15 * k), wide * (2 - squash));
      const f = k < 0.12 ? 1 + (k / 0.12) * 0.8 : 1.8 * (1 - (k - 0.12) / 0.88) ** 1.5;
      for (const [m, op] of mats) m.opacity = Math.min(1, op * f);
    },
    noRa: (fall) => {
      const { hu, at, R: r, sc } = c;
      // Vòng ngắm xanh co lại chỗ núi sắp rơi.
      hu.soc(at(0, 0), { mau: C.fxXanh, r: r * 1.1, thu: true, life: fall, loi: false, sang: 0.8 });
      hu.vong(at(0, 0), { mau: C.fxXanh, r: r * 1.35, delay: fall, life: 1.2 });
      hu.soc(at(0, 0), { mau: C.fxTrang, r: r * 1.6, delay: fall, life: 0.5, sang: 0.8 });
      hu.soc(at(0, 0), { mau: C.fxXanh, r: r * 1.05, delay: fall + 0.08, life: 0.45, loi: false });
      hu.loe(at(0, 0, 0.8 * sc), { mau: C.fxTrang, size: 3.2 * sc, delay: fall, life: 0.3 });
      hu.tia(at(0, 0, 0.5), { mau: C.fxXanh, n: 22, toc: 9, len: 0.45, up: 0.9, delay: fall, life: 0.55 });
      hu.hat(at(0, 0), { mau: C.fxVang, n: 16, r, h: 2 * sc, delay: fall + 0.1, life: 1.1 });
    },
  };
}
