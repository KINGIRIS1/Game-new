// Vẽ lính hai bên của một trận vào một nhóm cho sẵn: dùng cho trận giữ kinh đô (trong cảnh kinh đô)
// và trận ngoài bãi (trong cảnh bãi chiến). Tọa độ trận cộng `offset` thành tọa độ trong nhóm.

import * as THREE from 'three';
import type { Battle, FighterKind } from '../game/battle';
import { FIRE, SKILLS } from '../game/defs';
import { WEAPON_REST, makeFighter, makeGiong } from './models';
import { C } from './palette';
import { seeded } from './shapes';
import { inkThin, outlineOf } from './toon';

interface FighterView {
  obj: THREE.Group;
  deadAge: number;
  /** Gióng bay về trời: đã bay được bao lâu. */
  rise: number;
  /** Tay cầm roi (hay tre) của Gióng, để làm động tác quật. */
  weapon?: THREE.Object3D;
  /** Gióng đang quét tre một vòng (Nhổ tre): còn bao lâu. */
  smash: number;
  /** Gióng đang phi ngựa dọc đường lao (Phun lửa), tọa độ trận. */
  dash?: { fromX: number; fromZ: number; toX: number; toZ: number; age: number };
}

/** Luồng lửa phun từ mõm ngựa sắt, gắn vào Gióng nên đi theo khi phi. */
interface Jet {
  group: THREE.Group;
  tongues: THREE.Object3D[];
  age: number;
}

/** Vệt đất cháy sém có than hồng, nằm đúng dải bị đốt. Mỗi thứ vẽ một lần (InstancedMesh). */
interface Scorch {
  group: THREE.Group;
  /** Chất liệu riêng của vệt cháy, để làm mờ dần. */
  mat: THREE.MeshBasicMaterial;
  blobs: THREE.InstancedMesh;
  embers: THREE.InstancedMesh;
  /** Chỗ từng hòn than trong dải và nhịp lập lòe riêng. */
  spots: { x: number; z: number; phase: number }[];
  age: number;
}

/** Ngọn lửa nhỏ cháy trên người tên giặc trúng lửa. */
interface Burn {
  group: THREE.Group;
  age: number;
}

/** Một đốm hiệu ứng ngắn: lửa, bụi, khói. Lớn dần rồi mờ đi. */
interface Puff {
  mesh: THREE.Mesh;
  age: number;
  delay: number;
  life: number;
  grow: number;
}

interface Arrow {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  age: number;
  dur: number;
}

/** Vòng sóng lan ra quanh Gióng khi Nhổ tre. */
interface Ring {
  mesh: THREE.Mesh;
  age: number;
}

const SCALE: Partial<Record<FighterKind, number>> = { voi: 0.75, chienXa: 0.75, phoTuong: 1, daiTuong: 0.85, giong: 1.1 };
const puffGeo = new THREE.SphereGeometry(0.3, 10, 8);
const arrowGeo = new THREE.BoxGeometry(0.03, 0.03, 0.45);
const arrowMat = new THREE.MeshBasicMaterial({ color: C.arrow });
const ringGeo = new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2);
const RING_LIFE = 1.1;
/** Trống trận: mỗi tiếng trống cách nhau chừng này giây, đánh suốt lúc quân ta được thúc. */
export const RALLY_BEAT = 0.5;

/** Đang có Trống trận thì trả về tiếng trống thứ mấy và đã vang được bao lâu (giây). Trận đã ngã ngũ thì thôi trống. */
export function rallyBeat(battle: Battle | null): { index: number; age: number } | null {
  if (!battle || battle.rally <= 0 || battle.outcome) return null;
  const t = SKILLS.trongTran.duration - battle.rally;
  const index = Math.floor(t / RALLY_BEAT);
  return { index, age: t - index * RALLY_BEAT };
}

