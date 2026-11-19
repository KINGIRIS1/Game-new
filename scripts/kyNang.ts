// Kỹ năng tướng cho scripts/chup-ky-nang.mjs: dựng bãi chiến của một màn có tướng làm kỹ năng ấy, cho trận chạy một
// lúc cho hai bên áp sát, bấm kỹ năng rồi chụp nhiều khung đúng từng mốc giây sau khi bấm (trận chạy theo bước cố
// định nên ảnh lần nào cũng y nhau). Các khung ghép thành một dải ngang để so hiệu ứng theo thời gian.

import * as THREE from 'three';
import { baiOf } from '../src/game/baiChien';
import { startFieldBattle, stepField, useSkill, type HeroSetup } from '../src/game/battle';
import { FIELD, STAGES, type HeroKind, type SkillId } from '../src/game/defs';
import { Battlefield } from '../src/render/battlefield';
import { IsoCamera } from '../src/render/camera';

/** Tướng làm kỹ năng và màn mặc định để chụp. */
const CHU: Record<SkillId, { heroes: HeroKind[]; man: number }> = {
  trongTran: { heroes: [], man: 3 },
  phunLua: { heroes: ['giong'], man: 6 },
  nhoTre: { heroes: ['giong'], man: 6 },
  bocDoi: { heroes: ['sonTinh'], man: 12 },
  doiNon: { heroes: ['sonTinh'], man: 12 },
  noThan: { heroes: ['anDuong'], man: 20 },
  ruaVang: { heroes: ['anDuong'], man: 20 },
  lienChau: { heroes: ['caoLo'], man: 26 },
  lenhBan: { heroes: ['caoLo'], man: 31 },
  voiXung: { heroes: ['trungTrac', 'trungNhi'], man: 34 },
  hieuTrieu: { heroes: ['trungTrac', 'trungNhi'], man: 34 },
  chemCaKinh: { heroes: ['baTrieu'], man: 34 },
};

function fieldPoint(x: number, z: number): THREE.Vector3 {
  const dx = x - FIELD.w / 2;
  const dz = z - FIELD.d / 2;
  return new THREE.Vector3((dx + dz) * Math.SQRT1_2, 0, (dz - dx) * Math.SQRT1_2);
}

export interface Dai {
  url: string;
  calls: number;
  triangles: number;
}

/**
 * Chụp kỹ năng `skill`: trận chạy `truoc` giây rồi bấm, chụp ở các mốc `moc` (giây sau khi bấm), mỗi khung `w`×`h`
 * điểm, phóng `zoom` lần so với vừa khít bãi, nhìn vào giữa tướng và đám giặc.
 */
export function chupKyNang(skill: SkillId, man: number | undefined, truoc: number, moc: number[], w: number, h: number, zoom: number): Dai {
  const chu = CHU[skill];
  const stage = man ?? chu.man;
  const def = STAGES[stage - 1];
  const bai = baiOf(def.terrain, def.chapter);
  const hero = (kind: HeroKind): HeroSetup => ({ kind, bamboo: true, glow: false, non: true, kimQuy: true, lenhBan: true, hieuTrieu: true });
  const battle = startFieldBattle({
    id: 1,
    stage,
    enemies: def.enemies,
    hpScale: def.hpScale * 3,
    army: { giao: 11, cung: 10, voi: 3, no: 4 },
    rows: { giao: 'tien', cung: 'hau', voi: 'trung', no: 'trung' },
    hero: chu.heroes[0] ? hero(chu.heroes[0]) : null,
    hero2: chu.heroes[1] ? hero(chu.heroes[1]) : null,
    bai,
  });
  const field = new Battlefield();
  field.setTerrain(def.terrain, bai);
  const dt = 0.05;
  for (let i = 0; i < truoc / dt && !battle.outcome; i++) {
    stepField(battle, dt);
    field.update(battle, dt);
  }
  if (!useSkill(battle, skill)) throw new Error(`Không bấm được ${skill}`);

  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  const cam = new IsoCamera(document.createElement('div'));
  cam.setSize(w, h);
  cam.setFacing(0);
  cam.bounds = { min: -30, max: 30 };
  cam.zoomToFit(FIELD.w + 1.5, FIELD.d * 0.62 + 3);
  cam.zoom *= zoom;

  const strip = document.createElement('canvas');
  strip.width = w * moc.length;
  strip.height = h + 24;
  const ctx = strip.getContext('2d')!;
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, strip.width, strip.height);
  let t = 0;
  let calls = 0;
  let triangles = 0;
  // Nhìn cố định vào chỗ tướng và giặc gần nhất lúc bấm, để các khung so được với nhau.
  const owner = battle.fighters.find((f) => f.side === 'ta' && (chu.heroes as string[]).includes(f.kind));
  const foe = owner && battle.fighters.filter((f) => f.side === 'giac' && f.hp > 0).sort((a, b) => Math.hypot(a.x - owner.x, a.z - owner.z) - Math.hypot(b.x - owner.x, b.z - owner.z))[0];
  // Không có tướng (Trống trận): nhìn vào giữa quân ta.
  const ta = battle.fighters.filter((f) => f.side === 'ta' && f.hp > 0);
  const mid = { x: ta.reduce((n, f) => n + f.x, 0) / (ta.length || 1), z: ta.reduce((n, f) => n + f.z, 0) / (ta.length || 1) };
  const look = owner ? fieldPoint((owner.x + (foe?.x ?? owner.x)) / 2, (owner.z + (foe?.z ?? owner.z)) / 2) : fieldPoint(mid.x, mid.z);
  cam.target.copy(look);
  cam.apply();
  moc.forEach((m, i) => {
    for (; t < m - 1e-6; t += dt) {
      if (!battle.outcome) stepField(battle, dt);
      field.update(battle, dt);
    }
    renderer.render(field.scene, cam.camera);
    calls = Math.max(calls, renderer.info.render.calls);
    triangles = Math.max(triangles, renderer.info.render.triangles);
    ctx.drawImage(canvas, i * w, 24);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${skill} +${m.toFixed(2)} giây`, i * w + 8, 18);
  });
  const out = { url: strip.toDataURL('image/png'), calls, triangles };
  renderer.dispose();
  canvas.remove();
  return out;
}
