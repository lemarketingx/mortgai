-- Lead Store Schema Migration
-- Run in Supabase SQL Editor to enable the advisor lead store.
--
-- Adds:
--   1. Store-related columns to the leads table
--   2. lead_purchases table for recording advisor purchases

-- ── 1. Add store columns to leads ──────────────────────────────────────────

alter table public.leads add column if not exists store_status    text    default 'available';
alter table public.leads add column if not exists store_price     numeric default 0;
alter table public.leads add column if not exists exclusive_price numeric default 0;
alter table public.leads add column if not exists preview_summary text    default '';
alter table public.leads add column if not exists sold_at         timestamptz;
alter table public.leads add column if not exists buyer_advisor_id text   default '';

create index if not exists idx_leads_store_status on public.leads (store_status);

-- ── 2. Create lead_purchases table ─────────────────────────────────────────

create table if not exists public.lead_purchases (
  id             uuid        primary key default gen_random_uuid(),
  lead_id        text        not null,
  advisor_id     text        not null,
  purchase_type  text        not null default 'regular',
  price          numeric     not null default 0,
  is_exclusive   boolean     not null default false,
  purchased_at   timestamptz not null default now()
);

-- Prevent duplicate purchases by the same advisor for the same lead
create unique index if not exists idx_lead_purchases_unique
  on public.lead_purchases (lead_id, advisor_id);

create index if not exists idx_lead_purchases_advisor_id
  on public.lead_purchases (advisor_id);

create index if not exists idx_lead_purchases_purchased_at
  on public.lead_purchases (purchased_at desc);

-- Enable RLS (row-level security) — service role key bypasses this automatically
alter table public.lead_purchases enable row level security;
