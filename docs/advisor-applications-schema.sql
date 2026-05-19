-- Advisor Applications Schema Migration
-- Run in Supabase SQL Editor to enable the FINZO PRO advisor registration flow.
--
-- Adds:
--   1. advisor_applications table — stores join requests before admin approval
--   2. password_hash column on advisors table — for email/password login

-- ── 1. Create advisor_applications table ───────────────────────────────────────

create table if not exists public.advisor_applications (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  full_name        text        not null,
  phone            text        not null,
  email            text        not null default '',
  region           text        not null default '',
  business_name    text        not null default '',
  experience_years text        not null default '',
  advisor_type     text        not null default '',
  notes            text        not null default '',
  status           text        not null default 'pending',
  admin_notes      text        not null default ''
);

create index if not exists idx_advisor_applications_status
  on public.advisor_applications (status);

create index if not exists idx_advisor_applications_created_at
  on public.advisor_applications (created_at desc);

-- Enable RLS — service role key bypasses this automatically
alter table public.advisor_applications enable row level security;

-- ── 2. Add password_hash to advisors table ────────────────────────────────────
-- Stores scrypt-hashed passwords in the format "salt:hash"
-- Set by admin when approving an application; advisor changes it after first login.

alter table public.advisors add column if not exists password_hash text not null default '';
