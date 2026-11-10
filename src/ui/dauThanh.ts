// Bảng Đấu thành (mở bằng chip 🏯 trên đầu bản đồ phó bản), hai thẻ:
// - Đấu thật (có máy chủ): tham gia (đặt tên), hồ sơ, tìm đối thủ, chọn hướng và quân rồi đánh; trận gần đây; rời.
// - Đánh thử: chọn kinh đô của mình hay kinh đô máy, hướng tràn vào, quân mang theo; quân ngã không mất.
// Bảng kết quả sau trận, bảng Bị đánh khi mở game. Gọi máy chủ ở main.ts (src/mang/), bảng này chỉ dựng HTML.
// PR 6: bảng xếp hạng, nút Xem lại ở trận gần đây và bảng Bị đánh, bảng kết quả sau khi xem lại, khối Tài khoản
// (gắn Google, lưu game lên mây, đăng nhập Google ở máy mới rồi tải bản lưu về).

import { isScored } from '../game/battle';
import { BUILDINGS, DAU_THANH, RESOURCE_IDS, UNITS, UNIT_TYPES, type Resources, type UnitType } from '../game/defs';
import { armySpace, fieldCap, fitArmy, type Army } from '../game/doanhTrai';
import { botSnapshot, canPractice, decodeSnapshot, defenderState, lootCap, makeSnapshot, validateArmy, type PvpScore, type Snapshot } from '../game/dauThanh';
import { type BiDanh, type DaNhan, type KetQuaMay, type MayTom, type TranTom, type XepHang } from '../game/dauThat';
import { dienLevel, type GameState } from '../game/game';
import { chapterOf } from '../game/manVao';
import { heroesFor } from '../game/son';
import { coMayChu, taiKhoanMay, uidMay } from '../mang/cauHinh';
import { vi } from '../text/vi';
import { esc, fmt } from './format';
import { capitalMiniMap } from './mau';

/** Kinh đô để đánh thử: 0 là kinh đô của mình, số khác là kinh đô máy ở cấp Điện ấy. */
export type DauTarget = number;

/** Đối thủ máy chủ tìm cho (như `DoiThu` ở mang/mayChu.ts), kèm bản chụp đã đọc và bản đồ thu nhỏ. */
export interface DauFoe {
  id: string;
  may: boolean;
  ten: string | null;
  dien: number;
  chienCong: number;
  banChup: string;
  snap: Snapshot;
  map: string;
}

/** Phần Đấu thật của bảng: đang chờ máy chủ việc gì, lỗi vừa gặp, tên đang gõ, đối thủ, trận gần đây. */
export interface DauThat {
  busy: keyof typeof vi.dauThanh.busy | null;
  /** Lỗi vừa gặp (mã máy chủ, chi tiết). */
  loi: { ma: string; chiTiet?: string } | null;
  ten: string;
  foe: DauFoe | null;
  /** Đối thủ đã gặp lần tìm này (bấm Tìm khác thì máy chủ bỏ qua). */
  bo: string[];
  /** Trận gần đây (lần hỏi máy chủ gần nhất), mới trước; `atk` là trận mình đánh. */
  lich: DauLich[];
  /** Đã bấm Rời một lần (bấm lần nữa mới rời). */
  roiHoi: boolean;
  /** Bảng xếp hạng máy chủ vừa trả (bước `rank`). */
  hang: XepHang | null;
  /** Đã bấm Tải bản trên mây về một lần (bấm lần nữa mới thay bản lưu ở máy này). */
  taiHoi: boolean;
}

/**
 * Tài khoản và bản lưu trên mây (PR 6), giữ qua các lần mở bảng: máy chủ có bật đăng nhập Google không (null: chưa
 * hỏi), bản lưu trên mây của người đang đăng nhập (undefined: chưa hỏi, null: chưa có), máy khác đã lưu bản mới hơn
 * (`lech`: chờ người chơi chọn tải về hay ghi đè), lúc hỏi máy chủ gần nhất.
 */
export const dauTaiKhoan: { coGoogle: boolean | null; may: MayTom | null | undefined; lech: boolean; hoiLuc: number; loiGoogle: string | null } = {
  coGoogle: null,
  may: undefined,
  lech: false,
  hoiLuc: 0,
  // Lỗi lần qua trang Google vừa rồi (mã Supabase Auth trả), để khối Tài khoản còn ghi sau khi dòng báo đã tắt.
  loiGoogle: null,
};

/** Chữ cho lỗi lần qua trang Google vừa rồi. */
export const googleError = (ma: string): string => vi.dauThanh.googleErr[ma] ?? vi.dauThanh.googleErr.khac;

export interface DauLich {
  atk: boolean;
  t: TranTom;
}

