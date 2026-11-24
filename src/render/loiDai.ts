// Cảnh Lôi đài Phong Châu (docs/thiet-ke.md mục Kế hoạch: Lôi đài Phong Châu): sân chầu riêng, không phải sân Điện ở
// kinh đô. Phía sau là thềm cao ba bậc có ngai vàng, Vua Hùng ngồi ngai nhìn xuống (bản tĩnh `bakeVuaHung`), sau nữa
// là khối cung điện; giữa là sân lát đá có mặt trống đồng khảm trên nền; đội ta bên trái, đội máy bên phải, thần thú ở
// mép sân phía đội mình; tướng đã về mà không lên đài đứng chầu hai bên thềm, nữ tướng cầm cờ đứng sau.
//
// Người trên sân là nhân vật có xương dùng chung với trận thường (tướng, lính, thú, quái), hiệu ứng chiêu ghép từ
// `HieuUng`. Cảnh chỉ diễn lại việc luật đã tính (`LoiSk`): `dien` nhận các việc của một lượt, trả thời lượng.

import * as THREE from 'three';
import type { FighterKind } from '../game/battle';
import type { NuTuongId, ThanThuId } from '../game/defs';
import { CHIEU, laLoiTuong, type ChieuId, type LoiKind, type LoiSk, type LoiTran, type LoiTuong } from '../game/loiDai';
import { dangThu } from '../game/thanThu';
import { SCALE } from './battleView';
import { isBeast, makeBeast } from './beasts';
import { banner, drum } from './buildings';
import { featherFans, palaceBlock, parasol, royalCenser, scaled, throne } from './congTrinh/dien';
import {
  VUA_SEAT,
  bakeVuaHung,
  makeAnDuong,
  makeBaTrieu,
  makeCaoLo,
  makeGiong,
  makeLacTuong,
  makeLyThuongKiet,
  makeMaiThucLoan,
  makeNgoQuyen,
  makeNuTuong,
  makeSonTinh,
  makeThuyTinh,
  makeTrieuQuangPhuc,
  makeTrungNhi,
  makeTrungTrac,
} from './heroes';
import { HieuUng } from './hieuUng';
import { addSunLights, type SunLights } from './lights';
import { makeFighter } from './models';
import { isMonster, makeMonster } from './monsters';
import { C } from './palette';
import type { Poser } from './rig';
import { isSoldier, makeSoldier } from './soldier';
import { makeThanThu } from './thanThu';
import { ToonModel } from './toon';
import { TROI_NGAY } from './troi';

/** Bố cục sân (tọa độ trong cảnh, trước khi xoay 45° cho hợp hướng camera): ngai ở phía −z, đội ta ở −x. */
export const SAN = {
  /** Nửa bề ngang, nửa bề sâu sân lát đá. */
  w: 6.3,
  d: 5.9,
  /** Bán kính mặt trống đồng khảm giữa sân. */
  trong: 2.1,
  /** Thềm ngai: mép trước, độ cao mỗi bậc, số bậc. */
  themZ: -4.5,
  bac: 0.42,
  soBac: 3,
  /** Chỗ đứng: đội cách tâm sân, giãn cách giữa ba người, thú đứng xa hơn. */
  doiX: 3.3,
  gian: 3.0,
  thuX: 4.7,
} as const;

const THEM_Y = SAN.bac * SAN.soBac;
/** Phóng người trên sân so với cỡ trong trận thường. */
const CO = 1.4;
/** Ai đánh từ xa thì đứng tại chỗ ra đòn. */
const BAN_XA: LoiKind[] = ['anDuong', 'caoLo', 'trungNhi', 'cung', 'no', 'lacTuong'];

