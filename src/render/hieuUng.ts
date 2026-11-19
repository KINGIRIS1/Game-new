// Hiệu ứng kỹ năng tướng dùng chung: sóng xung kích, lóe sáng, tia lửa, cột sáng, vệt chém, bụi cuộn, hạt sáng bay
// lên, dải mũi tên báo đường lao, vòng hoa văn trống đồng, sao choáng. Mỗi hiệu ứng tự lớn, mờ rồi tự gỡ; BattleView
// gọi `update` mỗi khung và `clear` khi đổi trận. Ảnh mẫu (vòng sáng, vệt, mũi tên...) vẽ một lần bằng canvas, lúc
// cần tới lần đầu. Không đọc luật trận: chỗ, giờ, cỡ do người gọi đưa vào (tọa độ trong nhóm `root`).

import * as THREE from 'three';
import { seeded } from './shapes';
import { drumWaveTex } from './toon';

type V3 = THREE.Vector3;

/** Một hiệu ứng đang chạy: `k` là phần đã qua của đời (0..1), chưa tới `delay` thì ẩn. */
interface Fx {
  obj: THREE.Object3D;
  age: number;
  delay: number;
  life: number;
  tick: (k: number, dt: number) => void;
  /** Gỡ thêm (chất liệu, hình, ảnh riêng). */
  drop: () => void;
}

// ---------- Ảnh mẫu ----------

const texCache = new Map<string, THREE.Texture>();
/** Ảnh vẽ bằng canvas một lần, theo tên. */
function canvasTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Texture {
  let t = texCache.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

/** Quầng sáng tròn: giữa trắng đặc, mờ dần ra mép. */
const glowTex = () =>
  canvasTex('glow', 128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    r.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  });

