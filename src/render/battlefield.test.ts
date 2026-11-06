// Canh bãi chiến Mộ Dạ (màn 32): đường ngựa của vua là dải cát phẳng, trống, luôn trên mặt nước; góc xa bên phải,
// chỗ Rùa Vàng nổi lên, là biển. Cửa sông (màn 28): thuyền giặc nổi trên mặt nước. Lãng Bạc (màn 38, 39): mặt bãi
// phẳng, gò đất ngoài bãi, lâu thuyền trên mặt nước. Cấm Khê (màn 40): sông Hát ngoài bãi sau lưng quân ta, đường
// mòn trên đất khô ngoài bãi, dân rút đi theo thanh và không bước vào bãi, thắng thì camera nhìn về phía sông.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx }) });

describe('bãi chiến chương 4', () => {
  it('Mộ Dạ: đường ngựa trên cát khô, phẳng, không vướng cây đá lông ngỗng; chỗ Rùa Vàng là biển', async () => {
    const { FIELD } = await import('../game/defs');
    const { Battlefield, MO_DA } = await import('./battlefield');
    const bf = new Battlefield();
    bf.setTerrain('moDa');
    const strip = { x0: FIELD.w + 0.8, x1: FIELD.w + 3, z0: -4, z1: FIELD.d + 2 };
    for (let x = strip.x0; x <= strip.x1 + 1e-6; x += 0.2) {
      for (let z = strip.z0; z <= strip.z1 + 1e-6; z += 0.25) {
        const h = bf.groundAt(x, z);
        expect(h, `cát ở (${x.toFixed(1)}, ${z.toFixed(1)})`).toBeGreaterThan(MO_DA.waterY + 0.15);
        expect(Math.abs(h), `phẳng ở (${x.toFixed(1)}, ${z.toFixed(1)})`).toBeLessThan(0.2);
      }
    }
    expect(MO_DA.roadX).toBeGreaterThanOrEqual(strip.x0);
    expect(MO_DA.roadX).toBeLessThanOrEqual(strip.x1);
    // Góc xa bên phải là biển; Rùa Vàng nổi lên ở chỗ nước sâu, cách bờ.
    expect(bf.groundAt(FIELD.w + 4, -4)).toBeLessThan(MO_DA.waterY);
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      expect(bf.groundAt(MO_DA.turtle.x + dx, MO_DA.turtle.z + dz)).toBeLessThan(MO_DA.waterY - 0.3);
    }

    // Không vật gì (cây, đá, lông ngỗng, núi) đứng trên dải cát: xét từng bản sao và từng khối không phải mặt đất, mặt nước.
    const inStrip = (p: THREE.Vector3) => p.x > strip.x0 && p.x < strip.x1 && p.z > strip.z0 && p.z < strip.z1;
    const decor = bf.scene.getObjectByName('decor')!;
    bf.scene.updateMatrixWorld(true);
    const toField = new THREE.Matrix4().copy(decor.matrixWorld).invert();
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    let copies = 0;
    decor.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) {
        copies += o.count;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m);
          p.setFromMatrixPosition(m.premultiply(o.matrixWorld).premultiply(toField));
          expect(inStrip(p), `bản sao ở (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`).toBe(false);
        }
      } else if (o instanceof THREE.Mesh && !o.userData.ground) {
        const box = new THREE.Box3().setFromObject(o).applyMatrix4(toField);
        const hit = box.max.x > strip.x0 && box.min.x < strip.x1 && box.max.z > strip.z0 && box.min.z < strip.z1;
        expect(hit, `khối ${o.name || o.type} từ (${box.min.x.toFixed(1)}, ${box.min.z.toFixed(1)}) tới (${box.max.x.toFixed(1)}, ${box.max.z.toFixed(1)})`).toBe(false);
      }
    });
    // Có cây và lông ngỗng thật (mỗi bản sao tính cả viền mực), chứ không phải cảnh trống.
    expect(copies).toBeGreaterThan(200);
  });

  it('cửa sông: thuyền giặc neo trên mặt nước, không trên bãi chiến', async () => {
    const { FIELD } = await import('../game/defs');
    const { Battlefield, MO_DA } = await import('./battlefield');
    const bf = new Battlefield();
    bf.setTerrain('cuaSong');
    const decor = bf.scene.getObjectByName('decor')!;
    const boats = decor.children.filter((o) => o.userData.boat);
    expect(boats.length).toBeGreaterThanOrEqual(5);
    for (const b of boats) {
      expect(b.position.z, 'thuyền sau lưng giặc').toBeLessThan(-1.5);
      // Thân thuyền (dài chừng 1,6 ô theo trục thuyền) nằm trên nước, không mắc cạn quá nửa.
      expect(bf.groundAt(b.position.x, b.position.z), `nước dưới thuyền ở x = ${b.position.x.toFixed(1)}`).toBeLessThan(MO_DA.waterY);
      expect(b.position.x).toBeGreaterThan(-FIELD.w * 3);
    }
  });
});

