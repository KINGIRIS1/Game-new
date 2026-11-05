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
import { armor, bun, chestDisc, cloak, hat, helmet, khan, pauldrons, plumes, sash, skirtArmor, streamer, studs } from './nanDo';
import { C } from './palette';
import { RigBuilder, bakeRig, skinRig, type Act, type BoneDef, type Bones, type Poser, type RigShape } from './rig';
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

/** Giặc Ân: khố sẫm, áo đỏ sẫm, giáp vai đồng, mày xếch, mũ trụ đồng chóp nhọn có tua đỏ dựng cao. */
function anSoldier(r: HumanRig): void {
  humanBody(r, { cloth: C.enemyCloth, top: C.enemyRed, belt: C.bronzeDark, armband: C.bronzeDark });
  humanHead(r, { brows: true });
  pauldrons(r, { color: C.bronzeDark, trim: C.bronzeLight });
  helmet(r, { color: C.bronze, band: C.bronzeDark, bandH: 0.03, top: { kind: 'spike', color: C.bronzeDark, h: 0.13 }, tuft: { color: C.red, len: 0.15, lean: 0.12, r: 0.026 } });
}

/** Quân Triệu: quần đen, áo dài đen hoa văn, áo trong đỏ, mũ vải đen búi tóc có trâm cài, dải buộc đỏ. */
function trieuSoldier(r: HumanRig): void {
  humanBody(r, { legs: C.trieuCloth, cloth: C.trieuCloth, long: true, top: C.trieuRed, sleeves: C.trieuCloth, belt: C.trieuRed, collar: C.trieuCloth });
  humanHead(r, { brows: true, hairPin: C.bronze });
  helmet(r, { color: C.trieuCloth, cloth: true, lift: 0, puff: 0.014 });
  bun(r, { color: C.trieuCloth, at: [0, 0.99, -0.05], size: 0.07, tie: C.trieuRed });
  streamer(r, { from: [0.05, 0.8, -0.2], dir: [0.35, -1, -0.45], len: 0.16, width: 0.035, color: C.trieuRed });
}