/** Màu hiệu ứng của từng chiêu (đòn thường: trắng). */
const MAU: Partial<Record<ChieuId | ThanThuId, number>> = {
  trongTran: C.fxVang,
  coLenh: C.fxVang,
  phunLua: C.fxLua,
  nhoTre: C.fxXanh,
  bocDoi: C.fxXanh,
  doiNon: C.fxHo,
  noThan: C.fxVang,
  ruaVang: C.fxVang,
  lienChau: C.fxVang,
  lenhBan: C.fxDo,
  voiXung: C.fxBui,
  loiThe: C.fxDo,
  hieuTrieu: C.fxXanh,
  tienPhong: C.fxDo,
  chemCaKinh: C.fxNuoc,
  dapSong: C.fxNuoc,
  ngayAn: C.fxSuong,
  mongRong: C.fxSuong,
  hacDe: C.fxDo,
  phaAch: C.fxDo,
  cocBachDang: C.fxNuoc,
  trieuRut: C.fxNuoc,
  namQuoc: C.fxVang,
  tienPhat: C.fxTim,
  giacChem: C.fxDo,
  giacQuet: C.fxDo,
  giacChoang: C.fxTim,
  giacHo: C.fxDo,
  thuLac: C.fxVang,
  thuNgua: C.fxLua,
  thuGa: C.fxVang,
  thuRua: C.fxVang,
  thuRong: C.fxNuoc,
};

/** Dựng một người trên sân: tướng (có hào quang, vũ khí ánh nếu có), lính, thú, quái. */
function taoNguoi(kind: LoiKind, glow = false, anh = false): THREE.Group {
  switch (kind) {
    case 'lacTuong':
      return makeLacTuong();
    case 'giong':
      return makeGiong('trangSi', { glow, anh });
    case 'sonTinh':
      return makeSonTinh({ glow, anh });
    case 'anDuong':
      return makeAnDuong({ crossbow: true, glow, anh });
    case 'caoLo':
      return makeCaoLo({ glow, anh });
    case 'trungTrac':
      return makeTrungTrac({ glow, anh });
    case 'trungNhi':
      return makeTrungNhi({ glow, anh });
    case 'baTrieu':
      return makeBaTrieu({ anh });
    case 'trieuQuangPhuc':
      return makeTrieuQuangPhuc({ anh });
    case 'maiThucLoan':
      return makeMaiThucLoan({ anh });
    case 'ngoQuyen':
      return makeNgoQuyen({ anh });
    case 'lyThuongKiet':
      return makeLyThuongKiet({ anh });
    case 'thuyTinh':
      return makeThuyTinh();
  }
  const k = kind as FighterKind;
  return isSoldier(k) ? makeSoldier(k, 0) : isBeast(k) ? makeBeast(k, 0) : isMonster(k) ? makeMonster(k) : makeFighter(k, 0);
}

/** Tướng đứng chầu bên thềm (xuống voi, xuống ngựa). */
function taoChau(kind: LoiTuong): THREE.Group {
  switch (kind) {
    case 'giong':
      return makeGiong('trangSi', { onFoot: true });
    case 'trungTrac':
      return makeTrungTrac({ onFoot: true });
    case 'trungNhi':
      return makeTrungNhi({ onFoot: true });
    case 'baTrieu':
      return makeBaTrieu({ onFoot: true });
    case 'ngoQuyen':
      return makeNgoQuyen({ onFoot: true });
    case 'anDuong':
      return makeAnDuong({});
    default:
      return taoNguoi(kind);
  }
}

const coCua = (kind: LoiKind): number => (kind === 'lacTuong' ? 0.95 : (SCALE[kind as FighterKind] ?? 0.8)) * CO;

