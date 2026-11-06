// Giao diện thời gian xây: tên việc, khối tiến độ trong bảng công trình, bảng Thợ hồ, và đếm ngược thay tại chỗ
// (`fillXay`) để bảng không phải dựng lại mỗi giây.

import { BUILDINGS, QUIZ_TURNS } from '../game/defs';
import { findBuilding, type Building, type GameState } from '../game/game';
import {
  conLai,
  conLaiCua,
  danhSachTho,
  itemProgress,
  jobOf,
  pendingBuilding,
  soTho,
  thoRanh,
  thoRanhSau,
  tienDo,
  viecOf,
  type CongViec,
  type PhanViec,
} from '../game/xay';
import { CAU_DO, THOI_KY, cauDo } from '../text/cauDo';
import { formatClock, vi } from '../text/vi';
import { buildingName } from './format';

/** Công trình của phần việc: chờ dựng, hay đã dựng (đang nâng, đang đổi loại). */
function partBuilding(state: GameState, p: PhanViec): Building | undefined {
  return p.moi ?? findBuilding(state, p.id);
}

/** Tên một phần việc: công trình sẽ có khi xong. */
function partName(state: GameState, p: PhanViec): string {
  const b = partBuilding(state, p);
  if (p.doi) return vi.buildings[p.doi].name;
  if (!b) return '';
  if (p.len) return `${buildingName({ type: b.type, level: b.level + 1 })} ${vi.ui.levelShort(b.level + 1)}`;
  return buildingName(b);
}

/** Loại công trình của phần việc khi xong. */
function partType(state: GameState, p: PhanViec): string {
  return p.doi ?? partBuilding(state, p)?.type ?? '';
}

/** Tên việc: một công trình, hay `n` ô tường cùng loại, hay nhiều phần (áp mẫu kinh đô). */
export function jobName(state: GameState, v: CongViec): string {
  if (v.o.length === 1) return partName(state, v.o[0]);
  const t = partType(state, v.o[0]);
  if (v.o.every((p) => partType(state, p) === t)) return vi.ui.jobWalls(v.o.length, partName(state, v.o[0]));
  return vi.ui.jobMany(v.o.length);
}

/** Câu báo khi việc xong hết (toast). */
export function jobDoneText(state: GameState, v: CongViec): string {
  if (v.o.length === 1) {
    const p = v.o[0];
    const b = findBuilding(state, p.id);
    if (p.len && b) return b.type === 'dien' ? vi.ui.dienUp(b.level) : vi.ui.nangDone(buildingName(b), b.level);
    return vi.ui.xayDone(b ? buildingName(b) : partName(state, p));
  }
  const t = partType(state, v.o[0]);
  if (v.o.every((p) => partType(state, p) === t)) {
    const b = findBuilding(state, v.o[0].id);
    return vi.ui.wallDone(v.o.length, b ? buildingName(b) : '');
  }
  return vi.ui.mauXong;
}

/** Tên tốp thợ: tốp của Điện hay tốp của một nhà thợ hồ. */
function thoName(state: GameState, id: number): string {
  const b = findBuilding(state, id);
  if (b?.type === 'thoHo') return vi.ui.thoNha(b.level);
  return vi.ui.thoDien;
}

/**
 * Khối việc đang làm của công trình `id` trong bảng công trình: đang dựng hay đang nâng, thanh tiến độ, còn bao lâu,
 * tốp nào làm, nút hủy (bấm hai lần). Rỗng khi công trình không có việc. `armed`: id việc đang chờ bấm lần hai.
 */
export function jobHtml(state: GameState, id: number, armed: number | null): string {
  const v = jobOf(state, id);
  if (!v) return '';
  const p = v.o.find((o, i) => i >= v.xong && o.id === id)!;
  const b = partBuilding(state, p);
  const title = p.moi ? vi.ui.xayDung : p.doi ? vi.ui.xayDoi(vi.buildings[p.doi].name) : vi.ui.xayNang((b?.level ?? 0) + 1);
  const parts = v.o.length > 1 ? ` · ${vi.ui.xayParts(v.xong, v.o.length)}` : '';
  return `<div class="xay-job">
      <div class="xay-head"><b>🔨 ${title}</b><span>${vi.ui.xayLeft} <b data-con="${v.id}" data-item="${id}"></b></span></div>
      <div class="xay-bar"><i data-bar="${v.id}" data-item="${id}"></i></div>
      <div class="muted">${vi.ui.xayThoLabel}: ${thoName(state, v.tho)}${parts}</div>
      <div class="btn-pair">${quizButton(v)}${cancelButton(v, armed)}</div>
    </div>`;
}

/** Nút đố sử của việc `v`: còn mấy lượt, hay đang có câu chờ trả lời. */
function quizButton(v: CongViec): string {
  const left = quizLeft(v);
  const label = v.cau !== undefined ? vi.ui.quizPending : vi.ui.quizBtn(left);
  return `<button class="btn bronze small" data-act="askQuiz" data-id="${v.id}" ${left ? '' : 'disabled'}>${label}</button>`;
}