/** Trận gần đây từ hồ sơ máy chủ trả: trận mình đánh và trận mình bị đánh, mới trước. */
export const lichOf = (biDanh: TranTom[], daDanh: TranTom[]): DauLich[] =>
  [...daDanh.map((t) => ({ atk: true, t })), ...biDanh.map((t) => ({ atk: false, t }))].sort((a, b) => b.t.batDau - a.t.batDau);

/** Bảng Đấu thành đang mở: thẻ, kinh đô chọn đánh thử (và bản chụp của nó), hướng tràn vào, quân mang theo, bước. */
export interface DauView {
  mode: 'that' | 'thu';
  /** `rank`: bảng xếp hạng (thẻ Đấu thật). */
  step: 'target' | 'army' | 'rank';
  target: DauTarget;
  snap: Snapshot;
  /** Bản đồ thu nhỏ của kinh đô chọn đánh thử (ảnh dựng một lần mỗi lần chọn). */
  map: string;
  side: 'bac' | 'tay';
  army: Army;
  that: DauThat;
  /** Bản đồ thu nhỏ kinh đô của mình (thẻ Đấu thật khi chưa có đối thủ: người khác sẽ thấy kinh đô này). */
  ownMap?: string;
}

/** Bản chụp của kinh đô `target` (kinh đô máy dựng một lần mỗi cấp Điện). */
const bots = new Map<number, Snapshot>();
export function targetSnapshot(state: GameState, target: DauTarget): Snapshot {
  if (!target) return makeSnapshot(state);
  let snap = bots.get(target);
  if (!snap) {
    snap = botSnapshot(target);
    bots.set(target, snap);
  }
  return snap;
}

/** Các kinh đô đánh thử được: kinh đô của mình, kinh đô máy kém một cấp, cùng cấp, hơn một cấp Điện (từ Điện 5). */
export function dauTargets(state: GameState): DauTarget[] {
  const d = dienLevel(state);
  const bots = [d - 1, d, d + 1].filter((n) => n >= DAU_THANH.unlockDien && n <= BUILDINGS.dien.maxLevel);
  return [0, ...bots];
}

/** Đã tham gia Đấu thật ở máy này: bản lưu có phần Đấu thành và đúng người đang đăng nhập ở máy này. */
export function dauJoined(state: GameState): boolean {
  return !!state.dauThanh && state.dauThanh.uid === uidMay();
}

/** Mở bảng Đấu thành: có máy chủ thì thẻ Đấu thật, không thì Đánh thử (kinh đô máy cùng cấp, phía bắc). */
export function newDauView(state: GameState): DauView {
  const targets = dauTargets(state);
  const target = targets.includes(dienLevel(state)) ? dienLevel(state) : 0;
  return {
    mode: coMayChu() ? 'that' : 'thu',
    step: 'target',
    side: 'bac',
    army: fitArmy({ ...state.troops }, fieldCap(state)),
    that: { busy: null, loi: null, ten: state.dauThanh?.ten ?? '', foe: null, bo: [], lich: [], roiHoi: false, hang: null, taiHoi: false },
    ...pickTarget(state, target),
  };
}

/** Chọn kinh đô để đánh: bản chụp và bản đồ thu nhỏ. */
export function pickTarget(state: GameState, target: DauTarget): Pick<DauView, 'target' | 'snap' | 'map'> {
  const snap = targetSnapshot(state, target);
  return { target, snap, map: capitalMiniMap(defenderState(snap)) };
}

/** Đối thủ máy chủ trả: đọc bản chụp, dựng bản đồ thu nhỏ. Mã hỏng thì null. */
export function foeOf(d: Omit<DauFoe, 'snap' | 'map'>): DauFoe | null {
  const snap = decodeSnapshot(d.banChup);
  return snap ? { ...d, snap, map: capitalMiniMap(defenderState(snap)) } : null;
}

/** Thêm bớt một lính mang theo, không quá số có và số chỗ một trận. */
export function stepDauArmy(state: GameState, view: DauView, k: (typeof UNIT_TYPES)[number], delta: number): void {
  const n = Math.max(0, Math.min(state.troops[k], view.army[k] + delta));
  const next = { ...view.army, [k]: n };
  if (delta > 0 && armySpace(next) > fieldCap(state)) return;
  view.army[k] = n;
}

const DEFENSES = new Set(['choiCanh', 'lauNo', 'congThanh']);

function targetInfo(snap: Snapshot): string {
  const guards = snap.guards.reduce((n, g) => n + g.n, 0);
  const towers = snap.buildings.filter((b) => DEFENSES.has(b.type) || b.uNo).length;
  return vi.dauThanh.info(snap.dien, guards, towers);
}

