// Bãi chiến phó bản có vật cản (chủ dự án chọn): mỗi nền một bố cục; rừng, bến sông, làng có biến thể theo chương.
// - Vật cản (đá, khóm tre, tường vỡ, nhà, rào, thuyền mắc cạn) chặn đường: lính đi vòng qua lối trống.
// - Vùng nước nông, bùn chỉ làm chậm (`BAI_CHAM` ở `defs.ts`); thủy quái bơi trong nước như đi thường.
// - Tên và kỹ năng vùng bay qua vật cản: trận không tính tầm nhìn.
// - Vật cản chỉ nằm ở dải giữa hai đạo quân (`DAI_GIUA`); hai dải dàn quân để trống.
// Thuần logic, không vẽ gì; phần vẽ đọc cùng dữ liệu này nên hình và luật luôn khớp. Chỉ dùng căn bậc hai và bốn
// phép tính, để trận đánh lại ra y hệt trên mọi máy.
//
// Tìm đường: mỗi phe một bản đồ khoảng cách (Dijkstra trên lưới ô 0,5) tới người phe kia gần nhất, dựng lại mỗi
// `NAV_S` giây. Đường thẳng tới kẻ địch thông thì đi thẳng như bãi phẳng; vướng thì lần theo bản đồ, nhắm ô xa nhất
// còn thấy được. Đi xong, bị đẩy hay bị kỹ năng hất thì trượt dọc vật cản, không bao giờ xuyên qua.

import { BAI_CHAM, FIELD, STAGES, type Chapter, type Terrain } from './defs';

/** Hình của vật cản hay vùng chậm, theo tọa độ bãi: x từ 0 tới `FIELD.w`, z 0 là cuối bãi phía giặc, `FIELD.d` là phía ta. */
export type Hinh =
  /** Hình tròn tâm (x, z), bán kính `r`: đá, khóm tre, đống rơm. */
  | { k: 'tron'; x: number; z: number; r: number }
  /**
   * Đoạn dày từ (ax, az) tới (bx, bz), nửa bề dày `half`. Hai đầu tròn (tường, rào, khúc gỗ, thuyền), hay hai đầu
   * vuông (`vuong`: khối chữ nhật dài đúng bằng đoạn, cho nhà, ruộng).
   */
  | { k: 'doan'; ax: number; az: number; bx: number; bz: number; half: number; vuong?: boolean }
  /** Đa giác, đỉnh theo thứ tự quanh mép. Chỉ dùng cho vùng chậm hình lạ. */
  | { k: 'da'; pts: readonly (readonly [number, number])[] };

/** Dáng vẽ của vật cản (`src/render/vatCan.ts`). */
export type DangCan =
  | 'tre'
  | 'da'
  | 'daNhon'
  | 'nha'
  | 'nhaChay'
  | 'leu'
  | 'rao'
  | 'luy'
  | 'thanh'
  | 'thuyen'
  | 'rom'
  | 'sim'
  | 'lau'
  | 'ngo'
  | 'cayChet'
  | 'go'
  | 'chum'
  | 'coc'
  | 'gieng'
  | 'xeCui';

export interface VatCan {
  hinh: Hinh;
  ve: DangCan;
}

export type LoaiCham = keyof typeof BAI_CHAM;

export interface VungCham {
  hinh: Hinh;
  loai: LoaiCham;
  /** Dáng vẽ thêm trên mặt vùng: sen, đất đá vụn, lau sậy. */
  ve?: 'sen' | 'vun' | 'lau';
}

/** Bố cục một bãi chiến: các vật cản chặn đường và các vùng làm chậm. */
export interface Bai {
  id: string;
  terrain: Terrain;
  can: readonly VatCan[];
  cham: readonly VungCham[];
}

/** Vật cản và vùng chậm chỉ nằm trong dải này (theo z); hai dải dàn quân hai bên để trống. */
export const DAI_GIUA = { from: 7, to: 14.5 };

const tron = (x: number, z: number, r: number): Hinh => ({ k: 'tron', x, z, r });
const doan = (ax: number, az: number, bx: number, bz: number, half: number, vuong?: boolean): Hinh =>
  vuong ? { k: 'doan', ax, az, bx, bz, half, vuong } : { k: 'doan', ax, az, bx, bz, half };

/**
 * Mọi bố cục bãi chiến, theo id. Bố cục mới phải qua `kiemBai` (`baiChien.test.ts`): nằm trong dải giữa, khe giữa hai
 * vật cản liền hay rộng ít nhất 1,6 ô, có lối rộng 2,5 ô, hàng nào cũng còn ít nhất 4 ô trống.
 */
