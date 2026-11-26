// Canh bản đồ Việt Nam (docs/thiet-ke.md mục Kế hoạch: bản đồ Việt Nam, 34 tỉnh, chức Bồ chính; PR 1): đủ 34 tỉnh
// khớp tệp hình; Hoàng Sa thuộc Đà Nẵng, Trường Sa thuộc Khánh Hòa; 18 tỉnh đất Văn Lang, 16 tỉnh chưa quy về; giáp
// biển, biên giới khớp viền ngoài tính từ hình; Bồ chính hải chỉ ở tỉnh giáp biển; chọn tỉnh mỗi mùa một lần, đổi chức
// chờ 24 giờ; bản lưu giữ phần này, sai dạng thì bỏ riêng phần ấy.

import { describe, expect, it } from 'vitest';
import { dienTich, giaiTopo, trongVong, type Topo } from './banDo';
import { VIET_NAM } from './defs';
import { createInitialState, type GameState } from './game';
import { deserialize, serialize } from './save';
import { setDien } from './testmap';
import {
  CHUC_IDS, DAT_VAN_LANG, GIAP_BIEN, GIAP_BIEN_GIOI, QUAN_DAO_TINH, TINH_IDS, choDoiChuc, chonChuc, chonTinh, chucCo,
  doiTinhDuoc, giapBien, isVietNamState, langGieng, laDatVanLang, muaCon, muaCua, vietNamMo, type TinhId,
} from './vietNam';
import { LANG_GIENG_HINH, SO_DAO, VIEN_NGOAI_KM } from './vietNamHinh';
import { vi } from '../text/vi';

const topo = Object.values(import.meta.glob('../../public/ban-do/34-tinh.json', { eager: true, import: 'default' }))[0] as Topo;
const hinh = giaiTopo(topo);
const hinhCua = (id: string) => hinh.find((h) => h.id === id)!;

/** Giữa 2026-11-23 (thứ Hai) giờ Việt Nam: đầu một tuần. */
const T0 = Date.UTC(2026, 10, 23, 5);
const GIO = 3_600_000;

function base(dien = 5): GameState {
  const s = createInitialState(0);
  setDien(s, dien);
  return s;
}

