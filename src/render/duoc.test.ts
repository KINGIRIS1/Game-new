// Canh chỗ cắm đuốc ban đêm (`duocCho`): nằm trong móng, cắm vào ô trống (hay mép lối đi) của bản vẽ ô con, công
// trình nào thắp đuốc cũng có ít nhất một cây. Phần vẽ tạo canvas khi nạp module: giả lập `document` như `footprint.test.ts`.

import { describe, expect, it, vi } from 'vitest';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

describe('Đèn đuốc ban đêm', () => {
  it('đuốc nằm trong móng, cắm vào ô trống của bản vẽ, mọi công trình thắp đuốc đều có đuốc', async () => {
    const { BUILDINGS, isDecor, isRoad } = await import('../game/defs');
    const { DUOC_LOTS, duocCho } = await import('./duoc');
    const { DIEN_LOT } = await import('./congTrinh/dien');
    const lots = { ...DUOC_LOTS, dien: DIEN_LOT };
    const khong = ['ruong', 'ruongNep', 'vuon', 'luy', 'de', 'congDe', 'thanh', 'bayChong', 'cauSongDa', 'cauSongThao'];
    for (const type of Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[]) {
      if (isDecor(type) || isRoad(type)) continue;
      const def = BUILDINGS[type];
      const spots = duocCho(type);
      if (khong.includes(type)) {
        expect(spots, type).toEqual([]);
        continue;
      }
      expect(spots.length, type).toBeGreaterThan(0);
      for (const s of spots) {
        expect(Math.abs(s.x), type).toBeLessThanOrEqual(def.w / 2 - 0.1);
        expect(Math.abs(s.z), type).toBeLessThanOrEqual(def.d / 2 - 0.1);
        const lot = lots[type];
        if (!lot) continue;
        const i = Math.floor((s.x + lot.tiles / 2) / 0.5);
        const j = Math.floor((s.z + lot.tiles / 2) / 0.5);
        expect(['.', ','], `${type} (${s.x}, ${s.z})`).toContain(lot.rows[j][i]);
      }
      // Bến, làng chài, bến khơi quay mặt ra sông: đuốc ở phía bờ (nửa sau móng).
      if (def.nearRiver) for (const s of spots) expect(s.z, type).toBeLessThan(0);
    }
  });
});
