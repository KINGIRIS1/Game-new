#!/usr/bin/env node
// Chụp thử game ở khổ điện thoại bằng Playwright, để nhìn tận mắt mỗi thay đổi ở src/render/ và src/ui/.
// Script tự bật Vite, mở game, dựng cảnh qua window.__debug và các module luật chơi, rồi lưu ảnh vào chup/.
// Cách dùng: node scripts/chup.mjs --giup
// Cảnh và cách dựng cảnh (`CANH`, `dungCanh`) dùng chung với scripts/do-lag.mjs.

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

/** Khổ màn hình (điểm CSS). Game làm cho điện thoại cầm dọc trước tiên. */
export const KHUNG = {
  doc: { width: 390, height: 844 },
  /** Màn ngoài Samsung Galaxy Z Fold5 (máy thử chính): dài, hẹp. */
  fold: { width: 344, height: 882 },
  ngang: { width: 844, height: 390 },
  bang: { width: 820, height: 1180 },
};

// Mã dựng cảnh chạy trong trang, có sẵn các biến:
//   d = window.__debug, s = state đang chơi,
//   G = game.ts, M = moPhong.ts (người chơi mô phỏng), D = defs.ts, C = campaign.ts, S = story.ts, X = mau.ts,
//   K = khoanh.ts, B = benKia.ts (bên kia sông).
// `truoc` chạy trước khi tải lại trang (dựng state rồi lưu), `sau` chạy sau khi tải lại (bấm trận, bấm kỹ năng...).
// Sau khi tải lại, script bấm qua màn hình vào game, trừ cảnh có `giuManVao`; `vang` (ms) lùi lần chơi trước.

/** Cho kinh đô một doanh trại và một ít quân, giữ nguyên kho của người chơi. */
const CO_QUAN = `
  const kho = { ...s.resources };
  s.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 };
  // Người chơi mô phỏng xây kín đất thì phát thêm khoảnh rừng gần nhất cho có chỗ.
  for (let n = 0; !G.countOf(s, 'doanhTrai') && !M.placeAnywhere(s, 'doanhTrai'); n++) {
    const id = K.openable(s)[0];
    if (id === undefined || n > 20 || !K.openKhoanh(s, id).ok) throw new Error('Không còn chỗ dựng doanh trại');
  }
  s.resources = kho;
  const cho = G.troopCap(s);
  s.troops = { giao: Math.floor(cho / 2), cung: Math.floor(cho / 3), voi: 0, no: 0 };
`;
const KINH_DO = `M.playChapters({ s, until: (m) => m.at5 >= 0 });`;
/** Kinh đô Điện 8 vừa sang chương 5 (đã thắng tới màn `cleared`), có doanh trại và quân, đã xem hết truyện tới lúc ấy. */
/**
 * Điện 10 sau truyện (người chơi mô phỏng chơi thêm 5 giờ: hai đồn đảo lên cấp, có thuyền chiến), chương 5 đã thắng
 * màn 37 (Mã Viện sang), đồn Hoàng Sa có 30 chỗ quân đóng; giặc kinh đô không tới để khỏi che cảnh.
 */
const DAO_GIAC = `M.playChapters({ s, last: 10 }); for (let i = 0; i < 5 * 3600; i++) M.playSecond(s);
  s.questIndex = Math.max(s.questIndex, D.CH5_QUEST_START); s.campaign.cleared = Math.max(s.campaign.cleared, 37);
  s.dao.hoangSa.linh = { giao: 9, cung: 8, voi: 3, no: 2 }; s.dao.hoangSa.muon = { ...s.dao.hoangSa.linh };
  s.raid.nextAt = Number.MAX_SAFE_INTEGER; s.raid.phase = 'idle'; s.raid.battle = null;
  for (let id; (id = S.pendingStory(s)); ) S.markStory(s, id);
  for (let t; (t = G.nextHint(s)); ) G.markHinted(s, t);
  s.hinted = [...s.hinted, 'dao:mo', 'dao:maVien'];
  const Nu = await import('/src/game/nuTuong.ts');
  for (let n; (n = Nu.nextNuHint(s)); ) Nu.markNuHinted(s, n);
`;

/** Bà Triệu đã về: boss map 6 đã bị hạ một lần (giờ mọc lại đã qua). */
const BA_TRIEU = `s.daNgoai.boss[5] = 1; s.hinted.push('daNgoai6', 'daNgoai7', 'daNgoai8', 'daNgoai9', 'daNgoai10');`;
/** Triệu Quang Phục đã về: boss map 7 đã bị hạ một lần (Bà Triệu cũng đã về). */
const TQP = `${BA_TRIEU} s.daNgoai.boss[6] = 1;`;
/** Mai Thúc Loan đã về: boss map 8 đã bị hạ một lần (Bà Triệu, Triệu Quang Phục cũng đã về). */
const MTL = `${TQP} s.daNgoai.boss[7] = 1;`;
const NQ = `${MTL} s.daNgoai.boss[8] = 1;`;
const LTK = `${NQ} s.daNgoai.boss[9] = 1;`;
const CHUONG5 = (cleared) => `M.playChapters({ s, last: 8 });${CO_QUAN}
  for (const b of s.buildings) if (b.type === 'doanhTrai') b.level = D.BUILDINGS.doanhTrai.maxLevel;
  const cho5 = G.troopCap(s);
  s.troops = { giao: Math.floor(cho5 * 0.3), cung: Math.floor(cho5 * 0.2), voi: Math.floor(cho5 * 0.03), no: Math.floor(cho5 * 0.15) };
  s.questIndex = D.CH5_QUEST_START; s.campaign.cleared = ${cleared};
  // Đã hết truyện chương 4: lẫy bị tráo, Cao Lỗ có Lệnh bắn, vua đã theo Rùa Vàng xuống biển.
  s.adv.layTrao = true; s.caoLo.lenhBan = true; s.adv.bien = true;
  for (let id; (id = S.pendingStory(s)); ) S.markStory(s, id);
  // Lời gợi ý công trình mới che giữa bãi chiến: coi như đã đọc.
  for (let t; (t = G.nextHint(s)); ) G.markHinted(s, t);
`;

/**
 * Kinh đô chương 2 dựng như `phuSa.test.ts`: Điện 5, đê bao cách sông 4 ô, cống đê (đang mở) trên dải đê, sau cống trên
 * đất bậc 1 có hai ruộng lúa, ruộng nếp, bãi đất đá, nhà sàn; mùa lũ tới dâng bậc 2.
 */
const PHU_SA = `
  const Mp = await import('/src/game/map.ts');
  const fresh = G.createInitialState(Date.now());
  for (const k of Object.keys(s)) delete s[k];
  Object.assign(s, fresh);
  s.buildings.find((b) => b.type === 'dien').level = 5;
  s.khoanh = K.squareKhoanh(K.AREA[4]);
  s.questIndex = D.CH2_QUEST_START;
  s.resources = { gao: 9e4, voOc: 9e4, datDa: 9e4, sat: 9e4, go: 9e4 };
  s.dan = 60;
  s.giong.ascended = true;
  for (const g of D.GIFT_IDS) s.son.gifts[g] = true;
  const must = (r) => { if (!r.ok) throw new Error(r.reason); return r.value; };
  const DIEN = Mp.DIEN_HOME, LINE = Mp.RIVER_START - 4, EDGE = Mp.RIVER_START - K.AREA[4];
  must(G.place(s, 'doanhTrai', EDGE + 2, EDGE + 4));
  for (let x = EDGE; x <= LINE; x++) must(G.place(s, 'de', x, LINE));
  for (let z = EDGE; z < LINE; z++) must(G.place(s, 'de', LINE, z));
  const cong = must(G.place(s, 'congDe', DIEN + 2, LINE));
  must(G.setCong(s, cong.id, true));
  must(G.place(s, 'ruong', DIEN, LINE - 4));
  must(G.place(s, 'ruong', DIEN + 5, LINE - 4));
  must(G.place(s, 'baiDa', DIEN + 10, LINE - 4));
  must(G.place(s, 'nhaSan', DIEN + 13, LINE - 4));
  must(G.place(s, 'ruongNep', LINE - 5, DIEN + 4));
  s.raid.floods = 2;
  for (let t; (t = G.nextHint(s)); ) G.markHinted(s, t);
`;
/** Gọi lũ tới ngay; `giay` > 0 thì cho hết trinh sát báo và nước dâng chừng ấy giây (thủy quái đứng yên dưới sông). */
const LU_TOI = (giay) => `
  const r = G.callRaidNow(s); if (!r.ok) throw new Error('Không gọi lũ được: ' + r.reason);
  ${giay > 0 ? `d.advance(D.RAID_WARNING_MS); for (const f of s.raid.battle.fighters) if (f.side === 'giac') f.state = 'aboard'; d.advance(${giay * 1000});` : 'd.advance(0);'}
`;

