// Lính đi bộ có khung xương (rig.ts, body.ts): giáo binh, cung thủ của ta; giặc Ân cầm qua, cầm cung, phó tướng
// cầm rìu; quân Triệu cầm kiếm, cầm nỏ; lính nỏ của ta (quỳ một gối khi bắn); thủy binh Triệu (lính thủy, cung
// thuyền, lính rìu giáp mây). Mỗi lính một dáng, mỗi loại vũ khí một bộ động tác.

import type * as THREE from 'three';
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
import { RigBuilder, bakeRig, skinRig, type Act, type Poser } from './rig';
import { LEATHER, arrow, bigAxe, bow, crossbowParts, drumShield, qua, quiver, spear, sword } from './weapons';

/** Lính đông trong trận (tới vài chục): bớt số mặt cho nhẹ máy (xem `ShapeBuilder.detail`). */
const DETAIL = 0.7;

export type SoldierKind = 'giao' | 'cung' | 'no' | 'giaoAn' | 'cungAn' | 'phoTuong' | 'linhTrieu' | 'noTrieu' | 'linhThuy' | 'cungThuyen' | 'linhRiu';
const KINDS: readonly FighterKind[] = ['giao', 'cung', 'no', 'giaoAn', 'cungAn', 'phoTuong', 'linhTrieu', 'noTrieu', 'linhThuy', 'cungThuyen', 'linhRiu'];

/** Giáp mây đan của lính rìu Triệu. */
const RATTAN = 0xc9a45a;
const RATTAN_DARK = 0x9a7a3a;
/** Bắn thì quỳ một gối: hông hạ chừng này. */
const KNEEL_DROP = 0.17;
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
  featherCrown(r, [C.red, C.cream], {
    count: tier >= 2 ? 9 : 7,
    len: tier >= 2 ? 0.42 : 0.36,
    bronzeRim: true,
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
  draw: (r: HumanRig, tier: number) => void;
}

const SPECS: Record<SoldierKind, Spec> = {
  giao: {
    style: 'spear',
    shield: true,
    draw: (r, tier) => {
      lacViet(r, true, tier);
      r.local('hand', GRIP_R, null, (s) => spear(s, tier));
      // Khiên tròn mặt trống đồng ở cẳng tay trái; bậc 2 viền sắt và tua đỏ.
      r.local('armL', [-0.2, 0.39, 0.06], null, (s) => drumShield(s, tier >= 2));
    },
  },
  cung: {
    style: 'bow',
    draw: (r, tier) => {
      lacViet(r, false, tier);
      if (tier >= 1) {
        // Giáp ngực da thuộc nẹp đinh đồng
        r.on('chest').plain.box(0.25, 0.22, 0.02, LEATHER, 0, 0.49, 0.11);
        r.on('chest').plain.sphere(0.018, C.bronzeLight, 0, 0.49, 0.122);
      }
      // Bậc 1 mũi tên sắt, bao tên da; bậc 2 cung sừng, bao tên đồng.
      r.local('handL', GRIP_L, null, (s) => bow(s, tier >= 2));
      r.local('hand', GRIP_R, null, (s) => arrow(s, tier >= 1));
      backQuiver(r, tier >= 2 ? C.bronze : tier >= 1 ? LEATHER : C.woodLight, tier >= 1);
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
      // 3 chóp lông vũ biểu tượng chim thần
      for (let i = -1; i <= 1; i++) {
        head.box(0.05, 0.3, 0.025, i ? C.cream : C.red, i * 0.065, 1.04, -0.06, [0, 0, -i * 0.28]);
      }
      r.local('hand', GRIP_R, null, (s) => {
        crossbowParts(s, false, 0.95);
        if (tier >= 2) for (const sx of [-1, 1]) s.plain.box(0.2, 0.035, 0.035, 0xe6d6a8, sx * 0.2, 0, 0.32, [0, sx * 0.25, 0]);
      });
      backQuiver(r, tier >= 2 ? C.bronze : LEATHER, tier >= 1);
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
}

function shapeOf(kind: SoldierKind, tier: number) {
  const r = new RigBuilder(HUMAN, DETAIL);
  SPECS[kind].draw(r, tier);
  return r.build();
}

// ---------- Người cưỡi ----------

/** Người cưỡi voi, cưỡi ngựa hay đứng trên chiến xa. Khung xương người dời lên lưng thú (beasts.ts). */
export type RiderKind = 'lacTuong' | 'anXa' | 'daiTuong' | 'kyBinh' | 'trieuDa';

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
};

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
}

/** Lính có xương, cho trận đánh: `userData.pose(a)` đặt tư thế mỗi khung hình. `tier`: bậc binh khí đã rèn (quân ta). */
export function makeSoldier(kind: SoldierKind, tier = 0): THREE.Group {
  const { group, bones } = skinRig(shapeOf(kind, tier));
  const pose: Poser = (a) => poseSoldier(SPECS[kind], bones, a);
  pose({ act: 'stand' });
  group.userData.pose = pose;
  return group;
}

/** Lính bản tĩnh ở một tư thế, cho công trình. */
export function bakeSoldier(kind: SoldierKind, tier = 0, a: Act = { act: 'stand' }): THREE.Group {
  return bakeRig(shapeOf(kind, tier), (b) => poseSoldier(SPECS[kind], b, a));
}
