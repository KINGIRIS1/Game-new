// Đèn đuốc ban đêm ở kinh đô (docs/thiet-ke.md mục Ngày đêm): cán đuốc tre cắm ở góc móng công trình, ngọn lửa, quầng
// sáng và vũng sáng dưới chân đuốc; lửa sẵn có (lò rèn, lò nung) thêm quầng sáng; đèn thuyền, đom đóm.
// Không dùng đèn thật: thêm đèn thì mọi chất liệu phải dựng lại và nặng thêm. Quầng, vũng là tấm cộng màu (additive).
// Lớp này nằm ngoài mô hình công trình, nên ảnh công trình và dấu của chúng không đổi; ban ngày ẩn hẳn.

import * as THREE from 'three';
import { BUILDINGS, isDecor, isRoad, type BuildingType } from '../game/defs';
import { CELL, type Lot } from './lot';
import { BAI_DA_LOT } from './congTrinh/baiDa';
import { BEN_LOT } from './congTrinh/ben';
import { BEN_KHOI_LOT } from './congTrinh/benKhoi';
import { BEP_LOT } from './congTrinh/bep';
import { CHUONG_LON_LOT } from './congTrinh/chuongLon';
import { CHUONG_VOI_LOT } from './congTrinh/chuongVoi';
import { DEN_HAT_MON_LOT } from './congTrinh/denHatMon';
import { DEN_RONG_TIEN_LOT } from './congTrinh/denRongTien';
import { DOANH_TRAI_LOT } from './congTrinh/doanhTrai';
import { HO_KIM_QUY_LOT } from './congTrinh/hoKimQuy';
import { KHO_LOT } from './congTrinh/kho';
import { LANG_CHAI_LOT } from './congTrinh/langChai';
import { LO_REN_LOT } from './congTrinh/loRen';
import { NHA_SAN_LOT } from './congTrinh/nhaSan';
import { THO_HO_LOT } from './congTrinh/thoHo';
import { TRAI_CUNG_LOT } from './congTrinh/traiCung';
import { TRAI_GIAO_LOT } from './congTrinh/traiGiao';
import { TRAI_NO_LOT } from './congTrinh/traiNo';
import { XUONG_MOC_LOT } from './congTrinh/xuongMoc';
import { C } from './palette';
import { ShapeBuilder } from './shapes';
import { inkThin, outlineOf, toon } from './toon';

/** `cot`: cắm cán đuốc, có lửa, quầng, vũng sáng. `lua`: lửa sẵn có của công trình, chỉ thêm quầng và vũng nhỏ. */
export type DuocKind = 'cot' | 'lua';

/** Một chỗ đuốc trong cảnh: (x, y, z) là chân đuốc (hay tâm ngọn lửa sẵn có). `seed` 0..1 để thắp so le. */
export interface DuocSpot {
  x: number;
  y: number;
  z: number;
  kind: DuocKind;
  seed: number;
}

/** Cán đuốc cao chừng này (ô); ngọn lửa ở đầu cán. Người làm cao chừng 0,5 ô. */
export const DUOC_H = 0.66;
/** Đuốc cắm cách mép móng chừng này. */
const LE = 0.28;

/** Loại không cắm đuốc: ruộng, vườn có đom đóm; tường, đê, bẫy, cầu, đường, đồ trang trí. */
const KHONG: ReadonlySet<BuildingType> = new Set<BuildingType>(['ruong', 'ruongNep', 'vuon', 'luy', 'de', 'congDe', 'thanh', 'bayChong', 'cauSongDa', 'cauSongThao']);

/** Bản vẽ ô con của các công trình vẽ trên móng mới: đuốc cắm vào ô trống ('.') để khỏi đè lên nhà, rào, đống đá. */
export const DUOC_LOTS: Partial<Record<BuildingType, Lot>> = {
  baiDa: BAI_DA_LOT,
  ben: BEN_LOT,
  benKhoi: BEN_KHOI_LOT,
  bep: BEP_LOT,
  chuongLon: CHUONG_LON_LOT,
  chuongVoi: CHUONG_VOI_LOT,
  denHatMon: DEN_HAT_MON_LOT,
  denRongTien: DEN_RONG_TIEN_LOT,
  doanhTrai: DOANH_TRAI_LOT,
  hoKimQuy: HO_KIM_QUY_LOT,
  kho: KHO_LOT,
  langChai: LANG_CHAI_LOT,
  loRen: LO_REN_LOT,
  nhaSan: NHA_SAN_LOT,
  thoHo: THO_HO_LOT,
  traiCung: TRAI_CUNG_LOT,
  traiGiao: TRAI_GIAO_LOT,
  traiNo: TRAI_NO_LOT,
  xuongMoc: XUONG_MOC_LOT,
};