/**
 * Ba tốp thợ đang làm (cảnh `xay`): `XAY` xong hết việc cũ, dựng sẵn hai nhà thợ hồ; `XAY_SAU` (sau khi tải lại, để
 * thời gian tải trang không làm xong việc) cho tốp một dựng nhà sàn mới gần Điện, tốp hai nâng một ruộng, tốp ba đắp
 * một dải lũy, rồi cho thợ làm một lúc để thấy giàn giáo, mô hình mọc dở, cọc mốc.
 */
/** Kinh đô vừa vào chương 3 một phút, có quân; trinh sát vừa báo đêm yêu tinh (trời tối dần trong chừng 3 giây). */
const YEU_TINH = {
  truoc: `M.playChapters({ s, until: (m, sec) => m.enter3 >= 0 && sec >= m.enter3 + 60 });${CO_QUAN}
  for (const g of D.GIFT_IDS) s.son.gifts[g] = true;`,
  sau: `s.raid.foe = 'thuy'; const r = G.callRaidNow(s); if (!r.ok) throw new Error('Không gọi giặc được: ' + r.reason);
    if (s.raid.foe !== 'yeu') throw new Error('Đợt này không phải đêm yêu tinh: ' + s.raid.foe);`,
  doi: 4000,
};

const XAY = `
  const Xa = await import('/src/game/xay.ts');
  s.resources = { gao: 9e4, voOc: 9e4, datDa: 9e4, sat: 9e4, go: 9e4 };
  Xa.advanceXay(s, 1e13);
  const dien = s.buildings.find((b) => b.type === 'dien');
  const near = { x: dien.x + 9, z: dien.z + 9 };
  for (let i = 0; i < 2; i++) { const p = G.findSpot(s, 'thoHo', near); if (p) G.place(s, 'thoHo', p.x, p.z); }
  for (let t; (t = G.nextHint(s)); ) G.markHinted(s, t);
`;
const XAY_SAU = `
  const Xa = await import('/src/game/xay.ts');
  const Mp = await import('/src/game/map.ts');
  const must = (r) => { if (!r.ok) throw new Error(r.reason); return r.value; };
  const dien = s.buildings.find((b) => b.type === 'dien');
  const near = { x: dien.x + 9, z: dien.z + 9 };
  const p = G.findSpot(s, 'nhaSan', near);
  must(Xa.startBuild(s, 'nhaSan', p.x, p.z));
  const ruong = s.buildings.filter((b) => b.type === 'ruong').sort((a, b) => Math.hypot(a.x - near.x, a.z - near.z) - Math.hypot(b.x - near.x, b.z - near.z))[0];
  must(Xa.startUpgrade(s, ruong.id));
  for (let z = near.z + 4; z < near.z + 12; z++) {
    const w = Xa.startWalls(s, 'luy', Mp.lineTiles({ x: near.x - 6, z }, { x: near.x + 3, z }));
    if (w.n >= 6) break;
  }
  // Trang chụp chạy chậm, đồng hồ game trôi nhanh hơn lúc chơi: kéo dài việc dựng nhà sàn, đắp lũy cho khỏi xong trước
  // khi chụp, rồi cho mỗi việc làm được chừng 40%.
  for (const v of s.xay.viec) {
    if (v.o.some((o) => o.moi)) for (const o of v.o) o.ms *= 40;
    v.lam = 0.4 * v.o.reduce((n, o) => n + o.ms, 0);
  }
  d.advance(0);
`;

/** Nhìn vào cống và ruộng sau cống. */
const NHIN_CONG = `const c = s.buildings.find((b) => b.type === 'congDe'); d.camera(c.x + 4, c.z - 5, 1.1);`;

/** Đủ quân mẫu một trận (38 chỗ) để đánh thử Đấu thành. */
const DU_QUAN = `s.troops = { giao: 14, cung: 12, voi: 4, no: 0 };`;

/**
 * Dời ruộng đầu tiên ra chỗ xa nơi nhận nhất mà hệ số gánh còn trên 70% (mở thêm đất cho có chỗ), rồi trải đường đất
 * nửa tuyến gánh phía nơi nhận.
 */
const RUONG_XA = `s.khoanh = K.squareKhoanh(K.AREA[6]);
const r = s.buildings.find((b) => b.type === 'ruong');
let best = null, bk = 2;
for (let z = 10; z < 52; z++) for (let x = 10; x < 52; x++) {
  if (!G.canMove(s, r.id, x, z).ok) continue;
  const ox = r.x, oz = r.z; r.x = x; r.z = z;
  const k = G.outputIn(s, r).gao / G.outputOf(r).gao;
  r.x = ox; r.z = oz;
  if (k < bk && k > 0.7) { bk = k; best = { x, z }; }
}
r.x = best.x; r.z = best.z;
const V = await import('/src/game/vanChuyen.ts');
const t = V.duongGanh(s, r).tuyen;
for (const i of t.slice(Math.floor(t.length / 2))) G.placeLine(s, 'duongDat', [{ x: i % 76, z: Math.floor(i / 76) }]);`;

/**
 * Nhìn gần người đang gánh thóc của ruộng đã dời (`RUONG_XA`): tua đồng hồ cảnh (`seaTime`) tới lúc người ấy gánh
 * hàng ở quãng giữa đường (cách hai đầu tuyến từ 5 ô), rồi đặt camera vào chỗ người ấy.
 */
const NHIN_GANH = `const V = await import('/src/game/vanChuyen.ts');
const r = s.buildings.filter((b) => b.type === 'ruong').sort((a, b) => V.heSoGanh(s, a) - V.heSoGanh(s, b))[0];
const t = V.duongGanh(s, r).tuyen;
const o = (i) => ({ x: (i % 76) + 0.5, z: Math.floor(i / 76) + 0.5 });
const [a, b] = [o(t[0]), o(t[t.length - 1])];
const frame = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
let p = null;
for (let k = 0; k < 240 && !p; k++) {
  d.seaTime(k * 0.5);
  await frame();
  const q = d.ganh().find((g) => g.id === r.id)?.ra.find((x) => x.mang && !x.dung);
  if (q && Math.hypot(q.x - a.x, q.z - a.z) > 5 && Math.hypot(q.x - b.x, q.z - b.z) > 5) p = q;
}
if (!p) throw new Error('Không thấy người gánh của ruộng xa ở giữa đường');
d.camera(p.x, p.z, 3);`;

/**
 * Tua đồng hồ cảnh (`seaTime`) qua 80 giây, tìm lúc có người đang mang hàng ở xa hai đầu tuyến nhất của chỗ thỏa
 * `chon` (biểu thức trên mỗi mục `d.ganh()`, tên `g`), tua về lúc ấy rồi đặt camera vào người ấy (độ phóng `zoom`).
 */
const NHIN_DI = (chon, zoom = 3) => `const frame = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
const tim = () => {
  let best = null;
  for (const g of d.ganh()) {
    if (!(${chon})) continue;
    for (const x of g.ra) {
      if (!x.coHang || x.dung) continue;
      const m = Math.min(Math.hypot(x.x - g.a.x, x.z - g.a.z), Math.hypot(x.x - g.b.x, x.z - g.b.z));
      if (!best || m > best.m) best = { ...x, m };
    }
  }
  return best;
};
let p = null, at = 0;
for (let k = 0; k < 100; k++) {
  d.seaTime(k * 0.8);
  await frame();
  const q = tim();
  if (q && (!p || q.m > p.m)) { p = q; at = k * 0.8; }
}
if (!p) throw new Error('Không thấy người mang hàng: ' + JSON.stringify(d.ganh().filter((g) => ${chon}).map((g) => ({ id: g.id, hang: g.hang, D: g.D, n: g.n }))));
d.seaTime(at);
await frame();
p = tim() ?? p;
d.camera(p.x, p.z, ${zoom});`;

/** Mở thêm đất, dựng nhà sàn mới ở chỗ xa Điện, kho chừng 16–26 ô (kéo dài việc dựng cho khỏi xong trước khi chụp). */
const NHA_XA = `s.khoanh = K.squareKhoanh(K.AREA[6]);
s.resources = { gao: 9e5, voOc: 9e5, datDa: 9e5, sat: 9e5, go: 9e5 };
const Xa = await import('/src/game/xay.ts');
Xa.advanceXay(s, 1e13);
const V = await import('/src/game/vanChuyen.ts');
let best = null, bd = 0;
for (let z = 4; z < 52; z++) for (let x = 4; x < 52; x++) {
  if (!Xa.canStartBuild(s, 'nhaSan', x, z).ok) continue;
  const g = V.duongTu(s, { type: 'nhaSan', x, z }, 'kho');
  if (g && g.d > bd && g.d < 26) { bd = g.d; best = { x, z }; }
}
const r = Xa.startBuild(s, 'nhaSan', best.x, best.z);
if (!r.ok) throw new Error(r.reason);
for (const v of s.xay.viec) for (const o of v.o) o.ms *= 400;`;

