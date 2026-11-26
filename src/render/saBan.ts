import * as THREE from 'three';

/**
 * Hiệu ứng sa bàn (tilt-shift) cho kinh đô: giữa màn hình nét, mép trên và mép dưới mờ dần, nhìn như sa bàn thu nhỏ
 * chụp bằng ống kính nghiêng. Chỉ để nhìn, bật tắt ở Cài đặt (lưu riêng từng máy), mặc định tắt.
 *
 * Cách vẽ: cảnh vẽ vào tấm ảnh ẩn có khử răng cưa (MSAA, lưu sRGB 8 bit cho khỏi vằn màu tối), rồi hai lượt làm mờ
 * Gauss 9 điểm, ngang rồi dọc, bán kính theo chỗ cao thấp trên màn hình (`doMo`). Lượt dọc vẽ thẳng ra màn hình. Dải
 * nét giữa màn hình chỉ lấy một điểm ảnh nên rẻ.
 */
export const SA_BAN = {
  /** Đường nét nhất (phần chiều cao màn hình, 0 là đáy). */
  giua: 0.5,
  /** Nửa bề cao dải nét hẳn quanh `giua` (phần cạnh dài màn hình). */
  net: 0.12,
  /** Bề cao dải chuyển từ nét sang mờ hẳn (phần cạnh dài màn hình). */
  doc: 0.3,
  /** Bán kính mờ ở mép màn hình (điểm ảnh CSS) ở độ phóng mặc định. */
  mo: 4.5,
} as const;

/**
 * Dải nét, dải chuyển tính theo phần chiều cao màn hình: đo theo cạnh dài nên màn dọc mờ rõ ở trên, dưới, còn máy
 * cầm ngang (màn thấp) dải nét rộng ra, chỉ mờ nhẹ ở mép, khỏi mờ cả mái Điện.
 */
export function daiNet(rong: number, cao: number): { net: number; doc: number } {
  const k = Math.max(rong, cao) / Math.max(1, cao);
  return { net: SA_BAN.net * k, doc: SA_BAN.doc * k };
}

/** Mức mờ 0..1 ở độ cao `y` trên màn hình (0 đáy, 1 đỉnh) cỡ `rong` × `cao`: 0 trong dải nét, tới 1 ở mép. Giống hệt shader. */
export function doMo(y: number, rong: number, cao: number): number {
  const { net, doc } = daiNet(rong, cao);
  return THREE.MathUtils.smoothstep(Math.abs(y - SA_BAN.giua), net, net + doc);
}

/**
 * Bán kính mờ ở mép (điểm ảnh của khung vẽ) theo độ phóng camera và tỉ lệ điểm ảnh: kéo ra xa thì mờ hơn cho ra dáng
 * sa bàn, phóng gần thì nhạt dần (nhìn gần mà mờ thì khó chọn công trình).
 */
export function banKinh(zoom: number, tiLe: number): number {
  const k = THREE.MathUtils.clamp(1.25 - 0.35 * zoom, 0.3, 1.15);
  return SA_BAN.mo * k * tiLe;
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/** Lượt làm mờ một chiều; `RA_MAN` thì đổi màu ra không gian màu màn hình (lượt cuối vẽ thẳng ra màn hình). */
function fragOf(raMan: boolean): string {
  return /* glsl */ `
uniform sampler2D tMau;
uniform vec2 uBuoc;
uniform vec4 uDai;
varying vec2 vUv;
void main() {
  float r = uDai.w * smoothstep(uDai.y, uDai.y + uDai.z, abs(vUv.y - uDai.x));
  vec4 s;
  if (r < 0.3) {
    s = texture2D(tMau, vUv);
  } else {
    vec2 d = uBuoc * (r * 0.25);
    s = texture2D(tMau, vUv) * 0.1633;
    s += (texture2D(tMau, vUv - d) + texture2D(tMau, vUv + d)) * 0.1531;
    s += (texture2D(tMau, vUv - 2.0 * d) + texture2D(tMau, vUv + 2.0 * d)) * 0.12245;
    s += (texture2D(tMau, vUv - 3.0 * d) + texture2D(tMau, vUv + 3.0 * d)) * 0.0918;
    s += (texture2D(tMau, vUv - 4.0 * d) + texture2D(tMau, vUv + 4.0 * d)) * 0.051;
  }
  gl_FragColor = vec4(s.rgb, 1.0);
  ${raMan ? '#include <colorspace_fragment>' : ''}
}`;
}

function anhAn(w: number, h: number, samples: number): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    samples,
    depthBuffer: samples > 0,
    stencilBuffer: false,
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  return rt;
}