export const BAI: Record<string, Bai> = {
  // Chương 1: vật cản thưa, thấp, để quân ít của chương đầu không bị chia cắt.
  rung: {
    id: 'rung',
    terrain: 'rung',
    can: [
      { hinh: tron(2.8, 9.2, 0.9), ve: 'tre' },
      { hinh: tron(6.3, 12.4, 1), ve: 'tre' },
      { hinh: tron(-0.3, 13, 1.1), ve: 'tre' },
    ],
    cham: [],
  },
  benSong: {
    id: 'benSong',
    terrain: 'benSong',
    can: [
      { hinh: doan(2.2, 11.4, 4, 12, 0.4), ve: 'thuyen' },
      { hinh: tron(6.6, 9.4, 0.5), ve: 'chum' },
    ],
    cham: [{ hinh: doan(9.8, 8, 4.6, 9.8, 0.7), loai: 'nuoc' }],
  },
  lang: {
    id: 'lang',
    terrain: 'lang',
    can: [
      { hinh: doan(-0.8, 10.4, 1.6, 10.4, 0.9, true), ve: 'nha' },
      { hinh: tron(6.6, 9, 0.6), ve: 'rom' },
      { hinh: doan(5.6, 12.9, 9.6, 13.3, 0.3), ve: 'rao' },
    ],
    cham: [],
  },
  // Đồn giặc Ân (màn 4): rào cọc gãy chắn ngang, chừa hai lối; hai cụm chông.
  don: {
    id: 'don',
    terrain: 'don',
    can: [
      { hinh: doan(-0.6, 7.4, 1.1, 7.4, 0.3), ve: 'coc' },
      { hinh: doan(4.4, 7.4, 5.2, 7.4, 0.3), ve: 'coc' },
      { hinh: doan(7.8, 7.4, 9.6, 7.4, 0.3), ve: 'coc' },
      { hinh: tron(2.3, 11.6, 0.6), ve: 'coc' },
      { hinh: tron(6.7, 12, 0.6), ve: 'coc' },
    ],
    cham: [],
  },
  // Núi (màn 8): đá sát hai mép và phía sau, giữa bãi để trống cho trận đánh trùm.
  nui: {
    id: 'nui',
    terrain: 'nui',
    can: [
      { hinh: tron(0.3, 8.4, 1.1), ve: 'da' },
      { hinh: tron(5.6, 8.2, 0.8), ve: 'da' },
      { hinh: tron(9, 12, 1.1), ve: 'da' },
      { hinh: tron(3, 13.6, 0.7), ve: 'da' },
    ],
    cham: [],
  },
  // Núi chương 2, 3 (màn 15, 22): chỉ đá sát hai mép, giữa bãi trống cho đông quân đánh trùm.
  nui2: {
    id: 'nui2',
    terrain: 'nui',
    can: [
      { hinh: tron(0.3, 8.4, 1.1), ve: 'da' },
      { hinh: tron(9, 12, 1.1), ve: 'da' },
    ],
    cham: [],
  },
  // Đồn bên kia sông (bậc 1, 2, 4): chông, xe củi đổ, bãi bùn có lau.
  benKia: {
    id: 'benKia',
    terrain: 'benKia',
    can: [
      { hinh: tron(2.3, 8.4, 0.6), ve: 'coc' },
      { hinh: tron(6.7, 8.6, 0.6), ve: 'coc' },
      { hinh: doan(5.6, 12.2, 7, 12.8, 0.35), ve: 'xeCui' },
    ],
    cham: [{ hinh: tron(2, 12.4, 1.5), loai: 'bun', ve: 'lau' }],
  },

  // Chương 2: thủy quái của Thủy Tinh bơi trong nước như đi thường, nên vũng nước, lạch nước có lợi cho giặc.
  rung2: {
    id: 'rung2',
    terrain: 'rung',
    can: [
      { hinh: tron(6.5, 8.8, 0.9), ve: 'tre' },
      { hinh: doan(1.9, 11.4, 4.2, 12.4, 0.3), ve: 'go' },
      { hinh: tron(9.6, 13.4, 1), ve: 'tre' },
    ],
    cham: [{ hinh: tron(0.6, 8.4, 0.9), loai: 'nuoc', ve: 'sen' }],
  },
  benSong2: {
    id: 'benSong2',
    terrain: 'benSong',
    can: [
      { hinh: doan(5.2, 12.6, 7, 12, 0.4), ve: 'thuyen' },
      { hinh: tron(-0.1, 13.2, 0.7), ve: 'chum' },
    ],
    cham: [{ hinh: doan(-0.8, 9, 4, 10.6, 0.7), loai: 'nuoc' }],
  },
  lang2: {
    id: 'lang2',
    terrain: 'lang',
    can: [
      { hinh: doan(7.4, 9, 9.8, 9, 0.9, true), ve: 'nha' },
      { hinh: tron(2.6, 10, 0.55), ve: 'gieng' },
      { hinh: doan(-0.6, 12.8, 3.4, 13.2, 0.3), ve: 'rao' },
    ],
    cham: [{ hinh: tron(6.2, 12.6, 1), loai: 'nuoc', ve: 'sen' }],
  },
  // Đồi sim (màn 9): bụi sim thấp, tảng đá sát mép phải.
  doi: {
    id: 'doi',
    terrain: 'doi',
    can: [
      { hinh: tron(2.4, 8.8, 0.8), ve: 'sim' },
      { hinh: tron(6.6, 10.2, 0.75), ve: 'sim' },
      { hinh: tron(3.4, 13, 0.7), ve: 'sim' },
      { hinh: tron(9.5, 13.4, 1), ve: 'da' },
    ],
    cham: [],
  },
  // Đồng ngập (màn 12): hai vũng nước lũ, khúc gỗ trôi dạt; giữa bãi để trống cho trận đánh thuồng luồng.
  ngap: {
    id: 'ngap',
    terrain: 'ngap',
    can: [
      { hinh: doan(6.2, 8.4, 7, 8.9, 0.32), ve: 'go' },
      { hinh: tron(0, 13.2, 1), ve: 'da' },
    ],
    cham: [
      { hinh: doan(-0.6, 9.6, 2.6, 10.6, 0.85), loai: 'nuoc' },
      { hinh: tron(7.3, 12.8, 1.2), loai: 'nuoc', ve: 'sen' },
    ],
  },
  // Đỉnh Tản Viên (màn 16): đá nhọn sát hai mép, một hòn phía sau bên trái; giữa bãi để trống cho trận đánh Thủy Tinh.
  tanVien: {
    id: 'tanVien',
    terrain: 'tanVien',
    can: [
      { hinh: tron(0.2, 9, 1.1), ve: 'daNhon' },
      { hinh: tron(8.9, 10.6, 1), ve: 'daNhon' },
      { hinh: tron(2.4, 13.6, 0.6), ve: 'da' },
    ],
    cham: [],
  },

  // Chương 3: yêu tinh núi Thất Diệu, rồi quân Triệu.
  rung3: {
    id: 'rung3',
    terrain: 'rung',
    can: [
      { hinh: tron(-0.1, 9.2, 1.1), ve: 'tre' },
      { hinh: tron(5.6, 9.6, 0.55), ve: 'da' },
      { hinh: tron(9.4, 13, 1), ve: 'tre' },
      { hinh: tron(3, 13.2, 0.6), ve: 'cayChet' },
    ],
    cham: [],
  },
  benSong3: {
    id: 'benSong3',
    terrain: 'benSong',
    can: [
      { hinh: doan(2, 8.6, 3.8, 9.2, 0.4), ve: 'thuyen' },
      { hinh: doan(7.6, 8.2, 9.8, 8.6, 0.3), ve: 'go' },
    ],
    cham: [{ hinh: doan(9.8, 10.8, 5.2, 12.8, 0.75), loai: 'nuoc' }],
  },
  lang3: {
    id: 'lang3',
    terrain: 'lang',
    can: [
      { hinh: doan(-0.8, 9, 1.6, 9, 0.9, true), ve: 'nhaChay' },
      { hinh: tron(6.2, 10, 0.55), ve: 'rom' },
      { hinh: doan(6.2, 13, 9.6, 12.6, 0.3), ve: 'rao' },
      { hinh: tron(2.1, 13.2, 0.5), ve: 'gieng' },
    ],
    cham: [],
  },
  // Núi Thất Diệu (màn 17, 19, đồn bậc 3): cây chết, đá nhọn sát hai mép, vũng bùn bên trái (bùn giữa bãi làm quân ta
  // sa lầy trước gà trắng).
  thatDieu: {
    id: 'thatDieu',
    terrain: 'thatDieu',
    can: [
      { hinh: tron(2.6, 9, 0.7), ve: 'cayChet' },
      { hinh: tron(9.2, 8.6, 1), ve: 'daNhon' },
      { hinh: tron(6.7, 12.6, 0.6), ve: 'cayChet' },
      { hinh: tron(-0.2, 12.8, 1.1), ve: 'daNhon' },
    ],
    cham: [{ hinh: tron(2.2, 11.8, 0.8), loai: 'bun' }],
  },
  // Cổ Loa (màn 24): hai đoạn lũy đất chắn ngang, chừa cửa giữa; giếng, đống gỗ dựng thành.
  coLoa: {
    id: 'coLoa',
    terrain: 'coLoa',
    can: [
      { hinh: doan(-0.8, 8.2, 2, 8.2, 0.45), ve: 'luy' },
      { hinh: doan(7, 8.2, 9.8, 8.2, 0.45), ve: 'luy' },
      { hinh: tron(2.2, 12.4, 0.55), ve: 'gieng' },
      { hinh: doan(7.2, 12.8, 9.8, 13.2, 0.35), ve: 'go' },
    ],
    cham: [],
  },

  // Chương 4: quân Triệu, thủy binh Triệu ở cửa sông, Triệu Đà đuổi vua ra biển. Quân ta nhiều quân bắn xa (có lính nỏ,
  // Cao Lỗ), nên chỗ thắt (vật cản hai mép cùng hàng, rào dài) làm giặc dồn cục trước mũi nỏ, nửa quân cũng thắng.
  // Vật cản chương này so le, sát mép.
  benSong4: {
    id: 'benSong4',
    terrain: 'benSong',
    can: [
      { hinh: doan(5.2, 9.2, 6.8, 8.6, 0.4), ve: 'thuyen' },
      { hinh: doan(-0.8, 12.4, 1.8, 12.9, 0.3), ve: 'go' },
      { hinh: tron(6.4, 12.6, 0.5), ve: 'chum' },
    ],
    cham: [{ hinh: doan(9.8, 12, 5.8, 13.2, 0.7), loai: 'nuoc' }],
  },
  lang4: {
    id: 'lang4',
    terrain: 'lang',
    can: [
      { hinh: doan(7.4, 12.4, 9.8, 12.4, 0.9, true), ve: 'nha' },
      { hinh: tron(2.4, 8.8, 0.55), ve: 'rom' },
      { hinh: doan(7.6, 8.4, 9.6, 9, 0.35), ve: 'xeCui' },
      { hinh: tron(2.2, 12.8, 0.5), ve: 'gieng' },
    ],
    cham: [],
  },
  rung4: {
    id: 'rung4',
    terrain: 'rung',
    can: [
      { hinh: tron(9.4, 8.6, 1), ve: 'tre' },
      { hinh: tron(3.6, 9.2, 0.6), ve: 'da' },
      { hinh: tron(-0.2, 12.4, 1.1), ve: 'tre' },
    ],
    cham: [],
  },
  // Cửa sông (màn 28, 37): bãi bồi bùn có lau sát mép phải, khúc gỗ trôi dạt sát mép trái, cọc cắm bãi, thuyền mắc cạn.
  cuaSong: {
    id: 'cuaSong',
    terrain: 'cuaSong',
    can: [
      { hinh: doan(-0.8, 8.6, 1.6, 9.2, 0.3), ve: 'go' },
      { hinh: tron(2.6, 12.6, 0.55), ve: 'coc' },
      { hinh: doan(7.4, 12.4, 9.6, 13, 0.4), ve: 'thuyen' },
    ],
    cham: [{ hinh: tron(8.4, 9, 1.2), loai: 'bun', ve: 'lau' }],
  },
  // Mộ Dạ (màn 32, cầm cự): đá dưới chân núi bên trái, đá nhọn sát mép phải, vũng nước triều.
  moDa: {
    id: 'moDa',
    terrain: 'moDa',
    can: [
      { hinh: tron(-0.1, 8.8, 1.1), ve: 'da' },
      { hinh: tron(9.1, 12.2, 1), ve: 'daNhon' },
    ],
    cham: [{ hinh: tron(6, 8.4, 0.9), loai: 'nuoc' }],
  },

  // Chương 5: quân Hán, Tô Định, Mã Viện. Hai Bà cưỡi voi: vật cản giữa bãi làm voi vướng, nên chỉ đặt sát mép.
  // Làng Mê Linh (màn 33): nhà sàn sát mép trái, ruộng ngô sát mép phải, giếng, đống rơm.
  lang5: {
    id: 'lang5',
    terrain: 'lang',
    can: [
      { hinh: doan(-0.8, 12.6, 1.6, 12.6, 0.9, true), ve: 'nha' },
      { hinh: doan(7.4, 9, 9.8, 9, 0.8, true), ve: 'ngo' },
      { hinh: tron(3, 9, 0.5), ve: 'gieng' },
      { hinh: tron(6.2, 12.8, 0.55), ve: 'rom' },
    ],
    cham: [],
  },
  // Hát Môn (màn 34): ruộng ngô bãi bồi, khóm lau sát mép phải; thuyền mắc cạn, ao sen sát mép trái.
  hatMon: {
    id: 'hatMon',
    terrain: 'hatMon',
    can: [
      { hinh: doan(7.2, 12.4, 9.8, 12.4, 0.8, true), ve: 'ngo' },
      { hinh: tron(9.2, 8.8, 0.8), ve: 'lau' },
      { hinh: doan(-0.6, 8.4, 1.6, 9, 0.4), ve: 'thuyen' },
    ],
    cham: [{ hinh: tron(0.2, 12.8, 1.1), loai: 'nuoc', ve: 'sen' }],
  },
  // Thành Luy Lâu (màn 36): đoạn tường thành đất nện vỡ sát mép trái, xe củi đổ, đá.
  luyLau: {
    id: 'luyLau',
    terrain: 'luyLau',
    can: [
      { hinh: doan(-0.8, 8.2, 2.6, 8.2, 0.45), ve: 'thanh' },
      { hinh: tron(6.8, 12.6, 0.55), ve: 'da' },
      { hinh: doan(-0.6, 12.8, 1.4, 13.4, 0.35), ve: 'xeCui' },
    ],
    cham: [],
  },
  // Hồ Lãng Bạc (màn 38, 39): ao sen sát mép trái, đầm bùn có lau sát mép phải, hai khóm lau.
  langBac: {
    id: 'langBac',
    terrain: 'langBac',
    can: [
      { hinh: tron(9.3, 8.4, 0.8), ve: 'lau' },
      { hinh: tron(2.6, 12.6, 0.65), ve: 'lau' },
    ],
    cham: [
      { hinh: tron(0.3, 9, 1.2), loai: 'nuoc', ve: 'sen' },
      { hinh: doan(9.8, 12, 6.6, 13, 0.7), loai: 'bun', ve: 'lau' },
    ],
  },
  // Cấm Khê (màn 40, cầm cự): suối chảy dọc vách phải, đá lăn dưới chân hai vách.
  camKhe: {
    id: 'camKhe',
    terrain: 'camKhe',
    can: [
      { hinh: tron(-0.1, 8.6, 1.1), ve: 'da' },
      { hinh: tron(2.8, 13.2, 0.55), ve: 'da' },
      { hinh: tron(9.3, 13.4, 0.9), ve: 'daNhon' },
    ],
    cham: [{ hinh: doan(9.8, 8.2, 7.4, 11.6, 0.6), loai: 'nuoc' }],
  },
};