/** Sân chầu: nền, thềm ngai, ngai, lọng, quạt, cung điện phía sau, cờ, trống, lư hương. */
function dungSan(): THREE.Group {
  const m = new ToonModel();
  const p = m.plain;
  // Đất quanh sân, sân lát đá ô so le, viền đá sẫm.
  p.box(60, 0.1, 60, 0x86a54c, 0, -0.07, 0);
  p.box(SAN.w * 2 + 0.5, 0.08, SAN.d * 2 + 0.5, C.rockDark, 0, -0.02, 0);
  const o = 1.3;
  for (let ix = -5; ix < 5; ix++) {
    for (let iz = -5; iz < 5; iz++) {
      const x = (ix + 0.5) * o;
      const z = (iz + 0.5) * o;
      if (Math.abs(x) > SAN.w || Math.abs(z) > SAN.d) continue;
      p.box(o - 0.05, 0.05, o - 0.05, (ix + iz) % 2 ? C.rock : 0xb9b29c, x, 0.005, z);
    }
  }
  // Mặt trống đồng khảm giữa sân: vành đá sẫm, vành đồng, mặt trống.
  p.cyl(SAN.trong + 0.75, SAN.trong + 0.75, 0.05, C.rockDark, 0, 0.012, 0, undefined, 48);
  m.band.cyl(SAN.trong + 0.5, SAN.trong + 0.5, 0.05, C.bronze, 0, 0.02, 0, undefined, 48);
  p.cyl(SAN.trong + 0.14, SAN.trong + 0.14, 0.05, C.bronzeDark, 0, 0.026, 0, undefined, 48);
  m.drum.cyl(SAN.trong, SAN.trong, 0.05, 0xffffff, 0, 0.032, 0, undefined, 48);

  // Thềm ngai ba bậc, mỗi bậc viền vàng, thảm đỏ giữa.
  const sau = SAN.themZ - 4.3;
  for (let i = 0; i < SAN.soBac; i++) {
    const z0 = SAN.themZ - i * 0.55;
    const w = 8.2 - i * 0.9;
    const d = z0 - sau;
    (i === SAN.soBac - 1 ? m.band : p).box(w, SAN.bac, d, i % 2 ? C.rockDark : C.rock, 0, SAN.bac * (i + 0.5), z0 - d / 2);
    p.box(w + 0.04, 0.05, 0.06, C.gold, 0, SAN.bac * (i + 1), z0);
    p.box(1.5, 0.02, 0.56, C.red, 0, SAN.bac * (i + 1) + 0.012, z0 - 0.27);
  }
  p.box(1.5, 0.02, 2.2, C.red, 0, THEM_Y + 0.012, SAN.themZ - 2.1);
  p.box(1.5, 0.02, 1.4, C.red, 0, 0.04, SAN.themZ + 0.7);
  for (const sx of [-1, 1]) {
    p.box(0.08, 0.03, 2.2, C.gold, sx * 0.79, THEM_Y + 0.016, SAN.themZ - 2.1);
    royalCenser(m, sx * (SAN.w - 0.7), 0, SAN.themZ + 0.7, 2.2);
  }
  // Ngai vàng, lọng, quạt lông chim (dáng của Điện cấp 10, phóng to).
  const ngaiZ = SAN.themZ - 3.0;
  scaled(m, 0, ngaiZ, NGAI_K, () => {
    const b = [m.plain, m.band, m.drum, m.glow];
    const up = new THREE.Matrix4().makeTranslation(0, THEM_Y, 0);
    const truoc = b.map((x) => x.frame);
    for (const x of b) x.frame = up.clone().multiply(x.frame!);
    throne(m, 0, 0, 10);
    parasol(m, 0, -0.42, 10);
    featherFans(m, 0, -0.3);
    b.forEach((x, i) => (x.frame = truoc[i]));
  });
  // Khối cung điện phía sau thềm.
  scaled(m, 0, SAN.themZ - 9.6, 1.9, () => palaceBlock(m, 10));
  // Cờ đại hai bên sân, trống đồng trên giá ở hai góc trước, hai trống lớn bên thềm.
  for (const sx of [-1, 1]) {
    [-3.9, -1.3, 1.3, 3.9].forEach((z, i) => banner(m, sx * (SAN.w - 0.25) - 0.2, z, 3.6, i % 2 ? C.gold : C.red));
    // Trống đồng trên giá ở hai góc trước sân.
    const dx0 = sx * (SAN.w - 1.3);
    const dz0 = SAN.d - 0.9;
    p.box(1.3, 0.12, 0.3, C.woodDark, dx0, 0.45, dz0);
    for (const dx of [-0.52, 0.52]) p.box(0.14, 0.45, 0.16, C.red, dx0 + dx, 0.22, dz0);
    drum(m, dx0, dz0, 1.7, 0.45);
  }
  const g = m.group();
  g.traverse((x) => {
    if (x instanceof THREE.Mesh) x.receiveShadow = true;
  });
  const vua = bakeVuaHung();
  vua.scale.setScalar(NGAI_K);
  vua.position.set(0, THEM_Y + (0.37 - VUA_SEAT) * NGAI_K, ngaiZ + 0.08 * NGAI_K);
  g.add(vua);
  return g;
}
const NGAI_K = 1.7;