/** Mặt bãi (cả viền lượn quanh) phẳng: lính đứng ở độ cao 0, không lún, không lơ lửng. */
function expectFlatField(bf: { groundAt(x: number, z: number): number }, W: number, D: number): void {
  for (let x = -1; x <= W + 1 + 1e-6; x += 0.25) {
    for (let z = -1; z <= D + 1 + 1e-6; z += 0.25) {
      expect(Math.abs(bf.groundAt(x, z)), `mặt bãi ở (${x.toFixed(2)}, ${z.toFixed(2)})`).toBeLessThan(0.03);
    }
  }
}

describe('bãi chiến chương 5', () => {
  it('Lãng Bạc: mặt bãi phẳng, gò đất cao ngoài bãi, lâu thuyền đậu trên mặt nước sau lưng giặc', async () => {
    const { FIELD } = await import('../game/defs');
    const { Battlefield, MO_DA } = await import('./battlefield');
    const bf = new Battlefield();
    bf.setTerrain('langBac');
    expectFlatField(bf, FIELD.w, FIELD.d);
    // Gò đất bên phải bãi, ngang giữa bãi: cao hẳn lên.
    expect(bf.groundAt(FIELD.w + 5.6, FIELD.d * 0.48)).toBeGreaterThan(1.5);
    const decor = bf.scene.getObjectByName('decor')!;
    const ships = decor.children.filter((o) => o.userData.boat);
    expect(ships).toHaveLength(1);
    const ship = ships[0];
    expect(ship.position.z, 'thuyền sau lưng giặc').toBeLessThan(-3);
    // Thân thuyền dài chừng 4 ô dọc trục x: cả thân nổi trên nước.
    for (const dx of [-2, -1, 0, 1, 2]) {
      for (const dz of [-0.6, 0, 0.6]) {
        expect(bf.groundAt(ship.position.x + dx, ship.position.z + dz), `nước dưới thuyền (${dx}, ${dz})`).toBeLessThan(MO_DA.waterY - 0.1);
      }
    }
  });

  it('Cấm Khê: mặt bãi phẳng; sông Hát ngoài bãi, sau lưng quân ta; đường mòn trên đất khô, ngoài bãi', async () => {
    const { FIELD } = await import('../game/defs');
    const { Battlefield, CAM_KHE, MO_DA } = await import('./battlefield');
    const bf = new Battlefield();
    bf.setTerrain('camKhe');
    expectFlatField(bf, FIELD.w, FIELD.d);
    // Khúc sông Hai Bà nhìn về: sau lưng quân ta (z lớn), cách mép bãi, nước sâu.
    expect(CAM_KHE.riverNear).toBeGreaterThan(FIELD.d + 3);
    expect(CAM_KHE.river.z).toBeGreaterThan(CAM_KHE.riverNear);
    expect(CAM_KHE.river.z).toBeLessThan(CAM_KHE.riverFar);
    for (const x of [0, FIELD.w / 2, FIELD.w]) {
      expect(bf.groundAt(x, CAM_KHE.river.z), `sông ở x = ${x}`).toBeLessThan(MO_DA.waterY - 0.2);
    }
    // Đường mòn: từng quãng trên đất khô, ngoài bãi một khoảng (dân không bước vào bãi).
    const pts = CAM_KHE.trail;
    for (let i = 0; i + 1 < pts.length; i++) {
      for (let k = 0; k < 8; k++) {
        const x = pts[i].x + ((pts[i + 1].x - pts[i].x) * k) / 8;
        const z = pts[i].z + ((pts[i + 1].z - pts[i].z) * k) / 8;
        expect(bf.groundAt(x, z), `đường mòn khô ở (${x.toFixed(1)}, ${z.toFixed(1)})`).toBeGreaterThan(MO_DA.waterY + 0.1);
        const out = Math.max(-x, x - FIELD.w, -z, z - FIELD.d);
        expect(out, `đường mòn ngoài bãi ở (${x.toFixed(1)}, ${z.toFixed(1)})`).toBeGreaterThan(1.2);
      }
    }
  });

  it('Cấm Khê: dân rút theo thanh, không vào bãi; thua thì đứng lại; thắng thì vào rừng hết, camera nhìn về phía sông', async () => {
    const { FIELD, STAGES } = await import('../game/defs');
    const { startFieldBattle } = await import('../game/battle');
    const { Battlefield } = await import('./battlefield');
    const def = STAGES[39];
    expect(def.terrain).toBe('camKhe');
    const start = () =>
      startFieldBattle({
        id: 7,
        stage: 40,
        enemies: def.enemies,
        hpScale: def.hpScale,
        army: { giao: 2, cung: 0, voi: 0, no: 0 },
        rows: { giao: 'tien', cung: 'hau', voi: 'trung', no: 'trung' },
        waves: def.waves,
        holdS: def.holdS,
      });
    const bf = new Battlefield();
    bf.setTerrain('camKhe');
    const battle = start();
    const crowd = () => bf.scene.getObjectByName('retreat')!.children.filter((o) => o.userData.pose || o.userData.walk);
    const shown = () => crowd().filter((o) => o.visible);
    bf.update(battle, 0.05);
    expect(crowd().length).toBeGreaterThanOrEqual(10);
    expect(bf.focus(), 'chưa thắng thì camera không đổi chỗ nhìn').toBeNull();
    // Đi theo thanh: người đi đầu xa dần; không ai bước vào bãi.
    const lead = crowd()[0];
    const from = lead.position.clone();
    for (const k of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      battle.t = k * def.holdS!;
      bf.update(battle, 0.05);
      for (const o of shown()) {
        const out = Math.max(-o.position.x, o.position.x - FIELD.w, -o.position.z, o.position.z - FIELD.d);
        expect(out, `dân ở (${o.position.x.toFixed(1)}, ${o.position.z.toFixed(1)}) lúc thanh ${k}`).toBeGreaterThan(1);
      }
    }
    expect(shown().length, 'gần đầy thanh: người đi đầu đã khuất vào rừng').toBeLessThan(crowd().length);
    expect(lead.position.distanceTo(from)).toBeGreaterThan(5);
    // Thua: dân đứng lại.
    battle.outcome = 'lose';
    const still = crowd().map((o) => o.position.clone());
    battle.t += 5;
    bf.update(battle, 0.5);
    crowd().forEach((o, i) => expect(o.position.distanceTo(still[i])).toBeLessThan(1e-6));
    // Thắng sớm (lần đầu, kết chương): dân rảo bước vào rừng hết; camera nhìn về phía sông sau lưng quân ta.
    const won = start();
    won.t = 0.4 * def.holdS!;
    bf.update(won, 0.05);
    won.outcome = 'win';
    won.hatWin = true;
    for (let i = 0; i < 300; i++) bf.update(won, 0.05);
    expect(shown()).toHaveLength(0);
    const focus = bf.focus();
    expect(focus).not.toBeNull();
    // Điểm nhìn ở giữa bãi theo bề ngang, phía quân ta.
    const inner = bf.scene.getObjectByName('decor')!.parent!;
    const local = inner.worldToLocal(focus!.clone());
    expect(Math.abs(local.x - FIELD.w / 2)).toBeLessThan(1);
    expect(local.z).toBeGreaterThan(FIELD.d / 2);
    // Rời bãi: đoàn dân được gỡ.
    bf.update(null, 0.05);
    expect(bf.scene.getObjectByName('retreat')).toBeUndefined();
    expect(bf.focus()).toBeNull();
  }, 30000);
});