describe('34 tỉnh', () => {
  it('đủ 34 tỉnh, mã khớp tệp hình, tên khớp chữ ở vi.ts', () => {
    expect(TINH_IDS.length).toBe(34);
    expect(new Set(TINH_IDS).size).toBe(34);
    expect(hinh.map((h) => h.id).sort()).toEqual([...TINH_IDS].sort());
    for (const h of hinh) expect(vi.vietNam.tinh[h.id]).toBe(h.ten);
    // Mã 31 trong tệp nguồn ghi nhầm "Lạng Sơn": đã sửa thành Đồng Tháp, nằm ở đồng bằng sông Cửu Long.
    expect(hinhCua('31').ten).toBe('Đồng Tháp');
    expect(hinhCua('11').ten).toBe('Lạng Sơn');
    const pts = hinhCua('31').manh.flat(2);
    expect(Math.max(...pts.map((p) => p[1]))).toBeLessThan(11.1);
  });

  it('Hoàng Sa thuộc Đà Nẵng, Trường Sa thuộc Khánh Hòa, không tỉnh nào khác có đảo ở đó', () => {
    const coDao = (id: string, [x0, y0, x1, y1]: number[]) =>
      hinhCua(id).manh.some((m) => m[0].every(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1));
    const HS = [110.9, 15.5, 113, 17.3];
    const TS = [111.3, 6.8, 118, 12];
    for (const h of hinh) {
      expect(coDao(h.id, HS)).toBe(h.id === QUAN_DAO_TINH.hoangSa);
      expect(coDao(h.id, TS)).toBe(h.id === QUAN_DAO_TINH.truongSa);
    }
    expect(vi.vietNam.tinh[QUAN_DAO_TINH.hoangSa]).toBe('Đà Nẵng');
    expect(vi.vietNam.tinh[QUAN_DAO_TINH.truongSa]).toBe('Khánh Hòa');
    // Côn Đảo (đặc khu của TP. Hồ Chí Minh) có trên bản đồ.
    expect(hinhCua('79').manh.some((m) => m[0].every(([, y]) => y < 9))).toBe(true);
  });

  it('18 tỉnh từ Hà Tĩnh trở ra là đất Văn Lang, 16 tỉnh từ Quảng Trị trở vào chưa quy về', () => {
    expect(DAT_VAN_LANG.length).toBe(18);
    expect(TINH_IDS.filter((id) => !laDatVanLang(id)).length).toBe(16);
    const ten = (ids: readonly string[]) => ids.map((id) => vi.vietNam.tinh[id]).sort();
    expect(ten(DAT_VAN_LANG)).toEqual(
      ['Hà Nội', 'Hải Phòng', 'Cao Bằng', 'Điện Biên', 'Lai Châu', 'Sơn La', 'Lạng Sơn', 'Quảng Ninh', 'Tuyên Quang', 'Lào Cai', 'Thái Nguyên', 'Phú Thọ', 'Bắc Ninh', 'Hưng Yên', 'Ninh Bình', 'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh'].sort(),
    );
    // Ranh giới Văn Lang theo hình: mọi tỉnh đất Văn Lang ở bắc vĩ tuyến của Quảng Trị (trừ phần hình chồng lên nhau).
    const bacNhat = (id: string) => Math.max(...hinhCua(id).manh.flat(2).map((p) => p[1]));
    for (const id of TINH_IDS) if (!laDatVanLang(id)) expect(bacNhat(id)).toBeLessThan(18.2);
  });

  it('láng giềng đối xứng, nối liền cả nước; giáp biển và biên giới khớp viền ngoài của hình', () => {
    for (const id of TINH_IDS) {
      for (const b of langGieng(id)) expect(langGieng(b)).toContain(id);
      expect(langGieng(id).length).toBeGreaterThan(0);
    }
    expect([...langGieng('01')].sort()).toEqual(['02', '05', '06', '10', '12']);
    expect(Object.keys(LANG_GIENG_HINH).length).toBe(34);
    // Nối liền: đi theo láng giềng từ Hà Nội tới đủ 34 tỉnh.
    const da = new Set<string>(['01']);
    const hang = ['01'];
    while (hang.length) for (const b of langGieng(hang.pop()! as TinhId)) if (!da.has(b)) (da.add(b), hang.push(b));
    expect(da.size).toBe(34);
    expect(GIAP_BIEN.length).toBe(21);
    expect(GIAP_BIEN_GIOI.length).toBe(22);
    for (const id of TINH_IDS) {
      const ngoai = giapBien(id) || GIAP_BIEN_GIOI.includes(id);
      // Tỉnh có viền ngoài thì giáp biển hay có biên giới; tỉnh không có thì nằm trọn trong nước.
      expect(VIEN_NGOAI_KM[id] > 0).toBe(ngoai);
      // Có đảo thì phải giáp biển.
      if (SO_DAO[id] > 0) expect(giapBien(id)).toBe(true);
    }
  });

  it('tỉnh nào cũng có tên xưa hay để trống có lý do; tên xưa phía Nam không dùng tên bộ Văn Lang', () => {
    for (const id of TINH_IDS) {
      const x = vi.vietNam.xuaCua[id];
      if (!x) continue;
      expect(vi.vietNam.xuaGhi[x.loai]).toBeTruthy();
      if (laDatVanLang(id)) expect(x.loai).toBe('bo');
      else expect(x.loai).not.toBe('bo');
    }
    expect(vi.vietNam.xuaCua['12'].ten).toContain('Văn Lang');
  });

  it('mỗi tỉnh vẽ được: có mảnh đất lớn, điểm giữa mảnh lớn nằm trong tỉnh', () => {
    for (const h of hinh) {
      const lon = h.manh.reduce((a, m) => (dienTich(m[0]) > dienTich(a[0]) ? m : a));
      expect(dienTich(lon[0])).toBeGreaterThan(0.01);
      expect(lon[0].length).toBeGreaterThan(8);
    }
    // Điểm ở Hồ Gươm nằm trong Hà Nội, không trong Bắc Ninh.
    expect(hinhCua('01').manh.some((m) => trongVong(m[0], 105.852, 21.029))).toBe(true);
    expect(hinhCua('02').manh.some((m) => trongVong(m[0], 105.852, 21.029))).toBe(false);
  });
});

