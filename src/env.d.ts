/// <reference types="vite/client" />

// Biến lúc dựng bản game (deploy.yml lấy từ Variables của repo; chạy ở máy thì đặt trong .env.local).
interface ImportMetaEnv {
  /** Địa chỉ dự án Supabase của máy chủ Đấu thành, như https://<mã dự án>.supabase.co. Không có thì chỉ đánh thử. */
  readonly VITE_SUPABASE_URL?: string;
  /** Khóa publishable (hay anon) của dự án ấy: công khai được, RLS chặn mọi lệnh ghi. */
  readonly VITE_SUPABASE_KEY?: string;
}

/** Mã băm luật máy chủ Đấu thành (vite.config.ts). */
declare const __LUAT_MA__: string;
