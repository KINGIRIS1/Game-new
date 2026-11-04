// Lính đi bộ có khung xương (rig.ts, body.ts): giáo binh, cung thủ của ta; giặc Ân cầm qua, cầm cung, phó tướng
// cầm rìu; quân Triệu cầm kiếm, cầm nỏ; lính nỏ của ta (quỳ một gối khi bắn); thủy binh Triệu (lính thủy, cung
// thuyền, lính rìu giáp mây) và tướng thủy binh cầm đao dài; quân Hán (lính kích, nỏ thủ, giáp sĩ cầm đao vòng và
// khiên) và thái thú Tô Định (bỏ chạy thì rơi mũ, ôm ấn); nghĩa binh của Hai Bà cầm giáo tre. Mỗi lính một dáng,
// mỗi loại vũ khí một bộ động tác. Người cưỡi thú (Lạc tướng, quân Ân trên chiến xa, kỵ binh Triệu, Triệu Đà, Mã Viện
// cầm đại đao và cờ lệnh) cũng dựng ở đây, beasts.ts đặt lên lưng thú.

import * as THREE from 'three';
import type { FighterKind } from '../game/battle';
import {
  GRIP_L,
  GRIP_R,
  HUMAN,
  beginPose,
  fallPose,
  featherCrown,
  gripHands,
  hairCap,
  headband,
  hide,
  humanBody,
  humanHead,
  lerp,
  smooth,
  stance,
  strikeCurve,
  walkCycle,
  type Human,
  type HumanRig,
} from './body';
import { C } from './palette';
import { RigBuilder, bakeRig, skinRig, type Act, type BoneDef, type Bones, type Poser } from './rig';
import type { ShapeBuilder } from './shapes';
import {
  CO_LENH_TOP,
  LEATHER,
  arrow,
  bigAxe,
  bow,
  coLenhCan,
  coLenhLa,
  crossbowParts,
  daiDao,
  daoVong,
  drumShield,
  giaoTre,
  kich,
  longDao,
  qua,
  quiver,
  spear,
  sword,
} from './weapons';

/** Lính đông trong trận (tới vài chục): bớt số mặt cho nhẹ máy (xem `ShapeBuilder.detail`). */
const DETAIL = 0.7;

export type SoldierKind =
  | 'giao'
  | 'cung'
  | 'no'
  | 'giaoAn'
  | 'cungAn'
  | 'phoTuong'
  | 'linhTrieu'
  | 'noTrieu'
  | 'linhThuy'
  | 'cungThuyen'
  | 'linhRiu'
  | 'tuongThuy'
  | 'linhHan'
  | 'noHan'
  | 'giapHan'
  | 'nghiaBinh'
  | 'toDinh';
const KINDS: readonly FighterKind[] = [
  'giao',
  'cung',
  'no',
  'giaoAn',
  'cungAn',
  'phoTuong',
  'linhTrieu',
  'noTrieu',
  'linhThuy',
  'cungThuyen',
  'linhRiu',
  'tuongThuy',
  'linhHan',
  'noHan',
  'giapHan',
  'nghiaBinh',
  'toDinh',
];

/** Giáp mây đan của lính rìu Triệu. */
const RATTAN = 0xc9a45a;
const RATTAN_DARK = 0x9a7a3a;
/** Giáp sơn đen và lông chim đen của tướng thủy binh Triệu. */
const ARMOR_BLACK = 0x2a272e;
const FEATHER_BLACK = 0x3c3842;
/** Khăn đen của quân Hán, viền khiên giáp sĩ Hán. */
const HAN_BLACK = C.hanBlack;
/** Bắn thì quỳ một gối: hông hạ chừng này. */
const KNEEL_DROP = 0.17;
/** Khớp mũ quan của Tô Định (trên đỉnh đầu) và chỗ ấn đeo ở đai (trước bụng bên trái). */
const TO_DINH_HAT: [number, number, number] = [0, 0.9, -0.03];
const TO_DINH_SEAL: [number, number, number] = [-0.08, 0.29, 0.225];
export const isSoldier = (k: FighterKind): k is SoldierKind => KINDS.includes(k);

// ---------- Dáng ----------

/** Quân ta: chân trần, khố đỏ hoa văn chim Lạc, đai đồng, mũ lông chim Đông Sơn, hộ tâm gương đồng. */
function lacViet(r: HumanRig, plate: boolean, tier = 0): void {
  humanBody(r, {
    cloth: C.red,
    pattern: true,
    drumPlate: plate,
    crossStrap: plate ? C.woodDark : undefined,
    armband: C.bronze,
    greaves: plate || tier >= 1 ? C.bronze : undefined,
    wristband: tier >= 1 ? C.bronze : undefined,
  });
  humanHead(r);
  hairCap(r);
  headband(r, C.red);
  // Bậc 3: lông chim vàng xen giữa, cao hơn, vành mũ đồng vàng.
  featherCrown(r, tier >= 3 ? [C.red, C.gold, C.cream] : [C.red, C.cream], {
    count: tier >= 2 ? 9 : 7,
    len: tier >= 3 ? 0.47 : tier >= 2 ? 0.42 : 0.36,
    bronzeRim: true,
    rim: tier >= 3 ? C.gold : undefined,
    tier2: tier >= 2,
  });
}

/** Giặc Ân: khố sẫm, áo đỏ sẫm, giáp vai đồng mặt thú, mày xếch, mũ trụ đồng có chóp lông đỏ dựng cao. */
function anSoldier(r: HumanRig): void {
  humanBody(r, { cloth: C.enemyCloth, top: C.enemyRed, belt: C.bronzeDark, armband: C.bronzeDark });
  humanHead(r, { brows: true });
  // Tấm giáp vai (pauldrons) bằng đồng hình mặt thú thao thiết
  const chest = r.on('chest').plain;
  for (const s of [-1, 1]) {
    chest.box(0.08, 0.05, 0.09, C.bronzeDark, s * 0.17, 0.55, 0, [0, 0, -s * 0.3]);
    chest.sphere(0.03, C.bronzeLight, s * 0.18, 0.56, 0.03, [1, 1, 1], 4);
  }
  const p = r.on('head').plain;
  p.sphere(0.232, C.bronze, 0, 0.84, -0.025, [1, 0.62, 1], 10);
  p.cyl(0.236, 0.236, 0.03, C.bronzeDark, 0, 0.845, -0.025, undefined, 12);
  p.cone(0.055, 0.18, C.bronzeDark, 0, 1.04, -0.02, undefined, 6);
  p.box(0.03, 0.16, 0.03, C.red, 0, 1.15, -0.02);
}

/** Quân Triệu: quần đen, áo dài đen hoa văn, áo trong đỏ, mũ vải đen búi tóc có trâm cài, dải buộc đỏ. */
function trieuSoldier(r: HumanRig): void {
  humanBody(r, { legs: C.trieuCloth, cloth: C.trieuCloth, long: true, top: C.trieuRed, sleeves: C.trieuCloth, belt: C.trieuRed });
  humanHead(r, { brows: true, hairPin: C.bronze });
  const p = r.on('head').plain;
  p.sphere(0.225, C.trieuCloth, 0, 0.835, -0.03, [1, 0.6, 1], 10);
  p.sphere(0.08, C.trieuCloth, 0, 0.99, -0.05, [1, 1, 1], 8);
  p.box(0.04, 0.16, 0.02, C.trieuRed, 0.08, 0.76, -0.21, [0.2, 0, 0.2]);
}

