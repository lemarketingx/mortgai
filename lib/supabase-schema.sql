-- MortgAI2 — Supabase leads table
-- Run this once in the Supabase SQL Editor (https://supabase.com → project → SQL Editor)

CREATE TABLE IF NOT EXISTS leads (
  id                  TEXT PRIMARY KEY,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT now(),
  name                TEXT        NOT NULL DEFAULT '',
  phone               TEXT        NOT NULL DEFAULT '',
  city                TEXT        NOT NULL DEFAULT '',
  mortgage_amount     NUMERIC     NOT NULL DEFAULT 0,
  purchase_status     TEXT        NOT NULL DEFAULT '',
  approval_score      NUMERIC     NOT NULL DEFAULT 0,
  main_issue          TEXT        NOT NULL DEFAULT '',
  source              TEXT        NOT NULL DEFAULT 'mortgai2',
  status              TEXT        NOT NULL DEFAULT 'חדש',
  assigned_advisor    TEXT        NOT NULL DEFAULT '',
  advisor_phone       TEXT        NOT NULL DEFAULT '',
  expected_commission TEXT        NOT NULL DEFAULT '',
  actual_commission   TEXT        NOT NULL DEFAULT '',
  commission_status   TEXT        NOT NULL DEFAULT 'pending',
  commission_agreement TEXT       NOT NULL DEFAULT '',
  notes               TEXT        NOT NULL DEFAULT ''
);

-- Index for fast status filtering
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);

-- Index for fast creation-date ordering
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);

-- Enable Row Level Security (RLS) but allow service-role key to bypass it
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- No public access — only the service-role key (used server-side) can read/write
-- (No policy = no public access when RLS is enabled)

ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_advisor_id TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'חדש';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS commission_amount TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS internal_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS advisor_email TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS advisor_last_update_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS advisor_accepted_at TIMESTAMPTZ;

-- UTM attribution (run these in Supabase SQL Editor if leads stopped saving)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS advisors (
  advisor_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  commission_type TEXT NOT NULL DEFAULT '',
  commission_amount TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT ''
);
