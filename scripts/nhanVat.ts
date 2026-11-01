// Bảng nhân vật cho scripts/chup-nhan-vat.mjs: dựng từng nhân vật có khung xương ở các tư thế rồi chụp cận cảnh.
// Chạy trong trình duyệt qua Vite. Thêm nhân vật mới vào NHOM để chụp được.

import * as THREE from 'three';
import { addSunLights } from '../src/render/lights';
import { C } from '../src/render/palette';
import type { Act, Poser } from '../src/render/rig';
import { makeBeast, makeRuaVang } from '../src/render/beasts';
import { makeAnDuong, makeDrummer, makeGiong, makeSonTinh, makeThuyTinh } from '../src/render/heroes';
import { makeMonster } from '../src/render/monsters';
import { makeRower, makeWorker } from '../src/render/people';
import { makeSoldier } from '../src/render/soldier';

interface Entry {
  ten: string;
  tao: () => THREE.Group;
  /** Cỡ khung nhìn (nửa chiều cao, đơn vị ô); nhân vật to thì tăng. */
  co?: number;
  /** Khoảng cách giữa các tư thế. */
  cach?: number;
}

/** Các tư thế chụp, theo cột. */
export const TU_THE: [string, Act][] = [
  ['Đứng', { act: 'stand' }],
  ['Đi (bước trái)', { act: 'walk', phase: -Math.PI / 2, stride: 0.5 }],
  ['Đi (giữa bước)', { act: 'walk', phase: 0, stride: 0.5 }],
  ['Đi (bước phải)', { act: 'walk', phase: Math.PI / 2, stride: 0.5 }],
  ['Thủ', { act: 'fight' }],
  ['Ra đòn', { act: 'fight', strike: 0.12 }],
  ['Đòn tới', { act: 'fight', strike: 0.3 }],
  ['Thu về', { act: 'fight', strike: 0.65 }],
  ['Ngã', { act: 'dead', fall: 0.6 }],
];

export const NHOM: Record<string, Entry[]> = {
  linh: [
    { ten: 'Giáo binh bậc 2', tao: () => makeSoldier('giao', 2) },
    { ten: 'Cung thủ bậc 0', tao: () => makeSoldier('cung', 0) },
    { ten: 'Cung thủ bậc 2', tao: () => makeSoldier('cung', 2) },
    { ten: 'Giặc Ân cầm qua', tao: () => makeSoldier('giaoAn') },
    { ten: 'Giặc Ân cầm cung', tao: () => makeSoldier('cungAn') },
    { ten: 'Phó tướng Ân', tao: () => makeSoldier('phoTuong') },
    { ten: 'Lính Triệu', tao: () => makeSoldier('linhTrieu') },
    { ten: 'Lính nỏ Triệu', tao: () => makeSoldier('noTrieu') },
  ],
  thu: [
    { ten: 'Voi chiến bậc 0', tao: () => makeBeast('voi', 0), co: 1.5, cach: 1.5 },
    { ten: 'Voi chiến bậc 2', tao: () => makeBeast('voi', 2), co: 1.6, cach: 1.5 },
    { ten: 'Chiến xa', tao: () => makeBeast('chienXa'), co: 1.3, cach: 1.6 },
    { ten: 'Đại tướng Ân', tao: () => makeBeast('daiTuong'), co: 1.4, cach: 1.6 },
    { ten: 'Kỵ binh Triệu', tao: () => makeBeast('kyBinh'), co: 1.4, cach: 1.3 },
    { ten: 'Triệu Đà', tao: () => makeBeast('trieuDa'), co: 1.4, cach: 1.3 },
    { ten: 'Hổ tinh', tao: () => makeBeast('hoTinh'), co: 1.0, cach: 1.3 },
    { ten: 'Gà trắng', tao: () => makeBeast('gaTrang'), co: 1.3, cach: 1.3 },
    { ten: 'Rùa Vàng', tao: () => makeRuaVang(), co: 0.9, cach: 1.7 },
  ],
  quai: [
    { ten: 'Tôm binh', tao: () => makeMonster('tomBinh'), co: 0.9 },
    { ten: 'Cá phun nước', tao: () => makeMonster('caPhun') },
    { ten: 'Cá sấu', tao: () => makeMonster('caSau'), co: 0.9, cach: 1.3 },
    { ten: 'Thuồng luồng', tao: () => makeMonster('thuongLuong'), co: 1.2, cach: 1.2 },
    { ten: 'Quỷ núi', tao: () => makeMonster('quyNui'), co: 1.0, cach: 0.9 },
    { ten: 'Ma trơi', tao: () => makeMonster('maTroi') },
  ],
  tuong: [
    { ten: 'Gióng lên ba', tao: () => makeGiong('be'), co: 0.7 },
    { ten: 'Gióng thiếu niên', tao: () => makeGiong('thieuNien'), co: 0.9 },
    { ten: 'Tráng sĩ Gióng (roi sắt)', tao: () => makeGiong('trangSi'), co: 1.6, cach: 1.4 },
    { ten: 'Tráng sĩ Gióng (tre, hiển linh)', tao: () => makeGiong('trangSi', { bamboo: true, glow: true }), co: 1.8, cach: 1.4 },
    { ten: 'Sơn Tinh', tao: () => makeSonTinh(), co: 1.3, cach: 1.1 },
    { ten: 'Sơn Tinh trên mỏm đá', tao: () => makeSonTinh({ rock: true }), co: 1.4, cach: 1.3 },
    { ten: 'Thủy Tinh', tao: () => makeThuyTinh(), co: 1.3, cach: 1.2 },
    { ten: 'An Dương Vương (nỏ thần)', tao: () => makeAnDuong({ crossbow: true }), co: 1.3, cach: 1.1 },
    { ten: 'An Dương Vương (rìu)', tao: () => makeAnDuong(), co: 1.3, cach: 1.1 },
  ],
  ky_nang: [
    { ten: 'Kỹ năng (cột: 0, 0,1 … 1)', tao: () => makeGiong('trangSi'), co: 1.6, cach: 1.4 },
    { ten: 'Sơn Tinh dời non', tao: () => makeSonTinh(), co: 1.3, cach: 1.1 },
    { ten: 'Thủy Tinh hô mưa', tao: () => makeThuyTinh(), co: 1.3, cach: 1.2 },
    { ten: 'An Dương Vương nỏ thần', tao: () => makeAnDuong({ crossbow: true }), co: 1.3, cach: 1.1 },
    { ten: 'Người đánh trống', tao: () => makeDrummer(), co: 0.9, cach: 1.1 },
  ],
  dan: [
    { ten: 'Nông dân', tao: () => makeWorker('nong') },
    { ten: 'Thương nhân', tao: () => makeWorker('buon') },
    { ten: 'Thợ đá', tao: () => makeWorker('thoDa') },
    { ten: 'Thợ rèn', tao: () => makeWorker('thoRen') },
    { ten: 'Người giữ kho', tao: () => makeWorker('giuKho') },
    { ten: 'Phụ nữ', tao: () => makeWorker('phuNu') },
    { ten: 'Phụ nữ ngồi gói bánh', tao: () => makeWorker('phuNu', true) },
    { ten: 'Lạc hầu', tao: () => makeWorker('lacHau') },
    { ten: 'Lính gác', tao: () => makeWorker('linhGac') },
    { ten: 'Người lái đò', tao: () => makeRower() },
  ],
};

