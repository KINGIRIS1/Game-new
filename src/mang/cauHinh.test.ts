// Canh phần đọc phiên Supabase Auth trả về sau khi người chơi qua trang Google (PR 6): đọc thân JWT, đọc phiên hay
// lỗi sau dấu # của địa chỉ, và chỉ nhận phiên khi chính máy này vừa bấm nút Google.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const b64u = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const jwt = (body: Record<string, unknown>) => `${b64u('{"alg":"HS256"}')}.${b64u(JSON.stringify(body))}.chu-ky`;
const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';

/** Trình duyệt giả: địa chỉ trang, localStorage, history.replaceState. */
function trinhDuyet(hash: string, search = '') {
  const kho = new Map<string, string>();
  const loc = { hash, search, pathname: '/Game-new/', origin: 'https://kingiris1.github.io' };
  const thay = vi.fn((_s: unknown, _t: string, url: string) => {
    loc.hash = '';
    loc.search = url.includes('?') ? url.slice(url.indexOf('?')) : '';
  });
  vi.stubGlobal('location', loc);
  vi.stubGlobal('history', { replaceState: thay });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => kho.get(k) ?? null,
    setItem: (k: string, v: string) => void kho.set(k, v),
    removeItem: (k: string) => void kho.delete(k),
  });
  return { kho, loc, thay };
}

