// Canh tệp mô hình Meshy của game (src/assets/mo-hinh/, thu gọn bằng scripts/mo-hinh.mjs): đủ nhẹ cho điện thoại (cỡ
// tệp, số tam giác, cạnh ảnh), chỉ dùng phần mở rộng mà `moHinh.ts` nạp được, có đoạn động tác đứng và xương bàn tay
// để cầm đồ. Đọc thẳng khối JSON của tệp GLB, không cần trình duyệt.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng.

import { describe, expect, it, vi } from 'vitest';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

/** Cỡ tệp tối đa (KB), số tam giác tối đa, cạnh ảnh tối đa (điểm ảnh) của mỗi nhân vật. */
const MAX_KB = 700;
const MAX_TRIS = 8000;
const MAX_SIDE = 1024;
/** Phần mở rộng GLTFLoader nạp được với bộ giải meshopt `moHinh.ts` gắn vào. */
const SUPPORTED = ['EXT_meshopt_compression', 'KHR_mesh_quantization', 'EXT_texture_webp'];

interface Gltf {
  extensionsRequired?: string[];
  accessors: { count: number }[];
  bufferViews: { byteOffset?: number; byteLength: number }[];
  images?: { bufferView: number; mimeType: string }[];
  meshes: { primitives: { indices?: number; attributes: Record<string, number> }[] }[];
  skins?: { joints: number[] }[];
  nodes: { name?: string }[];
  animations?: { name?: string }[];
}

/** Các tệp mô hình, mỗi tệp một chuỗi data URL (Vite nạp `?inline`). */
const FILES = import.meta.glob('../assets/mo-hinh/*.glb', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;

function bytesOf(id: string): Uint8Array | undefined {
  const url = FILES[`../assets/mo-hinh/${id}.glb`];
  if (!url) return undefined;
  const raw = atob(url.slice(url.indexOf(',') + 1));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

function readGlb(data: Uint8Array): { json: Gltf; bin: Uint8Array } {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  expect(v.getUint32(0, true)).toBe(0x46546c67);
  let off = 12;
  let json: Gltf | null = null;
  let bin: Uint8Array = new Uint8Array(0);
  while (off < data.length) {
    const len = v.getUint32(off, true);
    const type = v.getUint32(off + 4, true);
    const chunk = data.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk)) as Gltf;
    else if (type === 0x004e4942) bin = chunk;
    off += 8 + len;
  }
  return { json: json!, bin };
}

/** Cạnh ảnh WebP (lossy VP8, lossless VP8L hay có phần mở rộng VP8X). */
function webpSize(b: Uint8Array): [number, number] {
  expect(ascii(b, 0, 4)).toBe('RIFF');
  expect(ascii(b, 8, 12)).toBe('WEBP');
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u24 = (at: number) => v.getUint16(at, true) | (v.getUint8(at + 2) << 16);
  const kind = ascii(b, 12, 16);
  if (kind === 'VP8X') return [1 + u24(24), 1 + u24(27)];
  if (kind === 'VP8L') {
    const bits = v.getUint32(21, true);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  return [v.getUint16(26, true) & 0x3fff, v.getUint16(28, true) & 0x3fff];
}

describe('mô hình Meshy', () => {
  it('mỗi nhân vật: tệp gọn, đủ đoạn đứng và xương tay, chỉ dùng phần mở rộng nạp được', async () => {
    const { MO_HINH } = await import('./moHinh');
    for (const [id, def] of Object.entries(MO_HINH)) {
      expect(def.url, id).toMatch(new RegExp(`${id}\\.glb$`));
      const data = bytesOf(id);
      expect(data, `${id}: có tệp src/assets/mo-hinh/${id}.glb`).toBeDefined();
      const { json, bin } = readGlb(data!);
      expect(data!.length / 1024, `${id}: cỡ tệp (KB)`).toBeLessThanOrEqual(MAX_KB);
      for (const ext of json.extensionsRequired ?? []) expect(SUPPORTED, `${id}: phần mở rộng ${ext}`).toContain(ext);

      let tris = 0;
      for (const m of json.meshes)
        for (const p of m.primitives) tris += (p.indices !== undefined ? json.accessors[p.indices].count : json.accessors[p.attributes.POSITION].count) / 3;
      expect(tris, `${id}: số tam giác`).toBeLessThanOrEqual(MAX_TRIS);
      // Có xương để làm động tác: hình nào cũng gắn xương.
      for (const m of json.meshes) for (const p of m.primitives) expect(Object.keys(p.attributes), id).toContain('JOINTS_0');

      expect(json.images?.length, `${id}: một ảnh màu`).toBe(1);
      for (const im of json.images ?? []) {
        expect(im.mimeType).toBe('image/webp');
        const bv = json.bufferViews[im.bufferView];
        const [w, h] = webpSize(bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength));
        expect(Math.max(w, h), `${id}: cạnh ảnh`).toBeLessThanOrEqual(MAX_SIDE);
      }

      expect((json.animations ?? []).map((a) => a.name), `${id}: đoạn động tác`).toContain(def.idle);
      const joints = new Set((json.skins ?? []).flatMap((s) => s.joints.map((j) => json.nodes[j].name)));
      for (const b of def.hand) expect(joints.has(b), `${id}: xương ${b}`).toBe(true);
    }
  });
});
