-- Đấu thành: đếm số lần máy chủ thử đóng một trận. Đánh lại trận nặng quá giới hạn CPU của Edge Function thì hàm bị
-- ngắt giữa chừng, trận nằm mãi ở 'dang'; quá 2 lần thì máy chủ đóng trận như người đánh rút quân ngay (`dongTran`
-- ở functions/dau-thanh/xuLy.ts), để trận không chặn mãi người giữ thành.
alter table public.tran add column lan_dong smallint not null default 0;
