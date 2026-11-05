// Worker nặn sẵn: nhận danh sách việc (nanTruoc.ts), nặn lần lượt, xong việc nào gửi về luồng chính việc ấy (các dáng
// mới, và mọi dáng việc ấy cần để lần sau kho trình duyệt biết việc ấy đã đủ); hết việc thì gửi `null`.

import './nanSanDom';
import { newFigures, takeTouched } from './nanNguoi';
import { runJob, type Job, type JobDone } from './nanSan';

self.onmessage = (e: MessageEvent<Job[]>) => {
  for (const job of e.data) {
    takeTouched();
    let keys: string[] | null = null;
    try {
      runJob(job);
      keys = takeTouched();
    } catch {
      // Dáng nào hỏng ở đây thì luồng chính tự nặn lúc cần; không ghi việc này là đã đủ.
    }
    const done: JobDone = { job: job.join(':'), keys, figs: newFigures() };
    self.postMessage(done);
  }
  self.postMessage(null);
};
