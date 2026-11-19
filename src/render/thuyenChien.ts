// Thuyền chiến trống đồng chở quân ra đồn đảo (Điện 10 điều quân ra đóng đảo; mục Kế hoạch trong docs/thiet-ke.md),
// theo hình thuyền khắc trên trống đồng Ngọc Lũ: thân dài cong hình lưỡi liềm, mũi và đuôi vút cao, mũi là đầu chim
// Lạc, đuôi là đuôi chim; sạp ván giữa thuyền có chiến binh đội mũ lông chim, một người đánh trống đồng, người lái
// chèo lái ở đuôi; hàng mái chèo hai bên mạn, cờ đuôi nheo mũi và đuôi. Mũi hướng +x như mọi thuyền; mặt nước ở y = 0.
// World dựng một chiếc mỗi bến thuyền khơi đã đóng thuyền (`syncDao`), neo ở bến hay chạy theo chuyến (`moveWarBoat`).

import * as THREE from 'three';
import { patternStrip } from './buildings';
import { gopHinh } from './congTrinh/trai';
import { STICK_POSE, makeDrummer } from './heroes';
import { C } from './palette';
import { makeRower } from './people';
import type { Poser } from './rig';
import { bakeSoldier, type SoldierKind } from './soldier';
import { ToonModel, inkThin } from './toon';

/** Dài thân thuyền (kể cả mũi, đuôi vút) và nửa bề ngang giữa thân. */
const DAI = 4.2;
const NGANG = 0.42;
/** Mặt sạp ván giữa thuyền. */
export const SAP_Y = 0.36;
/** Lính đang chở đứng trên sạp nhiều nhất chừng này người. */
export const CHO_MAX = 6;

/** Mạn thuyền ở chỗ `x`: nửa bề ngang, mép mạn, đáy. Thân cong lưỡi liềm: mép mạn và đáy cùng vút lên hai đầu. */
function manThuyen(x: number): { w: number; top: number; keel: number } {
  const u = Math.min(1, Math.abs((2 * x) / DAI));
  return {
    w: Math.max(0.03, NGANG * Math.pow(1 - u * u, 0.55)),
    top: 0.32 + 1.0 * Math.pow(u, 4.5),
    keel: -0.07 + 0.52 * Math.pow(u, 2.6),
  };
}

/**
 * Thân thuyền liền một khối: mỗi khúc dọc thân là một mặt cắt chữ U (từ mép mạn trái xuống đáy lên mép mạn phải), nắp
 * phẳng theo mép mạn, bịt hai đầu. Mỗi tam giác quay mặt ra ngoài (tự lật nếu ngược) để viền mực ôm đúng.
 */
