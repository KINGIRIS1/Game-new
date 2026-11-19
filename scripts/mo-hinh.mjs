#!/usr/bin/env node
// Thu gọn tệp GLB nhân vật Meshy (đã gắn xương) cho game, ra src/assets/mo-hinh/<tên>.glb:
//   - bỏ mọi đoạn động tác (game làm tư thế bằng code trên bộ xương, `render/moHinh.ts`), trừ đoạn chọn bằng --doan
//     (đổi tên theo game; bỏ kênh không đổi suốt đoạn);
//   - chỉ giữ ảnh màu gốc, thu về cạnh --anh điểm ảnh (mặc định 1024) và nén WebP; bỏ ảnh kim loại, nhám, pháp tuyến
//     và tiếp tuyến;
//   - bỏ dữ liệu không còn dùng, lượng tử hóa và nén lưới bằng meshopt (EXT_meshopt_compression; game giải bằng
//     MeshoptDecoder của three).
// Cách dùng: node scripts/mo-hinh.mjs <tệp vào.glb> <tên> [--anh 1024] [--doan <tên trong tệp>=<tên mới> ...]
// Ảnh thu nhỏ bằng Chromium của Playwright.

import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const flag = (name) => {
  const out = [];
  for (let i = 0; i < args.length; i++) if (args[i] === name) out.push(args[i + 1]);
  return out;
};
const [input, ten] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!input || !ten) {
  console.log('Cách dùng: node scripts/mo-hinh.mjs <tệp vào.glb> <tên> [--anh 1024] [--doan <tên trong tệp>=<tên mới> ...]');
  process.exit(1);
}
const side = Number(flag('--anh')[0] ?? 1024);
const rename = new Map(flag('--doan').map((s) => s.split('=')));

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(path.resolve(input));
const root = doc.getRoot();

// Đoạn động tác.
const anims = root.listAnimations();
console.log('Đoạn trong tệp:', anims.map((a) => a.getName()).join(', ') || '(không có)');
let dropped = 0;
for (const a of anims) {
  const to = rename.get(a.getName());
  if (!to) {
    a.dispose();
    continue;
  }
  a.setName(to);
  for (const ch of a.listChannels()) {
    const s = ch.getSampler();
    const out = s.getOutput();
    const n = out.getElementSize();
    const v = out.getArray();
    let still = true;
    for (let i = n; i < v.length && still; i++) if (Math.abs(v[i] - v[i % n]) > 1e-5) still = false;
    if (!still) continue;
    // Kênh không đổi suốt đoạn: ghi giá trị ấy vào xương rồi bỏ kênh.
    const node = ch.getTargetNode();
    const value = Array.from(v.slice(0, n));
    const p = ch.getTargetPath();
    if (node && p === 'rotation') node.setRotation(value);
    else if (node && p === 'translation') node.setTranslation(value);
    else if (node && p === 'scale') node.setScale(value);
    else continue;
    ch.dispose();
    s.dispose();
    dropped++;
  }
}

// Chất liệu: chỉ còn ảnh màu gốc, game tô hoạt hình nên không cần kim loại, nhám, pháp tuyến.
for (const m of root.listMaterials()) {
  m.setMetallicRoughnessTexture(null).setNormalTexture(null).setOcclusionTexture(null).setEmissiveTexture(null);
  m.setMetallicFactor(0).setRoughnessFactor(1).setDoubleSided(false);
}

// Tiếp tuyến chỉ cần cho ảnh pháp tuyến, đã bỏ.
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) p.setAttribute('TANGENT', null);

// Bỏ thứ không còn ai dùng.
await doc.transform(prune());

// Ảnh màu: thu nhỏ và nén WebP trong Chromium.
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of root.listTextures()) {
  const src = Buffer.from(t.getImage()).toString('base64');
  const webp = await page.evaluate(
    async ([b64, mime, side]) => {
      const blob = await (await fetch(`data:${mime};base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob);
      const w = Math.min(side, bmp.width);
      const h = Math.round((bmp.height * w) / bmp.width);
      const c = new OffscreenCanvas(w, h);
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(bmp, 0, 0, w, h);
      const out = await c.convertToBlob({ type: 'image/webp', quality: 0.9 });
      const bytes = new Uint8Array(await out.arrayBuffer());
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(s);
    },
    [src, t.getMimeType() || 'image/png', side],
  );
  t.setImage(new Uint8Array(Buffer.from(webp, 'base64'))).setMimeType('image/webp').setURI(`${ten}.webp`);
}
await browser.close();
if (root.listTextures().length) doc.createExtension(EXTTextureWebP).setRequired(true);
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));

const outDir = path.join(ROOT, 'src', 'assets', 'mo-hinh');
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, `${ten}.glb`);
await writeFile(outFile, await io.writeBinary(doc));

// Báo cáo.
let tris = 0;
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
const inKb = (await readFile(path.resolve(input))).length / 1024;
const outKb = (await readFile(outFile)).length / 1024;
console.log(`Ra ${path.relative(ROOT, outFile)}: ${outKb.toFixed(0)} KB (vào ${inKb.toFixed(0)} KB), ${tris} tam giác, ${root.listSkins()[0]?.listJoints().length ?? 0} xương`);
for (const a of root.listAnimations()) {
  const dur = Math.max(0, ...a.listSamplers().map((s) => s.getInput()?.getMax([])[0] ?? 0));
  console.log(`  đoạn "${a.getName()}": ${dur.toFixed(2)} giây, ${a.listChannels().length} kênh`);
}
console.log(`  bỏ ${dropped} kênh không đổi; ảnh WebP cạnh ${side}`);
