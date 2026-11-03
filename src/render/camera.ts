// Camera isometric nhìn chéo từ trên xuống: một ngón kéo để di chuyển, hai ngón chụm để phóng to,
// hai ngón vặn theo vòng tròn (hay nút ⟳) để xoay cảnh theo nấc 90°: có 4 hướng nhìn chéo.
// Chế độ vẽ (`drawMode`, lúc trải đường): một ngón kéo để vẽ dải ô (`onDraw`), hai ngón vẫn kéo, phóng, xoay cảnh.

import * as THREE from 'three';

const AZIMUTH = Math.PI / 4;
const ELEVATION = THREE.MathUtils.degToRad(38);
const DISTANCE = 70;
/** Thu nhỏ hết cỡ thì thấy trọn kinh đô 45×45 ở khổ điện thoại dọc. */
const MIN_ZOOM = 0.28;
const MAX_ZOOM = 3;
const TAP_SLOP_PX = 10;
const TAP_MAX_MS = 600;
/** Xoay cảnh: mỗi nấc 90°, chuyển mượt trong chừng này giây. */
const TURN_S = 0.35;
/** Hai ngón vặn quá góc này (radian, khoảng 35°) thì xoay một nấc. */
const TWIST_SNAP = THREE.MathUtils.degToRad(35);

/** Giới hạn tâm nhìn: vuông `min`..`max` theo cả x, z; `sea` nới ra biển phía đông. */
export interface CamBounds {
  min: number;
  max: number;
  sea?: { maxX: number; minZ: number; maxZ: number };
}

