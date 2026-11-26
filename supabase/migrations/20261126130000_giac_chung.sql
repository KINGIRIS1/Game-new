-- Bản đồ Việt Nam PR 3: giặc chung của tỉnh (docs/thiet-ke.md, Kế hoạch: bản đồ Việt Nam, 34 tỉnh, chức Bồ chính).
-- Như các bảng tỉnh PR 2: mọi lệnh đi qua Edge Function `dau-thanh`; máy khách không đọc ghi thẳng.

-- Điểm tỉnh từ trận giặc chung, tách khỏi điểm góp của (`diem`) vì trần 100 điểm mỗi ngày chỉ tính phần góp.
alter table public.tinh_diem add column danh integer not null default 0 check (danh >= 0);

-- Đạo giặc ở mỗi tỉnh mỗi tuần (tỉnh nào bị đánh tính từ số tuần, `daoTuan`): máu lúc tới (theo số người đã góp ở tỉnh
-- ấy tuần trước), máu còn, lúc bị diệt. Dòng được tạo khi có người xem hay đánh lúc giặc đang đánh.
create table public.giac_chung (
  tuan integer not null,
  tinh text not null check (tinh ~ '^[0-9]{2}$'),
  mau integer not null check (mau > 0),
  con integer not null check (con >= 0),
  diet timestamptz,
  primary key (tuan, tinh)
);

-- Trận giặc chung: bắt đầu (`giacDanh`) cất bản chụp, quân, hạt giống, hệ số chức; xong (`giacXong`) máy chủ đánh lại,
-- ghi sát thương, điểm hai tỉnh (tỉnh mình, tỉnh được giúp), rồi bỏ bản chụp cho nhẹ.
create table public.giac_tran (
  id bigint generated always as identity primary key,
  nguoi uuid not null references auth.users (id) on delete cascade,
  tuan integer not null,
  tinh text not null check (tinh ~ '^[0-9]{2}$'),
  tinh_ta text not null check (tinh_ta ~ '^[0-9]{2}$'),
  ngay integer not null,
  he real not null,
  seed bigint not null,
  ban_chup text not null,
  quan jsonb not null,
  bat_dau timestamptz not null default now(),
  xong boolean not null default false,
  sat integer,
  ket_qua jsonb
);
create index giac_tran_ngay on public.giac_tran (nguoi, ngay);
create index giac_tran_dao on public.giac_tran (tuan, tinh);

alter table public.giac_chung enable row level security;
alter table public.giac_tran enable row level security;
revoke all on public.giac_chung, public.giac_tran from anon, authenticated;

-- Dọn thêm trận, đạo giặc cũ quá 60 ngày.
create or replace function public.don_viet_nam() returns void
language sql
set search_path = ''
as $$
  delete from public.tinh_diem where ngay < floor((extract(epoch from now()) + 25200) / 86400)::int - 120;
  delete from public.giac_tran where bat_dau < now() - interval '60 days';
  delete from public.giac_chung where tuan < floor((extract(epoch from now()) + 25200 + 3 * 86400) / 604800)::int - 9;
$$;
revoke execute on function public.don_viet_nam() from public, anon, authenticated;