/** Hàng lá giáp chạy ngang quanh một ống (`r0` ở đáy `y0`, `r1` ở đỉnh `y1`), mỗi hàng một vòng sẫm. */
function lamellae(p: ShapeBuilder, color: number, r0: number, r1: number, y0: number, y1: number, rows: number[]): void {
  for (const y of rows) {
    const rr = r0 + ((y - y0) / (y1 - y0)) * (r1 - r0) + 0.004;
    p.cyl(rr, rr, 0.014, color, 0, y, 0, undefined, 10);
  }
}

/** Giáp lá che ngực quân Hán (`vest`), ba hàng lá viền sẫm (`dark`). */
function hanVest(r: HumanRig, vest: number, dark: number): void {
  const chest = r.on('chest').plain;
  chest.cyl(0.155, 0.138, 0.2, vest, 0, 0.48, 0, undefined, 10);
  lamellae(chest, dark, 0.138, 0.155, 0.38, 0.58, [0.43, 0.49, 0.55]);
}

/** Quân Hán: quần đỏ sẫm, áo dài đỏ son quá gối, giáp (`vest`: lá sắt hay da) che ngực, khăn đen viền đỏ, vạt khăn dựng sau gáy. */
function hanSoldier(r: HumanRig, vest: number, dark: number): void {
  humanBody(r, { legs: C.hanRedDark, cloth: C.hanRed, pattern: false, long: true, top: C.hanRed, sleeves: C.hanRed, belt: dark });
  hanVest(r, vest, dark);
  humanHead(r, { brows: true });
  const head = r.on('head').plain;
  head.sphere(0.222, HAN_BLACK, 0, 0.84, -0.03, [1, 0.6, 1], 10);
  head.cyl(0.226, 0.226, 0.03, C.hanRed, 0, 0.815, -0.03, undefined, 12);
  head.box(0.17, 0.13, 0.06, HAN_BLACK, 0, 0.96, -0.12, [-0.3, 0, 0]);
}

/** Bao tên sau lưng, miệng bao chếch qua vai phải để tay phải rút tên. */
function backQuiver(r: HumanRig, color: number, iron: boolean): void {
  r.local('chest', [0.06, 0.55, -0.15], [-0.3, 0, -0.35], (s) => quiver(s, color, { iron }));
}

type Style = 'spear' | 'chop' | 'bow' | 'crossbow';

interface Spec {
  style: Style;
  /** Có khiên ở tay trái. */
  shield?: boolean;
  /** Vũ khí nặng (rìu lớn): bổ chậm hơn, ngả người nhiều hơn. */
  heavy?: boolean;
  /** Vũ khí ngắn (kiếm): đi thì cầm chúc xuống thay vì vác vai. */
  short?: boolean;
  /** Bắn thì quỳ một gối (lính nỏ của ta). */
  kneel?: boolean;
  /** Xương thêm ngoài thân người (mũ rơi được, ấn ôm được...). */
  bones?: Record<string, BoneDef<string>>;
  draw: (r: HumanRig, tier: number) => void;
  /** Đặt thêm sau tư thế chung, khi đồ đã vào tay (gọi lại `gripHands` nếu đổi tay). */
  after?: (b: Bones<string>, a: Act) => void;
}