describe('vật cản giữa bãi', () => {
  it('mỗi bố cục: mặt bãi phẳng; mảng đất khớp vật cản, nước bùn khớp vùng chậm; mô hình không lấn dải dàn quân; dáng nào cũng có hình', async () => {
    const { FIELD } = await import('../game/defs');
    const { BAI, chamAt, sdHinh, sdfCan } = await import('../game/baiChien');
    const { Battlefield } = await import('./battlefield');
    const { coVe } = await import('./vatCan');
    const ids = Object.keys(BAI);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    for (const id of ids) {
      const bai = BAI[id];
      for (const c of bai.can) expect(coVe(c), `${id}: dáng ${c.ve}`).toBe(true);
      const bf = new Battlefield();
      bf.setTerrain(bai.terrain, id);
      expectFlatField(bf, FIELD.w, FIELD.d);
      const decor = bf.scene.getObjectByName('decor')!;
      const group = decor.getObjectByName('vatCan')!;
      expect(group, id).toBeDefined();
      bf.scene.updateMatrixWorld(true);
      const decals = group.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh && !!o.userData.vatCan);
      const ray = new THREE.Raycaster();
      const down = new THREE.Vector3(0, -1, 0);
      const hit = (x: number, z: number) => {
        ray.set(decor.localToWorld(new THREE.Vector3(x, 1, z)), down);
        return ray.intersectObjects(decals, false).length > 0;
      };
      // Cách vật cản, vùng chậm xa thì là mặt bãi; trong vật cản, trong vùng chậm thì có mảng đè lên.
      const nearSlow = (x: number, z: number) => Math.min(...bai.cham.map((v) => sdHinh(v.hinh, x, z)), Infinity);
      for (let x = 0.25; x < FIELD.w; x += 0.5) {
        for (let z = 6.25; z < 15.5; z += 0.5) {
          const s = sdfCan(bai, x, z);
          const w = nearSlow(x, z);
          if (s > 0.6 && w > 0.45) expect(hit(x, z), `${id}: mặt bãi trống ở (${x}, ${z})`).toBe(false);
          if (s < -0.1) expect(hit(x, z), `${id}: mảng đất dưới vật cản ở (${x}, ${z})`).toBe(true);
          if (w < -0.1) expect(chamAt(bai, x, z) < 1 && hit(x, z), `${id}: nước, bùn ở (${x}, ${z})`).toBe(true);
        }
      }
      // Mô hình vật cản (kể cả nhà, thuyền dựng riêng) nằm trong dải giữa, không lấn chỗ dàn quân.
      const toField = new THREE.Matrix4().copy(decor.matrixWorld).invert();
      const m = new THREE.Matrix4();
      const v = new THREE.Vector3();
      group.traverse((o) => {
        if (!(o instanceof THREE.Mesh) || o.userData.vatCan || o instanceof THREE.InstancedMesh) return;
        m.multiplyMatrices(toField, o.matrixWorld);
        const pos = o.geometry.attributes.position;
        let z0 = Infinity;
        let z1 = -Infinity;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m);
          z0 = Math.min(z0, v.z);
          z1 = Math.max(z1, v.z);
        }
        expect(z0, `${id}: mô hình lấn dải giặc`).toBeGreaterThan(6.4);
        expect(z1, `${id}: mô hình lấn dải quân ta`).toBeLessThan(15);
      });
    }
  }, 60000);

  it('chỉ đổi bố cục cũng dựng lại cảnh; bãi phẳng không có vật cản; lính lội nước, bùn thì chân chìm', async () => {
    const { BAI } = await import('../game/baiChien');
    const { Battlefield } = await import('./battlefield');
    const { loiAt } = await import('./vatCan');
    const bf = new Battlefield();
    bf.setTerrain('benSong');
    const flat = bf.scene.getObjectByName('decor')!;
    expect(flat.getObjectByName('vatCan')).toBeUndefined();
    bf.setTerrain('benSong', 'benSong');
    const laid = bf.scene.getObjectByName('decor')!;
    expect(laid).not.toBe(flat);
    expect(laid.getObjectByName('vatCan')).toBeDefined();
    bf.setTerrain('benSong', 'benSong');
    expect(bf.scene.getObjectByName('decor')).toBe(laid);
    bf.setTerrain('benSong', 'khongCo');
    expect(bf.scene.getObjectByName('decor')!.getObjectByName('vatCan')).toBeUndefined();
    // Lạch nước bến sông: giữa lạch chìm 0,12 ô; bãi bùn bên kia sông: 0,05 ô; ngoài vùng chậm thì đứng trên mặt bãi.
    const nuoc = BAI.benSong.cham[0].hinh;
    if (nuoc.k !== 'doan') throw new Error('lạch nước là một đoạn');
    expect(loiAt(BAI.benSong, (nuoc.ax + nuoc.bx) / 2, (nuoc.az + nuoc.bz) / 2)).toBeCloseTo(-0.12);
    const bun = BAI.benKia.cham[0].hinh;
    if (bun.k !== 'tron') throw new Error('bãi bùn là một hình tròn');
    expect(loiAt(BAI.benKia, bun.x, bun.z)).toBeCloseTo(-0.05);
    expect(loiAt(BAI.benKia, 4.5, 18)).toBe(0);
    expect(loiAt(undefined, bun.x, bun.z)).toBe(0);
  });
});