export class IsoCamera {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 400);
  readonly target = new THREE.Vector3();
  /** Mặc định thấy chừng 20 ô bề ngang: công trình to (móng 3×3 tới 5×5) vẫn rõ dáng. */
  zoom = 0.72;
  /**
   * Giới hạn di chuyển của tâm nhìn trên mặt đất (World đặt theo vùng đất đã khai phá). `sea`: từ Điện 8 kéo được ra
   * biển phía đông tới `maxX`; càng ra xa vùng đất thì càng kéo được rộng lên bắc, xuống nam (`minZ`, `maxZ`) để thấy
   * hai quần đảo.
   */
  bounds: CamBounds = { min: -27, max: 27 };
  onTap?: (clientX: number, clientY: number) => void;
  /** Chế độ vẽ: một ngón kéo thì gọi `onDraw` thay vì kéo cảnh. */
  drawMode = false;
  /**
   * Kéo một ngón ở chế độ vẽ: từ chỗ đặt ngón (from) tới chỗ ngón đang ở (to). `move` mỗi lần ngón dịch, `end` khi
   * nhấc ngón, `cancel` khi đặt thêm ngón thứ hai (chuyển sang kéo, phóng cảnh) hay cử chỉ bị hủy.
   */
  onDraw?: (phase: 'move' | 'end' | 'cancel', fromX: number, fromY: number, toX: number, toY: number) => void;
  /** Đang vẽ dở bằng một ngón. */
  private drawing = false;

  private width = 1;
  private height = 1;
  private readonly offset = new THREE.Vector3();
  /** Góc phương vị đang nhìn (radian), và hướng nhìn đích theo nấc 90° (0–3). */
  private azimuth = AZIMUTH;
  private quarter = 0;
  /** Đang xoay dở: từ góc nào tới góc nào, đã được bao lâu. */
  private turn: { from: number; to: number; t: number } | null = null;
  /** Góc giữa hai ngón lúc trước, và phần vặn đã cộng dồn chưa đủ một nấc. */
  private twist = { angle: 0, acc: 0 };
  private readonly raycaster = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private gesture = { startX: 0, startY: 0, startTime: 0, moved: 0, multi: false };

  constructor(private readonly element: HTMLElement) {
    element.addEventListener('pointerdown', this.onDown);
    element.addEventListener('pointermove', this.onMove);
    element.addEventListener('pointerup', this.onUp);
    element.addEventListener('pointercancel', this.onCancel);
    element.addEventListener('wheel', this.onWheel, { passive: false });
  }

  setSize(width: number, height: number): void {
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
    this.apply();
  }

  /** Chiều cao khung nhìn (đơn vị thế giới) ở zoom 1: luôn thấy được khoảng 19 ô bề ngang. */
  private baseHeight(): number {
    const aspect = this.width / this.height;
    return Math.max(20, 19 / aspect);
  }

  apply(): void {
    this.zoom = THREE.MathUtils.clamp(this.zoom, MIN_ZOOM, MAX_ZOOM);
    const b = this.bounds;
    this.target.x = THREE.MathUtils.clamp(this.target.x, b.min, b.sea ? Math.max(b.max, b.sea.maxX) : b.max);
    let zMin = b.min;
    let zMax = b.max;
    if (b.sea && this.target.x > b.max) {
      // Ra khỏi vùng đất về phía biển: nới dần giới hạn bắc nam trong chừng 10 ô, khỏi giật khi kéo về.
      const k = Math.min(1, (this.target.x - b.max) / 10);
      zMin = THREE.MathUtils.lerp(b.min, Math.min(b.min, b.sea.minZ), k);
      zMax = THREE.MathUtils.lerp(b.max, Math.max(b.max, b.sea.maxZ), k);
    }
    this.target.z = THREE.MathUtils.clamp(this.target.z, zMin, zMax);
    const h = this.baseHeight() / this.zoom;
    const w = h * (this.width / this.height);
    const cam = this.camera;
    cam.left = -w / 2;
    cam.right = w / 2;
    cam.top = h / 2;
    cam.bottom = -h / 2;
    this.offset
      .set(Math.cos(ELEVATION) * Math.sin(this.azimuth), Math.sin(ELEVATION), Math.cos(ELEVATION) * Math.cos(this.azimuth))
      .multiplyScalar(DISTANCE);
    cam.position.copy(this.target).add(this.offset);
    cam.lookAt(this.target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  /** Hướng nhìn hiện tại theo nấc 90°: 0 là hướng mặc định (nhìn từ phía đông nam), 1–3 là xoay thêm từng nấc. */
  get facing(): number {
    return this.quarter;
  }

  /**
   * Xoay cảnh một nấc 90° quanh tâm nhìn, giữ nguyên tâm và độ phóng. `dir` 1: cảnh quay theo chiều kim đồng hồ
   * trên màn hình (nút ⟳), −1: ngược chiều. Chuyển mượt, xem `tick`.
   */
  rotate(dir: 1 | -1): void {
    this.quarter = (this.quarter + dir + 4) % 4;
    const from = this.azimuth;
    // Góc phương vị tăng thì cảnh quay theo chiều kim đồng hồ trên màn hình.
    const to = (this.turn ? this.turn.to : this.azimuth) + dir * (Math.PI / 2);
    this.turn = { from, to, t: 0 };
  }

  /** Đặt ngay hướng nhìn (0–3), không chuyển mượt. */
  setFacing(quarter: number): void {
    this.quarter = ((quarter % 4) + 4) % 4;
    this.azimuth = AZIMUTH + this.quarter * (Math.PI / 2);
    this.turn = null;
    this.apply();
  }

  /** Chạy chuyển động xoay cảnh; gọi mỗi khung hình. */
  tick(dt: number): void {
    if (!this.turn) return;
    const tr = this.turn;
    tr.t = Math.min(TURN_S, tr.t + dt);
    const k = tr.t / TURN_S;
    const ease = k * k * (3 - 2 * k);
    this.azimuth = tr.from + (tr.to - tr.from) * ease;
    if (tr.t >= TURN_S) {
      // Giữ góc gọn trong một vòng để khỏi trôi số sau nhiều lần xoay.
      this.azimuth = AZIMUTH + this.quarter * (Math.PI / 2);
      this.turn = null;
    }
    this.apply();
  }

  /** Phóng sao cho một vùng rộng `w`, cao `h` (đơn vị thế giới trên màn hình) vừa khít khung nhìn. */
  zoomToFit(w: number, h: number): void {
    this.zoom = this.fitZoom(w, h);
    this.apply();
  }

  /** Độ phóng để thấy vừa khung rộng `w`, cao `h` (đơn vị ô), chưa áp vào camera. */
  fitZoom(w: number, h: number): number {
    const base = this.baseHeight();
    return Math.min((base * this.width) / this.height / w, base / h);
  }

  /** Điểm trên mặt đất (y = 0) nằm dưới vị trí màn hình. */
  groundPoint(clientX: number, clientY: number, out = new THREE.Vector3()): THREE.Vector3 | null {
    this.setRay(clientX, clientY);
    return this.raycaster.ray.intersectPlane(this.ground, out);
  }

  setRay(clientX: number, clientY: number): THREE.Raycaster {
    const rect = this.element.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster;
  }

  private pan(fromX: number, fromY: number, toX: number, toY: number): void {
    const a = this.groundPoint(fromX, fromY);
    const b = this.groundPoint(toX, toY);
    if (!a || !b) return;
    this.target.add(a.sub(b));
    this.apply();
  }

  /** Gọi khi người chơi tự kéo camera, để hủy các chuyển động camera tự động. */
  onUserMove?: () => void;

  private onDown = (e: PointerEvent): void => {
    this.element.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      // Lấy giờ của chính sự kiện, không phải giờ hàm chạy: một khung hình vẽ chậm không được nuốt mất cú chạm.
      this.gesture = { startX: e.clientX, startY: e.clientY, startTime: e.timeStamp, moved: 0, multi: false };
    } else {
      this.gesture.multi = true;
      this.stopDrawing();
      const [a, b] = [...this.pointers.values()];
      this.twist = { angle: Math.atan2(b.y - a.y, b.x - a.x), acc: 0 };
    }
  };

  private onMove = (e: PointerEvent): void => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    if (this.pointers.size === 1) {
      this.gesture.moved = Math.max(this.gesture.moved, Math.hypot(e.clientX - this.gesture.startX, e.clientY - this.gesture.startY));
      if (this.gesture.moved > TAP_SLOP_PX) {
        if (this.drawMode && !this.gesture.multi) {
          this.drawing = true;
          this.onDraw?.('move', this.gesture.startX, this.gesture.startY, e.clientX, e.clientY);
        } else if (!this.drawing) {
          this.onUserMove?.();
          this.pan(prev.x, prev.y, e.clientX, e.clientY);
        }
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }
    // Hai ngón: phóng to theo khoảng cách, di chuyển theo trung điểm.
    const others = [...this.pointers.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p);
    const other = others[0];
    const beforeDist = Math.hypot(prev.x - other.x, prev.y - other.y);
    const afterDist = Math.hypot(e.clientX - other.x, e.clientY - other.y);
    const midBefore = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 };
    const midAfter = { x: (e.clientX + other.x) / 2, y: (e.clientY + other.y) / 2 };
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.onUserMove?.();
    if (beforeDist > 0) this.zoomAt(afterDist / beforeDist, midAfter.x, midAfter.y);
    this.pan(midBefore.x, midBefore.y, midAfter.x, midAfter.y);
    // Vặn hai ngón: cộng dồn góc quay của đoạn nối hai ngón; đủ một ngưỡng thì xoay cảnh một nấc theo chiều vặn.
    const [a, b] = [...this.pointers.values()];
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    let delta = angle - this.twist.angle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    this.twist.angle = angle;
    this.twist.acc += delta;
    if (Math.abs(this.twist.acc) >= TWIST_SNAP) {
      // Trục y màn hình chĩa xuống: góc tăng là vặn theo chiều kim đồng hồ.
      this.rotate(this.twist.acc > 0 ? 1 : -1);
      this.twist.acc = 0;
    }
  };

  private onUp = (e: PointerEvent): void => {
    const wasSingle = this.pointers.size === 1 && !this.gesture.multi;
    this.pointers.delete(e.pointerId);
    if (this.drawing) {
      this.drawing = false;
      if (wasSingle) this.onDraw?.('end', this.gesture.startX, this.gesture.startY, e.clientX, e.clientY);
      else this.onDraw?.('cancel', 0, 0, 0, 0);
      return;
    }
    const quick = e.timeStamp - this.gesture.startTime < TAP_MAX_MS;
    if (wasSingle && quick && this.gesture.moved <= TAP_SLOP_PX) this.onTap?.(e.clientX, e.clientY);
  };

  private onCancel = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    this.stopDrawing();
  };

  /** Bỏ dải đang vẽ dở (thêm ngón thứ hai, cử chỉ bị hủy, hay tắt chế độ vẽ). */
  stopDrawing(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.onDraw?.('cancel', 0, 0, 0, 0);
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  };

  /** Phóng to nhưng giữ nguyên điểm đất dưới vị trí (x, y). */
  private zoomAt(factor: number, clientX: number, clientY: number): void {
    const before = this.groundPoint(clientX, clientY);
    this.zoom *= factor;
    this.apply();
    const after = this.groundPoint(clientX, clientY);
    if (before && after) {
      this.target.add(before.sub(after));
      this.apply();
    }
  }
}