/**
 * Nền nào dùng bố cục nào, theo chương: mỗi mục là [từ chương, id bố cục]; null là bãi phẳng. Nền chưa có mục nào
 * cũng là bãi phẳng.
 */
export const BAI_THEO: Partial<Record<Terrain, readonly (readonly [Chapter, string | null])[]>> = {
  rung: [
    [1, 'rung'],
    [2, 'rung2'],
    [3, 'rung3'],
    [4, 'rung4'],
  ],
  benSong: [
    [1, 'benSong'],
    [2, 'benSong2'],
    [3, 'benSong3'],
    [4, 'benSong4'],
  ],
  lang: [
    [1, 'lang'],
    [2, 'lang2'],
    [3, 'lang3'],
    [4, 'lang4'],
    [5, 'lang5'],
  ],
  don: [[1, 'don']],
  nui: [
    [1, 'nui'],
    [2, 'nui2'],
  ],
  doi: [[2, 'doi']],
  ngap: [[2, 'ngap']],
  tanVien: [[2, 'tanVien']],
  thatDieu: [[3, 'thatDieu']],
  coLoa: [[3, 'coLoa']],
  cuaSong: [[4, 'cuaSong']],
  moDa: [[4, 'moDa']],
  hatMon: [[5, 'hatMon']],
  luyLau: [[5, 'luyLau']],
  langBac: [[5, 'langBac']],
  camKhe: [[5, 'camKhe']],
  benKia: [[1, 'benKia']],
};

