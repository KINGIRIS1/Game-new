// Bến chợ thuyền 3×3. CHƯA VẼ: tạm dùng dáng cũ ở giữa móng mới. Bản vẽ ở docs/bo-cuc-cong-trinh.md.

import { makeBen as cu } from '../buildings';
import type { CongTrinh } from './chung';

export const BEN: CongTrinh = { tiles: 3, make: (level) => cu(level), spots: () => [], view: { half: 3.2, lookY: 1.0, px: 56 } };