const SPECS: Record<SoldierKind, Spec> = {
  giao: {
    style: 'spear',
    shield: true,
    draw: (r, tier) => {
      lacViet(r, true, tier);
      r.local('hand', GRIP_R, null, (s) => spear(s, tier));
      // Khiên tròn mặt trống đồng ở cẳng tay trái; bậc 2 viền sắt và tua đỏ; bậc 3 to hơn, viền đồng vàng, hai tua.
      r.local('armL', [-0.2, 0.39, 0.06], null, (s) => drumShield(s, tier >= 2, tier >= 3 ? 0.185 : 0.165, tier >= 3));
    },
  },
  cung: {
    style: 'bow',
    draw: (r, tier) => {
      lacViet(r, false, tier);
      if (tier >= 1) {
        // Giáp ngực da thuộc nẹp đinh đồng; bậc 3 giáp ngực đồng có núm vàng.
        r.on('chest').plain.box(0.25, 0.22, 0.02, tier >= 3 ? C.bronze : LEATHER, 0, 0.49, 0.11);
        r.on('chest').plain.sphere(tier >= 3 ? 0.03 : 0.018, tier >= 3 ? C.gold : C.bronzeLight, 0, 0.49, 0.122);
      }
      // Bậc 1 mũi tên sắt, bao tên da; bậc 2 cung sừng, bao tên đồng; bậc 3 cung bịt vàng, bao tên đồng vàng.
      r.local('handL', GRIP_L, null, (s) => bow(s, tier >= 2, tier >= 3));
      r.local('hand', GRIP_R, null, (s) => arrow(s, tier >= 1));
      backQuiver(r, tier >= 3 ? C.gold : tier >= 2 ? C.bronze : tier >= 1 ? LEATHER : C.woodLight, tier >= 1);
    },
  },
  no: {
    style: 'crossbow',
    kneel: true,
    draw: (r, tier) => {
      // Lính nỏ Cổ Loa: mũ đồng che thái dương, 3 chóp lông vũ, giáp da nẹp đinh đồng, xà cạp đồng, nỏ Cổ Loa lẫy đồng
      humanBody(r, {
        cloth: C.red,
        pattern: true,
        top: LEATHER,
        belt: C.bronze,
        armband: C.bronze,
        greaves: C.bronze,
        wristband: C.bronze,
      });
      humanHead(r);
      hairCap(r);
      const head = r.on('head').plain;
      head.sphere(0.235, C.bronze, 0, 0.84, -0.025, [1, 0.62, 1], 10);
      head.cyl(0.238, 0.238, 0.035, C.bronzeDark, 0, 0.84, -0.025, undefined, 12);
      // 3 chóp lông vũ biểu tượng chim thần; bậc 3 năm chóp, hai chóp ngoài lông vàng, vành mũ đồng vàng.
      const plumes = tier >= 3 ? 2 : 1;
      for (let i = -plumes; i <= plumes; i++) {
        const color = i === 0 ? C.red : Math.abs(i) === 2 ? C.gold : C.cream;
        head.box(0.05, 0.3, 0.025, color, i * 0.065, 1.04 - Math.abs(i) * 0.02, -0.06, [0, 0, -i * 0.28]);
      }
      if (tier >= 3) r.on('head').band.cyl(0.242, 0.242, 0.03, C.gold, 0, 0.815, -0.025, undefined, 12);
      r.local('hand', GRIP_R, null, (s) => {
        crossbowParts(s, false, 0.95);
        // Bậc 2 cánh nỏ bọc sừng; bậc 3 đầu cánh bịt đồng vàng, đai vàng quấn cổ nỏ.
        if (tier >= 2) for (const sx of [-1, 1]) s.plain.box(0.2, 0.035, 0.035, 0xe6d6a8, sx * 0.2, 0, 0.32, [0, sx * 0.25, 0]);
        if (tier >= 3) {
          for (const sx of [-1, 1]) s.plain.sphere(0.035, C.gold, sx * 0.39, 0, 0.27, [1, 1, 1], 6);
          s.band.box(0.09, 0.09, 0.06, C.gold, 0, 0, 0.3);
        }
      });
      backQuiver(r, tier >= 3 ? C.gold : tier >= 2 ? C.bronze : LEATHER, tier >= 1);
    },
  },
  giaoAn: {
    style: 'chop',
    draw: (r) => {
      anSoldier(r);
      r.local('hand', GRIP_R, null, qua);
    },
  },
  cungAn: {
    style: 'bow',
    draw: (r) => {
      anSoldier(r);
      r.local('handL', GRIP_L, null, (s) => bow(s));
      r.local('hand', GRIP_R, null, (s) => arrow(s));
      backQuiver(r, C.enemyRed, false);
    },
  },
  phoTuong: {
    style: 'chop',
    heavy: true,
    draw: (r) => {
      // Phó tướng Ân: giáp nặng, giáp vai lớn có gai nhọn, áo choàng chiến bào đỏ tung bay, mũ trụ chùm lông đỏ dài, đại phủ
      humanBody(r, { cloth: C.enemyCloth, top: C.enemyRed, belt: C.bronze, greaves: C.bronzeDark, wristband: C.bronze });
      const chest = r.on('chest');
      chest.band.cyl(0.155, 0.135, 0.22, C.enemyRed, 0, 0.48, 0, undefined, 12);
      chest.plain.box(0.48, 0.54, 0.035, C.enemyRed, 0, 0.36, -0.17, [0.15, 0, 0]);
      // Giáp vai lớn có gai nhọn uy hiếp
      for (const s of [-1, 1]) {
        chest.plain.box(0.1, 0.06, 0.11, C.bronzeDark, s * 0.18, 0.57, 0, [0, 0, -s * 0.35]);
        chest.plain.cone(0.045, 0.24, C.bronzeLight, s * 0.2, 0.64, 0, [0, 0, -s * 0.6], 6);
      }
      humanHead(r, { brows: true, beard: C.hair });
      const head = r.on('head').plain;
      head.sphere(0.238, C.bronze, 0, 0.84, -0.02, [1, 0.65, 1], 10);
      head.cyl(0.242, 0.242, 0.035, C.bronzeDark, 0, 0.84, -0.02, undefined, 12);
      // Bờm lông đỏ dài ngả về sau
      head.cone(0.1, 0.46, C.red, 0, 1.14, -0.08, [-0.3, 0, 0], 8);
      head.box(0.05, 0.32, 0.04, C.red, 0, 1.05, -0.22, [-0.5, 0, 0]);
      r.local('hand', GRIP_R, null, bigAxe);
    },
  },
  linhTrieu: {
    style: 'chop',
    shield: true,
    short: true,
    draw: (r) => {
      trieuSoldier(r);
      // Khiên chữ nhật sơn đỏ, lòng đen viền đồng; kiếm thẳng
      r.local('armL', [-0.2, 0.4, 0.07], null, (s) => {
        s.plain.box(0.32, 0.46, 0.035, C.trieuRed, 0, 0, 0);
        s.plain.box(0.24, 0.36, 0.045, C.trieuCloth, 0, 0, 0);
        s.plain.box(0.34, 0.04, 0.042, C.bronze, 0, 0.18, 0);
        s.plain.box(0.34, 0.04, 0.042, C.bronze, 0, -0.18, 0);
      });
      r.local('hand', GRIP_R, null, (s) => sword(s));
    },
  },
  noTrieu: {
    style: 'crossbow',
    draw: (r) => {
      trieuSoldier(r);
      r.local('hand', GRIP_R, null, (s) => crossbowParts(s, false, 0.85));
    },
  },
  // Thủy binh Triệu đội lốt cướp sông.
  linhThuy: {
    style: 'spear',
    draw: (r) => {
      // Cởi trần xăm trổ hình thuồng luồng / sóng nước Đông Sơn, khố đen viền đỏ, khăn đỏ quấn đầu, giáo ngắn
      humanBody(r, { cloth: C.trieuCloth, belt: C.trieuRed, armband: C.bronze, tattoo: true });
      humanHead(r, { brows: true });
      hairCap(r);
      headband(r, C.trieuRed);
      const head = r.on('head').plain;
      head.box(0.04, 0.16, 0.02, C.trieuRed, 0.08, 0.74, -0.22, [0.3, 0, 0.2]);
      r.local('hand', GRIP_R, null, (s) => spear(s, 1, 1.05));
    },
  },
  cungThuyen: {
    style: 'bow',
    draw: (r) => {
      // Nón rộng vành đen viền đỏ, áo ngắn đen, cung dài
      humanBody(r, { cloth: C.trieuCloth, top: C.trieuCloth, belt: C.trieuRed });
      humanHead(r, { brows: true });
      hairCap(r);
      const head = r.on('head').plain;
      head.cyl(0.31, 0.31, 0.022, C.trieuCloth, 0, 0.9, -0.02, undefined, 14);
      head.cyl(0.315, 0.315, 0.012, C.trieuRed, 0, 0.885, -0.02, undefined, 14);
      head.cone(0.19, 0.14, C.trieuCloth, 0, 0.98, -0.02, undefined, 10);
      r.local('handL', GRIP_L, null, (s) => bow(s));
      r.local('hand', GRIP_R, null, (s) => arrow(s));
      backQuiver(r, C.trieuRed, false);
    },
  },
  linhRiu: {
    style: 'chop',
    heavy: true,
    draw: (r) => {
      // Giáp mây đan dày nhiều tầng phủ ngực và vai, mũ mây bện đai sắt, đại rìu
      humanBody(r, { cloth: C.trieuCloth, top: RATTAN, belt: RATTAN_DARK, greaves: RATTAN_DARK });
      const chest = r.on('chest');
      chest.band.cyl(0.16, 0.14, 0.22, RATTAN, 0, 0.47, 0, undefined, 10);
      for (const y of [0.4, 0.48, 0.56]) chest.plain.cyl(0.165, 0.165, 0.018, RATTAN_DARK, 0, y, 0, undefined, 10);
      for (const sx of [-1, 1]) chest.plain.sphere(0.08, RATTAN, sx * 0.17, 0.57, 0, [1, 0.7, 1], 6);
      humanHead(r, { brows: true });
      const head = r.on('head').plain;
      head.sphere(0.235, RATTAN, 0, 0.84, -0.025, [1, 0.62, 1], 10);
      head.cyl(0.24, 0.24, 0.025, RATTAN_DARK, 0, 0.84, -0.025, undefined, 12);
      r.local('hand', GRIP_R, null, bigAxe);
    },
  },
  tuongThuy: {
    style: 'chop',
    heavy: true,
    draw: (r) => {
      // Tướng thủy binh Triệu (trùm cửa sông): giáp đen viền vàng to bản, giáp vai hai tầng, đai đỏ chéo ngực,
      // áo choàng đỏ viền vàng, mũ trụ đen chùm lông chim đen, râu đen, đao dài.
      humanBody(r, { legs: C.trieuCloth, cloth: ARMOR_BLACK, long: true, top: ARMOR_BLACK, sleeves: C.trieuCloth, belt: C.gold, armband: C.gold });
      for (const [b, x] of [
        ['legL', -0.065],
        ['legR', 0.065],
      ] as const) {
        const lp = r.on(b).plain;
        lp.cyl(0.056, 0.05, 0.12, ARMOR_BLACK, x, 0.09, 0.005, undefined, 8);
        lp.cyl(0.058, 0.058, 0.022, C.gold, x, 0.15, 0.005, undefined, 8);
      }
      // Vạt giáp đùi hai bên và vạt trước, viền vàng; khóa đai vàng.
      const hips = r.on('hips').plain;
      for (const sx of [-1, 1]) {
        hips.box(0.05, 0.22, 0.17, ARMOR_BLACK, sx * 0.175, 0.28, 0, [0, 0, -sx * 0.2]);
        hips.box(0.056, 0.03, 0.18, C.gold, sx * 0.197, 0.175, 0, [0, 0, -sx * 0.2]);
      }
      hips.box(0.15, 0.2, 0.03, ARMOR_BLACK, 0, 0.28, 0.175, [-0.15, 0, 0]);
      hips.box(0.156, 0.03, 0.036, C.gold, 0, 0.18, 0.19, [-0.15, 0, 0]);
      hips.box(0.1, 0.075, 0.04, C.gold, 0, 0.405, 0.135);
      // Giáp ngực đen nhiều lớp vảy viền vàng, rộng hơn thân lính.
      const chest = r.on('chest');
      chest.plain.cyl(0.178, 0.15, 0.24, ARMOR_BLACK, 0, 0.48, 0, undefined, 10);
      for (const y of [0.44, 0.52]) chest.plain.cyl(0.174 - (0.56 - y) * 0.1, 0.174 - (0.56 - y) * 0.1, 0.012, FEATHER_BLACK, 0, y, 0, undefined, 10);
      chest.plain.cyl(0.182, 0.182, 0.024, C.gold, 0, 0.6, 0, undefined, 10);
      chest.plain.cyl(0.154, 0.154, 0.022, C.gold, 0, 0.365, 0, undefined, 10);
      // Đai đỏ chéo trước ngực, từ vai phải xuống hông trái.
      chest.plain.box(0.065, 0.34, 0.025, C.trieuRed, 0, 0.48, 0.168, [0.08, 0, -0.72]);
      // Giáp vai hai tầng đen viền vàng.
      for (const sx of [-1, 1]) {
        chest.plain.sphere(0.1, ARMOR_BLACK, sx * 0.2, 0.575, 0, [1.2, 0.72, 1.1], 8);
        chest.plain.box(0.15, 0.024, 0.17, C.gold, sx * 0.215, 0.535, 0, [0, 0, -sx * 0.35]);
        chest.plain.sphere(0.085, ARMOR_BLACK, sx * 0.23, 0.505, 0, [1.05, 0.6, 1], 8);
        chest.plain.box(0.13, 0.02, 0.15, C.gold, sx * 0.25, 0.47, 0, [0, 0, -sx * 0.5]);
        chest.plain.sphere(0.024, C.gold, sx * 0.2, 0.635, 0, [1, 1, 1], 6);
      }
      // Áo choàng đỏ viền vàng.
      chest.plain.box(0.52, 0.56, 0.035, C.trieuRed, 0, 0.37, -0.205, [0.18, 0, 0]);
      chest.plain.box(0.54, 0.05, 0.04, C.gold, 0, 0.1, -0.255, [0.18, 0, 0]);
      // Hộ uyển đen viền vàng.
      for (const [b, sx] of [
        ['armL', -1],
        ['armR', 1],
      ] as const) {
        const ap = r.on(b).plain;
        ap.cyl(0.046, 0.04, 0.1, ARMOR_BLACK, sx * 0.135, 0.37, 0, undefined, 8);
        ap.cyl(0.048, 0.048, 0.02, C.gold, sx * 0.135, 0.41, 0, undefined, 8);
      }
      // Mặt dữ, râu đen; mũ trụ đen vành vàng, che gáy, chóp vàng, chùm lông chim đen.
      humanHead(r, { brows: true, mustache: C.hair });
      const head = r.on('head').plain;
      head.cone(0.07, 0.16, C.hair, 0, 0.6, 0.15, [Math.PI + 0.3, 0, 0], 6);
      head.sphere(0.242, ARMOR_BLACK, 0, 0.845, -0.025, [1, 0.66, 1], 10);
      head.cyl(0.246, 0.246, 0.03, C.gold, 0, 0.83, -0.025, undefined, 12);
      head.box(0.38, 0.13, 0.05, ARMOR_BLACK, 0, 0.75, -0.2, [0.35, 0, 0]);
      head.box(0.39, 0.025, 0.055, C.gold, 0, 0.69, -0.22, [0.35, 0, 0]);
      head.box(0.07, 0.07, 0.03, C.gold, 0, 0.89, 0.205, [0, 0, Math.PI / 4]);
      head.sphere(0.035, C.gold, 0, 1.0, -0.03, [1, 1, 1], 6);
      featherCrown(r, [FEATHER_BLACK, ARMOR_BLACK], { count: 7, len: 0.46 });
      r.local('hand', GRIP_R, null, longDao);
    },
  },
  // Chương 5: quân Hán áo đỏ son.
  linhHan: {
    style: 'spear',
    draw: (r) => {
      // Lính kích: giáp lá sắt, kích sắt lưỡi ngang.
      hanSoldier(r, C.hanIron, C.hanIronDark);
      r.local('hand', GRIP_R, null, kich);
    },
  },
  noHan: {
    style: 'crossbow',
    draw: (r) => {
      // Nỏ thủ: giáp da, nỏ lớn lẫy đồng, đứng bắn; bao tên đỏ sẫm sau lưng.
      hanSoldier(r, LEATHER, C.woodDark);
      r.local('hand', GRIP_R, null, (s) => crossbowParts(s, false, 0.92));
      backQuiver(r, C.hanRedDark, true);
    },
  },
  giapHan: {
    style: 'chop',
    shield: true,
    short: true,
    draw: (r) => {
      // Giáp sĩ: giáp lá sắt phủ tới gối, giáp vai, mũ sắt che gáy và má, chóp tua đỏ; khiên chữ nhật lớn sơn đỏ viền
      // đen núm sắt; đao vòng.
      humanBody(r, {
        legs: C.hanRedDark,
        cloth: C.hanIron,
        pattern: false,
        long: true,
        top: C.hanIron,
        sleeves: C.hanRed,
        belt: C.hanRedDark,
        greaves: C.hanIronDark,
        wristband: C.hanIronDark,
      });
      lamellae(r.on('hips').plain, C.hanIronDark, 0.19, 0.125, 0.11, 0.41, [0.17, 0.25, 0.33]);
      hanVest(r, C.hanIron, C.hanIronDark);
      const chest = r.on('chest').plain;
      for (const sx of [-1, 1]) {
        chest.sphere(0.085, C.hanIron, sx * 0.18, 0.565, 0, [1.15, 0.7, 1.05], 8);
        chest.box(0.13, 0.02, 0.15, C.hanIronDark, sx * 0.2, 0.525, 0, [0, 0, -sx * 0.4]);
      }
      humanHead(r, { brows: true });
      const head = r.on('head').plain;
      head.sphere(0.238, C.hanIron, 0, 0.845, -0.025, [1, 0.66, 1], 10);
      head.cyl(0.242, 0.242, 0.03, C.hanIronDark, 0, 0.83, -0.025, undefined, 12);
      head.box(0.36, 0.14, 0.05, C.hanIron, 0, 0.74, -0.2, [0.35, 0, 0]);
      for (const sx of [-1, 1]) head.box(0.03, 0.14, 0.1, C.hanIron, sx * 0.215, 0.73, -0.03);
      head.cyl(0.022, 0.022, 0.06, C.hanIronDark, 0, 1.0, -0.03, undefined, 6);
      head.cone(0.065, 0.15, C.hanRed, 0, 1.08, -0.04, [Math.PI, 0, 0], 7);
      r.local('armL', [-0.21, 0.38, 0.07], null, (s) => {
        s.plain.box(0.38, 0.56, 0.03, HAN_BLACK, 0, 0, 0);
        s.plain.box(0.32, 0.5, 0.04, C.hanRed, 0, 0, 0);
        s.plain.box(0.32, 0.03, 0.046, HAN_BLACK, 0, 0.12, 0);
        s.plain.box(0.32, 0.03, 0.046, HAN_BLACK, 0, -0.12, 0);
        s.plain.sphere(0.055, C.hanIron, 0, 0, 0.03, [1, 1, 0.6], 8);
      });
      r.local('hand', GRIP_R, null, daoVong);
    },
  },
  // Nghĩa binh của Hai Bà: dân làng theo khởi nghĩa, không giáp.
  nghiaBinh: {
    style: 'spear',
    draw: (r) => {
      // Áo nâu, khố nâu, chân đất, thắt lưng vải; khăn nâu vấn hai vòng, mối buộc sau gáy; giáo tre tầm vông.
      humanBody(r, { cloth: C.aoNau, pattern: false, top: C.aoNau, sleeves: C.aoNau, belt: C.khanNau });
      const chest = r.on('chest').plain;
      chest.box(0.025, 0.15, 0.012, C.khanNau, 0, 0.5, 0.115, [0.15, 0, 0]);
      humanHead(r);
      hairCap(r);
      const head = r.on('head').plain;
      // Khăn trùm kín đỉnh đầu, quấn hai lớp chéo nhau sát trán.
      head.sphere(0.222, C.khanNau, 0, 0.86, -0.035, [1, 0.55, 1], 12);
      head.add(new THREE.TorusGeometry(0.2, 0.032, 5, 14), C.khanNau, 0, 0.835, -0.03, [Math.PI / 2 + 0.12, 0, 0]);
      head.add(new THREE.TorusGeometry(0.182, 0.028, 5, 14), C.aoNau, 0, 0.885, -0.04, [Math.PI / 2 - 0.12, 0, 0.06]);
      head.sphere(0.05, C.khanNau, 0, 0.85, -0.235, [1.2, 0.9, 0.8], 6);
      for (const s of [-1, 1]) head.box(0.035, 0.12, 0.02, C.khanNau, s * 0.035, 0.79, -0.26, [0.25, 0, s * 0.25]);
      r.local('hand', GRIP_R, null, giaoTre);
    },
  },
  // Thái thú Tô Định: trùm màn 36.
  toDinh: {
    style: 'chop',
    short: true,
    bones: {
      hat: { parent: 'head', at: TO_DINH_HAT },
      seal: { parent: 'chest', at: TO_DINH_SEAL },
    },
    draw: (r) => {
      // Quan phục đen dài tới chân, gấu và cổ giao lĩnh viền đỏ, tay áo rộng, đai đỏ thắt dưới bụng phệ.
      humanBody(r, { legs: C.quanPhuc, cloth: C.quanPhuc, pattern: false, long: true, top: C.quanPhuc, sleeves: C.quanPhuc, belt: C.hanRedDark });
      const hips = r.on('hips').plain;
      hips.cyl(0.19, 0.21, 0.1, C.quanPhuc, 0, 0.07, 0, undefined, 12);
      hips.cyl(0.212, 0.214, 0.025, C.hanRed, 0, 0.03, 0, undefined, 12);
      hips.sphere(0.17, C.quanPhuc, 0, 0.37, 0.045, [1, 0.92, 1.05], 10);
      hips.cyl(0.186, 0.186, 0.04, C.hanRed, 0, 0.39, 0.035, undefined, 12);
      const chest = r.on('chest').plain;
      for (const s of [-1, 1]) chest.box(0.035, 0.17, 0.014, C.hanRed, s * 0.035, 0.5, 0.118, [0.12, 0, s * 0.55]);
      for (const [b, s] of [
        ['armL', -1],
        ['armR', 1],
      ] as const) {
        const ap = r.on(b).plain;
        ap.cyl(0.078, 0.046, 0.15, C.quanPhuc, s * 0.135, 0.37, 0, undefined, 8);
        ap.cyl(0.08, 0.08, 0.02, C.hanRed, s * 0.135, 0.3, 0, undefined, 8);
      }
      // Mặt quan: mày rậm, má phính, ria mép, râu dê.
      humanHead(r, { brows: true, mustache: C.hair });
      const head = r.on('head').plain;
      for (const s of [-1, 1]) head.sphere(0.06, C.skin, s * 0.12, 0.68, 0.11, [1, 0.85, 0.8], 7);
      head.cone(0.035, 0.16, C.hair, 0, 0.6, 0.165, [Math.PI + 0.35, 0, 0], 5);
      hairCap(r);
      // Mũ quan cao (xương riêng, rơi khi bỏ chạy): vành đen, mũ dựng ngả ra sau, trâm vàng ngang, dây đỏ quai mũ.
      const rig = r as unknown as RigBuilder<string>;
      const hat = rig.on('hat').plain;
      hat.cyl(0.226, 0.23, 0.08, C.quanPhuc, 0, 0.87, -0.03, undefined, 12);
      hat.box(0.17, 0.25, 0.13, C.quanPhuc, 0, 1.02, -0.06, [-0.22, 0, 0]);
      hat.cyl(0.062, 0.062, 0.17, C.quanPhuc, 0, 1.14, -0.09, [0, 0, Math.PI / 2], 8);
      hat.cyl(0.012, 0.012, 0.36, C.gold, 0, 0.98, -0.06, [0, 0, Math.PI / 2], 5);
      for (const s of [-1, 1]) {
        hat.sphere(0.025, C.gold, s * 0.18, 0.98, -0.06, [1, 1, 1], 6);
        hat.box(0.012, 0.2, 0.012, C.hanRed, s * 0.2, 0.75, 0.02);
      }
      // Ấn vàng núm rùa, dây thao đỏ, đeo trước bụng bên trái (xương riêng, ôm vào bụng khi bỏ chạy).
      rig.local('seal', TO_DINH_SEAL, null, (s) => {
        s.plain.box(0.016, 0.1, 0.012, C.hanRed, 0, 0.07, -0.01);
        s.plain.box(0.075, 0.06, 0.075, C.gold, 0, 0, 0);
        s.plain.sphere(0.026, C.goldDark, 0, 0.04, 0, [1.2, 0.7, 1.4], 6);
        s.plain.cone(0.022, 0.09, C.hanRed, 0, -0.07, 0, [Math.PI, 0, 0], 5);
      });
      r.local('hand', GRIP_R, null, (s) => sword(s, 0.62, C.gold));
    },
    after: (bones, a) => {
      const b = bones as unknown as Human;
      hide(bones.hat, !!a.flee);
      if (!a.flee || a.act === 'dead') return;
      // Bỏ chạy: đã vứt kiếm, hai tay ôm ấn trước bụng, chúi người, ngoái đầu nhìn lại.
      const sw = a.act === 'walk' ? Math.sin(a.phase ?? 0) : 0;
      b.armR.rotation.set(-1.0 + 0.08 * sw, 0, -0.38);
      b.armL.rotation.set(-1.0 - 0.08 * sw, 0, 0.38);
      b.chest.rotation.set(0.28, -0.1 * sw, 0);
      b.head.rotation.set(-0.15, 0.55 + 0.1 * sw, 0);
      hide(b.hand, true);
      gripHands(b);
      bones.seal.position.addVectors(b.hand.position, b.handL.position).multiplyScalar(0.5);
      bones.seal.position.z += 0.035;
    },
  },
};

