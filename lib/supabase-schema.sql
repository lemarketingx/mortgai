-- MortgAI — Supabase leads + advisors schema
-- Run this once in the Supabase SQL Editor (safe: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ──────────────────────────────────────────────
-- LEADS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id              TEXT PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT now(),
  name            TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  city            TEXT NOT NULL DEFAULT '',
  mortgage_amount NUMERIC NOT NULL DEFAULT 0,
  purchase_status TEXT NOT NULL DEFAULT '',
  approval_score  NUMERIC NOT NULL DEFAULT 0,
  main_issue      TEXT NOT NULL DEFAULT '',
  source          TEXT NOT NULL DEFAULT 'mortgai2',
  status          TEXT NOT NULL DEFAULT 'חדש',
  -- Advisor assignment
  assigned_advisor    TEXT NOT NULL DEFAULT '',
  advisor_phone       TEXT NOT NULL DEFAULT '',
  advisor_email       TEXT NOT NULL DEFAULT '',
  assigned_advisor_id TEXT NOT NULL DEFAULT '',
  -- CRM workflow
  lead_status        TEXT NOT NULL DEFAULT 'חדש',
  lead_quality       TEXT NOT NULL DEFAULT '',
  lead_priority      TEXT NOT NULL DEFAULT '',
  follow_up_date     TEXT NOT NULL DEFAULT '',
  follow_up_stage    TEXT NOT NULL DEFAULT 'לא טופל',
  last_contacted_at  TEXT NOT NULL DEFAULT '',
  internal_notes     TEXT NOT NULL DEFAULT '',
  notes              TEXT NOT NULL DEFAULT '',
  -- Commission
  expected_commission  TEXT NOT NULL DEFAULT '',
  actual_commission    TEXT NOT NULL DEFAULT '',
  commission_status    TEXT NOT NULL DEFAULT 'pending',
  commission_agreement TEXT NOT NULL DEFAULT '',
  commission_amount    TEXT NOT NULL DEFAULT '',
  -- UTM / attribution
  utm_source   TEXT NOT NULL DEFAULT '',
  utm_medium   TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  utm_content  TEXT NOT NULL DEFAULT '',
  utm_term     TEXT NOT NULL DEFAULT '',
  referrer     TEXT NOT NULL DEFAULT '',
  landing_page TEXT NOT NULL DEFAULT '',
  -- Financial profile
  estimated_approval_result NUMERIC,
  estimated_payment         NUMERIC,
  property_price            NUMERIC,
  equity_amount             NUMERIC,
  monthly_income            NUMERIC,
  debt_level                NUMERIC,
  -- Qualification fields
  employment_status      TEXT NOT NULL DEFAULT '',
  has_existing_mortgage  TEXT NOT NULL DEFAULT '',
  contract_status        TEXT NOT NULL DEFAULT '',
  property_city          TEXT NOT NULL DEFAULT '',
  requested_contact_time TEXT NOT NULL DEFAULT ''
);

-- Safe migration: add any column that may be missing from an older schema
ALTER TABLE leads ADD COLUMN IF NOT EXISTS advisor_email          TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_advisor_id   TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_status           TEXT NOT NULL DEFAULT 'חדש';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_quality          TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_priority         TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date        TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_stage       TEXT NOT NULL DEFAULT 'לא טופל';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at     TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS internal_notes        TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS commission_amount     TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS commission_agreement  TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source            TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium            TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign          TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content           TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term              TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer              TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page          TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_approval_result NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_payment     NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_price        NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS equity_amount         NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_income        NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS debt_level            NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS employment_status     TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_existing_mortgage TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contract_status       TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_city         TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS requested_contact_time TEXT NOT NULL DEFAULT '';

-- Indexes
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx     ON leads (lead_status);
CREATE INDEX IF NOT EXISTS leads_phone_idx      ON leads (phone);
CREATE INDEX IF NOT EXISTS leads_quality_idx    ON leads (lead_quality);

-- Row Level Security (enable; policies are managed via Supabase dashboard or service role key)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────
-- ADVISORS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advisors (
  advisor_id        TEXT PRIMARY KEY,
  name              TEXT NOT NULL DEFAULT '',
  phone             TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  active            BOOLEAN NOT NULL DEFAULT true,
  commission_type   TEXT NOT NULL DEFAULT '',
  commission_amount TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;