/**
 * Mở thêm đất, coi như đã kết chương 1 (có Hội Tết), dựng bếp gói bánh xa Điện chừng 12–22 ô và ruộng nếp, vườn đậu lá
 * dong, chuồng lợn gần Điện (nguyên liệu gánh về Điện, kho), đủ người làm.
 */
const BEP_XA = `s.khoanh = K.squareKhoanh(K.AREA[6]);
s.giong.ascended = true;
s.resources = { gao: 9e5, voOc: 9e5, datDa: 9e5, sat: 9e5, go: 9e5 };
s.dan += 40;
const V = await import('/src/game/vanChuyen.ts');
const dien = s.buildings.find((b) => b.type === 'dien');
let best = null, bd = 0;
for (let z = 4; z < 52; z++) for (let x = 4; x < 52; x++) {
  if (!G.canPlace(s, 'bep', x, z).ok) continue;
  const g = V.duongTu(s, { type: 'bep', x, z }, 'dien');
  if (g && g.d > bd && g.d < 22) { bd = g.d; best = { x, z }; }
}
const put = (t, x, z) => { const r = G.place(s, t, x, z); if (!r.ok) throw new Error(t + ': ' + r.reason); r.value.workers = G.slotsOf(r.value); return r.value; };
put('bep', best.x, best.z);
for (const t of ['ruongNep', 'vuon', 'chuongLon']) { const p = G.findSpot(s, t, { x: dien.x + 5, z: dien.z + 5 }); put(t, p.x, p.z); }`;

/** Nhìn về phía ruộng xa nhất (`RUONG_XA`) rồi bấm Xây kho thóc: bóng kho hiện gần đó, tô vùng gánh hàng đủ 100%. */
const VUNG_KHO = `const V = await import('/src/game/vanChuyen.ts');
const r = s.buildings.filter((b) => b.type === 'ruong').sort((a, b) => V.heSoGanh(s, a) - V.heSoGanh(s, b))[0];
d.camera(r.x + 3, r.z + 1, 0.9);
await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
d.build('kho');`;