/** Quân Hán: quần đỏ sẫm, áo dài đỏ son quá gối, giáp (`vest`: lá sắt hay da) che ngực, khăn đen viền đỏ, vạt khăn dựng sau gáy. */
function hanSoldier(r: HumanRig, vest: number, dark: number): void {
  humanBody(r, { legs: C.hanRedDark, cloth: C.hanRed, pattern: false, long: true, top: C.hanRed, sleeves: C.hanRed, belt: dark, hem: C.hanRedDark });
  armor(r, { color: vest, trim: dark, rows: 3, y0: 0.4, y1: 0.585 });
  humanHead(r, { brows: true });
  helmet(r, { color: HAN_BLACK, cloth: true, lift: 0, puff: 0.014, band: C.hanRed, bandH: 0.026 });
  streamer(r, { from: [0, 0.9, -0.17], dir: [0, 1, -0.5], len: 0.12, width: 0.15, color: HAN_BLACK });
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
        armor(r, { color: tier >= 3 ? C.bronze : LEATHER, trim: tier >= 3 ? C.gold : C.woodDark, y0: 0.43, y1: 0.575, thick: 0.014 });
        if (tier >= 3) chestDisc(r, { color: C.gold, r: 0.03, y: 0.5, thick: 0.014, boss: C.goldDark });
        else studs(r, { color: C.bronzeLight, thick: 0.014, at: [[0, 0.5], [-0.05, 0.535], [0.05, 0.535], [-0.06, 0.465], [0.06, 0.465]] });
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
      // Mũ đồng che thái dương; 3 chóp lông vũ biểu tượng chim thần; bậc 3 năm chóp, hai chóp ngoài lông vàng, vành mũ
      // đồng vàng hoa văn.
      helmet(r, { color: C.bronze, band: tier >= 3 ? C.gold : C.bronzeDark, bandH: 0.034, bandPattern: tier >= 3, cheek: 0.05, guard: C.bronze });
      plumes(r, [C.red, C.cream, C.gold], { count: tier >= 3 ? 5 : 3, len: 0.3, spread: 0.3, y: 0.97, z: -0.05, tilt: -0.12, width: 0.065 });
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
      armor(r, { color: C.enemyRed, trim: C.bronze, pattern: true, y0: 0.4, y1: 0.585 });
      cloak(r, { color: C.enemyRed, trim: C.bronzeDark, clasp: C.bronzeLight, hem: 0.12 });
      // Giáp vai lớn có gai nhọn uy hiếp.
      pauldrons(r, { color: C.bronzeDark, trim: C.bronzeLight, layers: 2, size: 1.1, spike: C.bronzeLight });
      humanHead(r, { brows: true, beard: C.hair, beardLen: 0.12 });
      // Mũ trụ đồng, bờm lông đỏ dài ngả về sau.
      helmet(r, { color: C.bronze, band: C.bronzeDark, neck: 0.07, guard: C.bronze, guardTrim: C.bronzeDark, top: { kind: 'tube', color: C.bronzeDark, h: 0.05 }, tuft: { color: C.red, len: 0.38, lean: 0.55, r: 0.042 } });
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
      streamer(r, { from: [0.06, 0.8, -0.2], dir: [0.35, -1, -0.5], len: 0.15, width: 0.032, color: C.trieuRed });
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
      hat(r, { kind: 'wide', color: C.trieuCloth, trim: C.trieuRed, y: 0.9, r: 0.31, h: 0.15 });
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
      armor(r, { color: RATTAN, trim: RATTAN_DARK, rows: 3, thick: 0.022, y0: 0.39, y1: 0.59 });
      pauldrons(r, { color: RATTAN, trim: RATTAN_DARK, layers: 2, size: 1.15 });
      humanHead(r, { brows: true });
      helmet(r, { color: RATTAN, band: RATTAN_DARK, bandH: 0.03, ridge: RATTAN_DARK, puff: 0.022 });
      r.local('hand', GRIP_R, null, bigAxe);
    },
  },
  tuongThuy: {
    style: 'chop',
    heavy: true,
    draw: (r) => {
      // Tướng thủy binh Triệu (trùm cửa sông): giáp đen viền vàng to bản, giáp vai hai tầng, đai đỏ chéo ngực,
      // áo choàng đỏ viền vàng, mũ trụ đen chùm lông chim đen, râu đen, đao dài.
      humanBody(r, {
        legs: C.trieuCloth,
        cloth: ARMOR_BLACK,
        long: true,
        top: ARMOR_BLACK,
        sleeves: C.trieuCloth,
        belt: C.gold,
        armband: C.gold,
        greaves: ARMOR_BLACK,
        bracer: ARMOR_BLACK,
        bracerTrim: C.gold,
        hem: C.gold,
      });
      // Vạt giáp đùi hai bên và vạt trước, viền vàng.
      skirtArmor(r, { color: ARMOR_BLACK, trim: C.gold, rows: 2, to: 0.2, panels: [0, Math.PI, Math.PI / 2], half: 0.42 });
      // Giáp ngực đen nhiều lớp vảy viền vàng, đai đỏ chéo trước ngực.
      armor(r, { color: ARMOR_BLACK, trim: C.gold, rows: 3, scales: true, thick: 0.022, y0: 0.39, y1: 0.6 });
      sash(r, { color: C.trieuRed, side: 1, width: 0.06, thick: 0.04 });
      // Giáp vai hai tầng đen viền vàng; áo choàng đỏ viền vàng.
      pauldrons(r, { color: ARMOR_BLACK, trim: C.gold, layers: 2, size: 1.2 });
      cloak(r, { color: C.trieuRed, trim: C.gold, clasp: C.gold, hem: 0.1 });
      // Mặt dữ, ria và râu đen; mũ trụ đen vành vàng, che gáy, tấm vàng trước trán, chùm lông chim đen.
      humanHead(r, { brows: true, mustache: C.hair, beard: C.hair, beardLen: 0.1 });
      helmet(r, { color: ARMOR_BLACK, band: C.gold, neck: 0.1, guard: ARMOR_BLACK, guardTrim: C.gold, brow: C.gold, top: { kind: 'knob', color: C.gold } });
      plumes(r, [FEATHER_BLACK, ARMOR_BLACK], { count: 7, len: 0.46, y: 0.98, z: -0.08 });
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
      skirtArmor(r, { color: C.hanIron, trim: C.hanIronDark, rows: 3, to: 0.12 });
      armor(r, { color: C.hanIron, trim: C.hanIronDark, rows: 3, y0: 0.4, y1: 0.59 });
      pauldrons(r, { color: C.hanIron, trim: C.hanIronDark, layers: 2 });
      humanHead(r, { brows: true });
      helmet(r, {
        color: C.hanIron,
        band: C.hanIronDark,
        neck: 0.1,
        cheek: 0.09,
        guard: C.hanIron,
        guardTrim: C.hanIronDark,
        top: { kind: 'tube', color: C.hanIronDark, h: 0.05 },
        tuft: { color: C.hanRed, len: 0.13, lean: 0.1, r: 0.03 },
      });
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
      humanBody(r, { cloth: C.aoNau, pattern: false, top: C.aoNau, sleeves: C.aoNau, belt: C.khanNau, collar: C.khanNau });
      humanHead(r);
      // Khăn trùm kín đỉnh đầu, quấn hai lớp sát trán, mối buộc sau gáy.
      khan(r, { color: C.khanNau, roll: C.aoNau, rolls: 2, knot: true, tails: 0.12 });
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
      // Quan phục đen dài tới chân, gấu và cổ giao lĩnh viền đỏ, tay áo rộng viền đỏ, đai đỏ thắt dưới bụng phệ.
      humanBody(r, {
        build: 'belly',
        legs: C.quanPhuc,
        cloth: C.quanPhuc,
        pattern: false,
        long: true,
        top: C.quanPhuc,
        sleeves: C.quanPhuc,
        wideSleeves: true,
        belt: C.hanRedDark,
        hem: C.hanRed,
        collar: C.hanRed,
        cuff: C.hanRed,
      });
      // Mặt quan: mày rậm, ria mép, râu dê.
      humanHead(r, { brows: true, mustache: C.hair, beard: C.hair, beardLen: 0.09 });
      hairCap(r);
      // Mũ quan cao (xương riêng, rơi khi bỏ chạy): mũ đen, tấm dựng ngả ra sau, ống ngang, trâm vàng, dây đỏ quai mũ.
      helmet(r, { color: C.quanPhuc, cloth: false, lift: 0.04, puff: 0.016, band: C.quanPhuc, bandH: 0.05, bone: 'hat' });
      streamer(r, { from: [0, 0.93, -0.13], dir: [0, 1, -0.32], len: 0.2, width: 0.16, color: C.quanPhuc, bone: 'hat' });
      for (const s of [-1, 1]) streamer(r, { from: [s * 0.2, 0.8, 0.02], dir: [s * 0.1, -1, 0.15], len: 0.12, width: 0.014, color: C.hanRed, bone: 'hat' });
      const rig = r as unknown as RigBuilder<string>;
      const hatBone = rig.on('hat').plain;
      hatBone.cyl(0.05, 0.05, 0.16, C.quanPhuc, 0, 1.12, -0.11, [0, 0, Math.PI / 2], 10);
      hatBone.cyl(0.011, 0.011, 0.36, C.gold, 0, 0.99, -0.07, [0, 0, Math.PI / 2], 6);
      for (const s of [-1, 1]) hatBone.sphere(0.024, C.gold, s * 0.18, 0.99, -0.07, [1, 1, 1], 8);
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

/**
 * Hình của mỗi loại lính, mỗi bậc dựng một lần rồi dùng chung cho mọi lính cùng loại (trận có vài chục lính). Lính
 * bị gỡ thì hình trả khỏi GPU, lần vẽ sau three.js tự nạp lại.
 */
const shapes = new Map<string, RigShape<string>>();
function shapeOf(kind: SoldierKind, tier: number): RigShape<string> {
  const key = `${kind}:${tier}`;
  let shape = shapes.get(key);
  if (!shape) {
    const spec = SPECS[kind];
    const r = new RigBuilder<string>({ ...HUMAN, ...spec.bones }, DETAIL);
    spec.draw(r as unknown as HumanRig, tier);
    shape = r.build();
    shapes.set(key, shape);
  }
  return shape;
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
      humanBody(r, { cloth: C.enemyCloth, top: C.bronzeDark, belt: C.bronzeLight, greaves: C.bronzeDark });
      armor(r, { color: C.bronzeDark, trim: C.bronzeLight, pattern: true, y0: 0.4, y1: 0.59 });
      cloak(r, { color: C.enemyRed, trim: C.bronzeDark, clasp: C.bronzeLight, hem: 0.14 });
      pauldrons(r, { color: C.bronzeDark, trim: C.bronzeLight, layers: 2, size: 1.1, spike: C.bronzeLight });
      humanHead(r, { brows: true });
      helmet(r, { color: C.bronzeLight, band: C.bronzeDark, neck: 0.06, guard: C.bronzeLight, guardTrim: C.bronzeDark, top: { kind: 'tube', color: C.bronzeDark, h: 0.06 }, tuft: { color: C.ember, len: 0.5, lean: 0.3, r: 0.045 } });
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
      humanBody(r, { legs: C.trieuCloth, cloth: C.ink, long: true, top: C.gold, sleeves: C.trieuCloth, belt: C.gold, hem: C.gold, collar: C.trieuRed });
      armor(r, { color: C.gold, trim: C.goldDark, rows: 3, scales: true, y0: 0.4, y1: 0.59 });
      cloak(r, { color: C.trieuRed, trim: C.gold, clasp: C.gold, hem: 0.12 });
      pauldrons(r, { color: C.ink, trim: C.gold, size: 1.1 });
      // Mặt già: mày bạc, râu bạc dài.
      humanHead(r, { brows: true, browColor: C.beard, beard: C.beard, beardLen: 0.26, mustache: C.beard });
      // Mũ đen cao hai cánh chuồn viền vàng.
      helmet(r, { color: C.ink, lift: 0.1, puff: 0.02, band: C.gold, bandH: 0.04 });
      for (const s of [-1, 1]) streamer(r, { from: [s * 0.16, 0.98, -0.13], dir: [s, 0.12, -0.05], len: 0.3, width: 0.12, color: C.ink });
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
      // Vạt giáp lá đồng phủ tới gối, giáp ngực ba hàng lá, hộ tâm đồng vàng.
      skirtArmor(r, { color: C.copper, trim: C.copperDark, rows: 3, to: 0.12 });
      armor(r, { color: C.copper, trim: C.copperDark, rows: 3, y0: 0.4, y1: 0.59 });
      chestDisc(r, { color: C.gold, r: 0.05, y: 0.5, thick: 0.024, rim: C.goldDark, boss: C.goldDark });
      // Giáp vai đồng hai lớp viền vàng; áo choàng đỏ son viền vàng, buông qua lưng ngựa.
      pauldrons(r, { color: C.copper, trim: C.gold, layers: 2, size: 1.1 });
      cloak(r, { color: C.hanRed, trim: C.gold, clasp: C.gold, hem: 0.08 });
      // Mặt lão tướng: mày bạc rậm xếch, ria bạc, râu bạc dài chẻ hai chòm.
      humanHead(r, { blush: false, brows: true, browColor: C.beard, mustache: C.beard, beard: C.beard, beardLen: 0.3, beardSplit: true });
      // Mũ trụ đồng đỏ: vành vàng, che gáy, che má, tấm vàng trước trán, ống vàng cắm chùm lông đỏ cao.
      helmet(r, {
        color: C.copper,
        band: C.gold,
        neck: 0.1,
        cheek: 0.1,
        guard: C.copper,
        guardTrim: C.gold,
        brow: C.gold,
        top: { kind: 'tube', color: C.gold, h: 0.1 },
        tuft: { color: C.hanRed, len: 0.34, lean: 0.3, r: 0.042 },
      });
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
