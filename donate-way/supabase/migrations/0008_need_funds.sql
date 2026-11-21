-- Verified-need funds: a Pioneer with a documented need (treatment, hospital bill, study fees) opens a request,
-- pays a 1 Pi confirmation fee, an admin reviews the paper proof, and an approved request becomes a campaign
-- (kind = 'need'). Money is paid to the applicant in two stages (70% / 30% after proof). No refunds.

-- Users: wallet verification (account exists on the network's blockchain, or the first payment came from it).
alter table public.dw_users
  add column if not exists wallet_verified_at timestamptz,
  add column if not exists wallet_verified_via text check (wallet_verified_via in ('blockchain', 'payment'));

-- Campaigns: kind 'need' marks a verified-need fund.
alter table public.dw_campaigns
  add column if not exists kind text not null default 'charity' check (kind in ('charity', 'need')),
  add column if not exists need_id uuid;

create table if not exists public.dw_need_requests (
  id                uuid primary key default gen_random_uuid(),
  applicant_uid     text not null references public.dw_users(pi_uid),
  case_type         text not null check (case_type in ('treatment', 'hospital_bill', 'study_fees')),
  amount            numeric(20,7) not null check (amount > 0),
  window_days       int not null check (window_days in (1, 7, 30)),
  description       text not null,
  status            text not null default 'draft'
                    check (status in ('draft','fee_pending','pending_review','needs_more_proof','rejected',
                                      'fundraising','payout_due','stage1_paid','proof_submitted','closed','withdrawn')),
  terms_accepted_at timestamptz,
  fee_payment_id    text unique,
  fee_txid          text,
  fee_paid_at       timestamptz,
  admin_note        text,
  campaign_id       uuid references public.dw_campaigns(id),
  raised_final      numeric(20,7),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  submitted_at      timestamptz,
  approved_at       timestamptz,
  ends_at           timestamptz
);
-- One active request per Pioneer at a time.
create unique index if not exists dw_need_one_active
  on public.dw_need_requests(applicant_uid) where status not in ('rejected', 'withdrawn', 'closed');
create index if not exists dw_need_status_idx on public.dw_need_requests(status, created_at desc);

create table if not exists public.dw_need_documents (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.dw_need_requests(id) on delete cascade,
  kind        text not null check (kind in ('proof', 'extra', 'settlement')),
  path        text not null,
  sha256      text not null,
  mime        text not null,
  size        int not null,
  uploaded_by text not null,
  created_at  timestamptz not null default now()
);
create index if not exists dw_need_documents_request_idx on public.dw_need_documents(request_id);
create index if not exists dw_need_documents_hash_idx on public.dw_need_documents(sha256);

create table if not exists public.dw_need_payouts (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.dw_need_requests(id),
  stage          int not null check (stage in (1, 2)),
  amount         numeric(20,7) not null check (amount > 0),
  status         text not null default 'creating' check (status in ('creating', 'submitted', 'completed')),
  a2u_payment_id text unique,
  txid           text,
  admin_uid      text not null,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz,
  unique (request_id, stage)
);

-- Audit trail: every step (fee paid, documents, decision, payout, proof) with who and when.
create table if not exists public.dw_need_actions (
  id         bigserial primary key,
  request_id uuid not null references public.dw_need_requests(id) on delete cascade,
  actor_uid  text not null,
  action     text not null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists dw_need_actions_request_idx on public.dw_need_actions(request_id, created_at);

alter table public.dw_need_requests  enable row level security;
alter table public.dw_need_documents enable row level security;
alter table public.dw_need_payouts   enable row level security;
alter table public.dw_need_actions   enable row level security;

-- Private bucket for proof documents: never public; the server hands out short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sanad-private', 'sanad-private', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------- Testnet staging copies (dwt_*)
alter table public.dwt_users
  add column if not exists wallet_verified_at timestamptz,
  add column if not exists wallet_verified_via text check (wallet_verified_via in ('blockchain', 'payment'));
alter table public.dwt_campaigns
  add column if not exists kind text not null default 'charity' check (kind in ('charity', 'need')),
  add column if not exists need_id uuid;

create table if not exists public.dwt_need_requests (like public.dw_need_requests including all);
create table if not exists public.dwt_need_documents (like public.dw_need_documents including all);
create table if not exists public.dwt_need_payouts (like public.dw_need_payouts including all);
create table if not exists public.dwt_need_actions (like public.dw_need_actions including all);
alter table public.dwt_need_actions alter column id set default nextval('public.dw_need_actions_id_seq'::regclass);

alter table public.dwt_need_requests add constraint dwt_need_requests_applicant_fkey foreign key (applicant_uid) references public.dwt_users(pi_uid);
alter table public.dwt_need_requests add constraint dwt_need_requests_campaign_fkey foreign key (campaign_id) references public.dwt_campaigns(id);
alter table public.dwt_need_documents add constraint dwt_need_documents_request_fkey foreign key (request_id) references public.dwt_need_requests(id) on delete cascade;
alter table public.dwt_need_payouts add constraint dwt_need_payouts_request_fkey foreign key (request_id) references public.dwt_need_requests(id);
alter table public.dwt_need_actions add constraint dwt_need_actions_request_fkey foreign key (request_id) references public.dwt_need_requests(id) on delete cascade;

alter table public.dwt_need_requests  enable row level security;
alter table public.dwt_need_documents enable row level security;
alter table public.dwt_need_payouts   enable row level security;
alter table public.dwt_need_actions   enable row level security;
