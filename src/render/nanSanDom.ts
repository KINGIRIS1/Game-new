// Worker không có `document`, mà toon.ts vẽ hoa văn lên canvas ngay khi nạp: đưa OffscreenCanvas thay vào. Phải nạp
// trước mọi tệp vẽ (nanSan.worker.ts nạp tệp này đầu tiên). Máy không có OffscreenCanvas thì worker hỏng khi nạp,
// luồng chính tự nặn lúc cần như khi không có worker.

const g = globalThis as { document?: unknown };
if (!g.document && typeof OffscreenCanvas !== 'undefined') g.document = { createElement: () => new OffscreenCanvas(1, 1) };

export {};