function thanThuyen(): THREE.BufferGeometry {
  const nx = 36;
  const nr = 10;
  const pos: number[] = [];
  const idx: number[] = [];
  const v = (x: number, y: number, z: number) => {
    pos.push(x, y, z);
    return pos.length / 3 - 1;
  };
  const at = (i: number) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  const tri = (a: number, b: number, c: number, out: THREE.Vector3) => {
    const n = at(b).sub(at(a)).cross(at(c).sub(at(a)));
    if (n.dot(out) < 0) idx.push(a, c, b);
    else idx.push(a, b, c);
  };
  const rings: number[][] = [];
  const xs: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = -DAI / 2 + (DAI * i) / nx;
    const s = manThuyen(x);
    xs.push(x);
    const ring: number[] = [];
    for (let j = 0; j <= nr; j++) {
      const phi = -Math.PI / 2 + (Math.PI * j) / nr;
      ring.push(v(x, s.keel + (s.top - s.keel) * (1 - Math.cos(phi)), s.w * Math.sin(phi)));
    }
    rings.push(ring);
  }
  const outward = (i: number, j: number) => {
    const s = manThuyen(xs[i]);
    const mid = (s.top + s.keel) / 2;
    const p = at(rings[i][j]);
    return new THREE.Vector3(0, p.y - mid, p.z).normalize();
  };
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nr; j++) {
      const a = rings[i][j];
      const b = rings[i + 1][j];
      const n = outward(i, j).add(outward(i + 1, j + 1));
      tri(a, b, rings[i][j + 1], n);
      tri(b, rings[i + 1][j + 1], rings[i][j + 1], n);
    }
  }
  // Nắp theo mép mạn (đỉnh riêng cho mép sắc).
  const up = new THREE.Vector3(0, 1, 0);
  const caps: [number, number][] = xs.map((x) => {
    const s = manThuyen(x);
    return [v(x, s.top, -s.w), v(x, s.top, s.w)];
  });
  for (let i = 0; i < nx; i++) {
    tri(caps[i][0], caps[i][1], caps[i + 1][0], up);
    tri(caps[i][1], caps[i + 1][1], caps[i + 1][0], up);
  }
  // Bịt hai đầu: quạt từ giữa mặt cắt.
  for (const [i, dir] of [[0, -1], [nx, 1]] as const) {
    const s = manThuyen(xs[i]);
    const c = v(xs[i], (s.top + s.keel) / 2, 0);
    const ring = rings[i].map((k) => v(...(at(k).toArray() as [number, number, number])));
    const n = new THREE.Vector3(dir, 0, 0);
    for (let j = 0; j < nr; j++) tri(c, ring[j], ring[j + 1], n);
    tri(c, ring[nr], ring[0], n);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Thanh tròn nối hai điểm. */
function que(b: ToonModel['plain'], a: [number, number, number], c: [number, number, number], r: number, color: number, seg = 5): void {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...c).sub(from);
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  b.cyl(r, r, dir.length(), color, from.x + dir.x / 2, from.y + dir.y / 2, from.z + dir.z / 2, [e.x, e.y, e.z], seg);
}

/** Đầu chim Lạc ở mũi: cổ cong, đầu đồng, mỏ dài vàng chĩa về trước, mào lông vũ uốn ra sau. */
function dauChim(m: ToonModel): void {
  const p = m.plain;
  const s = manThuyen(DAI / 2);
  const x = DAI / 2 - 0.04;
  const y = s.top;
  que(p, [x - 0.06, y - 0.12, 0], [x + 0.08, y + 0.2, 0], 0.045, C.woodDark, 6);
  p.sphere(0.085, C.bronze, x + 0.1, y + 0.26, 0, [1.2, 0.95, 0.85], 8);
  p.cone(0.045, 0.32, C.gold, x + 0.3, y + 0.25, 0, [0, 0, -Math.PI / 2 - 0.1], 6);
  for (const sz of [-1, 1]) p.sphere(0.02, C.ink, x + 0.14, y + 0.29, sz * 0.06, [1, 1, 0.6], 5);
  for (let k = 0; k < 4; k++) p.cone(0.022, 0.2, k % 2 ? C.gold : C.red, x + 0.02 - k * 0.04, y + 0.36 - k * 0.02, 0, [0, 0, 0.75 + k * 0.2], 4);
}

/** Đuôi chim ở đuôi thuyền: chùm lông đuôi đồng, vàng, đỏ xòe ra sau và lên trời. */
function duoiChim(m: ToonModel): void {
  const p = m.plain;
  const s = manThuyen(-DAI / 2);
  const x = -DAI / 2 + 0.04;
  const y = s.top;
  for (let k = 0; k < 5; k++) {
    const a = 0.25 + k * 0.28;
    p.cone(0.05 - k * 0.004, 0.5 - k * 0.04, [C.bronze, C.gold, C.red, C.gold, C.bronze][k], x - Math.cos(a) * 0.2, y + Math.sin(a) * 0.2, 0, [0, 0, a + Math.PI / 2], 4);
  }
}