// ---------- Động tác ----------

/** Bốn động tác của một loại vũ khí: đứng nghỉ, cầm khi đi, đánh, rơi khi ngã. */
interface Moves {
  rest(b: Human, spec: Spec): void;
  carry(b: Human, sw: number, spec: Spec): void;
  fight(b: Human, k: number | undefined, spec: Spec): void;
  drop(b: Human, f: number): void;
}

/** Khiên đưa ra che trước bụng. */
function shieldUp(b: Human, e = 0): void {
  b.armL.rotation.set(lerp(-0.95, -0.6, e), 0, lerp(-0.1, -0.3, e));
}

const MOVES: Record<Style, Moves> = {
  spear: {
    // Đứng: giáo dựng bên phải, khiên che bụng. Đi: vác giáo ngả về trước.
    rest: (b) => {
      b.armL.rotation.set(-0.45, 0, -0.28);
      b.hand.rotation.set(0.06, 0, -0.06);
    },
    carry: (b, sw) => {
      b.armL.rotation.set(-0.45 - 0.3 * sw, 0, -0.28);
      b.armR.rotation.x = -0.15 + 0.2 * sw;
      b.hand.rotation.set(0.35, 0, -0.06);
    },
    // Thế thủ: chân trái trước, vai trái và khiên đưa ra, giáo kẹp ngang hông chĩa tới.
    // Đâm: lao người tới, xoay vai phải lên, duỗi thẳng tay, giáo nằm ngang.
    fight: (b, k) => {
      const e = strikeCurve(k);
      stance(b, lerp(0.3, 0.55, e), lerp(0.28, 0.45, e));
      b.hips.position.z += 0.06 * e;
      b.hips.rotation.y = lerp(0.15, -0.1, e);
      b.chest.rotation.set(lerp(0.12, 0.32, e), lerp(0.3, -0.3, e), 0);
      const face = -b.chest.rotation.y - b.hips.rotation.y;
      b.head.rotation.set(lerp(-0.1, -0.28, e), face, 0);
      b.armR.rotation.set(lerp(-0.4, -1.35, e), 0, lerp(0.18, 0.05, e));
      shieldUp(b, e);
      b.hand.rotation.set(lerp(1.35, 1.57, e), face, 0);
    },
    drop: (b, f) => b.hand.rotation.set(lerp(0.06, -0.9, f), 0, -0.06),
  },
  chop: {
    rest: (b, spec) => {
      if (spec.shield) b.armL.rotation.set(-0.45, 0, -0.28);
      // Cán dài nghiêng ra ngoài cho lưỡi khỏi che mặt.
      b.hand.rotation.set(spec.short ? 0.25 : 0.08, 0, spec.short ? -0.06 : -0.25);
    },
    // Đi: vũ khí cán dài vác vai, kiếm cầm chúc xuống.
    carry: (b, sw, spec) => {
      if (spec.shield) b.armL.rotation.set(-0.45 - 0.3 * sw, 0, -0.28);
      if (spec.short) b.hand.rotation.set(0.6, 0, -0.1);
      else {
        b.armR.rotation.x = -0.7 + 0.1 * sw;
        b.hand.rotation.set(-0.75, 0, -0.1);
      }
    },
    // Thủ: giơ cao vũ khí quá đầu, lưỡi ngả ra sau, người hơi ngả. Bổ: vụt xuống trước mặt, lao người tới.
    fight: (b, k, spec) => {
      const e = spec.heavy ? strikeCurve(k, 0.3, 0.5) : strikeCurve(k, 0.22, 0.4);
      stance(b, lerp(0.25, 0.5, e), lerp(0.25, 0.4, e));
      b.hips.position.z += 0.05 * e;
      b.chest.rotation.set(lerp(-0.08, spec.heavy ? 0.45 : 0.35, e), lerp(0.25, -0.25, e), 0);
      b.head.rotation.set(lerp(0.05, -0.3, e), -b.chest.rotation.y, 0);
      b.armR.rotation.set(lerp(-3.0, -1.0, e), 0, lerp(0.15, 0.05, e));
      b.hand.rotation.set(lerp(-0.9, spec.short ? 1.6 : 1.9, e), 0, 0);
      if (spec.shield) shieldUp(b, e);
      else b.armL.rotation.set(lerp(-0.6, -0.2, e), 0, -0.3);
    },
    drop: (b, f) => b.hand.rotation.set(lerp(0.08, -1.0, f), 0, 0),
  },
  bow: {
    // Đứng, đi: cung cầm tay trái buông xuôi, tay phải không cầm tên.
    rest: (b) => {
      b.armL.rotation.set(-0.1, 0, -0.25);
      b.handL.rotation.set(0.1, 0, 0);
      hide(b.hand, true);
    },
    carry: (b) => {
      b.handL.rotation.set(0.1, 0, 0);
      hide(b.hand, true);
    },
    // Ngắm: đứng nghiêng, vai trái chĩa về giặc, tay trái đẩy cung, tay phải kéo dây tới má.
    // Bắn: buông dây (tay phải bật ra sau), với ra sau vai rút tên, lắp tên, kéo dây lại.
    fight: (b, k) => {
      const flick = k !== undefined && k < 0.25 ? Math.sin((Math.PI * k) / 0.25) : 0;
      const reach = k !== undefined && k > 0.2 && k < 0.7 ? Math.sin((Math.PI * (k - 0.2)) / 0.5) : 0;
      const yaw = k === undefined ? 0.9 : k < 0.5 ? lerp(0.9, 0.6, smooth(k, 0.1, 0.5)) : lerp(0.6, 0.9, smooth(k, 0.7, 1));
      stance(b, 0.2, 0.2);
      b.hips.rotation.y = yaw * 0.3;
      b.chest.rotation.y = yaw * 0.7;
      b.head.rotation.set(-0.05, -yaw, 0);
      b.armL.rotation.set(-1.5, -yaw, 0);
      b.handL.rotation.set(0, -yaw, 0.12);
      b.armR.rotation.set(lerp(-1.5, -2.9, reach), lerp(lerp(-yaw - 0.05, 0.6, flick), 0.3, reach), 0);
      b.hand.rotation.set(Math.PI / 2, -yaw, 0);
      hide(b.hand, k !== undefined && k < 0.55);
    },
    drop: (b, f) => {
      b.handL.rotation.set(lerp(0.1, -0.6, f), 0, 0);
      hide(b.hand, true);
    },
  },
  crossbow: {
    // Đứng, đi: nỏ cầm ngang thắt lưng, mũi chúc xuống.
    rest: (b) => {
      b.armR.rotation.set(-0.5, 0, 0.1);
      b.armL.rotation.set(-0.55, 0.45, 0);
      b.hand.rotation.set(0.5, 0, 0);
    },
    carry: (b, sw) => {
      b.armR.rotation.set(-0.5 + 0.1 * sw, 0, 0.1);
      b.armL.rotation.set(-0.55 - 0.1 * sw, 0.45, 0);
      b.hand.rotation.set(0.5, 0, 0);
    },
    // Ngắm: nâng nỏ ngang vai. Bắn: nỏ giật lên, rồi hạ xuống lên dây, lại nâng lên ngắm.
    fight: (b, k) => {
      const kick = k !== undefined && k < 0.3 ? Math.sin((Math.PI * k) / 0.3) : 0;
      const load = k !== undefined && k > 0.3 && k < 0.85 ? Math.sin((Math.PI * (k - 0.3)) / 0.55) : 0;
      stance(b, 0.22, 0.22);
      b.chest.rotation.set(0.05 - 0.1 * kick + 0.1 * load, 0.2, 0);
      b.head.rotation.set(-0.05, -0.2, 0);
      b.armR.rotation.set(-1.35 - 0.25 * kick + 0.9 * load, -0.1, 0.05);
      b.armL.rotation.set(-1.45 - 0.2 * kick + 0.8 * load, 0.35, 0);
      b.hand.rotation.set(-b.chest.rotation.x - 0.5 * kick + 0.9 * load, -0.2, 0);
    },
    drop: (b, f) => b.hand.rotation.set(lerp(0.5, 1.2, f), 0, 0),
  },
};

