// Doanh trại 4×4. CHƯA VẼ: tạm dùng dáng cũ ở giữa móng mới. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import { makeDoanhTrai as cu } from '../buildings';
import type { CongTrinh } from './chung';

export const DOANH_TRAI: CongTrinh = { tiles: 4, make: (level) => cu(level), spots: () => [], view: { half: 4.6, lookY: 1.0, px: 48 } };