/** Màn hình vào game: phóng gần hơn chỗ nhìn ban đầu chừng này lần. */
const TITLE_ZOOM = 1.18;
/** Camera trôi một vòng bầu dục quanh chỗ nhìn ban đầu, lệch tối đa chừng này ô theo mỗi trục. */
const TITLE_SWAY = { x: 2.4, z: 1.6 };
/** Vào game thì lướt về chỗ nhìn ban đầu trong chừng này giây. */
const TITLE_BACK_S = 0.7;

/**
 * Camera của màn hình vào game: trôi chậm quanh chỗ nhìn ban đầu cho kinh đô phía sau có hồn; vào game thì lướt về
 * đúng chỗ nhìn ban đầu và độ phóng cũ.
 */
export class TitleDrift {
  private home: { x: number; z: number; zoom: number } | null = null;
  private t = 0;
  /** Đang lướt về: từ chỗ nào, đã được bao lâu; xong thì `done`. */
  private back: { x: number; z: number; zoom: number; t: number } | null = null;
  done = false;

  constructor(private readonly view: IsoCamera) {}

  /** Ghi lại chỗ nhìn hiện tại làm chỗ nhìn ban đầu (gọi sau khi World đã đặt tâm nhìn theo vùng đất). */
  start(): void {
    const v = this.view;
    this.home = { x: v.target.x, z: v.target.z, zoom: v.zoom };
    this.t = 0;
    this.done = false;
    this.place();
  }