/** Bố cục của nền `t` ở chương `ch` (mục cuối có chương không quá `ch`), hay null là bãi phẳng. */
export function baiOf(t: Terrain, ch: Chapter): string | null {
  let id: string | null = null;
  for (const [from, b] of BAI_THEO[t] ?? []) if (from <= ch) id = b;
  return id;
}

/** Bố cục bãi chiến của màn `n` (theo nền và chương của màn). */
export function stageBai(n: number): string | null {
  const def = STAGES[n - 1];
  return def ? baiOf(def.terrain, def.chapter) : null;
}

/** Bố cục theo id; id lạ (bản lưu đời sau, hay đã bỏ) thì không có. */
export function baiById(id: string | undefined | null): Bai | undefined {
  return id && Object.prototype.hasOwnProperty.call(BAI, id) ? BAI[id] : undefined;
}

// ---------- Đo khoảng cách ----------

const len = (x: number, z: number) => Math.sqrt(x * x + z * z);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
/** Giữ trong bãi như `clampField` của `battle.ts`. */
export const kep = (v: number, max: number) => Math.min(max - 0.3, Math.max(0.3, v));

/** Khoảng cách từ điểm (px, pz) tới đoạn thẳng a–b. */
function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const ux = bx - ax;
  const uz = bz - az;
  const l2 = ux * ux + uz * uz;
  const t = l2 > 0 ? clamp01(((px - ax) * ux + (pz - az) * uz) / l2) : 0;
  return len(px - ax - ux * t, pz - az - uz * t);
}

/** Khoảng cách giữa hai đoạn thẳng p1–q1 và p2–q2 (bằng 0 khi cắt nhau). */
function segSeg(p1x: number, p1z: number, q1x: number, q1z: number, p2x: number, p2z: number, q2x: number, q2z: number): number {
  const d1x = q1x - p1x;
  const d1z = q1z - p1z;
  const d2x = q2x - p2x;
  const d2z = q2z - p2z;
  const rx = p1x - p2x;
  const rz = p1z - p2z;
  const a = d1x * d1x + d1z * d1z;
  const e = d2x * d2x + d2z * d2z;
  const f = d2x * rx + d2z * rz;
  const EPS = 1e-12;
  let s: number;
  let t: number;
  if (a <= EPS && e <= EPS) return len(rx, rz);
  if (a <= EPS) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = d1x * rx + d1z * rz;
    if (e <= EPS) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const b = d1x * d2x + d1z * d2z;
      const denom = a * e - b * b;
      s = denom > EPS ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  return len(p1x + d1x * s - (p2x + d2x * t), p1z + d1z * s - (p2z + d2z * t));
}

/** Khoảng cách có dấu tới đa giác: âm ở trong. */
function polySd(pts: readonly (readonly [number, number])[], x: number, z: number): number {
  let d = Infinity;
  let s = 1;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i];
    const [xj, zj] = pts[j];
    d = Math.min(d, segDist(x, z, xi, zi, xj, zj));
    const c1 = z >= zi;
    const c2 = z < zj;
    const c3 = (xj - xi) * (z - zi) > (zj - zi) * (x - xi);
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * d;
}

