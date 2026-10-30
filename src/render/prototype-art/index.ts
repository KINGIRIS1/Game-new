// PROTOTYPE, DÙNG XONG BỎ: các biến thể phong cách hình ảnh, chọn bằng ?variant= trên URL.
// Sau khi chủ dự án chọn xong, đưa bản thắng vào src/render/models.ts rồi chuyển thư mục này
// sang branch prototype/phong-cach-hinh-anh.

import { boxArt, type ArtSet } from '../art';
import { dongSonArt } from './dongson';
import { toyArt } from './toy';
import { voxelArt } from './voxel';

export const VARIANTS: ArtSet[] = [boxArt, voxelArt, toyArt, dongSonArt];

export function artFor(key: string): ArtSet {
  return VARIANTS.find((v) => v.key === key) ?? boxArt;
}
