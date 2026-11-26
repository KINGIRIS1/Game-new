-- Bản đồ Việt Nam PR 4: mùa, Lạc tướng và Lạc hầu, quy về (docs/thiet-ke.md, Kế hoạch: bản đồ Việt Nam, 34 tỉnh,
-- chức Bồ chính). Như các bảng tỉnh PR 2, 3: mọi lệnh đi qua Edge Function `dau-thanh`; máy khách không đọc ghi thẳng.

-- Kết giao của tỉnh chưa quy về: mọi điểm góp ở tỉnh ấy (góp của, đánh giặc chung; mọi mùa) dồn vào `ket`. Đủ mức
-- (`CAU_HINH.ketGiao`) thì quy về: lúc quy về, ngày quy về (giờ Việt Nam; điểm xếp hạng của tỉnh chỉ tính từ ngày sau).
-- Tỉnh đã quy về giữ mãi. Đất Văn Lang đã quy về từ đầu, không có dòng ở đây.
create table public.tinh_quy (
  tinh text primary key check (tinh ~ '^[0-9]{2}$'),
  ket integer not null default 0 check (ket >= 0),
  quy timestamptz,
  ngay integer
);

-- Kết quả cuối mùa: mỗi tỉnh một dòng (hạng null là không lên bảng), xếp một lần khi có người hỏi bảng ở mùa sau.
create table public.mua_ket (
  mua integer not null,
  tinh text not null check (tinh ~ '^[0-9]{2}$'),
  hang integer,
  diem integer not null check (diem >= 0),
  diet boolean not null,
  primary key (mua, tinh)
);

-- Lạc tướng (bên võ), Lạc hầu (bên văn) mỗi tuần: mỗi tỉnh hai dòng (không ai góp thì người null), chọn một lần khi có
-- người hỏi bảng trong tuần, theo điểm tuần trước.
create table public.tinh_dau (
  tuan integer not null,
  tinh text not null check (tinh ~ '^[0-9]{2}$'),
  loai text not null check (loai in ('lacTuong', 'lacHau')),
  nguoi uuid references auth.users (id) on delete set null,
  diem integer not null default 0,
  primary key (tuan, tinh, loai)
);
create index tinh_dau_nguoi on public.tinh_dau (nguoi, tuan);

alter table public.tinh_quy enable row level security;
alter table public.mua_ket enable row level security;
alter table public.tinh_dau enable row level security;
revoke all on public.tinh_quy, public.mua_ket, public.tinh_dau from anon, authenticated;

-- Dọn thêm Lạc tướng, Lạc hầu cũ quá 10 tuần, kết quả mùa cũ quá một năm (tỉnh đã quy về thì giữ mãi).
create or replace function public.don_viet_nam() returns void
language sql
set search_path = ''
as $$
  delete from public.tinh_diem where ngay < floor((extract(epoch from now()) + 25200) / 86400)::int - 120;
  delete from public.giac_tran where bat_dau < now() - interval '60 days';
  delete from public.giac_chung where tuan < floor((extract(epoch from now()) + 25200 + 3 * 86400) / 604800)::int - 9;
  delete from public.tinh_dau where tuan < floor((extract(epoch from now()) + 25200 + 3 * 86400) / 604800)::int - 10;
  delete from public.mua_ket where mua < floor((extract(epoch from now()) + 25200 + 3 * 86400) / 604800 / 4)::int - 13;
$$;
revoke execute on function public.don_viet_nam() from public, anon, authenticated;
