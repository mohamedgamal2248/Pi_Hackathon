-- Donate Way 2: all tables are prefixed dw_ (they share a Supabase project with DalilPi).
-- Every table has RLS enabled and NO policies: browsers (anon key) can't read or write anything.
-- All access goes through the Next.js server using the service-role key.

create table if not exists public.dw_users (
  pi_uid       text primary key,
  username     text not null,
  is_admin     boolean not null default false,
  wallet_address text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.dw_organizers (
  id           uuid primary key default gen_random_uuid(),
  pi_uid       text not null unique references public.dw_users(pi_uid),
  full_name    text not null,
  org_name     text,
  country      text not null,
  phone        text,
  bio          text,
  documents    jsonb not null default '[]'::jsonb,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note  text,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

create table if not exists public.dw_campaigns (
  id            uuid primary key default gen_random_uuid(),
  organizer_uid text not null references public.dw_users(pi_uid),
  title         text not null,
  summary       text not null,
  story         text not null,
  category      text not null check (category in ('health','education','food','water','emergency','orphans','mosque','other')),
  country       text not null,
  goal          numeric(20,7) not null check (goal > 0),
  cover_url     text,
  gallery       jsonb not null default '[]'::jsonb,
  video_url     text,
  urgent        boolean not null default false,
  deadline      timestamptz,
  status        text not null default 'pending'
                check (status in ('draft','pending','active','funded','completed','rejected','paused')),
  created_at    timestamptz not null default now(),
  approved_at   timestamptz
);
create index if not exists dw_campaigns_status_idx on public.dw_campaigns(status, created_at desc);

-- One row per Pi payment. Only the server inserts/updates (after verifying with the Pi Platform API).
create table if not exists public.dw_donations (
  id           uuid primary key default gen_random_uuid(),
  payment_id   text not null unique,
  txid         text,
  campaign_id  uuid references public.dw_campaigns(id),   -- null = general fund
  pi_uid       text not null references public.dw_users(pi_uid),
  amount       numeric(20,7) not null check (amount > 0),
  anonymous    boolean not null default false,
  message      text,
  recurring_id uuid,
  status       text not null default 'approved' check (status in ('approved','completed','cancelled')),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists dw_donations_campaign_idx on public.dw_donations(campaign_id, status);
create index if not exists dw_donations_user_idx on public.dw_donations(pi_uid, status);

-- Campaign news and proof-of-spend (receipts / photos for money that was released).
create table if not exists public.dw_updates (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.dw_campaigns(id) on delete cascade,
  kind         text not null default 'update' check (kind in ('update','proof_of_spend','milestone')),
  title        text not null,
  body         text not null,
  amount_spent numeric(20,7),
  media        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

-- Funds released to the organizer in stages (A2U). The next tranche needs a proof_of_spend for the previous one.
create table if not exists public.dw_tranches (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.dw_campaigns(id),
  amount          numeric(20,7) not null check (amount > 0),
  status          text not null default 'requested' check (status in ('requested','approved','paid','rejected')),
  proof_update_id uuid references public.dw_updates(id),
  a2u_payment_id  text unique,
  txid            text,
  note            text,
  created_at      timestamptz not null default now(),
  paid_at         timestamptz
);

create table if not exists public.dw_follows (
  pi_uid      text not null references public.dw_users(pi_uid),
  campaign_id uuid not null references public.dw_campaigns(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (pi_uid, campaign_id)
);

-- Monthly giving pledges ("sadaqa jariya"). Until Pi subscriptions reach Mainnet, the app reminds
-- the donor each month and they confirm with one U2A payment.
create table if not exists public.dw_recurring (
  id          uuid primary key default gen_random_uuid(),
  pi_uid      text not null references public.dw_users(pi_uid),
  campaign_id uuid references public.dw_campaigns(id),
  amount      numeric(20,7) not null check (amount > 0),
  next_due    date not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Token-ready points ledger. asset = 'GIVE_POINTS' today; a real token can be added later as a new asset.
create table if not exists public.dw_ledger (
  id         bigserial primary key,
  pi_uid     text not null references public.dw_users(pi_uid),
  asset      text not null default 'GIVE_POINTS',
  amount     numeric(20,7) not null,
  reason     text not null,
  ref        text,
  created_at timestamptz not null default now(),
  unique (asset, reason, ref)
);
create index if not exists dw_ledger_user_idx on public.dw_ledger(pi_uid, asset);

-- Raised amounts are always computed from completed donations (no client-side counters, no races).
create or replace view public.dw_campaign_stats with (security_invoker = true) as
select c.id as campaign_id,
       coalesce(sum(d.amount) filter (where d.status = 'completed'), 0) as raised,
       count(distinct d.pi_uid) filter (where d.status = 'completed') as donors,
       coalesce((select sum(t.amount) from public.dw_tranches t where t.campaign_id = c.id and t.status = 'paid'), 0) as released
from public.dw_campaigns c
left join public.dw_donations d on d.campaign_id = c.id
group by c.id;

alter table public.dw_users      enable row level security;
alter table public.dw_organizers enable row level security;
alter table public.dw_campaigns  enable row level security;
alter table public.dw_donations  enable row level security;
alter table public.dw_updates    enable row level security;
alter table public.dw_tranches   enable row level security;
alter table public.dw_follows    enable row level security;
alter table public.dw_recurring  enable row level security;
alter table public.dw_ledger     enable row level security;

revoke all on public.dw_campaign_stats from anon, authenticated;