/** Mái chèo hai bên mạn ở một thế chèo: mái quét về trước, sau (`sweep`), mái hạ xuống nước hay nhấc lên (`bladeY`). */
function maiCheo(sweep: number, bladeY: number): THREE.Group {
  const m = new ToonModel(inkThin);
  const p = m.plain;
  for (const x of [-1.05, -0.6, -0.15, 0.3, 0.75]) {
    for (const sz of [-1, 1]) {
      const w = manThuyen(x).w;
      const from: [number, number, number] = [x, SAP_Y - 0.02, sz * (w + 0.01)];
      const to: [number, number, number] = [x + sweep, bladeY, sz * (w + 0.85)];
      que(p, from, to, 0.016, C.woodDark, 4);
      const dir = new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize();
      p.box(0.16, 0.03, 0.26, C.wood, to[0] + dir.x * 0.08, to[1] + dir.y * 0.08, to[2] + dir.z * 0.08, [0, -Math.atan2(sweep, 0.85) * sz, -0.1 * sz]);
    }
  }
  return m.group();
}

/** Bốn thế chèo lặp theo nhịp: quét về trước (mái dưới nước), giữa, ra sau, nhấc mái lên đưa về. */
const THE_CHEO: [number, number][] = [
  [0.3, -0.06],
  [0, -0.1],
  [-0.3, -0.06],
  [0, 0.14],
];

/** Lính đang chở: binh chủng (giáo, cung, nỏ; voi không lên sạp được nên đứng thay bằng giáo binh) và bậc binh khí. */
export interface LinhCho {
  kind: 'giao' | 'cung' | 'no';
  tier: number;
}

/** Chỗ đứng lính đang chở trên sạp (hai hàng quay ra hai mạn), theo thứ tự. */
const CHO_DUNG: [number, number, number][] = [
  [0.85, 0.2, 0.35],
  [0.85, -0.2, Math.PI - 0.35],
  [-0.45, 0.2, 0.2],
  [-0.45, -0.2, Math.PI - 0.2],
  [-0.85, 0.2, 0.2],
  [-0.85, -0.2, Math.PI - 0.2],
];

/**
 * Thuyền chiến trống đồng. `cho`: lính đang chở (tối đa `CHO_MAX` người đứng trên sạp). `userData.row(t, chạy)` cho
 * mái chèo đổi thế, người lái chèo, người đánh trống nện dùi theo nhịp khi thuyền chạy; neo thì đứng yên.
 */