/** Khoảng cách có dấu từ điểm (x, z) tới hình: dương ở ngoài, âm ở trong. */
export function sdHinh(h: Hinh, x: number, z: number): number {
  if (h.k === 'tron') return len(x - h.x, z - h.z) - h.r;
  if (h.k === 'da') return polySd(h.pts, x, z);
  if (!h.vuong) return segDist(x, z, h.ax, h.az, h.bx, h.bz) - h.half;
  // Khối chữ nhật: trục dọc theo đoạn, dài đúng bằng đoạn, ngang `half` mỗi bên.
  const ux = h.bx - h.ax;
  const uz = h.bz - h.az;
  const l = len(ux, uz);
  const ex = l > 1e-9 ? ux / l : 1;
  const ez = l > 1e-9 ? uz / l : 0;
  const px = x - (h.ax + h.bx) / 2;
  const pz = z - (h.az + h.bz) / 2;
  const qx = Math.abs(px * ex + pz * ez) - l / 2;
  const qz = Math.abs(pz * ex - px * ez) - h.half;
  return len(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
}

/** Vòng tròn bao quanh hình: tâm và bán kính. */
export function bao(h: Hinh): { x: number; z: number; r: number } {
  if (h.k === 'tron') return { x: h.x, z: h.z, r: h.r };
  if (h.k === 'doan') {
    const l = len(h.bx - h.ax, h.bz - h.az);
    return { x: (h.ax + h.bx) / 2, z: (h.az + h.bz) / 2, r: h.vuong ? len(l / 2, h.half) : l / 2 + h.half };
  }
  let sx = 0;
  let sz = 0;
  for (const [x, z] of h.pts) (sx += x), (sz += z);
  const cx = sx / h.pts.length;
  const cz = sz / h.pts.length;
  let r = 0;
  for (const [x, z] of h.pts) r = Math.max(r, len(x - cx, z - cz));
  return { x: cx, z: cz, r };
}

/** Khoảng cách có dấu từ (x, z) tới vật cản gần nhất của bố cục: dương là còn cách bấy nhiêu ô, âm là ở trong. */
export function sdfCan(bai: Bai, x: number, z: number): number {
  let d = Infinity;
  for (const c of bai.can) {
    const v = sdHinh(c.hinh, x, z);
    if (v < d) d = v;
  }
  return d;
}

/** Hệ số tốc độ tại (x, z): 1 là đất thường; trong nước, bùn thì chậm theo `BAI_CHAM`. */
export function chamAt(bai: Bai, x: number, z: number): number {
  let m = 1;
  for (const v of bai.cham) if (sdHinh(v.hinh, x, z) <= 0) m = Math.min(m, BAI_CHAM[v.loai]);
  return m;
}

/**
 * Đoạn a–b có chạm hình `h` (đã phồng thêm `r`) không. Tròn và đoạn đầu tròn tính đúng; khối vuông, đa giác thì dò
 * từng 0,15 ô.
 */
function segHits(h: Hinh, ax: number, az: number, bx: number, bz: number, r: number): boolean {
  const b = bao(h);
  if (segDist(b.x, b.z, ax, az, bx, bz) >= b.r + r) return false;
  if (h.k === 'tron') return true;
  if (h.k === 'doan' && !h.vuong) return segSeg(ax, az, bx, bz, h.ax, h.az, h.bx, h.bz) < h.half + r;
  const d = len(bx - ax, bz - az);
  const n = Math.max(1, Math.ceil(d / 0.15));
  for (let k = 0; k <= n; k++) if (sdHinh(h, ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n) < r) return true;
  return false;
}

/**
 * Đi thẳng từ (x0, z0) tới khi cách (x1, z1) trong `reach` ô mà không chạm vật cản (thân bán kính `r`). Người không
 * bơi (`boi` false) đang đứng trên đất khô thì đường lội qua nước, bùn cũng tính là không thông, để biết đường vòng có
 * nhanh hơn không.
 */
export function thong(bai: Bai, x0: number, z0: number, x1: number, z1: number, reach: number, r: number, boi: boolean): boolean {
  const d = len(x1 - x0, z1 - z0);
  if (d <= reach) return true;
  const k = reach > 0 ? (d - reach) / d : 1;
  const ex = x0 + (x1 - x0) * k;
  const ez = z0 + (z1 - z0) * k;
  for (const c of bai.can) if (segHits(c.hinh, x0, z0, ex, ez, r)) return false;
  if (!boi && bai.cham.length && chamAt(bai, x0, z0) === 1) for (const v of bai.cham) if (segHits(v.hinh, x0, z0, ex, ez, 0)) return false;
  return true;
}

// ---------- Dời người ra khỏi vật cản ----------

/** Một người hay vật có chỗ đứng (lính, nữ tướng). */
export interface Cho {
  x: number;
  z: number;
}

/**
 * Bước từ chỗ cũ (ox, oz) tới chỗ mới của `p` (thân bán kính `r`): vướng vật cản thì trượt dọc mép vật cản (bỏ phần
 * bước đâm vào), không được thì trượt theo trục còn đi được (trục bước dài hơn trước), không nữa thì đứng lại chỗ cũ.
 * Chỗ cũ đã nằm trong vật cản (bản lưu cũ, vừa hiện ra) thì đẩy ra chỗ trống gần nhất.
 */
export function truot(bai: Bai, r: number, p: Cho, ox: number, oz: number): void {
  if (!bai.can.length) return;
  if (sdfCan(bai, ox, oz) < r - 1e-6) {
    dayRa(bai, r, p);
    return;
  }
  if (diDuoc(bai, r, ox, oz, p.x, p.z)) return;
  // Trượt dọc mép: bỏ phần bước đâm vào vật cản (theo pháp tuyến ở chỗ cũ), đẩy ra vừa đủ chỗ đứng. Trượt theo trục
  // trước thì người đứng sát mép tròn mà đi dọc mép chỉ nhích được một chút theo trục kia, coi như đứng yên mãi.
  const e = 0.01;
  const gx = sdfCan(bai, ox + e, oz) - sdfCan(bai, ox - e, oz);
  const gz = sdfCan(bai, ox, oz + e) - sdfCan(bai, ox, oz - e);
  const g = len(gx, gz);
  const mx = p.x - ox;
  const mz = p.z - oz;
  const into = g > 1e-9 ? (mx * gx + mz * gz) / g : 0;
  if (into < 0) {
    const nx = gx / g;
    const nz = gz / g;
    let tx = p.x - nx * into;
    let tz = p.z - nz * into;
    const s = sdfCan(bai, tx, tz);
    if (s < r + 2e-3) {
      tx += nx * (r + 2e-3 - s);
      tz += nz * (r + 2e-3 - s);
    }
    tx = kep(tx, FIELD.w);
    tz = kep(tz, FIELD.d);
    if (diDuoc(bai, r, ox, oz, tx, tz)) {
      p.x = tx;
      p.z = tz;
      return;
    }
  }
  const xFirst = Math.abs(mx) >= Math.abs(mz);
  for (const alongX of xFirst ? [true, false] : [false, true]) {
    const x = alongX ? p.x : ox;
    const z = alongX ? oz : p.z;
    if (diDuoc(bai, r, ox, oz, x, z)) {
      p.x = x;
      p.z = z;
      return;
    }
  }
  p.x = ox;
  p.z = oz;
}

/** Bước từ (ox, oz) tới (x, z) không chạm vật cản. */
function diDuoc(bai: Bai, r: number, ox: number, oz: number, x: number, z: number): boolean {
  if (sdfCan(bai, x, z) < r) return false;
  for (const c of bai.can) if (segHits(c.hinh, ox, oz, x, z, r - 1e-6)) return false;
  return true;
}

/** Đưa `p` (thân bán kính `r`) ra chỗ trống gần nhất trong bãi. Đang ở chỗ trống thì để yên. */
export function dayRa(bai: Bai, r: number, p: Cho): void {
  if (!bai.can.length || sdfCan(bai, p.x, p.z) >= r) return;
  // Đẩy theo chiều khoảng cách tăng nhanh nhất, vài lần.
  for (let k = 0; k < 3; k++) {
    const d = sdfCan(bai, p.x, p.z);
    if (d >= r) return;
    const e = 0.01;
    const gx = sdfCan(bai, p.x + e, p.z) - sdfCan(bai, p.x - e, p.z);
    const gz = sdfCan(bai, p.x, p.z + e) - sdfCan(bai, p.x, p.z - e);
    const g = len(gx, gz);
    if (g < 1e-9) break;
    const push = r - d + 0.02;
    p.x = kep(p.x + (gx / g) * push, FIELD.w);
    p.z = kep(p.z + (gz / g) * push, FIELD.d);
  }
  if (sdfCan(bai, p.x, p.z) >= r) return;
  // Vẫn kẹt (góc giữa hai vật cản, sát mép bãi): tìm tâm ô trống gần nhất.
  let best = -1;
  let bestD = Infinity;
  for (let c = 0; c < NX * NZ; c++) {
    const x = cellX(c);
    const z = cellZ(c);
    if (sdfCan(bai, x, z) < r) continue;
    const d = len(x - p.x, z - p.z);
    if (d < bestD) (bestD = d), (best = c);
  }
  if (best < 0) return;
  p.x = cellX(best);
  p.z = cellZ(best);
}

/**
 * Hất `p` (thân bán kính `r`) từ chỗ đang đứng về phía (tx, tz) (đã giữ trong bãi): dừng ở chỗ trống cuối cùng trước
 * vật cản. Đường hất không vướng gì thì tới đúng (tx, tz).
 */
export function que(bai: Bai, r: number, p: Cho, tx: number, tz: number): void {
  dayRa(bai, r, p);
  const x0 = p.x;
  const z0 = p.z;
  const d = len(tx - x0, tz - z0);
  const n = Math.ceil(d / 0.1);
  for (let k = 1; k <= n; k++) {
    const x = x0 + ((tx - x0) * k) / n;
    const z = z0 + ((tz - z0) * k) / n;
    if (sdfCan(bai, x, z) < r) return;
    p.x = x;
    p.z = z;
  }
  p.x = tx;
  p.z = tz;
}

// ---------- Lưới đi và bản đồ khoảng cách ----------

/** Cạnh một ô lưới đi (ô bãi). */
export const O = 0.5;
export const NX = Math.round(FIELD.w / O);
export const NZ = Math.round(FIELD.d / O);
const SQRT2 = Math.SQRT2;
/** Thân to nhất (voi, tướng): lưới tìm đường phồng vật cản theo thân này, để lối nào tìm ra thì ai cũng lọt. */
export const THAN_TO = 0.45;
/** Bản đồ khoảng cách dựng lại mỗi chừng này giây trận. */
export const NAV_S = 0.25;
/** Lần theo bản đồ khoảng cách tối đa chừng này ô mỗi lần nhắm. */
const DO_XA = 6;

export const cellX = (c: number) => ((c % NX) + 0.5) * O;
export const cellZ = (c: number) => (Math.floor(c / NX) + 0.5) * O;
export function cellOf(x: number, z: number): number {
  const i = Math.min(NX - 1, Math.max(0, Math.floor(x / O)));
  const j = Math.min(NZ - 1, Math.max(0, Math.floor(z / O)));
  return j * NX + i;
}

/**
 * Lưới đi của bố cục cho thân bán kính `r`: ô nào trống (tâm ô cách vật cản ít nhất `r`), hệ số chậm từng ô, và từ mỗi
 * ô bước được sang những ô kề nào (`nb`, tối đa 8 mỗi ô, −1 là hết) dài bao nhiêu (`nd`).
 */
export interface Luoi {
  r: number;
  free: Uint8Array;
  cham: Float32Array;
  nb: Int32Array;
  nd: Float64Array;
}

const luois = new WeakMap<Bai, Map<number, Luoi>>();

const DIRS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Ô kề ô `c` theo hướng `d`, hay −1 khi ra ngoài lưới. */
function ke(c: number, d: number): number {
  const i = c % NX;
  const j = (c - i) / NX;
  const ni = i + DIRS[d][0];
  const nj = j + DIRS[d][1];
  return ni < 0 || nj < 0 || ni >= NX || nj >= NZ ? -1 : nj * NX + ni;
}

export function luoiDi(bai: Bai, r: number): Luoi {
  let m = luois.get(bai);
  if (!m) luois.set(bai, (m = new Map()));
  let l = m.get(r);
  if (l) return l;
  const N = NX * NZ;
  const free = new Uint8Array(N);
  const cham = new Float32Array(N);
  for (let c = 0; c < N; c++) {
    free[c] = sdfCan(bai, cellX(c), cellZ(c)) >= r ? 1 : 0;
    cham[c] = chamAt(bai, cellX(c), cellZ(c));
  }
  // Bước sang ô kề trống; đi chéo thì không cắt góc vật cản.
  const nb = new Int32Array(N * 8).fill(-1);
  const nd = new Float64Array(N * 8);
  for (let c = 0; c < N; c++) {
    if (!free[c]) continue;
    const i = c % NX;
    const j = (c - i) / NX;
    let k = 0;
    for (let d = 0; d < 8; d++) {
      const n = ke(c, d);
      if (n < 0 || !free[n]) continue;
      if (d >= 4 && (!free[j * NX + i + DIRS[d][0]] || !free[(j + DIRS[d][1]) * NX + i])) continue;
      nb[c * 8 + k] = n;
      nd[c * 8 + k] = d < 4 ? O : O * SQRT2;
      k++;
    }
  }
  m.set(r, (l = { r, free, cham, nb, nd }));
  return l;
}

/** Hàng đợi ưu tiên nhỏ cho Dijkstra (xóa lười: ô đã chốt thì bỏ qua khi lấy ra). */
export class Heap {
  private keys = new Float64Array(NX * NZ * 9);
  private vals = new Int32Array(NX * NZ * 9);
  size = 0;
  push(k: number, v: number): void {
    let i = this.size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= k) break;
      this.keys[i] = this.keys[p];
      this.vals[i] = this.vals[p];
      i = p;
    }
    this.keys[i] = k;
    this.vals[i] = v;
  }
  pop(): number {
    const top = this.vals[0];
    const k = this.keys[--this.size];
    const v = this.vals[this.size];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= this.size) break;
      if (c + 1 < this.size && this.keys[c + 1] < this.keys[c]) c++;
      if (this.keys[c] >= k) break;
      this.keys[i] = this.keys[c];
      this.vals[i] = this.vals[c];
      i = c;
    }
    this.keys[i] = k;
    this.vals[i] = v;
    return top;
  }
  topKey(): number {
    return this.keys[0];
  }
}

