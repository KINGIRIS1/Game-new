// Vũ khí ánh lên khi tướng mặc đủ bốn món bộ mình (docs/thiet-ke.md mục Kế hoạch: trang bị, Giao diện). Chỉ để nhìn:
// - lớp vỏ sáng ôm theo vũ khí: hình `RigShape.anh` (phần vẽ trong `RigBuilder.vuKhi`) nở ra theo pháp tuyến, cộng sáng,
//   gắn chung khung xương của tướng nên theo vũ khí vung, bắn; lớp trong làm vũ khí sáng lên, lớp ngoài (chỉ mặt sau,
//   như viền mực) là quầng quanh vũ khí;
// - vài đốm lấp lánh trên vũ khí, gắn vào xương cầm vũ khí.
// Bãi chiến: `batAnh` (World, battleView dựng tướng có `anh` khi `Fighter.trangBi.bo4`), vỏ chập chờn theo nhịp thở,
// đốm lấp lánh so le. Hình tướng ở túi đồ: `bakeAnh`, bản tĩnh.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { HeroKind } from '../game/battle';
import { bakeRig, type Act, type Bones, type Poser, type RigShape } from './rig';

/** Màu ánh theo bộ của tướng: lửa Phù Đổng, ngọc Tản Viên, vàng Cổ Loa, đồng Cao Lỗ, đỏ son Trưng Trắc, vàng Trưng Nhị, trắng ngà Núi Nưa, xanh đầm Dạ Trạch, đen ánh tím Vạn An, xanh biển Bạch Đằng. */
export const ANH_MAU: Record<HeroKind, number> = {
  giong: 0xff9a3c,
  sonTinh: 0x6cf2a8,
  anDuong: 0xffd25e,
  caoLo: 0xffbf6a,
  trungTrac: 0xff7a52,
  trungNhi: 0xffe58a,
  // Bà Triệu: trắng ngà như voi trắng một ngà.
  baTrieu: 0xfff4d6,
  // Triệu Quang Phục: xanh đầm Dạ Trạch.
  trieuQuangPhuc: 0x8fe0b0,
  // Mai Thúc Loan: đen ánh tím Vạn An.
  maiThucLoan: 0xb48cff,
  // Ngô Quyền: xanh biển Bạch Đằng.
  ngoQuyen: 0x6cc4ff,
};

/** Lớp trong ôm sát vũ khí; lớp ngoài là quầng (tọa độ mô hình, tướng cao chừng 1,6–2,5). */
const DAY_TRONG = 0.006;
const DAY_NGOAI = 0.03;
/** Số đốm lấp lánh, cỡ đốm. */
const SO_SAO = 6;
const CO_SAO = 0.36;

/** Hình vỏ: gộp đỉnh trùng để pháp tuyến mượt (không nứt ở cạnh), nở ra `d` theo pháp tuyến; giữ chỉ số xương. */
export function voSang(geo: THREE.BufferGeometry, d: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  for (const a of ['position', 'skinIndex', 'skinWeight']) g.setAttribute(a, geo.getAttribute(a).clone());
  const m = mergeVertices(g, 1e-3);
  g.dispose();
  m.computeVertexNormals();
  const pos = m.getAttribute('position');
  const nor = m.getAttribute('normal');
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + nor.getX(i) * d, pos.getY(i) + nor.getY(i) * d, pos.getZ(i) + nor.getZ(i) * d);
  return m;
}

function vatLieu(color: number, side: THREE.Side, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side, toneMapped: false });
}

let sao: THREE.DataTexture | null = null;

/** Ảnh đốm sáng bốn cánh (vẽ bằng số, không cần canvas). */
function saoTex(): THREE.DataTexture {
  if (sao) return sao;
  const n = 32;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = ((x + 0.5) / n) * 2 - 1;
      const dy = ((y + 0.5) / n) * 2 - 1;
      const r = Math.sqrt(dx * dx + dy * dy);
      const loi = Math.max(0, 1 - r * 1.9) ** 2;
      const canh = Math.max(0, 1 - Math.abs(dx) * 6) * Math.max(0, 1 - Math.abs(dy)) + Math.max(0, 1 - Math.abs(dy) * 6) * Math.max(0, 1 - Math.abs(dx));
      const a = Math.min(1, loi + canh * Math.max(0, 1 - r) * 1.2);
      const i = (y * n + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  sao = new THREE.DataTexture(data, n, n);
  sao.needsUpdate = true;
  return sao;
}

function dom(color: number): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: saoTex(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(CO_SAO);
  s.renderOrder = 3;
  return s;
}

/**
 * Chỗ đặt đốm lấp lánh: các đỉnh của vũ khí phía xa tay cầm (từ 40% quãng xa nhất trở ra), cách đều nhau theo thứ tự
 * vẽ, đẩy ra khỏi mặt vũ khí một chút cho khỏi bị chính vũ khí che. Trả về tên xương và chỗ trong khung xương ấy
 * (xương ở tư thế gốc không xoay, nên chỉ trừ chỗ khớp).
 */
function choSao(shape: RigShape<string>, geo: THREE.BufferGeometry, n: number): { bone: string; at: THREE.Vector3 }[] {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const idx = geo.getAttribute('skinIndex');
  const all: { bone: string; at: THREE.Vector3; d: number }[] = [];
  for (let i = 0; i < pos.count; i++) {
    const bone = shape.names[idx.getX(i)];
    const [x, y, z] = shape.defs[bone].at;
    const at = new THREE.Vector3(pos.getX(i) - x, pos.getY(i) - y, pos.getZ(i) - z);
    const d = at.length();
    if (nor) at.add(new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)).multiplyScalar(0.05));
    all.push({ bone, at, d });
  }
  const far = Math.max(...all.map((p) => p.d));
  const xa = all.filter((p) => p.d >= far * 0.4);
  return Array.from({ length: Math.min(n, xa.length) }, (_, j) => xa[Math.floor(((j + 0.5) / n) * xa.length)]);
}