export class SaBan {
  /** Ảnh cảnh có khử răng cưa, và ảnh sau lượt mờ ngang. */
  private canh: THREE.WebGLRenderTarget;
  private ngang: THREE.WebGLRenderTarget;
  private readonly matNgang: THREE.ShaderMaterial;
  private readonly matDoc: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly scene = new THREE.Scene();
  private readonly cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly co = new THREE.Vector2();
  private readonly samples: number;

  constructor(renderer: THREE.WebGLRenderer) {
    this.samples = Math.min(4, renderer.capabilities.maxSamples);
    renderer.getDrawingBufferSize(this.co);
    this.canh = anhAn(this.co.x, this.co.y, this.samples);
    this.ngang = anhAn(this.co.x, this.co.y, 0);
    const mat = (raMan: boolean) =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: fragOf(raMan),
        uniforms: {
          tMau: { value: null },
          uBuoc: { value: new THREE.Vector2() },
          uDai: { value: new THREE.Vector4() },
        },
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
    this.matNgang = mat(false);
    this.matDoc = mat(true);
    // Một tam giác phủ kín màn hình.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new THREE.Mesh(geo, this.matNgang);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** Theo cỡ khung vẽ của renderer (gọi sau `setSize`, `setPixelRatio`). */
  resize(renderer: THREE.WebGLRenderer): void {
    renderer.getDrawingBufferSize(this.co);
    this.canh.setSize(this.co.x, this.co.y);
    this.ngang.setSize(this.co.x, this.co.y);
  }

  /** Vẽ cảnh qua hiệu ứng ra màn hình; `banKinh` là bán kính mờ ở mép (điểm ảnh khung vẽ). */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Object3D, camera: THREE.Camera, banKinh: number): void {
    const w = this.canh.width;
    const h = this.canh.height;
    // Đếm lệnh vẽ, tam giác của cả ba lượt (đo lag), không chỉ lượt cuối.
    const info = renderer.info;
    const autoReset = info.autoReset;
    if (autoReset) info.reset();
    info.autoReset = false;

    renderer.setRenderTarget(this.canh);
    renderer.render(scene, camera);

    this.quad.material = this.matNgang;
    const { net, doc } = daiNet(w, h);
    let u = this.matNgang.uniforms;
    u.tMau.value = this.canh.texture;
    (u.uBuoc.value as THREE.Vector2).set(1 / w, 0);
    (u.uDai.value as THREE.Vector4).set(SA_BAN.giua, net, doc, banKinh);
    renderer.setRenderTarget(this.ngang);
    renderer.render(this.scene, this.cam);

    this.quad.material = this.matDoc;
    u = this.matDoc.uniforms;
    u.tMau.value = this.ngang.texture;
    (u.uBuoc.value as THREE.Vector2).set(0, 1 / h);
    (u.uDai.value as THREE.Vector4).set(SA_BAN.giua, net, doc, banKinh);
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.cam);

    info.autoReset = autoReset;
  }

  dispose(): void {
    this.canh.dispose();
    this.ngang.dispose();
    this.matNgang.dispose();
    this.matDoc.dispose();
    this.quad.geometry.dispose();
  }
}
