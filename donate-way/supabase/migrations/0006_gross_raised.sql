-- Public totals show what donors actually gave (gross). The 95/5 split stays internal and is described only in the terms.
create or replace view public.dw_campaign_stats_v2 with (security_invoker = true) as
select c.id as campaign_id,
       coalesce(sum(i.amount) filter (where d.status = 'completed'), 0) as raised,
       count(distinct d.pi_uid) filter (where d.status = 'completed') as donors,
       coalesce((select sum(u.amount_spent) from public.dw_updates u where u.campaign_id = c.id and u.kind = 'proof_of_spend'), 0) as released
from public.dw_campaigns c
left join public.dw_donation_items i on i.campaign_id = c.id
left join public.dw_donations d on d.id = i.donation_id
group by c.id;
create or replace view public.dwt_campaign_stats_v2 with (security_invoker = true) as
select c.id as campaign_id,
       coalesce(sum(i.amount) filter (where d.status = 'completed'), 0) as raised,
       count(distinct d.pi_uid) filter (where d.status = 'completed') as donors,
       coalesce((select sum(u.amount_spent) from public.dwt_updates u where u.campaign_id = c.id and u.kind = 'proof_of_spend'), 0) as released
from public.dwt_campaigns c
left join public.dwt_donation_items i on i.campaign_id = c.id
left join public.dwt_donations d on d.id = i.donation_id
group by c.id;
