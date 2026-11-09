// Canh việc nặn sẵn (`prewarmJobs` ở nanTruoc.ts, `runJob` ở nanSan.ts) phủ đủ mọi dáng (khóa của `figure` ở
// nanNguoi.ts) lúc vào trận ngoài bãi: lính hai bên (kể cả đợt kéo tới sau của màn cầm cự), tướng, và nhân vật cảnh
// bãi chiến (Lạc tướng đánh trống, người lái đò, ngựa vua và Rùa Vàng ở Mộ Dạ). Dáng nào sót thì luồng chính phải
// nặn ngay lúc vào trận, đứng hình chục tới vài trăm mili giây. Kho giả (`setFigureStore`) đưa một tam giác ra thay mọi
// dáng, nên test chỉ ghi khóa dáng (`takeTouched`), khỏi nặn thật.
// Phần vẽ tạo canvas khi nạp module: giả lập `document` cho đủ dùng, không cần trình duyệt.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { FieldSetup, HeroSetup } from '../game/battle';
import type { Terrain, UnitType } from '../game/defs';
import type { FigureData } from './nanNguoi';

const ctx = new Proxy({}, { get: (_t, k) => (k === 'canvas' ? {} : () => ({ addColorStop() {} })), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

const attr = (a: number[], size: number) => ({ array: new Float32Array(a), size, normalized: false });

/** Một tam giác gắn vào xương đầu tiên: kho giả đưa ra thay cho mọi dáng. */
const TAM_GIAC: FigureData['pieces'] = [
  {
    slot: 'plain',
    bones: [],
    attrs: {
      position: attr([0, 0, 0, 0.1, 0, 0, 0, 0.1, 0], 3),
      normal: attr([0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
      color: attr(Array(9).fill(0.5), 3),
      skinIndex: { array: new Uint16Array(12), size: 4, normalized: false },
      skinWeight: attr([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4),
    },
    index: null,
  },
];

/** Bậc binh khí mỗi binh chủng một khác, để dáng lính sai bậc cũng lộ ra. */
const ARMS: Record<UnitType, number> = { giao: 1, cung: 2, voi: 3, no: 1 };

/** Nạp nanNguoi.ts (bản đang dùng) với kho giả, trả hàm lấy các dáng đã dùng tới từ lần hỏi trước. */
async function khoGia(): Promise<() => string[]> {
  const nn = await import('./nanNguoi');
  nn.setFigureStore({ has: () => true, take: (key) => ({ key, pieces: TAM_GIAC }) });
  return nn.takeTouched;
}

interface Tran {
  ten: string;
  chapter: number;
  /** Các dáng trận cần mà các trận vẽ trước chưa dùng tới. */
  can: string[];
}

/** Mọi trận ngoài bãi theo chương tăng dần: phó bản, rồi đồn bên kia sông của chương ấy. */
const tran: Tran[] = [];
/** Các dáng mỗi việc nặn sẵn cần (theo id việc). */
const viec = new Map<string, string[]>();
let jobIds: (ch: number) => string[];

beforeAll(async () => {
  // Pha vẽ: dựng bãi chiến, vẽ khung đầu, rồi khung lúc thắng (Rùa Vàng nổi lên ở Mộ Dạ, camera lùi ở Cấm Khê).
  // soldier.ts giữ cả hình mỗi loại lính đã dựng nên trận sau chỉ ghi dáng mới; trận theo chương tăng dần thì dáng nào
  // cũng được so ở chương sớm nhất cần nó.
  {
    const takeTouched = await khoGia();
    const { DEFAULT_ROWS, STAGES, stageEnemies } = await import('../game/defs');
    const { CAMPS } = await import('../game/benKia');
    const { baiOf, stageBai } = await import('../game/baiChien');
    const { lateHeroes } = await import('../game/testkit');
    const { startFieldBattle } = await import('../game/battle');
    const { Battlefield } = await import('./battlefield');
    const list: { ten: string; chapter: number; terrain: Terrain; setup: FieldSetup }[] = [];
    const army = (ch: number) => ({ giao: 1, cung: 1, voi: 1, no: ch >= 4 ? 1 : 0 });
    STAGES.forEach((def, i) => {
      const n = i + 1;
      const [hero, hero2 = null] = lateHeroes(n);
      // Mọi giặc ra cùng lúc thay cho các đợt kéo tới sau.
      const setup = { id: n, stage: n, enemies: stageEnemies(def), holdS: def.holdS, hpScale: 1, army: army(def.chapter), rows: DEFAULT_ROWS, hero, hero2, arms: ARMS, bai: stageBai(n) };
      list.push({ ten: `màn ${n}`, chapter: def.chapter, terrain: def.terrain, setup });
    });
    for (const [tier, camp] of Object.entries(CAMPS)) {
      const [hero] = lateHeroes(STAGES.findIndex((s) => s.chapter === camp.chapter) + 1) as [HeroSetup];
      const setup = { id: 100 + Number(tier), stage: 0, enemies: camp.enemies, hpScale: 1, army: army(camp.chapter), rows: DEFAULT_ROWS, hero, arms: ARMS, camp: 1, bai: baiOf(camp.terrain, camp.chapter) };
      list.push({ ten: `đồn bậc ${tier}`, chapter: camp.chapter, terrain: camp.terrain, setup });
    }
    list.sort((a, b) => a.chapter - b.chapter);
    for (const t of list) {
      const b = startFieldBattle(t.setup);
      takeTouched();
      const bf = new Battlefield();
      bf.setTerrain(t.terrain, t.setup.bai);
      bf.update(b, 0.05);
      b.outcome = 'win';
      b.seaWin = true;
      b.hatWin = true;
      bf.update(b, 0.05);
      tran.push({ ten: t.ten, chapter: t.chapter, can: takeTouched() });
    }
  }
  // Pha nặn: nạp lại mã nhân vật cho bộ nhớ đệm trống như worker vừa mở, chạy mọi việc nặn sẵn.
  vi.resetModules();
  {
    const takeTouched = await khoGia();
    const { prewarmJobs } = await import('./nanTruoc');
    const { runJob } = await import('./nanSan');
    for (const j of prewarmJobs(5, ARMS, false)) {
      takeTouched();
      runJob(j);
      viec.set(j.join(':'), takeTouched());
    }
    jobIds = (ch) => prewarmJobs(ch, ARMS, false).map((j) => j.join(':'));
  }
}, 60_000);

describe('nặn sẵn đủ dáng lúc vào trận ngoài bãi', () => {
  it('việc nặn sẵn của chương sau gồm mọi việc của chương trước', () => {
    const het = new Set(jobIds(5));
    for (let ch = 1; ch < 5; ch++) expect(jobIds(ch).filter((id) => !het.has(id)), `chương ${ch}`).toEqual([]);
  });

  it('mọi màn phó bản, mọi bậc đồn: quân ta, giặc (cả các đợt sau), tướng, cảnh bãi chiến đều có trong việc nặn sẵn của chương', () => {
    const tong = tran.flatMap((t) => t.can);
    expect(tong.length).toBeGreaterThan(100);
    // Lạc tướng đánh trống đồng sau hàng quân ta, có ở mọi bãi chiến.
    expect(tong).toContain('cloak::0:{"color":11022890,"hem":0.17}@1');
    for (const t of tran) {
      for (let ch = t.chapter; ch <= 5; ch++) {
        const co = new Set(jobIds(ch).flatMap((id) => viec.get(id) ?? []));
        expect(
          t.can.filter((k) => !co.has(k)),
          `${t.ten} (chương ${t.chapter}) khi đang chơi chương ${ch}`,
        ).toEqual([]);
      }
    }
  });
});
