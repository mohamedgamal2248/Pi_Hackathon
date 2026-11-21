-- Verified-need funds v2: settlement deadline, near-duplicate image hash, vouches by verified Pioneers, blocklist.
alter table public.dw_need_requests add column if not exists proof_due_at timestamptz;
alter table public.dw_need_documents add column if not exists phash text;

create table if not exists public.dw_need_vouches (
  request_id  uuid not null references public.dw_need_requests(id) on delete cascade,
  voucher_uid text not null references public.dw_users(pi_uid),
  created_at  timestamptz not null default now(),
  primary key (request_id, voucher_uid)
);
create table if not exists public.dw_need_blocklist (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('uid', 'wallet')),
  value      text not null,
  reason     text,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (kind, value)
);
alter table public.dw_need_vouches   enable row level security;
alter table public.dw_need_blocklist enable row level security;

alter table public.dwt_need_requests add column if not exists proof_due_at timestamptz;
alter table public.dwt_need_documents add column if not exists phash text;
create table if not exists public.dwt_need_vouches (like public.dw_need_vouches including all);
create table if not exists public.dwt_need_blocklist (like public.dw_need_blocklist including all);
alter table public.dwt_need_vouches add constraint dwt_need_vouches_request_fkey foreign key (request_id) references public.dwt_need_requests(id) on delete cascade;
alter table public.dwt_need_vouches add constraint dwt_need_vouches_voucher_fkey foreign key (voucher_uid) references public.dwt_users(pi_uid);
alter table public.dwt_need_vouches   enable row level security;
alter table public.dwt_need_blocklist enable row level security;
