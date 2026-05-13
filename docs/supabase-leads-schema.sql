-- Recommended production schema for MortgAI leads table.
-- Safe migration: adds columns only if missing.

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_updated timestamptz not null default now(),
  name text not null,
  phone text not null,
  city text,
  mortgage_amount numeric,
  purchase_status text,
  approval_score numeric,
  main_issue text,
  source text,
  status text,
  assigned_advisor text,
  advisor_phone text,
  advisor_email text,
  expected_commission text,
  actual_commission text,
  commission_status text,
  commission_agreement text,
  notes text,
  assigned_advisor_id text,
  lead_status text,
  follow_up_date text,
  last_contacted_at text,
  commission_amount text,
  internal_notes text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  landing_page text,
  estimated_approval_result text,
  estimated_payment numeric,
  property_price numeric,
  equity_amount numeric,
  monthly_income numeric,
  debt_level text
);

alter table public.leads add column if not exists utm_source text;
alter table public.leads add column if not exists utm_medium text;
alter table public.leads add column if not exists utm_campaign text;
alter table public.leads add column if not exists utm_content text;
alter table public.leads add column if not exists utm_term text;
alter table public.leads add column if not exists referrer text;
alter table public.leads add column if not exists landing_page text;
alter table public.leads add column if not exists estimated_approval_result text;
alter table public.leads add column if not exists estimated_payment numeric;
alter table public.leads add column if not exists property_price numeric;
alter table public.leads add column if not exists equity_amount numeric;
alter table public.leads add column if not exists monthly_income numeric;
alter table public.leads add column if not exists debt_level text;

create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_leads_phone on public.leads (phone);
create index if not exists idx_leads_status on public.leads (lead_status);