describe('chức Bồ chính', () => {
  it('sáu chức; Bồ chính hải chỉ ở tỉnh giáp biển', () => {
    expect(CHUC_IDS.length).toBe(6);
    for (const id of TINH_IDS) {
      expect(chucCo(id).includes('hai')).toBe(giapBien(id));
      expect(chucCo(id).length).toBe(giapBien(id) ? 6 : 5);
    }
    for (const c of CHUC_IDS) expect(vi.vietNam.chuc[c].ten).toMatch(/^Bồ chính /);
    const s = base();
    expect(chonTinh(s, '01', T0).ok).toBe(true);
    expect(chonChuc(s, 'hai', T0)).toEqual({ ok: false, reason: 'vnChucChiGiapBien' });
    s.vietNam = undefined;
    expect(chonTinh(s, '21', T0).ok).toBe(true);
    expect(chonChuc(s, 'hai', T0).ok).toBe(true);
  });

  it('mở từ Điện 5; chưa chọn tỉnh thì chưa nhận chức', () => {
    const s = base(4);
    expect(vietNamMo(s)).toBe(false);
    expect(chonTinh(s, '12', T0)).toEqual({ ok: false, reason: 'vnChuaMo' });
    setDien(s, VIET_NAM.dien);
    expect(vietNamMo(s)).toBe(true);
    expect(chonChuc(s, 'quan', T0)).toEqual({ ok: false, reason: 'vnChuaChonTinh' });
    expect(chonTinh(s, 'xx', T0)).toEqual({ ok: false, reason: 'vnKhongCoTinh' });
    expect(chonTinh(s, '12', T0).ok).toBe(true);
    expect(chonChuc(s, 'tuong', T0)).toEqual({ ok: false, reason: 'vnKhongCoChuc' });
  });

  it('tỉnh nào cũng chọn được ngay, kể cả tỉnh chưa quy về; đổi tỉnh mỗi mùa một lần', () => {
    const s = base();
    expect(chonTinh(s, '32', T0).ok).toBe(true);
    expect(s.vietNam?.tinh).toBe('32');
    expect(doiTinhDuoc(s, T0)).toBe(false);
    expect(chonTinh(s, '01', T0 + GIO)).toEqual({ ok: false, reason: 'vnDoiTinhMuaSau' });
    // Chọn lại đúng tỉnh đang ở thì không sao.
    expect(chonTinh(s, '32', T0 + GIO).ok).toBe(true);
    // Mùa 4 tuần; sang mùa sau thì đổi được.
    const sau = T0 + VIET_NAM.muaTuan * 7 * 24 * GIO;
    expect(muaCua(sau)).toBe(muaCua(T0) + 1);
    expect(muaCua(T0 + muaCon(T0))).toBe(muaCua(T0) + 1);
    expect(muaCua(T0 + muaCon(T0) - 1)).toBe(muaCua(T0));
    expect(chonTinh(s, '01', sau).ok).toBe(true);
    expect(s.vietNam?.tinh).toBe('01');
    expect(chonTinh(s, '02', sau + GIO).ok).toBe(false);
  });

  it('đổi chức chờ 24 giờ; sang tỉnh không giáp biển thì mất Bồ chính hải', () => {
    const s = base();
    chonTinh(s, '21', T0);
    expect(chonChuc(s, 'hai', T0).ok).toBe(true);
    expect(chonChuc(s, 'quan', T0 + 23 * GIO)).toEqual({ ok: false, reason: 'vnDoiChucCho' });
    expect(choDoiChuc(s, T0 + 23 * GIO)).toBe(GIO);
    expect(chonChuc(s, 'hai', T0 + 23 * GIO).ok).toBe(true);
    expect(chonChuc(s, 'quan', T0 + 24 * GIO).ok).toBe(true);
    expect(s.vietNam?.chuc).toBe('quan');
    expect(chonChuc(s, 'hai', T0 + 25 * GIO).ok).toBe(false);
    expect(chonChuc(s, 'hai', T0 + 48 * GIO).ok).toBe(true);
    const sau = T0 + VIET_NAM.muaTuan * 7 * 24 * GIO;
    expect(chonTinh(s, '12', sau).ok).toBe(true);
    expect(s.vietNam?.chuc).toBeNull();
    // Mất chức vì đổi tỉnh thì nhận chức mới được ngay.
    expect(chonChuc(s, 'nong', sau).ok).toBe(true);
  });
});

describe('bản lưu', () => {
  it('giữ tỉnh, chức qua lưu và nạp; sai dạng thì bỏ riêng phần ấy', () => {
    const s = base();
    chonTinh(s, '23', T0);
    chonChuc(s, 'hai', T0);
    const lai = deserialize(serialize(s))!;
    expect(lai.vietNam).toEqual(s.vietNam);
    expect(isVietNamState({ tinh: null, chuc: null })).toBe(true);
    expect(isVietNamState({ tinh: '01', chuc: 'hai' })).toBe(false);
    expect(isVietNamState({ tinh: null, chuc: 'quan' })).toBe(false);
    const hong = JSON.parse(serialize(s));
    hong.vietNam = { tinh: '99', chuc: null };
    const nap = deserialize(JSON.stringify(hong))!;
    expect(nap).toBeDefined();
    expect(nap.vietNam).toBeUndefined();
    // Bản lưu cũ không có phần này vẫn nạp được.
    delete hong.vietNam;
    expect(deserialize(JSON.stringify(hong))?.vietNam).toBeUndefined();
  });

  it('tệp hình ghi nguồn, dưới 300 KB', () => {
    expect(topo.nguon).toContain('Free-GIS-Data');
    expect(JSON.stringify(topo).length).toBeLessThan(300_000);
  });
});
