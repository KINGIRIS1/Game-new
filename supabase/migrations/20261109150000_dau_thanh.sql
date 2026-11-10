-- Máy chủ Đấu thành (docs/thiet-ke.md, Kế hoạch: Đấu thành, mục Server).
-- Mọi lệnh ghi đi qua Edge Function `dau-thanh`: hàm ấy kết nối thẳng cơ sở dữ liệu (SUPABASE_DB_URL) nên không qua
-- RLS. Máy khách đăng nhập ẩn danh chỉ đọc qua Data API theo RLS: tên, chiến công mọi người; trận mình đánh hay
-- mình bị đánh. Bản chụp kinh đô và lượt gọi không ai đọc được từ máy khách.

-- Người chơi đã bấm Tham gia.
create table public.nguoi_choi (
  id uuid primary key references auth.users (id) on delete cascade,
  ten text not null check (char_length(ten) between 2 and 16),
  chien_cong integer not null default 0 check (chien_cong >= 0),
  -- Cấp Điện theo bản chụp mới nhất (để ghép trận).
  dien smallint not null check (dien between 1 and 10),
  -- Có khiên tới lúc này: không ai đánh được.
  khien_den timestamptz,
  -- Đang bị đánh: khóa tới lúc này.
  khoa_den timestamptz,
  tao_luc timestamptz not null default now(),
  -- Lần gần nhất gọi máy chủ.
  goi_luc timestamptz not null default now()
);
create index nguoi_choi_ghep on public.nguoi_choi (dien, chien_cong);

-- Bản chụp kinh đô mới nhất của mỗi người (mã `TDVS1:`, đã kiểm luật khi nhận).
create table public.ban_chup (
  nguoi uuid primary key references public.nguoi_choi (id) on delete cascade,
  ma text not null check (char_length(ma) <= 64000),
  dien smallint not null,
  luc timestamptz not null default now()
);

-- Trận đánh: bắt đầu thì lưu bản chụp kinh đô bị đánh và quân máy chủ dựng (có hạt giống); xong thì lưu các lần bấm
-- người đánh gửi lên và kết quả máy chủ đánh lại.
create table public.tran (
  id uuid primary key default gen_random_uuid(),
  nguoi_danh uuid references public.nguoi_choi (id) on delete set null,
  -- Không có khi đánh kinh đô máy.
  nguoi_giu uuid references public.nguoi_choi (id) on delete set null,
  may boolean not null default false,
  ten_danh text not null,
  ten_giu text not null,
  dien_danh smallint not null,
  dien_giu smallint not null,
  ban_chup text not null,
  quan jsonb not null,
  trang_thai text not null default 'dang' check (trang_thai in ('dang', 'xong')),
  bam jsonb,
  ket_qua jsonb,
  bat_dau timestamptz not null default now(),
  xong_luc timestamptz
);
create index tran_danh on public.tran (nguoi_danh, bat_dau desc);
create index tran_giu on public.tran (nguoi_giu, bat_dau desc);
create index tran_dang on public.tran (bat_dau) where trang_thai = 'dang';

-- Lượt gọi máy chủ, để giới hạn số lần mỗi giờ.
create table public.luot_goi (
  nguoi uuid not null,
  loai text not null,
  luc timestamptz not null default now()
);
create index luot_goi_dem on public.luot_goi (nguoi, loai, luc);

alter table public.nguoi_choi enable row level security;
alter table public.ban_chup enable row level security;
alter table public.tran enable row level security;
alter table public.luot_goi enable row level security;

create policy "Xem tên, chiến công người chơi" on public.nguoi_choi
  for select to authenticated using (true);
create policy "Xem trận mình đánh hay bị đánh" on public.tran
  for select to authenticated using ((select auth.uid()) in (nguoi_danh, nguoi_giu));

-- Máy khách không ghi thẳng, không đọc bản chụp và lượt gọi (RLS đã chặn; bỏ luôn quyền Supabase cấp sẵn).
revoke insert, update, delete, truncate on public.nguoi_choi, public.ban_chup, public.tran, public.luot_goi from anon, authenticated;
revoke select on public.ban_chup, public.luot_goi from anon, authenticated;

-- Dọn dữ liệu cũ: trận, bản chụp quá 30 ngày (`DAU_THANH.keepDays`), lượt gọi quá một ngày.
-- pg_cron gọi mỗi ngày; Edge Function cũng gọi ở mỗi lần ping (workflow giữ máy chủ thức ping 3 ngày một lần).
create or replace function public.don_dau_thanh() returns void
language sql
set search_path = ''
as $$
  delete from public.tran where bat_dau < now() - interval '30 days';
  delete from public.ban_chup where luc < now() - interval '30 days';
  delete from public.luot_goi where luc < now() - interval '1 day';
$$;
revoke execute on function public.don_dau_thanh() from public, anon, authenticated;

do $do$
begin
  begin
    create extension if not exists pg_cron with schema pg_catalog;
  exception when others then
    raise notice 'Không bật được pg_cron (%): dữ liệu cũ vẫn được dọn mỗi lần ping.', sqlerrm;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('dau-thanh-don', '17 3 * * *', 'select public.don_dau_thanh()');
  end if;
end
$do$;
