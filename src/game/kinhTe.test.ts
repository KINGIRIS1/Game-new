// Canh báo cáo kinh tế (`kinhTe.ts`) khớp với cách game.ts sản xuất và tiêu tài nguyên.

import { describe, expect, it } from 'vitest';
import { RESOURCE_IDS } from './defs';
import { doKinhTe } from './kinhTe';

describe('báo cáo kinh tế', () => {
  const kq = doKinhTe();
  const giaiDoan = Object.values(kq.so);

  it('người chơi mô phỏng đi hết ba chương và chơi thêm sau Điện 7', () => {
    expect(kq.moc.at7).toBeGreaterThan(0);
    expect(Object.keys(kq.so)).toEqual(['chuong1', 'chuong2', 'chuong3', 'sauDien7']);
  });

  // Tiêu hết khi vào chương mới diễn ra sau giây cuối của chương cũ, nên không tính vào tồn cuối.
  it('sổ khớp: tồn đầu cộng các khoản ra đúng tồn cuối mỗi giai đoạn', () => {
    for (const sg of giaiDoan) {
      for (const r of RESOURCE_IDS) {
        const tong = Object.entries(sg.khoan).reduce((a, [k, v]) => (k === 'vaoChuong' ? a : a + v[r]), 0);
        expect(sg.dau[r] + tong).toBeCloseTo(sg.cuoi[r], 3);
      }
    }
  });

  // Khoản "khác" khác 0 nghĩa là game.ts có cách thu chi mới mà kinhTe.ts chưa tách thành khoản riêng.
  it('mọi thay đổi lúc thời gian trôi đều có tên khoản', () => {
    for (const sg of giaiDoan) for (const r of RESOURCE_IDS) expect(Math.abs(sg.khoan.khac[r])).toBeLessThan(1e-6);
  });
});
