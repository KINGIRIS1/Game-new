// Worker nặn sẵn: nhận danh sách việc (nanTruoc.ts), nặn lần lượt, xong việc nào gửi các dáng mới về luồng chính
// việc ấy; hết việc thì gửi `null`.

import './nanSanDom';
import { newFigures } from './nanNguoi';
import { runJob, type Job } from './nanSan';

self.onmessage = (e: MessageEvent<Job[]>) => {
  for (const job of e.data) {
    try {
      runJob(job);
    } catch {
      // Dáng nào hỏng ở đây thì luồng chính tự nặn lúc cần.
    }
    const figs = newFigures();
    if (figs.length) self.postMessage(figs);
  }
  self.postMessage(null);
};
