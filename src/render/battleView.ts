// Vẽ lính hai bên của một trận vào một nhóm cho sẵn: dùng cho trận giữ kinh đô (trong cảnh kinh đô)
// và trận ngoài bãi (trong cảnh bãi chiến). Tọa độ trận cộng `offset` thành tọa độ trong nhóm.

import * as THREE from 'three';
import type { Battle, FighterKind } from '../game/battle';
import { WEAPON_REST, makeFighter, makeGiong } from './models';
import { C } from './palette';

interface FighterView {
  obj: THREE.Group;
  deadAge: number;
  /** Gióng bay về trời: đã bay được bao lâu. */
  rise: number;
  /** Tay cầm roi (hay tre) của Gióng, để làm động tác quật. */
  weapon?: THREE.Object3D;
  /** Gióng đang quét tre một vòng (Nhổ tre): còn bao lâu. */
  smash: number;
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

const SCALE: Partial<Record<FighterKind, number>> = { voi: 0.75, chienXa: 0.75, phoTuong: 1, daiTuong: 0.85, giong: 1.1 };
const puffGeo = new THREE.SphereGeometry(0.3, 10, 8);
const arrowGeo = new THREE.BoxGeometry(0.03, 0.03, 0.45);
const arrowMat = new THREE.MeshBasicMaterial({ color: C.arrow });
const ringGeo = new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2);
const RING_LIFE = 1.1;
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
  private battleId = -1;
  private lastSeq = 0;
  private time = 0;

  /** `scale`: phóng to lính so với cỡ trong kinh đô (bãi chiến nhìn gần hơn cần lính to hơn). */
  constructor(
    private readonly root: THREE.Object3D,
    private readonly offset: { x: number; z: number },
    private readonly scale = 1,
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
    for (const v of this.fighters.values()) {
      this.root.remove(v.obj);
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
      }
      // Gióng ra đòn bằng tay vũ khí, ngựa chỉ chồm nhẹ khi quét tre; người khác ngả cả thân.
      if (f.kind === 'giong') obj.rotation.x = view.smash > 0 ? -0.2 * Math.sin(Math.PI * (1 - view.smash / SMASH_TIME)) : 0;
      else obj.rotation.x = f.swing > 0 ? -0.5 * (f.swing / 0.3) : 0;
      // Đang có Trống trận thì quân ta nhún nhảy hăng hơn.
      const hop = f.side === 'ta' && battle.rally > 0 ? 0.12 : 0.06;
      obj.position.y = f.state === 'move' ? Math.abs(Math.sin(this.time * 10 + f.id)) * hop : 0;
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
      if (e.kind === 'rally' || e.kind === 'smash') {
        const color = e.kind === 'rally' ? C.bronzeLight : C.bamboo;
        const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
        mesh.position.set(e.x + ox, 0.08, e.z + oz);
        mesh.renderOrder = 3;
        this.root.add(mesh);
        this.rings.push({ mesh, age: 0 });
      }
      if (e.kind === 'fire' && e.tx !== undefined && e.tz !== undefined) {
        // Vệt lửa dọc đường ngựa sắt lao qua.
        const n = 12;
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          this.addPuff(e.x + (e.tx - e.x) * k + ox, 0.35, e.z + (e.tz - e.z) * k + oz, i % 3 ? C.fire : C.ember, i * 0.025, 0.9, 2.2);
        }
      }
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

  private addPuff(x: number, y: number, z: number, color: number, delay: number, life: number, grow: number): void {
    const mesh = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(0.01);
    this.root.add(mesh);
    this.puffs.push({ mesh, age: 0, delay, life, grow });
  }

  private animate(dt: number): void {
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