export const CANH = {
  'man-vao': {
    mo: 'Màn hình vào game của bản lưu chương 1 (Điện cấp 5), vắng 3 giờ',
    truoc: KINH_DO,
    giuManVao: true,
    vang: 3 * 3600 * 1000,
    doi: 1800,
  },
  'man-vao-moi': { mo: 'Màn hình vào game khi chưa chơi (nút Bắt đầu)', truoc: '', giuTruyen: true, giuManVao: true, doi: 1800 },
  dau: { mo: 'Vừa vào game, đã đóng đoạn truyện mở đầu', truoc: '' },
  truyen: { mo: 'Vừa vào game, đang hiện đoạn truyện mở đầu', truoc: '', giuTruyen: true },
  'kinh-do': { mo: 'Kinh đô chương 1 lúc vừa lên Điện cấp 5 (người chơi mô phỏng chơi chừng một giờ)', truoc: KINH_DO },
  'ganh-hang': {
    mo: 'Như kinh-do, một ruộng dời ra bìa đất xa kho, nửa đường về có trải đường đất: dân thay phiên gánh thóc về (nhìn giữa tuyến)',
    truoc: `${KINH_DO}\n${RUONG_XA}`,
    sau: NHIN_GANH,
    doi: 600,
  },
  'ganh-vung': {
    mo: 'Như ganh-hang (một ruộng ở xa kho), đang đặt kho thóc gần ruộng ấy: vùng gánh đủ 100% có sẵn tô nhạt, phần kho mới phủ thêm tô xanh',
    truoc: `${KINH_DO}\n${RUONG_XA}`,
    sau: VUNG_KHO,
  },
  'vong-nut': {
    mo: 'Như kinh-do, chạm chọn Điện: vòng nút quanh Điện (Thông tin, Nâng cấp, Dời, Xoay)',
    truoc: KINH_DO,
    sau: `d.select(s.buildings.find((b) => b.type === 'dien').id);`,
    doi: 2500,
  },
  'vong-nut-nang': {
    mo: 'Như vong-nut, bấm nút Nâng cấp của vòng: thẻ xác nhận (giá, thời gian xây, lý do chưa nâng được, Thôi, Đồng ý)',
    truoc: KINH_DO,
    sau: `d.select(s.buildings.find((b) => b.type === 'dien').id);`,
    doi: 2500,
    truocKhiChup: `document.querySelector('.vn-nut[data-the=nang]').click();`,
  },
  'vong-nut-luy': {
    mo: 'Như kinh-do, có một đoạn lũy hư: vòng nút của lũy (Sửa, Đắp, Dời, Dỡ) và thẻ xác nhận Dỡ',
    truoc: `${KINH_DO}\nconst l = G.place(s, 'luy', s.buildings[0].x - 3, s.buildings[0].z + 2); if (l.ok) l.value.damaged = true;`,
    sau: `d.select(s.buildings.find((b) => b.type === 'luy').id);`,
    doi: 2500,
    truocKhiChup: `document.querySelector('.vn-nut[data-the=do]').click();`,
  },
  'vong-nut-trai': {
    mo: 'Như kinh-do có doanh trại, chạm chọn doanh trại: vòng có Quân, Giữ thành, Tướng (mở bảng đúng thẻ)',
    truoc: `${KINH_DO}\n${CO_QUAN}`,
    sau: `d.select(s.buildings.find((b) => b.type === 'doanhTrai').id);`,
    doi: 2500,
  },
  'vong-nut-ren': {
    mo: 'Như kinh-do sang chương 2, chạm lò rèn rồi bấm nút Rèn: bảng lò rèn cuộn tới mục rèn binh khí',
    truoc: `${KINH_DO}\ns.questIndex = Math.max(s.questIndex, D.CH2_QUEST_START);`,
    sau: `d.select(s.buildings.find((b) => b.type === 'loRen').id);`,
    doi: 2500,
    truocKhiChup: `document.querySelector('.vn-nut[data-cuon]').click();`,
  },
  'vong-nut-dien5': {
    mo: 'Kinh đô chương 5 (Điện 8), Điện đang hư, đang Tết: vòng đủ 7 nút (Sửa, Nâng cấp, Tết, tướng, Dời, Xoay)',
    truoc: `${CHUONG5(33)}\ns.story.seen.push('langLieu'); s.buildings.find((b) => b.type === 'dien').damaged = true;`,
    sau: `d.select(s.buildings.find((b) => b.type === 'dien').id);`,
    doi: 3000,
  },
  'ganh-vung-chon': {
    mo: 'Như kinh-do, chạm chọn kho thóc: vùng riêng của kho tô xanh, phần còn lại của vùng gánh đủ 100% tô nhạt',
    truoc: KINH_DO,
    sau: `d.select(s.buildings.find((b) => b.type === 'kho').id);`,
  },
  'vac-lieu': {
    mo: 'Như kinh-do, dựng nhà sàn mới ở xa Điện, kho: hai thợ giàn giáo thay phiên vác bó tre từ kho về (nhìn giữa tuyến)',
    truoc: `${KINH_DO}\n${NHA_XA}`,
    sau: NHIN_DI(`g.type === 'xay'`, 3.4),
    doi: 600,
  },
  'bep-gui': {
    mo: 'Như kinh-do, đã kết chương 1, bếp ở xa, nguyên liệu Tết gánh về Điện: người bếp gùi nguyên liệu từ Điện về (nhìn giữa tuyến)',
    truoc: `${KINH_DO}\n${BEP_XA}`,
    sau: NHIN_DI(`g.hang === 'gui'`, 3.4),
    doi: 600,
  },
  'tet-mam': {
    mo: 'Như bep-gui, Tết đang mở, gác bếp có bánh: người bếp đội mâm bánh lên Điện (nhìn giữa tuyến)',
    truoc: `${KINH_DO}\n${BEP_XA}\ns.tet.nextAt = s.clock + 1e9; s.tet.openUntil = s.clock + 1e9; s.tet.banh = { chung: 12, giay: 12 };`,
    sau: NHIN_DI(`g.hang === 'mam'`, 3.4),
    doi: 600,
  },
  chuong2: {
    mo: 'Kinh đô chương 2, mười phút sau khi vào chương',
    truoc: `M.playChapters({ s, until: (m, sec) => m.enter2 >= 0 && sec >= m.enter2 + 600 });`,
  },
  chuong3: { mo: 'Kinh đô chương 3 lúc lên Điện cấp 7', truoc: `M.playChapters({ s });` },
  dien8: { mo: 'Kinh đô chương 4 lúc lên Điện cấp 8', truoc: `M.playChapters({ s, last: 8 });` },
  'mau-phong-chau': {
    mo: 'Kinh đô chương 1, Điện cấp 5, đã áp mẫu Phong Châu',
    truoc: `${KINH_DO}\ns.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 }; (await import('/src/game/xay.ts')).advanceXay(s, 1e13); s.khoanh = [...new Set([...s.khoanh, ...X.frameKhoanh(G.dienLevel(s), 'phongChau')])].sort((a, b) => a - b); const r = X.applyMau(s, 'phongChau'); if (!r.ok) throw new Error(r.reason);`,
  },
  'mau-co-loa': {
    mo: 'Kinh đô chương 3, Điện cấp 7, đã áp mẫu Cổ Loa',
    truoc: `M.playChapters({ s });\ns.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 }; (await import('/src/game/xay.ts')).advanceXay(s, 1e13); s.khoanh = [...new Set([...s.khoanh, ...X.frameKhoanh(G.dienLevel(s), 'coLoa')])].sort((a, b) => a - b); const r = X.applyMau(s, 'coLoa'); if (!r.ok) throw new Error(r.reason);`,
  },
  'ganh-cong': {
    mo: 'Như mau-co-loa, nhìn vào một cổng thành có tuyến gánh hàng đi qua: dân gánh qua cổng, không trèo qua tường',
    truoc: `M.playChapters({ s });\ns.resources = { gao: 1e6, voOc: 1e6, datDa: 1e6, sat: 1e6, go: 1e6 }; (await import('/src/game/xay.ts')).advanceXay(s, 1e13); s.khoanh = [...new Set([...s.khoanh, ...X.frameKhoanh(G.dienLevel(s), 'coLoa')])].sort((a, b) => a - b); const r = X.applyMau(s, 'coLoa'); if (!r.ok) throw new Error(r.reason);\nfor (const b of s.buildings) if (G.slotsOf(b) > 0) b.workers = G.slotsOf(b); s.dan += 200;`,
    sau: `const V = await import('/src/game/vanChuyen.ts');
const { GRID } = await import('/src/game/map.ts');
const gates = s.buildings.filter((b) => b.type === 'congThanh');
let pick = null;
for (const b of s.buildings) {
  const g = V.duongGanh(s, b);
  if (!g || !g.tuyen.length || !b.workers) continue;
  const gt = gates.find((c) => g.tuyen.includes(c.z * GRID + c.x));
  if (gt && (!pick || g.d > pick.d)) pick = { id: b.id, gt, d: g.d };
}
if (!pick) throw new Error('Không có tuyến gánh nào qua cổng');
const frame = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
const cx = pick.gt.x + 0.5, cz = pick.gt.z + 0.5;
let best = Infinity, at = 0;
for (let k = 0; k < 150; k++) {
  d.seaTime(k * 0.45);
  await frame();
  for (const g of d.ganh()) {
    if (g.id !== pick.id) continue;
    for (const x of g.ra) {
      if (x.dung || !x.coHang) continue;
      // Người vừa qua cổng vào phía trong (phía camera): mái lầu cổng không che.
      const m = Math.abs(Math.hypot(x.x - cx, x.z - cz) - 1.2) + (x.x + x.z > cx + cz ? 0 : 5);
      if (m < best) { best = m; at = k * 0.45; }
    }
  }
}
if (best > 1) throw new Error('Không thấy người gánh vừa qua cổng: ' + best.toFixed(1));
d.seaTime(at);
await frame();
d.camera(cx, cz, 2.6);`,
    doi: 600,
  },
  tran: {
    mo: 'Giặc đánh kinh đô chương 1, chụp sau 4 giây giao chiến',
    truoc: KINH_DO + CO_QUAN,
    // Gọi giặc rồi cho hết một phút trinh sát báo, để vào trận ngay.
    sau: `const r = G.callRaidNow(s); if (!r.ok) throw new Error('Không gọi giặc được: ' + r.reason); d.advance(D.RAID_WARNING_MS);`,
    // Quay camera về giữa đám lính còn sống của cả hai bên.
    truocKhiChup: `
      const f = (s.raid.battle?.fighters ?? []).filter((f) => f.hp > 0);
      if (f.length) d.camera(f.reduce((a, b) => a + b.x, 0) / f.length, f.reduce((a, b) => a + b.z, 0) / f.length, 1.4);
    `,
    doi: 3000,
  },
  'dau-thanh': {
    mo: 'Bảng Đấu thành (chip 🏯 trên bản đồ phó bản), bước chọn kinh đô để đánh thử',
    truoc: KINH_DO + CO_QUAN + DU_QUAN,
    sau: `d.dauPanel();`,
    doi: 800,
  },
  'dau-thanh-quan': {
    mo: 'Bảng Đấu thành, bước chọn quân',
    truoc: KINH_DO + CO_QUAN + DU_QUAN,
    sau: `d.dauPanel(true);`,
    doi: 800,
  },
  'dau-thanh-tran': {
    mo: 'Đánh thử kinh đô máy cùng cấp Điện từ phía bắc, chụp sau 25 giây (vòng đồng dưới quân ta, đỏ son dưới quân giữ thành)',
    truoc: KINH_DO + CO_QUAN + DU_QUAN,
    sau: `if (!d.dauThanh(undefined, 'bac', 25)) throw new Error('Không đánh thử được');`,
    // Quay camera về giữa quân đánh thành còn sống.
    truocKhiChup: `
      const f = (d.dauBattle()?.fighters ?? []).filter((f) => f.side === 'ta' && f.hp > 0);
      if (f.length) d.camera(f.reduce((a, b) => a + b.x, 0) / f.length, f.reduce((a, b) => a + b.z, 0) / f.length, 2.6);
    `,
    doi: 2500,
  },
  'dau-thanh-giu': {
    mo: 'Đánh thử kinh đô máy, chụp sau 25 giây ở chỗ lính giữ thành (vòng đỏ son dưới chân)',
    truoc: KINH_DO + CO_QUAN + DU_QUAN,
    sau: `if (!d.dauThanh(undefined, 'bac', 25)) throw new Error('Không đánh thử được');`,
    truocKhiChup: `
      const f = (d.dauBattle()?.fighters ?? []).filter((f) => f.side === 'giac' && f.hp > 0);
      if (f.length) d.camera(f[0].x, f[0].z, 2.6);
    `,
    doi: 2500,
  },
  'dau-thanh-ket-qua': {
    mo: 'Đánh thử kinh đô máy cùng cấp Điện cho hết trận: bảng kết quả',
    truoc: KINH_DO + CO_QUAN + DU_QUAN,
    sau: `if (!d.dauThanh(undefined, 'bac')) throw new Error('Không đánh thử được'); d.dauFinish();`,
    doi: 2500,
  },
  'pho-ban': {
    mo: 'Đánh màn 1 ngoài bãi, chụp sau 3 giây',
    truoc: KINH_DO + CO_QUAN,
    sau: `const r = d.march(1); if (!r.ok) throw new Error('Không đánh màn 1 được: ' + r.reason);`,
    doi: 3000,
  },
  'phu-sa': {
    mo: 'Kinh đô chương 2 có đê bao, cống đê đang mở, ruộng sau cống; trinh sát vừa báo lũ bậc 2 (tô vàng, xanh)',
    truoc: PHU_SA,
    sau: LU_TOI(0),
    truocKhiChup: NHIN_CONG,
  },
  'phu-sa-lu': {
    mo: 'Như phu-sa, nước lũ đã dâng 12 giây (bậc 2): nước êm vào qua cống bồi ruộng',
    truoc: PHU_SA,
    sau: LU_TOI(12),
    doi: 1500,
    truocKhiChup: NHIN_CONG,
  },
  'phu-sa-boi': {
    mo: 'Như phu-sa, mùa lũ vừa qua: ruộng sau cống đã có phù sa, bãi đất đá bị ngập',
    truoc: PHU_SA + LU_TOI(12).replace('d.advance(0);', '') + `
      for (const f of s.raid.battle.fighters) if (f.side === 'giac') f.state = 'dead';
      s.raid.battle.killed = s.raid.battle.total;
      d.advance(10000);
      G.dismissRaidResult(s);
    `,
    truocKhiChup: NHIN_CONG,
  },
  xay: {
    mo: 'Kinh đô chương 1 (Điện 5) có ba tốp thợ đang làm: dựng nhà sàn mới, nâng một ruộng, đắp một dải lũy',
    truoc: KINH_DO + XAY,
    sau: XAY_SAU,
    truocKhiChup: `const b = s.buildings.find((b) => b.type === 'dien'); d.camera(b.x + 9, b.z + 9, 1.25);`,
  },
  chuong5: { mo: 'Kinh đô chương 5 (Điện 8, có doanh trại), đã thắng màn 33', truoc: CHUONG5(33) },
  'chieu-ta': { mo: 'Như kinh-do, lúc chiều tà', truoc: KINH_DO, gio: 'chieu' },
  dem: { mo: 'Như kinh-do, giữa đêm', truoc: KINH_DO, gio: 'dem' },
  'rang-dong': { mo: 'Như kinh-do, lúc rạng đông', truoc: KINH_DO, gio: 'rang' },
  'dien8-dem': { mo: 'Như dien8, giữa đêm', truoc: `M.playChapters({ s, last: 8 });`, gio: 'dem' },
  'yeu-tinh': { mo: 'Đêm yêu tinh tới kinh đô chương 3 giữa ban ngày (trời tối như đêm yêu tinh cũ)', ...YEU_TINH, gio: 'ngay' },
  'dem-yeu': { mo: 'Như yeu-tinh, yêu tinh tới giữa đêm (vẫn như đêm yêu tinh cũ)', ...YEU_TINH, gio: 'dem' },
  'dem-tran': {
    mo: 'Như tran, giặc đánh kinh đô giữa đêm',
    truoc: KINH_DO + CO_QUAN,
    sau: `const r = G.callRaidNow(s); if (!r.ok) throw new Error('Không gọi giặc được: ' + r.reason); d.advance(D.RAID_WARNING_MS);`,
    truocKhiChup: `
      const f = (s.raid.battle?.fighters ?? []).filter((f) => f.hp > 0);
      if (f.length) d.camera(f.reduce((a, b) => a + b.x, 0) / f.length, f.reduce((a, b) => a + b.z, 0) / f.length, 1.4);
    `,
    doi: 3000,
    gio: 'dem',
  },
  'da-ngoai': {
    mo: 'Chương 5 (đã thắng màn 35): bảng Dã ngoại ở bản đồ phó bản (cấp chung, đội, năm map, treo máy)',
    truoc: `${CHUONG5(35)}\ns.daNgoai.cap = 12; s.daNgoai.exp = 900; s.daNgoai.xa = 2; s.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];`,
    sau: `document.querySelector('[data-act=openCampaign]').click(); document.querySelector('[data-act=openDaNgoai]').click();`,
  },
  'da-ngoai-tran': {
    mo: 'Như da-ngoai, đội ba tướng ra map 1 (Rừng Phong Châu) đứng ở mép khu 2, Tự đánh, chụp sau 6 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];`,
    sau: `d.daNgoai(1, 1);`,
    doi: 6000,
  },
  'da-ngoai-5': {
    mo: 'Như da-ngoai-tran, ở map 5 (Rừng Mê Linh) khu 1 (báo gấm), chụp sau 6 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];`,
    sau: `d.daNgoai(5, 0);`,
    doi: 6000,
  },
  'da-ngoai-6': {
    mo: 'Như da-ngoai-tran, ở map 6 (Núi Nưa) khu 3 (lính giáo Ngô), chụp sau 6 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];\ns.hinted.push('daNgoai6', 'daNgoai7', 'daNgoai8', 'daNgoai9', 'daNgoai10');`,
    sau: `d.daNgoai(6, 2);`,
    doi: 6000,
  },
  'da-ngoai-6-boss': {
    mo: 'Như da-ngoai-boss, map 6 (Núi Nưa), đội đứng sát khu boss (Lục Dận), chụp sau 3 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];\ns.hinted.push('daNgoai6', 'daNgoai7', 'daNgoai8', 'daNgoai9', 'daNgoai10');`,
    sau: `d.daNgoai(6, 4, 60);`,
    doi: 3000,
  },
  'ba-trieu': {
    mo: 'Bà Triệu đã về (đã hạ Lục Dận), đội Bà Triệu, Hai Bà ra map 6 khu 3, sau 4 giây bấm Chém cá kình, chụp lúc voi lao',
    truoc: `${CHUONG5(35)}\n${BA_TRIEU}\ns.daNgoai.doi = ['baTrieu', 'trungTrac', 'trungNhi'];`,
    sau: `d.daNgoai(6, 2); await new Promise((r) => setTimeout(r, 4000)); d.skill('chemCaKinh');`,
    doi: 600,
  },
  'ba-trieu-tui': {
    mo: 'Bà Triệu đã về, mặc đủ bộ Núi Nưa: bảng tướng, thẻ Túi đồ của Bà Triệu',
    truoc: `${CHUONG5(35)}\n${BA_TRIEU}\nconst T = await import('/src/game/trangBi.ts'); const co = new Set(); for (let q = 0; co.size < 4; q++) { const m = T.rutMon(q, 'daBoss', 5, ['nuiNua'], [0, 0, 0, 100]); if (co.has(m.o)) continue; co.add(m.o); s.trangBi.kho.push({ ...m, cuong: 6, id: s.trangBi.nextId++, tuong: 'baTrieu' }); }`,
    sau: `d.tuong('baTrieu');`,
  },
  'ba-trieu-truyen': {
    mo: 'Vừa hạ Lục Dận lần đầu: đoạn truyện Bà Triệu về, thẻ thứ ba (lời Bà Triệu)',
    truoc: `${CHUONG5(35)}\n${BA_TRIEU}\nfor (let id = S.pendingStory(s); id && id !== 'baTrieu'; id = S.pendingStory(s)) S.markStory(s, id);`,
    giuTruyen: true,
    sau: `document.querySelector('[data-act=storyNext]').click(); document.querySelector('[data-act=storyNext]').click();`,
  },
  'tqp': {
    mo: 'Triệu Quang Phục đã về, đội Triệu Quang Phục, Bà Triệu, Trưng Trắc ra map 7 khu 3, sau 4 giây bấm Ngày ẩn đêm ra, chụp lúc cả đội ẩn',
    truoc: `${CHUONG5(35)}\n${TQP}\ns.daNgoai.doi = ['trieuQuangPhuc', 'baTrieu', 'trungTrac'];`,
    sau: `d.daNgoai(7, 2); await new Promise((r) => setTimeout(r, 4000)); d.skill('ngayAn'); await new Promise((r) => setTimeout(r, 1200));`,
    doi: 300,
  },
  'tqp-tui': {
    mo: 'Triệu Quang Phục đã về, mặc đủ bộ Dạ Trạch: bảng tướng, thẻ Túi đồ của Triệu Quang Phục',
    truoc: `${CHUONG5(35)}\n${TQP}\nconst T = await import('/src/game/trangBi.ts'); const co = new Set(); for (let q = 0; co.size < 4; q++) { const m = T.rutMon(q, 'daBoss', 5, ['daTrach'], [0, 0, 0, 100]); if (co.has(m.o)) continue; co.add(m.o); s.trangBi.kho.push({ ...m, cuong: 6, id: s.trangBi.nextId++, tuong: 'trieuQuangPhuc' }); }`,
    sau: `d.tuong('trieuQuangPhuc');`,
  },
  'tqp-truyen': {
    mo: 'Vừa hạ Trần Bá Tiên lần đầu: đoạn truyện Triệu Quang Phục về, thẻ thứ ba (lời Lý Nam Đế)',
    truoc: `${CHUONG5(35)}\n${TQP}\nfor (let id = S.pendingStory(s); id && id !== 'trieuQuangPhuc'; id = S.pendingStory(s)) S.markStory(s, id);`,
    giuTruyen: true,
    sau: `document.querySelector('[data-act=storyNext]').click(); document.querySelector('[data-act=storyNext]').click();`,
  },
  'tqp-dien': {
    mo: 'Kinh đô chương 5, Bà Triệu và Triệu Quang Phục đã về: nhìn sân chầu Điện, Triệu Quang Phục đứng chỗ 0',
    truoc: `${CHUONG5(35)}\n${TQP}`,
    sau: `const b = s.buildings.find((x) => x.type === 'dien'); const { courtSlot } = await import('/src/game/../render/congTrinh/dien.ts'); const c = courtSlot('trieuQuangPhuc'); const R = await import('/src/game/map.ts'); const t = R.turnLocal(b.rot, c.x, c.z); d.camera(b.x + 5 + t.x, b.z + 5 + t.z, 4.2);`,
  },
  'mtl': {
    mo: 'Mai Thúc Loan đã về, đội Mai Thúc Loan, Triệu Quang Phục, Bà Triệu ra map 8 khu 3, sau 4 giây bấm Hắc Đế dấy binh',
    truoc: `${CHUONG5(35)}\n${MTL}\ns.daNgoai.doi = ['maiThucLoan', 'trieuQuangPhuc', 'baTrieu'];`,
    sau: `d.daNgoai(8, 2); await new Promise((r) => setTimeout(r, 4000)); d.skill('hacDe'); await new Promise((r) => setTimeout(r, 700));`,
    doi: 300,
  },
  'mtl-tui': {
    mo: 'Mai Thúc Loan đã về, mặc đủ bộ Vạn An: bảng tướng, thẻ Túi đồ của Mai Thúc Loan',
    truoc: `${CHUONG5(35)}\n${MTL}\nconst T = await import('/src/game/trangBi.ts'); const co = new Set(); for (let q = 0; co.size < 4; q++) { const m = T.rutMon(q, 'daBoss', 5, ['vanAn'], [0, 0, 0, 100]); if (co.has(m.o)) continue; co.add(m.o); s.trangBi.kho.push({ ...m, cuong: 6, id: s.trangBi.nextId++, tuong: 'maiThucLoan' }); }`,
    sau: `d.tuong('maiThucLoan');`,
  },
  'mtl-truyen': {
    mo: 'Vừa hạ Dương Tư Húc lần đầu: đoạn truyện Mai Thúc Loan về, thẻ thứ ba (lời Mai Thúc Loan)',
    truoc: `${CHUONG5(35)}\n${MTL}\nfor (let id = S.pendingStory(s); id && id !== 'maiThucLoan'; id = S.pendingStory(s)) S.markStory(s, id);`,
    giuTruyen: true,
    sau: `document.querySelector('[data-act=storyNext]').click(); document.querySelector('[data-act=storyNext]').click();`,
  },
  'nq': {
    mo: 'Ngô Quyền đã về, đội Ngô Quyền, Mai Thúc Loan, Bà Triệu ra map 9 khu 3, sau 4 giây bấm Cọc Bạch Đằng',
    truoc: `${CHUONG5(35)}\n${NQ}\ns.daNgoai.doi = ['ngoQuyen', 'maiThucLoan', 'baTrieu'];`,
    sau: `d.daNgoai(9, 2); await new Promise((r) => setTimeout(r, 4000)); d.skill('cocBachDang'); await new Promise((r) => setTimeout(r, 900));`,
    doi: 300,
  },
  'nq-tui': {
    mo: 'Ngô Quyền đã về, mặc đủ bộ Bạch Đằng: bảng tướng, thẻ Túi đồ của Ngô Quyền',
    truoc: `${CHUONG5(35)}\n${NQ}\nconst T = await import('/src/game/trangBi.ts'); const co = new Set(); for (let q = 0; co.size < 4; q++) { const m = T.rutMon(q, 'daBoss', 5, ['bachDang'], [0, 0, 0, 100]); if (co.has(m.o)) continue; co.add(m.o); s.trangBi.kho.push({ ...m, cuong: 6, id: s.trangBi.nextId++, tuong: 'ngoQuyen' }); }`,
    sau: `d.tuong('ngoQuyen');`,
  },
  'nq-truyen': {
    mo: 'Vừa hạ Lưu Hoằng Tháo lần đầu: đoạn truyện Ngô Quyền về, thẻ thứ ba (lời Ngô Quyền)',
    truoc: `${CHUONG5(35)}\n${NQ}\nfor (let id = S.pendingStory(s); id && id !== 'ngoQuyen'; id = S.pendingStory(s)) S.markStory(s, id);`,
    giuTruyen: true,
    sau: `document.querySelector('[data-act=storyNext]').click(); document.querySelector('[data-act=storyNext]').click();`,
  },
  'nq-dien': {
    mo: 'Kinh đô chương 5, bốn tướng dã ngoại đã về: nhìn sân chầu Điện từ phía cổng, Ngô Quyền ở chỗ 17 (cột ngoài bên trái, gần cổng)',
    truoc: `${CHUONG5(35)}\n${NQ}`,
    sau: `const b = s.buildings.find((x) => x.type === 'dien'); const { courtSlot } = await import('/src/render/congTrinh/dien.ts'); const c = courtSlot('ngoQuyen'); const R = await import('/src/game/map.ts'); const t = R.turnLocal(b.rot, c.x, c.z); d.camera(b.x + 5 + t.x, b.z + 5 + t.z, 4.2);`,
  },
  'ltk': {
    mo: 'Lý Thường Kiệt đã về, đội Lý Thường Kiệt, Ngô Quyền, Mai Thúc Loan ra map 10 khu 3, sau 4 giây bấm Nam quốc sơn hà',
    truoc: `${CHUONG5(35)}\n${LTK}\ns.daNgoai.doi = ['lyThuongKiet', 'ngoQuyen', 'maiThucLoan'];`,
    sau: `d.daNgoai(10, 2); await new Promise((r) => setTimeout(r, 4000)); d.skill('namQuoc'); await new Promise((r) => setTimeout(r, 700));`,
    doi: 300,
  },
  'ltk-tui': {
    mo: 'Lý Thường Kiệt đã về, mặc đủ bộ Như Nguyệt: bảng tướng, thẻ Túi đồ của Lý Thường Kiệt',
    truoc: `${CHUONG5(35)}\n${LTK}\nconst T = await import('/src/game/trangBi.ts'); const co = new Set(); for (let q = 0; co.size < 4; q++) { const m = T.rutMon(q, 'daBoss', 5, ['nhuNguyet'], [0, 0, 0, 100]); if (co.has(m.o)) continue; co.add(m.o); s.trangBi.kho.push({ ...m, cuong: 6, id: s.trangBi.nextId++, tuong: 'lyThuongKiet' }); }`,
    sau: `d.tuong('lyThuongKiet');`,
  },
  'ltk-truyen': {
    mo: 'Vừa hạ Quách Quỳ lần đầu: đoạn truyện Lý Thường Kiệt về, thẻ thứ tư (bài thơ Nam quốc sơn hà)',
    truoc: `${CHUONG5(35)}\n${LTK}\nfor (let id = S.pendingStory(s); id && id !== 'lyThuongKiet'; id = S.pendingStory(s)) S.markStory(s, id);`,
    giuTruyen: true,
    sau: `for (let i = 0; i < 3; i++) document.querySelector('[data-act=storyNext]').click();`,
  },
  'ltk-dien': {
    mo: 'Kinh đô chương 5, năm tướng dã ngoại đã về: nhìn sân chầu Điện, Lý Thường Kiệt ở chỗ 14 (ngoài cùng hàng ngai bên phải, cạnh Bà Triệu)',
    truoc: `${CHUONG5(35)}\n${LTK}`,
    sau: `const b = s.buildings.find((x) => x.type === 'dien'); const { courtSlot } = await import('/src/render/congTrinh/dien.ts'); const c = courtSlot('lyThuongKiet'); const R = await import('/src/game/map.ts'); const t = R.turnLocal(b.rot, c.x, c.z); d.camera(b.x + 5 + t.x, b.z + 5 + t.z, 4.2);`,
  },
  'dien-da': {
    mo: 'Kinh đô chương 5, năm tướng dã ngoại đã về: nhìn cả sân chầu Điện từ phía cổng',
    truoc: `${CHUONG5(35)}\n${LTK}`,
    sau: `const b = s.buildings.find((x) => x.type === 'dien'); d.camera(b.x + 5, b.z + 6.5, 5.5);`,
  },
  'ba-trieu-dien': {
    mo: 'Kinh đô chương 5, Bà Triệu đã về: nhìn sân chầu Điện, Bà Triệu đứng hàng gần cổng bên trái',
    truoc: `${CHUONG5(35)}\n${BA_TRIEU}`,
    sau: `const b = s.buildings.find((x) => x.type === 'dien'); const { courtSlot } = await import('/src/render/congTrinh/dien.ts'); const c = courtSlot('baTrieu'); const R = await import('/src/game/map.ts'); const t = R.turnLocal(b.rot, c.x, c.z); d.camera(b.x + 5 + t.x, b.z + 5 + t.z, 4.2);`,
  },
  'da-ngoai-7': {
    mo: 'Như da-ngoai-tran, ở map 7 (Đầm Dạ Trạch) khu 3 (lính khiên Lương), chụp sau 6 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];\ns.hinted.push('daNgoai6', 'daNgoai7', 'daNgoai8', 'daNgoai9', 'daNgoai10');`,
    sau: `d.daNgoai(7, 2);`,
    doi: 6000,
  },
  'da-ngoai-7-boss': {
    mo: 'Như da-ngoai-boss, map 7 (Đầm Dạ Trạch), đội đứng sát khu boss (Trần Bá Tiên), chụp sau 3 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];\ns.hinted.push('daNgoai6', 'daNgoai7', 'daNgoai8', 'daNgoai9', 'daNgoai10');`,
    sau: `d.daNgoai(7, 4, 70);`,
    doi: 3000,
  },
  'da-ngoai-8': {
    mo: 'Như da-ngoai-tran, ở map 8 (Núi Vệ) khu 3 (lính giáo Đường), chụp sau 6 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];\ns.hinted.push('daNgoai6', 'daNgoai7', 'daNgoai8', 'daNgoai9', 'daNgoai10');`,
    sau: `d.daNgoai(8, 2);`,
    doi: 6000,
  },
  'da-ngoai-8-boss': {
    mo: 'Như da-ngoai-boss, map 8 (Núi Vệ), đội đứng sát khu boss (Dương Tư Húc), chụp sau 3 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];\ns.hinted.push('daNgoai6', 'daNgoai7', 'daNgoai8', 'daNgoai9', 'daNgoai10');`,
    sau: `d.daNgoai(8, 4, 80);`,
    doi: 3000,
  },
  'da-ngoai-9': {
    mo: 'Như da-ngoai-tran, ở map 9 (Bạch Đằng) khu 3 (lính thủy Nam Hán), chụp sau 6 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];\ns.hinted.push('daNgoai6', 'daNgoai7', 'daNgoai8', 'daNgoai9', 'daNgoai10');`,
    sau: `d.daNgoai(9, 2);`,
    doi: 6000,
  },
  'da-ngoai-9-boss': {
    mo: 'Như da-ngoai-boss, map 9 (Bạch Đằng), đội đứng sát khu boss (Lưu Hoằng Tháo), chụp sau 3 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];\ns.hinted.push('daNgoai6', 'daNgoai7', 'daNgoai8', 'daNgoai9', 'daNgoai10');`,
    sau: `d.daNgoai(9, 4, 90);`,
    doi: 3000,
  },
  'da-ngoai-10': {
    mo: 'Như da-ngoai-tran, ở map 10 (sông Như Nguyệt) khu 3 (lính thương Tống), chụp sau 6 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];\ns.hinted.push('daNgoai6', 'daNgoai7', 'daNgoai8', 'daNgoai9', 'daNgoai10');`,
    sau: `d.daNgoai(10, 2);`,
    doi: 6000,
  },
  'da-ngoai-10-boss': {
    mo: 'Như da-ngoai-boss, map 10 (sông Như Nguyệt), đội đứng sát khu boss (Quách Quỳ), chụp sau 3 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];\ns.hinted.push('daNgoai6', 'daNgoai7', 'daNgoai8', 'daNgoai9', 'daNgoai10');`,
    sau: `d.daNgoai(10, 4, 100);`,
    doi: 3000,
  },
  'da-ngoai-boss': {
    mo: 'Như da-ngoai-tran, map 3 (Đồi Thất Diệu, đêm), đội đứng sát khu boss (gà trắng), chụp sau 3 giây',
    truoc: `${CHUONG5(35)}\ns.daNgoai.doi = ['trungTrac', 'trungNhi', 'caoLo'];`,
    sau: `d.daNgoai(3, 4, 30);`,
    doi: 3000,
  },
  'pho-ban-5': {
    mo: 'Hai Bà Trưng đánh màn 36 (thành Luy Lâu, có Tô Định) ngoài bãi, chụp sau 4 giây',
    truoc: CHUONG5(35),
    sau: `const r = d.march(36); if (!r.ok) throw new Error('Không đánh màn 36 được: ' + r.reason);`,
    doi: 4000,
  },
  'dao-bang': {
    mo: 'Điện 10, Mã Viện đã sang, đồn Hoàng Sa có quân, vừa giữ được một đợt giặc: bảng quần đảo, phần Giặc đánh đảo',
    truoc: DAO_GIAC,
    sau: `d.daoTran('hoangSa'); d.quanDao('hoangSa'); const cuon = setInterval(() => document.querySelector('.sheet-body')?.scrollTo(0, 99999), 200); setTimeout(() => clearInterval(cuon), 6000);`,
  },
  'dao-tran': {
    mo: 'Như dao-bang, đang xem lại trận giặc đánh đảo Hoàng Sa (chụp sau 8 giây)',
    truoc: DAO_GIAC,
    sau: `d.daoTran('hoangSa'); d.xemDao('hoangSa');`,
    doi: 8000,
  },
  'dao-bao': {
    mo: 'Như dao-bang, thuyền giặc Hán áp sát đảo Hoàng Sa (còn 2 phút): dòng tin, lửa hiệu đồn cháy',
    truoc: `${DAO_GIAC} s.dao.hoangSa.sau = s.clock + 120_000;`,
    sau: `d.camera(100, 70, 1.3);`,
  },
  'dao-hu': {
    mo: 'Như dao-bang, đồn Hoàng Sa thất thủ: đồn hư bốc khói, dòng tin báo, bảng quần đảo có nút Sửa đồn',
    truoc: `${DAO_GIAC} s.dao.hoangSa.linh = { giao: 2, cung: 0, voi: 0, no: 0 };`,
    sau: `d.daoTran('hoangSa'); d.camera(100, 70, 1.3);`,
  },
};