export function makeThuyenChien(cho: LinhCho[] = []): THREE.Group {
  const g = new THREE.Group();
  const m = new ToonModel(inkThin);
  const p = m.plain;
  p.add(thanThuyen(), C.woodDark, 0, 0, 0);
  // Dải hoa văn đồng dọc hai mạn dưới mép mạn.
  for (const sz of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    for (let x = -1.55; x <= 1.551; x += 0.155) {
      const s = manThuyen(x);
      pts.push(new THREE.Vector3(x, s.top - 0.015, sz * (s.w + 0.006)));
    }
    m.band.add(patternStrip(pts, 0.13, new THREE.Vector3(0, 0, sz)), C.bronzeLight, 0, 0, 0);
  }
  // Sạp ván giữa thuyền, rộng hơn thân một chút; hàng ván có mạch.
  p.box(2.7, 0.05, 2 * NGANG + 0.12, C.woodLight, -0.1, SAP_Y - 0.025, 0);
  for (let x = -1.3; x <= 1.15; x += 0.3) p.box(0.02, 0.012, 2 * NGANG + 0.1, C.wood, x, SAP_Y + 0.002, 0);
  // Mắt thuyền hai bên mũi.
  for (const sz of [-1, 1]) {
    const x = 1.62;
    const w = manThuyen(x).w;
    p.sphere(0.075, C.cream, x, manThuyen(x).top - 0.12, sz * (w + 0.005), [1.45, 0.95, 0.25], 8);
    p.sphere(0.04, C.ink, x + 0.03, manThuyen(x).top - 0.115, sz * (w + 0.018), [1.2, 1, 0.25], 6);
  }
  dauChim(m);
  duoiChim(m);
  // Chèo lái lớn ở đuôi, chĩa xuống nước.
  que(p, [-1.55, 0.95, 0.18], [-2.15, -0.25, 0.32], 0.026, C.woodDark, 5);
  p.box(0.32, 0.04, 0.16, C.wood, -2.12, -0.2, 0.32, [0, 0, 1.1]);
  // Cờ đuôi nheo đỏ ở mũi, cờ lớn ở đuôi.
  p.cyl(0.018, 0.022, 1.25, C.woodDark, 1.32, SAP_Y + 0.62, 0, undefined, 5);
  m.band.box(0.42, 0.14, 0.02, C.red, 1.1, SAP_Y + 1.12, 0, [0, 0, -0.05]);
  m.band.box(0.22, 0.08, 0.02, C.red, 0.82, SAP_Y + 1.09, 0, [0, 0, 0.25]);
  p.cone(0.035, 0.1, C.gold, 1.32, SAP_Y + 1.3, 0, undefined, 6);
  p.cyl(0.02, 0.025, 1.7, C.woodDark, -1.2, SAP_Y + 0.85, 0, undefined, 5);
  m.band.box(0.6, 0.42, 0.025, C.red, -1.52, SAP_Y + 1.4, 0);
  p.box(0.62, 0.035, 0.03, C.gold, -1.52, SAP_Y + 1.18, 0);
  p.sphere(0.045, C.bronzeLight, -1.2, SAP_Y + 1.72, 0, [1, 1, 1], 6);
  g.add(m.group());

  const poses = THE_CHEO.map(([sw, by]) => maiCheo(sw, by));
  poses.forEach((o, i) => {
    o.visible = i === 1;
    g.add(o);
  });

  // Người lái ở đuôi, người đánh trống giữa sạp nhìn về mũi.
  const rower = makeRower();
  rower.scale.setScalar(0.75);
  rower.position.set(-1.25, Math.max(SAP_Y, manThuyen(-1.25).top) - 0.02, 0.1);
  rower.rotation.y = Math.PI / 2;
  g.add(rower);
  const drummer = makeDrummer();
  drummer.scale.setScalar(0.5);
  drummer.position.set(0.05, SAP_Y, 0);
  drummer.rotation.y = Math.PI / 2;
  g.add(drummer);

  // Chiến binh đứng mũi (giáo, khiên) và lính đang chở trên sạp.
  // Đứng trên sạp, gần hai đầu thì trên mặt thân thuyền đã vút lên (gopHinh tự cộng 0,05).
  const chan = (x: number) => Math.max(SAP_Y, manThuyen(x).top) - 0.05;
  const list: { g: THREE.Group; x: number; z: number; ry: number; y: number }[] = [{ g: bakeSoldier('giao', 0), x: 1.28, z: 0.16, ry: Math.PI / 2, y: chan(1.28) }];
  cho.slice(0, CHO_MAX).forEach((l, i) => {
    const [x, z, ry] = CHO_DUNG[i];
    list.push({ g: bakeSoldier(l.kind as SoldierKind, l.tier), x, z, ry, y: chan(x) });
  });
  g.add(gopHinh(list));

  const beat = drummer.userData.beat as (l: number, r: number) => void;
  const rowerPose = rower.userData.pose as Poser;
  g.userData.row = (t: number, moving: boolean) => {
    const k = moving ? Math.floor(t * 2.4) % THE_CHEO.length : 1;
    poses.forEach((o, i) => (o.visible = i === k));
    rowerPose({ act: moving ? 'walk' : 'stand', phase: t * 2.4, time: t });
    if (!moving) {
      beat(STICK_POSE.rest, STICK_POSE.rest);
      return;
    }
    // Hai dùi nện so le theo nhịp chèo.
    const swing = (ph: number) => {
      const a = Math.sin(ph);
      return a > 0 ? STICK_POSE.up + (STICK_POSE.hit - STICK_POSE.up) * a : STICK_POSE.up * -a * 0.6 + STICK_POSE.rest * (1 + a);
    };
    beat(swing(t * 2.4 * Math.PI), swing(t * 2.4 * Math.PI + Math.PI));
  };
  return g;
}