/** Sóng xung kích nằm trên đất: dải sáng dày ở mép, trong lòng sáng nhạt. */
const socTex = () =>
  canvasTex('soc', 256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,0.12)');
    r.addColorStop(0.55, 'rgba(255,255,255,0.22)');
    r.addColorStop(0.8, 'rgba(255,255,255,0.75)');
    r.addColorStop(0.9, 'rgba(255,255,255,1)');
    r.addColorStop(0.96, 'rgba(255,255,255,0.6)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  });

/** Lõi trắng mảnh của sóng xung kích (cộng sáng lên lớp màu). */
const socCoreTex = () =>
  canvasTex('socCore', 256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,0)');
    r.addColorStop(0.84, 'rgba(255,255,255,0)');
    r.addColorStop(0.9, 'rgba(255,255,255,1)');
    r.addColorStop(0.95, 'rgba(255,255,255,0)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  });

/** Cột sáng: đặc ở chân, mờ dần lên ngọn, có vệt dọc so le. */
const cotTex = () =>
  canvasTex('cot', 128, 128, (g, w, h) => {
    const lin = g.createLinearGradient(0, h, 0, 0);
    lin.addColorStop(0, 'rgba(255,255,255,1)');
    lin.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    lin.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lin;
    g.fillRect(0, 0, w, h);
    const rand = seeded(7);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(0,0,0,${0.25 + rand() * 0.45})`;
      g.fillRect(rand() * w, 0, 2 + rand() * 6, h);
    }
  });

/** Vệt chém hình trăng lưỡi liềm: u dọc vệt (đuôi 0, đầu 1), v ngang (trong 0, ngoài 1). */
const chemTex = (core: boolean) =>
  canvasTex(core ? 'chemCore' : 'chem', 256, 64, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      // Hàng trên của canvas là v = 1 (mép ngoài).
      const v = 1 - y / (h - 1);
      const across = core ? Math.exp(-((v - 0.78) ** 2) / 0.006) : Math.max(0, Math.sin(Math.PI * v)) ** 0.7 * (0.35 + 0.65 * v);
      for (let x = 0; x < w; x++) {
        const u = x / (w - 1);
        const along = u ** 1.4 * Math.min(1, (1 - u) * 12);
        const i = (y * w + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(255 * Math.min(1, along * across));
      }
    }
    g.putImageData(img, 0, 0);
  });

/** Mũi tên chữ V lặp dọc đường lao, mũi chĩa theo u tăng. */
const vTex = () => {
  const t = canvasTex('vach', 128, 64, (g, w, h) => {
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,1)';
    g.beginPath();
    g.moveTo(w * 0.2, h * 0.08);
    g.lineTo(w * 0.62, h * 0.5);
    g.lineTo(w * 0.2, h * 0.92);
    g.lineTo(w * 0.42, h * 0.92);
    g.lineTo(w * 0.84, h * 0.5);
    g.lineTo(w * 0.42, h * 0.08);
    g.closePath();
    g.fill();
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
};

/** Ngôi sao bốn cánh lấp lánh. */
const saoTex = () =>
  canvasTex('sao', 64, 64, (g, w) => {
    const m = w / 2;
    const r = g.createRadialGradient(m, m, 0, m, m, m * 0.45);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
    g.fillStyle = 'rgba(255,255,255,1)';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const d = i % 2 ? m * 0.16 : m * 0.95;
      g.lineTo(m + Math.cos(a) * d, m + Math.sin(a) * d);
    }
    g.closePath();
    g.fill();
  });

/** Mai rùa: lưới lục giác sáng ở cạnh, trong ô sáng nhạt, mép dưới sáng đậm (vòm che chở của Rùa Vàng). */
const maiTex = () => {
  const t = canvasTex('mai', 256, 256, (g, w, h) => {
    const lin = g.createLinearGradient(0, h, 0, 0);
    lin.addColorStop(0, 'rgba(255,255,255,0.35)');
    lin.addColorStop(0.4, 'rgba(255,255,255,0.04)');
    lin.addColorStop(1, 'rgba(255,255,255,0.1)');
    g.fillStyle = lin;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,1)';
    g.lineWidth = 5;
    const r = w / 8;
    const dx = r * Math.sqrt(3);
    for (let row = -1; row < h / (r * 1.5) + 1; row++) {
      for (let col = -1; col < w / dx + 1; col++) {
        const cx = col * dx + (row % 2 ? dx / 2 : 0);
        const cy = row * r * 1.5;
        g.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          g.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
        }
        g.stroke();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/** Bụi cuộn kiểu hoạt hình: đĩa đặc, mép mềm, vành sẫm hơn một chút. */
const buiTex = () =>
  canvasTex('bui', 128, 128, (g, w) => {
    const m = w / 2;
    const r = g.createRadialGradient(m, m * 0.85, 0, m, m, m);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.6, 'rgba(235,235,235,0.95)');
    r.addColorStop(0.82, 'rgba(200,200,200,0.7)');
    r.addColorStop(1, 'rgba(200,200,200,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  });

/** Vệt nứt chém trên đất: dải mực nhọn hai đầu. */
const vetTex = () =>
  canvasTex('vet', 256, 32, (g, w, h) => {
    g.fillStyle = 'rgba(255,255,255,1)';
    g.beginPath();
    g.moveTo(0, h / 2);
    g.quadraticCurveTo(w / 2, -h * 0.2, w, h / 2);
    g.quadraticCurveTo(w / 2, h * 1.2, 0, h / 2);
    g.fill();
  });

// ---------- Hình dựng sẵn ----------

const discGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
const cotGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0);
const planeGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const sparkGeo = new THREE.BoxGeometry(1, 1, 1);
/** Vòm nửa cầu (mai rùa che chở), gốc ở tâm đáy. */
const vomGeo = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
/** Màu lửa theo tuổi hạt: trắng vàng ở mõm, vàng cam, cam đỏ, đỏ sẫm rồi tàn. */
const LUA_MAU = [0xfff3b0, 0xffd04a, 0xffa030, 0xff7020, 0xe84a18, 0xb83214, 0x7a2a1a, 0x4a2a20];
const LUA_SANG = [0.55, 0.7, 0.75, 0.7, 0.6, 0.45, 0.28, 0.1];
const Z = new THREE.Vector3(0, 0, 1);

/** Trăng lưỡi liềm bán kính 1 trong mặt XY, cung `arc` radian quanh trục +x, dày nhất gần đầu. */
function crescentGeo(arc: number): THREE.BufferGeometry {
  const n = 32;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = -arc / 2 + arc * t;
    const w = 0.38 * Math.sin(Math.PI * t ** 0.75);
    for (const [r, v] of [
      [1 - w, 0],
      [1, 1],
    ]) {
      pos.push(Math.cos(a) * r, Math.sin(a) * r, 0);
      uv.push(t, v);
    }
    if (i < n) {
      const b = i * 2;
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
const crescent = crescentGeo(2.4);

const easeOut = (k: number) => 1 - (1 - k) ** 3;
const flash = (k: number) => (k < 0.15 ? k / 0.15 : (1 - k) / 0.85);

function mat(color: number, map: THREE.Texture | null, add: boolean, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    map,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });
}

function spriteMat(color: number, map: THREE.Texture, add: boolean): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({
    color,
    map,
    transparent: true,
    depthWrite: false,
    blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });
}

interface Chung {
  mau: number;
  /** Giây chờ trước khi hiện. */
  delay?: number;
  /** Đời hiệu ứng (giây). */
  life?: number;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpV = new THREE.Vector3();

export class HieuUng {
  private readonly fx: Fx[] = [];
  private rand = seeded(1);

  constructor(private readonly root: THREE.Object3D) {}

  private push(obj: THREE.Object3D, o: Chung, life: number, tick: Fx['tick'], drop: () => void, parent = this.root): void {
    obj.visible = false;
    parent.add(obj);
    this.fx.push({ obj, age: 0, delay: o.delay ?? 0, life: o.life ?? life, tick, drop });
  }

  /** Sóng xung kích loang trên mặt đất tới bán kính `r`; `thu` thì co từ `r` vào (vòng ngắm). */
  soc(p: V3, o: Chung & { r: number; thu?: boolean; loi?: boolean; sang?: number }): void {
    const g = new THREE.Group();
    g.position.copy(p);
    g.position.y += 0.07;
    const m1 = mat(o.mau, socTex(), false, 0.95);
    const m2 = mat(0xffffff, socCoreTex(), true);
    const a = new THREE.Mesh(discGeo, m1);
    const b = new THREE.Mesh(discGeo, m2);
    a.renderOrder = b.renderOrder = 4;
    g.add(a);
    if (o.loi !== false) g.add(b);
    this.push(
      g,
      o,
      0.7,
      (k) => {
        const s = o.thu ? o.r * (1 - 0.65 * easeOut(k)) : o.r * (0.15 + 0.85 * easeOut(k));
        g.scale.setScalar(s);
        const f = o.thu ? Math.min(1, k * 5) * (k > 0.85 ? (1 - k) / 0.15 : 1) : (1 - k) ** 1.4;
        m1.opacity = 0.95 * f * (o.sang ?? 1);
        m2.opacity = f * (o.sang ?? 1);
      },
      () => {
        m1.dispose();
        m2.dispose();
      },
    );
  }

  /** Lóe sáng tròn cộng sáng, bừng rồi tắt nhanh. */
  loe(p: V3, o: Chung & { size: number }): void {
    const m = spriteMat(o.mau, glowTex(), true);
    const s = new THREE.Sprite(m);
    s.position.copy(p);
    s.renderOrder = 5;
    this.push(
      s,
      o,
      0.35,
      (k) => {
        s.scale.setScalar(o.size * (0.4 + 0.6 * easeOut(Math.min(1, k * 2))));
        m.opacity = flash(k);
      },
      () => m.dispose(),
    );
  }

  /**
   * Tia lửa bắn tóe: `n` vệt sáng dài theo hướng bay, chậm dần, rơi xuống. `yaw` (radian, trục x trong root là 0) và
   * `xoe` cho hướng tóe; không có `yaw` thì tóe tròn. `len` là độ dài vệt lúc đầu.
   */
  tia(p: V3, o: Chung & { n: number; toc: number; len?: number; day?: number; len0?: number; yaw?: number; xoe?: number; len1?: number; up?: number }): void {
    const m = mat(o.mau, null, true);
    const inst = new THREE.InstancedMesh(sparkGeo, m, o.n);
    inst.frustumCulled = false;
    inst.renderOrder = 5;
    inst.position.copy(p);
    const dirs: { d: THREE.Vector3; v: number }[] = [];
    for (let i = 0; i < o.n; i++) {
      const yaw = o.yaw === undefined ? this.rand() * Math.PI * 2 : o.yaw + (this.rand() - 0.5) * (o.xoe ?? 1.2);
      const up = (o.up ?? 0.5) * (0.4 + this.rand() * 0.9);
      const d = new THREE.Vector3(Math.cos(yaw), up, -Math.sin(yaw)).normalize();
      dirs.push({ d, v: o.toc * (0.5 + this.rand() * 0.7) });
    }
    const len = o.len ?? 0.5;
    const day = o.day ?? 0.06;
    this.push(
      inst,
      o,
      0.55,
      (k) => {
        const t = k * (o.life ?? 0.55);
        dirs.forEach(({ d, v }, i) => {
          const go = (v * (1 - Math.exp(-4 * t))) / 4;
          tmpP.copy(d).multiplyScalar(go);
          tmpP.y -= 2.2 * t * t;
          tmpV.copy(d).multiplyScalar(v * Math.exp(-4 * t));
          tmpV.y -= 4.4 * t;
          tmpQ.setFromUnitVectors(Z, tmpV.normalize());
          const fade = 1 - k;
          tmpS.set(day * fade + 0.005, day * fade + 0.005, len * fade + 0.01);
          inst.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
        });
        inst.instanceMatrix.needsUpdate = true;
        m.opacity = Math.min(1, (1 - k) * 2);
      },
      () => {
        inst.dispose();
        m.dispose();
      },
    );
  }

  /** Cột sáng từ đất vụt lên cao `h`, bán kính `r`, rồi thu mảnh lại và tắt; `sang` là độ sáng (mặc định 1). */
  cot(p: V3, o: Chung & { r: number; h: number; sang?: number }): void {
    const m = mat(o.mau, cotTex(), true);
    const c = new THREE.Mesh(cotGeo, m);
    c.position.copy(p);
    c.renderOrder = 5;
    this.push(
      c,
      o,
      0.9,
      (k) => {
        const up = easeOut(Math.min(1, k * 3));
        c.scale.set(o.r * (1 - 0.6 * k), o.h * up, o.r * (1 - 0.6 * k));
        c.rotation.y = k * 2;
        m.opacity = (o.sang ?? 1) * flash(k);
      },
      () => m.dispose(),
    );
  }

  /**
   * Vệt chém lưỡi liềm bán kính `r` trong mặt đứng: `yaw` là hướng mặt phẳng vệt (radian quanh trục đứng), `nghieng`
   * nghiêng vệt khỏi phương ngang (chém chéo); `nam` thì vệt nằm ngang, mở về hướng `yaw`. Vệt quét nhanh một đoạn rồi mờ.
   */
  chem(p: V3, o: Chung & { r: number; yaw: number; nghieng?: number; quet?: number; nam?: boolean }): void {
    const g = new THREE.Group();
    g.position.copy(p);
    g.rotation.order = 'YXZ';
    g.rotation.y = o.yaw;
    // Nằm ngang (chém quét): cung trăng mở về hướng `yaw`, nhìn từ trên xuống vẫn rõ.
    if (o.nam) g.rotation.x = -Math.PI / 2;
    const inner = new THREE.Group();
    inner.rotation.z = o.nghieng ?? 0.5;
    g.add(inner);
    const sweep = new THREE.Group();
    inner.add(sweep);
    const m1 = mat(o.mau, chemTex(false), true);
    const m2 = mat(0xffffff, chemTex(true), true);
    const a = new THREE.Mesh(crescent, m1);
    const b = new THREE.Mesh(crescent, m2);
    a.renderOrder = b.renderOrder = 6;
    sweep.add(a, b);
    const quet = o.quet ?? 1.6;
    this.push(
      g,
      o,
      0.42,
      (k) => {
        const s = easeOut(Math.min(1, k * 2.5));
        sweep.rotation.z = -quet / 2 + quet * s;
        g.scale.setScalar(o.r * (0.85 + 0.25 * s));
        const f = k < 0.1 ? k / 0.1 : (1 - k) / 0.9;
        m1.opacity = f;
        m2.opacity = f;
      },
      () => {
        m1.dispose();
        m2.dispose();
      },
    );
  }

  /** Một cụm bụi cuộn: phồng to, trôi theo `bay`, bốc nhẹ lên, mờ dần. */
  bui(p: V3, o: Chung & { size: number; bay?: V3 }): void {
    const m = spriteMat(o.mau, buiTex(), false);
    const s = new THREE.Sprite(m);
    s.position.copy(p);
    s.renderOrder = 3;
    const from = p.clone();
    const spin = (this.rand() - 0.5) * 2;
    this.push(
      s,
      o,
      0.9,
      (k) => {
        const e = easeOut(k);
        s.scale.setScalar(o.size * (0.45 + 0.75 * e));
        s.position.copy(from);
        if (o.bay) s.position.addScaledVector(o.bay, e);
        s.position.y += 0.5 * e;
        m.rotation = spin * k;
        m.opacity = 0.85 * Math.min(1, k * 8) * (1 - k) ** 1.2;
      },
      () => m.dispose(),
    );
  }

  /** Hạt sáng lấp lánh bay lên trong vòng bán kính `r`, lắc nhẹ, cao tới `h`. */
  hat(p: V3, o: Chung & { n: number; r: number; h: number; size?: number }): void {
    const g = new THREE.Group();
    g.position.copy(p);
    const m = spriteMat(o.mau, saoTex(), true);
    const parts: { s: THREE.Sprite; x: number; z: number; d: number; ph: number; sp: number }[] = [];
    for (let i = 0; i < o.n; i++) {
      const s = new THREE.Sprite(m);
      s.renderOrder = 6;
      const a = this.rand() * Math.PI * 2;
      const d = Math.sqrt(this.rand()) * o.r;
      parts.push({ s, x: Math.cos(a) * d, z: Math.sin(a) * d, d: this.rand() * 0.4, ph: this.rand() * 6, sp: 0.7 + this.rand() * 0.6 });
      g.add(s);
    }
    const size = o.size ?? 0.28;
    this.push(
      g,
      o,
      1.2,
      (k) => {
        for (const q of parts) {
          const t = Math.max(0, (k - q.d) / (1 - q.d));
          q.s.visible = t > 0 && t < 1;
          q.s.position.set(q.x + Math.sin(t * 6 + q.ph) * 0.12, o.h * t * q.sp, q.z);
          q.s.scale.setScalar(size * Math.sin(Math.PI * t) * (0.7 + 0.3 * Math.sin(t * 20 + q.ph)));
        }
      },
      () => m.dispose(),
    );
  }

  /** Dải mũi tên chữ V trên đất từ `a` tới `b` rộng `rong`, chạy dồn về phía `b`: báo đường lao. */
  duong(a: V3, b: V3, o: Chung & { rong: number }): void {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const t = vTex().clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, Math.round((len / o.rong) * 1.4)), 1);
    const m = mat(o.mau, t, false);
    const p = new THREE.Mesh(planeGeo, m);
    p.position.set((a.x + b.x) / 2, Math.max(a.y, b.y) + 0.08, (a.z + b.z) / 2);
    p.rotation.y = Math.atan2(-dz, dx);
    p.scale.set(len, 1, o.rong);
    p.renderOrder = 4;
    this.push(
      p,
      o,
      1.2,
      (k, dt) => {
        t.offset.x -= dt * 2.5;
        m.opacity = 0.85 * Math.min(1, k * 6) * Math.min(1, (1 - k) * 4);
      },
      () => {
        m.dispose();
        t.dispose();
      },
    );
  }

  /** Vòng hoa văn mặt trống đồng trên đất, nở tới bán kính `r`, xoay chậm, sáng lên rồi mờ. */
  vong(p: V3, o: Chung & { r: number }): void {
    const g = new THREE.Group();
    g.position.copy(p);
    g.position.y += 0.06;
    const m1 = mat(o.mau, drumWaveTex, false);
    const m2 = mat(o.mau, glowTex(), true, 0.5);
    const a = new THREE.Mesh(discGeo, m1);
    const b = new THREE.Mesh(discGeo, m2);
    a.renderOrder = 4;
    b.renderOrder = 3;
    g.add(b, a);
    this.push(
      g,
      o,
      1.6,
      (k) => {
        g.scale.setScalar(o.r * (0.3 + 0.7 * easeOut(Math.min(1, k * 2.5))));
        a.rotation.y = k * 1.2;
        const f = Math.min(1, k * 6) * Math.min(1, (1 - k) * 3);
        m1.opacity = 0.95 * f;
        m2.opacity = 0.45 * f;
      },
      () => {
        m1.dispose();
        m2.dispose();
      },
    );
  }

  /** Vệt chém để lại trên đất dài `dai`, hướng `yaw`, sẫm màu rồi phai. */
  vet(p: V3, o: Chung & { dai: number; yaw: number }): void {
    const m = mat(o.mau, vetTex(), false, 0.7);
    const v = new THREE.Mesh(planeGeo, m);
    v.position.copy(p);
    v.position.y += 0.05;
    v.rotation.y = o.yaw;
    v.renderOrder = 3;
    this.push(
      v,
      o,
      2,
      (k) => {
        v.scale.set(o.dai * easeOut(Math.min(1, k * 8)), 1, o.dai * 0.12);
        m.opacity = 0.75 * Math.min(1, (1 - k) * 2);
      },
      () => m.dispose(),
    );
  }

  /** Ba ngôi sao vàng xoay vòng trên đầu người bị choáng (gắn vào mô hình người ấy nên đi theo). */
  choang(obj: THREE.Object3D, o: Chung & { cao: number }): void {
    const g = new THREE.Group();
    const s0 = obj.scale.x || 1;
    g.position.y = o.cao / s0;
    g.scale.setScalar(1 / s0);
    const m = spriteMat(o.mau, saoTex(), true);
    const stars = [0, 1, 2].map(() => {
      const s = new THREE.Sprite(m);
      s.renderOrder = 6;
      g.add(s);
      return s;
    });
    this.push(
      g,
      o,
      1.5,
      (k) => {
        stars.forEach((s, i) => {
          const a = k * 14 + (i / 3) * Math.PI * 2;
          s.position.set(Math.cos(a) * 0.32, Math.sin(a * 2) * 0.04, Math.sin(a) * 0.32);
          s.scale.setScalar(0.26 * Math.min(1, k * 8, (1 - k) * 6));
        });
      },
      () => m.dispose(),
      obj,
    );
  }

  /**
   * Lửa phun liên tục từ điểm `local` trong khung của `src` (mõm ngựa sắt), phun theo trục +z của `src`, suốt `life`
   * giây: hạt lửa cộng sáng bay ra, nở to, đổi màu từ trắng vàng sang đỏ rồi tàn; hạt đã ra khỏi mõm ở lại cảnh nên
   * thành luồng dài phía sau khi ngựa phi.
   */
  phun(src: THREE.Object3D, local: V3, o: Chung & { toc?: number; size?: number; rate?: number }): void {
    const g = new THREE.Group();
    const mats = LUA_MAU.map((c) => spriteMat(c, glowTex(), true));
    const parts: { s: THREE.Sprite; p: THREE.Vector3; v: THREE.Vector3; age: number; life: number; size: number }[] = [];
    const life = o.life ?? 0.75;
    const rate = o.rate ?? 90;
    const toc = o.toc ?? 9;
    const size = o.size ?? 1;
    let carry = 0;
    const inv = new THREE.Matrix4();
    const tmpD = new THREE.Vector3();
    this.push(
      g,
      o,
      life + 0.6,
      (k, dt) => {
        const t = k * (life + 0.6);
        this.root.updateWorldMatrix(true, false);
        inv.copy(this.root.matrixWorld).invert();
        if (t < life && src.parent) {
          src.updateWorldMatrix(true, false);
          const from = src.localToWorld(local.clone()).applyMatrix4(inv);
          tmpD.set(0, 0, 1).transformDirection(src.matrixWorld).transformDirection(inv);
          carry += rate * dt;
          for (; carry >= 1; carry--) {
            const v = tmpD.clone().multiplyScalar(toc * (0.75 + this.rand() * 0.5));
            v.x += (this.rand() - 0.5) * toc * 0.4;
            v.z += (this.rand() - 0.5) * toc * 0.4;
            v.y += (this.rand() - 0.4) * toc * 0.2;
            const s = new THREE.Sprite(mats[0]);
            s.renderOrder = 6;
            g.add(s);
            parts.push({ s, p: from.clone(), v, age: 0, life: 0.35 + this.rand() * 0.25, size: size * (0.8 + this.rand() * 0.5) });
          }
        }
        for (let i = parts.length - 1; i >= 0; i--) {
          const q = parts[i];
          q.age += dt;
          const a = q.age / q.life;
          if (a >= 1) {
            q.s.removeFromParent();
            parts.splice(i, 1);
            continue;
          }
          q.v.multiplyScalar(Math.exp(-3 * dt));
          q.v.y += 2.5 * dt;
          q.p.addScaledVector(q.v, dt);
          q.s.position.copy(q.p);
          const b = Math.min(LUA_MAU.length - 1, Math.floor(a * LUA_MAU.length));
          q.s.material = mats[b];
          mats[b].opacity = LUA_SANG[b];
          q.s.scale.setScalar(q.size * (0.25 + 1.1 * Math.sqrt(a)));
        }
      },
      () => mats.forEach((m) => m.dispose()),
    );
  }

  /** Lửa cháy trên người trúng lửa: ngọn lửa nhỏ bốc lên liên tục trong `life` giây, gắn vào mô hình nên đi theo. */
  chay(obj: THREE.Object3D, o: Chung & { cao: number; size?: number }): void {
    const g = new THREE.Group();
    const s0 = obj.scale.x || 1;
    g.scale.setScalar(1 / s0);
    const mats = LUA_MAU.map((c) => spriteMat(c, glowTex(), true));
    const parts: { s: THREE.Sprite; x: number; z: number; y: number; age: number; life: number }[] = [];
    const life = o.life ?? 2;
    const size = o.size ?? 0.5;
    let carry = 0;
    this.push(
      g,
      o,
      life,
      (k, dt) => {
        if (k < 0.9) {
          carry += 30 * dt;
          for (; carry >= 1; carry--) {
            const s = new THREE.Sprite(mats[0]);
            s.renderOrder = 6;
            g.add(s);
            parts.push({ s, x: (this.rand() - 0.5) * 0.4, z: (this.rand() - 0.5) * 0.4, y: o.cao * (0.2 + this.rand() * 0.5), age: 0, life: 0.3 + this.rand() * 0.25 });
          }
        }
        const fade = Math.min(1, (1 - k) * 5);
        for (let i = parts.length - 1; i >= 0; i--) {
          const q = parts[i];
          q.age += dt;
          const a = q.age / q.life;
          if (a >= 1) {
            q.s.removeFromParent();
            parts.splice(i, 1);
            continue;
          }
          q.s.position.set(q.x * (1 - a), q.y + a * o.cao * 0.6, q.z * (1 - a));
          const b = Math.min(LUA_MAU.length - 1, Math.floor(a * LUA_MAU.length));
          q.s.material = mats[b];
          mats[b].opacity = LUA_SANG[b] * fade;
          q.s.scale.setScalar(size * (1 - 0.6 * a) * fade);
        }
      },
      () => mats.forEach((m) => m.dispose()),
      obj,
    );
  }

  /**
   * Vòm mai rùa vàng che chở bán kính `r`: nở lên từ đất, lưới lục giác trôi chậm, đứng một lúc rồi tan; dưới đất có
   * vòng lục giác sáng.
   */
  khien(p: V3, o: Chung & { r: number }): void {
    const g = new THREE.Group();
    g.position.copy(p);
    const t1 = maiTex().clone();
    t1.needsUpdate = true;
    t1.repeat.set(4, 1.5);
    const m1 = mat(o.mau, t1, true);
    m1.side = THREE.FrontSide;
    const m2 = mat(o.mau, t1, true);
    m2.side = THREE.BackSide;
    const dome = new THREE.Mesh(vomGeo, m1);
    const back = new THREE.Mesh(vomGeo, m2);
    dome.renderOrder = 6;
    back.renderOrder = 5;
    const t2 = maiTex().clone();
    t2.needsUpdate = true;
    t2.repeat.set(3, 3);
    const m3 = mat(o.mau, t2, true);
    const floor = new THREE.Mesh(discGeo, m3);
    floor.position.y = 0.07;
    floor.renderOrder = 4;
    g.add(back, dome, floor);
    this.push(
      g,
      o,
      2,
      (k, dt) => {
        const up = easeOut(Math.min(1, k * 4));
        g.scale.set(o.r * (0.6 + 0.4 * up), o.r * 0.75 * up, o.r * (0.6 + 0.4 * up));
        floor.scale.set(1, 1, 1);
        t1.offset.y -= dt * 0.15;
        t1.offset.x += dt * 0.05;
        const f = Math.min(1, k * 5) * Math.min(1, (1 - k) * 3.5);
        const pulse = 0.85 + 0.15 * Math.sin(k * 20);
        m1.opacity = 0.32 * f * pulse;
        m2.opacity = 0.12 * f;
        m3.opacity = 0.22 * f;
      },
      () => {
        [m1, m2, m3].forEach((m) => m.dispose());
        t1.dispose();
        t2.dispose();
      },
    );
  }

  update(dt: number): void {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.age += dt;
      const t = f.age - f.delay;
      if (t < 0) continue;
      const k = Math.min(1, t / f.life);
      f.obj.visible = true;
      f.tick(k, dt);
      if (k >= 1) {
        f.obj.removeFromParent();
        f.drop();
        this.fx.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const f of this.fx) {
      f.obj.removeFromParent();
      f.drop();
    }
    this.fx.length = 0;
    this.rand = seeded(1);
  }
}
