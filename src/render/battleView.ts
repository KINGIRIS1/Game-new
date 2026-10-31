// Vẽ lính hai bên của một trận vào một nhóm cho sẵn: dùng cho trận giữ kinh đô (trong cảnh kinh đô)
// và trận ngoài bãi (trong cảnh bãi chiến). Tọa độ trận cộng `offset` thành tọa độ trong nhóm.

import * as THREE from 'three';
import type { Battle, FighterKind } from '../game/battle';
import { FIRE, HILL } from '../game/defs';
import { WEAPON_REST, makeFighter, makeGiong, makeMountain, makeSonTinh } from './models';
import { C } from './palette';
import { ShapeBuilder, seeded } from './shapes';
import { ToonModel, inkThin, outlineOf, toon } from './toon';

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
  /** Đá Dời non mọc quanh chân tên giặc đang bị giữ chân. */
  rocks?: { group: THREE.Group; age: number };
  /** Núi Tản Viên dâng lên dưới chân Sơn Tinh khi Thủy Tinh rút quân. */
  peak?: THREE.Group;
}

/** Quả đồi Sơn Tinh ném xuống: rơi từ trên cao, đập xuống đất rồi lún dần. */
interface Hill {
  group: THREE.Group;
  age: number;
  landed: boolean;
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

/** Vòng sóng đồng lan ra khi Lạc tướng đánh trống trận. */
interface Ring {
  mesh: THREE.Mesh;
  age: number;
}

const SCALE: Partial<Record<FighterKind, number>> = {
  voi: 0.75,
  chienXa: 0.75,
  phoTuong: 1,
  daiTuong: 0.85,
  giong: 1.1,
  sonTinh: 1.05,
  caSau: 0.8,
  thuongLuong: 1,
  thuyTinh: 0.95,
};
/** Bốc đồi: đồi rơi trong chừng này giây, nằm lại một lúc rồi lún hẳn. */
const HILL_FALL = 0.45;
const HILL_LIFE = 2.4;
const waterBallGeo = new THREE.SphereGeometry(0.09, 8, 6);
const waterBallMat = new THREE.MeshBasicMaterial({ color: 0x9fd4e8 });

/** Quả đồi nhỏ có cây: Sơn Tinh nhấc bổng lên ném vào giặc. Rộng vừa vùng bị đánh trúng. */
function hillModel(): THREE.Group {
  const m = new ToonModel(inkThin);
  m.plain.cone(HILL.radius * 0.95, 1.6, C.mountainCloak, 0, 0.8, 0, undefined, 9);
  m.plain.cone(HILL.radius * 0.5, 0.7, C.rock, 0.3, 0.35, 0.4, undefined, 6);
  m.plain.cone(0.45, 0.5, C.rock, 0, 1.45, 0, undefined, 6);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    m.plain.cone(0.22, 0.5, C.leaf[i % 4], Math.cos(a) * 1.0, 0.9, Math.sin(a) * 1.0, undefined, 5);
  }
  return m.group();
}