/**
 * Bản đồ khoảng cách (ô bãi) từ mọi ô tới nguồn gần nhất, đi theo lưới `l`: bước chéo dài √2 lần, ô chậm tốn hơn
 * (trừ khi `boi`). Nguồn rơi vào ô bị chặn thì lấy các ô trống kề bên.
 */
function dijkstra(l: Luoi, seeds: readonly number[], boi: boolean, out: Float64Array, heap: Heap): void {
  out.fill(Infinity);
  heap.size = 0;
  const { free, cham, nb, nd } = l;
  const seed = (c: number, k: number) => {
    if (k < out[c]) {
      out[c] = k;
      heap.push(k, c);
    }
  };
  for (const c of seeds) {
    if (free[c]) seed(c, 0);
    else
      for (let d = 0; d < 8; d++) {
        const n = ke(c, d);
        if (n >= 0 && free[n]) seed(n, d < 4 ? O : O * SQRT2);
      }
  }
  while (heap.size) {
    const k = heap.topKey();
    const c = heap.pop();
    if (k > out[c]) continue;
    for (let e = c * 8, end = e + 8; e < end; e++) {
      const n = nb[e];
      if (n < 0) break;
      const v = k + (boi ? nd[e] : nd[e] / cham[n]);
      if (v < out[n]) {
        out[n] = v;
        heap.push(v, n);
      }
    }
  }
}

