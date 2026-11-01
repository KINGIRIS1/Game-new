// Camera isometric nhìn chéo từ trên xuống: một ngón kéo để di chuyển, hai ngón chụm để phóng to,
// hai ngón vặn theo vòng tròn (hay nút ⟳) để xoay cảnh theo nấc 90°: có 4 hướng nhìn chéo.

import * as THREE from 'three';

const AZIMUTH = Math.PI / 4;
const ELEVATION = THREE.MathUtils.degToRad(38);
const DISTANCE = 70;
/** Thu nhỏ được tới mức thấy gần trọn kinh đô 34×34 ô trên màn hình dọc. */
const MIN_ZOOM = 0.42;
const MAX_ZOOM = 3;
const TAP_SLOP_PX = 10;
const TAP_MAX_MS = 600;
/** Xoay cảnh: mỗi nấc 90°, chuyển mượt trong chừng này giây. */
const TURN_S = 0.35;
/** Hai ngón vặn quá góc này (radian, khoảng 35°) thì xoay một nấc. */
const TWIST_SNAP = THREE.MathUtils.degToRad(35);

export class IsoCamera {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 200);
  readonly target = new THREE.Vector3();
  zoom = 1;
  /** Giới hạn di chuyển của tâm nhìn trên mặt đất. */
  bounds = { min: -21, max: 21 };
  onTap?: (clientX: number, clientY: number) => void;

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
    this.target.x = THREE.MathUtils.clamp(this.target.x, this.bounds.min, this.bounds.max);
    this.target.z = THREE.MathUtils.clamp(this.target.z, this.bounds.min, this.bounds.max);
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
    const base = this.baseHeight();
    this.zoom = Math.min((base * this.width) / this.height / w, base / h);
    this.apply();
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
        this.onUserMove?.();
        this.pan(prev.x, prev.y, e.clientX, e.clientY);
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
    const quick = e.timeStamp - this.gesture.startTime < TAP_MAX_MS;
    if (wasSingle && quick && this.gesture.moved <= TAP_SLOP_PX) this.onTap?.(e.clientX, e.clientY);
  };

  private onCancel = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
  };

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