function poseSoldier(spec: Spec, b: Human, a: Act): void {
  beginPose(b, a.time);
  const moves = MOVES[spec.style];
  if (a.act === 'walk') moves.carry(b, walkCycle(b, a.phase ?? 0, a.stride ?? 0.5), spec);
  else if (a.act === 'fight') {
    moves.fight(b, a.strike, spec);
    if (spec.kneel) {
      // Quỳ một gối: chân trái co ra trước, chân phải quỳ ra sau, hông hạ thấp cho vững nỏ.
      b.legL.rotation.x = -1.25;
      b.legR.rotation.x = 0.45;
      b.hips.position.y = (b.hips.userData.rest as THREE.Vector3).y - KNEEL_DROP;
    }
  } else if (a.act === 'dead') {
    const f = a.fall ?? 1;
    fallPose(b, f);
    moves.drop(b, f);
  } else moves.rest(b, spec);
  gripHands(b);
  spec.after?.(b as unknown as Bones<string>, a);
}

function shapeOf(kind: SoldierKind, tier: number) {
  const spec = SPECS[kind];
  const r = new RigBuilder<string>({ ...HUMAN, ...spec.bones }, DETAIL);
  spec.draw(r as unknown as HumanRig, tier);
  return r.build();
}

// ---------- Người cưỡi ----------

