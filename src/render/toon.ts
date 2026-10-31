// Chất liệu "Nét Đông Sơn": tô màu hoạt hình 3 dải sáng, viền mực đen, hoa văn trống đồng vẽ bằng canvas.

import * as THREE from 'three';
import { C } from './palette';
import { ShapeBuilder, smoothForOutline } from './shapes';

function gradientMap(): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
export const ramp = gradientMap();

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2a1d12';
  g.fillStyle = '#2a1d12';
  draw(g);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  return tex;
}

/** Dải hoa văn: vòng tròn tiếp tuyến và răng cưa, như vành trống đồng. */
export const bandTex = canvasTexture(
  256,
  128,
  (g) => {
    g.lineWidth = 5;
    for (const y of [8, 120]) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(256, y);
      g.stroke();
    }
    g.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const cx = 32 + i * 64;
      g.beginPath();
      g.arc(cx, 44, 20, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(cx, 44, 6, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(cx + 20, 24);
      g.lineTo(cx + 44, 64);
      g.stroke();
    }
    g.beginPath();
    for (let x = 0; x <= 256; x += 16) g.lineTo(x, x % 32 ? 88 : 108);
    g.stroke();
  },
  [3, 1],
);

/** Mặt trống đồng: ngôi sao giữa, các vành tròn, vành chim bay. */
export const drumTex = canvasTexture(256, 256, (g) => {
  g.fillStyle = '#f0d9a0';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#2a1d12';
  g.lineWidth = 3;
  const c = 128;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(c + Math.cos(a - 0.12) * 10, c + Math.sin(a - 0.12) * 10);
    g.lineTo(c + Math.cos(a) * 34, c + Math.sin(a) * 34);
    g.lineTo(c + Math.cos(a + 0.12) * 10, c + Math.sin(a + 0.12) * 10);
    g.fill();
  }
  for (const r of [40, 46, 70, 76, 112, 118]) {
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    g.beginPath();
    g.arc(c + Math.cos(a) * 58, c + Math.sin(a) * 58, 5, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.save();
    g.translate(c + Math.cos(a) * 94, c + Math.sin(a) * 94);
    g.rotate(a + Math.PI / 2);
    g.beginPath();
    g.moveTo(-14, 4);
    g.lineTo(0, -4);
    g.lineTo(14, 4);
    g.moveTo(0, -4);
    g.lineTo(0, -16);
    g.stroke();
    g.restore();
  }
});

/**
 * Sóng trống: hoa văn mặt trống đồng (vành tròn, vòng tròn tiếp tuyến, ngôi sao giữa, chim bay) nét trắng
 * trên nền trong suốt, để tô màu đồng bằng chất liệu và loang ra trên mặt đất.
 */
export const drumWaveTex = (() => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#ffffff';
  g.fillStyle = '#ffffff';
  const m = 128;
  g.lineWidth = 8;
  g.beginPath();
  g.arc(m, m, 118, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  for (const r of [104, 66]) {
    g.beginPath();
    g.arc(m, m, r, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.beginPath();
    g.arc(m + Math.cos(a) * 85, m + Math.sin(a) * 85, 8, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    g.save();
    g.translate(m + Math.cos(a) * 50, m + Math.sin(a) * 50);
    g.rotate(a + Math.PI / 2);
    g.beginPath();
    g.moveTo(-10, 4);
    g.lineTo(0, -3);
    g.lineTo(10, 4);
    g.stroke();
    g.restore();
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(m + Math.cos(a - 0.14) * 8, m + Math.sin(a - 0.14) * 8);
    g.lineTo(m + Math.cos(a) * 30, m + Math.sin(a) * 30);
    g.lineTo(m + Math.cos(a + 0.14) * 8, m + Math.sin(a + 0.14) * 8);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
})();

export const toon = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
export const toonBand = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp, map: bandTex });
export const toonDrum = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp, map: drumTex });
/** Lửa, mắt ngựa sắt, hào quang: không nhận ánh sáng nên luôn rực, kể cả khi nằm trong bóng. */
export const glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });

function inkMaterial(thickness: number): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide });
  // Viền mực kiểu "inverted hull": vẽ mặt sau, đẩy mỗi đỉnh ra ngoài theo pháp tuyến.
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${thickness.toFixed(4)};`);
  };
  m.customProgramCacheKey = () => `ink-${thickness}`;
  return m;
}
export const inkThick = inkMaterial(0.03);
export const inkThin = inkMaterial(0.016);

export function outlineOf(geo: THREE.BufferGeometry, ink = inkThick): THREE.Mesh {
  const o = new THREE.Mesh(smoothForOutline(geo), ink);
  o.castShadow = false;
  return o;
}

/** Một mô hình gồm phần màu trơn, phần có hoa văn dải, phần mặt trống và phần tự phát sáng, mỗi phần có viền mực. */
export class ToonModel {
  readonly plain = new ShapeBuilder();
  readonly band = new ShapeBuilder(true);
  readonly drum = new ShapeBuilder(true);
  readonly glow = new ShapeBuilder();
  constructor(private readonly ink = inkThick) {}
  group(): THREE.Group {
    const out = new THREE.Group();
    const parts: [ShapeBuilder, THREE.Material][] = [
      [this.plain, toon],
      [this.band, toonBand],
      [this.drum, toonDrum],
      [this.glow, glowMaterial],
    ];
    for (const [b, mat] of parts) {
      if (b.empty) continue;
      const mesh = b.mesh(mat);
      out.add(mesh, outlineOf(mesh.geometry, this.ink));
    }
    return out;
  }
}