/** Đuốc xa góc móng quá chừng này (ô) thì thôi không cắm: góc ấy kín, cắm vào giữa sân trông lạc chỗ. */
const XA_GOC = 1.3;

/**
 * Ô trống ('.') gần điểm (x, z) nhất trên bản vẽ, trừ ô đã cắm. Không có ô trống nào đủ gần thì cắm ở mép ô lối đi
 * (',') gần nhất, dịch về phía góc cho khỏi giữa lối; vẫn không có thì `null`.
 */
function oTrongGan(lot: Lot, x: number, z: number, used: Set<number>): { x: number; z: number } | null {
  return oGan(lot, '.', x, z, used) ?? mepLoi(lot, x, z, used);
}

function mepLoi(lot: Lot, x: number, z: number, used: Set<number>): { x: number; z: number } | null {
  const c = oGan(lot, ',', x, z, used);
  return c && { x: c.x + Math.sign(x - c.x) * 0.2, z: c.z };
}

function oGan(lot: Lot, ch: string, x: number, z: number, used: Set<number>): { x: number; z: number } | null {
  let best: { x: number; z: number; d: number; k: number } | null = null;
  for (let j = 0; j < lot.n; j++) {
    for (let i = 0; i < lot.n; i++) {
      if (lot.rows[j][i] !== ch || used.has(j * lot.n + i)) continue;
      const cx = -lot.tiles / 2 + (i + 0.5) * CELL;
      const cz = -lot.tiles / 2 + (j + 0.5) * CELL;
      const d = Math.hypot(cx - x, cz - z);
      if (!best || d < best.d - 1e-9) best = { x: cx, z: cz, d, k: j * lot.n + i };
    }
  }
  if (!best || best.d > XA_GOC) return null;
  used.add(best.k);
  return { x: best.x, z: best.z };
}

/**
 * Chỗ cắm đuốc trong móng công trình loại `type`, tọa độ móng: gốc ở tâm móng, mặt trước là +z, đơn vị ô (như
 * `Lot`), chưa xoay. Phần lớn công trình: hai cây gần hai góc trước (công trình có bản vẽ ô con thì cắm vào ô trống gần
 * góc nhất; doanh trại thêm hai cây hai bên cổng trước). Bến, làng chài, bến khơi quay mặt trước ra sông nên cắm gần hai góc sau, phía bờ. Điện: bốn cây hai bên
 * lối đá giữa sân chầu và hai cây hai bên cổng. Chòi canh, lầu nỏ, cổng thành móng một ô: một, hai cây sát mặt trước.
 */
export function duocCho(type: BuildingType): { x: number; z: number }[] {
  if (KHONG.has(type) || isDecor(type) || isRoad(type)) return [];
  const def = BUILDINGS[type];
  if (type === 'dien') {
    const out: { x: number; z: number }[] = [];
    // Lối đá giữa sân chầu là hai cột ô con giữa (x −0,5..0,5): đuốc ở ô con trống sát bên, hàng tướng đứng chầu.
    for (const z of [2.25, 3.25]) for (const sx of [-1, 1]) out.push({ x: sx * 0.75, z });
    for (const sx of [-1, 1]) out.push({ x: sx * 1.75, z: def.d / 2 - LE });
    return out;
  }
  if (type === 'congThanh') return [-1, 1].map((sx) => ({ x: sx * 0.32, z: 0.4 }));
  if (def.w === 1 && def.d === 1) return [{ x: 0.36, z: 0.36 }];
  const zf = def.nearRiver ? -(def.d / 2 - LE) : def.d / 2 - LE;
  const goc = [-1, 1].map((sx) => ({ x: sx * (def.w / 2 - LE), z: zf }));
  const lot = DUOC_LOTS[type];
  if (!lot) return goc;
  const used = new Set<number>();
  // Cổng có lầu (doanh trại): thêm hai cây hai bên cổng trước, cắm vào ô trống sát cổng.
  const cong = (CONG_TRUOC[type] ?? []).map((g) => oGan(lot, '.', g.x, g.z, used)).filter((c): c is { x: number; z: number } => c !== null);
  return [...cong, ...goc.map((g) => oTrongGan(lot, g.x, g.z, used)).filter((c): c is { x: number; z: number } => c !== null)];
}