/** Bản đồ khoảng cách tới ai: giặc gần nhất (quân ta lần theo), quân ta gần nhất (giặc lần theo), cuối bãi phía giặc (Tô Định bỏ chạy). */
export type Toi = 'giac' | 'ta' | 'rut';

/**
 * Trạng thái tìm đường của một trận trên bố cục `bai` (không lưu; mở lại bản lưu thì dựng lại). Bản đồ khoảng cách
 * tới hai phe chỉ dựng khi có người cần đi vòng, theo chỗ đứng lúc sang lượt.
 */
export interface Nav {
  bai: Bai;
  /** Lưới tìm đường (phồng theo thân to nhất). */
  to: Luoi;
  map: Record<Toi, Float64Array>;
  /** Ô đứng của mỗi phe lúc sang lượt, và bản đồ của phe ấy đã dựng theo đó chưa. */
  seeds: Record<'giac' | 'ta', number[]>;
  stale: Record<'giac' | 'ta', boolean>;
  /** Giặc còn lại đều là thủy quái: bản đồ tới quân ta không tính chậm khi lội. */
  giacBoi: boolean;
  /** Lượt dựng bản đồ gần nhất (`floor(t / NAV_S)`). */
  luot: number;
  heap: Heap;
}

export function taoNav(bai: Bai): Nav {
  const to = luoiDi(bai, THAN_TO);
  const heap = new Heap();
  const rut = new Float64Array(NX * NZ);
  const back: number[] = [];
  for (let i = 0; i < NX; i++) back.push(i);
  dijkstra(to, back, false, rut, heap);
  return {
    bai,
    to,
    map: { giac: new Float64Array(NX * NZ).fill(Infinity), ta: new Float64Array(NX * NZ).fill(Infinity), rut },
    seeds: { giac: [], ta: [] },
    stale: { giac: false, ta: false },
    giacBoi: false,
    luot: -1,
    heap,
  };
}

/**
 * Sang lượt mới (mỗi `NAV_S` giây trận) thì ghi lại chỗ đứng hai phe để dựng bản đồ khoảng cách khi cần. `giac`,
 * `ta`: chỗ những người còn đánh được của mỗi phe; `giacBoi`: giặc còn lại đều là thủy quái (lội nước không chậm).
 */
export function capNhatNav(nav: Nav, t: number, lay: () => { giac: readonly Cho[]; ta: readonly Cho[]; giacBoi: boolean }): void {
  const luot = Math.floor(t / NAV_S + 1e-9);
  if (luot === nav.luot) return;
  nav.luot = luot;
  const { giac, ta, giacBoi } = lay();
  nav.seeds.giac = giac.map((p) => cellOf(p.x, p.z));
  nav.seeds.ta = ta.map((p) => cellOf(p.x, p.z));
  nav.giacBoi = giacBoi;
  nav.stale.giac = nav.stale.ta = true;
}

/** Bản đồ khoảng cách tới `toi`, dựng lại nếu đã sang lượt mới. */
export function banDo(nav: Nav, toi: Toi): Float64Array {
  if (toi !== 'rut' && nav.stale[toi]) {
    nav.stale[toi] = false;
    dijkstra(nav.to, nav.seeds[toi], toi === 'ta' && nav.giacBoi, nav.map[toi], nav.heap);
  }
  return nav.map[toi];
}

/**
 * Nên bước về đâu để tới (tx, tz), theo bản đồ khoảng cách tới `toi`:
 * - không khóa đi vòng (`khoa`) và đường thẳng thông (`thong`) thì đi thẳng tới (tx, tz), như bãi phẳng;
 * - không thì lần theo bản đồ tối đa `DO_XA` ô, nhắm ô xa nhất còn đi thẳng tới được (`vong`: đang đi vòng).
 */
export function huongTheo(
  nav: Nav,
  toi: Toi,
  x: number,
  z: number,
  r: number,
  tx: number,
  tz: number,
  reach: number,
  boi: boolean,
  khoa: boolean,
): { x: number; z: number; vong: boolean } {
  const bai = nav.bai;
  if (!khoa && thong(bai, x, z, tx, tz, reach, r, boi)) return { x: tx, z: tz, vong: false };
  const field = banDo(nav, toi);
  const { nb } = nav.to;
  let cur = cellOf(x, z);
  // Thân nhỏ đứng sát vật cản (ô bị chặn với thân to): bắt đầu từ ô gần nhất có đường, trong vòng hai ô.
  if (!(field[cur] < Infinity)) {
    const i0 = cur % NX;
    const j0 = (cur - i0) / NX;
    let best = -1;
    let bestD = Infinity;
    for (let dj = -2; dj <= 2; dj++)
      for (let di = -2; di <= 2; di++) {
        const i = i0 + di;
        const j = j0 + dj;
        if (i < 0 || j < 0 || i >= NX || j >= NZ || !(field[j * NX + i] < Infinity)) continue;
        const d = len(cellX(j * NX + i) - x, cellZ(j * NX + i) - z) + field[j * NX + i] * 1e-3;
        if (d < bestD) (bestD = d), (best = j * NX + i);
      }
    if (best < 0) return { x: tx, z: tz, vong: true };
    cur = best;
  }
  const path = [cur];
  for (let k = 0; k < DO_XA; k++) {
    let best = -1;
    let bestV = field[cur];
    for (let e = cur * 8, end = e + 8; e < end; e++) {
      const n = nb[e];
      if (n < 0) break;
      if (field[n] < bestV) (bestV = field[n]), (best = n);
    }
    if (best < 0) break;
    path.push(best);
    cur = best;
  }
  for (let i = path.length - 1; i >= 1; i--) {
    const c = path[i];
    if (thong(bai, x, z, cellX(c), cellZ(c), 0, r, boi)) return { x: cellX(c), z: cellZ(c), vong: true };
  }
  const c = path.length > 1 ? path[1] : path[0];
  // Đã tới ô nguồn (kẻ địch ở ngay ô này hay ô kề): đi thẳng tới kẻ địch.
  if (path.length === 1 && field[c] === 0) return { x: tx, z: tz, vong: true };
  return { x: cellX(c), z: cellZ(c), vong: true };
}

// ---------- Luật bố cục ----------

/** Chỗ dàn quân hai bên: phải trống. */
const BANDS = [
  { z0: 0.3, z1: 6.4 },
  { z0: 15, z1: 21.7 },
];