/** Người cưỡi voi, cưỡi ngựa hay đứng trên chiến xa. Khung xương người dời lên lưng thú (beasts.ts). */
export type RiderKind = 'lacTuong' | 'anXa' | 'daiTuong' | 'kyBinh' | 'trieuDa' | 'maVien';

/** Chỗ buộc lá cờ lệnh của Mã Viện trên cán (tư thế gốc: tay trái buông, cán dựng đứng từ chỗ tay nắm). */
const MA_VIEN_FLAG: [number, number, number] = [GRIP_L[0], GRIP_L[1] + CO_LENH_TOP, GRIP_L[2]];

/**
 * Mã Viện: tay trái cầm cờ lệnh dựng đứng bên ngựa, lá cờ bay phần phật. `skill` (Lệnh nỏ) 0..1: rướn người giơ đại
 * đao chỉ thẳng về trước, tay trái giơ cờ lệnh quá đầu phất sang hai bên hai lượt, rồi hạ xuống.
 */
function poseMaVien(bones: Bones<string>, a: Act): void {
  const b = bones as unknown as Human;
  const cloth = bones.coLenh;
  if (a.act === 'dead') {
    cloth.rotation.y = 0.7 * (a.fall ?? 1);
    return;
  }
  const t = a.time ?? 0;
  const sway = a.act === 'walk' ? Math.sin(a.phase ?? 0) : 0;
  b.armL.rotation.set(-0.42 - 0.06 * sway, 0, -0.3);
  b.handL.rotation.set(0.1, 0, 0.14);
  let flap = 0.25 * Math.sin(t * 5.2) + 0.12 * sway;
  if (a.skill !== undefined) {
    const k = a.skill;
    const up = smooth(k, 0, 0.18) * (1 - smooth(k, 0.82, 1));
    const sweep = Math.sin(Math.PI * 4 * Math.min(Math.max((k - 0.15) / 0.65, 0), 1));
    b.chest.rotation.x = lerp(b.chest.rotation.x, 0.16, up);
    b.chest.rotation.y = lerp(b.chest.rotation.y, 0.12, up);
    b.head.rotation.set(lerp(b.head.rotation.x, -0.15, up), lerp(b.head.rotation.y, -0.12, up), 0);
    // Đao chếch lên chừng 35° cho khỏi trông như chĩa xuống đất khi nhìn từ trên cao.
    b.armR.rotation.set(lerp(b.armR.rotation.x, -2.0, up), lerp(b.armR.rotation.y, 0, up), lerp(b.armR.rotation.z, 0.12, up));
    b.hand.rotation.set(lerp(b.hand.rotation.x, 0.8, up), lerp(b.hand.rotation.y, 0, up), lerp(b.hand.rotation.z, 0, up));
    b.armL.rotation.set(lerp(b.armL.rotation.x, -2.75, up), 0, lerp(-0.3, -0.32 - 0.32 * sweep, up));
    b.handL.rotation.set(lerp(0.1, -0.05, up), 0, lerp(0.14, 0.75 * sweep, up));
    flap = lerp(flap, 0.85 * Math.sin(Math.PI * 9 * k), up);
  }
  cloth.rotation.y = flap;
  gripHands(b);
}

