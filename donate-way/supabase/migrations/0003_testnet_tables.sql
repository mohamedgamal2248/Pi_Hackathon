-- Testnet staging ("Sanad Staging" Pi app on sanad-pi-staging.vercel.app): same schema as dw_*, separate data.
-- The server rewrites dw_* to dwt_* for requests on the staging domain (lib/server/db.ts).

create table if not exists public.dwt_users (like public.dw_users including all);
create table if not exists public.dwt_campaigns (like public.dw_campaigns including all);
create table if not exists public.dwt_donations (like public.dw_donations including all);
create table if not exists public.dwt_donation_items (like public.dw_donation_items including all);
create table if not exists public.dwt_updates (like public.dw_updates including all);
create table if not exists public.dwt_follows (like public.dw_follows including all);
create table if not exists public.dwt_ledger (like public.dw_ledger including all);
create table if not exists public.dwt_recurring (like public.dw_recurring including all);

-- Foreign keys (LIKE doesn't copy them; PostgREST needs them for embedded selects).
alter table public.dwt_users add constraint dwt_users_referred_by_fkey foreign key (referred_by) references public.dwt_users(pi_uid);
alter table public.dwt_campaigns add constraint dwt_campaigns_organizer_fkey foreign key (organizer_uid) references public.dwt_users(pi_uid);
alter table public.dwt_donations add constraint dwt_donations_campaign_fkey foreign key (campaign_id) references public.dwt_campaigns(id);
alter table public.dwt_donations add constraint dwt_donations_user_fkey foreign key (pi_uid) references public.dwt_users(pi_uid);
alter table public.dwt_donations add constraint dwt_donations_referrer_fkey foreign key (referrer_uid) references public.dwt_users(pi_uid);
alter table public.dwt_donation_items add constraint dwt_items_donation_fkey foreign key (donation_id) references public.dwt_donations(id) on delete cascade;
alter table public.dwt_donation_items add constraint dwt_items_campaign_fkey foreign key (campaign_id) references public.dwt_campaigns(id);
alter table public.dwt_updates add constraint dwt_updates_campaign_fkey foreign key (campaign_id) references public.dwt_campaigns(id) on delete cascade;
alter table public.dwt_follows add constraint dwt_follows_user_fkey foreign key (pi_uid) references public.dwt_users(pi_uid);
alter table public.dwt_follows add constraint dwt_follows_campaign_fkey foreign key (campaign_id) references public.dwt_campaigns(id) on delete cascade;
alter table public.dwt_ledger add constraint dwt_ledger_user_fkey foreign key (pi_uid) references public.dwt_users(pi_uid);
alter table public.dwt_recurring add constraint dwt_recurring_user_fkey foreign key (pi_uid) references public.dwt_users(pi_uid);
alter table public.dwt_recurring add constraint dwt_recurring_campaign_fkey foreign key (campaign_id) references public.dwt_campaigns(id);

alter table public.dwt_users enable row level security;
alter table public.dwt_campaigns enable row level security;
alter table public.dwt_donations enable row level security;
alter table public.dwt_donation_items enable row level security;
alter table public.dwt_updates enable row level security;
alter table public.dwt_follows enable row level security;
alter table public.dwt_ledger enable row level security;
alter table public.dwt_recurring enable row level security;

create or replace view public.dwt_campaign_stats_v2 with (security_invoker = true) as
select c.id as campaign_id,
       coalesce(sum(i.campaign_share) filter (where d.status = 'completed'), 0) as raised,
       count(distinct d.pi_uid) filter (where d.status = 'completed') as donors,
       coalesce((select sum(u.amount_spent) from public.dwt_updates u where u.campaign_id = c.id and u.kind = 'proof_of_spend'), 0) as released
from public.dwt_campaigns c
left join public.dwt_donation_items i on i.campaign_id = c.id
left join public.dwt_donations d on d.id = i.donation_id
group by c.id;
revoke all on public.dwt_campaign_stats_v2 from anon, authenticated;