/** Nhóm `dan`: làm việc theo nghề ở vài thời điểm, rồi bước đi. */
const DAN: [string, Act][] = [
  ...[0, 0.15, 0.3, 0.45, 0.6].map((t): [string, Act] => [`Làm (t=${t})`, { act: 'stand', time: t }]),
  ['Đi (bước trái)', { act: 'walk', phase: -Math.PI / 2, stride: 0.45 }],
  ['Đi (giữa bước)', { act: 'walk', phase: 0, stride: 0.45 }],
  ['Đi (bước phải)', { act: 'walk', phase: Math.PI / 2, stride: 0.45 }],
];

/** Nhóm `ky_nang`: mỗi cột một mốc tiến trình kỹ năng (người đánh trống: nện tay trái, tay phải xen nhau). */
const KY_NANG: [string, Act][] = [0, 0.1, 0.2, 0.35, 0.5, 0.6, 0.7, 0.85, 1].map((k) => [`${k}`, { act: 'fight', skill: k, time: k }]);

const AZ = Math.PI / 4;
const EL = THREE.MathUtils.degToRad(38);

/** Chụp một nhóm: mỗi nhân vật một ảnh, các tư thế xếp thành hàng. Trả về dataURL. */
export function chup(nhom: string, huong = -0.6): { ten: string; anh: string }[] {
  const list = NHOM[nhom];
  if (!list) throw new Error(`Không có nhóm ${nhom}. Có: ${Object.keys(NHOM).join(', ')}`);
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const right = new THREE.Vector3(Math.cos(AZ), 0, -Math.sin(AZ));
  const out: { ten: string; anh: string }[] = [];
  for (const e of list) {
    const half = e.co ?? 0.8;
    const gap = e.cach ?? 0.75;
    const h = 260;
    const w = Math.round(((TU_THE.length + 1) * gap * h) / (2 * half));
    renderer.setSize(w, h);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.sky);
    addSunLights(scene, 8, 2048);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshToonMaterial({ color: C.grass[0] }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const cols = nhom === 'ky_nang' ? KY_NANG : nhom === 'dan' ? DAN : TU_THE;
    cols.forEach(([, act], i) => {
      const g = e.tao();
      const k = i - (cols.length - 1) / 2;
      const beat = g.userData.beat as ((l: number, r: number) => void) | undefined;
      if (beat) beat(i % 2 ? 0.32 : -0.75, i % 2 ? -0.75 : 0.32);
      g.position.copy(right).multiplyScalar(k * gap);
      g.rotation.y = AZ + huong;
      (g.userData.pose as Poser | undefined)?.(act);
      // Ngã: phần vẽ trận ngả cả người ra sau.
      if (act.act === 'dead') {
        if (g.userData.fall === 'side') g.rotation.z = -(act.fall ?? 1) * 1.2;
        else if (g.userData.fall !== 'none') g.rotation.x = -(act.fall ?? 1) * 1.2;
      }
      scene.add(g);
    });
    const aspect = w / h;
    const cam = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 100);
    const target = new THREE.Vector3(0, half * 0.7, 0);
    cam.position.set(Math.cos(EL) * Math.sin(AZ), Math.sin(EL), Math.cos(EL) * Math.cos(AZ)).multiplyScalar(40).add(target);
    cam.lookAt(target);
    renderer.render(scene, cam);
    out.push({ ten: e.ten, anh: canvas.toDataURL('image/png') });
  }
  renderer.dispose();
  canvas.remove();
  return out;
}
