-- Sanad v2: admin-only campaigns, 95/5 split, cart donations, gifts, referrals, zakat hawl.

-- Campaigns: impact units, zakat eligibility, cover image in storage.
alter table public.dw_campaigns
  add column if not exists impact_units jsonb not null default '[]'::jsonb, -- [{ "amount": 5, "label": "بطانية" }]
  add column if not exists zakat_eligible boolean not null default false,
  add column if not exists cover_path text,
  alter column summary drop not null,
  alter column country set default 'مصر';

-- Users: wallet (for zakat), referral code, zakat hawl.
alter table public.dw_users
  add column if not exists referral_code text unique,
  add column if not exists referred_by text references public.dw_users(pi_uid),
  add column if not exists hawl_start date,
  add column if not exists hawl_reminded_at date,
  add column if not exists nisab_basis text not null default 'gold' check (nisab_basis in ('gold'));

-- One row per Pi payment (may cover several campaigns: the cart).
alter table public.dw_donations
  add column if not exists fund text check (fund in ('general', 'zakat')),
  add column if not exists campaign_share numeric(20,7),
  add column if not exists platform_fee numeric(20,7),
  add column if not exists gift jsonb,           -- { "type": "gift"|"memorial", "name": "...", "note": "..." }
  add column if not exists referrer_uid text references public.dw_users(pi_uid),
  add column if not exists is_zakat boolean not null default false;

-- Where each payment goes. campaign_id null = a fund (dw_donations.fund).
create table if not exists public.dw_donation_items (
  id             uuid primary key default gen_random_uuid(),
  donation_id    uuid not null references public.dw_donations(id) on delete cascade,
  campaign_id    uuid references public.dw_campaigns(id),
  fund           text check (fund in ('general', 'zakat')),
  amount         numeric(20,7) not null check (amount > 0),
  campaign_share numeric(20,7) not null, -- 95%
  platform_fee   numeric(20,7) not null, -- 5%
  check ((campaign_id is null) <> (fund is null))
);
create index if not exists dw_items_campaign_idx on public.dw_donation_items(campaign_id);
create index if not exists dw_items_donation_idx on public.dw_donation_items(donation_id);
alter table public.dw_donation_items enable row level security;

-- Campaign progress = 95% share of completed items.
drop view if exists public.dw_campaign_stats;
create view public.dw_campaign_stats with (security_invoker = true) as
select c.id as campaign_id,
       coalesce(sum(i.campaign_share) filter (where d.status = 'completed'), 0) as raised,
       count(distinct d.pi_uid) filter (where d.status = 'completed') as donors,
       coalesce((select sum(u.amount_spent) from public.dw_updates u where u.campaign_id = c.id and u.kind = 'proof_of_spend'), 0) as released
from public.dw_campaigns c
left join public.dw_donation_items i on i.campaign_id = c.id
left join public.dw_donations d on d.id = i.donation_id
group by c.id;
revoke all on public.dw_campaign_stats from anon, authenticated;

-- Organizer flow is gone (admin creates campaigns); keep tables for history but they are unused.
comment on table public.dw_organizers is 'unused since v2 (admin-only campaigns)';
comment on table public.dw_tranches is 'unused since v2 (admin posts proof of spend)';
comment on table public.dw_recurring is 'monthly sadaqa: coming soon (needs Pi subscriptions on Mainnet)';

-- Public bucket for campaign and proof images. Uploads only through the server (signed upload URLs).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sanad', 'sanad', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