const GIUP = `Chụp thử Thời đại Văn Lang ở khổ điện thoại.

  node scripts/chup.mjs [cảnh ...] [tùy chọn]

Cảnh có sẵn (mặc định: dau):
${Object.entries(CANH)
  .map(([k, c]) => `  ${k.padEnd(15)} ${c.mo}`)
  .join('\n')}

Tùy chọn:
  --khung doc,fold,ngang,bang  Khổ màn hình, cách nhau dấu phẩy (mặc định: doc = 390×844; fold = 344×882)
  --truoc "<mã>"          Chạy thêm trong trang trước khi tải lại, để dựng state
  --sau "<mã>"            Chạy thêm trong trang sau khi tải lại, để bấm trận, kỹ năng...
                          Mã có sẵn d (window.__debug), s (state), G (game.ts), M (moPhong.ts),
                          D (defs.ts), C (campaign.ts), S (story.ts), X (mau.ts), K (khoanh.ts), B (benKia.ts)
  --cam x,z,zoom          Đặt camera nhìn vào ô (x, z)
  --cham <x,z | loại>     Chạm một ô, hoặc công trình đầu tiên thuộc loại đó (vd: dien, ruong): hiện vòng nút; thêm --bam "[data-act=openInfo]" để mở bảng
  --bam "<bộ chọn>"       Bấm một phần tử giao diện (CSS, hoặc text=Chữ trên nút)
  --doi <ms>              Chờ thêm trước khi chụp (mặc định 1200, cảnh trận chờ lâu hơn)
  --ten <tên>             Tên ảnh (mặc định: tên cảnh)
  --ra <thư mục>          Nơi lưu ảnh (mặc định: chup/)
  --dpr <số>              Mật độ điểm ảnh (mặc định 2, như điện thoại thật)
  --gio <buổi | số | that>  Giờ trong ngày ở kinh đô: ngay, chieu, dem, rang, hay phần của ngày (0 tới 1); that thì
                          theo đồng hồ chơi. Mặc định cảnh nào ghim giờ nấy, không ghi thì ban ngày (ảnh cũ không đổi)
  --loat <số>,<ms>        Chụp một loạt <số> ảnh, mỗi ảnh cách <ms> (xem hiệu ứng kỹ năng theo từng lúc); ảnh thêm đuôi -1, -2...
  --url <địa chỉ>         Dùng server Vite đang chạy (npm run dev) thay vì tự bật
  --giup                  Hiện hướng dẫn này

Ví dụ:
  node scripts/chup.mjs kinh-do --cham dien
  node scripts/chup.mjs chuong2 --khung doc,ngang
  node scripts/chup.mjs dau --truoc "s.resources.gao = 5000" --bam "text=Phó bản"

Ảnh lưu ở chup/<tên>-<khung>.png. Lỗi JavaScript trong trang được in ra cuối cùng.`;