/** Ba mỏm đá nhọn mọc lên quanh chân một tên giặc. */
function rockSpikes(seed: number): THREE.Group {
  const b = new ShapeBuilder(false, true);
  const rand = seeded(seed);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rand();
    const h = 0.55 + rand() * 0.35;
    b.cone(0.16, h, i % 2 ? C.rock : C.rockDark, Math.cos(a) * 0.32, h / 2, Math.sin(a) * 0.32, [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25], 5);
  }
  const g = new THREE.Group();
  const mesh = b.mesh(toon);
  g.add(mesh, outlineOf(mesh.geometry, inkThin));
  return g;
}
const puffGeo = new THREE.SphereGeometry(0.3, 10, 8);
const arrowGeo = new THREE.BoxGeometry(0.03, 0.03, 0.45);
const arrowMat = new THREE.MeshBasicMaterial({ color: C.arrow });
const ringGeo = new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2);
const RING_LIFE = 1.1;
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
  private readonly hills: Hill[] = [];
  private battleId = -1;
  private lastSeq = 0;
  private time = 0;

  /**
   * `scale`: phóng to lính so với cỡ trong kinh đô (bãi chiến nhìn gần hơn cần lính to hơn).
   * `heightAt`: chỗ đứng (độ cao) tại tọa độ trận, cho kinh đô có đất bậc thang và nước lũ.
   */
  constructor(
    private readonly root: THREE.Object3D,
    private readonly offset: { x: number; z: number },
    private readonly scale = 1,
    private readonly heightAt: (x: number, z: number) => number = () => 0,
  ) {}

  /** Gọi mỗi khung hình với trận đang diễn ra, hoặc null khi không có trận. */
  update(battle: Battle | null, dt: number): void {
    this.time += dt;
    if (!battle || battle.id !== this.battleId) {
      this.clear();
      this.battleId = battle ? battle.id : -1;
    }
    if (battle) {
      this.syncFighters(battle, dt);
      this.readEvents(battle);
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
      if (v.peak) this.root.remove(v.peak);
      v.obj.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    }
    this.fighters.clear();
    for (const a of this.arrows) this.root.remove(a.mesh);
    this.arrows.length = 0;
    for (const r of this.rings) {
      this.root.remove(r.mesh);
      (r.mesh.material as THREE.Material).dispose();
    }
    this.rings.length = 0;
    for (const p of this.puffs) {
      this.root.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.puffs.length = 0;
    for (const s of this.scorches) this.dropScorch(s);
    this.scorches.length = 0;
    for (const h of this.hills) this.root.remove(h.group);
    this.hills.length = 0;
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
        const obj =
          f.kind === 'giong'
            ? makeGiong('trangSi', { bamboo: battle.hero?.bamboo, glow: battle.hero?.glow })
            : f.kind === 'sonTinh'
              ? makeSonTinh({ glow: battle.hero?.glow })
              : makeFighter(f.kind);
        obj.scale.setScalar((SCALE[f.kind] ?? 0.8) * this.scale);
        this.root.add(obj);
        view = { obj, deadAge: 0, rise: 0, weapon: obj.children.find((c) => c.userData.weapon), smash: 0 };
        this.fighters.set(f.id, view);
      }
      const obj = view.obj;
      obj.position.x = f.x + ox;
      obj.position.z = f.z + oz;
      obj.rotation.y = f.face;
      const base = this.heightAt(f.x, f.z);
      this.syncRocks(view, f.stun ?? 0, f.id, dt);
      if (f.state === 'dead') {
        view.deadAge += dt;
        obj.rotation.x = -Math.min(view.deadAge * 4, Math.PI / 2);
        obj.position.y = base + (view.deadAge > 1.2 ? -(view.deadAge - 1.2) * 0.6 : 0);
        if (view.deadAge > 2.5) obj.visible = false;
        continue;
      }
      if (f.kind === 'sonTinh') {
        for (const c of obj.children) if (c.userData.halo) c.rotation.z = this.time * 0.6;
        if (battle.sonWin && battle.outcome === 'win') {
          // Thủy Tinh rút quân: núi Tản Viên dâng cao dưới chân Sơn Tinh.
          view.rise += dt;
          const k = Math.min(view.rise / 2.5, 1);
          if (!view.peak) {
            view.peak = makeMountain(2.2, 3.2, C.mountainCloak);
            this.root.add(view.peak);
          }
          view.peak.position.set(obj.position.x, base - 3.2 + 3.2 * THREE.MathUtils.smoothstep(k, 0, 1), obj.position.z);
          obj.position.y = view.peak.position.y + 3.2;
          if (view.weapon) view.weapon.rotation.set(WEAPON_REST.x - 2.4 * Math.min(view.rise, 1), 0, WEAPON_REST.z);
          continue;
        }
        if (view.weapon) swingWeapon(view.weapon, f.swing, 0);
      }
      if (f.kind === 'giong') {
        for (const c of obj.children) {
          if (c.userData.flame) c.scale.set(1, 0.7 + 0.5 * Math.abs(Math.sin(this.time * 9)), 1);
          if (c.userData.halo) c.rotation.z = this.time * 0.6;
        }
        if (battle.ascend && battle.outcome === 'win') {
          // Phá xong giặc, Gióng cưỡi ngựa bay lên trời.
          view.rise += dt;
          obj.position.y = base + view.rise * view.rise * 0.8;
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
          obj.position.y = this.heightAt(lerp(d.fromX, d.toX, k), lerp(d.fromZ, d.toZ, k)) + Math.abs(Math.sin(d.age * 26)) * 0.14;
          obj.rotation.x = 0.12;
          if (d.age >= DASH_TIME) view.dash = undefined;
          continue;
        }
      }
      // Gióng ra đòn bằng tay vũ khí, ngựa chỉ chồm nhẹ khi quét tre; người khác ngả cả thân.
      if (f.kind === 'giong') obj.rotation.x = view.smash > 0 ? -0.2 * Math.sin(Math.PI * (1 - view.smash / SMASH_TIME)) : 0;
      else if (f.kind === 'sonTinh') obj.rotation.x = 0;
      else obj.rotation.x = f.swing > 0 ? -0.5 * (f.swing / 0.3) : 0;
      // Đang có Trống trận thì quân ta nhún nhảy hăng hơn.
      const hop = f.side === 'ta' && battle.rally > 0 ? 0.12 : 0.06;
      obj.position.y = base + (f.state === 'move' && !f.stun ? Math.abs(Math.sin(this.time * 10 + f.id)) * hop : 0);
    }
  }

  /** Đá Dời non: mọc nhanh lên quanh chân khi bị giữ chân, lún xuống khi hết. */
  private syncRocks(view: FighterView, stun: number, id: number, dt: number): void {
    if (stun > 0 && !view.rocks) {
      const group = rockSpikes(id * 31 + 7);
      group.scale.set(1, 0.01, 1);
      view.obj.add(group);
      view.rocks = { group, age: 0 };
    }
    if (!view.rocks) return;
    const r = view.rocks;
    r.age += dt;
    // Mọc vụt lên trong 0,2 giây, lún dần trong 0,3 giây cuối.
    r.group.scale.set(1, Math.max(0.01, Math.min(r.age / 0.2, 1) * Math.min(1, stun / 0.3)), 1);
    if (stun <= 0) {
      r.group.removeFromParent();
      view.rocks = undefined;
    }
  }

  private readEvents(battle: Battle): void {
    const { x: ox, z: oz } = this.offset;
    for (const e of battle.events) {
      if (e.seq <= this.lastSeq) continue;
      if (e.kind === 'shot' && e.tx !== undefined && e.tz !== undefined) {
        // Cá phun nước bắn tia nước, người bắn tên.
        const mesh = e.by === 'caPhun' ? new THREE.Mesh(waterBallGeo, waterBallMat) : new THREE.Mesh(arrowGeo, arrowMat);
        const from = new THREE.Vector3(e.x + ox, this.heightAt(e.x, e.z) + 0.8, e.z + oz);
        const to = new THREE.Vector3(e.tx + ox, this.heightAt(e.tx, e.tz) + 0.5, e.tz + oz);
        mesh.position.copy(from);
        this.root.add(mesh);
        this.arrows.push({ mesh, from, to, age: 0, dur: Math.max(0.15, from.distanceTo(to) / 12) });
      }
      if (e.kind === 'smash') {
        const hero = battle.fighters.find((f) => f.kind === 'giong');
        const view = hero && this.fighters.get(hero.id);
        if (view) view.smash = SMASH_TIME;
      }
      if (e.kind === 'hill' && e.tx !== undefined && e.tz !== undefined) {
        const group = hillModel();
        group.position.set(e.tx + ox, this.heightAt(e.tx, e.tz) + 7, e.tz + oz);
        group.rotation.y = e.seq;
        this.root.add(group);
        this.hills.push({ group, age: 0, landed: false });
      }
      if (e.kind === 'drown') {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this.addPuff(e.x + Math.cos(a) * 0.8 + ox, this.heightAt(e.x, e.z) + 0.3, e.z + Math.sin(a) * 0.8 + oz, i % 2 ? C.foam : 0x9fd4e8, i * 0.05, 0.8, 1.3);
        }
      }
      if (e.kind === 'rally' || e.kind === 'smash' || e.kind === 'rocks') {
        const color = e.kind === 'rally' ? C.bronzeLight : e.kind === 'rocks' ? C.rock : C.bamboo;
        const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
        mesh.position.set(e.x + ox, this.heightAt(e.x, e.z) + 0.08, e.z + oz);
        mesh.renderOrder = 3;
        this.root.add(mesh);
        this.rings.push({ mesh, age: 0 });
      }
      if (e.kind === 'fire' && e.tx !== undefined && e.tz !== undefined) this.breatheFire(battle, e.seq, e.x, e.z, e.tx, e.tz);
      if (e.kind === 'smash' || e.kind === 'rocks') {
        const r = e.kind === 'rocks' ? 3 : 1.6;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.addPuff(e.x + Math.cos(a) * r + ox, this.heightAt(e.x, e.z) + 0.2, e.z + Math.sin(a) * r + oz, C.earth, 0.05, 0.7, 1.6);
        }
      }
      if (e.kind === 'exhaust') this.addPuff(e.x + ox, this.heightAt(e.x, e.z) + 0.6, e.z + oz, C.smoke, 0, 1.2, 3);
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
    for (let i = this.hills.length - 1; i >= 0; i--) {
      const h = this.hills[i];
      h.age += dt;
      const { x, z } = h.group.position;
      const ground = this.heightAt(x - this.offset.x, z - this.offset.z);
      if (h.age < HILL_FALL) {
        const k = h.age / HILL_FALL;
        h.group.position.y = ground + 7 * (1 - k * k);
      } else {
        if (!h.landed) {
          h.landed = true;
          // Đồi đập xuống: bụi đất tung lên quanh chân đồi.
          for (let n = 0; n < 10; n++) {
            const a = (n / 10) * Math.PI * 2;
            this.addPuff(x + Math.cos(a) * HILL.radius, ground + 0.2, z + Math.sin(a) * HILL.radius, C.earth, 0, 0.8, 1.8);
          }
        }
        // Nằm lại một lúc rồi lún dần xuống đất.
        const sink = Math.max(0, (h.age - 1.2) / (HILL_LIFE - 1.2));
        h.group.position.y = ground - 1.8 * sink * sink;
      }
      if (h.age >= HILL_LIFE) {
        this.root.remove(h.group);
        this.hills.splice(i, 1);
      }
    }
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