/** Hai bên cổng trước (tọa độ móng): doanh trại 8×8 rộng, góc trước bên trái kín, nên cắm thêm đuốc ở cổng. */
const CONG_TRUOC: Partial<Record<BuildingType, { x: number; z: number }[]>> = {
  doanhTrai: [
    { x: -0.75, z: 3.25 },
    { x: 0.75, z: 3.25 },
  ],
};

// ---------- Hình và chất liệu dùng chung ----------

/** Cán tre, đai buộc và bầu đuốc quấn vỏ dầu. Gốc ở chân cán. */
const POLE = (() => {
  const b = new ShapeBuilder();
  b.cyl(0.022, 0.026, DUOC_H, C.bamboo, 0, DUOC_H / 2, 0, undefined, 5);
  b.cyl(0.03, 0.03, 0.03, C.woodDark, 0, DUOC_H * 0.55, 0, undefined, 6);
  b.cyl(0.045, 0.03, 0.09, C.woodDark, 0, DUOC_H + 0.02, 0, undefined, 6);
  const mesh = b.mesh(toon);
  return { geo: mesh.geometry, ink: outlineOf(mesh.geometry, inkThin) };
})();

/** Ngọn lửa hai lớp (đỏ cam ngoài, vàng trong), gốc ở chân lửa. */
const FLAME_GEO = (() => {
  const outer = new THREE.ConeGeometry(0.05, 0.16, 6).translate(0, 0.08, 0);
  const inner = new THREE.ConeGeometry(0.028, 0.1, 6).translate(0, 0.055, 0.004);
  const paint = (g: THREE.BufferGeometry, hex: number) => {
    const c = new THREE.Color(hex);
    const n = g.getAttribute('position').count;
    g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => [c.r, c.g, c.b][i % 3]), 3));
    return g.toNonIndexed();
  };
  const a = paint(outer, C.fire);
  const b = paint(inner, C.ember);
  const pos = [...(a.getAttribute('position').array as Float32Array), ...(b.getAttribute('position').array as Float32Array)];
  const col = [...(a.getAttribute('color').array as Float32Array), ...(b.getAttribute('color').array as Float32Array)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
})();

const QUAD = new THREE.PlaneGeometry(2, 2);
const DISC = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);

/**
 * Độ thắp của từng đuốc theo độ tối `uSang` và hạt so le (lưu ở `instanceColor.r`): đuốc này thắp trước, đuốc kia thắp
 * sau, trong chừng nửa lúc chiều tà. Cùng công thức với `litOf` cho cán đuốc.
 */
const LIT_GLSL = /* glsl */ `
  float seedOf() {
    #ifdef USE_INSTANCING_COLOR
      return instanceColor.r;
    #else
      return 0.0;
    #endif
  }
  float litOf(float sang, float seed) { return clamp((sang - seed * 0.35) / 0.3, 0.0, 1.0); }
  float flickOf(float t, float seed) { return 0.86 + 0.14 * sin(t * 9.0 + seed * 40.0) * sin(t * 5.3 + seed * 17.0); }
`;
export function litOf(sang: number, seed: number): number {
  return Math.min(1, Math.max(0, (sang - seed * 0.35) / 0.3));
}

/** Sương làm tắt dần đồ cộng màu ở xa (pha về màu sương thì lại cộng thêm màu, nên nhân cho tối đi). */
const FOG_FRAG = /* glsl */ `
  #ifdef USE_FOG
    gl_FragColor.rgb *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif
`;

interface Uniforms {
  [k: string]: THREE.IUniform;
  uSang: { value: number };
  uTime: { value: number };
}