/**
 * Cho vũ khí của tướng `group` (dựng từ `shape` có `anh`) ánh lên: thêm vỏ sáng gắn chung khung xương và đốm lấp lánh,
 * bọc `userData.pose` để mỗi khung vỏ chập chờn theo `a.time`, đốm lấp lánh so le; ngã thì tắt. Gọi sau khi đã có
 * `userData.pose`. Không có phần vũ khí thì không làm gì.
 */
export function batAnh(group: THREE.Group, shape: RigShape<string>, kind: HeroKind): void {
  const geo = shape.anh;
  const body = group.children.find((c): c is THREE.SkinnedMesh => (c as THREE.SkinnedMesh).isSkinnedMesh);
  if (!geo || !body) return;
  const color = ANH_MAU[kind];
  const lop = [
    [DAY_TRONG, THREE.FrontSide],
    [DAY_NGOAI, THREE.BackSide],
  ] as const;
  const vo = lop.map(([d, side]) => {
    const m = new THREE.SkinnedMesh(voSang(geo, d), vatLieu(color, side, 0.3));
    m.bind(body.skeleton, new THREE.Matrix4());
    m.frustumCulled = false;
    m.renderOrder = 2;
    m.userData.anh = true;
    group.add(m);
    return m;
  });
  const bones = group.userData.bones as Bones<string>;
  const doms = choSao(shape, geo, SO_SAO).map(({ bone, at }) => {
    const s = dom(color);
    s.position.copy(at);
    bones[bone].add(s);
    return s;
  });
  const pose = group.userData.pose as Poser;
  const nhip = (a: Act) => {
    const on = a.act !== 'dead';
    const t = a.time ?? 0;
    const p = 0.5 + 0.5 * Math.sin(t * 3);
    (vo[0].material as THREE.MeshBasicMaterial).opacity = 0.18 + 0.22 * p;
    (vo[1].material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.35 * p;
    for (const m of vo) m.visible = on;
    doms.forEach((s, i) => {
      const k = Math.max(0, Math.sin(t * 2.6 + i * 1.9)) ** 2;
      s.visible = on && k > 0.02;
      s.material.opacity = k;
      s.scale.setScalar(CO_SAO * (0.35 + 0.9 * k));
    });
  };
  group.userData.pose = (a: Act) => {
    pose(a);
    nhip(a);
  };
  nhip({ act: 'stand' });
}

/**
 * Bản tĩnh của vũ khí ánh lên cho hình tướng (cùng tư thế `pose` với `bakeRig` của tướng): hai lớp vỏ và vài đốm sáng
 * đặt trên vỏ. Không có phần vũ khí thì null.
 */
export function bakeAnh(shape: RigShape<string>, pose: (b: Bones<string>) => void, kind: HeroKind): THREE.Group | null {
  const geo = shape.anh;
  if (!geo) return null;
  const color = ANH_MAU[kind];
  const out = bakeRig(
    {
      defs: shape.defs,
      names: shape.names,
      parts: [
        { geo: voSang(geo, DAY_TRONG), mat: vatLieu(color, THREE.FrontSide, 0.32) },
        { geo: voSang(geo, DAY_NGOAI), mat: vatLieu(color, THREE.BackSide, 0.5) },
      ],
    },
    pose,
    null,
  );
  out.traverse((o) => {
    o.castShadow = o.receiveShadow = false;
    o.renderOrder = 2;
  });
  // Đốm sáng: vài đỉnh của lớp trong (đã đặt theo tư thế), cách đều theo thứ tự vẽ.
  const pos = (out.children[0] as THREE.Mesh).geometry.getAttribute('position');
  for (let j = 0; j < 4; j++) {
    const i = Math.floor(((j + 0.5) / 4) * pos.count);
    const s = dom(color);
    s.position.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    s.scale.setScalar(CO_SAO * (j % 2 ? 0.7 : 1.1));
    out.add(s);
  }
  out.userData.anh = true;
  return out;
}