/** Sóng mặt trống đồng: mỗi tiếng trống lan ra một vòng mang hoa văn mặt trống, lớn dần rồi mờ đi. */
const RIPPLE_LIFE = 1.1;
const rippleGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
const rippleTex = (() => {
  // Nền trong suốt, nét đồng: sao giữa, vòng tròn tiếp tuyến, răng cưa, như mặt trống Đông Sơn.
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.translate(128, 128);
  g.strokeStyle = g.fillStyle = '#f2cf7a';
  g.lineWidth = 5;
  g.beginPath();
  for (let i = 0; i < 24; i++) {
    const r = i % 2 ? 14 : 34;
    const a = (i / 24) * Math.PI * 2;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.fill();
  for (const r of [46, 96, 122]) {
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.beginPath();
    g.arc(Math.cos(a) * 71, Math.sin(a) * 71, 11, 0, Math.PI * 2);
    g.stroke();
  }
  g.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = i % 2 ? 106 : 116;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
})();

/** Vòng đồng dưới chân lính ta khi được trống thúc: một lần vẽ cho cả đạo quân. */
const RALLY_RINGS = 120;
const rallyRingGeo = new THREE.RingGeometry(0.3, 0.42, 24).rotateX(-Math.PI / 2);
const rallyRingMat = new THREE.MeshBasicMaterial({ color: C.bronzeLight, transparent: true, opacity: 0.8, depthWrite: false });

/** Phun lửa: ngựa sắt phi hết đường lao trong chừng này giây; lửa phun suốt lúc phi rồi tắt dần. */
const DASH_TIME = 0.4;
const JET_LIFE = 0.75;
const SCORCH_LIFE = 4;
const BURN_LIFE = 2;

// Lửa và than hồng không nhận ánh sáng nên luôn rực, kể cả khi nằm trong bóng.
const flameMats = [C.fire, C.ember, 0xfff0a0].map((color) => new THREE.MeshBasicMaterial({ color }));

/**
 * Một lưỡi lửa hình giọt: nhọn ở gốc, phình to nhất ở khoảng một phần ba, vuốt nhọn ở ngọn.
 * Gốc ở tâm, ngọn chĩa theo +z (hoặc +y nếu `up`).
 */
function tongueGeometry(r: number, len: number, up = false): THREE.BufferGeometry {
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    profile.push(new THREE.Vector2(r * Math.sin(Math.PI * t ** 0.65), t * len));
  }
  const geo = new THREE.LatheGeometry(profile, 7);
  return up ? geo : geo.rotateX(Math.PI / 2);
}
/** Các lưỡi lửa của luồng phun: bán kính, độ dài, màu (đỏ cam, vàng cam, vàng nhạt), xòe ngang, chếch lên. */
const jetShapes = [
  [0.36, 4.2, 0, 0, -0.12],
  [0.28, 3.3, 1, 0.24, -0.2],
  [0.28, 3.4, 1, -0.24, -0.2],
  [0.2, 2.4, 2, 0.08, -0.3],
  [0.2, 2.2, 2, -0.1, -0.05],
  [0.22, 2.7, 0, 0.42, -0.1],
  [0.22, 2.6, 0, -0.42, -0.1],
  [0.18, 2, 1, 0, -0.45],
].map(([r, len, color, yaw, pitch]) => {
  const geo = tongueGeometry(r, len);
  return { geo, outline: outlineOf(geo, inkThin).geometry, color, yaw, pitch };
});
/** Lửa cháy trên người giặc: một ngọn trên đầu, hai ngọn trên vai (vị trí trong khung mô hình lính). */
const burnShapes = [
  [0.2, 0.75, 0, 0, 0.82],
  [0.13, 0.5, 0, -0.2, 0.42],
  [0.13, 0.5, 1, 0.2, 0.42],
].map(([r, len, color, x, y]) => {
  const geo = tongueGeometry(r, len, true);
  return { geo, outline: outlineOf(geo, inkThin).geometry, color, x, y };
});
const scorchGeo = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2);
const emberGeo = new THREE.OctahedronGeometry(0.07, 0);
const EMBERS = 16;
const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const noTurn = new THREE.Quaternion();