/** Một chất liệu cộng màu: quầng quay về camera (`billboard`) hay vũng nằm trên đất. */
function glowMaterial(color: number, strength: number, core: number, billboard: boolean, shared: Uniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...shared, uColor: { value: new THREE.Color(color) }, uStrength: { value: strength }, uCore: { value: core } },
    vertexShader: /* glsl */ `
      uniform float uSang;
      uniform float uTime;
      varying vec2 vUv;
      varying float vA;
      #include <fog_pars_vertex>
      ${LIT_GLSL}
      void main() {
        vUv = uv;
        float seed = seedOf();
        float lit = litOf(uSang, seed);
        float flick = flickOf(uTime, seed);
        float size = length(instanceMatrix[0].xyz);
        vA = lit * flick;
        ${
          billboard
            ? `vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        mvPosition.xy += position.xy * size * (0.92 + 0.08 * flick);
        // Kéo về phía camera cho mái nhà ngay cạnh khỏi cắt mất nửa quầng.
        mvPosition.z += 0.6;`
            : `vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);`
        }
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      uniform float uCore;
      varying vec2 vUv;
      varying float vA;
      #include <fog_pars_fragment>
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        if (d >= 1.0) discard;
        float k = 1.0 - d;
        float a = (k * k * uStrength + smoothstep(0.35, 0.0, d) * uCore) * vA;
        gl_FragColor = vec4(uColor * a, 1.0);
        ${FOG_FRAG}
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    ...(billboard ? {} : { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  });
}

/** Ngọn lửa không nhận đèn, lập lòe, thắp so le như quầng. */
function flameMaterial(shared: Uniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...shared },
    vertexColors: true,
    vertexShader: /* glsl */ `
      uniform float uSang;
      uniform float uTime;
      varying vec3 vCol;
      #include <fog_pars_vertex>
      ${LIT_GLSL}
      void main() {
        vCol = color;
        float seed = seedOf();
        float lit = litOf(uSang, seed);
        float flick = flickOf(uTime, seed);
        // Lửa cao thấp theo nhịp lập lòe (0,8–1,15 lần), ngọn đung đưa.
        vec3 p = position * lit;
        p.y *= 0.8 + (flick - 0.72) / 0.28 * 0.35;
        p.x += sin(uTime * 7.0 + seed * 30.0) * 0.07 * position.y;
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCol;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(vCol, 1.0);
        #include <fog_fragment>
        #include <colorspace_fragment>
      }`,
    fog: true,
  });
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, n: number, order: number): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  m.count = n;
  m.frustumCulled = false;
  m.renderOrder = order;
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

/**
 * Đuốc cắm ở công trình: dựng lại khi công trình đổi (`set`), mỗi khung chỉ đổi đồng phục (`update`). Cán đuốc mọc
 * lên dần lúc chiều tà (đổi ma trận khi độ tối đổi), lửa, quầng, vũng sáng thắp so le trong shader.
 */
export class DuocLayer {
  readonly group = new THREE.Group();
  private readonly shared: Uniforms = { uSang: { value: 0 }, uTime: { value: 0 } };
  private readonly flameMat = flameMaterial(this.shared);
  private readonly haloMat = glowMaterial(0xffa048, 0.55, 0.0, true, this.shared);
  private readonly poolMat = glowMaterial(0xff9440, 0.32, 0.0, false, this.shared);
  private poles?: THREE.InstancedMesh;
  private poleInk?: THREE.InstancedMesh;
  private parts: THREE.InstancedMesh[] = [];
  private spots: DuocSpot[] = [];
  private poleSang = -1;

  constructor() {
    this.group.name = 'duoc';
    this.group.visible = false;
  }

  /** Dựng lại theo danh sách chỗ đuốc mới. */
  set(spots: DuocSpot[]): void {
    this.clear();
    this.spots = spots;
    const cot = spots.filter((s) => s.kind === 'cot');
    this.poles = instanced(POLE.geo, toon, cot.length, 0);
    this.poleInk = instanced(POLE.ink.geometry, POLE.ink.material as THREE.Material, cot.length, 0);
    const flames = instanced(FLAME_GEO, this.flameMat, cot.length, 0);
    const halos = instanced(QUAD, this.haloMat, spots.length, 3);
    const pools = instanced(DISC, this.poolMat, spots.length, 1);
    cot.forEach((s, i) => {
      flames.setMatrixAt(i, tmpM.makeTranslation(s.x, s.y + DUOC_H + 0.06, s.z));
      flames.setColorAt(i, tmpC.setRGB(s.seed, 0, 0));
    });
    spots.forEach((s, i) => {
      const top = s.kind === 'cot' ? DUOC_H + 0.12 : 0;
      tmpM.compose(tmpP.set(s.x, s.y + top, s.z), tmpQ.identity(), tmpS.setScalar(s.kind === 'cot' ? 0.62 : 0.5));
      halos.setMatrixAt(i, tmpM);
      halos.setColorAt(i, tmpC.setRGB(s.seed, 0, 0));
      // Vũng sáng nằm trên đất dưới chân đuốc (lửa sẵn có: dưới tâm lửa, nhỏ hơn).
      const ground = s.kind === 'cot' ? s.y + 0.015 : s.y - 0.3;
      tmpM.compose(tmpP.set(s.x, ground, s.z), tmpQ.identity(), tmpS.setScalar(s.kind === 'cot' ? 0.85 : 0.55));
      pools.setMatrixAt(i, tmpM);
      pools.setColorAt(i, tmpC.setRGB(s.seed, 0, 0));
    });
    this.parts = [flames, halos, pools];
    this.group.add(this.poles, this.poleInk, ...this.parts);
    this.poleSang = -1;
  }

  /** Mỗi khung: độ tối (0 ban ngày, 1 ban đêm) và đồng hồ cảnh (giây) cho lửa lập lòe. */
  update(sang: number, time: number): void {
    this.group.visible = sang > 0.001 && this.spots.length > 0;
    this.shared.uSang.value = sang;
    this.shared.uTime.value = time;
    if (!this.group.visible || !this.poles || Math.abs(sang - this.poleSang) < 0.01) return;
    this.poleSang = sang;
    let i = 0;
    for (const s of this.spots) {
      if (s.kind !== 'cot') continue;
      const k = litOf(sang, s.seed);
      // Cán đuốc mọc lên từ đất khi người ta cắm đuốc; thắp xong thì đứng yên.
      tmpM.compose(tmpP.set(s.x, s.y - DUOC_H * (1 - k), s.z), tmpQ.identity(), tmpS.set(1, 1, 1));
      this.poles.setMatrixAt(i, tmpM);
      this.poleInk!.setMatrixAt(i, tmpM);
      i++;
    }
    this.poles.instanceMatrix.needsUpdate = true;
    this.poleInk!.instanceMatrix.needsUpdate = true;
  }

  private clear(): void {
    for (const m of [this.poles, this.poleInk, ...this.parts]) {
      if (!m) continue;
      this.group.remove(m);
      m.dispose();
    }
    this.parts = [];
    this.poles = this.poleInk = undefined;
  }
}

/**
 * Quầng sáng di động (đèn thuyền, đom đóm): mỗi khung đặt lại chỗ. Một lần vẽ. `color` màu quầng, `size` cỡ quầng,
 * `core` độ rực của nhân.
 */
export class QuangDong {
  readonly mesh: THREE.InstancedMesh;
  private readonly shared: Uniforms = { uSang: { value: 0 }, uTime: { value: 0 } };
  private n = 0;

  constructor(
    readonly cap: number,
    color: number,
    private readonly size: number,
    strength: number,
    core: number,
  ) {
    this.mesh = instanced(QUAD, glowMaterial(color, strength, core, true, this.shared), cap, 3);
    this.mesh.count = 0;
    for (let i = 0; i < cap; i++) this.mesh.setColorAt(i, tmpC.setRGB((i * 0.618) % 1, 0, 0));
  }

  begin(sang: number, time: number): void {
    this.n = 0;
    this.shared.uSang.value = sang;
    this.shared.uTime.value = time;
  }

  add(x: number, y: number, z: number, scale = 1): void {
    if (this.n >= this.cap) return;
    this.mesh.setMatrixAt(this.n++, tmpM.compose(tmpP.set(x, y, z), tmpQ.identity(), tmpS.setScalar(this.size * scale)));
  }

  end(): void {
    this.mesh.count = this.n;
    this.mesh.visible = this.n > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
