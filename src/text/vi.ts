// Mọi chữ hiển thị trong game. Tách riêng để sau này dịch sang tiếng Anh.

import type { BuildingType, ResourceId } from '../game/defs';
import type { FailReason } from '../game/game';

export const vi = {
  gameTitle: 'Thời đại Văn Lang',

  resources: {
    gao: { name: 'Gạo', icon: '🌾' },
    voOc: { name: 'Vỏ ốc', icon: '🐚' },
    datDa: { name: 'Đất đá', icon: '🪨' },
    sat: { name: 'Sắt', icon: '⚒️' },
  } satisfies Record<ResourceId, { name: string; icon: string }>,

  buildings: {
    dien: {
      name: 'Điện Vua Hùng',
      icon: '🏯',
      desc: 'Nơi Vua Hùng trị nước. Nâng cấp để phát rừng mở đất, tăng sức chứa kho và cho phép nâng cấp các công trình khác.',
    },
    ruong: {
      name: 'Ruộng lúa',
      icon: '🌾',
      desc: 'Ruộng nước của dân, làm ra gạo nuôi cả kinh đô.',
    },
    ben: {
      name: 'Bến chợ thuyền',
      icon: '⛵',
      desc: 'Thuyền buôn ghé bến đổi hàng, đem về vỏ ốc. Phải dựng sát bờ sông.',
    },
    luy: {
      name: 'Lũy tre',
      icon: '🎋',
      desc: 'Hàng tre gai trồng dày bao quanh kinh đô, chắn bước giặc. Khi Điện lên cấp 3, có thể đắp thành đất chắc hơn nhiều.',
    },
    nhaSan: {
      name: 'Nhà sàn',
      icon: '🛖',
      desc: 'Nhà của dân. Càng nhiều chỗ ở, dân về càng đông. Dân cần gạo để ăn.',
    },
    baiDa: {
      name: 'Bãi đất đá',
      icon: '🪨',
      desc: 'Nơi dân đào đất, khuân đá để đắp thành và dựng nhà. Cần người làm.',
    },
    loRen: {
      name: 'Lò rèn',
      icon: '⚒️',
      desc: 'Thợ rèn nấu quặng ra sắt để rèn giáo, rìu và đồ cho Thánh Gióng. Cần người làm.',
    },
    kho: {
      name: 'Kho thóc',
      icon: '🏚️',
      desc: 'Kho sàn cao chứa thóc và của cải. Mỗi kho cho thêm sức chứa mọi loại tài nguyên.',
    },
  } satisfies Record<BuildingType, { name: string; icon: string; desc: string }>,

  reasons: {
    thieuTaiNguyen: 'Chưa đủ tài nguyên',
    chuaDuCapDien: 'Cần nâng Điện Vua Hùng trước',
    datBiChiem: 'Chỗ này đã có công trình',
    ngoaiVung: 'Đất này chưa khai phá',
    phaiSatSong: 'Bến phải nằm sát bờ sông',
    datGioiHan: 'Đã đạt số lượng tối đa, hãy nâng Điện Vua Hùng',
    capToiDa: 'Đã đạt cấp tối đa',
    khongTheXay: 'Không thể xây công trình này',
    khongTheDo: 'Không thể dỡ công trình này',
    khongTimThay: 'Không tìm thấy công trình',
    chuaXong: 'Nhiệm vụ chưa xong',
    thieuDan: 'Không còn dân rảnh, hãy dựng thêm nhà sàn',
    khongCoNguoiLam: 'Công trình này không cần người làm',
    thuyenDaDi: 'Thuyền buôn đã rời bến',
    daDoi: 'Đã đổi món này rồi',
  } satisfies Record<FailReason, string>,

  quests: {
    luy: 'Tâu bệ hạ, giặc Ân đang dòm ngó phương Bắc. Xin cho dựng 6 đoạn lũy tre giữ kinh đô.',
    ruong: 'Muốn giữ nước phải đủ ăn. Xin bệ hạ cho khai một thửa ruộng lúa.',
    ben: 'Thuyền buôn trên sông qua lại tấp nập. Xin dựng một bến chợ thuyền sát bờ sông.',
    dien2: 'Kinh đô đã có cơ ngơi. Xin bệ hạ nâng Điện Vua Hùng lên cấp 2 để mở rộng bờ cõi.',
    nhaSan: 'Muốn làm nhiều việc phải có nhiều người. Xin dựng một nhà sàn để dân về ở.',
    baiDa: 'Đắp thành, dựng nhà đều cần đất đá. Xin lập bãi đất đá và cho 2 người vào làm.',
    kho: 'Của cải nhiều lên, kho không đủ chứa. Xin dựng một kho thóc.',
    loRen: 'Giặc Ân có giáo đồng sắc bén. Xin dựng lò rèn để làm ra sắt.',
    dien3: 'Kinh đô đã vững. Xin nâng Điện Vua Hùng lên cấp 3, khi ấy có thể đắp thành đất.',
    allDone:
      'Kinh tế kinh đô đã vững. Việc luyện quân và giữ kinh đô trước giặc Ân sẽ có ở bản sau.',
  } as Record<string, string>,

  ui: {
    lacHau: 'Lạc hầu',
    build: 'Xây dựng',
    buildTitle: 'Xây dựng',
    close: 'Đóng',
    level: 'Cấp',
    upgrade: 'Nâng cấp',
    upgradeTo: (n: number) => `Nâng lên cấp ${n}`,
    maxLevel: 'Đã đạt cấp tối đa',
    production: 'Sản lượng',
    perMinute: '/phút',
    nextLevel: 'Cấp sau',
    cost: 'Giá',
    free: 'Miễn phí',
    count: (have: number, max: number) => `Đã có ${have}/${max}`,
    claim: 'Nhận thưởng',
    reward: 'Thưởng',
    place: 'Đặt',
    cancel: 'Hủy',
    done: 'Xong',
    remove: 'Dỡ lũy',
    placeHint: 'Chạm vào ô đất để chọn chỗ, rồi bấm Đặt',
    wallHint: 'Chạm vào từng ô đất để dựng lũy',
    placed: (name: string) => `Đã dựng ${name}`,
    upgraded: (name: string, n: number) => `${name} lên cấp ${n}`,
    landExpanded: 'Đã phát rừng, bờ cõi mở rộng!',
    storage: 'Sức chứa kho',
    wallEarth: 'Thành đất',
    workers: 'Người làm',
    freeDan: (n: number) => `Dân rảnh: ${n}`,
    autoAssign: 'Chia đều dân rảnh',
    assigned: (n: number) => (n ? `Đã cho ${n} người vào làm` : 'Không còn dân rảnh hoặc chỗ trống'),
    housing: 'Chỗ ở',
    dan: 'Dân',
    danTitle: (dan: number, room: number, free: number) => `Dân ${dan}/${room} chỗ ở, ${free} người rảnh`,
    upkeep: 'Gạo ăn',
    starving: 'Thiếu gạo! Mọi việc chậm một nửa, dân không về thêm.',
    merchantHere: (s: number) => `Thuyền buôn cập bến, còn ${s} giây`,
    merchantOpen: 'Xem hàng',
    merchantTitle: 'Thuyền buôn',
    merchantHint: 'Thuyền chỉ đậu một lúc. Mỗi món chỉ đổi được một lần.',
    trade: 'Đổi',
    traded: 'Đã đổi',
    tradeDone: 'Đổi hàng xong',
    give: 'Đưa',
    get: 'Nhận',
    settings: 'Cài đặt',
    sound: 'Âm thanh',
    on: 'Bật',
    off: 'Tắt',
    exportSave: 'Xuất mã lưu',
    exportHint: 'Chép đoạn mã này và cất ở nơi an toàn để sao lưu hoặc chuyển sang máy khác.',
    copy: 'Chép',
    copied: 'Đã chép mã lưu',
    importSave: 'Nhập mã lưu',
    importHint: 'Dán mã lưu vào đây. Tiến trình hiện tại sẽ bị thay thế.',
    importBad: 'Mã lưu không hợp lệ',
    imported: 'Đã nạp mã lưu',
    reset: 'Chơi lại từ đầu',
    resetConfirm: 'Xóa toàn bộ tiến trình và chơi lại từ đầu?',
    offlineTitle: 'Bệ hạ đã trở lại',
    offlineBody: (time: string) => `Trong ${time} vắng mặt, kinh đô vẫn làm lụng với nửa sức:`,
    ok: 'Tốt lắm',
    saveFailed: 'Không lưu được game trên trình duyệt này',
    webglFailed: 'Trình duyệt này không hỗ trợ đồ họa 3D (WebGL).',
  },
};

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}
