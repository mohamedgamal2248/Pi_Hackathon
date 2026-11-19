-- Donation matching (a sponsor adds a share on top of donations for a period) and friend fundraising pages.
create table if not exists public.dw_matches (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.dw_campaigns(id) on delete cascade,
  sponsor text not null,
  multiplier numeric not null check (multiplier > 0 and multiplier <= 2),
  cap numeric not null check (cap > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.dw_friend_pages (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  campaign_id uuid not null references public.dw_campaigns(id) on delete cascade,
  goal numeric not null check (goal > 0),
  message text,
  created_at timestamptz not null default now()
);
alter table public.dw_matches enable row level security;
alter table public.dw_friend_pages enable row level security;

create table if not exists public.dwt_matches (like public.dw_matches including all);
create table if not exists public.dwt_friend_pages (like public.dw_friend_pages including all);
alter table public.dwt_matches add constraint dwt_matches_campaign_fkey foreign key (campaign_id) references public.dwt_campaigns(id) on delete cascade;
alter table public.dwt_friend_pages add constraint dwt_friend_pages_campaign_fkey foreign key (campaign_id) references public.dwt_campaigns(id) on delete cascade;
alter table public.dwt_matches enable row level security;
alter table public.dwt_friend_pages enable row level security;
