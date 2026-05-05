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