const RIDERS: Record<RiderKind, Spec> = {
  // Lạc tướng cưỡi voi: như giáo binh, cầm giáo mũi đồng, không khiên.
  lacTuong: {
    style: 'spear',
    draw: (r) => {
      lacViet(r, true);
      r.local('hand', GRIP_R, null, (s) => spear(s, 0));
    },
  },
  anXa: {
    style: 'chop',
    draw: (r) => {
      anSoldier(r);
      r.local('hand', GRIP_R, null, qua);
    },
  },
  // Đại tướng Ân: giáp đồng, áo choàng đỏ, mũ trụ đồng sáng chùm lông vàng cao, rìu đồng lớn.
  daiTuong: {
    style: 'chop',
    heavy: true,
    draw: (r) => {
      humanBody(r, { cloth: C.enemyCloth, top: C.bronzeDark, belt: C.bronzeLight });
      const chest = r.on('chest');
      chest.band.cyl(0.155, 0.135, 0.2, C.bronzeDark, 0, 0.48, 0, undefined, 10);
      chest.plain.box(0.48, 0.5, 0.035, C.enemyRed, 0, 0.36, -0.17, [0.15, 0, 0]);
      for (const s of [-1, 1]) chest.plain.cone(0.045, 0.22, C.bronzeLight, s * 0.18, 0.6, 0, [0, 0, -s * 0.6], 5);
      humanHead(r, { brows: true });
      const head = r.on('head').plain;
      head.sphere(0.238, C.bronzeLight, 0, 0.84, -0.02, [1, 0.65, 1], 10);
      head.cone(0.09, 0.55, C.ember, 0, 1.18, -0.07, [-0.25, 0, 0], 6);
      r.local('hand', GRIP_R, null, bigAxe);
    },
  },
  // Kỵ binh Triệu: giáo dài có cờ đuôi nheo đỏ.
  kyBinh: {
    style: 'spear',
    draw: (r) => {
      trieuSoldier(r);
      r.local('hand', GRIP_R, null, (s) => {
        spear(s, 1, 1.5);
        s.plain.box(0.02, 0.12, 0.2, C.trieuRed, 0, 1.0, -0.1);
      });
    },
  },
  // Triệu Đà già: râu bạc dài, mày bạc, giáp vàng, mũ đen hai cánh chuồn viền vàng, áo choàng đỏ, kiếm dài.
  trieuDa: {
    style: 'chop',
    draw: (r) => {
      humanBody(r, { legs: C.trieuCloth, cloth: C.ink, long: true, top: C.gold, sleeves: C.trieuCloth, belt: C.gold });
      const chest = r.on('chest').plain;
      chest.box(0.46, 0.5, 0.035, C.trieuRed, 0, 0.38, -0.17, [0.18, 0, 0]);
      for (const s of [-1, 1]) chest.box(0.1, 0.06, 0.16, C.ink, s * 0.16, 0.57, 0, [0, 0, s * 0.3]);
      humanHead(r, { beard: C.beard });
      const head = r.on('head').plain;
      for (const s of [-1, 1]) head.box(0.08, 0.022, 0.02, C.beard, s * 0.078, 0.8, 0.178, [0, 0, -s * 0.32]);
      head.cyl(0.2, 0.23, 0.24, C.ink, 0, 0.92, -0.03, undefined, 10);
      head.cyl(0.235, 0.235, 0.04, C.gold, 0, 0.82, -0.03, undefined, 10);
      for (const s of [-1, 1]) {
        head.box(0.34, 0.12, 0.02, C.ink, s * 0.36, 0.98, -0.13, [0, 0, s * 0.15]);
        head.box(0.34, 0.025, 0.025, C.gold, s * 0.36, 1.04, -0.12, [0, 0, s * 0.15]);
      }
      r.local('hand', GRIP_R, null, (s) => sword(s, 0.9, C.gold));
    },
  },
  // Phục Ba tướng quân Mã Viện: lão tướng râu tóc bạc, giáp lá đồng đỏ, áo choàng đỏ son, mũ trụ đồng chùm lông đỏ,
  // đại đao; tay trái cầm cờ lệnh đen (xương riêng cho lá cờ bay).
  maVien: {
    style: 'chop',
    heavy: true,
    bones: { coLenh: { parent: 'handL', at: MA_VIEN_FLAG } },
    draw: (r) => {
      humanBody(r, {
        legs: C.hanRedDark,
        cloth: C.copper,
        pattern: false,
        long: true,
        top: C.copper,
        sleeves: C.hanRed,
        belt: C.gold,
        greaves: C.copperDark,
        wristband: C.copperDark,
      });
      // Vạt giáp lá đồng phủ tới gối, giáp ngực ba hàng lá, hộ tâm đồng vàng, đai đỏ.
      lamellae(r.on('hips').plain, C.copperDark, 0.19, 0.125, 0.11, 0.41, [0.17, 0.25, 0.33]);
      hanVest(r, C.copper, C.copperDark);
      const chest = r.on('chest').plain;
      chest.cyl(0.052, 0.052, 0.016, C.gold, 0, 0.5, 0.15, [Math.PI / 2, 0, 0], 10);
      chest.sphere(0.02, C.goldDark, 0, 0.5, 0.16, [1, 1, 0.6], 6);
      // Giáp vai đồng hai lớp viền vàng.
      for (const sx of [-1, 1]) {
        chest.sphere(0.092, C.copper, sx * 0.19, 0.57, 0, [1.2, 0.7, 1.1], 8);
        chest.box(0.14, 0.022, 0.16, C.gold, sx * 0.205, 0.53, 0, [0, 0, -sx * 0.38]);
        chest.sphere(0.078, C.copperDark, sx * 0.22, 0.5, 0, [1.05, 0.6, 1], 8);
      }
      // Áo choàng đỏ son viền vàng, buông qua lưng ngựa.
      chest.box(0.5, 0.58, 0.035, C.hanRed, 0, 0.36, -0.2, [0.2, 0, 0]);
      chest.box(0.52, 0.045, 0.04, C.gold, 0, 0.08, -0.255, [0.2, 0, 0]);
      for (const sx of [-1, 1]) chest.sphere(0.03, C.gold, sx * 0.16, 0.6, -0.12, [1, 1, 1], 6);
      // Mặt lão tướng: mày bạc rậm xếch, ria bạc, râu bạc dài chẻ hai chòm; tóc mai bạc lòi dưới mũ.
      humanHead(r, { blush: false, mustache: C.beard });
      const head = r.on('head').plain;
      for (const s of [-1, 1]) {
        head.box(0.085, 0.026, 0.022, C.beard, s * 0.078, 0.805, 0.178, [0, 0, -s * 0.34]);
        head.cone(0.055, 0.3, C.beard, s * 0.035, 0.55, 0.14, [Math.PI + 0.3, 0, s * 0.12], 6);
        head.sphere(0.06, C.beard, s * 0.17, 0.72, -0.06, [0.6, 1.1, 1], 6);
      }
      head.cone(0.07, 0.2, C.beard, 0, 0.6, 0.15, [Math.PI + 0.25, 0, 0], 6);
      // Mũ trụ đồng đỏ: chỏm tròn, vành vàng, che gáy, che má, chóp vàng cắm chùm lông đỏ cao.
      head.sphere(0.242, C.copper, 0, 0.848, -0.025, [1, 0.66, 1], 10);
      head.cyl(0.246, 0.246, 0.032, C.gold, 0, 0.83, -0.025, undefined, 12);
      head.box(0.37, 0.14, 0.05, C.copper, 0, 0.74, -0.2, [0.35, 0, 0]);
      head.box(0.38, 0.025, 0.055, C.gold, 0, 0.68, -0.22, [0.35, 0, 0]);
      for (const sx of [-1, 1]) head.box(0.03, 0.15, 0.1, C.copperDark, sx * 0.218, 0.73, -0.02);
      head.box(0.07, 0.07, 0.03, C.gold, 0, 0.9, 0.205, [0, 0, Math.PI / 4]);
      head.cyl(0.026, 0.036, 0.1, C.gold, 0, 1.03, -0.03, undefined, 6);
      head.cone(0.07, 0.34, C.hanRed, 0, 1.22, -0.08, [-0.3, 0, 0], 7);
      for (const sx of [-1, 1]) head.cone(0.045, 0.26, C.hanRed, sx * 0.06, 1.16, -0.1, [-0.45, 0, -sx * 0.4], 6);
      r.local('hand', GRIP_R, null, daiDao);
      r.local('handL', GRIP_L, null, coLenhCan);
      (r as unknown as RigBuilder<string>).local('coLenh', MA_VIEN_FLAG, null, coLenhLa);
    },
    after: poseMaVien,
  },
};