interface NguoiView {
  obj: THREE.Group;
  pose?: Poser;
  nha: THREE.Vector3;
  huong: number;
  kind: LoiKind | ThanThuId;
  /** Đang ra chiêu: đã diễn bao lâu, cả thời lượng, lúc trúng, chỗ lao tới, chiêu riêng hay đòn thường. */
  ra?: { t: number; dur: number; trung: number; toi: THREE.Vector3 | null; ky: boolean; horn: boolean };
  /** Vừa trúng đòn: còn rung bao lâu. */
  rung: number;
  nga: boolean;
  ngaTuoi: number;
  thang: number;
  /** Chiều cao người (đỉnh đầu, đã phóng), để đặt thẻ máu và chữ nổi. */
  cao: number;
}

interface ViecCho {
  luc: number;
  lam: () => void;
}

export class LoiDaiCanh {
  readonly scene = new THREE.Scene();
  private readonly inner = new THREE.Group();
  private readonly lights: SunLights;
  private readonly hu: HieuUng;
  private readonly nguoi = new Map<number, NguoiView>();
  private readonly chau: THREE.Group[] = [];
  private readonly vongLuot: THREE.Mesh;
  private readonly vongMuc: THREE.Mesh[] = [];
  private viec: ViecCho[] = [];
  private time = 0;
  private kq: 'thang' | 'thua' | null = null;

