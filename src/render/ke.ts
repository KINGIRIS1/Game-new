// Tường kè ở vách đứng của nền đất (mép móng công trình, chỗ đắp nền) và bờ sông (diorama bước 2, 4; `docs/thiet-ke.md`
// mục Kế hoạch: địa hình diorama). Mỗi kiểu kè một ảnh vẽ canvas lặp theo chiều ngang; `nenDat.ts` gán tọa độ ảnh cho
// mặt vách (u theo chiều dọc mép, v tính từ mép trên xuống), World đổi ảnh của chất liệu kè khi Điện lên cấp.

import * as THREE from 'three';

/** Kiểu kè theo cấp Điện: 0 đất nện cọc tre (1–3), 1 đá hộc xếp khan (4–6), 2 đá xanh đẽo vuông (7–8), 3 thêm diềm đồng (9–10). */
export type KeKieu = 0 | 1 | 2 | 3;

export function keKieu(dienLevel: number): KeKieu {
  if (dienLevel >= 9) return 3;
  if (dienLevel >= 7) return 2;
  if (dienLevel >= 4) return 1;
  return 0;
}

/** Ảnh rộng 1 ô, cao `KE_CAO` ô (mép trên ảnh là mép trên vách); vách cao hơn thì kéo dài hàng dưới cùng. */
export const KE_CAO = 2;
const W = 128;
const H = 256;

/** Số giả ngẫu nhiên lặp lại được. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (r: number, g: number, b: number) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

/** Viên đá bo góc ở (x, y) cỡ w × h, vẽ cả bản sao lệch một chiều ngang ảnh để lặp liền. */
function stone(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, light: string): void {
  for (const dx of [0, -W, W]) {
    g.fillStyle = fill;
    g.beginPath();
    g.roundRect(x + dx, y, w, h, r);
    g.fill();
    g.fillStyle = light;
    g.beginPath();
    g.roundRect(x + dx + 2, y + 2, w - 4, Math.max(2, h * 0.28), r * 0.6);
    g.fill();
  }
}

function draw(kieu: KeKieu, g: CanvasRenderingContext2D): void {
  const rand = rng(97 + kieu * 31);
  if (kieu === 0) {
    // Đất nện thành lớp, cọc tre đóng dọc giữ đất, dây lạt buộc ngang.
    g.fillStyle = '#9a7146';
    g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 14) {
      const k = 0.9 + rand() * 0.18;
      g.fillStyle = hex(154 * k, 113 * k, 70 * k);
      g.fillRect(0, y, W, 13);
      g.fillStyle = 'rgba(70,45,25,0.35)';
      g.fillRect(0, y + 12, W, 2);
    }
    for (let i = 0; i < 6; i++) {
      const x = 6 + i * 21 + rand() * 4;
      g.fillStyle = '#c9b25e';
      g.fillRect(x, 0, 7, H);
      g.fillStyle = '#8f7a35';
      g.fillRect(x + 5, 0, 2, H);
      for (let y = 18; y < H; y += 40) {
        g.fillStyle = '#7a5a2a';
        g.fillRect(x - 1, y, 9, 2);
      }
    }
    g.fillStyle = '#6e8a3a';
    g.fillRect(0, 0, W, 5);
    g.fillStyle = '#c4a24e';
    g.fillRect(0, 4, W, 3);
    return;
  }
  if (kieu === 1) {
    // Đá hộc xếp khan: viên tròn méo, mạch sẫm, rêu lấm tấm.
    g.fillStyle = '#4a4238';
    g.fillRect(0, 0, W, H);
    let y = 0;
    while (y < H) {
      const rowH = 18 + rand() * 10;
      let x = -rand() * 20;
      while (x < W) {
        const w = 18 + rand() * 18;
        const k = 0.82 + rand() * 0.3;
        stone(g, x + 1.5, y + 1.5, w - 3, rowH - 3, 7, hex(150 * k, 138 * k, 120 * k), hex(178 * k, 168 * k, 150 * k));
        if (rand() < 0.25) {
          g.fillStyle = 'rgba(96,128,64,0.55)';
          g.fillRect(x + 4, y + rowH - 7, w * 0.5, 4);
        }
        x += w;
      }
      y += rowH;
    }
    g.fillStyle = 'rgba(80,110,50,0.8)';
    g.fillRect(0, 0, W, 4);
    return;
  }
  // Đá xanh đẽo vuông xếp so le; kiểu 3 thêm diềm đồng hoa văn trống đồng ở mép trên.
  g.fillStyle = '#39404a';
  g.fillRect(0, 0, W, H);
  const top = kieu === 3 ? 26 : 0;
  const rowH = 20;
  for (let r = 0, y = top; y < H; r++, y += rowH) {
    const off = r % 2 ? 0 : 21;
    for (let x = -off; x < W; x += 42) {
      const k = 0.88 + rand() * 0.2;
      stone(g, x + 1, y + 1, 40, rowH - 2, 2, hex(108 * k, 122 * k, 132 * k), hex(136 * k, 150 * k, 160 * k));
    }
  }
  g.fillStyle = '#8b98a2';
  g.fillRect(0, top, W, 4);
  if (kieu === 3) {
    g.fillStyle = '#b88a3a';
    g.fillRect(0, 0, W, top);
    g.fillStyle = '#7d5a22';
    g.fillRect(0, top - 3, W, 3);
    g.fillRect(0, 0, W, 2);
    g.strokeStyle = '#6a4a1a';
    g.lineWidth = 2;
    // Vòng tròn tiếp tuyến như vành trống đồng.
    for (let i = 0; i < 4; i++) {
      const cx = 16 + i * 32;
      g.beginPath();
      g.arc(cx, 13, 8, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#dcb065';
      g.beginPath();
      g.arc(cx, 13, 3, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(cx + 8, 7);
      g.lineTo(cx + 24, 19);
      g.stroke();
    }
  }
}

const cache = new Map<KeKieu, THREE.CanvasTexture>();

/** Ảnh kè của kiểu `kieu`, vẽ một lần. */
export function keTexture(kieu: KeKieu): THREE.CanvasTexture {
  let tex = cache.get(kieu);
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  draw(kieu, c.getContext('2d')!);
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  cache.set(kieu, tex);
  return tex;
}