  /** Thôi trôi, lướt về chỗ nhìn ban đầu. */
  release(): void {
    if (!this.home || this.back || this.done) return;
    const v = this.view;
    this.back = { x: v.target.x, z: v.target.z, zoom: v.zoom, t: 0 };
  }

  update(dt: number): void {
    if (!this.home || this.done) return;
    if (!this.back) {
      this.t += dt;
      this.place();
      return;
    }
    const b = this.back;
    b.t = Math.min(TITLE_BACK_S, b.t + dt);
    const k = b.t / TITLE_BACK_S;
    const e = k * k * (3 - 2 * k);
    const v = this.view;
    v.target.x = b.x + (this.home.x - b.x) * e;
    v.target.z = b.z + (this.home.z - b.z) * e;
    v.zoom = b.zoom + (this.home.zoom - b.zoom) * e;
    v.apply();
    if (b.t >= TITLE_BACK_S) this.done = true;
  }

  private place(): void {
    const h = this.home!;
    const v = this.view;
    // Hai nhịp lệch nhau để đường trôi không lặp lại quá đều.
    v.target.x = h.x + TITLE_SWAY.x * Math.sin(this.t * 0.11);
    v.target.z = h.z + TITLE_SWAY.z * Math.sin(this.t * 0.07 + 1.3);
    v.zoom = h.zoom * (TITLE_ZOOM + 0.04 * Math.sin(this.t * 0.05));
    v.apply();
  }
}
