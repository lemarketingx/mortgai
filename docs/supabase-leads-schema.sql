-- Run this full migration in Supabase SQL Editor after every CRM schema change.
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
  assigned_advisor_id text,
  lead_status text,
  lead_quality text,
  lead_priority text,
  follow_up_date text,
  follow_up_stage text,
  last_contacted_at text,
  internal_notes text,
  notes text,
  expected_commission text,
  actual_commission text,
  commission_status text,
  commission_agreement text,
  commission_amount text,
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
  debt_level text,
  employment_status text,
  has_existing_mortgage text,
  contract_status text,
  property_city text,
  requested_contact_time text
);

alter table public.leads add column if not exists id uuid default gen_random_uuid();
alter table public.leads add column if not exists created_at timestamptz not null default now();
alter table public.leads add column if not exists last_updated timestamptz not null default now();
alter table public.leads add column if not exists name text;
alter table public.leads add column if not exists phone text;
alter table public.leads add column if not exists city text;
alter table public.leads add column if not exists mortgage_amount numeric;
alter table public.leads add column if not exists purchase_status text;
alter table public.leads add column if not exists approval_score numeric;
alter table public.leads add column if not exists main_issue text;
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists status text;
alter table public.leads add column if not exists assigned_advisor text;
alter table public.leads add column if not exists advisor_phone text;
alter table public.leads add column if not exists advisor_email text;
alter table public.leads add column if not exists assigned_advisor_id text;
alter table public.leads add column if not exists lead_status text;
alter table public.leads add column if not exists lead_quality text;
alter table public.leads add column if not exists lead_priority text;
alter table public.leads add column if not exists follow_up_date text;
alter table public.leads add column if not exists follow_up_stage text;
alter table public.leads add column if not exists last_contacted_at text;
alter table public.leads add column if not exists internal_notes text;
alter table public.leads add column if not exists notes text;
alter table public.leads add column if not exists expected_commission text;
alter table public.leads add column if not exists actual_commission text;
alter table public.leads add column if not exists commission_status text;
alter table public.leads add column if not exists commission_agreement text;
alter table public.leads add column if not exists commission_amount text;
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
alter table public.leads add column if not exists employment_status text;
alter table public.leads add column if not exists has_existing_mortgage text;
alter table public.leads add column if not exists contract_status text;
alter table public.leads add column if not exists property_city text;
alter table public.leads add column if not exists requested_contact_time text;

create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_leads_phone on public.leads (phone);
create index if not exists idx_leads_status on public.leads (lead_status);