  constructor() {
    this.scene.background = new THREE.Color(TROI_NGAY.sky);
    this.lights = addSunLights(this.scene, 16, 2048);
    // Camera nhìn chéo: xoay cả sân cho thềm ngai nằm phía trên màn hình, đội ta bên trái.
    this.inner.rotation.y = Math.PI / 4;
    this.scene.add(this.inner);
    this.inner.add(dungSan());
    this.hu = new HieuUng(this.inner);
    const vong = (mau: number, r: number) => {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(r * 0.82, r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: mau, transparent: true, opacity: 0.9, depthWrite: false }));
      mesh.visible = false;
      mesh.renderOrder = 3;
      this.inner.add(mesh);
      return mesh;
    };
    this.vongLuot = vong(C.gold, 1.1);
    for (let i = 0; i < 3; i++) this.vongMuc.push(vong(C.fxDo, 1.0));
  }

  setShadows(on: boolean): void {
    this.lights.sun.castShadow = on;
  }

  /** Chỗ đứng của người `u` (hay thần thú phe `phe`). */
  private cho(phe: 0 | 1, cho: number | null): THREE.Vector3 {
    const s = phe === 0 ? -1 : 1;
    if (cho === null) return new THREE.Vector3(s * SAN.thuX, 0, 0.4);
    return new THREE.Vector3(s * (SAN.doiX - (cho === 1 ? 1.0 : 0)), 0, (cho - 1) * SAN.gian + 0.5);
  }

  private them(id: number, kind: LoiKind | ThanThuId, obj: THREE.Group, co: number, phe: 0 | 1, cho: number | null): void {
    const nha = this.cho(phe, cho);
    obj.scale.setScalar(co);
    obj.position.copy(nha);
    const huong = phe === 0 ? Math.PI / 2 : -Math.PI / 2;
    obj.rotation.y = huong;
    obj.traverse((o) => {
      if (o instanceof THREE.Mesh) o.frustumCulled = false;
    });
    this.inner.add(obj);
    (obj.userData.pose as Poser | undefined)?.({ act: 'stand', time: 0 });
    obj.updateMatrixWorld(true);
    const cao = THREE.MathUtils.clamp(new THREE.Box3().setFromObject(obj).max.y, 1.2, 3.4);
    this.nguoi.set(id, { obj, pose: obj.userData.pose, nha, huong, kind, rung: 0, nga: false, ngaTuoi: 0, thang: 0, cao });
  }

  private go(obj: THREE.Object3D): void {
    this.inner.remove(obj);
    obj.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
    });
  }

  /** Dựng người của trận `b` và hàng tướng đứng chầu (`chau`: tướng không lên đài; `nu`: nữ tướng đã theo về). */
  dat(b: LoiTran, chau: LoiTuong[] = [], nu: NuTuongId[] = []): void {
    for (const v of this.nguoi.values()) this.go(v.obj);
    for (const o of this.chau) this.go(o);
    this.nguoi.clear();
    this.chau.length = 0;
    this.hu.clear();
    this.viec = [];
    this.kq = null;
    this.vongLuot.visible = false;
    for (const v of this.vongMuc) v.visible = false;
    for (const u of b.units) this.them(u.id, u.kind, taoNguoi(u.kind, !!u.glow, !!u.bo4), coCua(u.kind), u.phe, u.cho);
    b.thu.forEach((t, i) => {
      if (t) this.them(-1 - i, t.kind, makeThanThu(t.kind, dangThu(t.cap)), (SCALE[t.kind] ?? 0.72) * CO * 0.8, i as 0 | 1, null);
    });
    // Hàng chầu trên thềm, hai bên ngai, quay mặt xuống sân; nữ tướng cầm cờ đứng hàng sau.
    chau.forEach((k, i) => {
      const s = i % 2 ? 1 : -1;
      const o = taoChau(k);
      o.scale.setScalar(coCua(k) * 0.8);
      o.position.set(s * (1.6 + Math.floor(i / 2) * 0.95), THEM_Y, SAN.themZ - 1.5);
      o.rotation.y = -s * 0.3;
      (o.userData.pose as Poser | undefined)?.({ act: 'stand', time: i });
      this.inner.add(o);
      this.chau.push(o);
    });
    nu.forEach((k, i) => {
      const s = i % 2 ? 1 : -1;
      const o = makeNuTuong(k);
      o.scale.setScalar(0.8 * CO * 0.8);
      o.position.set(s * (1.75 + Math.floor(i / 2) * 0.95), THEM_Y, SAN.themZ - 2.7);
      o.rotation.y = -s * 0.25;
      (o.userData.pose as Poser | undefined)?.({ act: 'stand', time: i + 3 });
      this.inner.add(o);
      this.chau.push(o);
    });
  }

  /** Điểm trong cảnh (đã xoay) ở độ cao `k` lần chiều cao người `id` (1 là đỉnh đầu), để giao diện đặt thẻ máu, chữ nổi và bắt lần chạm. */
  diem(id: number, k = 1, out = new THREE.Vector3()): THREE.Vector3 | null {
    const v = this.nguoi.get(id);
    if (!v) return null;
    return this.inner.localToWorld(out.copy(v.obj.position).setY(v.obj.position.y + v.cao * k));
  }

  /** Vòng vàng dưới chân người đang tới lượt, vòng đỏ dưới chân những người chọn được làm mục tiêu. */
  chi(luot: number | null, muc: number[]): void {
    const a = luot !== null ? this.nguoi.get(luot) : undefined;
    this.vongLuot.visible = !!a && !a.nga;
    if (a) this.vongLuot.position.set(a.nha.x, 0.07, a.nha.z);
    this.vongMuc.forEach((m, i) => {
      const v = muc[i] !== undefined ? this.nguoi.get(muc[i]) : undefined;
      m.visible = !!v;
      if (v) m.position.set(v.nha.x, 0.075, v.nha.z);
    });
  }

  private sau(luc: number, lam: () => void): void {
    this.viec.push({ luc: this.time + luc, lam });
  }

  /** Hiệu ứng lúc đòn trúng người `v`. */
  private trung(v: NguoiView, mau: number, manh: boolean): void {
    const p = v.obj.position.clone().setY(1.1);
    this.hu.loe(p, { mau, size: manh ? 2.6 : 1.7 });
    this.hu.tia(p, { mau, n: manh ? 14 : 7, toc: manh ? 5 : 3.5 });
    if (manh) this.hu.soc(v.obj.position.clone(), { mau, r: 1.5 });
    v.rung = 0.3;
  }

  /**
   * Diễn các việc của một lượt (`sk` vừa thêm vào trận). Trả thời lượng (giây, ở tốc độ thường) và lúc đòn trúng, để
   * giao diện hiện số máu đúng lúc.
   */
  dien(sk: LoiSk[]): { dur: number; trung: number } {
    const chieu = sk.find((e) => e.t === 'chieu');
    const nga = sk.filter((e) => e.t === 'nga').map((e) => e.id);
    const bi = new Set(sk.filter((e) => e.t === 'mat').map((e) => e.id));
    const hoi = sk.filter((e) => e.t === 'hoi').map((e) => e.id);
    const hu = sk.filter((e): e is Extract<LoiSk, { t: 'hu' }> => e.t === 'hu' && e.on);
    const het = sk.find((e): e is Extract<LoiSk, { t: 'het' }> => e.t === 'het');
    if (!chieu || chieu.t !== 'chieu') {
      // Đầu lượt: mất máu dần, choáng mất lượt.
      for (const id of bi) {
        const v = this.nguoi.get(id);
        if (v) this.trung(v, C.fxLua, false);
      }
      for (const id of nga) this.nguoi.get(id)!.nga = true;
      if (het) this.kq = het.kq;
      return { dur: sk.length ? 0.55 : 0, trung: 0 };
    }
    const a = this.nguoi.get(chieu.ai);
    const c = chieu.chieu;
    const laThu = chieu.ai < 0;
    const def = laThu ? null : CHIEU[c as ChieuId];
    const ky = laThu || c !== 'danh';
    const mau = MAU[c] ?? C.fxTrang;
    const dur = ky ? 1.25 : 0.85;
    const trung = dur * 0.45;
    const muc = chieu.muc.map((id) => this.nguoi.get(id)).filter((v): v is NguoiView => !!v);
    const danhDich = laThu ? c !== 'thuRua' : def!.muc === 'dich' || def!.muc === 'caDich';
    if (a) {
      // Đánh gần một người thì lao tới trước mặt người ấy; còn lại bước lên một bước.
      const s = a.nha.x < 0 ? 1 : -1;
      let toi: THREE.Vector3 | null = a.nha.clone().setX(a.nha.x + s * 0.7);
      if (danhDich && muc.length === 1 && !BAN_XA.includes(a.kind as LoiKind) && !laThu) toi = muc[0].nha.clone().setX(muc[0].nha.x - s * 1.9);
      else if (danhDich && !BAN_XA.includes(a.kind as LoiKind)) toi = new THREE.Vector3(-s * 0.6, 0, laThu ? a.nha.z * 0.5 : a.nha.z * 0.4);
      a.ra = { t: 0, dur, trung, toi, ky, horn: c === 'lenhBan' };
      if (ky) this.hu.vong(a.nha.clone(), { mau, r: 1.2, life: 0.8 });
    }
    this.sau(trung, () => {
      const tam = new THREE.Vector3();
      for (const v of muc) tam.add(v.nha);
      if (muc.length) tam.multiplyScalar(1 / muc.length);
      if (danhDich) {
        if (muc.length > 1) this.hu.soc(tam, { mau, r: 3.4 });
        for (const v of muc) if (bi.has(this.idCua(v))) this.trung(v, mau, ky && muc.length === 1);
        if (c === 'chemCaKinh' || c === 'giacChem' || c === 'tienPhong' || c === 'mongRong') for (const v of muc) this.hu.chem(v.obj.position.clone().setY(1.2), { mau, r: 1.6, yaw: a && a.nha.x < 0 ? 0 : Math.PI });
        if (c === 'bocDoi' || c === 'doiNon' || c === 'voiXung' || c === 'giacQuet') for (const v of muc) this.hu.bui(v.obj.position.clone().setY(0.3), { mau: C.fxBui, size: 2 });
        if (c === 'noThan' || c === 'lienChau' || c === 'lenhBan' || c === 'namQuoc') for (const v of muc) this.hu.cot(v.obj.position.clone(), { mau, r: 0.5, h: 4 });
      } else {
        for (const v of muc) {
          if (c === 'ruaVang' || c === 'thuRua') this.hu.khien(v.nha.clone(), { mau, r: 1.15, life: 1.4 });
          else this.hu.cot(v.nha.clone(), { mau, r: 0.7, h: 3.2 });
          this.hu.hat(v.nha.clone(), { mau, n: 10, r: 0.7, h: 2.2 });
        }
      }
      if (c === 'namQuoc') for (const e of hu) if (e.hu === 'yeu') this.trungNhe(e.id, C.fxTim);
      for (const id of hoi) {
        const v = this.nguoi.get(id);
        if (v) this.hu.hat(v.nha.clone(), { mau: C.fxXanh, n: 12, r: 0.6, h: 2.4 });
      }
      for (const e of hu) {
        const v = this.nguoi.get(e.id);
        if (v && e.hu === 'choang') this.hu.choang(v.obj, { mau: C.fxVang, cao: 2.2 / v.obj.scale.x, life: 1.6 });
      }
      for (const id of nga) {
        const v = this.nguoi.get(id);
        if (v) v.nga = true;
      }
      if (het) this.kq = het.kq;
    });
    return { dur, trung };
  }

  private trungNhe(id: number, mau: number): void {
    const v = this.nguoi.get(id);
    if (v) this.hu.loe(v.obj.position.clone().setY(1.4), { mau, size: 1.4 });
  }

  private idCua(v: NguoiView): number {
    for (const [id, x] of this.nguoi) if (x === v) return id;
    return NaN;
  }

  /** Đang diễn dở một lượt. */
  get dangDien(): boolean {
    if (this.viec.length) return true;
    for (const v of this.nguoi.values()) if (v.ra) return true;
    return false;
  }

  update(dt: number): void {
    this.time += dt;
    if (this.viec.length) {
      const toi = this.viec.filter((v) => v.luc <= this.time);
      this.viec = this.viec.filter((v) => v.luc > this.time);
      for (const v of toi) v.lam();
    }
    const nhip = 0.55 + 0.45 * Math.abs(Math.sin(this.time * 3.2));
    (this.vongLuot.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.45 * nhip;
    this.vongLuot.rotation.y = this.time * 0.8;
    for (const m of this.vongMuc) (m.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.55 * nhip;
    for (const [id, v] of this.nguoi) {
      const o = v.obj;
      const t = this.time + id * 0.7;
      if (v.nga) {
        v.ra = undefined;
        v.ngaTuoi += dt;
        const k = Math.min(v.ngaTuoi * 4, Math.PI / 2);
        if (o.userData.fall === 'side') o.rotation.z = -k;
        else if (o.userData.fall !== 'none') o.rotation.x = -k;
        o.position.lerp(v.nha, Math.min(1, dt * 6));
        v.pose?.({ act: 'dead', fall: Math.min(v.ngaTuoi * 3, 1) });
        continue;
      }
      o.rotation.x = 0;
      o.rotation.z = 0;
      if (v.ra) {
        const r = v.ra;
        r.t += dt;
        const k = Math.min(1, r.t / r.dur);
        // Lao tới (0–0,3), ra đòn (0,25–0,7), lùi về (0,7–1).
        const di = k < 0.3 ? k / 0.3 : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        const e = di * di * (3 - 2 * di);
        if (r.toi) o.position.lerpVectors(v.nha, r.toi, e);
        o.position.y = v.kind === 'thuLac' || v.kind === 'thuRong' ? Math.sin(k * Math.PI) * 0.5 : 0;
        const don = THREE.MathUtils.clamp((k - 0.25) / 0.45, 0, 1);
        const dangDi = (k < 0.3 || k > 0.7) && !!r.toi;
        if (r.horn) v.pose?.({ act: 'stand', horn: k, time: t });
        else if (r.ky && laLoiTuong(v.kind) && v.kind !== 'lacTuong') v.pose?.({ act: dangDi ? 'walk' : 'stand', phase: r.t * 14, stride: 0.6, skill: don, time: t });
        else v.pose?.({ act: dangDi ? 'walk' : 'fight', phase: r.t * 14, stride: 0.6, strike: dangDi ? undefined : don, time: t });
        if (k >= 1) {
          v.ra = undefined;
          o.position.copy(v.nha);
        }
        continue;
      }
      o.position.copy(v.nha);
      if (v.rung > 0) {
        v.rung -= dt;
        o.position.x += Math.sin(this.time * 70) * 0.07 * (v.nha.x < 0 ? -1 : 1);
      }
      o.rotation.y = v.huong;
      const thang = this.kq && ((this.kq === 'thang') === v.nha.x < 0);
      if (thang) {
        v.thang = Math.min(1, v.thang + dt * 1.5);
        v.pose?.({ act: 'stand', win: v.thang, time: t });
      } else v.pose?.({ act: 'stand', time: t });
    }
    this.hu.update(dt);
  }

  dispose(): void {
    for (const v of this.nguoi.values()) this.go(v.obj);
    for (const o of this.chau) this.go(o);
    this.hu.clear();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && !(o instanceof THREE.SkinnedMesh)) o.geometry.dispose();
    });
  }
}