async function nap() {
  vi.resetModules();
  return await import('./cauHinh');
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://thu.supabase.co');
  vi.stubEnv('VITE_SUPABASE_KEY', 'sb_publishable_thu');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('phiên Google trả về', () => {
  it('đọc thân JWT có dấu tiếng Việt; chuỗi không phải JWT thì null', async () => {
    const m = await nap();
    expect(m.docJwt(jwt({ sub: U1, ten: 'Lạc Long Quân' }))).toEqual({ sub: U1, ten: 'Lạc Long Quân' });
    expect(m.docJwt('abc')).toBeNull();
    expect(m.docJwt('a.b.c')).toBeNull();
    expect(m.docJwt(`a.${b64u('[1]')}.c`)).toBeNull();
  });

  it('phiên từ token: người dùng, đã gắn Google, email; token của người ẩn danh thì chưa gắn', async () => {
    const m = await nap();
    const p = m.phienTuToken(jwt({ sub: U1, is_anonymous: false, email: 'lac@gmail.test' }), 'r1', 3600, 1000)!;
    expect([p.uid, p.google, p.email, p.het, p.refresh]).toEqual([U1, true, 'lac@gmail.test', 3_601_000, 'r1']);
    const an = m.phienTuToken(jwt({ sub: U1, is_anonymous: true, email: '' }), 'r1', NaN, 0)!;
    expect([an.google, an.email, an.het]).toEqual([false, null, 3_600_000]);
    expect(m.phienTuToken(jwt({ sub: 'không phải uuid' }), 'r1', 3600, 0)).toBeNull();
    expect(m.phienTuToken(jwt({ sub: U1 }), '', 3600, 0)).toBeNull();
  });

  it('đọc địa chỉ trả về: phiên sau dấu #, lỗi sau dấu # hay dấu ?, địa chỉ thường thì null', async () => {
    const m = await nap();
    const t = jwt({ sub: U1, is_anonymous: false, email: 'lac@gmail.test' });
    const ok = m.docTraVe(`#access_token=${t}&refresh_token=r1&expires_in=3600&token_type=bearer&provider_token=bi-mat`, '', 0);
    expect(ok && 'phien' in ok && [ok.phien.uid, ok.phien.google]).toEqual([U1, true]);
    expect(JSON.stringify(ok)).not.toContain('bi-mat');
    expect(m.docTraVe('#error=server_error&error_code=identity_already_exists&error_description=x', '', 0)).toEqual({ loi: 'identity_already_exists' });
    expect(m.docTraVe('', '?error=access_denied&error_description=x', 0)).toEqual({ loi: 'access_denied' });
    expect(m.docTraVe('#access_token=hong&refresh_token=r', '', 0)).toEqual({ loi: 'phien' });
    expect(m.docTraVe('', '', 0)).toBeNull();
    expect(m.docTraVe('#chuong-2', '?x=1', 0)).toBeNull();
  });

  it('gắn Google: máy này vừa bấm nút và phiên mới là của đúng người dùng đang có thì cất, xóa phiên khỏi địa chỉ', async () => {
    const t = jwt({ sub: U1, is_anonymous: false, email: 'lac@gmail.test' });
    const { kho, thay } = trinhDuyet(`#access_token=${t}&refresh_token=r2&expires_in=3600`);
    const m = await nap();
    kho.set(m.PHIEN_KEY, JSON.stringify({ access: 'cu', refresh: 'r1', het: 1, uid: U1 }));
    kho.set(m.GOOGLE_CHO_KEY, `gan:${Date.now()}`);
    expect(m.nhanGoogle()).toEqual({ kieu: 'gan', email: 'lac@gmail.test' });
    expect(thay).toHaveBeenCalledWith(null, '', '/Game-new/');
    expect(kho.has(m.GOOGLE_CHO_KEY)).toBe(false);
    expect(m.taiKhoanMay()).toEqual({ uid: U1, google: true, email: 'lac@gmail.test' });
    expect(m.docPhien()?.refresh).toBe('r2');
  });

  it('gắn Google mà phiên trả về là của người khác thì không nhận, giữ phiên cũ', async () => {
    const t = jwt({ sub: U2, is_anonymous: false, email: 'khac@gmail.test' });
    const { kho } = trinhDuyet(`#access_token=${t}&refresh_token=r2&expires_in=3600`);
    const m = await nap();
    kho.set(m.PHIEN_KEY, JSON.stringify({ access: 'cu', refresh: 'r1', het: 1, uid: U1 }));
    kho.set(m.GOOGLE_CHO_KEY, `gan:${Date.now()}`);
    expect(m.nhanGoogle()).toEqual({ kieu: 'gan', loi: 'khacNguoi' });
    expect(m.uidMay()).toBe(U1);
    expect(m.taiKhoanMay()?.google).toBe(false);
  });

  it('đăng nhập ở máy mới: nhận phiên của người đã gắn Google', async () => {
    const t = jwt({ sub: U2, is_anonymous: false, email: 'lac@gmail.test' });
    const { kho } = trinhDuyet(`#access_token=${t}&refresh_token=r9&expires_in=3600`);
    const m = await nap();
    kho.set(m.GOOGLE_CHO_KEY, `vao:${Date.now()}`);
    expect(m.nhanGoogle()).toEqual({ kieu: 'vao', email: 'lac@gmail.test' });
    expect(m.uidMay()).toBe(U2);
  });

  it('đường dẫn lạ có sẵn phiên (máy này không bấm nút Google): không nhận, vẫn xóa phiên khỏi địa chỉ', async () => {
    const t = jwt({ sub: U2, is_anonymous: false, email: 'ke-gian@gmail.test' });
    const { kho, thay } = trinhDuyet(`#access_token=${t}&refresh_token=r9&expires_in=3600`);
    const m = await nap();
    kho.set(m.PHIEN_KEY, JSON.stringify({ access: 'cu', refresh: 'r1', het: 1, uid: U1 }));
    expect(m.nhanGoogle()).toBeNull();
    expect(thay).toHaveBeenCalled();
    expect(m.uidMay()).toBe(U1);
  });

  it('dấu chờ quá hạn (bấm nút Google rồi bỏ dở từ lâu) hay sai dạng: không nhận phiên', async () => {
    const t = jwt({ sub: U2, is_anonymous: false, email: 'ke-gian@gmail.test' });
    for (const cho of ['vao', 'vao:abc', `vao:${Date.now() - 16 * 60_000}`, `vao:${Date.now() + 60_000}`, `khac:${Date.now()}`]) {
      const { kho } = trinhDuyet(`#access_token=${t}&refresh_token=r9&expires_in=3600`);
      const m = await nap();
      kho.set(m.GOOGLE_CHO_KEY, cho);
      expect(m.nhanGoogle(), cho).toBeNull();
      expect(m.uidMay(), cho).toBeNull();
      expect(kho.has(m.GOOGLE_CHO_KEY), cho).toBe(false);
    }
  });

  it('Google báo lỗi: trả mã lỗi, bỏ tham số lỗi khỏi địa chỉ, giữ tham số khác; địa chỉ thường thì không đụng', async () => {
    const a = trinhDuyet('#error=server_error&error_code=identity_already_exists', '?error=server_error&error_code=identity_already_exists&x=1');
    let m = await nap();
    a.kho.set(m.GOOGLE_CHO_KEY, `gan:${Date.now()}`);
    expect(m.nhanGoogle()).toEqual({ kieu: 'gan', loi: 'identity_already_exists' });
    expect(a.thay).toHaveBeenCalledWith(null, '', '/Game-new/?x=1');
    const b = trinhDuyet('', '');
    m = await nap();
    const cho = `vao:${Date.now()}`;
    b.kho.set(m.GOOGLE_CHO_KEY, cho);
    expect(m.nhanGoogle()).toBeNull();
    expect(b.thay).not.toHaveBeenCalled();
    expect(b.kho.get(m.GOOGLE_CHO_KEY)).toBe(cho);
  });

  it('bản game không có máy chủ thì không đọc gì', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    const { thay } = trinhDuyet(`#access_token=${jwt({ sub: U1 })}&refresh_token=r`);
    const m = await nap();
    expect(m.nhanGoogle()).toBeNull();
    expect(thay).not.toHaveBeenCalled();
  });

  it('bản lưu trên mây máy này biết: chỉ của đúng người dùng', async () => {
    trinhDuyet('');
    const m = await nap();
    m.ghiMayBiet({ uid: U1, ban: 3, luc: 99 });
    expect(m.mayBiet(U1)).toEqual({ uid: U1, ban: 3, luc: 99 });
    expect(m.mayBiet(U2)).toBeNull();
    m.ghiMayBiet(null);
    expect(m.mayBiet(U1)).toBeNull();
  });
});