const resHtml = (res: Partial<Resources>): string =>
  RESOURCE_IDS.filter((r) => (res[r] ?? 0) > 0)
    .map((r) => `${vi.resources[r].icon} ${fmt(res[r]!)}`)
    .join(' ') || vi.ui.raidNone;

const armyLine = (army: Partial<Record<UnitType, number>>): string =>
  UNIT_TYPES.filter((k) => (army[k] ?? 0) > 0)
    .map((k) => `${vi.units[k].icon} ${army[k]}`)
    .join(' ') || vi.ui.raidNone;

function lootHtml(snap: Snapshot): string {
  return resHtml(lootCap(snap));
}

/** Tên đối thủ để ghi (kinh đô máy thì theo cấp Điện). */
export const foeName = (foe: Pick<DauFoe, 'may' | 'ten' | 'dien'>): string => (foe.may || !foe.ten ? vi.dauThanh.foeBot(foe.dien) : foe.ten);

/** Chữ lỗi máy chủ cho người chơi. */
export function dauError(loi: { ma: string; chiTiet?: string }): string {
  const e = vi.dauThanh.errors;
  if (loi.ma === 'ten') return vi.dauThanh.nameErr[loi.chiTiet as keyof typeof vi.dauThanh.nameErr] ?? e.khac;
  const text = e[loi.ma] ?? `${e.khac} (${loi.ma})`;
  return loi.chiTiet && (loi.ma === 'banChup' || loi.ma === 'quan') ? `${text}: ${loi.chiTiet}.` : text;
}

/** Bản đồ bên trái bảng: kinh đô chọn đánh, thu nhỏ. */
export function dauMapHtml(state: GameState, view: DauView): string {
  let src = view.map;
  if (view.mode === 'that') src = view.that.foe?.map ?? (view.ownMap ??= capitalMiniMap(defenderState(makeSnapshot(state))));
  return `<img class="dau-map" src="${src}" alt="${vi.dauThanh.title}">`;
}

const modeTabs = (view: DauView): string =>
  coMayChu()
    ? `<div class="dau-modes">${(['that', 'thu'] as const)
        .map((m) => `<button class="btn small ${m === view.mode ? 'bronze' : 'ghost'}" data-act="dauMode" data-mode="${m}" aria-pressed="${m === view.mode}">${vi.dauThanh.modes[m]}</button>`)
        .join('')}</div>`
    : '';

const sidesHtml = (view: DauView): string =>
  (['bac', 'tay'] as const)
    .map((s) => `<button class="btn small ${s === view.side ? 'bronze' : 'ghost'}" data-act="dauSide" data-side="${s}">${vi.dauThanh.sides[s]}</button>`)
    .join(' ');

/** Nút Xem lại của một trận (chỉ khi máy chủ còn đánh lại được trận ấy bằng bản luật đang chạy). */
const replayBtn = (t: TranTom, off = ''): string =>
  t.xemLai ? `<button class="btn small ghost dau-replay" data-act="dauReplay" data-tran="${esc(t.id)}" ${off}>${vi.dauThanh.replay}</button>` : '';

/** Một dòng trận gần đây. */
function lichRow({ atk, t }: DauLich, off: string): string {
  const who = atk ? vi.dauThanh.histAtk(t.may ? vi.dauThanh.histBot : esc(t.tenGiu)) : vi.dauThanh.histDef(esc(t.tenDanh));
  const k = t.ketQua;
  const score = t.xong && k ? vi.dauThanh.histScore(k.sao, Math.floor(k.pct * 100)) : vi.dauThanh.histOpen;
  const cups = t.xong && k ? ` · ${vi.dauThanh.attackedCups(atk ? k.chienCong.atk : k.chienCong.def)}` : '';
  return `<li><span><b>${who}</b><small>${score}${cups}</small></span>${replayBtn(t, off)}</li>`;
}