function cancelButton(v: CongViec, armed: number | null): string {
  return `<button class="btn ghost small" data-act="cancelJob" data-id="${v.id}">${armed === v.id ? vi.ui.cancelJobArm : vi.ui.cancelJob}</button>`;
}

/** Bảng công trình đang dựng mới (chưa vào kinh đô): lời tả, lời nhắc chưa làm gì, khối việc. */
export function pendingHtml(state: GameState, b: Building, armed: number | null): string {
  return `<div class="info"><p>${vi.buildings[b.type].desc}</p><p class="muted">${vi.ui.xayPending}</p>${jobHtml(state, b.id, armed)}</div>`;
}

/** Bảng Thợ hồ: các tốp thợ, việc mỗi tốp đang làm, còn bao lâu; chạm Xem để tới công trình. */
export function thoHtml(state: GameState, armed: number | null): string {
  const { ranh, tong } = soTho(state);
  const jobs = viecOf(state);
  const rows = danhSachTho(state).map((t) => {
    const v = jobs.find((j) => j.tho === t.id);
    const speed = t.toc !== 1 ? ` · ${vi.ui.thoSpeed(t.toc)}` : '';
    const head = `<div class="xay-head"><b>${thoName(state, t.id)}</b><span class="muted">${speed.slice(3)}</span></div>`;
    if (!v) return `<div class="xay-job idle">${head}<div class="muted">${vi.ui.thoIdle}</div></div>`;
    const target = v.o[Math.min(v.xong, v.o.length - 1)].id;
    const parts = v.o.length > 1 ? ` · ${vi.ui.xayParts(v.xong, v.o.length)}` : '';
    return `<div class="xay-job">${head}
        <div class="xay-head"><span>${jobName(state, v)}${parts}</span><span>${vi.ui.xayLeft} <b data-con="${v.id}"></b></span></div>
        <div class="xay-bar"><i data-bar="${v.id}"></i></div>
        <div class="btn-pair"><button class="btn small" data-act="selectBuilding" data-id="${target}">${vi.ui.thoGo}</button>${quizButton(v)}${cancelButton(v, armed)}</div>
      </div>`;
  });
  return `<div class="info"><div class="stat"><span>${vi.ui.thoCount(ranh, tong)}</span><span></span></div>
      ${rows.join('')}
      ${jobs.length ? '' : `<p class="muted">${vi.ui.thoNone}</p>`}
      <p class="muted">${vi.ui.thoMore}</p></div>`;
}

/** Đếm ngược và thanh tiến độ trong `root`: thay chữ, bề rộng tại chỗ theo state. */
export function fillXay(root: HTMLElement, state: GameState): void {
  const jobs = viecOf(state);
  if (!jobs.length) return;
  for (const el of root.querySelectorAll<HTMLElement>('[data-ranh]')) el.textContent = formatClock(thoRanhSau(state));
  const byId = new Map(jobs.map((v) => [v.id, v]));
  for (const el of root.querySelectorAll<HTMLElement>('[data-con]')) {
    const v = byId.get(Number(el.dataset.con));
    if (!v) continue;
    const item = el.dataset.item;
    el.textContent = formatClock(item ? conLaiCua(state, v, Number(item)) : conLai(state, v));
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-bar]')) {
    const v = byId.get(Number(el.dataset.bar));
    if (!v) continue;
    const item = el.dataset.item;
    const k = item ? (itemProgress(state, Number(item)) ?? 1) : tienDo(v);
    el.style.width = `${(k * 100).toFixed(1)}%`;
  }
}

/** Còn bao nhiêu lượt đố sử cho việc `v`. */
export const quizLeft = (v: CongViec): number => Math.max(0, QUIZ_TURNS - v.hoi);

/** Thời gian thật (ms) để làm `ms` công bằng tốp rảnh nhanh nhất (hết tốp rảnh thì tính tốc độ 1). */
export function realMs(state: GameState, ms: number): number {
  return ms / (thoRanh(state)?.toc ?? 1);
}

/** Công trình chờ dựng hay đã dựng có id `id`. */
export const anyBuilding = (state: GameState, id: number): Building | undefined => findBuilding(state, id) ?? pendingBuilding(state, id);

/** Điểm màn hình của một điểm trên cảnh: tọa độ ô (số thực) và độ cao trên mặt đất; null khi không thấy. */
export type Project = (x: number, z: number, lift: number) => { x: number; y: number } | null;

/** Nhãn ⏳ đếm giờ nổi trên chỗ mỗi tốp đang làm (công trình, hay ô tường đang đắp), theo camera mỗi khung. */
export class XayLabels {
  private readonly els = new Map<number, HTMLElement>();
  constructor(private readonly root: HTMLElement) {}

