-- Đấu thành PR 6 (docs/thiet-ke.md, Kế hoạch: Đấu thành): xem lại trận, bảng xếp hạng, lưu game lên mây.

-- Mã luật (mã băm `LUAT_MA`) của bản luật đã đánh lại trận, ghi lúc đóng trận. Trận chỉ xem lại được khi mã này
-- trùng mã luật đang chạy: luật đổi thì cùng các lần bấm ra trận khác. Trận đóng trước PR 6 không có mã.
alter table public.tran add column luat text;

-- Bảng xếp hạng: chiến công cao trước, ngang nhau thì ai tham gia trước đứng trước.
create index nguoi_choi_hang on public.nguoi_choi (chien_cong desc, tao_luc, id);

-- Bản lưu game trên mây của người đã gắn Google (mã lưu `TDVL2:` như nút Chép mã lưu), mỗi người một bản, để chuyển
-- máy. Gắn với người dùng Supabase chứ không với người chơi Đấu thành: rời Đấu thành không mất bản lưu.
create table public.luu_may (
  nguoi uuid primary key references auth.users (id) on delete cascade,
  ma text not null check (char_length(ma) <= 200000),
  -- Số lần đã lưu: máy khách gửi kèm số nó biết, lệch thì máy khác đã lưu bản mới hơn.
  ban integer not null default 1,
  dien smallint not null check (dien between 1 and 10),
  luc timestamptz not null default now()
);

-- Chỉ Edge Function đọc ghi (kết nối thẳng cơ sở dữ liệu); máy khách không đọc được qua Data API.
alter table public.luu_may enable row level security;
revoke all on public.luu_may from anon, authenticated;
