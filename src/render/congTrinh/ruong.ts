// Ruộng lúa 4×4. CHƯA VẼ: tạm dùng dáng cũ ở giữa móng mới. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import { makeRuong as cu } from '../buildings';
import type { CongTrinh } from './chung';

export const RUONG: CongTrinh = { tiles: 4, make: (level) => cu(level), spots: () => [], view: { half: 4.6, lookY: 1.0, px: 48 } };
