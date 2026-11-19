// Kiểu của scripts/luat.mjs (vite.config.ts dùng `dongGoiLuat` để bản game mang cùng mã luật với máy chủ).
export declare const LUAT_FILE: string;
export declare function dongGoiLuat(): Promise<{ code: string; ma: string }>;
export declare function ghiLuat(): Promise<{ ma: string; bytes: number }>;
