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

export const toon = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
export const toonBand = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp, map: bandTex });
export const toonDrum = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp, map: drumTex });

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

/** Một mô hình gồm phần màu trơn, phần có hoa văn dải và phần mặt trống, mỗi phần có viền mực. */
export class ToonModel {
  readonly plain = new ShapeBuilder();
  readonly band = new ShapeBuilder(true);
  readonly drum = new ShapeBuilder(true);
  constructor(private readonly ink = inkThick) {}
  group(): THREE.Group {
    const out = new THREE.Group();
    const parts: [ShapeBuilder, THREE.Material][] = [
      [this.plain, toon],
      [this.band, toonBand],
      [this.drum, toonDrum],
    ];
    for (const [b, mat] of parts) {
      if (b.empty) continue;
      const mesh = b.mesh(mat);
      out.add(mesh, outlineOf(mesh.geometry, this.ink));
    }
    return out;
  }
}