function docThamSo(argv) {
  const opts = { canh: [], khung: ['doc'], ra: 'chup', dpr: 2 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Thiếu giá trị sau ${a}`);
      return argv[++i];
    };
    if (a === '--giup' || a === '-h' || a === '--help') opts.giup = true;
    else if (a === '--khung') opts.khung = next().split(',');
    else if (a === '--truoc') opts.truoc = next();
    else if (a === '--sau') opts.sau = next();
    else if (a === '--cam') opts.cam = next().split(',').map(Number);
    else if (a === '--cham') opts.cham = next();
    else if (a === '--bam') opts.bam = next();
    else if (a === '--doi') opts.doi = Number(next());
    else if (a === '--ten') opts.ten = next();
    else if (a === '--ra') opts.ra = next();
    else if (a === '--dpr') opts.dpr = Number(next());
    else if (a === '--url') opts.url = next();
    else if (a === '--gio') opts.gio = next();
    else if (a === '--loat') opts.loat = next().split(',').map(Number);
    else if (a.startsWith('--')) throw new Error(`Không hiểu tùy chọn ${a}`);
    else opts.canh.push(a);
  }
  if (!opts.canh.length) opts.canh = ['dau'];
  for (const c of opts.canh) if (!CANH[c]) throw new Error(`Không có cảnh "${c}". Các cảnh: ${Object.keys(CANH).join(', ')}`);
  for (const k of opts.khung) if (!KHUNG[k]) throw new Error(`Không có khung "${k}". Các khung: ${Object.keys(KHUNG).join(', ')}`);
  if (opts.ten && opts.canh.length > 1) throw new Error('--ten chỉ dùng khi chụp một cảnh');
  if (opts.gio !== undefined && !['ngay', 'chieu', 'dem', 'rang', 'that'].includes(opts.gio) && !(Number(opts.gio) >= 0 && Number(opts.gio) <= 1)) {
    throw new Error(`--gio phải là ngay, chieu, dem, rang, that hay một số từ 0 tới 1 (nhận "${opts.gio}")`);
  }
  return opts;
}

export function napPlaywright() {
  for (const name of ['playwright', '@playwright/test']) {
    try {
      return require(name);
    } catch {
      // thử tên khác
    }
  }
  console.error('Không tìm thấy Playwright. Cài bằng: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

/** Chạy một đoạn mã trong trang với các biến d, s, G, M, D, C, S, X, K, B. */
export async function chayMa(page, ma) {
  if (!ma.trim()) return;
  await page.evaluate(async (ma) => {
    const urls = ['/src/game/game.ts', '/src/game/moPhong.ts', '/src/game/defs.ts', '/src/game/campaign.ts', '/src/game/story.ts', '/src/game/mau.ts', '/src/game/khoanh.ts', '/src/game/benKia.ts'];
    const [G, M, D, C, S, X, K, B] = await Promise.all(urls.map((u) => import(/* @vite-ignore */ u)));
    const d = window.__debug;
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction('d', 's', 'G', 'M', 'D', 'C', 'S', 'X', 'K', 'B', ma)(d, d.state(), G, M, D, C, S, X, K, B);
  }, ma);
}

export async function choGame(page) {
  await page.waitForFunction(() => window.__debug || document.querySelector('.fatal'), null, { timeout: 30000 });
  const fatal = await page.locator('.fatal').count();
  if (fatal) throw new Error(`Game không chạy được: ${await page.locator('.fatal').innerText()}`);
}

async function cham(page, dich) {
  const so = dich.split(',').map(Number);
  const o = so.length === 2 && so.every(Number.isFinite)
    ? { x: so[0], z: so[1] }
    : await page.evaluate((type) => {
        const b = window.__debug.state().buildings.find((b) => b.type === type);
        return b ? { x: b.x, z: b.z } : null;
      }, dich);
  if (!o) throw new Error(`Kinh đô chưa có công trình loại "${dich}"`);
  const p = await page.evaluate(({ x, z }) => window.__debug.tileToScreen(x, z), o);
  await page.touchscreen.tap(p.x, p.y);
}

/**
 * Dựng cảnh `tenCanh` trên `page`: mở game, chạy `truoc` (cảnh và `opts.truoc`), tải lại, ghim giờ, bấm qua màn hình vào
 * game, chạy `sau`, đặt camera, chạm, bấm, chờ rồi chạy `truocKhiChup`. `moc.sauTaiLai`, `moc.sauKhiVao` chạy ngay sau
 * khi tải lại và ngay sau khi vào game (đo lag bật làm chậm CPU, bắt đầu ghi khung ở đó).
 */
export async function dungCanh(page, url, tenCanh, opts, moc = {}) {
  const canh = CANH[tenCanh];
  await page.goto(url, { waitUntil: 'load' });
  await choGame(page);

  // Dựng state, đánh dấu các đoạn truyện đã xem (trừ cảnh muốn xem truyện), lưu rồi tải lại cho giao diện sạch.
  const truoc = [canh.truoc, opts.truoc ?? ''].join('\n');
  const dongTruyen = canh.giuTruyen ? '' : 'for (let id; (id = S.pendingStory(s)); ) S.markStory(s, id);';
  await chayMa(page, `${truoc}\n${dongTruyen}\ns.lastSeen = Date.now() - ${canh.vang ?? 0}; d.advance(0);`);
  await page.reload({ waitUntil: 'load' });
  await choGame(page);
  await moc.sauTaiLai?.();
  // Ghim giờ trong ngày trước cả màn hình vào game: người chơi mô phỏng chơi cả giờ nên đồng hồ rơi vào giờ bất kỳ.
  const gio = opts.gio ?? canh.gio ?? 'ngay';
  if (gio !== 'that') await page.evaluate((g) => window.__debug.gio(Number.isNaN(Number(g)) ? g : Number(g)), gio);
  if (!canh.giuManVao) await page.evaluate(() => window.__debug.enter());
  await moc.sauKhiVao?.();
  await page.waitForTimeout(800);

  await chayMa(page, [canh.sau ?? '', opts.sau ?? ''].join('\n'));
  if (opts.cam) await page.evaluate(([x, z, zoom]) => window.__debug.camera(x, z, zoom), opts.cam);
  if (opts.cham) {
    await page.waitForTimeout(300);
    await cham(page, opts.cham);
  }
  if (opts.bam) await page.locator(opts.bam).first().click({ timeout: 5000 });
  await page.waitForTimeout(opts.doi ?? canh.doi ?? 1200);
  if (canh.truocKhiChup && !opts.cam) {
    await chayMa(page, canh.truocKhiChup);
    await page.waitForTimeout(300);
  }
}

/**
 * Bật Vite ở cổng 5199 (hay dùng `url` của server đang chạy). Trả địa chỉ game và hàm tắt server. Tắt HMR: sửa code
 * lúc đang chụp, đang đo thì trang không tự tải lại giữa chừng.
 */
export async function batVite(url) {
  if (url) return { url, tat: async () => {} };
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { host: '127.0.0.1', port: 5199, hmr: false } });
  await server.listen();
  return { url: server.resolvedUrls.local[0], tat: () => server.close() };
}

async function chupMotCanh(browser, url, tenCanh, khung, opts) {
  const ctx = await browser.newContext({
    viewport: KHUNG[khung],
    deviceScaleFactor: opts.dpr,
    isMobile: true,
    hasTouch: true,
    locale: 'vi-VN',
  });
  const page = await ctx.newPage();
  const loi = [];
  page.on('pageerror', (e) => loi.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') loi.push(`console.error: ${m.text()}`);
  });
  try {
    await dungCanh(page, url, tenCanh, opts);
    const file = path.join(opts.ra, `${opts.ten ?? tenCanh}-${khung}.png`);
    if (opts.loat) {
      const [n, ms] = opts.loat;
      for (let i = 1; i <= n; i++) {
        await page.screenshot({ path: file.replace(/\.png$/, `-${i}.png`) });
        if (i < n) await page.waitForTimeout(ms);
      }
    } else await page.screenshot({ path: file });
    const info = await page.evaluate(() => window.__debug.renderInfo());
    return { file, info, loi };
  } catch (e) {
    return { file: null, info: null, loi: [...loi, `lỗi khi dựng cảnh: ${e.message}`] };
  } finally {
    await ctx.close();
  }
}

async function main() {
  let opts;
  try {
    opts = docThamSo(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  if (opts.giup) {
    console.log(GIUP);
    return;
  }
  opts.ra = path.resolve(ROOT, opts.ra);
  await mkdir(opts.ra, { recursive: true });

  const { chromium } = napPlaywright();
  const { url, tat } = await batVite(opts.url);

  const browser = await chromium.launch();
  let coLoi = false;
  try {
    for (const tenCanh of opts.canh) {
      for (const khung of opts.khung) {
        const r = await chupMotCanh(browser, url, tenCanh, khung, opts);
        if (r.file) {
          const draw = r.info ? ` (${r.info.calls} lệnh vẽ, ${r.info.triangles} tam giác)` : '';
          console.log(`Đã chụp ${path.relative(ROOT, r.file)}${draw}`);
        } else {
          console.log(`Không chụp được ${tenCanh}-${khung}`);
        }
        for (const l of r.loi) console.log(`  ! ${l}`);
        coLoi ||= r.loi.length > 0 || !r.file;
      }
    }
  } finally {
    await browser.close();
    await tat();
  }
  if (coLoi) process.exitCode = 1;
}

// Chạy thẳng script này thì chụp; do-lag.mjs nạp vào chỉ để lấy cảnh.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
