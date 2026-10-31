// Camera isometric nhìn chéo từ trên xuống: một ngón kéo để di chuyển, hai ngón chụm để phóng to.

import * as THREE from 'three';

const AZIMUTH = Math.PI / 4;
const ELEVATION = THREE.MathUtils.degToRad(38);
const DISTANCE = 70;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 3;
const TAP_SLOP_PX = 10;
const TAP_MAX_MS = 600;

export class IsoCamera {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 200);
  readonly target = new THREE.Vector3();
  zoom = 1;
  /** Giới hạn di chuyển của tâm nhìn trên mặt đất. */
  bounds = { min: -17, max: 17 };
  onTap?: (clientX: number, clientY: number) => void;

  private width = 1;
  private height = 1;
  private readonly offset = new THREE.Vector3(
    Math.cos(ELEVATION) * Math.sin(AZIMUTH),
    Math.sin(ELEVATION),
    Math.cos(ELEVATION) * Math.cos(AZIMUTH),
  ).multiplyScalar(DISTANCE);
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
    cam.position.copy(this.target).add(this.offset);
    cam.lookAt(this.target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
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
