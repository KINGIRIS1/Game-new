-- Bản đồ Việt Nam PR 2: máy chủ điểm tỉnh (docs/thiet-ke.md, Kế hoạch: bản đồ Việt Nam, 34 tỉnh, chức Bồ chính).
-- Như bảng Đấu thành: mọi lệnh đi qua Edge Function `dau-thanh` (kết nối thẳng cơ sở dữ liệu, không qua RLS); máy
-- khách không đọc ghi thẳng hai bảng này. Gắn với người dùng Supabase (như `luu_may`), không cần tham gia Đấu thành.

-- Tỉnh, chức của mỗi người.
create table public.tinh_nguoi (
  nguoi uuid primary key references auth.users (id) on delete cascade,
  tinh text not null check (tinh ~ '^[0-9]{2}$'),
  -- Mùa (`muaCua`: 4 tuần, từ 0 giờ thứ Hai giờ Việt Nam) lúc chọn tỉnh: mỗi mùa đổi tỉnh một lần.
  mua integer not null,
  chuc text check (chuc in ('quan', 'nong', 'thuy', 'thuong', 'bien', 'hai')),
  -- Lúc nhận chức: đổi chức phải chờ 24 giờ.
  chuc_luc timestamptz,
  luc timestamptz not null default now()
);
create index tinh_nguoi_tinh on public.tinh_nguoi (tinh);

-- Điểm mỗi người góp cho tỉnh, theo mùa và ngày (giờ Việt Nam, `ngayCua`). Trần mỗi ngày tính trên mọi dòng của người
-- ấy trong ngày; điểm tỉnh mỗi mùa cộng điểm của 30 người góp nhiều nhất (`VIET_NAM.topTinh`).
create table public.tinh_diem (
  mua integer not null,
  tinh text not null check (tinh ~ '^[0-9]{2}$'),
  nguoi uuid not null references auth.users (id) on delete cascade,
  ngay integer not null,
  diem integer not null default 0 check (diem >= 0),
  primary key (mua, tinh, nguoi, ngay)
);
create index tinh_diem_ngay on public.tinh_diem (nguoi, ngay);

alter table public.tinh_nguoi enable row level security;
alter table public.tinh_diem enable row level security;
revoke all on public.tinh_nguoi, public.tinh_diem from anon, authenticated;

-- Dọn điểm cũ quá 120 ngày (`VIET_NAM.giuNgay`): pg_cron mỗi ngày, Edge Function cũng gọi ở mỗi lần ping.
create or replace function public.don_viet_nam() returns void
language sql
set search_path = ''
as $$
  delete from public.tinh_diem where ngay < floor((extract(epoch from now()) + 25200) / 86400)::int - 120;
$$;
revoke execute on function public.don_viet_nam() from public, anon, authenticated;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('viet-nam-don', '27 3 * * *', 'select public.don_viet_nam()');
  end if;
end
$do$;
