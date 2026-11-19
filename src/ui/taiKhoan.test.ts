// Canh khối tài khoản Google ở ba chỗ: màn hình vào game (`tkHtml`), bảng Cài đặt (`cloudSettingsHtml`) và thẻ Đấu
// thật: nút nào hiện ở trạng thái nào, và việc nào phải bấm hai lần.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../game/game';
import type { TomTat } from '../game/manVao';

const U1 = '11111111-1111-4111-8111-111111111111';

/** localStorage giả, có sẵn phiên đăng nhập `phien` (hay chưa đăng nhập). */
function may(phien: { uid: string; google?: boolean; email?: string } | null) {
  const kho = new Map<string, string>();
  if (phien) kho.set('tdvl-dau-thanh-phien', JSON.stringify({ access: 'a', refresh: 'r', het: Date.now() + 3_600_000, ...phien }));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => kho.get(k) ?? null,
    setItem: (k: string, v: string) => void kho.set(k, v),
    removeItem: (k: string) => void kho.delete(k),
  });
}

async function nap() {
  vi.resetModules();
  return { dau: await import('./dauThanh'), mv: await import('./manVao'), vi: (await import('../text/vi')).vi };
}

const acts = (html: string) => [...html.matchAll(/data-act="(\w+)"/g)].map((m) => m[1]);

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://thu.supabase.co');
  vi.stubEnv('VITE_SUPABASE_KEY', 'sb_publishable_thu');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('mục Tài khoản Google ở Cài đặt', () => {
  it('máy chủ chưa bật Google thì không hiện gì; bản game không có máy chủ cũng vậy', async () => {
    may(null);
    const { dau } = await nap();
    const s = createInitialState(0);
    expect(dau.cloudSettingsHtml(s, null)).toBe('');
    dau.dauTaiKhoan.coGoogle = false;
    expect(dau.cloudSettingsHtml(s, null)).toBe('');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    const khong = (await nap()).dau;
    khong.dauTaiKhoan.coGoogle = true;
    expect(khong.cloudSettingsHtml(s, null)).toBe('');
  });

  it('chơi ngay, chưa tham gia Đấu thành: có nút Gắn Google', async () => {
    may(null);
    const { dau, vi: v } = await nap();
    dau.dauTaiKhoan.coGoogle = true;
    const html = dau.cloudSettingsHtml(createInitialState(0), null);
    expect(acts(html)).toEqual(['mayGoogle']);
    expect(html).toContain(v.dauThanh.googleIntroNew);
    expect(html).toContain(v.dauThanh.cloudSettingsTitle);
  });

  it('đã tham gia Đấu thành bằng người dùng ẩn danh: lời giới thiệu nói giữ chiến công', async () => {
    may({ uid: U1 });
    const { dau, vi: v } = await nap();
    dau.dauTaiKhoan.coGoogle = true;
    const s = createInitialState(0);
    s.dauThanh = { uid: U1, ten: 'Lạc', chienCong: 0, khienDen: 0, daTru: [], daNhan: [] };
    const html = dau.cloudSettingsHtml(s, null);
    expect(acts(html)).toEqual(['mayGoogle']);
    expect(html).toContain(v.dauThanh.googleIntro);
  });

  it('tài khoản Google đã có kinh đô khác: báo lỗi và cho đăng nhập thẳng vào tài khoản ấy', async () => {
    may({ uid: U1 });
    const { dau, vi: v } = await nap();
    dau.dauTaiKhoan.coGoogle = true;
    dau.dauTaiKhoan.loiGoogle = 'identity_already_exists';
    const html = dau.cloudSettingsHtml(createInitialState(0), null);
    expect(acts(html)).toEqual(['mayGoogle', 'mayGoogleIn']);
    expect(html).toContain(v.dauThanh.googleErr.identity_already_exists);
    dau.dauTaiKhoan.loiGoogle = 'access_denied';
    expect(acts(dau.cloudSettingsHtml(createInitialState(0), null))).toEqual(['mayGoogle']);
  });

  it('đã gắn Google: lưu lên mây và đăng xuất, dù máy chủ chưa trả lời có bật Google không', async () => {
    may({ uid: U1, google: true, email: 'lac@gmail.test' });
    const { dau } = await nap();
    const html = dau.cloudSettingsHtml(createInitialState(0), null);
    expect(acts(html)).toEqual(['maySave', 'mayOut']);
    expect(html).toContain('lac@gmail.test');
    expect(html).not.toContain('data-de');
  });

  it('bản trên mây khác bản ở máy này: tải về hay ghi đè, nút vừa bấm một lần thì hiện lời hỏi lại', async () => {
    may({ uid: U1, google: true, email: 'lac@gmail.test' });
    const { dau, vi: v } = await nap();
    Object.assign(dau.dauTaiKhoan, { coGoogle: true, lech: true, may: { ban: 3, dien: 7, luc: 0 } });
    const s = createInitialState(0);
    const html = dau.cloudSettingsHtml(s, null);
    expect(acts(html)).toEqual(['mayLoad', 'maySave', 'mayOut']);
    expect(html).toContain('data-de="1"');
    expect(html).toContain(v.dauThanh.cloudDiff);
    expect(html).not.toContain(v.dauThanh.cloudLoadConfirm);
    expect(dau.cloudSettingsHtml(s, 'tai')).toContain(v.dauThanh.cloudLoadConfirm);
    expect(dau.cloudSettingsHtml(s, 'tai')).not.toContain(v.dauThanh.cloudOverwriteConfirm);
    expect(dau.cloudSettingsHtml(s, 'de')).toContain(v.dauThanh.cloudOverwriteConfirm);
  });
});