/** Một lưỡi lửa có viền mực từ hình đã dựng sẵn. */
function tongue(shape: { geo: THREE.BufferGeometry; outline: THREE.BufferGeometry; color: number }): THREE.Mesh {
  const mesh = new THREE.Mesh(shape.geo, flameMats[shape.color]);
  const ink = new THREE.Mesh(shape.outline, inkThin);
  ink.castShadow = false;
  mesh.add(ink);
  return mesh;
}

/** Nhổ tre: thời gian cả động tác, từ lấy đà tới giơ tre lên lại. */
const SMASH_TIME = 0.9;
const { lerp, smoothstep } = THREE.MathUtils;

/**
 * Động tác tay vũ khí của Gióng. Đòn thường: quật từ trên cao xuống trước mặt (theo `swing` của luật trận).
 * Nhổ tre: vung tre ra sau lấy đà, quật mạnh xuống trước mặt, nâng ngang lên quét trọn một vòng quanh mình,
 * rồi giơ lên lại. Vòng quét dài vừa bằng vùng bị đánh trúng.
 */
function swingWeapon(weapon: THREE.Object3D, swing: number, smash: number): void {
  if (smash > 0) {
    const k = 1 - smash / SMASH_TIME;
    let x: number;
    if (k < 0.15) x = lerp(WEAPON_REST.x, -1, smoothstep(k, 0, 0.15));
    else if (k < 0.3) x = lerp(-1, 2.2, smoothstep(k, 0.15, 0.3));
    else if (k < 0.85) x = lerp(2.2, 1.45, smoothstep(k, 0.3, 0.4));
    else x = lerp(1.45, WEAPON_REST.x, smoothstep(k, 0.85, 1));
    weapon.rotation.set(x, Math.PI * 2 * smoothstep(k, 0.35, 0.85), WEAPON_REST.z);
    return;
  }
  const k = swing > 0 ? 1 - swing / 0.3 : 0;
  weapon.rotation.set(WEAPON_REST.x + 2.25 * Math.sin(Math.PI * k), 0, WEAPON_REST.z);
}

export class BattleView {
  private readonly fighters = new Map<number, FighterView>();
  private readonly arrows: Arrow[] = [];
  private readonly rings: Ring[] = [];
  private readonly puffs: Puff[] = [];
  private readonly jets: Jet[] = [];
  private readonly scorches: Scorch[] = [];
  private readonly burns: Burn[] = [];
  private readonly ripples: Ring[] = [];
  private readonly rallyRings = new THREE.InstancedMesh(rallyRingGeo, rallyRingMat, RALLY_RINGS);
  /** Tiếng trống trận đang vang (null khi không có Trống trận) và tiếng đã phát sóng gần nhất. */
  private beat: { index: number; age: number } | null = null;
  private lastBeat = -1;
  /** Chỗ đặt trống đồng của Lạc tướng (tọa độ trận), để sóng trống lan ra từ đó. Bỏ trống thì lan từ giữa đám quân ta. */
  drumAt?: { x: number; z: number };
  private battleId = -1;
  private lastSeq = 0;
  private time = 0;

  /** `scale`: phóng to lính so với cỡ trong kinh đô (bãi chiến nhìn gần hơn cần lính to hơn). */
  constructor(
    private readonly root: THREE.Object3D,
    private readonly offset: { x: number; z: number },
    private readonly scale = 1,
  ) {
    this.rallyRings.visible = false;
    this.rallyRings.renderOrder = 2;
    this.root.add(this.rallyRings);
  }

  /** Gọi mỗi khung hình với trận đang diễn ra, hoặc null khi không có trận. */
  update(battle: Battle | null, dt: number): void {
    this.time += dt;
    if (!battle || battle.id !== this.battleId) {
      this.clear();
      this.battleId = battle ? battle.id : -1;
    }
    this.beat = rallyBeat(battle);
    if (battle) {
      this.syncFighters(battle, dt);
      this.readEvents(battle);
      this.drumRally(battle);
    }
    if (!this.beat) {
      this.lastBeat = -1;
      this.rallyRings.visible = false;
    }
    this.animate(dt);
  }