/**
 * Kiểm một bố cục theo luật đã chốt (`docs/thiet-ke.md`, mục Bãi chiến có vật cản): nằm trong dải giữa, dải dàn quân
 * trống, vật cản dày ít nhất 0,6 ô, ô trống liền một khối, có lối rộng 2,5 ô, khe ≥ 1,6 ô, vật cản sát mép chìa ra
 * ngoài bãi, hàng nào cũng trống ≥ 4 ô, vùng chậm không quá nửa dải giữa. Trả về danh sách lỗi (rỗng là đúng luật).
 * Test và công cụ dựng bố cục dùng; trận không gọi.
 */
export function kiemBai(bai: Bai): string[] {
  const W = FIELD.w;
  const loi: string[] = [];
  const all = [...bai.can.map((c) => c.hinh), ...bai.cham.map((v) => v.hinh)];
  for (const h of all) {
    const b = bao(h);
    // Hình nằm trong dải giữa (tính theo phần nằm trong bãi).
    for (let x = -2; x <= W + 2; x += 0.1)
      for (const z of [DAI_GIUA.from - 0.05, DAI_GIUA.to + 0.05])
        if (sdHinh(h, x, z) < 0 && b.r > 0) {
          loi.push(`hình chạm ra ngoài dải giữa ở (${x.toFixed(1)}, ${z})`);
          x = Infinity;
          break;
        }
  }
  for (const c of bai.can) {
    const h = c.hinh;
    if ((h.k === 'tron' && h.r < 0.3) || (h.k === 'doan' && h.half < 0.3)) loi.push('vật cản mỏng hơn 0,6 ô');
  }
  // Dải dàn quân trống, cách vật cản ít nhất 0,6 ô, không có nước bùn.
  for (const { z0, z1 } of BANDS)
    for (let x = 0.3; x <= W - 0.3 + 1e-9; x += 0.1)
      for (let z = z0; z <= z1 + 1e-9; z += 0.1) {
        if (sdfCan(bai, x, z) < 0.6 || chamAt(bai, x, z) < 1) {
          loi.push(`dải dàn quân bị lấn ở (${x.toFixed(1)}, ${z.toFixed(1)})`);
          return loi;
        }
      }
  // Lưới thân to, thân nhỏ: mọi ô trống liền một khối, nối hai dải dàn quân.
  for (const r of [THAN_TO, 0.27]) {
    const l = luoiDi(bai, r);
    const comp = new Int32Array(NX * NZ).fill(-1);
    let n = 0;
    for (let c = 0; c < NX * NZ; c++) {
      if (!l.free[c] || comp[c] >= 0) continue;
      const stack = [c];
      comp[c] = n;
      while (stack.length) {
        const a = stack.pop()!;
        const i = a % NX;
        const j = (a - i) / NX;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
          const b = nj * NX + ni;
          if (l.free[b] && comp[b] < 0) (comp[b] = n), stack.push(b);
        }
      }
      n++;
    }
    if (n !== 1) loi.push(`lưới thân ${r} chia thành ${n} khối`);
  }
  // Có lối rộng 2,5 ô nối hai dải (tâm lối cách vật cản và mép bãi ít nhất 1,25 ô).
  const wide = (c: number) => Math.min(sdfCan(bai, cellX(c), cellZ(c)), cellX(c), W - cellX(c)) >= 1.25 - 1e-9;
  const seen = new Uint8Array(NX * NZ);
  const stack: number[] = [];
  for (let c = 0; c < NX * NZ; c++) if (cellZ(c) < 6 && wide(c)) (seen[c] = 1), stack.push(c);
  let crossed = false;
  while (stack.length && !crossed) {
    const a = stack.pop()!;
    if (cellZ(a) > 15) crossed = true;
    const i = a % NX;
    const j = (a - i) / NX;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
      const b = nj * NX + ni;
      if (!seen[b] && wide(b)) (seen[b] = 1), stack.push(b);
    }
  }
  if (!crossed) loi.push('không có lối rộng 2,5 ô nối hai dải dàn quân');
  // Khe giữa hai vật cản, giữa vật cản với mép bãi: liền nhau hay rộng ít nhất 1,6 ô.
  const hs = bai.can.map((c) => c.hinh);
  const step = 0.05;
  for (let a = 0; a < hs.length; a++) {
    const gaps: number[] = [];
    for (let b = a + 1; b < hs.length; b++) {
      let g = Infinity;
      for (let x = -1; x <= W + 1; x += step) for (let z = DAI_GIUA.from - 1; z <= DAI_GIUA.to + 1; z += step) g = Math.min(g, Math.max(0, sdHinh(hs[a], x, z)) + Math.max(0, sdHinh(hs[b], x, z)));
      gaps.push(g);
    }
    // Mép bãi: khe từ vật cản tới mép trái, mép phải.
    let left = Infinity;
    let right = Infinity;
    for (let z = DAI_GIUA.from; z <= DAI_GIUA.to; z += step)
      for (let x = 0; x <= W; x += step) {
        const s = Math.max(0, sdHinh(hs[a], x, z));
        left = Math.min(left, s + x);
        right = Math.min(right, s + W - x);
      }
    for (const g of [...gaps, left, right]) if (g > 0.05 && g < 1.6 - 0.05) loi.push(`khe hẹp ${g.toFixed(2)} ô`);
    // Liền mép bãi thì phải chìa ra ngoài bãi ít nhất 0,5 ô.
    if (left <= 0.05 && Math.min(...range(DAI_GIUA.from, DAI_GIUA.to, 0.1).map((z) => sdHinh(hs[a], -0.5, z))) > 0) loi.push('vật cản liền mép trái mà không chìa ra ngoài bãi');
    if (right <= 0.05 && Math.min(...range(DAI_GIUA.from, DAI_GIUA.to, 0.1).map((z) => sdHinh(hs[a], W + 0.5, z))) > 0) loi.push('vật cản liền mép phải mà không chìa ra ngoài bãi');
  }
  // Hàng ngang nào cũng còn ít nhất 4 ô trống; vùng chậm không quá nửa dải giữa.
  let slow = 0;
  let cells = 0;
  for (let z = DAI_GIUA.from; z <= DAI_GIUA.to; z += 0.1) {
    let open = 0;
    for (let x = 0.05; x < W; x += 0.1) {
      if (sdfCan(bai, x, z) >= 0) open += 0.1;
      if (chamAt(bai, x, z) < 1) slow++;
      cells++;
    }
    if (open < 4 - 1e-6) loi.push(`hàng z ${z.toFixed(1)} chỉ còn ${open.toFixed(1)} ô trống`);
  }
  if (slow > cells / 2) loi.push('vùng chậm quá nửa dải giữa');
  return [...new Set(loi)];
}

function range(a: number, b: number, s: number): number[] {
  const out: number[] = [];
  for (let v = a; v <= b + 1e-9; v += s) out.push(v);
  return out;
}