describe('khối tài khoản ở màn hình vào game', () => {
  const moi: TomTat = { moi: true, chapter: 1, dien: 1, dan: 0, vang: 0, hetTruyen: false };
  const cu: TomTat = { ...moi, moi: false, dien: 5 };
  const tk = { google: null, lech: null, bao: null, loi: null, khac: false, ban: null };

  it('chưa đăng nhập: nút Đăng nhập Google và lời nhắc chơi ngay thì gắn sau trong Cài đặt', async () => {
    may(null);
    const { mv, vi: v } = await nap();
    const html = mv.tkHtml(moi, tk, false);
    expect(acts(html)).toEqual(['google']);
    expect(html).toContain(v.manVao.googleNoteNew);
    expect(v.manVao.googleNoteNew).toContain('Cài đặt');
    expect(mv.tkHtml(cu, tk, false)).toContain(v.manVao.googleNote);
    expect(v.manVao.googleNote).toContain('Cài đặt');
  });

  it('đang mở trang Google thì nút khóa; tài khoản đã có kinh đô khác thì thêm nút đăng nhập tài khoản ấy', async () => {
    may(null);
    const { mv, vi: v } = await nap();
    const dangMo = mv.tkHtml(cu, { ...tk, ban: 'google' }, false);
    expect(dangMo).toContain('disabled');
    expect(dangMo).toContain(v.manVao.googleOpening);
    const trung = mv.tkHtml(cu, { ...tk, loi: 'Lỗi <b>', khac: true }, false);
    expect(acts(trung)).toEqual(['google', 'googleIn']);
    expect(trung).toContain('Lỗi &lt;b&gt;');
  });

  it('đã đăng nhập: hiện email; bản trên mây khác bản ở máy này thì có nút tải về', async () => {
    may(null);
    const { mv, vi: v } = await nap();
    const xong = mv.tkHtml(cu, { ...tk, google: { email: 'lac@gmail.test' }, bao: 'Đã lưu' }, false);
    expect(acts(xong)).toEqual([]);
    expect(xong).toContain('lac@gmail.test');
    expect(xong).toContain('Đã lưu');
    const lech = { ...tk, google: { email: null }, lech: { dien: 7, luc: '21:05 ngày 9/11' } };
    const html = mv.tkHtml(cu, lech, false);
    expect(acts(html)).toEqual(['load']);
    expect(html).toContain('Điện cấp 7');
    expect(html).not.toContain(v.manVao.cloudLoadConfirm);
    expect(mv.tkHtml(cu, lech, true)).toContain(v.manVao.cloudLoadConfirm);
  });
});