/** Giờ, ngày của một mốc thời gian máy chủ (lúc lưu lên mây). */
const lucHtml = (ms: number): string => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())} ngày ${d.getDate()}/${d.getMonth() + 1}`;
};

/** Dòng bản lưu trên mây (chưa hỏi máy chủ thì không ghi gì). */
const cloudLine = (): string => {
  const m = dauTaiKhoan.may;
  return m === undefined ? '' : `<p class="muted">${m ? vi.dauThanh.cloudAt(m.dien, lucHtml(m.luc)) : vi.dauThanh.cloudNone}</p>`;
};

/** Nút tải bản lưu trên mây về máy này (bấm hai lần). */
const loadBtn = (t: DauThat, off: string): string =>
  `${t.taiHoi ? `<p class="why">${vi.dauThanh.cloudLoadConfirm}</p>` : ''}<button class="btn small ${t.taiHoi ? '' : 'ghost'}" data-act="dauLoad" ${off}>${vi.dauThanh.cloudLoad}</button>`;

/**
 * Khối Tài khoản của thẻ Đấu thật. Đã tham gia: gắn Google, rồi lưu lên mây (máy khác lưu bản mới hơn thì chọn tải về
 * hay ghi đè). Chưa tham gia: đăng nhập Google để lấy lại kinh đô đã chơi ở máy khác. Máy chủ chưa bật Google thì
 * không hiện gì.
 */
function accountHtml(t: DauThat, joined: boolean, off: string): string {
  const tk = taiKhoanMay();
  const a = dauTaiKhoan;
  if (joined) {
    if (!tk?.google) {
      if (!a.coGoogle) return '';
      const loi = a.loiGoogle ? `<p class="why">${esc(googleError(a.loiGoogle))}</p>` : '';
      return `<div class="hero-pick dau-account"><h4>${vi.dauThanh.accountTitle}</h4><p class="muted">${vi.dauThanh.googleIntro}</p>${loi}
        <div class="actions"><button class="btn small" data-act="dauGoogle" ${off}>${vi.dauThanh.googleLink}</button></div></div>`;
    }
    const body = a.lech
      ? `<p class="why">${vi.dauThanh.cloudDiff}</p>${cloudLine()}
        <div class="actions">${loadBtn(t, off)}<button class="btn small ghost" data-act="dauSave" data-de="1" ${off}>${vi.dauThanh.cloudOverwrite}</button></div>`
      : `${cloudLine()}<p class="muted">${vi.dauThanh.cloudAuto}</p>
        <div class="actions"><button class="btn small" data-act="dauSave" ${off}>${vi.dauThanh.cloudSave}</button></div>`;
    return `<div class="hero-pick dau-account"><h4>${vi.dauThanh.accountTitle}</h4><p class="muted">${esc(vi.dauThanh.googleLinked(tk.email))}</p>${body}</div>`;
  }
  if (tk?.google) {
    const has = a.may ? `${cloudLine()}<div class="actions">${loadBtn(t, off)}</div>` : a.may === null ? `<p class="muted">${vi.dauThanh.googleInNone}</p>` : '';
    return `<div class="hero-pick dau-account"><h4>${vi.dauThanh.accountTitle}</h4><p class="muted">${esc(vi.dauThanh.googleInAs(tk.email))}</p>${has}</div>`;
  }
  if (!a.coGoogle) return '';
  return `<div class="hero-pick dau-account"><h4>${vi.dauThanh.googleInTitle}</h4><p class="muted">${vi.dauThanh.googleInIntro}</p>
    <div class="actions"><button class="btn small ghost" data-act="dauGoogleIn" ${off}>${vi.dauThanh.googleIn}</button></div></div>`;
}

/**
 * Mục Bản lưu trên mây ở bảng Cài đặt, cho máy chưa tham gia Đấu thành ở đây: game mới chưa có doanh trại thì chưa mở
 * được bảng Đấu thành, vẫn phải đăng nhập Google và tải bản lưu về được. Đã tham gia ở máy này thì mọi thứ ở bảng Đấu
 * thành; máy chủ chưa bật Google thì không hiện gì. `armed`: đã bấm Tải về một lần.
 */
export function cloudSettingsHtml(state: GameState, armed: boolean): string {
  if (!coMayChu() || dauJoined(state)) return '';
  const tk = taiKhoanMay();
  const a = dauTaiKhoan;
  let body: string;
  if (tk?.google) {
    const load = `${armed ? `<p class="why">${vi.dauThanh.cloudLoadConfirm}</p>` : ''}<button class="btn small ${armed ? '' : 'ghost'}" data-act="mayLoad">${vi.dauThanh.cloudLoad}</button>`;
    body = `<p class="muted">${esc(vi.dauThanh.googleInAs(tk.email))}</p>${a.may ? `${cloudLine()}${load}` : a.may === null ? `<p class="muted">${vi.dauThanh.googleInNone}</p>` : ''}`;
  } else if (a.coGoogle) {
    body = `<p class="muted">${vi.dauThanh.googleInIntro}</p><button class="btn small ghost" data-act="mayGoogleIn">${vi.dauThanh.googleIn}</button>`;
  } else return '';
  return `<h3 class="setting-title">${vi.dauThanh.cloudSettingsTitle}</h3>${body}`;
}

/** Bảng xếp hạng (bước `rank` của thẻ Đấu thật). */
function rankHtml(view: DauView): string {
  const t = view.that;
  const busy = t.busy ? `<p class="muted dau-busy">⏳ ${vi.dauThanh.busy[t.busy]}</p>` : '';
  const err = t.loi ? `<p class="why">${esc(dauError(t.loi))}</p>` : '';
  const h = t.hang;
  const rows = h
    ? h.bang
        .map(
          (r) =>
            `<li class="${r.toi ? 'me' : ''}"><i>${r.hang}</i><b>${esc(r.ten)}${r.toi ? ` <small>${vi.dauThanh.rankYou}</small>` : ''}</b><small>${vi.dauThanh.rankRow(r.chienCong, r.dien)}</small></li>`,
        )
        .join('')
    : '';
  const body = h
    ? `<p class="muted">${vi.dauThanh.rankNote(h.bang.length, h.tong)}</p>
      <div class="stat"><span>${vi.dauThanh.rankMe(h.hang, h.tong)}</span></div>
      <ol class="dau-hang">${rows}</ol>`
    : '';
  return `<div class="stage-card dau"><h3>${vi.dauThanh.rankTitle}</h3>${busy}${err}${body}
    <div class="actions"><button class="btn ghost" data-act="dauBack">${vi.ui.back}</button></div></div>`;
}

/** Thẻ Đấu thật. */
function thatHtml(state: GameState, view: DauView): string {
  const t = view.that;
  const busy = t.busy ? `<p class="muted dau-busy">⏳ ${vi.dauThanh.busy[t.busy]}</p>` : '';
  const err = t.loi
    ? `<p class="why">${esc(dauError(t.loi))}</p>${t.loi.ma === 'capNhat' ? `<div class="actions"><button class="btn small" data-act="dauReload">${vi.dauThanh.reload}</button></div>` : ''}`
    : '';
  const off = t.busy ? 'disabled' : '';
  const why = dienLevel(state) < DAU_THANH.unlockDien ? vi.dauThanh.reasons.canDien5 : null;
  if (!dauJoined(state)) {
    return `${busy}${err}
      <h4>${vi.dauThanh.joinTitle}</h4>
      <p class="muted">${vi.dauThanh.joinIntro}</p>
      <p class="rule">${vi.dauThanh.joinRules}</p>
      ${state.dauThanh ? `<p class="muted">${vi.dauThanh.joinMoved}</p>` : ''}
      <label class="dau-ten-label">${vi.dauThanh.nameLabel}
        <input class="dau-ten" type="text" maxlength="16" autocomplete="nickname" enterkeyhint="go" placeholder="${vi.dauThanh.namePlaceholder}" value="${esc(state.dauThanh?.ten ?? '')}">
      </label>
      ${why ? `<p class="why">${why}</p>` : ''}
      <div class="actions"><button class="btn" data-act="dauJoin" ${off || (why ? 'disabled' : '')}>${vi.dauThanh.join}</button></div>
      ${accountHtml(t, false, off)}`;
  }
  const d = state.dauThanh!;
  const left = d.khienDen ? d.khienDen - Date.now() : 0;
  const shield = left > 0 ? vi.dauThanh.shield(vi.dauThanh.hm(left)) : vi.dauThanh.noShield;
  const prof = `<div class="stat"><span><b>${esc(d.ten)}</b></span><b>${vi.dauThanh.profile(d.chienCong)}</b></div><p class="muted">${shield}</p>`;
  const cant = canPractice(state);
  const lich = t.lich.length
    ? `<div class="hero-pick"><h4>${vi.dauThanh.historyTitle}</h4><ul class="dau-lich">${t.lich.slice(0, 6).map((l) => lichRow(l, off)).join('')}</ul></div>`
    : '';
  const leave = `<div class="actions dau-leave">${t.roiHoi ? `<p class="why">${vi.dauThanh.leaveConfirm}</p>` : ''}<button class="btn small ghost" data-act="dauLeave" ${off}>${vi.dauThanh.leave}</button></div>`;
  const foe = t.foe;
  if (!foe) {
    return `${prof}${busy}${err}
      <p class="rule">⭐ ${vi.dauThanh.rules}</p>
      ${cant ? `<p class="why">${vi.dauThanh.reasons[cant]}</p>` : ''}
      <div class="actions">
        <button class="btn ghost" data-act="dauRank" ${off}>${vi.dauThanh.rankBtn}</button>
        <button class="btn" data-act="dauFind" ${off || (cant ? 'disabled' : '')}>${vi.dauThanh.find}</button>
      </div>
      ${lich}${accountHtml(t, true, off)}${leave}`;
  }
  return `${prof}${busy}${err}
    <div class="hero-pick"><h4>${vi.dauThanh.foeTitle}</h4>
      <div class="hero-opt sel"><span class="unit-icon">${foe.may ? '🏯' : '⚔️'}</span>
        <span class="unit-info"><b>${esc(foeName(foe))}</b><small>${vi.dauThanh.profile(foe.chienCong)}<br>${targetInfo(foe.snap)}</small></span></div>
      ${foe.may ? `<p class="muted">${vi.dauThanh.foeBotNote}</p>` : ''}
    </div>
    ${foe.may ? '' : `<div class="stat"><span>${vi.dauThanh.lootCap}</span><b>${lootHtml(foe.snap)}</b></div>`}
    <p class="rule">⭐ ${vi.dauThanh.rules}</p>
    <div class="hero-pick"><h4>${vi.dauThanh.sideTitle}</h4><div class="dau-sides">${sidesHtml(view)}</div></div>
    ${cant ? `<p class="why">${vi.dauThanh.reasons[cant]}</p>` : ''}
    <div class="actions">
      <button class="btn ghost" data-act="dauFind" ${off}>${vi.dauThanh.findAgain}</button>
      <button class="btn" data-act="dauNext" ${off || (cant ? 'disabled' : '')}>${vi.dauThanh.next}</button>
    </div>`;
}

/** Bảng bên phải (hay dưới) bản đồ. */
export function dauHtml(state: GameState, view: DauView): string {
  const that = view.mode === 'that' && coMayChu();
  if (that && view.step === 'rank') return rankHtml(view);
  if (view.step !== 'army') {
    if (that) return `<div class="stage-card dau"><h3>${vi.dauThanh.chip}</h3>${modeTabs(view)}${thatHtml(state, view)}</div>`;
    const why = canPractice(state);
    const opts = dauTargets(state)
      .map((t) => {
        const snap = t === view.target ? view.snap : targetSnapshot(state, t);
        const sel = t === view.target;
        return `<button class="hero-opt ${sel ? 'sel' : ''}" data-act="dauTarget" data-id="${t}" aria-pressed="${sel}">
          <span class="unit-icon">${t ? '🏯' : '🏠'}</span>
          <span class="unit-info"><b>${t ? vi.dauThanh.bot(t) : vi.dauThanh.own}</b><small>${t ? vi.dauThanh.botDesc : vi.dauThanh.ownDesc}<br>${targetInfo(snap)}</small></span>
        </button>`;
      })
      .join('');
    return `<div class="stage-card dau"><h3>${vi.dauThanh.chip}</h3>${modeTabs(view)}
      <p class="muted">${coMayChu() ? vi.dauThanh.intro : `${vi.dauThanh.intro} ${vi.dauThanh.noServer}`}</p>
      <div class="hero-pick"><h4>${vi.dauThanh.targetTitle}</h4><div class="hero-opts">${opts}</div></div>
      <div class="stat"><span>${vi.dauThanh.lootCap}</span><b>${lootHtml(view.snap)}</b></div>
      <p class="rule">⭐ ${vi.dauThanh.rules}</p>
      <div class="hero-pick"><h4>${vi.dauThanh.sideTitle}</h4><div class="dau-sides">${sidesHtml(view)}</div></div>
      ${why ? `<p class="why">${vi.dauThanh.reasons[why]}</p>` : ''}
      <div class="actions"><button class="btn" data-act="dauNext" ${why ? 'disabled' : ''}>${vi.dauThanh.next}</button></div>
    </div>`;
  }
  const cap = fieldCap(state);
  const space = armySpace(view.army);
  const rows = UNIT_TYPES.filter((k) => state.troops[k] > 0)
    .map((k) => {
      const n = view.army[k];
      const more = n < state.troops[k] && space + UNITS[k].space <= cap;
      return `<div class="unit-row army">
        <span class="unit-icon">${vi.units[k].icon}</span>
        <span class="unit-info"><b>${vi.units[k].name}</b><small>${vi.ui.haveTroops(state.troops[k])}</small></span>
        <button class="step" data-act="dauDelta" data-unit="${k}" data-delta="-1" ${n <= 0 ? 'disabled' : ''}>−</button>
        <b class="count">${n}</b>
        <button class="step" data-act="dauDelta" data-unit="${k}" data-delta="1" ${more ? '' : 'disabled'}>+</button>
      </div>`;
    })
    .join('');
  const heroes = heroesFor(state, chapterOf(state));
  const heroNote = heroes.length ? vi.dauThanh.heroes(heroes.map((h) => vi.ui.heroNames[h.kind]).join(', ')) : vi.dauThanh.noHero;
  const bad = validateArmy(state, view.army) ?? canPractice(state);
  const foe = that ? view.that.foe : null;
  const name = foe ? esc(foeName(foe)) : view.target ? vi.dauThanh.bot(view.target) : vi.dauThanh.own;
  const busy = that && view.that.busy ? `<p class="muted dau-busy">⏳ ${vi.dauThanh.busy[view.that.busy]}</p>` : '';
  const err = that && view.that.loi ? `<p class="why">${esc(dauError(view.that.loi))}</p>` : '';
  const off = bad || (that && (view.that.busy || !foe)) ? 'disabled' : '';
  return `<div class="stage-card dau"><h3>${vi.dauThanh.armyTitle}</h3>
    <p class="muted">${name} · ${vi.dauThanh.sides[view.side]}</p>
    <p class="muted">${vi.dauThanh.armyHint}</p>
    ${that ? `<p class="rule">${vi.dauThanh.realNote}</p>` : ''}
    <p class="hero-note">${heroNote}</p>
    <div class="stat"><span>${vi.ui.fieldSpace(space, cap)}</span></div>
    ${rows ? `<div class="units">${rows}</div>` : `<p class="why">${vi.ui.noTroops}</p>`}
    ${bad ? `<p class="why">${vi.dauThanh.reasons[bad]}</p>` : ''}
    ${busy}${err}
    <div class="actions">
      <button class="btn ghost" data-act="dauBack">${vi.ui.back}</button>
      <button class="btn" data-act="dauAttack" ${off}>${vi.dauThanh.attack}</button>
    </div>
  </div>`;
}

/** Số công trình tính điểm của kinh đô, để thanh trận ghi phần trăm. */
export const scoredCount = (def: GameState): number => def.buildings.filter(isScored).length;

/** Bảng kết quả sau trận Đấu thành đánh thử. */
export function dauResultHtml(score: PvpScore, lost: Army, loot: Resources): string {
  return `<div class="modal dau-result">
    <h2>${score.stars ? vi.dauThanh.resultWon(score.stars) : '🏳️ ' + vi.dauThanh.resultLost}</h2>
    <div class="dau-stars">${'⭐'.repeat(score.stars)}${'☆'.repeat(3 - score.stars)}</div>
    <div class="result-rows">
      <div>${vi.dauThanh.resultPct(Math.floor(score.pct * 100))}</div>
      <div>${score.dien ? vi.dauThanh.resultDien : vi.dauThanh.resultNoDien}</div>
      <div>${vi.dauThanh.resultFallen}: ${armyLine(lost)}</div>
      <div>${vi.dauThanh.resultLoot}: ${resHtml(loot)}</div>
    </div>
    <p class="muted">${vi.dauThanh.practiceNote}</p>
    <div class="actions">
      <button class="btn ghost" data-act="dauAgain">${vi.dauThanh.again}</button>
      <button class="btn bronze" data-act="dauHome">${vi.dauThanh.home}</button>
    </div>
  </div>`;
}

/** Bảng kết quả trận thật: đang chờ máy chủ, chưa gửi được, hay kết quả máy chủ (của thật vào kho, quân mất thật). */
export function dauRealResultHtml(r: { name: string; bot: boolean } & ({ wait: true } | { fail: { ma: string; chiTiet?: string } } | { ket: KetQuaMay; nhan: DaNhan | null })): string {
  const home = `<button class="btn bronze" data-act="dauHome">${vi.dauThanh.home}</button>`;
  const head = `<p class="muted">🏯 ${esc(r.name)}</p>`;
  if ('wait' in r) return `<div class="modal dau-result"><h2>⏳ ${vi.dauThanh.title}</h2>${head}<p class="muted">${vi.dauThanh.waiting}</p></div>`;
  if ('fail' in r)
    return `<div class="modal dau-result"><h2>⚠️ ${vi.dauThanh.title}</h2>${head}
      <p class="why">${esc(dauError(r.fail))}</p><p class="muted">${vi.dauThanh.sendFail}</p>
      <div class="actions"><button class="btn ghost" data-act="dauRetry">${vi.dauThanh.retry}</button>${home}</div></div>`;
  const k = r.ket;
  const got = r.nhan?.duoc ?? k.cuop;
  const lost = r.nhan?.mat ?? k.mat;
  return `<div class="modal dau-result">
    <h2>${k.sao ? vi.dauThanh.resultWon(k.sao) : '🏳️ ' + vi.dauThanh.resultLost}</h2>${head}
    <div class="dau-stars">${'⭐'.repeat(k.sao)}${'☆'.repeat(3 - k.sao)}</div>
    <div class="result-rows">
      <div>${vi.dauThanh.resultPct(Math.floor(k.pct * 100))}</div>
      <div>${k.dien ? vi.dauThanh.resultDien : vi.dauThanh.resultNoDien}</div>
      <div>${vi.dauThanh.resultFallenReal}: ${armyLine(lost)}</div>
      <div>${vi.dauThanh.resultLootReal}: ${r.bot ? vi.dauThanh.resultBot : resHtml(got)}</div>
      <div>🏅 ${vi.dauThanh.resultCups(k.chienCong.atk)}</div>
    </div>
    ${k.hong ? `<p class="muted">${vi.dauThanh.resultBroken}</p>` : ''}
    <div class="actions">
      <button class="btn ghost" data-act="dauMore">${vi.dauThanh.more}</button>
      ${home}
    </div>
  </div>`;
}

/** Bảng Bị đánh (mở game, hay lần hỏi máy chủ định kỳ): các trận vừa trừ của, và trận đánh dở vừa nhận kết quả. */
export function dauAttackedHtml(state: GameState, biDanh: BiDanh[], cu: { tran: TranTom; nhan: DaNhan }[]): string {
  const rows = biDanh
    .map(({ tran: t, mat }) => {
      const k = t.ketQua!;
      const lost = RESOURCE_IDS.some((r) => mat[r] > 0) ? `${vi.dauThanh.attackedLost}: ${resHtml(mat)}` : vi.dauThanh.attackedNone;
      return `<li><span><b>${vi.dauThanh.attackedRow(esc(t.tenDanh), t.dienDanh)}</b>
        <small>${vi.dauThanh.histScore(k.sao, Math.floor(k.pct * 100))} · ${vi.dauThanh.attackedCups(k.chienCong.def)}</small>
        <small>${lost}</small></span>${replayBtn(t)}</li>`;
    })
    .join('');
  const old = cu
    .map(({ tran: t, nhan }) => {
      const k = t.ketQua!;
      return `<li><span><b>${vi.dauThanh.recoveredRow(t.may ? vi.dauThanh.histBot : esc(t.tenGiu))}</b>
        <small>${vi.dauThanh.histScore(k.sao, Math.floor(k.pct * 100))} · ${vi.dauThanh.attackedCups(k.chienCong.atk)}</small>
        <small>${vi.dauThanh.resultFallenReal}: ${armyLine(nhan.mat)} · ${vi.dauThanh.recoveredGot}: ${resHtml(nhan.duoc)}</small></span></li>`;
    })
    .join('');
  const left = state.dauThanh?.khienDen ? state.dauThanh.khienDen - Date.now() : 0;
  return `<div class="modal dau-result dau-attacked">
    ${rows ? `<h2>${vi.dauThanh.attackedTitle}</h2><ul class="dau-lich">${rows}</ul>` : ''}
    ${left > 0 && rows ? `<p class="muted">${vi.dauThanh.attackedShield(vi.dauThanh.hm(left))}</p>` : ''}
    ${old ? `<h3>${vi.dauThanh.recoveredTitle}</h3><ul class="dau-lich">${old}</ul>` : ''}
    <div class="actions"><button class="btn bronze" data-act="dauAttackedOk">${vi.dauThanh.ok}</button></div>
  </div>`;
}

/** Tên hai bên của một trận xem lại, theo vai của mình: người đánh và kinh đô bị đánh. */
export function replayNames(t: TranTom, vai: 'danh' | 'giu'): { atk: string; def: string } {
  return {
    atk: vai === 'danh' ? vi.dauThanh.replayMe : t.tenDanh,
    def: vai === 'giu' ? vi.dauThanh.replayMine : t.may || !t.tenGiu ? vi.dauThanh.foeBot(t.dienGiu) : t.tenGiu,
  };
}

/** Bảng sau khi xem lại hết một trận: kết quả máy chủ đã ghi (sao, phần trăm, của cướp, chiến công của mình). */
export function dauReplayResultHtml(t: TranTom, vai: 'danh' | 'giu'): string {
  const k = t.ketQua!;
  const n = replayNames(t, vai);
  return `<div class="modal dau-result">
    <h2>${vi.dauThanh.replayDone}</h2>
    <p class="muted">${esc(vi.dauThanh.replayBanner(n.atk, n.def))}</p>
    <div class="dau-stars">${'⭐'.repeat(k.sao)}${'☆'.repeat(3 - k.sao)}</div>
    <div class="result-rows">
      <div>${vi.dauThanh.resultPct(Math.floor(k.pct * 100))}</div>
      <div>${k.dien ? vi.dauThanh.resultDien : vi.dauThanh.resultNoDien}</div>
      <div>${vi.dauThanh.resultFallenReal}: ${armyLine(k.mat)}</div>
      <div>${vai === 'giu' ? vi.dauThanh.replayLootDef : vi.dauThanh.replayLootAtk}: ${t.may ? vi.dauThanh.resultBot : resHtml(k.cuop)}</div>
      <div>🏅 ${vi.dauThanh.resultCups(vai === 'giu' ? k.chienCong.def : k.chienCong.atk)}</div>
    </div>
    <div class="actions">
      <button class="btn ghost" data-act="dauReplay" data-tran="${esc(t.id)}">${vi.dauThanh.replayAgain}</button>
      <button class="btn bronze" data-act="dauHome">${vi.dauThanh.home}</button>
    </div>
  </div>`;
}
