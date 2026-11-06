// Cá voi, cá heo có xương (thân nặn ở nanThu.ts), lâu lâu nổi lên ngoài biển Đông (`SeaLife` ở bien.ts). Tách riêng
// để worker nặn sẵn (nanSan.ts) nạp được mà không kéo theo cả cảnh biển.

import type * as THREE from 'three';
import { dolphinBody, whaleBody } from './nanThu';
import { RigBuilder, resetBones, skinRig, type Act, type BoneDef, type Bones, type Poser } from './rig';

type B = Bones<string>;
type Defs = Record<string, BoneDef<string>>;

const WHALE: Defs = {
  base: { parent: null, at: [0, 0, 0] },
  tail1: { parent: 'base', at: [0, 0.05, -0.95] },
  tail2: { parent: 'tail1', at: [0, 0.05, -1.55] },
  fluke: { parent: 'tail2', at: [0, 0.05, -2.0] },
  finL: { parent: 'base', at: [-0.48, -0.12, 0.4] },
  finR: { parent: 'base', at: [0.48, -0.12, 0.4] },
};

/** Cá voi nặn liền (nanThu.ts): mình to thuôn xanh xám, bụng trắng có rãnh, lỗ phun nước, vây ngực dài, đuôi xòe hai thùy. */
function drawWhale(r: RigBuilder<string>): void {
  whaleBody(r);
}

/**
 * Cá voi bơi: đuôi đập lên xuống thành sóng chạy về sau, vây ngực chèo chậm. Lặn (`act: 'fight'`, `strike` 0..1):
 * khúc đuôi cong vồng lên dần, vây đuôi dựng đứng khỏi mặt nước như khi cá voi chúi xuống sâu.
 */
function poseWhale(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  const w = 1.6;
  const curl = a.act === 'fight' ? (a.strike ?? 0) : 0;
  const swim = 1 - curl;
  b.tail1.rotation.x = 0.12 * swim * Math.sin(t * w) + 0.22 * curl;
  b.tail2.rotation.x = 0.22 * swim * Math.sin(t * w - 0.7) + 0.32 * curl;
  b.fluke.rotation.x = 0.3 * swim * Math.sin(t * w - 1.4) + 0.38 * curl;
  b.finL.rotation.z = 0.15 * Math.sin(t * w * 0.5);
  b.finR.rotation.z = -0.15 * Math.sin(t * w * 0.5);
}

const DOLPHIN: Defs = {
  base: { parent: null, at: [0, 0, 0] },
  tail: { parent: 'base', at: [0, 0.02, -0.32] },
  fluke: { parent: 'tail', at: [0, 0.02, -0.62] },
  finL: { parent: 'base', at: [-0.14, -0.06, 0.18] },
  finR: { parent: 'base', at: [0.14, -0.06, 0.18] },
};

/** Cá heo nặn liền (nanThu.ts): mình thon xám xanh, bụng trắng, mõm dài, vây lưng cong, mắt hiền. */
function drawDolphin(r: RigBuilder<string>): void {
  dolphinBody(r);
}

/** Cá heo bơi: đuôi quẫy nhanh; khi nhảy (`act: 'walk'`) đuôi quẫy mạnh hơn. */
function poseDolphin(b: B, a: Act): void {
  resetBones(b);
  const t = a.time ?? 0;
  const k = a.act === 'walk' ? 0.45 : 0.25;
  b.tail.rotation.x = k * Math.sin(t * 8);
  b.fluke.rotation.x = (k + 0.15) * Math.sin(t * 8 - 0.8);
  b.finL.rotation.z = 0.2;
  b.finR.rotation.z = -0.2;
}

function makeCreature(defs: Defs, draw: (r: RigBuilder<string>) => void, pose: (b: B, a: Act) => void): THREE.Group {
  const r = new RigBuilder(defs, 0.8);
  draw(r);
  const { group, bones } = skinRig(r.build());
  const poser: Poser = (a) => pose(bones, a);
  poser({ act: 'stand' });
  group.userData.pose = poser;
  return group;
}

/** Cá voi có xương, mặt trước hướng +z, dài chừng 3,2 ô (chưa phóng). */
export function makeWhale(): THREE.Group {
  return makeCreature(WHALE, drawWhale, poseWhale);
}

/** Cá heo có xương, mặt trước hướng +z, dài chừng 1,1 ô. */
export function makeDolphin(): THREE.Group {
  return makeCreature(DOLPHIN, drawDolphin, poseDolphin);
}
