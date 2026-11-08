import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BUOI, gioBuoi, troiLuc, type Buoi } from '../game/ngayDem';
import { addSunLights } from './lights';
import { C } from './palette';
import { SANG_NGAY, TROI_NGAY, TroiMau, doSang, phaThoiTiet, phaTroi } from './troi';

const lum = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const nen = (b: Buoi) => phaTroi(troiLuc(gioBuoi(b)), new TroiMau());
const thoiTiet = (b: Buoi, storm: number, yeu: number) => phaThoiTiet(nen(b), storm, yeu, new TroiMau());

/** Trời của `World.updateStorm` trước khi có ngày đêm: ban ngày, pha mưa giông `k` và đêm yêu tinh `n`. */
function cu(k: number, n: number) {
  return {
    sky: new THREE.Color(C.sky).lerp(new THREE.Color(C.storm), k * 0.85).lerp(new THREE.Color(C.night), n * 0.85),
    sun: 2.6 * (1 - 0.45 * k) * (1 - 0.6 * n),
    hemi: 0.9 * (1 - 0.2 * k) * (1 - 0.25 * n),
    sunColor: new THREE.Color(0xfff0d8).lerp(new THREE.Color(0x9fb4ff), n * 0.8),
    hemiSky: new THREE.Color(0xfff3dc).lerp(new THREE.Color(0x5a6aa8), n * 0.85),
    hemiGround: new THREE.Color(0x6d6a45).lerp(new THREE.Color(0x2a2a48), n * 0.85),
  };
}

describe('Trời ngày đêm', () => {
  it('trời ban ngày đúng như đèn dựng sẵn (ảnh công trình, bãi chiến)', () => {
    const { sun, hemi } = addSunLights(new THREE.Scene(), 1, 1);
    expect(sun.intensity).toBe(TROI_NGAY.sun);
    expect(hemi.intensity).toBe(TROI_NGAY.hemi);
    expect(sun.color.getHex()).toBe(TROI_NGAY.sunColor);
    expect(hemi.color.getHex()).toBe(TROI_NGAY.hemiSky);
    expect(hemi.groundColor.getHex()).toBe(TROI_NGAY.hemiGround);
    expect(TROI_NGAY.sky).toBe(C.sky);
  });

  it('ban ngày, kể cả lúc mưa giông, ra đúng từng số như trước khi có ngày đêm', () => {
    for (const k of [0, 0.3, 0.5, 1]) {
      const m = thoiTiet('ngay', k, 0);
      const o = cu(k, 0);
      expect(m.sky.equals(o.sky)).toBe(true);
      expect(m.sun).toBe(o.sun);
      expect(m.hemi).toBe(o.hemi);
      expect(m.sunColor.equals(o.sunColor)).toBe(true);
      expect(m.hemiSky.equals(o.hemiSky)).toBe(true);
      expect(m.hemiGround.equals(o.hemiGround)).toBe(true);
      expect(m.shadow).toBe(1);
      expect(m.unlit.equals(new THREE.Color(1, 1, 1))).toBe(true);
    }
    // Đồng hồ 0 là ban ngày thuần.
    expect(phaTroi(troiLuc(0), new TroiMau()).sky.equals(new THREE.Color(C.sky))).toBe(true);
    expect(doSang(nen('ngay'))).toBe(SANG_NGAY);
  });

  it('đêm yêu tinh trông như cũ, tới lúc nào trong ngày cũng vậy', () => {
    const o = cu(0, 1);
    for (const b of BUOI) {
      const m = thoiTiet(b, 0, 1);
      for (const key of ['sky', 'sunColor', 'hemiSky', 'hemiGround'] as const) {
        expect(m[key].r).toBeCloseTo(o[key].r, 9);
        expect(m[key].g).toBeCloseTo(o[key].g, 9);
        expect(m[key].b).toBeCloseTo(o[key].b, 9);
      }
      expect(m.sun).toBeCloseTo(o.sun, 9);
      expect(m.hemi).toBeCloseTo(o.hemi, 9);
    }
  });

  it('đêm thường tối hẳn mà vẫn sáng hơn đêm yêu tinh, chiều tà và rạng đông ở giữa', () => {
    const dem = doSang(nen('dem'));
    const yeu = doSang(thoiTiet('ngay', 0, 1));
    expect(dem).toBeLessThan(0.5 * SANG_NGAY);
    expect(dem).toBeGreaterThan(1.2 * yeu);
    for (const b of ['chieu', 'rang'] as const) {
      expect(doSang(nen(b))).toBeLessThan(SANG_NGAY);
      expect(doSang(nen(b))).toBeGreaterThan(dem);
    }
  });

  it('mưa giông ban đêm không làm trời sáng lên', () => {
    for (const b of BUOI) {
      const quang = lum(nen(b).sky);
      expect(lum(thoiTiet(b, 1, 0).sky)).toBeLessThanOrEqual(quang * 1.1);
    }
  });

  it('vật không nhận đèn tối theo trời, ban ngày giữ nguyên màu', () => {
    expect(lum(nen('dem').unlit)).toBeLessThan(0.4);
    expect(lum(nen('chieu').unlit)).toBeGreaterThan(lum(nen('dem').unlit));
  });
});
