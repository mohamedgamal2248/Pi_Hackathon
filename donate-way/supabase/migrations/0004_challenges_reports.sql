-- Community challenges (e.g. "Friday: 1000 π for water") and campaign reports from users.
create table if not exists public.dw_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  goal numeric not null check (goal > 0),
  campaign_id uuid references public.dw_campaigns(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.dw_reports (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.dw_campaigns(id) on delete cascade,
  pi_uid text not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create unique index if not exists dw_reports_once on public.dw_reports(campaign_id, pi_uid);
alter table public.dw_challenges enable row level security;
alter table public.dw_reports enable row level security;

create table if not exists public.dwt_challenges (like public.dw_challenges including all);
create table if not exists public.dwt_reports (like public.dw_reports including all);
alter table public.dwt_challenges add constraint dwt_challenges_campaign_fkey foreign key (campaign_id) references public.dwt_campaigns(id) on delete set null;
alter table public.dwt_reports add constraint dwt_reports_campaign_fkey foreign key (campaign_id) references public.dwt_campaigns(id) on delete cascade;
alter table public.dwt_challenges enable row level security;
alter table public.dwt_reports enable row level security;
