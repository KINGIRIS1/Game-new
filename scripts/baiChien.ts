// Bãi chiến cho scripts/chup-bai-chien.mjs: dựng cảnh bãi chiến phó bản (`Battlefield`) theo nền, có quân hai bên
// dàn trận như lúc vừa xuất quân (không tướng), rồi chụp bằng camera đặt như World.showField ở khổ điện thoại.
// Không cần state game, nên chụp được cả nền của màn chưa mở. Chạy trong trình duyệt qua Vite.

import * as THREE from 'three';
import { startFieldBattle } from '../src/game/battle';
import { FIELD, STAGES, type Terrain } from '../src/game/defs';
import { Battlefield, CAM_KHE, MO_DA } from '../src/render/battlefield';
import { IsoCamera } from '../src/render/camera';

export interface Anh {
  url: string;
  calls: number;
  triangles: number;
}

/** Tùy chọn chụp thêm. */
export interface Tuy {
  /** Màn cầm cự: đặt đồng hồ trận tới phần này của thanh (0..1). */
  tien?: number;
  /** Kết cục: thắng (kết chương thì camera lùi theo `focus()` như World.updateField), thua. */
  ket?: 'win' | 'lose';
  /** Khung nhìn rộng đề nghị cho Cấm Khê (`CAM_KHE.view`). */
  rong?: boolean;
  /** Nhìn vào điểm (x, z) trong bãi thay cho giữa bãi. */
  nhin?: [number, number];
}

/** Điểm (x, z) trong bãi ra tọa độ cảnh: bãi xoay 45°, gốc ở giữa bãi (như `Battlefield`). */
function fieldPoint(x: number, z: number): THREE.Vector3 {
  const dx = x - FIELD.w / 2;
  const dz = z - FIELD.d / 2;
  return new THREE.Vector3((dx + dz) * Math.SQRT1_2, 0, (dz - dx) * Math.SQRT1_2);
}

/**
 * Chụp bãi nền `t` ở khung `w`×`h` điểm CSS, mật độ `dpr`. `stage`: lấy quân giặc của màn này (0 là không có lính).
 * `zoom`: nhân thêm vào độ phóng vừa khít bãi (nhỏ hơn 1 là lùi xa). `moc`: vẽ đường ngựa và chỗ Rùa Vàng của Mộ Dạ.
 */
export function chupBai(t: Terrain, stage: number, w: number, h: number, dpr: number, zoom: number, moc: boolean, tuy: Tuy = {}): Anh {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h);

  const field = new Battlefield();
  field.setTerrain(t);
  if (stage > 0) {
    const def = STAGES[stage - 1];
    const battle = startFieldBattle({
      id: 1,
      stage,
      enemies: def.enemies,
      hpScale: def.hpScale,
      army: { giao: 11, cung: 10, voi: 3, no: 4 },
      rows: { giao: 'tien', cung: 'hau', voi: 'trung', no: 'trung' },
      waves: def.waves,
      holdS: def.holdS,
    });
    if (def.holdS && tuy.tien !== undefined) battle.t = tuy.tien * def.holdS;
    for (let i = 0; i < 5; i++) field.update(battle, 0.05);
    if (tuy.ket) {
      battle.outcome = tuy.ket;
      if (def.terrain === 'moDa') battle.seaWin = true;
      if (def.terrain === 'camKhe') battle.hatWin = true;
      // Chờ chừng bốn giây cho cảnh kết (dân vào rừng, Rùa Vàng nổi lên).
      for (let i = 0; i < 80; i++) field.update(battle, 0.05);
    }
  } else field.update(null, 0.05);
  if (moc) field.scene.add(mocMoDa());

  const div = document.createElement('div');
  const cam = new IsoCamera(div);
  cam.setSize(w, h);
  cam.setFacing(0);
  cam.bounds = { min: -30, max: 30 };
  cam.target.set(0, 0, 0);
  if (tuy.rong && t === 'camKhe') {
    cam.zoomToFit(CAM_KHE.view.w, CAM_KHE.view.h);
    cam.target.copy(fieldPoint(CAM_KHE.view.x, FIELD.d / 2));
  } else cam.zoomToFit(FIELD.w + 1.5, FIELD.d * 0.62 + 3);
  // Cảnh kết chương có điểm nhìn riêng: camera tới đó và lùi xa như World.updateField lúc đã lướt tới nơi.
  const focus = tuy.ket === 'win' ? field.focus() : null;
  if (focus) {
    cam.target.set(focus.x, 0, focus.z);
    cam.zoom = cam.fitZoom(FIELD.w + 16, FIELD.d * 0.8 + 10);
  }
  if (tuy.nhin) cam.target.copy(fieldPoint(...tuy.nhin));
  cam.zoom *= zoom;
  cam.apply();
  renderer.render(field.scene, cam.camera);
  const out = { url: canvas.toDataURL('image/png'), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  renderer.dispose();
  canvas.remove();
  return out;
}

/** Mốc của Mộ Dạ, đặt như bãi (xoay 45°, gốc ở góc bãi): đường ngựa màu đỏ, dải cát để trống, chỗ Rùa Vàng. */
function mocMoDa(): THREE.Group {
  const outer = new THREE.Group();
  outer.rotation.y = Math.PI / 4;
  const g = new THREE.Group();
  g.position.set(-FIELD.w / 2, 0, -FIELD.d / 2);
  outer.add(g);
  const road = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, MO_DA.fromZ - MO_DA.toZ), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  road.position.set(MO_DA.roadX, 0.2, (MO_DA.fromZ + MO_DA.toZ) / 2);
  g.add(road);
  for (const x of [FIELD.w + 0.8, FIELD.w + 3]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, FIELD.d + 6), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
    edge.position.set(x, 0.1, (FIELD.d + 2 - 4) / 2);
    g.add(edge);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffd000 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(MO_DA.turtle.x, 0.1, MO_DA.turtle.z);
  g.add(ring);
  return outer;
}