  private clear(): void {
    // Lưỡi lửa dùng hình dựng sẵn cho mọi trận: gỡ khỏi lính trước khi giải phóng hình của lính.
    for (const fx of [...this.jets, ...this.burns]) fx.group.removeFromParent();
    this.jets.length = 0;
    this.burns.length = 0;
    for (const v of this.fighters.values()) {
      this.root.remove(v.obj);
      v.obj.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    }
    this.fighters.clear();
    for (const a of this.arrows) this.root.remove(a.mesh);
    this.arrows.length = 0;
    for (const r of [...this.rings, ...this.ripples]) {
      this.root.remove(r.mesh);
      (r.mesh.material as THREE.Material).dispose();
    }
    this.rings.length = 0;
    this.ripples.length = 0;
    for (const p of this.puffs) {
      this.root.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.puffs.length = 0;
    for (const s of this.scorches) this.dropScorch(s);
    this.scorches.length = 0;
    this.lastSeq = 0;
  }

  private syncFighters(battle: Battle, dt: number): void {
    const { x: ox, z: oz } = this.offset;
    for (const f of battle.fighters) {
      let view = this.fighters.get(f.id);
      if (f.state === 'gone') {
        if (view) {
          this.root.remove(view.obj);
          this.fighters.delete(f.id);
        }
        continue;
      }
      if (!view) {
        if (f.state === 'dead') continue;
        const obj = f.kind === 'giong' ? makeGiong('trangSi', { bamboo: battle.hero?.bamboo, glow: battle.hero?.glow }) : makeFighter(f.kind);
        obj.scale.setScalar((SCALE[f.kind] ?? 0.8) * this.scale);
        this.root.add(obj);
        view = { obj, deadAge: 0, rise: 0, weapon: obj.children.find((c) => c.userData.weapon), smash: 0 };
        this.fighters.set(f.id, view);
      }
      const obj = view.obj;
      obj.position.x = f.x + ox;
      obj.position.z = f.z + oz;
      obj.rotation.y = f.face;
      if (f.state === 'dead') {
        view.deadAge += dt;
        obj.rotation.x = -Math.min(view.deadAge * 4, Math.PI / 2);
        obj.position.y = view.deadAge > 1.2 ? -(view.deadAge - 1.2) * 0.6 : 0;
        if (view.deadAge > 2.5) obj.visible = false;
        continue;
      }
      if (f.kind === 'giong') {
        for (const c of obj.children) {
          if (c.userData.flame) c.scale.set(1, 0.7 + 0.5 * Math.abs(Math.sin(this.time * 9)), 1);
          if (c.userData.halo) c.rotation.z = this.time * 0.6;
        }
        if (battle.ascend && battle.outcome === 'win') {
          // Phá xong giặc, Gióng cưỡi ngựa bay lên trời.
          view.rise += dt;
          obj.position.y = view.rise * view.rise * 0.8;
          obj.rotation.y = f.face + view.rise * 0.6;
          obj.rotation.x = -0.35;
          continue;
        }
        view.smash = Math.max(0, view.smash - dt);
        if (view.weapon) swingWeapon(view.weapon, f.swing, view.smash);
        if (view.dash) {
          // Phun lửa: ngựa phi dọc đường lao, chồm về trước, nảy theo nhịp vó.
          const d = view.dash;
          d.age += dt;
          const k = 1 - (1 - Math.min(d.age / DASH_TIME, 1)) ** 2;
          obj.position.x = lerp(d.fromX, d.toX, k) + ox;
          obj.position.z = lerp(d.fromZ, d.toZ, k) + oz;
          if (Math.hypot(d.toX - d.fromX, d.toZ - d.fromZ) > 0.01) obj.rotation.y = Math.atan2(d.toX - d.fromX, d.toZ - d.fromZ);
          obj.position.y = Math.abs(Math.sin(d.age * 26)) * 0.14;
          obj.rotation.x = 0.12;
          if (d.age >= DASH_TIME) view.dash = undefined;
          continue;
        }
      }
      // Gióng ra đòn bằng tay vũ khí, ngựa chỉ chồm nhẹ khi quét tre; người khác ngả cả thân.
      if (f.kind === 'giong') obj.rotation.x = view.smash > 0 ? -0.2 * Math.sin(Math.PI * (1 - view.smash / SMASH_TIME)) : 0;
      else obj.rotation.x = f.swing > 0 ? -0.5 * (f.swing / 0.3) : 0;
      // Đang có Trống trận thì quân ta nhún nhảy hăng hơn.
      const hop = f.side === 'ta' && battle.rally > 0 ? 0.12 : 0.06;
      // Mỗi tiếng trống trận, cả đạo quân ta cùng nhún lên một nhịp.
      const jump = f.side === 'ta' && this.beat ? 0.16 * Math.exp(-this.beat.age * 10) : 0;
      obj.position.y = (f.state === 'move' ? Math.abs(Math.sin(this.time * 10 + f.id)) * hop : 0) + jump;
    }
  }

  private readEvents(battle: Battle): void {
    const { x: ox, z: oz } = this.offset;
    for (const e of battle.events) {
      if (e.seq <= this.lastSeq) continue;
      if (e.kind === 'shot' && e.tx !== undefined && e.tz !== undefined) {
        const mesh = new THREE.Mesh(arrowGeo, arrowMat);
        const from = new THREE.Vector3(e.x + ox, 0.8, e.z + oz);
        const to = new THREE.Vector3(e.tx + ox, 0.5, e.tz + oz);
        mesh.position.copy(from);
        this.root.add(mesh);
        this.arrows.push({ mesh, from, to, age: 0, dur: Math.max(0.15, from.distanceTo(to) / 12) });
      }
      if (e.kind === 'smash') {
        const hero = battle.fighters.find((f) => f.kind === 'giong');
        const view = hero && this.fighters.get(hero.id);
        if (view) view.smash = SMASH_TIME;
      }
      if (e.kind === 'smash') {
        const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: C.bamboo, transparent: true, depthWrite: false }));
        mesh.position.set(e.x + ox, 0.08, e.z + oz);
        mesh.renderOrder = 3;
        this.root.add(mesh);
        this.rings.push({ mesh, age: 0 });
      }
      if (e.kind === 'fire' && e.tx !== undefined && e.tz !== undefined) this.breatheFire(battle, e.seq, e.x, e.z, e.tx, e.tz);
      if (e.kind === 'smash') {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.addPuff(e.x + Math.cos(a) * 1.6 + ox, 0.2, e.z + Math.sin(a) * 1.6 + oz, C.earth, 0.05, 0.7, 1.6);
        }
      }
      if (e.kind === 'exhaust') this.addPuff(e.x + ox, 0.6, e.z + oz, C.smoke, 0, 1.2, 3);
    }
    this.lastSeq = battle.seq;
  }

  /**
   * Phun lửa: Gióng phi từ (x, z) tới (tx, tz), lửa phun từ mõm ngựa suốt lúc phi, để lại vệt đất cháy
   * dài đúng dải bị đốt, và giặc trong dải bốc cháy. Luật trận đã đặt Gióng ở chỗ mới; phần vẽ cho phi tới đó.
   */
  private breatheFire(battle: Battle, seq: number, x: number, z: number, tx: number, tz: number): void {
    const { x: ox, z: oz } = this.offset;
    const hero = battle.fighters.find((f) => f.kind === 'giong');
    const view = hero && this.fighters.get(hero.id);
    const len = Math.hypot(tx - x, tz - z);
    const face = len > 0.01 ? Math.atan2(tx - x, tz - z) : (hero?.face ?? 0);
    const dx = Math.sin(face);
    const dz = Math.cos(face);
    if (view) {
      view.dash = { fromX: x, fromZ: z, toX: tx, toZ: tz, age: 0 };
      view.obj.position.set(x + ox, 0, z + oz);
      view.obj.rotation.y = face;
      const group = new THREE.Group();
      // Mõm ngựa sắt trong khung của mô hình Gióng.
      group.position.set(0, 1.22, 1.02);
      const tongues = jetShapes.map((shape) => {
        const t = tongue(shape);
        t.rotation.set(shape.pitch, shape.yaw, 0);
        group.add(t);
        return t;
      });
      group.scale.setScalar(0.01);
      view.obj.add(group);
      this.jets.push({ group, tongues, age: 0 });
    }

    // Vệt đất cháy sém dọc dải bị đốt, vị trí từng vệt và than lấy theo hạt giống của sự kiện.
    const rand = seeded(seq * 7919 + 13);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2e2216, transparent: true, opacity: 0.6, depthWrite: false });
    const group = new THREE.Group();
    group.position.set(x + ox, 0.05, z + oz);
    group.rotation.y = face;
    const steps = Math.ceil(FIRE.length / 0.55);
    const blobs = new THREE.InstancedMesh(scorchGeo, mat, steps);
    for (let i = 0; i < steps; i++) {
      tmpPos.set((rand() - 0.5) * 0.5, 0, 0.2 + i * 0.55);
      tmpScale.set(FIRE.width * (0.32 + rand() * 0.14), 1, 0.45 + rand() * 0.25);
      blobs.setMatrixAt(i, tmpMatrix.compose(tmpPos, noTurn, tmpScale));
    }
    blobs.renderOrder = 1;
    const spots = Array.from({ length: EMBERS }, () => ({ x: (rand() - 0.5) * FIRE.width * 0.8, z: rand() * FIRE.length, phase: rand() * Math.PI * 2 }));
    const embers = new THREE.InstancedMesh(emberGeo, flameMats[1], EMBERS);
    group.add(blobs, embers);
    this.root.add(group);
    this.scorches.push({ group, mat, blobs, embers, spots, age: 0 });

    // Giặc đứng trong dải lửa (cùng phép đo với luật trận) bốc cháy một lúc.
    for (const f of battle.fighters) {
      if (f.side === 'ta') continue;
      const along = (f.x - x) * dx + (f.z - z) * dz;
      const across = Math.abs((f.x - x) * dz - (f.z - z) * dx);
      const target = this.fighters.get(f.id);
      if (!target || along < -0.3 || along > FIRE.length || across > FIRE.width / 2) continue;
      const fire = new THREE.Group();
      for (const shape of burnShapes) {
        const t = tongue(shape);
        t.position.set(shape.x, shape.y, 0);
        fire.add(t);
      }
      target.obj.add(fire);
      this.burns.push({ group: fire, age: 0 });
    }
  }

  /**
   * Trống trận: mỗi tiếng trống lan ra một sóng mặt trống đồng (từ trống của Lạc tướng, hay từ giữa đám quân ta),
   * và dưới chân mỗi lính ta có vòng đồng nảy lên theo nhịp, tắt đúng lúc hết được thúc.
   */
  private drumRally(battle: Battle): void {
    const beat = this.beat;
    if (!beat) return;
    const { x: ox, z: oz } = this.offset;
    const allies = battle.fighters.filter((f) => f.side === 'ta' && f.state !== 'dead' && f.state !== 'gone');
    if (beat.index !== this.lastBeat) {
      this.lastBeat = beat.index;
      const from = this.drumAt ?? {
        x: allies.reduce((s, f) => s + f.x, 0) / Math.max(allies.length, 1),
        z: allies.reduce((s, f) => s + f.z, 0) / Math.max(allies.length, 1),
      };
      const mesh = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ map: rippleTex, transparent: true, depthWrite: false }));
      mesh.position.set(from.x + ox, 0.07, from.z + oz);
      mesh.renderOrder = 3;
      this.root.add(mesh);
      this.ripples.push({ mesh, age: 0 });
    }
    const pulse = 1 + 0.35 * Math.exp(-beat.age * 8);
    let n = 0;
    for (const f of allies) {
      const view = this.fighters.get(f.id);
      if (!view || n >= RALLY_RINGS) continue;
      tmpPos.set(view.obj.position.x, 0.06, view.obj.position.z);
      this.rallyRings.setMatrixAt(n++, tmpMatrix.compose(tmpPos, noTurn, tmpScale.setScalar(pulse * (f.kind === 'voi' ? 1.6 : 1))));
    }
    this.rallyRings.count = n;
    this.rallyRings.instanceMatrix.needsUpdate = true;
    this.rallyRings.visible = n > 0;
  }

  private dropScorch(s: Scorch): void {
    this.root.remove(s.group);
    s.blobs.dispose();
    s.embers.dispose();
    s.mat.dispose();
  }

  private addPuff(x: number, y: number, z: number, color: number, delay: number, life: number, grow: number): void {
    const mesh = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(0.01);
    this.root.add(mesh);
    this.puffs.push({ mesh, age: 0, delay, life, grow });
  }

  private animate(dt: number): void {
    for (let i = this.jets.length - 1; i >= 0; i--) {
      const j = this.jets[i];
      j.age += dt;
      // Bùng lên rất nhanh, giữ suốt lúc phi, rồi co lại tắt.
      const size = j.age < 0.08 ? j.age / 0.08 : j.age < DASH_TIME ? 1 : 1 - (j.age - DASH_TIME) / (JET_LIFE - DASH_TIME);
      j.group.scale.setScalar(Math.max(size, 0.01));
      j.tongues.forEach((t, k) => {
        const flick = 0.8 + 0.35 * Math.abs(Math.sin(this.time * 22 + k * 1.7));
        t.scale.set(0.9 + 0.2 * Math.sin(this.time * 31 + k), 0.9 + 0.2 * Math.cos(this.time * 27 + k), flick);
      });
      if (j.age >= JET_LIFE) {
        j.group.removeFromParent();
        this.jets.splice(i, 1);
      }
    }
    for (let i = this.burns.length - 1; i >= 0; i--) {
      const b = this.burns[i];
      b.age += dt;
      const fade = Math.min(1, (BURN_LIFE - b.age) / 0.4);
      b.group.children.forEach((t, k) => t.scale.set(fade, fade * (0.7 + 0.5 * Math.abs(Math.sin(this.time * 18 + k * 2))), fade));
      if (b.age >= BURN_LIFE || !b.group.parent) {
        b.group.removeFromParent();
        this.burns.splice(i, 1);
      }
    }
    for (let i = this.scorches.length - 1; i >= 0; i--) {
      const s = this.scorches[i];
      s.age += dt;
      const k = s.age / SCORCH_LIFE;
      s.mat.opacity = 0.6 * Math.min(1, (1 - k) * 2.5);
      s.spots.forEach((p, n) => {
        const glow = Math.max(0, 1 - k * 1.4) * (0.6 + 0.4 * Math.abs(Math.sin(this.time * 6 + p.phase)));
        s.embers.setMatrixAt(n, tmpMatrix.compose(tmpPos.set(p.x, 0.04, p.z), noTurn, tmpScale.setScalar(Math.max(glow, 0.001))));
      });
      s.embers.instanceMatrix.needsUpdate = true;
      if (k >= 1) {
        this.dropScorch(s);
        this.scorches.splice(i, 1);
      }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      const k = (p.age - p.delay) / p.life;
      if (k < 0) continue;
      p.mesh.scale.setScalar(0.3 + k * p.grow);
      p.mesh.position.y += dt * 0.6;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k);
      if (k >= 1) {
        this.root.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.puffs.splice(i, 1);
      }
    }
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.age += dt;
      const k = Math.min(a.age / a.dur, 1);
      const prev = a.mesh.position.clone();
      a.mesh.position.lerpVectors(a.from, a.to, k);
      a.mesh.position.y += Math.sin(Math.PI * k) * 0.6;
      a.mesh.lookAt(a.mesh.position.clone().add(a.mesh.position.clone().sub(prev)));
      if (k >= 1) {
        this.root.remove(a.mesh);
        this.arrows.splice(i, 1);
      }
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += dt;
      const k = r.age / RIPPLE_LIFE;
      r.mesh.scale.setScalar(0.6 + k * 6.5);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
      if (k >= 1) {
        this.root.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      const k = r.age / RING_LIFE;
      r.mesh.scale.setScalar(0.5 + k * 6);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
      if (k >= 1) {
        this.root.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        this.rings.splice(i, 1);
      }
    }
  }
}