  update(state: GameState, project: Project): void {
    const seen = new Set<number>();
    // Chỗ các nhãn đã đặt trong khung này: nhãn sau trùng chỗ nhãn trước thì đẩy lên trên cho khỏi đè nhau.
    const placed: { x: number; y: number }[] = [];
    for (const v of viecOf(state)) {
      const p = v.o[Math.min(v.xong, v.o.length - 1)];
      const b = partBuilding(state, p);
      if (!b) continue;
      const def = BUILDINGS[b.type];
      // Cao hơn đỉnh giàn giáo một chút; ô tường thì ngay trên mặt tường.
      const lift = def.w > 1 ? Math.min(1.1 + 0.28 * Math.max(def.w, def.d), 3.4) + 0.5 : 1.3;
      const at = project(b.x + def.w / 2, b.z + def.d / 2, lift);
      let el = this.els.get(v.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'xay-label';
        this.root.appendChild(el);
        this.els.set(v.id, el);
      }
      seen.add(v.id);
      el.hidden = !at;
      if (!at) continue;
      // Giữ nhãn trong màn hình (công trình ở sát mép thì nhãn không bị cắt).
      const x = Math.min(Math.max(at.x, 34), window.innerWidth - 34);
      let y = at.y;
      for (let k = 0; k < 6 && placed.some((p) => Math.abs(p.x - x) < 64 && Math.abs(p.y - y) < 22); k++) y -= 22;
      placed.push({ x, y });
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      const text = `⏳ ${formatClock(conLai(state, v))}`;
      if (el.textContent !== text) el.textContent = text;
    }
    for (const [id, el] of this.els) {
      if (seen.has(id)) continue;
      el.remove();
      this.els.delete(id);
    }
  }
}

/**
 * Thứ tự bốn đáp án khi hỏi lượt `hoi` của việc `viec`: suy từ mã việc và lượt hỏi, nên đóng bảng mở lại (hay nạp lại
 * game) vẫn y như cũ. Số 0 là đáp án đúng, 1–3 là ba đáp án sai.
 */
export function thuTu(viec: number, hoi: number): number[] {
  const order = [0, 1, 2, 3];
  let h = (viec * 2246822519 + hoi * 3266489917 + 374761393) >>> 0;
  for (let i = order.length - 1; i > 0; i--) {
    h = (Math.imul(h ^ (h >>> 15), 2654435761) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Kết quả vừa trả lời, để tô đúng sai và hiện lời giảng. */
export interface QuizResult {
  /** Đáp án đã chọn (vị trí trên bảng). */
  pick: number;
  dung: boolean;
  /** Thời gian thật còn lại của việc sau khi trả lời; 0 là đã xong. */
  left: number;
  /** Lượt hỏi còn lại. */
  turns: number;
}

/**
 * Hộp thoại đố sử: Lạc hầu hỏi câu `cau` cho việc `viec` ở lượt `hoi` (0–2), bốn nút đáp án theo `thuTu`. Có `result`
 * thì tô đúng sai, hiện lời giảng, nút câu tiếp (còn lượt) và nút đóng.
 */
export function quizHtml(viec: number, cauId: number, hoi: number, result?: QuizResult): string {
  const c = cauDo(cauId) ?? CAU_DO[0];
  const answers = [c.dung, ...c.sai];
  const order = thuTu(viec, hoi);
  const opts = order
    .map((k, i) => {
      const tone = result ? (k === 0 ? 'right' : i === result.pick ? 'wrong' : '') : '';
      return `<button class="quiz-opt ${tone}" data-act="answerQuiz" data-id="${viec}" data-dung="${k === 0 ? 1 : 0}" data-i="${i}" ${result ? 'disabled' : ''}>
          <b>${'ABCD'[i]}</b><span>${answers[k]}</span></button>`;
    })
    .join('');
  let foot = `<p class="muted">${vi.ui.quizIntro}</p>`;
  if (result) {
    const line = result.dung ? (result.left > 0 ? vi.ui.quizRight(formatClock(result.left)) : vi.ui.quizDone) : vi.ui.quizWrong;
    const next = result.turns > 0 && result.left > 0 ? `<button class="btn bronze" data-act="askQuiz" data-id="${viec}">${vi.ui.quizNext(result.turns)}</button>` : '';
    foot = `<p class="quiz-verdict ${result.dung ? 'right' : 'wrong'}">${line}</p>
      <p class="quiz-giang">📜 ${c.giang}</p>
      <div class="btn-pair">${next}<button class="btn ghost" data-act="closeQuiz">${vi.ui.quizClose}</button></div>`;
  }
  return `<div class="modal quiz"><h2>${vi.ui.quizTitle}</h2>
      <p class="quiz-turn">${vi.ui.quizTurn(hoi + 1, THOI_KY[c.ky])}</p>
      <p class="quiz-q">${c.hoi}</p>
      <div class="quiz-opts">${opts}</div>
      ${foot}
      ${result ? '' : `<button class="close" data-act="closeQuiz" aria-label="${vi.ui.quizClose}">✕</button>`}</div>`;
}