/** Xương thêm của người cưỡi ngoài thân người (beasts.ts dời lên lưng thú cùng thân người). */
export function riderBones(kind: RiderKind): Record<string, BoneDef<string>> {
  return RIDERS[kind].bones ?? {};
}

/** Người cưỡi có kỹ năng riêng (`Act.skill`): thú dưới chân chồm theo. */
export const riderHasSkill = (kind: RiderKind): boolean => kind === 'maVien';

/** Vẽ người cưỡi (đứng ở gốc như lính thường; beasts.ts dời lên lưng thú bằng `place`). */
export function drawRider(r: HumanRig, kind: RiderKind): void {
  RIDERS[kind].draw(r, 0);
}

/**
 * Đặt tư thế người cưỡi: tay và vũ khí như lính đi bộ, chân ngồi dạng trên lưng thú (`ride`) hay đứng vững
 * trên sàn xe (`stand`). Thú đi thì người cưỡi chỉ nhún theo lưng thú, không bước.
 */
export function poseRider(kind: RiderKind, b: Human, a: Act, seat: 'ride' | 'stand'): void {
  const spec = RIDERS[kind];
  beginPose(b, a.time);
  const moves = MOVES[spec.style];
  if (a.act === 'walk') moves.carry(b, 0.3 * Math.sin(a.phase ?? 0), spec);
  else if (a.act === 'fight') moves.fight(b, a.strike, spec);
  else if (a.act === 'dead') {
    const f = a.fall ?? 1;
    fallPose(b, f);
    moves.drop(b, f);
  } else moves.rest(b, spec);
  b.hips.position.copy(b.hips.userData.rest as THREE.Vector3);
  if (seat === 'ride') {
    b.legL.rotation.set(-0.35, 0, -0.8);
    b.legR.rotation.set(-0.35, 0, 0.8);
  } else {
    b.legL.rotation.set(-0.15, 0, -0.08);
    b.legR.rotation.set(0.15, 0, 0.08);
  }
  gripHands(b);
  spec.after?.(b as unknown as Bones<string>, a);
}

/** Lính có xương, cho trận đánh: `userData.pose(a)` đặt tư thế mỗi khung hình. `tier`: bậc binh khí đã rèn (quân ta). */
export function makeSoldier(kind: SoldierKind, tier = 0): THREE.Group {
  const { group, bones } = skinRig(shapeOf(kind, tier));
  const pose: Poser = (a) => poseSoldier(SPECS[kind], bones as unknown as Human, a);
  pose({ act: 'stand' });
  group.userData.pose = pose;
  return group;
}

/** Lính bản tĩnh ở một tư thế, cho công trình. */
export function bakeSoldier(kind: SoldierKind, tier = 0, a: Act = { act: 'stand' }): THREE.Group {
  return bakeRig(shapeOf(kind, tier), (b) => poseSoldier(SPECS[kind], b as unknown as Human, a));
}
